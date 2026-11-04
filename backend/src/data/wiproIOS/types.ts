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

export interface WQuestion {
  source: string; topic: MKey; lesson: string; difficulty: Difficulty;
  question: string; options: string[]; correct: number; explanation: string; code: boolean;
}

/** Same text → same slot (0–3), so the answer position is spread but never changes between builds. */
const slot = (text: string) => [...text].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % 4;

/**
 * Question maker for one lesson: code is on when the question has line breaks.
 * The correct option is swapped into a slot picked from the question text, because
 * lesson practice shows options in order and authors tend to write the answer second.
 */
export const qsFor = (m: MKey, lesson: string) =>
  (difficulty: Difficulty, question: string, options: string[], correct: number, explanation: string): WQuestion => {
    const to = slot(question);
    const opts = [...options];
    [opts[correct], opts[to]] = [opts[to], opts[correct]];
    return { source: `Practice · ${m.toUpperCase()}`, topic: m, lesson, difficulty, question, options: opts, correct: to, explanation, code: question.includes('\n') };
  };
