/**
 * Weekly parent updates on WhatsApp, in Hindi or English (D5).
 *
 * Consent is double and explicit, and either side can end it:
 *  1. The student creates a parent link (lib/parentView) and separately turns
 *     on "Let my parent get WhatsApp updates" (`user.parent_whatsapp_allowed`).
 *  2. The parent opens that link and enters their own number with a consent
 *     tick. That is WhatsApp's required opt-in, given by the person who will
 *     receive the messages, so no inbound-message webhook is needed.
 *  Stopping: every message carries a stop link; the student turning updates
 *  off, replacing the parent link, or turning the link off all end it at once.
 *
 * Content follows the parent view's rule — effort and results, not answers or
 * per-attempt scores — and every number comes from the student's records. A
 * readiness change is shown only against a value this feature itself sent
 * the week before; nothing is estimated.
 *
 * Sending is OFF until an admin enables it (settings.parent_whatsapp_enabled)
 * and a provider is configured (lib/whatsapp). Until then the admin can only
 * preview what would be sent.
 */
import { buildParentView } from './parentView';
import { isoWeek, istDate } from './streak';

export const LANGS = ['hi', 'en'] as const;
export type ParentLang = (typeof LANGS)[number];
export const LOG_KEPT = 500;

export interface ParentWhatsapp {
  /** Digits only, country code first: "919876543210". */
  phone: string;
  lang: ParentLang;
  subscribed_at: string;
  /** ISO week of the last message sent ("2026-W44"). */
  last_week: string | null;
  /** Readiness per company as of the last message, for "up 12%" next week. */
  last_readiness: Record<string, number>;
}

export class ParentWaError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Normalise an Indian mobile number to "91XXXXXXXXXX", or null if it is not one. */
export function normalisePhone(raw: unknown): string | null {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (d.length === 10) d = `91${d}`;
  return /^91[6-9]\d{9}$/.test(d) ? d : null;
}

export const maskPhone = (p: string) => `+91 ${p.slice(2, 4)}••••••${p.slice(-2)}`;

const userByToken = (db: any, token: string) =>
  token.length >= 20 ? (db.users || []).find((u: any) => u.parent_link?.token === token) || null : null;

/** What the parent page shows about WhatsApp updates. */
export function parentWaStatus(db: any, token: string) {
  const user = userByToken(db, token);
  if (!user) throw new ParentWaError(404, 'This link is not active.');
  const sub: ParentWhatsapp | null = user.parent_whatsapp || null;
  return {
    allowed: user.parent_whatsapp_allowed === true,
    subscribed: sub ? { phone: maskPhone(sub.phone), lang: sub.lang, since: sub.subscribed_at } : null,
    sending: sendingEnabled(db),
  };
}

/** The parent subscribes from the parent page. */
export function subscribeParent(db: any, token: string, input: any, now = new Date()) {
  const user = userByToken(db, token);
  if (!user) throw new ParentWaError(404, 'This link is not active.');
  if (user.parent_whatsapp_allowed !== true) throw new ParentWaError(403, 'Your child has not turned on WhatsApp updates yet.');
  if (input?.consent !== true) throw new ParentWaError(400, 'Please tick the box to agree to weekly messages.');
  const phone = normalisePhone(input?.phone);
  if (!phone) throw new ParentWaError(400, 'Enter a 10-digit Indian mobile number.');
  const lang: ParentLang = (LANGS as readonly string[]).includes(input?.lang) ? input.lang : 'hi';
  const prev: ParentWhatsapp | null = user.parent_whatsapp || null;
  user.parent_whatsapp = {
    phone,
    lang,
    subscribed_at: prev?.phone === phone ? prev.subscribed_at : now.toISOString(),
    last_week: prev?.phone === phone ? prev.last_week : null,
    last_readiness: prev?.phone === phone ? prev.last_readiness : {},
  } satisfies ParentWhatsapp;
  return parentWaStatus(db, token);
}

/** The parent stops from the stop link. Idempotent. */
export function unsubscribeParent(db: any, token: string) {
  const user = userByToken(db, token);
  if (!user) throw new ParentWaError(404, 'This link is not active.');
  user.parent_whatsapp = null;
  return parentWaStatus(db, token);
}

/** The student's switch. Turning it off also ends any subscription. */
export function setStudentAllowed(user: any, allowed: boolean) {
  user.parent_whatsapp_allowed = allowed;
  if (!allowed) user.parent_whatsapp = null;
}

/** Called whenever the parent link is replaced or turned off: the old link's subscriber stops. */
export function endOnLinkChange(user: any) {
  user.parent_whatsapp = null;
}

export function studentWaStatus(user: any) {
  const sub: ParentWhatsapp | null = user.parent_whatsapp || null;
  return {
    allowed: user.parent_whatsapp_allowed === true,
    subscribed: sub ? { phone: maskPhone(sub.phone), lang: sub.lang, since: sub.subscribed_at, last_week: sub.last_week } : null,
  };
}

// --- the message ------------------------------------------------------------------------

/**
 * The approved-template wording. WhatsApp business messages must use a
 * template the provider has approved; an admin submits these texts once.
 * {{1}} first name, {{2}} the week's summary, {{3}} parent page, {{4}} stop link.
 * Template parameters may not contain line breaks, so {{2}} is one line.
 */
export const TEMPLATE_TEXT: Record<ParentLang, string> = {
  hi: 'नमस्ते! TieEdu पर {{1}} का इस हफ़्ते का हाल: {{2}} पूरी जानकारी: {{3}} ये संदेश बंद करने के लिए: {{4}}',
  en: 'Hello! {{1}}’s week on TieEdu: {{2}} Full details: {{3}} To stop these messages: {{4}}',
};

export interface WeeklyMessage {
  user_id: string;
  phone: string;
  lang: ParentLang;
  week: string;
  params: [string, string, string, string];
  text: string;
  readiness: Record<string, number>;
}

/** The one-line weekly summary, from real records only. */
export function weeklySummary(view: ReturnType<typeof buildParentView>, lang: ParentLang, lastReadiness: Record<string, number>): { summary: string; readiness: Record<string, number> } {
  const week = view.weeks[view.weeks.length - 1];
  const name = view.first_name || (lang === 'hi' ? 'आपके बच्चे' : 'Your child');
  const parts: string[] = [];
  const { tests, lessons } = week;

  if (lang === 'hi') {
    const did = [tests ? `${tests} टेस्ट` : '', lessons ? `${lessons} पाठ` : ''].filter(Boolean).join(' और ');
    parts.push(did ? `इस हफ़्ते ${name} ने ${did} पूरे किए।` : 'इस हफ़्ते कोई अभ्यास दर्ज नहीं हुआ।');
    if (view.streak.current >= 2) parts.push(`लगातार ${view.streak.current} दिन से अभ्यास जारी है।`);
  } else {
    const did = [tests ? `${tests} test${tests === 1 ? '' : 's'}` : '', lessons ? `${lessons} lesson${lessons === 1 ? '' : 's'}` : ''].filter(Boolean).join(' and ');
    parts.push(did ? `This week ${name} completed ${did}.` : 'No practice was recorded this week.');
    if (view.streak.current >= 2) parts.push(`On a ${view.streak.current}-day practice streak.`);
  }

  const readiness: Record<string, number> = {};
  for (const c of view.companies) readiness[c.name] = c.readiness;
  // The company furthest along, as the one line worth a parent's attention.
  const top = view.companies.slice().sort((a, b) => b.readiness - a.readiness)[0];
  if (top) {
    const before = lastReadiness[top.name];
    const d = typeof before === 'number' ? top.readiness - before : null;
    if (lang === 'hi') {
      const change = d === null ? '' : d > 0 ? ` (पिछले हफ़्ते से ${d}% ज़्यादा)` : d < 0 ? ` (पिछले हफ़्ते से ${-d}% कम)` : ' (पिछले हफ़्ते जितनी)';
      parts.push(`${top.name} की तैयारी: ${top.readiness}%${change}।`);
    } else {
      const change = d === null ? '' : d > 0 ? ` (up ${d}% from last week)` : d < 0 ? ` (down ${-d}% from last week)` : ' (same as last week)';
      parts.push(`${top.name} readiness: ${top.readiness}%${change}.`);
    }
  }
  return { summary: parts.join(' '), readiness };
}

export function buildWeeklyMessage(db: any, user: any, siteUrl: string, now = new Date()): WeeklyMessage | null {
  const sub: ParentWhatsapp | null = user.parent_whatsapp || null;
  if (!sub || user.parent_whatsapp_allowed !== true || !user.parent_link?.token) return null;
  const view = buildParentView(db, user, now);
  const { summary, readiness } = weeklySummary(view, sub.lang, sub.last_readiness || {});
  const base = siteUrl.replace(/\/+$/, '');
  const page = `${base}/parent/${user.parent_link.token}`;
  const params: WeeklyMessage['params'] = [view.first_name || (sub.lang === 'hi' ? 'आपके बच्चे' : 'your child'), summary, page, `${page}?stop=1`];
  const text = params.reduce((t, p, i) => t.replace(`{{${i + 1}}}`, p), TEMPLATE_TEXT[sub.lang]);
  return { user_id: user.id, phone: sub.phone, lang: sub.lang, week: isoWeek(istDate(now)), params, text, readiness };
}

// --- the weekly run ---------------------------------------------------------------------

export const sendingEnabled = (db: any) => db.settings?.parent_whatsapp_enabled === true;

/** Sunday from 10:00 India time: a weekend morning, not a work-day interruption. */
export function isSendWindow(now = new Date()): boolean {
  const ist = new Date(now.getTime() + 5.5 * 3_600_000);
  return ist.getUTCDay() === 0 && ist.getUTCHours() >= 10;
}

/** Everyone due a message this ISO week. Pure: nothing is sent or saved. */
export function planWeekly(db: any, siteUrl: string, now = new Date()): WeeklyMessage[] {
  const week = isoWeek(istDate(now));
  const out: WeeklyMessage[] = [];
  for (const u of db.users || []) {
    if (!u.parent_whatsapp || u.parent_whatsapp.last_week === week || u.disabled) continue;
    const m = buildWeeklyMessage(db, u, siteUrl, now);
    if (m) out.push(m);
  }
  return out;
}

/** Record a message as handled for its week (before sending, so a crash never double-sends). */
export function markSent(db: any, m: WeeklyMessage) {
  const u = (db.users || []).find((x: any) => x.id === m.user_id);
  if (!u?.parent_whatsapp) return;
  u.parent_whatsapp.last_week = m.week;
  u.parent_whatsapp.last_readiness = m.readiness;
}

export interface LogRow { user_id: string; week: string; status: 'sent' | 'failed'; error: string | null; at: string }
export function logResult(db: any, row: LogRow) {
  if (!Array.isArray(db.parent_whatsapp_log)) db.parent_whatsapp_log = [];
  db.parent_whatsapp_log.push(row);
  if (db.parent_whatsapp_log.length > LOG_KEPT) db.parent_whatsapp_log.splice(0, db.parent_whatsapp_log.length - LOG_KEPT);
}

export function adminSummary(db: any, siteUrl: string, configured: boolean, now = new Date()) {
  const subs = (db.users || []).filter((u: any) => u.parent_whatsapp && u.parent_whatsapp_allowed === true);
  const log: LogRow[] = db.parent_whatsapp_log || [];
  const week = isoWeek(istDate(now));
  return {
    enabled: sendingEnabled(db),
    configured,
    subscribers: subs.length,
    by_lang: { hi: subs.filter((u: any) => u.parent_whatsapp.lang === 'hi').length, en: subs.filter((u: any) => u.parent_whatsapp.lang === 'en').length },
    this_week: { week, sent: log.filter((r) => r.week === week && r.status === 'sent').length, failed: log.filter((r) => r.week === week && r.status === 'failed').length },
    recent_errors: log.filter((r) => r.status === 'failed').slice(-5).map((r) => ({ week: r.week, error: r.error, at: r.at })),
    templates: TEMPLATE_TEXT,
    // A preview never carries the number or the private link.
    preview: subs.slice(0, 3).map((u: any) => buildWeeklyMessage(db, u, siteUrl, now)).filter(Boolean).map((m: any) => ({
      lang: m.lang,
      text: m.text.split(m.params[2]).join('[parent link]').split('[parent link]?stop=1').join('[stop link]'),
    })),
  };
}
