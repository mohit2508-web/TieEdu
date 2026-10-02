/**
 * Proves the rotated admin password actually works over HTTP, and that the old
 * one does not.
 *
 *   npx ts-node --transpile-only scripts/verify-rotation.live.ts
 *
 * A rotation script that writes a hash is only half a rotation. The half that
 * matters is whether `/admin/login` accepts it, and whether the previous password
 * has genuinely stopped working — the second is the entire point, and it is the
 * half nobody checks.
 *
 * Runs against a scratch copy. Requires DB_FILE to be set by the caller, and
 * refuses to run against the live store.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'verify-rotation-jwt-secret';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'placeholder-not-used';
process.env.PORT = process.env.ROTATION_PORT || '5478';
process.env.NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tieedu.test';
process.env.DB_FILE = process.env.DB_FILE || '';

import fs from 'fs';
import path from 'path';
import type { Server } from 'http';

const DATA_DIR = path.join(__dirname, '..', 'data');
const SCRATCH = path.join(DATA_DIR, `db.rotation-${process.pid}.json`);

const DB_FILE = process.env.DB_FILE;
if (!DB_FILE) {
  console.error('Refusing to run without DB_FILE.');
  process.exit(1);
}
if (!fs.existsSync(DB_FILE)) {
  console.error(`DB_FILE does not exist: ${DB_FILE}`);
  process.exit(1);
}

const OLD_PASSWORD = process.env.ROTATION_OLD_PASSWORD || '';
const NEW_PASSWORD = process.env.ROTATION_NEW_PASSWORD || '';
const ADMIN_EMAIL = (process.env.ROTATION_ADMIN_EMAIL || 'admin@tieedu.in').toLowerCase();

if (!OLD_PASSWORD || !NEW_PASSWORD) {
  console.error('Set ROTATION_OLD_PASSWORD and ROTATION_NEW_PASSWORD to compare the two.');
  process.exit(1);
}

fs.copyFileSync(DB_FILE, SCRATCH);
process.env.DB_FILE = SCRATCH;

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

async function main() {
  // Required after the environment, because a static import would hoist above it.
  const { httpServer } = require('../src/server');
  const server: Server = httpServer;
  await new Promise((r) => setTimeout(r, 500));

  const login = async (password: string) => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password }),
    });
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { status: res.status, token: body?.accessToken as string | undefined, body };
  };

  console.log('\n[1] the old password must be dead');
  const oldTry = await login(OLD_PASSWORD);
  check(
    `the previous password is rejected`,
    oldTry.status === 401,
    `got ${oldTry.status} — if this is 200 the rotation did not take effect`
  );

  console.log('\n[2] the new password must work');
  const newTry = await login(NEW_PASSWORD);
  check(`the rotated password signs in`, newTry.status === 200 && Boolean(newTry.token), `got ${newTry.status}`);

  console.log('\n[3] the new token must carry admin authority');
  if (newTry.token) {
    const analytics = await fetch(`${BASE}/api/analytics`, {
      headers: { Authorization: `Bearer ${newTry.token}` },
    });
    check('the rotated admin can reach an admin-only route', analytics.status === 200, `got ${analytics.status}`);
  }

  console.log('\n[4] the rotated store must still be readable');
  const scratch = JSON.parse(fs.readFileSync(SCRATCH, 'utf-8'));
  check('the store parses after rotation', typeof scratch === 'object' && Array.isArray(scratch.users));
  check('the user count is unchanged', scratch.users.length === JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')).users.length);
  const target = scratch.users.find((u: any) => u.email === ADMIN_EMAIL);
  check('the admin row is still marked admin', target?.role === 'admin');
  check('the admin row is still enabled', target?.disabled !== true);
  check('the hash is a bcrypt hash', /^\$2[aby]\$\d{2}\$/.test(target?.password_hash || ''));

  await new Promise<void>((resolve) => server.close(() => resolve()));
  try {
    fs.unlinkSync(SCRATCH);
  } catch {
    /* best effort */
  }
  console.log(`\nrotation-live: ${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  try {
    fs.unlinkSync(SCRATCH);
  } catch {
    /* best effort */
  }
  process.exit(1);
});
