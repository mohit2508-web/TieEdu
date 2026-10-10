import { Router, Request, Response, NextFunction } from 'express';
import { getPool } from '../db/client';
import { loadDb } from '../data/db';
import {
  bridgeUnavailable,
  getProviderByCode,
  rawBodyOf,
  sha256,
  verifyTimestamped,
  providerSecrets,
  DriveProviderRow,
} from '../lib/bridge/core';

/**
 * Provider-facing bridge endpoints. These are called server-to-server by the
 * assessment platform (and, when it is TieEdu's own skill-test engine, by
 * TieEdu itself). They are NOT part of the student session API and are never
 * reachable with a student JWT.
 *
 * Auth is per-provider HMAC keyed on three distinct secrets so that read
 * (introspect), write (events) and pull (roster) can be rotated independently:
 *
 *   X-Bridge-Provider   : provider code, e.g. "skillverify"
 *   X-Bridge-Timestamp  : unix seconds
 *   X-Bridge-Signature  : hex HMAC-SHA256( secret, `${timestamp}.${rawBody}` )
 *
 * The raw bytes come from the global express.json verify hook in server.ts, so
 * the signature covers exactly what the client sent.
 */

const router = Router();

function clientIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
}

type AuthKind = 'introspect' | 'webhook' | 'api';

function bridgeAuth(kind: AuthKind, secretOf: (s: { introspect: string; webhook: string; api: string }) => string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const code = String(req.headers['x-bridge-provider'] || '').trim();
      const provider = await getProviderByCode(code);
      if (!provider || provider.status !== 'active') {
        return res.status(401).json({ error: 'unknown_provider', message: `No active provider "${code}".` });
      }
      const secret = secretOf(providerSecrets(provider.secret_env_prefix));
      if (!secret) {
        return res.status(503).json({
          error: 'provider_not_configured',
          message: `Provider "${code}" is registered but its ${kind} secret is not set in the environment.`,
        });
      }
      const raw = rawBodyOf(req);
      const verdict = verifyTimestamped({
        secret,
        timestamp: req.headers['x-bridge-timestamp'],
        signature: req.headers['x-bridge-signature'],
        rawBody: raw,
      });
      if (!verdict.ok) {
        return res.status(401).json({ error: 'invalid_signature', reason: verdict.reason });
      }
      (req as any).bridgeProvider = provider as DriveProviderRow;
      (req as any).bridgeRawBody = raw;
      next();
    } catch (err: any) {
      return bridgeUnavailable(res, err);
    }
  };
}

function providerOf(req: Request): DriveProviderRow {
  return (req as any).bridgeProvider as DriveProviderRow;
}

function numOrNull(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* ---------------------------------------------------------------------------
 * GET /api/bridge/health — unauthenticated liveness probe.
 * ------------------------------------------------------------------------- */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const r = await getPool().query<{ n: string }>(`SELECT COUNT(*)::TEXT AS n FROM drive_provider WHERE status='active'`);
    return res.json({ ok: true, db: true, active_providers: Number(r.rows[0]?.n || 0) });
  } catch (err: any) {
    if (err?.code === '42P01') return res.json({ ok: true, db: true, migrated: false, active_providers: 0 });
    return bridgeUnavailable(res, err);
  }
});

/* ---------------------------------------------------------------------------
 * POST /api/bridge/introspect — exchange a one-time launch token for claims.
 *
 * This is the endpoint a provider calls when a student arrives with ?lt=...
 * It is the authoritative exchange: the token is consumed atomically, so two
 * concurrent calls cannot both succeed, and it is the only place that turns a
 * launch into a concrete attempt number and window.
 * ------------------------------------------------------------------------- */
router.post('/introspect', bridgeAuth('introspect', (s) => s.introspect), async (req: Request, res: Response) => {
  const provider = providerOf(req);
  const token = String(req.body?.token || '').trim();
  if (!token) return res.status(400).json({ error: 'missing_token' });

  try {
    const hash = sha256(token);
    const upd = await getPool().query(
      `UPDATE drive_launch
          SET status='used', used_at=NOW(), consumed_ip=$2
        WHERE token_hash=$1 AND status='issued' AND expires_at > NOW()
        RETURNING *`,
      [hash, clientIp(req)]
    );
    if (!upd.rows.length) {
      return res.status(401).json({ error: 'invalid_token', message: 'Launch token is invalid, expired or already used.' });
    }
    const launch = upd.rows[0];

    const [driveR, testR, dtestR, regR, drtR, profileR] = await Promise.all([
      getPool().query(`SELECT * FROM mock_drive WHERE drive_id=$1`, [launch.drive_id]),
      getPool().query(`SELECT * FROM drive_test WHERE test_id=$1`, [launch.test_id]),
      getPool().query(`SELECT * FROM mock_drive_test WHERE drive_id=$1 AND test_id=$2`, [launch.drive_id, launch.test_id]),
      getPool().query(`SELECT * FROM drive_registration WHERE drive_id=$1 AND user_id=$2`, [launch.drive_id, launch.user_id]),
      getPool().query(
        `SELECT drt.* FROM drive_registration_test drt
           JOIN drive_registration r ON r.registration_id = drt.registration_id
          WHERE r.drive_id=$1 AND r.user_id=$2 AND drt.test_id=$3`,
        [launch.drive_id, launch.user_id, launch.test_id]
      ),
      getPool().query(
        `SELECT * FROM student_profile WHERE user_id=$1
          ORDER BY (college_id = $2) DESC, updated_at DESC LIMIT 1`,
        [launch.user_id, launch.drive_id]
      ),
    ]);

    if (!driveR.rows.length || !testR.rows.length) {
      return res.status(409).json({ error: 'drive_config_changed', message: 'The drive/test this token pointed at no longer exists.' });
    }
    const drive = driveR.rows[0];
    const test = testR.rows[0];
    const dtest = dtestR.rows[0] || {};
    const reg = regR.rows[0] || {};
    const drt = drtR.rows[0] || {};
    const profile = profileR.rows[0] || {};

    const user = (loadDb().users || []).find((u: any) => u.id === launch.user_id) || ({} as any);
    const resuming = drt.status === 'launched' || drt.status === 'in_progress';
    const priorAttempts = Number(drt.attempts_used || 0);
    const attemptNumber = resuming ? Math.max(1, priorAttempts) : priorAttempts + 1;

    if (!resuming && reg.registration_id) {
      await getPool().query(
        `UPDATE drive_registration_test
            SET attempts_used = attempts_used + 1, status='launched', unlocked_at=COALESCE(unlocked_at, NOW()), updated_at=NOW()
          WHERE registration_id=$1 AND test_id=$2`,
        [reg.registration_id, launch.test_id]
      );
      await getPool().query(
        `UPDATE drive_registration SET status = CASE WHEN status='registered' THEN 'launched' ELSE status END, updated_at=NOW()
          WHERE registration_id=$1`,
        [reg.registration_id]
      );
    }

    // Record the stable provider<->TieEdu identity binding (candidate id = users.id).
    await getPool().query(
      `INSERT INTO drive_identity (user_id, provider_id, provider_candidate_id, last_seen_at)
       VALUES ($1,$2,$1,NOW())
       ON CONFLICT (user_id, provider_id) DO UPDATE SET last_seen_at=NOW()`,
      [launch.user_id, provider.provider_id]
    );

    const closesAt = dtest.closes_at || drive.ends_at || null;
    return res.json({
      ok: true,
      sub: launch.user_id,
      drive_id: launch.drive_id,
      test_id: launch.test_id,
      provider_exam_id: test.provider_exam_id,
      roll_no: reg.roll_no || profile.roll_no || user.roll_no || null,
      license_id: reg.license_id || user.license_id || null,
      name: user.name || null,
      email: user.email || null,
      drive: { drive_id: drive.drive_id, title: drive.title, company_name: drive.company_name, ends_at: drive.ends_at },
      attempt: { number: attemptNumber, max_attempts: Number(dtest.max_attempts || 1) },
      window: { closes_at: closesAt, hard_close: dtest.window_hard_close !== false },
      resume: resuming,
      return_url: launch.return_url || '',
      server_time: new Date().toISOString(),
    });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/* ---------------------------------------------------------------------------
 * POST /api/bridge/events — the results webhook.
 *
 * Idempotent on (provider, external_event_id): a provider that retries a
 * delivery gets a 200 and no double-processing. Every event is stored raw
 * before it is interpreted, so a mapping bug is diagnosable after the fact.
 * ------------------------------------------------------------------------- */
router.post('/events', bridgeAuth('webhook', (s) => s.webhook), async (req: Request, res: Response) => {
  const provider = providerOf(req);
  const body = (req.body || {}) as any;
  const eventType = String(body.event_type || '').trim();
  const externalId = body.event_id ? String(body.event_id) : null;
  if (!eventType) return res.status(400).json({ error: 'missing_event_type' });

  try {
    const ins = await getPool().query(
      `INSERT INTO drive_webhook_event (provider_id, event_type, external_event_id, signature_valid, payload, status)
       VALUES ($1,$2,$3,TRUE,$4,'received')
       ON CONFLICT (provider_id, external_event_id) WHERE external_event_id IS NOT NULL
       DO NOTHING
       RETURNING event_id`,
      [provider.provider_id, eventType, externalId, body]
    );
    if (!ins.rows.length) return res.json({ ok: true, duplicate: true });

    const eventId = ins.rows[0].event_id;
    const result = await applyEvent(provider, body);
    await getPool().query(
      `UPDATE drive_webhook_event SET status=$2, processed_at=NOW(), error=$3 WHERE event_id=$1`,
      [eventId, result.status, result.error || null]
    );
    return res.json({ ok: true, status: result.status });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/* ---------------------------------------------------------------------------
 * POST /api/bridge/ack — provider confirms it received a TieEdu push.
 * ------------------------------------------------------------------------- */
router.post('/ack', bridgeAuth('webhook', (s) => s.webhook), async (req: Request, res: Response) => {
  const externalId = req.body?.event_id ? String(req.body.event_id) : '';
  if (!externalId) return res.status(400).json({ error: 'missing_event_id' });
  try {
    await getPool().query(
      `UPDATE drive_webhook_event SET processed_at=COALESCE(processed_at,NOW())
        WHERE external_event_id=$1`,
      [externalId]
    );
    return res.json({ ok: true });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/* ---------------------------------------------------------------------------
 * GET /api/bridge/roster?drive_id=... — provider pulls the approved roster.
 * ------------------------------------------------------------------------- */
router.get('/roster', bridgeAuth('api', (s) => s.api), async (req: Request, res: Response) => {
  const driveId = String(req.query.drive_id || '').trim();
  if (!driveId) return res.status(400).json({ error: 'missing_drive_id' });
  try {
    const r = await getPool().query(
      `SELECT r.user_id AS tieedu_user_id, r.roll_no, r.license_id,
              COALESCE(p.branch,p2.branch) AS branch, COALESCE(p.batch,p2.batch) AS batch
         FROM drive_registration r
         LEFT JOIN student_profile p ON p.user_id = r.user_id AND p.college_id = r.college_id
         LEFT JOIN student_profile p2 ON p2.user_id = r.user_id
        WHERE r.drive_id=$1 AND r.status <> 'disqualified'`,
      [driveId]
    );
    const users = loadDb().users || [];
    const roster = r.rows.map((row: any) => {
      const u = users.find((x: any) => x.id === row.tieedu_user_id) || {};
      return {
        tieedu_user_id: row.tieedu_user_id,
        roll_no: row.roll_no || null,
        license_id: row.license_id || null,
        name: u.name || null,
        email: u.email || null,
        branch: row.branch || null,
        batch: row.batch || null,
      };
    });
    return res.json({ ok: true, drive_id: driveId, count: roster.length, roster });
  } catch (err: any) {
    return bridgeUnavailable(res, err);
  }
});

/* ------------------------------- event processing ------------------------- */

type EventResult = { status: 'processed' | 'unmatched' | 'ignored' | 'failed'; error?: string };

async function applyEvent(provider: DriveProviderRow, body: any): Promise<EventResult> {
  const type = String(body.event_type || '');
  const userId = String(body.tieedu_user_id || body.candidate_id || '').trim();
  const pAttempt = body.provider_attempt_id ? String(body.provider_attempt_id) : null;
  if (!userId) return { status: 'unmatched', error: 'missing tieedu_user_id' };

  let driveId: string | null = body.drive_id ? String(body.drive_id) : null;
  let testId: string | null = body.test_id ? String(body.test_id) : null;

  if ((!driveId || !testId) && pAttempt) {
    const prev = await getPool().query(
      `SELECT drive_id, test_id FROM drive_attempt WHERE provider_id=$1 AND provider_attempt_id=$2`,
      [provider.provider_id, pAttempt]
    );
    if (prev.rows[0]) {
      driveId = driveId || prev.rows[0].drive_id;
      testId = testId || prev.rows[0].test_id;
    }
  }
  if (!driveId || !testId) return { status: 'unmatched', error: 'cannot map event to drive/test' };

  // Provenance: an attempt is only believed if TieEdu issued a launch for this
  // exact (user, drive, test, provider). This is what stops a provider — or an
  // attacker with a leaked webhook secret — from injecting results for a drive
  // the student never signed up to.
  const prov = await getPool().query(
    `SELECT 1 FROM drive_launch WHERE drive_id=$1 AND test_id=$2 AND user_id=$3 AND provider_id=$4 LIMIT 1`,
    [driveId, testId, userId, provider.provider_id]
  );
  if (!prov.rows.length) return { status: 'unmatched', error: 'no launch provenance for this attempt' };

  const regR = await getPool().query(`SELECT * FROM drive_registration WHERE drive_id=$1 AND user_id=$2`, [driveId, userId]);
  const reg = regR.rows[0] || null;

  if (type === 'attempt.started') {
    if (pAttempt) {
      await upsertAttempt(provider, {
        provider_attempt_id: pAttempt, driveId, testId, userId,
        roll_no: body.roll_no || reg?.roll_no || null,
        status: 'in_progress', started_at: body.started_at || new Date().toISOString(),
        sections: body.sections, raw: body,
      });
    }
    if (reg) {
      await getPool().query(
        `UPDATE drive_registration_test SET status='in_progress', updated_at=NOW()
          WHERE registration_id=$1 AND test_id=$2 AND status IN ('unlocked','launched','in_progress')`,
        [reg.registration_id, testId]
      );
      await getPool().query(`UPDATE drive_registration SET status='in_progress', updated_at=NOW() WHERE registration_id=$1`, [reg.registration_id]);
    }
    return { status: 'processed' };
  }

  if (type === 'attempt.completed') {
    if (!pAttempt) return { status: 'unmatched', error: 'completed event without provider_attempt_id' };
    const attempt = await upsertAttempt(provider, {
      provider_attempt_id: pAttempt, driveId, testId, userId,
      roll_no: body.roll_no || reg?.roll_no || null,
      status: body.disqualified ? 'disqualified' : 'completed',
      started_at: body.started_at || null,
      submitted_at: body.submitted_at || new Date().toISOString(),
      score: numOrNull(body.score), max_score: numOrNull(body.max_score),
      percentage: numOrNull(body.percentage), passed: body.passed === undefined ? null : !!body.passed,
      disqualified: !!body.disqualified, sections: body.sections, violations: body.violations, raw: body,
    });
    if (reg) {
      await getPool().query(
        `UPDATE drive_registration_test
            SET status = $3,
                best_attempt_id = CASE WHEN $4::numeric IS NOT NULL AND ($4::numeric > COALESCE(best_percentage,-1)) THEN $5 ELSE best_attempt_id END,
                best_percentage = GREATEST(COALESCE(best_percentage,-1), COALESCE($4::numeric,-1)),
                updated_at=NOW()
          WHERE registration_id=$1 AND test_id=$2`,
        [
          reg.registration_id, testId,
          body.disqualified ? 'disqualified' : 'completed',
          numOrNull(body.percentage), attempt.attempt_id,
        ]
      );
      await unlockDependents(driveId, reg.registration_id, testId);
      await recomputeRegistrationStatus(reg.registration_id);
    }
    return { status: 'processed' };
  }

  if (type === 'attempt.flagged') {
    if (pAttempt) {
      await upsertAttempt(provider, {
        provider_attempt_id: pAttempt, driveId, testId, userId,
        roll_no: body.roll_no || reg?.roll_no || null,
        status: 'in_progress', disqualified: !!body.disqualified,
        violations: body.violations, raw: body,
      });
    }
    return { status: 'processed' };
  }

  if (type === 'attempt.aborted') {
    if (pAttempt) {
      await upsertAttempt(provider, {
        provider_attempt_id: pAttempt, driveId, testId, userId,
        roll_no: body.roll_no || reg?.roll_no || null,
        status: 'aborted', submitted_at: new Date().toISOString(), raw: body,
      });
    }
    if (reg) {
      await getPool().query(
        `UPDATE drive_registration_test SET status = CASE WHEN attempts_used < 1 THEN 'unlocked' ELSE status END, updated_at=NOW()
          WHERE registration_id=$1 AND test_id=$2 AND status <> 'completed'`,
        [reg.registration_id, testId]
      );
      await recomputeRegistrationStatus(reg.registration_id);
    }
    return { status: 'processed' };
  }

  return { status: 'ignored', error: `unhandled event_type ${type}` };
}

async function upsertAttempt(provider: DriveProviderRow, a: any): Promise<{ attempt_id: string }> {
  const r = await getPool().query(
    `INSERT INTO drive_attempt
       (provider_id, provider_attempt_id, drive_id, test_id, user_id, roll_no, status, started_at,
        submitted_at, score, max_score, percentage, passed, disqualified, sections, violations, raw)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     ON CONFLICT (provider_id, provider_attempt_id) DO UPDATE SET
        status=EXCLUDED.status,
        started_at=COALESCE(EXCLUDED.started_at, drive_attempt.started_at),
        submitted_at=COALESCE(EXCLUDED.submitted_at, drive_attempt.submitted_at),
        score=COALESCE(EXCLUDED.score, drive_attempt.score),
        max_score=COALESCE(EXCLUDED.max_score, drive_attempt.max_score),
        percentage=COALESCE(EXCLUDED.percentage, drive_attempt.percentage),
        passed=COALESCE(EXCLUDED.passed, drive_attempt.passed),
        disqualified=drive_attempt.disqualified OR EXCLUDED.disqualified,
        sections=CASE WHEN EXCLUDED.sections IS NULL OR EXCLUDED.sections='[]'::jsonb THEN drive_attempt.sections ELSE EXCLUDED.sections END,
        violations=CASE WHEN EXCLUDED.violations IS NULL OR EXCLUDED.violations='[]'::jsonb THEN drive_attempt.violations ELSE EXCLUDED.violations END,
        raw=EXCLUDED.raw,
        received_at=NOW()
     RETURNING attempt_id`,
    [
      provider.provider_id, a.provider_attempt_id, a.driveId, a.testId, a.userId, a.roll_no || null, a.status,
      a.started_at || null, a.submitted_at || null, a.score ?? null, a.max_score ?? null, a.percentage ?? null,
      a.passed ?? null, !!a.disqualified, a.sections || [], a.violations || [], a.raw || {},
    ]
  );
  return { attempt_id: r.rows[0].attempt_id };
}

/** After a test completes, unlock any test whose unlock_rule waited on it. */
async function unlockDependents(driveId: string, registrationId: string, completedTestId: string): Promise<void> {
  const deps = await getPool().query(
    `SELECT test_id FROM mock_drive_test
      WHERE drive_id=$1 AND unlock_rule->>'kind'='after_test' AND unlock_rule->>'test_id'=$2`,
    [driveId, completedTestId]
  );
  for (const row of deps.rows) {
    await getPool().query(
      `UPDATE drive_registration_test SET status='unlocked', unlocked_at=COALESCE(unlocked_at,NOW()), updated_at=NOW()
        WHERE registration_id=$1 AND test_id=$2 AND status='locked'`,
      [registrationId, row.test_id]
    );
  }
}

/** Roll the per-test statuses up into the registration status. */
async function recomputeRegistrationStatus(registrationId: string): Promise<void> {
  const rows = await getPool()
    .query(`SELECT status FROM drive_registration_test WHERE registration_id=$1`, [registrationId])
    .then((r) => r.rows as { status: string }[]);
  if (!rows.length) return;
  const done = new Set(['completed', 'absent', 'disqualified', 'not_shortlisted']);
  const allDone = rows.every((r) => done.has(r.status));
  const next = allDone ? 'completed' : rows.some((r) => r.status === 'in_progress' || r.status === 'launched') ? 'in_progress' : null;
  if (next) {
    await getPool().query(`UPDATE drive_registration SET status=$2, updated_at=NOW() WHERE registration_id=$1`, [registrationId, next]);
  }
}

export default router;
