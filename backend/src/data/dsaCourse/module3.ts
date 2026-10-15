// Module 3 — Trees, Heaps & Greedy
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M3, COURSE_ID } from './helpers';

export const module3: CourseModule = {
  id: M3,
  course_id: COURSE_ID,
  title: 'Module 3 — Trees, Heaps & Greedy',
  summary:
    'BST invariants, traversal templates, the priority queue as a pattern, and when greedy is actually correct.',
  sort_order: 3,
  lessons: [
    lesson(
      M3,
      'dsa-3-1',
      1,
      'Binary Trees and BSTs',
      'Traversals, height, LCA and the sorted-order property interviewers probe constantly.',
      12,
      nineBlocks({
        objectives: [
          'Write inorder, preorder and postorder recursively and iteratively',
          'Compute height and depth; validate a BST with range bounds',
          'Find lowest common ancestor in a binary tree and in a BST',
        ],
        hook: 'Inorder on a BST prints keys in sorted order — that single property converts tree questions into "what order do I visit nodes". If you can recurse on left/right and combine, you can solve most tree problems.',
        concept: `**Traversals:**
- Preorder (node, left, right) — copy/serialize, prefix expressions.
- Inorder (left, node, right) — sorted order on BSTs.
- Postorder (left, right, node) — delete/evaluate postfix.

**Height:** max depth of any leaf + 1 (or 0 for null — pick a convention and state it). Recurrence: h = 1 + max(h(left), h(right)). O(n).

**BST validation:** pass an open interval (min, max) down the tree; each node must lie strictly inside. Comparing only with the parent is wrong (a deep descendant can violate order).

**LCA (general binary tree):** if left and right searches both return non-null, current node is the LCA; otherwise return whichever side was non-null. O(n).

**LCA (BST):** walk from the root: both smaller → go left; both larger → go right; else current is the split point. O(h).`,
        extras: [
          table('Traversal order', ['Order', 'Visit', 'BST note'], [
            ['Preorder', 'node, L, R', 'Reconstruct with inorder'],
            ['Inorder', 'L, node, R', 'Sorted keys'],
            ['Postorder', 'L, R, node', 'Free/delete order'],
          ]),
          tip(
            'Iterative inorder with a stack',
            'Push left spine; pop, visit, go right once. Expect to be asked for the iterative version.',
          ),
        ],
        worked: {
          title: 'Validate a BST with bounds',
          problem: 'Check whether a binary tree is a valid BST (strict left < node < right globally).',
          steps: [
            { title: 'Pass bounds', desc: 'Pass (lo, hi) down from the root with lo = −∞, hi = +∞.' },
            { title: 'Check and recurse', desc: 'At node v: require lo < v < hi; recurse left with (lo, v) and right with (v, hi).' },
            { title: 'Why bounds matter', desc: 'Parent-only checks accept a deep left descendant larger than the root.' },
          ],
          solution: 'O(n) time, O(h) recursion space. Bounds enforce the global order property.',
        },
        practice: {
          title: 'Inorder iteratively',
          prompt: 'Implement iterative inorder and prove it visits nodes in sorted order for a BST.',
          hint: 'Stack holds the pending left spine.',
        },
        mistakes: [
          {
            mistake: 'Validating BST by comparing only to the parent',
            fix: 'Use min/max bounds; deep descendants can violate order relative to ancestors.',
          },
          {
            mistake: 'Confusing depth and height',
            fix: 'Depth = root-to-node; height = node-to-deepest-leaf. Interviewers will ask which you mean.',
          },
        ],
        exam: {
          question: 'Which traversal of a BST yields sorted keys?',
          answer: 'Inorder (left, node, right).',
          source: 'Most common tree screening question.',
        },
        summary: [
          'Inorder on BST = sorted; preorder/postorder for structure work.',
          'Validate BST with (min, max) bounds, not parent-only checks.',
          'LCA: general tree via postorder combine; BST via directional walk.',
        ],
      }),
      [
        [
          'Inorder of a BST yields:',
          ['Reverse sorted', 'Sorted order', 'Level order', 'Random'],
          1,
          'Left < node < right.',
        ],
        [
          'BST validation needs:',
          ['Parent comparison only', 'Min/max bounds from ancestors', 'Level order', 'Postorder only'],
          1,
          'Global order property.',
        ],
        [
          'Height of a tree with one node (leaf = height 0 convention):',
          ['0', '1', '2', '−1'],
          0,
          'Or 1 with the other convention — state yours.',
        ],
      ]
    ),
    lesson(
      M3,
      'dsa-3-2',
      2,
      'Heaps and Greedy Correctness',
      'Priority queues for top-k and scheduling; greedy strategies you can actually defend.',
      11,
      nineBlocks({
        objectives: [
          'Use a min/max heap for top-k, running median and merge-k problems',
          'State the exchange argument idea when justifying a greedy choice',
          'Solve interval scheduling and Huffman-style problems with heaps',
        ],
        hook: 'Top-k of a stream in O(n log k) with a size-k min-heap is one of the most repeated OA snippets. Greedy without a correctness argument is just hope — interviewers will ask why it works.',
        concept: `**Heap / priority queue:** binary heap gives O(1) peek and O(log n) push/pop. Min-heap for "smallest first"; max-heap via negation or a max-heap type.

**Top-k pattern:** maintain a min-heap of size k; for each element push then pop if size > k. At the end the heap holds the k largest. O(n log k).

**Running median:** two heaps — max-heap for the lower half, min-heap for the upper half; rebalance so sizes differ by at most 1. Median is the top of the larger heap (or average of both tops).

**Merge k sorted lists:** min-heap of the current head of each list; pop smallest, push its next. O(N log k) for N total elements.

**Greedy correctness:** the exchange argument — show any optimal solution can be swapped, step by step, to match the greedy choice without getting worse. Classic correct cases: activity selection by end time, fractional knapsack by value/weight, Huffman coding, earliest deadline first.

**When greedy fails:** 0/1 knapsack (use DP), graph shortest path with negative edges (Bellman-Ford), some coin systems (greedy coin change is not always optimal).`,
        extras: [
          table('Heap problem map', ['Problem', 'Heap role'], [
            ['Kth largest', 'Min-heap of size k'],
            ['Top-k frequent', 'Heap of (freq, val) after counting'],
            ['Merge k sorted', 'Heap of list heads'],
            ['Meeting rooms / schedule', 'Min-heap of end times'],
            ['Running median', 'Two balanced heaps'],
          ]),
          warn(
            'Greedy is a proof obligation',
            'Always be ready with one sentence of exchange argument or a counterexample family.',
          ),
        ],
        worked: {
          title: 'Kth largest in an array',
          problem: 'Find the kth largest element in an unsorted array of n elements.',
          steps: [
            { title: 'Sort baseline', desc: 'O(n log n) — works but not optimal for streaming.' },
            { title: 'Min-heap of size k', desc: 'Scan elements; push; if size > k pop smallest.' },
            { title: 'Answer', desc: 'Heap always holds the k largest seen; answer is the heap root.' },
          ],
          solution: 'O(n log k) time, O(k) space. For k=1 this is just a running max.',
        },
        practice: {
          title: 'Activity selection',
          prompt: 'n activities with start/end times; pick the maximum number of non-overlapping activities. Greedy rule and why?',
          hint: 'Sort by end time; take the next compatible activity.',
        },
        mistakes: [
          {
            mistake: 'Max-heap of size n for kth largest',
            fix: 'A min-heap of size k is smaller and often faster.',
          },
          {
            mistake: 'Assuming greedy always works for knapsack',
            fix: 'Fractional knapsack is greedy; 0/1 knapsack needs DP.',
          },
        ],
        exam: {
          question: 'Complexity of kth largest with a size-k min-heap?',
          answer: 'O(n log k) time, O(k) space.',
          source: 'Frequent OA follow-up.',
        },
        summary: [
          'Min-heap size k = top-k largest in O(n log k).',
          'Two heaps = running median; k-heaps = merge-k lists.',
          'Greedy needs an exchange argument; know the counterexamples.',
        ],
      }),
      [
        [
          'Kth largest with a min-heap of size k is:',
          ['O(n log n)', 'O(n log k)', 'O(k log n)', 'O(n)'],
          1,
          'Each push/pop is log k.',
        ],
        [
          'Activity selection by earliest end time is:',
          ['Not always optimal', 'Optimal (greedy)', 'NP-hard', 'Only for equal lengths'],
          1,
          'Classic exchange-argument greedy.',
        ],
        [
          '0/1 knapsack is best solved with:',
          ['Greedy by value', 'Dynamic programming', 'BFS', 'Binary search'],
          1,
          'Greedy fails on 0/1 choices.',
        ],
      ]
    ),
  ],
};
