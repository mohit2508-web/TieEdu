/**
 * Mobile lesson-segment resume.
 *
 * Which segment a learner was last looking at is a *reading convenience* — the
 * same class of state as the exam-prep ticks — so it lives in localStorage per
 * device, not on the server. Completion, watch credit, and quiz results remain
 * server-owned; losing this value costs a re-read position, never progress.
 */

const STORAGE_KEY = 'tieedu_lesson_seg_v1';

type SegmentMap = Record<string, number>;

const readAll = (): SegmentMap => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? (parsed as SegmentMap) : {};
  } catch {
    return {};
  }
};

/** Last segment index the learner opened for this lesson, or null. */
export function readLessonSegment(lessonId: string): number | null {
  const value = readAll()[lessonId];
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

/** Remember the segment so reopening the lesson lands where reading stopped. */
export function writeLessonSegment(lessonId: string, index: number): void {
  if (typeof window === 'undefined') return;
  try {
    const all = readAll();
    all[lessonId] = index;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Private mode / quota — resume simply does not apply for this device.
  }
}
