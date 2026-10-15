// Module 4 — Graphs, DP & Interview Strategy
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M4, COURSE_ID } from './helpers';

export const module4: CourseModule = {
  id: M4,
  course_id: COURSE_ID,
  title: 'Module 4 — Graphs, DP & Interview Strategy',
  summary:
    'BFS/DFS/Dijkstra templates, the DP state-recurrence-habits loop, and how to run a 45-minute interview conversation.',
  sort_order: 4,
  lessons: [
    lesson(
      M4,
      'dsa-4-1',
      1,
      'Graph Traversal and Shortest Paths',
      'BFS, DFS, Dijkstra — three templates that cover most graph OAs.',
      12,
      nineBlocks({
        objectives: [
          'Implement BFS for unweighted shortest path and connected components',
          'Use DFS for cycles, topological order and flood fills',
          'Run Dijkstra with a min-heap and state when it is valid',
        ],
        hook: 'Maze shortest path is BFS. Course schedule is topological sort. Network delay is Dijkstra. Three templates, a whole category of OA problems.',
        concept: `**Graph representation:** adjacency list — map/list of node → neighbors. O(V+E) space. Prefer list over matrix unless dense (E ≈ V²) or you need O(1) edge queries.

**BFS:** queue, visit level by level. First time you reach a node in an unweighted graph is the shortest path length. Marks visited when enqueued, not when dequeued (avoids duplicates in queue).

**DFS:** stack or recursion. Use for components, cycle detection, topo sort (postorder reverse), bipartite check, flood fill. Watch recursion depth on large V — iterative DFS if V > ~10⁴.

**Topological sort:** only on a DAG. Kahn’s algorithm: compute in-degrees, enqueue zeros, peel nodes, reduce neighbors. If you cannot peel all nodes, a cycle exists.

**Dijkstra:** non-negative edge weights only. Min-heap of (dist, node); skip stale heap entries (dist > best known). O((V+E) log V). Invalid with negative weights — use Bellman-Ford instead.`,
        extras: [
          table('Which graph algo?', ['Problem shape', 'Algorithm'], [
            ['Unweighted shortest path', 'BFS'],
            ['Connected components / fill', 'DFS or BFS'],
            ['Dependency order / cycle in DAG', 'Topo sort (Kahn)'],
            ['Weighted, non-negative', 'Dijkstra'],
            ['Weighted, negative edges', 'Bellman-Ford'],
            ['All pairs', 'Floyd-Warshall'],
          ]),
          tip(
            'Mark visited on enqueue for BFS',
            'Otherwise the same node can enter the queue many times and explode runtime.',
          ),
        ],
        worked: {
          title: 'Shortest path in a 0/1 grid maze',
          problem: 'Grid with 0 (open) and 1 (walls). Find min steps from top-left to bottom-right, 4-directional moves.',
          steps: [
            { title: 'Choose algorithm', desc: 'Unweighted edges → BFS, not Dijkstra.' },
            { title: 'Seed queue', desc: 'Queue starts at (0,0) with dist 0; mark visited on enqueue.' },
            { title: 'Expand', desc: 'For each cell, try four neighbors; enqueue open unvisited cells with dist+1.' },
            { title: 'Answer', desc: 'The dist when the target is first reached.' },
          ],
          solution: 'O(rows×cols) time and space. First reach = shortest in an unweighted grid.',
        },
        practice: {
          title: 'Course schedule',
          prompt: 'prerequisites[i] = [a,b] means b before a. Return true if all courses can be finished.',
          hint: 'Topological sort; cycle means impossible.',
        },
        mistakes: [
          {
            mistake: 'Using Dijkstra on unweighted graphs',
            fix: 'BFS is simpler and asymptotically similar; Dijkstra adds log factor.',
          },
          {
            mistake: 'Marking visited too late in BFS',
            fix: 'Enqueue-time marking prevents duplicate queue entries.',
          },
        ],
        exam: {
          question: 'When is Dijkstra invalid?',
          answer: 'With negative edge weights — use Bellman-Ford (or SPFA carefully).',
          source: 'Standard graph follow-up.',
        },
        summary: [
          'BFS for unweighted shortest; DFS for structure and components.',
          'Kahn topo sort detects cycles via leftover in-degrees.',
          'Dijkstra: non-negative weights; skip stale heap pairs.',
        ],
      }),
      [
        [
          'BFS finds shortest path on:',
          ['Weighted positive graphs only', 'Unweighted (or unit-weight) graphs', 'Negative graphs', 'Disconnected only'],
          1,
          'First reach is optimal for unit edges.',
        ],
        [
          'Kahn’s algorithm detects cycles when:',
          ['Heap is empty', 'Fewer nodes are peeled than V', 'Queue is too big', 'Graph is directed'],
          1,
          'Leftover nodes imply a cycle.',
        ],
        [
          'Dijkstra with negative edges:',
          ['Still works', 'Fails / can loop wrong', 'Only with DFS', 'Needs bipartite graph'],
          1,
          'Use Bellman-Ford instead.',
        ],
      ]
    ),
    lesson(
      M4,
      'dsa-4-2',
      2,
      'Dynamic Programming & Interview Playbook',
      'State design, memoization/tabulation, and a repeatable 45-minute interview process.',
      12,
      nineBlocks({
        objectives: [
          'Define a DP state and recurrence for 1-D problems (climb stairs, house robber, coin change)',
          'Convert recursion + memo to bottom-up tabulation and space-optimize when possible',
          'Run a structured interview conversation: clarify → examples → brute → optimize → code → test',
        ],
        hook: 'DP feels like magic until you realize every solution is the same three questions: what is the state, what is the recurrence, and in what order do states depend? Ask those in order and most "hard" DPs become mechanical.',
        concept: `**DP recipe:**
1. **State** — the smallest subproblem signature (i, remaining, mask...).
2. **Recurrence** — how state S depends on smaller states.
3. **Base cases** — and the direction of evaluation (top-down memo or bottom-up).
4. **Answer** — which state is the goal.

**Climbing stairs:** dp[i] = dp[i-1] + dp[i-2]; dp[0]=1, dp[1]=1.

**House robber:** dp[i] = max(dp[i-1], dp[i-2]+a[i]) — skip or take.

**Coin change (min coins):** dp[x] = min over coins c of dp[x-c] + 1; dp[0]=0, else ∞.

**Space optimization:** if dp[i] only needs a constant window of previous states, keep just those variables (O(1) space).

**Interview playbook (45 min):**
1. Clarify inputs/outputs and constraints (2–3 min). Restate the goal.
2. Work a tiny example on the board (3 min).
3. State the brute force and its complexity (2 min) — even if you cannot code it.
4. Optimize: patterns (two pointers, heap, DP, graph) (5–10 min).
5. Agree on the approach, then code cleanly (15–20 min).
6. Dry-run with the example; test edge cases (empty, n=1, duplicates, negatives).
7. Discuss complexity and one follow-up. Ask if they want the optimal space version.`,
        extras: [
          table('DP starter kit', ['Problem', 'State', 'Recurrence'], [
            ['Climb stairs', 'dp[i] ways to floor i', 'dp[i-1]+dp[i-2]'],
            ['House robber', 'dp[i] best with first i houses', 'max(dp[i-1], dp[i-2]+a[i])'],
            ['Coin change', 'dp[x] min coins for x', 'min(dp[x-c]+1)'],
            ['LCS', 'dp[i][j] LCS of prefixes', 'match: dp[i-1][j-1]+1 else max'],
          ]),
          tip(
            'Say the state out loud before coding',
            'Interviewers grade the definition as much as the code.',
          ),
          warn(
            'Recursion without memo on DP',
            'Pure recursive solutions without memo are exponential — always show the memo or bottom-up form.',
          ),
        ],
        worked: {
          title: 'Coin change (min coins)',
          problem: 'Coins [1,3,4], amount 6. Minimum number of coins (or −1 if impossible).',
          steps: [
            { title: 'Define state', desc: 'dp[x] = min coins to make amount x; dp[0]=0.' },
            { title: 'Recurrence', desc: 'dp[x] = min over c in coins with c≤x of (dp[x-c]+1), or ∞ if none.' },
            { title: 'Fill table', desc: 'Fill x=1..6 in order.' },
            { title: 'Compute answer', desc: 'x=6: min(dp[5]+1, dp[3]+1, dp[2]+1) → dp[6]=2 (3+3).' },
          ],
          solution: 'dp = [0,1,2,1,2,2,2]; answer 2.',
        },
        practice: {
          title: 'House robber',
          prompt: 'Write the recurrence and base cases; code the O(1)-space version.',
          hint: 'Only need previous two values.',
        },
        mistakes: [
          {
            mistake: 'Wrong DP index meaning',
            fix: 'Define whether dp[i] is for prefix length i or index i — off-by-one lives here.',
          },
          {
            mistake: 'Skipping dry-run',
            fix: 'Always trace the example table before claiming correctness.',
          },
        ],
        exam: {
          question: 'State the coin-change recurrence for min coins.',
          answer: 'dp[x] = 1 + min(dp[x−c] for c in coins, c≤x), dp[0]=0, impossible = ∞.',
          source: 'Most-repeated DP interview problem.',
        },
        summary: [
          'DP = state + recurrence + base + evaluation order.',
          'Memoize top-down or tabulate bottom-up; optimize space when the window is small.',
          'Interview process: clarify → example → brute → optimize → code → test.',
        ],
      }),
      [
        [
          'First step of a DP solution:',
          ['Code the recursion', 'Define the state', 'Sort the input', 'Write tests'],
          1,
          'State precedes recurrence.',
        ],
        [
          'Climbing stairs recurrence is:',
          ['dp[i]=dp[i-1]', 'dp[i]=dp[i-1]+dp[i-2]', 'dp[i]=2*dp[i-1]', 'dp[i]=i!'],
          1,
          'Fibonacci-style.',
        ],
        [
          'In an interview you should state complexity:',
          ['Only if asked after coding', 'After agreeing the approach and after code', 'Never', 'Only for DP'],
          1,
          'Both points matter.',
        ],
      ]
    ),
  ],
};
