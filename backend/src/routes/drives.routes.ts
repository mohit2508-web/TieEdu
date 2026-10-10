import { Router, Request, Response } from 'express';
import { getPool } from '../db/client';
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

type Row = Record<string, any>;

function num(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
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

/* ------------------------------ drive detail ------------------------------ */

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

    return res.json({
      drive: {
        drive_id: drive.drive_id,
        title: drive.title,
        company_name: drive.company_name,
        description: drive.description,
        drive_type: drive.drive_type,
        status: drive.status,
        starts_at: drive.starts_at,
        ends_at: drive.ends_at,
        registration_mode: drive.registration_mode,
        results_visibility: drive.results_visibility,
        eligibility: drive.eligibility || {},
        window_open: windowState(drive).open,
      },
      registration: reg
        ? { registration_id: reg.registration_id, status: reg.status, registered_at: reg.registered_at }
        : null,
      can_register: !reg && eligReasons.length === 0 && windowState(drive).open,
      eligibility_blockers: eligReasons,
      tests: testsR.rows.map((t) => ({
        test_id: t.test_id,
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
      })),
    });
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
      await seedRegistrationTests(drive.drive_id, registration.registration_id);
    }

    if (invite) {
      await getPool().query(
        `UPDATE drive_invite SET status='claimed', claimed_by_user=$2, claimed_at=NOW() WHERE token=$1`,
        [invite.token, userId]
      );
    }

    await linkPlacementStudent(registration.college_id, registration.roll_no, userId);

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

export default drivesRouter;
