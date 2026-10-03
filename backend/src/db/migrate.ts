import { getPool, isDbReachable, lastPoolError } from './client';

// Phase O migration: TieEdu stores its entire document as ONE JSONB row.
// CockroachDB has no `SERIAL`, so the old schema (which used `INT SERIAL PRIMARY KEY`
// and seeded FAKE unlock_count=1420 rows) never worked — and also violated the
// "no fake data" rule. This migration creates only the app_state replica table and
// reports honestly. Real data is cold-imported from db.json by storage.init().
//
// `getPool()` rather than a captured `pool`: the pool is built lazily, so this
// must resolve at call time. Callers reach here only after `isDbReachable()`
// returned true, which is the only condition under which a pool exists.

export async function ensureAppStateTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id          TEXT PRIMARY KEY,
      doc         JSONB NOT NULL,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function ensurePushSubscriptionsTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      user_id     TEXT NOT NULL,
      endpoint    TEXT NOT NULL UNIQUE,
      p256dh      TEXT NOT NULL,
      auth        TEXT NOT NULL,
      user_agent  TEXT,
      platform    TEXT,
      active      BOOLEAN NOT NULL DEFAULT TRUE,
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await getPool().query(`CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions(user_id);`);
  await getPool().query(`CREATE INDEX IF NOT EXISTS push_subscriptions_active_idx ON push_subscriptions(active);`);

  // --- M2 reconciliation -------------------------------------------------
  // The original table was created without these columns, but `PushSubscription`
  // in data/db.ts has declared them since M1. Left alone, the JSON ledger and
  // this table describe the same subscription with two different shapes, so a
  // row written while PostgreSQL was down reads back missing `device_id` and
  // `keys_json`, and `failure_count` has nowhere to live — a dead endpoint could
  // never be retired by count, only by a 410 status code.
  //
  // ADD COLUMN IF NOT EXISTS only, never a rewrite: an already-provisioned
  // cluster keeps its rows and gains the columns. `keys_json` is filled from the
  // existing split columns so the two representations cannot disagree.
  await getPool().query(`
    ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS device_id       TEXT NOT NULL DEFAULT '';
  `);
  await getPool().query(`
    ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS provider        TEXT NOT NULL DEFAULT 'vapid';
  `);
  await getPool().query(`
    ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS keys_json       JSONB;
  `);
  await getPool().query(`
    ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS failure_count   INT  NOT NULL DEFAULT 0;
  `);
  await getPool().query(`
    ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS last_success_at TIMESTAMPTZ;
  `);
  await getPool().query(`
    ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS disabled_at     TIMESTAMPTZ;
  `);
  await getPool().query(`
    ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS disable_reason  TEXT;
  `);
  // Backfill so a pre-M2 row is readable through the M1 shape too.
  await getPool().query(`
    UPDATE push_subscriptions
       SET keys_json = jsonb_build_object('p256dh', p256dh, 'auth', auth)
     WHERE keys_json IS NULL;
  `);
  await getPool().query(`CREATE INDEX IF NOT EXISTS push_subscriptions_device_id_idx ON push_subscriptions(device_id);`);
}

/**
 * M2: the install registry moves off the JSON ledger.
 *
 * `devices` is the fastest-growing collection in the product and the one with
 * the worst write pattern: every browser tab pings it, and each ping used to
 * rewrite the entire multi-megabyte document. Relationalising it first is what
 * makes the JSON document stop being a hot-write bottleneck.
 *
 * Every column is NOT NULL with a default so an insert can never half-succeed
 * and leave a row that the application cannot read back. `first_touch` is the
 * one JSONB column: it is an open-ended attribution bag whose shape is expected
 * to grow, and flattening it into columns would mean a migration every time a
 * new attribution source is added.
 */
export async function ensureDevicesTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS devices (
      id                   TEXT PRIMARY KEY,
      user_id              TEXT,
      platform             TEXT NOT NULL,
      install_surface      TEXT NOT NULL,
      app_version          TEXT NOT NULL,
      install_kind         TEXT,
      os                   TEXT,
      os_version           TEXT,
      browser              TEXT,
      user_agent           TEXT,
      locale               TEXT,
      timezone             TEXT,
      screen               TEXT,
      ip_hash              TEXT,
      first_seen_at        TIMESTAMPTZ NOT NULL,
      last_seen_at         TIMESTAMPTZ NOT NULL,
      last_active_at       TIMESTAMPTZ NOT NULL,
      is_blocked           BOOLEAN NOT NULL DEFAULT FALSE,
      pwa_prompt_shown     INT NOT NULL DEFAULT 0,
      pwa_prompt_dismissed INT NOT NULL DEFAULT 0,
      pwa_prompt_accepted INT NOT NULL DEFAULT 0,
      first_touch          JSONB,
      telemetry_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  // Every one of these backs a query the admin UI actually issues.
  await getPool().query(`CREATE INDEX IF NOT EXISTS devices_user_id_idx ON devices(user_id);`);
  await getPool().query(`CREATE INDEX IF NOT EXISTS devices_last_seen_idx ON devices(last_seen_at DESC);`);
  await getPool().query(`CREATE INDEX IF NOT EXISTS devices_blocked_idx ON devices(is_blocked);`);
  await getPool().query(`CREATE INDEX IF NOT EXISTS devices_surface_idx ON devices(install_surface);`);
}

/**
 * M2: the authority table moves off the JSON ledger.
 *
 * `staff` is tiny — a handful of rows — but it is read on EVERY authenticated
 * admin request, because `resolveAuthority` needs it to answer "may this user do
 * X". Tied to the JSON ledger that meant parsing the whole 3MB document to reach
 * two records, on the hottest path in the application.
 *
 * `permissions` is JSONB because it is a `string[]` that is only ever read whole
 * and expanded in memory. Flattening it into rows would require a join on a path
 * that runs per request, to store a value that is never queried piecewise.
 */
export async function ensureStaffTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS staff (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL,
      role        TEXT NOT NULL,
      permissions JSONB NOT NULL DEFAULT '[]',
      status      TEXT NOT NULL DEFAULT 'active',
      created_by  TEXT,
      created_at  TIMESTAMPTZ NOT NULL,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  // The auth path looks a grant up by user, then filters on status.
  await getPool().query(`CREATE INDEX IF NOT EXISTS staff_user_id_idx ON staff(user_id);`);
  await getPool().query(`CREATE INDEX IF NOT EXISTS staff_status_idx ON staff(status);`);
}

/**
 * The audit ledger, relationally.
 *
 * Named `audit` and not `AuditLog`. The cluster is shared with other projects and
 * already has a capitalised `AuditLog` belonging to one of them; this is a
 * different table with a different shape that happens to share a name. Creating
 * ours as `AuditLog` would have been read as a schema change to theirs.
 */
export async function ensureAuditTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS audit (
      id       TEXT PRIMARY KEY,
      at       TIMESTAMPTZ NOT NULL,
      actor    TEXT NOT NULL DEFAULT 'system',
      action   TEXT NOT NULL,
      detail   TEXT NOT NULL DEFAULT '',
      order_id TEXT,
      gateway  TEXT,
      target   TEXT,
      meta     JSONB
    );
  `);
  // The admin screen reads newest-first and filters on action, so both of those
  // have to be indexable rather than a scan over the retained window.
  await getPool().query(`CREATE INDEX IF NOT EXISTS audit_at_idx ON audit(at DESC);`);
  await getPool().query(`CREATE INDEX IF NOT EXISTS audit_action_idx ON audit(action);`);
  await getPool().query(`CREATE INDEX IF NOT EXISTS audit_order_id_idx ON audit(order_id);`);
}

export async function runMigrations(): Promise<boolean> {
  if (!(await isDbReachable(6000))) {
    console.log('💡 [PostgreSQL] Replica unreachable or not configured — staying on local-json-repository. (Replica requires ENABLE_PG_REPLICA=1 + DATABASE_URL + network allowlist).');
    return false;
  }

  try {
    await ensureAppStateTable();
    await ensurePushSubscriptionsTable();
    await ensureDevicesTable();
    await ensureStaffTable();
    await ensureAuditTable();
    console.log('✅ [PostgreSQL] app_state, push_subscriptions, devices, staff and audit tables ready.');
    return true;
  } catch (err: any) {
    console.log('💡 [PostgreSQL] Migration failed: ' + err.message);
    console.log('💡 [TieEdu] Serving from local-json-repository (backend/data/db.json). No data is in a half-migrated state.');
    return false;
  }
}
