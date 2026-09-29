// Module 8 — Arrays and strings.
// The contiguous block, its decay rules, 2D arrays, and the C string: an array
// of char with a terminator. Both are really the same idea, which is the point.

import { mod } from '../blocks';

export const M8 = mod(
  'crs-c-programming',
  'c-m8',
  8,
  'Module 8 — Arrays and strings',
  'Contiguous storage, array decay, multi-dimensional arrays, and the C string convention.',
  [
    {
      title: 'Arrays: a block of memory with a name',
      summary: 'Declaration, indexing, why C has no bounds checking, and the one thing that surprises everyone.',
      duration: 15,
      build: (b) => [
        b.md(`## Declaring an array

\`\`\`c
int numbers[5];                 /* 5 ints, uninitialised */
int values[5] = {10, 20, 30, 40, 50};
int partial[5] = {1, 2};         /* -> {1, 2, 0, 0, 0} */
char name[6] = "Hello";          /* -> 5 chars + a terminator */
\`\`\`

Elements are numbered from 0. An array of 5 has valid indices \`0\` through \`4\`. \`numbers[5]\` is one past the end, and using it is undefined behaviour.

## The layout in memory

An array's elements sit next to each other, in order, with no gaps. That contiguity is the whole point: the CPU can compute any address with one multiply and one add.

\`\`\`c
int values[4] = {10, 20, 30, 40};
\`\`\`

| Index | Value | Address |
| --- | --- | --- |
| 0 | 10 | base + 0 |
| 1 | 20 | base + 4 |
| 2 | 30 | base + 8 |
| 3 | 40 | base + 12 |

On a system where \`int\` is 4 bytes. \`sizeof values\` is 16, and the address of \`values[i]\` is \`&values[0] + i\`. This is why arrays are cache-friendly and why the stride is always the element size.

## C does not check your index

This is the single most important thing to internalise.

\`\`\`c
int values[5] = {1, 2, 3, 4, 5};
printf("%d\\n", values[10]);   /* compiles cleanly. Reads whatever is there. */
\`\`\`

No warning, no error, no exception. \`values[10]\` computes \`base + 40\`, which is 30 bytes past the end of a 20-byte array. If that address is mapped memory, you get garbage. If it is not, the process dies with a segmentation fault. If the array is a local, you have probably just corrupted your own stack frame — the return address, a saved pointer, another local.

The reason is design. Bounds checking in C would cost performance and would not actually help much, because the language cannot know the length of an array passed to a function (see the decay rules below). C made a deliberate trade: the programmer is responsible.

Practical consequences:

- **Initialise your arrays.** \`int values[5];\` holds indeterminate bytes. Not zeros — indeterminate. Reading them is undefined behaviour, and with optimisations on, the compiler may delete the read entirely.
- **Zero-initialise by default.** \`int values[5] = {0};\` or \`= {}\` (C23). This is the single safest habit in C.
- **Use \`-Wall\` and ASan.** \`gcc -fsanitize=address\` catches out-of-bounds at the point it happens, with a stack trace.
- **Prefer \`static\` for large constant tables.**

## sizeof gives you the whole array, in one place

\`\`\`c
int values[5];
printf("%zu\\n", sizeof values);        /* 20 — the whole array */
printf("%zu\\n", sizeof values / sizeof values[0]);   /* 5 — the element count */
\`\`\`

The second line is the standard idiom for "how many elements are in this array", and it works because \`sizeof values\` is the total bytes and \`sizeof values[0]\` is the size of one element. The division is integer arithmetic and it is exact.

Note the fragility: this only works where \`values\` is a genuine array, in a scope where its size is known. As soon as it is passed to a function it becomes a pointer and \`sizeof\` gives you 8.

## Initialising only part of an array

\`\`\`c
int zeroes[100] = {0};        /* all 100 elements become 0 */
int sparse[5] = {[2] = 7, [4] = 9};   /* {0, 0, 7, 0, 9} (C99 designated initialisers) */
\`\`\`

Designated initialisers let you skip the tedious middle. They also work on structs, which is why they are the idiomatic way to set a few fields of a configuration.

## Arrays cannot be assigned

\`\`\`c
int a[3] = {1, 2, 3};
int b[3] = {4, 5, 6};

a = b;          /* ERROR: invalid operands to binary = */
\`\`\`

An array is not an assignable value. You cannot copy one array into another with \`=\`. The two workarounds:

\`\`\`c
/* 1. copy element by element */
for (int i = 0; i < 3; i++) a[i] = b[i];

/* 2. use memcpy, which is faster and clearer for bulk copies */
#include <string.h>
memcpy(a, b, sizeof a);
\`\`\`

The reason is that \`a\` in almost every context is not really an array — see below. Arrays are not first-class values in C; they are a syntax for a pointer plus a size that the compiler uses at the declaration.

## The array/pointer decay rules

This is the concept that unlocks Module 9, so it is worth getting exactly right.

**Rule 1: in most expressions, an array converts to a pointer to its first element.**

\`\`\`c
int values[5] = {1, 2, 3, 4, 5};
int *p = values;      /* fine: p points at values[0] */
printf("%d\\n", *values);   /* 1 — values[0], same as *(values + 0) */
\`\`\`

The conversion happens silently. The array name in an expression is evaluated as \`&values[0]\`. This is why \`values\` and \`&values[0]\` are interchangeable nearly everywhere.

**Rule 2: the exceptions.** The conversion does not happen in:

1. \`sizeof values\` — the array, not a pointer, so you get the total size.
2. \`&values\` — gives you a pointer to the *whole array*, of type \`int (*)[5]\`.
3. A string literal initialising a \`char\` array — \`char s[] = "hi"\` is allowed.
4. The operand of the \`&\` address-of operator, for the same reason as (1).

Everything else — passing to a function, assigning, comparing — sees a pointer.

**Rule 3: a pointer and an array are different types, despite behaving alike.**

\`\`\`c
int values[5];
int *p = values;         /* OK: array decays to int* */
/* int *q = p;  -- fine, that is a normal pointer copy */
sizeof values            /* 20 */
sizeof p                 /* 8 */
\`\`\`

The array type \`int[5]\` carries a size. \`int *\` does not. That is the only real difference, and it is the reason array parameters need a separate length argument.

## The one-past-the-end pointer

\`\`\`c
int values[5] = {1, 2, 3, 4, 5};
int *end = values + 5;    /* legal to FORM */
printf("%d\\n", *end);    /* undefined behaviour to DEREFERENCE */
\`\`\`

Forming a pointer one past the last element is perfectly legal and widely used — half of all pointer arithmetic in real code is \`p + 1\` until \`p == end\`. Dereferencing it is not.

This is a natural consequence of the flat address space: \`values + 5\` is the address right after the array, and there is no runtime check saying that is "outside". The rule exists so that loop comparisons and \`end()\` iterators in C++ are well-defined.

## Common array mistakes

| Mistake | What happens | Correct |
| --- | --- | --- |
| \`int a[5];\` then read \`a[i]\` | Indeterminate garbage, or UB | \`int a[5] = {0};\` |
| \`for (i = 0; i <= 5; i++)\` on a 5-element array | Off-by-one on the last iteration | \`i < 5\` |
| \`a = b\` | Compile error | \`memcpy(a, b, sizeof a)\` |
| \`int a[n];\` then \`sizeof a\` expecting \`n\` | Gives the pointer size if \`a\` was passed to a function | Pass the length |
| Comparing two array names | Compares addresses, never contents | \`memcmp\`, or loop |
| \`int a[5][10];\` indexed \`a[i][j]\` | Correct — row major | — |
| \`int a[3] = {1,2,3,4};\` | Compile error, too many initialisers | — |

## Passing arrays to functions

Because of decay, the function receives a pointer:

\`\`\`c
void print_all(const int *values, size_t count)
{
    for (size_t i = 0; i < count; i++) {
        printf("%d ", values[i]);
    }
    putchar('\\n');
}

int main(void)
{
    int data[5] = {1, 2, 3, 4, 5};
    print_all(data, 5);          /* length must be passed explicitly */
    return 0;
}
\`\`\`

Two conventions worth adopting:

1. **Write the parameter as \`const int values[]\`** (or \`const int *values\`). It reads as "an array", which is what the caller thinks it is passing, and the \`const\` documents that you will not modify it.
2. **Always pass the count, as \`size_t\`.** \`int\` counts can go negative; \`size_t\` is unsigned and is the type \`sizeof\` returns, so no cast is needed at the call site.`),
        b.anim('memory', {
          title: 'Five ints in memory',
          badge: 'contiguous',
          base: 4198656,
          cell_bytes: 4,
          cells: [
            { label: 'values[0]', bytes: ['0A', '00', '00', '00'], tone: 'int', note: '10' },
            { label: 'values[1]', bytes: ['14', '00', '00', '00'], tone: 'int', note: '20' },
            { label: 'values[2]', bytes: ['1E', '00', '00', '00'], tone: 'int', note: '30' },
            { label: 'values[3]', bytes: ['28', '00', '00', '00'], tone: 'int', note: '40' },
            { label: 'values[4]', bytes: ['32', '00', '00', '00'], tone: 'int', note: '50' },
          ],
          steps: [
            {
              caption: 'int values[5] = {10, 20, 30, 40, 50}; — five ints, declared and initialised.',
              note: 'Because the initialiser has exactly five elements, every element is set. Leave one out and the rest become zero.',
              vars: [{ name: 'values', type: 'int[5]', value: '0x400100', pointsTo: 0 }],
            },
            {
              caption: 'Each cell is one int, four bytes. On a little-endian machine 10 is stored 0A 00 00 00.',
              note: 'The least significant byte is at the lowest address. This is why the bytes of an int are not in the order you read the digits in, and why casting an int* to char* and printing the bytes surprises people.',
              highlight: [0],
              vars: [{ name: 'values', type: 'int[5]', value: '0x400100', pointsTo: 0 }],
            },
            {
              caption: 'Indexing is arithmetic. values[3] is computed as base + 3*4 = base + 12.',
              note: 'The compiler turns values[i] into *(base + i). This is why indexing an array is exactly as fast as dereferencing a pointer — they are the same operation.',
              highlight: [3],
              vars: [{ name: 'values', type: 'int[5]', value: '0x400100', pointsTo: 3 }],
            },
            {
              caption: 'values[5] computes base + 20, which is one past the end of the block.',
              note: 'The pointer values + 5 is legal to form and compare. Dereferencing it is undefined behaviour. The C standard promises that one-past-the-end is a valid pointer, not a valid element.',
              highlight: [4],
              vars: [{ name: 'end', type: 'int*', value: '0x400114' }],
            },
            {
              caption: 'And there is nothing to stop you reading values[99]. No bounds check is generated.',
              note: 'This is the deliberate trade in C: no per-access cost, and the programmer owns the invariant. Tools exist to help — compile with -fsanitize=address and the read is caught at the moment it happens.',
              highlight: [4],
              vars: [{ name: 'values', type: 'int[5]', value: '0x400100', pointsTo: 4 }],
            },
          ],
        }),
        b.code(
          `#include <stdio.h>
#include <stddef.h>

/* sizeof on the array gives the whole thing, not one element. */
static void report_size(void)
{
    int values[5] = {10, 20, 30, 40, 50};

    printf("sizeof values            = %zu bytes\\n", sizeof values);
    printf("sizeof values[0]         = %zu bytes\\n", sizeof values[0]);
    printf("element count            = %zu\\n", sizeof values / sizeof values[0]);

    /* The decay, made visible. */
    int *p = values;
    printf("sizeof p                 = %zu bytes\\n", sizeof p);
    printf("&values[0] == p          = %d\\n", &values[0] == p);
    printf("*values == values[0]     = %d\\n", *values == values[0]);
}

int main(void)
{
    report_size();

    /* Designated initialisers: set element 2 and 4, leave the rest at 0. */
    int sparse[5] = {[2] = 7, [4] = 9};
    for (size_t i = 0; i < sizeof sparse / sizeof sparse[0]; i++) {
        printf("sparse[%zu] = %d\\n", i, sparse[i]);
    }

    /* Arrays are not assignable, so copying needs a loop or memcpy. */
    int a[3] = {1, 2, 3};
    int b[3] = {4, 5, 6};
    for (size_t i = 0; i < sizeof a / sizeof a[0]; i++) {
        a[i] = b[i];
    }
    printf("a = {%d, %d, %d}\\n", a[0], a[1], a[2]);

    /* Pointer difference counts elements, and one-past-the-end is legal to form. */
    int data[6] = {1, 2, 3, 4, 5, 6};
    int *first = data;
    int *end   = data + 6;          /* formable, never dereference */
    printf("end - first = %td elements\\n", end - first);

    /* Walk with a pointer, exactly as indexing would. */
    for (int *cur = first; cur != end; cur++) {
        printf("%d ", *cur);
    }
    putchar('\\n');

    return 0;
}
`,
          'arrays_basics.c'
        ),
        b.warn(
          'An uninitialised local array holds indeterminate bytes',
          'int values[5]; allocates 20 bytes and does not clear them. They contain whatever was on the stack, which is leftover data from previous calls. Reading that is undefined behaviour, and at -O2 the compiler is entitled to assume it does not happen, so it may optimise your check away. Write int values[5] = {0}; — it costs one memset and removes a whole class of bug.',
        ),
        b.tip(
          'Use -Wall and sanitizers while you learn',
          'gcc -Wall -Wextra -fsanitize=address,undefined -g program.c. AddressSanitizer catches out-of-bounds reads and writes, use-after-free, and double-free at the moment they occur, and prints a stack trace. UndefinedBehaviorSanitizer catches signed overflow, misaligned access, and invalid shifts. They cost runtime, not correctness, and they are the closest thing C has to a borrow checker.',
        ),
      ],
      questions: [
        [
          'In C, what does `int values[5];` guarantee about the contents?',
          [
            'They are all zero',
            'They are set to the maximum negative value',
            'Nothing — the elements hold indeterminate values',
            'They are set to 1',
          ],
          2,
          'Local automatic arrays are uninitialised. Only statics and globals get zero-initialisation. Reading indeterminate values is undefined behaviour.',
        ],
        [
          'Why is `int a[3]; a = a;` a compile error?',
          [
            'Because arrays cannot be assigned — the name decays to a pointer, and a pointer is not assignable from a whole array',
            'Because a is const',
            'Because the array is too small',
            'It is legal, and copies element by element',
          ],
          0,
          'In an expression, a becomes int*, so a = a assigns a pointer to itself. Copying array contents requires a loop or memcpy.',
        ],
        [
          'What is sizeof p, where `int a[100]; int *p = a;`?',
          [
            '400',
            '100',
            '8 on a 64-bit machine (the size of a pointer)',
            'It is undefined',
          ],
          2,
          'p is a pointer, so sizeof gives the pointer size. sizeof a gives 400. The difference between the two is exactly the size information that arrays carry and pointers do not.',
        ],
        [
          'Which of these is legal?',
          [
            'Dereferencing a pointer to one past the last element',
            'Forming a pointer to one past the last element and comparing it to another pointer in the same array',
            'Reading values[5] on an int values[5]',
            'Assigning one array to another with =',
          ],
          1,
          'The standard guarantees one-past-the-end is a valid pointer, so it can be formed, compared and used as an end iterator. Dereferencing it, and indexing the array with the same index, are undefined behaviour.',
        ],
        [
          'What is the standard way to get the element count of `int values[7]` inside the same scope?',
          [
            'values.length',
            'sizeof values',
            'sizeof values / sizeof values[0]',
            'It cannot be determined',
          ],
          2,
          'The total byte size divided by the size of one element. It works only where the array is a real array — once it decays to a pointer inside a function, it gives 8 / 4 = 2, which is wrong.',
        ],
      ],
    },
    {
      title: 'Multi-dimensional arrays',
      summary: 'Arrays of arrays, row-major layout, passing them to functions, and the pointer-to-pointer trap.',
      duration: 14,
      build: (b) => [
        b.md(`## Two dimensions is one dimension plus arithmetic

\`\`\`c
int grid[3][4];        /* 3 rows of 4 ints = 12 ints total */
\`\`\`

There is no separate "2D array" type in C. \`int grid[3][4]\` is an array of 3 elements, each of which is an array of 4 \`int\`.

\`\`\`c
int grid[2][3] = { {1, 2, 3},
                   {4, 5, 6} };
\`\`\`

## Row-major layout

C stores the rows end to end, contiguously:

\`\`\`
grid[0][0]  grid[0][1]  grid[0][2]   grid[1][0]  grid[1][1]  grid[1][2]
    1            2            3            4            5            6
\`\`\`

So \`grid[1][0]\` sits immediately after \`grid[0][2]\` in memory. The address is:

\`\`\`c
&grid[i][j]  ==  base + (i * 4 + j) * sizeof(int)
\`\`\`

The compiler turns \`grid[i][j]\` into \`*(*(grid + i) + j)\`, then simplifies that to \`*(base + i*4 + j)\` because the second dimension is a compile-time constant. This is why **only the first dimension may be a variable** in a function parameter.

## Initialisation

\`\`\`c
/* Full, explicit */
int a[2][3] = { {1, 2, 3}, {4, 5, 6} };

/* Braces optional on the inner level */
int b[2][3] = { 1, 2, 3, 4, 5, 6 };

/* Rest zero-filled */
int c[2][3] = { {1} };              /* -> {{1,0,0},{0,0,0}} */

/* Designated */
int d[2][3] = { [0][1] = 5, [1][2] = 9 };
\`\`\`

The second form is legal but only because the elements are filled in order. It becomes ambiguous and wrong the moment you want to skip one.

## Passing to a function: the trap

\`\`\`c
void print_grid(int grid[][4], int rows)   /* 4 must be a literal or constant */
{
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < 4; c++) {
            printf("%4d", grid[r][c]);
        }
        putchar('\\n');
    }
}
\`\`\`

The second dimension **must be present** in the parameter. This is not a style preference — it is a requirement of the language.

\`\`\`c
int grid[3][4];
void f(int g[][4]);       /* OK   — equivalent to int (*g)[4] */
void g(int g[]);          /* ERROR — becomes int *, loses the row width */
void h(int g[3][4]);      /* OK, but the 3 is ignored; treat it as a hint */
void k(int *g[4]);        /* compiles, but means array OF pointers — almost never what you meant */
\`\`\`

The reason: the function receives a pointer to a row. It needs the row width to compute the address of the next row, and that number must be available at compile time.

**Practical convention:** when you will be passing a 2D array around, put the dimensions in \`#define\` or \`enum\` constants at the top of the file, and use them in both the declaration and every parameter. This is the standard C answer to a language that has no way to express "array of N rows of M columns".

\`\`\`c
#include <stddef.h>

#define ROWS 8
#define COLS 8

static void board_clear(char board[ROWS][COLS]);
static int  board_count(const char board[ROWS][COLS]);

static void board_clear(char board[ROWS][COLS])
{
    for (size_t r = 0; r < ROWS; r++) {
        for (size_t c = 0; c < COLS; c++) {
            board[r][c] = '.';
        }
    }
}
\`\`\`

## VLA: variable length arrays

C99 added arrays whose size is a runtime value. The size must be a value known at the point of declaration, and in practice it must be small, because such an array lives on the stack.

\`\`\`c
void process(int n)
{
    int data[n];           /* VLA: n elements, allocated on the stack */
    for (int i = 0; i < n; i++) data[i] = i;
    /* ... */
}
\`\`\`

VLAs are genuinely useful for exactly-sized buffers, and \`char buf[n + 1]\` is the safe alternative to \`char buf[BUFSIZE]\` when the size depends on input. But they carry real costs:

- **Stack allocation.** A VLA of 100000 elements overflows the stack. A \`malloc\` would not.
- **Optional.** C11 made VLAs optional, and several production compilers disable them. \`-Wvla\` warns.
- **Cannot be \`static\` at file scope,** and cannot be a member of a struct.
- **sizeof works at runtime,** which is a minor optimisation barrier.

The modern C guidance is: use a VLA for small, bounded, function-local scratch space, and use \`malloc\` (Module 10) for anything whose size is not tightly bounded.

## The pointer-to-pointer trap

A very common bug: allocating a 2D array and filling it row by row.

\`\`\`c
int **grid = malloc(3 * sizeof *grid);   /* array of 3 pointers */
for (int i = 0; i < 3; i++) {
    grid[i] = malloc(4 * sizeof **grid); /* each row is separate */
}
\`\`\`

This works, but each row is a separate heap allocation, so the rows are not contiguous. It is more code, more allocation failures to handle, and much worse for cache behaviour. It also doubles the pointer-chasing per access.

The flat allocation is better:

\`\`\`c
int *grid = malloc(3 * 4 * sizeof *grid);
grid[r * 4 + c] = value;                 /* manual index arithmetic */
\`\`\`

Or, if you have C99 VLAs and a fixed second dimension, keep the 2D syntax:

\`\`\`c
int (*grid)[4] = malloc(3 * sizeof *grid);   /* note the parentheses */
grid[r][c] = value;                          /* still reads as 2D */
\`\`\`

That line is one of the harder declarations in C: \`int (*grid)[4]\` is a pointer to an array of 4 ints, and the parentheses are what make it that instead of an array of pointers. This is the natural consequence of the right-to-left reading rule from Module 7.

## Iterating a 2D array

\`\`\`c
for (size_t r = 0; r < ROWS; r++) {
    for (size_t c = 0; c < COLS; c++) {
        total += board[r][c];
    }
}

/* Or, treating it as flat, which is clearer for pure sums: */
int *flat = &board[0][0];
for (size_t i = 0; i < ROWS * COLS; i++) total += flat[i];
\`\`\`

The second form is worth knowing because it is the fastest and it makes the contiguity obvious. The first is worth knowing because it is how humans read matrices.`),
        b.anim('memory', {
          title: 'Where a 2D array actually lives',
          badge: 'row-major',
          base: 4198656,
          cell_bytes: 4,
          cells: [
            { label: 'g[0][0]', bytes: ['0', '0', '0', '0'], tone: 'int' },
            { label: 'g[0][1]', bytes: ['0', '0', '0', '0'], tone: 'int' },
            { label: 'g[0][2]', bytes: ['0', '0', '0', '0'], tone: 'int' },
            { label: 'g[1][0]', bytes: ['0', '0', '0', '0'], tone: 'int' },
            { label: 'g[1][1]', bytes: ['0', '0', '0', '0'], tone: 'int' },
            { label: 'g[1][2]', bytes: ['0', '0', '0', '0'], tone: 'int' },
          ],
          steps: [
            {
              caption:
                'int grid[2][3]; reserves 24 bytes contiguously. There is no runtime object for a 2D array — one flat block that we choose to read in rows.',
              note: 'Six cells of 4 bytes each. Every address is on the same ruler: there is no second row of memory below, and no gap between the rows.',
              vars: [{ name: 'grid', type: 'int (*)[3]', value: '0x400100', pointsTo: 0 }],
            },
            {
              caption:
                'grid[0][1] = 2. The compiler computes base + (0*3 + 1)*4 = base + 4.',
              note: 'Because the row width 3 is a compile-time constant, this collapses to a single add. That constant is exactly why the second dimension cannot be a function parameter.',
              highlight: [1],
              vars: [{ name: 'grid', type: 'int (*)[3]', value: '0x400100', pointsTo: 0 }],
            },
            {
              caption:
                'grid[1][0] = 4 lands at base + (1*3 + 0)*4 = base + 12 — immediately after grid[0][2].',
              note: '"Row 1" is a way of indexing the block, not a separate object with its own storage. This adjacency is why a flat malloc plus grid[r*cols + c] behaves identically to the 2D syntax.',
              highlight: [3],
              vars: [{ name: 'grid', type: 'int (*)[3]', value: '0x400100', pointsTo: 3 }],
            },
            {
              caption:
                'Because the whole thing is 24 bytes, grid[2][0] is one past the end — formable, not dereferenceable.',
              note: 'The flat block gives no second chance. Out-of-range indices land in whatever the next allocation happens to be, which is why -fsanitize=address is worth compiling with while you learn.',
              highlight: [5],
              vars: [{ name: 'grid', type: 'int (*)[3]', value: '0x400100', pointsTo: 0 }],
            },
          ],
        }),
        b.code(
          `#include <stdio.h>
#include <stdlib.h>
#include <stddef.h>

/* Dimensions as constants at the top: one edit changes the whole program. */
#define ROWS 3
#define COLS 3

/* The second dimension must be visible so the compiler can stride rows. */
static void print_grid(const int grid[][COLS], size_t rows)
{
    for (size_t r = 0; r < rows; r++) {
        for (size_t c = 0; c < COLS; c++) {
            printf("%5d", grid[r][c]);
        }
        putchar('\\n');
    }
}

static int sum_grid(const int grid[][COLS], size_t rows)
{
    int total = 0;
    for (size_t r = 0; r < rows; r++) {
        for (size_t c = 0; c < COLS; c++) {
            total += grid[r][c];
        }
    }
    return total;
}

int main(void)
{
    int grid[ROWS][COLS] = {
        { 1,  2,  3},
        { 4,  5,  6},
        { 8,  9, 10},
    };

    print_grid(grid, ROWS);
    printf("sum = %d\\n", sum_grid(grid, ROWS));

    /* The same block seen flat. grid[r][c] is literally *(base + r*COLS + c). */
    const int *flat = &grid[0][0];
    printf("flat[4] = %d   grid[1][1] = %d\\n", flat[4], grid[1][1]);

    /* One allocation instead of ROWS separate ones. */
    int *heap_grid = malloc(ROWS * COLS * sizeof *heap_grid);
    if (heap_grid == NULL) {
        perror("malloc");
        return 1;
    }
    for (size_t i = 0; i < ROWS * COLS; i++) {
        heap_grid[i] = (int)(i * i);
    }
    printf("heap_grid[2*COLS+1] = %d\\n", heap_grid[2 * COLS + 1]);
    free(heap_grid);

    return 0;
}
`,
          'two_dimensional.c'
        ),
        b.warn(
          'void f(int grid[]) loses the row width',
          'The parameter decays all the way to int *, and the function no longer knows how wide a row is, so it cannot compute the address of grid[1][0]. It is a compile error when you use the two subscripts. Write void f(int grid[][COLS]) — the const version, void f(const int grid[][COLS]), is better still, because it documents that the function does not modify the data.',
        ),
        b.tip(
          'Put array dimensions in constants, not literals',
          'enum { ROWS = 8, COLS = 8 }; at the top of the file, then use ROWS and COLS in every declaration, every loop bound, and every function parameter. When a dimension changes, one edit fixes the entire program instead of a hunt through the file for a stray 8.',
        ),
      ],
      questions: [
        [
          'Why must the second dimension appear in a 2D array parameter?',
          [
            'To allow the compiler to check indices',
            'Because the row width is needed at compile time to compute the address of each row',
            'It is optional, purely for documentation',
            'Because C stores 2D arrays column-major',
          ],
          1,
          'The parameter decays to a pointer to a row. The compiler generates *(base + r*width + c), so the width must be a compile-time constant. Omit it and you have a plain int*, which cannot support two subscripts.',
        ],
        [
          'How is grid[1][2] of an `int grid[3][4]` computed?',
          [
            'base + (1*2 + 4)*sizeof(int)',
            'base + (1*4 + 2)*sizeof(int)',
            'base + (1 + 2)*sizeof(int)',
            'It requires two pointer dereferences at runtime',
          ],
          1,
          'Row major: the row index is multiplied by the full row width, then the column index is added. The compiler flattens the two subscripts into this single expression, so there is one multiply and one add.',
        ],
        [
          'What is `int (*grid)[4];`?',
          [
            'An array of 4 pointers to int',
            'A pointer to an array of 4 ints',
            'An array of 4 arrays of int',
            'A 2D array of 4 by 4',
          ],
          1,
          'Read right to left from the name: grid is a pointer, to an array, of 4 ints. This is the correct type for a dynamically allocated 2D array with a known column count.',
        ],
        [
          'A VLA is declared as `int data[n];` where n is a runtime value. What is the main practical concern?',
          [
            'It does not compile in C89',
            'It is allocated on the stack, so a large n overflows it',
            'It cannot be initialised',
            'It is always slower than malloc',
          ],
          1,
          'VLAs are automatic storage duration, so they consume stack. They are ideal for small bounded scratch space and wrong for anything driven by large or untrusted input — use malloc for that.',
        ],
        [
          'Why is `int **grid` with one malloc per row usually worse than one flat malloc?',
          [
            'It does not compile in strict C',
            'Rows are separate allocations, so every access is a double dereference, the cache cannot stream across rows, and there are N allocations to free',
            'int ** cannot represent a row',
            'It uses less memory',
          ],
          1,
          'A single flat block keeps the rows contiguous, so it is faster and needs one free. The cost is manual index arithmetic, grid[r * cols + c], which the compiler generates anyway for a real 2D array.',
        ],
      ],
    },
    {
      title: 'C strings: an array of char with a terminator',
      summary: 'The null terminator, why sizeof and strlen differ, safe string functions, and the overflow that started it all.',
      duration: 18,
      build: (b) => [
        b.md(`## A string is a convention, not a type

C has no string type. A "string" is a \`char\` array whose bytes end with \`\\0\`, the null character. Every string function in the standard library works by walking to that terminator.

\`\`\`c
char greeting[] = "Hello";
\`\`\`

That is equivalent to:

\`\`\`c
char greeting[6] = { 'H', 'e', 'l', 'l', 'o', '\\0' };
\`\`\`

Six elements, not five. The terminator is part of the data. This is the source of a whole family of off-by-one bugs, so it is worth being pedantic about.

## The terminator is what makes it work

\`\`\`
Index:   0     1     2     3     4     5
Value:  'H'   'e'   'l'   'l'   'o'   '\\0'
\`\`\`

Every function that consumes a string — \`printf\` with \`%s\`, \`strlen\`, \`strcpy\`, \`strcmp\` — needs to know where it ends, and this is how it is told. Without the \`\\0\`, the function would keep reading into whatever follows until it happened to find a zero byte.

## sizeof versus strlen, and why they differ

This is the most common C string confusion and it has a precise answer.

\`\`\`c
char greeting[] = "Hello";

printf("%zu\\n", sizeof greeting);   /* 6 — the whole array, terminator included */
printf("%zu\\n", strlen(greeting));  /* 5 — characters before the terminator */
\`\`\`

- \`sizeof\` is a **compile-time property of the object**. It counts every byte the array occupies, including the \`\\0\`.
- \`strlen\` is a **runtime count of characters** before the first \`\\0\`. It is defined to return \`size_t\`, so it cannot be negative, and a string with no terminator inside a valid object is undefined behaviour.

The two coincide only by accident, for a string whose length is exactly the array size minus one.

**And the same string in a different form behaves differently:**

\`\`\`c
char a[] = "Hello";       /* array:       sizeof a == 6, strlen(a) == 5 */
const char *b = "Hello";  /* pointer:     sizeof b == 8, strlen(b) == 5 */
\`\`\`

In the second case \`b\` is a pointer to a string literal. \`sizeof b\` is the pointer size, because the array has already decayed. This trips people up constantly, and the rule is simple: **only use \`sizeof\` on a real array, in a scope where the array is visible.**

## Modifying a string literal

\`\`\`c
char *s = "hello";
s[0] = 'H';           /* UNDEFINED BEHAVIOUR — usually a crash */
\`\`\`

A string literal is an array of \`char\` with **static storage duration**. It is not a \`const\` array in the type system, so the compiler will not stop you, but the standard says modifying it is undefined behaviour. In practice it is a segfault, because the compiler places literals in read-only pages.

The correct declaration is:

\`\`\`c
const char *s = "hello";   /* s is a pointer to const char */
\`\`\`

The \`const\` applies to the characters, which is exactly the promise you want. If you want to modify a copy, copy it into an array first.

## Copying strings safely

\`\`\`c
char dest[16];
const char *src = "a fairly long string";

/* WRONG: no length limit at all. Overflows if src is >= 16 bytes. */
strcpy(dest, src);

/* RIGHT: never writes more than n bytes, always null-terminates. */
strncpy(dest, src, sizeof dest - 1);
dest[sizeof dest - 1] = '\\0';

/* BEST: available since C99, does both. Returns the number of bytes needed. */
int needed = snprintf(dest, sizeof dest, "%s", src);
if (needed < 0 || (size_t)needed >= sizeof dest) {
    /* it did not fit */
}
\`\`\`

\`strncpy\` has a nasty property worth knowing: **it does not null-terminate** if the source is at least as long as \`n\`. It fills all \`n\` bytes and adds no terminator. So the \`dest[n-1] = '\\0'\` afterwards is not optional, it is mandatory. Modern code should prefer \`snprintf\`.

## \`snprintf\` is the tool for formatting into a fixed buffer

\`\`\`c
char line[256];

snprintf(line, sizeof line, "%s has %d items (%.2f kg)\\n", name, count, mass);
\`\`\`

Two things about the return value that people get wrong:

1. It returns the number of characters that **would** have been written, excluding the terminator. So \`needed >= sizeof line\` means truncation happened.
2. On C99 and later it cannot overflow the buffer — the size argument is respected. That is a guarantee; on old pre-C99 libraries it was not.

\`\`\`c
int needed = snprintf(buf, sizeof buf, "%s", src);
if (needed < 0) {
    /* encoding error */
} else if ((size_t)needed >= sizeof buf) {
    /* truncated: handle it, do not silently use a chopped string */
}
\`\`\`

## Comparing strings

\`\`\`c
/* WRONG */
if (str1 == str2) { }        /* compares addresses! */

/* RIGHT */
if (strcmp(str1, str2) == 0) { }   /* 0 means equal */
\`\`\`

\`strcmp\` returns 0 for equal, negative if \`str1\` sorts first, positive otherwise. Never compare the result to 1 — the exact positive value is not specified. This is the single most common bug in code written by people arriving from a language where strings are values.

## \`sscanf\`: pulling a string out safely

\`\`\`c
char word[32];

if (sscanf(line, "%31s", word) == 1) {
    printf("first word: %s\\n", word);
}
\`\`\`

The \`31\` is not decoration. \`%31s\` tells \`scanf\` to write at most 31 characters plus the terminator, exactly filling \`word[32]\`. Omitting the width is a buffer overflow, and the compiler will not warn you unless you use \`-Wformat-overflow\`.

The rule generalises: **every \`%s\` in a \`scanf\`/\`sscanf\` needs a width, and the width is one less than the buffer size.**

## A safe string API, written from scratch

The library gives you dangerous primitives. Wrapping them once, correctly, is the professional move.

\`\`\`c
#include <stdio.h>
#include <string.h>
#include <stddef.h>

/* Returns 0 on success, -1 if it would not fit. buf is always terminated. */
int str_copy(char *buf, size_t cap, const char *src)
{
    if (buf == NULL || cap == 0) return -1;

    size_t len = strlen(src);
    if (len + 1 > cap) {          /* +1 for the terminator */
        buf[0] = '\\0';
        return -1;
    }
    memcpy(buf, src, len + 1);    /* copy the terminator too */
    return 0;
}
\`\`\`

The \`len + 1 > cap\` check is the whole game. Note \`>\` and not \`>=\`: a string of exactly \`cap - 1\` characters fits, because the terminator is the \`cap\`th byte.

## The \`gets\` function and why it was removed

\`\`\`c
/* char *gets(char *s);  -- REMOVED in C11, and it should never have existed */
\`\`\`

\`gets\` reads a line of any length into a fixed buffer with no limit whatsoever. It is a guaranteed buffer overflow. It was removed from the C standard in C11 precisely because it cannot be used safely, and using it is now a constraint violation in C23.

If you see \`gets\` in old code, it is a security vulnerability, not a style question. Replace it with \`fgets\`:

\`\`\`c
char line[256];
if (fgets(line, sizeof line, stdin) != NULL) {
    /* strip the trailing newline if you do not want it */
    line[strcspn(line, "\\n")] = '\\0';
}
\`\`\`

This exact replacement is Module 3's core lesson, and it is worth restating here because the vulnerability and the function are the same thing.`),
        b.anim('memory', {
          title: 'Why sizeof and strlen disagree',
          badge: 'one byte apart',
          base: 4198656,
          cell_bytes: 1,
          cells: [
            { label: '0', bytes: ['48'], tone: 'char', note: "'H'" },
            { label: '1', bytes: ['65'], tone: 'char', note: "'e'" },
            { label: '2', bytes: ['6C'], tone: 'char', note: "'l'" },
            { label: '3', bytes: ['6C'], tone: 'char', note: "'l'" },
            { label: '4', bytes: ['6F'], tone: 'char', note: "'o'" },
            { label: '5', bytes: ['00'], tone: 'null', note: 'the terminator' },
          ],
          steps: [
            {
              caption:
                "char greeting[] = \"Hello\"; — the compiler sizes the array to fit the literal plus its terminator.",
              note: 'Six cells, not five. The array size is known at compile time, so sizeof never reads memory: it is a property of the declaration, not of the contents.',
              vars: [{ name: 'greeting', type: 'char[6]', value: '0x400100', pointsTo: 0 }],
            },
            {
              caption:
                'sizeof greeting is 6. strlen(greeting) is 5, because strlen stops at the terminator and does not count it.',
              note: 'Two different questions. sizeof asks how much storage the object occupies; strlen asks how many characters precede the first zero byte. They differ by exactly one for any well-formed string.',
              highlight: [5],
              vars: [{ name: 'greeting', type: 'char[6]', value: '0x400100', pointsTo: 0 }],
            },
            {
              caption:
                'strlen is that simple: walk from the first byte, counting, until \\0.',
              note: 'A runtime loop, which is why it costs time proportional to the length — and why it is undefined behaviour if no terminator exists before the end of the object.',
              highlight: [0, 1, 2, 3, 4],
              vars: [{ name: 'greeting', type: 'char[6]', value: '0x400100', pointsTo: 0 }],
            },
            {
              caption:
                'Now the same text as a pointer: const char *b = "Hello";',
              note: 'The array has already decayed, so there is no array object left for sizeof to measure and it reports the size of the pointer. The string is still 5 characters — only sizeof is now answering a different question.',
              vars: [{ name: 'b', type: 'const char*', value: '0x400100', pointsTo: 0 }],
            },
            {
              caption:
                'A buffer needs one byte more than the string length, because the terminator occupies real memory.',
              note: 'char buf[6] holds "Hello" exactly. strcpy(buf, "Hello") writes 6 bytes including the terminator. This "+1" is the single most common off-by-one in C, and the reason a 5-character field read with %5s needs 6 bytes.',
              highlight: [5],
              vars: [{ name: 'buf', type: 'char[6]', value: '0x400200', pointsTo: 5 }],
            },
          ],
        }),
        b.code(
          `#include <stdio.h>
#include <string.h>
#include <stddef.h>

/* A safe copy: always terminates, never overflows, reports failure. */
static int str_copy(char *buf, size_t cap, const char *src)
{
    if (buf == NULL || cap == 0) {
        return -1;
    }

    size_t len = strlen(src);
    if (len + 1 > cap) {          /* +1 for the terminator */
        buf[0] = '\\0';
        return -1;
    }
    memcpy(buf, src, len + 1);
    return 0;
}

int main(void)
{
    char greeting[] = "Hello";

    printf("sizeof  = %zu\\n", sizeof greeting);   /* 6 */
    printf("strlen  = %zu\\n", strlen(greeting));  /* 5 */

    const char *literal = "Hello";
    printf("sizeof literal = %zu  (a pointer, not an array)\\n", sizeof literal);

    /* strncpy does NOT terminate if the source fills the buffer. */
    char small[8];
    strncpy(small, "a much longer source string", sizeof small);
    printf("small[7] = %d  -- not zero! that is why we terminate manually\\n", small[7]);

    /* The correct version. */
    char dest[8];
    strncpy(dest, "abcdefgh", sizeof dest - 1);
    dest[sizeof dest - 1] = '\\0';
    printf("dest = \\"%s\\"\\n", dest);

    /* snprintf does both, and tells you if it truncated. */
    char line[64];
    int needed = snprintf(line, sizeof line, "%s has %d items (%.2f kg)",
                          "widget", 42, 3.14159);
    if (needed < 0) {
        printf("encoding error\\n");
    } else if ((size_t)needed >= sizeof line) {
        printf("truncated (needed %d, have %zu)\\n", needed, sizeof line);
    } else {
        printf("%s\\n", line);
    }

    /* Every %s in a scan needs a width one less than the buffer. */
    char first[16];
    if (sscanf("Ada Lovelace 1815", "%15s", first) == 1) {
        printf("first token: %s\\n", first);
    }

    /* Comparing strings. */
    char a[] = "same";
    char b[] = "same";
    printf("a == b is %d (compares addresses)\\n", a == b);
    printf("strcmp(a, b) == 0 is %d\\n", strcmp(a, b) == 0);

    /* Our wrapper. */
    char out[8];
    if (str_copy(out, sizeof out, "Hello") == 0) {
        printf("copied: %s\\n", out);
    } else {
        printf("did not fit\\n");
    }

    return 0;
}
`,
          'strings.c'
        ),
        b.table(
          'String functions, and what each one gets wrong',
          ['Function', 'Does', 'The hazard'],
          [
            ['strlen(s)', 'Counts bytes before \\0', 'Reads past the end if there is no \\0'],
            ['strcpy(d, s)', 'Copies, including the terminator', 'No limit. Overflows if s >= d'],
            ['strncpy(d, s, n)', 'Copies at most n bytes', 'Does NOT terminate if s is >= n long'],
            ['strcat(d, s)', 'Appends to d', 'No limit. Overflows if the result exceeds d'],
            ['strcmp(a, b)', 'Compares', 'Returns 0 / <0 / >0. Never compare to 1'],
            ['strchr(s, c)', 'Finds a byte', 'Returns a pointer into s, or NULL'],
            ['snprintf(b, n, ...)', 'Formats into a bounded buffer', 'Returns the needed length, so you can detect truncation'],
            ['gets(s)', 'Reads a line, unbounded', 'REMOVED in C11. A guaranteed buffer overflow'],
            ['fgets(b, n, f)', 'Reads a line, bounded', 'Keeps the \\n. Returns NULL on error or EOF'],
            ['sscanf(s, "%Ns", b)', 'Reads a bounded token', 'Omitting N is an overflow'],
          ]
        ),
        b.warn(
          'strncpy does not null-terminate',
          'If the source string is at least as long as n, strncpy writes exactly n bytes of source and adds no terminator. The result is a buffer that is not a valid C string, and every function you later call on it will read past the end. Either write dst[n-1] = 0 after the call, or use snprintf, which does both and tells you whether it truncated.',
        ),
        b.warn(
          'Never compare strings with ==',
          '== on two char* compares addresses, not contents. Two separately-built strings with identical contents are at different addresses, so the comparison is false. Use strcmp(a, b) == 0. The mirror-image bug is using strcmp(a, b) == 1, which happens to be true on some platforms and false on others — the standard only guarantees the sign.',
        ),
        b.tip(
          'Wrap the dangerous functions once',
          'Write str_copy, str_append and str_join helpers with explicit capacity arguments, use them everywhere, and make the unsafe ones static in one file so nobody can reach for them directly. This is what the "safe string" libraries in other languages are really doing — and in C you can write twenty lines and have them for the whole project.',
        ),
      ],
      questions: [
        [
          'Why is `sizeof "Hello"` equal to 6?',
          [
            'Because the compiler adds a byte for alignment',
            'Because a string literal includes the terminating \\0, and sizeof counts every byte of the array',
            'Because sizeof always rounds up to a power of two',
            'It is 5',
          ],
          1,
          'The literal is a char[6] — five characters plus the terminator. sizeof counts all six. strlen returns 5 because it stops at the terminator.',
        ],
        [
          'What is `sizeof` of `const char *s = "Hello";`?',
          [
            '6',
            '5',
            'The size of a pointer, typically 8 on 64-bit',
            'It is undefined',
          ],
          2,
          'The array decayed to a pointer when it was assigned, so there is no array to measure. This is the reason sizeof is only meaningful on a genuine array in the same scope.',
        ],
        [
          'You call strncpy(dst, src, sizeof dst) and src is longer than dst. What is wrong?',
          [
            'Nothing, it copies sizeof dst bytes safely',
            'dst is not null-terminated, so it is not a valid C string',
            'strncpy always returns NULL',
            'It is a compile error',
          ],
          1,
          'strncpy fills the buffer with source bytes and adds no terminator when the source does not fit. Every subsequent string function on dst will read out of bounds.',
        ],
        [
          'Why is `if (a == b)` the wrong way to test whether two char* are equal?',
          [
            'It is a compile error',
            'It compares addresses, not the characters they point at',
            'It compares only the first character',
            'It compares lengths',
          ],
          1,
          'The pointers were each produced by a separate literal or array, so they have different addresses even when the contents match. Use strcmp(a, b) == 0.',
        ],
        [
          'Why was gets removed from the C standard?',
          [
            'It was replaced by a faster function',
            'It reads an unbounded line into a fixed buffer, so it cannot be used without risking overflow',
            'It did not return int',
            'It was buggy on Windows only',
          ],
          1,
          'It is impossible to use safely, which is why C11 removed it outright rather than fixing it. Use fgets(buf, sizeof buf, stdin).',
        ],
      ],
    },
  ]
);
