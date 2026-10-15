// Computer Networks — shared lesson helper.
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

export const M1 = 'cn-m1';
export const M2 = 'cn-m2';
export const M3 = 'cn-m3';
export const M4 = 'cn-m4';
export const COURSE_ID = 'crs-computer-networks';
