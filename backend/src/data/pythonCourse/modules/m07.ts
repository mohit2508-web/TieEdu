// Module 7 — Control Flow.
//
// Up to now the program has been a straight line: every statement runs once, in
// order. Control flow is where a program starts making decisions, and where
// Python's syntax is most unlike the language you may already know — no braces,
// a `for` that works on anything iterable, and a `match` statement that is
// pattern matching rather than a switch.
//
// The recurring theme is control flow in Python is *shorter* than in most
// languages, and the price is that the fewer statements you can see, the more
// you have to know.

import { mod } from '../blocks';

export const M7 = mod(
  'crs-python-programming',
  'py-m7',
  7,
  'Module 7 — Control Flow',
  'Branching, iteration, and the loop control keywords: how Python decides, how for actually works, and when while is the right tool.',
  [
    {
      title: 'Conditionals',
      summary: 'if / elif / else, what counts as false, when to return early instead of nesting, and the match statement done properly.',
      duration: 17,
      build: (b) => [
        b.md(`## The shape

\`\`\`python
if condition:
    body_a()
elif other_condition:
    body_b()
else:
    body_c()
\`\`\`

The rules are short and they are strict:

- The condition is evaluated, and its **truthiness** decides the branch.
- **Exactly zero or one branch body runs.** Python does not fall through. There is no \`break\`, no \`switch\` leaking into the next case, and no need to \`return\` early because of one.
- \`elif\` is a **continuation of the same chain**, not a nested \`if\`. The first true condition wins and the rest are never evaluated — which matters when evaluating them is expensive.
- \`else\` is optional, and it is the "nothing matched" branch.

The \`elif\` versus \`else: if\` distinction is a real design point:

\`\`\`python
# elif: one chain, at most one branch runs, short-circuits
if score >= 90:
    grade = "A"
elif score >= 60:
    grade = "C"
else:
    grade = "F"

# else: if: the second \`if\` is a completely separate question
if score >= 90:
    grade = "A"
else:
    if score >= 60:
        grade = "C"
    else:
        grade = "F"

# else: if: but the first branch also takes the \`elif\` conditions — BUG
if score >= 90:
    grade = "A"
    if score < 0:          # can never be true here; dead code
        grade = "invalid"
else:
    if score >= 60:
        grade = "C"
\`\`\`

Write \`elif\` unless you specifically want the second \`if\` to be evaluated even when the first matched. When in doubt, \`elif\` is shorter, flatter, and cannot surprise you.

## Truthiness: what counts as false

There is no \`bool\` in the condition position. Python asks the object whether it is *truthy*, and the answer is a single \`__bool__\` call.

| Value | Truthiness | Why |
| --- | --- | --- |
| \`True\`, any non-zero number | true | The obvious case |
| \`False\`, \`0\`, \`0.0\`, \`0j\` | **false** | Zero is "nothing", so it means no |
| \`""\`, \`''\`, \`b""\` | **false** | An empty container means no |
| \`[]\`, \`{}\`, \`set()\`, \`()\` | **false** | Same rule: empty is false |
| \`None\` | **false** | The absence of a value |
| any non-empty str, list, dict, set, tuple | true | Non-empty means yes |
| any object with no \`__bool__\` and no \`__len__\` | true | Including \`0.0j\`-free custom classes |

\`\`\`python
if items:              # idiomatic — empty list means "nothing to do"
    process(items)

if items is not None:  # correct only when None and [] are genuinely different
    process(items)

name = input("Name: ")
if not name:           # reads as a question: "if there is no name?"
    raise ValueError("a name is required")
\`\`\`

The \`if x is None\` versus \`if not x\` choice is the one that gets code reviews wrong. If \`0\`, \`""\` and \`[]\` are all valid values for \`x\`, then \`if not x\` is a bug, and only the identity test is correct.

Chained comparisons are a Python feature no other language in your head has:

\`\`\`python
# This is ONE comparison, not two. Python stores the middle term once.
if 0 <= score < 60:
    print("failed")

# Equivalent to what you would otherwise write, and much harder to get wrong
# than: if score >= 0 and score < 60:
\`\`\`

## The conditional expression

\`\`\`python
label = "high" if value > 100 else "low"
\`\`\`

It is an expression, so it produces a value — which means it works in a return, an f-string, a dict value, or an argument, none of which an \`if\` statement can do:

\`\`\`python
def describe(n):
    return f"{n} ({'even' if n % 2 == 0 else 'odd'})"

config = {"retries": 3, "timeout": 10 if fast else 60}
\`\`\`

Keep it to a single short line. The moment the true-branch or false-branch is a multi-statement block, you want the statement form — a conditional expression is not a place to put logic.

## Nesting, and why early return wins

\`\`\`python
# Nested: valid, and increasingly hard to read
def process(record):
    if record["active"]:
        if record["score"] > 50:
            if record["verified"]:
                return "promote"
            return "verify first"
        return "score too low"
    return "inactive"

# Early return: same behaviour, one level of indentation, no else at all
def process(record):
    if not record["active"]:
        return "inactive"
    if record["score"] <= 50:
        return "score too low"
    if not record["verified"]:
        return "verify first"
    return "promote"
\`\`\`

The guard-clause version is the same program. It reads top to bottom as a list of exit conditions, each one a complete sentence, and it never makes you hold four levels of context in your head. This is the single most common style rule in well-written Python: **use \`return\` to leave, not \`else\` to continue.**

## \`match\` — structural pattern matching, not a switch

Python 3.10 added \`match\`. It looks like a switch and is not one: it matches the *structure* of a value, not its equality to a constant.

\`\`\`python
def describe(point):
    match point:
        case (0, 0):
            return "origin"
        case (0, y):
            return f"on the x axis at {y}"
        case (x, 0):
            return f"on the y axis at {x}"
        case (x, y) if x == y:
            return f"on the diagonal at {x}"
        case (x, y):
            return f"general point {x}, {y}"
        case _:
            return "not a point"
\`\`\`

The mechanics:

- \`case (0, y)\` is a **sequence pattern**: it matches any 2-tuple whose first element equals 0, and binds the second to \`y\`. A sequence pattern also matches lists, and a class pattern \`case str()\` matches by type.
- \`if x == y\` after a pattern is a **guard**. The pattern must match *and* the guard must be true, otherwise the case falls through to the next one.
- \`_\` is the **wildcard**: it matches anything and binds nothing. It is the \`else\` of a \`match\`.
- A bare **name** is a capture pattern — \`case x:\` binds *anything* to \`x\`, which is why it must come last. \`case "error":\` is a literal match, and \`case Color.RED:\` is a value match (dotted names are looked up, not captured).
- \`case str() | bytes():\` is an **or pattern** for alternatives.

It is not a switch because:

1. cases match structure and types, not just constants;
2. cases **bind names** as a side effect, which a switch cannot;
3. there is no fallthrough — the first match wins, full stop;
4. guards make each case a condition, so you can build a chain that no switch can express.

\`\`\`python
def handle(command):
    match command.split():
        case ["quit"]:
            print("bye")
        case ["add", *items] if items:
            print(f"adding {len(items)} items")
        case ["add"]:
            print("nothing to add")
        case [action, *rest]:
            print(f"unknown action {action!r} with {len(rest)} args")
        case []:
            print("empty command")
\`\`\`

That \`case ["add", *items]\` is a starred capture inside a sequence pattern, and it is exactly the kind of thing a switch cannot do.`),
        b.anim('trace', {
          title: 'A four-way branch, and why only one body ever runs',
          badge: 'if / elif / else',
          code: `def classify(n):
    if n < 0:
        return "negative"
    elif n == 0:
        return "zero"
    elif n < 10:
        return "small"
    return "large"

print(classify(7))`,
          steps: [
            {
              caption: 'The function is defined; not one line of the body runs yet',
              note: 'def only creates the function object. The body is a code object that will be executed later, when something calls it. Nothing is on the stack yet.',
              line: 1,
              vars: [],
              output: '',
            },
            {
              caption: 'The call binds n and pushes a frame',
              note: 'classify(7) creates a new frame holding the parameter n. The parameter name is chosen by the function, not the caller — pass positionally and the caller never names it.',
              line: 10,
              vars: [{ name: 'n', value: '7', tone: 'int' }],
            },
            {
              caption: 'First condition: n < 0 is False',
              note: 'The whole if — condition AND body — is skipped. Line 3 never executes, and that is not an exception to the rules, it is the rules: a false condition means the body is not even considered.',
              line: 2,
              vars: [{ name: 'n', value: '7', tone: 'int' }],
            },
            {
              caption: 'elif: n == 0 is also False',
              note: 'The chain continues to the next test. Because elif belongs to the same chain, the first branch being False is what allowed us to get here at all.',
              line: 4,
              vars: [{ name: 'n', value: '7', tone: 'int' }],
            },
            {
              caption: 'Third condition: n < 10 is True, so this branch is taken',
              note: 'The first true condition wins and the chain stops. There is no fallthrough and no break, and the final `return "large"` on line 8 will never be reached for this call.',
              line: 6,
              vars: [{ name: 'n', value: '7', tone: 'int' }],
            },
            {
              caption: 'The body runs and returns immediately',
              note: 'Returning pops the frame. Control resumes on the line after the call, so lines 4, 5 and 8 are not merely skipped — they are never evaluated for this call at all.',
              line: 7,
              vars: [{ name: 'n', value: '7', tone: 'int' }],
            },
            {
              caption: 'Back at the call site',
              note: 'Exactly one of the four possible bodies ran. That is the whole guarantee: zero branches if nothing matched and there is no else, otherwise exactly one.',
              line: 10,
              vars: [{ name: 'n', value: '7', tone: 'int' }],
              output: 'small',
            },
          ],
        }),
        b.anim('expression', {
          title: 'Chained comparison: one comparison, not two',
          badge: '0 <= score < 60',
          expression: '0 <= score < 60',
          steps: [
            {
              caption: 'The parser makes a single chain node with two sides',
              note: 'This is not sugar for `score >= 0 and score < 60`. It is a distinct node type, and the difference is that the middle expression is evaluated exactly once and stored in a temporary.',
              node: {
                label: '0 <= score < 60',
                op: 'chain',
                children: [
                  { label: '0 <= score', op: '<=', tone: 'int' },
                  { label: 'score < 60', op: '<', tone: 'int' },
                ],
              },
            },
            {
              caption: 'The middle term is stored in a temporary',
              note: 'If `score` were an expensive call, a hand-written `and` version would run it twice. The chain form evaluates it once, which is why `0 <= expensive() < 100` is the correct thing to write.',
              node: {
                label: '0 <= 72 < 60',
                op: 'chain',
                children: [
                  { label: '0 <= 72', op: '<=', tone: 'ok' },
                  { label: '72 < 60', op: '<', tone: 'int' },
                ],
              },
            },
            {
              caption: 'The left side is True, so the right side is evaluated',
              note: 'Short-circuiting applies within the chain. Had 0 <= 72 been False, the right side would never be evaluated and the whole expression would be False immediately.',
              node: {
                label: '0 <= 72 < 60',
                op: 'chain',
                children: [
                  { label: '0 <= 72  ->  True', op: '<=', tone: 'ok' },
                  { label: '72 < 60  ->  False', op: '<', tone: 'warn' },
                ],
              },
            },
            {
              caption: 'A False right side makes the whole chain False',
              note: 'So `if 0 <= score < 60` is exactly the range test you would hand-write, with no off-by-one and no duplicated expression.',
              node: {
                label: '0 <= 72 < 60',
                op: 'chain',
                children: [
                  { label: 'True', op: 'and', tone: 'ok' },
                  { label: 'False', op: 'and', tone: 'warn' },
                ],
              },
              result: 'False',
            },
          ],
        }),
        b.table(
          'What is False, and what is True',
          ['Expression', 'Result', 'So an `if` on it is'],
          [
            ['`0`, `0.0`, `0j`', 'falsy', 'skipped — zero means "no value here"'],
            ['`""`, `b""`', 'falsy', 'skipped — an empty string means no content'],
            ['`[]`, `{}`, `set()`, `()`', 'falsy', 'skipped — an empty container means nothing to do'],
            ['`None`', 'falsy', 'skipped — this is the "no value at all" case'],
            ['`"0"`', '**truthy**', 'taken — it is a one-character string, not a number'],
            ['`[0]`', '**truthy**', 'taken — non-empty, whatever is inside it'],
            ['`0.1`', 'truthy', 'taken — only exactly zero is falsy'],
            ['a custom object with no `__bool__` and no `__len__`', 'truthy', 'taken — objects are truthy by default'],
            ['a custom object defining `__len__` returning 0', 'falsy', 'skipped — `len` is consulted, like a container'],
          ]
        ),
        b.code(
          `# branches.py — the shapes, side by side
def classify(n):
    if n < 0:
        return "negative"
    elif n == 0:
        return "zero"
    elif n < 10:
        return "small"
    else:
        return "large"

print(classify(7))                     # small


# Guard clauses instead of nesting: same behaviour, one level deep
def label(record):
    if not record["active"]:
        return "inactive"
    if record["score"] <= 50:
        return "score too low"
    if not record["verified"]:
        return "verify first"
    return "promote"


print(label({"active": True, "score": 80, "verified": True}))   # promote
print(label({"active": False, "score": 99, "verified": True}))  # inactive


# The conditional expression produces a value, so it fits anywhere a value does
def describe(n):
    return f"{n} ({'even' if n % 2 == 0 else 'odd'})"

print(describe(4), describe(7))         # 4 (even) 7 (odd)


# Truthiness, and the identity test that is NOT the same thing
values = [0, "", [], {}, None, "0", [0], 0.1]
print([bool(v) for v in values])
# [False, False, False, False, False, True, True, True]

x = 0
print(bool(x), x is not None)           # False True  <- 0 exists, it is just zero


# Chained comparison: the middle term is evaluated once
score = 72
print(0 <= score < 60)                  # False
print(0 <= score <= 100)                # True
`,
          'branches.py'
        ),
        b.warn(
          '`match` is not a switch, and reaching for it as one is the mistake',
          'Cases match structure, not just constants, and a bare name in a case binds *anything* — so `case x:` swallows everything and must come last. There is also no fallthrough: the first match wins and the rest are ignored. If all you need is constant dispatch, a dict lookup is clearer, faster, and has none of these traps.',
        ),
        b.code(
          `# matching.py — match as structural pattern matching
def describe(point):
    match point:
        case (0, 0):
            return "origin"
        case (0, y):
            return f"on the x axis at {y}"
        case (x, 0):
            return f"on the y axis at {x}"
        case (x, y) if x == y:          # a guard: pattern AND condition
            return f"on the diagonal at {x}"
        case (x, y):
            return f"general point {x}, {y}"
        case _:
            return "not a point"


print(describe((0, 0)))                 # origin
print(describe((0, 7)))                 # on the x axis at 7
print(describe((4, 4)))                 # on the diagonal at 4
print(describe((3, 9)))                 # general point 3, 9


# Matching on a command line: sequence patterns plus a starred capture
def handle(command):
    match command.split():
        case ["quit"]:
            return "bye"
        case ["add", *items] if items:  # starred capture, guarded against "add" alone
            return f"adding {len(items)} items"
        case ["add"]:
            return "nothing to add"
        case [action, *rest]:
            return f"unknown action {action!r} with {len(rest)} args"
        case []:
            return "empty command"


print(handle("add one two three"))      # adding 3 items
print(handle("add"))                    # nothing to add
print(handle(""))                       # empty command


# Matching on types, and OR patterns
def size_of(value):
    match value:
        case []:
            return "empty"
        case [x]:
            return "one item"
        case [x, y, *rest]:
            return f"{len(rest) + 2} items, first is {x!r}"
        case str() | bytes():
            return "text"
        case None:
            return "nothing"
        case _:
            return "something else"
`,
          'matching.py'
        ),
        b.steps('Choosing a branching style', [
          {
            title: 'Two outcomes? An if, or a conditional expression',
            desc: 'A two-way choice that produces a value belongs in an expression, because an expression can be returned, printed, or stored. A two-way choice that runs statements needs the statement form.',
            code_snippet: 'label = "high" if value > 100 else "low"',
          },
          {
            title: 'Three or more outcomes? elif, or a match',
            desc: 'A chain of elif is the plain answer. Reach for match when the branches are distinguished by the *shape* or *type* of the value rather than by a comparison, because that is what it is for.',
            code_snippet: 'match command.split():\n    case ["add", *items]:',
          },
          {
            title: 'Guards in the condition, or elif?',
            desc: 'Reach for elif when the conditions are independent tests. Reach for a match guard when a pattern already told you something about the value and the extra test refines that pattern.',
            code_snippet: 'case (x, y) if x == y:',
          },
          {
            title: 'More than one level deep? Use early return',
            desc: 'Once a branch body contains another conditional, the nesting is telling you the function has more than one exit. Flatten it into guard clauses and every line becomes a complete sentence.',
            code_snippet: 'if not record["active"]:\n    return "inactive"',
          },
          {
            title: 'Constants only? Use a dict, not a match',
            desc: 'A dict keyed by the constant is shorter, faster, and does not have the "a bare name matches everything" trap. match earns its place when patterns and bindings are doing real work.',
            code_snippet: 'HANDLERS = {"quit": quit_fn, "save": save_fn}',
          },
        ]),
        b.checklist('Conditionals review', [
          'Exactly zero or one branch body runs — is my code relying on fallthrough?',
          'Am I using `elif` rather than `else: if` unless I specifically want the second test always evaluated?',
          'For a nullable value, is the test `is None` rather than `not value`?',
          'For a range check, am I using `0 <= x < 10` rather than `x >= 0 and x < 10`?',
          'Is any branch body more than a few lines? That is a sign it wants to be its own function.',
          'In a `match`, is the wildcard `_` last, and is every bare name before it a constant or a dotted lookup?',
        ]),
      ],
      questions: [
        [
          'Given `if a: X() elif b: Y() else: Z()`, how many of X, Y and Z can run for a single evaluation?',
          [
            'All three, in order, because the conditions are independent',
            'At most one — the first true condition wins, and if none match then Z runs',
            'Exactly one, and it is always Z',
            'Whatever evaluates truthy, including several branches whose conditions are all true',
          ],
          1,
          'The chain is a single decision. Python evaluates conditions top to bottom, runs the body of the first one that is true, and stops — the remaining conditions are not even evaluated. If nothing matches, the else body runs; if there is no else, nothing runs at all.',
        ],
        [
          'Which of these values is **truthy**?',
          [
            '`0`',
            '`""`',
            '`[]`',
            '`"0"`',
          ],
          3,
          'Only a handful of values are falsy: False, zero of any numeric type, empty strings, empty containers, and None. `"0"` is a one-character string, and a non-empty string is truthy regardless of what it spells — which is why `if value:` is wrong for numeric text from a form.',
        ],
        [
          'In `match value: case _: ... case x: ...`, why is this order a problem?',
          [
            'Because `_` is not allowed to appear in a match statement at all',
            'Because `_` is the wildcard and matches anything, so the later `case x` can never be reached',
            'Because a name in a case pattern must be declared first',
            'Because patterns are evaluated in reverse order',
          ],
          1,
          'A bare `_` is the wildcard: it matches every value and binds nothing, so it consumes the whole match. A bare name like `x` is a capture and also matches everything, which is why capture cases must come after any more specific cases. The wildcard is the natural last case — the equivalent of `else`.',
        ],
        [
          'What is the value of `b` after `a = 5; b = 3 if a > 0 else 7`?',
          [
            '`7`, because the else branch is evaluated first',
            '`3`, because `a > 0` is true so the true branch is taken',
            'Both `3` and `7`, because a conditional expression evaluates both branches',
            'A syntax error, because a conditional expression cannot be assigned',
          ],
          1,
          'The condition `a > 0` is true, so the true branch `3` is evaluated and returned. The else branch is never evaluated at all — the expression short-circuits like any other. That is why putting a function call in the untaken branch of a conditional expression is safe.',
        ],
      ],
    },
    {
      title: 'for loops and the iteration protocol',
      summary: 'What for really does, range and enumerate and zip, why the loop variable leaks, and the else clause nobody knows about.',
      duration: 18,
      build: (b) => [
        b.md(`## \`for\` is not a loop over indices

A \`for\` loop in C or Java asks for element *n* of something. A \`for\` loop in Python asks an object for its next item, over and over, until it says there are none. That is the **iteration protocol**, and it is why \`for\` works on things that have no length, no indexing, and no idea what an integer is.

The protocol is two methods:

\`\`\`python
it = iter("abc")     # asks the object for an iterator
next(it)             # 'a'   — asks the iterator for its next item
next(it)             # 'b'
next(it)             # 'c'
next(it)             # StopIteration: the signal that the loop ends
\`\`\`

\`for x in thing\` is exactly \`it = iter(thing)\` followed by \`next(it)\` in a loop, with the \`StopIteration\` caught for you. Any object with an \`__iter__\` (or a \`__getitem__\`, the older fallback) can be looped over. Strings, lists, tuples, dicts, sets, files, \`range\` objects, \`zip\` results and generators are all just objects that answer that question.

\`\`\`python
# A custom iterable needs nothing else
class Countdown:
    def __init__(self, start):
        self.current = start

    def __iter__(self):
        return self                  # a generator or a class with __next__

    def __next__(self):
        if self.current <= 0:
            raise StopIteration
        self.current -= 1
        return self.current + 1

for n in Countdown(3):
    print(n)                        # 3 2 1
\`\`\`

The \`StopIteration\` is not an error case you handle — it is the loop terminator, and raising it from \`__next__\` is how an iterator says "I am done". Notice that \`iter()\` and \`next()\` are also plain functions you can call yourself, which is the escape hatch when you want to pull items one at a time with control over when you stop.

## \`range\`: three arguments, and it is not a list

\`\`\`python
range(5)            # 0, 1, 2, 3, 4
range(2, 5)         # 2, 3, 4          start inclusive, stop exclusive
range(0, 10, 3)     # 0, 3, 6, 9      a step
range(5, 0, -1)     # 5, 4, 3, 2, 1   a negative step walks backwards
\`\`\`

\`range\` is **lazy**. It is not a list that was built eagerly; it is a tiny object that computes each number as you ask for it, and it only holds one number at a time. That is why \`range(10**12)\` is instant and \`list(range(10**12))\` kills your machine.

It is also why \`list(range(...))\` is a smell. If you index the range, or take its length, or iterate it more than once, CPython quietly converts it to a real list behind the scenes, and you have paid for a list without getting one. If you need the list, say so.

\`\`\`python
# range is right for counting, and only for counting
for i in range(10):                 # 0 to 9
    ...
for i in range(len(data) - 1):      # adjacent pairs — the classic range idiom
    if data[i] == data[i + 1]:
        ...
\`\`\`

## \`enumerate\`, and why it beats \`range(len(x))\`

\`\`\`python
names = ["ada", "grace", "alan"]

for i, name in enumerate(names):
    print(i, name)
# 0 ada
# 1 grace
# 2 alan

for i, name in enumerate(names, start=1):
    print(f"{i}. {name}")
# 1. ada
# 2. grace
# 3. alan
\`\`\`

The \`for i, x in range(len(xs))\` idiom exists because Python has no C-style for. \`enumerate\` is the replacement, and it is better in four ways:

- **It iterates the sequence once**, instead of re-indexing it on every pass.
- **The index comes from the iterator**, so it counts the items actually produced. If you are filtering, the count cannot drift out of step with the data.
- **The unpacking is the point**: \`for i, name in enumerate(names)\` names two things at once, and there is no \`xs[i]\` left to get out of sync.
- **\`start=\` removes the \`i + 1\` arithmetic** that every numbered report needs.

## \`zip\`, and the argument you should always pass

\`\`\`python
names = ["ada", "grace", "alan"]
scores = [91, 88, 45]

for name, score in zip(names, scores):
    print(name, score)
# ada 91
# grace 88
# alan 45

# Different lengths: zip stops at the SHORTEST, silently.
short = [1, 2]
print(list(zip([1, 2, 3], short)))      # [(1, 1), (2, 2)]  <- the 3 vanished

# strict=True turns that data loss into an error (3.10+)
try:
    list(zip([1, 2, 3], [1, 2], strict=True))
except ValueError as err:
    print(err)
# zip() argument 2 is shorter than argument 1
\`\`\`

Silently truncating to the shortest is the correct mathematical behaviour and almost never the correct *program* behaviour. If two lists are supposed to be the same length, \`strict=True\` is how you find out at the point of the mistake rather than three functions later when a name is \`None\`.

The older \`itertools.zip_longest\` fills the shorter one with a \`fillvalue\` instead of stopping, which is what you want when the lists are *meant* to be different lengths.

## \`reversed\`, \`sorted\`, and other wrappers

\`\`\`python
xs = [3, 1, 2]

list(reversed(xs))        # [2, 1, 3]  — an iterator, not a list
sorted(xs)                # [1, 2, 3]  — a new list
list(reversed(sorted(xs)))    # [3, 2, 1]  — descending, without mutating
sorted(xs, reverse=True)  # [3, 2, 1]
sorted(xs, key=abs)       # keys on abs, which is not the same as sorting by abs
\`\`\`

All of these produce **iterables**, not lists, and each is a one-pass object except \`sorted\`, which builds a real list. \`for x in reversed(xs)\` does not copy \`xs\`; it walks it backwards using \`__reversed__\`, falling back to the \`__len__\`/\`__getitem__\` pair.

## \`break\`, \`continue\`, and the \`else\`

\`\`\`python
for n in range(10):
    if n % 2:
        continue        # skip the rest of this iteration
    if n > 6:
        break           # leave the loop entirely
    print(n)            # 0 2 4 6

for n in range(10):
    if n % 2:
        continue
    if n > 6:
        break
    print(n)
else:
    print("no break")   # NOT printed — a break skips the else
\`\`\`

The \`else\` on a loop is not Python's \`for ... else\` in the C sense. It runs when the loop finished **naturally** — that is, it exhausted its iterable and never hit a \`break\`. That makes it a genuinely useful search idiom:

\`\`\`python
def find(haystack, needle):
    for i, item in enumerate(haystack):
        if item == needle:
            return i                  # the simplest version; the else is optional
    return -1


# The else version says "we got through everything without finding it"
def index_of(haystack, needle):
    for i, item in enumerate(haystack):
        if item == needle:
            return i
    else:
        return None                   # only reachable if no break happened
\`\`\`

In practice \`return\` inside the loop is clearer, and most style guides prefer it. Know the \`else\` exists, because you will meet it in older code and in library code.

## The loop variable leaks, and that is a real hazard

\`\`\`python
for name in ["ada", "grace", "alan"]:
    pass
print(name)              # alan  — it still exists!

def f():
    for i in range(3):
        pass
    return i              # works, and leaks
\`\`\`

Python has no block scope: a \`for\` does not create a namespace, so the loop variable is a normal name that survives the loop. This is not a bug in the language (function locals are still function-scoped), but it is a bug magnet:

\`\`\`python
found = None
for i in range(10):
    if i == 4:
        found = i
        break
print(i)                  # 9, not 4 — a classic wrong-answer bug
\`\`\`

Delete the variable if the leak bothers you (\`del i\` after the loop), or just do not rely on it. The related trap is shadowing a name you already had: \`for i in ...\` inside a function silently overwrites any outer \`i\`.

## Nested loops: no labels, so you exit with a structure

There is no \`break 2\` in Python and there is not going to be one. \`break\` always leaves the innermost loop, so the options are a function, a flag, or a generator comprehension:

\`\`\`python
# 1. Return from a function — the clearest option
def find_pair(grid, target):
    for r, row in enumerate(grid):
        for c, value in enumerate(row):
            if value == target:
                return r, c
    return None

# 2. A flag, checked by the outer loop
def find_pair_flag(grid, target):
    hit = None
    for row in grid:
        for value in row:
            if value == target:
                hit = value
                break
        if hit is not None:      # the inner break only leaves the inner loop
            break
    return hit

# 3. Let the comprehension do it
def find_pair_comp(grid, target):
    return next(
        ((r, c) for r, row in enumerate(grid) for c, v in enumerate(row) if v == target),
        None,
    )
\`\`\`

Reach for the function. It gives the loop its own name, its own locals, and a way to return a value from wherever it found something.

## Why anyone would care

- **The iteration protocol is why \`for\` works on everything**, including objects you wrote yourself. That is the single most reused idea in the language.
- **\`enumerate\` and \`zip\` delete real classes of bug.** Index arithmetic in a loop is where off-by-one errors live.
- **\`zip(..., strict=True)\` turns silent data loss into an exception**, which is the difference between a bug you find and a bug a user finds.
- **Knowing that the loop variable leaks** stops a whole family of "the value is wrong" reports, and it is a common interview question for a reason.`),
        b.anim('trace', {
          title: 'A for loop with enumerate, one step at a time',
          badge: 'iteration protocol',
          code: `names = ["ada", "grace", "alan"]
for i, name in enumerate(names, start=1):
    print(f"{i}. {name.upper()}")
print(f"{len(names)} names")`,
          steps: [
            {
              caption: 'The list is created and bound',
              note: 'One object, three references. Iterating it will not copy anything — the loop holds a cursor into this one list.',
              line: 1,
              vars: [{ name: 'names', value: '["ada", "grace", "alan"]', tone: 'ok' }],
              output: '',
            },
            {
              caption: 'iter(names) is called, then wrapped by enumerate',
              note: 'Two objects now exist: the list iterator, which knows how to produce "ada" then "grace" then raise StopIteration, and the enumerate object, which pairs each item with a counter starting at 1.',
              line: 2,
              vars: [
                { name: 'names', value: '["ada", "grace", "alan"]', tone: 'ok' },
                { name: 'enumerator', value: 'start=1', tone: 'data' },
              ],
            },
            {
              caption: 'First pass: next() yields ("ada", 1), unpacked into i and name',
              note: 'enumerate is itself an iterator, so the for loop calls next() on it. It calls next() on the list underneath, and pairs the result with its own running counter. The tuple is then unpacked into the two targets.',
              line: 3,
              vars: [
                { name: 'i', value: '1', tone: 'int' },
                { name: 'name', value: '"ada"', tone: 'char' },
              ],
              output: '1. ADA',
            },
            {
              caption: 'Second pass: the counter advances, the list advances',
              note: 'Nothing about i is computed from the list. It is the count of items the iterator has actually produced, so it stays correct even if the list is filtered, or if you zip it with something of a different length.',
              line: 2,
              vars: [
                { name: 'i', value: '2', tone: 'int' },
                { name: 'name', value: '"grace"', tone: 'char' },
              ],
            },
            {
              caption: 'Second pass body runs',
              note: 'The f-string is rebuilt each pass. f"{i}. {name.upper()}" is a template with two holes, and the expression inside each hole is evaluated once, here, at format time.',
              line: 3,
              vars: [
                { name: 'i', value: '2', tone: 'int' },
                { name: 'name', value: '"grace"', tone: 'char' },
              ],
              output: '2. GRACE',
            },
            {
              caption: 'Third and final pass',
              note: 'Three items, three passes. There is no index into the list anywhere in this loop — the values arrive because the iterator produced them.',
              line: 3,
              vars: [
                { name: 'i', value: '3', tone: 'int' },
                { name: 'name', value: '"alan"', tone: 'char' },
              ],
              output: '3. ALAN',
            },
            {
              caption: 'The next() call raises StopIteration and the loop ends',
              note: 'The exception is not printed and does not propagate — the for statement catches it internally. That is the entire mechanism: a sentinel value signalling "no more items".',
              line: 2,
              vars: [
                { name: 'i', value: '3', tone: 'int' },
                { name: 'name', value: '"alan"', tone: 'char' },
              ],
            },
            {
              caption: 'After the loop, name and i still exist',
              note: 'Python has no block scope. Both names survive with their last values, which is a real hazard: code that reads name after the loop is reading whatever the last iteration happened to set.',
              line: 4,
              vars: [
                { name: 'i', value: '3', tone: 'warn' },
                { name: 'name', value: '"alan"', tone: 'warn' },
                { name: 'len(names)', value: '3', tone: 'int' },
              ],
              output: '3 names',
            },
          ],
        }),
        b.diagram(
          'The iteration protocol, which is all a for loop is',
          `flowchart TD
    A["for x in thing:"] --> B["iterator = iter(thing)"]
    B --> C{"Does thing have an<br/>__iter__ method?"}
    C -->|"yes"| D["__iter__ returns the iterator object"]
    C -->|"no — old-style sequence"| E["__iter__ builds a wrapper<br/>around __getitem__"]
    C -->|"neither"| F["TypeError: object is not iterable"]
    D --> G["next(iterator)"]
    E --> G
    G --> H{"Is there a next item?"}
    H -->|"yes"| I["x = that item<br/>run the loop body<br/>loop-variable and body<br/>share one namespace"]
    I --> G
    H -->|"no — __next__ raised<br/>StopIteration"| J["The for statement catches it<br/>silently and falls through"]
    J --> K["Execution continues on the<br/>line after the loop"]`
        ),
        b.table(
          'The iteration built-ins',
          ['Expression', 'Yields', 'Notes'],
          [
            ['`iter(thing)`', 'an iterator object', 'The manual form of what `for` does first'],
            ['`next(it[, default])`', 'the next item, or `default`', 'Raises `StopIteration` with no default; this is how you consume an iterator by hand'],
            ['`range(stop)` / `range(start, stop[, step])`', 'integers, lazily', 'Stop is exclusive; never build a list from it unless you need one'],
            ['`enumerate(it[, start])`', '`(index, item)` pairs', 'The correct replacement for `range(len(x))`; the counter is positional, not an index'],
            ['`zip(*iterables[, strict])`', 'tuples of one item per iterable', 'Stops at the shortest; `strict=True` raises `ValueError` on a length mismatch (3.10+)'],
            ['`reversed(seq)`', 'items backwards', 'An iterator, and it does not copy the sequence'],
            ['`sorted(seq, key=, reverse=)`', 'a new sorted **list**', 'Never mutates; the only one of these that returns a list'],
            ['`itertools.chain(a, b)`', 'all of a, then all of b', 'Flattens two iterables without building a combined list'],
            ['`itertools.islice(it, a, b)`', 'a slice of an iterator', 'The only way to slice something that is not a sequence'],
            ['`itertools.count(1)` / `cycle(seq)`', 'endless iterators', 'For `islice`; `count()` is infinite, so always bound it'],
          ]
        ),
        b.code(
          `# loops.py — enumerate, zip, and the things they replace
names = ["ada", "grace", "alan"]
scores = [91, 88, 45]

# WORSE: index arithmetic that can drift out of step with the data
for i in range(len(names)):
    print(i, names[i], scores[i])

# BETTER: the iterator supplies the value and the count together
for i, name in enumerate(names, start=1):
    print(f"{i}. {name} scored {scores[i - 1]}")

# zip pairs them; strict=True turns a silent length mismatch into an error
for name, score in zip(names, scores, strict=True):
    print(name, score)

try:
    list(zip(names, [1, 2], strict=True))
except ValueError as err:
    print(err)                      # zip() argument 2 is shorter than argument 1

# reversed and sorted are iterators/objects, not lists
xs = [3, 1, 2]
print(list(reversed(xs)))            # [2, 1, 3]
print(sorted(xs))                    # [1, 2, 3]
print(list(reversed(sorted(xs))))    # [3, 2, 1]  — descending, xs untouched

# range is lazy, so this is instant
r = range(10**12)
print(r.start, r.stop, r.step)       # 0 1000000000000 1

# break, continue, and the loop else
for n in range(10):
    if n % 2:
        continue
    if n > 6:
        break
    print(n)                         # 0 2 4 6
else:
    print("unreachable, we broke out")

# The else DOES run when the loop is never broken
for n in range(3):
    print(n)                         # 0 1 2
else:
    print("finished without a break")

# The loop variable leaks out of the loop
for name in names:
    pass
print(name)                          # alan
`,
          'loops.py'
        ),
        b.warn(
          'The leak that produces a wrong answer, not a crash',
          '`for i in range(10): if i == 4: found = i; break` leaves `i` bound to 9. Any later line that reads `i` — in a log message, in an error report, in a slice — silently uses the wrong number. Bind the value you want to a separate name, and treat the loop variable as belonging to the loop.',
        ),
        b.tip(
          'Iterate over items, not over indices',
          '`for x in xs` is faster than `for i in range(len(xs)): x = xs[i]` because there is no indexing, no range object, and no attribute lookups. The one legitimate exception is when you need the *position* — and then use `enumerate`, which gets you both without the arithmetic.',
        ),
        b.code(
          `# protocol.py — the iteration protocol, written out
# A for loop over any iterable is exactly this:
it = iter("abc")
print(next(it), next(it), next(it))     # a b c
try:
    next(it)
except StopIteration:
    print("no more items")              # the loop terminator, not an error

# A custom iterable is two methods. This one is finite, like the ones you write.
class Countdown:
    def __init__(self, start):
        self.current = start

    def __iter__(self):
        return self

    def __next__(self):
        if self.current <= 0:
            raise StopIteration
        self.current -= 1
        return self.current + 1

for n in Countdown(3):
    print(n)                            # 3 2 1

# islice is how you take a bounded slice of an infinite iterator
from itertools import islice, count
print(list(islice(count(1, 10), 5)))   # [1, 2, 3, 4, 5]
print(list(islice(range(10), 2, 5)))   # [2, 3, 4]

# chain flattens without building a combined list
from itertools import chain
print(list(chain([1, 2], [3], [4, 5])))   # [1, 2, 3, 4, 5]

# next(iterator, default) is how you pull one item without an exception
stream = iter([1, 2])
print(next(stream, None), next(stream, None), next(stream, "drained"))
# 1 2 drained
`,
          'protocol.py'
        ),
      ],
      questions: [
        [
          'What does a `for` loop actually call, in order?',
          [
            'It indexes the sequence by 0, 1, 2, ... until it goes out of bounds',
            'It calls `iter()` once to get an iterator, then `next()` repeatedly until `StopIteration`',
            'It compiles the loop into a C-level `for` instruction that bypasses Python objects',
            'It converts the sequence to a list and then walks the list',
          ],
          1,
          'The loop asks the object for an iterator, then pulls one item at a time from that iterator. The loop ends when `next` raises `StopIteration`, which the `for` statement catches silently. That is why `for` works on generators, files and your own classes, none of which support indexing.',
        ],
        [
          'What is the main advantage of `for i, x in enumerate(xs)` over `for i in range(len(xs))`?',
          [
            'It is faster, because the list is not indexed',
            'The index is supplied by the iterator as items are produced, so it cannot drift out of step with the values',
            'It also works on sets, which are not indexable',
            'It allows the loop variable to be modified without affecting the list',
          ],
          1,
          'enumerate counts the items the iterator actually yields, so the index is always the position of the value you are holding. The range(len()) form computes an index and then looks the value up separately, which is exactly where off-by-one and skip bugs come from. It does not work on sets, because sets are not indexable and have no length.',
        ],
        [
          'With `a = [1, 2, 3]` and `b = [10, 20]`, what does `list(zip(a, b, strict=True))` do?',
          [
            'Returns `[(1, 10), (2, 20), (3, None)]`',
            'Returns `[(1, 10), (2, 20)]`, silently dropping the 3',
            'Raises `ValueError` because the iterables have different lengths',
            'Returns `[(1, 10), (2, 20), (3, 0)]`',
          ],
          2,
          'Without `strict`, zip stops at the shortest iterable and the extra item disappears without a word — which is how real data loss happens. `strict=True`, added in 3.10, raises `ValueError` the moment the lengths disagree, so the bug surfaces at the line that caused it.',
        ],
        [
          'After a `for` loop finishes, what is the state of the loop variable?',
          [
            'It is unbound, because the loop created its own scope',
            'It still holds the value from the final iteration',
            'It holds the number of iterations as an integer',
            'It is set to `None`',
          ],
          1,
          'Python has no block scope, so a `for` does not create a namespace. The loop variable is an ordinary name that survives the loop with its last value. Inside a function it is a local; at module level it is a global. Either way it is still there, which is why reading it after the loop is a real source of wrong answers.',
        ],
      ],
    },
    {
      title: 'while, and loop control',
      summary: 'When a while is genuinely the right loop, how to write a loop that always terminates, and what break, continue, else and pass actually do.',
      duration: 15,
      build: (b) => [
        b.md(`## \`while\` repeats until you say stop

\`\`\`python
count = 0
while count < 3:
    print(count)
    count += 1
# 0 1 2
\`\`\`

That is the entire loop: evaluate a condition, run the body, go back. Three things follow from that, and they are all consequences of the same design.

**The condition is tested before the first pass, not after.** A \`for\` loop over an empty sequence runs its body zero times. A \`while\` loop with a false condition also runs zero times — but if the condition starts true, the body runs at least once. That is the one semantic difference that matters.

**Nothing forces termination.** The language will not notice a loop that never ends; it will just hang, or fill memory, until you interrupt it. A correct \`while\` has a variable in the condition, and the body moves that variable toward the exit.

**The body must change the condition.** A \`while\` whose body does not touch any variable in its condition is an infinite loop. This is the most common bug in the language and it produces no error, just a frozen program:

\`\`\`python
# Infinite. n never changes, so n < 5 is true forever.
n = 0
while n < 5:
    print(n)
    # forgot n += 1

# Fixed: the counter is updated on every path through the body
n = 0
while n < 5:
    print(n)
    n += 1
\`\`\`

### \`while\` or \`for\`?

Use \`for\` when you are walking a known sequence — the loop ends when the data ends, and you cannot get that wrong. Use \`while\` when the number of repetitions genuinely is not known in advance, because the stopping condition is something other than "the data ran out":

| Situation | Use | Because |
| --- | --- | --- |
| Print each name in a list | \`for\` | The sequence knows its own length |
| Sum the numbers in a file | \`for\` | Each line is one item, until the file ends |
| Retry an operation until it succeeds | \`while\` | The count depends on a network, not on the data |
| Play a game until the player quits | \`while\` | The state is a human decision |
| Search until a value is found | \`while\` | The index runs past the end, and you must check that yourself |
| Validate input until it parses | \`while\` | The loop count is unknown until the user succeeds |
| Print the numbers 1 to 10 | \`for\` over \`range\` | A \`while\` here needs a counter you wrote for nothing |

The test is short: **if you could write it as \`for x in something\`, do that.** \`for\` gets the termination and the iteration right for you. Reach for \`while\` only when the thing you are looping over does not exist as a sequence — a condition, a queue that is being drained, a retry budget.

### There is no \`do...while\`

C's \`do...while\` runs the body at least once. Python has no such loop, and you do not need one: put the "at least once" part before the loop.

\`\`\`python
# C-style do-while, in Python
n = int(input("Enter a number: "))
while n <= 0:
    print("must be positive")
    n = int(input("Enter a number: "))

# The idiomatic form: read once, then loop only if it was wrong
while True:
    n = int(input("Enter a number: "))
    if n > 0:
        break
    print("must be positive")
\`\`\`

The second version is better than the first for a reason that has nothing to do with line count: it puts the exit condition and the exit in the same two lines, so you can see the loop terminate without tracing the variable backwards.

### \`while True\` is a legitimate loop

A conditionless loop with an explicit \`break\` is a normal, readable shape, especially when the exit can come from several places:

\`\`\`python
while True:
    line = input("> ")
    if not line:
        break
    command, _, argument = line.partition(" ")
    if command == "quit":
        break
    if command == "add":
        items.append(argument)
    else:
        print(f"unknown command: {command}")
\`\`\`

The rule that makes this safe: **every path through the body must reach a \`break\`.** If a \`continue\` or a \`return\` can skip the \`break\`, the loop runs forever, and nothing will tell you.

## The four control keywords

\`\`\`python
for n in range(10):
    if n == 3:
        continue        # skip the rest of THIS pass, go to the next one
    if n == 7:
        break           # leave the loop entirely
    print(n)
# 0 1 2 4 5 6

for n in range(3):
    print(n)
else:
    print("ran to completion")   # only if no break
\`\`\`

| Keyword | Scope of effect | Skips the rest of the body? | Ends the loop? | Runs the loop \`else\`? |
| --- | --- | --- | --- | --- |
| \`break\` | innermost loop | yes | **yes** | no |
| \`continue\` | innermost loop | yes | no | only if the loop later ends naturally |
| \`else\` on a loop | the loop it is attached to | — | — | runs when the loop ends without a \`break\` |
| \`pass\` | nothing — it is a statement | no | no | no |
| \`return\` | the whole function | yes | yes, and the function | n/a — the loop \`else\` is not reached |

The rules in words:

- \`break\` exits the **innermost** loop. Not the function, not the outer loop. There is no labelled break in Python and there will not be one.
- \`continue\` goes to the next iteration. In a \`while\`, that means the condition is re-evaluated; in a \`for\`, the next item is fetched.
- \`pass\` does nothing. It exists to make an empty block legal — \`if x: pass\` is a deliberate no-op, and using it as filler to "hold the place" for a body you have not written yet is a smell.
- \`while...else\` / \`for...else\` runs the \`else\` only when the loop finished **naturally**: the iterable was exhausted, or the condition went false, with no \`break\`. It is not Python's C-style "switch" and it does not run after \`continue\`.

### Why the \`else\` exists

It answers the question the \`break\` raises: *did we finish the whole thing, or did we leave early?* For a search, that is the whole point.

\`\`\`python
# Explicit flag: readable, but a flag you have to remember to set
found = False
for i, item in enumerate(items):
    if item == target:
        found = True
        break
if found:
    print("found it")

# any(): the same question, asked as a generator
if any(item == target for item in items):
    print("found it")

# while-else, when you need the index
i = 0
while i < len(items):
    if items[i] == target:
        print(f"found it at {i}")
        break
    i += 1
else:
    print("not found")
\`\`\`

For "does at least one element satisfy this", a generator expression with \`any()\` or \`all()\` beats every flag version. It has no state to forget, it short-circuits on the first match, and it reads as a sentence. Save the flag for when you need a value from inside the loop that a boolean cannot express.

### Leaving two loops at once

\`break\` only ever leaves one loop, so a search in a grid needs something more:

\`\`\`python
# BEST: a function, and return leaves every loop at once
def find(grid, target):
    for r, row in enumerate(grid):
        for c, value in enumerate(row):
            if value == target:
                return r, c
    return None

# WORKS: a flag, checked by the outer loop
found = None
for row in grid:
    for value in row:
        if value == target:
            found = value
            break
    if found is not None:
        break

# WORKS: the else clause removes the flag entirely
found = None
for row in grid:
    for value in row:
        if value == target:
            found = value
            break
    else:
        continue          # no break in the inner loop, keep going
    break                  # we broke the inner loop, now leave the outer one
\`\`\`

The \`else\`/\`continue\` pairing in the last version is idiomatic and widely used, and it is also the version a newcomer is least likely to read correctly. **Use the function.** It has a name, it can be tested on its own, and its return value does not need a flag to carry it out.

### Common loop traps

| Trap | Symptom | Fix |
| --- | --- | --- |
| Body never moves the condition | Program hangs | Update the loop variable on every path, including after \`continue\` |
| \`n++\` instead of \`n += 1\` | \`SyntaxError\` | Python has no \`++\` or \`--\`; it has \`+= 1\` |
| \`continue\` before the counter update | Infinite loop | Put the update first, or use \`continue\` only after it |
| \`break\` inside \`if\`, expected to exit the function | Only one loop exits | Move the logic into a function and \`return\` |
| \`while x\` where \`x\` should be a number | Loop runs zero times if \`x == 0\` | Test \`while x != 0\`, and prefer \`for\` |
| \`else\` assumed to always run | Never runs | It is skipped by \`break\`; that is the point |
| \`pass\` used as placeholder | Silent no-op bugs later | \`pass\` means "deliberately nothing"; do not use it to defer writing code |

The rule that catches most of them: **if a \`while\` loop cannot be proven to terminate by reading the body, rewrite it as a \`for\`.** Every \`for\` loop terminates, because the iterable is finite or you are consuming something that ends.`),
        b.anim('trace', {
          title: 'A while loop, with continue skipping the rest of a pass',
          badge: 'while + continue',
          code: `n = 6
total = 0
count = 0
while n > 0:
    count += 1
    if n % 3:
        n -= 1
        continue
    total += n
    n -= 1
print(count, total)`,
          steps: [
            {
              caption: 'Initial state: n = 6, total = 0, count = 0',
              note: 'The condition is checked before the body, so the loop is a precondition loop, not a postcondition one. If n had started at 0 or below, the body would never run at all.',
              line: 1,
              vars: [
                { name: 'n', value: '6', tone: 'int' },
                { name: 'total', value: '0', tone: 'int' },
                { name: 'count', value: '0', tone: 'int' },
              ],
              output: '',
            },
            {
              caption: 'Pass 1 — n > 0 is true, so the body runs',
              note: 'count += 1 brings the pass counter to 1. The body has already done something that the condition depends on, which is what keeps the loop finite.',
              line: 4,
              vars: [
                { name: 'n', value: '6', tone: 'int' },
                { name: 'count', value: '1', tone: 'int' },
              ],
            },
            {
              caption: 'n % 3 is 0, which is falsy — no continue',
              note: 'This is the branch that matters. `n % 3` is the integer remainder, and 0 is falsy, so the `if` body is skipped and execution falls straight through to the addition.',
              line: 5,
              vars: [
                { name: 'n', value: '6', tone: 'int' },
                { name: 'n % 3', value: '0', tone: 'warn' },
                { name: 'count', value: '1', tone: 'int' },
              ],
            },
            {
              caption: 'total += n, then n -= 1',
              note: '6 is divisible by 3, so it is added. The decrement happens after, and it happens on this path only — which is precisely why a `continue` placed above it would loop forever.',
              line: 7,
              vars: [
                { name: 'total', value: '6', tone: 'int' },
                { name: 'n', value: '5', tone: 'int' },
                { name: 'count', value: '1', tone: 'int' },
              ],
            },
            {
              caption: 'Back to the condition: 5 > 0 is true',
              note: 'A while loop re-evaluates its condition after every pass, including passes that ended in `continue`. There is no cached result and no special case for continue.',
              line: 3,
              vars: [
                { name: 'n', value: '5', tone: 'int' },
                { name: 'total', value: '6', tone: 'int' },
                { name: 'count', value: '1', tone: 'int' },
              ],
            },
            {
              caption: 'Pass 2 — count = 2, and 5 % 3 is 2, which is truthy',
              note: '5 is not divisible by 3, so the `if` body runs. n is decremented, then `continue` abandons the rest of the body: `total += n` never happens for this value.',
              line: 6,
              vars: [
                { name: 'n', value: '4', tone: 'int' },
                { name: 'total', value: '6', tone: 'int' },
                { name: 'count', value: '2', tone: 'int' },
              ],
            },
            {
              caption: 'Pass 4 adds the next multiple of 3',
              note: 'n = 3 is divisible by 3, so it is added. The running total only ever receives the values that survive the continue filter — that is what the filter is for.',
              line: 7,
              vars: [
                { name: 'total', value: '9', tone: 'int' },
                { name: 'n', value: '2', tone: 'int' },
                { name: 'count', value: '4', tone: 'int' },
              ],
            },
            {
              caption: 'Pass 6 — the final one, again filtered out by continue',
              note: 'n = 1 is not divisible by 3, so it is skipped. Note that n is still decremented: the counter update is before the continue, which is the only reason this loop terminates.',
              line: 6,
              vars: [
                { name: 'n', value: '0', tone: 'int' },
                { name: 'total', value: '9', tone: 'int' },
                { name: 'count', value: '6', tone: 'int' },
              ],
            },
            {
              caption: 'n > 0 is now false — the loop ends',
              note: 'Six passes, not seven. The loop did not decide to stop after six iterations; it re-ran the condition and the condition said no. That is the only way a while loop ever ends.',
              line: 3,
              vars: [
                { name: 'n', value: '0', tone: 'warn' },
                { name: 'total', value: '9', tone: 'int' },
                { name: 'count', value: '6', tone: 'int' },
              ],
            },
            {
              caption: 'The loop is over, and the variables survive it',
              note: 'count is 6 — the number of passes, including the ones continue skipped. total is 9 — 6 + 3, the multiples of 3 up to 6. No block scope, so all three names are still readable here.',
              line: 9,
              vars: [
                { name: 'count', value: '6', tone: 'ok' },
                { name: 'total', value: '9', tone: 'ok' },
              ],
              output: '6 9',
            },
          ],
        }),
        b.diagram(
          'How the four control keywords change the flow',
          `flowchart TD
    S["body of the loop"] --> C{"continue?"}
    C -->|"yes"| R{"While or for?"}
    C -->|"no"| D{"Is there code after the<br/>if in the body?"}
    D -->|"yes"| S
    D -->|"no"| B{"break?"}
    B -->|"no"| E{"Loop else clause?"}
    E -->|"else runs only when the<br/>loop ended naturally"| R
    B -->|"yes"| X["Leave the innermost loop<br/>immediately — the else<br/>clause is skipped"]
    R -->|"while: re-test the condition"| T{"Condition still true?"}
    R -->|"for: fetch the next item"| F{"Another item available?"}
    T -->|"yes"| S
    T -->|"no"| Z["Loop ends naturally"]
    F -->|"yes"| S
    F -->|"no — StopIteration"| Z`
        ),
        b.table(
          'Loop control keywords side by side',
          ['Keyword', 'Where it can appear', 'Effect', 'Common misuse'],
          [
            ['`break`', 'inside a loop', 'Leaves the innermost loop at once', 'Believing it exits the function, or the outer of two nested loops'],
            ['`continue`', 'inside a loop', 'Skips the rest of this pass, starts the next one', 'Placed above the counter update, which makes the loop infinite'],
            ['`for ... else` / `while ... else`', 'after the loop body', 'Runs only if the loop ended without a `break`', 'Assuming it is a switch-style `else`, so it appears to run every time'],
            ['`pass`', 'anywhere a statement is required', 'Does nothing; makes an empty block legal', 'Used as a placeholder for a body you have not written yet'],
            ['`return`', 'inside a function, even inside loops', 'Exits the function, leaving every enclosing loop', 'None — but remember it means no loop `else` either'],
            ['`n++` / `n--`', 'nowhere — a SyntaxError', 'Python has no increment operators', 'Carried over from C or Java; write `n += 1`'],
            ['`do ... while`', 'nowhere — no such statement', 'Python tests the condition first, always', 'Reaching for it to guarantee one pass; put the first pass before the loop'],
          ]
        ),
        b.code(
          `# while_basics.py — the shape, and how it terminates
count = 0
while count < 3:
    print(count)
    count += 1
# 0 1 2

# The condition is tested BEFORE the body, so a false start runs zero times
n = 0
while n > 5:
    print("never printed")
    n += 1

# THE classic bug: the body never moves the condition
# Uncomment this and the program hangs forever - no error, no message.
# i = 0
# while i < 5:
#     print(i)
#     # i += 1   <- forgotten

# A while loop that walks a sequence manually needs its own bounds check
items = ["a", "b", "c"]
i = 0
while i < len(items):
    print(i, items[i])
    i += 1
# ... which is exactly what this does, correctly, with no bounds check to forget
for i, item in enumerate(items):
    print(i, item)

# There is no do-while; put the first pass before the loop
def ask_positive(prompt):
    while True:
        n = int(input(prompt))
        if n > 0:
            return n            # returning leaves the loop and the function
        print("must be positive")

# while True is fine when every path reaches a break
def read_commands():
    items = []
    while True:
        line = input("> ")
        if not line:
            break               # empty line ends input
        command, _, argument = line.partition(" ")
        if command == "quit":
            break               # and so does an explicit command
        if command == "add":
            items.append(argument)
        else:
            print(f"unknown command: {command}")
    return items
`,
          'while_basics.py'
        ),
        b.warn(
          'A `while` loop cannot prove it terminates. A `for` loop already has.',
          'Nothing in Python stops a `while` loop from running forever, and the failure is a frozen program rather than an exception, so it is easy to ship. The rule that prevents it: if the loop could be written as `for x in something`, write it that way. Reserve `while` for the cases where the number of passes genuinely depends on something outside the program — a reply, a network response, a budget.',
        ),
        b.code(
          `# control.py — break, continue, else, and leaving nested loops
# continue: skip this pass only
for n in range(10):
    if n % 2:
        continue
    if n > 6:
        break
    print(n)
# 0 2 4 6

# The loop else: runs ONLY when no break happened
for n in range(3):
    print(n)
else:
    print("finished without a break")
# 0 1 2 finished without a break

for n in range(3):
    if n == 1:
        break
else:
    print("unreachable - we broke out")

# Asking "did we finish or leave early" without a flag
def contains(items, target):
    return any(item == target for item in items)

def all_positive(values):
    return all(v > 0 for v in values)

# when you need the index, the while-else says it directly
def index_of(items, target):
    i = 0
    while i < len(items):
        if items[i] == target:
            return i             # clearer than break plus else
        i += 1
    return None

# Breaking out of two loops: return leaves all of them
def find(grid, target):
    for r, row in enumerate(grid):
        for c, value in enumerate(row):
            if value == target:
                return r, c     # pops out of the inner AND the outer loop
    return None


grid = [[1, 2], [3, 4], [5, 6]]
target = 4

# Without a function you need a flag...
found = None
for row in grid:
    for value in row:
        if value == target:
            found = value
            break
    if found is not None:
        break

# ...or the else/continue pairing, which removes the flag
found = None
for row in grid:
    for value in row:
        if value == target:
            found = value
            break
    else:
        continue                # inner loop found nothing - keep scanning
    break                       # inner loop found it - now leave the outer one

# pass means "deliberately nothing", not "write this later"
def not_implemented_yet():
    pass                        # a real, intentional no-op
`,
          'control.py'
        ),
        b.checklist('Loop review', [
          'Can you point at the line that makes this `while` loop terminate, and does it run on every path?',
          'Would this loop be clearer as `for x in ...`? If yes, change it.',
          'Is any `continue` placed above the update of the loop variable?',
          'Does every `while True` path reach a `break` or a `return`?',
          'Is a nested search using `break` where you meant to leave both loops — and is a function the cleaner fix?',
          'Is a loop `else` used where the intent was "runs unconditionally"? That means it should be unindented.',
          'Is `n++` used instead of `n += 1`?',
          'Could an `any()` or `all()` expression replace a manual flag?',
        ]),
      ],
      questions: [
        [
          'A `while` loop runs exactly as long as its condition is true. What must be true of the body?',
          [
            'It must be empty, so the condition cannot change',
            'It must eventually make the condition false, on every path through the body',
            'It must contain at least one `print` so you can see progress',
            'It must call `break` on the final iteration',
          ],
          1,
          'The body is what changes the state the condition reads. If any path through the body — including one reached via `continue` — leaves the condition true forever, the loop never ends, and Python reports no error. Putting the counter update before any `continue` is the common way to get this right.',
        ],
        [
          'What does the `else` clause of a `for` or `while` loop do?',
          [
            'It runs after the loop finishes normally, and is skipped if a `break` executed',
            'It runs only when the loop runs zero times',
            'It is another way to write a condition, equivalent to `elif`',
            'It runs when the loop body raises an exception',
          ],
          0,
          'The loop `else` is not Python\'s C-style switch. It runs when the loop ends naturally — the iterable was exhausted, or the condition went false — and it is skipped entirely if a `break` left early. Its purpose is to answer "did we finish the whole thing?", which is why it pairs with a break in search loops.',
        ],
        [
          'Inside two nested loops, you want to stop searching as soon as you find a match. What is the clearest way?',
          [
            'Use `break 2`, which breaks out of both loops at once',
            'Put a flag variable before the outer loop and check it after the inner loop',
            'Move the search into a function and `return` the moment you find the match',
            'Use `continue` in the inner loop and `break` in the outer loop',
          ],
          2,
          'There is no labelled break in Python, and `break` only ever leaves the innermost loop. The flag and the `else`/`continue` pairing both work, but a function is clearer: `return` leaves every enclosing loop, the search gets a name, and it can be tested on its own. It also needs no state carried out of the loop.',
        ],
        [
          'Which statement about `continue` is correct?',
          [
            'It skips the rest of the current pass and starts the next one; in a `while` the condition is re-tested',
            'It ends the loop, exactly like `break`, but returns a value',
            'It skips the rest of the loop entirely, including all remaining iterations',
            'It is not allowed inside a `while` loop',
          ],
          0,
          '`continue` abandons the remainder of the current pass and moves to the next iteration. For a `for` loop that means fetching the next item; for a `while` loop it means re-evaluating the condition, which is why a `continue` placed above the update of the loop variable causes an infinite loop.',
        ],
      ],
    },
  ]
);
