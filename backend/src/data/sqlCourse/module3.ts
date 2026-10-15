// Module 3 — DDL, Constraints & Indexes
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, code } from '../nineBlocks';
import { lesson, M3, COURSE_ID } from './helpers';

export const module3: CourseModule = {
  id: M3,
  course_id: COURSE_ID,
  title: 'Module 3 — Schema Design, Constraints & Indexes',
  summary: 'Create tables that enforce rules at the database level, and index them so reads stay fast.',
  sort_order: 3,
  lessons: [
    lesson(
      M3,
      'sq-3-1',
      1,
      'CREATE TABLE, keys and constraints',
      'Declare primary keys, foreign keys, uniqueness and defaults so bad data never enters.',
      16,
      nineBlocks({
        objectives: [
          'Write a CREATE TABLE with appropriate column types and NOT NULL constraints',
          'Declare primary keys and understand their role as unique non-NULL identifiers',
          'Add foreign keys that enforce referential integrity with sensible ON DELETE behaviour',
          'Use UNIQUE, CHECK and DEFAULT to push validation into the schema',
        ],
        hook: `A startup ships an orders table without a primary key, then discovers duplicate rows after a retry bug in the API. There is no way to identify "the" order to refund. An hour of schema design in the beginning saves a week of data cleanup later. Constraints are not bureaucracy — they are the database refusing to store lies.`,
        concept: `DDL (Data Definition Language) creates and alters structure: CREATE, ALTER, DROP, TRUNCATE.

**Column types (PostgreSQL-flavoured, common across engines):**

| Need | Type | Notes |
| --- | --- | --- |
| Whole numbers | INTEGER / BIGINT | BIGINT for counts that may exceed 2B |
| Decimals / money | NUMERIC(12,2) | Exact; never FLOAT for money |
| Text | TEXT / VARCHAR(n) | TEXT when length is unbounded |
| Point in time | TIMESTAMP / TIMESTAMPTZ | TIMESTAMPTZ stores UTC |
| True/false | BOOLEAN | With DEFAULT false |
| JSON document | JSONB | Queryable, indexed (PostgreSQL) |

**Constraints** are rules the DBMS enforces on every write:

| Constraint | Enforces | Example |
| --- | --- | --- |
| PRIMARY KEY | Unique + NOT NULL identifier | id BIGINT PRIMARY KEY |
| FOREIGN KEY | Value exists in parent table | REFERENCES customers(id) |
| UNIQUE | No duplicates (NULLs allowed multiple in PG) | email UNIQUE |
| NOT NULL | Column must have a value | name TEXT NOT NULL |
| CHECK | Boolean expression holds | CHECK (amount > 0) |
| DEFAULT | Fallback when column omitted | status TEXT DEFAULT 'new' |

**ON DELETE behaviour** for foreign keys:
- RESTRICT / NO ACTION: block the parent delete.
- CASCADE: delete children too.
- SET NULL: null out the child FK.
- SET DEFAULT: set to the default value.

Choose based on ownership: line items should CASCADE with the order; a customer's address history might SET NULL or be soft-deleted instead.`,
        extras: [
          code(
            `CREATE TABLE orders (
  id          BIGINT PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  status      TEXT   NOT NULL DEFAULT 'new'
              CHECK (status IN ('new','paid','shipped','cancelled')),
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, id)
);`,
            'create_orders.sql',
            'sql'
          ),
          tip(
            'Soft delete beats hard delete for user data',
            'Add a deleted_at TIMESTAMPTZ column instead of DELETE. History stays intact for audits and un-deletes are trivial. Reserve hard deletes for GDPR erase requests.',
          ),
        ],
        worked: {
          title: 'Design a two-table schema with integrity',
          problem: `Write CREATE TABLE statements for customers and orders such that: every order belongs to a real customer, amounts are positive, and order status is one of four values.`,
          steps: [
            {
              title: 'Customers first (parent)',
              desc: 'Primary key id, unique email, NOT NULL name.',
              code_snippet: "CREATE TABLE customers (\n  id BIGINT PRIMARY KEY,\n  name TEXT NOT NULL,\n  email TEXT NOT NULL UNIQUE\n);",
            },
            {
              title: 'Orders second (child)',
              desc: 'FK to customers with RESTRICT (block deleting a customer who has orders). CHECK constraints for status and amount.',
              code_snippet: 'customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,\namount NUMERIC(12,2) NOT NULL CHECK (amount > 0),\nstatus TEXT NOT NULL CHECK (status IN (...))',
            },
            {
              title: 'Verify the rules hold',
              desc: 'Insert a negative amount: rejected by CHECK. Delete a customer with orders: rejected by RESTRICT. Insert status "foo": rejected by CHECK.',
            },
          ],
          solution:
            'The schema itself now rejects the three classic bad writes. Application validation is still useful for UX, but the database is the last line of defence and must not trust the app.',
        },
        practice: {
          title: 'Design these',
          prompt: `1. A products table with SKU unique, price >= 0, and a category FK.
2. An order_items table that CASCADEs when its order is deleted.
3. Add a CHECK that an order's delivery date is after its order date.`,
          hint: "1: sku TEXT NOT NULL UNIQUE; price NUMERIC(10,2) NOT NULL CHECK (price >= 0); category_id REFERENCES categories(id). 2: order_id REFERENCES orders(id) ON DELETE CASCADE. 3: CHECK (delivery_date > ordered_at) — careful with NULLs: CHECK passes if the expression is NULL, so add NOT NULL if required.",
        },
        mistakes: [
          {
            mistake: 'Using FLOAT or DOUBLE for money',
            fix: 'Floating point cannot represent 0.10 exactly. Use NUMERIC(12,2) or store integer paise.',
          },
          {
            mistake: 'FORGETTING that CHECK passes on NULL',
            fix: 'CHECK (amount > 0) is UNKNOWN when amount is NULL, and UNKNOWN passes. Add NOT NULL alongside every CHECK that must always hold.',
          },
          {
            mistake: 'ON DELETE CASCADE on a parent that owns irreplaceable history',
            fix: 'Cascading deletes from customers to orders destroys financial history. Prefer RESTRICT + soft delete for anything audited.',
          },
        ],
        exam: {
          question: 'Why is FLOAT unsafe for monetary amounts?',
          answer:
            'IEEE-754 binary floating point cannot represent many decimal fractions exactly (0.1 becomes 0.1000000000000000055...). Summing millions of such values drifts; banks notice. Use NUMERIC(p,s) for exact decimal arithmetic or BIGINT paise.',
          source: 'Backend engineering screening',
        },
        summary: [
          'DDL: CREATE / ALTER / DROP / TRUNCATE.',
          'PRIMARY KEY = unique + NOT NULL; FOREIGN KEY enforces parent existence.',
          'CHECK expressions pass on NULL — pair with NOT NULL.',
          'NUMERIC for money; never FLOAT. Choose ON DELETE deliberately.',
        ],
      }),
      [
        [
          'PRIMARY KEY implies:',
          ['Nullable and unique', 'NOT NULL and unique', 'Indexed but nullable', 'Foreign key target'],
          1,
          'A primary key column cannot be NULL and must uniquely identify each row.',
        ],
        [
          'CHECK (amount > 0) when amount is NULL:',
          ['Rejects the row', 'Passes (UNKNOWN is treated as pass)', 'Stores 0', 'Raises a warning'],
          1,
          'UNKNOWN does not fail CHECK. Add NOT NULL if a value is mandatory.',
        ],
        [
          'ON DELETE CASCADE means:',
          ['Block parent delete', 'Delete child rows when parent is deleted', 'Set FK to NULL', 'Set FK to default'],
          1,
          'CASCADE propagates the parent delete to all referencing child rows.',
        ],
      ]
    ),
    lesson(
      M3,
      'sq-3-2',
      2,
      'Indexes — when they help and when they hurt',
      'Pick the right index for the query, and know the write cost you are paying.',
      15,
      nineBlocks({
        objectives: [
          'Explain how a B-tree index speeds up equality and range predicates',
          'Create a composite index that matches the query column order rule',
          'Recognise when an index is unused (leading-column rule, functions on the column)',
          'Weigh index write cost and choose indexes that match real query patterns',
        ],
        hook: `An orders table with 10 million rows takes 8 seconds to answer WHERE customer_id = 42. One CREATE INDEX later it takes 2 milliseconds. The same table starts rejecting writes at 30 ms instead of 1 ms, because every insert now maintains four indexes. Indexes are a read-speed / write-speed trade, and choosing them blindly is how databases get slow in production.`,
        concept: `An index is an auxiliary structure (usually a B-tree) that maps key values to row locations, turning a full table scan into a tree search.

**What an index speeds up:**
- Equality: WHERE customer_id = 42
- Range: WHERE created_at >= '2025-01-01'
- ORDER BY / GROUP BY on the indexed columns (avoids a sort)
- JOIN on the indexed key

**Composite index column order (the leftmost-prefix rule):**
An index on (a, b, c) can serve queries filtering on a, or a+b, or a+b+c — but NOT on b alone or b+c without a. Put the most selective, most frequently filtered column first.

**When an index is NOT used:**
- The column is wrapped in a function: WHERE LOWER(email) = 'x' ignores an index on email. Use an expression index on LOWER(email) instead.
- The leading column of a composite index is not in the query.
- The query returns most of the table (the planner prefers a scan).
- The column has very low cardinality (e.g. boolean) unless combined with other columns.

**Write cost:** every INSERT/UPDATE/DELETE must update every index on the table. Four indexes can double or triple write latency. Index only columns that real queries filter, join or sort on.`,
        extras: [
          table('Index decision cheat-sheet', ['Situation', 'Verdict'], [
            ['PK / FK join columns', 'Index them (FKs are not auto-indexed in PG)'],
            ['WHERE equality on a column', 'Index it'],
            ['Column used only in ORDER BY', 'Composite index can avoid a sort'],
            ['Low-cardinality boolean alone', 'Skip; combine into a composite if needed'],
            ['Function-wrapped column', 'Expression index, or rewrite the query'],
            ['Table is write-heavy, few reads', 'Minimise indexes'],
          ]),
          tip(
            'Check with EXPLAIN before adding indexes',
            'Run EXPLAIN (ANALYZE, BUFFERS) on the slow query. If it shows a sequential scan on a large table with a selective predicate, an index is likely the fix. If it already uses an index, the problem is elsewhere.',
          ),
        ],
        worked: {
          title: 'Choose a composite index for a reporting query',
          problem: `The query WHERE tenant_id = 7 AND status = 'active' AND created_at >= '2025-01-01' ORDER BY created_at DESC is slow. Design the index.`,
          steps: [
            {
              title: 'List the filtered columns',
              desc: 'Equality columns: tenant_id, status. Range column: created_at. Sort: created_at DESC.',
              code_snippet: 'Equality: tenant_id, status\nRange/sort: created_at',
            },
            {
              title: 'Apply the column order rule',
              desc: 'Equality columns first (most selective first among them), then the range/sort column last. tenant_id is usually more selective than status.',
              code_snippet: 'CREATE INDEX idx_orders_tenant_status_created\n  ON orders (tenant_id, status, created_at DESC);',
            },
            {
              title: 'Verify with EXPLAIN',
              desc: 'The plan should show an index scan using the new index, with a filter on created_at (range conditions cannot use a bitmap AND after equality in older planners, but the leading equality columns are used).',
            },
          ],
          solution:
            'CREATE INDEX on (tenant_id, status, created_at DESC). Equality columns lead; the range and sort column trails. Always confirm with EXPLAIN — theory predicts, the planner decides.',
        },
        practice: {
          title: 'Design indexes for these queries',
          prompt: `1. WHERE email = 'x@y.z' (login path).
2. WHERE order_id = 5 AND line_no = 2 (order item lookup).
3. WHERE LOWER(slug) = 'intro-to-sql' (URL routing).`,
          hint: '1: single-column index on email (or UNIQUE at design time). 2: composite (order_id, line_no) matching the query order. 3: expression index on LOWER(slug); a plain index on slug is unused by the LOWER() predicate.',
        },
        mistakes: [
          {
            mistake: 'Assuming foreign keys are auto-indexed',
            fix: 'PostgreSQL does NOT index FK columns. A child table with millions of rows and an unindexed FK makes every parent delete a full child scan. Index every FK.',
          },
          {
            mistake: 'Building indexes on every column "just in case"',
            fix: 'Each index costs write throughput and disk. Start from the actual slow queries; add indexes that EXPLAIN shows are needed.',
          },
          {
            mistake: 'Composite index with the wrong leading column',
            fix: 'Index (status, tenant_id) does not help WHERE tenant_id = 7 (leading column status is not constrained). Order matters: equality columns first.',
          },
        ],
        exam: {
          question: 'An index on (a, b) can serve which WHERE clauses?',
          answer:
            'WHERE a = ..., WHERE a = ... AND b = ..., and range on a with optional b — i.e. any query that constrains the leading column a. It cannot serve WHERE b = ... alone, because the B-tree is sorted primarily by a.',
          source: 'DBA / backend interview staple',
        },
        summary: [
          'B-tree indexes speed equality, range, ORDER BY and JOIN on their columns.',
          'Composite order: equality columns first (most selective), range/sort last.',
          'Function on the column disables a plain index; use an expression index.',
          'Every index slows writes; FKs need explicit indexes in PostgreSQL.',
        ],
      }),
      [
        [
          'An index on (a, b) can accelerate:',
          ['WHERE b = 1 only', 'WHERE a = 1 or WHERE a = 1 AND b = 2', 'WHERE a + b = 3 only', 'Any WHERE on a or b'],
          1,
          'Leftmost prefix: a must be constrained for the index to apply; b alone cannot use it.',
        ],
        [
          'PostgreSQL foreign key columns are:',
          ['Automatically indexed', 'Not automatically indexed', 'Indexed only if UNIQUE', 'Always full-scanned'],
          1,
          'You must create the index yourself, or every parent delete scans the child table.',
        ],
        [
          'WHERE LOWER(email) = \'x\' ignores an index on email because:',
          ['email is not unique', 'the predicate applies a function to the column', 'LOWER is slow', 'the index is descending'],
          1,
          'The B-tree stores email, not LOWER(email). Create an expression index on LOWER(email) or rewrite the predicate.',
        ],
      ]
    ),
  ],
};
