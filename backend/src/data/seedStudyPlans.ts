import type { StudyPlanPhase, StudyPlanTemplate } from './db';

/**
 * Starter template shipped on first run so a fresh install never serves an
 * empty or one-line roadmap. Static ids keep the bootstrap idempotent: it only
 * runs while the collections are absent, never over admin edits.
 *
 * Content is deliberately generic engineering-interview preparation. Nothing
 * here claims to be company-specific intelligence.
 */
const SEED_TEMPLATE_ID = 'spt-seed-generic-swe';

const phase = (
  order: number,
  id: string,
  title: string,
  dayFrom: number,
  dayTo: number | null,
  summary: string,
  blocks: StudyPlanPhase['blocks']
): StudyPlanPhase => ({
  id,
  template_id: SEED_TEMPLATE_ID,
  phase_order: order,
  title,
  day_from: dayFrom,
  day_to: dayTo,
  summary,
  blocks,
});

export function seedStudyPlanTemplates(): {
  templates: StudyPlanTemplate[];
  phases: StudyPlanPhase[];
} {
  const now = new Date().toISOString();

  const template: StudyPlanTemplate = {
    id: SEED_TEMPLATE_ID,
    title: 'Software Engineering Interview Preparation',
    slug: 'software-engineering-interview-preparation',
    company_id: '',
    company_name: '',
    role: '',
    status: 'published',
    version: 1,
    created_at: now,
    updated_at: now,
    updated_by: 'system',
  };

  const phases: StudyPlanPhase[] = [
    phase(
      1,
      'spp-seed-01',
      'Set Your Baseline & Frame Your Story',
      1,
      2,
      'Decide what you are actually being interviewed for, then build the narrative that carries you through every round.',
      [
        {
          id: 'spb-seed-0101',
          block_type: 'markdown',
          block_order: 1,
          payload: {
            text: [
              '### Start here',
              '',
              'Most candidates lose rounds in the first ten minutes because they never decided what story they are telling. Write it down before you write any code.',
              '',
              '1. **Name the exact role.** "Backend SDE-1 at a product company" and "Full-stack SDE-1 at a product company" have different interview weights. Pick one line and stay on it.',
              '2. **List your three strongest projects.** For each, be able to answer: what problem, why that design, what you personally built, what you would change today.',
              '3. **Write your one-line pitch.** Thirty seconds, no jargon, no "passionate about". Example: *"I build backend systems that keep financial data consistent under load, most recently at a payments company."*',
              '4. **Set your time budget.** Divide the remaining days across phases. A plan you finish beats a plan you abandon on day five.',
            ].join('\n'),
          },
        },
        {
          id: 'spb-seed-0102',
          block_type: 'checklist',
          block_order: 2,
          payload: {
            title: 'Day 1-2 deliverables',
            items: [
              'Target role and company written on one line',
              'Resume trimmed to one page, no role-specific formatting hacks',
              'Three project deep-dives written in the problem → design → build → improve shape',
              'Thirty-second pitch recorded on your phone, played back twice',
              'Realistic day budget agreed with yourself',
              'Two questions written for the interviewer (never walk in with none)',
            ],
          },
        },
        {
          id: 'spb-seed-0103',
          block_type: 'callout',
          block_order: 3,
          payload: {
            style: 'info',
            title: 'Why this phase is first',
            text: 'Interviewers form an early hypothesis about your level. A crisp, specific story in the opening minutes raises the bar for the rest of the round, and it makes the hard questions easier to answer honestly.',
          },
        },
      ]
    ),
    phase(
      2,
      'spp-seed-02',
      'Data Structures & Algorithms',
      3,
      9,
      'The largest single block of marks in most loops. Master the patterns, not the problem list.',
      [
        {
          id: 'spb-seed-0201',
          block_type: 'markdown',
          block_order: 1,
          payload: {
            text: [
              '### Learn patterns, not problems',
              '',
              'Interviews reuse roughly a dozen patterns with new wrappers. If you can recognise the pattern in the first ninety seconds, you are already ahead of most candidates who memorised 300 solutions.',
              '',
              '- **Core linear structures** — arrays, linked lists, stacks, queues, deques. Two pointers, sliding window, prefix sums.',
              '- **Non-linear** — hash maps, heaps, balanced trees, tries, disjoint-set union.',
              '- **Graphs** — BFS/DFS, topological sort, connected components, shortest path, union-find.',
              '- **Advanced** — binary search on answer, backtracking, greedy with proof, DP on trees and intervals.',
              '',
              'For every problem, say the complexity out loud **before** you write code, then state the space cost. Interviewers grade your reasoning as much as the result.',
            ].join('\n'),
          },
        },
        {
          id: 'spb-seed-0202',
          block_type: 'table',
          block_order: 2,
          payload: {
            title: 'Complexity cheat sheet',
            headers: ['Structure', 'Lookup', 'Insert', 'Delete', 'Typical use'],
            rows: [
              ['Array / dynamic array', 'O(1) index', 'O(1) amortised', 'O(1) end / O(n) middle', 'Sliding window, prefix sums'],
              ['Hash map', 'O(1) avg', 'O(1) avg', 'O(1)', 'Frequency counts, memoisation'],
              ['Heap (priority queue)', 'O(1) peek', 'O(log n)', 'O(log n)', 'Top-k, Dijkstra, merge K lists'],
              ['Binary search tree', 'O(n) worst', 'O(log n) balanced', 'O(log n)', 'Ordered queries, in-order traversal'],
              ['Trie', 'O(L) prefix', 'O(L)', 'O(L)', 'Autocomplete, word search'],
              ['Graph (adjacency list)', 'O(V+E)', 'O(1)', 'O(V)', 'BFS, DFS, shortest path'],
            ],
          },
        },
        {
          id: 'spb-seed-0203',
          block_type: 'checklist',
          block_order: 3,
          payload: {
            title: 'Practice gate — do not skip ahead until this passes',
            items: [
              'Two pointers and sliding window: 6 problems solved from scratch',
              'Heap problems: able to explain when a min-heap beats sorting',
              'BFS and DFS: can state when each is the right tool before coding',
              'Binary search on answer: practised at least twice',
              'Backtracking: template internalised, including pruning',
              'Every problem: complexity stated aloud first, edge cases named',
              'At least one timed set of 3 problems in 75 minutes',
            ],
          },
        },
        {
          id: 'spb-seed-0204',
          block_type: 'resources',
          block_order: 4,
          payload: {
            title: 'Where to practise',
            links: [
              { label: 'LeetCode — problem list, filter by pattern', url: 'https://leetcode.com/problemset/' },
              { label: 'NeetCode roadmap — curated pattern ordering', url: 'https://neetcode.io/pramp' },
              { label: 'CP-Algorithms — reference explanations', url: 'https://cp-algorithms.com/' },
              { label: 'Big-O cheat sheet', url: 'https://www.bigocheatsheet.com/' },
            ],
          },
        },
      ]
    ),
    phase(
      3,
      'spp-seed-03',
      'Computer Science Fundamentals',
      10,
      14,
      'Operating systems, networking and databases — the questions that separate a mid-level hire from a senior one.',
      [
        {
          id: 'spb-seed-0301',
          block_type: 'markdown',
          block_order: 1,
          payload: {
            text: [
              '### Operating systems',
              '',
              '- Process vs thread, and why context switching costs you throughput',
              '- Race conditions, mutexes vs semaphores, and deadlock conditions',
              '- Paging, virtual memory, page faults, and what a page fault really costs',
              '- I/O models: blocking, non-blocking, async/await, and when each is correct',
              '',
              '### Networking',
              '',
              '- What happens between typing a URL and the first byte of the response',
              '- TCP vs UDP, three-way handshake, and reliability trade-offs',
              '- HTTP status classes, keep-alive, TLS handshake, and proxies',
              '- Idempotency, retries with backoff, rate limiting, and load balancing',
              '',
              '### Databases',
              '',
              '- Indexes: B-tree structure, composite index column order, covering indexes',
              '- Normalisation vs denormalisation, and the read/write trade-off',
              '- ACID, isolation levels, and what a non-repeatable read means in practice',
              '- Connection pooling, N+1 queries, and pagination strategies',
            ].join('\n'),
          },
        },
        {
          id: 'spb-seed-0302',
          block_type: 'callout',
          block_order: 2,
          payload: {
            style: 'tip',
            title: 'How to answer a fundamentals question you have forgotten',
            text: 'Say what you remember, name the trade-off you are sure about, and say plainly that you would look it up. "I do not remember the exact page size, but it is chosen to match disk block size so one disk read maps to one page" is a strong answer. Bluffing a number is not.',
          },
        },
        {
          id: 'spb-seed-0303',
          block_type: 'checklist',
          block_order: 3,
          payload: {
            title: 'Fundamentals self-test',
            items: [
              'Can explain the full URL-to-response path in under three minutes',
              'Can describe deadlock and give a real prevention strategy',
              'Can state all four ACID properties with an example failure each',
              'Can explain why a composite index on (a, b) does not help queries filtering on b alone',
              'Can describe what happens when a query plan ignores your index',
            ],
          },
        },
      ]
    ),
    phase(
      4,
      'spp-seed-04',
      'System Design Fundamentals',
      15,
      19,
      'Start from requirements, not from Kafka. A structured, honest design beats a fashionable stack.',
      [
        {
          id: 'spb-seed-0401',
          block_type: 'markdown',
          block_order: 1,
          payload: {
            text: [
              '### The four-step frame',
              '',
              '1. **Clarify requirements.** Functional, non-functional, and the actual scale. Estimate users, requests per second, and read/write ratio out loud before drawing anything.',
              '2. **Estimate the numbers.** Daily active users, peak multiplier, storage per entity, bandwidth. Rough arithmetic is fine — showing the method is the point.',
              '3. **Design the high-level shape.** API surface, main services, storage choice, and the data flow. Then go deep on exactly one component, usually the one the interviewer picks.',
              '4. **Discuss the trade-offs.** Caching, sharding, replication, queues, consistency model, and what breaks first under ten times the load.',
              '',
              'Red flags in a design round: jumping to a specific technology before requirements are agreed, ignoring failure modes, and designing for a scale nobody asked for.',
            ].join('\n'),
          },
        },
        {
          id: 'spb-seed-0402',
          block_type: 'table',
          block_order: 2,
          payload: {
            title: 'Common building blocks and when to reach for them',
            headers: ['Building block', 'Reach for it when', 'Cost you pay'],
            rows: [
              ['Cache (Redis)', 'Read-heavy, tolerance for stale data', 'Invalidation logic, two failure modes'],
              ['Message queue', 'Need to absorb bursts or decouple services', 'Ordering, duplicates, eventual consistency'],
              ['Read replicas', 'Reads dominate and can be slightly stale', 'Replication lag, failover complexity'],
              ['Sharding', 'Single-node storage or write throughput is the ceiling', 'Cross-shard queries, rebalancing, hot shards'],
              ['CDN', 'Static or cacheable content, global users', 'Cache invalidation on deploy'],
              ['Idempotency keys', 'Any retried write, payments, order creation', 'Storage for keys, TTL decisions'],
            ],
          },
        },
        {
          id: 'spb-seed-0403',
          block_type: 'checklist',
          block_order: 3,
          payload: {
            title: 'Before you finish any design round',
            items: [
              'Requirements and scale stated out loud at the start',
              'Numbers estimated, not guessed',
              'Exactly one component taken deep rather than five taken shallow',
              'Data model stated with the access patterns it supports',
              'One failure scenario walked end to end',
              'Metrics named: what you would alert on in production',
            ],
          },
        },
      ]
    ),
    phase(
      5,
      'spp-seed-05',
      'Project Deep-Dive & Behavioural',
      20,
      23,
      'The round where most technically strong candidates lose. Prepare specifics, not adjectives.',
      [
        {
          id: 'spb-seed-0501',
          block_type: 'markdown',
          block_order: 2 - 1,
          payload: {
            text: [
              '### Answering "tell me about a project"',
              '',
              'Use a fixed 90-second structure and reuse it every time:',
              '',
              '- **Context (15s)** — what the product did and why it existed',
              '- **Your role (15s)** — the part you personally owned, stated plainly',
              '- **The hard part (30s)** — the trade-off you made and the alternative you rejected',
              '- **The outcome (20s)** — a number, a latency improvement, a defect class removed',
              '- **The reflection (10s)** — what you would redo, which reads as senior',
              '',
              'Never describe a team as "we" for the work you did, and never claim ownership of a decision you cannot defend under follow-up questions.',
            ].join('\n'),
          },
        },
        {
          id: 'spb-seed-0502',
          block_type: 'checklist',
          block_order: 2,
          payload: {
            title: 'STAR stories to have ready',
            items: [
              'Conflict with a teammate, and how you resolved it without escalation',
              'A deadline you missed, and what you did about it',
              'The best technical decision you made that a reviewer initially disagreed with',
              'A production incident you were involved in',
              'Receiving harsh feedback, and what changed afterwards',
              'A time you said no to a scope increase, and how you handled it',
            ],
          },
        },
        {
          id: 'spb-seed-0503',
          block_type: 'callout',
          block_order: 3,
          payload: {
            style: 'warning',
            title: 'If you do not have a real example',
            text: 'Say so and pivot to a hypothetical: "I have not handled that exact situation, but here is how I would approach it." Interviewers accept this far more often than a stretched story that collapses on the second question.',
          },
        },
      ]
    ),
    phase(
      6,
      'spp-seed-06',
      'Mock Drives & Final Review',
      24,
      28,
      'Simulate the real loop under real time pressure, then fix what the mocks actually exposed.',
      [
        {
          id: 'spb-seed-0601',
          block_type: 'markdown',
          block_order: 1,
          payload: {
            text: [
              '### Rehearse the whole loop, not just the questions',
              '',
              '- **Full mock drives.** 45 minutes, one algorithm problem, one project deep-dive, one design question, and behavioural questions at the end. Do it on a call, out loud, with someone watching.',
              '- **Explain while you code.** Narrate your reasoning continuously. Silent coding is read as guessing.',
              '- **Log every mock.** Write down what you fumbled, not what you answered well. Patterns repeat across mocks.',
              '- **Close the loop.** Re-solve every problem you could not finish within the time limit, without a timer this time.',
            ].join('\n'),
          },
        },
        {
          id: 'spb-seed-0602',
          block_type: 'checklist',
          block_order: 2,
          payload: {
            title: 'Final gate — the week of the interview',
            items: [
              'Two full mock drives completed with a human',
              'Weakest three topics re-studied and re-tested cold',
              'Resume, pitch and three project stories rehearsed aloud',
              'Company research done honestly: products, public engineering blog, recent news',
              'Questions for the interviewer written down',
              'Logistics confirmed: link, time zone, camera, backup phone charged',
            ],
          },
        },
        {
          id: 'spb-seed-0603',
          block_type: 'callout',
          block_order: 3,
          payload: {
            style: 'info',
            title: 'On company-specific preparation',
            text: 'This plan covers standard engineering interview preparation. Company-specific process details change often and are not verified here — check the company page on this site and confirm anything time-sensitive with your recruiter before relying on it.',
          },
        },
      ]
    ),
  ];

  return { templates: [template], phases };
}
