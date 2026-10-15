// Module 2 — Boolean Algebra & Logic Gates
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, code } from '../nineBlocks';
import { lesson, M2, COURSE_ID } from './helpers';

export const module2: CourseModule = {
  id: M2,
  course_id: COURSE_ID,
  title: 'Module 2 — Boolean Algebra & Logic Gates',
  summary:
    "De Morgan's laws, the K-map method and the gate-level building blocks every ECE exam assumes.",
  sort_order: 2,
  lessons: [
    lesson(
      M2,
      'de-2-1',
      1,
      "Boolean Algebra & De Morgan's Laws",
      'Simplify expressions with identities, duality and De Morgan — the language of every digital circuit diagram.',
      11,
      nineBlocks({
        objectives: [
          "Apply De Morgan's theorems to push negations through AND/OR",
          'Simplify Boolean expressions with absorption and consensus',
          'Convert between SOP and POS forms',
        ],
        hook: 'A designer writes F = A·B + A·B̄ + 0. The simplify step A·(B + B̄) = A collapses two gates into one wire — and that is how chip area shrinks in real products.',
        concept: `**Basic laws:** identity (A+0=A, A·1=A), idempotent (A+A=A), complement (A+Ā=1, A·Ā=0), distributive, and absorption (A + A·B = A).

**De Morgan's theorems:**
- (A · B)‾ = A̅ + B̅
- (A + B)‾ = A̅ · B̅

A bubble on a NAND equals AND-with-inverted-inputs. Every circuit can be redrawn with only NAND or only NOR gates.

**SOP / POS:** sum-of-products (OR of ANDs) and product-of-sums (AND of ORs). Canonical forms list every minterm or maxterm — useful before K-maps.

**Duality:** swap AND↔OR and 0↔1 to get a dual theorem for free.`,
        extras: [
          table('Gate equivalences', ['Gate', 'Equals', 'Inverted form'], [
            ['NAND (A·B)‾', 'AND + output NOT', 'OR with inverted inputs'],
            ['NOR (A+B)‾', 'OR + output NOT', 'AND with inverted inputs'],
            ['XOR A⊕B', 'A·B̄ + A̅·B', 'XNOR = (A⊕B)‾'],
          ]),
          tip(
            'Push bubbles instead of expanding',
            "For (A+B+C)‾, push the bubble: A̅·B̅·C̅. Faster and less error-prone than minterm expansion.",
          ),
        ],
        worked: {
          title: "Simplify F = A·B + A·B̄ + A̅·B̄",
          problem: 'Reduce to minimal SOP.',
          steps: [
            {
              title: 'Group the first two terms',
              desc: 'A·(B + B̄) = A·1 = A.',
            },
            {
              title: 'Rewrite',
              desc: 'Expression becomes A + A̅·B̄.',
            },
            {
              title: 'Apply X + X̄·Y = X + Y',
              desc: 'A + B̄.',
            },
          ],
          solution: 'F = A + B̄',
        },
        practice: {
          title: "Simplify (A+B)·(A+B̄)",
          prompt: 'Reduce the product to one literal if possible.',
          hint: 'Distribute A out first.',
        },
        mistakes: [
          {
            mistake: "Applying De Morgan to three variables incorrectly",
            fix: 'All operators flip and all literals invert: (A+B+C)‾ = A̅·B̅·C̅.',
          },
          {
            mistake: 'Confusing XOR with OR',
            fix: 'XOR is true for exactly one high input; OR is true for at least one.',
          },
        ],
        exam: {
          question: 'Implement A+B using only NAND gates.',
          answer: "(A̅·B̅)‾ = A + B by De Morgan — two inverters and one NAND.",
          source: 'Classic gate-universality question.',
        },
        summary: [
          'Absorption and De Morgan cover most simplification steps.',
          "De Morgan: flip the operator, invert every literal.",
          'NAND and NOR are universal — any function can be built from one of them alone.',
        ],
      }),
      [
        [
          '(A·B)‾ equals:',
          ['A̅·B̅', 'A̅+B̅', 'A+B', 'A·B'],
          1,
          "De Morgan: product's complement is sum of complements.",
        ],
        [
          'A + A·B simplifies to:',
          ['A', 'A+B', 'B', 'A·B'],
          0,
          'Absorption law.',
        ],
        [
          'XOR of 1 and 1:',
          ['0', '1', 'Undefined', 'High-Z'],
          0,
          'XOR is true for exactly one high input.',
        ],
      ]
    ),
    lesson(
      M2,
      'de-2-2',
      2,
      'Karnaugh Maps & Minimization',
      'Map truth tables onto K-maps, group 1s in powers of two, and write minimal SOP.',
      10,
      nineBlocks({
        objectives: [
          'Plot a truth table onto a 2-, 3- or 4-variable K-map',
          'Form largest possible groups of 1s including wrap-around',
          'Write the minimal SOP expression from the map',
        ],
        hook: 'Exams hand you a 4-variable truth table and ask for the "minimum SOP". The K-map is the two-minute method that beats algebraic trial every time.',
        concept: `**K-map layout:** cells are numbered in Gray-code order so adjacent cells differ by one bit. 3-variable maps are 2x4; 4-variable maps are 4x4.

**Grouping rules:**
1. Groups must contain 1, 2, 4, 8... cells (powers of two).
2. Groups may wrap around edges.
3. Take the largest groups first; overlapping is allowed and encouraged.
4. Every 1 must be covered by at least one group.

**Reading a group:** a group of size 2^k eliminates k variables. Write the literals that stay constant across the group.

**Don't-cares (X):** treat as 1 or 0, whichever makes a larger group.`,
        extras: [
          tip(
            'Start with the largest group',
            'Find any octet, then quads, then pairs, then singles. Singles cost more gates.',
          ),
          warn(
            'Groups of 3 or 5 are illegal',
            'Only power-of-two group sizes correspond to eliminating whole variables.',
          ),
        ],
        worked: {
          title: 'Minimize a 3-variable function',
          problem: 'F(A,B,C) = Σm(0,1,2,5,7). Find minimal SOP.',
          steps: [
            {
              title: 'Plot the map',
              desc: 'Minterms on a 2x4 map (A rows, BC columns in Gray order 00,01,11,10).',
            },
            {
              title: 'Find pairs',
              desc: 'Pair (0,1) = A̅·B̅; pair (0,2) = A̅·C̅; pair (5,7) = A·C; pair (1,5) = B̅·C.',
            },
            {
              title: 'Minimal cover',
              desc: 'A̅·B̅ covers 0,1; A·C covers 5,7; A̅·C̅ covers 0,2 (m2).',
            },
          ],
          solution: 'F = A̅·B̅ + A·C + A̅·C̅',
        },
        practice: {
          title: 'Map F = Σm(0,2,4,5) of three variables',
          prompt: 'Draw the map, circle groups, write minimal SOP.',
          hint: 'Look for a wrap-around pair on the top and bottom rows.',
        },
        mistakes: [
          {
            mistake: 'Forgetting wrap-around groups',
            fix: 'The left and right edges (and top/bottom of a 4-var map) are adjacent in Gray code.',
          },
          {
            mistake: 'Grouping non-adjacent 1s diagonally',
            fix: 'Adjacency is one-bit difference only; diagonal cells differ by two bits.',
          },
        ],
        exam: {
          question: 'How many cells does a 4-variable K-map have?',
          answer: '2^4 = 16 cells.',
          source: 'Opening question of most digital exams.',
        },
        summary: [
          'K-map cells use Gray-code ordering for one-bit adjacency.',
          'Groups must be powers of two; wrap-around is allowed.',
          'Largest groups first — each group of 2^k kills k variables.',
        ],
      }),
      [
        [
          'A 4-variable K-map has how many cells?',
          ['8', '12', '16', '32'],
          2,
          '2^4 = 16.',
        ],
        [
          'Group sizes allowed on a K-map:',
          ['Any', 'Powers of two only', 'Even only', 'Pairs and quads only'],
          1,
          '1, 2, 4, 8, 16...',
        ],
        [
          'Adjacent K-map cells differ by:',
          ['One bit', 'Two bits', 'One byte', 'Nothing — layout only'],
          0,
          'Gray-code layout guarantees one-bit difference.',
        ],
      ]
    ),
  ],
};
