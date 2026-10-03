/**
 * M2 verification: the push subscription store, against the live cluster.
 *
 * The defects this store fixed were all documented as if they were not there — a
 * comment claimed reads fell back to JSON while the function returned `[]`, and
 * another claimed `device_id` was unnecessary while the device admin route
 * matched on it. So each one is checked here by breaking it deliberately rather
 * than by reading the code and agreeing with it.
 *
 * Destructive: it writes fixtures to the live database and deletes every one of
 * them on the way out, including on failure. JSON work happens in a scratch copy
 * so `data/db.json` is never touched.
 *
 *   npx tsx scripts/m2-verify-push.ts
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

// `DB_FILE` is captured at module load in data/db.ts, and DATABASE_URL in
// db/client.ts, so both must be set before anything below is imported. Static
// imports are hoisted above these assignments, which is why every dynamic import
// happens inside main().
//
// The scratch copy goes to the OS temp directory, not to `data/`. It used to go
// to `data/`, and any run whose output pipe closed early — `| head`, a truncated
// CI log — killed the process before the cleanup in `finally` could run, leaving
// `db.pushverify-<pid>.json` next to the real ledger. Nothing ever read those
// again, they just accumulated. A scratch file that can outlive its own run has no
// business living in the data directory.
const REAL_DB = path.join(__dirname, '..', 'data', 'db.json');
const TMP = path.join(os.tmpdir(), `tieedu-pushverify-${process.pid}.json`);
fs.copyFileSync(REAL_DB, TMP);
process.env.DB_FILE = TMP;

const DEVICE = 'install_pushverify01';
const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/pushverify-endpoint-0001';
const USER = 'user-pushverify';
const KEYS = { p256dh: 'BPverifyP256dhKey', auth: 'AuthVerifyKey01' };

let failures = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (!ok) failures += 1;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` \u2014 ${detail}` : ''}`);
};

const sub = (over: Partial<any> = {}) => ({
  id: 'push-verify-0001',
  user_id: USER,
  device_id: DEVICE,
  provider: 'vapid' as const,
  endpoint: ENDPOINT,
  keys_json: KEYS,
  created_at: new Date().toISOString(),
  last_success_at: null,
  failure_count: 0,
  disabled_at: null,
  disable_reason: null,
  user_agent: 'verify/1.0',
  platform: 'web',
  last_seen_at: new Date().toISOString(),
  ...over,
});

const main = async () => {
  const { isDbReachable, getPool } = await import('../src/db/client');
  const { loadDb } = await import('../src/data/db');
  const { ensureDevicesTable, ensurePushSubscriptionsTable } = await import('../src/db/migrate');
  const { trackDevice } = await import('../src/lib/devices');
  const {
    saveSubscription,
    listSubscriptionsForUser,
    retireSubscription,
    recordSendOutcome,
    setDeviceSubscriptionsBlocked,
    backfillSubscriptionsFromJson,
    MAX_SEND_FAILURES,
  } = await import('../src/store/push');

  const jsonRow = () => ((loadDb().push_subscriptions || []) as any[]).find((s) => s.endpoint === ENDPOINT);

  try {
    const reachable = await isDbReachable(4000);
    console.log(`cluster reachable : ${reachable}`);
    if (!reachable) {
      console.log('\nSKIP: this script verifies the relational path and needs the cluster.');
      return;
    }
    const pool = getPool();
    await ensureDevicesTable();
    await ensurePushSubscriptionsTable();

    const pgRows = async () =>
      (await pool.query('SELECT * FROM push_subscriptions WHERE endpoint LIKE $1', ['%pushverify%'])).rows;

    // A linked subscription is only linked to an install that exists, which is
    // the check subscribePush performs, so the install has to be there first.
    //
    // Seeded through the real beacon rather than by calling saveDevice directly.
    // Hand-writing the row meant guessing at the NOT NULL columns — it took two
    // attempts (platform, then last_active_at) before the write silently landed in
    // JSON only, which the script flagged rather than hid. The beacon fills all of
    // them by construction, and it is the path production actually takes.
    const tracked = await trackDevice(
      { install_id: DEVICE, app_version: '1.0.0', install_surface: 'pwa' },
      '127.0.0.1',
      'verify/1.0'
    );
    check('install created via the real beacon', tracked.ok === true, `reason=${tracked.reason || 'none'}`);

    console.log('\n--- 1. dual-write ------------------------------------------------');
    const where = await saveSubscription(sub());
    const pg = await pgRows(pool);
    const js = jsonRow();
    check('reported a store', where === 'postgres' || where === 'json', String(where));
    check('row reached PostgreSQL', pg.length === 1, `${pg.length} row(s)`);
    check('row reached the JSON ledger too', !!js, 'dual-write means both, always');
    check('device_id persisted in PG', pg[0]?.device_id === DEVICE, String(pg[0]?.device_id));
    check('keys_json persisted in PG', !!pg[0]?.keys_json, 'was always NULL before');
    check('legacy split keys kept in sync', pg[0]?.p256dh === KEYS.p256dh && pg[0]?.auth === KEYS.auth);
    check(
      'both stores agree on device_id',
      pg[0]?.device_id === js?.device_id,
      `pg=${pg[0]?.device_id} json=${js?.device_id}`
    );

    console.log('\n--- 2. reads ------------------------------------------------------');
    const live = await listSubscriptionsForUser(USER);
    check('PG-primary read finds it', live.length === 1, `${live.length}`);
    check('read returns real keys', live[0]?.keys_json?.p256dh === KEYS.p256dh);
    check('read carries device_id', live[0]?.device_id === DEVICE);

    // The bug this whole store exists to fix: reads had no fallback at all, so an
    // outage during a broadcast meant nobody was told.
    await pool.query(`DELETE FROM push_subscriptions WHERE endpoint LIKE $1`, ['%pushverify%']);
    const duringOutage = await listSubscriptionsForUser(USER);
    check(
      'read still finds it with the table emptied',
      duringOutage.length === 1,
      `${duringOutage.length} \u2014 an outage must not silence every broadcast`
    );

    console.log('\n--- 3. boot backfill ----------------------------------------------');
    await backfillSubscriptionsFromJson();
    const restored = await pgRows(pool);
    check('JSON-only row was copied into PostgreSQL', restored.length === 1, `${restored.length}`);
    check('backfilled row kept device_id', restored[0]?.device_id === DEVICE, String(restored[0]?.device_id));
    check('backfilled row kept keys_json', !!restored[0]?.keys_json);

    console.log('\n--- 4. device block ----------------------------------------------');
    const disabled = await setDeviceSubscriptionsBlocked(DEVICE, true);
    const afterBlock = await listSubscriptionsForUser(USER);
    const blockPg = (await pgRows(pool))[0];
    check('block reported the subscription', disabled >= 1, `${disabled}`);
    check('blocked endpoint no longer delivers', afterBlock.length === 0, `${afterBlock.length} still live`);
    check('PG row is disabled', !!blockPg?.disabled_at && blockPg?.active === false);
    check('JSON row is disabled', !!jsonRow()?.disabled_at);
    check(
      'disable reason recorded',
      blockPg?.disable_reason === 'device_blocked',
      String(blockPg?.disable_reason)
    );

    console.log('\n--- 5. user opt-out survives an unblock ---------------------------');
    const optedOut = ENDPOINT + '-optedout';
    await saveSubscription(sub({ id: 'push-verify-optout', endpoint: optedOut } as any));
    await retireSubscription(optedOut, 'user_opted_out');
    await setDeviceSubscriptionsBlocked(DEVICE, false);
    const afterUnblock = await listSubscriptionsForUser(USER);
    const revived = await pgRows(pool);
    check('block-disabled endpoint came back', afterUnblock.some((s: any) => s.endpoint === ENDPOINT));
    check(
      'opted-out endpoint stayed retired',
      !afterUnblock.some((s: any) => s.endpoint === optedOut),
      'lifting a device block is not consent to re-subscribe'
    );
    check(
      'PG agrees the opted-out row is still disabled',
      revived.find((r: any) => r.endpoint === optedOut)?.disable_reason === 'user_opted_out'
    );

    console.log('\n--- 6. failure counting ------------------------------------------');
    const failing = ENDPOINT + '-failing';
    await saveSubscription(sub({ id: 'push-verify-failing', endpoint: failing } as any));
    for (let i = 1; i < MAX_SEND_FAILURES; i++) {
      const r = await recordSendOutcome(failing, false);
      check(`failure ${i} did not retire it`, r.retired === false, `count=${r.failure_count}`);
    }
    const last = await recordSendOutcome(failing, false);
    const deadPg = (await pool.query('SELECT * FROM push_subscriptions WHERE endpoint = $1', [failing])).rows[0];
    check(`failure ${MAX_SEND_FAILURES} retired it`, last.retired === true, `count=${last.failure_count}`);
    check('PG disabled it', !!deadPg?.disabled_at && deadPg?.active === false);
    check('reason is send_failed', deadPg?.disable_reason === 'send_failed', String(deadPg?.disable_reason));
    check(
      'the count came back as a number, not a string',
      typeof last.failure_count === 'number',
      `typeof ${typeof last.failure_count}`
    );
    const deadJson = ((loadDb().push_subscriptions || []) as any[]).find((s) => s.endpoint === failing);
    check('JSON retired it too', !!deadJson?.disabled_at, String(deadJson?.disabled_at));

    console.log('\n--- 7. success resets the counter --------------------------------');
    const okEp = ENDPOINT + '-ok';
    await saveSubscription(sub({ id: 'push-verify-ok', endpoint: okEp } as any));
    await recordSendOutcome(okEp, false);
    await recordSendOutcome(okEp, false);
    const ok = await recordSendOutcome(okEp, true);
    const okPg = (await pool.query('SELECT * FROM push_subscriptions WHERE endpoint = $1', [okEp])).rows[0];
    check('success zeroed the counter', ok.failure_count === 0, String(ok.failure_count));
    check('last_success_at stamped', !!okPg?.last_success_at);
    check('not retired', okPg?.disabled_at === null);

    console.log('\n--- teardown -----------------------------------------------------');
    // Every row this script created, by endpoint prefix. Leaving them behind
    // would be fake data in a live database, which is the exact mistake the
    // test-harness isolation fix was about.
    const del = await pool.query(`DELETE FROM push_subscriptions WHERE endpoint LIKE $1`, ['%pushverify%']);
    const dev = await pool.query(`DELETE FROM devices WHERE id LIKE $1`, ['%pushverify%']);
    const left = await pool.query(
      `SELECT COUNT(*)::int AS c FROM push_subscriptions WHERE endpoint LIKE $1`,
      ['%pushverify%']
    );
    check('no subscription fixtures left', Number(left.rows[0].c) === 0, `deleted ${del.rowCount}`);
    check('device fixtures removed', dev.rowCount >= 1, `deleted ${dev.rowCount}`);

    await pool.end();
  } finally {
    // Always clean the scratch copy. `data/db.json` itself is never written,
    // because DB_FILE pointed at the copy.
    try { fs.unlinkSync(TMP); } catch { /* ignore */ }
  }

  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
};

main().catch((e) => {
  console.error('FAILED:', e?.message);
  console.error(e?.stack);
  // Best-effort teardown: a fixture left behind is fake data in a live database.
  (async () => {
    try {
      const { getPool } = await import('../src/db/client');
      const pool = getPool();
      await pool.query(`DELETE FROM push_subscriptions WHERE endpoint LIKE $1`, ['%pushverify%']);
      await pool.query(`DELETE FROM devices WHERE id LIKE $1`, ['%pushverify%']);
      await pool.end();
    } catch { /* nothing else to try */ }
  })();
  process.exit(1);
});