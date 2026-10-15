// ============================================================================
// APTITUDE & REASONING MASTERY — flagship free course (Phase 4 pilot 2).
//
// Every campus OA opens with an aptitude round. This course teaches the
// highest-frequency quant + reasoning patterns from TCS NQT, Infosys, Wipro
// and Capgemini OAs — the shortcuts that replace calculator work.
//
// Four modules, eight lessons. Every lesson follows the 9-block standard via
// nineBlocks() in ../nineBlocks.
// ============================================================================

import type { Course, CourseLesson, CourseModule, ExamQuestion } from '../db';
import { nineBlocks, table, tip, warn, type BlockSpec } from '../nineBlocks';

const lesson = (
  moduleId: string,
  id: string,
  sort: number,
  title: string,
  summaryText: string,
  duration: number,
  blocks: BlockSpec[],
  questions?: [string, string[], number, string][]
): CourseLesson => ({
  id,
  module_id: moduleId,
  title,
  summary: summaryText,
  sort_order: sort,
  duration_minutes: duration,
  xp_reward: 35,
  video: null,
  blocks: blocks.map((spec, i) => ({
    id: `${id}-b${String(i + 1).padStart(2, '0')}`,
    block_type: spec.block_type,
    block_order: i + 1,
    payload: spec.payload,
  })),
  quiz: questions
    ? {
        id: `quiz-${id}`,
        passing_percent: 70,
        questions: questions.map(([prompt, options, correct_index, explanation], i) => ({
          id: `${id}-q${i + 1}`,
          prompt,
          options,
          correct_index,
          explanation,
        })),
      }
    : null,
});

const M1 = 'aq-m1';
const M2 = 'aq-m2';
const M3 = 'aq-m3';
const M4 = 'aq-m4';

const modules: CourseModule[] = [
  // ── Module 1: Number System, HCF/LCM & Percentages ───────────────────────
  {
    id: M1,
    course_id: 'crs-aptitude-reasoning',
    title: 'Module 1 — Number System, HCF/LCM & Percentages',
    summary: 'The arithmetic foundation: divisibility, power cycles, HCF/LCM patterns, percentages and alligation.',
    sort_order: 1,
    lessons: [
      lesson(
        M1,
        'aq-1-1',
        1,
        'Divisibility, remainders and the power cycle',
        'The number-system shortcuts that turn a 90-second calculation into a 10-second one.',
        14,
        nineBlocks({
          objectives: [
            'Apply divisibility rules for 2, 3, 4, 8, 9, 11 without a calculator',
            'Find the unit digit of any a^b using the power-cycle method in under 15 seconds',
            'Compute remainders using modular arithmetic',
          ],
          hook: `TCS NQT first quant question: "What is the unit digit of 7^256?" Sixty thousand students saw this. Most tried to multiply 7 by itself and ran out of time.

There is a four-second method. Every power of every digit repeats its unit digit in a cycle of at most 4. Once you know the cycle, the question is a remainder, not a multiplication.`,
          concept: `## Divisibility rules you must know cold

| Divisor | Rule | Example |
| --- | --- | --- |
| 2 | Last digit even | 348 yes |
| 3 | Sum of digits divisible by 3 | 471: 4+7+1=12 yes |
| 4 | Last two digits divisible by 4 | 1316: 16 yes |
| 8 | Last three digits divisible by 8 | 10576: 576 yes |
| 9 | Sum of digits divisible by 9 | 6354: 18 yes |
| 11 | Alternating sum divisible by 11 | 9182: (9+8)-(1+2)=14 no |

## The power cycle (unit digit)

The unit digit of a^b depends only on the unit digit of a, and it cycles with period 1, 2 or 4:

| Base unit | Cycle | Period |
| --- | --- | --- |
| 0, 1, 5, 6 | itself | 1 |
| 4, 9 | 4 then 6, 9 then 1 | 2 |
| 2, 3, 7, 8 | period 4 | 4 |

To find the unit digit of a^b: take b mod (cycle period). If the result is 0, use the last element of the cycle. For very large exponents, reduce b mod 4 first (for period-4 cycles).

## Modular arithmetic essentials

- (a + b) mod d = ((a mod d) + (b mod d)) mod d
- (a x b) mod d = ((a mod d) x (b mod d)) mod d

These let you reduce any huge number to a one-digit calculation before you touch it.`,
          extras: [
            table(
              'Worked power-cycle examples',
              ['Expression', 'Cycle position', 'Unit digit'],
              [
                ['7^256', '256 mod 4 = 0, last in 7-9-3-1', '1'],
                ['3^47', '47 mod 4 = 3, third in 3-9-7-1', '7'],
                ['9^123', 'odd power of 9', '9'],
                ['4^99', 'odd power of 4', '4'],
              ]
            ),
            tip(
              'Always reduce the exponent mod 4 first',
              'For any base ending in 2, 3, 7 or 8, compute (exponent mod 4) before anything else. If it is 0, the answer is the last element of the cycle. This single habit removes most of the time pressure.'
            ),
          ],
          worked: {
            title: 'Finding a remainder without a calculator',
            problem: `Find the unit digit of 7^256. Then find 7^257 mod 5.`,
            steps: [
              {
                title: 'Step 1 - identify the cycle',
                desc: 'Powers of 7 cycle as 7, 9, 3, 1 with period 4.',
              },
              {
                title: 'Step 2 - reduce the exponent',
                desc: '256 / 4 = 64 exactly, so 256 mod 4 = 0. A remainder of 0 means the last element of the cycle.',
                code_snippet: '256 mod 4 = 0  ->  use 4th element of (7,9,3,1)',
              },
              {
                title: 'Step 3 - read off the answer',
                desc: 'The 4th element is 1. So 7^256 ends in 1.',
              },
              {
                title: 'Step 4 - the second part: mod 5',
                desc: '7 mod 5 = 2. So 7^257 mod 5 = 2^257 mod 5. Powers of 2 mod 5 cycle 2,4,3,1 with period 4. 257 mod 4 = 1, so the answer is 2.',
              },
            ],
            solution: `Unit digit of 7^256 = 1.
7^257 mod 5 = 2.

Notice the second part did not need the unit digit at all - reducing the base mod 5 first is faster when the modulus is 5.`,
          },
          practice: {
            title: 'Five unit-digit drills',
            prompt: `Find the unit digit of each, then check with the cycle:

1. 3^47
2. 8^2025
3. 4^99
4. 9^50
5. 2^303

Write down the cycle, reduce the exponent mod the period, then read the answer. Time yourself - each should take under 15 seconds.`,
            hint: 'For 8^2025: cycle of 8 is 8-4-2-6 (period 4). 2025 mod 4 = 1, so the answer is the 1st element: 8.',
          },
          mistakes: [
            {
              mistake: 'Multiplying out the power instead of using the cycle',
              fix: 'Never compute 7^256. Reduce the exponent mod 4 and read the cycle. The cycle exists precisely so you never multiply.',
            },
            {
              mistake: 'Using the digit-sum rule for every divisor',
              fix: 'Digit sum works for divisibility by 3 and 9 only. For 7, 11, 13 you need the direct rule or modular arithmetic.',
            },
            {
              mistake: 'Forgetting that remainder 0 means the last cycle element',
              fix: 'If exponent mod period = 0, the answer is the LAST element of the cycle, not the first. 256 mod 4 = 0, use 1 not 7.',
            },
          ],
          exam: {
            question: 'What is the unit digit of 7^256?',
            answer: '1. The unit digits of powers of 7 cycle as 7, 9, 3, 1 with period 4. Since 256 is divisible by 4, the unit digit is the last element of the cycle: 1.',
            source: 'TCS NQT / Infosys OA style',
          },
          summary: [
            'Divisibility: 3 and 9 use digit sum; 4 and 8 use last 2/3 digits; 11 uses alternating sum.',
            'Unit digit of a^b: find the cycle of a (period 1, 2 or 4), reduce b mod the period.',
            'Remainder 0 from the reduction means the LAST element of the cycle.',
            'Always reduce the exponent first - it is the fastest single step.',
          ],
        }),
        [
          [
            'What is the unit digit of 3^47?',
            ['3', '7', '9', '1'],
            1,
            'Cycle of 3 is 3-9-7-1 (period 4). 47 mod 4 = 3, so the 3rd element: 7.',
          ],
          [
            'Which divisibility rule uses the alternating sum of digits?',
            ['Divisibility by 9', 'Divisibility by 11', 'Divisibility by 7', 'Divisibility by 4'],
            1,
            'For 11: (sum of odd-position digits - sum of even-position digits) must be 0 or divisible by 11.',
          ],
          [
            'What is the unit digit of 7^256?',
            ['7', '9', '3', '1'],
            3,
            'Unit digit 1 means remainder 1 when divided by 10.',
          ],
        ]
      ),
      lesson(
        M1,
        'aq-1-2',
        2,
        'HCF, LCM and the same-remainder pattern',
        'The pattern recognition that separates a 90th-percentile OA score from a 50th: when a question says "greatest number that divides", it is asking for HCF.',
        13,
        nineBlocks({
          objectives: [
            'Decide in one read whether a problem is asking for HCF or LCM',
            'Solve the classic "greatest divisor" and "smallest multiple" OA patterns',
            'Apply the same-remainder HCF-of-differences technique',
          ],
          hook: `Infosys OA: "Find the greatest number that will divide 43, 91 and 183 so as to leave the same remainder in each case."

Students who read "greatest number" and reach for LCM lose three minutes. Students who know the pattern solve it in fifteen seconds: take pairwise differences, then HCF of those differences.

The entire question is a test of whether you recognise the pattern, not whether you can compute an HCF.`,
          concept: `## HCF and LCM in one sentence each

- HCF (Highest Common Factor) - the largest number that divides every number in the set. Also called GCD.
- LCM (Lowest Common Multiple) - the smallest positive number that is a multiple of every number in the set.

The identity that ties them (for two numbers only):

HCF(a, b) x LCM(a, b) = a x b

This holds for two numbers only. For three or more, the identity does NOT hold - a common exam trap.

## Euclid's algorithm (fast HCF)

Repeatedly replace the larger number by the remainder of dividing it by the smaller, until the remainder is 0. The last non-zero remainder is the HCF.

HCF(48, 18):
48 = 2x18 + 12
18 = 1x12 + 6
12 = 2x6  + 0
-> HCF = 6

## The "same remainder" pattern

If a number d leaves the same remainder r when dividing a, b, c - then d must divide (a-b), (b-c) and (a-c). So:

d = HCF(a-b, b-c, a-c)

This is one of the most frequently asked patterns in Indian campus OAs.

## "Greatest number that divides" vs "smallest number that is a multiple of"

- "Greatest number that divides X, Y, Z" -> HCF
- "Smallest number that is a multiple of X, Y, Z" -> LCM
- "Greatest number that divides ... leaving the same remainder" -> HCF of pairwise differences
- "Smallest number that when divided by X, Y, Z leaves remainder r" -> LCM(X,Y,Z) - r`,
          extras: [
            table(
              'Pattern recognition cheat-sheet',
              ['Question phrasing', 'Operation'],
              [
                ['Greatest number that divides', 'HCF'],
                ['Smallest number that is a multiple of', 'LCM'],
                ['Leaves the same remainder', 'HCF of pairwise differences'],
                ['Leaves remainder r when divided by each', 'LCM - r'],
              ]
            ),
            tip(
              'Always reduce to coprime before multiplying for LCM',
              'LCM(12, 18): factor out the common 6 first -> LCM = 6 x 2 x 3 = 36. Computing LCM as (a x b)/HCF is fine for two numbers but the factor-out method is faster mentally.'
            ),
          ],
          worked: {
            title: 'The "same remainder" question, solved',
            problem: `Find the greatest number that will divide 43, 91 and 183 so as to leave the same remainder in each case.`,
            steps: [
              {
                title: 'Step 1 - take pairwise differences',
                desc: '91 - 43 = 48; 183 - 91 = 92; 183 - 43 = 140.',
                code_snippet: '91-43 = 48\n183-91 = 92\n183-43 = 140',
              },
              {
                title: 'Step 2 - HCF of the differences',
                desc: 'HCF(48, 92, 140). HCF(48, 92) = 4. HCF(4, 140) = 4.',
              },
              {
                title: 'Step 3 - verify the remainder',
                desc: '43 / 4 = 10 r 3; 91 / 4 = 22 r 3; 183 / 4 = 45 r 3. All leave remainder 3. Correct.',
              },
              {
                title: 'Step 4 - state the answer',
                desc: 'The greatest such number is 4.',
              },
            ],
            solution: `Answer: 4.

The pattern "same remainder -> HCF of differences" is the entire trick. Without it, students try random divisors and fail.`,
          },
          practice: {
            title: 'Three classic OA patterns',
            prompt: `Solve each, then check the pattern you used:

1. Find the greatest number that divides 20, 42 and 60 leaving the same remainder.
2. Find the smallest number which when divided by 35, 56 and 91 leaves a remainder of 7 in each case.
3. HCF of two numbers is 12 and their product is 6336. Find the LCM.`,
            hint: '1: HCF of pairwise differences. 2: LCM(35,56,91) - 7. 3: LCM = product / HCF = 6336 / 12 = 528.',
          },
          mistakes: [
            {
              mistake: 'Applying HCF x LCM = product to three numbers',
              fix: 'The identity holds for two numbers only. For three, compute HCF and LCM separately.',
            },
            {
              mistake: 'Confusing "greatest divisor" with LCM',
              fix: 'Greatest number that divides -> HCF. Smallest number that is a multiple of -> LCM. Read the verb, not the noun.',
            },
            {
              mistake: 'Forgetting to subtract the remainder in the LCM - r pattern',
              fix: '"Leaves remainder 7" means LCM - 7, not LCM. If you answer LCM you are off by exactly the remainder.',
            },
          ],
          exam: {
            question: 'Find the greatest number that will divide 43, 91 and 183 so as to leave the same remainder in each case.',
            answer: '4. Take pairwise differences (48, 92, 140) and compute HCF = 4. Verification: 43, 91, 183 all leave remainder 3 when divided by 4.',
            source: 'Infosys / TCS OA classic',
          },
          summary: [
            'Greatest divisor -> HCF; smallest multiple -> LCM. Read the verb.',
            'Same-remainder pattern: HCF of pairwise differences.',
            'Remainder r on each divisor: LCM - r.',
            'HCF x LCM = product holds for TWO numbers only.',
          ],
        }),
        [
          [
            'Greatest number dividing 43, 91, 183 with same remainder?',
            ['3', '4', '6', '12'],
            1,
            'HCF of differences 48, 92, 140 = 4.',
          ],
          [
            'Smallest number divisible by 35, 56, 91 leaving remainder 7?',
            ['3640', '3633', '3647', '7280'],
            1,
            'LCM(35,56,91) = 3640; 3640 - 7 = 3633.',
          ],
          [
            'HCF = 12, product = 6336. LCM?',
            ['528', '264', '1584', '76032'],
            0,
            'LCM = product / HCF = 6336 / 12 = 528.',
          ],
        ]
      ),
    ],
  },
  // ── Module 2: Ratio, Partnership, Mixtures, Profit-Loss ──────────────────
  {
    id: M2,
    course_id: 'crs-aptitude-reasoning',
    title: 'Module 2 — Ratio, Partnership, Mixtures & Profit-Loss',
    summary: 'Allocation problems, profit-sharing, the alligation cross, successive discounts and SI/CI differences.',
    sort_order: 2,
    lessons: [
      lesson(
        M2,
        'aq-2-1',
        1,
        'Ratio allocation, partnership and alligation',
        'How a total is split, how profit follows capital x time, and the alligation technique that turns a long equation into a line on paper.',
        14,
        nineBlocks({
          objectives: [
            'Split a quantity in a given ratio and compute partnership profit shares',
            'Apply the alligation cross to mixing problems',
            'Solve the draw-and-replace mixture pattern',
          ],
          hook: `Capgemini OA: "A and B invest Rs 12,000 and Rs 18,000 in a business. After 8 months, C joins with Rs 15,000. If the annual profit is Rs 12,000, what is C's share?"

Every student who has seen the pattern knows the one formula: share is proportional to capital x months. Every student who has not, sets up three equations and runs out of time.`,
          concept: `## Partnership: profit follows capital x time

When partners invest different amounts for different durations, each partner's share of profit is proportional to their capital x time (often written as "investment-months").

Share of X = Total Profit x (X's capital x X's months) / Sum(all capital x time)

If all partners invest for the same time, this simplifies to the ratio of capitals alone.

## The alligation rule

When two ingredients of prices (or concentrations) a and b (a > c > b) are mixed to get a mean price c:

Ratio of quantities = (c - b) : (a - c)

The difference on the opposite side gives the share. This is a weighted average written as a diagram.

Example: Milk Rs 20, water Rs 0, mean Rs 16.
c - b = 16 - 0 = 16; a - c = 20 - 16 = 4.
Ratio milk : water = 16 : 4 = 4 : 1.

## Removal and replacement

A container has x litres of pure milk. y litres are drawn off and replaced with water, repeated n times.

Final milk = x x (1 - y/x)^n

This formula covers the entire family of "draw and replace" questions.`,
          extras: [
            tip(
              'Always convert capital x time to the same unit',
              'Mixing months and days, or years and months, is the most common source of a wrong partnership answer. Convert everything to months before you divide.'
            ),
            warn(
              'A joins mid-year - count only their actual months',
              "If C joins after 8 months of a 12-month year, C's time is 4 months, not 12. The question says \"after 8 months\" meaning 8 months have already passed."
            ),
          ],
          worked: {
            title: 'Three-partnership profit split and alligation',
            problem: `Part A: A invests Rs 12,000 x 12 months, B Rs 18,000 x 12 months, C Rs 15,000 x 4 months. Annual profit Rs 12,000. Find C's share.
Part B: Milk at Rs 20/litre mixed with water to get Rs 16/litre. Ratio?`,
            steps: [
              {
                title: 'Part A Step 1 - capital x months',
                desc: 'A: 12000 x 12 = 144,000. B: 18000 x 12 = 216,000. C: 15000 x 4 = 60,000.',
                code_snippet: 'A: 12000x12 = 144000\nB: 18000x12 = 216000\nC: 15000x4  = 60000',
              },
              {
                title: 'Part A Step 2 - simplify the ratio',
                desc: '144000 : 216000 : 60000 = 12 : 18 : 5 (divide all by 12000).',
              },
              {
                title: 'Part A Step 3 - C share',
                desc: 'Total parts 35. C = 5/35 x 12000 = Rs 1,714.',
              },
              {
                title: 'Part B - alligation cross',
                desc: 'Milk Rs 20, water Rs 0, mean Rs 16. Differences: 16-0=16 and 20-16=4. Ratio = 16:4 = 4:1.',
              },
            ],
            solution: `Part A: C's share = Rs 1,714 (approx). Capital-months 144k:216k:60k = 12:18:5.
Part B: Milk : Water = 4 : 1.

C only held the capital for 4 of the 12 months, so C's capital-months is 60,000 not 180,000. That is why C's share is small despite investing a large amount.`,
          },
          practice: {
            title: 'Allocation and mixture drills',
            prompt: `1. Rs 15,000 is divided among A, B, C in the ratio 2:3:5. Find each share.
2. In what ratio must tea worth Rs 25/kg and Rs 40/kg be mixed so that the mixture is worth Rs 30/kg?
3. A container has 30 litres of pure milk. 6 litres are drawn off and replaced with water, twice. How much pure milk remains?`,
            hint: '2: Alligation cross -> (40-30):(30-25) = 10:5 = 2:1. 3: 30 x (24/30)^2 = 30 x 16/25 = 19.2 L.',
          },
          mistakes: [
            {
              mistake: 'Using full-year time for a mid-year partner',
              fix: 'C joins after 8 months -> C time is 4 months. Always count the actual months the capital was held.',
            },
            {
              mistake: 'Applying alligation when the mean is outside the two values',
              fix: 'The mean must lie between the two ingredient values. If you want a mean higher than both, you cannot get it by mixing those two.',
            },
            {
              mistake: 'Forgetting to raise (1 - y/x) to the nth power in draw-and-replace',
              fix: 'Each draw-and-replace multiplies the remaining pure substance by (1 - y/x). After n operations the factor is raised to the nth power.',
            },
          ],
          exam: {
            question: 'A invests Rs 12,000 for 12 months, B Rs 18,000 for 12 months, C Rs 15,000 for 4 months. Annual profit Rs 12,000. What is C share?',
            answer: 'Rs 1,714 (approx). Capital-months: A=144,000, B=216,000, C=60,000. Ratio 12:18:5, total 35 parts, C = 5/35 x 12,000 = Rs 1,714.',
            source: 'Capgemini / Cognizant OA',
          },
          summary: [
            'Partnership profit is proportional to capital x months (investment-months).',
            'Mid-year joiner: count only their actual months of holding.',
            'Alligation: ratio = (mean - cheap) : (expensive - mean), drawn as a cross.',
            'Draw-and-replace: final pure = x x (1 - y/x)^n.',
          ],
        }),
        [
          [
            'Rs 8,000 split in ratio 3:5. A share?',
            ['Rs 3,000', 'Rs 3,200', 'Rs 5,000', 'Rs 4,800'],
            0,
            'Total parts 8; A gets 3/8 x 8000 = 3000.',
          ],
          [
            'In a partnership, profit share is proportional to:',
            ['Capital alone', 'Time alone', 'Capital x time', 'Number of partners'],
            2,
            'Investment-months (capital x time) is the fair measure when capital is held for different durations.',
          ],
          [
            'Milk Rs 20, water Rs 0, mean Rs 16. Ratio?',
            ['1:4', '4:1', '3:1', '2:1'],
            1,
            'Alligation: (16-0):(20-16) = 16:4 = 4:1.',
          ],
        ]
      ),
      lesson(
        M2,
        'aq-2-2',
        2,
        'Profit, loss, successive discounts and interest',
        'The marked-price chain, why two 10% discounts are not a 20% discount, and the SI/CI difference formula.',
        13,
        nineBlocks({
          objectives: [
            'Compute profit/loss percent from cost price and selling price',
            'Apply successive discounts using the single-equivalent-percent method',
            'Use the SI-minus-CI difference formula for 2 years',
          ],
          hook: `A shopkeeper offers two successive discounts of 10% and 10% on a Rs 1,000 jacket. Most students say "20% off, so Rs 800".

The actual answer is Rs 810. The first 10% takes Rs 100 off (leaving Rs 900). The second 10% takes 10% of Rs 900 = Rs 90 off (leaving Rs 810).

Successive discounts do not add. They compound - and the compounding is exactly the same mathematics as successive interest rates.`,
          concept: `## The profit/loss identity

- Profit% = ((SP - CP) / CP) x 100
- Loss% = ((CP - SP) / CP) x 100

The base is ALWAYS cost price. A common trap: "sold at 20% profit then 20% loss" - the two percentages have different bases, so the net is a loss, not break-even.

## Successive discounts (the single-equivalent method)

Two discounts a% and b% are equivalent to a single discount of:

a + b - (ab/100)

For 10% and 10%: 10 + 10 - (100/100) = 20 - 1 = 19%. So Rs 1,000 -> Rs 810.

For 20% and 30%: 20 + 30 - (600/100) = 50 - 6 = 44%.

Alternatively, multiply the "pay fractions": 0.9 x 0.9 = 0.81, so you pay 81%, meaning 19% off.

## Simple and compound interest

SI = P x R x T / 100 (linear growth).
A = P (1 + R/100)^T for CI (exponential growth).

For 2 years: CI - SI = P x (R/100)^2.

This single formula converts every "difference between CI and SI" question from multi-step algebra into one line.

## Dishonest dealer (false weight)

A dealer claims to sell at cost price but uses a 900 g weight for 1 kg. Profit% = (1000-900)/900 x 100 = 11.11%. The base is the WEIGHT GIVEN, not the weight claimed.`,
          extras: [
            table(
              'Successive discount equivalents',
              ['Discounts', 'Single equivalent'],
              [
                ['10% + 10%', '19%'],
                ['20% + 30%', '44%'],
                ['50% + 50%', '75% (not 100!)'],
              ]
            ),
            warn(
              'Profit then loss at the same % is a NET LOSS',
              'Sell at 20% profit then 20% loss on the same item: 120 x 0.8 = 96. You lose 4%, not break even. The bases are different.'
            ),
          ],
          worked: {
            title: 'Successive discounts and the CI-SI difference',
            problem: `Part A: A Rs 2,000 jacket is discounted 10%, then 20%, then 25%. Final price?
Part B: CI - SI on Rs 8,000 at 10% for 2 years?`,
            steps: [
              {
                title: 'Part A - multiply pay-fractions',
                desc: '0.9 x 0.8 x 0.75 = 0.54. Pay 54% of 2000 = Rs 1,080. Single-equivalent discount = 46%.',
                code_snippet: '2000 x 0.9 x 0.8 x 0.75\n= 2000 x 0.54\n= Rs 1080',
              },
              {
                title: 'Part B - apply the difference formula',
                desc: 'CI - SI = P x (R/100)^2 = 8000 x (10/100)^2 = 8000 x 0.01 = Rs 80.',
              },
              {
                title: 'Verify Part B by direct computation',
                desc: 'SI = 8000 x 10 x 2 / 100 = 1600. CI = 8000 x (1.1)^2 - 8000 = 8000 x 1.21 - 8000 = 9680 - 8000 = 1680. Difference = 1680 - 1600 = Rs 80. Confirmed.',
              },
              {
                title: 'Key insight',
                desc: 'The multiplicative form (multiply the pay-fractions) is even faster than successive combination when there are three or more discounts.',
              },
            ],
            solution: `Part A: Final price Rs 1,080 (46% discount).
Part B: CI - SI = Rs 80.

The technique transfers directly to any numbers the exam uses.`,
          },
          practice: {
            title: 'Profit and interest drills',
            prompt: `1. CP = Rs 480, SP = Rs 540. Find profit percent.
2. An item marked Rs 1,500 is sold after discounts of 20% and 10%. Selling price?
3. Find SI on Rs 5,000 at 8% for 3 years.`,
            hint: '3: SI = 5000 x 8 x 3 / 100 = Rs 1,200.',
          },
          mistakes: [
            {
              mistake: 'Adding successive discounts (10%+10% = 20%)',
              fix: 'They compound: 10+10-1 = 19%. Or multiply the pay-fractions: 0.9 x 0.9 = 0.81, so 19% off.',
            },
            {
              mistake: 'Using SP as the base for profit percent instead of CP',
              fix: 'Profit% is always on CP. If you use SP you get "margin", which is a different number.',
            },
            {
              mistake: 'Applying the 2-year CI-SI difference formula to 3 years',
              fix: 'For 3 years the difference is P(R/100)^2 x (3 + R/100), not just P(R/100)^2.',
            },
          ],
          exam: {
            question: 'Two successive discounts of 10% each are equivalent to a single discount of:',
            answer: '19%. Using a+b-ab/100: 10+10-1 = 19%. Or 0.9 x 0.9 = 0.81, so you pay 81%, meaning 19% off.',
            source: 'TCS / Infosys OA',
          },
          summary: [
            'Profit% and Loss% are always on COST PRICE.',
            'Successive discounts: a+b-ab/100, or multiply the pay-fractions.',
            'Same-% profit then loss = net loss (different bases).',
            'CI - SI for 2 years = P(R/100)^2.',
            'Dishonest dealer: base is the weight actually given.',
          ],
        }),
        [
          [
            'CP Rs 480, SP Rs 540. Profit %?',
            ['10%', '12.5%', '15%', '20%'],
            1,
            'Profit = 60; 60/480 = 0.125 = 12.5%.',
          ],
          [
            'Two 10% discounts equal a single discount of?',
            ['20%', '19%', '18%', '21%'],
            1,
            '10+10-1 = 19%. Or 0.9 x 0.9 = 0.81.',
          ],
          [
            'CI - SI on Rs 8,000 at 10% for 2 years?',
            ['Rs 80', 'Rs 160', 'Rs 800', 'Rs 16'],
            0,
            'P(R/100)^2 = 8000 x 0.01 = Rs 80.',
          ],
        ]
      ),
    ],
  },
  // ── Module 3: Speed, Trains, Work ────────────────────────────────────────
  {
    id: M3,
    course_id: 'crs-aptitude-reasoning',
    title: 'Module 3 — Speed, Trains & Work',
    summary: 'D = S x T plus relative speed for trains and boats, and the one-day-work rate method that replaces algebra.',
    sort_order: 3,
    lessons: [
      lesson(
        M3,
        'aq-3-1',
        1,
        'Speed, relative speed, trains and boats',
        'The one equation D = S x T, plus the relative-speed adjustments for trains, rivers and opposite directions.',
        14,
        nineBlocks({
          objectives: [
            'Use D = S x T confidently with unit conversions (km/h to m/s)',
            'Compute relative speed for same-direction and opposite-direction motion',
            'Solve train-crossing-platform and boat-in-stream problems',
          ],
          hook: `A 150 m train at 60 km/h crosses a 350 m platform. How long?

Most students convert units halfway, forget the train's own length, or add when they should subtract. The entire question rests on one idea: when the train clears the platform, it has covered its OWN length plus the PLATFORM's length.

Convert 60 km/h to m/s (multiply by 5/18 = 16.67 m/s). Total distance = 150 + 350 = 500 m. Time = 500 / 16.67 = 30 seconds. Three steps, no tricks.`,
          concept: `## The master equation

D = S x T

Everything in this topic is this equation plus a unit conversion or a relative-speed adjustment.

## Unit conversion (memorise both directions)

- km/h to m/s: multiply by 5/18
- m/s to km/h: multiply by 18/5

60 km/h x 5/18 = 16.67 m/s. 10 m/s x 18/5 = 36 km/h.

## Relative speed

- Same direction: S_rel = |S1 - S2|
- Opposite direction: S_rel = S1 + S2

## Trains

- Train crosses a pole: distance = length of train only.
- Train crosses a platform: distance = length of train + length of platform.
- Two trains crossing each other (opposite direction): S_rel = S1 + S2, distance = L1 + L2.
- Two trains same direction: S_rel = |S1 - S2|, distance = L1 + L2.

## Boats and streams

- Downstream: S = B + W (boat + water)
- Upstream: S = B - W (boat against water)
- B = (down + up) / 2;  W = (down - up) / 2`,
          extras: [
            table(
              'What distance to use',
              ['Scenario', 'Distance in D = S x T'],
              [
                ['Train crosses a pole', 'Length of train'],
                ['Train crosses a platform', 'Length of train + length of platform'],
                ['Two trains opposite directions', 'L1 + L2'],
                ['Two trains same direction', 'L1 + L2 (with relative speed)'],
              ]
            ),
            tip(
              'Convert units FIRST, before you set up the equation',
              'Mixing km/h with metres is the single largest source of wrong answers in this topic. Convert everything to m/s (or everything to km/h) before you write D = S x T.'
            ),
          ],
          worked: {
            title: 'Train crossing a platform, and two trains meeting',
            problem: `Part A: A 150 m train at 60 km/h crosses a 350 m platform. Time?
Part B: Two trains 200 m and 300 m long approach each other at 72 km/h and 54 km/h. Time to completely cross?`,
            steps: [
              {
                title: 'Part A Step 1 - convert speed',
                desc: '60 km/h x 5/18 = 50/3 = 16.67 m/s.',
                code_snippet: '60 x 5/18 = 300/18 = 50/3 m/s',
              },
              {
                title: 'Part A Step 2 - total distance',
                desc: 'Train length + platform length = 150 + 350 = 500 m.',
              },
              {
                title: 'Part A Step 3 - time',
                desc: 'T = 500 / (50/3) = 500 x 3/50 = 30 seconds.',
              },
              {
                title: 'Part B - opposite direction, relative speed',
                desc: 'Convert: 72 km/h = 20 m/s; 54 km/h = 15 m/s. S_rel = 20 + 15 = 35 m/s. Distance = 200 + 300 = 500 m. T = 500/35 = 14.29 seconds.',
              },
            ],
            solution: `Part A: 30 seconds.
Part B: 14.29 seconds (500/35 = 100/7 = 14.29 s).

Both parts used the same structure: convert units, pick the right distance, apply D = S x T with the correct speed (absolute or relative).`,
          },
          practice: {
            title: 'Speed drills',
            prompt: `1. A 100 m long train at 36 km/h crosses a 150 m platform. Time?
2. A boat goes 24 km downstream in 2 hours and returns upstream in 3 hours. Find boat speed and stream speed.
3. Two cars start 200 km apart and move toward each other at 40 km/h and 60 km/h. When do they meet?`,
            hint: '2: down speed = 12 km/h, up speed = 8 km/h. B = (12+8)/2 = 10, W = (12-8)/2 = 2.',
          },
          mistakes: [
            {
              mistake: 'Forgetting to add the train length when crossing a platform',
              fix: 'Clearing the platform means covering train + platform. Only when crossing a pole is the distance just the train length.',
            },
            {
              mistake: 'Using S1 + S2 for same-direction trains',
              fix: 'Same direction -> relative speed is |S1 - S2|. Opposite -> S1 + S2. Getting this backwards is a classic error.',
            },
            {
              mistake: 'Mixing km/h and m/s in one equation',
              fix: 'Convert first. 5/18 down, 18/5 up. Write the conversion on the paper before the D = S x T line.',
            },
          ],
          exam: {
            question: 'A 150 m train at 60 km/h crosses a 350 m platform. How long does it take?',
            answer: '30 seconds. Convert: 60 km/h = 50/3 m/s. Distance = 150 + 350 = 500 m. Time = 500 / (50/3) = 30 s.',
            source: 'TCS / Wipro OA classic',
          },
          summary: [
            'D = S x T is the only equation; everything else is unit conversion or relative speed.',
            'km/h to m/s: x 5/18. m/s to km/h: x 18/5.',
            'Same direction: |S1-S2|. Opposite: S1+S2.',
            'Train + platform: distance = L_train + L_platform.',
            'Boats: down = B+W, up = B-W; recover B and W from the average and half-difference.',
          ],
        }),
        [
          [
            '60 km/h in m/s?',
            ['16.67', '18', '15', '20'],
            0,
            '60 x 5/18 = 50/3 = 16.67 m/s.',
          ],
          [
            'Two trains opposite directions: relative speed is',
            ['|S1-S2|', 'S1+S2', 'max(S1,S2)', 'S1 x S2'],
            1,
            'Opposite directions add; same directions subtract.',
          ],
          [
            'Boat: 24 km down in 2 h, 32 km up in 4 h. Stream speed?',
            ['2 km/h', '4 km/h', '6 km/h', '8 km/h'],
            0,
            'Down = 12, up = 8. W = (12-8)/2 = 2 km/h.',
          ],
        ]
      ),
      lesson(
        M3,
        'aq-3-2',
        2,
        'Work, time and pipes',
        'The one-day-work method: stop thinking "how many days" and start thinking "fraction per day".',
        13,
        nineBlocks({
          objectives: [
            'Convert "does a job in x days" into work-per-day rates',
            'Combine workers (and pipes) by adding their rates',
            'Solve problems where a worker leaves or joins mid-job',
          ],
          hook: `"A can do a job in 12 days, B in 18 days. Together, how long?"

Most students try to find an LCM or set up a proportion and get tangled. The rate method takes one line:

A rate = 1/12 per day. B rate = 1/18 per day. Combined rate = 1/12 + 1/18 = 5/36 per day. Time = 36/5 = 7.2 days.

The shift from "days to finish" to "fraction finished per day" is the entire topic.`,
          concept: `## The rate principle

If A finishes a job in N days, A rate is 1/N job per day.

To combine workers, ADD their rates. The combined time is the reciprocal of the combined rate.

## Two workers

A in a days, B in b days:
- Together: 1/(1/a + 1/b) = ab/(a+b) days
- For n days together then one leaves: compute the fraction done, then the remainder / remaining worker's rate.

## The LCM shortcut (mental math)

To add 1/12 + 1/18 without a calculator: take LCM(12,18) = 36. Convert: 3/36 + 2/36 = 5/36. Reciprocal = 36/5 = 7.2.

## Pipes and cisterns

Same as work: a pipe that fills in x hours has rate 1/x per hour. A pipe that empties in y hours has rate -1/y. Net rate = sum of signed rates.`,
          extras: [
            table(
              'Quick two-worker times',
              ['A', 'B', 'Together'],
              [
                ['12', '18', '7.2 days (36/5)'],
                ['10', '15', '6 days'],
                ['6', '12', '4 days'],
              ]
            ),
            tip(
              'One leaves mid-job: compute fraction done first',
              'A and B work 4 days together, then B leaves. Fraction done in 4 days = 4 x (combined rate). Remaining fraction / A rate = days A works alone. Never try to "adjust the total days".'
            ),
          ],
          worked: {
            title: 'Worker leaves mid-job',
            problem: `A can do a job in 20 days, B in 30 days. They work together for 4 days, then B leaves. How many more days does A need to finish alone?`,
            steps: [
              {
                title: 'Step 1 - rates',
                desc: 'A: 1/20 per day. B: 1/30 per day. Combined: 1/20 + 1/30 = 3/60 + 2/60 = 5/60 = 1/12 per day.',
              },
              {
                title: 'Step 2 - work done in 4 days together',
                desc: '4 x 1/12 = 1/3 of the job done.',
                code_snippet: 'Combined rate = 1/12 per day\n4 days -> 4/12 = 1/3 done\nRemaining = 2/3',
              },
              {
                title: 'Step 3 - A finishes the rest alone',
                desc: 'Remaining = 2/3. A rate = 1/20. Days = (2/3) / (1/20) = (2/3) x 20 = 40/3 = 13.33 days.',
              },
              {
                title: 'Step 4 - total time (sanity)',
                desc: 'Total = 4 + 13.33 = 17.33 days. Without B, A alone would take 20 days. With B help for 4 days, total is less. Confirmed.',
              },
            ],
            solution: `A needs 40/3 = 13.33 more days (total elapsed = 17.33 days).

The rate method never requires you to "undo" the joint work - you always compute fraction-done, then divide the remainder by the remaining worker's rate.`,
          },
          practice: {
            title: 'Work-rate drills',
            prompt: `1. A does a job in 15 days, B in 10 days. Together?
2. A, B, C can do a job in 6, 8, 12 days respectively. All three together?
3. A and B together do a job in 12 days. A alone does it in 20 days. How long for B alone?`,
            hint: '3: B rate = 1/12 - 1/20 = 5/60 - 3/60 = 2/60 = 1/30. So B alone = 30 days.',
          },
          mistakes: [
            {
              mistake: 'Averaging the two times instead of adding rates',
              fix: 'Time is not linear. Average of 12 and 18 is 15, but together they take 7.2 days. Always add 1/a + 1/b.',
            },
            {
              mistake: 'When a worker leaves, trying to adjust the original combined time',
              fix: 'Compute fraction done by the joint rate, then the remainder by the remaining rate. Do not try to "shorten" the combined-time figure.',
            },
            {
              mistake: 'Treating a "leaking" pipe as a positive worker',
              fix: 'A pipe that empties has a NEGATIVE rate. Net rate = fill rates - empty rates. Sign errors here are common.',
            },
          ],
          exam: {
            question: 'A can do a job in 20 days, B in 30 days. Together for 4 days, then B leaves. How many more days for A?',
            answer: '40/3 = 13.33 days. Combined rate 1/12; 4 days done 1/3; remaining 2/3 / (1/20) = 40/3 days.',
            source: 'Infosys / Cognizant OA',
          },
          summary: [
            'Rate = 1/days. Combine workers by ADDING rates.',
            'Together time = 1/(1/a + 1/b) = ab/(a+b).',
            'Worker leaves: fraction done by joint rate, remainder / remaining rate.',
            'Pipes: filling rates positive, emptying rates negative; net rate decides.',
          ],
        }),
        [
          [
            'A in 12 days, B in 18 days. Together?',
            ['15 days', '7.2 days', '10 days', '6 days'],
            1,
            '1/12 + 1/18 = 5/36; reciprocal = 36/5 = 7.2 days.',
          ],
          [
            'A in 20, B in 30, together 4 days then B leaves. More days for A?',
            ['12', '13.33', '15', '16'],
            1,
            'Remaining 2/3 / (1/20) = 40/3 = 13.33 days.',
          ],
          [
            'A+B = 12 days, A alone = 20 days. B alone?',
            ['24', '30', '32', '40'],
            1,
            'B rate = 1/12 - 1/20 = 1/30 -> 30 days.',
          ],
        ]
      ),
    ],
  },
  // ── Module 4: Reasoning - Series, Coding, Relations, Syllogisms ──────────
  {
    id: M4,
    course_id: 'crs-aptitude-reasoning',
    title: 'Module 4 — Reasoning: Series, Coding, Relations & Syllogisms',
    summary: 'The reasoning half of every OA: number and letter series, coding rules, family trees and Venn-diagram syllogisms.',
    sort_order: 4,
    lessons: [
      lesson(
        M4,
        'aq-4-1',
        1,
        'Number series, letter series and coding-decoding',
        'How to read a series: differences, ratios, alternate terms, and the letter-position method that works for every alphabetic series.',
        14,
        nineBlocks({
          objectives: [
            'Identify arithmetic, geometric and second-order differences in a number series',
            'Decode letter series using forward (A=1) and reverse (Z=1) positions',
            'Apply coding rules from a given word-code pair to new words',
          ],
          hook: `Find the next term: 2, 6, 12, 20, 30, ___

Differences: 4, 6, 8, 10. The differences themselves increase by 2. Next difference = 12. Answer = 30 + 12 = 42.

This is a second-order arithmetic series - one of the three patterns that cover most number-series questions in Indian OAs. The other two are geometric (multiply by a constant) and alternating (two interleaved series).

The skill is not arithmetic. It is knowing which three analyses to run, in which order.`,
          concept: `## The three analyses (in this order)

1. First differences - subtract consecutive terms. If the differences are constant -> arithmetic. If the differences themselves have a constant difference -> second-order.
2. Ratios - divide consecutive terms. If the ratios are constant -> geometric.
3. Alternate terms - take every 2nd (or 3rd) term. Often two independent series are interleaved.

If none work, look for: digits changing independently, primes, squares, or Fibonacci-style sums.

## Letter series: the position method

Number the alphabet: A=1, B=2, ..., Z=26. Convert every letter to its position, apply the numeric pattern, convert back.

For reverse coding (Z=1, Y=2, ...), use position = 27 - forward position.

## Common letter-series patterns

- Constant step: A, C, E, G -> +2
- Increasing step: A, C, F, J -> +2, +3, +4
- Wrap-around: Y, Z, A, B -> continue past Z to A (mod 26)
- Alternating: A, Z, B, Y, C, X -> forward/backward simultaneously

## Coding-decoding: the three families

1. Uniform shift (Caesar cipher): every letter moves by a fixed number. CAT -> DBU is +1.
2. Reverse coding: A<->Z, B<->Y. New position = 27 - old position.
3. Position arithmetic: letter positions doubled, squared, etc. Convert to numbers first to see it.

The method is always the same: decode the rule from the example, verify on every letter, then apply blindly.`,
          extras: [
            table(
              'Series analysis decision tree',
              ['Sign', 'Likely type'],
              [
                ['Differences constant', 'Arithmetic (+d each step)'],
                ['Differences increase by constant', 'Second-order (+2, +3, +4...)'],
                ['Ratios constant', 'Geometric (x r each step)'],
                ['Every 2nd term is its own series', 'Alternating / interleaved'],
              ]
            ),
            tip(
              'Write the difference row under the series before anything else',
              'It takes 10 seconds and eliminates 70% of wrong hypotheses. If the difference row is constant, stop - you have the pattern.'
            ),
          ],
          worked: {
            title: 'An interleaved letter series and a coding question',
            problem: `Part A: Find the next term: B, D, G, K, P, ___
Part B: If CAT is coded as DBU, what is DOG coded as?`,
            steps: [
              {
                title: 'Part A Step 1 - convert to positions',
                desc: 'B=2, D=4, G=7, K=11, P=16.',
                code_snippet: 'B=2, D=4, G=7, K=11, P=16',
              },
              {
                title: 'Part A Step 2 - look at differences',
                desc: '4-2=2, 7-4=3, 11-7=4, 16-11=5. Differences: 2, 3, 4, 5 - increasing by 1.',
              },
              {
                title: 'Part A Step 3 - next difference and answer',
                desc: 'Next difference = 6. Next position = 16 + 6 = 22 = V.',
              },
              {
                title: 'Part B - decode the shift',
                desc: 'C->D (+1), A->B (+1), T->U (+1). Uniform +1 shift. Apply: D->E, O->P, G->H. Answer: EPH.',
              },
            ],
            solution: `Part A: V (differences increase by 1: 2, 3, 4, 5, 6).
Part B: EPH (each letter +1).

Converting letters to positions first makes the pattern visible; trying to "see" it in letters alone is much harder.`,
          },
          practice: {
            title: 'Series and coding drills',
            prompt: `Find the next term:
1. 3, 6, 12, 24, 48, ___
2. 5, 8, 14, 26, 50, ___
3. J, L, O, S, ___
4. If SUN is coded as TVO (shift +1), how is MOON coded?`,
            hint: '2: Differences are 3, 6, 12, 24 - doubling. Next difference 48; answer 98. 3: Positions J=10, L=12, O=15, S=19; diffs 2, 3, 4; next diff 5 -> 24 = X.',
          },
          mistakes: [
            {
              mistake: 'Jumping to "primes" or "squares" before checking differences',
              fix: 'Always write the difference row first. It is the most common and the fastest analysis. Save exotic sequences for last.',
            },
            {
              mistake: 'Forgetting the wrap-around past Z',
              fix: 'In letter series, after Z comes A. Use mod 26 (or just count on your fingers past Z if under pressure).',
            },
            {
              mistake: 'Assuming the coding shift is the same in every position without checking',
              fix: 'Some questions use a different shift per position. Verify letter by letter before applying.',
            },
          ],
          exam: {
            question: 'Find the next term: 2, 6, 12, 20, 30, ___',
            answer: '42. Differences are 4, 6, 8, 10 (increasing by 2). Next difference = 12. 30 + 12 = 42.',
            source: 'Standard number-series OA question',
          },
          summary: [
            'Always write the difference row first.',
            'Constant difference -> arithmetic; doubling difference -> check ratios; oscillating -> alternating series.',
            'Letter series: convert to positions (A=1..Z=26), find the numeric pattern, convert back.',
            'Wrap-around: after Z comes A (mod 26).',
            'Coding: decode the shift from one pair, verify on every letter, then apply blindly.',
          ],
        }),
        [
          [
            'Next in 2, 6, 12, 20, 30, ___?',
            ['36', '40', '42', '44'],
            2,
            'Differences 4, 6, 8, 10 -> next 12 -> 42.',
          ],
          [
            'J, L, O, S, ___?',
            ['V', 'U', 'W', 'X'],
            0,
            'Positions: 10, 12, 15, 19; diffs 2, 3, 4 -> next 5 -> 24 = V.',
          ],
          [
            'CAT -> DBU (+1). DOG -> ?',
            ['EPH', 'DPC', 'FQI', 'EPG'],
            0,
            'Each letter +1: D->E, O->P, G->H.',
          ],
        ]
      ),
      lesson(
        M4,
        'aq-4-2',
        2,
        'Blood relations, direction sense and syllogisms',
        'Drawing a family tree that eliminates wrong options, walking the compass, and testing syllogisms with Venn diagrams.',
        14,
        nineBlocks({
          objectives: [
            'Translate a blood-relation sentence into a family-tree symbol and draw it',
            'Track multi-leg direction changes and compute net displacement',
            'Test syllogism conclusions with Venn containment diagrams',
          ],
          hook: `Pointing to a photograph, a man said, "She is the daughter of the only son of my grandfather." How is the lady related to him?

Grandfather's only son = the man's father. Daughter of his father = his sister.

Without a tree, most students guess between sister, cousin and niece. With a three-line tree, the answer is forced.`,
          concept: `## Family-tree symbols (memorise these)

- Triangle = Male
- Square = Female
- Horizontal line + symbol = Spouse
- Vertical line down = Parent to child
- Siblings on one horizontal bar = Brother / sister

## Translation rules

- "A is the brother of B" -> A = male, same generation, sibling.
- "A is the wife of B" -> A = female, married to B.
- "A is the mother of B" -> A = female, one generation above B.
- "Only son of my grandfather" = my father (if my father was the only son).

## Direction sense: the compass method

Draw a small cross: N up, E right, S down, W left. For each leg of the journey, draw an arrow and label the distance. At the end, add the N-S components and the E-W components separately, then use Pythagoras for the net displacement.

## Turning conventions (read carefully)

- "Turns left" from facing N -> faces W. From facing E -> faces N.
- "Turns right" from facing N -> faces E. From facing E -> faces S.
- Keep a running "facing" variable. Update it at every turn before drawing the next leg.

## Syllogisms: the four statement types

| Statement | Venn diagram |
| --- | --- |
| All A are B | A circle entirely inside B |
| No A are B | A and B completely separate |
| Some A are B | A and B overlap (at least one shared) |
| Some A are not B | A has a part outside B |

## What definitely follows

- "All A are B" implies "Some B are A" (always true - the A part of B exists).
- "All A are B" + "All B are C" implies "All A are C" (chain).
- "No A are B" implies "No B are A" (symmetric).
- "Some A are B" does NOT imply "All A are B" - the "some" might be a proper subset.`,
          extras: [
            table(
              'Syllogism quick rules',
              ['Given', 'Always true', 'Never assume'],
              [
                ['All A are B', 'Some B are A', 'All B are A'],
                ['No A are B', 'No B are A', 'No A are C'],
                ['Some A are B', 'Some B are A', 'All A are B'],
              ]
            ),
            tip(
              'Always draw the tree - never solve blood relations in your head',
              'The tree takes 20 seconds and makes every wrong option visibly wrong. Students who skip the drawing score roughly half the marks on this topic.'
            ),
          ],
          worked: {
            title: 'A three-leg direction problem and a syllogism',
            problem: `Part A: Rahul walks 3 km north, turns right and walks 4 km, then turns right again and walks 3 km. How far and in what direction is he from the start?
Part B: Statements: All cats are dogs. All dogs are animals. Does "Some animals are cats" follow?`,
            steps: [
              {
                title: 'Part A Step 1 - draw leg 1',
                desc: 'Facing N, walk 3 km north. Position: (0, 3). Facing still N.',
                code_snippet: 'Start (0,0)\nup 3 km N -> (0,3)',
              },
              {
                title: 'Part A Step 2 - turn right, draw leg 2',
                desc: 'Right from N = East. Walk 4 km east. Position: (4, 3). Facing E.',
              },
              {
                title: 'Part A Step 3 - turn right, draw leg 3',
                desc: 'Right from E = South. Walk 3 km south. Position: (4, 0). Facing S.',
              },
              {
                title: 'Part A Step 4 - net displacement',
                desc: 'From (0,0) to (4,0): 4 km due East. The north and south legs cancelled.',
              },
              {
                title: 'Part B - Venn containment',
                desc: 'Draw cats inside dogs inside animals. "All cats are animals" (by chaining), and "all A are B" always implies "some B are A". So "Some animals are cats" definitely follows.',
              },
            ],
            solution: `Part A: 4 km due East (north and south cancel).
Part B: Yes, "Some animals are cats" definitely follows.

Drawing each leg on a grid makes cancellations obvious. Drawing Venn circles makes syllogism answers visual, not verbal.`,
          },
          practice: {
            title: 'Relation, direction and syllogism drills',
            prompt: `1. Pointing to a photo, a woman says, "He is the son of my mother's only son." How is the man related to her?
2. A man walks 5 km south, turns left, walks 3 km, turns left again, walks 5 km. Where is he from the start?
3. Statements: Some pens are books. All books are papers. Does "Some pens are papers" follow?`,
            hint: `1: Mother's only son = her brother. His son = her nephew. 2: South and north cancel; 3 km West. 3: Yes - via books.`,
          },
          mistakes: [
            {
              mistake: 'Solving blood relations without drawing the tree',
              fix: 'The tree makes wrong options visibly wrong. Draw it every time, even for "easy" questions.',
            },
            {
              mistake: 'Turning the wrong way (left/right confusion)',
              fix: 'Left from N = W; right from N = E. Write the new facing on the diagram at every turn before drawing the next leg.',
            },
            {
              mistake: 'Accepting the converse ("All B are A" from "All A are B")',
              fix: 'All A are B does NOT mean all B are A. Draw the Venn: A inside B does not put all of B inside A.',
            },
          ],
          exam: {
            question: 'A man said, "She is the daughter of the only son of my grandfather." How is she related to him?',
            answer: `Sister. Grandfather's only son = his father. Daughter of his father = his sister.`,
            source: 'Standard blood-relation OA',
          },
          summary: [
            'Draw the family tree with symbols - never solve in your head.',
            '"Only son of my grandfather" = my father.',
            'Direction: maintain a "facing" variable; update it at every turn before the next leg.',
            'Net displacement: sum N-S and E-W components separately.',
            'Syllogisms are set containment - draw Venn circles.',
            '"All A are B" implies "Some B are A" but NOT "All B are A".',
          ],
        }),
        [
          [
            '"Son of my mother\'s only son" - relation to a female speaker?',
            ['Son', 'Brother', 'Nephew', 'Cousin'],
            2,
            "Mother's only son = her brother. His son = her nephew.",
          ],
          [
            'Walk 3 km N, right 4 km, right 3 km. Displacement?',
            ['5 km NE', '4 km East', '4 km West', '3 km South'],
            1,
            'N and S cancel; net 4 km East.',
          ],
          [
            'All A are B, All B are C. Does All A are C follow?',
            ['Yes', 'No', 'Only if A non-empty', 'Only if C non-empty'],
            0,
            'Transitivity of set containment: A inside B inside C means A inside C.',
          ],
        ]
      ),
    ],
  },
];

// ---------------------------------------------------------------------------
// Final-exam bank — 30 questions, mixed difficulty, tagged by module topic.
// ---------------------------------------------------------------------------

const examBank: ExamQuestion[] = [
  {
    id: 'aq-exam-1',
    prompt: 'What is the unit digit of 7^256?',
    options: ['7', '9', '3', '1'],
    correct_index: 3,
    explanation: 'Unit digits of 7 cycle 7, 9, 3, 1 (period 4). 256 mod 4 = 0 -> last element: 1.',
    difficulty: 'easy',
    topic: 'Number System',
  },
  {
    id: 'aq-exam-2',
    prompt: 'What is the unit digit of 3^47?',
    options: ['3', '7', '9', '1'],
    correct_index: 1,
    explanation: 'Cycle of 3: 3, 9, 7, 1. 47 mod 4 = 3 -> third element: 7.',
    difficulty: 'easy',
    topic: 'Number System',
  },
  {
    id: 'aq-exam-3',
    prompt: 'Greatest number dividing 43, 91, 183 leaving the same remainder?',
    options: ['3', '4', '6', '12'],
    correct_index: 1,
    explanation: 'HCF of pairwise differences (48, 92, 140) = 4.',
    difficulty: 'medium',
    topic: 'HCF-LCM',
  },
  {
    id: 'aq-exam-4',
    prompt: 'Smallest number divisible by 35, 56, 91 leaving remainder 7?',
    options: ['3640', '3633', '3647', '7280'],
    correct_index: 1,
    explanation: 'LCM(35,56,91) = 3640; 3640 - 7 = 3633.',
    difficulty: 'medium',
    topic: 'HCF-LCM',
  },
  {
    id: 'aq-exam-5',
    prompt: 'HCF of two numbers is 12, product is 6336. LCM?',
    options: ['528', '264', '1584', '76032'],
    correct_index: 0,
    explanation: 'LCM = product / HCF = 6336 / 12 = 528.',
    difficulty: 'easy',
    topic: 'HCF-LCM',
  },
  {
    id: 'aq-exam-6',
    prompt: 'Rs 8,000 split in ratio 3:5. A share?',
    options: ['Rs 3,000', 'Rs 3,200', 'Rs 5,000', 'Rs 4,800'],
    correct_index: 0,
    explanation: 'Total parts 8; A gets 3/8 x 8000 = Rs 3,000.',
    difficulty: 'easy',
    topic: 'Ratio',
  },
  {
    id: 'aq-exam-7',
    prompt: 'A invests Rs 12,000 x 12 mo, B Rs 18,000 x 12 mo, C Rs 15,000 x 4 mo. Profit Rs 12,000. C share?',
    options: ['Rs 1,500', 'Rs 1,714', 'Rs 2,000', 'Rs 2,400'],
    correct_index: 1,
    explanation: 'Capital-months 144k:216k:60k = 12:18:5. C = 5/35 x 12000 = Rs 1,714.',
    difficulty: 'medium',
    topic: 'Partnership',
  },
  {
    id: 'aq-exam-8',
    prompt: 'Milk Rs 20, water Rs 0, mean Rs 16. Mixing ratio?',
    options: ['1:4', '4:1', '3:1', '2:1'],
    correct_index: 1,
    explanation: 'Alligation: (16-0):(20-16) = 16:4 = 4:1.',
    difficulty: 'easy',
    topic: 'Mixtures',
  },
  {
    id: 'aq-exam-9',
    prompt: '30 L pure milk, draw 6 L replace with water, twice. Milk left?',
    options: ['19.2 L', '18 L', '20.4 L', '24 L'],
    correct_index: 0,
    explanation: '30 x (24/30)^2 = 30 x 16/25 = 19.2 L.',
    difficulty: 'medium',
    topic: 'Mixtures',
  },
  {
    id: 'aq-exam-10',
    prompt: '50% acid + 20% acid -> 32%. Ratio?',
    options: ['2:3', '3:2', '1:2', '5:4'],
    correct_index: 0,
    explanation: '(32-20):(50-32) = 12:18 = 2:3.',
    difficulty: 'medium',
    topic: 'Mixtures',
  },
  {
    id: 'aq-exam-11',
    prompt: 'CP Rs 480, SP Rs 540. Profit %?',
    options: ['10%', '12.5%', '15%', '20%'],
    correct_index: 1,
    explanation: 'Profit 60; 60/480 = 12.5%.',
    difficulty: 'easy',
    topic: 'Profit-Loss',
  },
  {
    id: 'aq-exam-12',
    prompt: 'Two successive 10% discounts equal a single discount of?',
    options: ['20%', '19%', '18%', '21%'],
    correct_index: 1,
    explanation: '10+10-1 = 19%. Or 0.9 x 0.9 = 0.81.',
    difficulty: 'easy',
    topic: 'Discounts',
  },
  {
    id: 'aq-exam-13',
    prompt: 'Dealer uses 800 g for 1 kg, sells at CP. Profit %?',
    options: ['20%', '25%', '33.3%', '12.5%'],
    correct_index: 1,
    explanation: '(1000-800)/800 x 100 = 25%.',
    difficulty: 'medium',
    topic: 'Profit-Loss',
  },
  {
    id: 'aq-exam-14',
    prompt: 'SI on Rs 5,000 at 8% for 3 years?',
    options: ['Rs 1,000', 'Rs 1,200', 'Rs 1,440', 'Rs 800'],
    correct_index: 1,
    explanation: 'SI = 5000 x 8 x 3 / 100 = Rs 1,200.',
    difficulty: 'easy',
    topic: 'Interest',
  },
  {
    id: 'aq-exam-15',
    prompt: 'CI - SI on Rs 8,000 at 10% for 2 years?',
    options: ['Rs 80', 'Rs 160', 'Rs 800', 'Rs 16'],
    correct_index: 0,
    explanation: 'P(R/100)^2 = 8000 x 0.01 = Rs 80.',
    difficulty: 'medium',
    topic: 'Interest',
  },
  {
    id: 'aq-exam-16',
    prompt: '60 km/h in m/s?',
    options: ['16.67', '18', '15', '20'],
    correct_index: 0,
    explanation: '60 x 5/18 = 50/3 = 16.67 m/s.',
    difficulty: 'easy',
    topic: 'Speed',
  },
  {
    id: 'aq-exam-17',
    prompt: '150 m train at 60 km/h crosses 350 m platform. Time?',
    options: ['20 s', '25 s', '30 s', '36 s'],
    correct_index: 2,
    explanation: 'Distance 500 m, speed 50/3 m/s, time = 500 x 3/50 = 30 s.',
    difficulty: 'medium',
    topic: 'Trains',
  },
  {
    id: 'aq-exam-18',
    prompt: 'Two trains opposite directions: relative speed is',
    options: ['|S1-S2|', 'S1+S2', 'max(S1,S2)', 'S1 x S2'],
    correct_index: 1,
    explanation: 'Opposite directions add; same directions subtract.',
    difficulty: 'easy',
    topic: 'Relative Speed',
  },
  {
    id: 'aq-exam-19',
    prompt: 'Boat: 24 km down in 2 h, 32 km up in 4 h. Stream speed?',
    options: ['2 km/h', '4 km/h', '6 km/h', '8 km/h'],
    correct_index: 0,
    explanation: 'Down 12, up 8. W = (12-8)/2 = 2 km/h.',
    difficulty: 'medium',
    topic: 'Boats',
  },
  {
    id: 'aq-exam-20',
    prompt: 'A in 12 days, B in 18. Together?',
    options: ['15', '7.2', '10', '6'],
    correct_index: 1,
    explanation: '1/12 + 1/18 = 5/36; reciprocal 36/5 = 7.2 days.',
    difficulty: 'easy',
    topic: 'Work',
  },
  {
    id: 'aq-exam-21',
    prompt: 'A in 20, B in 30, together 4 days then B leaves. More days for A?',
    options: ['12', '13.33', '15', '16'],
    correct_index: 1,
    explanation: 'Combined 1/12; 4 days done 1/3; remaining 2/3 / (1/20) = 40/3 = 13.33.',
    difficulty: 'medium',
    topic: 'Work',
  },
  {
    id: 'aq-exam-22',
    prompt: 'Next in 2, 6, 12, 20, 30, ___?',
    options: ['36', '40', '42', '44'],
    correct_index: 2,
    explanation: 'Differences 4, 6, 8, 10 -> next 12 -> 42.',
    difficulty: 'easy',
    topic: 'Series',
  },
  {
    id: 'aq-exam-23',
    prompt: 'Next in J, L, O, S, ___?',
    options: ['V', 'U', 'W', 'X'],
    correct_index: 0,
    explanation: 'Positions 10, 12, 15, 19; diffs 2, 3, 4 -> next 5 -> 24 = V.',
    difficulty: 'medium',
    topic: 'Series',
  },
  {
    id: 'aq-exam-24',
    prompt: 'CAT -> DBU (+1). DOG -> ?',
    options: ['EPH', 'DPC', 'FQI', 'EPG'],
    correct_index: 0,
    explanation: 'Each letter +1: D->E, O->P, G->H.',
    difficulty: 'easy',
    topic: 'Coding',
  },
  {
    id: 'aq-exam-25',
    prompt: 'Reverse-alphabet: R -> ?',
    options: ['I', 'J', 'K', 'H'],
    correct_index: 0,
    explanation: 'R = 18; 27 - 18 = 9 = I.',
    difficulty: 'easy',
    topic: 'Coding',
  },
  {
    id: 'aq-exam-26',
    prompt: '"Son of my mother\'s only son" - relation to a female speaker?',
    options: ['Son', 'Brother', 'Nephew', 'Cousin'],
    correct_index: 2,
    explanation: "Mother's only son = her brother. His son = her nephew.",
    difficulty: 'medium',
    topic: 'Blood Relations',
  },
  {
    id: 'aq-exam-27',
    prompt: 'Walk 3 km N, right 4 km, right 3 km. Displacement?',
    options: ['5 km NE', '4 km East', '4 km West', '3 km South'],
    correct_index: 1,
    explanation: 'N and S cancel; net 4 km East.',
    difficulty: 'easy',
    topic: 'Direction',
  },
  {
    id: 'aq-exam-28',
    prompt: 'All A are B, All B are C. Does All A are C follow?',
    options: ['Yes', 'No', 'Only if A non-empty', 'Only if C non-empty'],
    correct_index: 0,
    explanation: 'Transitivity of containment: A inside B inside C means A inside C.',
    difficulty: 'easy',
    topic: 'Syllogisms',
  },
  {
    id: 'aq-exam-29',
    prompt: 'Some A are B. Does All A are B follow?',
    options: ['Yes', 'No', 'Always', 'Only if A = B'],
    correct_index: 1,
    explanation: 'Some means at least one; it does not mean all.',
    difficulty: 'easy',
    topic: 'Syllogisms',
  },
  {
    id: 'aq-exam-30',
    prompt: 'Row faces north; "third to the left of X" means',
    options: ['3 seats toward east', '3 seats toward west', '3 seats toward south', '3 seats toward north'],
    correct_index: 1,
    explanation: 'Facing north, left = west. Count 3 seats toward west.',
    difficulty: 'medium',
    topic: 'Seating',
  },
];

export function getAptitudeCourse(): Course {
  return {
    id: 'crs-aptitude-reasoning',
    slug: 'aptitude-reasoning-mastery',
    title: 'Aptitude & Reasoning Mastery',
    subtitle: 'Clear the OA round - the highest-frequency quant and reasoning topics from TCS, Infosys, Wipro and Capgemini, taught with the shortcuts that save minutes',
    description: `Every campus placement and off-campus OA opens with an aptitude round. A learner who clears it reaches the coding round; one who does not never sees it. This course teaches exactly the topics that appear - no filler, no "advanced" chapters that never show up in an actual OA.

Eight lessons across four modules: number system and HCF/LCM, ratio-partnership-mixtures and profit-loss, speed-trains-work, then the reasoning half - series, coding-decoding, blood relations, direction sense and syllogisms. Every lesson uses the same nine-step structure: objective, hook, concept, worked example, practice, common mistakes, the exam angle, a quiz and a one-screen summary.

**Who this is for:** any student, any branch, preparing for TCS NQT, Infosys, Wipro, Capgemini, Cognizant or any other company whose OA starts with quant. Also useful for GATE/PSU prelims and bank exams.

**What you need:** class-10 arithmetic. No calculator needed - every technique is taught for mental or rough-paper calculation.`,
    category: 'Career',
    level: 'beginner',
    is_free: true,
    price_inr: 0,
    thumbnail_url: '',
    thumbnail_alt: 'Aptitude and reasoning course cover',
    tags: ['aptitude', 'reasoning', 'placement', 'oa', 'tcs', 'infosys', 'career', 'quant'],
    outcomes: [
      'Find any unit digit using the power-cycle method in under 15 seconds',
      'Recognise HCF, LCM and "same remainder" patterns on sight',
      'Solve ratio, partnership and mixture questions with alligation',
      'Compute successive discounts and SI/CI differences in one line',
      'Apply D = S x T with relative speed for trains, boats and opposite directions',
      'Solve work-rate problems using the one-day-work method',
      'Decode number series, letter series and coding-decoding rules',
      'Draw family trees, compass diagrams and Venn circles that force the right answer',
    ],
    prerequisite_course_id: null,
    certificate_eligible: true,
    published: true,
    created_at: '2026-10-13T09:00:00.000Z',
    updated_at: '2026-10-13T09:00:00.000Z',
    instructor_id: null,
    about_course: `This course is built around one idea: aptitude is not about being "smart at maths" - it is about recognising a small number of patterns and applying the matching shortcut under time pressure. There are perhaps forty patterns that cover 95% of the questions asked in Indian campus OAs. This course teaches the highest-frequency half of them, with the shortcut for each, a worked example, and drills that build the recognition speed.

Quant (Modules 1-3) is taught with the techniques that replace calculator work: power cycles, HCF-of-differences, the alligation cross, the SI-CI difference formula, relative speed and work rates. Reasoning (Module 4) is taught with the diagrams that make wrong options visibly wrong: difference rows for series, position tables for coding, family trees for blood relations, compass grids for direction, and Venn circles for syllogisms.

Every lesson ends with a quiz graded on the server, and the course finishes with a 15-question timed exam drawn from a 30-question bank. Passing earns a verifiable TieEdu certificate.`,
    prerequisites: [
      'Class-10 arithmetic (fractions, percentages, basic algebra)',
      'No calculator needed - every technique is mental or rough-paper',
    ],
    audience: [
      'Final-year and pre-final students preparing for campus placements',
      'Anyone taking TCS NQT, Infosys, Wipro, Capgemini or Cognizant OAs',
      'Students preparing for GATE/PSU prelims or bank exams',
      'Any branch - aptitude is branch-agnostic',
    ],
    audio_language: 'English',
    caption_language: 'English',
    branch: 'career',
    branch_label: 'All branches - Career',
    bucket: 'D',
    certificate_tier: 'professional',
    estimated_hours: 4,
    perks: [
      { key: 'certificate', label: 'Verifiable certificate' },
      { key: 'xp', label: 'XP on the leaderboard' },
    ],
    exam_prep: {
      target: 'Placement prep - aptitude and reasoning, all branches',
      units: [
        {
          title: 'Number System and HCF/LCM',
          summary:
            'Unit digit = power cycle (period 1/2/4); reduce exponent mod period. Same-remainder pattern = HCF of pairwise differences. LCM - r for remainder questions. HCF x LCM = product (two numbers only).',
          questions: [
            'How do you find the unit digit of 7^256?',
            'What is the "same remainder" HCF pattern?',
            'When does HCF x LCM = product apply?',
          ],
          pyqs: [],
        },
        {
          title: 'Ratio, Partnership and Mixtures',
          summary:
            'Share proportional to capital x months. Mid-year joiner counts only their actual months. Alligation cross: ratio = (mean - cheap):(expensive - mean). Draw-and-replace: final = x(1 - y/x)^n.',
          questions: [
            'How is partnership profit shared when partners join at different times?',
            'State the alligation rule.',
            'What is the draw-and-replace formula?',
          ],
          pyqs: [],
        },
        {
          title: 'Profit-Loss, Discounts and Interest',
          summary:
            'Profit% on CP always. Successive discounts: a+b-ab/100. 2-year CI-SI difference = P(R/100)^2. Dishonest dealer: base is weight given, not claimed.',
          questions: [
            'Why are two 10% discounts not 20%?',
            'What is the 2-year CI-SI difference formula?',
            'What base is used for a dishonest-dealer profit %?',
          ],
          pyqs: [],
        },
        {
          title: 'Speed, Trains and Work',
          summary:
            'D = S x T. km/h to m/s: x 5/18. Same direction |S1-S2|, opposite S1+S2. Train+platform distance = L_train + L_platform. Work: add rates 1/a + 1/b. Worker leaves: fraction done, then remainder / remaining rate.',
          questions: [
            'Convert 60 km/h to m/s.',
            'What distance does a train cover crossing a platform?',
            'How do you combine two workers rates?',
          ],
          pyqs: [],
        },
        {
          title: 'Series, Coding and Reasoning',
          summary:
            'Always write the difference row first. Letters: convert to positions (A=1..Z=26), find pattern, convert back. Wrap-around past Z -> A. Coding: decode the shift from one pair, verify, apply. Blood relations: draw the tree. Syllogisms: Venn containment. "All A are B" implies "Some B are A", never "All B are A".',
          questions: [
            'What is the first analysis to run on a number series?',
            'How do you verify a coding shift?',
            'What does "All A are B" always imply?',
          ],
          pyqs: [],
        },
      ],
      important_questions: [
        'Walk me through how you would find the unit digit of a large power in an OA.',
        'Explain the alligation cross with a milk-water example.',
        'How do you solve a work problem where one worker leaves mid-job?',
        'What is the difference between CI and SI for 2 years, and why?',
        'How do you approach a blood-relation question under time pressure?',
        'State the "same remainder" HCF pattern and when to use it.',
      ],
      previous_year_questions: [
        {
          year: '2024',
          question: 'TCS NQT: A 150 m train at 60 km/h crosses a 350 m platform. Time taken?',
          solution: 'Convert 60 km/h = 50/3 m/s. Distance = 150+350 = 500 m. Time = 500 / (50/3) = 30 seconds.',
        },
        {
          year: '2024',
          question: 'Infosys: Greatest number dividing 43, 91, 183 leaving the same remainder?',
          solution: 'HCF of pairwise differences (48, 92, 140) = 4.',
        },
        {
          year: '2025',
          question: 'Capgemini: A invests Rs 12,000 for 12 months, B Rs 18,000 for 12 months, C Rs 15,000 for 4 months. Annual profit Rs 12,000. C share?',
          solution: 'Capital-months 144k:216k:60k = 12:18:5. Total 35 parts. C = 5/35 x 12000 = Rs 1,714.',
        },
      ],
    },
    exam: {
      question_count: 15,
      duration_minutes: 25,
      passing_percent: 60,
      retake_cooldown_hours: 24,
      distinction_percent: 85,
      bank: examBank,
    },
    project: {
      title: 'Take a timed mock and build an error log',
      brief:
        'Attempt a full 15-question timed paper from the exam bank (or a real TCS NQT / Infosys OA paper if you have one). For every question you got wrong or took more than 90 seconds on, write: (1) the topic, (2) the mistake pattern (wrong formula, unit error, misread, calculation slip), (3) the correct method in one line. Submit the error log as a document or spreadsheet.',
      submission_hint: 'A spreadsheet or document with at least 5 error-log rows, each naming the topic, the mistake pattern, and the correct one-line method.',
      required_for_certificate: true,
    },
    modules,
  };
}
