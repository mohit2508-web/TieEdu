import type { CourseDetail, CourseLessonView, LessonCompletionState } from '@/types';

/**
 * Where a lesson-completion heartbeat lands in the page — Phase 4,
 * MOBILE_APP_UI_PLAN.md §4.
 *
 * `reportLessonProgress` answers with the authoritative `LessonCompletionState`
 * *and* the refreshed course progress. The page used to apply only the second
 * half, which made the single most important beat in a lesson invisible: the
 * heartbeat that crosses the watch threshold. The server said `is_complete:
 * true`, the page kept the stale `false`, and so the completion banner never
 * appeared and the Next-lesson bar stayed disabled until some unrelated event
 * triggered a full course refetch. The one action that earns credit produced no
 * visible change at all.
 *
 * Extracted as a pure function because the failure was silent and the code lives
 * in a page component where nothing can assert on it. `lessons` are nested under
 * `modules`, so the state has to be written back into the tree the flat outline
 * is derived from, or the syllabus keeps showing the lesson as untouched while
 * the player says it is done.
 */

const sameId = (a: unknown, b: unknown) => String(a) === String(b);

/**
 * Patch one lesson's state into a course payload.
 *
 * Ids are compared as strings: the API is not consistent about whether an id
 * arrives as a number or a string, and `'12' === 12` is false, so a strict
 * comparison would silently skip the update for exactly the ids that look
 * numeric.
 */
export function applyLessonState<T extends CourseDetail>(
  course: T | null,
  lessonId: number | string | undefined,
  state: LessonCompletionState
): T | null {
  if (!course || lessonId === undefined) return course;

  const matches = (l: CourseLessonView) => sameId(l.id, lessonId);
  let touched = false;

  const modules = course.modules.map((m) => {
    const lessons = (m.lessons || []).map((l) => {
      if (!matches(l)) return l;
      touched = true;
      return { ...l, state };
    });
    return lessons === m.lessons ? m : { ...m, lessons };
  });

  // Returning the same object when nothing matched matters: `useMemo` and
  // `React.memo` downstream both key on identity, and returning a fresh copy on
  // every heartbeat would re-render the whole course page every 15 seconds to
  // display an identical one.
  return touched ? { ...course, modules } : course;
}
