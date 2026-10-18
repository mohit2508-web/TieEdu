// Python for AI — a Bucket B foundation course (15h, foundation tier).
//
// Ten modules, forty lessons, one shipped notebook: the complete path from
// "what is a variable" to an end-to-end scikit-learn pipeline a learner can
// defend in an interview. Part I (modules 1–5) builds Python + NumPy; Part II
// (modules 6–10) adds pandas, honest visualization, real file/API workflows,
// core statistics and the first supervised models.
import type { Course, CourseModule, ExamQuestion } from '../db';
import { module1 } from './module1';
import { module2 } from './module2';
import { module3 } from './module3';
import { module4 } from './module4';
import { module5 } from './module5';
import { module6 } from './module6';
import { module7 } from './module7';
import { module8 } from './module8';
import { module9 } from './module9';
import { module10 } from './module10';

const modules: CourseModule[] = [
  module1,
  module2,
  module3,
  module4,
  module5,
  module6,
  module7,
  module8,
  module9,
  module10,
];

// A 30-question bank, 3 per module, tagged by topic so the exam engine can
// draw a balanced paper per attempt. Mix: 12 easy / 12 medium / 6 hard.
// Answer keys never leave the server pre-submission — sanitizeExamQuestions
// strips them on the public payload.
const examBank: ExamQuestion[] = [
  // Foundations (Module 1)
  {
    id: 'pyai-bank-01',
    prompt: 'Which environment keeps variables alive between executed cells until the kernel is restarted?',
    options: [
      'A .py script run once with python script.py',
      'A Jupyter / Colab notebook session',
      'A single python -c one-liner',
      'A text editor with Python syntax highlighting',
    ],
    correct_index: 1,
    explanation:
      'Notebook cells share one live kernel: every executed cell sees the same namespace. A script starts fresh on each run.',
    difficulty: 'easy',
    topic: 'basics',
  },
  {
    id: 'pyai-bank-02',
    prompt: 'After x = 5 followed by x = "hi", what is true?',
    options: [
      'x holds both values at once',
      'The integer 5 was converted into a string',
      'The name x now points at a str object; the 5 may be garbage-collected',
      'A TypeError is raised because names are typed',
    ],
    correct_index: 2,
    explanation:
      'Names are labels bound to objects. Rebinding x points it at a new str object; the integer is untouched and unreferenced.',
    difficulty: 'easy',
    topic: 'basics',
  },
  {
    id: 'pyai-bank-03',
    prompt: 'user types 4 and the code runs name = input(); print(name * 2). The output is:',
    options: ['8', '44', '4 4', 'A TypeError'],
    correct_index: 1,
    explanation:
      'input() always returns str. "4" * 2 is string repetition → "44". Wrap with int(input()) to compute numerically.',
    difficulty: 'medium',
    topic: 'basics',
  },
  // Data structures (Module 2)
  {
    id: 'pyai-bank-04',
    prompt: 'nums = [1, 2, 3, 4]. What does nums[1:3] evaluate to?',
    options: ['[2, 3]', '[1, 2, 3]', '[2, 3, 4]', '[1, 2]'],
    correct_index: 0,
    explanation: 'Slicing is start:stop with the stop excluded — indices 1 and 2 only → [2, 3].',
    difficulty: 'easy',
    topic: 'data-structures',
  },
  {
    id: 'pyai-bank-05',
    prompt: 'd = {"a": 1}. What is the difference between d["b"] and d.get("b")?',
    options: [
      'Both return None',
      'd["b"] raises KeyError; d.get("b") returns None (or a supplied default)',
      'd.get("b") raises KeyError; d["b"] returns None',
      'No difference — both return 0',
    ],
    correct_index: 1,
    explanation:
      'Bracket access assumes the key exists and raises when it does not; get() is the safe lookup with an optional default.',
    difficulty: 'medium',
    topic: 'data-structures',
  },
  {
    id: 'pyai-bank-06',
    prompt: 'What is the length of s = {(1, 2), (1, 2), (3,)}?',
    options: ['3', '2 — equal tuples collapse to one element', '1 — tuples are unhashable, so this fails', '0 — sets cannot hold tuples'],
    correct_index: 1,
    explanation:
      'Tuples of numbers are hashable; the two identical (1, 2) tuples are equal, so the set keeps one copy → length 2.',
    difficulty: 'hard',
    topic: 'data-structures',
  },
  // Functions (Module 3)
  {
    id: 'pyai-bank-07',
    prompt: 'def f(a, b=2): return a + b. What does f(3) return?',
    options: ['3', '5', '2', 'A TypeError — defaults must come first'],
    correct_index: 1,
    explanation: 'The default fills the omitted parameter: f(3) binds a=3, b=2 → 5.',
    difficulty: 'easy',
    topic: 'functions',
  },
  {
    id: 'pyai-bank-08',
    prompt: 'x = 10\ndef f():\n    x = x + 1\n    return x\nf()  # what happens?\n\n',
    options: ['Returns 11', 'Returns 10', 'Raises UnboundLocalError', 'Raises SyntaxError'],
    correct_index: 2,
    explanation:
      'Assigning to x inside f makes it local for the whole function, so the right-hand x + 1 reads the local name before it exists.',
    difficulty: 'medium',
    topic: 'functions',
  },
  {
    id: 'pyai-bank-09',
    prompt: 'def append_to(el, bucket=[]):\n    bucket.append(el)\n    return bucket\nappend_to(1); append_to(2)  # returns?\n\n',
    options: ['[1] then [2]', '[1, 2] then [1, 2] — the default list persists between calls', '[2]', 'A TypeError — default lists are forbidden'],
    correct_index: 1,
    explanation:
      'The default [] is created once at def time and reused. Use bucket=None and bucket = bucket or [] inside instead.',
    difficulty: 'hard',
    topic: 'functions',
  },
  // Control flow (Module 4)
  {
    id: 'pyai-bank-10',
    prompt: 'What does list(range(2, 7)) produce?',
    options: ['[2, 3, 4, 5, 6, 7]', '[2, 3, 4, 5, 6]', '[1, 2, 3, 4, 5, 6]', '[3, 4, 5, 6, 7]'],
    correct_index: 1,
    explanation: 'range is start:stop with stop excluded — five values from 2 up to (not including) 7.',
    difficulty: 'easy',
    topic: 'control-flow',
  },
  {
    id: 'pyai-bank-11',
    prompt: 'When does the else block attached to a for loop run?',
    options: [
      'Always, after the loop',
      'Only when the loop finished without hitting break',
      'Only when an exception occurred',
      'Only when the loop body ran zero times',
    ],
    correct_index: 1,
    explanation:
      'loop-else means "no break": the else runs when the iterable is exhausted normally; any break skips it.',
    difficulty: 'easy',
    topic: 'control-flow',
  },
  {
    id: 'pyai-bank-12',
    prompt: 'In try / except / else / finally, which clause runs ONLY when no exception was raised in try?',
    options: ['except', 'else', 'finally', 'All of them'],
    correct_index: 1,
    explanation:
      'except handles the failure, finally always runs, and else is the success path — it runs only when try completed cleanly.',
    difficulty: 'medium',
    topic: 'control-flow',
  },
  // NumPy (Module 5)
  {
    id: 'pyai-bank-13',
    prompt: 'a = np.array([1, 2, 3]). What is a * 2?',
    options: ['[1, 2, 3, 1, 2, 3]', 'array([2, 4, 6]) — element-wise doubling', 'array([1, 2, 3, 2])', 'A TypeError'],
    correct_index: 1,
    explanation:
      'NumPy arithmetic is element-wise vectorization. A Python list * 2 would concatenate the list twice — different semantics.',
    difficulty: 'easy',
    topic: 'numpy',
  },
  {
    id: 'pyai-bank-14',
    prompt: 'a = np.array([3, 1, 4, 1, 5]). What does (a > 2).sum() return?',
    options: ['2', '3', '13', 'array([True, False, True, False, True])'],
    correct_index: 1,
    explanation:
      'a > 2 is a boolean mask; True counts as 1, so summing the mask counts matching elements — three of them.',
    difficulty: 'medium',
    topic: 'numpy',
  },
  {
    id: 'pyai-bank-15',
    prompt: 'For a 2-D array of shape (rows, cols), what does arr.sum(axis=0) return?',
    options: [
      'A single grand total',
      'One value per column — the rows are collapsed',
      'One value per row — the columns are collapsed',
      'The same array, unchanged',
    ],
    correct_index: 1,
    explanation:
      'axis=0 is the row axis: the reduction walks down the rows, leaving a 1-D result with one sum per column.',
    difficulty: 'medium',
    topic: 'numpy',
  },
  // pandas (Module 6)
  {
    id: 'pyai-bank-16',
    prompt: 'On a DataFrame df, df["marks"] and df[["marks"]] differ in that:',
    options: [
      'They are identical views of the same object',
      'df["marks"] is a Series (1-D); df[["marks"]] is a DataFrame (2-D)',
      'df[["marks"]] returns a list',
      'df["marks"] only works when marks is the index',
    ],
    correct_index: 1,
    explanation:
      'One bracket selects a column as a Series; a list of columns keeps the DataFrame shape — the distinction every sklearn pipeline relies on.',
    difficulty: 'easy',
    topic: 'pandas',
  },
  {
    id: 'pyai-bank-17',
    prompt: 'df.loc[3] and df.iloc[3] differ because:',
    options: [
      'loc uses the index LABEL 3; iloc uses the 4th row by POSITION',
      'loc is always faster',
      'iloc includes the row named 3 only if it exists',
      'They are aliases',
    ],
    correct_index: 0,
    explanation:
      'loc is label-based (the row whose index equals 3); iloc is integer-position-based (offset 3, the fourth row).',
    difficulty: "medium",
    topic: 'pandas',
  },
  {
    id: 'pyai-bank-18',
    prompt: 'df.groupby("city")["sales"].mean() computes:',
    options: [
      'The mean of all sales, ignoring city',
      'One mean sales value per distinct city — split, apply, combine',
      'A new column called city',
      'The median of the first city only',
    ],
    correct_index: 1,
    explanation:
      'groupby splits rows by city, applies mean to each group\'s sales, and combines the results into one row per city.',
    difficulty: 'medium',
    topic: 'pandas',
  },
  // Visualization (Module 7)
  {
    id: 'pyai-bank-19',
    prompt: 'Which chart best answers "how are student marks distributed across the class?"',
    options: ['Pie chart', 'Histogram', 'Line chart', 'Scatter plot of marks vs marks'],
    correct_index: 1,
    explanation:
      'A distribution question takes a histogram — bins of one numeric variable. Lines are for time; scatter for two variables.',
    difficulty: 'easy',
    topic: 'visualization',
  },
  {
    id: 'pyai-bank-20',
    prompt: 'A column chart comparing department budgets must start its value axis at zero because:',
    options: [
      'matplotlib refuses to draw otherwise',
      'Truncated baselines exaggerate the bar-length differences, which encode the values',
      'Zero is always the minimum budget',
      'It makes the chart load faster',
    ],
    correct_index: 1,
    explanation:
      'Bar length is the visual quantity; clipping the axis lets tiny differences look like multiples. Only lines may zoom for shape.',
    difficulty: 'medium',
    topic: 'visualization',
  },
  {
    id: 'pyai-bank-21',
    prompt: 'A report plots monthly revenue on an undisclosed log-scaled y-axis and claims "explosive growth". What is dishonest?',
    options: [
      'Log scales are always illegal in charts',
      'The axis transformation is hidden, so readers misread the rate of change the linear data actually shows',
      'The chart should have been a pie',
      'Nothing — log scales are fine',
    ],
    correct_index: 1,
    explanation:
      'Log scales are legitimate for wide-range data — when disclosed. Hiding the scale lets the shape imply growth the raw numbers do not support.',
    difficulty: 'hard',
    topic: 'visualization',
  },
  // Files & workflows (Module 8)
  {
    id: 'pyai-bank-22',
    prompt: 'Why does df.to_csv("out.csv", index=False) pass index=False?',
    options: [
      'To sort the file alphabetically',
      'To stop pandas writing the DataFrame index as a phantom first column',
      'To compress the file',
      'It is required — to_csv fails without it',
    ],
    correct_index: 1,
    explanation:
      'The default index=True writes row labels into the CSV, which read back as a junk Unnamed: 0 column. Drop it unless you need it.',
    difficulty: 'easy',
    topic: 'files-io',
  },
  {
    id: 'pyai-bank-23',
    prompt: 'The point of with open(path) as f: instead of open(path) alone is that:',
    options: [
      'It reads the file twice for safety',
      'The file is guaranteed to be closed when the block exits, even if an exception is raised',
      'It opens the file in binary mode',
      'It makes reading faster',
    ],
    correct_index: 1,
    explanation:
      'The context manager closes on every exit path — success or crash — so handles and buffers never leak.',
    difficulty: 'medium',
    topic: 'files-io',
  },
  {
    id: 'pyai-bank-24',
    prompt: 'requests.get(url) without a timeout is a defect because:',
    options: [
      'The server always rejects it',
      'The call can hang forever — a polite client always bounds its wait and checks status_code',
      'It automatically retries',
      'JSON cannot be parsed without a timeout',
    ],
    correct_index: 1,
    explanation:
      'No timeout means a stuck server freezes your script indefinitely. Pass timeout=… and handle r.raise_for_status() before parsing JSON.',
    difficulty: 'hard',
    topic: 'files-io',
  },
  // Statistics (Module 9)
  {
    id: 'pyai-bank-25',
    prompt: 'Ten salaries average ₹50,000; one ₹10,00,000 salary is added. Which statistic moves more?',
    options: ['The median', 'The mean', 'Both move equally', 'Neither moves'],
    correct_index: 1,
    explanation:
      'The mean divides by n and absorbs every value; the median only reorders — one extreme value barely shifts it.',
    difficulty: 'easy',
    topic: 'statistics',
  },
  {
    id: 'pyai-bank-26',
    prompt: 'Sample variance divides by n − 1 (ddof=1) because:',
    options: [
      'It makes the arithmetic easier',
      'Each squared deviation uses a mean estimated from the same data, losing one degree of freedom; dividing by n would underestimate the population variance',
      'Variance is always negative without the correction',
      'numpy chose n − 1 arbitrarily',
    ],
    correct_index: 1,
    explanation:
      'The estimated mean fits the data slightly too well. The n − 1 (Bessel) correction unbiases the estimate of the population variance.',
    difficulty: 'medium',
    topic: 'statistics',
  },
  {
    id: 'pyai-bank-27',
    prompt: 'Ice-cream sales and drowning deaths correlate at r = 0.9. The correct conclusion is:',
    options: [
      'Eating ice cream causes drowning',
      'Correlation is not causation — hot weather is a confounder driving both',
      'The correlation is fake',
      'r = 0.9 proves a perfect relationship',
    ],
    correct_index: 1,
    explanation:
      'A third variable (temperature/season) raises both. Only controlled designs — not observational r — support causal claims.',
    difficulty: 'hard',
    topic: 'statistics',
  },
  // First ML (Module 10)
  {
    id: 'pyai-bank-28',
    prompt: 'In scikit-learn, a feature matrix with 500 samples and 6 features has shape:',
    options: ['(6, 500)', '(500, 6)', '(500,)', '(6,)'],
    correct_index: 1,
    explanation: 'The contract is (n_samples, n_features): rows are observations, columns are features.',
    difficulty: 'easy',
    topic: 'machine-learning',
  },
  {
    id: 'pyai-bank-29',
    prompt: 'On a dataset that is 98% class "safe", a model predicting "safe" always scores 98% accuracy. The correct reading is:',
    options: [
      'The model is excellent — ship it',
      'Accuracy is misleading under imbalance — the model adds nothing over the most_frequent baseline; use precision/recall or F1',
      'The dataset must be broken',
      'Accuracy should be computed on training data instead',
    ],
    correct_index: 1,
    explanation:
      'The dummy already scores 98%. Honest evaluation compares against that bar and uses metrics that see the minority class.',
    difficulty: 'medium',
    topic: 'machine-learning',
  },
  {
    id: 'pyai-bank-30',
    prompt: 'You impute missing values and select features using the FULL dataset, and only then split train/test. Why is the test score inflated?',
    options: [
      'The split is too small',
      'Leakage: statistics computed from test rows influenced training, so the test set is no longer unseen',
      'imputation always inflates scores',
      'train_test_split cannot detect this',
    ],
    correct_index: 1,
    explanation:
      'Any learned preprocessing must be fitted on train only (fit on X_train, transform both). Full-data fitting lets test information leak into the model.',
    difficulty: 'hard',
    topic: 'machine-learning',
  },
];

export function getPythonForAICourse(): Course {
  return {
    id: 'crs-python-for-ai',
    slug: 'python-for-ai',
    title: 'Python for AI',
    subtitle:
      'Forty lessons from your first print() to a shipped end-to-end notebook — Python, NumPy, pandas, honest charts, core statistics and your first scikit-learn models',
    description: `Every AI course starts by assuming you already speak Python. This one does not. It is the complete zero-to-first-model path in ten modules: the language itself (variables, strings, structures, functions, control flow, errors), the two libraries AI work actually runs on (NumPy at array speed, pandas on real tables), how to look at data without lying to yourself (honest charts, file and API workflows, a re-runnable cleaning pipeline), the statistics every model sits on (mean, variance, distributions, correlation versus causation), and finally scikit-learn — where you split honestly, beat a baseline, and read your first LinearRegression and DecisionTree with the numbers they deserve.

Every lesson follows the same nine steps (objective, hook, concept, worked example, practice task, common mistakes, exam/interview angle, four-question quiz, summary), so the format never becomes another thing to learn. The course ends with a capstone: one notebook, a stranger can run it top to bottom, and it goes from raw data to a defensible model verdict — the artifact you show, not the notes you took.

**Who this is for:** any student — any branch — who was told to "learn Python for AI" and wants one honest course that finishes with a real pipeline, not a certificate for watching videos.

**What you need:** a browser (Google Colab needs zero install) or any machine that can install Python 3.9+. No prior programming assumed.`,
    category: 'AI & Data Science',
    level: 'beginner',
    is_free: true,
    price_inr: 0,
    thumbnail_url: '',
    thumbnail_alt: 'Python for AI course cover',
    tags: ['python', 'ai', 'numpy', 'pandas', 'data', 'beginner', 'programming'],
    outcomes: [
      'Set up Python and run code confidently in scripts, the REPL and Jupyter/Colab notebooks',
      'Use variables, f-strings and the four basic types without type-confusion bugs',
      'Choose and manipulate lists, tuples, dicts and sets — including comprehensions — with the right mutation semantics',
      'Write small functions with clean parameters, returns, scope and docstrings; install packages with pip inside a venv',
      'Drive confident branches and loops, and read a traceback to fix the actual error',
      'Use NumPy arrays, vectorized operations, slicing, broadcasting and seeded randomness on real numeric data',
      'Load, inspect, select, filter, join and group pandas DataFrames — and handle missing data with a reported strategy',
      'Build honest matplotlib/seaborn charts matched to the question, and save figures and outputs reproducibly',
      'Read CSV/JSON files and APIs safely, and package cleaning into a re-runnable pipeline with a defect report',
      'Compute core statistics and train/evaluate a first scikit-learn model against a baseline with an honest train/test split',
    ],
    prerequisite_course_id: null,
    certificate_eligible: true,
    published: true,
    created_at: '2026-10-15T09:00:00.000Z',
    updated_at: '2026-10-15T09:00:00.000Z',
    instructor_id: null,
    about_course: `This course is built around one gap: every AI syllabus starts at "import pandas", and everyone who falls behind fell behind in week one — in Python itself. Ten modules close that gap in order, each one earning the next.

Module 1 gets code running three ways (interpreter, script, notebook) and fixes the mental model: names point at values, input() is always text, and the four basic types behave differently in arithmetic. Module 2 is the container toolkit — lists, tuples, dicts and sets — chosen by mutability and lookup needs rather than habit. Module 3 turns scripts into functions: parameters, defaults done right (the mutable-default trap included), scope, imports, pip and virtual environments. Module 4 is control flow and the error skills that separate people who ship from people who stall: honest branches, loops that finish, tracebacks read bottom-up, and a debug loop you can repeat. Module 5 crosses into NumPy — dtype and shape, vectorization that beats Python loops, fancy indexing, broadcasting and seeded randomness — the array literacy every model assumes.

Part II is the applied half. Module 6 is pandas: Series and DataFrame, the six-readout inspection ritual, loc versus iloc, merges, groupby and missing-data strategies that report what they did. Module 7 is seeing data without lying — matplotlib's object interface, matching chart type to question, subplots and seaborn, and the honesty rules (zero-based bars, disclosed log scales, takeaways in titles). Module 8 is real data work: CSV and JSON safely, APIs with timeouts and courtesy, a cleaning pipeline that returns (data, report), and saving figures and outputs so someone else can rerun you. Module 9 is the statistics every model sits on — mean, median, variance with the n − 1 correction, sampling intuition, correlation versus causation with real confounders, and outliers. Module 10 assembles everything into scikit-learn: the X/y contract, honest held-out evaluation, baselines you must beat, LinearRegression and a DecisionTree read against those baselines — and the capstone notebook that proves the whole chain end to end.

The exam/interview angle is threaded through every lesson, and the final exam draws fifteen questions from a thirty-question bank spanning all ten modules. The certificate is issued for the capstone notebook — a thing you can open, run and defend — not for attendance.`,
    prerequisites: [
      'A browser (Google Colab needs zero install) or any computer that can install Python 3.9+',
      'No prior programming experience assumed — Module 1 starts from zero',
      'High-school algebra is enough for the statistics and NumPy sections',
    ],
    audience: [
      'Engineering students of any branch who need Python for labs, projects or placements',
      'Aspiring AI/ML/data-science learners told to "first learn Python" without a roadmap',
      'Students preparing for placement Python rounds and aptitude-style coding questions',
      'Anyone who knows a little Python but has never touched NumPy, pandas or scikit-learn',
    ],
    audio_language: 'English',
    caption_language: 'English',
    // Bucket B foundation course, AI/DS primary but open to every branch —
    // the language-and-libraries layer under any ML track on the platform.
    branch: 'ai-ds',
    branch_label: 'AI/DS primary — open to all branches',
    bucket: 'B',
    certificate_tier: 'foundation',
    estimated_hours: 15,
    perks: [
      { key: 'certificate', label: 'Verifiable certificate' },
      { key: 'xp', label: 'XP on the leaderboard' },
    ],
    // Semester Exam Mode payload — the one-night revision sheet.
    exam_prep: {
      target: 'University Python / Data Science semester exams & placement Python rounds — AI/DS primary, all branches',
      units: [
        {
          title: 'Foundations: setup, variables, strings, types',
          summary:
            'Three runtimes: interpreter, script, notebook (cells share one kernel). Names bind to objects — dynamic typing; reassignment rebinds, never converts. Strings immutable; f"{x:.2f}" is a display spec; slicing start:stop excludes stop. input() always returns str; int/float/bool/None arithmetic (True == 1, None only equals None).',
          questions: [
            'Why does input() * 2 concatenate instead of doubling, and how do you fix it?',
            'What does f"{value:.2f}" change — the number or its printed form?',
            'After x = 5; x = "hi", what happened to the integer 5?',
          ],
          pyqs: [],
        },
        {
          title: 'Data structures: list, tuple, dict, set',
          summary:
            'List: mutable, ordered, indexed/sliced; mutation methods change in place. Tuple: immutable and hashable — dict keys and set elements. Dict: O(1) lookup; d["k"] raises on miss, d.get("k") returns None/default. Set: uniqueness + union/intersection/difference. Comprehensions build lists/dicts/sets declaratively. Choose by mutability need and lookup pattern.',
          questions: [
            'Why can a tuple be a dict key but a list cannot?',
            'What is the difference between d["k"] and d.get("k") on a missing key?',
            'When is a set the right container instead of a list?',
          ],
          pyqs: [],
        },
        {
          title: 'Functions, imports & readable code',
          summary:
            'Positional then keyword arguments; defaults bind once at def — the [] trap persists state across calls. return sends values back; assignment inside a function makes a name local (UnboundLocalError even when a global exists). import finds modules; pip installs; venv isolates. Docstrings document contracts; PEP 8 naming keeps code readable.',
          questions: [
            'Why does def f(item, bucket=[]) silently accumulate state across calls?',
            'What raises UnboundLocalError even when a global of the same name exists?',
            'What must a function docstring document beyond what the name says?',
          ],
          pyqs: [],
        },
        {
          title: 'Control flow, errors & debugging',
          summary:
            'if/elif/else: order boundary tests highest-first. for + range(stop) excludes stop; while needs a guard that eventually fails. break exits, continue skips; loop-else runs only when no break happened. try/except catches specific exceptions; else is the success path; finally always runs. Tracebacks read bottom-up: the last frame is where it died.',
          questions: [
            'What does the else block on a for loop mean?',
            'Which try/except clause runs only when no exception occurred?',
            'Which traceback line tells you where the failure actually is?',
          ],
          pyqs: [],
        },
        {
          title: 'NumPy: arrays, vectorization, broadcasting',
          summary:
            'ndarray: homogeneous typed block — shape + dtype; beats list-of-objects on memory and speed. Whole-array arithmetic is element-wise (list * 2 concatenates; array * 2 doubles). Boolean masks filter and count. Fancy indexing selects by position lists. Broadcasting stretches compatible shapes. sum/mean/std collapse along axis. np.random.default_rng(seed) makes sampling reproducible.',
          questions: [
            'Why is a * 2 different for a Python list and a NumPy array?',
            'What does arr.sum(axis=0) return for a (rows × cols) array?',
            'Why does df[["col"]] stay 2-D when a single-feature X must?',
          ],
          pyqs: [],
        },
        {
          title: 'pandas: Series, DataFrame & groupby',
          summary:
            'Series = labeled 1-D; DataFrame = labeled 2-D table. read_csv then the six-readout ritual: head, shape, dtypes, info, describe, missing counts. df["col"] → Series; df[["col"]] → DataFrame. loc = label, iloc = position; boolean masks filter rows. merge joins on keys; groupby = split-apply-combine. isna().sum() per column decides the fill/drop strategy — always reported.',
          questions: [
            'df["x"] and df[["x"]] — what makes them different objects?',
            'What three steps does a groupby aggregation always perform?',
            'Why inspect dtypes and missing counts BEFORE any maths?',
          ],
          pyqs: [],
        },
        {
          title: 'Visualization & data workflows',
          summary:
            'fig, ax = plt.subplots() — the object interface every chart should use. Histogram = distribution; scatter = relationship; line = time; bar = category. Subplots grids iterate axes arrays; seaborn reads column names. Honesty: bars start at zero; log scales disclosed; titles state the finding. Files: with open + UTF-8; json module; to_csv(index=False); pathlib paths; requests with timeout + raise_for_status; cleaning functions return (df, report); savefig + output/ bundle.',
          questions: [
            "Why must a bar chart's value axis start at zero?",
            'Why does to_csv(..., index=False) matter on read-back?',
            'What does the (clean_df, report) tuple from a cleaning function buy you?',
          ],
          pyqs: [],
        },
        {
          title: 'Statistics & first ML models',
          summary:
            'Mean vs median under skew; variance = mean squared deviation; sample variance uses n − 1 (degrees of freedom). Sampling distributions: means of many samples concentrate — the intuition behind CLT. Correlation r measures linear association, never causation — confounders drive both variables. Outliers via IQR fences. ML: split train/test with random_state (+ stratify) BEFORE learned preprocessing; beat the dummy baseline; LinearRegression coef_ are associations; DecisionTree + confusion matrix locate errors; verdicts in domain units on held-out data only.',
          questions: [
            'Why split BEFORE imputing or scaling with statistics learned from data?',
            'What bar must a model beat before its accuracy means anything?',
            'A feature with a large coef_ — can you call it a cause? Why not?',
          ],
          pyqs: [],
        },
      ],
      important_questions: [
        'Explain dynamic typing: why does x = 5; x = "hi" work, and what class of bugs does it cause?',
        'List three differences between a Python list and a NumPy array, and say which wins for 10^6 numeric operations.',
        'Walk through the six-readout inspection ritual on a fresh CSV and say what each readout can catch.',
        'Why does sample variance divide by n − 1, and what goes wrong if you divide by n?',
        'Two variables correlate at r = 0.95 — can you claim causation? Give the confounder counterexample.',
        'State the train/test discipline: where the split happens relative to cleaning/imputation, and why random_state appears everywhere.',
        'Your classifier scores 92% on a 2%-fraud dataset by always predicting "safe". Diagnose the number and name the metric family you would use instead.',
      ],
      previous_year_questions: [
        {
          year: '2024',
          question:
            'A function is defined as def greet(name, msg="Hi"): return f"{msg}, {name}!". Explain the argument-binding rules and show one call that raises TypeError even though both parameters have values available.',
          solution:
            'Positional arguments bind left to right; keyword arguments bind by name; a default fills any parameter left out (defaults must follow parameters they can fill). greet("Ada", "Hello", "extra") raises TypeError: greet() takes from 1 to 2 positional arguments but 3 were given — the third positional has nothing to bind to. Greeting("Ada", msg="Hey") is valid: one positional, one keyword, no conflict.',
        },
        {
          year: '2025',
          question:
            'A CSV marks column mixes numbers with the text "Absent". Write the pandas steps to count the non-numeric entries, convert safely, and decide a fill strategy — without silently averaging garbage.',
          solution:
            'df = pd.read_csv(path); df["marks"].value_counts(dropna=False).head() shows how many Absent; pd.to_numeric(df["marks"], errors="coerce") turns them into NaN instead of raising; missing = df["marks"].isna().sum() quantifies the damage. Decide with evidence: drop rows if few and MCAR, or fill with a stated value (median) and record the count in a report dict. Never let read_csv guess silently — check dtypes after load, because a mixed column arrives as object dtype and mean() would either fail or lie.',
        },
        {
          year: '2025',
          question:
            'Explain why evaluating a model on its own training data gives an inflated score, and demonstrate the correct evaluation protocol using train_test_split with random_state and stratify.',
          solution:
            'A model can memorise training rows (especially flexible ones like deep trees) and score near-perfectly there while failing on new cases — training accuracy measures capacity to memorise, not to generalise. Protocol: X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y); fit ONLY on train; score ONLY on test. random_state pins the shuffle so results reproduce; stratify keeps class proportions equal in both halves so metrics on imbalanced data stay comparable. Fit a most_frequent/mean dummy on the same train split first — the real model only earns its score by beating that bar.',
        },
      ],
    },
    // Final exam: 15 drawn from the 30-question bank, mixed difficulty and
    // topic-tagged. Pass 60, distinction 85 on the first attempt, 24h retake.
    exam: {
      question_count: 15,
      duration_minutes: 30,
      passing_percent: 60,
      retake_cooldown_hours: 24,
      distinction_percent: 85,
      bank: examBank,
    },
    // Capstone: the end-to-end notebook. Required for the certificate — the
    // course's claim is that you finish with a runnable pipeline, not notes.
    project: {
      title: 'Ship an end-to-end Python-for-AI notebook',
      brief:
        'Produce one Jupyter/Colab notebook on a dataset of your choice (a built-in sklearn dataset such as iris or diabetes, or any CSV you cleaned yourself) that a stranger can run top to bottom on a fresh kernel. The eight sections are fixed: (1) the question — one sentence naming the decision, target and features; (2) load + inspect — the six-readout ritual; (3) clean + report — every fill, coercion and drop counted in a printed report dict; (4) EDA — at least three charts (distribution, relationship, category), each with a one-line takeaway and honest axes; (5) split FIRST — train_test_split with random_state=42, plus stratify for classification, before any learned preprocessing; (6) baseline — DummyRegressor/DummyClassifier scored and recorded; (7) the real model — LinearRegression for a regression target or DecisionTreeClassifier for classification, fit on train only; (8) compare + confess + save — baseline vs model metrics side by side in domain units, the confusion matrix or a residual summary, a limitations paragraph naming test size, single-split uncertainty, suspected confounds and one concrete forbidden use, and an output/ bundle (cleaned CSV, metrics.json, figures). No cell may depend on manual state.',
      submission_hint: 'Link to a public Colab or GitHub notebook (anyone-with-link can view) that runs top to bottom without errors.',
      required_for_certificate: true,
    },
    modules,
  };
}
