import { Request, Response, NextFunction } from 'express';
import { requireAuth } from './auth';
import {
  findMemberships,
  findSchoolById,
  isSchoolConnectionFailure,
  SCHOOL_PG_ERROR,
} from '../school/tenant';

/**
 * TieEdu Schools guards — a NEW file, same rule as placementAuth.ts: the
 * existing product guards mean "session" or "admin"; the school segment needs
 * "session AND a school membership".
 *
 * Tenant resolution is server-side only: the school id comes from the signed-in
 * user's membership rows, never from a client `x-school-id` header. A student
 * cannot change whose notices they see by editing a header, and a cross-tenant
 * query is structurally impossible at this layer.
 *
 * PG outage honesty: no JSON fallback, plain 503 on connection failure. A 403
 * would read as "you lost access" when the school data store is down.
 */

declare global {
  namespace Express {
    interface Request {
      /** Populated by `requireSchoolAuth`. */
      school?: { id: string; code: string; name: string };
      schoolMember?: {
        role: 'admin' | 'coordinator' | 'teacher' | 'student';
        class_level: string;
        section: string;
        roll_no: string | null;
      };
    }
  }
}

export function requireSchoolAuth(req: Request, res: Response, next: NextFunction) {
  const proceed = async () => {
    if (!req.user) return; // requireAuth already answered

    let memberships;
    try {
      memberships = await findMemberships(req.user.id);
    } catch (err: any) {
      if (isSchoolConnectionFailure(err)) {
        return res.status(503).json({ error: SCHOOL_PG_ERROR });
      }
      console.error('[School] membership resolution failed:', err?.stack || err?.message);
      return res.status(500).json({ error: 'Could not resolve school access' });
    }

    if (memberships.length === 0) {
      return res
        .status(403)
        .json({ error: 'This account is not linked to any school' });
    }

    const member = memberships[0]; // most recent active membership (S0: one school)
    try {
      const school = await findSchoolById(member.school_id);
      if (!school) return res.status(403).json({ error: 'Linked school not found' });

      req.school = { id: school.school_id, code: school.code, name: school.name };
      req.schoolMember = {
        role: member.role,
        class_level: member.class_level,
        section: member.section,
        roll_no: member.roll_no,
      };
      next();
    } catch (err: any) {
      if (isSchoolConnectionFailure(err)) {
        return res.status(503).json({ error: SCHOOL_PG_ERROR });
      }
      console.error('[School] tenant resolution failed:', err?.stack || err?.message);
      return res.status(500).json({ error: 'Could not resolve your school' });
    }
  };

  requireAuth(req, res, () => {
    void proceed();
  });
}