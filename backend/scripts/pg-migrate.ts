/**
 * Copy every relational table from one PostgreSQL-wire database to another and
 * prove the copy is exact. Built for the CockroachDB Cloud -> local PostgreSQL
 * move, and works in reverse for a rollback.
 *
 * Run from backend/:
 *   SOURCE_DATABASE_URL=... TARGET_DATABASE_URL=... \
 *     npx ts-node --transpile-only scripts/pg-migrate.ts <command>
 *
 * Commands
 *   plan     Read-only. Tables, row counts on both sides, schema gaps, integer
 *            values too large for the target column. Run this first.
 *   schema   Create the app's tables on TARGET by running the app's own
 *            migrations (idempotent - safe to repeat).
 *   copy     Replace TARGET's rows with SOURCE's, in ONE transaction, then run
 *            verify. Needs --yes. Refuses a non-empty target without --overwrite.
 *   verify   Read-only. Per table: row count + an order-independent digest of
 *            every value, compared across both sides. Exit code 1 on any mismatch.
 *
 * SSL: SOURCE_DATABASE_SSL / TARGET_DATABASE_SSL = 0 or 1. Default: off for
 * localhost, on for anything else.
 *
 * How exactness is kept
 *   - Every type parser is the identity: values travel as the server's text and
 *     are inserted as untyped parameters, so the target casts them itself. No
 *     JavaScript Date/number round trip can shift a timestamp or round an int8.
 *   - Source rows are read inside one READ ONLY transaction: one snapshot.
 *   - Target rows are deleted and inserted inside one transaction: a failure at
 *     any table leaves the target exactly as it was.
 *   - The digest normalises only representation (JSON key order, timestamp
 *     offset spelling, int width), never content, and hashes each row, so row
 *     order and collation cannot cause a false mismatch.
 */
import crypto from 'crypto';
import { Client } from 'pg';

type Side = 'source' | 'target';
type Column = { name: string; type: string };
type Table = { name: string; columns: Column[]; pk: string[] };

const identity = { getTypeParser: () => (v: any) => v };
const q = (id: string) => '"' + id.replace(/"/g, '""') + '"';

function sideUrl(side: Side): string {
  const url = process.env[side === 'source' ? 'SOURCE_DATABASE_URL' : 'TARGET_DATABASE_URL'];
  if (!url) throw new Error(`${side.toUpperCase()}_DATABASE_URL is not set`);
  return url;
}

function isLocal(url: string): boolean {
  try {
    return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

function sideSsl(side: Side): false | { rejectUnauthorized: false } {
  const raw = process.env[side === 'source' ? 'SOURCE_DATABASE_SSL' : 'TARGET_DATABASE_SSL'];
  const on = raw === undefined || raw === '' ? !isLocal(sideUrl(side)) : !/^(0|false|off|disable)$/i.test(raw);
  return on ? { rejectUnauthorized: false } : false;
}

function redact(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || '5432'}${u.pathname}`;
  } catch {
    return 'unparseable-url';
  }
}

async function connect(side: Side): Promise<Client> {
  const c = new Client({ connectionString: sideUrl(side), ssl: sideSsl(side), types: identity as any });
  await c.connect();
  await c.query(`SET TIME ZONE 'UTC'`);
  return c;
}

async function isCockroach(c: Client): Promise<boolean> {
  const r = await c.query('SELECT version() AS v');
  return /cockroach/i.test(r.rows[0].v);
}

async function readTables(c: Client): Promise<Map<string, Table>> {
  const cols = await c.query(
    `SELECT table_name, column_name, data_type
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN (SELECT table_name FROM information_schema.tables
                            WHERE table_schema = 'public' AND table_type = 'BASE TABLE')
      ORDER BY table_name, ordinal_position`
  );
  const pks = await c.query(
    `SELECT kcu.table_name, kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
        AND kcu.table_name = tc.table_name
      WHERE tc.table_schema = 'public' AND tc.constraint_type = 'PRIMARY KEY'
      ORDER BY kcu.table_name, kcu.ordinal_position`
  );
  const out = new Map<string, Table>();
  for (const r of cols.rows) {
    // CockroachDB exposes its hidden rowid on tables without a primary key.
    if (r.column_name === 'rowid') continue;
    if (!out.has(r.table_name)) out.set(r.table_name, { name: r.table_name, columns: [], pk: [] });
    out.get(r.table_name)!.columns.push({ name: r.column_name, type: String(r.data_type).toLowerCase() });
  }
  for (const r of pks.rows) {
    if (r.column_name === 'rowid') continue;
    out.get(r.table_name)?.pk.push(r.column_name);
  }
  return out;
}

/** child -> parents, from the target's foreign keys. */
async function readForeignKeys(c: Client): Promise<Map<string, Set<string>>> {
  const r = await c.query(
    `SELECT DISTINCT tc.table_name AS child, ccu.table_name AS parent
       FROM information_schema.table_constraints tc
       JOIN information_schema.constraint_column_usage ccu
         ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
      WHERE tc.table_schema = 'public' AND tc.constraint_type = 'FOREIGN KEY'`
  );
  const deps = new Map<string, Set<string>>();
  for (const row of r.rows) {
    if (row.child === row.parent) continue;
    if (!deps.has(row.child)) deps.set(row.child, new Set());
    deps.get(row.child)!.add(row.parent);
  }
  return deps;
}

/** Parents before children. Throws on a cycle rather than guessing. */
function insertOrder(tables: string[], deps: Map<string, Set<string>>): string[] {
  const order: string[] = [];
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (t: string, trail: string[]) => {
    if (state.get(t) === 'done') return;
    if (state.get(t) === 'visiting') throw new Error(`Foreign-key cycle: ${[...trail, t].join(' -> ')}`);
    state.set(t, 'visiting');
    for (const p of deps.get(t) || []) if (tables.includes(p)) visit(p, [...trail, t]);
    state.set(t, 'done');
    order.push(t);
  };
  for (const t of [...tables].sort()) visit(t, []);
  return order;
}

// ---------- digest ----------

function stableJson(v: any): string {
  if (Array.isArray(v)) return '[' + v.map(stableJson).join(',') + ']';
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + stableJson(v[k])).join(',') + '}';
  }
  return JSON.stringify(v);
}

const TS = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d+))?\s*(?:([+-])(\d{2})(?::?(\d{2}))?(?::?\d{2})?|Z)?$/;

/** Same instant -> same string, whatever the offset spelling or fraction padding. */
function normTimestamp(v: string): string {
  const m = TS.exec(v.trim());
  if (!m) return v;
  const [, d, t, frac = '', sign, oh, om] = m;
  let ms = Date.parse(`${d}T${t}Z`);
  if (sign) ms -= (sign === '-' ? -1 : 1) * (Number(oh) * 60 + Number(om || 0)) * 60000;
  return `${ms}.${frac.padEnd(6, '0').slice(0, 6)}`;
}

function normValue(v: string | null, type: string): string | null {
  if (v === null || v === undefined) return null;
  if (type.includes('json')) {
    try {
      return stableJson(JSON.parse(v));
    } catch {
      return v;
    }
  }
  if (type.startsWith('timestamp')) return normTimestamp(v);
  if (type === 'bigint' || type === 'integer' || type === 'smallint' || /^int\d?$/.test(type)) {
    try {
      return BigInt(v.trim()).toString();
    } catch {
      return v;
    }
  }
  if (type === 'numeric' || type === 'decimal') return v.includes('.') ? v.replace(/\.?0+$/, '') : v;
  if (type.startsWith('double') || type === 'real' || type.startsWith('float')) return String(Number(v));
  if (type === 'boolean' || type === 'bool') return /^(t|true)$/i.test(v) ? 't' : 'f';
  return v;
}

type TableDigest = { count: number; digest: string; rows: Map<string, string> };

async function digestTable(c: Client, t: Table, columns: string[]): Promise<TableDigest> {
  const types = new Map(t.columns.map((col) => [col.name, col.type]));
  const res = await c.query(`SELECT ${columns.map(q).join(', ')} FROM ${q(t.name)}`);
  const rows = new Map<string, string>();
  const hashes: string[] = [];
  res.rows.forEach((row: any, i: number) => {
    const norm = columns.map((col) => normValue(row[col], types.get(col) || ''));
    const h = crypto.createHash('sha256').update(JSON.stringify(norm)).digest('hex');
    hashes.push(h);
    const key = t.pk.length ? JSON.stringify(t.pk.map((k) => row[k])) : `#${i}`;
    rows.set(key, h);
  });
  hashes.sort();
  const digest = crypto.createHash('sha256').update(hashes.join('\n')).digest('hex');
  return { count: res.rows.length, digest, rows };
}

// ---------- commands ----------

const INT_LIMITS: Record<string, bigint> = { integer: 2147483647n, smallint: 32767n };

async function comparedSchemas(src: Client, dst: Client) {
  const s = await readTables(src);
  const d = await readTables(dst);
  const problems: string[] = [];
  for (const [name, t] of s) {
    const tt = d.get(name);
    if (!tt) {
      problems.push(`table ${name}: missing on target (run "schema" first)`);
      continue;
    }
    for (const col of t.columns) {
      if (!tt.columns.some((c) => c.name === col.name)) problems.push(`table ${name}: column ${col.name} missing on target`);
    }
  }
  return { s, d, problems };
}

/** Values that exist on source but would not fit the target column. */
async function rangeProblems(src: Client, s: Map<string, Table>, d: Map<string, Table>): Promise<string[]> {
  const out: string[] = [];
  for (const [name, t] of s) {
    const tt = d.get(name);
    if (!tt) continue;
    for (const col of t.columns) {
      const target = tt.columns.find((c) => c.name === col.name);
      const limit = target && INT_LIMITS[target.type];
      if (!limit || INT_LIMITS[col.type] === limit) continue;
      const r = await src.query(`SELECT MAX(ABS(${q(col.name)}))::TEXT AS m FROM ${q(name)}`);
      const m = r.rows[0].m;
      if (m !== null && BigInt(m) > limit) out.push(`${name}.${col.name}: max ${m} exceeds target ${target!.type}`);
    }
  }
  return out;
}

async function cmdPlan() {
  const src = await connect('source');
  const dst = await connect('target');
  try {
    console.log(`source: ${redact(sideUrl('source'))}${(await isCockroach(src)) ? ' (CockroachDB)' : ''}`);
    console.log(`target: ${redact(sideUrl('target'))}${(await isCockroach(dst)) ? ' (CockroachDB)' : ''}\n`);
    const { s, d, problems } = await comparedSchemas(src, dst);
    problems.push(...(await rangeProblems(src, s, d)));
    console.log('table'.padEnd(36) + 'source rows'.padStart(12) + 'target rows'.padStart(12));
    for (const name of [...s.keys()].sort()) {
      const sc = (await src.query(`SELECT COUNT(*)::TEXT AS n FROM ${q(name)}`)).rows[0].n;
      const tc = d.has(name) ? (await dst.query(`SELECT COUNT(*)::TEXT AS n FROM ${q(name)}`)).rows[0].n : '-';
      console.log(name.padEnd(36) + String(sc).padStart(12) + String(tc).padStart(12));
    }
    const extra = [...d.keys()].filter((n) => !s.has(n));
    if (extra.length) console.log(`\nTarget-only tables (left untouched): ${extra.join(', ')}`);
    if (problems.length) {
      console.log('\nPROBLEMS:\n  ' + problems.join('\n  '));
      process.exitCode = 1;
    } else {
      console.log('\nNo schema problems. Ready to copy.');
    }
  } finally {
    await src.end();
    await dst.end();
  }
}

async function cmdSchema() {
  // The app's migration modules read DATABASE_URL / DATABASE_SSL when their pool
  // is first built, so point them at the target before importing them.
  process.env.DATABASE_URL = sideUrl('target');
  process.env.DATABASE_SSL = sideSsl('target') ? '1' : '0';
  const { runMigrations } = await import('../src/db/migrate');
  const { runPlacementMigrations } = await import('../src/db/placementMigrate');
  const { runSchoolMigrations } = await import('../src/db/schoolMigrate');
  const { runDriveBridgeMigrations } = await import('../src/db/driveBridgeMigrate');
  const results = {
    core: await runMigrations(),
    placement: await runPlacementMigrations(),
    school: await runSchoolMigrations(),
    driveBridge: await runDriveBridgeMigrations(),
  };
  const { getPool } = await import('../src/db/client');
  await getPool().end();
  console.log('\nschema:', results);
  if (Object.values(results).some((ok) => ok === false)) process.exitCode = 1;
}

async function cmdVerify(src?: Client, dst?: Client): Promise<boolean> {
  const own = !src;
  src = src || (await connect('source'));
  dst = dst || (await connect('target'));
  let ok = true;
  try {
    // One snapshot per side, so a table read late cannot disagree with one read early.
    await src.query((await isCockroach(src)) ? 'BEGIN TRANSACTION READ ONLY' : 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await dst.query((await isCockroach(dst)) ? 'BEGIN TRANSACTION READ ONLY' : 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const { s, d, problems } = await comparedSchemas(src, dst);
    if (problems.length) {
      console.log('PROBLEMS:\n  ' + problems.join('\n  '));
      return false;
    }
    for (const name of [...s.keys()].sort()) {
      const columns = s.get(name)!.columns.map((c) => c.name);
      const a = await digestTable(src, s.get(name)!, columns);
      const b = await digestTable(dst, d.get(name)!, columns);
      const same = a.count === b.count && a.digest === b.digest;
      console.log(`${same ? 'OK  ' : 'DIFF'} ${name.padEnd(34)} ${String(a.count).padStart(8)} ${String(b.count).padStart(8)}  ${a.digest.slice(0, 12)}`);
      if (same) continue;
      ok = false;
      const missing = [...a.rows.keys()].filter((k) => !b.rows.has(k)).slice(0, 5);
      const extra = [...b.rows.keys()].filter((k) => !a.rows.has(k)).slice(0, 5);
      const changed = [...a.rows.keys()].filter((k) => b.rows.has(k) && b.rows.get(k) !== a.rows.get(k)).slice(0, 5);
      if (missing.length) console.log(`       missing on target: ${missing.join(' ')}`);
      if (extra.length) console.log(`       only on target:    ${extra.join(' ')}`);
      if (changed.length) console.log(`       values differ:     ${changed.join(' ')}`);
    }
    console.log(ok ? '\nVERIFIED: every table matches row-for-row.' : '\nMISMATCH: do not switch over.');
    return ok;
  } finally {
    await src.query('ROLLBACK').catch(() => undefined);
    await dst.query('ROLLBACK').catch(() => undefined);
    if (own) {
      await src.end();
      await dst.end();
      if (!ok) process.exitCode = 1;
    }
  }
}

async function cmdCopy(args: string[]) {
  if (!args.includes('--yes')) {
    console.log(`copy REPLACES every row of the copied tables on ${redact(sideUrl('target'))}.`);
    console.log('Re-run with --yes once that is what you want.');
    process.exitCode = 1;
    return;
  }
  const src = await connect('source');
  const dst = await connect('target');
  try {
    const { s, d, problems } = await comparedSchemas(src, dst);
    problems.push(...(await rangeProblems(src, s, d)));
    if (problems.length) throw new Error('Refusing to copy:\n  ' + problems.join('\n  '));

    const tables = [...s.keys()];
    let targetRows = 0;
    for (const name of tables) targetRows += Number((await dst.query(`SELECT COUNT(*)::TEXT AS n FROM ${q(name)}`)).rows[0].n);
    if (targetRows > 0 && !args.includes('--overwrite')) {
      throw new Error(`Target already holds ${targetRows} rows in these tables. Re-run with --overwrite to replace them.`);
    }

    const order = insertOrder(tables, await readForeignKeys(dst));
    const started = Date.now();
    await src.query((await isCockroach(src)) ? 'BEGIN TRANSACTION READ ONLY' : 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await dst.query('BEGIN');
    try {
      for (const name of [...order].reverse()) await dst.query(`DELETE FROM ${q(name)}`);
      for (const name of order) {
        const columns = s.get(name)!.columns.map((c) => c.name);
        const { rows } = await src.query(`SELECT ${columns.map(q).join(', ')} FROM ${q(name)}`);
        const batch = Math.max(1, Math.min(500, Math.floor(60000 / columns.length)));
        for (let i = 0; i < rows.length; i += batch) {
          const chunk = rows.slice(i, i + batch);
          const params: any[] = [];
          const tuples = chunk.map((row: any) => '(' + columns.map((col) => {
            params.push(row[col]);
            return `$${params.length}`;
          }).join(', ') + ')');
          await dst.query(`INSERT INTO ${q(name)} (${columns.map(q).join(', ')}) VALUES ${tuples.join(', ')}`, params);
        }
        console.log(`copied ${name.padEnd(34)} ${String(rows.length).padStart(8)}`);
      }
      await dst.query('COMMIT');
    } catch (e) {
      await dst.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      await src.query('ROLLBACK').catch(() => undefined);
    }
    console.log(`\ncommitted in ${((Date.now() - started) / 1000).toFixed(1)}s. Verifying...\n`);
    if (!(await cmdVerify(src, dst))) process.exitCode = 1;
  } finally {
    await src.end();
    await dst.end();
  }
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (cmd === 'plan') return cmdPlan();
  if (cmd === 'schema') return cmdSchema();
  if (cmd === 'copy') return cmdCopy(args);
  if (cmd === 'verify') return void (await cmdVerify());
  console.log('usage: pg-migrate.ts plan | schema | copy --yes [--overwrite] | verify');
  process.exitCode = 1;
}

main().catch((e) => {
  console.error('FAILED:', e?.message || e);
  process.exitCode = 1;
});
