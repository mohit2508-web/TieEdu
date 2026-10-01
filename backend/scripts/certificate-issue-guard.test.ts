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
 *     body that does not narrate how the machine is configured.
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

const CERT_PATH = require.resolve('../src/lib/certificate');
const ADMIN_ROUTES = path.join(__dirname, '..', 'src', 'routes', 'courseAdmin.routes.ts');
const COURSE_ROUTES = path.join(__dirname, '..', 'src', 'routes', 'courses.routes.ts');

/** Remove // and /* *\/ comments so a scan only sees real code. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/**
 * `certificate.ts` reads the key once at module load, so the "no key" case needs
 * a fresh copy of the module. It does not load dotenv itself, so deleting the
 * variable is enough - there is no side door for the real .env to sneak back in
 * through the way there is in `auth.ts`.
 *
 * `assertSigningConfigured` reads NODE_ENV when it is *called*, not when the
 * module loads, so the callback runs while the environment is still overridden
 * and the restore cannot race the assertion.
 */
function withCertificate<T>(env: Record<string, string | undefined>, fn: (mod: typeof import('../src/lib/certificate')) => T): T {
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

console.log(`\ncertificate-issue-guard: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
