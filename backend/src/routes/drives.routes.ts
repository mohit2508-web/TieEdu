import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { getPool } from '../db/client';
import { loadDb } from '../data/db';
import { emitDriveNotification } from '../lib/driveNotify';
import {
  bridgeUnavailable,
  generateLaunchToken,
  getProviderByCode,
  LAUNCH_TOKEN_TTL_SECONDS,
  playerCollegeIds,
  withQuery,
} from '../lib/bridge/core';

/**
 * Student-facing drive API. Every route is behind the normal student session
 * (requireAuth is applied at the mount in server.ts). A student only ever sees:
 *
 *   - drives that are published/live, inside their window, and for their college
 *     (or open drives with college_id IS NULL),
 *   - their own registration, attempts and results,
 *   - a launch URL — never a provider secret, never another student's data.
 *
 * The launch URL carries an opaque one-time token; the student is redirected in
 * the same tab so a popup blocker cannot eat the handoff.
 */

export const drivesRouter = Router();
export const studentProfileRouter = Router();

/* ------------------------------ resume files ------------------------------ */

const RESUME_DIR = path.join(__dirname, '../../uploads/resumes');
fs.mkdirSync(RESUME_DIR, { recursive: true });

// Only the names this module generates are ever served or deleted, so a crafted
// `stored_name` can never reach outside RESUME_DIR.
const RESUME_NAME_RE = /^resume-[0-9]+-[a-z0-9]{4,12}\.pdf$/;

const resumeUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, RESUME_DIR),
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      cb(null, `resume-${reqSafeId(_req)}-${unique}.pdf`.replace(/[^a-z0-9.\-]/gi, ''));
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') return cb(new Error('Only PDF resumes are accepted'));
    cb(null, true);
  },
});

// The auth middleware attaches the user id; fall back to a random token only if
// it is somehow missing, since the filename must still be unique and safe.
function reqSafeId(req: Request): string {
  return String((req as any).userId || 'anon').replace(/[^a-z0-9]/gi, '').slice(0, 12) || 'anon';
}

type Row = Record<string, any>;

function num(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Parses a JSONB column that the UI expects as an object. Never throws. */
function asJson(v: any, fallback: Record<string, any>): Record<string, any> {
  if (v && typeof v === 'object') return v;
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      if (p && typeof p === 'object') return p;
    } catch { /* fall through */ }
  }
  return fallback;
}

/** Parses a JSONB array column. Never throws. */
function asJsonArray(v: any): any[] {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      if (Array.isArray(p)) return p;
    } catch { /* fall through */ }
  }
  return [];
}

async function profileForDrive(userId: string, collegeId: string | null): Promise<Row | null> {
  const r = await getPool().query(
    `SELECT * FROM student_profile WHERE user_id=$1 ORDER BY (college_id IS NOT DISTINCT FROM $2) DESC, updated_at DESC LIMIT 1`,
    [userId, collegeId]
  );
  return r.rows[0] || null;
}

function eligibilityReasons(profile: Row | null, drive: Row): string[] {
  const elig: Row = drive.eligibility || {};
  const reasons: string[] = [];
  if (!profile) return ['profile_missing'];
  if (elig.min_cgpa != null && (profile.cgpa == null || Number(profile.cgpa) < Number(elig.min_cgpa))) reasons.push('cgpa_below_minimum');
  if (elig.max_cgpa != null && profile.cgpa != null && Number(profile.cgpa) > Number(elig.max_cgpa)) reasons.push('cgpa_above_maximum');
  if (elig.max_backlogs != null && Number(profile.backlogs || 0) > Number(elig.max_backlogs)) reasons.push('too_many_backlogs');
  if (Array.isArray(elig.branches) && elig.branches.length && !elig.branches.includes(profile.branch)) reasons.push('branch_not_eligible');
  if (Array.isArray(elig.batches) && elig.batches.length && !elig.batches.includes(profile.batch)) reasons.push('batch_not_eligible');
  return reasons;
}

function windowState(drive: Row): { open: boolean; reason?: string } {
  const now = Date.now();
  if (drive.starts_at && new Date(drive.starts_at).getTime() > now) return { open: false, reason: 'not_started' };
  if (drive.ends_at && new Date(drive.ends_at).getTime() <= now) return { open: false, reason: 'ended' };
  if (drive.status === 'closed' || drive.status === 'archived') return { open: false, reason: 'closed' };
  return { open: true };
}

function canSeeResults(drive: Row): boolean {
  if (drive.results_published) return true;
  if (drive.results_visibility === 'immediate') return true;
  if (drive.results_visibility === 'after_close') {
    return !!drive.ends_at && new Date(drive.ends_at).getTime() <= Date.now();
  }
  return false;
}

/* ------------------------------ list drives ------------------------------- */

drivesRouter.get('/', async (req: Request, res: Response) => {
  const userId = req.userId!;
  try {
    const colleges = await playerCollegeIds(userId);
    const r = await getPool().query(
      `SELECT d.*, r.registration_id, r.status AS reg_status
         FROM mock_drive d
         LEFT JOIN drive_registration r ON r.drive_id = d.drive_id AND r.user_id = $2
        WHERE d.status IN ('published','live')
          AND (d.ends_at IS NULL OR d.ends_at > NOW())
          AND (d.college_id IS NULL OR d.college_id = ANY($1::text[]))
          AND (d.registration_mode <> 'roster' OR r.registration_id IS NOT NULL)
        ORDER BY d.starts_at NULLS LAST, d.created_at DESC`,
      [colleges, userId]
    );
    const drives = r.rows.map((d) => ({
      drive_id: d.drive_id,
      title: d.title,
      company_name: d.company_name,
      description: d.description,
      drive_type: d.drive_type,
      status: d.status,
      starts_at: d.starts_at,
      ends_at: d.ends_at,
      registration_mode: d.registration_mode,
      my_registration_status: d.reg_status || null,
      registered: !!d.registration_id,
      window_open: windowState(d).open,
    }));
    return res.json({ drives });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/* ------------------------------- register --------------------------------- */

drivesRouter.post('/:driveId/register', async (req: Request, res: Response) => {
  const userId = req.userId!;
  const user = req.user!;
  try {
    const driveR = await getPool().query(`SELECT * FROM mock_drive WHERE drive_id=$1`, [req.params.driveId]);
    const drive = driveR.rows[0];
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    if (!['published', 'live'].includes(drive.status)) return res.status(409).json({ error: 'drive_not_open' });

    const win = windowState(drive);
    if (!win.open) return res.status(409).json({ error: 'registration_window_closed', reason: win.reason });

    const colleges = await playerCollegeIds(userId);
    if (drive.college_id && !colleges.includes(drive.college_id)) {
      return res.status(403).json({ error: 'drive_not_available' });
    }

    // Roster-only drives admit a student only through an invite or an existing
    // admin-created row. Invite mode additionally requires the invite token.
    const inviteToken = String(req.body?.invite_token || '').trim();
    let invite: Row | null = null;
    if (drive.registration_mode === 'invite') {
      const invR = await getPool().query(
        `SELECT * FROM drive_invite WHERE token=$1 AND drive_id=$2 AND status='pending' AND expires_at > NOW()`,
        [inviteToken, drive.drive_id]
      );
      invite = invR.rows[0] || null;
      if (!invite) return res.status(403).json({ error: 'invite_required' });
    } else if (drive.registration_mode === 'roster') {
      const rosterR = await getPool().query(
        `SELECT * FROM drive_registration WHERE drive_id=$1 AND user_id=$2`,
        [drive.drive_id, userId]
      );
      if (!rosterR.rows.length) return res.status(403).json({ error: 'not_on_roster' });
    }

    const profile = await profileForDrive(userId, drive.college_id);
    const blockers = eligibilityReasons(profile, drive);
    if (blockers.length) return res.status(422).json({ error: 'not_eligible', reasons: blockers });

    const existing = await getPool().query(`SELECT * FROM drive_registration WHERE drive_id=$1 AND user_id=$2`, [drive.drive_id, userId]);
    let registration = existing.rows[0];
    let createdNew = false;
    if (!registration) {
      const ins = await getPool().query(
        `INSERT INTO drive_registration (drive_id, user_id, roll_no, license_id, college_id, eligibility_checked, status)
         VALUES ($1,$2,$3,$4,$5,TRUE,'registered')
         ON CONFLICT (drive_id, user_id) DO NOTHING
         RETURNING *`,
        [drive.drive_id, userId, profile?.roll_no || user.roll_no || null, user.license_id || null, drive.college_id || profile?.college_id || null]
      );
      registration =
        ins.rows[0] ||
        (await getPool().query(`SELECT * FROM drive_registration WHERE drive_id=$1 AND user_id=$2`, [drive.drive_id, userId])).rows[0];
      createdNew = !!ins.rows[0];
      await seedRegistrationTests(drive.drive_id, registration.registration_id);
    }

    if (invite) {
      await getPool().query(
        `UPDATE drive_invite SET status='claimed', claimed_by_user=$2, claimed_at=NOW() WHERE token=$1`,
        [invite.token, userId]
      );
    }

    await linkPlacementStudent(registration.college_id, registration.roll_no, userId);

    if (createdNew) {
      await emitDriveNotification({
        userId,
        driveId: drive.drive_id,
        kind: 'registered',
        title: 'Registration confirmed',
        body: `You're registered for ${drive.title}. We'll notify you about rounds, slots and results.`,
        url: `/mock-drive/drives/${drive.drive_id}`,
        dedupeKey: `registered:${drive.drive_id}:${userId}`,
      });
    }

    return res.status(201).json({
      registration: { registration_id: registration.registration_id, status: registration.status, registered_at: registration.registered_at },
    });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

async function seedRegistrationTests(driveId: string, registrationId: string): Promise<void> {
  await getPool().query(
    `INSERT INTO drive_registration_test (registration_id, test_id, status)
       SELECT $2, mdt.test_id, CASE WHEN (mdt.unlock_rule->>'kind') = 'open' OR mdt.unlock_rule IS NULL THEN 'unlocked' ELSE 'locked' END
         FROM mock_drive_test mdt
        WHERE mdt.drive_id = $1
     ON CONFLICT (registration_id, test_id) DO NOTHING`,
    [driveId, registrationId]
  );
}

async function linkPlacementStudent(collegeId: string | null, rollNo: string | null, userId: string): Promise<void> {
  if (!collegeId || !rollNo) return;
  await getPool().query(
    `INSERT INTO placement_student_link (college_id, roll_no, user_id)
     VALUES ($1,$2,$3) ON CONFLICT (college_id, roll_no) DO NOTHING`,
    [collegeId, rollNo, userId]
  );
}

/* -------------------------------- launch ---------------------------------- */

drivesRouter.post('/:driveId/tests/:testId/launch', async (req: Request, res: Response) => {
  const userId = req.userId!;
  try {
    const testR = await getPool().query(
      `SELECT mdt.*, t.mode, t.provider_id, t.provider_exam_id, t.name AS test_name, t.status AS test_status
         FROM mock_drive_test mdt JOIN drive_test t ON t.test_id = mdt.test_id
        WHERE mdt.drive_id=$1 AND mdt.test_id=$2`,
      [req.params.driveId, req.params.testId]
    );
    const test = testR.rows[0];
    if (!test) return res.status(404).json({ error: 'test_not_found' });

    const driveR = await getPool().query(`SELECT * FROM mock_drive WHERE drive_id=$1`, [req.params.driveId]);
    const drive = driveR.rows[0];
    if (!drive || !['published', 'live'].includes(drive.status)) return res.status(409).json({ error: 'drive_not_open' });

    const regR = await getPool().query(`SELECT * FROM drive_registration WHERE drive_id=$1 AND user_id=$2`, [drive.drive_id, userId]);
    const reg = regR.rows[0];
    if (!reg) return res.status(403).json({ error: 'not_registered' });
    if (reg.status === 'disqualified') return res.status(403).json({ error: 'disqualified' });

    const drtR = await getPool().query(
      `SELECT * FROM drive_registration_test WHERE registration_id=$1 AND test_id=$2`,
      [reg.registration_id, test.test_id]
    );
    const drt = drtR.rows[0];
    if (!drt) return res.status(403).json({ error: 'test_not_assigned' });
    if (drt.status === 'not_shortlisted') return res.status(403).json({ error: 'not_shortlisted' });
    if (drt.status === 'completed' && Number(drt.attempts_used) >= Number(test.max_attempts)) {
      return res.status(409).json({ error: 'no_attempts_remaining' });
    }
    if (drt.status === 'locked') {
      const rule = test.unlock_rule || {};
      return res.status(409).json({ error: 'test_locked', unlock_rule: rule });
    }

    // Per-test window, if the drive attached one.
    const now = Date.now();
    if (test.opens_at && new Date(test.opens_at).getTime() > now) return res.status(409).json({ error: 'test_not_open' });
    if (test.window_hard_close && test.closes_at && new Date(test.closes_at).getTime() <= now) {
      return res.status(409).json({ error: 'test_window_closed' });
    }

    if (test.mode === 'internal') {
      // Internal mode is delivered by the in-house skill-test engine in a later
      // phase. Refusing loudly (rather than opening a broken runner) keeps the
      // student-facing contract honest until it is wired.
      return res.status(409).json({ error: 'internal_mode_not_enabled', message: 'This drive uses the in-house engine, which is not enabled yet.' });
    }

    const providerR = await getPool().query(`SELECT * FROM drive_provider WHERE provider_id=$1`, [test.provider_id]);
    const provider = providerR.rows[0];
    if (!provider || provider.status !== 'active') return res.status(503).json({ error: 'provider_unavailable' });

    const { token, token_hash, token_jti } = generateLaunchToken();
    const expiresAt = new Date(Date.now() + LAUNCH_TOKEN_TTL_SECONDS * 1000);
    const returnUrl = `${(req.headers.origin as string) || ''}/drives/${drive.drive_id}`;
    await getPool().query(
      `INSERT INTO drive_launch (token_hash, token_jti, drive_id, test_id, user_id, provider_id, provider_exam_id, return_url, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [token_hash, token_jti, drive.drive_id, test.test_id, userId, provider.provider_id, test.provider_exam_id, returnUrl, expiresAt]
    );

    const launchUrl = withQuery(provider.launch_url, 'lt', token);
    return res.json({ launch_url: launchUrl, expires_at: expiresAt.toISOString(), provider: provider.code });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/* ------------------------------ my results -------------------------------- */

drivesRouter.get('/:driveId/my-results', async (req: Request, res: Response) => {
  const userId = req.userId!;
  try {
    const driveR = await getPool().query(`SELECT * FROM mock_drive WHERE drive_id=$1`, [req.params.driveId]);
    const drive = driveR.rows[0];
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });

    if (!canSeeResults(drive)) {
      return res.json({ drive_id: drive.drive_id, visible: false, results_visibility: drive.results_visibility, tests: [] });
    }

    const r = await getPool().query(
      `SELECT t.test_id, t.name, drt.status, drt.attempts_used, drt.best_percentage,
              a.score, a.max_score, a.percentage, a.passed, a.submitted_at, a.sections
         FROM mock_drive_test mdt
         JOIN drive_test t ON t.test_id = mdt.test_id
         JOIN drive_registration reg ON reg.drive_id = mdt.drive_id AND reg.user_id = $2
         LEFT JOIN drive_registration_test drt ON drt.registration_id = reg.registration_id AND drt.test_id = mdt.test_id
         LEFT JOIN drive_attempt a ON a.attempt_id = drt.best_attempt_id
        WHERE mdt.drive_id = $1
        ORDER BY mdt.sort_order, t.name`,
      [drive.drive_id, userId]
    );
    return res.json({
      drive_id: drive.drive_id,
      visible: true,
      results_visibility: drive.results_visibility,
      tests: r.rows.map((x) => ({
        test_id: x.test_id,
        name: x.name,
        status: x.status,
        attempts_used: Number(x.attempts_used || 0),
        percentage: num(x.percentage ?? x.best_percentage),
        score: num(x.score),
        max_score: num(x.max_score),
        passed: x.passed,
        submitted_at: x.submitted_at,
        sections: x.sections || [],
      })),
    });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/* --------------------------- student profile ------------------------------ */

studentProfileRouter.get('/', async (req: Request, res: Response) => {
  try {
    const r = await getPool().query(`SELECT * FROM student_profile WHERE user_id=$1 ORDER BY updated_at DESC`, [req.userId!]);
    return res.json({ profiles: r.rows });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

studentProfileRouter.put('/', async (req: Request, res: Response) => {
  const b = req.body || {};
  const collegeId = String(b.college_id || req.user?.college || '').trim();
  const rollNo = String(b.roll_no || req.user?.roll_no || '').trim();
  if (!collegeId || !rollNo) return res.status(400).json({ error: 'college_id_and_roll_no_required' });
  const cgpa = num(b.cgpa);
  if (cgpa != null && (cgpa < 0 || cgpa > 10)) return res.status(422).json({ error: 'cgpa_out_of_range' });
  try {
    const r = await getPool().query(
      `INSERT INTO student_profile (user_id, college_id, roll_no, branch, batch, degree, cgpa, class10_pct, class12_pct, backlogs, status, source, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'self_declared','self',NOW())
       ON CONFLICT (user_id, college_id) DO UPDATE SET
         roll_no=EXCLUDED.roll_no, branch=EXCLUDED.branch, batch=EXCLUDED.batch, degree=EXCLUDED.degree,
         cgpa=EXCLUDED.cgpa, class10_pct=EXCLUDED.class10_pct, class12_pct=EXCLUDED.class12_pct,
         backlogs=EXCLUDED.backlogs, updated_at=NOW()
       RETURNING *`,
      [
        req.userId!, collegeId, rollNo, b.branch || null, b.batch || null, b.degree || null, cgpa,
        num(b.class10_pct), num(b.class12_pct), Number.isFinite(Number(b.backlogs)) ? Number(b.backlogs) : 0,
      ]
    );
    return res.json({ profile: r.rows[0] });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

// ============================================================================
// SECTION 15 — richer student surfaces (home, list filters, detail rounds,
// assessments, interviews, resumes, notifications, settings, corrections).
//
// All routes live on routers that server.ts already mounts behind requireAuth,
// so every handler below can assume `req.userId` is present. The server stays
// the single source of truth for `status_line`, eligibility and window state —
// the frontend only renders what is computed here.
// ============================================================================

/**
 * One status line per drive, derived from server clock and the student's own
 * registration. Computed once here (not in the client) so the same drive never
 * reads "Registration open" on one screen and "Closed" on another.
 */
function driveStatusLine(drive: Row, reg: Row | null, regCount: number | null): string {
  const win = windowState(drive);
  if (drive.status === 'closed' || drive.status === 'archived') return 'Closed';
  if (drive.ends_at && new Date(drive.ends_at).getTime() <= Date.now()) return 'Closed';
  if (drive.registration_mode === 'invite') return reg ? 'Invite accepted' : 'Invite only';
  if (drive.registration_mode === 'roster') return reg ? 'On roster' : 'Roster only';
  const opensAt = drive.registration_opens_at ? new Date(drive.registration_opens_at).getTime() : null;
  const closesAt = drive.registration_closes_at ? new Date(drive.registration_closes_at).getTime() : null;
  const now = Date.now();
  if (opensAt && now < opensAt) return 'Registration opens soon';
  if (closesAt && now > closesAt) return reg ? 'Registered' : 'Registration closed';
  if (win.open && !reg) return regCount != null && regCount >= 100 ? 'Popular' : 'Registration open';
  if (reg) {
    if (reg.status === 'completed') return 'Completed';
    if (reg.status === 'in_progress' || reg.status === 'launched') return 'In progress';
    return 'Registered';
  }
  return 'Published';
}

/** `true` when a drive's registration is still open for an unregistered student. */
function registrationOpen(drive: Row): boolean {
  const win = windowState(drive);
  if (!win.open) return false;
  const now = Date.now();
  if (drive.registration_opens_at && now < new Date(drive.registration_opens_at).getTime()) return false;
  if (drive.registration_closes_at && now > new Date(drive.registration_closes_at).getTime()) return false;
  return true;
}

/** Formats a timestamp the way the whole product renders it: `12 Oct, 10:00 AM` (IST). */
function fmtIst(value: string | Date | null): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  });
}

/* ------------------------------ home feed -------------------------------- */

drivesRouter.get('/home', async (req: Request, res: Response) => {
  const userId = req.userId!;
  try {
    const colleges = await playerCollegeIds(userId);
    const listR = await getPool().query(
      `SELECT d.*, r.registration_id, r.status AS reg_status
         FROM mock_drive d
         LEFT JOIN drive_registration r ON r.drive_id = d.drive_id AND r.user_id = $2
        WHERE d.status IN ('published','live')
          AND (d.college_id IS NULL OR d.college_id = ANY($1::text[]))
          AND (d.registration_mode <> 'roster' OR r.registration_id IS NOT NULL)
        ORDER BY d.starts_at NULLS LAST, d.created_at DESC`,
      [colleges, userId]
    );

    const upcoming = listR.rows
      .filter((d) => !d.starts_at || new Date(d.starts_at).getTime() > Date.now())
      .slice(0, 5)
      .map((d) => ({
        drive_id: d.drive_id, title: d.title, company_name: d.company_name,
        company_logo_url: d.company_logo_url || null, location: d.location || null,
        starts_at: d.starts_at, starts_at_ist: fmtIst(d.starts_at),
        registration_opens_at: d.registration_opens_at || null,
        status_line: driveStatusLine(d, d.registration_id ? { status: d.reg_status } : null, null),
      }));

    const openR = await getPool().query(
      `SELECT d.*, r.registration_id, r.status AS reg_status
         FROM mock_drive d
         LEFT JOIN drive_registration r ON r.drive_id = d.drive_id AND r.user_id = $2
        WHERE d.status IN ('published','live')
          AND (d.college_id IS NULL OR d.college_id = ANY($1::text[]))
          AND (d.registration_opens_at IS NULL OR d.registration_opens_at <= NOW())
          AND (d.registration_closes_at IS NULL OR d.registration_closes_at > NOW())
          AND (d.ends_at IS NULL OR d.ends_at > NOW())
          AND r.registration_id IS NULL
          AND (d.registration_mode = 'open')
        ORDER BY d.registration_closes_at NULLS LAST, d.starts_at NULLS LAST
        LIMIT 10`,
      [colleges, userId]
    );
    const openForYou = openR.rows.map((d) => ({
      drive_id: d.drive_id, title: d.title, company_name: d.company_name,
      company_logo_url: d.company_logo_url || null, location: d.location || null,
      ctc_min: num(d.ctc_min), ctc_max: num(d.ctc_max),
      registration_closes_at: d.registration_closes_at,
      registration_closes_at_ist: fmtIst(d.registration_closes_at),
      status_line: driveStatusLine(d, null, null),
    }));

    // Attempts still in flight — the student's "continue" surface.
    const inProgR = await getPool().query(
      `SELECT a.attempt_id, a.drive_id, a.test_id, a.status, a.started_at, d.title, d.company_name, t.name AS test_name
         FROM drive_attempt a
         JOIN mock_drive d ON d.drive_id = a.drive_id
         LEFT JOIN drive_test t ON t.test_id = a.test_id
        WHERE a.user_id = $1 AND a.status IN ('in_progress','started')
        ORDER BY a.started_at DESC
        LIMIT 10`,
      [userId]
    );

    // Count of unread notifications for the bell badge.
    const notifR = await getPool().query(
      `SELECT COUNT(*)::INT AS unread FROM drive_notification
        WHERE user_id = $1 AND (payload->>'read') IS DISTINCT FROM 'true'`,
      [userId]
    );

    // Latest three notifications so Home can preview them without a second trip.
    const recentR = await getPool().query(
      `SELECT kind, payload, created_at FROM drive_notification
        WHERE user_id = $1 ORDER BY created_at DESC LIMIT 3`,
      [userId]
    );

    // Headline numbers — one round trip instead of three.
    const statsR = await getPool().query(
      `SELECT (SELECT COUNT(*)::INT FROM drive_registration WHERE user_id=$1) AS applied,
              (SELECT COUNT(*)::INT FROM drive_attempt WHERE user_id=$1 AND status='completed') AS completed`,
      [userId]
    );

    return res.json({
      server_now: new Date().toISOString(),
      upcoming,
      open_for_you: openForYou,
      in_progress: inProgR.rows.map((a) => ({
        attempt_id: a.attempt_id, drive_id: a.drive_id, test_id: a.test_id,
        drive_title: a.title, company_name: a.company_name, test_name: a.test_name,
        started_at: a.started_at, started_at_ist: fmtIst(a.started_at),
      })),
      stats: {
        applied: Number(statsR.rows[0]?.applied || 0),
        open: openForYou.length,
        in_progress: inProgR.rows.length,
        completed: Number(statsR.rows[0]?.completed || 0),
      },
      recent_notifications: recentR.rows.map((n) => ({
        kind: n.kind,
        title: n.payload?.title || n.kind,
        body: n.payload?.body || '',
        read: n.payload?.read === true,
        created_at: n.created_at,
        created_at_ist: fmtIst(n.created_at),
      })),
      unread_notifications: Number(notifR.rows[0]?.unread || 0),
    });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/* ------------------------- list with filters ------------------------------ */

drivesRouter.get('/list', async (req: Request, res: Response) => {
  const userId = req.userId!;
  try {
    const colleges = await playerCollegeIds(userId);
    const r = await getPool().query(
      `SELECT d.*, r.registration_id, r.status AS reg_status,
              (SELECT COUNT(*)::INT FROM drive_registration rr WHERE rr.drive_id = d.drive_id) AS reg_count
         FROM mock_drive d
         LEFT JOIN drive_registration r ON r.drive_id = d.drive_id AND r.user_id = $2
        WHERE d.status IN ('published','live')
          AND (d.college_id IS NULL OR d.college_id = ANY($1::text[]))
          AND (d.registration_mode <> 'roster' OR r.registration_id IS NOT NULL)
        ORDER BY d.starts_at NULLS LAST, d.created_at DESC`,
      [colleges, userId]
    );
    const drives = r.rows.map((d) => ({
      drive_id: d.drive_id, title: d.title, company_name: d.company_name,
      company_logo_url: d.company_logo_url || null,
      description: d.description, description_md: d.description_md || null,
      drive_type: d.drive_type, status: d.status,
      location: d.location || null, job_type: d.job_type || null,
      category: d.category || null, job_function: d.job_function || null,
      ctc_min: num(d.ctc_min), ctc_max: num(d.ctc_max),
      starts_at: d.starts_at, ends_at: d.ends_at,
      starts_at_ist: fmtIst(d.starts_at), ends_at_ist: fmtIst(d.ends_at),
      registration_mode: d.registration_mode,
      registration_opens_at: d.registration_opens_at, registration_closes_at: d.registration_closes_at,
      registration_opens_at_ist: fmtIst(d.registration_opens_at),
      registration_closes_at_ist: fmtIst(d.registration_closes_at),
      my_registration_status: d.reg_status || null,
      registered: !!d.registration_id,
      window_open: windowState(d).open,
      registration_open: registrationOpen(d),
      status_line: driveStatusLine(d, d.registration_id ? { status: d.reg_status } : null, d.reg_count),
    }));
    return res.json({ server_now: new Date().toISOString(), drives });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/* --------------------------- assessments tab ------------------------------ */

drivesRouter.get('/assessments', async (req: Request, res: Response) => {
  const userId = req.userId!;
  try {
    const tab = String(req.query.tab || 'all');
    const r = await getPool().query(
      `SELECT a.attempt_id, a.drive_id, a.test_id, a.status, a.started_at, a.submitted_at,
              a.percentage, a.score, a.max_score, a.passed,
              d.title AS drive_title, d.company_name, d.company_logo_url, d.drive_type,
              t.name AS test_name, t.duration_minutes, t.total_questions, t.mode
         FROM drive_attempt a
         JOIN mock_drive d ON d.drive_id = a.drive_id
         LEFT JOIN drive_test t ON t.test_id = a.test_id
        WHERE a.user_id = $1
        ORDER BY COALESCE(a.submitted_at, a.started_at) DESC`,
      [userId]
    );
    let rows = r.rows;
    if (tab === 'active') rows = rows.filter((x) => ['in_progress', 'started'].includes(x.status));
    else if (tab === 'completed') rows = rows.filter((x) => ['submitted', 'completed', 'graded'].includes(x.status));
    return res.json({
      server_now: new Date().toISOString(),
      attempts: rows.map((x) => ({
        attempt_id: x.attempt_id, drive_id: x.drive_id, test_id: x.test_id,
        drive_title: x.drive_title, company_name: x.company_name,
        company_logo_url: x.company_logo_url || null, drive_type: x.drive_type,
        test_name: x.test_name, mode: x.mode, duration_minutes: x.duration_minutes, total_questions: x.total_questions,
        status: x.status, started_at: x.started_at, submitted_at: x.submitted_at,
        percentage: num(x.percentage), score: num(x.score), max_score: num(x.max_score), passed: x.passed,
      })),
    });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/* --------------------------- attempt detail ------------------------------- */

drivesRouter.get('/attempts/:attemptId', async (req: Request, res: Response) => {
  const userId = req.userId!;
  try {
    const r = await getPool().query(
      `SELECT a.*, d.title AS drive_title, d.company_name, d.company_logo_url, d.drive_id,
              t.name AS test_name, t.duration_minutes, t.total_questions, t.mode
         FROM drive_attempt a
         JOIN mock_drive d ON d.drive_id = a.drive_id
         LEFT JOIN drive_test t ON t.test_id = a.test_id
        WHERE a.attempt_id = $1 AND a.user_id = $2`,
      [req.params.attemptId, userId]
    );
    const a = r.rows[0];
    if (!a) return res.status(404).json({ error: 'attempt_not_found' });
    return res.json({
      server_now: new Date().toISOString(),
      attempt: {
        attempt_id: a.attempt_id, drive_id: a.drive_id, test_id: a.test_id,
        drive_title: a.drive_title, company_name: a.company_name, company_logo_url: a.company_logo_url || null,
        test_name: a.test_name, mode: a.mode, duration_minutes: a.duration_minutes, total_questions: a.total_questions,
        status: a.status, started_at: a.started_at, submitted_at: a.submitted_at,
        percentage: num(a.percentage), score: num(a.score), max_score: num(a.max_score), passed: a.passed,
        sections: a.sections || [],
      },
    });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/* ----------------------------- interviews --------------------------------- */

drivesRouter.get('/interviews', async (req: Request, res: Response) => {
  const userId = req.userId!;
  try {
    const r = await getPool().query(
      `SELECT i.*, d.title AS drive_title, d.company_name, d.company_logo_url
         FROM drive_interview i
         JOIN mock_drive d ON d.drive_id = i.drive_id
        WHERE i.user_id = $1
        ORDER BY i.scheduled_at NULLS LAST, i.created_at DESC`,
      [userId]
    );
    return res.json({
      server_now: new Date().toISOString(),
      interviews: r.rows.map((i) => ({
        interview_id: i.interview_id, drive_id: i.drive_id,
        drive_title: i.drive_title, company_name: i.company_name, company_logo_url: i.company_logo_url || null,
        round_name: i.round_name, scheduled_at: i.scheduled_at, scheduled_at_ist: fmtIst(i.scheduled_at),
        duration_minutes: i.duration_minutes, mode: i.mode, location: i.location,
        meeting_url: i.meeting_url, interviewer: i.interviewer, status: i.status, notes: i.notes,
      })),
    });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/* --------------------------------- config ---------------------------------
   Platform-level knobs the student UI needs: the support number shown in the
   More tab and the UPI details PaymentSheet renders. Registered before
   `/:driveId` below so the literal path wins the match. */

drivesRouter.get('/config', async (_req: Request, res: Response) => {
  try {
    const s: any = loadDb().settings || {};
    return res.json({
      support_phone: s.support_phone || '',
      support_email: s.support_email || '',
      platform_name: s.platform_name || 'TieEdu',
      upi_id: s.upi_id || '',
      upi_qr: s.upi_qr || '',
      merchant_name: s.merchant_name || 'TieEdu',
      upi_instructions: s.upi_instructions || '',
    });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/* ------------------------------ drive detail ------------------------------
   Registered AFTER the literal routes above (/home, /list, /assessments,
   /interviews): Express matches in registration order, so a `/:driveId` here
   would swallow them and 404 every tab with `drive_not_found`. */

drivesRouter.get('/:driveId', async (req: Request, res: Response) => {
  const userId = req.userId!;
  try {
    const driveR = await getPool().query(`SELECT * FROM mock_drive WHERE drive_id=$1`, [req.params.driveId]);
    const drive = driveR.rows[0];
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });

    const colleges = await playerCollegeIds(userId);
    const regR = await getPool().query(`SELECT * FROM drive_registration WHERE drive_id=$1 AND user_id=$2`, [drive.drive_id, userId]);
    const reg = regR.rows[0] || null;
    const allowed = !drive.college_id || colleges.includes(drive.college_id) || !!reg;
    if (!allowed) return res.status(403).json({ error: 'drive_not_available' });

    const testsR = await getPool().query(
      `SELECT t.test_id, t.mode, t.name, t.slug, t.duration_minutes, t.total_questions,
              mdt.sort_order, mdt.mandatory, mdt.max_attempts, mdt.opens_at, mdt.closes_at,
              mdt.window_hard_close, mdt.unlock_rule,
              mdt.round_name, mdt.kind,
              drt.status AS my_status, drt.attempts_used, drt.best_percentage
         FROM mock_drive_test mdt
         JOIN drive_test t ON t.test_id = mdt.test_id
         LEFT JOIN drive_registration r ON r.drive_id = mdt.drive_id AND r.user_id = $2
         LEFT JOIN drive_registration_test drt ON drt.registration_id = r.registration_id AND drt.test_id = mdt.test_id
        WHERE mdt.drive_id = $1
        ORDER BY mdt.sort_order, t.name`,
      [drive.drive_id, userId]
    );

    const profile = await profileForDrive(userId, drive.college_id);
    const eligReasons = eligibilityReasons(profile, drive);

    const regCountR = await getPool().query(
      `SELECT COUNT(*)::INT AS n FROM drive_registration WHERE drive_id=$1`,
      [drive.drive_id]
    );

    // `rounds` is the canonical field; `tests` is kept as a legacy alias so the
    // older `pages/drives/[driveId]` route keeps resolving off `detail.tests`.
    const rounds = testsR.rows.map((t) => ({
      test_id: t.test_id,
      round_name: t.round_name || null,
      kind: t.kind || null,
      mode: t.mode,
      name: t.name,
      slug: t.slug,
      duration_minutes: t.duration_minutes,
      total_questions: t.total_questions,
      mandatory: t.mandatory,
      sort_order: t.sort_order,
      max_attempts: t.max_attempts,
      opens_at: t.opens_at,
      closes_at: t.closes_at,
      my_status: t.my_status || (reg ? 'locked' : null),
      attempts_used: Number(t.attempts_used || 0),
      best_percentage: num(t.best_percentage),
      status_label: !reg
        ? 'locked'
        : t.my_status === 'completed'
        ? 'completed'
        : t.my_status === 'in_progress' || t.my_status === 'launched'
        ? 'in_progress'
        : 'unlocked',
    }));

    return res.json({
      server_now: new Date().toISOString(),
      drive: {
        drive_id: drive.drive_id,
        title: drive.title,
        company_name: drive.company_name,
        company_logo_url: drive.company_logo_url || null,
        description: drive.description,
        description_md: drive.description_md || null,
        additional_info_md: drive.additional_info_md || null,
        drive_type: drive.drive_type,
        status: drive.status,
        location: drive.location || null,
        job_type: drive.job_type || null,
        category: drive.category || null,
        job_function: drive.job_function || null,
        ctc_min: num(drive.ctc_min),
        ctc_max: num(drive.ctc_max),
        starts_at: drive.starts_at,
        ends_at: drive.ends_at,
        starts_at_ist: fmtIst(drive.starts_at),
        ends_at_ist: fmtIst(drive.ends_at),
        registration_mode: drive.registration_mode,
        registration_opens_at_ist: fmtIst(drive.registration_opens_at),
        registration_closes_at_ist: fmtIst(drive.registration_closes_at),
        results_visibility: drive.results_visibility,
        other_info: asJson(drive.other_info, {}),
        documents: asJsonArray(drive.documents),
        tpo_contact: asJson(drive.tpo_contact, {}),
        eligibility: asJson(drive.eligibility, {}),
        window_open: windowState(drive).open,
        registration_open: registrationOpen(drive),
        status_line: driveStatusLine(drive, reg, regCountR.rows[0]?.n ?? null),
      },
      registration: reg
        ? { registration_id: reg.registration_id, status: reg.status, registered_at: reg.registered_at }
        : null,
      can_register: !reg && eligReasons.length === 0 && registrationOpen(drive),
      eligibility_blockers: eligReasons,
      rounds,
      tests: rounds,
    });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

export default drivesRouter;

/* ============================================================================ */
/*  STUDENT SURFACES on /api/me  (profile, resumes, notifications, settings)    */
/* ============================================================================ */

/* ------------------------------- resumes ---------------------------------- */

// Real binary upload. The file lands in RESUME_DIR under a server-generated
// name; the client only ever supplies the display `title`.
studentProfileRouter.post('/resumes/upload', (req: Request, res: Response) => {
  resumeUpload.single('file')(req, res, (err: any) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Resume exceeds the 8MB limit' });
    }
    if (err) return res.status(400).json({ error: err.message || 'Upload failed' });

    const file = req.file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });
    if (!RESUME_NAME_RE.test(file.filename)) {
      return res.status(422).json({ error: 'invalid_stored_name' });
    }

    const title = String((req.body && req.body.title) || '').trim() || file.originalname.replace(/\.pdf$/i, '');

    getPool()
      .query(
        `INSERT INTO student_resume (user_id, title, file_name, stored_name, size_bytes, is_default)
         VALUES ($1,$2,$3,$4,$5, NOT EXISTS (SELECT 1 FROM student_resume WHERE user_id=$1))
         RETURNING resume_id, title, file_name, size_bytes, is_default, created_at`,
        [req.userId!, title, file.originalname, file.filename, file.size]
      )
      .then((r) => res.status(201).json({ resume: r.rows[0] }))
      .catch((e: any) => {
        fs.rm(path.join(RESUME_DIR, file.filename), { force: true }, () => {});
        return bridgeUnavailable(res, e);
      });
  });
});

// Download the student's own resume file. Ownership is enforced in the query —
// a resume id belonging to someone else is a 404, never a leaked file.
studentProfileRouter.get('/resumes/:resumeId/file', async (req: Request, res: Response) => {
  try {
    const r = await getPool().query(
      `SELECT file_name, stored_name FROM student_resume WHERE resume_id=$1 AND user_id=$2`,
      [req.params.resumeId, req.userId!]
    );
    const row = r.rows[0];
    if (!row || !RESUME_NAME_RE.test(row.stored_name)) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    const filePath = path.join(RESUME_DIR, row.stored_name);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File missing' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(row.file_name || 'resume.pdf')}"`);
    return fs.createReadStream(filePath).pipe(res);
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

studentProfileRouter.get('/resumes', async (req: Request, res: Response) => {
  try {
    const r = await getPool().query(
      `SELECT resume_id, title, file_name, size_bytes, is_default, created_at
         FROM student_resume WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC`,
      [req.userId!]
    );
    return res.json({ resumes: r.rows });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

// Accepts either a multipart upload (later phase) or a JSON stub that points at
// an already-stored PDF. The stub keeps the register flow shippable before the
// upload widget lands, and never trusts a client-supplied `stored_name` path.
studentProfileRouter.post('/resumes', async (req: Request, res: Response) => {
  const b = req.body || {};
  const title = String(b.title || 'Resume').trim() || 'Resume';
  const fileName = String(b.file_name || b.fileName || '').trim();
  const storedName = String(b.stored_name || b.storedName || '').trim();
  if (!fileName || !storedName) return res.status(400).json({ error: 'file_name_and_stored_name_required' });
  if (storedName.includes('/') || storedName.includes('..')) return res.status(422).json({ error: 'invalid_stored_name' });
  try {
    const isFirst = (await getPool().query(`SELECT 1 FROM student_resume WHERE user_id=$1 LIMIT 1`, [req.userId!])).rows.length === 0;
    const r = await getPool().query(
      `INSERT INTO student_resume (user_id, title, file_name, stored_name, size_bytes, is_default)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING resume_id, title, file_name, size_bytes, is_default, created_at`,
      [req.userId!, title, fileName, storedName, Number(b.size_bytes) || 0, isFirst]
    );
    return res.status(201).json({ resume: r.rows[0] });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

studentProfileRouter.delete('/resumes/:resumeId', async (req: Request, res: Response) => {
  try {
    const r = await getPool().query(
      `DELETE FROM student_resume WHERE resume_id=$1 AND user_id=$2 RETURNING is_default, stored_name`,
      [req.params.resumeId, req.userId!]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'resume_not_found' });
    // Remove the stored PDF only after the row is gone (guarded name, best-effort).
    const storedName = r.rows[0].stored_name;
    if (storedName && RESUME_NAME_RE.test(storedName)) {
      fs.rm(path.join(RESUME_DIR, storedName), { force: true }, () => {});
    }
    // Keep exactly one default: promote the most recent survivor.
    if (r.rows[0].is_default) {
      await getPool().query(
        `UPDATE student_resume SET is_default=TRUE, updated_at=NOW()
          WHERE resume_id = (SELECT resume_id FROM student_resume WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1)`,
        [req.userId!]
      );
    }
    return res.json({ ok: true });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/* ----------------------------- notifications ------------------------------ */

// Cheap badge count for the shell's bell — one COUNT, no payload transfer.
studentProfileRouter.get('/notifications/unread', async (req: Request, res: Response) => {
  try {
    const r = await getPool().query(
      `SELECT COUNT(*)::INT AS unread FROM drive_notification
        WHERE user_id = $1 AND (payload->>'read') IS DISTINCT FROM 'true'`,
      [req.userId!]
    );
    return res.json({ unread: Number(r.rows[0]?.unread || 0) });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

studentProfileRouter.get('/notifications', async (req: Request, res: Response) => {
  try {
    const r = await getPool().query(
      `SELECT notification_id, drive_id, kind, channel, status, payload, created_at
         FROM drive_notification WHERE user_id = $1
        ORDER BY created_at DESC LIMIT 100`,
      [req.userId!]
    );
    return res.json({
      notifications: r.rows.map((n) => ({
        notification_id: n.notification_id, drive_id: n.drive_id, kind: n.kind,
        channel: n.channel, status: n.status,
        title: n.payload?.title || n.kind, body: n.payload?.body || '',
        read: n.payload?.read === true, created_at: n.created_at, created_at_ist: fmtIst(n.created_at),
      })),
    });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

studentProfileRouter.post('/notifications/read-all', async (req: Request, res: Response) => {
  try {
    await getPool().query(
      `UPDATE drive_notification SET payload = jsonb_set(COALESCE(payload,'{}'), '{read}', 'true')
        WHERE user_id=$1 AND (payload->>'read') IS DISTINCT FROM 'true'`,
      [req.userId!]
    );
    return res.json({ ok: true });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/* ------------------------------- settings --------------------------------- */

studentProfileRouter.get('/settings', async (req: Request, res: Response) => {
  try {
    const u: any = req.user || {};
    // Preferences live on the user record (same JSON store as unlocks), not on
    // student_profile — the auth layer already populated `req.user`, so there is
    // no second lookup and no invented column.
    const s = u.preferences || {};
    return res.json({
      email: u.email || null, name: u.name || null,
      email_notifications: s.email_notifications !== false,
      push_notifications: s.push_notifications !== false,
      drive_alerts: s.drive_alerts !== false,
    });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

studentProfileRouter.put('/settings', async (req: Request, res: Response) => {
  const b = req.body || {};
  try {
    // Persist onto the signed-in user's `preferences` object via the shared JSON
    // store, mirroring how unlocks are written. `req.userId` is the key.
    const { loadDb, saveDb } = await import('../data/db');
    const db = loadDb();
    const user = (db.users || []).find((x: any) => x.id === req.userId);
    if (!user) return res.status(404).json({ error: 'user_not_found' });
    user.preferences = {
      ...(user.preferences || {}),
      email_notifications: b.email_notifications !== false,
      push_notifications: b.push_notifications !== false,
      drive_alerts: b.drive_alerts !== false,
    };
    saveDb(db);
    return res.json({ ok: true });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/* --------------------------- profile corrections -------------------------- */

studentProfileRouter.post('/corrections', async (req: Request, res: Response) => {
  const b = req.body || {};
  const field = String(b.field || '').trim();
  const toValue = b.to_value == null ? null : String(b.to_value);
  if (!field) return res.status(400).json({ error: 'field_required' });
  try {
    const prof = await getPool().query(
      `SELECT * FROM student_profile WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 1`,
      [req.userId!]
    );
    const p = prof.rows[0];
    if (!p) return res.status(422).json({ error: 'profile_missing' });
    const fromValue = p[field] == null ? null : String(p[field]);
    const r = await getPool().query(
      `INSERT INTO profile_correction_request (user_id, college_id, field, from_value, to_value, reason)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING correction_id, status, created_at`,
      [req.userId!, p.college_id, field, fromValue, toValue, b.reason || null]
    );
    return res.status(201).json({ correction: r.rows[0] });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

studentProfileRouter.get('/corrections', async (req: Request, res: Response) => {
  try {
    const r = await getPool().query(
      `SELECT correction_id, field, from_value, to_value, status, created_at
         FROM profile_correction_request WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [req.userId!]
    );
    return res.json({ corrections: r.rows });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});
