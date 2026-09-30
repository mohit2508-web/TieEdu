/**
 * The server-render decision for a course page, as a pure function.
 *
 * A paid course's detail endpoint answers 403 to an anonymous caller. That refusal
 * is deliberate and asserted in the backend smoke suite, so the page must not route
 * around it. What it can do is ask the *public catalogue* — a genuinely public
 * endpoint that needs no token — for the single row describing that course, and
 * render that. The result is an indexable page that says something true, instead of
 * a spinner that a crawler sees as an empty shell.
 *
 * Two things make this worth pulling out of `getServerSideProps` rather than
 * inlining it there:
 *
 *  1. It is a decision table. Which upstream status leads to a 404, which to a
 *     preview, and which to "hand it to the client and let it retry" is exactly the
 *     kind of logic that regresses silently, and it can be tested with no server,
 *     no fetch and no React.
 *  2. The preview is built by picking fields, not by picking the response. If it
 *     were `return the catalogue row`, then any field the catalogue ever grows -
 *     a lesson body, a quiz, an instructor - would be published into the HTML of
 *     every paid course the moment it was added, with nothing to fail a test. The
 *     whitelist below is the boundary, and it is a whitelist on purpose.
 */

/** The public, non-lesson facts about a course. Nothing that teaches anything. */
export type PublicCoursePreview = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  category: string | null;
  level: string | null;
  is_free: boolean;
  price_inr: number;
  thumbnail_url: string | null;
  tags: string[];
  outcomes: string[];
  certificate_eligible: boolean;
  created_at: string | null;
  is_new: boolean;
  is_popular: boolean;
  stats: {
    module_count: number;
    lesson_count: number;
    total_minutes: number;
    total_xp: number;
    quiz_count: number;
    video_count: number;
  } | null;
};

/**
 * Fields copied from a catalogue row. Anything absent is simply not published;
 * there is no pass-through, so a new API field is private by default.
 *
 * `signals` and `badges` are deliberately excluded even though they are public:
 * they are derived marketing claims (ratings, enrolment counts) that are null or
 * zero on a fresh course, and rendering "0 ratings" or an empty "popular" badge is
 * noise. `access` and `progress` are per-learner and never belong in shared HTML.
 */
const PREVIEW_FIELDS = [
  'id',
  'slug',
  'title',
  'subtitle',
  'description',
  'category',
  'level',
  'is_free',
  'price_inr',
  'thumbnail_url',
  'tags',
  'outcomes',
  'certificate_eligible',
  'created_at',
  'is_new',
  'is_popular',
  'stats',
] as const;

const str = (v: unknown): string | null => (typeof v === 'string' && v.length ? v : null);
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const bool = (v: unknown): boolean => v === true;

/**
 * Reduce a catalogue row to the fields that are safe to publish for a course the
 * anonymous viewer has not paid for. Returns null for anything that is not a
 * course row, so a malformed catalogue cannot produce a blank page.
 */
export function toPublicCoursePreview(row: unknown): PublicCoursePreview | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const slug = str(r.slug);
  const title = str(r.title);
  // A row with no slug cannot be matched to a request, and one with no title has
  // nothing to put in a <title> tag. Both mean this is not a usable course.
  if (!slug || !title) return null;

  const s = (r.stats && typeof r.stats === 'object' ? r.stats : {}) as Record<string, unknown>;
  const stats =
    r.stats && typeof r.stats === 'object'
      ? {
          module_count: num(s.module_count),
          lesson_count: num(s.lesson_count),
          total_minutes: num(s.total_minutes),
          total_xp: num(s.total_xp),
          quiz_count: num(s.quiz_count),
          video_count: num(s.video_count),
        }
      : null;

  const out: Record<string, unknown> = {};
  for (const field of PREVIEW_FIELDS) out[field] = r[field];
  // Explicit values, so the shape is stable and a missing field is a sane default
  // rather than `undefined` leaking into props.
  return {
    id: str(r.id) || slug,
    slug,
    title,
    subtitle: str(r.subtitle),
    description: str(r.description),
    category: str(r.category),
    level: str(r.level),
    is_free: bool(r.is_free),
    price_inr: num(r.price_inr),
    thumbnail_url: str(r.thumbnail_url),
    tags: strList(r.tags),
    outcomes: strList(r.outcomes),
    certificate_eligible: bool(r.certificate_eligible),
    created_at: str(r.created_at),
    is_new: bool(r.is_new),
    is_popular: bool(r.is_popular),
    stats,
  } as PublicCoursePreview;
}

/** The catalogue row for this slug, reduced to publishable fields, or null. */
export function findPublicCoursePreview(catalogue: unknown, slug: string): PublicCoursePreview | null {
  if (!Array.isArray(catalogue) || !slug) return null;
  const row = catalogue.find((c) => c && typeof c === 'object' && (c as { slug?: unknown }).slug === slug);
  return toPublicCoursePreview(row);
}

export type CoursePageDecision =
  | { kind: 'notFound' }
  | { kind: 'render'; course: unknown; preview: PublicCoursePreview | null };

/**
 * Decide what a course page should do, given what the API said.
 *
 * - `course` present  -> render it. A 200 always means the caller may see it.
 * - 404                -> a real 404, so a crawler drops the page.
 * - 403                -> a paid course the viewer has not bought. Render the
 *                         catalogue preview, or nothing if the catalogue does not
 *                         describe it; either way the client still asks for the
 *                         detail itself once it knows who the viewer is.
 * - anything else      -> an outage, a 5xx, or no answer at all. Render a shell and
 *                         let the client retry.
 *
 * The distinction that matters most: a 404 is only a 404 when a *reachable* API
 * actually said so. Turning "the backend was restarting" into a 404 is a permanent
 * verdict on a course that exists, and crawlers are entitled to cache it.
 */
export function decideCoursePage(input: {
  upstreamStatus: number | null;
  course: unknown;
  catalogue?: unknown;
  slug: string;
}): CoursePageDecision {
  const { upstreamStatus, course, catalogue, slug } = input;
  if (course) return { kind: 'render', course, preview: null };
  if (upstreamStatus === 404) return { kind: 'notFound' };
  if (upstreamStatus === 403) return { kind: 'render', course: null, preview: findPublicCoursePreview(catalogue, slug) };
  // A 200 that carried no course is the API contradicting itself. Rendering an
  // empty shell and letting the client retry is safer than a 404, because the
  // detail may well be there on the second ask.
  return { kind: 'render', course: null, preview: null };
}
