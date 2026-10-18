// Module 5 — NumPy: Arrays, Vectorization, Indexing & Broadcasting
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, code } from '../nineBlocks';
import { lesson, M5, COURSE_ID } from './helpers';

export const module5: CourseModule = {
  id: M5,
  course_id: COURSE_ID,
  title: 'Module 5 — NumPy: Arrays at Speed',
  summary:
    'ndarray vs Python lists, dtypes and shapes, vectorised arithmetic and boolean masks, indexing/slicing/fancy indexing with view-vs-copy rules, broadcasting, axis-based reductions and reproducible random numbers.',
  sort_order: 5,
  lessons: [
    lesson(
      M5,
      'pyai-5-1',
      1,
      'NumPy Arrays vs Python Lists: dtype, Shape & Memory',
      'What an ndarray actually stores, how it is created, and why one block of typed memory beats a list of Python objects for AI work.',
      17,
      nineBlocks({
        objectives: [
          'Import NumPy and create arrays with array, zeros, ones, full, arange and linspace',
          'Read an array\'s shape, dtype, size and ndim and explain what each means',
          'Explain why a homogeneous numeric array is smaller and faster than a list of numbers',
          'Convert between lists and arrays and predict which operations copy and which mutate',
        ],
        hook:
          'Two lines, both legal, both completely different: [1, 2, 3] + [4, 5, 6] glues two lists into [1, 2, 3, 4, 5, 6], while np.array([1, 2, 3]) + np.array([4, 5, 6]) adds element-wise and answers [5, 7, 9]. The same operator, two different worlds. Every AI library you meet — pandas, PyTorch, TensorFlow, scikit-learn — lives in the second world, and this lesson is the border crossing.',
        concept: `**What NumPy is.** NumPy (Numerical Python) is the foundation of the entire Python data stack: \`import numpy as np\` is the first line of nearly every data notebook ever written. Its core object is the **ndarray** — a fixed-size, multidimensional array of *homogeneous* raw data. pandas DataFrames are column-stacks of ndarrays under the hood; deep-learning tensors copy its shape-and-dtype design; when code "goes numeric" in Python, it goes through something shaped like this.

**A list of numbers versus an array of numbers.** A Python list is an array of **references** to full Python objects: every element is a tagged, reference-counted object that could live anywhere in memory — and could be a different type from its neighbours. A NumPy array is one **contiguous block of raw memory** of a single fixed type (dtype), plus a small header recording shape and strides. Four consequences, all of which you will feel:
1. **Memory.** A float64 in an array is 8 raw bytes. The same number in a list is a Python object costing several times that, plus the pointer in the list. A million numbers: ~8 MB as an array versus tens of MB as a list.
2. **Speed.** Array arithmetic runs as a compiled C loop over raw memory — no per-element type checks, no object creation. This is why Python, despite being a slow interpreter, is the language of AI: the heavy loops never run in Python.
3. **Homogeneity.** One dtype per array. \`np.array([1, "two"])\` coerces everything to text (\`<U21\` — unicode strings) — usually a signal that something upstream went wrong, not a feature.
4. **Element-wise operators.** Lists concatenate with +; arrays add with +. Array comparison (\`>\`, \`==\`) yields a boolean **mask array**, not a single bool — the seed of the filtering you will do in every ML pipeline.

**Creating arrays.**
\`\`\`
a = np.array([3, 1, 4, 1, 5])      # from a list
np.zeros((2, 3))                   # 2×3 of 0.0 (float by default)
np.ones(4)                         # four 1.0s
np.full((2, 2), 7)                 # fill with a constant
np.arange(0, 10, 2)                # [0 2 4 6 8] — the range() of arrays
np.linspace(0, 1, 5)               # five evenly spaced points from 0 to 1
np.eye(3)                          # identity matrix
\`\`\`
Note the default: \`zeros\` and \`ones\` produce **float64** arrays, because floating point is the default currency of numeric work.

**The four attributes you check on every array:**
- \`a.shape\` — tuple of sizes per dimension: \`(3, 4)\` is 3 rows × 4 columns.
- \`a.dtype\` — element type: int64, float64, bool, <U21 (text).
- \`a.size\` — total element count (the product of shape).
- \`a.ndim\` — number of dimensions.

**Reshape, convert, and who owns the memory.** \`a.reshape(2, 3)\` reinterprets the same elements with a new shape (a **view** when the layout allows — writes can be visible to the original; covered properly in Lesson 5.3). \`a.astype(np.float32)\` makes a converted **copy** with a new dtype. \`a.tolist()\` returns a plain Python list copy; \`np.array(some_list)\` copies list data into a fresh buffer — mutating one afterwards never touches the other.`,
        extras: [
          table(
            'List vs ndarray — the operating contract',
            ['Behaviour', 'Python list', 'NumPy array'],
            [
              ['a + b', 'Concatenate', 'Element-wise add (same shape)'],
              ['a * 2', '[1, 2] repeated (a * 2)', 'Every element doubled'],
              ['a == b', 'Whole-list comparison → bool', 'Element-wise boolean mask'],
              ['Element types', 'Anything, mixed freely', 'One fixed dtype for the whole array'],
              ['Storage', 'Pointers to scattered objects', 'Contiguous raw memory'],
            ],
          ),
          warn(
            'The + trap, once and for all',
            'np.array([1, 2]) + np.array([3, 4]) is array([4, 6]). If you wanted [1, 2, 3, 4], you wanted list concatenation or np.concatenate. When a result looks bizarre, ask first: which world is this object in? type(a) answers.',
          ),
          tip(
            'dtype and shape before arithmetic',
            'Two habits that prevent an hour of confusion later: after building any array, print .shape and .dtype once. Every broadcasting error (Lesson 5.4) and every silent int→float promotion becomes obvious at a glance.',
          ),
        ],
        worked: {
          title: 'Inspect a marks matrix built from a list of lists',
          problem:
            'raw = [[85, 90, 78], [92, 88, 95], [70, 65, 80]] holds three students × three tests. Turn it into an array, report its shape, dtype and size, extract one row and one column of values, make a float copy, and convert back to a list.',
          steps: [
            {
              title: '1. Create and immediately inspect',
              desc: 'np.array on a list of equal-length lists builds a 2-D array. One uniform inner-list length is mandatory — ragged rows raise ValueError in modern NumPy.',
              code_snippet: 'import numpy as np\n\nraw = [[85, 90, 78], [92, 88, 95], [70, 65, 80]]\ngrades = np.array(raw)\nprint(grades.shape, grades.dtype, grades.size)   # (3, 3) int64 9',
            },
            {
              title: '2. Navigate by axis',
              desc: 'grades[0] is the first student\'s row; grades[:, 1] is every student\'s score on test 1 — the colon means "all of the rows axis".',
              code_snippet: 'print(grades[0])        # [85 90 78]\nprint(grades[:, 1])     # [90 88 65]',
            },
            {
              title: '3. Reinterpret and convert',
              desc: 'reshape re-lays nine values into a new shape; astype builds a converted COPY in float64 — the original int array is untouched.',
              code_snippet: 'flat = grades.reshape(9)          # or reshape(3, 3) back again\nas_float = grades.astype(np.float64)\nprint(as_float.dtype)             # float64',
            },
            {
              title: '4. Leave the array world cleanly',
              desc: 'tolist() hands back plain Python lists — safe to JSON-serialise, print in reports, or hand to code that is not NumPy-aware.',
              code_snippet: 'print(grades.tolist())   # [[85, 90, 78], [92, 88, 95], [70, 65, 80]]',
            },
          ],
          solution:
            'Shape (3, 3), dtype int64, size 9 — three dimensions worth of facts in three attribute reads. Row [85 90 78] and column [90 88 65] came from axis-aware indexing; astype produced an independent float copy; tolist() exited back to plain Python structures. Every step was deliberate about copies versus views — the discipline that Module 5 is built to install.',
        },
        practice: {
          title: 'Build, inspect, predict, verify',
          prompt:
            'Without running first, predict shape, dtype and size for each: np.zeros(4); np.ones((2, 5)); np.arange(0, 12, 3).reshape(2, 2); np.linspace(0, 1, 4). Then run them and correct your notes. Finally create an array from [1, 2, "three"] and inspect what dtype came out — write one line about what that teaches you.',
          hint: 'zeros/ones default to float64; arange gives ints; a mixed list coerces everything to text (<U…).',
        },
        mistakes: [
          {
            mistake: 'Expecting + and * on arrays to behave like list + and list *',
            fix: 'Array operators are element-wise (and need compatible shapes); list operators concatenate and repeat. Check type(result) whenever an operator surprises you.',
          },
          {
            mistake: 'Ragged list of lists into np.array',
            fix: 'Uneven rows raise ValueError (older NumPy silently made an object dtype — an invisible performance disaster). Pad or trim to a rectangular shape first.',
          },
          {
            mistake: 'Assuming dtype is always what it looked like',
            fix: 'Ints plus floats promote to float64; any text in the source forces strings; zeros() defaults to floats. Read a.dtype once after creation instead of assuming.',
          },
          {
            mistake: 'Treating reshape or astype as free views',
            fix: 'astype always copies. reshape is a view only when the data layout allows — never rely on the difference casually; use .copy() when independence matters (Lesson 5.3 covers the memory rules).',
          },
        ],
        exam: {
          question:
            'Explain why a NumPy array of a million float64 values is both smaller and faster to process than a Python list of the same million numbers.',
          answer:
            'Storage: the array holds one contiguous block of 8-byte raw float64 values plus one small header (shape, dtype, strides) — about 8 MB total. The list holds a million pointers, each pointing to a separate Python float OBJECT that carries a type tag, reference count and value (tens of bytes apiece, allocated wherever the allocator found room) — tens of MB, scattered in memory. Speed: array arithmetic executes as a compiled C loop over that contiguous buffer, with none of Python\'s per-element dispatch, type checks or object creation; list arithmetic must fetch, type-check and construct a new Python object per element through the interpreter. Contiguous storage also fits cache lines far better. That combination — C-loop execution over raw memory, orchestrated by Python one call at a time — is why Python became the language of numerical AI despite the interpreter itself being slow.',
          source: 'The standard "why NumPy?" question in data-science interviews; also a favourite in university DS exams.',
        },
        summary: [
          'NumPy\'s ndarray is contiguous, homogeneous, typed memory plus a shape header — the base of pandas and every AI tensor library.',
          'Lists hold references to arbitrary objects; arrays hold raw values of one dtype.',
          'Array operators are element-wise (+ concatenates only for lists) — check type() when in doubt.',
          'Always read shape, dtype, size, ndim after building an array; zeros/ones default to float64.',
          'astype and tolist copy; reshape is usually a view; np.array(list) copies the data in.',
        ],
      }),
      [
        [
          'np.array([1, 2, 3]) + np.array([4, 5, 6]) produces:',
          ['[1, 2, 3, 4, 5, 6]', 'array([5, 7, 9])', 'array([4, 6, 8])', 'A shape error'],
          1,
          'Same-shape numeric arrays add element-wise — unlike lists, where + concatenates.',
        ],
        [
          'What are the shape and size of np.arange(6).reshape(2, 3)?',
          ['(6,) and 6', '(2, 3) and 6', '(3, 2) and 6', '(2, 6) and 12'],
          1,
          'reshape re-lays the six values into 2 rows × 3 columns; the element count is unchanged.',
        ],
        [
          'The default dtype of np.zeros(3) is:',
          ['int64', 'float64', 'bool', 'object'],
          1,
          'zeros/ones/full default to float64 — floating point is NumPy\'s default numeric type.',
        ],
        [
          'a.reshape(4, 1) most likely returns:',
          ['A copy — writing to it cannot affect a', 'A view into a — writing to it may change a', 'A new Python list', 'A tuple of arrays'],
          1,
          'Reshaping usually views the same buffer; that is why .copy() exists and why shape-changing code deserves care.',
        ],
      ]
    ),
    lesson(
      M5,
      'pyai-5-2',
      2,
      'Vectorization: Why NumPy Is Fast',
      'Whole-array arithmetic, boolean masks for filtering and counting, and the measured difference between a Python loop and one vectorised call.',
      17,
      nineBlocks({
        objectives: [
          'Define vectorisation and explain where the time saved actually goes',
          'Apply arithmetic, comparison and logical operations to whole arrays',
          'Filter, count and summarise data with boolean masks',
          'Convert a per-element Python loop into its vectorised equivalent',
        ],
        hook:
          'Square a million numbers with a list comprehension, then with one array expression. The stopwatch shows the array call finishing tens of times faster — and that is a deliberately boring example. Real models perform this kind of arithmetic billions of times per training run; without vectorised kernels underneath, modern AI in Python would not exist. Vectorisation is not a micro-optimisation. It is the reason the stack works at all.',
        concept: `**What vectorisation is.** A **vectorised operation** is one call that applies an operation to every element of an array, executed as a compiled loop inside NumPy rather than a Python-level loop. \`a * 2\`, \`a + b\`, \`np.sqrt(a)\`, \`a ** 2\`, \`a > 60\` — each is a single Python-level dispatch that hands the whole array to a C kernel. The interpreter runs once; the per-element work never touches a Python object. Measured on a million elements, vectorised arithmetic typically runs **10× to 100×** faster than the equivalent list loop — plus it allocates one result array instead of a million temporary objects.

**Where the list loop spends its life.** For each element: dereference the pointer, read the type tag, decide which C function implements the operation for those types, execute it, build a *new* Python object for the result, store a reference. That per-element dispatch is roughly a hundred times the cost of the raw arithmetic itself. NumPy\'s kernels skip all of it: one loop over a pointer, multiply, store — a loop so tight the compiler vectorises it with CPU SIMD instructions. Python orchestrates; C computes. That is the whole architecture of numerical Python.

**The operations you now have:**
- **Arithmetic** — \`a + b\`, \`a - b\`, \`a * b\`, \`a / b\`, \`a ** 2\`, scalar mixing (\`a * 0.01\`): all element-wise, all one call.
- **Comparison → boolean mask** — \`passed = scores >= 60\` yields an array of True/False the same shape as scores. Masks are questions you ask of the whole dataset at once:
  \`scores[passed]\` (the passing scores), \`passed.sum()\` (how many — True counts as 1), \`passed.mean()\` (the fraction passing, since mean of booleans is their rate).
- **Mask algebra** — combine questions with \`&\` (and), \`|\` (or), \`~\` (not): \`senior_pass = (marks >= 60) & (ages >= 60)\`. Parentheses are mandatory because \`&\` binds *tighter* than comparisons: \`marks > 60 & ages > 60\` means something else entirely, and nothing stops you writing it.
- **Reductions (preview)** — \`a.sum()\`, \`a.mean()\`, \`a.min()\`, \`a.max()\`, \`a.std()\` collapse an array to a scalar; the axis versions arrive in Lesson 5.4.
- **Conditional slices** — \`a[a < 0\].mean()\` averages only the negatives (check \`a.any()\` first — an empty selection gives nan and a RuntimeWarning).

**When a loop is still the right tool.** Vectorise *numeric, element-wise* work over large data. Keep the Python loop when the per-item work is heavy and irregular: opening files, parsing text, branching on complex logic, a few thousand iterations. Real AI code is layered exactly this way — a Python loop over epochs and batches, inside which every numeric step is a vectorised call. Knowing which layer a piece of logic belongs to is half of writing fast numerical Python.

**Measure honestly.** In notebooks, \`%timeit expression\` reports a robust timing; in scripts, the \`timeit\` module. Benchmark at realistic sizes (a thousand elements measure interpreter noise; a million measure the algorithm), and compare like with like — including import costs and any data conversion.`,
        extras: [
          table(
            'One million elements: where the time goes',
            ['Step', 'Python list loop', 'NumPy vectorised'],
            [
              ['Per element', 'Type check + dispatch + new object', 'One raw operation in a C loop'],
              ['Python-level work', 'Once per element', 'Once per call'],
              ['Memory traffic', 'Million scattered objects + temps', 'Two contiguous buffers, one result'],
              ['Typical wall time', 'Tens of milliseconds to seconds', 'One to a few milliseconds'],
            ],
          ),
          code(
            'import numpy as np\n\nscores = np.array([55, 72, 90, 41, 88, 63, 95, 70, 38, 84])\npassed = scores >= 60\n\nprint(passed)                 # [False  True  True False  True  True  True  True False  True]\nprint(passed.sum())           # 7 — number of True\nprint(f"{passed.mean():.0%}") # 70% — fraction of True\nprint(scores[passed])         # [72 90 88 63 95 70 84]',
            'masks.py',
            'python',
          ),
          warn(
            'and/or/not versus &/|/~',
            'Python\'s and/or/not demand single boolean values and raise "ambiguous truth value" on arrays. Arrays use the element-wise operators & | ~ — always with parentheses: (a > 0) & (a < 1).',
          ),
        ],
        worked: {
          title: 'Filter and scale a million scores the vectorised way',
          problem:
            'scores = np.array([55, 72, 90, 41, 88, 63, 95, 70, 38, 84]). Report (a) how many scores passed (>= 60) and the pass rate, (b) the mean of the passers, (c) every score min-max scaled to the 0–1 range — all without writing a single for loop.',
          steps: [
            {
              title: '1. Ask the question once, as a mask',
              desc: 'One comparison produces a boolean array. sum() counts the Trues; mean() of booleans is their rate — True is 1, False is 0.',
              code_snippet: 'passed = scores >= 60\nprint(passed.sum())                 # 7\nprint(f"{passed.mean():.0%}")       # 70%',
            },
            {
              title: '2. Select with the mask, then reduce',
              desc: 'scores[passed] is a new 1-D array of the seven passing scores; calling .mean() on it is one more vectorised reduction. 562 / 7 is about 80.3.',
              code_snippet: 'print(f"{scores[passed].mean():.1f}")   # 80.3',
            },
            {
              title: '3. Scale with array arithmetic',
              desc: 'Min-max scaling is three vectorised steps: subtract the minimum, divide by the range. Scalars broadcast against the whole array (Lesson 5.4) — no loop anywhere.',
              code_snippet: 'scaled = (scores - scores.min()) / (scores.max() - scores.min())\nprint(np.round(scaled[:3], 3))     # [0.298 0.596 0.912]',
            },
            {
              title: '4. Watch the loop version lose',
              desc: 'The list version must do per-element Python arithmetic on a million items; on typical hardware it is an order of magnitude slower than the array expression — same maths, different execution model.',
              code_snippet: 'big = np.random.randn(1_000_000)\nxs = big.tolist()\n# %timeit [(x - big.min()) / (big.max() - big.min()) for x in xs]   # ~10x slower than the vector form\n# %timeit (big - big.min()) / (big.max() - big.min())',
            },
          ],
          solution:
            'Mask once (7 of 10 passed — 70%), reduce the selection (mean 80.3), scale everything with three array expressions (first values ≈ 0.298, 0.596, 0.912). One Python-level dispatch per operation; all per-element work in C. The list-comprehension version computes identical numbers roughly ten times slower — and that gap only widens with size.',
        },
        practice: {
          title: 'Masks end to end',
          prompt:
            'With marks = np.array([34, 67, 90, 12, 55, 88, 100, 45, 77, 66]): (1) count how many are at least 50; (2) print the mean of those below 50; (3) using a combined mask with &, print the scores between 60 and 90 inclusive; (4) set every score below 40 to 40 in one line and print the array; (5) compute what fraction of the class scored above the class mean — using a mask comparison against marks.mean().',
          hint: 'Combined conditions need parentheses: (marks >= 60) & (marks <= 90). marks > marks.mean() is itself a mask.',
        },
        mistakes: [
          {
            mistake: 'Using Python\'s and / or / not on arrays',
            fix: 'They raise ValueError: truth value of an array is ambiguous. Use & | ~ with parentheses — (a > 0) & (a < 1).',
          },
          {
            mistake: 'Writing a > 60 & b < 30 without parentheses',
            fix: '& binds tighter than comparison operators, so this parses as a > (60 & b) < 30 — nonsense or an error. Always bracket the comparisons first.',
          },
          {
            mistake: 'Hand-looping a vectorisable operation over a large array',
            fix: 'If the per-item work is element-wise arithmetic or comparison, express it as one array operation. Keep loops for heavy per-item logic (I/O, parsing, branching).',
          },
          {
            mistake: 'Reducing an empty selection without checking',
            fix: 'a[a > limit].mean() on an empty selection returns nan with a RuntimeWarning. Guard with if a[mask].size: (or mask.any()) before reporting.',
          },
        ],
        exam: {
          question:
            'What is vectorisation, and why can Python — a slow interpreted language — be the leading language for numerical AI work?',
          answer:
            'Vectorisation means expressing an operation once so that it is applied to an entire array by a compiled kernel, rather than element-by-element through the Python interpreter. NumPy stores data as contiguous typed buffers and implements each operation as a tight C loop (often using CPU SIMD instructions), so the per-element work has none of Python\'s type-checking, object-creation or interpreter-dispatch overhead — typically 10–100× faster than an equivalent list loop. The Python layer only orchestrates: one interpreter call dispatches a whole-array operation. Every higher library (pandas, scikit-learn, PyTorch, TensorFlow) follows the same architecture — slow, flexible Python on the outside; fast, fixed kernels on the inside. That division of labour is precisely why Python is viable for training and serving models despite the interpreter itself being slow.',
          source: 'The architecture question behind almost every "Python performance" discussion in ML interviews.',
        },
        summary: [
          'Vectorisation: one call, one compiled kernel, whole array — the execution model behind all numerical Python.',
          'Comparison operators produce boolean masks; masks filter (a[mask]), count (mask.sum()) and rate (mask.mean()).',
          'Combine mask conditions with & | ~ in parentheses — never with and / or / not.',
          'Vectorise element-wise numeric work; keep Python loops for irregular per-item logic; AI code layers both.',
          'Measure with %timeit at realistic sizes; micro-benchmarks of tiny arrays measure noise, not algorithms.',
        ],
      }),
      [
        [
          'scores = np.array([55, 72, 90, 41]); (scores >= 60).sum() returns:',
          ['4', '2', '203', 'A boolean array'],
          1,
          'The mask is [False, True, True, False]; summing booleans counts the Trues — 2.',
        ],
        [
          'To count scores strictly between 1 and 3, the correct expression is:',
          ['scores > 1 & scores < 3', '(scores > 1) & (scores < 3)', '(scores > 1) and (scores < 3)', 'scores.between(1, 3)'],
          1,
          'Parentheses force both comparisons first; & then combines the two masks element-wise.',
        ],
        [
          'The main performance gain from vectorisation comes from:',
          [
            'NumPy using more CPU cores automatically',
            'Per-element work executing in compiled loops over raw memory, not the Python interpreter',
            'Storing data on disk instead of in RAM',
            'Avoiding the need for a dtype',
          ],
          1,
          'One interpreter dispatch hands the whole array to a C kernel — the per-element Python overhead disappears entirely.',
        ],
        [
          'a[a < 0] on a NumPy array:',
          [
            'Sets all negatives to zero',
            'Returns a copy of the negative elements',
            'Returns a boolean mask',
            'Raises an error',
          ],
          1,
          'A boolean mask used as an index selects matching elements into a new 1-D array; assignment (a[a < 0] = 0) is what changes values.',
        ],
      ]
    ),
    lesson(
      M5,
      'pyai-5-3',
      3,
      'Indexing, Fancy Indexing & Slicing in NumPy',
      '2-D indexing with [row, col], slices and steps, boolean and integer-array indexing — and the view-versus-copy rules that cause silent data bugs.',
      18,
      nineBlocks({
        objectives: [
          'Index and slice 1-D and 2-D arrays with start:stop:step on each axis',
          'Select arbitrary elements with boolean masks and integer-array (fancy) indexing',
          'State which operations return views and which return copies, and verify with shares_memory',
          'Extract single rows, columns and submatrices idiomatically',
        ],
        hook:
          'sub = grades[:3]; sub[0, 0] = 99 — and three rows of the original dataset changed with it. No warning, no error, correct-looking code. NumPy slices are **views**: they share the same memory. This is the single most common silent bug in numerical Python, it has caused wrong results in published research, and it takes one paragraph to understand plus one habit (.copy()) to never be bitten by again.',
        concept: `**The half-open rule carries over — the memory semantics do not.** Indexing and slicing follow everything you know: \`a[0]\`, \`a[-1]\`, \`a[1:4]\`, \`a[::2]\`, \`a[::-1]\` — start included, stop excluded, optional step. But NumPy's basic slicing returns a **view**: a window onto the **same underlying buffer**. \`sub = a[:3]\` does not copy nine values; it creates a lightweight array object with its own shape/strides pointing at the same memory. Writing through the view writes to the original. \`np.shares_memory(a, sub)\` returns True — use it whenever unsure; \`sub = a[:3].copy()\` buys independence when you need it. Views exist because copying a 4 GB dataset to look at part of it would be absurd; the price is vigilance.

**2-D indexing: the comma is the axis separator.** For \`m\` of shape (4, 3):
- \`m[i, j]\` — the single element at row i, column j (idiomatic; \`m[i][j]\` also works but builds a temporary).
- \`m[i]\` — row i, as a 1-D **view**.
- \`m[:, j]\` — column j (the colon means "everything on this axis"), also a view.
- \`m[0:2, 1:3]\` — a submatrix window (rows 0–1, columns 1–2), a view.
Three dimensions show up immediately in images (height × width × channels): \`img[r, c, :\` is one pixel\'s channels.

**Boolean mask indexing — always a copy.** The mask must have the same shape as the array (or match the indexed axis):
- \`a[a > 60]\` — the selected values, flattened into a new 1-D array.
- \`a[a < 0] = 0\` — assignment through a mask **does** modify the original in place (the selection is a copy; the *write* targets the matching positions).
- \`m[m > 90]\` works on a 2-D array and returns a 1-D result — selections flatten; shapes do not survive.

**Fancy (integer-array) indexing — also a copy.** Pass arrays of indices to collect arbitrary positions, honouring order and repeats:
\`\`\`
a = np.array([10, 20, 30, 40, 50])
idx = np.array([3, 0, 0, 1])
a[idx]          # array([40, 10, 10, 20])
\`\`\`
On 2-D data, index rows and columns separately: \`m[[0, 2], :\` takes rows 0 and 2; \`m[:, [1, 3]]\` takes columns 1 and 3. One nuance worth knowing before it surprises you: \`m[[0, 2], [1, 3]]\` **pairs** the indices — it returns elements (0,1) and (2,3), a 1-D result of length 2 — not the 2×2 submatrix. The submatrix needs \`m[np.ix_([0, 2], [1, 3])]\`. When fancy shapes look wrong, print the result\'s .shape and re-read this rule.

**The view/copy cheat sheet — pin this to your notes:**

| Operation | Returns |
| Basic slicing a[1:3] | view (shared memory) |
| m[i], m[:, j] row/column picks | view |
| Boolean mask a[mask] (read) | copy |
| Fancy index a[[0, 2]] | copy |
| a.astype(dtype) | copy |
| a.reshape(...) | view when possible |
| a.copy() | copy |

The asymmetry is deliberate: *slices* are cheap windows; *selections* must gather scattered elements into new memory anyway, so they hand you independence for free.`,
        extras: [
          table(
            'View or copy? The operations that decide it',
            ['Operation', 'Shares memory?', 'Danger level'],
            [
              ['Basic slice a[1:3]', 'Yes — view', 'Writes leak into the original'],
              ['Row/column m[0] / m[:, 1]', 'Yes — view', 'Same'],
              ['Boolean mask a[a > 0]', 'No — copy', 'Safe reads; writes do not propagate'],
              ['Fancy index a[[0, 2]]', 'No — copy', 'Safe'],
              ['astype / copy()', 'No — copy', 'Safe by construction'],
            ],
          ),
          tip(
            'One habit kills the view bug',
            'When you mean "just looking", take the slice. When you mean "mine to edit", take the slice AND .copy(). When unsure, np.shares_memory(a, b) settles it in one call.',
          ),
          warn(
            'Selections flatten, they do not preserve shape',
            'm[m > 90] on a (4, 3) array returns 1-D of however many matches existed. If you need a same-shape result (a filtered image, a masked matrix), use np.where(mask, values, 0) instead of masking for reads.',
          ),
        ],
        worked: {
          title: 'Query a grade matrix — rows, columns, conditionals, and one trap',
          problem:
            'grades = np.array([[85, 90, 78], [92, 88, 95], [70, 65, 80], [61, 74, 59]]) — four students × three tests. Report student 0\'s row and everyone\'s test-1 column; list every score ≥ 90; raise every score below 60 up to 60 in place; and hand a colleague the top row as data they cannot accidentally corrupt.',
          steps: [
            {
              title: '1. Rows and columns with the comma syntax',
              desc: 'grades[0] is row 0 as a view; grades[:, 1] is column 1 — "all rows, column 1". Both are views: do not edit them casually.',
              code_snippet: 'import numpy as np\n\ngrades = np.array([[85, 90, 78], [92, 88, 95],\n                   [70, 65, 80], [61, 74, 59]])\nprint(grades[0])        # [85 90 78]\nprint(grades[:, 1])     # [90 88 65 74]',
            },
            {
              title: '2. Mask selection (a copy)',
              desc: 'The condition becomes a same-shape boolean array; using it as an index gathers the matches into a new 1-D array — 90, 92 and 95.',
              code_snippet: 'print(grades[grades >= 90])   # [90 92 95]',
            },
            {
              title: '3. Assignment through a mask (in place)',
              desc: 'Only 59 sits below 60, so one element changes — in the ORIGINAL matrix. Mask assignment writes to positions; it is one of the few masked operations that mutates.',
              code_snippet: 'grades[grades < 60] = 60\nprint(grades[3])   # [61 74 60]',
            },
            {
              title: '4. A row for a colleague — view trap vs copy',
              desc: 'row = grades[0] shares memory: editing it would rewrite the dataset. A copy hands over independent data. Verify with shares_memory and settle any future doubt the same way.',
              code_snippet: 'row = grades[0]\nprint(np.shares_memory(grades, row))   # True — a view!\nrow_safe = grades[0].copy()\nprint(np.shares_memory(grades, row_safe))   # False — independent',
            },
          ],
          solution:
            'Row [85 90 78] and column [90 88 65 74] from axis-aware indexing; the ≥ 90 scores selected as [90 92 95]; the single failing 59 raised to 60 in the original matrix; and shares_memory revealed that a raw row pick is a view, so the colleague-safe version was an explicit copy. Reads, writes and hand-offs each got the memory semantics they actually needed.',
        },
        practice: {
          title: 'Select everything, copy what matters',
          prompt:
            'With m = np.arange(24).reshape(4, 6): (1) print the first two rows and last two columns as a window; (2) print the diagonal with m[[0, 1, 2, 3], [0, 1, 2, 3]] and also m[np.arange(4), np.arange(4)]; (3) select every element above the array mean and print the count; (4) make a copy of m[1:3, 2:4], edit the copy, and prove the original is unchanged; (5) demonstrate the pairing rule by printing m[[0, 3], [1, 2]] and explaining the two values.',
          hint: 'np.shares_memory(original, your_copy) returns False after a proper copy — that is your proof.',
        },
        mistakes: [
          {
            mistake: 'Editing a slice and "somehow" changing the dataset',
            fix: 'Basic slices and row/column picks are views into the same buffer. When the result must be independent, append .copy() — or check np.shares_memory first.',
          },
          {
            mistake: 'Expecting m[[0, 2], [1, 3]] to return the 2×2 submatrix',
            fix: 'Parallel index arrays PAIR up: you get elements (0,1) and (2,3) — a length-2 array. For the submatrix use m[np.ix_([0, 2], [1, 3])].',
          },
          {
            mistake: 'A boolean mask with the wrong shape',
            fix: 'Masks must match the array (or the indexed axis) dimension-for-dimension, else NumPy raises IndexError. Build the mask from the same array you are indexing with.',
          },
          {
            mistake: 'Assuming masked selections keep the original shape',
            fix: 'a[mask] always returns a flat 1-D copy of the matches. Need same-shape output? Use np.where(mask, a, 0) (or np.nan and nan-aware functions).',
          },
        ],
        exam: {
          question:
            'Contrast basic slicing with boolean-mask and fancy indexing in NumPy with respect to memory sharing, and give the danger each behaviour creates.',
          answer:
            "Basic slicing (a[1:4], m[0], m[:, 1]) returns a VIEW: a lightweight array over the SAME buffer, so np.shares_memory(a, view) is True and writes through the view silently modify the original — the danger is unintended data corruption (or, conversely, 'fixing' a slice and wondering why the source changed). Boolean masks and integer-array (fancy) indexing return COPIES: gathered into fresh memory, independent of the source — the danger is the mirror image: edits to the selection do NOT propagate where a developer expected them to, and memory doubles for large selections. astype and tolist also copy; reshape usually views. The professional habit is to decide deliberately: slice to look, slice.copy() to own.",
          source: 'Standard NumPy memory-semantics question in data-engineering and quant interviews.',
        },
        summary: [
          'NumPy keeps the half-open slicing rule but adds view semantics: basic slices and row/column picks share memory.',
          '2-D access uses m[row, col]; the colon : means "all of this axis".',
          'Boolean masks and fancy (integer-array) indexing return flat copies; mask ASSIGNMENT writes in place.',
          'm[[0,2],[1,3]] pairs indices; the submatrix needs np.ix_.',
          'np.shares_memory answers the view question; .copy() ends the argument.',
        ],
      }),
      [
        [
          'm = np.arange(12).reshape(3, 4). What does m[:, 1] return?',
          [
            'The second row',
            'The second column (a view)',
            'A copy of the second column',
            'An error — too many indices',
          ],
          1,
          'The colon takes all rows; index 1 selects column 1 — and basic indexing returns a view.',
        ],
        [
          'Which of these returns a COPY rather than a view?',
          ['m[1:3]', 'm[0]', 'm[m > 5]', 'm[:, 0]'],
          2,
          'Boolean-mask selections gather matches into new memory; basic slices and row/column picks are views.',
        ],
        [
          'a = np.array([10, 20, 30]). What is a[[0, 0, 1]]?',
          ['[10, 20, 30]', '[10, 10, 20]', 'An error — duplicate indices', '[0, 0, 1]'],
          1,
          'Fancy indexing honours order and repeats: positions 0, 0 and 1 give [10, 10, 20].',
        ],
        [
          'grades[grades < 60] = 60 causes:',
          [
            'A new array with the raised values; original untouched',
            'The original matrix to change in place at matching positions',
            'A boolean mask to be stored',
            'An error — masks cannot be assigned',
          ],
          1,
          'Mask assignment writes through to the matching positions of the original array — one of the in-place masked operations.',
        ],
      ]
    ),
    lesson(
      M5,
      'pyai-5-4',
      4,
      'Broadcasting, Reductions by Axis & Random Numbers',
      'Arithmetic between different shapes, sum/mean/std along an axis, and seeded random sampling — the three habits behind every normalisation pipeline.',
      18,
      nineBlocks({
        objectives: [
          'Apply the broadcasting shape rules and fix a non-broadcastable shape error',
          'Use sum, mean, min and max with axis=0 and axis=1 on 2-D arrays',
          'Standardise a dataset column-wise using keepdims broadcasting',
          'Generate reproducible random numbers with a seeded default_rng',
        ],
        hook:
          'One line of machine learning hygiene — z = (data - data.mean(axis=0)) / data.std(axis=0, keepdims=True) — standardises every feature of a dataset with no loops anywhere. It works because of two quiet superpowers: reductions that collapse an axis, and broadcasting that stretches a result back across the data. Add seeded randomness and you have the three habits behind every normalisation, split and sampling step you will ever run.',
        concept: `**Broadcasting: arithmetic between shapes that are not equal.** NumPy stretches the smaller array along missing or length-1 dimensions instead of refusing the operation. The rules, precisely:
1. Align shapes **right-to-left**.
2. Each pair of dimensions must be **equal, or one of them must be 1**.
3. The result shape is the element-wise maximum of the two.

\`\`\`
m = np.array([[1, 2, 3],
              [4, 5, 6]])       # (2, 3)
v = np.array([10, 20, 30])      # (3,)
m - v                           # (2, 3) — each row gets v applied
\`\`\`

v is treated as (1, 3), then stretched to (2, 3) — *conceptually*: the kernel loops with tiny strides rather than materialising a full copy, so broadcasting is both convenient and cheap. Scalars (shape ()) broadcast against everything: \`m * 2\`, \`m - m.mean()\`. When the rule breaks — \`(2, 3) + (2,)\` — NumPy raises "operands could not be broadcast together", because 3 and 2 match with neither equal nor 1. The famous near-miss: you meant to add a per-**row** vector to a (2, 3) matrix, but wrote a (2,) array; the fix is \`v.reshape(2, 1)\`, a (2, **1**) column that broadcasts across columns.

**Reductions along an axis.** Aggregates collapse data:
- \`m.sum()\` — everything → scalar.
- \`m.sum(axis=0)\` — collapse the **row** axis → per-column totals, shape (3,).
- \`m.sum(axis=1)\` — collapse the **columns** → per-row totals, shape (2,).
The mnemonic that never fails: **axis=k is the axis that disappears.** \`mean\`, \`min\`, \`max\`, \`std\`, \`any\`, \`all\` all take axis the same way — \`m.mean(axis=1)\` is each student\'s average when rows are students and columns are tests. \`keepdims=True\` keeps the collapsed axis as a length-1 dimension, which is exactly what you need so the result broadcasts cleanly against the original: \`m.mean(axis=0, keepdims=True)\` is shape (1, 3) — one mean per column, ready to subtract from every row.

**Standardising — the ML ritual.** Column-standardise: subtract each column\'s mean, divide by each column\'s standard deviation:
\`\`\`
z = (data - data.mean(axis=0, keepdims=True)) / data.std(axis=0, keepdims=True)
\`\`\`
After this, every feature has mean ≈ 0 and std ≈ 1 — the precondition of gradient descent, distance-based models and most normalisation advice you will hear. One expression, two axis-reductions, one broadcast — the whole module in a single line.

**Random numbers, reproducibly.** Modern NumPy builds a generator object; the seed makes "random" repeatable:
\`\`\`
rng = np.random.default_rng(seed=42)
rng.random(3)                 # three uniforms in [0, 1)
rng.normal(0, 1, 100)         # 100 draws from a standard normal
rng.integers(1, 7, 5)         # five dice rolls, 1..6 inclusive of start, exclusive of stop
rng.choice(["cat", "dog"], size=4)   # sample labels
\`\`\`
Reproducibility is not a nicety: every train/test split, initial weight and shuffle in a real project must be regenerable, or nobody — including you next month — can reproduce a result. Seed for anything you report; leave unseeded for pure exploration. Note the same half-open habit as range: integers(1, 7) gives 1–6.`,
        extras: [
          table(
            'Reduction axes on a (students, tests) array',
            ['Expression', 'Result shape', 'Meaning'],
            [
              ['m.sum()', '()', 'Grand total of everything'],
              ['m.sum(axis=0)', '(tests,)', 'Per-test totals — down the rows'],
              ['m.sum(axis=1)', '(students,)', 'Per-student totals — across the tests'],
              ['m.mean(axis=0, keepdims=True)', '(1, tests)', 'Per-test means, shaped to broadcast'],
            ],
          ),
          code(
            'm = np.array([[1, 2, 3],\n              [4, 5, 6]])\nv = np.array([10, 20, 30])\n\nprint((m - v).shape)                    # (2, 3) — broadcasting\nprint(m.sum(axis=0), m.sum(axis=1))     # [5 7 9] [ 6 15]\n\nrng = np.random.default_rng(42)\nprint(rng.normal(0, 1, 3))              # same three numbers every run',
            'broadcast-axis.py',
            'python',
          ),
          warn(
            'The (n,) vs (n, 1) trap',
            'Adding a (2,) vector to a (2, 3) matrix fails: 3 vs 2 matches no rule. Reshape it to (2, 1) when you meant one value per row, or keep (3,) when you meant one per column. When shapes almost work, print both .shape values before editing anything else.',
          ),
        ],
        worked: {
          title: 'Standardise a dataset exactly like an ML pipeline',
          problem:
            'data = np.array([[5.0, 10.0, 15.0], [6.0, 12.0, 18.0], [4.0, 8.0, 12.0]]) — three samples × three features. Column-standardise it: each feature should end with mean 0 and standard deviation 1, computed without a single loop.',
          steps: [
            {
              title: '1. Inspect, then reduce along rows',
              desc: 'axis=0 collapses the row axis, leaving one statistic per column. The means come out as [5, 10, 15] — one clean reduction call.',
              code_snippet: 'data = np.array([[5.0, 10.0, 15.0],\n                  [6.0, 12.0, 18.0],\n                  [4.0,  8.0, 12.0]])\ncol_mean = data.mean(axis=0)\nprint(col_mean)   # [ 5. 10. 15.]',
            },
            {
              title: '2. Same for the standard deviations, keeping dims',
              desc: 'keepdims=True leaves the result as (1, 3) instead of (3,) — the same numbers, but shaped to broadcast down every row without any reshape call.',
              code_snippet: 'col_std = data.std(axis=0, keepdims=True)\nprint(col_std.shape)   # (1, 3)',
            },
            {
              title: '3. One broadcasting expression does the rest',
              desc: 'Subtraction and division each stretch the (1, 3) statistics across all three rows. This single line IS the standardisation step of a real preprocessing pipeline.',
              code_snippet: 'z = (data - col_mean) / col_std',
            },
            {
              title: '4. Verify with axis reductions',
              desc: 'Round away floating-point dust (means land at ~1e-16, not exactly 0) and check: every column now averages 0 with standard deviation 1.',
              code_snippet: 'print(np.round(z.mean(axis=0), 10))   # [0. 0. 0.]\nprint(np.round(z.std(axis=0), 10))    # [1. 1. 1.]',
            },
          ],
          solution:
            'Two axis-0 reductions with keepdims=True produced per-column statistics shaped (1, 3); broadcasting stretched them across the rows in one arithmetic expression; verification shows column means of 0 and standard deviations of 1 (after rounding floating-point dust). Three concepts from this lesson — axis, keepdims, broadcasting — combined into the standardisation ritual used in every ML pipeline you will ever run.',
        },
        practice: {
          title: 'Axes, broadcast, and seed',
          prompt:
            'With m = np.arange(12, dtype=float).reshape(3, 4): (1) print column means and row means; (2) row-standardise m (use axis=1 with keepdims=True) and verify each row now averages 0; (3) add the column vector v = np.array([1, 2, 3, 4]) to m and explain why it works; then attempt m + np.array([1, 2, 3]) and read the exact error; (4) create a seeded rng (default_rng(7)), draw five uniform values, reset the generator with the same seed and prove the five values repeat.',
          hint: 'The failing addition is the (n,) vs (n, 1) trap in disguise — 4 columns versus 3 entries, neither side a 1.',
        },
        mistakes: [
          {
            mistake: 'A shape error like operands could not be broadcast together',
            fix: 'Check both .shape values right-to-left: dimensions must be equal or 1. Reshape a (n,) vector to (n, 1) when you meant one value per row.',
          },
          {
            mistake: 'Confusing axis=0 with axis=1',
            fix: 'axis=k is the axis that DISAPPEARS. On (students, tests): axis=0 gives per-test stats; axis=1 gives per-student stats. Print the result shape until the habit sticks.',
          },
          {
            mistake: 'Forgetting keepdims and getting an awkward broadcast',
            fix: 'A (3,) statistic may broadcast somewhere you did not intend. keepdims=True yields (1, 3) — subtraction then clearly applies to every row, with no manual reshape.',
          },
          {
            mistake: 'Reporting "random" results with no seed',
            fix: 'Nothing can be reproduced, audited or debugged. Use rng = np.random.default_rng(seed) for every split, sample and initialisation you intend to discuss.',
          },
        ],
        exam: {
          question:
            'State the NumPy broadcasting rules, show why (2, 3) + (3,) works, why (2, 3) + (2,) fails, and give the fix for the failing case.',
          answer:
            'Rules: align shapes right-to-left; each dimension pair must be equal or contain a 1; the result takes the element-wise maximum shape. (2, 3) + (3,): the 3s match, and the missing leading dimension of the vector is treated as 1, which broadcasts against the 2 — conceptually (1, 3) stretched to (2, 3), so each row receives the vector. (2, 3) + (2,): aligning right gives 3 vs 2 — neither equal nor 1 — and there is nothing on the left of the vector to balance the remaining 2, so NumPy raises a broadcast error. Fix depends on intent: per-column application keeps the (3,) vector as-is; per-row application reshapes it to (2, 1), a column that broadcasts across the three columns.',
          source: 'The classic NumPy theory question — near-guaranteed in ML/data interviews and university practicals.',
        },
        summary: [
          'Broadcasting stretches 1-sized (or missing) dimensions — equal-or-1 is the whole rule; shapes align right-to-left.',
          'axis=k is the dimension that disappears: axis=0 reduces down rows, axis=1 across columns.',
          'keepdims=True shapes reduced statistics (1, n) so they broadcast back cleanly for standardisation.',
          '(data - mean) / std with axis=0 and keepdims is the standard column-standardisation of ML pipelines.',
          'Seed every generator you depend on: np.random.default_rng(seed) makes results reproducible.',
          'The (n,) vs (n, 1) shape trap explains most broadcast errors — print .shape before guessing.',
        ],
      }),
      [
        [
          'A (2, 3) array minus a (3,) array produces a result of shape:',
          ['(3, 2)', '(2, 3)', '(2,)', 'A broadcast error'],
          1,
          'The (3,) aligns with the last axis; its missing leading dimension acts as 1 and stretches across the rows.',
        ],
        [
          'For m with shape (students, tests), m.mean(axis=0) has shape:',
          ['(students,)', '(tests,)', '(1, 1)', '(students, tests)'],
          1,
          'axis=0 is the student axis, which disappears — one mean per test remains.',
        ],
        [
          'To make random results reproducible you should:',
          [
            'Call np.random() twice',
            'Seed a generator: rng = np.random.default_rng(seed)',
            'Sort the data before sampling',
            'Use Python\'s random module only',
          ],
          1,
          'A seeded default_rng yields the same sequence every run — the basis of reproducible splits and experiments.',
        ],
        [
          'Adding a (2,) vector to a (2, 3) matrix fails because:',
          [
            'Vectors can never be added to matrices',
            '3 and 2 are unequal and neither is 1, and the vector has no leading dimension to balance the row axis',
            'The matrix must be square first',
            'dtype mismatch always blocks broadcasting',
          ],
          1,
          'Right-aligned comparison hits 3 vs 2 immediately; reshaping the vector to (2, 1) supplies the missing flexibility.',
        ],
      ]
    ),
  ],
};
