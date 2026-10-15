// Module 1 — Foundations: Signals, Systems & Convolution
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M1, COURSE_ID } from './helpers';

export const module1: CourseModule = {
  id: M1,
  course_id: COURSE_ID,
  title: 'Module 1 — Foundations: Signals, Systems & Convolution',
  summary:
    'Signal classifications, system properties (linearity, time-invariance, causality, stability), LTI systems and the convolution integral/sum.',
  sort_order: 1,
  lessons: [
    lesson(
      M1,
      'ss-1-1',
      1,
      'Signals & System Properties',
      'Continuous vs discrete, energy vs power, periodicity; then the four properties every exam asks: linearity, time-invariance, causality, BIBO stability.',
      13,
      nineBlocks({
        objectives: [
          'Classify signals: CT/DT, energy/power, periodic/aperiodic, even/odd',
          'Test a system for linearity and time-invariance with standard inputs',
          'State causality and BIBO stability and test each on given systems',
        ],
        hook:
          'Every ECE exam paper in signals starts the same way: "Check whether the system y(t) = x(t)cos(t0) is linear, causal and stable." Four tests, ten minutes, full marks — if you know the tests by heart.',
        concept: `**Signal vocabulary:**
- **CT vs DT:** x(t) continuous argument vs x[n] integer index.
- **Energy vs power:** E = ∫|x(t)|²dt (finite energy ⇒ energy signal, zero average power); P = lim(1/T)∫|x|² over T. Power signals have infinite energy (e.g. periodic). A zero signal is both (trivially).
- **Periodic:** x(t) = x(t+T0), fundamental T0 = smallest such T. DT: x[n] = x[n+N], fundamental N smallest positive integer. Sum of two periodic signals is periodic only if T1/T2 is rational.
- **Even/odd:** x(t)=x(−t) even; x(t)=−x(−t) odd; any signal = even part + odd part.

**System properties (the four exam tests):**
1. **Linearity:** T{a·x1 + b·x2} = a·T{x1} + b·T{x2}. Test with weighted sum of two inputs. Breaks on: amplitude nonlinearity (x²), offsets (x + 1), modulations by t·x(t).
2. **Time-invariance (TI):** input delayed by t0 ⇒ output delayed by t0. Test: y(t,t0) = T{x(t−t0)} equals y(t−t0). Breaks on: coefficients that vary with t (t·x(t), cos(t)x(t)).
3. **Causality:** output at time t depends only on present/past inputs, never future. Test: x1 = x2 on (−∞, t0] ⇒ outputs equal there. Any system writing y(t) = x(t+1) is noncausal.
4. **BIBO stability:** every bounded input (|x| ≤ Mx < ∞) gives bounded output (|y| ≤ My < ∞). For LTI: stable iff impulse response absolutely integrable, ∫|h(t)|dt < ∞ (DT: Σ|h[n]| < ∞).

**LTI = Linear + Time-Invariant.** Only for LTI systems do convolution, transfer functions, frequency response and the whole transform toolkit apply. That is why the first two tests come first in every question.`,
        extras: [
          table('Property', ['One-line test'], [
            ['Linearity', 'Weighted-sum input gives weighted-sum output'],
            ['Time-invariance', 'Delay input by t0 ⇒ output delayed by t0'],
            ['Causality', 'No dependence on future input values'],
            ['BIBO stability', 'Bounded input ⇒ bounded output (∫|h| < ∞ for LTI)'],
          ]),
          tip(
            'Instant nonlinearity/non-TI detectors',
            'x², |x|, offset (+1) kill linearity; any t multiplying x kills TI.',
          ),
          warn(
            'Stability test for non-LTI',
            'Without LTI there is no ∫|h| shortcut — argue directly with bounded inputs.',
          ),
        ],
        worked: {
          title: 'Classify y(t) = t·x(t)',
          problem: 'System: y(t) = t x(t). Test linearity, time-invariance, causality, stability.',
          steps: [
            { title: 'Linearity', desc: 'T{a x1 + b x2} = t(a x1 + b x2) = a t x1 + b t x2 — linear (scaling/additivity hold).' },
            { title: 'TI test', desc: 'Input x(t−t0) gives t·x(t−t0); desired output is (t−t0)x(t−t0). Not equal ⇒ NOT time-invariant.' },
            { title: 'Causality', desc: 'y(t) depends only on x(t) at the same instant ⇒ causal.' },
            { title: 'Stability', desc: 'x = u(t) bounded (M=1): y(t) = t → grows unbounded ⇒ NOT BIBO stable.' },
            { title: 'Verdict', desc: 'Linear, causal, not TI, not stable — so no convolution/transfer-function analysis.' },
          ],
          solution: 'Linear + causal; not TI (t coefficient), not stable (ramp gain).',
        },
        practice: {
          title: 'Detect the offset',
          prompt: 'y(t) = x(t) + 3. Linear? Time-invariant? Why does the offset break linearity?',
          hint: 'Test T{0} — linearity requires the zero input to give zero output.',
        },
        mistakes: [
          {
            mistake: 'Testing TI by delaying the output expression and calling it done',
            fix: 'Both sides: response to delayed input must equal delayed original response.',
          },
          {
            mistake: 'Saying causal systems are always stable',
            fix: 'Causality and stability are independent properties — t·x(t) is causal but unstable.',
          },
        ],
        exam: {
          question: 'State BIBO stability for LTI systems in terms of the impulse response.',
          answer: 'The system is BIBO stable iff h(t) is absolutely integrable: ∫|h(t)|dt < ∞ (DT: Σ|h[n]| < ∞).',
          source: 'Standard 4–6 mark question.',
        },
        summary: [
          'Energy vs power; periodicity requires rational period ratio for sums.',
          'Linearity, TI, causality, BIBO — four standard tests.',
          'LTI unlocks convolution and transforms; ∫|h| < ∞ ⇔ stable.',
        ],
      }),
      [
        [
          'y(t) = x²(t) is:',
          ['Linear and TI', 'Nonlinear but TI', 'Linear but not TI', 'Neither'],
          1,
          'Squaring is memoryless/time-invariant but fails scaling.',
        ],
        [
          'For an LTI system, BIBO stability is equivalent to:',
          ['h(t) = 0 after some time', '∫|h(t)|dt < ∞', 'h(t) bounded only', 'Unit impulse input'],
          1,
          'Absolute integrability.',
        ],
        [
          'A system with y(t) = x(t + 1) is:',
          ['Causal', 'Noncausal', 'Unstable only', 'Time-varying only'],
          1,
          'Uses a future input value.',
        ],
      ]
    ),
    lesson(
      M1,
      'ss-1-2',
      2,
      'Convolution: The LTI Workhorse',
      'Convolution integral for CT and sum for DT: intuition, graphical method steps, commutativity, and the identity with the impulse response.',
      13,
      nineBlocks({
        objectives: [
          'Compute the convolution of two simple signals graphically and analytically',
          'Explain flip-shift-multiply-integrate as the operational recipe',
          'Use convolution properties: commutativity, associativity, identity with δ',
        ],
        hook:
          'One integral answers every LTI question: give me any input and I will give you the output — because I know h(t). Convolution is not an arbitrary formula; it is the mathematical statement of "the present is a weighted sum of the recent past".',
        concept: `**Convolution integral (CT LTI):**
y(t) = x(t) * h(t) = ∫_{−∞}^{∞} x(τ) h(t − τ) dτ

**Convolution sum (DT LTI):**
y[n] = x[n] * h[n] = Σ_k x[k] h[n − k]

**Why it works (impulse decomposition):** any signal = superposition of shifted impulses: x(t) = ∫ x(τ) δ(t−τ) dτ. LTI system responds to each δ with shifted scaled h; superposition assembles the integral.

**Graphical recipe (flip–shift–multiply–integrate):**
1. Replace t by τ: x(τ), h(τ).
2. Flip one function: h(−τ).
3. Shift by the observation time t: h(t−τ).
4. Multiply overlap region; integrate (CT) / sum (DT).
5. Repeat across t or n — the overlapping interval changes in stages; results are piecewise.

**Properties:**
- Commutative: x*h = h*x (choose the easier flip).
- Associative & distributive over +.
- y(t) = x(t)*δ(t) = x(t) (identity).
- Widths add: duration(y) = duration(x) + duration(h) (finite-length signals).
- LTI system fully characterised by h(t): H(s) or H(jω) is the transform of h.

**Examples to know cold:** rect * rect = triangle; rect * exp(−at)u(t) = exponential rise; u(t) * u(t) = t·u(t) (ramp).`,
        extras: [
          table('Pair', ['Result'], [
            ['x(t)*δ(t)', 'x(t)'],
            ['u(t)*u(t)', 't u(t) (ramp)'],
            ['rect(t)*rect(t)', 'triangle Λ(t)'],
            ['e^{−at}u(t)*e^{−bt}u(t)', '(e^{−at}−e^{−bt})/(b−a) · u(t), a≠b'],
          ]),
          tip(
            'Flip the shorter/rectangular one',
            'Commutativity lets you flip whichever function makes the overlap stages simplest.',
          ),
          warn(
            'Limits of integration follow the overlap',
            'Do not blindly integrate −∞..∞; the product is nonzero only where both windows overlap.',
          ),
        ],
        worked: {
          title: 'rect * rect by stages',
          problem: 'x(t) = u(t) − u(t−1) (unit rect on [0,1]), h(t) same. Find y(t).',
          steps: [
            { title: 'Flip', desc: 'h(−τ) = 1 on [−1, 0].' },
            { title: 'Stage 1 (t < 0)', desc: 'Shifted h(t−τ) sits left of x — no overlap ⇒ y = 0.' },
            { title: 'Stage 2 (0 ≤ t ≤ 1)', desc: 'Partial overlap: integral = ∫₀^t 1 dτ = t — linear rise.' },
            { title: 'Stage 3 (1 ≤ t ≤ 2)', desc: 'Overlap shrinks: ∫_{t−1}^1 dτ = 2 − t — linear fall.' },
            { title: 'Stage 4 (t > 2)', desc: 'No overlap ⇒ 0. Result: triangle from 0 to 2, peak 1 at t=1.' },
          ],
          solution: 'y(t) = triangle: t for 0≤t≤1, 2−t for 1<t≤2, 0 elsewhere — width 2 = 1+1.',
        },
        practice: {
          title: 'Convolve with impulse',
          prompt: 'y(t) = [t e^{−t} u(t)] * δ(t−2). Write y(t) without integrating.',
          hint: 'Shift property with δ.',
        },
        mistakes: [
          {
            mistake: 'Forgetting to flip before shifting',
            fix: 'Convolution is flip–shift–multiply–integrate; correlation (no flip) is a different operation.',
          },
          {
            mistake: 'Assuming the output length equals the input length',
            fix: 'Lengths add — convolving two length-N DT signals gives length 2N−1.',
          },
        ],
        exam: {
          question: 'State the convolution property of LTI systems and why h(t) characterises the system.',
          answer: 'y(t) = x(t)*h(t); since any input is a superposition of shifted impulses and the system responds to each with shifted h, knowing h determines the output for every input.',
          source: 'Core concept question.',
        },
        summary: [
          'LTI output = input * impulse response (integral CT / sum DT).',
          'Graphical method: flip, shift, multiply, integrate in overlap stages.',
          'Commutative; widths add; δ is the identity element.',
        ],
      }),
      [
        [
          'The identity element of convolution is:',
          ['u(t)', 'δ(t)', '1', '0'],
          1,
          'x(t)*δ(t) = x(t).',
        ],
        [
          'If x has duration 3 and h duration 4 (finite), y = x*h has duration:',
          ['3', '4', '7', '12'],
          2,
          'Durations add.',
        ],
        [
          'Convolution is:',
          ['Commutative but not associative', 'Commutative and associative', 'Neither', 'Commutative only for even signals'],
          1,
          'Full ring-like properties (with distributivity over +).',
        ],
      ]
    ),
  ],
};
