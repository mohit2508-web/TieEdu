/*
 * `next.config.mjs` shape.
 *
 * This exists because of a bug that produced no error, no warning, and no failing
 * test. Both `images` and `headers` were nested inside `experimental`:
 *
 *     experimental: { cpus: 4, images: { ... }, async headers() { ... } }
 *
 * `images` and `headers` are top-level `NextConfig` keys and `ExperimentalConfig`
 * in Next 14 declares neither, so Next ignored them. It does not reject config keys
 * it does not recognise — it just drops them. Two things were therefore silently
 * not happening:
 *
 *   1. `remotePatterns` was inert, so every `next/image` with a remote src threw
 *      "hostname is not configured under images" at runtime. This is the reason
 *      so many components in `src/` still use a plain `<img>`.
 *   2. The `/sw.js` and `/manifest.json` cache headers were never applied, which
 *      is the "PWA pinned to a stale worker forever" failure documented in
 *      MOBILE_APP_UI_PLAN.md §0.5.
 *
 * The reason it is worth a test is that a config file is not exercised by the unit
 * suites and cannot be asserted by hand at review time — the object simply looks
 * plausible. So the assertions below read the real exported config rather than
 * pattern-matching the source, and they are deliberately written so that moving
 * `images` back under `experimental` fails loudly rather than quietly.
 *
 * The suites are emitted as CommonJS and run on bare node, so the config is pulled
 * in with a dynamic `import()` of its file URL: `require()` cannot load an `.mjs`.
 */
import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';

function findRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 8; i += 1) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    dir = path.dirname(dir);
  }
  throw new Error('could not find the frontend root');
}

const ROOT = findRoot();

/*
 * A real dynamic `import()`, smuggled past the compiler.
 *
 * The runner emits every suite as CommonJS (`module: commonjs` in the throwaway
 * tsconfig it writes), and TypeScript faithfully downlevels a literal
 * `import(...)` call into `require(...)`. That turns a file URL into a
 * `require('file:///D:/New%20folder...')`, which fails with MODULE_NOT_FOUND —
 * `require` resolves specifiers, and it can neither load a `.mjs` nor read a URL.
 *
 * Building the function from a string keeps the import dynamic at runtime, so
 * node loads next.config.mjs as the ES module it actually is. Without this the
 * suite cannot see the config at all, which is the whole point of it.
 */
const importEsm = new Function('specifier', 'return import(specifier)') as (
  specifier: string
) => Promise<any>;

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

const headerRule = async (cfg: any, source: string) => {
  const rules = await cfg.headers();
  return (rules as any[]).find((r) => r.source === source);
};

const headerValue = (rule: any, key: string) =>
  rule && (rule.headers as any[]).find((h: any) => h.key === key)?.value;

const main = async () => {
  const configUrl = pathToFileURL(path.join(ROOT, 'next.config.mjs')).href;
  const cfg: any = (await importEsm(configUrl)).default;
  const source = fs.readFileSync(path.join(ROOT, 'next.config.mjs'), 'utf8');

  // The regression itself.
  ok(cfg.images !== undefined, '`images` is a top-level key (was nested under `experimental`)');
  ok(typeof cfg.headers === 'function', '`headers` is a top-level function (was nested under `experimental`)');
  ok(
    cfg.experimental?.images === undefined && cfg.experimental?.headers === undefined,
    '`experimental` no longer carries `images` or `headers`'
  );

  // Optimizer policy.
  const images = cfg.images || {};
  ok(Array.isArray(images.remotePatterns) && images.remotePatterns.length > 0, '`remotePatterns` is a non-empty array');
  ok(
    (images.remotePatterns || []).every((p: any) => p.hostname && p.hostname !== '**'),
    'no `**` hostname wildcard — only the exact API host may be re-served by the optimizer'
  );
  ok(
    Array.isArray(images.formats) && images.formats.includes('image/avif') && images.formats.includes('image/webp'),
    'AVIF and WebP are negotiated'
  );
  ok(
    images.dangerouslyAllowSVG !== true,
    '`dangerouslyAllowSVG` stays off — /logo.svg and author-supplied SVGs use plain `<img>`'
  );

  /*
   * The config comment claims the allowlist "has to agree with API_BASE_URL in
   * src/lib/api.ts". Nothing enforced that, and the two are written separately, so
   * a deploy that changed one without the other would leave every remote image
   * throwing at runtime. Compare the host the two actually resolve to.
   *
   * Read from `src/lib/assetUrl.ts`, where the constant now lives: it was moved
   * out of `api.ts` so this suite could import and execute the URL helpers, since
   * the runner compiles with no DOM lib and `api.ts` pulls in `fetch` and
   * `XMLHttpRequest`. This assertion is what caught the move, which is the point
   * of having it.
   */
  const apiSource = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'assetUrl.ts'), 'utf8');
  const apiBase = /API_BASE_URL\s*=\s*process\.env\.NEXT_PUBLIC_API_URL\s*\|\|\s*'([^']+)'/.exec(apiSource);
  ok(apiBase !== null, 'API_BASE_URL default is parseable from src/lib/assetUrl.ts');
  ok(
    /API_ORIGIN\s*=\s*API_BASE_URL\.replace/.test(apiSource),
    'API_ORIGIN is derived from API_BASE_URL rather than hardcoded a second time'
  );
  if (apiBase) {
    const apiUrl = new URL(apiBase[1]);
    const pattern = (images.remotePatterns || [])[0] || {};
    ok(pattern.hostname === apiUrl.hostname, `remotePatterns host matches API_BASE_URL host (${apiUrl.hostname})`);
    ok(
      (pattern.port || '') === (apiUrl.port || ''),
      `remotePatterns port matches API_BASE_URL port (${apiUrl.port || 'default'})`
    );
  }

  // PWA headers — the reason this config was wrong in the first place.
  const sw = await headerRule(cfg, '/sw.js');
  ok(sw !== undefined, 'a headers() rule exists for /sw.js');
  const swCache = headerValue(sw, 'Cache-Control');
  ok(
    typeof swCache === 'string' && swCache.includes('no-store'),
    `/sw.js is served no-store (got ${JSON.stringify(swCache)})`
  );
  ok(
    headerValue(sw, 'Service-Worker-Allowed') === '/',
    '/sw.js declares Service-Worker-Allowed: / so the worker can claim the origin'
  );

  const manifest = await headerRule(cfg, '/manifest.json');
  ok(manifest !== undefined, 'a headers() rule exists for /manifest.json');
  ok(
    String(headerValue(manifest, 'Cache-Control')).includes('no-store'),
    '/manifest.json is served no-store so a new deploy can replace it'
  );

  // A stale comment is how the original bug stayed invisible for so long.
  ok(
    !/remotePatterns:\s*\[\s*\{\s*hostname:\s*['"]\*{2}/.test(source),
    'source does not contain a wildcard remotePattern'
  );

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
