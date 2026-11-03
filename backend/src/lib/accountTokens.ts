import crypto from 'crypto';
import { sendDriveEmail } from './driveEmail';

/**
 * One-time account links: password reset and email verification
 * (PROFESSIONAL_PLATFORM_PLAN §1.2).
 *
 * Only a SHA-256 of the token is stored, so a copy of the database cannot be
 * used to reset anyone's password. Each token is single use, expires, and
 * issuing a new one of the same kind voids the old ones for that user.
 */
export type AccountTokenKind = 'reset' | 'verify';

export interface AccountToken {
  hash: string;
  user_id: string;
  kind: AccountTokenKind;
  created_at: string;
  expires_at: string;
  used_at: string | null;
}

const TTL_MIN: Record<AccountTokenKind, number> = { reset: 30, verify: 60 * 24 * 3 };

const sha = (t: string) => crypto.createHash('sha256').update(t).digest('hex');

/** `ttlMinutes` overrides the default life, e.g. a 7-day welcome link for an account an admin created. */
export function issueAccountToken(db: any, userId: string, kind: AccountTokenKind, now = new Date(), ttlMinutes?: number): string {
  const token = crypto.randomBytes(32).toString('base64url');
  db.account_tokens = (Array.isArray(db.account_tokens) ? db.account_tokens : []).filter(
    // Drop this user's older tokens of the same kind, and anything long expired.
    (t: AccountToken) => !(t.user_id === userId && t.kind === kind) && new Date(t.expires_at).getTime() > now.getTime() - 86_400_000
  );
  db.account_tokens.push({
    hash: sha(token),
    user_id: userId,
    kind,
    created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + (ttlMinutes ?? TTL_MIN[kind]) * 60_000).toISOString(),
    used_at: null,
  } satisfies AccountToken);
  return token;
}

/** Marks the token used and returns its user id, or null when invalid/expired/used. */
export function consumeAccountToken(db: any, token: string, kind: AccountTokenKind, now = new Date()): string | null {
  if (typeof token !== 'string' || token.length < 20) return null;
  const row = (db.account_tokens || []).find((t: AccountToken) => t.hash === sha(token) && t.kind === kind);
  if (!row || row.used_at || new Date(row.expires_at).getTime() < now.getTime()) return null;
  row.used_at = now.toISOString();
  return row.user_id;
}

export function sendPasswordResetEmail(to: string, name: string, token: string) {
  return sendDriveEmail({
    to,
    subject: 'Reset your TieEdu password',
    body: `Someone (hopefully you) asked to reset the password for this TieEdu account. The link below works once and expires in 30 minutes.\n\nIf you did not ask for this, you can ignore this email; your password stays the same.`,
    driveName: 'TieEdu',
    url: `/reset-password?token=${encodeURIComponent(token)}`,
    ctaLabel: 'Choose a new password',
    note: 'TieEdu · You are getting this because a password reset was requested for your account.',
  });
}

export function sendVerifyEmail(to: string, name: string, token: string) {
  return sendDriveEmail({
    to,
    subject: 'Confirm your email for TieEdu',
    body: `Welcome to TieEdu, ${firstName(name)}! Please confirm this is your email so we can send your results, receipts and certificates here. The link is valid for 3 days.`,
    driveName: 'TieEdu',
    url: `/verify-email?token=${encodeURIComponent(token)}`,
    ctaLabel: 'Confirm my email',
    note: 'TieEdu · You are getting this because this email was used to create a TieEdu account.',
  });
}

const firstName = (n: string) => String(n || '').trim().split(/\s+/)[0] || 'there';
