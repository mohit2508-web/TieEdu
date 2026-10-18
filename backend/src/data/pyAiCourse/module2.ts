// Module 2 — Data Structures: Lists, Tuples, Dicts, Sets & Comprehensions
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, code } from '../nineBlocks';
import { lesson, M2, COURSE_ID } from './helpers';

export const module2: CourseModule = {
  id: M2,
  course_id: COURSE_ID,
  title: 'Module 2 — Data Structures: Lists, Tuples, Dicts & Sets',
  summary:
    'The four built-in containers in depth — indexing and slicing, mutation methods, immutable records, fast key lookup, set algebra — plus comprehensions and how to choose the right structure the first time.',
  sort_order: 2,
  lessons: [
    lesson(
      M2,
      'pyai-2-1',
      1,
      'Lists: Indexing, Slicing and Mutation',
      'Ordered, growable collections: reading and writing positions, slicing with start:stop:step, and which methods change a list in place.',
      17,
      nineBlocks({
        objectives: [
          'Create lists and read or overwrite any element with positive and negative indices',
          'Predict the result of slicing with start, stop and step values',
          'Mutate a list with append, insert, remove, pop and sort — and say which return a value',
          'Build lists from iterables with list(), range(), concatenation and repetition',
        ],
        hook:
          'Two bugs open almost every beginner data project. One: "list index out of range" because the model returned 99 predictions for 100 rows. Two: a marks list that silently lost its order because someone wrote scores = scores.sort() and stored None. Lists are the first container you learn and the one you will still be writing in every module of this course — so the index arithmetic and the in-place methods are worth twenty focused minutes now.',
        concept: `**What a list is.** A list is an **ordered, mutable** sequence that can hold any number of values, of any types: \`scores = [91, 88, 95]\`, \`mixed = [1, "two", 3.0, True, None]\`. You write it with square brackets and commas; \`len(scores)\` is its length. "Ordered" means positions are stable and meaningful — the first element stays first until you move it. "Mutable" means you can change it after creation, which is the entire difference between lists and tuples (Lesson 2.2).

**Indexing — positions count from zero.** \`scores[0]\` is 91, \`scores[2]\` is 95, and \`scores[-1]\` counts from the end (95 again, \`scores[-3]\` is 91). Reading past the end raises \`IndexError: list index out of range\` — Python never invents a value for you. Writing by index overwrites in place: \`scores[1] = 99\` changes one slot without touching the others. Membership tests read naturally: \`91 in scores\` is \`True\`.

**Slicing — a copy of a window.** \`scores[start:stop:step]\` includes \`start\`, excludes \`stop\`, and by default steps by 1:
- \`scores[:2]\` → first two elements,
- \`scores[2:]\` → everything from index 2 on,
- \`scores[::2]\` → every second element,
- \`scores[::-1]\` → the whole list reversed.
A slice is always a **new list** (a shallow copy of that window), so \`copy = scores[:]\` is one way to duplicate. Slice assignment is mutation: \`scores[0:2] = [100, 101]\` replaces two elements — and because slices are windows rather than single slots, you can even change the list's length with them (\`scores[1:1] = [7, 8]\` inserts).

**Mutation methods — know what each returns.**
- \`append(x)\` adds one element at the end; \`extend(iterable)\` adds every element of another iterable.
- \`insert(i, x)\` puts x at position i (shifting the rest right).
- \`pop(i)\` removes and **returns** element i (default: last) — this is the method that gives a value back.
- \`remove(x)\` deletes the **first** occurrence of x (ValueError if absent); \`del scores[i]\` deletes by position.
- \`sort()\` sorts **in place** and returns \`None\`; \`sorted(scores)\` returns a **new** sorted list. \`reverse()\` flips in place and also returns \`None\`; \`scores[::-1]\` builds a reversed copy.
- \`index(x)\` gives the position of x; \`count(x)\` how often it appears; \`clear()\` empties.

**Building lists.** \`list(range(5))\` → \`[0, 1, 2, 3, 4]\`; \`list("abc")\` → \`['a', 'b', 'c']\`; \`[0] * 5\` repeats; \`a + b\` concatenates into a **new** list. And the aliasing rule from Lesson 1.2 still stands: \`b = a\` shares one list — copy with \`a.copy()\`, \`list(a)\` or \`a[:]\` when you need independence.`,
        extras: [
          table(
            'The list method cheat sheet',
            ['Method', 'Effect', 'Returns'],
            [
              ['append(x) / extend(it)', 'Add one / many at the end', 'None (mutates)'],
              ['insert(i, x)', 'Insert at position i, shifting right', 'None (mutates)'],
              ['pop(i)', 'Remove and hand back element i', 'The removed element'],
              ['remove(x)', 'Delete first occurrence of x', 'None (ValueError if absent)'],
              ['sort() / reverse()', 'Reorder / flip in place', 'None (mutates!)'],
              ['sorted(lst)', 'Sort a copy', 'A new list'],
              ['index(x) / count(x)', 'Position of x / how many x', 'int'],
            ],
          ),
          code(
            'scores = [91, 88, 95]\nscores[1] = 99            # mutate one slot  -> [91, 99, 95]\nfirst_two = scores[:2]    # slice (a copy)  -> [91, 99]\nreversed_scores = scores[::-1]\nprint(scores, first_two, reversed_scores)',
            'list-basics.py',
            'python',
          ),
          warn(
            'scores = scores.sort() stores None',
            'sort() reorders the list itself and hands back None, so the assignment throws away the list. Either call scores.sort() alone, or use a copy with scores = sorted(scores).',
          ),
        ],
        worked: {
          title: 'Clean a list of sensor readings and summarise it',
          problem:
            'readings = [19.5, 21.0, 18.2, 300.0, 20.7] — one value is a glitch (300.0, far outside range). Find it, remove it, print the count and mean of the valid readings, and produce a sorted report list without disturbing the original order.',
          steps: [
            {
              title: '1. Locate the glitch',
              desc: 'index() returns the position of the first occurrence. Use it for reporting — "reading 3 was the outlier" is more useful than silently dropping it.',
              code_snippet: 'readings = [19.5, 21.0, 18.2, 300.0, 20.7]\nprint(readings.index(300.0))   # 3',
            },
            {
              title: '2. Remove it in place',
              desc: 'remove() deletes the first matching element and mutates the same list — no reassignment needed.',
              code_snippet: 'readings.remove(300.0)\nprint(readings)   # [19.5, 21.0, 18.2, 20.7]',
            },
            {
              title: '3. Summarise',
              desc: 'len() counts; the built-in sum() plus division gives the mean. Note sum() works because the list now holds only numbers.',
              code_snippet: 'mean = sum(readings) / len(readings)\nprint(f"{len(readings)} valid readings, mean {mean:.2f}")',
            },
            {
              title: '4. Sorted report — as a copy',
              desc: 'sorted() returns a NEW list, so the original keeps its chronological order while the report is ordered by value.',
              code_snippet: 'report = sorted(readings)\nprint(report)                      # [18.2, 19.5, 20.7, 21.0]\nprint(readings)                    # [19.5, 21.0, 18.2, 20.7]',
            },
          ],
          solution:
            'Output: index 3 → readings after removal [19.5, 21.0, 18.2, 20.7] → "4 valid readings, mean 19.85" → report [18.2, 19.5, 20.7, 21.0] with the original untouched. In-place methods (remove, sort) mutate; value-returning ones (pop, index, sorted) hand results back — mixing those two families up is the source of most list bugs.',
        },
        practice: {
          title: 'Find the extreme, slice the middle',
          prompt:
            'With marks = [76, 91, 58, 67, 84, 91]: print (1) the index of the highest mark, (2) the last two marks two different ways (negative index and slice), (3) every second mark reversed, (4) a new list with 100 appended and the first element removed, and (5) a sorted copy assigned to a different name — then print the untouched original.',
          hint: 'Use index(max(marks)), marks[-2:], marks[::-1], marks.append(100)/marks.pop(0), and sorted(marks).',
        },
        mistakes: [
          {
            mistake: 'Accessing scores[len(scores)] expecting the last element',
            fix: 'Valid indices run 0 to len-1, so that is one past the end → IndexError. Use scores[-1] or scores[len(scores) - 1].',
          },
          {
            mistake: 'Storing the result of .sort() or .reverse()',
            fix: 'Both mutate in place and return None. Call them as statements, or use sorted(scores) / scores[::-1] when you want a new list.',
          },
          {
            mistake: 'append(list2) when you meant to merge two lists',
            fix: 'append adds the list as ONE element (a list inside a list). Use extend(list2), list1 += list2, or list1 + list2.',
          },
          {
            mistake: 'Assuming a slice is a deep copy of nested lists',
            fix: 'slicing copies the outer list only — inner lists are still shared. For nested structures use copy.deepcopy (you will meet this again with DataFrames).',
          },
        ],
        exam: {
          question:
            'Explain the difference between list.sort() and sorted(list), including return values and when each is the right choice.',
          answer:
            'list.sort() reorders the list itself (in place), uses no extra list, and returns None — choose it when you own the list and want it sorted, for example on a large list where an extra copy would double memory. sorted(list) accepts ANY iterable (list, tuple, string, dict view), builds a new sorted list and leaves the original untouched — choose it when order must be preserved, when you are sorting a value you do not own, or when the input is not a list. A classic failure is result = items.sort(), which assigns None; Python code reviews flag this instantly.',
          source: 'Standard sorting question in Python interviews and end-of-unit exams.',
        },
        summary: [
          'Lists are ordered and mutable; indices start at 0, negative indices count from the end, out-of-range raises IndexError.',
          'A slice start:stop:step excludes stop and always builds a new list — a[:] is a shallow copy.',
          'append/extend/insert/remove/sort/reverse mutate in place and return None; pop/index/sorted return values.',
          'Build with list(range(n)), concatenation (+) and repetition (*); copy deliberately with .copy().',
          'Pick methods by what they give back: mutate-and-keep (sort) versus read-and-return (sorted, pop).',
        ],
      }),
      [
        [
          'x = [10, 20, 30]; x[1] = 99. What is x[-1]?',
          ['99', '30', '10', 'IndexError'],
          1,
          'x becomes [10, 99, 30]; the last element is still 30 — only index 1 changed.',
        ],
        [
          'y = [1, 2, 3, 4]. What does y[1:3] produce?',
          ['[2, 3]', '[1, 2, 3]', '[2, 3, 4]', '[1, 2]'],
          0,
          'Slicing includes index 1 and excludes index 3 → the elements at 1 and 2, which are 2 and 3.',
        ],
        [
          'Which adds EVERY element of another list individually?',
          ['append', 'extend', 'insert', 'pop'],
          1,
          'extend (or +=) splices in each element; append would nest the whole list as one item.',
        ],
        [
          't = [3, 1, 2]; r = t.sort(). What is r?',
          ['[1, 2, 3]', 'None', '[3, 1, 2]', 'An error'],
          1,
          'sort() mutates t in place and returns None — t is sorted, r is None.',
        ],
      ]
    ),
    lesson(
      M2,
      'pyai-2-2',
      2,
      'Tuples vs Lists: When Immutability Is a Feature',
      'Immutable sequences, unpacking, enumerate and zip, hashable keys — and the decision rule for tuple versus list.',
      16,
      nineBlocks({
        objectives: [
          'Create tuples correctly, including single-element and nested cases',
          'Index, slice and unpack tuples, and explain why they cannot be mutated',
          'Use enumerate() and zip() to iterate over positions and parallel sequences',
          'Decide whether a given requirement calls for a list or a tuple, with a reason',
        ],
        hook:
          'Try this at the interpreter: {[28.6, 77.2]: "Delhi"}. Python replies TypeError: unhashable type: list. Change the brackets to parentheses and it works. That one error explains why coordinates, records and returns are written as tuples everywhere in Python: some structures must be frozen before Python will trust them as keys.',
        concept: `**A tuple is an ordered, immutable sequence.** You write it with parentheses and commas: \`point = (28.6, 77.2)\`, \`student = ("Ada", 91.5, "CSE")\`. Two syntax facts that trip everyone once: \`t = (1)\` is just the integer 1 (parentheses around one expression), and a true one-element tuple needs a trailing comma — \`t = (1,)\` or \`t = 1,\`. An empty tuple is \`()\`. With those in hand, everything you know from lists applies: \`t[0]\`, \`t[-1]\`, \`t[1:3]\`, \`len(t)\`, \`x in t\` all work. What does **not** work is assignment: \`point[0] = 99\` raises \`TypeError: 'tuple' object does not support item assignment\`. Immutability is total — no append, no sort, no slice assignment.

**Why anyone would choose the weaker option:**
1. **Fixed records.** \`name, marks, dept = student\` unpacks by position. Because the tuple cannot change shape, that unpacking can never break — the third field will always exist. A list could be shortened by some other line and your \`a, b, c = record\` then dies with "not enough values to unpack".
2. **A promise not to modify.** Passing a tuple into a function tells it: this data is read-only. It is documentation with teeth, unlike a comment.
3. **Hashability.** Hashability means an object can be turned into a stable integer fingerprint for dict/set lookup, which requires that its contents can never change. Tuples of hashable items qualify; lists do not. Hence \`{(28.6, 77.2): "Delhi"}\` is a legal dict key and \`{[28.6, 77.2]: "Delhi"}\` is not. This is why coordinates, timestamp pairs and (row, column) indices show up as tuples in real code.
4. **Cost.** Tuples are slightly smaller and marginally faster to create than lists — real at scale inside huge loops, irrelevant otherwise.

**Unpacking.** Assignment distributes by position: \`x, y = 1, 2\`; too many or too few values raise ValueError; \`first, *rest = [1, 2, 3, 4]\` captures the tail as a list. The one-line swap \`a, b = b, a\` works because the right side is packed into a tuple before anything is reassigned.

**enumerate and zip — the two iteration builtins you will use daily.** \`for i, value in enumerate(items):\` walks with positions (\`enumerate(items, start=1)\` for 1-based numbering). \`for name, m in zip(names, marks):\` walks two sequences in lockstep, producing a tuple per step — and it **stops at the shorter sequence**, which can hide missing data unless you check lengths first. Both return tuples per iteration precisely because a position-and-value pair is a fixed record.`,
        extras: [
          table(
            'List vs tuple — the short version',
            ['Aspect', 'list', 'tuple'],
            [
              ['Literal', '[1, 2, 3]', '(1, 2, 3)'],
              ['Mutable', 'Yes — append, sort, item assignment', 'No — nothing changes'],
              ['Hashable', 'No — cannot be a dict key or set member', 'Yes (if its elements are)'],
              ['Ordered', 'Yes', 'Yes'],
              ['Typical use', 'A growing sequence: scores, rows, tokens', 'A fixed record: a coordinate, a return pair'],
            ],
          ),
          tip(
            'Return pairs, not mini-lists',
            'A function that answers with two values should return (value, count), not [value, count]. Callers can unpack it safely and cannot accidentally push a new item into your return value.',
          ),
          warn(
            '(1) is not a tuple',
            'Parentheses group an expression; the comma makes the tuple. Check with type((1,)) → <class \'tuple\'> versus type((1)) → <class \'int\'>. This single-character difference appears in exam questions constantly.',
          ),
        ],
        worked: {
          title: 'Pair names with marks safely',
          problem:
            'names = ["Ada", "Alan", "Grace"], marks = [91, 88, 95]. Print a numbered report, find the top scorer as a (name, marks) tuple, and store a coordinate so it can be a dict key.',
          steps: [
            {
              title: '1. Walk both lists with zip',
              desc: 'zip pairs positionally and yields one tuple per step, which the for-loop unpacks directly into two names.',
              code_snippet: 'names = ["Ada", "Alan", "Grace"]\nmarks = [91, 88, 95]\nfor name, m in zip(names, marks):\n    print(f"{name}: {m}")',
            },
            {
              title: '2. Number the report with enumerate',
              desc: 'Enumerate adds a position; nesting the unpacking i, (name, m) reads the pair that zip produced. start=1 makes the numbering human.',
              code_snippet: 'for i, (name, m) in enumerate(zip(names, marks), start=1):\n    print(f"{i}. {name} - {m}")',
            },
            {
              title: '3. Best scorer as a tuple',
              desc: 'Build the list of records, then max() with a key that compares only the marks. The winner comes back as an immutable (name, marks) pair.',
              code_snippet: 'pairs = list(zip(names, marks))          # [(\'Ada\', 91), (\'Alan\', 88), (\'Grace\', 95)]\nbest = max(pairs, key=lambda pair: pair[1])\nprint(f"Top: {best[0]} with {best[1]}")   # Top: Grace with 95',
            },
            {
              title: '4. Tuples as dict keys',
              desc: 'Coordinates are immutable, so they are hashable and legal keys. The same data as a list raises TypeError: unhashable type: list.',
              code_snippet: 'coords = {(28.61, 77.21): "Delhi", (19.08, 72.88): "Mumbai"}\nprint(coords[(28.61, 77.21)])   # Delhi',
            },
          ],
          solution:
            'Report prints "Ada: 91" etc., then "1. Ada - 91" lines; the top scorer resolves to the tuple ("Grace", 95); the coordinate dict answers Delhi. Every place a fixed pair was needed — loop unpacking, max() result, dict key — a tuple was the natural shape.',
        },
        practice: {
          title: 'Swap, enumerate, and prove immutability',
          prompt:
            'Do four things and print each result: (1) swap two variables in one line without a temporary, (2) print a list of subjects with 1-based positions using enumerate, (3) attempt to change the first element of a tuple and capture the exact error Python gives, (4) rebuild the tuple with the new value using concatenation. Use type() at least twice.',
          hint: 'Swap: a, b = b, a. Rebuild: t = (new_value,) + t[1:].',
        },
        mistakes: [
          {
            mistake: 'Writing (1) expecting a one-element tuple',
            fix: 'Parentheses alone just group. Use (1,) or 1, — verify with type(t).',
          },
          {
            mistake: 'Trying to fix a tuple in place: t[0] = new',
            fix: 'TypeError, by design. Build a new one: t = (new,) + t[1:] or t = t[:i] + (new,) + t[i + 1:].',
          },
          {
            mistake: 'Trusting zip() to notice missing entries',
            fix: 'zip stops at the shortest input, silently dropping the tail. Compare len() first, or use zip(a, b, strict=True) on Python 3.10+ to make the mismatch an error.',
          },
          {
            mistake: 'Unpacking with the wrong number of names',
            fix: 'a, b = (1, 2, 3) raises ValueError: too many values to unpack. Count the fields, or absorb the rest with first, *rest = ...',
          },
        ],
        exam: {
          question:
            'Why can a tuple be used as a dictionary key while a list cannot, even when both hold the same values?',
          answer:
            'Dictionary keys must be hashable: Python stores the key\'s hash to jump straight to the right bucket, and that hash must stay valid for the key\'s lifetime. A tuple\'s contents cannot change, so its hash never changes — lookup stays correct. A list is mutable: if it were allowed as a key, appending to it after insertion would change its hash and the entry would become unreachable. Python therefore rejects it at once with TypeError: unhashable type: list. The same rule governs set membership, and it is why structured identifiers (coordinates, timestamps, keys of a composite field) are tuples in real code.',
          source: 'Favourite "explain the error" question in Python interviews; common in Hashing units of DS exams.',
        },
        summary: [
          'Tuples: ordered and immutable — index and slice like lists, but no mutation of any kind.',
          '(1) is an int; (1,) is a tuple; the comma makes the tuple.',
          'Immutability buys fixed structure, accidental-mutation safety, and hashability (dict keys, set members).',
          'Unpack by position; swap in one line with a, b = b, a; use *rest for flexible captures.',
          'enumerate() walks with indices, zip() walks sequences in lockstep (shortest wins — check lengths).',
          'Rule of thumb: growing homogeneous sequence → list; fixed record → tuple.',
        ],
      }),
      [
        [
          'After t = (1, 2); t[0] = 9, Python raises:',
          ['ValueError', "TypeError — tuple does not support item assignment", 'KeyError', 'Nothing — t becomes (9, 2)'],
          1,
          'Tuples are immutable; item assignment is refused at run time.',
        ],
        [
          'a = 5, b = 10; then a, b = b, a. The values are now:',
          ['a = 5, b = 10', 'a = 10, b = 5', 'a = 15, b = 15', 'Error — you cannot swap'],
          1,
          'The right side packs (10, 5) first, then unpacks left to right — the classic Python swap.',
        ],
        [
          'What is the type of the value (1)?',
          ["<class 'tuple'>", "<class 'int'>", "<class 'list'>", 'SyntaxError'],
          1,
          'Parentheses only group an expression; a tuple needs a comma: (1,).',
        ],
        [
          'zip([1, 2], [3, 4, 5]) produces how many pairs?',
          ['3', '2', '5', 'It raises an error'],
          1,
          'zip stops at the shortest iterable — two pairs, with 5 silently dropped (use strict=True to catch this).',
        ],
      ]
    ),
    lesson(
      M2,
      'pyai-2-3',
      3,
      'Dictionaries: Lookup Instead of Search',
      'Key-value mappings, safe access with get(), iteration with items(), and why hash-table lookup beats scanning a list.',
      17,
      nineBlocks({
        objectives: [
          'Create dictionaries and read, write and delete values by key',
          'Iterate with keys(), values() and items() in the idiomatic forms',
          'Handle missing keys safely with get(), in and setdefault',
          'Build a frequency table from a list of values in a single loop',
        ],
        hook:
          'Ask a list of ten thousand names "is Zara here?" and Python may compare every one. Ask a dict holding the same names and it computes where Zara lives and answers in about one step. That gap — linear scan versus near-constant jump — is why every mapping in software is a hash table: Python kwargs, JSON objects, a model\'s configuration, the vocabulary in a tokenizer. Learn one container, recognise it everywhere.',
        concept: `**What a dict is.** A dict is an **unordered mapping** from keys to values — in Python 3.7+ it also remembers **insertion order**, which you can rely on for display. Written with curly braces and \`key: value\` pairs: \`marks = {"ada": 91, "alan": 88}\`. Keys must be **hashable** (str, int, float, bool, tuple — not list or dict); values can be anything, including lists, dicts, even other dicts of dicts. The dict is the single most used structure in real Python: function keyword arguments are dicts, JSON objects parse into dicts, \`os.environ\` is a dict, and pandas wraps column names and metadata in dicts before you ever see them.

**Reading and writing.** \`marks["ada"]\` → 91. A missing key raises **KeyError** — dicts never guess. \`marks["grace"] = 95\` inserts or overwrites (assignment is upsert). \`del marks["alan"]\` removes a pair. \`"ada" in marks\` tests **keys** (never values — \`91 in marks\` is False even though 91 is stored). \`len(marks)\` counts pairs. Rebuild or merge: \`dict(marks)\` / \`marks.copy()\`, \`marks.update({"grace": 96, "lin": 78})\`.

**Safe access.** \`marks.get("zed")\` returns \`None\` instead of raising; \`marks.get("zed", 0)\` returns a stated default. This distinction has a sharp edge: \`if marks.get("count"):\` is False both when the key is missing **and** when its value is 0, 0.0, "" or None. If presence matters, ask about presence: \`if "count" in marks:\` (or \`marks.get("count") is not None\`).

**Why lookup is fast.** A list search is a conversation: "is it this one? this one? this one?" — up to N comparisons (O(n)). A hash table computes a fingerprint of the key, jumps directly to a bucket, and confirms in about one step — O(1) on average for get, set and delete. Ten thousand entries: thousands of comparisons versus a couple of memory hops. The costs are memory overhead and the fact that you must have a *key*; if your access pattern is "position 437 in insertion order", a list is still right.

**The idiomatic loop.** \`marks.items()\` yields (key, value) pairs: \`for name, m in marks.items():\`. Values alone: \`marks.values()\`; keys are the default iteration: \`for k in marks:\`. Building counts in a loop is the canonical dict recipe:

\`counts = {}\` → \`for w in words: counts[w] = counts.get(w, 0) + 1\`

You will write that shape hundreds of times — word frequencies, label counts, per-user totals, bucketing predictions. Dict comprehensions do the same in one line: \`{w: len(w) for w in words}\`. Convert two lists with \`dict(zip(names, marks))\`.`,
        extras: [
          table(
            'Access patterns and their costs',
            ['Operation', 'List', 'Dict'],
            [
              ['Get value by position/order', 'marks[3] → O(1)', 'N/A — no positions'],
              ['Get value by key', 'scan → O(n)', 'marks["ada"] → O(1) average'],
              ['Test membership', 'x in list → O(n)', 'x in dict → O(1) average (tests keys)'],
              ['Keep insertion order', 'Yes', 'Yes (guaranteed 3.7+)'],
              ['Keys restricted to', 'Positions only', 'Hashable values only'],
            ],
          ),
          code(
            'counts = {}\nwords = "the cat the hat the end the".split()\nfor w in words:\n    counts[w] = counts.get(w, 0) + 1\n\nprint(counts)                              # {\'the\': 4, \'cat\': 1, \'hat\': 1, \'end\': 1}\nprint(counts.get("dog", 0))                 # 0 — no KeyError\nfor w, c in sorted(counts.items(), key=lambda kv: kv[1], reverse=True):\n    print(f"{w:<6}{c}")',
            'frequency.py',
            'python',
          ),
          warn(
            'get() defaults are not presence checks',
            'if d.get("x") fails for missing keys AND for falsy values like 0 or "". Ask directly: if "x" in d, or d.get("x") is not None.',
          ),
        ],
        worked: {
          title: 'Count words and rank them',
          problem:
            'text = "the cat the hat the end the". Build a word-frequency dict, print it, and list the top three words by count.',
          steps: [
            {
              title: '1. Normalise and split',
              desc: 'lower() so "The" and "the" are one word; split() with no argument breaks on any run of whitespace and returns a list of tokens.',
              code_snippet: 'text = "the cat the hat the end the"\nwords = text.lower().split()',
            },
            {
              title: '2. Count with get()',
              desc: 'Each visit either finds the key (add 1) or does not (start at 1 via the default 0). This one loop is the frequency-table idiom.',
              code_snippet: 'counts = {}\nfor w in words:\n    counts[w] = counts.get(w, 0) + 1\nprint(counts)',
            },
            {
              title: '3. Report in count order',
              desc: 'sorted() on items() with a key that reads the value (kv[1]); reverse=True gives most-frequent first. Unpack the pair in the for-loop.',
              code_snippet: 'for w, c in sorted(counts.items(), key=lambda kv: kv[1], reverse=True):\n    print(f"{w:<6} {c}")',
            },
            {
              title: '4. Top three in one expression',
              desc: 'Sort the KEYS by looking each one up in the dict (key=counts.get), then keep the first three.',
              code_snippet: 'top3 = sorted(counts, key=counts.get, reverse=True)[:3]\nprint(top3)   # [\'the\', \'cat\', \'hat\']',
            },
          ],
          solution:
            "counts = {'the': 4, 'cat': 1, 'hat': 1, 'end': 1}; the report prints 'the 4' first, then the single-count words in insertion order; top3 = ['the', 'cat', 'hat']. One pass built the table, sorted() ranked it, and get() kept every lookup safe — no KeyError anywhere.",
        },
        practice: {
          title: 'Grade book with counts',
          prompt:
            'Given grades = ["A", "B", "A", "C", "B", "A"]: (1) build a dict of grade → count, (2) print each grade and its count with a loop over items(), (3) print the most common grade using max(counts, key=counts.get), (4) show how many distinct grades there are with len().',
          hint: 'Start with counts = {} and counts.get(k, 0) + 1; max() over dict keys with a key function returns a KEY.',
        },
        mistakes: [
          {
            mistake: 'Reading a key you are not sure exists: d["maybe"]',
            fix: 'KeyError. Use d.get("maybe") for None, d.get("maybe", default) for a stated default, or check with "maybe" in d first.',
          },
          {
            mistake: 'Testing a value with if d.get("k"), when 0 or "" is a valid answer',
            fix: 'Falsy values and missing keys look identical through get(). Check presence: "k" in d — or default to something non-falsy, e.g. d.get("k", 0).',
          },
          {
            mistake: 'Looping over the dict and expecting values',
            fix: 'for k in d iterates KEYS. Use d.items() to get both, d.values() for values alone — and remember values() is for reading, not for assigning.',
          },
          {
            mistake: 'Adding or deleting pairs while iterating the dict',
            fix: 'Python raises RuntimeError: dictionary changed size during iteration. Collect the changes first, then apply them after the loop (or iterate over a snapshot like list(d)).',
          },
        ],
        exam: {
          question:
            'Compare the average time complexity of looking up a value in a list by key-like scan versus a dict lookup, and state one situation where the list is still the better choice.',
          answer:
            'A list search must compare elements one by one until it finds a match or reaches the end — O(n) average, O(1) only if you are lucky with position 0. A dict stores each key\'s hash and jumps to the right bucket, so get/set/delete are O(1) on average (hash collisions can degrade this, hence "average"). A list is still preferable when: order and position are the access pattern (queue, stack, sorted scan), you iterate over all elements more often than you look any up, memory per element matters (dicts carry overhead), or you need to store positions and there is no natural key.',
          source: 'Classic data-structures question in Python interviews; maps directly to Hash Table units in university exams.',
        },
        summary: [
          'A dict maps hashable keys to arbitrary values; insertion order is preserved (Python 3.7+).',
          'd[k] raises KeyError on absence; d.get(k, default) does not — and in tests KEYS, not values.',
          'Average O(1) get/set/delete makes dicts the default for any lookup; lists are for ordered scans.',
          'Iterate with items() for pairs, values() for values, keys() by default; do not resize while looping.',
          'The frequency idiom — counts[k] = counts.get(k, 0) + 1 — builds a histogram in one pass.',
          'dict(zip(a, b)) pairs two lists; dict comprehensions build tables in one line.',
        ],
      }),
      [
        [
          'd = {"a": 1}. What does d.get("b") return?',
          ['None', '0', 'KeyError', "'b'"],
          0,
          'get() with no stated default returns None instead of raising; d["b"] would raise KeyError.',
        ],
        [
          'd = {"a": 1}; d["b"] = 2. What does list(d) give?',
          ["['a', 'b']", "['1', '2']", "['b', 'a']", 'An error'],
          0,
          'list() over a dict yields its KEYS, in insertion order: ["a", "b"].',
        ],
        [
          'Average-case lookup complexity of dict vs list membership:',
          ['O(1) vs O(n)', 'O(n) vs O(1)', 'O(log n) vs O(n)', 'Both O(n)'],
          0,
          "Hash-table access jumps via the key's hash; a list scan compares element by element.",
        ],
        [
          'Which can legally be a dict KEY?',
          ['[1, 2]', '(1, 2)', '{1: 2}', 'A list of strings'],
          1,
          'Only hashable (immutable) values qualify; tuples are, lists and dicts are not.',
        ],
      ]
    ),
    lesson(
      M2,
      'pyai-2-4',
      4,
      'Sets, Comprehensions & Choosing the Right Structure',
      'Unique values and set algebra (union, intersection, difference), list/dict/set comprehensions, and a decision rule for picking a container.',
      17,
      nineBlocks({
        objectives: [
          'Create sets and use add, remove, discard, in and len safely',
          'Apply union, intersection, difference and symmetric difference to real problems',
          'Write list, dict and set comprehensions with filtering conditions',
          'Choose list, tuple, dict or set for a requirement and justify the choice',
        ],
        hook:
          'A placement portal holds 50,000 applications in a list and asks "has this email already applied?" for each new one. Written naively — scan the list for every check — that is roughly 1.25 billion comparisons. Written with a set of seen emails it is 50,000 near-instant checks. Same question, four orders of magnitude apart, and the fix is one line of vocabulary you will learn in the next twenty minutes.',
        concept: `**Sets: uniqueness as a data type.** A set is an **unordered collection of unique, hashable values**: \`{1, 2, 3}\`. Duplicates disappear the moment you build one — \`set([1, 1, 2, 2, 3])\` → \`{1, 2, 3}\`. Two syntax traps: the empty set must be written \`set()\` because \`{}\` is an empty **dict**, and elements must be hashable (same rule as dict keys — \`set([[1, 2]])\` raises TypeError). Core methods: \`add(x)\` (no effect if present), \`remove(x)\` (KeyError if absent), \`discard(x)\` (silently skips), \`pop()\` (removes and returns some element), plus \`len\` and \`in\` — and membership is near-constant time, which is the whole point.

**Set algebra — four operators worth their ink:**
- \`a | b\` **union**: everything in either,
- \`a & b\` **intersection**: only what is in both,
- \`a - b\` **difference**: in a but not in b,
- \`a ^ b\` **symmetric difference**: in exactly one of them.
Each also has an in-place form (\`a.update(b)\`, \`a.intersection_update(b)\`, ...). These turn questions like "who is in the new list but not the old?" into one expression instead of a nested loop — and because the operands are sets, each question is answered in roughly O(len) rather than O(len²).

**Dedup without losing order.** \`list(set(xs))\` is the fast one-liner, but sets are unordered, so your original sequence order is gone. When order matters (it usually does — "first occurrence" often carries meaning), keep a \`seen\` set as a companion:

\`seen, out = set(), []\` → for each x: if x not in seen → seen.add(x); out.append(x)

One pass, O(n) total, order preserved. This is the pattern interviewers ask you to write from memory.

**Comprehensions: build a whole collection in one expression.** The shape is \`[expression for item in iterable if condition]\`:

\`[w.upper() for w in words if len(w) > 4]\`

Read it left to right: *for each w in words, take those longer than four characters, and yield w.upper()*. There are three flavours — list \`[...]\`, dict \`{k: v ...}\`, set \`{...}\` — all sharing the same grammar, and all faster and more idiomatic than building the same collection with an empty list plus append. Conditions can filter (an \`if\` **after** the for) or transform (an \`if ... else\` **before** the for). Nested loops work: \`[f"{r}-{c}" for r in range(3) for c in range(3)]\`. The discipline: one or two clauses, readable in a line or two — three chained conditions or any try/except means a plain for-loop is the clearer choice. Python 3 comprehension variables also do not leak into the surrounding scope, so they do not clobber your names.

**Choosing the structure — the rule to memorise:**
| Requirement | Structure |
| Ordered sequence you index/append/sort | **list** |
| Fixed record, never changes, maybe a key | **tuple** |
| Look values up by an identifier | **dict** |
| Uniqueness tests or set algebra | **set** |
If you cannot decide, ask: do I need positions, a lookup, uniqueness, or a frozen record? — in that order of frequency in data code.`,
        extras: [
          table(
            'Which container, when',
            ['If you need to…', 'Reach for', 'Because'],
            [
              ['Keep order, index it, grow it', 'list', 'Ordered, mutable, cheap to append'],
              ['Freeze a record (a point, a return pair)', 'tuple', 'Immutable and hashable'],
              ['Fetch value by name/key', 'dict', 'O(1) average lookup'],
              ['Test membership / remove duplicates', 'set', 'Unique elements, O(1) membership'],
            ],
          ),
          code(
            'words = ["Ada", "Alan", "Grace", "Ada", "Lin"]\n\nunique_ordered = []          # dedup that keeps first-seen order\nseen = set()\nfor w in words:\n    if w not in seen:\n        seen.add(w)\n        unique_ordered.append(w)\n\nlengths = {w: len(w) for w in words}          # dict comprehension\nlongs = [w for w in words if len(w) > 3]      # filter\nprint(unique_ordered, lengths, longs)',
            'sets-comprehensions.py',
            'python',
          ),
          warn(
            '{} is a dict, not a set',
            'x = {} creates an empty dict — try type(x) and you will see dict. Empty sets are written set(). And list(set(xs)) shuffles: use the seen-set idiom when order matters.',
          ),
        ],
        worked: {
          title: 'Reconcile two signup lists',
          problem:
            'old = ["ada", "alan"], new = ["ada", "grace", "ada"]. Report (a) the new signups in first-seen order, (b) who applied twice, (c) who is new but not in the old list — without nested loops.',
          steps: [
            {
              title: '1. Deduplicate, preserving order',
              desc: 'A seen-set answers "have I met you?" in O(1) while append preserves the original sequence — the standard O(n) ordered dedup.',
              code_snippet: 'old = ["ada", "alan"]\nnew = ["ada", "grace", "ada"]\n\nseen, unique = set(), []\nfor n in new:\n    if n not in seen:\n        seen.add(n)\n        unique.append(n)\nprint(unique)   # [\'ada\', \'grace\']',
            },
            {
              title: '2. Find the repeats with a frequency dict',
              desc: 'Count every name once (over a set, so each is counted once per pass), then keep those with a count above 1 — again, a comprehension instead of nested loops.',
              code_snippet: 'freq = {n: new.count(n) for n in set(new)}\ndupes = {n for n, c in freq.items() if c > 1}\nprint(dupes)   # {\'ada\'}',
            },
            {
              title: '3. Set difference for the reconciliation',
              desc: 'Convert both lists to sets and subtract: membership questions collapse into one operator. Order is irrelevant here — a set of names is exactly the right answer type.',
              code_snippet: 'brand_new = set(new) - set(old)\nprint(brand_new)   # {\'grace\'}',
            },
            {
              title: '4. Transform with a comprehension',
              desc: 'A one-line comprehension renders the unique list as a report — expression, loop and filter living in one readable expression.',
              code_snippet: 'print([n.upper() for n in unique])   # [\'ADA\', \'GRACE\']',
            },
          ],
          solution:
            "Ordered dedup → ['ada', 'grace']; repeats → {'ada'}; brand-new → {'grace'}; report → ['ADA', 'GRACE']. A set for membership, a dict for counts, a list for ordered output — each question got the container built for it, and no nested loop appeared anywhere.",
        },
        practice: {
          title: 'Set algebra on two rosters',
          prompt:
            'roster_a = ["ada", "alan", "grace", "linus"], roster_b = ["grace", "ed", "ada"]. Print: students in both classes (intersection), everyone in either class (union, sorted for display), only in A, and exactly one class (symmetric difference). Then write a list comprehension producing the lengths of the unique names.',
          hint: 'Intersection is &; sort set results with sorted(...) before printing if you want stable output.',
        },
        mistakes: [
          {
            mistake: 'Writing s = {} for an empty set',
            fix: 'That is an empty dict — check with type(s). Use s = set() for an empty set and confirm s.add(1) behaves.',
          },
          {
            mistake: 'list(set(xs)) when order matters',
            fix: 'Set iteration order is not your input order. Use the seen-set + append idiom to keep first-seen order in O(n).',
          },
          {
            mistake: 'remove() on an element that may be absent',
            fix: 'remove raises KeyError; discard skips silently. Or check first: if x in s: s.remove(x).',
          },
          {
            mistake: 'Testing membership with "x in big_list" inside a loop over big_list',
            fix: 'That is O(n²). Convert once — s = set(big_list) — and let every later test be O(1). This is the single biggest cheap speed-up in data code.',
          },
        ],
        exam: {
          question:
            'Write Python that removes duplicates from a list while preserving the original order, and state its time complexity. Why is list(set(xs)) not always acceptable?',
          answer:
            "seen, out = set(), []\nfor x in xs:\n    if x not in seen:\n        seen.add(x)\n        out.append(x)\nEach element is checked against and added to a set — O(1) average per operation — so the pass is O(n) overall. list(set(xs)) is also O(n) (construction plus the later sort to restore order is O(n log n)), but sets are unordered, so the result silently reorders elements: 'first occurrence wins' information is lost. When order carries meaning — log lines, first-come ranks, positional pairing with another list — that loss is a correctness bug, not a cosmetic one.",
          source: 'Standard interview whiteboard question; also a frequent 4-mark practical in university Python papers.',
        },
        summary: [
          'Sets hold unique hashable values; {} is a dict, so an empty set is set().',
          'Union |, intersection &, difference - and symmetric difference ^ answer roster questions in one line.',
          'list(set(x)) dedups fast but loses order — keep a seen set when order matters.',
          'Comprehensions: [expr for x in it if cond] in list, dict and set flavours; keep them short.',
          'Container rule: positions → list, frozen record → tuple, keyed lookup → dict, uniqueness → set.',
          'Membership on a set is O(1) average — convert lists to sets before any repeated "in" test.',
        ],
      }),
      [
        [
          'What does x = {} create?',
          ['An empty set', 'An empty dict', 'A syntax error', 'None'],
          1,
          'Curly braces with nothing inside are a dict; an empty set must be written set().',
        ],
        [
          'set([1, 1, 2, 2, 3]) has how many elements?',
          ['5', '3', '2', 'Error — duplicates are illegal'],
          1,
          'Sets store unique values only, so the three duplicates collapse: {1, 2, 3}.',
        ],
        [
          'What does [c for c in "abc" if c != "b"] produce?',
          ["['b']", "['a', 'c']", "['a', 'b', 'c']", 'Error'],
          1,
          'The comprehension keeps every character except b — a and c — as a new list.',
        ],
        [
          'With a = {1, 2} and b = {2, 3}, the expression a - b is:',
          ['{1, 3}', '{2}', '{1}', '∅ (empty set)'],
          2,
          'Difference keeps elements in a that are not in b: 1 remains, 2 is removed.',
        ],
      ]
    ),
  ],
};
