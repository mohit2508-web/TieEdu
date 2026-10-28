/**
 * The weekly parent WhatsApp run (lib/parentWhatsapp). Every 30 minutes it
 * checks; inside the Sunday window it sends this week's messages to everyone
 * not yet sent to. It does nothing unless an admin has enabled sending, a
 * provider is configured (lib/whatsapp) and NEXT_PUBLIC_SITE_URL is set — the
 * links in each message must point at the real site, so it never guesses one.
 */
import { loadDb, saveDb } from '../data/db';
import { isSendWindow, logResult, markSent, planWeekly, sendingEnabled } from './parentWhatsapp';
import { sendTemplate, whatsappConfigured, type WaSendResult } from './whatsapp';
import { emailEnabled, markEmailSent, planWeeklyEmails, type Mailer } from './parentEmail';
import { EMAIL_FROM, EMAIL_REPLY_TO, getEmailClient } from './email/client';

export const siteUrl = (env: NodeJS.ProcessEnv = process.env) => (env.NEXT_PUBLIC_SITE_URL || '').trim();

/** One pass. Exported for tests; `send` defaults to the real provider. */
export async function runParentWhatsapp(
  now = new Date(),
  send: (to: string, lang: 'hi' | 'en', params: string[]) => Promise<WaSendResult> = (to, lang, params) => sendTemplate(to, lang, params),
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ due: number; sent: number; failed: number; skipped: string | null }> {
  const db = loadDb();
  if (!sendingEnabled(db)) return { due: 0, sent: 0, failed: 0, skipped: 'disabled' };
  if (!whatsappConfigured(env)) return { due: 0, sent: 0, failed: 0, skipped: 'not configured' };
  if (!siteUrl(env)) return { due: 0, sent: 0, failed: 0, skipped: 'NEXT_PUBLIC_SITE_URL not set' };
  if (!isSendWindow(now)) return { due: 0, sent: 0, failed: 0, skipped: 'outside window' };

  const due = planWeekly(db, siteUrl(env), now);
  if (!due.length) return { due: 0, sent: 0, failed: 0, skipped: null };
  // Mark before sending: a crash mid-run must not message a parent twice.
  for (const m of due) markSent(db, m);
  saveDb(db);

  let sent = 0;
  let failed = 0;
  const results: Array<{ user_id: string; week: string; r: WaSendResult }> = [];
  for (const m of due) {
    const r = await send(m.phone, m.lang, m.params);
    results.push({ user_id: m.user_id, week: m.week, r });
    if (r.ok) sent++;
    else failed++;
  }
  const after = loadDb();
  for (const x of results) logResult(after, { user_id: x.user_id, week: x.week, status: x.r.ok ? 'sent' : 'failed', error: x.r.error, at: now.toISOString() });
  saveDb(after);
  return { due: due.length, sent, failed, skipped: null };
}

/** The real mailer for parent emails: Resend, through the existing client. */
export const resendMailer: Mailer = async (m) => {
  const client = getEmailClient();
  if (!client) return { ok: false, error: 'email is not configured' };
  try {
    const r: any = await client.emails.send({ from: EMAIL_FROM(), to: m.to, subject: m.subject, text: m.text, html: m.html, replyTo: EMAIL_REPLY_TO() } as any);
    return r?.error ? { ok: false, error: String(r.error.message || r.error) } : { ok: true, error: null };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
};

/** The weekly parent email pass (lib/parentEmail): same window and same no-double-send rule as WhatsApp. */
export async function runParentEmail(now = new Date(), mail: Mailer = resendMailer, env: NodeJS.ProcessEnv = process.env) {
  const db = loadDb();
  if (!emailEnabled(db)) return { due: 0, sent: 0, failed: 0, skipped: 'disabled' };
  if (!getEmailClient()) return { due: 0, sent: 0, failed: 0, skipped: 'not configured' };
  if (!siteUrl(env)) return { due: 0, sent: 0, failed: 0, skipped: 'NEXT_PUBLIC_SITE_URL not set' };
  if (!isSendWindow(now)) return { due: 0, sent: 0, failed: 0, skipped: 'outside window' };
  const due = planWeeklyEmails(db, siteUrl(env), now);
  if (!due.length) return { due: 0, sent: 0, failed: 0, skipped: null };
  for (const m of due) markEmailSent(db, m);
  saveDb(db);
  let sent = 0;
  let failed = 0;
  for (const m of due) {
    const r = await mail({ to: m.to, subject: m.subject, text: m.text, html: m.html });
    if (r.ok) sent++;
    else { failed++; console.warn('[ParentEmail] send failed:', r.error); }
  }
  return { due: due.length, sent, failed, skipped: null };
}

let started = false;
export function startParentWhatsappScheduler(): void {
  if (started) return;
  started = true;
  const tick = () => {
    runParentWhatsapp()
      .then((r) => { if (r.due) console.log(`[ParentWA] weekly run: ${r.due} due, ${r.sent} sent, ${r.failed} failed`); })
      .catch((e) => console.warn('[ParentWA] weekly run failed:', e?.message || e));
    runParentEmail()
      .then((r) => { if (r.due) console.log(`[ParentEmail] weekly run: ${r.due} due, ${r.sent} sent, ${r.failed} failed`); })
      .catch((e) => console.warn('[ParentEmail] weekly run failed:', e?.message || e));
  };
  setInterval(tick, 30 * 60_000).unref?.();
}
