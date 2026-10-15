// Module 1 — DC Circuits & Ohm's Law
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M1, COURSE_ID } from './helpers';

export const module1: CourseModule = {
  id: M1,
  course_id: COURSE_ID,
  title: 'Module 1 — DC Circuits & Ohm’s Law',
  summary:
    'Voltage, current, resistance, power, and the KVL/KCL toolkit every electrical exam starts with.',
  sort_order: 1,
  lessons: [
    lesson(
      M1,
      'bee-1-1',
      1,
      "Ohm's Law, Power and Energy",
      'The V = IR relationship, power in all four forms, and energy accounting.',
      10,
      nineBlocks({
        objectives: [
          "Apply Ohm's law to find V, I or R in simple branches",
          'Compute electrical power using VI, I²R or V²/R',
          'Distinguish energy (kWh) from power (kW) in practical problems',
        ],
        hook: 'Your hostel electricity bill is energy in kWh; the geyser rating plate is power in kW. Confusing the two is the most common first-year mistake — and it costs marks every exam season.',
        concept: `**Ohm's law (linear, passive sign convention):** V = I·R when temperature and material properties are constant. Applies to resistors, not to diodes or non-linear devices.

**Passive sign convention:** current enters the + terminal of a passive element. Power P = V·I > 0 means the element absorbs power; P < 0 means it supplies.

**Power forms:** P = VI = I²R = V²/R — pick the form that has the known quantities. Maximum power transfer and heating problems almost always want I²R.

**Energy:** W = P·t. In utility billing, W is in kilowatt-hours: a 2 kW geyser running 1.5 h consumes 3 kWh.`,
        extras: [
          table('Power formula selection', ['Knowns', 'Use', 'Typical use'], [
            ['V and I', 'P = VI', 'General branch power'],
            ['I and R', 'P = I²R', 'Heating, I²R losses'],
            ['V and R', 'P = V²/R', 'Fixed-voltage heating elements'],
          ]),
          tip(
            'Units catch most errors',
            'V in volts, I in amperes, R in ohms, P in watts, W in joules or Wh. Convert kW to W before applying formulas.',
          ),
        ],
        worked: {
          title: 'Heating energy of a geyser',
          problem: 'A 2 kW geyser runs for 45 minutes. Find the energy consumed in kWh and joules.',
          steps: [
            { title: 'Convert time', desc: '45 min = 0.75 h.' },
            { title: 'Energy in kWh', desc: 'W = 2 kW x 0.75 h = 1.5 kWh.' },
            { title: 'Convert to joules', desc: '1.5 kWh x 3.6e6 J/kWh = 5.4e6 J.' },
          ],
          solution: '1.5 kWh = 5.4 MJ.',
        },
        practice: {
          title: 'Find R from power',
          prompt: 'A 60 W bulb operates at 230 V. Find its resistance.',
          hint: 'R = V²/P.',
        },
        mistakes: [
          {
            mistake: 'Applying Ohm’s law to a diode',
            fix: 'Ohm’s law is linear; non-linear devices need their V-I characteristic.',
          },
          {
            mistake: 'Mixing kW and W in bill problems',
            fix: 'Convert everything to kW before multiplying by hours if the answer should be kWh.',
          },
        ],
        exam: {
          question: 'State the passive sign convention and the meaning of P > 0.',
          answer: 'Current enters the + terminal; P > 0 means the element absorbs power.',
          source: 'Standard first-question of BEE papers.',
        },
        summary: [
          'V = IR for linear resistors; P = VI = I²R = V²/R.',
          'Positive absorbed power under passive sign convention.',
          'Energy = power x time; utility bills use kWh.',
        ],
      }),
      [
        [
          'A 12 V battery drives 3 A through R. R equals:',
          ['4 ohm', '9 ohm', '36 ohm', '0.25 ohm'],
          0,
          'R = 12/3 = 4.',
        ],
        [
          'Power in a 5 ohm resistor with 2 A:',
          ['10 W', '20 W', '5 W', '4 W'],
          1,
          'P = I²R = 4×5 = 20 W.',
        ],
        [
          '1.5 kWh equals:',
          ['1500 J', '5.4 MJ', '5400 J', '0.54 MJ'],
          1,
          '1.5×3.6e6 = 5.4e6 J.',
        ],
      ]
    ),
    lesson(
      M1,
      'bee-1-2',
      2,
      'Series, Parallel and KVL/KCL',
      'Reduce resistor networks and apply Kirchhoff’s laws to multi-loop circuits.',
      11,
      nineBlocks({
        objectives: [
          'Combine series and parallel resistors into a single equivalent',
          'Apply KVL around a loop and KCL at a node',
          'Solve a two-loop circuit for branch currents',
        ],
        hook: 'KVL is conservation of energy around a loop; KCL is conservation of charge at a node. Every mesh and nodal analysis method on top of them is just bookkeeping.',
        concept: `**Series:** same current; R_eq = R1 + R2 + ... Voltage divides in proportion to resistance.

**Parallel:** same voltage; 1/R_eq = 1/R1 + 1/R2 + ... Current divides inversely to resistance. Two-resistor shortcut: R1||R2 = (R1·R2)/(R1+R2).

**KVL:** the algebraic sum of voltages around any closed loop is zero.

**KCL:** the algebraic sum of currents entering a node is zero.

**Solution recipe for a two-loop circuit:** assign branch currents with directions, write one KCL per essential node, one KVL per independent loop, solve the linear system. Direction is a guess — a negative answer just means the true direction is opposite.`,
        extras: [
          tip(
            'Two-resistor parallel shortcut',
            'R1||R2 = product/sum. Faster than 1/(1/R1+1/R2) and less error-prone in exams.',
          ),
          warn(
            'Sign conventions in KVL',
            'Going + to − across a resistor is a drop (−IR if current enters +); − to + is a rise. Pick one convention and stick to it.',
          ),
        ],
        worked: {
          title: 'Two-loop circuit with KVL',
          problem: 'A 10 V source feeds R1=2 ohm in series with a parallel pair R2=6 ohm and R3=3 ohm. Find total current and currents in R2, R3.',
          steps: [
            { title: 'Parallel combination', desc: '6||3 = (6×3)/(6+3) = 2 ohm.' },
            { title: 'Total resistance', desc: '2 + 2 = 4 ohm.' },
            { title: 'Total current', desc: 'I = 10/4 = 2.5 A.' },
            { title: 'Voltage across pair', desc: 'V_p = 2.5×2 = 5 V.' },
            { title: 'Branch currents', desc: 'I2 = 5/6 ≈ 0.833 A; I3 = 5/3 ≈ 1.667 A. Sum = 2.5 A.' },
          ],
          solution: 'I_total = 2.5 A; I_R2 ≈ 0.833 A; I_R3 ≈ 1.667 A.',
        },
        practice: {
          title: 'Reduce and solve',
          prompt: '20 V source, R1=4 in series with 12||6. Find total current.',
          hint: '12||6 = 4 ohm.',
        },
        mistakes: [
          {
            mistake: 'Adding parallel resistors directly',
            fix: 'Parallel uses reciprocal sum, not arithmetic sum.',
          },
          {
            mistake: 'Ignoring current direction when writing KVL',
            fix: 'A wrong guess just flips the sign of the answer — but the equation must stay consistent with the guess.',
          },
        ],
        exam: {
          question: 'State KVL and KCL in one sentence each.',
          answer: 'KVL: sum of voltages around a closed loop is zero (energy). KCL: sum of currents at a node is zero (charge).',
          source: 'Definition question that opens most BEE unit tests.',
        },
        summary: [
          'Series adds R; parallel adds 1/R.',
          'KVL for loops, KCL for nodes — together they fully describe a linear circuit.',
          'Two-resolver parallel: product over sum.',
        ],
      }),
      [
        [
          '6 ohm in parallel with 3 ohm equals:',
          ['9 ohm', '2 ohm', '1.5 ohm', '18 ohm'],
          1,
          '(6×3)/(6+3) = 2.',
        ],
        [
          'In a series circuit, which quantity is common?',
          ['Voltage', 'Current', 'Power', 'Resistance'],
          1,
          'Same current through every series element.',
        ],
        [
          'KCL is a statement of conservation of:',
          ['Energy', 'Charge', 'Momentum', 'Power'],
          1,
          'Charge cannot accumulate at a node.',
        ],
      ]
    ),
  ],
};
