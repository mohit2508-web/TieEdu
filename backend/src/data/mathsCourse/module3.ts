// Module 3 — Integration Techniques & Applications
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn } from '../nineBlocks';
import { lesson, M3, COURSE_ID } from './helpers';

export const module3: CourseModule = {
  id: M3,
  course_id: COURSE_ID,
  title: 'Module 3 — Integration & Applications',
  summary: 'The standard techniques, improper integrals, and area/volume applications.',
  sort_order: 3,
  lessons: [
    lesson(
      M3,
      'em-3-1',
      1,
      'Integration techniques',
      'Substitution, parts, partial fractions, and trig substitutions — pick the right tool on sight.',
      18,
      nineBlocks({
        objectives: [
          'Recognise which technique (substitution, parts, partial fractions, trig sub) matches a given integrand',
          'Apply integration by parts to products of polynomial and exponential/trigonometric functions',
          'Decompose a proper rational function into partial fractions',
          'Evaluate definite integrals using the Fundamental Theorem of Calculus',
        ],
        hook: `Every signal-processing course reduces to integrals of the form sin(ax)e^(bx) dx. There is no single formula for that family, but there is a reliable technique — integration by parts applied twice, which returns you to the original integral and lets you solve for it algebraically. That trick (the circular parts loop) appears in half the end-semester questions on any engineering campus.`,
        concept: `The indefinite integral is the reverse of differentiation; the definite integral computes signed area. The Fundamental Theorem of Calculus links them: if F prime = f, then integral from a to b of f = F(b) - F(a).

**Technique selection — learn this table:**

| Integrand shape | Technique |
| --- | --- |
| Contains f(g(x)) g'(x) | Substitution u = g(x) |
| Product of polynomial x exp/trig/poly | Integration by parts |
| Proper rational function | Partial fractions |
| Contains sqrt(a^2 - x^2) | Trig sub x = a sin theta |
| Contains sqrt(a^2 + x^2) | Trig sub x = a tan theta |
| Reduces by power reduction | Trig identity first |

**Integration by parts:** integral u dv = uv - integral v du. Choose u by the LIATE order: Logarithmic, Inverse trig, Algebraic, Trigonometric, Exponential. Whichever family is higher in LIATE becomes u.

**Partial fractions** require a proper rational function (degree numerator < degree denominator). If improper, divide first. For distinct linear factors: (px+q)/((x-a)(x-b)) = A/(x-a) + B/(x-b).`,
        extras: [
          tip(
            'Always try substitution before parts',
            'If the integrand contains a inner function whose derivative is also present (up to a constant), substitution wins and is faster. Parts on such integrands is wasted effort.',
          ),
          warn(
            'Circuits in by-parts',
            'For integral e^x sin x dx, apply parts twice. The original integral reappears on the right; solve algebraically for it. Never loop forever — set up an equation.',
          ),
        ],
        worked: {
          title: 'Circular integration by parts',
          problem: `Evaluate integral of e^x sin x dx.`,
          steps: [
            {
              title: 'First by-parts',
              desc: 'Let u = sin x, dv = e^x dx. Then du = cos x dx, v = e^x. Result: e^x sin x - integral e^x cos x dx.',
              code_snippet: 'I = e^x sin x - integral e^x cos x dx',
            },
            {
              title: 'Second by-parts on the remaining integral',
              desc: 'Let u = cos x, dv = e^x dx. Then du = -sin x dx, v = e^x. The remaining integral becomes e^x cos x + integral e^x sin x dx = e^x cos x + I.',
              code_snippet: 'integral e^x cos x dx = e^x cos x + I',
            },
            {
              title: 'Solve for I algebraically',
              desc: 'Substitute back: I = e^x sin x - (e^x cos x + I), so 2I = e^x (sin x - cos x), hence I = e^x (sin x - cos x)/2 + C.',
              code_snippet: 'I = e^x (sin x - cos x) / 2 + C',
            },
          ],
          solution:
            'integral e^x sin x dx = e^x (sin x - cos x)/2 + C. The circular trick: after two parts the original integral reappears; solve the linear equation rather than continuing to integrate.',
        },
        practice: {
          title: 'Integrate these',
          prompt: `1. integral x e^x dx (by parts)
2. integral x cos x dx (by parts)
3. integral 1/(x^2 - 4) dx (partial fractions)
4. integral sin^2 x dx (power reduction)`,
          hint: '1: x e^x - e^x + C. 2: x sin x + cos x + C. 3: (1/4) ln |(x-2)/(x+2)| + C. 4: x/2 - sin(2x)/4 + C.',
        },
        mistakes: [
          {
            mistake: 'Choosing the wrong u in by-parts',
            fix: 'Follow LIATE. For x e^x: algebraic (x) beats exponential, so u = x. For x sin x: algebraic beats trig, so u = x.',
          },
          {
            mistake: 'Applying partial fractions to an improper rational function',
            fix: 'If degree numerator >= degree denominator, divide first. Otherwise the decomposition is invalid.',
          },
          {
            mistake: 'Forgetting the constant of integration on indefinite integrals',
            fix: 'Every indefinite integral needs + C. Omitting it costs marks even when the antiderivative is correct.',
          },
        ],
        exam: {
          question: 'Evaluate integral of ln x dx.',
          answer:
            'By parts with u = ln x, dv = dx: x ln x - integral x (1/x) dx = x ln x - x + C.',
          source: 'Common end-semester 1-mark warmup that becomes a 6-mark multi-part',
        },
        summary: [
          'FTC: integral a to b f = F(b) - F(a) when F prime = f.',
          'Technique table: substitution, parts, partial fractions, trig sub.',
          'By-parts u chosen by LIATE; circular cases solved algebraically after two parts.',
          'Partial fractions need a proper rational function; divide if improper.',
        ],
      }),
      [
        [
          'In integration by parts, LIATE stands for:',
          ['Linear, Inverse, Algebraic, Trig, Exp', 'Log, Inverse trig, Algebraic, Trig, Exp', 'Log, Integer, Alg, Trig, Exp', 'Limit, Inverse, Alg, Trig, Exp'],
          1,
          'LIATE ranks which factor becomes u: Logarithmic, Inverse trig, Algebraic, Trigonometric, Exponential.',
        ],
        [
          'integral x e^x dx equals:',
          ['x e^x + C', 'x e^x - e^x + C', 'e^x + C', 'x^2 e^x / 2 + C'],
          1,
          'By parts: u = x, dv = e^x dx gives x e^x - integral e^x dx = x e^x - e^x + C.',
        ],
        [
          'For partial fractions, the rational function must be:',
          ['Proper (degree num < degree den)', 'Improper', 'A polynomial', 'Irreducible'],
          0,
          'Proper means degree numerator is strictly less than degree denominator. Otherwise divide first.',
        ],
      ]
    ),
    lesson(
      M3,
      'em-3-2',
      2,
      'Area, volume and improper integrals',
      'Apply definite integrals to plane area, solid volume, and integrals with infinite limits.',
      14,
      nineBlocks({
        objectives: [
          'Compute the area between two curves by integrating the difference with correct limits',
          'Find the volume of a solid of revolution using the disk and shell methods',
          'Evaluate a Type-1 improper integral as a limit and decide convergence',
          'Recognise the standard convergent integral of 1/x^p on [1, infinity)',
        ],
        hook: `The capacitor discharge curve never truly reaches zero, yet the total energy delivered is finite. That paradox is an improper integral: the area under an infinite tail can still be a convergent number. Electrical, civil and mechanical engineers all meet this in first-year labs; this lesson makes the computation routine.`,
        concept: `**Area between curves:** if f(x) >= g(x) on [a,b], area = integral from a to b of (f - g) dx. When curves cross, split at intersection points and take absolute value of each piece.

**Volumes of revolution:**
- **Disk method** (rotate around x-axis): V = pi integral f(x)^2 dx.
- **Washer method** (gap between curves): V = pi integral (R^2 - r^2) dx, R outer, r inner.
- **Shell method** (rotate around y-axis, integrate in x): V = 2 pi integral x f(x) dx.

**Improper integrals** have an infinite limit or an unbounded integrand. Evaluate as a limit:

integral from a to infinity of f(x) dx = lim(b->infinity) integral from a to b of f(x) dx.

If the limit is finite, the integral converges; otherwise it diverges.

**p-test on [1, infinity):** integral 1/x^p converges iff p > 1.`,
        extras: [
          table('Convergence quick reference', ['Integral', 'Converges when'], [
            ['integral_1^inf 1/x^p dx', 'p > 1'],
            ['integral_0^1 1/x^p dx', 'p < 1'],
            ['integral_0^inf e^(-ax) dx (a>0)', 'always (value 1/a)'],
            ['integral_0^1 ln x dx', 'yes (value -1)'],
          ]),
        ],
        worked: {
          title: 'Area between a parabola and a line',
          problem: `Find the area enclosed by y = x^2 and y = x.`,
          steps: [
            {
              title: 'Find intersection points',
              desc: 'Set x^2 = x: x(x-1) = 0, so x = 0 and x = 1. On [0,1], x >= x^2.',
              code_snippet: 'x = 0 and x = 1',
            },
            {
              title: 'Set up the integral',
              desc: 'Upper curve y = x, lower y = x^2. Area = integral from 0 to 1 of (x - x^2) dx.',
              code_snippet: 'A = int_0^1 (x - x^2) dx',
            },
            {
              title: 'Evaluate',
              desc: 'Antiderivative x^2/2 - x^3/3. At 1: 1/2 - 1/3 = 1/6. At 0: 0. Area = 1/6.',
              code_snippet: '[x^2/2 - x^3/3]_0^1 = 1/6',
            },
          ],
          solution:
            'Area = 1/6 square units. Always find intersections first to get correct limits, and check which curve is on top between them.',
        },
        practice: {
          title: 'Compute these',
          prompt: `1. Area between y = 4 - x^2 and y = x + 2.
2. Volume when y = sqrt(x) from x=0 to x=4 is rotated about the x-axis.
3. Does integral_1^inf 1/x^2 dx converge? Evaluate it.`,
          hint: '1: intersect at x=-2 and x=1; area = integral (-2 to 1) of (4-x^2 - (x+2)) dx = 9/2. 2: V = pi int_0^4 x dx = 8pi. 3: yes; lim b->inf [-1/x]_1^b = 1.',
        },
        mistakes: [
          {
            mistake: 'Integrating the absolute difference without splitting at crossings',
            fix: 'If f and g cross inside the interval, split the integral at each crossing and integrate upper-minus-lower on each subinterval.',
          },
          {
            mistake: 'Treating an improper integral as a normal definite integral',
            fix: 'Write the limit explicitly. Substituting infinity directly is not a valid step and earns zero method marks.',
          },
          {
            mistake: 'Mixing disk and shell methods',
            fix: 'Disk/washer integrates along the axis of rotation; shell integrates perpendicular and multiplies by 2 pi radius. Draw which radius you are using.',
          },
        ],
        exam: {
          question: 'Evaluate integral_0^1 ln x dx as an improper integral.',
          answer:
            'Unbounded at 0: lim(a->0+) integral_a^1 ln x dx = lim(a->0+) [x ln x - x]_a^1. At 1: -1. At a: a ln a - a -> 0. Result: -1.',
          source: 'AKTU 2022',
        },
        summary: [
          'Area = integral (upper - lower) with limits at intersections; split at crossings.',
          'Disk/washer for rotation about x-axis; shell for y-axis when integrating in x.',
          'Improper integrals: rewrite as a limit; finite limit means convergent.',
          'p-test: integral_1^inf 1/x^p converges iff p > 1.',
        ],
      }),
      [
        [
          'integral_1^inf 1/x^p dx converges for:',
          ['p > 1', 'p < 1', 'all p > 0', 'no p'],
          0,
          'The p-test: convergent exactly when the exponent exceeds 1.',
        ],
        [
          'Volume of revolution of y = sqrt(x) from 0 to 4 about the x-axis is:',
          ['4pi', '8pi', '16pi', '2pi'],
          1,
          'V = pi int_0^4 (sqrt(x))^2 dx = pi int_0^4 x dx = pi * 8 = 8pi.',
        ],
        [
          'Area between y=x and y=x^2 on [0,1] is:',
          ['1/2', '1/3', '1/6', '1/4'],
          2,
          'int_0^1 (x - x^2) dx = 1/2 - 1/3 = 1/6.',
        ],
      ]
    ),
  ],
};
