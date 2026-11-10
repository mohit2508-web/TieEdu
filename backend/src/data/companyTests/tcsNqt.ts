/**
 * TCS NQT MCQ question bank — EMPTY until the owner's content arrives. The
 * full mock and the sectional tests switch on by themselves once every section
 * has enough questions (see seed3T CONFIGS['tcs-nqt']):
 *   numerical 20, verbal 25, reasoning 20, advanced 15  (Part A + Part B MCQs)
 * Sectional tests need 10 / 10 / 10 / 8. Aim for 2–3× the mock count per
 * section so every attempt draws a fresh paper.
 *
 * topic: 'numerical' | 'verbal' | 'reasoning' | 'advanced'
 *   advanced = Part B "Advanced Quantitative & Reasoning".
 * correct: index into options (0-based). code: true keeps line breaks.
 * source: where it came from, e.g. "Practice set 1 Q4" — never call a practice question a PYQ.
 * lesson (optional): exact lesson title it belongs to, so it is practised inside that lesson.
 */
import type { BankQuestion } from './mphasis';

export const TCS_NQT_BANK: Array<BankQuestion & { lesson?: string }> = [];
