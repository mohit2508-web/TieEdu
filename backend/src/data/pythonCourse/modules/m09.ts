// Module 9 — Comprehensions and Iteration.
//
// Module 8 made blocks of behaviour. This module makes blocks of *data*
// transformations, and then takes the memory out of them. The through-line is
// that Python has two ways to do the same work — build everything eagerly into
// a list, or produce values one at a time on demand — and choosing wrongly is
// the difference between a program that handles a 2 GB file and one that does
// not.
//
// Order is deliberate: syntax first, then the functional toolkit that shares
// the syntax, then the protocol underneath both.

import { mod } from '../blocks';

export const M9 = mod(
  'crs-python-programming',
  'py-m9',
  9,
  'Module 9 — Comprehensions and Iteration',
  'Build sequences declaratively, transform them with the functional tools, and stream them with generators.',
  [
    /* ====================================================================== */
    /* 1. Comprehensions                                                      */
    /* ====================================================================== */
    {
      title: 'Comprehensions',
      summary: 'The four forms, the order of the for and if clauses, nesting, side effects, and when to write a loop instead.',
      duration: 16,
      build: (b) => [
        b.md(`## A comprehension is a loop you can read in one breath

A list comprehension is an expression that builds a new list by looping. That is all it is, and that is why it is written as an *expression* rather than a statement: it has a value, so it can appear on the right of an assignment, inside a function call, or as an element of another data structure.

\`\`\`python
squares = [n * n for n in range(6)]
print(squares)                 # [0, 1, 4, 9, 16, 25]
\`\`\`

The same thing as a loop, and the reason the comprehension is not automatically better:

\`\`\`python
squares = []
for n in range(6):
    squares.append(n * n)
\`\`\`

The comprehension is two lines instead of three, the loop variable cannot leak into the enclosing scope, and there is no name to get wrong. In exchange you lose the ability to \`break\`, to \`continue\`, to \`return\`, or to \`yield\` — which is exactly why a generator expression exists as a separate form.

## The four forms

There are four, and they differ only in the punctuation at each end.

| Form | Syntax | Produces | Duplicate handling |
| --- | --- | --- | --- |
| List comprehension | \`[expr for x in it if cond]\` | \`list\` | keeps duplicates, keeps order |
| Set comprehension | \`{expr for x in it if cond}\` | \`set\` | drops duplicates, unordered |
| Dict comprehension | \`{k: v for x in it if cond}\` | \`dict\` | later keys overwrite earlier ones |
| Generator expression | \`(expr for x in it if cond)\` | \`generator\` | computes lazily, one at a time |

\`\`\`python
nums = [1, 2, 2, 3, 4, 4, 5]

print([n * 2 for n in nums])          # [2, 4, 4, 6, 8, 8, 10]
print({n % 3 for n in nums})          # {0, 1, 2}
print({n: n ** 2 for n in nums})      # {1: 1, 2: 4, 3: 9, 4: 16, 5: 25}
print(sum(n for n in nums))           # 21  <- generator expression: note the parens
\`\`\`

The generator expression is the one people get wrong. **The outer parentheses are mandatory** and a \`for\` is what makes it a generator rather than a grouping. When it is the only argument to a call, those parentheses disappear:

\`\`\`python
sum(n for n in nums)              # generator expression, the extra parens are the syntax
sum([n for n in nums])            # a list is built first, then summed
\`\`\`

Both print 21. Only the first never allocates the list, which is the entire difference and is invisible until the input is large.

## The order of the clauses

Read a comprehension from the inside out: the **leftmost expression is evaluated last**.

\`\`\`python
result = [n * 10 for n in range(10) if n % 2 == 0 if n > 4]
print(result)          # [60, 80]
\`\`\`

Read that as: loop over 0..9, keep the even ones, then among those keep the ones above 4, then compute \`n * 10\`. The \`if\` clauses run **left to right and short-circuit** — the second is only evaluated for values that survived the first — and the final expression runs **once per survivor**.

That ordering is the single most useful thing to know about comprehensions, because it is how you avoid doing expensive work on values you are about to throw away. Filter early, compute late. Putting the cheap test first and the expensive transform last is not stylistic; on a million-row dataset it is the difference between a second and a minute.

The loop this is equivalent to:

\`\`\`python
result = []
for n in range(10):
    if n % 2 == 0:
        if n > 4:
            result.append(n * 10)
\`\`\``),
        b.anim('trace', {
          title: 'One comprehension, clause by clause',
          badge: 'single step',
          code: `prices = [12.0, 7.5, 30.0, 3.25, 18.0, 0.99]
discounted = [p * 0.9 for p in prices if p > 10]
print(discounted)`,
          steps: [
            {
              caption: 'The module starts. Only prices exists.',
              note: 'The list literal is built first — seven float objects — and bound to the name. The comprehension has not run yet.',
              line: 1,
              vars: [{ name: 'prices', value: '[12.0, 7.5, 30.0, ...]', tone: 'auto' }],
            },
            {
              caption: 'The comprehension is evaluated, not assigned',
              note: 'The right-hand side is an expression, so it runs to completion before the name discounted is bound. A new list object is being built from nothing.',
              line: 2,
              vars: [
                { name: 'prices', value: '[12.0, 7.5, 30.0, 3.25, 18.0, 0.99]', tone: 'auto' },
                { name: 'p', value: '(loop has not started)', tone: 'pad' },
              ],
            },
            {
              caption: 'p = 12.0 — 12.0 > 10, so the expression runs',
              note: 'The if clause is evaluated first, and the leftmost expression only for the values it keeps. 12.0 * 0.9 gives 10.8, appended as element 0 of the list being built.',
              line: 2,
              vars: [
                { name: 'p', value: '12.0', tone: 'float' },
                { name: 'discounted', value: '[10.8]  (being built)', tone: 'ok' },
              ],
            },
            {
              caption: 'p = 7.5 and p = 3.25 are filtered out',
              note: 'The if clause is False, so the expression is never evaluated and no element is appended. The position that 3.25 would have filled is simply skipped — which is why the result has five elements, not seven.',
              line: 2,
              vars: [
                { name: 'p', value: '3.25', tone: 'float' },
                { name: 'discounted', value: '[10.8]  (being built)', tone: 'ok' },
              ],
            },
            {
              caption: 'p = 30.0 and p = 18.0 both pass',
              note: '30.0 * 0.9 is 27.0 and 18.0 * 0.9 is 16.2. Note that binary floating point cannot represent 0.9 exactly, so the real stored value is 16.2 to sixteen digits and one epsilon.',
              line: 2,
              vars: [
                { name: 'p', value: '18.0', tone: 'float' },
                { name: 'discounted', value: '[10.8, 27.0, 16.2]', tone: 'ok' },
              ],
            },
            {
              caption: 'p = 0.99 fails, the loop ends, the list is bound',
              note: 'The source iterable is now exhausted. The comprehension expression finishes, produces the list object, and only now is the name discounted created. The right-hand side is always fully evaluated first.',
              line: 2,
              vars: [
                { name: 'discounted', value: '[10.8, 27.0, 16.2]', tone: 'ok' },
                { name: 'p', value: '0.99  (last value examined)', tone: 'pad' },
              ],
            },
            {
              caption: 'The result is printed',
              note: 'Order is preserved and duplicates are kept — that is a list comprehension contract. Swap the brackets to {} for a set and order disappears.',
              line: 3,
              vars: [
                { name: 'discounted', value: '[10.8, 27.0, 16.2]', tone: 'ok' },
              ],
              output: '[10.8, 27.0, 16.2]',
            },
          ],
        }),
        b.lead('Nesting, and the shape to be careful with'),
        b.md(`Comprehensions nest, and because the outer expression is evaluated last, a nested comprehension reads right to left. Flattening a list of lists:

\`\`\`python
matrix = [[1, 2], [3, 4], [5, 6]]
flat = [cell for row in matrix for cell in row]
print(flat)                 # [1, 2, 3, 4, 5, 6]

# Compare with the nested-bracket version, which reads "outer first"
nested = [[cell * 10 for cell in row] for row in matrix]
print(nested)               # [[10, 20], [30, 40], [50, 60]]
\`\`\`

The rule that keeps people straight:

- **Consecutive \`for\` clauses** in one bracket = flattening. \`for row ... for cell\` runs \`for row\` in the outer position.
- **Nested brackets** = nesting. \`[[... for cell in row] for row in matrix]\` runs \`for row\` first and builds a new inner list each time.

Flattening with consecutive clauses is genuinely concise. Nesting with nested brackets at three levels is not, and past two levels a \`for\` loop with a named variable beats it:

\`\`\`python
# Two levels: a comprehension is fine and readable.
grid = [[r * c for c in range(1, 4)] for r in range(1, 4)]
print(grid)
# [[1, 2, 3], [2, 4, 6], [3, 6, 9]]

# Three levels: name the intermediate results instead.
report = []
for year in (2024, 2025):
    for quarter in ("Q1", "Q2"):
        report.append((year, quarter, len(year) + len(quarter)))
print(report)
# [(2024, 'Q1', 7), (2024, 'Q2', 7), (2025, 'Q1', 7), (2025, 'Q2', 7)]
\`\`\`

The \`len(year) + len(quarter)\` is a deliberately silly expression: the point is that naming the intermediate structure beats a four-clause comprehension you have to parse in your head.`),
        b.lead('Dict and set comprehensions do real work'),
        b.md(`A dict comprehension is the replacement for the \`for\` loop that builds a dict, and it is the most valuable of the four because the alternative is four lines every time:

\`\`\`python
words = ["apple", "fig", "banana", "kiwi", "plum"]

# The old way.
lengths = {}
for w in words:
    lengths[w] = len(w)

# The new way.
lengths = {w: len(w) for w in words}
print(lengths)
# {'apple': 5, 'fig': 3, 'banana': 6, 'kiwi': 4, 'plum': 4}
\`\`\`

Filtering and inverting at the same time:

\`\`\`python
prices = {"apple": 1.5, "fig": 3.25, "banana": 0.4, "plum": 2.8}

# Which fruit costs under 2.50, keyed by name?
affordable = {k: v for k, v in prices.items() if v < 2.5}
print(affordable)
# {'apple': 1.5, 'banana': 0.4}
# Note: plum at 2.8 fails the test, so the dict is smaller than
# the source. A comprehension filters; it never pads or defaults.

# Flip it: name -> price becomes price -> name.
by_price = {v: k for k, v in prices.items()}
print(by_price)
# {1.5: 'apple', 3.25: 'fig', 0.4: 'banana', 2.8: 'plum'}
\`\`\`

The second one has a rule attached that catches people: **if two keys share a value, the last one wins.** \`{v: k for k, v in prices.items()}\` is only a correct inverse if the values are unique. When they are not, you need a grouping comprehension, which is a genuinely useful pattern:

\`\`\`python
from collections import defaultdict

baskets = [
    ("ada", "apple"), ("ada", "fig"), ("bob", "fig"), ("bo", "kiwi"),
]

grouped = defaultdict(list)
for person, item in baskets:
    grouped[person].append(item)

print(dict(grouped))
# {'ada': ['apple', 'fig'], 'bob': ['fig'], 'bo': ['kiwi']}

# The comprehension form, using a nested dict comprehension with setdefault:
grouped2 = {
    person: [item for p, item in baskets if p == person]
    for person in {p for p, _ in baskets}
}
print(grouped2)
# {'ada': ['apple', 'fig'], 'bo': ['kiwi'], 'bob': ['fig']}
\`\`\`

The comprehension version is quadratic — it rescans \`baskets\` once per distinct person — and its output order comes from a **set**, so it is not guaranteed to be the insertion order. That is fine for a demo and wrong for a database. \`defaultdict\` is the tool; the comprehension is here so you recognise the shape.

Set comprehensions are the least used and the most useful when you care about uniqueness:

\`\`\`python
sentence = "the quick brown fox jumps over the lazy dog the end"
print({w for w in sentence.split() if len(w) > 3})
# {'quick', 'brown', 'jumps', 'over', 'lazy'}

letters = set("hello")
print(letters, len(letters))       # {'h', 'l', 'o'} 3
\`\`\``),
        b.code(`sales = [
    ("widget", 3, 9.99),
    ("gadget", 1, 24.50),
    ("widget", 2, 9.99),
    ("doohickey", 5, 4.25),
    ("gadget", 4, 24.50),
]

# Which products sold at all?
print({name for name, qty, price in sales})
# {'widget', 'gadget', 'doohickey'}

# Total units and revenue per product.
revenue = {}
for name, qty, price in sales:
    revenue[name] = revenue.get(name, 0) + qty * price
print(revenue)
# {'widget': 49.95, 'gadget': 122.5, 'doohickey': 21.25}

# The same thing, as a comprehension with sum() over a filtered generator.
def total_for(product):
    return sum(q * p for n, q, p in sales if n == product)


print({n: total_for(n) for n in {name for name, _, _ in sales}})
# {'widget': 49.95, 'gadget': 122.5, 'doohickey': 21.25}

# Basket sizes, grouped in one pass.
basket_sizes = {}
for name, qty, _ in sales:
    basket_sizes.setdefault(name, []).append(qty)
print(basket_sizes)
# {'widget': [3, 2], 'gadget': [1, 4], 'doohickey': [5]}`, 'comprehensions.py'),
        b.lead('When a comprehension is the wrong tool'),
        b.md(`Four concrete reasons, each of which will come up in a code review:

**1. It needs a side effect.** A comprehension that calls \`print\`, \`append\` to something outside, or writes to a file is a loop wearing a disguise. The \`for\` loop says what it does; the comprehension hides it.

**\`\`\`python
# Bad: the intent is invisible.
results = [process(x) for x in data if log(x)]

# Good: the side effect is the point, so say so.
results = []
for x in data:
    if log(x):
        results.append(process(x))
\`\`\`

**2. It needs \`break\` or \`continue\`.** Neither exists in a comprehension. Searching for the first match and stopping is a loop:

\`\`\`python
first = next(n for n in stream if n > 0)     # idiomatic, and it does stop early
\`\`\`

That \`next(genexp)\` is the correct idiom, and it is worth knowing that it works precisely because a generator expression is lazy: \`next\` stops the moment it has one value.

**3. It needs a \`try\`.** Exceptions cannot appear inside the leftmost expression of a comprehension without an ugly helper function. Multi-step validation is a loop.

**4. It has grown past about 80 characters or more than three clauses.** A comprehension that wraps across four lines with two filters and a nested expression is harder to read than the loop it replaced, and the whole benefit was that it was shorter.

**The performance picture, honestly.** A comprehension is not faster than the equivalent \`append\` loop — CPython optimises \`list.append\` method lookup, and the two are within noise of each other, usually with the comprehension a hair ahead because it does not repeatedly re-look-up the method. The real differences:

- A comprehension is a **single expression**, so it evaluates to a value. A loop is a statement and leaves results in names.
- A comprehension has a **private scope** in Python 3: the loop variable does not leak, and it cannot be accessed after the comprehension. A loop variable does leak and can shadow an outer one.
- A comprehension builds a **new object** whether or not you need one. A loop with \`append\` also builds one. What avoids the object is a **generator expression**, or a loop that never stores anything.
- A comprehension over a **generator** consumes it. \`[x for x in gen]\` drains \`gen\`; \`[x for x in gen]\` again gives an empty list. That is the single most common bug with generators, and Module 8's laziness lesson explains why.`),
        b.tip(
          'The named-expression escape hatch',
          'Python 3.8 added `:=`, which assigns as it evaluates, and its canonical use is a comprehension that would otherwise recompute an expensive value. `rows = [total for line in lines if (total := compute(line)) > 0]` computes `total` once per line and binds it in the enclosing scope. It is powerful, and it is also the point at which a comprehension stops being readable — reach for it only when the recomputation genuinely costs something.'
        ),
        b.warn(
          'The one bug that catches everyone on the second use',
          'A list comprehension over a generator exhausts it. `data = (x for x in range(5))` then `first = [x for x in data]` then `second = [x for x in data]` gives `[0, 1, 2, 3, 4]` and then `[]`. If you need the values twice, call the generator function again, or materialise it with `list(...)` once and iterate the list. This is a direct consequence of the next lesson and it will bite you again there.'
        ),
      ],
      questions: [
        [
          'In `[n * 10 for n in range(10) if n % 2 == 0 if n > 4]`, in what order are the clauses evaluated?',
          [
            'The expression first, then both filters, because the expression is written first',
            'Both filters left to right with short-circuit, then the expression once per survivor',
            'The filters in reverse order, right to left',
            'All three, once per input value, regardless of the filters',
          ],
          1,
          'The `if` clauses run left to right and a value that fails one is discarded before the next is tested, so later filters are cheaper. The leftmost expression is evaluated last, exactly once per surviving value.',
        ],
        [
          'What is the difference between `(x for x in data)` and `[x for x in data]`?',
          [
            'None — they are two spellings of the same object',
            'The first is a generator that computes values on demand; the second is a list built immediately',
            'The first only works on lists; the second works on anything',
            'The first deduplicates; the second preserves duplicates',
          ],
          1,
          'A generator expression returns a generator object that runs the loop when you advance it, and never materialises the intermediate sequence. A list comprehension runs to completion and allocates a list. The outer parentheses are the syntax that distinguishes them.',
        ],
        [
          'Why do three comprehensions over the same set of words produce a different order?',
          [
            'Because set comprehensions sort their results alphabetically',
            'Because a set has no defined iteration order, and it depends on hash values',
            'Because sets iterate in reverse insertion order',
            'Because dict comprehensions preserve insertion order but sets do not',
          ],
          1,
          'Dicts are insertion-ordered since Python 3.7, so a dict comprehension is deterministic. A set is an unordered collection keyed by hash, so iterating it gives an order that looks arbitrary and is in practice stable for a given set of strings in a given build — never rely on it.',
        ],
        [
          'Which of these is a reason to write a plain loop instead of a comprehension?',
          [
            'The body needs to call print() or write to a file',
            'The body needs to break out early once a match is found',
            'The body has to survive an exception partway through',
            'The comprehension would span more than 80 characters',
          ],
          2,
          'A comprehension evaluates a single expression, so it has nowhere to put a try/except, a break, or a print. The `next(genexp)` idiom covers the early-exit case properly; the other two are genuine reasons to unroll the loop.',
        ],
      ],
    },
    /* ====================================================================== */
    /* 2. The functional tools                                                */
    /* ====================================================================== */
    {
      title: 'The functional tools',
      summary: 'map, filter, sorted, zip, enumerate, min/max, any/all, itertools and reduce, with what each one costs.',
      duration: 19,
      build: (b) => [
        b.md(`## A pipeline of transformations

Python's functional tools are all the same shape: take one or two iterables, do one thing, and hand back a new iterable. Composed, they replace most hand-written loops:

\`\`\`python
records = [
    {"name": "ada", "score": 91},
    {"name": "bob", "score": 67},
    {"name": "cleo", "score": 88},
]

passed = [r["name"] for r in records if r["score"] >= 70]
print(passed)                 # ['ada', 'cleo']
\`\`\`

The tools let you write the same thing in pieces, and the pieces are individually testable:

\`\`\`python
high = filter(lambda r: r["score"] >= 70, records)   # keeps matching records
names = map(lambda r: r["name"], high)               # pulls the name out
print(list(names))                                  # ['ada', 'cleo']
\`\`\`

Read it left to right: filter, then map, then list. The composition is a data pipeline, and it is lazy — \`list()\` at the end is what forces it to run.

**The single most important fact about these tools: \`map\`, \`filter\` and \`zip\` return iterators, not lists.** They compute nothing until you consume the result. \`print(map(str, [1, 2]))\` prints \`<map object at 0x7f...>\`, not \`['1', '2']\`. Wrap in \`list()\` when you want a list, and leave it lazy when you do not.

## What each tool costs

| Tool | Takes | Returns | Lazy? | Cost / gotcha |
| --- | --- | --- | --- | --- |
| \`map(f, it)\` | 1+ iterables | iterator | yes | Exactly as slow as calling \`f\` n times |
| \`filter(f, it)\` | iterable | iterator | yes | \`f\` must return a truthy value, not a bool |
| \`sorted(it, key=, reverse=)\` | iterable | **list** | no | Materialises everything; always returns a list |
| \`reversed(it)\` | sequence | iterator | yes | Needs \`__len__\` and \`__getitem__\`; not for a generator |
| \`zip(*its)\` | n iterables | iterator | yes | Truncates to the shortest; \`strict=True\` raises instead |
| \`enumerate(it, start=0)\` | iterable | iterator | yes | \`start=\` is 0-based, matching Python indexing |
| \`min(it, key=, default=)\` | iterable | single value | no | One pass; \`default\` covers the empty case |
| \`max(it, key=, default=)\` | iterable | single value | no | One pass; both \`key\` and \`default\` exist |
| \`any(it)\` | iterable | bool | no | **Short-circuits on the first True** |
| \`all(it)\` | iterable | bool | no | **Short-circuits on the first False** |
| \`sum(it, start=0)\` | iterable | number | no | No \`key\` parameter — see below |
| \`itertools.chain(*its)\` | n iterables | iterator | yes | Infinite number of arguments allowed |
| \`itertools.product(*its)\` | n iterables | iterator | yes | Size is the **product**, so two lists of 100 make 10,000 |
| \`itertools.combinations(it, r)\` | iterable | iterator | yes | \`r\` is required; order of input is preserved |
| \`itertools.groupby(it, key=)\` | **sorted** iterable | pairs | yes | Only groups *consecutive* equal keys |
| \`functools.reduce(f, it, init)\` | iterable | single value | no | \`init\` is not optional here, unlike \`sum\` |

Three entries in that table deserve expanding, because they are where real projects go wrong.

**\`sorted\` is the only eager one.** It cannot know the first element of a sorted result without reading all of them, so it always returns a list and always costs a full pass plus a sort. If you call \`sorted()\` inside a loop over a million rows, that is your problem.

**\`sum\` has no \`key\`.** \`min\`, \`max\` and \`any\`/\`all\` take \`key=\`; \`sum\` does not. People try \`sum(items, key=item.price)\` and get a \`TypeError\`. The workaround is a generator expression, which is exactly as fast because nothing is materialised:

\`\`\`python
items = [{"price": 3.5}, {"price": 1.25}, {"price": 9.0}]

# This is a TypeError: sum() got an unexpected keyword argument 'key'
# total = sum(items, key=lambda i: i["price"])

total = sum(i["price"] for i in items)
print(total)          # 13.75

# For floats, math.fsum is dramatically more accurate than sum.
print(sum([0.1] * 10))            # 0.9999999999999999
print(__import__("math").fsum([0.1] * 10))   # 1.0
\`\`\`

**\`groupby\` needs sorted input.** This is the single most common \`itertools\` bug and it fails silently, so it is worth stating twice: \`groupby\` groups **consecutive** equal keys. If equal keys are separated by other keys, you get multiple groups with the same name, and no error at all.`),
        b.anim('step', {
          title: 'Building a pipeline, one tool at a time',
          steps: [
            {
              title: 'Start: a list of raw dicts',
              desc: 'Records arrive from a database, a CSV file or an API in whatever shape the source had. The first job is always the same: get them into a shape the rest of the pipeline can assume. This is a list, so it can be traversed as many times as you like.',
              code_snippet: 'records = [\n    {"name": "ada", "score": 91},\n    {"name": "bob", "score": 67},\n    {"name": "cleo", "score": 88},\n]',
            },
            {
              title: 'filter: keep the rows that pass',
              desc: 'filter calls the predicate on each element and keeps the ones where the result is truthy. It returns an iterator, so nothing is computed until something consumes it. Note the predicate returns a bool — filter only checks truthiness, so returning the value itself is a common and harmless shortcut.',
              code_snippet: 'high = filter(lambda r: r["score"] >= 70, records)\n# filter object, zero elements examined yet',
            },
            {
              title: 'map: reshape each survivor',
              desc: 'map applies a function to every element of an iterable and returns an iterator of the results. Here the dicts become plain names, which is the transformation that makes the next step trivial. Composition is free: map consumes filter, filter consumes the list.',
              code_snippet: 'names = map(lambda r: r["name"], high)\n# <map object at 0x7f9c1c0a5e10>',
            },
            {
              title: 'sorted: put them in a defined order',
              desc: 'sorted is the one eager step, and it is eager by necessity: you cannot know the smallest item without looking at all of them. It always returns a list, never an iterator, and it never modifies the original. Sorting is stable, so equal keys keep their input order.',
              code_snippet: 'ordered = sorted(names)          # list, alphabetically\n# [\'ada\', \'cleo\']',
            },
            {
              title: 'zip: line up two sequences',
              desc: 'zip walks several iterables in lockstep and stops at the shortest one. That silent truncation is the classic zip bug — two lists of different lengths lose data with no warning. `zip(..., strict=True)` turns that into a ValueError naming the mismatch, and it costs nothing to always pass it.',
              code_snippet: 'names  = ["ada", "bob", "cleo"]\nscores = [91, 67, 88, 55]     # one too many\n\nlist(zip(names, scores))\n# [(\'ada\', 91), (\'bob\', 67), (\'cleo\', 88)]  — the 55 is dropped\n\nlist(zip(names, scores, strict=True))\n# ValueError: zip() argument 2 is longer than argument 1',
            },
            {
              title: 'enumerate: get the index for free',
              desc: 'enumerate yields (index, item) pairs, so you never write a manual counter or call len() inside the loop. The default start is 0, matching Python indexing; pass start=1 for human-facing numbering. Unlike range, it does not require a length, so it works on generators.',
              code_snippet: 'for i, name in enumerate(names, start=1):\n    print(i, name)\n# 1 ada\n# 2 bob\n# 3 cleo',
            },
            {
              title: 'Reduce the whole thing to a scalar',
              desc: 'any and all short-circuit, which makes them the right choice for a large or infinite iterable: all() over a million rows stops at the first False. min and max take key= and do one pass. sum has no key, so shape the values with a generator expression first — which costs nothing because nothing is materialised.',
              code_snippet: 'all(r["score"] >= 60 for r in records)   # True, checks all 3\nmax(records, key=lambda r: r["score"])["name"]  # \'ada\'\nsum(r["score"] for r in records)               # 246\n\n# Raise the bar to 70 and it short-circuits at bob:\nall(r["score"] >= 70 for r in records)        # False, stops at bob',
            },
          ],
        }),
        b.lead('key= is the whole trick'),
        b.md(`Half the utility of \`sorted\`, \`min\`, \`max\` and \`groupby\` comes from the \`key=\` parameter, which is a function applied to each element *before* comparing. It lets you sort by anything without changing the data.

\`\`\`python
words = ["banana", "kiwi", "fig", "watermelon"]

print(sorted(words, key=len))
# ['fig', 'kiwi', 'banana', 'watermelon']

print(sorted(words, key=len, reverse=True))
# ['watermelon', 'banana', 'kiwi', 'fig']

# Sort a list of dicts by a field:
books = [
    {"title": "Dune", "year": 1965},
    {"title": "Solaris", "year": 1961},
    {"title": "Neuromancer", "year": 1984},
]
print([b["title"] for b in sorted(books, key=lambda b: b["year"])])
# ['Solaris', 'Dune', 'Neuromancer']

# max by key returns the element, not the key:
best = max(books, key=lambda b: b["year"])
print(best["title"])      # 'Neuromancer'
\`\`\`

Two properties worth knowing:

- **\`sorted\` is stable.** Items with equal keys keep their original relative order. \`sorted(words, key=len)\` puts \`"kiwi"\` before \`"fig"\` only because \`"fig"\` is shorter; for equal lengths the original order is preserved. This is what makes a multi-pass sort correct: sort by year, then re-sort by author, and the author sort breaks ties by year.
- **\`key\` is called exactly once per element.** The function is not re-evaluated during comparisons, so an expensive key is paid for n times, not n log n times. If your key is genuinely expensive, compute it once with \`operator.itemgetter\` or store it alongside.`),
        b.code(`import math
import operator
from itertools import chain, combinations, groupby

books = [
    ("Solaris", "Lem", 1961),
    ("The Dispossessed", "Lem", 1974),
    ("Dune", "Herbert", 1965),
    ("Neuromancer", "Gibson", 1984),
    ("Children of Dune", "Herbert", 1976),
]

# 1. Sort by author, then by year. The second key breaks ties, and
#    sorted() is stable, so within an author the years stay in order.
#    Note the authors come out alphabetically: Gibson, Herbert, Lem.
ordered = sorted(books, key=lambda b: (b[1], b[2]))
print(ordered[:2])
# [('Neuromancer', 'Gibson', 1984), ('Dune', 'Herbert', 1965)]

# 2. groupby needs sorted input, and groups CONSECUTIVE equal keys only.
#    Consume the group inside the loop, or it is already exhausted.
for author, group in groupby(ordered, key=operator.itemgetter(1)):
    titles = [t for t, _, _ in group]
    print(f"{author}: {len(titles)} books, first is {titles[0]}")
# Gibson: 1 books, first is Neuromancer
# Herbert: 2 books, first is Dune
# Lem: 2 books, first is Solaris

# 3. Count per author without sorting, using a dict. No sort needed,
#    because a dict groups by hash, not by adjacency.
totals = {}
for title, author, year in books:
    totals[author] = totals.get(author, 0) + 1
print(totals)
# {'Lem': 2, 'Herbert': 2, 'Gibson': 1}   (insertion order, not sorted)

# 4. combinations, not permutations: 3 choose 2 is 3, not 6.
print(list(combinations("abc", 2)))
# [('a', 'b'), ('a', 'c'), ('b', 'c')]

# 5. chain: flatten lazily, with no nesting.
print(list(chain([1, 2], "ab", (3, 4))))
# [1, 2, 'a', 'b', 3, 4]

# 6. sum has no key=, so shape the values with a generator expression.
#    fsum exists because binary floats accumulate error.
tenths = [0.1] * 10
print(sum(tenths), math.fsum(tenths))
# 0.9999999999999999 1.0`, 'functional.py'),
        b.lead('itertools and functools.reduce'),
        b.md(`The standard library has a dedicated module for lazy combinatorial work, and reaching for it is almost always faster and clearer than hand-rolling the same thing.

\`\`\`python
from itertools import chain, product, combinations, combinations_with_replacement, islice

# chain: concatenate any number of iterables, lazily.
print(list(chain([1, 2], "ab", (3, 4))))
# [1, 2, 'a', 'b', 3, 4]

# product: the cartesian product. The output size is len(a) * len(b) * ...
print(list(product([1, 2], "xy")))
# [(1, 'x'), (1, 'y'), (2, 'x'), (2, 'y')]

# combinations: choose r, order of the input preserved, no repeats.
print(list(combinations("abcd", 2)))
# [('a', 'b'), ('a', 'c'), ('a', 'd'), ('b', 'c'), ('b', 'd'), ('c', 'd')]

# islice: take a window without building the whole thing.
import itertools
stream = itertools.count(1)          # an infinite generator
print(list(itertools.islice(stream, 10, 15)))
# [11, 12, 13, 14, 15]
\`\`\`

\`itertools.product([1, 2], "xy")\` has 4 outputs. With two lists of 1000 it has **1,000,000** tuples, each a real object. Any time you see \`product\` over two unbounded-ish collections, check the multiplication before you run it.

\`functools.reduce\` is the odd one out, and the only tool here that is not in the builtin namespace:

\`\`\`python
from functools import reduce
import operator

# reduce(f, iterable, initializer) — f takes two accumulators.
print(reduce(operator.add, [1, 2, 3, 4], 0))     # 10
print(reduce(lambda a, b: a * b, [1, 2, 3, 4], 1))  # 24

# The initializer is optional for a NON-EMPTY iterable — without
# it, reduce uses the first element:
print(reduce(operator.add, [1, 2, 3, 4]))         # 10
# With an empty iterable and no initializer it has nothing to
# start from, and that is the TypeError:
# reduce(operator.add, [])   # TypeError: reduce() of empty iterable
#                            #     with no initial value
#
# Pass an initializer when the starting point matters. This is how
# you get max() semantics over an empty list instead of a ValueError.
# Note it is positional — reduce takes no keyword arguments:
print(reduce(max, [], 0))                        # 0
print(reduce(max, [3, 1, 4, 1, 5], 0))          # 5

# It is a general fold:
words = ["a", "b", "c"]
print(reduce(lambda s, w: s + " " + w, words, "start:"))  # 'start: a b c'
\`\`\`

And \`itertools.accumulate\` gives you the running values — often more useful than the final total:

\`\`\`python
import itertools
print(list(itertools.accumulate([1, 2, 3, 4])))                 # [1, 3, 6, 10]
print(list(itertools.accumulate([1, 2, 3], operator.mul)))      # [1, 2, 6]
\`\`\``),
        b.table('Reading a functional expression', ['Expression', 'Reads as', 'Consumes'], [
          ['`[f(x) for x in it]`', 'a list of f applied to each', 'it completely, building a list'],
          ['`list(map(f, it))`', 'the same, spelled as a pipeline', 'it completely, once it is'],
          ['`(f(x) for x in it)`', 'a stream of f applied to each', 'only as far as you pull'],
          ['`any(f(x) for x in it)`', 'does at least one satisfy f', 'until the first True'],
          ['`all(f(x) for x in it)`', 'do all of them satisfy f', 'until the first False'],
          ['`next(f(x) for x in it if g(x))`', 'the first match, and nothing after', 'until the first match'],
          ['`dict(...)`, `set(...)`', 'materialise into that container', 'it completely'],
        ]),
        b.warn(
          'The groupby trap, one more time, because it is silent',
          '`groupby` only groups *consecutive* keys. If you hand it `[("a", 1), ("b", 2), ("a", 3)]` you get two groups both called "a". Nothing raises. The fix is always to sort first, on exactly the key you are grouping by — `groupby(sorted(items, key=key), key=key)` — and if you cannot sort, group with a dict instead.'
        ),
        b.tip(
          'When a lambda is fine and when it costs you',
          'A lambda is fine when the body is a single expression, when the name of the operation is obvious from context, and when it is used once. Write a def when the body needs a docstring, a comment, more than one statement, or when the same key function appears twice — at which point `operator.itemgetter("score")` is both faster and clearer than `lambda r: r["score"]`. A lambda whose body needs a comment is a def that has not been written yet.'
        ),
      ],
      questions: [
        [
          'Why does `print(map(str, [1, 2]))` not print the two strings?',
          [
            'map only works on functions with a return statement',
            'map returns a lazy iterator, and print does not consume it',
            'str is shadowed by the map builtin',
            'map converts its output to a string before returning',
          ],
          1,
          'map builds an iterator that applies the function as you consume it. Nothing is computed until iteration, and print does not iterate its argument, so you get the repr of the map object.',
        ],
        [
          'What happens with `list(zip(["a", "b", "c"], [1, 2]))`?',
          [
            'A ValueError is raised',
            'You get [(\'a\', 1), (\'b\', 2)] and the 3 is dropped',
            'You get [(\'a\', 1), (\'b\', 2), (\'c\', None)]',
            'A TypeError, because the lengths differ',
          ],
          1,
          'zip stops at the shortest iterable and raises nothing. `zip(..., strict=True)` is the fix, and it is worth passing by default — silent truncation is a data-loss bug waiting to be reported by a customer.',
        ],
        [
          'Which of these functions accepts a `key` argument?',
          [
            'sum',
            'sorted, min and max',
            'all and any',
            'len and enumerate',
          ],
          1,
          'sorted, min and max accept key=. sum does not, and neither do any/all — they take only the iterable, so you express the comparison in the generator instead. That is why `sum(r["price"] for r in items)` and `all(r["ok"] for r in items)` are the idioms rather than a key argument.',
        ],
        [
          'Why must input be sorted before using `itertools.groupby`?',
          [
            'groupby sorts the input itself, but slowly',
            'groupby only groups consecutive equal keys, so non-adjacent equal keys produce separate groups with the same name',
            'groupby requires a list, not a tuple',
            'groupby raises a TypeError on unsorted input',
          ],
          1,
          'groupby is a streaming operation with no memory of what it has already seen. Equal keys separated by other keys start a new group, and no error is raised, so the output silently has duplicate group names.',
        ],
      ],
    },
    /* ====================================================================== */
    /* 3. Iterators, generators and laziness                                   */
    /* ====================================================================== */
    {
      title: 'Iterators, generators and laziness',
      summary: 'The iteration protocol, what yield really does to a frame, laziness, infinite generators, yield from, and memory.',
      duration: 20,
      build: (b) => [
        b.md(`## The protocol every iterable obeys

Python's iteration is not a language feature. It is a protocol — a pair of methods — and every \`for\` loop in the language is exactly this conversation:

1. Call \`iter(obj)\`. This asks the object for an **iterator**.
2. Call \`next(iterator)\` repeatedly. This asks for the next value.
3. When there are no more values, the iterator raises \`StopIteration\`, and the \`for\` loop ends.

That is it. There is no built-in list iteration; \`list\` just happens to implement the protocol. Which is why a \`for\` loop works identically over a list, a dict, a file, a set, a \`range\`, a socket, and a generator function you wrote this morning.

\`iter(obj)\` normally just calls \`obj.__iter__()\`, and \`next(it)\` calls \`it.__next__()\`. So the protocol in code is:

\`\`\`python
class Countdown:
    """An iterable and iterator counting down from n to 1."""

    def __init__(self, n):
        self.n = n

    def __iter__(self):
        return self          # a common, valid choice: be your own iterator

    def __next__(self):
        if self.n <= 0:
            raise StopIteration   # ends the for loop
        self.n -= 1
        return self.n + 1


for value in Countdown(3):
    print(value, end=" ")
# 3 2 1

print(list(Countdown(3)))    # [3, 2, 1]
\`\`\`

Three details that are easy to get wrong:

- **\`__next__\` must raise \`StopIteration\`, not return \`None\`.** Returning \`None\` hands \`None\` to the loop body and the loop keeps going.
- **Once exhausted, an iterator stays exhausted.** Calling \`next()\` again raises \`StopIteration\` forever. That is why a generator is spent after you have walked it once, and why \`list(iterator)\` twice gives you data then \`[]\`.
- **An iterable is not necessarily an iterator.** \`iter([1,2,3])\` returns the list itself, because a list *is* its own iterator. A file object is the counter-intuitive case people get wrong: \`iter(f) is f\` is **True**, so a file is its own iterator too. Once you have read it to the end it stays exhausted — a second \`for\` loop over the same handle gives you nothing, and \`f.seek(0)\` is how you rewind it.

## What yield really does to a frame

A generator function is a function that contains \`yield\`. Calling it does not run the body. It creates a **generator object** holding a suspended frame.

Every time you advance the generator, the frame resumes exactly where it left off, runs until the next \`yield\`, and freezes again. That is the entire implementation, and it explains the strange properties that follow: a generator remembers everything local to it between steps, and a generator holds that state in memory for as long as it exists.`),
        b.diagram(
          'The iteration protocol, end to end',
          `flowchart TD
    A["a list"] -->|"iter() returns self"| B["the list is its own iterator"]
    C["a generator function"] -->|"calling it runs nothing,<br/>returns a generator"| D["generator object"]
    D -->|"__iter__ returns self"| D
    E["a file object"] -->|"__iter__ returns self,<br/>so it is its own iterator"| F["the same file handle"]
    G["a custom class"] -->|"__iter__ returns<br/>any object with __next__"| H["your iterator"]
    B --> I["for calls iter() once"]
    D --> I
    F --> I
    H --> I
    I --> J["__next__() repeatedly"]
    J -->|"a value"| K["the loop body runs"]
    K --> J
    J -->|"StopIteration raised"| L["the loop ends, normally"]
    J -.->|"any other exception"| M["the loop ends, loudly"]`
        ),
        b.anim('callstack', {
          title: 'countdown(3): one frame, parked at a yield',
          badge: 'suspended frames',
          steps: [
            {
              caption: 'No frame exists yet. Calling a generator function creates an object.',
              note: 'Because the body contains yield, the call returns immediately. The arguments are stored, not evaluated. This is why calling a generator with an expensive argument does no work until you advance it.',
              frames: [],
            },
            {
              caption: 'The module holds a generator that has never run.',
              note: 'gen = countdown(3) has completed. The generator object holds the argument 3 and an empty suspended frame. No code from the body has executed, and no line of it can have failed.',
              frames: [
                { fn: '<module>', line: 'main.py:3', locals: ['gen = <generator>'] },
              ],
            },
            {
              caption: 'next(gen) creates the frame, runs it to the first yield, and parks.',
              note: 'The frame is created here, not at the call. n = 3 is bound, the while test passes, and `yield n` suspends the frame and hands 3 back. The frame stays alive with n = 3, waiting.',
              frames: [
                { fn: '<module>', line: 'main.py:5', locals: ['gen = <generator>', 'value = 3'], note: 'just received 3' },
                { fn: 'countdown', args: 'n = 3', line: 'gen.py:3', locals: ['n = 3'], note: 'suspended at the yield' },
              ],
            },
            {
              caption: 'The second next() resumes at the yield, not at the top.',
              note: 'Execution continues from just after `yield n`, so n -= 1 runs, the while test runs again, and the second yield parks the frame with n = 2. The local variable survived across the gap — that is what makes a generator stateful.',
              frames: [
                { fn: '<module>', line: 'main.py:5', locals: ['gen = <generator>', 'value = 2'], note: 'just received 2' },
                { fn: 'countdown', args: 'n = 3', line: 'gen.py:3', locals: ['n = 2'], note: 'suspended again' },
              ],
            },
            {
              caption: 'The third next() parks the frame with n = 1.',
              note: 'Same mechanism, one more time. Three values out, and the frame is still exactly where it was left, holding nothing but the single local n.',
              frames: [
                { fn: '<module>', line: 'main.py:5', locals: ['gen = <generator>', 'value = 1'], note: 'just received 1' },
                { fn: 'countdown', args: 'n = 3', line: 'gen.py:3', locals: ['n = 1'], note: 'suspended again' },
              ],
            },
            {
              caption: 'The fourth next() resumes, fails the test, and returns.',
              note: 'n -= 1 makes n zero, `while 0 > 0` is False, and the function falls off the end. Falling off the end of a generator is how StopIteration is produced, and the frame is destroyed as it goes.',
              frames: [
                { fn: '<module>', line: 'main.py:5', locals: ['gen = <generator>'], note: 'next() will raise StopIteration' },
                { fn: 'countdown', args: 'n = 3', line: 'gen.py:2', locals: ['n = 0'], phase: 'returning', note: 'while failed — returning' },
              ],
            },
            {
              caption: 'Only the module frame is left, and the generator is spent.',
              note: 'The frame is gone. Asking the generator for another value raises StopIteration every time from now on, and the for loop in the module has ended. Compare that with an ordinary function, where the frame is created on every call.',
              frames: [
                { fn: '<module>', line: 'main.py:6', locals: ['gen = <generator>'], note: 'StopIteration caught by for' },
              ],
            },
          ],
        }),
        b.code(`def countdown(n):
    """Yield n, n-1, ... down to 1."""
    while n > 0:
        yield n
        n -= 1


gen = countdown(3)
print(type(gen))            # <class 'generator'>
print(next(gen))            # 3
print(next(gen))            # 2
print(next(gen))            # 1

try:
    print(next(gen))
except StopIteration:
    print("exhausted")      # exhausted

# Calling the function again runs the body again, with a fresh frame.
print(list(countdown(3)))   # [3, 2, 1]

# A generator is iterable, so a for loop works and stops cleanly.
for value in countdown(4):
    print(value, end=" ")
print()                     # 4 3 2 1

# A generator is one-shot. The second loop over the SAME object is empty.
g = countdown(3)
print(sum(g), sum(g))       # 6 0  <- the second sum sees an exhausted iterator

# Two calls give two independent generators.
a, b = countdown(2), countdown(3)
print(list(a), list(b))     # [2, 1] [3, 2, 1]`, 'generators.py'),
        b.lead('Laziness, and the file it unlocks'),
        b.md(`The reason generators exist is not elegance. It is that a comprehension over a list has to hold the whole list in memory, and there are real datasets you cannot hold in memory.

\`\`\`python
import re
from pathlib import Path

# Eager: every match becomes a str object, all at once.
text = Path("access.log").read_text()
codes = re.findall(r'" (\\d{3}) ', text)
total = sum(map(int, codes))          # 48,000 small str objects alive at once

# Lazy: one str at a time, and the integer is produced from it immediately.
with open("access.log") as handle:
    total = sum(
        int(m.group(1))
        for line in handle
        for m in [re.search(r'" (\\d{3}) ', line)]
        if m
    )
\`\`\`

Both give the same answer. The second uses constant extra memory regardless of file size, and it can be pointed at a 40 GB file.

**How laziness composes.** A chain of lazy tools is a pipeline where *each stage pulls from the one below it, one element at a time*:

\`\`\`python
numbers = (n for n in range(10) if n % 2)     # generator, nothing run
doubled = map(lambda n: n * 2, numbers)       # map, nothing run
big = filter(lambda n: n > 6, doubled)        # filter, nothing run
print(list(big))                              # [8, 10, 12, 14, 16]
\`\`\`

The last line is the only place anything happens, and even then only \`range\` up to 10 is walked. \`list(big)\` pulls one value, which pulls one from \`doubled\`, which pulls one from \`numbers\`, which pulls one from \`range\`. Nothing is computed until something asks, and nothing beyond what was asked is computed at all.

**Infinite generators are therefore fine.** This is not a trick, it is the point:

\`\`\`python
import itertools

def primes():
    """Yield primes, forever. There are infinitely many, so this cannot be a list."""
    found = []
    candidate = 2
    while True:
        if all(candidate % p for p in found if p * p <= candidate):
            found.append(candidate)
            yield candidate
        candidate += 1


print(list(itertools.islice(primes(), 10)))
# [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]

print(next(itertools.count(1, 2)))    # 1
print(list(itertools.repeat(7, 3)))   # [7, 7, 7] — bounded by count

# cycle() never ends, so NEVER list() it directly — that line
# hangs forever and takes the program with it. Always bound it
# with islice (or take(while=False) in itertools recipes):
print(list(itertools.islice(itertools.cycle("abc"), 6)))
# ['a', 'b', 'c', 'a', 'b', 'c']
\`\`\`

The rules that come with infinite sources: never call \`list()\` on one, always bound it with \`islice\` or \`zip\` against a finite iterable, and remember that \`any()\`, \`all()\` and \`next()\` all short-circuit so they are safe.`),
        b.anim('pipeline', {
          title: 'Eager versus lazy over a real file',
          badge: 'memory, measured',
          stages: [
            {
              name: 'Read',
              tool: 'read_text',
              in: 'access.log (2.0 MB)',
              out: 'one str object of 2.0 MB',
              detail: 'The whole file lands in memory as a single string. This part is unavoidable unless you stream line by line, and it is already the biggest allocation in the eager version.',
              tone: 'text',
            },
            {
              name: 'findall',
              tool: 're.findall',
              in: 'one str object of 2.0 MB',
              out: 'a list of 48,000 str objects',
              detail: 're.findall is eager by specification: it must return a list. Forty-eight thousand small strings, each with about 50 bytes of object overhead, is roughly 2.4 MB that exists only so it can be thrown away.',
              tone: 'data',
            },
            {
              name: 'map',
              tool: 'map(int, ...)',
              in: 'a list of 48,000 str objects',
              out: 'a map object — nothing computed yet',
              detail: 'Here the eager version stops being a list and becomes a pipeline. map is lazy, so this step is free, but the list from the previous step is still fully in memory underneath it.',
              tone: 'code',
            },
            {
              name: 'sum',
              tool: 'sum',
              in: 'a map object — nothing computed yet',
              out: '5,984,210 — the answer',
              detail: 'sum pulls from the map, the map pulls from the list. The list is not freed as it is consumed — a list iterator holds a reference to the whole list until it is exhausted, so all 48,000 strings stay alive until the final element. Peak memory was set one stage ago, at the list.',
              tone: 'ok',
            },
            {
              name: 'Stream it instead',
              tool: 'for line in f',
              in: '5,984,210 — the answer',
              out: 'the same 5,984,210, with an 8 KB buffer',
              detail: 'Iterating the file handle yields one line at a time, so a generator expression never builds a 48,000-element list. Peak extra memory is one line. The result is byte-for-byte identical and the cost of the wrong choice was paid before the sum ever started.',
              tone: 'heap',
            },
          ],
          artifacts: {
            'access.log (2.0 MB)': '66.44.12.9 - - [10/Mar/2026:03:14:22 +0000] "GET /api/v1/orders HTTP/1.1" 200 4096\n66.44.12.9 - - [10/Mar/2026:03:14:23 +0000] "GET /api/v1/items HTTP/1.1" 200 8192\n203.0.113.7 - - [10/Mar/2026:03:14:25 +0000] "GET /api/v1/orders HTTP/1.1" 404  271\n...',
            'a list of 48,000 str objects': '>>> codes = re.findall(r\'" (\\d{3}) \', text)\n>>> len(codes), len(text)\n(48000, 2_0_48_576)\n>>> sys.getsizeof(codes[0])\n52\n>>> sys.getsizeof(codes)          # the list of pointers alone\n394,568\n>>> 48000 * 52 + 394_568        # objects plus the list\n2,889,568  bytes  ≈ 2.8 MB',
            'a map object — nothing computed yet': '>>> doubled = map(int, codes)\n>>> doubled\n<map object at 0x7f9c1c0a5e10>\n\n# The REPL called repr, which is not iteration.\n# Nothing has been converted yet. This is what "lazy" looks like:\n# the work exists only as a plan.',
            '5,984,210 — the answer': '# The lazy pipeline, line by line, 48,000 times:\n#   next(map)      -> pull the next str from codes[ ]\n#   int(str)       -> make one small int, that str is no longer\n#                     referenced and can be collected\n#   running_total += that int\n#\n# The int objects are short-lived. The str objects are NOT:\n# every one of them is still referenced by the list for the\n# whole 48,000 iterations. Only the list holding them is the\n# difference from the eager version — and it is the whole\n# 2.4 MB.',
            'the same 5,984,210, with an 8 KB buffer': 'import re\n\nSTATUS = re.compile(r\'" (\\d{3}) \')\n\n\ndef total_status_codes(path):\n    """Sum the HTTP status codes in a log, in constant memory."""\n    total = 0\n    with open(path, encoding="utf-8", errors="replace") as handle:\n        for line in handle:            # one line at a time, 8 KB buffer\n            match = STATUS.search(line)\n            if match:\n                total += int(match.group(1))\n    return total\n\n\ntotal_status_codes("access.log")   # 5,984,210',
          },
        }),
        b.lead('yield from, and a preview of send()'),
        b.md(`Delegating one iterable to another is what \`yield from\` is for. It is one line instead of a for loop, and it also forwards \`send\`, \`throw\` and \`close\` to the sub-generator, which a bare \`for\` does not.

\`\`\`python
def countdown(n):
    """Yield n down to 1."""
    while n > 0:
        yield n
        n -= 1


def double_chain(first, second):
    """Yield 2*x for every x in both sources, in order."""
    yield from (2 * x for x in first)
    yield from (2 * x for x in second)


print(list(double_chain(countdown(2), countdown(3))))
# [4, 2, 6, 4, 2]
\`\`\`

The first form is clear, correct, and has no forwarding. The second is shorter, and if the sub-generators are generators rather than plain lists it also makes \`send()\` work through the delegation, which is how the \`yield from\` machinery in coroutine libraries is written.

\`send()\` turns a generator into something like a coroutine: you can push a value *into* a suspended frame, and it arrives as the result of the \`yield\` expression that suspended it.

\`\`\`python
def echo():
    """A generator that reports whatever is sent into it."""
    while True:
        received = yield
        print(f"got {received!r}")


gen = echo()
next(gen)              # run to the first yield, value discarded
gen.send("hello")      # 'got \'hello\''
gen.send(42)           # 'got 42'

gen.close()            # GeneratorExit is thrown in; the frame unwinds
\`\`\`

This is how generators became the basis of Python async: \`async def\` is, under the hood, a generator that is allowed to yield, and the event loop resumes it by calling \`send\` or \`throw\` on it. You do not need \`send()\` to write a normal generator, and this is a preview, not a requirement — but recognising the machinery later is the difference between "coroutines are magic" and "a coroutine is a frame you can push a value into".`),
        b.md(`## Memory, and when a list is simply the right answer

A generator's frame holds every local variable between steps, so a generator is **not free**. It costs one suspended frame per live generator, which is why \`[g for g in gen]\` on a large source is a list and \`list(generator())\` on a million items is a list too.

The honest comparison:

| | List | Generator |
| --- | --- | --- |
| Memory | O(n) — every result alive at once | O(1) per item, plus one frame |
| Re-iterable | Yes, as many times as you like | **No** — one pass, then empty |
| \`len()\` | \`len(xs)\` | \`TypeError\`; use \`sum(1 for _ in xs)\` |
| Indexing | \`xs[0]\`, \`xs[-1]\` | not supported |
| Slicing | \`xs[1:4]\` | not supported (except \`itertools.islice\`) |
| Slower per item | no | yes — each \`next()\` is a Python-level round trip |
| Best for | small, re-used, random-access | large, streamed, or infinite |

Three rules of thumb:

- **If the result is small and you will look at it more than once, build a list.** \`[x for x in gen]\` costs almost nothing for 50 items and buys you \`len\`, indexing, sorting and a second pass.
- **If the source is large, unknown, or infinite, stream it.** That is the entire reason the generator expression exists.
- **If you are unsure, measure the source, not the result.** \`len(source)\` if it is a sized container; \`sum(1 for _ in source)\` if it is a generator you have not consumed yet.`),
        b.tip(
          'Three standard-library generators worth knowing by name',
          '`itertools.count(start, step)` for an unbounded count, `itertools.cycle(iterable)` to repeat forever (do not materialise it), and `itertools.islice(it, start, stop)` to take a window. Together they cover most of what people write `while True` loops for. `itertools.pairwise(seq)` (3.10+) gives you overlapping pairs, which is the clean way to write a sliding-window difference.'
        ),
        b.warn(
          'The exhausted-generator bug, in its final form',
          'This one line is worth writing on a sticky note: `data = (x for x in range(5))` then `a = [x for x in data]` then `b = [x for x in data]` gives `[0, 1, 2, 3, 4]` and then `[]`. A generator is a one-shot consumable. If two functions need the same values, either call the generator function twice, or do `data = list(gen)` once and hand the list to both. And note that this only bites for *generators* — a list comprehension over a list, or a for loop over a list, can be repeated freely.'
        ),
        b.checklist('An iteration routine that works', [
          'Know whether your source is a sequence, an iterable, or an iterator before you loop it',
          'Iterators are one-shot: if two callers need the values, call the generator function twice or materialise a list once',
          'Never `list()` an unbounded iterator such as `itertools.count()`, `cycle()`, or a `while True` generator — that line never returns',
          'Use `itertools.islice()` to take a bounded window from an endless iterator',
          'Prefer a generator expression over a list comprehension when you only iterate the result once',
          'Materialise deliberately with `list()`, `sorted()`, `dict()`, or `set()` when you need indexing, `len`, or a second pass',
          'Pass `strict=True` to `zip()` so mismatched lengths are a loud error rather than silent truncation',
          'Check the type before reaching for a built-in: `iter(x) is x` tells you whether `x` is its own iterator',
          'Reach for `itertools` (`groupby`, `product`, `combinations`, `accumulate`, `zip_longest`) before writing nested loops by hand',
        ]),
        b.resources('Iteration and comprehensions, further reading', [
          { label: 'The itertools documentation — every iterator, with the recipes section', url: 'https://docs.python.org/3/library/itertools.html' },
          { label: 'Data structures: list, tuple, dict, set and the sequence protocols', url: 'https://docs.python.org/3/tutorial/datastructures.html' },
          { label: 'Functional programming tools: map, filter, zip, sorted and reduce', url: 'https://docs.python.org/3/library/functions.html' },
        ]),
      ],
      questions: [
        [
          'What exactly does a `for` loop do with any iterable?',
          [
            'It converts the iterable to a list, then indexes it',
            'It calls iter() once, then __next__() repeatedly until StopIteration',
            'It uses the C-level itemgetter protocol, which is faster than __next__',
            'It calls __len__ to decide how many iterations to run',
          ],
          1,
          'A for loop is a two-method protocol. Everything the language provides — lists, dicts, files, sets, generators — implements it, which is why a for loop over all of them is the same code.',
        ],
        [
          'When you call a function whose body contains `yield`, when does the body actually run?',
          [
            'Immediately, up to the first yield',
            'Not until the generator is advanced with next() or iterated',
            'At import time, once the module is loaded',
            'When the function object is garbage collected',
          ],
          1,
          'The call creates a generator object holding a suspended, unstarted frame. Each `next()` resumes it to the next yield and freezes it again, which is why an infinite generator is safe and why calling one twice runs the body twice.',
        ],
        [
          'What happens when you exhaust a generator and call next() on it again?',
          [
            'The generator restarts from the beginning',
            'It raises StopIteration again, every time, forever',
            'It returns None',
            'It raises RuntimeError',
          ],
          1,
          'An iterator is permanently exhausted once its source runs out. That is why a generator can only be iterated once, and why `[x for x in gen]` twice gives data and then an empty list.',
        ],
        [
          'Why is `zip(a, b, strict=True)` worth passing even when you believe the lengths match?',
          [
            'It makes zip faster',
            'It turns the silent truncation at the shorter input into a ValueError that names the mismatch',
            'It allows more than two iterables',
            'It converts the result to a list',
          ],
          1,
          'zip normally stops at the shortest input without complaint, so a length mismatch is a data-loss bug that surfaces days later. `strict=True` fails at the call site instead, naming which argument was short.',
        ],
      ],
    },
  ]
);
