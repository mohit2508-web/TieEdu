/**
 * TCS NQT Part B coding problems. The content lives in tcsNqtCoding.data.ts,
 * generated from the verified material (tcs-sources/material, export_coding.py).
 *
 * Used in two places:
 *  - Train: the "Coding round: problems and solutions" module (one item per
 *    problem: statement, samples, hints, approach and model solutions), and
 *    the code editor, where students run their code against the samples and
 *    submit it against the hidden tests (lib/codeRunner.ts, Piston).
 *  - Test: the coding section at the end of the full NQT mock draws
 *    CODING_PER_MOCK problems (90 minutes). The section switches on once the
 *    bank has CODING_MIN problems.
 *
 * difficulty: 'easy' | 'medium' | 'hard'. Statements follow TCS: a short story,
 * then exact input and output formats.
 */
import { TCS_NQT_CODING_DATA } from './tcsNqtCoding.data';

export interface CodingSample { input: string; output: string; explain?: string }
/** One test the runner checks: samples first (shown), then hidden ones (pass/fail only). */
export interface CodingTest { input: string; output: string; sample: boolean }
export interface CodingProblem {
  /** Stable short id, e.g. "tcs-a06". Never reuse or renumber. */
  id: string;
  title: string;
  /** Ladder level 1–6: numbers, arrays, strings, bits, TCS stories, Digital/Prime. */
  level?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  /** DSA topic, e.g. "Arrays · two pointers". */
  topic: string;
  /** pyq = reported by candidates (never official); practice otherwise. */
  kind?: 'pyq' | 'practice';
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
  /** Where it came from, e.g. "TiEEdu practice set 2". Never call a practice problem a PYQ. */
  source: string;
  /** Server-only test cases for the code runner. */
  tests?: CodingTest[];
}

/** Problems per mock attempt (the real Part B has 2 in 90 minutes). */
export const CODING_PER_MOCK = 2;
export const CODING_MINUTES = 90;
/** The mock's coding section turns on with this many problems, so attempts differ. */
export const CODING_MIN = 6;

export const TCS_NQT_CODING: CodingProblem[] = TCS_NQT_CODING_DATA;
