import crypto from 'crypto';
import { Request, Response } from 'express';
import { getPool } from '../../db/client';

/**
 * Shared primitives for the Mock Drive & Assessment Bridge.
 *
 * Two things live here and nowhere else, because getting either wrong is a
 * security bug rather than a code smell:
 *
 *  1. Launch tokens. Opaque and random (never a JWT). The database stores only
 *     the SHA-256 of the token, so a dump of `drive_launch` cannot be replayed.
 *     Verification is a single atomic UPDATE ... RETURNING, so two concurrent
 *     introspections with the same token cannot both win.
 *
 *  2. Webhook signatures. HMAC-SHA256 over `timestamp + "." + rawBody`, in the
 *     same style as the Razorpay handler, but timestamped. Without the timestamp
 *     an attacker who ever captured one valid delivery could replay it forever.
 */

export const LAUNCH_TOKEN_TTL_SECONDS = Number(process.env.BRIDGE_LAUNCH_TTL_SECONDS || 300);
export const WEBHOOK_TOLERANCE_SECONDS = Number(process.env.BRIDGE_WEBHOOK_TOLERANCE_SECONDS || 300);

export type DriveProviderRow = {
  provider_id: string;
  code: string;
  name: string;
  base_url: string;
  launch_url: string;
  introspect_url: string;
  secret_env_prefix: string;
  status: string;
};

/** True for the two failure modes that mean "the database is not answering". */
export function isConnectionFailure(err: any): boolean {
  const code = err?.code;
  return (
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'ENOTFOUND' ||
    code === '57P01' ||
    code === '08006' ||
    /ECONNREFUSED|connection .*not .*available|terminating connection|timeout expired/i.test(String(err?.message || ''))
  );
}

/**
 * The single, honest answer when the bridge has no database.
 *
 * The rest of the platform serves a JSON fallback store; the bridge deliberately
 * does not. Registrations and results are relational and must not silently be
 * kept in memory and lost on restart. So a bridge endpoint whose store is down
 * answers 503 — never an empty list that looks like "no drives".
 */
export function bridgeUnavailable(res: Response, err?: any) {
  if (err && !isConnectionFailure(err)) console.error('[DriveBridge] query failed:', err?.message || err);
  return res.status(503).json({
    error: 'drive_service_unavailable',
    message: 'Mock drive storage is temporarily unavailable. Please retry shortly.',
  });
}

export function newId(): string {
  return crypto.randomUUID();
}

export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/** Opaque, URL-safe, 256 bits of entropy. Not a JWT and never stored raw. */
export function generateLaunchToken(): { token: string; token_hash: string; token_jti: string } {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, token_hash: sha256(token), token_jti: newId() };
}

export function hmacSha256Hex(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function signTimestamped(secret: string, timestamp: string, rawBody: string): string {
  return hmacSha256Hex(secret, `${timestamp}.${rawBody}`);
}

export type HmacResult = { ok: boolean; reason?: 'missing' | 'stale_timestamp' | 'bad_signature' };

/**
 * Verifies `X-Bridge-Timestamp` + `X-Bridge-Signature` against the raw body.
 *
 * Order matters: the timestamp is checked before the signature so a replayed
 * request is rejected even if the signature is valid, and the comparison is
 * timing-safe so a wrong signature cannot be recovered byte-by-byte.
 */
export function verifyTimestamped(params: {
  secret: string;
  timestamp?: string | string[];
  signature?: string | string[];
  rawBody: string;
  nowMs?: number;
}): HmacResult {
  const { secret, rawBody } = params;
  const ts = Array.isArray(params.timestamp) ? params.timestamp[0] : params.timestamp;
  const sig = Array.isArray(params.signature) ? params.signature[0] : params.signature;
  if (!secret || !ts || !sig) return { ok: false, reason: 'missing' };

  const tsNum = Number(ts);
  const now = Math.floor((params.nowMs ?? Date.now()) / 1000);
  if (!Number.isFinite(tsNum) || Math.abs(now - tsNum) > WEBHOOK_TOLERANCE_SECONDS) {
    return { ok: false, reason: 'stale_timestamp' };
  }

  const expected = signTimestamped(secret, String(ts), rawBody);
  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, reason: 'bad_signature' };
  return { ok: true };
}

export function providerSecrets(prefix: string): { introspect: string; webhook: string; api: string } {
  const p = (prefix || '').trim().toUpperCase();
  return {
    introspect: (process.env[`${p}_INTROSPECT_SECRET`] || '').trim(),
    webhook: (process.env[`${p}_WEBHOOK_SECRET`] || '').trim(),
    api: (process.env[`${p}_API_SECRET`] || '').trim(),
  };
}

export async function getProviderByCode(code: string): Promise<DriveProviderRow | null> {
  if (!code) return null;
  const r = await getPool().query<DriveProviderRow>(
    `SELECT provider_id, code, name, base_url, launch_url, introspect_url, secret_env_prefix, status
       FROM drive_provider WHERE code = $1`,
    [code]
  );
  return r.rows[0] || null;
}

/** Appends a query param to a URL that may or may not already carry a query string. */
export function withQuery(url: string, key: string, value: string): string {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

/**
 * Reads the raw body express stashed via the global `express.json({ verify })`
 * hook in server.ts. Keeping one parser (rather than mounting a second
 * `express.raw` on the bridge) is what makes the signature cover exactly the
 * bytes the client signed.
 */
export function rawBodyOf(req: Request): string {
  const anyReq = req as any;
  if (typeof anyReq.rawBody === 'string') return anyReq.rawBody;
  try {
    return req.body ? JSON.stringify(req.body) : '';
  } catch {
    return '';
  }
}

export function playerCollegeIds(userId: string): Promise<string[]> {
  return getPool()
    .query<{ college_id: string }>(`SELECT DISTINCT college_id FROM student_profile WHERE user_id = $1`, [userId])
    .then((r) => r.rows.map((x) => x.college_id).filter(Boolean));
}
