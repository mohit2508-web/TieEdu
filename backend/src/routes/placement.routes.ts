import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { loadDb, saveDb, User, Session } from '../data/db';
import { requireAuth, signAccessToken, safeUser, hashRefresh, COOKIE_NAME, REFRESH_TTL_DAYS, rateLimit } from '../middleware/auth';
import { requirePlacementAuth, requirePlacementScope } from '../middleware/placementAuth';
import {
  invalidatePlacementCache,
  loadPlacementGrants,
  writePlacementAudit,
} from '../placement/access';
import { isPlacementRole, PLACEMENT_ROLE_LABELS, PlacementRole } from '../placement/permissions';
import { getPool } from '../db/client';
import { driveAdminRouter } from './driveAdmin.routes';

export const placementRouter = Router();

// ---------------------------------------------------------------------------
// Mock Drives — re-uses the admin drive router but scoped by the TPO caller's
// selected college. Reads need `placement.drives.read`; every mutation needs
// `placement.drives.write`. Drive rows belonging to another college are
// invisible (loadScopedDrive refuses them), even for a cross-college grant.
// ---------------------------------------------------------------------------
const scopedDriveRead = requirePlacementScope('placement.drives.read');
const scopedDriveWrite = requirePlacementScope('placement.drives.write');
placementRouter.get('/drives', scopedDriveRead, driveAdminRouter);
placementRouter.get('/drives/*', scopedDriveRead, driveAdminRouter);
placementRouter.post('/drives', scopedDriveWrite, driveAdminRouter);
placementRouter.post('/drives/*', scopedDriveWrite, driveAdminRouter);
placementRouter.patch('/drives/*', scopedDriveWrite, driveAdminRouter);
placementRouter.delete('/drives/*', scopedDriveWrite, driveAdminRouter);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVITE_TTL_DAYS = 7;

// ---------------------------------------------------------------------------
// Session helpers — the same contract as auth.routes.ts (rotating refresh
// token stored as a SHA-256 hash, httpOnly cookie, 15-min bearer access token).
// Duplicated rather than imported because auth.routes.ts keeps them module-
// private; a shared `lib/session.ts` refactor is a change to the existing
// portal and is explicitly not part of this module.
// ---------------------------------------------------------------------------
function setRefreshCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

function issueSession(userId: string): string {
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

const pgUnavailable = (res: Response) =>
  res.status(503).json({
    error: 'Placement data store unavailable (PostgreSQL) — please try again shortly',
  });

const isConnectionFailure = (err: any): boolean => {
  const code = err?.code || '';
  const message = String(err?.message || '');
  return (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'ETIMEDOUT' ||
    message.includes('Connection') ||
    message.includes('timeout') ||
    message.includes('DATABASE_URL')
  );
};

// ---------------------------------------------------------------------------
// GET /api/placement/me — the TPO portal boot endpoint.
//
// The frontend calls this exactly the way the admin console calls
// /auth/verify-admin: on entry, to answer "does this account have placement
// access, in which colleges, as what role". Placement permissions are resolved
// here from the live grant rows rather than trusted from the JWT, so a revoked
// grant takes effect without waiting for token expiry.
// ---------------------------------------------------------------------------
placementRouter.get('/me', requirePlacementAuth, async (req: Request, res: Response) => {
  try {
    const auth = req.placement!;
    return res.json({
      status: 'ok',
      user: safeUser(req.user!),
      grants: auth.grants.map((g) => ({
        access_id: g.access_id,
        college_id: g.college_id,
        role: g.role,
        role_label: PLACEMENT_ROLE_LABELS[g.role] || g.role,
        scopes: g.scopes,
      })),
      colleges: auth.colleges,
      active_college_id: auth.collegeId,
      permissions: auth.collegeId ? [...auth.permissions] : [],
    });
  } catch (err: any) {
    if (isConnectionFailure(err)) return pgUnavailable(res);
    throw err;
  }
});

// ---------------------------------------------------------------------------
// Invites — public, rate-limited. The token is the capability; nothing about
// the invite is secret except the token itself, so the info endpoint only
// reveals what the invitee already knows from their email (their address, the
// college, the role) plus whether an account exists — which decides whether
// the UI offers "sign in to accept" or "create your account".
// ---------------------------------------------------------------------------

async function loadInvite(token: string) {
  const r = await getPool().query(`SELECT * FROM placement_invite WHERE token = $1`, [token]);
  return r.rows?.[0] || null;
}

placementRouter.post('/invites/:token/info', rateLimit(20), async (req: Request, res: Response) => {
  try {
    const invite = await loadInvite(req.params.token);
    if (!invite) return res.status(404).json({ error: 'This invite link is not valid' });
    if (invite.used_at) return res.status(410).json({ error: 'This invite has already been used' });
    if (new Date(invite.expires_at).getTime() < Date.now()) {
      return res.status(410).json({ error: 'This invite has expired — ask for a new one' });
    }

    const db = loadDb();
    const accountExists = (db.users || []).some(
      (u: User) => u.email === invite.email && !u.disabled
    );
    const college = await getPool().query(`SELECT name, slug FROM placement_college WHERE college_id = $1`, [
      invite.college_id,
    ]);

    return res.json({
      email: invite.email,
      role: invite.placement_role,
      role_label: PLACEMENT_ROLE_LABELS[invite.placement_role as PlacementRole] || invite.placement_role,
      college: college.rows?.[0]?.name || 'Unknown college',
      account_exists: accountExists,
      expires_at: invite.expires_at,
    });
  } catch (err: any) {
    if (isConnectionFailure(err)) return pgUnavailable(res);
    throw err;
  }
});

/**
 * POST /api/placement/invites/:token/accept
 *
 * Two branches, deliberately:
 *  - Account already exists → the caller must be SIGNED IN as the invited
 *    email. We never accept an invite by password-over-post for an existing
 *    account, because that would let anyone holding the link take over by
 *    "accepting" into their own session.
 *  - No account → create it here (name + password, same 6-char floor and
 *    bcrypt-12 as signup) and sign the new user in, so the invitee lands in
 *    the portal with no second step.
 */
placementRouter.post('/invites/:token/accept', rateLimit(10), async (req: Request, res: Response) => {
  try {
    const invite = await loadInvite(req.params.token);
    if (!invite) return res.status(404).json({ error: 'This invite link is not valid' });
    if (invite.used_at) return res.status(410).json({ error: 'This invite has already been used' });
    if (new Date(invite.expires_at).getTime() < Date.now()) {
      return res.status(410).json({ error: 'This invite has expired — ask for a new one' });
    }
    if (!isPlacementRole(invite.placement_role)) {
      return res.status(400).json({ error: 'This invite names an unknown role' });
    }

    const db = loadDb();
    const existing = (db.users || []).find((u: User) => u.email === invite.email);

    let user = existing;
    if (existing) {
      // Signed in as exactly the invited account?
      const header = req.headers.authorization || '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : null;
      if (!token) {
        return res.status(401).json({
          error: `Sign in as ${invite.email} first, then open this invite link again`,
          sign_in_required: true,
        });
      }
      const { JWT_SECRET } = await import('../middleware/auth');
      let payloadSub: string | null = null;
      try {
        const jwt = (await import('jsonwebtoken')).default;
        payloadSub = (jwt.verify(token, JWT_SECRET) as { sub: string }).sub;
      } catch {
        return res.status(401).json({ error: 'Session expired — sign in again' });
      }
      if (payloadSub !== existing.id || existing.disabled) {
        return res.status(403).json({ error: `This invite is for ${invite.email}` });
      }
    } else {
      const name = (req.body.name || '').toString().trim();
      const password = (req.body.password || '').toString();
      if (name.length < 2) return res.status(400).json({ error: 'Please enter a name (min 2 characters)' });
      if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

      user = {
        id: `user-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        name,
        email: invite.email,
        password_hash: bcrypt.hashSync(password, 12),
        role: 'user',
        xp: 0,
        streak: 0,
        created_at: new Date().toISOString(),
      };
      db.users = db.users || [];
      db.users.push(user);
      saveDb(db);
    }

    // One active grant per (user, college): re-accepting a fresh invite for
    // the same pair refreshes the role instead of violating the unique index.
    const existingGrant = await getPool().query(
      `SELECT access_id, placement_role FROM placement_access
        WHERE user_id = $1 AND college_id = $2`,
      [user!.id, invite.college_id]
    );

    if (existingGrant.rows?.length) {
      await getPool().query(
        `UPDATE placement_access
            SET placement_role = $1, scopes = $2, status = 'active',
                invited_by = $3, accepted_at = NOW(), updated_at = NOW()
          WHERE access_id = $4`,
        [invite.placement_role, invite.scopes, invite.invited_by, existingGrant.rows[0].access_id]
      );
      await writePlacementAudit({
        college_id: invite.college_id,
        table_name: 'placement_access',
        record_id: existingGrant.rows[0].access_id,
        field: 'placement_role',
        old_value: existingGrant.rows[0].placement_role,
        new_value: invite.placement_role,
        changed_by: user!.id,
        reason: 'invite re-accepted',
      });
    } else {
      await getPool().query(
        `INSERT INTO placement_access
           (user_id, college_id, email, name, placement_role, scopes, status, invited_by, invited_at, accepted_at)
         VALUES ($1,$2,$3,$4,$5,$6,'active',$7,NOW(),NOW())`,
        [
          user!.id,
          invite.college_id,
          invite.email,
          user!.name || '',
          invite.placement_role,
          invite.scopes,
          invite.invited_by,
        ]
      );
      await writePlacementAudit({
        college_id: invite.college_id,
        table_name: 'placement_access',
        record_id: `${user!.id}:${invite.college_id}`,
        field: 'status',
        old_value: null,
        new_value: 'active',
        changed_by: user!.id,
        reason: `invite accepted (${invite.placement_role})`,
      });
    }

    await getPool().query(`UPDATE placement_invite SET used_at = NOW(), used_user_id = $1 WHERE token = $2`, [
      user!.id,
      req.params.token,
    ]);
    invalidatePlacementCache(user!.id);

    const refreshToken = issueSession(user!.id);
    setRefreshCookie(res, refreshToken);
    return res.json({
      status: 'success',
      user: safeUser(user!),
      accessToken: signAccessToken(user!),
      college_id: invite.college_id,
    });
  } catch (err: any) {
    if (isConnectionFailure(err)) return pgUnavailable(res);
    throw err;
  }
});

// ---------------------------------------------------------------------------
// Student-scope stub: a logged-in user asks whether THEY have a placement
// link (roll_no match or explicit grant). The real student screens (drives,
// offers, readiness) build on this in P1 — it exists now so the student app
// can feature-gate the Placement section on truth instead of a guess.
// ---------------------------------------------------------------------------
placementRouter.get('/student/link', requireAuth, async (req: Request, res: Response) => {
  try {
    const grants = await loadPlacementGrants(req.user!.id);
    if (grants.length > 0) {
      return res.json({ linked: true, via: 'grant', college_ids: grants.map((g) => g.college_id).filter(Boolean) });
    }

    const rollNo = req.user!.roll_no || '';
    const db = loadDb();
    const account = (db.users || []).find((u: User) => u.id === req.user!.id);
    const email = account?.email || '';

    const link = await getPool().query(
      `SELECT sl.college_id FROM placement_student_link sl
        WHERE sl.roll_no = $1
        LIMIT 5`,
      [rollNo]
    );
    if (link.rows?.length) {
      return res.json({ linked: true, via: 'roll_no', college_ids: link.rows.map((r: any) => r.college_id) });
    }
    if (email) {
      const byEmail = await getPool().query(
        `SELECT s.college_id FROM placement_student s
          WHERE lower(s.email) = lower($1) OR lower(s.email_personal) = lower($1)
          LIMIT 5`,
        [email]
      );
      if (byEmail.rows?.length) {
        return res.json({ linked: true, via: 'email', college_ids: byEmail.rows.map((r: any) => r.college_id) });
      }
    }
    return res.json({ linked: false });
  } catch (err: any) {
    if (isConnectionFailure(err)) return pgUnavailable(res);
    throw err;
  }
});
