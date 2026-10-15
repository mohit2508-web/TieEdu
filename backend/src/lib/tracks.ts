import type { Course, LearningTrack } from '../data/db';
import { completionState, courseAccessState, orderedLessons } from './courses';

/**
 * Learning-track helpers — the one place a track's progress and claimability
 * are decided.
 *
 * A track is complete when EVERY member course reports `is_complete` through
 * the same per-course completion state the course pages use. A member course
 * that is missing from the store (or unpublished) is reported honestly as
 * unavailable and keeps the track unclaimable — the track never silently
 * shrinks to whatever happens to be live today.
 */

export interface TrackCourseState {
  id: string;
  slug: string | null;
  title: string;
  /** False when the member course id does not resolve to a store row. */
  exists: boolean;
  published: boolean;
  is_free: boolean;
  price_inr: number;
  estimated_hours: number | null;
  thumbnail_url: string | null;
  thumbnail_alt: string | null;
  /** Lesson counts across the whole course. */
  completed: number;
  total: number;
  percent: number;
  is_complete: boolean;
  enrolled: boolean;
  /** Access state for a signed-in learner (free courses are always granted). */
  access_granted: boolean;
  /** Machine reason the course is not open to this learner, if any. */
  access_reason: string | null;
}

export interface TrackProgress {
  courses: TrackCourseState[];
  courses_total: number;
  courses_complete: number;
  /** 0–100 across member courses, rounded. */
  percent: number;
  is_complete: boolean;
  /** Titles of member courses that are not complete yet (or unavailable). */
  missing: string[];
  /** Member course ids with no store row — a seeding bug, surfaced honestly. */
  unavailable: string[];
  estimated_hours_total: number | null;
}

export function findTrackBySlug(db: any, slug: string): LearningTrack | null {
  return (
    (db.tracks || []).find(
      (t: LearningTrack) => t && t.slug === slug
    ) || null
  );
}

/** Sum of member-course estimated hours; null when any course has no estimate. */
function trackHours(courses: (Course | null)[]): number | null {
  let total = 0;
  for (const c of courses) {
    if (!c) return null;
    const h = Number(c.estimated_hours);
    if (!Number.isFinite(h) || h <= 0) return null;
    total += h;
  }
  return total > 0 ? total : null;
}

export function trackProgressFor(
  db: any,
  userId: string | null,
  track: LearningTrack
): TrackProgress {
  const rows: TrackCourseState[] = track.course_ids.map((courseId) => {
    const course: Course | undefined = (db.courses || []).find(
      (c: Course) => c && c.id === courseId
    );
    if (!course) {
      return {
        id: courseId,
        slug: null,
        title: 'Coming soon',
        exists: false,
        published: false,
        is_free: true,
        price_inr: 0,
        estimated_hours: null,
        thumbnail_url: null,
        thumbnail_alt: null,
        completed: 0,
        total: 0,
        percent: 0,
        is_complete: false,
        enrolled: false,
        access_granted: false,
        access_reason: 'This course is not available yet.',
      };
    }
    const state = completionState(db, userId, course);
    const access = courseAccessState(db, userId, course);
    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      exists: true,
      published: course.published === true,
      is_free: course.is_free === true,
      price_inr: Math.max(0, Number(course.price_inr) || 0),
      estimated_hours:
        typeof course.estimated_hours === 'number' ? course.estimated_hours : null,
      thumbnail_url: course.thumbnail_url || null,
      thumbnail_alt: course.thumbnail_alt || null,
      completed: state.completed,
      total: state.total,
      percent: state.percent,
      is_complete: state.is_complete,
      enrolled: state.enrolled,
      access_granted: access.granted,
      access_reason: access.reason,
    };
  });

  const total = rows.length;
  const complete = rows.filter((r) => r.is_complete).length;
  const unavailable = rows.filter((r) => !r.exists).map((r) => r.id);

  return {
    courses: rows,
    courses_total: total,
    courses_complete: complete,
    percent: total === 0 ? 0 : Math.round((complete / total) * 100),
    // An empty track is never complete, and an unavailable member blocks the
    // claim the same way an unfinished one does.
    is_complete: total > 0 && complete === total && unavailable.length === 0,
    missing: rows.filter((r) => !r.is_complete).map((r) => r.title),
    unavailable,
    estimated_hours_total: trackHours(
      track.course_ids.map(
        (id) => (db.courses || []).find((c: Course) => c && c.id === id) || null
      )
    ),
  };
}

/**
 * Public card fields for one member course — what the list and detail routes
 * send. Never includes the answer key or lesson bodies.
 */
export function trackCourseCard(course: Course) {
  const lessons = orderedLessons(course);
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    subtitle: course.subtitle || '',
    published: course.published === true,
    is_free: course.is_free === true,
    price_inr: Math.max(0, Number(course.price_inr) || 0),
    estimated_hours:
      typeof course.estimated_hours === 'number' ? course.estimated_hours : null,
    level: course.level || '',
    thumbnail_url: course.thumbnail_url || null,
    thumbnail_alt: course.thumbnail_alt || null,
    lesson_count: lessons.length,
    certificate_tier: course.certificate_tier || null,
  };
}
