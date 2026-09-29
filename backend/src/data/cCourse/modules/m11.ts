// Module 11 — Structs, unions, enums, and typedef.
// Grouping data, the three ways to name types, and the layout and packing rules
// that decide what sizeof actually returns.

import { mod } from '../blocks';

export const M11 = mod(
  'crs-c-programming',
  'c-m11',
  11,
  'Module 11 — Structs, unions, enums, and typedef',
  'Composite types, memory layout and padding, bit-fields, tagged unions, and naming types well.',
  [
    {
      title: 'Structs: grouping related data',
      summary: 'Definition, declaration, initialisation, accessing, and passing by value versus pointer.',
      duration: 17,
      build: (b) => [
        b.md(`## The idea

A struct is a way to give one name to a collection of values of different types, and to move that collection around as a unit.

\`\`\`c
struct Point {
    int x;
    int y;
};
\`\`\`

That defines a type called \`struct Point\`. It does not create a variable. To create one:

\`\`\`c
struct Point p;                 /* uninitialised */
struct Point origin = {0, 0};   /* aggregate initialiser */
struct Point q = {.x = 3, .y = 4};   /* designated initialiser (C99) */
\`\`\`

The members are accessed with \`.\` when you have the object, and \`->\` when you have a pointer:

\`\`\`c
p.x = 10;
struct Point *ptr = &p;
ptr->x = 20;        /* equivalent to (*ptr).x */
\`\`\`

## Initialisation

\`\`\`c
struct Point a = {1, 2};            /* positional: x=1, y=2 */
struct Point b = {.y = 5};          /* x=0 (implicit), y=5 */
struct Point c = {0};               /* everything zero */
struct Point d = {.x = 1, .y = 2};  /* named, order-independent */
\`\`\`

Positional initialisation is the one to be careful with, because it silently mis-assigns if the struct's member order is later changed. Designated initialisers are the robust choice, and they automatically zero any members you do not mention — which makes \`{0}\` the universal "zero everything" form.

## Struct assignment copies

Unlike arrays, structs **are** assignable:

\`\`\`c
struct Point a = {1, 2};
struct Point b = a;      /* b is a full, independent copy */
b.x = 99;                /* a.x is still 1 */
\`\`\`

The copy is memberwise. For a struct containing a pointer, the copy duplicates the pointer, not the pointed-to data. This is the single most important thing to remember about structs called "shallow copy".

## Passing structs: by value or by pointer

\`\`\`c
/* By value: the whole struct is copied onto the stack for every call. */
struct Point midpoint_value(struct Point a, struct Point b)
{
    struct Point m = { (a.x + b.x) / 2, (a.y + b.y) / 2 };
    return m;
}

/* By pointer: 8 bytes copied regardless of struct size, and const documents intent. */
struct Point midpoint_ptr(const struct Point *a, const struct Point *b)
{
    struct Point m = { (a->x + b->x) / 2, (a->y + b->y) / 2 };
    return m;
}
\`\`\`

Which to use:

- **Pass by value** for small structs (say, up to two or three machine words) and when the function should not modify the caller's copy. The copy is cheap and the code is clearer.
- **Pass by pointer** — with \`const\` for read-only — for larger structs, and anything that owns heap memory. Copying a struct that owns a pointer is legal but leaves two structs looking at the same resource, which is the setup for a double free.

**Never pass a struct by value if it contains a heap pointer that it owns**, unless you implement deep copy. It is the single most common source of double-frees and leaks in C codebases.

## Returning structs is fine

\`\`\`c
struct Point make(int x, int y)
{
    struct Point p = {x, y};
    return p;       /* returns a copy; the compiler may elide it entirely */
}
\`\`\`

C returns structs by value, and modern compilers use NRVO (named return value optimisation) or the calling convention's hidden-pointer rule to avoid the copy. Returning a struct is idiomatic for small value types and is often the cleanest way to return several values at once.

## Comparing structs

There is no \`==\` for structs, and this is deliberate — the compiler will not guess whether you want to compare padding bytes too. (Comparing raw bytes with \`memcmp\` is a trap: padding is indeterminate and two logically equal structs frequently differ.) Compare member by member:

\`\`\`c
static bool point_equal(struct Point a, struct Point b)
{
    return a.x == b.x && a.y == b.y;
}
\`\`\`

For a struct with many members, write the comparison once, put it next to the type, and reuse it.

## Self-referential structs

\`\`\`c
struct Node {
    int          value;
    struct Node *next;      /* the "struct" keyword is required */
};
\`\`\`

A struct may contain a pointer to an instance of itself, but not an instance of itself — the size would be infinite. The tag \`struct Node\` must be used because the typedef alias (if any) is not yet defined.

## Forward declaration, and opaque types

You can name a struct before defining it, which is enough for pointers:

\`\`\`c
struct Database;    /* incomplete type */

struct Database *db_open(const char *path);
void             db_close(struct Database *db);
int              db_query(struct Database *db, const char *sql);
\`\`\`

Callers can hold a \`struct Database *\` and pass it around without knowing its internals. The definition lives in the \`.c\` file. This is how C does encapsulation: the header exposes a pointer type and functions, and hides the representation. It is the interface/implementation split in a language with no classes.

## Anonymous structs and nested structs

\`\`\`c
struct Address {
    char street[64];
    char city[32];
};

struct Person {
    char           name[64];
    struct Address addr;    /* nested by value */
    int            age;
};

struct Person p;
strcpy(p.name, "Ada");
strcpy(p.addr.city, "London");    /* two-level access */
\`\`\`

Nesting by value embeds the whole inner struct. Note that a nested struct that is unnamed (C11 anonymous struct/union) lets you reach the members directly:

\`\`\`c
struct Mixed {
    int tag;
    struct { int i; double d; };   /* anonymous: members are Mixed.i, Mixed.d */
};
\`\`\`

Anonymous structs and unions are a C11 feature and are useful for tagged-union patterns, though the explicit form is usually clearer.

## Designated initialisers on structs, deeply

\`\`\`c
struct Person ada = {
    .name = "Ada Lovelace",
    .addr = { .street = "12 St James", .city = "London" },
    .age  = 36,
};
\`\`\`

Designated initialisers work at every level and fill the rest with zeros. For configuration structs with many optional fields this is by far the clearest form, and it survives field reordering.

## A worked example

\`\`\`c
#include <stdio.h>
#include <stdbool.h>
#include <math.h>

typedef struct { double x, y; } Vec2;

static Vec2 vec_add(Vec2 a, Vec2 b) { return (Vec2){a.x + b.x, a.y + b.y}; }
static Vec2 vec_scale(Vec2 v, double k) { return (Vec2){v.x * k, v.y * k}; }
static double vec_dot(Vec2 a, Vec2 b) { return a.x * b.x + a.y * b.y; }
static double vec_len(Vec2 v) { return sqrt(vec_dot(v, v)); }

int main(void)
{
    Vec2 a = {3, 4};
    Vec2 b = {1, 2};
    Vec2 sum = vec_add(a, b);
    printf("sum = (%.1f, %.1f), |a| = %.2f\\n", sum.x, sum.y, vec_len(a));
}
\`\`\`

Note the compound literals \`(Vec2){a.x + b.x, a.y + b.y}\` — they construct a temporary struct value inline, which lets small value types be returned and used in expressions cleanly.

## Structs and cache locality

Because a struct's members are contiguous, an array of structs is a *single* contiguous block:

\`\`\`c
struct Particle { double x, y, z; double mass; };
struct Particle field[1000];      /* 32,000 contiguous bytes */
\`\`\`

Iterating that array reads memory sequentially, which the prefetcher and cache handle extremely well. Compare an array of pointers to separately allocated particles: every access is a pointer chase to a random address. **Prefer arrays of structs to arrays of pointers** unless you have a specific reason (polymorphism, sharing, very large elements).

## Summary of access and use

| Situation | Syntax | Note |
| --- | --- | --- |
| Have the object | \`p.x\` | Select a member |
| Have a pointer | \`p->x\` | Same as \`(*p).x\` |
| Copy | \`b = a\` | Memberwise, shallow for pointers |
| Zero | \`= {0}\` | The universal zero initialiser |
| Compare | member by member | No \`==\`, and \`memcmp\` is unreliable |
| Pass small, read-only | by value | Simple and cheap |
| Pass large or owning | \`const T *\` | Avoids copy and aliasing accidents |
| Return several values | return a struct | Often the cleanest option |`),
        b.anim('memory', {
          title: 'A struct is just its members, laid out in order',
          badge: 'with padding',
          base: 4198656,
          cell_bytes: 1,
          cells: [
            { label: 'x', bytes: ['01', '00', '00', '00'], tone: 'int', note: 'int x = 1' },
            { label: 'y', bytes: ['02', '00', '00', '00'], tone: 'int', note: 'int y = 2' },
            { label: 'pad', bytes: ['--', '--', '--', '--'], tone: 'bad', note: 'padding, indeterminate' },
            { label: 'd', bytes: ['00', '00', '00', '00', '00', '00', 'F0', '3F'], tone: 'char', note: 'double d = 1.0' },
          ],
          steps: [
            {
              caption:
                'struct Point { int x; int y; double d; }; = {1, 2, 1.0}. Members appear in declaration order.',
              note: 'The first member is at the lowest address. This is guaranteed by the standard in the sense that a pointer to the struct, suitably converted, points at the first member.',
              vars: [{ name: 'p', type: 'struct Point', value: '0x400100', pointsTo: 0 }],
            },
            {
              caption:
                'x and y are two ints, 4 bytes each. No padding needed between them: both are aligned to 4.',
              note: 'Each member must start at an address that is a multiple of its alignment. int needs 4-byte alignment, and 0x400104 is a multiple of 4, so y follows x directly.',
              highlight: [0, 1],
              vars: [{ name: 'p.x', type: 'int', value: '1' }, { name: 'p.y', type: 'int', value: '2' }],
            },
            {
              caption:
                'double needs 8-byte alignment. The next free address, 0x400108, is not a multiple of 8, so 4 bytes of padding are inserted.',
              note: 'That padding is not part of any member and holds indeterminate bytes. This is why ordering members from largest alignment to smallest usually reduces sizeof.',
              highlight: [2],
              vars: [{ name: 'padding', type: '4 bytes', value: 'unused' }],
            },
            {
              caption:
                'd lives at 0x400110, the first 8-aligned address. sizeof(struct Point) is 16, not 14.',
              note: 'The struct size is rounded up to its strictest member alignment so that an array of the struct keeps every element aligned. Never assume sizeof equals the sum of the members.',
              highlight: [3],
              vars: [{ name: 'p.d', type: 'double', value: '1.0' }, { name: 'sizeof', type: 'size_t', value: '16' }],
            },
            {
              caption:
                'Reorder to { double d; int x; int y; } and the padding moves to the tail, giving the same 16 with no interior hole.',
              note: 'Place the widest-aligned members first and the total is often unchanged but the layout is cleaner, and for larger structs the saving is real. This is a compiler-independent win with no change in behaviour.',
              highlight: [0],
              vars: [{ name: 'sizeof', type: 'size_t', value: '16' }],
            },
          ],
        }),
        b.code(
          `#include <stdio.h>
#include <stdbool.h>
#include <string.h>
#include <stddef.h>

struct Point {
    int x;
    int y;
};

struct Person {
    char name[32];
    int  age;
};

static bool point_equal(struct Point a, struct Point b)
{
    return a.x == b.x && a.y == b.y;
}

/* By pointer, because Person is larger and we only read it. */
static void person_print(const struct Person *p)
{
    printf("%s (age %d)\\n", p->name, p->age);
}

int main(void)
{
    struct Point origin = {0, 0};
    struct Point p = { .x = 3, .y = 4 };
    struct Point copy = p;               /* full copy */

    copy.x = 99;
    printf("p=(%d,%d) copy=(%d,%d)\\n", p.x, p.y, copy.x, copy.y);
    printf("equal(origin, p) = %d\\n", point_equal(origin, p));

    struct Person ada = {
        .name = "Ada Lovelace",
        .age  = 36,
    };
    person_print(&ada);

    /* sizeof is not the sum of the members: padding is included. */
    printf("sizeof(struct Point) = %zu\\n", sizeof(struct Point));
    printf("offsetof(Person, age) = %zu\\n", offsetof(struct Person, age));

    /* Struct assignment is memberwise and shallow. */
    struct Person other = ada;
    other.age = 37;
    printf("ada.age=%d other.age=%d\\n", ada.age, other.age);

    return 0;
}
`,
          'structs_basics.c'
        ),
        b.table(
          'Struct operations and their semantics',
          ['Operation', 'Syntax', 'Semantics'],
          [
            ['Define', 'struct Tag { ... };', 'Creates the type, no storage'],
            ['Declare', 'struct Tag v;', 'Uninitialised automatic storage'],
            ['Zero', 'struct Tag v = {0};', 'All members zero'],
            ['Designate', 'struct Tag v = {.b = 1};', 'Set named members, zero the rest'],
            ['Member (object)', 'v.member', 'Direct selection'],
            ['Member (pointer)', 'p->member', 'Dereference then select'],
            ['Copy', 'b = a;', 'Memberwise shallow copy'],
            ['Compare', 'a.x == b.x && a.y == b.y', 'No == for structs'],
            ['Size', 'sizeof(struct Tag)', 'Includes padding'],
            ['Offset', 'offsetof(struct Tag, m)', 'Byte offset, from <stddef.h>'],
            ['Return', 'return v;', 'Returns a copy, usually elided'],
          ]
        ),
        b.warn(
          'memcmp on structs is not a valid equality test',
          'Padding bytes have indeterminate values, so two structs that are logically equal member-by-member can differ in the padding and fail memcmp. Floating-point types can also have multiple bit patterns for the same value (and padding inside them). Compare field by field. This is why C refuses to give you == for structs: the compiler cannot know which bytes are meaningful.',
        ),
        b.tip(
          'Order struct members from largest alignment to smallest',
          'Putting doubles and pointers first, then ints, then chars, often removes interior padding at no cost. It is a free optimisation that changes no behaviour and no interface, and on large arrays of structs the memory and bandwidth savings are significant. Check with sizeof before and after.',
        ),
      ],
      questions: [
        [
          '`struct Point a = {1, 2};` then `struct Point b = a; b.x = 99;`. What is a.x?',
          [
            '99, because b is a reference to a',
            '1, because struct assignment makes an independent memberwise copy',
            'Undefined',
            '0',
          ],
          1,
          'Struct assignment copies every member. b is a separate object. This is different from array assignment, which does not exist at all.',
        ],
        [
          'Why is `p->x` the same as `(*p).x`?',
          [
            'It is a coincidence',
            'Because -> is defined as dereference-then-select; the parentheses are required in the long form because . binds tighter than *',
            'Because p is an array',
            'Because of operator overloading',
          ],
          1,
          'The long form needs parentheses: *p.x would be *(p.x). The -> operator exists precisely to avoid writing the parentheses.',
        ],
        [
          'A struct contains an `int x; int y; double d;` in that order. Why might `sizeof` be 16 instead of 14?',
          [
            'The compiler adds a sentinel',
            'Padding is inserted so double starts at an 8-byte-aligned address, and the total is rounded to the strictest alignment',
            'sizeof always rounds up to a power of two',
            'The struct stores its own metadata',
          ],
          1,
          '4 bytes of padding between y and d align the double at offset 8. The total 16 is a multiple of 8 so that an array of the struct keeps every element aligned.',
        ],
        [
          'What is the danger of passing a struct that owns a heap pointer by value?',
          [
            'It is slower',
            'The copy duplicates the pointer, so two structs own the same block and a double free becomes likely',
            'It does not compile',
            'The pointer is set to NULL in the original',
          ],
          1,
          'The copy is shallow: the pointer value is duplicated, not the pointed-to data. Freeing through both structs is a double free, and copying through either aliases the other. Pass by pointer, or implement an explicit deep copy.',
        ],
        [
          'How do you declare a function that returns a pointer to a struct whose definition is hidden from callers?',
          [
            'It cannot be done in C',
            'Forward-declare the struct — `struct Database;` — and declare functions taking and returning `struct Database *`',
            'Use void * only',
            'Include the full definition in the header',
          ],
          1,
          'An incomplete type is enough to declare pointers to it. The definition stays in the .c file. This is C’s encapsulation mechanism.',
        ],
      ],
    },
    {
      title: 'typedef, enums, and unions',
      summary: 'Naming types, named integer constants, and the type that stores one thing at a time.',
      duration: 17,
      build: (b) => [
        b.md(`## typedef: a new name for a type

\`\`\`c
typedef unsigned int uint;
typedef struct { int x, y; } Point;      /* anonymous struct + typedef */
typedef int (*Callback)(void *, int);    /* a function pointer type */
typedef char Buffer[256];                /* an array type */
\`\`\`

\`typedef\` does not create a type. It creates an **alias** — another name for an existing type. The type system treats \`uint\` and \`unsigned int\` as the same type; it is purely a spelling convenience and does not add type safety.

The idiom \`typedef struct { ... } Name;\` is so common that many people believe C has "structs without the keyword". It does not; the anonymous struct is given a name by the typedef, and \`Name\` and \`struct Name\` are different only if you also give the struct a tag.

## Typedef with a tag versus without

\`\`\`c
/* With a tag: both names work, and the struct can refer to itself. */
typedef struct Node {
    int value;
    struct Node *next;
} Node;

/* Without a tag: only Point works, and the struct cannot self-reference by this typedef. */
typedef struct { int x, y; } Point;
\`\`\`

For self-referential types (lists, trees) you need the tag, because the typedef alias is not available inside the definition. That is why \`typedef struct Node { ... struct Node *next; } Node;\` is the standard form.

## When typedef helps, and when it hurts

**Helps:**
- Giving meaning to a primitive: \`typedef uint64_t FileId;\` documents intent.
- Shortening repeated complex types: function pointers, array types.
- Making an abstraction's handle opaque and nameable.

**Hurts:**
- Hiding a pointer: \`typedef struct Node *NodePtr;\`. The reader can no longer see that a value is a pointer, and \`const NodePtr\` becomes \`struct Node *const\` — a const pointer, not a pointer to const. This surprises people and causes real bugs.
- Hiding arithmetic: \`typedef unsigned int uint;\` is fine, but \`typedef int Handle;\` where a Handle is actually something else invites mixing handles and plain ints with no compiler help.

The guidance that has aged well: **typedef the complex and the meaningful, not the simple.** In particular, do not hide pointers.

## enums: named integer constants

\`\`\`c
enum Color { RED, GREEN, BLUE };           /* 0, 1, 2 */
enum Status { OK = 0, WARN = 1, ERROR = 2 };
enum Flags  { F_READ = 1, F_WRITE = 2, F_EXEC = 4 };   /* powers of two */
\`\`\`

An enum is an integer type with named constants. The constants are of type \`int\` (in C), and the enum type can hold any int value, not only the enumerated ones — which is the crucial limitation:

\`\`\`c
enum Color c = 42;      /* legal! no warning from most compilers by default */
\`\`\`

C enums are not airtight. Use them for readability and for named constants, not for type safety. Two defences:

- \`-Wswitch-enum\` warns when a \`switch\` over an enum does not handle every enumerator.
- A \`default:\` case with an assertion or error return catches out-of-range values at runtime.

## Why enums beat #define

\`\`\`c
#define RED   0        /* no type, no scope, no debug info, text substitution */
#define GREEN 1

enum Color { RED, GREEN };   /* a real symbol: visible in a debugger, scoped, typed */
\`\`\`

Enums appear in debuggers with their names. \`#define\`s vanish at preprocessing time and leak into unrelated scopes. For constants that form a set, use an enum.

## Assigning explicit values

\`\`\`c
enum Error {
    ERR_NONE    = 0,
    ERR_IO      = 1,
    ERR_PARSE   = 2,
    ERR_MAX     = 3,        /* often used as a count */
};
\`\`\`

Explicit values matter when the number crosses a boundary — is written to a file, sent over a network, or stored in a database — because the implicit numbering could change when someone inserts an enumerator. Pin the values that leave the program.

## A switch over an enum

\`\`\`c
static const char *color_name(enum Color c)
{
    switch (c) {
        case RED:   return "red";
        case GREEN: return "green";
        case BLUE:  return "blue";
    }
    return "unknown";       /* reached only if c holds an out-of-range value */
}
\`\`\`

Listing every case without a default lets the compiler warn when a new enumerator is added and one path is missed — a genuinely useful maintenance property. The trailing \`return "unknown";\` handles the illegal-value case.

## Unions: one storage, several views

A union's members all start at offset 0. The union is as large as its largest member, and writing one member makes the others hold those same bytes interpreted differently.

\`\`\`c
union Value {
    int    i;
    float  f;
    char   bytes[4];
    double d;        /* the union is sizeof(double) = 8 */
};
\`\`\`

\`\`\`c
union Value v;
v.i = 0x41424344;
printf("%02X %02X %02X %02X\\n",      /* type-punning through char is allowed */
       (unsigned char)v.bytes[0], (unsigned char)v.bytes[1],
       (unsigned char)v.bytes[2], (unsigned char)v.bytes[3]);
\`\`\`

Reading a member other than the last one written is *usually* implementation-defined or undefined, **except** that reading the bytes through a \`char\`/\`unsigned char\` member is explicitly permitted. That exception is what makes unions usable for inspecting a value's byte representation, and that is exactly what the \`bits\` animation below shows.

## The tagged union: a value that can be one of several types

The union alone is dangerous because nothing records which member is live. Pair it with a tag:

\`\`\`c
struct Expr {
    enum { E_INT, E_REAL, E_STR } tag;
    union {
        long   i;
        double r;
        char  *s;
    } as;
};
\`\`\`

\`\`\`c
static void expr_print(const struct Expr *e)
{
    switch (e->tag) {
        case E_INT:  printf("%ld",   e->as.i); break;
        case E_REAL: printf("%g",    e->as.r); break;
        case E_STR:  printf("\\"%s\\"", e->as.s); break;
    }
}
\`\`\`

The tag is what makes the union safe: it is written when the value is set, and checked before every read. This pattern — a discriminator plus a union — is how C models sum types, and it appears in every interpreter, parser, protocol handler, and JSON library ever written.

## A worked example: parsing a tagged union

\`\`\`c
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

enum Kind { K_INT, K_STR, K_REAL };

struct Value {
    enum Kind kind;
    union {
        long   i;
        char  *s;      /* owns the string */
        double r;
    } u;
};

static void value_free(struct Value *v)
{
    if (v->kind == K_STR) {
        free(v->u.s);          /* free only if it is the live member */
        v->u.s = NULL;
    }
}

int main(void)
{
    struct Value a = { .kind = K_INT,  .u.i = 42 };
    struct Value b = { .kind = K_REAL, .u.r = 3.14 };
    struct Value c = { .kind = K_STR,  .u.s = strdup("hello") };

    if (c.kind == K_STR && c.u.s != NULL) {
        printf("%s\\n", c.u.s);
    }
    value_free(&c);
    (void)a; (void)b;
    return 0;
}
\`\`\`

## Unions and type punning

There are exactly two sanctioned ways to reinterpret bytes in C:

1. **A union with a \`char\`/\`unsigned char\` member** — reading the representation byte by byte is permitted.
2. **\`memcpy\` into a variable of the destination type** — the clean, portable approach when you want to reinterpret bytes as another type.

\`\`\`c
float f = 1.0f;
uint32_t bits;
memcpy(&bits, &f, sizeof bits);        /* the portable pun */
\`\`\`

What is *not* sanctioned is casting a \`float *\` to an \`int *\` and dereferencing: that violates strict aliasing and the compiler is entitled to produce nonsense. \`memcpy\` is the function the compiler understands and optimises correctly.

## Size and alignment of a union

\`\`\`c
union U { char c; int i; double d; };
printf("%zu\\n", sizeof(union U));     /* 8: the largest member, aligned to 8 */
\`\`\`

A union's size is the largest member's size, rounded up to the strictest member alignment.

## Bit-fields

A struct member can specify a width in bits:

\`\`\`c
struct Flags {
    unsigned int read  : 1;
    unsigned int write : 1;
    unsigned int exec  : 1;
    unsigned int       : 5;    /* unnamed padding to the next byte */
};
\`\`\`

Bit-fields pack sub-byte values, which is convenient for hardware registers and protocol headers. But their layout is **implementation-defined**: whether fields pack from the low or high bit, how the underlying allocation unit is sized, and how crossing an allocation boundary is handled all vary by compiler and target. Never use a bit-field to describe a wire format or a file format unless the platform's ABI is part of the specification.

The portable alternatives are explicit shifts and masks:

\`\`\`c
uint32_t flags = 0;
flags |= (1u << 0);               /* set bit 0  */
flags &= ~(1u << 0);              /* clear bit 0 */
int is_set = (flags >> 0) & 1u;   /* test bit 0  */
\`\`\`

This is more verbose and completely predictable, which is the right trade for anything that crosses a boundary.`),
        b.anim('bits', {
          title: 'A tagged union: one storage, a tag decides the view',
          badge: 'union layout',
          steps: [
            {
              caption:
                'struct Value stores an int64 tag plus a union of long, double, and char*. sizeof is at least 16.',
              note: 'The union is 8 bytes (the largest member) and the tag is 4, so the struct is 16 with padding. Storage is reserved for the widest member even when a smaller one is live.',
              fields: [
                { label: 'tag (4B)', bits: 32, tone: 'int' },
                { label: 'rest of tag slot', bits: 0, tone: 'bad', note: 'padding' },
                { label: 'union (8B)', bits: 64, tone: 'char' },
              ],
            },
            {
              caption:
                'Write v.kind = K_INT and v.u.i = 42. Only the long view is meaningful.',
              note: 'The tag says which member is live. Nothing enforces this at the language level; the code must write the tag every time it writes the union, and check it before every read.',
              fields: [
                { label: 'kind = K_INT', bits: 32, tone: 'int' },
                { label: 'u.i = 42', bits: 32, tone: 'ok' },
                { label: 'overlaid bytes', bits: 32, tone: 'bad', note: 'not the live member' },
              ],
            },
            {
              caption:
                'Write v.kind = K_REAL and v.u.r = 3.14. The same 8 bytes now hold a double.',
              note: 'Writing one member overwrites the bytes of the previous member. The old integer value is gone — a union stores one value, it does not store all of them.',
              fields: [
                { label: 'kind = K_REAL', bits: 32, tone: 'int' },
                { label: 'u.r (bits 0-31)', bits: 32, tone: 'char', note: 'low half of 3.14' },
                { label: 'u.r (bits 32-63)', bits: 32, tone: 'char', note: 'high half of 3.14' },
              ],
            },
            {
              caption:
                'Read u.i now and you get the low 32 bits of the double reinterpreted as an int — a bug, not a feature.',
              note: 'This is why the tag is mandatory. Without it, there is no way to know which member is live, and any read of the wrong member is either implementation-defined or undefined behaviour.',
              fields: [
                { label: 'kind = K_REAL', bits: 32, tone: 'int' },
                { label: 'reading u.i', bits: 32, tone: 'bad', note: 'wrong view!' },
                { label: 'the double is lost', bits: 32, tone: 'bad' },
              ],
            },
            {
              caption:
                'Free only the live member. value_free checks kind == K_STR before freeing u.s.',
              note: 'Freeing a union member that is not live frees a garbage pointer. The tag-driven destroy is the mirror image of the tag-driven read, and both must be written together.',
              fields: [
                { label: 'kind == K_STR?', bits: 32, tone: 'ok', note: 'check first' },
                { label: 'then free(u.s)', bits: 32, tone: 'ok' },
                { label: 'else: nothing', bits: 32, tone: 'int' },
              ],
            },
          ],
        }),
        b.code(
          `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef enum { RED, GREEN, BLUE } Color;

static const char *color_name(Color c)
{
    switch (c) {
        case RED:   return "red";
        case GREEN: return "green";
        case BLUE:  return "blue";
    }
    return "unknown";
}

/* A tagged union models "one of these types". */
enum Kind { K_INT, K_REAL, K_STR };

struct Value {
    enum Kind kind;
    union {
        long   i;
        double r;
        char  *s;      /* owns the string */
    } u;
};

static void value_print(const struct Value *v)
{
    switch (v->kind) {                 /* always switch on the tag first */
        case K_INT:  printf("%ld", v->u.i); break;
        case K_REAL: printf("%g", v->u.r); break;
        case K_STR:  printf("\\"%s\\"", v->u.s); break;
    }
}

static void value_free(struct Value *v)
{
    if (v->kind == K_STR) {            /* free only the live member */
        free(v->u.s);
        v->u.s = NULL;
    }
}

int main(void)
{
    printf("%s %s %s\\n", color_name(RED), color_name(GREEN), color_name(BLUE));

    struct Value values[3] = {
        { .kind = K_INT,  .u.i = 42 },
        { .kind = K_REAL, .u.r = 3.14159 },
        { .kind = K_STR,  .u.s = strdup("tagged unions") },
    };

    for (size_t i = 0; i < 3; i++) {
        value_print(&values[i]);
        putchar('\\n');
    }

    for (size_t i = 0; i < 3; i++) {
        value_free(&values[i]);        /* frees the string only for i == 2 */
    }

    /* The portable way to reinterpret bytes as another type: memcpy. */
    float f = 1.0f;
    unsigned int bits;
    memcpy(&bits, &f, sizeof bits);
    printf("1.0f bit pattern = 0x%08X\\n", bits);

    return 0;
}
`,
          'enums_unions.c'
        ),
        b.table(
          'typedef, enum, and union at a glance',
          ['Construct', 'Purpose', 'Key point'],
          [
            ['typedef old New;', 'Another name for a type', 'No new type, no type safety'],
            ['typedef struct Node {...} Node;', 'Name a self-referential struct', 'The tag is required inside the body'],
            ['typedef int (*Fn)(void);', 'Name a function-pointer type', 'Removes the hard-to-read declarator'],
            ['enum { A, B };', 'Named integer constants', 'Constants are int; enum Color c = 42 is legal'],
            ['enum with explicit values', 'Stable numbers for I/O', 'Pin values that cross a boundary'],
            ['union U { ... };', 'One storage, several types', 'Only the last-written member is valid'],
            ['tagged union', 'A safe sum type', 'Tag written on set, checked on read'],
            ['union with char bytes', 'Inspect a representation', 'Explicitly permitted by the standard'],
            ['memcpy pun', 'Reinterpret bytes as a type', 'The portable, optimiser-friendly approach'],
            ['bit-field', 'Sub-byte integer fields', 'Layout is implementation-defined'],
          ]
        ),
        b.warn(
          'Typedef does not create a distinct type',
          'typedef int Seconds; and typedef int Metres; are the same type as each other and as int. Your function taking Seconds accepts Metres, and the compiler says nothing. If you need real type safety between two quantities, wrap them in a struct, use an opaque handle, or accept the discipline of the naming convention. C has no strong typedef.',
        ),
        b.warn(
          'Unions are only safe with a tag',
          'A bare union has no way to know which member is live. Reading the wrong member reinterprets the same bytes as a different type, which is usually undefined behaviour. Every union that is read at more than the point of assignment should carry a discriminator, and every read should be guarded by it.',
        ),
        b.tip(
          'Use enum for sets of constants, #define for macros only',
          'An enum is a real symbol: typed, scoped, and visible in the debugger. A #define is a text substitution with no type and no scope. Reach for enum for constants that belong together, and reserve #define for genuine compile-time macros and include guards.',
        ),
      ],
      questions: [
        [
          'What does `typedef struct { int x; } Point;` actually create?',
          [
            'A new type distinct from every other',
            'An alias Point for an anonymous struct type',
            'A variable named Point',
            'A macro',
          ],
          1,
          'typedef introduces a name for an existing type. It does not create a distinct type, so two typedefs of the same underlying type are interchangeable to the compiler.',
        ],
        [
          'In C, `enum Color c = 42;` — what happens?',
          [
            'A compile error',
            'It compiles; an enum variable can hold any int value',
            'c becomes the largest enumerator',
            'Undefined behaviour at runtime',
          ],
          1,
          'C enums are integers with named constants and no range enforcement. Use -Wswitch-enum and a default/assert to catch invalid values at the boundaries where they can enter.',
        ],
        [
          'What is the size of `union U { char c; int i; double d; };`?',
          [
            '13, the sum of the members',
            '8, the largest member rounded to the strictest alignment',
            '4',
            'It is implementation-defined and unpredictable',
          ],
          1,
          'All members share the same start, so the union must be big enough for the largest one and aligned to the strictest — here 8 for the double.',
        ],
        [
          'Why is a tagged union safer than a bare union?',
          [
            'It uses less memory',
            'The tag records which member is live, so reads can be guarded against the correct type',
            'It allows comparing unions with ==',
            'It prevents all undefined behaviour automatically',
          ],
          1,
          'The tag is written when a member is set and checked before any read. This is how C models "one of several types" and it is the pattern behind every dynamic-value representation.',
        ],
        [
          'What is the portable way to reinterpret a float as its 32-bit integer representation?',
          [
            'int i = *(int *)&f;',
            'union { float f; int i; } u; u.f = 1.0f; return u.i;',
            'memcpy into an int variable',
            'It cannot be done in C',
          ],
          2,
          'memcpy is the sanctioned, strict-aliasing-safe conversion, and compilers optimise it to a register move. Casting a float* to int* and dereferencing violates strict aliasing; reading a different union member is implementation-defined except through char.',
        ],
      ],
    },
  ]
);
