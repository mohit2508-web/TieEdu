import { getPool, isDbReachable } from './client';

/**
 * Mock Drive & Assessment Bridge — schema.
 *
 * Separate prefix `drive_` (plus the one shared `student_profile`) because this
 * cluster is shared with other projects and because the blast radius of the
 * bridge module should be obvious in a table list. The bridge is PostgreSQL-only
 * (no JSON fallback): registrations and attempts are relational, high-write and
 * aggregate-read, and a server that "starts fine" while these tables are missing
 * would answer every drive request with a confusing query error.
 *
 * Rules encoded here so a careless insert cannot violate them:
 *  - TENANCY: drives carry `college_id` (NULL = open/cross-college). TPO reads
 *    must filter on it; enforced in the route layer with a dedicated test.
 *  - ONE ROW PER REAL THING: `drive_registration_test` is per (registration,
 *    test) so a multi-round drive never marks a student "completed" after the
 *    first round.
 *  - NO PLAINTEXT TOKENS: `drive_launch` stores only `token_hash`, never the
 *    launch token itself.
 *  - CockroachDB constraints respected: no SERIAL, no generated columns.
 */

export async function ensureStudentProfileTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS student_profile (
      user_id      TEXT NOT NULL,
      college_id   TEXT NOT NULL,
      roll_no      TEXT NOT NULL,
      branch       TEXT,
      batch        TEXT,
      degree       TEXT,
      cgpa         NUMERIC(4,2),
      class10_pct  NUMERIC(6,2),
      class12_pct  NUMERIC(6,2),
      backlogs     INT NOT NULL DEFAULT 0,
      status       TEXT NOT NULL DEFAULT 'self_declared',
      verified_by  TEXT,
      verified_at  TIMESTAMPTZ,
      source       TEXT NOT NULL DEFAULT 'self',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, college_id),
      CONSTRAINT student_profile_status_valid
        CHECK (status IN ('self_declared','pending','verified','rejected')),
      CONSTRAINT student_profile_source_valid
        CHECK (source IN ('self','tpo_csv','tpo_manual')),
      CONSTRAINT student_profile_cgpa_range CHECK (cgpa IS NULL OR (cgpa >= 0 AND cgpa <= 10))
    );
  `);
  await getPool().query(`CREATE INDEX IF NOT EXISTS student_profile_roll_idx ON student_profile(college_id, roll_no);`);
  await getPool().query(`CREATE INDEX IF NOT EXISTS student_profile_status_idx ON student_profile(college_id, status);`);
}

export async function ensureDriveProviderTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS drive_provider (
      provider_id        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      code               TEXT NOT NULL UNIQUE,
      name               TEXT NOT NULL,
      base_url           TEXT NOT NULL,
      launch_url         TEXT NOT NULL,
      introspect_url     TEXT NOT NULL DEFAULT '',
      secret_env_prefix  TEXT NOT NULL,
      status             TEXT NOT NULL DEFAULT 'active',
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT drive_provider_status_valid CHECK (status IN ('active','disabled'))
    );
  `);
}

export async function ensureDriveTestTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS drive_test (
      test_id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      provider_id        TEXT REFERENCES drive_provider(provider_id) ON DELETE RESTRICT,
      mode               TEXT NOT NULL DEFAULT 'external',
      name               TEXT NOT NULL,
      slug               TEXT NOT NULL UNIQUE,
      provider_exam_id   TEXT,
      skill_slug         TEXT,
      duration_minutes   INT,
      total_questions    INT,
      provider_meta      JSONB NOT NULL DEFAULT '{}',
      status             TEXT NOT NULL DEFAULT 'active',
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT drive_test_mode_valid CHECK (mode IN ('external','internal')),
      CONSTRAINT drive_test_external_ref CHECK (
        mode <> 'external' OR (provider_id IS NOT NULL AND provider_exam_id IS NOT NULL)),
      CONSTRAINT drive_test_internal_ref CHECK (
        mode <> 'internal' OR skill_slug IS NOT NULL)
    );
  `);
  await getPool().query(`CREATE INDEX IF NOT EXISTS drive_test_provider_idx ON drive_test(provider_id);`);
}

export async function ensureMockDriveTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS mock_drive (
      drive_id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      college_id         TEXT,
      company_id         TEXT,
      company_name       TEXT NOT NULL DEFAULT '',
      title              TEXT NOT NULL,
      description        TEXT NOT NULL DEFAULT '',
      drive_type         TEXT NOT NULL DEFAULT 'mock',
      season_id          TEXT,
      starts_at          TIMESTAMPTZ,
      ends_at            TIMESTAMPTZ,
      eligibility        JSONB NOT NULL DEFAULT '{}',
      registration_mode  TEXT NOT NULL DEFAULT 'open',
      results_visibility TEXT NOT NULL DEFAULT 'after_close',
      results_published  BOOLEAN NOT NULL DEFAULT FALSE,
      results_published_at TIMESTAMPTZ,
      status             TEXT NOT NULL DEFAULT 'draft',
      created_by         TEXT,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT mock_drive_type_valid CHECK (drive_type IN ('mock','assessment','quiz')),
      CONSTRAINT mock_drive_reg_valid CHECK (registration_mode IN ('open','roster','invite')),
      CONSTRAINT mock_drive_rv_valid CHECK (results_visibility IN ('immediate','after_close','manual')),
      CONSTRAINT mock_drive_status_valid CHECK (status IN ('draft','published','live','closed','archived'))
    );
  `);
  await getPool().query(`CREATE INDEX IF NOT EXISTS mock_drive_college_idx ON mock_drive(college_id, status);`);
  await getPool().query(`CREATE INDEX IF NOT EXISTS mock_drive_window_idx ON mock_drive(starts_at, ends_at);`);
}

export async function ensureMockDriveTestTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS mock_drive_test (
      drive_id          TEXT NOT NULL REFERENCES mock_drive(drive_id) ON DELETE CASCADE,
      test_id           TEXT NOT NULL REFERENCES drive_test(test_id) ON DELETE RESTRICT,
      sort_order        INT NOT NULL DEFAULT 1,
      mandatory         BOOLEAN NOT NULL DEFAULT TRUE,
      weight            NUMERIC(6,3) NOT NULL DEFAULT 1,
      max_attempts      INT NOT NULL DEFAULT 1,
      opens_at          TIMESTAMPTZ,
      closes_at         TIMESTAMPTZ,
      window_hard_close BOOLEAN NOT NULL DEFAULT TRUE,
      unlock_rule       JSONB NOT NULL DEFAULT '{"kind":"open"}',
      PRIMARY KEY (drive_id, test_id)
    );
  `);
}

export async function ensureDriveRegistrationTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS drive_registration (
      registration_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      drive_id        TEXT NOT NULL REFERENCES mock_drive(drive_id) ON DELETE CASCADE,
      user_id         TEXT NOT NULL,
      roll_no         TEXT,
      license_id      TEXT,
      college_id      TEXT,
      status          TEXT NOT NULL DEFAULT 'registered',
      eligibility_checked BOOLEAN NOT NULL DEFAULT FALSE,
      registered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (drive_id, user_id),
      CONSTRAINT drive_reg_status_valid CHECK (status IN
        ('registered','launched','in_progress','completed','absent','disqualified'))
    );
  `);
  await getPool().query(`CREATE INDEX IF NOT EXISTS drive_reg_drive_idx ON drive_registration(drive_id, status);`);
  await getPool().query(`CREATE INDEX IF NOT EXISTS drive_reg_user_idx ON drive_registration(user_id);`);
}

export async function ensureDriveRegistrationTestTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS drive_registration_test (
      registration_id  TEXT NOT NULL REFERENCES drive_registration(registration_id) ON DELETE CASCADE,
      test_id          TEXT NOT NULL,
      status           TEXT NOT NULL DEFAULT 'locked',
      attempts_used    INT NOT NULL DEFAULT 0,
      best_attempt_id  TEXT,
      best_percentage  NUMERIC(6,2),
      unlocked_at      TIMESTAMPTZ,
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (registration_id, test_id),
      CONSTRAINT drt_status_valid CHECK (status IN
        ('locked','unlocked','launched','in_progress','completed','absent','disqualified','not_shortlisted'))
    );
  `);
  await getPool().query(`CREATE INDEX IF NOT EXISTS drt_reg_idx ON drive_registration_test(registration_id);`);
  await getPool().query(`CREATE INDEX IF NOT EXISTS drt_test_idx ON drive_registration_test(test_id);`);
}

export async function ensureDriveInviteTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS drive_invite (
      token             TEXT PRIMARY KEY,
      drive_id          TEXT NOT NULL REFERENCES mock_drive(drive_id) ON DELETE CASCADE,
      college_id        TEXT,
      email             TEXT,
      roll_no           TEXT,
      invited_by        TEXT,
      status            TEXT NOT NULL DEFAULT 'pending',
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at        TIMESTAMPTZ NOT NULL,
      claimed_by_user   TEXT,
      claimed_at        TIMESTAMPTZ,
      CONSTRAINT drive_invite_status_valid CHECK (status IN ('pending','claimed','expired','revoked'))
    );
  `);
  await getPool().query(`CREATE INDEX IF NOT EXISTS drive_invite_email_idx ON drive_invite(email);`);
  await getPool().query(`CREATE INDEX IF NOT EXISTS drive_invite_drive_idx ON drive_invite(drive_id);`);
}

export async function ensureDriveIdentityTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS drive_identity (
      user_id               TEXT NOT NULL,
      provider_id           TEXT NOT NULL REFERENCES drive_provider(provider_id) ON DELETE CASCADE,
      provider_candidate_id TEXT NOT NULL,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, provider_id)
    );
  `);
}

export async function ensureDriveLaunchTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS drive_launch (
      launch_id        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      token_hash       TEXT NOT NULL UNIQUE,
      token_jti        TEXT NOT NULL UNIQUE,
      drive_id         TEXT NOT NULL,
      test_id          TEXT NOT NULL,
      user_id          TEXT NOT NULL,
      provider_id      TEXT NOT NULL,
      provider_exam_id TEXT,
      return_url       TEXT NOT NULL DEFAULT '',
      issued_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at       TIMESTAMPTZ NOT NULL,
      used_at          TIMESTAMPTZ,
      consumed_ip      TEXT,
      status           TEXT NOT NULL DEFAULT 'issued',
      CONSTRAINT drive_launch_status_valid CHECK (status IN ('issued','used','expired'))
    );
  `);
  await getPool().query(`CREATE INDEX IF NOT EXISTS drive_launch_user_idx ON drive_launch(drive_id, user_id);`);
}

export async function ensureDriveAttemptTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS drive_attempt (
      attempt_id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      provider_id         TEXT,
      provider_attempt_id TEXT,
      drive_id            TEXT,
      test_id             TEXT,
      user_id             TEXT,
      roll_no             TEXT,
      status              TEXT NOT NULL DEFAULT 'in_progress',
      started_at          TIMESTAMPTZ,
      submitted_at        TIMESTAMPTZ,
      score               NUMERIC(10,2),
      max_score           NUMERIC(10,2),
      percentage          NUMERIC(6,2),
      passed              BOOLEAN,
      disqualified        BOOLEAN NOT NULL DEFAULT FALSE,
      sections            JSONB NOT NULL DEFAULT '[]',
      violations          JSONB NOT NULL DEFAULT '[]',
      raw                 JSONB NOT NULL DEFAULT '{}',
      received_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (provider_id, provider_attempt_id)
    );
  `);
  await getPool().query(`CREATE INDEX IF NOT EXISTS drive_attempt_drive_idx ON drive_attempt(drive_id, user_id);`);
  await getPool().query(`CREATE INDEX IF NOT EXISTS drive_attempt_test_idx ON drive_attempt(test_id, user_id);`);
}

export async function ensureDriveWebhookEventTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS drive_webhook_event (
      event_id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      provider_id       TEXT,
      event_type        TEXT NOT NULL,
      external_event_id TEXT,
      signature_valid   BOOLEAN NOT NULL DEFAULT FALSE,
      status            TEXT NOT NULL DEFAULT 'received',
      payload           JSONB NOT NULL DEFAULT '{}',
      error             TEXT,
      received_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      processed_at      TIMESTAMPTZ,
      CONSTRAINT drive_webhook_status_valid CHECK (status IN
        ('received','processed','unmatched','ignored','failed'))
    );
  `);
  await getPool().query(`
    CREATE UNIQUE INDEX IF NOT EXISTS drive_webhook_external_idx
      ON drive_webhook_event(provider_id, external_event_id) WHERE external_event_id IS NOT NULL;
  `);
  await getPool().query(`CREATE INDEX IF NOT EXISTS drive_webhook_status_idx ON drive_webhook_event(status, received_at DESC);`);
}

export async function ensureDriveNotificationTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS drive_notification (
      notification_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      drive_id        TEXT,
      user_id         TEXT,
      kind            TEXT NOT NULL,
      channel         TEXT NOT NULL DEFAULT 'email',
      status          TEXT NOT NULL DEFAULT 'queued',
      dedupe_key      TEXT UNIQUE,
      payload         JSONB NOT NULL DEFAULT '{}',
      attempts        INT NOT NULL DEFAULT 0,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sent_at         TIMESTAMPTZ,
      CONSTRAINT drive_notification_status_valid CHECK (status IN ('queued','sent','failed','skipped'))
    );
  `);
  await getPool().query(`CREATE INDEX IF NOT EXISTS drive_notification_queue_idx ON drive_notification(status, created_at);`);
}

export async function ensureDriveJobLockTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS drive_job_lock (
      job_name   TEXT PRIMARY KEY,
      locked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      locked_by  TEXT NOT NULL
    );
  `);
}

/**
 * Runs every bridge migration. Returns false when PostgreSQL is unreachable or a
 * statement fails, and says which. Unlike the main platform, the bridge has NO
 * JSON fallback — a half-migrated bridge would only surface as confusing errors
 * on the first drive request, so we report honestly at boot instead.
 */
export async function runDriveBridgeMigrations(): Promise<boolean> {
  if (!(await isDbReachable(6000))) {
    console.log('💡 [DriveBridge] PostgreSQL unreachable or not configured — mock drives will answer 503. (Requires DATABASE_URL.)');
    return false;
  }

  try {
    await ensureStudentProfileTable();
    await ensureDriveProviderTable();
    await ensureDriveTestTable();
    await ensureMockDriveTable();
    await ensureMockDriveTestTable();
    await ensureDriveRegistrationTable();
    await ensureDriveRegistrationTestTable();
    await ensureDriveInviteTable();
    await ensureDriveIdentityTable();
    await ensureDriveLaunchTable();
    await ensureDriveAttemptTable();
    await ensureDriveWebhookEventTable();
    await ensureDriveNotificationTable();
    await ensureDriveJobLockTable();
    console.log(
      '✅ [DriveBridge] Schema ready (student_profile, provider, test, mock_drive, registration, launch, attempt, events, notifications).'
    );
    return true;
  } catch (err: any) {
    console.log('💡 [DriveBridge] Migration failed: ' + err.message);
    console.log('💡 [DriveBridge] Drive endpoints will answer 503 until the schema is applied. No partial state is used.');
    return false;
  }
}
