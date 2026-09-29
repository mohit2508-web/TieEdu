// Module 1 — Orientation and the toolchain.
// The goal of this module is that by the end of it the learner has compiled and
// run a program by hand, can explain every stage between a .c file and a
// running process, and reads compiler output as information rather than as an
// insult.

import { mod } from '../blocks';

export const M1 = mod(
  'crs-c-programming',
  'c-m1',
  1,
  'Module 1 — Orientation and the Toolchain',
  'Why C is still the right first language, and what actually happens between a file and a running program.',
  [
    {
      title: 'What C actually is, and why learn it first',
      summary: 'The design idea behind C, what it gives up, and why that trade still shapes modern software.',
      duration: 14,
      build: (b) => [
        b.md(`## C in one paragraph

C is a small, deliberately low-level language. It gives you almost nothing for free: no garbage collector, no bounds checking on arrays, no exception mechanism, no built-in string type, no ownership rules. What it gives you instead is **complete control over memory and over every operation the machine performs**, with a vocabulary small enough to hold in your head.

That is the whole design idea, and it is worth understanding because almost every other language you will ever learn is a reaction to it.

## What C looks like

\`\`\`c
#include <stdio.h>

int main(void)
{
    int total = 0;
    for (int i = 1; i <= 100; i++) {
        total += i;
    }
    printf("1 to 100 sums to %d\\n", total);
    return 0;
}
\`\`\`

Fifteen lines. Every one of those lines exists because the language requires it. In a language with a container type, \`total\` would be a range object. In a language with operator overloading, \`+=\` would be a method. Here, \`total += i\` means exactly: read the \`int\` at \`total\`, read the \`int\` at \`i\`, add them, store the result back into the \`int\` at \`total\`, and throw away anything that would not fit. Nothing is hidden.

## The three promises C makes

**1. It will tell you what you did not say.** An undeclared variable is an error, not a guess. A function you called but never defined is a link error, not a silent no-op. C has a small number of rules, and it enforces them strictly. This is why a C compiler error message is usually enough to find the bug, once you can read it.

**2. It will not stop you from being wrong.** C does not check whether your array index is inside your array. It does not check whether you have \`free\`d something. It does not check whether you divide by zero. These are not oversights; they are the price of the design. The language hands you a very sharp tool and trusts you completely.

**3. Your program will run everywhere.** C is the lingua franca of systems programming. Any operating system kernel, any device driver, any embedded microcontroller, and most of the world's foundational software is C or something close to it.

## Why learn it before anything else

- **It is small.** The whole language is about 30 keywords. You can hold all of it. Python, JavaScript, Java and C++ each hide more than C has in total.
- **It teaches the machine.** After C, Java's "managed heap" and Python's "memory manager" stop being magic and become engineering decisions made *for* you.
- **It is the ancestor.** C++ started as "C with classes." C# was designed to compete with Java. Go, Rust, Zig and Swift were all, in part, answers to C's trade-offs. You cannot evaluate those answers without knowing what was traded.
- **It is everywhere.** Linux, Windows' kernel-adjacent code, macOS, the Linux kernel, SQLite, Redis, Nginx, PostgreSQL, Git, Python's own interpreter, the firmware in your microwave. C is the floor that much of the software world stands on.

## What C will cost you

Be honest about this before you start. You will write more code than you need to. You will find bugs that other languages make impossible, and that you must learn to prevent yourself. You will spend a real amount of time on memory. And you will need to understand the machine more than most programmers ever do.

In exchange you get a language that stays out of your way completely, and a mental model of computation that makes every other language easier to reason about. That is a good trade, and it is the trade every systems programmer has made for forty years.

## What this course covers

Everything. From \`#include\` to \`errno\`, from "what is a byte" to building a hash map. It is a deep dive with no gaps: if a topic is needed to write real C safely, it is here, and if it is needed to read C that other people wrote, it is here too.

The course is written assuming you have never written a line of C, but it does **not** assume you have never programmed at all. If you have written JavaScript or Python, you will find that most concepts transfer and that the syntax is not the hard part — the memory model is.`),
        b.lead('The one-line version'),
        b.table(
          'C at a glance',
          ['Question', 'Answer'],
          [
            ['Who uses it', 'Operating system kernels, embedded firmware, databases, browsers, game engines, compilers'],
            ['Why they use it', 'Portability, control over memory and layout, zero runtime overhead, decades of proof'],
            ['What it costs', 'No bounds checking, no GC, manual memory, undefined behaviour, sharp edges'],
            ['Standardised as', 'ISO/IEC 9899 — C17 (2018) and C23 (2024) are current; C99 is the practical floor'],
            ['Compiled or interpreted', 'Compiled, to native machine code'],
            ['Typing', 'Static and weak: types are checked at compile time, but convert implicitly'],
          ]
        ),
        b.tip(
          'The fastest way to feel the difference',
          'Write the "sum 1 to 100" program above, then write the same thing in Python in three lines. Look at both. Everything in this course is an explanation of what Python is hiding from you.'
        ),
        b.warn(
          'Do not skip Module 1',
          'The toolchain lesson in this module is not optional background. Half the C questions on any interview and on any debugging session are really questions about which stage of the build something went wrong at.'
        ),
      ],
      questions: [
        [
          'What is the central design trade-off C makes?',
          [
            'It trades runtime performance for source code brevity',
            'It trades safety guarantees and convenience for complete control over memory and execution',
            'It trades portability for raw speed on one architecture',
            'It trades source compatibility for a modern syntax',
          ],
          1,
          'C removes bounds checking, garbage collection and implicit conversions, and in exchange gives the programmer total control. It is the second option, and every other answer describes a trade C did not make.',
        ],
        [
          'Why do many systems projects still choose C today?',
          [
            'C is the only language that can target embedded hardware',
            'C is easier to learn than the alternatives',
            'C gives predictable memory layout, no runtime overhead and the same source across architectures',
            'C is the fastest language that has ever existed',
          ],
          2,
          'Predictable layout, a tiny runtime (often literally none), and one source tree compiling to dozens of architectures. C is not always the fastest language, but it is close, and predictability is what systems code actually needs.',
        ],
        [
          'C does not check whether an array index is inside the array. Why is that not considered a design flaw?',
          [
            'It is an oversight that the standards committee has not yet fixed',
            'It is a performance optimisation: checking would cost time on every access',
            'The programmer is trusted, and the omission is the deliberate price of C’s low-level design',
            'It is only a problem in debug builds',
          ],
          2,
          'It is deliberate. C is a systems language and the model is that the programmer is responsible. The cost of that decision is the subject of most of the rest of this course.',
        ],
        [
          'Which statement about the C standard is correct?',
          [
            'C has never been formally standardised',
            'C is standardised by ISO/IEC 9899; C17 and C23 are current, and C99 is the practical minimum for modern features',
            'C99 is the newest version of C',
            'C is standardised by the GNU project',
          ],
          1,
          'C is standardised as ISO/IEC 9899. C17 (2018) and C23 (2024) are the current revisions. C99 is the practical floor because VLAs, // comments, mixed declarations and _Bool landed there.',
        ],
      ],
    },
    {
      title: 'Your toolchain: compiler, flags, and the command that matters',
      summary: 'Install a compiler, learn the flags that matter, and understand what each one changes.',
      duration: 16,
      build: (b) => [
        b.md(`## The one command

Everything in this course reduces to running this and reading what it says:

\`\`\`bash
gcc -std=c17 -Wall -Wextra -Wpedantic -g -o hello hello.c
\`\`\`

Read it right to left: take \`hello.c\`, warn about almost everything, add debugging symbols, and write the result to a file called \`hello\`. Then run \`./hello\`.

On Windows with MinGW-w64 or MSYS2 the compiler is usually \`gcc\` too. With Visual Studio's \`cl.exe\` the equivalent is \`cl /W4 /Zi hello.c\`. The *concepts* are identical; only the spelling changes.

## The flags you should never compile without

| Flag | What it does | Why you want it |
| --- | --- | --- |
| \`-std=c17\` (or \`c11\`, \`c99\`) | Pick the language standard | Stops the compiler guessing. Without it, GCC and Clang default to different dialects and your code builds on your machine and not on the grader's. |
| \`-Wall\` | Enable the "something is probably wrong" warnings | Catches uninitialised variables, missing returns, shadowed variables, bad format strings, unused variables. |
| \`-Wextra\` | Enable additional warnings | Catches unused parameters, signed/unsigned comparison, missing field initialisers. |
| \`-Wpedantic\` | Warn about anything not in the standard | Catches accidental GNU extensions, so the code stays portable. |
| \`-g\` | Emit debug information | Without this, \`gdb\` and sanitizers cannot tell you which line crashed. |
| \`-O0\` / \`-O2\` | Optimisation level | \`-O0\` while debugging (fastest to compile, easiest to debug). \`-O2\` for release. |

Add \`-fsanitize=address,undefined\` when hunting a memory bug (Module 13 covers this properly), and \`-lm\` at the end of the link when you use \`<math.h>\`.

## The development loop, and why the order matters

This is the loop. Learn it as a ritual, because the single biggest time sink in learning C is a beginner who changes five things and then cannot tell which change broke it.

\`\`\`bash
# 1. compile, and actually read the output
gcc -std=c17 -Wall -Wextra -Wpedantic -g -o prog prog.c

# 2. if it compiled with warnings, treat them as errors you have not fixed yet
# 3. if it compiled, run it and check the output is what you expected
./prog

# 4. change ONE thing
\`\`\`

Step 2 is the one beginners skip, and it is the most valuable habit in this course. A warning is the compiler telling you it found a real defect that it is legally allowed to guess about. \`-Wall\` on a beginner program typically produces several. Every one of them is a bug you have not hit yet.

## The editors and IDEs

Any of these work, and none of them matter more than your habits:

- **Code::Blocks**, **Dev-C++**, **CodeLite** — simple, focused on C, good for beginners.
- **VS Code** with the \`C/C++\` extension — what most people use. Free, and the debugger integration is good.
- **CLion**, **Qt Creator** — heavier, but excellent.
- **Vim / Emacs** — real, and the right answer eventually, but not on day one.

What matters is that you can compile from a terminal. An IDE hides the build command, and you will spend this entire course needing to see it.

## How to prove your setup works

\`\`\`c
#include <stdio.h>

int main(void)
{
    printf("C is working. int is %d bytes on this machine.\\n", (int)sizeof(int));
    printf("The answer is %d\\n", 6 * 7);
    return 0;
}
\`\`\`

Compile and run it. The \`sizeof(int)\` line is not decoration: it proves your compiler works, and it starts you thinking about types as sizes, which is the mental model the rest of the course depends on. On a typical 64-bit desktop Linux or macOS machine it prints \`4\`. On an embedded board it might print \`2\`. **Never assume. Print it.**`),
        b.steps('The exact first session', [
          {
            title: 'Create a working directory',
            desc: 'Keep one directory for the whole course. Every file you write lives here.',
            code_snippet: 'mkdir -p ~/c-course && cd ~/c-course',
          },
          {
            title: 'Check the compiler exists',
            desc: 'If this prints a version, you are ready. If it says "command not found", your compiler is not installed or not on PATH.',
            code_snippet: 'gcc --version',
          },
          {
            title: 'Write hello.c',
            desc: 'Use the program above. Type it by hand — typing it is how you stop treating code as magic.',
          },
          {
            title: 'Compile and read every line of output',
            desc: 'No warnings should appear. If any do, fix them before moving on.',
            code_snippet: 'gcc -std=c17 -Wall -Wextra -Wpedantic -g -o hello hello.c',
          },
          {
            title: 'Run it and check the output',
            desc: 'You now have a working C toolchain. Everything else in this course is text you type into a file and compile with this same command.',
            code_snippet: './hello',
          },
        ]),
        b.table(
          'Compiler commands, side by side',
          ['Action', 'GCC / Clang', 'MSVC'],
          [
            ['Compile and link', 'gcc -o hello hello.c', 'cl hello.c'],
            ['Enable warnings', '-Wall -Wextra -Wpedantic', '/W4'],
            ['Debug symbols', '-g', '/Zi'],
            ['Optimise for release', '-O2', '/O2'],
            ['Sanitise memory + UB', '-fsanitize=address,undefined', 'not available (use clang-cl)'],
            ['Link the maths library', '-lm', 'built in'],
          ]
        ),
        b.warn(
          'If you use a hosted online judge',
          'Most judges compile with \`gcc -std=c17 -O2 -Wall\`. Write the code so it is clean under exactly that command, and your local setup should match it. If your code only builds with a default GCC dialect, it will not build there.'
        ),
        b.tip(
          'Makefile, in 20 seconds',
          'Once you have a few files, stop retyping the command. A file called \`Makefile\` containing \`all:\\n\\t$(CC) $(CFLAGS) -o prog prog.c\\n\\nclean:\\n\\trm -f prog\` and a \`make\` command saves real time. You do not need to understand make for this course.',
        ),
      ],
      questions: [
        [
          'What is the purpose of the -std=c17 compiler flag?',
          [
            'It selects the optimisation level',
            'It tells the compiler which version of the C language standard to enforce',
            'It enables all warnings',
            'It links the standard library',
          ],
          1,
          '-std pins the language dialect so the compiler does not default to a different one. Without it, GCC and Clang default to different dialects, and code that builds on your machine can fail on someone else\'s.',
        ],
        [
          'You get "unused variable" and "variable set but not used" warnings. What should you do?',
          [
            'Delete the warnings with a pragma',
            'Ignore them, they are not errors',
            'Treat them as bugs you have not hit yet and fix the code',
            'Turn off -Wall to keep the output readable',
          ],
          2,
          'A warning means the compiler found something it is legally allowed to guess about. "Unused variable" usually means a typo, a missing use, or a variable that should have been a different variable entirely.',
        ],
        [
          'Why is -g included even when you are not using a debugger?',
          [
            'It makes the program run faster',
            'It enables optimisation',
            'It emits debug information, which sanitizers and profilers also need',
            'It is required by -Wall',
          ],
          2,
          'Debug info serves every diagnostic tool, not just gdb. AddressSanitizer and UBSan produce useful output only when -g is present.',
        ],
        [
          'Which flag would you add when your program calls functions from <math.h>?',
          [
            '-Wall',
            '-O2',
            '-lm, placed after the source files on the link line',
            '-Wpedantic',
          ],
          2,
          'libm is a separate library on most Unix systems, so it must be given after the object files that need it. This is a classic "undefined reference to sqrt" cause.',
        ],
      ],
    },
    {
      title: 'From source file to running process',
      summary: 'The five translation phases, what each one outputs, and the errors that belong to each stage.',
      duration: 20,
      build: (b) => [
        b.md(`## A \`.c\` file is not a program

This is the single most useful thing to know for debugging. When you type \`gcc hello.c\`, one command runs **four distinct programs in sequence**, each consuming the previous one's output. Each stage owns a different class of error, and the stage tells you where the problem is.

1. **Preprocessor** — text substitution. Output: a translation unit, which is bigger than your file.
2. **Compiler proper** — semantics and code generation. Output: assembly.
3. **Assembler** — assembly to machine code. Output: an object file of relocatable addresses.
4. **Linker** — combines objects, resolves external names. Output: an executable.

You can stop after any stage and look at the intermediate file. This is not a toy exercise: it is how you diagnose "undefined reference" (a link-stage problem) separately from "no such file or directory" (a stage-one problem).

## Phase 1: preprocessing

The preprocessor works purely on text, before the compiler has any idea what the language means. It does exactly four things that matter:

- \`#include\` pastes the contents of another file in, in place.
- \`#define\` records a text replacement rule.
- \`#if\` / \`#ifdef\` / \`#else\` delete entire regions of the file.
- Comments become a single space.

The result is still not C — it is text with all the library declarations substituted in. See it for yourself:

\`\`\`bash
gcc -std=c17 -E hello.c -o hello.i
\`\`\`

Open \`hello.i\`. Your five lines are still there, now preceded by several thousand lines of declarations from \`stdio.h\`. That is where \`printf\`'s declaration came from, and it is why you must \`#include <stdio.h>\` before calling \`printf\`: without it, the compiler has never been told what \`printf\` means.

## Phase 2: compilation

The compiler now parses the translation unit, checks types, and produces assembly for your target. It is here that "syntax error", "undeclared identifier", "incompatible pointer types" and "control reaches end of non-void function" come from. All of those are *your* mistakes.

\`\`\`bash
gcc -std=c17 -S hello.c -o hello.s
\`\`\`

## Phase 3: assembly

The assembler turns mnemonics into bytes and produces an **object file**. The crucial thing about an object file is that addresses are not final: it does not know where in memory it will live, and it does not know where any function or variable from another file will live. Those are left as holes to be filled by the next stage.

\`\`\`bash
gcc -std=c17 -c hello.c -o hello.o
\`\`\`

## Phase 4: linking

The linker starts the executable at a fixed address, places each section, and fills in every hole it recorded: the address of \`main\`, the address of \`printf\`, the address of \`gTotal\`. The libraries you did not write get pulled in from \`libc\` here, which is why \`printf\` exists in your program even though you never wrote it.

This stage owns the two errors beginners find most confusing:

- **undefined reference to \`foo'\`** — you *used* \`foo\` but nothing *defines* it. Either you called a function you never wrote, wrote it with a different name, or forgot to compile the \`.c\` file that contains it. This is the single most common C build error.
- **multiple definition of \`foo'\`** — you *defined* \`foo\` in two files. A header containing a function *body* is the usual cause; the body must be in exactly one \`.c\` file.

## Seeing it all at once

\`\`\`bash
gcc -std=c17 -Wall -Wextra -E -S -c hello.c -o /dev/null   # stop after preprocessing
gcc -std=c17 -Wall -Wextra -S -c hello.c -o /dev/null     # stop after compilation
gcc -std=c17 -Wall -Wextra -c hello.c -o /tmp/hello.o     # stop after assembly
gcc -std=c17 -Wall -Wextra hello.c -o hello               # all the way to an executable
\`\`\`

Commit the first three to memory. When you are stuck, the question "which stage failed?" answers itself.`),
        b.anim('pipeline', {
          title: 'hello.c to a running process',
          badge: 'click each stage',
          stages: [
            {
              name: 'preprocess',
              tool: 'gcc -E',
              in: 'hello.c',
              out: 'hello.i — a translation unit',
              detail:
                'Text substitution only. #include pastes in stdio.h. #define expands. #if deletes. The compiler has not looked at the language yet, so a missing #include is invisible here and fatal in the next stage.',
              tone: 'text',
            },
            {
              name: 'compile',
              tool: 'gcc -S',
              in: 'hello.i',
              out: 'hello.s — assembly',
              detail:
                'The actual compiler. Type checking happens here, which is why syntax errors, undeclared identifiers and bad format strings all point at this stage.',
              tone: 'int',
            },
            {
              name: 'assemble',
              tool: 'gcc -c',
              in: 'hello.s',
              out: 'hello.o — relocatable object',
              detail:
                'Assembly to machine code. Addresses are still unfilled: the object file does not know where it will be loaded, nor where printf lives.',
              tone: 'code',
            },
            {
              name: 'link',
              tool: 'gcc (no -c)',
              in: 'hello.o + libc',
              out: 'hello — an executable',
              detail:
                'Places every section at a final address and fills in the holes left by the assembler, pulling printf and the rest of libc out of the standard library. Undefined reference and multiple definition are both link-stage errors.',
              tone: 'ptr',
            },
            {
              name: 'run',
              tool: './hello',
              in: 'hello',
              out: 'a process, and stdout',
              detail:
                'The OS loads the executable, the C runtime starts, __libc_start_main calls main, and your code runs. From here on, any wrong answer is a logic bug, not a build bug.',
              tone: 'ok',
            },
          ],
          artifacts: {
            'hello.c': `#include <stdio.h>

int main(void)
{
    printf("Hello, world!\\n");
    return 0;
}`,
            'hello.i': `/* first ~100 lines omitted: glibc's own preprocessor
   preamble - feature test macros, typedefs, __gnuc__ blocks */

typedef struct _IO_FILE FILE;
...
extern int printf (const char *__restrict __format, ...);
...
# 1 "hello.c"
# 1 "<built-in>"
# 1 "<command-line>"
# 31 "<command-line>"
# 1 "/usr/include/stdio.h" 1 3 4

# 1 "hello.c"
int main(void)
{
    printf("Hello, world!\\n");
    return 0;
}`,
            'hello.s': `        .file   "hello.c"
        .text
        .globl  main
        .type   main, @function
main:
        pushq   %rbp
        .cfi_def_cfa_offset 16
        movq    %rsp, %rbp
        .cfi_offset 6, -16
        movl    $.LC0, %edi
        call    printf
        xorl    %eax, %eax
        popq    %rbp
        .cfi_def_cfa 7
        ret
        .size   main, .-main
        .section .rodata
.LC0:
        .string "Hello, world!\\n"`,
            'hello.o': `ELF 64-bit LSB relocatable, x86-64

Disassembly of section .text:

0000000000000000 <main>:
   0:  55                   push   %rbp
   1:  48 89 e5             mov    %rsp,%rbp
   4:  bf 00 00 00 00       mov    $0x0,%edi
   9:  e8 00 00 00 00       call   0x0        <-- PATCHED BY THE LINKER>
   e:  31 c0                xor    %eax,%eax
  10:  5d                   pop    %rbp
  11:  c3                   ret

Relocation section '.rela.text' contains 2 entries:
  offset 0x0000000000000009  info R_X86_64_PLT32
                           addend 0xfffffffffffffb30
                           sym    printf`,
          },
        }),
        b.lead('Which stage owns which error'),
        b.table(
          'Build errors by stage',
          ['Error you see', 'Stage', 'Usual cause'],
          [
            ['hello.c: No such file or directory', 'before the compiler runs', 'Wrong path, or you are in the wrong directory'],
            ['"expected ; before ..." , "stray \\302 in program"', 'preprocess or compile', 'Missing semicolon, smart quotes pasted from a document, unterminated string'],
            ['"printf undeclared (first use in this function)"', 'compile', 'Missing #include <stdio.h>'],
            ['"unused variable \'x\'" -Wunused-variable', 'compile (a warning)', 'A variable you declared and never used — usually a typo'],
            ['"control reaches end of non-void function"', 'compile', 'A path through the function has no return'],
            ['"undefined reference to \'square\'"', 'link', 'Called but never defined, or the defining .c was not on the command line'],
            ['"multiple definition of \'gCounter\'"', 'link', 'A global variable or function body lives in a header included by two .c files'],
            ['"segmentation fault (core dumped)"', 'run', 'A memory bug at runtime: null deref, out-of-bounds, use-after-free'],
          ]
        ),
        b.info(
          'The debugging trick this buys you',
          'When something breaks, ask which stage died. A build that produces no .o file is a compile problem and you should look at the source. A build that produces .o files but no executable is a link problem and you should look at your file list. A build that succeeds but crashes is a logic or memory problem and you should reach for a debugger. Skipping this step is why beginners spend hours in the wrong place.'
        ),
        b.tip(
          'Turning every stage into a flag on the normal build',
          'Add \`-save-temps\` to a gcc command line and it keeps hello.i, hello.s and hello.o in your directory instead of throwing them away. Useful occasionally, confusing often.',
        ),
      ],
      questions: [
        [
          'You see "undefined reference to \'calculate\'". Which stage failed, and what is the most common cause?',
          [
            'Preprocessing — you forgot #include',
            'Compilation — the function is not declared before use',
            'Linking — the function is declared and used but defined in a .c file that was not compiled/linked',
            'Runtime — the function is missing from the standard library',
          ],
          2,
          'A declaration is not a definition. The compiler is happy with a prototype; only the linker, which collects all definitions, can discover that nothing actually implements calculate.',
        ],
        [
          'What does the preprocessor actually do?',
          [
            'Type checks the program and reports errors',
            'Text substitution: includes, macro expansion, conditional compilation, comment removal',
            'Converts assembly into machine code',
            'Resolves external symbol addresses',
          ],
          1,
          'It works purely on text, before the compiler knows any language semantics. It has no concept of types or expressions.',
        ],
        [
          'Why does the assembler leave holes in the object file?',
          [
            'To make the file smaller',
            'Because it does not yet know where the code and data will be placed in the final executable',
            'Because the compiler left them incomplete',
            'To allow for later optimisation',
          ],
          1,
          'Object files are relocatable. Addresses are finalised by the linker, which knows the whole program and the load address.',
        ],
        [
          'Which of these is a link-stage error?',
          [
            'undeclared identifier',
            'expected ; before } token',
            'multiple definition of \'gCount\'',
            'control reaches end of non-void function',
          ],
          2,
          'The linker is the only stage that sees all definitions at once, so only it can detect that a name is defined twice.',
        ],
        [
          'You call printf() but forget #include <stdio.h>. What happens?',
          [
            'It compiles and runs fine, because printf is built in',
            'printf is implicitly declared as returning int, and on modern compilers this is an error or a hard warning',
            'It links but crashes at runtime',
            'The preprocessor adds the declaration automatically',
          ],
          1,
            'Since C99 an implicit declaration is not allowed at all, and C23 removes implicit int entirely. You get "implicit declaration of function" as a diagnostic, and the declaration you actually want — with its real return type and its format-string checking — is exactly what the include provides.',
        ],
      ],
    },
    {
      title: 'Reading what the compiler tells you',
      summary: 'Errors vs warnings, how to parse a diagnostic, and the five warnings that matter most in C.',
      duration: 15,
      build: (b) => [
        b.md(`## A compiler message has four parts

Read one from the bottom up and it stops being scary:

\`\`\`
hello.c:12:5: error: 'x' undeclared (first use in this function)
   12 |     x = 5;
      |     ^
\`\`\`

| Part | Meaning |
| --- | --- |
| \`hello.c\` | Which file |
| \`12:5\` | Line 12, column 5 — the column is usually exact, not approximate |
| \`error:\` / \`warning:\` | Which kind |
| the message | What is wrong, often with a suggestion |

The \`^\` under the column is the single most useful thing on the page. When a diagnostic does not show one, ask for more detail with \`-fdiagnostics-show-caret\` (Clang) or read the surrounding lines yourself.

## Errors stop the build. Warnings do not.

This distinction matters more in C than in almost any other language, because the C standard grants the compiler permission to assume your program has no undefined behaviour. When you invoke undefined behaviour, the compiler is *entitled to do anything at all*, including deleting the code that caused it.

That means a warning is not "a suggestion you might ignore". It is the compiler saying: *there is a construct here whose meaning I am not allowed to define, so I am going to guess, and my guess may be to assume it never happens.*

The canonical example:

\`\`\`c
int main(void)
{
    int i;
    for (i = 0; i <= 10; i++) {
        printf("%d\\n", i);
    }
    return 0;
}
\`\`\`

Compile that at \`-O2\` and your compiler is entitled to emit a loop that never runs, or to delete the loop entirely, because the condition \`i <= 10\` overflows \`int\` and signed overflow is undefined. With \`-Wall\` it will tell you \`comparison is always true due to limited range of data type\`.

## The warnings that matter most in C

Turn on \`-Wall -Wextra\` and these are the ones you will meet in the first month:

| Warning | What it means | How it bites |
| --- | --- | --- |
| \`unused variable\` | You declared something and never used it | Almost always a typo: you meant to use \`count\`, wrote \`cout\` |
| \`variable set but not used\` | You assigned a value that goes nowhere | A real logic bug: you computed the result and forgot to print it |
| \`implicit declaration of function\` | Used a function you did not declare | Missing \`#include\`. Since C99 this is a constraint violation |
| \`control reaches end of non-void function\` | A path falls off the end of a function returning a value | The caller gets garbage. Undefined behaviour |
| \`comparison between signed and unsigned\` | \`-Wsign-compare\` | \`-1 < someUnsigned\` is **always false**, and this is a real security bug pattern |
| \`format \'%d\' expects int but argument has type char *\` | Your \`printf\` format does not match your arguments | Reading a pointer as an integer, or worse |
| \`return type defaults to \'int\'\` | Missing \`int\` on a function | Ancient C style; broken under C23 |
| \`-Wdangling-else\` | An \`else\` attaches to the inner \`if\` | Almost always a logic bug from missing braces |

## The format-string warning deserves special attention

\`\`\`c
int count = 5;
printf("Count: %d\\n", count);   // fine

const char *name = "TieEdu";
printf("Count: %s\\n", name);    // fine

printf("Count: %s\\n", count);   // DANGER: the compiler will stop you
\`\`\`

The \`%s\` will make \`printf\` interpret the integer \`5\` as a pointer and read five bytes from wherever address 5 points. With \`-Wall\` the compiler catches this. Without it, your program reads arbitrary memory. This is why \`printf\` is a variadic function and why only \`-Wall\` can help you: the compiler has to check the format string against the arguments, and it can only do that if you let it.

## A practical rule

Turn on \`-Wall -Wextra -Wpedantic\` and then **do not compile until the warning list is empty**. A project with warnings is a project where you have stopped reading. This one habit prevents more C bugs than any other single practice, and it costs nothing.`),
        b.lead('What to do when you get a diagnostic'),
        b.steps('A repeatable method, not guesswork', [
          {
            title: 'Read the message, all of it',
            desc: 'GCC says "error" and then a specific noun. "undeclared" and "conflicting types" are different problems. The second line often has a "note:" that is the actual fix.',
          },
          {
            title: 'Go to the line and column, not the line',
            desc: 'The caret in modern output points at the token. A missing semicolon is reported on the *next* statement, which is why it feels arbitrary.',
          },
          {
            title: 'Look upwards, not only at the caret',
            desc: 'Most C syntax errors are caused by the line before. A missing closing brace, a missing semicolon after a struct, a string with a missing quote — all are reported later than the actual mistake.',
          },
          {
            title: 'Change one thing, recompile',
            desc: 'Fixing five things at once is how a beginner ends up unsure whether the fix worked and cannot reproduce the original bug.',
          },
          {
            title: 'When there are many errors, fix the first one only',
            desc: 'The compiler often stops reporting after a cascade. One missing brace can produce fifty errors. Fix the first, recompile, and the rest usually evaporate.',
          },
        ]),
        b.checklist('A build you should be willing to ship', [
          'Compiles with -std=c17 -Wall -Wextra -Wpedantic and zero warnings',
          'Compiled with -g so that any crash can be debugged afterwards',
          'Every printf format string matches its argument types',
          'No function that returns a value can fall off the end',
          'No signed/unsigned comparisons in range-sensitive code',
          'No unused variables anywhere',
        ]),
        b.warn(
          'A note on `-Werror`',
          'Some projects add \`-Werror\` so warnings become errors. It is a good idea in continuous integration and a bad idea while learning, because a warning you do not yet understand becomes a build failure that hides the real problem.'
        ),
      ],
      questions: [
        [
          'Why is a signed integer overflow so much more dangerous in C than an unsigned one?',
          [
            'Signed overflow produces a wrong number, unsigned overflow crashes',
            'Signed overflow is undefined behaviour, so the compiler may assume it never happens and optimise the code accordingly; unsigned overflow is defined to wrap',
            'Signed overflow is caught at compile time',
            'They behave identically but signed is slower',
          ],
          1,
          'This is one of the most important ideas in the course. Unsigned wraparound is defined and predictable. Signed overflow is undefined, which licenses the compiler to delete the code path entirely — so a "harmless" off-by-one loop can vanish.',
        ],
        [
          'A program has 12 errors, all on different lines. What is the usual explanation?',
          [
            'The program is genuinely wrong in 12 places',
            'A single early mistake such as a missing brace or semicolon cascaded',
            'The compiler is buggy',
            'The file is too long',
          ],
          1,
          'C compilers stop after a syntax error in a construct and can produce many downstream diagnostics. Always fix the first error and recompile.',
        ],
        [
          'Why does printf("Count: %s", count) where count is an int cause a crash?',
          [
            'printf only accepts strings as the first argument',
            '%s makes printf treat the integer as a char pointer and read memory from that address',
            'The %s format is only valid in C++',
            'count is too small to print',
          ],
          1,
          'printf is variadic, so it has no way to know what you passed. %s tells it to read a char* from an integer, and it dereferences an arbitrary address. This is exactly the bug -Wall catches.',
        ],
        [
          'Your compiler warns "comparison between signed and unsigned". Why is that a genuine bug rather than style?',
          [
            'It is only a style preference',
            'Because -1 converted to unsigned becomes a huge positive value, so a check like x < limit is never true',
            'Because signed and unsigned cannot be compared at all',
            'Because the compiler cannot convert between them',
          ],
          1,
          'The usual conversion is to unsigned, so -1 becomes 4294967295. Any check for a negative value against an unsigned bound silently fails — a well-known security bug pattern.',
        ],
      ],
    },
  ]
);
