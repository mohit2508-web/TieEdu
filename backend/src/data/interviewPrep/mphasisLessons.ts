/**
 * Mphasis Train lessons — EMPTY until the owner's content arrives.
 * Section names: Quant, Reasoning, Verbal, Programming, Coding, SVAR
 * (Coding lessons count toward Programming, SVAR toward Verbal in the plan).
 *
 * Lesson tuple: [section, title, key rules[], worked example, common trap]
 */
import type { Lesson } from './infosysSELessons';
import type { LessonExtra } from './infosysSELessonExtras';

export const MPHASIS_LESSONS: Lesson[] = [];
/** Optional reader extras keyed by lesson title: what it is, more examples, practice-question matcher. */
export const MPHASIS_LESSON_EXTRAS: Record<string, LessonExtra> = {};
