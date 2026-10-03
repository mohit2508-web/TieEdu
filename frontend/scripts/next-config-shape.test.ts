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

  /*
   * Optimizer policy.
   *
   * `remotePatterns` has to be an *array*; whether it has to be *non-empty* depends
   * on the deployment, and asserting non-empty unconditionally is what pinned the
   * old hardcoded `http://localhost:5000/api` in place. Same-origin is the default
   * and correctly trusts no remote host at all; the cross-origin case requires
   * exactly one entry, and that is asserted further down against `API_BASE_URL`.
   */
  const images = cfg.images || {};
  ok(Array.isArray(images.remotePatterns), '`remotePatterns` is an array');
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
   *
   * The default is now the *relative* `/api`, because a hardcoded
   * `http://localhost:5000/api` only works for a browser on the server's own
   * machine — on a phone `localhost` is the phone, which is what broke push. So
   * the allowlist is only required in the cross-origin case; the same-origin case
   * depends on the rewrite asserted below instead.
   */
  const apiSource = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'assetUrl.ts'), 'utf8');
  const apiBase = /API_BASE_URL\s*=\s*process\.env\.NEXT_PUBLIC_API_URL\s*\|\|\s*'([^']+)'/.exec(apiSource);
  ok(apiBase !== null, 'API_BASE_URL default is parseable from src/lib/assetUrl.ts');
  ok(
    /API_ORIGIN\s*=\s*API_BASE_URL\.replace/.test(apiSource),
    'API_ORIGIN is derived from API_BASE_URL rather than hardcoded a second time'
  );
  const apiDefault = apiBase ? apiBase[1] : '';
  const apiIsAbsolute = /^https?:\/\//i.test(apiDefault);
  ok(
    !apiIsAbsolute || apiDefault !== 'http://localhost:5000/api',
    'API_BASE_URL does not default to a localhost origin that only works on one machine'
  );

  const patterns = (images.remotePatterns || []) as { hostname?: string; port?: string }[];
  if (apiIsAbsolute) {
    const apiUrl = new URL(apiDefault);
    const pattern = patterns[0] || {};
    ok(pattern.hostname === apiUrl.hostname, `remotePatterns host matches API_BASE_URL host (${apiUrl.hostname})`);
    ok(
      (pattern.port || '') === (apiUrl.port || ''),
      `remotePatterns port matches API_BASE_URL port (${apiUrl.port || 'default'})`
    );
  } else {
    ok(
      patterns.length === 0,
      'no remotePatterns are trusted in the same-origin default (an API image is a local path)'
    );
  }

  /*
   * The rewrite is what makes a relative API base work at all. Without it every
   * `/api/*` request from a browser hits Next.js itself and 404s, which is the
   * same class of silent total failure the hardcoded localhost used to cause —
   * just moved to the other side of the proxy.
   */
  const rewriteRules = await (cfg.rewrites ? cfg.rewrites() : []);
  const apiRewrite = rewriteRules.find(
    (r: { source?: string }) => typeof r?.source === 'string' && r.source.startsWith('/api/')
  );
  ok(apiRewrite !== undefined, 'a rewrites() rule proxies /api/* to the backend');
  if (apiRewrite) {
    const dest = (apiRewrite as { destination?: string }).destination || '';
    ok(
      /\/(api\/)?:path\*$/.test(dest) && /\/api\//.test(dest),
      `the /api rewrite preserves the API prefix through :path* (got ${dest})`
    );
  }
  const configText = fs.readFileSync(path.join(ROOT, 'next.config.mjs'), 'utf8');
  ok(
    /API_PROXY_TARGET\s*=\s*process\.env\.API_PROXY_TARGET/.test(configText),
    'the proxy target reads API_PROXY_TARGET, not NEXT_PUBLIC_API_URL, so it is never shipped to the browser'
  );
  ok(
    /process\.env\.API_PROXY_TARGET/.test(configText) &&
      !/NEXT_PUBLIC_API_PROXY/.test(configText),
    'no NEXT_PUBLIC_ proxy variable leaks the backend address into the client bundle'
  );

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
