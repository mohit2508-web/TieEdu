// Module 4 — Variables, types and storage.
// Everything in C is a number in a box. This module is about how big the box is,
// what happens when the number does not fit, and the five keywords that change
// where the box lives and how long it exists.

import { mod } from '../blocks';

export const M4 = mod(
  'crs-c-programming',
  'c-m4',
  4,
  'Module 4 — Variables, Types and Storage',
  'Declarations, the fundamental types, the conversion rules, integer overflow, and the storage-class keywords.',
  [
    {
      title: 'Declaring a variable, and what "uninitialised" really costs',
      summary: 'Declaration syntax, initialisation, lifetime, and why an uninitialised variable is not "zero" or "garbage" but undefined.',
      duration: 16,
      build: (b) => [
        b.md(`## A declaration has four parts

\`\`\`c
const unsigned long  max_size = 100UL;
/^       ^           ^            ^
|       |           |            +-- initialiser (optional)
/|       |           +--------------- the name being declared
/|       +--------------------------- type specifiers (in any order, any number of zero or more)
+----------------------------------- storage class and qualifiers (optional)
\`\`\`

The rule worth memorising: **the name is what you are declaring, and everything before it describes it.** Type specifiers can appear in any order and any quantity — \`unsigned long int\`, \`long unsigned int\`, and \`int long unsigned\` are all the same type.

\`\`\`c
int  count;             // an int, indeterminate
int  count = 0;         // an int, zero
int  count = 0, total = 0;  // two declarations in one statement
static int calls = 0;   // static, so it starts at 0 even without = 0
char initial = 'A';     // a char, value 65
double ratio = 1.0 / 3.0;
\`\`\`

## Local variables must be initialised by you

This is the single most important habit in C, and it comes from a rule that surprises people arriving from other languages:

> A local variable with no initialiser contains **indeterminate** values.

Not zero. Not a consistent garbage value. Whatever bytes happened to be at that stack location from a previous call. Reading it is **undefined behaviour** — the C standard permits the compiler to assume it never happens.

\`\`\`c
int total;              /* NOT zero */

for (int i = 0; i < 5; i++) {
    total += i;         /* UB: reading an indeterminate value */
}

printf("%d\\n", total);  /* could be anything */
\`\`\`

What makes this genuinely dangerous is that the program often *appears* to work. In a debug build you might get zero, because fresh stack pages are zero-filled by the operating system. Add a function call before it, compile at \`-O2\`, and the compiler has every right to delete the loop entirely — because on the only path it can see, \`total\` is undefined, so anything follows.

Globals and \`static\` locals are different: they *are* zero-initialised automatically. That is the one gift C gives you, and it is a gift people rely on without realising.

\`\`\`c
int g_global;                    /* guaranteed 0 */
static int s_file_scope = 0;     /* guaranteed 0 */

int main(void)
{
    int local;                   /* indeterminate — YOU must set it */
    static int s_local;          /* guaranteed 0, survives calls */
    return 0;
}
\`\`\`

**The rule to take away: always initialise a local scalar at the point of declaration.** Not because the compiler requires it, but because the value is genuinely unknown and a bug that depends on unknown values will not reproduce on your machine.

## Scope: where a name is visible

\`\`\`c
#include <stdio.h>

int global = 10;                 /* file scope: visible from here to end of file */

int main(void)
{
    printf("%d\\n", global);     /* 10 */

    {
        int local = 20;
        printf("%d\\n", local);  /* 20 */

        {
            int local = 30;      /* shadows the outer local */
            printf("%d\\n", local);   /* 30 */
        }

        printf("%d\\n", local);  /* 20, unchanged */
    }

    /* printf("%d\\n", local);  ERROR: out of scope here */
    return 0;
}
\`\`\`

A block's scope begins at the declaration and ends at the closing brace. **C99 and later allow declarations anywhere a statement is allowed**, which is why the \`for (int i = 0; ...)\` form works. That is the most useful C99 change and you should use it.

## Lifetime is not the same as scope

- **Scope** is a compile-time question: where can this *name* be used?
- **Lifetime** is a runtime question: how long does this *object* exist?

They usually coincide, which is why people conflate them. They do not for \`static\`:

\`\`\`c
void counter(void)
{
    static int calls = 0;    /* scope: this block only */
    calls++;                 /* lifetime: the whole program */
    printf("called %d times\\n", calls);
}

int main(void)
{
    counter();   /* called 1 times */
    counter();   /* called 2 times */
    counter();   /* called 3 times */
    return 0;
}
\`\`\`

The name \`calls\` disappears when the function returns. The object it names does not — it is created once, before \`main\` runs, and it keeps its value between calls. This is the standard C idiom for a function-local static, and it is used for counters, caches, and lazy one-time initialisation.

## Declaration order, and the \`extern\` trap

If you use a global before its declaration, C assumes it is \`int\`. Modern compilers reject that, but the rule is worth knowing because it explains a common linker error:

\`\`\`c
/* counter.c */
int calls = 0;
void increment(void) { calls++; }

/* main.c */
void increment(void);      /* a DECLARATION: "this exists somewhere" */

int main(void) {
    extern int calls;      /* also a declaration */
    increment();
    return 0;
}
\`\`\`

- A **declaration** introduces a name and its type.
- A **definition** allocates storage and (for functions) provides the body.

\`calls = 0;\` is a definition. \`extern int calls;\` is a declaration only. The most common beginner linker error is compiling \`main.c\` and \`counter.c\` separately, forgetting to link \`counter.o\`, and getting \`undefined reference to 'increment'\`.

## A checklist for every declaration you write

1. Is the type wide enough for every value this will hold?
2. Is it initialised at the point of declaration?
3. Is the name something that would be clear to a stranger?
4. Does the scope match where it needs to be visible?
5. For a pointer, is the thing it points to guaranteed to still exist when the pointer is used? (Module 9.)`),
        b.lead('The four ways a variable can be declared'),
        b.table(
          'Declaration forms and their defaults',
          ['Declaration', 'Default value if omitted', 'Storage duration'],
          [
            ['int x; (local)', 'indeterminate — undefined behaviour if read', 'automatic — lives until the block exits'],
            ['int x = 0; (local)', 'as written', 'automatic'],
            ['int x; (file scope)', '0', 'static — lives for the whole program'],
            ['static int x; (inside a function)', '0', 'static — lives for the whole program, but only visible in that block'],
            ['extern int x;', 'does not define anything', 'the lifetime of the real object, wherever it is defined'],
          ]
        ),
        b.code(
          `/* The three ways to count calls, and what each one does. */

#include <stdio.h>

/* 1. A global: zero-initialised, visible everywhere. */
int global_calls = 0;

/* 2. A static local: zero-initialised, visible only here, but it
      persists between calls. This is the idiomatic answer. */
int function_static(void)
{
    static int calls = 0;   /* runs ONCE, before main */
    calls++;
    return calls;
}

/* 3. A plain local: must be initialised by you, dies on return. */
int plain_local(void)
{
    int calls = 0;          /* runs on EVERY call */
    calls++;
    return calls;           /* always returns 1 */
}

int main(void)
{
    for (int i = 0; i < 3; i++) {
        global_calls++;
        printf("call %d: global=%d static=%d local=%d\\n",
               i + 1,
               global_calls,
               function_static(),
               plain_local());
    }
    return 0;
}

/* Output:
   call 1: global=1 static=1 local=1
   call 2: global=2 static=2 local=1
   call 3: global=3 static=3 local=1 */
`,
          'storage_duration.c'
        ),
        b.tip(
          'The single best habit in C',
          'Initialise at the point of declaration. `int count = 0;` costs nothing, removes an entire category of undefined behaviour, and makes the code say what it means. Reviewers will not comment on it because there is nothing to comment.',
        ),
        b.warn(
          'Do not rely on "the stack happens to be zero"',
          'A fresh stack page really is zero-filled by the OS, which is why uninitialised locals often read as 0 in a small debug program. Add a function call that uses stack first, or run under different conditions, and you get something else. This is a bug that passes testing and fails in production.',
        ),
      ],
      questions: [
        [
          'What is the value of a local `int x;` that is never assigned?',
          [
            'Zero',
            'Undefined — reading it is undefined behaviour',
            'The largest negative int',
            'Whatever the compiler chose to leave there',
          ],
          1,
          'C does not zero-initialise local scalars. The value is indeterminate and reading it is undefined behaviour, which means the compiler may assume the read never happens and delete the code around it.',
        ],
        [
          'What is the value of a file-scope `int g;` that is never assigned?',
          [
            'Undefined behaviour',
            '0, because objects with static storage duration are zero-initialised',
            'A random value chosen by the OS',
            'A compile error',
          ],
          1,
          'Objects with static storage duration — globals and statics — are zero-initialised before any code runs. This is the one automatic initialisation C performs.',
        ],
        [
          'A `static` local inside a function: what is true about it?',
          [
            'It is zero-initialised and keeps its value between calls, but its name is only visible inside that block',
            'It behaves exactly like a local variable',
            'It is the same as a global and visible everywhere',
            'It cannot be modified',
          ],
          0,
          'Scope and lifetime are different questions. The name is block-scoped, but the object exists for the whole program. This is the standard way to write a function-local counter.',
        ],
        [
          'You get "undefined reference to increment" at link time. What is the most likely cause?',
          [
            'increment is misspelled in the source',
            'main.c is compiled but the .c file containing increment’s definition was not compiled or linked',
            'increment is missing a return statement',
            'increment is declared as void',
          ],
          1,
          'A declaration is enough for the compiler. Only the linker collects definitions, so a declaration without a linked definition produces exactly this error.',
        ],
        [
          'In `int x;` inside a function versus `int x;` at file scope, what differs?',
          [
            'Nothing',
            'The local has an indeterminate value; the file-scope one is zero-initialised',
            'The file-scope one is const',
            'The local is faster',
          ],
          1,
          'Automatic storage duration objects are uninitialised; static storage duration objects are zero-initialised. This is the difference that produces the most common confusing C bug report.',
        ],
      ],
    },
    {
      title: 'The fundamental types, and why you must never assume their size',
      summary: 'char, int, long, float, double — actual sizes, exact ranges, and the rules that keep code portable.',
      duration: 20,
      build: (b) => [
        b.md(`## Six types cover almost everything

| Type | Typical size | Typical range | Use it for |
| --- | --- | --- | --- |
| \`_Bool\` / \`bool\` | 1 byte | 0 or 1 | Yes/no flags. \`bool\` needs \`<stdbool.h>\` |
| \`char\` | 1 byte | −128..127 signed, 0..255 unsigned | One byte of text. Also a small integer |
| \`short\` | 2 bytes | −32,768..32,767 | Rarely. Rarely better than \`int\` |
| \`int\` | 4 bytes | −2,147,483,648..2,147,483,647 | **The default. Almost always what you want** |
| \`long\` | 8 bytes on LP64, 4 on Windows | platform-dependent | \`long\`/\`long long\` for 64-bit values |
| \`long long\` | 8 bytes (at least) | ±9.2 × 10¹⁸ | Guaranteed at least 64 bits |
| \`float\` | 4 bytes | ~1.2 × 10⁻³⁸ .. 3.4 × 10³⁸ | Rarely. Almost never what you want |
| \`double\` | 8 bytes | ~2.2 × 10⁻³⁰⁸ .. 1.8 × 10³⁰⁸ | **The default for real numbers** |
| \`long double\` | 8, 12 or 16 | platform-dependent | Extended precision. Slow, rarely portable |
| \`size_t\` | \`unsigned\`, 4 or 8 | 0 .. 2⁶⁴−1 | Sizes and array indices. From \`<stddef.h>\` |
| \`ptrdiff_t\` | signed, same width as \`size_t\` | | Result of subtracting two pointers |

## "Typical" is doing a lot of work in that table

**None of those sizes are guaranteed by the C standard.** The standard only says:

- \`sizeof(char) == 1\`, always, and a byte is \`CHAR_BIT\` bits (almost always 8).
- \`sizeof(int) >= sizeof(short)\`, and \`sizeof(short) >= sizeof(char)\`.
- A \`long\` is **at least** 32 bits. A \`long long\` is **at least** 64 bits.
- \`int\` is at least 16 bits.

So a perfectly conforming C implementation could have a 16-bit \`int\`, and your program would be correct by the standard and wrong on every real machine. This is not hypothetical: 16-bit \`int\` was normal on DOS and on 16-bit embedded targets.

**Therefore: never write a literal size. Ask.**

\`\`\`c
#include <stdio.h>
#include <stdint.h>
#include <stddef.h>

int main(void)
{
    printf("char        %zu byte(s)\\n",  sizeof(char));
    printf("short       %zu byte(s)\\n",  sizeof(short));
    printf("int         %zu byte(s)\\n",  sizeof(int));
    printf("long        %zu byte(s)\\n",  sizeof(long));
    printf("long long   %zu byte(s)\\n",  sizeof(long long));
    printf("float       %zu byte(s)\\n",  sizeof(float));
    printf("double      %zu byte(s)\\n",  sizeof(double));
    printf("size_t      %zu byte(s)\\n",  sizeof(size_t));
    printf("pointer     %zu byte(s)\\n",  sizeof(void *));
    printf("CHAR_BIT    %d\\n",            CHAR_BIT);
    return 0;
}
\`\`\`

On a typical 64-bit Linux or macOS machine: \`1 2 4 8 8 4 8 8 8 8\`. On 64-bit Windows: the same except \`long\` is 4.

## The fixed-width types: the right answer for real work

C99 added \`<stdint.h>\`, which gives you types whose size is guaranteed **regardless of platform**:

| Type | Guaranteed size | Range |
| --- | --- | --- |
| \`int8_t\` / \`uint8_t\` | exactly 1 byte | −128..127 / 0..255 |
| \`int16_t\` / \`uint16_t\` | exactly 2 bytes | ±32,767 / 0..65,535 |
| \`int32_t\` / \`uint32_t\` | exactly 4 bytes | ±2.1 × 10⁹ |
| \`int64_t\` / \`uint64_t\` | exactly 8 bytes | ±9.2 × 10¹⁸ |
| \`intmax_t\`, \`uintmax_t\` | largest | |
| \`intptr_t\`, \`uintptr_t\` | fits a pointer | |

\`\`\`c
#include <stdint.h>
#include <inttypes.h>

uint32_t count = 0;

/* print a uint32_t correctly, on every platform */
printf("%" PRIu32 "\\n", count);      /* expands to %u or %lu as needed */
\`\`\`

\`PRIu32\` comes from \`<inttypes.h>\` and expands to the correct \`printf\` specifier for that platform. This is the correct, portable, professional way to print a fixed-width type, and it is used constantly in file formats, network protocols, and anything that reads a binary structure.

**Rule of thumb:** use \`int\` for counting and ordinary arithmetic. Use \`uint8_t\`/\`int32_t\`/\`uint64_t\` when the size matters — file formats, protocols, bit manipulation, anything that must be byte-compatible.

## \`float\` versus \`double\`

Use \`double\`. Almost always, without exception.

\`float\` has 24 bits of mantissa, giving about 7 significant decimal digits. That is not enough for money, and it is not enough for most computations that accumulate. \`double\` has 53 bits, about 15–16 digits.

\`\`\`c
float  a = 0.1f;
double b = 0.1;

printf("%.20f\\n", (double)a);   /* 0.10000000149011611938 */
printf("%.20f\\n", b);          /* 0.10000000000000000555 */
\`\`\`

Both are approximations of 0.1, because 0.1 has no exact representation in binary. Neither is "wrong" — but they are wrong by different amounts, and mixing them produces results that surprise you. Use \`double\` throughout and you sidestep the whole issue.

## Real numbers are not exact, and that is fine

\`\`\`c
#include <stdio.h>

int main(void)
{
    double sum = 0.0;
    for (int i = 0; i < 10; i++) sum += 0.1;
    printf("%.20f\\n", sum);        /* 0.99999999999999994522 */

    printf("%d\\n", 0.1 + 0.2 == 0.3);    /* 0 — never do this */
    printf("%.17g\\n", 0.1 + 0.2);         /* 0.30000000000000004 */
    return 0;
}
\`\`\`

0.1 and 0.2 are stored as the nearest representable doubles, and they do not sum to exactly the nearest representable 0.3.

**Never compare floating point numbers with \`==\` or \`!=\`.** Compare with a tolerance:

\`\`\`c
#include <math.h>

/* the usual pattern */
if (fabs(a - b) < 1e-9) { ... }

/* or, when the values are large relative to their difference */
#include <float.h>
if (fabs(a - b) <= DBL_EPSILON * fmax(fabs(a), fabs(b))) { ... }
\`\`\`

## Where the limits are

\`\`\`c
#include <limits.h>
#include <float.h>

INT_MAX      /* 2147483647 on a 32-bit int */
INT_MIN      /* -2147483648 */
UINT_MAX     /* 4294967295 */
SCHAR_MIN    /* -128 */
SCHAR_MAX    /* 127 */
DBL_MAX      /* ~1.7976931348623157e+308 */
DBL_EPSILON  /* ~2.2204460492503131e-16 — the gap at 1.0 */
\`\`\`

\`DBL_EPSILON\` is worth understanding: it is the difference between 1.0 and the next representable double. Every real number you work with has an uncertainty of at least this relative size. That is not a defect; it is what binary floating point is.

## The ladder, in short

- **Counting things, indexing arrays, ordinary arithmetic:** \`int\`
- **A number that might be very large or very precise:** \`long\` / \`long long\`, or \`int64_t\`
- **Real numbers:** \`double\`
- **One character of text:** \`char\`
- **A size or an index that came from \`sizeof\`/\`strlen\`:\` \`size_t\`
- **A value whose byte layout must not change between machines:** \`uint8_t\`, \`int32_t\`, \`uint64_t\` from \`<stdint.h>\``),
        b.anim('types', {
          title: 'Type sizes, ranges, and what happens at the edges',
          badge: 'press "overflow →"',
          types: [
            { name: 'char', bytes: 1, signed: '−128 .. 127', unsigned: '0 .. 255', note: 'One byte of text. Also where EOF lives' },
            { name: 'short', bytes: 2, signed: '−32,768 .. 32,767', unsigned: '0 .. 65,535', note: 'Almost never better than int' },
            { name: 'int', bytes: 4, signed: '−2,147,483,648 .. 2,147,483,647', unsigned: '0 .. 4,294,967,295', note: 'The default. Use this' },
            { name: 'long', bytes: '4 or 8', signed: 'at least ±2.1 × 10⁹', unsigned: 'at least 0 .. 4.2 × 10⁹', note: '4 on Windows, 8 on Linux/macOS' },
            { name: 'long long', bytes: 8, signed: '±9,223,372,036,854,775,807', unsigned: '0 .. 18,446,744,073,709,551,615', note: 'Guaranteed at least 64 bits' },
            { name: 'float', bytes: 4, signed: '~7 significant digits', unsigned: '—', note: 'Almost always use double instead' },
            { name: 'double', bytes: 8, signed: '~15–16 significant digits', unsigned: '—', note: 'The default for real numbers' },
            { name: 'size_t', bytes: '4 or 8', signed: '— (unsigned)', unsigned: '0 .. 2⁶⁴−1', note: 'Sizes and indices. Print with %zu' },
          ],
          demos: [
            { title: 'unsigned char', width: 8, signed: false, start: 252 },
            { title: 'signed char', width: 8, signed: true, start: 126 },
            { title: 'unsigned int', width: 32, signed: false, start: 4294967292 },
          ],
        }),
        b.lead('Why overflow is not a small problem'),
        b.code(
          `#include <stdio.h>

int main(void)
{
    unsigned char small = 250;

    for (int i = 0; i < 10; i++) {
        printf("small = %3u -> +1 = %3u\\n", small, small + 1);
        small++;                 /* DEFINED: wraps around */
    }

    signed char ssmall = 126;
    for (int i = 0; i < 4; i++) {
        printf("ssmall = %4d -> +1 = %4d\\n", ssmall, ssmall + 1);
        ssmall++;                /* UNDEFINED BEHAVIOUR */
    }
    return 0;
}

/* Output:
   small = 250 -> +1 = 251
   small = 251 -> +1 = 252
   small = 252 -> +1 = 253
   small = 253 -> +1 = 254
   small = 254 -> +1 = 255
   small = 255 -> +1 = 0     <- defined wraparound
   small =   0 -> +1 = 1
   ...
   ssmall =  126 -> +1 =  127
   ssmall =  127 -> +1 = -128   <- whatever your compiler decides
   ssmall = -128 -> +1 = ???    <- and this line is not even required to run
*/
`,
          'overflow.c'
        ),
        b.tip(
          'Which to worry about more',
          'Unsigned overflow is defined, so it will produce a wrong-but-predictable number. Signed overflow is undefined, so it can produce *anything* — including code that does not run at all. When auditing code, the signed cases are the dangerous ones, and they are also the ones nobody warns you about because "unsigned wraparound" is the famous one.',
        ),
      ],
      questions: [
        [
          'What is the guaranteed size of int in the C standard?',
          [
            'Exactly 4 bytes',
            'Exactly 2 bytes',
            'At least 16 bits — typically 4 bytes, but the standard does not guarantee it',
            'Whatever the compiler chooses',
          ],
          2,
          'The standard only guarantees a minimum. A conforming implementation could have a 16-bit int, which is why you use sizeof or the fixed-width types from <stdint.h> rather than hard-coding 4.',
        ],
        [
          'You need a value that is exactly 32 bits wide when written to a file format, readable on any platform. Which type?',
          [
            'int',
            'long',
            'uint32_t from <stdint.h>',
            'size_t',
          ],
          2,
          'int32_t/uint32_t are guaranteed to be exactly 4 bytes on every conforming implementation. int is only guaranteed to be at least 16 bits.',
        ],
        [
          'Why is `if (0.1 + 0.2 == 0.3)` false?',
          [
            'Because of rounding in the compiler',
            'Because 0.1 and 0.2 have no exact binary representation, so their sum is not exactly the stored 0.3',
            'Because == does not work on doubles',
            'Because of the -O2 flag',
          ],
          1,
          '0.1 and 0.2 are stored as the nearest representable doubles, and the nearest double to their sum is not the nearest double to 0.3. Compare with a tolerance instead.',
        ],
        [
          'What is the range of a signed 8-bit type?',
          [
            '0 .. 255',
            '−128 .. 127',
            '−255 .. 255',
            '1 .. 256',
          ],
          1,
          'Signed uses two’s complement, so 8 bits give 256 distinct values split as one zero and 255 negative values: −128 to 127.',
        ],
        [
          'Which of these is the right type for a loop counter that goes to 10,000,000?',
          [
            'unsigned char — it can only count to 255 so it is obviously wrong',
            'int, because 10,000,000 fits in a 32-bit int',
            'double, because integers are imprecise',
            'float, for speed',
          ],
          1,
          'int comfortably holds 10 million. The signed/unsigned distinction matters more than the size here, and using a signed int also avoids the -Wsign-compare warning when comparing against a size_t.',
        ],
      ],
    },
    {
      title: 'The five storage keywords: const, volatile, static, extern, register',
      summary: 'What each qualifier actually changes, and which ones affect optimisation.',
      duration: 15,
      build: (b) => [
        b.md(`## \`const\` — this name will not change

\`\`\`c
const int MAX = 100;
const char *name = "Riya";     /* the POINTER can change, the characters cannot */
char *const name2 = buffer;     /* the pointer cannot change, the characters can */
const char *const name3 = "Riya";  /* neither can change */
\`\`\`

Read these right to left: the qualifier nearest the name applies to the name. In \`char *const name2\`, \`const\` is next to \`name2\`, so \`name2\` is constant — you cannot point it somewhere else — but the characters it points to are writable.

A name declared \`const\` and given an initialiser at file scope is *not* a compile-time constant in C. \`const int MAX = 100;\` does **not** let you write \`int arr[MAX];\` with \`MAX\` as an array bound. Only macros and enum constants can do that. (C23 added \`constexpr\` for this, but it is not available in older toolchains.)

**The real value of \`const\` is to a reader and to the compiler.** It tells both that something will not change, which permits optimisations, and it stops an accidental assignment at compile time. Use it on every parameter you do not modify.

## \`volatile\` — this can change behind my back

\`volatile\` tells the compiler: *do not cache this in a register, do not assume it is constant, re-read it every time you use it.*

\`\`\`c
volatile int hardware_register;    /* a memory-mapped device register */
volatile int interrupt_flag = 0;   /* changed by an interrupt handler */

while (interrupt_flag == 0) {
    /* spin until the ISR sets the flag */
}
\`\`\`

Without \`volatile\`, the compiler is entitled to hoist the read out of the loop, because as far as it can see the value never changes — so your loop never ends. \`volatile\` is how you say "this is not really memory; it is hardware, or another thread, or a signal handler."

The two rules that always come with it:

1. \`volatile\` does **not** make access atomic. On a multi-core machine, \`flag++\` on a \`volatile int\` is still a read-modify-write and can be interrupted. For real cross-thread communication you need atomics (\`<stdatomic.h>\`) or platform intrinsics.
2. \`volatile\` does **not** provide ordering between different variables. If the hardware protocol requires a write to a data register to happen before a write to a control register, you need a memory barrier as well.

For a beginner, \`volatile\`'s job is narrow and important: memory-mapped I/O, signal handlers, and variables shared with a \`sig_atomic_t\`. That is all.

## \`static\` — two completely different meanings

**At file scope:** internal linkage. The name is visible only within this translation unit. Nobody else can call it or link to it.

\`\`\`c
/* helpers.c */
static int clamp(int v, int lo, int hi) { ... }   /* only usable in helpers.c */

int public_function(void) { ... }                  /* visible to the linker */
\`\`\`

This is how you keep a module's internals to itself while still exporting its API. It is also a name-resolution optimisation and a genuine encapsulation mechanism.

**Inside a function:** static storage duration. The object is created once, before \`main\`, and keeps its value between calls, while the name stays block-scoped. The counter idiom from the previous lesson.

\`\`\`c
int next_id(void)
{
    static int id = 0;    /* runs once */
    return ++id;
}
\`\`\`

## \`extern\` — "this is declared, not defined"

\`\`\`c
/* config.h */
extern int g_max_connections;    /* declaration only */

/* config.c */
int g_max_connections = 100;     /* the definition, and the storage */
\`\`\`

\`extern\` is only needed when the declaration is not visible from where you use it. In modern C with proper headers, you write \`#include "config.h"\` and the header's \`extern\` declaration does the work. Bare \`extern\` declarations scattered through code are a code smell.

Inside a function, \`extern int x;\` means "use the file-scope \`x\`, not a new local."

## \`register\` — a hint, and a restriction

\`register int counter;\` asks the compiler to keep the variable in a CPU register rather than memory. On any modern compiler this achieves nothing that optimisation does not already achieve, and it comes with a real restriction:

> **You cannot take the address of a \`register\` variable.** \`&counter\` is a constraint violation.

\`\`\`c
register int counter = 0;
int *p = &counter;   /* ERROR: address of a register variable requested */
\`\`\`

That is why nobody uses \`register\`. The hint is worthless and the restriction is real. Learn to recognise it; do not use it.

## \`auto\` — not what you think

\`auto\` is the default storage class for local variables. \`auto int x = 5;\` is identical to \`int x = 5;\`.

C11 gave \`auto\` a second meaning, type inference: \`auto x = 5;\` deduces \`int\`. (C23 turns that into a \`constexpr\`-adjacent feature and removes the old storage-class meaning entirely.) Neither is something you need in a first course, but seeing \`auto\` in old C code should not confuse you.

## Putting it together

\`\`\`c
#include <stdint.h>

/* internal linkage: only this file may use it */
static uint32_t g_call_count = 0;

/* external linkage: the linker exports it */
int          g_total_errors = 0;

/* read-only from the compiler's point of view */
static const char *const g_program_name = "logger";

/* the hardware might change it at any moment */
static volatile uint32_t *const g_status_register = (volatile uint32_t *)0x40021000;

int record_call(void)
{
    g_call_count++;              /* persists between calls, file-private */
    return (int)g_call_count;
}
\`\`\``),
        b.lead('Qualifier quick reference'),
        b.table(
          'Storage class and qualifiers',
          ['Keyword', 'Where', 'What it does', 'Does it change optimisation?'],
          [
            ['auto', 'in a function', 'Default for locals. In C11+, type inference', 'No'],
            ['register', 'in a function', 'Suggests a register. Forbids taking the address', 'Nominally, but nobody uses it'],
            ['static (local)', 'in a function', 'Creates once, keeps value between calls', 'Yes — no aliasing assumed'],
            ['static (file)', 'at file scope', 'Internal linkage: private to this .c file', 'Yes — the compiler can inline it freely'],
            ['extern', 'anywhere', 'Declaration only, no storage allocated', 'No'],
            ['const', 'anywhere', 'This object will not change through this name', 'Yes — often a lot'],
            ['volatile', 'anywhere', 'Re-read every time; may change externally', 'Yes — actively blocks caching'],
          ]
        ),
        b.warn(
          'volatile is not a synchronisation primitive',
          'It stops the compiler caching a value, and that is all. It does not make `counter++` atomic, it does not order one volatile write before another, and it does nothing for data races between threads. For those you need <stdatomic.h>. Using volatile to "fix" a threading bug is one of the most common and most damaging misconceptions in systems programming.',
        ),
        b.tip(
          'const on parameters is free performance',
          'Writing `int process(const char *text, size_t len)` tells the compiler the function cannot modify the buffer, which lets it skip aliasing checks and reorder more aggressively. It costs nothing, documents intent, and makes the API self-describing. Do it by default.',
        ),
      ],
      questions: [
        [
          'In `const char *p`, what is constant?',
          [
            'The character data p points to',
            'The pointer p itself',
            'Both',
            'Neither',
          ],
          0,
          'The `const` is next to `char`, so it applies to the pointed-to characters. To make the pointer constant as well you write `char *const p`, or `const char *const p` for both.',
        ],
        [
          'What does `volatile` guarantee?',
          [
            'That reads and writes are atomic',
            'That the compiler must re-read the value on every use and must not cache it in a register',
            'That access is ordered with respect to other variables',
            'That the variable cannot be optimised away in any way',
          ],
          1,
          'Only that the compiler treats every access as potentially observable. It says nothing about atomicity or ordering — those need atomics and memory barriers.',
        ],
        [
          'What is the difference between a file-scope `static` and a function-local `static`?',
          [
            'There is none',
            'File-scope static means internal linkage; local static means the object persists for the whole program but the name is block-scoped',
            'File-scope static is faster',
            'Local static cannot be modified',
          ],
          1,
          'Two entirely different meanings of one keyword. The file-scope case is about visibility across translation units; the local case is about lifetime.',
        ],
        [
          'What makes `register int x;` mostly useless in practice?',
          [
            'Compilers ignore it entirely',
            'The optimisation is already done automatically, and it forbids taking the address with &x',
            'It is only allowed on globals',
            'It disables optimisation',
          ],
          1,
          'Modern compilers allocate registers better than the hint could, so the only lasting effect is the restriction on &x.',
        ],
        [
          'You declare `extern int g_count;` at the top of main.c and `int g_count = 5;` in count.c. What is each?',
          [
            'Both are definitions',
            'The first is a declaration, the second is the definition that allocates storage',
            'The first is a definition, the second is a declaration',
            'Both are incomplete types',
          ],
          1,
          'The keyword extern is what distinguishes a declaration from a definition. A file-scope int without extern would be a definition too, and having two would be a multiple-definition link error.',
        ],
      ],
    },
    {
      title: 'Integer literals, bases, suffixes, and negative literals',
      summary: '0x, 0b, 0, suffixes, and why -5 is not an integer literal.',
      duration: 12,
      build: (b) => [
        b.md(`## Every way to write a number

\`\`\`c
42          /* decimal */
0x2A        /* hexadecimal  = 42 */
0b101010    /* binary (C23 / GCC extension before that) = 42 */
052        /* octal — leading zero! = 42 */
0X2a        /* hex, uppercase prefix and digits */
42u         /* unsigned int */
42U         /* unsigned int, same thing */
42l  42L    /* long */
42ul 42UL   /* unsigned long */
42ll 42LL   /* long long */
42ull 42ULL /* unsigned long long */
42.0         /* double */
42.          /* double */
42.0f 42.f   /* float */
42e3        /* double: 42000.0 */
42e-3f       /* float: 0.042 */
0x1.8p3      /* C99 hex float: 1.5 × 2³ = 12.0 */
\`\`\`

## The octal trap

A leading zero means **octal**, not zero-padded decimal. This is not a C quirk to work around; it is a real and widely used notation (file permissions, bit masks).

\`\`\`c
int mode = 0755;      /* 493 decimal — correct and intentional */
int year = 0755;      /* 493, NOT the year 755 */

int wrong = 010;      /* 8, not 10 */
\`\`\`

If you want a decimal number that happens to start with a zero, write it without one, or as a hex literal. If you want a mask like \`0xFF00\`, remember the equivalent octal is \`0177400\`, not \`0FF00\`.

## Suffixes decide the type of the literal, and this matters

A literal without a suffix gets the **first** type in this list that can hold it:

\`\`\`c
int    → long    → long long    (for integer literals)

42        -> int
4200L     -> long
42LL      -> long long
\`\`\`

That is why this overflows:

\`\`\`c
int big = 2147483648;      /* WRONG: the literal is too big for int,
                              so it becomes a long, and then converting
                              long -> int overflows. Undefined behaviour. */

long big = 2147483648;     /* correct: the literal is a long */
long big2 = 2147483648L;   /* correct: the suffix forces it */
\`\`\`

Similarly for floats: an unsuffixed floating literal is always a \`double\`, never a \`float\`. If you want a \`float\`, you must write the \`f\`. \`float x = 1.0 / 3.0;\` computes in double and then rounds — usually fine, occasionally not.

## \`-5\` is not a literal

There is no negative integer literal in C. \`-5\` is the unary minus operator applied to the literal \`5\`. This matters in two places:

1. **The C standard's own rule:** \`-9223372036854775808\` does not exist as a constant. \`9223372036854775808\` is \`long\` (or \`long long\`) and cannot be negated, so you must write \`(-9223372036854775807LL - 1)\` or use \`INT64_MIN\` from \`<stdint.h>\`.
2. **Operator precedence:** \`-3 ^ 2\` is \`-(3 ^ 2)\`, not \`(-3) ^ 2\`, because unary minus binds tighter than \`^\` but the result is the same for \`^\`. For \`*\` and \`/\` it matters: \`-7 / 2\` is \`-3\`, not \`-3.5\`, because the division truncates toward zero *after* the negation. If you want \`-3.5\` you need \`-(7 / 2.0)\`.

## Character constants are integer constants

\`\`\`c
char c = 'A';       /* 65 */
int  x = 'A' + 1;   /* 66 = 'B' */
\`\`\`

This makes \`'a' - 'A'\` equal to 32, and lets you do \`c - '0'\` to convert a digit character to its numeric value. Both are used constantly in text processing.

## Practical advice

- Use **decimal** in almost all code. Hex for masks, addresses, and colours. Octal only for file modes and when a mask reads better in octal.
- Write the suffix when the type matters, especially for large values: \`1000000L\`.
- Use \`<stdint.h>\` and \`<inttypes.h>\` constants (\`INT32_MAX\`, \`UINT64_C(5)\`) for anything at the edges of a range.
- Never write \`-9223372036854775808\`. Use \`INT64_MIN\`.`),
        b.lead('Literal notation quick reference'),
        b.table(
          'Number notations',
          ['Written as', 'Base', 'Value', 'Use for'],
          [
            ['42', 'decimal', '42', 'Everything, by default'],
            ['0x2A', 'hexadecimal', '42', 'Bit masks, addresses, colours, opcodes'],
            ['0b101010', 'binary', '42', 'Bit patterns (C23 / GCC extension)'],
            ['052', 'octal', '42', 'File permissions (chmod 644), masks'],
            ['42u', 'decimal', '42', 'Forcing unsigned'],
            ['42L / 42LL', 'decimal', '42', 'Forcing a wider type'],
            ['42.0', 'decimal', '42.0', 'Forcing double'],
            ['42.0f', 'decimal', '42.0f', 'Forcing float'],
            ['42e3', 'decimal', '42000.0', 'Very large or very small reals'],
          ]
        ),
        b.tip(
          'Reading a hex mask out loud',
          '0xFF00 is "the middle two bytes set" in a 32-bit word: 1111 1111 0000 0000. If you write masks in hex, learn to read them in binary, because that is how you will need to reason about them when a bit is not where you expected.',
        ),
        b.code(
          `/* Why the suffix is not optional. */

#include <stdio.h>
#include <stdint.h>
#include <limits.h>

int main(void)
{
    /* The literal 2147483648 does not fit in int, so C types it as long.
       Assigning a long to an int overflows — undefined behaviour. */
    // int broken = 2147483648;      /* do not do this */

    long correct_a = 2147483648;        /* literal is long; long holds it */
    long correct_b = 2147483648L;       /* suffix forces long explicitly */
    int64_t correct_c = INT64_C(2147483647) + 1;   /* portable, from stdint.h */

    printf("a=%ld b=%ld c=%lld\\n", correct_a, correct_b, (long long)correct_c);

    /* There is no negative literal -9223372036854775808. */
    // long long broken2 = -9223372036854775808;    /* does not compile cleanly */
    long long min_ok = INT64_MIN;                  /* the correct way */

    printf("INT64_MIN = %lld\\n", (long long)min_ok);

    /* -5 is the operator minus applied to 5, not a literal. */
    printf("-7 / 2  = %d\\n", -7 / 2);      /* -3, not -4 */
    printf("-(7/2.0)= %g\\n", -(7 / 2.0));  /* -3.5 */
    return 0;
}
`,
          'literals.c'
        ),
      ],
      questions: [
        [
          'What is the decimal value of 052?',
          [
            '52',
            '42',
            '50',
            'It is a syntax error',
          ],
          1,
          'A leading zero means octal, so 052 is 5×8 + 2 = 42. This is a real notation (chmod 755) and a real source of bugs when people write decimal numbers with leading zeros.',
        ],
        [
          'What type does the literal 42 have?',
          [
            'Always int',
            'The first type in the list int, long, long long that can represent it',
            'Always long',
            'It depends on the compiler’s default',
          ],
          1,
          'An unsuffixed decimal integer literal gets the first type from int, long, long long that fits. This is why 2147483648 does not fit in an int.',
        ],
        [
          'What is the type of the floating literal 1.0?',
          [
            'float',
            'double',
            'long double',
            'It is unspecified',
          ],
          1,
          'Always double. If you want a float you must write 1.0f. This differs from integer literals, where the type is chosen to fit the value.',
        ],
        [
          'What does -7 / 2 evaluate to, and why?',
          [
            '-4, because C rounds toward negative infinity',
            '-3, because both operands are converted and integer division truncates toward zero',
            '-3.5, because / is real division',
            'It is undefined behaviour',
          ],
          1,
          'C99 requires integer division to truncate toward zero, so -7/2 is -3. This differs from most maths conventions and from Python.',
        ],
        [
          'Why must you use INT64_MIN instead of writing -9223372036854775808?',
          [
            'Because 9223372036854775808 is too large for long long',
            'Because there is no negative integer literal in C — the magnitude is out of range, so it cannot be negated',
            'Because INT64_MIN is faster',
            'Because long long does not exist before C23',
          ],
          1,
          '9223372036854775808 exceeds LONG_LONG_MAX, so it is not a representable long long and the unary minus cannot be applied to it. INT64_MIN from <stdint.h> is the portable spelling.',
        ],
      ],
    },
    {
      title: 'Conversions: how one type silently becomes another',
      summary: 'Implicit conversions, the integer promotions, the int/pointer trap, and how float turns into int.',
      duration: 17,
      build: (b) => [
        b.md(`## C converts silently, and that is a feature and a hazard

C is a **weakly typed** language with **implicit conversion**. Assign an \`int\` to a \`double\` and it just happens. Assign a \`double\` to an \`int\` and it also just happens, and you lose the fraction. There is no error unless you turn on \`-Wconversion\` and even then it is a warning.

This is convenient and it is where a lot of C bugs live. Understanding the rules is not optional.

## The usual arithmetic conversions

When an operator has two operands of different types, C converts them to a common type first. The order of preference:

1. If either is \`long double\`, both become \`long double\`.
2. Else if either is \`double\`, both become \`double\`.
3. Else if either is \`float\`, both become \`float\`.
4. Else **integer promotion** happens, then:
   - if either is \`unsigned long\`, common type is \`unsigned long\`
   - else if one is \`long\` and the other \`unsigned int\`: if \`long\` can represent all \`unsigned int\` values, common type is \`long\`; **otherwise both become \`unsigned long\`**
   - else if either is \`long\`, common type is \`long\`
   - else if either is \`unsigned int\`, common type is \`unsigned int\`
   - else common type is \`int\`

The bolded rule is the one that produces security bugs. On a 32-bit \`int\` / 64-bit \`long\` platform, \`-1 < someUnsignedInt\` converts \`-1\` to a huge \`unsigned long\` and the comparison is **always false**.

## The integer promotions

Any type narrower than \`int\` — \`char\`, \`signed char\`, \`unsigned char\`, \`short\`, \`unsigned short\`, \`_Bool\` — is promoted to \`int\` (or \`unsigned int\` if \`int\` cannot hold every value of the original type, which for a 16-bit \`int\` and a 16-bit \`unsigned short\` actually happens).

This is why these work:

\`\`\`c
unsigned char a = 200;
unsigned char b = 100;

a + b;      /* both promote to int, so 300 — no wraparound! */
\`\`\`

And this is the surprise:

\`\`\`c
unsigned int a = 1;
int b = -2;

a + b;      /* a is unsigned int, int converts to unsigned int,
              so b becomes 4294967294, and the result is 4294967295 */
\`\`\`

The fix is to promote one side explicitly:

\`\`\`c
(a + (int)b)          /* explicit */
((int)a + b)          /* explicit */
1 * a + b             /* multiply by 1 promotes a to int */
\`\`\`

## Conversion between float and int truncates

\`\`\`c
double d = 3.99;
int i = d;         /* i == 3, the fraction is discarded, NOT rounded */

int neg = -3.99;   /* -3, truncation is toward zero, not toward -infinity */

double out_of_range = 1e20;
int bad = out_of_range;   /* UNDEFINED BEHAVIOUR — the value does not fit */
\`\`\`

So this rounding is wrong:

\`\`\`c
int rounded = (int)(value + 0.5);   /* wrong for negative values:
                                        -3.4 + 0.5 = -2.9, (int) = -2, not -3 */
\`\`\`

Correct rounding, if you need it:

\`\`\`c
#include <math.h>

/* round() rounds half away from zero, for any sign. */
int rounded = (int)round(value);

/* For non-negative values the common idiom is fine and avoids <math.h>: */
int rounded_positive = (int)(value + 0.5);
\`\`\`

## The int/pointer trap

These are the conversions that produce segfaults:

\`\`\`c
int x = 65;
char *p = (char *)&x;      /* legal! you can inspect the bytes of an int */

char *q = "hello";
int  n = (int)q;           /* legal to compile, nonsense to do:
                              n is now a number, not an address */
int  *bad = 12345;         /* compiles with a warning, crashes on use */
\`\`\`

The rule: **a pointer can be converted to an integer, and an integer can be converted to a pointer, but an integer that is not a valid address is undefined behaviour the moment you dereference it.** Casting does not make it true. It only silences the compiler.

This is also how type-punning works, incidentally — and it is a technique the standard only partially blesses (see the strict aliasing discussion in Module 13).

## \`void\` and \`(void)\` casts

\`\`\`c
void *p = malloc(100);      /* converting to void* is implicit in C — no cast needed */
int  *q = (int *)p;         /* converting back DOES need a cast */
\`\`\`

In C, \`void *\` converts implicitly to and from any object pointer. C++ requires the cast in both directions. \`(void)expr;\` is an **explicit discard**: it evaluates \`expr\` and throws the result away. It is the idiomatic way to say "I called this for its side effect and I know it returns something."

\`\`\`c
free(p);              /* returns void, nothing to discard */
(void)printf("hi");   /* discards the character count — being explicit about it */
\`\`\`

## How to write conversion-safe code

1. **Compare like with like.** Never compare a signed value to an unsigned one. Make both the same type.
2. **Check ranges before narrowing.** If a \`double\` becomes an \`int\`, verify it fits.
3. **Use the fixed-width types at boundaries**, and convert once, deliberately, at the edge.
4. **Compile with \`-Wconversion\`** while learning. It is noisy and it is correct, and it will teach you where your implicit conversions are.`),
        b.anim('trace', {
          title: 'Signed becomes unsigned, silently',
          badge: 'step through',
          code: `unsigned int account = 1;
int          delta   = -2;

if (account + delta < 0) {
    printf("underflow detected\\n");
}

printf("%u\\n", account + delta);`,
          steps: [
            {
              line: 1,
              caption: 'Two values with different types: one unsigned, one signed. Nothing has gone wrong yet.',
              vars: [
                { name: 'account', value: '1 (unsigned int)', tone: 'int' },
                { name: 'delta', value: '-2 (int)', tone: 'int' },
              ],
            },
            {
              line: 4,
              caption: 'For account + delta, the usual arithmetic conversions apply. int cannot represent all unsigned int values, so delta is converted to unsigned int.',
              note: 'The conversion is not a reinterpretation of the bytes — it is a mathematical conversion: -2 becomes 4294967294.',
              vars: [
                { name: 'account', value: '1 (unsigned int)', tone: 'int' },
                { name: 'delta', value: '4294967294 (unsigned int)', tone: 'bad' },
              ],
            },
            {
              line: 4,
              caption: 'The addition is now unsigned: 1 + 4294967294 = 4294967295, which wraps to 4294967295.',
              vars: [{ name: 'account + delta', value: '4294967295 (unsigned)', tone: 'bad' }],
            },
            {
              line: 4,
              caption: 'The comparison with 0 converts 0 to unsigned too. 4294967295 < 0 is FALSE — so the underflow is never detected.',
              note: 'This is a genuine security bug pattern: a balance check that silently passes when the balance is negative. The compiler would have told you with -Wsign-compare.',
              vars: [{ name: '(unsigned)0', value: '0', tone: 'int' }],
            },
            {
              line: 7,
              caption: 'The program prints 4294967295 and the "underflow detected" branch never runs.',
              output: '4294967295',
              vars: [],
            },
          ],
        }),
        b.lead('The rules that actually bite'),
        b.table(
          'Conversions to memorise',
          ['From', 'To', 'What happens', 'Safe?'],
          [
            ['int', 'double', 'Exact for values under 2^53', 'Yes'],
            ['double', 'int', 'Truncates toward zero', 'Only if in range'],
            ['double', 'int, out of range', 'Undefined behaviour', 'NO'],
            ['unsigned', 'signed, negative value', 'Implementation-defined; usually wraps', 'NO'],
            ['signed', 'unsigned', 'Adds 2^n until in range', 'Usually what you want'],
            ['pointer', 'integer', 'Value of the address', 'Yes, if the type is large enough'],
            ['integer', 'pointer', 'That integer becomes an address', 'Only if it is one'],
            ['float', 'double', 'Promoted exactly', 'Yes'],
            ['any', '_Bool', '0 if zero, 1 otherwise', 'Yes'],
            ['signed', 'unsigned', 'Reinterpreted modulo 2^n', 'Yes, defined — just be sure it is what you meant'],
          ]
        ),
        b.tip(
          'The one-line fix for almost every signed/unsigned bug',
          'Before comparing, make the types identical by casting one side explicitly — usually to `long long` or to the unsigned type, whichever matches the domain. A cast in the comparison is documentation: it says "I have thought about this".',
        ),
        b.warn(
          'float to int out of range is undefined, not clamped',
          'Casting 1e20 to int, or casting NaN or infinity to int, is undefined behaviour. On x86 it typically produces INT_MIN (-2147483648) rather than crashing, which is arguably worse because the wrong value looks plausible. If you accept untrusted real numbers, range-check before you convert.',
        ),
      ],
      questions: [
        [
          'What is the value of `unsigned int a = 1; int b = -2; a + b;` on a 32-bit int platform?',
          [
            '-1',
            '4294967295',
            '0',
            'It is a compile error',
          ],
          1,
          'The usual arithmetic conversions convert b to unsigned int, where -2 is 4294967294. Adding gives 4294967295, which is in range for unsigned int.',
        ],
        [
          'What is the value of `int i = 3.99;`?',
          [
            '4',
            '3',
            '3.99',
            'Undefined behaviour',
          ],
          1,
          'Conversion from a floating type to an integer truncates toward zero. There is no rounding unless you ask for it with round().',
        ],
        [
          'Why does `unsigned char a = 200; unsigned char b = 100; a + b;` give 300 rather than wrapping?',
          [
            'Unsigned arithmetic never wraps',
            'Both operands are integer-promoted to int before the addition, so the arithmetic is signed',
            'The compiler detects the overflow and fixes it',
            'It does give 44',
          ],
          1,
          'Types narrower than int are promoted to int for arithmetic, so the addition happens in int (32 bits) where 300 fits. Only the assignment back to unsigned char would truncate.',
        ],
        [
          'In C, what does `(void)some_function();` do?',
          [
            'Casts the function to void',
            'Evaluates the call and deliberately discards the return value',
            'Deletes the function',
            'Declares the function as returning void',
          ],
          1,
          'It is an explicit discard of a return value. C allows discarding any expression’s value, but writing (void) documents that you are choosing to.',
        ],
        [
          'What is the safest fix for `if (some_unsigned < some_signed_negative)`?',
          [
            'Add parentheses',
            'Cast the signed value to the unsigned type explicitly, after confirming the domain',
            'Change both to float',
            'Use %zu in printf',
          ],
          1,
          'The comparison converts the signed side to unsigned regardless. Making it explicit at least forces you to state which domain you are in; casting to long long is the alternative when the signed value can legitimately be negative.',
        ],
      ],
    },
  ]
);
