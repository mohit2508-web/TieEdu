// Module 4 — Transactions, Concurrency & Recovery
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M4, COURSE_ID } from './helpers';

export const module4: CourseModule = {
  id: M4,
  course_id: COURSE_ID,
  title: 'Module 4 — Transactions, Concurrency & Recovery',
  summary:
    'ACID, schedules and serializability, two-phase locking, deadlock handling, timestamp ordering, write-ahead logging and crash recovery.',
  sort_order: 4,
  lessons: [
    lesson(
      M4,
      'db-4-1',
      1,
      'Transactions & Serializability',
      'Transaction states, ACID at exam depth, conflict vs view serializability, and recovering a schedule you are given on paper.',
      13,
      nineBlocks({
        objectives: [
          'State ACID with one-sentence definitions and map each to a mechanism',
          'Draw a schedule and test conflict serializability via precedence graph',
          'Explain the transaction lifecycle states (active, partially committed, committed, aborted)',
        ],
        hook:
          'A bank transfer that debits but never credits is a textbook lost update — and a real outage. ACID is the industry\'s answer to "what does correct mean when two things break at once".',
        concept: `**Transaction:** logical unit of work; either ALL statements take effect or NONE (atomicity).

**ACID:**
- **Atomicity (A):** all-or-nothing — enforced via undo logging / rollback (DBMS component: recovery manager).
- **Consistency (C):** execution takes the DB from one valid state to another; integrity constraints, triggers, FDs hold — responsibility shared with the application.
- **Isolation (I):** concurrent transactions do not interfere — locking, MVCC, serializability.
- **Durability (D):** committed changes survive crashes — WAL, checkpoints, backups.

**Transaction states:** Active → (all ops done) Partially Committed → Committed; Active → Aborted (failure or ROLLBACK); from aborted → new Active after restart. Only committed data is durable/visible to others under strict isolation.

**Schedule:** interleaving of operations of multiple transactions. Sequential = one at a time. A schedule is **serializable** if its effect equals SOME serial order.

**Conflict serializability:** two operations conflict if same data item, different transactions, and at least one is a write.
- Build a **precedence graph**: edge Ti → Tj if an op of Ti conflicts before an op of Tj.
- **Acyclic graph ⇔ conflict serializable**; topological order gives the equivalent serial schedule.

**View serializability:** same final state AND same reads-from relations as some serial schedule — strictly broader (blind writes can qualify); conflict-serializable ⇒ view-serializable, not vice versa.

**Recoverable schedules (bonus depth):** Tj should not commit before a transaction whose writes it read — otherwise cascading aborts. **Cascadless** = no dirty reads at all.`,
        extras: [
          table('ACID', ['One-liner + typical mechanism'], [
            ['Atomicity', 'All or nothing — undo log / rollback'],
            ['Consistency', 'Rules hold across the txn — app + constraints'],
            ['Isolation', 'No interference — 2PL / MVCC'],
            ['Durability', 'Commits survive crash — WAL + checkpoints'],
          ]),
          tip(
            'Precedence graph in three steps',
            '1) Skip reads-then-reads; 2) edge for every conflict pair (earlier → later); 3) cycles mean NOT conflict-serializable.',
          ),
          warn(
            'Serializable ≠ sequential execution',
            'Interleaving is allowed — the RESULT must match some serial order.',
          ),
        ],
        worked: {
          title: 'Conflict serializability test',
          problem: 'Schedule S: T1:R(A), T2:R(A), T2:W(A), T1:W(A). Serializable?',
          steps: [
            { title: 'List conflicts', desc: 'T1:R(A) vs T2:W(A) — conflict, T1 before T2 → edge T1→T2.' },
            { title: 'Second conflict', desc: 'T2:W(A) vs T1:W(A) — conflict, T2 before T1 → edge T2→T1.' },
            { title: 'Graph', desc: 'Edges T1→T2 and T2→T1 form a cycle.' },
            { title: 'Verdict', desc: 'Cycle present → NOT conflict serializable.' },
            { title: 'Fix idea', desc: 'Reorder so both writes come from one transaction first (2PL would have prevented this interleaving).' },
          ],
          solution: 'Cycle in precedence graph → not conflict serializable.',
        },
        practice: {
          title: 'Graph without a cycle',
          prompt: 'S: T1:R(X), T1:W(X), T2:R(X), T2:W(X). Build the graph — is it serializable, and to which order?',
          hint: 'One edge only, if any.',
        },
        mistakes: [
          {
            mistake: 'Calling any interleaved schedule serializable',
            fix: 'Only those equivalent to a serial order — check the graph.',
          },
          {
            mistake: 'Saying ACID is provided only by the DBMS engine',
            fix: 'Consistency in particular depends on application logic plus DB constraints.',
          },
        ],
        exam: {
          question: 'Define conflict serializability and the test for it.',
          answer: 'A schedule is conflict serializable if swapping adjacent non-conflicting operations can transform it into a serial schedule; tested by building a precedence graph — acyclic iff conflict serializable.',
          source: 'Standard 8-mark question.',
        },
        summary: [
          'ACID = atomicity, consistency, isolation, durability (with mechanisms).',
          'Serializability = same effect as some serial order.',
          'Precedence graph: cycles ⇒ not conflict-serializable.',
        ],
      }),
      [
        [
          'A committed transaction\'s updates surviving a crash is:',
          ['Atomicity', 'Isolation', 'Durability', 'Consistency'],
          2,
          'WAL + stable storage.',
        ],
        [
          'Conflict serializability is decided by:',
          ['Counting locks', 'Whether the precedence graph is acyclic', 'Transaction duration', 'Number of checkpoints'],
          1,
          'Acyclic ⇔ conflict serializable.',
        ],
        [
          'Two operations conflict when they:',
          ['Involve different transactions on the same item with at least one write', 'Are both reads', 'Belong to one transaction', 'Occur after commit'],
          0,
          'Same item, different txns, ≥1 write.',
        ],
      ]
    ),
    lesson(
      M4,
      'db-4-2',
      2,
      'Concurrency Control & Recovery',
      'Two-phase locking, deadlock policies, timestamp ordering, write-ahead logging, checkpoints and ARIES-style recovery at syllabus depth.',
      13,
      nineBlocks({
        objectives: [
          'Explain strict 2PL and how it guarantees conflict serializability',
          'Compare deadlock handling: detection, prevention and timeouts',
          'Walk a write-ahead logging recovery: redo committed, undo losers, use checkpoints',
        ],
        hook:
          'Two exam questions carry the most marks in most DBMS papers: "Explain two-phase locking" and "How does the DBMS recover after a crash?" This lesson is those two answers, worked through.',
        concept: `**Two-Phase Locking (2PL):**
- **Growing phase:** may acquire locks, never release.
- **Shrinking phase:** may release locks, never acquire.
- Two phases ⇒ conflict-serializable (the theorem examiners want stated).
- **Strict 2PL (what real engines use):** hold all exclusive locks until COMMIT/ABORT — avoids cascading aborts and dirty reads. **Rigorous 2PL** also holds shared locks to the end.

**Lock types:** shared (S) for reads — multiple holders; exclusive (X) for writes — single holder. Compatibility: S-S yes, S-X no, X-X no.

**Deadlock:** cycle of transactions waiting for each other's locks.
- **Detection:** build wait-for graph, look for cycles, choose a victim to roll back.
- **Prevention:** wait-die / wound-wait (timestamps decide who waits or aborts — no cycles possible).
- **Avoidance:** timeouts (simple, used in practice).
- **Victim choice:** youngest/least-progressed transaction.

**Timestamp ordering:** each txn gets a unique timestamp; operations must appear in timestamp order (T-S overlapping rules); too-old reads abort.

**Recovery — write-ahead logging (WAL):**
- Log record BEFORE modifying the DB page: <Ti, X, old, new> (undo/redo info).
- Rule: **log must reach stable storage before the data page does.**
- **Recovery after crash:** scan log from last checkpoint — redo committed transactions (their changes may be on disk or not), undo uncommitted (loser) transactions using undo records (in reverse).
- **Checkpoint:** flush dirty pages + log a checkpoint so recovery does not scan the entire log.
- Commit point: <Ti, commit> durable in log = the transaction is durably committed even if pages are dirty in buffer.

ARIES buzzwords for interviews: analysis phase → redo phase (repeat history) → undo phase; compensation log records (CLR) make undo idempotent.`,
        extras: [
          table('Deadlock approach', ['Idea'], [
            ['Detection', 'Wait-for graph cycle → abort victim'],
            ['Prevention', 'wait-die / wound-wait using timestamps'],
            ['Avoidance-ish', 'Lock timeouts in real engines'],
          ]),
          tip(
            'Why Strict 2PL rules production',
            'Holding X locks to commit gives recoverable + cascadeless schedules in one stroke.',
          ),
          warn(
            'WAL direction matters',
            'Log before page — the reverse breaks durability: a page could hit disk with no log record to redo/undo.',
          ),
        ],
        worked: {
          title: 'Crash recovery walk-through',
          problem: 'Checkpoint taken; then T1 commits, T2 (large, uncommitted) is mid-work; power fails. What does recovery do?',
          steps: [
            { title: 'Start point', desc: 'Recovery reads log backward/forward from the last checkpoint — not from time zero.' },
            { title: 'T1', desc: 'Commit record in log → T1 is a winner; REDO its updates (repeat history) even if some pages were flushed.' },
            { title: 'T2', desc: 'No commit record → loser; UNDO its logged changes in reverse using old-values; write compensation log records.' },
            { title: 'Durability proof', desc: 'Because commit preceded page flush (WAL), any T1 change on disk had a log record — nothing committed is lost.' },
            { title: 'Aftermath', desc: 'Database returns to state: T1 fully applied, T2 fully rolled back — consistent state.' },
          ],
          solution: 'Checkpoint narrows the log; redo winners, undo losers; WAL guarantees the log had what pages needed.',
        },
        practice: {
          title: '2PL phase naming',
          prompt: 'Txn takes S(A), X(B), releases S(A), then requests X(C). Does this violate 2PL? Why?',
          hint: 'Releasing then acquiring crosses the shrinking boundary.',
        },
        mistakes: [
          {
            mistake: 'Saying 2PL alone prevents deadlocks',
            fix: '2PL guarantees serializability; deadlocks need detection/prevention on top.',
          },
          {
            mistake: 'Recovering by scanning the whole log always',
            fix: 'Checkpoints exist precisely to bound recovery time.',
          },
        ],
        exam: {
          question: 'State the write-ahead logging rule and explain its role in durability.',
          answer: 'A log record for a change must reach stable storage before the changed data page does — so committed data on disk always has log support for redo/undo after a crash.',
          source: 'Top recovery question.',
        },
        summary: [
          '2PL: grow then shrink; Strict 2PL holds X locks to commit.',
          'Deadlocks: detect via wait-for graph, prevent via timestamps, or time out.',
          'WAL: log first; recovery redoes committed, undoes losers from the last checkpoint.',
        ],
      }),
      [
        [
          'In 2PL, after releasing the first lock the transaction enters:',
          ['Growing phase', 'Shrinking phase', 'Recovery phase', 'Commit phase only'],
          1,
          'No new locks allowed afterwards.',
        ],
        [
          'The WAL rule states that:',
          ['Data pages must be written before log records', 'Log records must reach stable storage before their data pages', 'Checkpoints precede commits', 'Redo runs before undo always on live systems'],
          1,
          'Log-before-data.',
        ],
        [
          'Strict 2PL differs from basic 2PL by:',
          ['Allowing locks during shrinking', 'Holding exclusive locks until commit/abort', 'Forbidding shared locks', 'Requiring timestamp ordering too'],
          1,
          'Gives cascadeless, recoverable schedules.',
        ],
      ]
    ),
  ],
};
