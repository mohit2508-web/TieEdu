/**
 * "Advanced Data Structures" — the paid course.
 *
 * This is the first course in the catalogue that is not free, so it exists to
 * exercise a real purchase path rather than a simulated one. Everything the
 * checkout, the cart, the price filters and the enrolment gate read has to be a
 * genuine stored value, because a paid course with a fabricated price, a fake
 * discount or an invented "12,000 learners" figure is a lie with a checkout
 * button attached.
 *
 * Two deliberate omissions, both because the value is not known yet:
 *
 *   - `instructor_id` is left null. The public page then renders no instructor
 *     block at all, which is the correct outcome for a course whose teacher has
 *     not been recorded. Assigning a placeholder name would be worse than an
 *     empty section.
 *   - There is no rating, review count or enrolment count seeded. Those are
 *     signals the platform earns from real learners; writing them into seed data
 *     would make the very first visitor see a social proof claim that nobody made.
 *
 * The prerequisite is `crs-c-programming`, which is a real course in the
 * catalogue whose own title ends at "Data Structures". Pointer arithmetic and
 * manual memory are genuinely assumed here, and that course is where a learner
 * would have met them.
 *
 * The curriculum is deliberately compact and complete rather than padded: three
 * modules that each close a loop, with a graded quiz at the end of each. A
 * fifteen-module course of thin lessons would look more impressive in the
 * catalogue and teach less.
 */

import type { Course, CourseLesson, CourseModule, ContentBlockRecord } from '../db';

/**
 * A block before it has been given an id and a position.
 *
 * Ids are namespaced per lesson by `lesson()` below, so a lesson's block ids are
 * stable and unique across the whole course - which matters because progress and
 * the "resume where you left off" anchor both address blocks by id.
 */
type BlockSpec = { block_type: ContentBlockRecord['block_type']; payload: Record<string, any> };

const md = (text: string): BlockSpec => ({ block_type: 'markdown', payload: { text } });

/** A titled lead-in. A markdown `###` with a stable visual weight. */
const lead = (text: string): BlockSpec => ({ block_type: 'markdown', payload: { text: `### ${text}` } });

const tip = (title: string, text: string): BlockSpec => ({
  block_type: 'callout',
  payload: { style: 'tip', title, text },
});
const warn = (title: string, text: string): BlockSpec => ({
  block_type: 'callout',
  payload: { style: 'warning', title, text },
});
const code = (codeText: string, filename: string, language: string): BlockSpec => ({
  block_type: 'code',
  payload: { code: codeText, filename, language },
});
const table = (title: string, headers: string[], rows: string[][]): BlockSpec => ({
  block_type: 'table',
  payload: { title, headers, rows },
});

/** One lesson. `sort` is its 1-based position inside the module. */
const lesson = (
  moduleId: string,
  id: string,
  sort: number,
  title: string,
  summary: string,
  duration: number,
  blocks: BlockSpec[],
  questions?: [string, string[], number, string][],
): CourseLesson => ({
  id,
  module_id: moduleId,
  title,
  summary,
  sort_order: sort,
  duration_minutes: duration,
  xp_reward: 40,
  video: null,
  // Ids and order are assigned here rather than by each helper, so they are
  // derived from the lesson's own id and can never collide across lessons.
  blocks: blocks.map((spec, i) => ({
    id: `${id}-b${String(i + 1).padStart(2, '0')}`,
    block_type: spec.block_type,
    block_order: i + 1,
    payload: spec.payload,
  })),
  quiz: questions
    ? {
        id: `quiz-${id}`,
        passing_percent: 70,
        questions: questions.map(([prompt, options, correct_index, explanation], i) => ({
          id: `${id}-q${i + 1}`,
          prompt,
          options,
          correct_index,
          explanation,
        })),
      }
    : null,
});

const M1 = 'ads-m1';
const M2 = 'ads-m2';
const M3 = 'ads-m3';

const modules: CourseModule[] = [
  {
    id: M1,
    course_id: 'crs-advanced-data-structures',
    title: 'Module 1 — Complexity, and reading it honestly',
    summary: 'Big-O as a statement about growth, the operations that dominate real programs, and the costs that Big-O hides.',
    sort_order: 1,
    lessons: [
      lesson(
        M1,
        'ads-1-1',
        1,
        'What Big-O actually claims',
        'The definition, stated precisely, and the three things it deliberately does not tell you.',
        13,
        [
          md(`## The claim Big-O makes

Big-O notation is a statement about **how a cost grows as the input grows**, and nothing else. Formally, a function \`f(n)\` is O(g(n)) if there is some constant \`c\` and some \`n₀\` such that for all \`n > n₀\`, \`f(n) ≤ c·g(n)\`.

Read that definition carefully, because three things fall out of it that people routinely get wrong.

**Constants are absorbed.** O(3n) and O(n) are the same class. This is why an algorithm with a lower big-O can still lose a benchmark at small n — and why "but it's only a factor of two" is not an argument against an O(n log n) sort.

**The bound is not tight.** O(n²) is also O(n³) and O(2ⁿ). Big-O names a ceiling, not the actual cost. When you need the actual cost, the notation is \`Θ\` (theta), which bounds from both sides.

**It says nothing about constants, allocation, or memory.** Big-O is time. Space complexity is a separate claim. A linear-time algorithm that allocates a gigabyte per call can lose to a quadratic one that allocates nothing.`),
          lead('A useful test: if you cannot state what n is for a given function, you do not yet have an algorithm, you have code.'),
          table(
            'Growth, roughly, for n = 1,000,000',
            ['Class', 'Operations', 'Real-world analogue'],
            [
              ['O(1)', '1', 'Array index, hash lookup'],
              ['O(log n)', '20', 'Binary search, balanced-tree descent'],
              ['O(n)', '1,000,000', 'One pass over a file'],
              ['O(n log n)', '20,000,000', 'Comparison sort — the practical ceiling'],
              ['O(n²)', '1,000,000,000,000', 'Nested loops over all pairs'],
              ['O(2ⁿ)', 'unreachable', 'Brute-force subset enumeration'],
            ]
          ),
          tip(
            'Why the crossover is where it is',
            'Insertion sort is O(n²) and beats every library sort below roughly n = 20, because its inner loop is a compare and a shift on data already in cache. Timsort exploits the same fact. "Worse complexity" is not "always slower".'
          ),
          warn(
            'The most common misuse',
            'Dropping a term because it "does not matter asymptotically" while ignoring that it runs on every request. If the constant is 10¹² you have a real problem regardless of the notation.'
          ),
        ],
        [
          [
            'What does O(n log n) tell you about an algorithm?',
            [
              'Its cost grows no faster than n log n',
              'Its cost is exactly n log n',
              'It uses n log n bytes of memory',
              'It runs in n log n operations on every input size',
            ],
            0,
            'Big-O is an upper bound only, so "no faster than" is the accurate reading. The other options either overstate it (exactly) or switch to a different claim (memory, every input).'
          ],
          [
            'An algorithm is O(n) but takes 40 seconds on 10 million items. Is that a contradiction?',
            [
              'Yes, O(n) must be fast in absolute terms',
              'No — Big-O hides the constant, and a huge constant can still dominate',
              'No — it is probably O(n log n) in disguise',
              'Yes — 10 million items should be under one second',
            ],
            1,
            'The constant factor is entirely outside the notation. This is exactly the case where "but asymptotically better" does not rescue the code.'
          ],
          [
            'Why is a hash map lookup usually quoted as O(1) even though it is really O(n) in the worst case?',
            [
              'Because the worst case cannot happen in practice',
              'Because O(1) is the average case and we state that separately',
              'Because hashing is a constant-time operation',
              'Because the table is resized to stay full',
            ],
            1,
            'It is an expected/average-case bound. Saying "O(1)" unqualified hides that an adversarial key set can degrade it — the reason adversarial-hash DoS is a real vulnerability.'
          ],
        ]
      ),
      lesson(
        M1,
        'ads-1-2',
        2,
        'The operations that actually dominate',
        'Counting, not guessing: instrument a real workload and find the hot operations before optimising anything.',
        15,
        [
          md(`## Optimise the thing you measured

The instinct to improve an algorithm before measuring is the single most common way to waste a week. In most real services, a surprising fraction of time is spent somewhere that has nothing to do with the algorithm anyone is worried about.

In a typical request-serving service, the rough split is:

- **Network and serialisation** — often the largest single cost, and invisible in profiles that only look at CPU.
- **Database round-trips** — a query plan matters more than your loop.
- **Allocation and garbage collection** — proportional to bytes touched, not to algorithmic elegance.
- **The actual algorithm** — frequently a small slice of the total.

The corollary is uncomfortable: making an O(n²) call into an O(n log n) call on a function that consumed 2% of the request time improves the request by well under 2%.`),
          lead('Measure first, then decide. The complexity class tells you the ceiling on your win; the profiler tells you the size of it.'),
          code(
            `// Before assuming: count what the request actually spends time in.
const t0 = performance.now();
const rows = await db.query(SQL, params);
const t1 = performance.now();

const ranked = rank(rows);          // the "slow algorithm"
const t2 = performance.now();

console.log({
  query_ms:   +(t1 - t0).toFixed(1),
  rank_ms:    +(t2 - t1).toFixed(1),
  query_share: +(((t1 - t0) / (t2 - t0)) * 100).toFixed(1),
});`,
            'measure.ts',
            'ts'
          ),
          tip(
            'Amortised cost is the number to reason with',
            'A dynamic array that occasionally doubles has an O(n) worst-case push but O(1) amortised. Hash resizing and repeated string concatenation in a loop are the same shape. Judge data structures by amortised cost over a run, not by a single worst case.'
          ),
          warn(
            'Cache and asymptotics are different axes',
            'An O(n) pass over a 200 MB array with sequential access can beat an O(log n) binary search over the same data, because each cache miss costs more than a hundred arithmetic operations. Both facts are true; which one wins is a measurement question.'
          ),
        ]
      ),
    ],
  },
  {
    id: M2,
    course_id: 'crs-advanced-data-structures',
    title: 'Module 2 — Structures that hold data under pressure',
    summary: 'Hashing, trees, heaps and the trade-offs between them, built and benchmarked rather than defined.',
    sort_order: 2,
    lessons: [
      lesson(
        M2,
        'ads-2-1',
        1,
        'Hashing, and why the worst case is a security problem',
        'Buckets, collisions, load factor, and the deliberate-collision denial of service.',
        16,
        [
          md(`## How a hash table actually works

A hash table is an array of buckets. A key is run through a hash function to get an index; the entry goes in that bucket. Lookup repeats the process and scans the bucket for a key match.

That is the whole idea, and every property of the structure follows from two numbers: the **load factor** (entries ÷ buckets) and the **average bucket length** (itself a function of load factor and how good the hash is).

**Resizing.** When the load factor crosses a threshold, the table doubles and every entry is rehashed. Doubling rather than growing by a fixed amount is what keeps the *amortised* cost of an insert O(1): each entry is moved O(log n) times over its lifetime, so the average cost per insert is constant.

**Collisions are not exceptional.** With a decent hash and a reasonable load factor, some buckets hold two entries all the time. Open addressing (probe forward) and chaining (linked list per bucket) are the two standard resolutions, and the choice trades cache locality against memory overhead.`),
          lead('Hashing gives you O(1) *expected* behaviour, not guaranteed. The gap between those two words is where a denial-of-service bug lives.'),
          code(
            `// Chaining: each bucket is a small list.
type Bucket<V> = Array<[string, V]>;

class HashMap<V> {
  private buckets: Bucket<V>[];
  private count = 0;

  constructor(private readonly capacity = 16) {
    this.buckets = Array.from({ length: capacity }, () => []);
  }

  private index(key: string): number {
    // FNV-1a: cheap, well-distributed for short ASCII keys.
    let h = 0x811c9dc5;
    for (let i = 0; i < key.length; i++) {
      h ^= key.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0) % this.buckets.length;
  }

  get loadFactor(): number {
    return this.count / this.buckets.length;
  }

  set(key: string, value: V): void {
    const bucket = this.buckets[this.index(key)];
    const existing = bucket.find(([k]) => k === key);
    if (existing) { existing[1] = value; return; }

    bucket.push([key, value]);
    this.count++;

    // Grow at 0.75 load, then rehash every key.
    if (this.loadFactor > 0.75) this.grow();
  }

  private grow(): void {
    const old = this.buckets;
    this.buckets = Array.from({ length: old.length * 2 }, () => []);
    this.count = 0;
    for (const bucket of old) {
      for (const [k, v] of bucket) this.set(k, v);
    }
  }
}`,
            'hashmap.ts',
            'ts'
          ),
          warn(
            'Adversarial collisions are a denial-of-service vector',
            'If an attacker can submit keys, they can search for keys that all land in one bucket. A table that was O(1) becomes O(n) per operation, and enough of them becomes a CPU-exhaustion attack. This is why some runtimes randomise the hash seed per process: it does not make collisions impossible, it makes them un-targetable by the attacker.'
          ),
          tip(
            'Hash maps do not preserve order',
            'If you find yourself sorting a `Map`\'s keys on every request, you have built an ordered structure with an O(n log n) tax on every operation. Either keep a sorted array alongside, or use a tree.'
          ),
        ],
        [
          [
            'Why does a hash table grow by doubling rather than by 10%?',
            [
              'Doubling uses less memory',
              'Doubling keeps the amortised cost of each insert O(1), because each entry is rehashed only O(log n) times',
              'A 10% growth factor reduces collisions more effectively',
              'It is only faster to rehash in practice, the theory is the same',
            ],
            1,
            'With 10% growth, an entry is rehashed O(n) times over its life, so the total cost of n inserts is O(n²) and there is no amortised guarantee. Doubling is what makes the bound hold.'
          ],
          [
            'A service accepts user-supplied keys and a hash map has slowed to a crawl. What is the most likely cause?',
            [
              'The load factor is too low',
              'The hash function is colliding for the supplied keys, so buckets are long',
              'The table needs to be shrunk',
              'Reshashing happens too often',
            ],
            1,
            'Attacker-chosen keys that collide defeat the expected O(1). This is the classic algorithmic-complexity DoS, and the fix is a seeded or randomised hash.'
          ],
          [
            'What does the load factor of 0.75 with chaining actually tell you?',
            [
              '75% of lookups are cache misses',
              'On average 0.75 entries per bucket, which is the target the table resizes to maintain',
              'The table will resize again after 75% more inserts',
              'Memory usage is 75% of the bucket array',
            ],
            1,
            'Load factor is entries per bucket, so 0.75 means the average bucket holds about 0.75 entries. The table grows to keep it there, which bounds expected bucket length and therefore expected lookup cost.'
          ],
        ]
      ),
      lesson(
        M2,
        'ads-2-2',
        2,
        'Trees: when order is the requirement',
        'Binary search trees, the balance invariant, and what self-balancing actually buys you.',
        18,
        [
          md(`## The problem trees solve

A hash map gives O(1) expected but no ordering. Sometimes ordering *is* the requirement:

- "the 10 cheapest orders in this range" — needs order, not membership.
- "everything between 12:00 and 14:00" — a range query.
- "next available slot" — ordered search, not equality.

A binary search tree stores keys so that an in-order traversal yields them sorted. The search cost is O(height), which is the whole story: a balanced tree has height O(log n) and gives O(log n) search; a degenerate tree has height O(n) and gives back the linear scan you were trying to avoid.`),
          lead('A BST without a balance invariant is a liability. Inserting sorted data into a naive BST produces a linked list with extra pointer dereferences.'),
          code(
            `// Red-black tree: the rotation and recolour rules, in full.
type Colour = 'R' | 'B';

class RBNode<K, V> {
  left: RBNode<K, V> | null = null;
  right: RBNode<K, V> | null = null;
  parent: RBNode<K, V> | null = null;
  colour: Colour = 'R';
  constructor(public key: K, public value: V) {}
}

const RED = 'R', BLACK = 'B';

function isRed<K, V>(n: RBNode<K, V> | null): boolean {
  return n !== null && n.colour === RED;
}

class RedBlackTree<K, V> {
  private root: RBNode<K, V> | null = null;

  // Rotations. Left rotate turns a right-leaning 3-node into a left-leaning one.
  private rotateLeft<K2, V2>(x: RBNode<K2, V2>): RBNode<K2, V2> {
    const y = x.right!;
    x.right = y.left;
    if (y.left) y.left.parent = x;
    y.parent = x.parent;
    if (!x.parent) this.root = y;
    else if (x === x.parent.left) x.parent.left = y;
    else x.parent.right = y;
    if (y.left) y.left.parent = y;
    y.left = x;
    x.parent = y;
    return y;
  }

  private rotateRight<K2, V2>(y: RBNode<K2, V2>): RBNode<K2, V2> {
    const x = y.left!;
    y.left = x.right;
    if (x.right) x.right.parent = y;
    x.parent = y.parent;
    if (!y.parent) this.root = x;
    else if (y === y.parent.left) y.parent.left = x;
    else y.parent.right = x;
    if (x.right) x.right.parent = x;
    x.right = y;
    y.parent = x;
    return x;
  }

  // Fix-up after an insert, restoring the black-height property.
  private insertFixup<K2, V2>(z: RBNode<K2, V2>): void {
    while (z.parent && isRed(z.parent)) {
      const p = z.parent, g = p.parent!;

      if (p === g.left) {
        const uncle = g.right;
        if (isRed(uncle)) {
          p.colour = BLACK; uncle.colour = BLACK; g.colour = RED;
          z = g;                       // Case 1: recolour and move up
        } else {
          if (z === p.right) { z = p; this.rotateLeft(z); }   // Case 2: inner child
          z.parent!.colour = BLACK;                             // Case 3: outer child
          g.colour = RED;
          this.rotateRight(g);
        }
      } else {
        // Mirror image of the above.
        const uncle = g.left;
        if (isRed(uncle)) {
          p.colour = BLACK; uncle.colour = BLACK; g.colour = RED;
          z = g;
        } else {
          if (z === p.left) { z = p; this.rotateRight(z); }
          z.parent!.colour = BLACK;
          g.colour = RED;
          this.rotateLeft(g);
        }
      }
    }
    this.root!.colour = BLACK;
  }
}`,
            'red-black.ts',
            'ts'
          ),
          table(
            'Structure comparison',
            ['Structure', 'Lookup', 'Ordered?', 'Insert', 'Best for'],
            [
              ['Hash map', 'O(1) expected', 'No', 'O(1) amortised', 'Membership, counting, dedupe'],
              ['Balanced BST', 'O(log n)', 'Yes', 'O(log n)', 'Range queries, ranked access'],
              ['B-tree / B+ tree', 'O(log n)', 'Yes', 'O(log n)', 'On-disk and page-cached indexes'],
              ['Heap', 'O(log n) peek', 'Partial', 'O(log n)', 'Priority queues, top-k'],
              ['Skip list', 'O(log n) expected', 'Yes', 'O(log n) expected', 'Concurrent ordered maps'],
            ]
          ),
          tip(
            'B+ trees are why your database is fast',
            'Disk pages hold hundreds of keys, so a B+ tree of fanout 500 has height 3 for billions of rows. That is why "sequential index access" beats a hash lookup for range queries in every real RDBMS.'
          ),
        ],
        [
          [
            'You insert keys 1..1,000,000 in ascending order into a naive BST. What is the resulting lookup cost?',
            [
              'O(log n) — insertion order does not matter',
              'O(n) — the tree degenerates into a linked list',
              'O(n log n)',
              'O(1) — the tree self-balances',
            ],
            1,
            'A naive BST with sorted input puts every new node as the rightmost child, giving height n. This is exactly the failure that balance invariants exist to prevent.'
          ],
          [
            'Which query is the hash map structurally unable to answer efficiently?',
            [
              'Does this exact key exist?',
              'How many distinct keys are there?',
              'List all keys between "m" and "p" in order',
              'Is this value already in the set?',
            ],
            2,
            'Hash maps expose no order, so a range query degrades to scanning every bucket and sorting the survivors — O(n) plus O(n log n).'
          ],
          [
            'What invariant does the red-black colour property maintain?',
            [
              'That keys are stored in sorted order in memory',
              'That no two adjacent nodes are red, keeping every root-to-leaf path within a factor of two of every other',
              'That the tree never needs to rotate',
              'That every leaf is at the same depth',
            ],
            1,
            'Equal black-heights on all root-to-leaf paths are what bound the height to 2·log₂(n+1). Adjacent reds are what make the fix-up cases tractable.'
          ],
        ]
      ),
      lesson(
        M2,
        'ads-2-3',
        3,
        'Heaps, priority queues and top-k without sorting',
        'The binary heap invariant, sift-up/sift-down, and the O(n log k) trick for top-k problems.',
        14,
        [
          md(`## The heap invariant

A binary heap is a complete binary tree stored in a flat array, where every parent is at least as large as (max-heap) or at most as large as (min-heap) each of its children. The key property is what you get *without* the tree being sorted: the root is always the extreme element, in O(1).

That is all a priority queue needs, and it is why heaps beat balanced trees for this job: no pointers, no rebalancing, excellent cache behaviour, and insertion is O(log n) amortised with a very small constant.`),
          lead('For "what is the largest / next / most urgent thing", a heap is the right structure. Reach for a tree only when you also need ordered traversal.'),
          code(
            `// Min-heap over an array. Index arithmetic replaces pointers entirely:
// children of i are 2i+1 and 2i+2, parent of i is (i-1)/2.
class MinHeap<T> {
  private a: T[] = [];

  constructor(private readonly less: (x: T, y: T) => boolean) {}

  get size(): number { return this.a.length; }
  peek(): T | undefined { return this.a[0]; }

  push(v: T): void {
    this.a.push(v);
    this.siftUp(this.a.length - 1);
  }

  pop(): T | undefined {
    if (this.a.length === 0) return undefined;
    const top = this.a[0];
    const last = this.a.pop()!;
    if (this.a.length > 0) {
      this.a[0] = last;
      this.siftDown(0);
    }
    return top;
  }

  private siftUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.less(this.a[i], this.a[parent])) break;
      [this.a[i], this.a[parent]] = [this.a[parent], this.a[i]];
      i = parent;
    }
  }

  private siftDown(i: number): void {
    const n = this.a.length;
    for (;;) {
      const l = 2 * i + 1, r = l + 1;
      let smallest = i;
      if (l < n && this.less(this.a[l], this.a[smallest])) smallest = l;
      if (r < n && this.less(this.a[r], this.a[smallest])) smallest = r;
      if (smallest === i) break;
      [this.a[i], this.a[smallest]] = [this.a[smallest], this.a[i]];
      i = smallest;
    }
  }
}

// Top-k from a stream in O(n log k) — no sort, and O(k) memory.
function topK<T>(items: Iterable<T>, k: number, by: (t: T) => number): T[] {
  const heap = new MinHeap<T>((x, y) => by(x) < by(y));
  for (const item of items) {
    heap.push(item);
    if (heap.size > k) heap.pop();   // discard the current worst
  }
  return [...Array(heap.size)].map(() => heap.pop()!).reverse();
}`,
            'heap.ts',
            'ts'
          ),
          tip(
            'Build a heap in O(n), not O(n log n)',
            'Pushing n elements one at a time is O(n log n). Calling siftDown from the last internal node down to the root is O(n), because most nodes are near the leaves and barely sift. \`new MinHeap(arr)\` should do the latter.'
          ),
          warn(
            'Heaps are not sorted and cannot be traversed in order',
            'Reading the underlying array left to right gives the level-order layout, which is meaningless as a sort. If you need sorted output, pop everything (O(n log n)) or use a different structure.'
          ),
        ],
        [
          [
            'Finding the top 10 of 1,000,000 items. What is the best approach?',
            [
              'Sort all 1,000,000 and take the first 10 — O(n log n)',
              'Keep a max-heap of size 10 while streaming — O(n log 10)',
              'Sort only the first 100 items and hope',
              'Binary search the range of values',
            ],
            1,
            'Bounded memory and O(n log k) time. A full sort does strictly more work and needs O(n) memory, for the same answer.'
          ],
          [
            'In a max-heap, where does the largest element live?',
            [
              'Anywhere in the last level',
              'At a leaf, since leaves are added last',
              'At the root, index 0',
              'Whichever leaf was inserted last',
            ],
            2,
            'The heap invariant only constrains parent-vs-child, so the maximum must be a root (a node with no parent to dominate it). Everything else in the heap is unordered.'
          ],
          [
            'Building a heap by inserting n elements one at a time costs O(n log n). Why is bottom-up construction O(n)?',
            [
              'It performs fewer comparisons per element',
              'Most nodes near the leaves sift only a short distance, and the total work sums to O(n)',
              'It uses a different, cheaper algorithm',
              'It skips the sift step entirely',
            ],
            1,
            'Sum over all nodes of sift distance. The deepest nodes are numerous but barely move; the few near the root sift far. The series converges to O(n).'
          ],
        ]
      ),
    ],
  },
  {
    id: M3,
    course_id: 'crs-advanced-data-structures',
    title: 'Module 3 — Choosing, and knowing when you are done',
    summary: 'Graph structures, space/time trade-offs, and a defensible decision procedure for picking a structure under real constraints.',
    sort_order: 3,
    lessons: [
      lesson(
        M3,
        'ads-3-1',
        1,
        'Graphs: adjacency lists beat matrices, and when the matrix wins',
        'Representation, traversal, and the cases where the denser structure is genuinely correct.',
        17,
        [
          md(`## How to store a graph

A graph is nodes and edges. Two representations dominate:

**Adjacency list** — for each node, the list of its neighbours. Space is O(V + E). Traversal of all neighbours is proportional to the actual degree.

**Adjacency matrix** — a V×V table of booleans or weights. Space is O(V²). Membership of a specific edge is O(1).

The crossover is density. For a sparse graph the list is dramatically smaller; for a dense graph the matrix's constant factor and cache layout can win despite the quadratic space. Most real graphs are sparse — social, road, dependency and reference graphs are all far below the E ≈ V² threshold — so the list is the default and the matrix is the special case.`),
          lead('Rule of thumb: adjacency list unless you need O(1) edge-membership queries in a dense graph, or you intend to run an algorithm that benefits from random edge access.'),
          code(
            `// BFS and Dijkstra over an adjacency list, no library.
type Edge = { to: number; weight: number };

function bfs(adj: Edge[][], start: number): number[] {
  const dist = new Array(adj.length).fill(Infinity);
  dist[start] = 0;
  // A real FIFO queue, not shift() — shift() is O(n) on arrays.
  const queue = new Int32Array(adj.length);
  let head = 0, tail = 0;
  queue[tail++] = start;

  while (head < tail) {
    const u = queue[head++];
    for (const { to } of adj[u]) {
      if (dist[to] === Infinity) {
        dist[to] = dist[u] + 1;
        queue[tail++] = to;
      }
    }
  }
  return dist;
}

function dijkstra(adj: Edge[][], start: number): number[] {
  const dist = new Array(adj.length).fill(Infinity);
  const done = new Array(adj.length).fill(false);
  dist[start] = 0;

  for (let iter = 0; iter < adj.length; iter++) {
    // Linear scan for the nearest unsettled node. With a heap this becomes
    // O((V + E) log V); the scan is only better for very small graphs.
    let u = -1;
    for (let i = 0; i < adj.length; i++) {
      if (!done[i] && (u === -1 || dist[i] < dist[u])) u = i;
    }
    if (u === -1 || dist[u] === Infinity) break;
    done[u] = true;

    for (const { to, weight } of adj[u]) {
      if (dist[u] + weight < dist[to]) dist[to] = dist[u] + weight;
    }
  }
  return dist;
}`,
            'graphs.ts',
            'ts'
          ),
          warn(
            'Dijkstra requires non-negative weights',
            'A single negative edge breaks the "finalised node" assumption, and the algorithm silently returns wrong distances. With negative edges you need Bellman-Ford (O(V·E)), and with negative *cycles* the problem is unbounded — no algorithm can answer it.'
          ),
          table(
            'Graph structure choices',
            ['Need', 'Use', 'Why'],
            [
              ['Shortest path, non-negative weights', 'Dijkstra + heap', 'O((V + E) log V)'],
              ['Shortest path, negative edges allowed', 'Bellman-Ford', 'O(V · E), detects negative cycles'],
              ['Fewest edges, unweighted', 'BFS', 'O(V + E), no weights needed'],
              ['All-pairs distances, dense small graph', 'Floyd-Warshall', 'O(V³) but excellent cache behaviour'],
              ['Reachability / components', 'Union-Find', 'Near-linear, O(α(V)) amortised'],
            ]
          ),
        ],
        [
          [
            'Why is \`queue.shift()\` a poor choice inside BFS?',
            [
              'It does not preserve FIFO order',
              'It is O(n) per call, making the traversal O(n·V) overall',
              'It cannot hold numbers',
              'It reallocates on every call',
            ],
            1,
            'FIFO order is correct, but shift() must reindex the whole array each time. An index-based ring buffer or a linked queue gives amortised O(1).'
          ],
          [
            'Dijkstra is run on a graph containing one edge of weight -5. What happens?',
            [
              'It returns correct distances, just more slowly',
              'It silently returns incorrect distances, because a finalised node may later be improved',
              'It throws an error',
              'It degrades gracefully to Bellman-Ford',
            ],
            1,
            'The correctness argument assumes weights are non-negative. With a negative edge, a node marked final can still be improved — the failure is wrong output, not a crash, which is the dangerous part.'
          ],
          [
            'A graph has 1,000,000 nodes and 4,000,000 edges, and you need to know which components it has. Best structure?',
            [
              'Adjacency matrix — 10¹² booleans, but constant-time queries',
              'Adjacency list plus Union-Find',
              'A binary heap over all nodes',
              'A BFS from every node in turn',
            ],
            1,
            'Connectivity is exactly what Union-Find is for, at O(E·α(V)) with no traversal. A matrix here would need 10¹² cells, and BFS from every node is O(V·(V+E)).'
          ],
        ]
      ),
      lesson(
        M3,
        'ads-3-2',
        2,
        'A decision procedure you can defend in a review',
        'Constraints first, structure second: the questions to ask before choosing anything.',
        12,
        [
          md(`## Ask the constraints before naming a structure

Most bad data-structure choices are not wrong answers to an unasked question. They are reasonable answers to a question nobody asked. Before opening an editor, write down:

**1. What are the actual operations, with frequencies?**
A structure chosen for the wrong operation is wrong regardless of its asymptotics. A config read once at boot and a ledger appended 10,000 times per second have opposite requirements.

**2. What are the access patterns, not just the accesses?**
Membership? Range? Top-k? Ordered traversal? Nearest neighbour? Prefix search? These map to different structures, and no single structure is best at all of them.

**3. What is the data lifetime and size?**
Fits in cache? Larger than RAM? Grows without bound? This single fact decides between in-memory and on-disk structures more often than any other.

**4. What are the update semantics?**
Mostly immutable after build? Frequent inserts? Frequent deletes in the middle? Each rules structures in or out.

**5. What is the concurrency requirement?**
Single-threaded, lock-based, or lock-free? Many "obvious" structures have no safe concurrent story, and retrofitting one later is a rewrite.`),
          lead('Write these five answers down before choosing. If you cannot fill them in, the design is not ready, and no amount of structure-hopping will fix that.'),
          table(
            'Worked example: session store, 50k active sessions, 2k reads/s per node',
            ['Question', 'Answer', 'Consequence'],
            [
              ['Operations', 'Lookup by opaque id, delete on expiry', 'No ordered traversal needed'],
              ['Access pattern', 'Exact match only', 'Hash map, not a tree'],
              ['Size / lifetime', 'Fits in memory; entries expire on a timer', 'In-memory, no persistence layer in the hot path'],
              ['Update semantics', 'Insert and delete constantly', 'Tombstones plus periodic sweep, not in-order delete'],
              ['Concurrency', 'Multiple node processes, partitioned by hash', 'No shared mutable state; per-partition ownership'],
            ]
          ),
          tip(
            'Complexity is a tie-breaker, not a starting point',
            'Once the five constraints point at one or two candidates, that is when big-O decides. Using big-O first tends to pick a theoretically superior structure that cannot satisfy constraint 3.'
          ),
          warn(
            'Write down what would make you change your mind',
            '"We will revisit this if p99 exceeds 50 ms" or "if the working set stops fitting in cache". A structure chosen without a trigger condition will be defended long after it stopped being right.'
          ),
        ]
      ),
    ],
  },
];

export function getAdvancedDataStructuresCourse(): Course {
  return {
    id: 'crs-advanced-data-structures',
    slug: 'advanced-data-structures',
    title: 'Advanced Data Structures: Choosing Well Under Real Constraints',
    subtitle: 'Hashing, trees, heaps and graphs — built, benchmarked, and chosen with a procedure you can defend',
    description: `Most data-structure teaching stops at "a hash map is O(1), a tree is O(log n)" and leaves you to guess which one your problem needs. This course is about the second half: the part where the constraints decide, the constant factors show up in a profile, and you have to defend the choice.

Every structure here is implemented from scratch in TypeScript — the hash table with resizing, the red-black tree with all three fix-up cases, the array-backed binary heap, BFS and Dijkstra — and then measured rather than asserted about. The questions are the ones that actually come up: why adversarial hash collisions are a denial-of-service vector, when a binary search loses to a linear scan on cache behaviour, and when an adjacency matrix is genuinely the right answer.

It is a paid course because it assumes you can already program and already have the C course's grounding in pointers and memory. If you are not comfortable reading a loop that walks a linked structure, start with C Programming first.`,
    category: 'Computer Science',
    level: 'advanced',
    is_free: false,
    price_inr: 1299,
    thumbnail_url: '',
    tags: ['data-structures', 'algorithms', 'complexity', 'performance', 'hash-tables', 'trees', 'heaps', 'graphs', 'caching'],
    outcomes: [
      'State what a big-O bound does and does not claim, including constants, tightness and space',
      'Explain why a hash table is O(1) in expectation and what an attacker can do about that',
      'Implement and explain every case of the red-black tree fix-up after an insert',
      'Build a binary heap in O(n) and use it to solve top-k problems in O(n log k) without sorting',
      'Choose between an adjacency list and an adjacency matrix from the graph\'s density',
      'Work through the five constraint questions before choosing a structure, and write down what would change your mind',
    ],
    // Real, and satisfied by a course already in the catalogue: this course reads
    // and writes raw memory, so it genuinely requires the C grounding first.
    prerequisite_course_id: 'crs-c-programming',
    certificate_eligible: true,
    published: true,
    created_at: '2026-03-02T09:00:00.000Z',
    updated_at: '2026-03-02T09:00:00.000Z',
    /**
     * Null on purpose. No instructor record exists yet, so the public page renders
     * no instructor block. A placeholder name here would be a fabricated claim
     * about a real-seeming person, on a page with a purchase button.
     */
    instructor_id: null,
    about_course: `This course exists because the gap in most data-structure curricula is not knowledge, it is judgement. Anyone can be told that a balanced binary search tree gives O(log n) lookup. Far fewer people can answer the question that actually comes up in a code review: why is this a tree and not a sorted array, and what would have to change for that answer to flip?

The material is built around implementations rather than definitions. You will write a hash table that resizes and rehashes, a red-black tree with the full three-case fix-up, a binary heap on a flat array, and BFS and Dijkstra without a library. Writing them is the point. A structure you have implemented is one you can reason about when it misbehaves; a structure you have only read about is one you look up.

The second thread is measurement. Complexity classes are treated honestly throughout — as statements about growth, not about speed. Several lessons are specifically about the cases where the better complexity loses: a linear scan beating binary search on cache behaviour, an O(1)-expected hash table failing under adversarial keys, a sort's crossover point where insertion sort wins. These are not footnotes. They are the difference between a structure that works on a benchmark and one that works in production.

What you are explicitly not getting: a catalogue of every structure that exists, and interview puzzle patterns. Coverage is three modules, and it is meant to be complete rather than padded — you should finish able to defend a choice, not able to recite a table of bounds.`,
    prerequisites: [
      'C Programming on TieEdu, or equivalent fluency with pointers and manual memory',
      'Comfort reading and writing recursive functions',
      'Working knowledge of arrays, loops and basic complexity notation',
      'A language runtime for the examples — the course uses TypeScript',
    ],
    audience: [
      'Second- and third-year students preparing for systems or backend interviews',
      'Working engineers choosing a data structure for a real workload',
      'Anyone who has memorised complexity tables and wants to know when they apply',
    ],
    audio_language: 'English',
    caption_language: 'English',
    modules,
  };
}
