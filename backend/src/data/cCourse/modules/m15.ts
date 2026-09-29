// Module 15 — Capstones and final assessment.
// Two projects that require composing the whole language, then a broad final
// exam that revisits the ideas a practitioner is expected to retain.

import { mod } from '../blocks';

export const M15 = mod(
  'crs-c-programming',
  'c-m15',
  15,
  'Module 15 — Capstones and final assessment',
  'A dynamic string and map library, a binary search tree, and a comprehensive final exam.',
  [
    {
      title: 'Capstone 1: a dynamic string and a string map',
      summary: 'Build reusable containers from scratch — the growth, ownership, and API design decisions that recur everywhere.',
      duration: 24,
      build: (b) => [
        b.md(`## The brief

Build two small, well-designed reusable pieces in one header/source pair:

1. \`Str\` — a growable string. It owns a heap buffer, knows its length and capacity, and supports append, clear, and compare.
2. \`StrMap\` — a mapping from string keys to string values, with insert, lookup, and iteration.

These are the containers you reach for constantly, and writing them once, correctly, teaches the decisions that every library makes. The emphasis is on **interface and ownership**, not clever algorithms: a linear-scan map is fine for the first version, and the hash version is a refactor of the same API.

## Designing the Str interface

\`\`\`c
/* str.h */
#ifndef STR_H
#define STR_H

#include <stddef.h>
#include <stdbool.h>

typedef struct {
    char  *data;       /* owned; always NUL-terminated when non-NULL */
    size_t length;     /* bytes before the NUL */
    size_t capacity;   /* bytes allocated including the NUL */
} Str;

bool   str_init(Str *s);
bool   str_init_from(Str *s, const char *cstr);
void   str_free(Str *s);

bool   str_append(Str *s, const char *suffix);
bool   str_append_char(Str *s, char c);
bool   str_append_n(Str *s, const char *bytes, size_t n);
bool   str_assign(Str *s, const char *cstr);

const char *str_cstr(const Str *s);      /* never NULL after init */
size_t      str_len(const Str *s);
int         str_compare(const Str *a, const Str *b);

#endif
\`\`\`

The design rules encoded here:

- **The owner is the struct.** \`str_init\` allocates; \`str_free\` releases; nothing else allocates on the struct's behalf.
- **Every function that can fail returns \`bool\`.** Distinguishing failure from success matters, and a bool return is the cheapest signal.
- **\`str_cstr\` guarantees a valid C string.** The invariant "always NUL-terminated" is what lets the caller pass it to \`printf\` and friends without thinking. Maintaining invariants is the core of good design.
- **The struct is passed by pointer, always.** It owns memory, so it must never be copied by value (that would duplicate the owned pointer, the Module 11 rule).

## Implementing the growth rule

\`\`\`c
/* str.c */
#include "str.h"
#include <stdlib.h>
#include <string.h>

#define STR_INITIAL_CAP 16

static bool str_reserve(Str *s, size_t needed)
{
    if (needed <= s->capacity) {
        return true;
    }
    size_t cap = s->capacity ? s->capacity : STR_INITIAL_CAP;
    while (cap < needed) {
        if (cap > (size_t)-1 / 2) return false;   /* doubling would overflow */
        cap *= 2;
    }
    char *tmp = realloc(s->data, cap);
    if (tmp == NULL) {
        return false;                              /* s->data still valid */
    }
    s->data = tmp;
    s->capacity = cap;
    return true;
}
\`\`\`

Read that against Module 10: geometric growth, realloc into a temporary, leave the struct valid on failure, guard the multiplication. The same four lines appear in every growable container.

## Append and the invariant

\`\`\`c
static bool str_reserve(Str *s, size_t needed);   /* forward */

bool str_init(Str *s)
{
    s->data = malloc(1);
    if (s->data == NULL) return false;
    s->data[0] = '\\0';
    s->length = 0;
    s->capacity = 1;
    return true;
}

bool str_append_n(Str *s, const char *bytes, size_t n)
{
    if (!str_reserve(s, s->length + n + 1)) {    /* +1 for the NUL */
        return false;
    }
    memcpy(s->data + s->length, bytes, n);
    s->length += n;
    s->data[s->length] = '\\0';                  /* restore the invariant */
    return true;
}

bool str_append(Str *s, const char *suffix)
{
    return str_append_n(s, suffix, strlen(suffix));
}
\`\`\`

The single invariant \`data[length] == '\\0'\` is restored after every mutation, and every reader relies on it. This is the same discipline as the C string convention itself, made explicit.

## str_init_from and str_assign

\`\`\`c
bool str_init_from(Str *s, const char *cstr)
{
    s->data = NULL;
    s->length = 0;
    s->capacity = 0;
    return str_assign(s, cstr);
}

bool str_assign(Str *s, const char *cstr)
{
    size_t n = strlen(cstr);
    if (!str_reserve(s, n + 1)) {
        return false;
    }
    memcpy(s->data, cstr, n + 1);
    s->length = n;
    return true;
}
\`\`\`

\`str_assign\` handles the initial state (data NULL, capacity 0) because \`str_reserve\` covers it: \`realloc(NULL, n)\` is \`malloc(n)\` from Module 10. One code path for both "not yet allocated" and "grow", which is the payoff for handling \`NULL\` in \`realloc\` correctly.

## str_free and reuse

\`\`\`c
void str_free(Str *s)
{
    free(s->data);
    s->data = NULL;
    s->length = 0;
    s->capacity = 0;
}
\`\`\`

Resetting the fields means a second \`str_free\` is \`free(NULL)\`, and the struct can be reinitialised. Always reset on release.

## Designing the StrMap interface

\`\`\`c
/* strmap.h */
#ifndef STRMAP_H
#define STRMAP_H

#include "str.h"

typedef struct {
    char *key;      /* owned */
    char *value;    /* owned */
    bool  used;     /* for a simple linear table, mark live entries */
} Slot;

typedef struct {
    Slot  *slots;
    size_t length;      /* live entries */
    size_t capacity;
} StrMap;

bool        map_init(StrMap *m);
void        map_free(StrMap *m);
bool        map_put(StrMap *m, const char *key, const char *value);
const char *map_get(const StrMap *m, const char *key);   /* borrowed, or NULL */
bool        map_remove(StrMap *m, const char *key);
size_t      map_len(const StrMap *m);

bool        map_put_str(StrMap *m, const Str *key, const Str *value);

#endif
\`\`\`

Two ownership decisions worth calling out:

- \`map_put\` **copies** the key and value. The map owns its own bytes, so the caller can free or mutate their arguments immediately. Copying on insert removes a whole class of lifetime bugs.
- \`map_get\` **borrows** — it returns a pointer into the map's storage, valid until the next mutation. The alternative (returning a copy the caller frees) is also valid; the point is to pick one and document it. Borrowing makes reads allocation-free; copying makes them safe against concurrent writes. For a single-threaded teaching library, borrowing is fine.

## A linear-scan map that is correct first

\`\`\`c
bool map_put(StrMap *m, const char *key, const char *value)
{
    for (size_t i = 0; i < m->capacity; i++) {
        if (m->slots[i].used && strcmp(m->slots[i].key, key) == 0) {
            char *copy = strdup(value);
            if (copy == NULL) return false;
            free(m->slots[i].value);       /* free old before replacing */
            m->slots[i].value = copy;
            return true;
        }
    }
    if (m->length * 4 >= m->capacity * 3) {   /* load factor 0.75 */
        if (!map_grow(m)) return false;
    }
    /* insert into the first free slot */
    for (size_t i = 0; i < m->capacity; i++) {
        if (!m->slots[i].used) {
            char *k = strdup(key);
            char *v = strdup(value);
            if (k == NULL || v == NULL) { free(k); free(v); return false; }
            m->slots[i].key = k;
            m->slots[i].value = v;
            m->slots[i].used = true;
            m->length++;
            return true;
        }
    }
    return false;   /* unreachable: grow kept space available */
}
\`\`\`

The details that matter:

- **Update frees the old value before storing the new one** — otherwise the previous value leaks.
- **Check both allocations before storing** — if the second fails, free the first. Partial ownership is how leaks happen on the error path.
- **The load-factor check triggers growth before insert**, keeping the table from filling completely.
- **Keys and values are copied**, so the map is self-contained.

The hash version replaces the two linear scans with a bucket lookup. The API does not change at all — which is the real lesson: **a good interface lets you replace the implementation without touching any caller.**

## Object lifetime and the library boundary

Put it together from a caller's point of view:

\`\`\`c
int main(void)
{
    StrMap m;
    if (!map_init(&m)) {
        return 1;
    }

    if (!map_put(&m, "name", "Ada") || !map_put(&m, "lang", "C")) {
        map_free(&m);
        return 1;
    }
    /* Updating reuses the slot and frees the old value. */
    if (!map_put(&m, "lang", "C99")) {
        map_free(&m);
        return 1;
    }

    const char *lang = map_get(&m, "lang");
    if (lang != NULL) {
        printf("lang = %s\\n", lang);   /* borrowed; do not free */
    }

    map_free(&m);        /* frees every key and value, then the slots */
    return 0;
}
\`\`\`

Every path that returns early calls \`map_free\`. Even a three-line request frees on every failure branch, which is what Valgrind measures.

## Testing the library

The tests are as valuable as the implementation for a library like this:

1. **Empty map** — \`map_len\` is 0, \`map_get\` returns \`NULL\`.
2. **Insert then get** — the value round-trips.
3. **Update then get** — the value is replaced, \`map_len\` is unchanged.
4. **Grow past the initial capacity** — insert enough keys to force a rehash/growth and re-fetch an old key.
5. **Remove then get** — the key is gone.
6. **Free under Valgrind** — \`0 bytes lost\`.

Run all of them under ASan and Valgrind. A container library that leaks on its own update path is worse than no library, because every caller inherits the leak.

## The design lessons, stated once

- **One owner per resource.** The struct owns its buffer; the map owns its entries. Every allocate has exactly one matching free, in the object's destroy function.
- **Document borrowed versus owned at the API boundary.** \`map_get\` borrows; \`strdup\` and \`map_put\` copy. The caller must know which, and the header comment is where they find out.
- **Maintain invariants, not just values.** "Always NUL-terminated" and "load factor below 0.75" are invariants; the code exists to preserve them.
- **Return failure explicitly.** Every allocation can fail, so every allocating function returns a status.
- **Are the errors and the cleanup boringly uniform.** A single cleanup label or a single \`map_free\` per path makes the code obviously leak-free.
- **Separate interface from implementation.** Callers include \`str.h\`/\`strmap.h\` and never see the internals. The hash refactor changes one \`.c\` file and no callers.

That last point is what separates code that grows from code that calcifies, and it is the reason the standard library has the shape it does.`),
        b.anim('memory', {
          title: 'A string that grows, and one that never leaks',
          badge: 'capacity and length',
          base: 4198656,
          cell_bytes: 1,
          cells: [
            { label: 'cap', bytes: ['16'], tone: 'int', note: 'capacity 16' },
          ],
          steps: [
            {
              caption:
                'str_init(&s): data is malloc(1), holding only the terminator. length 0, capacity 1.',
              note: 'A non-NULL data pointer that is a valid empty string means str_cstr is always safe to call, even before the first append. The invariant is established from the start.',
              vars: [
                { name: 's.data', type: 'char*', value: '0x400100', pointsTo: 0 },
                { name: 's.length', type: 'size_t', value: '0' },
                { name: 's.capacity', type: 'size_t', value: '1' },
              ],
            },
            {
              caption:
                'str_append(&s, "hello"): reserve(6) grows capacity to 16, then copies 5 bytes and writes the NUL.',
              note: 'The capacity jumps well past what is needed. That spare room is why the next several appends cost nothing — the same amortisation as the vector.',
              highlight: [0],
              vars: [
                { name: 's.data', type: 'char*', value: '0x400100', pointsTo: 0 },
                { name: 's.length', type: 'size_t', value: '5' },
                { name: 's.capacity', type: 'size_t', value: '16' },
              ],
            },
            {
              caption:
                'Append " world" fits in the spare capacity: no realloc at all, just a copy and a new NUL.',
              note: 'This is the payoff of growing geometrically. Cheap appends between occasional expensive growths, giving O(1) amortised.',
              highlight: [0],
              vars: [
                { name: 's.data', type: 'char*', value: '0x400100', pointsTo: 0 },
                { name: 's.length', type: 'size_t', value: '11' },
                { name: 's.capacity', type: 'size_t', value: '16' },
              ],
            },
            {
              caption:
                'Appending past 16 triggers realloc into a temporary. On success s.data is updated; on failure it is untouched.',
              note: 'The block may move. Any other pointer into the old buffer becomes dangling — which is why the interface hands out borrowed pointers that are documented as valid only until the next mutation.',
              highlight: [0],
              vars: [
                { name: 's.data', type: 'char*', value: '0x400200', pointsTo: 0 },
                { name: 's.length', type: 'size_t', value: '20' },
                { name: 's.capacity', type: 'size_t', value: '32' },
              ],
            },
            {
              caption:
                'str_free frees the buffer and resets all three fields. Reusable, and double-free-safe.',
              note: 'The map’s free is the same shape with one more level: free every key and value, then the slots array, then reset. Outer-to-inner in allocation order.',
              vars: [
                { name: 's.data', type: 'char*', value: 'NULL' },
                { name: 's.length', type: 'size_t', value: '0' },
                { name: 's.capacity', type: 'size_t', value: '0' },
              ],
            },
          ],
        }),
        b.code(
          `/* ---- str.h ---- */
#ifndef STR_H
#define STR_H
#include <stddef.h>
#include <stdbool.h>

typedef struct {
    char  *data;
    size_t length;
    size_t capacity;
} Str;

bool        str_init(Str *s);
bool        str_init_from(Str *s, const char *cstr);
void        str_free(Str *s);
bool        str_append(Str *s, const char *suffix);
bool        str_append_char(Str *s, char c);
bool        str_assign(Str *s, const char *cstr);
const char *str_cstr(const Str *s);
size_t      str_len(const Str *s);
#endif
`,
          'str.h'
        ),
        b.code(
          `/* ---- str.c ---- */
#include "str.h"
#include <stdlib.h>
#include <string.h>

#define STR_INITIAL_CAP 16

static bool str_reserve(Str *s, size_t needed)
{
    if (needed <= s->capacity) return true;
    size_t cap = s->capacity ? s->capacity : STR_INITIAL_CAP;
    while (cap < needed) {
        if (cap > (size_t)-1 / 2) return false;
        cap *= 2;
    }
    char *tmp = realloc(s->data, cap);
    if (tmp == NULL) return false;
    s->data = tmp;
    s->capacity = cap;
    return true;
}

bool str_init(Str *s)
{
    s->data = malloc(1);
    if (s->data == NULL) return false;
    s->data[0] = '\\0';
    s->length = 0;
    s->capacity = 1;
    return true;
}

bool str_init_from(Str *s, const char *cstr)
{
    s->data = NULL; s->length = 0; s->capacity = 0;
    return str_assign(s, cstr);
}

bool str_assign(Str *s, const char *cstr)
{
    size_t n = strlen(cstr);
    if (!str_reserve(s, n + 1)) return false;
    memcpy(s->data, cstr, n + 1);
    s->length = n;
    return true;
}

bool str_append(Str *s, const char *suffix)
{
    size_t n = strlen(suffix);
    if (!str_reserve(s, s->length + n + 1)) return false;
    memcpy(s->data + s->length, suffix, n);
    s->length += n;
    s->data[s->length] = '\\0';
    return true;
}

bool str_append_char(Str *s, char c)
{
    if (!str_reserve(s, s->length + 2)) return false;
    s->data[s->length++] = c;
    s->data[s->length] = '\\0';
    return true;
}

const char *str_cstr(const Str *s) { return s->data; }
size_t      str_len(const Str *s)  { return s->length; }

void str_free(Str *s)
{
    free(s->data);
    s->data = NULL; s->length = 0; s->capacity = 0;
}
`,
          'str.c'
        ),
        b.code(
          `/* ---- strmap.c (linear-scan version; the API is the lasting part) ---- */
#include "strmap.h"
#include <stdlib.h>
#include <string.h>

bool map_init(StrMap *m)
{
    m->capacity = 8;
    m->length = 0;
    m->slots = calloc(m->capacity, sizeof *m->slots);
    return m->slots != NULL;
}

void map_free(StrMap *m)
{
    for (size_t i = 0; i < m->capacity; i++) {
        if (m->slots[i].used) {
            free(m->slots[i].key);
            free(m->slots[i].value);
        }
    }
    free(m->slots);
    m->slots = NULL; m->length = 0; m->capacity = 0;
}

static bool map_grow(StrMap *m);

bool map_put(StrMap *m, const char *key, const char *value)
{
    for (size_t i = 0; i < m->capacity; i++) {
        if (m->slots[i].used && strcmp(m->slots[i].key, key) == 0) {
            char *v = strdup(value);
            if (v == NULL) return false;
            free(m->slots[i].value);       /* free the old value first */
            m->slots[i].value = v;
            return true;
        }
    }
    if (m->capacity == 0 || m->length * 4 >= m->capacity * 3) {
        if (!map_grow(m)) return false;
    }
    for (size_t i = 0; i < m->capacity; i++) {
        if (!m->slots[i].used) {
            char *k = strdup(key);
            char *v = strdup(value);
            if (k == NULL || v == NULL) { free(k); free(v); return false; }
            m->slots[i].key = k;
            m->slots[i].value = v;
            m->slots[i].used = true;
            m->length++;
            return true;
        }
    }
    return false;
}

const char *map_get(const StrMap *m, const char *key)
{
    for (size_t i = 0; i < m->capacity; i++) {
        if (m->slots[i].used && strcmp(m->slots[i].key, key) == 0) {
            return m->slots[i].value;      /* borrowed */
        }
    }
    return NULL;
}

static bool map_grow(StrMap *m)
{
    size_t old_cap = m->capacity;
    Slot *old = m->slots;
    size_t new_cap = old_cap ? old_cap * 2 : 8;

    Slot *fresh = calloc(new_cap, sizeof *fresh);
    if (fresh == NULL) return false;

    m->slots = fresh;
    m->capacity = new_cap;
    m->length = 0;

    for (size_t i = 0; i < old_cap; i++) {
        if (old[i].used) {
            size_t h = 0;
            for (const char *p = old[i].key; *p; p++) h = h * 31 + (unsigned char)*p;
            size_t j = h % new_cap;
            while (fresh[j].used) j = (j + 1) % new_cap;
            fresh[j] = old[i];
        }
    }
    free(old);
    for (size_t i = 0; i < new_cap; i++) if (fresh[i].used) m->length++;
    return true;
}
`,
          'strmap.c'
        ),
        b.warn(
          'Copy values on insert, or document the borrowing',
          'map_put copies both the key and the value so the caller can free or change its arguments immediately. If instead you stored the caller’s pointer, the map would depend on the caller keeping that memory alive, and the first free would turn every lookup into a use-after-free. Whichever you choose, state it on the declaration. Silent lifecycle assumptions at an API boundary are the bug class this course keeps returning to.',
        ),
        b.tip(
          'A linear-scan map is the correct first implementation',
          'Get the interface and the ownership right with the simplest algorithm, test it, and only then make it faster. The hash refactor changes the body of map_put and map_get and touches no caller. Optimising before the interface is stable locks in the wrong contract and is far more expensive.',
        ),
      ],
      questions: [
        [
          'Why does map_put free the existing value before storing the new one on an update?',
          [
            'For speed',
            'Otherwise the previous value is overwritten and leaked',
            'Because strdup requires it',
            'To keep the key sorted',
          ],
          1,
          'On the update path the old value pointer is replaced. If it is not freed first, it becomes unreachable and leaks. Every overwrite of an owning pointer needs a free of the old one.',
        ],
        [
          'What does `str_cstr` guarantee, and why does the guarantee matter?',
          [
            'That the string is uppercase',
            'That s->data is non-NULL and NUL-terminated, so it can be passed to any C string function safely',
            'That the buffer is exactly length bytes',
            'That appends are O(1)',
          ],
          1,
          'Maintaining "always NUL-terminated, never NULL" as an invariant is what lets callers pass the result to printf and strlen without checking. Invariants, not individual values, are the point of a well-designed type.',
        ],
        [
          'Why reset the fields in str_free, and not just free the buffer?',
          [
            'It is required by the standard',
            'So a second free is free(NULL) and the struct is safe to reuse',
            'To avoid a warning',
            'It frees memory faster',
          ],
          1,
          'Resetting removes dangling pointers: a double free becomes a no-op and a stale pointer cannot be pushed later. The same discipline applies to every owning struct.',
        ],
        [
          'Why does map_get return a borrowed pointer rather than a copy?',
          [
            'Copies are illegal in C',
            'It avoids an allocation per lookup; the caller must not free it and must respect that it is valid only until the next mutation',
            'Borrowed pointers are always faster to compare',
            'It is the only option',
          ],
          1,
          'Borrowing makes reads allocation-free, which matters for a map used in a hot path. The cost is a lifetime rule the caller must follow. The alternative — returning an owned copy — is equally valid and simply shifts who frees.',
        ],
        [
          'What is the main benefit of separating str.h from str.c?',
          [
            'It compiles faster',
            'Callers depend on the interface only, so the implementation can change — for example, linear scan to hash — without touching any caller',
            'It uses less memory',
            'It enforces const',
          ],
          1,
          'The header is the contract; the source is one implementation of it. Refactoring the container internals affects one file, no callers, and the build still links. This is where maintainability in C comes from.',
        ],
      ],
    },
    {
      title: 'Capstone 2: a binary search tree, recursively',
      summary: 'Pointers to structs, recursion, an ordered container, and depth-first traversal — all in one.',
      duration: 24,
      build: (b) => [
        b.md(`## The brief

Build an ordered set of integers as a binary search tree, with insert, lookup, in-order traversal, and a recursive destroy.

\`\`\`
       8
      / \\
     3   10
    / \\    \\
   1   6    14
      / \\  /
     4  7 13
\`\`\`

The reason this is the second capstone: it is where **pointers, structs, recursion, and ownership coincide**, and every one of them has to be right for the tree to be correct. A linked list can be written iteratively and fumbled through; a tree with a recursive destroy exposes every lifetime mistake.

## The node and the tree

\`\`\`c
typedef struct Node {
    int          value;
    struct Node *left;
    struct Node *right;
} Node;

typedef struct {
    Node  *root;
    size_t count;
} Tree;
\`\`\`

The \`struct Node\` tag is required inside the definition, from Module 11. The tree holds only the root and a count — everything else is reachable through pointers.

## Insert, recursively

\`\`\`c
static Node *insert(Node *node, int value, bool *inserted)
{
    if (node == NULL) {
        Node *fresh = malloc(sizeof *fresh);
        if (fresh == NULL) {
            *inserted = false;
            return NULL;
        }
        fresh->value = value;
        fresh->left  = NULL;
        fresh->right = NULL;
        *inserted = true;
        return fresh;
    }

    if (value < node->value) {
        node->left = insert(node->left, value, inserted);
    } else if (value > node->value) {
        node->right = insert(node->right, value, inserted);
    } else {
        *inserted = false;         /* already present */
    }
    return node;                   /* link back */
}
\`\`\`

The subtle and essential part: **the recursive call returns the subtree root, and the caller reassigns the link.** That is what makes \`node->left = insert(node->left, ...)\` work even on the very first insert into an empty child, or — later — if the function also balanced or removed. Write it any other way and the tree silently loses subtrees.

The caller wraps it to update the root and the count:

\`\`\`c
bool tree_insert(Tree *t, int value)
{
    bool inserted = false;
    Node *new_root = insert(t->root, value, &inserted);
    if (new_root == NULL && t->root == NULL) {
        return false;              /* the first allocation failed */
    }
    t->root = new_root;
    if (inserted) t->count++;
    return inserted;               /* false can also mean "already present" */
}
\`\`\`

## Lookup, iteratively

Lookup does not need recursion; the loop is clearer and avoids stack depth proportional to the height.

\`\`\`c
static const Node *find(const Node *node, int value)
{
    while (node != NULL) {
        if (value < node->value) {
            node = node->left;
        } else if (value > node->value) {
            node = node->right;
        } else {
            return node;
        }
    }
    return NULL;
}

bool tree_contains(const Tree *t, int value)
{
    return find(t->root, value) != NULL;
}
\`\`\`

The \`const Node *\` is important: the function must not modify the tree, and the type says so.

## In-order traversal

\`\`\`c
static void visit_in_order(const Node *node, void (*visit)(int, void *), void *ctx)
{
    if (node == NULL) return;
    visit_in_order(node->left, visit, ctx);    /* left */
    visit(node->value, ctx);                   /* this */
    visit_in_order(node->right, visit, ctx);   /* right */
}

void tree_print(const Tree *t)
{
    visit_in_order(t->root, print_value, NULL);
}
\`\`\`

In-order traversal of a BST visits the values in sorted order — that is the definition of the ordering. A function pointer plus a context argument turns the traversal into a reusable algorithm (the same shape as \`qsort\`'s comparator), which means the tree does not have to know whether you want to print, sum, or collect the values.

## Destroy, post-order, and why the order matters

\`\`\`c
void tree_free(Tree *t)
{
    destroy(t->root);
    t->root = NULL;
    t->count = 0;
}

static void destroy(Node *node)
{
    if (node == NULL) return;
    destroy(node->left);       /* free the children FIRST */
    destroy(node->right);
    free(node);                /* then the node */
}
\`\`\`

This must be **post-order**: free the children before the parent. If you free the parent first, \`node->left\` and \`node->right\` dangle, and the recursive calls read freed memory. Module 13's use-after-free, made concrete. The commented order in the code is the whole lesson.

## The recursion depth problem

The recursive insert and destroy use stack space proportional to the tree's height. That is fine for a balanced tree, but the tree as written is **not balanced**:

\`\`\`c
for (int i = 0; i < 1000000; i++) {
    tree_insert(&t, i);        /* ascending input */
}
\`\`\`

Inserting ascending values produces a degenerate tree that is a linked list of a million nodes. Height is a million. Recursion depth is a million. Each frame is tens of bytes, so the stack overflows and the program segfaults at the point where the depth crosses the stack limit.

Two fixes, and they are both worth knowing:

1. **Balance the tree.** A red-black or AVL tree keeps the height O(log n), bounding recursion depth. This is what real ordered containers do, at the cost of significant implementation complexity.
2. **Randomise the input,** or insert in a shuffled order, if the input distribution allows it. Cheaper, and often enough.

The takeaway is not "avoid recursion". It is that **recursion depth is a resource with a small, fixed budget, and any recursive algorithm on user input needs a bound or a guarantee on depth.** The same applies to a recursive parser, a directory walker, or a JSON reader.

## Iterative insert, for comparison

\`\`\`c
static Node *insert_iterative(Node *root, int value, bool *inserted)
{
    Node **link = &root;               /* pointer to the link we will fill */
    while (*link != NULL) {
        if (value < (*link)->value)      link = &(*link)->left;
        else if (value > (*link)->value) link = &(*link)->right;
        else { *inserted = false; return root; }
    }
    Node *fresh = malloc(sizeof *fresh);
    if (fresh == NULL) { *inserted = false; return root; }
    fresh->value = value;
    fresh->left = fresh->right = NULL;
    *link = fresh;                     /* write through the link */
    *inserted = true;
    return root;
}
\`\`\`

The trick is \`Node **link\`: a pointer to the link we are about to assign through. This is the "pointer to pointer" pattern from Module 9, and it lets the loop descend and write without a recursion frame or a separate parent pointer. It is an excellent exercise to convert the recursive versions both ways.

## Testing a tree

Structural algorithms need structural tests:

1. **Insert duplicates** — the count does not change.
2. **In-order output is sorted** — insert a shuffled array, print, check ascending.
3. **Contains** — every inserted value is found, and an absent one is not.
4. **Count matches** the number of distinct values inserted.
5. **Valgrind is clean** after tree_free, for a tree built from many values.
6. **A degenerate insert of 10,000 ascending values** either works (if you bounded the depth) or is documented as unsupported. Either is a decision; silence is not.

## What this capstone ties together

- **Structs and pointers:** the node and its left/right links.
- **Recursion:** insert and destroy, with the return-and-relink contract.
- **Pointer-to-pointer:** the iterative form and the flexibility it gives.
- **Function pointers:** traversal that does not know what "visit" does.
- **Ownership:** the tree owns every node; destroy is single-owner, exactly once.
- **Memory limits:** recursion depth as a resource, and the balanced-tree answer.
- **const correctness:** queries take \`const Tree *\`, mutations take \`Tree *\`.

If the word-frequency tool proved you can build a program, this proves you can build a **data structure** — and a data structure is where C's manual memory model either becomes second nature or stays a source of fear.`),
        b.anim('nodes', {
          title: 'Inserting into a binary search tree',
          badge: 'recursion and relinking',
          steps: [
            {
              caption: 'tree_insert(&t, 8): the tree is empty, so 8 becomes the root.',
              note: 'The base case allocates a node and returns it; the caller stores it as t->root. On this path the recursive function was called once.',
              tail: 'root',
              nodes: [{ id: 'n8', data: '8', note: 'root' }],
            },
            {
              caption: 'Insert 3: 3 < 8, so recurse into the left child, which is NULL. Allocate there.',
              note: 'The base case returns the new node, and the parent does node->left = <returned>. That reassignment is what actually attaches the node.',
              tail: 'root',
              nodes: [
                { id: 'n8', data: '8', pointsTo: 'n3', note: 'root' },
                { id: 'n3', data: '3', note: 'left of 8' },
              ],
            },
            {
              caption: 'Insert 10: 10 > 8, so it goes to the right child.',
              note: 'Every insert compares along the path and takes one branch. The shape of the tree is entirely determined by the order of insertion.',
              tail: 'root',
              nodes: [
                { id: 'n8', data: '8', pointsTo: 'n3', note: 'root, right→10' },
                { id: 'n3', data: '3', note: 'left of 8' },
                { id: 'n10', data: '10', note: 'right of 8' },
              ],
            },
            {
              caption: 'Insert 6: 6 < 8, 6 > 3, so node 3’s right child.',
              note: 'Insertion is O(height). Balanced, height is O(log n); degenerate (sorted input), height is O(n) and the tree becomes a list.',
              tail: 'root',
              nodes: [
                { id: 'n8', data: '8', pointsTo: 'n3', note: 'root' },
                { id: 'n3', data: '3', pointsTo: 'n6', note: 'left' },
                { id: 'n6', data: '6', note: 'right of 3' },
                { id: 'n10', data: '10', note: 'right of 8' },
              ],
            },
            {
              caption: 'Insert 6 again: the search finds the existing node and allocates nothing.',
              note: 'The duplicate is rejected and count is unchanged. tree_insert returning false for "already present" is a documented part of the contract, not an error.',
              tail: 'root',
              nodes: [
                { id: 'n8', data: '8', pointsTo: 'n3', note: 'root' },
                { id: 'n3', data: '3', pointsTo: 'n6', note: 'left' },
                { id: 'n6', data: '6', note: 'already here — count unchanged' },
                { id: 'n10', data: '10', note: 'right of 8' },
              ],
            },
          ],
        }),
        b.anim('callstack', {
          title: 'The frame stack during a recursive destroy',
          badge: 'post-order',
          steps: [
            {
              caption:
                'tree_free calls destroy(root). The first frame is pushed.',
              note: 'Each recursive call pushes a frame. The stack grows with the depth of the tree, not its size — which is why a degenerate tree can overflow it.',
              frames: [{ fn: 'destroy', args: 'node=8', locals: ['calls destroy(left)'], line: 'line 2' }],
            },
            {
              caption:
                'destroy(8) recurses left before doing anything. destroy(3) is pushed.',
              note: 'Post-order means left, right, then the node. Nothing is freed yet — the free is the last thing each frame does.',
              frames: [
                { fn: 'destroy', args: 'node=8', locals: ['waiting on left'], line: 'line 2' },
                { fn: 'destroy', args: 'node=3', locals: ['calls destroy(left)'], line: 'line 2' },
              ],
            },
            {
              caption:
                'Node 3 has no left child: destroy(NULL) returns immediately and the stack unwinds by one.',
              note: 'The NULL base case is not a waste — it is how the recursion terminates at every leaf. Every recursive function needs this case.',
              frames: [
                { fn: 'destroy', args: 'node=8', locals: ['waiting on left'], line: 'line 2' },
                { fn: 'destroy', args: 'node=3', locals: ['left was NULL, now right'], line: 'line 3' },
              ],
            },
            {
              caption:
                'The deepest frame frees its node and returns; the parent frame resumes.',
              note: 'free(3) happens only after both subtrees are gone, so the links in the parent are read while node 3 still exists. Freeing before recursing would dereference freed memory.',
              frames: [
                { fn: 'destroy', args: 'node=8', locals: ['left subtree freed, now right'], line: 'line 3' },
              ],
              note2: '',
            },
            {
              caption:
                'Every subtree freed, the root frame frees node 8 and returns. tree_free resets root and count.',
              note: 'The whole tree is released with one free per node, exactly once, in the one order that is safe. Valgrind reports zero leaks. This is the recursive destroy that every tree implementation shares.',
              frames: [],
            },
          ],
        }),
        b.code(
          `#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <stddef.h>

typedef struct Node {
    int          value;
    struct Node *left;
    struct Node *right;
} Node;

typedef struct {
    Node  *root;
    size_t count;
} Tree;

static Node *insert(Node *node, int value, bool *inserted)
{
    if (node == NULL) {
        Node *fresh = malloc(sizeof *fresh);
        if (fresh == NULL) {
            *inserted = false;
            return NULL;
        }
        fresh->value = value;
        fresh->left  = NULL;
        fresh->right = NULL;
        *inserted = true;
        return fresh;
    }
    if (value < node->value) {
        node->left  = insert(node->left, value, inserted);   /* relink */
    } else if (value > node->value) {
        node->right = insert(node->right, value, inserted);
    } else {
        *inserted = false;
    }
    return node;
}

bool tree_insert(Tree *t, int value)
{
    bool inserted = false;
    Node *new_root = insert(t->root, value, &inserted);
    if (new_root == NULL && t->root == NULL) {
        return false;
    }
    t->root = new_root;
    if (inserted) t->count++;
    return inserted;
}

static const Node *find(const Node *node, int value)
{
    while (node != NULL) {
        if (value < node->value)      node = node->left;
        else if (value > node->value) node = node->right;
        else                          return node;
    }
    return NULL;
}

bool tree_contains(const Tree *t, int value)
{
    return find(t->root, value) != NULL;
}

static void visit_in_order(const Node *node, void (*visit)(int, void *), void *ctx)
{
    if (node == NULL) return;
    visit_in_order(node->left, visit, ctx);
    visit(node->value, ctx);
    visit_in_order(node->right, visit, ctx);
}

static void print_value(int v, void *ctx)
{
    (void)ctx;
    printf("%d ", v);
}

static void destroy(Node *node)
{
    if (node == NULL) return;
    destroy(node->left);        /* children first: post-order */
    destroy(node->right);
    free(node);                 /* then the node itself */
}

void tree_free(Tree *t)
{
    destroy(t->root);
    t->root = NULL;
    t->count = 0;
}

int main(void)
{
    Tree t = { NULL, 0 };
    int values[] = { 8, 3, 10, 1, 6, 14, 4, 7, 13, 3 };   /* 3 appears twice */

    for (size_t i = 0; i < sizeof values / sizeof values[0]; i++) {
        tree_insert(&t, values[i]);
    }

    printf("count = %zu (duplicate rejected)\\n", t.count);
    printf("in order: ");
    visit_in_order(t.root, print_value, NULL);
    putchar('\\n');

    printf("contains 7:  %d\\n", tree_contains(&t, 7));
    printf("contains 99: %d\\n", tree_contains(&t, 99));

    tree_free(&t);       /* Valgrind: 0 bytes lost */
    return 0;
}
`,
          'bst.c'
        ),
        b.warn(
          'Free the children before the parent',
          'destroy must be post-order: destroy(left), destroy(right), free(node). If you free the node first, the recursive calls read node->left and node->right from freed memory — a use-after-free that may return the old pointers and walk into arbitrary memory. Write the three lines in this order every time, and run it under ASan once to confirm.',
        ),
        b.warn(
          'A recursive tree on sorted input overflows the stack',
          'Inserting ascending (or descending) values produces a degenerate tree whose height equals the number of elements. Recursive insert and destroy then use stack space proportional to n, and a million inserts overflow a typical 8 MB stack. Balance the tree, randomise the input, or convert the recursion to iteration. Recursion depth is a bounded resource.',
        ),
        b.tip(
          'Always reassign the link from a recursive call',
          'node->left = insert(node->left, value, ...) is mandatory, not stylistic. The base case returns a new node for an empty child; discarding that return loses the subtree. The same rule applies to a recursive remove or a balancing rotation. Return the new subtree root and relink on every path.',
        ),
      ],
      questions: [
        [
          'In `node->left = insert(node->left, value, &inserted)`, why is the assignment required?',
          [
            'For readability only',
            'Because the base case returns a newly allocated node for an empty child; discarding the return loses that subtree',
            'Because insert returns void',
            'To balance the tree',
          ],
          1,
          'The recursive function returns the subtree root for every path. On the empty-child base case that is a fresh node, so the caller must store it back into the link. Drop it and the tree silently loses nodes.',
        ],
        [
          'In what order must a tree’s nodes be freed?',
          [
            'Pre-order: node, then children',
            'Post-order: children, then node',
            'In-order',
            'Any order',
          ],
          1,
          'Post-order frees the children while the parent still holds valid child pointers. Freeing the parent first leaves dangling left/right pointers that the recursive calls then dereference.',
        ],
        [
          'Why can a recursive destroy overflow the stack on a degenerate tree?',
          [
            'Because free is slow',
            'Recursion depth equals the height, and a tree built from sorted input has height n',
            'Because the tree is too large for the heap',
            'It cannot',
          ],
          1,
          'Each recursive call consumes a frame, so the stack usage is O(height). Balanced trees give O(log n) depth; degenerate trees give O(n) and can exhaust a few megabytes of stack at large n.',
        ],
        [
          'What does the `Node **link` pattern in the iterative insert buy you?',
          [
            'Less memory',
            'A pointer to the link you are about to assign through, so the loop can descend and insert without a recursion frame or a tracked parent',
            'Faster comparisons',
            'const correctness',
          ],
          1,
          'link points either at the root pointer or at a left/right field. When the loop reaches a NULL link, *link = fresh installs the node at the right place in one step. It is the pointer-to-pointer idea from Module 9 applied to trees.',
        ],
        [
          'Why take `const Tree *` in tree_contains and `Tree *` in tree_insert?',
          [
            'Style preference',
            'const documents and enforces that a query does not modify the tree, while an insert must modify the root and count',
            'To allow null pointers',
            'Because const is faster',
          ],
          1,
          'const in the parameter list is a contract the compiler checks inside the function. Queries cannot modify; mutations must. Getting it right at the boundary prevents whole classes of accidental change.',
        ],
      ],
    },
    {
      title: 'Final assessment',
      summary: 'A broad exam across the whole course — syntax, memory, pointers, structs, files, the standard library, and safety.',
      duration: 25,
      passing: 80,
      build: (b) => [
        b.md(`## About this assessment

Twenty questions spanning the entire C half of the course. The passing mark is 80%, which is deliberately higher than the per-module quizzes: by this point you have seen all the material once, and retention is the goal.

The questions mix recognition and reasoning. Several present code and ask what happens, which is the skill that matters — not reciting a rule, but predicting behaviour.

## Before you start

If any question is unfamiliar, the module it comes from is a hint worth following rather than a failure. Use the results as a map of what to revisit, not as a verdict.

## Topics covered

| Area | Modules |
| --- | --- |
| Translation, toolchain, tokens | 1, 2 |
| I/O and formatting | 3 |
| Types, conversions, representation | 4, 11 |
| Operators and precedence | 5 |
| Control flow | 6 |
| Functions and the call stack | 7 |
| Arrays and strings | 8 |
| Pointers | 9 |
| Dynamic memory | 10 |
| Structs, unions, enums | 11 |
| Files and the preprocessor | 12 |
| Undefined behaviour and safety | 13 |
| Standard library | 14 |

## After the assessment

The score tells you which modules to review. The habits from Module 13 — initialise, check, bound, free once, sanitize — are the ones that carry into every program you write from here.`),
        b.table(
          'Course map for review',
          ['If you missed', 'Revisit'],
          [
            ['Translation units and tokens', 'Modules 1 and 2'],
            ['printf/scanf formats and input safety', 'Module 3'],
            ['Integer widths, signed/unsigned, conversions', 'Module 4'],
            ['Precedence, short-circuit, bitwise operators', 'Module 5'],
            ['Loops, switch fallthrough, tracing', 'Module 6'],
            ['Pass by value, recursion, the call stack', 'Module 7'],
            ['Array decay, string termination, sizeof', 'Module 8'],
            ['Addresses, dereference, pointer arithmetic', 'Module 9'],
            ['malloc/free, realloc, leaks', 'Module 10'],
            ['Struct layout, padding, unions, enums', 'Module 11'],
            ['fopen modes, streams, macros', 'Module 12'],
            ['Undefined behaviour, sanitizers, ownership', 'Module 13'],
            ['Standard library functions and traps', 'Module 14'],
          ]
        ),
        b.tip(
          'A wrong answer is information, not a score',
          'The value of this exam is the list of modules to revisit. The people who get the most out of it read the explanation for every question, including the ones they got right — because the explanation is usually where the subtlety lives.',
        ),
      ],
      questions: [
        [
          'Which best describes the C compilation model?',
          [
            'The whole program is compiled in one pass',
            'Each .c file is a translation unit compiled separately, then linked together resolving external symbols',
            'C is interpreted',
            'Headers are compiled and linked',
          ],
          1,
          'Each translation unit is preprocessed and compiled to an object file independently. The linker resolves symbols across them and pulls in the C library. This is why a declaration must appear before use and why missing -lm fails at link time, not compile time.',
        ],
        [
          'What does `printf("%d", 3.14);` do?',
          [
            'Prints 3',
            'Undefined behaviour — the format string must match the argument types',
            'Prints 3.140000',
            'A compile-time error',
          ],
          1,
          'Varargs functions cannot check their arguments against the format. Passing a double where %d expects an int is undefined behaviour. Enable -Wformat so the compiler checks what it can.',
        ],
        [
          'In C, what are the values of `sizeof(char)`, and is it always 1?',
          [
            '1 on all platforms, and the standard guarantees it',
            '4 on some platforms',
            'It depends on the compiler flags',
            '2',
          ],
          0,
          'sizeof(char) is 1 by definition, and it is the unit in which all other sizes are measured. Note it does not imply 8 bits on every platform, only that a char is one "byte" in C’s terms.',
        ],
        [
          'What does `int x = 017 + 0x10;` evaluate to (in decimal)?',
          [
            '17 + 16 = 33',
            '15 + 16 = 31',
            '17 + 10 = 27',
            'Invalid syntax',
          ],
          1,
          '017 is octal: 1×8 + 7 = 15. 0x10 is hex: 16. 15 + 16 = 31. Leading-zero octal literals are a real source of bugs, which is why C23 (and some style guides) discourage them.',
        ],
        [
          'What is the result of `5 / 2` in C when both are int?',
          [
            '2.5',
            '2, with the fractional part discarded toward zero',
            '3, rounded',
            'Undefined',
          ],
          1,
          'Integer division truncates toward zero; 5 / 2 is 2. Use 5.0 / 2 or cast to a floating type when you want 2.5. Note that -5 / 2 is -2, not -3 (truncation, not floor).',
        ],
        [
          'Why does `for (size_t i = 10; i >= 0; i--)` loop forever?',
          [
            'It does not',
            'size_t is unsigned, so i >= 0 is always true and the decrement wraps to a huge value',
            'The condition is invalid',
            'Because of operator precedence',
          ],
          1,
          'An unsigned value is never negative, so the loop never terminates: at 0 the next decrement wraps to SIZE_MAX. Iterating downward with an unsigned index needs a different form, such as stopping at i == 0 before decrementing.',
        ],
        [
          'What does `sizeof(arr) / sizeof(arr[0])` give?',
          [
            'The number of elements, on a genuine array in the same scope',
            'The byte size',
            'The pointer size',
            'Undefined if arr is a pointer',
          ],
          0,
          'It gives the element count only when arr is a real array visible in that scope. Once the array decays to a pointer, sizeof gives the pointer size and the idiom silently produces 8 / size.(sic)',
        ],
        [
          'A C string `char s[] = "abc";` has what size and what strlen?',
          [
            'sizeof 3, strlen 3',
            'sizeof 4, strlen 3',
            'sizeof 4, strlen 4',
            'sizeof 3, strlen 4',
          ],
          1,
          'The array holds the three characters plus the NUL terminator, so sizeof is 4. strlen stops before the NUL and returns 3.',
        ],
        [
          'What does `int *p = &x;` make p hold?',
          [
            'A copy of x',
            'The address of x',
            'The value of x twice',
            'NULL',
          ],
          1,
          'The address-of operator yields the location of x. Dereferencing p reads or writes x through that address. This is the pass-by-reference mechanism in a language with only pass-by-value.',
        ],
        [
          'How is `p + 1` computed when p is a `char *` versus an `int *` (4-byte ints)?',
          [
            'One byte vs one byte',
            'One byte vs four bytes, scaled by sizeof *p',
            'Four bytes vs four bytes',
            'It depends on p',
          ],
          1,
          'Pointer arithmetic is in units of the pointed-to type. char * advances one byte; int * advances four. Casting to char * is how you step in raw bytes.',
        ],
        [
          'What does `malloc` do on failure?',
          [
            'Returns zeroed memory',
            'Returns NULL',
            'Aborts the program',
            'Returns a pointer to a small block',
          ],
          1,
          'malloc (and calloc, realloc) return NULL on failure. Every allocation must be checked before the pointer is used. calloc additionally zeroes and overflow-checks the multiplication.',
        ],
        [
          'What is a memory leak?',
          [
            'Reading uninitialised memory',
            'A block that was allocated and is no longer reachable, so it can never be freed',
            'Freeing twice',
            'Writing past a buffer',
          ],
          1,
          'The program lost the last pointer to the block, so free can never be called. Valgrind reports it as "definitely lost" with the allocation stack trace.',
        ],
        [
          'What is the difference between `errno` on success and on failure?',
          [
            'errno is always 0 on success',
            'errno is not cleared on success, so you must set it to 0 before a call whose failure you check',
            'errno is set to 1 on success',
            'errno does not exist',
          ],
          1,
          'A successful call does not clear errno. Checking it after a call that also returned a failure signal is correct only if errno was cleared beforehand, otherwise you may report a stale error.',
        ],
        [
          'What does `fopen("f", "w")` do to an existing file?',
          [
            'Opens for reading',
            'Appends to it',
            'Truncates it to zero immediately',
            'Fails',
          ],
          2,
          'Mode "w" destroys the contents at open time. To update safely, write to a temporary and rename it over the original so a crash cannot leave a truncated file.',
        ],
        [
          'What does `#define MAX(a,b) a > b ? a : b` compute for `MAX(1+2, 2+3)`?',
          [
            '5',
            '1 + 2 > 2 + 3 ? 1 + 2 : 2 + 3 — at least it works here, but the missing parentheses make other uses wrong',
            'A compile error',
            'Undefined behaviour',
          ],
          1,
          'This particular call happens to work because comparison binds tighter than addition, but MAX(x & 1, 2) or 2 * MAX(3,4) would be wrong. Always parenthesise every parameter and the whole body.',
        ],
        [
          'What does a union store?',
          [
            'All members simultaneously, in separate storage',
            'One member at a time, all starting at the same address',
            'Only the first member',
            'A copy of each member',
          ],
          1,
          'All members overlay the same storage. Only the last-written member is valid to read (except through char/unsigned char). A tag is what makes it safe, and it is how C models sum types.',
        ],
        [
          'A function returns `&local` where local is an automatic variable. Why is that wrong?',
          [
            'It compiles and always works',
            'The local has automatic storage, so the returned pointer is immediately dangling',
            'It leaks memory',
            'It causes a stack overflow',
          ],
          1,
          'The frame is destroyed on return, so the pointer names dead storage. Even if a stale value appears to survive, the standard calls it undefined behaviour and the optimiser may exploit it.',
        ],
        [
          'Which tool would catch a heap buffer overflow at the exact write?',
          [
            'The compiler with -Wall only',
            'AddressSanitizer (-fsanitize=address)',
            'UBSan',
            'grep',
          ],
          1,
          'ASan places guards around allocations and stops the program at the out-of-bounds access, reporting both the write and the allocation site. UBSan targets arithmetic and alignment, not bounds.',
        ],
        [
          'What is the correct rule for allocating and freeing?',
          [
            'Free whenever convenient',
            'Every allocated block has exactly one owner, and the owner frees it exactly once',
            'Never free, the OS cleans up',
            'Free every pointer on every path',
          ],
          1,
          'One owner means one free: no leaks (the owner always frees), no double frees (only one site frees), and a clear contract for every function that passes a pointer. This is the central discipline of C memory management.',
        ],
        [
          'After reading this course, which habit best defines professional C?',
          [
            'Writing the fewest lines',
            'Initialise, check, bound, free once, and sanitize — treating memory behaviour as the specification',
            'Avoiding pointers entirely',
            'Using only the standard library',
          ],
          1,
          'C delegates correctness to the programmer and lets the compiler assume the program is correct. The habits in Module 13 — initialise everything, check every failure, bound every write, free once, and run the sanitizers — are what make the gap between "it compiles" and "it works" small enough to cross. That is the course.',
        ],
      ],
    },
  ]
);
