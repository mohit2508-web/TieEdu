import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { loadDb, User } from '../data/db';
import { ResolvedAuthority, resolveAuthority, can, isPermission, PERMISSION_GROUPS } from '../lib/rbac';

// Imports are evaluated before any statement in the importing module, so this
// file used to read process.env.JWT_SECRET before server.ts had a chance to call
// dotenv.config() - which is why a configured secret was ignored and the
// process silently fell back to a random per-boot value. Loading here as well
// makes the order irrelevant. dotenv never overrides a variable that is already
// set, so the second call in server.ts stays a no-op.
dotenv.config();

export const ACCESS_TTL = process.env.ACCESS_TTL || '15m';
export const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TTL_DAYS || 30);
export const COOKIE_NAME = 'tieedu_refresh';

/**
 * The signing secret for session tokens.
 *
 * There is deliberately no hardcoded fallback any more. There used to be one -
 * `tieedu-dev-secret-change-me` - and it was the worst line in this file: a
 * secret that ships in the repository is not a secret, and a server that picks it
 * up silently will happily authenticate anyone who has read the source. It did
 * exactly that on a `npm start` deployment, because NODE_ENV was unset there, so
 * the `production` branch never ran and every token was forgeable with a string
 * from a public repo. The literal is gone so it cannot come back.
 *
 * In development the secret is random per boot. That costs a re-login on every
 * restart, which is the correct trade: a developer's session is disposable, and
 * an unguessable secret is worth more than a session that survives a restart.
 */
function resolveJwtSecret(): string {
  const configured = (process.env.JWT_SECRET || '').trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') return '';
  return crypto.randomBytes(32).toString('hex');
}

export const JWT_SECRET = resolveJwtSecret();

/**
 * Fails the process at boot rather than at the first login attempt.
 *
 * A production server with no signing secret would otherwise start, serve the
 * public pages, and only reveal itself when someone tried to sign in. Signing
 * every token with a guessable value is not a degraded mode, it is no auth at
 * all, so this stops the server instead.
 */
export function assertAuthConfigured(): void {
  if (JWT_SECRET) return;
  throw new Error(
    'JWT_SECRET is not set. Session tokens cannot be signed safely without it. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))" ' +
      'and put it in the environment. Refusing to start.'
  );
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
      userId?: string;
      /** Present once `requirePermission`/`requireAdmin` has resolved authority. */
      authority?: ResolvedAuthority;
    }
  }
}

export function signAccessToken(user: { id: string; role: string }): string {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: ACCESS_TTL });
}

export function hashRefresh(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function safeUser(u: User) {
  const rawId = u.id || 'GUEST';
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    xp: u.xp || 0,
    streak: u.streak || 0,
    college: u.college || null,
    badge: u.badge || null,
    avatar: u.avatar || null,
    license_id: u.license_id || `LIC-${rawId.slice(-6).toUpperCase()}`,
    roll_no: u.roll_no || `ROLL-${rawId.slice(-6).toUpperCase()}`,
    created_at: u.created_at,
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!JWT_SECRET) return res.status(500).json({ error: 'Server not configured for auth' });

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; role: string };
    const db = loadDb();
    const user = (db.users || []).find((u: User) => u.id === payload.sub);
    if (!user || user.disabled) return res.status(401).json({ error: 'Account not found or disabled' });
    req.user = user;
    req.userId = user.id;
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired — sign in again' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    // Resolve the fine-grained authority while the user is already loaded. Every
    // permission check needs it, and `requireAuth` reads the whole ledger on each
    // request anyway, so this costs nothing extra.
    req.authority = resolveAuthority(req.user, loadDb().staff || []);
    next();
  });
}

/**
 * Requires one exact permission, on top of the admin gate.
 *
 * The permission is validated at module load rather than per request: a typo in a
 * route mount is a programming error, and failing at boot names it. A permission
 * check that silently returns 403 forever because of a misspelling is the worst
 * version of this feature — it looks like a permissions problem and gets debugged
 * as one.
 */
export function requirePermission(permission: string) {
  assertKnownPermission(permission);
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authority) return res.status(403).json({ error: 'Admin access required' });
    if (!can(req.authority, permission)) return denied(res, permission);
    next();
  };
}

/** Requires any one of several permissions — "may publish OR may send". */
export function requireAnyPermission(permissions: string[]) {
  for (const p of permissions) assertKnownPermission(p);
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authority) return res.status(403).json({ error: 'Admin access required' });
    if (permissions.some((p) => can(req.authority as ResolvedAuthority, p))) return next();
    return denied(res, permissions.join(' | '));
  };
}

/**
 * Allows the owner of the resource, or anyone holding the permission.
 *
 * The self-check is on `req.userId` matching the route param, never on a
 * user-supplied body field — otherwise a caller names the victim in the payload
 * and passes the ownership test.
 */
export function requireSelfOrPermission(permission: string, param = 'id') {
  assertKnownPermission(permission);
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authority) return res.status(403).json({ error: 'Admin access required' });
    if (req.userId && req.params[param] && req.params[param] === req.userId) return next();
    if (!can(req.authority, permission)) return denied(res, permission);
    next();
  };
}

/**
 * Gates the actions whose blast radius is every user at once.
 *
 * Beyond the permission, this enforces a cooldown keyed on the action, so an
 * operator who sends a broadcast to everyone by accident cannot immediately send a
 * second one while working out what happened. It is deliberately *not* a two-person
 * approval: that needs a pending-approval queue and a second identity to be worth
 * anything, and until there is more than one admin it is ceremony. The typed
 * confirmation belongs in the UI, where the human actually is.
 */
const DANGER_COOLDOWN_MS = 60_000;
const lastDangerUse: Record<string, number> = {};

export function requireDanger(permission: string, action: string) {
  assertKnownPermission(permission);
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authority) return res.status(403).json({ error: 'Admin access required' });
    if (!can(req.authority, permission)) return denied(res, permission);

    const now = Date.now();
    const last = lastDangerUse[action] || 0;
    if (now - last < DANGER_COOLDOWN_MS) {
      const waitS = Math.ceil((DANGER_COOLDOWN_MS - (now - last)) / 1000);
      return res.status(429).json({
        error: `Too soon after the last "${action}". Wait ${waitS}s and confirm again.`,
        cooldown_seconds: waitS,
      });
    }
    lastDangerUse[action] = now;
    next();
  };
}

/** Exposed for the cooldown reset in tests, which would otherwise be order-dependent. */
export function __resetDangerCooldown(): void {
  for (const k of Object.keys(lastDangerUse)) delete lastDangerUse[k];
}

function assertKnownPermission(permission: string): void {
  if (isPermission(permission)) return;
  const known = Object.values(PERMISSION_GROUPS).flat().join(', ');
  throw new Error(
    `Unknown permission "${permission}" used in a route guard. It would deny every request ` +
      `forever and look like a permissions problem. Known permissions: ${known}`
  );
}

/**
 * The 403 body names the missing permission.
 *
 * An admin hitting a locked surface needs to know *which* grant to ask for, and
 * the permission catalogue is not a secret — it is a list of buttons in the app
 * they are already logged into. Returning a bare "forbidden" turns a five-second
 * fix into a support ticket.
 */
function denied(res: Response, permission: string) {
  return res.status(403).json({
    error: 'You do not have permission to do that',
    required_permission: permission,
  });
}

// Best-effort auth: populate req.user when a valid token is present; otherwise continue as guest
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || !JWT_SECRET) return next();
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; role: string };
    const db = loadDb();
    const user = (db.users || []).find((u: User) => u.id === payload.sub);
    if (user && !user.disabled) {
      req.user = user;
      req.userId = user.id;
    }
  } catch { /* ignore — stay guest */ }
  next();
}

// In-memory rate limiter (per ip+key). Swap for Redis store at scale.
const rateBuckets: Record<string, { count: number; resetAt: number }> = {};
export function rateLimit(perMinute: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}:${(req.body?.email || req.path || '').toString().toLowerCase()}`;
    const now = Date.now();
    const bucket = rateBuckets[key];
    if (!bucket || bucket.resetAt < now) {
      rateBuckets[key] = { count: 1, resetAt: now + 60_000 };
      return next();
    }
    bucket.count += 1;
    if (bucket.count > perMinute) return res.status(429).json({ error: 'Too many attempts — please wait a minute and try again.' });
    next();
  };
}