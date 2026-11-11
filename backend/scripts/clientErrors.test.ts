/**
 * Client error log (routes/clientErrors.routes.ts) over HTTP, on a scratch store (DB_FILE).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, note = '') {
  if (cond) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name} ${note}`); }
}

async function main() {
  const file = path.join(os.tmpdir(), `client-errors-${process.pid}.json`);
  process.env.DB_FILE = file;
  delete process.env.DATABASE_URL;
  fs.writeFileSync(file, JSON.stringify({ companies: [], users: [{ id: 'u1', email: 'asha@example.com' }] }));

  const express = (await import('express')).default;
  const { clientErrorsRouter, clientErrorsAdminRouter, allowReport } = await import('../src/routes/clientErrors.routes');
  const app = express();
  app.use(express.json());
  app.use('/e', clientErrorsRouter);
  app.use('/admin', clientErrorsAdminRouter);
  const server = http.createServer(app);
  await new Promise<void>((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const post = (body: unknown, ip = '1.1.1.1') => fetch(`${base}/e`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip }, body: JSON.stringify(body) });

  check('a report is stored (204)', (await post({ ref: 'ERR-ABC234', area: 'ide', route: '/practice/problem/x', message: 'boom', stack: 'at X' })).status === 204);
  check('missing ref or message → 400', (await post({ message: 'no ref' }, '2.2.2.2')).status === 400 && (await post({ ref: 'ERR-1' }, '2.2.2.2')).status === 400);
  const long = 'x'.repeat(5000);
  await post({ ref: 'ERR-<script>', area: 'app', message: long, stack: long }, '3.3.3.3');
  const db = JSON.parse(fs.readFileSync(file, 'utf8'));
  const last = db.client_errors[db.client_errors.length - 1];
  check('fields are trimmed and the ref is sanitised', last.message.length === 300 && last.stack.length === 600 && last.ref === 'ERR-script', JSON.stringify({ m: last.message.length, s: last.stack.length, ref: last.ref }));

  let limited = false;
  for (let i = 0; i < 12; i++) if ((await post({ ref: 'ERR-RATE', message: 'r' }, '9.9.9.9')).status === 429) limited = true;
  check('more than 10 reports a minute from one IP → 429', limited);
  check('the limiter frees up after a minute', allowReport('k', 0) && !Array.from({ length: 10 }, () => allowReport('k', 1)).every(Boolean) && allowReport('k', 61_000));

  const list = await (await fetch(`${base}/admin`)).json();
  const stored = JSON.parse(fs.readFileSync(file, 'utf8')).client_errors.length;
  check('admin list groups by message, newest first', list.total === stored && list.groups[0].message === 'r' && list.groups[0].count === 10 && list.recent[0].message === 'r', JSON.stringify(list.groups.map((g: any) => [g.message.slice(0, 5), g.count])));
  check('admin delete clears the log', (await fetch(`${base}/admin`, { method: 'DELETE' })).status === 200 && (await (await fetch(`${base}/admin`)).json()).total === 0);

  server.close();
  fs.rmSync(file, { force: true });
  console.log(`\nclient errors: ${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
