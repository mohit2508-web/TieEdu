// Module 12 — Files and the preprocessor.
// The FILE abstraction and the actual text-substitution phase, including the
// macro pitfalls that the preprocessor's history is made of.

import { mod } from '../blocks';

export const M12 = mod(
  'crs-c-programming',
  'c-m12',
  12,
  'Module 12 — Files and the preprocessor',
  'stdin/stdout/stderr, fopen and fread/fwrite, text versus binary, and the preprocessor in detail.',
  [
    {
      title: 'Streams, stdio, and text files',
      summary: 'stdin/stdout, the FILE handle, opening modes, and formatted versus raw I/O.',
      duration: 17,
      build: (b) => [
        b.md(`## Everything is a stream

C does not present files as a special language feature. It presents a uniform abstraction called a **stream**: an ordered sequence of bytes that you read from or write to. The same functions work on files, the terminal, pipes, and sockets.

Three streams are open before \`main\` begins:

\`\`\`c
stdin     /* standard input  — the keyboard by default */
stdout    /* standard output — the terminal by default, buffered */
stderr    /* standard error  — the terminal by default, unbuffered */
\`\`\`

All three are of type \`FILE *\`, declared in \`<stdio.h>\`.

## The FILE handle

\`\`\`c
#include <stdio.h>

FILE *f = fopen("data.txt", "r");
if (f == NULL) {
    perror("fopen");      /* prints "fopen: No such file or directory" to stderr */
    return 1;
}
/* ... use f ... */
fclose(f);                /* always close what you open */
\`\`\`

\`FILE\` is an opaque struct. You never inspect its members; you hold a pointer and pass it to the library. The pointer is your handle to the open stream.

Note the \`NULL\` check. \`fopen\` fails for a missing file, a permission problem, too many open files, or a bad path, and it signals failure by returning \`NULL\`. Writing through a \`NULL\` FILE is undefined behaviour. **Every \`fopen\` needs a check.**

\`perror\` is the right function for reporting I/O errors: it prints your message followed by the system's description of the current \`errno\`. \`fprintf(stderr, ...)\` does not.

## Open modes

| Mode | Reads | Writes | On existing file | Creates if missing |
| --- | --- | --- | --- | --- |
| \`"r"\` | yes | no | — | no (fails) |
| \`"w"\` | no | yes | truncates to zero | yes |
| \`"a"\` | no | yes | appends at end | yes |
| \`"r+"\` | yes | yes | — | no |
| \`"w+"\` | yes | yes | truncates | yes |
| \`"a+"\` | yes | yes | appends | yes |

Add \`b\` for binary mode (\`"rb"\`, \`"wb"\`). On Unix there is no difference; on Windows it suppresses the translation of \`\\n\` to \`\\r\\n\`, which is the whole reason the distinction exists.

The one that catches people out is \`"w"\`: **it destroys the file's contents immediately on open**, before you have written anything. If the program crashes after the \`fopen\`, the file is now empty. To update a file safely, write to a temporary and rename over the original.

## Formatted I/O versus raw I/O

Two families, and mixing them without care causes bugs.

**Formatted:**

\`\`\`c
fprintf(f, "%s = %d\\n", key, value);
fscanf(f, "%d %d", &a, &b);
\`\`\`

Text-oriented, convenient, and — for \`fscanf\` — notoriously hard to use robustly. A \`fscanf\` that matches fewer fields than expected leaves the input position somewhere unexpected, and checking its return value is mandatory.

**Raw / binary:**

\`\`\`c
fwrite(data, sizeof *data, count, f);      /* count elements of sizeof *data */
size_t n = fread(buf, sizeof *buf, count, f);
\`\`\`

\`fwrite\` and \`fread\` move bytes with no interpretation. They return the number of **complete elements** transferred, which is what you check:

\`\`\`c
size_t got = fread(buf, sizeof *buf, count, f);
if (got < count && ferror(f)) {
    /* a real read error */
} else if (got < count && feof(f)) {
    /* EOF: got is the number of complete elements available */
}
\`\`\`

The classic mistake is using \`fread\` to read a whole struct with padding, then \`fwrite\`ing it back on a different compiler: padding bytes and endianness differ, so the file is not portable. Serialise field by field for anything that crosses a machine boundary.

## Reading a line: fgets

\`\`\`c
char line[256];
while (fgets(line, sizeof line, stdin) != NULL) {
    /* line includes the trailing \\n if it fit */
    line[strcspn(line, "\\n")] = '\\0';
    printf("read: %s\\n", line);
}
\`\`\`

\`fgets\` reads at most \`sizeof line - 1\` characters, always terminates the buffer, and keeps the newline if there was room. It is the bounded replacement for \`gets\`. Note the trade-off: if the line is longer than the buffer, \`fgets\` returns the first chunk now and the rest on the next call, so a naive loop treats one logical line as several. Handling that properly means concatenating into a dynamically grown buffer.

## Writing characters and text

\`\`\`c
fputc('A', f);
fputs("hello\\n", f);        /* no formatting, no terminator added */
fprintf(f, "%d\\n", 42);
\`\`\`

## Standard streams, and why stderr matters

\`\`\`c
printf("processing...");            /* stdout, buffered — may not appear until a newline or flush */
fprintf(stderr, "error: bad input\\n");   /* stderr, unbuffered — appears immediately */
\`\`\`

stdout is **line-buffered** when connected to a terminal and fully buffered when redirected to a file or a pipe. That is why a program that prints progress with \`printf\` and then crashes can show no output when its output goes to a file: the buffer was never flushed. \`stderr\` is unbuffered, so error messages always appear.

Rules that follow:

- Diagnostics to \`stderr\`, normal output to \`stdout\`.
- Add \`\\n\` to flush a line-buffered stream, or call \`fflush(stdout)\` explicitly.
- A tool's output can be piped cleanly only if errors do not go to stdout.

## Buffering, flushing, and closing

\`\`\`c
fflush(f);      /* push buffered writes to the OS now */
fclose(f);      /* flush and release. Returns EOF on error, so check it */
\`\`\`

\`fclose\` flushes and closes. Its return value matters for output files: a full disk surfaces at \`fclose\`, not at the individual \`fwrite\`s, because of buffering. Checking only the writes can miss a truncated file.

Buffering is a performance feature. Writing to disk one byte at a time is thousands of times slower than writing a full buffer; stdio batches the work. You almost never need to disable it, but you should understand that your writes are not on disk until the flush.

## File position: seek and tell

\`\`\`c
long pos = ftell(f);                       /* current offset */
fseek(f, 0, SEEK_SET);                     /* go to the start */
fseek(f, -4, SEEK_END);                    /* four bytes before the end */
size_t n = fread(buf, 1, 4, f);
fseek(f, pos, SEEK_SET);                   /* back to where we were */
\`\`\`

\`ftell\`/\`fseek\` use \`long\`, which is 32-bit on some platforms and cannot address files over 2 GB there. For large files use \`fseeko\`/\`ftello\` (POSIX) with \`off_t\`, or \`_fseeki64\` on MSVC. This is a real portability trap.

## A complete read-file example

\`\`\`c
#include <stdio.h>
#include <stdlib.h>

/* Reads a whole file into a malloc'd, NUL-terminated buffer.
 * Returns NULL on any error; caller frees. */
char *read_file(const char *path, size_t *out_len)
{
    FILE *f = fopen(path, "rb");
    if (f == NULL) {
        return NULL;
    }

    if (fseek(f, 0, SEEK_END) != 0) { fclose(f); return NULL; }
    long size = ftell(f);
    if (size < 0) { fclose(f); return NULL; }
    rewind(f);

    char *buf = malloc((size_t)size + 1);
    if (buf == NULL) { fclose(f); return NULL; }

    size_t got = fread(buf, 1, (size_t)size, f);
    if (got != (size_t)size && ferror(f)) {   /* a real read failure */
        free(buf);
        fclose(f);
        return NULL;
    }

    buf[got] = '\\0';
    if (out_len != NULL) *out_len = got;
    fclose(f);
    return buf;
}
\`\`\`

Note that this returns an error-pointer and transfers ownership to the caller, the pattern from Module 10.

## A note on text versus binary

On Unix there is no distinction at the file level: every file is bytes and \`\\n\` is a single byte 0A. On Windows, text mode translates \`\\n\` to \`\\r\\n\` on write and back on read, and treats an embedded Ctrl-Z (0x1A) as end of file. This is why:

- Portably reading a binary file requires \`"rb"\`.
- Sizes reported by \`ftell\` in text mode may not match the byte count.
- A file written in text mode on Windows and read in text mode on Windows round-trips, but mixing modes does not.

When you care about exact bytes, open in binary mode on every platform.

## Errors, and errno

\`\`\`c
#include <errno.h>
#include <string.h>

FILE *f = fopen("/no/such/path", "r");
if (f == NULL) {
    fprintf(stderr, "fopen failed: %s\\n", strerror(errno));
}
\`\`\`

I/O errors are reported through \`errno\` (a global, per-thread in practice) and the function's return value. \`perror\` and \`strerror\` translate \`errno\` into a message. Reset \`errno = 0\` before a call whose failure you check, because a success does not clear it — a common cause of reporting a stale error.`),
        b.anim('pipeline', {
          title: 'The preprocessor, then the compiler',
          badge: 'translation phases',
          stages: [
            { name: 'Source', tool: '.c file', in: 'your code', out: 'text with #directives', detail: 'The file as you wrote it.' },
            { name: 'Preprocess', tool: 'cpp', in: '#include, #define', out: 'expanded translation unit', detail: 'Headers pasted in, macros expanded, conditionals resolved. Text in, text out.' },
            { name: 'Compile', tool: 'cc1', in: 'C source', out: 'assembly', detail: 'Syntax, types, and (weak) semantic checks. Optimisation happens here.' },
            { name: 'Assemble', tool: 'as', in: 'assembly', out: 'object .o', detail: 'One object file per source file, with unresolved external symbols.' },
            { name: 'Link', tool: 'ld', in: '.o + libraries', out: 'executable', detail: 'Resolves symbols, pulls in libc. Raw #define never appears in a debugger; enum names do.' },
          ],
        }),
        b.code(
          `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>

/* Read a whole file into a malloc'd, NUL-terminated buffer.
 * Returns NULL on error; the caller owns and frees the buffer. */
static char *read_file(const char *path, size_t *out_len)
{
    FILE *f = fopen(path, "rb");
    if (f == NULL) {
        return NULL;
    }

    if (fseek(f, 0, SEEK_END) != 0) { fclose(f); return NULL; }
    long size = ftell(f);
    if (size < 0) { fclose(f); return NULL; }
    rewind(f);

    char *buf = malloc((size_t)size + 1);
    if (buf == NULL) { fclose(f); return NULL; }

    size_t got = fread(buf, 1, (size_t)size, f);
    if (got != (size_t)size && ferror(f)) {
        free(buf);
        fclose(f);
        return NULL;
    }
    buf[got] = '\\0';
    if (out_len != NULL) *out_len = got;
    fclose(f);
    return buf;
}

static int write_file(const char *path, const char *text)
{
    FILE *f = fopen(path, "w");        /* truncates immediately */
    if (f == NULL) {
        fprintf(stderr, "cannot write %s: %s\\n", path, strerror(errno));
        return -1;
    }
    if (fputs(text, f) == EOF) {
        fclose(f);
        return -1;
    }
    if (fclose(f) != 0) {              /* check: buffered errors surface here */
        return -1;
    }
    return 0;
}

int main(void)
{
    const char *path = "demo_output.txt";
    if (write_file(path, "line one\\nline two\\n") != 0) {
        return 1;
    }

    size_t len = 0;
    char *content = read_file(path, &len);
    if (content == NULL) {
        perror("read_file");
        return 1;
    }

    printf("read %zu bytes:\\n%s", len, content);
    free(content);
    remove(path);

    /* Standard streams: diagnostics to stderr, results to stdout. */
    fprintf(stderr, "note: this goes to stderr and is never buffered away\\n");

    return 0;
}
`,
          'file_io.c'
        ),
        b.table(
          'fopen modes',
          ['Mode', 'Read', 'Write', 'Existing file', 'If missing'],
          [
            ['"r"', 'yes', 'no', 'untouched', 'fails with NULL'],
            ['"w"', 'no', 'yes', 'TRUNCATED on open', 'created'],
            ['"a"', 'no', 'yes', 'appended', 'created'],
            ['"r+"', 'yes', 'yes', 'untouched', 'fails'],
            ['"w+"', 'yes', 'yes', 'TRUNCATED', 'created'],
            ['"a+"', 'yes', 'yes', 'appended', 'created'],
            ['"rb"', 'yes', 'no', 'untouched', 'fails — binary'],
            ['"wb"', 'no', 'yes', 'TRUNCATED', 'created — binary'],
          ]
        ),
        b.warn(
          'Check every fopen, and never use "w" to update a file in place',
          '"w" truncates the file the moment it is opened. If your program fails after that, the original content is already destroyed. To update safely: open a temporary file for writing, transform the data, fclose and check the result, then rename() the temporary over the original. rename is atomic on the same filesystem, so a crash leaves either the old file or the new one, never a truncated one.',
        ),
        b.tip(
          'Diagnostics go to stderr, always',
          'stdout is for the program’s data and is meant to be pipeable; stderr is for humans and is never redirected by the piping that consumes stdout. Mixing them means a user who does `tool > out.txt` gets error messages inside their data file. fprintf(stderr, ...) and perror() are the two functions to reach for.',
        ),
      ],
      questions: [
        [
          'What does `fopen("data.txt", "w")` do to an existing file before you write anything?',
          [
            'Nothing until the first fwrite',
            'Truncates it to zero bytes immediately on open',
            'Renames it to a backup',
            'Fails if the file exists',
          ],
          1,
          'The truncation happens at open. To update a file safely, write to a temporary and rename it over the original, so a crash never leaves a truncated file.',
        ],
        [
          'Which stream is unbuffered, so error messages appear immediately?',
          [
            'stdin',
            'stdout',
            'stderr',
            'All are buffered',
          ],
          2,
          'stderr is unbuffered by default, while stdout is line-buffered to a terminal and fully buffered when redirected. That is why progress printed with printf can vanish on a crash but an error printed with fprintf(stderr,...) always shows.',
        ],
        [
          'What does `fread(buf, sizeof *buf, count, f)` return?',
          [
            'The number of bytes read',
            'The number of complete elements read, which may be less than count at EOF or on error',
            'Always count',
            'A pointer',
          ],
          1,
          'The middle argument is the element size and the return is the element count. Multiply by the element size if you need bytes, and distinguish EOF from error with feof and ferror.',
        ],
        [
          'Why can reading a whole struct with fread and writing it back be non-portable?',
          [
            'fread does not work on structs',
            'Padding bytes and byte order are implementation-defined, so a different compiler may not agree on the layout',
            'Structs must be cast to char* first',
            'It is always portable',
          ],
          1,
          'The in-memory representation includes padding and endianness. Serialise field by field for any data that must survive a compiler change or cross a machine.',
        ],
        [
          'What is the correct replacement for the removed `gets(buf)`?',
          [
            'scanf("%s", buf)',
            'fgets(buf, sizeof buf, stdin)',
            'read(buf)',
            'fread(buf)',
          ],
          1,
          'fgets takes a bound and always terminates. scanf("%s") is equally unbounded and equally dangerous; if you use scanf you must write an explicit width such as %255s.',
        ],
      ],
    },
    {
      title: 'The preprocessor in detail',
      summary: '#include, #define, macros with arguments, conditional compilation, and the traps.',
      duration: 18,
      build: (b) => [
        b.md(`## The preprocessor is a text tool

Before the compiler sees a single line, the preprocessor processes *text*: it pastes in included files, expands macros, and includes or excludes regions based on conditions. It knows nothing about types, scopes, or syntax. Every preprocessor bug is ultimately a text-substitution surprise.

## #include

\`\`\`c
#include <stdio.h>        /* angle brackets: the system include path */
#include "myheader.h"     /* quotes: the current directory first, then the system path */
\`\`\`

The two forms differ in search order, and conflating them is a source of "it compiled on my machine" bugs.

Use **include guards** to make a header safe to include more than once:

\`\`\`c
#ifndef MYHEADER_H
#define MYHEADER_H

/* declarations */

#endif /* MYHEADER_H */
\`\`\`

Without the guard, a header included twice defines everything twice, which is a compile error for types and structs. All modern compilers also support \`#pragma once\`, which is shorter and non-standard but universally implemented; the guard is the portable choice.

## #define: object-like macros

\`\`\`c
#define PI 3.14159265358979
#define MAX(a, b) ((a) > (b) ? (a) : (b))
#define ARRAY_LEN(a) (sizeof (a) / sizeof (a)[0])
\`\`\`

Object-like macros are simple text replacement. The two places they shine:

\`\`\`c
#define MAX_BUFFER 4096
#define VERSION_STRING "2.1.0"
\`\`\`

For constants, however, prefer:

\`\`\`c
#define MAX_BUFFER 4096
static const int MAX_BUFFER = 4096;    /* typed, scoped, visible in a debugger */
enum { MAX_BUFFER = 4096 };            /* integer constant usable in array sizes */
\`\`\`

The enum form is the best of both: it is a real compile-time integer constant (so it can size an array or a \`case\` label) and it is a named symbol. Use \`#define\` only where you need genuine textual substitution.

## Function-like macros: and why to parenthesise everything

\`\`\`c
/* WRONG */
#define SQUARE(x) x * x
SQUARE(1 + 2)          /* expands to 1 + 2 * 1 + 2 = 5, not 9 */

/* RIGHT */
#define SQUARE(x) ((x) * (x))
SQUARE(1 + 2)          /* ((1 + 2) * (1 + 2)) = 9 */
\`\`\`

The rule is absolute: **parenthesise every parameter and the entire body.** Without the outer parentheses, \`2 * SQUARE(3)\` becomes \`2 * (3 * 3)\` only by luck — with \`#define ADD(a,b) a+b\`, it becomes \`2 * 3 + 4\` instead of \`2 * (3 + 4)\`.

## Macros with side effects

\`\`\`c
#define MAX(a, b) ((a) > (b) ? (a) : (b))

int i = 0;
int m = MAX(i++, 10);      /* i++ is evaluated TWICE */
\`\`\`

The macro can evaluate an argument more than once, so an argument with a side effect (like \`i++\`) has the side effect more than once. This is undefined and often bizarre. There is no fix inside the preprocessor — the fix is to use a function, or \`static inline\`:

\`\`\`c
static inline int max_int(int a, int b)
{
    return a > b ? a : b;
}
\`\`\`

A \`static inline\` function is type-checked, evaluates each argument exactly once, and the compiler inlines it. **For anything with a side effect or a type, a function wins over a macro on every axis.**

## Macros that create scope problems

\`\`\`c
#define BEGIN {
#define END }
\`\`\`

These work, and they are a bad idea. They turn C into a different language that the compiler does not understand well (error messages point at the macro use, not its definition), and every reader now needs the macro list to parse the file.

## Stringification and token pasting

\`\`\`c
#define STR(x) #x          /* # stringifies the argument */
#define CAT(a, b) a##b     /* ## pastes tokens together */

const char *name = STR(hello);      /* "hello" */
int CAT(foo, bar) = 1;              /* int foobar = 1; */
\`\`\`

These are the two operators that make macros more than text substitution, and they are genuinely useful in logging and test frameworks:

\`\`\`c
#define ASSERT(cond) \\
    do { \\
        if (!(cond)) { \\
            fprintf(stderr, "%s:%d: assertion failed: %s\\n", \\
                    __FILE__, __LINE__, #cond); \\
        } \\
    } while (0)
\`\`\`

## The do-while(0) idiom

\`\`\`c
#define LOG(msg) printf("%s\\n", msg)

if (x)
    LOG("yes");        /* expands to: if (x) printf(...);   fine */
else
    LOG("no");         /* expands to: else printf(...);     broken! */
\`\`\`

A multi-statement macro without protection breaks an \`if\`/\`else\`. The fix:

\`\`\`c
#define LOG(msg) \\
    do { \\
        printf("%s\\n", msg); \\
    } while (0)
\`\`\`

The \`do { ... } while (0)\` is a single statement that requires a semicolon after it, exactly like a function call. Every multi-statement macro should be written this way. It is one of the few C idioms that has no alternative.

## Conditional compilation

\`\`\`c
#if defined(_WIN32)
    #include <windows.h>
#elif defined(__linux__)
    #include <sys/socket.h>
#else
    #error "unsupported platform"
#endif
\`\`\`

\`#ifdef NAME\` is shorthand for \`#if defined(NAME)\`. The forms you will use:

- \`#ifdef\` / \`#ifndef\` / \`#endif\` — presence of a macro.
- \`#if\` / \`#elif\` / \`#else\` — arithmetic on integer constants; **cannot use \`sizeof\` or variables**, because it runs before the compiler.
- \`#error "message"\` — stop the build with a message. Use it for unsatisfiable configurations.
- \`#pragma once\` — include-once, non-standard but universal.

## Debug-only code

\`\`\`c
#ifdef DEBUG
    #define log_dbg(...) fprintf(stderr, __VA_ARGS__)
#else
    #define log_dbg(...) ((void)0)
#endif
\`\`\`

\`__VA_ARGS__\` is the variable-argument form. The disabled version expands to a no-op that still parses, so a call site needs no \`#ifdef\` around it.

## Predefined macros you should know

\`\`\`c
__FILE__      /* the current source file name */
__LINE__      /* the current line number */
__func__      /* the enclosing function name (C99) */
__DATE__      /* compilation date */
__TIME__      /* compilation time */
__STDC__      /* 1 for a conforming implementation */
__STDC_VERSION__   /* e.g. 201112L for C11 */
\`\`\`

\`__FILE__\` and \`__LINE__\` are the backbone of every logging macro and assertion library.

## Why macros are the last resort

Macros are powerful and unhygienic: they capture names from the call site, they evaluate arguments more than once, they have no type, and the debugger cannot see them. The modern preference, in order:

1. A function, for anything with a type and a value.
2. \`static inline\` when you need the performance of inlining and the safety of a function.
3. An \`enum\` for integer constants.
4. A macro only for things a function cannot do: stringification, token pasting, conditional compilation, and capturing \`__FILE__\`/\`__LINE__\` at the call site.

The C standard library's own \`assert\` macro is a good model: it captures \`__FILE__\` and \`__LINE__\` at the call site (only a macro can), but it delegates the actual message formatting to a function. Use macros for capture, not for logic.

## A worked header and source

\`\`\`c
/* geometry.h */
#ifndef GEOMETRY_H
#define GEOMETRY_H

typedef struct { double x, y; } Vec2;

Vec2    vec_add(Vec2 a, Vec2 b);
double  vec_dot(Vec2 a, Vec2 b);
#define vec_len2(v) ((v).x * (v).x + (v).y * (v).y)

#endif /* GEOMETRY_H */
\`\`\`

\`\`\`c
/* geometry.c */
#include "geometry.h"

Vec2 vec_add(Vec2 a, Vec2 b) { return (Vec2){a.x + b.x, a.y + b.y}; }
double vec_dot(Vec2 a, Vec2 b) { return a.x * b.x + a.y * b.y; }
\`\`\`

Note the macro uses parentheses around \`(v)\` so it works when passed a compound literal or an expression. That is the rule applied correctly.`),
        b.anim('pipeline', {
          title: 'What each #define becomes before the compiler runs',
          badge: 'text in, text out',
          stages: [
            { name: '#define MAX 100', tool: 'object-like', in: 'MAX', out: '100', detail: 'Plain text replacement. The token MAX is replaced everywhere it appears, including inside strings produced by other macros.' },
            { name: '#define SQR(x) ((x)*(x))', tool: 'function-like', in: 'SQR(a+b)', out: '((a+b)*(a+b))', detail: 'The parameter is substituted textually, then the whole body is re-scanned for more macros.' },
            { name: 'Missing parentheses', tool: 'hazard', in: 'SQR(1+2)', out: '1+2*1+2 = 5', detail: 'Without the parentheses the substitution binds wrongly. This is the reason every parameter and the body must be wrapped.' },
            { name: 'MAX(i++, 10)', tool: 'hazard', in: 'i++', out: 'i++ evaluated twice', detail: 'A macro can evaluate an argument more than once. A static inline function evaluates each argument exactly once and is type-checked.' },
            { name: '#ifdef DEBUG', tool: 'conditional', in: 'debug region', out: 'included or removed', detail: 'The region is kept or deleted before compilation. The compiler never sees the excluded branch, so it cannot warn about it.' },
          ],
        }),
        b.code(
          `#include <stdio.h>

/* Include guards are the portable include-once mechanism. */
#ifndef DEMO_H
#define DEMO_H
enum { BUFFER_SIZE = 4096 };    /* a real compile-time constant symbol */
#define VERSION "1.0.3"
#endif

/* Object-like macro. Fine for a literal message and for text substitution. */
#define PROGRAM_NAME "preprocessor demo"

/* Function-like macro: parenthesise every parameter AND the whole body. */
#define SQUARE(x)      ((x) * (x))
#define MAX(a, b)      ((a) > (b) ? (a) : (b))
#define ARRAY_LEN(a)   (sizeof (a) / sizeof (a)[0])

/* Multi-statement macro: the do/while(0) wrapper makes it one statement. */
#define CHECK(cond) \\
    do { \\
        if (!(cond)) { \\
            fprintf(stderr, "%s:%d: check failed: %s\\n", \\
                    __FILE__, __LINE__, #cond); \\
        } \\
    } while (0)

/* Debug logging that costs nothing in a release build. */
#ifdef DEBUG
    #define log_dbg(...) fprintf(stderr, "debug: " __VA_ARGS__)
#else
    #define log_dbg(...) ((void)0)
#endif

/* Prefer a static inline function when types and values are involved. */
static inline int max_int(int a, int b)
{
    return a > b ? a : b;
}

int main(void)
{
    printf("%s %s\\n", PROGRAM_NAME, VERSION);
    printf("SQUARE(1 + 2) = %d\\n", SQUARE(1 + 2));   /* 9, thanks to parens */
    printf("MAX(3, 7)     = %d\\n", MAX(3, 7));
    printf("max_int(3, 7) = %d\\n", max_int(3, 7));

    int data[] = {10, 20, 30, 40};
    printf("array length  = %zu\\n", (size_t)ARRAY_LEN(data));

    CHECK(ARRAY_LEN(data) == 4);

    int i = 0;
    /* MAX(i++, 10) would evaluate i++ twice — use the function instead. */
    printf("safe max      = %d, i = %d\\n", max_int(i++, 10), i);

    log_dbg("only printed when built with -DDEBUG\\n");

    return 0;
}
`,
          'preprocessor.c'
        ),
        b.warn(
          'Never use a macro where a function will do',
          'A macro has no type, evaluates its arguments more than once, captures names from the call site, and cannot be stepped through in a debugger. #define SQUARE(x) ((x)*(x)) computes the wrong answer for SQUARE(i++) because i++ runs twice. A static inline function is type-checked, runs each argument exactly once, and the optimiser inlines it to the same machine code. Reach for the macro only when a function cannot do the job.',
        ),
        b.warn(
          'The dangling-else trap with multi-statement macros',
          'if (x) MACRO(); else ... breaks when MACRO expands to two statements, because the else binds to the second statement inside the macro. The do { ... } while (0) wrapper makes the macro a single statement and fixes it. Every multi-statement macro needs this wrapper.',
        ),
        b.tip(
          'Choose enum over #define for constants',
          'enum { MAX = 100 }; gives a named, typed, scoped, debugger-visible compile-time constant that can size an array or appear in a case label. #define MAX 100 is a text substitution with none of those properties and it leaks into any file that includes it. Use #define only for genuine text substitution.',
        ),
      ],
      questions: [
        [
          'What is `SQUARE(1 + 2)` when the macro is `#define SQUARE(x) x * x`?',
          [
            '9',
            '5, because it expands to 1 + 2 * 1 + 2',
            '6',
            'It is a compile error',
          ],
          1,
          'Without parentheses the substituted text binds by the usual operator precedence: 1 + (2*1) + 2 = 5. With ((x)*(x)) it is 9. Always parenthesise parameters and the body.',
        ],
        [
          'Why is `#define MAX(a,b) ((a)>(b)?(a):(b))` dangerous with `MAX(i++, 10)`?',
          [
            'It does not compile',
            'The macro can evaluate its argument more than once, so i++ runs twice',
            'It returns the wrong type',
            'It is fine',
          ],
          1,
          'Textual substitution repeats the argument in the expansion. A static inline function evaluates each argument exactly once and is the right tool whenever side effects or types are involved.',
        ],
        [
          'What does the `do { ... } while (0)` idiom solve?',
          [
            'Loop performance',
            'It makes a multi-statement macro usable as a single statement after an unbraced if',
            'It adds error handling',
            'It allows a macro to return a value',
          ],
          1,
          'Without it, if (x) MACRO(); else ... has the else bind to a statement inside the macro. The wrapper is a single statement that requires a trailing semicolon, like a call.',
        ],
        [
          'In `#define ASSERT(c) ... #c ...`, what does `#c` do?',
          [
            'Comment out c',
            'Stringify: turns the macro argument tokens into a string literal',
            'Paste tokens',
            'Compare c to zero',
          ],
          1,
          '# is the stringification operator. ## pastes two tokens together. Both are things only the preprocessor can do, which is the legitimate use of macros.',
        ],
        [
          'Why can a `#define` constant not be seen in the debugger, while an enum can?',
          [
            'The debugger does not support macros',
            'A #define is removed by the preprocessor before compilation, so it does not exist in the debug information; an enum is a real symbol',
            'Enums are stored in the executable as strings',
            'There is no difference',
          ],
          1,
          'The preprocessor is text-only and its output is what the compiler sees. Enum names are part of the program the compiler emits and therefore of the debug info.',
        ],
      ],
    },
  ]
);
