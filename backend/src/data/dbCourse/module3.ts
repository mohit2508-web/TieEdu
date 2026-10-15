// Module 3 — Functional Dependencies & Normalization
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M3, COURSE_ID } from './helpers';

export const module3: CourseModule = {
  id: M3,
  course_id: COURSE_ID,
  title: 'Module 3 — Functional Dependencies & Normalization',
  summary:
    'Functional dependencies and closure, Armstrong axioms, update anomalies, and 1NF → 2NF → 3NF → BCNF with decomposition steps.',
  sort_order: 3,
  lessons: [
    lesson(
      M3,
      'db-3-1',
      1,
      'Functional Dependencies & Anomalies',
      'What an FD states, computing attribute closure, candidate keys via closure, and the insert/update/delete anomalies FDs expose.',
      13,
      nineBlocks({
        objectives: [
          'Interpret X → Y and compute the attribute closure X⁺',
          'Derive candidate keys from closures of available attributes',
          'Name the three update anomalies and connect them to bad design',
        ],
        hook:
          '"Student takes Course; Course has Instructor; Instructor lives in Building" — a single flat table seems fine until you delete the last course an instructor teaches and lose their office too. That is a deletion anomaly, and normalization is the fix.',
        concept: `**Functional dependency X → Y:** given a value of X, the value of Y is uniquely determined. Read: "X functionally determines Y".

Examples: roll → name (each roll has one name); roll, cid → grade (one grade per student per course).

**Armstrong's axioms (basis for closure rules):**
1. **Reflexivity:** Y ⊆ X ⇒ X → Y
2. **Augmentation:** X → Y ⇒ XZ → YZ
3. **Transitivity:** X → Y, Y → Z ⇒ X → Z
Derived: union (X→Y, X→Z ⇒ X→YZ), decomposition (X→YZ ⇒ X→Y, X→Z), pseudo-transitivity.

**Attribute closure X⁺:** start with X, repeatedly apply FDs until no growth. Uses:
- Test if X → Y holds: Y ⊆ X⁺?
- Find candidate keys: for relation R, take Z = all attributes; a superkey S has S⁺ = all attributes. Candidate keys are minimal such sets — often closure of (all attributes minus any single determinant) = candidate key when the remainder has empty closure.

**Anomalies of a denormalised (bad) table:**
- **Insertion anomaly:** cannot record an instructor with no course until a course exists (attributes jammed together).
- **Update anomaly:** change instructor's building in one row but not another → inconsistency.
- **Deletion anomaly:** delete the last course of an instructor → also lose instructor's details.

Fix = decompose into relations each describing ONE fact — which is exactly normalization.`,
        extras: [
          table('Axiom', ['Statement'], [
            ['Reflexivity', 'Y ⊆ X ⇒ X → Y'],
            ['Augmentation', 'X → Y ⇒ XZ → YZ'],
            ['Transitivity', 'X → Y, Y → Z ⇒ X → Z'],
          ]),
          tip(
            'Closure practice',
            'Closure is the single highest-value algorithm in the normalization unit — drill it on paper.',
          ),
          warn(
            'Partial vs transitive dependency (the 2NF/3NF trigger words)',
            'Partial = part of a composite key determines non-key; transitive = non-key determines another non-key.',
          ),
        ],
        worked: {
          title: 'Candidate key via closure',
          problem: 'R(A, B, C, D) with FDs: A → B, B → C, C → D. Find candidate keys.',
          steps: [
            { title: 'Only determinant', desc: 'A is the only left-hand side that determines others.' },
            { title: 'Closure of A', desc: 'A⁺ = {A} → +B → +C → +D = {A,B,C,D} — covers all attributes.' },
            { title: 'Minimality', desc: 'No proper subset of {A} exists — so A is minimal.' },
            { title: 'Result', desc: 'Candidate key = {A}; B⁺ = {B,C,D} ≠ all, C⁺, D⁺ similar — not keys.' },
            { title: 'Non-key columns', desc: 'B, C, D are prime? No — only A is prime; everything else is non-key attribute.' },
          ],
          solution: 'Candidate key = A; closure confirms it determines every attribute.',
        },
        practice: {
          title: 'Anomaly hunt',
          prompt: 'Table EmpProj(eid, ename, pid, pname, hours). Give one deletion anomaly scenario.',
          hint: 'What disappears when the last row containing some entity is removed?',
        },
        mistakes: [
          {
            mistake: 'Saying X → Y means X and Y are the same',
            fix: 'It means Y is uniquely determined by X — Y may be functionally trivial but the FD still holds.',
          },
          {
            mistake: 'Computing closure only once and guessing',
            fix: 'Iterate until no attribute is added — two rounds are often needed.',
          },
        ],
        exam: {
          question: 'Define functional dependency and state Armstrong axioms.',
          answer: 'X → Y: identical X values imply identical Y values. Axioms: reflexivity, augmentation, transitivity.',
          source: 'Standard 6-mark opener.',
        },
        summary: [
          'X → Y = Y determined by X; test with attribute closure X⁺.',
          'Closure gives superkeys/candidate keys and implication tests.',
          'Insert/update/delete anomalies motivate decomposition.',
        ],
      }),
      [
        [
          'Armstrong axiom "transitivity" states:',
          ['X → Y and Y → X', 'X → Y and Y → Z implies X → Z', 'X → Y implies XY → Y', 'X → Y implies Y → X'],
          1,
          'Chain of dependency.',
        ],
        [
          'To check whether X → Y holds you compute:',
          ['Y⁺', 'X⁺ and test Y ⊆ X⁺', 'X ∩ Y', 'The candidate key of Y'],
          1,
          'Closure of the left side.',
        ],
        [
          'Deleting a course also erases an instructor\'s record — this is:',
          ['Insertion anomaly', 'Update anomaly', 'Deletion anomaly', 'Type anomaly'],
          2,
          'Loss of unrelated entity data.',
        ],
      ]
    ),
    lesson(
      M3,
      'db-3-2',
      2,
      'Normal Forms 1NF to BCNF',
      'Step-by-step normalization: 1NF atomic values, 2NF no partial dependency, 3NF no transitive dependency, BCNF strict determinants — with decomposition checks.',
      13,
      nineBlocks({
        objectives: [
          'Test a relation against 1NF, 2NF, 3NF and BCNF in order',
          'Decompose a violated relation and verify lossless join (and dependency preservation)',
          'Explain why BCNF can force a trade-off with dependency preservation',
        ],
        hook:
          'Normalization questions are algorithm questions with marks attached: detect the violation, name the normal form, split, verify. Learn the checklist and the same four steps answer almost any question.',
        concept: `**1NF — atomic values:** no repeating groups/multi-valued cells/arrays. Fix: split multi-values into rows or a separate table. (Also keys must exist.)

**2NF — 1NF + no partial dependency:** for composite candidate keys, no non-key attribute may depend on only PART of the key. Fix: move partial dependents into their own table keyed by the key part.

**3NF — 2NF + no transitive dependency:** no non-key → non-key dependency (equivalently: every non-key attribute depends on the key, the whole key, and nothing but the key). Fix: move X → Y (both non-key) into a table keyed by X.

**BCNF — strict:** for every non-trivial FD X → Y, X must be a superkey. Stricter than 3NF: any determinant must be a key. Situations 3NF keeps but BCNF splits (overlapping candidate keys).

**Decomposition checks:**
- **Lossless join:** decomposing then re-joining gives no extra (spurious) tuples — guaranteed if every split shares a common attribute that is a key of one side (common-attribute rule).
- **Dependency preservation:** every original FD can be checked using just one of the resulting tables (possibly with unions). BCNF guarantees lossless join but may NOT preserve dependencies — that is the classic BCNF trade-off exam.

**Practical order:** 1NF → 2NF (partial) → 3NF (transitive) → BCNF (superkey determinants). Most production schemas aim for 3NF/BCNF.`,
        extras: [
          table('Form', ['Violation to eliminate'], [
            ['1NF', 'Multi-valued / non-atomic cells, missing key'],
            ['2NF', 'Non-key depends on part of a composite key'],
            ['3NF', 'Non-key → non-key transitive dependency'],
            ['BCNF', 'Determinant that is not a superkey'],
          ]),
          tip(
            'The slogan',
            'Every non-key attribute depends on: the key, the whole key, and nothing but the key (so help me Codd).',
          ),
          warn(
            'BCNF vs dependency preservation',
            'BCNF always allows lossless reconstruction; it can break easy dependency checking — 3NF is sometimes preferred in practice.',
          ),
        ],
        worked: {
          title: 'Normalize a student-course-instructor table',
          problem: 'R(roll, cid, sem, grade, instructor, building) with FDs: (roll, cid) → grade; cid → instructor; instructor → building. Key = (roll, cid).',
          steps: [
            { title: '1NF', desc: 'All cells atomic — pass.' },
            { title: '2NF check', desc: 'grade depends on the whole (roll, cid) key — fine. But cid → instructor means part of key determines non-key → VIOLATES 2NF.' },
            { title: 'First split', desc: 'Course(cid PK, instructor, building) and Enrolls(roll, cid PK/FK, grade). Lossless: shares cid, a key of Course.' },
            { title: '3NF check on Course', desc: 'instructor → building with both non-key → transitive dependency → violates 3NF.' },
            { title: 'Final split', desc: 'Course(cid, instructor) and Instructor(instructor PK, building). All relations now in BCNF (each determinant is a key).' },
          ],
          solution: 'Three tables: Enrolls, Course, Instructor — 3NF/BCNF, lossless at each split.',
        },
        practice: {
          title: 'BCNF case',
          prompt: 'R(A, B, C) with AB → C and C → B. Is it 3NF? BCNF? What splits?',
          hint: 'Is C a superkey? Is B a superkey?',
        },
        mistakes: [
          {
            mistake: 'Applying 2NF before confirming a composite key',
            fix: 'Single-attribute keys cannot violate partial dependency — 2NF is automatic there.',
          },
          {
            mistake: 'Splitting without a shared key',
            fix: 'Arbitrary splits can be lossy — always keep a common attribute that is a key of one part.',
          },
        ],
        exam: {
          question: 'Differentiate 3NF and BCNF with an example statement.',
          answer: '3NF allows a non-superkey determinant only when the dependent attribute is prime; BCNF requires EVERY determinant to be a superkey — stricter.',
          source: 'Frequent comparison question.',
        },
        summary: [
          '1NF atomic; 2NF no partial; 3NF no transitive; BCNF determinants are keys.',
          'Decompose on violated FD; check lossless join + dependency preservation.',
          'BCNF = lossless but may lose dependency preservation.',
        ],
      }),
      [
        [
          '2NF eliminates:',
          ['Multi-valued attributes', 'Partial dependency on a composite key', 'Transitive non-key dependency', 'Non-superkey determinants'],
          1,
          'Non-key depends on part of key.',
        ],
        [
          'BCNF requires that for every non-trivial FD X → Y:',
          ['X is part of a key', 'X is a superkey', 'Y is a superkey', 'X and Y are disjoint'],
          1,
          'Determinant must be a key.',
        ],
        [
          'A decomposition is lossless when:',
          ['Every table has a PK', 'Natural join of parts returns exactly the original tuples', 'All FDs are preserved', 'Tables are in 1NF'],
          1,
          'No spurious tuples on re-join.',
        ],
      ]
    ),
  ],
};
