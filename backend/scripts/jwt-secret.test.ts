/**
 * Session-secret tests.
 *
 *   npx ts-node --transpile-only scripts/jwt-secret.test.ts
 *
 * The regression this file exists for: the signing secret used to have a
 * hardcoded fallback, `tieedu-dev-secret-change-me`, committed to the
 * repository. A `npm start` deployment had NODE_ENV unset, so the production
 * branch never ran, the fallback was used, and a token forged from a string in
 * this repo was accepted as an admin session. Verified on a running server
 * before the fix, not theorised about.
 *
 * A secret that is in the source code is not a secret, and the guard against
 * that is that the literal does not exist any more.
 */
import assert from 'assert';
import crypto from 'crypto';

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

const AUTH_PATH = require.resolve('../src/middleware/auth');

function loadAuth(env: Record<string, string | undefined>): typeof import('../src/middleware/auth') {
  const prevEnv = process.env.NODE_ENV;
  const prevSecret = process.env.JWT_SECRET;
  delete require.cache[AUTH_PATH];
  delete process.env.JWT_SECRET;
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  const mod = require(AUTH_PATH);
  delete require.cache[AUTH_PATH];
  process.env.NODE_ENV = prevEnv;
  if (prevSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = prevSecret;
  return mod;
}

// The literal that must never come back.
const OLD_FALLBACK = 'tieedu-dev-secret-change-me';

check('the old hardcoded fallback is gone from the source', () => {
  const fs = require('fs');
  const code = stripComments(fs.readFileSync(AUTH_PATH, 'utf8'));
  assert.ok(!code.includes(OLD_FALLBACK), 'the known dev secret is used as a value again');
  // Comments are stripped first on purpose: the file explains what the old
  // fallback was, and a guard that banned the word would only force someone to
  // delete the explanation of why it must not come back.
});

/** Remove // and /* *\/ comments so a scan only sees real code. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

check('production with no secret fails closed instead of inventing one', () => {
  const mod = loadAuth({ NODE_ENV: 'production', JWT_SECRET: undefined });
  assert.strictEqual(mod.JWT_SECRET, '', 'production must not fall back to anything');
  assert.throws(() => mod.assertAuthConfigured(), /JWT_SECRET is not set/);
});

check('a blank secret is treated as no secret', () => {
  const mod = loadAuth({ NODE_ENV: 'production', JWT_SECRET: '   ' });
  assert.strictEqual(mod.JWT_SECRET, '');
  assert.throws(() => mod.assertAuthConfigured(), /JWT_SECRET is not set/);
});

check('a configured secret is used verbatim', () => {
  const mod = loadAuth({ NODE_ENV: 'production', JWT_SECRET: 'a-real-secret-value' });
  assert.strictEqual(mod.JWT_SECRET, 'a-real-secret-value');
  mod.assertAuthConfigured();
});

check('development gets a random secret, not a guessable one', () => {
  const a = loadAuth({ NODE_ENV: 'development', JWT_SECRET: undefined }).JWT_SECRET;
  const b = loadAuth({ NODE_ENV: 'development', JWT_SECRET: undefined }).JWT_SECRET;
  assert.ok(a && a.length >= 64, `expected a long random secret, got ${a?.length} chars`);
  assert.notStrictEqual(a, b, 'two boots must not share a secret');
  assert.ok(!a.includes(OLD_FALLBACK));
});

check('a token signed with the old fallback is not the configured secret', () => {
  // Even if someone still has an old session token, it must not verify.
  const jwt = require('jsonwebtoken');
  const mod = loadAuth({ NODE_ENV: 'production', JWT_SECRET: crypto.randomBytes(32).toString('hex') });
  const forged = jwt.sign({ sub: 'user-1', role: 'admin' }, OLD_FALLBACK, { expiresIn: '1h' });
  assert.throws(() => jwt.verify(forged, mod.JWT_SECRET), /invalid signature/);
});

console.log(`\njwt-secret: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
