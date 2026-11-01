import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { loadDb, saveDb, User, Session } from '../data/db';
import {
  requireAuth, requireAdmin, signAccessToken, safeUser, hashRefresh,
  COOKIE_NAME, REFRESH_TTL_DAYS,
} from '../middleware/auth';
import { rateLimit } from '../middleware/auth';
import { OAuth2Client } from 'google-auth-library';
import { consumeAccountToken, issueAccountToken, sendPasswordResetEmail, sendVerifyEmail } from '../lib/accountTokens';

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
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
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
  const verifyToken = issueAccountToken(db, user.id, 'verify');
  saveDb(db);
  void sendVerifyEmail(user.email, user.name, verifyToken);

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
  if (user && !user.password_hash) {
    return res.status(401).json({ error: 'This account uses Continue with Google. Sign in with Google, or use "Forgot password" to set a password.' });
  }
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
  // No cookie at all is the ordinary anonymous visit, not a failure: answering
  // 401 put a red network error in every visitor's console. The client reads
  // "no accessToken" as signed out either way. A bad cookie below stays a 401.
  if (!token) return res.status(200).json({ session: null });

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

  if (!user.password_hash) {
    return res.status(400).json({ error: 'Your account has no password yet. Use "Forgot password" on the sign-in page to set one.' });
  }
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
// ---------------------------------------------------------------------------
// Account recovery & verification (PROFESSIONAL_PLATFORM_PLAN §1.2)
// ---------------------------------------------------------------------------

// POST /api/auth/forgot { email } — always the same answer, so the endpoint
// cannot be used to find out who has an account.
authRouter.post('/forgot', rateLimit(5), (req: Request, res: Response) => {
  const email = (req.body.email || '').toString().trim().toLowerCase();
  const generic = { status: 'success', message: 'If that email has an account, a reset link is on its way. It expires in 30 minutes.' };
  if (!EMAIL_RE.test(email)) return res.json(generic);
  const db = loadDb();
  const user = (db.users || []).find((u: User) => u.email === email);
  if (user && !user.disabled) {
    const token = issueAccountToken(db, user.id, 'reset');
    saveDb(db);
    void sendPasswordResetEmail(user.email, user.name, token);
  }
  return res.json(generic);
});

// POST /api/auth/reset { token, password } — sets the password, signs out
// every device, then signs this one in.
authRouter.post('/reset', rateLimit(10), (req: Request, res: Response) => {
  const password = (req.body.password || '').toString();
  if (password.length < 8) return res.status(400).json({ error: 'Use at least 8 characters for your new password.' });
  const db = loadDb();
  const userId = consumeAccountToken(db, (req.body.token || '').toString(), 'reset');
  const user = userId ? (db.users || []).find((u: User) => u.id === userId) : null;
  if (!user || user.disabled) {
    saveDb(db);
    return res.status(400).json({ error: 'This reset link is invalid or has expired. Ask for a new one.' });
  }
  user.password_hash = bcrypt.hashSync(password, 12);
  user.email_verified = true; // they just proved they read this inbox
  db.sessions = (db.sessions || []).filter((s: Session) => s.user_id !== user.id);
  saveDb(db);
  const refreshToken = issueSession(user.id);
  setRefreshCookie(res, refreshToken);
  return res.json({ status: 'success', user: safeUser(user), accessToken: signAccessToken(user) });
});

// POST /api/auth/verify-email { token }
authRouter.post('/verify-email', rateLimit(20), (req: Request, res: Response) => {
  const db = loadDb();
  const userId = consumeAccountToken(db, (req.body.token || '').toString(), 'verify');
  const user = userId ? (db.users || []).find((u: User) => u.id === userId) : null;
  if (!user) return res.status(400).json({ error: 'This confirmation link is invalid or has expired. Sign in and ask for a new one.' });
  user.email_verified = true;
  saveDb(db);
  return res.json({ status: 'success', email: user.email });
});

// POST /api/auth/resend-verification (signed in)
authRouter.post('/resend-verification', requireAuth, rateLimit(3), (req: Request, res: Response) => {
  const db = loadDb();
  const user = (db.users || []).find((u: User) => u.id === req.user!.id);
  if (!user) return res.status(404).json({ error: 'Account not found' });
  if (user.email_verified) return res.json({ status: 'success', already: true });
  const token = issueAccountToken(db, user.id, 'verify');
  saveDb(db);
  void sendVerifyEmail(user.email, user.name, token);
  return res.json({ status: 'success' });
});

// ---------------------------------------------------------------------------
// Continue with Google (Google Identity Services ID token)
// ---------------------------------------------------------------------------

const GOOGLE_CLIENT_ID = () => (process.env.GOOGLE_CLIENT_ID || '').trim();
let googleClient: OAuth2Client | null = null;

// GET /api/auth/google/config — whether the button should render at all.
authRouter.get('/google/config', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.json({ enabled: !!GOOGLE_CLIENT_ID(), client_id: GOOGLE_CLIENT_ID() || null });
});

// POST /api/auth/google { credential } — verify Google's signed ID token, then
// sign in the matching account, link it, or create one.
authRouter.post('/google', rateLimit(10), async (req: Request, res: Response) => {
  const clientId = GOOGLE_CLIENT_ID();
  if (!clientId) return res.status(503).json({ error: 'Google sign-in is not set up yet.' });
  const credential = (req.body.credential || '').toString();
  if (!credential) return res.status(400).json({ error: 'Missing Google credential.' });

  let payload: any;
  try {
    googleClient = googleClient || new OAuth2Client(clientId);
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: clientId });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: 'Google could not confirm this sign-in. Please try again.' });
  }
  const email = String(payload?.email || '').toLowerCase();
  if (!payload?.sub || !email || payload.email_verified !== true) {
    return res.status(401).json({ error: 'Your Google account email is not verified.' });
  }

  const db = loadDb();
  db.users = db.users || [];
  let user: User | undefined =
    db.users.find((u: User) => u.google_sub === payload.sub) || db.users.find((u: User) => u.email === email);
  let created = false;
  const picture = typeof payload.picture === 'string' && payload.picture.startsWith('https://') ? payload.picture : undefined;
  if (user) {
    if (user.disabled) return res.status(403).json({ error: 'Account disabled — contact support' });
    // Google has verified the address, so linking it to the existing account is safe.
    user.google_sub = user.google_sub || payload.sub;
    user.email_verified = true;
    if (!user.avatar && picture) user.avatar = picture;
  } else {
    created = true;
    user = {
      id: `user-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      name: String(payload.name || email.split('@')[0]).slice(0, 60),
      email,
      password_hash: '',
      role: 'user',
      xp: 0,
      streak: 0,
      email_verified: true,
      google_sub: payload.sub,
      avatar: picture,
      created_at: new Date().toISOString(),
    };
    db.users.push(user);
  }
  saveDb(db);

  const signedIn = user;
  const refreshToken = issueSession(signedIn.id);
  setRefreshCookie(res, refreshToken);
  const unlocks = (db.unlocks || []).filter((u: any) => u.user_id === signedIn.id && u.status === 'active').map((u: any) => u.company_id);
  return res.status(created ? 201 : 200).json({ status: 'success', created, user: safeUser(signedIn), accessToken: signAccessToken(signedIn), unlocked_company_ids: unlocks });
});
