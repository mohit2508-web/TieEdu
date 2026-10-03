/**
 * TieEdu service worker — Phase 0 (MOBILE_APP_UI_PLAN.md §0.5).
 *
 * Strategy is chosen per resource class, not globally, because this app mixes
 * public reference data with paid, per-user entitlement state. A single
 * cache-first rule would eventually serve a cached `is_unlocked: false` to a
 * student who has paid, which is the worst possible failure for this product.
 *
 *   HTML            network-first, offline fallback to the cached shell
 *   GET /api/*      stale-while-revalidate, EXCEPT the never-cache list
 *   never cache     /api/auth, /api/orders, /api/payments, and any non-GET
 *   static assets   cache-first (Next fingerprints these filenames)
 *
 * The never-cache list is the whole point of this file. Everything else is an
 * optimisation; this is a correctness boundary.
 */

const VERSION = 'tieedu-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const DATA_CACHE = `${VERSION}-data`;
const STATIC_CACHE = `${VERSION}-static`;

/**
 * Entitlement, identity and money. Never serve these from a cache.
 *
 * This list is kept for documentation and as a tripwire, but it is no longer what
 * decides. It was a denylist, and a denylist has to be right about every route
 * that exists - which it was not. It read `/api/unlock` while the router actually
 * mounts `/api/unlocks`, so the check missed by a single character and unlock state
 * was cached. It also said nothing about `/api/progress`, `/api/gamification`,
 * `/api/study-plan`, `/api/reports`, `/api/analytics` or `/api/checkout`, every one
 * of which is per-user. A new user-specific route would have been cached by default,
 * which is the wrong direction to fail in.
 */
const NEVER_CACHE = [
  '/api/auth',
  '/api/orders',
  '/api/payments',
  '/api/me',
  '/api/unlock',
  '/api/unlocks',
  '/api/progress',
  '/api/gamification',
  '/api/study-plan',
  '/api/reports',
  '/api/analytics',
  '/api/checkout',
  '/api/campus',
  '/api/admin',
  '/api/comments',
  '/api/pdf',
  '/api/webhooks',
];

/**
 * The only API responses this worker will store: public reference data, and only
 * the *list* endpoints.
 *
 * An allowlist, because the failure mode is asymmetric. Caching something that
 * should not be cached hands one account another account's data; failing to cache
 * something that could be means a slower offline fallback. The detail routes are
 * excluded on purpose even though they are the same shape of data -
 * `/api/companies/:slug` returns `is_unlocked` and `/api/courses/:slug` returns
 * per-lesson `state` and `locked`, both of which are the *user's*, not the
 * catalogue's. Those are precisely the fields this file exists to protect.
 *
 * Exact matches only, no prefix: a sub-path is a different response and is assumed
 * to be per-user until someone proves otherwise.
 */
const CACHEABLE_API = [
  '/api/companies',
  '/api/courses',
  '/api/pricing',
];

const OFFLINE_DOCUMENT = '/offline.html';

/**
 * Precache shell.
 *
 * Cached one at a time and individually tolerated rather than via a single
 * `cache.addAll`. `addAll` is atomic: one rejected request discards the whole
 * batch, which fails the `install` event, which means the worker never activates
 * and `navigator.serviceWorker.ready` stays pending forever. That presented as a
 * "Enable notifications" button spinning with no error — the browser logs a
 * `Failed to execute 'addAll' on 'Cache'` in the console and otherwise says
 * nothing.
 *
 * That is exactly what happened: the list referenced `/favicon.svg`, which has
 * never existed (the favicons here are `.ico` and PNG), so the worker could not
 * install at all. Treating each entry as best-effort means a missing or renamed
 * asset degrades offline support instead of taking push down with it.
 */
const PRECACHE_URLS = [OFFLINE_DOCUMENT, '/logo.svg'];

const precacheShell = async () => {
  const cache = await caches.open(SHELL_CACHE);
  await Promise.all(
    PRECACHE_URLS.map((url) =>
      cache.add(new Request(url, { cache: 'reload' })).catch((err) => {
        console.warn('[sw] precache skipped', url, err);
      })
    )
  );
};

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(VERSION))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

const isNeverCached = (url) =>
  NEVER_CACHE.some((prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`));

/** Exact match on purpose - see the note on CACHEABLE_API. */
const isCacheableApi = (url) => CACHEABLE_API.includes(url.pathname);

const networkFirstDocument = async (request) => {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    return cached || (await cache.match(OFFLINE_DOCUMENT)) || Response.error();
  }
};

const staleWhileRevalidate = async (request, cacheName) => {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      // Only 200s: a 401 or a 500 must not overwrite a good cached body.
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);

  return cached || (await network) || Response.error();
};

/**
 * `staleWhileRevalidate`, but it refuses to store an authenticated response.
 *
 * The allowlist already excludes every per-user route, and that is the important
 * control. This is the second, independent one: the same URL can be requested
 * both anonymously and with a `Bearer` token, the cache key does not distinguish
 * them, and the token-bearing response is the one that carries the user's state.
 * Keying the cache on the URL alone would let a signed-in response be replayed to
 * whoever asks next. If a request carries credentials it is served and dropped.
 */
const staleWhileRevalidateAnonymous = async (request, cacheName) => {
  if (request.headers.has('authorization')) return fetch(request);
  return staleWhileRevalidate(request, cacheName);
};

const cacheFirstStatic = async (request) => {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isNeverCached(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstDocument(request));
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    // Anything under /api/ that is not on the short allowlist is simply not
    // intercepted, so the browser does it normally. Returning early is the whole
    // fix: a user-specific response must never be able to reach a cache.
    if (!isCacheableApi(url)) return;
    event.respondWith(staleWhileRevalidateAnonymous(request, DATA_CACHE));
    return;
  }

  if (url.pathname.startsWith('/_next/static/') || /\.(?:png|svg|jpg|webp|woff2?)$/.test(url.pathname)) {
    event.respondWith(cacheFirstStatic(request));
  }
});


// Push handlers live in a separate file so a push change does not
// invalidate the caching service worker cache.
importScripts('/sw-push.js');
