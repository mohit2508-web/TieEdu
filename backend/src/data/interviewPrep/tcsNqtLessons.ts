/**
 * TCS NQT Train lessons — EMPTY until the owner's content arrives.
 * Section names: Numerical, Verbal, Reasoning, Advanced, Coding
 * (Coding = DSA lessons for Part B; they count toward the coding part of the plan).
 *
 * Lesson tuple: [section, title, key rules[], worked example, common trap]
 */
import type { Lesson } from './infosysSELessons';
import type { LessonExtra } from './infosysSELessonExtras';

export const TCS_NQT_LESSONS: Lesson[] = [];
/** Optional reader extras keyed by lesson title: what it is, more examples, practice-question matcher. */
export const TCS_NQT_LESSON_EXTRAS: Record<string, LessonExtra> = {};
