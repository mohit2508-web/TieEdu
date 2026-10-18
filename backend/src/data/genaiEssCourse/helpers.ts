// Generative AI Essentials — shared lesson helper.
import type { CourseLesson } from '../db';
import { nineBlocks, type BlockSpec } from '../nineBlocks';

export const lesson = (
  moduleId: string,
  id: string,
  sort: number,
  title: string,
  summaryText: string,
  duration: number,
  blocks: BlockSpec[],
  questions?: [string, string[], number, string][]
): CourseLesson => ({
  id,
  module_id: moduleId,
  title,
  summary: summaryText,
  sort_order: sort,
  duration_minutes: duration,
  xp_reward: 35,
  video: null,
  blocks: blocks.map((spec, i) => ({
    id: `${id}-b${String(i + 1).padStart(2, '0')}`,
    block_type: spec.block_type,
    block_order: i + 1,
    payload: spec.payload,
  })),
  quiz: questions
    ? {
        id: `quiz-${id}`,
        passing_percent: 70,
        questions: questions.map(([prompt, options, correct_index, explanation], i) => ({
          id: `${id}-q${i + 1}`,
          prompt,
          options,
          correct_index,
          explanation,
        })),
      }
    : null,
});

export const M1 = 'gae-m1';
export const M2 = 'gae-m2';
export const M3 = 'gae-m3';
export const M4 = 'gae-m4';
export const M5 = 'gae-m5';
export const M6 = 'gae-m6';
export const M7 = 'gae-m7';
export const M8 = 'gae-m8';
export const M9 = 'gae-m9';
export const M10 = 'gae-m10';
export const COURSE_ID = 'crs-genai-essentials';
