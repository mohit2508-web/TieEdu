// Module 1 — Limits, Continuity & Series Expansions
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, info } from '../nineBlocks';
import { lesson, M1, COURSE_ID } from './helpers';

export const module1: CourseModule = {
  id: M1,
  course_id: COURSE_ID,
  title: 'Module 1 — Limits, Continuity & Series Expansions',
  summary: 'What a limit means, when L Hospital applies, and how to expand any smooth function.',
  sort_order: 1,
  lessons: [
    lesson(
      M1,
      'em-1-1',
      1,
      'Limits, continuity and L Hospital rule',
      'Read a limit from three sides, spot discontinuities, and resolve 0/0 forms.',
      16,
      nineBlocks({
        objectives: [
          'Evaluate left-hand and right-hand limits and decide when a two-sided limit exists',
          'Classify removable, jump and infinite discontinuities from a formula',
          'Apply L Hospital rule only after verifying the form is 0/0 or infinity/infinity',
          'Combine limit laws (sum, product, squeeze) without guessing',
        ],
        hook: `An examiner writes lim(x->0) sin(x)/x on the board and asks for the answer without a calculator. The ones who understand that the ratio of two quantities going to zero at the same rate approaches the ratio of their instantaneous speeds write 1 in five seconds. That speed difference is what this lesson builds.`,
        concept: `A limit answers one question: what value does f(x) approach as x approaches a, even if f(a) itself is undefined.

**Two-sided limit exists iff:**
1. Left-hand limit lim(x->a-) f(x) exists.
2. Right-hand limit lim(x->a+) f(x) exists.
3. They are equal.

**Continuity at a:** the limit exists AND equals f(a).

| Discontinuity type | Behaviour | Example |
| --- | --- | --- |
| Removable | Limit exists, f(a) differs or undefined | (x^2-1)/(x-1) at x=1 |
| Jump | Left and right limits finite but unequal | Sign function at 0 |
| Infinite | One or both sides shoot to infinity | 1/x at x=0 |

**L Hospital rule:** for form 0/0 or infinity/infinity, lim f/g = lim f'/g', provided the new limit exists. It does NOT apply to 0 x infinity or infinity - infinity without rewriting first.`,
        extras: [
          tip(
            'Verify the form before differentiating',
            'Substitute the value mentally first. If the result is not 0/0 or infinity/infinity, L Hospital is the wrong tool and an examiner will award zero.'
          ),
          table('The five indeterminate forms', ['Form', 'How to handle'], [
            ['0/0', 'L Hospital directly'],
            ['infinity/infinity', 'L Hospital directly'],
            ['0 x infinity', 'Rewrite one factor as 1 over something, then get 0/0'],
            ['infinity - infinity', 'Combine into a single fraction, then get 0/0'],
            ['1^infinity, 0^0, infinity^0', 'Take log, resolve the log limit, then exponentiate'],
          ]),
        ],
        worked: {
          title: 'Resolve a mixed indeterminate form',
          problem: `Evaluate lim(x->0) (1 - cos x) / x^2. Show every step.`,
          steps: [
            {
              title: 'Check the form',
              desc: 'Substitute x = 0: numerator 1 - 1 = 0, denominator 0. Form is 0/0, so L Hospital is legal.',
              code_snippet: '(1 - cos 0) / 0^2 = 0 / 0',
            },
            {
              title: 'Apply L Hospital once',
              desc: 'Differentiate: sin x over 2x. Substitute again: still 0/0.',
              code_snippet: 'sin x / 2x   ->   0/0 again',
            },
            {
              title: 'Apply L Hospital a second time',
              desc: 'Differentiate again: cos x over 2. Substitute: cos 0 / 2 = 1/2.',
              code_snippet: 'cos x / 2   ->   1/2',
            },
          ],
          solution:
            'The limit is 1/2. One application of L Hospital is not always enough. Re-check the form after differentiating; if still indeterminate, apply again.',
        },
        practice: {
          title: 'Evaluate these yourself',
          prompt: `1. lim(x->0) sin(3x) / x
2. lim(x->0) (e^x - 1) / x
3. lim(x->2) (x^2 - 4) / (x - 2)
4. lim(x->infinity) (3x^2 + x) / (x^2 - 5)`,
          hint: '1 and 2 are 0/0: L Hospital once each. 3 factors. 4: compare highest powers, answer 3.',
        },
        mistakes: [
          {
            mistake: 'Applying L Hospital to a non-indeterminate form',
            fix: 'lim(x->1) x^2 = 1 by direct substitution. Differentiating gives 2x = 2, wrong. Always substitute first.',
          },
          {
            mistake: 'Forgetting to re-check the form after differentiating',
            fix: 'After each L Hospital application, substitute again. If no longer 0/0 or infinity/infinity, stop.',
          },
          {
            mistake: 'Confusing continuity with differentiability',
            fix: 'Differentiable implies continuous; |x| is continuous at 0 yet not differentiable there.',
          },
        ],
        exam: {
          question: 'Show lim(x->0) (tan x - x) / x^3 = 1/3.',
          answer:
            'Form 0/0. Differentiate: (sec^2 x - 1) / 3x^2 = tan^2 x / 3x^2. Still 0/0: differentiate again or use tan x ~ x near 0 to get x^2/(3x^2) = 1/3.',
          source: 'Standard AKTU sessional',
        },
        summary: [
          'Two-sided limit exists iff left limit = right limit, both finite.',
          'Continuity = limit exists AND equals f(a).',
          'L Hospital: only 0/0 or infinity/infinity; re-check form after each application.',
          'Differentiability implies continuity; the converse is false (|x| at 0).',
        ],
      }),
      [
        [
          'When does a two-sided limit exist?',
          ['Always if defined', 'When left and right limits are equal and finite', 'Only when continuous', 'When derivative exists'],
          1,
          'Both one-sided limits must exist and agree.',
        ],
        [
          'Which form allows direct L Hospital?',
          ['0 x infinity', 'infinity - infinity', '0/0', '1^infinity'],
          2,
          'Directly only 0/0 and infinity/infinity; others need rewriting first.',
        ],
        [
          'f(x) = |x| at x = 0 is:',
          ['Differentiable not continuous', 'Continuous not differentiable', 'Neither', 'Both'],
          1,
          'No break (continuous) but left derivative -1, right +1: no unique tangent.',
        ],
      ]
    ),
    lesson(
      M1,
      'em-1-2',
      2,
      'Maclaurin and Taylor series',
      'Expand any smooth function around a point; use standard expansions as exam shortcuts.',
      15,
      nineBlocks({
        objectives: [
          'Write the Maclaurin series of a function from its derivatives at zero',
          'State the standard expansions of e^x, sin x, cos x and 1/(1-x) from memory',
          'Use substitution to expand composite functions such as e^(2x) or sin(x^2)',
          'Estimate a function value with a truncated series',
        ],
        hook: `The series e^x = 1 + x + x^2/2! + ... is how a computer computes the exponential. There is no magic exponentiation circuit; there is a loop adding terms until the change falls below a threshold. The same expansion turns many 0/0 limits into two-line subtractions.`,
        concept: `A Taylor series rewrites a smooth function as an infinite polynomial centred at a. The Maclaurin series is centred at zero:

f(x) = f(0) + f'(0)x + f''(0)x^2/2! + f'''(0)x^3/3! + ...

**Memorise these four:**

| Function | Maclaurin series | Valid for |
| --- | --- | --- |
| e^x | sum x^n / n! | all x |
| sin x | x - x^3/3! + x^5/5! - ... | all x |
| cos x | 1 - x^2/2! + x^4/4! - ... | all x |
| 1/(1-x) | 1 + x + x^2 + x^3 + ... | abs(x) < 1 |

Substitution is the common technique: expand e^(2x) by replacing x with 2x in the standard series. Always check the validity interval after substitution.`,
        extras: [
          info(
            'Why factorials appear',
            'The n-th derivative of e^x is still e^x, so f^(n)(0) = 1 for every n. Dividing by n! keeps each term finite.'
          ),
        ],
        worked: {
          title: 'Expand a quotient using a standard series',
          problem: `Find the Maclaurin series of f(x) = (e^x - 1) / x up to x^2.`,
          steps: [
            {
              title: 'Expand the numerator',
              desc: 'e^x = 1 + x + x^2/2 + higher. Subtract 1: e^x - 1 = x + x^2/2 + x^3/6 + ...',
              code_snippet: 'e^x - 1 = x + x^2/2 + O(x^3)',
            },
            {
              title: 'Divide each term by x',
              desc: 'Every power drops by one: x/x = 1, x^2/2x = x/2, x^3/6x = x^2/6.',
              code_snippet: '(e^x - 1)/x = 1 + x/2 + x^2/6 + O(x^3)',
            },
            {
              title: 'Read off the answer',
              desc: 'Series is 1 + x/2 + x^2/6 + ... so coefficient of x^2 is 1/6.',
            },
          ],
          solution:
            'f(x) = 1 + x/2 + x^2/6 + O(x^3). Technique: expand with a known series, then multiply/divide term by term.',
        },
        practice: {
          title: 'Expand these yourself',
          prompt: `1. sin(x^2) up to x^6.
2. cos(2x) up to x^4.
3. Use 1/(1+x) series to evaluate sum of (-1)^n / 3^n.`,
          hint: '1: x^2 - x^6/6 + ... 2: 1 - 2x^2 + 2x^4/3. 3: sum = 1/(1+1/3) = 3/4.',
        },
        mistakes: [
          {
            mistake: 'Forgetting the factorial in the denominator',
            fix: 'Every term x^n needs n!. Tattoo: power over factorial.',
          },
          {
            mistake: 'Using the series outside its interval of convergence',
            fix: '1/(1-x) is only valid for abs(x) < 1. Substituting x = 2 diverges.',
          },
          {
            mistake: 'Dropping the O(...) notation too early',
            fix: 'Write O(x^n) after every truncated series. Never equate approximation with identity.',
          },
        ],
        exam: {
          question: 'Find lim(x->0) (x - sin x) / x^3 using series.',
          answer:
            'sin x = x - x^3/6 + O(x^5), so x - sin x = x^3/6 - O(x^5). Dividing by x^3 gives 1/6.',
          source: 'VTU previous year',
        },
        summary: [
          'Maclaurin = Taylor centred at 0: sum f^(n)(0) x^n / n!.',
          'Memorise e^x, sin x, cos x, 1/(1-x) expansions.',
          'Substitute to expand composites; re-check the interval.',
          'Truncated series carry O(x^n); never treat approximation as equality.',
        ],
      }),
      [
        [
          'Coefficient of x^3 in Maclaurin of e^x is:',
          ['1', '1/3', '1/6', '1/2'],
          2,
          'General term x^n/n!, so for n=3 coefficient is 1/3! = 1/6.',
        ],
        [
          'For which x is 1 + x + x^2 + ... = 1/(1-x)?',
          ['All real x', 'abs(x) < 1', 'abs(x) <= 1', 'x > 0'],
          1,
          'Geometric series converges only for absolute ratio less than 1.',
        ],
        [
          'lim(x->0) (e^x - 1 - x) / x^2 equals:',
          ['0', '1/2', '1', 'Diverges'],
          1,
          'e^x - 1 - x = x^2/2 + O(x^3); dividing by x^2 leaves 1/2.',
        ],
      ]
    ),
  ],
};
