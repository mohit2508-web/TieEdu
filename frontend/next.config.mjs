/** @type {import('next').NextConfig} */

// Where the Node server proxies `/api/*` to. Deliberately NOT `NEXT_PUBLIC_*`:
// that namespace is inlined into the client bundle, and the proxy target is a
// server-side detail that must not be shipped to browsers.
const API_PROXY_TARGET = process.env.API_PROXY_TARGET || 'http://localhost:5000';

// The origin that serves posters, company logos, course covers and avatars.
//
// Default is empty, meaning "the origin the page itself was served from". The
// `remotePatterns` allowlist below is therefore only needed when the API is
// genuinely a different host; in the default same-origin setup the optimizer
// already treats these as local paths.
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || '';

const remotePatternFor = (origin) => {
  const { protocol, hostname, port } = new URL(origin);
  return {
    protocol: protocol.replace(':', ''),
    // A leading `**` would allow `evil.com` and, worse, `attacker.com.evil.test`.
    // Only the exact API host is allowed to be optimized and re-served by us.
    hostname,
    ...(port ? { port } : {}),
  };
};

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // `next build` and `next dev` both own `.next`, and a running dev server holds
  // `.next/trace` open — so a build while the dev server is up dies with EPERM on
  // Windows. Setting NEXT_DIST_DIR lets the build write somewhere else instead of
  // fighting over the directory (or requiring the dev server to be stopped).
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),

  /*
   * Both of these used to be nested inside `experimental`, where Next.js does not
   * read them — `images` and `headers` are top-level `NextConfig` keys, and
   * `ExperimentalConfig` in Next 14 declares neither. Nothing warned about it,
   * because Next ignores config keys it does not recognise rather than failing.
   *
   * Two things were silently not happening:
   *
   * - `remotePatterns` was inert, so any `next/image` given a remote src throws at
   *   runtime ("hostname is not configured under images"). This is why the
   *   components below use plain `<img>`: `next/image` could not be used at all
   *   until this was fixed.
   * - The `/sw.js` and `/manifest.json` headers were never applied. That is the
   *   Phase 0 note below, and it is the one that mattered: the worker was being
   *   served with default caching, which is the "PWA stuck on an old worker
   *   forever" failure. Fixed here, and `scripts/next-config-shape.test.ts` keeps
   *   both keys at the top level.
   */
  images: {
    // Empty unless the API lives on another host, in which case the optimizer has
    // to be told it may fetch from there. Adding a pattern for the same-origin
    // case would be a no-op that reads as if a remote host were trusted.
    remotePatterns: API_ORIGIN ? [remotePatternFor(API_ORIGIN)] : [],
    // Never upscale past the source, and keep AVIF/WebP. A phone on a slow link is
    // the whole point of this migration.
    formats: ['image/avif', 'image/webp'],
    // 420 is the preview-shell aside's real width. Without it the srcset jumps
    // 390 -> 640 and a 420px slot downloads 220px of extra image.
    deviceSizes: [390, 420, 640, 828, 1080, 1200, 1920],
    // Every width in a srcset is the union of `deviceSizes` and `imageSizes`, for
    // *every* image that declares `sizes` -- so each entry here is also a URL of
    // HTML in each of those tags. Adding a width that nothing needs is therefore
    // not free, and five of the six widths first tried here were removable: 40,
    // 44, 80, 112 and 240 are all within the waste budget of the stock 48/96/128/
    // 256, so they only bloated the markup. 168 is the one real gap (the course
    // card would otherwise pull the 256px file) and it earns its entry.
    imageSizes: [16, 32, 48, 64, 96, 128, 168, 256, 384],
  },

  /*
   * Phase 0 — MOBILE_APP_UI_PLAN.md §0.5.
   *
   * A service worker is only ever loaded once. If `sw.js` itself is cached
   * (browsers cache it aggressively, and Next serves everything from
   * `_next/static` under a long max-age), a new deploy can never reach the
   * device again — the app is stuck on the old worker, and the only cure is a
   * manual "clear site data". This is the single most common way a PWA ships
   * successfully and then silently stops updating.
   *
   * Same reasoning for the manifest: it is read on every install and on every
   * home-screen launch.
   *
   * `Service-Worker-Allowed: /` is what lets a worker registered from `/` claim
   * the whole origin. Without it a worker served from `/sw.js` is capped at that
   * path and offline fallbacks for navigations never engage.
   */
  /*
   * Same-origin `/api` proxy — the reason this file needs to exist at all.
   *
   * The frontend used to bake `http://localhost:5000/api` into the bundle as the
   * API base. That is correct for exactly one client: a browser on the same
   * machine as the server. Everywhere else `localhost` means *the client itself*,
   * so every API call failed — and because `trackInstall` swallows its fetch
   * error, a phone on the LAN failed completely silently.
   *
   * Hardcoding a LAN IP instead would only move the problem: the value is baked
   * at build time, so it cannot be right for localhost, LAN and production at
   * once, and it silently rots when DHCP hands out a new address.
   *
   * So the bundle now addresses the API *relatively* (`/api/...`) and this rewrite
   * forwards it to the real backend. The browser therefore always calls the origin
   * it was served from, which is correct for every client without configuration —
   * and it makes the request same-origin, which removes the CORS preflight
   * entirely.
   *
   * `API_PROXY_TARGET` is server-side only. Deployments that run the API somewhere
   * else set it (or set `NEXT_PUBLIC_API_URL`, which additionally keeps the client
   * talking to it directly instead of through here).
   */
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_PROXY_TARGET}/api/:path*`,
      },
    ];
  },

  // Legacy drive pages now live under the 5-tab Mock Drive sub-app. Old links
  // (nav, bookmarks, homepage rail) must land on the new screens rather than
  // the pre-Section-15 pages, which are kept only so existing code compiles.
  async redirects() {
    return [
      {
        source: '/drives/:driveId',
        destination: '/mock-drive/drives/:driveId',
        permanent: true,
      },
      {
        source: '/drives',
        destination: '/mock-drive/drives',
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
      },
    ];
  },
};

export default nextConfig;
