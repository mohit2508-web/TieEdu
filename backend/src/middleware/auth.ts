import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { loadDb, User } from '../data/db';

export const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'tieedu-dev-secret-change-me');
export const ACCESS_TTL = process.env.ACCESS_TTL || '15m';
export const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TTL_DAYS || 30);
export const COOKIE_NAME = 'tieedu_refresh';

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