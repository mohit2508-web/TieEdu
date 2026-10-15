// Module 1 — SELECT, Filtering & JOINs
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, code } from '../nineBlocks';
import { lesson, M1, COURSE_ID } from './helpers';

export const module1: CourseModule = {
  id: M1,
  course_id: COURSE_ID,
  title: 'Module 1 — SELECT, Filtering & JOINs',
  summary: 'Query shape, WHERE clauses, and the join types every interview asks about.',
  sort_order: 1,
  lessons: [
    lesson(
      M1,
      'sq-1-1',
      1,
      'SELECT, WHERE and the query lifecycle',
      'Read a query the way the engine reads it, and filter rows without guessing.',
      16,
      nineBlocks({
        objectives: [
          'Write a SELECT with column projections, aliases and computed expressions',
          'Filter rows with WHERE using comparison operators, IN, BETWEEN, LIKE and NULL checks',
          'Order and limit results with ORDER BY and LIMIT/OFFSET',
          'Explain the logical order in which a SQL query is evaluated',
        ],
        hook: `A product manager asks you for "top 10 customers by revenue in the last quarter who have not returned an order". That is one SELECT with a join, a GROUP BY, a HAVING, an ORDER BY and a LIMIT. Every clause has a fixed position in the query and a fixed position in the engine's evaluation order. Learn that order once, and multi-clause questions stop being intimidating.`,
        concept: `A SELECT statement answers: which rows, which columns, in what order, how many.

**The logical evaluation order** (not the written order):

1. FROM / JOIN — identify the source rows.
2. WHERE — filter rows (before grouping).
3. GROUP BY — collapse rows into groups.
4. HAVING — filter groups (after grouping).
5. SELECT — choose columns and compute expressions.
6. DISTINCT — remove duplicate rows.
7. ORDER BY — sort the result.
8. LIMIT / OFFSET — cut the result.

This is why you cannot use a column alias inside WHERE (the alias is only resolved at step 5) and why WHERE filters rows while HAVING filters groups.

**NULL is three-valued logic.** NULL means "unknown", not zero or empty string. Comparisons with NULL return NULL (treated as false), so \`WHERE col = NULL\` never matches. Use \`IS NULL\` / \`IS NOT NULL\` instead. Similarly, aggregates ignore NULLs: COUNT(col) skips NULLs, COUNT(*) counts rows.`,
        extras: [
          table('Comparison operators', ['Operator', 'Works with', 'Example'], [
            ['=, <>, <, >, <=, >=', 'Numbers, strings, dates', 'age >= 18'],
            ['IN (...)', 'Lists', 'status IN (\'active\', \'pending\')'],
            ['BETWEEN a AND b', 'Inclusive ranges', 'salary BETWEEN 30000 AND 50000'],
            ['LIKE pattern', 'Strings; % any run, _ one char', 'name LIKE \'A%\''],
            ['IS NULL / IS NOT NULL', 'Any column', 'email IS NOT NULL'],
          ]),
          warn(
            'NULL in WHERE',
            "`WHERE salary = NULL` returns zero rows even when NULLs exist, because NULL = NULL is not true. Always write `IS NULL`.",
          ),
          tip(
            'Select explicit columns, never SELECT *',
            'Explicit columns make queries readable, use indexes, and stop schema changes upstream from breaking your code. In interviews, always name the columns.',
          ),
        ],
        worked: {
          title: 'Filter, compute and order in one query',
          problem: `From an orders table (id, customer_id, amount, status, created_at), list the order id and amount for paid orders above 1000 placed in 2025, newest first, limited to 10 rows.`,
          steps: [
            {
              title: 'Identify source and filters',
              desc: 'Source: orders. Filters: status = paid, amount > 1000, created_at in 2025.',
              code_snippet: "WHERE status = 'paid'\n  AND amount > 1000\n  AND created_at >= '2025-01-01'\n  AND created_at <  '2026-01-01'",
            },
            {
              title: 'Project only the needed columns',
              desc: 'Select id and amount. Add a computed column for amount with GST if wanted.',
              code_snippet: 'SELECT id, amount',
            },
            {
              title: 'Order and limit',
              desc: 'Newest first: created_at DESC. Top 10: LIMIT 10.',
              code_snippet: 'ORDER BY created_at DESC\nLIMIT 10',
            },
          ],
          solution:
            "SELECT id, amount FROM orders WHERE status = 'paid' AND amount > 1000 AND created_at >= '2025-01-01' AND created_at < '2026-01-01' ORDER BY created_at DESC LIMIT 10;",
        },
        practice: {
          title: 'Write these queries',
          prompt: `1. List names of employees in department 3 earning more than 50000.
2. Find products whose name starts with "Pro" and price is between 100 and 500.
3. List all users with a NULL phone number, ordered alphabetically by name.`,
          hint: "1: SELECT name FROM employees WHERE department_id = 3 AND salary > 50000. 2: WHERE name LIKE 'Pro%' AND price BETWEEN 100 AND 500. 3: WHERE phone IS NULL ORDER BY name.",
        },
        mistakes: [
          {
            mistake: 'Using = with NULL',
            fix: 'NULL = NULL is not true. Use IS NULL / IS NOT NULL.',
          },
          {
            mistake: 'Putting aggregates in WHERE',
            fix: 'WHERE filters rows before grouping. Aggregate conditions belong in HAVING.',
          },
          {
            mistake: 'Forgetting that LIKE is case-sensitive in some engines',
            fix: 'PostgreSQL LIKE is case-sensitive; use ILIKE or LOWER() for case-insensitive matching. MySQL default collation is usually case-insensitive.',
          },
        ],
        exam: {
          question: 'Why does `SELECT * FROM t WHERE col <> NULL` return no rows even when col has NULLs?',
          answer:
            'Any comparison with NULL evaluates to UNKNOWN, not true or false. WHERE only keeps rows where the condition is TRUE, so UNKNOWN rows are dropped. Use IS NOT NULL instead.',
          source: 'Standard interview warmup',
        },
        summary: [
          'Logical order: FROM -> WHERE -> GROUP BY -> HAVING -> SELECT -> DISTINCT -> ORDER BY -> LIMIT.',
          'NULL is unknown; use IS NULL, never = NULL.',
          'SELECT explicit columns; never SELECT * in production code.',
          'WHERE filters rows; HAVING filters groups.',
        ],
      }),
      [
        [
          'Which clause filters rows BEFORE grouping?',
          ['HAVING', 'WHERE', 'ORDER BY', 'LIMIT'],
          1,
          'WHERE runs before GROUP BY; HAVING runs after.',
        ],
        [
          'To find NULL values you write:',
          ['col = NULL', 'col IS NULL', 'col != NULL', 'NVL(col)'],
          1,
          'Equality with NULL is always UNKNOWN; IS NULL is the correct test.',
        ],
        [
          'Logical order of evaluation starts with:',
          ['SELECT', 'FROM / JOIN', 'WHERE', 'ORDER BY'],
          1,
          'The engine first identifies source rows (FROM/JOIN), then filters, groups, projects, sorts.',
        ],
      ]
    ),
    lesson(
      M1,
      'sq-1-2',
      2,
      'JOINs — inner, left, and the ones that matter',
      'Combine tables without multiplying rows or silently dropping them.',
      18,
      nineBlocks({
        objectives: [
          'Write INNER JOIN, LEFT JOIN and FULL OUTER JOIN and predict row counts',
          'Distinguish a missing match from a NULL-filled match',
          'Join a table to itself with aliases for hierarchical data',
          'Diagnose accidental row multiplication from non-unique join keys',
        ],
        hook: `You run a LEFT JOIN from customers to orders to list every customer with their order count. The report says a customer with 50 orders appears 50 times. The join is correct; the aggregation is missing. Row multiplication from joins is the single most common production bug in reporting SQL, and this lesson teaches you to see it before the stakeholder does.`,
        concept: `A JOIN combines rows from two tables based on a related column.

**The four joins that matter:**

| Join | Kept rows | When to use |
| --- | --- | --- |
| INNER | Only matching pairs | Both sides must have data |
| LEFT | All left rows; NULL-fill right where no match | Keep every left entity, with optional detail |
| RIGHT | All right rows; NULL-fill left | Mirror of LEFT |
| FULL OUTER | All rows from both sides | Find orphans on either side |

**The row-multiplication rule:** if the join key is not unique on one side, each left row matches multiple right rows and the result has more rows than either input. COUNT(*) after a join is therefore not "count of customers" unless you aggregate per customer first.

**Self-join:** join a table to itself using aliases, e.g. employees e JOIN employees m ON e.manager_id = m.id to pair each employee with their manager.

**Anti-join (find orphans):** LEFT JOIN + WHERE right.key IS NULL returns left rows with no match — the classic "customers who never ordered" query.`,
        extras: [
          tip(
            'INNER vs LEFT is a product decision',
            'Ask: should a customer with zero orders still appear in the report? If yes, LEFT JOIN. If only customers with orders matter, INNER JOIN. This is a requirements question, not a syntax question.',
          ),
          code(
            '-- Anti-join: customers with no orders\nSELECT c.id, c.name\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nWHERE o.id IS NULL;',
            'anti_join.sql',
            'sql'
          ),
        ],
        worked: {
          title: 'LEFT JOIN with a count, done correctly',
          problem: `List every customer and their order count, including customers with zero orders.`,
          steps: [
            {
              title: 'Decide the join direction',
              desc: 'Every customer must appear even with zero orders: LEFT JOIN from customers to orders.',
              code_snippet: 'FROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id',
            },
            {
              title: 'Aggregate per customer, not per row',
              desc: 'COUNT(o.id) counts only non-NULL order ids, so customers with no orders get 0. COUNT(*) would count the NULL-filled row as 1 — wrong.',
              code_snippet: 'COUNT(o.id) AS order_count',
            },
            {
              title: 'Complete the query',
              desc: 'GROUP BY the customer columns, then order by count descending.',
              code_snippet: 'GROUP BY c.id, c.name\nORDER BY order_count DESC;',
            },
          ],
          solution:
            'SELECT c.id, c.name, COUNT(o.id) AS order_count FROM customers c LEFT JOIN orders o ON o.customer_id = c.id GROUP BY c.id, c.name ORDER BY order_count DESC;',
        },
        practice: {
          title: 'Write these',
          prompt: `1. List all products and their category name (products LEFT JOIN categories).
2. Find employees who have never been assigned a task (anti-join).
3. Pair each employee with their manager (self-join).`,
          hint: "1: SELECT p.name, c.name FROM products p LEFT JOIN categories c ON p.category_id = c.id. 2: LEFT JOIN tasks, filter WHERE t.id IS NULL. 3: SELECT e.name, m.name FROM employees e LEFT JOIN employees m ON e.manager_id = m.id.",
        },
        mistakes: [
          {
            mistake: 'Using COUNT(*) after a LEFT JOIN and getting inflated numbers',
            fix: 'COUNT(*) counts NULL-filled rows as 1. Use COUNT(right.key) which skips NULLs, or aggregate in a subquery first.',
          },
          {
            mistake: 'Joining on a non-unique key without aggregating',
            fix: 'If the right side has duplicate keys, each left row multiplies. Deduplicate the right side or aggregate before joining.',
          },
          {
            mistake: 'Confusing LEFT and RIGHT when the tables are written in a different order',
            fix: 'LEFT keeps all rows from the table written immediately after FROM/LEFT JOIN. Rewrite RIGHT as LEFT by swapping table order — it is clearer.',
          },
        ],
        exam: {
          question: 'Write a query to find customers who have never placed an order.',
          answer:
            "SELECT c.id, c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL; — the anti-join pattern: keep all customers, filter to those whose order match is NULL.",
          source: 'Classic interview question',
        },
        summary: [
          'INNER keeps matches only; LEFT keeps all left rows with NULL-fill.',
          'COUNT(*) counts NULL-filled rows; COUNT(right.key) does not.',
          'Non-unique join keys multiply rows — always check cardinality.',
          'Anti-join: LEFT JOIN + WHERE right.key IS NULL finds orphans.',
        ],
      }),
      [
        [
          'A LEFT JOIN from customers to orders, with COUNT(*), gives a customer with 5 orders a count of:',
          ['5', '6', '1', '0'],
          1,
          'The customer row joins to 5 order rows; COUNT(*) counts all 6 rows including any NULL-fill only if zero orders. With 5 matching orders there is no NULL row, but if the customer had 0 orders COUNT(*) still returns 1. The safe count is COUNT(o.id).',
        ],
        [
          'To find customers with no orders you use:',
          ['INNER JOIN', 'LEFT JOIN + WHERE right IS NULL', 'RIGHT JOIN only', 'CROSS JOIN'],
          1,
          'The anti-join pattern keeps all left rows, then filters to those with no match on the right.',
        ],
        [
          'Joining employees to themselves to get managers is called:',
          ['Outer join', 'Self-join', 'Cross join', 'Natural join'],
          1,
          'A self-join uses aliases to treat one table as two logical relations.',
        ],
      ]
    ),
  ],
};
