/**
 * Mphasis online assessment question bank — EMPTY until the owner's content
 * arrives. The mock test and the sectional tests switch on by themselves once
 * every section has enough questions (see seed3T CONFIGS['mphasis']):
 * quant 20, reasoning 20, verbal 20, programming 15.
 *
 * topic: 'quant' | 'reasoning' | 'verbal' | 'programming'
 * correct: index into options (0-based). code: true keeps line breaks (code / pseudocode).
 * source: where it came from, e.g. "Practice set 1 Q4" — never call a practice question a PYQ.
 */
export interface BankQuestion { source: string; topic: string; difficulty: string; question: string; options: string[]; correct: number; explanation: string; code: boolean }

export const MPHASIS_BANK: BankQuestion[] = [];
