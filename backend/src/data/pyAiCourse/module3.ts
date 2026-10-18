// Module 3 — Functions, Imports & Code Quality
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, code } from '../nineBlocks';
import { lesson, M3, COURSE_ID } from './helpers';

export const module3: CourseModule = {
  id: M3,
  course_id: COURSE_ID,
  title: 'Module 3 — Functions, Imports & Code Quality',
  summary:
    'def, parameters, defaults and *args; return values and scope; imports, pip and virtual environments for real AI projects; docstrings, naming and the habits that keep code readable.',
  sort_order: 3,
  lessons: [
    lesson(
      M3,
      'pyai-3-1',
      1,
      'def, Parameters, Defaults and *args',
      'Defining and calling functions, positional versus keyword arguments, default values done right, and collecting extra arguments with *args and **kwargs.',
      17,
      nineBlocks({
        objectives: [
          'Define a function with def, call it, and capture the value it evaluates to',
          'Pass arguments positionally and by keyword and use default values correctly',
          'Collect arbitrary extra arguments with *args and **kwargs',
          'Write a correct default for a list parameter (and explain why [] is wrong)',
        ],
        hook:
          'A student pasted the same five-line average calculation into eight places across a lab file. When the rule changed (weight the last test double), they fixed six of the eight copies — and spent the evening hunting the other two. Functions are not a syntax topic; they are how one bug gets fixed once instead of eight times. And there is a famous trap hiding in default values that has broken code at companies worth billions — you will meet it in the next ten minutes.',
        concept: `**What a function is.** A function is a named block of statements you can run on demand, with optional inputs (**parameters**) and an optional output (**return value**). You define it once with \`def\`, then call it any number of times:

\`\`\`
def greet(name):
    return f"Hello, {name}!"

message = greet("Ada")     # the call evaluates to "Hello, Ada!"
\`\`\`

The \`def\` line ends with a colon; the body is indented four spaces (Python requires consistent indentation — mixing tabs and spaces raises TabError). Calling evaluates the arguments, runs the body, and the whole call expression becomes the return value — or \`None\` if the function returns nothing. The payoff of factoring logic into functions: you write it once, test it once, fix it once, and give it a name that documents its purpose.

**Three ways to pass arguments.**
- **Positional** — \`greet("Ada")\`: matched to parameters by order. The everyday form.
- **Keyword** — \`greet(name="Ada")\`: matched by name, order-free, and self-documenting at the call site. \`sorted(xs, reverse=True)\` is readable precisely because the keyword names the switch.
- **Defaults** — \`def greet(name, punctuation="!"):\`: if the caller omits a parameter, its default is used. Two rules: parameters **with** defaults must come **after** required ones (\`def f(a=1, b)\` is a SyntaxError — non-default argument follows default argument), and any caller can override a default by passing that keyword.

**The mutable-default trap — memorise this one.** Default values are evaluated **once**, at the moment the \`def\` line runs, not per call. For immutable defaults (numbers, strings, None) that is invisible. For a list it is a bug factory:

\`\`\`
def add_item(item, bucket=[]):      # WRONG — one list, shared by every call
    bucket.append(item)
    return bucket

add_item("a")     # ['a']
add_item("b")     # ['a', 'b']  — the "empty" default remembered
\`\`\`

Every call that omits \`bucket\` appends to the **same** list object created at definition time. The correct pattern is the universal fix — default to None and create the fresh object inside:

\`\`\`
def add_item(item, bucket=None):
    if bucket is None:
        bucket = []
    bucket.append(item)
    return bucket
\`\`\`

**Collecting extra arguments.** A single star packs any number of **positional** extras into a tuple; a double star packs **keyword** extras into a dict:

\`\`\`
def mean(*numbers):        # numbers is a tuple
    return sum(numbers) / len(numbers)

def profile(**fields):     # fields is a dict
    print(fields)

mean(1, 2, 3)                  # 2.0
profile(name="Ada", year=2)    # {'name': 'Ada', 'year': 2}
\`\`\`

\`*args\` and \`**kwargs\` are only naming conventions — the star is the mechanism, so \`*nums\` and \`**config\` work identically. The reverse works too: \`mean(*[1, 2, 3])\` unpacks a list into positional arguments. Once arguments are packed, all your Module 2 knowledge applies: iterate the tuple, key into the dict.`,
        extras: [
          table(
            'Parameter forms at a glance',
            ['Form', 'Call', 'Inside the function'],
            [
              ['def f(a)', 'f(1) / f(a=1)', 'a = 1'],
              ['def f(a, b=2)', 'f(1) / f(1, 9) / f(1, b=9)', 'b defaults to 2 when omitted'],
              ['def f(*nums)', 'f(1, 2, 3)', 'nums = (1, 2, 3) — a tuple'],
              ['def f(**kw)', 'f(x=1, y=2)', "kw = {'x': 1, 'y': 2} — a dict"],
            ],
          ),
          tip(
            'Defaults: None, then build',
            'The safe shape for any mutable default is always the same: def f(x, bucket=None), then if bucket is None: bucket = []. Once you can type it from muscle memory, the trap can never bite you again.',
          ),
          warn(
            'Default expressions run once',
            'Python evaluates default values when the function is DEFINED, not when it is called. That is the mechanism behind the shared-list bug — and behind time.time() defaults that freeze at startup. Immutable defaults are fine; mutable ones are not.',
          ),
        ],
        worked: {
          title: 'A small grading toolkit built from functions',
          problem:
            'Write mean(*numbers) to average any number of scores, and report(name, marks, subject="Maths", pass_mark=40) that prints one line per student. Call report for two students, one using defaults and one overriding them with keywords.',
          steps: [
            {
              title: '1. The variadic helper',
              desc: '*numbers collects every positional argument into a tuple — so mean(91, 88) and mean(91, 88, 95) both work with no signature change. Inside, tuple skills (len, iteration) do the rest.',
              code_snippet: 'def mean(*numbers):\n    return sum(numbers) / len(numbers)',
            },
            {
              title: '2. The caller with defaults',
              desc: 'Required parameters come first; the two optional ones carry defaults. The body composes the helper — one job per function.',
              code_snippet: 'def report(name, marks, subject="Maths", pass_mark=40):\n    average = mean(*marks)\n    verdict = "PASS" if average >= pass_mark else "FAIL"\n    print(f"{name} ({subject}): avg {average:.1f} -> {verdict}")',
            },
            {
              title: '3. Call with positional and keyword arguments',
              desc: 'The first call leans on both defaults; the second overrides them by name. Nothing about the function changes between the two.',
              code_snippet: 'report("Ada", [91, 88, 95])\n# Ada (Maths): avg 91.3 -> PASS\n\nreport("Alan", [35, 42], subject="Science", pass_mark=50)\n# Alan (Science): avg 38.5 -> FAIL',
            },
            {
              title: '4. Notice the unpacking',
              desc: 'marks arrives as a list; mean(*marks) unpacks it back into positional arguments. Packing (*args) and unpacking (*list) are the same star, used in two places.',
              code_snippet: 'scores = [70, 80]\nprint(mean(*scores))   # 75.0 — identical to mean(70, 80)',
            },
          ],
          solution:
            'Two small functions, each with one job, compose into a grading toolkit. mean() accepts any number of scores via *numbers; report() carries sensible defaults it can override per call. Output: "Ada (Maths): avg 91.3 -> PASS" and "Alan (Science): avg 38.5 -> FAIL". One average bug fixed inside mean() would fix every caller at once.',
        },
        practice: {
          title: 'Build a safe appender and a formatter',
          prompt:
            'Write two functions and test them: (1) add_item(item, bucket=None) that appends to a freshly created list when bucket is omitted — call it twice with no bucket and prove the two results are separate lists; (2) format_line(label, value, width=12) that prints label left-aligned and value right-aligned using f-string specs. Then call format_line with the width overridden by keyword.',
          hint: 'The None-default pattern; f"{label:<{width}}" is a nested-spec way to reuse width — or simply f"{label:<12}{value:>8}" for the first version.',
        },
        mistakes: [
          {
            mistake: 'def add(item, bucket=[]) — the default list that remembers',
            fix: 'Default to None and build the list inside the body. Default values are created once at def time, so any mutable default is shared across all calls that omit it.',
          },
          {
            mistake: 'Putting a required parameter after one with a default',
            fix: 'def f(a=1, b) is a SyntaxError. Order parameters: required first, optional last — or give everything defaults deliberately.',
          },
          {
            mistake: 'Confusing a function that prints with one that returns',
            fix: 'print() ends the call and the expression evaluates to None. If you need the result later, return it: result = f(x) only works when f actually returns.',
          },
          {
            mistake: 'Mutating the caller\'s list inside a function without saying so',
            fix: 'Parameters reference the same objects (aliasing from Module 1), so append inside is visible outside. Either document the mutation loudly or return a new value instead.',
          },
        ],
        exam: {
          question:
            'What does this code print across three calls, and why?  def add(item, bucket=[]): bucket.append(item); return bucket  —  add("a"), add("b"), add("c")',
          answer:
            "The default list is created ONCE, when the def line executes, so every call that omits bucket shares that same list object. Results: first call ['a'], second ['a', 'b'], third ['a', 'b', 'c'] — the 'empty' default has been accumulating. The fix is the standard None pattern: def add(item, bucket=None): if bucket is None: bucket = [] — a new list is then created per call. This trap is a fixture of Python interviews precisely because it looks harmless and only misbehaves at run time.",
          source: 'The most frequently recycled mutable-default question in Python interviews and exam papers.',
        },
        summary: [
          'def names a block; the call expression evaluates to the return value, or None if there is no return.',
          'Arguments are positional or keyword; defaults must trail required parameters.',
          'Default values are evaluated once at definition time — never use a mutable ([] , {}) default; use None.',
          '*args packs positionals into a tuple; **kwargs packs keywords into a dict; *mylist unpacks at the call site.',
          'One function, one job — compose small functions instead of growing one big one.',
        ],
      }),
      [
        [
          'Which call is ILLEGAL for def f(a, b=2, c=3)?',
          ['f(1)', 'f(1, 5)', 'f(1, c=9)', 'f(c=9, 1)'],
          3,
          'A positional argument may not follow keyword arguments at the same call.',
        ],
        [
          'def f(*nums): return len(nums). The call f(1, 2, 3) returns:',
          ['3', '[1, 2, 3]', '(1, 2, 3)', 'Error — nums expects one argument'],
          0,
          '*nums collects all positionals into a tuple, whose length is 3.',
        ],
        [
          'The correct pattern for a function that needs a fresh list default is:',
          ['def f(x, bucket=[])', 'def f(x, bucket=list())', 'def f(x, bucket=None) with creation inside', 'Any of the first two are fine'],
          2,
          'Only None avoids the shared-mutable-default bug; the body then builds a new list per call.',
        ],
        [
          'A function with no return statement, when called, evaluates to:',
          ['0', 'None', 'False', 'An error'],
          1,
          'Missing return means the call expression is None — a common source of "it worked when I printed it" bugs.',
        ],
      ]
    ),
    lesson(
      M3,
      'pyai-3-2',
      2,
      'return, Scope & Why Your Variable Forgot Its Value',
      'Returning values (including pairs), the three channels a function can affect the caller through, local versus global scope, and the UnboundLocalError explained.',
      17,
      nineBlocks({
        objectives: [
          'Return single and multiple values and unpack them at the call site',
          'Distinguish return from print and from mutating an argument',
          'Explain local scope and why assignment inside a function makes a name local',
          'Fix an UnboundLocalError without resorting to careless global statements',
        ],
        hook:
          'count = 0 at the top level; a function that does count = count + 1; one call. Python answers: UnboundLocalError: local variable \'count\' referenced before assignment — even though count exists, right there, globally. Beginners stare at this for hours because the English reading ("just add one to the existing count") is perfectly reasonable. The Python reading is different, and once you have it, whole categories of "my variable forgot its value" bugs vanish.',
        concept: `**return hands a value back; print only talks to the screen.** A function body can end with \`return <value>\`, which immediately ends the function and makes the **call expression** evaluate to that value: \`result = double(5)\`. Without a return, the result is \`None\`. Functions may return several values at once by returning a tuple — \`return min(xs), max(xs)\` — which callers unpack: \`lo, hi = stats(xs)\`. An early \`return\` on its own (a guard clause) exits without a value, which is the clean way to refuse bad input:

\`\`\`
def safe_div(a, b):
    if b == 0:
        return None          # refuse early, cleanly
    return a / b
\`\`\`

**Three channels from a function to the outside world.** Know which one you are using:
1. **return** — the preferred channel. The caller decides what happens next (\`total = sum(xs)\`).
2. **Print** — a side effect aimed at humans. Fine in scripts and during debugging; useless if you wanted the value (\`y = print("hi")\` leaves y as None).
3. **Mutation** — changing a passed object in place (\`xs.append(1)\` inside a function changes the caller's list, because both names reference one object — Module 1 aliasing again). Real code uses this (every list method does), but a function that mutates silently is a function callers must be warned about. Mixed "sometimes I return, sometimes I print, sometimes I mutate" functions are the hardest to test; keep each function on one channel.

**Scope: where names live.** A name created by assignment **inside** a function is **local** to that call: it exists while the function runs and disappears afterwards. You may freely **read** names defined outside (global scope, plus built-ins like \`print\` and \`len\`). But here is the rule that produces the famous error: **if a name is assigned anywhere inside a function, Python treats it as local everywhere inside that function.** So:

\`\`\`
count = 0
def bump():
    count = count + 1     # UnboundLocalError
bump()
\`\`\`

Because \`count = ...\` appears inside \`bump\`, the compiler marks \`count\` local for the entire body; the right-hand side then tries to read the local before it exists. The error message is accurate — it is not about your global at all.

**The clean fixes, in order of preference:**
1. **Pass the value in and return the new one:** \`count = bump(count)\` — no hidden state, trivially testable.
2. **Work on a local:** \`def bump(): local = 1; return local\` when the value starts inside.
3. **\`global count\`** at the top of the function opts into the global explicitly and makes the error go away — but it couples the function to distant state; use rarely, and only with a clear reason. (\`nonlocal\` is the same idea for an enclosing *function's* variable, which you will meet with nested closures later.)

**Name lookup, simplified.** When you use a name, Python checks: the function's **local** scope, then any **enclosing** function scopes, then the **global** module scope, then the **built-ins**. First hit wins. This also explains why naming a variable \`list\` or \`sum\` "works" until some line in the same scope needs the real builtin — do not shadow built-ins.`,
        extras: [
          table(
            'A function\'s three outward channels',
            ['Channel', 'Example', 'When it is the right one'],
            [
              ['return', 'total = add_all(xs)', 'Computing a value — the default choice'],
              ['print', 'print("done")', 'Reporting to a human; returns None'],
              ['mutation', 'xs.sort()', 'In-place update of data you own — document it'],
            ],
          ),
          code(
            'count = 0\n\ndef bump():\n    count = count + 1   # local by rule -> UnboundLocalError\n\n# Fix 1: pass in, return out\ndef bump(n):\n    return n + 1\n\ncount = bump(count)      # count is now 1\nprint(count)',
            'scope-fix.py',
            'python',
          ),
          warn(
            'Do not name variables after built-ins',
            'list = [1, 2] or sum = 0 shadows the built-in for the rest of the scope; later sum(xs) raises TypeError: \'int\' object is not callable. Python will not stop you — style rules exist to stop you.',
          ),
        ],
        worked: {
          title: 'Repair a function that mixes all three channels',
          problem:
            'This crashes:  total = 0\ndef add_all(xs):\n    for x in xs:\n        total = total + x\n        print("running total:", total)\n    print("done")\nprint(add_all([1, 2, 3]))\n\nDiagnose every problem, rewrite it, and state what the fixed version prints.',
          steps: [
            {
              title: '1. Diagnose the crash',
              desc: 'The assignment total = total + x inside the function makes total local for the whole body, so the very first read raises UnboundLocalError — the global 0 is never consulted.',
            },
            {
              title: '2. Give the function its own local',
              desc: 'Start an accumulator inside, do the work, and RETURN the value instead of printing it. Now the function has one job: compute.',
              code_snippet: 'def add_all(xs):\n    running = 0\n    for x in xs:\n        running += x\n    return running',
            },
            {
              title: '3. Let the caller decide what to do',
              desc: 'Capture the return value at the top level and print there. The same function now works for summing, storing or feeding another calculation.',
              code_snippet: 'total = add_all([1, 2, 3])\nprint(total)   # 6',
            },
            {
              title: '4. Verify the other paths',
              desc: 'Empty list gives 0 (the loop simply never runs). Try add_all([]) — no crash, sensible answer. A function that returns a value on every path is a function callers can trust.',
              code_snippet: 'print(add_all([]))   # 0',
            },
          ],
          solution:
            'The original raised UnboundLocalError on the first iteration. The rewrite keeps the accumulator local, returns it, and lets the caller print: printing 6 for [1, 2, 3] and 0 for []. One channel per function — return here, print at the top level.',
        },
        practice: {
          title: 'Convert side effects into returns',
          prompt:
            'Take any function you wrote earlier that printed its answer. Rewrite it to RETURN the value instead, then write two new lines at the top level: one that stores the result in a variable and prints it later, and one that uses the result directly inside an f-string. Also reproduce the UnboundLocalError from the concept with your own variable name, read the exact error text, and fix it with the pass-in-return-out pattern.',
          hint: 'If the error says "referenced before assignment", an assignment in the function made the name local — that is the clue, not a bug in your global.',
        },
        mistakes: [
          {
            mistake: 'Reading a global inside a function and assigning to the same name',
            fix: 'Assignment makes the name local throughout the function → UnboundLocalError. Pass the value as a parameter and return the new one; reach for global only with strong justification.',
          },
          {
            mistake: 'y = print("something") and then using y',
            fix: 'print returns None, so y is None and the next operation on it fails. Print for humans; return for values.',
          },
          {
            mistake: 'A function that returns a value on some paths and falls off the end on others',
            fix: 'Callers get None on those paths and crash three frames later. Make every path return, or return an explicit None as a documented sentinel.',
          },
          {
            mistake: 'Naming a variable sum, list, input or type',
            fix: 'You shadow the built-in for the rest of the scope and break later calls. Rename (total, items, raw, kind) — a rule formatters and linters will also flag.',
          },
        ],
        exam: {
          question:
            'Given a global count = 0 and a function containing count = count + 1, explain exactly why Python raises UnboundLocalError, and give the cleanest fix.',
          answer:
            'Python decides a name\'s scope at compile time, by scanning the function body: any assignment to a name makes that name LOCAL for the entire function, not just from that line onward. So inside bump(), count is local everywhere; the right-hand side count + 1 tries to read the local before it has been assigned, and Python raises UnboundLocalError at that moment — the global count is irrelevant to the lookup. Cleanest fix: count = bump(count) where bump takes the current value as a parameter and returns the incremented one. Alternatives are a local accumulator returned at the end, or an explicit global count declaration (works, but hides coupling and is discouraged).',
          source: 'Standard scope question in Python exams and screening tests; the exact error text is practically an interview meme.',
        },
        summary: [
          'return ends the function and makes the call expression yield the value; several values return as a tuple.',
          'Functions reach outside via return, print or mutation — pick one per function and be explicit.',
          'Names assigned inside a function are local everywhere inside it, even before the assignment line.',
          'UnboundLocalError means the name was local by rule, not missing — fix by passing values in and returning them.',
          'Do not shadow built-ins (list, sum, type, input); name lookup is local → enclosing → global → built-in.',
        ],
      }),
      [
        [
          'What does this raise?  count = 0\ndef bump():\n    count = count + 1\nbump()',
          ['Nothing — count becomes 1', 'NameError', 'UnboundLocalError', 'TypeError'],
          2,
          'The assignment makes count local to bump, so the read on the right references an unassigned local.',
        ],
        [
          'def f(): return 1, 2. The call a, b = f() gives:',
          ['a = (1, 2), b = None', 'a = 1, b = 2', 'Error — f returns one value', 'a = 2, b = 1'],
          1,
          'Returning two values returns a tuple; unpacking assigns positionally.',
        ],
        [
          'The return value of print("hi") is:',
          ["'hi'", 'None', 'True', 'An empty string'],
          1,
          'print performs output and returns None — assigning its result leaves you with None.',
        ],
        [
          'Python resolves a name used inside a function by checking, in order:',
          [
            'Global, then local',
            'Local, then enclosing, then global, then built-in',
            'Built-in, then local, then global',
            'Only the local scope',
          ],
          1,
          'The familiar local → enclosing → global → built-in order, first match wins.',
        ],
      ]
    ),
    lesson(
      M3,
      'pyai-3-3',
      3,
      'Imports, pip, Virtual Environments & Notebooks',
      'How Python finds modules, installing packages with pip, isolating projects with venv, and the notebook workflow AI work actually uses.',
      17,
      nineBlocks({
        objectives: [
          'Use the four common import forms and explain how Python locates a module',
          'Install and pin packages with pip, including python -m pip',
          'Create, activate and use a virtual environment for one project',
          'Set up a notebook or Colab workflow with installs and recorded requirements',
        ],
        hook:
          'Your script imports pandas perfectly in the terminal. You paste the same line into Jupyter and get ModuleNotFoundError: No module named \'pandas\'. Neither program is broken — they are two different Pythons with two different package collections, and nobody told you. This lesson is the map of that hidden landscape; without it, half of every AI course you take is spent fighting the environment instead of learning.',
        concept: `**import: how Python finds other code.** A **module** is a .py file; a **package** is a folder of modules (often with an __init__.py). The forms you will use daily:
- \`import math\` then \`math.sqrt(25)\` — the whole module under a prefix. Clear provenance; the default style.
- \`from math import sqrt\` then \`sqrt(25)\` — pull specific names. Handy, but two modules with the same name (two different \`plot\` functions) then collide.
- \`import numpy as np\` — an alias. \`np.\` is such a strong convention in data science that code without it reads oddly.
- \`from math import *\` — imports everything. Avoid it outside quick experiments: it pollutes the namespace and hides where names came from.

When you import, Python looks in a fixed order: built-in modules first, then the folder of your script, then the entries of **sys.path** (which includes the environment's **site-packages** — where pip installs things). A \`ModuleNotFoundError\` means nothing on that path matched: usually, the package is not installed in the environment you are currently running.

**pip: installing from PyPI.** The Python Package Index hosts hundreds of thousands of open-source packages; \`pip install pandas\` fetches the latest compatible build and drops it into the current environment's site-packages. Daily commands: \`pip list\` (what is installed), \`pip show pandas\` (version and location), \`pip install pandas==2.2.2\` (pin an exact version — reproducibility), \`pip install -r requirements.txt\` (install everything a project lists). When several Pythons exist on one machine, prefer the unambiguous form \`python3 -m pip install pandas\`: that guarantees you are installing into the same interpreter that will run the code.

**Virtual environments: one package shelf per project.** Without isolation, every project shares one global site-packages, so installing "pandas 2.x" for project B silently upgrades project A — which needed 1.x — and both break. A **venv** is a folder containing a private interpreter plus its own empty site-packages:

\`\`\`bash
python3 -m venv .venv              # create (folder .venv/)
source .venv/bin/activate          # macOS / Linux
.venv\\Scripts\\activate             # Windows
python -m pip install pandas       # installs INTO the venv
deactivate                         # leave the venv
\`\`\`

While activated, your shell shows a (.venv) prefix and \`python\` and \`pip\` point inside the folder. Two clarifications that save confusion later: a venv does **not** copy the standard library (math, json, csv are shared — only third-party packages are isolated), and the venv folder should never be committed to git (add .venv to .gitignore).

**Recording and reusing.** \`python -m pip freeze > requirements.txt\` writes the exact installed versions. Anyone — including future you on a new laptop — rebuilds the whole environment in three commands: create venv, activate, \`pip install -r requirements.txt\`. For AI work this is the professional default: one venv per project, a requirements file in the repo, and a notebook or script per experiment. In **Colab**, installs are per-session: run \`%pip install package\` in a cell (prefer \`%pip\` over \`!pip\` — it targets the running kernel's interpreter), and remember the session is wiped when it ends. Locally in Jupyter, select the venv's interpreter as the notebook kernel so the notebook and the environment are the same Python.`,
        extras: [
          table(
            'The environment map',
            ['Thing', 'What it contains', 'Created by'],
            [
              ['Standard library', 'math, json, csv, os…', 'Comes with Python'],
              ['venv (.venv folder)', 'Private interpreter + empty site-packages', 'python -m venv .venv'],
              ['site-packages', 'Third-party packages pip installed', 'pip install'],
              ['requirements.txt', 'Pinned list to rebuild an environment', 'pip freeze >'],
              ['Colab session', 'Rented machine, preloaded packages', 'A browser tab'],
            ],
          ),
          tip(
            'One venv per project, always',
            'Name it .venv in the project root, activate before any pip or python work in that folder, and treat "did you activate the venv?" as the first question whenever something imports wrongly.',
          ),
          warn(
            'pip installed it — but into which Python?',
            'If your terminal imports fine and Jupyter does not (or vice versa), you installed into one environment and are running in another. Check with python -m pip --version and align the notebook kernel with the environment.',
          ),
        ],
        worked: {
          title: 'Set up a clean project from zero',
          problem:
            'Create a project folder marks-analysis that needs pandas only. End with: an isolated environment, pandas installed and importable, a requirements file, and confidence that a classmate can rebuild it.',
          steps: [
            {
              title: '1. Create and enter the environment',
              desc: 'The venv lives inside the project folder as .venv — after activation, every python and pip in this shell points at it.',
              code_snippet: 'mkdir marks-analysis\ncd marks-analysis\npython3 -m venv .venv\nsource .venv/bin/activate      # Windows: .venv\\Scripts\\activate',
            },
            {
              title: '2. Install into it, then verify the import',
              desc: 'python -m pip ties the install to the interpreter you will run. The python -c one-liner imports without creating a file — the fastest existence check there is.',
              code_snippet: 'python -m pip install pandas\npython -c "import pandas; print(pandas.__version__)"\n# e.g. 2.2.2',
            },
            {
              title: '3. Record the exact versions',
              desc: 'Freeze writes a pinned list. Commit this file to version control with your code — it is the recipe for the whole environment.',
              code_snippet: 'python -m pip freeze > requirements.txt\n# requirements.txt now contains a line like: pandas==2.2.2',
            },
            {
              title: '4. Prove it rebuilds anywhere',
              desc: 'A classmate (or you, next month) needs only these three commands to reproduce your exact environment — no guessing which packages, no version roulette.',
              code_snippet: 'python3 -m venv .venv\nsource .venv/bin/activate\npython -m pip install -r requirements.txt',
            },
          ],
          solution:
            'A .venv holds pandas alone; requirements.txt pins it; the import check confirms the running interpreter sees it. Notebooks in this project should select this venv as their kernel (or run %pip install pandas in Colab, understanding the session is temporary). Environment trouble shrinks to one question: which Python am I in right now?',
        },
        practice: {
          title: 'Build and rebuild an environment',
          prompt:
            'In a new folder: create a venv, activate it, install the requests package, verify with python -c "import requests; print(requests.__version__)", write requirements.txt, deactivate, then delete the venv and rebuild it from the requirements file alone. Time how long the rebuild takes.',
          hint: 'If import fails after activation, check you used python -m pip (not a pip bound to another interpreter) and that the activation ran in this shell.',
        },
        mistakes: [
          {
            mistake: 'pip install into the system Python "because it is quicker"',
            fix: 'You pollute a shared environment and create future version conflicts. Thirty seconds of venv setup saves the afternoon later — always.',
          },
          {
            mistake: 'Installing a package in the terminal and expecting Jupyter to see it',
            fix: 'Different interpreters, different site-packages. Point the notebook kernel at the venv, or install inside the notebook with %pip install.',
          },
          {
            mistake: 'Using !pip install in a notebook by habit',
            fix: '!pip runs whatever pip is first on the shell PATH; %pip targets the running kernel\'s environment. Prefer %pip — it removes the whole class of mismatch.',
          },
          {
            mistake: 'Never recording dependencies',
            fix: 'Without requirements.txt, nobody — including future you — can rebuild the project. Freeze after every meaningful install; commit the file.',
          },
        ],
        exam: {
          question:
            'What is a virtual environment, why do Python projects use one, and what does it NOT contain?',
          answer:
            "A virtual environment is a self-contained directory (created by python -m venv .venv) holding a copy (symlink or launcher) of a Python interpreter plus its own private site-packages folder. Projects use one because pip installs into the *current* environment: sharing a single global site-packages means project B's upgrades can break project A's pinned versions — the classic dependency conflict. With a venv, each project gets exactly the packages it needs, activated via a shell script, and pinned in requirements.txt for reproducibility. Crucially, a venv does NOT contain a copy of the standard library (math, json, os and friends are shared with the base interpreter); it isolates only third-party packages.",
          source: 'Evergreen interview question for any data/ML tooling round; also common in university practical exams.',
        },
        summary: [
          'import pulls in modules; prefer import x / import x as np over from-imports and never wildcard in real code.',
          'pip installs from PyPI into the CURRENT environment; python -m pip removes the multi-interpreter ambiguity.',
          'A venv is a per-project interpreter plus empty site-packages — activate it before installing or running.',
          'The standard library is shared; only third-party packages are isolated.',
          'requirements.txt (pip freeze) makes an environment rebuildable anywhere — the backbone of reproducible AI work.',
          'Colab sessions are rented: %pip installs work until the session ends.',
        ],
      }),
      [
        [
          'import numpy as np means:',
          [
            'Copy numpy into the file as np',
            'Import numpy and refer to it as np',
            'Rename the package permanently',
            'Import only part of numpy',
          ],
          1,
          'The as clause binds a local alias; np.sqrt is then numpy.sqrt.',
        ],
        [
          'A script imports pandas fine in the terminal but fails in Jupyter with ModuleNotFoundError. Best explanation:',
          [
            'pandas is corrupted',
            'Jupyter uses a different kernel (interpreter) than the terminal environment',
            'Python forbids imports in notebooks',
            'The script has a syntax error',
          ],
          1,
          'Kernels and shells can point at different environments; align the kernel with the venv (or install into the kernel with %pip).',
        ],
        [
          'Which command creates a virtual environment named .venv?',
          ['pip install .venv', 'python -m venv .venv', 'venv new .venv', 'python3 --create .venv'],
          1,
          'The stdlib venv module does it: python -m venv .venv, then activate it with the shell script it writes.',
        ],
        [
          'requirements.txt is used to:',
          [
            'Document Python language features',
            'List pinned third-party dependencies so an environment can be rebuilt',
            'Store notebook outputs',
            'Configure pip\'s download speed',
          ],
          1,
          'pip freeze > requirements.txt records exact versions; pip install -r requirements.txt recreates them anywhere.',
        ],
      ]
    ),
    lesson(
      M3,
      'pyai-3-4',
      4,
      'Docstrings, Naming & Code Others Can Read',
      'Writing docstrings that document contracts, PEP 8 naming conventions, comments versus names, and refactoring unreadable code into small named functions.',
      16,
      nineBlocks({
        objectives: [
          'Write one-line and multi-line docstrings and retrieve them with help()',
          'Apply PEP 8 naming conventions to variables, functions, classes and constants',
          'Refactor a dense script into small functions with meaningful names',
          'Explain the difference between a comment, a docstring and a good name',
        ],
        hook:
          'A recruiter once let candidates debug a function on a whiteboard. The code was correct; the names were x, t, a2 and temp. Nobody finished — not because the logic was hard, but because reading consumed all the time. Code is read far more often than it is written, and in AI especially your future self reading a six-month-old notebook is the most important reader you will ever write for.',
        concept: `**Readability is a functional requirement.** Python\'s own design documents treat style as part of the language: the Zen of Python (type \`import this\` at a REPL) says "Readability counts" and "Namespaces are one honking great idea — let\'s do more of those!". In practice readability comes from three sources, in order of impact: **good names**, **docstrings**, and **comments** — with linters and formatters enforcing the mechanical parts so you can spend attention on the semantic ones.

**Docstrings: the contract of a function.** A string literal placed as the first statement of a function (module or class) is its docstring — documentation that lives inside the code, travels with it, and is readable at any REPL:

\`\`\`
def mean(*numbers):
    """Return the arithmetic mean of the given numbers."""
\`\`\`

That one-liner style is the everyday standard: state WHAT the callable delivers, and any sharp edges — never HOW the body works (the body already shows how). Richer callables get multi-line docstrings:

\`\`\`
def grade(name, marks, pass_mark=40):
    """Print a pass/fail line for one student.

    Args:
        name: student identifier
        marks: list of numeric marks
        pass_mark: threshold for a PASS (default 40)
    """
\`\`\`

Docstrings are stored in the callable\'s \`__doc__\` attribute: \`help(grade)\` prints it at the REPL, \`grade?\` shows it in Jupyter, and every editor surfaces it as a tooltip. Try writing the docstring **before** the body — if you cannot state the contract in a line, the function is probably doing too much.

**Comments, and what they are for.** A comment explains **why** a non-obvious choice exists: a workaround for a library bug, a business rule, a constraint. It does not restate the line (\`i = i + 1  # increment i\` adds noise, not meaning). Dead code should be deleted, not commented out — version control remembers it. Docstrings say **what**; comments say **why**; names carry the rest.

**PEP 8 naming — the conventions that make Python look like Python:**

| Entity | Convention | Example |
| Variables, parameters, functions | snake_case | total_marks, is_valid, grade_report() |
| Classes | CamelCase | StudentRecord, GradeBook |
| Modules, packages | short lowercase | student_tools.py |
| Constants | ALL_CAPS | MAX_RETRIES = 5, PASS_MARK = 40 |
| Internal helpers | leading underscore | _parse_row() |
| Booleans | is_ / has_ / can_ | is_empty, has_marks |

These are not enforced by the interpreter — \`Total Marks\` would run — but they are enforced by every reviewer, linter and codebase you will ever join. Shadowing built-ins (\`list\`, \`sum\`, \`type\`, \`input\`) is a related sin: it works until a line needs the real built-in.

**Structure habits that compound.** One function, one job — if a function needs a comment explaining "mode 2", it wants to be two functions. Prefer early guard-clause returns over deep nesting. Keep lines under roughly 88–100 characters; four-space indents; blank line between functions. Auto-formatters (black is the standard) apply all of this mechanically, which is exactly why Python teams argue about logic, not spacing.`,
        extras: [
          table(
            'Three documentation tools, three jobs',
            ['Tool', 'Answers', 'Lives in'],
            [
              ['Function/variable name', 'What is this thing?', 'The code itself'],
              ['Docstring', 'What does this callable promise?', 'First statement; __doc__; help()'],
              ['Comment', 'Why was this written this way?', 'Inline; stripped at run time'],
            ],
          ),
          code(
            'def percent_at_or_above(marks, threshold):\n    """Return the percentage of marks that are >= threshold."""\n    passed = sum(1 for m in marks if m >= threshold)\n    return passed / len(marks) * 100\n\nprint(percent_at_or_above([70, 90, 40, 60], 50))   # 75.0\nhelp(percent_at_or_above)',
            'readable.py',
            'python',
          ),
          tip(
            'Read your diff aloud',
            'If a colleague could not guess what a changed line does from its name and the surrounding docstring, rename before you commit. The rename costs thirty seconds; the confused review costs an hour.',
          ),
        ],
        worked: {
          title: 'Refactor an unreadable function',
          problem:
            'Improve this without changing its behaviour:  def f(a, b):\n    t = 0\n    for i in range(len(a)):\n        if a[i] >= b:\n            t = t + 1\n    return t / len(a) * 100\n\nprint(f([70, 90, 40, 60], 50))\n\nSay what it computes, rename it, document it, and remove the indexing loop.',
          steps: [
            {
              title: '1. Reverse-engineer the behaviour',
              desc: 'It counts how many entries of a are at least b, divides by the total, and scales to a percentage — "what percentage of marks cleared the threshold?". The call therefore prints 75.0 (three of four).',
            },
            {
              title: '2. Name everything for the domain',
              desc: 'f → percent_at_or_above, a → marks, b → threshold, t → passed. Add a one-line docstring stating the contract. Instantly readable — no comment needed.',
              code_snippet: 'def percent_at_or_above(marks, threshold):\n    """Return the percentage of marks that are >= threshold."""',
            },
            {
              title: '3. Replace index-walking with iteration',
              desc: 'range(len(a)) with a[i] is a C habit, not a Python one. Iterate values directly, and count with a generator expression inside sum(). A guard clause handles the empty list — the original divided by zero here.',
              code_snippet: '    if not marks:\n        return 0.0\n    passed = sum(1 for m in marks if m >= threshold)\n    return passed / len(marks) * 100',
            },
            {
              title: '4. Verify identical behaviour on the old and new paths',
              desc: 'Same call, same answer — plus the new empty-list path returns 0.0 instead of raising ZeroDivisionError. Refactoring improves structure; checking outputs proves it changed nothing else.',
              code_snippet: 'print(percent_at_or_above([70, 90, 40, 60], 50))   # 75.0\nprint(percent_at_or_above([], 50))                  # 0.0',
            },
          ],
          solution:
            'The opaque f() became percent_at_or_above(marks, threshold) — same 75.0 result, a documented contract, readable iteration, and a safe empty-list path. Every name now answers "what does this mean in the gradebook?" without a single explanatory comment.',
        },
        practice: {
          title: 'Audit your own code',
          prompt:
            'Open the least readable thing you wrote in this course so far. (1) Write a one-line docstring for each function; (2) rename every one-letter or temp variable; (3) delete any comment that merely restates code; (4) run the original outputs and the refactored outputs side by side and confirm they match.',
          hint: 'If two variables mean the same thing under different names, pick one name and use it everywhere — a search for that name should find every use.',
        },
        mistakes: [
          {
            mistake: 'Docstrings that narrate the code ("loop through the list and add")',
            fix: 'Document the contract: inputs, output, side effects, sharp edges. The body already shows the how; readers need the what and the why.',
          },
          {
            mistake: 'Names like x1, temp, data_final_v2 for domain concepts',
            fix: 'Rename to what they mean: marks, raw_line, active_students. If you struggle to name it, that is a signal the thing is doing two jobs.',
          },
          {
            mistake: 'Copying a function body to make a "similar" one',
            fix: 'The second copy is a parameter away. One function, one job, called twice with different arguments — bug fixes then apply to both.',
          },
          {
            mistake: 'Inconsistent naming for the same concept (Name / name / NAME / student_name)',
            fix: 'Pick the domain term once and use it everywhere. Inconsistent vocabulary turns a simple search-and-rename into archaeology.',
          },
        ],
        exam: {
          question:
            'Distinguish a comment, a docstring and a well-chosen identifier as forms of documentation, giving a good example of each.',
          answer:
            'A comment (\`# API throttles to 1 req/s — retry above that\`) explains WHY and lives only in the source; the interpreter ignores it. A docstring is a string literal as the first statement of a function/class/module, stored in __doc__, surfaced by help() and editors, and documents WHAT the callable promises ("""Return the mean of numbers, or None if empty.""" ). A good identifier (\`pass_mark\`, \`active_students\`) documents meaning at every use site and costs nothing at run time. Priority: get the name right, add the docstring for the contract, and use comments only for the non-obvious why — everything else is noise reviewers will ask you to remove.',
          source: 'Common code-quality discussion question in interviews; also standard in Python style (PEP 257/8) exam units.',
        },
        summary: [
          'Docstrings document the contract of a function; help() and __doc__ display them at any time.',
          'Write what a callable promises, not how its body works; the one-liner style is the daily standard.',
          'Names do most of the documentation work: snake_case variables/functions, CamelCase classes, ALL_CAPS constants.',
          'Comments explain why; docstrings explain what; delete dead code rather than commenting it out.',
          'Refactor in steps: rename, extract small functions, replace index loops with iteration — then verify identical output.',
        ],
      }),
      [
        [
          'Where must a docstring be placed to count as a function\'s docstring?',
          [
            'Anywhere in the file',
            'As the first statement inside the def body',
            'Immediately before the def line, as a comment',
            'Only in a separate .md file',
          ],
          1,
          'The first expression statement of the body becomes __doc__; help() reads exactly that.',
        ],
        [
          'help(my_func) displays:',
          [
            'The source code of my_func',
            'The value of my_func.__doc__',
            'The signature only, never the docstring',
            'An error if the function has no arguments',
          ],
          1,
          'help() shows the stored docstring (plus signature); the body is not included unless tools fetch the source separately.',
        ],
        [
          'Which naming is correct for a class, a function and a constant respectively?',
          [
            'student_record / GradeBook() / max_retries',
            'StudentRecord / grade_report() / MAX_RETRIES',
            'STUDENT / graderun / maxRetries',
            'studentRecord / grade_report / constant_value',
          ],
          1,
          'PEP 8: CamelCase for classes, snake_case for functions and variables, ALL_CAPS for constants.',
        ],
        [
          'A function needs a three-line comment to explain its two "modes". The best fix is to:',
          [
            'Add a fourth comment',
            'Rename one variable',
            'Split it into two focused functions',
            'Mark it with # noqa',
          ],
          2,
          'Modes usually mean two jobs; separate functions with clear names remove the need for the explanatory comment entirely.',
        ],
      ]
    ),
  ],
};
