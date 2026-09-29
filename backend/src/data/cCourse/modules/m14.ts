// Module 14 — The standard library and a real program.
// A tour of the headers that ship with every C compiler, then a complete
// multi-file program assembled from the pieces of the whole course.

import { mod } from '../blocks';

export const M14 = mod(
  'crs-c-programming',
  'c-m14',
  14,
  'Module 14 — The standard library and a real program',
  'The headers you will actually use, their traps, and a complete word-frequency tool built from scratch.',
  [
    {
      title: 'A tour of the standard headers',
      summary: 'string.h, stdlib.h, ctype.h, math.h, time.h — what each gives you and where it bites.',
      duration: 18,
      build: (b) => [
        b.md(`## Why the standard library matters

The C standard library is small — a few hundred functions — and it is the same everywhere. Knowing it well means not reinventing (badly) what already exists. This lesson is a reference you can return to; the traps are what to read carefully.

## <string.h> — bytes and strings

\`\`\`c
size_t strlen(const char *s);                    /* length before NUL */
char  *strcpy(char *d, const char *s);           /* unbounded — avoid */
char  *strncpy(char *d, const char *s, size_t n);/* may not terminate */
char  *strcat(char *d, const char *s);           /* unbounded append */
char  *strncat(char *d, const char *s, size_t n);
int    strcmp(const char *a, const char *b);     /* 0 equal, <0 / >0 ordered */
int    strncmp(const char *a, const char *b, size_t n);
char  *strchr(const char *s, int c);             /* first c, or NULL */
char  *strrchr(const char *s, int c);            /* last c */
char  *strstr(const char *h, const char *n);     /* substring, or NULL */
size_t strcspn(const char *s, const char *reject);
char  *strtok(char *s, const char *delim);       /* tokeniser, stateful */
void  *memcpy(void *d, const void *s, size_t n); /* non-overlapping */
void  *memmove(void *d, const void *s, size_t n);/* overlapping-safe */
void  *memset(void *d, int c, size_t n);
int    memcmp(const void *a, const void *b, size_t n);
\`\`\`

The traps, in order of how often they cause real bugs:

1. **\`strcpy\`/\`strcat\` have no bound.** Use \`snprintf\` or a length-checked helper.
2. **\`strncpy\` does not terminate** if the source is at least \`n\` bytes. Always \`d[n-1] = 0;\` after, or use \`snprintf\`.
3. **\`memcpy\` requires non-overlapping** regions. Overlap is undefined; use \`memmove\`. This is a favourite interview question and a real bug in string-shifting code.
4. **\`strcmp\` returns 0 for equal.** Never test \`== 1\`.
5. **\`strtok\` modifies its argument and is not reentrant.** \`strtok_r\` (POSIX) or \`strsep\` take an explicit state pointer. Two threads tokenising at once with \`strtok\` corrupt each other.
6. **\`strlen\` is O(n).** Calling it in a loop condition on a growing string is O(n²); cache the length.

## <stdlib.h> — memory, conversions, and exits

\`\`\`c
void *malloc(size_t); void *calloc(size_t, size_t);
void *realloc(void *, size_t); void free(void *);

int    atoi(const char *s);          /* no error reporting — avoid */
long   strtol(const char *s, char **end, int base);   /* the real one */
double strtod(const char *s, char **end);
long long strtoll(const char *s, char **end, int base);

int    rand(void); void srand(unsigned);              /* poor quality */
long   labs(long); int abs(int);

void   qsort(void *base, size_t n, size_t size, int (*cmp)(const void *, const void *));
void  *bsearch(const void *key, const void *base, size_t n, size_t size,
               int (*cmp)(const void *, const void *));

int    atexit(void (*fn)(void));
void   exit(int status); void abort(void);
char  *getenv(const char *name);
int    system(const char *command);   /* do not use with untrusted input */
\`\`\`

Traps:

- **\`atoi\` cannot report failure.** \`atoi("abc")\` returns 0, and so does \`atoi("0")\`. Use \`strtol\` with an \`endptr\` and check \`errno\`.
- **\`rand()\` is not random enough for anything security-related,** and its low bits are often poor. Use it for games and simulations, and a proper CSPRNG for anything else.
- **\`qsort\`'s comparator returns an int with a sign.** Returning the raw difference of two ints can overflow; use \`(a > b) - (a < b)\`.
- **\`system\` passes its string to a shell.** Command injection is trivial if any part is user-controlled.

## <ctype.h> — character classification

\`\`\`c
int isalpha(int c); int isdigit(int c); int isalnum(int c);
int isspace(int c); int isupper(int c); int islower(int c);
int ispunct(int c); int isxdigit(int c);
int toupper(int c); int tolower(int c);
\`\`\`

Traps:

- The argument must be an \`unsigned char\` value or \`EOF\`. On a platform where \`char\` is signed, passing a byte above 127 as a negative \`int\` is **undefined behaviour**. The correct form is \`isspace((unsigned char)c)\`. This is a genuine bug that appears in real code.
- These are locale-sensitive. \`isalpha('é')\` depends on the current locale.

## <math.h> — floating point

\`\`\`c
double sqrt(double); double pow(double, double); double exp(double);
double log(double); double log10(double); double fabs(double);
double sin(double); double cos(double); double tan(double);
double floor(double); double ceil(double); double round(double);
double fmod(double, double);
\`\`\`

Traps:

- **Link with \`-lm\`** on Linux and many Unix systems. Forgetting it produces an undefined-reference error at link time that surprises everyone once.
- **Floating point is approximate.** \`0.1 + 0.2 != 0.3\`. Compare with a tolerance, never with \`==\`.
- **\`pow\` and \`sqrt\` are not exact.** \`sqrt(4.0)\` is 2.0 on every mainstream platform, but do not generalise.
- **Domain errors set \`errno\` and may return NaN.** \`sqrt(-1)\` returns NaN and sets \`errno = EDOM\`.

## <time.h> — clocks and formatting

\`\`\`c
time_t time(time_t *);                 /* seconds since the epoch */
struct tm *localtime(const time_t *);  /* NOT thread-safe */
struct tm *gmtime(const time_t *);     /* UTC; NOT thread-safe */
size_t strftime(char *s, size_t max, const char *fmt, const struct tm *tm);
double difftime(time_t end, time_t begin);
clock_t clock(void);                   /* CPU time, for benchmarking */
\`\`\`

Traps:

- \`localtime\` and \`gmtime\` return a pointer to a **static** \`struct tm\` that the next call overwrites. Copy it, or use the \`_r\` / \`_s\` variants.
- \`time_t\` may be 32-bit and overflow in 2038 on some systems.
- \`clock()\` measures CPU time, not wall-clock time. \`clock_gettime\` (POSIX) gives high-resolution wall time.

## <stdio.h> — already covered, but the highlights

\`printf\`/\`fprintf\`/\`snprintf\`, \`scanf\`/\`fscanf\`/\`sscanf\`, \`fopen\`/\`fclose\`, \`fread\`/\`fwrite\`, \`fgets\`/\`fputs\`, \`perror\`, and the \`FILE\` type. The two rules from Modules 3 and 12: bound every input, and check every return that signals failure.

## <stdint.h> and <stddef.h> — fixed-width and portable types

\`\`\`c
int8_t  uint8_t   int16_t uint16_t
int32_t uint32_t  int64_t uint64_t
intptr_t uintptr_t
INT32_MAX UINT32_MAX INT64_MIN ...
SIZE_MAX

/* <stddef.h> */
size_t    /* unsigned type of sizeof */
ptrdiff_t /* signed type of pointer subtraction */
NULL
offsetof(type, member)
\`\`\`

Use the fixed-width types when the exact width is part of the interface (files, protocols, hardware). Use \`int\`, \`long\`, and \`size_t\` for ordinary code, where portability across widths is a feature rather than a threat.

## <stdbool.h>, <assert.h>, <errno.h>, <limits.h>, <signal.h>, <locale.h>

\`\`\`c
/* stdbool.h */
bool true false         /* _Bool under the hood */

/* assert.h */
assert(cond)            /* aborts with file, line, expression; NDEBUG removes it */

/* errno.h */
errno EDOM ERANGE EINVAL
strerror(errno) perror("...")

/* limits.h */
INT_MAX INT_MIN UINT_MAX LONG_MAX CHAR_BIT

/* signal.h */
signal(SIGINT, handler); raise(SIGTERM);

/* locale.h */
setlocale(LC_ALL, "");
\`\`\`

Traps:

- \`assert\` is compiled out by defining \`NDEBUG\`. Never put a side effect inside an assert.
- \`assert\` is for bugs, not for input validation. Validate input with code that runs in release.
- \`errno\` is not cleared on success. Set it to 0 before a call whose failure you check.

## Summary: the traps to memorise

| Function | Trap |
| --- | --- |
| strcpy, strcat | Unbounded — overflow |
| strncpy | Does not terminate when truncating |
| memcpy | Overlapping regions is UB — use memmove |
| strcmp | Returns 0 for equal, not 1 |
| strtok | Modifies its input, not reentrant |
| atoi | Cannot report failure |
| qsort cmp | Return the sign, not the difference |
| ctype functions | Cast the argument to unsigned char |
| sqrt, pow | Link -lm; results are approximate |
| localtime, gmtime | Shared static result |
| rand | Not suitable for security |
| system | Shell injection with untrusted input |`),
        b.anim('pipeline', {
          title: 'From source to running tool',
          badge: 'build and run',
          stages: [
            { name: 'main.c', tool: 'editor', out: 'source', detail: 'One translation unit per .c file, with a matching header for anything shared.' },
            { name: 'cc -c', tool: 'compile', out: 'main.o', detail: 'Warnings-as-errors, sanitizers in the dev build. Each .o has unresolved external symbols.' },
            { name: 'cc -c', tool: 'compile', out: 'wordcount.o', detail: 'A second translation unit. It sees only the declarations from the shared header.' },
            { name: 'cc main.o wordcount.o', tool: 'link', out: 'a.out', detail: 'Resolves symbols across objects and pulls in libc. Missing -lm shows up here, not in the compiler.' },
            { name: './a.out file.txt', tool: 'run', out: 'word frequency', detail: 'stdin/stdout/stderr as designed. Redirect stdout to a file, leave stderr for the human.' },
          ],
        }),
        b.code(
          `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <errno.h>
#include <limits.h>

/* strtol is the conversion function to use: it reports overflow and
 * where parsing stopped. atoi cannot do either. */
static int parse_int(const char *s, long *out)
{
    char *end = NULL;
    errno = 0;                          /* clear before checking */
    long v = strtol(s, &end, 10);

    if (end == s)          return -1;   /* no digits at all */
    if (*end != '\\0')      return -1;   /* trailing garbage */
    if (errno == ERANGE || v < INT_MIN || v > INT_MAX) return -1;
    *out = v;
    return 0;
}

int cmp_asc(const void *a, const void *b);   /* definition below main */

int main(int argc, char **argv)
{
    if (argc != 2) {
        fprintf(stderr, "usage: %s <integer>\\n", argv[0]);
        return 2;
    }

    long value;
    if (parse_int(argv[1], &value) != 0) {
        fprintf(stderr, "%s is not a valid int\\n", argv[1]);
        return 1;
    }
    printf("parsed %ld\\n", value);

    /* ctype requires an unsigned char value; cast every time. */
    const char *text = "Hello, 123 world!";
    size_t letters = 0, digits = 0;
    for (const char *p = text; *p != '\\0'; p++) {
        if (isalpha((unsigned char)*p)) letters++;
        if (isdigit((unsigned char)*p)) digits++;
    }
    printf("letters=%zu digits=%zu\\n", letters, digits);

    /* qsort with a correct comparator: return the sign, not the difference. */
    int data[] = { 5, 2, 9, 1, 7 };
    size_t n = sizeof data / sizeof data[0];
    qsort(data, n, sizeof data[0], cmp_asc);
    for (size_t i = 0; i < n; i++) {
        printf("%d ", data[i]);
    }
    putchar('\\n');

    return 0;
}

int cmp_asc(const void *a, const void *b)
{
    int x = *(const int *)a;
    int y = *(const int *)b;
    return (x > y) - (x < y);
}
`,
          'stdlib_tour.c'
        ),
        b.warn(
          'atoi cannot tell "0" from "not a number"',
          'atoi("abc") returns 0, and so does atoi("0"). There is no error signal at all. Use strtol or strtod, check endptr to confirm digits were consumed, and check errno for ERANGE on overflow. This is one of the first API mistakes C programmers are taught to correct.',
        ),
        b.warn(
          'strtok is not reentrant and modifies its input',
          'strtok writes NUL bytes into the string it is tokenising, so it cannot be used on a string literal and cannot tokenise two strings at once. In threaded code, two strtok calls corrupt each other. Use strtok_r (POSIX) or strsep, which take an explicit cursor.',
        ),
        b.tip(
          'memmove, not memcpy, whenever regions might overlap',
          'memcpy assumes the source and destination do not overlap; if they do, the result is undefined. Inserting into or deleting from the middle of an array shifts memory that overlaps. memmove handles overlap correctly and is exactly as fast when there is none. When in doubt, choose memmove.',
        ),
      ],
      questions: [
        [
          'Why is `atoi` discouraged in favour of `strtol`?',
          [
            'atoi is slower',
            'atoi cannot distinguish "0" from invalid input and cannot report overflow',
            'atoi only works on unsigned values',
            'atoi is not standard',
          ],
          1,
          'strtol gives an endptr showing where parsing stopped and sets errno to ERANGE on overflow, so both malformed input and out-of-range values are detectable.',
        ],
        [
          'What is wrong with `isspace(c)` when c is a `char` holding a byte above 127?',
          [
            'Nothing',
            'The argument must be an unsigned char value or EOF; passing a negative value is undefined behaviour',
            'isspace does not accept chars',
            'It is slower',
          ],
          1,
          'On platforms where char is signed, high bytes become negative ints. The ctype functions require an unsigned char value or EOF, so the correct call is isspace((unsigned char)c).',
        ],
        [
          'When must you use `memmove` instead of `memcpy`?',
          [
            'Always',
            'When the source and destination regions overlap',
            'When the size is large',
            'When copying structs',
          ],
          1,
          'memcpy requires non-overlapping regions; overlap is undefined. Shifting elements within an array is the common overlap case, and memmove handles it correctly with no speed penalty when there is no overlap.',
        ],
        [
          'What does `strncpy(dst, src, n)` do if src is at least n bytes long?',
          [
            'Copies n bytes and terminates dst',
            'Copies exactly n bytes and does NOT null-terminate dst',
            'Copies nothing',
            'Overflows dst',
          ],
          1,
          'This is the strncpy trap: no terminator is written when the source fills the buffer. Either set dst[n-1] = 0 afterwards or use snprintf, which always terminates and reports truncation.',
        ],
        [
          'Why must the ctype argument be `unsigned char`?',
          [
            'Because chars are unsigned',
            'Because the values must be representable as unsigned char or EOF; a negative signed char value is undefined behaviour',
            'Because ctype uses wide characters',
            'It is a style preference',
          ],
          1,
          'The functions accept an int whose value is that of an unsigned char or EOF. A negative char value outside that range is UB. Casting to (unsigned char) is the fix and should be a reflex.',
        ],
      ],
    },
    {
      title: 'Project: word frequency, end to end',
      summary: 'A complete program — read a file, tokenise, hash, sort, report — built from the whole course.',
      duration: 22,
      build: (b) => [
        b.md(`## The brief

Build \`wf\`: a command-line tool that reads a text file and prints the most frequent words, with counts, in descending order.

\`\`\`
$ ./wf poem.txt
  12  the
  10  and
   7  of
\`\`\`

It sounds small. It exercises almost every idea in this course:

- Command-line arguments (\`argc\`/\`argv\`)
- File reading with correct ownership (Module 12)
- Dynamic memory and growth (Module 10)
- A hash table built from arrays and pointers (Modules 8, 9, 11)
- String handling and case folding (Module 8)
- Sorting with a comparator function pointer (Module 11)
- Clean error handling and a memory-clean exit (Module 13)

That overlap is the point: a real program is the course's ideas composed, not repeated.

## Step 1 — the data model

\`\`\`c
typedef struct {
    char  *word;     /* owned by the entry */
    size_t count;
} Entry;

typedef struct {
    Entry *items;
    size_t length;
    size_t capacity;
    int    sorted;    /* memoise: sort on demand, once */
} WordTable;
\`\`\`

The table is the dynamic array from Module 10 with an \`Entry\` element type. For this size of input, a linear scan is acceptable; a hash index is the natural extension and is noted at the end.

## Step 2 — read the whole file

\`\`\`c
char *slurp(const char *path, size_t *len);   /* from Module 12 */
\`\`\`

Read into a malloc'd, NUL-terminated buffer. Ownership moves to the caller.

## Step 3 — extract and normalise words

\`\`\`c
static void normalise(char *w)
{
    for (char *p = w; *p; p++) {
        *p = (char)tolower((unsigned char)*p);   /* cast for ctype, always */
    }
}
\`\`\`

The tokeniser walks the buffer and, for each maximal run of \`isalpha\` or \`'\` characters, copies it into a temporary word buffer.

\`\`\`c
static size_t tokenise(char *text, char **words, size_t max)
{
    size_t n = 0;
    char *p = text;
    while (*p != '\\0' && n < max) {
        if (isalpha((unsigned char)*p)) {
            char *start = p;
            while (*p != '\\0' && (isalpha((unsigned char)*p) || *p == '\\'')) {
                p++;
            }
            size_t len = (size_t)(p - start);
            char *word = malloc(len + 1);
            if (word == NULL) break;
            memcpy(word, start, len);
            word[len] = '\\0';
            words[n++] = word;              /* caller owns each word */
        } else {
            p++;
        }
    }
    return n;
}
\`\`\`

Note \`(p - start)\` — pointer subtraction gives the element count, exactly as in Module 9.

## Step 4 — insert, growing the table

\`\`\`c
static bool table_insert(WordTable *t, const char *word)
{
    for (size_t i = 0; i < t->length; i++) {
        if (strcmp(t->items[i].word, word) == 0) {
            t->items[i].count++;
            return true;
        }
    }
    if (t->length == t->capacity) {
        size_t cap = t->capacity ? t->capacity * 2 : 16;
        Entry *tmp = realloc(t->items, cap * sizeof *tmp);
        if (tmp == NULL) return false;      /* t->items still valid */
        t->items = tmp;
        t->capacity = cap;
    }
    char *copy = malloc(strlen(word) + 1);
    if (copy == NULL) return false;
    strcpy(copy, word);
    t->items[t->length].word  = copy;
    t->items[t->length].count = 1;
    t->length++;
    t->sorted = 0;
    return true;
}
\`\`\`

Every line is something from earlier: the realloc-into-temporary idiom, the geometric growth, the owned copy of the word.

## Step 5 — sort with qsort and a comparator

\`\`\`c
static int cmp_entry_desc(const void *a, const void *b)
{
    const Entry *x = a;
    const Entry *y = b;
    if (x->count != y->count) {
        return (x->count < y->count) - (x->count > y->count);   /* descending */
    }
    return strcmp(x->word, y->word);                             /* tie: A-Z */
}
\`\`\`

The comparator returns the sign, never the difference of counts (which could overflow), and breaks ties deterministically. Determinism makes the tool testable.

## Step 6 — report, and free everything

\`\`\`c
static void table_free(WordTable *t)
{
    for (size_t i = 0; i < t->length; i++) {
        free(t->items[i].word);      /* free each owned word first */
    }
    free(t->items);                  /* then the array */
    t->items = NULL;
    t->length = t->capacity = 0;
}
\`\`\`

The order matters: release the inner allocations while the outer array still lets you reach them.

## The top-level flow

\`\`\`c
int main(int argc, char **argv)
{
    if (argc != 2) {
        fprintf(stderr, "usage: %s <file>\\n", argv[0]);
        return 2;
    }

    size_t len = 0;
    char *text = slurp(argv[1], &len);
    if (text == NULL) {
        perror(argv[1]);
        return 1;
    }

    char **words = malloc(/* upper bound */ (len + 1) * sizeof *words);
    if (words == NULL) { free(text); return 1; }
    size_t n = tokenise(text, words, len + 1);

    WordTable table = { NULL, 0, 0, 0 };
    for (size_t i = 0; i < n; i++) {
        if (!table_insert(&table, words[i])) {
            fprintf(stderr, "out of memory\\n");
            /* fall through to cleanup */
            n = i;
            break;
        }
    }

    qsort(table.items, table.length, sizeof table.items[0], cmp_entry_desc);

    const size_t top = table.length < 10 ? table.length : 10;
    for (size_t i = 0; i < top; i++) {
        printf("%5zu  %s\\n", table.items[i].count, table.items[i].word);
    }

    /* one cleanup path, in the right order */
    for (size_t i = 0; i < n; i++) free(words[i]);
    free(words);
    free(text);
    table_free(&table);
    return 0;
}
\`\`\`

The cleanup is the part that separates a working program from a toy. Every allocation is freed on every path, including the error path, and the frees happen in the reverse order of the allocations. This is what Valgrind's "0 bytes in 0 blocks lost" means.

## Making it a hash table

The linear scan in \`table_insert\` is O(entries) per word, so the whole tool is O(n·m). The fix is a hash index: a fixed-size array of buckets, each bucket a small dynamic array of indices into \`table.items\`.

\`\`\`c
typedef struct {
    size_t  *indices;
    size_t   length;
    size_t   capacity;
} Bucket;

static size_t hash_string(const char *s)
{
    size_t h = 1469598103934665603ULL;      /* FNV-1a */
    for (const unsigned char *p = (const unsigned char *)s; *p; p++) {
        h ^= *p;
        h *= 1099511628211ULL;
    }
    return h;
}
\`\`\`

The table then hashes the word, looks only in that bucket, and appends the index. That turns the tool from quadratic to near-linear. It is the same dynamic-array code as before, applied to a second structure — which is the real lesson: the containers are a small set of shapes from Module 10, reused.

## Testing it

Complete programs are tested at the boundary, not the middle:

\`\`\`
printf 'a a b\\n' > t.txt && ./wf t.txt
# expect: 2 a, 1 b
\`\`\`

And run it under the tools until they are silent:

\`\`\`
gcc -Wall -Wextra -Werror -fsanitize=address,undefined -g -O1 wf.c -o wf
valgrind --leak-check=full --error-exitcode=1 ./wf t.txt
echo $?      # must be 0
\`\`\`

A program that passes its tests under ASan and Valgrind is a program whose memory behaviour is actually known, which is a higher bar than "it printed the right answer once".

## Extensions, each a course review

- **\`--top N\`** — argument parsing with \`strtol\` (Module 14).
- **Stop words** — a second file of words to ignore (Modules 12, 14).
- **Binary output** — write the table to a file with \`fwrite\` (Module 12).
- **Multi-file** — split the table into \`wordtable.c\`/\`.h\` (Module 12's header/implementation split).
- **Streaming** — process the file in chunks instead of slurping it, so it works on files larger than memory (Module 10).
- **Unicode** — a genuinely hard extension that requires a library, and a good illustration of when to stop writing things yourself.

## What this project demonstrates

A tool that is maybe two hundred lines, and it uses every module: control flow for the tokeniser, arrays and strings for the words, pointers throughout, dynamic memory for the table, structs for the entries, enums nowhere but function pointers for \`qsort\`, files for the input, the C library for \`strcmp\`/\`qsort\`/\`tolower\`, and the safety rules to make it clean under Valgrind.

That composition — not any single feature — is what it means to know C.`),
        b.anim('nodes', {
          title: 'The word table: array plus owned strings',
          badge: 'ownership',
          steps: [
            {
              caption:
                'The WordTable owns one dynamic array of Entry values and is not yet allocated.',
              note: 'The struct on the stack is three counters and a pointer. The entries live on the heap, which lets the table grow at run time.',
              tail: 'table',
              nodes: [{ id: 't', data: 'WordTable', note: 'length=0 cap=0' }],
            },
            {
              caption:
                'First insert allocates capacity 16. The array holds Entry {word, count}.',
              note: 'The geometric growth factor from Module 10. Growing by one would make inserting n words O(n²).',
              tail: 'table',
              nodes: [
                { id: 't', data: 'items', note: 'cap 16', pointsTo: 'e0' },
                { id: 'e0', data: '{"the", 1}', note: 'Entry[0]' },
              ],
              freeList: [],
            },
            {
              caption:
                'Inserting a seen word increments its count in place and allocates nothing.',
              note: 'The linear scan finds the existing entry with strcmp. Only a new word allocates. This is why the table stores one entry per distinct word, not one per occurrence.',
              tail: 'table',
              nodes: [
                { id: 't', data: 'items', note: 'cap 16', pointsTo: 'e0' },
                { id: 'e0', data: '{"the", 2}', note: 'Entry[0]' },
                { id: 'e1', data: '{"and", 1}', note: 'Entry[1]' },
              ],
            },
            {
              caption:
                'Each new word gets its own malloc’d copy, owned by its Entry.',
              note: 'The entries own the strings, and the table owns the array. Freeing must go inner-to-outer: each word, then the array. Get the order wrong and every string leaks.',
              tail: 'table',
              nodes: [
                { id: 't', data: 'items', note: 'cap 16', pointsTo: 'e0' },
                { id: 'e0', data: '{"the", 12}', note: 'owns strdup("the")' },
                { id: 'e1', data: '{"and", 10}', note: 'owns strdup("and")' },
                { id: 'e2', data: '{"of", 7}', note: 'owns strdup("of")' },
              ],
            },
            {
              caption:
                'table_free frees each word, then the array, then resets the struct.',
              note: 'The mirror image of insertion, in reverse order. This is what makes Valgrind report "0 bytes in 0 blocks lost".',
              tail: 'table',
              nodes: [{ id: 't', data: 'items', note: 'NULL, length=0 cap=0' }],
              freeList: ['the', 'and', 'of', 'Entry[16] array'],
            },
          ],
        }),
        b.code(
          `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <stdbool.h>
#include <errno.h>
#include <stddef.h>

/* ---- ownership: caller must free() the returned buffer, or NULL on error ---- */
static char *slurp(const char *path, size_t *out_len)
{
    FILE *f = fopen(path, "rb");
    if (f == NULL) return NULL;
    if (fseek(f, 0, SEEK_END) != 0) { fclose(f); return NULL; }
    long size = ftell(f);
    if (size < 0) { fclose(f); return NULL; }
    rewind(f);

    char *buf = malloc((size_t)size + 1);
    if (buf == NULL) { fclose(f); return NULL; }
    size_t got = fread(buf, 1, (size_t)size, f);
    buf[got] = '\\0';
    if (out_len) *out_len = got;
    fclose(f);
    return buf;
}

typedef struct { char *word; size_t count; } Entry;
typedef struct { Entry *items; size_t length, capacity; } WordTable;

static bool table_insert(WordTable *t, const char *word)
{
    for (size_t i = 0; i < t->length; i++) {
        if (strcmp(t->items[i].word, word) == 0) {
            t->items[i].count++;
            return true;
        }
    }
    if (t->length == t->capacity) {
        size_t cap = t->capacity ? t->capacity * 2 : 16;
        Entry *tmp = realloc(t->items, cap * sizeof *tmp);
        if (tmp == NULL) return false;
        t->items = tmp;
        t->capacity = cap;
    }
    size_t len = strlen(word);
    char *copy = malloc(len + 1);
    if (copy == NULL) return false;
    memcpy(copy, word, len + 1);
    t->items[t->length].word  = copy;
    t->items[t->length].count = 1;
    t->length++;
    return true;
}

static int cmp_desc(const void *a, const void *b)
{
    const Entry *x = a, *y = b;
    if (x->count != y->count) return (x->count < y->count) - (x->count > y->count);
    return strcmp(x->word, y->word);
}

static void table_free(WordTable *t)
{
    for (size_t i = 0; i < t->length; i++) free(t->items[i].word);
    free(t->items);
    t->items = NULL;
    t->length = t->capacity = 0;
}

int main(int argc, char **argv)
{
    if (argc != 2) {
        fprintf(stderr, "usage: %s <file>\\n", argv[0]);
        return 2;
    }

    size_t len = 0;
    char *text = slurp(argv[1], &len);
    if (text == NULL) { perror(argv[1]); return 1; }

    WordTable table = { NULL, 0, 0 };
    char *save = NULL;
    for (char *tok = strtok_r(text, " \\t\\r\\n.,;:!?\\"()", &save);
         tok != NULL;
         tok = strtok_r(NULL, " \\t\\r\\n.,;:!?\\"()", &save)) {
        for (char *p = tok; *p; p++) *p = (char)tolower((unsigned char)*p);
        if (!table_insert(&table, tok)) {
            fprintf(stderr, "out of memory\\n");
            free(text);
            table_free(&table);
            return 1;
        }
    }

    qsort(table.items, table.length, sizeof table.items[0], cmp_desc);
    for (size_t i = 0; i < table.length && i < 10; i++) {
        printf("%5zu  %s\\n", table.items[i].count, table.items[i].word);
    }

    free(text);
    table_free(&table);
    return 0;
}
`,
          'wordfreq.c'
        ),
        b.tip(
          'Every allocation gets a free on every path',
          'The mark of finished C is that the error path frees exactly as much as the success path. Write the cleanup once, at the end, in reverse order of allocation, and route every failure through it. This is why wordfreq.c frees text and the table even in the OOM branch.',
        ),
        b.info(
          'Build with sanitizers and Valgrind, then trust the result',
          'gcc -Wall -Wextra -Werror -fsanitize=address,undefined -g -O1 wordfreq.c -o wf, then valgrind --leak-check=full --error-exitcode=1 ./wf file.txt. A clean report from both is a much stronger statement than a correct output on one input.',
        ),
      ],
      questions: [
        [
          'In the word-frequency table, who owns each word string?',
          [
            'The input buffer',
            'The Entry that stores it; table_free frees each one',
            'The operating system',
            'Nobody — it is leaked on purpose',
          ],
          1,
          'table_insert mallocs a copy per new word and stores it in the Entry. table_free releases each word before releasing the array, the inner-to-outer order that avoids leaks.',
        ],
        [
          'Why use `realloc` into a temporary inside table_insert?',
          [
            'For speed',
            'So a failed realloc leaves the existing items array valid instead of leaking it',
            'Because realloc requires it',
            'To avoid warnings',
          ],
          1,
          'Assigning the result straight back to t->items overwrites the only pointer to the array if realloc fails, leaking it. The temporary keeps the old pointer alive on the failure path.',
        ],
        [
          'Why does cmp_desc return `(x->count < y->count) - (x->count > y->count)`?',
          [
            'It is faster than an if',
            'It returns -1, 0, or 1 without the risk of overflowing a subtraction of two counts',
            'It sorts ascending',
            'qsort requires exactly 1',
          ],
          1,
          'The comparison yields 0 or 1 in each relational expression, so the difference is -1, 0, or 1. Returning x->count - y->count could overflow for large size_t values, which is the classic qsort comparator bug.',
        ],
        [
          'Why is the tokeniser O(n·m) without a hash index, and how does hashing fix it?',
          [
            'It rereads the file each time; hashing caches it',
            'Each insert linearly scans all distinct words; a hash index narrows the search to one bucket, near O(1)',
            'strlen is quadratic; hashing replaces it',
            'It is already O(n)',
          ],
          1,
          'table_insert scans every existing entry to check for a duplicate. Hashing the word selects one bucket, so only a few entries are compared, turning the overall run near-linear.',
        ],
        [
          'What does a Valgrind report of "0 bytes in 0 blocks lost" tell you?',
          [
            'The program is fast',
            'Every allocation was freed, including on the error paths that were exercised',
            'The program has no bugs',
            'Nothing useful',
          ],
          1,
          'It confirms no leaks for the inputs tested. It is not a proof of full correctness — untested paths could still leak — but it is the standard bar for a memory-clean C tool.',
        ],
      ],
    },
  ]
);
