// Module 2 — Lexical structure and program shape.
// C reads text as a stream of tokens. Once that idea is in place, the strange
// whitespace rules, the semicolon rules and the declaration rules stop being
// arbitrary and start being consequences of how the grammar is written.

import { mod } from '../blocks';

export const M2 = mod(
  'crs-c-programming',
  'c-m2',
  2,
  'Module 2 — The Shape of a C Program',
  'Tokens, identifiers, keywords, and the syntactic rules that everything else in C is built out of.',
  [
    {
      title: 'A first program, line by line',
      summary: 'main, statements, blocks, semicolons, and return values — what each part is actually for.',
      duration: 16,
      build: (b) => [
        b.md(`## The smallest correct program

\`\`\`c
#include <stdio.h>

int main(void)
{
    printf("Hello, world!\\n");
    return 0;
}
\`\`\`

Five lines, and every one of them is load-bearing. Let us take them apart.

## \`#include <stdio.h>\`

A preprocessor directive. It tells the compiler: before you do anything else, paste in the contents of the standard header file \`stdio.h\`, which is where the C standard library declares \`printf\`, \`FILE\`, \`fopen\`, and everything else input-output related.

Without it, \`printf\` is an undeclared identifier and the compiler stops. It is a **declaration**, not a definition: the header tells the compiler the function exists, what type it returns, and what its parameters are. The actual machine code lives inside the standard library and gets linked in at the last moment.

The angle brackets \`<>\` mean "look in the system's standard library directories". Quotes \`""\` mean "look next to this file first, then in the system directories" — that is for *your own* headers, not the standard library.

## \`int main(void)\`

The **function signature**.

- \`int\` is the return type. \`main\` returns an \`int\`.
- \`main\` is the name. There is exactly one, and the operating system calls it when your program starts.
- \`(void)\` is the parameter list, and \`void\` here means "takes no parameters". This is not the same as \`()\`, which in C means "unspecified parameters" — a distinction that mostly matters when you are reading old code.

The braces \`{ ... }\` are the function body. Everything between them is the function.

## \`printf("Hello, world!\\n");\`

A **function call**, and a **statement**. \`printf\` is a function in the standard library that writes formatted text to standard output. The \`\\n\` is a newline character (see lesson 3.2 on escape sequences). The semicolon ends the statement.

## \`return 0;\`

Returns a value to the operating system. \`0\` is the universal convention for success; anything non-zero is a failure. On Linux the value appears as the process exit status (\`echo $?\`).

## What "statement" means

A statement is a complete instruction. In C they end with a semicolon:

\`\`\`c
int a = 1;              // declaration — a statement
a = a + 1;              // expression statement
printf("%d\\n", a);      // function call — a statement
;                        // an empty statement: legal, useless
\`\`\`

The semicolon is C's statement terminator, and it is not decoration. Forgetting one is the most common syntax error in the language, and the compiler reports it on the *following* line, which is why it feels arbitrary when it happens to you.

## Blocks and scope

A \`{ }\` pair creates a **block**, and a block creates a **scope**. A variable declared inside is visible only inside:

\`\`\`c
#include <stdio.h>

int main(void)
{
    int x = 10;
    {
        int x = 20;          /* a different x, in a different scope */
        printf("%d\\n", x);  /* prints 20 */
    }
    printf("%d\\n", x);      /* prints 10 */
    return 0;
}
\`\`\`

The inner \`x\` is a distinct object that happens to share a name. The outer one is untouched and still exists. This is legal and occasionally useful, and it is also a classic source of "why is my value not changing" confusion, so give variables names that say what they mean.

## Statements that are not simple statements

C has several kinds:

| Form | Purpose |
| --- | --- |
| Expression statement | Do something: \`a = b + 1;\` |
| Declaration | Introduce a name: \`int a = 1;\` |
| Compound statement | A \`{ }\` block, which is itself a statement |
| \`if\` / \`switch\` | Choose |
| \`while\` / \`for\` / \`do\` | Repeat |
| \`goto\` | Jump (rarely a good idea) |
| \`return\` | Leave a function |

## A slightly bigger program to look at

\`\`\`c
#include <stdio.h>

int main(void)
{
    int a = 7;
    int b = 3;
    int sum;

    sum = a + b;
    printf("%d + %d = %d\\n", a, b, sum);

    if (sum > 9) {
        printf("The sum is greater than 9.\\n");
    } else {
        printf("The sum is not greater than 9.\\n");
    }

    return 0;
}
\`\`\`

Notice \`int sum;\` on its own. This declares \`sum\` with **no initialiser**, which in C means it holds *indeterminate* — not zero, not garbage you can predict, genuinely unknown. Reading it is undefined behaviour. This is a real difference from most other languages and it is covered in full in Module 4.`),
        b.lead('main and the return value'),
        b.table(
          'Things about main worth knowing',
          ['Fact', 'Detail'],
          [
            ['It is not special syntax', 'main is an ordinary function. The C runtime calls it. You could call it yourself.'],
            ['The return value matters', '0 means success. Non-zero is a failure. On Unix, $? holds the last exit status.'],
            ['int main(void) is the modern form', 'int main() means "unspecified parameters" in C, which is different and older.'],
            ['argv is optional', 'int main(int argc, char *argv[]) passes the command line. Most first programs ignore it.'],
            ['Falling off the end is allowed in C99+', 'main is the one function where return 0 is implied. Every other non-void function must return on every path.'],
            ['There is exactly one', 'One main per program. Not per file.'],
          ]
        ),
        b.warn(
          'The semicolon trap',
          'A semicolon after a closing brace of a block or an if/for turns the block into an empty statement. `if (x) { y = 1; };` compiles and behaves the same, but `if (x);` with a following statement silently runs that statement regardless of the condition. This is the "empty body" bug, and it usually comes from a stray semicolon while typing quickly.'
        ),
        b.tip(
          'Anatomy of a declaration',
          '`int *p = &x;` reads left to right as: *the name being declared is p; the base type is int; there is one `*`, so p is a pointer; the initialiser is the address of x.* The declaration grammar is built so that you can add qualifiers (`const`, `static`, `unsigned`) and stars without changing the order. Module 9 builds this up properly.',
        ),
      ],
      questions: [
        [
          'In `int main(void)`, what does `void` mean?',
          [
            'The function returns nothing',
            'The function takes no parameters',
            'The function cannot be called',
            'The function is abstract',
          ],
          1,
          'void in the parameter list means the function accepts no arguments. A non-void return type is what means "returns nothing". In C, `main()` (empty parentheses) is different: it means unspecified parameters.',
        ],
        [
          'What is the value of an `int x;` that has not been assigned?',
          [
            'Zero',
            'Negative one',
            'Indeterminate — reading it is undefined behaviour',
            'The largest positive int',
          ],
          2,
          'C does not zero-initialise local scalars. The variable holds whatever bytes were on the stack, and reading them is undefined behaviour. C++ and Java both default to zero, which is where most of this confusion comes from.',
        ],
        [
          'Why do C programmers write `int x = 0;` even when the value is set immediately afterwards?',
          [
            'Because assignment and declaration cannot be combined in C',
            'To make the initialisation explicit and avoid any window where the variable is indeterminate',
            'Because the compiler requires it',
            'Because x could be used in a macro',
          ],
          1,
          'Declaration with initialiser is a single statement, so there is no window. But the habit of always initialising is exactly the discipline that prevents reading indeterminate values later after an edit.',
        ],
        [
          'What does `#include <stdio.h>` actually give you?',
          [
            'The machine code for printf',
            'Declarations of the standard I/O functions, so the compiler knows their names, types and argument counts',
            'Access to the file system',
            'A copy of the source of the C standard library',
          ],
          1,
          'The header is a set of declarations. The implementation is compiled into the standard library and linked into your program by the linker.',
        ],
        [
          'A `for` loop header is followed by a stray semicolon: `for (int i = 0; i < 5; i++);`. What happens?',
          [
            'A compile error',
            'The loop body is an empty statement, so the loop runs five times doing nothing, and the following block always runs',
            'The loop runs once',
            'A runtime error',
          ],
          1,
          'The semicolon is a valid statement — the empty statement — and it becomes the loop body. The real body after it runs unconditionally. This is a very common typo.',
        ],
      ],
    },
    {
      title: 'Tokens: how C reads your text',
      summary: 'The six kinds of token, the places whitespace is not optional, and why this matters more in C than elsewhere.',
      duration: 15,
      build: (b) => [
        b.md(`## C is not free-form in the way you think

C's grammar is described in terms of **tokens**. A token is the smallest meaningful unit the compiler recognises. The source text is first chopped into tokens, and the parser then checks that the token sequence is a legal program.

C has exactly six kinds of token:

| Kind | Examples |
| --- | --- |
| **Identifiers** | \`total\`, \`x1\`, \`_tmp\`, \`MAX_SIZE\` |
| **Keywords** | \`int\`, \`if\`, \`while\`, \`return\`, \`struct\`, \`sizeof\` |
| **Constants** | \`42\`, \`3.14\`, \`'A'\`, \`0x1F\`, \`"hello"\` |
| **String literals** | \`"hello"\`, \`"C:\\\\path"\` |
| **Operators** | \`+\`, \`-\`, \`*\`, \`/\`, \`=\`, \`==\`, \`&&\`, \`->\`, \`++\`, \`<<\` |
| **Punctuators** | \`;\`, \`,\`, \`(\`, \`)\`, \`{\`, \`}\`, \`[\`, \`]\` |

Lexing is greedy: the compiler takes the **longest sequence of characters that forms a valid token**. That single rule explains a whole family of confusing errors.

## The longest-match rule, demonstrated

\`\`\`c
int a = 1, b = 2;
\`\`\`

The lexer does not see \`=\`. It sees \`=\` and then \`1\`, then \`,\`. Fine. Now consider:

\`\`\`c
int a = 1, b, c = 2;
\`\`\`

\`b\` is declared and left indeterminate. A common beginner bug, and no compiler will warn you unless you use \`-Wuninitialized\`.

Here is the greedy rule biting:

\`\`\`c
int a = 1;
int a--;      // this is a-- , decrement then the value; NOT a - -;
\`\`\`

The lexer must produce \`--\` as one operator because \`--\` is a valid token and it is the longest match. Contrast with:

\`\`\`c
int a = 1;
a - -1;       // here the spaces save you: a - (-1)
\`\`\`

Without the space, \`a--\` becomes a single token. **This is the reason C programmers put spaces around binary operators and never between unary ones.** The rule is invisible most of the time and catastrophic occasionally.

## Whitespace: optional in five places, required in three

Whitespace (spaces, tabs, newlines) separates tokens where two tokens would otherwise merge into one different token. That is its only job.

It is optional:

- around operators: \`a+b\` is \`a + b\`
- around punctuation: \`f(a,b)\` is \`f(a, b)\`
- inside parentheses: \`( a + b )\`
- between a keyword and its delimiter: \`return 0;\`
- **between two identifiers/keywords/constants**: \`int x\` must have a space, or it becomes the single identifier \`intx\`

It is *required* in three situations, all because of the longest-match rule:

1. **Between an identifier and a number-adjacent token** — \`int x\` not \`intx\`.
2. **Around \`+\`/\`-\` when a unary operator is meant next to a binary one** — \`a - -b\`, \`a + +b\`, \`a * *p\`.
3. **Between two operators that would otherwise merge** — \`a & &flag\`, \`x - --y\`, \`a < <b\`.

The practical habit: **space every binary operator, and never space a unary one.** That single convention removes the entire class of bug.

## Preprocessor directives need their own line

\`\`\`c
#include <stdio.h>   // correct
   #include <stdio.h>   // also fine: leading whitespace is ignored
#include <stdio.h> int x;   // ERROR: the whole line is a directive
\`\`\`

A preprocessor directive runs from \`#\` to the end of the line. Anything after the directive name on the same line is either part of the directive or an error. This is also why you cannot continue a \`#define\` with a backslash-free split:

\`\`\`c
#define MAX(a, b) \\
    ((a) > (b) ? (a) : (b))    // the \\ at end of line joins the lines
\`\`\`

## Newlines matter more than you expect

Newlines are whitespace — with three exceptions:

1. \`//\` comments end at the newline.
2. Preprocessor directives end at the newline.
3. \`__LINE__\` and diagnostics count lines.

\`/* ... */\` comments can span any number of lines, including zero:

\`\`\`c
int x; /* set x up */ int y;    /* legal, all on one line */
\`\`\`

## Comments are replaced by a space

\`\`\`c
int a/**/b;      // this is ILLEGAL, not "int ab"
\`\`\`

The comment becomes one space, so this is two tokens with nothing between them, which is not a declaration. The same rule explains the classic commenting-out bug:

\`\`\`c
/* printf("hi"); */      // fine, one comment
/* printf("hi"); */ printf("hello");   // also fine — the second call still runs
\`\`\`

You have commented out only the part between the first \`/*\` and the first \`*/\`. This is why C89-era code used \`/* ... */\` on every line of a commented block rather than relying on \`//\`.`),
        b.lead('The lexer longest-match rule in practice'),
        b.table(
          'Token ambiguities you will hit',
          ['Source', 'How it tokenises', 'Result'],
          [
            ['a+++b', 'a ++ + b', 'Increments a, then adds — probably not what was meant'],
            ['a---b', 'a -- - b', 'Decrements a, then subtracts'],
            ['a- -b', 'a - - b', 'Correct: a minus negative b'],
            ['a = = b', 'a = (= b) — syntax error', 'An accidental == typo becomes a clear error'],
            ['x/ /*comment*/ y', 'x / (space) / y', 'Two division operators, syntax error'],
            ['intx', 'one identifier "intx"', 'Undeclared identifier, not int x'],
            ['1.0e+5', 'float constant', '100000.0 — the + is part of the exponent'],
            ['a->b', 'one operator ->', 'Member access, not a minus then a greater-than'],
          ]
        ),
        b.tip(
          'A quick self-test',
          'Type these four and predict the output before you compile: (1) `int i=1; printf("%d", i++ + ++i);` (2) `printf("%d", 5 > 3 == 1);` (3) `int a=0; a = a++;` (4) `char c = "A";`. Some of them are undefined behaviour, and recognising that is the point.',
        ),
        b.warn(
          'Smart quotes will cost you an afternoon',
          'If you copy code from a PDF, a Word document, or a chat app, the quotes may be typographic (“ ”) rather than ASCII (" "). C does not recognise them and will report a syntax error in a place that has nothing to do with the real problem. If a string literal produces a baffling error, retype the quotes by hand. Same for the em-dash and en-dash characters.',
        ),
      ],
      questions: [
        [
          'How does the C lexer decide where one token ends and the next begins?',
          [
            'At whitespace only',
            'It always takes the longest sequence of characters that forms a valid token',
            'At semicolons',
            'According to a fixed column width',
          ],
          1,
          'Longest valid match. This is why `a+++b` lexes as `a ++ + b` and why `a--b` cannot mean `a - -b`.',
        ],
        [
          'Why is `int a = 1; int a--;` not a syntax error?',
          [
            'It is invalid',
            'The lexer greedily matches `--` as a single decrement operator',
            'C allows any operator sequence',
            'It parses as a - -b',
          ],
          1,
          'The longest valid token is `--`, so the source is read as (int a = 1)(int a--). Semantically it decrements a and discards the value, which is why the C style rule is to space binary operators and not space unary ones.',
        ],
        [
          'Which of these is a complete and legal C comment?',
          [
            'int a/**/b;',
            '/* comment */ int x;',
            '// this is fine',
            'All three',
          ],
          1,
          'int a/**/b; is not a comment at all — the comment is replaced by a space, so the source becomes `int a b;`, which is two tokens with no operator between them and a syntax error.',
        ],
        [
          'Why do C programmers write `a - -b` and never `a--b`?',
          [
            'Because `--b` is invalid',
            'Because `a--b` would be lexed as the decrement operator applied to a, changing the meaning entirely',
            'Because the standard forbids it',
            'Because it is shorter',
          ],
          1,
          'The lexer takes the longest token. `a--b` is (a--) b, which is a syntax error at best. The space is what forces the correct parse of a minus followed by a negated b.',
        ],
        [
          'What does a comment become, according to the C standard?',
          [
            'Nothing at all — it is deleted',
            'A single space',
            'The word "comment"',
            'A newline',
          ],
          1,
          'A single space, which is exactly why `int a/**/b;` is a syntax error rather than the declaration `int ab;`.',
        ],
      ],
    },
    {
      title: 'Identifiers and keywords: naming a program',
      summary: 'What makes a name valid, the reserved words, and naming that survives being read by someone else.',
      duration: 12,
      build: (b) => [
        b.md(`## The rules for a valid identifier

An identifier is the name you give to a variable, function, type, parameter, struct member, or anything else you declare. The rules in C99 and later:

1. The first character must be a **letter** (\`a\`–\`z\`, \`A\`–\`Z\`) or an **underscore** \`_\`.
2. Every subsequent character must be a **letter**, a **digit**, or an **underscore**.
3. It cannot be one of the **keywords** — the reserved words.
4. It is **case sensitive**: \`total\`, \`Total\` and \`TOTAL\` are three different identifiers.
5. An identifier beginning with an underscore followed by an uppercase letter, or containing a double underscore, is **reserved for the implementation**. Do not use these. Also avoid names starting with \`_\` at all.

\`\`\`c
int count;        // fine
int _count;       // legal but reserved-ish; avoid
int Count2;       // fine
int 2count;       // ERROR: starts with a digit
int my-count;     // ERROR: '-' is not allowed
int café;         // depends on the source encoding; do not rely on it
#define MAX 100;  // ERROR: you cannot #define a keyword
\`\`\`

## The 32 keywords

C has only 32 keywords in C99, and 43 in C23 (the additions are all about attributes, types and \`constexpr\`). Knowing them is genuinely useful, because the compiler will not let you use one as a variable name and there is no warning that explains why.

**Storage and types:** \`auto\`, \`char\`, \`const\`, \`double\`, \`extern\`, \`float\`, \`inline\`, \`int\`, \`long\`, \`register\`, \`restrict\`, \`short\`, \`signed\`, \`static\`, \`struct\`, \`typedef\`, \`union\`, \`unsigned\`, \`volatile\`, \`_Bool\`/\`bool\`

**Control flow:** \`break\`, \`case\`, \`continue\`, \`default\`, \`do\`, \`else\`, \`for\`, \`goto\`, \`if\`, \`return\`, \`switch\`, \`while\`

**Other:** \`enum\`, \`sizeof\`

**Library macros, not keywords but behave like them:** \`NULL\`, \`EOF\`, \`stdin\`, \`stdout\`, \`stderr\`, \`EXIT_SUCCESS\`, \`EXIT_FAILURE\`. These come from headers. \`NULL\` in particular is not a keyword — it is whatever the header defines it to be, commonly \`((void*)0)\` or \`0\`, and that difference has real consequences (see Module 9).

## A note on \`struct\`

In C, \`struct\` is a keyword and \`struct Point\` is a **type**, not a name. You must write \`struct Point p;\`, not \`Point p;\` — unless you create an alias with \`typedef\`, which is what almost everybody does:

\`\`\`c
struct Point {
    int x;
    int y;
};

typedef struct {
    int x;
    int y;
} Point;

Point p;   /* now legal */
\`\`\`

This is a real difference from C++, where \`typedef\` is optional sugar. In C, a struct tag and a type name live in different namespaces, which is why the tagless form above is the common idiom.

## Naming that survives review

These conventions are not arbitrary. They exist because they make code readable at a glance, and C code is often read far more than it is written.

**Types start with a capital.** \`Point\`, \`Buffer\`, \`HttpResponse\`.

**Functions are \`verb_noun\`, in lower_snake_case.** \`read_file\`, \`free_buffer\`, \`parse_header\`, \`is_valid\`.

**Variables are lower_snake_case and descriptive.** \`byte_count\`, not \`bc\`. \`total_price\`, not \`tp\`. A single letter is fine for a loop index and for a coordinate, and wrong for anything that lives longer than one screen.

**Prefix globals with \`g_\`** or \`g\` to make them visible at a glance: \`g_item_count\`. Prefix statics in a file with a scope-appropriate name.

**Singular for one, plural for many.** \`node\`, \`nodes\`, \`node_count\`. If you find yourself writing \`s\` or \`arr\`, you are avoiding the naming.

**Do not shadow.** If a local has the same name as a global or a parameter, the reader has to check the scoping rules to know which one you meant. Rename one of them.

\`\`\`c
/* hard to read: which width? */
int width(int w) {
    int w = w + 1;   /* shadowing the parameter, and initialising from itself */
    return w;
}

/* readable */
int width_with_padding(int base_width) {
    int total_width = base_width + 1;
    return total_width;
}
\`\`\`

Shadowing is legal and even common by accident, and \`-Wshadow\` will find it for you if you add that flag.`),
        b.tip(
          'Turn on -Wshadow while learning',
          'It catches accidental shadowing of variables, parameters and struct members. It is one of the highest-value flags for a beginner because shadowing is legal, silent, and produces genuinely confusing bugs.',
        ),
        b.checklist('A quick naming self-audit', [
          'No identifier starts with an underscore followed by a capital',
          'No identifier is a keyword, and no name uses one accidentally',
          'Types are Capitalised, functions and variables are lower_snake_case',
          'Every name would be clear to someone who has never seen the code',
          'No local shadows a global, a parameter, or a struct member',
          'Plural names are only used for things that really are many',
        ]),
      ],
      questions: [
        [
          'Which of these is a valid C identifier?',
          [
            '2nd_place',
            '_private_count',
            'total-items',
            'All three',
          ],
          1,
          'Identifiers cannot start with a digit and cannot contain a hyphen. _private_count is legal (though identifiers beginning with an underscore are best avoided as a convention).',
        ],
        [
          'Why is `struct Point p;` required in C, when `Point p;` works in C++?',
          [
            'C structs cannot have names',
            'In C, a struct tag is not a type name; you need a typedef to create one',
            'It is optional in C too',
            'Because struct is a keyword',
          ],
          1,
          'C keeps tags in a separate namespace, so `Point` alone is an ordinary identifier and means nothing. `typedef struct { ... } Point;` is the standard idiom that makes Point a type name.',
        ],
        [
          'What is wrong with this function? int f(int n) { int n = n * 2; return n; }',
          [
            'Nothing, it is valid C',
            'The local n shadows the parameter and is initialised from itself, so its value is indeterminate',
            'You cannot redeclare a parameter',
            'It returns the wrong value but compiles cleanly',
          ],
          1,
          'The inner declaration starts a new scope. Its initialiser refers to itself, which is the uninitialised new object, so the result is undefined behaviour — not merely the wrong value.',
        ],
        [
          'C is case sensitive. What does this mean in practice?',
          [
            'Identifiers must be all lowercase',
            '`count` and `Count` are two different variables, and mixing case in a declaration is a common source of undeclared-identifier errors',
            'Keywords must be lowercase',
            'String literals are case insensitive',
          ],
          1,
          'The compiler distinguishes every character. Declaring `Count` and using `count` produces a clean undeclared-identifier error, but in a language with weaker typing you would silently get zero.',
        ],
        [
          'Which name should you avoid?',
          [
            'buffer_index',
            'TOTAL_ELEMENTS',
            '_MyPrivateField',
            'item_count',
          ],
          2,
          'An identifier beginning with an underscore followed by an uppercase letter is reserved for the implementation. Your program may fail to compile, or worse, collide with an implementation symbol.',
        ],
      ],
    },
  ]
);
