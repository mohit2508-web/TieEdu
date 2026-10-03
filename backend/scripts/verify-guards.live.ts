/**
 * Live check that the admin-only surfaces are actually closed over HTTP.
 *
 *   npx ts-node --transpile-only scripts/verify-guards.live.ts
 *
 * The unit guard in `security-unblock.test.ts` asserts the *source* says the
 * right thing. This asserts the *server* does. They are not the same claim: a
 * route mounted above a `router.use()` line, a guard added to the wrong router,
 * or a guard that never calls `next()` all pass a source-level check and still
 * leave the endpoint open.
 *
 * Two ordering constraints make this safe to run, and both are load-bearing:
 *
 *   1. `server.ts` is `require`d at runtime, never imported at the top. A static
 *      import is hoisted above the statements below, so `data/db.ts:469` — which
 *      resolves `DB_FILE` once at module load — would capture whatever
 *      `process.env.DB_FILE` happened to be at that moment. Relying on TypeScript's
 *      emit order to keep a scratch DB off the real one is not a guarantee, it is a
 *      coincidence. So the environment is built first and the server is loaded
 *      afterwards, explicitly.
 *   2. The admin password is rewritten directly in the scratch file. The copy
 *      already contains an `admin@tieedu.in` row, and `ensureSeedData()` only
 *      seeds when no admin exists — so seeding is skipped and a login with
 *      ADMIN_PASSWORD would fail against the stored hash.
 */
import fs from 'fs';
import path from 'path';
import type { Server } from 'http';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.join(__dirname, '..', 'data');
const REAL_DB = path.join(DATA_DIR, 'db.json');
const SCRATCH = path.join(DATA_DIR, `db.guardlive-${process.pid}.json`);

const ADMIN_EMAIL = (process.env.GUARD_ADMIN_EMAIL || 'admin@tieedu.in').toLowerCase();
const ADMIN_PASSWORD = process.env.GUARD_ADMIN_PASSWORD || 'GuardLive@12345';

// 1. Build the scratch store first, and prove it is not the real one.
fs.copyFileSync(REAL_DB, SCRATCH);
{
  const db = JSON.parse(fs.readFileSync(SCRATCH, 'utf-8'));
  let admin = (db.users || []).find((u: any) => u.role === 'admin');
  if (!admin) {
    admin = { id: `guard-admin-${Date.now()}`, name: 'Guard Admin', email: ADMIN_EMAIL, xp: 0, streak: 0 };
    db.users = db.users || [];
    db.users.push(admin);
  }
  admin.email = ADMIN_EMAIL;
  admin.password_hash = bcrypt.hashSync(ADMIN_PASSWORD, 12);
  admin.disabled = false;
  fs.writeFileSync(SCRATCH, JSON.stringify(db, null, 2));
}

// 2. Only now the environment, and only then the server.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'guard-live-test-jwt-secret';
process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;
process.env.ADMIN_EMAIL = ADMIN_EMAIL;
process.env.PORT = process.env.GUARD_PORT || '5477';
process.env.DB_FILE = SCRATCH;
// Since M2 the server also writes grants to PostgreSQL on boot, so a scratch
// ledger alone no longer keeps this suite out of a live cluster — it left a
// super_admin row behind on every run. The relational paths have their own
// scripts; see smokeCourses.ts for the same note.
process.env.DATABASE_URL = '';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) {
    pass += 1;
    console.log(`  ok   ${name}`);
  } else {
    fail += 1;
    console.error(`  FAIL ${name}${detail ? `\n       ${detail}` : ''}`);
  }
}

const BASE = `http://127.0.0.1:${process.env.PORT}`;

const req = async (
  urlPath: string,
  opts: { method?: string; token?: string; body?: any } = {}
): Promise<{ status: number; body: any }> => {
  const res = await fetch(`${BASE}${urlPath}`, {
    method: opts.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
  });
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
};

async function cleanupAndExit(code: number): Promise<never> {
  try {
    fs.unlinkSync(SCRATCH);
  } catch {
    /* best effort */
  }
  console.log(`\nguard-live: ${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : code);
}

async function main() {
  // Loaded here, not at the top: see the note about hoisting above.
  const { httpServer } = require('../src/server');
  const server: Server = httpServer;
  await new Promise((r) => setTimeout(r, 500));

  console.log('\n[0] the scratch store is actually in use');
  {
    const realDb = JSON.parse(fs.readFileSync(REAL_DB, 'utf-8'));
    const probeEmail = `guard-${Date.now()}@example.test`;
    const signup = await req('/api/auth/signup', {
      method: 'POST',
      body: { name: 'Guard Probe', email: probeEmail, password: 'Probe@12345' },
    });
    check('the probe account signed up', signup.status === 201, `got ${signup.status} ${JSON.stringify(signup.body)}`);
    const realHasProbe = (realDb.users || []).some((u: any) => u.email === probeEmail);
    const scratch = JSON.parse(fs.readFileSync(SCRATCH, 'utf-8'));
    const scratchHasProbe = (scratch.users || []).some((u: any) => u.email === probeEmail);
    check('the write landed in the scratch store', scratchHasProbe);
    check('the real db.json was not touched', !realHasProbe);
  }

  console.log('\n[1] analytics must be closed to anonymous callers');
  const anonSnapshot = await req('/api/analytics');
  check('GET /api/analytics is not public', anonSnapshot.status === 401, `got ${anonSnapshot.status}`);
  check(
    'no revenue figure leaks in the 401 body',
    !JSON.stringify(anonSnapshot.body || {}).includes('revenue'),
    JSON.stringify(anonSnapshot.body)
  );

  const anonRevenue = await req('/api/analytics/revenue');
  check('GET /api/analytics/revenue is not public', anonRevenue.status === 401, `got ${anonRevenue.status}`);
  check(
    'no series leaks in the 401 body',
    !Array.isArray(anonRevenue.body?.series),
    JSON.stringify(anonRevenue.body)
  );

  console.log('\n[2] analytics must be closed to a signed-in non-admin');
  const email = `guard-${Date.now()}@example.test`;
  const signup = await req('/api/auth/signup', {
    method: 'POST',
    body: { name: 'Guard Probe', email, password: 'Probe@12345' },
  });
  const userToken = signup.body?.accessToken;

  if (userToken) {
    const studentView = await req('/api/analytics', { token: userToken });
    check('GET /api/analytics refuses a non-admin', studentView.status === 403, `got ${studentView.status}`);
    const studentRevenue = await req('/api/analytics/revenue', { token: userToken });
    check('GET /api/analytics/revenue refuses a non-admin', studentRevenue.status === 403, `got ${studentRevenue.status}`);
    const sandbox = await req('/api/sandbox/execute', {
      method: 'POST',
      token: userToken,
      body: { code: 'int main(){return 0;}' },
    });
    check('POST /api/sandbox/execute now admits a signed-in user', sandbox.status === 200, `got ${sandbox.status}`);
  }

  console.log('\n[3] sandbox must be closed to anonymous callers');
  const anonSandbox = await req('/api/sandbox/execute', {
    method: 'POST',
    body: { code: 'int main(){return 0;}' },
  });
  check('POST /api/sandbox/execute refuses an anonymous caller', anonSandbox.status === 401, `got ${anonSandbox.status}`);

  console.log('\n[4] an admin must still get through');
  const adminLogin = await req('/api/auth/login', {
    method: 'POST',
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const adminToken = adminLogin.body?.accessToken;
  check('the admin can sign in', Boolean(adminToken), JSON.stringify(adminLogin.body));

  if (adminToken) {
    const adminView = await req('/api/analytics', { token: adminToken });
    check('GET /api/analytics works for an admin', adminView.status === 200, `got ${adminView.status}`);
    check('the admin payload really contains commerce totals', typeof adminView.body?.commerce === 'object');

    const adminRevenue = await req('/api/analytics/revenue', { token: adminToken });
    check('GET /api/analytics/revenue works for an admin', adminRevenue.status === 200, `got ${adminRevenue.status}`);
    check('the revenue payload really contains a series', Array.isArray(adminRevenue.body?.series));
  }

  console.log('\n[5] the deliberate public surface must stay public');
  const thumb = await req('/api/course-admin/thumbnail/not-a-real-file-thumb-1-abcd.png');
  check(
    'an unknown thumbnail 404s rather than 401s — the route is genuinely public',
    thumb.status === 404,
    `got ${thumb.status} (401 would mean the public GET got caught by the guard)`
  );

  await new Promise<void>((resolve) => server.close(() => resolve()));
  await cleanupAndExit(0);
}

main().catch(async (err) => {
  console.error(err);
  await cleanupAndExit(1);
});
