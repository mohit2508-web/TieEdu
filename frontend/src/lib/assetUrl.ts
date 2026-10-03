/**
 * Asset URL helpers.
 *
 * Split out of `api.ts` because both of these are pure string/URL functions
 * that carry the only definition of "our own origin" in the frontend — and
 * `api.ts` cannot be imported by a unit suite.
 *
 * The test runner writes a throwaway tsconfig with `lib: ["ES2020"]` and no DOM,
 * so importing anything that touches `fetch`, `XMLHttpRequest` or `Response`
 * fails to compile. That is why `session-restore.test.ts` asserts against the
 * *text* of `api.ts` rather than importing it — which works, but it can only
 * ever check that a string is present, never that a function behaves.
 *
 * The origin predicate is worth executing for real: its whole job is to be hard
 * to get wrong about which hosts we are willing to hand to the image optimizer,
 * and the interesting cases are the ones a text match cannot distinguish.
 *
 * This module must stay free of DOM and browser globals.
 */

/**
 * Base for every API call the browser makes.
 *
 * Defaults to the *relative* `/api`, not to `http://localhost:5000/api`. That
 * default was only ever correct for a browser on the same machine as the server:
 * on a phone, `localhost` is the phone, so every call — including the push
 * subscribe POST — went nowhere. A relative base is right for all of them at once,
 * because the browser resolves it against whichever origin served the page:
 * localhost, a LAN address, or the production domain. `next.config.mjs` rewrites
 * `/api/*` to the real backend, so the URL on the wire never changes for the user.
 *
 * Set `NEXT_PUBLIC_API_URL` only for a deployment where the API is a different
 * origin and must be called directly. It is inlined at build time.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

/**
 * The API origin, with the trailing `/api` base path stripped.
 *
 * Shared by `apiAssetUrl` and `isApiAssetUrl` so the two cannot disagree about
 * where "our own origin" ends — which is the one fact both depend on.
 *
 * Empty in the default same-origin setup, which is meaningful rather than missing:
 * it means "no separate origin", i.e. our own.
 */
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

/** True when the API is configured on a genuinely different host. */
const API_IS_CROSS_ORIGIN = /^https?:\/\//i.test(API_BASE_URL);

/** The path prefix the API is mounted under, same-origin or not. */
const API_PATH_PREFIX = '/api';

/**
 * The origin this page was served from, or null when there is no document.
 *
 * Read through `globalThis` so this module keeps no build-time dependency on a
 * DOM: the test runner compiles with no DOM lib, and the server bundle has no
 * `location` either.
 */
const selfOrigin = (): string | null => {
  const loc = (globalThis as { location?: { origin?: string } }).location;
  const origin = loc?.origin;
  return origin && origin !== 'null' ? origin : null;
};

const parseUrl = (url: string): URL | null => {
  try {
    return new URL(url);
  } catch {
    return null;
  }
};

/**
 * Turn a server-relative asset path ("/api/posters/file/x.jpg") into a URL the
 * browser can actually load. The frontend and the API are different origins, so
 * a bare relative path would silently 404 against Next.js.
 */
export const apiAssetUrl = (relativePath: string): string => {
  if (!relativePath) return '';
  if (/^https?:\/\//i.test(relativePath)) return relativePath;
  return `${API_ORIGIN}${relativePath.startsWith('/') ? relativePath : `/${relativePath}`}`;
};

/**
 * Is this URL served by our own API — i.e. may `next/image` optimize it?
 *
 * `next.config.mjs` allowlists exactly the API host in `images.remotePatterns`,
 * and the optimizer answers **400** for anything else. So this predicate is what
 * decides whether an image is safe to hand to `next/image` or has to stay a plain
 * `<img>`: a wrong `true` is a broken image in production, which is why it is
 * written to be hard to get wrong rather than convenient.
 *
 * Compared via `URL.origin` rather than `startsWith`, because a prefix test is
 * the classic way this goes wrong — `http://localhost:5000.evil.test/x.png`
 * *does* start with `http://localhost:5000`. `origin` compares scheme, host and
 * port as parsed values, so that string is correctly not ours.
 *
 * Returns false for relative paths, `data:`/`blob:` URLs, and anything
 * unparseable.
 */
export const isApiAssetUrl = (url: string): boolean => {
  if (!url) return false;

  if (!API_IS_CROSS_ORIGIN) {
    /*
     * Same-origin setup. A server-relative `/api/...` path is ours by
     * construction, and it must return true: `CourseUi` builds its `src` with
     * `apiAssetUrl`, which in this mode returns a relative path. Returning false
     * here would quietly drop every course cover to the plain-`<img>` branch and
     * throw away AVIF/WebP negotiation and the responsive srcset — the image
     * migration would look fine and do nothing, which is worse than a visible
     * break because nothing reports an error.
     */
    if (url === API_PATH_PREFIX || url.startsWith(`${API_PATH_PREFIX}/`)) return true;

    // An absolute URL is ours only if it names this page's own origin.
    const own = selfOrigin();
    if (!own) return false;
    const parsed = parseUrl(url);
    if (!parsed) return false;
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    return parsed.origin === own;
  }

  /*
   * Compared via `URL.origin` rather than `startsWith`, because a prefix test is
   * the classic way this goes wrong: `http://localhost:5000.evil.test/x.png`
   * *does* start with `http://localhost:5000`. `origin` compares scheme, host and
   * port as parsed values, so that string is correctly not ours.
   *
   * Returns false for relative paths, `data:`/`blob:` URLs, and anything
   * unparseable.
   */
  const parsed = parseUrl(url);
  if (!parsed) return false;
  /*
   * The scheme check is not redundant with the origin comparison, and it is the
   * subtle one.
   *
   * `origin` is *inherited* for blob URLs: `new URL('blob:http://host/x').origin`
   * is `http://host`, not `"null"`. So a `blob:` URL pointing at our own origin
   * would pass an origin-only test — and then be handed to `next/image`, which
   * cannot fetch a blob URL at all and would fail. The optimizer can only ever
   * fetch `http(s)`, so that is exactly what is admitted here.
   *
   * `data:` and other opaque schemes do fall out as false on origin alone, but
   * they are rejected by the same check rather than by accident.
   */
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  return parsed.origin === new URL(API_ORIGIN).origin;
};
