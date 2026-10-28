/**
 * Weekly parent update by email (F3) — the email twin of lib/parentWhatsapp,
 * sharing its consent switch and its one-line summary.
 *
 * The rule (set by the platform owner): confirmed double opt-in.
 *  1. The student allows parent updates (`user.parent_whatsapp_allowed`, the
 *     same switch as WhatsApp; the student page calls it "weekly updates").
 *  2. The parent enters their email on the parent page.
 *  3. One confirmation email goes out. No weekly email is ever sent until the
 *     parent clicks it. An address that never confirms gets that one email
 *     and no other, ever: a second request for it is refused (`confirm_sent`).
 *  Every email carries an unsubscribe link; the student switching updates off,
 *  or replacing or turning off the parent link, ends it too.
 *
 * Nothing at all is sent — not even the confirmation — unless an admin has
 * turned on settings.parent_email_enabled and email is configured.
 */
import crypto from 'crypto';
import { buildParentView } from './parentView';
import { weeklySummary, type ParentLang } from './parentWhatsapp';
import { isoWeek, istDate } from './streak';

export const EMAIL_MAX = 120;

export interface ParentEmail {
  email: string;
  lang: ParentLang;
  status: 'unconfirmed' | 'confirmed';
  /** Confirm and unsubscribe capability; random, 24 bytes. */
  token: string;
  requested_at: string;
  confirmed_at: string | null;
  last_week: string | null;
  last_readiness: Record<string, number>;
}

export class ParentEmailError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type Mailer = (msg: { to: string; subject: string; text: string; html: string }) => Promise<{ ok: boolean; error: string | null }>;

export const emailEnabled = (db: any) => db.settings?.parent_email_enabled === true;
const hashEmail = (e: string) => crypto.createHash('sha256').update(e.trim().toLowerCase()).digest('hex');
const sentSet = (db: any): Record<string, string> => (db.parent_email_confirm_sent ??= {});
const userByLink = (db: any, token: string) => (token.length >= 20 ? (db.users || []).find((u: any) => u.parent_link?.token === token) || null : null);
const userByEmailToken = (db: any, token: string) => (token.length >= 20 ? (db.users || []).find((u: any) => u.parent_email?.token === token) || null : null);
export const maskEmail = (e: string) => {
  const [name, domain] = e.split('@');
  return `${name.slice(0, 2)}${'•'.repeat(Math.max(1, name.length - 2))}@${domain}`;
};
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export function parentEmailStatus(db: any, linkToken: string) {
  const user = userByLink(db, linkToken);
  if (!user) throw new ParentEmailError(404, 'This link is not active.');
  const sub: ParentEmail | null = user.parent_email || null;
  return {
    offered: emailEnabled(db) && user.parent_whatsapp_allowed === true,
    subscribed: sub ? { email: maskEmail(sub.email), lang: sub.lang, confirmed: sub.status === 'confirmed' } : null,
  };
}

function confirmMessage(name: string, lang: ParentLang, confirmUrl: string, stopUrl: string) {
  const hi = lang === 'hi';
  const subject = hi ? `${name} का साप्ताहिक TieEdu अपडेट — ईमेल की पुष्टि करें` : `Confirm weekly TieEdu updates about ${name}`;
  const line1 = hi
    ? `${name} ने अपनी प्लेसमेंट की तैयारी आपके साथ साझा की है। हर रविवार एक छोटी ईमेल पाने के लिए नीचे क्लिक करें।`
    : `${name} has shared their placement preparation with you. Click below to get one short email every Sunday.`;
  const line2 = hi
    ? 'अगर आपने यह नहीं माँगा, तो कुछ न करें — आपको कोई और ईमेल नहीं आएगी।'
    : 'If you did not ask for this, do nothing — you will not get another email.';
  const cta = hi ? 'हाँ, साप्ताहिक अपडेट भेजें' : 'Yes, send weekly updates';
  return {
    subject,
    text: `${line1}\n\n${cta}: ${confirmUrl}\n\n${line2}\n\nUnsubscribe: ${stopUrl}`,
    html: `<p>${esc(line1)}</p><p><a href="${esc(confirmUrl)}"><strong>${esc(cta)}</strong></a></p><p>${esc(line2)}</p><p style="color:#666;font-size:12px"><a href="${esc(stopUrl)}">Unsubscribe</a></p>`,
  };
}

/** The parent asks for email updates. Sends the one confirmation email. */
export async function requestParentEmail(
  load: () => any, save: (db: any) => void, linkToken: string, input: any, site: string, mail: Mailer, now = new Date(),
) {
  const db = load();
  const user = userByLink(db, linkToken);
  if (!user) throw new ParentEmailError(404, 'This link is not active.');
  if (!emailEnabled(db)) throw new ParentEmailError(503, 'Email updates are not available yet.');
  if (user.parent_whatsapp_allowed !== true) throw new ParentEmailError(403, 'Your child has not turned on weekly updates yet.');
  if (input?.consent !== true) throw new ParentEmailError(400, 'Please tick the box to agree to weekly emails.');
  const email = String(input?.email || '').trim().toLowerCase().slice(0, EMAIL_MAX);
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(email)) throw new ParentEmailError(400, 'Enter a valid email address.');
  const lang: ParentLang = input?.lang === 'en' ? 'en' : 'hi';
  const prev: ParentEmail | null = user.parent_email || null;
  if (prev?.email === email && prev.status === 'confirmed') return parentEmailStatus(db, linkToken);
  // One confirmation per address, ever: an address that did not confirm is never mailed again.
  if (sentSet(db)[hashEmail(email)]) throw new ParentEmailError(409, 'We already sent a confirmation to this address. Please check your inbox and spam folder.');

  const sub: ParentEmail = { email, lang, status: 'unconfirmed', token: crypto.randomBytes(24).toString('base64url'), requested_at: now.toISOString(), confirmed_at: null, last_week: null, last_readiness: {} };
  user.parent_email = sub;
  // Record before sending, so a retry after a crash cannot mail twice.
  sentSet(db)[hashEmail(email)] = now.toISOString();
  save(db);

  const base = site.replace(/\/+$/, '');
  const name = buildParentView(db, user, now).first_name || 'Your child';
  const msg = confirmMessage(name, lang, `${base}/parent-email/confirm?t=${sub.token}`, `${base}/parent-email/stop?t=${sub.token}`);
  const r = await mail({ to: email, ...msg });
  if (!r.ok) console.error('[parent-email] confirmation failed:', r.error);
  return parentEmailStatus(load(), linkToken);
}

export function confirmParentEmail(db: any, token: string, now = new Date()) {
  const user = userByEmailToken(db, token);
  if (!user) throw new ParentEmailError(404, 'This link has expired or was already used to unsubscribe.');
  user.parent_email.status = 'confirmed';
  user.parent_email.confirmed_at ??= now.toISOString();
  return { confirmed: true, first_name: buildParentView(db, user, now).first_name };
}

export function stopParentEmail(db: any, token: string) {
  const user = userByEmailToken(db, token);
  if (user) user.parent_email = null;
  // Idempotent: an old or reused link just reports that emails are off.
  return { stopped: true };
}

/** Called with the WhatsApp equivalents: the student switching off or changing the link ends email too. */
export function endParentEmail(user: any) {
  user.parent_email = null;
}

// --- the weekly run ------------------------------------------------------------------------

export interface WeeklyEmail { user_id: string; to: string; week: string; subject: string; text: string; html: string; readiness: Record<string, number> }

export function planWeeklyEmails(db: any, site: string, now = new Date()): WeeklyEmail[] {
  const week = isoWeek(istDate(now));
  const base = site.replace(/\/+$/, '');
  const out: WeeklyEmail[] = [];
  for (const u of db.users || []) {
    const sub: ParentEmail | null = u.parent_email || null;
    if (!sub || sub.status !== 'confirmed' || sub.last_week === week || u.disabled || u.parent_whatsapp_allowed !== true || !u.parent_link?.token) continue;
    const view = buildParentView(db, u, now);
    const { summary, readiness } = weeklySummary(view, sub.lang, sub.last_readiness || {});
    const name = view.first_name || (sub.lang === 'hi' ? 'आपके बच्चे' : 'Your child');
    const page = `${base}/parent/${u.parent_link.token}`;
    const stop = `${base}/parent-email/stop?t=${sub.token}`;
    const hi = sub.lang === 'hi';
    const subject = hi ? `${name} का इस हफ़्ते का TieEdu अपडेट` : `${name}'s week on TieEdu`;
    const more = hi ? 'पूरी जानकारी' : 'Full details';
    out.push({
      user_id: u.id, to: sub.email, week, readiness, subject,
      text: `${summary}\n\n${more}: ${page}\n\nUnsubscribe: ${stop}`,
      html: `<p>${esc(summary)}</p><p><a href="${esc(page)}">${esc(more)}</a></p><p style="color:#666;font-size:12px"><a href="${esc(stop)}">Unsubscribe</a></p>`,
    });
  }
  return out;
}

export function markEmailSent(db: any, m: WeeklyEmail) {
  const u = (db.users || []).find((x: any) => x.id === m.user_id);
  if (!u?.parent_email) return;
  u.parent_email.last_week = m.week;
  u.parent_email.last_readiness = m.readiness;
}
