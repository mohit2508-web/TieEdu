// Module 8 — Functions.
//
// This is the heart of the language. Everything before it was data and control
// flow inside one scope; everything after it assumes you can name a block of
// behaviour, pass it around, capture state inside it, and call it safely.
//
// The order is deliberate: call mechanics first, then the stack, then scope,
// then the argument-passing system. Recursion sits before closures because a
// call frame — the thing recursion exhausts — is also the thing a closure
// captures, and teaching them in the other order leaves both half-explained.

import { mod } from '../blocks';

export const M8 = mod(
  'crs-python-programming',
  'py-m8',
  8,
  'Module 8 — Functions',
  'Define behaviour, call it, recurse with it, close over it, and hand it arguments without surprises.',
  [
    /* ====================================================================== */
    /* 1. Defining and calling                                                */
    /* ====================================================================== */
    {
      title: 'Defining and calling functions',
      summary: 'def, the docstring, what return actually does, tuples, default arguments, keyword arguments and type hints.',
      duration: 16,
      build: (b) => [
        b.md(`## A function is a name bound to a behaviour

\`def\` does two things. At the moment the \`def\` statement runs it **creates a function object** and **binds it to the name after it**. Calling that name runs the body. Everything else in this module is a consequence of that one sentence — including the fact that a function can be stored in a list, passed as an argument, returned from another function, and bound to two names at once.

There is no declaration, no signature file, and no header. The \`def\` line *is* the interface.

\`\`\`python
def celsius_to_fahrenheit(celsius):
    """Convert a temperature in Celsius to Fahrenheit."""
    return celsius * 9 / 5 + 32


print(celsius_to_fahrenheit(21.5))
\`\`\`

\`\`\`text
70.7
\`\`\`

## The docstring is not decoration

A string as the very first statement in a function body is not a statement at all — it is *documentation*, and it is attached to the function object.

\`\`\`python
>>> help(celsius_to_fahrenheit)
Help on function celsius_to_fahrenheit in module __main__:

celsius_to_fahrenheit(celsius)
    Convert a temperature in Celsius to Fahrenheit.
\`\`\`

Three rules that are enforced by convention, tooling and review:

- The summary is a **complete sentence** ending in a period and starting with a verb: \`Return the mean of values.\`
- The summary is **one line** and says what the function does or returns, not what it is.
- Anything longer goes in the lines after the summary, and arguments are documented by name.

Write the docstring when the function is written. Reconstructing intent from a body is archaeology, and archaeology is how a function called \`process\` ends up with a two-paragraph comment explaining what it used to do.

## return versus falling off the end

This is the single most important behaviour in the lesson, and it produces a great many bugs.

A function returns a value only if it **executes a \`return\` with a value**. If control reaches the bottom of the body, the function returns \`None\`. Not zero, not an empty string, not the last expression it evaluated — \`None\`.

\`\`\`python
def find_index(items, target):
    for i, item in enumerate(items):
        if item == target:
            return i          # returns as soon as the match is found
    # falls off the end here


print(find_index(["a", "b", "c"], "b"))   # 1
print(find_index(["a", "b", "c"], "z"))   # None
\`\`\`

Why anyone should care: every other language in your head does the same thing, and every beginner Python programmer has written this by accident.

\`\`\`python
def mean(values):
    total = sum(values)
    # forgot the return


m = mean([2, 4, 6])
print(f"{m:.2f}")     # TypeError: unsupported format string passed to NoneType
\`\`\`

Two debugging reflexes that follow directly:

- \`print(f"{m:.2f}")\` printing \`None\` means **the function returned \`None\`**. Look for a missing or mis-indented \`return\`, not for a formatting bug.
- \`if not result:\` on a function that legitimately returns \`0\`, \`""\`, \`[]\` or \`0.0\` is a bug, because all four are falsy. Test \`if result is None:\` instead. That is why \`is\` exists as a separate operator from \`==\`.`),
        b.anim('trace', {
          title: 'Tracing one call, from the def to the printed line',
          badge: 'single step',
          code: `def mean(values, total=0.0):
    """Return the arithmetic mean of values."""
    total = total + sum(values)
    return total / len(values)


result = mean([2, 4, 6, 8])
print(f"mean is {result}")`,
          steps: [
            {
              caption: 'The def runs and creates a function object',
              note: 'Nothing has been called yet. The name mean now points at a function object whose body has not executed a single line. The default total=0.0 was created right here, once.',
              line: 1,
              vars: [{ name: 'mean', value: '<function mean>', tone: 'code' }],
            },
            {
              caption: 'The call: the list literal is built first',
              note: 'The right-hand side of an assignment is fully evaluated before the name is bound. So [2, 4, 6, 8] is constructed, mean is looked up, and only then is the call made.',
              line: 7,
              vars: [
                { name: 'mean', value: '<function mean>', tone: 'code' },
                { name: 'result', value: '(not bound yet)', tone: 'pad' },
              ],
            },
            {
              caption: 'Inside mean: values is bound to the caller list',
              note: 'A new frame is created and the one argument is bound to values. total gets no argument, so it takes the default object created at def time — the same 0.0 float every call sees.',
              line: 3,
              vars: [
                { name: 'mean', value: '<function mean>', tone: 'code' },
                { name: 'values', value: '[2, 4, 6, 8]', tone: 'auto' },
                { name: 'total', value: '0.0', tone: 'float' },
              ],
            },
            {
              caption: 'sum(values) is 20, and total becomes 20.0',
              note: 'The left-hand name is only rebound after the whole right-hand expression has finished. Had sum() raised, total would still be 0.0.',
              line: 3,
              vars: [
                { name: 'mean', value: '<function mean>', tone: 'code' },
                { name: 'values', value: '[2, 4, 6, 8]', tone: 'auto' },
                { name: 'total', value: '20.0', tone: 'float' },
              ],
            },
            {
              caption: 'return 20.0 / 4',
              note: 'The expression is evaluated, the frame is destroyed, and the single value 5.0 is handed back to the caller. The frame, including values and total, stops existing here.',
              line: 4,
              vars: [{ name: 'mean', value: '<function mean>', tone: 'code' }],
            },
            {
              caption: 'The caller resumes and binds result',
              note: 'Control comes back to line 7, where the assignment finally happens. The callee frame is already gone; only the value survived.',
              line: 7,
              vars: [
                { name: 'mean', value: '<function mean>', tone: 'code' },
                { name: 'result', value: '5.0', tone: 'ok' },
              ],
            },
            {
              caption: 'The f-string is formatted and printed',
              note: '5.0 is a float, so the default str() gives 5.0 rather than 5. Format it explicitly with :.2f when the value is meant to read as 5.00.',
              line: 8,
              vars: [
                { name: 'mean', value: '<function mean>', tone: 'code' },
                { name: 'result', value: '5.0', tone: 'ok' },
              ],
              output: 'mean is 5.0',
            },
          ],
        }),
        b.lead('Returning more than one value'),
        b.md(`Python has no multiple return. What it has is the comma operator, which builds a **tuple**, and a tuple is a perfectly good single return value.

\`\`\`python
def min_max(values):
    """Return the smallest and largest values as a tuple."""
    return min(values), max(values)


lo, hi = min_max([14, 3, 27, 8])
print(lo, hi)            # 3 27
print(min_max([14, 3]))  # (3, 14) — the tuple itself
\`\`\`

Unpacking \`lo, hi = ...\` works because tuple unpacking is just iteration over the result. That gives you the one behaviour worth knowing: **the number of names on the left must match the tuple length exactly**.

\`\`\`python
lo, hi, extra = min_max([14, 3])
# ValueError: not enough values to unpack (expected 3, got 2)
\`\`\`

For anything longer than two or three values a \`dict\` or a small class is kinder. Positional unpacking of four values out of a call is a bug waiting for the next person who reorders the \`return\`.`),
        b.code(`def stats(values):
    """Return min, max, mean and median for a non-empty sequence."""
    ordered = sorted(values)
    n = len(ordered)
    mid = n // 2
    median = (
        ordered[mid]
        if n % 2
        else (ordered[mid - 1] + ordered[mid]) / 2
    )
    return {
        "min": ordered[0],
        "max": ordered[-1],
        "mean": sum(ordered) / n,
        "median": median,
    }


print(stats([7, 1, 9, 3, 5]))
# {'min': 1, 'max': 9, 'mean': 5.0, 'median': 5}`, 'stats.py'),
        b.lead('Default arguments and the trap that catches everyone'),
        b.md(`A parameter may have a default. Two rules follow from how Python implements it, and one of them bites hard.

**Rule 1: the default expression is evaluated exactly once**, when the \`def\` statement executes. It is not re-evaluated per call. For an immutable default (a number, a string, \`None\`) this is invisible. For a mutable default it is a real, reproducible bug:

\`\`\`python
def remember(item, history=[]):     # BUG: one list, created once
    history.append(item)
    return history


print(remember("a"))   # ['a']
print(remember("b"))   # ['a', 'b']   <- 'a' came back from an earlier call
print(remember.__defaults__)          # (['a', 'b'],)
\`\`\`

The default list was built when the \`def\` ran, stored in the function object, and every call has been mutating the same object. The fix is \`None\` as the default plus a guard:

\`\`\`python
def remember(item, history=None):
    if history is None:
        history = []
    history.append(item)
    return history


print(remember("a"))   # ['a']
print(remember("b"))   # ['b']
\`\`\`

**Rule 2: defaults bind names, not values at call time.** A default that references a module-level name is resolved when the \`def\` runs, so later changes to that module-level name are invisible to the function. That is exactly why \`def f(x=[])\` is unsafe and \`def f(x=SENTINEL)\` is not: a sentinel object can never be confused with a legitimate value, whereas \`None\` occasionally can.

The honest summary: **use a default only for a value that is constant for the lifetime of the program.**`),
        b.code(`# The bug, and what is actually stored on the function object.
def collect(name, tags=[]):
    tags.append(name)
    return tags


print(collect("api"))            # ['api']
print(collect("worker"))         # ['api', 'worker']  <- not what you wanted
print(collect.__defaults__)      # (['api', 'worker'],)

# The fix.
def collect_fixed(name, tags=None):
    if tags is None:
        tags = []
    tags.append(name)
    return tags


print(collect_fixed("api"))      # ['api']
print(collect_fixed("worker"))   # ['worker']`, 'defaults.py'),
        b.lead('Keyword arguments'),
        b.md(`Every parameter can be passed by name, in any order. This is not sugar — it is the reason Python function signatures stay readable at eleven parameters.

\`\`\`python
def connect(host, port=5432, *, timeout=5.0, retries=3, ssl=True):
    return f"{host}:{port} timeout={timeout} retries={retries} ssl={ssl}"


print(connect("db.internal"))
# db.internal:5432 timeout=5.0 retries=3 ssl=True

print(connect("db.internal", ssl=False, retries=1, port=6543))
# db.internal:6543 timeout=5.0 retries=1 ssl=False
\`\`\`

The bare \`*\` means **everything after this point is keyword-only**. It costs nothing at runtime and buys you a signature that cannot be broken by someone passing positional arguments in the wrong order. Standard library signatures are written this way for exactly that reason — \`functools.reduce(function, iterable, *, initializer=None)\` is the canonical example.

Two rules about mixing:

- Positional and keyword arguments may be mixed, but **the keyword ones must come after all the positional ones**. \`connect("db", ssl=False, 6543)\` is a \`SyntaxError\`.
- A parameter with a default may still be given by name even when positionally you could have skipped it. That is the entire value of the feature.`),
        b.lead('Type hints: documentation that a separate tool can check'),
        b.md(`An annotation is a promise to the *reader* and to a *checker*, not to the interpreter. The interpreter stores the annotation objects in \`func.__annotations__\` and otherwise ignores them completely.

\`\`\`python
def mean(values: list[float]) -> float:
    return sum(values) / len(values)


print(mean([2, 4, 6]))       # 4.0
print(mean(["a", "b"]))      # TypeError: unsupported operand type(s) for +: 'int' and 'str'
\`\`\`

The second line proves the point: Python ran \`sum\` on a list of strings, exactly as it would have with no annotation anywhere. The traceback is a runtime \`TypeError\` from \`sum\`, not a static complaint from \`mean\`.

So what do annotations buy you?

- **In the code**: they are checked by \`mypy\`, \`pyright\` or your IDE, and they are what every library you use publishes so its API is discoverable at all.
- **At runtime**: \`typing.get_type_hints\` can read them, and frameworks such as FastAPI, Pydantic and \`dataclasses\` use them to validate input or generate schemas.
- **Never**: they do not coerce, they do not check, and they do not make a program safer on their own.

Annotate function boundaries — parameters and the return value — and annotate a local variable only when it genuinely adds information. Annotating every \`i\` in a loop is noise, and noise in a signature is what makes people skip reading signatures.`),
        b.info(
          'What annotations do not do',
          'They do not convert, they do not validate, and they are not enforced. `def f(x: int)` called as `f("hello")` runs, and the type error appears wherever the value is first used — usually far from the call. A tool like mypy is what turns them into a real check, and running it in CI is what keeps the promises honest.'
        ),
        b.lead('Functions are objects'),
        b.md(`\`def\` produces an object. That is not a quirk; it is the design. A function can be stored, compared, passed, returned, and put in a container, and every one of those is a place a decorator, a test double or a plugin hook can reach.

\`\`\`python
def square(x):
    """Return x squared."""
    return x * x


operations = {"square": square, "double": lambda x: 2 * x}
print(operations["square"](7))          # 49
print(sorted(operations))               # ['double', 'square']

funcs = [len, sum, max]
print(funcs[0]([1, 2, 3]))              # 3


# Higher-order: a function that takes a function.
def apply_twice(fn, value):
    return fn(fn(value))


print(apply_twice(square, 3))           # 81
print(square.__name__)                 # 'square'
print(square.__doc__)                  # 'Return x squared.'
\`\`\`

The last two lines matter more than they look. \`__name__\` is what a traceback prints and what a debugger shows; \`__doc__\` is what \`help()\` shows. Keeping them correct is a courtesy to whoever debugs your code at 2am, and it is free.`),
        b.code(`import functools


def square(x: int) -> int:
    """Return x squared."""
    return x * x


# A function is a value: it can be passed, returned, and stored.
def repeat(times: int):
    """Return a decorator that applies a function N times."""
    def decorate(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            result = fn(*args, **kwargs)
            for _ in range(times - 1):
                result = fn(result)
            return result
        return wrapper
    return decorate


triple_square = repeat(3)(square)
print(triple_square(2))         # 2 -> 4 -> 16 -> 256
print(triple_square.__name__)   # 'square' — functools.wraps copied it across`, 'first_class.py'),
        b.tip(
          'A rule of thumb for a good function',
          'One reason to exist. If the docstring needs the word "and" to describe what it does, it is two functions. A function that fits on one screen, takes its inputs as parameters, and returns a value is trivially testable; a function that reads files, prints, and mutates three globals is not testable at all, no matter how good it looks.'
        ),
        b.warn(
          'Two habits worth breaking today',
          'First: a function that both computes and prints. Printing makes it impossible to reuse and impossible to test — return the value and let the caller decide. Second: a function longer than about 30 lines. Long functions are almost always several functions that were never separated, and the seams are usually the blank lines.'
        ),
      ],
      questions: [
        [
          'A function body reaches its last line without executing a `return`. What does the call expression evaluate to?',
          ['`None`', 'The value of the last expression evaluated in the body', 'An empty tuple `()`', 'The value of the first parameter'],
          0,
          'Python has one return convention: no value returned means `None`. That is why `print(f"{result:.2f}")` on a missing-return function raises a TypeError about formatting NoneType — the bug is the missing return, not the format spec.',
        ],
        [
          'In `def greet(name, greeting="hello"):`, how many times is the string "hello" evaluated?',
          ['Once, when the `def` statement executes', 'Once per call, before the body runs', 'Once per call that omits the argument', 'Every time the module is imported'],
          0,
          'Defaults are evaluated when the def statement runs and stored on the function object. A mutable default is therefore built exactly once and shared by every call, which is precisely why `def f(x=[])` is a bug.',
        ],
        [
          'What does the interpreter do with the annotations in `def f(x: int) -> int:`?',
          ['It converts x to an int on every call', 'It rejects any non-integer argument at call time', 'It stores them on the function object and takes no other action at runtime', 'It wraps the function in a runtime type-checking decorator'],
          2,
          'Annotations live in `f.__annotations__` and are used by mypy, pyright, IDEs and frameworks. Passing a string to f runs happily and fails later at whichever line actually uses the value.',
        ],
        [
          'A function does `return lo, hi`. What does the caller receive?',
          ['A two-element tuple, which unpacks with `a, b = f(...)`', 'A two-element list, indexed as f(...)[0] and f(...)[1]', 'A dict keyed by the names lo and hi', 'Two independent values, since Python supports multiple returns'],
          0,
          'The comma builds a tuple and that tuple is the single return value. Unpacking is iteration, so the name count must match the tuple length exactly — a mismatch is the usual cause of "not enough values to unpack".',
        ],
      ],
    },
    /* ====================================================================== */
    /* 2. Recursion and the call stack                                        */
    /* ====================================================================== */
    {
      title: 'Recursion and the call stack',
      summary: 'Base case, recursive case, what a frame holds, the 1000-frame limit, and why Fibonacci is the perfect demonstration.',
      duration: 19,
      build: (b) => [
        b.md(`## A recursive function is two things

Every correct recursive function is exactly two cases:

- The **base case**, which returns an answer directly. It must be reachable, and it must not recurse.
- The **recursive case**, which makes a call to the *same function* on a *smaller* problem, then combines that answer with something it can already do.

If you cannot state both, you do not have a recursive function yet — you have a loop with extra steps. Write the base case first, every time. It is the part that ends the process, and getting it wrong is why your function either never returns or crashes at depth 1000.

\`\`\`python
def fact(n: int) -> int:
    """Return n! for n >= 0, using recursion."""
    if n <= 1:                  # base case
        return 1
    return n * fact(n - 1)      # recursive case
\`\`\`

Two things about the recursive case that are not optional:

- The argument must be **smaller**, by a measure that guarantees the base case is reached. \`fact(n - 1)\` reaches \`n <= 1\` in at most n steps. \`fact(n + 1)\` never does.
- The call must be on the **same function**. A function that "sometimes recurses" through a different name is a function with a hidden missing base case.

## What a call frame holds

When you call a function, Python pushes a **frame**. A frame is the function's private world: its own copy of every parameter, every local variable, and where to resume when it returns. The frames stack up last-in-first-out, and that is where the term *call stack* comes from.

A frame holds:

- the **arguments**, bound to the parameter names;
- the **local variables**, including anything assigned anywhere in the body;
- the **instruction pointer**, so the return knows which line to resume on;
- references that keep objects alive for as long as the frame lives.

The consequence that makes recursion work at all: **the 4 in \`fact(4)\` lives in its own frame and cannot be disturbed by the 3 in \`fact(3)\` one level down.** If Python had one set of variables per function rather than per call, recursion would be impossible.

You can look at the real thing. This is supported API, and it is the fastest way to convince a sceptic:

\`\`\`python
import inspect


def show_stack():
    """Print the live call stack, innermost first."""
    frame = inspect.currentframe()
    depth = 0
    while frame is not None:
        print(f"{depth}: {frame.f_code.co_name} at line {frame.f_lineno}")
        frame = frame.f_back
        depth += 1
    print()


def outer():
    show_stack()


outer()
\`\`\`

\`\`\`text
0: show_stack at line 9
1: outer at line 16
2: <module> at line 19
\`\`\`

That \`while frame.f_back\` loop is the same last-in-first-out walk the interpreter performs on every call and every return. Everything below is that walk with better graphics.`),
        b.anim('callstack', {
          title: 'fact(5): five frames deep, then five frames back up',
          badge: 'the stack, live',
          steps: [
            {
              caption: 'Only the module frame exists. Nothing has been called yet.',
              note: 'The def statement created a function object; it did not push a frame. A frame is created by a call and destroyed by a return.',
              frames: [{ fn: '<module>', line: 'main.py:8', locals: ['fact = <function>', 'result = (unbound)'] }],
            },
            {
              caption: 'fact(5) is called. A second frame is pushed.',
              note: 'The new frame carries its own n = 5 and the line to resume on. The module frame is frozen exactly where it is; it will not move until this call returns.',
              frames: [
                { fn: '<module>', line: 'main.py:8', locals: ['fact = <function>'] },
                { fn: 'fact', args: 'n = 5', line: 'fact.py:5', locals: ['n = 5'] },
              ],
            },
            {
              caption: '5 > 1, so the recursive case runs: n * fact(n - 1)',
              note: 'The expression is half-evaluated and then suspended — the multiplication cannot happen until the inner call returns. The frame simply waits. This waiting is the entire reason a recursive function needs a stack.',
              frames: [
                { fn: '<module>', line: 'main.py:8' },
                { fn: 'fact', args: 'n = 5', line: 'fact.py:5', locals: ['n = 5'], note: 'waiting on n * ...' },
                { fn: 'fact', args: 'n = 4', line: 'fact.py:5', locals: ['n = 4'] },
              ],
            },
            {
              caption: 'Three deep. Each frame has its own, unrelated n.',
              note: 'This is the whole trick. n = 5, n = 4 and n = 3 are three unrelated values in three unrelated frames. The inner call cannot see or clobber the outer ones.',
              frames: [
                { fn: '<module>', line: 'main.py:8' },
                { fn: 'fact', args: 'n = 5', line: 'fact.py:5', locals: ['n = 5'] },
                { fn: 'fact', args: 'n = 4', line: 'fact.py:5', locals: ['n = 4'] },
                { fn: 'fact', args: 'n = 3', line: 'fact.py:5', locals: ['n = 3'] },
              ],
            },
            {
              caption: 'Six frames. n = 1 hits the base case on line 3.',
              note: 'The guard n <= 1 is true, so the recursive branch is never evaluated. Depth stops here, and the number of calls is exactly the original n plus one.',
              frames: [
                { fn: '<module>', line: 'main.py:8' },
                { fn: 'fact', args: 'n = 5', line: 'fact.py:5', locals: ['n = 5'] },
                { fn: 'fact', args: 'n = 4', line: 'fact.py:5', locals: ['n = 4'] },
                { fn: 'fact', args: 'n = 3', line: 'fact.py:5', locals: ['n = 3'] },
                { fn: 'fact', args: 'n = 2', line: 'fact.py:5', locals: ['n = 2'] },
                { fn: 'fact', args: 'n = 1', line: 'fact.py:3', locals: ['n = 1'], note: 'base case' },
              ],
            },
            {
              caption: 'Unwinding starts. fact(1) returns 1 and its frame is destroyed.',
              note: 'The returning marker means this frame has produced its value and is on its way out. The frame, its n and its resume position all stop existing. Only the value 1 survives.',
              frames: [
                { fn: '<module>', line: 'main.py:8' },
                { fn: 'fact', args: 'n = 5', line: 'fact.py:5', locals: ['n = 5'] },
                { fn: 'fact', args: 'n = 4', line: 'fact.py:5', locals: ['n = 4'] },
                { fn: 'fact', args: 'n = 3', line: 'fact.py:5', locals: ['n = 3'] },
                { fn: 'fact', args: 'n = 2', line: 'fact.py:5', locals: ['n = 2'] },
                { fn: 'fact', args: 'n = 1', line: 'fact.py:3', locals: ['n = 1'], phase: 'returning', note: 'returns 1' },
              ],
            },
            {
              caption: 'fact(2) resumes: 2 * 1 = 2, and it too returns.',
              note: 'The suspended expression n * fact(n - 1) now has its right-hand side, so the multiplication runs and the statement has a value to return.',
              frames: [
                { fn: '<module>', line: 'main.py:8' },
                { fn: 'fact', args: 'n = 5', line: 'fact.py:5', locals: ['n = 5'] },
                { fn: 'fact', args: 'n = 4', line: 'fact.py:5', locals: ['n = 4'] },
                { fn: 'fact', args: 'n = 3', line: 'fact.py:5', locals: ['n = 3'] },
                { fn: 'fact', args: 'n = 2', line: 'fact.py:5', locals: ['n = 2'], phase: 'returning', note: 'returns 2' },
              ],
            },
            {
              caption: 'fact(3) and fact(4) unwind: 3 * 2 = 6, then 4 * 6 = 24.',
              note: 'Watch a value travel up the stack. Each frame receives one number from above and hands one number up. The stack is a conveyor belt for partial results.',
              frames: [
                { fn: '<module>', line: 'main.py:8' },
                { fn: 'fact', args: 'n = 5', line: 'fact.py:5', locals: ['n = 5'] },
                { fn: 'fact', args: 'n = 4', line: 'fact.py:5', locals: ['n = 4'], phase: 'returning', note: 'returns 24' },
              ],
            },
            {
              caption: 'fact(5) resumes: 5 * 24 = 120, the frame pops, the name is bound.',
              note: 'The module frame at the bottom waited on line 8 the entire time. Six frames going in, one coming out: the net cost of this recursion is six frames, not 120 of them — and that is the real reason a loop is the better tool for summing 1..n.',
              frames: [
                { fn: '<module>', line: 'main.py:8', locals: ['result = 120'] },
                { fn: 'fact', args: 'n = 5', line: 'fact.py:5', locals: ['n = 5'], phase: 'returning', note: 'returns 120' },
              ],
            },
          ],
        }),
        b.lead('The 1000-frame limit, and what it really is'),
        b.md(`CPython keeps a counter of live frames and raises \`RecursionError\` when it passes 1000 by default. You can read the number and change it:

\`\`\`python
import sys

print(sys.getrecursionlimit())     # 1000

sys.setrecursionlimit(2000)


def forever(n):
    return forever(n + 1)      # no base case at all


try:
    forever(0)
except RecursionError as exc:
    print("gave up:", exc)
\`\`\`

\`\`\`text
1000
gave up: maximum recursion depth exceeded while calling a Python object
\`\`\`

**The limit is a safety mechanism, not a target.** It exists because each frame consumes real memory, and the CPython 3.11+ interpreter is itself written in C, so deep Python recursion is deep C recursion. Raising the limit past what the C stack can hold does not raise the ceiling — it converts a clean \`RecursionError\` into a segfault, which kills your process with no traceback and no message.

The three responses, in order of preference:

1. **Rewrite it as a loop.** If the recursion is really "repeat until a condition", a \`while\` or \`for\` uses one frame instead of n. This is almost always the right answer.
2. **Find and fix the real bug.** In practice \`RecursionError\` means a base case is unreachable — a typo like \`fact(n)\` instead of \`fact(n - 1)\`, or a condition that can never be satisfied.
3. **Raise the limit deliberately**, once, near startup, with a comment saying why. \`sys.setrecursionlimit(10_000)\` for a known-depth tree walk is legitimate; \`sys.setrecursionlimit(10 ** 7)\` is a crash waiting to be triggered by input.

Note the underscore in \`10_000\`: Python allows underscores as digit separators, and the standard library uses them for exactly this reason.

## Python has no tail calls

In Scheme, and in some compilers, \`return f(x)\` in tail position is optimised into a jump that reuses the frame, so a tail-recursive function runs in constant stack space. **Python does not do this and will not**, because the language guarantees that a frame stays alive for as long as it might be needed — by \`inspect\`, by a debugger, and by the traceback that gets printed if anything inside it raises.

What Python does instead is nothing. A tail call builds one more frame, exactly like any other call.

\`\`\`python
def loop_sum(n, acc=0):
    """'Tail recursive' by appearance only."""
    if n == 0:
        return acc
    return loop_sum(n - 1, acc + n)


print(loop_sum(100_000))
# RecursionError: maximum recursion depth exceeded
\`\`\`

The function is correct and the algorithm is O(n). It still crashes, because 100,001 frames is over the limit. The fix is to write the loop:

\`\`\`python
def loop_sum(n):
    """Sum 0..n using one frame instead of n."""
    acc = 0
    while n > 0:
        acc += n
        n -= 1
    return acc


print(loop_sum(100_000))    # 5000050000
\`\`\`

So the practical consequence of "Python has no tail calls" is: **in Python, depth is a cost you pay in frames, and no compiler is coming to help.**`),
        b.lead('Naive versus memoised recursion'),
        b.md(`\`fib\` is the perfect demonstration because it is a genuinely exponential algorithm written in five lines, and memoisation turns it into a linear one with one extra line.

\`\`\`python
def fib(n: int) -> int:
    """Return the nth Fibonacci number, where F0 = 0 and F1 = 1."""
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)
\`\`\`

The problem is visible in the call stack. To compute \`fib(5)\` the interpreter evaluates \`fib(4) + fib(3)\`; computing \`fib(4)\` evaluates \`fib(3) + fib(2)\`; and \`fib(3)\` is computed *again* from scratch in a completely separate frame. The work is exponential in n — roughly the golden ratio raised to the n — and the call counts are:

| Input | Naive calls | Wall clock on a modern laptop |
| --- | --- | --- |
| \`fib(20)\` | 21,891 | instant |
| \`fib(25)\` | 242,785 | a few milliseconds |
| \`fib(30)\` | 2,692,537 | about a third of a second |
| \`fib(35)\` | 29,860,703 | tens of seconds |
| \`fib(40)\` | 331,160,281 | hours |

The call count grows by roughly 2.6x for every single increment of n. That is the shape of exponential growth, and it is why "my loop is fine at n = 20" is not evidence of anything.

The fix is **memoisation**: remember the answer the first time you compute it. The decorator version is one line:

\`\`\`python
from functools import cache


@cache
def fib(n: int) -> int:
    """Return the nth Fibonacci number, memoised."""
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)


print(fib(90))    # 2880067194370816120, immediately
\`\`\`

\`fib(90)\` now makes 91 calls instead of 288 billion, because each value is computed once and cached. \`functools.cache\` is the modern spelling of \`functools.lru_cache(maxsize=None)\`.

The same idea without a decorator, worth reading at least once because the caching is explicit:

\`\`\`python
def fib_memo(n: int, memo: dict | None = None) -> int:
    """Return the nth Fibonacci number, caching as we go."""
    if memo is None:
        memo = {}
    if n in memo:
        return memo[n]
    result = n if n < 2 else fib_memo(n - 1, memo) + fib_memo(n - 2, memo)
    memo[n] = result
    return result
\`\`\`

The trick is that **\`memo\` is a single mutable dict created once and threaded through every recursive call** — passed explicitly rather than defaulted, so there is no shared-state bug and no \`None\` check on the hot path. This is the standard manual-memoisation shape and you will write it again.

> \`\`\`bash
> python memo_bench.py
> \`\`\`
>
> \`\`\`text
> naive  fib(30): 2,692,537 calls in 0.31 s
> cached fib(30):        31 calls in 0.00 s
> cached fib(90):        91 calls in 0.00 s
> \`\`\``),
        b.table('Recursion decisions', ['Situation', 'Recursion or loop', 'Why'], [
          ['A tree or graph whose children are discovered at runtime', 'Recursion', 'The shape is not known in advance; the depth is data'],
          ['Divide and conquer: merge sort, quicksort, binary search', 'Either', 'Recursion reads closer to the definition; a loop is faster'],
          ['"Repeat this until it is done"', 'Loop', 'One frame instead of n, and no recursion limit to hit'],
          ['Accumulator threading, as in loop_sum(n, acc)', 'Loop', 'Tail calls do not exist in Python, so the frames are pure cost'],
          ['A recursive call on the *same* input', 'Neither — fix it', 'A base case that cannot be reached is a bug, not an algorithm'],
          ['Depth greater than about 50', 'Carefully', 'Python frames are heavy; check the limit before you ship'],
        ]),
        b.steps('When recursion is genuinely clearer than a loop', [
          {
            title: 'The problem is defined in terms of itself',
            desc: 'A directory tree, a JSON document, a binary search, a grammar. The recursive definition is one sentence; the iterative one needs an explicit stack plus index bookkeeping that has to be correct for every shape of input.',
            code_snippet: 'def total_size(node):\n    if node.is_file():\n        return node.size\n    return sum(total_size(child) for child in node.children)',
          },
          {
            title: 'The data is a tree, not a sequence',
            desc: 'A loop over a nested dict or list needs a manual stack of (container, index) pairs, and the index bookkeeping is where the bugs live. Recursion gets the traversal stack for free, because the call stack is the traversal stack.',
          },
          {
            title: 'The recursion composes',
            desc: 'Once you have a recursive function, adding a key function, a memo table or a depth limit is a parameter, not a rewrite. Naive fib becomes memoised fib by adding a decorator, which is why recursion is a good base for a design.',
          },
          {
            title: 'The depth is provably small',
            desc: 'If depth is bounded by the size of your input and that size is small — a config file, one HTTP route tree, a directory with a few thousand files — the frames are affordable and the readability wins outright.',
          },
        ]),
        b.tip(
          'The one-line self-check for any recursive function',
          'Ask: "what is the argument on the recursive call, and how is it smaller than the current one?" If you cannot name the measure that guarantees the base case is reached, you do not have a recursive function — you have a program that will eventually raise RecursionError, and "eventually" might be tomorrow, in production, on the largest input anyone ever sent you.'
        ),
        b.warn(
          'A RecursionError raised inside a library you did not write',
          'A RecursionError from inside a parser, a serialiser or a validation library is almost never that library fault. It means your data nests deeper than you expected. Printing the offending object and measuring its depth is far more productive than raising the limit: real data from real users is always deeper than your test data.'
        ),
      ],
      questions: [
        [
          'What is the base case of a recursive function for?',
          [
            'It returns the answer directly and stops the recursion, guaranteeing the process terminates',
            'It is the first call the function makes',
            'It sets the recursion limit for the function',
            'It handles the error cases that the recursive case cannot',
          ],
          0,
          'The base case is the branch that returns without recursing. Every recursive call has to move its argument toward that branch, and it is the only thing that guarantees termination.',
        ],
        [
          'How many nested calls can a default CPython program make before raising RecursionError?',
          ['About 1000 frames deep', 'About 10,000 frames deep', 'Limited only by available memory', 'Exactly 100 frames deep'],
          0,
          'sys.getrecursionlimit() returns 1000 by default. The limit exists because each frame also costs C stack space inside the interpreter, so a depth past what that stack can hold would crash the process instead of raising a catchable error.',
        ],
        [
          'Why does naive recursive fib(35) take tens of seconds when the memoised version is instant?',
          [
            'The memoised version uses a faster multiplication',
            'The naive version recomputes fib(3) many times over, making roughly 29,860,703 calls, while the memoised version computes each of the 36 values exactly once',
            'The naive version converts every integer to a string at each step',
            'The naive version runs one frame deep while the memoised one runs many',
          ],
          1,
          'The recursion tree has exponential width because every node produces two overlapping subtrees. Caching collapses the tree into a chain: 91 calls for fib(90) instead of billions.',
        ],
        [
          'What does `sys.setrecursionlimit(10_000_000)` actually do?',
          [
            'It makes Python allocate a larger C stack so deep recursion becomes safe',
            'It is the recommended fix for any RecursionError',
            'It only changes the counter that triggers RecursionError, so a value beyond what the C stack can hold can crash the interpreter with no traceback',
            'CPython ignores it entirely',
          ],
          2,
          'The setting is a guard, not an allocation. Recursion depth is still bounded by the real C stack, so an enormous limit converts a catchable exception into a segfault. Rewriting the recursion as a loop is nearly always the better fix.',
        ],
      ],
    },
    /* ====================================================================== */
    /* 3. Scope, closures, global and nonlocal                                */
    /* ====================================================================== */
    {
      title: 'Scope, closures and global/nonlocal',
      summary: 'LEGB, why assigning makes a name local, what a closure actually captures, and when global and nonlocal are the wrong tool.',
      duration: 18,
      build: (b) => [
        b.md(`## Where a name is looked up: LEGB

When Python evaluates a bare name, it searches four places in a fixed order and stops at the first hit:

1. **L — Local**: names assigned anywhere in the current function body.
2. **E — Enclosing**: names in the nearest enclosing function scope, if this function is nested inside one.
3. **G — Global**: names at the top level of the module.
4. **B — Builtins**: \`print\`, \`len\`, \`int\`, \`range\`, and the rest of the built-in namespace.

**Local is searched before Global**, and that ordering is the source of Python's most confusing error.`),
        b.diagram(
          'One name lookup, four places to look',
          `flowchart TD
    subgraph lookup["Evaluating a bare name inside a function body"]
        L["L — Local<br/>names assigned in this function"]
        E["E — Enclosing<br/>the nearest enclosing function"]
        G["G — Global<br/>this module's top level"]
        BU["B — Builtins<br/>print, len, int, range"]
        X["NameError:<br/>name is not defined"]
    end
    L -->|"not found here"| E
    E -->|"not found here"| G
    G -->|"not found here"| BU
    BU -->|"not found here"| X
    GD["module __dict__"] -.->|"read and written by<br/>module-level code"| G`
        ),
        b.md(`## Assigning inside a function makes the name local — everywhere

This is the rule that surprises people, and it is not a runtime behaviour: **Python decides at compile time**, by scanning the function body for assignments. If a name is assigned anywhere in the body, it is local for the *whole* body, including lines that execute earlier.

\`\`\`python
TAX = 0.2


def price_with_tax(base):
    print(TAX)       # raises UnboundLocalError
    TAX = 0.25
    return base * (1 + TAX)
\`\`\`

\`\`\`text
UnboundLocalError: cannot access local variable 'TAX' where it is not associated with a value
\`\`\`

The name \`TAX\` is local to \`price_with_tax\` because line 4 assigns to it. So line 2 looks for a *local* \`TAX\`, finds the slot in the frame, finds it empty — because the assignment has not run yet — and gives up. The module-level \`TAX\` is never consulted.

Note the error is \`UnboundLocalError\`, a subclass of \`NameError\`, and the message says "not associated with a value" rather than "not defined". That difference is a clue: the name exists as a concept in this function, it just has no value yet.

Two fixes, both correct, and the second is usually better:

\`\`\`python
def price_with_tax_a(base):
    """Read the module-level constant; never assign to it."""
    return base * (1 + TAX)


def price_with_tax_b(base):
    """Take the rate as a parameter; no global at all."""
    tax = 0.25
    return base * (1 + tax)


print(price_with_tax_a(100.0))    # 120.0
print(price_with_tax_b(100.0))    # 125.0
\`\`\`

The mental model that makes this stick: **a function's parameters and locals live in a private namespace created fresh on every call and thrown away on return.** The global namespace is a different place entirely, and you are not in it.

## global and nonlocal

\`global\` and \`nonlocal\` exist, and you will eventually need one of them. They are also the two most abused keywords in Python, so learn exactly what they do and then learn when not to.

\`\`\`python
counter = 0


def bump():
    global counter      # opt out of the local namespace for this name
    counter += 1


bump()
bump()
print(counter)          # 2
\`\`\`

Without \`global\`, \`counter += 1\` would be an \`UnboundLocalError\` by the rule above.

\`nonlocal\` binds to the nearest **enclosing function** scope rather than the module scope. It is the tool for a closure that needs to write back to a variable it captured:

\`\`\`python
def make_accumulator():
    total = 0

    def add(amount):
        nonlocal total     # write back to make_accumulator's total
        total += amount
        return total

    return add


acc = make_accumulator()
print(acc(10), acc(20), acc(30))   # 10 30 60
\`\`\`

Two hard limits worth memorising:

- \`nonlocal\` **cannot** reach the module namespace. \`nonlocal x\` where \`x\` is a module-level name is a \`SyntaxError\`, not a silent fallback to \`global\`.
- \`nonlocal\` names must already be bound in an enclosing function. There is no "create it if absent" behaviour.

**Why they are usually the wrong tool:** a function that reaches out and mutates a global is a function whose result depends on invisible state. You cannot call it from two places without them interfering, you cannot run it in a thread, and you cannot test it without setting the global back first. Every bug report shaped like "it works when I run it alone" is a global.`),
        b.anim('passing', {
          title: 'What a closure holds: the cell, not the number',
          badge: 'captured state',
          steps: [
            {
              caption: 'make_accumulator() is called. A frame is created.',
              note: 'total = 0 binds a name in this frame. So far it is an ordinary local, living and dying with the call.',
              panes: [
                { title: 'make_accumulator — the enclosing frame', sub: 'total lives here', cells: [{ label: 'total', value: '0', tone: 'int' }] },
                { title: 'add — not defined yet', sub: 'no function object exists', cells: [{ label: 'add', value: '(unbound)', tone: 'pad' }] },
              ],
            },
            {
              caption: 'The def add statement runs and inspects its own body.',
              note: 'add reads total but the enclosing function is the one that owns it, so Python promotes that frame slot into a cell — a box with a name in it that is allowed to outlive any single frame.',
              panes: [
                { title: 'make_accumulator — the enclosing frame', sub: 'total lives here', cells: [{ label: 'total', value: '0   (now in a cell)', tone: 'ptr' }] },
                { title: 'add', sub: 'the new function object', call: 'def add(amount):\n    nonlocal total\n    total += amount\n    return total', cells: [{ label: 'add', value: '<function add>', tone: 'code' }, { label: 'add.__closure__', value: '(the cell for total)', tone: 'ptr' }] },
              ],
            },
            {
              caption: 'return add — the frame is destroyed, the cell survives.',
              note: 'The frame goes away and its ordinary names with it. The cell does not, because the function object holds a reference to it. That is the only reason add still works after make_accumulator has returned.',
              panes: [
                { title: 'make_accumulator — frame is gone', sub: 'the cell is still referenced', cells: [{ label: 'total', value: '0   (cell alive)', tone: 'ptr' }, { label: 'other locals', value: 'destroyed with the frame', tone: 'pad' }] },
                { title: 'add', sub: 'returned to the caller as acc', cells: [{ label: 'acc', value: '<function add>', tone: 'code' }, { label: 'cell for total', value: 'referenced by add', tone: 'ptr' }] },
              ],
            },
            {
              caption: 'acc(10) is called. A new frame is created for add.',
              note: 'The cell is not copied into this frame. The frame holds a reference to the same box, so both names see the same storage.',
              panes: [
                { title: 'the cell', sub: 'one box, shared', cells: [{ label: 'total', value: '0', tone: 'int' }] },
                { title: 'add — the new frame', sub: 'amount = 10', call: 'acc(10)', cells: [{ label: 'amount', value: '10', tone: 'auto' }, { label: 'total', value: 'reads the cell → 0', tone: 'ptr' }] },
              ],
            },
            {
              caption: 'total += amount writes through the reference.',
              note: 'The cell now holds 10, and the write is visible to every function holding this cell — including after the frame that made the write has been destroyed.',
              panes: [
                { title: 'the cell', sub: 'one box, shared', cells: [{ label: 'total', value: '10', tone: 'ok' }] },
                { title: 'add — the new frame', sub: 'returns total', cells: [{ label: 'amount', value: '10', tone: 'auto' }, { label: 'total', value: '10', tone: 'ok' }] },
              ],
            },
            {
              caption: 'A second accumulator gets its own, separate cell.',
              note: 'Each call to make_accumulator() runs the def statement again, creating a brand new cell. total in one has no effect on the other — that is what makes independent counters work.',
              panes: [
                { title: 'cell A (from acc)', sub: 'independent', cells: [{ label: 'total', value: '10', tone: 'int' }] },
                { title: 'cell B (from other)', sub: 'independent', cells: [{ label: 'total', value: '0', tone: 'int' }] },
              ],
            },
            {
              caption: 'After acc(20) and acc(30): A is 60, B is 7.',
              note: 'Same source code, same layout, no globals, no module-level names — and the two counters cannot interfere. This is exactly what a closure is for: private state with no name in any module namespace.',
              panes: [
                { title: 'acc', sub: 'cell A', cells: [{ label: 'total', value: '60', tone: 'ok' }, { label: 'calls made', value: '3', tone: 'int' }] },
                { title: 'other', sub: 'cell B', cells: [{ label: 'total', value: '7', tone: 'ok' }, { label: 'calls made', value: '2', tone: 'int' }] },
              ],
            },
          ],
        }),
        b.lead('Closures capture variables, not values'),
        b.md(`This is the bug that has surprised every Python developer at least once, and the one most often copied from a forum without the explanation attached.

\`\`\`python
adders = []
for i in range(3):
    adders.append(lambda x: x + i)      # BUG

print(adders[0](10), adders[1](10), adders[2](10))
\`\`\`

\`\`\`text
12 12 12
\`\`\`

All three add 2, not 0, 1 and 2. The reason is that a closure captures the **variable**, not a snapshot of its value. All three functions capture *the same cell* holding \`i\`, and by the time any of them is called, the \`for\` loop has finished and that cell holds 2.

The fix is to force a new cell per iteration by binding a default argument:

\`\`\`python
adders = []
for i in range(3):
    adders.append(lambda x, i=i: x + i)  # i=i is evaluated now

print(adders[0](10), adders[1](10), adders[2](10))
\`\`\`

\`\`\`text
10 11 12
\`\`\`

The same trap without \`lambda\`, which is worth recognising because it appears constantly in real code:

\`\`\`python
handlers = []
for name in ("ping", "pong", "stop"):
    handlers.append(lambda: print(f"handling {name}"))

for h in handlers:
    h()
\`\`\`

\`\`\`text
handling stop
handling stop
handling stop
\`\`\`

The two safe fixes are a default argument or a factory function. A factory is clearer whenever the captured value is not a single loop variable:

\`\`\`python
def make_handler(name):
    """Return a function that prints the name it was built with."""
    def handle():
        print(f"handling {name}")
    return handle


handlers = [make_handler(n) for n in ("ping", "pong", "stop")]
for h in handlers:
    h()
\`\`\`

\`\`\`text
handling ping
handling pong
handling stop
\`\`\`

Why anyone should care: the buggy version still *runs*. It produces wrong output, silently, and only for inputs where the loop variable differs — so it passes a test suite that only ever iterates once, and fails in production the first time someone builds a list of three.`),
        b.anim('memory', {
          title: 'Three functions, one shared cell',
          badge: 'late binding',
          base: 140737488355328,
          cell_bytes: 8,
          cells: [
            { bytes: ['01', '00', '00', '00', '00', '00', '00', '00'], label: 'cell', note: 'the single cell object the loop variable lives in', tone: 'ptr' },
            { bytes: ['02', '00', '00', '00', '00', '00', '00', '00'], label: 'i = 2', note: 'the value in that cell once the loop has finished', tone: 'int' },
            { bytes: ['A0', '00', '00', '00', '00', '00', '00', '00'], label: 'f1 cell', note: 'adders[0].__closure__[0]', tone: 'ptr' },
            { bytes: ['A8', '00', '00', '00', '00', '00', '00', '00'], label: 'f2 cell', note: 'adders[1].__closure__[0]', tone: 'ptr' },
            { bytes: ['B0', '00', '00', '00', '00', '00', '00', '00'], label: 'f3 cell', note: 'adders[2].__closure__[0]', tone: 'ptr' },
          ],
          steps: [
            {
              caption: 'The loop has not run. The cell exists but is empty.',
              note: 'range(3) will produce 0, 1, 2. The first iteration creates a cell for the loop variable i — a box separate from the frame, so that a nested function can hold on to it after the frame is gone.',
              vars: [{ name: 'i', type: 'cell', value: '(empty)', pointsTo: 0, tone: 'ptr' }],
              highlight: [0],
            },
            {
              caption: 'Iteration 1: i = 0, and the first lambda captures the cell.',
              note: 'adders[0] is created with no default argument, so nothing inside it records the current value of i. It records only the cell.',
              cells: { '1': { bytes: ['00', '00', '00', '00', '00', '00', '00', '00'], label: 'i = 0' } },
              vars: [
                { name: 'i', type: 'cell', value: '0', pointsTo: 0, tone: 'ptr' },
                { name: 'adders', type: 'list', value: '[f1]', tone: 'auto' },
              ],
              highlight: [0, 2],
            },
            {
              caption: 'Iteration 2: the cell is updated in place, not replaced.',
              note: 'i = 1 writes a new value into the *same* cell. f1 does not get a new cell, because f1 never asked for one — it only asked for i.',
              cells: { '1': { bytes: ['01', '00', '00', '00', '00', '00', '00', '00'], label: 'i = 1' } },
              vars: [
                { name: 'i', type: 'cell', value: '1', pointsTo: 0, tone: 'ptr' },
                { name: 'adders', type: 'list', value: '[f1, f2]', tone: 'auto' },
              ],
              highlight: [0, 2, 3],
            },
            {
              caption: 'Iteration 3: three functions, every one pointing at cell 0.',
              note: 'All three __closure__ slots hold a reference to the same cell object. Nothing is copied per iteration, so nothing is snapshotted per iteration.',
              cells: { '1': { bytes: ['02', '00', '00', '00', '00', '00', '00', '00'], label: 'i = 2' } },
              vars: [
                { name: 'i', type: 'cell', value: '2', pointsTo: 0, tone: 'ptr' },
                { name: 'adders', type: 'list', value: '[f1, f2, f3]', tone: 'auto' },
                { name: 'f1', type: 'function', value: 'lambda x: x + i', pointsTo: 2, tone: 'ptr' },
                { name: 'f3', type: 'function', value: 'lambda x: x + i', pointsTo: 4, tone: 'ptr' },
              ],
              highlight: [0, 2, 3, 4],
            },
            {
              caption: 'adders[0](10) returns 12, not 10.',
              note: 'The call reads the cell at the moment of the call, and the cell says 2. Every function in the list will answer 12. The fix is lambda x, i=i: x + i, which gives each function its own cell at creation time.',
              vars: [
                { name: 'i', type: 'cell', value: '2', pointsTo: 0, tone: 'warn' },
                { name: 'adders[0](10)', type: 'int', value: '12   ← expected 10', tone: 'bad' },
                { name: 'adders[2](10)', type: 'int', value: '12   ← correct', tone: 'ok' },
              ],
              highlight: [0, 1],
            },
          ],
        }),
        b.code(`# Binding a copy of the loop variable into a default makes this safe.
def safe_adders(count: int) -> list:
    """Return count callables, each adding its own index."""
    return [lambda x, i=i: x + i for i in range(count)]


adds = safe_adders(3)
print([f(10) for f in adds])      # [10, 11, 12]

# functools.partial does the same binding, and reads better than a default.
from functools import partial


def scaled(value: int, factor: int) -> int:
    return value * factor


double = partial(scaled, factor=2)
triple = partial(scaled, factor=3)
print(double(21), triple(14))    # 42 42
print(scaled(21, 5))             # 105 — the original is untouched`, 'closures.py'),
        b.md(`## functools.partial and a first look at decorators

\`partial(f, **fixed)\` returns a new callable with some arguments already bound. It is a closure written for you, and it is the tidiest way to build a family of related functions without a factory of your own.

A **decorator** is a function that takes a function and returns a function. That is the entire definition — and because functions are objects, it works at all. The convention is to preserve the wrapped function's metadata:

\`\`\`python
import functools
import time


def timed(fn):
    """Return a wrapper that prints how long fn took."""
    @functools.wraps(fn)          # copies __name__, __doc__, __qualname__
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        try:
            return fn(*args, **kwargs)
        finally:
            elapsed = time.perf_counter() - start
            print(f"{fn.__name__} took {elapsed * 1000:.2f} ms")
    return wrapper


@timed
def slow_sum(n: int) -> int:
    """Sum 0..n, slowly."""
    total = 0
    for i in range(n):
        total += i
    return total


print(slow_sum(1_000_000))
print(slow_sum.__name__)          # 'slow_sum' — not 'wrapper'
print(slow_sum.__doc__)           # 'Sum 0..n, slowly.'
\`\`\`

Two details in that code that will matter for the rest of the course:

- \`@functools.wraps(fn)\` is not decoration. Without it the wrapped function reports itself as \`wrapper\`, which makes tracebacks and \`help()\` useless. Module 11 builds this pattern properly.
- \`return fn(*args, **kwargs)\` is how a decorator forwards arguments it does not care about. \`*args\` and \`**kwargs\` are the subject of the next lesson, and that one line is the reason they exist.`),
        b.warn(
          'The three smells that say a global is doing a local job',
          'A function that reads a global but could take it as a parameter; a function that mutates a global and returns nothing; and a module-level list appended to from three different places. All three have the same fix: pass the state in, or wrap it in a closure. `global` inside a function almost always means the function is not finished being designed.'
        ),
        b.resources('Go deeper on scope', [
          { label: 'The official tutorial on scoping and name binding', url: 'https://docs.python.org/3/tutorial/classes.html#scopes-and-name-binding' },
          { label: 'PEP 3107 — keyword-only arguments, where the star convention comes from', url: 'https://peps.python.org/pep-3107/' },
          { label: 'functools.partial in the standard library documentation', url: 'https://docs.python.org/3/library/functools.html#functools.partial' },
        ]),
      ],
      questions: [
        [
          'In what order does Python look up a bare name inside a function?',
          ['Local, Enclosing, Global, Builtin', 'Builtin, Global, Enclosing, Local', 'Global, Local, Builtin, Enclosing', 'Enclosing, Global, Local, Builtin'],
          0,
          'LEGB. Local is the function own namespace, Enclosing is the nearest enclosing function, Global is the module top level, and Builtin is the interpreter built-in namespace. Local first is what makes UnboundLocalError possible.',
        ],
        [
          'A function prints a module-level constant on line 2 and assigns to that same name on line 4. What happens?',
          [
            'It prints the module-level value, because the assignment has not run yet',
            'It raises UnboundLocalError, because the assignment makes the name local for the whole function',
            'It prints None',
            'It raises NameError, because the name is not in the global namespace',
          ],
          1,
          'Python marks a name local at compile time if it is assigned anywhere in the body. The read on line 2 therefore looks in the still-empty local slot. Because locals is a function, you get UnboundLocalError rather than NameError.',
        ],
        [
          'Why do three lambdas created in a `for i in range(3)` loop all add the final value of i?',
          [
            'Because a lambda captures the value of i at definition time',
            'Because a closure captures the variable, and all three share one cell that the loop mutates in place',
            'Because range(3) yields the same value three times',
            'Because lambda bodies are evaluated eagerly at definition',
          ],
          1,
          'A closure stores a reference to the cell, not a copy of the value. `lambda x, i=i: ...` fixes it because the default argument is evaluated per iteration, creating a fresh cell each time.',
        ],
        [
          'What can `nonlocal` do that `global` cannot?',
          [
            'Create a new name inside an enclosing function',
            'Write to a variable in the nearest enclosing function scope rather than the module namespace',
            'Declare a variable without assigning a value to it',
            'Access names that live inside a class body',
          ],
          1,
          '`nonlocal` rebinds a name in the closest enclosing *function* scope, which is what a stateful closure needs. It cannot reach module-level names at all — that is a SyntaxError, not a fallback to global.',
        ],
      ],
    },
    /* ====================================================================== */
    /* 4. Arguments in depth                                                  */
    /* ====================================================================== */
    {
      title: 'Arguments in depth',
      summary: 'Positional-only, keyword-only, *args, **kwargs, unpacking into a call, __call__, and a wrapper that uses all of it.',
      duration: 17,
      build: (b) => [
        b.md(`## Five ways an argument can be bound

Python's parameter system looks baroque until you notice it is just five rules composed:

1. **Positional-or-keyword** — the default. Can be passed either way.
2. **Positional-only** — everything before a bare \`/\` in the signature.
3. **Keyword-only** — everything after a bare \`*\`.
4. **\\*args** — collects the leftover *positional* arguments into a tuple.
5. **\\*\\*kwargs** — collects the leftover *keyword* arguments into a dict.

\`\`\`python
def configure(host, /, port=5432, *, timeout=5.0, debug=False):
    """Configure a connection.

    host is positional-only, port is positional-or-keyword, and timeout and
    debug are keyword-only.
    """
    return {
        "host": host,
        "port": port,
        "timeout": timeout,
        "debug": debug,
    }


print(configure("db.internal", 6543, debug=True))
# {'host': 'db.internal', 'port': 6543, 'timeout': 5.0, 'debug': True}

configure(host="db.internal")
# TypeError: configure() got some positional-only arguments
#            passed as keyword arguments: 'host'
\`\`\`

The \`/\` marker is how the standard library protects you when a parameter is renamed. \`str.replace\` is written \`str.replace(old, new, /, count=-1)\`, so \`count\` can never become positional-by-accident and adding a keyword-only parameter later cannot break anyone who was already calling it correctly. In your own code, \`/\` earns its place once a function has more than about three parameters.

The \`*\` marker is free and always worth it. It costs nothing at runtime and makes a call site that reads \`connect("db", timeout=2.0)\` unambiguous forever.

## Collecting the leftovers

\`\`\`python
def summarise(label, *values, precision=2, **extras):
    """Print a labelled summary of arbitrary values and extra options."""
    print(f"{label}: {', '.join(str(v) for v in values)}")
    for key in sorted(extras):
        print(f"  {key} = {extras[key]}")
    if precision is not None:
        print(f"  (precision {precision})")


summarise("latency", 12.5, 30.1, 8.75, precision=1, unit="ms", source="edge-1")
\`\`\`

\`\`\`text
latency: 12.5, 30.1, 8.75
  precision = 1
  source = edge-1
  unit = ms
\`\`\`

Watch what happened to \`precision\`: it is keyword-only *with a default*, so it was consumed by its own parameter and never reached \`**extras\`. Named parameters are matched **first**, and only the leftovers go into \`*values\` and \`**extras\`. That ordering is why \`**extras\` never contains a key you already declared, and it is the whole reason you can safely hand \`**kwargs\` to a helper that also has real parameters.

The pairing is exact: \`*values\` receives a **tuple**, \`**extras\` receives a **dict**. Both are empty when there is nothing to collect, so \`if values:\` and \`if extras:\` are always safe.

## Unpacking into a call

The same two markers work in the opposite direction, at the call site. This is what makes a transparent wrapper possible:

\`\`\`python
def report(name, *values, sep=", ", **extras):
    """Return a one-line report built from arbitrary inputs."""
    head = f"{name}: " + sep.join(str(v) for v in values)
    tail = "".join(f" {k}={v}" for k, v in sorted(extras.items()))
    return head + tail


scores = [80, 90, 100]
meta = {"unit": "pts", "cohort": "2026"}

print(report("scores", *scores, **meta))
# scores: 80, 90, 100 cohort=2026 unit=pts

print(report("scores", *scores, sep=" | ", **meta))
# scores: 80 | 90 | 100 cohort=2026 unit=pts
\`\`\`

The extras come out sorted because \`report\` sorts them, and that is deliberate: **dicts iterate in insertion order**, so a report built by a wrapper would otherwise depend on the order the caller happened to type its keyword arguments. Sorting makes the output deterministic, and deterministic output is what makes a test assertion possible.

Unpacking a dict into \`**\` requires the keys to be **strings** and the function to have parameters that accept them. A non-string key is a \`TypeError: keywords must be strings\`, and an unexpected key is a plain \`TypeError\` naming the function and the key.

The mirror-image idiom, used constantly, is unpacking in a *call* to combine positional and keyword arguments you have as data:

\`\`\`python
def connect(host, port, *, timeout=5.0):
    return f"{host}:{port} timeout={timeout}"


options = {"host": "db.internal", "port": 6543, "timeout": 1.5}
print(connect(**options))
# db.internal:6543 timeout=1.5
\`\`\``),
        b.anim('step', {
          title: 'How Python binds one call, step by step',
          steps: [
            {
              title: '1. Positional-or-keyword',
              desc: 'A parameter with neither marker. It can be given positionally or by name, and a name always beats a position. This is the default and it is what you get unless you ask for something else.',
              code_snippet: 'def connect(host, port=5432): ...\n\nconnect("db.internal")            # port=5432\nconnect("db.internal", 6543)       # positional\nconnect("db.internal", port=6543)  # by name',
            },
            {
              title: '2. Positional-only, before the slash',
              desc: 'Everything left of a bare slash can only be passed positionally. The standard library uses it to reserve a name for the future, so a later parameter can be added without breaking old callers. In your own code it is mostly protection against your own future self renaming a parameter.',
              code_snippet: 'def tag(name, /, **meta):\n    ...\n\ntag("prod")        # ok\ntag(name="prod")   # TypeError: positional-only',
            },
            {
              title: '3. Keyword-only, after the star',
              desc: 'A bare star with no name after it makes every following parameter keyword-only. This is the most valuable thing you can add to a signature: it makes the call site self-documenting and it makes the parameter order irrelevant forever. functools.reduce is the shape to copy.',
              code_snippet: 'def connect(host, port=5432, *, timeout=5.0, ssl=True): ...\n\nconnect("db", 6543, 2.0)\n# TypeError: takes 2 positional arguments but 3 were given',
            },
            {
              title: '4. *args collects the leftover positionals',
              desc: 'A parameter written *name gathers every positional argument no other parameter claimed, in order, into a tuple. It is zero-length if there are none, so it is always safe to iterate. The name is yours to choose; args is only convention.',
              code_snippet: 'def total(*values):\n    return sum(values)\n\ntotal()          # 0\ntotal(1, 2, 3)  # 6\ntype(total(1))  # <class \'tuple\'>',
            },
            {
              title: '5. **kwargs collects the leftover keywords',
              desc: 'A parameter written **name gathers every keyword argument no other parameter claimed into a dict. Because keyword names are identifiers, the keys are always strings. This is the extension point of the whole standard library: json.loads, dict.update, functools.partial and every logging call accept it.',
              code_snippet: 'def build(**fields):\n    return fields\n\nbuild(a=1, b=2)   # {\'a\': 1, \'b\': 2}\nbuild()           # {}',
            },
            {
              title: '6. The order Python binds in',
              desc: 'Positional-only first from the positional list, then positional-or-keyword and keyword-only from what remains positionally and from the keyword list, and only then do *args and **kwargs collect the leftovers. A named parameter can never be filled twice, and one with no default that never gets a value is an immediate TypeError at call time.',
              code_snippet: 'def f(a, /, b, *args, c, **kwargs):\n    return a, b, args, c, kwargs\n\nf(1, 2, 3, 4, c=5, d=6)\n# a=1  b=2  args=(3, 4)  c=5  kwargs={\'d\': 6}',
            },
          ],
        }),
        b.lead('Objects that behave like functions'),
        b.md(`A function is not the only callable in Python. Any object with a \`__call__\` method is callable, and \`callable(obj)\` is how you check.

\`\`\`python
class Counter:
    """A callable that returns the next integer, remembering its position."""

    def __init__(self, start=0):
        self.value = start

    def __call__(self):
        current = self.value
        self.value += 1
        return current

    def __repr__(self):
        return f"Counter({self.value})"


c = Counter(10)
print(c(), c(), c())     # 10 11 12
print(c)                 # Counter(13)
print(callable(c), callable(len))   # True True

# Because it is callable, it slots anywhere a zero-argument
# function does.
def three_times(fn):
    return [fn() for _ in range(3)]

c = Counter(100)
print(three_times(c))    # [100, 101, 102]
print(c)                 # Counter(103)

# But map() calls fn(element), so it needs a one-argument
# callable. Counter.__call__ takes none, so this raises:
#   TypeError: Counter.__call__() takes 1 positional argument
#              but 2 were given
# total = sum(map(c, [100, 200]))
\`\`\`

Module 11 turns this into a full protocol (\`__iter__\`, \`__len__\`, \`__eq__\`, \`__repr__\`, \`__enter__\`) and shows where it is genuinely the right design — a \`__call__\` on a class is a strong signal that you wanted a function with a closure, or a class with a static method.

## A worked example: a wrapper that accepts anything

Everything in this lesson, in one function. This is the shape every decorator, every logging wrapper and every \`pytest\` fixture is built from:

\`\`\`python
import functools
import time


def instrument(fn):
    """Wrap fn so every call is counted, timed, and printed.

    *args and **kwargs make the wrapper transparent: whatever the caller
    passes is forwarded untouched, so the wrapper keeps working when the
    wrapped function's signature changes.
    """
    stats = {"calls": 0, "total_seconds": 0.0}

    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        try:
            return fn(*args, **kwargs)      # re-raise, do not swallow
        finally:
            stats["calls"] += 1
            stats["total_seconds"] += time.perf_counter() - start

    wrapper.stats = stats                   # attach the report to the function
    return wrapper


@instrument
def load(path, *, encoding="utf-8", retries=1):
    """Read a file and return its contents. Pretend this is slow."""
    time.sleep(0.01)
    with open(path, encoding=encoding) as handle:
        return handle.read()


print(load("notes.txt", retries=3)[0])
print(load.stats)
# {'calls': 1, 'total_seconds': 0.0101...}
\`\`\`

Four things in that code that are worth internalising:

- \`*args, **kwargs\` in the wrapper is what makes it **transparent**. Without them the wrapper only works for the exact call shape it was written against, and the moment \`load\` gains a parameter the decorator raises a \`TypeError\`.
- \`functools.wraps\` copies \`__name__\`, \`__doc__\` and \`__qualname__\` across, so \`load.__name__\` is still \`'load'\` and the traceback points at the right place.
- \`try / finally\` increments the counters *and* re-raises. A wrapper that catches the exception and returns \`None\` has silently converted every error in your program into a wrong answer.
- Attaching \`wrapper.stats\` is how real libraries expose instrumentation without a second return value.

The type-hint story for \`*args\` and \`**kwargs\` is worth one paragraph, because it is the one place the type system fights you. \`typing.ParamSpec\` and \`typing.TypeVar\` preserve the exact signature of the wrapped function through a decorator; \`Callable[..., Any]\` is the honest "any signature at all" escape hatch. In ordinary code, a plain untyped \`*args, **kwargs\` is perfectly acceptable.`),
        b.checklist('Reading a Python signature', [
          'Everything before a bare `/` is positional-only — it can never be passed by name',
          'Everything after a bare `*` is keyword-only — it can never be passed positionally',
          'A parameter with a default can still be passed by name, which is often clearer than its position',
          '`*args` collects leftover positionals into a **tuple**; `**kwargs` collects leftover keywords into a **dict**',
          'Named parameters are matched before `*args` and `**kwargs` see anything, so a declared keyword never appears in your `**kwargs`',
          'A trailing `_` in a parameter name (`maxiter=`, `sep=`, `errors=`) is a stdlib convention meaning "name kept for compatibility, use the keyword form"',
          '`/` and `*` cost nothing at runtime — adding them to your own signatures is free clarity',
          'A signature you cannot say out loud in one sentence is a signature with too many parameters',
        ]),
        b.tip(
          'Where *args earns its keep in real code',
          'Three places, in rough order of frequency: decorators and wrappers that must forward anything; small CLI entry points that take a variable list of inputs; and adapter functions that paper over a library with a worse interface. In all three, add a docstring line that says what shape the extra arguments are expected to have — `*args` on its own tells a reader nothing.'
        ),
        b.info(
          'Positional-only is not just for the standard library',
          '`def __init__(self, value, /, *, unit="m"):` is a strong statement: the first argument is the thing, everything else is configuration. It also lets you rename the parameters later without breaking anyone, because nobody was allowed to pass them by name. Since Python 3.8 the slash is real syntax; before that the idiom was a leading underscore, as in `str.maketrans(x, y, _delete=)`.'
        ),
      ],
      questions: [
        [
          'In `def f(a, /, b, *args, c, **kwargs):`, which parameters are keyword-only?',
          ['a and b', 'b and c', 'c only', 'c and anything in kwargs'],
          2,
          'The bare `*` after b makes everything to its right keyword-only, which is just c. `**kwargs` is not a parameter in the same sense — it is a collector, and it accepts keywords by design.',
        ],
        [
          'A function is `def send(to, subject, *, body, urgent=False)` and you call `send("a@b.c", "hi", "hello", urgent=True)`. What happens?',
          [
            'It works, and body is "hello"',
            'TypeError: send() takes 2 positional arguments but 3 were given',
            'body is silently dropped',
            'SyntaxError, because a keyword-only parameter cannot follow *args',
          ],
          1,
          '`body` is keyword-only, so it may not be filled from the positional list. The error is raised at call time by the argument binder, which is why it is a TypeError rather than a SyntaxError.',
        ],
        [
          'What do `*args` and `**kwargs` receive?',
          [
            'A list and a list, because arguments are collected into sequences',
            'A tuple and a dict, with all names lowercased',
            'A tuple and a dict, containing only the arguments no named parameter claimed',
            'A tuple and a dict, containing every argument including the named ones',
          ],
          2,
          'Named parameters are matched first, so the collectors only ever see leftovers. That is why a declared keyword like `precision` never turns up in your `**extras` dict.',
        ],
        [
          'An object defines `__call__`. What does that make it?',
          [
            'A function, with all the same behaviour and speed',
            'Callable — `obj(...)` runs `obj.__call__(...)`',
            'A generator, since __call__ is how generators are advanced',
            'A class, since __call__ is the class constructor',
          ],
          1,
          'A class instance is callable as soon as its type defines `__call__`, and `callable(obj)` returns True. Functions are just the built-in object that has this method; nothing about a class instance makes it a function.',
        ],
      ],
    },
  ]
);
