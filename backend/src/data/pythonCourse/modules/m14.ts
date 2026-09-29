// Module 14 — Idioms, gotchas and performance.
//
// The last teaching module. By now the learner can write a multi-module
// program; this one is about the code that survives contact with other
// people: the mutations that reach further than you intended, the footguns
// that look like features, and an honest account of when Python is too slow.

import { mod } from '../blocks';

export const M14 = mod(
  'crs-python-programming',
  'py-m14',
  14,
  'Module 14 — Idioms, Gotchas and Performance',
  'The mutability traps that cause real bugs, the Python footguns that catch everyone, and how to make a slow program fast without guessing.',
  [
    {
      title: 'Mutability, aliasing and copying',
      summary: 'Which built-in types can be changed in place, why assignment never copies, and how to copy at the level you actually meant.',
      duration: 19,
      build: (b) => [
        b.md(`## Every object is one of two things

A Python object is either **mutable** — its contents can be changed after it exists — or **immutable**, in which case every operation produces a *new* object and leaves the original exactly as it was. There is no third category and the list is short enough to memorise.

The consequences are not subtle:

- Rebinding a name can never damage an object it used to point at, because an immutable object cannot be damaged.
- A mutable object that two names point at **can** be changed by code that was only ever handed one of those names.
- Anything you pass to a function, put in a list, or return from a function is a reference. The only question is whether the object behind it can be edited.

That one distinction explains why \`x = 5\` followed by \`x += 1\` inside a function leaves the caller's \`x\` alone, while \`cart = ["milk"]\` followed by \`cart.append("eggs")\` does not. Integers are immutable, so \`+= 1\` built a new \`int\` and rebound the local name. The list was edited in place.`),
        b.lead('The list worth memorising'),
        b.table(
          'Mutable, immutable, and what a "second one" costs',
          ['Type', 'Mutable?', 'Note'],
          [
            ['`int`, `float`, `complex`, `bool`', 'No', 'Every operation makes a new object; cheap to pass around'],
            ['`str`', 'No', '`s.strip()` returns a new string and never touches `s`'],
            ['`tuple`', 'No', 'Fixed size and shape; `namedtuple` inherits this'],
            ['`frozenset`', 'No', 'The immutable counterpart of `set`; hashable, so a valid dict key'],
            ['`bytes`', 'No', 'Item assignment raises `TypeError`; use `bytearray`'],
            ['`list`', '**Yes**', '`.copy()`, `[:]`, `list(x)` or `copy.copy` for a shallow copy'],
            ['`dict`, `set`', '**Yes**', '`.copy()`, `dict(x)`, `{**x}` or `copy.deepcopy`'],
            ['`bytearray`', '**Yes**', 'The mutable version of `bytes`; slice assignment works'],
            ['`memoryview`', 'Writes through', 'A window onto another buffer — `v[0] = 1` writes to the original if that buffer is writable, and raises `TypeError` if it is not'],
            ['Most user classes', '**Yes**', 'Each instance carries its own `__dict__`'],
          ]
        ),
        b.md(`## Assignment is binding, not copying

\`x = y\` does not create \`y\`. It creates a second **name** for whatever object \`y\` already referred to. If that object is mutable and something later edits it, both names see the edit.

\`\`\`python
def bump(n):
    n = n + 1          # a new int, bound to the local name
    return n


def push(cart):
    cart.append("eggs")  # edits the object the caller owns
    return len(cart)


n = 5
bump(n)
print(n)                 # 5 -- the caller's int was never touched

cart = ["milk"]
push(cart)
print(cart)              # ['milk', 'eggs'] -- the caller's list was
\`\`\`

Read \`bump\` and \`push\` as two different sentences: \`n = n + 1\` **rebinds a local name**, \`cart.append(...)\` **mutates a shared object**. \`bump\` cannot change anything outside itself; \`push\` can, and will.

This is also the whole of Python's "pass by value versus pass by object reference" argument. There is one calling convention — every argument is passed by reference — and whether a function *can* damage what you passed depends entirely on whether the object is mutable.`),
        b.anim('passing', {
          title: 'One list, two names — what a call really does',
          badge: 'aliasing',
          steps: [
            {
              caption: 'The caller owns a nested list',
              note: 'A list literal builds a new list object, and it points at two more list objects. That shape — a list of lists — is exactly where shallow copies start to bite.',
              panes: [
                {
                  title: 'Caller — main()',
                  sub: 'frame 1 · the objects that matter',
                  cells: [
                    { label: 'cart', value: 'list @ 0x7f9c04a15c40', tone: 'ok' },
                    { label: 'cart[0]', value: 'list @ 0x7f9c04a15d80 → ["milk", 2]', tone: 'int' },
                    { label: 'cart[1]', value: 'list @ 0x7f9c04a15e00 → ["eggs", 1]', tone: 'int' },
                  ],
                },
                {
                  title: 'Callee — audit()',
                  sub: 'not called yet',
                  cells: [{ label: 'seq', value: 'unbound', tone: 'free' }],
                },
              ],
            },
            {
              caption: 'The call binds seq to the same object',
              note: 'Zero copies are made. seq is a second name for the list object at 0x7f9c04a15c40 — not a new list, not a snapshot.',
              panes: [
                {
                  title: 'Caller — main()',
                  sub: 'frame 1',
                  cells: [
                    { label: 'cart', value: 'list @ 0x7f9c04a15c40', tone: 'ok' },
                    { label: 'cart[0]', value: 'list @ 0x7f9c04a15d80', tone: 'int' },
                  ],
                },
                {
                  title: 'Callee — audit()',
                  sub: 'frame 2 · a name, not a copy',
                  call: 'def audit(seq):',
                  cells: [
                    { label: 'seq', value: 'list @ 0x7f9c04a15c40', tone: 'ptr' },
                    { label: 'copies made', value: '0', tone: 'ok' },
                  ],
                },
              ],
            },
            {
              caption: 'A mutation reaches the caller',
              note: 'seq.append edits the one shared outer list. The caller did not need to know anything about it; the damage is already done.',
              panes: [
                {
                  title: 'Caller — main()',
                  sub: 'frame 1 · now 3 items, and it never asked for 3',
                  cells: [
                    { label: 'cart', value: 'list @ 0x7f9c04a15c40 → 3 items', tone: 'warn' },
                    { label: 'cart[2]', value: 'list @ 0x7f9c04a15e40 → ["butter", 1]', tone: 'int' },
                  ],
                },
                {
                  title: 'Callee — audit()',
                  sub: 'frame 2 · the same object',
                  call: 'seq.append(["butter", 1])',
                  cells: [
                    { label: 'seq', value: 'list @ 0x7f9c04a15c40 → 3 items', tone: 'warn' },
                    { label: 'len(seq)', value: '3', tone: 'int' },
                  ],
                },
              ],
            },
            {
              caption: 'Rebinding is the harmless one',
              note: 'seq = ["replaced"] points the local name at a brand new list. The caller is untouched, and always will be — rebinding can never damage an object.',
              panes: [
                {
                  title: 'Caller — main()',
                  sub: 'frame 1 · unchanged',
                  cells: [
                    { label: 'cart', value: 'list @ 0x7f9c04a15c40 → 3 items', tone: 'ok' },
                    { label: 'cart[0]', value: 'list @ 0x7f9c04a15d80 → ["milk", 2]', tone: 'int' },
                  ],
                },
                {
                  title: 'Callee — audit()',
                  sub: 'frame 2 · a different object now',
                  call: 'seq = ["replaced"]',
                  cells: [
                    { label: 'seq', value: 'list @ 0x7f9c04a15f10 (new object)', tone: 'bad' },
                    { label: 'caller saw it?', value: 'no', tone: 'ok' },
                  ],
                },
              ],
            },
            {
              caption: 'The shallow repair: copy before mutating',
              note: "seq = list(seq) makes one new outer list. The inner lists are still the caller's objects — a one-level copy, which is exactly what slicing and copy.copy give you.",
              panes: [
                {
                  title: 'Caller — main()',
                  sub: 'frame 1 · still the owner',
                  cells: [
                    { label: 'cart', value: 'list @ 0x7f9c04a15c40', tone: 'ok' },
                    { label: 'cart[0]', value: 'list @ 0x7f9c04a15d80', tone: 'int' },
                  ],
                },
                {
                  title: 'Callee — audit()',
                  sub: 'frame 2 · new outer, shared inner',
                  call: 'def audit(seq):\n    seq = list(seq)',
                  cells: [
                    { label: 'seq', value: 'list @ 0x7f9c04a15a20 (new)', tone: 'ok' },
                    { label: 'seq[0]', value: 'list @ 0x7f9c04a15d80 (SHARED)', tone: 'warn' },
                  ],
                },
              ],
            },
            {
              caption: 'The trap: mutating the inner list still leaks',
              note: "seq[0].append(3) does not rebind seq, it reaches through it into the caller's inner list. This is the single most common way a \"copy\" fails to protect anyone.",
              panes: [
                {
                  title: 'Caller — main()',
                  sub: 'frame 1 · corrupted through its own front door',
                  cells: [
                    { label: 'cart', value: 'list @ 0x7f9c04a15c40', tone: 'bad' },
                    { label: 'cart[0]', value: '["milk", 2, 3] — 3 was never in the input', tone: 'bad' },
                  ],
                },
                {
                  title: 'Callee — audit()',
                  sub: 'frame 2',
                  call: 'seq[0].append(3)',
                  cells: [
                    { label: 'seq', value: 'list @ 0x7f9c04a15a20 (private)', tone: 'ok' },
                    { label: 'seq[0]', value: 'list @ 0x7f9c04a15d80 (SHARED)', tone: 'bad' },
                  ],
                },
              ],
            },
            {
              caption: 'deepcopy follows the nesting all the way down',
              note: 'Every reachable object is rebuilt, so nothing is shared. It is also more expensive, and it fails outright on open files, sockets and locks — which is why it is a deliberate choice rather than a default.',
              panes: [
                {
                  title: 'Caller — main()',
                  sub: 'frame 1 · genuinely untouched',
                  cells: [
                    { label: 'cart', value: 'list @ 0x7f9c04a15c40', tone: 'ok' },
                    { label: 'cart[0]', value: '["milk", 2]', tone: 'ok' },
                  ],
                },
                {
                  title: 'Callee — audit()',
                  sub: 'frame 2 · every level rebuilt',
                  call: 'seq = copy.deepcopy(seq)',
                  cells: [
                    { label: 'seq', value: 'list @ 0x7f9c04a12c60 (new)', tone: 'ok' },
                    { label: 'seq[0]', value: 'list @ 0x7f9c04a13340 (new)', tone: 'ok' },
                  ],
                },
              ],
            },
          ],
        }),
        b.md(`## The three levels of copying

Once you accept one calling convention, every copying question reduces to one of three levels.

1. **Rebind a name.** \`b = a\`, or \`b = a + 1\`. Free, and correct whenever you only need a new name.
2. **Shallow copy.** \`x[:]\`, \`x.copy()\`, \`dict(x)\`, \`{**x}\`, \`list(x)\`, \`set(x)\`, \`copy.copy(x)\`. One new container; the values inside it are the same objects.
3. **Deep copy.** \`copy.deepcopy(x)\` walks the whole object graph, asking each type for a \`__deepcopy__\` if it has one, and memoising so that structure shared in the original stays shared in the copy.

\`\`\`python
import copy

cart = [["milk", 2], ["eggs", 1]]

sliced = cart[:]
method = cart.copy()
shallow = copy.copy(cart)
deep = copy.deepcopy(cart)

print(sliced is cart)         # False -- a new outer list
print(sliced[0] is cart[0])   # True  -- the inner list is shared
print(deep[0] is cart[0])     # False -- every level was rebuilt
print(sliced is method)       # False -- four separate outer lists

cart[0].append("butter")

print(sliced)                 # [['milk', 2, 'butter'], ['eggs', 1]]
print(method)                 # [['milk', 2, 'butter'], ['eggs', 1]]
print(deep)                   # [['milk', 2], ['eggs', 1]]

config = {"theme": "dark", "flags": {"beta": True}}
flat = config.copy()
deep_config = copy.deepcopy(config)

config["flags"]["beta"] = False
print(flat["flags"]["beta"])         # False -- the nested dict was shared
print(deep_config["flags"]["beta"])  # True  -- deep copy rebuilt it
\`\`\`

Note what \`sliced is method\` is telling you: three syntaxes, three objects, all sharing the same inner lists. A copy you did not name explicitly still copies.

## The rule of thumb

Deep copy when the data is **plain** — numbers, strings, dicts, lists, sets, and dataclasses you wrote yourself — and you want genuine independence. Do not deep copy data containing anything **live**: an open file, a database connection, a thread lock, a logger. \`deepcopy\` will either raise \`TypeError: cannot pickle '_thread.lock' object\` or quietly hand you a second object that does not work. The right move there is a targeted copy of the plain parts, or a design change that does not need copying.`),
        b.anim('memory', {
          title: 'The one built-in that shows you the bytes: bytes vs bytearray',
          badge: 'immutability, literally',
          base: 140737488355328,
          cell_bytes: 1,
          cells: [
            { bytes: ['41'], label: 'raw[0]', note: '0x41 is ASCII "A"', tone: 'char' },
            { bytes: ['42'], label: 'raw[1]', note: '0x42 is ASCII "B"', tone: 'char' },
            { bytes: ['43'], label: 'raw[2]', note: '0x43 is ASCII "C"', tone: 'char' },
          ],
          steps: [
            {
              caption: 'A bytes object is a fixed block of memory',
              note: 'Three characters, three bytes, one contiguous allocation. In Python 3 a bytes object is a sequence of ints, which is why b"ABC"[0] is 65 and not "A".',
              cells: {},
              vars: [{ name: 'frozen', type: 'bytes', value: '"ABC" — 3 bytes, fixed', tone: 'char' }],
              highlight: [0, 1, 2],
            },
            {
              caption: 'Trying to edit it fails, and the memory is untouched',
              note: 'TypeError: bytes object does not support item assignment. The block is exactly as it was, because there was no operation to perform in the first place.',
              cells: {},
              vars: [
                { name: 'frozen', type: 'bytes', value: '"ABC" — still 3 bytes', tone: 'char' },
                { name: 'frozen[0] = 90', value: 'TypeError: no item assignment', tone: 'bad' },
              ],
              highlight: [0, 1, 2],
            },
            {
              caption: 'bytearray is the mutable version, in a new block',
              note: 'bytearray(b"ABC") copies the three bytes into a fresh allocation with room to grow. Same contents, different object, different rules.',
              cells: {},
              vars: [
                { name: 'frozen', type: 'bytes', value: '"ABC" — its own block', tone: 'char' },
                { name: 'buf', type: 'bytearray', value: '"ABC" @ 0x800000000000', pointsTo: 0, tone: 'ok' },
              ],
              highlight: [0, 1, 2],
            },
            {
              caption: 'Now the store succeeds, in place',
              note: 'buf[0] = 90 overwrites one byte. 90 is 0x5A, which is ASCII "Z". frozen is a separate object and is completely unaffected — two names, one of them editable.',
              cells: {
                '0': { bytes: ['5A'], label: 'raw[0]', note: '0x5A is ASCII "Z" — overwritten in place' },
              },
              vars: [
                { name: 'frozen', type: 'bytes', value: '"ABC" — unchanged', tone: 'char' },
                { name: 'buf', type: 'bytearray', value: '"ZBC" @ 0x800000000000', pointsTo: 0, tone: 'ok' },
              ],
              highlight: [0],
            },
            {
              caption: 'Slice assignment replaces a run of bytes',
              note: 'buf[1:3] = b"-!" writes two bytes over the old two. The block is already big enough, so nothing is reallocated and the object identity does not change.',
              cells: {
                '1': { bytes: ['2D'], label: 'raw[1]', note: '0x2D is "-" ' },
                '2': { bytes: ['21'], label: 'raw[2]', note: '0x21 is "!"' },
              },
              vars: [
                { name: 'frozen', type: 'bytes', value: '"ABC" — unchanged', tone: 'char' },
                { name: 'buf', type: 'bytearray', value: '"Z-!" — the same object', pointsTo: 0, tone: 'ok' },
              ],
              highlight: [0, 1, 2],
            },
          ],
        }),
        b.md(`## Identity versus equality

Python gives you two ways to ask whether two things are "the same", and confusing them is a reliable source of bugs.

- \`a == b\` asks whether they **compare equal** — for lists, that is an element-by-element comparison.
- \`a is b\` asks whether the two names are bound to **the same object**.

They are not interchangeable. Two independently built lists with identical contents are equal and not identical:

\`\`\`python
a = [1, 2, 3]
b = [1, 2, 3]
c = a

print(a == b)          # True  -- same contents
print(a is b)          # False -- two different list objects
print(a is c)          # True  -- c was bound to a's object
print(id(a) == id(c))  # True  -- identity, spelled the slow way


def clone(items):
    return list(items)


d = clone(a)
print(d == a, d is a)   # True False
\`\`\`

The rule that follows: **ask \`==\` when you mean "the same values" and \`is\` only when you mean "the same object"**. In practice \`is\` is for exactly three things — comparing against \`None\`, comparing against the \`True\`/\`False\` singletons, and checking a sentinel object that came back from a function. Never \`== None\`: a custom object is free to define \`__eq__\` and claim to equal anything, and a NumPy array does exactly that, which turns a quiet \`if x == None\` into \`ValueError: truth value is ambiguous\`.

\`\`\`python
def find_exact(items, target):
    for item in items:
        if item is target:      # the very same object, not merely an equal one
            return item
    return None


row = find_exact(rows, sentinel_row)   # None means "not found"
\`\`\``),
        b.lead('Where a shallow copy silently bites'),
        b.table(
          'Four shapes that look like a copy and are not one',
          ['You write', 'What you actually get', 'What bites you later'],
          [
            [
              '`defaults = DEFAULT.copy()` at the top of a function',
              'A new outer dict; every nested value is still the module-level object',
              'A caller mutating `cfg["db"]["port"]` silently rewrites the default for every later call, and for every test that runs after it',
            ],
            [
              '`original[:]` on a list of dicts',
              'A new list; the same dicts inside it',
              '`copy[0]["done"] = True` writes straight through to the original, which is usually a fixture someone else owns',
            ],
            [
              '`outer[:]` on a list of lists, then `outer[0].sort()`',
              'A new outer list; the same inner lists',
              'The caller’s inner list is now in a different order, and nothing in the traceback points at the copy',
            ],
            [
              '`{**config}` or `dict(config)`',
              'A new outer dict; the same nested containers',
              'Identical failure to `.copy()` — the double-star looks dramatic but it is a shallow spread',
            ],
            [
              '`[*args]` collected into a list, then appended to',
              'A new list; the caller’s objects still inside it',
              'Appending is safe and mutating `collected[0]` is not — the difference is easy to miss in review',
            ],
          ]
        ),
        b.warn(
          'The one that costs real hours',
          'Module-level mutable defaults. `TIMEOUTS = {"connect": 5}` plus `def fetch(url, options=TIMEOUTS)` means every test that mutates `options["connect"]` has poisoned every test that runs after it, and the failure surfaces in a completely unrelated module. Pass the dict, or wrap it: `options = dict(TIMEOUTS) if options is None else options`.'
        ),
        b.tip(
          'How to check in one line',
          '`assert a is not b` when two things must not be the same object, and `assert a == b` when they must hold the same values. When you are not sure which you want, write the assertion anyway — it costs nothing, and the failure message tells you which assumption was wrong.'
        ),
      ],
      questions: [
        [
          'After `a = [1, 2]`, `b = a`, and `b.append(3)`, what does `a` contain?',
          [
            '`[1, 2]` — the append happened on a separate copy of the list',
            '`[1, 2, 3]` — assignment bound a second name to one list object, so the mutation is visible through both',
            '`[1, 2, 2, 3]` — the list was appended to once per name',
            'It raises `TypeError`, because a list cannot be bound to two names',
          ],
          1,
          'Assignment copies references, never objects. `a` and `b` are two names for one list, so an in-place mutation through either is immediately visible through the other. The compiler never made a second list and never will.',
        ],
        [
          'Which of these built-in types can be changed in place?',
          ['`tuple`', '`frozenset`', '`namedtuple`', '`bytearray`'],
          3,
          '`bytearray` is the mutable counterpart of `bytes` — `buf[0] = 90` works on it and raises `TypeError` on `bytes`. `tuple`, `frozenset` and `namedtuple` are all immutable, so every operation returns a new object and leaves the original untouched. The complete mutable set is `list`, `dict`, `set`, `bytearray` and most user-defined classes.',
        ],
        [
          'How does `copy.deepcopy` differ from slicing?',
          [
            'Slicing produces a new outer list whose inner objects are still shared; deepcopy rebuilds every reachable object',
            'Slicing is only available on tuples, while deepcopy works on any type',
            'deepcopy is faster on large nested structures because it is implemented in C',
            'deepcopy silently skips anything that is not hashable',
          ],
          0,
          '`original[:]` allocates one new list and copies the references inside it, so `original[0] is sliced[0]` is True. `deepcopy` walks the entire object graph, calls a type’s `__deepcopy__` when it defines one, and memoises so substructure shared in the original stays shared in the copy. The cost is proportional to the size of that graph, which is why you reach for it deliberately.',
        ],
        [
          "A function is supposed to leave the caller's list unchanged. Which assertion states that requirement?",
          [
            '`result is original` — identity is the only way to be certain nothing was shared',
            '`result == original` — equality compares contents element by element, which is what "unchanged" means',
            '`id(result) != id(original)` — any correct copy has a different id',
            '`result is not original` — true for every function that returns anything at all',
          ],
          1,
          'The requirement is about values, so compare values: `==` on lists walks them element by element. `is` answers a different question — whether two names refer to one object — which is a claim about copying, not about contents. Option 3 passes for a function that returns a fresh list without touching anything, so it proves nothing.',
        ],
      ],
    },
    {
      title: 'The gotchas that catch everyone',
      summary: 'Mutable default arguments, late binding, float equality, live views and the rest — what breaks, why, and what to write instead.',
      duration: 18,
      build: (b) => [
        b.md(`## Every one of these has shipped a real bug

Python's design has very few silent-failure rules, which is why most of its footguns are not about the language being permissive. They are about one specific rule (defaults are evaluated once) or one specific behaviour (float is base 2, iteration is by index). Learn the twelve below and you will recognise them in code you did not write.

The one that bites hardest is the mutable default argument, because the bug is invisible in the function, invisible in the traceback, and only appears on the *second* call.`),
        b.anim('trace', {
          title: 'The mutable default argument, step by step',
          badge: 'classic bug',
          code: `def add_task(name, tags=[]):
    tags.append(name)
    return tags


print(add_task("write docs"))
print(add_task("ship release"))
print(add_task("answer email"))`,
          steps: [
            {
              caption: 'The def statement runs exactly once',
              note: 'The default expression [] is evaluated here, at import time, and the resulting list is stored on the function object. The body has not executed at all. Every later call that omits tags will reuse this one object.',
              line: 1,
              vars: [
                { name: 'add_task', value: 'function object', tone: 'code' },
                { name: 'add_task.__defaults__', value: '(list @ 0x7fa1b0c034a0 → [],)', tone: 'int' },
              ],
              output: '',
            },
            {
              caption: 'First call — looks perfect',
              note: 'No tags argument was given, so the parameter name is bound to that one default list. The body mutates it in place and the caller gets exactly what it asked for. Nothing is wrong yet.',
              line: 6,
              vars: [
                { name: 'name', value: '"write docs"', tone: 'char' },
                { name: 'tags', value: 'list @ 0x7fa1b0c034a0', tone: 'int' },
                { name: 'tags[:]', value: '["write docs"]', tone: 'warn' },
              ],
              output: "['write docs']",
            },
            {
              caption: 'Second call — the default was not rebuilt',
              note: 'Nothing about a def statement re-runs, so the default was not re-evaluated. The list already holds the first task, and the second call silently returns both of them.',
              line: 7,
              vars: [
                { name: 'name', value: '"ship release"', tone: 'char' },
                { name: 'tags', value: 'list @ 0x7fa1b0c034a0', tone: 'int' },
                { name: 'tags[:]', value: '["write docs", "ship release"]', tone: 'bad' },
              ],
              output: '["write docs", "ship release"]',
            },
            {
              caption: 'Third call, and it never stops',
              note: 'Call it a thousand times and the list holds a thousand entries, and every returned list is the same list object. The bug is in the signature, not the body, which is why it survives code review.',
              line: 8,
              vars: [
                { name: 'name', value: '"answer email"', tone: 'char' },
                { name: 'tags', value: 'list @ 0x7fa1b0c034a0', tone: 'int' },
                { name: 'tags[:]', value: '["write docs", "ship release", "answer email"]', tone: 'bad' },
              ],
              output: '["write docs", "ship release", "answer email"]',
            },
            {
              caption: 'The fix: default to None and build inside',
              note: 'With tags=None the default is an immutable singleton, and a fresh list is created in the body on every call. Copying a supplied argument is deliberate too — the function should never mutate what the caller handed it.',
              line: 1,
              vars: [
                { name: 'add_task.__defaults__', value: '(None,) — immutable, never mutated', tone: 'ok' },
                { name: 'each call gets', value: 'a brand new list', tone: 'ok' },
              ],
            },
          ],
        }),
        b.md(`## The fix, written properly

\`\`\`python
def add_task(name, tags=None):
    """None means "the caller did not supply this", so build the default here.

    The else-branch copy is not decoration: without it, add_task(x, my_tags)
    would append into the caller's own list.
    """
    if tags is None:
        tags = []
    else:
        tags = list(tags)
    tags.append(name)
    return tags
\`\`\`

This is the most useful single habit in Python: **\`None\` is the default for "not supplied"**, and you build the real default inside the body. It works because \`None\` is immutable, so the shared default can never be corrupted.`),
        b.lead('The full catalogue'),
        b.table(
          'Symptom, cause, fix — the twelve that actually happen',
          ['Symptom', 'Cause', 'Fix'],
          [
            [
              'A function’s arguments accumulate entries across calls',
              'A mutable default (`tags=[]`) is evaluated once, at `def` time, and reused',
              '`tags=None`, then `if tags is None: tags = []` in the body',
            ],
            [
              'Every function in a list returns the last loop value',
              'Late binding: a closure captures the *variable*, not the value it held',
              '`lambda x, v=item: f(v, x)`, or `functools.partial(f, item)`',
            ],
            [
              '`UnboundLocalError` on a name that exists at module level',
              'Assigning to a name anywhere in a function makes it local for the whole function',
              '`global NAME` (rare), or better, pass it in as a parameter',
            ],
            [
              '`0.1 + 0.2 == 0.3` is `False`',
              'Neither 0.1 nor 0.2 has an exact binary representation, so the sum is 0.30000000000000004',
              '`math.isclose(a, b)`; `decimal.Decimal` for money',
            ],
            [
              'Two equal-looking strings are not `is`-identical',
              'CPython interns short literals; computed strings are fresh objects',
              'Compare with `==`; use `is` only against `None`, `True`, `False` and sentinels',
            ],
            [
              '`TypeError: < not supported between str and int` out of `sorted()`',
              'The list is heterogeneous and there is no defined order across types',
              '`sorted(x, key=...)`, or fix the data before sorting it',
            ],
            [
              'Deletion "skips" an element in a loop',
              'A list iterator holds an index, and removal slides later elements down under it',
              'Iterate `for item in list(items)`, or build the survivors as a new list',
            ],
            [
              '`RuntimeError: dictionary changed size during iteration`',
              'You added or removed a key while iterating a dict',
              '`for k, v in list(d.items()):` — iterate a snapshot',
            ],
            [
              'A dict "key" changes under you between two uses of `d.keys()`',
              '`dict.keys()` returns a **live view**, not a copy; the dict is the same object',
              '`list(d.keys())` or `list(d.items())` when you need a snapshot',
            ],
            [
              "`AttributeError: 'NoneType' object has no attribute 'append'`",
              'A `return` sat inside an `if`, so some path fell off the end of the function',
              'Every path returns, or the function raises instead of returning `None`',
            ],
            [
              'Joining 50,000 pieces takes hundreds of milliseconds',
              '`s += piece` allocates and copies everything written so far on every iteration',
              '`"".join(pieces)` — one allocation',
            ],
            [
              "`TypeError: 'NoneType' object is not iterable` from a generator function",
              'A bare `return` in a generator returns `None`; a generator must yield its value',
              '`return [x]` in a normal function, or `yield x` in a generator',
            ],
          ]
        ),
        b.md(`## Late binding, in full

A closure captures **variables**, not values. A function made inside a loop therefore reads whatever the loop variable holds *at the moment it is called* — usually the final value.

\`\`\`python
def make_handlers_broken():
    handlers = []
    for name in ["ada", "brian", "clara"]:
        handlers.append(lambda: name)
    return handlers


def make_handlers_fixed():
    handlers = []
    for name in ["ada", "brian", "clara"]:
        handlers.append(lambda name=name: name)   # bind it now
    return handlers


print([h() for h in make_handlers_broken()])
# ['clara', 'clara', 'clara']
print([h() for h in make_handlers_fixed()])
# ['ada', 'brian', 'clara']
\`\`\`

The fix is always the same shape: **capture the value at definition time**, with a default argument or \`functools.partial\`. Neither is a hack — a default argument is simply an expression evaluated once, when the \`def\` runs, which is exactly the semantics you wanted.`),
        b.anim('callstack', {
          title: 'Three closures, one variable, all called after the loop',
          badge: 'late binding',
          steps: [
            {
              caption: 'The loop has finished; the closures have not been called',
              note: 'make_handlers is still on the stack. Each lambda captured the name variable — the cell itself, not a snapshot — and that cell now holds "clara".',
              frames: [
                {
                  fn: 'make_handlers()',
                  line: 'app.py:2',
                  locals: ['handlers = [f1, f2, f3]', 'name = "clara"  (final value)'],
                },
                {
                  fn: 'handler()  # f1',
                  args: '',
                  line: 'app.py:6',
                  phase: 'returning',
                  locals: ['reads name -> "clara"'],
                  note: 'f1 was supposed to say "ada"',
                },
              ],
            },
            {
              caption: 'The fix: the value is bound when the lambda is made',
              note: 'With lambda name=name, each def gets its own parameter cell holding that iteration’s value. The loop variable can now change freely without touching them.',
              frames: [
                {
                  fn: 'make_handlers_fixed()',
                  line: 'app.py:14',
                  locals: ['handlers = [f1, f2, f3]', 'name = "clara"  (now irrelevant)'],
                },
                {
                  fn: 'handler()  # f1',
                  args: '',
                  line: 'app.py:17',
                  phase: 'returning',
                  locals: ['own cell: name -> "ada"'],
                },
              ],
            },
            {
              caption: 'All three now answer for themselves',
              note: 'f1 says ada, f2 says brian, f3 says clara. Three independent answers from one loop — which is what you meant the first time.',
              frames: [
                {
                  fn: 'make_handlers_fixed()',
                  line: 'app.py:14',
                  locals: ['handlers = [f1, f2, f3]'],
                },
                {
                  fn: 'handler()  # f3',
                  args: '',
                  line: 'app.py:17',
                  phase: 'returning',
                  locals: ['own cell: name -> "clara"'],
                },
              ],
            },
          ],
        }),
        b.md(`## Floats, and why the comparison fails

A \`float\` is an IEEE-754 binary64: 53 bits of mantissa, base 2. Neither 0.1 nor 0.2 is representable exactly, so each is stored as the nearest double and the sum lands one representable step away from the double nearest 0.3.

\`\`\`python
import math
from decimal import Decimal

print(0.1 + 0.2)                          # 0.30000000000000004
print(0.1 + 0.2 == 0.3)                   # False
print(math.isclose(0.1 + 0.2, 0.3))        # True
print(abs((0.1 + 0.2) - 0.3) < 1e-9)       # True
print(0.1 + 0.2 == 0.30000000000000004)    # True -- this double is exact

print(Decimal("0.1") + Decimal("0.2"))    # Decimal('0.3') -- base 10
print(sum([0.1] * 10))                    # 0.9999999999999999
print(math.fsum([0.1] * 10))              # 1.0 -- compensated summation
\`\`\`

Two rules. **Comparing floats:** use \`math.isclose\`, with an explicit \`rel_tol\` and \`abs_tol\` when the magnitudes differ wildly. **Accumulating floats:** use \`math.fsum\`, which tracks the running error and returns the correctly rounded sum — the difference between \`sum([0.1] * 10)\` giving 0.9999999999999999 and \`fsum\` giving exactly 1.0. For money, \`Decimal\` or integer minor units; a binary float is never the right type for currency.

## Two more that surprise people

\`\`\`python
# "a" * n is repetition, not string building
banner = "-" * 40
print(banner)                        # ----------------------------------------
print("ab" * 3)                      # 'ababab'

# But list repetition aliases one object N times
shared = []
many = [shared] * 3
many[0].append("oops")
print(shared)                        # ['oops'] -- all three entries are one list

# and the same trap is behind the .join advice
import time

parts = [f"{i:04d}" for i in range(50_000)]

start = time.perf_counter()
out = ""
for p in parts:
    out += p
slow = time.perf_counter() - start

start = time.perf_counter()
out = "".join(parts)
fast = time.perf_counter() - start

print(f"{slow:.3f}s with +=")        # 0.412s with +=
print(f"{fast:.4f}s with join")      # 0.0031s with join
\`\`\`

Every \`out += p\` allocates a new string and copies everything written so far, so building N characters costs O(N²) work. \`join\` walks the parts once and allocates once. For 50,000 four-character pieces that is 130x faster — and it is one of the few micro-optimisations that genuinely matters.`),
        b.md(`## Live views and shifting indices

Two behaviours that look like bugs and are in fact documented:

\`\`\`python
counts = {"a": 1, "b": 2}

keys = counts.keys()
print(type(keys))            # <class 'dict_keys'> -- a view, not a copy
print(list(keys))            # ['a', 'b']
counts["c"] = 3
print(list(keys))            # ['a', 'b', 'c'] -- the view sees the change

# Changing size during iteration is the one thing a view forbids:
for k in counts:
    if k == "a":
        del counts["b"]      # RuntimeError: dictionary changed size

# A list iterates by index, so removal shifts things under the loop:
stack = [1, 2, 3, 4, 5, 6, 8]
for n in stack:
    if n % 2 == 0:
        stack.remove(n)      # 8 survives, because removing 6 slid it left
print(stack)                 # [1, 3, 5, 8]

survivors = [n for n in stack if n % 2]   # build a new list: always correct
for n in list(stack):                     # or iterate a snapshot
    if n % 2 == 0:
        stack.remove(n)
\`\`\`

Neither behaviour is negotiable and neither is worth working around. Build the list you want with a comprehension; it is faster, clearer, and free of ordering hazards.`),
        b.tip(
          'strip() is not a whitespace normaliser',
          '`"  alpha   beta  ".strip()` gives `"alpha   beta"` — it removes leading and trailing whitespace only, never internal runs. If you want internal runs collapsed as well, it is `" ".join(text.split())`, which is the right normaliser for anything a human typed.'
        ),
        b.warn(
          'assert statements disappear under python -O',
          '`python -O script.py` strips every `assert` from the bytecode, so assertions belong in tests and internal invariants, never in user-input validation for production. Input validation is an `if ... raise ValueError(...)`, which runs no matter how the interpreter was started.'
        ),
      ],
      questions: [
        [
          'Why does `def add(name, tags=[])` accumulate items across calls?',
          [
            'The interpreter re-evaluates the defaults on every call and merges them',
            'The default expression is evaluated once when the `def` executes, and that one mutable object is reused by every call that omits the argument',
            '`tags` is really a global that the function closes over by accident',
            'Lists passed as defaults are shallow-copied before each call',
          ],
          1,
          'A `def` statement evaluates its default expressions once, at definition time, and stores the resulting objects on the function’s `__defaults__` tuple. Since a list is mutable, every call that omits `tags` binds the parameter to that same list and `append` corrupts it. The fix is `tags=None` plus `if tags is None: tags = []` in the body.',
        ],
        [
          'Closures created in a loop all read the final value of the loop variable. How do you bind the value at definition time?',
          [
            'Capture it in a default argument (`lambda x, v=item: f(v, x)`) or in `functools.partial(f, item)`',
            'Move the loop inside a function so the variable is destroyed when it returns',
            'Replace the loop with a `while` loop',
            'Call each closure immediately instead of collecting them',
          ],
          0,
          'A closure stores a reference to the variable’s cell, so every closure sees whatever that cell holds when it is finally called. Giving the `lambda` a default argument creates a separate parameter cell per execution of the `def`, initialised from that iteration’s value. That parameter cell is what the closure then reads, permanently.',
        ],
        [
          'What does `0.1 + 0.2 == 0.3` evaluate to in Python, and why?',
          [
            '`True`, because Python rounds the sum to the nearest representable double',
            '`False`, because 0.1 and 0.2 have no exact binary representation, so the sum is 0.30000000000000004',
            '`True`, because Python performs exact decimal arithmetic by default',
            'It raises `TypeError`, because `float` equality is not defined',
          ],
          1,
          'Binary floating point cannot store 0.1 or 0.2 exactly, so each is the nearest double to the decimal value and the sum lands one ULP above the double nearest 0.3. For tolerant comparison use `math.isclose(0.1 + 0.2, 0.3)`, which is `True`; for currency use `decimal.Decimal`, which is base 10.',
        ],
        [
          'A loop deletes items from the list it is iterating and appears to skip entries. What is the cause?',
          [
            '`del` marks an element as removed but defers the shift until the loop ends',
            '`list.remove()` stops at the first match and abandons the iteration',
            'A list iterator holds a position index, and removing an element slides later elements down one place, so the next step lands further along than intended',
            'The list is a live view, so the mutation is not visible until the list is re-read',
          ],
          2,
          'Iteration over a list tracks an index, not an element reference. After a removal the remaining elements shift down, so the iterator’s next index now points one position further right than the element it was going to visit. Iterate a snapshot — `for n in list(stack)` — or build the survivors in a comprehension.',
        ],
      ],
    },
    {
      title: 'Performance, honestly',
      summary: 'What the GIL does and does not stop, how to measure properly, and which optimisations are worth the trouble.',
      duration: 20,
      build: (b) => [
        b.md(`## The GIL, stated precisely

The Global Interpreter Lock is a mutex around CPython's evaluation loop. Only one thread can be executing Python bytecode in a process at any instant. Everything else about it is a corollary, and most of what is written about the GIL is a corollary stated wrong.

Three consequences matter:

1. **CPU-bound threads do not scale.** Two threads each running a pure-Python loop get roughly one core's worth of throughput between them, plus lock overhead. The work does not overlap.
2. **I/O-bound threads scale perfectly.** A thread blocked on a socket, a file, or \`time.sleep\` releases the GIL, so twenty threads waiting on twenty requests keep twenty requests in flight.
3. **Code outside the GIL scales.** C extensions that release the GIL — \`hashlib\`, \`zlib\`, \`ssl\`, and NumPy's large array operations — genuinely run in parallel. That is why \`sum(numpy_array)\` is a parallel operation and \`sum(python_list)\` is not.`),
        b.lead('Which claims about the GIL survive contact with a profiler'),
        b.table(
          'GIL claims, checked',
          ['Claim', 'Verdict', 'Why'],
          [
            ['Only one thread runs Python bytecode at a time in a process', '**True**', 'It is a mutex on the evaluation loop. This is the whole thing.'],
            ['Threads cannot overlap while waiting on I/O', '**False**', 'A blocking syscall releases the GIL, which is the entire reason `ThreadPoolExecutor` works for scraping'],
            ['Threads can never overlap inside C extension code', '**False**', 'Extensions that release the GIL run in parallel — that is what NumPy, hashlib and zlib do'],
            ['Multiprocessing is also limited to one core', '**False**', 'Separate processes have separate interpreters and separate GILs; this is the real answer to CPU-bound threading'],
            ['Free-threaded CPython has no GIL at all', '**False**', 'PEP 703 free-threaded builds are a separate opt-in download; the ordinary build still has the GIL and can switch it back on at startup'],
            ['Threads cannot share mutable data', '**False**', 'They share it — that is why `threading.Lock` exists. They just cannot execute bytecode simultaneously'],
          ]
        ),
        b.code(`import time
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor


def fetch(n: int) -> int:
    """Stand-in for a network round trip: 50 ms of doing nothing."""
    time.sleep(0.05)
    return n * 2


def burn(n: int) -> int:
    """Pure Python arithmetic: the GIL cannot help with this one."""
    return sum(i * i for i in range(n))


# --- I/O bound: threads are the right tool -----------------------------
start = time.perf_counter()
serial = [fetch(i) for i in range(40)]
serial_time = time.perf_counter() - start

start = time.perf_counter()
with ThreadPoolExecutor(max_workers=16) as pool:
    threaded = list(pool.map(fetch, range(40)))
threaded_time = time.perf_counter() - start

print(f"serial    {serial_time:.2f}s")   # 2.03s
print(f"threaded  {threaded_time:.2f}s")  # 0.15s  -- 13x, and 100% of it was I/O

# --- CPU bound: threads do nothing, processes do everything ------------
def cpu_bench() -> None:
    start = time.perf_counter()
    [burn(2_000_000) for _ in range(8)]
    cpu_serial = time.perf_counter() - start

    start = time.perf_counter()
    with ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(burn, [2_000_000] * 8))
    cpu_threaded = time.perf_counter() - start

    start = time.perf_counter()
    with ProcessPoolExecutor(max_workers=8) as pool:
        list(pool.map(burn, [2_000_000] * 8))
    cpu_process = time.perf_counter() - start

    print(f"serial    {cpu_serial:.2f}s")     # 4.41s
    print(f"threaded  {cpu_threaded:.2f}s")   # 4.49s  -- no gain at all
    print(f"pooled    {cpu_process:.2f}s")    # 0.88s  -- 5x, minus the pickling


# The guard is not optional on Windows or macOS, where a process pool
# re-imports this module in every worker instead of forking it.
if __name__ == "__main__":
    cpu_bench()`, 'gil.py'),
        b.md(`That single file is the whole argument for the GIL. The same eight tasks take 4.4 s in a loop, 4.5 s in a thread pool, and 0.9 s in a process pool — and the process pool wins even after paying to pickle eight tasks and fork eight interpreters, which is why the win is 5x rather than 8x.

Two things follow. **If your program waits, use threads** (\`ThreadPoolExecutor\` for a fixed pool, \`asyncio\` for tens of thousands of connections). **If your program computes, use processes** or change the algorithm. Never reach for multiprocessing before you have checked whether the work is I/O — a fork per task on a large dataset will lose to the serial version it replaced.

## Measure before you care

The most useful performance habit is also the cheapest: **write down how long it takes before you change anything.** A program that takes 2.0 s and one that takes 2.1 s are the same program, and optimising the second is a wasted afternoon.

\`\`\`python
import time

start = time.perf_counter()
result = process_everything()
elapsed = time.perf_counter() - start

print(f"{elapsed:.3f}s  {result}")
\`\`\`

Use \`time.perf_counter()\`, not \`time.time()\`. The counter is monotonic — it never jumps backwards when NTP or daylight saving adjusts the system clock — and it has the highest resolution available. \`time.time()\` is a wall clock and is the wrong tool for measuring a duration.

For a single expression, use \`timeit\`. It disables the garbage collector during the run, repeats automatically, and reports the mean:

\`\`\`python
import timeit

SETUP = "data = list(range(20_000)); fast = set(data)"

list_time = timeit.timeit("[x in data for x in data]", SETUP, number=1)
set_time = timeit.timeit("[x in fast for x in data]", SETUP, number=1)

print(f"list membership  {list_time:.2f}s")     # 1.98 s
print(f"set membership   {set_time:.4f}s")     # 0.0039 s
print(f"speedup          {list_time / set_time:.0f}x")   # 508x
\`\`\`

One \`timeit\` trap worth knowing, because it has caught everyone: you cannot see a loop variable from the setup string. \`timeit.timeit("total += i", setup="total = 0")\` raises \`NameError: name 'total' is not defined\`, because \`total\` is created inside a function scope the timing statement cannot see. Use \`timeit\` for expressions over prepared data, and \`perf_counter\` around a block for anything with a local accumulator.

## Then profile, and believe the profile

Guessing which function is slow is wrong often enough to be useless. \`cProfile\` attributes wall-clock time and call counts to every function, and two tools turn its output into something readable.

\`\`\`bash
python -m cProfile -s cumtime slow.py | head -25
python -m cProfile -o profile.out slow.py

pip install snakeviz
snakeviz profile.out                 # interactive flame graph in the browser

pip install tuna
tuna profile.out                     # flame graph in your terminal
\`\`\`

Read a profile by **cumulative** time, then look for the function with a huge \`ncalls\` sitting next to a large \`tottime\`. \`tottime\` is time spent in that function excluding its callees, and it is the column that tells you where the work is. An \`ncalls\` in the millions with almost no time each is usually an abstraction costing more than it saves — a property lookup in a hot loop, or a logger call that formats a string nobody reads.

If \`cProfile\` distorts the picture — it adds overhead per call, so call-heavy code looks worse than it is — sample instead. \`py-spy top -- python slow.py\` attaches to a *running* process and needs no code change at all, which makes it the tool of choice for something already in production.`),
        b.anim('step', {
          title: 'The optimisation routine',
          badge: 'five steps, in order',
          steps: [
            {
              title: '1. Write the number down',
              desc: 'Wrap the thing in time.perf_counter() and print the duration, using the largest input you actually expect. You now have a baseline you can paste into a commit message, and a number that is allowed to go up while you work on something unrelated.',
              code_snippet: 'start = time.perf_counter()\nrun_batch(size=50_000)\nprint(f"{time.perf_counter() - start:.2f}s")',
            },
            {
              title: '2. Find the bottleneck, do not guess',
              desc: 'Run cProfile and read the top of the cumulative-time output. The function that dominates is almost never the one you suspected, and the fix is almost never in the function with the ugliest code. This step is the one everybody skips and everybody regrets skipping.',
              code_snippet: 'python -m cProfile -s cumtime slow.py | head -20',
            },
            {
              title: '3. Fix one thing',
              desc: 'Change exactly one thing and re-measure. Two changes at once means you cannot attribute the result, and the second change can hide a regression introduced by the first. Small, attributable, reversible steps are what make optimisation reviewable at all.',
              code_snippet: '# before: O(n^2) -- 4 x 10^8 comparisons\nif any(row["id"] == wanted for row in rows):\n\n# after: O(n) -- 20_000 hash lookups\nby_id = {row["id"]: row for row in rows}\nif wanted in by_id:',
            },
            {
              title: '4. Measure again, and keep the test',
              desc: 'Assert that the result is still correct before you celebrate the speed-up. A faster wrong answer is worth less than a slow right one, and the moment a profile pushes you into a rewrite is exactly when a regression hides.',
              code_snippet: 'assert result == expected           # correctness first\nassert elapsed < baseline * 0.5     # then the performance claim',
            },
            {
              title: '5. Stop when it is fast enough',
              desc: 'Decide what "fast enough" means before you start: 200 ms for a CLI command a human is waiting on, 50 ms per request at your real throughput. Past that point, further optimisation costs readability and buys nothing, because nobody is sitting there waiting.',
              code_snippet: '# 0.19 s -> 0.11 s : invisible to the user\n# 4.10 s -> 0.60 s : a difference somebody would notice\n# Ship the fast version only when the number the user feels has moved.',
            },
          ],
        }),
        b.md(`## Where the wins actually are

Optimisations are not equal. This is the order they are worth trying in, with real numbers from CPython 3.12 on a laptop a few years old. The pattern is always the same: **fix the algorithm, then fix the data structure, then — and only then — worry about the loop body.**

\`\`\`python
import time
from itertools import combinations

# --- 1. The wrong data structure: O(n) becomes O(1) --------------------
def overlaps_slow(a, b):
    return any(x in b for x in a)            # O(len(a) * len(b))


def overlaps_fast(a, b):
    return not set(a).isdisjoint(b)          # O(len(a) + len(b))


left, right = list(range(5_000)), list(range(2_500, 7_500))

t = time.perf_counter()
overlaps_slow(left, right)
slow = time.perf_counter() - t

t = time.perf_counter()
overlaps_fast(left, right)
fast = time.perf_counter() - t

print(f"{slow:.2f}s -> {fast * 1000:.1f}ms")   # 1.42s -> 1.1ms

# --- 2. One pass instead of one pass per distinct user ------------------
def total_by_user_slow(rows):
    users = sorted({row["user"] for row in rows})          # 4,000 distinct users
    return {user: sum(r["amount"] for r in rows if r["user"] == user) for user in users}
                                      # 4,000 passes over 200,000 rows = 800M comparisons


def total_by_user_fast(rows):
    totals = {}
    for row in rows:                                       # 200,000 iterations, once
        totals[row["user"]] = totals.get(row["user"], 0) + row["amount"]
    return totals
\`\`\`

The honest version of the second example is the first: when the inner loop is a \`x in some_list\` over 200,000 rows, replacing that list with a set is the entire optimisation. Everything else in the function is noise.`),
        b.table(
          'Real before-and-after numbers, CPython 3.12',
          ['Change', 'Before', 'After', 'Why it is that much'],
          [
            ['`x in list` to `x in set` (20,000 lookups over 20,000 items)', '1.98 s', '0.0039 s', 'O(n) scan becomes an O(1) hash probe — a 508x win from one data structure'],
            ['Pairwise overlap check over 5,000 items', '1.42 s', '0.0011 s', 'O(n²) becomes O(n): 12.5M comparisons collapse to 7,500'],
            ['`s += piece` to `"".join(pieces)` for 50,000 pieces', '0.412 s', '0.0031 s', 'each `+=` reallocates and copies everything so far; join allocates once'],
            ['List comprehension vs `append` in a loop, 1M iterations', '0.115 s', '0.041 s', '`LIST_APPEND` bytecode avoids the attribute lookup and the method call'],
            ['1M calls of a trivial function, vs inlining it', '0.113 s', '0.094 s', 'a Python call costs about 80 ns; the whole "optimisation" is 19 ms'],
            ['1M one-attribute instances, then with `__slots__`', '152 MB', '48 MB', 'the per-instance `__dict__` (104 B) disappears entirely'],
          ]
        ),
        b.md(`## The micro-optimisations that usually do not matter

The bottom five rows of that table are real, and four of them are a waste of your time in almost every program. A Python function call is roughly 80 ns; a CLI command a human is waiting on takes 200 ms, so shaving 19 ms off it is invisible. Rewriting \`items.append(x)\` as a comprehension in a function that runs 20 times changes nothing you can observe.

Two exceptions are worth internalising anyway, because they cost nothing to write:

- **Local variable lookup in a hot loop.** Name resolution for a local is a dictionary index; for a global or a built-in it is a namespace search plus a fallback. Binding \`append = items.append\` outside a loop that runs a million times is free and, for very tight loops, worth a few percent.
- **\`in\` on a set instead of a list.** Not a micro-optimisation — this is the 500x row again, and it is the single most common real win in Python code.

Everything else on that list of "make it faster" tricks trades a line of readable code for a number nobody will see. \`is not None\` is not faster than \`!= None\` in a way that matters, and rewriting it costs you the ability to read your own code six months later.`),
        b.md(`## \`__slots__\`: the one memory optimisation worth knowing

A normal instance carries a \`__dict__\` created lazily, and that dictionary is the single largest part of the object — 104 bytes minimum, more per entry, on top of the 48 bytes the object itself needs. Declaring \`__slots__\` replaces that dictionary with a fixed set of slots carved into the instance.

\`\`\`python
import sys


class Plain:
    def __init__(self, name):
        self.name = name


class Slotted:
    __slots__ = ("name",)

    def __init__(self, name):
        self.name = name


print(sys.getsizeof(Plain("a")))            # 48  -- the dict is extra
print(sys.getsizeof(Plain("a").__dict__))  # 104 -- and this is the point
print(sys.getsizeof(Slotted("a")))          # 48  -- all of it, plus the slot
\`\`\`

48 + 104 = 152 bytes per instance versus 48. At a million objects that is 152 MB down to 48 MB, and attribute access skips a dictionary probe.

The cost is rigidity, and it is a real cost. With \`__slots__\`, assigning an attribute that was not declared raises \`AttributeError\`, so subclasses cannot add attributes freely, you cannot attach runtime state to an instance, and \`vars(obj)\` is gone. That makes it right for fixed-shape value objects like a dataclass with \`@dataclass(slots=True)\`, and wrong for anything open-ended, heavily subclassed, or monkey-patched by a test.

\`\`\`python
from dataclasses import dataclass


@dataclass(slots=True)
class Point:
    x: float
    y: float


print(Point(1.0, 2.0))          # Point(x=1.0, y=2.0)
print(Point.__slots__)          # ('x', 'y')
p = Point(1.0, 2.0)
p.z = 3                         # AttributeError: 'Point' object has no attribute 'z'
\`\`\``),
        b.diagram(
          'The decision tree, in the order you should walk it',
          `flowchart TD
    A["Something is slow. How slow?"] --> B["Write the number down.<br/>perf_counter, worst realistic input"]
    B --> C{"Where does the time go?"}
    C -->|"cProfile, or py-spy on<br/>a live process"| D{"CPU-bound or I/O-bound?"}
    D -->|"I/O: sockets, files, sleeps"| E["Threads or asyncio.<br/>The GIL is released while you wait."]
    D -->|"CPU: arithmetic, parsing, loops"| F["Fix the algorithm first.<br/>O(n2) to O(n) beats every micro-tweak."]
    F --> G{"Still too slow?"}
    G -->|"No"| K["Ship it. Add the timing to a comment."]
    G -->|"Yes"| H["Re-profile.<br/>Maybe it was 5 percent of the time all along."]
    H --> I{"Still too slow?"}
    I -->|"No"| K
    I -->|"Yes"| J["Now consider a C extension or NumPy.<br/>Only now, and only for the hot loop."]
    E --> K
    J --> K`
        ),
        b.checklist('The routine, as a checklist', [
          '**Measure first.** `time.perf_counter()` around the whole thing, with the largest input you expect in production.',
          '**Profile second.** `python -m cProfile -s cumtime prog.py`, then `snakeviz` or `tuna` if the flat list is unreadable.',
          '**Sort by cumulative time, then read `tottime`.** The function with the highest `tottime` is where the work actually happens.',
          '**Check for the algorithmic win first.** Quadratic loops, `x in list` inside a loop, repeated string concatenation, sorting inside a loop.',
          '**Change one thing, then re-measure.** Two changes at once and you have learned nothing.',
          '**Assert correctness before you assert speed.** A faster wrong answer is a regression with a good story.',
          '**Keep the input data realistic.** Timing 10 rows tells you about 10 rows.',
          '**Stop when it is fast enough.** Write down the target before you start, and do not exceed it.',
          '**Only then consider NumPy or a C extension,** and only around the loop the profile pointed at, not around the program.',
          '**Re-profile after shipping.** The bottleneck you fixed was rarely the one that mattered, and the workload will have moved.',
        ]),
        b.warn(
          'When not to optimise at all',
          'If the program runs once a day, or handles 200 records, or a human is waiting on the output — the runtime is not the problem. Optimising it anyway costs you readability, adds a second code path to maintain, and produces a number in a commit message that means nothing. The rule from the checklist is the whole module: measure, and only care if the measurement is bad.'
        ),
        b.resources('Profilers and further reading', [
          { label: 'timeit — the standard library timing module', url: 'https://docs.python.org/3/library/timeit.html' },
          { label: 'cProfile — the standard library profiler', url: 'https://docs.python.org/3/library/profile.html' },
          { label: 'py-spy — sampling profiler that attaches to a running process', url: 'https://github.com/benfred/py-spy' },
          { label: 'snakeviz — flame graphs for cProfile output', url: 'https://jiffyclub.github.io/snakeviz/' },
          { label: 'The GIL, explained properly (CPython docs)', url: 'https://docs.python.org/3/glossary.html#term-global-interpreter-lock' },
          { label: 'PEP 703 — making the GIL optional', url: 'https://peps.python.org/pep-0703/' },
        ]),
      ],
      questions: [
        [
          'What does the Global Interpreter Lock actually prevent?',
          [
            'Two threads in the same process from executing Python bytecode at the same instant',
            'Two processes from writing to the same file',
            'C extension code from running alongside Python code',
            'Any program from using more than one CPU core',
          ],
          0,
          'The GIL is a mutex around the interpreter’s evaluation loop, so one process runs one thread’s bytecode at a time. It does not restrict separate processes, does not stop I/O concurrency — a thread blocked on a socket releases it — and does not stop extensions such as NumPy that release the GIL and run in parallel.',
        ],
        [
          'A script takes 40 seconds. What is the first thing to do?',
          [
            'Rewrite the hot loop in a more Pythonic style',
            'Add `__slots__` to every class involved',
            'Time it with `perf_counter` or `timeit`, then run `cProfile` and read the top functions',
            'Port it to C',
          ],
          2,
          'Intuition about hot spots is wrong often enough to be useless, so measuring is always the first move. `cProfile` attributes time and call counts per function, and `snakeviz` turns that into a flame graph so the one dominating function is obvious. Optimising before profiling reliably means optimising the wrong code.',
        ],
        [
          'Replacing `if x in some_list:` with a set built once is a large win because:',
          [
            'Sets skip equality checks on their members',
            'A list membership test is O(n) while a set membership test is O(1) on average, so a scan inside a loop drops from O(n²) to O(n)',
            'Sets are stored sorted, so lookup is a binary search',
            'A set stores each reference only once, so it uses less memory than a list',
          ],
          1,
          '`in` on a list walks the list comparing each element, so doing it once per element is quadratic. A set is a hash table with average-time lookup regardless of size. The same trick turns "do these two lists share an item?" from 12.5 million comparisons into one `isdisjoint` call.',
        ],
        [
          'What does `__slots__` change, and what does it not change?',
          [
            'It makes instances immutable',
            'It removes the per-instance `__dict__`, cutting memory and speeding attribute lookup, but instances can then no longer take undeclared attributes',
            'It speeds attribute access by skipping the descriptor protocol',
            'It converts the class into a C-level type',
          ],
          1,
          '`__slots__` replaces the per-instance dictionary with a fixed set of slots, which is why a one-attribute instance drops from about 152 bytes to 48 and lookup skips a dict probe. The price is rigidity: assigning an undeclared attribute raises `AttributeError`, subclasses cannot add attributes freely, and `vars(obj)` is gone — so it suits fixed-shape value objects and poorly suits anything open-ended.',
        ],
      ],
    },
  ]
);
