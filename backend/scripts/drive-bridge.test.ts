/**
 * Mock Drive & Assessment Bridge — protocol tests.
 *
 * These are deliberately pure: they exercise the two things that must never be
 * wrong and can be checked without a database —
 *
 *   1. launch tokens are opaque, high-entropy, and verified by hash, never by
 *      equality against a stored plaintext, and
 *   2. webhook signatures are timestamped and constant-time, so a replayed or
 *      tampered delivery cannot be made to look valid.
 *
 * Anything that needs PostgreSQL (introspect consume, event idempotency) is left
 * to the live contract test in the plan's roadmap, because a test that silently
 * skips when DATABASE_URL is unset is worse than no test.
 */
import {
  generateLaunchToken,
  sha256,
  signTimestamped,
  verifyTimestamped,
  withQuery,
} from '../src/lib/bridge/core';

let pass = 0;
let fail = 0;
function ok(name: string, cond: boolean) {
  if (cond) pass++;
  else {
    fail++;
    console.log(`FAIL ${name}`);
  }
}

const SECRET = 'unit-test-secret';

function main() {
  // --- tokens --------------------------------------------------------------
  const a = generateLaunchToken();
  const b = generateLaunchToken();
  ok('token is url-safe base64url', /^[A-Za-z0-9_-]+$/.test(a.token));
  ok('token has 256 bits of entropy', a.token.length >= 43);
  ok('two tokens differ', a.token !== b.token);
  ok('stored hash is sha256 of token', a.token_hash === sha256(a.token));
  ok('stored hash never equals the token', a.token_hash !== a.token);
  ok('jti is unique', a.token_jti !== b.token_jti);

  // --- signature: valid ----------------------------------------------------
  const body = JSON.stringify({ event_type: 'attempt.completed', score: 80 });
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = signTimestamped(SECRET, ts, body);
  ok(
    'valid timestamped signature accepted',
    verifyTimestamped({ secret: SECRET, timestamp: ts, signature: sig, rawBody: body }).ok === true
  );

  // --- signature: tampered body -------------------------------------------
  const tampered = JSON.stringify({ event_type: 'attempt.completed', score: 100 });
  ok(
    'signature over a different body rejected',
    verifyTimestamped({ secret: SECRET, timestamp: ts, signature: sig, rawBody: tampered }).ok === false
  );

  // --- signature: wrong secret --------------------------------------------
  ok(
    'signature with wrong secret rejected',
    verifyTimestamped({ secret: 'nope', timestamp: ts, signature: sig, rawBody: body }).ok === false
  );

  // --- signature: stale timestamp (replay) --------------------------------
  const oldTs = String(Math.floor(Date.now() / 1000) - 4000);
  const oldSig = signTimestamped(SECRET, oldTs, body);
  const stale = verifyTimestamped({ secret: SECRET, timestamp: oldTs, signature: oldSig, rawBody: body });
  ok('replayed old timestamp rejected', stale.ok === false);
  ok('replay rejected specifically for staleness', stale.reason === 'stale_timestamp');

  // --- signature: header arrays are handled -------------------------------
  ok(
    'array-valued headers are read',
    verifyTimestamped({ secret: SECRET, timestamp: [ts], signature: [sig], rawBody: body }).ok === true
  );

  // --- signature: missing pieces ------------------------------------------
  ok(
    'missing signature rejected',
    verifyTimestamped({ secret: SECRET, timestamp: ts, signature: undefined, rawBody: body }).ok === false
  );

  // --- withQuery -----------------------------------------------------------
  ok('append to bare url', withQuery('https://x.exam/start', 'lt', 'abc') === 'https://x.exam/start?lt=abc');
  ok('append to url with query', withQuery('https://x.exam/start?a=1', 'lt', 'abc') === 'https://x.exam/start?a=1&lt=abc');

  console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main();
