// Module 2 — Data Prep & EDA for ML
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code } from '../nineBlocks';
import { lesson, M2, COURSE_ID } from './helpers';

export const module2: CourseModule = {
  id: M2,
  course_id: COURSE_ID,
  title: 'Module 2 — Data Prep & EDA for ML',
  summary:
    'Exploration that serves modelling rather than decoration; missing-value strategies and their biases; categorical encoding and feature scaling with clear rules for when each matters; class-imbalance survival skills; and honest splitting — stratified, time-based, and group-aware — with the leakage traps that hide inside bad splits.',
  sort_order: 2,
  lessons: [
    lesson(
      M2,
      'mlf-2-1',
      21,
      'Exploratory Data Analysis That Actually Matters for ML',
      'How to explore a dataset in service of a model: target distribution, feature–target relationships, quality bugs, split integrity, and the leakage hunt — without drowning in decorative plots.',
      20,
      nineBlocks({
        objectives: [
          'State the four questions EDA must answer before any modelling begins',
          'Choose plots and summaries for univariate and bivariate analysis that directly inform modelling choices',
          'Detect target imbalance, impossible values, duplicates, and suspicious feature–target separation from EDA outputs',
          'Design an EDA checklist that can be run on any new tabular dataset in under an hour',
        ],
        hook:
          'The notebook has 47 beautiful plots. Rainbow heatmaps, a 3-D surface nobody can read, a word cloud. The model inside it still fails. Meanwhile a five-plot notebook elsewhere — target histogram, two boxplots, one scatter, one missingness bar chart — catches a leaking feature and an 18:1 class imbalance before they poison a single metric. EDA is not art; it is reconnaissance. The question is never "is this plot pretty?" but "does this change what I will do next?"',
        concept: `**EDA has four jobs, not forty plots.** Exploratory data analysis for ML is a mission with a fixed objective list: (1) understand the **target** — its distribution, its balance, its quirks; (2) understand **feature–target relationships** — which features carry signal, in what shape; (3) find **data quality landmines** — missingness, impossible values, outliers, duplicates, inconsistent types; (4) verify **split integrity and leakage risks** — do duplicates straddle splits? Does any feature separate the target suspiciously well? Anything that does not serve one of these four jobs is decoration. A senior practitioner\'s EDA is often shorter than a beginner\'s precisely because every cell answers a modelling question.

**Start with the target, always.** Before any feature plot, plot or tabulate the label. For classification: class counts and ratios — is this 50:50 or 99:1? That single number decides your metric (accuracy vs F1/PR-AUC), your splitting strategy (stratified or not), and your training recipe (class weights, resampling). For regression: the histogram — is the target skewed (prices, durations, incomes usually are)? A log-transform of a heavy-tailed target often turns a model\'s biggest misses into its best work; decide this in EDA, not after a bad submission. Also check the target over time: if label rates drift across the data\'s history, a random split will lie to you and a time split is mandatory.

**Then feature–target relationships, cheaply first.** For numeric features vs a numeric target: scatter plots (sample if n is huge) plus the correlation matrix — remember Pearson correlation only catches *linear* association, so a feature with near-zero Pearson can still be strongly predictive in a nonlinear way; trees and plots will reveal that. For categorical features vs a numeric target: boxplots of the target per category level — which levels matter, which are noise, which have tiny support. For categorical vs categorical: cross-tabulations and class rates per level (e.g., churn rate per contract type). The outputs feed concrete decisions: which features to keep, whether a category needs grouping ("other"), whether a log transform is warranted, whether interactions are obvious (a feature that only matters for one segment). Resist profiling every column equally — profile the ones that will be features, against the target.

**Data quality: the unglamorous gold.** EDA is where the dataset\'s lies surface. Impossible values: age = 212, negative fare, delivery duration = 0 minutes, temperature = 900°C — usually data-entry or unit bugs, and each one silently corrupts a linear model\'s fit. Duplicate rows: exact duplicates may be genuine repeats or copy-paste errors; near-duplicates with different labels are label noise. Mixed types in one column ("12", "twelve", "N/A"). String whitespace and case variants in categoricals ("Mumbai " ≠ "mumbai" ≠ "MUMBAI") — a classic source of phantom categories. Constant columns (zero variance) that add nothing but dimension. And missingness — which deserves its own lesson, but in EDA you at least map *how much* is missing per column and whether missingness correlates with the target (missing-not-at-random in disguise).

**Split integrity and the leakage hunt.** Two EDA moves protect the evaluation before it exists. First, **duplicate/near-duplicate detection across entities**: group by patient ID, user ID, or content hash and ask whether one entity could land in two splits — fix with group-aware splitting. Second, **the suspiciously-perfect feature scan**: train a one-feature model per feature (or simply plot feature vs target separation) and look for anything with near-perfect separation. Sometimes it is genuine (a rule-derived feature); most often it is the answer in costume — an ID, a post-outcome statistic, a process artifact. Also compare distributions across time slices or source systems: if feature distributions differ between, say, 2023 and 2024 rows, decide deliberately whether your split should respect time.

**The one-hour EDA checklist for any new table.** 1) Shape, dtypes, memory; 2) head + sample rows (eyeball for weirdness); 3) missingness % per column, sorted; 4) constant and near-constant columns; 5) target distribution (counts or histogram); 6) numeric ranges vs plausibility; 7) categorical cardinality (levels per categorical — high cardinality needs a plan); 8) duplicate check (exact and by entity); 9) top correlations with target; 10) 2–4 relationship plots that answer your biggest modelling questions; 11) time-slice sanity check. That list catches most silent killers in under an hour — and it is worth more than a hundred decorative charts.`,
        extras: [
          table(
            'EDA question → evidence → decision',
            ['Question', 'Evidence to collect', 'Decision it drives'],
            [
              ['Is the target balanced/skewed?', 'Class counts or target histogram', 'Metric choice, stratification, class weights, log-transform'],
              ['Which features carry signal?', 'Correlations, boxplots of target per category, feature importance preview', 'Feature selection, encoding plan, interaction terms'],
              ['Is the data dirty?', 'Range checks, mixed dtypes, whitespace/case variants, duplicates', 'Cleaning rules, dedup before split, type fixes'],
              ['Will my split lie to me?', 'Entity grouping, time slices, distribution comparisons', 'Time-based or group-based splitting instead of random'],
              ['Is anything too good?', 'Per-feature separation vs target, post-hoc feature traces', 'Leakage quarantine before any model is trained'],
            ],
          ),
          warn(
            'Correlation is not a feature-importance certificate',
            'Pearson correlation misses nonlinear signal and is fooled by outliers; two correlated features do not necessarily both deserve removal. Use correlations to find candidates, then confirm with plots and model-based checks.',
          ),
          tip(
            'Sample smart for big data',
            'On 50 million rows, plot a stratified sample (keep class ratios) rather than the first million rows — the head of a file is often not a random slice of the world.',
          ),
        ],
        worked: {
          title: 'EDA reconnaissance on a loan-application table',
          problem:
            'A bank gives you a 10,000-row loan table (defaulters ≈ 9%). Walk the one-hour checklist, interpret findings, and list the modelling decisions each finding forces.',
          steps: [
            {
              title: 'Target first',
              desc: 'Class counts: 9,100 no-default / 900 default (9%). Decision: accuracy is a trap (91% by predicting "no default"); use recall/precision for the default class, PR-AUC as the headline metric; enable stratified splitting.',
            },
            {
              title: 'Ranges and quality',
              desc: 'age has max 212 (3 rows) — impossible values, likely typos; income has 40 zeros — could be real (homemaker?) or missing-as-zero, check with domain; 12 exact duplicate rows; three categorical columns contain case/whitespace variants. Decision: fix or drop impossible rows, treat zero-income deliberately, deduplicate before splitting, normalise category strings.',
            },
            {
              title: 'Missingness',
              desc: 'credit_history_months missing in 18% of rows; missingness rate is 34% among defaulters vs 16% among non-defaulters. Decision: missingness is informative — add a "was_missing" indicator rather than blind mean imputation; note for Module 2.2.',
            },
            {
              title: 'Relationships',
              desc: 'Boxplots: defaulters show higher debt-to-income; contract_type=default_rate table: "revolver" contracts default at 21% vs 4% for "term". One feature, previous_application_decision, perfectly separates targets (all 900 defaulters coded 1). Decision: keep debt-to-income and contract_type; immediately audit previous_application_decision — near-perfect separation screams leakage (it may encode the outcome of a later process).',
            },
            {
              title: 'Split integrity',
              desc: 'Entity check: 260 applicants appear twice with overlapping rows. Decision: use GroupShuffleSplit on applicant_id, or dedupe to one row per applicant; do not let the same person sit in train and test.',
            },
          ],
          solution:
            'The checklist surfaced an imbalance that rewrites the metric plan, dirty rows that would distort fits, informative missingness that changes the imputation strategy, a probable leaking feature caught before training, and an entity duplication that would have contaminated the test set. None of that required a single decorative plot — every finding changed a decision.',
        },
        practice: {
          title: 'Run the checklist on a real dataset',
          prompt:
            'Take any tabular dataset (Titanic, Ames housing, or your own). Complete the eleven checklist items in writing. For each finding, state the modelling decision it forces. Cap the whole exercise at one hour and five plots maximum — discipline is part of the skill.',
          hint: 'If a plot does not answer "what will I do differently because of this?", delete it.',
        },
        mistakes: [
          {
            mistake: 'Producing exhaustive per-column profiling that never touches the target',
            fix: 'Anchor EDA on the label: its distribution first, then feature–target relationships. A column\'s story matters only insofar as it predicts or corrupts the target.',
          },
          {
            mistake: 'Trustingly keeping features that separate the target too well',
            fix: 'Near-perfect separation triggers a leakage audit (computation vs prediction timeline), not celebration. Legitimate near-separators are rare; leaked answers are common.',
          },
          {
            mistake: 'Ignoring entity overlap and time structure until after bad metrics',
            fix: 'Check duplicates-by-entity and time slices during EDA — they determine the split strategy, and no amount of later tuning fixes a contaminated split.',
          },
          {
            mistake: 'Treating EDA as one giant notebook nobody can rerun',
            fix: 'Distil EDA into a rerunnable script/checklist of the ~11 core checks, plus a few bespoke plots for the project\'s real questions. Reproducible reconnaissance beats artistic exploration.',
          },
        ],
        exam: {
          question:
            'You EDA a churn dataset: 2% positive class, and one feature "service_cancelled_date" is null for all active customers and filled for 98% of churners. What did EDA just reveal, and what are your next three actions?',
          answer:
            'Two revelations: (1) severe class imbalance — accuracy is meaningless; move to recall/precision or PR-AUC, use stratified splits, and plan class weighting or threshold tuning. (2) A leaky feature — service_cancelted_date is downstream of the churn event itself (it records the churn); as a feature it would encode the label. Next actions: (a) remove it from X (and any features derived from it, like days_since_cancel); (b) run the label-shuffle test on the cleaned pipeline to confirm no other side channel remains; (c) re-run EDA-lite and train with imbalance-aware metrics and stratified/group/time-appropriate splitting as dictated by the data\'s timeline.',
          source: 'Realistic EDA-then-modelling scenario in product-analytics interviews.',
        },
        summary: [
          'EDA serves four jobs: understand the target, map feature–target signal, expose quality landmines, and protect split integrity.',
          'Target distribution first — it dictates metrics, transforms, and stratification.',
          'Impossible values, duplicates, case variants, and mixed types silently corrupt models; hunt them before training.',
          'Perfect feature–target separation is a leakage alarm, not a win.',
          'Entity overlap and time slices must be checked in EDA because they decide the split strategy.',
          'The one-hour checklist beats the 47-plot notebook — every check must change a decision.',
        ],
      }),
      [
        [
          'Why should EDA start with the target variable rather than the features?',
          [
            'Feature plots are harder to draw',
            'The target\'s distribution dictates metrics, transforms, and splitting strategy — the plan for everything else',
            'Libraries plot targets automatically',
            'Features do not matter in ML',
          ],
          1,
          'Class balance or target skew changes the metric, the split, and the training recipe; those decisions gate all later work.',
        ],
        [
          'A feature separates the target almost perfectly (AUC of a one-feature model ≈ 0.995). The correct first reaction is:',
          [
            'Deploy the one-feature model immediately',
            'Audit it for leakage — such separation usually means the answer is encoded in the feature',
            'Delete all other features',
            'Switch to deep learning',
          ],
          1,
          'Genuine near-separation is rare; post-outcome or process-derived features are common. Audit before you celebrate.',
        ],
        [
          'During EDA you find 12 exact duplicate rows in a dataset you were about to randomly split. You should:',
          [
          'Ignore them — duplicates add robustness',
          'Deduplicate before splitting, and check entity-level overlap with a group-aware split',
          'Keep them only in the test set',
          'Duplicate the test set too, to match',
          ],
          1,
          'Duplicates (or the same entity in both splits) let the model recognise rather than generalise; clean and split with entity integrity.',
        ],
        [
          'The most valuable output of a one-hour EDA is:',
          [
            'A gallery of colourful plots',
            'A short list of findings, each tied to a specific modelling decision',
            'A word cloud of text columns',
            'The exact list of algorithms to use',
          ],
          1,
          'EDA is reconnaissance: each finding (imbalance, leak, skew, dirty rows) must change a decision, or it was decoration.',
        ],
      ]
    ),
    lesson(
      M2,
      'mlf-2-2',
      22,
      'Missing Values: Strategies, Biases, and the Indicator Trick',
      'Why rows disappear from datasets, why listwise deletion is usually a trap, and how mean/median/mode, model-based imputation, and missingness indicators each earn (or lose) their place — with the train-only fitting rule that prevents leakage.',
      20,
      nineBlocks({
        objectives: [
          'Explain MCAR, MAR, and MNAR in plain language and give an example of each',
          'Compare at least four missing-value strategies and state when each is appropriate',
          'Compute train-fitted vs full-data mean imputation and show why the latter leaks',
          'Add and interpret a missingness indicator feature and say when it carries signal',
        ],
        hook:
          'Two teams see the same gap: 30% of "annual_income" is missing. Team A drops those rows and loses the entire lower-income segment — their model quietly becomes a model for people who fill in forms completely. Team B mean-imputes and moves on; their model treats a missing income exactly like an average income, and the missingness — which clustered in first-time applicants — vanishes as information. Neither team was lazy; both made a *silent* choice. Missing data is not a technical nuisance to be filled and forgotten; it is a signal about how the world was recorded.',
        concept: `**Missingness has a mechanism, and the mechanism picks your strategy.** Statisticians sort missing data into three families, and the intuition matters far more than the names. **MCAR** (missing completely at random): the gap has nothing to do with anything — a sensor dropped a packet by cosmic noise; survey pages fell out. Rare in practice, and the friendliest case: any imputation is roughly unbiased (you still lose precision). **MAR** (missing at a related observable): missingness depends on other columns you *do* have — income is missing more often for applicants who left the employer field blank, or test results are missing more often for patients who arrived after hours. MAR is common, and once you include the related observables, imputation can be principled. **MNAR** (missing not at random): the gap depends on the missing value itself — high earners refuse to state income; people with damaging search history decline cookies. MNAR is everywhere and cannot be fully fixed by any imputer; you handle it with explicit missing categories, sensitivity checks, and honesty in the write-up. Choosing a strategy without asking *why the cell is empty* is guessing with extra steps.

**Deletion is a decision, usually a bad one.** Dropping rows with any missing feature (listwise deletion) is the default of many tools and a classic source of silent bias: it shrinks n, and if missingness correlates with anything (it usually does), it *changes the population* your model is trained on. Dropping a column that is 40% missing can be right — if the missingness mechanism is opaque and the feature is weak — but "high missingness" alone is not a conviction; a 40%-missing feature with strong signal and a good indicator can outperform a complete useless one. Always report how many rows/columns each strategy sacrifices, and check whether the dropped rows differ from the kept ones on the target rate.

**The imputation menu, with honest trade-offs.** **Mean/median imputation** (numeric): fast, unbiased under MCAR for the mean; shrinks variance toward the imputed value (your model sees less spread than reality) and creates a spike at the imputed value visible in histograms. Median is the robust default for skewed features. **Mode imputation** (categorical): the same idea for levels; can invent a "majority-level" bias in sparse categories. **Constant / domain defaults** ("unknown" category for categorical; 0 for "number of prior complaints" where zero is plausible): often the most honest option because the fill value itself carries meaning. **Model-based imputation** (k-nearest-neighbour impute, iterative/MICE-style): uses other features to predict the gap; better fidelity, more compute, more pipeline complexity, and it must still be fitted on train only. **Deletion with eyes open**: for tiny, demonstrably MCAR gaps (<1–2%), dropping rows is defensible. There is no universally best cell; there is the best cell *given the mechanism and the feature\'s role*.

**The indicator trick: missingness is often the message.** Add a binary companion feature — income_was_missing = 1 if income was NaN at read time, else 0 — before imputing. If missingness correlates with the target (MAR/MNAR), the indicator preserves that signal that imputation erases. In real tabular work this one line frequently outperforms fancier imputers; tree boosters like LightGBM/XGBoost even handle NaN natively by learning default directions at splits, effectively doing indicator-aware routing internally. That is a major reason gradient boosting dominates messy business tables.

**The leakage rule that overrides everything: fit imputers on train, only train.** The fill value is data-dependent (mean, median, mode, model parameters). Computing it on the full dataset before splitting leaks holdout distribution into training. Compute the mean on the training fold; apply that frozen mean to train, validation, and test. In scikit-learn this is the SimpleImputer inside a Pipeline — and it is not ceremony; it is the difference between a number you can defend in a review and a quietly inflated offline score.`,
        extras: [
          table(
            'Strategy menu',
            ['Strategy', 'Works for', 'Main risk', 'When to prefer'],
            [
              ['Drop rows', 'Any, if gaps are tiny and truly MCAR', 'Population bias + lost data', '<1–2% missing, verified MCAR'],
              ['Mean/median/mode', 'Numeric / numeric / categorical', 'Shrinks variance; invents a spike', 'MAR with related columns included, quick baseline'],
              ['Domain default / "unknown" category', 'Both', 'None, if the default is meaningful', 'Missingness is meaningful (income unknown, no history)'],
              ['Model-based (kNN/iterative)', 'Numeric-heavy tables', 'Complexity; still must fit on train', 'High-value feature with recoverable structure'],
              ['Native NaN handling (LightGBM/XGBoost)', 'Boosting models', 'Not available for linear models/kNN', 'Tree pipelines over messy tabular data'],
            ],
          ),
          code(
            '# Imputation fitted on train only — no leakage\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.compose import ColumnTransformer\nfrom sklearn.impute import SimpleImputer\nfrom sklearn.preprocessing import StandardScaler\n\nnum_pipe = Pipeline([\n    ("impute", SimpleImputer(strategy="median")),   # fit on train fold only\n    ("scale", StandardScaler()),\n])\ncat_pipe = Pipeline([\n    ("impute", SimpleImputer(strategy="constant", fill_value="unknown")),\n    ("onehot", OneHotEncoder(handle_unknown="ignore")),\n])\n\nprep = ColumnTransformer([("num", num_pipe, num_cols), ("cat", cat_pipe, cat_cols)])\n# prep.fit(X_train)  <- statistics come from train; transform applies them everywhere',
            'impute_pipeline.py',
            'python'
          ),
          tip(
            'Before imputing, groupby the target',
            'Compare the target rate/value for rows where the feature is missing vs present. If it differs materially, keep an indicator (or a dedicated category) — the gap itself is predictive.',
          ),
        ],
        worked: {
          title: 'Train-fitted vs full-data imputation, with numbers',
          problem:
            'Training incomes: [40, 50, 60, NaN]; test income: [100]. Compute the test prediction error under (a) full-data mean imputation (leaky) and (b) train-only mean imputation (correct) for a model that predicts "spend = income × 0.5", and compute the resulting test error for true spend 80.',
          steps: [
            {
              title: '(a) Leaky path: mean over everything',
              desc: 'Full-data mean = (40+50+60+100)/4 = 62.5 — note the test value 100 sat inside the average. Imputed train: [40,50,60,62.5]. Model on train only uses the relationship spend = 0.5×income; on the test row, income=100 → spend_hat = 50. But suppose the "model" here is just the mean-imputed feature feeding a trivial rule; the leak to highlight: any statistic (mean, variance, scaling) computed with 100 in it has already absorbed test information into training-side arithmetic.',
            },
            {
              title: '(b) Correct path: mean over train only',
              desc: 'Train mean = (40+50+60)/3 = 50. Imputed train: [40,50,60,50]; the NaN slot gets 50 — no test value involved. Test row: income=100, spend_hat = 0.5×100 = 50. True spend 80 → error |50−80| = 30 — an honest error, produced by an honest pipeline.',
            },
            {
              title: 'See the difference',
              desc: 'In this toy case the final test prediction happens to match because the model form was fixed; the leak\'s damage appears in *statistics and learned parameters* (here the imputed value 62.5 vs 50; in real models: scaled means, variances, learned coefficients). Across many rows, leaky preprocessing systematically flatters offline metrics. The rule stands regardless of any single row: fit every data-dependent transform on train, only train.',
            },
            {
              title: 'Add the indicator',
              desc: 'If NaN-income rows defaulted 3× more often in training, append income_was_missing ∈ {0,1}. Imputation fills the number; the indicator keeps the meaning of the gap.',
            },
          ],
          solution:
            'Train-only mean = 50, applied frozen everywhere; full-data mean = 62.5 leaks the test value into training-side statistics. The fix is procedural (fit on train, inside a Pipeline), and the indicator feature preserves whatever signal the gap itself carried.',
        },
        practice: {
          title: 'Strategy decision for three real gaps',
          prompt:
            'For each scenario, name the likely mechanism (MCAR/MAR/MNAR), your strategy, and one check you would run to validate the choice: (a) 5% of sensor readings randomly absent; (b) 35% of "years of experience" missing, concentrated among fresh graduates; (c) 25% of "salary" missing, concentrated among senior staff.',
          hint: '(b) and (c) smell MAR/MNAR — the observables or the values themselves predict the gap; an "unknown" handling plus indicator is likely better than a bare mean.',
        },
        mistakes: [
          {
            mistake: 'Blind listwise deletion on any row with any NaN',
            fix: 'Quantify what (and who) you lose; compare target rates of dropped vs kept rows; only delete when gaps are tiny and plausibly MCAR.',
          },
          {
            mistake: 'Computing imputation statistics on the full dataset before splitting',
            fix: 'Fit the imputer on the training fold inside a Pipeline; the frozen statistics then transform validation and test without peeking.',
          },
          {
            mistake: 'Mean-imputing a categorical or a heavily skewed numeric feature',
            fix: 'Categories get mode, "unknown", or a dedicated level; skewed numerics prefer median — and check whether the mean is even a plausible value for that column.',
          },
          {
            mistake: 'Discarding a high-missingness feature without checking its signal',
            fix: 'Compare target rates by missingness, try the indicator, and only then drop. A 40%-missing predictive feature with a good indicator often beats a complete noisy one.',
          },
        ],
        exam: {
          question:
            'Define MCAR, MAR, and MNAR in plain language. For a dataset where "annual_income" is missing twice as often among defaulters as among non-defaulters, argue the mechanism and give a concrete handling plan.',
          answer:
            'MCAR: gaps unrelated to any data — random sensor dropout. MAR: gaps explained by other observed columns (e.g., income missing more when employment_type is blank). MNAR: gaps depend on the missing value itself (e.g., high earners withholding income). Here the gap correlates with the target via observed rows, so at minimum MAR — plausibly MNAR if high incomes are withheld. Plan: (1) add income_was_missing indicator — the 2× difference means the gap is predictive; (2) impute with median fitted on train only (or an "unknown" bucket for extreme policy); (3) if using a booster, exploit native NaN handling; (4) report model performance separately for the missing-income subgroup — the indicator helps only if evaluation shows it works there too.',
          source: 'Frequent statistics-flavoured ML interview question at banks and health-analytics firms.',
        },
        summary: [
          'Mechanism first: MCAR, MAR, MNAR determine what any imputation can honestly claim.',
          'Deletion shrinks and biases the population — use only for tiny, plausibly random gaps.',
          'Mean/median/mode are baselines, not truths; they shrink variance and invent spikes.',
          'The missingness indicator often carries the real signal — check target rates by gap before imputing.',
          'Boosters handle NaN natively (learned default directions); linear models and kNN do not.',
          'Fit imputers on the training fold only — full-dataset statistics are leakage.',
        ],
      }),
      [
        [
          'Income is missing more often when the "employment_type" field is blank. This pattern is best described as:',
          ['MCAR', 'MAR — missingness explained by other observed columns', 'MNAR — missingness depends on the income value itself', 'Data leakage'],
          1,
          'The gap is explained by another column you observe (employment_type), the textbook MAR situation.',
        ],
        [
          'The main risk of mean-imputing a numeric feature is:',
          [
            'It is computationally too expensive',
            'It shrinks variance, spikes the distribution at the mean, and erases the gap\'s signal (unless an indicator is kept)',
            'It automatically causes data leakage',
            'It only works for categorical data',
          ],
          1,
          'Imputed values are less spread than reality, and the meaning of "was missing" disappears without an indicator.',
        ],
        [
          'Imputation statistics (mean/median) must be computed:',
          ['On the full dataset, before splitting', 'On the training fold only, then applied frozen to validation/test', 'On the test set only', 'On a random half of the data'],
          1,
          'Data-dependent transforms fitted on the full dataset leak holdout information into training.',
        ],
        [
          'Which model family commonly handles NaN values natively by learning default directions at splits?',
          ['Linear regression', 'k-NN', 'Gradient-boosted trees (LightGBM/XGBoost)', 'Naive Bayes'],
          2,
          'Boosted trees route NaNs left or right during split learning, gaining much of the indicator\'s benefit automatically.',
        ],
      ]
    ),
    lesson(
      M2,
      'mlf-2-3',
      23,
      'Encoding Categoricals and Scaling Numerics (and Knowing Who Needs Them)',
      'One-hot, ordinal, and target encoding with their leakage footguns; standard vs min-max scaling with the distance-and-gradient reasoning that explains why trees shrug it off.',
      21,
      nineBlocks({
        objectives: [
          'Choose a categorical encoding (one-hot, ordinal, target, hashing) given cardinality and model family',
          'Explain why target encoding must be cross-fitted to avoid leakage and describe smoothed target encoding',
          'Apply standard scaling and min-max scaling and compute each by hand for small data',
          'State which model families require scaling, which are invariant, and why',
        ],
        hook:
          'A student trains k-NN on a rent dataset. Feature A: area in square feet, range 400–3,000. Feature B: distance to metro in km, range 0.1–8. k-NN answers with distances — and every distance is essentially "area, area, area". The model has become a one-feature model wearing a two-feature costume. Ten lines of code later — standard scaling — the second feature gets a vote, and RMSE drops 18%. The model never changed. Only the units did. Encoding and scaling are the unglamorous transforms that decide whether your model sees the data you think you showed it.',
        concept: `**Categories must become numbers — but how is a modelling choice.** Every mainstream algorithm consumes numeric matrices; categorical columns must therefore be encoded, and the encoding interacts with the model family, the cardinality (number of levels), and the leakage rules.

**One-hot encoding: the default for linear models.** Each level becomes its own 0/1 column; "city ∈ {Delhi, Mumbai, Pune}" becomes three binary columns. Linear/logistic regression then assigns a separate coefficient per level — honest, simple, and perfectly interpretable ("Mumbai, holding all else equal, adds ₹4,200 to predicted rent"). Two footguns: **dimensionality explosion** — a 50,000-level postal-code column would add 50,000 columns (cardinality must be tamed by grouping rare levels into "other", hashing, or embeddings first); and **dummy collinearity** — with an intercept, the full set of dummies is linearly dependent (their sum is always 1); most libraries drop one level (treatment coding) or you may drop_first=True to keep the design matrix full-rank. Trees technically accept one-hot too, but they waste splits on "is any of the 49,999 other levels?" — better encodings exist for them.

**Ordinal encoding: use the order, if there is one.** Map ordered levels to integers: education = {bachelors:1, masters:2, phd:3}, size = {S:1, M:2, L:3}. For genuinely ordered levels this preserves the ordering that linear models and kNN can exploit. For *unordered* categories, integer codes are a lie to any distance- or coefficient-based model — "Pune=3 is 50% more than Delhi=2" is nonsense — yet **trees handle integer-coded unordered categories better than you would fear**: they can isolate single levels with threshold splits (with caveats — they can also invent false orderings that waste splits). The safe summary: linear models and distance models need one-hot (or target) for unordered categories; trees are tolerant of integer codes but prefer native categorical support or one-hot for low cardinality.

**Target encoding: powerful, dangerous.** Replace each level with the mean of the target for that level — "Pune" becomes 12.4 (the average rent of Pune rows). One column, no dimensionality explosion, directly predictive. The footgun is *massive* leakage: the target mean for a row\'s category is computed using that row\'s own label — a row can almost read its answer, and for rare categories the level-mean ≈ the row\'s own target. The cure is **cross-fitted (out-of-fold) target encoding**: compute each row\'s encoded value from target means computed on *other folds*, then smooth toward the global mean: enc(level) = (n·mean_level + m·global_mean)/(n + m), where m is a smoothing strength. High-frequency levels trust their own mean; rare levels shrink to the global mean. Tree boosters (CatBoost\'s ordered target statistics, LightGBM\'s native categorical support) implement leakage-aware variants — use them rather than hand-rolling. Rule of thumb: one-hot for low-cardinality, linear models; target/CatBoost-style encoding for high-cardinality with trees; never a naive groupby-mean over the full training table joined back to itself.

**Scaling: putting features on comparable footing.** **Standard scaling** (z-score): z = (x − mean)/std → zero mean, unit variance; keeps the shape, unbounded range; the default for regression, logistic regression, SVMs, kNN, PCA, and neural nets. **Min-max scaling**: x′ = (x − min)/(max − min) → squeezed into [0, 1]; preserves exact zero relationships; the default when an algorithm demands bounded inputs (some neural-net layers, distance methods where range-capping matters). **Robust scaling**: (x − median)/IQR — for heavy outliers that would wreck mean/std. One pipeline note: scalers are fitted on train only, like imputers.

**Who needs scaling, and who shrugs?** Linear and logistic regression: yes — gradient descent takes vastly better-behaved steps when features share a scale, and regularisation penalties (Module 3) are scale-blind otherwise, so an unscaled feature would be penalised unevenly. kNN: absolutely — Euclidean distance is dominated by large-range features (the rent example). SVM with RBF kernel: yes, same distance logic. Neural nets: yes, or training visibly slows or destabilises. **Decision trees and everything grown from them: no** — splits test thresholds on a single feature, and any monotone rescaling (standard, min-max, even log) preserves the *order* of values, hence preserves every candidate split and every resulting tree exactly. This invariance is a theorem-level fact about trees, not a rumour; it is why tree pipelines look different from linear pipelines. Naive Bayes (Gaussian, per-feature statistics): scaling changes each feature\'s variance consistently, leaving class comparisons intact — effectively invariant. When in doubt: for tree-only pipelines, skip scaling; for anything with distances, gradients, or penalties, scale — inside the pipeline, on the train fold.`,
        extras: [
          table(
            'Encoding menu',
            ['Encoding', 'Best for', 'Main risk', 'Model affinity'],
            [
              ['One-hot', 'Low/mid-cardinality unordered categories', 'Dimensionality explosion at high cardinality', 'Linear/logistic, neural nets, kNN'],
              ['Ordinal (ordered integers)', 'Genuinely ordered levels', 'Invents order for unordered levels', 'Trees; linear models only if order is real'],
              ['Target (cross-fitted, smoothed)', 'High-cardinality with trees', 'Catastrophic leakage if naive', 'Boosted trees, CatBoost-style pipelines'],
              ['Hashing / embeddings', 'Very high cardinality (IDs, text tokens)', 'Collisions; interpretability loss', 'Linear models, neural nets, retrieval'],
            ],
          ),
          table(
            'Scaling cheat-sheet by model family',
            ['Family', 'Scaling?', 'Why'],
            [
              ['Linear / logistic regression', 'Yes', 'Gradient steps and regularisation penalties assume comparable feature scales'],
              ['k-NN, RBF SVM', 'Yes', 'Distance is otherwise dominated by large-range features'],
              ['Neural networks', 'Yes', 'Faster, more stable optimisation'],
              ['Decision trees / forests / boosters', 'No', 'Threshold splits are invariant under monotone rescaling'],
              ['Gaussian naive Bayes', 'Effectively no', 'Per-feature mean/variance updates cancel scaling'],
              ['PCA', 'Yes (almost always)', 'Components chase variance — the largest-scale feature would otherwise win by default'],
            ],
          ),
          code(
            '# Categorical encoding + scaling inside one leakage-safe pipeline\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.compose import ColumnTransformer\nfrom sklearn.preprocessing import OneHotEncoder, StandardScaler\nfrom sklearn.impute import SimpleImputer\n\npreprocess = ColumnTransformer([\n    ("num", Pipeline([\n        ("impute", SimpleImputer(strategy="median")),\n        ("scale", StandardScaler()),\n    ]), numeric_cols),\n    ("cat", Pipeline([\n        ("impute", SimpleImputer(strategy="constant", fill_value="unknown")),\n        ("onehot", OneHotEncoder(handle_unknown="ignore", min_frequency=20)),\n    ]), categorical_cols),\n])\n# min_frequency=20 folds rare levels into a shared "infrequent" bucket',
            'encoding_pipeline.py',
            'python'
          ),
          tip(
            'Cardinality decides the encoding conversation',
            'Under ~20 levels: one-hot without guilt. 20–1,000: group rare levels first, then one-hot or target-encode. Above ~1,000: target encoding, hashing, or embeddings — and never a naive full-data groupby-mean.',
          ),
        ],
        worked: {
          title: 'Scale by hand, then watch k-NN change its mind',
          problem:
            'Three training points: (area_sqft, distance_km, rent_k) = (600, 0.5, 12), (1200, 4.0, 20), (2400, 6.0, 34). Query: (1250, 1.0, ?). Use k=1 to show how unscaled vs standard-scaled distances flip the nearest neighbour.',
          steps: [
            {
              title: 'Unscaled Euclidean distances',
              desc: 'd to p1 = √((650)² + (0.5)²) ≈ √422,500.25 ≈ 650.00. d to p2 = √((50)² + (3.0)²) = √(2500+9) ≈ 50.09. d to p3 = √((1150)² + (5.0)²) ≈ 1150.01. Nearest: p2 → predict 20k. Area (range 1800) dwarfs distance (range 5.5); the km feature contributed ~nothing.',
            },
            {
              title: 'Standard-scale each feature (train stats)',
              desc: 'area: mean = 1400, std ≈ 748.3 → scaled: (600−1400)/748.3 ≈ −1.07, (1200−1400)/748.3 ≈ −0.27, (2400−1400)/748.3 ≈ 1.34; query: (1250−1400)/748.3 ≈ −0.20. distance: mean = 3.5, std ≈ 2.29 → 0.5→−1.31, 4.0→0.22, 6.0→1.09; query 1.0→−1.09.',
            },
            {
              title: 'Scaled distances',
              desc: 'd to p1 = √((−0.20+1.07)² + (−1.09+1.31)²) = √(0.757+0.048) ≈ 0.897. d to p2 = √((−0.20+0.27)² + (−1.09−0.22)²) = √(0.005+1.716) ≈ 1.312. d to p3 = √((−0.20−1.34)² + (−1.09−1.09)²) = √(2.372+4.752) ≈ 2.670. Nearest is now p1 → predict 12k.',
            },
            {
              title: 'Read the flip',
              desc: 'Same data, same k, opposite prediction — because scaling gave the 0–8 km feature a comparable voice against the 600–2,400 sqft feature. Which neighbour is "truly" closer depends on the geometry you choose; scaling chooses the geometry where features count in units of their own spread.',
            },
          ],
          solution:
            'Unscaled: area dominates, nearest = p2 (rent 20k). Standard-scaled: both features vote in σ-units, nearest = p1 (rent 12k). The modelling decision was hidden inside a units choice — exactly why scaling belongs in the pipeline, not in a footnote.',
        },
        practice: {
          title: 'Encoding decisions for three columns',
          prompt:
            'Given (a) day_of_week {Mon…Sun}, (b) pin_code with 1,847 levels, (c) education_rank ordered: school < diploma < bachelor < master < PhD — pick an encoding for each for a logistic regression and again for a gradient-boosted tree, and justify both answers in one sentence each.',
          hint: 'Model family matters: linear models need honest numbers (one-hot/cross-fitted target); trees tolerate more, and boosters shine with native categorical handling at high cardinality.',
        },
        mistakes: [
          {
            mistake: 'Naive full-data target encoding (groupby target mean, join back)',
            fix: 'Cross-fit: compute each row\'s encoding from other folds\' means, and shrink rare levels toward the global mean. Or use CatBoost/LightGBM\'s built-in leakage-aware categorical handling.',
          },
          {
            mistake: 'One-hot encoding a 50,000-level ID-like column',
            fix: 'Group rare levels, hash, embed, or drop it as an identifier. Cardinality this high is a signal you have an ID, not a category.',
          },
          {
            mistake: 'Scaling (or not) uniformly for every pipeline',
            fix: 'Match the model: scale for linear/distance/gradient/PCA pipelines; skip for pure tree pipelines — where it is harmless but pointless. Know the why, not just the habit.',
          },
          {
            mistake: 'Fitting OneHotEncoder/StandardScaler on the full dataset',
            fix: 'Fit inside a Pipeline on the training fold; use handle_unknown="ignore" so unseen test levels do not crash the transform.',
          },
        ],
        exam: {
          question:
            'Explain why a decision tree\'s fitted structure is unchanged if you replace a feature x by (x−min)/(max−min), while a k-NN classifier\'s predictions generally change. Then say when target encoding is legitimate and the one condition that makes it catastrophic.',
          answer:
            'A tree splits on thresholds of a single feature — "x ≤ 7.3". Any strictly monotone transformation preserves the ordering of values, so the same thresholds (in transformed coordinates) produce identical partitions, impurities, and trees. k-NN sums distances across features; min-max rescaling changes each feature\'s contribution to that sum, altering neighbours and predictions (as in the area-vs-distance flip). Target encoding replaces a level with the mean of the target for that level; it is legitimate when that mean is computed out-of-fold (from other rows only) and smoothed. It is catastrophic when computed on the full training table and joined back — each row\'s encoding contains its own label, so the model learns to read the answer, with rare levels worst (level mean ≈ single row\'s target).',
          source: ' favourite two-part question in ML engineering screens: invariance plus leakage.',
        },
        summary: [
          'One-hot for low-cardinality unordered categories and linear models; beware dimensionality explosion.',
          'Ordinal codes are honest only for genuinely ordered levels; trees tolerate codes better than linear models do.',
          'Target encoding is powerful and leaky by default — cross-fit and smooth, or use CatBoost/LightGBM natives.',
          'Standard scaling (z-score) and min-max scaling serve different needs; Robust scaling survives outliers.',
          'Distance-, gradient-, and penalty-based models need scaling; trees are invariant to monotone rescaling.',
          'All encoders and scalers are fitted on the train fold inside a pipeline — never on the full dataset.',
        ],
      }),
      [
        [
          'Replacing "city" (Delhi/Mumbai/Pune) with three 0/1 columns is:',
          ['Ordinal encoding', 'One-hot encoding', 'Target encoding', 'Scaling'],
          1,
          'Each level becomes its own binary column — the standard low-cardinality categorical encoding.',
        ],
        [
          'Naive target encoding (full-data groupby-mean joined back) leaks because:',
          [
            'Means are hard to compute',
            'Each row\'s encoded value is computed using that row\'s own label — the model can read the answer',
            'Trees cannot consume the encoded column',
            'It creates collinearity with the intercept',
          ],
          1,
          'The level mean includes the row\'s target; out-of-fold computation removes the self-inclusion.',
        ],
        [
          'Which of these model families does NOT need feature scaling for good performance?',
          ['k-NN', 'RBF-kernel SVM', 'Random forest', 'Logistic regression'],
          2,
          'Tree threshold splits are invariant under monotone rescaling; forests inherit this invariance.',
        ],
        [
          'Standard (z-score) scaling transforms a feature to:',
          [
            'Range [0, 1]',
            'Zero mean and unit variance, preserving the distribution\'s shape',
            'Only positive values',
            'Integer codes',
          ],
          1,
          'z = (x − mean)/std; min-max is the [0,1] transform — do not confuse the two.',
        ],
      ]
    ),
    lesson(
      M2,
      'mlf-2-4',
      24,
      'Class Imbalance and Honest Splitting: Stratified, Time-Based, and Group Splits',
      'Surviving 99:1 datasets — metrics, weights, resampling, thresholding — and building splits that do not lie: stratified splits for rare classes, time-ordered splits for temporal data, group splits for repeated entities, and the preprocessing traps that straddle all of them.',
      21,
      nineBlocks({
        objectives: [
          'Diagnose the accuracy trap on an imbalanced dataset and select imbalance-appropriate metrics',
          'Compare class weights, resampling (SMOTE-style), and threshold tuning as imbalance remedies with their risks',
          'Design stratified, time-based, and group-aware splits for three different data structures',
          'Identify the four splitting leakage traps (preprocess-before-split, oversample-before-split, duplicates, future features)',
        ],
        hook:
          'Fraud is 0.4% of transactions. A model that answers "genuine" every single time scores 99.6% accuracy and wins the internal demo. It catches zero fraud — which was the entire point of the project. Then the team fixes the model, gets recall up... and evaluates it with a random split that scattered each fraudster\'s transactions across train and test, so the model recognised individuals instead of detecting fraud. Two different failures — the metric lie and the split lie — stacked in one project. Both are about honesty, and both have cheap, standard defences.',
        concept: `**The accuracy trap and the metrics that survive imbalance.** When the positive class is rare, accuracy measures how well you ignore it. The toolkit that survives: the **confusion matrix** (true positives, false positives, true negatives, false negatives — memorise the layout, it is the foundation of everything below); **precision** = TP/(TP+FP) — of the ones you flagged, how many were real (the false-alarm cost); **recall** = TP/(TP+FN) — of the real ones, how many you caught (the miss cost); **F1** — the harmonic mean, a single number when you cannot price FP vs FN precisely; **PR-AUC** — area under the precision-recall curve, the preferred headline for rare positives (ROC-AUC can look rosy while precision collapses at operational thresholds); and **lift / precision@k** — for queue-of-N operations (call the top 500 risk scores this week). Choose the metric by the *cost structure*: spam (false positives lose real mail — precision-sensitive) vs cancer screening (false negatives are catastrophic — recall-sensitive). Write the cost argument into the project doc before tuning anything.

**Remedies for imbalance, each with a bill.** **Class weights / sample weights** (e.g., sklearn class_weight="balanced", boosting scale_pos_weight): tell the loss that missing a positive costs more — the standard first move, no data touched, pure objective change. **Threshold tuning**: train for probabilities, then pick the operating threshold on a validation set to hit the required precision or recall — often the highest-leverage single number in a rare-event system; the default 0.5 is a coincidence of symmetric costs, not a law. **Resampling**: oversample the minority (duplicate or SMOTE-style synthetic points interpolated between minority neighbours) or undersample the majority; changes the class prior the model sees. SMOTE\'s bill: synthetic points can blur class boundaries and create unrealistic examples; it must run *after* the split, *inside* the training fold only, or it contaminates evaluation (synthetic neighbours derived from test points). **Better data**: collect more positives (best, slowest); relabel suspicious negatives (often the hidden problem — your "negatives" may contain undiscovered positives). A working rare-event system usually combines weights or resampling with threshold tuning, and always reports PR-AUC plus the operating-point precision/recall.

**Honest splitting: match the split to the data\'s structure.** (1) **Stratified random split** for ordinary imbalanced classification: StratifiedShuffleSplit keeps the positive rate identical across train and test — a plain random split on 0.4% fraud can easily starve the test set of positives and produce meaningless variance. (2) **Time-based split** for anything temporal — demand, churn, forecasting, log data: train on the past, validate on the recent past, test on the latest window. Deployment always faces the future; a random split lets the future leak into the past and inflates every metric. Walk-forward / expanding-window cross-validation is the time-series generalisation of k-fold. (3) **Group-aware split** when one entity contributes multiple rows — same patient\'s scans, same user\'s transactions, same document\'s chunks, same device\'s sensor traces: GroupShuffleSplit / GroupKFold keep all rows of an entity in one side, forcing the model to generalise to *new entities*, which is what production serves. Using a random split here yields the classic pathology: 96% offline, 74% on new users.

**The four split traps that straddle everything.** (a) **Preprocess before split** — scalers/imputers/encoders fitted on the full table leak holdout statistics (you know this drill; Pipelines enforce the fix). (b) **Oversample before split** — SMOTE first, split second, and synthetic points derived from soon-to-be-test rows pollute training with near-test information; the pipeline order is split → (fit transforms on train) → resample train → fit → evaluate on untouched test. (c) **Duplicates and entities across splits** — exact duplicate rows or the same entity on both sides; detect with hashing and group keys, fix with dedup and group splits. (d) **Target-informed features built before splitting** — feature selection, target encoding, or binning performed on the full dataset uses the test labels in the training design. All four share one root: *anything that learns from data (statistics, synthetic points, feature choices) must learn from the training fold, only the training fold*. Cross-validation nests this rule — inside each fold, the whole pipeline is refitted on that fold\'s training portion.`,
        extras: [
          table(
            'Split strategy by data structure',
            ['Data structure', 'Split', 'Tool (sklearn-style)', 'What it prevents'],
            [
              ['Ordinary imbalanced classification', 'Stratified random', 'train_test_split(stratify=y)', 'Positive class vanishing from a fold'],
              ['Temporal / event data', 'Time-ordered (expanding window)', 'Manual time cut or TimeSeriesSplit', 'Future leaking into training'],
              ['Repeated entities (user/patient/doc)', 'Group-aware', 'GroupShuffleSplit / GroupKFold', 'Entity recognition masquerading as generalisation'],
              ['Small data + no structure', 'k-fold (often stratified)', 'StratifiedKFold(k=5)', 'High-variance single-split estimates'],
            ],
          ),
          code(
            '# Imbalance pipeline: split first, then resample train only\nfrom sklearn.model_selection import train_test_split, StratifiedKFold\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.linear_model import LogisticRegression\nfrom imblearn.over_sampling import SMOTE\nfrom imblearn.pipeline import Pipeline as ImbPipeline\nfrom sklearn.metrics import precision_recall_curve, average_precision_score\n\nX_tr, X_te, y_tr, y_te = train_test_split(\n    X, y, test_size=0.2, stratify=y, random_state=42   # keep 0.4% positives in both sides\n)\n\npipe = ImbPipeline([\n    ("prep", preprocess),                       # fitted inside each fold on train only\n    ("smote", SMOTE(sampling_strategy=0.5, random_state=0)),  # train fold only\n    ("clf", LogisticRegression(class_weight=None, max_iter=1000)),\n])\n# Alternative without SMOTE: class_weight="balanced", skip smote step\n\npipe.fit(X_tr, y_tr)\nscore = pipe.predict_proba(X_te)[:, 1]\nprint("PR-AUC:", average_precision_score(y_te, score))   # ~0.004 baseline for 0.4% positives\np, r, t = precision_recall_curve(y_te, score)\n# pick threshold where recall >= 0.8, then read the precision you can afford',
            'imbalance_pipeline.py',
            'python'
          ),
          warn(
            'SMOTE before the split is leakage with extra steps',
            'Synthetic minority points are interpolated between neighbours — if test rows were among those neighbours, training now contains the test set\'s fingerprint. Resample inside the training fold, after splitting, every time.',
          ),
          tip(
            'The 500-call-queue mental model',
            'Rare-event systems usually serve a fixed-size queue (call top-N, block top-N). Evaluate precision@N for the real N. It translates model quality into operations and kills metric arguments in one line.',
          ),
        ],
        worked: {
          title: 'Design splits for three messy datasets',
          problem:
            'Design the split + evaluation for: (a) card fraud: 2M transactions over 12 months, 0.35% fraud, multiple transactions per customer; (b) hospital readmission: 30k visits, 40 hospitals, patients with repeat visits; (c) course-pass prediction: 8k students across 5 academic years.',
          steps: [
            {
              title: '(a) Fraud',
              desc: 'Temporal primary: train months 1–9, validate months 10–11, test month 12 (deployment faces the future). Within training, group integrity: a customer\'s transactions must not straddle train and validation — GroupKFold by customer inside the training window for tuning. Stratification is implicit in time windows (keep enough positives per window; merge windows if a month has too few). Metrics: PR-AUC + precision@top-2,000-alerts/day.',
            },
            {
              title: '(b) Readmission',
              desc: 'Group-aware: split by patient (every visit of a patient on one side); optionally also hold out entire hospitals for a "new site" stress test. Random row splits would let the model memorise frequent flyers. Metrics: AUC plus recall at a fixed alert budget; report per-hospital numbers.',
            },
            {
              title: '(c) Course pass (5 years)',
              desc: 'Time-ordered: train years 1–3, validate year 4, test year 5 — next year\'s cohort is the deployment population. If students reappear across years, enforce student-level grouping within the time framework. Report overall plus subgroup metrics (department, prior-GPA band).',
            },
            {
              title: 'Shared pipeline discipline',
              desc: 'Inside every tuning loop: fit imputer/scaler/encoder on the training portion only; apply class weights or SMOTE to the training portion only; never let the validation/test portion influence any statistic, synthetic point, or feature selection.',
            },
          ],
          solution:
            '(a) time split + customer grouping + PR-AUC/precision@N; (b) patient-grouped (and optionally hospital-held-out) splits; (c) chronological cohort split with student grouping. Each design starts from a single question — what will this model face in production? — and the answer dictates the split, not library defaults.',
        },
        practice: {
          title: 'Choose and justify a split',
          prompt:
            'Pick one dataset you know (Kaggle or campus). State its structure (time? repeated entities? class balance?), name the exact split function you would use, and describe the pipeline order from raw table to held-out metric, including where (and where NOT) any resampling happens.',
          hint: 'Write the order as: split → fit transforms on train → resample train only → fit → score untouched test. If any step learns from the full table, find the leak.',
        },
        mistakes: [
          {
            mistake: 'Reporting accuracy on a 1%-positive dataset',
            fix: 'Confusion matrix + precision/recall/F1 or PR-AUC, with the majority-class baseline (≈99%) shown for contrast.',
          },
          {
            mistake: 'Random-splitting data with time order or repeated entities',
            fix: 'Time-ordered splits for temporal data; GroupKFold/GroupShuffleSplit for users, patients, documents. Match the split to the deployment challenge.',
          },
          {
            mistake: 'Applying SMOTE (or any resampling) before train/test splitting',
            fix: 'Split first; resample only the training fold, inside the pipeline. Validation and test stay pristine at natural class rates.',
          },
          {
            mistake: 'Tuning the decision threshold on the test set',
            fix: 'Choose the threshold on validation to hit the operational target (e.g., recall ≥ 0.8 at acceptable precision), freeze it, then report test metrics once.',
          },
        ],
        exam: {
          question:
            'A model on 0.3%-positive fraud data shows 99.5% accuracy and ROC-AUC 0.91 offline; in production it generates alerts nobody trusts. Give three concrete causes and the fix for each.',
          answer:
            '(1) Metric illusion: 99.5% accuracy is essentially the always-genuine baseline; and ROC-AUC flatters rare events while precision at operational alert volumes is the real concern — fix by reporting PR-AUC and precision@N for the actual N, with recall alongside. (2) Threshold mismatch: 0.5 default threshold, or a threshold tuned on test; fix by choosing the threshold on validation for the alert budget (precision at top-N) and freezing it. (3) Split dishonesty: random split over temporal, entity-clustered transactions (same fraudster rings across train/test, or train containing the future) inflates offline numbers; fix with time-ordered windows plus group-by-customer integrity inside training, and by ensuring preprocessing/resampling touched only training folds. Each cause independently explains "great offline, useless alerts"; production debugging checks all three.',
          source: 'Common senior-level debugging discussion in risk and payments ML interviews.',
        },
        summary: [
          'Imbalance makes accuracy a lie; confusion-matrix metrics, PR-AUC, and precision@N survive.',
          'Choose the metric by cost: precision-sensitive vs recall-sensitive errors — write the argument down.',
          'Remedies: class weights (first move), threshold tuning (often decisive), resampling/SMOTE (train-fold only), more positives (best).',
          'Stratified splits protect rare-class representation; time splits mimic the future; group splits force new-entity generalisation.',
          'The pipeline order is law: split → fit transforms on train → resample train only → fit → evaluate untouched test.',
          'Duplicates, pre-split preprocessing, full-data feature selection, and pre-split SMOTE are the four split traps — audit all four every time.',
        ],
      }),
      [
        [
          'On data with 1% positives, a model predicting "negative" always achieves 99% accuracy. The correct evaluation is:',
          [
            'Report 99% accuracy proudly',
            'Confusion matrix plus precision/recall (or PR-AUC) on the positive class, with the 99% baseline shown',
            'Switch to ROC-AUC only',
            'Balance the test set to 50% and report accuracy',
          ],
          1,
          'Accuracy measures how well the model ignores the rare class; the minority class metrics (and the baseline gap) are the honest evaluation.',
        ],
        [
          'SMOTE creates synthetic minority examples. When must it be applied in a pipeline?',
          [
            'Before splitting, so both splits see balanced classes',
            'After splitting, to the training fold only — never to validation or test',
            'Only to the test set, to make evaluation stable',
            'It must never be used',
          ],
          1,
          'Synthetic points derived before/around the split leak information into evaluation; validation and test must stay at natural class rates.',
        ],
        [
          'Data: 3 years of daily sales, forecasting next month. The correct split is:',
          [
            'Random 80/20 shuffle',
            'Time-ordered: train on earlier months, validate on the recent past, test on the latest window',
            'GroupKFold by product only, ignoring time',
            'All data for both training and testing',
          ],
          1,
          'Deployment faces the future; random splits leak future patterns into training and inflate metrics.',
        ],
        [
          'Each patient appears in 15 rows of a medical dataset. Using a random row split will most likely:',
          [
            'Save compute time',
            'Place the same patient in train and test, inflating metrics via entity recognition',
            'Improve generalisation',
            'Satisfy the class balance requirement automatically',
          ],
          1,
          'The model can recognise individual patients rather than medical patterns; group by patient so each person sits wholly in one split.',
        ],
      ]
    ),
  ],
};
