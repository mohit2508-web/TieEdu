/**
 * The practice problem bank (PRACTICE_MODE_PLAN.md §4): one global list of
 * coding problems, each tagged with its DSA topic and the companies that ask
 * it. Company sets reference problems by id, so a problem asked by several
 * companies is written once.
 *
 * Today the bank is built from the verified TCS NQT export; a new company adds
 * its tags in COMPANY_TAGS and its set in COMPANY_SETS (and any new problems to
 * the data files).
 */
import { TCS_NQT_CODING, type CodingProblem } from '../../data/companyTests/tcsNqtCoding';

export interface DsaTopic { key: string; name: string; blurb: string; lesson?: string }

/** Study order for the DSA sheet. A topic shows only when it has problems. */
export const DSA_TOPICS: DsaTopic[] = [
  { key: 'basics', name: 'Basics & maths', blurb: 'Digits, primes, GCD, series. Where every coding round starts.' },
  { key: 'arrays', name: 'Arrays', blurb: 'One-pass scans, running max/min, rotation, rank and frequency.' },
  { key: 'strings', name: 'Strings', blurb: 'Words, characters, ciphers and validation.' },
  { key: 'hashing', name: 'Hashing', blurb: 'Counting, duplicates and "seen before" with maps and sets.' },
  { key: 'two-pointers', name: 'Two pointers', blurb: 'In-place rearranging: move zeros, Dutch national flag.' },
  { key: 'prefix-window', name: 'Prefix sums & sliding window', blurb: 'From O(N²) to O(N): subarray sums and windows.' },
  { key: 'sorting-searching', name: 'Sorting & binary search', blurb: 'Sort first, search smart, O(log N) tricks.' },
  { key: 'bits', name: 'Number systems & bits', blurb: 'Base conversion, XOR, masks.' },
  { key: 'greedy', name: 'Greedy', blurb: 'Local best choices that never hurt: intervals, jumps.' },
  { key: 'dp', name: 'Dynamic programming', blurb: 'State, transition, table: subsets, coins, LCS.' },
  { key: 'stories', name: 'Story problems', blurb: 'TCS-style word problems: read, validate, print exactly.' },
];

/** Problem → DSA topic. Anything not listed falls back by its level. */
const TOPIC_OF: Record<string, string> = {
  'tcs-a03': 'hashing', 'tcs-a04': 'hashing', 'tcs-a13': 'hashing', 'tcs-s04': 'hashing', 'tcs-s05': 'hashing', 'tcs-s06': 'hashing', 'tcs-s07': 'hashing',
  'tcs-a02': 'two-pointers', 'tcs-a06': 'two-pointers', 'tcs-a07': 'two-pointers', 'tcs-s02': 'two-pointers',
  'tcs-a09': 'prefix-window', 'tcs-s10': 'prefix-window', 'tcs-d02': 'prefix-window', 'tcs-a10': 'prefix-window',
  'tcs-a12': 'sorting-searching', 'tcs-d01': 'sorting-searching', 'tcs-d09': 'sorting-searching', 'tcs-d11': 'sorting-searching', 'tcs-d10': 'greedy',
  'tcs-d07': 'greedy', 'tcs-d08': 'bits',
  'tcs-d03': 'dp', 'tcs-d04': 'dp', 'tcs-d05': 'dp', 'tcs-d06': 'dp', 'tcs-d12': 'dp',
};
const LEVEL_TOPIC: Record<number, string> = { 1: 'basics', 2: 'arrays', 3: 'strings', 4: 'bits', 5: 'stories', 6: 'dp' };

export interface CompanyTag { slug: string; kind: 'reported' | 'practice' }
export interface BankProblem extends CodingProblem { topic_key: string; companies: CompanyTag[] }

/** Extra company tags for problems that other companies also ask (add as company sets arrive). */
const COMPANY_TAGS: Record<string, CompanyTag[]> = {};

export const BANK: BankProblem[] = TCS_NQT_CODING.map((p) => ({
  ...p,
  topic_key: TOPIC_OF[p.id] || LEVEL_TOPIC[p.level || 1] || 'basics',
  companies: [{ slug: 'tcs-nqt', kind: p.kind === 'pyq' ? 'reported' : 'practice' } as CompanyTag, ...(COMPANY_TAGS[p.id] || [])],
}));
export const BANK_BY_ID = new Map(BANK.map((p) => [p.id, p]));

export interface CompanySet {
  slug: string; name: string; module?: string;
  levels: Array<{ name: string; blurb: string; ids: string[] }>;
  /** Open to everyone even without the pack. */
  free_ids: string[];
}

const LEVEL_NAMES: Record<number, [string, string]> = {
  1: ['Level 1 · Number basics', 'The Ninja warm-up.'],
  2: ['Level 2 · Arrays', 'One-pass patterns, two pointers, hashing.'],
  3: ['Level 3 · Strings', 'Words, characters, ciphers, sliding window.'],
  4: ['Level 4 · Number systems & bits', 'Base conversion and XOR tricks.'],
  5: ['Level 5 · TCS story problems', 'Easy logic in a long story.'],
  6: ['Level 6 · Digital & Prime', 'Prefix sums, binary search, greedy, DP.'],
};

export const COMPANY_SETS: CompanySet[] = [
  {
    slug: 'tcs-nqt', name: 'TCS NQT', module: 'mod-prep-tcs-nqt-coding',
    levels: [1, 2, 3, 4, 5, 6].map((lv) => ({ name: LEVEL_NAMES[lv][0], blurb: LEVEL_NAMES[lv][1], ids: TCS_NQT_CODING.filter((p) => p.level === lv).map((p) => p.id) })),
    free_ids: TCS_NQT_CODING.slice(0, 3).map((p) => p.id),
  },
];
export const SET_BY_SLUG = new Map(COMPANY_SETS.map((s) => [s.slug, s]));

/**
 * The free DSA core (owner decision D1, 2026-11-10): easy problems from the
 * basic topics, open to every signed-in student — about 40.
 */
export const FREE_CORE = new Set(
  BANK.filter((p) => p.difficulty === 'easy' && ['basics', 'arrays', 'strings', 'hashing', 'two-pointers', 'bits'].includes(p.topic_key)).slice(0, 40).map((p) => p.id),
);

/** Problems shared by two or more companies ("common questions"). */
export const commonProblems = () => BANK.filter((p) => new Set(p.companies.map((c) => c.slug)).size > 1);
