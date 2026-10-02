import { isDbReachable, getPool } from '../src/db/client';
import { listDevices, readDevice, ensureRelationalReady, backfillDevicesFromJson } from '../src/store/devices';

const main = async () => {
  const ok = await isDbReachable(8000);
  console.log('reachable:', ok);
  if (!ok) return;

  const pool = getPool();

  const tables = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('devices','push_subscriptions','app_state') ORDER BY table_name`
  );
  console.log('tables:', tables.rows.map((r) => r.table_name).join(', '));

  const cols = await pool.query(
    `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
      WHERE table_schema='public' AND table_name='devices'
      ORDER BY ordinal_position`
  );
  console.log('\ndevices columns (' + cols.rows.length + '):');
  for (const c of cols.rows) {
    const nullable = c.is_nullable === 'NO' ? 'NOT NULL' : 'null';
    console.log(`  ${c.column_name.padEnd(20)} ${c.data_type.padEnd(28)} ${nullable}`);
  }

  const n = await pool.query('SELECT COUNT(*)::int AS c FROM devices');
  console.log('\ndevices row count:', n.rows[0].c);

  const idx = await pool.query(
    `SELECT indexname FROM pg_indexes WHERE tablename='devices' ORDER BY indexname`
  );
  console.log('devices indexes:', idx.rows.map((r) => r.indexname).join(', '));

  const pushCols = await pool.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='push_subscriptions' ORDER BY ordinal_position`
  );
  console.log('\npush_subscriptions columns:', pushCols.rows.map((r) => r.column_name).join(', '));

  // Exercise the repository against the real cluster.
  const listed = await listDevices();
  console.log('\nlistDevices ->', listed.devices.length, 'row(s), source:', listed.source);

  const miss = await readDevice('does-not-exist');
  console.log('readDevice(unknown) ->', miss === null ? 'null (correct)' : JSON.stringify(miss).slice(0, 80));

  await ensureRelationalReady();
  const bf = await backfillDevicesFromJson();
  console.log('backfill ->', JSON.stringify(bf));

  await pool.end();
};

main().catch((e) => {
  console.error('FAILED:', e?.message);
  process.exit(1);
});