/** Read-only diagnostic: push_subscriptions shape and contents. */
import fs from 'fs';
import os from 'os';
import path from 'path';

const T = path.join(os.tmpdir(), `tieedu-pushdiag-${process.pid}.json`);
fs.copyFileSync(path.join(__dirname, '..', 'data', 'db.json'), T);
process.env.DB_FILE = T;

const main = async () => {
  const { getPool } = await import('../src/db/client');
  const n = await getPool().query('SELECT count(*)::int AS c FROM push_subscriptions');
  console.log(`ROWS ${n.rows[0].c}`);
  const cols = await getPool().query(
    `SELECT column_name, is_nullable, column_default FROM information_schema.columns
     WHERE table_name='push_subscriptions' ORDER BY ordinal_position`
  );
  cols.rows.forEach((c) => {
    console.log(`COL ${c.column_name} nullable=${c.is_nullable} default=${c.column_default ?? '-'}`);
  });
  const rows = await getPool().query(
    `SELECT id, user_id, device_id, endpoint FROM push_subscriptions ORDER BY created_at DESC LIMIT 5`
  );
  rows.rows.forEach((r) => {
    console.log(`ROW ${r.id} user=${r.user_id} device=${r.device_id} endpoint=${String(r.endpoint).slice(0, 50)}`);
  });
  await getPool().end();
  try { fs.unlinkSync(T); } catch { /* ignore */ }
};
main().catch((e) => { console.error('ERR', e?.message); process.exit(1); });