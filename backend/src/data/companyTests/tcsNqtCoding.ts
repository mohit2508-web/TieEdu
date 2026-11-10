/**
 * TCS NQT Part B coding problems — EMPTY until the owner's content arrives.
 *
 * Used in two places:
 *  - Train: the "Coding round: problems and solutions" module (one item per
 *    problem: statement, samples, hints, approach and model solutions).
 *  - Test: the coding section at the end of the full NQT mock draws
 *    CODING_PER_MOCK problems (90 minutes). There is no code runner: the
 *    student checks their code against the samples and marks how it went.
 *    The section switches on once the bank has CODING_MIN problems.
 *
 * difficulty: 'easy' | 'medium' | 'hard'. Write statements the way TCS does:
 * a short story, then exact input and output formats.
 */
export interface CodingSample { input: string; output: string; explain?: string }
export interface CodingProblem {
  /** Stable short id, e.g. "tcs-c-001". Never reuse or renumber. */
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  /** DSA topic, e.g. "Arrays", "Strings", "Hashing", "Math", "Recursion", "DP", "Sorting". */
  topic: string;
  statement: string;
  input_format: string;
  output_format: string;
  constraints: string[];
  /** At least 2; shown to the student. */
  samples: CodingSample[];
  /** Short nudges, shown one at a time in Train. */
  hints: string[];
  /** The idea in plain words, then the complexity, e.g. "O(n) time, O(1) space". */
  approach: string;
  complexity: string;
  /** Model solutions, full programs that read stdin and print stdout. At least one. */
  solutions: { c?: string; cpp?: string; java?: string; python?: string };
  /** Where it came from, e.g. "TieEdu practice set 2". Never call a practice problem a PYQ. */
  source: string;
}

/** Problems per mock attempt (the real Part B has 2 in 90 minutes). */
export const CODING_PER_MOCK = 2;
export const CODING_MINUTES = 90;
/** The mock's coding section turns on with this many problems, so attempts differ. */
export const CODING_MIN = 6;

export const TCS_NQT_CODING: CodingProblem[] = [];
