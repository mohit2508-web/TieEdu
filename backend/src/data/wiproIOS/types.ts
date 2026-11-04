/**
 * Wipro iOS Developer Training (Swift): content types (WIPRO_IOS_3T_PLAN.md).
 * One lesson per curriculum topic; questions are practice questions written to
 * the owner's syllabus, tagged with their lesson so each lesson gets its own.
 */
export type MKey = 'm1' | 'm2' | 'm3' | 'm4' | 'final';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface WLesson {
  m: MKey;
  module: number;
  title: string;
  /** Official documentation from the owner's sheet: [label, url]. */
  doc: [string, string];
  what: string;
  rules: string[];
  /** Worked examples; ones with line breaks are shown as Swift code. */
  examples: string[];
  trap: string;
  /** Hands-on "try it in a Playground / Xcode" task. */
  task: string;
}

/**
 * kind (default mcq): `fill` = the student types the answer (fill the blank in
 * the code, or name the error / its fix), checked against `answers`;
 * `order` = drag the `items` into the right order (written here in that order).
 * `trick` is the memory trick, shown after answering in practice and in the review.
 */
export interface WQuestion {
  source: string; topic: MKey; lesson: string; difficulty: Difficulty;
  question: string; options: string[]; correct: number; explanation: string; code: boolean;
  kind?: 'mcq' | 'fill' | 'order'; answers?: string[]; items?: string[]; trick?: string;
}

/** Same text → same slot (0–3), so the answer position is spread but never changes between builds. */
const slot = (text: string) => [...text].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % 4;

const base = (m: MKey, lesson: string, difficulty: Difficulty, question: string, explanation: string, trick?: string) => ({
  source: `Practice · ${m.toUpperCase()}`, topic: m, lesson, difficulty, question, explanation,
  code: question.includes('\n'), ...(trick ? { trick } : {}),
});

/**
 * Question maker for one lesson: code is on when the question has line breaks.
 * The correct option is swapped into a slot picked from the question text, because
 * lesson practice shows options in order and authors tend to write the answer second.
 */
export const qsFor = (m: MKey, lesson: string) =>
  (difficulty: Difficulty, question: string, options: string[], correct: number, explanation: string, trick?: string): WQuestion => {
    const to = slot(question);
    const opts = [...options];
    [opts[correct], opts[to]] = [opts[to], opts[correct]];
    return { ...base(m, lesson, difficulty, question, explanation, trick), options: opts, correct: to };
  };

/** Typed answer: fill the blank (`____` in the code) or name the error / its fix. `answers`: every accepted spelling. */
export const fillFor = (m: MKey, lesson: string) =>
  (difficulty: Difficulty, question: string, answers: string[], explanation: string, trick?: string): WQuestion =>
    ({ ...base(m, lesson, difficulty, question, explanation, trick), options: [], correct: -1, kind: 'fill', answers });

/** Drag into order: `items` are written in the right order; the student sees them shuffled. */
export const orderFor = (m: MKey, lesson: string) =>
  (difficulty: Difficulty, question: string, items: string[], explanation: string, trick?: string): WQuestion =>
    ({ ...base(m, lesson, difficulty, question, explanation, trick), options: [], correct: -1, kind: 'order', items });
