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
const clear = async () => {
  // Set (not delete) so `dotenv.config()` does not repopulate it: dotenv skips
  // keys that already exist in process.env, even when they are empty.
  process.env.DATABASE_URL = '';
};

const main = async () => {
  await clear();

  const { trackDevice, claimDevices } = await import('../src/lib/devices');
  const { readDevice, listDevices, deleteDevice, ensureRelationalReady, _resetReadyCache } = await import('../src/store/devices');
  const { loadDb } = await import('../src/data/db');

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
};

main().catch((e) => {
  console.error('FAILED:', e?.message);
  process.exit(1);
});