/**
 * Lesson-completion heartbeat tests — Phase 4, MOBILE_APP_UI_PLAN.md §4.
 *
 * "Completion writes immediately and advances" is the requirement, and it failed
 * silently: `reportLessonProgress` answers with the authoritative
 * `LessonCompletionState`, and the page applied only the course-level
 * `progress`. The heartbeat that crosses the watch threshold — the one that
 * earns the credit, the last thing a student does in a lesson — therefore
 * changed nothing on screen. No banner, and a Next-lesson bar that stayed
 * disabled until some unrelated event triggered a full course refetch.
 *
 * Nothing caught it because the state was dropped inside a page component. The
 * logic is extracted so it can be asserted on, and these tests pin the three
 * things that made it possible to get wrong: the nested lesson tree, the
 * string/number id mismatch, and a late response landing on the wrong lesson.
 */
import { applyLessonState } from '../src/lib/lessonProgress';
import type { CourseDetail, CourseLessonView, LessonCompletionState } from '../src/types';

let pass = 0;
let fail = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    pass += 1;
  } catch (err: any) {
    fail += 1;
    console.error(`FAIL  ${name}\n      ${err?.message}`);
  }
}
function eq(actual: unknown, expected: unknown, note = '') {
  if (actual !== expected) {
    throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}${note ? ` — ${note}` : ''}`);
  }
}

const state = (over: Partial<LessonCompletionState> = {}): LessonCompletionState =>
  ({
    has_video: true, has_quiz: false, video_percent: 0, video_ok: false,
    video_watched_seconds: 0, video_duration_seconds: 0, video_position_seconds: 0,
    quiz_best_percent: null, quiz_ok: false, read_percent: 0, read_ok: false,
    ready: false, is_complete: false, requirements: [], watch_required_percent: 90,
    ...over,
  }) as LessonCompletionState;

const lesson = (id: number | string, over: Partial<CourseLessonView> = {}): CourseLessonView =>
  ({ id, sort_order: 0, title: `Lesson ${id}`, state: state(), ...over }) as unknown as CourseLessonView;

const course = (lessons: CourseLessonView[]): CourseDetail =>
  ({ id: 'c', slug: 'c', title: 'C', modules: [{ id: 'm1', title: 'M1', lessons }] }) as unknown as CourseDetail;

const stateOf = (c: CourseDetail | null, id: number | string) =>
  c!.modules[0].lessons.find((l) => String(l.id) === String(id))?.state;

check('the completion beat reaches the lesson it belongs to', () => {
  const c = course([lesson(1), lesson(2), lesson(3)]);
  const done = state({ is_complete: true, video_ok: true, video_percent: 100 });
  const next = applyLessonState(c, 2, done);

  eq(stateOf(next, 2)?.is_complete, true, 'the finished lesson is complete');
  eq(stateOf(next, 1)?.is_complete, false, 'its neighbours are untouched');
  eq(stateOf(next, 3)?.is_complete, false, 'and so is the one after');
});

check('the outline sees the completion, not just the player', () => {
  /*
   * The lesson rows are nested under `modules`; the flat outline the syllabus
   * renders is derived from them. Patching a flat list instead leaves the player
   * saying "complete" and the outline still showing an open tick.
   */
  const c = course([lesson(1), lesson(2)]);
  const next = applyLessonState(c, 1, state({ is_complete: true }));
  eq(stateOf(next, 1)?.is_complete, true, 'written back into the nested tree');
});

check('a numeric id and a string id are the same lesson', () => {
  // The API is not consistent about id types, and `'12' === 12` is false, so a
  // strict comparison would skip the update for exactly the ids that look
  // numeric — and fail silently, with the same symptom as the original bug.
  const c = course([lesson(12)]);
  const asString = applyLessonState(c, '12', state({ is_complete: true }));
  eq(stateOf(asString, 12)?.is_complete, true, 'string id against a numeric lesson');

  const asNumber = applyLessonState(course([lesson('12')]), 12, state({ is_complete: true }));
  eq(stateOf(asNumber, '12')?.is_complete, true, 'numeric id against a string lesson');
});

check('a heartbeat that lands after navigating does not mark the wrong lesson', () => {
  // A heartbeat is a network round-trip. If the student taps "Next lesson" while
  // one is in flight, applying the response to whatever is now on screen would
  // complete a lesson they have not watched.
  const c = course([lesson(1), lesson(2)]);
  const next = applyLessonState(c, 1, state({ is_complete: true }));
  eq(stateOf(next, 2)?.is_complete, false, 'lesson 2 is not completed by lesson 1\'s heartbeat');
  eq(stateOf(next, 1)?.is_complete, true, 'lesson 1 is');
});

check('a heartbeat with no lesson id changes nothing', () => {
  // The server did not tell us which lesson, so the honest answer is to write
  // nothing rather than to apply it to the lesson currently on screen.
  const c = course([lesson(1)]);
  const next = applyLessonState(c, undefined, state({ is_complete: true }));
  eq(stateOf(next, 1)?.is_complete, false, 'nothing is written');
  eq(next === c, true, 'and the same object comes back');
});

check('an unmatched id returns the same object, not a copy', () => {
  // Downstream `useMemo`/`memo` key on identity. A fresh copy on every heartbeat
  // would re-render the whole course page every 15 seconds to show an identical
  // one — and heartbeats run continuously for the length of a video lesson.
  const c = course([lesson(1)]);
  eq(applyLessonState(c, 99, state({ is_complete: true })) === c, true, 'no match, no new object');
  eq(applyLessonState(c, 1, state({ is_complete: true })) === c, false, 'a match does produce one');
});

check('a null course is passed straight through', () => {
  eq(applyLessonState(null, 1, state()), null, 'nothing to patch yet');
});

console.log(`\nlessonProgress: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
