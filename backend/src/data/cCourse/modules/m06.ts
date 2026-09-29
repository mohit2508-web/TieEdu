// Module 6 — Control flow.
// if/switch and the three loop forms. The emphasis is on the ways these
// constructs are legal C but do not do what the author meant, because that is
// where the bug rate is.

import { mod } from '../blocks';

export const M6 = mod(
  'crs-c-programming',
  'c-m6',
  6,
  'Module 6 — Control Flow',
  'Choosing, repeating, and the specific ways C control flow betrays you.',
  [
    {
      title: 'if, else, and the conditions that are never true',
      summary: 'if/else chains, the dangling else, and four ways a condition silently evaluates wrong.',
      duration: 15,
      build: (b) => [
        b.md(`## The basic shape

\`\`\`c
if (condition) {
    /* runs when condition is non-zero */
} else if (other_condition) {
    /* runs when the first was zero and this is non-zero */
} else {
    /* runs when neither was */
}
\`\`\`

The condition is any expression of integer type. **Zero is false, anything else is true.** There is no \`bool\` in classic C, no \`true\`/\`false\` keywords, and no requirement that the condition be a comparison at all:

\`\`\`c
if (5)        { }   /* true — a non-zero constant */
if (x)        { }   /* true when x is non-zero */
if (p)        { }   /* true when the pointer is not NULL — idiomatic */
if (p != NULL){ }   /* the same thing, written out */
if (str)      { }   /* true when str is not NULL */
\`\`\`

The \`p\` form is so idiomatic that experienced C programmers prefer it to \`p != NULL\`. Both are correct; pick one and be consistent.

## C has no boolean operators returning booleans

This surprises people from other languages. Comparisons and logical operators produce \`0\` or \`1\`, not a distinct boolean type, and the condition just tests that.

\`\`\`c
int result = (a < b) < c;   /* perfectly legal, usually not what you want */
\`\`\`

## Four conditions that are never true

### 1. Assignment instead of comparison

\`\`\`c
if (count = 0) { ... }      /* sets count to 0; the condition is 0, so false.
                               count is now 0 forever. */
if (count == 0) { ... }     /* correct */
\`\`\`

### 2. Chained comparison

\`\`\`c
if (0 < score < 100) { ... }   /* ALWAYS true — see Module 5 */
if (score > 0 && score < 100) { ... }   /* correct */
\`\`\`

### 3. Signed versus unsigned

\`\`\`c
unsigned int bytes_read;
int result = fread(buf, 1, n, fp);
if (bytes_read < 0) { ... }     /* never true: bytes_read is unsigned,
                                   so < 0 is always false */
\`\`\`

This is a real, security-relevant bug: a function returns a signed error code, you store it in an unsigned variable, and your error check silently never fires.

### 4. Reading an uninitialised variable

\`\`\`c
int status;
fscanf(fp, "%d", &status);
if (status == 0) { ... }   /* status is indeterminate if fscanf failed */
\`\`\`

## The dangling else

\`\`\`c
if (a)
    if (b)
        x = 1;
    else
        x = 2;
/* the else binds to the INNER if */
\`\`\`

\`else\` attaches to the **nearest unmatched** \`if\`. So the above is:

\`\`\`c
if (a) {
    if (b)      { x = 1; }
    else        { x = 2; }
}
/* there is no outer else at all */
\`\`\`

If you wanted \`x = 2\` to run when \`a\` is false, you must add braces:

\`\`\`c
if (a) {
    if (b)      { x = 1; }
    else        { x = 2; }
} else {
    x = 2;
}
\`\`\`

\`-Wall\` warns about this (\`-Wdangling-else\`), and \`-Wparentheses\` suggests the braces. **Always use braces for every \`if\` and every \`else\`, even for a single line.** It costs one line and it removes a whole category of bug.

## Conditions with side effects are a trap

\`\`\`c
if (i++ % 3 == 0) { ... }   /* works, but i also changes */
if (read_char() == 'q') { }  /* works, but the character is consumed */
\`\`\`

These are legal and sometimes correct. But a condition that changes state is hard to reason about when the body is skipped, when the loop repeats, or when someone later adds an early \`return\`. Keep conditions pure: they ask a question, the body acts.

## Comparing pointers and pointers to nothing

\`\`\`c
char *a = malloc(10);
char *b = malloc(10);

if (a < b) { ... }        /* comparing two unrelated pointers is
                             undefined behaviour, not "which came first" */

char *c = a;
if (a == c) { ... }       /* correct: comparing the same pointer */
if (a == NULL) { ... }    /* correct: pointers are comparable with NULL */
\`\`\`

\`NULL\` is defined as a constant that compares equal to a null pointer. Everything else about pointer comparison is either comparing to the same object, or comparing within one array, or undefined.`),
        b.tip(
          'The braces rule, stated once',
          'Use braces for every if, every for, every while, every function body. No exceptions, no style debates. A one-line if that later grows a second line is the single most common source of a silently-wrong nested conditional in C, and braces cost nothing.',
        ),
        b.warn(
          'A signed result stored in an unsigned variable',
          '`size_t` and `unsigned int` results compared with `< 0` never enter the branch. This is not theoretical: it is how buffer-handling code ends up proceeding with a failed read, and it is found in real production systems regularly. Check the return value against the type you actually have.',
        ),
      ],
      questions: [
        [
          'In `if (x = 5)`, what happens?',
          [
            'The condition tests whether x is 5',
            '5 is assigned to x, and the condition is true because 5 is non-zero',
            'It is a compile error',
            'The condition is false because assignments cannot be conditions',
          ],
          1,
          'Assignment is an expression whose value is the assigned value. 5 is non-zero so the body runs, and x is now 5. -Wall warns about exactly this.',
        ],
        [
          'What does the `else` in `if (a) if (b) x=1; else x=2;` attach to?',
          [
            'The outer if',
            'The inner if, the nearest unmatched one',
            'It is a syntax error',
            'Neither — the else is required to match the outer if',
          ],
          1,
          'C attaches else to the closest unmatched if. The braces you need to change the meaning must go around the outer if. -Wdangling-else warns about this.',
        ],
        [
          'Why is `if (bytes_read < 0)` dead code when bytes_read is unsigned?',
          [
            'Because < 0 is not allowed on unsigned types',
            'Because bytes_read is converted to unsigned, and no unsigned value is less than zero',
            'Because the compiler optimises it away',
            'Because it should be <= 0',
          ],
          1,
          'The comparison converts 0 to unsigned, and no unsigned value is negative, so the branch is unreachable. This pattern disables real error checks and is a known security bug shape.',
        ],
        [
          'What is the value of the condition `ptr` where ptr is a valid non-NULL pointer?',
          [
            '1',
            'ptr itself, and it is true because it is non-zero',
            'The address, which is true because addresses are non-zero',
            'The value ptr points to',
          ],
          1,
          'A pointer used directly as a condition is true if it is not null. This is why `if (ptr)` is the idiomatic null check.',
        ],
        [
          'What is the value of `3 > 1 > 2` in C?',
          [
            'It is a syntax error',
            '0, because (3 > 1) is 1, and 1 > 2 is false',
            '1, because 3 is greater than 1 which is greater than 2',
            'It is a compile error in C11 and later',
          ],
          1,
          'Comparison yields 0 or 1, and the second comparison then compares that 1 against 2. C has no chained comparison operator.',
        ],
      ],
    },
    {
      title: 'switch: cases, break, fallthrough, and default',
      summary: 'How switch really works, why break matters, and when fallthrough is a feature.',
      duration: 14,
      build: (b) => [
        b.md(`## The shape

\`\`\`c
switch (value) {
    case 1:
        printf("one\\n");
        break;
    case 2:
    case 3:
        printf("two or three\\n");
        break;
    default:
        printf("something else\\n");
        break;
}
\`\`\`

## How it actually works

\`switch\` is not a clever construct. It is:

1. Evaluate the controlling expression.
2. Compare it against each \`case\` label in order, using \`==\` (with the integer promotions applied).
3. **Jump to the matching label** and continue executing from there, line by line, until a \`break\`.

That last part is the whole story. There is no implicit end to a case. Execution **falls through** into the next case unless a \`break\` stops it.

## Fallthrough, and the table-driven form

This looks like a bug and is frequently a feature:

\`\`\`c
switch (grade) {
    case 'A':
    case 'B':
    case 'C':
        printf("pass\\n");
        break;                 /* one break serves all three labels */
    case 'D':
    case 'F':
        printf("fail\\n");
        break;
    default:
        printf("invalid\\n");
}
\`\`\`

Empty labels (\`case 'B':\` with no statements) are the standard way to group cases. This is clean and idiomatic.

The **accidental** fallthrough is different — a non-empty case that runs into the next one:

\`\`\`c
switch (state) {
    case STATE_IDLE:
        counter++;              /* BUG: no break, so this also runs
                                   the PRINTING case below */
    case STATE_PRINTING:
        printf("printing\\n");
        break;
}
\`\`\`

\`-Wimplicit-fallthrough\` catches these (it is in \`-Wextra\`). If you *intend* to fall through, say so:

\`\`\`c
case STATE_IDLE:
    /* fall through: idle also means "begin printing" */
    counter++;
    /* FALLTHROUGH */
case STATE_PRINTING:
    printf("printing\\n");
    break;
\`\`\`

The comment must match a regex the compiler recognises; \`-Wimplicit-fallthrough=3\` (the default level) is strict about this, so check the wording the compiler expects or just use level 2.

## The rules that catch people

**1. \`case\` takes constant expressions only.**

\`\`\`c
int limit = 10;
switch (n) {
    case limit:      /* ERROR: not a constant expression */
        ...
}
\`\`\`

Case labels must be compile-time constants or enumerators. If you need a runtime value, use \`if\`/\`else\`.

**2. The controlling expression must be an integer type.**

\`\`\`c
switch (3.14) { ... }   /* ERROR: switch works on integers */
switch (some_double) { ... }   /* ERROR */
switch (a_char) { ... }   /* fine — chars are integers */
\`\`\`

To switch on a string, you need an \`if\` chain with \`strcmp\`.

**3. \`switch\` without \`default\` does nothing when nothing matches.**

\`\`\`c
switch (n) {
    case 1: printf("one\\n"); break;
}
/* n == 99 prints nothing at all */
\`\`\`

This is legal and sometimes correct. \`-Wswitch\` warns when you have \`case\` labels but no \`default\`, which is a good prompt to ask "what should happen for every other value?"

**4. \`switch\` scopes one declaration, and \`case\` jumps into it.**

\`\`\`c
switch (n) {
    case 1: {
        int x = 5;
        printf("%d\\n", x);
        break;
    }
    case 2: {
        int x = 10;      /* a different x, in its own block */
        printf("%d\\n", x);
        break;
    }
}
\`\`\`

A \`switch\` body is one block, so declaring a variable in one case makes it visible (and uninitialised) in all the others. Wrapping each case in \`{ }\` gives each one its own scope, which is almost always what you want.

**5. \`break\` inside a loop does not break the \`switch\`.**

\`\`\`c
switch (n) {
    case 1:
        for (int i = 0; i < 10; i++) {
            if (i == 3) break;   /* breaks the FOR, not the switch */
        }
        break;                    /* this break exits the switch */
}
\`\`\`

## \`switch\` or \`if\`/\`else\`?

Use \`switch\` when:

- the controlling value is an integer or a \`char\`
- you are comparing against a set of specific values
- several values share a body

Use \`if\`/\`else\` when:

- the conditions involve ranges (\`if (x > 0 && x < 10)\`)
- the values are not compile-time constants
- you are comparing floating point
- the conditions are compound expressions

\`switch\` scales better with many cases, and it gives the compiler a jump table, which is genuinely faster for large sets. But a two-branch decision is more readable as an \`if\`.`),
        b.table(
          'switch rules at a glance',
          ['Rule', 'Detail', 'Consequence'],
          [
            ['case labels are constants', 'Compile-time integral constant expressions only', 'case some_variable: is an error'],
            ['The controlling value is an integer', 'int, char, enum — not float or double', 'switch(d) with a double is an error'],
            ['No implicit break', 'Execution continues into the next case', 'Forgetting break is the classic bug'],
            ['Empty case labels group values', 'case 1: case 2: body — legal and idiomatic', 'One break serves the group'],
            ['One block scope', 'A declaration in one case is visible in all', 'Wrap each case in { }'],
            ['default is optional', 'Nothing runs if nothing matches and there is no default', 'Add -Wswitch and think about it'],
            ['break binds to the innermost', 'Inside a loop, break leaves the loop', 'Use a flag or restructure'],
          ]
        ),
        b.tip(
          'Making fallthrough explicit is worth the keystrokes',
          'If two cases genuinely share behaviour, group them with empty labels rather than by omitting break. If execution should genuinely continue from one case into the next, write a `/* fall through */` comment and compile with -Wimplicit-fallthrough so the compiler agrees with your intent instead of guessing.',
        ),
        b.warn(
          'Duff’s device',
          'C permits a `case` label inside a loop, letting the loop be entered at an arbitrary case — this is legal, was written by a very good programmer, and is a famous example of C being more powerful than it should be. You will see it in old code. Do not write it, and do not be surprised by it.',
        ),
      ],
      questions: [
        [
          'What happens if a `case` has no `break`?',
          [
            'The switch stops at the end of the case',
            'Execution continues into the next case, executing its statements too',
            'It is a compile error',
            'The switch restarts from the top',
          ],
          1,
          'switch is a jump followed by ordinary sequential execution. There is no implicit end to a case, so statements fall through until a break.',
        ],
        [
          'Which of these is a legal case label?',
          [
            'a variable holding a value read at runtime',
            'an enumeration constant',
            'a function call',
            'a floating point literal',
          ],
          1,
          'Case labels must be compile-time integer constant expressions. Enum constants, integer literals and character literals qualify; a runtime variable or a function call does not.',
        ],
        [
          'Why is `switch (some_double)` a compile error?',
          [
            'Because doubles are too large',
            'Because switch works only on integer types',
            'Because doubles need %f',
            'It is legal, just slow',
          ],
          1,
          'The controlling expression must have integer type. To branch on a real number you need an if/else chain, and you should also remember that == on doubles is usually the wrong test anyway.',
        ],
        [
          'You declare `int x = 5;` inside `case 1:` without braces. What is the problem?',
          [
            'Nothing',
            'The switch body is a single block, so x is also in scope in every other case, where it would be uninitialised',
            'C does not allow declarations in a switch',
            'x would shadow main’s x',
          ],
          1,
          'All cases share one block. Wrapping each case in { } gives it its own scope, which is almost always what you want.',
        ],
        [
          'What does an empty `case 2:` label followed by `case 3:` achieve?',
          [
            'A syntax error',
            'The two values share one body, so 2 and 3 run the same code',
            '2 is ignored',
            'The switch falls through to default',
          ],
          1,
          'An empty label is a legal no-op that groups values, so both 2 and 3 execute the same statements. This is the standard way to write a multi-value case.',
        ],
      ],
    },
    {
      title: 'while, for, and do-while',
      summary: 'The three loop forms, the three-part for header, and how to write a loop that terminates.',
      duration: 16,
      build: (b) => [
        b.md(`## Three forms, one idea

\`\`\`c
/* while: test first, body may never run */
while (condition) {
    body
}

/* do-while: body first, test after — runs at least once */
do {
    body
} while (condition);

/* for: the three parts of a loop, gathered together */
for (initialise; condition; update) {
    body
}
\`\`\`

A \`for\` loop is not a different feature. It is exactly this:

\`\`\`c
for (int i = 0; i < n; i++) { body }

/* identical to: */
int i = 0;
while (i < n) {
    body
    i++;
}
\`\`\`

Use \`for\` when the loop has a counter. Use \`while\` when the condition is the only thing that matters. Use \`do-while\` when the body must run at least once — reading a menu choice, validating input, printing at least one line.

## The three-part \`for\` header

\`\`\`c
for (init; condition; update)
    ^^^^^^^^^^^^^^^^^^^^^ three semicolon-separated expressions
\`\`\`

All three are optional and all three may be empty. They are separated by semicolons, not by commas.

\`\`\`c
for (;;) { ... }               /* infinite loop, the idiomatic form */
for (; i < n; i++) { ... }     /* i is already initialised */
for (int i = 0; ; i++) { ... } /* no exit condition except inside */
for (int i = 0, j = 9; i < j; i++, j--) { ... }  /* two counters, comma operator */
\`\`\`

That last form is the classic two-pointer pattern: start one index at each end and walk them toward each other.

## Writing a loop that terminates

Every loop needs a **variant**: a quantity that strictly moves toward a termination condition, and a **bound**: something that must be finite. If either is missing, the loop is infinite.

\`\`\`c
/* good: the variant is i, the bound is n */
for (int i = 0; i < n; i++) { ... }

/* infinite: n is unsigned and 1 is int, so i < n is ALWAYS true.
   n decrements past 0 to a huge value and the loop never ends. */
unsigned int n = 10;
while (n > 0) { n = n - 1; }    /* BUG if n is unsigned */

/* correct */
unsigned int n = 10;
while (n > 0) { n--; }          /* also breaks: n-- on 0 wraps */

/* correct, and obviously terminating */
for (int i = 10; i > 0; i--) { ... }

/* the safest unsigned countdown: compare after decrementing */
unsigned int n = 10;
while (n-- > 0) { ... }         /* works, and n ends at UINT_MAX —
                                   you must not use n afterwards */
\`\`\`

The unsigned-decrement trap deserves emphasis: \`while (n > 0) { n--; }\` is **correct** (\`n--\` on 0 is never reached because the test fails first), but \`while (n--) { }\` leaves \`n\` at \`UINT_MAX\` when the loop ends, which is confusing. And \`unsigned int i = 0; while (--i >= 0)\` never terminates at all, because \`--i\` on 0 wraps to a huge number.

## break and continue

\`\`\`c
for (int i = 0; i < 100; i++) {
    if (i % 2 == 0) continue;   /* skip the rest of THIS iteration */
    if (i > 20) break;          /* leave the loop entirely */
    printf("%d ", i);
}
/* prints: 1 3 5 7 9 11 13 15 17 19 */
\`\`\`

\`continue\` in a \`for\` loop jumps to the **update expression**, not to the condition. That is the detail people miss: in a \`while\` loop, \`continue\` jumps to the test; in a \`for\` loop, it jumps to the update.

\`\`\`c
int i = 0;
while (i < 5) {
    i++;
    if (i == 3) continue;
    printf("%d ", i);
}
/* 1 2 4 5 — i++ runs before continue, so no infinite loop */

int j = 0;
while (j < 5) {
    if (j == 3) continue;       /* BUG: j never changes, infinite loop */
    j++;
}
\`\`\`

## The off-by-one, in all its forms

\`\`\`c
for (int i = 0; i <= n; i++)    /* runs n+1 times */
for (int i = 1; i <= n; i++)    /* runs n times, for 1..n */
for (int i = 0; i < n - 1; i++) /* runs n-1 times, and breaks if n is 0 */
for (int i = 1; i < n; i++)     /* runs n-1 times, breaks if n is 0 or 1 */
\`\`\`

The idiom to remember: **if you mean 0 through n-1, write \`i < n\`.** Choosing \`<= n\` when you meant \`< n\` is the most common off-by-one in programming, and it usually manifests as a buffer overrun, because the last iteration writes one element past the end of an array sized \`n\`.

## Nested loops

\`\`\`c
for (int i = 0; i < 3; i++) {
    for (int j = 0; j < 3; j++) {
        printf("(%d,%d) ", i, j);
    }
    printf("\\n");
}
\`\`\`

\`break\` only leaves the **innermost** loop. To leave both, you need a flag or \`goto\`:

\`\`\`c
int found = 0;
for (int i = 0; i < n && !found; i++) {
    for (int j = 0; j < m; j++) {
        if (a[i][j] == target) {
            found = 1;
            break;
        }
    }
}
\`\`\`

## Looping over a linked list: the \`!= NULL\` rule

Every loop over a pointer-based structure needs a null check, and forgetting it is the classic segfault:

\`\`\`c
for (Node *n = head; n != NULL; n = n->next) {   /* correct */
    printf("%d\\n", n->data);
}

for (Node *n = head; n; n = n->next) {           /* identical, shorter */
    printf("%d\\n", n->data);
}
\`\`\`

The null test is part of the loop header, not the body. If it were in the body, the first iteration would already have dereferenced a null pointer on an empty list.`),
        b.anim('trace', {
          title: 'A for loop, one statement at a time',
          badge: 'step through',
          code: `int sum = 0;
for (int i = 1; i <= 5; i++) {
    sum += i;
}
printf("sum = %d\\n", sum);`,
          steps: [
            {
              line: 1,
              caption: 'sum is initialised to 0. The for header is about to run its first part.',
              vars: [{ name: 'sum', value: '0', tone: 'int' }],
            },
            {
              line: 2,
              caption: 'Part 1 of the header: int i = 1. This runs exactly once, before the loop.',
              vars: [
                { name: 'sum', value: '0', tone: 'int' },
                { name: 'i', value: '1', tone: 'int' },
              ],
            },
            {
              line: 2,
              caption: 'Part 2: the condition i <= 5 is 1 <= 5, which is true. Enter the body.',
              vars: [
                { name: 'i', value: '1', tone: 'int' },
                { name: 'i <= 5', value: '1 (true)', tone: 'ok' },
              ],
            },
            {
              line: 3,
              caption: 'Body: sum += i, so sum becomes 0 + 1 = 1.',
              vars: [{ name: 'sum', value: '1', tone: 'int' }],
            },
            {
              line: 2,
              caption: 'Part 3: i++ makes i 2. Then the condition is tested again: 2 <= 5, true.',
              note: 'Note the order: update first, THEN test. This is why a continue in the body still runs i++ — it jumps to part 3, not part 2.',
              vars: [{ name: 'i', value: '2', tone: 'int' }],
            },
            {
              line: 3,
              caption: 'Body again: sum = 1 + 2 = 3.',
              vars: [{ name: 'sum', value: '3', tone: 'int' }],
            },
            {
              line: 2,
              caption: 'i becomes 3, then 4, then 5. sum climbs: 6, 10, 15.',
              vars: [{ name: 'i', value: '5', tone: 'int' }, { name: 'sum', value: '15', tone: 'int' }],
            },
            {
              line: 2,
              caption: 'i becomes 6. Now 6 <= 5 is false, so the loop exits and the body does not run again.',
              note: 'The loop ran for i = 1,2,3,4,5 — five iterations for five values, because the condition used <=. Had it used <, it would have stopped at i = 5 and sum would be 10.',
              vars: [{ name: 'i', value: '6', tone: 'int' }, { name: 'i <= 5', value: '0 (false)', tone: 'bad' }],
            },
            {
              line: 4,
              caption: 'The statement after the loop runs: sum = 15.',
              output: 'sum = 15',
              vars: [{ name: 'sum', value: '15', tone: 'ok' }],
            },
          ],
        }),
        b.lead('Choosing the right loop'),
        b.table(
          'Which loop for which job',
          ['Situation', 'Use', 'Because'],
          [
            ['A counted loop, 0 to n-1', 'for', 'The count is the point; keep the three parts together'],
            ['Repeat until a sentinel value is read', 'while', 'There is no count, only a condition'],
            ['Prompt for input at least once', 'do-while', 'The body must run before the first test'],
            ['Walk a linked list', 'while (p != NULL)', 'The termination condition is the data itself'],
            ['Walk an array by pointer', 'while (*p)', 'Same idea, tested through the value'],
            ['Find something and stop', 'for + break', 'Or while with a break'],
            ['Process every element', 'for', 'And make sure the bound is the array size, not a literal'],
          ]
        ),
        b.tip(
          'The loop that never overflows',
          'When in doubt about an unsigned index, use `size_t` and `< array_length`. `for (size_t i = 0; i < count; i++)` with `count` a `size_t` cannot underflow, and the type matches what the array length functions return.',
        ),
        b.warn(
          'continue in a while loop can hang the program',
          'In a for loop, continue jumps to the update so the counter still advances. In a while loop, continue jumps back to the condition — so if the counter update was the last line of the body, `continue` above it skips it and the loop spins forever. Put the increment at the top, or use a for loop.',
        ),
      ],
      questions: [
        [
          'What is the difference between `for` and `while`?',
          [
            'for is faster',
            'None in what they do — a for loop is exactly the equivalent initialise/test/update plus a while. Use for when the loop is counted.',
            'while cannot contain break',
            'for can only loop over arrays',
          ],
          1,
          'They are the same statement in different clothes. The for form exists so the three parts of a counted loop sit together on one line.',
        ],
        [
          'What does `continue` do inside a for loop?',
          [
            'Jumps to the condition test',
            'Skips the rest of the body and runs the update expression, then tests again',
            'Exits the loop',
            'Restarts the loop from the beginning with i reset to 0',
          ],
          1,
          'continue jumps to the update expression in a for loop. In a while loop it jumps to the condition, which is why `continue` can cause an infinite loop there.',
        ],
        [
          'Why is `unsigned int n = 10; while (n > 0) { n = n - 1; }` safe but `while (n--)` confusing?',
          [
            'Both are identical',
            'The first never decrements from 0 because the test fails first; the second leaves n at UINT_MAX when the loop ends',
            'The second never terminates',
            'n - 1 is not allowed on unsigned',
          ],
          1,
          'Both terminate, but n-- leaves n as UINT_MAX at the end because the post-decrement test is evaluated with the pre-decrement value. Never use n after such a loop.',
        ],
        [
          'How many times does `for (int i = 0; i <= 5; i++)` execute its body?',
          ['4 times', '5 times', '6 times', '5 or 6 depending on the starting value'],
          2,
          'i takes the values 0,1,2,3,4,5 — six iterations. If you meant 0 through 4 you should have written i < 5.',
        ],
        [
          'What is wrong with `while (j < 5) { if (j == 3) continue; j++; }`?',
          [
            'Nothing',
            'When j is 3, continue skips the j++, so j stays 3 forever and the loop never ends',
            'continue is not allowed in a while loop',
            'j is uninitialised',
          ],
          1,
          'continue in a while loop jumps to the condition, and the only statement that changes j is after it. This is why the counter update belongs at the top of the body, or in a for loop.',
        ],
        [
          'Why must a loop over a linked list check `n != NULL` in the header rather than the body?',
          [
            'Style preference only',
            'Because an empty list has head == NULL, and the body would dereference it on the first iteration before reaching any check',
            'Because NULL cannot be compared in a body',
            'It makes no difference',
          ],
          1,
          'The test is the loop condition. A do-while with the check in the body is the exact shape of this bug.',
        ],
      ],
    },
  ]
);
