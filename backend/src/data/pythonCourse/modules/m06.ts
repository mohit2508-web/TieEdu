// Module 6 — Dictionaries and Sets.
//
// Both of these are hash tables underneath, and that is the entire reason to
// use them. A list answers "is x in here?" by comparing against every element;
// a set or dict hashes the key once and jumps straight to a bucket. The module
// is about recognising when that difference matters, and about the two things
// hash containers do that sequences do not: they require hashable keys, and
// their views are live.
//
// Ordered since 3.7, so "unordered" here means "you must not depend on the
// order" — not "the order is random".

import { mod } from '../blocks';

export const M6 = mod(
  'crs-python-programming',
  'py-m6',
  6,
  'Module 6 — Dictionaries and Sets',
  'Hash tables: fast keyed lookup, the rules about hashable keys, live views, and the set operations that replace a lot of hand-written filtering.',
  [
    {
      title: 'Dictionaries',
      summary: 'A dict maps hashable keys to values in constant time, keeps insertion order, and raises instead of guessing when a key is missing.',
      duration: 17,
      build: (b) => [
        b.md(`## A dict is a hash table with a value column

A list answers questions by position: \`scores[3]\`. A dict answers them by key: \`scores["alan"]\`. That is the entire surface difference, and underneath it is a different data structure with a different cost profile.

When you write \`d[key]\`, CPython:

1. calls \`hash(key)\` to get a large integer,
2. reduces that to a bucket index,
3. walks the short chain in that bucket, comparing keys with \`==\`,
4. returns the stored value, or raises \`KeyError\`.

Steps 1 and 2 are the same work no matter how big the dict is, and step 3 is almost always zero or one comparisons. So lookup, insert and delete are all **O(1) on average** — while \`x in list\` is O(n). That one difference decides where you reach for a dict.

\`\`\`python
inventory = {"apples": 12, "pears": 3}

inventory["apples"]              # 12
inventory["plums"]               # KeyError: 'plums'
inventory.get("plums")           # None
inventory.get("plums", 0)        # 0
"apples" in inventory            # True
"plums" in inventory             # False
len(inventory)                   # 2
\`\`\`

Note that \`get\` returns \`None\` for a missing key by default, which is not the same as a stored \`None\`. If your dict can legitimately hold \`None\`, use a sentinel:

\`\`\`python
settings = {"theme": None}
print(settings.get("theme", "light"))     # None — the value really is None
print(settings.get("font", "light"))      # light — a sensible default
\`\`\`

## Keys must be hashable, and that is not the same as immutable

Immutable is close, but not identical. A key has to produce a stable hash and be comparable with \`==\`. \`str\`, \`int\`, \`float\`, \`bool\`, \`None\`, \`bytes\` and \`tuple\` of hashables qualify. \`list\`, \`set\` and \`dict\` do not.

\`\`\`python
d = {(1, 2): "pair", "name": "ada", 7: "int"}
print(d[(1, 2)])                  # pair

d[[1, 2]] = "nope"                # TypeError: unhashable type: 'list'
\`\`\`

A list cannot be a key because it can change after you put it in, and the table has already recorded where to look for it. A tuple works precisely because it promises never to change. **If you find yourself wanting a list as a key, convert it to a tuple** — \`(x, y)\` for coordinates, \`tuple(row)\` for a database row.

## Insertion order is guaranteed

Since Python 3.7, dicts preserve insertion order, and 3.6 already did in practice. Reassigning an existing key does **not** move it:

\`\`\`python
d = {}
d["b"] = 1
d["a"] = 2
d["b"] = 99
print(list(d))                   # ['b', 'a']   — b keeps its original position
\`\`\`

So you can rely on the order of a dict you built yourself. What you cannot rely on is the order of a dict you did not control the insertion into — after a merge, a filter, or a rebuild from a set. Treat that order as an implementation detail and sort explicitly when it matters.

## The three iteration forms

\`\`\`python
user = {"name": "ada", "role": "engineer", "active": True}

for k in user:                   # keys
    print(k)
for v in user.values():          # values
    print(v)
for k, v in user.items():        # pairs, unpacked
    print(f"{k} = {v}")

print("name" in user)            # True  — tests keys only
print("ada" in user)             # False — values are not searched
\`\`\`

Iterating a dict directly gives you keys. This surprises people who arrive from JavaScript, where \`for (const x in obj)\` also gives keys, and from C++, where iterating a map gives you pairs. In Python: \`for k in d\` is keys, and \`for k, v in d.items()\` is what you almost always want.

## Keys, values and items are views, and views are live

\`\`\`python
d = {"a": 1, "b": 2}
ks = d.keys()

d["c"] = 3
print(list(ks))                  # ['a', 'b', 'c']  — the view followed the change
\`\`\`

\`keys()\`, \`values()\` and \`items()\` return **view objects**, not lists. They hold a reference to the dict and re-read it every time you iterate. That is why they are cheap to create (O(1)) and why they change under you. Wrap one in \`list(...)\` when you want a snapshot.

Because the view is live, **changing a dict's size while you iterate it raises**:

\`\`\`python
d = {"a": 1, "b": 2}
for k in d:
    d[k + "!"] = 0
# RuntimeError: dictionary changed size during iteration
\`\`\`

The same rule applies to lists: appending inside a \`for x in items\` loop skips elements. Fix both by snapshotting first — \`for k, v in list(d.items()):\` — or by collecting the keys to add and applying them after the loop. The RuntimeError is Python protecting you from a bug that would otherwise be silent and data-dependent.

## Adding and removing

\`\`\`python
d = {"a": 1, "b": 2}

d["c"] = 3                       # add or overwrite
d.update({"a": 10, "d": 4})      # add or overwrite, many at once
del d["b"]                       # KeyError if absent
removed = d.pop("zzz", None)     # safe delete with a default
d.clear()                        # empties it in place
\`\`\`

Note that \`d["a"] = 10\` overwrites silently. A dict is the right tool when "this is now the value" is the intended meaning, and the wrong tool when you meant "only set it if it was not already set" — that is \`setdefault\`, and we get to it in the next lesson.`),
        b.anim('nodes', {
          title: 'What a dict is doing: hash the key, find the bucket, walk the chain',
          badge: 'hash table',
          steps: [
            {
              caption: 'Two keys collided into bucket 1',
              note: 'hash("kiwi") and hash("fig") both reduced to bucket 1, so their entries are chained. Lookup is: hash the key, jump to the bucket, then compare keys along the chain with ==.',
              tail: 'd["kiwi"]',
              nodes: [
                { id: 'e1', data: '"kiwi" -> 3', pointsTo: 'e2', tone: 'int', note: 'inserted first' },
                { id: 'e2', data: '"fig" -> 7', tone: 'int', note: 'collided into bucket 1' },
              ],
            },
            {
              caption: 'A third key lands in the same bucket',
              note: 'The average chain length is kept near 1 by growing the table when it gets long, so collisions like this are the exception rather than the rule.',
              tail: 'd["plum"]',
              nodes: [
                { id: 'e1', data: '"kiwi" -> 3', pointsTo: 'e2', tone: 'int', note: 'inserted first' },
                { id: 'e2', data: '"fig" -> 7', pointsTo: 'e3', tone: 'int', note: 'collided into bucket 1' },
                { id: 'e3', data: '"plum" -> 5', tone: 'ok', note: 'just inserted' },
              ],
            },
            {
              caption: 'A lookup walks the chain comparing keys, never scanning everything',
              note: 'Three entries live in the dict but the search touched at most three. Make the dict a million entries and this walk stays at one or two comparisons — that is the O(1) promise, on average.',
              tail: 'd["plum"]',
              nodes: [
                { id: 'e1', data: '"kiwi" -> 3', pointsTo: 'e2', tone: 'int', note: 'key != "plum"' },
                { id: 'e2', data: '"fig" -> 7', pointsTo: 'e3', tone: 'int', note: 'key != "plum"' },
                { id: 'e3', data: '"plum" -> 5', tone: 'ok', note: 'key == "plum" -> return 5' },
              ],
            },
            {
              caption: 'Deleting unlinks the entry; the chain is shortened, not rebuilt',
              note: 'CPython marks the dead entry and leaves a dangle, then repairs the chain on the next insertion or resize. The dict never walks the whole table to remove one key.',
              tail: 'bucket 1',
              nodes: [
                { id: 'e1', data: '"kiwi" -> 3', pointsTo: 'e2', tone: 'int', note: 'inserted first' },
                { id: 'e2', data: '"plum" -> 5', tone: 'ok', note: '"fig" unlinked' },
              ],
            },
            {
              caption: 'Once the load factor gets high, the table doubles and every key is rehashed',
              note: 'This is the one genuinely expensive dict operation: O(n) spread across n inserts, so O(1) amortised. A resize is why a loop that inserts into a fresh dict can occasionally take a visible pause.',
              tail: 'bucket 2',
              nodes: [
                { id: 'e1', data: '"kiwi" -> 3', tone: 'int', note: 'now alone in its bucket' },
              ],
            },
          ],
        }),
        b.lead('The dict operations, in one table'),
        b.table(
          'Reading and writing a dict',
          ['Expression', 'Result', 'If the key is missing'],
          [
            ['`d[k]`', 'the value', 'raises `KeyError`'],
            ['`d.get(k)`', 'the value, or `None`', 'returns `None`'],
            ['`d.get(k, default)`', 'the value, or the default you supplied', 'returns `default`'],
            ['`k in d`', '`True` or `False`', 'returns `False`, never raises'],
            ['`len(d)`', 'number of key/value pairs', '`0`'],
            ['`d.keys()` / `.values()` / `.items()`', 'a live view, not a copy', 'empty view'],
            ['`d.pop(k)`', 'the value, and removes the pair', 'raises `KeyError`'],
            ['`d.pop(k, default)`', 'the value, and removes the pair', 'returns `default`'],
            ['`del d[k]`', 'removes the pair', 'raises `KeyError`'],
            ['`d.setdefault(k, v)`', 'the value; inserts `v` if absent', 'inserts and returns `v`'],
          ]
        ),
        b.code(
          `# inventory.py — the shapes you will actually write
inventory = {"apples": 12, "pears": 3, "plums": 0}

# Reading: [] insists, get() supplies a fallback
print(inventory["apples"])                   # 12
print(inventory.get("plums", 0))            # 0
print(inventory.get("figs"))                # None
# print(inventory["figs"])                  # KeyError: 'figs'

# Writing
inventory["figs"] = 8
inventory.update({"apples": 4, "dates": 20})
print(inventory)
# {'apples': 4, 'pears': 3, 'plums': 0, 'figs': 8, 'dates': 20}

# Order is insertion order, and re-assigning an existing key does not move it
print(list(inventory)[:3])                  # ['apples', 'pears', 'plums']

# The three iteration forms
for name, count in inventory.items():
    print(f"{name:6} {count:>3}")

# Membership tests keys only
print("pears" in inventory)                 # True
print(3 in inventory)                       # False

# Views are live; snapshot when you need a stable copy
keys = inventory.keys()
inventory["kiwi"] = 5
print(len(list(keys)))                      # 7

# Deleting safely
inventory.pop("kiwi", None)
del inventory["dates"]
print(sorted(inventory.items()))
# [('apples', 4), ('figs', 8), ('pears', 3), ('plums', 0)]
`,
          'inventory.py'
        ),
        b.warn(
          'Mutating a dict inside a loop over it',
          '`for k in d: d[k] = ...` is safe when you only change values, because the size does not change. `for k in d: d[k] = ...` where you also add keys raises `RuntimeError: dictionary changed size during iteration`. Iterate over `list(d.items())` when you need to add or remove, and the exception disappears.',
        ),
        b.tip(
          'The lookup key is the performance decision',
          'The cost of a lookup is the cost of hashing the key. Hashing a short string is a few nanoseconds; hashing a long string, or a tuple of ten elements, is proportionally more. If you are looking up in a hot loop, hashable short keys — ids, codes, interned strings — are worth several times more than they look.',
        ),
        b.code(
          `# wordcount.py — why a dict, not a list
text = "the quick brown fox jumps over the lazy dog the fox"
words = text.split()

# A list would need a linear scan per word: O(n^2) overall.
seen = {}
for word in words:
    seen[word] = seen.get(word, 0) + 1
print(seen["the"], seen["fox"])             # 3 2

# \`in\` on a list is O(n); on a dict it is O(1).
words_list = words[:]
print("the" in words_list, "the" in seen)   # True True

# A set of the same words answers membership for free, and gives you
# the vocabulary with no duplicates and no counting.
vocabulary = set(words)
print(len(vocabulary), len(words))          # 8 9
print(sorted(vocabulary)[:4])               # ['brown', 'dog', 'fox', 'jump']

# Everything that is a key, nothing that is a value
prices = {"apples": 2, "pears": 3}
print("apples" in prices, 2 in prices)       # True False
`,
          'wordcount.py'
        ),
        b.steps('How a lookup actually runs', [
          {
            title: 'Hash the key',
            desc: 'The key object\'s __hash__ method returns a large integer. For a str this mixes every character, so "kiwi" and "kiwii" land nowhere near each other.',
            code_snippet: 'hash("kiwi")  # a 64-bit integer, stable for the life of the process',
          },
          {
            title: 'Reduce to a bucket index',
            desc: 'The table masks or mods that hash down to a slot index. This step is O(1) and is the reason the whole structure scales.',
            code_snippet: 'index = hash(key) & (table_size - 1)',
          },
          {
            title: 'Walk the short chain',
            desc: 'Entries that collided sit in the same bucket. Python compares the stored key with == (so 1 and True are the same key, and 1 and 1.0 are the same key too).',
            code_snippet: 'for entry in bucket:\n    if entry.key == key:\n        return entry.value',
          },
          {
            title: 'Return the value, or raise',
            desc: 'A miss is a KeyError with the offending key printed. That is why d[k] on a missing key is loud and d.get(k) is quiet: the loud version is right when the key is supposed to be there.',
            code_snippet: 'inventory["figs"]   # KeyError: \'figs\'',
          },
          {
            title: 'Occasionally, everything moves',
            desc: 'When the table fills up it is resized and every key is rehashed into the new, larger table. That is O(n) in one hit, spread across n inserts, which is why dict operations are described as O(1) amortised.',
            code_snippet: '# a resize is the only O(n) moment in a dict\'s life',
          },
        ]),
        b.info(
          'Insertion order, and what "unordered" really means',
          'Since Python 3.7 the language guarantees that a dict iterates in insertion order, so the `head -> ... -> NULL` chain above is a bucket, not the dict. The word "unordered" in older documentation means the order is not part of the *type contract* for dicts you did not build yourself — after a merge, a comprehension over a set, or a filter — not that the order is random.',
        ),
      ],
      questions: [
        [
          'What happens when you evaluate `d["colour"]` on a dict with no "colour" key?',
          [
            'It returns `None`',
            'It returns an empty string',
            'It raises `KeyError`',
            'It inserts the key with a value of `None`',
          ],
          2,
          'Subscript syntax asserts that the key is there, so a missing key raises `KeyError` with the offending key named. `d.get("colour")` is the version that returns `None` when you genuinely do not care, and `d.get("colour", "black")` supplies your own default.',
        ],
        [
          'Which of these is a legal dictionary key?',
          [
            '`[1, 2]`',
            '`{"id": 7}`',
            '`(1, 2)`',
            '`{7, 8}`',
          ],
          2,
          'A key must be hashable, which means it needs a stable hash and equality comparison. A tuple of immutable values has both. Lists, dicts and sets are mutable, so their hash could change after they were inserted and the table would be corrupted — Python refuses at the point of insertion rather than letting you corrupt it later.',
        ],
        [
          'After `d = {"a": 1, "b": 2}`, running `for k in d: d[k + "x"] = 0` results in what?',
          [
            'The loop finishes and `d` has four keys',
            '`RuntimeError: dictionary changed size during iteration`',
            '`KeyError` on the first iteration',
            'An infinite loop, because the dict keeps growing',
          ],
          1,
          'Iterating a dict uses a live view, and CPython detects that the size changed mid-iteration and raises. This is the same class of bug as appending to a list while iterating it. Iterate over `list(d.items())` if you need to add keys inside the loop.',
        ],
        [
          'What does `for x in d` iterate over when `d` is a dictionary?',
          [
            'The keys',
            'The values',
            'The key/value pairs, which unpack automatically',
            'The internal hash table entries',
          ],
          0,
          'Iterating a dict directly yields keys, which makes `for k in d` and `for k in d.keys()` identical. For pairs use `for k, v in d.items()`, and for values alone use `d.values()`. Membership tests keys only — `"ada" in d` is False even when `"ada"` is a stored value.',
        ],
      ],
    },
    {
      title: 'dict methods and nested data',
      summary: 'The full method set, shallow versus deep copying, comprehensions, defaultdict and Counter, and the data shape every JSON document uses.',
      duration: 18,
      build: (b) => [
        b.md(`## The methods, and the one that bites

\`\`\`python
d = {"a": 1, "b": 2}

d.update({"a": 9, "c": 3})      # merge; existing keys are overwritten
d.setdefault("a", 99)          # 1  — returns the existing value, inserts only if absent
d.setdefault("z", 0)           # 0  — and inserts 0
d.pop("b")                     # 2  — and removes the pair
d.pop("q", None)               # None — safe delete with a default
d.popitem()                    # removes and returns the LAST inserted pair
d.copy()                       # a shallow copy — see below
d.clear()                      # empties it in place
\`\`\`

\`setdefault(k, v)\` is the one to think hardest about, because it has a hidden cost: **the default is evaluated whether or not it is used.** If you write \`d.setdefault("items", expensive())\`, \`expensive()\` runs on every call. \`d[k] = d.get(k, 0) + 1\` is the same idea with no surprise, and for a counter that is what you want anyway.

\`popitem()\` removes the *last* pair, which makes it a LIFO, not a FIFO. Combined with the fact that it raises \`KeyError\` on an empty dict, it is a small detail that matters if you are using a dict as a work queue — for that, use \`next(iter(d))\` to take the first, or just use a \`deque\`.

## \`copy()\` is shallow, and that word has teeth

\`\`\`python
import copy

original = {"name": "prod", "hosts": ["a.example", "b.example"]}
shallow = original.copy()                 # a new dict...
deep = copy.deepcopy(original)            # ...and new everything below it

shallow["hosts"].append("c.example")
print(original["hosts"])
# ['a.example', 'b.example', 'c.example']   <- the ORIGINAL changed too
\`\`\`

\`dict.copy()\` and \`dict.copy()\` via \`|{}\` build a new dict object and copy the *references* to the values. The nested list is one object, and both dicts point at it. This is the same rule as \`list[:]\` from module 5, one level down, and the animation below draws it.

The rule of thumb: **shallow copy is right when the values are immutable or when nobody will ever mutate them.** It is wrong the moment a caller can reach in and change a nested structure. Configuration objects, caches and anything crossing a module boundary are where this bites.

## Dict comprehensions

The comprehension is the idiomatic way to build a dict, and it is the same shape as the list comprehension with a \`key: value\` pair:

\`\`\`python
words = ["the", "quick", "brown", "fox", "the"]
counts = {word: words.count(word) for word in set(words)}
print(counts)                # every value is 1 — count() is O(n), so this is O(n^2)

lengths = {word: len(word) for word in words}
print(lengths)
# {'the': 3, 'quick': 5, 'brown': 5, 'fox': 3}
\`\`\`

That first line is a real performance trap, and it is instructive: \`words.count(word)\` rescans the whole list for every distinct word. It produces the right answer, just slowly. The fast version is a \`Counter\` or a \`get\` loop, both of which we get to below. Use comprehensions for transforms; use a loop when each entry depends on what came before.

## Nested dicts and lists of dicts: the shape of real data

Nearly every structured document you will handle — JSON, YAML, a database result set, an HTTP response body — is built from exactly two containers:

- a **dict** for an object with named fields,
- a **list** for an array.

\`\`\`python
order = {
    "id": 1041,
    "customer": {"name": "ada", "email": "ada@example.com"},
    "items": [
        {"sku": "A1", "qty": 2, "price": 9.99},
        {"sku": "B7", "qty": 1, "price": 24.50},
    ],
    "paid": True,
}

print(order["customer"]["name"])                     # ada
print(order["items"][0]["sku"])                      # A1
total = sum(item["qty"] * item["price"] for item in order["items"])
print(round(total, 2))                               # 44.48

# The one shape that breaks: a list of records with different fields
rows = [{"id": 1, "name": "ada"}, {"id": 2}]
print(rows[1]["name"])                               # KeyError: 'name'
\`\`\`

That last failure is the reason \`.get()\` exists and the reason \`dataclass\` exists. When records can be missing fields, either use \`row.get("name")\` with a default, or define a type that has every field with a default value.

\`\`\`python
import json
with open("order.json", encoding="utf-8") as fh:
    order = json.load(fh)          # produces exactly the shape above, with str keys
\`\`\`

## \`defaultdict\` and \`Counter\`

Grouping is the single most common dict operation, and Python ships two tools for it.

\`\`\`python
from collections import defaultdict, Counter

rows = [("a", 1), ("b", 2), ("a", 3)]

# The manual version
by_key = {}
for key, value in rows:
    by_key.setdefault(key, []).append(value)
print(by_key)                     # {'a': [1, 3], 'b': [2]}

# The defaultdict version: the factory is only called on a miss
groups = defaultdict(list)
for key, value in rows:
    groups[key].append(value)
print(dict(groups))               # {'a': [1, 3], 'b': [2]}
print(groups["missing"])          # []  <- and it quietly creates the key
\`\`\`

Note the last line, which is \`defaultdict\`'s one sharp edge: reading a missing key **inserts** it. A typo like \`groups["a"]\` (singular) becomes a permanent empty entry rather than a \`KeyError\`. If you cannot tolerate that, use \`.get()\`.

\`Counter\` is a dict subclass where every key starts at zero:

\`\`\`python
from collections import Counter

c = Counter("mississippi")
print(c)                          # Counter({'i': 4, 's': 4, 'p': 2, 'm': 1})
print(c.most_common(2))           # [('i', 4), ('s', 4)]
print(c["z"])                     # 0  <- missing keys read as zero, and are not inserted

words = ["the", "quick", "brown", "fox", "the"]
print(Counter(words)["the"])      # 2

# Counting from a list of dicts is the other common shape
people = [{"name": "ada", "city": "london"}, {"name": "alan", "city": "london"}]
by_city = Counter(p["city"] for p in people)
print(by_city.most_common())      # [('london', 2)]
\`\`\`

\`Counter\` also supports arithmetic: \`c1 - c2\` gives counts of items in \`c1\` but not \`c2\`, and \`c1 & c2\` gives the minimum count for items in both. \`most_common(n)\` uses a heap and is O(n log n), so it is fine to call on a large counter.

## The merge operators

Python 3.9 added \`|\` and \`&=\` for dicts, and they read the way they do for sets:

\`\`\`python
defaults = {"timeout": 30, "retries": 3, "verbose": False}
overrides = {"retries": 5, "verbose": True}

merged = defaults | overrides      # a NEW dict; the right side wins
print(merged)
# {'timeout': 30, 'retries': 5, 'verbose': True}
print(defaults)                    # unchanged

defaults |= overrides              # in place, 3.9+
print(defaults["retries"])         # 5
\`\`\`

The right-hand side wins on conflicts, and the result preserves the position of keys from the left operand, with genuinely new keys appended. \`d | {"k": v}\` is a clean way to say "copy this dict and set one key", which is much clearer than the \`copy-then-assign-then-rebind\` dance.

## The grouping pattern, three ways

\`\`\`python
rows = [("a", 1), ("b", 2), ("a", 3), ("c", 4), ("b", 5)]

# 1. setdefault — no import, one pass, but builds the default every time
one = {}
for key, value in rows:
    one.setdefault(key, []).append(value)

# 2. defaultdict — the factory is only called on a miss, so it is the fastest
from collections import defaultdict
two = defaultdict(list)
for key, value in rows:
    two[key].append(value)

# 3. a comprehension with a helper, when the grouping is the whole job
def group(items):
    out = {}
    for key, value in items:
        out.setdefault(key, []).append(value)
    return out

print(dict(two) == one == group(rows))    # True
\`\`\`

All three produce the same dict. Reach for \`defaultdict\` in library and application code; reach for \`setdefault\` in a five-line script where an import is not worth it.`),
        b.anim('memory', {
          title: 'Why dict.copy() is shallow: two dicts, one shared nested list',
          badge: 'shallow copy',
          base: 140737488355328,
          cell_bytes: 4,
          cells: [
            { bytes: ['0A 00 00 00'], label: 'dict A', note: 'The original dict object. Its values are references.', tone: 'data' },
            { bytes: ['0B 00 00 00'], label: 'dict B', note: 'The copy. A different object, built by dict.copy().', tone: 'data' },
            { bytes: ['0C 00 00 00'], label: 'the list', note: 'ONE list object. Both dicts hold a reference to this same cell.', tone: 'warn' },
            { bytes: ['61 00 00 00'], label: 'hosts[0]', note: 'The string "a.example". Strings are immutable, so sharing them is safe.', tone: 'ok' },
          ],
          steps: [
            {
              caption: 'original is a dict whose "hosts" value is a reference to a list',
              note: 'A dict stores references, exactly like a list. The dict object and the list object are two separate things, and the dict merely points at the list.',
              vars: [
                { name: 'original', type: 'dict', value: 'id 0x0A', pointsTo: 0, tone: 'ok' },
              ],
              highlight: [0, 2],
            },
            {
              caption: 'shallow = original.copy() builds dict B, pointing at the SAME list',
              note: 'copy() allocates a new dict and copies the entries — which means it copies the references. The pointer to the list is copied verbatim. No new list was created.',
              vars: [
                { name: 'original', type: 'dict', value: 'id 0x0A', pointsTo: 0, tone: 'ok' },
                { name: 'shallow', type: 'dict', value: 'id 0x0B', pointsTo: 1, tone: 'ok' },
              ],
              highlight: [0, 1, 2],
            },
            {
              caption: 'shallow["hosts"].append(...) mutates the one shared list',
              note: 'The lookup finds the reference in dict B, that reference leads to the one list, and the list grows. Nothing about dict A changed — the object it points at did.',
              vars: [
                { name: 'original', type: 'dict', value: 'hosts -> 3 items', pointsTo: 0, tone: 'warn' },
                { name: 'shallow', type: 'dict', value: 'hosts -> 3 items', pointsTo: 1, tone: 'warn' },
              ],
              highlight: [2],
            },
            {
              caption: 'copy.deepcopy would have built a second list instead',
              note: 'Deep copy recurses: it rebuilds every container it finds below the top level. That is the safety you pay for with O(size of the whole structure) time and memory — and the reason a shallow copy is the right default when nobody mutates the nested data.',
              vars: [
                { name: 'original', type: 'dict', value: 'hosts -> 2 items', pointsTo: 0, tone: 'ok' },
                { name: 'deep', type: 'dict', value: 'its own list', tone: 'ok' },
              ],
              highlight: [0, 2],
            },
          ],
        }),
        b.table(
          'The dict method set',
          ['Call', 'Returns', 'What it does'],
          [
            ['`d.update(other)`', '`None`', 'Adds or overwrites every pair from `other`, a sequence of pairs, or keyword arguments'],
            ['`d.setdefault(k, v)`', 'the value for `k`', 'Returns the existing value, or inserts and returns `v`. `v` is evaluated even when unused'],
            ['`d.pop(k[, default])`', 'the value', 'Removes the pair; raises `KeyError` without a default'],
            ['`d.popitem()`', 'one (key, value) pair', 'Removes and returns the LAST inserted pair; LIFO, not FIFO'],
            ['`d.copy()`', 'a new dict', 'A shallow copy — nested containers are shared'],
            ['`d.fromkeys(keys, v)`', 'a new dict', 'Builds a dict from an iterable of keys, all mapped to `v`'],
            ['`d.clear()`', '`None`', 'Removes every pair in place'],
            ["Merge two dicts with the pipe operator (3.9+)", 'a new dict, or `None` for the in-place form', 'The right operand wins on conflicting keys; the left one keeps key positions'],
            ['`d.keys()` / `.values()` / `.items()`', 'a view', 'Live and O(1) to create; iterating a size change raises `RuntimeError`'],
            ['`defaultdict(list)`', 'a dict subclass', 'Missing keys are created on access by calling the factory'],
            ['`Counter(iterable)`', 'a dict subclass', 'Missing keys read as 0; adds `most_common()` and `-` / `&`'],
          ]
        ),
        b.code(
          `# group.py — the three ways to group, and the merge operator
from collections import defaultdict, Counter

rows = [("a", 1), ("b", 2), ("a", 3), ("c", 4), ("b", 5)]

# 1. setdefault: no import, but the default list is built every iteration
one = {}
for key, value in rows:
    one.setdefault(key, []).append(value)
print(one)                          # {'a': [1, 3], 'b': [2, 5], 'c': [4]}

# 2. defaultdict: the factory runs only on a miss, so this is the fast one
two = defaultdict(list)
for key, value in rows:
    two[key].append(value)
print(dict(two) == one)            # True

# 3. Counter for pure counting — no grouping code at all
print(Counter(w for w, _ in rows).most_common())
# [('a', 2), ('b', 2), ('c', 1)]

# fromkeys builds a whole dict in one call
print(dict.fromkeys(["timeout", "retries"], 30))
# {'timeout': 30, 'retries': 30}
# Careful: fromkeys with a MUTABLE default gives every key the same object.

# Merge operators (3.9+): the right side wins
defaults = {"timeout": 30, "retries": 3, "verbose": False}
overrides = {"retries": 5, "verbose": True}
print(defaults | overrides)
# {'timeout': 30, 'retries': 5, 'verbose': True}
print(defaults)                    # unchanged — | made a new dict
`,
          'group.py'
        ),
        b.code(
          `# order.py — nested dicts and lists of dicts, the shape of real data
import json
import copy

order = {
    "id": 1041,
    "customer": {"name": "ada", "email": "ada@example.com"},
    "items": [
        {"sku": "A1", "qty": 2, "price": 9.99},
        {"sku": "B7", "qty": 1, "price": 24.50},
    ],
    "paid": True,
}

total = sum(item["qty"] * item["price"] for item in order["items"])
print(round(total, 2))                      # 44.48
print(order["customer"]["name"])            # ada

# A shallow copy shares the nested list, so mutating it edits the original
draft = order.copy()
draft["items"][0]["qty"] = 99
print(order["items"][0]["qty"])             # 99  <- the original changed

# A deep copy does not
safe = copy.deepcopy(order)
safe["items"][0]["qty"] = 1
print(order["items"][0]["qty"], safe["items"][0]["qty"])   # 99 1

# Missing fields are a design question, not an accident
rows = [{"id": 1, "name": "ada"}, {"id": 2}]
print(rows[1].get("name", "<unknown>"))      # <unknown>

# And the whole thing round-trips through JSON unchanged
text = json.dumps(order, indent=2)
print(json.loads(text) == order)             # True
`,
          'order.py'
        ),
        b.warn(
          '`dict.fromkeys` with a mutable default is a shared-object bug',
          '`dict.fromkeys(["a", "b"], [])` produces `{"a": [], "b": []}` where the two lists are the *same* object, so appending to one appends to both. The comprehension `{k: [] for k in keys}` is safe by contrast, because a comprehension builds a fresh value on every pass. The rule is simple: `fromkeys` copies one value into every slot, so the value must be immutable.',
        ),
        b.diagram(
          'From a flat list of records to grouped, nested data',
          `flowchart LR
    A["rows: a list of flat records<br/>{name, city, score}"] --> B{"What question am I asking?"}
    B -->|"how many of each?"| C["Counter(r[\"city\"] for r in rows)"]
    B -->|"all the records for a key"| D["defaultdict(list)<br/>then .append per record"]
    B -->|"one record per key"| E["{r[\"name\"]: r for r in rows}<br/>later rows overwrite earlier"]
    B -->|"index by id for lookup"| F["{r[\"id\"]: r for r in rows}"]
    C --> G["Counter is a dict subclass:<br/>missing keys read as 0"]
    D --> H["a real dict of real lists,<br/>each list independently mutable"]
    E --> I["WARNING: a dict comprehension<br/>keeps only the LAST row per name"]
    F --> J["a dict of references to the<br/>original row dicts"]`
        ),
        b.info(
          'Why `json` gives you exactly this shape',
          'JSON has two container types: an object becomes a dict with string keys, and an array becomes a list. Tuples, sets, ints-as-keys and every other Python nicety are gone after `json.load`. Round-tripping a tuple through a file gives you a list, which is one more reason to unpack immediately at the boundary rather than passing the parsed structure around.',
        ),
        b.steps('Building nested data without the footguns', [
          {
            title: 'Start from the leaves',
            desc: 'Build the innermost dict or list first and work outward, rather than trying to write one nested literal. It is easier to read and it is much easier to test.',
            code_snippet: 'item = {"sku": sku, "qty": qty, "price": price}\norder["items"] = [item]',
          },
          {
            title: 'Use setdefault or defaultdict for grouping, never "if key not in" plus a re-lookup',
            desc: 'The pattern `if k not in d: d[k] = []` then `d[k].append(v)` does three lookups per record. `d.setdefault(k, []).append(v)` does two, and `defaultdict(list)` does one.',
            code_snippet: 'groups[key].append(value)   # defaultdict(list)',
          },
          {
            title: 'Decide the missing-field policy before the data arrives',
            desc: 'Either every record has every key (use a dataclass or a fixed schema) or you accept absence (use .get with a default). Discovering this halfway through a bug report is expensive.',
            code_snippet: 'name = row.get("name", "<unknown>")',
          },
          {
            title: 'Choose the copy depth deliberately',
            desc: 'Shallow when the nested data is read-only or immutable. Deep when any caller may mutate. The cost difference is proportional to the size of the whole structure, not to what you change.',
            code_snippet: 'snapshot = copy.deepcopy(config)   # once, at the boundary',
          },
          {
            title: 'Snapshot any view you intend to mutate around',
            desc: 'Iterating `d.items()` is a live view. If the loop body can add or remove keys, iterate `list(d.items())` so the loop is a snapshot and the RuntimeError cannot happen.',
            code_snippet: 'for k, v in list(d.items()):\n    if bad(v):\n        del d[k]',
          },
        ]),
      ],
      questions: [
        [
          'After `a = {"x": {"y": 1}}` and `b = a.copy()`, what does `b["x"]["y"] = 2` do to `a`?',
          [
            'Nothing — `a["x"]["y"]` is still 1',
            '`a["x"]["y"]` becomes 2, because the nested dict is shared between the two',
            'It raises a KeyError',
            '`a` becomes a shallow copy of `b`',
          ],
          1,
          '`copy()` builds a new top-level dict and copies the entries, which means it copies references. The value under "x" is a reference to one dict object, and both `a` and `b` point at it. Only `copy.deepcopy` rebuilds the nested containers.',
        ],
        [
          'Why is `defaultdict(list)` usually better than `d.setdefault(k, []).append(v)`?',
          [
            '`defaultdict` preserves the insertion order of the keys',
            'The default value is only constructed when the key is genuinely missing',
            '`setdefault` is not a real method on dict',
            '`defaultdict` allows unhashable keys',
          ],
          1,
          'The argument to `setdefault` is an expression, so the `[]` is allocated on every single call, hit or miss. `defaultdict(list)` stores the factory and calls it only on a miss. The catch is that reading a missing key on a defaultdict silently inserts it, so a typo becomes a permanent empty entry rather than a KeyError.',
        ],
        [
          'What is `collections.Counter`?',
          [
            'A function that returns the number of elements in an iterable',
            'A dict subclass that maps each item to its count, with missing keys reading as 0',
            'A list subclass that keeps its items sorted',
            'A generator that yields items in descending order',
          ],
          1,
          'Counter is a dict subclass built for counting: `Counter("mississippi")` gives per-item counts, missing keys read as 0 without being inserted, and it adds `most_common(n)` plus set-like subtraction and intersection. It is the correct answer to "how many of each" and it beats any hand-rolled count loop.',
        ],
        [
          'In Python 3.9 and later, what does `defaults | overrides` do when the same key appears in both dicts?',
          [
            'It raises a KeyError on the duplicate',
            'It produces a new dict where the value from `overrides` wins, leaving `defaults` unchanged',
            'It mutates `defaults` in place',
            'It keeps the value from `defaults`, because the left operand wins',
          ],
          1,
          'The pipe operator follows the set convention: a brand new dict, with the right operand winning conflicts and the left operand keeping the position of keys that appear in both. `defaults` is untouched. The in-place form is `|=`, which does mutate the left operand.',
        ],
      ],
    },
    {
      title: 'Sets and the set operations',
      summary: 'A set is a hash table of unique hashables: constant-time membership, four operators that replace most filtering code, and the one surprise about order.',
      duration: 16,
      build: (b) => [
        b.md(`## A set is a dict with the values thrown away

Literally, internally: a \`set\` is the same open-addressing hash table as a \`dict\`, with the value column removed. What you get for dropping the values is the thing that matters:

- **Membership is O(1).** \`x in my_set\` hashes \`x\` once and looks in one bucket. \`x in my_list\` compares against every element.
- **Duplicates are impossible.** Adding something already present does nothing, which makes a set a de-duplicator and a membership ledger at the same time.
- **Order is not something to rely on.** Not "random" — deterministic for a given build and insertion sequence — but not the contract, so never depend on it.

\`\`\`python
tags = {"python", "data", "python"}
print(len(tags))                  # 2  — the duplicate never made it in

empty = set()                     # NOT {}
d = {}                            # {} is an empty DICT — a famous trap
\`\`\`

The last line is the one people trip over. \`{}\` is a dict literal, because \`{}\` has been the empty dict since before sets existed and a dict is far more common. An empty set is \`set()\`.

## Building and mutating

\`\`\`python
s = {"a", "b"}
s.add("c")                        # add one; a duplicate is silently ignored
s.update(["d", "e"])              # add many from any iterable
s.discard("zzz")                  # remove if present — never raises
s.remove("zzz")                   # remove — raises KeyError if absent
s.pop()                           # remove an ARBITRARY element and return it
s.clear()                         # empty it in place
s2 = s.copy()                     # a shallow copy (set elements are all immutable or frozen)
\`\`\`

\`discard\` versus \`remove\` is a real decision, not a style preference. \`remove\` is right when a missing element means your program state is wrong and you want to know. \`discard\` is right when the element is legitimately optional. \`pop()\` is the sharp one: it returns *some* element, chosen by the table layout, so \`s.pop()\` twice may give you the same element on one run and a different one on the next build.

## Set algebra

Four operators, four meanings, and four equivalent method forms:

\`\`\`python
a = {1, 2, 3, 4}
b = {3, 4, 5, 6}

a & b        # {3, 4}            a.intersection(b)          both
a | b        # {1, 2, 3, 4, 5, 6} a.union(b)             either
a - b        # {1, 2}            a.difference(b)          only in a
a ^ b        # {1, 2, 5, 6}      a.symmetric_difference(b) in one or the other, not both
\`\`\`

The comparison operators on sets are the same four, which is the part that surprises people who assumed sets were only for membership:

\`\`\`python
a <= b        # True  — a is a subset of b
a < b         # True  — proper subset
a >= b        # False — superset
a > b         # False
a == b        # False — sets compare by contents, not identity
a != b        # True
b.isdisjoint({7, 8})   # True — no common elements, in O(min(len))
\`\`\`

The method forms are usually better style for anything beyond a single character, because \`visited.intersection(graph[node])\` says what it means while \`visited & graph[node]\` needs a second read.

## Where a set replaces a loop

This is the payoff. Filtering by a second collection is the single most common piece of clumsy Python, and each of these rewrites is both shorter and asymptotically better.

\`\`\`python
finished = {"build", "test"}
tasks = ["design", "build", "test", "deploy"]

# Instead of a membership list (O(n) per test):
finished_list = list(finished)
pending = [t for t in tasks if t not in finished_list]

# Do this:
pending = [t for t in tasks if t not in finished]

# De-duplicate while preserving order:
unique = list(dict.fromkeys(tasks))       # a dict preserves insertion order
unique = list(set(tasks))                 # shorter, but the order is not guaranteed

# Find what is different between two lists:
before = ["a", "b", "c"]
after = ["b", "c", "d"]
print(set(after) - set(before))           # {'d'}
print(set(before) - set(after))           # {'a'}
print(set(before) ^ set(after))           # {'a', 'd'}
\`\`\`

The order-preserving de-duplication idiom — \`list(dict.fromkeys(xs))\` — deserves a note. \`list(set(xs))\` is shorter but the order is arbitrary, and the moment you feed that into a user interface or a report, the output changes between runs and nobody can say why. The dict version is guaranteed stable and is just as fast.

## The three ways sets surprise you

**1. Order is not insertion order.** \`list({"b", "a", "c"})\` is not \`["b", "a", "c"]\`. It is deterministic for a given run, and it can change between Python versions, between builds, and when the set grows past its resize threshold. If order matters, \`sorted(s)\` — not "it usually comes out sorted".

**2. Uniqueness is by equality and hash, not by type.** \`{1, 1.0, True}\` is \`{1}\` because \`1 == 1.0 == True\` and all three hash the same. Likewise \`{(1, 2)}\` and \`{(1.0, 2.0)}\` are the same element.

**3. Elements must be hashable.** \`{[1, 2]}\` is a \`TypeError: unhashable type: 'list'\`. If you need a set of lists, make it a set of tuples: \`{(1, 2)}\`. The same applies to a set of dicts, which means a set of dict keys is a set of tuples.

## \`frozenset\`

A \`frozenset\` is a set that cannot change after creation. That makes it hashable, which makes it usable as a dict key or as an element of another set:

\`\`\`python
graph = {
    frozenset(["a", "b"]): "edge a-b",
    frozenset(["b", "c"]): "edge b-c",
}
print(graph[frozenset(["b", "a"])])       # edge a-b  — order inside does not matter
\`\`\`

That undirected-graph trick is the canonical use: an edge between \`a\` and \`b\` has no direction, so you want one key for both orderings, and a frozen collection of the two endpoints is exactly that. \`frozen = frozenset(myset)\` converts a live set in one call.

## The full comparison table

With \`a = {1, 2, 3, 4}\` and \`b = {3, 4, 5, 6}\`:

| Operation | Expression | Result | Method form |
| --- | --- | --- | --- |
| intersection | \`a & b\` | \`{3, 4}\` | \`a.intersection(b)\` |
| union | \`a &#124; b\` | \`{1, 2, 3, 4, 5, 6}\` | \`a.union(b)\` |
| difference | \`a - b\` | \`{1, 2}\` | \`a.difference(b)\` |
| symmetric difference | \`a ^ b\` | \`{1, 2, 5, 6}\` | \`a.symmetric_difference(b)\` |
| subset test | \`a <= b\` | \`False\` | \`a.issubset(b)\` |
| proper subset | \`a < b\` | \`False\` | no method form; use the operator |
| superset test | \`a >= b\` | \`True\` | \`a.issuperset(b)\` |
| same elements | \`a == b\` | \`False\` | \`a == b\` |
| no overlap | \`a.isdisjoint(c)\` | \`True\` | \`a.isdisjoint(c)\` |
| add one item | \`a.add(x)\` | \`None\` | — |
| remove, ignore missing | \`a.discard(x)\` | \`None\` | — |
| remove an arbitrary item | \`a.pop()\` | that element | — |`),
        b.anim('nodes', {
          title: 'A set is the same hash table with the values removed',
          badge: 'set internals',
          steps: [
            {
              caption: 'Three items went in; one was a duplicate and never appeared',
              note: 'add() hashes the item, jumps to a bucket, and finds it already there. Adding is therefore idempotent, and that is where "sets have no duplicates" comes from — it is not a filter applied at the end, it is what the data structure is.',
              tail: 'bucket 2',
              nodes: [
                { id: 'h1', data: '"data"', pointsTo: 'h2', tone: 'int', note: 'hash 0' },
                { id: 'h2', data: '"python"', tone: 'ok', note: 'hash 2' },
              ],
            },
            {
              caption: 'Adding "python" again is a no-op',
              note: 'The bucket for "python" already contains it, so the new element is discarded. The set grew by zero and no error was raised — that is the difference between add and a list append.',
              tail: 'bucket 2',
              nodes: [
                { id: 'h1', data: '"data"', pointsTo: 'h2', tone: 'int', note: 'hash 0' },
                { id: 'h2', data: '"python"', tone: 'warn', note: 'add("python") -> no change' },
              ],
            },
            {
              caption: 'A membership test touches exactly one bucket',
              note: '"os" in tags hashes "os", lands in bucket 1, compares once, and answers False. With a million tags the cost is identical, which is the whole reason to prefer a set over a list here.',
              tail: 'bucket 1',
              nodes: [
                { id: 'h3', data: '"os"', tone: 'null', note: 'probe finds nothing' },
              ],
            },
            {
              caption: 'Adding a fifth item triggers a resize and a full rehash',
              note: 'When the load factor is exceeded, the table doubles and every existing item is rehashed into its new bucket. This is the one O(n) moment in a set\'s life, amortised across n insertions.',
              tail: 'bucket 5',
              nodes: [
                { id: 'h1', data: '"data"', pointsTo: 'h4', tone: 'int', note: 'now in a bigger table' },
                { id: 'h4', data: '"python"', pointsTo: 'h5', tone: 'int', note: 'shorter chains' },
                { id: 'h5', data: '"os"', pointsTo: 'h6', tone: 'ok', note: 'just inserted' },
                { id: 'h6', data: '"sql"', tone: 'int', note: 'just inserted' },
              ],
            },
            {
              caption: 'Five items, one per bucket — that is the goal state',
              note: 'A healthy hash table has short chains, which is what keeps add, remove and in all O(1). The trade is that iteration order is a function of the hashing, which is exactly why the language does not promise you an order.',
              tail: 'bucket 6',
              nodes: [
                { id: 'h1', data: '"data"', pointsTo: 'h7', tone: 'int', note: 'isolated' },
                { id: 'h7', data: '"python"', pointsTo: 'h8', tone: 'int', note: 'isolated' },
                { id: 'h8', data: '"os"', pointsTo: 'h9', tone: 'int', note: 'isolated' },
                { id: 'h9', data: '"sql"', pointsTo: 'h10', tone: 'int', note: 'isolated' },
                { id: 'h10', data: '"api"', tone: 'ok', note: 'isolated' },
              ],
            },
          ],
        }),
        b.anim('step', {
          title: 'Set or list? Six questions, in order',
          steps: [
            {
              title: 'Do I need the order back out?',
              desc: 'If the order is part of the meaning — a ranked list, a UI order, a report — use a list. Sorting a set is O(n log n) on top of the set itself, and re-introduces the coupling you were trying to remove.',
              code_snippet: 'ordered = sorted(my_set)   # pay for it only when you need it',
            },
            {
              title: 'Do I need duplicates?',
              desc: 'A set silently collapses them. If two identical rows are two real events, a list or a Counter is the honest container, because the count is information.',
              code_snippet: 'counts = Counter(rows)   # keeps the multiplicity',
            },
            {
              title: 'Will I test membership, repeatedly, on a large collection?',
              desc: 'This is the decisive one. `x in list` is a linear scan; `x in set` is a hash lookup. If the collection has more than a few dozen elements and membership is tested inside a loop, use a set.',
              code_snippet: 'if status in FINISHED:   # set, not list',
            },
            {
              title: 'Am I comparing two collections for overlap or difference?',
              desc: 'Then it is a set whether you planned it or not. `set(a) - set(b)`, `set(a) & set(b)` and `a.isdisjoint(b)` replace loops that are easy to get subtly wrong.',
              code_snippet: 'missing = set(after) - set(before)',
            },
            {
              title: 'Can the elements be lists or dicts?',
              desc: 'Then a set is not available without conversion. A set of unhashable things is a set of tuples, which changes the access syntax and is worth noticing before you commit to the design.',
              code_snippet: 'hashable = {(r[0], r[1]) for r in rows}',
            },
            {
              title: 'Am I building it from a list, just to use it as a set?',
              desc: 'Build the set directly, or use `list(dict.fromkeys(xs))` when you need a list back with duplicates removed and the original order preserved. `list(set(xs))` is shorter but gives you an arbitrary order.',
              code_snippet: 'unique = list(dict.fromkeys(xs))   # order preserved',
            },
          ],
        }),
        b.code(
          `# sets.py — membership, algebra, and the surprising bits
tags = {"python", "data", "python", "sql"}
print(len(tags))                       # 3  — duplicates never got in

print({} == set())                     # False  — {} is a dict
print(type({}), type(set()))           # <class 'dict'> <class 'set'>

a = {1, 2, 3, 4}
b = {3, 4, 5, 6}
print(a & b, a | b, a - b, a ^ b)
# {3, 4} {1, 2, 3, 4, 5, 6} {1, 2} {1, 2, 5, 6}

# The same four, spelled out
print(a.intersection(b), a.difference(b), a.symmetric_difference(b))
print(b.isdisjoint({7, 8}))            # True

# Filtering by a second collection: set, not list
finished = {"build", "test"}
tasks = ["design", "build", "test", "deploy"]
print([t for t in tasks if t not in finished])        # ['design', 'deploy']

# De-duplication: the dict version keeps the order, the set version does not
print(list(dict.fromkeys(tasks)))      # ['design', 'build', 'test', 'deploy']

# Equality and hashability are the same story
print({1, 1.0, True})                 # {1}  — all three hash identically
# {([1, 2])}                          # TypeError: unhashable type: 'list'
print({(1, 2)})                       # {(1, 2)}  — a tuple is fine

# frozenset is a hashable set: usable as a key or as an element
graph = {frozenset(["a", "b"]): "a-b", frozenset(["b", "c"]): "b-c"}
print(graph[frozenset(["b", "a"])])   # a-b
print({frozenset({1, 2})} == {frozenset({2, 1})})   # True

# The in-place operators exist, and they are the ones that rebind the name.
a = {1, 2}
b = {2, 3}
a |= b                 # same as a = a | b, but no new object is built
print(a)                # {1, 2, 3}
a &= {2, 3, 4}          # intersection
print(a)                # {2, 3}
a -= {3}               # difference
print(a)                # {2}
a ^= {2, 9}             # symmetric difference
print(a)                # {9}

# &=, |= and -= on a dict mean merge and delete, not set algebra.
scores = {"ada": 10, "alan": 8}
scores |= {"grace": 12, "ada": 0}   # adds grace, overwrites ada
print(scores)                       # {'ada': 0, 'alan': 8, 'grace': 12}
scores -= {"alan"}                  # removes a key
print(scores)                       # {'ada': 0, 'grace': 12}

# set operations on dict views: keys(), values(), items() are set-like.
left = {"a": 1, "b": 2}
right = {"b": 9, "c": 3}
print(left.keys() & right.keys())   # {'b'}   — set intersection of the views
print(left.keys() | right.keys())   # {'a', 'b', 'c'}
print(left.keys() - right.keys())   # {'a'}
`,
          'sets.py'
        ),
        b.code(
          `# counting.py — the set-shaped problems, written the idiomatic way
# Word frequency. The dict version wins here because you need the counts.
text = "the quick brown fox jumps over the lazy dog the fox"
counts = {}
for word in text.split():
    counts[word] = counts.get(word, 0) + 1
print(counts["the"], counts["fox"])          # 3 2

# The top three, without a sort key hack
print(sorted(counts.items(), key=lambda kv: -kv[1])[:3])
# [('the', 3), ('fox', 2), ('quick', 1)]

# Finding duplicates. The set is the filter; the list keeps the input order.
seen = set()
duplicates = []
for item in ["a", "b", "a", "c", "b", "a"]:
    if item in seen:
        duplicates.append(item)
    else:
        seen.add(item)
print(duplicates)                            # ['a', 'b', 'a']

# Same result, no flag state to maintain.
xs = ["a", "b", "a", "c", "b", "a"]
print([x for x in xs if xs.count(x) > 1])     # ['a', 'b', 'a', 'b', 'a']
print(list({x for x in xs if xs.count(x) > 1}))   # {'a', 'b'} — order-free version

# Two records that share a key: keys() gives you the intersection for free.
alice = {"id": 1, "name": "Ada", "city": "London"}
bob = {"id": 2, "name": "Alan", "city": "London"}
shared = alice.keys() & bob.keys()
print(shared)                                 # {'id', 'city'}

# What differs between them
print(alice.keys() - bob.keys())              # {'name'}
print(alice.keys() ^ bob.keys())              # {'name', 'id'}

# Counters do the counting part for you.
from collections import Counter
c = Counter(text.split())
print(c.most_common(3))                       # [('the', 3), ('fox', 2), ('quick', 1)]
print(c["missing"])                           # 0  — absent keys read as 0

# And they subtract, because counting is a set-shaped problem
print(Counter("mississippi") - Counter("ssip"))   # Counter({'m': 1, 'i': 1})
`,
          'counting.py'
        ),
        b.warn(
          'Never iterate a set and depend on the order',
          '`for x in {"b", "a", "c"}` does not give you `b, a, c`. The order is a function of the hash values and the table size, so it can change when the set grows past a resize threshold, when you add or remove an unrelated element, and when you upgrade Python. Use `sorted(s)` when you need a stable order, and use a list or a dict if order is part of the meaning.',
        ),
        b.tip(
          'set() versus {} — and frozenset versus set',
          '`{}` is an empty dict because dicts existed first and are far more common. For an empty set write `set()`, and for a set literal with content write `{1, 2, 3}`. Reach for `frozenset` whenever the set has to be a dict key, an element of another set, or a value you want to guarantee nobody will change — including as a default argument in a function signature.',
        ),
        b.checklist('Set habits worth keeping', [
          '`set()` not `{}` for an empty set.',
          '`discard` when absence is normal, `remove` when absence is a bug.',
          'Never rely on iteration order; `sorted(s)` when it matters.',
          '`list(dict.fromkeys(xs))` for order-preserving de-duplication.',
          '`x in set` for repeated membership tests on anything large.',
          '`frozenset` whenever the set must be a dict key, a set element, or a default argument.',
        ]),
        b.resources('Where to read more', [
          { label: 'Python tutorial: sets and dictionaries', url: 'https://docs.python.org/3/tutorial/datastructures.html' },
          { label: 'Set types — set, frozenset, and the operators', url: 'https://docs.python.org/3/library/stdtypes.html#set' },
          { label: 'collections.defaultdict and Counter', url: 'https://docs.python.org/3/library/collections.html' },
        ]),
      ],
      questions: [
        [
          'What does `x = {}` create?',
          [
            'An empty set',
            'An empty dict',
            'An empty frozenset',
            'It raises a SyntaxError',
          ],
          1,
          'Braces with nothing in them are an empty dict, because dicts predate sets in the language and remain far more common. An empty set is written `set()`. A set literal needs at least one item inside the braces before the interpreter will read it as a set.',
        ],
        [
          'What happens when you call `s.remove(x)` on a set that does not contain `x`?',
          [
            'Nothing — removals are silent by default',
            'It raises `KeyError`',
            'It raises `ValueError`',
            'It adds `x` to the set',
          ],
          1,
          '`remove` asserts that the element should be there, so a missing one is a `KeyError`. `discard` is the tolerant version and returns None whether or not the element was present. Choosing between them is a design decision about whether absence indicates a broken program state.',
        ],
        [
          'For `a = {1, 2, 3, 4}` and `b = {3, 4, 5, 6}`, what is `a - b`?',
          [
            '`{3, 4}` — the elements in both',
            '`{1, 2}` — the elements in `a` that are not in `b`',
            '`{1, 2, 5, 6}` — the elements in exactly one of them',
            '`{5, 6}` — the elements in `b` that are not in `a`',
          ],
          1,
          'The minus operator is set difference, matching what it does in mathematics: keep the members of the left operand that do not appear in the right. Intersection is `&`, union is `|`, symmetric difference is `^`, and the reverse difference `b - a` would be `{5, 6}`.',
        ],
        [
          'Why is `list(my_set)` an unreliable way to display a set\'s contents?',
          [
            'Because a set cannot be converted to a list',
            'Because the iteration order depends on the hash values and table size, which can change when the set resizes or when Python is upgraded',
            'Because list() sorts the elements',
            'Because a set only stores its first ten elements',
          ],
          1,
          'Sets are unordered by contract. The order is deterministic for a given build and insertion sequence, so it will not look random, but it is not something you may rely on — it shifts with the table size and with unrelated insertions. If you need a stable order, say so explicitly with `sorted(my_set)`.',
        ],
      ],
    },
  ]
);
