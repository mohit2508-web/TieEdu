/**
 * M2 verification: prove the counters survive a real round trip through
 * PostgreSQL. Writes one throwaway row, reads it back through the repository,
 * and deletes it again.
 *
 * Exists because the bug it guards against is invisible to a JSON-only test: a
 * `bigint` column returns a string from node-postgres, so `"3" + 1` produced
 * `"31"` and every funnel figure stayed a plausible-looking lie.
 */
import { isDbReachable, getPool } from '../src/db/client';
import { saveDevice, readDevice, deleteDevice, listDevices } from '../src/store/devices';
import { trackDevice } from '../src/lib/devices';

const PROBE_ID = 'm2-verify-probe-0001';

const main = async () => {
  if (!(await isDbReachable(8000))) {
    console.log('SKIP: no database reachable — the JSON fallback is exercised instead.');
    return;
  }
  const pool = getPool();
  await pool.query('DELETE FROM devices WHERE id = $1', [PROBE_ID]);

  // 1. A round trip with a counter above 1 is the exact shape that used to break.
  await trackDevice(
    { install_id: PROBE_ID, app_version: '1.0.0', install_surface: 'pwa', pwa_prompt: { shown: true, dismissed: true } },
    '127.0.0.1',
    'm2-verify'
  );
  await trackDevice({ install_id: PROBE_ID, pwa_prompt: { shown: true, dismissed: true } }, '127.0.0.1', 'm2-verify');

  const found = await readDevice(PROBE_ID);
  const d = found?.device;
  console.log('source          :', found?.source);
  console.log('pwa_prompt_shown   =', JSON.stringify(d?.pwa_prompt_shown), `(${typeof d?.pwa_prompt_shown})`);
  console.log('pwa_prompt_dismissed =', JSON.stringify(d?.pwa_prompt_dismissed), `(${typeof d?.pwa_prompt_dismissed})`);

  const shownOk = d?.pwa_prompt_shown === 2;
  const dismissedOk = d?.pwa_prompt_dismissed === 2;
  console.log('counters numeric  :', typeof d?.pwa_prompt_shown === 'number' ? 'yes' : 'NO — still a string');
  console.log('counts correct    :', shownOk && dismissedOk ? 'yes' : `NO (expected 2/2)`);

  // 2. first_touch must be set ONCE. The first beacon carries no attribution, a
  //    later one does, and a third one must NOT be able to re-credit the install —
  //    otherwise whichever campaign happens to fire last wins the attribution.
  await trackDevice({ install_id: PROBE_ID, utm_source: 'first-attributed' }, '127.0.0.1', 'm2-verify');
  const setOnce = (await readDevice(PROBE_ID))?.device;
  await trackDevice({ install_id: PROBE_ID, utm_source: 'late-campaign-wins?' }, '127.0.0.1', 'm2-verify');
  const setTwice = (await readDevice(PROBE_ID))?.device;

  const attributionStable = setOnce?.first_touch?.source === 'first-attributed'
    && setTwice?.first_touch?.source === 'first-attributed';
  console.log('first_touch set   :', setOnce?.first_touch?.source ?? '(none)');
  console.log('first_touch held  :', setTwice?.first_touch?.source ?? '(none)', attributionStable ? '(correct — not overwritten)' : '(REWRITTEN — attribution bug)');

  // 3. JSON and PostgreSQL must agree on the VALUES, not just on existence.
  //    Row parity can be true while the counters differ — that divergence is the
  //    silent one, because the dashboard then depends on which store it read.
  const listed = await listDevices();
  const pgRow = listed.devices.find((x) => x.id === PROBE_ID);
  const { loadDb } = await import('../src/data/db');
  const jsonRow = ((loadDb().devices || []) as any[]).find((x) => x.id === PROBE_ID);
  console.log('parity pg/json    :', `pg=${!!pgRow} json=${!!jsonRow}`);

  const cmp: [string, any, any][] = [
    ['pwa_prompt_shown', pgRow?.pwa_prompt_shown, jsonRow?.pwa_prompt_shown],
    ['pwa_prompt_dismissed', pgRow?.pwa_prompt_dismissed, jsonRow?.pwa_prompt_dismissed],
    ['app_version', pgRow?.app_version, jsonRow?.app_version],
    ['install_surface', pgRow?.install_surface, jsonRow?.install_surface],
    ['is_blocked', pgRow?.is_blocked, jsonRow?.is_blocked],
  ];
  let diverged = 0;
  for (const [field, a, b] of cmp) {
    const same = a === b;
    if (!same) diverged += 1;
    console.log(`  ${field.padEnd(22)} pg=${JSON.stringify(a)} json=${JSON.stringify(b)} ${same ? '' : '  <-- DIVERGED'}`);
  }
  console.log('values consistent :', diverged === 0 ? 'yes' : `NO (${diverged} field(s) differ)`);

  // 4. Delete must remove from both.
  const deleted = await deleteDevice(PROBE_ID);
  const gonePg = await pool.query('SELECT 1 FROM devices WHERE id = $1', [PROBE_ID]);
  const goneJson = !((loadDb().devices || []) as any[]).some((x) => x.id === PROBE_ID);
  console.log('delete           :', deleted, `pg_gone=${gonePg.rows.length === 0} json_gone=${goneJson}`);

  await pool.end();
};

main().catch((e) => {
  console.error('FAILED:', e?.message);
  process.exit(1);
});