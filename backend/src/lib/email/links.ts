/**
 * Link signing for outbound email.
 *
 * Two jobs:
 *
 * 1. Every CTA in a marketing email is rewritten through
 *    `GET /api/email/click?m=<messageId>&u=<target>&s=<sig>` so the click is
 *    recorded under the right EmailMessage and the browser receives the
 *    `tieedu_lead` identity cookie on the way past. That cookie is what makes
 *    "he clicked the course mail, looked at the page, left" — the trigger for
 *    every behaviour automation — observable at all, because cold leads arrive
 *    with no identity of any kind.
 *
 * 2. Unsubscribe links carry a standalone HMAC token so a recipient can opt out
 *    without an account, a session, or any other credential — which is the only
 *    form regulators accept.
 *
 * Both signatures use one secret (EMAIL_LINK_SECRET, falling back to JWT_SECRET
 * — a session-signing secret is already per-install and unguessable, and two
 * secrets to rotate is one more than a subsystem this size should need).
 * Targets are restricted to same-site relative paths: a signed email link that
 * could be minted to point off-site would be an open redirect wearing our
 * domain.
 */
import crypto from 'crypto';
import type { Response } from 'express';
import { JWT_SECRET } from '../../middleware/auth';

export const LEAD_COOKIE_NAME = 'tieedu_lead';
const LEAD_COOKIE_DAYS = 90;

const secret = (): string =>
  (process.env.EMAIL_LINK_SECRET || '').trim() || JWT_SECRET || 'dev-link-secret';

const hmac = (value: string): string =>
  crypto.createHmac('sha256', secret()).update(value).digest('base64url');

/** Public origin used for absolute links inside emails. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

const sig8 = (value: string): string => hmac(value).slice(0, 16);

/** `leadId.<sig>` — the cookie payload. Not a session; it only names the row. */
export function leadCookieValue(leadId: string): string {
  return `${leadId}.${sig8(leadId)}`;
}

export function verifyLeadCookie(value: unknown): string | null {
  if (typeof value !== 'string' || !value.includes('.')) return null;
  const idx = value.lastIndexOf('.');
  const id = value.slice(0, idx);
  const sig = value.slice(idx + 1);
  if (!id || !sig) return null;
  const expected = sig8(id);
  return timingSafeEqual(sig, expected) ? id : null;
}

/**
 * Same-site relative path or null.
 *
 * `//evil.com` and `https://…` are both rejected: the first is protocol-relative
 * and the second is simply off-site. Only site-internal targets are ever
 * reachable through a signed click link.
 */
export function safeTarget(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.startsWith('/')) return null;
  if (raw.startsWith('//')) return null;
  if (raw.length > 2048) return null;
  return raw;
}

/**
 * Rewrite one in-email URL through the click endpoint.
 *
 * `messageId` may be absent in preview contexts (admin template preview), in
 * which case the target is returned untouched — a preview is not a send and
 * must not mint tracking links that resolve to nothing.
 */
export function wrapLink(target: string, messageId?: string): string {
  const safe = safeTarget(target) || '/';
  if (!messageId) return `${siteUrl()}${safe}`;
  const sig = sig8(`${messageId}:${safe}`);
  return `${siteUrl()}/api/email/click?m=${encodeURIComponent(messageId)}&u=${encodeURIComponent(safe)}&s=${sig}`;
}

export function verifyClickToken(messageId: string, target: string, sig: string): boolean {
  return timingSafeEqual(sig, sig8(`${messageId}:${target}`));
}

/** One-click unsubscribe token — HMAC of the lead id, no login required. */
export function unsubscribeToken(leadId: string): string {
  return Buffer.from(`${leadId}.${sig8(`unsub:${leadId}`)}`).toString('base64url');
}

/** Absolute unsubscribe URL for a send. */
export function unsubFor(leadId: string): string {
  return `${siteUrl()}/api/email/unsubscribe?token=${unsubscribeToken(leadId)}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  let decoded: string;
  try {
    decoded = Buffer.from(token, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  const idx = decoded.lastIndexOf('.');
  if (idx <= 0) return null;
  const id = decoded.slice(0, idx);
  const sig = decoded.slice(idx + 1);
  return timingSafeEqual(sig, sig8(`unsub:${id}`)) ? id : null;
}

const IDENTIFY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Short-lived identity-exchange token (`?em=`).
 *
 * The click redirect already sets the cookie on its own response; this token
 * rides along on the landing URL as the belt to that braces — if the cookie
 * was blocked, cleared between click and load, or the URL gets opened in a
 * second browser, the frontend boot exchanges `em` for the cookie via
 * `POST /api/email/identify`.
 *
 * Unlike the unsubscribe token this one EXPIRES (7 days): it is meant to be
 * pasted into a URL bar and photographed in screenshots, so a permanent
 * "this browser is lead X" token should not exist. Expiry is an absolute
 * timestamp signed into the token — no server state to keep.
 */
export function identifyToken(leadId: string, ttlMs: number = IDENTIFY_TTL_MS): string {
  const exp = Date.now() + ttlMs;
  return Buffer.from(`${leadId}.${exp}.${sig8(`em:${leadId}:${exp}`)}`).toString('base64url');
}

export function verifyIdentifyToken(token: string): string | null {
  let decoded: string;
  try {
    decoded = Buffer.from(token, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  // Split from the right: the signature and expiry can never contain a dot,
  // but the lead id is opaque and might.
  const sigAt = decoded.lastIndexOf('.');
  if (sigAt <= 0) return null;
  const sig = decoded.slice(sigAt + 1);
  const rest = decoded.slice(0, sigAt);
  const expAt = rest.lastIndexOf('.');
  if (expAt <= 0) return null;
  const id = rest.slice(0, expAt);
  const expRaw = rest.slice(expAt + 1);
  const exp = Number(expRaw);
  if (!id || !expRaw || !Number.isFinite(exp) || Date.now() > exp) return null;
  return timingSafeEqual(sig, sig8(`em:${id}:${expRaw}`)) ? id : null;
}

/**
 * Append (or refresh) the `?em=` exchange token on a landing path.
 * A pre-existing `em` is replaced — a target URL is signed content, but a
 * stale token in it must not shadow the live one.
 */
export function withIdentifyParam(target: string, leadId: string): string {
  const safe = safeTarget(target) || '/';
  let parsed: URL;
  try {
    parsed = new URL(safe, 'http://link.local');
  } catch {
    return safe;
  }
  parsed.searchParams.set('em', identifyToken(leadId));
  return parsed.pathname + parsed.search;
}

/**
 * Attach the lead identity cookie to a response.
 *
 * httpOnly (nothing in the page needs to read it — the frontend talks to the
 * server, which does), sameSite=lax so it rides along on the top-level
 * navigation a click performs, secure outside development.
 */
export function setLeadCookie(res: Response, leadId: string): void {
  const maxAge = LEAD_COOKIE_DAYS * 24 * 60 * 60 * 1000;
  res.cookie(LEAD_COOKIE_NAME, leadCookieValue(leadId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}
