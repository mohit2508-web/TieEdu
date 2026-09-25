import { pool } from './client';
import { isDbReachable } from './client';

// Phase O migration: TieEdu stores its entire document as ONE JSONB row.
// CockroachDB has no `SERIAL`, so the old schema (which used `INT SERIAL PRIMARY KEY`
// and seeded FAKE unlock_count=1420 rows) never worked — and also violated the
// "no fake data" rule. This migration creates only the app_state replica table and
// reports honestly. Real data is cold-imported from db.json by storage.init().

export async function ensureAppStateTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id          TEXT PRIMARY KEY,
      doc         JSONB NOT NULL,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function runMigrations(): Promise<boolean> {
  console.log('🔄 [CockroachDB] Probing Cloud cluster (senior-tamarin-33886.j77)...');

  if (!(await isDbReachable(6000))) {
    console.log('💡 [CockroachDB] Unreachable/timeout — staying on local-json-repository. (Replica requires ENABLE_PG_REPLICA=1 + network allowlist).');
    return false;
  }

  try {
    await ensureAppStateTable();
    console.log('✅ [CockroachDB] app_state table ready (whole-document replica).');
    return true;
  } catch (err: any) {
    console.log('💡 [CockroachDB] Migration failed: ' + err.message);
    console.log('💡 [TieEdu] Serving from local-json-repository (backend/data/db.json). No data is in a half-migrated state.');
    return false;
  }
}