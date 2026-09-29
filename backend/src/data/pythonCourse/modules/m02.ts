// Module 2 — The Shape of a Python Program.
//
// Module 1 explained what happens *around* a Python program. This module
// explains the program itself: what a line of Python is, what a name is, what
// a variable actually is (nothing you can point a C programmer at), and how to
// read the error message when one of those turns out to be a misunderstanding.
//
// The through-line of the module is one idea stated three ways: a Python name
// is a *label attached to an object*, never a box that holds a value. Once that
// is true, mutation, aliasing, default arguments, and pass-by-object all follow
// without further explanation — and a traceback becomes a stack of labels that
// failed to resolve, not a wall of text.

import { mod } from '../blocks';

export const M2 = mod(
  'crs-python-programming',
  'py-m2',
  2,
  'Module 2 — The Shape of a Python Program',
  'The anatomy of a .py file, what assignment really does, and how to read a traceback from the bottom up.',
  [
    {
      title: 'Statements, expressions and blocks',
      summary: 'Every Python file has the same anatomy; statements and expressions are different things, and indentation is syntax.',
      duration: 15,
      build: (b) => [
        b.md(`## The anatomy of a real .py file

Almost every Python file ever written is a rearrangement of the same seven parts. Knowing which part you are looking at tells you what a line is allowed to do and what will happen if it is wrong.

\`\`\`python
#!/usr/bin/env python3
"""Report the average score for one student."""

import csv
from pathlib import Path

DATA_FILE = Path("scores.csv")


def average(rows):
    return sum(rows) / len(rows)


if __name__ == "__main__":
    with DATA_FILE.open(newline="") as handle:
        rows = [float(r["score"]) for r in csv.DictReader(handle)]
    print(f"average: {average(rows):.2f}")
\`\`\`

1. **Shebang** — \`#!/usr/bin/env python3\`. Ignored by \`python file.py\`, honoured when the file is made executable. Modern practice is to call \`python script.py\` instead of \`./script.py\`, so many projects omit it.
2. **Module docstring** — the first statement in the file. It becomes \`module.__doc__\`, it is what \`help(module)\` prints, and it is the only place to explain what the file is *for*.
3. **Imports** — \`import csv\` binds the name \`csv\`; \`from pathlib import Path\` binds only \`Path\`. Both are just assignments to names.
4. **Constants** — \`DATA_FILE\`. Python has no constant keyword; \`UPPER_SNAKE_CASE\` is a convention that tools and humans both honour.
5. **Definitions** — \`def\`, and later \`class\`. Defining is not running: the body does not execute.
6. **The main guard** — \`if __name__ == "__main__":\`. This is the single most important line in the file and it is explained below.
7. **The work** — the statements that only run when the file is a program rather than a library.

> The encoding cookie \`# -*- coding: utf-8 -*-\` (PEP 263) used to sit on line 1 or 2. Python 3 assumes UTF-8 for source files, so it is dead weight — leave it out.

## Statements versus expressions

This is the first distinction worth memorising, because it explains the majority of Python errors.

- An **expression** is anything that *evaluates to a value*: \`2 + 3\`, \`x\`, \`f(1)\`, \`"a" * 3\`, even a bare name. Expressions are things.
- A **statement** is a complete instruction that *does* something: \`x = 1\`, \`del x\`, \`import os\`, \`assert x\`, \`print(x)\`, \`return\`, \`raise ValueError()\`. Statements are deeds.
- A **compound statement** contains a block of other statements: \`if\`, \`for\`, \`while\`, \`try\`, \`with\`, \`def\`, \`class\`, \`match\`.

The rule that trips people up: **assignment is a statement, not an expression.** In JavaScript, C++, and Rust, \`x = y\` is an expression that yields the assigned value. In Python it yields nothing. That is why the walrus operator exists at all — \`:=\` is the expression form of assignment, added in 3.8 so you could write \`while (chunk := stream.read(4096)):\`.

You can see the difference in the syntax tree, which is not a party trick — it is how you write a linter:

\`\`\`python
import ast

statement = ast.parse("total = price * qty").body[0]
print(type(statement).__name__)          # Assign  — the assignment itself
print(statement.value.__class__.__name__)  # BinOp  — the expression on the right

expression = ast.parse("price * qty").body[0]
print(type(expression).__name__)          # Expr   — a value, used as a statement
print(expression.value.__class__.__name__)  # BinOp
\`\`\`

An \`Expr\` node is Python's way of saying "this statement exists only for its side effect; the value is being thrown away". \`f(x)\` alone on a line is an \`Expr\` node wrapping a \`Call\`.`),
        b.anim('step', {
          title: 'Read a .py file top to bottom, in this order',
          badge: 'file anatomy',
          steps: [
            {
              title: 'Shebang',
              desc: 'Optional, and only meaningful if you run the file directly (./app.py). It tells the OS which interpreter to launch. When you type "python app.py" the OS never sees it and the line is a comment.',
              code_snippet: '#!/usr/bin/env python3',
            },
            {
              title: 'Module docstring',
              desc: 'The first *statement* in the file, and the only place the module can describe itself. It is stored in __doc__, printed by help(module), and stripped entirely by "python -OO". If the file has no docstring, the first thing in it is a comment instead — and a comment cannot become __doc__.',
              code_snippet: '"""Report the average score for one student."""',
            },
            {
              title: 'Imports',
              desc: 'Ordinary statements that bind names. "import csv" binds one name; "from pathlib import Path" binds one name out of a module. Import is execution, not declaration — the imported module body runs too, which is why a bad module-level side effect can break an import far from its cause.',
              code_snippet: 'import csv\nfrom pathlib import Path',
            },
            {
              title: 'Module-level constants',
              desc: 'Upper-case names are the convention for things that should not be rebound. There is no const keyword; enforcement is social, plus a linter rule. A module-level name is a global, and reading one is cheap while writing one is mildly expensive — the function must look it up on every access.',
              code_snippet: 'DATA_FILE = Path("scores.csv")',
            },
            {
              title: 'Definitions',
              desc: 'def and class execute at import time, but their bodies do not. The name is bound to a function or class object immediately; the code inside waits for a call. That is why you can call a function defined further down the file only from code that runs later.',
              code_snippet: 'def average(rows):\n    return sum(rows) / len(rows)',
            },
            {
              title: 'The main guard',
              desc: 'The most important line in a script. __name__ is "__main__" when the file is run as a program, and the module name when it is imported. Putting side effects behind this guard is what makes a file safe to import.',
              code_snippet: 'if __name__ == "__main__":\n    print("running directly")',
            },
            {
              title: 'The work',
              desc: 'Everything below the guard runs only when the file is the program. Read every file you have not written and ask one question: which of these lines would fire on import? Those are the ones that need the guard.',
              code_snippet: 'if __name__ == "__main__":\n    with DATA_FILE.open(newline="") as handle:\n        print(f"average: {average(rows):.2f}")',
            },
          ],
        }),
        b.lead('The rules for blocks and indentation'),
        b.steps(
          'What ends a block',
          [
            {
              title: 'A block starts after a colon',
              desc: 'if, for, while, try, with, def, class and match are all followed by ":" and then an indented block. The colon is what tells the tokenizer to expect INDENT.',
              code_snippet: 'if total > 0:\n    print(total)',
            },
            {
              title: 'The block ends when indentation returns to or passes the level that opened it',
              desc: 'There is no end keyword, no brace, no semicolon. A line indented exactly as much as the header continues the block; a line indented less ends it. This is why you cannot put a blank line in the middle of a block and resume.',
              code_snippet: 'def f():\n    a = 1\n    b = 2\n\nc = 3  # back at module level',
            },
            {
              title: 'Four spaces per level, never a tab',
              desc: 'PEP 8 fixes the indent at four spaces. Python 3 rejects mixing tabs and spaces inside one block with TabError, and the failure appears at the end of the file, nowhere near the mistake.',
              code_snippet: 'if a:\n\tb = 1  # TabError if the block above used spaces',
            },
            {
              title: 'Brackets suspend the indentation rules',
              desc: 'Inside (), [] or {} you may break lines freely with no continuation character. This is the only clean way to split a long expression, and it is what every formatter produces.',
              code_snippet: 'total = (\n    subtotal\n    + tax\n    + shipping\n)',
            },
            {
              title: 'The backslash continuation exists and you should not use it',
              desc: 'A trailing backslash joins physical lines. It breaks on trailing whitespace, it cannot appear inside a string, and it silently disappears from a copy-paste. Prefer brackets.',
              code_snippet: 'total = subtotal + \\\n    tax  # legal, fragile, discouraged',
            },
          ]
        ),
        b.table(
          'Statements, expressions, and which is which',
          ['Form', 'Example', 'Evaluates to a value?'],
          [
            ['Expression', '`2 + 3`, `x`, `f(1)`, `"ab" * 2`', 'Always. Every expression is a thing.'],
            ['Expression statement', '`f(1)` alone on a line', 'The value is computed and thrown away — the tree node is `Expr` wrapping a `Call`'],
            ['Assignment statement', '`x = 1`', 'No. This is the one that surprises people coming from C++ or JS'],
            ['Augmented assignment', '`x += 1`', 'No, same as assignment'],
            ['Walrus', '`n := len(s)`', 'Yes — this is the expression form of assignment, new in 3.8'],
            ['Simple statement', '`del x`, `import os`, `assert x`, `raise E`, `pass`, `return`', 'No'],
            ['Compound statement', '`if`, `for`, `while`, `try`, `with`, `def`, `class`, `match`', 'No — they contain a block of statements'],
          ]
        ),
        b.warn(
          'The semicolon trap',
          '`x = 1; y = 2` is legal Python. So is `if x: a(); b()`. And that second one is a real bug waiting to happen: **both** `a()` and `b()` are in the body of the `if`. People porting C code write `if (x) a(); b();` and silently get a conditional `a` and an unconditional `b` — or, if they add braces, a syntax error. Python does not have semicolon-terminated statements. Do not use it.'
        ),
        b.md(`## Comments and docstrings

A **comment** starts with \`#\` and runs to the end of the line. There are no block comments. The usual workaround — three quote marks on their own lines around a paragraph — is not a comment at all, it is a string expression statement, and it costs a little object at import time and confuses anyone reading the tree.

\`\`\`python
# A real comment. Explains why, not what.

# "Not a comment":
# """
# This is a no-op string expression. It is the closest thing Python has to a
# block comment, and PEP 8 advises against it.
# """

def parse(text):
    """Turn raw input into a list of records.

    A docstring is a string expression as the *first* statement of a function,
    class or module. It lands in __doc__, which is what help() and every
    IDE tooltip reads. It must be first: a comment above it does not count,
    and a second string literal in the body is just a discarded value.
    """
    return [line.split(",") for line in text.splitlines() if line.strip()]
\`\`\`

Three practical notes. First, docstrings are *values*, so \`python -OO\` strips every one of them from the bytecode and your \`--help\` output goes blank. Second, the convention is a one-line summary ending in a period, then a blank line, then the detail — that is what \`help()\` lays out. Third, a good docstring answers what a reader cannot get from the signature: what the arguments mean, what is returned, and what it raises.`),
        b.code(`# guard_demo.py — import this from anywhere, nothing happens
import side_effects

print("side_effects imported; this line only runs when guard_demo is the program")`,
          'guard_demo.py'),
        b.code(`# side_effects.py
print("this prints the moment the module is imported, before anything is used")


def add(a, b):
    return a + b


if __name__ == "__main__":
    # Only runs when this file is the program, never on import.
    print(add(2, 3))
`, 'side_effects.py'),
        b.md(`Run \`python guard_demo.py\` and you see two lines: the "this prints..." line first, because the import executes the module body top to bottom, and then guard_demo's own line. Now \`import guard_demo\` from the REPL and you see only the side effect — the bottom line is correctly silent.

That is the entire argument for the guard. A file that does real work at module level is unusable as a library, and the fix is one line of indentation.`),
        b.checklist('A file you are about to trust', [
          'It has a module docstring saying what it is for',
          'Every import is at the top, and none of them is a local file that will not exist on another machine',
          'No code runs at import time except definitions and genuinely constant assignments — side effects sit behind the main guard',
          'Indentation is four spaces throughout, with no tabs anywhere',
          'Comments explain *why*; docstrings explain the contract of every public function and class',
          'No semicolons',
        ]),
        b.tip(
          'Read it with your eyes closed first',
          'Open an unfamiliar file, hide everything except the first word of each line, and see the skeleton: imports, def, class, if, for, with, return. That skeleton is 90% of what the file does, and you can read it in five seconds.'
        ),
        b.info(
          'The two-line version of the whole lesson',
          'Expressions are things; statements are deeds that do not yield a value. Indentation, not punctuation, groups deeds. A name is a label, and this module never stops saying so.'
        ),
      ],
      questions: [
        [
          'In Python, what does the statement `x = y` evaluate to?',
          [
            'The value that was assigned to x',
            'The value of y, so it can be chained or printed',
            'Nothing — assignment is a statement, not an expression',
            'A tuple containing both old and new values of x',
          ],
          2,
          'Assignment is a statement and yields nothing. This is a real difference from C++, JavaScript and Rust, where assignment is an expression. The walrus operator `:=` was added in 3.8 precisely to give Python an expression form of assignment.',
        ],
        [
          'Why does a well-written Python file put side effects behind `if __name__ == "__main__":`?',
          [
            'It makes the file start faster',
            'It prevents the module body from running when the file is imported, so importing it is side-effect free',
            'It is required for the code to be packaged as a module',
            'It marks which lines the coverage tool should measure',
          ],
          1,
          '`__name__` is `"__main__"` only when the file is the program being run; on import it is the module name, so the guarded block is skipped. Without the guard, every `import` of your module would re-run its top-level code, which is how test suites and web servers get surprising behaviour.',
        ],
        [
          'What actually terminates the body of an `if` block?',
          [
            'A closing brace or an `end` keyword',
            'The next line with a semicolon',
            'The first following line that is indented less than or equal to the block’s indentation',
            'A blank line',
          ],
          2,
          'Indentation is the block syntax. The tokenizer emits INDENT and DEDENT tokens, and a DEDENT closes the block. A blank line inside a block does not close it but does prevent a continuation, which is why an accidentally blank line between two statements of the same block is a SyntaxError.',
        ],
        [
          'Given `if ready: a(); b()`, what runs when `ready` is True?',
          [
            'Only `a()`, because the semicolon ends the if body',
            'Both `a()` and `b()`, because both simple statements are on the suite line',
            'Neither — semicolons are not allowed in Python',
            'Only `b()`, because the last statement wins',
          ],
          1,
          'A suite is every simple statement on the indented block, and several may share a line separated by semicolons. Both calls are inside the `if`. This is the classic C-to-Python porting bug: `if (x) a(); b();` in C means "conditional a, unconditional b", but the Python translation makes b conditional too.',
        ],
      ],
    },
    {
      title: 'Names, binding and dynamic types',
      summary: 'Assignment binds a name to an object. There is no box, there is no type declaration, and there is a reason both of those are fine.',
      duration: 18,
      build: (b) => [
        b.md(`## The sentence that explains Python

**Assignment attaches a name to an object.**

Not "copies a value into a variable". Attaches a name to an object. Every consequence of Python's odd behaviour with lists, default arguments, mutation inside functions, and "why did my loop change the caller's data" comes from taking that sentence literally.

The picture people carry from C is a row of boxes, each with a type written on it:

\`\`\`text
    int   char   int
   [   ][     ][   ]
    x          y
\`\`\`

Python has no boxes. It has objects, and names that point at them:

\`\`\`text
              +-------+
         x -> |  10   |   int
              +-------+
              +-------+
         y -> |  20   |   int
              +-------+
\`\`\`

Two names may point at the same object, and an object may have no name at all. That is the whole model.

## The order of operations, which is not optional

In \`x = y + 1\`, the right-hand side is evaluated *first*, completely, and only then is the name bound to the result. This is why these three lines are all legal:

\`\`\`python
count = count + 1        # reads count, adds, then rebinds
index = index + 1        # a name may be read on the line that rebinds it
n, n = 7, 9              # targets are bound left to right, after the rhs
\`\`\`

and why this one is not:

\`\`\`python
n = n + 1                # fine, as long as n exists already
m = m + 1                # NameError: name 'm' is not defined
\`\`\`

Reading a name is a *lookup*. If nothing is attached to that name yet, you get \`NameError\` — and the error message tells you the exact name that failed, which is more help than most languages give you.

## One line, four assignment forms

\`\`\`python
x = 10                      # one target, one value

x = y = 0                   # chained: both names end up on the SAME object
x, y = 3, 4                 # tuple unpacking, targets bound left to right
x, y = y, x                 # the famous swap — no temporary needed
a = b = c = []              # three names, ONE list. Not three lists.

first, *rest = [1, 2, 3, 4]  # starred target collects the remainder as a list
head, tail = rest, rest[1:]   # ordinary expressions on the right are fine too

points = [
    (1, 2),
    (3, 4),
]
for x, y in points:          # unpacking in a for target
    print(x, y)

first, (second, third) = 1, (2, 3)   # nesting is legal too
\`\`\`

\`a = b = c = []\` is the one that has caused real outages. All three names point at a single list object. Append to it through any one of them and all three see the change. If you want three separate lists you must write \`[a, b, c] = [], [], []\` — or better, a list comprehension.`),
        b.anim('trace', {
          title: 'Rebinding a name does not change the object it used to point at',
          badge: 'names and objects',
          code: `# rebind.py
def show(label, value):
    print(f"{label} = {value!r}")


x = 10
y = x
x = 20
z = x + y

show("x", x)
show("y", y)
show("z", z)`,
          steps: [
            {
              caption: 'The def statement binds a name to a function object',
              note: 'Import-time only. The body has not run; nothing has been printed. Note that show is a name like any other — you could rebind it later and break every call site.',
              line: 2,
              vars: [{ name: 'show', value: '<function show>', tone: 'code' }],
              output: '',
            },
            {
              caption: 'x = 10 — the right side is evaluated first, then the name is bound',
              note: 'The literal 10 is an int object created here. x is a label attached to it. The int itself has no name and does not know x exists.',
              line: 6,
              vars: [{ name: 'x', value: '10', tone: 'ok' }],
            },
            {
              caption: 'y = x — a second label on the same object',
              note: 'Nothing was copied. The value 10 is immutable, so copying it would have been harmless — but no copy happened. id(x) == id(y) is True.',
              line: 7,
              vars: [
                { name: 'x', value: '10', tone: 'ok' },
                { name: 'y', value: '10', tone: 'ok' },
                { name: 'id(x) == id(y)', value: 'True', tone: 'ok' },
              ],
            },
            {
              caption: 'x = 20 — x is re-pointed at a new object',
              note: 'The int 10 still exists because y is still holding it. This is the whole point: rebinding is a change to the label, never to the object. If the object had no other name it would simply be collected.',
              line: 8,
              vars: [
                { name: 'x', value: '20', tone: 'warn' },
                { name: 'y', value: '10', tone: 'ok' },
                { name: 'id(x) == id(y)', value: 'False', tone: 'bad' },
              ],
            },
            {
              caption: 'z = x + y — read both, add, then bind',
              note: 'Right side first: 20 + 10 is 30, a brand new int, and only then is the name z attached. If the right side raised, z would be left unbound rather than holding a half-built value.',
              line: 9,
              vars: [
                { name: 'x', value: '20', tone: 'warn' },
                { name: 'y', value: '10', tone: 'ok' },
                { name: 'z', value: '30', tone: 'ok' },
              ],
            },
            {
              caption: 'Calling show with the current x',
              note: 'Arguments are also just objects passed along. show has its own names for them, which is why the caller can be mutated and the callee not see it — until the callee mutates the shared object.',
              line: 11,
              vars: [
                { name: 'x', value: '20', tone: 'warn' },
                { name: 'y', value: '10', tone: 'ok' },
                { name: 'z', value: '30', tone: 'ok' },
              ],
              output: "x = 20",
            },
            {
              caption: 'y is still 10 — the object it names was never touched',
              note: 'A reader coming from C expects x and y to share a slot. They share nothing; they shared an object once and now they do not.',
              line: 12,
              vars: [
                { name: 'x', value: '20', tone: 'warn' },
                { name: 'y', value: '10', tone: 'ok' },
                { name: 'z', value: '30', tone: 'ok' },
              ],
              output: "y = 10",
            },
            {
              caption: 'z holds the sum, computed at the moment line 9 ran',
              note: 'z is a snapshot of a calculation, not a live link to x and y. Rebinding x and y later does not recompute z.',
              line: 13,
              vars: [
                { name: 'x', value: '20', tone: 'warn' },
                { name: 'y', value: '10', tone: 'ok' },
                { name: 'z', value: '30', tone: 'ok' },
              ],
              output: "z = 30",
            },
          ],
        }),
        b.lead('Where the label model earns its keep'),
        b.md(`## Dynamic types, honestly described

Python is **dynamically typed**: the type belongs to the object, not to the name. Rebinding a name to a different type is legal and takes effect immediately.

\`\`\`python
value = 42
print(type(value))          # <class 'int'>

value = "forty-two"
print(type(value))          # <class 'str'>

value = [4, 2]
print(type(value))          # <class 'list'>

print(value + 1)
# TypeError: can only concatenate list (not "int") to list
\`\`\`

The error appears at the line that *uses* the value, not at the line that changed it. That is the real ergonomic cost, and it is worth being honest about: a typo in a name, a refactor that changes a function's return type, or a loop variable reused for two purposes will all pass silently until the moment of use.

Two things make that cost manageable in practice:

1. **Types are values.** You can ask, and you can branch on the answer: \`type(x) is int\`, \`isinstance(x, int)\`, \`x.__class__.__name__\`. Dynamic typing is not ignorance of types; it is deferring the check to a point where you have actual values.
2. **Annotations are optional and additive.** \`def total(prices: list[float]) -> float:\` is checked by \`mypy\`, \`pyright\`, or your editor — not by the interpreter. The runtime is unchanged; you get a static check when you want one, per project, per file. This is a genuine advantage over both strict languages and strictly untyped ones.`),
        b.code(`# The classic aliasing bug, and the two correct fixes
original = [1, 2, 3]

alias = original          # two names, ONE list object
copy_shallow = original[:]   # new list, same int objects — fine for ints
copy_deep = original[:]       # a genuine independent list for immutable elements

alias.append(4)
print(original)           # [1, 2, 3, 4]  <- you did not expect this
print(copy_shallow)       # [1, 2, 3]     <- slicing made a new list object

# The fix when you genuinely want two separate lists
independent = original.copy()
independent.append(5)
print(original)           # [1, 2, 3, 4]  <- still untouched
print(independent)        # [1, 2, 3, 4, 5]
`, 'aliasing.py'),
        b.code(`# is vs == — identity versus value
first = [1, 2, 3]
second = [1, 2, 3]

print(first == second)     # True  — same contents
print(first is second)     # False — two separate list objects

print(None is None)        # True  — None is a singleton
print(() is ())            # True  — the empty tuple is interned
print([] is [])            # False — every list literal is a new object
print(256 is 256)          # usually True — small ints are cached
print(1000 is 1000)        # do not rely on it either way

# Why you care: the two classical bugs this prevents
small = 256
if small is 256:           # Wrong. It happens to work, and then stops working.
    ...

value = None
if value is None:          # Right. is, not ==, and not "if not value:"
    ...

config = {"retries": 0}
if config.get("retries", 3):   # Wrong: 0 is falsy, so you get the default
    ...
if config.get("retries", 3) != 0:
    ...
`, 'identity.py'),
        b.table(
          'The operations, and what each one does to the label/object pair',
          ['Source', 'What happens', 'Names affected'],
          [
            ['`x = expr`', 'expr is evaluated, then the name x is attached to the result', 'x only'],
            ['`x = y = expr`', 'One object, two labels', 'x and y, both to the same object'],
            ['`x, y = a, b`', 'The right side is a tuple, then unpacked left to right', 'x, then y'],
            ['`x, y = y, x`', 'The right side is fully evaluated before any target is bound', 'both, correctly'],
            ['`a = b = []`', 'One empty list, three names pointing at it', 'a, b, c all alias'],
            ['`x += 1`', 'Equivalent to `x = x + 1`, except that `__iadd__` can mutate in place for lists', 'x'],
            ['`x: int = 5`', 'Annotation is metadata only; the interpreter ignores it and never allocates a box', 'x'],
            ['`del x`', 'Removes the name, not the object. Other names keep it alive', 'x is unbound'],
          ]
        ),
        b.warn(
          'Names are not storage, and the idioms that follow from that',
          'Because a name cannot be "reused as a different type slot", the idioms people invent to fake that — a dict per record, an object with `__slots__`, a struct with a tagged union — are pure ceremony in Python. What you write instead is simply a different function per shape, or a dict when the shape is genuinely open. Conversely, one *name* is a great place to put values of different types at different times: `result = None` then `result = compute()` is normal and idiomatic, and a static checker will only grumble if you annotate it as `int`.'
        ),
        b.info(
          'id(), and why the addresses in the trace above are illustrative',
          '`id(obj)` returns the object\'s memory address as an int, and two live objects never share one. It is a real tool — for demonstrating aliasing, for finding whether an interned string was reused — but addresses change every run because of ASLR, so never print one in a test and never persist one. For value comparison use `==`; for "is this literally the same sentinel" use `is`.'
        ),
        b.tip(
          'Three debugging habits that follow directly',
          'Print `type(x)` alongside `x` when a value surprises you. Use `repr()` rather than `print` for anything that might be a string containing quotes, because `repr` shows you the type and the escaping. And when a value changes unexpectedly, list the *names* that can see it, not the functions — the answer is almost always another name.'
        ),
      ],
      questions: [
        [
          'Given `a = b = []` and then `a.append(1)`, what is `b`?',
          [
            'An empty list — each name got its own object',
            'A list containing 1 — both names are attached to the same list object',
            'A NameError, because b was never assigned a value',
            'A copy of a made at the time of the append',
          ],
          1,
          'Chained assignment evaluates the right side once and attaches every target to that one object. So a and b are two labels on a single list, and a mutation through either is visible through both. For three separate lists write `[a, b, c] = [], [], []`.',
        ],
        [
          'What does `x = x + 1` do when `x` has never been bound before?',
          [
            'It creates x with the value 1',
            'It raises NameError, because the right-hand side is read before the name is bound',
            'It raises UnboundLocalError',
            'It sets x to None and continues',
          ],
          1,
          'The right-hand side is evaluated first, and reading an unbound name fails there. The name is only attached after the value exists, which means a failed right-hand side leaves the target untouched rather than half-assigned.',
        ],
        [
          'Which comparison is correct for testing that a value is None?',
          [
            '`value == None`',
            '`if not value:`',
            '`if value is None:`',
            '`if value is False:`',
          ],
          2,
          '`is` compares identity, and None is a singleton, so `is None` is exact. `== None` happens to work today because None defines no equality, but it is the wrong tool. `not value` is wrong for a different reason: it is also true for 0, "", [], and False — an empty result set is not the same thing as a missing one.',
        ],
        [
          'What does `x: int = 5` do at runtime?',
          [
            'Allocates a 4-byte integer and records the type so later operations are checked',
            'Binds the name x to the int object 5 and stores `int` as metadata that the interpreter ignores',
            'Converts 5 to a string because the annotation says int',
            'Nothing — annotated assignment requires a type checker to be installed to work at all',
          ],
          1,
          'Annotations are stored in `__annotations__` and otherwise inert. A type checker reads them statically; the interpreter allocates exactly the same int object either way. That is why annotating a module cannot break it and cannot save it either.',
        ],
      ],
    },
    {
      title: 'Reading a traceback',
      summary: 'The anatomy of a Python error, the exception taxonomy you will meet in the first month, and how to get more out of a traceback than it gives you by default.',
      duration: 16,
      build: (b) => [
        b.md(`## Read it from the bottom, then walk up

A traceback is a **list of frames, innermost last**. Python prints the oldest frame first because that is the order execution arrived there. The line that *raised* is the last frame before the exception type and message — the bottom of the stack trace proper.

So the procedure is:

1. **Read the last line.** \`ValueError: invalid literal for int() with base 10: 'seven'\` tells you the exception type and, crucially, the *values involved*. Half the diagnosis is in that line.
2. **Go to the frame directly above it.** That is the code that failed, and the source line is printed for you.
3. **Keep walking up** until you reach a frame in *your* code that called it. The frames below that are library internals and you can ignore them.
4. **Read the arrows, not the frames.** Exception \`__cause__\` and \`__context__\` chains (\`raise ... from ...\`) are the actual story of how control got there.

The name "traceback" is a slight misnomer — it is a *stack trace* going back to the start.`),
        b.anim('pipeline', {
          title: 'One ValueError, six frames deep',
          badge: 'the call chain',
          stages: [
            {
              name: 'Module frame',
              tool: '__main__',
              in: 'the program starts',
              out: 'frame 0: report.py module globals',
              detail:
                'The top-level code runs. It is not a function, so it has no args and no locals — only the module names, which is why the first traceback frame often shows you a bare assignment.',
              tone: 'text',
            },
            {
              name: 'load_record',
              tool: 'line 18',
              in: 'frame 0: report.py module globals',
              out: 'frame 1: load_record(path, target_id)',
              detail:
                'Opened scores.csv, iterating with csv.reader. `row` and `index` are locals here. The file handle is already open, which is why the traceback also tells you which resource was leaked when the exception escaped.',
              tone: 'code',
            },
            {
              name: 'parse_row',
              tool: 'line 14',
              in: 'frame 1: load_record(path, target_id)',
              out: 'frame 2: parse_row(row, index)',
              detail:
                'A thin wrapper. Frames like this are the ones to read quickly: if the parameters are what you expect, the bug is either here or deeper, and deeper is the next frame.',
              tone: 'code',
            },
            {
              name: 'to_int',
              tool: 'line 9',
              in: 'frame 2: parse_row(row, index)',
              out: 'frame 3: to_int("seven")',
              detail:
                'The innermost frame you wrote. Python 3.11+ underlines the exact sub-expression that failed with ^^^ markers, so you can see it was row[0] and not row[1].',
              tone: 'code',
            },
            {
              name: 'int()',
              tool: 'C impl',
              in: 'frame 3: to_int("seven")',
              out: 'ValueError raised',
              detail:
                'A builtin raised. Its frame has no Python source, so CPython prints only the header line and the exception — which is why the bottom frame of a traceback is often just `File "<string>", line 1`.',
              tone: 'bad',
            },
            {
              name: 'Unwind',
              tool: 'sys.excepthook',
              in: 'ValueError raised',
              out: 'traceback on stderr, exit code 1',
              detail:
                'No except clause matches, so the exception propagates out of every frame. Each frame it leaves is still on the call stack, which is why the traceback can list them all — that list is the live stack, captured at the instant of failure.',
              tone: 'warn',
            },
          ],
          artifacts: {
            'the program starts': `import csv


def to_int(text):
    return int(text)


def parse_row(row, index):
    return {"id": to_int(row[0]), "score": float(row[1])}


def load_record(path, target_id):
    with open(path, newline="") as handle:
        for index, row in enumerate(csv.reader(handle), start=2):
            record = parse_row(row, index)
            if record["id"] == target_id:
                return record
    raise LookupError(target_id)


record = load_record("scores.csv", 7)
print(record)`,
            'frame 3: to_int("seven")': '  File "/app/report.py", line 9, in parse_row\n    return {"id": to_int(row[0]), "score": float(row[1])}\n           ^^^^^^^^^^^^^^^^^^^\n\n  File "/app/report.py", line 6, in to_int\n    return int(text)\nValueError: invalid literal for int() with base 10: \'seven\'',
            'traceback on stderr, exit code 1': 'Traceback (most recent call last):\n  File "/app/report.py", line 18, in <module>\n    record = load_record("scores.csv", 7)\n  File "/app/report.py", line 14, in load_record\n    return parse_row(row, index)\n  File "/app/report.py", line 9, in parse_row\n    return {"id": to_int(row[0]), "score": float(row[1])}\n           ^^^^^^^^^^^^^^^^^^^\n  File "/app/report.py", line 6, in to_int\n    return int(text)\nValueError: invalid literal for int() with base 10: \'seven\'\n\n$ echo $?   # or: echo %ERRORLEVEL% on Windows\n1',
          },
        }),
        b.diagram(
          'The anatomy of one traceback',
          `flowchart TD
    A["Traceback (most recent call last):"] --> B["Frame 0 — oldest, where execution began"]
    B --> C["File, line, and the function name"]
    C --> D["the source line, printed verbatim"]
    D --> E["Frame 1 — the caller"]
    E --> F["..."]
    F --> G["Frame N — innermost, the one that actually raised"]
    G --> H["^^^ anchors, Python 3.11+ only, point at the failing sub-expression"]
    H --> I["ExceptionType: the message, with the offending values inline"]
    I --> J["stderr, then the process exits with a non-zero code"]`
        ),
        b.md(`## The exceptions you will actually meet

Python's exception hierarchy is a tree, and \`except Exception\` catches almost everything under it while missing the ones that mean "the interpreter is shutting down". Getting the tree right is the difference between a graceful failure and a hang.

| Exception | Raised when | The message tells you |
| --- | --- | --- |
| \`SyntaxError\` | The file cannot be parsed | The offending line and a caret under the bad token. \`IndentationError\` and \`TabError\` are subclasses |
| \`IndentationError\` | A block is opened but never closed, or a stray dedent | The line, plus "unindent does not match" or "expected an indented block" |
| \`NameError\` | A name is read that is not bound | The exact name, plus a "did you mean" suggestion for close matches |
| \`UnboundLocalError\` | A name is read inside a function before it is assigned | The name. It is a \`NameError\`, so \`except NameError\` catches both |
| \`TypeError\` | An operation got the wrong type, or the wrong number of arguments | The two types involved, e.g. "can only concatenate str (not int) to str" |
| \`ValueError\` | Right type, unacceptable value | The value, e.g. "invalid literal for int() with base 10" |
| \`IndexError\` | A sequence index is out of range | The index, and the length of the sequence |
| \`KeyError\` | A dict lookup misses | The missing key, and only the key — no context about what you were looking for |
| \`AttributeError\` | An object has no such attribute | The attribute and, since 3.11, a "did you mean" suggestion |
| \`ZeroDivisionError\` | Integer or float division by zero | Just "division by zero" |
| \`ImportError\` / \`ModuleNotFoundError\` | A module cannot be found | The module name, and the searched path for the second |
| \`StopIteration\` | A generator or iterator is exhausted | Nothing. It is control flow, not an error — see \`next(it, default)\` |
| \`FileNotFoundError\` | A path does not exist | The path, with an \`errno\` for scripts |
| \`RecursionError\` | The recursion limit was hit | "maximum recursion depth exceeded" |
| \`KeyboardInterrupt\` | Ctrl-C | \`KeyboardInterrupt\`. **Not** a subclass of \`Exception\`, so \`except Exception\` will not swallow your Ctrl-C |
| \`SystemExit\` | \`sys.exit()\` or \`exit()\` | The exit code. Also not an \`Exception\` |

Two rules that follow and that most code gets wrong at least once:

\`\`\`python
# Correct: catch the two things you can actually handle, leave the rest alone.
try:
    record = load_record(path, target_id)
except (FileNotFoundError, ValueError) as exc:
    log.warning("bad data, skipping: %s", exc)
    record = None

# Wrong: swallows KeyboardInterrupt and SystemExit, so Ctrl-C hangs your server.
try:
    ...
except Exception:
    pass

# Also wrong: catches things you could have prevented.
try:
    return int(text)
except Exception:
    return 0          # "seven" silently becomes 0 and the bug moves downstream
\`\`\`

The exception hierarchy, condensed: \`BaseException\` has \`Exception\` (everything you should normally handle) and the three direct children \`KeyboardInterrupt\`, \`SystemExit\`, and \`GeneratorExit\`. A bare \`except:\` catches all of them, which is why linters flag it.`),
        b.code(`# The seven exceptions, and exactly what each one prints.
# Each case raises on its own, so you see all seven instead of only the first.
CASES = [
    ("TypeError",         lambda: "total: " + len([1, 2, 3])),
    ("IndexError",        lambda: [1, 2, 3][9]),
    ("KeyError",          lambda: {"a": 1}["b"]),
    ("NameError",         lambda: undefined_name),
    ("ZeroDivisionError", lambda: 1 / 0),
    ("ValueError",        lambda: int("seven")),
    ("AttributeError",    lambda: "abc".no_such_method()),
]

for expected, case in CASES:
    try:
        case()
    except Exception as exc:
        # The type you named, the type you got, and the message you will debug from.
        assert type(exc).__name__ == expected
        print(f"{expected:18} {type(exc).__name__}: {exc}")
`, 'errors.py'),
        b.md(`## Exit codes, and how to get a better traceback

An uncaught exception exits with status \`1\`. That is the contract every shell, CI system, and supervisor on earth relies on, so:

\`\`\`bash
python report.py
echo "exit status: $?"
\`\`\`

\`\`\`text
Traceback (most recent call last):
  ...
ValueError: invalid literal for int() with base 10: 'seven'
exit status: 1
\`\`\`

The codes you will meet: \`0\` success, \`1\` uncaught exception, \`2\` command-line misuse (bad arguments to \`python\` itself or to \`argparse\`), \`130\` terminated by SIGINT — Ctrl-C — because 128 + 2, and \`137\` SIGKILL, which on Linux almost always means the OOM killer. If your program silently exits 137 it did not have an exception; it was killed.

Three ways to get more out of a failure than the default text:

\`\`\`bash
# 1. Development mode: all attributes shown, deprecation warnings loud, and
#    extra frames retained for the error locations that matter.
python -X dev report.py

# 2. The framework for anything you embed in a long-running process: catch,
#    print with the full chain, exit non-zero so a supervisor notices.
python -X dev runner.py

# 3. Post-mortem debugger: the program runs, and the instant it raises you are
#    dropped into pdb with the innermost frame selected. "u" walks up the stack,
#    "d" walks back down, "p expr" prints, "l" lists the source around you.
python -m pdb report.py
\`\`\`

And in code, the two tools worth knowing by heart:

\`\`\`python
import traceback

try:
    risky()
except ValueError:
    traceback.print_exc()          # print it
    print(traceback.format_exc()) # or capture it as a string, for a log
    raise                         # bare "raise" re-raises the ORIGINAL traceback
\`\`\`

A bare \`raise\` inside an \`except\` block re-raises with the traceback intact. \`raise exc\` or \`raise ValueError("new")\` starts a *new* traceback from the current line and throws away the story of how you got there — one of the most common ways to destroy the information you needed. When you must translate an exception, use \`raise NewError(...) from exc\`, which chains them and prints both:

\`\`\`python
# python
raise ValueError(f"row {index}: bad id {row[0]!r}") from exc
\`\`\`

\`\`\`text
ValueError: row 2: bad id 'seven'

The above exception was the direct cause of the following exception:
\`\`\``),
        b.table(
          'The seven exceptions and the fix for each',
          ['Exception', 'Usual root cause', 'What to actually do'],
          [
            ['`SyntaxError`', 'A missing colon, a stray comma, mismatched brackets', 'Read the caret. It is accurate. Only ever seen at parse time, before a single line runs'],
            ['`IndentationError`', 'Tab mixed with spaces, or a block never opened', 'Reformat the whole file — this is never a one-line fix and always looks like it should be'],
            ['`NameError`', 'Typo, or a local read before assignment', 'Follow the "did you mean" link, or check for a missing `global` / a shadowed name'],
            ['`TypeError`', 'Wrong type, or the wrong number of arguments', 'Read "not X to Y" backwards: it names both types. Do not catch and continue'],
            ['`ValueError`', 'Right type, impossible content', 'The offending value is in the message. Usually bad input from a file, a user, or the network — validate at the edge'],
            ['`IndexError`', 'Off-by-one, or a stale index after a mutation', 'Compare `len(x)` with the index in the message before touching the algorithm'],
            ['`KeyError`', 'A missing dict key, often from untrusted input', 'Use `.get(key, default)` if absence is expected, and `.keys()` if it is a typo'],
            ['`AttributeError`', 'A typo, or an object of a different type than you assumed', 'Check what the name actually is. `None` is the usual culprit: every attribute access on None fails this way'],
          ]
        ),
        b.tip(
          'The exception message is data, not decoration',
          'Python 3.11 added fine-grained error locations, so `f(g())` reports which call failed rather than just the line. It also added "did you mean" suggestions for NameError and AttributeError. The lesson: if the message does not tell you what you need, the fix is usually to write a better raise. `raise ValueError(f"row {i}: id={row[0]!r}")` costs one line and turns an unactionable error into an actionable one.'
        ),
        b.warn(
          'Two habits that make tracebacks lie to you',
          'First, a bare `except: pass` at the bottom of a call chain discards the error entirely, and the failure resurfaces somewhere unrelated minutes later. Second, catching an exception and returning a default — `except Exception: return None` — converts a loud failure into a quiet wrong answer. If you must degrade, log the traceback (`traceback.print_exc()`) and return the default; if you must not, let it propagate.'
        ),
        b.info(
          'How big a traceback is allowed to be',
          'Deep recursion plus a large traceback is normal in threaded and async code, and it is why `RecursionError` frames are usually a sign of unbounded recursion rather than of a genuine bug. Raise the limit with care (`sys.setrecursionlimit`) and remember that raising it can turn a clean RecursionError into a segfault, because the C stack is finite and Python\'s counter is not the only thing on it.'
        ),
      ],
      questions: [
        [
          'In a traceback, which frame is the one that actually raised the exception?',
          [
            'The first frame, right under "Traceback (most recent call last)"',
            'The last frame before the exception type and message line',
            'Every frame — they all raise on the way out',
            'The frame in the file you wrote, if there is one',
          ],
          1,
          'Frames are printed oldest first, which is the order execution reached them. The raising frame is therefore the last one, immediately above the `ExceptionType: message` line. Everything above it is the chain of callers that got you there.',
        ],
        [
          'What does `except Exception:` fail to catch, and why does that matter?',
          [
            'It fails to catch SystemExit and any error in the import machinery',
            'It fails to catch KeyboardInterrupt, SystemExit and GeneratorExit, because they subclass BaseException directly',
            'It fails to catch anything raised inside a generator',
            'It fails to catch OSError and its subclasses',
          ],
          1,
          'Exception is the "normal errors" branch of the hierarchy. KeyboardInterrupt, SystemExit and GeneratorExit are siblings of it under BaseException, so catching Exception leaves your program interruptible and its exit codes intact. A bare `except:` catches all of them, which is how servers end up ignoring Ctrl-C.',
        ],
        [
          'You catch a ValueError and want to raise a more informative one. Which is correct?',
          [
            '`raise ValueError("row 2: bad id")`',
            '`raise ValueError("row 2: bad id") from exc`',
            '`raise` on its own, then print a message',
            '`raise exc from ValueError(...)`',
          ],
          1,
          '`from exc` sets `__cause__`, and the traceback prints both exceptions with "The above exception was the direct cause of the following exception". A plain raise discards the original traceback and starts a new one at the current line, throwing away the chain of frames that led here.',
        ],
        [
          'What exit status does an uncaught exception produce?',
          ['0', '1', '2', '130'],
          1,
          'The interpreter exits 1 for any unhandled exception, which is what CI systems key on. Status 0 means clean exit, 2 is command-line misuse, and 130 is 128 + SIGINT, i.e. the program was stopped with Ctrl-C rather than crashing.',
        ],
      ],
    },
  ]
);
