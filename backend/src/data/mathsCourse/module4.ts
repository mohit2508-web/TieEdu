// Module 4 — Matrices & Linear Systems
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, info } from '../nineBlocks';
import { lesson, M4, COURSE_ID } from './helpers';

export const module4: CourseModule = {
  id: M4,
  course_id: COURSE_ID,
  title: 'Module 4 — Matrices & Systems of Linear Equations',
  summary: 'Rank, elimination, determinants, inverses and eigenvalues — the linear algebra every branch reuses.',
  sort_order: 4,
  lessons: [
    lesson(
      M4,
      'em-4-1',
      1,
      'Matrix rank, determinants and inverses',
      'Compute rank by row reduction; find determinants and inverses without blind formula-chasing.',
      16,
      nineBlocks({
        objectives: [
          'Reduce a matrix to row-echelon form and read off its rank',
          'Compute 2x2 and 3x3 determinants by cofactor expansion and row operations',
          'Decide invertibility from the determinant and from the rank',
          'Find the inverse of a 2x2 or 3x3 matrix using Gauss-Jordan elimination',
        ],
        hook: `A structural engineer writes 12 equilibrium equations for a truss with 12 unknown member forces. Whether the structure is stable, under-constrained or over-constrained is exactly the question "does this matrix have full rank?". The same rank test appears in circuit analysis, computer graphics and machine learning — one idea, every branch.`,
        concept: `A **matrix** is a rectangular array of numbers. The **rank** is the number of linearly independent rows (equivalently columns), computed as the number of non-zero rows in the row-echelon form.

**Row operations** (all rank-preserving):
1. Swap two rows.
2. Multiply a row by a non-zero scalar.
3. Add a multiple of one row to another.

**Determinant** is a scalar attached to a square matrix. Key properties:
- det(AB) = det(A) det(B).
- det(A^T) = det(A).
- Row swap flips the sign; scaling a row scales the determinant.
- Upper triangular: determinant = product of diagonal entries.

**2x2 determinant:** det [[a,b],[c,d]] = ad - bc.

**3x3 cofactor expansion** along any row or column: det = sum of entry times its cofactor. Expanding along a row of zeros is the free speed-up.

**Invertibility:** A square matrix A is invertible iff det(A) != 0, iff rank = n, iff Ax = b has a unique solution for every b.`,
        extras: [
          tip(
            'Row-reduce before expanding',
            'A 3x3 determinant with two zeros in a row is a one-line cofactor expansion. Create zeros with row operations (keeping track of sign changes) before expanding.',
          ),
          table('Rank and solvability of Ax = b (n unknowns)', ['Condition', 'Meaning'], [
            ['rank(A) = rank([A|b]) = n', 'Unique solution'],
            ['rank(A) = rank([A|b]) < n', 'Infinitely many solutions'],
            ['rank(A) < rank([A|b])', 'No solution (inconsistent)'],
          ]),
        ],
        worked: {
          title: 'Rank by elimination, then invertibility',
          problem: `Find the rank of A = [[1, 2, 3], [2, 5, 7], [3, 7, 11]] and decide whether A is invertible.`,
          steps: [
            {
              title: 'Eliminate below the first pivot',
              desc: 'R2 -> R2 - 2*R1 gives [0, 1, 1]. R3 -> R3 - 3*R1 gives [0, 1, 2].',
              code_snippet: 'R2 -= 2 R1: [0, 1, 1]\nR3 -= 3 R1: [0, 1, 2]',
            },
            {
              title: 'Eliminate below the second pivot',
              desc: 'R3 -> R3 - R2 gives [0, 0, 1]. Matrix is now upper triangular with three non-zero rows.',
              code_snippet: 'R3 -= R2: [0, 0, 1]',
            },
            {
              title: 'Read the rank and determinant',
              desc: 'Three non-zero rows: rank = 3 = n. Diagonal of echelon form is 1, 1, 1 so det(A) = 1 (operations R2-2R1 and R3-3R1 do not change det; R3-R2 also does not).',
              code_snippet: 'rank(A) = 3;  det(A) = 1',
            },
          ],
          solution:
            'rank = 3, det(A) = 1 (non-zero), so A is invertible and Ax = b has a unique solution for every b. Always row-reduce first; the echelon form answers rank and often det in one pass.',
        },
        practice: {
          title: 'Compute these',
          prompt: `1. det [[2, 1], [3, 4]].
2. Rank of [[1, 1], [2, 2], [3, 3]].
3. Is [[1, 2], [2, 4]] invertible? Why not?
4. Inverse of [[2, 1], [5, 3]] using the 2x2 formula.`,
          hint: '1: 8 - 3 = 5. 2: rank 1 (all rows multiples of [1,1]). 3: det = 4 - 4 = 0: singular, no inverse. 4: (1/(6-5)) [[3, -1], [-5, 2]] = [[3, -1], [-5, 2]].',
        },
        mistakes: [
          {
            mistake: 'Applying row swaps without flipping the determinant sign',
            fix: 'Each row interchange multiplies the determinant by -1. Track every swap in a side column while you reduce.',
          },
          {
            mistake: 'Forgetting to divide by the determinant in the 2x2 inverse formula',
            fix: 'A inverse = (1/det) [[d, -b], [-c, a]]. Omitting 1/det is the most common single-line error on 2x2 inverses.',
          },
          {
            mistake: 'Confusing rank of A with rank of the augmented matrix',
            fix: 'Solvability needs rank(A) compared to rank([A|b]). Only looking at A misses inconsistent systems.',
          },
        ],
        exam: {
          question: 'Find values of k for which the system x + y + z = 6, x + 2y + 3z = 10, x + 2y + kz = mu has (i) unique (ii) no solution.',
          answer:
            'Coefficient det = (2k - 6) after expansion. Unique solution iff k != 3. When k = 3, the augmented rank check decides: if mu != 14 the system is inconsistent (no solution); if mu = 14, infinitely many.',
          source: 'Standard AKTU 7-mark question',
        },
        summary: [
          'Rank = non-zero rows in echelon form; row operations preserve rank.',
          'det(AB)=det(A)det(B); det(A^T)=det(A); triangular det = product of diagonal.',
          'Invertible iff det != 0 iff rank = n iff unique solution for every b.',
          'Ax=b: compare rank(A) with rank([A|b]) to classify solution sets.',
        ],
      }),
      [
        [
          'A 3x3 matrix with rank 2 has determinant:',
          ['Non-zero', 'Zero', 'Always 1', 'Undefined'],
          1,
          'Rank < n implies the rows are linearly dependent, so det = 0.',
        ],
        [
          'If det(A) = 0, then A:',
          ['Has a unique inverse', 'Is invertible', 'Is singular (no inverse)', 'Has det(A inverse) = 0 too'],
          2,
          'Zero determinant means singular: no inverse exists.',
        ],
        [
          'Rank of [[1,1],[2,2],[3,3]] is:',
          ['3', '2', '1', '0'],
          2,
          'Every row is a multiple of [1,1], so only one independent row.',
        ],
      ]
    ),
    lesson(
      M4,
      'em-4-2',
      2,
      'Eigenvalues and eigenvectors',
      'Solve the characteristic equation, and read eigenspaces for the 2x2 and 3x3 cases examiners actually ask.',
      16,
      nineBlocks({
        objectives: [
          'Form the characteristic polynomial det(A - lambda I) and solve for eigenvalues',
          'Find an eigenvector for a given eigenvalue by solving (A - lambda I) x = 0',
          'Use the trace-determinant shortcut to check eigenvalues of a 2x2 matrix',
          'State the geometric meaning: eigenvalues stretch eigendirections without rotating them',
        ],
        hook: `A vibration engineer needs the natural frequencies of a building. Those frequencies are the eigenvalues of the stiffness-over-mass matrix; the mode shapes are the eigenvectors. Every stability question in control theory, every principal component in data science, and every iteration analysis in numerical methods runs through the same two-step: characteristic equation, then null space.`,
        concept: `A non-zero vector x is an **eigenvector** of A if A x = lambda x for some scalar lambda. The scalar is the **eigenvalue**. Geometrically: A stretches or shrinks x along its own direction; it does not rotate it.

**Finding eigenvalues:** solve the characteristic equation det(A - lambda I) = 0. For an n x n matrix this is a degree-n polynomial with n roots (counting multiplicity, over the complex numbers).

**Finding eigenvectors:** for each lambda, solve the homogeneous system (A - lambda I) x = 0. The solutions form the **eigenspace** for that lambda; any non-zero vector in the space is an eigenvector.

**2x2 shortcut:** for A = [[a,b],[c,d]]:
- lambda_1 + lambda_2 = trace = a + d
- lambda_1 * lambda_2 = det = ad - bc

Use these to check your characteristic polynomial — a mismatch means an arithmetic error.

**Properties worth memorising:**
- det(A) = product of eigenvalues.
- trace(A) = sum of eigenvalues.
- A is invertible iff every eigenvalue is non-zero.`,
        extras: [
          info(
            'Repeated eigenvalues',
            'A repeated eigenvalue does not guarantee n independent eigenvectors. A scalar matrix like 2I has eigenvalue 2 with multiplicity n and full eigenvectors; a Jordan block like [[2,1],[0,2]] has only one independent eigenvector. If asked "distinct eigenvalues", the geometric multiplicity question is the follow-up.',
          ),
        ],
        worked: {
          title: 'Eigenvalues and eigenvectors of a 2x2',
          problem: `Find the eigenvalues and a basis for each eigenspace of A = [[4, 1], [2, 3]].`,
          steps: [
            {
              title: 'Characteristic polynomial',
              desc: 'det(A - lambda I) = (4-lambda)(3-lambda) - 2 = lambda^2 - 7lambda + 10 = (lambda - 5)(lambda - 2). Eigenvalues: 5 and 2.',
              code_snippet: 'lambda^2 - 7 lambda + 10 = 0\nlambda = 5 or 2',
            },
            {
              title: 'Check with trace and determinant',
              desc: 'Trace = 4 + 3 = 7 = 5 + 2. Det = 12 - 2 = 10 = 5 * 2. Matches.',
            },
            {
              title: 'Eigenvector for lambda = 5',
              desc: 'A - 5I = [[-1, 1], [2, -2]]. Row reduce: second row = -2 times first. Equation: -x + y = 0 so y = x. Eigenvector [1, 1].',
              code_snippet: 'lambda = 5: eigenvector [1, 1]',
            },
            {
              title: 'Eigenvector for lambda = 2',
              desc: 'A - 2I = [[2, 1], [2, 1]]. Rows identical: 2x + y = 0 so y = -2x. Eigenvector [1, -2].',
              code_snippet: 'lambda = 2: eigenvector [1, -2]',
            },
          ],
          solution:
            'Eigenvalues 5 and 2 with eigenvectors [1,1] and [1,-2] respectively (any non-zero scalar multiple also works). Always verify with trace and determinant before writing the final answer.',
        },
        practice: {
          title: 'Find eigenvalues and eigenvectors',
          prompt: `1. A = [[2, 0], [0, 3]] (diagonal matrix).
2. A = [[1, 2], [2, 1]].
3. A = [[0, 1], [1, 0]] (swap matrix).
4. Verify trace/det checks for #2.`,
          hint: '1: eigenvalues are the diagonal entries 2 and 3; eigenvectors are the coordinate axes. 2: eigenvalues 3 and -1; eigenvectors [1,1] and [1,-1]. 3: eigenvalues 1 and -1; same eigenvectors as #2. 4: trace 2 = 3+(-1); det -3 = 3*(-1).',
        },
        mistakes: [
          {
            mistake: 'Solving for eigenvectors of A - lambda I = 0 incorrectly by dividing a row to zero',
            fix: 'Row-reduce (A - lambda I) to echelon form, then write the free-variable parametrisation. Never divide an entire row by zero.',
          },
          {
            mistake: 'Forgetting that eigenvectors are only defined up to scalar multiples',
            fix: '[1,1] and [5,5] represent the same eigendirection. Any non-zero scalar multiple is a valid answer; state the equivalence.',
          },
          {
            mistake: 'Assuming every matrix is diagonalisable',
            fix: 'A matrix is diagonalisable iff the sum of geometric multiplicities equals n. Repeated eigenvalues can break this — check before claiming a full eigenbasis.',
          },
        ],
        exam: {
          question: 'Find the eigenvalues of A = [[3, 1], [0, 2]] and explain why A is diagonalisable.',
          answer:
            'Upper triangular: eigenvalues are the diagonal entries 3 and 2. Distinct eigenvalues imply two independent eigenvectors, so A is diagonalisable: A = PDP^(-1) with D = diag(3, 2).',
          source: 'Common 6-mark question across branches',
        },
        summary: [
          'A x = lambda x; solve det(A - lambda I) = 0 for eigenvalues.',
          'Eigenvectors: null space of (A - lambda I) for each lambda.',
          '2x2 check: sum of eigenvalues = trace; product = det.',
          'Distinct eigenvalues guarantee diagonalisability; repeated ones need a multiplicity check.',
        ],
      }),
      [
        [
          'Eigenvalues of a diagonal matrix are:',
          ['All zero', 'The diagonal entries', 'The off-diagonal entries', 'Always 1'],
          1,
          'For diagonal D, D x = lambda x holds for each coordinate axis with lambda equal to that diagonal entry.',
        ],
        [
          'Sum of eigenvalues of A equals:',
          ['det(A)', 'trace(A)', 'rank(A)', '0'],
          1,
          'The coefficient of lambda^(n-1) in the characteristic polynomial is -trace, so the roots sum to trace.',
        ],
        [
          'A matrix with eigenvalues 2 and 5 has determinant:',
          ['7', '10', '3', '1'],
          1,
          'det = product of eigenvalues = 2 * 5 = 10.',
        ],
      ]
    ),
  ],
};
