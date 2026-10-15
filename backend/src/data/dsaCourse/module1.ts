// Module 1 — Complexity & Arrays
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M1, COURSE_ID } from './helpers';

export const module1: CourseModule = {
  id: M1,
  course_id: COURSE_ID,
  title: 'Module 1 — Complexity & Arrays',
  summary:
    'Big-O fluency, two-pointer patterns and the sliding window — the foundation every OA and interview assumes.',
  sort_order: 1,
  lessons: [
    lesson(
      M1,
      'dsa-1-1',
      1,
      'Big-O, Time and Space',
      'Read and write complexity the way interviewers expect — including amortized and best/worst cases.',
      11,
      nineBlocks({
        objectives: [
          'State time and space complexity of nested loops, recursion and common library operations',
          'Distinguish best, average and worst case, and amortized analysis',
          'Use complexity to reject an approach before coding it',
        ],
        hook: 'An interviewer asks for O(n log n). You write O(n²) and pass the sample tests. The real test fails at n = 10⁵. Complexity is not decoration — it is the pass/fail gate before your code runs.',
        concept: `**Big-O** describes how runtime or memory grows with input size n, ignoring constants and lower-order terms. O(n²) with a small constant can beat O(n log n) for tiny n, but interview constraints (n up to 10⁵–10⁶) almost always mean O(n²) will TLE.

**Common tiers and what they allow:**
- O(1), O(log n) — any n
- O(n), O(n log n) — n up to ~10⁵–10⁶
- O(n²) — n up to ~5000–10⁴
- O(2ⁿ), O(n!) — n only up to ~20–25

**Amortized analysis:** average cost per operation over a sequence, not the worst single op. Dynamic-array push is O(1) amortized even though a single resize is O(n).

**Space:** count auxiliary memory, not the input (unless you modify it in place). Recursion depth counts toward space.`,
        extras: [
          table('Complexity budget (1s limit)', ['n', 'Usually OK', 'Usually TLE'], [
            ['≤ 20', 'O(2ⁿ), O(n!)', '—'],
            ['≤ 500', 'O(n³)', 'O(n³) with big constant'],
            ['≤ 5000', 'O(n²)', 'O(n²) heavy ops'],
            ['≤ 10⁶', 'O(n), O(n log n)', 'O(n²)'],
            ['> 10⁸', 'O(1), O(log n)', 'O(n)'],
          ]),
          tip(
            'Check constraints first',
            'Constraints tell you the intended complexity more reliably than the story does.',
          ),
        ],
        worked: {
          title: 'Classify three nested loops',
          problem: 'for i in 0..n: for j in i..n: for k in 0..100: work(). What is the complexity?',
          steps: [
            { title: 'Innermost loop', desc: 'Constant: 101 iterations.' },
            { title: 'Middle loop', desc: 'Runs (n−i) times; sum over i is O(n²).' },
            { title: 'Combine', desc: 'Multiply by constant inner: O(n²).' },
          ],
          solution: 'Time O(n²); space O(1) if work() is O(1).',
        },
        practice: {
          title: 'Complexity of binary search',
          prompt: 'Each step halves the search space. Prove the total steps are O(log n).',
          hint: 'After k steps the remaining size is n/2^k; stop when that is 1.',
        },
        mistakes: [
          {
            mistake: 'Calling O(2n) or O(n+n) different from O(n)',
            fix: 'Constants and sums of same-order terms collapse: O(2n) = O(n).',
          },
          {
            mistake: 'Forgetting recursion stack in space',
            fix: 'DFS depth and recursive calls count as auxiliary space.',
          },
        ],
        exam: {
          question: 'What complexity is allowed if n ≤ 10⁵ in a 1-second limit?',
          answer: 'O(n) or O(n log n); O(n²) will almost always TLE.',
          source: 'Standard OA constraint rule of thumb.',
        },
        summary: [
          'Big-O ignores constants; use constraints to pick the tier.',
          'Amortized O(1) is average-per-op, not worst-single-op.',
          'Recursion depth counts as space.',
        ],
      }),
      [
        [
          'O(3n + 100) simplifies to:',
          ['O(3n)', 'O(n)', 'O(n²)', 'O(100)'],
          1,
          'Constants and lower-order terms drop.',
        ],
        [
          'Which is fastest for n = 10⁶?',
          ['O(n²)', 'O(n log n)', 'O(2ⁿ)', 'O(n³)'],
          1,
          'Only O(n log n) fits the budget.',
        ],
        [
          'Dynamic array push is O(1) in which sense?',
          ['Strict worst case', 'Amortized', 'Best case only', 'Never'],
          1,
          'Resizes are rare; average per push is constant.',
        ],
      ]
    ),
    lesson(
      M1,
      'dsa-1-2',
      2,
      'Two Pointers & Sliding Window',
      'The two array patterns that turn O(n²) scans into O(n) passes.',
      12,
      nineBlocks({
        objectives: [
          'Recognize when a sorted array or pair-sum problem wants two pointers',
          'Implement fixed and variable sliding windows',
          'Convert a brute-force nested loop into a linear window update',
        ],
        hook: 'Longest substring without repeating characters looks O(n²) with a set per position. One moving window makes it O(n). Interviewers plant these problems specifically to see if you know the pattern.',
        concept: `**Two pointers:** indices L and R move toward each other or in the same direction with purpose. Classic uses: pair-sum in a sorted array (move the pointer whose value is too small/large), palindrome checks, merging, in-place partitioning.

**Sliding window:** a window [L, R] over the array that grows by advancing R and shrinks by advancing L when a constraint breaks. Maintain a running aggregate (sum, count, map) and update it in O(1) per move.

**Fixed window:** size k; add element entering, remove element leaving.

**Variable window:** expand R until the window is invalid or complete; then move L to restore validity; record best answer.

**When not to use:** unsorted pair-sum (use a hash set instead); non-monotonic constraints that force full resets — sometimes a hash map "last index" approach is cleaner.`,
        extras: [
          tip(
            'Window invariant',
            'Write in one sentence what is always true inside [L,R]. If you cannot, the window is wrong.',
          ),
          warn(
            'Off-by-one on removal',
            'When shrinking, remove the element AT L before incrementing L, not after.',
          ),
        ],
        worked: {
          title: 'Longest substring with at most k distinct chars',
          problem: 'String s, integer k. Find the longest substring length with ≤ k distinct characters.',
          steps: [
            { title: 'Brute force', desc: 'All substrings O(n²) with a set each — too slow for n = 10⁵.' },
            { title: 'Expand window', desc: 'Window [L,R] with a char→count map. Expand R; update counts.' },
            { title: 'Shrink when invalid', desc: 'While map size > k: decrement s[L], drop if zero, L++.' },
            { title: 'Track answer', desc: 'Max width after each valid window.' },
          ],
          solution: 'O(n) time, O(k) space for the map.',
        },
        practice: {
          title: 'Max sum subarray of size k',
          prompt: 'Array of n integers, fixed window k. Return the maximum window sum in O(n).',
          hint: 'Initial sum of first k, then add s[i] and subtract s[i−k].',
        },
        mistakes: [
          {
            mistake: 'Rebuilding the window state each step',
            fix: 'Update incrementally — that is what makes the pattern O(n).',
          },
          {
            mistake: 'Using two pointers on unsorted pair-sum',
            fix: 'Sorting is O(n log n); for unsorted, use a hash set of complements in one pass.',
          },
        ],
        exam: {
          question: 'Time complexity of the standard sliding window maximum-sum pattern?',
          answer: 'O(n) — each index enters and leaves the window at most once.',
          source: 'Frequently asked follow-up after you code it.',
        },
        summary: [
          'Two pointers: sorted arrays, palindromes, in-place edits.',
          'Sliding window: expand R, shrink L to restore the invariant.',
          'Each element enters/leaves once → O(n).',
        ],
      }),
      [
        [
          'Sliding window is best when:',
          ['Array is unsorted and target is arbitrary pair', 'You need contiguous subarray/substring with a constraint', 'You need all permutations', 'Graph is involved'],
          1,
          'Contiguity + monotonic constraint.',
        ],
        [
          'Longest substring without repeats with a window is:',
          ['O(n²)', 'O(n)', 'O(n log n)', 'O(2ⁿ)'],
          1,
          'Map of last index or counts; each pointer moves once.',
        ],
        [
          'Pair-sum on a SORTED array is typically:',
          ['O(n²)', 'O(n) two pointers', 'O(n log n) always', 'O(1)'],
          1,
          'L and R meet in one pass.',
        ],
      ]
    ),
  ],
};
