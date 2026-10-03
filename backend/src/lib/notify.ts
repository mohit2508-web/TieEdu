/**
 * Portal activity -> student notification.
 *
 * The alternative was wiring `sendPushToUser` into each route by hand, which
 * scatters message copy across a dozen handlers and makes "what does a student
 * get told about" impossible to answer without reading the whole codebase. Here
 * an event is named, the copy lives with the event, and the audience is resolved
 * in one place.
 *
 * Two rules govern every call site:
 *
 *  - A notification is never allowed to fail the action that caused it. Publishing
 *    a course must still succeed when the push provider is down; the delivery
 *    result is logged, not thrown.
 *  - Copy is written to be useful on a lock screen. The body has to say why the
 *    student is being interrupted, not that a system event occurred.
 */

import { loadDb } from '../data/db';
import { sendPushToUsers } from './push';

export type NotifyAudience =
  | { kind: 'all_students' }
  | { kind: 'course'; courseId: string }
  | { kind: 'users'; userIds: string[] };

/**
 * The events a student can be told about. Each is a portal change worth a return
 * visit - a new thing to learn, or a thing they already started and left.
 */
export type NotifyEvent =
  | { type: 'course.published'; title: string; courseId: string; slug?: string }
  | { type: 'vault.updated'; title: string; detail?: string; slug?: string }
  | { type: 'module.added'; title: string; detail?: string; slug?: string };

type Copy = { title: string; body: string; url: string };

/**
 * Reduce a stored slug to something that can only ever be one path segment.
 *
 * Sanitising the finished URL is not enough. A template joins the slug onto a
 * prefix, so `/companies/` + `https://evil.example/steal` yields
 * `/companies/https://evil.example/steal` - which starts with a slash and so
 * passes every check applied to the final string, while carrying a whole second
 * URL inside a segment. Slugs are `[A-Za-z0-9-]` everywhere in this codebase, so
 * anything else is dropped rather than trusted.
 */
const slugPath = (prefix: string, slug?: string): string => {
  const clean = typeof slug === 'string' ? slug.replace(/[^A-Za-z0-9_-]/g, '') : '';
  return clean ? `${prefix}/${clean}` : prefix;
};

/**
 * Message copy per event.
 *
 * `body` is capped short on purpose. Lock-screen truncation is around two lines,
 * and a notification that gets cut off is the same as one that was never read.
 */
const TEMPLATES: Record<NotifyEvent['type'], (e: any) => Copy> = {
  'course.published': (e) => ({
    title: 'New course is live',
    body: e.title,
    url: slugPath('/courses', e.slug),
  }),
  'vault.updated': (e) => ({
    title: e.title,
    body: e.detail || 'New material has been added to the company vault.',
    url: slugPath('/companies', e.slug),
  }),
  'module.added': (e) => ({
    title: 'New material added',
    body: e.detail || e.title,
    url: slugPath('/courses', e.slug),
  }),
};

export const buildCopy = (event: NotifyEvent): Copy => {
  const build = TEMPLATES[event.type];
  if (!build) throw new Error(`No notification template for event "${event.type}"`);
  const copy = build(event);
  return {
    title: copy.title.slice(0, 80),
    body: copy.body.slice(0, 200),
    url: safePath(copy.url),
  };
};

/**
 * Force a notification link to be a plain site path.
 *
 * The obvious check - "does it start with `/`" - is not enough, because a slug
 * comes from stored content and `/companies/https://evil.example` passes it while
 * still carrying a whole second URL inside a path segment. Nothing renders that
 * as a link off-site today, but it makes the stored value ambiguous to whatever
 * handles it next, and the cost of refusing it is nil: slugs are path segments.
 */
const safePath = (url: string): string => {
  if (typeof url !== 'string' || !url.startsWith('/')) return '/';
  // `//host` and `/\\host` are both read as protocol-relative by a browser.
  if (/^[/\\]{2}/.test(url)) return '/';
  if (/^[/\\]?(https?:)?\/\//i.test(url)) return '/';
  return url;
};

/**
 * The accounts an event should reach.
 *
 * "Every student" deliberately means `role === 'user'` and not disabled, matching
 * the one rule the codebase already writes down (`campus.routes.ts:23`). Admins
 * are staff and are reached through the broadcast tab, not by accident. Disabled
 * accounts are skipped rather than retired: a disabled account is still a real
 * row, and blocking their push is a separate concern.
 */
export const resolveAudience = (audience: NotifyAudience): string[] => {
  const db = loadDb();
  const students = (db.users || []).filter((u: any) => u && u.role === 'user' && !u.disabled);
  const ids = students.map((u: any) => u.id as string);

  if (audience.kind === 'users') {
    // Intersect rather than trusting the caller, so a crafted id cannot make the
    // platform notify a disabled account or an admin.
    const allowed = new Set(ids);
    return Array.from(new Set(audience.userIds || [])).filter((id) => allowed.has(id));
  }
  if (audience.kind === 'course') {
    const progress = (db.course_progress || {}) as Record<string, Record<string, any>>;
    return Object.keys(progress).filter((userId) => {
      if (!progress[userId]?.[audience.courseId]) return false;
      return allowedUser(ids, userId);
    });
  }
  return ids;
};

const allowedUser = (ids: string[], userId: string): boolean => ids.includes(userId);

export type NotifyResult = {
  sent: number;
  failed: number;
  recipients: number;
  endpoints: number;
  skipped: number;
  error?: string;
};

/**
 * Tell an audience about an event.
 *
 * Never throws. Callers are route handlers in the middle of a state change that
 * has already been committed to the ledger, and a push provider outage is not a
 * reason to fail an admin's publish. The result is returned so the caller can log
 * or report it, and the caller decides.
 */
export const notifyEvent = async (
  event: NotifyEvent,
  audience: NotifyAudience
): Promise<NotifyResult> => {
  try {
    const userIds = resolveAudience(audience);
    if (!userIds.length) return { sent: 0, failed: 0, recipients: 0, endpoints: 0, skipped: 0 };
    const copy = buildCopy(event);
    const r = await sendPushToUsers(userIds, copy);
    return { ...r, skipped: userIds.length - r.recipients };
  } catch (e: any) {
    console.warn('[Notify] delivery failed for', event.type, e?.message);
    return { sent: 0, failed: 0, recipients: 0, endpoints: 0, skipped: 0, error: e?.message };
  }
};
