// Module 13 — Undefined behaviour, debugging, and safety.
// What UB actually permits, why the optimiser makes it worse, and the habits
// and tools that keep real C code honest.

import { mod } from '../blocks';

export const M13 = mod(
  'crs-c-programming',
  'c-m13',
  13,
  'Module 13 — Undefined behaviour, debugging, and safety',
  'What the standard permits, why the optimiser exploits it, and a practical safety playbook.',
  [
    {
      title: 'Undefined behaviour, precisely',
      summary: 'What it means, what the compiler is allowed to do, and why "it worked on my machine" is not evidence.',
      duration: 17,
      build: (b) => [
        b.md(`## The three levels of "not defined"

The C standard classifies every behaviour into one of four categories:

| Category | Meaning |
| --- | --- |
| **Defined** | The standard specifies exactly what happens |
| **Implementation-defined** | The implementation must choose and document a behaviour |
| **Unspecified** | The implementation chooses, but no documentation is required |
| **Undefined** | The standard imposes **no requirements whatsoever** |

Undefined behaviour (UB) is the important one and the most misunderstood. It does not mean "returns a random value". It means the standard places **no constraint at all** on what the program does.

## What "no requirements" actually permits

\`\`\`c
int a = INT_MAX;
a = a + 1;        /* signed integer overflow: UB */
\`\`\`

Because the program has UB, a conforming compiler is permitted to:

- Produce the arithmetically correct wrapped value.
- Produce zero.
- Delete the entire statement as unreachable.
- Delete code *before* the UB that would have printed something.
- Assume the UB cannot happen and optimise all checks for it away.

All of those are conforming. The key move: the compiler is allowed to assume UB never occurs when it optimises, because a correct program never triggers it.

## The classic demonstration

\`\`\`c
#include <limits.h>

int f(int x)
{
    return x + 1 > x;    /* looks like it should always be 1 (true) */
}
\`\`\`

At \`-O2\`, a real compiler emits:

\`\`\`
f:  mov eax, 1
    ret
\`\`\`

It returns 1 without looking at \`x\`, because the only input where \`x + 1 > x\` is false is \`x == INT_MAX\`, which would be signed overflow and therefore UB. Since UB cannot happen in a correct program, the compiler deletes the false case. For \`x = INT_MAX\`, the function returns 1 and the surrounding program may do anything.

This is not a compiler bug. It is the contract. Your code promised (implicitly) never to overflow, and the compiler used that promise.

## Why the optimiser makes UB dangerous

At \`-O0\` the generated code is close to the source, so UB often does the "obvious" thing. At \`-O2\` the compiler reorders, deletes, and reasons about programs using the assumption that UB does not occur. The same source can behave differently — and the difference usually appears in release builds, on customer hardware, after a long uptime.

\`\`\`c
int *p;
if (some_condition) {
    p = &value;
}
*p = 42;         /* if some_condition was false, p is indeterminate: UB */
\`\`\`

At \`-O2\` the compiler may remove the \`if\` entirely, because the store through \`p\` is UB if the condition was false — so the condition must have been true. The buffer overflow protection you thought you had is gone.

## The main UB minefield

| Category | Example | What is undefined |
| --- | --- | --- |
| Signed overflow | \`INT_MAX + 1\` | The result; also allows the compiler to assume it does not happen |
| Out-of-bounds | \`a[n]\` on \`int a[n]\` | The read/write; anything |
| Null dereference | \`*p\` with \`p == NULL\` | The access |
| Use after free | \`free(p); *p\` | The access |
| Uninitialised read | \`int x; y = x;\` | The value, and traps |
| Invalid shift | \`1 << 32\` or \`x << -1\` | The result, and sometimes the whole expression |
| Division by zero | \`x / 0\`, \`x % 0\` | The result; may raise a hardware trap |
| Strict aliasing | \`*(int*)&a_float\` | The load; the compiler may reorder |
| Modifying a literal | \`char *s = "x"; s[0] = 'y';\` | The write |
| Misaligned access | \`*(int*)(buf + 1)\` | On strict-alignment targets, a fault |
| Dereferencing dangling stack | \`returning &local\` | The access |
| Non-void function without return | falling off the end | The value, and execution past the end |

Signed overflow is the subtlest because it is invisible in the arithmetic. Note that **unsigned** overflow is defined — it wraps modulo 2^N — which is why the standard library and hash functions use \`unsigned\` for anything that will wrap.

## Unspecified versus undefined

\`\`\`c
int i = 0;
printf("%d %d\\n", i++, i++);    /* unspecified order, but only one UB: none here, just indeterminate output */
\`\`\`

Argument evaluation order is **unspecified**: the implementation picks an order and does not document it. That is different from UB: the program is still "valid", but the output depends on the compiler. The related and much worse case is:

\`\`\`c
printf("%d %d\\n", i++, i++);   /* two unsequenced modifications of i — this IS UB */
\`\`\`

Modifying the same object twice without a sequence point between the modifications is UB. The distinction matters because "unspecified" code is merely unportable; UB code is broken.

## Undefined behaviour is not theoretical

Convert these into real consequences:

- **Security.** Buffer overflow and integer overflow are the two most exploited bug classes in systems software. A signed overflow that lets an attacker bypass a bounds check is a classic.
- **Reliability.** Memory corruption surfaces as a crash far from the cause, under load, in a release build.
- **Portability.** Code that relies on UB works on one compiler at one optimisation level and breaks on another. It is not code you can maintain.

The point of this module is not to frighten you off C. It is that **C is a language whose correctness is a property of the whole program, including the parts the compiler is allowed to assume.**

## The mental model that helps

Treat the compiler as a proof assistant that has accepted a promise: "this program has no UB." Every optimisation is derived from that promise. When the promise is false, the optimisations are unsound — but the fault is in the program, not the compiler.

The practical consequences:

1. **Write code whose UB absence you can argue.** Check every bounds, every pointer, every conversion.
2. **Enable the runtime checks that catch violations.** \`-fsanitize=address,undefined\` (Module 10) turns UB into an immediate, located report.
3. **Trust the tools over the source.** A clean test run at \`-O0\` says nothing about \`-O2\`.

## A safe subset

Most production C is written in a disciplined subset. The rules that get you 90% of the way:

- Never index an array without a known bound; pass lengths everywhere.
- Never do arithmetic that can overflow signed \`int\`; use \`unsigned\`, \`size_t\`, or check first.
- Never dereference a pointer you have not checked is non-null and valid.
- Never leave a variable uninitialised.
- Never shift by an amount outside \`[0, width)\`.
- Never cast away \`const\` or reinterpret pointers except through the sanctioned methods (\`memcpy\`, \`unsigned char\`).
- Free exactly once, and set the pointer to \`NULL\`.
- Compile with \`-Wall -Wextra -Wpedantic\` and treat warnings as errors.
- Run the sanitizers in development and in CI.

## The one habit to keep

When the optimiser and the source disagree, the optimiser is usually right about the *contract* and wrong about the *intent*. The resolution is to find the UB that made the compiler's assumption legitimate, not to blame the optimiser. That shift in perspective is the difference between fighting the language and using it.`),
        b.anim('trace', {
          title: 'Signed overflow: three fates for one expression',
          badge: 'the optimiser exploits UB',
          code: `int f(int x) {\n    return x + 1 > x;   /* no overflow => always true */\n}\n\n/* At -O2 gcc emits:\n     mov eax, 1\n     ret\n   The comparison is gone. */\n\nint *p;                 /* indeterminate */\nif (flag) p = &value;\n*p = 42;                /* UB if !flag */\n\nint  h = INT_MAX;\nh = h + 1;              /* signed overflow: UB */`,
          steps: [
            {
              caption: 'The source says "x + 1 > x", which is true for every int except INT_MAX.',
              note: 'To a reader this looks like a tautology. The only counterexample is overflow, and overflow is undefined behaviour.',
              line: 2,
              vars: [{ name: 'x', value: '42' }],
            },
            {
              caption: 'The compiler reasons: a correct program never overflows. So the single false case does not exist.',
              note: 'x + 1 > x is therefore always true for every defined input. The comparison is redundant, and the whole function folds to "return 1".',
              line: 2,
            },
            {
              caption: 'At -O2 the function becomes mov eax, 1; ret. It never reads x.',
              note: 'Call it with INT_MAX and it returns 1 — but the caller has already written an expression whose result is undefined. The optimiser did exactly what the standard permits.',
              line: 6,
              vars: [{ name: 'result', value: '1 (regardless of x)' }],
              output: 'f: mov eax, 1 / ret',
            },
            {
              caption: 'The same reasoning deletes the guard for an uninitialised pointer.',
              note: 'If flag is false, *p is UB. Since UB cannot happen, the compiler concludes flag is always true, and the if collapses. The "guard" you wrote is optimised away.',
              line: 11,
              vars: [{ name: 'p', value: 'indeterminate when !flag' }],
            },
            {
              caption: 'The signed overflow itself: INT_MAX + 1. The standard specifies nothing.',
              note: 'gcc and clang optimise on the assumption that it never occurs. -fsanitize=undefined catches it and prints the exact line, converting silent UB into a report.',
              line: 15,
              vars: [{ name: 'h', value: 'INT_MAX  ← + 1 is UB' }],
            },
          ],
        }),
        b.code(
          `#include <stdio.h>
#include <limits.h>
#include <stdint.h>
#include <stddef.h>

/* ---- defined arithmetic that could have been UB ---- */

/* Unsigned overflow wraps modulo 2^N. This is defined and portable. */
static uint32_t add_mod32(uint32_t a, uint32_t b)
{
    return a + b;                 /* wraps, well-defined */
}

/* Check before a signed operation. */
static int add_int_checked(int a, int b, int *out)
{
    if ((b > 0 && a > INT_MAX - b) || (b < 0 && a < INT_MIN - b)) {
        return -1;                /* would overflow */
    }
    *out = a + b;
    return 0;
}

/* Shift bounds: the shift amount must be in [0, width). */
static uint32_t bit_at(unsigned index)
{
    if (index >= 32) {
        return 0;                 /* refuse instead of shifting by >= 32 (UB) */
    }
    return 1u << index;
}

/* Signed division avoids the INT_MIN / -1 trap, which overflows. */
static int safe_div(int a, int b, int *out)
{
    if (b == 0) return -1;
    if (a == INT_MIN && b == -1) return -1;   /* result not representable */
    *out = a / b;
    return 0;
}

int main(void)
{
    printf("UINT32_MAX + 2 wraps to %u\\n", add_mod32(UINT32_MAX, 2));

    int sum;
    if (add_int_checked(INT_MAX, 1, &sum) != 0) {
        printf("would have overflowed — refused\\n");
    }

    printf("bit 5 = %u, bit 40 = %u\\n", bit_at(5), bit_at(40));

    int q;
    if (safe_div(INT_MIN, -1, &q) != 0) {
        printf("INT_MIN / -1 is not representable — refused\\n");
    }

    return 0;
}
`,
          'avoid_ub.c'
        ),
        b.warn(
          'Do not rely on signed overflow wrapping',
          'Signed overflow is undefined; unsigned overflow wraps modulo 2^N and is fully defined. If you need wrapping arithmetic — hashing, checksums, PRNGs, protocol fields — declare the operands unsigned. If you need a checked add, test for overflow before performing it, or use a __builtin_add_overflow compiler intrinsic, which both computes and reports.',
        ),
        b.warn(
          'A clean run at -O0 proves almost nothing',
          'At -O0 the compiler is close to the source, so UB tends to do the obvious thing. At -O2 it reasons from "no UB" and can delete guards, reorder accesses, and fold comparisons. Always test the optimisation level you ship, and run the sanitizers so UB is located instead of merely avoided by luck.',
        ),
        b.tip(
          'Prefer unsigned or size_t for arithmetic that may wrap',
          'size_t and unsigned types are defined to wrap. They are also the types sizeof and the standard library use for lengths and indices. Using them removes a whole class of UB and the warnings that go with it, at the cost of being careful with signed/unsigned comparisons.',
        ),
      ],
      questions: [
        [
          'What does "undefined behaviour" permit a compiler to do?',
          [
            'Only return a random value',
            'Anything at all — the standard imposes no requirements on the execution',
            'Only crash the program',
            'Print an error',
          ],
          1,
          'No requirements means the implementation may do anything, including deleting the code, assuming the UB never occurs when optimising, or crashing. That is why UB is a correctness issue rather than a "wrong value" issue.',
        ],
        [
          'Why can `x + 1 > x` be optimised to always true?',
          [
            'Because addition always increases a number',
            'Because the only counterexample is signed overflow, which is UB, and the compiler may assume UB never happens',
            'Because of a compiler bug',
            'Because x is unsigned',
          ],
          1,
          'The compiler treats the absence of UB as a premise. The one input that makes the comparison false would overflow, which is UB, so that input is excluded from the optimiser’s model.',
        ],
        [
          'Which of these wraparounds is DEFINED in standard C?',
          [
            'Signed int overflow',
            'Unsigned integer overflow',
            'Converting an out-of-range value to a signed type',
            'None of them',
          ],
          1,
          'Unsigned arithmetic is defined to wrap modulo 2^N. Signed overflow and out-of-range signed conversions are undefined or implementation-defined. This is why hash and checksum code uses unsigned types.',
        ],
        [
          'What is the difference between unspecified and undefined behaviour?',
          [
            'They are the same',
            'Unspecified means the implementation chooses an outcome without documenting it; undefined means the standard imposes no requirements and the program may do anything',
            'Undefined is only a warning',
            'Unspecified only applies to floating point',
          ],
          1,
          'Unspecified code is valid but unportable (such as argument evaluation order). Undefined code is broken and the compiler may assume it cannot happen.',
        ],
        [
          'What should you do when a release build behaves differently from a debug build?',
          [
            'Disable optimisation',
            'Look for undefined behaviour that the optimiser exploited — build with -fsanitize=address,undefined at the same optimisation level',
            'Report a compiler bug',
            'Rewrite the program in another language',
          ],
          1,
          'The divergence is almost always UB: the optimiser reasons from a premise the program violates. Sanitizers locate it; disabling optimisation only hides it until later.',
        ],
      ],
    },
    {
      title: 'Debugging and a safety playbook',
      summary: 'GDB, sanitizers, static analysis, and the concrete rules that make C code survive.',
      duration: 18,
      build: (b) => [
        b.md(`## The debugging toolkit

You will not get far in C without a debugger, because print statements change timing and cannot see memory. The tools, in the order you reach for them:

### The compiler

\`\`\`
gcc -Wall -Wextra -Wpedantic -Wconversion -Wshadow -Wcast-align -Wstrict-aliasing -O2 -g
\`\`\`

Warnings are the cheapest bug finder. Treat them as errors in new code (\`-Werror\`) and never suppress one without understanding it. \`-Wconversion\` in particular catches the signed/unsigned and narrowing conversions that cause real bugs.

### The sanitizers

\`\`\`
gcc -fsanitize=address,undefined -fno-omit-frame-pointer -g -O1
\`\`\`

AddressSanitizer finds memory bugs; UndefinedBehaviorSanitizer finds arithmetic, shift, alignment, and null-dereference bugs. Together they turn most silent UB into a precise report with a stack trace. Run this build in CI.

### Valgrind

\`\`\`
valgrind --leak-check=full --track-origins=yes --error-exitcode=1 ./program
\`\`\`

Slow, and the best leak detector. \`--track-origins=yes\` traces an uninitialised value back to where it was created.

### GDB

\`\`\`
gdb ./program
\`\`\`

| Command | Does |
| --- | --- |
| \`break file.c:42\` | Breakpoint at a line |
| \`break func\` | Breakpoint at a function entry |
| \`run arg1 arg2\` | Start the program |
| \`bt\` | Backtrace — the call stack |
| \`frame 3\` | Switch to a stack frame |
| \`print x\` | Print a variable |
| \`print *ptr\` | Dereference |
| \`print array@10\` | Print 10 elements of an array |
| \`next\` / \`step\` | Over / into the next line |
| \`continue\` | Resume |
| \`watch *ptr\` | Stop when the pointed-to memory changes |
| \`x/16xb ptr\` | Examine 16 bytes in hex |
| \`info locals\` | All locals in the current frame |
| \`quit\` | Leave |

The \`watch\` command is the answer to memory corruption that no sanitizer has pinned down: set a watchpoint on the address being corrupted, and GDB stops at the exact write.

### Static analysis

\`\`\`
gcc -fanalyzer program.c      # gcc's built-in static analyser
clang --analyze program.c     # the Clang static analyser
cppcheck --enable=all program.c
\`\`\`

Static analysers read the source without running it and find null dereferences, leaks, and use-after-free along reachable paths. They produce some false positives; the true positives are worth the noise.

## A worked debug session

Suppose a linked-list program crashes intermittently. The workflow:

1. **Build with sanitizers.**
   \`\`\`
   gcc -fsanitize=address,undefined -g -O1 list.c -o list
   \`\`\`
2. **Run the failing input.** ASan reports a heap-use-after-free with the free site and the read site.
3. **Look at the read site.** It is the traversal loop, reading \`n->next\` after \`n\` was freed.
4. **Fix**: save the next pointer before freeing (Module 9). Rerun.
5. **Run Valgrind** to confirm no leaks remain. Then run the \`-O2\` build of the whole test suite.

If ASan is clean and the crash persists, go to GDB with a watchpoint on the corrupted address. If even that fails, bisect by commenting out half the code. Unglamorous and effective.

## The safety playbook

These are the rules that production C follows. They are not stylistic; each one prevents a class of bug.

**Initialise everything.**

\`\`\`c
int x = 0;
int arr[10] = {0};
int *p = NULL;
struct Item item = {0};
\`\`\`

Uninitialised reads are UB and vanish at \`-O2\`.

**Check every allocation, every I/O, every pointer crossing a boundary.**

\`\`\`c
if (buf == NULL) return -1;
if (f == NULL) return -1;
if (n == NULL) return;
\`\`\`

**Free exactly once, and NULL the pointer.**

\`\`\`c
free(p);
p = NULL;
\`\`\`

**Track lengths explicitly.** A pointer without a length is an incomplete value.

\`\`\`c
void process(const char *data, size_t len);
\`\`\`

**Prefer unsigned/size_t for sizes and indices.** Avoids negative-index and mixed-sign bugs.

**Bounds-check every write to a buffer.**

\`\`\`c
if (i >= capacity) return -1;
buf[i] = c;
\`\`\`

**Use the bounded string functions.**

\`\`\`c
snprintf(buf, sizeof buf, "%s", src);   /* not strcpy */
fgets(buf, sizeof buf, stdin);          /* not gets  */
\`\`\`

**Beware of signed integer overflow.** Add with a check, or compute in \`unsigned\`.

**Do not modify string literals.** Declare them \`const char *\`.

**Do not cast away const or reinterpret pointers without cause.** Use \`memcpy\` for punning.

**Compile with warnings as errors, and run sanitizers in CI.**

**Keep functions small.** A function you can hold in your head is a function whose invariants you can verify.

## The review checklist

When you read C, ask in this order:

1. **Lifetimes.** Does any pointer outlive what it points at? (Dangling, use-after-free, returning a local.)
2. **Ownership.** Who frees each allocation, and is it freed exactly once? (Leaks, double frees.)
3. **Bounds.** For every index and every write, what proves it is in range?
4. **Overflow.** Can any arithmetic on sizes or lengths overflow?
5. **Initialisation.** Is every value that is read set on every path?
6. **Errors.** Is every return value that signals failure checked?
7. **Aliasing and const.** Is anything modified through a pointer the caller believes is read-only?
8. **Types.** Any narrowing conversions, signed/unsigned mixes, or pointer casts?

Eight questions. They find the overwhelming majority of C bugs, and they are what experienced reviewers are actually doing when a review "feels" thorough.

## Why this module is the real grammar of C

Modules 1 through 11 taught you what C says. This one teaches you what C means. The two are not the same, because C delegates correctness to the programmer and lets the compiler assume the program is correct. The discipline in this module — initialise, check, bound, free once, sanitize — is what makes the gap between "it compiles" and "it works" small enough to cross.

If you take one thing from the C half of this course, take this: **the tools are not optional.** A C developer without AddressSanitizer is reading the source and hoping. A C developer with it is writing C the way the language intends.`),
        b.anim('stackheap', {
          title: 'A stack frame and the buffer inside it',
          badge: 'why overflow is dangerous',
          steps: [
            {
              caption:
                'On entry, a function frame is laid out: saved frame pointer, saved return address, then locals.',
              note: 'The return address is what the CPU jumps to when the function returns. On the stack it sits adjacent to the locals, at a fixed offset — which is exactly what makes a stack buffer overflow exploitable.',
              stack: [
                { label: 'return address', size: 1, tone: 'bad' },
                { label: 'saved rbp', size: 1, tone: 'int' },
                { label: 'local buffer[16]', size: 2, tone: 'char' },
                { label: 'local int', size: 1, tone: 'int' },
              ],
            },
            {
              caption:
                'A well-behaved write of 10 bytes stays inside buffer[16]. Nothing outside the frame changes.',
              note: 'The bound is the buffer size, and it is the programmer’s job to enforce it — the hardware does not.',
              stack: [
                { label: 'return address', size: 1, tone: 'int' },
                { label: 'saved rbp', size: 1, tone: 'int' },
                { label: 'buffer (10 used)', size: 2, tone: 'ok' },
                { label: 'local int', size: 1, tone: 'int' },
              ],
              highlight: 'stack',
            },
            {
              caption:
                'strcpy writes 40 bytes into buffer[16]. The write continues into the saved frame pointer and the return address.',
              note: 'On the stack the corruption is deterministic and local. An attacker who controls the bytes in the overflow controls the return address, and the function returns into code of their choosing.',
              stack: [
                { label: 'return address', size: 1, tone: 'bad' },
                { label: 'saved rbp', size: 1, tone: 'bad' },
                { label: 'buffer (40 written)', size: 2, tone: 'bad' },
                { label: 'local int', size: 1, tone: 'bad' },
              ],
              highlight: 'gap',
            },
            {
              caption:
                'Heap overflow corrupts the allocator’s metadata instead, so the damage appears at the next malloc or free.',
              note: 'This is why a heap overflow can crash far from its cause. ASan places red zones around every block so either kind of overflow is caught at the write, not later.',
              heap: [
                { label: 'block A (4 bytes)', size: 1, tone: 'char' },
                { label: 'metadata', size: 1, tone: 'bad' },
                { label: 'block B', size: 1, tone: 'char' },
              ],
              stack: [{ label: 'main frame', size: 1, tone: 'int' }],
              highlight: 'gap',
            },
            {
              caption:
                'With -fsanitize=address, a red zone after the buffer turns the same write into an immediate report.',
              note: 'ASan surrounds every allocation and, with -fsanitize=address on stack variables too, every frame. The write is stopped and described at the exact instruction, with a stack trace — instead of running on to corrupt whatever happens to be next.',
              heap: [
                { label: 'block (4)', size: 1, tone: 'char' },
                { label: 'RED ZONE', size: 1, tone: 'ok' },
                { label: 'block B', size: 1, tone: 'char' },
              ],
              stack: [{ label: 'main frame', size: 1, tone: 'int' }],
              highlight: 'gap',
            },
          ],
        }),
        b.code(
          `#include <stdio.h>
#include <string.h>
#include <stdlib.h>

/* Warnings-as-errors habits, shown in miniature. */

/* Bounded copy: reports truncation instead of overflowing. */
static int append(char *dst, size_t cap, size_t *len, const char *src)
{
    size_t need = strlen(src);
    if (*len + need + 1 > cap) {          /* +1 for the terminator */
        return -1;
    }
    memcpy(dst + *len, src, need);
    *len += need;
    dst[*len] = '\\0';
    return 0;
}

/* Bounds-checked write. */
static int put(char *buf, size_t cap, size_t i, char c)
{
    if (i >= cap) {
        return -1;
    }
    buf[i] = c;
    return 0;
}

int main(void)
{
    char buf[8];
    size_t len = 0;
    buf[0] = '\\0';

    if (append(buf, sizeof buf, &len, "hello") != 0) {
        fprintf(stderr, "truncated\\n");
        return 1;
    }
    if (append(buf, sizeof buf, &len, " world") != 0) {
        fprintf(stderr, "would not fit — reported, not overflowed\\n");
    }
    puts(buf);

    for (size_t i = 0; i < 12; i++) {
        if (put(buf, sizeof buf, i, '.') != 0) {
            printf("refused write at index %zu (capacity %zu)\\n", i, sizeof buf);
            break;
        }
    }

    return 0;
}
`,
          'safety.c'
        ),
        b.table(
          'The safety playbook',
          ['Rule', 'Prevents'],
          [
            ['Initialise every variable, pointer, and array', 'Uninitialised reads (UB, optimised away at -O2)'],
            ['Check every malloc, fopen, and incoming pointer', 'Null dereference, silent failure'],
            ['One owner per allocation; free once; NULL after free', 'Leaks, double free, use after free'],
            ['Pass a length with every pointer', 'Out-of-bounds access'],
            ['Use unsigned / size_t for sizes and indices', 'Negative index, mixed-sign comparison bugs'],
            ['Bounds-check every buffer write; prefer snprintf/fgets', 'Stack and heap overflow'],
            ['Check signed arithmetic for overflow or use unsigned', 'Signed overflow (UB)'],
            ['Declare literals const char *', 'Writing to read-only memory'],
            ['Sanctioned byte punning only (memcpy, unsigned char)', 'Strict-aliasing miscompilation'],
            ['-Wall -Wextra -Werror; sanitizers in CI', 'Large classes of bug, before they ship'],
          ]
        ),
        b.tip(
          'GDB watchpoints find corruption no sanitizer reports',
          'Set watch *ptr on the address that is being corrupted, then continue. GDB stops at the exact instruction that writes it, and bt shows the call stack that got there. This is the fastest route from "a field has a garbage value" to the line that wrote it.',
        ),
      ],
      questions: [
        [
          'Why does an uninitialised read become more dangerous at -O2 than at -O0?',
          [
            'It does not',
            'The optimiser may assume the read never happens and delete or reorder code based on that assumption',
            'The stack is smaller',
            'Registers are faster',
          ],
          1,
          'Reading an indeterminate value is UB. At -O2 the compiler can reason that UB never occurs and remove checks or branches that depend on the value, so the program behaves differently from the -O0 build.',
        ],
        [
          'Which GDB command stops the program at the exact write that corrupts a memory location?',
          [
            'break',
            'watch *ptr',
            'next',
            'print',
          ],
          1,
          'A watchpoint on the address triggers when the memory changes, so GDB stops at the offending instruction and bt shows how execution got there. This is the tool for corruption that sanitizers have not localised.',
        ],
        [
          'What is the correct order to free the strings in a `char **lines`?',
          [
            'free(lines) then each lines[i]',
            'free each lines[i] then free(lines)',
            'Only free(lines)',
            'The order does not matter',
          ],
          1,
          'Free the inner allocations while the outer array still gives you access to them, then release the array. The reverse order leaks every string.',
        ],
        [
          'Why prefer `snprintf(buf, sizeof buf, "%s", s)` to `strcpy(buf, s)`?',
          [
            'It is faster',
            'It never writes past the buffer and it tells you whether truncation happened',
            'It copies more characters',
            'It handles Unicode',
          ],
          1,
          'snprintf is bounded by the size argument and returns the number of characters that would have been needed, so truncation is detectable. strcpy has no length and overflows whenever s is too long.',
        ],
        [
          'In the safety review checklist, which question comes first?',
          [
            'Types',
            'Lifetimes: does any pointer outlive what it points at?',
            'Formatting',
            'Which functions are used',
          ],
          1,
          'Lifetime and ownership issues (dangling, use-after-free, double free, leaks) are the most damaging and the hardest to see from types alone. Bounds, overflow, and initialisation follow.',
        ],
      ],
    },
  ]
);
