import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { loadDb, User } from '../data/db';

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
    next();
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