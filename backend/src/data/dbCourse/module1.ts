// Module 1 — ER Model & Relational Model
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M1, COURSE_ID } from './helpers';

export const module1: CourseModule = {
  id: M1,
  course_id: COURSE_ID,
  title: 'Module 1 — ER Model & Relational Model',
  summary:
    'Entities, attributes, relationships and cardinalities; ER to relational mapping; keys; and the relational algebra every exam starts with.',
  sort_order: 1,
  lessons: [
    lesson(
      M1,
      'db-1-1',
      1,
      'ER Diagrams to Tables',
      'Drawing and reading ER diagrams: entities, relationship sets, cardinality and participation, generalisation, and how an ER model becomes tables.',
      12,
      nineBlocks({
        objectives: [
          'Identify entities, attributes, relationship sets and keys in an ER diagram',
          'Distinguish cardinality ratios (1:1, 1:N, M:N) and total vs partial participation',
          'Map an ER diagram to relational tables including FK placement rules',
        ],
        hook:
          'Every DBMS exam paper opens with "Draw the ER diagram for X" — and every software design interview closes with "how would you model this?" The skill is identical: decide what is a thing, what is a fact about a thing, and where the relationship lives.',
        concept: `**ER building blocks:**
- **Entity set:** a noun (Student, Course). Weak entity set: no key of its own, identified via an owner entity (Dependent of Employee) — double rectangle, partial key with dashed underline.
- **Attributes:** simple/derived (age from DOB)/multivalued (ovals double)/composite. Key attribute underlined.
- **Relationship set:** a verb (Enrolls, Works_For). Degree = number of participating entity sets.

**Cardinality:**
- 1:1 — one A relates to at most one B (Head manages Department)
- 1:N — one A relates to many B (Department has Employees)
- M:N — many A relate to many B (Student Enrolls Course)

**Participation:** total (every A must participate — double line) vs partial (optional — single line).

**Keys in relationships:** for 1:1 the relationship can borrow a key from either side; for 1:N the key of the N-side entity moves into the 1-side table as FK; for M:N a new junction table with PK = (keyA, keyB).

**ER → relational mapping rules:**
1. Each strong entity set → one table; attributes become columns; key = primary key.
2. 1:1 relationship → merge tables or add FK + UNIQUE on the participating side.
3. 1:N → add FK on the N-side.
4. M:N → new relation with composite PK of both participant keys (plus relationship attributes).
5. Multivalued attribute → separate table.
6. Weak entity → table with owner FK; PK = (owner PK, partial key).
7. Generalisation (ISA) → single table with type discriminator, or one table per subclass (design trade-off).

**Relational model vocabulary:** relation = table, tuple = row, attribute = column, domain = allowed values, degree = columns, cardinality = rows.`,
        extras: [
          table('Cardinality', ['Where the FK goes'], [
            ['1:1', 'Either side (UNIQUE constraint) or merged table'],
            ['1:N', 'N-side table gets FK to 1-side'],
            ['M:N', 'New junction table, composite PK'],
          ]),
          tip(
            "Total participation in SQL terms",
            'Total participation = NOT NULL FK; partial = FK may be NULL.',
          ),
          warn(
            'ER mistakes that cost marks',
            'Forgetting derived/multivalued attributes, and placing the FK on the wrong side of a 1:N.',
          ),
        ],
        worked: {
          title: 'Map a university ER model to tables',
          problem: 'Student (roll, name) and Course (cid, title) with M:N Enrolls (sem); Department (dname) 1:N offers Course; Employee 1:1 manages Department.',
          steps: [
            { title: 'Strong entities', desc: 'Student(roll PK, name), Course(cid PK, title), Department(dname PK), Employee(eid PK, name).' },
            { title: 'M:N Enrolls', desc: 'Junction Enrolls(roll, cid, sem) PK = (roll, cid), FKs to Student and Course.' },
            { title: '1:N offers', desc: 'Add FK dname to Course (a course belongs to one department); Course stays its own table.' },
            { title: '1:1 manages', desc: 'Add FK eid to Department with UNIQUE — one employee manages at most one department.' },
            { title: 'Check', desc: 'Every relationship covered; no attribute left homeless; FKs point to the 1-side.' },
          ],
          solution: 'Five base tables + one junction table; FKs placed by cardinality rules.',
        },
        practice: {
          title: 'Weak entity',
          prompt: 'Dependent (dname) of Employee with partial key dname. Write the table and its PK.',
          hint: 'Owner key + partial key together.',
        },
        mistakes: [
          {
            mistake: 'Putting a FK in both tables for a 1:N relationship',
            fix: 'Only the N-side needs the FK; the other direction is implied.',
          },
          {
            mistake: 'Using name as the primary key of Student',
            fix: 'Names are not unique — prefer roll/enrollment id; examiners penalise non-unique PKs.',
          },
        ],
        exam: {
          question: 'What is a weak entity set? How is it represented in the relational model?',
          answer: 'An entity set without a key of its own, identified via its owner entity; mapped with owner FK + partial key forming the composite PK.',
          source: 'Frequent 4-mark question.',
        },
        summary: [
          'ER = entities, attributes, relationships with cardinality and participation.',
          'Mapping: 1:N → FK on N; M:N → junction table; weak → owner FK + partial key.',
          'Relational vocabulary: relation/tuple/attribute, keys, domain.',
        ],
      }),
      [
        [
          'A junction table is required for which relationship type?',
          ['1:1', '1:N', 'M:N', 'Unary 1:1'],
          2,
          'Composite PK of both participant keys.',
        ],
        [
          'Total participation means:',
          ['The entity must participate in at least one relationship instance', 'The entity may be absent', 'The relationship is mandatory on all attributes', 'The key is composite'],
          0,
          'Double line in ER notation.',
        ],
        [
          'A dependent of an employee, identified only with its employee, is a:',
          ['Strong entity', 'Weak entity', 'Multivalued attribute', 'Derived attribute'],
          1,
          'Partial key + owner FK.',
        ],
      ]
    ),
    lesson(
      M1,
      'db-1-2',
      2,
      'Keys & Relational Algebra',
      'Superkey, candidate key, primary key, foreign key; then select, project, join, set ops and division — the operators exams drill.',
      12,
      nineBlocks({
        objectives: [
          'Classify superkey vs candidate key vs primary key vs composite key',
          'Apply select/project/rename and Cartesian product correctly',
          'Perform natural join and division on small relations by hand',
        ],
        hook:
          'Relational algebra looks useless until you realise every SQL query the optimiser runs is algebra. Then division — "find customers who bought every product" — becomes a party trick instead of a panic.',
        concept: `**Keys:**
- **Superkey:** any attribute set that uniquely identifies tuples (possibly oversized: (roll, name)).
- **Candidate key:** minimal superkey — no attribute can be removed and still be unique. A relation can have several; one becomes **primary key**; the rest are alternates.
- **Composite key:** key made of multiple attributes (junction tables).
- **Foreign key:** column(s) in table A referencing the candidate key of table B — integrity constraint, values must exist (or be NULL if allowed).

**Relational algebra operators:**
- **σ (select):** filter rows by predicate — like WHERE. σ_{grade>6}(Enrolls)
- **π (project):** pick columns — like SELECT list. π_{name}(Student)
- **ρ (rename):** rename relations/attributes for self-joins.
- **× (Cartesian product):** all pairs — expensive; joins are its filtered versions.
- **⋈ natural join:** product + equality on all common attributes, common columns appear once.
- **θ-join:** join with an arbitrary condition (e.g. ⋈_{A.x > B.y}).
- **∪, ∩, −:** set ops — need union-compatible relations (same attributes, compatible domains).
- **÷ (division):** R ÷ S = tuples of R whose A-parts are paired with **all** B-parts in S. The "for all / every" operator.

**Equivalences optimisers use:** σ commutes with × (push selections down), π prunes columns early — this is why query order in SQL (FROM→WHERE→SELECT) is free to reorder.`,
        extras: [
          table('Operator', ['SQL equivalent'], [
            ['σ (select)', 'WHERE'],
            ['π (project)', 'SELECT list'],
            ['⋈ natural join', 'FROM a JOIN b (on shared columns)'],
            ['÷ division', 'NOT EXISTS / correlated NOT IN pattern'],
            ['∪ ∩ −', 'UNION / INTERSECT / EXCEPT'],
          ]),
          tip(
            'Division phrasing trick',
            'For every X, there exists Y: "customers who bought EVERY product" = customers with no product they did NOT buy (double negation in SQL).',
          ),
          warn(
            '⋈ is not always commutative-safe in answers',
            'Natural join hides equality on common names — accidental name clashes merge columns you did not mean.',
          ),
        ],
        worked: {
          title: 'Division by hand',
          problem: 'Buys(cust, prod). Find customers who bought EVERY product.',
          steps: [
            { title: 'Form sets', desc: 'S = all products (π_prod(Buys) if the universe is only listed products; otherwise use a Product relation).' },
            { title: 'Definition', desc: 'Result = { c | for every p in S, (c,p) ∈ Buys }.' },
            { title: 'Counter-check', desc: 'Find pairs missing from Buys: custs with any gap are excluded.' },
            { title: 'SQL form', desc: 'SELECT cust FROM Buys b WHERE NOT EXISTS (SELECT 1 FROM Product p WHERE NOT EXISTS (SELECT 1 FROM Buys b2 WHERE b2.cust=b.cust AND b2.prod=p.prod)).' },
            { title: 'Verify', desc: 'Test with a cust who bought everything (in) and one who missed an item (out).' },
          ],
          solution: 'Division outputs exactly the tuples paired with all tuples of the divisor.',
        },
        practice: {
          title: 'σ and π order',
          prompt: 'On Enrolls(roll, cid, sem): σ_sem=6(π_roll, cid(Enrolls)) vs π_roll(σ_sem=6(Enrolls)) — describe both results.',
          hint: 'One keeps columns; the other deduplicates rolls.',
        },
        mistakes: [
          {
            mistake: 'Calling any unique column the candidate key when a smaller one exists',
            fix: 'Candidate key = MINIMAL superkey; (roll, name) is a superkey but not minimal.',
          },
          {
            mistake: 'Expecting natural join to keep duplicate column names',
            fix: 'It merges equal columns into one; use θ-join if you need both sides retained.',
          },
        ],
        exam: {
          question: 'Define foreign key and state the referential integrity rule.',
          answer: 'FK is an attribute set in one relation referencing the candidate key of another; every FK value must exist in the referenced key set or be NULL (per nullability).',
          source: 'Standard short question.',
        },
        summary: [
          'Superkey ⊇ candidate key (minimal) → primary key; FK = cross-table reference.',
          'σ filters rows, π picks columns, ⋈ joins, ÷ handles "every/all".',
          'Algebra rewrites underpin SQL optimisation.',
        ],
      }),
      [
        [
          'A minimal superkey is called:',
          ['Primary key only', 'Candidate key', 'Foreign key', 'Composite key'],
          1,
          'One candidate key is chosen as primary.',
        ],
        [
          'The operator for "pairs of tuples from R and S satisfying a condition" without requiring common column names is:',
          ['θ-join (or conditional product)', 'Division', 'Set difference', 'Projection'],
          0,
          'Natural join requires shared attribute names.',
        ],
        [
          '"Find suppliers who supply EVERY part" is the classic use of:',
          ['Selection', 'Natural join', 'Division', 'Rename'],
          2,
          'Division = the "all" operator.',
        ],
      ]
    ),
  ],
};
