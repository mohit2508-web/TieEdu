// ============================================================================
// COURSE CATALOGUE — filtering, sorting, faceting and pagination.
//
// The rule this file exists to enforce: a number shown on a course card must be
// COUNTED FROM STORED STATE, never invented. There is no `rating` column and no
// `enrollment_count` column on a course, and that is deliberate. Both are
// derived here from the records the platform already keeps:
//
//   * a rating is the mean of `db.course_feedback` rows, and feedback is only
//     accepted once the learner has genuinely completed the course, so every
//     rating belongs to somebody who finished it;
//   * an enrolment is a `db.course_progress` row, which is created by
//     POST /:slug/enroll and is therefore a real act of signing up.
//
// A course with no feedback has `rating_count: 0` and the UI is expected to
// render no star at all rather than a 0.0 or a made-up 4.8. Fabricating social
// proof on a product whose pitch is "the time you put in is checked rather than
// assumed" would be self-refuting, so there is deliberately no fallback figure.
//
// `lib/courses.ts` holds the security-critical completion and access rules. This
// file is read-only shape: it can only ever narrow or reorder what that file
// already permits, and it never writes.
// ============================================================================

import { Course, CourseFeedback, CourseProgress } from '../data/db';
import { courseStats } from './courses';

// ---------------------------------------------------------------------------
// Public filter / sort vocabulary
// ---------------------------------------------------------------------------

export const CATALOG_SORTS = [
  { key: 'popular', label: 'Most popular' },
  { key: 'newest', label: 'Newest first' },
  { key: 'rating', label: 'Highest rated' },
  { key: 'az', label: 'Course A-Z' },
  { key: 'za', label: 'Course Z-A' },
] as const;

export type CatalogSort = (typeof CATALOG_SORTS)[number]['key'];

export function isCatalogSort(value: unknown): value is CatalogSort {
  return CATALOG_SORTS.some((s) => s.key === value);
}

export const CATALOG_PAGE_SIZE = 20;

/** The filter dimensions the catalogue actually has data for. */
export type CatalogFilterKey = 'category' | 'tag' | 'type' | 'level';

export const CATALOG_FILTER_GROUPS = [
  { key: 'category', label: 'Category', param: 'category' },
  { key: 'tag', label: 'Topic', param: 'tag' },
  { key: 'type', label: 'Course type', param: 'type' },
  { key: 'level', label: 'Course level', param: 'level' },
] as const;

export interface CatalogQuery {
  q: string;
  category: string[];
  tag: string[];
  type: string[];
  level: string[];
  sort: CatalogSort;
  page: number;
  pageSize: number;
}

function toList(value: unknown): string[] {
  // Accepts both `?tag=a&tag=b` and `?tag=a,b` so a hand-typed URL behaves.
  const raw = Array.isArray(value) ? value : value === undefined ? [] : [value];
  return Array.from(
    new Set(
      raw
        .flatMap((v) => String(v).split(','))
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

/** Parse and clamp an incoming request. Bad input narrows nothing; it never widens. */
export function parseCatalogQuery(query: Record<string, unknown>): CatalogQuery {
  const sortRaw = String(query.sort || '').trim().toLowerCase();
  const pageRaw = Number(query.page);
  const sizeRaw = Number(query.page_size);

  return {
    q: String(query.q || '').trim().toLowerCase().slice(0, 120),
      category: toList(query.category),
      tag: toList(query.tag),
      // Raw tokens are kept rather than filtered down to the two valid ones.
      //
      // Dropping an unrecognised value silently turns `?type=theory` into "no
      // type filter at all", so the page answers with the whole catalogue while
      // the URL claims a filter is active — the exact symptom of a filter that
      // "does not work". Keeping the token lets it match no course, the same way
      // an unknown `level` already behaves, so all four groups answer alike.
      type: toList(query.type),
    level: toList(query.level),
    sort: isCatalogSort(sortRaw) ? sortRaw : 'popular',
    page: Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1,
    // Capped so a hand-typed `page_size=100000` cannot ask for the whole table.
    pageSize: Number.isFinite(sizeRaw) && sizeRaw >= 1 ? Math.min(Math.floor(sizeRaw), 50) : CATALOG_PAGE_SIZE,
  };
}

// ---------------------------------------------------------------------------
// Derived signals
// ---------------------------------------------------------------------------

/** A course the catalogue card needs numbers for. */
export interface CourseSignals {
  /** Mean of 1-5 learner ratings, or null when nobody has rated it yet. */
  rating_avg: number | null;
  rating_count: number;
  /** Share of reviewers who would recommend, or null when there is no data. */
  recommend_percent: number | null;
  /** Real enrolment records, i.e. learners who actually pressed enrol. */
  enrollment_count: number;
  /** Learners who got to the end. Distinct from enrolment — nobody is promised a completion rate. */
  completion_count: number;
}

function indexProgressByCourse(db: any): Map<string, CourseProgress[]> {
  const byCourse = new Map<string, CourseProgress[]>();
  const progress = db.course_progress || {};
  for (const userId of Object.keys(progress)) {
    const perCourse = progress[userId] || {};
    for (const courseId of Object.keys(perCourse)) {
      const row = perCourse[courseId];
      if (!row) continue;
      const list = byCourse.get(courseId) || [];
      list.push(row);
      byCourse.set(courseId, list);
    }
  }
  return byCourse;
}

function indexFeedbackByCourse(db: any): Map<string, CourseFeedback[]> {
  const byCourse = new Map<string, CourseFeedback[]>();
  for (const fb of db.course_feedback || []) {
    const list = byCourse.get(fb.course_id) || [];
    list.push(fb);
    byCourse.set(fb.course_id, list);
  }
  return byCourse;
}

/**
 * Build the derived numbers for every published course in one pass.
 *
 * Done as a single sweep rather than per-course lookups because the catalogue
 * card needs this for every course it might render, and the alternative is an
 * O(courses x users) scan on every request.
 */
export function courseSignalsFor(db: any, courses: Course[]): Map<string, CourseSignals> {
  const progressIndex = indexProgressByCourse(db);
  const feedbackIndex = indexFeedbackByCourse(db);
  const out = new Map<string, CourseSignals>();

  for (const course of courses) {
    const progressRows = progressIndex.get(course.id) || [];
    const feedbackRows = feedbackIndex.get(course.id) || [];

    const ratings = feedbackRows.map((f) => Number(f.rating)).filter((n) => n >= 1 && n <= 5);
    const ratingCount = ratings.length;
    const sum = ratings.reduce((a, b) => a + b, 0);

    out.set(course.id, {
      // One decimal place. A mean of 4.666 should not be rendered as 4.67 stars.
      rating_avg: ratingCount > 0 ? Math.round((sum / ratingCount) * 10) / 10 : null,
      rating_count: ratingCount,
      recommend_percent:
        ratingCount > 0
          ? Math.round((feedbackRows.filter((f) => f.would_recommend).length / ratingCount) * 100)
          : null,
      enrollment_count: progressRows.length,
      completion_count: progressRows.filter((p) => !!p.completed_at).length,
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// Badges — derived, never hand-set
// ---------------------------------------------------------------------------

export type CourseBadge = 'new' | 'popular' | 'in_progress';

export interface CourseBadges {
  badges: CourseBadge[];
  is_new: boolean;
  is_popular: boolean;
}

/** A course counts as new for this long after it was published. */
export const NEW_COURSE_WINDOW_DAYS = 45;

/**
 * Derive the card badges from dates and real enrolment counts.
 *
 * There is no `is_trending` flag to set by hand. "Popular" means the course has
 * at least `POPULAR_MIN_ENROLMENTS` learners AND is in the top quartile of
 * enrolment across the catalogue — so the badge cannot drift away from reality
 * or be pinned onto a course nobody has opened.
 */
export const POPULAR_MIN_ENROLMENTS = 5;

export function courseBadges(
  course: Course,
  signals: CourseSignals,
  options: { topQuartile: boolean; now?: number }
): CourseBadges {
  const now = options.now ?? Date.now();
  const createdAt = Date.parse(course.created_at || '') || 0;
  const ageDays = createdAt > 0 ? (now - createdAt) / 86_400_000 : Number.POSITIVE_INFINITY;

  const isNew = createdAt > 0 && ageDays >= 0 && ageDays <= NEW_COURSE_WINDOW_DAYS;
  const isPopular = options.topQuartile && signals.enrollment_count >= POPULAR_MIN_ENROLMENTS;

  return { badges: [...(isNew ? ['new' as const] : []), ...(isPopular ? ['popular' as const] : [])], is_new: isNew, is_popular: isPopular };
}

/**
 * Courses at or above this share of the busiest course are "top quartile".
 * With 3 courses all at zero enrolments this returns an empty set, which is the
 * honest answer: nobody has enrolled anywhere yet.
 */
function popularCourseIds(signals: Map<string, CourseSignals>, courses: Course[]): Set<string> {
  const counts = courses.map((c) => signals.get(c.id)?.enrollment_count ?? 0);
  const max = Math.max(0, ...counts);
  if (max <= 0) return new Set();
  return new Set(
    courses.filter((c) => (signals.get(c.id)?.enrollment_count ?? 0) >= max * 0.5).map((c) => c.id)
  );
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

export function isFreeCourse(course: Course): boolean {
  return course.is_free === true || (Number(course.price_inr) || 0) === 0;
}

function matchesQuery(course: Course, needle: string): boolean {
  // Lowercased here as well as in `parseCatalogQuery`. `filterCourses` is
  // exported and callable with a hand-built query, and a case-sensitive
  // haystack comparison against an un-normalised needle would silently return
  // nothing for "Python".
  const n = (needle || '').trim().toLowerCase();
  if (!n) return true;
  return [
    course.title,
    course.subtitle,
    course.description || '',
    course.category,
    ...(course.tags || []),
  ]
    .join(' ')
    .toLowerCase()
    .includes(n);
}

/**
 * Within a facet group the values are OR-ed (pick Python *or* C); across groups
 * they are AND-ed (free *and* beginner). That is the convention every catalogue
 * uses and the one people expect without being told.
 */
export function filterCourses(courses: Course[], query: CatalogQuery): Course[] {
  return courses.filter((course) => {
    if (!matchesQuery(course, query.q)) return false;
    if (query.category.length && !query.category.includes((course.category || '').toLowerCase())) return false;
    if (query.level.length && !query.level.includes((course.level || '').toLowerCase())) return false;
    if (query.type.length) {
      const kind: 'free' | 'paid' = isFreeCourse(course) ? 'free' : 'paid';
      if (!query.type.includes(kind)) return false;
    }
    if (query.tag.length) {
      const tags = (course.tags || []).map((t) => t.toLowerCase());
      if (!query.tag.some((t) => tags.includes(t))) return false;
    }
    return true;
  });
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

export interface SortableCourse {
  course: Course;
  signals: CourseSignals;
  /** The signed-in learner's own state, used to float open courses to the top. */
  inProgress: boolean;
}

export function sortCourses(rows: SortableCourse[], sort: CatalogSort): SortableCourse[] {
  const byTitle = (a: SortableCourse, b: SortableCourse) => a.course.title.localeCompare(b.course.title);

  return rows.slice().sort((a, b) => {
    // A learner mid-way through a course always sees it first, whatever they
    // sorted by. Being able to resume is not a sort preference.
    if (a.inProgress !== b.inProgress) return a.inProgress ? -1 : 1;

    switch (sort) {
      case 'newest': {
        const at = Date.parse(a.course.created_at || '') || 0;
        const bt = Date.parse(b.course.created_at || '') || 0;
        if (at !== bt) return bt - at;
        return byTitle(a, b);
      }
      case 'rating': {
        // Unrated courses sort last rather than being treated as 0-star, which
        // would bury a brand new course under every course with one review.
        const ar = a.signals.rating_avg;
        const br = b.signals.rating_avg;
        if (ar === null && br === null) return b.signals.rating_count - a.signals.rating_count || byTitle(a, b);
        if (ar === null) return 1;
        if (br === null) return -1;
        if (ar !== br) return br - ar;
        if (a.signals.rating_count !== b.signals.rating_count) return b.signals.rating_count - a.signals.rating_count;
        return byTitle(a, b);
      }
      case 'az':
        return byTitle(a, b);
      case 'za':
        return -byTitle(a, b);
      case 'popular':
      default: {
        if (a.signals.enrollment_count !== b.signals.enrollment_count) {
          return b.signals.enrollment_count - a.signals.enrollment_count;
        }
        // Free before paid, then alphabetical — a stable, explainable order.
        const af = isFreeCourse(a.course);
        const bf = isFreeCourse(b.course);
        if (af !== bf) return af ? -1 : 1;
        return byTitle(a, b);
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Facets
// ---------------------------------------------------------------------------

export interface FacetOption {
  key: string;
  label: string;
  count: number;
}

export interface CatalogFacets {
  category: FacetOption[];
  tag: FacetOption[];
  type: FacetOption[];
  level: FacetOption[];
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

/**
 * Count each facet value over the set of courses that pass every OTHER filter.
 *
 * This is what makes a count trustworthy: with `level=beginner` selected, the
 * topic counts show what selecting each topic would actually yield alongside
 * that level, rather than a global total that leads to an empty result page.
 * The value's own group is deliberately not self-narrowing, so a learner can
 * widen a selection instead of only being able to shrink it.
 */
export function buildFacets(courses: Course[], query: CatalogQuery): CatalogFacets {
  /**
   * Count one dimension's values across a set of courses.
   * `valuesOf` extracts the raw labels for a single course.
   *
   * `key` is lowercased because that is what a URL filter matches on, while
   * `label` keeps the author's original casing so the rail does not render
   * "computer science" where the course says "Computer Science".
   */
  const countBy = (set: Course[], valuesOf: (c: Course) => string[]): FacetOption[] => {
    const counts = new Map<string, { count: number; label: string }>();
    for (const course of set) {
      for (const raw of valuesOf(course)) {
        const key = raw.trim().toLowerCase();
        if (!key) continue;
        const existing = counts.get(key);
        if (existing) existing.count += 1;
        else counts.set(key, { count: 1, label: raw.trim() });
      }
    }
    return Array.from(counts.entries())
      .map(([key, v]) => ({ key, label: v.label, count: v.count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  };

  const othersApplied = (skip: CatalogFilterKey) => {
    const narrowed: CatalogQuery = { ...query };
    if (skip === 'category') narrowed.category = [];
    if (skip === 'tag') narrowed.tag = [];
    if (skip === 'type') narrowed.type = [];
    if (skip === 'level') narrowed.level = [];
    return filterCourses(courses, narrowed);
  };

  const typesFor = filterCourses(othersApplied('type'), { ...query, type: [] });
  const typeCounts = { free: 0, paid: 0 };
  for (const c of typesFor) typeCounts[isFreeCourse(c) ? 'free' : 'paid'] += 1;

  const levelCounts = new Map<string, number>();
  for (const c of filterCourses(othersApplied('level'), { ...query, level: [] })) {
    const key = (c.level || '').toLowerCase();
    if (key) levelCounts.set(key, (levelCounts.get(key) || 0) + 1);
  }

  return {
    category: countBy(othersApplied('category'), (c) => [c.category || '']),
    tag: countBy(othersApplied('tag'), (c) => c.tags || []),
    type: [
      { key: 'free', label: 'Free', count: typeCounts.free },
      { key: 'paid', label: 'Paid', count: typeCounts.paid },
    ],
    level: Array.from(levelCounts.entries())
      .map(([key, count]) => ({ key, label: LEVEL_LABELS[key] || key, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
  };
}

// ---------------------------------------------------------------------------
// The whole pipeline
// ---------------------------------------------------------------------------

export interface CatalogResult<T> {
  rows: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
  facets: CatalogFacets;
}

/**
 * Signals plus the learner's own state for one course, in the shape the card
 * consumes. `progress` is null when nobody is signed in.
 */
export function catalogEntry(
  course: Course,
  signals: CourseSignals,
  badges: CourseBadges
) {
  return {
    signals,
    badges: badges.badges,
    is_new: badges.is_new,
    is_popular: badges.is_popular,
    stats: courseStats(course),
  };
}

/**
 * Filter -> sort -> paginate -> facet, in that order.
 *
 * Facets are computed from the pre-pagination filtered set, so the counts a
 * learner sees describe the whole result set and not just the current page.
 */
export function runCatalog<T>(
  db: any,
  allCourses: Course[],
  query: CatalogQuery,
  decorate: (course: Course, signals: CourseSignals, badges: CourseBadges) => T,
  opts: { isInProgress?: (course: Course) => boolean; now?: number } = {}
): CatalogResult<T> {
  const filtered = filterCourses(allCourses, query);
  const facets = buildFacets(allCourses, query);
  // Signals are swept once over the whole published set. Computing them per
  // filtered subset would mean walking every learner's progress rows a second
  // time just to decide the "popular" badge.
  const allSignals = courseSignalsFor(db, allCourses);
  const top = popularCourseIds(allSignals, allCourses);

  const sorted = sortCourses(
    filtered.map((course) => ({
      course,
      signals: allSignals.get(course.id) || emptySignals(),
      inProgress: opts.isInProgress?.(course) === true,
    })),
    query.sort
  );

  const start = (query.page - 1) * query.pageSize;
  const slice = sorted.slice(start, start + query.pageSize);

  return {
    rows: slice.map(({ course, signals: s }) =>
      decorate(course, s, courseBadges(course, s, { topQuartile: top.has(course.id), now: opts.now }))
    ),
    total: sorted.length,
    page: query.page,
    page_size: query.pageSize,
    has_more: start + slice.length < sorted.length,
    facets,
  };
}

export function emptySignals(): CourseSignals {
  return {
    rating_avg: null,
    rating_count: 0,
    recommend_percent: null,
    enrollment_count: 0,
    completion_count: 0,
  };
}

// ---------------------------------------------------------------------------
// Related courses
// ---------------------------------------------------------------------------

/**
 * Sibling courses for the detail page, ranked by shared vocabulary.
 *
 * Scored on shared tags first because a learner who just finished C and lands
 * on a C-adjacent course is far more likely to keep going than one who lands on
 * an unrelated course that happens to share a difficulty level.
 */
export function relatedCourses(source: Course, all: Course[], limit = 4): Course[] {
  const sourceTags = new Set((source.tags || []).map((t) => t.toLowerCase()));

  return all
    .filter((c) => c.id !== source.id)
    .map((course) => {
      const tags = (course.tags || []).map((t) => t.toLowerCase());
      const shared = tags.filter((t) => sourceTags.has(t)).length;
      // Topical overlap is the gate, and shared difficulty alone does not
      // qualify: a cooking course and a C course are both "beginner", and
      // recommending one after the other is worse than recommending nothing.
      // Category is accepted as a second, weaker signal because TieEdu
      // legitimately keeps several courses inside one broad category.
      const sameCategory = course.category === source.category;
      if (shared === 0 && !sameCategory) return null;

      let score = shared * 3;
      if (sameCategory) score += 2;
      if (course.level === source.level) score += 1;
      return { course, score };
    })
    .filter((r): r is { course: Course; score: number } => r !== null)
    .sort((a, b) => b.score - a.score || a.course.title.localeCompare(b.course.title))
    .slice(0, limit)
    .map((r) => r.course);
}
