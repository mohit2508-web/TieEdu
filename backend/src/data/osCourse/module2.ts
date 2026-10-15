// Module 2 — Concurrency & Synchronization
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M2, COURSE_ID } from './helpers';

export const module2: CourseModule = {
  id: M2,
  course_id: COURSE_ID,
  title: 'Module 2 — Concurrency & Synchronization',
  summary:
    'Race conditions, critical-section criteria, mutex/semaphore/monitor, classic producer-consumer and readers-writers.',
  sort_order: 2,
  lessons: [
    lesson(
      M2,
      'os-2-1',
      1,
      'Critical Sections, Mutex & Semaphores',
      'Why races happen, the three requirements, and how locks and counting semaphores enforce them.',
      13,
      nineBlocks({
        objectives: [
          'Explain race conditions with a concrete interleaving',
          'State the three critical-section requirements (mutual exclusion, progress, bounded waiting)',
          'Use binary mutexes and counting semaphores; distinguish wait/signal semantics',
        ],
        hook: 'Two threads increment the same counter and you lose updates. No compiler warning, no crash — just a wrong answer at 2 a.m. Concurrency bugs are silent. Exams test whether you can name the fix and prove the properties.',
        concept: `**Race condition:** result depends on uncontrolled interleaving of concurrent accesses to shared data.

**Critical-section problem — three requirements:**
1. **Mutual exclusion** — at most one process in its CS at a time
2. **Progress** — if no one is in CS and some want in, those not in remainder must not block selection
3. **Bounded waiting** — after a request, a bound on how long before entry

**Peterson's solution:** two-process software solution using turn[] and flag[]; satisfies all three on classical hardware (needs memory barriers on modern weak models).

**Mutex lock:** acquire() blocks until the lock is held; release() frees it.忙-waiting = spinlock (bad on single core, ok on short critical sections on multi-core).

**Semaphore S:** integer + wait(S)/signal(S).
- wait (P): if S>0 then S-- else block
- signal (V): S++ ; if waiters, wake one
- Binary semaphore: S ∈ {0,1} ≈ mutex (but mutex may have ownership/recursive semantics OS-specific)
- Counting semaphore: capacity for N concurrent entrants

**Implementation note:** wait/signal must be atomic (disable interrupts, or hardware CAS).

**Deadlock risk:** a missing wait before signal can invert order and hang forever — always pair acquire/release on all paths (including early returns).`,
        extras: [
          table('Primitive', ['Type', 'Typical use'], [
            ['Mutex', 'Binary, ownership', 'Protect a critical section'],
            ['Binary semaphore', 'Binary, no ownership rules by spec', 'Signal between two threads'],
            ['Counting semaphore', 'Integer', 'Resource pool of size N'],
            ['Spinlock', 'Busy-wait mutex', 'Very short CS on multi-core'],
          ]),
          tip(
            'Atomic means "as one" under the hood',
            'On x86: LOCK prefix; on ARM: LDAXR/STLXR or LL/SC — name hardware once in viva.',
          ),
          warn(
            'Forgetting to signal',
            'Leaked lock = permanent deadlock for everyone else. RAII / try-finally patterns exist for this.',
          ),
        ],
        worked: {
          title: 'Protect a bank transfer',
          problem: 'Two threads move money between accounts; keep balance consistent.',
          steps: [
            { title: 'Shared state', desc: 'balance_a, balance_b; no atomic multi-variable update.' },
            { title: 'Race', desc: 'Both read a=100 before either writes → lost update.' },
            { title: 'Fix', desc: 'mutex M; lock(); temp=a; b+=temp; a-=temp; unlock().' },
            { title: 'Invariant', desc: 'Total (a+b) conserved under the lock.' },
            { title: 'Proof sketch', desc: 'Mutual exclusion ⇒ only one transfer in flight ⇒ totals match.' },
          ],
          solution: 'Mutex serializes multi-step updates; interleavings that break the invariant are impossible.',
        },
        practice: {
          title: 'Semaphore pool',
          prompt: 'A printer allows 3 concurrent jobs. Write wait/signal around job execution using a counting semaphore.',
          hint: 'init S=3; before job: wait(S); after: signal(S).',
        },
        mistakes: [
          {
            mistake: 'Checking a flag without a lock then proceeding',
            fix: 'TOCTOU race — the check and use must be atomic under the same lock.',
          },
          {
            mistake: 'Using busy-wait as the default mutex on user apps',
            fix: 'Spins burn CPU; prefer blocking mutexes unless CS is tiny and multi-core.',
          },
        ],
        exam: {
          question: 'Three requirements of a critical-section solution?',
          answer: 'Mutual exclusion, progress, bounded waiting.',
          source: 'Textbook (Silberschatz) oral favorite.',
        },
        summary: [
          'Races are silent; mutex/semaphore restore determinism.',
          'Mutual exclusion + progress + bounded waiting.',
          'Counting semaphores bound concurrency to N.',
        ],
      }),
      [
        [
          'A race condition occurs when:',
          ['Two CPUs exist', 'Correctness depends on uncontrolled interleaving of shared access', 'A process exits early', 'I/O is slow'],
          1,
          'Interleaving-dependent result.',
        ],
        [
          'Bounded waiting guarantees:',
          ['No deadlock ever', 'A limit on delay before entering CS', 'FIFO order', 'Priority inheritance'],
          1,
          'Anti-starvation for CS entry.',
        ],
        [
          'wait(S) on a zero semaphore causes the caller to:',
          ['Return immediately', 'Block until signal', 'Crash', 'Spin the CPU forever by design'],
          1,
          'P operation blocks.',
        ],
      ]
    ),
    lesson(
      M2,
      'os-2-2',
      2,
      'Classical Problems & Deadlock',
      'Producer-consumer, readers-writers, philosopher dining, and the four Coffman conditions with recovery.',
      12,
      nineBlocks({
        objectives: [
          'Solve producer-consumer with semaphore pairs (full, empty, mutex)',
          'Explain readers-writers preference trade-offs',
          'List Coffman conditions; distinguish deadlock avoidance (Banker) from detection',
        ],
        hook: 'Deadlock questions are cheap marks if you can recite the four conditions and one avoidance algorithm. The real value: every distributed systems outage postmortem eventually mentions a lock cycle.',
        concept: `**Producer-consumer (bounded buffer):**
- empty = N (slots free), full = 0 (items), mutex = 1
- Producer: wait(empty); wait(mutex); produce; signal(mutex); signal(full)
- Consumer: wait(full); wait(mutex); consume; signal(mutex); signal(empty)
- Order matters: wait(empty) before mutex (else deadlock); signal(mutex) before signal(full).

**Readers-writers:**
- First readers-writers: readers preferred — writers can starve
- Second: writers preferred — readers can starve after a writer queues
- Fair/FCFS variants balance both
- Classic: read_count with its own mutex; write_mutex for writers

**Dining philosophers:** classic deadlock if everyone picks left fork first. Fixes: resource hierarchy (always lower fork id first), limit N−1 at table, arbiter/ticket.

**Deadlock — four Coffman conditions (all must hold):**
1. Mutual exclusion
2. Hold and wait
3. No preemption
4. Circular wait

**Handling strategies:**
- Prevention: break one condition by design (e.g. force lock ordering ⇒ break circular wait)
- Avoidance: Banker's algorithm — only grant if resulting state is safe
- Detection + recovery: allow, detect with resource-allocation graph cycle, then kill/preempt
- Ignorance: most general-purpose OSes "ignore" and rely on programmer care

**Banker's sketch:** Need matrix, Max, Allocation; Available. Safe sequence exists ⇒ grant. Unsafe ⇒ refuse even if currently available looks enough.`,
        extras: [
          table('Strategy', ['Idea', 'Cost'], [
            ['Prevention', 'Break a Coffman condition statically', 'Conservative utilization'],
            ['Avoidance (Banker)', 'Grant only safe states', 'Needs max claims ahead of time'],
            ['Detection + recovery', 'Find cycles; kill/preempt', 'Detection overhead; recovery hard'],
            ['Ignorance', 'Do nothing special', 'Deadlocks still possible'],
          ]),
          tip(
            'Lock ordering kills circular wait',
            'If everyone locks A before B, the cycle cannot form. Easiest practical prevention.',
          ),
          warn(
            'Semaphore order in producer-consumer',
            'mutex before empty/full waits can deadlock the pair.',
          ),
        ],
        worked: {
          title: 'Bounded buffer with correct wait order',
          problem: 'Capacity 5; producer and consumer run concurrently.',
          steps: [
            { title: 'Init', desc: 'empty=5, full=0, mutex=1.' },
            { title: 'Producer', desc: 'wait(empty); wait(mutex); buffer[in]=item; in=(in+1)%5; signal(mutex); signal(full).' },
            { title: 'Consumer', desc: 'wait(full); wait(mutex); item=buffer[out]; out=(out+1)%5; signal(mutex); signal(empty).' },
            { title: 'Why empty before mutex', desc: 'If mutex first and buffer full, consumer needs mutex to make progress → deadlock.' },
            { title: 'Invariant', desc: '0 ≤ full ≤ 5 and empty+full = 5 always.' },
          ],
          solution: 'Correct pairing; no deadlock; no overflow/underflow.',
        },
        practice: {
          title: 'Coffman break',
          prompt: 'Which condition does "acquire locks in ascending address order" break, and why?',
          hint: 'Think about edges in the wait-for graph.',
        },
        mistakes: [
          {
            mistake: 'Signaling full before releasing mutex',
            fix: 'Consumer may wake and block on mutex while producer still holds it — not fatal but wasteful; standard order is signal mutex then full.',
          },
          {
            mistake: 'Assuming deadlock needs only two processes',
            fix: 'Cycles can be length 2..N; philosophers is N=5.',
          },
        ],
        exam: {
          question: 'List the four necessary conditions for deadlock.',
          answer: 'Mutual exclusion, hold and wait, no preemption, circular wait.',
          source: 'Deadlock unit staple.',
        },
        summary: [
          'Bounded buffer: empty/full/mutex with strict wait order.',
          'Coffman conditions; prevention is often lock ordering.',
          'Banker avoids; detection recovers; most OSes ignore.',
        ],
      }),
      [
        [
          'Which pair of conditions is enough for a cycle in the wait-for graph (with single instance resources)?',
          ['Hold and wait + mutual exclusion', 'Circular wait alone implies the others in single-instance case', 'No preemption only', 'None'],
          1,
          'Single-instance: cycle ⇔ deadlock.',
        ],
        [
          'In producer-consumer, waiting on mutex BEFORE empty can:',
          ['Speed things up', 'Deadlock when buffer is full', 'Lose items', 'Disable interrupts'],
          1,
          'Classic ordering bug.',
        ],
        [
          'Banker’s algorithm is an example of:',
          ['Deadlock prevention', 'Deadlock avoidance', 'Detection only', 'Ostrich method'],
          1,
          'Safe-state check before grant.',
        ],
      ]
    ),
  ],
};
