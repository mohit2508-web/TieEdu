// Module 4 — DC Machines & Transformers
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M4, COURSE_ID } from './helpers';

export const module4: CourseModule = {
  id: M4,
  course_id: COURSE_ID,
  title: 'Module 4 — DC Machines & Transformers',
  summary:
    'EMF equation, torque-speed basics and the ideal transformer ratio — the machines primer every branch needs.',
  sort_order: 4,
  lessons: [
    lesson(
      M4,
      'bee-4-1',
      1,
      'DC Machines: EMF and Torque',
      'Construction, back EMF, the two universal equations and speed control intuition.',
      11,
      nineBlocks({
        objectives: [
          'Write the DC machine EMF and torque equations with correct symbols',
          'Explain back EMF and why a stalled motor draws dangerous current',
          'Relate armature resistance, supply and speed in shunt motors',
        ],
        hook: 'A DC motor started direct-on-line without a starter can burn its armature in seconds — because back EMF has not yet developed to limit the current. That single fact is half the machines viva.',
        concept: `**Construction:** stator field (permanent magnet or field winding), rotor armature with commutator and brushes. Commutator rectifies so torque stays unidirectional.

**EMF equation:** E = (φ Z N P) / (60 A) — φ flux per pole, Z conductors, N rpm, P poles, A parallel paths (A = P for lap, A = 2 for wave).

**Torque:** T = (φ Z P I_a) / (2π A) — electromagnetic torque proportional to flux and armature current.

**Motor equation:** V = E + I_a R_a. At start, N=0 so E=0 and I_a = V/R_a (huge) — hence starters with series resistance. Running: E ≈ V, so I_a adjusts to load.

**Speed:** N ∝ (V − I_a R_a)/φ. Shunt speed control: vary field flux (above base) or armature voltage (below base).`,
        extras: [
          table('Motor vs generator signs', ['Machine', 'EMF relation', 'Energy'], [
            ['Motor', 'V = E + I_a R_a', 'Electrical → mechanical'],
            ['Generator', 'E = V + I_a R_a', 'Mechanical → electrical'],
          ]),
          tip(
            'Back EMF is the self-regulator',
            'As speed rises, E rises, I_a falls — the machine settles. Stall and that protection vanishes.',
          ),
          warn(
            'No starter, no motor',
            'Never DOL-start a large DC shunt motor; always insert starting resistance.',
          ),
        ],
        worked: {
          title: 'Back EMF and armature current',
          problem: 'A 220 V DC motor has R_a = 0.5 ohm. Running, I_a = 20 A. Find E and the starting current if started DOL.',
          steps: [
            { title: 'Running back EMF', desc: 'E = V − I_a R_a = 220 − 10 = 210 V.' },
            { title: 'Starting current (DOL)', desc: 'At start N=0, E=0: I_a = 220/0.5 = 440 A.' },
            { title: 'Compare', desc: '440 A is 22× the running current — a starter is mandatory.' },
          ],
          solution: 'E_running = 210 V; I_start(DOL) = 440 A.',
        },
        practice: {
          title: 'Compute EMF',
          prompt: '4-pole lap-wound DC machine, φ = 0.02 Wb, Z = 1000, N = 1500 rpm. Find E.',
          hint: 'A = P for lap winding.',
        },
        mistakes: [
          {
            mistake: 'Forgetting A in the EMF equation',
            fix: 'Lap: A=P; wave: A=2. Wrong A scales E incorrectly.',
          },
          {
            mistake: 'Treating starting current as abnormal',
            fix: 'It is expected physics (E=0); the starter is how machines survive it.',
          },
        ],
        exam: {
          question: 'Why must a DC shunt motor be started with a starter?',
          answer: 'At standstill back EMF is zero, so I_a = V/R_a is dangerously high; the starter limits initial current.',
          source: 'The most common machines short-answer.',
        },
        summary: [
          'E = φZNP/(60A); T = φZP I_a/(2πA).',
          'Motor: V = E + I_a R_a; stall ⇒ no back EMF ⇒ huge current.',
          'Speed ∝ (V − I_a R_a)/φ — flux and voltage control.',
        ],
      }),
      [
        [
          'At standstill, back EMF of a DC motor is:',
          ['Maximum', 'Zero', 'Equal to V', 'Negative'],
          1,
          'N=0 ⇒ E=0.',
        ],
        [
          'EMF equation constant A equals for wave winding:',
          ['P', '2', 'P/2', '4'],
          1,
          'Wave: two parallel paths.',
        ],
        [
          'Motor speed is proportional to:',
          ['φ/(V−I_aR_a)', '(V−I_aR_a)/φ', 'V only', 'I_a only'],
          1,
          'Flux in the denominator — weaker field raises speed.',
        ],
      ]
    ),
    lesson(
      M4,
      'bee-4-2',
      2,
      'Transformers: Ratios, Losses and Regulation',
      'Ideal transformer equations, real losses, efficiency and voltage regulation.',
      10,
      nineBlocks({
        objectives: [
          'Apply turns, voltage and current ratios of an ideal transformer',
          'Separate core (iron) and copper losses and compute efficiency',
          'Define voltage regulation and its dependence on winding impedance',
        ],
        hook: 'Every appliance charger is a transformer. Grid transmission at hundreds of kV exists purely because transformers make I²R losses tiny for the same power.',
        concept: `**Ideal transformer:** V₁/V₂ = N₁/N₂ = a; I₁/I₂ = 1/a; power in = power out. Primary and secondary MMFs balance: N₁I₁ = N₂I₂ (no-load I₀ neglected).

**Real losses:** copper loss = I²R in each winding (load dependent); iron/core loss = hysteresis + eddy, roughly constant with load (depends on V and f).

**Efficiency:** η = P_out / (P_out + P_core + P_cu). Max efficiency when copper loss = iron loss.

**Voltage regulation:** %reg = (V₂,nl − V₂,fl) / V₂,fl × 100 — drop under load due to winding impedance.

**Auto-transformer:** shared winding; lighter/cheaper for small ratio changes but no galvanic isolation.`,
        extras: [
          table('Loss vs load', ['Loss', 'Depends on', 'Behavior'], [
            ['Copper I²R', 'Load current', 'Varies with load²'],
            ['Core (iron)', 'Voltage, frequency, core', 'Nearly constant'],
          ]),
          tip(
            'Efficiency peak at loss crossover',
            'Design sets core loss ≈ full-load copper loss so peak efficiency sits near typical loading.',
          ),
        ],
        worked: {
          title: 'Turns ratio and efficiency',
          problem: 'A 230/2300 V step-up transformer delivers 10 kW at pf 0.8 with P_core = 100 W and P_cu = 150 W at that load. Find a, I₁, I₂ and η.',
          steps: [
            { title: 'Turns ratio', desc: 'a = N₂/N₁ = 2300/230 = 10.' },
            { title: 'Secondary current', desc: 'I₂ = P/(V₂ pf) = 10000/(2300×0.8) ≈ 5.43 A.' },
            { title: 'Primary current', desc: 'I₁ = a·I₂ = 54.3 A (ideal ratio).' },
            { title: 'Efficiency', desc: 'η = 10000 / (10000+100+150) = 10000/10250 ≈ 97.6%.' },
          ],
          solution: 'a = 10; I₁ ≈ 54.3 A; I₂ ≈ 5.43 A; η ≈ 97.6%.',
        },
        practice: {
          title: 'Find copper loss at peak efficiency',
          prompt: 'For the transformer above, what copper loss maximizes η and what is that η?',
          hint: 'Peak when P_cu = P_core.',
        },
        mistakes: [
          {
            mistake: 'Applying current ratio directly to impedances',
            fix: 'Z₁/Z₂ = a² — impedance transforms with the square of the turns ratio.',
          },
          {
            mistake: 'Forgetting pf in current calculation',
            fix: 'I = S/V = P/(V pf) for real-power-specified loads.',
          },
        ],
        exam: {
          question: 'State the ideal transformer voltage and current ratios.',
          answer: 'V₁/V₂ = N₁/N₂ and I₁/I₂ = N₂/N₁ (power conserved).',
          source: 'Opens almost every transformer unit.',
        },
        summary: [
          'Ideal: V∝N, I∝1/N, P_in = P_out.',
          'Copper loss ∝ I²; core loss roughly constant.',
          'Peak efficiency at P_cu = P_core; regulation measures voltage drop under load.',
        ],
      }),
      [
        [
          'For a 11:1 step-down transformer, V₁/V₂ equals:',
          ['1/11', '11', '121', '1'],
          1,
          'Primary over secondary equals turns ratio.',
        ],
        [
          'Efficiency is maximum when:',
          ['Copper loss = zero', 'Copper loss = iron loss', 'Load = zero', 'Iron loss = zero'],
          1,
          'Standard transformer result.',
        ],
        [
          'Iron loss depends mainly on:',
          ['Load current', 'Supply voltage and frequency', 'Secondary resistance', 'Power factor'],
          1,
          'Hysteresis and eddy losses track V and f.',
        ],
      ]
    ),
  ],
};
