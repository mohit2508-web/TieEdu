import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { getPool } from '../db/client';
import { bridgeUnavailable } from '../lib/bridge/core';

/**
 * Admin/TPO drive management. Mounted behind requireAdmin (platform admin) and
 * safe to mount again behind the TPO portal's placement auth, because every
 * handler that touches a specific drive resolves its college from the drive row
 * and refuses to let a college-scoped caller manage another college's drive.
 *
 * Provider secrets never leave the environment: the API exposes the env-var
 * *prefix* a provider uses, never the resolved secret values.
 */

export const driveAdminRouter = Router();

function num(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function str(v: any): string | null {
  const s = v === null || v === undefined ? '' : String(v).trim();
  return s ? s : null;
}
function slug(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}
function collegeScope(req: Request): string | null {
  return (req as any).placement?.collegeId || null;
}
function toCsv(rows: Record<string, any>[], columns: string[]): string {
  const esc = (v: any) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.join(','), ...rows.map((r) => columns.map((c) => esc(r[c])).join(','))].join('\n');
}

/* -------------------------------- providers ------------------------------- */

driveAdminRouter.get('/providers', async (_req: Request, res: Response) => {
  try {
    const r = await getPool().query(`SELECT * FROM drive_provider ORDER BY created_at DESC`);
    return res.json({ providers: r.rows });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

driveAdminRouter.post('/providers', async (req: Request, res: Response) => {
  const b = req.body || {};
  const code = str(b.code);
  const name = str(b.name);
  const baseUrl = str(b.base_url);
  const launchUrl = str(b.launch_url);
  const prefix = str(b.secret_env_prefix) || (code ? `${code.toUpperCase()}_BRIDGE` : null);
  if (!code || !name || !baseUrl || !launchUrl || !prefix) {
    return res.status(400).json({ error: 'missing_fields', required: ['code', 'name', 'base_url', 'launch_url', 'secret_env_prefix'] });
  }
  try {
    const r = await getPool().query(
      `INSERT INTO drive_provider (code, name, base_url, launch_url, introspect_url, secret_env_prefix, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, base_url=EXCLUDED.base_url, launch_url=EXCLUDED.launch_url,
         introspect_url=EXCLUDED.introspect_url, secret_env_prefix=EXCLUDED.secret_env_prefix, status=EXCLUDED.status, updated_at=NOW()
       RETURNING *`,
      [code, name, baseUrl, launchUrl, str(b.introspect_url) || '', prefix, b.status === 'disabled' ? 'disabled' : 'active']
    );
    return res.status(201).json({ provider: r.rows[0] });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

driveAdminRouter.patch('/providers/:providerId', async (req: Request, res: Response) => {
  const b = req.body || {};
  try {
    const r = await getPool().query(
      `UPDATE drive_provider SET
         name=COALESCE($2,name), base_url=COALESCE($3,base_url), launch_url=COALESCE($4,launch_url),
         introspect_url=COALESCE($5,introspect_url), secret_env_prefix=COALESCE($6,secret_env_prefix),
         status=COALESCE($7,status), updated_at=NOW()
       WHERE provider_id=$1 RETURNING *`,
      [req.params.providerId, str(b.name), str(b.base_url), str(b.launch_url), b.introspect_url !== undefined ? String(b.introspect_url) : null, str(b.secret_env_prefix), str(b.status)]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'provider_not_found' });
    return res.json({ provider: r.rows[0] });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/* ---------------------------------- tests --------------------------------- */

driveAdminRouter.get('/tests', async (_req: Request, res: Response) => {
  try {
    const r = await getPool().query(
      `SELECT t.*, p.code AS provider_code, p.name AS provider_name
         FROM drive_test t LEFT JOIN drive_provider p ON p.provider_id = t.provider_id
        ORDER BY t.created_at DESC`
    );
    return res.json({ tests: r.rows });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

driveAdminRouter.post('/tests', async (req: Request, res: Response) => {
  const b = req.body || {};
  const name = str(b.name);
  const mode = b.mode === 'internal' ? 'internal' : 'external';
  if (!name) return res.status(400).json({ error: 'name_required' });
  if (mode === 'external' && (!str(b.provider_id) || !str(b.provider_exam_id))) {
    return res.status(400).json({ error: 'external_requires_provider_and_exam_id' });
  }
  if (mode === 'internal' && !str(b.skill_slug)) return res.status(400).json({ error: 'internal_requires_skill_slug' });
  try {
    const testSlug = str(b.slug) || `${slug(name)}-${Date.now().toString(36)}`;
    const r = await getPool().query(
      `INSERT INTO drive_test (provider_id, mode, name, slug, provider_exam_id, skill_slug, duration_minutes, total_questions, provider_meta, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        mode === 'external' ? str(b.provider_id) : null, mode, name, testSlug,
        mode === 'external' ? str(b.provider_exam_id) : null, mode === 'internal' ? str(b.skill_slug) : null,
        num(b.duration_minutes), num(b.total_questions), b.provider_meta || {}, str(b.status) || 'active',
      ]
    );
    return res.status(201).json({ test: r.rows[0] });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

driveAdminRouter.patch('/tests/:testId', async (req: Request, res: Response) => {
  const b = req.body || {};
  try {
    const r = await getPool().query(
      `UPDATE drive_test SET
         name=COALESCE($2,name), provider_exam_id=COALESCE($3,provider_exam_id), skill_slug=COALESCE($4,skill_slug),
         duration_minutes=COALESCE($5,duration_minutes), total_questions=COALESCE($6,total_questions),
         provider_meta=COALESCE($7,provider_meta), status=COALESCE($8,status), updated_at=NOW()
       WHERE test_id=$1 RETURNING *`,
      [req.params.testId, str(b.name), str(b.provider_exam_id), str(b.skill_slug), num(b.duration_minutes), num(b.total_questions), b.provider_meta || null, str(b.status)]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'test_not_found' });
    return res.json({ test: r.rows[0] });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/* ---------------------------------- drives -------------------------------- */

driveAdminRouter.get('/', async (req: Request, res: Response) => {
  const scope = collegeScope(req);
  try {
    const r = await getPool().query(
      `SELECT d.*,
              (SELECT COUNT(*) FROM mock_drive_test mdt WHERE mdt.drive_id = d.drive_id)::INT AS test_count,
              (SELECT COUNT(*) FROM drive_registration g WHERE g.drive_id = d.drive_id)::INT AS registration_count
         FROM mock_drive d
        WHERE ($1::text IS NULL OR d.college_id = $1)
        ORDER BY d.created_at DESC`,
      [scope]
    );
    return res.json({ drives: r.rows });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

driveAdminRouter.post('/', async (req: Request, res: Response) => {
  const b = req.body || {};
  const title = str(b.title);
  if (!title) return res.status(400).json({ error: 'title_required' });
  const scope = collegeScope(req);
  try {
    const r = await getPool().query(
      `INSERT INTO mock_drive (college_id, company_id, company_name, title, description, drive_type, season_id,
                               starts_at, ends_at, eligibility, registration_mode, results_visibility, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [
        str(b.college_id) || scope, str(b.company_id), str(b.company_name) || '', title, str(b.description) || '',
        ['mock', 'assessment', 'quiz'].includes(b.drive_type) ? b.drive_type : 'mock', str(b.season_id),
        b.starts_at || null, b.ends_at || null, b.eligibility || {},
        ['open', 'roster', 'invite'].includes(b.registration_mode) ? b.registration_mode : 'open',
        ['immediate', 'after_close', 'manual'].includes(b.results_visibility) ? b.results_visibility : 'after_close',
        'draft', req.userId!,
      ]
    );
    return res.status(201).json({ drive: r.rows[0] });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

async function loadScopedDrive(req: Request): Promise<Record<string, any> | null> {
  const r = await getPool().query(`SELECT * FROM mock_drive WHERE drive_id=$1`, [req.params.driveId]);
  const drive = r.rows[0];
  if (!drive) return null;
  const scope = collegeScope(req);
  if (scope && drive.college_id && drive.college_id !== scope) return null;
  return drive;
}

driveAdminRouter.get('/:driveId', async (req: Request, res: Response) => {
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    const tests = await getPool().query(
      `SELECT t.*, mdt.sort_order, mdt.mandatory, mdt.weight, mdt.max_attempts, mdt.opens_at, mdt.closes_at, mdt.window_hard_close, mdt.unlock_rule
         FROM mock_drive_test mdt JOIN drive_test t ON t.test_id = mdt.test_id
        WHERE mdt.drive_id=$1 ORDER BY mdt.sort_order`,
      [drive.drive_id]
    );
    return res.json({ drive, tests: tests.rows });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

driveAdminRouter.patch('/:driveId', async (req: Request, res: Response) => {
  const b = req.body || {};
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    const r = await getPool().query(
      `UPDATE mock_drive SET
         title=COALESCE($2,title), description=COALESCE($3,description), company_name=COALESCE($4,company_name),
         starts_at=COALESCE($5,starts_at), ends_at=COALESCE($6,ends_at), eligibility=COALESCE($7,eligibility),
         registration_mode=COALESCE($8,registration_mode), results_visibility=COALESCE($9,results_visibility),
         status=COALESCE($10,status), updated_at=NOW()
       WHERE drive_id=$1 RETURNING *`,
      [
        drive.drive_id, str(b.title), b.description !== undefined ? String(b.description) : null, str(b.company_name),
        b.starts_at !== undefined ? b.starts_at : null, b.ends_at !== undefined ? b.ends_at : null, b.eligibility || null,
        str(b.registration_mode), str(b.results_visibility), str(b.status),
      ]
    );
    return res.json({ drive: r.rows[0] });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

driveAdminRouter.post('/:driveId/publish', async (req: Request, res: Response) => {
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    const testCount = await getPool().query(`SELECT COUNT(*)::INT AS n FROM mock_drive_test WHERE drive_id=$1`, [drive.drive_id]);
    if (!Number(testCount.rows[0].n)) return res.status(422).json({ error: 'attach_at_least_one_test' });
    const r = await getPool().query(
      `UPDATE mock_drive SET status='published', updated_at=NOW() WHERE drive_id=$1 RETURNING *`,
      [drive.drive_id]
    );
    return res.json({ drive: r.rows[0] });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

driveAdminRouter.post('/:driveId/tests', async (req: Request, res: Response) => {
  const b = req.body || {};
  const testId = str(b.test_id);
  if (!testId) return res.status(400).json({ error: 'test_id_required' });
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    await getPool().query(
      `INSERT INTO mock_drive_test (drive_id, test_id, sort_order, mandatory, weight, max_attempts, opens_at, closes_at, window_hard_close, unlock_rule)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (drive_id, test_id) DO UPDATE SET sort_order=EXCLUDED.sort_order, mandatory=EXCLUDED.mandatory,
         weight=EXCLUDED.weight, max_attempts=EXCLUDED.max_attempts, opens_at=EXCLUDED.opens_at,
         closes_at=EXCLUDED.closes_at, window_hard_close=EXCLUDED.window_hard_close, unlock_rule=EXCLUDED.unlock_rule`,
      [
        drive.drive_id, testId, num(b.sort_order) ?? 1, b.mandatory !== false, num(b.weight) ?? 1, num(b.max_attempts) ?? 1,
        b.opens_at || null, b.closes_at || null, b.window_hard_close !== false, b.unlock_rule || { kind: 'open' },
      ]
    );
    return res.status(201).json({ ok: true });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

driveAdminRouter.delete('/:driveId/tests/:testId', async (req: Request, res: Response) => {
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    await getPool().query(`DELETE FROM mock_drive_test WHERE drive_id=$1 AND test_id=$2`, [drive.drive_id, req.params.testId]);
    return res.json({ ok: true });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/* ------------------------------ registrations ----------------------------- */

driveAdminRouter.get('/:driveId/registrations', async (req: Request, res: Response) => {
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });

    const search = str(req.query.search);
    const branch = str(req.query.branch);
    const batch = str(req.query.batch);
    const status = str(req.query.status);
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
    const offset = (page - 1) * limit;

    const where = `g.drive_id=$1
      AND ($2::text IS NULL OR g.roll_no ILIKE '%'||$2||'%' OR g.user_id ILIKE '%'||$2||'%')
      AND ($3::text IS NULL OR g.status=$3)
      AND ($4::text IS NULL OR EXISTS (SELECT 1 FROM student_profile sp WHERE sp.user_id=g.user_id AND sp.branch=$4))
      AND ($5::text IS NULL OR EXISTS (SELECT 1 FROM student_profile sp WHERE sp.user_id=g.user_id AND sp.batch=$5))`;

    const [rows, total] = await Promise.all([
      getPool().query(
        `SELECT g.*,
                (SELECT COUNT(*) FROM drive_registration_test drt WHERE drt.registration_id = g.registration_id AND drt.status='completed')::INT AS completed_tests
           FROM drive_registration g WHERE ${where} ORDER BY g.registered_at DESC LIMIT $6 OFFSET $7`,
        [drive.drive_id, search, status, branch, batch, limit, offset]
      ),
      getPool().query(`SELECT COUNT(*)::INT AS n FROM drive_registration g WHERE ${where}`, [
        drive.drive_id, search, status, branch, batch,
      ]),
    ]);
    return res.json({ registrations: rows.rows, total: total.rows[0].n, page, limit });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/**
 * Aggregates for the TPO dashboard. One endpoint, five shapes: the registration
 * funnel, the score/pass summary, per-round breakdown, registrations over time
 * and a score histogram. All pure SQL so the dashboard's numbers are provably
 * derived from the same rows the CSV export uses.
 */
driveAdminRouter.get('/:driveId/stats', async (req: Request, res: Response) => {
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    const id = drive.drive_id;

    const [funnelR, attemptR, roundsR, dailyR, histR] = await Promise.all([
      getPool().query(
        `SELECT
            COUNT(*)::INT AS registered,
            SUM(CASE WHEN g.status IN ('launched','in_progress','completed') THEN 1 ELSE 0 END)::INT AS started,
            SUM(CASE WHEN g.status='completed' THEN 1 ELSE 0 END)::INT AS completed,
            SUM(CASE WHEN g.status='disqualified' THEN 1 ELSE 0 END)::INT AS disqualified
           FROM drive_registration g WHERE g.drive_id=$1`,
        [id]
      ),
      getPool().query(
        `SELECT
            COUNT(*)::INT AS attempts,
            SUM(CASE WHEN a.status='completed' THEN 1 ELSE 0 END)::INT AS attempts_completed,
            AVG(a.percentage) AS avg_score,
            MAX(a.percentage) AS best_score,
            SUM(CASE WHEN a.passed THEN 1 ELSE 0 END)::INT AS passed
           FROM drive_attempt a WHERE a.drive_id=$1`,
        [id]
      ),
      getPool().query(
        `SELECT mdt.test_id, t.name, mdt.sort_order,
            COUNT(DISTINCT g.registration_id)::INT AS assigned,
            SUM(CASE WHEN drt.status='unlocked' THEN 1 ELSE 0 END)::INT AS unlocked,
            SUM(CASE WHEN drt.status='launched' THEN 1 ELSE 0 END)::INT AS launched,
            SUM(CASE WHEN drt.status='in_progress' THEN 1 ELSE 0 END)::INT AS in_progress,
            SUM(CASE WHEN drt.status='completed' THEN 1 ELSE 0 END)::INT AS completed,
            SUM(CASE WHEN drt.status='not_shortlisted' THEN 1 ELSE 0 END)::INT AS not_shortlisted,
            SUM(drt.attempts_used)::INT AS attempts,
            ROUND(AVG(drt.best_percentage),2) AS avg_pct
           FROM mock_drive_test mdt
           JOIN drive_test t ON t.test_id=mdt.test_id
           LEFT JOIN drive_registration g ON g.drive_id=mdt.drive_id
           LEFT JOIN drive_registration_test drt ON drt.registration_id=g.registration_id AND drt.test_id=mdt.test_id
          WHERE mdt.drive_id=$1
          GROUP BY mdt.test_id, t.name, mdt.sort_order ORDER BY mdt.sort_order, t.name`,
        [id]
      ),
      getPool().query(
        `SELECT to_char(g.registered_at, 'YYYY-MM-DD') AS day, COUNT(*)::INT AS count
           FROM drive_registration g WHERE g.drive_id=$1 GROUP BY 1 ORDER BY 1`,
        [id]
      ),
      getPool().query(
        `SELECT (FLOOR(COALESCE(a.percentage,0)/10)*10)::INT AS bucket, COUNT(*)::INT AS count
           FROM drive_attempt a WHERE a.drive_id=$1 AND a.status='completed' GROUP BY 1 ORDER BY 1`,
        [id]
      ),
    ]);

    const funnel = funnelR.rows[0] || { registered: 0, started: 0, completed: 0, disqualified: 0, absent: 0 };
    const att = attemptR.rows[0] || { attempts: 0, attempts_completed: 0, avg_score: null, best_score: null, passed: 0 };
    const registered = funnel.registered || 0;
    const completed = funnel.completed || 0;
    const attemptsCompleted = att.attempts_completed || 0;

    return res.json({
      drive_id: id,
      funnel: {
        registered,
        started: funnel.started || 0,
        completed,
        absent: Math.max(0, registered - (funnel.started || 0)),
        disqualified: funnel.disqualified || 0,
        attendance_pct: registered ? Math.round(((funnel.started || 0) / registered) * 100) : 0,
        completion_pct: registered ? Math.round((completed / registered) * 100) : 0,
      },
      score: {
        attempts: att.attempts || 0,
        attempts_completed: attemptsCompleted,
        avg_score: num(att.avg_score),
        best_score: num(att.best_score),
        passed: att.passed || 0,
        pass_pct: attemptsCompleted ? Math.round(((att.passed || 0) / attemptsCompleted) * 100) : 0,
      },
      rounds: roundsR.rows,
      daily: dailyR.rows,
      score_histogram: histR.rows,
    });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/** Paginated attempt-level results with result filters — feeds the Results tab. */
driveAdminRouter.get('/:driveId/attempts', async (req: Request, res: Response) => {
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    const testId = str(req.query.test_id);
    const result = str(req.query.result);
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
    const offset = (page - 1) * limit;

    const where = `a.drive_id=$1
      AND ($2::text IS NULL OR a.test_id=$2)
      AND ($3::text IS NULL OR
        ($3='passed' AND a.passed AND a.status='completed') OR
        ($3='failed' AND NOT COALESCE(a.passed,false) AND a.status='completed') OR
        ($3='disqualified' AND a.disqualified) OR
        ($3='in_progress' AND a.status='in_progress'))`;

    const [rows, total] = await Promise.all([
      getPool().query(
        `SELECT a.attempt_id, a.test_id, t.name AS test_name, a.user_id, g.roll_no,
                a.status, a.score, a.max_score, a.percentage, a.passed, a.disqualified,
                a.started_at, a.submitted_at
           FROM drive_attempt a
           JOIN drive_test t ON t.test_id=a.test_id
           LEFT JOIN drive_registration g ON g.drive_id=a.drive_id AND g.user_id=a.user_id
          WHERE ${where}
          ORDER BY a.submitted_at DESC NULLS LAST LIMIT $4 OFFSET $5`,
        [drive.drive_id, testId, result, limit, offset]
      ),
      getPool().query(`SELECT COUNT(*)::INT AS n FROM drive_attempt a WHERE ${where}`, [
        drive.drive_id, testId, result,
      ]),
    ]);
    return res.json({ attempts: rows.rows, total: total.rows[0].n, page, limit });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

driveAdminRouter.post('/:driveId/registrations', async (req: Request, res: Response) => {
  const b = req.body || {};
  const userId = str(b.user_id);
  if (!userId) return res.status(400).json({ error: 'user_id_required' });
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    const scope = collegeScope(req);
    const r = await getPool().query(
      `INSERT INTO drive_registration (drive_id, user_id, roll_no, college_id, status, eligibility_checked)
       VALUES ($1,$2,$3,$4,'registered',TRUE)
       ON CONFLICT (drive_id, user_id) DO UPDATE SET status='registered', updated_at=NOW()
       RETURNING *`,
      [drive.drive_id, userId, str(b.roll_no), str(b.college_id) || drive.college_id || scope]
    );
    await getPool().query(
      `INSERT INTO drive_registration_test (registration_id, test_id, status)
         SELECT $2, mdt.test_id, CASE WHEN (mdt.unlock_rule->>'kind')='open' OR mdt.unlock_rule IS NULL THEN 'unlocked' ELSE 'locked' END
           FROM mock_drive_test mdt WHERE mdt.drive_id=$1
       ON CONFLICT (registration_id, test_id) DO NOTHING`,
      [drive.drive_id, r.rows[0].registration_id]
    );
    return res.status(201).json({ registration: r.rows[0] });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/**
 * Roster import. Rows are matched to TieEdu users by roll_no through
 * placement_student_link (the same key the TPO portal already uses), so an
 * operator imports a CSV of roll numbers and gets registrations without having
 * to know internal user ids.
 */
driveAdminRouter.post('/:driveId/registrations/import', async (req: Request, res: Response) => {
  const rows: any[] = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (!rows.length) return res.status(400).json({ error: 'rows_required' });
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    const scope = collegeScope(req);
    const results: any[] = [];
    for (const row of rows) {
      const rollNo = str(row.roll_no);
      if (!rollNo) {
        results.push({ roll_no: null, skipped: 'missing_roll_no' });
        continue;
      }
      const link = await getPool().query(
        `SELECT user_id, college_id FROM placement_student_link WHERE roll_no=$1 AND ($2::text IS NULL OR college_id=$2) LIMIT 1`,
        [rollNo, str(row.college_id) || drive.college_id || scope]
      );
      const userId = link.rows[0]?.user_id;
      if (!userId) {
        results.push({ roll_no: rollNo, skipped: 'no_linked_user' });
        continue;
      }
      const reg = await getPool().query(
        `INSERT INTO drive_registration (drive_id, user_id, roll_no, college_id, status, eligibility_checked)
         VALUES ($1,$2,$3,$4,'registered',FALSE) ON CONFLICT (drive_id, user_id) DO UPDATE SET roll_no=EXCLUDED.roll_no
         RETURNING registration_id`,
        [drive.drive_id, userId, rollNo, link.rows[0].college_id || drive.college_id || scope]
      );
      await getPool().query(
        `INSERT INTO drive_registration_test (registration_id, test_id, status)
           SELECT $2, mdt.test_id, CASE WHEN (mdt.unlock_rule->>'kind')='open' OR mdt.unlock_rule IS NULL THEN 'unlocked' ELSE 'locked' END
             FROM mock_drive_test mdt WHERE mdt.drive_id=$1
         ON CONFLICT (registration_id, test_id) DO NOTHING`,
        [drive.drive_id, reg.rows[0].registration_id]
      );
      results.push({ roll_no: rollNo, user_id: userId, registered: true });
    }
    return res.json({ imported: results.filter((r) => r.registered).length, results });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

driveAdminRouter.post('/:driveId/invites', async (req: Request, res: Response) => {
  const b = req.body || {};
  const email = str(b.email);
  const rollNo = str(b.roll_no);
  if (!email && !rollNo) return res.status(400).json({ error: 'email_or_roll_no_required' });
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    const token = crypto.randomUUID();
    const days = num(b.expires_in_days) ?? 14;
    const r = await getPool().query(
      `INSERT INTO drive_invite (token, drive_id, college_id, email, roll_no, invited_by, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6, NOW() + ($7 || ' days')::interval) RETURNING token, expires_at`,
      [token, drive.drive_id, str(b.college_id) || drive.college_id, email, rollNo, req.userId!, String(days)]
    );
    return res.status(201).json({ invite: r.rows[0] });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

driveAdminRouter.post('/:driveId/shortlist', async (req: Request, res: Response) => {
  const b = req.body || {};
  const testId = str(b.test_id);
  const userIds: string[] = Array.isArray(b.user_ids) ? b.user_ids.map(String) : [];
  if (!testId || !userIds.length) return res.status(400).json({ error: 'test_id_and_user_ids_required' });
  const shortlisted = b.shortlisted !== false;
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    const status = shortlisted ? 'unlocked' : 'not_shortlisted';
    const r = await getPool().query(
      `UPDATE drive_registration_test drt
          SET status=$3, updated_at=NOW()
         FROM drive_registration g
        WHERE drt.registration_id = g.registration_id AND g.drive_id=$1 AND drt.test_id=$2 AND g.user_id = ANY($4::text[])
        RETURNING drt.registration_id`,
      [drive.drive_id, testId, status, userIds]
    );
    return res.json({ updated: r.rowCount });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/* --------------------------------- results -------------------------------- */

driveAdminRouter.get('/:driveId/results', async (req: Request, res: Response) => {
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    const r = await getPool().query(
      `SELECT g.user_id, g.roll_no, g.status AS registration_status,
              json_agg(json_build_object(
                'test_id', drt.test_id, 'status', drt.status,
                'attempts_used', drt.attempts_used, 'best_percentage', drt.best_percentage
              ) ORDER BY drt.test_id) AS tests
         FROM drive_registration g
         LEFT JOIN drive_registration_test drt ON drt.registration_id = g.registration_id
        WHERE g.drive_id=$1 GROUP BY g.registration_id, g.user_id, g.roll_no, g.status
        ORDER BY g.roll_no NULLS LAST`,
      [drive.drive_id]
    );
    return res.json({ drive_id: drive.drive_id, results: r.rows });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

driveAdminRouter.get('/:driveId/results.csv', async (req: Request, res: Response) => {
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    const r = await getPool().query(
      `SELECT a.user_id, a.roll_no, a.test_id, t.name AS test_name, a.status, a.score, a.max_score, a.percentage, a.passed, a.submitted_at
         FROM drive_attempt a LEFT JOIN drive_test t ON t.test_id = a.test_id
        WHERE a.drive_id=$1 ORDER BY a.roll_no NULLS LAST, t.name`,
      [drive.drive_id]
    );
    const csv = toCsv(r.rows, ['user_id', 'roll_no', 'test_id', 'test_name', 'status', 'score', 'max_score', 'percentage', 'passed', 'submitted_at']);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="drive-${drive.drive_id}-results.csv"`);
    return res.send(csv);
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

driveAdminRouter.post('/:driveId/publish-results', async (req: Request, res: Response) => {
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    const r = await getPool().query(
      `UPDATE mock_drive SET results_published=TRUE, results_published_at=NOW(), updated_at=NOW() WHERE drive_id=$1 RETURNING *`,
      [drive.drive_id]
    );
    return res.json({ drive: r.rows[0] });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

driveAdminRouter.get('/:driveId/events/unmatched', async (req: Request, res: Response) => {
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    const r = await getPool().query(
      `SELECT * FROM drive_webhook_event WHERE status IN ('unmatched','failed') ORDER BY received_at DESC LIMIT 200`
    );
    return res.json({ events: r.rows });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

export default driveAdminRouter;
