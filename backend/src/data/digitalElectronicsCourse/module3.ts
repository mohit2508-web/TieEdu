// Module 3 — Combinational Circuits
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, code } from '../nineBlocks';
import { lesson, M3, COURSE_ID } from './helpers';

export const module3: CourseModule = {
  id: M3,
  course_id: COURSE_ID,
  title: 'Module 3 — Combinational Circuits',
  summary:
    'Adders, multiplexers, decoders and encoders — the fixed building blocks every larger circuit is assembled from.',
  sort_order: 3,
  lessons: [
    lesson(
      M3,
      'de-3-1',
      1,
      'Adders and Subtractors',
      'Half adder, full adder, ripple-carry and the borrow-based subtractor.',
      10,
      nineBlocks({
        objectives: [
          'Design half and full adders from truth tables',
          'Cascade full adders into an n-bit ripple-carry adder',
          'Build a subtractor using two’s complement and a control bit',
        ],
        hook: 'A CPU ALU starts exactly here: one full adder, then eight of them, then thirty-two. Every multi-bit adder in silicon is a cascade of the same one-bit cell.',
        concept: `**Half adder:** two inputs (A, B); outputs Sum = A⊕B, Carry = A·B. No carry-in.

**Full adder:** three inputs (A, B, Cin); Sum = A⊕B⊕Cin, Cout = A·B + Cin·(A⊕B). This is the cell you cascade.

**Ripple-carry adder:** chain full adders; Cout of bit i feeds Cin of bit i+1. Simple, but carry ripples — O(n) delay. Faster designs (carry-lookahead) precompute group generates/propagates.

**Subtractor:** A − B = A + B̄ + 1 (two’s complement). One adder with B inverted and Cin=1 when subtracting, Cin=0 when adding — the classic adder/subtractor with a mode bit.`,
        extras: [
          table('Adder cell outputs', ['Cell', 'Sum / Difference', 'Carry / Borrow'], [
            ['Half adder', 'A⊕B', 'A·B'],
            ['Full adder', 'A⊕B⊕Cin', 'A·B + Cin·(A⊕B)'],
            ['Half subtractor', 'A⊕B', 'A̅·B'],
            ['Full subtractor', 'A⊕B⊕Bin', 'A̅·B + Bin·(A⊕B)‾'],
          ]),
          tip(
            'Mode bit M on the adder/subtractor',
            'M=0: B passes through, Cin=0 → add. M=1: B is inverted, Cin=1 → subtract. Same hardware, two operations.',
          ),
        ],
        worked: {
          title: '2-bit ripple-carry addition',
          problem: 'Add 10_2 + 11_2 using two full adders.',
          steps: [
            {
              title: 'Bit 0',
              desc: 'A0=0, B0=1, Cin=0 → Sum0=1, Cout0=0.',
            },
            {
              title: 'Bit 1',
              desc: 'A1=1, B1=1, Cin=0 → Sum1=0, Cout1=1.',
            },
            {
              title: 'Assemble result',
              desc: 'Final carry-out is the MSB of the result.',
            },
          ],
          solution: 'Result = 101_2 = 5_10 (correct: 2+3=5).',
        },
        practice: {
          title: 'Truth table of a full adder',
          prompt: 'List all 8 input combinations and the Sum/Cout for each.',
          hint: 'Sum is odd-parity of the three inputs.',
        },
        mistakes: [
          {
            mistake: 'Using a half adder for the LSB when Cin is defined',
            fix: 'If Cin=0 is guaranteed for the LSB, a half adder works; otherwise use a full adder.',
          },
          {
            mistake: 'Forgetting the +1 when subtracting',
            fix: 'Two’s complement of B is B̄+1 — invert and set Cin=1.',
          },
        ],
        exam: {
          question: 'How many full adders are needed for a 4-bit adder?',
          answer: 'Four (one per bit); the LSB can be a half adder if Cin=0.',
          source: 'Standard digital exam structural question.',
        },
        summary: [
          'Half adder: 2 inputs; full adder: 3 inputs (includes Cin).',
          'Ripple-carry cascades Cout→Cin; delay grows with bit width.',
          'Adder/subtractor shares hardware via inverted B and Cin=mode.',
        ],
      }),
      [
        [
          'Sum output of a full adder is:',
          ['A·B', 'A⊕B⊕Cin', 'A+B+Cin', 'A·B·Cin'],
          1,
          'XOR of all three inputs.',
        ],
        [
          'A − B in hardware is computed as:',
          ['A + B − 1', 'A + B̄ + 1', 'A̅ + B + 1', 'A − B̄'],
          1,
          'Two’s complement add.',
        ],
        [
          'Main drawback of ripple-carry:',
          ['Too many gates', 'Carry ripples through every stage', 'Cannot multi-bit', 'Needs clock'],
          1,
          'O(n) carry propagation delay.',
        ],
      ]
    ),
    lesson(
      M3,
      'de-3-2',
      2,
      'MUX, Demux, Encoder & Decoder',
      'The data-routing family: select lines choose paths; decoders expand addresses into one-hot lines.',
      9,
      nineBlocks({
        objectives: [
          'Realize any Boolean function with a multiplexer plus inverters',
          'Explain encoder vs priority encoder',
          'Expand a decoder into minterm lines and enable logic',
        ],
        hook: 'A 2:1 MUX with select S implements Y = S̄·D0 + S·D1 — one gate-level expression, one chip. FPGAs are largely giant mux fabrics.',
        concept: `**Multiplexer (MUX):** n select lines choose among 2^n data inputs. 2:1: Y = S̄·D0 + S·D1. Any n-variable function can be realized with a 2^(n−1):1 MUX using one variable as the select and the rest as data functions.

**Demux:** one input, n select lines route it to one of 2^n outputs — the inverse of a MUX.

**Encoder:** many inputs → few outputs representing the active input index. **Priority encoder:** if multiple inputs are high, the highest-index one wins (critical for interrupt controllers).

**Decoder:** n select lines → 2^n one-hot outputs. A decoder plus OR gates implements any SOP directly (each output line is a minterm).`,
        extras: [
          table('Circuit roles', ['Circuit', 'Direction', 'Typical use'], [
            ['MUX', 'Many → one', 'ALU operand select, bus sharing'],
            ['Demux', 'One → many', 'Memory address decode, output routing'],
            ['Priority encoder', 'Many → log2', 'Interrupt arbitration'],
            ['Decoder', 'n → 2^n', 'Chip select, memory addressing'],
          ]),
          warn(
            'Encoder vs priority encoder',
            'A plain encoder gives garbage if two inputs are high; always prefer the priority version in real designs.',
          ),
        ],
        worked: {
          title: 'Implement F(A,B,C) = Σm(1,3,5,7) with a 4:1 MUX',
          problem: 'Use A,B as selects; derive D0..D3.',
          steps: [
            {
              title: 'Assign selects',
              desc: 'Selects AB: 00→D0, 01→D1, 10→D2, 11→D3.',
            },
            {
              title: 'Evaluate each select row',
              desc: 'AB=00: m0,m1 → D0=C. AB=01: m2,m3 → D1=C.',
            },
            {
              title: 'Upper half',
              desc: 'AB=10: m4,m5 → D2=C. AB=11: m6,m7 → D3=C.',
            },
          ],
          solution: 'D0=D1=D2=D3=C — F reduces to C (spot-check: Σm(1,3,5,7) is exactly when C=1).',
        },
        practice: {
          title: '2-to-4 decoder truth table',
          prompt: 'Write outputs Y0..Y3 for all AB combinations (active-high, one-hot).',
          hint: 'Each output is a minterm of A and B.',
        },
        mistakes: [
          {
            mistake: 'Swapping MUX selects and data',
            fix: 'Select lines control which data input reaches the output; data lines carry the function values.',
          },
          {
            mistake: 'Decoder outputs as ORed minterms',
            fix: 'Each decoder output IS one minterm; OR the needed lines to build SOP.',
          },
        ],
        exam: {
          question: 'How many select lines does a 16:1 MUX have?',
          answer: '4 (log2 16).',
          source: 'Recurring ECE interview warm-up.',
        },
        summary: [
          'MUX = controlled OR; demux = controlled routing the other way.',
          'Priority encoder resolves multiple active inputs by index order.',
          'Decoder outputs are minterms — SOP in one chip plus OR gates.',
        ],
      }),
      [
        [
          'A 16:1 MUX needs how many select lines?',
          ['2', '3', '4', '8'],
          2,
          'log2(16) = 4.',
        ],
        [
          'Decoder outputs correspond to:',
          ['Maxterms', 'Minterms', 'Parity bits', 'Clock phases'],
          1,
          'One-hot minterm lines.',
        ],
        [
          'Priority encoder ensures:',
          ['All inputs read', 'Highest-index active input wins', 'Lowest wins', 'No output if multiple'],
          1,
          'Standard interrupt behavior.',
        ],
      ]
    ),
  ],
};
