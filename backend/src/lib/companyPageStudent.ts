// ============================================================================
// Company Page — the student side.
//
//   - Prep profile: test date, target role, daily streak, onboarding ticks —
//     one row per (user, company), so a student's plan follows them across
//     devices instead of living in one browser's localStorage.
//   - Track: per-round readiness computed from the student's real skill-test
//     attempts, never from anything the client sends.
//   - Drive Radar: student-reported drive updates, crowd confirmations,
//     moderation, and push alerts to students watching the company.
//   - Experience reward: a published interview report unlocks the pack, when
//     the company page opts in.
//   - Page analytics: buffered event counters.
//
// All of it is keyed to a company page that is LIVE (published + switched on);
// nothing here acts on drafts.
// ============================================================================

import crypto from 'crypto';
import { loadDb, saveDb } from '../data/db';
import { pushAudit } from './audit';
import { sendPushToUsers } from './push';
import { PageContent, livePage } from './companyPage';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Calendar date in India — the day boundary students live by. */
export function istDate(now = new Date()): string {
  return new Date(now.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);
}

function dayDiff(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

function sectionOf(content: PageContent | null, type: string) {
  return content?.sections.find((s) => s.type === type && s.visible) || null;
}

// ---------------------------------------------------------------------------
// Prep profile
// ---------------------------------------------------------------------------

export interface PrepProfile {
  user_id: string;
  company_id: string;
  test_date: string;
  /** 1-based index into the page's role list; null = page default. */
  target_role: number | null;
  daily_last: string;
  daily_streak: number;
  onboarding_done: string[];
  updated_at: string;
}

export function profilesOf(db: any): PrepProfile[] {
  if (!Array.isArray(db.company_prep_profiles)) db.company_prep_profiles = [];
  return db.company_prep_profiles;
}

export function findProfile(db: any, userId: string, companyId: string): PrepProfile | null {
  return profilesOf(db).find((p) => p.user_id === userId && p.company_id === companyId) || null;
}

function ensureProfile(db: any, userId: string, companyId: string): PrepProfile {
  let p = findProfile(db, userId, companyId);
  if (!p) {
    p = {
      user_id: userId,
      company_id: companyId,
      test_date: '',
      target_role: null,
      daily_last: '',
      daily_streak: 0,
      onboarding_done: [],
      updated_at: new Date().toISOString(),
    };
    profilesOf(db).push(p);
  }
  return p;
}

/** A streak only counts while it is unbroken: last practice today or yesterday. */
export function liveStreak(p: PrepProfile | null, today: string): number {
  if (!p || !p.daily_last) return 0;
  return dayDiff(p.daily_last, today) <= 1 ? p.daily_streak : 0;
}

/**
 * Applies a client patch. Every field is validated; the streak is not
 * client-writable at all (see `recordDaily`).
 */
export function updateProfile(
  db: any,
  userId: string,
  companyId: string,
  patch: any,
  page: PageContent | null
): PrepProfile {
  const p = ensureProfile(db, userId, companyId);
  if (patch && typeof patch === 'object') {
    if ('test_date' in patch) {
      p.test_date = typeof patch.test_date === 'string' && DATE_RE.test(patch.test_date) ? patch.test_date : '';
    }
    if ('target_role' in patch) {
      const roles = ((sectionOf(page, 'role_compare')?.data.roles as any[]) || []).length;
      const n = Math.round(Number(patch.target_role));
      p.target_role = Number.isFinite(n) && n >= 1 && n <= Math.max(roles, 1) ? n : null;
    }
    if ('onboarding_done' in patch) {
      const valid = new Set(((sectionOf(page, 'onboarding')?.data.steps as any[]) || []).map((s) => s.id));
      p.onboarding_done = Array.from(
        new Set((Array.isArray(patch.onboarding_done) ? patch.onboarding_done : []).filter((id: unknown) => typeof id === 'string' && valid.has(id)))
      ) as string[];
    }
  }
  p.updated_at = new Date().toISOString();
  return p;
}

/**
 * One daily practice per IST day. The server owns the date, so a streak cannot
 * be extended by changing the phone's clock.
 */
export function recordDaily(db: any, userId: string, companyId: string, now = new Date()): PrepProfile {
  const p = ensureProfile(db, userId, companyId);
  const today = istDate(now);
  if (p.daily_last !== today) {
    p.daily_streak = p.daily_last && dayDiff(p.daily_last, today) === 1 ? p.daily_streak + 1 : 1;
    p.daily_last = today;
  }
  p.updated_at = now.toISOString();
  return p;
}

export function profileView(p: PrepProfile | null, now = new Date()) {
  const today = istDate(now);
  return {
    test_date: p?.test_date || '',
    target_role: p?.target_role ?? null,
    daily_streak: liveStreak(p, today),
    practiced_today: !!p && p.daily_last === today,
    onboarding_done: p?.onboarding_done || [],
    today,
  };
}

// ---------------------------------------------------------------------------
// Track — readiness from real skill-test attempts
// ---------------------------------------------------------------------------

export interface StationTrack {
  station_id: string;
  score: number | null;
  attempts: number;
  weak_topics: { name: string; percentage: number }[];
}

export interface TrackView {
  stations: StationTrack[];
  overall: number | null;
  weakest_station_id: string | null;
  attempted: boolean;
}

export function computeTrack(db: any, userId: string, page: PageContent | null): TrackView {
  const rounds = sectionOf(page, 'rounds_route');
  const stations: any[] = (rounds?.data.stations as any[]) || [];
  const skillIdBySlug = new Map<string, string>();
  for (const s of db.skills || []) if (s && s.slug && s.id) skillIdBySlug.set(s.slug, s.id);

  // Best finished attempt per skill.
  const best = new Map<string, any>();
  let total = 0;
  for (const a of db.attempts || []) {
    if (!a || a.userId !== userId) continue;
    if (a.status !== 'submitted' && a.status !== 'timed_out') continue;
    total++;
    const cur = best.get(a.skillId);
    if (!cur || (Number(a.percentage) || 0) > (Number(cur.percentage) || 0)) best.set(a.skillId, a);
  }

  const out: StationTrack[] = stations.map((st) => {
    const linked = ((st.skill_slugs as string[]) || [])
      .map((slug) => best.get(skillIdBySlug.get(slug) || ''))
      .filter(Boolean);
    if (linked.length === 0) return { station_id: st.id, score: null, attempts: 0, weak_topics: [] };

    const score = Math.round(linked.reduce((s, a) => s + (Number(a.percentage) || 0), 0) / linked.length);
    const topics = new Map<string, { correct: number; total: number }>();
    for (const a of linked) {
      for (const tp of a.topicPerformance || []) {
        const name = String(tp.topicName || '').trim();
        if (!name || !(Number(tp.total) > 0)) continue;
        const t = topics.get(name) || { correct: 0, total: 0 };
        t.correct += Number(tp.correct) || 0;
        t.total += Number(tp.total) || 0;
        topics.set(name, t);
      }
    }
    const weak = Array.from(topics.entries())
      .map(([name, t]) => ({ name, percentage: Math.round((t.correct / t.total) * 100) }))
      .filter((t) => t.percentage < 100)
      .sort((a, b) => a.percentage - b.percentage)
      .slice(0, 3);
    return { station_id: st.id, score, attempts: linked.length, weak_topics: weak };
  });

  const scored = out.filter((s) => s.score !== null);
  const overall = scored.length ? Math.round(scored.reduce((s, x) => s + (x.score as number), 0) / scored.length) : null;
  const weakest = scored.length ? scored.reduce((a, b) => ((b.score as number) < (a.score as number) ? b : a)) : null;
  return { stations: out, overall, weakest_station_id: weakest?.station_id || null, attempted: total > 0 };
}

// ---------------------------------------------------------------------------
// Drive Radar — student reports
// ---------------------------------------------------------------------------

export const RADAR_KINDS = ['applications', 'invites', 'results', 'onboarding', 'other'] as const;
export type RadarKind = (typeof RADAR_KINDS)[number];

export interface RadarReport {
  id: string;
  company_id: string;
  user_id: string;
  user_name: string;
  kind: RadarKind;
  text: string;
  status: 'pending' | 'approved' | 'rejected';
  confirmed_by: string[];
  created_at: string;
  moderated_by: string | null;
  moderated_at: string | null;
  /** Watchers have been pushed this update. Set once; never re-sent. */
  notified: boolean;
}

export const RADAR_TEXT_MIN = 10;
export const RADAR_TEXT_MAX = 160;
const MAX_PENDING_PER_USER = 3;

export function radarOf(db: any): RadarReport[] {
  if (!Array.isArray(db.company_radar_reports)) db.company_radar_reports = [];
  return db.company_radar_reports;
}

function radarSettings(page: PageContent | null) {
  const d: any = sectionOf(page, 'drive_radar')?.data || {};
  return {
    present: !!sectionOf(page, 'drive_radar'),
    allowReports: d.allow_reports === true,
    minConfirmations: Number.isInteger(d.min_confirmations) ? d.min_confirmations : 0,
  };
}

/** What the public page shows: approved reports, plus pending ones in crowd mode. */
export function publicRadar(db: any, companyId: string, page: PageContent | null, viewerId: string | null) {
  const { minConfirmations } = radarSettings(page);
  return radarOf(db)
    .filter((r) => r.company_id === companyId && (r.status === 'approved' || (r.status === 'pending' && minConfirmations > 0)))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 30)
    .map((r) => ({
      id: r.id,
      kind: r.kind,
      text: r.text,
      date: istDate(new Date(r.created_at)),
      confirmed: r.confirmed_by.length,
      pending: r.status === 'pending',
      mine: !!viewerId && r.user_id === viewerId,
      confirmed_by_me: !!viewerId && r.confirmed_by.includes(viewerId),
    }));
}

export class RadarError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function createRadarReport(
  db: any,
  user: { id: string; name: string },
  companyId: string,
  page: PageContent | null,
  body: any
): RadarReport {
  const { present, allowReports } = radarSettings(page);
  if (!present || !allowReports) throw new RadarError('Reports are not open for this company.', 403);

  const kind = RADAR_KINDS.includes(body?.kind) ? (body.kind as RadarKind) : 'other';
  const text = String(body?.text ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length < RADAR_TEXT_MIN) throw new RadarError(`Describe the update in at least ${RADAR_TEXT_MIN} characters.`);
  if (text.length > RADAR_TEXT_MAX) throw new RadarError(`Keep it under ${RADAR_TEXT_MAX} characters.`);

  const mine = radarOf(db).filter((r) => r.company_id === companyId && r.user_id === user.id);
  if (mine.filter((r) => r.status === 'pending').length >= MAX_PENDING_PER_USER) {
    throw new RadarError('You already have updates waiting to be confirmed. Try again once they are reviewed.', 429);
  }
  if (mine.some((r) => r.text.toLowerCase() === text.toLowerCase())) {
    throw new RadarError('You have already reported this update.', 409);
  }

  const report: RadarReport = {
    id: `rad-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    company_id: companyId,
    user_id: user.id,
    user_name: user.name,
    kind,
    text,
    status: 'pending',
    confirmed_by: [],
    created_at: new Date().toISOString(),
    moderated_by: null,
    moderated_at: null,
    notified: false,
  };
  radarOf(db).push(report);
  return report;
}

/**
 * Adds the viewer's confirmation. One per student, never your own report.
 * Returns the report and whether this confirmation tipped it into approved.
 */
export function confirmRadarReport(db: any, reportId: string, userId: string, page: PageContent | null) {
  const report = radarOf(db).find((r) => r.id === reportId);
  if (!report) throw new RadarError('Update not found.', 404);
  if (report.status === 'rejected') throw new RadarError('This update was removed.', 410);
  if (report.user_id === userId) throw new RadarError('You can’t confirm your own update.', 403);

  const { minConfirmations } = radarSettings(page);
  if (report.status === 'pending' && minConfirmations === 0) throw new RadarError('Update not found.', 404);

  if (!report.confirmed_by.includes(userId)) report.confirmed_by.push(userId);
  let becameApproved = false;
  if (report.status === 'pending' && minConfirmations > 0 && report.confirmed_by.length >= minConfirmations) {
    report.status = 'approved';
    report.moderated_by = 'crowd';
    report.moderated_at = new Date().toISOString();
    becameApproved = true;
  }
  return { report, becameApproved };
}

export function moderateRadarReport(db: any, reportId: string, companyId: string, status: unknown, actor: string) {
  const report = radarOf(db).find((r) => r.id === reportId && r.company_id === companyId);
  if (!report) throw new RadarError('Update not found.', 404);
  if (status !== 'approved' && status !== 'rejected' && status !== 'pending') throw new RadarError('Invalid status.');
  const becameApproved = report.status !== 'approved' && status === 'approved';
  report.status = status;
  report.moderated_by = actor;
  report.moderated_at = new Date().toISOString();
  return { report, becameApproved };
}

// ---------------------------------------------------------------------------
// Watchers + push
// ---------------------------------------------------------------------------

export interface CompanyWatcher {
  user_id: string;
  company_id: string;
  created_at: string;
}

export function watchersOf(db: any): CompanyWatcher[] {
  if (!Array.isArray(db.company_watchers)) db.company_watchers = [];
  return db.company_watchers;
}

export function isWatching(db: any, userId: string, companyId: string): boolean {
  return watchersOf(db).some((w) => w.user_id === userId && w.company_id === companyId);
}

export function setWatching(db: any, userId: string, companyId: string, on: boolean): void {
  const list = watchersOf(db);
  const i = list.findIndex((w) => w.user_id === userId && w.company_id === companyId);
  if (on && i === -1) list.push({ user_id: userId, company_id: companyId, created_at: new Date().toISOString() });
  if (!on && i !== -1) list.splice(i, 1);
}

/**
 * Pushes a drive update to everyone watching the company. Never throws: the
 * update is already committed and a push outage must not fail the request.
 */
export async function notifyWatchers(
  db: any,
  company: { id: string; name: string; slug: string },
  text: string,
  excludeUserId?: string
): Promise<number> {
  const ids = watchersOf(db)
    .filter((w) => w.company_id === company.id && w.user_id !== excludeUserId)
    .map((w) => w.user_id);
  if (ids.length === 0) return 0;
  try {
    const r = await sendPushToUsers(ids, {
      title: `${company.name} drive update`,
      body: text,
      url: `/company/${company.slug}#drive-radar`,
    });
    return r.sent;
  } catch (e: any) {
    console.warn('[CompanyPage] watcher push failed:', e?.message);
    return 0;
  }
}

/** Admin-entered radar rows in `next` that were not in `prev` — for publish-time alerts. */
export function newAdminRadarUpdates(prev: PageContent | null, next: PageContent): string[] {
  const rows = (c: PageContent | null) => ((sectionOf(c, 'drive_radar')?.data.updates as any[]) || []);
  const before = new Set(rows(prev).map((r) => r.id));
  return rows(next).filter((r) => r.id && !before.has(r.id) && r.text).map((r) => String(r.text));
}

// ---------------------------------------------------------------------------
// Experience reward
// ---------------------------------------------------------------------------

/**
 * When a report is published for a company whose live page opts in, the
 * author gets the company pack. One unlock per (user, company), whatever the
 * number of reports, and it is audited like any other grant.
 */
export function grantExperienceReward(db: any, report: any, actor: string): boolean {
  if (!report || !report.user_id || !report.company_id) return false;
  const page = livePage(db, report.company_id);
  if (!page || page.settings?.experience_reward !== true) return false;
  if (!(db.users || []).some((u: any) => u.id === report.user_id)) return false;

  if (!Array.isArray(db.unlocks)) db.unlocks = [];
  const already = db.unlocks.some(
    (u: any) => u.user_id === report.user_id && u.company_id === report.company_id && u.status === 'active'
  );
  if (already) return false;

  db.unlocks.push({
    id: `unlock-${Date.now()}-${report.company_id}`,
    user_id: report.user_id,
    company_id: report.company_id,
    category: 'experience_reward',
    status: 'active',
    source_report_id: report.id,
    unlocked_at: new Date().toISOString(),
  });
  pushAudit(db, {
    action: 'company_page.experience_reward',
    actor,
    detail: `Pack unlocked for the author of report ${report.id}`,
    target: report.company_id,
    meta: { user_id: report.user_id, report_id: report.id },
  });
  return true;
}

// ---------------------------------------------------------------------------
// Page analytics — buffered counters
//
// A page view must not cost a full rewrite of the JSON ledger, so events are
// counted in memory and folded into the store at most once a minute.
// ---------------------------------------------------------------------------

export const PAGE_EVENTS = [
  'view',
  'readiness_start',
  'round_select',
  'test_start',
  'test_date_set',
  'daily_start',
  'pack_cta',
  'preview_open',
  'radar_report',
  'notify_on',
  'faq_open',
  'share_experience',
] as const;
export type PageEvent = (typeof PAGE_EVENTS)[number];

const STATS_RETENTION_DAYS = 120;
const pending = new Map<string, number>();
let flushTimer: NodeJS.Timeout | null = null;

export function recordPageEvent(companyId: string, event: string, now = new Date()): boolean {
  if (!(PAGE_EVENTS as readonly string[]).includes(event)) return false;
  const key = `${companyId}|${event}|${istDate(now)}`;
  pending.set(key, (pending.get(key) || 0) + 1);
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      try {
        flushPageEvents();
      } catch (e: any) {
        console.warn('[CompanyPage] stats flush failed:', e?.message);
      }
    }, 60_000);
    flushTimer.unref?.();
  }
  return true;
}

/** Folds buffered counters into `db.company_page_stats`. Exported for tests and shutdown. */
export function flushPageEvents(db?: any): void {
  if (pending.size === 0) return;
  const target = db || loadDb();
  mergePending(target);
  if (!db) saveDb(target);
}

function mergePending(db: any): void {
  if (!db.company_page_stats || typeof db.company_page_stats !== 'object') db.company_page_stats = {};
  const stats = db.company_page_stats;
  for (const [key, n] of pending) {
    const [companyId, event, day] = key.split('|');
    stats[companyId] = stats[companyId] || {};
    stats[companyId][day] = stats[companyId][day] || {};
    stats[companyId][day][event] = (stats[companyId][day][event] || 0) + n;
  }
  pending.clear();
  const cutoff = istDate(new Date(Date.now() - STATS_RETENTION_DAYS * 86_400_000));
  for (const companyId of Object.keys(stats)) {
    for (const day of Object.keys(stats[companyId])) if (day < cutoff) delete stats[companyId][day];
  }
}

export function pageStats(db: any, companyId: string, days = 30, now = new Date()) {
  // Include not-yet-flushed counts so the studio never looks behind.
  const merged: Record<string, Record<string, number>> = JSON.parse(JSON.stringify(db.company_page_stats?.[companyId] || {}));
  for (const [key, n] of pending) {
    const [cid, event, day] = key.split('|');
    if (cid !== companyId) continue;
    merged[day] = merged[day] || {};
    merged[day][event] = (merged[day][event] || 0) + n;
  }
  const from = istDate(new Date(now.getTime() - (days - 1) * 86_400_000));
  const totals: Record<string, number> = {};
  const series: { day: string; views: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = istDate(new Date(now.getTime() - i * 86_400_000));
    series.push({ day, views: merged[day]?.view || 0 });
  }
  for (const [day, events] of Object.entries(merged)) {
    if (day < from) continue;
    for (const [e, n] of Object.entries(events)) totals[e] = (totals[e] || 0) + n;
  }
  return { days, totals, series };
}

// ---------------------------------------------------------------------------
// Streak reminders — one evening push to students about to lose a streak
// ---------------------------------------------------------------------------

/** IST hours in which the evening reminder may go out (19:00–21:59). */
const REMIND_FROM_HOUR = 19;
const REMIND_UNTIL_HOUR = 22;

function istHour(now: Date): number {
  return new Date(now.getTime() + 5.5 * 3_600_000).getUTCHours();
}

export interface StreakReminder {
  user_id: string;
  company: { id: string; name: string; slug: string };
  streak: number;
}

/**
 * Picks who to remind and marks them reminded, in one synchronous pass, so a
 * second scheduler tick (or a second process reading the same store after the
 * save) cannot send the same reminder twice. Only students who practised
 * YESTERDAY are eligible: today's practice means nothing is at risk, and an
 * older last-practice means the streak is already gone.
 */
export function planStreakReminders(db: any, now = new Date()): StreakReminder[] {
  const hour = istHour(now);
  if (hour < REMIND_FROM_HOUR || hour >= REMIND_UNTIL_HOUR) return [];
  const today = istDate(now);
  const yesterday = istDate(new Date(now.getTime() - 86_400_000));
  const out: StreakReminder[] = [];

  for (const company of db.companies || []) {
    const page = livePage(db, company.id);
    if (!page || page.settings?.streak_reminders !== true) continue;
    for (const p of profilesOf(db)) {
      if (p.company_id !== company.id) continue;
      if (p.daily_last !== yesterday || !(p.daily_streak > 0)) continue;
      if ((p as any).reminded_on === today) continue;
      (p as any).reminded_on = today;
      out.push({ user_id: p.user_id, company: { id: company.id, name: company.name, slug: company.slug }, streak: p.daily_streak });
    }
  }
  return out;
}

let reminderStarted = false;

/** Half-hourly check; idempotent, never holds the process open. */
export function startStreakReminderScheduler(): void {
  if (reminderStarted) return;
  reminderStarted = true;
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const db = loadDb();
      const due = planStreakReminders(db);
      if (due.length === 0) return;
      saveDb(db);
      let sent = 0;
      for (const r of due) {
        try {
          const res = await sendPushToUsers([r.user_id], {
            title: `Keep your ${r.streak}-day streak`,
            body: `A few minutes of ${r.company.name} practice today keeps it going.`,
            url: `/company/${r.company.slug}#prep-plan`,
          });
          sent += res.sent;
        } catch {
          /* one failed push must not stop the rest */
        }
      }
      console.log(`[CompanyPage] streak reminders: ${due.length} due, ${sent} pushes sent`);
    } catch (e: any) {
      console.warn('[CompanyPage] streak reminder pass failed:', e?.message);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(tick, 30 * 60_000);
  (timer as any).unref?.();
  const warmup = setTimeout(tick, 2 * 60_000);
  (warmup as any).unref?.();
}

// ---------------------------------------------------------------------------
// Drive status suggestion — what recent approved Radar updates imply
// ---------------------------------------------------------------------------

const SUGGEST_WINDOW_DAYS = 21;

/**
 * A hint for the admin, never applied automatically: an approved
 * applications/invites update in the last three weeks suggests the drive is
 * open; if the newest one is results/onboarding, applications have likely
 * closed. Admin-entered updates on the live page count as well as student ones.
 */
export function driveStatusSuggestion(db: any, companyId: string, now = new Date()) {
  const cutoff = istDate(new Date(now.getTime() - SUGGEST_WINDOW_DAYS * 86_400_000));
  const events: { kind: string; date: string; text: string }[] = [];
  for (const r of radarOf(db)) {
    if (r.company_id === companyId && r.status === 'approved') events.push({ kind: r.kind, date: istDate(new Date(r.created_at)), text: r.text });
  }
  const page = livePage(db, companyId);
  for (const u of ((sectionOf(page, 'drive_radar')?.data.updates as any[]) || [])) {
    if (u.date) events.push({ kind: u.kind, date: u.date, text: u.text });
  }
  const recent = events.filter((e) => e.date >= cutoff).sort((a, b) => b.date.localeCompare(a.date));
  if (recent.length === 0) return { status: null as null | 'Open' | 'Closed', basis: null as null | { kind: string; date: string; text: string }, count: 0 };
  const newest = recent[0];
  const status = newest.kind === 'applications' || newest.kind === 'invites' ? 'Open' : newest.kind === 'results' || newest.kind === 'onboarding' ? 'Closed' : null;
  return { status: status as null | 'Open' | 'Closed', basis: newest, count: recent.length };
}
