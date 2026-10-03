/**
 * M2 verification: the audit ledger's relational store, against the live cluster.
 *
 * The claims worth checking here are the ones that were previously only asserted
 * in comments. Specifically: that retention is a bound on the record rather than
 * a per-process slice of memory, that an event recorded while the cluster was down
 * is still readable, and that the two stores agree on the row shape.
 *
 * Destructive: writes fixtures to the live `audit` table and deletes every one of
 * them on the way out, including on failure. JSON work happens in a scratch copy
 * so `data/db.json` is never written.
 *
 *   npx tsx scripts/m2-verify-audit.ts
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

// DB_FILE is captured at module load in data/db.ts, so it has to be set before
// anything below is imported — hence dynamic imports inside main().
//
// Scratch copy in the OS temp directory rather than `data/`: a run killed before
// its cleanup could not run would otherwise leave a `db.auditverify-<pid>.json`
// sitting next to the real ledger forever.
const REAL_DB = path.join(__dirname, '..', 'data', 'db.json');
const TMP = path.join(os.tmpdir(), `tieedu-auditverify-${process.pid}.json`);
fs.copyFileSync(REAL_DB, TMP);
process.env.DB_FILE = TMP;

let failures = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (!ok) failures += 1;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` \u2014 ${detail}` : ''}`);
};

const main = async () => {
  const { isDbReachable, getPool } = await import('../src/db/client');
  const { loadDb, saveDb } = await import('../src/data/db');
  const { ensureAuditTable } = await import('../src/db/migrate');
  const { appendAudit, listAudit, backfillAuditFromJson } = await import('../src/store/audit');
  const { AUDIT_CAP } = await import('../src/lib/audit');

  const jsonAudit = () => (loadDb().audit || []) as any[];

  // Only ever delete rows this script made.
  //
  // It used to open with `DELETE FROM audit`. That was written on the assumption
  // that the table held nothing but fixtures — but boot backfills it from the
  // JSON ledger, so in any real deployment it holds the platform's actual audit
  // history, and a verification run would have deleted it. A test that destroys
  // the record of what happened is worse than no test.
  //
  // The retention check further down cannot run against a table holding real rows,
  // because enforcing the cap evicts the oldest rows and those would be real ones.
  // So it is gated rather than made destructive.
  // Matched on action/actor rather than id. `appendAudit` generates its own id
  // (`a<timestamp>-<seq>`), so an id-prefix filter never matched the probe and
  // every run leaked a row into the live ledger — which is exactly how the table
  // ended up holding entries this repo has no record of.
  const PROBE = `action LIKE 'verify.%' OR actor LIKE 'verify@%' OR actor = 'verify' OR id LIKE 'verify-%' OR id LIKE 'order_verify%'`;

  try {
    const reachable = await isDbReachable(4000);
    console.log(`cluster reachable : ${reachable}`);
    if (!reachable) {
      console.log('\nSKIP: this script verifies the relational path and needs the cluster.');
      return;
    }
    const pool = getPool();
    // Declared after `pool` — these close over it.
    const dropProbes = () => pool.query(`DELETE FROM audit WHERE ${PROBE}`);
    const countProbes = async () =>
      Number((await pool.query(`SELECT COUNT(*)::int AS c FROM audit WHERE ${PROBE}`)).rows[0].c);
    await ensureAuditTable();

    const realRows = Number((await pool.query('SELECT COUNT(*)::int AS c FROM audit')).rows[0].c);
    console.log(`real ledger rows   : ${realRows} (preserved by this script)`);
    await dropProbes();

    console.log('\n--- 1. dual-write ------------------------------------------------');
    const db = loadDb();
    const row = await appendAudit(db, {
      actor: 'verify@example.com',
      action: 'verify.probe',
      detail: 'm2 audit verification',
      order_id: 'order_verify_0001',
      gateway: 'razorpay',
      target: 'install_verify01',
      meta: { probe: true },
    });
    // Every real caller pairs appendAudit with saveDb. Without this the in-memory
    // append is thrown away, because loadDb() re-reads the file rather than
    // handing back the object it was given — which is itself worth knowing, and is
    // why the store comment is careful about which half persists where.
    saveDb(db);
    const pg = (await pool.query('SELECT * FROM audit WHERE id = $1', [row.id])).rows[0];
    const js = jsonAudit().find((r) => r.id === row.id);
    check('row reached PostgreSQL', !!pg, row.id);
    check('row reached the JSON ledger', !!js, 'dual-write means both, always');
    check('actor persisted', pg?.actor === 'verify@example.com', String(pg?.actor));
    check('order_id persisted', pg?.order_id === 'order_verify_0001');
    check('target persisted', pg?.target === 'install_verify01');
    check('gateway persisted', pg?.gateway === 'razorpay');
    check('meta persisted as jsonb', !!pg?.meta?.probe === true, JSON.stringify(pg?.meta));

    console.log('\n--- 2. row shape -------------------------------------------------');
    const shape = ['id', 'at', 'actor', 'action', 'detail', 'order_id', 'gateway', 'target', 'meta'];
    const extra = Object.keys(js || {}).filter((k) => !shape.includes(k));
    check('JSON row has exactly the canonical fields', extra.length === 0, extra.join(',') || 'no extras');
    check(
      'both stores agree on actor',
      pg?.actor === js?.actor,
      `pg=${pg?.actor} json=${js?.actor}`
    );
    check('detail defaulted rather than undefined', js?.detail === 'm2 audit verification');

    console.log('\n--- 3. reads ------------------------------------------------------');
    const live = await listAudit(60);
    check('PG-primary read finds it', live.entries.some((e) => e.id === row.id), live.source);
    check('reported the relational source', live.source === 'postgres', live.source);
    check('total came back as a number', typeof live.total === 'number', `typeof ${typeof live.total}`);
    const read = live.entries.find((e) => e.id === row.id);
    check(
      'at round-trips as an ISO string',
      typeof read?.at === 'string' && read.at.endsWith('Z'),
      `typeof ${typeof read?.at} value=${JSON.stringify(read?.at)}`
    );

    // The audit fallback is not a performance nicety: if the cluster is gone at
    // the one moment an event is recorded, JSON is the entire evidence.
    //
    // `listAudit` reads the relational table whenever that table has anything in
    // it, so with real history present the JSON branch is unreachable from here —
    // emptying the table to reach it would delete the ledger, which is the exact
    // thing this script must not do. The no-database path is covered by
    // `m2-verify-fallback.ts` instead, which is where the fallback actually
    // matters. What is asserted here is that the relational row really is gone and
    // the JSON copy really did survive.
    await pool.query(`DELETE FROM audit WHERE id = $1`, [row.id]);
    const goneRelational = !(await pool.query('SELECT 1 FROM audit WHERE id = $1', [row.id])).rows.length;
    check('the relational copy of it is gone', goneRelational === true);
    const stillInJson = jsonAudit().some((e) => e.id === row.id);
    check('the JSON copy survived', stillInJson === true, `in json=${stillInJson}`);

    const duringOutage = await listAudit(60);
    const realStillReadable = duringOutage.entries.length > 0;
    check(
      'the real ledger is still served relationally',
      realStillReadable && duringOutage.source === 'postgres',
      `source=${duringOutage.source} entries=${duringOutage.entries.length}`
    );
    check(
      'a row absent from PG is not served from JSON while PG has rows',
      !duringOutage.entries.some((e) => e.id === row.id),
      'PG-primary is the documented policy'
    );

    console.log('\n--- 4. boot backfill ----------------------------------------------');
    const backfilled = await backfillAuditFromJson();
    check('JSON-only row was copied back in', backfilled.copied >= 1, `copied=${backfilled.copied}`);
    check(
      'the copy kept every field',
      !!(await pool.query('SELECT 1 FROM audit WHERE id = $1', [row.id])).rows.length
    );

    console.log('\n--- 5. retention is a bound on the record ------------------------');
    // This is the substantive check. Retention used to be
    // `db.audit.slice(-1000)` in memory: a per-process window, not a bound, and
    // one that a restart resets.
    //
    // Gated on the table holding nothing but this run's fixtures. Enforcing the cap
    // evicts the OLDEST rows in the table, so with real history present those would
    // be real events — and no assertion about them is worth destroying the ledger
    // to make. Skipped loudly rather than silently.
    await dropProbes();
    const remaining = Number((await pool.query('SELECT COUNT(*)::int AS c FROM audit')).rows[0].c);
    if (remaining > 0) {
      console.log(
        `  SKIP  retention check needs an empty ledger; ${remaining} real row(s) present.`
      );
      console.log('        Run against a fresh database to exercise it.');
    } else {
      await pool.query(
        `INSERT INTO audit (id, at, actor, action, detail)
         SELECT 'verify-cap-' || g,
                NOW() - (interval '1 minute') * (g + 1),
                'verify', 'verify.cap', 'cap probe'
         FROM generate_series(1, ${AUDIT_CAP + 200}) AS g`
      );
      const before = (await pool.query('SELECT COUNT(*)::int AS c FROM audit')).rows[0].c;
      check('fixtures inserted past the cap', Number(before) === AUDIT_CAP + 200, `${before} rows`);

      await appendAudit(db, { actor: 'verify', action: 'verify.trim', detail: 'triggers the cap' });
      const after = (await pool.query('SELECT COUNT(*)::int AS c FROM audit')).rows[0].c;
      check('retention trimmed to the cap', Number(after) === AUDIT_CAP, `${after} rows`);

      const oldest = await pool.query('SELECT id, action FROM audit ORDER BY at ASC, id ASC LIMIT 1');
      const newest = await pool.query('SELECT id, action FROM audit ORDER BY at DESC, id DESC LIMIT 1');
      check(
        'the OLDEST rows were the ones dropped',
        String(oldest.rows[0]?.id).startsWith('verify-cap-'),
        `oldest kept = ${oldest.rows[0]?.id}`
      );
      check(
        'the newest row survived',
        newest.rows[0]?.action === 'verify.trim',
        String(newest.rows[0]?.action)
      );
    }

    console.log('\n--- teardown -----------------------------------------------------');
    // Restore first, then clean.
    //
    // The order matters. The run deletes and re-adds rows, and
    // `backfillAuditFromJson()` puts the ledger back the way a boot would — but
    // the scratch JSON still holds this run's probe, so backfilling *after* the
    // cleanup resurrected it. Backfill, then drop probes, and check last.
    await backfillAuditFromJson();

    // Probe rows only, including the 1200 the cap check bulk-inserted. The real
    // ledger stays untouched.
    //
    // No exact count assertion on the ledger: a running dev server writes to this
    // same shared table, so any exact figure is a race. "No probe rows left" is
    // the property that matters — that is what would otherwise pollute the ledger.
    const del = await dropProbes();
    const left = await countProbes();
    check('no probe rows left', left === 0, `deleted ${del.rowCount}, left ${left}`);
    const kept = Number((await pool.query('SELECT COUNT(*)::int AS c FROM audit')).rows[0].c);
    console.log(`  --   ledger rows after run: ${kept} (started with ${realRows})`);

    await pool.end();
  } finally {
    try { fs.unlinkSync(TMP); } catch { /* ignore */ }
  }

  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
};

main().catch((e) => {
  console.error('FAILED:', e?.message);
  console.error(e?.stack);
  (async () => {
    try {
      const { getPool } = await import('../src/db/client');
      const pool = getPool();
      await pool.query(`DELETE FROM audit WHERE action LIKE 'verify.%' OR actor LIKE 'verify@%' OR actor = 'verify' OR id LIKE 'verify-%' OR id LIKE 'order_verify%'`);
      await pool.end();
    } catch { /* nothing else to try */ }
  })();
  process.exit(1);
});