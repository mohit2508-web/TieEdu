/**
 * Page-classification rules for behaviour tracking.
 *
 * A tracked visit is only useful if it says *what kind of page* the lead
 * looked at — that is the input every Phase 4 automation consumes
 * (`page_view category=course → nudge`, `category=vault → unlock offer`, …).
 * Classification lives in one exported module so the route handlers and the
 * tests agree on the exact rules, and so adding a category is a one-line
 * change instead of a string duplicated across handlers.
 *
 * Privacy shape, enforced here rather than in each caller:
 *   - only site-relative paths are ever classified (no absolute URLs, no `//host`)
 *   - auth/admin/asset/api paths are NEVER tracked — `classifyPath` returns
 *     `null` and the caller records nothing at all
 */
import { safeTarget } from './links';

/** Categories the activity row and the automation engine understand. */
export type PathCategory = 'course' | 'vault' | 'skill_test' | 'other';

/**
 * Never record a visit to these, whatever the cookie says.
 *
 * Auth pages leak intent (someone's employer-facing attempt), admin is
 * internal traffic, `/_next` and `/api` are machinery rather than pages, and
 * the unsubscribe page is a suppression action — logging it as "interest"
 * would be actively misleading.
 */
const NEVER_TRACK = [
  '/login',
  '/signup',
  '/sign-up',
  '/logout',
  '/admin',
  '/unsubscribe',
  '/_next',
  '/api',
  '/sw.js',
  '/manifest.json',
];

/**
 * Normalize a raw path/query to `pathname + search`, or null if it must not
 * be tracked. `title` is never accepted from the wire as-is by callers that
 * store it; only the path passes through here.
 */
export function sanitizeTrackPath(raw: unknown): string | null {
  const target = safeTarget(raw);
  if (!target) return null;
  let parsed: URL;
  try {
    parsed = new URL(target, 'http://tracking.invalid');
  } catch {
    return null;
  }
  // Drop any identity token the URL still carries: the cookie is the identity,
  // and echoing tokens into stored rows would make the store a token oracle.
  parsed.searchParams.delete('em');
  return parsed.pathname + parsed.search;
}

/** True when a visit to `path` should be recorded at all. */
export function isTrackablePath(path: string): boolean {
  const lower = path.toLowerCase();
  for (const prefix of NEVER_TRACK) {
    if (lower === prefix || lower.startsWith(`${prefix}/`) || lower.startsWith(`${prefix}?`)) {
      return false;
    }
  }
  return true;
}

/**
 * Classify a sanitized path.
 * Returns `null` when the path must never be tracked.
 */
export function classifyPath(path: string): PathCategory | null {
  if (!isTrackablePath(path)) return null;
  const pathname = path.split('?')[0].toLowerCase();
  if (
    pathname === '/courses' || pathname.startsWith('/courses/') ||
    pathname === '/course' || pathname.startsWith('/course/')
  ) {
    return 'course';
  }
  if (pathname === '/company' || pathname.startsWith('/company/')) return 'vault';
  if (pathname === '/skill-test' || pathname.startsWith('/skill-test/')) return 'skill_test';
  return 'other';
}
