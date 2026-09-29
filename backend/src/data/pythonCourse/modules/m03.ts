// Module 3 — Values, Types and Operators.
//
// The one thing that makes Python arithmetic different from the arithmetic you
// already know is that the numeric tower is a *choice*, not a default. int,
// float, Decimal, Fraction and complex are all there, they do not convert
// silently between each other, and picking the right one is a real engineering
// decision rather than a detail.
//
// The module is built around three places where beginners lose real money: the
// float that is not 0.1, the operator whose answer depends on a rule they have
// not read, and the `and` that does not return a boolean.

import { mod } from '../blocks';

export const M3 = mod(
  'crs-python-programming',
  'py-m3',
  3,
  'Module 3 — Values, Types and Operators',
  'The numeric tower, precedence, and the truthiness rules that decide which half of your `and` runs.',
  [
    {
      title: 'Numbers: int, float, bool, complex',
      summary: 'Arbitrary-precision ints, IEEE-754 floats, bool as a subclass of int, and the three libraries that fix floats when floats are wrong.',
      duration: 18,
      build: (b) => [
        b.md(`## Python has five number types and no default conversions

\`\`\`python
>>> type(1), type(1.0), type(True), type(1j), type(1 + 2)
(<class 'int'>, <class 'float'>, <class 'bool'>, <class 'complex'>, <class 'int'>)
\`\`\`

That is a deliberate design. In C, \`1/2\` silently does integer division; in JavaScript every number is a double; in C++ the promotion rules are a corner of the language spec that people memorise badly. Python has one \`/\` and it always does true division, \`//\` and \`%\` when you want the integer versions, and the type of the result follows the type of the *operands* with no promotion games. Adding an \`int\` and a \`float\` gives a \`float\`, because that is a widening that is never lossy. Adding a \`Decimal\` to a \`float\` is a \`TypeError\`, because that would be lossy and Python will not do it behind your back.

## int is arbitrary precision — and that has a cost

\`\`\`python
>>> n = 2 ** 100
>>> n
1267650600228229401496703205376
>>> n * n == 2 ** 200
True
>>> str(2 ** 1000)[-3:]
'376'
\`\`\`

\`\`\`python
import math
print(math.factorial(30))
# 265252859812191058636308480000000
\`\`\`

There is no overflow. There is no \`int\`/\`long\` split, no wraparound, no undefined behaviour, and a bignum literal in source code just works. This is why Python handles 64-bit ids, big hashes, and cryptography-adjacent arithmetic without a second thought.

The cost is real and worth measuring:

\`\`\`python
import sys

print(sys.getsizeof(0))            # 28  — header plus one 30-bit digit
print(sys.getsizeof(2 ** 100))     # 40  — 101 bits needs 4 digits: 28 + 3*4
print(sys.getsizeof(2 ** 10000))   # 1360 — 334 digits: 28 + 333*4
\`\`\`

A CPython \`int\` is 28 bytes plus **4 bytes for every 30-bit digit beyond the first**. Small ints are also pre-cached — CPython interns every integer from -5 to 256, so \`x = 300\` allocates but \`x = 200\` does not, and \`is\` comparisons on small ints happen to work. Large-int arithmetic is not slow, but it is not free either: it is allocation on every operation. If you are counting to a billion in a hot loop, use \`range\` and a C-level construct rather than building a huge int.

## float is IEEE-754 binary64, so 0.1 is not 0.1

Every \`float\` is 64 bits: 1 sign bit, 11 exponent bits, 52 mantissa bits. That gives roughly 15 to 17 significant decimal digits, and a value of 0.1 — a number with one non-zero digit — cannot be represented in it, because binary has no finite expansion for one tenth.

\`\`\`python
print(0.1 + 0.2)                 # 0.30000000000000004
print(0.1 + 0.2 == 0.3)          # False
print(0.1.hex())                 # '0x1.999999999999ap-4'
print((0.1).as_integer_ratio())  # (3602879701896397, 36028797018963968)
\`\`\`

The stored value is 3602879701896397 / 36028797018963968, which is 0.1000000000000000055511151231257827. Both 0.1 and 0.2 are slightly *above* their true values, and their sum is slightly above 0.3 — but the nearest representable double to that sum happens to land one unit in the last place above 0.3 itself, so the shortest string that round-trips prints as \`0.30000000000000004\`.

Three consequences you will meet for real:

- **Never compare floats for equality.** Use \`math.isclose(a, b)\` (default rel_tol 1e-9) or \`math.isclose(a, b, abs_tol=1e-12)\`, or do the arithmetic in integers.
- **Accumulate in integers when the value is money.** Store cents, not dollars. \`(price_cents * qty) / 100\` is done once, at the edge, for display.
- **\`repr\` is not lying.** \`repr\` prints the shortest string that round-trips to the same double. \`print(f"{x:.17f}")\` shows you the true value; \`{:.2f}\` is the display format you actually want.

Python's \`round\` is **banker's rounding** — it rounds halves to the even neighbour. That is not a bug inherited from C; it is what IEEE 754 requires, precisely so that repeated rounding does not drift upward.

\`\`\`python
print(round(0.5), round(1.5), round(2.5), round(3.5))   # 0 2 2 4
print(round(2.675, 2))                                 # 2.67 — 2.675 is really 2.67499...
\`\`\``),
        b.anim('bits', {
          title: '0.1 + 0.2, in the 64 bits that actually store it',
          badge: 'IEEE-754 binary64',
          total_bits: 64,
          steps: [
            {
              caption: '1 / 10 in binary is 0.0001100110011… and it never ends',
              note: 'The pattern "0011" repeats forever, because 10 has a factor of 5 in it and 2 has no way to represent that. A float cannot hold an infinite expansion, so it has to stop somewhere.',
              fields: [
                { label: 'true value', bits: 12, value: 1, tone: 'text', note: 'the source digit 1, held as an integer for scale' },
                { label: 'true value', bits: 12, value: 10, tone: 'text', note: 'the divisor' },
                { label: '1 / 10', bits: 40, tone: 'pad', note: 'repeating: 0.0001100110011001100110011001…' },
              ],
            },
            {
              caption: 'So 0.1 is stored as the nearest double: 0x3FB999999999999A',
              note: 'Sign 0, biased exponent 1019 (unbiased -4), and a 52-bit mantissa. The mantissa is the repeating 1001 pattern with the last hex digit rounded up from 9 to A, which is the classic "round half up on a repeating expansion" artefact.',
              fields: [
                { label: 'sign', bits: 1, value: 0, tone: 'auto' },
                { label: 'exponent 1019 = -4', bits: 11, value: 1019, tone: 'float' },
                { label: 'm51:44', bits: 8, value: 0x99, tone: 'int' },
                { label: 'm43:36', bits: 8, value: 0x99, tone: 'int' },
                { label: 'm35:28', bits: 8, value: 0x99, tone: 'int' },
                { label: 'm27:20', bits: 8, value: 0x99, tone: 'int' },
                { label: 'm19:12', bits: 8, value: 0x99, tone: 'int' },
                { label: 'm11:4', bits: 8, value: 0x99, tone: 'int' },
                { label: 'm3:0', bits: 4, value: 0xA, tone: 'warn' },
              ],
            },
            {
              caption: '0.2 is the same story one exponent up: 0x3FC999999999999A',
              note: '0.2 is exactly twice 0.1, so its bits are 0.1 shifted left by one — same mantissa, exponent 1020. Both operands are slightly above their true values.',
              fields: [
                { label: 'sign', bits: 1, value: 0, tone: 'auto' },
                { label: 'exponent 1020 = -3', bits: 11, value: 1020, tone: 'float' },
                { label: 'm51:44', bits: 8, value: 0x99, tone: 'int' },
                { label: 'm43:36', bits: 8, value: 0x99, tone: 'int' },
                { label: 'm35:28', bits: 8, value: 0x99, tone: 'int' },
                { label: 'm27:20', bits: 8, value: 0x99, tone: 'int' },
                { label: 'm19:12', bits: 8, value: 0x99, tone: 'int' },
                { label: 'm11:4', bits: 8, value: 0x99, tone: 'int' },
                { label: 'm3:0', bits: 4, value: 0xA, tone: 'warn' },
              ],
            },
            {
              caption: 'The exact sum 0.3 is 0.30000000000000001665… and is not representable',
              note: 'Adding the two mantissas needs a 53rd bit, which does not exist. Rounding to nearest gives 0x3FD3333333333333, the double that prints as "0.3" — and it is slightly below the true value.',
              fields: [
                { label: 'sign', bits: 1, value: 0, tone: 'auto' },
                { label: 'exponent 1021 = -2', bits: 11, value: 1021, tone: 'float' },
                { label: 'm51:44', bits: 8, value: 0x33, tone: 'int' },
                { label: 'm43:36', bits: 8, value: 0x33, tone: 'int' },
                { label: 'm35:28', bits: 8, value: 0x33, tone: 'int' },
                { label: 'm27:20', bits: 8, value: 0x33, tone: 'int' },
                { label: 'm19:12', bits: 8, value: 0x33, tone: 'int' },
                { label: 'm11:4', bits: 8, value: 0x33, tone: 'int' },
                { label: 'm3:0', bits: 4, value: 0x3, tone: 'ok' },
              ],
            },
            {
              caption: 'But Python actually stores one unit in the last place more',
              note: 'The addition rounds twice — once inside the mantissa add, once when normalising the exponent — and the two roundings do not cancel. The result is 0x3FD3333333333334, which repr prints as 0.30000000000000004. Nothing is broken; the representation is just honest about the error.',
              fields: [
                { label: 'sign', bits: 1, value: 0, tone: 'auto' },
                { label: 'exponent 1021 = -2', bits: 11, value: 1021, tone: 'float' },
                { label: 'm51:44', bits: 8, value: 0x33, tone: 'int' },
                { label: 'm43:36', bits: 8, value: 0x33, tone: 'int' },
                { label: 'm35:28', bits: 8, value: 0x33, tone: 'int' },
                { label: 'm27:20', bits: 8, value: 0x33, tone: 'int' },
                { label: 'm19:12', bits: 8, value: 0x33, tone: 'int' },
                { label: 'm11:4', bits: 8, value: 0x33, tone: 'int' },
                { label: 'm3:0', bits: 4, value: 0x4, tone: 'bad', note: 'one ULP above 0.3' },
              ],
            },
          ],
        }),
        b.lead('The numeric tower'),
        b.table(
          'Choose the type, not the tolerance',
          ['Type', 'What it really is', 'Typical `sys.getsizeof`', 'Exact?', 'Reach for it when'],
          [
            ['`int`', 'Arbitrary-precision, 4 bytes per 30-bit digit', '28 (small) to thousands', 'Yes', 'Counts, ids, indices, money in minor units, anything you must not lose'],
            ['`bool`', 'A subclass of `int` with exactly two instances', '28 (it *is* an int)', 'Yes', 'Flags and two-state results. Note `True == 1` and `True + True == 2`'],
            ['`float`', 'IEEE-754 binary64: 1 sign + 11 exponent + 52 mantissa', '24', 'No — about 15–17 significant decimal digits', 'Physical measurements, statistics, anything where the input was already approximate'],
            ['`complex`', 'Two floats, real and imaginary', '32', 'No', 'Sign processing, phasors, roots of negative numbers. Rarely needed'],
            ['`decimal.Decimal`', 'Base-10, arbitrary precision, context-controlled', 'variable', 'Yes for the digits you supply', 'Money, invoicing, tax, anything a human will reconcile by hand'],
            ['`fractions.Fraction`', 'Exact rational n/d, auto-reduced', 'variable', 'Yes', 'Ratios, rates, exact unit conversion, symbolic-style simplification'],
          ]
        ),
        b.md(`## The three float libraries, and when each is right

\`\`\`python
import math
from decimal import Decimal, getcontext
from fractions import Fraction

# math: fast, float-based, right for almost everything
print(math.sqrt(2))                 # 1.4142135623730951
print(math.fsum([0.1] * 10))        # 1.0 — compensated summation
print(math.isclose(0.1 + 0.2, 0.3)) # True
print(math.inf, -math.inf)          # inf -inf
print(math.nan)                     # nan
print(math.isnan(math.nan))         # True — the only correct way to test it

# Decimal: base 10, so 0.1 + 0.2 is 0.2
print(Decimal("0.1") + Decimal("0.2"))              # 0.3
print(Decimal(0.1) + Decimal(0.2))                  # 0.3000000000000000166533453694
getcontext().prec = 40
print(Decimal(1) / Decimal(7))                      # 0.1428571428571428571428571428571428571429

# Fraction: exact, never rounds
print(Fraction(1, 3) + Fraction(1, 6))              # 1/2
print(Fraction(1, 10) + Fraction(2, 10) == Fraction(3, 10))  # True
print(Fraction(0.1) + Fraction(0.2) == Fraction(3, 10))      # False
\`\`\`

The three lines worth memorising from that output:

- **\`Decimal("0.1")\` and \`Decimal(0.1)\` are different numbers.** The first is exactly one tenth. The second is the float 0.1 — error and all — converted to its exact decimal expansion. Always build \`Decimal\` from a string or an int.
- \`Fraction\` inherits the error when you hand it a float. \`Fraction("0.1")\` or \`Fraction(1, 10)\` is exact; \`Fraction(0.1)\` is not.
- \`math.fsum\` is the free fix for the accumulation bug. \`sum([0.1]*10)\` gives 0.9999999999999999; \`math.fsum\` gives 1.0. If you are adding many floats, use it.

Performance, honestly: \`Decimal\` is roughly 30x slower than \`float\` for arithmetic, and \`Fraction\` is slower still and grows its numerators. Neither is slow in absolute terms for a few thousand operations. Both are catastrophic inside a tight loop over a million rows. Rule of thumb: parse once into \`Decimal\`, do the arithmetic, and convert to \`float\` or \`str\` at the boundary.

## bool is int, and that is occasionally a gift

\`\`\`python
print(True + True)             # 2
print(int(False))              # 0
print(isinstance(True, int))   # True
print(True == 1)               # True
print([1, True, 0, False])     # [1, True, 0, False] — the repr tells them apart
print(sum([True, True, False]))  # 2 — summing bools counts them

# The gift: any non-empty container can be a count
line = "a,b,c"
print(bool(line.split(",")))   # True — no need to compare against []
\`\`\`

The trap: \`isinstance(x, int)\` is \`True\` for a \`bool\`, so a validation function written as \`if not isinstance(value, int)\` will accept \`True\` as an integer. If that matters, test \`type(value) is int\` or exclude bool explicitly.`),
        b.code(`# The float bugs you will actually hit, and the fixes
import math

prices = [19.99, 4.99, 0.10, 12.50]

print(sum(prices))                      # 37.58
print(f"{sum(prices):.2f}")              # 37.58  — formatting hides the error

# The accumulation bug
acc = 0.0
for _ in range(10):
    acc += 0.1
print(acc)                              # 0.9999999999999999
print(sum([0.1] * 10))                 # 0.9999999999999999 — the same thing
print(math.fsum([0.1] * 10))            # 1.0 — correctly rounded, in one pass
print(math.fsum([0.1] * 3))             # 0.30000000000000004 — the honest answer,
                                         #   not the 0.3 you were hoping for

# The wrong comparison
total = 0.1 + 0.2
print(total == 0.3)                     # False
print(math.isclose(total, 0.3))         # True
print(abs(total - 0.3) < 1e-9)          # True

# The right fix for money: integers all the way through
cents = [1999, 499, 10, 1250]
print(sum(cents) / 100)                 # 37.58  — one division, at the display edge

# Infinity and NaN: comparisons do not do what you expect
n = float("nan")
print(n == n)                           # False
print(n < 1, n > 1)                     # False False
print(math.isnan(n))                    # True
print(1e308 * 10)                       # inf — float overflow does NOT raise
print(1 / 0)                            # ZeroDivisionError — only integers and
                                         # float division by literal zero raise
`, 'float_traps.py'),
        b.tip(
          'When to reach for Decimal',
          'Any time a human with a spreadsheet will check your number. If the answer is money, tax, a quantity of a physical item, or anything with a stated number of decimal places, use `Decimal` built from strings. If it is a physical measurement or a statistical intermediate, use `float` and compare with `math.isclose`. If it is a ratio you will print as a fraction, use `Fraction`.'
        ),
        b.warn(
          'The three ways floats surprise people, ranked by damage',
          '1. Accumulating: `total += 0.1` a thousand times drifts by about 1e-15 per hundred additions. Use `math.fsum` or integers. 2. Rounding at the wrong moment: `round(x, 2)` inside a loop compounds. Round once, at the end. 3. `round(2.675, 2) == 2.67`, because 2.675 is stored as 2.67499999… — bank\'s rounding cannot rescue a value that is not what you think it is.'
        ),
        b.resources('The reference material worth bookmarking', [
          { label: 'The numeric tower — the float section of the language reference', url: 'https://docs.python.org/3/tutorial/floatingpoint.html' },
          { label: 'decimal — fixed-point and floating-point decimal arithmetic', url: 'https://docs.python.org/3/library/decimal.html' },
          { label: 'fractions — rational numbers', url: 'https://docs.python.org/3/library/fractions.html' },
          { label: 'math — the C-level math functions', url: 'https://docs.python.org/3/library/math.html' },
        ]),
      ],
      questions: [
        [
          'Why does `0.1 + 0.2` not equal `0.3` in Python?',
          [
            'Because Python rounds floats to three decimal places',
            'Because 0.1 has no finite binary expansion, so both operands are stored slightly high and the sum lands one unit in the last place above 0.3',
            'Because int and float do not convert in Python',
            'Because 0.2 is parsed as a string when written as a literal',
          ],
          1,
          'One tenth in binary is 0.0001100110011…, which never terminates, so the float is the nearest double — slightly above 0.1. Both operands are high, and the rounded sum lands above 0.3. Compare with `math.isclose`, or use `Decimal` when the value is money.',
        ],
        [
          'What does `round(2.5)` return, and why?',
          [
            '3, because round always rounds half away from zero',
            '2, because Python uses round-half-to-even to match IEEE 754 and avoid bias when rounding repeatedly',
            '3, because 2.5 is stored as slightly more than 2.5',
            'It raises, because round requires an int',
          ],
          1,
          'Python rounds halves to the nearest even value: round(0.5) is 0, round(1.5) is 2, round(2.5) is 2, round(3.5) is 4. IEEE 754 mandates this so that repeatedly rounding a sequence does not drift systematically upward.',
        ],
        [
          'What is the difference between `Decimal("0.1")` and `Decimal(0.1)`?',
          [
            'They are equal, because Decimal parses both forms identically',
            'The first is exactly one tenth; the second is the exact decimal expansion of the float 0.1, including its error',
            'The first is a float and the second is a Decimal',
            'The second raises, because Decimal refuses floats',
          ],
          1,
          '`Decimal` built from a string is exact. `Decimal` built from a float converts the float\'s actual binary value, error and all — which is why `Decimal(0.1) + Decimal(0.2)` is 0.3000000000000000166533453694. Always construct from a string or an integer.',
        ],
        [
          'Which statement about Python `int` is correct?',
          [
            'Ints are fixed at 64 bits and overflow silently on multiplication',
            'Ints are arbitrary precision, but they cost 4 bytes per additional 30 bits and are slower than floats',
            'Ints are arbitrary precision and therefore free',
            'Python automatically promotes an overflowing int to a float',
          ],
          1,
          'There is no overflow — `2 ** 1000` is a perfectly ordinary integer. The cost is memory and time: a CPython int is a 28-byte header plus 4 bytes for every 30-bit digit beyond the first, and large-int operations allocate. Small ints from -5 to 256 are also pre-cached, which is why identity comparisons on them "work".',
        ],
      ],
    },
    {
      title: 'Operators and precedence',
      summary: 'The full precedence table, floor versus true division, what `%` does to negative numbers, and the two power gotchas.',
      duration: 17,
      build: (b) => [
        b.md(`## Precedence, bottom to top

Python has fewer precedence levels than C, and two of them have no C equivalent. Reading the table is the fastest route to never being surprised again.

| Level | Operators | Associativity | Notes |
| --- | --- | --- | --- |
| 1 | \`x **= 2\` … the walrus \`:=\` | right | Lowest precedence of any operator. \`if n := len(s):\` is the canonical use |
| 2 | \`or\` | left | Returns an operand, not a bool |
| 3 | \`and\` | left | Returns an operand, not a bool |
| 4 | \`not x\` | right | Weaker than comparison: \`not a == b\` means \`not (a == b)\` |
| 5 | \`< <= > >= == != in not in is is not\` | left | Comparisons chain: \`a < b < c\` |
| 6 | \`\|\` | left | Bitwise OR |
| 7 | \`^\` | left | Bitwise XOR |
| 8 | \`&\` | left | Bitwise AND |
| 9 | \`<< >> \` | left | Shifts. **Right-shifting a negative int is an arithmetic shift, not logical** |
| 10 | \`+ - \` | left | |
| 11 | \`* / // %\` | left | All four are the same level, evaluated strictly left to right |
| 12 | \`+x -x ~x\` | right | Unary, binds tighter than \`**\` on the left but looser on the right |
| 13 | \`** \` | **right** | Higher than unary on the left: \`-2 ** 2\` is \`-4\` |
| 14 | \`await x\`, \`x[y]\`, \`x(args)\`, \`x.attr\` | left | Indexing, call, attribute, await — tightest of all |

Two rows deserve their own paragraphs.

**Level 11 is a single level.** \`*\`, \`/\`, \`//\` and \`%\` have equal precedence and associate left. This is the single most common precedence bug in Python, because every other language gives \`*\` a stricter binding than \`/\`:

\`\`\`python
print(100 / 10 * 5)   # 50.0  — left to right
print(100 * 5 / 10)   # 50.0  — same value, by luck
print(7 // 2 * 2)     # 6     — floor first, then double
print(1 / 2 / 2)      # 0.25  — left to right, so 0.5 / 2
\`\`\`

**Level 13 is right-associative.** \`2 ** 3 ** 2\` is \`2 ** (3 ** 2) = 512\`, not 64. Almost every other language with \`**\` is left-associative, so this is a genuine porting hazard.

And the level 12/13 interaction produces the classic:

\`\`\`python
print(-2 ** 2)        # -4   — ** binds tighter, so it is -(2 ** 2)
print((-2) ** 2)      # 4
print(2 ** -1)        # 0.5  — a negative exponent is fine on the right
print(-(2 ** 2))     # -4   — the explicit form of -2 ** 2
print(2 ** -2 ** 2)  # 0.0625 — the right chain binds first: 2 ** -(2 ** 2)
\`\`\``),
        b.anim('expression', {
          title: 'Building the tree for `2 ** 3 ** 2 + 17 // 5 % 4`',
          badge: 'precedence in action',
          expression: '2 ** 3 ** 2 + 17 // 5 % 4',
          steps: [
            {
              caption: 'The lowest-precedence operator present splits the expression',
              note: '`+` is looser than everything else here, so the parser builds one `+` node at the root with a power term on the left and a modulo term on the right. Nothing has been computed yet.',
              node: {
                label: 'result',
                children: [
                  { label: 'power term', op: '+', tone: 'code' },
                  { label: 'modulo term', tone: 'code' },
                ],
              },
            },
            {
              caption: '** is right-associative: 2 ** (3 ** 2)',
              note: 'Right-associativity means the *right* `**` collapses first. In C, Java and JavaScript this would be (2 ** 3) ** 2 = 64. In Python it is 2 ** 9 = 512. This is the highest-precedence operator and it is the one that catches people.',
              node: {
                label: 'result',
                children: [
                  { label: '2 ** 9', op: '+', tone: 'code' },
                  { label: '(17 // 5) % 4' },
                ],
              },
            },
            {
              caption: '// and % share one level and go left to right',
              note: '17 // 5 evaluates to 3 first, then 3 % 4. Rewriting as `17 % 5 // 4` gives a different answer — 2 // 4 = 0 — because at this level the order of the symbols does not matter, only their positions.',
              node: {
                label: 'result',
                children: [
                  { label: '2 ** 9', op: '+', tone: 'code' },
                  { label: '3 % 4', tone: 'code' },
                ],
              },
            },
            {
              caption: 'Evaluate the power term',
              note: '2 ** 9 is exactly 512, an int, because integer exponentiation with a non-negative exponent is exact in Python. There is no overflow and no float promotion.',
              node: {
                label: 'result',
                children: [
                  { label: '512', op: '+', tone: 'int', note: 'exact' },
                  { label: '3 % 4' },
                ],
              },
            },
            {
              caption: 'Evaluate the modulo term, then add',
              note: '3 % 4 is 3, because the remainder is always smaller than the divisor. Final value 515, an int — no decimal point anywhere, because `/` was never used.',
              node: {
                label: 'result',
                children: [
                  { label: '512', op: '+', tone: 'int' },
                  { label: '3', tone: 'int' },
                ],
              },
              result: '515',
            },
          ],
        }),
        b.lead('Division, modulo, and the negatives'),
        b.md(`## Four division operators, and they disagree about negative numbers

\`\`\`python
print(7 / 2)        # 3.5   true division, always, and always a float for int/int
print(7 // 2)       # 3     floor division
print(7 % 2)        # 1     remainder
print(divmod(7, 2))  # (3, 1)  — both, computed once

# The negatives, which is where every language disagrees with every other
print(-7 / 2)       # -3.5
print(-7 // 2)      # -4    floor, not truncation: rounds DOWN, toward -inf
print(7 // -2)      # -4
print(-7 % 2)       # 1     sign follows the DIVISOR
print(7 % -2)       # -1
print(divmod(-7, 2))  # (-4, 1)
\`\`\`

The rule is: \`a == (a // b) * b + (a % b)\`, and \`a % b\` always has the **sign of the divisor**. Python's \`//\` floors toward negative infinity, while C's \`/\` truncates toward zero — so \`-7 / 2\` is \`-3\` in C and \`-3.5\` in Python, and a ported C loop counting down from 5 to \`> 0\` becomes a different loop when you change the bound to \`>= 0\`.

Two more that catch people:

\`\`\`python
print(7.0 // 2)     # 3.0  — floor division on floats gives a float
print(1.0 // 0.1)   # 9.0  — 0.1 is not 0.1, so ten of them overshoot 1.0
print(1 / 0.0)      # ZeroDivisionError — literal float zero also raises
print(10 ** 400 % 7)  # 4  — int power is exact, so the modulo is meaningful
\`\`\`

\`1.0 // 0.1 == 9.0\` is the classic. The true quotient is 10, but each 0.1 is a hair above the real thing, so ten of them are a hair *below* 1.0, and the floor is 9. If you need exact division, use \`int\`, \`Decimal\`, or \`Fraction\`.

## Bitwise operators

They work on \`int\` bit patterns and are unchanged from C, with one Python-specific behaviour on the right shift:

\`\`\`python
print(0b1100 & 0b1010)   # 8   1000
print(0b1100 | 0b1010)   # 14  1110
print(0b1100 ^ 0b1010)   # 6   0110
print(~5)                # -6   ~n == -n - 1, for every n
print(1 << 10)           # 1024
print(-1 >> 1)           # -1   arithmetic shift: sign-extends
print(255 >> 4)          # 15   logical, because 255 is positive

print((5).bit_length())          # 3
print(bin(255))                  # '0b11111111'
print(hex(255))                  # '0xff'
print((255).to_bytes(2, "big"))  # b'\\x00\\xff'  — 2 bytes, most significant first
print(int.from_bytes(b"\\x00\\xff", "big"))  # 255
\`\`\`

The \`to_bytes\` / \`from_bytes\` pair is the bridge to the \`bytes\` world you meet in module 4, and it is how you write a binary protocol by hand. Note \`~n == -n - 1\`, not \`-n\`: that is the same identity as in C, and it is why \`~x\` is not "bitwise not, magnitude preserved".

## Augmented assignment is not always what it looks like

\`\`\`python
original = [1, 2, 3]

alias = original
alias += [4]            # __iadd__ is defined for list: extends IN PLACE
print(original)         # [1, 2, 3, 4]  — the caller's list changed

rebound = original
rebound = rebound + [5]  # __add__ builds a NEW list and rebinds the name
print(rebound)          # [1, 2, 3, 4, 5]
print(original)         # [1, 2, 3, 4]   — untouched
\`\`\`

For \`int\`, \`str\`, \`tuple\`, \`frozenset\` and \`bytes\` this distinction is invisible because they are immutable, so \`+=\` and \`= x + \` produce the same result. For \`list\`, \`dict\`, \`set\` and most of your own classes, it is the difference between mutating a shared object and quietly leaving it alone. When in doubt, write the long form.

\`\`\`python
count += 1        # fine: int is immutable
buffer += chunk   # CAREFUL: bytearray grows in place; if it is shared, so is the surprise
\`\`\``),
        b.diagram(
          'Precedence as a ladder: the top wins, and the rungs that trip people are marked',
          `flowchart TD
    A["tightest: call, subscript, attribute, await"] --> B["** — power, RIGHT associative"]
    B --> C["unary +x, -x, ~x"]
    C --> D["* / // % — ONE level, strictly left to right"]
    D --> E["+ and -"]
    E --> F["<< >>"]
    F --> G["&"]
    G --> H["^"]
    H --> I["|"]
    I --> J["comparisons, in, is"]
    J --> K["not"]
    K --> L["and — returns an operand"]
    L --> M["or — returns an operand"]
    M --> N["loosest: the walrus :="]`
        ),
        b.table(
          'The operators that behave differently from C',
          ['Expression', 'C would give', 'Python gives', 'Why'],
          [
            ['`7 / 2`', '3 (integer division)', '3.5', '`/` is always true division in Python; use `//` for the C behaviour'],
            ['`-7 / 2`', '-3 (truncation toward zero)', '-3.5', '`/` never truncates for `int` operands'],
            ['`-7 // 2`', '-3', '-4', '`//` floors toward negative infinity, which is what the modulo identity requires'],
            ['`-7 % 2`', '-1', '1', 'The remainder takes the sign of the divisor so that `a == (a//b)*b + (a % b)`'],
            ['`2 ** 3 ** 2`', '64 (left-assoc)', '512 (right-assoc)', '`**` is the only right-associative binary operator in Python'],
            ['`-2 ** 2`', 'undefined / compile error', '-4', '`**` binds tighter than unary minus on its left'],
            ['`~5`', '-6', '-6', 'Same identity, but worth stating: `~n == -n - 1`'],
            ['`1 << 1000`', 'undefined behaviour', 'a 1000-bit int', 'Ints are arbitrary precision, so the shift is well defined'],
            ['`not a == b`', 'n/a', '`not (a == b)`', '`not` is looser than comparison, unlike C where `!` is tight'],
          ]
        ),
        b.info(
          'How to settle any precedence question in ten seconds',
          'Parenthesise it. Python will not complain about redundant parentheses, every major formatter keeps them, and `black` will not add or remove them. Code that needs a precedence table to be understood is code that should have had a pair of brackets. The one place to be careful is a huge chain of comparisons or boolean operators — that is a sign the expression should have been several statements or a named boolean.'
        ),
        b.warn(
          'The one precedence bug that ships',
          '`total = width * height / dpi` is fine. `mask = 1 << bits | flags` is fine. The one that reaches production is almost always `if 0 <= index < len(items):` being misread as `0 <= index` and then comparing `len(items)` to something. Chained comparisons are correct and useful — but if you have ever wondered about them, the fix is one pair of parentheses and a comment, not a mental model.'
        ),
      ],
      questions: [
        [
          'What is `2 ** 3 ** 2` in Python?',
          ['64, because ** is left-associative', '512, because ** is right-associative', 'A SyntaxError, because ** cannot chain', '8, because ** evaluates left to right like *'],
          1,
          '`**` is the only right-associative binary operator in Python: 2 ** (3 ** 2) = 2 ** 9 = 512. C, Java, JavaScript and Rust all give 64 because they make it left-associative, so this is a genuine porting hazard.',
        ],
        [
          'What does `-7 // 2` evaluate to, and why?',
          [
            '-3, because integer division truncates toward zero',
            '-4, because floor division rounds toward negative infinity',
            '3, because the sign of the divisor wins',
            'A TypeError, because // does not accept negative operands',
          ],
          1,
          'Floor division rounds down, and for a negative operand "down" means further from zero. This is not arbitrary: it is what makes `a == (a // b) * b + (a % b)` hold for every sign combination, and it is why `-7 % 2` is 1 rather than -1.',
        ],
        [
          'Which comparison is true about the `/` operator on two ints in Python?',
          [
            'It performs integer division, like C',
            'It performs true division and returns a float, like 7 / 2 == 3.5',
            'It raises TypeError for int operands',
            'It returns an int rounded toward zero',
          ],
          1,
          'Python removed the C footgun entirely: `/` always does true division, so `7 / 2` is 3.5. To get integer behaviour you ask for it with `//` (floor) or `%` (remainder), and `divmod()` gives you both in one pass.',
        ],
        [
          'Given `a = [1]; b = a; b += [2]`, what is `a`?',
          [
            '[1], because += always rebinds the name to a new object',
            '[1, 2], because list defines __iadd__, which extends the list in place',
            'A TypeError, because lists cannot be augmented',
            '[1, 2] but b is a different object with the same contents',
          ],
          1,
          'For mutable types, `x += y` calls `__iadd__`, which for list extends in place and returns the same object — so a and b remain one object with two names. Writing `b = b + [2]` instead would build a new list and leave a alone. For immutable types the two forms are indistinguishable.',
        ],
      ],
    },
    {
      title: 'Comparisons, chaining and truthiness',
      summary: 'Chained comparisons and how they short-circuit, why and/or return operands, and the complete table of what counts as false.',
      duration: 16,
      build: (b) => [
        b.md(`## Three ways to ask

\`\`\`python
a == b      # equal by VALUE, using whatever __eq__ the left operand defines
a is b      # the SAME object, compared by identity (id())
a in b      # containment: b's __contains__, falling back to a scan over __iter__
\`\`\`

Use \`==\` for almost everything. Use \`is\` for exactly two things: testing against \`None\` and the other sentinels (\`...\`, \`NotImplemented\`), and asking whether two names point at the same object. Use \`in\` for membership in any container.

\`is\` on literals is where it goes wrong, because CPython interns some objects and not others:

\`\`\`python
print([] is [])          # False — every list literal is a fresh object
print(() is ())          # True  — the empty tuple is a singleton
print(None is None)      # True  — None is a singleton
print("a" is "a")        # True  — short string literals are interned
print(f"a" is f"a")      # True  — in CPython, f-strings of literals are interned
print(str(1000) is str(1000))  # False — computed at runtime, not a constant
print(256 is 256)        # True  — small ints are pre-cached
\`\`\`

None of that is guaranteed, and none of it is a test you should write. The rules that are guaranteed: \`is None\`, \`is not None\`, \`is Ellipsis\`, \`is NotImplemented\`, and \`type(x) is int\` when you truly want an exact type check rather than \`isinstance\`.

## Chained comparisons short-circuit, and evaluate the middle once

\`\`\`python
print(1 < 2 < 3)         # True
print(3 < 2 < 10)        # False — 3 < 2 already failed
print(1 < 2 < 0)         # False — 2 < 0 failed, even though 1 < 2 was True
\`\`\`

This is not a convenience. \`a < b < c\` is compiled to roughly \`a < b and b < c\` **with \`b\` evaluated only once**, and the second comparison is not evaluated at all if the first fails. That is not true of the equivalent rewrite, and it is not true in most other languages.

\`\`\`python
def noisy(n):
    print(f"  evaluating {n}")
    return n


noisy(5) < noisy(3) < noisy(9)
#   evaluating 5
#   evaluating 3        <- 5 < 3 is False, so 9 is never looked at
# False
\`\`\`

The rewrite \`noisy(5) < noisy(3) and noisy(3) < noisy(9)\` calls \`noisy(3)\` **twice**. If it is an expensive lookup, a regex, or a database call, the chain is not a stylistic nicety — it is a correctness and performance property.

## and, or and not return operands, not booleans

This is the fact that trips up experienced C programmers, because in C \`&&\` and \`||\` always yield 0 or 1. In Python they yield **one of their operands**, and they yield as soon as the answer is known:

\`\`\`python
print(True and "reached")      # 'reached'  — returns the right operand
print(0 and "unreachable")     # 0         — returns the left operand
print(1 or "unreachable")      # 1
print([] or "default")         # 'default'
print(0 or "default")          # 'default'
print(0.0 or "default")        # 'default'
print("" or []) or "d")        # 'd'

def pick(config):
    return config.get("host") or "localhost"      # idiomatic default

def bad_pick(port):
    return port or 8080        # WRONG: port=0 silently becomes 8080
\`\`\`

The reason is evaluation cost, not politeness. \`and\` must return its right operand when the left is truthy, and \`or\` must return its right operand when the left is falsy, so for consistency they return the left one in the other case too. It also means these are **control-flow operators**: the right-hand side is a guard.

\`\`\`python
if user is not None and user.is_admin and user.account.active:
    ...      # each condition is only evaluated if the previous one passed

# The real reason the short circuit exists: protection, not speed.
result = data["rows"] and data["rows"][0]["id"]   # no KeyError if rows is empty
\`\`\`

But note the trap in the \`or\` default idiom: it treats *any* falsy value as absent. \`0\`, \`0.0\`, \`""\`, \`[]\`, \`set()\` and \`False\` are all falsy, so \`port or 8080\` rewrites a legitimate port 0 into 8080. When absence and zero must be distinguished, test explicitly:

\`\`\`python
host = config.get("host")
if host is None:
    host = "localhost"
\`\`\``),
        b.anim('trace', {
          title: 'Short-circuit evaluation: the right side never runs',
          badge: 'and / or',
          code: `# short_circuit.py
def is_valid_ratio(a, b):
    nonzero = b != 0
    return nonzero and a / b != float("inf")


print(is_valid_ratio(1, 0))
print(is_valid_ratio(10, 0))
print(is_valid_ratio(10, 2))`,
          steps: [
            {
              caption: 'The def binds a name; nothing has run yet',
              note: 'is_valid_ratio is a function object. No locals exist until it is called.',
              line: 2,
              vars: [{ name: 'is_valid_ratio', value: '<function>', tone: 'code' }],
              output: '',
            },
            {
              caption: 'First call: a = 1, b = 0',
              note: 'The arguments are objects passed in. The function has its own names for them, which is why it cannot change the caller\'s variables.',
              line: 7,
              vars: [
                { name: 'a', value: '1', tone: 'int' },
                { name: 'b', value: '0', tone: 'int' },
              ],
            },
            {
              caption: 'nonzero = (b != 0) evaluates to False',
              note: 'A comparison always produces a real bool, never the operand. Only and/or/not return operands.',
              line: 3,
              vars: [
                { name: 'a', value: '1', tone: 'int' },
                { name: 'b', value: '0', tone: 'int' },
                { name: 'nonzero', value: 'False', tone: 'warn' },
              ],
            },
            {
              caption: 'and sees a falsy left operand and returns it',
              note: 'The right operand — a / b — is never evaluated. That is what stops this from raising ZeroDivisionError. The function returns the operand False, which is also a perfectly good return value.',
              line: 4,
              vars: [
                { name: 'a', value: '1', tone: 'int' },
                { name: 'b', value: '0', tone: 'int' },
                { name: 'nonzero', value: 'False', tone: 'warn' },
                { name: 'returned', value: 'False (left operand)', tone: 'ok' },
              ],
              output: 'False',
            },
            {
              caption: 'Second call: a = 10, b = 0 — same short circuit',
              note: 'This is the interesting one. Naively written, a / b would raise ZeroDivisionError here. It does not, because and never evaluated it.',
              line: 8,
              vars: [
                { name: 'a', value: '10', tone: 'int' },
                { name: 'b', value: '0', tone: 'int' },
                { name: 'nonzero', value: 'False', tone: 'warn' },
              ],
              output: 'False',
            },
            {
              caption: 'Third call: a = 10, b = 2 — now the left operand is truthy',
              note: 'nonzero is True, so and is obliged to evaluate its right operand in order to return it. The guard has opened.',
              line: 3,
              vars: [
                { name: 'a', value: '10', tone: 'int' },
                { name: 'b', value: '2', tone: 'int' },
                { name: 'nonzero', value: 'True', tone: 'ok' },
              ],
            },
            {
              caption: 'a / b runs: 10 / 2 is 5.0, and 5.0 != inf is True',
              note: 'The comparison produces a bool, but `and` returns *that* operand — which happens to be a bool here, so the caller cannot tell the difference. Rewrite the expression with `0` on the left and the truthiness is suddenly visible.',
              line: 4,
              vars: [
                { name: 'a', value: '10', tone: 'int' },
                { name: 'b', value: '2', tone: 'int' },
                { name: 'nonzero', value: 'True', tone: 'ok' },
                { name: 'a / b', value: '5.0', tone: 'float' },
                { name: 'returned', value: 'True', tone: 'ok' },
              ],
              output: 'True',
            },
          ],
        }),
        b.lead('The complete truthiness table'),
        b.table(
          'Every falsy value in Python',
          ['Value', 'bool(v)', 'Why anyone should care'],
          [
            ['`False`', 'False', 'The literal. Also `0` and `0.0`, which compare equal to it'],
            ['`None`', 'False', 'The "no value" marker. Test it with `is None`, not `not v` — `not 0` and `not []` are also True'],
            ['`0`', 'False', 'Any numeric zero: `0`, `0.0`, `0j`, `Decimal("0")`, `Fraction(0)`. Only zero. Not `"0"`, and not `0.1`'],
            ['`""`', 'False', 'The empty string only. `" "` and `"0"` are both truthy, which is why `if text:` and `if text.strip():` differ'],
            ['`[]`, `()`, `{}`, `set()`', 'False', 'Every empty container. A populated one is always truthy, even `[0]` or `""`'],
            ['`float("nan")`', '**True**', 'The one that surprises people. `bool(nan)` is True even though `nan == nan` is False. Use `math.isnan`'],
            ['your own class instance', 'True', 'Unless you define `__bool__` or `__len__`. `bool(Basket())` is True for an empty basket unless you say otherwise'],
            ['a bound method, a class, a module', 'True', 'Anything that is not `None` and is not a number zero, an empty string or an empty container'],
          ]
        ),
        b.md(`## Membership, and the operator that is not what it looks like

\`\`\`python
print("a" in "cat")              # True  — substring for strings
print("at" in "cat")             # True
print(2 in [1, 2, 3])            # True
print(2 in (1, 2, 3))            # True
print("k" in {"k": 1})           # True  — keys, not values
print(1 in {"k": 1}.values())    # True  — .values() to search by value
print(2 not in {1: "a"})         # True  — dict membership tests keys

# range is a real sequence and does not build a list
print(999_999_999 in range(10**9))  # True, in O(1) and with no memory used
print(len(range(10**9)))              # 1000000000
\`\`\`

\`in\` on a \`dict\` is the quiet bug of the set: \`if user_id in users\` on a dict of objects is checking keys, so a value object will never be found. Use \`in users.values()\`, or invert the structure.

## The full comparison operator list

\`\`\`python
print(3 == 3.0)            # True — == compares numerically across numeric types
print(3 is 3.0)            # False — different objects, different types
print([1, 2] == [1, 2])    # True — list defines __eq__ elementwise
print((1, 2) == (1, 2))    # True
print({1: 2} == {1: 2})    # True
print({1, 2} == {2, 1})    # True — sets are unordered
print((1, 2) == [1, 2])    # False — tuple is not list
print(1 != 2)              # the negation of ==
print(1 < 2 < 3 < 4 < 5)   # chaining all the way
\`\`\`

Note \`3 == 3.0\` is True while \`3 is 3.0\` is False. \`==\` asks "do these two objects consider themselves equal", and \`int\` and \`float\` both say yes because 3.0 is exactly 3. \`is\` asks "are these the same object", and they are not — they are different types with different sizes.`),
        b.code(`# Truthiness in anger: the four bugs it causes
def handle(config, user_input, items, price):
    # 1. A legitimate 0 is treated as "not configured".
    port = config.get("port") or 8080          # port=0 silently becomes 8080
    assert port == config.get("port") or config.get("port") == 0

    # The correct form distinguishes missing from zero.
    port = config["port"] if config.get("port") is not None else 8080

    # 2. A whitespace-only string is truthy, so the guard never fires.
    name = (user_input or "").strip()
    if name:                                    # correct
        ...
    if user_input:                              # wrong: "   " passes
        ...

    # 3. Bare "not" on a container checks emptiness, which is usually the intent.
    if not items:
        raise ValueError("nothing to do")
    if not 0 < price < 100:                     # chained: both bounds checked
        raise ValueError(f"price out of range: {price}")

    # 4. An empty container is falsy even when it contains only falsy things.
    print(bool([0]), bool("0"), bool([[]]))      # True True True
    print(bool([0.0]), bool([None]))            # True True


handle({"port": 0}, "   ", ["milk"], 50)        # runs all the way through
handle({"port": 0}, "   ", [], 50)              # ValueError: nothing to do
`, 'truthiness_bugs.py'),
        b.tip(
          'The rule that prevents all four',
          'If you are using truthiness to mean "present", test for the thing you actually mean. `is None` for absence, `.strip()` for a non-blank string, an explicit `0 < x` for a range check. Reserve bare `if value:` for the case where you genuinely do mean "is this object empty or zero-ish" — which, in a well-written program, is more often than people expect.'
        ),
        b.info(
          'Why `and` returns an operand, and where that is genuinely useful',
          'The design falls out of wanting `and` and `or` to short-circuit without a second type: the natural value of `a and b` is "a if a is falsey, otherwise b", which needs no coercion and no extra branch. The payoff is three idioms that have no direct equivalent elsewhere — the `x or default` fallback, the `maybe_callable and maybe_callable()` guard, and the `container and container[0]` peek. All three become worse code the moment you wrap them in `bool()`, because you throw away the value you just computed.'
        ),
      ],
      questions: [
        [
          'What does `[] or "default"` evaluate to, and why?',
          [
            'False, because an empty list is falsy',
            '"default", because or returns its right operand when the left one is falsy',
            'An empty list, because or returns its left operand when it is falsy',
            'A TypeError, because or requires bools',
          ],
          1,
          '`or` returns its right operand when the left is falsy, and its left operand otherwise. Since `[]` is falsy, the right operand is returned. Note the corollary: because `0` and `""` are also falsy, `port or 8080` will rewrite a legitimate port 0.',
        ],
        [
          'Why is `a < b < c` not the same as `a < b and b < c`?',
          [
            'It is the same, except for operator precedence',
            'The chained form evaluates b once and skips c entirely if the first comparison fails; the rewritten form evaluates b twice',
            'The chained form allows mixed types that and does not',
            'The chained form returns a bool, while and returns an operand',
          ],
          1,
          '`a < b < c` compiles to a single chained comparison: b is loaded once, the second comparison is only attempted if the first succeeded. The manual rewrite re-evaluates b, which is invisible for a variable and expensive for a function call or a dict lookup.',
        ],
        [
          'Which value is truthy in Python?',
          ['`[]`', '`""`', '`float("nan")`', '`0.0`'],
          2,
          '`bool(float("nan"))` is True. Only `None`, `False`, numeric zero, the empty string and empty containers are falsy. NaN is truthy even though every comparison involving it is False, so you must test it with `math.isnan`.',
        ],
        [
          'When is `is` the right operator to use?',
          [
            'When comparing two numbers that may be different types, like 1 and 1.0',
            'When testing whether a value is None, or whether two names refer to the same object',
            'When comparing strings, since it avoids the cost of __eq__',
            'Whenever you want a slightly faster equality check',
          ],
          1,
          '`is` compares identity, not value. It is correct for the sentinels — None, Ellipsis, NotImplemented — and for asking whether two names share one object. For numbers, strings and containers it is wrong or undefined: `1 is 1.0` is False even though `1 == 1.0` is True, and `is` on computed strings can be False while `==` is True.',
        ],
      ],
    },
  ]
);
