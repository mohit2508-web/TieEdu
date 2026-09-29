// Module 3 — Input and output.
// printf and scanf are the two functions every C beginner meets first and the two
// they misjudge hardest. Both are variadic, which means the compiler can only
// help you if your format string and your arguments actually agree.

import { mod } from '../blocks';

export const M3 = mod(
  'crs-c-programming',
  'c-m3',
  3,
  'Module 3 — Input and Output',
  'printf, the format string as a language, escape sequences, and reading input without overflowing a buffer.',
  [
    {
      title: 'printf: a format string is a tiny language',
      summary: 'Conversion specifiers, field width, precision, flags, and how to read printf("%d") correctly.',
      duration: 18,
      build: (b) => [
        b.md(`## The shape of a call

\`\`\`c
printf("format string", arg1, arg2, ...);
\`\`\`

The format string is ordinary text with **conversion specifiers** embedded in it. Each specifier consumes exactly one argument, in order. \`printf\` does not know the types of your arguments — it only knows what the format string says they should be. If the string and the arguments disagree, you have a bug, and it may be a memory-safety bug.

\`\`\`c
int    age        = 20;
double height     = 1.75;
char   grade      = 'A';
const char *name  = "Riya";

printf("%s is %d years old, %.2f m tall, grade %c\\n", name, age, height, grade);
\`\`\`

Output: \`Riya is 20 years old, 1.75 m tall, grade A\`

## The specifiers you will actually use

| Specifier | Type | Example | Notes |
| --- | --- | --- | --- |
| \`%d\` \`%i\` | \`int\` | \`42\` | Same thing. Signed decimal |
| \`%u\` | \`unsigned int\` | \`42\` | Unsigned decimal |
| \`%ld\` | \`long\` | \`42L\` | **Must match the type.** \`%d\` for a \`long\` is a bug |
| \`%lld\` | \`long long\` | \`42LL\` | Likewise |
| \`%zu\` | \`size_t\` | \`4096\` | Correct for anything from \`sizeof\` or \`strlen\` |
| \`%f\` | \`float\`, \`double\` | \`1.750000\` | Default 6 decimal places |
| \`%e\` | \`double\` | \`1.750000e+00\` | Scientific |
| \`%g\` | \`double\` | \`1.75\` | Shortest of %f and %e |
| \`%c\` | \`char\` | \`A\` | One character |
| \`%s\` | \`char *\` | \`hello\` | **A pointer**, not an array |
| \`%p\` | \`void *\` | \`0x7ffd3c\` | Addresses; you must cast to \`void *\` |
| \`%%\` | — | \`%\` | A literal percent sign |

Two of those deserve emphasis:

**\`%s\` takes a pointer.** \`printf("%s", name)\` is correct because \`name\` *is* a pointer. \`printf("%s", letter)\` where \`letter\` is a \`char\` is a bug — \`printf\` will read a character code and treat it as an address.

**\`%zu\` for \`size_t\`.** \`strlen\`, \`sizeof\` and the allocation functions all return \`size_t\`, which is unsigned and may be wider than \`int\`. \`printf("%zu", n)\` is always right.

## Field width, precision and flags

The general form is \`%[flags][width][.precision]conversion\`.

\`\`\`c
printf("[%5d]\\n",   42);      /* [   42]  width 5, right-aligned  */
printf("[%-5d]\\n",  42);      /* [42   ]  the - flag left-aligns  */
printf("[%05d]\\n",  42);      /* [00042]  zero-padded             */
printf("[%+d]\\n",   42);      /* [+42]   always show the sign     */
printf("[% d]\\n",   42);      /* [ 42]   space instead of +      */
printf("[%8.3f]\\n", 3.14159);  /* [   3.142] width 8, 3 decimals  */
printf("[%-8.3f]\\n", 3.14159); /* [3.142   ]                      */
\`\`\`

Precision means different things for different types, which trips people up:

- For **\`f\`, \`e\`, \`g\`**: the number of digits **after** the decimal point.
- For **\`s\`**: the maximum number of characters to print. \`printf("%.3s", "hello")\` prints \`hel\`.
- For **\`d\`**: the minimum number of digits, so \`%05d\` of 42 is \`00042\`.
- For **\`p\`**: an implementation detail you can ignore.

\`\`\`c
printf("|%10.4s|\\n", "abcdefghij");   /* |      abcd| */
printf("%.0f\\n", 2.5);                /* 2  — rounds to even, see below */
\`\`\`

## Dynamic field width: \`*\`

You can compute the width at runtime by passing \`*\` and then an \`int\` argument:

\`\`\`c
printf("%*d|\\n", 8, 42);      /* "      42|" */
\`\`\`

This is the standard trick for laying out aligned tables without storing every
string.

## The return value, and why it matters

\`printf\` returns the number of characters written, or a **negative value** if
the output failed. So this is a perfectly good error check:

\`\`\`c
if (printf("hello\\n") < 0) {
    /* the write failed — disk full, closed pipe, disk full on a log */
}
\`\`\`

The same is true of \`fprintf\` and \`sprintf\`. Novice code ignores this, and then
debugs why their log file is empty when the disk filled up three hours ago.

## Escape sequences that appear in format strings

| Sequence | Produces |
| --- | --- |
| \`\\n\` | newline |
| \`\\t\` | tab |
| \`\\\\\` | a single backslash |
| \`\\"\` | a double quote |
| \`\\0\` | the null byte (in a string, not usually in a format string) |
| \`%%\` | a percent sign |

Note carefully: the C **source** contains two characters, a backslash and an \`n\`. The **output** contains one character, a newline. Module 3.2 covers this in full.

## The rules, collected

1. Every specifier consumes exactly one argument, left to right.
2. The specifier must match the argument's type. \`-Wall\` checks this.
3. \`%s\` needs a \`char *\`, \`%c\` needs a \`char\`.
4. \`%zu\` for \`size_t\`.
5. Check the return value when the output matters.

\`\`\`c
/* Every one of these is a real bug. */
printf("%d\\n", 3.14);        /* float read as int, and one vararg missing */
printf("%d\\n", "hello");     /* pointer read as int, and one vararg missing */
printf("%s\\n", 42);          /* integer used as a pointer — reads arbitrary memory */
printf("%d %d\\n", 1);        /* missing argument — undefined behaviour */
printf("%d\\n");              /* missing argument — undefined behaviour */
\`\`\`

A missing or extra argument is not a compile error in general — it is **undefined
behaviour**, and the actual observed symptom might be a garbled line, a crash, or
nothing at all. With \`-Wall\`, GCC and Clang catch most of these at compile time.`),
        b.lead('Specifier cheat sheet for the types in this course'),
        b.table(
          'Type to specifier',
          ['C type', 'Correct specifier', 'Wrong one you might reach for'],
          [
            ['char', '%c', '%s (needs a pointer, not a character)'],
            ['short', '%hd (after promotion to int, %d also works)', '%hd is wrong for a promoted int in some cases'],
            ['int', '%d', '%f'],
            ['long', '%ld', '%d — reads 4 of the 8 bytes'],
            ['long long', '%lld', '%ld'],
            ['unsigned int', '%u', '%d is technically wrong though usually harmless'],
            ['size_t', '%zu', '%d'],
            ['float', 'promoted to double → %f', '%f is correct for float too, by promotion'],
            ['double', '%f / %e / %g', '%d'],
            ['char *', '%s', '%c'],
            ['void *', '%p', '%s — you must cast: (void *)p'],
          ]
        ),
        b.tip(
          'A table printer you will reuse',
          'The `%*d` trick plus `%-*s` gives you aligned output with no library. Keep this function; you will use it in every console project in this course.',
        ),
        b.code(
          `/* Left-align in a field, right-align a number in a field. */
#include <stdio.h>

void print_row(const char *label, long value, int label_width, int value_width)
{
    printf("%-*s | %*ld\\n", label_width, label, value_width, value);
}

int main(void)
{
    print_row("alpha",  10L, 12, 8);
    print_row("bravo", 2000L, 12, 8);
    print_row("delta",  999L, 12, 8);
    return 0;
}

/* Output:
   alpha        |       10
   bravo        |     2000
   delta        |      999 */
`,
          'aligned_output.c'
        ),
        b.warn(
          'printf is a variadic function, and that is the root of all of it',
          'A variadic function receives a variable number of arguments with no type information for the extras. The compiler can only check your format string against your arguments if you ask it to (-Wall). This is why printf format bugs are so common in every language, and why C has a whole family of them.',
        ),
      ],
      questions: [
        [
          'What does `%s` require as an argument?',
          [
            'A char',
            'A char * — a pointer to a null-terminated string',
            'Any numeric value, converted to text',
            'A char array, passed by value',
          ],
          1,
          '%s takes a pointer. An array decays to a pointer when passed, which is why `printf("%s", arr)` works, but a single char must use %c.',
        ],
        [
          'You want to print the result of `strlen(s)`. Which specifier?',
          [
            '%d',
            '%ld',
            '%zu',
            '%s',
          ],
          2,
          'strlen returns size_t, which is unsigned and possibly wider than int. %zu is the correct and portable specifier; %d reads the wrong width on many platforms and is formally wrong on all of them.',
        ],
        [
          'What is the default precision for %f?',
          [
            'Zero decimal places',
            'Two decimal places',
            'Six decimal places',
            'As many as the value needs',
          ],
          2,
          'Six. That is why printf("%f", 3.14) prints 3.140000, which surprises almost everyone once.',
        ],
        [
          'What does `printf("%.3s", "hello")` print?',
          [
            'hel',
            'hello',
            '3',
            'he',
          ],
          0,
          'For a string conversion, precision is the maximum number of characters printed, not a decimal count. This differs from the numeric conversions, which is the usual reason people are surprised by it.',
        ],
        [
          'Why is `printf("%d", 3.14);` undefined behaviour?',
          [
            'printf cannot print floating point numbers',
            'A double does not fit in the int-sized slot the format string describes, and one argument is left unconsumed',
            'It is only a warning, not an error',
            'You must cast it to int first',
          ],
          1,
          'The format string and the argument list must agree exactly. Passing a double where %d reads, and consuming one argument for a format with two specifiers, is undefined behaviour — with -Wall it is a compile error.',
        ],
      ],
    },
    {
      title: 'Escape sequences and how a character becomes a byte',
      summary: 'Escape sequences, the char type, ASCII, and why char is signed on most machines.',
      duration: 14,
      build: (b) => [
        b.md(`## Two characters in, one character out

When you write \`\\n\` in a C source file, the compiler does not see a newline. It sees **two characters**: a backslash and a letter \`n\`. That pair is an *escape sequence*, and it is replaced by a single character — the newline, whose numeric value is 10.

This distinction matters constantly when you are counting bytes, writing a protocol, or debugging a string that "looks right but has the wrong length".

## The escape sequences

| Sequence | Character | Numeric value (ASCII) |
| --- | --- | --- |
| \`\\n\` | newline | 10 |
| \`\\t\` | horizontal tab | 9 |
| \`\\r\` | carriage return | 13 |
| \`\\0\` | null byte | 0 |
| \`\\\\\` | backslash | 92 |
| \`\\'\` | single quote | 39 |
| \`\\"\` | double quote | 34 |
| \`\\a\` | alert (bell) | 7 |
| \`\\b\` | backspace | 8 |
| \`\\f\` | form feed | 12 |
| \`\\v\` | vertical tab | 11 |
| \`\\?\` | question mark | 63 |

Octal and hex escapes:

\`\`\`c
char newline  = '\\n';       /* the escape */
char newline2 = 10;          /* the same character, by value */
char backslash = '\\\\';      /* a single backslash character */
char nul       = '\\0';       /* the null byte */
char bell      = '\\a';       /* usually actually rings */
\`\`\`

## \`char\` is a byte, and it is *signed* on most machines

This is one of the most consequential facts in C and it is invisible unless you look for it.

The C standard says \`char\` has exactly **one byte** (whose size is \`CHAR_BIT\`, almost always 8) and the same range as either \`signed char\` or \`unsigned char\`. It does not say which. On x86, ARM, and almost every modern platform, plain \`char\` is **signed**.

So:

\`\`\`c
char c = 200;
printf("%d\\n", c);    /* -56 on a typical platform, not 200 */
\`\`\`

200 as a signed 8-bit value is \`200 - 256 = -56\`. The compiler does the conversion silently and correctly. This matters for:

- **Byte-level I/O.** If you read a file byte into a \`char\` and the byte has the high bit set, you get a negative number. Iterate with \`unsigned char\` if you are treating bytes as numbers.
- **\`isalpha\` and friends.** Passing a negative value other than \`EOF\` to \`<ctype.h>\` functions is undefined behaviour. Cast to \`unsigned char\` first: \`isalpha((unsigned char)c)\`.
- **Binary formats.** Structure data is full of bytes above 127. Using \`signed char\` for them is a bug waiting to happen.

\`\`\`c
unsigned char byte = 200;   /* fine: 0..255 */
signed char   sbyte = 200;  /* -56, by definition */

/* the correct way to test a byte */
if (isalpha((unsigned char)c)) { ... }
\`\`\`

## Character constants are ints, not chars

\`\`\`c
char c = 'A';        /* fine — 'A' is 65, which fits in char */
\`\`\`

But in C, a character constant has type **\`int\`**, not \`char\`. This is a historical artefact from when \`char\` was allowed to be wider than \`int\`. It is harmless in almost every case, and it is the reason you sometimes see \`int c\` used as a loop variable over characters.

## Multi-character constants exist and are a trap

\`\`\`c
int x = 'abcd';    /* legal! */
\`\`\`

The value is implementation-defined: the bytes are packed into an \`int\`. On a machine with 4-byte ints, \`'abcd'\` is typically \`0x61626364\`. Nobody has ever meant this. Do not do it.

## The null byte, and why it is not the same as zero

\`\\0\` is a character with value 0. It is not "the number zero" conceptually, though the representation is identical. Its job is to mark **the end of a string**. Module 8 covers strings properly; for now, the key idea is:

- \`"abc"\` is **four** characters: \`a\`, \`b\`, \`c\`, \`\\0\`.
- \`sizeof("abc")\` is **4**, not 3.
- \`strlen("abc")\` is **3**, because \`strlen\` counts up to but not including the null.

Getting this difference wrong is one of the most common C bugs there is.`),
        b.anim('memory', {
          title: 'What "abc" actually is in memory',
          badge: '4 bytes, not 3',
          base: 4198400,
          cell_bytes: 1,
          cells: [
            { bytes: ['97'], tone: 'char', note: "'a'" },
            { bytes: ['98'], tone: 'char', note: "'b'" },
            { bytes: ['99'], tone: 'char', note: "'c'" },
            { bytes: ['00'], tone: 'null', note: 'the terminator' },
          ],
          steps: [
            {
              caption:
                'This is the complete contents of the string literal "abc" in memory. Four bytes, one per character. The last one is 0x00.',
              vars: [{ name: 's', type: 'char*', value: '0x400100' }],
            },
            {
              caption:
                's holds the address of the first byte — 0x400100. It is a pointer, which is why `*s` gives you the byte 97 and `*(s+2)` gives you 99.',
              note: 'A string is a pointer plus a run of bytes ending in zero. The pointer and the bytes are separate things.',
              vars: [{ name: 's', type: 'char*', value: '0x400100', pointsTo: 0 }],
            },
            {
              caption:
                'strlen("abc") returns 3, not 4: it counts characters up to, but not including, the terminator.',
              note: 'sizeof("abc") is 4 — that is the whole array, terminator included. The two functions answer different questions and beginners must hold both.',
              vars: [
                { name: 's', type: 'char*', value: '0x400100', pointsTo: 0 },
                { name: 'len', type: 'size_t', value: '3', tone: 'int' },
                { name: 'size', type: 'size_t', value: '4', tone: 'warn' },
              ],
            },
            {
              caption:
                'Step past the terminator and you are reading memory that is none of your business. s[4] is one byte beyond the array.',
              note: 'C will not stop you. It will read whatever happens to be there, and a string function that kept going would wander until it found a zero byte by luck.',
              highlight: [4],
              vars: [{ name: 's[4]', type: 'char', value: '?', tone: 'bad' }],
            },
          ],
        }),
        b.tip(
          'How to count a string safely, in a program',
          'Use `strlen(s)` for the number of characters. Use `sizeof s` only when `s` is an actual array in the current scope, never when it is a pointer parameter. `sizeof` on a pointer parameter gives you 8 (or 4), which is the size of the pointer and has nothing to do with the string.',
        ),
        b.warn(
          'A string with no terminator is not a string',
          '`char buf[3] = "abc";` has no room for the terminator. In C this is legal, and the resulting buffer is not a valid string. printf("%s", buf) will read past the end of the array looking for a zero. This is a buffer overflow, and it is covered in Module 8.',
        ),
      ],
      questions: [
        [
          'What is the type of the character constant A in C?',
          [
            'char',
            'int',
            'unsigned int',
            'It depends on the platform',
          ],
          1,
          'Character constants have type int in C, a historical leftover. It is almost always harmless, and it is why int is occasionally used to hold a character.',
        ],
        [
          'On a typical x86 machine, what is the value of `char c = 200; printf("%d", c);`?',
          [
            '200',
            '56',
            '-56',
            'It is undefined behaviour',
          ],
          2,
          'Plain char is signed on almost all modern platforms, and 200 cannot be represented in a signed 8-bit value, so it converts to 200-256 = -56. This is defined, not undefined — but it surprises everyone once.',
        ],
        [
          'How many bytes does the string literal "abc" occupy in an array?',
          [
            '3',
            '4',
            '5',
            'It depends on the encoding',
          ],
          1,
          'Four: a, b, c, and the null terminator. sizeof("abc") is 4 while strlen("abc") is 3.',
        ],
        [
          'Why should you cast to unsigned char before calling isalpha?',
          [
            'Because isalpha only accepts unsigned char',
            'Because a negative char value other than EOF is undefined behaviour, and casting removes the possibility of a negative value',
            'Because isalpha needs an int',
            'It is not necessary',
          ],
          1,
          'Plain char is signed, so any byte >= 128 becomes a negative int. The ctype functions require the argument to be representable as unsigned char or equal to EOF.',
        ],
        [
          'What is `sizeof("abc")` and why does it differ from strlen?',
          [
            '3 — they are the same function',
            '4 — sizeof measures the whole array including the terminator, strlen counts characters before it',
            '4 — strlen includes the terminator',
            '0 — a string literal has no storage',
          ],
          1,
          'sizeof is a compile-time property of the array type; strlen is a runtime count of characters up to the first null. They answer different questions, which is why both exist.',
        ],
      ],
    },
    {
      title: 'scanf: reading input, and the newline trap',
      summary: 'How scanf matches input, why scanf("%s") is a buffer overflow waiting to happen, and what to use instead.',
      duration: 18,
      build: (b) => [
        b.md(`## The wrong first instinct

Every C tutorial starts with \`scanf\`, and almost every C beginner's first program is:

\`\`\`c
char name[20];
scanf("%s", name);
\`\`\`

This is a **buffer overflow**. If the user types \`Ada Lovelace\` — 12 characters, no whitespace — \`scanf\` writes 13 bytes into a 20-byte array, which happens to fit. If they type a 40-character name, \`scanf\` writes 41 bytes and overwrites whatever follows in memory. Nothing stops it. The program may crash, may corrupt other variables, or may appear to work for a long time before failing somewhere unrelated. This is exactly the class of bug that has produced decades of security vulnerabilities in C programs.

You need to know \`scanf\` properly. But the goal is to know when **not** to use it.

## How scanf matches

\`scanf\` reads characters from a stream and matches them against a format string. The critical rule:

> **For \`%s\`, \`%d\`, \`%f\`, and most conversions, \`scanf\` needs the ADDRESS of the variable, not the variable itself.**

\`\`\`c
int age;
char name[50];

scanf("%d", &age);    /* correct — &age is the address */
scanf("%d", age);     /* WRONG  — scanf tries to store into address (whatever age is) */
\`\`\`

\`%d\` tells \`scanf\` to write 4 bytes to the address you give it. If you pass the *value* of \`age\` instead, \`scanf\` will happily write to address 0, or address 20, or whatever happened to be there. This is the single most common \`scanf\` bug, and \`-Wall\` catches it because it knows the type of \`age\` and can see the missing \`&\`.

## The conversions you will use

| Conversion | Type it expects | Notes |
| --- | --- | --- |
| \`%d\` | \`int *\` | Signed decimal |
| \`%u\` | \`unsigned int *\` | |
| \`%ld\`, \`%lld\` | \`long *\`, \`long long *\` | |
| \`%f\`, \`%lf\` | \`float *\`, \`double *\` | **%lf, not %f, for double** |
| \`%c\` | \`char *\` | Reads exactly one character |
| \`%s\` | \`char *\` | Non-whitespace run. **No bounds check** |
| \`%[^\`\`\n\`\`\`]\` | \`char *\` | Reads until a delimiter — the safe alternative |
| \`%n\` | \`int *\` | Characters consumed so far. Rarely what you want |
| \`%*d\` | nothing | Suppress: read and discard |

### The \`%f\` / \`%lf\` asymmetry

In \`printf\`, both \`%f\` and \`%lf\` work for a \`double\`, because \`float\` arguments are promoted to \`double\` by the default argument promotions.

In \`scanf\`, there is no promotion, and the distinction is **real and required**:

\`\`\`c
float  f;  double d;

scanf("%f",  &f);    /* correct: float  */
scanf("%lf", &d);    /* correct: double */
scanf("%f",  &d);    /* WRONG: reads 4 bytes into an 8-byte object, garbage left in d */
\`\`\`

This asymmetry catches experienced C programmers out regularly. It is the direct consequence of \`scanf\` taking pointers.

## The newline trap

This one produces the most common "my program skips my input" bug in C.

\`\`\`c
int age;
char name[50];

printf("Age: ");
scanf("%d", &age);

printf("Name: ");
scanf("%s", name);      /* skips! */

printf("Age: %d, Name: %s\\n", age, name);
\`\`\`

The program prints \`Age: 20\`, the user types \`20\` and presses Enter, and the 0x0A newline is still sitting in the input buffer. The next \`scanf("%s", ...)\` looks at that buffer, skips leading whitespace — which includes the newline — and then blocks waiting for more input. The user has already typed a name, but the program is not asking yet. The name appears to be skipped.

The fixes:

\`\`\`c
/* consume the rest of the line before the next read */
while (getchar() != '\\n') { }
\`\`\`

or read a whole line with \`fgets\` and parse it yourself, which is the habit you should build.

## fgets: the correct way to read a line

\`\`\`c
char buffer[100];

printf("Name: ");
if (fgets(buffer, sizeof buffer, stdin) == NULL) {
    /* input failed or EOF */
    return 1;
}

/* fgets keeps the trailing newline — strip it if you do not want it */
buffer[strcspn(buffer, "\\n")] = '\\0';
\`\`\`

\`fgets\` is safe by construction:

- It takes a **size**, so it cannot write more than \`size - 1\` bytes plus a terminator.
- It returns \`NULL\` on end-of-file or error, so you can check.
- It reads a whole **line**, which means it does not leave a stray newline in the buffer.
- It **always** null-terminates, provided \`size\` is at least 2.

Write \`sizeof buffer\` rather than the number 100. If the array size changes, the code still compiles and is still correct. This is the idiom you should use forever.

## Robust input: a real pattern

Combining \`fgets\` with \`strtol\` gives you input that cannot overflow, reports errors, and handles trailing junk:

\`\`\`c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>
#include <limits.h>

/* Returns 0 on success, non-zero on failure. */
int read_long(const char *prompt, long *out)
{
    char buffer[64];
    char *end;
    long value;

    printf("%s", prompt);

    if (fgets(buffer, sizeof buffer, stdin) == NULL) {
        fprintf(stderr, "Error: no input.\\n");
        return 1;
    }

    errno = 0;
    value = strtol(buffer, &end, 10);

    if (end == buffer) {
        fprintf(stderr, "Error: not a number.\\n");
        return 1;
    }
    if (errno == ERANGE || value > LONG_MAX || value < LONG_MIN) {
        fprintf(stderr, "Error: out of range.\\n");
        return 1;
    }

    *out = value;
    return 0;
}
\`\`\`

Why this is better than \`scanf("%ld", &n)\`:

| Problem | \`scanf\` | \`fgets\` + \`strtol\` |
| --- | --- | --- |
| User types a 500-character number | overflows the buffer | safe, and \`strtol\` reports ERANGE |
| User types "abc" | \`scanf\` returns 0 and leaves \`n\` unchanged | you get a clear error message |
| User types "12abc" | \`scanf\` reads 12, leaves "abc" in the buffer | \`end\` points at "abc" and you can reject it |
| No trailing newline in the buffer | always a problem | not a problem |
| Value out of range for the type | silent wraparound or UB | \`errno\` is set |

**Always check the return value of \`scanf\`.** It returns the number of items successfully assigned, or \`EOF\` on failure:

\`\`\`c
if (scanf("%d %d", &a, &b) != 2) {
    fprintf(stderr, "Expected two integers.\\n");
    return 1;
}
\`\`\`

Skipping this check is how programs end up dividing by an uninitialised value and then "working by coincidence" for a while.`),
        b.anim('trace', {
          title: 'The newline trap, executed',
          badge: 'step through',
          code: `int age;
char name[50];

printf("Age: ");
scanf("%d", &age);

printf("Name: ");
scanf("%s", name);

printf("%d %s\\n", age, name);`,
          steps: [
            {
              line: 1,
              caption: 'Two variables are declared. Neither is initialised, so both hold indeterminate bytes.',
              vars: [
                { name: 'age', value: 'indeterminate', tone: 'pad' },
                { name: 'name', value: 'indeterminate', tone: 'pad' },
              ],
            },
            {
              line: 4,
              caption: 'The program prints the prompt. The user types 20 and presses Enter.',
              output: 'Age: 20',
              vars: [{ name: 'stdin buffer', value: '"20\\n"', tone: 'int' }],
            },
            {
              line: 5,
              caption: 'scanf("%d", &age) matches the characters 2 and 0, stores 20 into age, and stops at the newline.',
              note: 'The newline is NOT consumed. It stays in the buffer, because %d stopped as soon as it had a complete number.',
              vars: [
                { name: 'age', value: '20', tone: 'int' },
                { name: 'stdin buffer', value: '"\\n"', tone: 'warn' },
              ],
            },
            {
              line: 8,
              caption: 'The program prints the second prompt. The user types Riya and presses Enter.',
              output: 'Name: Riya',
              vars: [
                { name: 'age', value: '20', tone: 'int' },
                { name: 'stdin buffer', value: '"\\nRiya\\n"', tone: 'warn' },
              ],
            },
            {
              line: 9,
              caption: 'scanf("%s", name) begins. %s skips leading whitespace — and the pending newline is whitespace. So it skips past it, then blocks.',
              note: 'This is the trap: the program is not reading the name the user just typed. It skipped the newline, landed on "Riya", and is waiting for the user to press Enter again. The user already did, so the keystroke went into the next read.',
              vars: [
                { name: 'age', value: '20', tone: 'int' },
                { name: 'name', value: '"" (empty so far)', tone: 'bad' },
                { name: 'stdin buffer', value: '"\\nRiya\\n"', tone: 'warn' },
              ],
            },
            {
              line: 9,
              caption: 'The user, confused, presses Enter again. Now the buffer is "\\nRiya\\n\\n" and %s finally matches "Riya".',
              output: '20 Riya',
              note: 'Fix it by draining the line before the next read, or better, by never using scanf for text at all — use fgets.',
              vars: [
                { name: 'age', value: '20', tone: 'int' },
                { name: 'name', value: '"Riya"', tone: 'ok' },
                { name: 'stdin buffer', value: '"\\n"', tone: 'int' },
              ],
            },
          ],
        }),
        b.tip(
          'If you must use scanf for a string, use a width',
          '`scanf("%49s", name)` into `char name[50]` reads at most 49 characters and leaves room for the terminator. It is still not a great idea — it truncates silently, and it cannot read a name containing a space — but it is not a buffer overflow. `scanf("%49[^\n]", name)` is better: it reads up to a newline, so it can contain spaces.',
        ),
        b.warn(
          'scanf("%f", &double_var) reads 4 bytes into an 8-byte object',
          'This is the single most common scanf bug among people who know C. In printf, %f and %lf are the same thing because float is promoted to double. In scanf there is no promotion: %f means float* (4 bytes) and %lf means double* (8 bytes). Getting it wrong reads half the value and leaves the other half as whatever was in memory.',
        ),
      ],
      questions: [
        [
          'Why must you write `&age` in `scanf("%d", &age)`?',
          [
            'Because scanf requires a reference type',
            'Because scanf writes to the given address, and &age is age’s address',
            'Because %d only works with pointers to pointers',
            'Because of the newline',
          ],
          1,
          'scanf takes a pointer so it can write into the caller’s variable. Passing the value instead makes scanf treat that value as an address and write to arbitrary memory.',
        ],
        [
          'In `scanf`, what is the difference between %f and %lf?',
          [
            'None, they are identical',
            '%f reads a float, %lf reads a double — and the distinction is real in scanf',
            '%f reads a double, %lf reads a float',
            '%lf only works in printf',
          ],
          1,
          'In printf both are float-compatible due to default argument promotion. In scanf the pointer is passed unchanged, so the widths differ and using the wrong one reads the wrong number of bytes.',
        ],
        [
          'What is the default value of a local int that was never initialised?',
          [
            '0',
            '-1',
            'Whatever was already in that stack memory — undefined to read',
            'A compile error',
          ],
          2,
            'C does not initialise local scalars. The value is indeterminate and reading it is undefined behaviour. The compiler may assume it never happens and optimise accordingly.',
        ],
        [
          'What does scanf return, and what should you check?',
          [
            'The value that was read',
            'The number of items successfully assigned, or EOF on failure — check it equals the number of conversions',
            'The number of characters consumed',
            'Nothing; it returns void',
          ],
          1,
          'If you ask for two %d and the user types "12", scanf returns 1 and the second variable is untouched. Checking the return value is the only way to know.',
        ],
        [
          'Why is `scanf("%s", buf)` a buffer overflow risk?',
          [
            'Because %s does not work on arrays',
            'Because %s reads an unbounded run of non-whitespace characters and writes it plus a terminator, with no knowledge of the buffer size',
            'Because %s stops at spaces',
            'Because %s requires a width',
          ],
          1,
          '%s has no length limit by design. `scanf("%49s", buf)` is the minimum fix; `fgets` is the right answer.',
        ],
      ],
    },
  ]
);
