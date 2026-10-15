// DBMS — course assembly.
// Phase 4 Bucket B branch core (CSE interview + university exam).
import type { Course, ExamQuestion } from '../db';
import { module1 } from './module1';
import { module2 } from './module2';
import { module3 } from './module3';
import { module4 } from './module4';
import { COURSE_ID } from './helpers';

const examBank: ExamQuestion[] = [
  {
    id: 'db-ex-1',
    prompt: 'In an M:N relationship between Student and Course, the relational mapping requires:',
    options: [
      'A FK in Student only',
      'A FK in Course only',
      'A new junction table with a composite primary key',
      'Merging both tables into one',
    ],
    correct_index: 2,
    explanation: 'Composite PK of both participant keys plus relationship attributes.',
    difficulty: 'easy',
    topic: 'ER model',
  },
  {
    id: 'db-ex-2',
    prompt: 'A weak entity set is mapped to a table whose primary key is:',
    options: [
      'Its own full attribute list',
      'Owner entity key + partial key',
      'Any unique attribute',
      'A surrogate with no foreign key',
    ],
    correct_index: 1,
    explanation: 'Dependent identification via owner.',
    difficulty: 'easy',
    topic: 'ER model',
  },
  {
    id: 'db-ex-3',
    prompt: 'Double-line participation in an ER diagram means:',
    options: ['Partial participation', 'Total participation', 'Multivalued attribute', 'Derived attribute'],
    correct_index: 1,
    explanation: 'Every entity must participate; FK ends up NOT NULL.',
    difficulty: 'easy',
    topic: 'ER model',
  },
  {
    id: 'db-ex-4',
    prompt: 'For a 1:N relationship, the foreign key is placed:',
    options: ['In the 1-side table', 'In the N-side table', 'In both tables', 'In a junction table'],
    correct_index: 1,
    explanation: 'Each N-side row references its 1-side parent.',
    difficulty: 'easy',
    topic: 'ER model',
  },
  {
    id: 'db-ex-5',
    prompt: 'A minimal superkey is called:',
    options: ['Foreign key', 'Candidate key', 'Composite key', 'Surrogate key'],
    correct_index: 1,
    explanation: 'No attribute can be removed and still be unique.',
    difficulty: 'easy',
    topic: 'Keys',
  },
  {
    id: 'db-ex-6',
    prompt: 'Relational algebra operator σ (sigma) corresponds to SQL:',
    options: ['SELECT columns', 'WHERE row filter', 'GROUP BY', 'ORDER BY'],
    correct_index: 1,
    explanation: 'σ filters rows; π projects columns.',
    difficulty: 'easy',
    topic: 'Relational algebra',
  },
  {
    id: 'db-ex-7',
    prompt: 'The operator used to express "for every / all" queries is:',
    options: ['Natural join', 'Division', 'Cartesian product', 'Rename'],
    correct_index: 1,
    explanation: 'R ÷ S = tuples paired with all tuples of S.',
    difficulty: 'medium',
    topic: 'Relational algebra',
  },
  {
    id: 'db-ex-8',
    prompt: 'Referential integrity requires that every foreign key value:',
    options: [
      'Is unique in its own table',
      'Matches a value of the referenced key or is NULL (if allowed)',
      'Is always NOT NULL',
      'Equals the primary key of its own table',
    ],
    correct_index: 1,
    explanation: 'Must exist in the parent (or be NULL per nullability).',
    difficulty: 'easy',
    topic: 'Keys',
  },
  {
    id: 'db-ex-9',
    prompt: 'Which clause filters aggregated results?',
    options: ['WHERE', 'HAVING', 'ON', 'DISTINCT'],
    correct_index: 1,
    explanation: 'WHERE runs before grouping; HAVING after.',
    difficulty: 'easy',
    topic: 'SQL',
  },
  {
    id: 'db-ex-10',
    prompt: 'The correct evaluation order (conceptually) among these is:',
    options: [
      'GROUP BY → WHERE → HAVING',
      'WHERE → GROUP BY → HAVING',
      'HAVING → WHERE → GROUP BY',
      'WHERE → HAVING → GROUP BY',
    ],
    correct_index: 1,
    explanation: 'Rows filtered, then bucketed, then buckets filtered.',
    difficulty: 'medium',
    topic: 'SQL',
  },
  {
    id: 'db-ex-11',
    prompt: 'COUNT(*) versus COUNT(col) when col has NULLs:',
    options: [
      'Identical results always',
      'COUNT(col) skips NULLs; COUNT(*) counts rows',
      'COUNT(*) skips NULLs',
      'COUNT(col) counts only NULLs',
    ],
    correct_index: 1,
    explanation: 'Row count vs non-NULL count.',
    difficulty: 'easy',
    topic: 'SQL',
  },
  {
    id: 'db-ex-12',
    prompt: 'A LEFT JOIN returns:',
    options: [
      'Only rows matching in both tables',
      'All rows from the left table with NULLs where the right has no match',
      'All rows from both tables',
      'The Cartesian product',
    ],
    correct_index: 1,
    explanation: 'Outer join preserving the left side.',
    difficulty: 'easy',
    topic: 'SQL',
  },
  {
    id: 'db-ex-13',
    prompt: 'Which view is generally NOT updatable?',
    options: [
      'Single table view selecting columns with WHERE',
      'View with GROUP BY and aggregates',
      'View with an AND-ed PK filter',
      'View selecting a subset of base columns',
    ],
    correct_index: 1,
    explanation: 'Aggregated rows do not map back to base rows.',
    difficulty: 'medium',
    topic: 'SQL',
  },
  {
    id: 'db-ex-14',
    prompt: 'NOT EXISTS is generally preferred over NOT IN for negation because:',
    options: [
      'It is always faster regardless of size',
      'NOT IN breaks when the subquery produces NULLs',
      'It avoids using indexes',
      'NOT IN cannot take subqueries',
    ],
    correct_index: 1,
    explanation: 'ANY/ALL/IN with NULL can yield unknown/empty results.',
    difficulty: 'medium',
    topic: 'SQL',
  },
  {
    id: 'db-ex-15',
    prompt: 'Linked leaves in a B+ tree mainly enable:',
    options: ['Smaller nodes', 'Efficient range scans', 'Automatic hashing', 'Fewer levels only'],
    correct_index: 1,
    explanation: 'Sequential walk across the key range.',
    difficulty: 'easy',
    topic: 'Indexing',
  },
  {
    id: 'db-ex-16',
    prompt: 'Which index structure is best for pure equality lookups and worst for ranges?',
    options: ['B+ tree', 'Hash index', 'Clustered index', 'Bitmap scan'],
    correct_index: 1,
    explanation: 'O(1) equality, no ordering.',
    difficulty: 'easy',
    topic: 'Indexing',
  },
  {
    id: 'db-ex-17',
    prompt: 'A clustered index means:',
    options: [
      'Rows are physically stored in the key order (one per table)',
      'Every column has its own index',
      'The index is stored in RAM only',
      'Multiple clustered indexes per table',
    ],
    correct_index: 0,
    explanation: 'Data file sorted by the clustering key.',
    difficulty: 'medium',
    topic: 'Indexing',
  },
  {
    id: 'db-ex-18',
    prompt: 'Indexing every column is undesirable because:',
    options: [
      'Reads get slower only',
      'Each index adds write overhead and storage',
      'Indexes cannot coexist',
      'It breaks referential integrity',
    ],
    correct_index: 1,
    explanation: 'INSERT/UPDATE/DELETE must maintain each index.',
    difficulty: 'easy',
    topic: 'Indexing',
  },
  {
    id: 'db-ex-19',
    prompt: 'X → Y means:',
    options: [
      'Y determines X uniquely',
      'Given X, Y is uniquely determined',
      'X and Y are always equal',
      'Y is a subset of X only',
    ],
    correct_index: 1,
    explanation: 'Left side determines the right.',
    difficulty: 'easy',
    topic: 'Normalization',
  },
  {
    id: 'db-ex-20',
    prompt: 'To verify X → Y using attribute closure you compute:',
    options: ['Y⁺ and check X ⊆ Y⁺', 'X⁺ and check Y ⊆ X⁺', 'X ∩ Y⁺', 'The candidate key of Y'],
    correct_index: 1,
    explanation: 'Closure of the determinant must cover the dependent.',
    difficulty: 'easy',
    topic: 'Normalization',
  },
  {
    id: 'db-ex-21',
    prompt: '2NF eliminates:',
    options: [
      'Non-atomic values',
      'Partial dependency on a composite key',
      'Transitive non-key dependencies',
      'Determinants that are not superkeys',
    ],
    correct_index: 1,
    explanation: '1NF handles atomicity; 3NF transitive; BCNF superkey determinants.',
    difficulty: 'easy',
    topic: 'Normalization',
  },
  {
    id: 'db-ex-22',
    prompt: 'BCNF requires that for every non-trivial FD X → Y:',
    options: ['X is prime', 'X is a superkey', 'Y is a superkey', 'X ∩ Y = ∅'],
    correct_index: 1,
    explanation: 'Strictest of the common forms.',
    difficulty: 'medium',
    topic: 'Normalization',
  },
  {
    id: 'db-ex-23',
    prompt: 'BCNF decomposition guarantees:',
    options: [
      'Dependency preservation always',
      'Lossless join but may lose dependency preservation',
      'Both lossless join and dependency preservation always',
      'Neither',
    ],
    correct_index: 1,
    explanation: 'The classic BCNF trade-off.',
    difficulty: 'hard',
    topic: 'Normalization',
  },
  {
    id: 'db-ex-24',
    prompt: 'Deleting a course also erases an instructor\'s details — a:',
    options: ['Insertion anomaly', 'Update anomaly', 'Deletion anomaly', 'Precision anomaly'],
    correct_index: 2,
    explanation: 'Unrelated entity data lost with its last row.',
    difficulty: 'easy',
    topic: 'Normalization',
  },
  {
    id: 'db-ex-25',
    prompt: 'Durability in ACID is primarily provided by:',
    options: ['Locking', 'Write-ahead logging + checkpoints', 'Normalization', 'Query optimisation'],
    correct_index: 1,
    explanation: 'Committed log records on stable storage.',
    difficulty: 'easy',
    topic: 'Transactions',
  },
  {
    id: 'db-ex-26',
    prompt: 'A schedule is conflict serializable iff:',
    options: [
      'It has no reads',
      'Its precedence graph is acyclic',
      'It runs on one core',
      'All locks are shared',
    ],
    correct_index: 1,
    explanation: 'Topological order gives the serial equivalent.',
    difficulty: 'medium',
    topic: 'Transactions',
  },
  {
    id: 'db-ex-27',
    prompt: 'Two operations conflict when they:',
    options: [
      'Belong to the same transaction',
      'Access the same item in different transactions with at least one write',
      'Are both reads of different items',
      'Occur after commit',
    ],
    correct_index: 1,
    explanation: 'Same data, different txns, ≥1 write.',
    difficulty: 'easy',
    topic: 'Transactions',
  },
  {
    id: 'db-ex-28',
    prompt: 'Under 2PL, after releasing its first lock a transaction:',
    options: [
      'May still acquire locks',
      'Cannot acquire new locks (shrinking phase)',
      'Must commit immediately',
      'Enters recovery',
    ],
    correct_index: 1,
    explanation: 'Grow then shrink — never back.',
    difficulty: 'easy',
    topic: 'Concurrency',
  },
  {
    id: 'db-ex-29',
    prompt: 'The WAL rule states that:',
    options: [
      'Log records are written after data pages',
      'Log records reach stable storage before their data pages',
      'Only redo is logged',
      'Checkpoints replace the log',
    ],
    correct_index: 1,
    explanation: 'Log-before-data enables redo/undo after crashes.',
    difficulty: 'medium',
    topic: 'Recovery',
  },
  {
    id: 'db-ex-30',
    prompt: 'wait-die / wound-wait are techniques for:',
    options: ['Serializability testing', 'Deadlock prevention using timestamps', 'Index balancing', 'View serializability'],
    correct_index: 1,
    explanation: 'Older waits / younger dies — cycles cannot form.',
    difficulty: 'medium',
    topic: 'Concurrency',
  },
];

export function getDbmsCourse(): Course {
  return {
    id: COURSE_ID,
    slug: 'dbms',
    title: 'DBMS',
    subtitle:
      'ER models, SQL, normalization, transactions, concurrency control and crash recovery — exam + interview core',
    description: `DBMS is one of the highest-weight subjects in every CSE university paper and a favourite of placement interviewers. This course covers the full core in eight compact lessons: ER diagrams and their relational mapping, keys and relational algebra including division, SQL core with joins and aggregation, subqueries/views/indexes, functional dependencies with attribute closure, normalization from 1NF through BCNF with lossless-join checks, transactions with ACID and serializability, and concurrency control with 2PL plus write-ahead-logging recovery.

Every lesson uses the nine-block structure (objectives, hook, concept, worked example, practice, common mistakes, exam angle, graded quiz, summary). A 30-question bank feeds a 15-question timed final. Passing earns a verifiable TieEdu certificate.

**Who this is for:** second- and third-year CSE/IT students preparing for university exams, GATE fundamentals, and placement interviews that ask database questions.

**What you need:** pen and paper for closures, normal forms and precedence graphs; a browser for the quizzes.`,
    category: 'Computer Science',
    level: 'intermediate',
    is_free: true,
    price_inr: 0,
    thumbnail_url: '',
    thumbnail_alt: 'DBMS course cover',
    tags: ['dbms', 'database', 'sql', 'normalization', 'transactions', 'cse', 'free', 'interview'],
    outcomes: [
      'Draw ER diagrams and map them to tables with correct FK placement',
      'Use relational algebra including select, project, join and division',
      'Write SQL with joins, aggregation, subqueries and views correctly',
      'Explain B+ tree vs hash indexes and when each is used',
      'Compute attribute closures and normalize relations to 3NF/BCNF',
      'State ACID and test conflict serializability with precedence graphs',
      'Explain 2PL, deadlock policies and write-ahead logging recovery',
    ],
    prerequisite_course_id: null,
    certificate_eligible: true,
    published: true,
    created_at: '2026-10-14T13:00:00.000Z',
    updated_at: '2026-10-14T13:00:00.000Z',
    instructor_id: null,
    about_course: `University DBMS papers reward a repeatable method: identify the FDs, compute closures, detect the violated normal form, split, verify. This course drills exactly that method, then does the same for the two big theory units — serializability graphs and recovery logs — so exam answers follow a fixed, checkable sequence instead of hope.

The SQL lessons are written for people who will use SQL daily: clause evaluation order, the WHERE vs HAVING distinction, NULL behaviour in NOT IN, and indexes explained as "why did my query get fast". The concurrency and recovery lessons close with the industry-standard answers (Strict 2PL, WAL, checkpoints) that interviewers expect to hear.

The final exam draws from a 30-question bank; the certificate project is a small schema design you can show as proof of skill.`,
    prerequisites: [
      'Basic set theory and logical reasoning',
      'Any programming language (SQL syntax is taught from scratch)',
    ],
    audience: [
      'CSE/IT students in semester 3–5 facing university DBMS exams',
      'Placement candidates preparing for SQL and database rounds',
      'GATE aspirants building normalization and transaction fundamentals',
      'Backend/developer beginners who want relational design to click',
    ],
    audio_language: 'English',
    caption_language: 'English',
    branch: 'cse',
    branch_label: 'CSE / IT core (also useful for AI-DS)',
    bucket: 'B',
    certificate_tier: 'professional',
    estimated_hours: 8,
    perks: [
      { key: 'certificate', label: 'Verifiable certificate' },
      { key: 'xp', label: 'XP on the leaderboard' },
    ],
    exam_prep: {
      target: 'University mid-terms and finals; GATE CS core; placement database rounds',
      units: [
        {
          title: 'ER Model & Relational Basics',
          summary:
            'Entities, attributes, relationships, cardinality and participation; mapping rules (1:N FK on N, M:N junction, weak = owner+partial key). Keys: superkey ⊇ candidate (minimal) → primary; FK = referential integrity. Relational algebra: σ rows, π columns, ⋈ joins, ÷ = "every/all".',
          questions: [
            'Map an ER diagram with 1:1, 1:N and M:N relationships.',
            'Define weak entity with mapping.',
            'Difference superkey vs candidate key.',
            'Division example: customers who bought every product.',
          ],
          pyqs: [],
        },
        {
          title: 'SQL & Indexes',
          summary:
            'DDL vs DML; evaluation order FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY. Joins: inner vs outer; COUNT(*) vs COUNT(col) NULL behaviour. Subqueries: correlated + NOT EXISTS over NOT IN. Views: saved queries, aggregated views not updatable. Indexes: B+ tree linked leaves for ranges, hash for equality, clustered = one per table, write cost trade-off.',
          questions: [
            'WHERE vs HAVING with an example.',
            'LEFT JOIN semantics and NULL padding.',
            'Why NOT EXISTS over NOT IN?',
            'B+ tree properties and when to index.',
          ],
          pyqs: [],
        },
        {
          title: 'Normalization',
          summary:
            'FD X → Y = Y determined by X; test via X⁺ ⊇ Y. Armstrong: reflexivity, augmentation, transitivity. Anomalies: insert/update/delete. Forms: 1NF atomic; 2NF no partial on composite key; 3NF no non-key→non-key; BCNF every determinant a superkey. Decomposition: lossless join (shared key) + dependency preservation; BCNF may lose preservation.',
          questions: [
            'Compute a candidate key from closures.',
            'Normalize a flat table to 3NF step by step.',
            '3NF vs BCNF with the trade-off.',
            'Name the three anomalies.',
          ],
          pyqs: [],
        },
        {
          title: 'Transactions, Concurrency & Recovery',
          summary:
            'ACID with mechanisms. Conflict serializability ⇔ acyclic precedence graph (same item, different txns, ≥1 write = conflict). 2PL grow-then-shrink; Strict 2PL holds X locks to commit; deadlock: wait-for detection, wait-die/wound-wait prevention, timeouts. WAL: log before page; recovery redoes committed, undoes losers from the last checkpoint; commit in log = durable.',
          questions: [
            'ACID definitions with mechanism each.',
            'Precedence graph test with a small schedule.',
            'Strict 2PL vs basic 2PL.',
            'Walk through crash recovery with a checkpoint.',
          ],
          pyqs: [],
        },
      ],
      important_questions: [
        'ER to relational mapping rules for all cardinalities.',
        'Attribute closure algorithm and candidate key derivation.',
        'Full normalization: detect form, split, verify lossless join.',
        'WHERE vs HAVING and clause evaluation order.',
        'B+ tree structure properties vs hash indexes.',
        'ACID mapped to DBMS components.',
        'Conflict serializability with precedence graph worked example.',
        '2PL theorem statement + WAL rule with recovery phases.',
      ],
      previous_year_questions: [
        {
          year: '2024',
          question:
            'Given R(A,B,C,D) with FDs AB → C, C → D: find all candidate keys and state the highest normal form of R (justify).',
          solution:
            'Key = (A,B): (AB)⁺ = {A,B,C,D}. D is prime? No — C → D with C non-key... check prime status: candidate AB only; C→D is non-key→non-key → not 3NF if C not prime; C is not in key AB → violates 3NF (and BCNF since C is not a superkey). Highest form: 2NF (partial? AB is composite, nothing depends on part alone given FDs) — so 2NF, not 3NF.',
        },
        {
          year: '2023',
          question:
            'Explain two-phase locking. Is every 2PL schedule recoverable? What does Strict 2PL add?',
          solution:
            '2PL: locks acquired only in growing phase, released only in shrinking → conflict serializable. Basic 2PL alone can allow dirty reads/cascading aborts (not necessarily recoverable); Strict 2PL holds X locks until commit/abort → recoverable and cascadeless.',
        },
        {
          year: '2025',
          question:
            'Describe the write-ahead logging protocol and the actions taken during recovery after a system crash.',
          solution:
            'Before a modified page is written to disk, the corresponding log records must be on stable storage. After crash, start from last checkpoint: redo all transactions with commit records (repeat history), undo uncommitted transactions using undo information in reverse order, writing compensation records.',
        },
      ],
    },
    project: {
      title: 'Mini database design note',
      brief:
        'Design a small application database (4–6 pages or equivalent markdown): (1) ER diagram for a library or e-commerce domain with cardinalities; (2) mapped relations with PK/FK and referential integrity noted; (3) functional dependencies listed and each relation normalized to 3NF or BCNF with closure-based justification; (4) five example SQL queries covering join, aggregate with HAVING, subquery and an index recommendation with reasoning. Submit as PDF or a public markdown URL.',
      submission_hint:
        'PDF or public markdown link showing the ER diagram, mapping rules applied, FD closures worked on paper, and runnable SQL — not screenshots of a GUI designer.',
      required_for_certificate: true,
    },
    exam: {
      question_count: 15,
      duration_minutes: 30,
      passing_percent: 60,
      retake_cooldown_hours: 24,
      distinction_percent: 85,
      bank: examBank,
    },
    modules: [module1, module2, module3, module4],
  };
}
