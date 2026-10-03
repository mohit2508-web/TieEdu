/** @type {import('next').NextConfig} */

// The API origin that serves posters, company logos, course covers and avatars.
//
// This has to agree with `API_BASE_URL` in `src/lib/api.ts`. It is read at config
// load time, so it is also inlined into the server bundle — which is exactly what
// `images.remotePatterns` needs to allow the optimizer to fetch from.
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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
    remotePatterns: [remotePatternFor(API_ORIGIN)],
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
