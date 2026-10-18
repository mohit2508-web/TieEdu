// Module 6 — pandas: Tabular Data for AI
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, code } from '../nineBlocks';
import { lesson, M6, COURSE_ID } from './helpers';

export const module6: CourseModule = {
  id: M6,
  course_id: COURSE_ID,
  title: 'Module 6 — pandas: Tabular Data for AI',
  summary:
    'Series and DataFrame anatomy with indexes and dtypes, read_csv plus the inspection ritual, selection/filtering with loc and iloc, merge and groupby split-apply-combine, missing-data strategies, and tidy-data workflows.',
  sort_order: 6,
  lessons: [
    lesson(
      M6,
      'pyai-6-1',
      1,
      'Series & DataFrame: The Two Objects Everything Rests On',
      'What a Series and a DataFrame actually store, how the index works, the attributes you read on every table, and the column-selection idioms.',
      17,
      nineBlocks({
        objectives: [
          'Create Series and DataFrames from dictionaries and lists',
          'Explain the index as labels and read shape, dtypes, columns and index on any table',
          'Select a single column as a Series and a column subset as a DataFrame',
          'Describe how pandas columns rest on NumPy arrays under the hood',
        ],
        hook:
          'Every data job on Earth starts the same way: pd.read_csv(...), then df.head(). Two lines, one object — the DataFrame — and most people never learn what is actually inside it. Understanding the anatomy (labels, columns, dtypes, index) is the difference between using pandas and being used by its surprises.',
        concept: `**pandas in one sentence.** pandas (from "panel data", imported as \`import pandas as pd\`) is the Python library for labelled tables. Its two objects are all you need for the next five modules: the **Series** (one labelled column) and the **DataFrame** (a table of aligned Series).

**The Series: 1-D labels + values.** A Series is a NumPy array with an **index** attached — an array of labels, one per value:
\`\`\`
cities = pd.Series(
    ["Delhi", "Pune", "Kochi"],
    index=["c1", "c2", "c3"],
    name="city",
)
cities["c2"]    # "Pune" — label lookup, not position 2
\`\`\`
The default index is 0..n-1 (a RangeIndex), but any labels work: ids, dates, strings. Values carry one dtype (NumPy heritage); the index is itself a pandas object with its own dtype.

**The DataFrame: a table of aligned Series.** A DataFrame is a set of Series that **share one index** — rows line up by label, columns may each have their own dtype:
\`\`\`
df = pd.DataFrame({
    "name":  ["Asha", "Ravi", "Meera"],   # object (text)
    "marks": [85, 92, 78],                # int64
    "passed": [True, True, False],        # bool
})
\`\`\`
A dict of equal-length lists is the most common constructor; a list of row-dicts and a 2-D array plus columns= also work. Internally each column is typically one contiguous ndarray — which is why column-wise operations stay vectorised at C speed (Module 5 all the way down).

**The attributes you read on every table, every time:**
- \`df.shape\` — (rows, columns).
- \`df.columns\` — the column-label Index.
- \`df.index\` — the row-label Index.
- \`df.dtypes\` — one dtype per column.
- \`len(df)\` — row count; \`df.size\` — total cells.
- \`df.head(n)\` — first n rows (default 5) — the sanity glance.

**Column selection — two shapes, one meaning.** \`df["marks"]\` (or \`df.marks\`, with caveats) returns a **Series** — one column. \`df[["marks"]]\` — a list, even of one — returns a **DataFrame** — a table. Same data, different contract: a DataFrame keeps column names and dtypes for the next chained call. Row selection is label-based (\`df.loc\`) or position-based (\`df.iloc\`) — both arrive properly in Lesson 6.3.

**Adding columns.** \`df["pct"] = df["marks"] / 100\` assigns a whole Series aligned on the index — the vectorised NumPy expression becomes a new column. Assignment by label is how every feature in an ML pipeline is born.`,
        extras: [
          table(
            'The attribute cheat-sheet',
            ['Attribute', 'Returns', 'Typical first question it answers'],
            [
              ['df.shape', 'Tuple (rows, cols)', 'How big is this table?'],
              ['df.columns', 'Index of column labels', 'What variables exist?'],
              ['df.index', 'Index of row labels', 'What identifies a row?'],
              ['df.dtypes', 'Series: column → dtype', 'Which columns are numeric?'],
              ['df.head()', 'First 5 rows', 'Does the data look like the schema claims?'],
            ],
          ),
          code(
            'import pandas as pd\n\nseries = pd.Series([85, 92, 78], index=["s1", "s2", "s3"], name="marks")\nprint(series["s2"])          # 92 — label lookup\n\ndf = pd.DataFrame({\n    "name":  ["Asha", "Ravi", "Meera"],\n    "marks": [85, 92, 78],\n})\nprint(df.shape)             # (3, 2)\nprint(df.dtypes.tolist())   # [object, int64]\nprint(df["marks"])          # Series\nprint(df[["marks"]])        # one-column DataFrame',
            'anatomy.py',
            'python',
          ),
          warn(
            'df.marks has an expiration date',
            'Attribute access works only when the column name is a valid identifier and does not collide with a DataFrame method or property (like "size", "items", "T"). Quote the name: df["marks"]. Always.',
          ),
        ],
        worked: {
          title: 'Build a grade table from scratch and interrogate it',
          problem:
            'Create a DataFrame of three students (name, marks, passed) from a dictionary, report its shape and dtypes, extract the marks column two different ways, and add a new column pct = marks / 100.',
          steps: [
            {
              title: '1. Construct from a dict of lists',
              desc: 'Keys become column labels; every list must be the same length or pandas raises ValueError. The index defaults to 0..2.',
              code_snippet: 'import pandas as pd\n\ndf = pd.DataFrame({\n    "name":   ["Asha", "Ravi", "Meera"],\n    "marks":  [85, 92, 78],\n    "passed": [True, True, False],\n})\nprint(df.shape)   # (3, 3)',
            },
            {
              title: '2. Read the attributes',
              desc: 'shape, dtypes and index answer "how big, what types, what rows identify as" — three questions you ask of any table before anything else.',
              code_snippet: 'print(df.dtypes)\n# name       object\n# marks       int64\n# passed       bool\nprint(df.index)   # RangeIndex(start=0, stop=3, step=1)',
            },
            {
              title: '3. Select the same column twice',
              desc: "df['marks'] is a Series; df[['marks']] stays a DataFrame. Use the Series form for arithmetic, the DataFrame form when chaining table operations.",
              code_snippet: "print(type(df['marks']))       # <class 'pandas.core.series.Series'>\nprint(df[['marks']].shape)    # (3, 1)",
            },
            {
              title: '4. Derive a new column with vectorised maths',
              desc: 'One NumPy-style expression, one assignment — pandas aligns the result on the index for you. This is feature engineering in its smallest form.',
              code_snippet: "df['pct'] = df['marks'] / 100\nprint(df['pct'].tolist())   # [0.85, 0.92, 0.78]",
            },
          ],
          solution:
            'Built the 3×3 table from a dict, confirmed shape (3, 3) with object/int64/bool dtypes and a default RangeIndex, extracted marks both as Series and one-column DataFrame, and derived pct with a single vectorised division. Every column was treated as what it is: a labelled, typed, NumPy-backed array aligned on a shared index.',
        },
        practice: {
          title: 'Construct, index, derive',
          prompt:
            'Build a DataFrame from a list of row-dicts: [{"city": "Delhi", "revenue": 120}, {"city": "Pune", "revenue": 90}, {"city": "Kochi", "revenue": 75}]. (1) Report shape, columns and dtypes. (2) Use set_index("city") and then read the Delhi row with label access. (3) Add a column revenue_lakh = revenue / 100. (4) Make a one-column DataFrame of just revenue and prove with type() that it is not a Series.',
          hint: 'After set_index("city"), the city labels become the index — df.loc["Delhi", "revenue"] reaches the value.',
        },
        mistakes: [
          {
            mistake: 'df[0] assumed to be "the first row"',
            fix: 'Bracket access on a DataFrame looks up COLUMN labels. Rows are df.loc[label] or df.iloc[position] — Lesson 6.3 covers both properly.',
          },
          {
            mistake: 'Constructor lists of unequal length',
            fix: 'All dict-of-lists columns must have the same length, else ValueError. Check with [len(v) for v in data.values()] when building from variables.',
          },
          {
            mistake: 'Assuming every column is numeric because it looks numeric',
            fix: 'Read df.dtypes once. A "number" column loaded as object is text hiding in plain sight — read_csv guesses wrong when values carry symbols or spaces.',
          },
          {
            mistake: 'Mutating a column slice and wondering why nothing changed',
            fix: 'Some selections are copies; assignment through chained brackets may not stick (and pandas may warn). Prefer .loc for assignment — Lesson 6.3.',
          },
        ],
        exam: {
          question:
            'Describe the relationship between a DataFrame, its columns and NumPy arrays. Why can pandas load a million-row CSV quickly and compute a column mean at near-C speed?',
          answer:
            'A DataFrame is a collection of Series that share one row index. Each Series wraps one-dimensional labelled data whose values are, in the common case, a single contiguous NumPy ndarray of one dtype — so a DataFrame is heterogeneous across columns but homogeneous within each. That design lets pandas load a CSV by allocating one typed column buffer per column (no per-cell Python objects) and lets column operations like df["marks"].mean() dispatch straight into NumPy\'s compiled reduction kernels. Python orchestrates the table logic (labels, alignment, joins); C computes the numbers — the same division of labour that made NumPy fast, now applied column-wise.',
          source: 'The standard "what is a DataFrame under the hood" question in data-analyst interviews.',
        },
        summary: [
          'Series = index labels + one dtype of values; DataFrame = aligned Series sharing a row index.',
          'Build DataFrames from dicts of equal-length lists; the default index is 0..n-1.',
          'Read shape, columns, index, dtypes and head() on every table before touching it.',
          'df["col"] returns a Series; df[["col"]] returns a one-column DataFrame.',
          'New columns come from vectorised assignment: df["pct"] = df["marks"] / 100.',
          'Quote column names in brackets — df.marks breaks on method-name collisions.',
        ],
      }),
      [
        [
          'A DataFrame is best described as:',
          [
            'A NumPy matrix with no index',
            'A collection of Series aligned on a shared row index',
            'A Python dictionary of scalars',
            'A list of lists with headers',
          ],
          1,
          'Columns are Series; they line up on one shared index — that alignment is the DataFrame contract.',
        ],
        [
          "df['marks'] and df[['marks']] differ in that:",
          [
            'They are identical',
            'The first returns a Series, the second a one-column DataFrame',
            'The first is a copy, the second a view',
            'The first errors when marks is not the first column',
          ],
          1,
          'A bare column label selects a Series; a list of labels always stays a DataFrame.',
        ],
        [
          'The default row index of a freshly built DataFrame is:',
          ['Labels 1..n', 'A RangeIndex 0..n-1', 'The first column values', 'None — always require an index'],
          1,
          'pandas supplies RangeIndex(start=0, stop=n, step=1) unless you pass or set another index.',
        ],
        [
          "Why does df.marks risk breaking where df['marks'] does not?",
          [
            'Attribute access is slower',
            'Column names colliding with methods/properties or non-identifier names break attribute access',
            'Attribute access returns a copy',
            'It never breaks — they are equivalent',
          ],
          1,
            'Names like size, items or T (and anything with spaces) make attribute access lie or fail — brackets are the safe contract.',
        ],
      ]
    ),
    lesson(
      M6,
      'pyai-6-2',
      2,
      'read_csv & the Inspection Ritual',
      'Loading CSVs correctly and the six-readout inspection (head, shape, dtypes, info, describe, missing counts) that finds dirty data before it finds you.',
      18,
      nineBlocks({
        objectives: [
          'Load a CSV from a path or URL with pd.read_csv and its key parameters',
          'Run head, shape, dtypes, info, describe and value_counts and interpret each output',
          'Count missing values per column with isna().sum()',
          'Spot a numeric column stored as text and plan its repair',
        ],
        hook:
          'A model trained on data nobody inspected is a confident machine for producing garbage. Ninety percent of real data work is the inspection you do in the first ten minutes after loading — and this lesson turns that ten minutes into a ritual you never skip.',
        concept: `**pd.read_csv — the front door.** The simplest call loads a comma-separated file (or URL) into a DataFrame, guessing dtypes from the first rows:
\`\`\`
df = pd.read_csv("sales.csv")
df = pd.read_csv("https://example.com/data.csv", nrows=1000)  # preview big files
\`\`\`
Parameters you will actually use: \`sep\` for other delimiters (a tab-separated file needs the two-character string backslash-t), \`usecols\` to load a subset, \`parse_dates=["date"]\` to build real datetimes, \`na_values=["NA", "-", ""]\` to teach pandas what "missing" looks like in this file, and \`nrows\` to preview a file too big for RAM. read_csv infers types by sampling values — an inference, not a guarantee. That is why the next step is never analysis. It is inspection.

**The inspection ritual — six readouts, in order:**
1. \`df.head()\` — does the data match the schema? Wrong header rows, shifted columns and mojibake show up here.
2. \`df.shape\` — (rows, columns). Remember this number; filters and drops must be reconciled against it.
3. \`df.dtypes\` — one type per column. "Looks numeric, stored as object" lives here.
4. \`df.info()\` — dtypes plus non-null counts plus memory. Count < rows means missing values, and it prints them per column in one screen.
5. \`df.describe()\` — count/mean/std/min/25%/50%/75%/max for numeric columns. The 50% row is the median; count below shape[0] is the missing-value signal again.
6. \`df["col"].value_counts()\` — for any category-like column: which levels exist, how rare is the rare one.

**Reading the red flags.** An object-dtype column of "prices" means pandas met a non-numeric character (₹, commas, stray spaces) and kept everything as text — \`pd.to_numeric(df["price"], errors="coerce")\` converts, turning the junk into NaN you can count and fix consciously (Lesson 8.3 makes this a pipeline step). A float column where you expected ints usually means NaNs (float is the only numeric type that holds NaN). Duplicate-looking categories ("delhi" vs "Delhi ") reveal themselves in value_counts. The ritual does not fix anything — it tells you what to fix, in order of damage.`,
        extras: [
          table(
            'The inspection menu',
            ['Readout', 'Answers', 'Red flag it catches'],
            [
              ['df.head()', 'Does it look like the schema?', 'Shifted headers, mojibake, wrong separator'],
              ['df.shape', 'How many rows x columns?', 'Rows lost or gained during load'],
              ['df.dtypes', 'What type is each column?', 'Numbers stored as object/text'],
              ['df.info()', ' Non-null count per column?', 'Missing values, memory bloat'],
              ['df.describe()', ' Numeric distribution summary?', 'Absurd min/max, count < n'],
              ['value_counts()', ' Category frequencies?', 'Rare levels, case-variant duplicates'],
            ],
          ),
          code(
            'from io import StringIO\nimport pandas as pd\n\ncsv_text = "city,revenue\\nDelhi,120\\nPune,90\\nKochi,\\nDelhi,130\\n"\ndf = pd.read_csv(StringIO(csv_text))\n\nprint(df.head())\nprint(df.shape)              # (4, 2)\nprint(df.info())              # revenue: 3 non-null -> 1 missing\nprint(df.describe())\nprint(df.isna().sum())        # city 0, revenue 1',
            'inspect.py',
            'python',
          ),
          warn(
            'Naive dtype guessing is how bad data reaches models',
            'read_csv reads a sample of values to pick dtypes. One dirty cell can flip a whole column to text — or a column of codes like 007, 012 can lose leading zeros to int64. Keep na_values, dtype and parse_dates in your mental toolkit; verify with dtypes after every load.',
          ),
        ],
        worked: {
          title: 'Load a small sales CSV and run the full ritual',
          problem:
            'Given an inline CSV of city sales with one missing revenue and a revenue column that will stay numeric here, load it with read_csv, run all six inspection readouts, and list every problem found before any analysis.',
          steps: [
            {
              title: '1. Load through a StringIO buffer',
              desc: 'io.StringIO lets the exact same read_csv code run on a string, a file path or a URL — practise the ritual without needing a disk file.',
              code_snippet: 'from io import StringIO\nimport pandas as pd\n\ncsv_text = ("city,revenue,orders\\n"\n            "Delhi,120,4\\nPune,90,3\\nKochi,,2\\nDelhi,130,5\\nMumbai,110,4\\n")\ndf = pd.read_csv(StringIO(csv_text))',
            },
            {
              title: '2. head + shape: structure first',
              desc: 'Five columns-worth of expectations checked against reality: headers landed correctly and shape tells us 5 rows survived the load.',
              code_snippet: 'print(df.head())\nprint(df.shape)   # (5, 3)',
            },
            {
              title: '3. dtypes + info: types and holes',
              desc: 'info() prints non-null counts — revenue shows 4 non-null out of 5 rows, so exactly one missing value exists. dtypes confirms revenue is float64 (NaN forced the promotion).',
              code_snippet: 'print(df.dtypes)\nprint(df.info())\n# revenue  4 non-null  float64',
            },
            {
              title: '4. describe + missing counts: quantify',
              desc: 'describe() summarises the numeric columns; isna().sum() pins the damage per column — revenue: 1, everything else: 0. Now you know precisely what to repair first.',
              code_snippet: 'print(df.describe())\nprint(df.isna().sum())\n# city       0\n# revenue    1\n# orders     0',
            },
          ],
          solution:
            'Loaded via StringIO, confirmed shape (5, 3), found revenue stored as float64 with 4 of 5 values present — one missing cell — and every other column clean. The six-readout ritual converted "a CSV" into a precise defect list: one NaN in revenue, nothing else. Fixing (median fill or row drop, with a reported count) is Lesson 6.4; finding it was the point of this one.',
        },
        practice: {
          title: 'Ritual on purpose-built dirt',
          prompt:
            'Create this CSV string and read it: "id,age,salary\\n1,25,40000\\n2,,45000\\n3,35,\\n4,29,50000\\n5,41,60000". Run the full ritual. Report: shape; dtypes; the non-null count of each numeric column; the value of describe()["age"]["50%"]; and which column you would coerce with pd.to_numeric(errors="coerce") if the salary had carried a rupee symbol — then actually add one dirty row ("6,30,₹55000") and prove the salary dtype flips to object.',
          hint: 'A single non-numeric cell in a column makes the whole column object — value_counts() will show the culprit row.',
        },
        mistakes: [
          {
            mistake: 'Loading a huge CSV in full to "just look at it"',
            fix: 'Use nrows=1000 for the first look, confirm the schema, then decide whether the full load belongs in memory or should move to chunked reading.',
          },
          {
            mistake: 'Treating describe() as a full data audit',
            fix: 'describe() covers numeric columns only and hides missing-value semantics beyond count. Pair it with info() and isna().sum() — different readouts, different blind spots.',
          },
          {
            mistake: 'Forgetting that count in describe() is the non-null count',
            fix: 'count < shape[0] is your missing-data alarm. A quiet column with count equal to rows and another with count far below look identical in a headline chart.',
          },
          {
            mistake: 'No checking of the index after odd loads',
            fix: 'read_csv uses the first column as header and 0..n-1 as index by default. Files with preamble rows or index columns need index_col= or skiprows= — head() exposes them.',
          },
        ],
        exam: {
          question:
            'You load a CSV of employee data. Outline the inspection ritual, naming each readout and the specific defect class it is designed to reveal.',
          answer:
            'In order: (1) head() — schema sanity: headers in the right place, no shifted columns, no encoding garbage. (2) shape — the row/column count you will reconcile every later drop against. (3) dtypes — type errors, especially numeric-looking columns stored as object because of symbols or spaces. (4) info() — non-null counts per column, the fastest missing-value census, plus memory usage. (5) describe() — numeric distributions: impossible min/max values, median (50%) versus mean (skew hint), count below the row total. (6) value_counts() on category-like columns — rare levels, case and whitespace duplicates, unintended classes. Only after the ritual do you plan repairs, because every repair (coerce, fill, drop) is chosen in response to what these six readouts exposed.',
          source: 'The "walk me through your first 10 minutes with a new dataset" question in every data-analyst interview.',
        },
        summary: [
          'pd.read_csv loads path or URL and GUESSES dtypes — verification is mandatory.',
          'Key load parameters: sep, usecols, parse_dates, na_values, nrows.',
          'Ritual: head → shape → dtypes → info → describe → value_counts.',
          'info() non-null counts and describe() count below n both signal missing values.',
          'An object-dtype numeric column is text corruption — repair with to_numeric(errors="coerce") and count the coercions.',
          'Inspection produces a defect list; it never silently fixes anything.',
        ],
      }),
      [
        [
          "After pd.read_csv('sales.csv'), the safest first call is:",
          ['df.plot()', 'df.head()', 'df.dropna()', 'df.groupby(df.columns[0]).mean()'],
          1,
          'head() answers the cheapest, highest-value question: does the loaded data match the schema you expected?',
        ],
        [
          'df.info() is uniquely useful because it shows:',
          [
            'Only the numeric summary',
            'Per-column dtypes and non-null counts in one screen',
            'The correlation matrix',
            'The file size on disk',
          ],
          1,
          'Non-null counts against total rows expose missing values per column instantly, alongside types and memory.',
        ],
        [
          'A column of prices like "1200", "1,300", "₹900" loads with dtype:',
          ['int64', 'float64', 'object', 'datetime64'],
          2,
          'One non-numeric character forces the entire column to text — the classic object-dtype red flag.',
        ],
        [
          'In df.describe(), the 50% row of a numeric column is:',
          ['The 50th percentile of ranks', 'The mean', 'The mode', 'Half the maximum'],
          0,
          "describe() reports quantiles; the 50% quantile is the median — compare it to mean for a skew hint.",
        ],
      ]
    ),
    lesson(
      M6,
      'pyai-6-3',
      3,
      'Select, Filter, loc & iloc',
      'Column subsets, boolean-mask filtering, label-based loc versus position-based iloc, safe assignment, and readable method chains.',
      18,
      nineBlocks({
        objectives: [
          'Select single and multiple columns and filter rows with boolean masks',
          'Use loc (labels, inclusive) and iloc (positions, half-open) to reach any cell',
          'Assign new values safely through .loc instead of chained indexing',
          'Chain query/sort/head operations into one readable expression',
        ],
        hook:
          'df.loc[3, "marks"] and df.iloc[3, 2] return the same number today — and different numbers the moment someone sorts the table. One means "label 3", the other means "position 3". Knowing which contract you signed is the difference between an analysis and an anecdote.',
        concept: `**Two axes, two addressing schemes.** A DataFrame is rows × columns; selection picks from both. Columns first: \`df["marks"]\`, \`df[["name", "marks"]]\`. Rows come in three flavours:

**1. Boolean masks — filter by question.** The Module 5 skill, now with labels:
\`\`\`
df[df["marks"] >= 80]
df[(df["marks"] >= 60) & (df["city"] == "Delhi")]   # parentheses mandatory
\`\`\`
The mask must be the same length as the frame; the result keeps matching rows (a copy in the common case).

**2. loc — label-based, inclusive.** \`df.loc[rows, cols]\` where each side is a label, list of labels, slice of labels or mask. Label slices include BOTH ends (unlike NumPy):
\`\`\`
df.loc[1:3, "name":"marks"]     # rows labelled 1..3 inclusive, columns name..marks
df.loc[df["marks"] > 80, ["name", "marks"]]
\`\`\`
**3. iloc — position-based, half-open.** Integers only, NumPy rules: \`df.iloc[0]\` first row, \`df.iloc[0:2, 0:2]\` a 2×2 block, \`df.iloc[[0, 2]]\` rows zero and two. The mental model: **loc speaks the index, iloc speaks the ruler.**

**Assignment that sticks.** The safe form writes through .loc in one statement:
\`\`\`
df["grade"] = "C"                                     # new column, every row
df.loc[df["marks"] >= 90, "grade"] = "A"             # conditional fill
\`\`\`
The chained form \`df[df["marks"] > 80]["grade"] = "A"\` operates on a temporary selection — pandas may refuse to write back (SettingWithCopyWarning) and the change silently fails. One .loc statement, both axes specified, no warning.

**Chains and query.** Readable pipelines put filters next to their data:
\`\`\`
top = (df[df["marks"] >= 60]
         .sort_values("marks", ascending=False)
         .head(3))
df.query("marks >= 60 and city == 'Delhi'")
\`\`\`
query() moves conditions into a string — convenient for many conditions; remember its world is expressions, so column names with spaces need backticks and Python variables use @name.`,
        extras: [
          table(
            'loc vs iloc — the contract table',
            ['Property', 'loc', 'iloc'],
            [
              ['Indexes with', 'Labels from the index/columns', 'Integer positions 0..n-1'],
              ['Slice ends', 'Inclusive of the stop label', 'Half-open (stop excluded)'],
              ['Accepts masks', 'Yes — df.loc[df.x > 0]', 'No — use positions or .loc'],
              ['Reach for it when', 'Index carries meaning (ids, dates)', 'You mean "row 5", whatever its label'],
            ],
          ),
          warn(
            'Chained assignment is the silent no-op',
            'df[mask]["col"] = value may do nothing at all with only a warning. Always assign through a single .loc[row_mask, "col"] = value statement — both axes in one shot.',
          ),
          tip(
            'Sort-proof your code with loc',
            'If an analysis must survive someone re-sorting or re-indexing the source table, address by label (loc) or by condition — never by "row 7". Position is a snapshot; labels and questions are contracts.',
          ),
        ],
        worked: {
          title: 'Query a grade table four ways and assign safely',
          problem:
            'grades DataFrame: students indexed s1..s4 with marks [85, 92, 78, 61] and city [Delhi, Pune, Delhi, Kochi]. Report (a) every pass mark (>= 60) with name and marks; (b) s2\'s marks; (c) the third row by position; then (d) add a grade column: "A" for marks >= 90, else "B" — without chained assignment.',
          steps: [
            {
              title: '1. Mask filter with a column subset',
              desc: 'The question "who passed" becomes a mask; .loc with a column list returns a tidy two-column result.',
              code_snippet: 'import pandas as pd\n\ngrades = pd.DataFrame(\n    {"marks": [85, 92, 78, 61],\n     "city": ["Delhi", "Pune", "Delhi", "Kochi"]},\n    index=["s1", "s2", "s3", "s4"],\n)\nprint(grades.loc[grades["marks"] >= 60, ["marks"]])',
            },
            {
              title: '2. Label vs position, side by side',
              desc: "loc['s2'] is the label s2; iloc[2] is the third row regardless of labels — here s3, marks 78. Same table, two contracts.",
              code_snippet: 'print(grades.loc["s2", "marks"])   # 92 (label s2)\nprint(grades.iloc[2]["marks"])    # 78 (position 2 = s3)',
            },
            {
              title: '3. Seed the column, then fill by mask',
              desc: 'Give every row a default with plain assignment, then upgrade the high scorers through .loc[row_mask, "col"] — the write-back that reliably sticks.',
              code_snippet: 'grades["grade"] = "B"\ngrades.loc[grades["marks"] >= 90, "grade"] = "A"\nprint(grades["grade"].tolist())   # ["B", "A", "B", "B"]',
            },
            {
              title: '4. Chain for readability',
              desc: 'One parenthesised expression: filter, order, take three. Chains keep the logic in the order you think it — provided every step returns a frame.',
              code_snippet: 'top3 = (grades.reset_index()\n          .sort_values("marks", ascending=False)\n          .head(3))\nprint(top3[["index", "marks"]].to_string(index=False))',
            },
          ],
          solution:
            'Mask-plus-loc produced the passing subset; loc by label and iloc by position returned different rows on purpose (92 vs 78), demonstrating the two contracts; the grade column was seeded with "B" then upgraded to "A" for s2 through a single .loc write; and a three-step chain delivered the top three rows. Every access said explicitly whether it meant labels or positions.',
        },
        practice: {
          title: 'Address everything, twice',
          prompt:
            'With sales = pd.DataFrame({"city": ["Delhi", "Pune", "Delhi", "Kochi", "Pune"], "revenue": [120, 90, 130, 75, 95]}, index=[10, 11, 12, 13, 14]): (1) iloc the first two rows and both columns; (2) loc the rows labelled 12 and 14; (3) Delhi revenues only, via mask; (4) label-slice 11:13 and explain why 14 is not included; (5) add bonus = revenue * 0.1, then set revenue >= 120 rows bonus to 0.2 of revenue via .loc; (6) chain: cities with revenue over 90, sorted descending, top 2.',
          hint: 'loc label slices are inclusive of both ends — 11:13 gives labels 11, 12, 13.',
        },
        mistakes: [
          {
            mistake: 'Expecting loc slices to stop before the end label',
            fix: 'loc slices INCLUDE the stop label (11:13 → 11, 12, 13). iloc keeps NumPy\'s half-open rule. Mixing the two conventions is the classic off-by-one in pandas.',
          },
          {
            mistake: 'df[mask]["col"] = value — the chained write',
            fix: 'Write df.loc[mask, "col"] = value. One statement, both axes, and pandas can return the SettingWithCopyWarning telling you the chained form may have done nothing.',
          },
          {
            mistake: 'Passing a boolean mask to iloc',
            fix: 'iloc speaks positions, not questions. Translate the mask with .loc[mask] or with mask.to_numpy().nonzero()[0] positions when you truly need iloc.',
          },
          {
            mistake: 'Forgetting parentheses around combined conditions',
            fix: 'df[df.revenue > 90 & df.city == "Pune"] parses wrongly because & binds tighter. Wrap each comparison: (df.revenue > 90) & (df.city == "Pune").',
          },
        ],
        exam: {
          question:
            'Contrast df.loc and df.iloc on indexing basis, slice semantics and mask support. When would you deliberately choose iloc even though loc exists?',
          answer:
            "loc indexes by LABEL — it reads the frame's index and column names, its slices include both endpoints, and it accepts boolean masks for row/column selection. iloc indexes by integer POSITION — 0..n-1, half-open NumPy slice semantics, no mask support (positions only). You choose iloc deliberately when the operation is genuinely positional: taking the first k rows after a sort (the head rows' labels are arbitrary), slicing a block by machine offset, or indexing into frames whose labels are not meaningful (default RangeIndex after reset_index). You choose loc when labels carry meaning — dates, ids — or when the selection is a condition, because a condition survives re-sorting while a position does not.",
          source: 'Near-guaranteed pandas interview question; the inclusive-vs-half-open slice detail separates the prepared from the rest.',
        },
        summary: [
          'Columns: df["col"] / df[["a","b"]]. Rows: masks, loc (labels, inclusive), iloc (positions, half-open).',
          'loc speaks the index; iloc speaks the ruler — same table, different contracts.',
          'Mask filters: df[df["marks"] >= 60]; combine conditions with parenthesised & and |.',
          'Assign with df.loc[mask, "col"] = value — chained assignment silently no-ops.',
          'query() moves conditions into a string; chains keep filter→sort→select readable.',
          'Prefer label/condition addressing in code that must survive re-sorted data.',
        ],
      }),
      [
        [
          'df.loc[2:4, :] selects rows that are:',
          [
            'Positions 2 and 3 only',
            'Rows labelled 2, 3 and 4 — label slices include the stop',
            'All rows',
            'An error — loc forbids slices',
          ],
          1,
          'loc works in label space and both ends of a label slice are included.',
        ],
        [
          'To assign grade "A" to every row with marks >= 90, the form that reliably writes back is:',
          [
            'df[df.marks >= 90]["grade"] = "A"',
            'df.loc[df["marks"] >= 90, "grade"] = "A"',
            'df["grade"][df.marks >= 90] = "A"',
            'df.iloc[df.marks >= 90, "grade"] = "A"',
          ],
          1,
          'A single .loc statement names both axes and returns a writable object — the chained forms may no-op.',
        ],
        [
          "df.iloc[0] on a frame indexed by city names returns:",
          [
            'The row labelled city 0',
            'The first row by position, whatever its label',
            'The first column',
            'An error — iloc needs two indices',
          ],
          1,
          'iloc counts positions 0..n-1 from the top, ignoring the label values entirely.',
        ],
        [
          'The expression df[(df.revenue > 90) & (df.city == "Pune")] needs parentheses because:',
          [
            'pandas requires them syntactically',
            '& binds tighter than comparison operators, so unbracketed conditions parse wrongly',
            'They improve performance',
            'They prevent SettingWithCopyWarning',
          ],
          1,
          'Without parentheses, > and & mix precedence into nonsense — the same trap as NumPy masks in Module 5.',
        ],
      ]
    ),
    lesson(
      M6,
      'pyai-6-4',
      4,
      'merge, groupby, Missing Data & Tidy Workflows',
      'Joining tables, the split-apply-combine pattern, honest missing-value strategies, and the tidy-data shape that makes every later step easier.',
      19,
      nineBlocks({
        objectives: [
          'Join two tables with pd.merge and choose how= deliberately',
          'Aggregate with groupby using sum/mean and multi-function agg',
          'Detect missing values and choose dropna versus a justified fillna',
          'Reshape wide data to tidy long form with melt',
        ],
        hook:
          'The question is "which city earns the most?" — and the answers live half in an orders table and half in a customers table. merge to connect, groupby to summarise, fillna to stop one blank cell from erasing a whole row. Three calls, one sentence of insight: this is where pandas stops being a spreadsheet and starts being analysis.',
        concept: `**merge — tables that belong together.** \`pd.merge(left, right, on="city", how="inner")\` matches rows by key. The \`how\` argument is the relationship decision:
- \`"inner"\` — only keys present in both.
- \`"left"\` — every left row; right side filled with NaN where no match.
- \`"right"\` / \`"outer"\` — right rows only / all keys from both.
Two traps: keys repeating on BOTH sides multiply rows (a 3×2 key match yields 6 rows — always compare shape before and after); and unmatched left rows arrive with NaNs in every right column, which is silent information loss unless you count them. The habit \`validate="many_to_one"\` makes pandas check the relationship and raise instead of multiplying.

**groupby — split, apply, combine.** \`df.groupby("city")["revenue"].sum()\` splits rows into per-city groups, applies the sum per group, combines into one Series indexed by city. Multiple aggregates at once name the outputs:
\`\`\`
df.groupby("city").agg(
    total=("revenue", "sum"),
    orders=("revenue", "count"),
    avg=("revenue", "mean"),
)
\`\`\`
This one pattern — group by a question's category, apply numeric summaries, get a tidy result — produces most of the numbers in every business report you will ever read.

**Missing data — three honest moves.** First count: \`df.isna().sum()\`. Then choose, and say which you chose: \`dropna()\` (loses rows — report how many), a constant/median/mode \`fillna\` (state the value and why), or keep NaN for pandas to skip in aggregations (sum and mean ignore NaN by default — convenient, but the denominator changed, so say so). Filling the median of a column is defensible for a quick numeric repair; doing it BEFORE splitting train/test leaks future information (Module 9 returns to close that door properly).

**Tidy data.** The shape every tool expects: **one variable per column, one observation per row, one table per observational unit.** Wide data (\`month\`s as columns: Jan, Feb, Mar) violates it — each month is an observation of a revenue variable. \`pd.melt(df, id_vars=["city"], var_name="month", value_name="revenue")\` turns wide into tidy long form: three rows per city instead of three columns. Tidy frames group, merge and plot without contortions; untidy frames spend their life being reshaped.`,
        extras: [
          table(
            'merge how= at a glance',
            ['how', 'Keeps', 'NaN appears when'],
            [
              ['inner', 'Keys present in both tables', 'Never — unmatched rows are dropped'],
              ['left', 'Every left-table row', 'Right columns for unmatched keys'],
              ['right', 'Every right-table row', 'Left columns for unmatched keys'],
              ['outer', 'Every key from either table', 'Either side unmatched'],
            ],
          ),
          code(
            'import pandas as pd\n\norders = pd.DataFrame({\n    "city":  ["Delhi", "Delhi", "Pune", "Kochi"],\n    "revenue": [120, 130, 90, 75],\n})\ncustomers = pd.DataFrame({\n    "city": ["Delhi", "Pune", "Chennai"],\n    "manager": ["Asha", "Ravi", "Meera"],\n})\n\njoined = pd.merge(orders, customers, on="city", how="left", validate="many_to_one")\nprint(joined)\nprint(joined.groupby("city")["revenue"].sum())',
            'merge-group.py',
            'python',
          ),
          warn(
            'Row explosion after merge is always a key problem',
            'If merge triples your rows, the key repeats on both sides. Check nunique on each key, pick the true grain, or aggregate one side first — never "fix" it with drop_duplicates and hope.',
          ),
        ],
        worked: {
          title: 'From two messy tables to one tidy summary',
          problem:
            'orders (city, revenue) contains one missing revenue; a wide monthly frame holds Jan/Feb/Mar revenue per city. (1) Fill the missing revenue with the column median and report what you filled. (2) Summarise total revenue per city with groupby. (3) Melt the wide monthly frame to tidy long form.',
          steps: [
            {
              title: '1. Count holes, then fill with a reported value',
              desc: 'isna().sum() proves one missing cell; the median fill is one line — and the fill value is stated, not hidden.',
              code_snippet: 'import pandas as pd\n\norders = pd.DataFrame({\n    "city": ["Delhi", "Delhi", "Pune", "Kochi", "Pune"],\n    "revenue": [120.0, 130.0, 90.0, None, 95.0],\n})\nprint(orders.isna().sum())          # revenue 1\nmedian_rev = orders["revenue"].median()   # 95.0\norders["revenue"] = orders["revenue"].fillna(median_rev)',
            },
            {
              title: '2. Split-apply-combine per city',
              desc: 'groupby("city") splits five rows into three groups; sum() applies per group; combine gives one row per city — the report table.',
              code_snippet: 'summary = orders.groupby("city").agg(\n    total=("revenue", "sum"),\n    orders=("revenue", "count"),\n)\nprint(summary)',
            },
            {
              title: '3. Melt wide months into tidy rows',
              desc: 'id_vars stay as columns; month columns become values of a new month column; the numbers land in revenue. One observation per row from here on.',
              code_snippet: 'monthly = pd.DataFrame({\n    "city": ["Delhi", "Pune"],\n    "Jan": [120, 90],\n    "Feb": [130, 95],\n})\ntidy = pd.melt(monthly, id_vars=["city"],\n               var_name="month", value_name="revenue")\nprint(tidy.shape)   # (4, 3) — two cities x two months',
            },
          ],
          solution:
            'The single hole was found (isna), filled with the stated median 95.0, and the per-city agg table (total, count) came from one split-apply-combine. The wide month columns melted into a tidy (city, month, revenue) frame with 4 rows — the shape groupby, merge and seaborn all expect. Every number is traceable to a declared operation.',
        },
        practice: {
          title: 'Join, summarise, reshape, defend',
          prompt:
            'students: id, city, marks (with marks missing in one row); cities: city, region. (1) Left-merge cities onto students and count how many rows gained a region; (2) inner-merge and explain which students disappeared and why; (3) groupby region: mean marks with named agg, using skipna defaults — then state what the missing mark did to the mean; (4) fill the missing mark with the city-group median via transform (df["marks"].fillna(df.groupby("city")["marks"].transform("median"))) and re-run the agg; (5) build a 3-column wide frame and melt it.',
          hint: 'transform returns one value per original row — that is what makes group-aware filling align correctly.',
        },
        mistakes: [
          {
            mistake: 'merge that multiplies rows, then deduplicating blindly',
            fix: 'Diagnose with nunique on the key in both tables; aggregate the many side to the correct grain first, or validate="many_to_one". drop_duplicates hides the grain error instead of fixing it.',
          },
          {
            mistake: 'dropna() without counting what was dropped',
            fix: 'Always report rows before and after. Silent row loss invalidates every percentage downstream — "we analysed 84% of the data" must be a stated fact, not a surprise.',
          },
          {
            mistake: 'Filling with statistics computed from data you should not see yet',
            fix: 'A median fill computed on the full table leaks test-set information into training (Module 9.4). Compute fill values on the training split only — the pipeline version arrives in Module 8.3.',
          },
          {
            mistake: 'Concatenating misaligned frames instead of merging on keys',
            fix: 'pd.concat stacks by position or index labels; it does not match semantics. When rows correspond by an id, merge on that id or align explicitly.',
          },
        ],
        exam: {
          question:
            'Explain the split-apply-combine pattern with a concrete groupby example, and state the three tidy-data rules.',
          answer:
            'split: groupby("city") partitions the rows into one group per city value; apply: an aggregation such as sum() (or a named .agg with several functions) computes one or more statistics within each group; combine: pandas reassembles the per-group results into one Series/DataFrame indexed by the group keys — e.g. total revenue per city in one row each. The tidy-data rules: (1) each variable is a column (not a month encoded as three column names); (2) each observation is a row; (3) each type of observational unit gets its own table. Tidy frames feed groupby, merge and plotting directly; wide frames require melt (or pivot) before any of those tools behave.',
          source: 'The classic "explain groupby" + "what is tidy data" pair, common in DS university papers and analyst interviews.',
        },
        summary: [
          'merge(on, how) joins by key: inner/left/right/outer — check shape for row explosion.',
          'groupby = split-apply-combine; .agg(name=(col, "func")) builds named summary tables.',
          'Missing data: count with isna().sum(), then drop (report losses), fill (state the value), or let NaN skip (state the changed denominator).',
          'Never compute fill statistics on data you should not see yet — train-only fills come in M8/M9.',
          'Tidy data: one variable per column, one observation per row, one table per unit.',
          'pd.melt(id_vars=..., var_name=..., value_name=...) converts wide to tidy long form.',
        ],
      }),
      [
        [
          'pd.merge(a, b, on="city", how="left") keeps:',
          [
            'Only cities in both tables',
            'Every row of a; unmatched b columns become NaN',
            'Every row of b',
            'The cartesian product',
          ],
          1,
          "Left join preserves the left frame's rows and pads unmatched keys with NaN from the right.",
        ],
        [
          'df.groupby("city")["revenue"].sum() implements which pattern?',
          ['Sort-apply-filter', 'Split-apply-combine', 'Merge-aggregate-pivot', 'Map-reduce-join'],
          1,
          'Rows split by city key, sum applied per group, results combined into one Series indexed by city.',
        ],
        [
          'df.isna().sum() reports:',
          [
            'Total rows with any NaN',
            'Missing-value count per column',
            'The percentage of missing data',
            'The positions of NaN cells',
          ],
          1,
          'One count per column — the fastest way to size the damage before choosing dropna or fillna.',
        ],
        [
          'Wide monthly columns (Jan, Feb, Mar) become tidy long form with:',
          ['pd.concat', 'pd.melt', 'pd.merge', 'df.T'],
          1,
          'melt unpivots the month columns into (month, revenue) rows while id_vars stay as columns.',
        ],
      ]
    ),
  ],
};
