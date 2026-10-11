import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getPool } from '../db/client';
import { loadDb } from '../data/db';
import { bridgeUnavailable } from '../lib/bridge/core';
import { emitDriveNotification, emitDriveNotificationBulk } from '../lib/driveNotify';
import { sendDriveEmailBulk } from '../lib/driveEmail';
import { unlockRoundsAfterPayment } from './drives.routes';

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
/** Sanitizes a JSONB body field so an arbitrary string can never reach Postgres as a JSON type. */
function json(v: any, fallback: Record<string, any> | any[]): Record<string, any> | any[] | null {
  if (v === undefined) return null;
  if (v === null) return fallback;
  if (typeof v === 'object') return v;
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      if (p && typeof p === 'object') return p;
    } catch { /* fall through */ }
  }
  return fallback;
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
                               starts_at, ends_at, eligibility, registration_mode, results_visibility, status, created_by,
                               company_logo_url, location, job_type, category, job_function, ctc_min, ctc_max,
                               description_md, additional_info_md, other_info, documents, tpo_contact,
                               registration_opens_at, registration_closes_at, fee_amount_paise)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
               $15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29) RETURNING *`,
      [
        str(b.college_id) || scope, str(b.company_id), str(b.company_name) || '', title, str(b.description) || '',
        ['mock', 'assessment', 'quiz'].includes(b.drive_type) ? b.drive_type : 'mock', str(b.season_id),
        b.starts_at || null, b.ends_at || null, b.eligibility || {},
        ['open', 'roster', 'invite'].includes(b.registration_mode) ? b.registration_mode : 'open',
        ['immediate', 'after_close', 'manual'].includes(b.results_visibility) ? b.results_visibility : 'after_close',
        'draft', req.userId!,
        // Section 15 enrichment fields (mirrors driveBridgeMigrate.ensureMockDriveExtColumns).
        str(b.company_logo_url), str(b.location), str(b.job_type), str(b.category), str(b.job_function),
        num(b.ctc_min), num(b.ctc_max),
        str(b.description_md), str(b.additional_info_md),
        json(b.other_info, {}) || {}, json(b.documents, []) || [], json(b.tpo_contact, {}) || {},
        b.registration_opens_at || null, b.registration_closes_at || null,
        Math.max(0, Number(b.fee_amount_paise) || 0),
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
      `SELECT t.*, mdt.sort_order, mdt.mandatory, mdt.weight, mdt.max_attempts, mdt.opens_at, mdt.closes_at, mdt.window_hard_close, mdt.unlock_rule,
              mdt.round_name, mdt.kind, mdt.round_description
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
         status=COALESCE($10,status),
         company_logo_url=COALESCE($11,company_logo_url), location=COALESCE($12,location),
         job_type=COALESCE($13,job_type), category=COALESCE($14,category), job_function=COALESCE($15,job_function),
         ctc_min=COALESCE($16,ctc_min), ctc_max=COALESCE($17,ctc_max),
         description_md=COALESCE($18,description_md), additional_info_md=COALESCE($19,additional_info_md),
         other_info=COALESCE($20,other_info), documents=COALESCE($21,documents), tpo_contact=COALESCE($22,tpo_contact),
         registration_opens_at=COALESCE($23,registration_opens_at),
         registration_closes_at=COALESCE($24,registration_closes_at),
         fee_amount_paise=COALESCE($25,fee_amount_paise),
         updated_at=NOW()
       WHERE drive_id=$1 RETURNING *`,
      [
        drive.drive_id, str(b.title), b.description !== undefined ? String(b.description) : null, str(b.company_name),
        b.starts_at !== undefined ? b.starts_at : null, b.ends_at !== undefined ? b.ends_at : null, b.eligibility || null,
        str(b.registration_mode), str(b.results_visibility), str(b.status),
        str(b.company_logo_url), str(b.location), str(b.job_type), str(b.category), str(b.job_function),
        b.ctc_min !== undefined ? num(b.ctc_min) : null, b.ctc_max !== undefined ? num(b.ctc_max) : null,
        b.description_md !== undefined ? str(b.description_md) : null,
        b.additional_info_md !== undefined ? str(b.additional_info_md) : null,
        json(b.other_info, {}), json(b.documents, []), json(b.tpo_contact, {}),
        b.registration_opens_at !== undefined ? b.registration_opens_at : null,
        b.registration_closes_at !== undefined ? b.registration_closes_at : null,
        b.fee_amount_paise !== undefined ? Math.max(0, Number(b.fee_amount_paise) || 0) : null,
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
    // Roster/invite drives pre-create registrations — tell those students the
    // drive they were added to is now open. Never blocks the publish.
    const regs = await getPool().query(`SELECT user_id FROM drive_registration WHERE drive_id=$1`, [drive.drive_id]);
    if (regs.rows.length) {
      await emitDriveNotificationBulk(
        regs.rows.map((x) => x.user_id),
        {
          driveId: drive.drive_id,
          kind: 'drive_published',
          title: 'Drive is live',
          body: `${drive.title} is now open — check the rounds and register your interest.`,
          url: `/mock-drive/drives/${drive.drive_id}`,
          dedupePrefix: `drive_published:${drive.drive_id}`,
        }
      );
    }
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
      `INSERT INTO mock_drive_test (drive_id, test_id, sort_order, mandatory, weight, max_attempts, opens_at, closes_at, window_hard_close, unlock_rule, round_name, kind)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (drive_id, test_id) DO UPDATE SET sort_order=EXCLUDED.sort_order, mandatory=EXCLUDED.mandatory,
         weight=EXCLUDED.weight, max_attempts=EXCLUDED.max_attempts, opens_at=EXCLUDED.opens_at,
         closes_at=EXCLUDED.closes_at, window_hard_close=EXCLUDED.window_hard_close, unlock_rule=EXCLUDED.unlock_rule,
         round_name=EXCLUDED.round_name, kind=EXCLUDED.kind`,
      [
        drive.drive_id, testId, num(b.sort_order) ?? 1, b.mandatory !== false, num(b.weight) ?? 1, num(b.max_attempts) ?? 1,
        b.opens_at || null, b.closes_at || null, b.window_hard_close !== false, b.unlock_rule || { kind: 'open' },
        str(b.round_name), str(b.kind),
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
      AND ($2::text IS NULL OR g.roll_no ILIKE '%'||$2||'%' OR g.user_id ILIKE '%'||$2||'%' OR g.contact_phone ILIKE '%'||$2||'%')
      AND ($3::text IS NULL OR g.status=$3)
      AND ($4::text IS NULL OR EXISTS (SELECT 1 FROM student_profile sp WHERE sp.user_id=g.user_id AND sp.branch=$4))
      AND ($5::text IS NULL OR EXISTS (SELECT 1 FROM student_profile sp WHERE sp.user_id=g.user_id AND sp.batch=$5))`;

    const [rows, total] = await Promise.all([
      getPool().query(
        `SELECT g.*,
                (SELECT sp.branch FROM student_profile sp WHERE sp.user_id=g.user_id ORDER BY sp.updated_at DESC LIMIT 1) AS branch,
                (SELECT sp.batch FROM student_profile sp WHERE sp.user_id=g.user_id ORDER BY sp.updated_at DESC LIMIT 1) AS batch,
                (SELECT COUNT(*) FROM drive_registration_test drt WHERE drt.registration_id = g.registration_id AND drt.status='completed')::INT AS completed_tests,
                (SELECT p.status FROM drive_payment p WHERE p.registration_id = g.registration_id ORDER BY p.created_at DESC LIMIT 1) AS payment_status,
                (SELECT p.utr FROM drive_payment p WHERE p.registration_id = g.registration_id ORDER BY p.created_at DESC LIMIT 1) AS utr,
                bk.status AS booking_status, bk.link_assigned_at, bk.link_active_at,
                sl.slot_date, sl.starts_at AS slot_starts_at, sl.ends_at AS slot_ends_at
           FROM drive_registration g
           LEFT JOIN drive_slot_booking bk ON bk.registration_id = g.registration_id AND bk.status <> 'cancelled'
           LEFT JOIN drive_slot sl ON sl.slot_id = bk.slot_id
          WHERE ${where} ORDER BY g.registered_at DESC LIMIT $6 OFFSET $7`,
        [drive.drive_id, search, status, branch, batch, limit, offset]
      ),
      getPool().query(`SELECT COUNT(*)::INT AS n FROM drive_registration g WHERE ${where}`, [
        drive.drive_id, search, status, branch, batch,
      ]),
    ]);
    // Name/email live in the JSON user store, not Postgres — hydrate here so
    // the roster shows who the student actually is, not just their user id.
    const users = new Map<string, { name?: string; email?: string }>();
    try {
      for (const u of (loadDb().users || []) as any[]) if (u?.id) users.set(u.id, u);
    } catch { /* listing must not fail on the JSON store */ }
    const registrations = rows.rows.map((r: any) => {
      const u = users.get(r.user_id);
      return { ...r, name: u?.name || '', email: u?.email || '' };
    });
    return res.json({ registrations, total: total.rows[0].n, page, limit });
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
    const regs = await getPool().query(`SELECT user_id FROM drive_registration WHERE drive_id=$1`, [drive.drive_id]);
    if (regs.rows.length) {
      await emitDriveNotificationBulk(
        regs.rows.map((x) => x.user_id),
        {
          driveId: drive.drive_id,
          kind: 'results_published',
          title: 'Results are out',
          body: `${drive.title} — your result is now visible in Assessments.`,
          url: `/mock-drive/assessments`,
          dedupePrefix: `results_published:${drive.drive_id}`,
        }
      );
    }
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

/* --------------------------- round management ----------------------------- */

// Full round editor: every workflow field a attached test can carry. Partial
// PATCH — omitted keys keep their stored value (same COALESCE contract as the
// drive PATCH above).
driveAdminRouter.patch('/:driveId/tests/:testId', async (req: Request, res: Response) => {
  const b = req.body || {};
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    const r = await getPool().query(
      `UPDATE mock_drive_test SET
         round_name=COALESCE($3, round_name),
         kind=COALESCE($4, kind),
         sort_order=COALESCE($5, sort_order),
         mandatory=COALESCE($6, mandatory),
         max_attempts=COALESCE($7, max_attempts),
         opens_at=COALESCE($8, opens_at),
         closes_at=COALESCE($9, closes_at),
         window_hard_close=COALESCE($10, window_hard_close),
         unlock_rule=COALESCE($11, unlock_rule),
         round_description=COALESCE($12, round_description)
       WHERE drive_id=$1 AND test_id=$2
       RETURNING *`,
      [
        drive.drive_id, req.params.testId,
        str(b.round_name), str(b.kind),
        b.sort_order !== undefined && b.sort_order !== null && b.sort_order !== '' ? num(b.sort_order) : null,
        typeof b.mandatory === 'boolean' ? b.mandatory : null,
        b.max_attempts !== undefined && b.max_attempts !== null && b.max_attempts !== '' ? num(b.max_attempts) : null,
        b.opens_at !== undefined ? b.opens_at : null,
        b.closes_at !== undefined ? b.closes_at : null,
        typeof b.window_hard_close === 'boolean' ? b.window_hard_close : null,
        b.unlock_rule !== undefined ? json(b.unlock_rule, {}) : null,
        b.round_description !== undefined ? String(b.round_description) : null,
      ]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'round_not_found' });
    return res.json({ round: r.rows[0] });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/* ----------------------------- drive lifecycle ---------------------------- */

// Unpublish = back to draft. Students only ever see status IN
// ('published','live'), so this hides the drive from every list and home feed
// immediately, without touching registrations or rounds.
driveAdminRouter.post('/:driveId/unpublish', async (req: Request, res: Response) => {
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    const r = await getPool().query(
      `UPDATE mock_drive SET status='draft', updated_at=NOW() WHERE drive_id=$1 RETURNING drive_id, status`,
      [drive.drive_id]
    );
    return res.json({ drive: r.rows[0] });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

// Hard delete. Everything attached (rounds, registrations, slots, payments)
// cascades — but a drive with real attempts is a record of results, so it is
// refused rather than destroyed: close it instead.
driveAdminRouter.delete('/:driveId', async (req: Request, res: Response) => {
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    const a = await getPool().query(`SELECT COUNT(*)::INT AS n FROM drive_attempt WHERE drive_id=$1`, [drive.drive_id]);
    if (Number(a.rows[0]?.n || 0) > 0) return res.status(409).json({ error: 'drive_has_attempts' });
    await getPool().query(`DELETE FROM mock_drive WHERE drive_id=$1`, [drive.drive_id]);
    return res.json({ ok: true, deleted_drive_id: drive.drive_id });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/* ------------------------------ notify students --------------------------- */

// Admin-authored update to everyone tied to a drive. Audience is deliberately
// the drive's registrations only — an open drive's "everyone" would be the whole
// platform, which is what the Broadcast tab is for.
driveAdminRouter.post('/:driveId/notify', async (req: Request, res: Response) => {
  const b = req.body || {};
  const title = str(b.title);
  const bodyText = str(b.body);
  if (!title) return res.status(400).json({ error: 'title_required' });
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    const regs = await getPool().query(`SELECT user_id FROM drive_registration WHERE drive_id=$1`, [drive.drive_id]);
    const userIds = regs.rows.map((r) => r.user_id);
    if (!userIds.length) return res.status(422).json({ error: 'no_audience' });
    const written = await emitDriveNotificationBulk(userIds, {
      driveId: drive.drive_id,
      kind: 'admin_update',
      title,
      body: bodyText || '',
      url: `/mock-drive/drives/${drive.drive_id}`,
      // No dedupe prefix: admins may legitimately re-send an update.
    });
    return res.json({ ok: true, notified: written });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/* --------------------------- payments & slots (admin) ---------------------- */

const PAYMENT_PROOF_DIR = path.join(__dirname, '../../uploads/payment-proofs');

/** Same `12 Oct, 10:00 AM` (IST) rendering the student surfaces use. */
function fmtIst(value: string | Date | null): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  });
}

/** IST calendar date of a timestamp (`2026-10-12`) for the slot_date column. */
function istDateOf(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() + 330 * 60000).toISOString().slice(0, 10);
}

/** JSON-file user lookup for display names; never fails a listing. */
function userEmail(userId: string): string {
  try {
    const db = loadDb();
    const u: any = (db.users || []).find((x: any) => x?.id === userId);
    return u?.email || '';
  } catch {
    return '';
  }
}

/** GET /:driveId/payments?status= — payment ledger (newest + pending first). */
driveAdminRouter.get('/:driveId/payments', async (req: Request, res: Response) => {
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });

    const status = str(req.query.status);
    const params: any[] = [drive.drive_id];
    let where = `p.drive_id = $1`;
    if (status && status !== 'all') {
      params.push(status);
      where += ` AND p.status = $${params.length}`;
    }

    const r = await getPool().query(
      `SELECT p.payment_id, p.user_id, p.amount_paise, p.status, p.utr, p.proof_name,
              p.reviewer_note, p.reviewed_by, p.reviewed_at, p.created_at, p.registration_id,
              r.status AS registration_status, r.roll_no
         FROM drive_payment p
         LEFT JOIN drive_registration r ON r.registration_id = p.registration_id
        WHERE ${where}
        ORDER BY (p.status = 'submitted') DESC, p.created_at DESC
        LIMIT 500`,
      params
    );
    const countsR = await getPool().query(
      `SELECT COUNT(*) FILTER (WHERE status='submitted')::INT AS submitted,
              COUNT(*) FILTER (WHERE status='approved')::INT AS approved,
              COUNT(*) FILTER (WHERE status='rejected')::INT AS rejected
         FROM drive_payment WHERE drive_id=$1`,
      [drive.drive_id]
    );
    return res.json({
      fee_amount_paise: Number(drive.fee_amount_paise || 0),
      counts: countsR.rows[0],
      payments: r.rows.map((p) => ({ ...p, user_email: userEmail(p.user_id) })),
    });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/** GET /:driveId/payments/:paymentId/proof — streams the uploaded screenshot. */
driveAdminRouter.get('/:driveId/payments/:paymentId/proof', async (req: Request, res: Response) => {
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    const pR = await getPool().query(
      `SELECT proof_file, proof_name FROM drive_payment WHERE payment_id=$1 AND drive_id=$2`,
      [req.params.paymentId, drive.drive_id]
    );
    const p = pR.rows[0];
    if (!p?.proof_file || !/^[a-z0-9.\-]+$/i.test(p.proof_file)) return res.status(404).json({ error: 'proof_not_found' });
    const file = path.join(PAYMENT_PROOF_DIR, p.proof_file);
    if (!fs.existsSync(file)) return res.status(404).json({ error: 'proof_not_found' });
    const ext = path.extname(file).toLowerCase();
    const types: Record<string, string> = { '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.heic': 'image/heic' };
    res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${String(p.proof_name || 'proof').replace(/["\\]/g, '')}"`);
    return fs.createReadStream(file).pipe(res);
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/** POST /:driveId/payments/:paymentId/approve — proof → payment_approved. */
driveAdminRouter.post('/:driveId/payments/:paymentId/approve', async (req: Request, res: Response) => {
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    const pR = await getPool().query(
      `SELECT * FROM drive_payment WHERE payment_id=$1 AND drive_id=$2`,
      [req.params.paymentId, drive.drive_id]
    );
    const payment = pR.rows[0];
    if (!payment) return res.status(404).json({ error: 'payment_not_found' });
    if (payment.status !== 'submitted') return res.status(409).json({ error: 'payment_already_reviewed', status: payment.status });

    await getPool().query(
      `UPDATE drive_payment SET status='approved', reviewer_note=$2, reviewed_by=$3, reviewed_at=NOW(), updated_at=NOW() WHERE payment_id=$1`,
      [payment.payment_id, str(req.body?.note) || null, req.userId!]
    );
    const upd = await getPool().query(
      `UPDATE drive_registration SET status='payment_approved', updated_at=NOW()
        WHERE registration_id=$1 AND status IN ('payment_pending','payment_submitted','payment_rejected')
        RETURNING user_id`,
      [payment.registration_id]
    );
    if (upd.rows[0]) await unlockRoundsAfterPayment(drive.drive_id, payment.registration_id);
    await emitDriveNotification({
      userId: payment.user_id,
      driveId: drive.drive_id,
      kind: 'payment_approved',
      title: 'Payment approved',
      body: `Your ₹${Number(payment.amount_paise) / 100} payment for ${drive.title} is approved — book your test slot now.`,
      url: `/mock-drive/drives/${drive.drive_id}`,
      dedupeKey: `payment_approved:${payment.payment_id}`,
    });
    return res.json({ ok: true, registration_status: upd.rows[0] ? 'payment_approved' : undefined });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/** POST /:driveId/payments/:paymentId/reject — back to payment_rejected + note. */
driveAdminRouter.post('/:driveId/payments/:paymentId/reject', async (req: Request, res: Response) => {
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    const pR = await getPool().query(
      `SELECT * FROM drive_payment WHERE payment_id=$1 AND drive_id=$2`,
      [req.params.paymentId, drive.drive_id]
    );
    const payment = pR.rows[0];
    if (!payment) return res.status(404).json({ error: 'payment_not_found' });
    if (payment.status !== 'submitted') return res.status(409).json({ error: 'payment_already_reviewed', status: payment.status });

    const note = str(req.body?.note);
    await getPool().query(
      `UPDATE drive_payment SET status='rejected', reviewer_note=$2, reviewed_by=$3, reviewed_at=NOW(), updated_at=NOW() WHERE payment_id=$1`,
      [payment.payment_id, note, req.userId!]
    );
    await getPool().query(
      `UPDATE drive_registration SET status='payment_rejected', updated_at=NOW()
        WHERE registration_id=$1 AND status IN ('payment_submitted','payment_pending')`,
      [payment.registration_id]
    );
    await emitDriveNotification({
      userId: payment.user_id,
      driveId: drive.drive_id,
      kind: 'payment_rejected',
      title: 'Payment needs a fix',
      body: note ? `Payment rejected: ${note}` : 'Your payment proof was rejected — please re-upload a clear screenshot.',
      url: `/mock-drive/drives/${drive.drive_id}`,
      dedupeKey: `payment_rejected:${payment.payment_id}:${Date.now()}`,
    });
    return res.json({ ok: true, registration_status: 'payment_rejected' });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/** GET /:driveId/slots — every slot with live booked counts. */
driveAdminRouter.get('/:driveId/slots', async (req: Request, res: Response) => {
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    const r = await getPool().query(
      `SELECT s.slot_id, s.slot_date, s.starts_at, s.ends_at, s.capacity, s.status, s.created_at,
              (SELECT COUNT(*)::INT FROM drive_slot_booking b WHERE b.slot_id=s.slot_id AND b.status <> 'cancelled') AS booked
         FROM drive_slot s WHERE s.drive_id=$1 ORDER BY s.starts_at`,
      [drive.drive_id]
    );
    return res.json({ slots: r.rows });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/** POST /:driveId/slots — one hand-made slot. Times arrive as ISO (admin tz). */
driveAdminRouter.post('/:driveId/slots', async (req: Request, res: Response) => {
  const b = req.body || {};
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    const starts = new Date(String(b.starts_at || ''));
    const ends = new Date(String(b.ends_at || ''));
    if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime()) || ends.getTime() <= starts.getTime()) {
      return res.status(422).json({ error: 'invalid_slot_window' });
    }
    const capacity = Math.max(1, Math.min(500, Number(b.capacity) || 50));
    const ins = await getPool().query(
      `INSERT INTO drive_slot (drive_id, slot_date, starts_at, ends_at, capacity, status)
       VALUES ($1,$2,$3,$4,$5,'open') RETURNING *`,
      [drive.drive_id, istDateOf(starts.toISOString()), starts.toISOString(), ends.toISOString(), capacity]
    );
    return res.status(201).json({ slot: { ...ins.rows[0], booked: 0 } });
  } catch (err: any) {
    if (err?.code === '23505') return res.status(409).json({ error: 'slot_exists' });
    return bridgeUnavailable(res, err);
  }
});

/** POST /:driveId/slots/generate — {start_date, days, times[], capacity, duration_minutes} */
driveAdminRouter.post('/:driveId/slots/generate', async (req: Request, res: Response) => {
  const b = req.body || {};
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });

    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(b.start_date || ''));
    if (!m) return res.status(422).json({ error: 'start_date_required', message: 'Use YYYY-MM-DD.' });
    const days = Math.max(1, Math.min(14, Number(b.days) || 5));
    const capacity = Math.max(1, Math.min(500, Number(b.capacity) || 50));
    const duration = Math.max(15, Math.min(480, Number(b.duration_minutes) || 120));
    const times = Array.isArray(b.times) ? b.times.map((t: any) => String(t)).filter((t: string) => /^\d{2}:\d{2}$/.test(t)) : [];
    if (!times.length) return res.status(422).json({ error: 'times_required', message: 'Give at least one HH:MM start time.' });

    const base = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    let created = 0;
    for (let day = 0; day < days; day++) {
      const dayMs = base + day * 86400000;
      const dateStr = new Date(dayMs).toISOString().slice(0, 10);
      for (const t of times) {
        const [hh, mm] = t.split(':').map(Number);
        const startMs = dayMs + hh * 3600000 + mm * 60000 - 330 * 60000; // HH:MM interpreted as IST
        const starts = new Date(startMs);
        const ends = new Date(startMs + duration * 60000);
        const r = await getPool().query(
          `INSERT INTO drive_slot (drive_id, slot_date, starts_at, ends_at, capacity, status)
           VALUES ($1,$2,$3,$4,$5,'open') ON CONFLICT (drive_id, starts_at) DO NOTHING RETURNING slot_id`,
          [drive.drive_id, dateStr, starts.toISOString(), ends.toISOString(), capacity]
        );
        if (r.rows.length) created++;
      }
    }
    return res.status(201).json({ ok: true, created });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/** PATCH /:driveId/slots/:slotId — capacity / open / closed. */
driveAdminRouter.patch('/:driveId/slots/:slotId', async (req: Request, res: Response) => {
  const b = req.body || {};
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    const sR = await getPool().query(`SELECT * FROM drive_slot WHERE slot_id=$1 AND drive_id=$2`, [req.params.slotId, drive.drive_id]);
    const slot = sR.rows[0];
    if (!slot) return res.status(404).json({ error: 'slot_not_found' });

    const capacity = b.capacity !== undefined ? Math.max(1, Math.min(500, Number(b.capacity) || 0)) : Number(slot.capacity);
    if (!capacity) return res.status(422).json({ error: 'invalid_capacity' });
    const status = b.status !== undefined ? (['open', 'closed'].includes(String(b.status)) ? String(b.status) : null) : slot.status;
    if (!status) return res.status(422).json({ error: 'invalid_status' });

    const upd = await getPool().query(
      `UPDATE drive_slot SET capacity=$2, status=$3 WHERE slot_id=$1 RETURNING *`,
      [slot.slot_id, capacity, status]
    );
    const bookedR = await getPool().query(
      `SELECT COUNT(*)::INT AS n FROM drive_slot_booking WHERE slot_id=$1 AND status <> 'cancelled'`,
      [slot.slot_id]
    );
    return res.json({ slot: { ...upd.rows[0], booked: bookedR.rows[0].n } });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/** DELETE /:driveId/slots/:slotId — only while it has no bookings. */
driveAdminRouter.delete('/:driveId/slots/:slotId', async (req: Request, res: Response) => {
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    const sR = await getPool().query(`SELECT * FROM drive_slot WHERE slot_id=$1 AND drive_id=$2`, [req.params.slotId, drive.drive_id]);
    if (!sR.rows[0]) return res.status(404).json({ error: 'slot_not_found' });
    const bkR = await getPool().query(
      `SELECT COUNT(*)::INT AS n FROM drive_slot_booking WHERE slot_id=$1 AND status <> 'cancelled'`,
      [req.params.slotId]
    );
    if (Number(bkR.rows[0].n) > 0) return res.status(409).json({ error: 'slot_has_bookings' });
    await getPool().query(`DELETE FROM drive_slot WHERE slot_id=$1`, [req.params.slotId]);
    return res.json({ ok: true });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/** GET /:driveId/bookings — seats with student + slot context. */
driveAdminRouter.get('/:driveId/bookings', async (req: Request, res: Response) => {
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    const r = await getPool().query(
      `SELECT b.booking_id, b.user_id, b.status, b.round_name, b.test_url, b.access_code,
              b.link_assigned_at, b.link_active_at, b.created_at, b.registration_id,
              s.slot_id, s.slot_date, s.starts_at, s.ends_at, s.capacity,
              reg.roll_no, reg.status AS registration_status, reg.contact_phone,
              (SELECT p.status FROM drive_payment p WHERE p.registration_id = reg.registration_id ORDER BY p.created_at DESC LIMIT 1) AS payment_status
         FROM drive_slot_booking b
         JOIN drive_slot s ON s.slot_id = b.slot_id
         LEFT JOIN drive_registration reg ON reg.registration_id = b.registration_id
        WHERE b.drive_id=$1
        ORDER BY s.starts_at, b.created_at DESC`,
      [drive.drive_id]
    );
    const users = new Map<string, { name?: string; email?: string }>();
    try {
      for (const u of (loadDb().users || []) as any[]) if (u?.id) users.set(u.id, u);
    } catch { /* listing must not fail on the JSON store */ }
    return res.json({
      server_now: new Date().toISOString(),
      bookings: r.rows.map((bk) => {
        const u = users.get(bk.user_id);
        return { ...bk, user_email: u?.email || '', user_name: u?.name || '' };
      }),
    });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

async function loadBookingScoped(req: Request, drive: Record<string, any>) {
  const r = await getPool().query(
    `SELECT * FROM drive_slot_booking WHERE booking_id=$1 AND drive_id=$2`,
    [req.params.bookingId, drive.drive_id]
  );
  return r.rows[0] || null;
}

async function loadScopedSlot(req: Request, drive: Record<string, any>) {
  const r = await getPool().query(
    `SELECT * FROM drive_slot WHERE slot_id=$1 AND drive_id=$2`,
    [req.params.slotId, drive.drive_id]
  );
  return r.rows[0] || null;
}

/**
 * POST /:driveId/slots/:slotId/assign — attach round + URL to every live
 * booking in the slot in one call. A 50-seat slot must not mean 50 admin
 * round-trips; status transitions are the same as the per-booking path.
 */
driveAdminRouter.post('/:driveId/slots/:slotId/assign', async (req: Request, res: Response) => {
  const b = req.body || {};
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    const slot = await loadScopedSlot(req, drive);
    if (!slot) return res.status(404).json({ error: 'slot_not_found' });

    const roundName = str(b.round_name);
    const testUrl = str(b.test_url);
    const accessCode = str(b.access_code);
    if (!roundName && !testUrl) return res.status(422).json({ error: 'round_or_url_required' });

    const upd = await getPool().query(
      `UPDATE drive_slot_booking
          SET status='link_assigned', link_assigned_at=NOW(),
              round_name=COALESCE($3, round_name), test_url=COALESCE($4, test_url),
              access_code=COALESCE($5, access_code), updated_at=NOW()
        WHERE slot_id=$1 AND drive_id=$2 AND status <> 'cancelled'
        RETURNING user_id, round_name, access_code`,
      [slot.slot_id, drive.drive_id, roundName || null, testUrl || null, accessCode || null]
    );
    for (const row of upd.rows) {
      await emitDriveNotification({
        userId: row.user_id,
        driveId: drive.drive_id,
        kind: 'link_assigned',
        title: 'Test link assigned',
        body: `Your ${row.round_name || 'test'} link for ${drive.title} has been assigned — it opens when the admin activates it.${row.access_code ? ` Access code: ${row.access_code}.` : ''}`,
        url: `/mock-drive/drives/${drive.drive_id}`,
      });
    }
    return res.json({ updated: upd.rowCount });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/** POST /:driveId/slots/:slotId/activate — release the whole slot at once. */
driveAdminRouter.post('/:driveId/slots/:slotId/activate', async (req: Request, res: Response) => {
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    const slot = await loadScopedSlot(req, drive);
    if (!slot) return res.status(404).json({ error: 'slot_not_found' });

    const upd = await getPool().query(
      `UPDATE drive_slot_booking
          SET status='active', link_active_at=NOW(), updated_at=NOW()
        WHERE slot_id=$1 AND drive_id=$2 AND status='link_assigned' AND link_assigned_at IS NOT NULL
        RETURNING user_id`,
      [slot.slot_id, drive.drive_id]
    );
    for (const row of upd.rows) {
      await emitDriveNotification({
        userId: row.user_id,
        driveId: drive.drive_id,
        kind: 'link_activated',
        title: 'Your test link is LIVE',
        body: `The link for ${drive.title} is active now — start before your slot ends.`,
        url: `/mock-drive/drives/${drive.drive_id}`,
      });
    }
    return res.json({ updated: upd.rowCount });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/** POST /:driveId/slots/:slotId/deactivate — pull the whole slot's links back. */
driveAdminRouter.post('/:driveId/slots/:slotId/deactivate', async (req: Request, res: Response) => {
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    const slot = await loadScopedSlot(req, drive);
    if (!slot) return res.status(404).json({ error: 'slot_not_found' });

    const upd = await getPool().query(
      `UPDATE drive_slot_booking
          SET status='link_assigned', link_active_at=NULL, updated_at=NOW()
        WHERE slot_id=$1 AND drive_id=$2 AND status='active'
        RETURNING user_id`,
      [slot.slot_id, drive.drive_id]
    );
    for (const row of upd.rows) {
      await emitDriveNotification({
        userId: row.user_id,
        driveId: drive.drive_id,
        kind: 'link_deactivated',
        title: 'Test link paused',
        body: `The link for ${drive.title} was deactivated by the admin — we'll notify you when it reopens.`,
        url: `/mock-drive/drives/${drive.drive_id}`,
      });
    }
    return res.json({ updated: upd.rowCount });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/**
 * POST /:driveId/email — manual compose to a scope: all registrants, one
 * slot's bookings, or a single student. Recipients resolve from the JSON user
 * store; sends are queued in the background so a 1,000-mail blast answers
 * immediately instead of holding the request open.
 */
driveAdminRouter.post('/:driveId/email', async (req: Request, res: Response) => {
  const b = req.body || {};
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });

    const subject = String(b.subject || '').trim().slice(0, 150);
    const body = String(b.body || '').trim().slice(0, 4000);
    if (!subject || !body) return res.status(422).json({ error: 'subject_and_body_required' });

    const scope = str(b.scope) || 'all';
    let userIds: string[] = [];
    if (scope === 'slot') {
      const slotId = str(b.slot_id);
      if (!slotId) return res.status(422).json({ error: 'slot_id_required' });
      const r = await getPool().query(
        `SELECT user_id FROM drive_slot_booking WHERE slot_id=$1 AND drive_id=$2 AND status <> 'cancelled'`,
        [slotId, drive.drive_id]
      );
      userIds = r.rows.map((x: any) => x.user_id);
    } else if (scope === 'student') {
      const registrationId = str(b.registration_id);
      if (!registrationId) return res.status(422).json({ error: 'registration_id_required' });
      const r = await getPool().query(
        `SELECT user_id FROM drive_registration WHERE registration_id=$1 AND drive_id=$2`,
        [registrationId, drive.drive_id]
      );
      if (!r.rows.length) return res.status(404).json({ error: 'registration_not_found' });
      userIds = r.rows.map((x: any) => x.user_id);
    } else {
      const r = await getPool().query(`SELECT user_id FROM drive_registration WHERE drive_id=$1`, [drive.drive_id]);
      userIds = r.rows.map((x: any) => x.user_id);
    }

    const users = new Map<string, string>();
    try {
      for (const u of (loadDb().users || []) as any[]) if (u?.id && u?.email) users.set(u.id, u.email);
    } catch { /* empty store = zero sends */ }
    const emails = Array.from(new Set(userIds.map((id) => users.get(id) || '').filter(Boolean)));

    const queued = sendDriveEmailBulk(
      emails.map((email) => ({ email, subject, body })),
      { subject, body, url: `/mock-drive/drives/${drive.drive_id}`, driveName: drive.title }
    );
    return res.json({ queued });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/** POST /:driveId/bookings/:bookingId/assign — attach round + URL (not live yet). */
driveAdminRouter.post('/:driveId/bookings/:bookingId/assign', async (req: Request, res: Response) => {
  const b = req.body || {};
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    const booking = await loadBookingScoped(req, drive);
    if (!booking) return res.status(404).json({ error: 'booking_not_found' });
    if (booking.status === 'cancelled') return res.status(409).json({ error: 'booking_cancelled' });

    const roundName = str(b.round_name);
    const testUrl = str(b.test_url);
    const accessCode = str(b.access_code);
    if (!roundName && !testUrl && !booking.link_assigned_at) {
      return res.status(422).json({ error: 'round_or_url_required' });
    }
    const upd = await getPool().query(
      `UPDATE drive_slot_booking
          SET status='link_assigned', link_assigned_at=NOW(),
              round_name=COALESCE($2, round_name), test_url=COALESCE($3, test_url),
              access_code=COALESCE($4, access_code), updated_at=NOW()
        WHERE booking_id=$1 RETURNING *`,
      [booking.booking_id, roundName, testUrl, accessCode]
    );
    await emitDriveNotification({
      userId: booking.user_id,
      driveId: drive.drive_id,
      kind: 'link_assigned',
      title: 'Test link assigned',
      body: `Your ${upd.rows[0].round_name || 'test'} link for ${drive.title} has been assigned — it opens when the admin activates it.${upd.rows[0].access_code ? ` Access code: ${upd.rows[0].access_code}.` : ''}`,
      url: `/mock-drive/drives/${drive.drive_id}`,
    });
    return res.json({ booking: upd.rows[0] });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/** POST /:driveId/bookings/:bookingId/activate — the gate the student waits on. */
driveAdminRouter.post('/:driveId/bookings/:bookingId/activate', async (req: Request, res: Response) => {
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    const booking = await loadBookingScoped(req, drive);
    if (!booking) return res.status(404).json({ error: 'booking_not_found' });
    if (booking.status === 'cancelled') return res.status(409).json({ error: 'booking_cancelled' });
    if (!booking.link_assigned_at) return res.status(409).json({ error: 'link_not_assigned' });

    const upd = await getPool().query(
      `UPDATE drive_slot_booking SET status='active', link_active_at=NOW(), updated_at=NOW() WHERE booking_id=$1 RETURNING *`,
      [booking.booking_id]
    );
    await emitDriveNotification({
      userId: booking.user_id,
      driveId: drive.drive_id,
      kind: 'link_activated',
      title: 'Your test link is LIVE',
      body: `The link for ${drive.title} is active now — start before your slot ends.`,
      url: `/mock-drive/drives/${drive.drive_id}`,
    });
    return res.json({ booking: upd.rows[0] });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/** POST /:driveId/bookings/:bookingId/deactivate — pull the link back. */
driveAdminRouter.post('/:driveId/bookings/:bookingId/deactivate', async (req: Request, res: Response) => {
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    const booking = await loadBookingScoped(req, drive);
    if (!booking) return res.status(404).json({ error: 'booking_not_found' });
    if (booking.status === 'cancelled') return res.status(409).json({ error: 'booking_cancelled' });
    const upd = await getPool().query(
      `UPDATE drive_slot_booking SET status='link_assigned', link_active_at=NULL, updated_at=NOW() WHERE booking_id=$1 RETURNING *`,
      [booking.booking_id]
    );
    await emitDriveNotification({
      userId: booking.user_id,
      driveId: drive.drive_id,
      kind: 'link_deactivated',
      title: 'Test link paused',
      body: `The link for ${drive.title} was deactivated by the admin — we'll notify you when it reopens.`,
      url: `/mock-drive/drives/${drive.drive_id}`,
    });
    return res.json({ booking: upd.rows[0] });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/** POST /:driveId/bookings/:bookingId/cancel — free the seat; student rebooks. */
driveAdminRouter.post('/:driveId/bookings/:bookingId/cancel', async (req: Request, res: Response) => {
  try {
    const drive = await loadScopedDrive(req);
    if (!drive) return res.status(404).json({ error: 'drive_not_found' });
    const booking = await loadBookingScoped(req, drive);
    if (!booking) return res.status(404).json({ error: 'booking_not_found' });
    if (booking.status === 'cancelled') return res.status(409).json({ error: 'already_cancelled' });

    await getPool().query(
      `UPDATE drive_slot_booking SET status='cancelled', link_active_at=NULL, updated_at=NOW() WHERE booking_id=$1`,
      [booking.booking_id]
    );
    const fee = Number(drive.fee_amount_paise || 0);
    const nextStatus = fee > 0 ? 'payment_approved' : 'registered';
    await getPool().query(
      `UPDATE drive_registration SET status=$2, updated_at=NOW() WHERE registration_id=$1 AND status='slot_booked'`,
      [booking.registration_id, nextStatus]
    );
    await emitDriveNotification({
      userId: booking.user_id,
      driveId: drive.drive_id,
      kind: 'slot_cancelled',
      title: 'Slot cancelled',
      body: `Your slot for ${drive.title} was cancelled by the admin — book a new one from the drive page.`,
      url: `/mock-drive/drives/${drive.drive_id}`,
    });
    return res.json({ ok: true, registration_status: nextStatus });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

export default driveAdminRouter;
