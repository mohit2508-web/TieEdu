// Module 1 — Python Foundations: Setup, Variables, Strings & Basic Types
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, code } from '../nineBlocks';
import { lesson, M1, COURSE_ID } from './helpers';

export const module1: CourseModule = {
  id: M1,
  course_id: COURSE_ID,
  title: 'Module 1 — Python Foundations: Setup, Variables, Strings & Basic Types',
  summary:
    'Getting Python running (interpreter, scripts, Jupyter/Colab), how variables and dynamic typing actually work, strings and f-strings for real output, and input/print with int, float, bool and None.',
  sort_order: 1,
  lessons: [
    lesson(
      M1,
      'pyai-1-1',
      1,
      'Getting Python Running: Interpreter, Scripts, Jupyter & Colab',
      'What Python is, the three ways to run code, how to verify your install, and how notebook state differs from a script.',
      16,
      nineBlocks({
        objectives: [
          'Verify a Python 3 installation and start and exit the interactive interpreter',
          'Write, save and run a .py script from the terminal',
          'Run multi-cell code in Google Colab or Jupyter and explain how kernel state works',
          'Choose the right runner (interpreter, script or notebook) for a given task',
        ],
        hook:
          'Day one of every Python class splits into two groups: the students who spend the evening fighting an installer, and the one who opens colab.research.google.com and runs their first line in forty seconds. Nothing in this course is learned by reading alone — you learn Python by running Python. Ten minutes to a working runner removes the only real barrier between you and every lesson after this one.',
        concept: `**What Python actually is.** Python is a high-level programming language. When you run a .py file, Python first translates your source into an intermediate form called **bytecode**, and then a Python runtime executes that bytecode. You never see or manage that translation — there is no separate "compile" step to remember. Edit, run, read the result, edit again. That fast iteration loop is a large part of why Python won data science and AI: when your work is exploration, the speed of the edit-run cycle often matters more than the raw speed of the executed code.

**Three ways to run code — and they behave differently:**
1. **The interpreter (REPL).** Type \`python3\` at a terminal (often just \`python\` on Windows) and you get a \`>>>\` prompt. Every line you type is evaluated immediately and its result printed. \`exit()\` returns you to the shell. Perfect for checking what one line does — terrible for anything longer than a screen, because the session ends when you close it.
2. **A script.** A plain text file ending in \`.py\` holding a sequence of statements. You run it with \`python3 myfile.py\`, it executes **top to bottom exactly once**, prints whatever you print, and exits. State does not survive: every run starts fresh. This is how real programs are delivered.
3. **A notebook (Jupyter or Google Colab).** Code is split into **cells** you run one at a time, in any order you like, in a **kernel** — a long-lived process that keeps every variable alive between cells. Cell 1 can load a dataset; cells 2–50 can explore it without reloading. Notebooks are the native format of AI work: almost every ML tutorial, Kaggle analysis and research result you meet is a notebook. Their power (experiment interactively) is also their trap (state can go stale — see below).

**Which one when.** Interpreter: a one-line question ("does this sort work?"). Script: anything you will keep, re-run, or hand to someone else. Notebook: data analysis, charts, teaching, and learning — which is why this course shows notebook cells alongside runnable scripts.

**Installing, honestly.** Only Python 3 matters — Python 2 reached end of life in 2020 and any \`python2\` you find is a museum piece. Current versions are 3.11 through 3.13; any of them runs every example in this course. On Windows, install from python.org and tick **"Add python.exe to PATH"** during setup — skipping that box is the single most common reason the \`python\` command mysteriously does not exist later. macOS and most Linux distributions already ship \`python3\`. Google Colab needs no installation at all: a free Linux machine in your browser with NumPy, pandas, matplotlib and much of the AI stack preloaded. The catch is ownership: a Colab machine is rented RAM tied to your session, so anything you want to keep must be saved to Google Drive or downloaded before you disconnect.`,
        extras: [
          table(
            'Three runners, three behaviours',
            ['Runner', 'Best for', 'State between runs', 'How you start it'],
            [
              ['Interpreter', 'Testing one line', 'Dies when you exit', 'python3 at the terminal'],
              ['Script (.py)', 'Anything you keep or ship', 'None — fresh every run', 'python3 myfile.py'],
              ['Notebook (Jupyter/Colab)', 'Analysis, AI work, teaching', 'All variables live in the kernel', 'Browser tab or jupyter notebook'],
            ],
          ),
          tip(
            'Zero-install first hour',
            'If anything about installing fails, open incognito chrome and go to colab.research.google.com → File → New notebook. You get a working Python 3 session with the AI stack in under a minute. Come back to local installs after Lesson 3.',
          ),
          warn(
            'python versus python3',
            'On macOS and Linux the bare command python is either missing or points at Python 2, which will reject modern syntax with confusing errors. Get in the habit of typing python3 (and verifying python3 --version). On Windows the installed command is python.',
          ),
        ],
        worked: {
          title: 'From a blank machine to a running program',
          problem:
            'You have never run Python on this computer. Reach the point where you can (a) check the version, (b) run a one-liner, (c) run a saved script, and (d) run a notebook cell — and know which output belongs to which method.',
          steps: [
            {
              title: '1. Check what is installed',
              desc: 'In a terminal, ask Python for its version. Any 3.x answer means you are ready; a "command not found" means install first (or just use Colab).',
              code_snippet: 'python3 --version\n# Windows: python --version\n# Expected: Python 3.12.7',
            },
            {
              title: '2. Talk to the interpreter',
              desc: 'Start the interpreter, evaluate two lines, then leave. The >>> prompt means Python is waiting for one statement at a time.',
              code_snippet: 'python3\n>>> print(3 * 14)\n42\n>>> exit()',
            },
            {
              title: '3. Run a saved script',
              desc: 'Put this in a file named hello.py in a folder you know, then run it by path. Output is plain — no prompts, no In/Out numbers.',
              code_snippet: '# hello.py\nname = "Ada"\nprint("Hello,", name)\n\n# then in the terminal:\npython3 hello.py',
            },
            {
              title: '4. Run a notebook cell',
              desc: 'Open colab.research.google.com → New notebook. Paste into the first cell and press the play button (or Shift+Enter). A second cell can print(x) — the kernel kept x alive. Close the tab and both are gone.',
              code_snippet: 'x = 6 * 7\nprint(x)   # 42',
            },
          ],
          solution:
            'Version check gives Python 3.x; the interpreter answered 42 for one line; hello.py printed "Hello, Ada" as a one-shot script; the notebook kept x across cells. Recognise each output style — prompt-led (interpreter), plain (script), numbered cells (notebook) — because confusing them is how people misread where a result came from.',
        },
        practice: {
          title: 'Set up and record your runner',
          prompt:
            'Open Colab (or your local install) and run three cells in order: (1) print your Python version with import sys; print(sys.version), (2) create a variable student = "your name" and print it, (3) print the variable again after re-running cell 1. Note exactly what persists and what does not.',
          hint: 'Re-running cell 1 does not touch student, because cells share one kernel — but restarting the runtime (Runtime → Restart runtime) wipes everything.',
        },
        mistakes: [
          {
            mistake: 'Typing python and getting "command not found" or an ancient Python 2 banner',
            fix: 'Use python3 explicitly and confirm with python3 --version. On Windows, reinstall from python.org with the "Add to PATH" checkbox ticked.',
          },
          {
            mistake: 'Expecting notebook variables to survive closing the browser',
            fix: 'The kernel is rented memory tied to your session. Save code cells (they are safe in the file); re-run them after a restart to rebuild state.',
          },
          {
            mistake: 'Running python myfile.py from a folder that does not contain the file',
            fix: 'The error "can\'t open file ... myfile.py" is a path problem, not a Python problem. cd to the folder first, or pass the real path: python3 scripts/hello.py.',
          },
          {
            mistake: 'Assuming everything you run shares one environment',
            fix: 'Your terminal, your local Jupyter kernel and a Colab session are three separate Pythons with separate packages. This is exactly why Module 3 covers virtual environments.',
          },
        ],
        exam: {
          question:
            'What is the difference between a compiled and an interpreted language, and where does Python actually sit?',
          answer:
            'A compiled language (C, C++, Rust) translates the whole source into machine code ahead of time, producing a separate executable you then run. An interpreted language executes the source (or an intermediate form of it) statement by statement at run time. Python is a hybrid: it compiles source to bytecode — cached in a __pycache__ folder — and executes that bytecode on a virtual machine, so there is no separate build step but also no direct machine-code translation. The trade-off is rapid edit-run iteration and portability across platforms versus lower raw execution speed, which is precisely the gap libraries like NumPy close later in this course.',
          source: 'Standard opening question in Python placement rounds and university unit tests.',
        },
        summary: [
          'Python runs three ways: interpreter (one line at a time), script (top to bottom once), notebook (cells with live kernel state).',
          'Running Python compiles to bytecode behind the scenes — no separate compile step, fast edit-run loop.',
          'Only Python 3 matters; verify with python3 --version and beware the python versus python3 naming trap.',
          'Colab gives you a free, preloaded environment in the browser — but its state and files are session-bound.',
          'Notebook state lives in the kernel: persistent until you restart, unreliable if you run cells out of order.',
        ],
      }),
      [
        [
          'Which command correctly checks your Python version on macOS or Linux?',
          ['python --version', 'python3 --version', 'pip --version', 'jupyter --version'],
          1,
          'python3 is the Python 3 command on macOS/Linux; the bare python is often missing or is Python 2.',
        ],
        [
          'A notebook cell runs x = 6 * 7 and a later cell prints x successfully. This works because:',
          [
            'Notebooks save variables into the .py file automatically',
            'Cells share variables held alive by the kernel process',
            'Colab uploads the variable to Google Drive',
            'print() searches all previous cells for the name',
          ],
          1,
          'The kernel is a long-lived process holding every variable until the session restarts; nothing is saved to disk by running a cell.',
        ],
        [
          'Why can re-running notebook cells out of order produce wrong results or errors?',
          [
            'Python forbids running cells more than once',
            'The kernel recompiles the notebook each run',
            'Kernel state may no longer match what later cells expect',
            'Notebooks delete variables after 24 hours',
          ],
          2,
          'Cells mutate shared kernel state; after reordering or partial re-runs, names may hold older or missing values than the cell assumes.',
        ],
        [
          'The key behavioural difference between a script and a notebook is:',
          [
            'Scripts can use variables, notebooks cannot',
            'Notebooks run code once; scripts keep it alive between cells',
            'Scripts run top-to-bottom once with fresh state; notebooks keep live state between cells',
            'There is no difference — both just print output',
          ],
          2,
          'A script is executed from top to bottom and exits; a notebook keeps a kernel alive so cells build on each other.',
        ],
      ]
    ),
    lesson(
      M1,
      'pyai-1-2',
      2,
      'Variables and Dynamic Typing: Names Point at Values',
      'Assignment as naming, why variables have no type of their own, reassignment, aliasing, and naming rules that keep code readable.',
      16,
      nineBlocks({
        objectives: [
          'Create variables with valid names and read assignment right-to-left',
          'Explain dynamic typing: the name is a label, the object carries the type',
          'Predict the result of reassignment and of aliasing a list with b = a',
          'Inspect any value\'s type at the interpreter with type() and isinstance()',
        ],
        hook:
          'In Java you write int age = 21 and the compiler refuses age = "twenty-one". Python says nothing at write time — it will happily run for minutes and then crash on the line where the string finally meets arithmetic. Worse: b = a on a list does not copy anything, so one line quietly changes two "different" variables. Both surprises vanish the moment you understand one idea: a variable is a name stuck on a value, not a box holding it.',
        concept: `**Assignment is naming.** The line \`age = 21\` does three things: it creates the object 21 in memory, it binds the name \`age\` to that object, and it does nothing else — no declaration, no reserved box, no type slot. Read \`=\` right to left: *age gets bound to 21*. When you later write \`age = age + 1\`, Python evaluates the right side (21 + 1 = 22), creates a **new** integer object 22, and rebinds the name \`age\` to it. The old object 21 is not modified — integers cannot be modified at all (they are **immutable**); it simply stops being referenced.

**Dynamic typing: the name has no type — the value does.** \`age\` can point at 21 on one line and at \`"twenty-one"\` on the next. Nothing converts; the label just moves to a different object. This is what "dynamically typed" means: types are attached to objects and checked **while the program runs**, not before it runs. Consequences, in order of how they bite beginners:
- Type errors appear at execution time, and only on the line that actually runs — a branch you never tested can hide a type bug indefinitely.
- \`type(x)\` tells you what class of object \`x\` currently refers to: \`type(5)\` → \`<class 'int'>\`, \`type("5")\` → \`<class 'str'>\`. The strings \`"5"\` and the number \`5\` are entirely different objects that merely print similarly.
- Python 3.5+ supports **type hints** (\`def total(marks: list[int]) -> float:\`) which document intent and let tools like mypy check your code — but the Python interpreter itself ignores them at run time. Hints are notes to humans and linters, not enforcement.

**Naming rules and conventions.** Names may contain letters, digits and underscores, may not start with a digit, and are case-sensitive — \`Age\` and \`age\` are two unrelated names. Keywords (\`if\`, \`for\`, \`class\`, \`import\`, \`def\`...) are reserved; assigning to one is a SyntaxError. Conventions are not enforced but are universal: \`snake_case\` for variables and functions, \`CamelCase\` for classes, \`ALL_CAPS\` for constants, and descriptive over short — \`total_marks\` beats \`tm\` every time your code is read again in three months (including by you).

**Aliasing: the sharpest early edge.** \`b = a\` never copies. For immutable values (int, str, float, tuple) that is harmless — nothing can change under you. For **mutable** objects like lists, both names point at **one** object, so \`b.append(9)\` is visible through \`a\` too. If you wanted a copy, you had to ask for one explicitly (\`b = a.copy()\`). You will live inside this behaviour for the rest of the course — pandas DataFrames, NumPy arrays and every dataset you load behave the same way — so it pays to see it once, deliberately, in five lines of pure Python.`,
        extras: [
          table(
            'Reading the common lines',
            ['Line', 'What really happens'],
            [
              ['x = 5', 'Create int 5, bind name x to it'],
              ['x = x + 1', 'Evaluate old x, create a new int, rebind x — no mutation'],
              ['x = "five"', 'Legal: x now points at a str; 5 is untouched elsewhere'],
              ['y = x', 'y points at the SAME object as x — not a copy'],
              ['type(x)', "Returns the class of x's current object"],
            ],
          ),
          tip(
            'Prove aliasing to yourself in ten seconds',
            'At the interpreter: a = [1, 2, 3] then b = a then b.append(4) then print(a). Seeing [1, 2, 3, 4] teaches more than any paragraph — including this one.',
          ),
          warn(
            '"=" is not equality',
            'Assignment binds a name (a = b). Comparison asks a question and yields True or False (a == b). Python will not stop you writing if x = 5 by accident in modern versions only because it is a SyntaxError — but mixing them up in prose and interviews still costs marks.',
          ),
        ],
        worked: {
          title: 'Predict the output before running it',
          problem:
            'Without running anything, state the exact output of this script, then verify by running it:\n\na = 10\nb = a\na = 20\nc = [1, 2]\nd = c\nd.append(3)\nprint(a, b, c, d)',
          steps: [
            {
              title: 'Lines 1–2: bind two names to one int',
              desc: 'a = 10 creates int 10; b = a points b at the same 10. Harmless so far — integers are immutable, so there is nothing to change.',
            },
            {
              title: 'Line 3: rebind, not modify',
              desc: 'a = 20 creates a NEW int 20 and moves the name a. b still points at 10, because rebinding a never touches whatever b points to.',
            },
            {
              title: 'Lines 4–6: bind two names to one list',
              desc: 'd = c makes both names refer to the same list object. Lists are mutable, so d.append(3) modifies that single shared object.',
            },
            {
              title: 'Line 7: read it all off',
              desc: 'a is 20, b is 10, and c and d both show the same mutated list [1, 2, 3] — because they were never two lists.',
            },
          ],
          solution:
            'Output: 20 10 [1, 2, 3] [1, 2, 3]. Reassignment moves a name (integers are replaced wholesale); aliasing shares one mutable object. If line 5 had been d = c.copy(), the last two items would read [1, 2] and [1, 2, 3].',
        },
        practice: {
          title: 'Alias, rebind, copy',
          prompt:
            'Write one script that demonstrates all three behaviours and prints labelled results: (1) rebind an int and show an old name keeping its value, (2) alias a list with b = a and mutate it so both names show the change, (3) make an independent copy so mutating it leaves the original alone. Add a comment on each line saying whether it rebinds or mutates.',
          hint: 'Use a = a.copy() or b = list(a) for the independent copy; print(type(x)) for at least two values.',
        },
        mistakes: [
          {
            mistake: 'Expecting a type error the moment you write a suspicious line',
            fix: 'Python checks types while running, not while you type. Exercise every branch you wrote — an untested if-branch is where type bugs hide.',
          },
          {
            mistake: 'Reusing one name for totally different things (total = 0, later total = "many")',
            fix: 'It is legal and it breaks every later arithmetic line on that name. One job per name; when the job changes, pick a new name.',
          },
          {
            mistake: 'Thinking b = a copies a list',
            fix: 'It creates a second name for one object. Ask explicitly: a.copy(), list(a), or slicing a[:] for a shallow copy.',
          },
          {
            mistake: 'Writing variable names that collide with keywords or start with digits (2nd_place, class_name is fine, class is not)',
            fix: 'Keywords like class, if, import are reserved — assigning to them is a SyntaxError. Start with a letter and use snake_case.',
          },
        ],
        exam: {
          question:
            'Explain the difference between these two lines and give the value of y in each case: (a) a = [1, 2]; b = a; b.append(3); y = a  (b) a = [1, 2]; b = a.copy(); b.append(3); y = a',
          answer:
            "Both use =, which binds a name to an object — it never copies. In (a), b and a name the SAME list, so append(3) is visible through both: y = [1, 2, 3]. In (b), .copy() creates a second list object, b points at the new one and mutates it, while a keeps the original: y = [1, 2]. The assignment operator never copies; only an explicit copy method does. This aliasing distinction is the classic first Python interview question because it predicts how bugs spread through real code.",
          source: 'Frequent warm-up question in Python interviews; also a university viva favourite.',
        },
        summary: [
          'Assignment binds a name to an object; read = as "gets bound to", right to left.',
          'Variables have no type — the object they currently name does; type(x) reveals it.',
          'Rebinding creates a new object; immutable values (int, str) are never changed in place.',
          'b = a shares one object — with lists, mutation through either name is visible in both.',
          'Names: letters/digits/underscore, no leading digit, case-sensitive, snake_case by convention.',
          'Dynamic typing moves errors to run time — test every branch you write.',
        ],
      }),
      [
        [
          'After x = 5; x = "five"; type(x) the result is:',
          ["<class 'int'>", "<class 'str'>", 'TypeError at line 2', 'None'],
          1,
          'The name was rebound to a string object; type() reports the class of whatever the name points at now.',
        ],
        [
          'a = [1, 2]; b = a; b.append(3). What is a?',
          ['[1, 2]', '[1, 2, 3]', '[1, 2, 3, 3]', 'An error — you cannot append'],
          1,
          'b = a shares one list object; appending through b mutates the same list a names.',
        ],
        [
          'Which is NOT a valid Python variable name?',
          ['total_1', '1st_place', 'max_value', 'myVar'],
          1,
          'Names may not begin with a digit; the rest are all legal (and snake_case, snake_case, camelCase respectively).',
        ],
        [
          'In Python, a variable\'s type is determined by:',
          ['A declaration at first assignment', 'The object the name currently refers to', 'The file it was defined in', 'mypy, at run time'],
          1,
          'Python is dynamically typed: types belong to objects, and names can be rebound to objects of any type.',
        ],
      ]
    ),
    lesson(
      M1,
      'pyai-1-3',
      3,
      'Strings and f-strings: Text You Can Shape',
      'String literals, indexing and slicing, immutability, f-string expressions and format specs, and the methods that transform text.',
      17,
      nineBlocks({
        objectives: [
          'Create strings with single, double and triple quotes and escape characters correctly',
          'Index and slice strings, including negative indices and reverse steps',
          'Build dynamic output with f-strings, expressions and format specs like .2f',
          'Transform strings with common methods (strip, lower, split, join, replace)',
        ],
        hook:
          'Before any language model reads a single word, a human has already built the string it sees: cleaned, trimmed, cased, labelled. Text work is the quiet majority of real data pipelines. It is also where beginners produce their most memorable bugs — a "marks" column that will not add because of one hidden space, or output that reads total is {n} because someone forgot the f.',
        concept: `**Strings are sequences of characters — and they are text, not numbers.** Python 3 strings are Unicode, so "₹450", a Devanagari word like "नमस्ते", and plain ASCII all behave identically: one string, one sequence of characters, indexable position by position. Quote choice is cosmetic: \`'he said "hi"'\` and \`"it's fine"\` are the same kind of object; pick whichever avoids escaping. A backslash introduces special characters — \`\\n\` newline, \`\\t\` tab, \`\\\\\` a literal backslash, \`\\'\` a quote inside a single-quoted string. Triple quotes (\`"""like this"""\`) hold multi-line text, which is why docstrings and prompt templates use them.

**Indexing and slicing — learn it once, use it on every sequence.** Characters are numbered from 0: for \`s = "Python"\`, \`s[0]\` is \`"P"\` and \`s[5]\` is \`"n"\`. Negative indices count from the end: \`s[-1]\` is \`"n"\`. A slice \`s[start:stop:step]\` includes \`start\` and excludes \`stop\` — \`s[0:3]\` is \`"Pyt"\`, so \`s[:3]\` is the same and \`s[3:]\` is \`"hon"\`. \`s[::2]\` takes every second character (\`"Pto"\`), and \`s[::-1]\` reverses the string (\`"nohtyP"\`). \`len(s)\` gives the length. Out-of-range access raises IndexError — Python never silently returns nothing.

**Strings are immutable.** \`s[0] = "p"\` raises TypeError: strings do not support item assignment. Every "change" is actually the creation of a new string: \`s = s.lower()\` rebinds \`s\` to a new object; \`s.lower()\` alone, discarded, does nothing. This is the string version of the aliasing lesson: methods return **new** strings and never modify the receiver.

**f-strings: the default way to build text (Python 3.6+).** Prefix the literal with \`f\` and put expressions inside braces: \`f"Hello, {name}!"\`. The brace content is real Python — arithmetic, function calls, indexing all work: \`f"{len(name)} chars"\`, \`f"{scores[0]:.1f}"\`. A colon introduces a **format spec** applied to the rendered value:

| Spec | Example | Output | Meaning |
| \`:.2f\` | \`f"{3.14159:.2f}"\` | \`3.14\` | fixed-point, 2 decimals |
| \`:>8\` | \`f"{42:>8}"\` | \`      42\` | right-align in 8 columns |
| \`:<15\` | \`f"{'Ada':<15}"\` | \`Ada             \` | left-align in 15 columns |
| \`:,\` | \`f"{1234567:,}"\` | \`1,234,567\` | thousands separators |
| \`:.1%\` | \`f"{0.856:.1%}"\` | \`85.6%\` | percent, 1 decimal |

Double braces (\`{{\` and \`}}\`) print a literal brace. Older styles — the \`%\` operator and \`"{}".format(x)\` — still appear in legacy code; you must be able to read them, but you should write f-strings.

**The methods you will use daily.** \`s.strip()\` removes leading/trailing whitespace (including newlines), \`s.lower()\`/\`s.upper()\` case-fold, \`s.replace("old", "new")\` substitutes, \`s.split(",")\` returns a **list** of pieces, \`s.startswith("http")\` tests, and \`",".join(parts)\` glues a list into one string — note the call sits on the **separator**, not the list. Together, strip → lower → split is the "ingest raw text" handshake you will repeat in every data lesson of this course.`,
        extras: [
          table(
            'Format specs worth memorising',
            ['Spec', 'Example', 'Output'],
            [
              [':.2f', 'f"{3.14159:.2f}"', '3.14'],
              [':>8', 'f"{42:>8}"', 'right-aligned in 8 columns'],
              [':<15', 'f"{"Ada":<15}"', 'left-aligned in 15 columns'],
              [':^9', 'f"{"hi":^9}"', 'centred in 9 columns'],
              [':,', 'f"{1234567:,}"', '1,234,567'],
              [':.1%', 'f"{0.856:.1%}"', '85.6%'],
            ],
          ),
          tip(
            'Braces evaluate anything',
            'f"{sum(scores) / len(scores):.1f}" is one line: compute, then format. If you find yourself concatenating with + across several conversions, an f-string almost always does it more clearly.',
          ),
          warn(
            'Forgotten f, or a discarded method',
            '"Total: {n}" prints the braces literally — the f is not optional. And s.strip() on its own line changes nothing: strings are immutable, so rebind it with s = s.strip().',
          ),
        ],
        worked: {
          title: 'Turn raw text into a clean report line',
          problem:
            'A data export gave you "  ada lovelace  \\n" (messy spaces, trailing newline, lowercase) and a score of 87.4567. Produce clean, aligned output without printing stray spaces.',
          steps: [
            {
              title: '1. Clean the text',
              desc: 'strip() removes the surrounding whitespace and newline; title() upper-cases the first letter of each word. Both return NEW strings, so rebind.',
              code_snippet: 'raw = "  ada lovelace  \\n"\nname = raw.strip().title()\nprint(name)   # Ada Lovelace',
            },
            {
              title: '2. Format the numbers inside an f-string',
              desc: 'The format spec .1f rounds the display to one decimal; the underlying float is unchanged.',
              code_snippet: 'score = 87.4567\nprint(f"{name} scored {score:.1f} points")',
            },
            {
              title: '3. Align a tiny table',
              desc: 'The < and > specs pad each field to a fixed width so the columns line up — the same trick used for fixed-width log and report output.',
              code_snippet: 'print(f"{\'NAME\':<15}{\'SCORE\':>7}")\nprint(f"{name:<15}{score:>7.2f}")',
            },
          ],
          solution:
            'Output:\nAda Lovelace scored 87.5 points\nNAME             SCORE\nAda Lovelace      87.46\n\nOne pipeline: strip → title → f-string with .1f/.2f. The name is stored clean, the numbers are rendered to the precision the reader needs, and the column widths are fixed — no manual spaces anywhere.',
        },
        practice: {
          title: 'Build a one-line ID card',
          prompt:
            'Given name = "  alan turing  ", marks = 91.266, write three f-strings that print: (1) the cleaned name in capitals, (2) marks rounded to exactly one decimal, (3) a right-aligned two-column header plus data row showing name and marks to two decimals. Then use len() inside an f-string to print how many characters the cleaned name has.',
          hint: 'Clean first (strip, then upper), then format: f"{marks:.1f}", and pad with {name:<20} / {marks:>8}.',
        },
        mistakes: [
          {
            mistake: 'Trying to change a character: s[0] = "p"',
            fix: 'TypeError: strings do not support item assignment. Build a new string instead: s = s.replace("P", "p") or s = "p" + s[1:].',
          },
          {
            mistake: 'Forgetting the f prefix and printing braces literally',
            fix: '"Total: {n}" outputs exactly that text. The f makes braces evaluate: f"Total: {n}".',
          },
          {
            mistake: 'Calling join the wrong way round: parts.join(", ")',
            fix: 'join belongs to the separator string: ", ".join(parts). If parts is a list of words, this returns one sentence.',
          },
          {
            mistake: 'Concatenating strings and numbers with +',
            fix: '"marks: " + 42 raises TypeError. An f-string converts for you: f"marks: {42}".',
          },
        ],
        exam: {
          question:
            'Given pi = 3.14159, write an expression that prints pi rounded to exactly two decimal places, and explain what the format spec changes.',
          answer:
            'f"{pi:.2f}" produces "3.14". The .2f spec means: render as fixed-point notation with exactly 2 digits after the decimal point (rounding the displayed text). It changes only the text produced — the float pi itself still holds 3.14159, so formatting is safe to repeat and never destroys precision you may need later.',
          source: 'Common formatting question in beginner Python exams and technical screens.',
        },
        summary: [
          'Strings are Unicode sequences: index from 0, negative indices from the end, slice with start:stop:step (stop excluded).',
          'Strings are immutable — every method returns a new string; rebind to keep the change.',
          'f-strings evaluate real Python inside braces; a colon starts the format spec (.2f, >8, <15, :, .1%).',
          'Double braces print a literal brace; remember the f or you will print {name} verbatim.',
          'Daily methods: strip, lower/upper, replace, split, startswith, and sep.join(list).',
        ],
      }),
      [
        [
          'f"{10.56:.1f}" evaluates to:',
          ['10.6', '10.5', '10.56', 'Error — .1f is invalid'],
          0,
          'The .1f spec renders the float with one decimal place, rounding 10.56 up to 10.6.',
        ],
        [
          'With n = 42, which line prints exactly Total: 42?',
          ['"Total: {n}"', 'f"Total: {n}"', 'f"Total: n"', 'f"Total: + n"'],
          1,
          'Only the f-prefix makes braces evaluate; without it the braces and n print literally.',
        ],
        [
          's = "Python". Which expression gives "nohtyP"?',
          ['s[::-1]', 's[:]', 's.upper()', 's.replace("P", "p")'],
          0,
          'A step of -1 walks the string backwards; the other options return "Python" or "python".',
        ],
        [
          'a = " hi "; b = a.strip(). What is a == b?',
          ['True', 'False', 'TypeError', 'They are the same object'],
          1,
          'strip() returns a NEW string "hi"; the name a still points at " hi ", so the comparison fails.',
        ],
      ]
    ),
    lesson(
      M1,
      'pyai-1-4',
      4,
      'input(), print() and the Four Basic Types: int, float, bool, None',
      'Reading user input safely (it is always text), printing with sep/end, and how int, float, bool and None behave in arithmetic.',
      16,
      nineBlocks({
        objectives: [
          'Read a value with input() and convert it to the correct type explicitly',
          'Distinguish int, float, bool and None and produce each deliberately',
          'Use print() with multiple arguments, sep and end for controlled output',
          'Predict the type and value of arithmetic results (/, //, %, **)',
        ],
        hook:
          'A student builds a marks calculator. The user types 10 and then 4, and the program confidently prints 104 — or crashes with "can only concatenate str not int to str". The bug is one line old and completely invisible: input() returned text, and text plus a number is either string glue or a TypeError. Every beginner meets this; every professional recognises it instantly.',
        concept: `**input() always returns a string — without exception.** \`name = input("Name: ")\` displays the prompt, waits for a line, and binds whatever was typed as a **str**. It does not care that you typed \`42\`: you get \`"42"\`. Consequences:
- \`age = input("Age: ")\` then \`age + 1\` either raises TypeError (str + int) or, if the other operand were a string, silently produces concatenation ("42" + "1" = "421") — the nastier outcome, because no error fires.
- The fix is explicit conversion at the point of reading: \`age = int(input("Age: "))\`, \`marks = float(input("Marks: "))\`.
- Conversion can fail. \`int("abc")\` raises **ValueError**, and a subtle trap: \`int("3.14")\` also raises ValueError — you must go through float first (\`int(float("3.14"))\` → 3). Handling bad input gracefully with try/except is Lesson 4.3's job; today, know that the failure exists and where it comes from.

**The four types you will use constantly.**
- **int** — whole numbers with unlimited size: \`42\`, \`-7\`, even \`10 ** 100\` (a 101-digit integer, exact — no overflow).
- **float** — binary floating-point decimals: \`3.14\`, \`1e-3\` (0.001). Floats are approximations: \`0.1 + 0.2\` is \`0.30000000000000004\` in IEEE 754 — a fact that will matter in every statistics lesson later. A whole number written with a dot (\`2.0\`) is a float.
- **bool** — \`True\` and \`False\`, capitalised (lowercase \`true\` is a NameError borrowed from JavaScript). Booleans are secretly integers: \`True + True == 2\`, and \`int(True) == 1\`. Truth testing: \`0\`, \`0.0\`, \`""\`, \`[]\`, \`{}\` and \`None\` are falsy; almost everything else is truthy. \`bool(x)\` shows you the answer.
- **None** — the explicit "nothing here" value. A function with no return statement hands back None; an optional field with no value is None. Its type is \`NoneType\` and \`None\` is its only member. Always compare with \`is None\` /\`is not None\` rather than \`== None\`, because identity is the question you actually mean.

**Arithmetic decides its own output types.** On two ints, \`+ - * **\` give int (\`2 ** 10\` → \`1024\`). \`/\` **always** gives float (\`7 / 2\` → \`3.5\`, even \`6 / 3\` → \`2.0\`). \`//\` floor-divides to an int-ish result (\`7 // 2\` → \`3\`), \`%\` takes the remainder (\`7 % 2\` → \`1\`), and mixing int with float promotes to float. Comparisons (\`== != < > <= >=\`) always produce bool. \`round(x, 2)\` and \`abs(x)\` round out the toolkit.

**print() is more configurable than it looks.** \`print(a, b, c)\` joins with a space (\`sep=" "\`) and ends with a newline (\`end="\\n"\`) — both are parameters you can override: \`print("Loading", end="")\` keeps the cursor put for progress output; \`print(a, b, sep=" — ")\` changes the joiner. \`print()\` alone prints a blank line. In notebooks, a bare expression at the end of a cell shows a numbered \`Out[ ]\` repr, while print() shows exactly what you asked for — knowing which is which stops you misreading results.`,
        extras: [
          table(
            'The four basics at the REPL',
            ['Type', 'Examples', 'Notes'],
            [
              ['int', '42, -7, 10**100', 'Whole, exact, unlimited size'],
              ['float', '3.14, 1e-3, 2.0', 'Approximate binary decimals — 0.1 + 0.2 is not 0.3'],
              ['bool', 'True, False', 'Subclass of int: True == 1, False == 0'],
              ['None', 'None', 'Type NoneType; compare with is None'],
            ],
          ),
          code(
            'raw = input("Marks: ")   # user types: 87\nprint(type(raw))          # <class \'str\'> — always\n\nmarks = float(raw)        # now a number\nprint(marks + 3)          # 90.0\nprint(f"Total: {marks + 3:.1f}")',
            'input-conversion.py',
            'python',
          ),
          warn(
            'input() never guesses',
            'There is no "smart" input in Python. If a calculation follows, convert immediately: int(input(...)) or float(input(...)). And never build the conversion inside a loop body that runs repeatedly on the same already-converted value.',
          ),
        ],
        worked: {
          title: 'A calculator that does not print 104',
          problem:
            'Read two numbers from the user and print their sum, their average to two decimals, and whether the first is larger — with correct types and clean formatting.',
          steps: [
            {
              title: '1. Read and convert at the door',
              desc: 'Convert immediately with float(), so every later line is arithmetic instead of string handling. Using float (not int) keeps decimal marks working.',
              code_snippet: 'a = float(input("First number: "))\nb = float(input("Second number: "))',
            },
            {
              title: '2. Compute with numbers',
              desc: 'Sum and average are plain arithmetic; / always returns a float, so the average needs no extra conversion.',
              code_snippet: 'total = a + b\naverage = total / 2',
            },
            {
              title: '3. Report with f-strings and a bool',
              desc: 'a > b yields a bool, which an f-string renders as True/False. The .2f spec controls the decimals without rounding the stored value.',
              code_snippet: 'print(f"{a} + {b} = {total}")\nprint(f"Average: {average:.2f}")\nprint(f"First is larger: {a > b}")',
            },
            {
              title: '4. Verify with the values 10 and 4',
              desc: 'Expected output below. Now repeat with 4 and 10 — only the last line should change, which is your first sign of correct separation of input, logic and output.',
              code_snippet: '# 10.0 + 4.0 = 14.0\n# Average: 7.00\n# First is larger: True',
            },
          ],
          solution:
            'Converting at input() makes every downstream line simple arithmetic, the f-string handles display, and the comparison produces a genuine bool. Feed 10 and 4: "10.0 + 4.0 = 14.0", "Average: 7.00", "First is larger: True". The string-concatenation bug never gets a chance to exist.',
        },
        practice: {
          title: 'Age and percentage report',
          prompt:
            'Write a program that reads a name (string), a birth year (integer) and marks out of 100 (float), then prints: the person\'s age in 2026, their marks to one decimal, and a True/False line asking whether they scored at least 75. Use at least two different print() calls, one of which uses sep= or end=.',
          hint: 'age = 2026 - int(input(...)); check the type of every converted value with type() as you go.',
        },
        mistakes: [
          {
            mistake: 'Forgetting to convert input() before arithmetic',
            fix: 'Convert at the point of reading: int(input(...)) / float(input(...)). If you already stored the raw string, convert when you use it — but decide once, not three times.',
          },
          {
            mistake: 'Expecting / to produce a whole number when it divides evenly',
            fix: '6 / 3 is 2.0, a float. If you want integer division, ask for it: 6 // 3 is 2.',
          },
          {
            mistake: 'Borrowing true / null / undefined from other languages',
            fix: 'Python spells them True, None (and has no undefined). Lowercase true raises NameError, which is Python catching you early.',
          },
          {
            mistake: 'Comparing None with == None, or confusing None with 0 or ""',
            fix: 'None is its own value, not a number or an empty string: use x is None. Note 0 and "" are falsy too, so if x: and if x is not None: behave differently — pick deliberately.',
          },
        ],
        exam: {
          question:
            'What does input() return, and how would you safely read an integer from the user? Include what happens on bad input.',
          answer:
            'input() always returns a string — the literal text typed, regardless of content. To read an integer, wrap it: age = int(input("Age: ")). int() parses the decimal text into an int; on non-numeric input (like "twenty" or "3.14") it raises ValueError at that moment. Production code therefore either validates first (check the string is all digits / matches a pattern) or catches the failure with try/except and re-prompts — you will build exactly that in Module 4.',
          source: 'Universally asked in beginner interviews; the "input returns str" fact is a favourite one-liner.',
        },
        summary: [
          'input() returns str, always — convert explicitly with int() or float() where arithmetic follows.',
          'int is exact and unbounded; float is approximate (0.1 + 0.2 = 0.30000000000000004); bool is a subclass of int; None is its own type.',
          'Comparisons yield bool; functions without return yield None; compare None with is.',
          '/ always returns float, // floor-divides, % remainder, ** raises to a power.',
          'print(a, b) joins with a space and ends with a newline — both configurable via sep and end.',
          'A ValueError from int("3.14") is a conversion failure, not a syntax error — it happens at run time.',
        ],
      }),
      [
        [
          'x = input("n: ") and the user types 5. What is x * 2?',
          ['10', '55', 'TypeError', '7'],
          1,
          'input() gives the string "5"; multiplying a string by 2 repeats it — "55". Convert with int() to get 10.',
        ],
        [
          'Which value is FALSY (fails if value:)?',
          ['"0"', '[]', '1', 'A non-empty string'],
          1,
          'Empty containers, 0, "", 0.0 and None are falsy; "0" is a non-empty string and is truthy.',
        ],
        [
          'The expressions 7 / 2 and 7 // 2 evaluate to:',
          ['3.5 and 3', '3 and 3.5', '3.5 and 3.5', '3 and 3'],
          0,
          'True division / always returns a float (3.5); floor division // drops the fractional part (3).',
        ],
        [
          'A function with no return statement gives back:',
          ['0', 'None', 'null', 'undefined'],
          1,
          'Python functions return None implicitly; there is no null or undefined in Python.',
        ],
      ]
    ),
  ],
};
