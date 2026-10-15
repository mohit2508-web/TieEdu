// Module 2 — Hashing, Stacks & Linked Lists
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M2, COURSE_ID } from './helpers';

export const module2: CourseModule = {
  id: M2,
  course_id: COURSE_ID,
  title: 'Module 2 — Hashing, Stacks & Linked Lists',
  summary:
    'Frequency maps, monotonic stacks and the pointer surgery that interviewers love to watch you do carefully.',
  sort_order: 2,
  lessons: [
    lesson(
      M2,
      'dsa-2-1',
      1,
      'Hash Maps, Stacks and Monotonic Patterns',
      'O(1) lookups and the LIFO stack as a tool for matching, next-greater and expression problems.',
      12,
      nineBlocks({
        objectives: [
          'Use hash maps/sets to trade space for O(n) lookups',
          'Solve bracket-matching and expression problems with a stack',
          'Apply the monotonic stack template to next-greater and histogram problems',
        ],
        hook: 'Two-sum goes from O(n²) brute force to O(n) the moment you store complements in a map. The "next greater element" array is the same idea in stack clothing — one template, dozens of OA questions.',
        concept: `**Hashing:** average O(1) insert/lookup/delete. Use for frequency counts, seen-sets, complement lookups and grouping anagrams. Worst case is O(n) per op (collisions) but irrelevant in interviews.

**Stack (LIFO):** push/pop/peek. Natural for: matching brackets, undo, DFS by hand, expression evaluation and any "last unfinished thing" state.

**Monotonic stack:** keep stack elements in increasing (or decreasing) order. For each new element, pop while the top is on the wrong side; the popped element's "next greater/smaller" is the current element. O(n) total because each element is pushed and popped once.

**Template (next greater to the right):**
for i in 0..n-1:
  while stack not empty and a[stack.top] < a[i]:
    ans[stack.pop] = a[i]
  stack.push(i)
remaining indices in stack have no next greater (answer 0 or −1).`,
        extras: [
          table('Stack use-cases', ['Problem family', 'Stack role'], [
            ['Valid parentheses', 'Push opens; match closes'],
            ['Next greater / smaller', 'Monotonic indices'],
            ['Largest rectangle in histogram', 'Monotonic heights + width via indices'],
            ['Min stack (O(1) min)', 'Pair values with running min'],
            ['Evaluate RPN / infix', 'Operand and operator stacks'],
          ]),
          tip(
            'Store indices, not just values, in monotonic stacks',
            'You often need the position to compute distances and widths.',
          ),
        ],
        worked: {
          title: 'Next greater element',
          problem: 'Array [2, 1, 2, 4, 3]. For each element, find the next greater element to the right (or −1).',
          steps: [
            { title: 'i=0 (2)', desc: 'Stack empty, push 0.' },
            { title: 'i=1 (1)', desc: '2 > 1, push 1. stack=[0,1].' },
            { title: 'i=2 (2)', desc: 'Pop 1 (ans[1]=2); top 2 is not < 2; push 2.' },
            { title: 'i=3 (4)', desc: 'Pop 2 (ans[2]=4), pop 0 (ans[0]=4); push 3.' },
            { title: 'i=4 (3)', desc: '4 > 3, push 4. End: ans[3]=ans[4]=−1.' },
          ],
          solution: 'ans = [4, 2, 4, −1, −1].',
        },
        practice: {
          title: 'Valid parentheses',
          prompt: 'Given a string of ()[]{}, return true if every open has a matching close in the right order.',
          hint: 'Push opens; on close, stack top must be the matching open.',
        },
        mistakes: [
          {
            mistake: 'Comparing values instead of indices in monotonic stack',
            fix: 'If equal values matter for width, indices keep positions unambiguous.',
          },
          {
            mistake: 'Forgetting to drain the stack at the end',
            fix: 'Leftover indices have no next-greater — set the default explicitly.',
          },
        ],
        exam: {
          question: 'Why is the monotonic stack next-greater algorithm O(n)?',
          answer: 'Each index is pushed once and popped at most once; the inner while total across the array is O(n).',
          source: 'Classic complexity follow-up.',
        },
        summary: [
          'Hash maps buy O(n) lookup with O(n) space.',
          'Stacks model "last unfinished" state and matching.',
          'Monotonic stack: one template, next-greater family in O(n).',
        ],
      }),
      [
        [
          'Average time of hash map lookup:',
          ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
          0,
          'Amortized constant with good hashing.',
        ],
        [
          'Monotonic stack next-greater is:',
          ['O(n²)', 'O(n)', 'O(n log n)', 'O(1)'],
          1,
          'Each element pushed/popped once.',
        ],
        [
          'Valid parentheses is naturally solved with:',
          ['Queue', 'Stack', 'Heap', 'Two pointers'],
          1,
          'LIFO matching of opens.',
        ],
      ]
    ),
    lesson(
      M2,
      'dsa-2-2',
      2,
      'Linked Lists: Fast/Slow and In-Place Surgery',
      'Cycle detection, middle node, reversal and merge — pointer work without extra arrays.',
      11,
      nineBlocks({
        objectives: [
          'Detect a cycle and find the cycle start with Floyd’s algorithm',
          'Reverse a linked list iteratively and understand the recursive form',
          'Merge two sorted lists and delete nodes in O(1) extra space',
        ],
        hook: 'Interviewers watch linked-list questions for how you track prev/current/next — not for the final pointer. Rushing the surgery is how candidates lose the offer on an "easy" problem.',
        concept: `**Dummy head:** a temporary node before the real head. Avoids special-casing empty lists and head deletion/insertion.

**Floyd cycle:** slow = one step, fast = two steps. If they meet, a cycle exists. To find the start: reset one pointer to head; move both one step — the meeting point is the start.

**Reverse (iterative):** prev = null; while curr: next = curr.next; curr.next = prev; prev = curr; curr = next. Return prev.

**Merge two sorted lists:** walk both with a dummy tail; always attach the smaller node. O(n+m) time, O(1) extra space.

**Fast/slow for middle:** when fast reaches end, slow is at the middle (useful for palindrome checks and "reorder list").`,
        extras: [
          tip(
            'Always draw three arrows',
            'Before writing reversal or delete code, sketch prev, curr, next on paper.',
          ),
          warn(
            'Losing the rest of the list',
            'Save curr.next before rewiring curr.next, or the remainder of the list is unreachable.',
          ),
        ],
        worked: {
          title: 'Find cycle start',
          problem: 'Linked list with a cycle. Find the node where the cycle begins, O(1) space.',
          steps: [
            { title: 'Detect', desc: 'Floyd: slow 1 step, fast 2 steps until they meet.' },
            { title: 'No meeting', desc: 'If no meeting, no cycle.' },
            { title: 'Locate start', desc: 'Reset p = head; move p and slow one step each; first meeting node is the start.' },
          ],
          solution: 'O(n) time, O(1) space — no hash set of visited nodes.',
        },
        practice: {
          title: 'Reverse a list iteratively',
          prompt: 'Write the four-line iterative reversal and state the return value.',
          hint: 'prev starts null; return prev after the loop.',
        },
        mistakes: [
          {
            mistake: 'Forgetting to save next before unlinking',
            fix: 'next = curr.next must happen before curr.next = prev.',
          },
          {
            mistake: 'Using a visited set for cycle detection',
            fix: 'Works but is O(n) space; Floyd is the expected O(1) solution.',
          },
        ],
        exam: {
          question: 'Space complexity of Floyd’s cycle detection?',
          answer: 'O(1) — only two pointers, no visited set.',
          source: 'Standard follow-up.',
        },
        summary: [
          'Dummy head removes head special cases.',
          'Floyd: detect + locate cycle start in O(1) space.',
          'Save next before rewiring; reverse returns the old tail.',
        ],
      }),
      [
        [
          'Floyd’s algorithm uses how much extra space?',
          ['O(n)', 'O(1)', 'O(log n)', 'O(n²)'],
          1,
          'Two pointers only.',
        ],
        [
          'Reversing a list iteratively returns:',
          ['Original head', 'New head (old tail)', 'Null always', 'Middle node'],
          1,
          'prev ends at the last node.',
        ],
        [
          'A dummy head helps mainly with:',
          ['Sorting', 'Empty/head edge cases in insert/delete', 'Cycle detection', 'Copying'],
          1,
          'Uniform code path for all positions.',
        ],
      ]
    ),
  ],
};
