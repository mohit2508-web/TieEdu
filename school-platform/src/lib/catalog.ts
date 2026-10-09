import type { CourseLevel } from '@prisma/client';

/**
 * Pure catalog helpers (Phase 2, spec §5).
 *
 * Everything here is free of Prisma/DB access so the rules that actually matter
 * — slug generation, query parsing, filter matching and the publish gate — can
 * be proven by `catalog.test.ts` without a database.
 */

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export const LEVELS: CourseLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
export const MAX_PAGE_SIZE = 48;
export const DEFAULT_PAGE_SIZE = 12;

export interface CatalogQuery {
  track?: string;
  level?: CourseLevel;
  grade?: number;
  q?: string;
  page: number;
  pageSize: number;
  sort: 'newest' | 'title';
}

/** Parse + clamp untrusted search params into a safe query object. */
export function parseCatalogQuery(params: URLSearchParams): CatalogQuery {
  const raw = (key: string) => (params.get(key) ?? '').trim();

  const level = raw('level').toUpperCase() as CourseLevel;
  const gradeNum = Number.parseInt(raw('grade'), 10);
  const page = Number.parseInt(raw('page'), 10);
  const pageSize = Number.parseInt(raw('pageSize'), 10);

  return {
    track: raw('track') ? slugify(raw('track')) : undefined,
    level: LEVELS.includes(level) ? level : undefined,
    grade: Number.isFinite(gradeNum) && gradeNum >= 3 && gradeNum <= 12 ? gradeNum : undefined,
    q: raw('q') ? raw('q').slice(0, 80) : undefined,
    page: Number.isFinite(page) && page >= 1 ? page : 1,
    pageSize:
      Number.isFinite(pageSize) && pageSize >= 1 ? Math.min(pageSize, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE,
    sort: raw('sort') === 'title' ? 'title' : 'newest',
  };
}

export interface FilterableCourse {
  title: string;
  summary?: string | null;
  tags: string[];
  skillTrack?: { slug: string } | null;
  level: CourseLevel;
  gradeMin: number;
  gradeMax: number;
}

/** In-memory equivalent of the DB `where` clause, used for unit tests. */
export function matchesFilters(course: FilterableCourse, query: CatalogQuery): boolean {
  if (query.track && course.skillTrack?.slug !== query.track) return false;
  if (query.level && course.level !== query.level) return false;
  if (query.grade != null && (query.grade < course.gradeMin || query.grade > course.gradeMax)) return false;
  if (query.q) {
    const needle = query.q.toLowerCase();
    const haystack = [course.title, course.summary ?? '', ...course.tags].join(' ').toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Publish gate. A course can only go live when it is presentable. Returns a
// list of stable problem codes (empty array === publishable).
// ---------------------------------------------------------------------------

export interface PublishableLesson {
  title: string;
}

export interface PublishableModule {
  lessons: PublishableLesson[];
}

export interface PublishableCourse {
  title: string;
  skillTrackId?: string | null;
  gradeMin: number;
  gradeMax: number;
  modules: PublishableModule[];
}

export type PublishProblem =
  | 'no_title'
  | 'no_track'
  | 'invalid_grade_range'
  | 'no_modules'
  | 'module_without_lessons'
  | 'lesson_without_title';

export function validateForPublish(course: PublishableCourse): PublishProblem[] {
  const problems: PublishProblem[] = [];
  if (!course.title.trim()) problems.push('no_title');
  if (!course.skillTrackId) problems.push('no_track');
  if (course.gradeMin < 3 || course.gradeMax > 12 || course.gradeMin > course.gradeMax) {
    problems.push('invalid_grade_range');
  }
  if (course.modules.length === 0) problems.push('no_modules');
  if (course.modules.some((m) => m.lessons.length === 0)) problems.push('module_without_lessons');
  if (course.modules.some((m) => m.lessons.some((l) => !l.title.trim()))) problems.push('lesson_without_title');
  return problems;
}

export function isPublishable(course: PublishableCourse): boolean {
  return validateForPublish(course).length === 0;
}
