// Module 2 — Network Theorems
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M2, COURSE_ID } from './helpers';

export const module2: CourseModule = {
  id: M2,
  course_id: COURSE_ID,
  title: 'Module 2 — Network Theorems',
  summary:
    'Superposition, Thevenin, Norton and maximum power transfer — the shortcuts every network problem expects.',
  sort_order: 2,
  lessons: [
    lesson(
      M2,
      'bee-2-1',
      1,
      'Superposition, Thevenin & Norton',
      'Simplify multi-source networks into a single source plus one resistance.',
      11,
      nineBlocks({
        objectives: [
          'Apply superposition to a multi-source linear network',
          'Find a Thevenin equivalent between two terminals',
          'Convert freely between Thevenin and Norton forms',
        ],
        hook: 'A three-source bridge looks impossible until you kill two sources and solve three easy circuits. Superposition is not a trick — it is linearity made usable.',
        concept: `**Superposition:** in a linear network with multiple independent sources, the response in any branch is the sum of the responses caused by each source acting alone. Kill other voltage sources (short) and current sources (open). Dependent sources are NOT killed.

**Thevenin:** any two-terminal linear network equals V_th in series with R_th. V_th = open-circuit voltage at the terminals; R_th = V_oc / I_sc, or turn off independent sources and combine resistances looking into the terminals (with a test source if needed).

**Norton:** I_N in parallel with R_N, with R_N = R_th and I_N = V_th / R_th. Source transformation converts freely between the two.`,
        extras: [
          table('Killing sources for superposition', ['Source', 'Turn off as', 'Note'], [
            ['Independent V', 'Short circuit', 'V=0'],
            ['Independent I', 'Open circuit', 'I=0'],
            ['Dependent', 'Leave active', 'Never kill dependents'],
          ]),
          tip(
            'Thevenin for load problems',
            'When the load changes value but the rest of the circuit does not, find V_th/R_th once and reuse.',
          ),
        ],
        worked: {
          title: 'Thevenin across a load',
          problem: '10 V source with 2 ohm in series; load terminals after the 2 ohm. Find V_th and R_th looking back.',
          steps: [
            { title: 'Open-circuit voltage', desc: 'No current when open, so no drop across 2 ohm: V_th = 10 V.' },
            { title: 'Turn off source, look back', desc: 'Short the source: R_th = 2 ohm.' },
            { title: 'Equivalent', desc: '10 V in series with 2 ohm.' },
          ],
          solution: 'V_th = 10 V, R_th = 2 ohm.',
        },
        practice: {
          title: 'Norton of the same network',
          prompt: 'Convert the Thevenin above to a Norton equivalent.',
          hint: 'I_N = V_th / R_th.',
        },
        mistakes: [
          {
            mistake: 'Killing dependent sources',
            fix: 'Only independent sources are turned off for superposition and R_th.',
          },
          {
            mistake: 'Computing R_th with sources still active',
            fix: 'Turn off independents first, then combine or apply a test source.',
          },
        ],
        exam: {
          question: 'State Thevenin’s theorem.',
          answer: 'Any linear two-terminal network is equivalent to a single voltage source V_th in series with R_th.',
          source: 'Definition + numerical every BEE final.',
        },
        summary: [
          'Superposition: one source at a time; kill independents only.',
          'Thevenin = V_oc in series with R_th; Norton = V_th/R_th in parallel.',
          'Source transformation is free between the two forms.',
        ],
      }),
      [
        [
          'To kill a voltage source for superposition you:',
          ['Open it', 'Short it', 'Leave it', 'Double it'],
          1,
          'V becomes zero — a short.',
        ],
        [
          'Dependent sources during superposition:',
          ['Are killed', 'Stay active', 'Are doubled', 'Become open'],
          1,
          'Only independent sources are turned off.',
        ],
        [
          'R_th equals:',
          ['V_oc only', 'V_oc / I_sc', 'I_sc only', 'V_oc × I_sc'],
          1,
          'Open-circuit voltage over short-circuit current.',
        ],
      ]
    ),
    lesson(
      M2,
      'bee-2-2',
      2,
      'Maximum Power Transfer & Reciprocity',
      'When a load extracts the most power, and when you may swap source and response.',
      9,
      nineBlocks({
        objectives: [
          'State and apply the maximum power transfer theorem',
          'Compute efficiency at maximum power and at matched conditions',
          'Recognize when reciprocity may be applied',
        ],
        hook: 'Antenna matching, speaker amplifiers and sensor front-ends all design for maximum power transfer. The theorem is one line; the efficiency surprise around it is where marks are won.',
        concept: `**Maximum power transfer:** a load R_L drawn from a network with Thevenin resistance R_th receives maximum power when R_L = R_th. Then P_max = V_th² / (4·R_th).

**Efficiency at match:** only 50% of the developed power reaches the load — the other half is lost in R_th. Power systems deliberately do NOT match (they want efficiency, not max load power); communication and audio stages do match.

**Reciprocity:** in a linear network with a single independent source, if a current I in branch A produces voltage V in branch B, then the same current I in branch B produces V in branch A. Valid only for single-source, linear, bilateral networks without dependent sources breaking it.`,
        extras: [
          tip(
            'R_L = R_th is the exam phrase',
            'Almost every max-power question reduces to "find R_th, set load equal".',
          ),
          warn(
            'Efficiency vs max power',
            'Max power at 50% efficiency; near-unity efficiency needs R_L >> R_th. Do not mix the two design goals.',
          ),
        ],
        worked: {
          title: 'Max power into a load',
          problem: 'Thevenin: V_th = 12 V, R_th = 3 ohm. Find R_L for max power and P_max.',
          steps: [
            { title: 'Match the load', desc: 'R_L = R_th = 3 ohm.' },
            { title: 'Circuit current', desc: 'I = 12 / (3+3) = 2 A.' },
            { title: 'Load power', desc: 'I²·R_L = 4×3 = 12 W. Or V_th²/(4 R_th) = 144/12 = 12 W.' },
          ],
          solution: 'R_L = 3 ohm, P_max = 12 W.',
        },
        practice: {
          title: 'Efficiency at match',
          prompt: 'For the network above at matched load, what fraction of developed power reaches the load?',
          hint: 'Compare I²R_L with I²(R_th+R_L).',
        },
        mistakes: [
          {
            mistake: 'Confusing max power with max efficiency',
            fix: 'Match gives max power at 50% efficiency; efficiency rises as R_L grows.',
          },
          {
            mistake: 'Applying reciprocity to multi-source networks',
            fix: 'Single independent source (or linearity with all killed except one) is required.',
          },
        ],
        exam: {
          question: 'State the maximum power transfer theorem and the efficiency at that condition.',
          answer: 'P is max when R_L = R_th; efficiency is then 50%.',
          source: 'Recurring 4–6 mark BEE question.',
        },
        summary: [
          'Max power when R_L = R_th; P_max = V_th²/(4 R_th).',
          'Efficiency at match is 50% — not a power-system goal.',
          'Reciprocity: swap source and response in a single-source linear network.',
        ],
      }),
      [
        [
          'Max power transfer occurs when R_L equals:',
          ['0', 'R_th', '2 R_th', 'Infinity'],
          1,
          'Matched load.',
        ],
        [
          'Efficiency at max power is:',
          ['25%', '50%', '75%', '100%'],
          1,
          'Half the power is lost in R_th.',
        ],
        [
          'P_max formula:',
          ['V_th²/R_th', 'V_th²/(4 R_th)', 'V_th·I_sc', 'I_sc²·R_th'],
          1,
          'V_th²/(4 R_th).',
        ],
      ]
    ),
  ],
};
