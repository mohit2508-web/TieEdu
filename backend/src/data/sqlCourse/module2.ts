// Module 2 — Aggregation, GROUP BY & Subqueries
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, code } from '../nineBlocks';
import { lesson, M2, COURSE_ID } from './helpers';

export const module2: CourseModule = {
  id: M2,
  course_id: COURSE_ID,
  title: 'Module 2 — Aggregation, GROUP BY & Subqueries',
  summary: 'Group rows into summaries, filter groups with HAVING, and nest queries without losing readability.',
  sort_order: 2,
  lessons: [
    lesson(
      M2,
      'sq-2-1',
      1,
      'GROUP BY, HAVING and aggregate functions',
      'Summarise data correctly, and know exactly which aggregate ignores NULLs.',
      16,
      nineBlocks({
        objectives: [
          'Apply COUNT, SUM, AVG, MIN, MAX with correct NULL behaviour',
          'Group rows with GROUP BY and filter groups with HAVING',
          'Use COUNT(DISTINCT col) to count unique values',
          'Explain why every non-aggregated SELECT column must appear in GROUP BY',
        ],
        hook: `The finance team wants "average order value per city, only for cities with more than 100 orders last year". Two filters: one on rows (last year) and one on the summary (more than 100 orders). WHERE handles the first; HAVING handles the second. Mixing them up is the most common aggregate error in take-home tests.`,
        concept: `Aggregates collapse many rows into one summary value.

| Function | NULL handling | Notes |
| --- | --- | --- |
| COUNT(*) | Counts all rows | Includes rows where every column is NULL |
| COUNT(col) | Skips NULLs in col | Use this for "how many have a value" |
| COUNT(DISTINCT col) | Skips NULLs, counts unique | For unique customer ids etc. |
| SUM / AVG | Ignore NULLs | AVG = SUM / count of non-NULL |
| MIN / MAX | Ignore NULLs | Work on strings and dates too |

**GROUP BY** partitions the result set into groups; each group produces one output row. Every column in the SELECT list must either be an aggregate or appear in GROUP BY — otherwise the value within the group is ambiguous.

**HAVING** filters groups after aggregation, like WHERE filters rows before it. A query can have WHERE without HAVING, HAVING without WHERE, or both.

Typical shape:
SELECT city, COUNT(*) AS orders, SUM(amount) AS revenue
FROM orders
WHERE created_at >= '2025-01-01'
GROUP BY city
HAVING COUNT(*) > 100
ORDER BY revenue DESC;`,
        extras: [
          tip(
            'Filter rows in WHERE, groups in HAVING',
            'Push every predicate that does not involve an aggregate into WHERE. It reduces the rows before grouping and is faster and clearer.',
          ),
          warn(
            'SELECT list vs GROUP BY mismatch',
            "PostgreSQL and standard SQL reject `SELECT city, customer_id FROM orders GROUP BY city` because customer_id is not determined by city. Either add it to GROUP BY or aggregate it.",
          ),
        ],
        worked: {
          title: 'Two-level filter: rows then groups',
          problem: `From orders (id, customer_id, city, amount, created_at), report each city's order count and total revenue for 2025, only for cities with more than 50 orders.`,
          steps: [
            {
              title: 'Filter rows first with WHERE',
              desc: 'Restrict to 2025 before any aggregation so the group statistics only see that year.',
              code_snippet: "WHERE created_at >= '2025-01-01'\n  AND created_at <  '2026-01-01'",
            },
            {
              title: 'Group by city and aggregate',
              desc: 'COUNT(*) for order count; SUM(amount) for revenue.',
              code_snippet: 'GROUP BY city\nSELECT city, COUNT(*) AS orders, SUM(amount) AS revenue',
            },
            {
              title: 'Filter groups with HAVING',
              desc: 'Only keep groups where the count exceeds 50. HAVING can reference the aggregate directly.',
              code_snippet: 'HAVING COUNT(*) > 50',
            },
            {
              title: 'Order the summary',
              desc: 'Sort by revenue descending for the report.',
              code_snippet: 'ORDER BY revenue DESC;',
            },
          ],
          solution:
            "SELECT city, COUNT(*) AS orders, SUM(amount) AS revenue FROM orders WHERE created_at >= '2025-01-01' AND created_at < '2026-01-01' GROUP BY city HAVING COUNT(*) > 50 ORDER BY revenue DESC;",
        },
        practice: {
          title: 'Write these aggregates',
          prompt: `1. Average salary per department, only departments with avg > 40000.
2. Count distinct customers who ordered in 2025.
3. Max and min order amount per status.`,
          hint: "1: GROUP BY department_id HAVING AVG(salary) > 40000. 2: COUNT(DISTINCT customer_id) with WHERE on date. 3: GROUP BY status with MIN(amount), MAX(amount).",
        },
        mistakes: [
          {
            mistake: 'Using COUNT(*) when you mean COUNT(col)',
            fix: 'COUNT(*) counts rows; COUNT(col) counts non-NULL values. For "how many customers left a review", use COUNT(review_col).',
          },
          {
            mistake: 'Putting an aggregate predicate in WHERE',
            fix: '`WHERE COUNT(*) > 10` is invalid — WHERE runs before grouping. Use HAVING.',
          },
          {
            mistake: 'Forgetting that AVG ignores NULLs',
            fix: 'AVG(salary) divides by the number of non-NULL salaries. If you need NULLs as zero, use AVG(COALESCE(salary, 0)).',
          },
        ],
        exam: {
          question: 'Difference between COUNT(*) and COUNT(customer_id)?',
          answer:
            'COUNT(*) counts every row in the group. COUNT(customer_id) counts only rows where customer_id is not NULL. For a LEFT JOINed orders table, COUNT(*) includes the NULL-filled order rows of customers with no orders; COUNT(order_id) correctly reports 0 for them.',
          source: 'Frequent HR-screen question',
        },
        summary: [
          'Aggregates ignore NULLs except COUNT(*).',
          'WHERE filters rows before grouping; HAVING filters groups after.',
          'Every non-aggregated SELECT column must be in GROUP BY.',
          'COUNT(DISTINCT col) counts unique non-NULL values.',
        ],
      }),
      [
        [
          'COUNT(*) differs from COUNT(col) in that:',
          ['They are always identical', 'COUNT(*) counts rows; COUNT(col) skips NULLs', 'COUNT(col) is faster', 'COUNT(*) skips NULLs'],
          1,
          'COUNT(*) counts every row; COUNT(col) counts only non-NULL values in that column.',
        ],
        [
          'To filter groups after aggregation you use:',
          ['WHERE', 'HAVING', 'ORDER BY', 'LIMIT'],
          1,
          'HAVING filters grouped results; WHERE filters individual rows before grouping.',
        ],
        [
          'AVG(salary) when some salaries are NULL:',
          ['Returns NULL', 'Ignores NULLs and averages the rest', 'Treats NULL as 0', 'Raises an error'],
          1,
          'AVG (like SUM, MIN, MAX) ignores NULLs; only COUNT(*) includes them.',
        ],
      ]
    ),
    lesson(
      M2,
      'sq-2-2',
      2,
      'Subqueries and CTEs',
      'Nest a query inside another, and rewrite it as a CTE when the nesting gets unreadable.',
      16,
      nineBlocks({
        objectives: [
          'Write a scalar subquery in SELECT, WHERE or FROM',
          'Use IN / EXISTS / ANY with subqueries for semi- and anti-joins',
          'Rewrite a nested subquery as a Common Table Expression for readability',
          'Decide when a correlated subquery is necessary versus a join',
        ],
        hook: `The classic interview prompt: "find employees earning more than the average salary of their department". You cannot put AVG in WHERE, and a plain JOIN cannot reference the same table's group average without a subquery. The answer is either a correlated subquery in WHERE or a join against a pre-aggregated derived table — both patterns appear in every SQL screening test.`,
        concept: `A subquery is a query nested inside another. Placement determines its type:

| Placement | Type | Returns |
| --- | --- | --- |
| SELECT list | Scalar subquery | Exactly one value |
| WHERE with IN / EXISTS | Semi-join | Filters rows by membership |
| FROM | Derived table | A temporary result set to join |
| HAVING | Group filter subquery | A single value per group comparison |

**Correlated subquery** references the outer query's row; it re-executes per outer row. Useful but often slower than an equivalent join.

**EXISTS vs IN:** EXISTS checks for any matching row (semi-join semantics); IN checks membership in a set. For NULL handling, NOT IN is dangerous: if the subquery returns any NULL, the whole NOT IN evaluates to unknown and returns zero rows. Prefer NOT EXISTS.

**CTE (WITH clause):** names a subquery so the main query reads top-to-bottom.

WITH dept_avg AS (
  SELECT department_id, AVG(salary) AS avg_sal
  FROM employees GROUP BY department_id
)
SELECT e.name, e.salary
FROM employees e
JOIN dept_avg d ON e.department_id = d.department_id
WHERE e.salary > d.avg_sal;`,
        extras: [
          code(
            '-- Correlated subquery in WHERE\nSELECT e.name, e.salary\nFROM employees e\nWHERE e.salary > (\n  SELECT AVG(salary)\n  FROM employees\n  WHERE department_id = e.department_id\n);',
            'correlated.sql',
            'sql'
          ),
          warn(
            'NOT IN with NULLs',
            'If the subquery for NOT IN can return NULL, the result is empty. Use NOT EXISTS instead — it is NULL-safe and usually clearer.',
          ),
        ],
        worked: {
          title: 'Employees above their department average, two ways',
          problem: `List employees earning more than the average salary of their own department.`,
          steps: [
            {
              title: 'Correlated subquery form',
              desc: 'For each employee, re-compute the department average in a nested SELECT that references the outer department_id.',
              code_snippet: "WHERE e.salary > (SELECT AVG(salary) FROM employees WHERE department_id = e.department_id)",
            },
            {
              title: 'CTE + join form',
              desc: 'Pre-aggregate department averages into a CTE, then join employees to it and filter. Same result, usually faster and easier to read.',
              code_snippet: 'WITH dept_avg AS (SELECT department_id, AVG(salary) AS avg_sal FROM employees GROUP BY department_id)\nSELECT e.name, e.salary FROM employees e JOIN dept_avg d ON e.department_id = d.department_id WHERE e.salary > d.avg_sal;',
            },
          ],
          solution:
            'Both forms are correct. Prefer the CTE + join: the aggregation happens once, not once per employee, and the query reads top-to-bottom.',
        },
        practice: {
          title: 'Write these',
          prompt: `1. Products that have never been ordered (NOT EXISTS).
2. Customers whose total spending exceeds 10000 (subquery in HAVING or CTE).
3. Rewrite #1 as a LEFT JOIN anti-join.`,
          hint: "1: NOT EXISTS (SELECT 1 FROM orders o WHERE o.product_id = p.id). 2: GROUP BY customer_id HAVING SUM(amount) > 10000. 3: LEFT JOIN orders, WHERE o.id IS NULL.",
        },
        mistakes: [
          {
            mistake: 'Using NOT IN when the subquery can return NULL',
            fix: 'Any NULL in the NOT IN list makes the whole predicate unknown. Rewrite as NOT EXISTS.',
          },
          {
            mistake: 'Writing a correlated subquery when a join is cheaper',
            fix: 'The correlated form re-executes per outer row. A CTE or derived table aggregates once. Use correlated only when the logic truly needs per-row context.',
          },
          {
            mistake: 'Selecting extra columns in an IN subquery',
            fix: 'IN compares against a single column. Multi-column membership needs row constructors or EXISTS.',
          },
        ],
        exam: {
          question: 'Find all employees who earn more than the average salary of the whole company.',
          answer:
            "SELECT name, salary FROM employees WHERE salary > (SELECT AVG(salary) FROM employees); — the subquery is uncorrelated (no outer reference), so it executes once and returns a scalar.",
          source: 'Standard first-round screening',
        },
        summary: [
          'Scalar subquery returns one value; IN/EXISTS filter rows; FROM subquery is a derived table.',
          'Correlated subqueries reference the outer row and re-execute per row.',
          'NOT IN breaks on NULLs; prefer NOT EXISTS.',
          'CTEs (WITH) name subqueries for readability and single-pass aggregation.',
        ],
      }),
      [
        [
          'A subquery in the FROM clause is called:',
          ['Scalar subquery', 'Derived table', 'Correlated subquery', 'CTE'],
          1,
          'A derived table is a subquery in FROM that produces a temporary result set to join against.',
        ],
        [
          'NOT IN returns no rows when the subquery contains:',
          ['Any NULL', 'Any duplicate', 'Zero rows', 'A string'],
          0,
          'One NULL in the NOT IN list makes the comparison unknown for every row; use NOT EXISTS instead.',
        ],
        [
          'A correlated subquery:',
          ['Executes once', 'References outer query columns and re-executes per outer row', 'Must return multiple rows', 'Can only appear in FROM'],
          1,
          'Correlation means the inner query depends on the current outer row, so the engine evaluates it repeatedly.',
        ],
      ]
    ),
  ],
};
