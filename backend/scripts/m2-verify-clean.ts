/**
 * Confirm the live cluster holds no test fixtures.
 *
 * Every verification script deletes its own rows, but "the script said it cleaned
 * up" is a claim, and this is the state that matters: the cluster is shared with
 * other projects, so a leaked fixture is both fake data in production and something
 * the next person has to notice is not real.
 *
 * Read-only. Touches nothing.
 *
 *   npx tsx scripts/m2-verify-clean.ts
 */

const main = async () => {
  const { isDbReachable, getPool } = await import('../src/db/client');

  if (!(await isDbReachable(5000))) {
    console.log('SKIP: cluster unreachable — nothing to inspect.');
    return;
  }
  const pool = getPool();

  // Only this project's tables. The cluster also holds other tenants' data
  // (including a capitalised AuditLog that is not ours), which is left alone.
  //
  // This checks fixtures, not production. None of these tables is a fixture
  // table:
  //
  //   audit     backfilled from the JSON ledger at boot, so populated is correct
  //   staff     real admin accounts. The first time this ran it reported the
  //             owner's own super_admin row as DIRTY, which is the healthy state
  //   devices   real PWA installs
  //
  // Asserting zero on any of them flags normal use as dirt, and the obvious
  // "fix" is to delete real rows. What actually matters is whether a verification
  // run left fixtures behind, so that is the only thing judged below.
  const counts: [string, string][] = [
    ['devices', `SELECT COUNT(*)::int AS c FROM devices`],
    ['push_subscriptions', `SELECT COUNT(*)::int AS c FROM push_subscriptions`],
    ['staff', `SELECT COUNT(*)::int AS c FROM staff`],
    ['audit', `SELECT COUNT(*)::int AS c FROM audit`],
  ];

  let dirty = 0;
  console.log('--- row counts (informational: these tables hold real data) ------');
  for (const [name, sql] of counts) {
    const { rows } = await pool.query(sql);
    const c = Number(rows[0].c);
    console.log(`  --   ${name.padEnd(20)} ${c} row(s)`);
  }

  console.log('\n--- leftover probe-looking rows anywhere in our tables ----------');
  // Matches the filters the verifiers themselves use to clean up. They key on
  // actor/action as well as id, because `appendAudit` generates its own id, so an
  // id-only filter never matched the probe it had just written.
  const probes: [string, string][] = [
    ['devices', `SELECT id FROM devices WHERE id LIKE '%verify%' OR id LIKE '%probe%' OR id LIKE '%m2-%'`],
    ['push_subscriptions', `SELECT endpoint FROM push_subscriptions WHERE endpoint LIKE '%verify%' OR endpoint LIKE '%probe%'`],
    ['audit', `SELECT id FROM audit WHERE action LIKE 'verify.%' OR actor LIKE '%verify@%' OR actor = 'verify' OR id LIKE '%verify%'`],
    ['staff', `SELECT id FROM staff WHERE user_id LIKE '%verify%' OR user_id LIKE '%m2-%'`],
  ];
  for (const [name, sql] of probes) {
    const { rows } = await pool.query(sql);
    if (rows.length) dirty += 1;
    console.log(
      `  ${rows.length === 0 ? 'ok  ' : 'DIRTY'}  ${name.padEnd(20)} ${rows.length} probe row(s)` +
        (rows.length ? ` -> ${rows.map((r: any) => r.id || r.endpoint).join(', ')}` : '')
    );
  }

  await pool.end();
  console.log(dirty === 0 ? '\nCLUSTER CLEAN' : `\n${dirty} THING(S) TO CLEAN UP`);
  process.exit(dirty === 0 ? 0 : 1);
};

main().catch((e) => {
  console.error('FAILED:', e?.message);
  process.exit(1);
});