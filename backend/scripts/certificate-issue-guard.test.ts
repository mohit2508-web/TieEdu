/**
 * Certificate issue-guard tests.
 *
 *   npx ts-node --transpile-only scripts/certificate-issue-guard.test.ts
 *
 * The regression this file exists for: `assertSigningConfigured` throws with
 * `{ status: 503, expose: true }`, so a throw that reaches the error handler is
 * returned to the caller *with the operator remedy in it* - the variable name,
 * the key type, the base64 encoding, and the production warning. Observed in the
 * admin console, where an operator issue arrived as a user-facing message.
 *
 * `/verify` and `/verify/key` caught this by hand and returned a vague 503
 * instead. The two *issue* routes did not: the learner claim route in
 * `courses.routes.ts` and the manual issue route in `courseAdmin.routes.ts` both
 * called `signCertificate` bare, so the exception became the response. The
 * signing code itself was never at fault - this is purely about who catches.
 *
 * Asserted here:
 *   - the throw really does carry 503/expose (the leak vector itself), so the
 *     guards below are load-bearing rather than decorative;
 *   - both issue routes guard the call, log with the request id, and return a
 *     body that does not narrate how the machine is configured;
 *   - the signing key survives the module load order, which is what decides
 *     whether any of the above is ever reached - see the last check.
 */
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { stubDotenv } from './dotenvStub';

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

const CERT_PATH = require.resolve('../src/lib/certificate');
const ADMIN_ROUTES = path.join(__dirname, '..', 'src', 'routes', 'courseAdmin.routes.ts');
const COURSE_ROUTES = path.join(__dirname, '..', 'src', 'routes', 'courses.routes.ts');

/** Remove // and /* *\/ comments so a scan only sees real code. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/**
 * `certificate.ts` reads the key once at module load, so the "no key" case needs
 * a fresh copy of the module. It loads dotenv itself - it must, since `server.ts`
 * cannot load .env before an imported module's body runs - so dotenv is stubbed
 * out here: without it, deleting the variable would be undone by the developer's
 * real `backend/.env` and the "unconfigured" phases would assert nothing.
 *
 * `assertSigningConfigured` reads NODE_ENV when it is *called*, not when the
 * module loads, so the callback runs while the environment is still overridden
 * and the restore cannot race the assertion.
 */
function withCertificate<T>(env: Record<string, string | undefined>, fn: (mod: typeof import('../src/lib/certificate')) => T): T {
  stubDotenv();
  const prev = {
    NODE_ENV: process.env.NODE_ENV,
    KEY: process.env.CERT_SIGNING_PRIVATE_KEY,
    FILE: process.env.CERT_SIGNING_PRIVATE_KEY_FILE,
    SITE: process.env.NEXT_PUBLIC_SITE_URL,
  };
  delete require.cache[CERT_PATH];
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return fn(require(CERT_PATH));
  } finally {
    delete require.cache[CERT_PATH];
    for (const [k, v] of Object.entries({
      NODE_ENV: prev.NODE_ENV,
      CERT_SIGNING_PRIVATE_KEY: prev.KEY,
      CERT_SIGNING_PRIVATE_KEY_FILE: prev.FILE,
      NEXT_PUBLIC_SITE_URL: prev.SITE,
    })) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

check('an unconfigured production key throws a 503 the error handler would expose', () => {
  withCertificate(
    { NODE_ENV: 'production', CERT_SIGNING_PRIVATE_KEY: undefined, CERT_SIGNING_PRIVATE_KEY_FILE: undefined },
    (mod) => {
      let thrown: any = null;
      try {
        mod.assertSigningConfigured();
      } catch (e: any) {
        thrown = e;
      }
      assert.ok(thrown, 'production with no key must fail closed');
      // This is the whole reason the issue routes need a guard: an exposed 503
      // hands the caller the operator remedy, variable name and all.
      assert.strictEqual(thrown.status, 503, 'the config error must carry the 503 status');
      assert.match(String(thrown.message), /CERT_SIGNING_PRIVATE_KEY/);
    }
  );
});

check('a configured key passes the production guard and publishes a key', () => {
  const key = require('crypto').generateKeyPairSync('ed25519').privateKey;
  const b64 = key.export({ type: 'pkcs8', format: 'der' }).toString('base64');
  withCertificate(
    { NODE_ENV: 'production', CERT_SIGNING_PRIVATE_KEY: b64, CERT_SIGNING_PRIVATE_KEY_FILE: undefined },
    (mod) => {
      mod.assertSigningConfigured();
      const bundle = mod.publicKeyBundle();
      assert.ok(bundle, 'a configured key must publish a public half');
      assert.strictEqual(bundle!.algorithm, 'ed25519');
    }
  );
});

for (const [label, file] of [
  ['manual issue route', ADMIN_ROUTES],
  ['learner claim route', COURSE_ROUTES],
] as const) {
  check(`${label} guards the signing call`, () => {
    const code = stripComments(fs.readFileSync(file, 'utf8'));
    // The call must sit inside a try, not merely appear near one.
    const at = code.indexOf('signCertificate(');
    assert.ok(at > -1, `${file} should call signCertificate`);
    const before = code.slice(0, at);
    const openTry = before.lastIndexOf('try {');
    const closeTry = before.lastIndexOf('} catch');
    assert.ok(
      openTry > closeTry,
      `${file}: signCertificate must be inside a try block, not bare in the handler`
    );
  });

  check(`${label} does not narrate the configuration to the caller`, () => {
    const code = stripComments(fs.readFileSync(file, 'utf8'));
    // Only the 503 body matters. The variable name may appear in a log line - it
    // is the response that must not carry it.
    for (const m of code.matchAll(/status\(503\)\.json\(\{[^}]*\}\)/g)) {
      const body = m[0];
      assert.ok(
        !/CERT_SIGNING_PRIVATE_KEY|PRIVATE_KEY_FILE|NEXT_PUBLIC_SITE_URL|base64|Ed25519|pkcs8/i.test(body),
        `${file}: a 503 body must not describe the key configuration - got: ${body.slice(0, 120)}`
      );
    }
  });
}

// --- the key has to survive being read at import time -------------------------
//
// The failure this guards is silent and total: `certificate.ts` reads its key
// while it is being imported, and `server.ts` calls `dotenv.config()` in its own
// body - which ES import hoisting puts *after* every imported module has run. So
// the module used to depend on some other module loading .env first, which
// `middleware/auth.ts` happened to do. Reorder an import, or require this module
// from a script, and CERT_SIGNING_PRIVATE_KEY reads as empty on an install whose
// .env is perfectly correct: every issue then answers 503 "Certificates are
// temporarily unavailable" and nothing in the response says why.
//
// Asserted the way it actually happens - .env on disk, nothing preloaded - by
// running dotenv for real from a scratch directory. The stub installed by
// `withCertificate` is lifted for the duration and put back afterwards.
check('the key is loaded from .env even though the module reads it before server.ts can', () => {
  const dotenvPath = require.resolve('dotenv');
  const live = require.cache[dotenvPath];
  delete require.cache[dotenvPath];
  delete require.cache[CERT_PATH];

  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'tieedu-cert-env-'));
  const key = require('crypto').generateKeyPairSync('ed25519').privateKey;
  const priv = key.export({ type: 'pkcs8', format: 'der' }).toString('base64');
  fs.writeFileSync(path.join(scratch, '.env'), `CERT_SIGNING_PRIVATE_KEY=${priv}\nNEXT_PUBLIC_SITE_URL=https://tieedu.test\n`);

  const prevCwd = process.cwd();
  const prevKey = process.env.CERT_SIGNING_PRIVATE_KEY;
  const prevSite = process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.CERT_SIGNING_PRIVATE_KEY;
  delete process.env.NEXT_PUBLIC_SITE_URL;
  try {
    process.chdir(scratch);
    const mod = require(CERT_PATH);
    assert.strictEqual(mod.CERT_SIGNING_PRIVATE_KEY, priv, 'the .env key must be read at import');
    assert.strictEqual(mod.SITE_URL, 'https://tieedu.test', 'the verification origin must come from .env too');
    // And it must be a usable key, not merely a non-empty string.
    const signed = mod.signCertificate({
      serial: 'TIEEDU-2026-ENVLOAD1',
      user_id: 'u-1',
      recipient_email: 'learner@example.com',
      recipient_name: 'Test Learner',
      course_id: 'c-1',
      course_title: 'Fundamentals',
      issued_at: '2026-01-02T03:04:05.000Z',
      lessons_completed: 10,
      lessons_required: 10,
      xp_at_issue: 500,
    });
    assert.ok(mod.ACTIVE_KEY_ID, 'a loaded key must publish a key id');
    assert.strictEqual(signed.keyId, mod.ACTIVE_KEY_ID);
  } finally {
    process.chdir(prevCwd);
    fs.rmSync(scratch, { recursive: true, force: true });
    if (prevKey === undefined) delete process.env.CERT_SIGNING_PRIVATE_KEY;
    else process.env.CERT_SIGNING_PRIVATE_KEY = prevKey;
    if (prevSite === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = prevSite;
    delete require.cache[CERT_PATH];
    if (live) require.cache[dotenvPath] = live;
    else stubDotenv();
  }
});

// --- the readiness diagnostic -------------------------------------------------
//
// The 503 the anonymous endpoints return has to stay vague, because it reaches
// anyone who asks. That leaves the admin console with a button that fails and no
// way to find out why, so the diagnostic moved behind `requireAdmin`. Two things
// must hold for it to be safe to point operators at: it lives behind the admin
// guard, and it cannot echo the private key even though it sits next to it.
check('the readiness diagnostic sits behind the admin guard', () => {
  const code = stripComments(fs.readFileSync(ADMIN_ROUTES, 'utf8'));
  const at = code.indexOf("'/certificates/readiness'");
  assert.ok(at > -1, 'the readiness route should exist');
  const guard = code.indexOf('courseAdminRouter.use(requireAdmin)');
  assert.ok(guard > -1, 'the router should apply requireAdmin at all');
  assert.ok(
    guard < at,
    'readiness must be registered after requireAdmin, or it is a public config dump'
  );
});

check('the readiness diagnostic reports the key state without echoing the key', () => {
  const code = stripComments(fs.readFileSync(ADMIN_ROUTES, 'utf8'));
  const start = code.indexOf("'/certificates/readiness'");
  const respondAt = code.indexOf('res.json(', start);
  assert.ok(respondAt > -1, 'it should answer with json');
  // Only the response payload is asserted, not the handler around it: reading
  // the environment to decide *whether* a key exists is the whole point, and
  // reading is not the same as handing it back.
  const body = code.slice(respondAt, code.indexOf('});', respondAt));
  assert.ok(/signing_configured/.test(body), 'it must say whether signing works');
  assert.ok(/problems/.test(body), 'it must carry the remedy');
  // The public half is publishable by design; the private half is not, whatever
  // the route is called or how the response is later reshaped.
  assert.ok(
    !/PRIVATE_KEY/i.test(body),
    `the response must not include the private key material - got: ${body.replace(/\s+/g, ' ').slice(0, 160)}`
  );
  assert.ok(
    /key_id/.test(body),
    'the fingerprint is the safe way to show which key is loaded'
  );
});

console.log(`\ncertificate-issue-guard: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
