/*
 * Session restore across a reload.
 *
 * Found by the Phase 6/8 browser probe, not by reading code. The probe signed in,
 * reloaded, and found the student signed out again. The network trace is the whole
 * story:
 *
 *   GET  /api/auth/me     -> 401   (no access token yet, expected)
 *   POST /api/auth/refresh -> 200  (issues a new refresh cookie)
 *   GET  /api/auth/me     -> 401
 *   POST /api/auth/refresh -> 401  (signed out)
 *
 * The refresh token is single-use, so the second refresh presented a cookie the
 * first one had already consumed. `AuthContext` was calling `apiRefresh()`
 * directly and therefore bypassing the single-flight guard that `api.ts` already
 * had for the 401 path - the guard existed, it just was not shared.
 *
 * This matters far more on the appified build than it did on the website. Phase 0
 * made this installable, and a reload is an ordinary thing for someone to do.
 * Being silently signed out on refresh is not a cosmetic problem.
 *
 * These are source assertions, not a behavioural test. The runner compiles
 * without the DOM lib, so there is no `window`, no `fetch` and no `localStorage`
 * to drive - and faking a rotating cookie in Node would test the fake. The probe
 * is the behavioural check; this file stops the guard from being quietly removed.
 */
import * as fs from 'fs';
import * as path from 'path';

// Walk up to the frontend root. The suite is compiled into `.test-build/`, so
// `__dirname` is two levels below the sources and a `__dirname/..` read would
// look for the file inside the build output.
function findRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 8; i += 1) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    dir = path.dirname(dir);
  }
  throw new Error('could not find the frontend root');
}
const ROOT = findRoot();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
let pass = 0;
let fail = 0;
const ok = (cond: boolean, msg: string) => {
  if (cond) {
    pass += 1;
    console.log(`  ok   ${msg}`);
  } else {
    fail += 1;
    console.log(`  FAIL ${msg}`);
  }
};

const authCtx = read('src/context/AuthContext.tsx');
const api = read('src/lib/api.ts');

ok(
  /import\s*\{[^}]*tryRefreshSession[^}]*\}\s*from\s*'@\/lib\/api'/.test(authCtx),
  'the boot refresh must go through the shared single-flight guard'
);

ok(
  !/await apiRefresh\(\)/.test(authCtx),
  'AuthContext must not call apiRefresh() directly - that is the racing path'
);

ok(
  /export const tryRefreshSession/.test(api),
  'the single-flight guard has to be exported for the boot path to use it'
);

ok(
  /if \(!refreshInFlight\)/.test(api) && /\.finally\(\(\) => \{ refreshInFlight = null; \}\)/.test(api),
  'the guard must actually collapse concurrent callers, and then clear itself'
);

ok(
  /export const getSessionUser/.test(api) && /let sessionUser: AuthUser \| null/.test(api),
  'the user has to be readable from the refresh that already happened'
);

/*
 * The subtle half. Reading the user back with a second `apiRefresh()` would look
 * tidier in the effect and would reintroduce the exact race the guard removes,
 * so it is called out separately.
 */
const bootEffect = /const ok = await tryRefreshSession\(\);[\s\S]{0,900}/.exec(authCtx)?.[0] ?? '';
ok(bootEffect.length > 0, 'could find the boot effect to inspect');
ok(
  bootEffect.length > 0 && !/apiRefresh/.test(bootEffect),
  'the boot effect must not re-request the session; that rotates the token again'
);
ok(
  /getSessionUser\(\)/.test(bootEffect),
  'and it must read the user the shared refresh already returned'
);

/*
 * Failing closed. If the refresh cannot produce a user, the cached user is
 * dropped rather than left on screen, so a stale identity cannot masquerade as a
 * live session.
 */
ok(
  /localStorage\.removeItem\('tieedu_cached_user'\)/.test(authCtx),
  'a failed restore must clear the cached user instead of leaving a stale one'
);
ok(
  /setLoading\(false\)/.test(bootEffect),
  'loading must always settle, or the whole shell waits forever'
);

console.log(`\nsession-restore: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
