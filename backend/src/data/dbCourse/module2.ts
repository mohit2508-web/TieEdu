// Module 2 — SQL: Core, Advanced & Indexes
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M2, COURSE_ID } from './helpers';

export const module2: CourseModule = {
  id: M2,
  course_id: COURSE_ID,
  title: 'Module 2 — SQL: Core, Advanced & Indexes',
  summary:
    'DDL and DML, joins and aggregation, subqueries and views, then B+ tree and hash indexes — what they are and why queries get faster.',
  sort_order: 2,
  lessons: [
    lesson(
      M2,
      'db-2-1',
      1,
      'SQL Core: DDL, Joins & Aggregation',
      'CREATE/ALTER/DROP, WHERE/GROUP BY/HAVING, inner/outer joins, and the query-clause execution order examiners love to ask.',
      13,
      nineBlocks({
        objectives: [
          'Write CREATE TABLE with PK, FK and NOT NULL constraints',
          'Use inner vs left/right/full outer joins correctly on small datasets',
          'Apply GROUP BY with HAVING and know clause evaluation order',
        ],
        hook:
          'Interviewer: "Why does WHERE filter before GROUP BY but HAVING filters after?" If you can answer that by narrating how rows flow through the pipeline, you will never write a broken aggregate query again.',
        concept: `**DDL (structure):** CREATE TABLE, ALTER TABLE (ADD/DROP/MODIFY columns and constraints), DROP TABLE, TRUNCATE (removes all rows, keeps structure; no WHERE).
**DML (data):** INSERT, UPDATE, DELETE (all support WHERE — never run an unfiltered UPDATE in production).

**Clause order (evaluation, not writing):**
1. FROM/JOIN — where rows come from
2. WHERE — row-level filter (before grouping)
3. GROUP BY — bucket rows
4. HAVING — bucket-level filter (after grouping)
5. SELECT — compute columns / aliases
6. ORDER BY — sort (last, aliases allowed)
7. LIMIT/OFFSET — cut the result

**Joins:**
- INNER — only matching pairs.
- LEFT OUTER — all left rows + matches (NULLs on the right where missing).
- RIGHT OUTER — mirror of left.
- FULL OUTER — all rows from both sides.
- SELF JOIN — same table twice with aliases (employee and manager).
- CROSS JOIN — Cartesian product.

**Aggregation:** COUNT/SUM/AVG/MIN/MAX with GROUP BY. Rules: every non-aggregated SELECT column must be in GROUP BY. NULLs are skipped by aggregates except COUNT(*).

**Constraint toolkit:** PRIMARY KEY, FOREIGN KEY ... REFERENCES ..., UNIQUE, NOT NULL, CHECK (condition), DEFAULT value. PRIMARY KEY implies NOT NULL + UNIQUE (single-column).`,
        extras: [
          table('Clause', ['Filters rows or groups, before/after GROUP BY'], [
            ['WHERE', 'Rows — before grouping'],
            ['HAVING', 'Groups — after grouping'],
            ['ORDER BY', 'Result — last'],
          ]),
          tip(
            'LEFT vs RIGHT is from the FROM order',
            'FROM a LEFT JOIN b = keep every row of a, regardless of b.',
          ),
          warn(
            'UPDATE without WHERE',
            'Changes every row — the classic production incident. Always filter.',
          ),
        ],
        worked: {
          title: 'Departments with average salary above the company average',
          problem: 'Employee(eid, name, dept, salary). Write the query with GROUP BY + HAVING.',
          steps: [
            { title: 'Bucket', desc: 'GROUP BY dept — one row per department.' },
            { title: 'Aggregate', desc: 'Compute AVG(salary) per group (SELECT dept, AVG(salary) AS avg_sal).' },
            { title: 'Filter groups', desc: 'HAVING AVG(salary) > (SELECT AVG(salary) FROM Employee) — subquery = company-wide average.' },
            { title: 'Order', desc: 'ORDER BY avg_sal DESC for readability.' },
            { title: 'Why not WHERE', desc: 'WHERE cannot see aggregates — it runs before grouping.' },
          ],
          solution: 'FROM → GROUP BY → HAVING (aggregate condition) → SELECT → ORDER BY.',
        },
        practice: {
          title: 'Count trap',
          prompt: 'Table has 10 rows, 3 with NULL dept. What do COUNT(*), COUNT(dept) return?',
          hint: 'COUNT(*) counts rows; COUNT(col) skips NULLs.',
        },
        mistakes: [
          {
            mistake: 'Using HAVING without GROUP BY on a non-aggregated column',
            fix: 'Filter plain columns in WHERE; reserve HAVING for aggregate conditions.',
          },
          {
            mistake: 'Expecting INNER JOIN to keep unmatched rows',
            fix: 'That is what LEFT/RIGHT/FULL OUTER joins are for.',
          },
        ],
        exam: {
          question: 'Differentiate WHERE and HAVING.',
          answer: 'WHERE filters individual rows before grouping; HAVING filters grouped results after aggregation.',
          source: 'Most-asked SQL short question.',
        },
        summary: [
          'DDL structure, DML data; clause order: FROM → WHERE → GROUP → HAVING → SELECT → ORDER.',
          'Outer joins preserve unmatched side with NULLs.',
          'Every non-aggregated SELECT column belongs in GROUP BY.',
        ],
      }),
      [
        [
          'Which clause can reference an aggregate like AVG(salary) to filter?',
          ['WHERE', 'HAVING', 'ON', 'ORDER BY'],
          1,
          'Runs after grouping.',
        ],
        [
          'LEFT JOIN keeps:',
          ['Only matching rows', 'All rows of the left table', 'All rows of both tables', 'No rows from the right'],
          1,
          'Unmatched right columns become NULL.',
        ],
        [
          'COUNT(column_name) differs from COUNT(*) by:',
          ['Nothing', 'COUNT(column) skips NULLs', 'COUNT(*) skips NULLs', 'COUNT(column) counts groups'],
          1,
          'NULL-aware aggregate.',
        ],
      ]
    ),
    lesson(
      M2,
      'db-2-2',
      2,
      'Subqueries, Views & Indexes',
      'Correlated subqueries, views as saved queries, then B+ tree and hash indexes — structure, uniqueness and when the optimiser uses them.',
      13,
      nineBlocks({
        objectives: [
          'Write scalar, IN-list and correlated subqueries and say when each runs',
          'Create views and state their update limitations',
          'Explain B+ tree properties and why point/range queries get faster with indexes',
        ],
        hook:
          'A 10-million-row table answers a lookup in milliseconds because of a B+ tree — or crawls because someone forgot an index. "Explain EXPLAIN" is a top-5 database interview question.',
        concept: `**Subqueries:**
- **Scalar:** one value — used in comparisons/SELECT (SELECT AVG(salary) FROM ...).
- **IN list:** column IN (subquery results) — often rewritten as semi-join.
- **Correlated:** references the outer row; executed per outer row (use with care; NOT EXISTS is the classic "for all" pattern).
- **EXISTS / NOT EXISTS:** existence test — better than IN when NULLs are involved (IN with NULL in the subquery result can behave surprisingly).

**Views:** V AS (SELECT ...) — a named saved query.
- Simplify complex joins, restrict columns (security), stabilise reporting.
- Simple views over one table are often updatable (INSERT/UPDATE through the view); views with aggregates, GROUP BY, DISTINCT or joins generally are not.

**Indexes (speed structures beyond the heap file):**
- **B+ tree:** balanced tree, all leaves linked; internal nodes = separators; every key appears in a leaf. Properties exams want: balanced (same depth), high fan-out (few disk I/Os), leaves linked → excellent **range scans** (B-trees do not link leaves as well).
- **Hash index:** hash(key) → bucket — O(1) point lookup; poor for range queries.
- **Clustered vs non-clustered:** clustered = rows physically in key order (one per table); non-clustered = index with row pointers (many per table).
- **Primary key index:** usually implicit unique index.
- **Write cost:** every INSERT/UPDATE/DELETE may touch the index → slower writes, faster reads.
- **Covering index:** query satisfied entirely from index leaves — no table lookup.

**EXPLAIN / query plan:** shows join order and index usage — the practical follow-up to any index question.`,
        extras: [
          table('Index', ['Best for', 'Weak for'], [
            ['B+ tree', 'Point lookups AND range scans', 'Write-heavy churn (some cost)'],
            ['Hash', 'Exact-match lookups', 'Range, order, prefix queries'],
            ['Clustered', 'Range on the sort key (one per table)', 'Multiple sort orders'],
          ]),
          tip(
            'Index rule of thumb',
            'Index columns used in WHERE, JOIN and ORDER BY — especially selective ones; skip low-cardinality columns like gender.',
          ),
          warn(
            'Views are not tables',
            'They store a query definition; a heavy view can be slow unless the engine materialises it.',
          ),
        ],
        worked: {
          title: 'Correlated EXISTS vs IN',
          problem: 'Customers (cid, name) and Orders (cid, ...). Find customers who have placed at least one order.',
          steps: [
            { title: 'IN form', desc: 'SELECT * FROM Customers WHERE cid IN (SELECT cid FROM Orders).' },
            { title: 'EXISTS form', desc: 'SELECT * FROM Customers c WHERE EXISTS (SELECT 1 FROM Orders o WHERE o.cid = c.cid).' },
            { title: 'Correlation', desc: 'The inner query references c.cid — the optimiser usually turns both into a semi-join on an index of Orders.cid.' },
            { title: 'Negation', desc: 'NOT IN breaks on NULLs (any NULL → result empty/unknown); NOT EXISTS handles it correctly — prefer NOT EXISTS.' },
            { title: 'Index note', desc: 'Orders.cid indexed → probe per customer is O(log n), not a full scan.' },
          ],
          solution: 'Same result; NOT EXISTS is the safe negation; indexes make both cheap.',
        },
        practice: {
          title: 'View update test',
          prompt: 'Can you INSERT through a view defined as SELECT eid, name FROM Employee WHERE dept = "HR"? What could go wrong?',
          hint: 'New row must satisfy the view predicate to be visible.',
        },
        mistakes: [
          {
            mistake: 'Saying B+ trees are good for everything',
            fix: 'Hash wins for pure equality lookups; B+ tree wins when ranges/order matter.',
          },
          {
            mistake: 'Indexing every column "just in case"',
            fix: 'Each index taxes writes and storage; index what queries actually filter/join/sort on.',
          },
        ],
        exam: {
          question: 'What are the properties of a B+ tree?',
          answer: 'Balanced (equal depth to root), high fan-out, all records/pointers in linked leaves, internal nodes hold separator keys only — giving efficient point and range access.',
          source: 'Classic DBMS exam question.',
        },
        summary: [
          'Subqueries: scalar, IN, correlated; prefer NOT EXISTS for negation.',
          'Views = saved queries with column restriction and partial updatability.',
          'B+ tree = balanced + linked leaves (ranges); hash = O(1) equality only.',
        ],
      }),
      [
        [
          'The main advantage of B+ tree leaves being linked is:',
          ['Smaller index size', 'Efficient range scans', 'Faster hashing', 'Automatic clustering'],
          1,
          'Sequential leaf walk for ranges.',
        ],
        [
          'A subquery that references an outer query column is:',
          ['Uncorrelated', 'Correlated', 'Scalar', 'A derived table only'],
          1,
          'Re-evaluated per outer row (conceptually).',
        ],
        [
          'Which is generally NOT directly updatable?',
          ['Simple single-table view with PK', 'View with GROUP BY and aggregates', 'View selecting subset of columns', 'View with a WHERE on base columns'],
          1,
          'Aggregated/grouped results do not map back to base rows.',
        ],
      ]
    ),
  ],
};
