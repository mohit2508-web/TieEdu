/**
 * Certificate HTTP tests: what an anonymous caller is allowed to learn.
 *
 *   npx ts-node --transpile-only scripts/certificate-http.test.ts
 *
 * The public verification endpoints are unauthenticated by design, which makes
 * them the one place where an error message can describe our own environment to
 * a stranger. A misconfigured signing key produces a message naming the missing
 * variable — the right thing to tell the operator, the wrong thing to hand to
 * anyone on the internet.
 *
 * So: authenticated claim/admin routes keep the diagnostic, anonymous routes get
 * a flat 503. The regression guard is here, because the failure mode is a
 * refactor that moves the try/catch.
 */
process.env.NODE_ENV = 'production';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'certificate-http-test-jwt-secret';
// An empty string rather than a delete: dotenv only fills variables that are
// absent, so this survives the .env sitting in this directory.
process.env.CERT_SIGNING_PRIVATE_KEY = '';
process.env.PORT = process.env.CERT_HTTP_PORT || '5399';

import fs from 'fs';
import os from 'os';
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

/** A real certificate row signed by a throwaway key, so the record-exists path is reachable. */
function seedCertificate(dbFile: string, serial: string) {
  const crypto = require('crypto');
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
  const fields = {
    serial,
    user_id: 'u-cert-http',
    recipient_email: 'learner@example.com',
    recipient_name: 'Learner',
    course_id: 'c-cert-http',
    course_title: 'Certificate HTTP',
    issued_at: '2026-01-01T00:00:00.000Z',
    lessons_completed: 1,
    lessons_required: 1,
    xp_at_issue: 10,
  };
  const payload = ['v3', fields.serial, fields.user_id, fields.recipient_email, fields.recipient_name, fields.course_id, fields.course_title, fields.issued_at, '1', '1', '10'].join('|');
  const db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  db.certificates = [
    ...(db.certificates || []),
    {
      id: 'cert-http',
      ...fields,
      signature: crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64'),
      signing_key_id: crypto
        .createHash('sha256')
        .update(publicKey.export({ type: 'spki', format: 'der' }))
        .digest('hex')
        .slice(0, 16),
      status: 'active',
      revoked_reason: '',
      revoked_at: null,
    },
  ];
  fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
}

async function main() {
  // A scratch copy, so nothing here can touch the real store.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tieedu-cert-http-'));
  const dbFile = path.join(dir, 'db.json');
  fs.copyFileSync(path.join(__dirname, '../data/db.json'), dbFile);
  seedCertificate(dbFile, 'TIEEDU-2026-HTTPTEST1');
  process.env.DB_FILE = dbFile;

  await import('../src/server');
  await new Promise((r) => setTimeout(r, 1000));
  const base = `http://127.0.0.1:${process.env.PORT}`;

  const keyEndpoint = await fetch(`${base}/api/courses/verify/key`);
  const keyBody = await keyEndpoint.text();

  const existing = await fetch(`${base}/api/courses/verify/TIEEDU-2026-HTTPTEST1`);
  const existingBody = await existing.text();

  const unknown = await fetch(`${base}/api/courses/verify/TIEEDU-2026-NOSUCH99`);
  const unknownBody = await unknown.text();

  check('the public key endpoint is 503 while no key is configured', () => {
    if (keyEndpoint.status !== 503) throw new Error(`got ${keyEndpoint.status}: ${keyBody.slice(0, 120)}`);
  });

  check('the public key endpoint names no environment variable', () => {
    if (/CERT_SIGNING|PRIVATE_KEY|base64/i.test(keyBody)) throw new Error(keyBody);
  });

  check('verifying a real serial without a key is 503, not 200', () => {
    if (existing.status !== 503) throw new Error(`got ${existing.status}: ${existingBody.slice(0, 120)}`);
  });

  check('that 503 names no environment variable and no key material', () => {
    if (/CERT_SIGNING|PRIVATE_KEY|PUBLIC_KEY|base64|MC4|MCow/i.test(existingBody)) throw new Error(existingBody);
  });

  check('that 503 is not dressed up as a valid certificate', () => {
    if (/"(genuine|valid)":\s*true/.test(existingBody)) throw new Error(existingBody);
  });

  check('an unknown serial stays a clean 404 whatever the key state', () => {
    // Must not become a 503: "we do not know that serial" is the answer
    // regardless of configuration, and turning it into a 503 would tell a
    // prober the deployment is misconfigured.
    if (unknown.status !== 404) throw new Error(`got ${unknown.status}: ${unknownBody.slice(0, 120)}`);
    if (!/"status":\s*"not_found"/.test(unknownBody)) throw new Error(unknownBody);
  });

  check('an unknown serial never claims a valid signature', () => {
    if (!/"signature_valid":\s*false/.test(unknownBody)) throw new Error(unknownBody);
  });

  console.log(`\ncertificate-http: ${pass} passed, ${fail} failed`);
  fs.rmSync(dir, { recursive: true, force: true });
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
