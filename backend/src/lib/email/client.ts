/**
 * Resend client for the email marketing subsystem.
 *
 * The platform had no transactional mailer at all (see the note in
 * routes/placementAdmin.routes.ts), so this is the single door out. Everything
 * that sends — blasts, test sends, automations — goes through `getEmailClient()`
 * so there is exactly one place where the API key, the from-address and the
 * "not configured" story live.
 *
 * Failing loudly beats failing silently: a missing key is returned as `null`
 * with `emailConfigError()` explaining why, and every caller turns that into a
 * 503 with the same message rather than pretending a send happened.
 */
import { Resend } from 'resend';

let client: Resend | null = null;
let checked = false;

const API_KEY = () => (process.env.RESEND_API_KEY || '').trim();

/** The from-address. Verified domain required — see EMAIL_MARKETING_PLAN.md §5. */
export const EMAIL_FROM = () =>
  (process.env.EMAIL_FROM || '').trim() || 'TieEdu <onboarding@resend.dev>';

export const EMAIL_REPLY_TO = (): string | undefined => {
  const v = (process.env.EMAIL_REPLY_TO || '').trim();
  return v || undefined;
};

/**
 * Why the mailer is unavailable, or null when it is configured.
 *
 * `onboarding@resend.dev` is Resend's test identity — it can only ever reach
 * the account owner's own address. Allowed in development, treated as a
 * misconfiguration for real sends so a production blast cannot silently go
 * nowhere.
 */
export function emailConfigError(): string | null {
  if (!API_KEY()) return 'RESEND_API_KEY is not set — outbound email is disabled.';
  return null;
}

export function isTestIdentity(): boolean {
  return EMAIL_FROM().includes('@resend.dev');
}

export function getEmailClient(): Resend | null {
  if (emailConfigError()) return null;
  if (!checked) {
    checked = true;
    client = new Resend(API_KEY());
  }
  return client;
}

/** Test hook — forces the next call to re-read the environment. */
export function __resetEmailClient(): void {
  client = null;
  checked = false;
}
