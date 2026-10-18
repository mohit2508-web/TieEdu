// Module 4 — Control Flow, Errors & Debugging
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, code } from '../nineBlocks';
import { lesson, M4, COURSE_ID } from './helpers';

export const module4: CourseModule = {
  id: M4,
  course_id: COURSE_ID,
  title: 'Module 4 — Control Flow, Errors & Debugging',
  summary:
    'Conditional logic with if/elif/else, loops with for/while and break/continue, exceptions and try/except/finally with real traceback reading, and a repeatable method for debugging and testing small functions.',
  sort_order: 4,
  lessons: [
    lesson(
      M4,
      'pyai-4-1',
      1,
      'if / elif / else: Decisions That Do Not Lie',
      'Boolean conditions, comparison and logical operators, truthiness done deliberately, and branch chains whose boundaries are actually right.',
      16,
      nineBlocks({
        objectives: [
          'Write conditions using comparison operators, and/or/not and membership tests',
          'Structure multi-way branches with if/elif/else so exactly one path runs',
          'Apply truthiness rules on purpose (falsy values) instead of by accident',
          'Order threshold branches from strictest to loosest so boundaries fall correctly',
        ],
        hook:
          'An attendance script asked "is there a reason for the absence?" with if reason_text: — and since input() always returns a string, typing nothing was the only way to fail the check. Every typed excuse, including "x", counted. The branch logic was syntactically perfect and semantically wrong. Conditions are where programs first learn to lie to you, so this lesson treats them as the precision instrument they are.',
        concept: `**What an if statement does.** An \`if\` evaluates a condition and runs its indented block **only** when that condition is True. Syntax is fixed: the header ends with a colon, the block is indented (four spaces, consistently — mixing indents is a TabError), and one or more statements live in the block:

\`\`\`
if marks >= 75:
    eligible = True
    print("Eligible")
\`\`\`

The condition is any expression that produces a bool. Comparisons: \`==\` (equal), \`!=\`, \`<\`, \`>\`, \`<=\`, \`>=\`. Logical operators are written as words: \`and\`, \`or\`, \`not\`. Python also allows the mathematical chaining you cannot write in most languages: \`60 <= marks < 75\` is one normal condition, and \`a == b == c\` compares all three.

**elif and else: one chain, one winner.** \`elif\` (never "else if") adds further conditions; \`else\` catches everything left and must come last. At most **one** branch of the chain runs — Python tests in order and stops at the first True condition:

\`\`\`
if marks >= 90:
    grade = "A"
elif marks >= 75:
    grade = "B"
elif marks >= 60:
    grade = "C"
else:
    grade = "F"
\`\`\`

Order matters when thresholds overlap: put the **strictest** condition first. If you tested \`marks >= 60\` first, every score of 95 would match C and stop the chain — the classic off-by-branch bug. An \`else\` is optional; leaving it out means nothing forces a default, which is a deliberate choice in guard-heavy code.

**Short-circuit evaluation.** \`and\` stops at the first False operand; \`or\` stops at the first True. That is not trivia — it is a safety tool: \`if xs and xs[0] > 0:\` never evaluates \`xs[0]\` when the list is empty, because \`xs\` is already False. You will use that guard pattern permanently.

**Truthiness: every value already has a boolean answer.** Conditions do not require \`== True\`. Python calls these **falsy**: \`False\`, \`None\`, \`0\`, \`0.0\`, \`""\`, \`[]\`, \`{}\`, \`set()\`. Nearly everything else is truthy — including \`"False"\`, \`[0]\` and any non-empty container. So \`if items:\` means "the list has at least one element" and \`if name:\` means "a non-empty string". The sharp edge: \`0\` and \`""\` are perfectly valid **data** that also happen to be falsy. When "was anything provided?" matters more than "is it non-empty?", ask precisely: \`if marks is not None:\`. And membership reads like English: \`if "ada" in roster:\`, \`if key not in counts:\` — on a dict or set this is the fast O(1) test from Module 2.`,
        extras: [
          table(
            'Falsy and truthy — the values that surprise people',
            ['Falsy (condition fails)', 'Truthy (condition passes)'],
            [
              ['0, 0.0, -0.0', 'Any other number, including negative'],
              ['"" (empty string)', 'Any non-empty string, including one with spaces'],
              ['[], {}, set()', '[0], {0}, "False"'],
              ['None', 'Almost every other object'],
            ],
          ),
          code(
            'marks = 75\n\nif marks >= 90:\n    grade = "A"\nelif marks >= 75:\n    grade = "B"\nelif marks >= 60:\n    grade = "C"\nelse:\n    grade = "F"\n\nprint(grade)                                  # B\nprint(60 <= marks < 75, marks >= 60 and marks < 75)   # False False',
            'grading.py',
            'python',
          ),
          warn(
            'Float equality is a trap',
            '0.1 + 0.2 == 0.3 is False in floating point. Compare with tolerance instead: abs(total - expected) < 1e-9, or the library helper math.isclose(a, b). Exact == on computed floats is a bug waiting for a different machine.',
          ),
        ],
        worked: {
          title: 'A grading function with honest boundaries',
          problem:
            'Write grade(marks) returning "A" for >= 90, "B" for >= 75, "C" for >= 60, "F" below, and "INVALID" for marks that are None or outside 0–100. Test every boundary: 90, 89.9, 75, 60, 59.9, None, 101.',
          steps: [
            {
              title: '1. Guard the invalid cases first',
              desc: 'A guard clause at the top refuses bad data immediately and keeps the rest of the function free of nested ifs. Note "is None" — not "== None" — for the missing-value check.',
              code_snippet: 'def grade(marks):\n    if marks is None or marks < 0 or marks > 100:\n        return "INVALID"',
            },
            {
              title: '2. Chain the thresholds, strictest first',
              desc: 'Each valid branch returns at once, so exactly one decision runs per call. Order 90 → 75 → 60 guarantees a 95 can never be caught by a looser threshold.',
              code_snippet: '    if marks >= 90:\n        return "A"\n    if marks >= 75:\n        return "B"\n    if marks >= 60:\n        return "C"\n    return "F"',
            },
            {
              title: '3. Test the boundaries, not just the middles',
              desc: 'Boundary values are where branch logic breaks. 89.9 must be B, not A; 60 must be C, not F. Testing 75 alone would prove almost nothing.',
              code_snippet: 'for m in [90, 89.9, 75, 60, 59.9, None, 101]:\n    print(m, "->", grade(m))',
            },
            {
              title: '4. Expected output — read the edges closely',
              desc: 'Every boundary lands one side of the line exactly as specified, and both invalid inputs come back as text instead of an exception.',
              code_snippet: '# 90 -> A\n# 89.9 -> B\n# 75 -> B\n# 60 -> C\n# 59.9 -> F\n# None -> INVALID\n# 101 -> INVALID',
            },
          ],
          solution:
            'Guard clause first, then a strict-to-loose chain of early returns. The same logic as a full if/elif/else would nest one level deeper for no benefit. Boundary tests confirm each edge: 89.9 is B, 60 is C, 59.9 is F, and invalid inputs return "INVALID" instead of raising — a function whose behaviour you can trust at every threshold.',
        },
        practice: {
          title: 'Ticket pricing with real guards',
          prompt:
            'Write ticket_price(age) returning "INVALID" for None or ages outside 0–120, "child" (< 12), "adult" (12–59) and "senior" (>= 60). Then add a second function that multiplies the price (300 / 700 / 400) by quantity, refusing non-positive quantities with "INVALID". Test ages 11, 12, 59, 60 and the boundary of the quantity rule.',
          hint: 'Guard clause, then thresholds from strictest to loosest — same shape as the worked example, different domain words.',
        },
        mistakes: [
          {
            mistake: 'Writing if marks = 75: in a condition',
            fix: 'Assignment inside a condition is a SyntaxError in modern Python — the language is protecting you. Compare with ==.',
          },
          {
            mistake: 'Loose threshold before strict threshold in the same chain',
            fix: 'The first True branch wins, so marks >= 60 before marks >= 90 steals every A student. Order conditions from strictest to loosest.',
          },
          {
            mistake: 'Treating if x: as "the user provided a value"',
            fix: '0, 0.0, "" and [] are falsy but perfectly valid. When absence matters, ask about absence: if x is None: — not if x:.',
          },
          {
            mistake: 'Exact equality on computed floats',
            fix: 'Binary floating point makes 0.1 + 0.2 != 0.3. Compare with a tolerance (abs(a - b) < 1e-9) or math.isclose().',
          },
        ],
        exam: {
          question:
            'Explain short-circuit evaluation of and and/or, and give one defensive use of it.',
          answer:
            "With and, Python evaluates operands left to right and returns False as soon as one is falsy — later operands are never evaluated. With or, it returns True at the first truthy operand. Defensive use: if xs and xs[0] > 0 avoids IndexError on an empty list, because xs being [] already makes the and False and Python skips xs[0] entirely. Similarly if value is not None and value.strip(): tests presence before calling a method. Short-circuiting is not an optimisation detail — it is how Python expresses safe guards in a single condition.",
          source: 'Common theory question in university exams; also used as a live whiteboard probe in interviews.',
        },
        summary: [
          'if runs its indented block only for a True condition; elif adds tested alternatives; else catches the rest.',
          'Exactly one branch of a chain runs; order overlapping thresholds from strictest to loosest.',
          'and/or/not are the logical operators; and/or short-circuit, which powers safe guards like xs and xs[0].',
          'Falsy: None, 0, 0.0, "", [], {}, set() — everything else truthy; use is None when absence is the real question.',
          'Membership (in / not in) reads like English and is O(1) on dicts and sets.',
        ],
      }),
      [
        [
          'What happens with if marks = 75: in Python 3?',
          [
            'Assigns and continues',
            'SyntaxError — use == to compare',
            'Always False',
            'TypeError',
          ],
          1,
          'Assignment is banned inside conditions by the compiler; comparisons use ==.',
        ],
        [
          'With the chain >= 90 A, >= 75 B, >= 60 C, what does grade(89.9) return?',
          ['A', 'B', 'C', 'F'],
          1,
          '89.9 fails the >= 90 test and matches the next strictest branch: B.',
        ],
        [
          'Which value evaluates to False inside an if?',
          ['"hello"', '{0}', '[]', '[0]'],
          2,
          'Empty containers are falsy; the others are non-empty and therefore truthy.',
        ],
        [
          'and and or are said to short-circuit because:',
          [
            'They run faster than bitwise operators',
            'They stop evaluating operands once the result is determined',
            'They convert operands to int first',
            'They only work on bool objects',
          ],
          1,
          'and returns False at the first falsy operand; or returns True at the first truthy one — later operands are skipped entirely.',
        ],
      ]
    ),
    lesson(
      M4,
      'pyai-4-2',
      2,
      'for and while: Loops That Finish',
      'Iterating with for and range, condition-driven while loops, break and continue, and the two off-by-one traps that cause most loop bugs.',
      17,
      nineBlocks({
        objectives: [
          'Iterate lists, strings, dicts and ranges with for, using enumerate when positions matter',
          'Use range(start, stop, step) and predict its exact contents',
          'Write a while loop with an explicit update and kill infinite loops deliberately',
          'Control flow with break and continue, and explain the loop-else clause',
        ],
        hook:
          'range(1, 10) was meant to print 1 to 10. It printed 1 to 9 — every single time, for an entire cohort. The stop value is excluded in Python, and that one half-open convention also explains list slices and why for i in range(len(xs)) so often ends in IndexError. One convention, learned once, kills an entire family of off-by-one bugs.',
        concept: `**for walks an iterable, element by element.** \`for item in collection:\` binds \`item\` to each element in turn and runs the block. Lists, strings (one character at a time), dicts (keys by default), sets, ranges — and later, pandas columns and NumPy arrays — are all iterable:

\`\`\`
for name in ["Ada", "Alan"]:
    print(name)

for ch in "Hi":
    print(ch)          # H, then i
\`\`\`

When you need positions too, use \`enumerate\` rather than indexing: \`for i, name in enumerate(names, start=1):\`. Index-walking (\`for i in range(len(xs)):\`) is occasionally necessary, but enumerate says the same thing without the noise.

**range(start, stop, step) — always half-open.** \`range(5)\` is 0,1,2,3,4 — the stop value is **never included**. \`range(2, 7)\` is 2,3,4,5,6. \`range(1, 11, 2)\` is 1,3,5,7,9. Steps can be negative: \`range(10, 0, -2)\` is 10,8,6,4,2. The trap to memorise: wanting "1 to 10" means \`range(1, 11)\`. The same exclusive-stop convention governs slices (\`xs[:10]\` takes indices 0–9), so it is one rule applied everywhere.

**while: loop while a condition holds.** Use \`while\` when you do not know the count in advance — waiting for valid input, retrying a request, converging towards a tolerance:

\`\`\`
attempts = 0
while attempts < 3:
    # ... do something ...
    attempts += 1
\`\`\`

Every while loop needs a **guaranteed path to False**: a counter that grows, a flag that flips, or a sentinel value. Forget that update and the loop never ends. If one does spin, Ctrl+C in the terminal (or Interrupt kernel in Jupyter) stops it — learn that shortcut before you need it at 1 a.m.

**break and continue.** \`break\` leaves the **innermost** loop immediately; \`continue\` skips the rest of the current iteration and tests the condition again. Typical pairs: search-then-stop (break once found) and skip-noise (continue past rows you do not want). Use them sparingly — a loop stuffed with breaks is a function that needs splitting.

**The loop-else clause.** A loop may carry an \`else\` block that runs **only if the loop finished normally — i.e. break was never hit**. It reads oddly until you see the use case: a search that reports failure only when the search actually failed:

\`\`\`
for x in xs:
    if is_prime(x):
        print("found", x)
        break
else:
    print("no prime found")
\`\`\`

The else belongs to the for, not to the if — a confusion so common it is a fixture of exams.

**Do not mutate the thing you are iterating.** Appending to or removing from the list inside its own loop skips elements (Python walks by position, not by content). Iterate a copy (\`for x in xs[:]\`) or build a new list with a comprehension instead.`,
        extras: [
          table(
            'for or while — which loop, when',
            ['Situation', 'Loop', 'Why'],
            [
              ['Walking a known collection', 'for', 'Iterable provides the elements'],
              ['A fixed number of steps', 'for + range', 'Count is known up front'],
              ['Waiting for a condition (input, retries)', 'while', 'Iteration count is unknown'],
              ['Converging to a tolerance', 'while', 'Stop when the change is small enough'],
            ],
          ),
          code(
            'for i in range(1, 11):\n    if i % 2 == 0:\n        continue          # skip evens\n    if i > 7:\n        break              # stop after 7\n    print(i)               # 1 3 5 7',
            'break-continue.py',
            'python',
          ),
          tip(
            'Ask what makes the while False',
            'Before running any while loop, name the line that will end it. If you cannot point at it, the loop is infinite by construction.',
          ),
        ],
        worked: {
          title: 'A validated retry loop that always terminates',
          problem:
            'Ask the user for a whole number between 1 and 10, up to three attempts. On a valid entry, print it and stop; on invalid text or out-of-range values, warn and retry; after three failures, report failure. The loop must end no matter what the user does.',
          steps: [
            {
              title: '1. The skeleton with a guaranteed exit',
              desc: 'A counter that increases every attempt makes the condition (attempts < 3) False after three passes — termination guaranteed even if every input is junk.',
              code_snippet: 'attempts = 0\nwhile attempts < 3:\n    raw = input("Number 1-10: ")\n    attempts += 1\n    # validation goes here\n',
            },
            {
              title: '2. Validate with continue, succeed with break',
              desc: 'The isdigit check short-circuits: if the text is not numeric, int(raw) never runs, so no ValueError can escape. continue retries; break exits on success.',
              code_snippet: '    if not raw.isdigit() or not (1 <= int(raw) <= 10):\n        print("Invalid — try again.")\n        continue\n    print(f"You entered {raw}")\n    break',
            },
            {
              title: '3. Report failure with loop-else',
              desc: 'The else runs only when the loop ended WITHOUT break — exactly the "all attempts failed" case, with no extra flag variable.',
              code_snippet: 'else:\n    print("Three failed attempts.")',
            },
            {
              title: '4. Walk both paths',
              desc: 'Valid input on the first try: one prompt, success message, else skipped. Three junk inputs: three prompts, then the else prints. There is no fourth path.',
              code_snippet: '# Path A: "7"     -> "You entered 7"\n# Path B: x,x,x   -> three warnings, then "Three failed attempts."',
            },
          ],
          solution:
            'A while loop bounded by an attempts counter, continue for bad input, break for success, and loop-else for the failure report. Termination is structural, not hopeful: no matter what is typed, this program ends within three prompts.',
        },
        practice: {
          title: 'Sentinel total and a filtered walk',
          prompt:
            'Write two loops: (1) a while loop that repeatedly asks for a number, adding each to a running total, and stops when the user types "done" — print the total at the end; (2) a for loop over words = ["cat", "", "dog", "  ", "bird"] that prints only non-empty words after stripping, using continue to skip the blanks. Then rewrite loop (2) with a list comprehension.',
          hint: 'Compare raw == "done" before converting; in the comprehension, put the strip in the expression and the filter after the for.',
        },
        mistakes: [
          {
            mistake: 'Writing range(1, 10) expecting it to include 10',
            fix: 'Stop is exclusive: range(1, 11) gives 1..10. The same half-open rule governs every slice in Python.',
          },
          {
            mistake: 'A while loop whose condition variable never changes',
            fix: 'Infinite loop. Make the update unavoidable: increment a counter at the top of the body, or break on a sentinel the user can actually type.',
          },
          {
            mistake: 'Appending to or removing from the list being iterated',
            fix: 'Python walks by position, so shifting elements skips or repeats items. Iterate a copy (xs[:]) or build a fresh list with a comprehension.',
          },
          {
            mistake: 'Reading the loop-else as an else for the nearest if',
            fix: 'The else belongs to the for/while and runs only when the loop ended without break. Rename it mentally to "if the loop never broke".',
          },
        ],
        exam: {
          question:
            'What does the else clause attached to a for loop do, and when is it useful? Give one example.',
          answer:
            "A for...else runs its else block ONLY when the loop completed its iterations without executing break — that is, nothing in the loop early-exited it. If break ran, the else is skipped. Useful for search: scan the collection, break on the first match, and let the else handle the 'not found' case without a found-flag variable. Example: for x in xs: if x > 100: print('found', x); break / else: print('no value above 100'). The pitfall is that readers pair else with the nearest if; the language pairs it with the loop.",
          source: 'A favourite short-answer question in Python exams precisely because the pairing confuses people.',
        },
        summary: [
          'for walks any iterable; use enumerate when you need positions, not manual indices.',
          'range is half-open: range(1, 11) is 1..10 — the same exclusive-stop rule as slices.',
          'while fits unknown iteration counts; every while needs a guaranteed route to False.',
          'break exits the innermost loop; continue skips to the next iteration; both sparingly.',
          'loop-else runs only when no break happened — the built-in "not found" handler.',
          'Never mutate a collection while iterating it; iterate a copy or rebuild with a comprehension.',
        ],
      }),
      [
        [
          'How many values does list(range(2, 10, 2)) contain, and what are they?',
          ['2, 4, 6, 8', '2, 4, 6, 8, 10', '0, 2, 4, 6, 8', '2, 3, 4, 5, 6, 7, 8, 9'],
          0,
          'Start at 2, step 2, stop before 10 → [2, 4, 6, 8].',
        ],
        [
          'Inside a loop, continue causes:',
          [
            'The whole loop to stop',
            'The rest of the current iteration to be skipped',
            'The function to return',
            'An error if used twice',
          ],
          1,
          'continue jumps to the next iteration; break is the one that ends the loop.',
        ],
        [
          'A for...else block runs when:',
          [
            'The loop body raises an exception',
            'The iterable is empty',
            'The loop finished without executing break',
            'The else belongs to the last if inside the loop',
          ],
          2,
          'else signals "no break happened" — the natural place for not-found handling.',
        ],
        [
          'A while loop is the right choice when:',
          [
            'You are iterating a list',
            'The number of iterations is not known in advance',
            'You want a for-loop with fewer lines',
            'The loop body runs exactly once',
          ],
          1,
          'while re-tests its condition each pass — ideal for input validation, retries and convergence.',
        ],
      ]
    ),
    lesson(
      M4,
      'pyai-4-3',
      3,
      'Errors & try/except: Reading Tracebacks Like a Pro',
      'Exception types, traceback anatomy, try/except/else/finally, and recovering from bad input without hiding real bugs.',
      17,
      nineBlocks({
        objectives: [
          'Name the common exception types and predict which one a snippet raises',
          'Read a traceback bottom-up to locate the failing line and the cause',
          'Write try/except/else/finally that catches only the expected failure',
          'Build a validated-input loop that recovers from bad user entries',
        ],
        hook:
          'A wall of red text ends with one line that contains the entire diagnosis: ValueError: could not convert string to float: \'abc\'. Most beginners scroll to the top in panic and read the traceback like a novel, top to bottom. Professionals read it like a verdict: last line first, then the nearest frame in their own file. Same text, ten times the speed — this lesson teaches the reading order.',
        concept: `**Exceptions are objects that signal trouble.** When something goes wrong, Python **raises** an exception; if no handler exists, the program stops and prints a traceback. The types you will meet in this course, and what each actually means:

| Exception | Raised when | Example |
| TypeError | Right type of operation, wrong type of value | "a" + 1, len(5) |
| ValueError | Right type, bad value | int("abc"), float("12x") |
| IndexError | Position does not exist | xs[99] on a 3-item list |
| KeyError | Dict key does not exist | counts["missing"] |
| ZeroDivisionError | Division by zero | 10 / 0 |
| AttributeError | Object has no such method/attr | s.lenght (typo) |
| FileNotFoundError | open() on a missing path | open("nope.txt") |
| ModuleNotFoundError | An import cannot be resolved | pandas not installed |
| UnboundLocalError | Local name read before assignment | the count = count + 1 trap |

Note the division of labour that trips people: \`int("abc")\` is a **ValueError** (the type is right — string — but the contents are not a number), while \`"a" + 1\` is a **TypeError** (string plus int is meaningless at all).

**Anatomy of a traceback — read it bottom-up.** The final line is the verdict: exception type, then a human message naming the specifics. Above it, frames list the call chain, most recent call last, each with file, line number and the source line that was executing:

\`\`\`
Traceback (most recent call last):
  File "marks.py", line 2, in <module>
    total = total + float(raw)
ValueError: could not convert string to float: 'abc'
\`\`\`

Reading order: (1) the last line — type and message; (2) the **last frame whose file is your code** — that is the failing line; (3) the values that fed that line. The message here even quotes the offending text. You do not need to understand every frame; the top frames are usually library plumbing.

**try/except: handle what you expect.**

\`\`\`
raw = input("Marks: ")
try:
    marks = float(raw)
except ValueError:
    print("Please type a number like 87.5")
else:
    print(f"Got {marks}")          # runs ONLY if try succeeded
finally:
    print("Input step complete")   # ALWAYS runs
\`\`\`

The professional rules:
1. **Catch the narrowest useful type.** \`except ValueError:\` documents your expectation. A bare \`except:\` swallows everything — including KeyboardInterrupt and your own bugs — and turns a loud failure into a silent wrong answer.
2. **Handle or re-raise.** If you cannot meaningfully recover, let the exception propagate. \`except: pass\` is a code smell that has shipped production outages.
3. **else runs on success, finally runs always** — finally is for cleanup (closing a file, printing a summary), never for the main logic.
4. **Bind the details:** \`except ValueError as e:\` lets you print the message (e) or log it.

**Validated input — the pattern you will reuse forever.** Combine the retry loop (4.2) with try/except (here). Keep the \`try\` **inside** the loop, around the single conversion statement:

\`\`\`
while True:
    raw = input("Marks (0-100): ")
    try:
        marks = float(raw)
    except ValueError:
        print("Type a number, please.")
        continue
    if 0 <= marks <= 100:
        break
    print("Out of range — try again.")
\`\`\`

Scope the try tightly: the smaller the try block, the clearer which statement failed and the less real bug gets accidentally caught.`,
        extras: [
          tip(
            'Traceback reading order',
            'Last line (verdict) → last frame in YOUR file (failing line) → values on that line. Only then scroll up. If the traceback ends inside library code, your bug is usually in the data or arguments you handed it.',
          ),
          warn(
            'Never catch what you cannot handle',
            'except: pass hides crashes until a user finds them. Catch specific types, and if recovery is impossible, re-raise or let it propagate — a loud failure beats a silent wrong number.',
          ),
          code(
            'try:\n    marks = float(raw)\nexcept ValueError as e:\n    print(f"Rejected {raw!r}: {e}")\n    marks = None\nelse:\n    print(f"Loaded {marks}")\nfinally:\n    print("done with input")',
            'try-except.py',
            'python',
          ),
        ],
        worked: {
          title: 'Parse a messy CSV line without crashing',
          problem:
            'A line from a broken export reads "87,92,abc,76". Convert every field to a float, report the total of the valid ones and list the rejected fields — one bad value must not abort the rest.',
          steps: [
            {
              title: '1. Split into fields',
              desc: 'str.split(",") turns the line into a list of four candidate numbers, including the poison pill "abc".',
              code_snippet: 'line = "87,92,abc,76"\nfields = line.split(",")',
            },
            {
              title: '2. Convert field by field, with try INSIDE the loop',
              desc: 'The narrow try wraps only the risky conversion. A ValueError from one field is caught, recorded, and the loop moves on — other exception types still crash loudly, which is exactly what we want.',
              code_snippet: 'total = 0.0\nbad = []\nfor field in fields:\n    try:\n        total += float(field)\n    except ValueError:\n        bad.append(field)',
            },
            {
              title: '3. Report honestly',
              desc: 'State both the partial success and the rejects — never silently drop data. The counts should add up: 3 valid + 1 rejected = 4 fields.',
              code_snippet: 'print(f"Total of {len(fields) - len(bad)} values: {total}")\nprint(f"Rejected: {bad}")',
            },
            {
              title: '4. Expected output',
              desc: '87 + 92 + 76 = 255.0 across three values; "abc" is named rather than hidden. Delete the bad row upstream later — but the parser survived to tell you about it.',
              code_snippet: '# Total of 3 values: 255.0\n# Rejected: [\'abc\']',
            },
          ],
          solution:
            'A per-field try/except ValueError caught exactly the expected failure and continued: total 255.0 over three values, rejected ["abc"]. Compare with one big try around the whole loop — a single bad field would have aborted everything, and the except could not have said which field failed. Narrow scope is what makes exception handling honest.',
        },
        practice: {
          title: 'Recover, then file-check',
          prompt:
            'Write two programs: (1) the validated-input loop from the concept, run it with "abc", "150", then "87.5" and observe all three messages; (2) a snippet that tries to open "notes.txt" and catches FileNotFoundError as e, printing a friendly message including the missing filename from e. Create the file and re-run to prove the success path still works.',
          hint: 'In program (2), the filename is inside the exception: print(f"Could not open: {e.filename}").',
        },
        mistakes: [
          {
            mistake: 'Catching bare except (or except Exception: pass)',
            fix: 'It hides every failure, including KeyboardInterrupt and your own bugs. Catch the specific type you expect — ValueError for conversions, KeyError for lookups, FileNotFoundError for paths.',
          },
          {
            mistake: 'Wrapping an entire program in one try block',
            fix: 'The except cannot tell you which line failed and may catch unrelated bugs. Wrap only the risky statement — usually one conversion, one open, one lookup.',
          },
          {
            mistake: 'Reading the traceback top-down in a panic',
            fix: 'Read the last line first (type + message), then the last frame in your own file. That is the failing line; everything above it is context.',
          },
          {
            mistake: 'Continuing after an except with a variable never assigned',
            fix: 'If float(raw) fails, marks never exists — the next line raises NameError. Assign a sentinel (marks = None) and re-check it, or re-loop until the value is valid.',
          },
        ],
        exam: {
          question:
            'Explain exactly when the try, except, else and finally blocks execute, using an example that converts user input to a float.',
          answer:
            'try: the code you consider risky runs first; if it completes without an exception, the rest of the try is skipped as finished. except ValueError: runs only when a ValueError is raised inside the try — other exception types propagate. else: runs only when the try completed successfully (no exception) — a natural place for code that needs the converted value. finally: runs no matter what — success, exception, or even a return/break leaving the block — which makes it the right home for cleanup (closing files, printing progress), never for main logic. In the input example: bad text → except; good text → else; every run → finally.',
          source: 'A near-guaranteed question in Python unit tests and interview screens.',
        },
        summary: [
          'Exceptions distinguish wrong TYPE (TypeError) from right-type-wrong-value (ValueError) and missing access (IndexError/KeyError).',
          'Read tracebacks bottom-up: verdict line, then the last frame in your own file.',
          'try holds the risky statement; except names the expected failure; else runs on success; finally always runs.',
          'Catch narrow, handle or re-raise — bare except and pass hide real bugs as silent wrong answers.',
          'Validated input = retry loop with try around the single conversion inside it.',
        ],
      }),
      [
        [
          'int("12.5") raises which exception?',
          ['TypeError', 'ValueError', 'IndexError', 'SyntaxError'],
          1,
          'The type is right (string) but the value is not an integer literal — a ValueError.',
        ],
        [
          'An except clause runs when:',
          [
            'The try block finishes normally',
            'Any exception occurs anywhere in the file',
            'An exception matching its type is raised inside the try block',
            'The finally block raises',
          ],
          2,
          'Handlers match by exception type, and only for exceptions raised inside the protected try block.',
        ],
        [
          'The finally block of a try statement:',
          [
            'Runs only if an exception occurred',
            'Runs only if no exception occurred',
            'Always runs, whatever happened',
            'Runs before the try block',
          ],
          2,
          'finally is the cleanup lane: success, failure, or an early return all pass through it.',
        ],
        [
          'The most reliable place to start reading a traceback is:',
          ['The first line', 'The last line, then the last frame in your own file', 'Every frame in order', 'The file sizes in the header'],
          1,
          'The final line is the verdict (type + message); the nearest frame in your code is where to look.',
        ],
      ]
    ),
    lesson(
      M4,
      'pyai-4-4',
      4,
      'Debugging Methodically & Testing Small Functions',
      'A repeatable debug loop (reproduce, isolate, hypothesise, fix, prevent), print-based debugging done properly, and asserts that stop bugs from coming back.',
      17,
      nineBlocks({
        objectives: [
          'Apply the reproduce–isolate–hypothesise–fix–prevent loop to a real bug',
          'Use targeted debug prints (type, length, repr) to expose assumptions',
          'Write assert-based tests for a small pure function including boundary cases',
          'Distinguish crash bugs from silent wrong-answer bugs and pick the right tool',
        ],
        hook:
          'A function returns 50.0 where everyone expects 75.0. No crash, no traceback — just a quietly wrong number that passed review and showed up in a submission. Crashing bugs are loud; wrong-answer bugs are silent, and they are the ones that matter. The difference between a two-hour panic and a ten-minute fix is not intelligence — it is a method, which this lesson hands you in full.',
        concept: `**Debugging is a process, not a talent.** The professional loop, in order:
1. **Reproduce.** Find the smallest input that shows the failure. Three numbers you can check by hand beat three thousand you cannot. If you cannot reproduce it, you have not found the bug yet — "it happens sometimes" is an unsolved reproduction, not a bug report.
2. **Read what the program says.** Traceback (4.3) if it crashed. If it did not crash, the program is not talking — so you make it talk (step 3).
3. **Isolate.** Shrink inputs, cut unrelated code, and interrogate the values: \`print(type(x), len(x))\`, \`print(repr(x))\` (repr shows quotes around strings and makes None or an empty string obvious). The bug lives in the gap between what you assume the value is and what it actually is.
4. **Hypothesise, then test one belief.** "I bet the list is empty on the last pass" is a hypothesis; one print proves or kills it. Changing three things at once and re-running proves nothing — you are not running an experiment, you are rolling dice.
5. **Fix minimally and verify both ways.** Make the smallest change that addresses the hypothesis; re-run the reproduction, then re-run your earlier working cases to confirm nothing else broke.
6. **Prevent recurrence.** Ask how the bug got in (no test at that boundary? misleading name?) and leave a test behind. A bug found twice is a process failure.

**Print debugging, done properly.** Vague prints (\`print("here")\`) waste time. Useful debug prints answer questions: what is the type, how long is it, what is the exact value?
\`print(f"DEBUG rows={len(rows)} first={rows[0]!r}")\` — the \`!r\` conversion shows the repr, so strings display with quotes, None is unmistakable, and trailing spaces become visible. Keep prints labelled (DEBUG prefix), and delete or gate them before you commit. When prints proliferate, Python\'s built-in debugger arrives with one keyword: \`breakpoint()\` (3.7+) drops you into a \`(Pdb)\` prompt where \`p name\` prints a variable, \`n\` executes the next line, \`c\` continues, \`q\` quits. For code the size of this course, disciplined prints are usually faster — but know the next tool exists.

**Testing: the cheapest insurance you will ever buy.** A **pure function** (same inputs → same output, no side effects) is trivially testable: write down input/output pairs you can compute by hand and assert them:

\`\`\`
def percent_at_or_above(marks, threshold):
    """Return the percentage of marks that are >= threshold."""
    if not marks:
        return 0.0
    return sum(1 for m in marks if m >= threshold) / len(marks) * 100

def test_percent():
    assert percent_at_or_above([70, 90, 40, 60], 50) == 75.0
    assert percent_at_or_above([], 50) == 0.0
    assert percent_at_or_above([50], 50) == 100.0
    print("all tests passed")
\`\`\`

\`assert condition, "message"\` raises AssertionError when the condition is false and does nothing otherwise. Test **boundaries**: empty input, one element, values exactly at the threshold, duplicates, negatives. Boundaries find more bugs per line than any random big input — branch logic almost always breaks at its edges. Later, the pytest framework collects functions named \`test_*\` and runs them all; the habit of naming test functions from day one costs nothing and scales to any project.

**Bug taxonomy — match the symptom to the tool.** A crash gives a traceback (read it). A silent wrong answer needs intermediate-value prints (no exception will ever point at the bug). "Works here, fails there" is usually environment (Module 3: which Python, which packages). Slowness is usually algorithm (Module 2: a list scan inside a loop). Naming the class of bug in the first ten minutes saves the next fifty.`,
        extras: [
          table(
            'Symptom → first move',
            ['Symptom', 'Bug class', 'First move'],
            [
              ['Red traceback', 'Crash', 'Read last line, open the failing frame'],
              ['Wrong result, no error', 'Logic / silent', 'Print intermediates at hand-checkable size'],
              ["Works on my machine only", 'Environment', 'Compare interpreter, venv, packages'],
              ['Gets slower with size', 'Algorithm', 'Look for O(n) work nested inside O(n) loops'],
              ['Works sometimes', 'Reproduction gap', 'Shrink inputs until the trigger is visible'],
            ],
          ),
          tip(
            'Debug at toy scale',
            'Shrink the dataset until the wrong answer still appears with values you can compute on paper. The bug that survives toy scale is the real bug; the one that vanishes was an environment or data-volume issue.',
          ),
          warn(
            'A fix without a reproduction is a guess',
            'You cannot verify a fix for something you cannot repeat. And if the fix holds, add the reproduction as an assert — otherwise the bug will be back in three refactors, and it will deny everything.',
          ),
        ],
        worked: {
          title: 'Hunt a silent wrong-answer bug, step by step',
          problem:
            'average([70, 80, 50]) returns 50.0, but the mean of the passing marks (those above 60) is 75.0. There is no exception — just a wrong number. Find and fix it, then leave a test behind.',
          steps: [
            {
              title: '1. Reproduce small and compute the answer by hand',
              desc: 'Three numbers you can add on paper. Passing marks are 70 and 80; their mean is 150/2 = 75.0. The program says 50.0 — a silent wrong answer, no traceback to lean on.',
              code_snippet: 'def average(xs):\n    total = 0\n    for x in xs:\n        if x > 60:\n            total += x\n    return total / len(xs)\n\nprint(average([70, 80, 50]))   # 50.0 — WRONG',
            },
            {
              title: '2. Interrogate the intermediates',
              desc: 'One targeted print inside the loop shows the mechanism immediately: 50 is excluded from the total, yet len(xs) still counts it. The numerator and denominator disagree about what is being averaged.',
              code_snippet: '    for x in xs:\n        if x > 60:\n            total += x\n        print(f"DEBUG x={x} total={total}")\n    # x=50 leaves total unchanged, but len(xs) is still 3',
            },
            {
              title: '3. Form one hypothesis and fix it minimally',
              desc: 'Hypothesis: the denominator counts rejected values. Fix: filter FIRST, then average the filtered list — numerator and denominator now describe the same set.',
              code_snippet: 'def average(xs):\n    kept = [x for x in xs if x > 60]\n    if not kept:\n        return 0.0\n    return sum(kept) / len(kept)',
            },
            {
              title: '4. Verify, then leave a guard behind',
              desc: 'The reproduction now gives 75.0. Two asserts — including the empty-passing case — make this bug unable to return quietly.',
              code_snippet: 'assert average([70, 80, 50]) == 75.0\nassert average([50, 55]) == 0.0\nprint("all tests passed")',
            },
          ],
          solution:
            'The loop added only passing marks to the total but divided by every mark. Filtering first (kept = [x for x in xs if x > 60]) aligns both sides: average([70, 80, 50]) is now 75.0, and the two asserts lock the behaviour — including the zero-passing edge — so a future edit that reintroduces the mismatch fails loudly instead of quietly.',
        },
        practice: {
          title: 'Debug this one yourself',
          prompt:
            'This function should count vowels but returns early:  def count_vowels(s):\n    count = 0\n    for ch in s.lower():\n        if ch in "aeiou":\n            count += 1\n        else:\n            return count\n    return count\n\nReproduce it with a hand-checkable input (count_vowels("banana") should be 3), isolate where the first wrong return happens, fix it, and add three asserts covering: all vowels, no vowels, and an empty string.',
          hint: 'The else branch returns on the first non-vowel. What should it do instead — or nothing at all?',
        },
        mistakes: [
          {
            mistake: 'Changing code before you can reproduce the failure',
            fix: 'You cannot confirm a fix for an unreproducible bug. Freeze a failing input first — it becomes your regression test the moment the fix lands.',
          },
          {
            mistake: 'Editing three things between runs',
            fix: 'One hypothesis, one change, one run. Otherwise a green result tells you nothing about which change did it.',
          },
          {
            mistake: 'Adding except: pass while debugging',
            fix: 'Hiding the exception hides the evidence. Let errors be loud until the very end of the session; only then decide how to handle them properly.',
          },
          {
            mistake: 'Trusting one successful run as "it works"',
            fix: 'Test boundaries: empty input, a single element, values exactly at a threshold, duplicates, negatives. Almost every real bug hides at an edge, not in the middle.',
          },
        ],
        exam: {
          question:
            'Describe, in order, the steps you would take when a Python function returns a plausible but incorrect value with no exception raised.',
          answer:
            '1) Reproduce with the smallest input you can verify by hand — silent bugs are invisible at scale. 2) Since no traceback exists, print the intermediates (values, types, lengths, repr) around the suspect logic; wrong-answer bugs are found by inspection, not by the interpreter. 3) Isolate: shrink the input and the code path until the gap between expected and actual is on one line. 4) State a specific hypothesis about that line, change one thing, and re-run. 5) Verify both the original reproduction and the previously working cases. 6) Convert the reproduction into an assert (regression test) so the class of bug cannot return silently. Emphasise that for silent bugs, intermediate-value prints and hand-computed expectations replace the traceback as the diagnostic instrument.',
          source: 'Standard "how do you debug?" interview question for every Python and data-engineering role; also a practical-exam staple.',
        },
        summary: [
          'Debug in order: reproduce small, read what the program says, isolate, hypothesise once, fix minimally, then prevent.',
          'Silent wrong answers never produce tracebacks — interrogate intermediates with targeted prints (use !r for repr).',
          'One hypothesis per run; multiple simultaneous edits destroy causality.',
          'assert locks behaviour: test boundaries (empty, single, exact-threshold, negative) — they find the most bugs.',
          'Every fixed bug earns a regression assert; a bug found twice is a process failure, not bad luck.',
        ],
      }),
      [
        [
          'The FIRST step when a function gives a wrong result is to:',
          [
            'Rewrite the whole function',
            'Reproduce the failure with the smallest input you can verify by hand',
            'Add try/except around the call',
            'Search Stack Overflow for similar errors',
          ],
          1,
          'Without a reproduction you cannot verify any fix; small inputs let you compute the expected answer yourself.',
        ],
        [
          'assert 2 + 2 == 5 raises:',
          ['TypeError', 'ValueError', 'AssertionError', 'Nothing — it prints False'],
          2,
          'A failed assert raises AssertionError, which is exactly the loud failure a test should produce.',
        ],
        [
          'To see the exact value and type of a suspicious variable while debugging, the best print is:',
          ['print(x)', 'print(type(x))', 'print(f"{x!r} {type(x)}")', 'print("here")'],
          2,
          'repr (via !r) exposes quotes, None and stray spaces; pairing it with type answers both questions at once.',
        ],
        [
          'breakpoint() in Python 3.7+ is used to:',
          ['Stop the program permanently', 'Drop into the built-in pdb debugger at that line', 'Raise an exception', 'Print all variables'],
          1,
          'It starts the pdb debugger interactively: p prints a variable, n runs the next line, c continues, q quits.',
        ],
      ]
    ),
  ],
};
