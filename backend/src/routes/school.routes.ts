import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { loadDb, saveDb, Session, User } from '../data/db';
import {
  signAccessToken,
  safeUser,
  hashRefresh,
  COOKIE_NAME,
  REFRESH_TTL_DAYS,
  rateLimit,
} from '../middleware/auth';
import { requireSchoolAuth } from '../middleware/schoolAuth';
import {
  findSchoolByCode,
  findSchoolById,
  findMemberByRollNo,
  findProgram,
  listNotices,
  listPrograms,
  loadProgressMap,
  recordProgress,
  isSchoolConnectionFailure,
  schoolPgUnavailable,
} from '../school/tenant';

export const schoolRouter = Router();

// ---------------------------------------------------------------------------
// Session helpers — the same contract as auth.routes.ts (rotating refresh
// token stored as a SHA-256 hash, httpOnly cookie, 15-min bearer access
// token). Duplicated rather than imported because auth.routes.ts keeps them
// module-private; a shared `lib/session.ts` refactor is a change to the
// existing portal and is explicitly not part of this module.
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
    id: `sess-school-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
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

function loadUserById(id: string): User | undefined {
  return (loadDb().users || []).find((u: User) => u.id === id && !u.disabled);
}

// ---------------------------------------------------------------------------
// Public: school lookup by code — the "Which school is this?" card.
// Reveals only the branding the student needs to self-check, nothing about
// members, roles or counts.
// ---------------------------------------------------------------------------
schoolRouter.get('/auth/school/:code', rateLimit(60), async (req: Request, res: Response) => {
  try {
    const code = (req.params.code || '').toString().trim().toUpperCase();
    const school = await findSchoolByCode(code);
    if (!school) return res.status(404).json({ error: 'School not found. Check the code and try again.' });
    return res.json({
      school: {
        id: school.school_id,
        code: school.code,
        name: school.name,
        short_name: school.short_name,
        city: school.city,
        board: school.board,
        motto: school.motto,
        theme_color: school.theme_color,
      },
    });
  } catch (err: any) {
    if (isSchoolConnectionFailure(err)) return schoolPgUnavailable(res);
    console.error('[School] lookup failed:', err?.stack || err?.message);
    return res.status(500).json({ error: 'Could not look up the school' });
  }
});

// ---------------------------------------------------------------------------
// Public: school login — roll number = username (unique per school).
//
// Errors are deliberately mapped one-by-one (school → member → password) so
// the UI can say "wrong password" without ever revealing whether an account
// exists: the DEMO school code is printed on the notice board at school, so
// finding a school is not the secret, but the roll-number check keeps the
// message honest while staying enumeration-safe enough for a kids portal.
// ---------------------------------------------------------------------------
schoolRouter.post('/auth/login', rateLimit(10), async (req: Request, res: Response) => {
  const schoolCode = (req.body.schoolCode || '').toString().trim().toUpperCase();
  const rollNo = (req.body.rollNo || '').toString().trim();
  const password = (req.body.password || '').toString();

  if (!schoolCode || !rollNo || !password) {
    return res.status(400).json({ error: 'School code, roll number and password are required' });
  }

  try {
    const school = await findSchoolByCode(schoolCode);
    if (!school) {
      return res.status(404).json({ error: 'School not found. Check the code and try again.' });
    }

    const member = await findMemberByRollNo(school.school_id, rollNo);
    if (!member) {
      return res.status(401).json({ error: 'No student found with this roll number' });
    }

    const user = loadUserById(member.user_id);
    if (!user) {
      return res.status(401).json({ error: 'This account is not active' });
    }

    const ok = await bcrypt.compare(password, user.password_hash || '');
    if (!ok) {
      return res.status(401).json({ error: 'Incorrect password. Ask your teacher if you forgot it.' });
    }

    const refreshToken = issueSession(user.id);
    setRefreshCookie(res, refreshToken);

    return res.json({
      status: 'ok',
      accessToken: signAccessToken({ id: user.id, role: user.role }),
      user: safeUser(user),
      school: { id: school.school_id, code: school.code, name: school.name },
      member: {
        role: member.role,
        class_level: member.class_level,
        section: member.section,
        roll_no: member.roll_no,
      },
    });
  } catch (err: any) {
    if (isSchoolConnectionFailure(err)) return schoolPgUnavailable(res);
    console.error('[School] login failed:', err?.stack || err?.message);
    return res.status(500).json({ error: 'Could not sign you in right now' });
  }
});

schoolRouter.post('/auth/logout', (req: Request, res: Response) => {
  destroySession(req.cookies?.[COOKIE_NAME]);
  res.clearCookie(COOKIE_NAME);
  return res.json({ status: 'success' });
});

// ---------------------------------------------------------------------------
// Protected: profile + home.
// ---------------------------------------------------------------------------
schoolRouter.get('/me', requireSchoolAuth, (req: Request, res: Response) => {
  return res.json({
    status: 'ok',
    user: safeUser(req.user!),
    school: req.school,
    member: req.schoolMember,
  });
});

schoolRouter.get('/home', requireSchoolAuth, async (req: Request, res: Response) => {
  try {
    const schoolId = req.school!.id;
    const userId = req.user!.id;

    const [school, programs, notices, progress] = await Promise.all([
      findSchoolById(schoolId),
      listPrograms(schoolId, req.schoolMember!.class_level),
      listNotices(schoolId, 30),
      loadProgressMap(schoolId, userId),
    ]);

    if (!school) return res.status(403).json({ error: 'Linked school not found' });

    const completedCount = Object.values(progress).reduce((n, refs) => n + refs.length, 0);

    return res.json({
      status: 'ok',
      school: {
        id: school.school_id,
        code: school.code,
        name: school.name,
        short_name: school.short_name,
        city: school.city,
        board: school.board,
        motto: school.motto,
        theme_color: school.theme_color,
        session: school.session,
      },
      member: req.schoolMember,
      student: {
        id: req.user!.id,
        name: req.user!.name,
        xp: req.user!.xp || 0,
        streak: req.user!.streak || 0,
        avatar: req.user!.avatar || null,
      },
      progress: {
        completed_count: completedCount,
        by_program: progress,
      },
      programs,
      notices,
    });
  } catch (err: any) {
    if (isSchoolConnectionFailure(err)) return schoolPgUnavailable(res);
    console.error('[School] home failed:', err?.stack || err?.message);
    return res.status(500).json({ error: 'Could not load your school home' });
  }
});

// ---------------------------------------------------------------------------
// Protected: complete a lesson (checkpoint), scoped to the signed-in school.
// ---------------------------------------------------------------------------
schoolRouter.post('/progress', requireSchoolAuth, async (req: Request, res: Response) => {
  const programId = (req.body.programId || '').toString();
  const lessonRef = (req.body.lessonRef || '').toString();
  if (!programId || !lessonRef) {
    return res.status(400).json({ error: 'programId and lessonRef are required' });
  }

  try {
    const schoolId = req.school!.id;
    const program = await findProgram(schoolId, programId);
    if (!program) {
      return res.status(404).json({ error: 'Programme not found in your school' });
    }
    const valid = (program.curriculum || []).some((l) => l.ref === lessonRef);
    if (!valid) {
      return res.status(422).json({ error: 'Unknown lesson for this programme' });
    }

    await recordProgress(schoolId, req.user!.id, programId, lessonRef);
    return res.json({ status: 'ok' });
  } catch (err: any) {
    if (isSchoolConnectionFailure(err)) return schoolPgUnavailable(res);
    console.error('[School] progress failed:', err?.stack || err?.message);
    return res.status(500).json({ error: 'Could not save your progress' });
  }
});