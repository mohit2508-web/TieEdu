/*
 * Service worker cache policy.
 *
 * The first version of `public/sw.js` decided what to cache with a *denylist*:
 * a short array of prefixes that were never cached, and everything else under
 * `/api/` was. That is the wrong shape, and it was wrong in a way the file's own
 * header comment had predicted.
 *
 * The denylist read `/api/unlock`. The router mounts `/api/unlocks`. The matcher
 * required an exact match or a `prefix + '/'` continuation, so `/api/unlocks/...`
 * matched neither and unlock state was cached like any other catalogue data. Six
 * other per-user routes - `/api/progress`, `/api/gamification`, `/api/study-plan`,
 * `/api/reports`, `/api/analytics`, `/api/checkout` - were never mentioned at all.
 *
 * Both are one-character, one-line mistakes, and neither would have been caught by
 * running the app. So this asserts the *shape* of the policy rather than the
 * contents of a list: an allowlist, an exact-match rule, and a refusal to store a
 * response that carried a bearer token.
 */
import * as fs from 'fs';
import * as path from 'path';

function findRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 8; i += 1) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    dir = path.dirname(dir);
  }
  throw new Error('could not find the frontend root');
}
const ROOT = findRoot();
const sw = fs.readFileSync(path.join(ROOT, 'public', 'sw.js'), 'utf8');

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

// Pull the array literal out of the source so the assertions read the real values
// rather than a copy that could drift.
const arrayOf = (name: string): string[] => {
  const m = new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`).exec(sw);
  if (!m) return [];
  return (m[1].match(/'([^']+)'/g) || []).map((s) => s.replace(/'/g, ''));
};

const cacheable = arrayOf('CACHEABLE_API');
const never = arrayOf('NEVER_CACHE');

ok(cacheable.length > 0, 'the allowlist is present and non-empty');
ok(
  /CACHEABLE_API\.includes\(url\.pathname\)/.test(sw),
  'allowlist membership must be an exact match - a prefix would re-admit every detail route'
);
ok(
  /if \(!isCacheableApi\(url\)\) return;/.test(sw),
  'anything not on the allowlist must be left un-intercepted, not cached by default'
);
ok(
  /staleWhileRevalidateAnonymous/.test(sw) && /request\.headers\.has\('authorization'\)/.test(sw),
  'a response fetched with a bearer token must be served and dropped, never stored'
);

/*
 * The specific miss, restated so the exact character cannot be lost again.
 */
ok(never.includes('/api/unlocks'), 'the real unlock route is named exactly (plural)');

/*
 * The detail routes are the reason the allowlist is so short. They look like
 * catalogue data and are not: the vault carries `is_unlocked` and the course
 * carries per-lesson `state` and `locked`. Both are the user's.
 */
ok(!cacheable.includes('/api/companies/'), 'no per-entity company route is cacheable');
ok(
  cacheable.every((p) => !/s\/?$/.test(p) || p.split('/').length === 3),
  'allowlisted paths are top-level list endpoints only'
);
ok(
  cacheable.every((p) => p.split('/').length === 3),
  `allowlist holds whole-collection paths only, got ${JSON.stringify(cacheable)}`
);

ok(
  never.every((p) => !cacheable.includes(p)),
  'no path may appear on both lists'
);

ok(
  /request\.method !== 'GET'/.test(sw),
  'non-GET requests are never intercepted, so no mutation is ever replayed from cache'
);

ok(
  /url\.origin !== self\.location\.origin/.test(sw),
  'cross-origin requests are left alone, so a third-party API is never cached'
);

console.log(`\nsw-cache-policy: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
