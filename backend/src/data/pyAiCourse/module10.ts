// Module 10 — First ML with scikit-learn + Capstone
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, code } from '../nineBlocks';
import { lesson, M10, COURSE_ID } from './helpers';

export const module10: CourseModule = {
  id: M10,
  course_id: COURSE_ID,
  title: 'Module 10 — First ML with scikit-learn',
  summary:
    'The scikit-learn contract: datasets as X and y, feature matrices with sample/feature axes; holdout splitting; baselines with DummyRegressor and DummyClassifier; first LinearRegression and DecisionTree models with MAE and accuracy read honestly; and the capstone end-to-end notebook.',
  sort_order: 10,
  lessons: [
    lesson(
      M10,
      'pyai-10-1',
      1,
      'Datasets & Feature Matrices: X and y, the scikit-learn Contract',
      'Supervised learning as learn-a-mapping; the n_samples × n_features shape of X; built-in sklearn datasets; and building X, y from a cleaned DataFrame.',
      18,
      nineBlocks({
        objectives: [
          'Describe supervised learning as learning a mapping from features X to target y',
          'Read the n_samples × n_features shape convention and keep X 2-D, y 1-D',
          'Load a built-in sklearn dataset and inspect data, target and feature names',
          'Build X and y from a pandas DataFrame with drop and bracket selection',
        ],
        hook:
          'Every model in scikit-learn speaks one dialect: give me X (a table of samples × features) and y (one target per sample), call fit(X_train, y_train), then predict(X_test). Same three calls for house prices, disease risk, image pixels, customer churn. This lesson installs that contract — because once it is muscle memory, a hundred algorithms all feel like the same tool.',
        concept: `**Supervised learning in one sentence.** Learn a function f such that \`f(X_row) ≈ y_row\` — features in, target out — using examples where both were known. Everything else (algorithms, tuning, theory) is commentary on HOW f gets learned and how well it generalises to rows it has never seen.

**The shape contract.** scikit-learn insists on:
- **X — the feature matrix**: 2-D, shape \`(n_samples, n_features)\`. Rows are observations (people, days, sensors); columns are the measurements used to predict.
- **y — the target**: 1-D, shape \`(n_samples,)\`. One value per row.
A single sample is a row of X; the model never sees "a column of people". The target's type picks your problem family: a continuous number (price, temperature) → **regression**; a category (spam/not-spam, species) → **classification**. Two more rules: no missing values (NaN breaks every estimator — Module 6/8 cleaning earns its keep here) and numeric inputs (categories must be encoded — a preview of the ML-fundamentals course).

**Built-in datasets: zero-download practice.** sklearn ships small real datasets for exactly this stage:
\`\`\`
from sklearn.datasets import load_iris, load_diabetes
X, y = load_iris(return_X_y=True)      # (150, 4), species 0/1/2
X, y = load_diabetes(return_X_y=True)  # (442, 10), progression target
\`\`\`
\`load_iris()\` without return_xy gives a Bunch: \`.data\`, \`.target\`, \`.feature_names\`, \`.target_names\`, \`.DESCR\`. Iris: 150 flowers, 4 measurements (sepal/petal length and width), 3 species of 50. Diabetes: 442 patients, 10 already-centred numeric features, a quantitative disease-progression target.

**From DataFrame to X, y.** Real projects load a cleaned CSV (Module 8) and split it:
\`\`\`
X = df.drop(columns="species")   # everything EXCEPT the target → 2-D
y = df["species"]                # the target column → 1-D Series
\`\`\`
The convention "the target leaves X; everything else predicts" keeps leakage out by construction: if a column is not meant as a predictor, it is dropped before anything is fitted.`,
        extras: [
          table(
            'Regression vs classification — how y decides',
            ['y looks like…', 'Problem family', 'Typical models', 'Metric preview'],
            [
              ['Numbers: 125.4, 98.0, 210.7', 'Regression', 'LinearRegression, tree regressors', 'MAE, R²'],
              ['Labels: cat/dog, 0/1/2', 'Classification', 'LogisticRegression, DecisionTree', 'Accuracy, confusion matrix'],
            ],
          ),
          code(
            'from sklearn.datasets import load_iris\n\niris = load_iris()\nX, y = iris.data, iris.target\nprint(X.shape, y.shape)            # (150, 4) (150,)\nprint(iris.feature_names)          # sepal length/width, petal length/width\nprint(iris.target_names)           # setosa versicolor virginica\nprint(X[0])                        # first flower: [5.1 3.5 1.4 0.2]',
            'iris-xy.py',
            'python',
          ),
          warn(
            'X stays 2-D, even for one feature',
            'A single-feature X must keep its second axis: X.reshape(-1, 1) or df[[\"col\"]]. A flat (n,) X raises "Expected 2D array" — the contract\'s most common papercut.',
          ),
        ],
        worked: {
          title: 'Inspect iris, then build X and y from a DataFrame',
          problem:
            'Load iris with full metadata; report the shapes of X and y and the class balance. Then build the same problem from a small CSV-style DataFrame: select the four feature columns into X and the species column into y, and verify the shapes obey the contract.',
          steps: [
            {
              title: '1. Load the Bunch and read the metadata',
              desc: 'The Bunch is a dict-like bundle: data (the matrix), target (the labels), names for both, and a DESCR text documenting the source.',
              code_snippet: 'from sklearn.datasets import load_iris\n\niris = load_iris()\nprint(iris.data.shape, iris.target.shape)   # (150, 4) (150,)\nprint(iris.feature_names)\nprint(iris.target_names)',
            },
            {
              title: '2. Check balance before anything else',
              desc: 'value_counts on y: 50 per class — perfectly balanced. Balance decides whether plain accuracy will be an honest metric (Lesson 10.2).',
              code_snippet: 'import numpy as np\n\nprint(np.bincount(iris.target))    # [50 50 50]',
            },
            {
              title: '3. Same problem from a DataFrame',
              desc: 'drop(columns=...) leaves the feature table; bracket selection takes the target. Both views of one cleaned CSV — the real-world route.',
              code_snippet: 'import pandas as pd\nfrom io import StringIO\n\ncsv_text = ("sepal_length,sepal_width,petal_length,petal_width,species\\n"\n            "5.1,3.5,1.4,0.2,setosa\\n6.2,2.9,4.3,1.3,versicolor\\n5.9,3.0,5.1,1.8,virginica\\n")\ndf = pd.read_csv(StringIO(csv_text))\nX = df.drop(columns="species")\ny = df["species"]',
            },
            {
              title: '4. Verify the shapes and types',
              desc: 'X: (3, 4) — 3 samples × 4 features, 2-D DataFrame. y: (3,) — 1-D. The contract holds, and y being text means classification.',
              code_snippet: 'print(X.shape, y.shape)    # (3, 4) (3,)\nprint(X.dtypes.tolist())   # all float64 — numeric features, estimator-ready',
            },
          ],
          solution:
            'Iris loaded as (150, 4) features and (150,) targets with balanced classes [50, 50, 50] and named species/sepal-petal metadata. The DataFrame route reproduced the contract: drop the target for X (3, 4), take it for y (3,), all features numeric. Two entrances, one shape discipline — the prerequisite for every model in the next lessons.',
        },
        practice: {
          title: 'Build X, y three ways',
          prompt:
            '(1) Load load_diabetes(return_X_y=True): report shapes and the target\'s min/max/mean — regression or classification, and why? (2) Load load_iris(as_frame=True) and print df.head(); build X and y from the frame and re-verify shapes. (3) Make X single-column: take df[[\"petal length (cm)\"]] — confirm .shape is (150, 1), then try the flat version df[\"petal length (cm)\"].shape and explain the difference in one line. (4) For a classification target, write the one-sentence reason y must leave X before any fit.',
          hint: 'One bracket = Series (1-D); two brackets = DataFrame (2-D). The estimator needs the second dimension.',
        },
        mistakes: [
          {
            mistake: 'Feeding a flat (n,) array as X',
            fix: 'Estimators expect 2-D. Use X.reshape(-1, 1) or a one-column DataFrame — the single-feature papercut has a one-token fix.',
          },
          {
            mistake: 'Leaving the target (or an ID column) inside X',
            fix: 'The model would "cheat" — an ID column memorised, the target leaked. df.drop(columns=...) the target and any non-predictor column before splitting.',
          },
          {
            mistake: 'Ignoring NaNs before fit',
            fix: 'Most estimators raise on NaN. Run the Module 6 inspection ritual and a Module 8 cleaning pipeline before X, y are born.',
          },
          {
            mistake: 'Treating a continuous target as classes (or vice versa)',
            fix: 'y\'s dtype and semantics pick the family. Numeric target with meaningful magnitude → regression; finite set of labels → classification. Choosing wrong silently produces nonsense metrics.',
          },
        ],
        exam: {
          question:
            'State the scikit-learn data contract: the shapes and meanings of X and y, how the target type selects the problem family, and two consequences of leaving the target inside X.',
          answer:
            'X is the feature matrix, 2-D with shape (n_samples, n_features): rows are observations, columns the predictor measurements. y is the target, 1-D with shape (n_samples,): one label or value per row. The target\'s nature defines the task — a continuous numeric y means regression (predict a quantity); a categorical y means classification (predict a label). If the target stays inside X: (1) the model can peek at the answer during fit — training performance becomes fiction and the held-out evaluation collapses; (2) even a pure ID column invites memorisation instead of learning patterns. Real projects additionally require X to be NaN-free and numeric, which is why the cleaning pipeline of Module 8 precedes every modelling step.',
          source: 'The opening contract question of every sklearn-based interview or lab practical.',
        },
        summary: [
          'Supervised learning: learn f(X_row) ≈ y_row from labelled examples.',
          'X = (n_samples, n_features) 2-D; y = (n_samples,) 1-D — never flatten a single-feature X.',
          'Continuous y → regression; categorical y → classification.',
          'Built-ins: load_iris (150×4, 3 classes), load_diabetes (442×10, numeric target).',
          'From a DataFrame: X = df.drop(columns=target); y = df[target] — drop the target before anything is fitted.',
          'No NaNs, all-numeric X — the cleaning pipeline is a modelling prerequisite.',
        ],
      }),
      [
        [
          'In scikit-learn, X with 500 rows and 6 features has shape:',
          ['(6, 500)', '(500, 6)', '(500,)', '(6,)'],
          1,
          'Convention: samples on rows, features on columns — (n_samples, n_features).',
        ],
        [
          'load_iris(return_X_y=True) returns y with shape (150,) and values that are:',
          ['Species names as text', 'Integers 0, 1, 2 — one class id per flower', 'One-hot vectors', 'Continuous measurements'],
          1,
          'sklearn encodes the three species as integer class ids; target_names maps them back to text.',
        ],
        [
          'df.drop(columns="species") then df["species"] yields:',
          [
            'X as a DataFrame and y as a Series — the standard split',
            'Two Series',
            'X 1-D and y 2-D',
            'An error — species must stay in X',
          ],
          0,
          'The target leaves X by dropping it; bracket selection takes it as the 1-D-ish target vector.',
        ],
        [
          'A single feature used as X must be reshaped because:',
          [
            'Estimators require a 2-D (n_samples, n_features) matrix',
            'It speeds up fitting',
            'It converts text to numbers',
            'It is only a convention with no effect',
          ],
          0,
          'A flat (n,) array is ambiguous — one sample with n features, or n samples with one? The second axis settles it.',
        ],
      ]
    ),
    lesson(
      M10,
      'pyai-10-2',
      2,
      'Train/Test Split & Baselines: The Numbers You Must Beat',
      'Held-out evaluation, stratified splits, and the dumb baselines — mean and most-frequent — that turn a model score from a number into a verdict.',
      18,
      nineBlocks({
        objectives: [
          'Split X and y into train and test with train_test_split, random_state and stratify',
          'Explain why metrics on training data overstate performance',
          'Fit DummyRegressor and DummyClassifier baselines and score them',
          'Interpret accuracy and MAE against the baseline rather than against zero',
        ],
        hook:
          'Your model scores 94% accuracy. Fantastic — until you learn the answer key is 94% one class; a model that always guesses the majority already scores 94%. A metric without a baseline is a number without a meaning. This lesson gives you both: the held-out split that makes the metric honest, and the deliberately dumb model that makes it interpretable.',
        concept: `**Why the holdout exists.** A model can memorise its training data and score near-perfectly there while failing on every new case. Evaluation must answer one question: **how does this model do on data it has never seen?** So before fitting anything: set aside a test slice (typically 20–30%) and touch it only for scoring. \`train_test_split\` shuffles and slices X and y together:
\`\`\`
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.25, random_state=42, stratify=y)
\`\`\`
- \`test_size=0.25\` — a quarter held out (the rest trains).
- \`random_state=42\` — pinned shuffle; identical split every run (Module 9.4).
- \`stratify=y\` — preserves class proportions in each half; effectively mandatory for classification with imbalanced classes, harmless for regression (pass nothing there).

**Baselines: the score to beat.** A **baseline** is a model that ignores X entirely — it encodes only the simplest strategy from y_train:
- \`DummyRegressor(strategy="mean")\` — always predicts the training mean.
- \`DummyClassifier(strategy="most_frequent")\` — always predicts the majority training class.
Baselines are not jokes; they are the null hypothesis of modelling. A real model that cannot beat them adds no value, however clever its architecture. On balanced 3-class iris, most_frequent scores ≈ 1/3 — and THAT is the bar.

**Two metrics, first reads.** For regression, **MAE** (mean absolute error): the average |prediction − truth|, in the target's own units — "off by about 38 points on average". For classification, **accuracy**: fraction of test rows predicted correctly — honest only when classes are roughly balanced; for a 2% fraud class, "always safe" scores 98% while catching zero fraud (precision/recall fix this in the next course). Compute with \`mean_absolute_error(y_test, preds)\` and \`accuracy_score(y_test, preds)\` — always on the TEST side.`,
        extras: [
          table(
            'The split vocabulary',
            ['Term', 'Meaning', 'Typical size'],
            [
              ['Train set', 'The only data the model may learn from', '70–80%'],
              ['Test set', 'One-shot held-out exam', '20–30%'],
              ['random_state', 'Seed pinning the shuffle — reproducibility', 'Any int, e.g. 42'],
              ['stratify', 'Keeps class proportions equal in both halves', 'Classification only'],
            ],
          ),
          code(
            'from sklearn.datasets import load_iris\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.dummy import DummyClassifier\nfrom sklearn.metrics import accuracy_score\n\nX, y = load_iris(return_X_y=True)\nX_train, X_test, y_train, y_test = train_test_split(\n    X, y, test_size=0.25, random_state=42, stratify=y)\n\nbase = DummyClassifier(strategy="most_frequent", random_state=42)\nbase.fit(X_train, y_train)\nprint(accuracy_score(y_test, base.predict(X_test)))   # ~0.33 — the bar',
            'baseline.py',
            'python',
          ),
          tip(
            'Score with the estimator\'s own score() too',
            'model.score(X_test, y_test) is accuracy for classifiers and R² for regressors — a quick shorthand. Keep metric functions explicit in reports so the number is named.',
          ),
        ],
        worked: {
          title: 'Split iris honestly and set the bar with a dummy',
          problem:
            'Split iris 75/25 with random_state=42 and stratify=y. Fit a most_frequent dummy; report its test accuracy and explain the number. Then fit a mean dummy on a small regression set and compute its MAE by hand and with sklearn to prove the metric.',
          steps: [
            {
              title: '1. Stratified, seeded split',
              desc: 'stratify=y puts ~12–13 flowers of each class in the 38-row test set — class balance survives the shuffle. random_state pins it forever.',
              code_snippet: 'from sklearn.datasets import load_iris\nfrom sklearn.model_selection import train_test_split\n\nX, y = load_iris(return_X_y=True)\nX_train, X_test, y_train, y_test = train_test_split(\n    X, y, test_size=0.25, random_state=42, stratify=y)\nprint(X_train.shape, X_test.shape)   # (112, 4) (38, 4)',
            },
            {
              title: '2. The majority-class dummy',
              desc: 'most_frequent predicts the biggest training class for every test flower. With three balanced classes, that is about one third of them — ≈0.33 accuracy with zero features used.',
              code_snippet: 'from sklearn.dummy import DummyClassifier\nfrom sklearn.metrics import accuracy_score\n\nbase = DummyClassifier(strategy="most_frequent", random_state=42)\nbase.fit(X_train, y_train)\nacc = accuracy_score(y_test, base.predict(X_test))\nprint(round(acc, 3))   # ~0.33 — the score to beat',
            },
            {
              title: '3. Regression baseline: always the mean',
              desc: 'A tiny regression problem; the dummy predicts y_train.mean() for every test row. MAE then measures the typical miss of the simplest possible strategy.',
              code_snippet: 'import numpy as np\nfrom sklearn.dummy import DummyRegressor\nfrom sklearn.metrics import mean_absolute_error\n\nrng = np.random.default_rng(0)\nXr = rng.normal(size=(200, 3))\nyr = 5 * Xr[:, 0] + rng.normal(scale=1.0, size=200)\nXtr, Xte, ytr, yte = train_test_split(Xr, yr, test_size=0.25, random_state=42)\n\ndummy = DummyRegressor(strategy="mean").fit(Xtr, ytr)\nmae = mean_absolute_error(yte, dummy.predict(Xte))\nprint(round(mae, 3))   # typical miss of the mean strategy, in target units',
            },
            {
              title: '4. Verify MAE by hand',
              desc: 'MAE = mean(|prediction − truth|). Recompute without sklearn: identical number, zero magic. Understanding the metric beats memorising the import.',
              code_snippet: 'preds = dummy.predict(Xte)\nmae_hand = np.mean(np.abs(preds - yte))\nprint(np.isclose(mae, mae_hand))   # True',
            },
          ],
          solution:
            'A stratified 112/38 split with pinned seed; the most_frequent dummy scored ≈0.33 on balanced iris — the honest bar any classifier must clear. The mean dummy on synthetic regression produced its MAE in target units, and a by-hand mean(|pred − truth|) reproduced the sklearn number exactly. Two baselines, two metrics, one discipline: every future score gets reported next to these.',
        },
        practice: {
          title: 'Split, baseline, defend',
          prompt:
            '(1) On load_diabetes: split 75/25, random_state=42, fit a mean DummyRegressor, report MAE — write the one-sentence translation of that MAE into target units. (2) Build a fake imbalanced classification set: y = [0]*90 + [1]*10 (with any X); split WITHOUT stratify, fit most_frequent, and report accuracy — why is 0.9 a dangerous-looking-good number here? (3) Redo with stratify=y and compare test accuracy. (4) Write the two-line policy: when is accuracy honest, and what must always sit beside a reported MAE?',
          hint: 'np.bincount(y_test) shows the test composition; stratify keeps the 90/10 split on both sides.',
        },
        mistakes: [
          {
            mistake: 'Reporting training accuracy as the model result',
            fix: 'Training scores measure memorisation capacity. The number that counts is on held-out test — the model has no idea what lives there.',
          },
          {
            mistake: 'Classification on imbalanced classes with plain accuracy',
            fix: 'A 2% minority makes "predict majority" look like 98%. Check np.bincount(y); for imbalance, reach for precision/recall/F1 — the ML-fundamentals course.',
          },
          {
            mistake: 'Forgetting stratify on classification splits',
            fix: 'Small test sets drift in class mix by chance; metrics then bounce. stratify=y locks the proportions — one argument, zero downside.',
          },
          {
            mistake: 'Judging a model without a baseline',
            fix: 'Fit the dummy first. If your model cannot beat "always the mean" / "always the majority", no tuning will rescue the story — rethink the features.',
          },
        ],
        exam: {
          question:
            'Explain the purpose of the train/test split, the roles of random_state and stratify, and why a baseline model must be scored before any real model.',
          answer:
            'The train/test split holds out data the model never learns from, so its score estimates performance on future unseen cases — training scores only measure memorisation. random_state seeds the internal shuffle so the identical split regenerates on every run, making results reproducible. stratify=y preserves the class proportions in both halves, preventing chance imbalance from distorting classification metrics on small test sets. Baselines (DummyRegressor mean, DummyClassifier most_frequent) quantify the score achievable with no features at all — the null hypothesis of modelling. Scoring one first converts every later metric from an absolute number into a verdict: a model that cannot beat the dummy adds no value, however sophisticated, and reviewers will (rightly) ask for the baseline before the accuracy.',
          source: 'The foundational evaluation question in every ML interview and DS semester exam.',
        },
        summary: [
          'Split BEFORE fitting: test_size, random_state (reproducibility), stratify=y for classification.',
          'The model may learn only from train; the test is a one-shot exam.',
          'Baselines ignore X: mean for regression, most_frequent for classification — score them first.',
          'MAE is in target units; accuracy needs roughly balanced classes to mean anything.',
          'Every reported metric sits next to its baseline — the number becomes a verdict.',
        ],
      }),
      [
        [
          'The main reason to hold out a test set is to:',
          [
            'Train faster on less data',
            'Estimate performance on data the model never learned from',
            'Increase the training accuracy',
            'Satisfy a scikit-learn requirement',
          ],
          1,
          'Only unseen data can answer "will it work on the next customer / flower / day?"',
        ],
        [
          'stratify=y in train_test_split ensures:',
          [
            'Rows are sorted by target',
            'Class proportions match the full dataset in both train and test',
            'The target is scaled',
            'Faster convergence',
          ],
          1,
          'Each split keeps the original class mix — essential for honest metrics on imbalanced data.',
        ],
        [
          'A DummyClassifier(strategy="most_frequent") on balanced 3-class data achieves test accuracy of about:',
          ['0.0', '0.33', '0.5', '1.0'],
          1,
          'Always predicting one of three equal classes gets roughly a third right — the bar to beat.',
        ],
        [
          'For a regression problem, a sensible first baseline and metric pair is:',
          [
            'Most_frequent dummy and accuracy',
            'Mean DummyRegressor and MAE',
            'LinearRegression and a confusion matrix',
            'No baseline needed',
          ],
          1,
          'Always-predict-the-mean against mean absolute error — both in the target\'s own units.',
        ],
      ]
    ),
    lesson(
      M10,
      'pyai-10-3',
      3,
      'First Real Models: Linear Regression & a Decision Tree',
      'Fit/predict on real estimators, read coefficients, compare MAE and accuracy against the baselines, and interpret every score honestly.',
      19,
      nineBlocks({
        objectives: [
          'Fit LinearRegression on numeric features and generate test predictions',
          'Fit a DecisionTreeClassifier and score it with accuracy and a confusion matrix',
          'Compare both models against their dummy baselines and state the verdict',
          'Interpret what the metrics do and do not claim about the model',
        ],
        hook:
          'Same three calls for every estimator you will ever meet: instantiate, fit(X_train, y_train), predict(X_test). LinearRegression draws the best straight-line hypersurface through the training points; a DecisionTree asks a cascade of yes/no questions on single features. Two completely different learning strategies, one API — and one honest ritual for reading their scores.',
        concept: `**The estimator ritual.** Every scikit-learn estimator follows:
\`\`\`
model = SomeModel(hyperparameters)
model.fit(X_train, y_train)
preds = model.predict(X_test)
score = some_metric(y_test, preds)
\`\`\`
"Hyperparameters" are the settings you choose BEFORE learning (tree depth, regularization strength); everything the model learns FROM data (coefficients, split rules) are parameters. The API symmetry is deliberate: swap LinearRegression for any estimator and nothing downstream changes.

**Linear regression: the best-fit hyperplane.** \`LinearRegression\` fits coefficients so that \`y ≈ X · coef_ + intercept_\` in the least-squares sense — minimising the average squared residual on TRAIN data. Read the results with care: \`model.coef_\` tells the signed change in y per one-unit feature move, holding others fixed (an ASSOCIATION in the fitted model — not a causal effect without the designs of Lesson 9.3); \`model.score(X_test, y_test)\` is R², the fraction of test-target variance the predictions capture (0 = no better than the mean; 1 = perfect; negative = worse than the mean). MAE remains the interpretable workhorse: error in target units.

**A decision tree classifier, in one breath.** \`DecisionTreeClassifier\` greedily splits the feature space with axis-aligned rules ("petal length ≤ 2.45?") to isolate classes, forming a hierarchy of questions. Strengths: handles any feature mix, no scaling needed, rules are human-readable. Weaknesses (full story next course): deep trees memorise — they overfit. \`random_state\` fixes tie-breaking so results reproduce.

**The honest reading ritual.** For every score, ask: (1) beat the baseline? (2) what does the metric MEAN in domain units — "off by 38 points", "17 of 38 wrong, all between classes 1 and 2"?; (3) how many test cases is the metric built on — 38 flowers is a wide error bar; (4) what does it NOT claim — causality, future-shift robustness, performance on classes absent from training. Print the confusion matrix: a 0.95 accuracy hiding every error in one class pair is a different model than one spreading errors evenly.`,
        extras: [
          table(
            'Two estimators, one ritual',
            ['Step', 'LinearRegression', 'DecisionTreeClassifier'],
            [
              ['Instantiate', 'LinearRegression()', 'DecisionTreeClassifier(random_state=42)'],
              ['Learns', 'coef_ and intercept_ (least squares)', 'Axis-aligned if-then rules'],
              ['predict', 'Continuous values', 'Class labels'],
              ['Default score()', 'R² on the given data', 'Accuracy on the given data'],
              ['Watch out for', 'Extrapolation, collinearity', 'Overfitting deep trees'],
            ],
          ),
          code(
            'from sklearn.datasets import load_diabetes\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.metrics import mean_absolute_error, r2_score\n\nX, y = load_diabetes(return_X_y=True)\nX_train, X_test, y_train, y_test = train_test_split(\n    X, y, test_size=0.25, random_state=42)\n\nlin = LinearRegression().fit(X_train, y_train)\npred = lin.predict(X_test)\nprint(mean_absolute_error(y_test, pred))   # beats the mean baseline?\nprint(r2_score(y_test, pred))              # > 0 means better than the mean',
            'linear.py',
            'python',
          ),
          warn(
            'A high score is not a causal claim',
            'coef_ values and feature importances are associations inside the fitted model. "Feature A drives Y" needs the experimental evidence of Lesson 9.3 — the model cannot supply it.',
          ),
        ],
        worked: {
          title: 'Beat both baselines: regression on diabetes, classification on iris',
          problem:
            'On load_diabetes: fit LinearRegression, compare test MAE and R² against a mean dummy. On iris: fit DecisionTreeClassifier(random_state=42), compare test accuracy against most_frequent, and print the confusion matrix. Write the verdict sentence for each model.',
          steps: [
            {
              title: '1. Regression: model, then baseline, then compare',
              desc: 'One seeded split for both contenders. The linear model should post a clearly smaller MAE than always-predict-the-mean — if it cannot, the features carry no signal.',
              code_snippet: 'from sklearn.datasets import load_diabetes\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.dummy import DummyRegressor\nfrom sklearn.metrics import mean_absolute_error, r2_score\n\nX, y = load_diabetes(return_X_y=True)\nX_train, X_test, y_train, y_test = train_test_split(\n    X, y, test_size=0.25, random_state=42)\n\nlin = LinearRegression().fit(X_train, y_train)\nbase = DummyRegressor(strategy="mean").fit(X_train, y_train)\n\nlin_pred, base_pred = lin.predict(X_test), base.predict(X_test)\nprint(mean_absolute_error(y_test, base_pred), mean_absolute_error(y_test, lin_pred))\nprint(r2_score(y_test, lin_pred))',
            },
            {
              title: '2. Read the linear model',
              desc: 'coef_ holds one signed weight per feature, intercept_ the offset. Diabetes features are pre-centred, so coefficients are directly comparable in relative magnitude — still associations, never causes.',
              code_snippet: 'print(lin.coef_.round(2), lin.intercept_.round(2))',
            },
            {
              title: '3. Classification: tree vs most_frequent',
              desc: 'Stratified split; the dummy sits near 0.33 on balanced iris; the tree uses real features and should land far above it — the verdict is written against 0.33, not against 1.0.',
              code_snippet: 'from sklearn.datasets import load_iris\nfrom sklearn.tree import DecisionTreeClassifier\nfrom sklearn.dummy import DummyClassifier\nfrom sklearn.metrics import accuracy_score, confusion_matrix\n\nXi, yi = load_iris(return_X_y=True)\nXtr, Xte, ytr, yte = train_test_split(\n    Xi, yi, test_size=0.25, random_state=42, stratify=yi)\n\ntree = DecisionTreeClassifier(random_state=42).fit(Xtr, ytr)\nbase_c = DummyClassifier(strategy="most_frequent", random_state=42).fit(Xtr, ytr)\nprint(accuracy_score(yte, base_c.predict(Xte)))   # ~0.33\nprint(accuracy_score(yte, tree.predict(Xte)))     # far above the bar',
            },
            {
              title: '4. The confusion matrix tells WHERE the errors live',
              desc: 'Rows = true classes, columns = predicted. Diagonal = correct; any off-diagonal cell names a specific confusion pair — the detail a single accuracy number hides.',
              code_snippet: 'print(confusion_matrix(yte, tree.predict(Xte)))\n# e.g. [[13  0  0]\n#       [ 0 11  1]\n#       [ 0  0 13]]   — one versicolor/virginica mix-up',
            },
          ],
          solution:
            'Diabetes: LinearRegression posted a clearly lower test MAE than the mean dummy with positive R² — the features earn their keep; coefficients read as signed associations per (already centred) feature. Iris: the tree crushed the ≈0.33 baseline, and the confusion matrix located every error in the versicolor/virginica boundary — exactly the detail accuracy flattens. Both verdicts were written against baselines, in metric units, with the "what this does not claim" clause attached.',
        },
        practice: {
          title: 'Two models, full ritual',
          prompt:
            '(1) Diabetes regression with random_state=42: print baseline MAE, linear MAE and the percentage improvement of the linear over the baseline — one sentence in target units. (2) Iris classification without stratify, random_state=0: tree accuracy vs dummy; then WITH stratify — did the verdict change? (3) Fit DecisionTreeClassifier(max_depth=1) and max_depth=None: compare accuracies and explain the difference using the words "questions per prediction" and "memorise". (4) Print confusion_matrix for both trees and name the class pair that causes every error. (5) Write the honest limitations paragraph (three bullets) you would publish beside these numbers.',
          hint: 'max_depth=1 is a "stump" — one question total; unlimited depth can memorise the training set (overfitting, next course).',
        },
        mistakes: [
          {
            mistake: 'Quoting accuracy without the baseline or class balance',
            fix: '0.92 means nothing until you know the bar (≈0.33 here) and the mix. Always print np.bincount(y_test) and the dummy score beside it.',
          },
          {
            mistake: 'Reading coef_ as causal effects',
            fix: 'Coefficients are fitted associations — they shift with correlated features and unmeasured confounders. Causal language needs Lesson 9.3\'s evidence, not a regression table.',
          },
          {
            mistake: 'Tuning hyperparameters against the test score',
            fix: 'Every max_depth tried "because the test accuracy looked low" trains on the test set indirectly. Tune on a validation split; the test set is the final, rare exam.',
          },
          {
            mistake: 'Stopping at accuracy when errors are asymmetric',
            fix: 'The confusion matrix names which classes get confused. Two models with equal accuracy can have very different, very costly error profiles — look at the matrix.',
          },
        ],
        exam: {
          question:
            'Walk through the estimator API, then compare LinearRegression and DecisionTreeClassifier on: what each learns, its default score(), and the honest interpretation of a high score.',
          answer:
            'The ritual is universal: instantiate with hyperparameters, fit(X_train, y_train) to learn parameters from training data only, predict(X_test), score against y_test. LinearRegression learns coef_ and intercept_ minimising squared training residuals; predictions are continuous; model.score gives R² (variance captured; negative means worse than the mean) and MAE reports typical error in target units. DecisionTreeClassifier learns axis-aligned if-then rules; predictions are class labels; the default score is accuracy, with the confusion matrix showing which classes confuse. A high score honestly means: the model beat its baseline on this held-out sample, by this metric, with this many test cases — and nothing more. It does NOT claim causality (coefficients are associations), future robustness (data may drift), or balanced behaviour (accuracy can hide one-class failure). The publication ritual: baseline score, model score, metric definition in domain units, test-set size, confusion matrix or residual summary, and a limitations paragraph.',
          source: 'The "explain your first model end-to-end" question — this course\'s own capstone rubric in miniature.',
        },
        summary: [
          'Estimator ritual: instantiate → fit(X_train, y_train) → predict(X_test) → metric(y_test, preds).',
          'LinearRegression learns coef_/intercept_ (associations, not causes); score() is R²; MAE is the interpretable metric.',
          'DecisionTreeClassifier learns if-then rules; accuracy + confusion matrix; random_state fixes tie-breaking.',
          'Verdicts are written against the dummy baseline, in domain units, on held-out data only.',
          'The confusion matrix shows WHERE errors live — accuracy alone hides it.',
          'Never tune against the test score — it silently becomes training data.',
        ],
      }),
      [
        [
          'model.fit(X_train, y_train) then model.score(X_test, y_test) for LinearRegression returns:',
          ['Accuracy', 'R² — variance of the test target captured by the predictions', 'MAE', 'The training loss'],
          1,
          'The default score for regressors is R²; use metric functions for MAE/RMSE explicitly.',
        ],
        [
          'lin.coef_ for feature j best describes:',
          [
            'The causal effect of feature j on y',
            'The fitted change in y per one-unit increase in feature j, holding other features fixed — an association',
            'The accuracy contribution of feature j',
            'The feature\'s correlation with the target only',
          ],
          1,
          'A partial-slope association inside the fitted model — causation needs an experimental design.',
        ],
        [
          'DecisionTreeClassifier(random_state=42) uses random_state to:',
          [
            'Shuffle the training data every call',
            'Fix tie-breaking during splits so results reproduce',
            'Seed the train/test split automatically',
            'Randomise feature scaling',
          ],
          1,
          'Trees have internal ties; the seed makes identical data give an identical tree.',
        ],
        [
          'A confusion matrix adds, beyond accuracy, the information of:',
          [
            'Training time',
            'Which true classes were predicted as which — the error structure',
            'Feature correlations',
            'The baseline score',
          ],
          1,
          'Rows = true, columns = predicted: every off-diagonal cell is a named confusion.',
        ],
      ]
    ),
    lesson(
      M10,
      'pyai-10-4',
      4,
      'CAPSTONE: Ship an End-to-End Python-for-AI Notebook',
      'The full pipeline as one deliverable: load, clean with a report, explore with honest charts, split, baseline, model, compare, and publish limitations — plus the artifact bundle.',
      22,
      nineBlocks({
        objectives: [
          'Structure a notebook from question to limitations in a fixed, defensible order',
          'Apply the cleaning pipeline with an explicit defect report before modelling',
          'Produce at least three EDA charts, each with a one-line takeaway',
          'Train a baseline and a real model, compare metrics honestly, and save the output bundle',
        ],
        hook:
          'Everything you have built in ten modules now has to survive contact with one real dataset, in one notebook, that a stranger can run. The capstone is not a new topic — it is the exam: question, load, clean, explore, split, baseline, model, compare, confess. Eight sections, one honest document.',
        concept: `**What "end-to-end" means here.** A Jupyter/Colab notebook that takes a stranger from raw data to a defensible model verdict WITHOUT you in the room. The structure is fixed — deviations need reasons:
1. **The question.** One sentence: what decision does this model inform, and what is the target? ("Predict species from measurements" beats "do ML on iris".)
2. **Load + inspect.** \`pd.read_csv\` or a built-in; the six-readout ritual (Module 6.2): head, shape, dtypes, info, describe, missing counts.
3. **Clean + report.** The Module 8.3 pipeline shape: a function returning (clean_df, report). Every fill, coercion and drop appears in the report dict — printed, not narrated from memory.
4. **EDA — at least three charts.** One distribution (histogram), one relationship (scatter), one category comparison (bars or boxplot) — each carrying its one-line takeaway (Module 7). Honest axes: zero-based bars, disclosed zooms.
5. **Split FIRST.** \`train_test_split(..., random_state=42)\` (+ stratify for classification) BEFORE any learned preprocessing.
6. **Baseline.** The dummy model, scored and recorded.
7. **The real model.** One step up (linear/tree — the honest next tier), fit on train only.
8. **Compare + confess.** Metrics side by side (baseline vs model, in domain units), the confusion matrix or residual summary, and a **limitations paragraph**: test-set size, single-split uncertainty, features that might confound, data drift risk, what you would NOT use this model for. Then save the bundle (Module 8.4): cleaned CSV, metrics.json, figures, in output/.

**Dataset freedom, standard discipline.** Use a built-in (iris, diabetes) or any CSV you cleaned yourself — the grader cares about the PROCESS, not the domain. Swap the estimator if the target demands it (regression → LinearRegression; classification → tree), keep everything else.

**The submission checklist.** (1) Runs top-to-bottom on a fresh kernel; (2) report dict printed; (3) ≥3 labelled charts with takeaways in the notebook text; (4) baseline and model metrics both present; (5) limitations paragraph with at least three honest bullets; (6) output/ bundle files linked or described; (7) random_state used everywhere randomness appears; (8) no cell that depends on manual state.`,
        extras: [
          code(
            'import json\nfrom pathlib import Path\nimport numpy as np\nimport pandas as pd\nimport matplotlib.pyplot as plt\nfrom sklearn.datasets import load_iris\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.dummy import DummyClassifier\nfrom sklearn.tree import DecisionTreeClassifier\nfrom sklearn.metrics import accuracy_score, confusion_matrix\n\n# 1. Question: predict iris species from the four measurements.\n# 2. Load + inspect\ndf = load_iris(as_frame=True).frame\nprint(df.head(), df.shape)\nprint(df.isna().sum().sum())          # 0 missing — still report it\n\n# 3. Clean + report (trivial here; the shape is the point)\nreport = {"rows_in": len(df), "missing_filled": 0, "dupes_removed": int(df.duplicated().sum())}\ndf = df.drop_duplicates().reset_index(drop=True)\nprint(report)\n\n# 4. EDA — distribution, relationship, category\nfig, axes = plt.subplots(1, 3, figsize=(14, 4))\nfor species in df["target"].unique():\n    axes[0].hist(df.loc[df["target"] == species, "petal length (cm)"], alpha=0.5, label=str(species))\naxes[0].set_title("Petal length separates species (takeaway)")\naxes[0].legend()\naxes[1].scatter(df["petal length (cm)"], df["petal width (cm)"], c=df["target"], cmap="viridis")\naxes[1].set_title("Petal length vs width: clusters (takeaway)")\nmeans = df.groupby("target")["sepal width (cm)"].mean()\naxes[2].bar(means.index.astype(str), means.values)\naxes[2].set_title("Mean sepal width per class (takeaway)")\nfig.tight_layout()\nplt.show()\n\n# 5. Split first\nX = df.drop(columns="target")\ny = df["target"]\nX_train, X_test, y_train, y_test = train_test_split(\n    X, y, test_size=0.25, random_state=42, stratify=y)\n\n# 6. Baseline\nbase = DummyClassifier(strategy="most_frequent", random_state=42).fit(X_train, y_train)\nbase_acc = accuracy_score(y_test, base.predict(X_test))\n\n# 7. Real model\ntree = DecisionTreeClassifier(random_state=42).fit(X_train, y_train)\ntree_acc = accuracy_score(y_test, tree.predict(X_test))\n\n# 8. Compare + confess + save\nprint("baseline", round(base_acc, 3), "tree", round(tree_acc, 3))\nprint(confusion_matrix(y_test, tree.predict(X_test)))\nout = Path("output"); out.mkdir(exist_ok=True)\nwith (out / "metrics.json").open("w", encoding="utf-8") as f:\n    json.dump({"baseline_acc": base_acc, "tree_acc": tree_acc, "n_test": len(y_test)}, f, indent=2)\ndf.to_csv(out / "iris_clean.csv", index=False)\n# Limitations (in the markdown cell): one 38-row test split, all features numeric & clean,\n# species measured under lab conditions — do not deploy on field photographs.',
            'capstone-skeleton.py',
            'python',
          ),
          tip(
            'A notebook a stranger can run',
            'Restart & Run All before submission. Any cell that errors, depends on clicking around, or hides a manual step fails the capstone.',
          ),
          warn(
            'The limitations paragraph is graded too',
            'Empty or generic limitations ("the model could be better") fail the honesty standard. Name test size, split variance, confounds you suspect, and a concrete misuse you forbid.',
          ),
        ],
        worked: {
          title: 'The capstone skeleton, section by section',
          problem:
            'Assemble the full eight-section notebook on iris (the code block above is the running script version). Focus on the decisions: what each section MUST contain, where honesty is enforced, and how the bundle is saved.',
          steps: [
            {
              title: '1. Sections 1–3: question, load, clean with a report',
              desc: 'State the question in one sentence; run the inspection ritual even when the data is clean (the zero IS a finding); return a report dict from the cleaning step.',
              code_snippet: 'df = load_iris(as_frame=True).frame\nreport = {"rows_in": len(df),\n          "missing": int(df.isna().sum().sum()),\n          "dupes_removed": int(df.duplicated().sum())}\ndf = df.drop_duplicates().reset_index(drop=True)\nprint(report)',
            },
            {
              title: '2. Section 4: three charts, three takeaways',
              desc: 'Histogram (distribution), scatter (relationship), bar of group means (category) — each title states the FINDING, axes carry units, bars start at zero.',
              code_snippet: 'fig, axes = plt.subplots(1, 3, figsize=(14, 4))\nfor species in df["target"].unique():\n    axes[0].hist(df.loc[df["target"] == species, "petal length (cm)"], alpha=0.5, label=str(species))\naxes[0].set_title("Petal length separates species (takeaway)")\naxes[0].legend()\naxes[1].scatter(df["petal length (cm)"], df["petal width (cm)"], c=df["target"], cmap="viridis")\naxes[1].set_title("Petal length vs width: clusters (takeaway)")\nmeans = df.groupby("target")["sepal width (cm)"].mean()\naxes[2].bar(means.index.astype(str), means.values)\naxes[2].set_title("Mean sepal width per class (takeaway)")\nfig.tight_layout()\nplt.show()',
            },
            {
              title: '3. Sections 5–7: split, baseline, model',
              desc: 'X drops the target; the stratified seeded split happens BEFORE fitting; the dummy is scored first; the tree follows — same split, same metric, side by side.',
              code_snippet: 'X = df.drop(columns="target"); y = df["target"]\nX_train, X_test, y_train, y_test = train_test_split(\n    X, y, test_size=0.25, random_state=42, stratify=y)\n\nbase = DummyClassifier(strategy="most_frequent", random_state=42).fit(X_train, y_train)\ntree = DecisionTreeClassifier(random_state=42).fit(X_train, y_train)\nprint("baseline", accuracy_score(y_test, base.predict(X_test)))\nprint("tree    ", accuracy_score(y_test, tree.predict(X_test)))',
            },
            {
              title: '4. Section 8: compare, confess, save the bundle',
              desc: 'Metrics json + clean CSV on disk; the limitations paragraph names test size, single-split noise, and a forbidden use. The notebook is the story; the bundle is the evidence.',
              code_snippet: 'print(confusion_matrix(y_test, tree.predict(X_test)))\nout = Path("output"); out.mkdir(exist_ok=True)\nwith (out / "metrics.json").open("w", encoding="utf-8") as f:\n    json.dump({"baseline_acc": accuracy_score(y_test, base.predict(X_test)),\n               "tree_acc": accuracy_score(y_test, tree.predict(X_test)),\n               "n_test": len(y_test)}, f, indent=2)\ndf.to_csv(out / "iris_clean.csv", index=False)',
            },
          ],
          solution:
            'Eight sections, one notebook: the question sentence; the inspection ritual (with the report dict); three honest charts with takeaways in their titles; the seeded stratified split; the dummy baseline; the decision tree; metrics side by side with the confusion matrix; and the saved bundle plus a limitations paragraph that names test size and a forbidden use. Every module of this course appears exactly once in the pipeline it was written for — that is what "end-to-end" means.',
        },
        practice: {
          title: 'Ship yours',
          prompt:
            'Pick your dataset (built-in or a CSV you cleaned yourself; regression targets welcome — swap in LinearRegression and MAE). Produce the notebook with all eight sections and the submission checklist satisfied: runs top-to-bottom on a fresh kernel; cleaning report printed; ≥3 charts with takeaways; baseline + model metrics; confusion matrix (classification) or residual plot (regression); limitations paragraph of ≥3 specific bullets; output/ bundle saved. Before submitting, write the sentence you would say out loud in a placement interview when asked "what does your model\'s number mean?" — if the sentence needs the word "amazing", rewrite it.',
          hint: 'Keep the section order exactly; graders look for the ritual, not novelty. MAE in target units and "beat the baseline by X%" make regression verdicts concrete.',
        },
        mistakes: [
          {
            mistake: 'Modelling before splitting — or cleaning after',
            fix: 'Order is load → clean → EDA → SPLIT → fit. Anything learned from data (fills, scalers, feature choice) is fitted on train only, after the split.',
          },
          {
            mistake: 'Charts with no takeaway sentence',
            fix: 'A chart without a finding is decoration. Write the one-line takeaway in the title or the cell below — if you cannot, the chart answered no question.',
          },
          {
            mistake: 'Reporting the model score without the baseline',
            fix: 'The dummy score is one line of code and the entire interpretive frame. Omitting it makes "92%" a rumour.',
          },
          {
            mistake: 'A limitations section that is boilerplate',
            fix: 'Name the actual constraints: n_test = 38; one split, no cross-validation; lab-measured features; class X never confused with Y. Generic humility is not honesty.',
          },
        ],
        exam: {
          question:
            'Lay out the eight sections of an end-to-end ML notebook and state the honesty rule enforced inside each.',
          answer:
            '(1) Question — one sentence naming the decision, target and features; no vague "do ML". (2) Load + inspect — the six-readout ritual; a zero-defect report is still a report. (3) Clean + report — a function returning (data, report); every fill/drop counted, never silent. (4) EDA — ≥3 charts matched to questions (hist/scatter/bar), each with a one-line takeaway; honest axes. (5) Split — train_test_split with random_state (+ stratify), BEFORE any learned preprocessing: the anti-leakage rule. (6) Baseline — dummy model scored first: the bar. (7) Model — one honest step up, fit on train only. (8) Compare + confess + save — baseline vs model in domain units, confusion matrix/residuals, a limitations paragraph naming test size and real risks, and the output/ bundle (clean CSV, metrics.json, figures). The overall honesty rule: every number traceable to a file and a seeded step; every claim scoped to what a 20–30% holdout can support.',
          source: 'The capstone rubric question — expect it, in substance, in any data-science interview.',
        },
        summary: [
          'Capstone order: question → load/inspect → clean+report → EDA (≥3 honest charts) → split → baseline → model → compare+confess+save.',
          'The cleaning report dict and the seeded split are graded artefacts, not suggestions.',
          'Charts carry takeaways; bars start at zero; every random step uses random_state.',
          'Baseline score and model score travel together, in domain units, on held-out data.',
          'Limitations name test size, split variance, confounds and a forbidden use — specific or nothing.',
          'The notebook is the story; the output/ bundle is the evidence.',
        ],
      }),
      [
        [
          'In an end-to-end ML notebook, the correct order is:',
          [
            'Split, clean, model, EDA',
            'Clean, EDA, split, fit baseline and model',
            'Model, tune, then split',
            'EDA only, modelling by hand later',
          ],
          1,
          'Clean and explore first, split BEFORE fitting, then baseline and model on the train side.',
        ],
        [
          'The cleaning section of the capstone must contain:',
          [
            'A printed report of every fill, coercion and drop',
            'Only a markdown apology for dirty data',
            'Manual edits with no code',
            'Nothing — cleaning is assumed',
          ],
          0,
          'The report dict is the audit trail; silent cleaning is invisible cleaning.',
        ],
        [
          'Why is the dummy baseline scored before the real model?',
          [
            'It trains faster so the notebook looks busy',
            'It sets the bar — a model that cannot beat "always the majority/mean" adds no value',
            'scikit-learn requires it',
            'It replaces the confusion matrix',
          ],
          1,
          'The dummy quantifies the no-features-used score; every model verdict is written against it.',
        ],
        [
          'A strong limitations paragraph for a 38-row test split should:',
          [
            'Say "more data would help" and stop',
            'Name the test size, single-split uncertainty, suspected confounds and a concrete forbidden use',
            'Claim the model generalises to all domains',
            'Omit numbers to stay humble',
          ],
          1,
          'Specific, scoped confessions are the graded honesty standard — generic humility is not.',
        ],
      ]
    ),
  ],
};
