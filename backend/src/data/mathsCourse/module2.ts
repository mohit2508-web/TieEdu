// Module 2 — Applications of Derivatives
import type { CourseModule } from '../db';
import { nineBlocks, table, tip } from '../nineBlocks';
import { lesson, M2, COURSE_ID } from './helpers';

export const module2: CourseModule = {
  id: M2,
  course_id: COURSE_ID,
  title: 'Module 2 — Applications of Derivatives',
  summary: 'Optimisation, mean value theorems, and curve sketching.',
  sort_order: 2,
  lessons: [
    lesson(
      M2,
      'em-2-1',
      1,
      'Maxima, minima and optimisation',
      'Turn a word problem into a derivative test; classify critical points without a graph.',
      16,
      nineBlocks({
        objectives: [
          'Find critical points by solving f prime(x) = 0 or locating non-differentiable points',
          'Classify critical points using first and second derivative tests',
          'Formulate an engineering optimisation problem as a single-variable extremum',
          'State and apply the Mean Value Theorem with correct hypotheses',
        ],
        hook: `A beam of given perimeter must enclose the maximum rectangular cross-section. The calculus answer is a square, and every structural design handbook says the same, because the optimisation is identical. Exams love these problems because they reward setting up the function correctly.`,
        concept: `A **critical point** of f is any c where f'(c) = 0 or f' does not exist. Every local extremum of a differentiable function occurs at a critical point, but not every critical point is an extremum (x^3 at 0).

**First derivative test:** look at the sign of f' immediately left and right of c.

| Left of c | Right of c | Conclusion |
| --- | --- | --- |
| + | - | Local maximum |
| - | + | Local minimum |
| + | + or - | Neither |

**Second derivative test:** f'(c)=0 and f''(c)<0: local max; f''(c)>0: local min; f''(c)=0: inconclusive.

**Mean Value Theorem:** if f is continuous on [a,b] and differentiable on (a,b), there exists c in (a,b) with f'(c) = (f(b)-f(a))/(b-a). Rolle theorem is the special case f(a)=f(b), giving f'(c)=0.`,
        extras: [
          tip(
            'Word problems: the objective function comes first',
            'Express the quantity to maximise in one variable using the constraint. Differentiate only after substitution.'
          ),
        ],
        worked: {
          title: 'Optimise an open box from a square sheet',
          problem: `A 20 cm square sheet has equal squares cut from each corner; flaps fold into an open box. Find the cut size that maximises volume.`,
          steps: [
            {
              title: 'Define variable and objective',
              desc: 'Let x be the cut side. Base (20-2x) by (20-2x), height x. V(x) = x(20-2x)^2, 0 < x < 10.',
              code_snippet: 'V(x) = x(20 - 2x)^2',
            },
            {
              title: 'Differentiate',
              desc: 'Product rule: V prime = (20-2x)(20-6x).',
              code_snippet: "V'(x) = (20-2x)(20-6x)",
            },
            {
              title: 'Solve V prime = 0',
              desc: 'x = 10 (rejected: zero volume) or x = 10/3 cm. Endpoints V(0)=V(10)=0, so interior point is the max.',
              code_snippet: 'x = 10/3 cm approx 3.33 cm',
            },
            {
              title: 'Verify with second derivative',
              desc: 'V double-prime = 8x - 160. At x = 10/3: negative, confirming local maximum.',
            },
          ],
          solution:
            'Cut size x = 10/3 cm maximises volume. Maximum volume = (10/3)(40/3)^2 = 16000/27 approx 592.6 cm^3.',
        },
        practice: {
          title: 'Solve these optimisation problems',
          prompt: `1. Two positive numbers, product 200, sum minimum?
2. 100 m fencing, rectangular plot against a river (no fence on river side). Maximise area.
3. Verify MVT for f(x) = x^2 on [1, 4].`,
          hint: '1: a = b = 10*sqrt(2). 2: width 25 m, length 50 m, area 1250 m^2. 3: c = 2.5.',
        },
        mistakes: [
          {
            mistake: 'Stopping after critical points without classifying',
            fix: 'x^3 has critical point at 0 that is neither max nor min. Always run the derivative test.',
          },
          {
            mistake: 'Forgetting endpoint checks on closed intervals',
            fix: 'Global extrema on [a,b] occur at critical points OR endpoints. Evaluate f at all candidates.',
          },
          {
            mistake: 'Mis-stating MVT hypotheses',
            fix: 'Continuity on closed interval and differentiability on open interval are both required.',
          },
        ],
        exam: {
          question: 'Cylinder volume 500 cm^3, minimum surface area. Find radius.',
          answer:
            'h = 500/(pi r^2). S = 2 pi r^2 + 1000/r. S prime = 4 pi r - 1000/r^2 = 0 gives r^3 = 250/pi, r = cuberoot(250/pi) approx 4.3 cm.',
          source: 'Standard end-semester',
        },
        summary: [
          'Critical points: f prime = 0 or undefined; not all are extrema.',
          'First derivative test (sign change) always valid; second fails at f double-prime = 0.',
          'Closed-interval global extrema: compare critical points AND endpoints.',
          'MVT needs continuity on [a,b] plus differentiability on (a,b).',
        ],
      }),
      [
        [
          'f(x) = x^3 has critical point at 0. What is it?',
          ['Local max', 'Local min', 'Neither (inflection)', 'Undefined'],
          2,
          "f'(0)=0 but no sign change: inflection point, not extremum.",
        ],
        [
          'MVT for f(x)=x^2 on [1,4] guarantees f prime(c) equals:',
          ['2', '5', '15', '3'],
          1,
          '(16-1)/(4-1) = 5. Solve 2c = 5: c = 2.5.',
        ],
        [
          'Fixed perimeter, maximum rectangle area shape is:',
          ['Square', 'Circle', 'Any (area constant)', 'Golden rectangle'],
          0,
          'AM-GM or calculus: a = b = P/4 gives square.',
        ],
      ]
    ),
    lesson(
      M2,
      'em-2-2',
      2,
      'Curve sketching and asymptotes',
      'Combine first and second derivatives into a complete qualitative picture of a graph.',
      14,
      nineBlocks({
        objectives: [
          'Determine intervals of increase, decrease, concavity and inflection',
          'Find vertical, horizontal and oblique asymptotes from limits',
          'Sketch a rational or polynomial using the five-step checklist',
          'Identify even/odd symmetry that halves the sketching work',
        ],
        hook: `Before any CAD software draws a linkage trajectory, it evaluates the function at a grid of points. Curve tracing is the analytic version: understand where the graph rises, bends, or escapes to infinity, and a rough sketch becomes a reliable engineering diagram.`,
        concept: `Curve tracing is a checklist, not an art. Run these five steps in order:

1. **Domain and symmetry.** Even (f(-x)=f(x), y-axis symmetric) or odd (f(-x)=-f(x), 180-degree rotational)? Sketch only the right half and mirror or rotate.
2. **Intercepts.** y-intercept: f(0). x-intercepts: solve f(x)=0.
3. **Asymptotes.**
   - Vertical: lim(x->a) f(x) = +/- infinity at points not in domain.
   - Horizontal: lim(x->+/- infinity) f(x) = L finite.
   - Oblique: lim f(x)/x = m finite nonzero, then b = lim (f(x) - mx).
4. **Critical points and concavity.** Solve f prime = 0 for turns; f double-prime = 0 for possible inflections; test signs in intervals.
5. **Endpoint behaviour.** For open intervals, describe the limit so the sketch knows whether to approach an asymptote.`,
        extras: [
          table('Asymptote quick reference', ['Type', 'How to find', 'Example'], [
            ['Vertical at x=a', 'lim(x->a) f(x) = +/- infinity', '1/(x-2): VA x=2'],
            ['Horizontal y=L', 'lim(x->+/- infinity) f(x) = L', '(2x+1)/x: HA y=2'],
            ['Oblique y=mx+b', 'm = lim f(x)/x, b = lim (f(x)-mx)', '(x^2+1)/x: y=x'],
          ]),
        ],
        worked: {
          title: 'Trace a rational function completely',
          problem: `Sketch f(x) = x^2 / (x - 1). State asymptotes, turning points, inflection points.`,
          steps: [
            {
              title: 'Domain and intercepts',
              desc: 'Domain: all real except 1. y-intercept f(0)=0. x-intercept x=0 (double root: touches axis).',
              code_snippet: 'Domain: R - {1}; intercept (0, 0)',
            },
            {
              title: 'Asymptotes',
              desc: 'VA at x=1 (denominator zero, numerator nonzero). Degree num > den: no HA. Divide: x^2/(x-1) = x + 1 + 1/(x-1), so oblique y = x + 1.',
              code_snippet: 'VA: x = 1;  Oblique: y = x + 1',
            },
            {
              title: 'First derivative',
              desc: "f' = x(x-2)/(x-1)^2. Zero at x=0 and x=2. Sign: + on (-inf,0), - on (0,1), - on (1,2), + on (2,inf).",
              code_snippet: "f'(x) = x(x-2)/(x-1)^2",
            },
            {
              title: 'Classification and concavity',
              desc: 'Max at x=0 (value 0), min at x=2 (value 4). f double-prime = 2/(x-1)^3, never zero; concave down on (-inf,1), up on (1,inf). No inflection.',
            },
          ],
          solution:
            'Graph touches origin, max at 0, falls toward VA x=1 from left; reappears right of VA, min at (2,4), rises along y = x + 1. The division x^2/(x-1) = x + 1 + 1/(x-1) reveals every feature at once.',
        },
        practice: {
          title: 'Trace these on paper',
          prompt: `1. f(x) = 1/(x^2 - 4): asymptotes and intercepts.
2. f(x) = x^3 - 3x: turning points and inflection.
3. f(x) = (2x+3)/(x-1): horizontal or oblique asymptote?`,
          hint: '1: VA x=2, x=-2; HA y=0; y-int -3/4. 2: max at -1 (2), min at 1 (-2); inflection at 0. 3: HA y=2.',
        },
        mistakes: [
          {
            mistake: 'Setting the numerator to zero for asymptotes',
            fix: 'Numerator zeros are x-intercepts. VA comes from denominator zeros after cancelling.',
          },
          {
            mistake: 'Forgetting to cancel common factors',
            fix: '(x^2-1)/(x-1) = x+1 for x!=1: removable discontinuity at 1, not VA.',
          },
          {
            mistake: 'Assuming every critical point is a turn',
            fix: 'x^3 has f prime(0)=0 with no turn. Check for sign change of f prime.',
          },
        ],
        exam: {
          question: 'Find the oblique asymptote of f(x) = (3x^2 + 2x + 1) / (x + 1).',
          answer:
            'Divide: (x+1)(3x-1) + 2. f(x) = 3x - 1 + 2/(x+1). Oblique asymptote y = 3x - 1; VA x = -1.',
          source: 'AKTU 2023',
        },
        summary: [
          'Five-step checklist: domain/symmetry, intercepts, asymptotes, derivatives, endpoints.',
          'VA: denominator zeros after cancelling; HA/oblique: limits at infinity.',
          'Oblique via polynomial division when degree num = degree den + 1.',
          'f double-prime sign gives concavity; zero crossings are inflection candidates.',
        ],
      }),
      [
        [
          'Vertical asymptotes come from:',
          ['Zeros of the numerator', 'Zeros of the denominator after cancelling', 'Critical points', 'Inflection points'],
          1,
          'Denominator zeros (after cancelling common factors) are where the function blows up.',
        ],
        [
          'f(x) = (x^2-1)/(x-1) has at x=1:',
          ['A vertical asymptote', 'A removable discontinuity', 'A local max', 'No special behaviour'],
          1,
          'Factor: (x-1)(x+1)/(x-1) = x+1 for x!=1. Hole at x=1, no asymptote.',
        ],
        [
          'Oblique asymptote exists when degree of numerator is:',
          ['Less than denominator', 'Equal to denominator', 'Exactly one more than denominator', 'Two more'],
          2,
          'Degree num = degree den + 1 gives a linear asymptote found by division.',
        ],
      ]
    ),
  ],
};
