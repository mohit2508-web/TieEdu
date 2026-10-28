/**
 * TPO one-click nudges (E1). A college's placement cell sends a short nudge to
 * a segment of its own students — "at risk, CSE, 2027" — from the batch
 * readiness view.
 *
 * The rules (set by the platform owner; see the commit introducing this file):
 *  - Approval. A T&P Officer (placement.nudges.write) drafts; the T&P Head
 *    (placement.nudges.approve) approves or rejects before anything is sent.
 *    A Head's own nudge goes straight out. Every step is audit-logged by the
 *    route (placement_audit).
 *  - Content. One of a few preset messages, plus an optional line of at most
 *    LINE_MAX characters with no links or phone numbers. In-app inbox and
 *    push only — no email.
 *  - Frequency. At most PER_STUDENT_PER_WEEK college nudges reach a student in
 *    any rolling seven days; extra recipients are skipped, and counted.
 *  - Opt-out. A student can turn college nudges off at any time
 *    (`user.college_nudges_off`). The college sees how many have, never who.
 *
 * The audience is resolved twice: once as a preview when drafting, and again
 * at send time from the current roster, so a nudge approved a day later still
 * reaches the students who are in that segment now.
 */
import crypto from 'crypto';
import type { BatchReadiness, Segment } from './batchReadiness';

export const SEGMENTS: Segment[] = ['not_started', 'at_risk', 'in_progress', 'ready'];
export const SEGMENT_LABEL: Record<Segment, string> = { not_started: 'Not started', at_risk: 'At risk', in_progress: 'In progress', ready: 'Ready' };
export const LINE_MAX = 200;
export const PER_STUDENT_PER_WEEK = 2;
export const INBOX_DAYS = 30;
const WEEK_MS = 7 * 86_400_000;

export const PRESETS = ['come_back', 'start_now', 'test_soon', 'keep_going'] as const;
export type Preset = (typeof PRESETS)[number];
export const PRESET_COPY: Record<Preset, { label: string; text: string; needsCompany: boolean; href: string }> = {
  come_back: { label: 'Come back to practice', needsCompany: false, href: '/daily', text: 'We noticed you have not practised for a while. Ten minutes today keeps you on track.' },
  start_now: { label: 'Start preparing', needsCompany: false, href: '/skill-test', text: 'Placement season is close. Start with one skill test today to see where you stand.' },
  test_soon: { label: 'Company test coming up', needsCompany: true, href: '/company/{slug}', text: '{company}’s test is coming up. Take its round tests this week.' },
  keep_going: { label: 'Keep it up', needsCompany: false, href: '/', text: 'Good progress. Keep practising — you are close to ready.' },
};

export type NudgeStatus = 'pending' | 'sent' | 'rejected' | 'withdrawn';
export interface Audience { segments: Segment[]; branch: string | null; batch: string | null }
export interface CollegeNudge {
  id: string;
  college_id: string;
  /** As it was when drafted, so the sender name a student saw never changes. */
  college_name: string;
  audience: Audience;
  preset: Preset;
  company_id: string | null;
  line: string;
  status: NudgeStatus;
  drafted_by: string;
  drafted_at: string;
  preview_count: number;
  decided_by: string | null;
  decided_at: string | null;
  reject_reason: string | null;
  sent: { delivered: number; opted_out: number; capped: number } | null;
}
export interface NudgeDelivery { nudge_id: string; college_id: string; user_id: string; at: string; seen: boolean }

export class NudgeError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function nudgesOf(db: any): CollegeNudge[] {
  if (!Array.isArray(db.college_nudges)) db.college_nudges = [];
  return db.college_nudges;
}
export function deliveriesOf(db: any): NudgeDelivery[] {
  if (!Array.isArray(db.college_nudge_deliveries)) db.college_nudge_deliveries = [];
  return db.college_nudge_deliveries;
}

const usersById = (db: any) => new Map<string, any>((db.users || []).map((u: any) => [u.id, u]));

/** Students in the batch who match the audience. */
export function audienceOf(batch: BatchReadiness, a: Audience): string[] {
  return batch.students
    .filter((s) => a.segments.includes(s.segment) && (!a.branch || s.branch === a.branch) && (!a.batch || s.batch === a.batch))
    .map((s) => s.user_id);
}

function parseAudience(raw: any): Audience {
  const segments = Array.from(new Set(((raw?.segments as unknown[]) || []).map(String))).filter((s): s is Segment => (SEGMENTS as string[]).includes(s));
  if (!segments.length) throw new NudgeError(400, 'Choose at least one group of students.');
  const opt = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 60) : null);
  return { segments, branch: opt(raw?.branch), batch: opt(raw?.batch) };
}

/** Render what a student reads. */
export function nudgeText(db: any, n: CollegeNudge): { text: string; href: string } {
  const p = PRESET_COPY[n.preset];
  const c = n.company_id ? (db.companies || []).find((x: any) => x.id === n.company_id) : null;
  const body = p.text.replace('{company}', c?.name || 'Your company');
  return {
    text: `${n.college_name} placement cell: ${body}${n.line ? ` ${n.line}` : ''}`,
    href: p.href.replace('{slug}', encodeURIComponent(c?.slug || '')),
  };
}

export interface Actor { userId: string; collegeId: string; collegeName: string; canApprove: boolean }

/** Draft a nudge; a Head's draft is sent at once (see `sendNow`). */
export function draftNudge(db: any, actor: Actor, input: any, batch: BatchReadiness, now = new Date()): CollegeNudge {
  const preset = String(input?.preset || '') as Preset;
  if (!(PRESETS as readonly string[]).includes(preset)) throw new NudgeError(400, 'Choose a message.');
  let company_id: string | null = null;
  if (PRESET_COPY[preset].needsCompany) {
    const c = (db.companies || []).find((x: any) => x.slug === String(input?.company_slug || '') && x.status === 'published');
    if (!c) throw new NudgeError(400, 'Choose the company whose test is coming up.');
    company_id = c.id;
  }
  const line = String(input?.line || '').replace(/\s+/g, ' ').trim();
  if (line.length > LINE_MAX) throw new NudgeError(400, `Keep the extra line to ${LINE_MAX} characters.`);
  if (/(https?:\/\/|www\.|\b\d{10}\b|\+91|@)/i.test(line)) throw new NudgeError(400, 'Leave out links, phone numbers and email addresses.');
  const audience = parseAudience(input?.audience);
  const preview = audienceOf(batch, audience);
  if (!preview.length) throw new NudgeError(400, 'No students match that group right now.');
  const n: CollegeNudge = {
    id: `cn-${crypto.randomBytes(6).toString('hex')}`,
    college_id: actor.collegeId,
    college_name: actor.collegeName || 'Your college',
    audience,
    preset,
    company_id,
    line,
    status: 'pending',
    drafted_by: actor.userId,
    drafted_at: now.toISOString(),
    preview_count: preview.length,
    decided_by: null,
    decided_at: null,
    reject_reason: null,
    sent: null,
  };
  nudgesOf(db).push(n);
  return n;
}

const findPending = (db: any, collegeId: string, id: string) => {
  const n = nudgesOf(db).find((x) => x.id === id && x.college_id === collegeId);
  if (!n) throw new NudgeError(404, 'That nudge was not found.');
  if (n.status !== 'pending') throw new NudgeError(409, 'That nudge has already been decided.');
  return n;
};

export interface SendResult { nudge: CollegeNudge; pushes: Array<{ userId: string; title: string; body: string; url: string }> }

/**
 * Deliver a pending nudge to its audience as it is now, skipping students who
 * opted out or already had PER_STUDENT_PER_WEEK college nudges this week.
 */
export function sendNow(db: any, actor: Actor, id: string, batch: BatchReadiness, now = new Date()): SendResult {
  if (!actor.canApprove) throw new NudgeError(403, 'Only the T&P Head can send a nudge.');
  const n = findPending(db, actor.collegeId, id);
  const users = usersById(db);
  const since = now.getTime() - WEEK_MS;
  const recent = new Map<string, number>();
  for (const d of deliveriesOf(db)) if (Date.parse(d.at) > since) recent.set(d.user_id, (recent.get(d.user_id) || 0) + 1);

  let opted_out = 0;
  let capped = 0;
  const to: string[] = [];
  for (const uid of audienceOf(batch, n.audience)) {
    if (users.get(uid)?.college_nudges_off === true) { opted_out++; continue; }
    if ((recent.get(uid) || 0) >= PER_STUDENT_PER_WEEK) { capped++; continue; }
    to.push(uid);
  }
  for (const uid of to) deliveriesOf(db).push({ nudge_id: n.id, college_id: n.college_id, user_id: uid, at: now.toISOString(), seen: false });
  n.status = 'sent';
  n.decided_by = actor.userId;
  n.decided_at = now.toISOString();
  n.sent = { delivered: to.length, opted_out, capped };
  // Inbox rows age out; the nudge record itself stays as the college's history.
  const cutoff = now.getTime() - INBOX_DAYS * 86_400_000;
  db.college_nudge_deliveries = deliveriesOf(db).filter((d) => Date.parse(d.at) > cutoff);

  const { text, href } = nudgeText(db, n);
  const title = `${n.college_name} placement cell`;
  return { nudge: n, pushes: to.map((userId) => ({ userId, title, body: text.slice(title.length + 2), url: href })) };
}

export function rejectNudge(db: any, actor: Actor, id: string, reason: unknown, now = new Date()): CollegeNudge {
  if (!actor.canApprove) throw new NudgeError(403, 'Only the T&P Head can reject a nudge.');
  const n = findPending(db, actor.collegeId, id);
  n.status = 'rejected';
  n.decided_by = actor.userId;
  n.decided_at = now.toISOString();
  n.reject_reason = String(reason || '').trim().slice(0, 200) || null;
  return n;
}

export function withdrawNudge(db: any, actor: Actor, id: string, now = new Date()): CollegeNudge {
  const n = findPending(db, actor.collegeId, id);
  if (n.drafted_by !== actor.userId) throw new NudgeError(403, 'Only the person who drafted a nudge can withdraw it.');
  n.status = 'withdrawn';
  n.decided_at = now.toISOString();
  return n;
}

/** The college's nudges, newest first, and the opted-out count (a number, never names). */
export function collegeNudgeList(db: any, collegeId: string, viewerId: string, batch: BatchReadiness) {
  const users = usersById(db);
  const staff = (id: string | null) => (id ? String(users.get(id)?.name || 'A staff member') : null);
  return {
    presets: PRESETS.map((p) => ({ id: p, label: PRESET_COPY[p].label, text: PRESET_COPY[p].text, needs_company: PRESET_COPY[p].needsCompany })),
    segments: SEGMENTS.map((s) => ({ id: s, label: SEGMENT_LABEL[s], students: batch.segments[s] })),
    branches: Array.from(new Set(batch.students.map((s) => s.branch).filter(Boolean))).sort(),
    batches: Array.from(new Set(batch.students.map((s) => s.batch).filter(Boolean))).sort(),
    opted_out: batch.students.filter((s) => users.get(s.user_id)?.college_nudges_off === true).length,
    limits: { line_max: LINE_MAX, per_student_per_week: PER_STUDENT_PER_WEEK },
    nudges: nudgesOf(db)
      .filter((n) => n.college_id === collegeId)
      .sort((a, b) => b.drafted_at.localeCompare(a.drafted_at))
      .slice(0, 50)
      .map((n) => ({
        id: n.id,
        status: n.status,
        preview: nudgeText(db, n).text,
        audience: { ...n.audience, labels: n.audience.segments.map((s) => SEGMENT_LABEL[s]) },
        preview_count: n.preview_count,
        drafted_by: staff(n.drafted_by),
        drafted_by_me: n.drafted_by === viewerId,
        drafted_at: n.drafted_at,
        decided_by: staff(n.decided_by),
        decided_at: n.decided_at,
        reject_reason: n.reject_reason,
        sent: n.sent,
      })),
  };
}

// --- the student's side --------------------------------------------------------------------

export function studentInbox(db: any, userId: string, now = new Date()) {
  const cutoff = now.getTime() - INBOX_DAYS * 86_400_000;
  const byId = new Map(nudgesOf(db).map((n) => [n.id, n]));
  const items = deliveriesOf(db)
    .filter((d) => d.user_id === userId && Date.parse(d.at) > cutoff)
    .sort((a, b) => b.at.localeCompare(a.at))
    .map((d) => {
      const n = byId.get(d.nudge_id);
      if (!n) return null;
      const { text, href } = nudgeText(db, n);
      return { id: d.nudge_id, text, href, at: d.at, seen: d.seen };
    })
    .filter(Boolean) as Array<{ id: string; text: string; href: string; at: string; seen: boolean }>;
  const user = (db.users || []).find((u: any) => u.id === userId);
  return { off: user?.college_nudges_off === true, items, unread: items.filter((i) => !i.seen).length };
}

export function markStudentSeen(db: any, userId: string): number {
  let n = 0;
  for (const d of deliveriesOf(db)) if (d.user_id === userId && !d.seen) { d.seen = true; n++; }
  return n;
}

export function setStudentOptOut(db: any, userId: string, off: boolean): boolean {
  const user = (db.users || []).find((u: any) => u.id === userId);
  if (!user) throw new NudgeError(404, 'Account not found.');
  user.college_nudges_off = off;
  return off;
}
