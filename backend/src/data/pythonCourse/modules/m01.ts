// Module 1 — Orientation and the Python runtime.
// The goal of this module is that by the end of it the learner has run a program,
// can explain every stage between a .py file and printed output, and reads a
// traceback as information rather than as an insult.
//
// This file is the reference for the rest of the Python modules: block mix,
// voice, and animation payload shape are all set here.

import { mod } from '../blocks';

export const M1 = mod(
  'crs-python-programming',
  'py-m1',
  1,
  'Module 1 — Orientation and the Python Runtime',
  'What Python is, what it gives you, and what actually happens between a .py file and printed output.',
  [
    {
      title: 'What Python is, and what it gives you',
      summary: 'The design idea behind Python, the trade it makes, and why it reads differently from every other language.',
      duration: 14,
      build: (b) => [
        b.md(`## Python in one paragraph

Python is a high-level, general-purpose language whose defining feature is that it **reads close to the way a person would write the algorithm down**. There is no boilerplate, no type declaration ceremony, no explicit memory management, and a very small number of keywords doing a lot of work. The cost is real and well understood: Python is slower than compiled languages, and it will happily accept a program that is wrong until the moment that line runs.

What you get back for that trade is enormous. Code that is written once can be read by someone who did not write it, and it stays readable for years. That is not a style preference; it is the reason Python ended up owning machine learning, data science, automation, web backends, and scientific computing.

## What Python looks like

\`\`\`python
total = 0
for i in range(1, 101):
    total += i

print("1 to 100 sums to", total)
\`\`\`

Five lines. There is no \`int\`, no \`#include\`, no \`main\`, no semicolon, and no declaration telling the reader what \`total\` is. The four spaces are not style — they are how Python knows where the loop body ends.

## The three promises Python makes

**1. It will tell you what you mean.** Names bind on first assignment. Indentation is syntax, so structure cannot drift. There are very few silent-failure rules to memorise, because the language deliberately has almost none.

**2. It will refuse to be wrong quietly.** Undefined names, wrong argument counts, and bad types surface immediately with a message that names the line. Python's errors are famous for being *good* errors, and that is a design goal, not luck.

**3. Batteries included, and then some.** The standard library ships with the interpreter: file handling, dates, JSON, regex, networking, maths, compression, and an HTTP client. Almost every "do I need a package for this?" question is answered by something you already have.

## The honest trade

- **It is slow, and that is fine.** CPython runs your source through a bytecode compiler and then a virtual machine. For I/O-bound work — which is most real work — the language overhead vanishes. For CPU-bound hot loops, you measure, you find the bottleneck, and you only then reach for a compiled extension.
- **Types are checked at runtime, not before.** \`x = 1\` then \`x + "a"\` typechecks perfectly and explodes two lines later. The rule is that *types are values too*: you can write \`type(x)\` and branch on it, and you can always annotate without committing to them.
- **Indentation is load-bearing.** A space in the wrong place is a syntax error, not a formatting preference. This is annoying for two weeks and then it is an improvement.

## Why Python first

- **The feedback loop is instant.** Write, run, read the error, fix it. There is no build step, no compile error to decode, no linker to blame.
- **The concepts transfer.** Once you have written a loop, a function, a dictionary and a class here, you can pick up JavaScript, Java, Go or Rust with only syntax to learn.
- **It is the language of the parts of the industry growing fastest.** Data, ML, automation, backend services, and scientific work all default to Python.

## What this course covers

Everything, in the order that actually makes sense to learn it: from \`print\` to generators, from exceptions to dataclasses, from the iteration protocol to the import system, and out the other side into testing, profiling and a real multi-module project. It is a deep dive with no gaps: if a topic is needed to write real Python safely, it is here, and if it is needed to read Python that other people wrote, it is here too.

The course assumes you have never written Python. It does **not** assume you have never programmed at all. If you have written JavaScript or Java, most concepts transfer and the syntax is the easy part — the data model is the interesting part.`),
        b.lead('The one-line version'),
        b.table(
          'Python at a glance',
          ['Question', 'Answer'],
          [
            ['Who uses it', 'Data science, machine learning, automation, backend services, scientific computing, education, scripting'],
            ['Why they use it', 'Readable code, a huge library ecosystem, and a standard library that covers most everyday needs'],
            ['What it costs', 'Runtime type errors, slower raw execution, indentation sensitivity, hidden costs like GIL contention'],
            ['Standardised as', 'PEP 8 for style; the language itself is defined by the CPython reference implementation and PEPs'],
            ['Compiled or interpreted', 'Both — source is compiled to bytecode, then a virtual machine executes the bytecode'],
            ['Typing', 'Dynamic, with optional annotations that are checked by a separate type checker if you want one'],
          ]
        ),
        b.tip(
          'The fastest way to feel the difference',
          'Write the "sum 1 to 100" program above, then write the same thing in C. Look at both. Everything in this course is the answer to the question: what did the C version have to spell out that Python decided you should not have to?'
        ),
        b.warn(
          'Do not skip Module 1',
          'Knowing that Python compiles to bytecode, not to machine code, explains most of its performance characteristics, its \`.pyc\` cache, its start-up cost, and what a profiler is actually reporting to you.'
        ),
        b.anim('step', {
          title: 'The five claims Python makes, and what each one costs',
          steps: [
            {
              title: 'Readable first',
              desc: 'Indentation is the block syntax, keywords are few, and there is exactly one obvious way to express most things. You trade a little explicitness for code that survives being read by a stranger.',
            },
            {
              title: 'Batteries included',
              desc: 'The standard library ships with the interpreter — json, pathlib, datetime, re, urllib, collections, itertools, unittest. Dependency count is a design goal, not an accident.',
            },
            {
              title: 'Everything is an object',
              desc: 'Ints, functions, classes and modules are all objects that you can bind to names, put in lists, and pass around. This one rule explains a huge amount of Python, including why decorators work.',
            },
            {
              title: 'Errors are messages, not verdicts',
              desc: 'An uncaught exception prints a traceback that names the file, the line, the expression that failed and usually the reason. Python invests in the error text on the assumption you will read it.',
            },
            {
              title: 'The cost is honest',
              desc: 'Runtime type errors and a slow bytecode loop are the price of the four claims above. Measure before you care, then care about the three per cent of code that is actually hot.',
            },
          ],
        }),
      ],
      questions: [
        [
          'What is the central design trade-off Python makes?',
          [
            'It trades runtime speed and early error detection for code that is short, readable, and quick to write',
            'It trades memory safety for raw speed',
            'It trades a large standard library for a small one',
            'It trades static typing for better performance',
          ],
          0,
          'Python gives up compiled speed and compile-time checking so that a correct idea can be written in the fewest possible lines and read without a manual. That is the trade, and every other answer misstates which side Python is on.',
        ],
        [
          'How does CPython actually execute a .py file?',
          [
            'It compiles the source to machine code and executes it directly',
            'It compiles the source to bytecode, then executes that bytecode on a virtual machine',
            'It parses the source on every statement, with no intermediate form',
            'It ships the file to an external compiler process at runtime',
          ],
          1,
          'CPython compiles source to bytecode (cached in __pycache__ as a .pyc) and runs it on the Python Virtual Machine. This is why there is no separate build step and why start-up is not free.',
        ],
        [
          'Why is indentation load-bearing in Python?',
          [
            'It is a style convention enforced by the formatter',
            'It is how the parser determines where a block begins and ends',
            'It is required to make the code compile faster',
            'It is only required inside classes and functions',
          ],
          1,
          'Indentation is syntax, not style. The tokenizer uses leading whitespace to decide block boundaries, which is why a stray space in the wrong place is a syntax error and why there are no braces.',
        ],
        [
          'Which statement about Python typing is correct?',
          [
            'Python is statically typed, and errors are caught before the program runs',
            'Python has no types; everything is a generic value',
            'Python is dynamically typed and checks types at runtime, and annotations are optional metadata that a separate checker can verify',
            'Python requires type annotations on every variable by default',
          ],
          2,
          'Names hold references to objects of any type, and operations are validated when they execute. Annotations exist and are valuable, but they are checked by tools like mypy, not by the interpreter.',
        ],
      ],
    },
    {
      title: 'How Python runs your code',
      summary: 'Tokenize, parse, compile, execute: the four stages behind every Python program, and what each one contributes.',
      duration: 17,
      build: (b) => [
        b.md(`## The pipeline, and why you should care

A Python program does not run top to bottom the way the source reads. It goes through four stages, and each one explains a behaviour you have already observed:

1. **Tokenize** — the source text is split into tokens: names, numbers, operators, keywords, newlines and indentation.
2. **Parse** — the token stream is built into an **abstract syntax tree**, a tree structure that encodes the meaning of the program.
3. **Compile** — the tree is lowered to **bytecode**, a compact instruction set, and wrapped in a code object.
4. **Execute** — the Python Virtual Machine runs the bytecode, one instruction at a time, against a stack.

The payoff: the bytecode is cached on disk, the AST is something you can inspect and walk, and the "it is slow" claim is really the claim that a bytecode loop is slower than machine code — which is true, and only matters when your program is CPU-bound.

> \`\`\`bash
> python -m dis script.py
> \`\`\`
>
> prints the bytecode. \`python -m ast\` (via \`ast.parse\`) shows the tree. Both are worth running on a small file once, so the abstraction stops being a story.

## The AST is the real program

The bytecode is generated *from the tree*, and the tree is a faithful, language-independent representation of what your code means. This is why:

- \`ast\` is a real, supported module for programmatic source transformation.
- Formatters and linters rewrite source by rewriting the tree.
- \`code\` that runs at import time (decorators, \`if __name__ == "__main__"\`) is doing tree-walking work for you.

Here is what a four-line function looks like as a tree. The value sits in the middle, and the operations are nodes hanging off it — which is exactly why \`2 + 3 * 4\` is \`14\` and not \`20\`: the parse put \`*\` deeper.

And here is that function, which is the only source the pipeline animation below ever sees:`),
        b.code(
          `# order.py — the expression the tree animation walks through
score = 2 + 3 * 4 - (6 // 4) ** 2
print(score)
`,
          'order.py'
        ),
        b.md(`The parse of line 2 is the tree. Nothing about \`\` or \`**\` is decided at this stage beyond which node sits inside which; the arithmetic itself happens later, when the bytecode runs. You can read the tree yourself:

\`\`\`bash
python3 -c "import ast; print(ast.dump(ast.parse(open('order.py').read()), indent=2))"
\`\`\`

\`\`\`text
Module(
  body=[
    Assign(
      targets=[Name(id='score', ctx=Store())],
      value=BinaryOp(
        left=BinOp(left=Constant(value=2), op=Add(),
                   right=BinOp(left=Constant(value=3), op=Mult(),
                               right=Constant(value=4))),
        op=Sub(),
        right=BinOp(
          left=BinOp(left=Constant(value=6), op=FloorDiv(),
                     right=Constant(value=4)),
          op=Pow(),
          right=Constant(value=2))))])
\`\`\`

Read the \`right=\` branch of the outer \`BinaryOp\` and you can see the \`**\` sitting *inside* the \`//\`, which is the rule the tree animation is drawing. That dump is the same tree the compiler lowers to bytecode, and it is the whole reason the \`ast\` module exists.`),
        b.anim('pipeline', {
          title: 'From hello.py to the words on your screen',
          badge: 'cpython pipeline',
          stages: [
            {
              name: 'Source',
              tool: 'editor',
              in: 'hello.py',
              out: 'UTF-8 text in memory',
              detail:
                'Nothing has happened yet. A .py file is just text, and the interpreter has not been asked to look at it.',
              tone: 'text',
            },
            {
              name: 'Tokenize',
              tool: 'tokenize',
              in: 'UTF-8 text in memory',
              out: 'a flat stream of tokens',
              detail:
                'Names, numbers, operators and keywords are separated, and leading whitespace is turned into INDENT and DEDENT tokens. This is the stage that makes indentation load-bearing.',
              tone: 'int',
            },
            {
              name: 'Parse',
              tool: 'ast',
              in: 'a flat stream of tokens',
              out: 'an abstract syntax tree',
              detail:
                'The tokens become a tree of meaning. Operator precedence lives here: in "2 + 3 * 4" the multiply node is the child of the add node, which is why it is 14.',
              tone: 'code',
            },
            {
              name: 'Compile',
              tool: 'compiler',
              in: 'an abstract syntax tree',
              out: 'a code object of bytecode',
              detail:
                'The tree is lowered to a flat instruction list with a constant pool, a names list and a per-function frame specification. This is the unit that actually gets executed.',
              tone: 'float',
            },
            {
              name: 'Cache',
              tool: '__pycache__',
              in: 'a code object of bytecode',
              out: 'hello.cpython-312.pyc',
              detail:
                'The bytecode is written next to the source and reused on the next run, keyed by a hash of the source. Delete it any time; it is rebuilt automatically.',
              tone: 'data',
            },
            {
              name: 'Execute',
              tool: 'PVM',
              in: 'hello.cpython-312.pyc',
              out: 'Hello, on stdout',
              detail:
                'The virtual machine pops instructions off the code object and operates on the value stack. print() is a call, the string is built, and the text goes to the file descriptor.',
              tone: 'ok',
            },
          ],
          artifacts: {
            'hello.py': 'name = "world"\nprint(f"Hello, {name}!")\n',
            'a flat stream of tokens': "NAME  'name'\nOP    '='\nNAME  'world'\nNEWLINE\nINDENT\nNAME  'print'\nOP    '('\n...",
            'an abstract syntax tree': "Module(\n  body=[\n    Assign(targets=[Name('name')],\n           value=Constant('world')),\n    Expr(value=Call(func=Name('print'), args=[...])),\n  ]\n)",
            'hello.cpython-312.pyc': "  2  0 RESUME                   0\n  3  2 LOAD_NAME                0 (print)\n  3  4 LOAD_CONST               1 ('Hello, ')\n  3  6 LOAD_NAME                2 (name)\n  3  8 LOAD_CONST               2 ('!')\n  3 10 BUILD_STRING            3\n  3 12 CALL                     1\n  3 14 POP_TOP\n  3 16 RETURN_VALUE            None",
          },
        }),
        b.lead('What each stage buys you'),
        b.table(
          'Stage, output, and the thing you can now do',
          ['Stage', 'Output', 'What it enables'],
          [
            ['Tokenize', 'Token stream', 'Explains every indentation and syntax error you will ever hit'],
            ['Parse', 'AST', 'Programmatic source rewriting, linters, formatters, static analysis'],
            ['Compile', 'Code object', 'Cached bytecode, a measurable start-up cost, and `dis` output when you need to go low'],
            ['Execute', 'Program state', 'Everything else in this course'],
          ]
        ),
        b.anim('expression', {
          title: 'Why 2 + 3 * 4 is 14, not 20',
          badge: 'precedence',
          expression: '2 + 3 * 4 - (6 // 4) ** 2',
          steps: [
            {
              caption: 'The whole expression',
              note: 'Every operator produces a node. The tree is what the parser built, and it is the tree the compiler lowers.',
              node: { label: 'result', children: [ { label: '2 + (something)', op: '+' }, { label: '(something)', op: '-' } ] },
            },
            {
              caption: '** binds tighter than - and //',
              note: 'Exponentiation is right-associative and sits above multiplicative and additive operators.',
              node: { label: 'result', children: [ { label: '2 + 3 * 4 - 0.25', op: '-' }, { label: '2 + 3 * 4', op: '+' } ] },
            },
            {
              caption: '* binds tighter than +',
              note: '3 * 4 becomes 12. Left with 2 + 12 - 0.25.',
              node: { label: 'result', children: [ { label: '2 + 12 - 0.25', op: '+' }, { label: '14 - 0.25', op: '-' } ] },
            },
            {
              caption: 'Evaluate left to right, then subtract',
              note: 'Floats are approximations, so 14 - 0.25 is exactly 13.75 in binary because 0.25 is a power of two.',
              node: { label: 'result', children: [ { label: '14', op: '+', tone: 'int' }, { label: '0.25', op: '-', tone: 'float' } ] },
              result: '13.75',
            },
          ],
        }),
        b.diagram(
          'The same four stages, as a diagram',
          `flowchart TD
    A["hello.py — UTF-8 text"] --> B["Tokenizer"]
    B -->|"NAME, OP, NEWLINE, INDENT, DEDENT"| C["Parser (ast)"]
    C -->|"Abstract syntax tree"| D["Compiler (symtable + codegen)"]
    D -->|"Code object: bytecode + constants + names"| E["__pycache__/hello.cpython-312.pyc"]
    E --> F["Python Virtual Machine"]
    F -->|"pop, operate on the value stack"| G["stdout"]
    F -.->|"unhandled exception"| H["Traceback + exit code 1"]`
        ),
        b.info(
          'Other implementations exist, and that is a feature',
          'CPython is the reference implementation and the one you will meet first. PyPy compiles the bytecode to machine code with a JIT and is dramatically faster on hot loops. Jython targets the JVM, IronPython the CLR, and GraalPy the JVM with better native interop. The language is the same; only the "Execute" stage differs.'
        ),
        b.tip(
          'Try it right now',
          'Run `python -c "import dis; dis.dis(compile("x = 1 + 2", "<s>", "exec"))"`. Seeing that `+` becomes a BINARY_OP with a constant-pool reference is the moment the abstraction stops being a story.'
        ),
      ],
      questions: [
        [
          'Which stage of the Python pipeline turns indentation into INDENT and DEDENT tokens?',
          ['Parse', 'Compile', 'Tokenize', 'Execute'],
          2,
          'The tokenizer converts leading whitespace into INDENT and DEDENT tokens, which is why indentation is syntax rather than formatting.',
        ],
        [
          'Why does Python start measurably slower than a compiled binary?',
          [
            'Because it must read the whole file from disk every run',
            'Because the PVM must set up frames, populate the constant pool and run a bytecode loop rather than jumping straight to machine instructions',
            'Because Python is dynamically linked at startup',
            'Because the garbage collector runs before main()',
          ],
          1,
          'There is no machine code to jump into. The interpreter sets up execution state and then interprets bytecode instructions one at a time. Note the .pyc cache means the compile step is not repeated.',
        ],
        [
          'In 2 + 3 * 4, why is the result 14?',
          [
            'Operators are evaluated strictly left to right',
            'The parser nests the multiplication node inside the addition node because * has higher precedence',
            'Multiplication is evaluated first because it is faster',
            'The bytecode is generated in reverse order',
          ],
          1,
          'Precedence is a property of the tree the parser builds, not of the bytecode or of timing. * binds tighter, so it sits deeper, and the tree evaluates 3 * 4 first.',
        ],
        [
          'Where does the bytecode cache live and what invalidates it?',
          [
            'In the same directory as the source, keyed by source mtime and size',
            'In __pycache__ next to the source, keyed by a hash of the source and the interpreter version',
            'In a system-wide temp directory, keyed by the filename',
            'It is not cached; bytecode is regenerated on every run',
          ],
          1,
          'CPython writes __pycache__/module.cpython-312.pyc, whose header records the source mtime, size and a source hash. Changing the source, or the Python version, forces a rebuild.',
        ],
      ],
    },
    {
      title: 'Your setup: interpreter, editor, REPL and venv',
      summary: 'Install Python, run your first program, use the REPL as a real tool, and keep projects isolated.',
      duration: 16,
      build: (b) => [
        b.md(`## Install, then verify

Get a current 3.x interpreter. On this course's machine-agnostic terms: Windows users install from python.org (tick "Add python.exe to PATH"), macOS users may already have one, and Linux users should prefer your distribution's package or pyenv. Then check:

\`\`\`bash
python3 --version
\`\`\`

\`\`\`text
Python 3.12.4
\`\`\`

If that prints a 3.x, you are ready. If it prints nothing or a 2.x, install properly rather than working around it — half of all "weird Python bugs" in the wild are Python 2 code being run under a Python 3 interpreter.

## Run something

\`\`\`bash
mkdir -p hello && cd hello
python3 -c "print('hello from one line')"
\`\`\`

Then make it a file, \`hello.py\`, containing \`print("hello from a file")\`, and run \`python3 hello.py\`.

Notice what is *missing* compared with a compiled language: no build step, no output binary, no compile command, and nothing to clean. A Python file is run directly, every time.

## The REPL is a debugging tool, not a toy

\`\`\`bash
python3
\`\`\`

\`\`\`text
>>> 2 + 3 * 4
14
>>> scores = [3, 1, 2]
>>> sorted(scores)
[1, 2, 3]
>>> scores
[3, 1, 2]
>>> type(scores)
<class 'list'>
>>> scores.sort()
>>> scores
[1, 2, 3]
>>>

The REPL keeps state between lines, which means you can paste in a function definition and then poke at it with real data. The three REPL commands worth memorising: **\`help()\`** for builtins, **\`dir(x)\`** for what an object can do, and **\`x?\`** for a docstring. When a method does not behave the way you expected, \`dir()\` is faster than a search engine.

## Keep every project in its own environment

A virtual environment is a private directory holding that project's installed packages. It costs one command and it is the difference between a working project and a broken one.

\`\`\`bash
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
python -m pip install requests
\`\`\`

From then on, \`python\` and \`pip\` inside that shell refer to the environment. \`python -m pip\` rather than plain \`pip\` is deliberate: it guarantees the pip belongs to the same interpreter you are about to run your code with. When something looks irreparably broken, deleting \`.venv\` and rebuilding it is a legitimate first move, not an admission of defeat.

## Pick an editor that fights you less

Any editor runs Python, but an editor that knows about the language saves real time: syntax highlighting, jump-to-definition, a debugger, and a linter that tells you about unused variables and shadowed names. VS Code, PyCharm and Neovim with a Python LSP are all fine. Whichever you pick, turn on the linter — \`ruff\` is fast, free, and catches the mistakes you cannot see.`),
        b.anim('trace', {
          title: 'Tracing a first program, line by line',
          badge: 'step through',
          code: `# greet.py
name = "Ada"
greeting = f"Hello, {name}!"
print(greeting)
print(f"{name} has {len(name)} letters")`,
          steps: [
            {
              caption: 'Before the first line runs',
              note: 'The module is compiled to bytecode, a module-level frame is created, and no names exist yet.',
              line: 1,
              vars: [],
              output: '',
            },
            {
              caption: 'name is bound to a string',
              note: 'The name name in the source now points at a str object. Two names, one object — you will exploit that in module 7.',
              line: 2,
              vars: [{ name: 'name', value: '"Ada"', tone: 'ok' }],
            },
            {
              caption: 'The f-string is evaluated, then bound',
              note: 'The expression greeting is evaluated first, producing a brand new string, and only then is the name assigned. Right-hand side before left-hand side, always.',
              line: 3,
              vars: [
                { name: 'name', value: '"Ada"', tone: 'ok' },
                { name: 'greeting', value: '"Hello, Ada!"', tone: 'ok' },
              ],
            },
            {
              caption: 'print() is called with one argument',
              note: 'print is looked up in the builtins, the string is passed, and the newline is appended by print itself, not by the string.',
              line: 4,
              vars: [
                { name: 'name', value: '"Ada"', tone: 'ok' },
                { name: 'greeting', value: '"Hello, Ada!"', tone: 'ok' },
              ],
              output: 'Hello, Ada!',
            },
            {
              caption: 'A second f-string calls len()',
              note: 'len counts characters, not bytes — "Ada" is 3 here, and would still be 3 for a name with a non-ASCII character.',
              line: 5,
              vars: [
                { name: 'name', value: '"Ada"', tone: 'ok' },
                { name: 'greeting', value: '"Hello, Ada!"', tone: 'ok' },
              ],
              output: 'Ada has 3 letters',
            },
          ],
        }),
        b.lead('The setup checklist'),
        b.checklist('Before you write real code', [
          '`python3 --version` prints a 3.x',
          'You can run `python3 -c "print(1)"` and get output',
          'You have created a `.venv` in the project and activated it',
          'Your editor has a Python linter enabled',
          'You know that `python -m pip` is safer than bare `pip`',
          'You can find your interpreter path with `python3 -c "import sys; print(sys.executable)"`',
        ]),
        b.tip(
          'Two editors, two workflows',
          'Scripts and small experiments go in the REPL and single files. Anything over about 200 lines goes in a real file, because you cannot edit a function definition once the REPL has accepted it — you have to retype it.'
        ),
        b.warn(
          'The most common beginner environment bug',
          'You install a package, the import fails, and you spend an hour confused. The cause is almost always that pip installed into a different interpreter than the one running your file. Compare `python -m pip --version` with `python -c "import sys; print(sys.executable)"` and they should agree.'
        ),
        b.resources('Where to go next', [
          { label: 'The official tutorial (read this after module 2)', url: 'https://docs.python.org/3/tutorial/' },
          { label: 'PEP 8 — the style guide every Python project follows', url: 'https://peps.python.org/pep-0008/' },
          { label: 'Ruff — the fast linter and formatter', url: 'https://docs.astral.sh/ruff/' },
        ]),
      ],
      questions: [
        [
          'Why is `python -m pip install X` preferred over `pip install X`?',
          [
            'It is faster',
            'It guarantees pip belongs to the same interpreter that will run your code',
            'It installs the newest version of the package',
            'It works without a virtual environment',
          ],
          1,
          'pip is just a script, and there can be several on your PATH from different installs. Running it as a module of the interpreter you are using removes the ambiguity entirely.',
        ],
        [
          'What does a virtual environment actually do?',
          [
          'It creates a copy of the Python interpreter with the packages installed inside that directory',
            'It runs your code in a separate process for safety',
            'It compresses your installed packages to save disk space',
            'It is only used for Python 2 compatibility',
          ],
          0,
          'It is a directory with its own bin/ and lib/ that points back at the base interpreter. Activating it puts its scripts first on PATH, so python and pip resolve to that environment. It does not copy the interpreter itself.',
        ],
        [
          'In the REPL, which command shows you what methods an object supports?',
          ['help(x)', 'dir(x)', 'type(x)', 'repr(x)'],
          1,
          'dir(x) lists the attributes available on the object. help() and x? give you a docstring, and type() and repr() describe the object rather than its interface.',
        ],
        [
          'You install a package successfully but the import still fails. What is the most likely cause?',
          [
            'The package is broken',
            'The package was installed into a different interpreter or virtual environment than the one running your code',
            'Python caches imports and needs a restart of your machine',
            'The package name and the import name are always different',
          ],
          1,
          'Almost every occurrence of this is an environment mismatch. Check with `python -m pip --version` and `python -c "import sys; print(sys.executable)"` — both should point at the same environment.',
        ],
      ],
    },
  ]
);
