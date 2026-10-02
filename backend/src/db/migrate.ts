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
}

export async function runMigrations(): Promise<boolean> {
  if (!(await isDbReachable(6000))) {
    console.log('💡 [PostgreSQL] Replica unreachable or not configured — staying on local-json-repository. (Replica requires ENABLE_PG_REPLICA=1 + DATABASE_URL + network allowlist).');
    return false;
  }

  try {
    await ensureAppStateTable();
    await ensurePushSubscriptionsTable();
    console.log('✅ [PostgreSQL] app_state and push_subscriptions tables ready.');
    return true;
  } catch (err: any) {
    console.log('💡 [PostgreSQL] Migration failed: ' + err.message);
    console.log('💡 [TieEdu] Serving from local-json-repository (backend/data/db.json). No data is in a half-migrated state.');
    return false;
  }
}
