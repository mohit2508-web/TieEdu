import { Request, Response, NextFunction } from 'express';
import { requireAuth } from './auth';
import {
  loadPlacementGrants,
  listPlacementColleges,
  buildPlacementAuthority,
  PlacementAuthority,
} from '../placement/access';
import {
  assertKnownPlacementPermission,
  placementCan,
} from '../placement/permissions';

/**
 * Campus TPO portal guards.
 *
 * Deliberately a NEW file: `middleware/auth.ts` belongs to the existing
 * product and its guards all mean "session" or "admin". Placement needs a
 * third thing — "session AND an active placement grant" — and bolting that
 * onto requireAdmin would hand TPO staff the content/commerce console, while
 * bolting it onto requireAuth would hand every student the TPO portal.
 *
 * PG outage honesty: every failure to reach the database answers 503 with a
 * plain message. The placement module has no JSON fallback, and a 403 there
 * would read as "you lost access" when the real cause is infrastructure.
 */

declare global {
  namespace Express {
    interface Request {
      /** Populated by `requirePlacementAuth`. */
      placement?: PlacementAuthority;
    }
  }
}

const PG_UNAVAILABLE = {
  status: 503,
  body: {
    error: 'Placement data store unavailable (PostgreSQL) — the Campus TPO portal cannot serve requests right now',
  },
};

const isConnectionFailure = (err: any): boolean => {
  const code = err?.code || '';
  const message = String(err?.message || '');
  // ECONNREFUSED/ENOTFOUND style codes + pool timeout messages.
  return (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'ETIMEDOUT' ||
    code === '57P03' || // cannot_connect_now
    message.includes('Connection') ||
    message.includes('timeout') ||
    message.includes('DATABASE_URL')
  );
};

/**
 * Coarse gate: valid session + at least one active placement grant.
 *
 * Does NOT require a resolved college — `/api/placement/me` must work for a
 * super admin before they have picked one. Data routes layer
 * `requirePlacementScope` on top.
 */
export function requirePlacementAuth(req: Request, res: Response, next: NextFunction) {
  // Reuse the session gate rather than reimplementing token verification —
  // one place decides what "signed in" means.
  const proceed = async () => {
    if (!req.user) return; // requireAuth already answered
    try {
      const grants = await loadPlacementGrants(req.user.id);
      if (grants.length === 0) {
        return res.status(403).json({ error: 'Campus TPO portal access required' });
      }

      const collegeIds = grants.some((g) => !g.college_id)
        ? null // super admin — every college
        : (grants.map((g) => g.college_id).filter(Boolean) as string[]);
      const colleges = await listPlacementColleges({ collegeIds });

      const headerCollege = req.header('x-college-id') || req.query?.college || null;
      const { authority, error, status } = buildPlacementAuthority(
        req.user.id,
        grants,
        colleges,
        typeof headerCollege === 'string' ? headerCollege : null
      );
      if (!authority || error) {
        return res.status(status).json({ error });
      }
      req.placement = authority;
      next();
    } catch (err: any) {
      if (isConnectionFailure(err)) return res.status(PG_UNAVAILABLE.status).json(PG_UNAVAILABLE.body);
      console.error('❌ [Placement] authority resolution failed:', err?.stack || err?.message);
      return res.status(500).json({ error: 'Could not resolve placement access' });
    }
  };

  // requireAuth either rejects (401/403 written) or populates req.user, so the
  // async continuation is safe either way — headers may already be sent, which
  // is why `proceed` never writes when req.user is missing.
  requireAuth(req, res, () => {
    void proceed();
  });
}

/**
 * Fine gate: a resolved college + one exact permission.
 *
 * A missing college is a 400 naming the header, not a 403 — the user IS
 * authenticated and has access; the request is just incomplete.
 */
export function requirePlacementScope(permission: string) {
  assertKnownPlacementPermission(permission);
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = req.placement;
    if (!auth) return res.status(403).json({ error: 'Campus TPO portal access required' });
    if (!auth.collegeId) {
      return res.status(400).json({
        error: 'No college selected — send the x-college-id header',
        colleges: auth.colleges.map((c) => ({ college_id: c.college_id, name: c.name })),
      });
    }
    if (!placementCan(auth, permission)) {
      return res.status(403).json({
        error: 'You do not have permission to do that',
        required_permission: permission,
      });
    }
    next();
  };
}

/** Readable helper for route bodies that need the guard + permission inline. */
export const placementDenied = (res: Response, permission: string) =>
  res.status(403).json({
    error: 'You do not have permission to do that',
    required_permission: permission,
  });
