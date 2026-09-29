// Module 9 — Pointers.
// What a pointer actually is (a number), why it exists, and the mental model
// that keeps the rest of the module from becoming superstition.

import { mod } from '../blocks';

export const M9 = mod(
  'crs-c-programming',
  'c-m9',
  9,
  'Module 9 — Pointers',
  'Addresses, dereferencing, the pointer/parameter pass-by-reference idiom, and pointer arithmetic.',
  [
    {
      title: 'What a pointer really is',
      summary: 'An address in a variable. Nothing more mystical than that, and nothing less powerful.',
      duration: 16,
      build: (b) => [
        b.md(`## A pointer is just a number

C has no memory model in a language sense. A pointer is a value that holds an address. That is the entire definition.

\`\`\`c
int value = 42;
int *p = &value;     /* p holds the address of value */
\`\`\`

Two operations, and you can do these to any pointer:

\`\`\`c
&value     /* address-of: where value lives  -> gives int* */
*p         /* dereference: read the value at p -> gives int  */
\`\`\`

Everything in this module is those two ideas plus arithmetic. When people describe pointers as "dangerous", they usually mean that C will not stop you applying \`p + 1\` to a pointer that points at nothing.

## Declaring a pointer

\`\`\`c
int    *p1;      /* pointer to int          */
double *p2;      /* pointer to double       */
char   *p3;      /* pointer to char         */
int   **pp;      /* pointer to pointer      */

int  *arr[5];    /* ARRAY of 5 int pointers      */
int (*arr2)[5];  /* POINTER to an array of 5 ints */
\`\`\`

The last two lines are the classic trap. **Declarations read right to left, from the name outwards.** \`int *arr[5]\`: start at \`arr\`, go right — \`[5]\` means array; then go left — \`int *\` means of pointers. So array of pointers. \`int (*arr2)[5]\`: the parentheses stop the rightward scan, so \`arr2\` is a pointer, and \`(*arr2)\` is to an array of 5 ints.

This is why the extra parens are not decoration, and why you should write one or the other with a comment the first time.

## The declaration/init pitfall

\`\`\`c
int *p = &value;      /* p is the pointer. Correct. */

int *p, q = 5;        /* q is an int, NOT a pointer. Only p is a pointer. */
\`\`\`

The \`*\` binds to the declarator, not to the type. It is an easy source of a warning and an easy source of a real bug. The habit that removes it: declare the type, not the pointer, in headers and shared APIs, and keep the \`*\` attached to the name.

## NULL is not zero, but close

\`\`\`c
int *p = NULL;        /* the correct way to say "points nowhere" */
if (p == NULL) { ... }

int *q = 0;           /* legal: a null pointer constant. */
\`\`\`

\`NULL\` is a macro, usually expanding to \`((void*)0)\`. Testing against \`NULL\` rather than \`0\` is a style preference, not a correctness one — but it documents intent, and it is what every codebase does.

Crucially, the important check is not \`p == 0\` but whether the pointer is valid at all. See "three pointer flavours" below.

## Why pointers exist

They are not for "saving memory". A pointer is 8 bytes and a struct might be 200. The reasons are:

1. **Pass-by-reference.** C passes every argument by value. To let a function modify the caller's variable, you pass its address. This is the single most common use.
2. **Dynamic memory.** \`malloc\` hands back an address because it hands back memory whose size is not known at compile time.
3. **Arrays are pointers in disguise.** As Module 8 showed, an array name in an expression *is* a pointer. A working array section requires the pointer concept.
4. **Structures and data structures.** Linked lists, trees, and graphs are built from "this points at the next node", and a pointer is the only way to express that.
5. **Avoiding a copy.** Passing a large struct by value copies it. Passing a pointer to it copies 8 bytes.

## The pass-by-value trap

This is the thing to internalise before anything else. C has exactly one calling convention: everything is copied.

\`\`\`c
void try_to_change(int x)
{
    x = 999;      /* changes the copy. The caller's x is untouched. */
}

void actually_change(int *x)
{
    *x = 999;     /* writes through the address. The caller's x changes. */
}

int main(void)
{
    int a = 1;
    try_to_change(a);       /* a is still 1 */
    actually_change(&a);    /* a is now 999 */

    int b = 5;
    int *p = &b;
    try_to_change(p);       /* STILL 5. We passed a copy of the pointer. */
    printf("%d\\n", b);
}
\`\`\`

The second result surprises nearly everyone. \`try_to_change(p)\` copies the *address*, so inside the function \`x\` is a different pointer variable holding the same value. \`x = 999\` changes that local pointer to point elsewhere; \`b\` is untouched. To modify \`b\` through a pointer parameter you need a pointer to a pointer, or the pattern below.

## Idiomatic pass-by-reference: a return status

Returning "was this successful" as the function's return value, and doing the modification through a pointer parameter, is the C convention:

\`\`\`c
int set_value(int *out, int new_value)
{
    if (out == NULL) {
        return -1;          /* tell the caller it failed */
    }
    *out = new_value;       /* do the work */
    return 0;
}

int main(void)
{
    int x = 0;

    if (set_value(&x, 42) != 0) {
        fprintf(stderr, "could not set value\\n");
    }
    /* x == 42 */
}
\`\`\`

This gives the caller both an error signal and a written result, with no output parameters chained through the return value. You will see this exact shape in every serious C library.

Note the defensive \`NULL\` check. A \`NULL\` pointer that gets written through is a segfault with no diagnostic. The check costs one comparison.

## const on pointers, and the three levels

The direction of \`const\` matters, and mixing it up is a classic bug:

\`\`\`c
int value = 10;

int       *p1 = &value;   /* pointer to mutable int             */
const int *p2 = &value;   /* pointer to const int: read only    */
int *const p3 = &value;   /* const pointer: cannot be reseated  */
const int *const p4 = &value;  /* both                          */
\`\`\`

Reading \`int *const p\` as a sentence: "p is a const pointer to a mutable int" — you can point p anywhere, but you cannot change what it points at. \`p = &other;\` fails to compile; \`*p = 5;\` works.

\`const\` on a pointer parameter is how you document "this function will not modify your data":

\`\`\`c
void print_all(const int *values, size_t count);
\`\`\`

Callers with an \`int *\` can still pass a pointer-to-const, so the rule is to use \`const\` in the declaration and it costs the caller nothing.

## Three pointer flavours

Not all pointers are interchangeable, and knowing which you have prevents a whole category of bug:

1. **Null** — \`NULL\`. Points nowhere. Dereferencing crashes.
2. **Uninitialised** — \`int *p;\`. Contains whatever was in that stack slot, so it points somewhere random. Testing \`if (p == NULL)\` on it is meaningless. **Always initialise to \`NULL\`, always.**
3. **Dangling** — pointed to memory that has been freed or gone out of scope. Dereferencing is undefined behaviour, and this is the most dangerous of the three because the value still looks like a valid address.
4. **Valid** — points into a live object. Fine to dereference, within bounds.

## Dereferencing a NULL crashes, and that is by design

\`\`\`c
int *p = NULL;
printf("%d\\n", *p);      /* segmentation fault */
\`\`\`

There is no exception, no error code, no message. The program dies. This is a deliberate design point of C: \`NULL\` dereference is a *bug in your program*, not a runtime condition to be handled, so the language lets it fail immediately and loudly. If it were allowed to continue, the bug would spread.

This is why the \`if (out == NULL)\` check in every library function is not busywork.

## Pointer arithmetic

C lets you add and subtract integers from pointers. The unit is elements, not bytes.

\`\`\`c
int values[5] = {10, 20, 30, 40, 50};
int *p = values;      /* p -> values[0] */

p + 1                  /* -> values[1], i.e. 4 bytes further on */
p + 2                  /* -> values[2]  */
p - 1                  /* -> one before values[0]: legal to form, illegal to use */
p + 5                  /* one-past-the-end: legal to form, illegal to deref */
\`\`\`

The compiler scales it for you, using \`sizeof *p\`. \`p + 1\` is \`(char*)p + 4\` on a 4-byte-int machine. You never do that arithmetic by hand.

What is *not* legal is mixing the two: \`p + 1.5\` is a compile error, and adding a byte offset requires a cast to \`char *\`:

\`\`\`c
char *bytes = (char *)p;    /* correct: 1 byte per step */
bytes + 1;                   /* the second byte of the int */
\`\`\`

## Pointer difference

\`\`\`c
int *a = values;
int *b = values + 3;
printf("%td\\n", b - a);    /* 3 — an element count, not a byte count */
\`\`\`

The result type is \`ptrdiff_t\`, and it is the number of elements. \`%td\` is the correct \`printf\` specifier for it, or cast to \`long\` and use \`%ld\`.

## Assigning to a pointer does not copy the data

\`\`\`c
int a = 1, b = 2;
int *p = &a;

*p = 100;      /* a becomes 100 */
p = &b;        /* p now points at b. a is still 100. */
\`\`\`

Two distinct operations that look similar in the source:
- \`*p = 100\` — write *through* the pointer.
- \`p = &b\` — move the pointer itself.

\`p++\` moves the pointer. \`(*p)++\` increments the pointed-to value. The parentheses matter. This distinction explains most pointer bugs in real code.

## \`const\` and string literals in one place

\`\`\`c
const char *version = "1.0";   /* may read, must not write */
char *bad = "1.0";             /* compiles, then crashes on write */
\`\`\`

A string literal has static storage duration and is usually in read-only memory. The \`const\` is not optional politeness — it is the only thing that makes the write a compile error instead of a segfault.

## Common pointer mistakes

| Code | Problem |
| --- | --- |
| \`int *p;\` then \`*p = 5;\` | \`p\` is uninitialised; writes to a random address |
| \`int *p = NULL; *p = 5;\` | Segfault |
| \`p = q;\` thinking it copies | Copies the address, not the data |
| \`a[i] = a[j]\` on pointers | Assigns the pointer, not the value |
| \`free(p); p = NULL;\` omitted | Second use is a dangling pointer |
| \`p + 1\` on a non-array | Arithmetic is only defined within one array object |
| \`strcpy(p, "longer string")\` | Overflow; no length known |
| returning \`&local;\` | The frame is gone; the pointer dangles immediately |

## A practical checklist

- Initialise every pointer to \`NULL\` at declaration. No exceptions.
- Check every pointer that crosses a function boundary before dereferencing it.
- Prefer \`const\` in parameters you only read.
- One \`free\` per \`malloc\`, and set the pointer to \`NULL\` immediately after.
- When a pointer points into an array, also keep the end, or the count.
- Compile with \`-Wall -Wextra -fsanitize=address\` while developing.`),
        b.anim('passing', {
          title: 'Pass by value, twice',
          badge: 'the trap',
          steps: [
            {
              caption:
                'int b = 5;  int *p = &b;  p holds the address of b. The two panes start identical.',
              note: 'b occupies 4 bytes somewhere. p is a separate 8-byte object holding the number that names that location. On the left we will copy b by value; on the right we will copy the address.',
              panes: [
                {
                  title: "Caller's memory",
                  sub: 'int b = 5;  int *p = &b;',
                  cells: [
                    { label: 'b', value: '5', tone: 'int' },
                    { label: 'p', value: '&b', tone: 'int' },
                  ],
                },
                {
                  title: 'What the callee will receive',
                  sub: 'void f(int n)  vs  void f(int *x)',
                  cells: [
                    { label: 'value copy n', value: '?', tone: 'char' },
                    { label: 'address copy x', value: '?', tone: 'char' },
                  ],
                },
              ],
            },
            {
              caption:
                'try_to_change(p): the pointer is copied into a new local x. x holds the same address, but x is a different variable.',
              note: 'C passes everything by value, including pointers. The callee got its own pointer object. p in the caller is untouched so far.',
              panes: [
                {
                  title: "Caller's memory",
                  sub: 'int b = 5;  int *p = &b;',
                  cells: [
                    { label: 'b', value: '5', tone: 'int' },
                    { label: 'p', value: '&b', tone: 'int' },
                  ],
                },
                {
                  title: 'Inside try_to_change',
                  sub: 'void try_to_change(int *x)',
                  call: 'x = 999;',
                  cells: [
                    { label: 'callee x', value: '&b (a copy)', tone: 'char' },
                    { label: 'what x points at', value: 'b = 5', tone: 'int' },
                  ],
                },
              ],
            },
            {
              caption:
                'x = 999 changes the local pointer, not the variable it pointed at. The caller sees nothing.',
              note: 'The assignment wrote into x itself. p in the caller still holds &b, and b is still 5. This is why passing a pointer does not by itself give the function access to your variable.',
              panes: [
                {
                  title: "Caller's memory",
                  sub: 'int b = 5;  int *p = &b;',
                  cells: [
                    { label: 'b', value: '5  (unchanged)', tone: 'ok' },
                    { label: 'p', value: '&b', tone: 'int' },
                  ],
                },
                {
                  title: 'Inside try_to_change',
                  sub: 'void try_to_change(int *x)',
                  call: 'x = 999;',
                  cells: [
                    { label: 'callee x', value: '&other  ← changed', tone: 'bad' },
                    { label: 'b via p', value: '5', tone: 'int' },
                  ],
                },
              ],
            },
            {
              caption:
                'actually_change(&b): pass the address directly. Now *x = 999 writes through to b.',
              note: '*x = 999 means "write 999 to the memory x points at". That memory is b, so the caller sees the change. This is the pass-by-reference idiom, and the only way to modify a caller variable.',
              panes: [
                {
                  title: "Caller's memory",
                  sub: 'int b = 5;',
                  cells: [
                    { label: 'b', value: '← now 999', tone: 'ok' },
                    { label: 'address passed', value: '&b', tone: 'int' },
                  ],
                },
                {
                  title: 'Inside actually_change',
                  sub: 'void actually_change(int *x)',
                  call: '*x = 999;',
                  cells: [
                    { label: 'callee x', value: '&b', tone: 'int' },
                    { label: '*x (write through)', value: '999', tone: 'ok' },
                  ],
                },
              ],
            },
            {
              caption:
                'To let the function also change which variable the caller points at, pass a pointer to the pointer.',
              note: 'void swap(int **a, int **b) dereferences twice: **a is the value that *p holds, so **a = tmp modifies the caller p itself. Used for swapping, for out-parameters that may be reassigned, and for arrays of pointers.',
              panes: [
                {
                  title: "Caller's memory",
                  sub: 'int *p = &x;  swap_ptrs(&p, &q);',
                  cells: [
                    { label: 'p', value: '&x', tone: 'int' },
                    { label: '&p (passed)', value: 'address of p', tone: 'char' },
                  ],
                },
                {
                  title: 'Inside swap_ptrs',
                  sub: 'void swap_ptrs(int **a, int **b)',
                  call: '*a = *b;',
                  cells: [
                    { label: '*a', value: 'writable p', tone: 'ok' },
                    { label: '**a', value: 'the int x', tone: 'int' },
                  ],
                },
              ],
            },
          ],
        }),
        b.code(
          `#include <stdio.h>
#include <stddef.h>

/* Idiomatic C: report failure via the return value,
 * do the work through a const-correct pointer. */
static int set_value(int *out, int new_value)
{
    if (out == NULL) {
        return -1;
    }
    *out = new_value;
    return 0;
}

static void try_to_change(int x)
{
    x = 999;                    /* only the local copy changes */
}

static void actually_change(int *x)
{
    *x = 999;                   /* writes through the address */
}

static void swap(int **a, int **b)
{
    int *tmp = *a;
    *a = *b;
    *b = tmp;
}

int main(void)
{
    int a = 1;
    int b = 5;

    try_to_change(a);
    actually_change(&a);
    printf("a = %d\\n", a);          /* 999 */

    /* Passing a pointer does not let the function reseat it. */
    try_to_change_ptr(p = &b);
    printf("b = %d\\n", b);          /* 5 */

    /* But a pointer-to-pointer can. */
    int *p = &a, *q = &b;
    swap(&p, &q);
    printf("p points at %d, q points at %d\\n", *p, *q);

    /* Return status + out parameter. */
    int x = 0;
    if (set_value(&x, 42) != 0) {
        fprintf(stderr, "set_value failed\\n");
    }
    printf("x = %d\\n", x);          /* 42 */

    /* Null check, always. */
    if (set_value(NULL, 1) != 0) {
        printf("NULL rejected, as it should be\\n");
    }

    return 0;
}

static void try_to_change_ptr(int x)
{
    x = 0;                       /* reseats the local copy only */
}
`,
          'pointers_basics.c'
        ),
        b.table(
          'Pointer declarations, read right to left',
          ['Declaration', 'Reads as', 'Meaning'],
          [
            ['int *p;', 'p is a pointer to int', 'A single pointer'],
            ['int **pp;', 'pp is a pointer to pointer to int', 'For arrays of pointers, or 2D heap arrays'],
            ['int *arr[5];', 'arr is an array of 5 pointers to int', 'Five pointers, not a 5-int array'],
            ['int (*p)[5];', 'p is a pointer to an array of 5 ints', 'A heap-allocated 2D array, row width known'],
            ['int (*fn)(int);', 'fn is a pointer to function(int) returning int', 'A function pointer'],
            ['const int *p;', 'p is a pointer to const int', 'Read-only through p; p itself is mutable'],
            ['int *const p;', 'p is a const pointer to int', 'Cannot reseat p; can write through it'],
            ['char *argv[];', 'argv is an array of pointers to char', 'What main looks like'],
          ]
        ),
        b.warn(
          'An uninitialised pointer is not the same as NULL',
          'int *p; leaves p holding whatever bytes were at that stack location — typically a return address or a pointer from a previous call. Testing p == NULL on it is meaningless and will usually be false, so the code proceeds and writes to a random address. Declare every pointer as int *p = NULL;. The compiler can then help: it will warn when you dereference a variable that is provably still NULL.',
        ),
        b.warn(
          'Dangling pointers are the hardest bug to find',
          'free(p) ends the life of the memory but leaves p holding its old address, and p == NULL is now false. Any later use is undefined behaviour that may not crash for hours. The fix is one line, and it is not optional: free(p); p = NULL;',
        ),
        b.tip(
          'Use a pointer parameter to modify, a pointer-to-const to read',
          'void print(const char *s) promises the caller their data is untouched, and any pointer to char converts to it for free. It also stops you from accidentally writing. A const parameter is documentation the compiler enforces — far better than a comment.',
        ),
      ],
      questions: [
        [
          'What does `&value` produce?',
          [
            'The value stored in `value`',
            'The address of `value`',
            'A copy of `value`',
            'A pointer to a pointer',
          ],
          1,
          'The address-of operator gives the address of an object. The dereference operator * is what turns that address back into a value.',
        ],
        [
          'You call `try_to_change(p)` where p points at int b. Inside, the parameter is set to 999. What is b afterwards?',
          [
            '999 — C passes pointers by reference',
            'Unchanged — C passed a copy of the pointer, so only the local copy was modified',
            'Undefined behaviour',
            '0, because the local copy went out of scope',
          ],
          1,
          'Everything in C is passed by value, including pointers. The function received its own pointer variable. To change b you need *x = 999, or a pointer-to-pointer if you want the function to reseat the caller pointer.',
        ],
        [
          'How is `p + 1` interpreted when p is an `int *`?',
          [
            'As the next byte, so p + 1 points one byte past p',
            'As the next int, i.e. 4 bytes further on a machine with 4-byte ints',
            'As the next pointer, 8 bytes on',
            'It is a compile error',
          ],
          1,
          'Pointer arithmetic is in units of the pointed-to type. The compiler scales it by sizeof *p. To step in bytes you cast to char * first.',
        ],
        [
          'What is `int *arr[5];`?',
          [
            'An array of 5 pointers to int',
            'A pointer to an array of 5 ints',
            'A 5-element int array',
            'It is a syntax error',
          ],
          0,
          'Reading right to left from the name: [5] makes it an array, then int * makes the elements pointers. If you wanted a pointer to an array you would write int (*arr)[5] — the parentheses are what change the meaning.',
        ],
        [
          'Why is `const int *p` different from `int *const p`?',
          [
            'They are identical',
            'The first lets you read through p but not write; the second lets you write through p but not reseat p',
            'The first is faster',
            'The second does not compile',
          ],
          1,
          'const qualifies whatever it directly precedes. In const int *p the const applies to the int, so p can point anywhere but the data is read-only. In int *const p the const applies to p, so p is locked to one address but that data is writable.',
        ],
      ],
    },
    {
      title: 'Pointers and functions: pass by reference, arrays, and swapping',
      summary: 'Building the patterns that make pointers worth the trouble — real functions you can reuse.',
      duration: 17,
      build: (b) => [
        b.md(`## Pattern 1: modify the caller's variable

\`\`\`c
void increment(int *counter)
{
    (*counter)++;      /* parens matter: increments the value, not the pointer */
}

int main(void)
{
    int c = 0;
    increment(&c);      /* c == 1 */
}
\`\`\`

Note the parentheses. \`counter++\` would advance the pointer, which points nowhere useful and is discarded. \`(*counter)++\` increments the int the pointer refers to.

## Pattern 2: return a new value instead

Often a function is clearer with no pointer parameter at all:

\`\`\`c
int incremented(int counter)
{
    return counter + 1;
}
\`\`\`

C is a language of expressions, and expressions compose. Returning a value is usually cleaner than taking a pointer and writing through it. **Reach for a pointer when the function needs to modify or produce more than one thing, or when the value is large.**

## Pattern 3: multiple return values

C functions return one value. To return several, either return a struct, or use pointer parameters plus a status return:

\`\`\`c
#include <stdbool.h>
#include <stddef.h>

/* Returns true on success. Writes results through the pointers. */
bool divmod(int numerator, int denominator, int *quotient, int *remainder)
{
    if (denominator == 0) return false;
    if (quotient  != NULL) *quotient  = numerator / denominator;
    if (remainder != NULL) *remainder = numerator % denominator;
    return true;
}

int main(void)
{
    int q, r;
    if (divmod(17, 5, &q, &r)) {
        printf("%d = %d*%d + %d\\n", 17, 5, q, r);   /* 17 = 5*3 + 2 */
    }
}
\`\`\`

Each output parameter is NULL-checked, so callers can ignore results they do not need. That is the pattern from \`div\` in the standard library, and it is the model for the rest of your career.

## Pattern 4: swap, and the pointer-to-pointer

\`\`\`c
void swap(int *a, int *b)
{
    int tmp = *a;
    *a = *b;
    *b = tmp;
}

int main(void)
{
    int x = 1, y = 2;
    swap(&x, &y);       /* x == 2, y == 1 */
}
\`\`\`

Both are already pointers, so we dereference each. No pointer-to-pointer needed here — that appears only when the function must change *which address the caller's pointer holds*:

\`\`\`c
void swap_ptrs(int **a, int **b)
{
    int *tmp = *a;     /* the address p currently holds */
    *a = *b;           /* write that address into the caller's p */
    *b = tmp;
}
\`\`\`

## Pattern 5: arrays of pointers, the practical use

This is where a 2D array of strings is built — which is exactly what \`argv\` and \`envp\` are.

\`\`\`c
const char *names[] = { "Ada", "Alan", "Grace" };
size_t count = sizeof names / sizeof names[0];

for (size_t i = 0; i < count; i++) {
    printf("%s\\n", names[i]);
}
\`\`\`

The array holds three pointers. Each points at a string literal elsewhere. No copying, no allocation, and the whole table is a few dozen bytes of pointers.

## Pattern 6: a swap function pointer pair

\`\`\`c
#include <stdlib.h>

static int cmp_int(const void *a, const void *b)
{
    int ia = *(const int *)a;
    int ib = *(const int *)b;
    return (ia > ib) - (ia < ib);    /* never return -1 or 1 */
}
\`\`\`

\`qsort\` hands your comparator pointers to opaque elements, and the \`const void *\` forces a cast inside. Note the comparison: returning \`(ia > ib) - (ia < ib)\` gives -1, 0, or 1 without an \`if\`. (Returning \`-1\` from the \`if\` branch and \`1\` from the other would be fine too; the bug is returning the difference of two arbitrary numbers, which can overflow.)

## \`void *\`: the generic pointer

\`\`\`c
void *buffer = malloc(100 * sizeof(int));
/* compiler error: assigning 'int *' from 'void *'? No — the reverse is fine. */
int *typed = buffer;    /* OK: void* converts to any object pointer implicitly */
\`\`\`

\`void *\` converts to and from any object pointer without a cast. That is what makes \`malloc\` usable: it does not know what you will store, so it returns \`void *\`. The conversion in the other direction (some pointer to \`void *\`) requires a cast in C, and the one place you must never do it is \`free\` on a converted pointer.

\`void\` as a return type means "no value", which is different from returning \`NULL\`.

## const in the signature, always

\`\`\`c
void print_all(const int *values, size_t count);   /* does not modify */
void fill_all(int *values, size_t count, int v);   /* does modify */
\`\`\`

The \`const\` is a promise the compiler checks *inside your function*, and a promise the caller can rely on. It costs nothing at runtime, it documents the contract, and it prevents a whole class of accidental modification.

## Return status, not NULL, for input parameters

There are two conventions, and they are not interchangeable:

| Kind of pointer | Failure signal |
| --- | --- |
| Function \`return\` value (malloc, strchr, fopen) | \`NULL\` |
| Function \`out\` parameter | nonzero status return (\`0\` = success) |

A function that returns a pointer uses \`NULL\`; a function that returns \`int\` and takes an out-pointer uses the int as status. Mixing them is a readability bug. Pick the convention for the API and document it in a comment on the declaration.

## The whole thing as a worked example

\`\`\`c
#include <stdio.h>
#include <stddef.h>
#include <stdbool.h>

/* Reverse an int array in place. */
static void reverse(int *values, size_t count)
{
    if (count < 2) return;
    for (size_t i = 0, j = count - 1; i < j; i++, j--) {
        int tmp = values[i];
        values[i] = values[j];
        values[j] = tmp;
    }
}

/* Find and replace: returns the number of replacements. */
static size_t replace(int *values, size_t count, int from, int to)
{
    size_t n = 0;
    for (size_t i = 0; i < count; i++) {
        if (values[i] == from) {
            values[i] = to;
            n++;
        }
    }
    return n;
}

static void print_all(const int *values, size_t count)
{
    for (size_t i = 0; i < count; i++) printf("%d ", values[i]);
    putchar('\\n');
}

int main(void)
{
    int data[] = { 4, 8, 15, 16, 23, 42 };
    size_t n = sizeof data / sizeof data[0];

    print_all(data, n);
    printf("replaced %zu 8s\\n", replace(data, n, 8, 7), "");
    print_all(data, n);
    reverse(data, n);
    print_all(data, n);

    return 0;
}
\`\`\`

Everything here is a pointer parameter plus a \`size_t\` count, \`const\` where nothing is modified, and \`size_t\` for all indices and lengths. That combination is the idiom of the whole language. Learn it once and most C code stops being intimidating.`),
        b.anim('memory', {
          title: 'Passing an array, and what the callee receives',
          badge: 'decay in action',
          base: 4198656,
          cell_bytes: 4,
          cells: [
            { label: 'data[0]', bytes: ['04', '00', '00', '00'], tone: 'int' },
            { label: 'data[1]', bytes: ['08', '00', '00', '00'], tone: 'int' },
            { label: 'data[2]', bytes: ['0F', '00', '00', '00'], tone: 'int' },
            { label: 'data[3]', bytes: ['10', '00', '00', '00'], tone: 'int' },
            { label: 'data[4]', bytes: ['17', '00', '00', '00'], tone: 'int' },
            { label: 'data[5]', bytes: ['2A', '00', '00', '00'], tone: 'int' },
          ],
          steps: [
            {
              caption: 'int data[] = {4, 8, 15, 16, 23, 42}; sits contiguously in memory.',
              note: 'Six ints, 24 bytes, no gaps. The compiler knows the length only here, where the array is a real array in a real scope.',
              vars: [{ name: 'data', type: 'int[6]', value: '0x400100', pointsTo: 0 }],
            },
            {
              caption:
                'reverse(data, n) — inside the function, values is a pointer to data[0]. The array decayed.',
              note: 'values[0] still works, because indexing a pointer is the same as *(values + 0). But sizeof values is now 8, not 24. The size is gone unless it is passed separately as count.',
              highlight: [0],
              vars: [
                { name: 'values', type: 'int*', value: '0x400100', pointsTo: 0 },
                { name: 'count', type: 'size_t', value: '6' },
              ],
            },
            {
              caption:
                'The loop swaps values[i] and values[j], with i starting at 0 and j at 5.',
              note: 'Two indices walking towards each other, meeting in the middle. This is the standard in-place reversal — it needs no second array and no allocation.',
              highlight: [0, 5],
              vars: [
                { name: 'values', type: 'int*', value: '0x400100', pointsTo: 0 },
                { name: 'count', type: 'size_t', value: '6' },
              ],
            },
            {
              caption:
                'Because the pointer aliases the caller array, every write here is visible to the caller.',
              note: 'The function did not get a copy of the data; it got the address of it. That is the entire point of passing a pointer instead of an array.',
              highlight: [1, 4],
              vars: [
                { name: 'values', type: 'int*', value: '0x400100', pointsTo: 1 },
                { name: 'count', type: 'size_t', value: '6' },
              ],
            },
            {
              caption: 'Done: the caller array is reversed. No return value needed.',
              note: 'The effect is visible outside because the function modified the memory through the pointer. A plain array parameter holding a copy would have left the caller unchanged.',
              vars: [
                { name: 'data', type: 'int[6]', value: '0x400100', pointsTo: 0 },
              ],
            },
          ],
        }),
        b.code(
          `#include <stdio.h>
#include <stddef.h>
#include <stdbool.h>
#include <stdlib.h>

/* Multiple results: status return + out parameters, each NULL-checked. */
static bool divmod(int numerator, int denominator, int *quotient, int *remainder)
{
    if (denominator == 0) {
        return false;
    }
    if (quotient  != NULL) *quotient  = numerator / denominator;
    if (remainder != NULL) *remainder = numerator % denominator;
    return true;
}

static void swap(int *a, int *b)
{
    int tmp = *a;
    *a = *b;
    *b = tmp;
}

/* Needed only when the function must reseat the caller's pointer. */
static void swap_ptrs(int **a, int **b)
{
    int *tmp = *a;
    *a = *b;
    *b = tmp;
}

static int cmp_int(const void *a, const void *b)
{
    int ia = *(const int *)a;
    int ib = *(const int *)b;
    return (ia > ib) - (ia < ib);     /* -1, 0, 1 — no overflow */
}

int main(void)
{
    int x = 1, y = 2;
    swap(&x, &y);
    printf("x=%d y=%d\\n", x, y);

    int *p = &x, *q = &y;
    swap_ptrs(&p, &q);
    printf("*p=%d *q=%d\\n", *p, *q);

    int quo, rem;
    if (divmod(17, 5, &quo, &rem)) {
        printf("17 = 5*%d + %d\\n", quo, rem);
    }

    /* An array of pointers to strings. This is what argv looks like. */
    const char *names[] = { "Ada", "Alan", "Grace" };
    size_t count = sizeof names / sizeof names[0];
    for (size_t i = 0; i < count; i++) {
        printf("%s\\n", names[i]);
    }

    /* void* converts implicitly in both directions. */
    int data[] = { 5, 2, 9, 1 };
    qsort(data, sizeof data / sizeof data[0], sizeof data[0], cmp_int);
    for (size_t i = 0; i < sizeof data / sizeof data[0]; i++) {
        printf("%d ", data[i]);
    }
    putchar('\\n');

    return 0;
}
`,
          'pointer_patterns.c'
        ),
        b.warn(
          'Do not return the address of a local variable',
          'int *bad(void) { int x = 5; return &x; } returns a pointer to a stack frame that no longer exists the instant the function returns. The compiler may well print 5, and then print 5 again, and then print 0. C11 made this official: returning the address of an object with automatic storage duration is undefined behaviour, and many optimisers exploit it. Return a value, or a pointer to something with static or allocated storage.',
        ),
        b.warn(
          'Incrementing a pointer inside a function does not move the caller’s',
          'void advance(int *p) { p++; } changes only the local copy. The caller still holds the original address. If you need to advance the caller pointer, take int **. This is the same pass-by-value rule as before, and it catches everyone once.',
        ),
        b.tip(
          'The parameter trio: pointer, count, and a name for the unit',
          'void f(int *values, size_t count) is the shape. Prefer the singular form for pointers and the plural for arrays, and it reads as English. The word you choose for count (n, len, size, capacity) tells the reader whether it is a current length or a maximum, which is not always the same thing.',
        ),
      ],
      questions: [
        [
          'What is the standard way for a function to return two int results?',
          [
            'Return a struct containing both',
            'Return one and take a pointer parameter for the other, with the function return value used as a status code',
            'Use a global variable',
            'It cannot be done in C',
          ],
          1,
          'A status return plus NULL-checked out-parameters is the dominant C convention — it is what div() does. Returning a struct is also valid and sometimes cleaner. A global is never acceptable: it is not reentrant and not thread-safe.',
        ],
        [
          'Why does `void swap_ptrs(int **a, int **b)` need two levels of indirection when `void swap(int *a, int *b)` does not?',
          [
            'It does not — both are equally correct',
            'Because swapping pointer values requires writing to the caller’s pointer variable itself, not to what it points at',
            'Because **a is faster',
            'Because the second form is deprecated',
          ],
          1,
          'swap(int*, int*) exchanges the two values, dereferencing once. swap_ptrs exchanges the two addresses, so it must reach the caller’s pointer variable — hence a pointer to that pointer, and a double dereference.',
        ],
        [
          '`const int *p` vs `int *const p`. Which one prevents `p = &other;`?',
          [
            'const int *p',
            'int *const p',
            'Neither',
            'Both',
          ],
          1,
          'int *const p — the const applies to p, so p is locked to one address. const int *p has a const int, so *p cannot be written, but p can be reseated freely.',
        ],
        [
          'Why does a function parameter declared `int values[]` need a separate count?',
          [
            'Because C arrays cannot be passed at all',
            'Because the parameter decays to a pointer and the array size is lost at the call boundary',
            'Because size_t is faster than int',
            'Because the count is needed for bounds checking',
          ],
          1,
          'The decay happens at the call, so the callee receives an int* with no size. That is the fundamental limitation of C arrays and the reason every string and buffer function takes a capacity argument.',
        ],
        [
          'What is the danger of `const char *v = "1.0"; v[0] = \'2\';`?',
          [
            'Nothing, the pointer is const',
            'A string literal has static storage duration and is usually read-only, so writing to it is undefined behaviour and typically segfaults',
            'It changes the literal for everyone',
            'The compiler silently fixes it',
          ],
          1,
          'The const on the pointer only protects the pointer variable from being reseated. To make the write a compile error you need const char *v — the const must qualify the char, not the pointer.',
        ],
      ],
    },
    {
      title: 'Building blocks: linked lists, queues, and the pointer mindset',
      summary: 'Where pointers stop being a language feature and start being a data structure — plus a debugging workflow.',
      duration: 19,
      build: (b) => [
        b.md(`## Why pointers are worth the trouble

Everything so far has been mechanics. Here is the payoff: a data structure that is impossible to express without them.

A linked list is a chain of nodes, each holding a value and a pointer to the next. The list has no contiguous storage, so inserting or removing a node costs no \`memcpy\` — only pointer relinking. That is the trade: slower random access (you must walk the chain), far cheaper insertion, and unlimited size bounded only by the heap.

## The node

\`\`\`c
typedef struct Node {
    int          value;
    struct Node *next;     /* "struct" is required here — Node is not complete yet */
} Node;
\`\`\`

The \`struct\` keyword inside the member declaration is mandatory and is the most common compile error in a first linked list. While the \`struct Node\` is being defined, the tag \`Node\` is not yet a complete type, so you cannot write \`Node *next;\`. You must write \`struct Node *next;\`. Using the \`typedef\` alias does not help here, because the alias is not defined until the closing brace.

## Building and freeing

\`\`\`c
#include <stdlib.h>

static Node *node_new(int value, Node *next)
{
    Node *n = malloc(sizeof *n);      /* sizeof *n, not sizeof(Node) */
    if (n == NULL) {
        return NULL;                  /* never return a pointer you did not check */
    }
    n->value = value;
    n->next = next;
    return n;
}

static void list_free(Node *head)
{
    while (head != NULL) {
        Node *next = head->next;      /* save the next pointer BEFORE freeing */
        free(head);
        head = next;                  /* free() does not set head to NULL for you */
    }
}
\`\`\`

Two details that decide whether your code is correct:

- \`malloc(sizeof *n)\` — the \`sizeof *\` idiom. If the type of \`n\` changes, the allocation follows automatically. Never \`malloc(sizeof(Node *))\`, which allocates space for a pointer and then you write a struct into it.
- In \`list_free\`, the \`next\` pointer is read before \`free\`, because after \`free(head)\` the memory is gone. Reading \`head->next\` afterwards is a use-after-free. The compiler will warn if you reorder those lines under ASan.

## Prepending, and the reason it is the O(1) operation

\`\`\`c
static Node *list_prepend(Node *head, int value)
{
    Node *new_head = node_new(value, head);
    if (new_head == NULL) {
        return head;                  /* on failure the list is unchanged */
    }
    return new_head;                  /* the caller must take the new head */
}
\`\`\`

Note the contract: the function returns the (possibly new) head, because the head node itself changes. The caller must reassign:

\`\`\`c
head = list_prepend(head, 42);
\`\`\`

Prepending is constant time and touches exactly one pointer. Appending requires walking to the end, which is linear. This asymmetry is why stacks and queues are usually implemented at the head.

## Traversal, and the three pointer styles

\`\`\`c
/* 1. pointer walking */
for (Node *n = head; n != NULL; n = n->next) {
    printf("%d ", n->value);
}

/* 2. index-like walking */
Node *n = head;
while (n) {
    printf("%d ", n->value);
    n = n->next;
}

/* 3. modifying while walking — you need the previous node */
Node *prev = NULL;
for (n = head; n != NULL; prev = n, n = n->next) {
    if (n->value == 99) {
        if (prev == NULL) head = n->next;   /* removing the head */
        else              prev->next = n->next;
        free(n);
        n = prev;
    }
}
\`\`\`

The third pattern is worth its own study. To unlink a node you need a pointer to the node *before* it, which is why the loop keeps \`prev\` one step behind. It is also the shape that produces the classic bug of using \`n\` after \`free(n)\`, and the reason \`n = prev\` at the end of the body is not optional.

## A queue on top of the list

\`\`\`c
typedef struct {
    Node  *head;      /* front — oldest */
    Node  *tail;      /* back — newest  */
    size_t length;
} Queue;

static bool queue_push(Queue *q, int value)
{
    Node *n = node_new(value, NULL);
    if (n == NULL) return false;

    if (q->tail == NULL) {
        q->head = q->tail = n;        /* the list was empty */
    } else {
        q->tail->next = n;
        q->tail = n;
    }
    q->length++;
    return true;
}

static bool queue_pop(Queue *q, int *out)
{
    if (q->head == NULL) return false;  /* empty */
    *out = q->head->value;
    Node *dead = q->head;
    q->head = q->head->next;
    if (q->head == NULL) q->tail = NULL;  /* now empty — keep tail consistent */
    free(dead);
    q->length--;
    return true;
}
\`\`\`

Keeping \`head\` and \`tail\` both in the struct turns pop from O(n) into O(1). The line that resets \`tail\` when the queue empties is the kind of thing you write once, get right, and never think about again — and the kind of thing that leaks a node if you forget it.

## \`->\` versus \`.\`

\`\`\`c
n->value        /* n is a Node*, so -> dereferences then selects */
node.value       /* node is a Node object, so . selects directly */
(*n).value       /* identical to n->value */
\`\`\`

The rule is one line: if you have a pointer, use \`->\`; if you have the object, use \`.\`. \`->\` is defined as \`(*p).\`, so there is no difference at runtime.

## const in list code

\`\`\`c
static void list_print(const Node *head);   /* const Node*, read only */
static void list_clear(Node *head);         /* Node*, destroys */
\`\`\`

Note the const placement: \`const Node *\` means "pointer to a const Node", so you can walk the list but not change the values. For a function that frees the list, the parameter is a non-const \`Node *\`, and the node contents are not modified but the links are.

## The debugging workflow that actually works

When a pointer program misbehaves, work through these in order. Most bugs are found by step 2 or 3.

1. **Print the pointer values.** \`printf("%p\\n", (void*)p);\` for each pointer, before and after the suspicious operation. If a pointer becomes \`0x0\` or \`(nil)\`, you know exactly which line nulled it.

2. **ASan.** \`gcc -fsanitize=address -g\`. It reports the exact line of an out-of-bounds access, use-after-free, or double-free, with a stack trace and a description of the two conflicting accesses. This single tool catches most pointer bugs at the moment they happen.

3. **GDB watchpoints.** In \`gdb\`:

   \`\`\`
   (gdb) break process
   (gdb) run
   (gdb) watch *p
   (gdb) continue
   \`\`\`

   GDB prints every write to the location, which pinpoints the line that corrupts a value.

4. **Valgrind.** \`valgrind ./a.out\` reports leaks, invalid reads and writes, and uninitialised use, with the source line. Slower than ASan, and it finds leaks ASan alone does not.

5. **Check the easy mistakes first.** Uninitialised pointer, \`free\`d pointer, wrong pointer passed, off-by-one in the index, missing \`NULL\` check after \`malloc\`. Nine times out of ten, it is one of these.

## The mindset

The mental shift from arrays to pointers is this: **stop thinking about locations and start thinking about the relationships between things.** A \`Node *\` is not "an address". It is a promise that the thing it points to exists, and that the pointer knows where the rest of the structure is. The bugs come not from the arithmetic, which the compiler checks, but from promises that are no longer true.

Three habits keep the promise honest:

- Initialise to \`NULL\`, check before dereferencing.
- One owner per allocation: whoever allocates frees, or documents that the caller does.
- When a pointer walks off the end of a structure, store the end with it.`),
        b.anim('nodes', {
          title: 'A linked list, built node by node',
          badge: 'head and tail',
          steps: [
            {
              caption: 'Queue starts empty: head and tail both NULL, length 0.',
              note: 'The struct itself lives on the stack; the nodes live on the heap. The empty state is head == tail == NULL, and that single test answers "is it empty?" everywhere.',
              tail: 'NULL',
              nodes: [],
            },
            {
              caption: 'queue_push(10): the first node becomes both head and tail.',
              note: 'When the list is empty, one node has to be both ends. Miss this and you get a queue where every pop crashes on the second element.',
              tail: 'head',
              nodes: [{ id: 'n0', data: '10', note: 'value: 10' }],
            },
            {
              caption: 'queue_push(20): a new node is appended, and tail is advanced.',
              note: 'tail->next = n links the old tail to the new node, then tail = n moves the tail. head stays put, because a queue is FIFO — the front must not move.',
              tail: 'head',
              nodes: [
                { id: 'n0', data: '10', pointsTo: 'n1', note: 'value: 10' },
                { id: 'n1', data: '20', note: 'value: 20' },
              ],
            },
            {
              caption: 'queue_push(30): head → 10 → 20 → 30, tail at 30.',
              note: 'Three pushes, three nodes, and both ends updated in constant time. The nodes are scattered across the heap, not contiguous — that is the cost of a linked structure, paid back with O(1) insertion.',
              tail: 'head',
              nodes: [
                { id: 'n0', data: '10', pointsTo: 'n1', note: 'value: 10' },
                { id: 'n1', data: '20', pointsTo: 'n2', note: 'value: 20' },
                { id: 'n2', data: '30', note: 'value: 30' },
              ],
            },
            {
              caption: 'queue_pop(&out): read the head, unlink it, free it, advance head.',
              note: 'Three operations, all O(1). The critical line is reading head->next into a local BEFORE calling free — after the free, that memory is gone, and reading it is a use-after-free.',
              tail: 'head',
              nodes: [
                { id: 'n1', data: '20', pointsTo: 'n2', note: 'value: 20' },
                { id: 'n2', data: '30', note: 'value: 30' },
              ],
              freeList: ['n0 freed: value 10'],
            },
            {
              caption: 'Pop twice more and the queue is empty: head and tail are NULL again.',
              note: 'When head becomes NULL, tail must be set to NULL too. Forgetting that leaves tail pointing at freed memory, and the next push writes through a dangling pointer — a bug that surfaces far from its cause.',
              tail: 'NULL',
              nodes: [],
              freeList: ['n0 freed', 'n1 freed', 'n2 freed'],
            },
          ],
        }),
        b.code(
          `#include <stdio.h>
#include <stddef.h>
#include <stdbool.h>
#include <stdlib.h>

/* "struct" is mandatory: the tag is not a complete type until the closing brace. */
typedef struct Node {
    int          value;
    struct Node *next;
} Node;

static Node *node_new(int value, Node *next)
{
    Node *n = malloc(sizeof *n);   /* sizeof *n, never sizeof(Node *) */
    if (n == NULL) {
        return NULL;
    }
    n->value = value;
    n->next = next;
    return n;
}

static void list_free(Node *head)
{
    while (head != NULL) {
        Node *next = head->next;   /* read BEFORE freeing */
        free(head);
        head = next;
    }
}

static Node *list_prepend(Node *head, int value)
{
    Node *new_head = node_new(value, head);
    if (new_head == NULL) {
        return head;               /* unchanged on failure */
    }
    return new_head;               /* caller must reassign: head = list_prepend(head, v) */
}

static void list_print(const Node *head)
{
    for (const Node *n = head; n != NULL; n = n->next) {
        printf("%d -> ", n->value);
    }
    puts("(null)");
}

/* Removing while walking needs a pointer to the previous node. */
static bool list_remove_first(Node **head, int value)
{
    Node *prev = NULL;
    for (Node *n = *head; n != NULL; prev = n, n = n->next) {
        if (n->value == value) {
            if (prev == NULL) *head = n->next;
            else              prev->next = n->next;
            free(n);
            return true;
        }
    }
    return false;
}

typedef struct {
    Node  *head;   /* front */
    Node  *tail;   /* back */
    size_t length;
} Queue;

static bool queue_push(Queue *q, int value)
{
    Node *n = node_new(value, NULL);
    if (n == NULL) {
        return false;
    }
    if (q->tail == NULL) {
        q->head = q->tail = n;
    } else {
        q->tail->next = n;
        q->tail = n;
    }
    q->length++;
    return true;
}

static bool queue_pop(Queue *q, int *out)
{
    if (q->head == NULL) {
        return false;               /* empty */
    }
    *out = q->head->value;
    Node *dead = q->head;
    q->head = q->head->next;
    if (q->head == NULL) {
        q->tail = NULL;             /* keep tail consistent, or the next push is a use-after-free */
    }
    free(dead);
    q->length--;
    return true;
}

int main(void)
{
    Queue q = { NULL, NULL, 0 };
    for (int i = 1; i <= 3; i++) {
        if (!queue_push(&q, i * 10)) {
            fprintf(stderr, "out of memory\\n");
            return 1;
        }
    }

    int out;
    while (queue_pop(&q, &out)) {
        printf("popped %d, remaining %zu\\n", out, q.length);
    }
    printf("empty: head=%p tail=%p\\n", (void *)q.head, (void *)q.tail);

    /* Prepending is O(1); note the caller reassigns head. */
    Node *list = NULL;
    for (int i = 1; i <= 3; i++) {
        list = list_prepend(list, i);
    }
    list_print(list);
    list_remove_first(&list, 2);
    list_print(list);
    list_free(list);

    return 0;
}
`,
          'linked_list.c'
        ),
        b.table(
          'Pointer patterns, and when to use each',
          ['Need', 'Use', 'Why'],
          [
            ['Modify the caller’s variable', 'int *p parameter', 'The only mechanism C has for pass-by-reference'],
            ['Return one value', 'Return type, no pointer', 'C composes expressions; this is clearest'],
            ['Return two or more values', 'Pointer params + status return', 'The divmod pattern, matching the standard library'],
            ['Return a heap object', 'Return the pointer, NULL on failure', 'The malloc pattern'],
            ['Return nothing, do work', 'void, with pointer params', 'In-place transform, e.g. reverse'],
            ['Keep a structure reachable', 'Pointer member in a struct', 'Linked lists, trees, graphs'],
            ['Pass a read-only view', 'const T *p', 'Documents the contract, compiler-enforced'],
            ['Store a function', 'Function pointer', 'Callbacks, dispatch tables, qsort'],
            ['Repoint a caller pointer', 'T **p', 'Swap, realloc-style updates, optional results'],
          ]
        ),
        b.warn(
          'The `struct` keyword inside a self-referential struct',
          'typedef struct Node { int v; Node *next; } Node; does not compile — "Node" is still being defined, so it is not a complete type and has no known size. Write struct Node *next. The typedef alias is not available until the closing brace, which is exactly why the error is confusing the first time. A forward declaration (struct Node;) elsewhere in the file, or a separate struct for the link, avoids the confusion entirely.',
        ),
        b.warn(
          'Freeing a list while walking it',
          'while (head != NULL) { free(head); head = head->next; } is a use-after-free: the statement on the right reads memory that free just returned to the allocator. The fix is to save next first. If the allocator reuses that memory immediately — which many do — the loop can walk into a cycle and run forever instead of crashing, which is far harder to debug.',
        ),
        b.tip(
          'A queue that keeps both head and tail is a real design decision',
          'With only a head, every dequeue is O(n): you must walk to find the last node to relink it. Storing the tail makes push and pop both O(1) at the cost of one more invariant to maintain — the tail must be cleared when the queue empties. When you add a fast path, you also add a state you must keep consistent. Write the invariant in a comment.',
        ),
      ],
      questions: [
        [
          'Why must a self-referential struct use `struct Node *next;` and not `Node *next;`?',
          [
            'To keep the struct small',
            'Because inside its own definition the tag is not yet a complete type, so its size is unknown',
            'Because the typedef is a different type',
            'It is only a style rule',
          ],
          1,
          'A struct type is incomplete until its closing brace. Using it as a member by value would need a size. A pointer to it is fine in principle, but the name must be the struct tag because the typedef alias is not defined until the definition ends.',
        ],
        [
          'In `list_free`, why is `Node *next = head->next;` executed before `free(head)`?',
          [
            'For speed',
            'Because after free, head->next is a use-after-free read',
            'Because free resets next to NULL',
            'Because the order is required by the standard',
          ],
          1,
          'free releases the memory; the contents are no longer yours to read. Saving the pointer first is mandatory. Reading it after the free is undefined behaviour that may crash, or silently loop forever if the allocator reused the block.',
        ],
        [
          'What does `malloc(sizeof *n)` do when n is a `Node *`, and why is that form preferred?',
          [
            'Allocates space for a pointer',
            'Allocates sizeof(Node), and tracks the type automatically if the type changes',
            'Allocates twice the needed memory',
            'Allocates and zero-initialises',
          ],
          1,
          '*n is a Node, so sizeof *n is the struct size. Writing sizeof *n rather than sizeof(Node) means the allocation and the object can never disagree if the type is later changed. Note malloc does not zero — use calloc if you want that.',
        ],
        [
          'A singly linked list supports which operation in constant time without a tail pointer?',
          [
            'Finding the last node',
            'Prepending a new node at the head',
            'Appending at the tail',
            'Removing a node in the middle',
          ],
          1,
          'Prepending needs to touch only the new node and the head pointer. Appending needs the last node, which requires a walk; removing from the middle needs the previous node, which also requires a walk. Both become O(1) if you keep tail, or a doubly-linked list with a prev link.',
        ],
        [
          'What tool reports the exact source line of a use-after-free, with a stack trace?',
          [
            'printf debugging',
            'AddressSanitizer (-fsanitize=address)',
            'The preprocessor',
            '-Wall',
          ],
          1,
          'ASan instruments every memory access and detects use-after-free, out-of-bounds, and double-free at the moment they occur, reporting the stack trace of the offending access. Valgrind does the same more slowly and additionally finds leaks.',
        ],
      ],
    },
  ]
);
