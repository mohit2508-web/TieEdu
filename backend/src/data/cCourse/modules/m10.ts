// Module 10 — Dynamic memory.
// malloc/free, ownership, and the leak/overflow/double-free triad that defines
// what it means for C to be unsafe.

import { mod } from '../blocks';

export const M10 = mod(
  'crs-c-programming',
  'c-m10',
  10,
  'Module 10 — Dynamic memory',
  'The heap, malloc and friends, ownership rules, overflow, and the tools that find leaks.',
  [
    {
      title: 'The heap, and why it exists',
      summary: 'Automatic versus dynamic storage, and the one question that decides which you need.',
      duration: 16,
      build: (b) => [
        b.md(`## Three storage durations

C has three places a variable can live, and they differ in how long they last and who cleans up.

\`\`\`c
int global = 0;                 /* static storage duration — whole program */

void f(void)
{
    int local = 0;              /* automatic storage duration — until f returns */
    int *heap = malloc(sizeof *heap);   /* allocated storage — until you free it */
    /* ... */
    free(heap);
}
\`\`\`

| Duration | Lives | Size known | Freed by | Scope |
| --- | --- | --- | --- | --- |
| static | whole program | compile time | the OS at exit | file / function |
| automatic | until the block ends | compile time | the compiler | block |
| allocated | until \`free\` | runtime | you | anywhere the pointer reaches |

The distinguishing property of the heap is that **its size can be decided at runtime and its lifetime spans function calls**. That is the whole reason it exists.

## The one question

Before reaching for \`malloc\`, ask: **does the size need to be decided at run time, or does it need to outlive this function?**

- No to both → use an ordinary local, or a fixed array.
- Yes to either → use \`malloc\`.

Most first attempts at dynamic memory allocate something that could have been a local array, which adds a failure path and a leak path for nothing.

## The function family

\`\`\`c
#include <stdlib.h>

void *malloc(size_t bytes);                 /* uninitialised bytes */
void *calloc(size_t count, size_t size);    /* zeroed count*size bytes */
void *realloc(void *ptr, size_t new_bytes); /* resize, may move */
void  free(void *ptr);                       /* release */
\`\`\`

Each returns \`void *\`, which converts to any object pointer without a cast. On failure they return \`NULL\`.

## malloc

\`\`\`c
size_t count = 10;
int *values = malloc(count * sizeof *values);
if (values == NULL) {
    /* handle it — the allocation failed */
}
\`\`\`

Three rules that prevent the majority of dynamic-memory bugs:

1. **Check for \`NULL\` immediately.** A failed allocation dereferenced is a segfault at the first write.
2. **Use \`sizeof *pointer\`, not a hard-coded type.** If the type changes, the allocation follows. \`malloc(sizeof(int) * 10)\` is the version that breaks silently on an edit.
3. **Compute the byte count with overflow in mind.** \`count * sizeof *values\` overflows if \`count\` is enormous; see the \`calloc\` note below.

## calloc

\`\`\`c
int *values = calloc(10, sizeof *values);
if (values == NULL) { /* ... */ }
\`\`\`

\`calloc(n, size)\` allocates \`n * size\` bytes and sets them all to zero. Two differences from \`malloc\`:

- **Zeroed.** For the many data structures that assume a zeroed start (a hash table, a struct with counters, a linked list head), this removes a loop.
- **Overflow-checked by the implementation.** If \`n * size\` would overflow \`size_t\`, \`calloc\` returns \`NULL\`. The naive \`malloc(n * size)\` wraps around and allocates a tiny buffer, then your code writes past it. This alone is a reason to prefer \`calloc\` when multiplying.

## free

\`\`\`c
free(values);
values = NULL;      /* do this every time */
\`\`\`

\`free\` takes a pointer and releases the block. After that, the pointer is **dangling**: it still holds the address, but the memory is no longer yours. The one-line fix is \`values = NULL;\` immediately after, which turns the next accidental use into a clean crash rather than silent corruption.

## The four ways dynamic memory goes wrong

These four account for nearly every dynamic-memory bug in existence. Learn to name them and they stop being mysterious.

1. **Memory leak.** You allocate and never free. The program's memory usage grows. A long-running process eventually exhausts memory and is killed.
2. **Use after free.** You free, then read or write through a still-holding pointer. Undefined behaviour. It may appear to work, because the allocator has not yet reused the block.
3. **Double free.** You free the same pointer twice. The allocator's bookkeeping is corrupted, and the crash happens later, in a different allocation, far from the cause.
4. **Buffer overflow.** You write past the end of the block. This is how security bugs happen: it corrupts the adjacent allocation's metadata, and a careful attacker can turn that into code execution.

## One allocation, one free

The ownership rule that keeps this manageable: **every block has exactly one owner at a time, and that owner is responsible for the single \`free\`.**

\`\`\`c
int *make_buffer(size_t n)      /* the caller becomes the owner */
{
    int *p = malloc(n * sizeof *p);
    if (p == NULL) {
        return NULL;
    }
    return p;                   /* ownership transfers to the caller */
}

void use(void)
{
    int *buf = make_buffer(100);
    if (buf == NULL) {
        return;                 /* nothing to free — we never got it */
    }
    /* ... use buf ... */
    free(buf);                  /* the caller frees — the contract */
    buf = NULL;
}
\`\`\`

Document the contract in the comment. "Returns a new buffer; caller must free" is the sentence that prevents leaks across a team, and it is the convention behind every standard library function (see \`strdup\` below).

## strdup: the standard-library example

\`\`\`c
#include <string.h>

char *copy = strdup("hello");   /* POSIX / C23: mallocs and copies */
if (copy == NULL) { /* ... */ }
/* ... */
free(copy);
\`\`\`

\`strdup\` is one line of code (\`malloc(strlen(s)+1); memcpy\`), and it is the cleanest illustration of the ownership contract: it returns a pointer the caller owns. If you are targeting plain C99 and \`strdup\` is not available, write it — the exercise is three lines.

## Local versus heap: a worked comparison

\`\`\`c
/* Local. Size must be a compile-time constant (or a VLA). */
char buf[256];
read_line(buf, sizeof buf);
/* freed automatically at the end of the block */

/* Heap. Size from input, lifetime controlled. */
size_t n = get_needed_size();
char *buf = malloc(n + 1);
if (buf == NULL) {
    return -1;
}
read_line(buf, n + 1);
/* ... */
free(buf);
\`\`\`

The local version has no failure path and no way to leak. The heap version is what you must write the moment \`n\` is not known in advance or \`buf\` must be returned. Reach for the local first.

## A note on zero-length allocations

\`\`\`c
void *p = malloc(0);    /* legal; may return NULL or a unique pointer */
\`\`\`

\`malloc(0)\` is legal and implementation-defined in its result. It may return \`NULL\` or a unique non-null pointer that must still be passed to \`free\`. Do not write code whose correctness depends on which.

## The checklist for every allocation

- Decide the size, and check the multiplication for overflow (or use \`calloc\`).
- Call \`malloc\`/\`calloc\`/\`realloc\`, and **check for \`NULL\` before the first use**.
- Use the memory.
- \`free\` exactly once.
- Set the pointer to \`NULL\` immediately after freeing.
- Compile with \`-fsanitize=address\` while learning; it turns each of the four bugs above into a precise, immediate report.`),
        b.anim('stackheap', {
          title: 'Stack and heap are different regions',
          badge: 'address space',
          steps: [
            {
              caption:
                'Automatic variables live on the stack. When a function returns, its whole frame is popped and that memory is reused.',
              note: 'The stack is fast because allocation is just moving a pointer. Its limit is that a frame cannot outlive its function — which is exactly why a pointer to a local is a dangling pointer the moment the function returns.',
              stack: [
                { label: 'main frame', size: 2, tone: 'int' },
                { label: 'f() frame', size: 2, tone: 'char' },
              ],
            },
            {
              caption:
                'malloc carves a block out of the heap. The block has no scope — it lives until free is called.',
              note: 'That is the entire point of the heap: the lifetime is decided by you, not by the shape of the call graph.',
              stack: [
                { label: 'main frame', size: 2, tone: 'int' },
                { label: 'f() frame', size: 2, tone: 'char' },
              ],
              heap: [{ label: 'malloc(40)', size: 4, tone: 'int' }],
              highlight: 'heap',
            },
            {
              caption:
                'f() returns. Its stack frame is gone — but the heap block is untouched, because free has not been called.',
              note: 'A pointer returned from f remains valid. This is how functions return dynamically sized data: the data does not live in the frame.',
              stack: [{ label: 'main frame', size: 2, tone: 'int' }],
              heap: [{ label: 'malloc(40)', size: 4, tone: 'int' }],
              highlight: 'heap',
            },
            {
              caption: 'free releases the block. The heap slot is now available to the next malloc.',
              note: 'The pointer variable still holds the old address — it is now dangling. Setting it to NULL immediately is what keeps a later accidental use from reading reused memory.',
              stack: [{ label: 'main frame', size: 2, tone: 'int' }],
              heap: [{ label: 'free', size: 4, tone: 'bad' }],
              highlight: 'gap',
            },
            {
              caption:
                'Forget the free and the block is leaked: unreachable but still reserved, for the life of the process.',
              note: 'A leak is not a crash, which is why it survives review. In a web server handling requests, a leak of a few kilobytes per request becomes gigabytes per day.',
              stack: [{ label: 'main frame', size: 2, tone: 'int' }],
              heap: [{ label: 'leaked', size: 4, tone: 'bad' }],
              highlight: 'heap',
            },
          ],
        }),
        b.code(
          `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stddef.h>

/* Ownership contract: returns a new buffer the CALLER must free,
 * or NULL on failure. */
static int *make_buffer(size_t n)
{
    int *p = malloc(n * sizeof *p);   /* sizeof *p, not sizeof(int) */
    if (p == NULL) {
        return NULL;
    }
    return p;
}

/* Our own strdup, for targets without it. */
static char *duplicate(const char *s)
{
    size_t len = strlen(s) + 1;       /* +1 for the terminator */
    char *copy = malloc(len);
    if (copy == NULL) {
        return NULL;
    }
    memcpy(copy, s, len);
    return copy;
}

int main(void)
{
    int *values = make_buffer(10);
    if (values == NULL) {
        fprintf(stderr, "out of memory\\n");
        return 1;
    }
    for (size_t i = 0; i < 10; i++) {
        values[i] = (int)(i * i);
    }
    printf("values[9] = %d\\n", values[9]);

    free(values);
    values = NULL;                    /* the line that prevents use-after-free */

    /* calloc zeroes, and checks the multiplication for overflow. */
    int *zeroed = calloc(10, sizeof *zeroed);
    if (zeroed == NULL) {
        return 1;
    }
    printf("zeroed[3] = %d\\n", zeroed[3]);   /* 0 */
    free(zeroed);

    char *text = duplicate("owned by the caller");
    if (text == NULL) {
        return 1;
    }
    printf("%s\\n", text);
    free(text);

    return 0;
}
`,
          'dynamic_memory.c'
        ),
        b.table(
          'The four dynamic-memory bugs',
          ['Bug', 'What happens', 'Detection', 'Prevention'],
          [
            ['Leak', 'Block never freed; memory grows', 'Valgrind; ASan leak check', 'One owner, free in the same file'],
            ['Use after free', 'Read/write through a freed pointer', 'ASan, with an exact stack trace', 'Set the pointer to NULL after free'],
            ['Double free', 'Allocator corruption; late crash', 'ASan, at the second free', 'NULL after free; one owner'],
            ['Buffer overflow', 'Writes past the block, corrupts metadata', 'ASan, immediately', 'Track the length; bounds-check every write'],
          ]
        ),
        b.warn(
          'Never cast the result of malloc',
          'int *p = (int *)malloc(n); compiles in C, and in C it is worse than pointless: the cast hides the missing declaration of malloc, so if you forget #include <stdlib.h> the compiler assumes malloc returns int, and on a 64-bit machine that truncates the pointer. Without the cast, the same mistake is a warning or an error. In C++, the cast is required — which is one of the clearest signs the two languages are not the same.',
        ),
        b.tip(
          'One allocation, one free — write the owner in a comment',
          'A comment on the function declaration such as "Returns a malloc’d buffer; caller frees" or "Takes ownership of p" is the cheapest memory-safety documentation there is. The rule of thumb: whoever mallocs frees, or the name says otherwise.',
        ),
      ],
      questions: [
        [
          'What is the essential difference between automatic and allocated storage?',
          [
            'Allocated storage is faster',
            'Automatic storage is freed when the block ends; allocated storage lives until free is called and its size can be chosen at runtime',
            'Automatic storage is heap memory',
            'Allocated storage cannot be passed to functions',
          ],
          1,
          'The two defining properties of the heap are runtime size and lifetime that spans function calls. If you do not need either, a local is simpler and cannot leak.',
        ],
        [
          'Why does `calloc(n, size)` avoid a class of overflow bug that `malloc(n * size)` does not?',
          [
            'It is faster',
            'It checks whether n*size overflows and returns NULL instead of allocating a too-small block',
            'It zeroes the memory',
            'It does not — they are identical',
          ],
          1,
          'malloc(n*size) computes the product in size_t and can wrap, allocating a tiny block that your code then overflows. calloc performs the multiplication internally with an overflow check, which is a real security advantage. It also zeroes, which is a separate benefit.',
        ],
        [
          'What is a dangling pointer?',
          [
            'A pointer that has been assigned NULL',
            'A pointer that still holds the address of memory that has been freed or gone out of scope',
            'A pointer with a syntax error',
            'A pointer to static storage',
          ],
          1,
          'The memory is gone but the pointer still names it. Dereferencing is undefined behaviour, and it is the most dangerous pointer state because the value still looks valid.',
        ],
        [
          'What is the immediate consequence of freeing the same pointer twice?',
          [
            'Nothing, free is idempotent',
            'The second free is fine and returns an error code',
            'The allocator’s bookkeeping is corrupted, producing a crash or exploit later, far from the double free',
            'The C runtime raises an exception',
          ],
          2,
          'free is not idempotent. A double free corrupts the allocator’s free-list, and the damage surfaces at the next unrelated allocation. Setting the pointer to NULL after freeing turns a double free into a harmless free(NULL).',
        ],
        [
          'A function returns a pointer to one of its local variables. Why is this wrong?',
          [
            'It is fine as long as the caller reads it immediately',
            'The local has automatic storage, so it is destroyed when the function returns and the pointer is immediately dangling',
            'Because local variables are const',
            'It wastes stack space',
          ],
          1,
          'The frame is popped on return. Returning &local is undefined behaviour even if the value happens to survive, and the compiler is allowed to exploit that. Return a value, a static buffer, or a heap allocation.',
        ],
      ],
    },
    {
      title: 'realloc, growth, and a dynamic array',
      summary: 'Growing a buffer correctly, handling the classic realloc leak, and building a vector of your own.',
      duration: 18,
      build: (b) => [
        b.md(`## realloc changes a block's size

\`\`\`c
int *bigger = realloc(values, new_count * sizeof *values);
\`\`\`

\`realloc\` takes an existing block and a new size, and returns a pointer to a block of that size:

- If there is room, it may extend the block **in place** and return the same pointer.
- If not, it allocates a new block, **copies** the old contents, frees the old block, and returns the new address.
- On failure it returns \`NULL\` and **leaves the original block untouched** (it does not free it).

That last point is where the classic bug lives.

## The realloc leak

\`\`\`c
/* WRONG — leaks the original block if realloc fails */
values = realloc(values, new_count * sizeof *values);
if (values == NULL) {
    /* the old pointer is gone: you cannot free it, and you leaked it */
    return -1;
}
\`\`\`

Because the result overwrote \`values\`, a failed \`realloc\` leaves you with \`NULL\` and no way to reach the original allocation. The block is leaked.

\`\`\`c
/* RIGHT — keep the old pointer until the new one is confirmed */
int *tmp = realloc(values, new_count * sizeof *values);
if (tmp == NULL) {
    /* values is still valid; free it or use it, then return */
    free(values);
    return -1;
}
values = tmp;       /* only now overwrite */
\`\`\`

Use a temporary. Assign to the real pointer only after the success is confirmed. This is the single most important \`realloc\` idiom.

## realloc(NULL, n) is malloc

\`\`\`c
int *values = realloc(NULL, 10 * sizeof *values);   /* same as malloc */
\`\`\`

Guaranteed by the standard. It makes a "grow or create" function uniform, which is how the dynamic array below is written.

## realloc(p, 0) is implementation-defined

\`\`\`c
realloc(values, 0);    /* may return NULL, or a unique pointer to free */
\`\`\`

Do not rely on it. To release a block, call \`free\`.

## A dynamic array (a vector)

Here is the structure that makes runtime-sized sequences practical. It tracks a length and a capacity, and grows geometrically.

\`\`\`c
#include <stdlib.h>
#include <stddef.h>

typedef struct {
    int    *data;
    size_t  length;     /* how many are in use */
    size_t  capacity;   /* how many fit before growing */
} IntVec;

static bool vec_init(IntVec *v, size_t initial_capacity)
{
    v->data = initial_capacity > 0 ? malloc(initial_capacity * sizeof *v->data) : NULL;
    if (initial_capacity > 0 && v->data == NULL) {
        return false;
    }
    v->length = 0;
    v->capacity = initial_capacity;
    return true;
}

static bool vec_reserve(IntVec *v, size_t needed)
{
    if (needed <= v->capacity) {
        return true;                    /* already have room */
    }
    size_t new_cap = v->capacity > 0 ? v->capacity : 1;
    while (new_cap < needed) {
        new_cap *= 2;                   /* amortised O(1) growth */
    }
    int *tmp = realloc(v->data, new_cap * sizeof *tmp);
    if (tmp == NULL) {
        return false;                   /* v->data is still valid */
    }
    v->data = tmp;
    v->capacity = new_cap;
    return true;
}

static bool vec_push(IntVec *v, int value)
{
    if (!vec_reserve(v, v->length + 1)) {
        return false;
    }
    v->data[v->length++] = value;
    return true;
}

static void vec_free(IntVec *v)
{
    free(v->data);
    v->data = NULL;
    v->length = 0;
    v->capacity = 0;
}
\`\`\`

Every line of this is a lesson:

- **Length and capacity are different.** Length is how many elements are in use; capacity is how many fit. Conflating them is the bug that reads or writes past the initialized region.
- **Geometric growth (\`new_cap *= 2\`)** gives amortised O(1) push. Growing by one each time is O(n) per push and O(n²) for n pushes — the difference between instant and unusable.
- **\`vec_reserve\` does not overwrite \`v->data\` until success**, so a failed call leaves the vector intact.
- **\`vec_free\` resets the fields**, so the vector can be reused and a double free of \`data\` is a \`free(NULL)\`.

## Overflow in the growth multiplication

\`\`\`c
new_cap * sizeof *tmp
\`\`\`

can overflow \`size_t\` for a truly enormous capacity. Serious code guards it:

\`\`\`c
if (new_cap > SIZE_MAX / sizeof *tmp) {
    return false;      /* multiplication would overflow */
}
\`\`\`

\`SIZE_MAX\` is in \`<stdint.h>\`. For a teaching implementation the guard is optional, but it is worth knowing the shape of the check, because the naive version is a genuine exploitable bug in code that accepts a size from the network.

## Copying moves the data; that is the cost

\`realloc\` that must move copies the old bytes to the new location. For a vector of pointers or small structs that is cheap; for a vector of large structs it is the dominant cost. The alternatives — a chunked/deque layout, or storing pointers so only the pointers move — are real data-structure choices, and this is the reason they exist.

## Contraction

\`\`\`c
/* Shrinking: same idiom, and shaving capacity down to length. */
int *tmp = realloc(v->data, v->length * sizeof *tmp);
if (tmp != NULL || v->length == 0) {
    v->data = tmp;
    v->capacity = v->length;
}
\`\`\`

Shrinking is rarely worth it during a workload; the common pattern is to shrink once at the end if the vector came out much smaller than its peak.

## The vector as the model for every container

A hash table, a string builder, a graph's adjacency lists, a parser's token stream — all of them are "a pointer, a length, and a capacity, grown on demand". Learn this one shape and the rest are variations. The invariants to hold:

1. \`length <= capacity\`.
2. \`data != NULL\` whenever \`capacity > 0\`.
3. Every element below \`length\` is initialised; above it, unspecified.
4. \`free(data)\` happens exactly once, in \`vec_free\`, and the fields are reset.

## A note on tables of strings

\`\`\`c
char **lines = malloc(capacity * sizeof *lines);
\`\`\`

This is an array of pointers to strings — used for storing lines, arguments, or fields. Note the ownership: the array owns the pointers, and each pointer owns a separate string. Freeing it correctly means freeing each string, then the array:

\`\`\`c
for (size_t i = 0; i < count; i++) {
    free(lines[i]);
}
free(lines);
\`\`\`

Getting the order wrong (freeing the array first) loses the inner pointers and leaks the strings.`),
        b.anim('memory', {
          title: 'Growing a vector by doubling',
          badge: 'allocated storage',
          base: 4198656,
          cell_bytes: 1,
          cells: [
            { label: 'cap', bytes: ['1'], tone: 'int', note: 'capacity 1' },
          ],
          steps: [
            {
              caption:
                'vec_init(&v, 0): no allocation yet. data is NULL, length 0, capacity 0.',
              note: 'A vector can start empty and allocate on first push. This avoids a malloc for the common case of an empty container that is never filled.',
              vars: [
                { name: 'v.data', type: 'int*', value: 'NULL' },
                { name: 'v.length', type: 'size_t', value: '0' },
                { name: 'v.capacity', type: 'size_t', value: '0' },
              ],
            },
            {
              caption:
                'First push: reserve(1) sees capacity 0, so it allocates 1 element. data is non-NULL.',
              note: 'realloc(NULL, n) is guaranteed to behave as malloc(n), so the same growth routine handles both the first allocation and every later one.',
              highlight: [0],
              vars: [
                { name: 'v.data', type: 'int*', value: '0x400100', pointsTo: 0 },
                { name: 'v.length', type: 'size_t', value: '1' },
                { name: 'v.capacity', type: 'size_t', value: '1' },
              ],
            },
            {
              caption:
                'Second push: length+1 (2) exceeds capacity (1). Double to 2 and realloc.',
              note: 'The data may be copied to a new address. That is why the realloc result must go into a temporary first, and why any other pointer into the old block becomes invalid after growth.',
              highlight: [0],
              vars: [
                { name: 'v.data', type: 'int*', value: '0x400200', pointsTo: 0 },
                { name: 'v.length', type: 'size_t', value: '2' },
                { name: 'v.capacity', type: 'size_t', value: '2' },
              ],
            },
            {
              caption:
                'Fifth push: capacity doubles 2 → 4 → 8. Capacity is always >= length.',
              note: 'The gap between length and capacity is wasted space by design: it is the room for the next pushes, and it is what makes the amortised cost O(1) instead of O(n) per element.',
              highlight: [0],
              vars: [
                { name: 'v.data', type: 'int*', value: '0x400300', pointsTo: 0 },
                { name: 'v.length', type: 'size_t', value: '5' },
                { name: 'v.capacity', type: 'size_t', value: '8' },
              ],
            },
            {
              caption:
                'vec_free sets data to NULL and both counters to 0. The vector is reusable and cannot be double-freed.',
              note: 'Resetting the struct after free is what lets free(NULL) absorb a second vec_free call, and it prevents a stale data pointer from being pushed to later.',
              vars: [
                { name: 'v.data', type: 'int*', value: 'NULL' },
                { name: 'v.length', type: 'size_t', value: '0' },
                { name: 'v.capacity', type: 'size_t', value: '0' },
              ],
            },
          ],
        }),
        b.code(
          `#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <stdint.h>
#include <stddef.h>

typedef struct {
    int    *data;
    size_t  length;
    size_t  capacity;
} IntVec;

static bool vec_reserve(IntVec *v, size_t needed)
{
    if (needed <= v->capacity) {
        return true;
    }
    size_t new_cap = v->capacity > 0 ? v->capacity : 1;
    while (new_cap < needed) {
        if (new_cap > SIZE_MAX / 2) {       /* doubling would overflow */
            return false;
        }
        new_cap *= 2;
    }
    if (new_cap > SIZE_MAX / sizeof *v->data) {
        return false;                        /* byte count would overflow */
    }
    int *tmp = realloc(v->data, new_cap * sizeof *tmp);
    if (tmp == NULL) {
        return false;                        /* v->data is still valid */
    }
    v->data = tmp;
    v->capacity = new_cap;
    return true;
}

static bool vec_push(IntVec *v, int value)
{
    if (!vec_reserve(v, v->length + 1)) {
        return false;
    }
    v->data[v->length++] = value;
    return true;
}

static void vec_free(IntVec *v)
{
    free(v->data);
    v->data = NULL;
    v->length = 0;
    v->capacity = 0;
}

int main(void)
{
    IntVec v = { NULL, 0, 0 };

    for (int i = 0; i < 5; i++) {
        if (!vec_push(&v, i * i)) {
            fprintf(stderr, "out of memory at %d\\n", i);
            vec_free(&v);
            return 1;
        }
        printf("push %d: length=%zu capacity=%zu\\n", i * i, v.length, v.capacity);
    }

    for (size_t i = 0; i < v.length; i++) {
        printf("%d ", v.data[i]);
    }
    putchar('\\n');

    vec_free(&v);
    vec_free(&v);       /* safe: free(NULL) is a no-op */

    return 0;
}
`,
          'dynamic_array.c'
        ),
        b.warn(
          'The realloc leak: never assign straight back to the pointer',
          'p = realloc(p, n); if (realloc fails, it returns NULL, p is overwritten with NULL, and the original block is leaked with no way to reach it. Always realloc into a temporary and assign only on success. This exact line appears in production code, and it takes a Valgrind run on the failure path to see it.',
        ),
        b.tip(
          'Grow geometrically, never by one',
          'Doubling gives amortised O(1) per push. Growing by one element per push reallocates and copies every time, which is O(n) per push and O(n²) overall. For ten thousand elements that is the difference between microseconds and a second. Choose 1.5x to 2x and justify it once in a comment.',
        ),
      ],
      questions: [
        [
          'What does `realloc` do on failure?',
          [
            'Frees the original block and returns NULL',
            'Returns NULL and leaves the original block allocated and untouched',
            'Returns a smaller block',
            'Aborts the program',
          ],
          1,
          'It leaves the original alone, which is why assigning the result directly to the only pointer to the block leaks it. Use a temporary and assign only on success.',
        ],
        [
          'Why does the vector grow capacity geometrically rather than by one?',
          [
            'To use more memory',
            'Because doubling gives amortised O(1) per push, while growing by one is O(n) per push',
            'Because realloc requires a power of two',
            'It does not matter',
          ],
          1,
          'Each element is copied O(1) times on average when capacity doubles: n/2 + n/4 + ... sums to n. Growing by one copies the whole array every push, which is quadratic overall.',
        ],
        [
          'In a vector, what is the difference between length and capacity?',
          [
            'They are the same',
            'Length is the number of elements in use; capacity is the number of slots allocated',
            'Capacity is the number of elements in use; length is the allocated size',
            'Length is in bytes',
          ],
          1,
          'Elements below length are initialised and valid to read. Slots between length and capacity are allocated but uninitialised, and reading them is a bug.',
        ],
        [
          'What is `realloc(NULL, n)` equivalent to?',
          [
            'free(NULL)',
            'malloc(n)',
            'calloc(1, n)',
            'It is undefined behaviour',
          ],
          1,
          'The standard guarantees it behaves as malloc. This is what lets a single reserve routine handle both the first allocation and every subsequent growth.',
        ],
        [
          'You have `char **lines` where each lines[i] is a separate malloc’d string. What is the correct free order?',
          [
            'free(lines), then free each lines[i]',
            'free each lines[i], then free(lines)',
            'Only free(lines); the strings are inside it',
            'free(lines, count)',
          ],
          1,
          'Free the inner allocations first while you can still reach them, then the array. Freeing the array first loses the string pointers and leaks every string.',
        ],
      ],
    },
    {
      title: 'Memory bugs, ownership, and the tools that find them',
      summary: 'Use-after-free, double-free, and overflow — reproduced, then caught with ASan and Valgrind.',
      duration: 18,
      build: (b) => [
        b.md(`## What "unsafe" actually means

Every memory bug in C comes from the same root: **a pointer is trusted, and nothing checks that it is still valid.** There is no borrow checker and no garbage collector. The compiler checks types, not lifetimes.

The practical approach is not to be careful (nobody is, reliably). It is to (a) follow a small set of ownership rules and (b) run tools that catch violations the moment they happen.

## Use after free, reproduced

\`\`\`c
int *p = malloc(sizeof *p);
*p = 42;
free(p);
printf("%d\\n", *p);    /* UNDEFINED BEHAVIOUR */
\`\`\`

This often prints 42. That is the trap: the memory is usually still addressable, and the allocator has not yet reused it. The program looks correct. Then a later allocation reuses the block and the value changes, or the allocator unmaps the page and you get a segfault — in a function with no obvious connection to the original bug.

ASan catches it at the exact read:

\`\`\`
==12345==ERROR: AddressSanitizer: heap-use-after-free on address 0x602000000010
READ of size 4 at 0x602000000010 thread T0
    #0 0x... in main use_after_free.c:7
freed by thread T0 here:
    #0 0x... in free
    #1 0x... in main use_after_free.c:6
\`\`\`

It prints both where the memory was freed and where it was used. That pair is what makes ASan worth the compile time. No amount of staring at the source gives you the same information.

## Double free, and why the crash is late

\`\`\`c
int *p = malloc(sizeof *p);
free(p);
free(p);        /* the allocator's free-list is now corrupted */
\`\`\`

The immediate effect is not the crash. The allocator writes the block into its free list, and on the second free it writes it again — so the free list now has a cycle, or two pointers to the same block. The crash happens on the **next** \`malloc\`, which walks a corrupt list. That is why double-free bugs are so expensive to locate without a tool. ASan reports the second free immediately.

## The fix that costs one line

\`\`\`c
free(p);
p = NULL;
free(p);        /* now free(NULL), which is a guaranteed no-op */
\`\`\`

The standard says \`free(NULL)\` does nothing. Setting the pointer to \`NULL\` after freeing makes every later free of the same pointer harmless, and every later dereference a clean crash at the bug site. **Adopt this as a reflex.** It removes double-free and shortens the distance to every use-after-free.

## Heap overflow

\`\`\`c
char *buf = malloc(10);
strcpy(buf, "this is far too long for ten bytes");   /* overflow */
\`\`\`

The write runs past the block into the allocator's metadata or the next allocation. Consequences, in increasing severity:

- The adjacent allocation's contents are corrupted (a subtle wrong-answer bug).
- The allocator's metadata is corrupted (a crash on free).
- A crafted overflow overwrites a function pointer or return address (code execution).

This is the mechanism behind a large fraction of real-world exploits. The C string functions that do not take a length are exactly the ones to avoid; the Module 8 rule applies directly here.

## Reading uninitialised memory

\`\`\`c
int *p = malloc(sizeof *p);
printf("%d\\n", *p);     /* uninitialised: UB, and at -O2 the read may vanish */
\`\`\`

\`malloc\` does not zero. Valgrind reports "Conditional jump or move depends on uninitialised value(s)" and points at the branch that used it. \`calloc\` removes the problem for the cost of one memset.

## The ownership model, stated once

Everything above is prevented by one invariant, applied consistently:

> **Every allocated block has exactly one owner. The owner is the code that calls \`free\`. Ownership can be transferred (returned from a function, stored in a struct), but never duplicated except with an explicit, documented shared-ownership scheme.**

In practice:

- A function that mallocs and returns transfers ownership to the caller — document it.
- A function that receives a pointer for temporary use does not take ownership — do not free it.
- A struct that owns a block frees it in its destroy function.
- Two pointers to one block is fine as long as the \`free\` happens in one place.

This single rule answers "who frees this?" for every pointer in the program, and "who frees this?" is the question that leaks come from.

## The tools

### AddressSanitizer (ASan)

\`\`\`
gcc -fsanitize=address -fsanitize=undefined -g -O1 program.c
\`\`\`

Detects, at the moment of the operation, with a stack trace:

- Heap and stack buffer overflow
- Use after free / return
- Double free and invalid free
- Use of uninitialised memory (with \`-fsanitize=memory\` in Clang)

Cost is roughly 2x time and memory. Use it in development and CI. There is no reason to ship a C project without an ASan build in the test matrix.

### Valgrind

\`\`\`
valgrind --leak-check=full --track-origins=yes ./program
\`\`\`

Slower (10-30x), but it finds things ASan alone does not, in particular **leaks**. It reports each leaked block with the allocation stack trace:

\`\`\`
definitely lost: 40 bytes in 1 blocks
   at 0x...: malloc
   by 0x...: main (program.c:12)
\`\`\`

"Definitely lost" is a leak with no remaining pointer; "still reachable" is memory held by a global or static pointer at exit, which is often intentional.

### UndefinedBehaviorSanitizer (UBSan)

Included with \`-fsanitize=undefined\`. Catches signed integer overflow, invalid shifts, misaligned access, null dereference, and more — the class of bug that has no memory symptom at all until the optimiser uses it as an excuse.

### The compiler

\`\`\`
gcc -Wall -Wextra -Wpedantic -Wconversion -O2
\`\`\`

Not a substitute for the runtime tools, but free and catches a large fraction of mistakes before they run. Treat warnings as errors in new code.

## A debugging recipe

When memory misbehaves, in order:

1. **Rebuild with \`-fsanitize=address,undefined -g -O1\`.** Run the same input. In most cases ASan names the line.
2. **Run Valgrind** if ASan is clean but memory grows, or if the report is confusing. \`--track-origins=yes\` for uninitialised values.
3. **Print the pointers.** \`printf("%p\\n", (void*)p);\` before and after each suspect operation. A pointer that becomes \`(nil)\` or changes unexpectedly tells you which line is responsible.
4. **GDB watchpoints** for corruption that no sanitizer has pinned down: \`watch *(int*)0xADDRESS\`, then \`continue\` until the write that changes it.
5. **Bisect the code.** Comment out half. The bug is in the half that still fails. This is unglamorous and effective.

## Which bugs each tool finds

| Bug | ASan | Valgrind | UBSan | Compiler |
| --- | --- | --- | --- | --- |
| Buffer overflow | yes | yes | no | sometimes |
| Use after free | yes | yes | no | no |
| Double free | yes | yes | no | no |
| Memory leak | yes (LSan) | yes | no | no |
| Uninitialised read | no | yes | no | sometimes |
| Signed overflow | no | no | yes | no |
| Invalid shift | no | no | yes | sometimes |
| Use of a dangling stack pointer | yes | yes | no | sometimes |

Run all four in the development loop. Between them they catch nearly everything.

## Why this module matters more than the syntax

Writing a program that compiles is not the same as writing a correct one. In C specifically, the gap between "it compiled and ran once" and "it is correct" is almost entirely memory behaviour. That is why the tools are not optional extras for this language — they are the discipline.

The three habits, once more:

1. **Initialise** everything — pointers to \`NULL\`, arrays to \`{0}\`, mallocs checked.
2. **One owner** per allocation; document ownership on every function that allocates or transfers.
3. **Sanitize** — \`-fsanitize=address,undefined\` in development and in CI.`),
        b.anim('trace', {
          title: 'The four memory bugs, one at a time',
          badge: 'undefined behaviour',
          code: `int  *p = malloc(sizeof *p);   /* 1: allocate */\n*p = 42;                     /* 2: use      */\nfree(p);                     /* 3: release  */\n\n/* ---- each line below is a bug in a different program ---- */\n\nprintf("%d", *p);            /* use after free   */\nfree(p);                     /* double free      */\nchar *b = malloc(4);\nstrcpy(b, "teach");          /* heap overflow    */\nprintf("%d", *b);            /* uninitialised    */`,
          steps: [
            {
              caption: 'Allocate: malloc returns a block. p is its only name.',
              note: 'The block is uninitialised. At this point the program is correct: it owns 4 usable bytes.',
              line: 1,
              vars: [{ name: 'p', value: '0x602000000010' }],
            },
            {
              caption: 'Use: *p = 42 writes within the block. Still correct.',
              note: 'The written value lives in the heap block, not in p. p holds the address; the block holds the data.',
              line: 2,
              vars: [{ name: '*p', value: '42' }],
            },
            {
              caption: 'free(p): the block returns to the allocator. p still holds the address — it is now dangling.',
              note: 'The one-line fix is p = NULL; here. Without it, every later use of p is undefined behaviour that may not crash for a long time.',
              line: 3,
              vars: [{ name: 'p', value: '0x602000000010 (dangling)' }],
              output: 'freed the block',
            },
            {
              caption: 'Bug 1 — use after free: *p reads memory that no longer belongs to the program.',
              note: 'It may print 42, because the allocator has not reused the block yet. That is not correctness — it is undefined behaviour that happened to work. ASan reports heap-use-after-free with the free site and the read site.',
              line: 7,
              vars: [{ name: '*p', value: '??? (UB)' }],
            },
            {
              caption: 'Bug 2 — double free: the block is written to the free list a second time.',
              note: 'No crash here. The free list is now corrupt, and the crash arrives at the next malloc, in an unrelated function. This is why double frees are so costly to find by eye.',
              line: 8,
            },
            {
              caption: 'Bug 3 — heap overflow: strcpy writes 6 bytes into a 4-byte block and corrupts the metadata after it.',
              note: 'The overflow lands in the allocator’s header or the next allocation. A targeted version overwrites a return address, which is how buffer overflows become exploits.',
              line: 10,
              vars: [{ name: 'b', value: 'malloc(4)  ← "teach" needs 6' }],
            },
            {
              caption: 'Bug 4 — uninitialised read: *b prints whatever bytes happened to be there.',
              note: 'malloc does not zero. Valgrind reports a read of an uninitialised value and traces it to this line. calloc would have made it zero.',
              line: 11,
              vars: [{ name: '*b', value: 'garbage' }],
            },
          ],
        }),
        b.code(
          `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* Every function below is deliberately broken and is NOT called.
 * They are compiled so the sanitizer can describe them, and so the
 * fixes are visible next to the bugs. */

static void use_after_free(void)
{
    int *p = malloc(sizeof *p);
    if (p == NULL) return;
    *p = 42;
    free(p);
    printf("%d\\n", *p);        /* UB */
}

static void use_after_free_fixed(void)
{
    int *p = malloc(sizeof *p);
    if (p == NULL) return;
    *p = 42;
    free(p);
    p = NULL;                   /* the fix: no dangling pointer remains */
    /* *p would now be a clean null dereference, not silent corruption */
}

static void heap_overflow(void)
{
    char *buf = malloc(10);
    if (buf == NULL) return;
    strcpy(buf, "this is far too long for ten bytes");   /* UB */
    free(buf);
}

static void heap_overflow_fixed(void)
{
    char *buf = malloc(64);
    if (buf == NULL) return;
    snprintf(buf, 64, "%s", "this fits comfortably");    /* bounded */
    printf("%s\\n", buf);
    free(buf);
}

static void uninitialised(void)
{
    int *p = malloc(sizeof *p);
    if (p == NULL) return;
    printf("%d\\n", *p);        /* reads uninitialised memory */
    free(p);
}

static void uninitialised_fixed(void)
{
    int *p = calloc(1, sizeof *p);   /* zeroed */
    if (p == NULL) return;
    printf("%d\\n", *p);
    free(p);
}

int main(void)
{
    use_after_free_fixed();
    heap_overflow_fixed();
    uninitialised_fixed();
    puts("the broken versions are above; comment one in to see the report");
    return 0;
}
`,
          'memory_bugs.c'
        ),
        b.warn(
          'free(NULL) is safe; free(garbage) is not',
          'The standard guarantees free(NULL) does nothing, which is what makes "pointer = NULL after free" so useful. What is not safe is freeing a pointer that was never returned by malloc, or that has already been freed and not set to NULL, or that points into the middle of a block. All of those are undefined behaviour and all of them corrupt the allocator.',
        ),
        b.tip(
          'Put the sanitizers in CI, not just in habits',
          'A -fsanitize=address,undefined build running the test suite catches memory bugs the day they are introduced, not the day they page someone. The same is true of valgrind --leak-check=full on a long-running integration test. Discipline alone does not survive a deadline; a failing build does.',
        ),
      ],
      questions: [
        [
          'Why is use-after-free not reliably caught by testing without a tool?',
          [
            'It always crashes immediately',
            'The freed memory usually still holds the old value, so the program appears to work until the allocator reuses the block',
            'It is a compile error',
            'The compiler removes the access',
          ],
          1,
          'The block is still addressable and usually unreused, so the stale value is read back. The bug becomes visible only under a different allocation pattern or with a sanitizer that marks the memory poisoned.',
        ],
        [
          'What is the correct immediate fix after `free(p)`?',
          [
            'p++',
            'Set p = NULL so a later free is a no-op and a later use is a clean crash',
            'Call free again to be sure',
            'Nothing is needed',
          ],
          1,
          'free(NULL) is a guaranteed no-op, and a NULL dereference crashes at the bug site. Both properties are what make the one-liner worth doing every time.',
        ],
        [
          'Which tool finds a memory leak AND prints the allocation stack trace?',
          [
            'The compiler with -Wall',
            'Valgrind with --leak-check=full',
            'UBSan',
            'A printf after every malloc',
          ],
          1,
          'Valgrind’s leak checker reports each leaked block with the malloc call stack. ASan can also detect leaks (LeakSanitizer) and is faster. UBSan finds arithmetic and alignment undefined behaviour, not leaks.',
        ],
        [
          'A heap buffer overflow can lead to code execution because it can:',
          [
            'Slow the program down',
            'Overwrite the allocator’s metadata or a return address with attacker-controlled bytes',
            'Change the source code',
            'Free memory automatically',
          ],
          1,
          'The written data extends past the intended block into adjacent memory that the allocator or the call stack uses. Carefully chosen bytes can corrupt a pointer or return address, which is the classic exploit primitive.',
        ],
        [
          'What is the single ownership rule that prevents most memory bugs?',
          [
            'Always use calloc',
            'Every allocated block has exactly one owner, and the owner frees it',
            'Never use pointers',
            'Free everything at program exit',
          ],
          1,
          'One owner means one free, which removes leaks (the owner always frees), double frees (only one site frees), and clarifies the contract for every function that passes a pointer around.',
        ],
      ],
    },
  ]
);
