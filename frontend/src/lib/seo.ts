/**
 * Site-wide SEO rules (SEO_GROWTH_PLAN §2), applied once in _app so no page
 * can forget them. A page that knows better (its own canonical, title, image)
 * overrides by using the same `key`.
 */
export const SITE_ORIGIN = 'https://tieedu.in';

/**
 * Pages Google should never list: signed-in tools, private plans, auth steps,
 * staff consoles, and screens with no public content of their own.
 */
const NOINDEX_PREFIXES = [
  '/prep',
  '/account',
  '/welcome',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/admin',
  '/tpo',
  '/school',
  '/parent',
  '/parent-email',
  '/my-courses',
  '/streak',
  '/my-certificates',
  '/calendar',
  '/debrief',
  '/study-groups',
  '/mock-drive',
  '/drive-day',
  '/design',
  '/study-plan',
  '/skill-test/my-certificates',
  '/skill-test/skill-passport',
];

/** Sub-pages of a public item that are steps, not landing pages. */
const NOINDEX_PATTERNS = [/^\/skill-test\/[^/]+\/(assessment|overview|result)(\/|$)/];

export function isNoindexPath(pathname: string): boolean {
  const p = pathname.split('?')[0].split('#')[0];
  return NOINDEX_PREFIXES.some((x) => p === x || p.startsWith(`${x}/`)) || NOINDEX_PATTERNS.some((r) => r.test(p));
}

/** The canonical URL for a path: our origin, no query string, no hash, no trailing slash. */
export function canonicalFor(asPath: string): string {
  const path = asPath.split('#')[0].split('?')[0].replace(/\/+$/, '') || '/';
  return `${SITE_ORIGIN}${path === '/' ? '/' : path}`;
}
