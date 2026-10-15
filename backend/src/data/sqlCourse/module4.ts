// Module 4 — Normalization, Transactions & Window Functions
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, code } from '../nineBlocks';
import { lesson, M4, COURSE_ID } from './helpers';

export const module4: CourseModule = {
  id: M4,
  course_id: COURSE_ID,
  title: 'Module 4 — Normalization, Transactions & Advanced Queries',
  summary: 'Design tables in 3NF, reason about ACID, and use window functions for running totals and rankings.',
  sort_order: 4,
  lessons: [
    lesson(
      M4,
      'sq-4-1',
      1,
      'Normalization up to 3NF',
      'Remove repeating data without making queries impossible to write.',
      15,
      nineBlocks({
        objectives: [
          'Describe 1NF, 2NF and 3NF in plain language with a concrete example',
          'Normalise a denormalised table into 3NF step by step',
          'Recognise when deliberate denormalisation is the right trade-off',
          'Spot update, insert and delete anomalies in a bad schema',
        ],
        hook: `An orders table stores customer_name and customer_email on every order row. When a customer changes their email, you must UPDATE thousands of rows — miss one and the data is inconsistent forever. That is an update anomaly, and normalization is the systematic fix. Every design interview eventually asks "is this schema normalised?"; this lesson gives the answer structure.`,
        concept: `Normalization splits tables so each fact is stored once. The anomalies it prevents:

| Anomaly | What goes wrong |
| --- | --- |
| Insert | Cannot record a customer who has no orders yet (if customer data is only on orders) |
| Update | Changing one fact requires updating many rows |
| Delete | Deleting the last order deletes the customer record too |

**1NF — atomic values.** No repeating groups or arrays in a cell. A phone_numbers column with "98765,98766" violates 1NF; split into a separate table.

**2NF — 1NF + no partial dependency.** Every non-key column depends on the WHOLE primary key, not just part of it. This matters for composite keys: if key is (order_id, product_id), a column "product_name" depends only on product_id — partial dependency, violates 2NF. Fix: move product_name to a products table.

**3NF — 2NF + no transitive dependency.** Non-key columns do not depend on each other. If employees.department_id determines department_name, then department_name is transitively dependent on employee_id via department_id. Fix: move department_name to a departments table.

**Practical target for most applications: 3NF.** Enough to eliminate the classic anomalies, not so fragmented that every read needs five joins.

**When to denormalise deliberately:** read-heavy reporting tables, materialised views, and hot paths where a join costs too much. Denormalise with eyes open: add triggers or jobs to keep the copies consistent.`,
        extras: [
          table('Normal forms, quickly', ['Form', 'Rule', 'Fix for violation'], [
            ['1NF', 'Atomic values, no repeating groups', 'Split multi-value columns into rows/tables'],
            ['2NF', '1NF + no partial dependency on part of a composite key', 'Move partially dependent columns out'],
            ['3NF', '2NF + no transitive non-key dependency', 'Move transitively dependent columns out'],
          ]),
          tip(
            'Normalise first, denormalise later with evidence',
            'Get the 3NF design correct. If profiling shows a join is hot, denormalise that one path — not the whole schema preemptively.',
          ),
        ],
        worked: {
          title: 'Normalise a denormalised orders table',
          problem: `You have a single table Orders(order_id, product_id, product_name, product_price, customer_id, customer_name, customer_email, qty). Bring it to 3NF.`,
          steps: [
            {
              title: '1NF check',
              desc: 'Each cell holds one value; (order_id, product_id) as composite key means one row per line item. Already 1NF if no multi-value cells.',
            },
            {
              title: '2NF fix — remove partial dependencies',
              desc: 'product_name and product_price depend only on product_id, not on the full composite key. Move them to a products table keyed by product_id.',
              code_snippet: 'Products(product_id PK, product_name, product_price)',
            },
            {
              title: '3NF fix — remove transitive dependencies',
              desc: 'customer_name and customer_email depend only on customer_id. Move them to customers. Remaining Orders columns depend fully on the composite key and not on each other.',
              code_snippet: 'Customers(customer_id PK, customer_name, customer_email)\nOrderLines(order_id, product_id, qty, PK(order_id, product_id))\nOrders(order_id PK, customer_id FK)',
            },
          ],
          solution:
            'Four tables: Customers, Products, Orders (header), OrderLines (composite key). Customer email changes in one row. New products can exist before any order. Deleting an order line does not erase the product.',
        },
        practice: {
          title: 'Normalise these',
          prompt: `1. Student(student_id, name, course1, course2, course3) — bring to 1NF/2NF.
2. Invoice(invoice_id, client_id, client_city, item, price) — bring to 3NF.
3. Identify the anomaly in a schema that stores employee.department_name directly.`,
          hint: '1: one row per (student, course): Enrolments(student_id, course_code). 2: Clients(client_id, client_city); InvoiceItems(invoice_id, item, price). 3: update anomaly — changing the department city requires updating every employee row.',
        },
        mistakes: [
          {
            mistake: 'Normalising to BCNF/4NF for a simple CRUD app',
            fix: '3NF is the practical target. Higher normal forms add joins for diminishing anomaly protection; only pursue them when the data model truly demands it.',
          },
          {
            mistake: 'Confusing 2NF and 3NF',
            fix: '2NF is about composite keys and partial dependencies. 3NF is about transitive dependencies between non-key columns. Both require 1NF first.',
          },
          {
            mistake: 'Denormalising without a consistency story',
            fix: 'A copied column that can drift is worse than a join. If you denormalise, add a trigger, constraint or job that keeps the copy truthful.',
          },
        ],
        exam: {
          question: 'Define 3NF and give one anomaly a 3NF schema prevents.',
          answer:
            'A schema is in 3NF when it is in 2NF and no non-key column transitively depends on the primary key through another non-key column. Example prevention: storing department_name on every employee row would force an update across all employees when the department is renamed; a separate departments table updates one row.',
          source: 'DB design interview standard',
        },
        summary: [
          '1NF atomic; 2NF no partial dependency; 3NF no transitive non-key dependency.',
          'Anomalies: insert, update, delete — normalization eliminates them.',
          'Practical target: 3NF; denormalise only with evidence and a consistency plan.',
          'Composite keys make 2NF violations common — check partial dependencies carefully.',
        ],
      }),
      [
        [
          '2NF eliminates:',
          ['Repeating groups', 'Partial dependencies on part of a composite key', 'Transitive dependencies', 'All NULLs'],
          1,
          '2NF requires every non-key column to depend on the whole key, not a subset of a composite key.',
        ],
          [
          '3NF eliminates:',
          ['Partial dependencies', 'Transitive dependencies between non-key columns', 'Repeating groups', 'Multi-valued attributes'],
          1,
          'Transitive: non-key A determines non-key B, so B should live with A, not with the main entity.',
        ],
        [
          'Updating customer email stored on every order row risks:',
          ['An insert anomaly only', 'An update anomaly (inconsistent data if one row is missed)', 'A delete anomaly only', 'Nothing'],
          1,
          'Update anomaly: one logical fact is stored many times; partial updates create inconsistency.',
        ],
      ]
    ),
    lesson(
      M4,
      'sq-4-2',
      2,
      'Transactions, isolation and window functions',
      'Guarantee all-or-nothing writes, understand dirty reads, and compute running totals without self-joins.',
      18,
      nineBlocks({
        objectives: [
          'State the ACID properties and what each one guarantees',
          'Distinguish READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ and SERIALIZABLE isolation levels',
          'Use window functions for running totals, ranks and row-to-row comparisons',
          'Decide when a window function replaces a correlated subquery',
        ],
        hook: `A bank transfer debits one account and credits another. If the process crashes after the debit and before the credit, money vanishes. Transactions exist so the database commits both or neither. Separately, a product dashboard needs "each sale as a percent of its category total" — a window function computes that in one pass; a correlated subquery does it in N passes.`,
        concept: `**ACID:**

| Property | Meaning |
| --- | --- |
| Atomicity | All statements in the transaction commit, or none do |
| Consistency | Constraints and rules hold after commit |
| Isolation | Concurrent transactions do not see each other's uncommitted work (level-dependent) |
| Durability | Committed data survives crashes |

**Isolation levels and their anomalies:**

| Level | Dirty read | Non-repeatable read | Phantom |
| --- | --- | --- | --- |
| READ UNCOMMITTED | Yes | Yes | Yes |
| READ COMMITTED | No | Yes | Yes |
| REPEATABLE READ | No | No | Yes (PG: mostly no, uses snapshot) |
| SERIALIZABLE | No | No | No |

Most web apps run at READ COMMITTED (PostgreSQL default). Financial ledgers often need REPEATABLE READ or SERIALIZABLE plus explicit locking.

**Window functions** compute across a set of rows related to the current row, without collapsing them (unlike GROUP BY):

- Running total: SUM(amount) OVER (ORDER BY created_at ROWS UNBOUNDED PRECEDING)
- Rank within group: ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY price DESC)
- Share of total: SUM(amount) OVER () for a grand total to divide by
- Row-to-row compare: LAG(col) OVER (ORDER BY id) for the previous row's value

Syntax shape: function() OVER (PARTITION BY ... ORDER BY ... frame).

Window functions run after WHERE and GROUP BY, so you cannot filter on a window result in the same query's WHERE — wrap it in a subquery or CTE and filter outside.`,
        extras: [
          code(
            `-- Running total per customer
SELECT customer_id, created_at, amount,
       SUM(amount) OVER (
         PARTITION BY customer_id
         ORDER BY created_at
         ROWS UNBOUNDED PRECEDING
       ) AS running_total
FROM orders;`,
            'running_total.sql',
            'sql'
          ),
          warn(
            'FOR UPDATE to prevent lost updates',
            'Two concurrent transfers reading the same balance and writing new balances can lose one update (read-modify-write race). SELECT ... FOR UPDATE locks the rows for the duration of the transaction.',
          ),
        ],
        worked: {
          title: 'Rank products within each category and share of category revenue',
          problem: `From order_items (product_id, category_id, revenue), rank products by revenue within each category and compute each product's share of its category total.`,
          steps: [
            {
              title: 'Rank within partition',
              desc: 'PARTITION BY category_id creates one ranking per category; ORDER BY revenue DESC puts the top seller first.',
              code_snippet: 'RANK() OVER (PARTITION BY category_id ORDER BY revenue DESC) AS cat_rank',
            },
            {
              title: 'Category total as a window',
              desc: 'SUM(revenue) OVER (PARTITION BY category_id) repeats the category total on every row of that category.',
              code_snippet: 'SUM(revenue) OVER (PARTITION BY category_id) AS cat_total',
            },
            {
              title: 'Divide for share',
              desc: 'Share = revenue / cat_total. Cast to avoid integer division in some engines.',
              code_snippet: 'revenue * 1.0 / cat_total AS cat_share',
            },
          ],
          solution:
            'SELECT product_id, category_id, revenue, RANK() OVER (PARTITION BY category_id ORDER BY revenue DESC) AS cat_rank, revenue * 1.0 / SUM(revenue) OVER (PARTITION BY category_id) AS cat_share FROM order_items;',
        },
        practice: {
          title: 'Write these',
          prompt: `1. Running balance per account using SUM OVER ordered by transaction time.
2. LAG to find each row delta from the previous row.
3. Transactions at SERIALIZABLE: when would you choose it over REPEATABLE READ?`,
          hint: '1: SUM(amount) OVER (PARTITION BY account_id ORDER BY posted_at ROWS UNBOUNDED PRECEDING). 2: amount - LAG(amount) OVER (ORDER BY id). 3: when write skew between concurrent transactions must be impossible (e.g. transfer + balance check across accounts).',
        },
        mistakes: [
          {
            mistake: 'Using GROUP BY when you meant a window function',
            fix: 'GROUP BY collapses rows; OVER () keeps them. "Each row plus its category total" is a window, not a group.',
          },
          {
            mistake: 'Filtering a window result in the same WHERE',
            fix: 'Windows are computed after WHERE. Wrap the window query in a CTE or subquery, then filter the outer query.',
          },
          {
            mistake: 'Assuming REPEATABLE READ prevents phantoms in every engine',
            fix: 'SQL standard says phantoms are possible; PostgreSQL REPEATABLE READ uses a snapshot and does prevent them in practice. Check your engine docs.',
          },
        ],
        exam: {
          question: 'Write a query for each order showing amount and the running total per customer.',
          answer:
            "SELECT customer_id, created_at, amount, SUM(amount) OVER (PARTITION BY customer_id ORDER BY created_at ROWS UNBOUNDED PRECEDING) AS running_total FROM orders;",
          source: 'Analytics SQL screening',
        },
        summary: [
          'ACID: Atomicity, Consistency, Isolation, Durability.',
          'Isolation levels trade anomalies for concurrency; READ COMMITTED is the common default.',
          'Window functions keep row detail while computing across related rows.',
          'PARTITION BY splits windows; ORDER BY + frame defines the running set.',
          'Cannot filter window results in the same WHERE — use a subquery/CTE.',
        ],
      }),
      [
        [
          'READ COMMITTED prevents:',
          ['Dirty reads only', 'Dirty reads and non-repeatable reads', 'All anomalies', 'Nothing'],
          1,
          'You never see other transactions uncommitted data, but another commit between your reads can change values you re-read.',
        ],
        [
          'Running total per customer uses:',
          ['GROUP BY customer_id', 'SUM() OVER (PARTITION BY customer_id ORDER BY created_at)', 'A self-join only', 'HAVING SUM(...)',],
          1,
          'Window SUM with an ordered frame keeps each row and adds a cumulative column.',
        ],
        [
          'Window functions are evaluated:',
          ['Before WHERE', 'After WHERE and GROUP BY, before DISTINCT/ORDER BY/LIMIT', 'After ORDER BY only', 'Only in HAVING'],
          1,
          'Logical order: WHERE -> GROUP BY -> HAVING -> window functions -> SELECT -> DISTINCT -> ORDER BY -> LIMIT.',
        ],
      ]
    ),
  ],
};
