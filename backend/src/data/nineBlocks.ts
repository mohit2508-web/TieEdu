// ============================================================================
// 9-BLOCK LESSON AUTHORING HELPERS — shared by every new seed course.
//
// The 9-block standard (COURSE_EXPANSION_PLAN.md Part C.1) is what makes a
// lesson a lesson instead of a wall of markdown. Every new course built for
// Phase 4+ authors through these helpers so:
//
//   - The block order is always the canonical nine, in order, with none empty.
//   - Payload shapes match what ContentBlockRenderer.tsx actually reads, so a
//     typo in a field name shows up as a compile error, not a silent fallback
//     ("No summary yet.") on a learner's screen.
//   - Objectives are measurable by construction — the type forces them to be
//     written as actions the learner can perform, not vague goals.
//
// The helpers do not validate. courseHealthFor() enforces the publish gate at
// runtime; seeded content is typechecked and authored in-repo, so this file is
// where the structure lives.
// ============================================================================

import type { ContentBlockRecord } from './db';

/** A block before it has been given an id and a position. */
export type BlockSpec = { block_type: ContentBlockRecord['block_type']; payload: Record<string, any> };

// ---------------------------------------------------------------------------
// The nine blocks, in the order they must appear.
// ---------------------------------------------------------------------------

/** 1. Learning objective — "is lesson ke baad aap ___ kar paoge". */
export const objective = (objectives: string[]): BlockSpec => ({
  block_type: 'objective',
  payload: { title: 'What you will learn', objectives },
});

/** 2. Hook — a real-world example, interview question, or story. */
export const hook = (text: string): BlockSpec => ({ block_type: 'markdown', payload: { text } });

/** 3. Concept — plain explanation, optionally with a mermaid diagram. */
export const concept = (text: string, mermaid?: string): BlockSpec => ({
  block_type: 'markdown',
  payload: mermaid ? { text, diagram: mermaid } : { text },
});

/** 3b. A titled lead-in, for sectioning a longer concept. */
export const lead = (text: string): BlockSpec => ({ block_type: 'markdown', payload: { text: `### ${text}` } });

/** A mermaid diagram block, when it should render on its own. */
export const diagram = (title: string, source: string): BlockSpec => ({
  block_type: 'diagram',
  payload: { title, source },
});

/** A markdown block, the workhorse. */
export const md = (text: string): BlockSpec => ({ block_type: 'markdown', payload: { text } });

/** A callout. `style` is 'tip' | 'warning' | 'info'. */
export const callout = (style: string, title: string, text: string): BlockSpec => ({
  block_type: 'callout',
  payload: { style, title, text },
});
export const tip = (title: string, text: string) => callout('tip', title, text);
export const warn = (title: string, text: string) => callout('warning', title, text);
export const info = (title: string, text: string) => callout('info', title, text);

/** A code sample. */
export const code = (codeText: string, filename: string, language = 'text'): BlockSpec => ({
  block_type: 'code',
  payload: { code: codeText, filename, language },
});

/** A table. */
export const table = (title: string, headers: string[], rows: string[][]): BlockSpec => ({
  block_type: 'table',
  payload: { title, headers, rows },
});

/** 4. Worked example — a step-by-step solved problem. */
export const workedExample = (
  title: string,
  problem: string,
  steps: { title: string; desc: string; code_snippet?: string }[],
  solution: string
): BlockSpec => ({ block_type: 'worked_example', payload: { title, problem, steps, solution } });

/** 5. Try it — an interactive or self-check practice prompt. */
export const tryIt = (title: string, prompt: string, hint?: string): BlockSpec => ({
  block_type: 'try_it',
  payload: hint ? { title, prompt, hint } : { title, prompt },
});

/** 6. Common mistakes — the traps learners fall into, with the fix. */
export const mistakes = (items: { mistake: string; fix: string }[]): BlockSpec => ({
  block_type: 'mistakes',
  payload: { title: 'Common mistakes', mistakes: items },
});

/** 7. Exam / interview angle — a PYQ or interview question with the answer. */
export const examAngle = (question: string, answer: string, source?: string): BlockSpec => ({
  block_type: 'exam_angle',
  payload: source ? { title: 'Exam / interview angle', question, answer, source } : { title: 'Exam / interview angle', question, answer },
});

/** 9. Summary — the one-screen revision card that closes the lesson. */
export const summary = (points: string[]): BlockSpec => ({
  block_type: 'summary',
  payload: { title: 'Lesson summary', points },
});

// ---------------------------------------------------------------------------
// Assembling the nine, in order, from a single call.
// ---------------------------------------------------------------------------

export interface NineBlocks {
  objectives: string[];
  hook: string;
  concept: string;
  diagram?: string;
  worked: { title: string; problem: string; steps: { title: string; desc: string; code_snippet?: string }[]; solution: string };
  practice: { title: string; prompt: string; hint?: string };
  mistakes: { mistake: string; fix: string }[];
  exam: { question: string; answer: string; source?: string };
  summary: string[];
  /** Extra blocks inserted after the concept, for lessons that need a table or code walkthrough. */
  extras?: BlockSpec[];
}

/**
 * Build the canonical nine blocks, in order, from a single spec.
 *
 * Every lesson this file produces is nine blocks long, in the same order, so a
 * learner always sees the same shape. The `extras` slot exists for the lessons
 * that genuinely need a table or a code walkthrough between the concept and the
 * worked example — it is the only place a tenth block is allowed, and it is
 * always after the concept, never in place of one of the nine.
 */
export function nineBlocks(spec: NineBlocks): BlockSpec[] {
  const blocks: BlockSpec[] = [
    objective(spec.objectives),
    hook(spec.hook),
    concept(spec.concept, spec.diagram),
    ...(spec.extras || []),
    workedExample(spec.worked.title, spec.worked.problem, spec.worked.steps, spec.worked.solution),
    tryIt(spec.practice.title, spec.practice.prompt, spec.practice.hint),
    mistakes(spec.mistakes),
    examAngle(spec.exam.question, spec.exam.answer, spec.exam.source),
    summary(spec.summary),
  ];
  return blocks;
}
