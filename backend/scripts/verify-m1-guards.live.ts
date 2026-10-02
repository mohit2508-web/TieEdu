/**
 * Live HTTP check for M1: RBAC enforcement + the install registry.
 *
 *   npx tsx --test scripts/verify-m1-guards.live.ts
 *
 * Deliberately not part of `npm test` — it boots the real app and needs a scratch
 * ledger, so it is a deliberate invocation rather than something every run trips
 * over. `security-unblock.test.ts` covers the source-level claim; this covers the
 * server actually doing it, because a guard on the wrong router still passes a
 * source-level check.
 *
 * Same two ordering constraints as verify-guards.live.ts, and both matter:
 *   1. `server.ts` is required at runtime, never statically imported, so that
 *      `data/db.ts`'s one-time `DB_FILE` resolution captures the scratch path.
 *   2. Passwords are written into the scratch file directly, because
 *      `ensureSeedData` only seeds when no admin exists and the copy already has
 *      one.
 */
import fs from 'fs';
import path from 'path';
import type { Server } from 'http';
import bcrypt from 'bcryptjs';
import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';

const DATA_DIR = path.join(__dirname, '..', 'data');
const REAL_DB = path.join(DATA_DIR, 'db.json');
const SCRATCH = path.join(DATA_DIR, `db.m1live-${process.pid}.json`);

const BOOTSTRAP_EMAIL = 'bootstrap-admin@test.invalid';
const SUPPORT_EMAIL = 'support-staff@test.invalid';
const STUDENT_EMAIL = 'student-probe@test.invalid';
const PASSWORD = 'M1Guard@12345';

const SUPPORT_PASSWORD = PASSWORD;

let BASE = ''; // set once the server is listening

// ---------------------------------------------------------------------------
// Scratch ledger
// ---------------------------------------------------------------------------

const realStat = fs.statSync(REAL_DB);
// Raw text, not a re-serialised copy: `JSON.stringify(JSON.parse(x))` drops the
// indentation, so comparing it to the file's actual bytes can never match and
// reports "MODIFIED" no matter what. Capture the bytes as they are.
const realText = fs.readFileSync(REAL_DB, 'utf-8');

fs.copyFileSync(REAL_DB, SCRATCH);
{
  const db = JSON.parse(fs.readFileSync(SCRATCH, 'utf-8'));

  const mkUser = (id: string, email: string, role: 'admin' | 'user') => ({
    id,
    name: email,
    email,
    password_hash: bcrypt.hashSync(PASSWORD, 4),
    role,
    xp: 0,
    streak: 0,
    created_at: new Date().toISOString(),
  });

  db.users = (db.users || []).filter(
    (u: any) => ![BOOTSTRAP_EMAIL, SUPPORT_EMAIL, STUDENT_EMAIL].includes(u.email)
  );
  db.users.push(mkUser('u-bootstrap', BOOTSTRAP_EMAIL, 'admin'));
  db.users.push(mkUser('u-support', SUPPORT_EMAIL, 'admin'));
  db.users.push(mkUser('u-student', STUDENT_EMAIL, 'user'));

  // The bootstrap admin must arrive with a staff row, mirroring ensureSeedData.
  db.staff = (db.staff || []).filter((s: any) => !['u-bootstrap', 'u-support'].includes(s.user_id));
  db.staff.push({
    id: 'staff-bootstrap',
    user_id: 'u-bootstrap',
    role: 'super_admin',
    permissions: [],
    status: 'active',
    created_by: null,
    created_at: new Date().toISOString(),
  });
  db.staff.push({
    id: 'staff-support',
    user_id: 'u-support',
    role: 'support',
    permissions: [],
    status: 'active',
    created_by: null,
    created_at: new Date().toISOString(),
  });

  db.devices = [];
  db.push_subscriptions = [];
  db.notification_preferences = [];
  db.releases = [];

  fs.writeFileSync(SCRATCH, JSON.stringify(db, null, 2));
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

let server: Server | undefined;
const cleanup: Array<() => void> = [];

async function call(
  method: string,
  p: string,
  body?: unknown,
  token?: string
): Promise<{ status: number; json: any }> {
  const res = await fetch(`${BASE}${p}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

async function login(email: string): Promise<string> {
  const r = await call('POST', '/api/auth/login', { email, password: PASSWORD });
  assert.equal(r.status, 200, `login failed for ${email}: ${JSON.stringify(r.json)}`);
  const token = r.json?.accessToken || r.json?.token || r.json?.access_token;
  assert.ok(token, `no token in login response: ${JSON.stringify(r.json)}`);
  return token;
}

before(async () => {
  process.env.NODE_ENV = 'test';
  process.env.DB_FILE = SCRATCH;
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'm1-guard-secret';
  process.env.ADMIN_EMAIL = BOOTSTRAP_EMAIL;
  process.env.ADMIN_PASSWORD = PASSWORD;
  process.env.IP_HASH_SALT = 'm1-guard-salt';

// server.ts listens on PORT itself and exports the handle; it does not export a
  // bare express app. Match verify-guards.live.ts rather than guessing.
  process.env.PORT = '5491';
  const { httpServer } = require('../src/server');
  server = httpServer;
  BASE = `http://127.0.0.1:${process.env.PORT}`;

  // Wait for the listener rather than a fixed sleep: a fixed delay passes on a
  // fast machine and fails on a loaded one, which is how these scripts become
  // "flaky, just re-run it".
  await new Promise<void>((resolve, reject) => {
    const deadline = Date.now() + 15_000;
    const poll = () => {
      if (server!.listening) return resolve();
      if (Date.now() > deadline) return reject(new Error('server never started listening'));
      setTimeout(poll, 50);
    };
    poll();
  });

  cleanup.push(
    () =>
      new Promise<void>((resolve) => {
        server!.close(() => resolve());
      })
  );
});

after(() => {
  for (const fn of cleanup.reverse()) fn();
  try {
    fs.unlinkSync(SCRATCH);
  } catch {
    /* already gone */
  }
});

after(() => {
  // The whole point of the scratch ledger: prove the real one is untouched.
  const after = fs.readFileSync(REAL_DB, 'utf-8');
  assert.equal(after, realText, 'REAL db.json WAS MODIFIED');
  assert.equal(fs.statSync(REAL_DB).size, realStat.size, 'REAL db.json size changed');
});

// ---------------------------------------------------------------------------
// RBAC over HTTP
// ---------------------------------------------------------------------------

test('super_admin may read settings; a support grant may not', async () => {
  const boot = await login(BOOTSTRAP_EMAIL);
  const support = await login(SUPPORT_EMAIL);

  const bootRes = await call('GET', '/api/admin/settings', undefined, boot);
  assert.equal(bootRes.status, 200, `super_admin should read settings: ${JSON.stringify(bootRes.json)}`);

  const supRes = await call('GET', '/api/admin/settings', undefined, support);
  assert.equal(supRes.status, 403, `support must not read settings (got ${supRes.status})`);
  assert.equal(supRes.json?.required_permission, 'settings.read');
});

test('the 403 body names the exact permission to request', async () => {
  // An admin hitting a locked surface needs to know which grant to ask for.
  // PUT, not POST — settings is a PUT route, and a POST to it is a 404 that
  // proves nothing about the permission.
  const support = await login(SUPPORT_EMAIL);
  const r = await call('PUT', '/api/admin/settings', { upi_id: 'x@y.z' }, support);
  assert.equal(r.status, 403, `expected 403, got ${r.status}: ${JSON.stringify(r.json)}`);
  assert.equal(r.json?.required_permission, 'settings.write');
});

test('support may read users but not delete companies', async () => {
  const support = await login(SUPPORT_EMAIL);
  const boot = await login(BOOTSTRAP_EMAIL);

  assert.equal((await call('GET', '/api/admin/users', undefined, support)).status, 200);

  // Use a real company so the delete actually has something to act on; the
  // support role must be refused before the handler ever looks at the row.
  const db = JSON.parse(fs.readFileSync(SCRATCH, 'utf-8'));
  const victim = (db.companies || [])[0];
  assert.ok(victim, 'scratch ledger should contain at least one company');

  const denied = await call('DELETE', `/api/admin/companies/${victim.id}`, undefined, support);
  assert.equal(denied.status, 403, `support must not delete companies (got ${denied.status})`);
  assert.equal(denied.json?.required_permission, 'companies.delete');

  const after = JSON.parse(fs.readFileSync(SCRATCH, 'utf-8'));
  assert.ok(
    (after.companies || []).some((c: any) => c.id === victim.id),
    'the company must still exist after the refused delete'
  );

  // super_admin passes the same guard and reaches the handler.
  const allowed = await call('DELETE', `/api/admin/companies/${victim.id}`, undefined, boot);
  assert.equal(allowed.status, 200, `super_admin should pass the guard (got ${allowed.status})`);
});

test('a non-admin is rejected before any permission is considered', async () => {
  const student = await login(STUDENT_EMAIL);
  const r = await call('GET', '/api/admin/users', undefined, student);
  assert.equal(r.status, 403);
  assert.equal(r.json?.required_permission, undefined, 'should fail the coarse gate, not name a permission');
});

test('an anonymous caller cannot reach an admin surface', async () => {
  assert.equal((await call('GET', '/api/admin/users')).status, 401);
  assert.equal((await call('GET', '/api/admin/devices')).status, 401);
});

test('devices.read does not grant devices.block over HTTP', async () => {
  const support = await login(SUPPORT_EMAIL);
  const list = await call('GET', '/api/admin/devices', undefined, support);
  assert.equal(list.status, 200, `support holds devices.read: ${JSON.stringify(list.json)}`);

  const block = await call('POST', '/api/admin/devices/some-install/block', { blocked: true }, support);
  assert.equal(block.status, 403, `support must not block installs (got ${block.status})`);
  assert.equal(block.json?.required_permission, 'devices.block');
});

// ---------------------------------------------------------------------------
// Install registry over HTTP
// ---------------------------------------------------------------------------

test('an anonymous beacon registers an install as a browser tab, not an install', async () => {
  const r = await call('POST', '/api/devices/track', {
    install_id: 'anon_install_0001',
    app_version: '1.0.0',
  });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.id, 'anon_install_0001');

  const boot = await login(BOOTSTRAP_EMAIL);
  const list = await call('GET', '/api/admin/devices', undefined, boot);
  assert.equal(list.json.installs, 0, 'a browser tab must not be counted as an install');
});

test('transitioning to pwa makes the row count as an install', async () => {
  await call('POST', '/api/devices/track', { install_id: 'anon_install_0001', install_surface: 'pwa' });
  const boot = await login(BOOTSTRAP_EMAIL);
  const list = await call('GET', '/api/admin/devices', undefined, boot);
  assert.equal(list.json.installs, 1);
});

test('a malformed install_id is rejected rather than coerced', async () => {
  // Coercing would let one broken client mint a fresh install on every request
  // and inflate the count for free.
  for (const bad of ['', 'short', 'has spaces here', 'x'.repeat(200), '../../etc']) {
    const r = await call('POST', '/api/devices/track', { install_id: bad });
    assert.equal(r.status, 400, `expected 400 for ${JSON.stringify(bad)}, got ${r.status}`);
  }
  const boot = await login(BOOTSTRAP_EMAIL);
  const list = await call('GET', '/api/admin/devices', undefined, boot);
  assert.equal(list.json.installs, 1, 'rejected ids must not create rows');
});

test('claiming attaches an anonymous install to the signed-in user', async () => {
  const student = await login(STUDENT_EMAIL);
  const r = await call('POST', '/api/devices/claim', { install_ids: ['anon_install_0001'] }, student);
  assert.equal(r.status, 200);
  assert.equal(r.json.claimed, 1);

  const mine = await call('GET', '/api/devices/me', undefined, student);
  assert.equal(mine.status, 200);
  assert.equal(mine.json.devices.length, 1);
  assert.equal(mine.json.devices[0].id, 'anon_install_0001');
});

test('claiming is idempotent and never steals another account\'s install', async () => {
  const student = await login(STUDENT_EMAIL);
  const again = await call('POST', '/api/devices/claim', { install_ids: ['anon_install_0001'] }, student);
  assert.equal(again.json.claimed, 0, 're-claiming own install should be a no-op');

  // A different user must not be able to take it over on a shared browser.
  await call('POST', '/api/devices/track', { install_id: 'anon_install_0002' });
  const other = await login(SUPPORT_EMAIL);
  const steal = await call('POST', '/api/devices/claim', { install_ids: ['anon_install_0001'] }, other);
  assert.equal(steal.status, 200);
  assert.equal(steal.json.claimed, 0, 'must not re-point an install owned by another user');
});

test('/devices/me is scoped to the caller', async () => {
  const student = await login(STUDENT_EMAIL);
  const mine = await call('GET', '/api/devices/me', undefined, student);
  assert.ok(mine.json.devices.every((d: any) => d.id === 'anon_install_0001'));
});

test('the beacon does not echo a client-supplied install id it rejected', async () => {
  const r = await call('POST', '/api/devices/track', { install_id: '!!bad!!' });
  assert.equal(r.status, 400);
  assert.equal(r.json.id, null, 'server must not confirm a rejected id');
});

test('update_required follows the live release min_supported_version', async () => {
  const db = JSON.parse(fs.readFileSync(SCRATCH, 'utf-8'));
  db.releases = [
    {
      id: 'rel-1',
      version: '2.0.0',
      sw_cache_version: 2,
      notes: 'test release',
      min_supported_version: '2.0.0',
      status: 'live',
      created_by: null,
      created_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
    },
  ];
  fs.writeFileSync(SCRATCH, JSON.stringify(db, null, 2));

  const behind = await call('POST', '/api/devices/bootstrap', { app_version: '1.9.0' });
  assert.equal(behind.status, 200);
  assert.equal(behind.json.update_required, true);

  const current = await call('POST', '/api/devices/bootstrap', { app_version: '2.0.0' });
  assert.equal(current.json.update_required, false);

  // 1.10 > 1.9 numerically; a lexical compare would wrongly force an update.
  const ahead = await call('POST', '/api/devices/bootstrap', { app_version: '2.1.0' });
  assert.equal(ahead.json.update_required, false);
});

test('a repeated beacon inside the throttle window reports no write', async () => {
  // Proves the ledger is not rewritten per page view.
  const first = await call('POST', '/api/devices/track', {
    install_id: 'throttle_probe_001',
    install_surface: 'pwa',
  });
  assert.equal(first.status, 200);

  const sizeBefore = fs.statSync(SCRATCH).size;
  const second = await call('POST', '/api/devices/track', {
    install_id: 'throttle_probe_001',
    install_surface: 'pwa',
  });
  assert.equal(second.status, 200);
  assert.equal(fs.statSync(SCRATCH).size, sizeBefore, 'a no-op beacon must not rewrite the ledger');
});