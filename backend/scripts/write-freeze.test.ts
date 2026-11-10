/**
 * The cutover write freeze: which SQL counts as a write, which routes are
 * PostgreSQL-only, and that the driver guard refuses writes in both the promise
 * and the callback form while letting reads through.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

const FLAG = path.join(os.tmpdir(), `pg-write-freeze-${process.pid}`);
process.env.PG_WRITE_FREEZE_FILE = FLAG;
delete process.env.PG_WRITE_FREEZE;

import { isWriteSql, isPgOnlyWriteRoute, isPgWriteFrozen, writeFreezeMiddleware, PG_WRITE_FROZEN } from '../src/db/writeFreeze';
import { guardClientWrites, sslOption } from '../src/db/client';

let pass = 0;
let fail = 0;
const ok = (name: string, cond: boolean) => {
  if (cond) pass++;
  else {
    fail++;
    console.error('FAIL', name);
  }
};

async function main() {
  // --- SQL classification ---
  ok('insert', isWriteSql('INSERT INTO t VALUES (1)'));
  ok('lowercase update', isWriteSql('  update t set a=1'));
  ok('upsert', isWriteSql('UPSERT INTO t VALUES (1)'));
  ok('ddl', isWriteSql('CREATE TABLE IF NOT EXISTS x (id TEXT)'));
  ok('leading comment', isWriteSql('-- note\n/* x */ DELETE FROM t'));
  ok('writing cte', isWriteSql('WITH x AS (DELETE FROM t RETURNING id) SELECT * FROM x'));
  ok('select is read', !isWriteSql('SELECT * FROM t'));
  ok('reading cte', !isWriteSql('WITH x AS (SELECT 1) SELECT * FROM x'));
  ok('begin is not a write', !isWriteSql('BEGIN'));
  ok('non-string', !isWriteSql(undefined));

  // --- routes ---
  ok('placement post', isPgOnlyWriteRoute('POST', '/api/placement/students'));
  ok('admin drives put', isPgOnlyWriteRoute('PUT', '/api/admin/drives/x'));
  ok('profile put', isPgOnlyWriteRoute('PUT', '/api/me'));
  ok('resume upload', isPgOnlyWriteRoute('POST', '/api/me/resumes/upload'));
  ok('me settings', isPgOnlyWriteRoute('PUT', '/api/me/settings'));
  ok('db.json me route stays open', !isPgOnlyWriteRoute('PUT', '/api/me/passport'));
  ok('login stays open', !isPgOnlyWriteRoute('POST', '/api/auth/login'));
  ok('GET stays open', !isPgOnlyWriteRoute('GET', '/api/placement/students'));
  ok('prefix boundary', !isPgOnlyWriteRoute('POST', '/api/placementx'));

  // --- flag file ---
  fs.rmSync(FLAG, { force: true });
  ok('off without flag', !isPgWriteFrozen());
  fs.writeFileSync(FLAG, '');
  ok('on with flag', isPgWriteFrozen());

  // --- middleware ---
  let status = 0;
  let body: any = null;
  let nexted = false;
  const res: any = { setHeader() {}, status(s: number) { status = s; return res; }, json(b: any) { body = b; return res; } };
  writeFreezeMiddleware({ method: 'POST', path: '/api/drives/d1/register' }, res, () => { nexted = true; });
  ok('frozen route answers 503', status === 503 && body?.code === PG_WRITE_FROZEN && !nexted);
  nexted = false;
  writeFreezeMiddleware({ method: 'POST', path: '/api/auth/login' }, res, () => { nexted = true; });
  ok('login passes while frozen', nexted);

  // --- driver guard ---
  const seen: string[] = [];
  const client: any = {
    query(config: any, values?: any, cb?: any) {
      seen.push(typeof config === 'string' ? config : config.text);
      const done = typeof values === 'function' ? values : cb;
      if (done) return void process.nextTick(() => done(null, { rows: [] }));
      return Promise.resolve({ rows: [] });
    },
  };
  guardClientWrites(client);
  guardClientWrites(client); // idempotent

  let rejected: any = null;
  await client.query('INSERT INTO t VALUES (1)').catch((e: any) => { rejected = e; });
  ok('promise write refused', rejected?.code === PG_WRITE_FROZEN);
  const cbErr: any = await new Promise((r) => client.query({ text: 'UPDATE t SET a=1' }, [], (e: any) => r(e)));
  ok('callback write refused', cbErr?.code === PG_WRITE_FROZEN);
  await client.query('SELECT 1');
  ok('read passes while frozen', seen.length === 1 && seen[0] === 'SELECT 1');

  fs.rmSync(FLAG, { force: true });
  await client.query('INSERT INTO t VALUES (2)');
  ok('write passes after unfreeze', seen[1] === 'INSERT INTO t VALUES (2)');

  // --- ssl option ---
  ok('ssl default on', sslOption(undefined) !== false);
  ok('ssl 0 off', sslOption('0') === false);
  ok('ssl disable off', sslOption('disable') === false);
  ok('ssl 1 on', sslOption('1') !== false);

  console.log(`write-freeze: ${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
