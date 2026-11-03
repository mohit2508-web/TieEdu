// AI.FIRST — shared lesson helper and ids.
import type { CourseLesson } from '../db';
import { callout, type BlockSpec } from '../nineBlocks';

/**
 * Deterministically reorder a question's options from its id, so the correct
 * answer's position varies across the bank instead of sitting wherever it was
 * authored. Stable across restarts (ids never change), so a stored attempt
 * still grades against the same order.
 */
export function placeOptions(id: string, options: string[], correct: number): { options: string[]; correct_index: number } {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619) >>> 0;
  const order = options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { options: order.map((i) => options[i]), correct_index: order.indexOf(correct) };
}

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
  xp_reward: 40,
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
        passing_percent: 75,
        questions: questions.map(([prompt, options, correct, explanation], i) => ({
          id: `${id}-q${i + 1}`,
          prompt,
          ...placeOptions(`${id}-q${i + 1}`, options, correct),
          explanation,
        })),
      }
    : null,
});

/**
 * A module's proof of work, in its three pathway variants. Sits in the last
 * lesson of every module, so the twelve proofs build the capstone portfolio.
 */
export const proofOfWork = (n: number, title: string, explorer: string, builder: string, leader: string, evidence: string): BlockSpec =>
  callout(
    'info',
    `Proof of work ${n} — ${title}`,
    `Pick the variant for your pathway. Save it in your AI.FIRST portfolio folder as PoW-${String(n).padStart(2, '0')}; the capstone defence draws on all twelve.

- **Explorer (no code):** ${explorer}
- **Builder (code):** ${builder}
- **Leader (policy & strategy):** ${leader}

**Evidence that counts:** ${evidence}`
  );

export const COURSE_ID = 'crs-ai-first';
export const M = (n: number) => `aif-m${n}`;
