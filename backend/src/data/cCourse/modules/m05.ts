// Module 5 — Operators and expressions.
// C has a small, flat operator set with no operator overloading, which is a
// gift: the meaning of `+` never changes. The cost is that precedence and
// promotion are invisible unless you were taught them deliberately.

import { mod } from '../blocks';

export const M5 = mod(
  'crs-c-programming',
  'c-m5',
  5,
  'Module 5 — Operators and Expressions',
  'Arithmetic, comparison, logic, bitwise, and the precedence table you will need for the rest of your life.',
  [
    {
      title: 'Arithmetic operators and the two division traps',
      summary: '+ - * / %, integer vs floating division, negative results, and the modulo that surprises everyone.',
      duration: 15,
      build: (b) => [
        b.md(`## The seven arithmetic operators

| Operator | Meaning | Works on |
| --- | --- | --- |
| \`+\` | add | integers, floating point |
| \`-\` | subtract | integers, floating point |
| \`*\` | multiply | integers, floating point |
| \`/\` | divide | integers, floating point |
| \`%\` | remainder (modulo) | **integers only** |
| \`+\` unary | identity | |
| \`-\` unary | negation | |

## Trap 1: \`/\` on two integers is integer division

The result is truncated **toward zero**. The fraction is discarded; it is not rounded.

\`\`\`c
printf("%d\\n", 7 / 2);      /* 3 */
printf("%g\\n", 7 / 2.0);    /* 3.5 */
printf("%d\\n", 7.0 / 2);    /* 3.5 — the result is a double, printed as int-ish */

int a = 7, b = 2;
double wrong = a / b;         /* 3.0 — the division already happened as int */
double right = (double)a / b; /* 3.5 */
\`\`\`

That third line is the classic: \`a / b\` is evaluated as integer division producing \`3\`, and only *then* is \`3\` converted to \`3.0\` for the assignment. The precision is already gone.

**The fix is to convert before you divide**, not after:

\`\`\`c
double right = (double) a / b;              /* correct */
double alt   = a / (double) b;              /* also correct */
double best  = (double)(a / b);             /* WRONG — too late */
\`\`\`

## Trap 2: \`%\` does not work on floating point

\`\`\`c
double d = 7.5;
int r = d % 2;      /* ERROR: invalid operands to binary % */
\`\`\`

\`%\` is defined only for integer types. For floating point, use \`fmod\` from \`<math.h>\`:

\`\`\`c
#include <math.h>
double r = fmod(d, 2.0);
\`\`\`

## Negative results: truncation is toward zero

This is the second surprise, and it differs from most maths conventions and from Python.

\`\`\`c
7 / 2      /*  3 */
-7 / 2     /* -3  (NOT -4) */
7 / -2     /* -3  (NOT -4) */
-7 / -2    /*  3 */

7 % 2      /*  1 */
-7 % 2     /* -1 */
7 % -2     /*  1 */
-7 % -2    /* -1 */
\`\`\`

C99 requires truncation toward zero for \`/\`, and \`a % b\` is defined so that \`(a / b) * b + a % b == a\` exactly. So \`-7 % 2 == -1\`, because \`-3 * 2 + -1 == -7\`.

If you want Euclidean-style always-non-negative modulo:

\`\`\`c
int mod = a % b;
if (mod < 0) mod += b;     /* only correct if b > 0 */
\`\`\`

## Division by zero

\`\`\`c
int z = 0;
printf("%d\\n", 5 / z);    /* undefined behaviour — NOT an exception,
                              NOT infinity, NOT a crash you can catch */
\`\`\`

Integer division by zero is **undefined behaviour**. It does not raise an error you can handle. On x86 it usually raises a hardware exception that terminates the process, but the standard permits anything.

Floating point division by zero *is* defined: it produces infinity (or NaN for \`0.0 / 0.0\`). You can check with \`isinf\` and \`isnan\` from \`<math.h>\`.

For integer division, check first:

\`\`\`c
if (b == 0) {
    fprintf(stderr, "Error: division by zero\\n");
    return 1;
}
int q = a / b;
\`\`\`

## Overflow on \`*\` too

\`\`\`c
int big = 100000;
int huge = big * big;      /* 10,000,000,000 does not fit in int — UB */
\`\`\`

The same rule as Module 4: unsigned wraps (defined), signed is undefined behaviour.

## Compound assignment

\`\`\`c
int x = 10;

x += 5;    /* x = x + 5  -> 15 */
x -= 3;    /* x = x - 3  -> 12 */
x *= 2;    /* x = x * 2  -> 24 */
x /= 4;    /* x = x / 4  -> 6 */
x %= 4;    /* x = x % 4  -> 2 */

x <<= 1;   /* x = x << 1 -> 4 */
x >>= 1;   /* x = x >> 1 -> 2 */
x &= 0x0F; /* x = x & 15 -> 2 */
x |= 0x10; /* x = x | 16 -> 18 */
x ^= 0x11; /* x = x ^ 17 -> 3 */
\`\`\`

Two useful properties: \`x += 10\` is a single operation, and unlike \`x = x + 10\` the variable \`x\` is read only once. That matters when \`x\` is a pointer to memory that the operation itself modifies — \`*p += 1\` where \`p\` points into an array is safe, and writing \`*p = *p + 1\` is also safe but does two dereferences.

## Increment and decrement

\`\`\`c
int i = 5;
i++;    /* i becomes 6; the value of the expression is the OLD i (5) */
++i;    /* i becomes 7; the value of the expression is the NEW i (7) */
\`\`\`

The difference only shows up when the value is used:

\`\`\`c
int i = 5;
printf("%d %d\\n", i++, i);     /* UNDEFINED BEHAVIOUR.
                                    Modifying i and reading it in the same
                                    expression with no sequencing point. */

int a = 5, b = 6;
printf("%d %d\\n", a++, b);     /* fine: two separate variables */
\`\`\`

\`printf("%d %d", i++, i++)\` is undefined behaviour and every C textbook says so. The sequence point rules that made this legal in C89 were removed in C99; C11 reintroduced the concept of *sequenced before* for exactly this kind of question. The practical rule: **never have two modifications of the same variable in one expression, and never read a variable in an expression that also modifies it.**`),
        b.anim('trace', {
          title: 'Integer division and the modulo that surprises',
          badge: 'step through',
          code: `int a = 7;
int b = 2;

int q1 = a / b;
int q2 = a % b;

int c = -7;
int q3 = c / b;
int q4 = c % b;

double d1 = a / b;
double d2 = (double)a / b;`,
          steps: [
            {
              line: 1,
              caption: 'Two ints. Every division between them is integer division, and every % is a remainder.',
              vars: [
                { name: 'a', value: '7 (int)', tone: 'int' },
                { name: 'b', value: '2 (int)', tone: 'int' },
              ],
            },
            {
              line: 3,
              caption: '7 / 2 = 3. The remainder is discarded, not rounded. Truncation is toward zero.',
              note: '3 * 2 + 1 == 7, which is exactly what % gives you.',
              vars: [
                { name: 'q1 = a / b', value: '3', tone: 'int' },
                { name: 'q2 = a % b', value: '1', tone: 'int' },
              ],
            },
            {
              line: 6,
              caption: 'Now with a negative numerator: -7 / 2 = -3, not -4. C truncates toward zero, not toward negative infinity.',
              note: 'Most maths conventions and most other languages round down here. C is the odd one out, and it is deliberate — the rule is what makes (a/b)*b + a%b == a hold exactly for negatives too.',
              vars: [
                { name: 'q3 = c / b', value: '-3', tone: 'warn' },
                { name: 'q4 = c % b', value: '-1', tone: 'warn' },
              ],
            },
            {
              line: 7,
              caption: 'Check it: (-3) * 2 + (-1) = -7. The identity holds, which is the whole point of the rule.',
              vars: [{ name: 'verify', value: '-3*2 + -1 == -7', tone: 'ok' }],
            },
            {
              line: 9,
              caption: 'd1 = a / b is still 3. The integer division already happened; the result is then widened to double.',
              note: 'This is the bug. The precision was lost before the assignment ever ran.',
              vars: [{ name: 'd1', value: '3.0 (double)', tone: 'bad' }],
            },
            {
              line: 10,
              caption: 'd2 = (double)a / b converts a FIRST, so the division happens in double: 3.5.',
              note: 'Casting one operand before the operation promotes the whole expression. Casting the result is too late.',
              vars: [{ name: 'd2', value: '3.5 (double)', tone: 'ok' }],
            },
          ],
        }),
        b.lead('Integer vs floating arithmetic, side by side'),
        b.table(
          'Same expression, different types',
          ['Expression', 'Types', 'Result', 'Why'],
          [
            ['7 / 2', 'int, int', '3', 'Integer division, truncated'],
            ['7 / 2.0', 'int, double', '3.5', 'double wins the usual arithmetic conversion'],
            ['7.0 / 2', 'double, int', '3.5', 'Same rule'],
            ['(double)7 / 2', 'double, int', '3.5', 'Explicit promotion before the operation'],
            ['7 % 2', 'int, int', '1', 'Remainder of the integer division'],
            ['7.0 % 2', 'double, int', 'compile error', '% is integer-only'],
            ['-7 / 2', 'int, int', '-3', 'Truncates toward zero'],
            ['-7 % 2', 'int, int', '-1', 'So that (a/b)*b + a%b == a'],
          ]
        ),
        b.tip(
          'A compiler warning worth turning on',
          '`-Wconversion` warns on every implicit narrowing — assigning a double to an int, a long to an int, and so on. It is noisy for a while and then it becomes one of your most valuable flags, because every message is a place where a value could silently change.',
        ),
        b.warn(
          'i++ and ++i are not interchangeable',
          'They differ only in whether the expression yields the old or the new value. If you never use the value of the expression, use `++i` by convention: in C it costs nothing either way, but in C++ `i++` returns a copy and the convention survives porting.',
        ),
      ],
      questions: [
        [
          'What is the value of `7 / 2` and `7 % 2`?',
          [
            '3.5 and 0.5',
            '3 and 1',
            '3 and 2',
            '4 and 0',
          ],
          1,
          'Both operands are int, so `/` is integer division: 3, with remainder 1. The fractional part is discarded, not rounded.',
        ],
        [
          'What is `-7 / 2` in C?',
          [
            '-4, because C rounds toward negative infinity',
            '-3, because C truncates toward zero',
            '-3.5, because / is real division',
            'Undefined behaviour',
          ],
          1,
          'C99 requires truncation toward zero. This differs from Python, which floors. The rule exists so that (a/b)*b + a%b == a holds for negative operands too.',
        ],
        [
          'Why does `double d = a / b;` sometimes give the wrong answer for int a and b?',
          [
            'Because double has less precision than int',
            'Because a / b is evaluated as int first, truncating the fraction, and only then converted to double',
            'Because a and b must be declared as double',
            'It never gives the wrong answer',
          ],
          1,
          'The conversion happens at the assignment, after the division. You must promote an operand before the operation: (double)a / b.',
        ],
        [
          'What happens with `int z = 0; double r = 5 / z;`?',
          [
            'r becomes infinity',
            'It is undefined behaviour, because integer division by zero has no defined result',
            'A runtime exception is raised and can be caught',
            'r becomes 0',
          ],
          1,
          'Integer division by zero is undefined behaviour. Floating point division by zero is different and does produce infinity — 5.0 / 0.0 is inf.',
        ],
        [
          'What is wrong with `printf("%d %d", i++, i);`?',
          [
            'Nothing, the order is defined',
            'i is modified and read in the same expression with no sequencing, which is undefined behaviour',
            'i++ does not work in a function argument',
            'The format string is wrong',
          ],
          1,
          'Between two sequence points you may modify a variable at most once and may not both modify and read it. With -Wall, GCC reports this as a warning.',
        ],
        [
          'Why does `7.0 % 2` fail to compile?',
          [
            '% is not a C operator',
            '% is defined only for integer operands; use fmod() from <math.h> for floating point',
            'The operands must both be integers of the same type',
            'It works but gives the wrong answer',
          ],
          1,
          'The modulo operator is defined for integer types only. fmod(7.0, 2.0) is the floating-point equivalent.',
        ],
      ],
    },
    {
      title: 'Comparison, logic, and short-circuit evaluation',
      summary: '< > <= >= == !=, && || !, and why && and || are not just boolean operators.',
      duration: 15,
      build: (b) => [
        b.md(`## The comparison operators

\`\`\`c
a == b    /* equal */
a != b    /* not equal */
a <  b    /* less than     */
a >  b    /* greater than  */
a <= b    /* less or equal */
a >= b    /* greater or equal */
\`\`\`

Each produces an \`int\`: **1 for true, 0 for false**. There is no \`bool\` type in the original C; \`0\` and \`non-zero\` are the whole story. C99 added \`_Bool\` and \`<stdbool.h>\` for readability, but it is still a type where any non-zero is true.

## Three comparison bugs

**Bug 1: \`=\` instead of \`==\`.**

\`\`\`c
if (x = 5) { ... }      /* ASSIGNS 5 to x. The condition is 5, which is true,
                           so the body always runs. x is now 5 forever. */

if (x == 5) { ... }     /* correct */
\`\`\`

This compiles with a warning under \`-Wall\` (\`suggest parentheses around assignment used as truth value\`) and it is astonishingly common. It is especially nasty in conditions like \`while (c = getchar() != EOF)\` where the intent is both a comparison and an assignment — which needs a different idiom entirely (see below).

**Bug 2: comparing strings with \`==\`.**

\`\`\`c
char *a = "hello";
char *b = "hello";

a == b     /* compares ADDRESSES. May be true, may be false. */
\`\`\`

Two identical string literals *may* be pooled into one object, so \`a == b\` can be true. It is not something to rely on. To compare the contents you need \`strcmp\` from \`<string.h>\` (Module 8).

**Bug 3: comparing floating point with \`==\`.**

Covered in Module 4: \`0.1 + 0.2 == 0.3\` is false. Use a tolerance.

## \`&&\` and \`||\` are short-circuit, and that is a feature

They evaluate the left operand first. If it already determines the answer, the right operand is **not evaluated at all**.

\`\`\`c
if (index >= 0 && array[index] == 0) { ... }
\`\`\`

This is safe. If \`index\` is \`-1\`, \`array[index]\` would read out of bounds — but \`index >= 0\` is false, so \`&&\` short-circuits and the right side never runs. Put the cheap, likely-to-fail test **first** and this is the idiomatic way to guard a lookup:

\`\`\`c
if (p != NULL && *p == 'A') { ... }      /* correct: *p is not touched if p is NULL */
if (*p == 'A' && p != NULL) { ... }      /* WRONG: dereferences a NULL pointer */
\`\`\`

Getting the order right is not just an optimisation — it is a memory-safety decision. Module 9 comes back to this.

\`\`\`c
/* the NULL-safe loop, written two ways */
for (int i = 0; i < count && items[i] != NULL; i++) { ... }
for (int i = 0; items[i] != NULL && i < count; i++) { ... }   /* could run off the end */
\`\`\`

## \`!\` — logical NOT, and its trap with \`=\`

\`\`\`c
if (!p) { ... }         /* correct: true when p is NULL */
\`\`\`

\`!x\` is true when \`x\` is zero and false when \`x\` is non-zero. Combined with the \`=\`/\`==\` confusion, \`if (!a = b)\` parses as \`if (!(a = b))\`, which assigns. Parenthesise when in doubt: \`if ((a = b))\`.

## \`&&\` and \`||\` on non-boolean values

In C these are not boolean operators; they take any integers and yield \`0\` or \`1\`.

\`\`\`c
int a = 5, b = 0;
printf("%d\\n", a && b);   /* 0 */
printf("%d\\n", a || b);   /* 1 */
\`\`\`

Because they yield 0 or 1, they are sometimes used to normalise a value:

\`\`\`c
int result = (value != 0);   /* 0 or 1, explicitly */
int result = !!value;         /* same trick: !!normalises any value to 0 or 1 */
\`\`\`

\`!!x\` is true exactly when \`x != 0\`. It is a genuine C idiom for normalising a pointer or an integer into a boolean, and it is worth knowing because you will see it in real code.

## \`?:\` — the conditional operator

\`\`\`c
int max = (a > b) ? a : b;
\`\`\`

It is an **expression**, so it can appear anywhere a value can — including inside another expression, or as an argument, or the target of an assignment:

\`\`\`c
printf("%d\\n", (x > 0) ? x : -x);     /* abs, for small values */
\`\`\`

The two arms are type-converted to a common type, exactly like the other operators. \`(cond ? 1 : 2.0)\` is a \`double\`.

## The \`chained comparison\` bug

C has no chained comparisons. \`0 < x < 10\` does **not** mean what it looks like.

\`\`\`c
0 < x < 10
\`\`\`

parses as \`((0 < x) < 10)\`. The left side is \`0\` or \`1\`. Then it asks "is 0 or 1 less than 10?" — always true. So \`0 < x < 10\` is true for **every** \`x\`, including negatives and numbers above 10.

The correct form is \`x > 0 && x < 10\`. This is a real bug in a great deal of C in the wild, and it comes from languages (Python, SQL, mathematics) where chained comparisons are real.`),
        b.anim('trace', {
          title: 'Short-circuit evaluation saves the program',
          badge: 'step through',
          code: `int values[3] = {10, 20, 30};
int index = 5;
int total = 0;

if (index < 3 && values[index] == 20) {
    total = 1;
}`,
          steps: [
            {
              line: 1,
              caption: 'An array of three ints: indices 0, 1, 2. A fifth element does not exist.',
              vars: [
                { name: 'values', value: '{10, 20, 30}', tone: 'int' },
                { name: 'index', value: '5', tone: 'bad' },
              ],
            },
            {
              line: 5,
              caption: 'The left operand: 5 < 3 is false.',
              vars: [{ name: '5 < 3', value: '0 (false)', tone: 'bad' }],
            },
            {
              line: 5,
              caption: 'Because && short-circuits on a false left operand, values[index] is NEVER evaluated.',
              note: 'This is the entire point. Reading values[5] would read two ints past the end of the array — undefined behaviour, and in a real program usually a crash or a corrupted value.',
              vars: [{ name: 'values[5]', value: 'NOT EVALUATED', tone: 'ok' }],
            },
            {
              line: 6,
              caption: 'The condition is false, so the body is skipped and total stays 0. No crash, no corruption.',
              vars: [{ name: 'total', value: '0', tone: 'int' }],
            },
            {
              line: 5,
              caption: 'Now imagine the operands were reversed: values[index] == 20 && index < 3.',
              note: 'values[5] is evaluated first, out of bounds, and THEN the safe check runs. Short-circuit only helps if the cheap guard is on the left. This is a memory-safety rule, not a style preference.',
              vars: [{ name: 'values[5]', value: 'reads past the end — UB', tone: 'bad' }],
            },
          ],
        }),
        b.anim('expression', {
          title: 'Why 0 < x < 10 is always true',
          badge: 'precedence',
          expression: '0 < x < 10',
          steps: [
            {
              caption:
                'The first step of parsing: < binds tighter than nothing here — but < is left-associative, so the first pair groups first.',
              node: { label: 'x < 10', op: 'less than', tone: 'int', children: [{ label: 'x' }, { label: '10', tone: 'int' }] },
            },
            {
              caption:
                'We now have a node whose value is 0 or 1 — because a comparison always yields an int.',
              node: {
                label: '(0 < x) < 10',
                op: 'less than',
                tone: 'warn',
                children: [
                  {
                    label: '0 < x',
                    op: 'less than',
                    tone: 'int',
                    children: [{ label: '0', tone: 'int' }, { label: 'x' }],
                  },
                  { label: '10', tone: 'int' },
                ],
              },
            },
            {
              caption:
                'The left child evaluates to 0 or 1. Both are less than 10, so the whole expression is 1 — true — for every value of x.',
              note: 'The correct C is `x > 0 && x < 10`. C has no chained comparison operator; the syntax silently regroups instead of failing.',
              node: {
                label: '1  (always true)',
                op: 'result',
                tone: 'bad',
                children: [
                  {
                    label: '(0 < x) = 0 or 1',
                    tone: 'warn',
                  },
                  { label: '10', tone: 'int' },
                ],
              },
              result: '1 for every x, including -5 and 500',
            },
          ],
        }),
        b.lead('Everywhere `=` gets confused with `==`'),
        b.table(
          'Classic comparison bugs',
          ['Wrong', 'What it does', 'Right'],
          [
            ['if (x = 0)', 'Assigns 0 to x; the condition is false, so the body never runs', 'if (x == 0)'],
            ['if (x = 5) { }', 'Assigns 5; always true; x is now permanently 5', 'if (x == 5) { }'],
            ['if (p == NULL = q)', 'Does not compile cleanly — the == makes the left an rvalue', 'if ((p = q) != NULL)'],
            ['while (c = getchar() != EOF)', 'Assigns 0/1 to c, and the loop exits immediately', 'while ((c = getchar()) != EOF)'],
            ['if (a && !b = c)', 'Parses as !(b = c)', 'if (a && !(b = c))'],
            ['0 < x < 10', 'Always true', 'x > 0 && x < 10'],
            ['str1 == str2', 'Compares addresses', 'strcmp(str1, str2) == 0'],
            ['f == 0.0', 'Usually false for computed values', 'fabs(f) < 1e-9'],
          ]
        ),
        b.tip(
          'The assignment-in-condition idiom, done safely',
          'When you genuinely want to assign and test — the classic is reading input in a loop — wrap the assignment in extra parentheses so the intent is unambiguous and the compiler can check it: `while ((c = getchar()) != EOF)`. The inner parens are what tell both the reader and -Wall that this is deliberate.',
        ),
      ],
      questions: [
        [
          'What is `if (x = 5)` equivalent to?',
          [
            'A test for whether x equals 5',
            'An assignment of 5 to x, and a condition that is always true',
            'A compile error in modern C',
            'A comparison that is always false',
          ],
          1,
          'Assignment is an expression, and its value is the assigned value. 5 is non-zero, so the body always runs, and x is now 5. -Wall warns about this.',
        ],
        [
          'Why must `p != NULL` be tested before `*p == A`?',
          [
            'For performance',
            'Because && is short-circuit, so the NULL check must be first or *p is dereferenced on a null pointer',
            'Because *p has higher precedence',
            'It does not matter',
          ],
          1,
          '&& evaluates left to right and stops on a false left operand. The order is a memory-safety decision, not a style one.',
        ],
        [
          'What is the value of `0 < 5 < 10`?',
          [
            '1, because 5 is between 0 and 10',
            '1, but for the wrong reason: it parses as (0 < 5) < 10, and 1 < 10',
            '0',
            'A compile error',
          ],
          1,
          'C has no chained comparison. The expression is true for every x because (0 < x) is 0 or 1 and both are less than 10.',
        ],
        [
          'What does `!!x` do?',
          [
            'Negates x twice, giving back x',
            'Normalises any value to 1 if non-zero, 0 if zero',
            'Double-dereferences a pointer',
            'A syntax error',
          ],
          1,
          '! produces 0 or 1, and ! applied to that produces 0 or 1 again — exactly matching x != 0. It is a standard way to coerce a value into a boolean.',
        ],
        [
          'Why is `char *a = "x"; char *b = "x"; a == b;` not a reliable string comparison?',
          [
            'Because == does not work on pointers',
            'Because == compares addresses, and whether the two identical literals share storage is implementation-defined',
            'Because the strings are const',
            'Because it is a compile error',
          ],
          1,
          'The compiler may or may not pool identical string literals. Use strcmp(a, b) == 0 to compare contents.',
        ],
      ],
    },
    {
      title: 'Bitwise operators',
      summary: '& | ^ ~ << >>, masks, and the places bit manipulation is genuinely the right tool.',
      duration: 16,
      build: (b) => [
        b.md(`## The six bitwise operators

| Operator | Name | Example (\`a = 12\` = \`1100\`, \`b = 10\` = \`1010\`) |
| --- | --- | --- |
| \`&\` | AND | \`12 & 10\` = \`1000\` = 8 |
| \`|\` | OR | \`12 | 10\` = \`1110\` = 14 |
| \`^\` | XOR | \`12 ^ 10\` = \`0110\` = 6 |
| \`~\` | NOT | \`~12\` = \`...11110011\` = −13 |
| \`<<\` | shift left | \`1 << 4\` = 16 |
| \`>>\` | shift right | \`16 >> 2\` = 4 |

These act on the **binary representation** of integers, bit by bit. They do not exist for floating point.

## The four you will use constantly

\`\`\`c
/* even? */
if (n & 1) { /* odd */ }        /* the last bit is the only bit that can be set
                                   in n & 1, so this is a very cheap odd test */
else       { /* even */ }

/* set, clear, and test a flag */
flags |=  (1 << 3);   /* set bit 3 */
flags &= ~(1 << 3);   /* clear bit 3 */
flags &= ~(1 << 3); if (flags & (1 << 3)) { /* was it set? */ }

/* extract a field */
unsigned value = (packed >> 8) & 0xFF;   /* 8 bits starting at bit 8 */

/* is a flag set? */
if (status & FLAG_ERROR) { ... }
\`\`\`

That \`1 << n\` idiom — a one shifted left \`n\` places, giving a mask with exactly bit \`n\` set — is the foundation of all C flag handling. Learn it properly.

\`\`\`c
#define BIT(n)   (1u << (n))
#define BIT_0    0x0001u
#define BIT_1    0x0002u
#define BIT_2    0x0004u
#define BIT_3    0x0008u
#define FLAG_ALL (BIT_0 | BIT_1 | BIT_2 | BIT_3)

flags = 0;
flags |= BIT_1;              /* set bit 1   -> 0b0010 = 2 */
flags |= BIT_3;              /* set bit 3   -> 0b1010 = 10 */
if (flags & BIT_1) { ... }   /* test bit 1  -> true */
flags &= ~BIT_1;             /* clear bit 1 -> 0b1000 = 8 */
\`\`\`

Note the \`u\` suffix: these are unsigned constants, so the mask is unsigned and the bitwise operations stay unsigned. Without it, \`1 << 31\` is undefined behaviour because \`1\` is a signed \`int\` and you cannot shift a 1 into the sign bit.

## \`^\` has a second, very useful identity

\`\`\`c
a ^ a        /* always 0 */
a ^ 0        /* always a */
\`\`\`

Which gives the classic swap-without-a-temporary:

\`\`\`c
a ^= b;
b ^= a;      /* b now holds the original a */
a ^= b;      /* a now holds the original b */
\`\`\`

This works for integers. **It does not work for floating point values**, and the standard does not require it to. And while it saves one line, a temporary is clearer and compilers optimise the temporary away anyway:

\`\`\`c
int temp = a;
a = b;
b = temp;
\`\`\`

Use that instead. The XOR swap is a party trick, not code.

## \`~\` is the one that surprises

\`\`\`c
unsigned int u = 0;
printf("%u\\n", ~u);   /* 4294967295 on 32-bit unsigned int */

int i = 5;
printf("%d\\n", ~i);   /* -6 */
\`\`\`

\`~\` flips every bit, including the sign bit. For \`5\` = \`0000...0101\`, the complement is \`1111...1010\`, which as a signed int is \`-6\`. The identity is \`~x == -x - 1\`.

The trap is using \`~\` as if it were a logical NOT. \`!x\` is logical (0 or 1); \`~x\` is arithmetic (flips the bits). If you want "set bit 3 to zero", you need \`~(1 << 3)\`, not \`!(1 << 3)\`.

## Shifts: two rules that produce undefined behaviour

\`\`\`c
x << n     /* multiply by 2^n */
x >> n     /* divide by 2^n for non-negative x */
\`\`\`

1. **The shift count must be less than the width of the type.** Shifting an \`int\` by 32 is undefined behaviour. Shifting a 64-bit type by 64 is undefined behaviour. On x86 the count is masked to 5 or 6 bits, so \`x << 32\` quietly becomes \`x << 0\` — which is why this bug survives testing.
2. **Shifting a negative number left is undefined behaviour**, and shifting a negative number right is implementation-defined (arithmetic shift on most machines, logical on some).

For \`>>\` on a signed negative value, the C standard says implementation-defined: most compilers do an arithmetic shift that preserves the sign, so \`-8 >> 1 == -4\`. Do not rely on it; cast to unsigned if you want a defined logical shift.

\`\`\`c
/* the safe form */
unsigned int u = (unsigned int)x;
unsigned int half = u >> 1;          /* defined for every value */

/* shifting 1 into the sign bit — undefined with a signed literal */
int bad  = 1 << 31;                  /* UB */
unsigned int ok = 1u << 31;          /* fine */
\`\`\``),
        b.anim('bits', {
          title: 'Bitwise operations on one 16-bit word',
          badge: 'step through',
          total_bits: 16,
          steps: [
            {
              caption: 'Two values, 12 and 10, in binary. Keep the columns aligned — that is how you do this by hand.',
              fields: [
                { label: 'a = 12', bits: 16, tone: 'int', value: 12, note: '1100' },
              ],
            },
            {
              caption: 'Now b = 10, in a word of the same width so the columns line up:',
              fields: [
                { label: 'a = 12', bits: 16, tone: 'int', value: 12 },
              ],
            },
            {
              caption: 'AND (a & b): a bit is set only if it is set in BOTH. 1100 & 1010 = 1000 = 8.',
              note: 'This is the "is this flag set" test: a flag mask with one bit set, ANDed with the flags, is non-zero exactly when that flag is present.',
              fields: [
                { label: 'b = 10', bits: 16, tone: 'warn', value: 10, note: '1010' },
              ],
            },
            {
              caption: 'The result of the AND is its own 8-bit value, shown in the same 16-bit word:',
              note: 'Because 8 fits in the low byte, the upper byte is all zeros. Bitwise operators are per-bit and never carry, which is the whole difference from arithmetic.',
              fields: [
                { label: 'a & b = 8', bits: 16, tone: 'ok', value: 8, note: '1000' },
              ],
            },
            {
              caption: 'OR (a | b): a bit is set if it is set in EITHER. 1100 | 1010 = 1110 = 14.',
              note: 'This is the "set this flag" operation: OR the current flags with a mask that has just this bit set.',
              fields: [
                { label: 'a | b = 14', bits: 16, tone: 'ok', value: 14, note: '1110' },
              ],
            },
            {
              caption: 'XOR (a ^ b): a bit is set if it is set in EXACTLY ONE. 1100 ^ 1010 = 0110 = 6.',
              note: 'XOR with an all-ones mask is the classic "invert these bits" operation, used for encryption and for toggling a flag.',
              fields: [
                { label: 'a ^ b = 6', bits: 16, tone: 'ok', value: 6, note: '0110' },
              ],
            },
            {
              caption: 'Shifting: 1 << 4 = 10000 = 16. Multiplying by 2^n is a left shift.',
              note: 'So 1 << 3 is the mask with only bit 3 set — that is how BIT(3) and every C flag macro is built. Note the shift needs five bits, which is exactly why the whole word is 16 and not 8.',
              fields: [
                { label: '1 << 4 = 16', bits: 16, tone: 'ok', value: 16, note: '10000' },
              ],
            },
          ],
        }),
        b.lead('The four operations in one table'),
        b.table(
          'Bitwise truth tables',
          ['a', 'b', 'a & b', 'a | b', 'a ^ b', 'Meaning of &'],
          [
            ['0', '0', '0', '0', '0', 'neither is set'],
            ['0', '1', '0', '1', '1', 'b has it, a does not'],
            ['1', '0', '0', '1', '1', 'a has it, b does not'],
            ['1', '1', '1', '1', '0', 'both have it'],
          ]
        ),
        b.tip(
          'Prefer named flags over raw masks',
          'Define every flag as a macro with a name that says what it means: `#define SOCKET_CLOSED (1u << 0)`. Raw hex masks are unreadable six months later, and a named flag costs nothing at runtime. This is the single biggest readability win in C flag handling.',
        ),
        b.warn(
          'Signed shifts are a minefield',
          '`1 << 31` with a signed int is undefined behaviour. `x << 32` on a 32-bit int is undefined behaviour — and on x86 the hardware masks the count, so it becomes `x << 0` and your code silently does the wrong thing instead of crashing. Use `1u << 31`, and for shifts by a runtime amount, mask the count: `(x << (n & 31))`.',
        ),
      ],
      questions: [
        [
          'What is `12 & 10`?',
          ['14', '8', '6', '2'],
          1,
          '1100 AND 1010 = 1000 = 8. AND sets a bit only when both inputs have it.',
        ],
        [
          'What is `12 ^ 10`?',
          ['14', '8', '6', '2'],
          2,
          '1100 XOR 1010 = 0110 = 6. XOR sets a bit when exactly one input has it — note the last row of the table, where both having it cancels out.',
        ],
        [
          'How do you test whether bit 5 of a flags variable is set?',
          [
            'if (flags == (1 << 5))',
            'if (flags & (1u << 5))',
            'if (flags || (1 << 5))',
            'if (~flags & (1 << 5))',
          ],
          1,
          'AND with a mask containing only that bit. Use `&&` for the boolean test and 1u so the shift is unsigned and stays in range.',
        ],
        [
          'What is the value of `~0` when x is an unsigned int?',
          [
            '0',
            '-1',
            'The maximum value of the type, e.g. 4294967295 for 32-bit unsigned',
            'Undefined behaviour',
          ],
          2,
          '~ flips every bit, so all zeros become all ones. The result depends on the width of the type, which is why the answer is stated as "the maximum value of the type" rather than a number.',
        ],
        [
          'Why is `1 << 31` undefined behaviour but `1u << 31` is not?',
          [
            'They are identical',
            '1 is a signed int and cannot be shifted into the sign bit; 1u is unsigned so the bit is just another bit',
            'Unsigned shifts are always safe',
            '31 is too large a shift count',
          ],
          1,
          'Left-shifting a positive signed value so that the result is not representable in the signed type is undefined. With an unsigned left operand the same shift is well-defined, which is why masks are written 1u << n.',
        ],
        [
          'What does `a ^= b; b ^= a; a ^= b;` do?',
          [
            'Adds b to a twice',
            'Swaps a and b without a temporary — but only reliably for integers',
            'Zeros both variables',
            'Nothing useful',
          ],
          1,
          'It is the XOR swap: a^=b puts a^b in a, b^=a recovers the original a, a^=b swaps them. It is not guaranteed for floating point and a plain temporary is clearer, so real code should use one.',
        ],
      ],
    },
    {
      title: 'Precedence and associativity',
      summary: 'The full table, the rules that generate the bugs, and when to just use more parentheses.',
      duration: 14,
      build: (b) => [
        b.md(`## Precedence decides which operator binds first

In \`2 + 3 * 4\`, \`*\` binds tighter than \`+\`, so it is \`2 + (3 * 4) = 14\`, not \`(2 + 3) * 4 = 20\`.

## The table, from tightest to loosest binding

Read this top to bottom; earlier rows bind tighter.

| Level | Operators | Associativity |
| --- | --- | --- |
| 1 | \`()\` \`[]\` \`->\` \`.\` \`++\` \`--\` (postfix) | left to right |
| 2 | \`!\` \`~\` \`+\` \`-\` (prefix) \`++\` \`--\` (prefix) \`&\` \`*\` \`sizeof\` \`_Alignof\` | right to left |
| 3 | \`*\` \`/\` \`%\` | left to right |
| 4 | \`+\` \`-\` | left to right |
| 5 | \`<<\` \`>>\` | left to right |
| 6 | \`<\` \`<=\` \`>\` \`>=\` | left to right |
| 7 | \`==\` \`!=\` | left to right |
| 8 | \`&\` | left to right |
| 9 | \`^\` | left to right |
| 10 | \`|\` | left to right |
| 11 | \`&&\` | left to right |
| 12 | \`||\` | left to right |
| 13 | \`?\` \`:\` | right to left |
| 14 | \`=\` \`*=\` \`/=\` \`%=\` \`+=\` \`-=\` \`<<=\` \`>>=\` \`&=\` \`^=\` \`|=\` | right to left |
| 15 | \`,\` | left to right |

## Four rules that produce almost all the bugs

**1. \`=\` has very low precedence.** It binds *looser* than almost everything.

\`\`\`c
if (x = y + 1)      /* parses as if (x = (y + 1)) */
\`\`\`

**2. \`&\` binds looser than \`==\`.** This surprises people coming from languages where it is the reverse.

\`\`\`c
if (a & b == 0)     /* WRONG: parses as a & (b == 0).
                       The comparison runs first, producing 0 or 1,
                       and then the whole condition is 0 or 1 — the bitwise
                       AND is not testing what you thought. */
if ((a & b) == 0)   /* correct */
\`\`\`

**3. Relational (<, >) binds tighter than equality (==, !=).**

\`\`\`c
a < b == c < d     /* parses as ((a < b) == (c < d)) */
\`\`\`

Usually harmless, but it is a genuine surprise when reading code you did not write.

**4. \`->\` and \`.\` are the tightest thing there is.**

\`\`\`c
(*p).field          /* correct: dereference, then take a member */
*p.field            /* WRONG: parses as *(p.field), which needs p to be
                       a pointer to a struct that itself has a pointer
                       member named field. Usually a compile error. */
\`\`\`

## The rule that settles everything

> **If you are not certain, add parentheses.**

There is no prize for writing dense expressions. C code is read far more often than it is written, and an expression with explicit parentheses costs nothing at runtime — the compiler does not care.

\`\`\`c
/* ugly */
if (x = f(a) + b * c) { ... }

/* obvious */
total = f(a) + (b * c);
if (total != 0) { ... }
\`\`\`

The second version is not "for beginners". It is what experienced C programmers write.

## The comma operator

\`\`\`c
for (int i = 0, j = n - 1; i < j; i++, j--) { ... }
\`\`\`

The comma operator evaluates the left operand, discards its value, then evaluates the right. It is a sequencing point. It exists mostly to let \`for\` headers and macro bodies hold several expressions. Outside those two places, use a semicolon — the comma operator is nearly always a mistake.

## Sequencing and undefined behaviour

Between two **sequence points**, you may modify a variable at most once, and you may not both modify and read it. Anything else is undefined behaviour.

C99 removed most sequence points; C11 restored the concept as *sequenced before* and *sequenced after*, which is more precise. The practical rule has not changed:

\`\`\`c
int i = 0;
int a = i++ + ++i;    /* UB: i modified twice with no sequencing */
int b = (i++, i);     /* fine: the comma operator sequences them */
int c = i ? i++ : 0;  /* UB: i modified and read in the same expression */
\`\`\`

\`printf("%d %d\\n", i++, i++)\` is the famous one. It "works" on some compilers at some optimisation levels and produces a different answer after you change the compiler version. Never do it.`),
        b.lead('The mistakes this table prevents'),
        b.table(
          'Precedence traps',
          ['Written', 'Parses as', 'Probably intended'],
          [
            ['a & b == 0', 'a & (b == 0)', '(a & b) == 0'],
            ['a | b && c', '(a | b) && c', 'a | (b && c)'],
            ['x = y + 1', 'x = (y + 1)', 'same — this one is fine'],
            ['*p.field', '*(p.field)', '(*p).field'],
            ['a < b == c', '(a < b) == c', 'a < b && a == c — the intent is unclear'],
            ['-a * b', '(-a) * b', '-(a * b) — matters for b < 0'],
            ['a << 1 | b', '(a << 1) | b', 'same — the order is as written'],
            ['i = j = k', 'i = (j = k)', 'same — right associative'],
            ['p ? x : y ? a : b', 'p ? x : (y ? a : b)', 'right associative'],
          ]
        ),
        b.tip(
          'What `-Wall` catches for you',
          'GCC and Clang both warn on `a & b == 0` with -Wparentheses ("suggest parentheses around arithmetic in operand of &"), and on `x = y` inside a condition with -Wparentheses as well. Turning on -Wparentheses is a cheap way to have the compiler audit your precedence assumptions.',
        ),
        b.warn(
          'Do not try to be clever with precedence',
          'Every hour spent mentally parsing a dense C expression is an hour better spent putting parentheses in. Compilers do not reward density, reviewers punish it, and the -Wparentheses warnings will find the dangerous cases for free.',
        ),
      ],
      questions: [
        [
          'In C, how does `a & b == 0` parse?',
          [
            '(a & b) == 0',
            'a & (b == 0)',
            '(a == b) & 0',
            'It is a syntax error',
          ],
          1,
          'Equality binds tighter than bitwise AND. The comparison runs first producing 0 or 1, and the AND then does almost nothing useful. Write (a & b) == 0.',
        ],
        [
          'What is the value of `2 + 3 * 4` and `2 * 3 + 4`?',
          ['20 and 20', '14 and 10', '14 and 14', '20 and 14'],
          1,
          'Multiplication binds tighter than addition, so these are 2 + (3*4) = 14 and (2*3) + 4 = 10.',
        ],
        [
          'How do you correctly access a member through a pointer to a struct?',
          ['p.field', '(*p).field', '*p.field', 'p->field only'],
          1,
          '(*p).field dereferences then accesses. p->field is a shorthand for exactly that and is preferred. *p.field is the wrong parse: it is *(p.field).',
        ],
        [
          'Why is `printf("%d %d", i++, i++)` undefined behaviour?',
          [
            'printf does not support two arguments',
            'i is modified twice in one expression with no sequencing between the modifications',
            '++ does not work on int',
            'The format string is wrong',
          ],
          1,
          'Between sequence points you may modify a variable at most once. Two modifications of i in a single argument list violates that, and -Wall reports it.',
        ],
        [
          'Which operator has the lowest precedence of those listed?',
          ['*', '+', '==', '='],
          3,
          'Assignment binds looser than arithmetic, relational and equality operators, which is why `if (x = y + 1)` assigns y+1 to x.',
        ],
      ],
    },
  ]
);
