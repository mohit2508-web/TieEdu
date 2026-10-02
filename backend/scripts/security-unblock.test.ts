/**
 * Admin-surface access-control tests.
 *
 *   npx ts-node --transpile-only scripts/security-unblock.test.ts
 *
 * The regressions this file exists for, all of which were real and verified
 * against the running app before the fix:
 *
 *   1. `/api/analytics` and `/api/analytics/revenue` were mounted bare, so
 *      platform-wide revenue, paid-order counts and coupon redemption totals
 *      were readable by anyone who asked. They now mount `requireAdmin`.
 *   2. `POST /api/sandbox/execute` was unauthenticated.
 *   3. `backend/src/db/client.ts` carried a committed PostgreSQL connection
 *      string as a fallback, so a deployment that forgot `DATABASE_URL` silently
 *      connected to a live cluster that anyone could read in the repository.
 *   4. `ensureSeedData` seeded the admin with a hardcoded default password and
 *      only warned about it under `NODE_ENV=production` — so a `npm start`
 *      deployment with NODE_ENV unset got a publicly known admin password and no
 *      warning. That password is deliberately *not* written out in this file:
 *      a regression test that pins the old literal in order to assert it is gone
 *      stores that credential again, in a new file, with a comment explaining
 *      what it was. The guard below matches the shape of the defect instead.
 *
 * Each guard is here because the failure mode is a refactor: moving a route above
 * a `router.use(requireAdmin)` line, or reintroducing a "just for dev" fallback,
 * produces no error and no type complaint. It only produces an outage.
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';

let pass = 0;
let fail = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    pass += 1;
  } catch (err: any) {
    fail += 1;
    console.error(`FAIL  ${name}\n      ${err?.message}`);
  }
}

const SRC = path.join(__dirname, '..', 'src');
const read = (...p: string[]) => fs.readFileSync(path.join(SRC, ...p), 'utf8');

const OLD_ADMIN_WARNING = 'default admin password in use';

check('the committed database credential is gone', () => {
  const client = read('db', 'client.ts');
  assert.ok(
    !/postgres(?:ql)?:\/\/[^'"\s]+:[^'"\s]+@/.test(client),
    'db/client.ts still contains an inline postgres://user:password@host string'
  );
  // The cluster hostname leaked into logs too, and is an unguessable identifier
  // for a live database even without the password.
  assert.ok(!client.includes('cockroachlabs.cloud'), 'db/client.ts still names a live cluster host');
  assert.ok(
    !/process\.env\.DATABASE_URL\s*\|\|\s*['"]/.test(client),
    'DATABASE_URL still has a string fallback; it must fail closed instead'
  );
});

check('a missing DATABASE_URL does not break boot', () => {
  // Behavioural, not a regex: the replica is opt-in, and `store/index.ts`
  // imports db/client.ts statically. If the module threw while loading, every
  // replica-less deployment would fail to start — the exact "fail closed" fix
  // turning into a self-inflicted outage. The pool must be built lazily instead.
  const CLIENT_PATH = require.resolve('../src/db/client');
  const prevUrl = process.env.DATABASE_URL;
  const prevDotenvPath = process.env.DOTENV_CONFIG_PATH;
  delete require.cache[CLIENT_PATH];
  // dotenv only fills variables that are absent, so an empty string keeps the
  // real .env from leaking back in through the side door.
  process.env.DATABASE_URL = '';
  try {
    const mod: typeof import('../src/db/client') = require(CLIENT_PATH);
    assert.strictEqual(mod.isConfigured(), false, 'an empty DATABASE_URL must not count as configured');
    assert.strictEqual(typeof mod.isDbReachable, 'function', 'the probe must survive module load');
    // Touching the pool with no URL must raise the *named* error rather than
    // handing back a client that connects nowhere.
    assert.throws(() => mod.getPool(), /DATABASE_URL is not set/);
  } finally {
    if (prevUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = prevUrl;
    if (prevDotenvPath === undefined) delete process.env.DOTENV_CONFIG_PATH;
    else process.env.DOTENV_CONFIG_PATH = prevDotenvPath;
    delete require.cache[CLIENT_PATH];
  }
});

check('no source file logs a credential or a cluster hostname', () => {
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.ts$/.test(entry.name)) {
        const body = fs.readFileSync(full, 'utf8');
        if (/postgres(?:ql)?:\/\/[^'"\s]+:[^'"\s]+@/.test(body)) offenders.push(full);
        if (/cockroachlabs\.cloud/.test(body)) offenders.push(full);
      }
    }
  };
  walk(SRC);
  assert.deepStrictEqual(offenders, [], `credential/hostname found in: ${offenders.join(', ')}`);
});

check('the analytics router is admin-guarded router-wide', () => {
  const analytics = read('routes', 'analytics.routes.ts');
  assert.ok(
    /analyticsRouter\.use\(requireAdmin\)/.test(analytics),
    'analyticsRouter must mount requireAdmin, so a route added later is guarded by default'
  );
  assert.ok(/requireAdmin/.test(analytics), 'analytics.routes.ts must import requireAdmin');
});

check('the admin password has no predictable fallback', () => {
  const server = read('server.ts');
  assert.ok(!server.includes(OLD_ADMIN_WARNING), 'the warn-and-continue admin password path is back');
  assert.ok(
    // `|| ''` is the safe shape — an empty string resolves to "not configured"
    // and makes the boot assertion fire. Only a NON-EMPTY literal is a
    // predictable password, so that is what this forbids.
    !/process\.env\.ADMIN_PASSWORD\s*\|\|\s*['"][^'"]+['"]/.test(server),
    'ADMIN_PASSWORD must not have a non-empty string fallback'
  );
  // Catches the credential coming back by any other route, not just the one this
  // file happened to see. Scans source for a password-shaped literal near an
  // ADMIN_PASSWORD reference, so it does not need to name the old value itself.
  const adminLiteral = /(?:ADMIN_PASSWORD|password)\s*[:=]\s*['"][^'"\s]{8,}['"]/g;
  for (const file of ['server.ts', 'middleware/auth.ts']) {
    const body = read(...file.split('/'));
    // `password_hash` and the seeded `password` field name are not credentials.
    const hits = (body.match(adminLiteral) || []).filter((h) => !/password_hash/.test(h));
    assert.deepStrictEqual(
      hits,
      [],
      `${file} contains a hardcoded password literal: ${hits.join(', ')}`
    );
  }
  // Fail closed at boot, not at the first login attempt.
  assert.ok(/assertAdminSeedConfigured\(\)/.test(server), 'boot must assert the admin seed is configured');
  assert.ok(
    /NODE_ENV\s*===\s*['"]production['"][\s\S]{0,200}return\s+['"]{2}/.test(server),
    'production must resolve to an empty password so the assertion fires'
  );
});

check('the sandbox route requires a session', () => {
  const server = read('server.ts');
  assert.ok(
    /app\.use\(['"]\/api\/sandbox['"],\s*requireAuth/.test(server),
    'POST /api/sandbox/execute must mount behind requireAuth'
  );
  assert.ok(
    /requireAuth/.test(server.split('\n').find((l: string) => l.includes("from './middleware/auth'")) || ''),
    'server.ts must import requireAuth'
  );
});

check('the analytics client sends a bearer token', () => {
  // These two used bare `fetch()`, which is how the endpoints stayed reachable by
  // anonymous callers: the admin console itself was not authenticating.
  const api = fs.readFileSync(path.join(__dirname, '..', '..', 'frontend', 'src', 'lib', 'api.ts'), 'utf8');
  for (const fn of ['fetchAnalyticsApi', 'fetchRevenueSeriesApi']) {
    const body = api.split(`export const ${fn}`)[1] || '';
    const until = body.split('};')[0];
    assert.ok(/apiFetch\(/.test(until), `${fn} must use apiFetch, not bare fetch`);
    assert.ok(!/\bfetch\(/.test(until), `${fn} must not call bare fetch`);
  }
});

console.log(`\nsecurity-unblock: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
