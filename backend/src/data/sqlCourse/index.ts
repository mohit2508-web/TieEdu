// ============================================================================
// SQL & DATABASES MASTERY — flagship free course (Phase 4 course 4).
//
// The database skill every developer needs for placements and production:
// querying, joining, aggregating, schema design, indexing and transactions.
// Four modules, eight lessons on the 9-block standard, 30-question exam bank.
// ============================================================================

import type { Course, ExamQuestion } from '../db';
import { module1 } from './module1';
import { module2 } from './module2';
import { module3 } from './module3';
import { module4 } from './module4';

const examBank: ExamQuestion[] = [
  {
    id: 'sq-exam-01',
    prompt: 'Which clause filters rows BEFORE grouping?',
    options: ['HAVING', 'WHERE', 'ORDER BY', 'LIMIT'],
    correct_index: 1,
    explanation: 'WHERE runs before GROUP BY; HAVING runs after aggregation.',
    difficulty: 'easy',
    topic: 'Query basics',
  },
  {
    id: 'sq-exam-02',
    prompt: 'To find NULL values you write:',
    options: ['col = NULL', 'col IS NULL', 'col != NULL', 'NVL(col, 0)'],
    correct_index: 1,
    explanation: 'Equality with NULL is UNKNOWN; IS NULL is the correct predicate.',
    difficulty: 'easy',
    topic: 'NULL handling',
  },
  {
    id: 'sq-exam-03',
    prompt: 'Logical evaluation order starts with:',
    options: ['SELECT', 'FROM / JOIN', 'WHERE', 'ORDER BY'],
    correct_index: 1,
    explanation: 'Source rows are identified first, then filtered, grouped, projected, sorted.',
    difficulty: 'easy',
    topic: 'Query basics',
  },
  {
    id: 'sq-exam-04',
    prompt: 'COUNT(*) vs COUNT(col):',
    options: ['Identical', 'COUNT(*) counts rows; COUNT(col) skips NULLs', 'COUNT(col) is faster', 'COUNT(*) skips NULLs'],
    correct_index: 1,
    explanation: 'COUNT(*) counts every row; COUNT(col) counts only non-NULL values.',
    difficulty: 'easy',
    topic: 'Aggregation',
  },
  {
    id: 'sq-exam-05',
    prompt: 'AVG(salary) when some salaries are NULL:',
    options: ['Returns NULL', 'Ignores NULLs and averages the rest', 'Treats NULL as 0', 'Errors'],
    correct_index: 1,
    explanation: 'AVG, SUM, MIN, MAX all ignore NULLs.',
    difficulty: 'easy',
    topic: 'Aggregation',
  },
  {
    id: 'sq-exam-06',
    prompt: 'LEFT JOIN from customers to orders with COUNT(*) for a customer with 0 orders gives:',
    options: ['0', '1', 'NULL', 'Error'],
    correct_index: 1,
    explanation: 'The NULL-filled order row is still a row; COUNT(*) counts it as 1. Use COUNT(o.id) for the correct 0.',
    difficulty: 'medium',
    topic: 'JOINs',
  },
  {
    id: 'sq-exam-07',
    prompt: 'Customers with no orders are found with:',
    options: ['INNER JOIN', 'LEFT JOIN + WHERE right.key IS NULL', 'CROSS JOIN', 'RIGHT JOIN only'],
    correct_index: 1,
    explanation: 'The anti-join pattern: keep all left rows, filter to those with no match.',
    difficulty: 'medium',
    topic: 'JOINs',
  },
  {
    id: 'sq-exam-08',
    prompt: 'NOT IN returns no rows when the subquery has:',
    options: ['Any NULL', 'Any duplicate', 'Zero rows', 'A string'],
    correct_index: 0,
    explanation: 'One NULL makes the whole NOT IN UNKNOWN; prefer NOT EXISTS.',
    difficulty: 'medium',
    topic: 'Subqueries',
  },
  {
    id: 'sq-exam-09',
    prompt: 'A correlated subquery:',
    options: ['Executes once', 'References outer columns and re-executes per outer row', 'Must return multiple rows', 'Only works in FROM'],
    correct_index: 1,
    explanation: 'Correlation means dependence on the current outer row.',
    difficulty: 'medium',
    topic: 'Subqueries',
  },
  {
    id: 'sq-exam-10',
    prompt: 'PRIMARY KEY implies:',
    options: ['Nullable unique', 'NOT NULL and unique', 'Indexed but nullable', 'Foreign key'],
    correct_index: 1,
    explanation: 'Primary keys are both unique and non-NULL.',
    difficulty: 'easy',
    topic: 'Constraints',
  },
  {
    id: 'sq-exam-11',
    prompt: 'CHECK (amount > 0) when amount is NULL:',
    options: ['Rejects', 'Passes (UNKNOWN)', 'Stores 0', 'Warns'],
    correct_index: 1,
    explanation: 'UNKNOWN does not fail CHECK; pair with NOT NULL.',
    difficulty: 'medium',
    topic: 'Constraints',
  },
  {
    id: 'sq-exam-12',
    prompt: 'FLOAT is unsafe for money because:',
    options: ['It is slow', 'It cannot represent many decimals exactly', 'It stores NULLs', 'It is deprecated'],
    correct_index: 1,
    explanation: 'Binary floating point drifts on decimal fractions; use NUMERIC or integer paise.',
    difficulty: 'easy',
    topic: 'Data types',
  },
  {
    id: 'sq-exam-13',
    prompt: 'An index on (a, b) can serve:',
    options: ['WHERE b = 1 only', 'WHERE a = 1 or a = 1 AND b = 2', 'Any WHERE on a or b', 'WHERE a + b = 3 only'],
    correct_index: 1,
    explanation: 'Leftmost prefix rule: the leading column a must be constrained.',
    difficulty: 'medium',
    topic: 'Indexes',
  },
  {
    id: 'sq-exam-14',
    prompt: 'PostgreSQL foreign key columns are:',
    options: ['Auto-indexed', 'Not auto-indexed', 'Indexed only if UNIQUE', 'Always scanned'],
    correct_index: 1,
    explanation: 'You must index FKs yourself or parent deletes scan the child table.',
    difficulty: 'medium',
    topic: 'Indexes',
  },
  {
    id: 'sq-exam-15',
    prompt: 'WHERE LOWER(email) = \'x\' ignores a plain index on email because:',
    options: ['email is not unique', 'A function is applied to the column', 'LOWER is slow', 'The index is descending'],
    correct_index: 1,
    explanation: 'Create an expression index on LOWER(email) or rewrite the predicate.',
    difficulty: 'medium',
    topic: 'Indexes',
  },
  {
    id: 'sq-exam-16',
    prompt: '2NF eliminates:',
    options: ['Repeating groups', 'Partial dependencies on part of a composite key', 'Transitive dependencies', 'NULLs'],
    correct_index: 1,
    explanation: '2NF requires full dependency on the whole composite key.',
    difficulty: 'easy',
    topic: 'Normalization',
  },
  {
    id: 'sq-exam-17',
    prompt: '3NF eliminates:',
    options: ['Partial dependencies', 'Transitive dependencies between non-key columns', 'Repeating groups', 'Multi-valued attributes'],
    correct_index: 1,
    explanation: 'Non-key columns must not determine other non-key columns.',
    difficulty: 'easy',
    topic: 'Normalization',
  },
  {
    id: 'sq-exam-18',
    prompt: 'READ COMMITTED prevents:',
    options: ['Dirty reads only', 'Dirty reads and non-repeatable reads', 'All anomalies', 'Nothing'],
    correct_index: 1,
    explanation: 'Uncommitted data is invisible; committed changes between reads can still differ.',
    difficulty: 'medium',
    topic: 'Transactions',
  },
  {
    id: 'sq-exam-19',
    prompt: 'Running total per customer uses:',
    options: ['GROUP BY only', 'SUM() OVER (PARTITION BY ... ORDER BY ...)', 'A self-join only', 'HAVING SUM'],
    correct_index: 1,
    explanation: 'Window SUM with an ordered frame keeps rows and adds a cumulative column.',
    difficulty: 'medium',
    topic: 'Window functions',
  },
  {
    id: 'sq-exam-20',
    prompt: 'Window functions are evaluated:',
    options: ['Before WHERE', 'After WHERE and GROUP BY, before ORDER BY/LIMIT', 'After ORDER BY only', 'Only in HAVING'],
    correct_index: 1,
    explanation: 'Logical order places windows after WHERE/GROUP BY/HAVING and before DISTINCT/ORDER BY/LIMIT.',
    difficulty: 'medium',
    topic: 'Window functions',
  },
  {
    id: 'sq-exam-21',
    prompt: 'ON DELETE CASCADE on order_items means:',
    options: ['Block order delete', 'Delete items when the order is deleted', 'Set FK to NULL', 'Set FK to default'],
    correct_index: 1,
    explanation: 'Deleting the parent order removes its line items automatically.',
    difficulty: 'easy',
    topic: 'Constraints',
  },
  {
    id: 'sq-exam-22',
    prompt: 'A derived table is:',
    options: ['A CTE', 'A subquery in the FROM clause', 'A materialised view', 'A temp table'],
    correct_index: 1,
    explanation: 'FROM (SELECT ...) AS t is a derived table; WITH is a CTE.',
    difficulty: 'easy',
    topic: 'Subqueries',
  },
  {
    id: 'sq-exam-23',
    prompt: 'ORDER BY in a subquery without LIMIT is:',
    options: ['Always honoured', 'Not guaranteed to affect outer query order', 'Invalid syntax', 'Required for JOINs'],
    correct_index: 1,
    explanation: 'To guarantee order, sort in the outermost query (or use a window function).',
    difficulty: 'medium',
    topic: 'Query basics',
  },
  {
    id: 'sq-exam-24',
    prompt: 'Which aggregate counts distinct non-NULL values?',
    options: ['COUNT(*)', 'COUNT(DISTINCT col)', 'COUNT(col)', 'SUM(DISTINCT col)'],
    correct_index: 1,
    explanation: 'COUNT(DISTINCT col) removes duplicates and skips NULLs.',
    difficulty: 'easy',
    topic: 'Aggregation',
  },
  {
    id: 'sq-exam-25',
    prompt: 'Durable in ACID means:',
    options: ['Concurrent-safe', 'Committed data survives crashes', 'Constraints hold', 'All-or-nothing'],
    correct_index: 1,
    explanation: 'Durability: once commit returns, the data is on stable storage.',
    difficulty: 'easy',
    topic: 'Transactions',
  },
  {
    id: 'sq-exam-26',
    prompt: 'Atomicity guarantees:',
    options: ['No dirty reads', 'All statements commit or none do', 'Serial execution', 'Fast queries'],
    correct_index: 1,
    explanation: 'All-or-nothing: partial failures roll back the whole transaction.',
    difficulty: 'easy',
    topic: 'Transactions',
  },
  {
    id: 'sq-exam-27',
    prompt: 'ROW_NUMBER() differs from RANK() in that:',
    options: ['ROW_NUMBER has no ties', 'ROW_NUMBER gaps on ties; RANK does not', 'They are identical', 'RANK requires PARTITION BY'],
    correct_index: 0,
    explanation: 'ROW_NUMBER always gives sequential unique numbers; RANK gives equal numbers on ties then skips ahead.',
    difficulty: 'medium',
    topic: 'Window functions',
  },
  {
    id: 'sq-exam-28',
    prompt: 'To find employees above the company average salary:',
    options: ['WHERE salary > AVG(salary)', 'WHERE salary > (SELECT AVG(salary) FROM employees)', 'HAVING salary > AVG(salary)', 'GROUP BY salary > AVG(salary)'],
    correct_index: 1,
    explanation: 'A scalar subquery supplies the average; aggregates cannot appear directly in WHERE.',
    difficulty: 'easy',
    topic: 'Subqueries',
  },
  {
    id: 'sq-exam-29',
    prompt: 'Composite index column order rule for WHERE a = ? AND b = ?:',
    options: ['Any order works', 'More selective equality column first', 'Alphabetical', 'b then a always'],
    correct_index: 1,
    explanation: 'Leftmost prefix: put the column that filters more rows first among equality columns.',
    difficulty: 'medium',
    topic: 'Indexes',
  },
  {
    id: 'sq-exam-30',
    prompt: 'Soft delete typically means:',
    options: ['DROP TABLE', 'A deleted_at timestamp instead of DELETE', 'TRUNCATE', 'Backup first'],
    correct_index: 1,
    explanation: 'Rows remain with deleted_at set; queries filter WHERE deleted_at IS NULL.',
    difficulty: 'easy',
    topic: 'Schema design',
  },
];

export function getSqlDatabasesCourse(): Course {
  return {
    id: 'crs-sql-databases',
    slug: 'sql-databases-mastery',
    title: 'SQL & Databases Mastery',
    subtitle: 'Query, join, aggregate, design and tune the database every placement test and production service depends on',
    description: `Every software role — backend, data analyst, full-stack, even ML engineering — screens with SQL. This course takes you from writing a first SELECT to designing normalised schemas, choosing indexes that actually get used, reasoning about transactions, and using window functions for the analytics queries that appear in real take-home tests.

Eight lessons across four modules. Every lesson follows the nine-step structure: objective, hook, concept, worked example, practice, common mistakes, the exam angle, a server-graded quiz and a one-screen summary. A 30-question bank feeds a 15-question timed final exam; passing earns a verifiable TieEdu certificate.

**Who this is for:** any student or working developer who wants SQL to be a strength rather than something to google under deadline pressure. Campus OA database rounds, analyst interviews and backend screens all draw from the same pool of patterns taught here.

**What you need:** basic programming familiarity helps but is not required. A free PostgreSQL or MySQL instance to practise on is recommended — these are not spectator topics.`,
    category: 'Databases',
    level: 'beginner',
    is_free: true,
    price_inr: 0,
    thumbnail_url: '',
    thumbnail_alt: 'SQL and Databases course cover',
    tags: ['sql', 'databases', 'postgresql', 'mysql', 'placement', 'backend', 'free'],
    outcomes: [
      'Write SELECT queries with filtering, sorting and limits using the correct evaluation order',
      'Combine tables with INNER, LEFT and anti-joins without multiplying or dropping rows',
      'Summarise data with GROUP BY, HAVING and NULL-aware aggregates',
      'Nest subqueries and rewrite them as readable CTEs',
      'Design schemas in 3NF with proper keys and constraints',
      'Choose composite indexes that match the leftmost-prefix rule and verify with EXPLAIN',
      'Explain ACID and isolation levels in plain language',
      'Compute running totals, ranks and shares with window functions',
    ],
    prerequisite_course_id: null,
    certificate_eligible: true,
    published: true,
    created_at: '2026-10-13T14:00:00.000Z',
    updated_at: '2026-10-13T14:00:00.000Z',
    instructor_id: null,
    about_course: `SQL is unusual in the curriculum: it is the one skill that appears in first-year courses, placement tests, internships and every backend job — and it is still taught badly in most colleges as a list of keywords rather than a mental model.

This course builds the mental model first. Query evaluation order explains why aliases fail in WHERE and why HAVING exists. Join cardinality explains why reports suddenly show ten times the expected rows. The leftmost-prefix rule explains why an index you added is never used. Each concept has a geometric or procedural picture, and the exam questions become applications of that picture rather than puzzles.

Normalization and transactions close the loop: you will be able to design a small schema that does not corrupt itself under concurrent writes, and defend those design choices in an interview. Window functions finish the course with the analytics pattern that modern take-home tests assume.

Every lesson ends with a quiz graded on the server, and the course finishes with a 15-question timed exam drawn from a 30-question bank. Passing earns a verifiable TieEdu certificate.`,
    prerequisites: [
      'Basic computer literacy',
      'Willingness to run practice queries on a free PostgreSQL or MySQL instance',
    ],
    audience: [
      'Students preparing for campus placements and OA database rounds',
      'Aspiring backend and full-stack developers',
      'Anyone targeting data analyst or data engineer roles',
      'Working developers who want to systematise SQL knowledge',
    ],
    audio_language: 'English',
    caption_language: 'English',
    branch: 'career',
    branch_label: 'All branches - Career skill',
    bucket: 'C',
    certificate_tier: 'professional',
    estimated_hours: 5,
    perks: [
      { key: 'certificate', label: 'Verifiable certificate' },
      { key: 'xp', label: 'XP on the leaderboard' },
    ],
    exam_prep: {
      target: 'Placement OA database rounds and backend/data analyst interviews',
      units: [
        {
          title: 'SELECT, Filtering & JOINs',
          summary:
            'Logical order: FROM -> WHERE -> GROUP BY -> HAVING -> SELECT -> ORDER BY -> LIMIT. NULL uses IS NULL. LEFT + COUNT(right.key) for zero-safe counts; LEFT + WHERE right IS NULL for anti-joins.',
          questions: [
            'Why can you not use a SELECT alias in WHERE?',
            'INNER vs LEFT: how do you decide?',
            'Write the anti-join for customers with no orders.',
          ],
          pyqs: [],
        },
        {
          title: 'Aggregation & Subqueries',
          summary:
            'COUNT(*) vs COUNT(col); aggregates ignore NULLs. WHERE filters rows, HAVING filters groups. Scalar subqueries for comparisons; NOT EXISTS over NOT IN when NULLs are possible; CTEs for readability.',
          questions: [
            'Difference between COUNT(*) and COUNT(col)?',
            'When do you use HAVING instead of WHERE?',
            'Why avoid NOT IN with a subquery that may return NULL?',
          ],
          pyqs: [],
        },
        {
          title: 'Schema, Constraints & Indexes',
          summary:
            'PRIMARY KEY = unique + NOT NULL. CHECK passes on NULL — pair with NOT NULL. NUMERIC for money. Composite index: equality columns first (most selective), range/sort last; FKs need explicit indexes in PG.',
          questions: [
            'Why is FLOAT unsafe for monetary values?',
            'State the leftmost-prefix rule for composite indexes.',
            'Are foreign key columns auto-indexed in PostgreSQL?',
          ],
          pyqs: [],
        },
        {
          title: 'Normalization, Transactions & Windows',
          summary:
            '1NF atomic; 2NF no partial dependency; 3NF no transitive non-key dependency. ACID; isolation levels trade anomalies for concurrency. Window functions run after WHERE/GROUP BY; filter window results in an outer query.',
          questions: [
            'Define 3NF and one anomaly it prevents.',
            'What does READ COMMITTED allow and forbid?',
            'How do you write a running total per customer?',
          ],
          pyqs: [],
        },
      ],
      important_questions: [
        'Write a query for top 10 customers by revenue in a date range.',
        'Explain why COUNT(*) after LEFT JOIN inflates counts.',
        'Find employees earning above their department average (two ways).',
        'Design indexes for a multi-tenant orders table filtered by tenant_id and status.',
        'Normalise a denormalised order table to 3NF.',
        'Explain the difference between RANK and ROW_NUMBER.',
        'When would you choose SERIALIZABLE over REPEATABLE READ?',
      ],
      previous_year_questions: [
        {
          year: '2024',
          question: 'TCS NQT: Write SQL to find the second highest salary from an Employee table.',
          solution: 'SELECT MAX(salary) FROM Employee WHERE salary < (SELECT MAX(salary) FROM Employee); or use DENSE_RANK() = 2.',
        },
        {
          year: '2023',
          question: 'Infosys: Difference between WHERE and HAVING with an example.',
          solution: 'WHERE filters rows before GROUP BY; HAVING filters groups after aggregation. Example: WHERE salary > 10000 HAVING COUNT(*) > 5.',
        },
        {
          year: '2025',
          question: 'Capgemini: What is a composite index and what is the column order rule?',
          solution: 'Index on multiple columns; the leftmost-prefix rule means queries must constrain the leading column(s) to use it. Equality columns first.',
        },
      ],
    },
    exam: {
      question_count: 15,
      duration_minutes: 30,
      passing_percent: 60,
      retake_cooldown_hours: 24,
      distinction_percent: 85,
      bank: examBank,
    },
    project: {
      title: 'Build and query a small schema end to end',
      brief:
        'Design a 3NF schema for a mini e-commerce system (customers, products, orders, order_items) with proper keys and constraints. Populate with at least 20 rows of realistic sample data. Then write and run: (1) a LEFT JOIN report of customers with order counts including zero-order customers, (2) a GROUP BY + HAVING revenue report, (3) a subquery or CTE finding above-average spenders, (4) a window-function running total per customer, and (5) one EXPLAIN ANALYZE on an indexed vs unindexed query with a short note on what changed. Submit the SQL script and a short write-up.',
      submission_hint: 'A single .sql file with DDL, sample INSERTs, the five queries and EXPLAIN output, plus a brief PDF or markdown explaining design and index choices.',
      required_for_certificate: true,
    },
    modules: [module1, module2, module3, module4],
  };
}
