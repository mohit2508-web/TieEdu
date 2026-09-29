// Module 7 — Functions.
// Decomposition, the declaration/definition distinction, the parameter contract,
// and recursion. The call-stack animation in this module is the one that pays
// for itself: it makes recursion, stack growth and dangling pointers visual.

import { mod } from '../blocks';

export const M7 = mod(
  'crs-c-programming',
  'c-m7',
  7,
  'Module 7 — Functions',
  'Decomposition, prototypes, pass by value, scope, recursion, and function pointers.',
  [
    {
      title: 'Declaring and defining: the rule that trips everyone up',
      summary: 'Why C needs prototypes, the order rule, and what actually happens when you call a function before defining it.',
      duration: 15,
      build: (b) => [
        b.md(`## A function has three parts

\`\`\`c
int add(int a, int b)   /* 1. the signature / declaration / prototype */
{                        /* 2. the definition: the body */
    return a + b;        /* 3. the return */
}
\`\`\`

- A **declaration** (prototype) says the function exists, its name, its return type and its parameter types. It ends with a semicolon.
- A **definition** provides the body. It ends with a brace.

\`\`\`c
int add(int a, int b);        /* declaration  */
int add(int a, int b) { return a + b; }   /* definition */
\`\`\`

## Why the order rule exists

In C, to call a function the compiler must know its return type and its parameter types *before* the call. That is it. C has no "look ahead and figure it out" for function bodies the way some languages do.

Historically this produced a restriction you still meet in old code: **a function must be declared or defined before it is used.** So this is an error:

\`\`\`c
int main(void)
{
    printf("%d\\n", add(2, 3));   /* ERROR: add is not declared yet */
    return 0;
}

int add(int a, int b) { return a + b; }
\`\`\`

Two solutions, and you need to know both.

**Solution 1: put a prototype before \`main\`.** This is what most single-file programs do.

\`\`\`c
#include <stdio.h>

int add(int a, int b);        /* the prototype */

int main(void)
{
    printf("%d\\n", add(2, 3));
    return 0;
}

int add(int a, int b)
{
    return a + b;
}
\`\`\`

**Solution 2: include a header.** This is what real multi-file programs do, and it is the correct answer for anything beyond a toy.

\`\`\`c
#include "math_utils.h"     /* contains: int add(int a, int b); */
\`\`\`

The header holds the declarations; the \`.c\` file holds the definitions. Callers include the header and never write a prototype by hand. This is covered properly in Module 14.

## Why the return type must be known first

\`\`\`c
/* imagine a function with no return type declared */

int result = mystery();   /* what type is result? */
\`\`\`

Before C99, if the compiler had not seen \`mystery\`, it assumed the return type was \`int\`. If \`mystery\` actually returned a \`double\`, the compiler read the wrong number of bytes off the stack and you got garbage. This is not a historical curiosity: it is why C99 made implicit declarations a constraint violation and C23 removed implicit \`int\` entirely.

The lesson generalises: **the compiler works with types, so every type must be available before the code that needs it.** The same reason drives header guards, forward declarations of structs, and \`extern\` on globals.

## Parameters are local copies

\`\`\`c
void increment(int n)
{
    n = n + 1;        /* this is the function's OWN n */
}

int main(void)
{
    int x = 5;
    increment(x);
    printf("%d\\n", x);   /* 5 — unchanged */
    return 0;
}
\`\`\`

This is covered in detail in the next lesson, but the reason is here: when you call a function, the arguments are **copied** into new objects owned by the callee. Assigning to a parameter changes the copy, and the copy disappears when the function returns.

## The return contract

\`\`\`c
int  find_index(int *data, int count, int target)   /* returns an int */
void log_message(const char *msg)                   /* returns nothing */
char *next_token(char *cursor)                      /* returns a pointer, or NULL */
\`\`\`

Three things to decide for every function:

1. **What does it return?** A value, \`void\`, or a pointer.
2. **What can go wrong, and how does the caller find out?** A sentinel value (\`-1\`, \`NULL\`), an out-parameter, or a return code.
3. **What does it do with its parameters?** Reads them, writes through them, or frees them. This must be documented, because in C the compiler cannot check it.

\`\`\`c
/* A well-designed function makes all three obvious from its signature. */
int  parse_int(const char *text, long *out);        /* returns 0 on success, -1 on failure */
void buffer_free(char *buf, size_t len);            /* takes ownership; document it */
size_t list_count(const List *list);                /* cannot fail */
\`\`\`

## Every path must return

\`\`\`c
/* BUG: no return on the second path */
int classify(int n)
{
    if (n < 0) return -1;
    if (n == 0) return 0;
    /* falls off the end */
}

/* correct */
int classify(int n)
{
    if (n < 0)      return -1;
    else if (n == 0) return 0;
    else             return 1;
}
\`\`\`

Falling off the end of a function that returns a value is **undefined behaviour**. The caller receives whatever happened to be in the return register. \`-Wall\` catches it as \`control reaches end of non-void function\`, but only if the path is visible; a call through a function pointer defeats the check.

\`main\` is the single exception: since C99, reaching the closing brace of \`main\` is equivalent to \`return 0;\`.

## Good decomposition

A function should do one thing that you can name. Some practical criteria:

| Smell | Fix |
| --- | --- |
| Longer than about 30 lines | Extract the distinct steps |
| More than 5 parameters | Bundle into a \`struct\` |
| Nested more than 3 deep | Return early instead |
| A comment block at the top longer than the code | The function is doing several things |
| The same three lines appear in five functions | That is a function you have not written yet |
| \`int\` used as a return type for something with many results | Use out-parameters, or return a \`struct\` |

\`\`\`c
/* A function whose name is a complete sentence is a function that is done. */
int  is_valid_email(const char *text);
void log_write(const char *path, const char *message, int append);
char *config_lookup(const char *key, char *fallback);
size_t ring_buffer_push(RingBuffer *rb, const uint8_t *data, size_t len);
\`\`\`

## \`static\` functions: private to the file

\`\`\`c
/* helpers.c */

static int clamp_to(int value, int lo, int hi)   /* not visible outside this file */
{
    if (value < lo) return lo;
    if (value > hi) return hi;
    return value;
}

int public_scale(int value)                      /* visible to the linker */
{
    return clamp_to(value * 2, 0, 100);
}
\`\`\`

Marking a function \`static\` means "this is an implementation detail of this translation unit." It gives the compiler permission to inline it freely, it prevents name collisions, and it documents intent. Use it for every function that is not part of your module's public API.

Module 12 covers the \`static inline\` header idiom that goes with this.`),
        b.tip(
          'Compile with -Wmissing-prototypes',
          'It warns when a non-static function has no prototype visible. That catches typos in function names and missing declarations in exactly the situations where the compiler would otherwise assume the wrong signature.',
        ),
        b.warn(
          'The declaration and the definition must match exactly',
          'If your header says `int process(char *buf, size_t n);` and the .c file says `int process(const char *buf, size_t n);`, that is not a warning you can ignore — they are different functions as far as the linker is concerned, and you get "undefined reference". Type them once in the header and never retype the signature.',
        ),
      ],
      questions: [
        [
          'Why must a function be declared before it is used?',
          [
            'For documentation only',
            'Because the compiler must know its return type and parameter types in order to check the call and generate correct code',
            'Because the linker cannot handle forward references',
            'It does not have to — modern C figures it out',
          ],
          1,
          'The call must type-check and generate the correct machine code, which needs the signature. Before C99 the compiler would assume int, and if that was wrong the caller read the wrong bytes.',
        ],
        [
          'What is the difference between a declaration and a definition?',
          [
            'A declaration provides the body, a definition does not',
            'A declaration introduces a name and its type; a definition also allocates storage (objects) or provides the body (functions)',
            'They are the same thing in different files',
            'Declarations are only for static functions',
          ],
          1,
          'extern marks a declaration, and a declaration in a header is a declaration. Only one definition per object or function may exist across the whole program.',
        ],
        [
          'A non-void function reaches its closing brace without a return. What is that?',
          [
            'It returns 0',
            'Undefined behaviour — the caller gets an indeterminate value',
            'A compile-time warning and nothing more',
            'It returns the last expression value',
          ],
          1,
          'The function has no defined return value. -Wall reports it as "control reaches end of non-void function". main is the one exception since C99.',
        ],
        [
          'What does `static` mean on a file-scope function?',
          [
            'Its value is preserved between calls',
            'Internal linkage: only code in this .c file can call it',
            'It cannot be called from other files, but it is still exported for linking',
            'It is faster',
          ],
          1,
          'At file scope, static restricts the name to the current translation unit. The function is private to the file, which lets the compiler inline it freely and prevents collisions.',
        ],
        [
          'You get "undefined reference to process" but process is defined in utils.c. What is wrong?',
          [
            'process is misspelled in the definition',
            'utils.o was not compiled or not passed to the linker',
            'The header is missing an include guard',
            'process must be static',
          ],
          1,
          'The declaration in the header satisfied the compiler. Only the linker collects definitions, so utils.o must be on the link line: gcc -o app main.c utils.c.',
        ],
      ],
    },
    {
      title: 'Pass by value: why your caller’s variable did not change',
      summary: 'The copy, the three ways to get a real change, and the ownership question every pointer parameter must answer.',
      duration: 16,
      build: (b) => [
        b.md(`## C has exactly one calling convention

Every argument is passed **by value**. There is no pass-by-reference in C, and there is no built-in way to pass "the variable itself". When you call a function, the arguments are evaluated and their values are copied into new objects that belong to the callee.

\`\`\`c
void try_to_change(int n)
{
    n = 999;              /* changes the copy */
}

int main(void)
{
    int x = 5;
    try_to_change(x);
    printf("%d\\n", x);   /* 5. The copy died with the function. */
    return 0;
}
\`\`\`

This is the single most surprising thing for anyone arriving from a language with reference parameters. It is also, once you understand it, the reason C is fast: copying a small value onto the stack is cheaper than any indirection scheme.

## The three ways to actually change the caller's variable

### 1. Return a new value

The clearest, and the right answer more often than people expect.

\`\`\`c
int add(int a, int b) { return a + b; }

x = add(x, 10);
\`\`\`

### 2. Pass a pointer

\`\`\`c
void increment(int *p)
{
    *p = *p + 1;         /* the * dereferences: this is the caller's object */
}

int x = 5;
increment(&x);
printf("%d\\n", x);      /* 6 */
\`\`\`

The function cannot change \`p\` itself (it is a copy), but \`*p\` refers to the caller's object, and writing through it works.

### 3. Pass a pointer to a pointer, when you need to change the pointer itself

\`\`\`c
void set_to_ten(int **pp)
{
    *pp = 10;            /* change the caller's pointer */
}

int x = 1, y = 2;
int *p = &x;
set_to_ten(&p);          /* p now points at y */
printf("%d\\n", *p);     /* 10 */
\`\`\`

This is used in real code — \`strtok\`, \`getopt\`, and most \`char **\`-returning APIs work this way — but it is one level of indirection harder to read. Consider returning a pointer instead before reaching for it.

## Read the pointer declaration right to left

\`\`\`c
int  *p;      /* p is a pointer to int           */
int  *p[10];  /* p is an array of 10 pointers to int  */
int  (*p)[10];/* p is a pointer to an array of 10 int  */
int  *p(void);/* p is a function returning a pointer to int */
int  (*p)(int);/* p is a pointer to a function taking int, returning int */
\`\`\`

The technique: start at the name and read outward. \`*\` means "pointer to", \`[]\` means "array of", \`()\` means "function returning". Parentheses are what let you say "pointer to an array" rather than "array of pointers".

## Const on a pointer parameter: two meanings, both useful

\`\`\`c
void print_all(const char *text);         /* the caller owns it; you will not modify it */
void fill(char *buffer, size_t len);       /* you WILL write to it */
void lock(const Lock *l);                  /* const applies to the Lock, not the pointer */
\`\`\`

Putting \`const\` on the pointed-to type is a promise to the caller, and it lets the compiler skip aliasing checks. It costs nothing and documents intent:

\`\`\`c
size_t copy_name(char *dest, const char *src, size_t dest_size)
{
    /* dest is written; src is only read. The signature says so. */
}
\`\`\`

## The ownership question, and why nobody can check it for you

A function taking \`char *\` might read it, write to it, free it, or store it somewhere that outlives the call. The compiler cannot tell which. **You must document it, every time.**

\`\`\`c
/* A real allocator, with ownership documented in the comment. */

/* Returns a newly allocated buffer the CALLER must free(), or NULL.
 * Does not take ownership of anything. */
char *buffer_create(size_t len);

/* Frees a buffer previously returned by buffer_create().
 * Sets *out to NULL so the caller cannot accidentally use it again.
 * Does nothing if out is NULL. Safe to call twice. */
void buffer_free(char **out);
\`\`\`

The \`char **\` in \`buffer_free\` is a deliberate choice: taking the address lets the function null out the caller's pointer, which turns a use-after-free into a null-dereference. Both crash, but only one of them is easy to diagnose.

This is a real source of C bugs and there is no language-level fix. \`const\` helps, comments help, and consistent conventions help. C simply does not have a borrow checker, and it never will without a different language.

## Arrays as parameters: an important special case

\`\`\`c
void print_array(int arr[], int len)   /* arr[] is a PARAMETER, not an array */
{
    printf("%zu\\n", sizeof arr);      /* 8, not the array size! */
}

void print_array(int arr[], int len)   /* explicit and better */
{
    printf("%zu\\n", sizeof arr);      /* still 8 — see below */
}
\`\`\`

When an array is passed to a function, it is **decayed to a pointer to its first element**. The function receives a pointer, not an array. So:

- \`sizeof arr\` inside the function is the size of a *pointer*, not the array.
- The function cannot know how many elements there are.
- Therefore **you must pass the length separately.**

\`\`\`c
void fill(int arr[], int len, int value)   /* correct: length passed explicitly */
{
    for (int i = 0; i < len; i++) arr[i] = value;
}

int main(void)
{
    int data[5];
    fill(data, 5, 0);      /* data decays to &data[0]; 5 is required */
    return 0;
}
\`\`\`

The compiler will warn about \`fill(data)\` if \`len\` has no default, and \`-Warray-parameter\` (GCC 11+, Clang) warns about the mismatch between \`int arr[]\` and \`int arr[5]\` in the declaration. This one subject — array decay — is the bridge to pointers in Module 9, and it is worth sitting with until it is completely clear.`),
        b.anim('passing', {
          title: 'Pass by value vs pass by pointer',
          badge: 'side by side',
          steps: [
            {
              caption: 'The caller has x = 5. On the left, the value is copied in. On the right, the address is copied in.',
              note: 'The left function gets a value. The right gets an address it can write through. Everything that follows is a consequence of that one difference.',
              panes: [
                {
                  title: 'By value',
                  sub: 'void f(int n)',
                  call: 'f(x);',
                  cells: [{ label: "caller's x", value: '5', tone: 'int' }, { label: "f's copy of n", value: '5', tone: 'int' }],
                },
                {
                  title: 'By pointer',
                  sub: 'void f(int *p)',
                  call: 'f(&x);',
                  cells: [{ label: "caller's x", value: '5', tone: 'int' }, { label: "f's copy of p", value: '&x', tone: 'ptr' }],
                },
              ],
            },
            {
              caption: 'Inside f, `n = 999;` assigns to the copy. The caller’s x is a different object in a different place.',
              note: 'Two objects, same value, unrelated. This is why the change is lost.',
              panes: [
                {
                  title: 'By value',
                  sub: 'n = 999;',
                  cells: [{ label: "caller's x", value: '5', tone: 'int' }, { label: "n (the copy)", value: '999', tone: 'bad' }],
                },
                {
                  title: 'By pointer',
                  sub: 'p is a copy of &x',
                  cells: [{ label: "caller's x", value: '5', tone: 'int' }, { label: "p (the copy)", value: '&x', tone: 'ptr' }],
                },
              ],
            },
            {
              caption: 'Now the right-hand function does `*p = 999;`. The * dereferences, so it writes to the object the address points at.',
              note: 'The pointer p is still a copy — the function still cannot change which address p holds. It can only change what that address points to.',
              panes: [
                {
                  title: 'By value',
                  sub: '(nothing)',
                  cells: [{ label: "caller's x", value: '5', tone: 'int' }],
                },
                {
                  title: 'By pointer',
                  sub: '*p = 999;',
                  cells: [{ label: "caller's x", value: '999', tone: 'ok' }, { label: 'p (the copy)', value: '&x', tone: 'ptr' }],
                },
              ],
            },
            {
              caption: 'When f returns, the copies are gone. On the left nothing survives. On the right the caller’s x is 999.',
              panes: [
                {
                  title: 'By value',
                  sub: 'after return',
                  cells: [{ label: "caller's x", value: '5', tone: 'int' }],
                },
                {
                  title: 'By pointer',
                  sub: 'after return',
                  cells: [{ label: "caller's x", value: '999', tone: 'ok' }],
                },
              ],
            },
          ],
        }),
        b.lead('Choosing the right approach'),
        b.table(
          'What to pass, and how',
          ['What the function needs', 'Pass as', 'Signature'],
          [
            ['Only to read a value', 'the value', 'int n'],
            ['To modify a value', 'a pointer to it', 'int *p'],
            ['To modify which pointer the caller holds', 'a pointer to the pointer', 'int **pp'],
            ['To read an array', 'a pointer to the first element, plus the length', 'const int arr[], size_t len'],
            ['To modify an array', 'a pointer, plus the length', 'int arr[], size_t len'],
            ['A struct to read', 'the struct (a copy)', 'const Point p'],
            ['A large struct to read', 'a pointer to const', 'const Point *p'],
            ['A struct to modify', 'a pointer', 'Point *p'],
            ['Memory it will keep', 'a pointer, and document ownership', 'char *buf  /* caller frees */'],
          ]
        ),
        b.tip(
          'The const-says-what-you-wont-do rule',
          'If your function does not modify what a pointer points to, write `const T *p`. It is a promise to every future caller, it is checked by the compiler on their side, and it often lets the compiler generate better code because it knows the function cannot write through that pointer.',
        ),
        b.warn(
          'sizeof on a parameter is the size of a pointer',
          '`void f(int arr[])` receives a pointer, so `sizeof arr` inside f is 8 (or 4) — the size of a pointer, not the array. Every C programmer gets this wrong once. The array only exists in the caller’s frame. If you need the count, pass it, and take `size_t` rather than `int`.',
        ),
      ],
      questions: [
        [
          'In C, arguments are passed...',
          ['by reference, like C++', 'by value, always', 'by value for small types and by reference for large ones', 'by pointer if they are declared as pointers'],
          1,
          'Always by value. Passing a pointer is not a different calling convention; it is passing a value that happens to be an address, which the callee can then dereference.',
        ],
        [
          'Why does `sizeof arr` inside `void f(int arr[])` give 8 rather than the array size?',
          [
            'Because sizeof is broken for arrays',
            'Because a parameter declared as an array is actually a pointer parameter — the array decays',
            'Because the function does not know the size',
            'Because arrays are always 8 bytes',
          ],
          1,
          'Array parameters are pointer parameters. The function has no idea how many elements there are, which is why you must pass the length.',
        ],
        [
          'What is the correct meaning of `int (*p)[10];`?',
          [
            'An array of 10 pointers to int',
            'A pointer to an array of 10 ints',
            'An array of 10 arrays of int',
            'A function taking 10 ints',
          ],
          1,
          'Read from the name outward: p is a pointer, to an array, of 10 ints. Without the parentheses, int *p[10] would be an array of 10 pointers.',
        ],
        [
          'Why should a function that only reads a char buffer take `const char *` rather than `char *`?',
          [
            'To make it faster',
            'To document that the function will not modify the caller’s data, and to let the compiler skip aliasing checks',
            'Because char * is deprecated',
            'So that the caller can pass a string literal',
          ],
          1,
          'It is a promise the compiler can verify at the call site, it costs nothing, and it lets the optimiser assume the function does not write through that pointer.',
        ],
        [
          'A function returns a malloc’d buffer. What must the documentation say?',
          [
            'Nothing, that is obvious',
            'That the caller owns it and must free() it, and that the function does not free anything it was given',
            'That the buffer is static',
            'That the function also takes ownership of its arguments',
          ],
          1,
          'C has no ownership tracking. Every pointer parameter crosses a function boundary carrying an implicit ownership question, and the only mechanism is documentation plus consistent conventions.',
        ],
      ],
    },
    {
      title: 'Recursion and the call stack',
      summary: 'Base case, the recursive case, what actually happens in memory, and when recursion is the wrong tool.',
      duration: 18,
      build: (b) => [
        b.md(`## A recursive function calls itself

\`\`\`c
unsigned long long factorial(unsigned int n)
{
    if (n <= 1) return 1;              /* the BASE CASE */
    return n * factorial(n - 1);       /* the RECURSIVE CASE */
}
\`\`\`

Every correct recursive function has two parts: a case where it stops, and a case where it gets closer to stopping. A function with a recursive case and no base case runs until the stack is exhausted.

## What is actually happening

Each call to \`factorial\` creates its own **stack frame** holding:

- the parameters (\`n\`)
- the local variables
- a **return address**: where in the caller to resume
- the saved frame pointer

The frames pile up. When the innermost call hits the base case and returns, its frame is discarded, a value is returned to its caller, that caller's frame is discarded, and so on back up. Five nested frames for \`factorial(5)\`.

\`\`\`c
factorial(5)
└──  n = 5, needs 5 * factorial(4)
    └──  n = 4, needs 4 * factorial(3)
        └──  n = 3, needs 3 * factorial(2)
            └──  n = 2, needs 2 * factorial(1)
                └──  n = 1, base case — returns 1
    ← returns 2 * 1 = 2
    ← returns 3 * 2 = 6
    ← returns 4 * 6 = 24
    ← returns 5 * 24 = 120
\`\`\`

## The two things that go wrong

**1. No base case, or an unreachable one.** The function recurses until the stack overflows. On most systems that is a segmentation fault, not a catchable error.

**2. A base case that is not reached.** A subtle version:

\`\`\`c
/* BUG for n = 0: factorial(-1), factorial(-2), ... forever */
unsigned long long factorial(int n)
{
    if (n == 0) return 1;
    return n * factorial(n - 1);
}
\`\`\`

\`factorial(0)\` recurses to \`factorial(-1)\`, which is not 0, which recurses to \`factorial(-2)\`, and the \`int\` underflows after 2 billion calls — or the stack runs out first.

**Test the base case the way the recursion decreases, not the way you expect the input.** \`n <= 1\` is correct; \`n == 0\` is not, because the recursive call uses \`n - 1\` and the domain includes negatives. This is a real and common bug.

## Recursion costs stack, and there is not much of it

A typical thread's stack is 1–8 MB. Each frame of \`factorial\` uses maybe 32 bytes, so a few hundred thousand levels. But a function with a large local array can use kilobytes per frame:

\`\`\`c
int process(int depth)
{
    char buffer[64 * 1024];   /* 64 KB per frame */
    return process(depth + 1);
}
/* ~100 frames and you are out of stack */
\`\`\`

This matters on embedded systems, where the stack might be 2 KB total, and it is a genuine argument against recursion there.

## Tail recursion, and why C does not optimise it

A tail call is a return statement that is the last thing the function does:

\`\`\`c
int loop(int n, int acc)
{
    if (n == 0) return acc;
    return loop(n - 1, acc * n);      /* a tail call */
}
\`\`\`

In theory a tail call can reuse the caller's frame, turning recursion into a loop with no stack growth. C is specified such that a compiler *may* do this, and a good one will. You cannot rely on it. Check with \`-Wtail-call-optimization\` if it matters, or just write the loop.

## When recursion is the right tool

Recursion is genuinely better than iteration when:

- **The data is recursive.** Trees, linked lists, JSON, XML, file systems, expression parsers, directory trees. A tree is defined recursively, so the natural traversal is recursive, and the iterative version requires an explicit stack.
- **The problem is defined recursively.** Factorials, Fibonacci, permutations, quicksort, the Tower of Hanoi, flood fill, maze solving.
- **The base case and recursive case are symmetric.** If they are asymmetric, iteration is probably clearer.

Recursion is the wrong tool when:

- The problem is a flat sequence (use a loop).
- The data is an array and the operation is "do the same thing to each element".
- You are worried about stack depth.
- You are on an embedded target with a small stack.

## Trees: where recursion earns its keep

\`\`\`c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct Node {
    int value;
    struct Node *left;
    struct Node *right;
} Node;

Node *node_create(int value)
{
    Node *n = malloc(sizeof *n);
    if (n == NULL) return NULL;
    n->value  = value;
    n->left   = NULL;
    n->right  = NULL;
    return n;
}

void tree_print(const Node *root, int depth)
{
    if (root == NULL) return;              /* base case: no tree */
    tree_print(root->right, depth + 1);    /* recurse right */
    for (int i = 0; i < depth; i++) printf("  ");
    printf("%d\\n", root->value);
    tree_print(root->left, depth + 1);     /* recurse left */
}

void tree_free(Node *root)
{
    if (root == NULL) return;
    tree_free(root->left);
    tree_free(root->right);
    free(root);
}
\`\`\`

\`tree_print\` is five lines and handles a million-node tree. The iterative version needs an explicit stack of nodes, a loop, and careful handling of the traversal order. This is the argument for recursion in one example.

\`tree_free\` is a pattern worth memorising: **free the children, then the node.** In the opposite order the children would be read after \`free\` had already released the parent, which is exactly the use-after-free that Module 10 covers.

## Mutual recursion

Two functions that call each other, terminating on different conditions:

\`\`\`c
static int is_even(int n);
static int is_odd(int n);

static int is_even(int n)
{
    if (n == 0) return 1;
    return is_odd(n - 1);
}

static int is_odd(int n)
{
    if (n == 0) return 0;
    return is_even(n - 1);
}
\`\`\`

Legal, and a genuine hazard: each must forward-declare the other, and a mistake in either base case produces an infinite mutual recursion. \`gcc -fstack-usage\` will tell you the frame size so you can reason about the depth.`),
        b.anim('callstack', {
          title: 'factorial(5), frame by frame',
          badge: 'the stack, live',
          steps: [
            {
              caption: 'Empty stack. Nothing has been called yet.',
              frames: [],
            },
            {
              caption: 'main calls factorial(5). A frame is pushed holding the argument and the return address.',
              note: 'The return address is what lets the CPU know to come back to main. It is why the stack is LIFO: the last thing pushed is the first thing returned to.',
              frames: [{ fn: 'factorial', args: '5', locals: ['n = 5'], line: 'main.c:42' }],
            },
            {
              caption: 'n = 5 is not <= 1, so it calls factorial(4). A second frame is pushed on top.',
              frames: [
                { fn: 'factorial', args: '5', locals: ['n = 5'], line: 'main.c:42' },
                { fn: 'factorial', args: '4', locals: ['n = 4'], line: 'factorial.c:6' },
              ],
            },
            {
              caption: 'Three deep. Each frame is a completely separate copy of n — the recursive call gets its own.',
              note: 'This is why the function works: the 4 lives in its own frame and is not disturbed while the 5 sits below it. Variables do not overwrite each other because each call has its own storage.',
              frames: [
                { fn: 'factorial', args: '5', locals: ['n = 5'], line: 'main.c:42' },
                { fn: 'factorial', args: '4', locals: ['n = 4'], line: 'factorial.c:6' },
                { fn: 'factorial', args: '3', locals: ['n = 3'], line: 'factorial.c:6' },
              ],
            },
            {
              caption: 'Four and five deep. The base case is next.',
              frames: [
                { fn: 'factorial', args: '5', locals: ['n = 5'] },
                { fn: 'factorial', args: '4', locals: ['n = 4'] },
                { fn: 'factorial', args: '3', locals: ['n = 3'] },
                { fn: 'factorial', args: '2', locals: ['n = 2'] },
                { fn: 'factorial', args: '1', locals: ['n = 1'] },
              ],
            },
            {
              caption: 'n = 1 hits the base case and returns 1. The frame is popped, and 1 is handed back to the caller.',
              note: 'A return is a pop plus a value. The frame, its locals and its return address all stop existing — which is why returning a pointer to a local is a dangling pointer.',
              frames: [
                { fn: 'factorial', args: '5', locals: ['n = 5'] },
                { fn: 'factorial', args: '4', locals: ['n = 4'] },
                { fn: 'factorial', args: '3', locals: ['n = 3'] },
                { fn: 'factorial', args: '2', locals: ['n = 2'], phase: 'returning' },
              ],
            },
            {
              caption: 'Unwinding. Each frame returns to its caller, which resumes at the return address stored when it was called.',
              frames: [
                { fn: 'factorial', args: '5', locals: ['n = 5'] },
                { fn: 'factorial', args: '4', locals: ['n = 4'], line: 'returns 4 * 6 = 24', phase: 'returning' },
              ],
            },
            {
              caption: 'One frame left. It computes 5 * 24 = 120 and returns to main.',
              frames: [{ fn: 'factorial', args: '5', locals: ['returns 120'], phase: 'returning' }],
            },
            {
              caption: 'The stack is empty again and main has its answer. Six frames were used at peak depth.',
              note: 'Six frames of ~32 bytes is about 200 bytes of stack for a five-deep recursion. Factorially, n = 100000 would use a few megabytes — which is why iterative factorial is preferred in real code.',
              frames: [],
            },
          ],
        }),
        b.anim('nodes', {
          title: 'Freeing a tree, in the right order',
          badge: 'watch the order',
          steps: [
            {
              caption: 'A three-node tree. root has two children, and the left child has one of its own.',
              tail: 'root',
              nodes: [
                { id: 'n1', data: '10', note: 'root', tone: 'int' },
                { id: 'n2', data: '5', note: 'left', tone: 'int' },
                { id: 'n3', data: '15', note: 'right', tone: 'int' },
              ],
            },
            {
              caption: 'tree_free(root): recurse into root->left first.',
              nodes: [
                { id: 'n1', data: '10', note: 'root', tone: 'int' },
                { id: 'n2', data: '5', note: 'left — being freed', tone: 'warn' },
                { id: 'n3', data: '15', note: 'right', tone: 'int' },
              ],
            },
            {
              caption: 'Left has no children, so it is freed. It is gone.',
              note: 'The recursion returns, and control comes back to the frame for n1.',
              freeList: ['5 (left)'],
              nodes: [
                { id: 'n1', data: '10', note: 'root', tone: 'int' },
                { id: 'n3', data: '15', note: 'right', tone: 'int' },
              ],
            },
            {
              caption: 'Now recurse into root->right, then free root itself.',
              freeList: ['5 (left)'],
              nodes: [
                { id: 'n1', data: '10', note: 'root — being freed', tone: 'warn' },
                { id: 'n3', data: '15', note: 'right — freed', tone: 'int' },
              ],
            },
            {
              caption: 'Empty. Every node was freed exactly once.',
              note: 'The order matters: free the children BEFORE the parent. If you freed root first and then touched root->left, that is a use-after-free — reading a pointer to memory that has been returned to the allocator.',
              freeList: ['5 (left)', '10 (root)', '15 (right)'],
              nodes: [],
            },
          ],
        }),
        b.warn(
          'Never return the address of a local',
          'A local variable lives in the current stack frame. When the function returns, that frame is reused by the next call. Any pointer you returned to it is now dangling. This is not a rare edge case — it is the single most common way beginners produce a "works until the next function call, then garbage" bug. The compiler can catch it with -Wreturn-local-addr.',
        ),
        b.tip(
          'Use a loop when the data is flat, recursion when it is a tree',
          'The test is simple: if the structure has a fixed number of levels and you can say "for each element" in one sentence, use a loop. If the structure contains itself — trees, lists, nested expressions, nested directories — recursion will be shorter and clearer than anything you can write with an explicit stack.',
        ),
      ],
      questions: [
        [
          'What is missing from this factorial? int f(int n) { if (n == 0) return 1; return n * f(n - 1); }',
          [
            'A semicolon',
            'The base case is unreachable for negative n, so f(0) recurses to f(-1) and underflows forever',
            'It is correct',
            'It needs unsigned, not int',
          ],
          1,
          'The recursive case uses n - 1, so the domain includes negatives, and n == 0 is never true for them. `if (n <= 1)` is the correct base case for this shape of function.',
        ],
        [
          'What does each recursive call get in its own copy?',
          [
            'Nothing — all frames share the same variables',
            'Its own stack frame with its own copy of the parameters and locals',
            'A single global copy',
            'Nothing; recursion has no memory cost',
          ],
          1,
          'Every call pushes a new frame containing its own parameters, locals and return address. That is why the calls do not interfere with each other, and why deep recursion consumes stack.',
        ],
        [
          'Why must you not return the address of a local variable?',
          [
            'It is slow',
            'The stack frame is released on return and reused, so the pointer dangles',
            'Locals have no addresses',
            'It only works for static variables',
          ],
          1,
          'The frame disappears when the function returns. Any pointer into it is dangling the moment control leaves — the memory may look intact until the next call overwrites it, which is what makes the bug intermittent.',
        ],
        [
          'Which of these is a good reason to use recursion?',
          [
            'It is always faster than a loop',
            'The data is itself recursive, such as a tree or a nested expression',
            'It uses less memory',
            'C requires it for some operations',
          ],
          1,
          'Recursion matches recursive data. For flat sequences a loop is both clearer and constant-space, and recursion costs stack proportional to depth.',
        ],
        [
          'What is the correct order to free a tree?',
          [
            'Free the node, then its children',
            'Free the children recursively, then the node',
            'Free the root, then walk again',
            'It does not matter',
          ],
          1,
          'Children first. Freeing the parent first and then reading node->left is a use-after-free, because the parent’s memory has already been returned to the allocator.',
        ],
      ],
    },
    {
      title: 'Function pointers and callbacks',
      summary: 'The one place C supports polymorphism, and why it matters for interfaces, dispatch tables and testability.',
      duration: 16,
      build: (b) => [
        b.md(`## A function has an address too

\`\`\`c
int add(int a, int b) { return a + b; }

int (*op)(int, int) = add;    /* op is a pointer to a function */
printf("%d\\n", op(2, 3));    /* 5 — op(2,3) is add(2,3) */
printf("%d\\n", (*op)(2, 3)); /* 5 — the same thing, explicitly */
printf("%d\\n", (**op)(2,3)); /* still 5 — it happens to work */
\`\`\`

## Reading the declaration

\`\`\`c
int  (*compare)(const void *, const void *);
\`\`\`

Right to left from the name: \`compare\` is a pointer, to a function, taking two \`const void *\` and returning \`int\`.

## \`(*name)(args)\` versus \`name(args)\`

The parentheses around \`*name\` are not optional in a declaration. Without them:

\`\`\`c
int *op(int, int);   /* a FUNCTION returning int*  */
int (*op)(int, int); /* a POINTER to a function returning int */
\`\`\`

This is the same \`[]\`-decay idea as arrays, and it is the one place C's declarator syntax genuinely hurts readability. The habit that fixes it: **always parenthesise, always, even when you can be sure.** \`int (*op)(int, int)\` is never wrong.

## \`void *\` parameters: the generic function type

There is no generics in C, so libraries that must work with any type use \`void *\` plus a size, and cast back:

\`\`\`c
/* the signature qsort requires */
int cmp_int(const void *a, const void *b)
{
    int ia = *(const int *)a;
    int ib = *(const int *)b;
    return (ia > ib) - (ia < ib);   /* -1, 0 or 1 */
}

int data[6] = {5, 3, 9, 1, 7, 2};
qsort(data, 6, sizeof data[0], cmp_int);
\`\`\`

The cast \`*(const int *)a\` is a promise: *you* know the array holds \`int\`. \`qsort\` does not check, and cannot. \`const\` on the parameter promises you will not modify the data.

Note the comparison idiom \`(ia > ib) - (ia < ib)\`: in C, \`true\` is 1 and \`false\` is 0, so subtracting two booleans gives exactly \`-1\`, \`0\` or \`1\`. It is a dense but standard piece of C.

## Callbacks: passing behaviour into a function

This is where function pointers pay for themselves. A function that takes a function pointer can apply whatever logic you give it:

\`\`\`c
/* A generic map over an array. It does not know what type it holds —
   it just calls your function on each element. */
void array_map_int(int *data, size_t count, int (*fn)(int))
{
    for (size_t i = 0; i < count; i++) {
        data[i] = fn(data[i]);
    }
}

int double_it(int v)   { return v * 2; }
int negate_it(int v)   { return -v; }
int square_it(int v)   { return v * v; }

int main(void)
{
    int data[4] = {1, 2, 3, 4};

    array_map_int(data, 4, double_it);
    /* data is now {2, 4, 6, 8} */

    array_map_int(data, 4, square_it);
    /* data is now {4, 16, 36, 64} */
    return 0;
}
\`\`\`

One function, three behaviours, no \`if\` anywhere and no \`switch\` on a "mode" enum. This is the C answer to polymorphism, and it is a good one.

## Dispatch tables: the \`switch\` that is data

\`\`\`c
typedef enum { OP_ADD, OP_SUB, OP_MUL, OP_DIV, OP_COUNT } OpKind;

typedef struct {
    const char *name;
    int  (*apply)(int, int);
    const char *symbol;
} Operation;

static int op_add(int a, int b) { return a + b; }
static int op_sub(int a, int b) { return a - b; }
static int op_mul(int a, int b) { return a * b; }
static int op_div(int a, int b) { return b == 0 ? 0 : a / b; }

static const Operation operations[OP_COUNT] = {
    { "add", op_add, "+" },
    { "sub", op_sub, "-" },
    { "mul", op_mul, "*" },
    { "div", op_div, "/" },
};

void run(const char *op_name, int a, int b)
{
    for (int i = 0; i < OP_COUNT; i++) {
        if (strcmp(operations[i].name, op_name) == 0) {
            printf("%d %s %d = %d\\n", a, operations[i].symbol, b, operations[i].apply(a, b));
            return;
        }
    }
    fprintf(stderr, "Unknown operation: %s\\n", op_name);
}
\`\`\`

This is a very common and very good C pattern: an array of structs, each holding a name and a function pointer. Adding an operation means adding one function and one array row. No \`switch\` to edit, no \`else if\` chain, and the compiler checks that every row has the right signature.

## Where function pointers genuinely earn their keep

| Use | Example |
| --- | --- |
| \`qsort\` and \`bsearch\` | Comparison callbacks over generic data |
| \`pthread_create\` | The thread's entry point |
| \`signal\` / \`atexit\` | Handlers to call on an event |
| \`opendir\` | \`readdir\` callbacks on some systems |
| GUI and event loops | One handler per event type |
| Object-oriented C | A vtable is an array of function pointers |
| Test doubles | Swapping in a stub for a real dependency |
| State machines | One handler per state |

The last one — replacing a \`switch\` in a state machine with a table of handlers — is a standard refactor that makes adding a state a one-line change instead of a four-line one.

## \`typedef\` to make signatures readable

\`\`\`c
typedef int (*CompareFn)(const void *, const void *);
typedef void (*EventHandler)(int event, void *data);

CompareFn    cmp = cmp_int;
EventHandler on_click = handle_click;
\`\`\`

Use \`typedef\` for function pointer types the moment a signature appears more than once. It turns a line of parentheses into something readable, and it gives the type a name you can put in a comment.

## The null function pointer

\`\`\`c
int (*fp)(int, int) = NULL;

if (fp != NULL) {
    fp(1, 2);       /* safe */
}
/* fp(1, 2) with a NULL fp is undefined behaviour — a jump to address 0 */
\`\`\`

Always check before calling. \`qsort\` returning \`void\` with a \`NULL\` comparison function is a guaranteed crash, and it is a mistake people make exactly once.`),
        b.code(
          `/* A tiny expression evaluator, built on a table of operations.
   This is the pattern that turns C code from a pile of if-statements
   into something extensible. */

#include <stdio.h>
#include <string.h>
#include <stdlib.h>

typedef double (*BinaryOp)(double, double);

static double op_add(double a, double b) { return a + b; }
static double op_sub(double a, double b) { return a - b; }
static double op_mul(double a, double b) { return a * b; }
static double op_div(double a, double b) { return b == 0.0 ? 0.0 : a / b; }

typedef struct {
    const char *symbol;
    BinaryOp    apply;
    int         precedence;
} Operation;

static const Operation ops[] = {
    { "+", op_add, 1 },
    { "-", op_sub, 1 },
    { "*", op_mul, 2 },
    { "/", op_div, 2 },
};

#define OP_COUNT ((int)(sizeof ops / sizeof ops[0]))

static const Operation *find_op(const char *token)
{
    for (int i = 0; i < OP_COUNT; i++) {
        if (strcmp(ops[i].symbol, token) == 0) return &ops[i];
    }
    return NULL;
}

int main(void)
{
    /* Adding a new operator is: one function + one table row. */
    /* No switch to edit, no else-if chain, and the compiler checks
       that the signature matches. */

    const char *expression = "3 + 4 * 2";
    double lhs = 3.0;
    const char *op_token = "+";
    const char *rhs_token = "4";
    const char *second_op = "*";
    double rhs = 4.0;
    double second_rhs = 2.0;

    const Operation *op1 = find_op(op_token);
    const Operation *op2 = find_op(second_op);

    if (op1 == NULL || op2 == NULL) {
        fprintf(stderr, "Unknown operator in \\"%s\\"\\n", expression);
        return 1;
    }

    double inner = op2->apply(rhs, second_rhs);      /* 4 * 2 = 8 */
    double result = op1->apply(lhs, inner);           /* 3 + 8 = 11 */

    printf("%s = %g\\n", expression, result);
    printf("note: * has precedence %d, + has %d, so * is applied first\\n",
           op2->precedence, op1->precedence);
    return 0;
}
`,
          'dispatch_table.c'
        ),
        b.tip(
          'The three real uses of function pointers',
          'Callbacks (pass behaviour in), dispatch tables (choose behaviour from data), and vtables (object-oriented C). The first two are everyday. The third is how every C library that pretends to have classes is actually built.',
        ),
        b.warn(
          'Calling through a null or dangling function pointer',
          'A function pointer that is NULL jumps to address 0. One that was returned by a function whose frame has gone jumps to freed stack memory. Both are crashes, and both are common enough that "is this pointer valid?" is a question worth asking every time you store one.',
        ),
      ],
      questions: [
        [
          'How do you declare a pointer to a function taking two ints and returning int?',
          [
            'int *func(int, int);',
            'int (*func)(int, int);',
            'int func*(int, int);',
            '(int*) func(int, int);',
          ],
          1,
          'Parentheses around the name make it a pointer to a function. Without them, int *func(int,int) declares a FUNCTION returning a pointer to int.',
        ],
        [
          'What is the point of taking `const void *` parameters in a qsort comparison function?',
          [
            'It makes the function faster',
            'It promises the function will not modify the data, and it lets qsort work with any type by casting back',
            'It is required for portability',
            'It avoids the need for a cast',
          ],
          1,
          'qsort is generic, so it deals in void*. Your function casts back to the real type. The const documents that comparison does not modify the data.',
        ],
        [
          'Why is a dispatch table of function pointers often better than a switch?',
          [
            'It is faster at runtime',
            'Adding an operation means one function and one array row, instead of editing a switch, and the compiler checks the signature',
            'Switches do not work with enums',
            'It uses less memory',
          ],
          1,
          'The maintenance win is the point. A switch needs a new case and a new function; a table needs a new function and one row. The compiler also verifies every row has the right signature.',
        ],
        [
          'What happens when you call a function pointer whose value is NULL?',
          [
            'It returns 0',
            'It is undefined behaviour — in practice a jump to address 0 and a crash',
            'The compiler inserts a runtime check',
            'It calls a default handler',
          ],
          1,
          'There is no runtime check. Always test a function pointer against NULL before calling it.',
        ],
        [
          'What does `(a > b) - (a < b)` produce?',
          [
            'A boolean',
            '-1 when a < b, 0 when equal, 1 when a > b',
            'The difference a - b',
            '1 or -1, non-deterministic order',
          ],
          1,
          'Both comparisons yield 0 or 1, so subtracting them gives exactly -1, 0 or 1 — the return convention qsort requires.',
        ],
      ],
    },
  ]
);
