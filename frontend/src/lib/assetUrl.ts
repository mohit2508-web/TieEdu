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

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * The API origin, with the trailing `/api` base path stripped.
 *
 * Shared by `apiAssetUrl` and `isApiAssetUrl` so the two cannot disagree about
 * where "our own origin" ends — which is the one fact both depend on.
 */
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

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
  try {
    const parsed = new URL(url);
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
  } catch {
    return false;
  }
};
