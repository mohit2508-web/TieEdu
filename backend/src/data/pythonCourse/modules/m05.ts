// Module 5 — Lists and Tuples.
//
// Two properties of the list explain most of the debugging time beginners spend
// on it: a list holds *references* rather than values, and roughly half the list
// methods mutate in place and return None rather than handing back a new list.
//
// The module ends with tuples, which exist so that you can say "this must not
// change" and have the interpreter enforce it for you.

import { mod } from '../blocks';

export const M5 = mod(
  'crs-python-programming',
  'py-m5',
  5,
  'Module 5 — Lists and Tuples',
  'How a list really works, which methods change it in place, and when a tuple is the better answer.',
  [
    {
      title: 'Lists: creation, indexing, slicing, mutation',
      summary: 'A list is a mutable row of references. Indexing, slicing, slice assignment, and why two names can be one list.',
      duration: 16,
      build: (b) => [
        b.md(`## A list is a row of references, not a row of values

\`[1, 2, 3]\` looks like three integers sitting side by side. It is not. It is one small object holding **three references**, and each reference points at an integer object living somewhere else entirely.

That distinction is invisible right up until it costs you an afternoon, and then it explains everything:

- Lists are **resizable**, so the references cannot live inside the list object — they sit in a separate block that gets copied and grown. Every performance property of a list follows from that.
- Two names can point at the *same* list, so "I changed the list" is ambiguous until you say which list.
- Copying a list copies the references, not the things they point at.

None of that is a caveat to memorise. It is one mental model, and the rest of this lesson falls out of it.

## Building one

\`\`\`python
empty = []                      # the empty list
scores = [72, 91, 45, 88, 60]  # a literal
chars = list("hey")             # ['h', 'e', 'y']
one_item = ["hey"]              # a list containing the single string "hey"
\`\`\`

\`list(x)\` takes any **iterable** — anything a \`for\` loop can walk — and materialises it as a list. On a string that means characters, which is the trap everyone hits exactly once: \`list("hey")\` is three one-character strings, while \`["hey"]\` is a list holding the word.

\`list(5)\` is a \`TypeError: 'int' object is not iterable\`. Lists are built from iterables only, and an int is not one. The error message is unusually good; read it rather than guessing.

## Indexing

\`\`\`python
scores = [72, 91, 45, 88, 60]

scores[0]     # 72
scores[4]     # 60
scores[-1]    # 60   <- the last element
scores[-2]    # 88
scores[5]     # IndexError: list index out of range
scores[1.0]   # TypeError: list indices must be integers or slices, not float
\`\`\`

Negative indices count back from the end: index \`-1\` is \`len(x) - 1\`. Python did that arithmetic for you so you never need a "from the end" syntax. Out-of-range indexing **raises** rather than returning a placeholder, because a silent wrong answer is worse than a stopped program.

## Slicing

\`\`\`python
scores = [72, 91, 45, 88, 60]

scores[1:3]    # [91, 45]    start included, stop excluded
scores[:2]     # [72, 91]    an omitted start means 0
scores[3:]     # [88, 60]    an omitted stop means len
scores[:]      # [72, 91, 45, 88, 60]   a shallow copy
scores[::2]    # [72, 45, 60]           every other element
scores[::-1]   # [60, 88, 45, 91, 72]   a reversed copy
scores[-2:]    # [88, 60]
scores[1:99]   # [91, 45, 88, 60]  slices clamp, they never raise
\`\`\`

The stop index is exclusive because it is the index *after* the last element you want. That single choice is what lets \`a[i:j]\` and \`b[j:]\` tile a list with no overlap and no gap, which is the most useful property of the whole syntax.

Slices clamp instead of raising, which is a deliberate difference from indexing. Asking for \`scores[1:99]\` is a reasonable question when you do not know the length, and "everything from 1 onwards" is the only sensible reply.

## Assigning to a slice

This is the one that bites, because it is the only way to change a list's length without calling a method:

\`\`\`python
data = [1, 2, 3, 4, 5]
data[1:3] = [20, 30]
print(data)                 # [1, 20, 30, 4, 5]        same size in, same size out

data = [1, 2, 3, 4, 5]
data[1:3] = [20, 30, 40, 50]
print(data)                 # [1, 20, 30, 40, 50, 4, 5]   the list GREW by 2

data = [1, 2, 3, 4, 5]
data[1:3] = [20]
print(data)                 # [1, 20, 4, 5]            the list SHRANK by 1

data = [1, 2, 3]
data[5:6] = ["x"]
print(data)                 # [1, 2, 3, 'x']           slices clamp, so this appends
\`\`\`

Read it as *delete the slice, then splice in whatever you gave me*. The list never checks that the replacement matches the removed length. \`data[i] = x\` cannot do this, because if \`i\` is past the end there is no slot to write into, and Python raises rather than guesses.

## \`del\`

\`\`\`python
data = [10, 20, 30, 40]
del data[1]
print(data)          # [10, 30, 40]
del data[:]
print(data)          # []
del data
print(data)          # NameError: name 'data' is not defined
\`\`\`

That last line is the lesson. \`del data\` removes the **name**, not the list. Any other name bound to the same list still holds it, and the list survives until the last reference goes away.

## \`+\` and \`+=\` are not the same operation

\`\`\`python
a = [1, 2]
b = a + [3]        # a brand new list object: [1, 2, 3]
print(a, b)        # [1, 2] [1, 2, 3]

a = [1, 2]
a += [3]           # __iadd__ -> extend in place, no new object
print(a)           # [1, 2, 3]
\`\`\`

\`+\` builds a third list and hands back a reference to it. \`+=\` calls the list's in-place extend, which grows the original object. For a list of a few hundred numbers the difference is invisible. For a list of a few hundred thousand rows, or one that somebody else holds a reference to, it is the difference between an optimisation and a bug.

The rule underneath covers every type: \`x += y\` means "mutate me if my type supports it, otherwise build a new object and rebind the name". Integers do not support mutation, so \`x = 5; x += 1\` rebinds \`x\` to a new \`6\` rather than modifying anything. Strings and tuples *do* support in-place concatenation, so \`s += "!"\` grows the string object whenever the reference count allows it.

## Aliasing: two names, one list

\`\`\`python
original = [3, 1, 2]
backup = original          # NOT a copy — two names, one list

backup.append(0)
print(original)            # [3, 1, 2, 0]   the "backup" is not a backup
print(backup is original)  # True
\`\`\`

\`is\` compares identity (same object); \`==\` compares value (looks the same). \`backup is original\` is \`True\` because both names hold one list object. The animation below walks through exactly this, because the prose version of "two names point at one thing" is the single most-repeated confusion in Python.

## Copying: three options, and the third one matters

\`\`\`python
import copy

flat = [1, 2, 3]
shallow = flat[:]                  # a new list, the same element objects
deep = copy.deepcopy(flat)         # a new list, and new element objects too

grid = [[1, 2], [3, 4]]
partial = grid[:]                  # the outer list is new...
partial[0].append(99)
print(grid)                        # [[1, 2, 99], [3, 4]]   the inner list is shared
\`\`\`

\`grid[:]\` copies the outer list. The inner lists are objects, and the copy holds references to *those same* inner lists. \`copy.deepcopy\` is the only one of the three that recurses all the way down.

## The shared-row trap

\`\`\`python
board = [[0] * 3 for _ in range(3)]
board[0][0] = 9
print(board)      # [[9, 0, 0], [0, 0, 0], [0, 0, 0]]   three independent rows

board = [[0] * 3] * 3
board[0][0] = 9
print(board)      # [[9, 0, 0], [9, 0, 0], [9, 0, 0]]   one row wearing three names
\`\`\`

The second version evaluates \`[0] * 3\` **once**, producing one row, and then repeats that *same object* three times. This is how you build a 1000x1000 grid that is really one row with a thousand names — a real production bug, because the program works fine right up until the second write.

\`[[] for _ in range(3)]\` builds a fresh object on every pass. The \`_\` is not decoration; it is what makes the comprehension produce a new list each time.

## Why anyone would care

- **A list is the workhorse of every script that reads, filters or transforms data.** File lines, \`json.load\` results, \`split()\` output, command-line arguments, database rows — all lists. Nearly every loop in the rest of this course iterates one.
- **The aliasing rules decide whether a function can modify its argument.** A function that does \`items.append(x)\` *will* change your list. A function that does \`items = items + [x]\` will not, and that one difference is the source of a whole family of "my function does nothing" reports.
- **Slicing is a sub-range, a reverse and a copy in one character of syntax.** Three lines of index arithmetic become one.
- **Knowing that a list holds references is what makes the rest of the course make sense** — why tuples can be dict keys and lists cannot, why \`[[0]*3]*3\` fails, and why mutating a function's default argument is a bug that only shows up on the second call.`),
        b.anim('passing', {
          title: 'Two names, one list: what backup = original actually does',
          badge: 'aliasing',
          steps: [
            {
              caption: 'One list object is created and bound to one name',
              note: 'A name is a label on a reference, and the reference points at the list. The list object is a completely separate thing.',
              panes: [
                {
                  title: 'Names in main()',
                  sub: 'what each name points at',
                  call: 'original = [3, 1, 2]',
                  cells: [
                    { label: 'original', value: 'id 0x7F2A', tone: 'ok' },
                    { label: 'backup', value: 'not bound yet', tone: 'null' },
                  ],
                },
                {
                  title: 'The list object',
                  sub: 'id 0x7F2A   type list',
                  call: 'ob_size = 2\nob_item -> [ ? , ? ]',
                  cells: [
                    { label: 'slot 0', value: '3', tone: 'int' },
                    { label: 'slot 1', value: '1', tone: 'int' },
                    { label: 'ob_size', value: '2', tone: 'data' },
                  ],
                },
              ],
            },
            {
              caption: 'backup = original copies the reference, not the list',
              note: 'The right-hand side is evaluated first: Python asks what object original names, finds the list, and binds backup to that same object. No new list is created anywhere.',
              panes: [
                {
                  title: 'Names in main()',
                  sub: 'what each name points at',
                  call: 'backup = original',
                  cells: [
                    { label: 'original', value: 'id 0x7F2A', tone: 'ok' },
                    { label: 'backup', value: 'id 0x7F2A', tone: 'warn' },
                  ],
                },
                {
                  title: 'The list object',
                  sub: 'id 0x7F2A   type list',
                  call: 'ob_size = 2\nob_item -> [ 3 , 1 ]',
                  cells: [
                    { label: 'slot 0', value: '3', tone: 'int' },
                    { label: 'slot 1', value: '1', tone: 'int' },
                    { label: 'refcount', value: '2 names', tone: 'data' },
                  ],
                },
              ],
            },
            {
              caption: 'backup.append(0) resizes the one shared list',
              note: 'There is only one list in the program, so there is only one list to grow. Spare capacity at the end of the slot array gets used first, which is exactly why append is so cheap.',
              panes: [
                {
                  title: 'Names in main()',
                  sub: 'what each name points at',
                  call: 'backup.append(0)',
                  cells: [
                    { label: 'original', value: 'id 0x7F2A', tone: 'ok' },
                    { label: 'backup', value: 'id 0x7F2A', tone: 'warn' },
                  ],
                },
                {
                  title: 'The list object',
                  sub: 'id 0x7F2A   type list',
                  call: 'ob_size = 3\nob_item -> [ 3 , 1 , 0 ]',
                  cells: [
                    { label: 'slot 0', value: '3', tone: 'int' },
                    { label: 'slot 1', value: '1', tone: 'int' },
                    { label: 'slot 2', value: '0', tone: 'ok' },
                    { label: 'ob_size', value: '3', tone: 'data' },
                  ],
                },
              ],
            },
            {
              caption: 'original sees the change, because it IS the change',
              note: 'Printing original gives [3, 1, 2, 0]. The "backup" is not a backup; it is a second handle on the same object. This is exactly how a function that mutates an argument surprises its caller.',
              panes: [
                {
                  title: 'Names in main()',
                  sub: 'what each name points at',
                  call: 'print(original)',
                  cells: [
                    { label: 'original', value: '[3, 1, 2, 0]', tone: 'ok' },
                    { label: 'backup', value: '[3, 1, 2, 0]', tone: 'warn' },
                  ],
                },
                {
                  title: 'The list object',
                  sub: 'id 0x7F2A   type list',
                  call: 'ob_size = 3\nob_item -> [ 3 , 1 , 0 ]',
                  cells: [
                    { label: 'slot 0', value: '3', tone: 'int' },
                    { label: 'slot 1', value: '1', tone: 'int' },
                    { label: 'slot 2', value: '0', tone: 'ok' },
                    { label: 'ob_size', value: '3', tone: 'data' },
                  ],
                },
              ],
            },
            {
              caption: 'backup[:] is what a real copy would have looked like',
              note: 'The slice builds a second list object with its own slot array. The integers are still shared, which is harmless because integers are immutable — but a list-of-lists would not be.',
              panes: [
                {
                  title: 'Names in main()',
                  sub: 'what each name points at',
                  call: 'backup = original[:]',
                  cells: [
                    { label: 'original', value: 'id 0x7F2A', tone: 'ok' },
                    { label: 'backup', value: 'id 0x7F4B', tone: 'ok' },
                  ],
                },
                {
                  title: 'The list object',
                  sub: 'id 0x7F2A   type list   (untouched)',
                  call: 'ob_size = 3\nob_item -> [ 3 , 1 , 0 ]',
                  cells: [
                    { label: 'slot 0', value: '3', tone: 'int' },
                    { label: 'slot 1', value: '1', tone: 'int' },
                    { label: 'slot 2', value: '0', tone: 'int' },
                    { label: 'refcount', value: '1 name', tone: 'data' },
                  ],
                },
              ],
            },
          ],
        }),
        b.lead('Index and slice syntax, in one table'),
        b.table(
          'What each expression does to scores = [72, 91, 45, 88, 60]',
          ['Expression', 'Result', 'The rule'],
          [
            ['`scores[0]`', '`72`', 'Index 0 is the first element'],
            ['`scores[-1]`', '`60`', 'Negative indices count back from the end; -1 is the last'],
            ['`scores[5]`', '`IndexError`', 'Indexing past the end raises rather than guessing'],
            ['`scores[1:3]`', '`[91, 45]`', 'Start is included, stop is excluded'],
            ['`scores[:2]`', '`[72, 91]`', 'An omitted start means 0'],
            ['`scores[3:]`', '`[88, 60]`', 'An omitted stop means len(scores)'],
            ['`scores[::2]`', '`[72, 45, 60]`', 'A step of 2 keeps every other element'],
            ['`scores[::-1]`', '`[60, 88, 45, 91, 72]`', 'A negative step walks the list backwards'],
            ['`scores[1:99]`', '`[91, 45, 88, 60]`', 'Slices clamp to the list; they never raise'],
            ['`data[1:3] = [7]`', '`[1, 7, 4, 5]`', 'Delete the slice, then splice the new values in'],
          ]
        ),
        b.code(
          `# slicing.py — a realistic cleanup pass over a raw list
raw = ["  72 ", "91", "45", "  88", "60  ", "45", ""]

cleaned = [int(field.strip()) for field in raw if field.strip()]
print(cleaned)                    # [72, 91, 45, 88, 60, 45]

# Slices are how you take a sub-range without writing a loop
first_half = cleaned[:3]
second_half = cleaned[3:]
print(first_half, second_half)    # [72, 91, 45] [88, 60, 45]

# reversed() walks backwards without copying; slicing a copy does copy
print(list(reversed(cleaned)))    # [45, 60, 88, 45, 91, 72]

# Slice assignment deletes then inserts, so the list resizes freely
cleaned[1:3] = []
print(cleaned)                    # [72, 88, 60, 45]

# insert at a position: everything from there right shifts by one
cleaned.insert(2, 99)
print(cleaned)                    # [72, 88, 99, 60, 45]

# A comprehension is a list built by a loop you did not have to write.
# The shape is [expression for item in iterable if condition].
lengths = [len(word) for word in ["ada", "grace", "alan"]]
print(lengths)                    # [3, 5, 4]

# The condition goes last and filters, so the expression never sees rejected items.
evens = [n * n for n in range(10) if n % 2 == 0]
print(evens)                      # [0, 4, 16, 36, 64]

# Flattening one level: nested for clauses run left to right, innermost is fastest.
pairs = [(x, y) for x in "ab" for y in (1, 2)]
print(pairs)                      # [('a', 1), ('a', 2), ('b', 1), ('b', 2)]

# Keep the original order while removing duplicates — the trick is a dict.
xs = [3, 1, 3, 2, 1, 4]
print(list(dict.fromkeys(xs)))    # [3, 1, 2, 4]
`,
          'slicing.py'
        ),
        b.code(
          `# aliases.py — the mutable-default and shared-row bugs, runnable
# BUG 1: the default list is built ONCE, when def is executed.
def add_item(item, bucket=[]):
    bucket.append(item)
    return bucket

print(add_item("a"))             # ['a']
print(add_item("b"))             # ['a', 'b']  <- "a" reappears
# The fix is None, which forces a fresh list on every call.
def add_item_fixed(item, bucket=None):
    if bucket is None:
        bucket = []
    bucket.append(item)
    return bucket

# BUG 2: the inner list is evaluated once, then named three times.
board = [[0] * 3] * 3
board[1][0] = 9
print(board)                      # [[9,0,0],[9,0,0],[9,0,0]] — all three rows

# FIX: a comprehension re-runs the inner expression on every pass.
board = [[0] * 3 for _ in range(3)]
board[1][0] = 9
print(board)                      # [[0,0,0],[9,0,0],[0,0,0]] — independent

# BUG 3: slicing copies the outer list, but not what is inside it.
original = [[1], [2]]
shallow = original[:]
deep = original[:]
deep[0].append(99)
print(original)                   # [[1, 99], [2]]  <- shallow copy shared the row

# FIX for nested mutation: rebuild the rows, don't just copy the container.
deep = [row[:] for row in original]
deep[0].append(99)
print(original)                   # [[1, 99], [2]]  <- already mutated above, so
                                  # build from a clean list to see the difference
clean = [[1], [2]]
independent = [row[:] for row in clean]
independent[0].append(99)
print(clean)                      # [[1], [2]]  <- untouched
`,
          'aliases.py'
        ),
        b.warn(
          'The bug you will meet at 2am',
          '`board = [[0] * 3] * 3` builds ONE row and gives it three names, so writing to `board[1][0]` also changes `board[0][0]` and `board[2][0]`. Always build a fresh object per row: `[[0] * 3 for _ in range(3)]`. The same trap applies to `[[]] * n`, `[{}] * n` and `[None] * n`.'
        ),
        b.tip(
          'Read the shape, not the words',
          'When you see `x = y`, ask what `y` names. If `y` is a list, a dict, a set or any other mutable object, the new name is a second handle on the same thing. `x[:]`, `x.copy()` and `copy.copy` buy a new container; `copy.deepcopy` buys new everything. Choosing between them is a design decision, not a detail.'
        ),
        b.diagram(
          'Which copy do I actually need?',
          `flowchart TD
    A["I need a second version of a<br/>mutable container"] --> B{"Do the nested elements<br/>need their own copies?"}
    B -->|"No — one level of structure"| C["x[:] or x.copy()<br/>new container, shared elements"]
    B -->|"Yes — nested lists, dicts, objects"| D["copy.deepcopy(x)<br/>new container, new everything"]
    C --> E{"Will any code mutate<br/>the nested elements?"}
    E -->|"Never"| F["Shallow is enough, and costs<br/>O(size) rather than O(all nodes)"]
    E -->|"Sometimes"| G["Be disciplined, or pay for one<br/>deep copy at the boundary"]
    D --> H["Safe by default, but it will not<br/>duplicate open files or sockets"]`
        ),
        b.anim('memory', {
          title: 'What a list object is: a small header plus a separate array of references',
          badge: 'list internals',
          base: 140737488355328,
          cell_bytes: 8,
          cells: [
            { bytes: ['01 00 00 00 00 00 00 00'], label: 'refcnt', note: 'How many names point at this list. Starts at 1.', tone: 'data' },
            { bytes: ['03 00 00 00 00 00 00 00'], label: 'size', note: 'How many slots are in use right now.', tone: 'int' },
            { bytes: ['04 00 00 00 00 00 00 00'], label: 'alloc', note: 'How many slots are reserved. CPython over-allocates so that append is cheap.', tone: 'pad' },
            { bytes: ['50 21 7F 00 00 00 00 00'], label: 'ob_item', note: 'A pointer to the separate array of references.', tone: 'ptr' },
            { bytes: ['A8 07 55 00 00 00 00 00'], label: 'slot 0', note: 'A reference to the int object 10.', tone: 'int' },
            { bytes: ['B8 07 55 00 00 00 00 00'], label: 'slot 1', note: 'A reference to the int object 20.', tone: 'int' },
            { bytes: ['C8 07 55 00 00 00 00 00'], label: 'slot 2', note: 'A reference to the int object 30.', tone: 'int' },
            { bytes: ['00 00 00 00 00 00 00 00'], label: 'slot 3', note: 'Spare. A zero here means unused, not "the number zero".', tone: 'pad' },
          ],
          steps: [
            {
              caption: 'scores = [10, 20, 30] creates one object plus a slot array',
              note: 'The first four cells are the list object itself. The last four are a separate allocation holding four references. The three ints live somewhere else entirely — the slots point at them, they do not contain them.',
              vars: [
                { name: 'scores', type: 'list', value: '[10, 20, 30]', pointsTo: 0, tone: 'ok' },
              ],
              highlight: [0, 1, 2, 3, 4, 5, 6, 7],
            },
            {
              caption: 'alias = scores binds a second name to the same object',
              note: 'Only refcnt changes. The slot array is not duplicated, and there is still exactly one list in the program.',
              cells: {
                '0': { bytes: ['02 00 00 00 00 00 00 00'], note: 'refcnt 1 -> 2. One more name points here.' },
              },
              vars: [
                { name: 'scores', type: 'list', value: '[10, 20, 30]', pointsTo: 0, tone: 'ok' },
                { name: 'alias', type: 'list', value: '[10, 20, 30]', pointsTo: 0, tone: 'warn' },
              ],
              highlight: [0],
            },
            {
              caption: 'alias.append(40) writes into the spare slot',
              note: 'size becomes 4 but alloc stays 4, so nothing is reallocated and nothing is copied. That one fact is the whole difference between append being O(1) and insert(0, x) being O(n).',
              cells: {
                '1': { bytes: ['04 00 00 00 00 00 00 00'], note: 'size 3 -> 4.' },
                '7': { bytes: ['D8 07 55 00 00 00 00 00'], note: 'Slot 3 now holds a reference to the int 40.', tone: 'int' },
              },
              vars: [
                { name: 'scores', type: 'list', value: '[10, 20, 30, 40]', pointsTo: 0, tone: 'ok' },
                { name: 'alias', type: 'list', value: '[10, 20, 30, 40]', pointsTo: 0, tone: 'warn' },
              ],
              highlight: [1, 7],
            },
            {
              caption: 'Both names see four elements, and nothing was ever copied',
              note: 'This is the whole module in one picture. If you want an independent list, scores[:] builds a new header with refcnt 1 and a brand new slot array.',
              vars: [
                { name: 'scores', type: 'list', value: '4 slots in use', pointsTo: 0, tone: 'ok' },
                { name: 'alias', type: 'list', value: '4 slots in use', pointsTo: 0, tone: 'warn' },
                { name: 'copy = scores[:]', type: 'list', value: 'a separate object', tone: 'ok' },
              ],
              highlight: [0, 1, 3],
            },
          ],
        }),
        b.info(
          'Those are 64-bit values, and the layout is a CPython detail',
          'A list object is refcount, a type pointer, size, allocated, and a pointer to the item array, which is a separate block. The numbers above are illustrative — real values change with the build, the version, and what you put in. What does not change is the shape: a small header object, and a separate array of references that gets copied whenever the list outgrows its allocation.'
        ),
      ],
      questions: [
        [
          'You run `backup = original` where `original = [3, 1, 2]`. What exactly is `backup`?',
          [
            'A second, independent list object holding the same three values',
            'A second name bound to the very same list object that `original` names',
            'A read-only view over `original` that raises if you write to it',
            'A tuple of the three values, because lists cannot be aliased',
          ],
          1,
          'Assignment binds a name to an object. `original` names a list object, and `backup` now names that same object — nothing was copied. That is why `backup.append(0)` shows up when you print `original`, and why `backup is original` is `True`.',
        ],
        [
          'Given `board = [[0] * 3] * 3` followed by `board[0][0] = 9`, what does `print(board)` show?',
          [
            '`[[9, 0, 0], [0, 0, 0], [0, 0, 0]]`',
            '`[[9, 0, 0], [9, 0, 0], [9, 0, 0]]`',
            '`[[0, 0, 0], [0, 0, 0], [0, 0, 0]]`',
            '`IndexError: list assignment index out of range`',
          ],
          1,
          '`[0] * 3` is evaluated once, producing one inner list, and the outer `* 3` repeats that same object three times. All three rows are one list under three names, so a write to row 0 is a write to every row. `[[0] * 3 for _ in range(3)]` builds a new inner list on each pass and gives three independent rows.',
        ],
        [
          'If `data = [1, 2, 3, 4, 5]` and you run `data[1:3] = [7]`, what is `data`?',
          [
            '`[1, 2, 7, 4, 5]`',
            '`[1, 7, 3, 4, 5]`',
            '`[1, 7, 4, 5]`',
            '`IndexError: attempt to assign sequence of size 1 to extended slice of size 2`',
          ],
          2,
          'Slice assignment removes the slice (the 2 and 3 at indices 1 and 2) and then splices in whatever you supplied, resizing the list as needed. One element in means indices 3 and 4 shift left to become positions 2 and 3, giving `[1, 7, 4, 5]`.',
        ],
        [
          'What is the practical difference between `b = a + [3]` and `a += [3]` for a list?',
          [
            'None — they are two spellings of the same operation',
            '`+` builds a new list and leaves `a` alone; `+=` extends the original list object in place',
            '`+` extends in place; `+=` always builds a new list',
            '`+=` only works on tuples and raises TypeError on a list',
          ],
          1,
          'The list implements in-place add by extending itself, so `a += [3]` grows the very list `a` already names. `a + [3]` constructs a brand new list object and binds it to `b`, leaving `a` at its original length. The distinction is invisible on small lists and decisive on large ones.',
        ],
      ],
    },
    {
      title: 'List methods and the in-place vs returning distinction',
      summary: 'Every list method, what each one returns, what each one costs, and the one habit that prevents the whole class of bug.',
      duration: 18,
      build: (b) => [
        b.md(`## Two categories, and knowing which is which

Every list method falls into one of two boxes:

- **In-place methods** change the list and return \`None\`: \`append\`, \`extend\`, \`insert\`, \`remove\`, \`pop\`, \`clear\`, \`sort\`, \`reverse\`, and the in-place \`__iadd__\` behind \`+=\`.
- **Returning methods** leave the list alone and hand back a value: \`index\`, \`count\`, and — importantly — the *builtins* \`sorted()\` and \`reversed()\`.

The bug is always the same line:

\`\`\`python
scores = scores.sort()     # BUG
print(scores)              # None
\`\`\`

\`sort()\` did its job, reordered the list, and returned \`None\` — which you then assigned over \`scores\`. The list really is sorted; you just destroyed the only name it had. This falls out of Python's rule that **a method which mutates does not also return the object**, a rule that exists so \`append\` on a list of ten million items does not have to build a reference it does not need.

The fix is muscle memory: if the method name has no "find me" flavour, call it on its own line and never write \`x = lst.method(...)\`.

## The two operations worth knowing the cost of

\`\`\`python
queue = [1, 2, 3, 4, 5]
queue.insert(0, 0)     # O(n): every existing element shifts right by one
\`\`\`

Building a 100,000-element list with \`insert(0, x)\` performs about five billion slot moves. Append at the end and \`reverse()\` when you are done, or use a \`deque\`.

\`\`\`python
big = [x * 3 for x in range(200_000)]
print(3 in big)        # compares against every element with ==   -> O(n)
print(3 in set(big))   # hashes once, jumps to a bucket           -> O(1)
\`\`\`

\`in\` on a list is a linear scan. Membership testing is the operation you most want to be fast — you are asking "have I seen this before?" — and a list makes you pay for every element. This is the strongest argument for the set and dict in the next module.

## \`sort()\` versus \`sorted()\`

\`\`\`python
scores = [72, 91, 45, 88, 60]

scores.sort()                 # in place, returns None
print(scores)                 # [45, 60, 72, 88, 91]

ordered = sorted(scores)      # a new list; scores is untouched
print(ordered is scores)      # False
\`\`\`

Use \`sort()\` when the list is yours and its order does not matter to anyone else. Use \`sorted()\` when you must preserve the original order — when the list is a data source, when a caller owns it, or when you are sorting one key of a wider record and need the records to stay where they are.

**Both are stable.** Stability means equal elements keep their original relative order, which sounds academic until you sort by last name and then expect first names to stay alphabetical within a family. Python guarantees it, so a two-pass sort works the way you would hope:

\`\`\`python
people = [("Hopper", "Grace"), ("Turing", "Alan"), ("Hopper", "Ada")]
people.sort(key=lambda p: p[0])              # group by surname
people.sort(key=lambda p: p[1])              # then by first name
print(people)
# [('Hopper', 'Ada'), ('Hopper', 'Grace'), ('Turing', 'Alan')]
\`\`\`

\`reverse=True\` is a *stable* reversal, which is almost always what you want — it never shuffles equal elements.

The \`key\` function is called **once per element**, before any comparisons happen. That is a performance fact, not merely a correctness one: \`sort(key=str.lower)\` does not lowercase the list twenty times. It also means \`key\` can be expensive if you let it be, and it means \`sort(key=len)\` is a complete one-liner for "shortest strings first".

## When to reach for a deque

\`\`\`python
from collections import deque

# A FIFO work queue: taking from the left is O(1), not O(n)
pending = deque(["resize", "email", "report"])
pending.append("deploy")        # add to the right
first = pending.popleft()       # take from the left in constant time
print(first, list(pending))     # resize ['email', 'report', 'deploy']

# deque(maxlen=N) is a fixed-size window that forgets its own history
window = deque(maxlen=3)
for n in range(1, 8):
    window.append(n)
print(list(window))             # [5, 6, 7]
print(window.full)              # True
\`\`\`

A \`deque\` supports \`append\`, \`appendleft\`, \`pop\`, \`popleft\` and \`rotate\` at both ends in constant time. A list has exactly one fast end, and it is the right-hand one. If your algorithm adds at one end and removes from the other, that is a queue, and \`list.pop(0)\` is the wrong tool. The trade is that a deque is not indexable and cannot be sorted in place.

## The aggregating builtins

\`\`\`python
nums = [4, -1, 7, 0]

min(nums)                       # -1
max(nums)                       # 7
sum(nums)                       # 10
sum(nums, start=100)            # 110
any(n < 0 for n in nums)        # True  — at least one is negative
all(n % 2 == 0 for n in nums)   # False — not all are even
len(nums)                       # 4

sum([])                         # 0
any([])                         # False
all([])                         # True
max([])                         # ValueError: max() arg is an empty sequence
\`\`\`

Two details worth memorising. \`any([])\` is \`False\` and \`all([])\` is \`True\`, because "at least one" is vacuously false for nothing and "all of nothing" is vacuously true — the same logic that makes an empty product equal 1. And \`max([])\` raises rather than inventing an answer.

Note the generator expressions: \`any(n < 0 for n in nums)\` never builds a list. It tests one element at a time and **short-circuits** on the first \`True\`, which is why \`any\` over a large list with an early match is fast and a flag-variable loop that always scans to the end is not.

## Why anyone would care

- **Most "my variable turned into None" reports in Python are this one habit.** Learning the in-place / returning split once is worth a lot.
- **\`in\` on a list is linear**, so any "have I already seen this?" loop is a performance bug waiting for enough data, and the fix is one word.
- **\`key=\` plus stability is how you sort real records** — by surname, case-insensitively, descending, ties handled correctly — instead of hand-rolling a comparison function.
- **\`any\` and \`all\` over generator expressions replace flag loops** that are longer, allocate a list, and cannot short-circuit.`),
        b.anim('trace', {
          title: 'Six lines, three list methods, and one silent None',
          badge: 'in place vs returning',
          code: `prices = [10, 3, 25, 3, 7]
prices.remove(3)
prices.insert(0, 99)
cheapest = min(prices)
result = prices.sort()
print(prices, cheapest, result)`,
          steps: [
            {
              caption: 'The list literal is created and bound',
              note: 'One object holding four references. Two of those references point at the same cached int 3, which is harmless here precisely because integers are immutable.',
              line: 1,
              vars: [{ name: 'prices', value: '[10, 3, 25, 3, 7]', tone: 'ok' }],
              output: '',
            },
            {
              caption: 'remove(3) deletes only the FIRST match',
              note: 'remove scans from the left, deletes the first item equal to 3, and returns None. The second 3 survives. There is no remove-all — that is what a list comprehension is for.',
              line: 2,
              vars: [{ name: 'prices', value: '[10, 25, 3, 7]', tone: 'ok' }],
            },
            {
              caption: 'insert(0, 99) shifts all four elements right',
              note: 'There was no spare slot at the front, so every element had to move one position along. That is O(n) work for one insertion, and it is why insert(0, x) inside a loop is quadratic.',
              line: 3,
              vars: [{ name: 'prices', value: '[99, 10, 25, 3, 7]', tone: 'ok' }],
            },
            {
              caption: 'min() is a builtin, so it returns a value',
              note: 'min does not touch the list. It walks it, keeps the smallest, and hands that back. Same for max, sum, any and all — those compute, they do not mutate.',
              line: 4,
              vars: [
                { name: 'prices', value: '[99, 10, 25, 3, 7]', tone: 'ok' },
                { name: 'cheapest', value: '3', tone: 'int' },
              ],
            },
            {
              caption: 'sort() reorders the list and returns None',
              note: 'The list is sorted. The return value is None because sort mutated the object you already had, so there is nothing useful to hand back.',
              line: 5,
              vars: [
                { name: 'prices', value: '[3, 7, 10, 25, 99]', tone: 'ok' },
                { name: 'cheapest', value: '3', tone: 'int' },
              ],
            },
            {
              caption: 'So result is None, not the sorted list',
              note: 'This is the bug in one line. Writing `prices = prices.sort()` is the same mistake, and it stays invisible until some later line tries to use prices.',
              line: 5,
              vars: [
                { name: 'prices', value: '[3, 7, 10, 25, 99]', tone: 'ok' },
                { name: 'cheapest', value: '3', tone: 'int' },
                { name: 'result', value: 'None', tone: 'warn' },
              ],
            },
            {
              caption: 'The print shows exactly what happened',
              note: 'The data is not corrupted — it really is sorted. The bug only destroyed your handle on it, so the TypeError arrives later, on a line that has nothing to do with sorting.',
              line: 6,
              vars: [
                { name: 'prices', value: '[3, 7, 10, 25, 99]', tone: 'ok' },
                { name: 'cheapest', value: '3', tone: 'int' },
                { name: 'result', value: 'None', tone: 'warn' },
              ],
              output: '[3, 7, 10, 25, 99] 3 None',
            },
          ],
        }),
        b.table(
          'The list API: what comes back, and what it costs',
          ['Method', 'Returns', 'Cost', 'What it does'],
          [
            ['`append(x)`', '`None`', 'O(1) amortised', 'Adds one item to the end'],
            ['`extend(it)`', '`None`', 'O(k)', 'Adds every item of an iterable'],
            ['`insert(i, x)`', '`None`', 'O(n)', 'Inserts before index i; everything from i right shifts'],
            ['`remove(x)`', '`None`', 'O(n)', 'Deletes the first item equal to x; ValueError if absent'],
            ['`pop()` / `pop(i)`', 'the removed item', 'O(1) / O(n)', 'Removes and returns an element; IndexError on an empty list'],
            ['`clear()`', '`None`', 'O(n)', 'Empties the list in place'],
            ['`index(x)`', 'an int', 'O(n)', 'Position of the first x; ValueError if absent'],
            ['`count(x)`', 'an int', 'O(n)', 'How many times x appears'],
            ['`sort(key=, reverse=)`', '`None`', 'O(n log n)', 'Reorders in place; stable; key is called once per element'],
            ['`reverse()`', '`None`', 'O(n)', 'Flips the order in place'],
            ['`copy()`', 'a new list', 'O(n)', 'A shallow copy — nested objects are still shared'],
            ['`sorted(x)` / `reversed(x)`', 'a new object', 'O(n log n) / O(1)', 'Builtins: they never touch the original'],
          ]
        ),
        b.code(
          `# clean.py — in-place versus returning, used the way it is meant to be
scores = [72, 45, 91, 88, 60, 45]

# WRONG: the list really is sorted, but you just overwrote your only handle on it
# scores = scores.sort()

# RIGHT: mutate, or ask for a new list. Be deliberate about which one.
scores.sort()                       # in place
ranked = sorted(scores)             # a second list; scores keeps its order
print(ranked)                       # [45, 45, 60, 72, 88, 91]
print(scores)                       # [45, 45, 60, 72, 88, 91]

# key= is called once per element, which is why this is fast and predictable
names = ["ada", "Grace", "alan", "Bea"]
names.sort(key=str.lower)
print(names)                        # ['ada', 'alan', 'Bea', 'Grace']

# Stability: equal keys keep their input order
rows = [("Hopper", 2), ("Turing", 1), ("Lovelace", 2), ("Hopper", 1)]
rows.sort(key=lambda r: r[1])
print(rows)
# [('Turing', 1), ('Hopper', 1), ('Hopper', 2), ('Lovelace', 2)]

# Count and locate without building anything extra
print(scores.count(45), scores.index(72))     # 2 3
`,
          'clean.py'
        ),
        b.anim('step', {
          title: 'Four list facts that decide how you write a loop',
          steps: [
            {
              title: 'append is O(1); insert(0, x) is O(n)',
              desc: 'CPython keeps spare capacity at the end of the slot array, so append usually writes into a slot that is already there. Inserting at the front has no spare room, so every existing element shifts one position right. Building a 100,000-element queue with insert(0, x) performs about five billion moves. Use append plus reverse, or a deque.',
              code_snippet: 'queue = deque(zeroed)\nfor x in items:\n    queue.appendleft(x)   # O(1) all the way down',
            },
            {
              title: '`in` is a linear scan; a set lookup is not',
              desc: '`x in list` compares x against every element with == until one matches, so a have-I-seen-this check over 200,000 items is 200,000 comparisons. A set hashes x once and jumps to a bucket. This is why de-duplication is a one-liner with a set and a comprehension exercise with a list.',
              code_snippet: 'unique = list(dict.fromkeys(items))   # keeps order, O(n)\nunique = list(set(items))          # may reorder',
            },
            {
              title: '`key=` is evaluated once per element, not once per comparison',
              desc: 'The sort computes the key for every element, stores it, then compares the stored keys. An expensive key function therefore costs n calls rather than n log n. If it is genuinely expensive, compute the key yourself and sort a list of (key, record) pairs instead of relying on a lambda.',
              code_snippet: 'rows.sort(key=lambda r: expensive_lookup(r.id))',
            },
            {
              title: 'Mutating methods return None on purpose',
              desc: 'append on a huge list should not pay to build a new reference to the list it just grew. The None return is the language steering you away from `x = lst.append(y)`, which is a bug in every case. Corollary: never write `x = lst.sort()`, `x = lst.reverse()`, or `x = lst.append(y)`.',
              code_snippet: 'items.append(row)          # right\nitems = items.append(row)    # wrong: items is None now',
            },
          ],
        }),
        b.code(
          `# queue.py — when a list is the wrong container
from collections import deque

# A list-only work queue: every pop(0) shifts every remaining element.
items = ["resize", "email", "report"]
nxt = items.pop(0)                 # O(n) — a list has one fast end, and it is not this one

# A deque has fast operations at both ends.
pending = deque(["resize", "email", "report"])
pending.append("deploy")          # O(1) on the right
first = pending.popleft()         # O(1) on the left
print(first, list(pending))       # resize ['email', 'report', 'deploy']

# maxlen makes it a rolling window that forgets its own history.
recent = deque(maxlen=3)
for n in range(1, 8):
    recent.append(n)
print(list(recent), recent.full)  # [5, 6, 7] True

# The trade: a deque cannot be indexed and cannot be sorted in place.
# recent[0] -> TypeError: 'deque' object is not subscriptable
# If you need all three, keep the deque and call sorted() on it when you need order.
`,
          'queue.py'
        ),
        b.checklist('Before you reach for a list method', [
          'Do I want to change this list, or get something new from it? That is `sort` versus `sorted`.',
          'Am I about to write `x = lst.something(...)`? If the method mutates, that is a bug.',
          'Am I inserting at the front inside a loop? I want `append` plus `reverse`, or a `deque`.',
          'Am I testing membership on a list that might get large? A set answers in constant time.',
          'Does the order of this list matter to anyone who does not own it? Then I want `sorted()`.',
          'Am I removing every copy of a value? `remove` only takes the first; a comprehension takes them all.',
        ]),
        b.tip(
          'A loop that only appends has a faster spelling',
          '`out = []` followed by `for x in data: out.append(f(x))` is fine, but `[f(x) for x in data]` skips the repeated attribute lookup and reads better once you are comfortable with comprehensions. Save the explicit loop for when the body has a condition or more than one statement.',
        ),
      ],
      questions: [
        [
          'What does `lst.sort()` return?',
          [
            'The list, now sorted, so you can chain another call onto it',
            'The number of elements it moved',
            '`None` — it sorted the list in place',
            'A new sorted list, leaving the original alone',
          ],
          2,
          'sort is an in-place method, so its only job is to reorder the object you already hold and it returns None. A new sorted list comes from the builtin `sorted(lst)`, which never touches the original. This is why `lst = lst.sort()` destroys your list.',
        ],
        [
          'Why is `lst.insert(0, x)` inside a loop a performance problem?',
          [
            'Because `insert` re-hashes every element',
            'Because every existing element has to shift one slot to the right, making n insertions O(n squared)',
            'Because inserting at index 0 is not allowed in Python',
            'Because `0` is not a valid index',
          ],
          1,
          'There is no spare capacity at the front of a list, so each insertion walks the whole array moving elements along. Doing that n times is n squared work — for 100,000 items that is around ten billion moves. Append to the end and reverse when you finish, or use a deque, which has a fast left end.',
        ],
        [
          'You sort a list of records by surname and then by first name. Which statement about the two sort calls is true?',
          [
            'The second sort discards the ordering from the first',
            'Only `sorted` is stable; `list.sort` is not',
            'Both are stable, so the second pass sorts within each surname group',
            'Neither is stable unless you pass `stable=True`',
          ],
          2,
          'Python guarantees that both `list.sort` and `sorted` are stable: equal elements keep their input relative order. That is what makes a two-pass sort work, and it is also what makes `reverse=True` safe — it reverses the order of groups without scrambling the members of each group.',
        ],
        [
          'You have a list of 200,000 integers and need to check whether a value has already been seen. What is the right move?',
          [
            'Call `lst.index(value)` inside a try block',
            'Use a set for the membership test, because `in` on a list is a linear scan',
            'Sort the list first, then binary search by hand',
            'Use `lst.count(value) > 0`, which is faster than `in`',
          ],
          1,
          '`x in list` compares x against every element with `==` until it finds a match, so it is O(n). A set hashes x once and looks the result up in a bucket, so it is O(1). `count` is also a linear scan, `index` only finds the first occurrence, and hand-rolled binary search on unsorted data is simply wrong.',
        ],
      ],
    },
    {
      title: 'Tuples, unpacking and immutability',
      summary: 'Why tuples exist, the single-element comma trap, unpacking patterns that read like the data they describe, and hashability.',
      duration: 15,
      build: (b) => [
        b.md(`## Why a second sequence type exists

A list is a growable sequence. A tuple is a sequence whose length is part of its type-level identity: it cannot be resized, and it cannot be edited. That single restriction buys four things.

**1. Tuples are hashable, so they can be dict keys and set members.** A list cannot, because a list is mutable and its hash would change under you. This is not a style rule; it is the mechanism.

\`\`\`python
locations = {(10, 20): "corner", (30, 40): "centre"}
print(locations[(10, 20)])        # corner

try:
    {(10, 20): "corner"}[[10, 20]] = "nope"
except TypeError as err:
    print(err)
# unhashable type: 'list'
\`\`\`

**2. Tuples are cheaper.** A list over-allocates so that \`append\` stays fast, and it stores a size that can change. A tuple is a fixed block: no spare capacity, no size field to update, nothing to copy on resize. A tuple of three small ints is measurably smaller and faster to build than the equivalent list.

**3. Unpacking works, and it is the real reason people like them.** A function that returns \`name, count\` hands you something you can destructure in one line, and the destructuring is a *check*: if the return has the wrong arity you get a \`ValueError\` immediately.

**4. They document themselves.** \`RGB_RED, RGB_GREEN, RGB_BLUE = 0.0, 1.0, 0.0\` says what the three values mean. Three separate assignments do not.

## The comma trap

\`\`\`python
not_a_tuple = (5)      # just the int 5 — parentheses are only grouping here
is_a_tuple = (5,)      # a tuple containing one value
also_a_tuple = 5,      # the comma alone makes a tuple; parentheses are optional
empty = ()             # the empty tuple
singletons = (5,) * 3  # (5, 5, 5) — a one-tuple is a useful building block
\`\`\`

\`(5)\` is exactly \`5\`. Python gives you no warning, which is why \`x = (input_value)\` in a "tuple-returning" function is a bug that only appears at the call site. The rule: **a one-element tuple needs the trailing comma.**

## Packing and unpacking

Unpacking is assignment with a tuple on the left:

\`\`\`python
point = (3, 7)
x, y = point            # x is 3, y is 7

a = b = 7              # chained assignment, also legal
first, second, third = 1, 2, 3
\`\`\`

If the shapes do not line up you get \`ValueError: not enough values to unpack (expected 3, got 2)\` or \`too many values to unpack (expected 2)\`. That error is a feature: it means a function contract was violated at the point of the call, not three statements later.

## The swap, and why it needs no temporary

\`\`\`python
a, b = b, a
\`\`\`

This works because Python evaluates the **entire right-hand side first**, packing \`(b, a)\` into a new tuple, and only then unpacks that tuple into the targets on the left. By the time \`a\` is assigned, both old values have already been read. In a language with lvalue assignment you would need a temporary variable; here the temporary is the tuple the interpreter had to build anyway.

The animation below steps through this, and the same evaluation order is what makes the next pattern work.

## Starred unpacking

\`*\` in a target collects everything that is left over into a new list:

\`\`\`python
head, *rest = [10, 20, 30, 40]
print(head, rest)                     # 10 [20, 30, 40]

*head, last = [10, 20, 30, 40]
print(head, last)                     # [10, 20, 30] 40

first, *middle, last = [1, 2, 3, 4, 5]
print(first, middle, last)            # 1 [2, 3, 4] 5

# The starred name is always a list, even when there is one element left
a, *b = [1, 2]
print(b)                              # [2]
\`\`\`

The middle-star form is the one that earns its keep. It is how you say "everything except the first and the last" without an index arithmetic bug, and it survives a list that is one element longer than you expected.

## Nested unpacking

A target can mirror the shape of the data:

\`\`\`python
records = [("ada", 36), ("alan", 41), ("grace", 45)]

# Peel apart the first record, one variable per field
name, age = records[0]
print(name, age)                      # ada 36

# Or destructure the whole list of records in one statement
for name, age in records:
    print(f"{name:5} is {age}")

# Nesting works too, and it flattens the names for you
matrix = [[1, 2], [3, 4]]
(a, b), (c, d) = matrix
print(a, b, c, d)                     # 1 2 3 4

# Mixing plain targets and stars
first, *rest = records
(head, head_age), *others = records
print(first[0], head, head_age, len(others))   # ada ada 36 2
\`\`\`

## What you get back from a function

Returning a tuple is the idiomatic shape for "several related values" and it is what most of the standard library does:

\`\`\`python
def min_max(numbers):
    """Return the smallest and largest value, or None for an empty input."""
    if not numbers:
        return None
    return min(numbers), max(numbers)

lo, hi = min_max([4, 9, 2])
print(lo, hi)                          # 2 9

best, worst = min_max([])              # TypeError: cannot unpack non-iterable NoneType
\`\`\`

The last line is a design decision you have to make: returning \`None\` for "no result" and then unpacking it gives you a \`TypeError\` on a line far from the function. Either return a tuple of \`None\`s, or make the caller check first. Both are fine — what is not fine is not having decided.

## \`tuple()\`, the immutable cousin of \`list()\`

\`\`\`python
from_tuple = tuple([1, 2, 3])          # (1, 2, 3) — a copy, not a lock
t = (1, 2, 3)

t[0] = 99                              # TypeError: 'tuple' object does not support item assignment
t.append(4)                            # AttributeError: 'tuple' object has no attribute 'append'
t + (4,)                               # (1, 2, 3, 4) — a NEW tuple
t * 2                                  # (1, 2, 3, 1, 2, 3) — also new
len(t), t[1], t[-1], t[1:]             # 3, 2, 3, (2, 3) — everything read-only works
\`\`\`

\`tuple(some_list)\` is a genuine, independent copy — the standard fix for "this function keeps changing my list" when the function only needs to read. The value is not that the elements are protected; it is that the **structure** is, which is what makes it hashable and cheap.

## \`namedtuple\`, the preview

A \`namedtuple\` is a tuple with names, so you get both immutability and attribute access:

\`\`\`python
from collections import namedtuple

Point = namedtuple("Point", ["x", "y"])
p = Point(3, 7)
print(p.x, p.y)                        # 3 7
print(p[0], p)                         # 3 Point(x=3, y=7)
print(p == (3, 7))                     # True — it is still a tuple
print(tuple(p))                        # (3, 7)

x, y = p                               # unpacking still works
\`\`\`

This is the shape you will meet again as \`dataclass\` later in the course, minus the methods. For a record with two to five fields, a \`namedtuple\` is lighter than almost anything else you could use.

## Why anyone would care

- **Tuples are the return type you will write most often**, and unpacking them is the reason functions read cleanly instead of returning a list and a parallel index.
- **Hashability is not academic.** Grid coordinates, database keys, cache keys, and "have I seen this pair?" checks all need tuples, and a list will raise \`TypeError\` in exactly those places.
- **Immutability is documentation.** A value nobody can change is a value every reader can trust, and the interpreter enforces it for free.
- **Starred and nested unpacking replace index arithmetic**, which is where off-by-one bugs live.`),
        b.anim('trace', {
          title: 'Unpacking step by step: the swap, the star, and the nest',
          badge: 'tuple targets',
          code: `a, b = 3, 7
print(a, b)
a, b = b, a
print(a, b)
head, *rest = [10, 20, 30, 40]
print(head, rest)
first, (x, y), last = [1, (2, 3), 4]
print(first, x, y, last)`,
          steps: [
            {
              caption: 'The literal 3, 7 is packed into a tuple, then unpacked',
              note: 'There is no tuple object left afterwards. The right-hand side builds one to hold the two values, then the left-hand side pulls them apart into two names.',
              line: 1,
              vars: [],
              output: '',
            },
            {
              caption: 'Both names are bound, and the print confirms the order',
              note: 'Targets bind left to right, so a takes the first element and b the second. Nothing here is positional by accident; the order is exactly the order of the names.',
              line: 2,
              vars: [
                { name: 'a', value: '3', tone: 'int' },
                { name: 'b', value: '7', tone: 'int' },
              ],
              output: '3 7',
            },
            {
              caption: 'The right-hand side is evaluated ENTIRELY before the left',
              note: 'Python reads b, reads a, packs the pair (7, 3) into a brand new tuple, and only then starts assigning. That is the whole trick: both old values were read before either name was touched.',
              line: 3,
              vars: [
                { name: 'a', value: '3', tone: 'int' },
                { name: 'b', value: '7', tone: 'int' },
              ],
            },
            {
              caption: 'So the swap needs no temporary variable',
              note: 'a becomes 7 and b becomes 3. In a language where assignment targets can be computed addresses you would still need a temp; here the tuple the interpreter had to build anyway is the temp.',
              line: 4,
              vars: [
                { name: 'a', value: '7', tone: 'ok' },
                { name: 'b', value: '3', tone: 'ok' },
              ],
              output: '3 7\n7 3',
            },
            {
              caption: 'The star target collects everything that is left over',
              note: 'rest takes every remaining element as a new list, in order. The starred name is always a list, never a tuple, even when exactly one element is left over.',
              line: 5,
              vars: [
                { name: 'a', value: '7', tone: 'int' },
                { name: 'b', value: '3', tone: 'int' },
                { name: 'head', value: '10', tone: 'int' },
                { name: 'rest', value: '[20, 30, 40]', tone: 'ok' },
              ],
            },
            {
              caption: 'head and rest are bound',
              note: 'rest is a fresh list holding references to the same three ints. Mutating rest would not affect the original list, because the star always builds a new list.',
              line: 6,
              vars: [
                { name: 'head', value: '10', tone: 'int' },
                { name: 'rest', value: '[20, 30, 40]', tone: 'ok' },
              ],
              output: '10 [20, 30, 40]',
            },
            {
              caption: 'A nested target mirrors the shape of the data',
              note: 'The second element of the list is itself a tuple. The nested pair (x, y) matches it, so x gets 2 and y gets 3, while first and last take the flat elements around it.',
              line: 7,
              vars: [
                { name: 'first', value: '1', tone: 'int' },
                { name: 'x', value: '2', tone: 'int' },
                { name: 'y', value: '3', tone: 'int' },
                { name: 'last', value: '4', tone: 'int' },
              ],
            },
            {
              caption: 'Four values, one line, and any mismatch would have raised here',
              note: 'If the data had been a 3-element list, or the middle element had not been a pair, this line would have raised ValueError at the assignment — the closest thing Python has to a type check at the boundary.',
              line: 8,
              vars: [
                { name: 'first', value: '1', tone: 'int' },
                { name: 'x', value: '2', tone: 'int' },
                { name: 'y', value: '3', tone: 'int' },
                { name: 'last', value: '4', tone: 'int' },
              ],
              output: '1 2 3 4',
            },
          ],
        }),
        b.table(
          'List or tuple?',
          ['You need', 'Use', 'Because'],
          [
            ['to add or remove elements', '`list`', 'A tuple has a fixed length and cannot be resized'],
            ['a dict key or a set member', '`tuple`', 'Only hashable objects can be keys, and lists are not hashable'],
            ['the smallest possible container', '`tuple`', 'No spare capacity and no resizable size field'],
            ['several values back from a function', '`tuple`', 'Unpacks in one line and checks the arity for you'],
            ['a homogeneous growable collection', '`list`', 'That is what a list is for'],
            ['to hand a container to code you do not control', '`tuple`', 'It is structurally impossible for that code to edit it'],
            ['JSON-shaped nested data', '`list` of `dict`, plus `dict` of `list`', 'JSON arrays and objects map onto those two exactly'],
          ]
        ),
        b.code(
          `# records.py — the shapes you will actually write
from collections import namedtuple

records = [("ada", 36), ("alan", 41), ("grace", 45)]

# Unpacking in a for loop needs no index at all
for name, age in records:
    print(f"{name:5} is {age}")

# The star takes the middle without any index arithmetic
first, *middle, last = [1, 2, 3, 4, 5]
print(first, middle, last)             # 1 [2, 3, 4] 5

# Nesting mirrors the data
matrix = [[1, 2], [3, 4]]
(a, b), (c, d) = matrix
print(a + b + c + d)                   # 10

# Several related return values, unpacked or defaulted
def min_max(numbers):
    if not numbers:
        return None, None
    return min(numbers), max(numbers)

lo, hi = min_max([4, 9, 2])
print(lo, hi)                          # 2 9

# A tuple is a legal dict key; a list is not
locations = {(10, 20): "corner", (30, 40): "centre"}
print(locations[(10, 20)])             # corner

# namedtuple: a tuple that also has attribute access
Point = namedtuple("Point", ["x", "y"])
p = Point(3, 7)
print(p.x, p[0], p == (3, 7))          # 3 3 True

# tuple() is a copy, not a freeze. The original is still editable.
original = [1, 2, 3]
frozen = tuple(original)
original.append(4)
print(frozen)                          # (1, 2, 3)  — unaffected
print(type(frozen).__name__)           # tuple

# A list in a tuple is still mutable through the tuple.
box = ([1, 2], [3, 4])
box[0].append(99)
print(box)                             # ([1, 2, 99], [3, 4])

# The two legitimate uses of conversion: keep a constant collection safe,
# and satisfy an interface that demands hashability.
DEFAULT_SHIFTS = (0, 1, 2)             # never edited, never passed around as a list
print(hash(DEFAULT_SHIFTS) is not None)  # tuples are hashable, lists are not

# Unpacking with a default: the star always makes a list, even with one item left.
head, *tail = [42]
print(head, tail, type(tail).__name__)   # 42 [] list
`,
          'records.py'
        ),
        b.code(
          `# swapping.py — what the language actually does, written out
a, b = 3, 7
print(a, b)                      # 3 7

# The swap is legal because the right-hand side is fully evaluated first.
a, b = b, a
print(a, b)                      # 7 3

# The unpack-then-repack is exactly what the compiler emits.
a, b = 3, 7
tmp_rhs = (b, a)                 # the "right-hand side": (7, 3)
a, b = tmp_rhs                   # then assign left to right
print(a, b)                      # 7 3

# Unpacking in a for loop is the same idea, applied to each item.
pairs = [(1, "one"), (2, "two")]
for number, word in pairs:
    print(f"{number}={word}")    # 1=one  2=two

# A comprehension can unpack too, and it reads better than indexing.
print([w for _, w in pairs])     # ['one', 'two']

# starred unpacking in a call: extra values land in a list
def report(first, *rest):
    return first, rest

print(report(1, 2, 3))           # (1, [2, 3])

# starred unpacking in a call: extra ARGUMENTS are absorbed by the star
print(report(*[1, 2, 3]))        # (1, [2, 3])  — same call, spelled differently

# a star in a collection display collects the remainder into a list
print([0, *[1, 2], 3])           # [0, 1, 2, 3]

# nested unpacking fails loudly if the shape is wrong — that is the value of it
try:
    (x, y) = (1, 2, 3)
except ValueError as err:
    print(err)                   # too many values to unpack (expected 2)
`,
          'swapping.py'
        ),
        b.warn(
          'The one-character tuple bug',
          '`return (value)` returns a bare value, not a one-tuple, and the caller only finds out at the unpacking line. `return (value,)` is correct. The same mistake shows up in default arguments and in generator expressions: `x = (i for i in data)` creates a generator, while `x = (i)` is just `i`.',
        ),
        b.checklist('Is a tuple the right call here?', [
          'Will this value ever need to grow, shrink, or have an element replaced?',
          'Does it need to be a dict key or a member of a set? Then it must be hashable.',
          'Am I returning several related values that a caller will unpack immediately?',
          'Would a `namedtuple` make the field names obvious enough to be worth the import?',
          'Am I converting a list to a tuple only to "protect" it? `tuple(xs)` copies, so it costs O(n) — that is usually the right trade anyway.',
        ]),
        b.resources('Where to read more', [
          { label: 'Python tutorial: lists and tuples', url: 'https://docs.python.org/3/tutorial/datastructures.html' },
          { label: 'collections.namedtuple', url: 'https://docs.python.org/3/library/collections.html#collections.namedtuple' },
          { label: 'PEP 8 — when a tuple literal needs parentheses', url: 'https://peps.python.org/pep-0008/' },
        ]),
      ],
      questions: [
        [
          'What is the value and type of `x = (5)`?',
          [
            'A tuple containing the integer 5',
            'The integer 5 — the parentheses are only grouping, so no tuple is built',
            'A list containing the integer 5',
            'A tuple of one element, because the trailing comma is optional for integers',
          ],
          1,
          'Python treats `(5)` exactly like `5`; parentheses only group expressions. A one-element tuple requires the trailing comma, so it is `(5,)`. This bites hardest in functions that are supposed to return a tuple but forget the comma.',
        ],
        [
          'Why can a tuple be used as a dict key when a list cannot?',
          [
            'Because tuples are stored inline in the dict and lists are not',
            'Because a dict key must be hashable, and a tuple of hashable items is hashable while a list is mutable and therefore not',
            'Because tuples are compared by identity and lists by value',
            'Because dict keys are only allowed to be strings and tuples',
          ],
          1,
          'A dict hashes the key to decide where to store the value. A mutable object could change after it was hashed and the table would be corrupted, so Python refuses: hashable means immutable with a stable hash. A tuple of immutable items satisfies that, a list never can.',
        ],
        [
          'After `head, *rest = [10, 20, 30, 40]`, what are `head` and `rest`?',
          [
            '`head` is 10 and `rest` is the tuple `(20, 30, 40)`',
            '`head` is 10 and `rest` is the list `[20, 30, 40]`',
            '`head` is `[10]` and `rest` is `[20, 30, 40]`',
            'It raises ValueError, because a star target needs at least two names on the left',
          ],
          1,
          'The star target collects every remaining element in order into a **new list**, which is why `rest` is a list even though the source was a list too and the two names are independent. The starred name is always a list, never a tuple, even when exactly one element is left over.',
        ],
        [
          'Why does `a, b = b, a` work without a temporary variable?',
          [
            'Because Python special-cases swaps of exactly two names',
            'Because the whole right-hand side is evaluated and packed into a tuple before any target on the left is assigned',
            'Because assignment happens right to left in Python',
            'Because tuples are immutable, so the old values cannot change',
          ],
          1,
          'Python evaluates the entire right-hand side first: it reads `b`, reads `a`, and packs `(7, 3)` into a new tuple. Only then does it start assigning to the targets on the left. Both old values were captured before either name was rebound, so the swap is safe. Immutability has nothing to do with it.',
        ],
      ],
    },
  ]
);
