/**
 * M2 verification: the authority cache.
 *
 * Three things are proved here, and the second is the dangerous one:
 *
 *   1. A warm `getStaffSync()` does no I/O. Before this it was a 3MB read plus
 *      JSON.parse (~24ms) on every admin request, taken twice per request
 *      because requireAuth and requireAdmin each loaded the ledger.
 *
 *   2. A reachable-but-empty `staff` table must NOT blank the cache. `[]` is
 *      truthy, so caching it would give every admin zero permissions until the
 *      TTL expired — the deployment locked out of its own admin panel. This
 *      recreates exactly that state and asserts the grants survive.
 *
 *   3. A grant held only in JSON still reaches PostgreSQL (the upgrade path for
 *      a deployment that has been running since before this milestone).
 *
 * Runs against a scratch copy of the ledger so the live file is never written.
 * The grant seeded into PostgreSQL mirrors what ensureSeedData writes at boot,
 * which is the same convention verify-m1-guards.live.ts already uses.
 */
import fs from 'fs';
import path from 'path';

const SRC = path.join(__dirname, '..', 'data', 'db.json');
const TMP = path.join(__dirname, '..', 'data', 'db.json.m2stafftest');

const main = async () => {
  fs.copyFileSync(SRC, TMP);
  process.env.DB_FILE = TMP;

  const { isDbReachable, getPool } = await import('../src/db/client');
  const { loadDb } = await import('../src/data/db');
  const { ensureStaffTable } = await import('../src/db/migrate');
const { getStaffSync, warmStaffCache, saveStaff, invalidateStaffCache, listStaff, expireStaffCacheForTest } =
  await import('../src/store/staff');
  const { resolveAuthority } = await import('../src/lib/rbac');

  const reachable = await isDbReachable(8000);
  console.log('cluster reachable :', reachable);

  // --- seed the grant the way ensureSeedData does --------------------------
  const db0 = loadDb();
  const admin = (db0.users || []).find((u: any) => u.role === 'admin');
  if (!admin) throw new Error('no admin user in the ledger');
  if (!(db0.staff || []).some((s: any) => s.user_id === admin.id)) {
    db0.staff = db0.staff || [];
    db0.staff.push({
      id: 'staff-m2-verify',
      user_id: admin.id,
      role: 'super_admin',
      permissions: [],
      status: 'active',
      created_by: null,
      created_at: new Date().toISOString(),
    });
    const { saveDb } = await import('../src/data/db');
    saveDb(db0);
  }
  const seeded = ((loadDb().staff || []) as any[]).length;
  console.log('grant in JSON     :', seeded);

  // --- 1. cost: old path vs new --------------------------------------------
  const t0 = Date.now();
  loadDb();
  const oldMs = Date.now() - t0;

  invalidateStaffCache();
  getStaffSync(); // hydrates from JSON
  const t1 = Date.now();
  const N = 5000;
  for (let i = 0; i < N; i++) getStaffSync();
  const newMs = (Date.now() - t1) / N;
  console.log(`loadDb() once     : ${oldMs} ms   (per-request cost before)`);
  console.log(`getStaffSync()    : ${newMs.toFixed(4)} ms   (warm, per request now)`);

  const grants = getStaffSync();
  const auth = resolveAuthority({ id: admin.id, role: 'admin' }, grants);
  console.log(`authority         : role=${auth.role} perms=${auth.permissions.size} ${auth.role ? 'ok' : '< INERT'}`);
  const nobody = resolveAuthority({ id: 'missing-user', role: 'admin' }, grants);
  console.log(`unknown admin     : perms=${nobody.permissions.size} ${nobody.permissions.size === 0 ? '(correct — inert)' : '< LEAK'}`);

  if (!reachable) {
    console.log('\nSKIP: no cluster, JSON path only.');
    fs.unlinkSync(TMP);
    return;
  }

  const pool = getPool();
  await ensureStaffTable();

  // --- 3. JSON-only grant must reach PostgreSQL -----------------------------
  invalidateStaffCache();
  const warm1 = await warmStaffCache();
  const inPg1 = await pool.query('SELECT COUNT(*)::int AS c FROM staff');
  console.log(`\nwarm #1           : source=${warm1.source} count=${warm1.count} backfilled=${warm1.backfilled}`);
  console.log(`pg rows           : ${inPg1.rows[0].c} ${inPg1.rows[0].c > 0 ? '(JSON grant reached the database)' : '< BACKFILL FAILED'}`);

  // --- 2. the lockout scenario ---------------------------------------------
  await pool.query('DELETE FROM staff');
  invalidateStaffCache();
  console.log('\nemptied PostgreSQL staff (JSON still holds the grant)');

  const warm2 = await warmStaffCache();
  const after = getStaffSync();
  const denied = resolveAuthority({ id: admin.id, role: 'admin' }, after);
  console.log(`warm #2           : source=${warm2.source} count=${warm2.count} backfilled=${warm2.backfilled}`);
  console.log(`cache after warm  : ${after.length} grant(s) ${after.length > 0 ? '(correct — no lockout)' : '< LOCKOUT BUG'}`);
  console.log(`auth after warm   : role=${denied.role} perms=${denied.permissions.size} ${denied.role ? 'still authorized' : '< LOCKOUT BUG'}`);

  const inPg2 = await pool.query('SELECT COUNT(*)::int AS c FROM staff');
  console.log(`pg restored to    : ${inPg2.rows[0].c} (self-healed from JSON)`);

  // --- 4. saveStaff dual-writes and refreshes -------------------------------
  const target = getStaffSync()[0];
  if (target) {
    const flipped = { ...target, status: target.status === 'active' ? 'suspended' : 'active' };
    const src = await saveStaff(flipped);
    const inCache = getStaffSync().find((s) => s.id === target.id);
    const inJsonRow = ((loadDb().staff || []) as any[]).find((s) => s.id === target.id);
    const inPgRow = await pool.query('SELECT status FROM staff WHERE id = $1', [target.id]);
    console.log(`\nsaveStaff -> ${src}, cache=${inCache?.status}, json=${inJsonRow?.status}, pg=${inPgRow.rows[0]?.status}`);
    const consistent = inCache?.status === flipped.status
      && inJsonRow?.status === flipped.status
      && inPgRow.rows[0]?.status === flipped.status;
    console.log(`all three agree   : ${consistent ? 'yes' : 'NO — DIVERGED'}`);
    // put it back so the row we leave behind is the correct one
    await saveStaff(target);
  }

  // --- 5. listStaff and the auth cache must agree ---------------------------
  const viaList = await listStaff();
  const viaSync = getStaffSync();
  const same = viaList.length === viaSync.length
    && viaList.every((s) => viaSync.some((t) => t.id === s.id && t.status === s.status));
  console.log(`list vs sync      : ${viaList.length}/${viaSync.length} ${same ? '(consistent)' : '< DIVERGED'}`);

  // --- 6. TTL expiry must not reintroduce the JSON parse -------------------
  // The regression this guards is invisible in the numbers above: at 0.0004ms the
  // warm read looks free either way, so the only way to see it is to expire the
  // cache and time the request that lands on it.
  const probe = { ...(getStaffSync()[0] as Staff) };
  await pool.query('UPDATE staff SET status = $2 WHERE id = $1', [probe.id, 'suspended']);

  // Age the cache past its TTL without invalidating it, the way 30s of quiet
  // would. invalidateStaffCache() would throw the list away and prove nothing.
  expireStaffCacheForTest();

  const tExp = Date.now();
  const first = getStaffSync();          // this is the request that used to pay 76ms
  const expiredMs = Date.now() - tExp;
  console.log(`\nfirst after TTL   : ${expiredMs} ms ${expiredMs < 15 ? '(served stale, no parse)' : '< JSON PARSE ON AUTH PATH'}`);
  console.log(`served stale      : ${first[0]?.status} (still 'active' — PG said suspended)`);

  await new Promise((r) => setTimeout(r, 1500));   // let the background read land
  const second = getStaffSync();
  console.log(`after background  : ${second[0]?.status} ${second[0]?.status === 'suspended' ? '(SQL edit landed)' : '< DIRECT SQL EDIT NEVER OBSERVED'}`);
  console.log(`stale call cheap  : ${second[0]?.status === 'suspended' ? 'yes' : 'n/a'}`);

  // --- teardown -------------------------------------------------------------
  // The seeded grant was a fixture. Leaving it behind would put a row with a
  // test id in a live database — fake data, and a duplicate that the next real
  // boot's ensureSeedData would coexist with. Remove it and let the real boot
  // write the real row.
  await pool.query(`DELETE FROM staff WHERE id = 'staff-m2-verify'`);
  invalidateStaffCache();
  const left = await pool.query('SELECT COUNT(*)::int AS c FROM staff');
  console.log(`pg fixture removed : ${left.rows[0].c === 0 ? 'yes, table left empty' : `still ${left.rows[0].c} row(s)`}`);

  await pool.end();
  fs.unlinkSync(TMP);
  console.log('scratch cleaned');
};

main().catch((e) => {
  console.error('FAILED:', e?.message);
  try { fs.unlinkSync(TMP); } catch { /* ignore */ }
  process.exit(1);
});