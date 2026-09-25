import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { loadDb, saveDb, User, Session } from '../data/db';
import {
  requireAuth, requireAdmin, signAccessToken, safeUser, hashRefresh,
  COOKIE_NAME, REFRESH_TTL_DAYS,
} from '../middleware/auth';
import { rateLimit } from '../middleware/auth';

export const authRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setRefreshCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

function issueSession(userId: string) {
  const db = loadDb();
  const refreshToken = crypto.randomBytes(48).toString('base64url');
  const session: Session = {
    id: `sess-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    user_id: userId,
    token_hash: hashRefresh(refreshToken),
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  };
  if (!db.sessions) db.sessions = [];
  db.sessions.push(session);
  saveDb(db);
  return refreshToken;
}

function destroySession(refreshToken: string | undefined) {
  if (!refreshToken) return;
  const db = loadDb();
  const hash = hashRefresh(refreshToken);
  db.sessions = (db.sessions || []).filter((s: Session) => s.token_hash !== hash);
  saveDb(db);
}

// POST /api/auth/signup
authRouter.post('/signup', rateLimit(10), (req: Request, res: Response) => {
  const db = loadDb();
  const name = (req.body.name || '').toString().trim();
  const email = (req.body.email || '').toString().trim().toLowerCase();
  const password = (req.body.password || '').toString();
  const college = (req.body.college || '').toString().trim() || undefined;

  if (name.length < 2) return res.status(400).json({ error: 'Please enter a name (min 2 characters)' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if ((db.users || []).some((u: User) => u.email === email)) {
    return res.status(409).json({ error: 'This email is already registered — please sign in' });
  }

  const user: User = {
    id: `user-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    name,
    email,
    password_hash: bcrypt.hashSync(password, 12),
    role: 'user',
    xp: 0,
    streak: 0,
    college,
    created_at: new Date().toISOString(),
  };

  db.users = db.users || [];
  db.users.push(user);
  saveDb(db);

  const refreshToken = issueSession(user.id);
  setRefreshCookie(res, refreshToken);
  return res.status(201).json({ status: 'success', user: safeUser(user), accessToken: signAccessToken(user) });
});

// POST /api/auth/login (same engine for user + admin portal)
authRouter.post('/login', rateLimit(10), (req: Request, res: Response) => {
  const db = loadDb();
  const email = (req.body.email || '').toString().trim().toLowerCase();
  const password = (req.body.password || '').toString();

  const user = (db.users || []).find((u: User) => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Incorrect email or password' });
  }
  if (user.disabled) return res.status(403).json({ error: 'Account disabled — contact support' });

  const refreshToken = issueSession(user.id);
  setRefreshCookie(res, refreshToken);
  const unlocks = (db.unlocks || []).filter((u: any) => u.user_id === user.id && u.status === 'active').map((u: any) => u.company_id);
  return res.json({ status: 'success', user: safeUser(user), accessToken: signAccessToken(user), unlocked_company_ids: unlocks });
});

// GET /api/auth/me — profile + unlocks + orders summary
authRouter.get('/me', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const user = req.user!;
  const unlocks = (db.unlocks || []).filter((u: any) => u.user_id === user.id && u.status === 'active').map((u: any) => u.company_id);
  const orders = (db.orders || []).filter((o: any) => o.user_id === user.id).map((o: any) => ({
    id: o.id, amount: o.amount_paisa ? o.amount_paisa / 100 : null, status: o.status,
    coupon_code: o.coupon_code || null, created_at: o.created_at, items: (o.items || []).map((it: any) => ({ name: it.name, kind: it.kind })),
  }));
  return res.json({ user: safeUser(user), unlocked_company_ids: unlocks, orders });
});

// PUT /api/auth/profile — update name / college / avatar (in-house base64 avatar, no cloud storage)
authRouter.put('/profile', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const user = (db.users || []).find((u: User) => u.id === req.user!.id);
  if (!user) return res.status(401).json({ error: 'Account not found' });

  const name = (req.body.name || '').toString().trim();
  const college = (req.body.college || '').toString().trim();
  const avatar = req.body.avatar;

  if (name && (name.length < 2 || name.length > 60)) {
    return res.status(400).json({ error: 'Name should be 2-60 characters.' });
  }

  if (avatar !== undefined) {
    if (avatar === null || avatar === '') {
      user.avatar = undefined;
    } else if (typeof avatar === 'string' && /^data:image\/(png|jpeg|jpg|webp|gif);base64,/.test(avatar)) {
      const sizeBytes = Math.round(((avatar.length - avatar.indexOf(',') - 1) * 3) / 4);
      if (sizeBytes > 500 * 1024) return res.status(400).json({ error: 'Avatar image is too large (max 500 KB).' });
      user.avatar = avatar;
    } else {
      return res.status(400).json({ error: 'Invalid image — use PNG, JPEG, WebP or GIF.' });
    }
  }

  if (name) user.name = name;
  if (college) user.college = college;

  saveDb(db);
  return res.json({ status: 'success', user: safeUser(user) });
});

// POST /api/auth/refresh — rotate refresh token, mint new access token
authRouter.post('/refresh', (req: Request, res: Response) => {
  const db = loadDb();
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'No session' });

  const hash = hashRefresh(token);
  const session = (db.sessions || []).find((s: Session) => s.token_hash === hash);
  if (!session) {
    res.clearCookie(COOKIE_NAME);
    return res.status(401).json({ error: 'Session expired' });
  }
  if (new Date(session.expires_at).getTime() < Date.now()) {
    destroySession(token);
    res.clearCookie(COOKIE_NAME);
    return res.status(401).json({ error: 'Session expired' });
  }

  const user = (db.users || []).find((u: User) => u.id === session.user_id);
  if (!user || user.disabled) {
    destroySession(token);
    res.clearCookie(COOKIE_NAME);
    return res.status(401).json({ error: 'Account unavailable' });
  }

  // Rotate: revoke old token, mint new
  destroySession(token);
  const newRefresh = issueSession(user.id);
  setRefreshCookie(res, newRefresh);
  return res.json({ accessToken: signAccessToken(user), user: safeUser(user) });
});

// POST /api/auth/logout
authRouter.post('/logout', (req: Request, res: Response) => {
  destroySession(req.cookies?.[COOKIE_NAME]);
  res.clearCookie(COOKIE_NAME);
  return res.json({ status: 'success' });
});

// POST /api/auth/change-password
authRouter.post('/change-password', requireAuth, (req: Request, res: Response) => {
  const db = loadDb();
  const user = req.user!;
  const current = (req.body.current_password || '').toString();
  const next = (req.body.new_password || '').toString();

  if (!bcrypt.compareSync(current, user.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }
  if (next.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

  const idx = db.users.findIndex((u: User) => u.id === user.id);
  db.users[idx].password_hash = bcrypt.hashSync(next, 12);
  // Revoke all other sessions (password change = security event)
  db.sessions = (db.sessions || []).filter((s: Session) => s.user_id !== user.id);
  saveDb(db);
  return res.json({ status: 'success', message: 'Password updated — please sign in again' });
});

// GET /api/auth/admin-status — public: whether admin account exists (for setup UX)
authRouter.get('/admin-status', (req: Request, res: Response) => {
  const db = loadDb();
  const admin = (db.users || []).find((u: User) => u.role === 'admin' && !u.disabled);
  return res.json({ configured: !!admin });
});

// GET /api/auth/verify-admin — protected sanity check used by admin portal boot
authRouter.get('/verify-admin', requireAdmin, (req: Request, res: Response) => {
  return res.json({ status: 'ok', user: safeUser(req.user!) });
});