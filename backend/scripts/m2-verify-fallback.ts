/**
 * M2 verification: the install registry must work with NO database at all.
 *
 * `DATABASE_URL` is cleared before anything imports `db/client`, which makes
 * `isDbReachable()` return false immediately — the exact state of the default dev
 * setup and of a cluster outage. This is the property that decides whether M2 is
 * a safe change: every read and write has to fall back to the JSON ledger, and
 * the endpoint has to behave identically to when the cluster is up.
 *
 * Uses dynamic imports throughout. Static imports are hoisted above the
 * `DATABASE_URL` assignment, and `db/client` captures the value at module load.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * Work on a throwaway copy of the ledger.
 *
 * This script mutates data, so pointing it at the real `data/db.json` means a
 * crash between the write and the teardown leaves a probe install in the live
 * ledger — a fake install that then shows up in admin analytics. Same scratch-copy
 * approach as the other M2 verifiers.
 */
const REAL_DB = path.join(__dirname, '..', 'data', 'db.json');
const TMP = path.join(os.tmpdir(), `tieedu-m2fallback-${process.pid}.json`);
fs.copyFileSync(REAL_DB, TMP);
process.env.DB_FILE = TMP;

const clear = async () => {
  // Set (not delete) so `dotenv.config()` does not repopulate it: dotenv skips
  // keys that already exist in process.env, even when they are empty.
  process.env.DATABASE_URL = '';
};

const main = async () => {
  await clear();

  const { trackDevice, claimDevices } = await import('../src/lib/devices');
  const { readDevice, listDevices, deleteDevice, ensureRelationalReady, _resetReadyCache } = await import('../src/store/devices');
  const { loadDb, saveDb } = await import('../src/data/db');

  const ready = await ensureRelationalReady();
  console.log('relational ready  :', ready, ready ? '< UNEXPECTED' : '(correct — no database)');

  const PROBE = 'm2-fallback-probe-01';
  await deleteDevice(PROBE).catch(() => undefined);

  // 1. The beacon endpoint must still succeed. Returning an error here would take
  //    down every install on the platform the moment the cluster disappears.
  const r1 = await trackDevice(
    { install_id: PROBE, app_version: '2.0.0', install_surface: 'pwa', pwa_prompt: { shown: true, accepted: true } },
    '10.0.0.1',
    'm2-fallback'
  );
  const r2 = await trackDevice({ install_id: PROBE, pwa_prompt: { shown: true } }, '10.0.0.1', 'm2-fallback');
  console.log('track ok           :', r1.ok, r2.ok, r1.ok && r2.ok ? '' : '< endpoint broke');

  // 2. Reads must come from JSON and report that honestly.
  const read = await readDevice(PROBE);
  const listed = await listDevices();
  console.log('read source        :', read?.source, read?.source === 'json' ? '(correct)' : '< wrong source');
  console.log('list source        :', listed.source, listed.source === 'json' ? '(correct)' : '< wrong source');
  console.log('row found          :', !!read?.device);

  // 3. The mutation logic has to survive the fallback: counters are added, not
  //    concatenated, and an accepted prompt still makes the row standalone.
  const d = read?.device;
  console.log('counters           :', `shown=${d?.pwa_prompt_shown} (${typeof d?.pwa_prompt_shown}) accepted=${d?.pwa_prompt_accepted}`);
  console.log('counters numeric   :', typeof d?.pwa_prompt_shown === 'number' ? 'yes' : 'NO');
  console.log('counts 2/1         :', d?.pwa_prompt_shown === 2 ? 'yes' : `NO (got ${d?.pwa_prompt_shown})`);
  console.log('accepted=pwa       :', d?.install_surface === 'pwa' ? 'yes' : `NO (got ${d?.install_surface})`);

  // 4. The row really is in the file, not merely in memory.
  const inFile = ((loadDb().devices || []) as any[]).some((x) => x.id === PROBE);
  console.log('persisted to json  :', inFile ? 'yes' : 'NO — write was lost');

  // 5. Claim works too — it is the other async path rewritten for M2.
  const claim = await claimDevices('user-fallback-test', [PROBE]);
  const claimed = (await readDevice(PROBE))?.device?.user_id;
  console.log('claim              :', `claimed=${claim.claimed} user=${claimed}`, claim.claimed === 1 && claimed === 'user-fallback-test' ? '(correct)' : '< FAILED');

  // 6. Teardown: leave no probe behind in the live ledger.
  await deleteDevice(PROBE);
  const gone = !((loadDb().devices || []) as any[]).some((x) => x.id === PROBE);
  console.log('cleanup            :', gone ? 'clean' : 'PROBE LEFT BEHIND');

  // 7. The audit ledger, which had no no-database coverage at all.
  //
  //    The dual-write is only worth anything if the JSON side survives an outage.
  //    If `listAudit` threw instead of reading JSON, then during a cluster
  //    incident — precisely when an operator needs the record of who did what —
  //    the audit screen would be blank or 500. That is the failure this catches.
  console.log('\n--- audit ledger with no database --------------------------------');
  const { appendAudit, listAudit } = await import('../src/store/audit');

  const db = loadDb();
  const before = (db.audit || []).length;
  const entry = await appendAudit(db, {
    actor: 'fallback@example.com',
    action: 'm2.fallback.probe',
    detail: 'audit must survive a cluster outage',
    meta: { probe: true },
  });
  console.log('append ok          :', !!entry?.id, entry?.id ? '' : '< no row returned');

  // Every real caller pairs appendAudit with saveDb, and with no database that
  // pairing is the ONLY thing putting the entry anywhere durable — `loadDb()`
  // re-reads the file and hands back a new object, so an unsaved append is
  // invisible to the next read. Mirroring the caller sequence exactly is the point
  // of this check; a version that skipped saveDb would be testing nothing.
  saveDb(db);

  const relaunch = await listAudit(60);
  console.log('list source        :', relaunch.source, relaunch.source === 'json' ? '(correct)' : '< wrong source');
  console.log('found the entry   :', relaunch.entries.some((e) => e.id === entry.id));

  const reread = await listAudit(60);
  const inLedger = (loadDb().audit || []) as any[];
  console.log('persisted to file  :', inLedger.some((x) => x.id === entry.id) ? 'yes' : 'NO — write was lost');
  console.log('grew by one        :', inLedger.length === before + 1, `${before} -> ${inLedger.length}`);
  console.log('total is a number  :', typeof reread.total === 'number', `typeof ${typeof reread.total}`);
  console.log(
    'shape preserved    :',
    ['id', 'at', 'actor', 'action', 'detail', 'order_id', 'gateway', 'target', 'meta'].every(
      (k) => k in (inLedger.find((x) => x.id === entry.id) || {})
    )
  );

  // Teardown the probe from the scratch copy. The real ledger was never touched.
  db.audit = inLedger.filter((x) => x.id !== entry.id);
  saveDb(db);
  const cleaned = !((loadDb().audit || []) as any[]).some((x) => x.id === entry.id);
  console.log('audit cleanup      :', cleaned ? 'clean' : 'PROBE LEFT BEHIND');
};

main().catch((e) => {
  console.error('FAILED:', e?.message);
  process.exit(1);
}).finally(() => {
  try { fs.unlinkSync(TMP); } catch { /* ignore */ }
});