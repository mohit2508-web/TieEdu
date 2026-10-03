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
  // `audit` is deliberately absent from the "must be empty" list. It is not a
  // fixture table: boot backfills it from the JSON ledger, so a populated audit
  // table is the correct state and an empty one would mean the relational ledger
  // had never been populated. Asserting zero here would have flagged the healthy
  // state as dirty — and invited someone to "fix" it by deleting real history.
  // Only probe-looking rows are treated as dirt, below.
  const counts: [string, string][] = [
    ['devices', `SELECT COUNT(*)::int AS c FROM devices`],
    ['push_subscriptions', `SELECT COUNT(*)::int AS c FROM push_subscriptions`],
    ['staff', `SELECT COUNT(*)::int AS c FROM staff`],
  ];

  let dirty = 0;
  console.log('--- should be empty ----------------------------------------------');
  for (const [name, sql] of counts) {
    const { rows } = await pool.query(sql);
    const c = Number(rows[0].c);
    if (c !== 0) dirty += 1;
    console.log(`  ${c === 0 ? 'ok  ' : 'DIRTY'}  ${name.padEnd(20)} ${c} row(s)`);
  }

  const auditCount = Number(
    (await pool.query('SELECT COUNT(*)::int AS c FROM audit')).rows[0].c
  );
  console.log(`  --   audit                ${auditCount} row(s) (backfilled ledger, not a fixture table)`);

  console.log('\n--- leftover probe-looking rows anywhere in our tables ----------');
  const probes: [string, string][] = [
    ['devices', `SELECT id FROM devices WHERE id LIKE '%verify%' OR id LIKE '%probe%' OR id LIKE '%m2-%'`],
    ['push_subscriptions', `SELECT endpoint FROM push_subscriptions WHERE endpoint LIKE '%verify%' OR endpoint LIKE '%probe%'`],
    ['audit', `SELECT id FROM audit WHERE id LIKE '%verify%' OR actor LIKE '%verify%'`],
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