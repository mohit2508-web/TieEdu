// Module 7 — Overfitting, Regularisation & Hyperparameter Tuning
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code } from '../nineBlocks';
import { lesson, M7, COURSE_ID } from './helpers';

export const module7: CourseModule = {
  id: M7,
  course_id: COURSE_ID,
  title: 'Module 7 — Overfitting, Regularisation & Hyperparameter Tuning',
  summary:
    'The two failure modes of learning, named and quantified: bias and variance as a decomposition you can compute, learning curves as the diagnosis instrument, every regularisation lever across model families, the three species of hyperparameter search (grid, random, Bayesian/Optuna) with their budget arithmetic, feature importance done honestly (impurity vs permutation and their caveats), and a leakage re-audit from the vantage point of tuning pressure.',
  sort_order: 7,
  lessons: [
    lesson(
      M7,
      'mlf-7-1',
      71,
      'Bias–Variance and Learning Curves: Diagnosing the Gap Before You Fix It',
      'Why the same error has two very different causes, the decomposition that separates them numerically, and the curve plot that tells you whether more data will ever help.',
      21,
      nineBlocks({
        objectives: [
          'Decompose an expected prediction error into bias², variance and noise using given summary statistics',
          'Diagnose underfitting vs overfitting from train and validation scores alone',
          'Read a learning curve and predict whether collecting more data will improve the model',
          'Apply the correct lever set for each regime and justify why the wrong lever makes things worse',
        ],
        hook:
          'Two models land on your desk. Model A scores 0.71 on train and 0.69 on validation: barely a gap, and both numbers are mediocre. Model B scores 0.99 on train and 0.74 on validation: a gaping chasm. The instinct of every junior practitioner is to treat both as "overfitting" and reach for regularisation. Applied to Model A, that advice is malice — you cannot regularise a model that is already too simple; you will only push both scores down together. Diagnosis before prescription is the whole lesson: two failures with identical-looking symptoms of "bad validation score" have opposite treatments, and the bias–variance picture plus one plot tells you which one you have.',
        concept: `**The decomposition: one error, three sources.** For squared-error prediction, the expected error at a point splits exactly into three parts: E[(y − f̂(x))²] = **bias²** + **variance** + **irreducible noise**. **Bias²** is the systematic miss — the average of your predictions across many retrainings, compared with the truth; a model that always predicts 7 when the truth is 10 has bias −3 and bias² 9, regardless of how stable it is. **Variance** is the instability — how much your fitted model swings when the training set changes: a model that fits 7.2 on one sample and 11.8 on another has high variance even if its average is perfect. **Noise** is the part no model can reach — label error, unmeasured variables, randomness in the world; it sets the floor that even a perfect model cannot cross. The engineering consequence is the classic trade-off: add capacity (deeper trees, higher-degree features, weaker regularisation) and bias falls while variance rises; remove capacity and the reverse. The optimal model sits where bias² + variance is minimised — *not* where training error is minimised, and *not* where bias alone is smallest. In classification the same picture holds qualitatively (the decomposition has extra terms under 0-1 loss, but the regimes and the levers are identical), which is why you can reason about a classifier with a regression diagram and still be right.

**The symptoms table, memorised.** **High bias (underfitting)**: training error is *high* and validation error is *similarly high* — the gap is small because the model fails on both. The model cannot capture the pattern even with all the data it has. **High variance (overfitting)**: training error is *low* (often near zero) and validation error is much worse — the gap is the signature; the model learned the training set's particulars, including its noise. The remedies are mirror images: for high bias — a more expressive model, more/better features, weaker regularisation, longer training (up to the point where it can fit); for high variance — more training data, stronger regularisation, a simpler model, early stopping, augmentation, ensembling. Applying a variance remedy to a bias problem actively harms you: stronger regularisation on an already-underfit model drives both scores down toward the baseline. Note the sneaky third case: *both* scores near the baseline with a small gap is not "stable" — it is a model that has learned nothing, which is a bias diagnosis plus a feature/target problem.

**Learning curves: the experiment that decides whether to buy data.** Plot training-set score (or error) and validation score against the *size of the training set* (learning_curve in sklearn does the subsampling for you). The two archetypal shapes answer the most expensive question in ML — "will more data help?" — before you spend a rupee on it. **High-bias curve**: both curves rise quickly then *plateau together* at a poor level; the gap was never big and the validation curve is flat — more rows will not help, because the model class cannot express the pattern. Buy capacity or features, not data. **High-variance curve**: the training curve stays high and the validation curve is still *climbing* with a wide, narrowing gap — more data is exactly the right purchase, because each new row constrains the memorisation further. **Both curves still rising**: you are data-limited and capacity-adeate — collect more (and consider a slightly bigger model once they flatten). Reading these curves turns arguments into plots: "should we label 50,000 more rows?" becomes a visual answer rather than an opinion. One caveat to carry into the deep-learning era: very large models can drive training error nearly to zero *and still* generalize well at scale (the modern "double descent" picture), so treat the classical decomposition as the reliable diagnostic for the tabular, small-to-medium-n world this course works in — and remember that even in that world, the curve tells you the *regime*, while fresh experiments tell you the *fix*.

**The workflow, end to end.** (1) Establish baseline (Module 6). (2) Plot train/validation scores and the learning curve. (3) Label the regime: high bias, high variance, or data-limited. (4) Apply only the levers for that regime — one at a time. (5) Re-plot; regimes shift as you fix things (a variance-fixed model often reveals new bias). The two numbers to keep on screen are the **gap** (validation − training, in metric units) and the **distance to baseline** (validation − baseline). Overfitting is a big gap; uselessness is a small distance to baseline; the worst place to be is both.`,
        extras: [
          table(
            'Two failures, opposite treatments',
            ['Regime', 'Train score', 'Validation score', 'Lever set (and NOT this one)'],
            [
              ['High bias (underfit)', 'Low/bad', 'Low/bad, close to train', 'More capacity, better features, weaker regularisation — never stronger regularisation'],
              ['High variance (overfit)', 'High/good', 'Clearly worse than train', 'More data, stronger regularisation, simpler model, early stopping — never more capacity'],
              ['Data-limited', 'High', 'Rising with more data', 'Collect/label more data; revisit only after curves flatten'],
              ['Below baseline', '≈ baseline', '≈ baseline', 'Stop tuning the algorithm — fix the target, features or labels'],
            ],
          ),
          code(
            '# Learning curves: the buy-data-or-not experiment\nimport numpy as np\nimport matplotlib.pyplot as plt\nfrom sklearn.model_selection import learning_curve\nfrom sklearn.ensemble import RandomForestClassifier\nfrom sklearn.dummy import DummyClassifier\n\nestimator = RandomForestClassifier(n_estimators=300, random_state=0)\nsizes, train_s, val_s = learning_curve(\n    estimator, X_train, y_train, cv=5, scoring=\"roc_auc\",\n    train_sizes=np.linspace(0.1, 1.0, 8), n_jobs=-1, random_state=0,\n)\nprint(\"train:\", np.round(train_s.mean(axis=1), 3))\nprint(\"valid:\", np.round(val_s.mean(axis=1), 3))\n\n# Baseline line for AUC is 0.5 — draw it so the gap has two reference points\nplt.plot(sizes, train_s.mean(axis=1), label=\"train\")\nplt.plot(sizes, val_s.mean(axis=1), label=\"validation\")\nplt.axhline(0.5, ls=\"--\", label=\"random baseline\")\nplt.xlabel(\"training rows\"); plt.ylabel(\"ROC-AUC\"); plt.legend(); plt.show()\n\n# Regime check in words: gap = train - val at full size; plateau = last delta\nprint(\"gap:\", round(float(train_s.mean(axis=1)[-1] - val_s.mean(axis=1)[-1]), 3),\n      \"val still rising:\", round(float(val_s.mean(axis=1)[-1] - val_s.mean(axis=1)[-2]), 3))',
            'learning_curves.py',
            'python'
          ),
          warn(
            'Regularising an underfit model makes both scores worse',
            'A small gap with low scores is high bias. Stronger penalties, fewer features or shallower trees will lower train and validation together — diagnose the regime first, always.',
          ),
          tip(
            'Put the baseline on every train/validation plot',
            'The gap tells you the regime; the distance to baseline tells you whether the regime even matters. A perfect fit of a useless target still sits on the baseline.',
          ),
        ],
        worked: {
          title: 'The decomposition by hand — and why the lowest-bias model loses',
          problem:
            'Three candidate models are retrained on 20 different samples of the same dataset. At the point of interest the truth is 10. Model A averages predictions of 7.4 (spread sd 1.0); Model B averages 9.6 (sd 2.5); Model C averages 8.5 (sd 1.4). Irreducible noise sd = 2. Compute expected MSE for each (bias² + variance + noise²) and choose the model to deploy.',
          steps: [
            {
              title: 'Bias² per model',
              desc: 'Bias = mean prediction − truth. A: 7.4 − 10 = −2.6 → 6.76. B: 9.6 − 10 = −0.4 → 0.16. C: 8.5 − 10 = −1.5 → 2.25. B is by far the least biased — and that will not save it.',
            },
            {
              title: 'Variance and noise',
              desc: 'Variance = sd² of the predictions across retrains: A: 1.0² = 1.00; B: 2.5² = 6.25; C: 1.4² = 1.96. Noise = 2² = 4.00 for all three — it is the floor no model removes.',
            },
            {
              title: 'Total expected error',
              desc: 'A: 6.76 + 1.00 + 4.00 = 11.76. B: 0.16 + 6.25 + 4.00 = 10.41. C: 2.25 + 1.96 + 4.00 = 8.21. Model C wins despite B\'s near-perfect average — B pays for its accuracy with swings of ±2.5 per retrain, and the swings cost more than C\'s steady −1.5 miss.',
            },
            {
              title: 'Reading it as a decision',
              desc: 'A is the underfit model (huge bias, tiny variance — its lever is more capacity). B is the overfit model (tiny bias, huge variance — its lever is regularisation or more data). C is the tuned middle. Note also: with noise² = 4, even the theoretical best floor is 4 — no amount of modelling beats the label quality. If noise dominates for everyone, collect better labels.',
            },
          ],
          solution:
            'Expected MSE: A 11.76, B 10.41, C 8.21 → deploy C. The least-biased model (B) is not the best model: tuning minimises bias² + variance, not bias alone — and both A and B are one lever away from C (A: more capacity; B: more regularisation or more data). The irreducible 4.00 shows the ceiling set by label quality.',
        },
        practice: {
          title: 'Run the diagnosis on your own model',
          prompt:
            'Take any classifier or regressor you trained in this course: print training and validation scores for a shallow/simple and a deep/complex configuration, compute the gap for each, and plot a learning_curve (5-fold) for the better one. Write three sentences: the regime, whether the validation curve is still climbing at full data size, and whether you would spend next month collecting data or adding features.',
          hint: 'Plateaued curves with a small gap = buy capacity/features; a wide gap with the validation curve still rising = buy data; validation flat near baseline = fix target/features before touching the algorithm.',
        },
        mistakes: [
          {
            mistake: 'Treating every gap as overfitting and reaching for regularisation',
            fix: 'Check the train score first. High train + low val = variance; low train ≈ low val = bias. The levers are opposites.',
          },
          {
            mistake: 'Judging generalisation from training accuracy',
            fix: 'Training score only proves fit. Quote validation/CV with spread and baseline; a 0.99 train number is diagnostic input (it says variance), never a result.',
          },
          {
            mistake: 'Buying more data for a high-bias model',
            fix: 'Learning curves decide this: a plateaued validation curve will not lift with rows. Capacity or features move bias; data moves variance.',
          },
          {
            mistake: 'Comparing models at different training-set sizes or noise levels',
            fix: 'The decomposition only compares fairly on the same data; and remember the noise floor — if label error dominates, no architecture discussion matters.',
          },
        ],
        exam: {
          question:
            'Define bias and variance in one sentence each. Given bias = −2.6, prediction sd across retrains = 1.0 and noise sd = 2, compute the expected MSE. A second model has bias = −0.4 and sd = 2.5. Which do you deploy, and what lever would fix the loser in each case?',
          answer:
            'Bias = the systematic offset of the average prediction from the truth (how wrong the model is on average across retrains); variance = how much the fitted model changes when the training set changes (instability). Model 1: expected MSE = (−2.6)² + 1.0² + 2² = 6.76 + 1.0 + 4 = 11.76. Model 2: (−0.4)² + 2.5² + 4 = 0.16 + 6.25 + 4 = 10.41. If a third model offers bias −1.5 and sd 1.4 (8.21) it wins outright; between these two, Model 2 wins despite near-zero bias because its variance costs more. Levers: the high-bias loser (Model 1) needs more capacity, better features or weaker penalties; the high-variance loser (Model 2) needs more data, stronger regularisation, simpler structure or early stopping. The deploy rule is minimum bias² + variance, both measured on the same data — and note the noise floor of 4 that bounds every model.',
          source: 'Evergreen bias–variance exam question (decomposition arithmetic + remedy mapping).',
        },
        summary: [
          'Expected error = bias² + variance + irreducible noise; tuning minimises the sum, never bias alone.',
          'High bias: train low and val similarly low — needs capacity/features; high variance: train high, val much lower — needs data or regularisation.',
          'The remedies are opposites; applying the wrong one moves both scores in the wrong direction.',
          'Learning curves answer "will more data help?": plateau = no, validation still climbing = yes.',
          'Track two numbers: the train/val gap (regime) and the distance to baseline (whether it matters).',
          'Label noise sets a floor — when noise² dominates, better labels beat better algorithms.',
        ],
      }),
      [
        [
          'A model scores 0.72 on training data and 0.70 on validation data, both near the baseline. The diagnosis is:',
          [
            'Severe overfitting',
            'High bias (underfitting) — the model cannot capture the pattern; more regularisation would make it worse',
            'Perfect bias–variance balance',
            'Data leakage',
          ],
          1,
          'Low scores with almost no gap means both sets defeat the model equally — the lever is capacity, features or target framing, not regularisation.',
        ],
        [
          'The bias–variance decomposition of expected squared error is:',
          [
            'Bias + Variance + Noise',
            'Bias² + Variance + Noise²',
            'Bias² − Variance',
            'Training error + Validation error',
          ],
          1,
          'Squared bias plus variance plus irreducible noise variance — the standard decomposition under squared loss.',
        ],
        [
          'Your learning curve shows training score flat and high, validation score still rising with a wide gap as rows increase. The right next move is:',
          [
            'Increase regularisation',
            'Collect more training data (and/or simplify) — the gap is variance and data is the proven lever',
            'Reduce the number of features',
            'Report training accuracy instead',
          ],
          1,
          'A climbing validation curve with a persistent gap means the model is still memorising what data has not yet constrained: buy data.',
        ],
        [
          'Across many retrains, a model\'s predictions average 9.6 where the truth is 10, with sd 1.5, and noise sd = 2. Its expected MSE contribution from bias is:',
          ['0.4', '0.16', '2.25', '6.25'],
          1,
          'Bias = 9.6 − 10 = −0.4; bias² = 0.16. (Variance would be 2.25 and noise 4, for a total of 6.41.)',
        ],
      ]
    ),
    lesson(
      M7,
      'mlf-7-2',
      72,
      'Regularisation Levers: Every Knob That Trades Fit for Generalisation',
      'One idea expressed in a dozen settings — alpha in linear models, depth and leaf size in trees, shrinkage in boosting, k in kNN — plus early stopping and the one-standard-error rule for choosing among them.',
      20,
      nineBlocks({
        objectives: [
          'State what regularisation does to the bias–variance balance and predict the effect of increasing any family\'s penalty knob',
          'List the principal regularisation levers for linear, tree, forest, boosting, kNN and SVM models and what each controls',
          'Apply the one-standard-error rule to pick a regularised configuration from a cross-validation table',
          'Explain why penalties require standardised features and how early stopping acts as free regularisation',
        ],
        hook:
          'Every model family in this course has a knob that says "be simpler". Ridge has alpha; a decision tree has max_depth; a random forest has min_samples_leaf; gradient boosting has learning_rate; kNN has k; an SVM has C. They are taught in separate chapters, wired through different code, and named as if they were unrelated features of unrelated algorithms. They are not: each one is the same dial seen from a different angle — the price you charge the model for complexity, paid in training fit, refunded in generalisation. Learn it as one idea with a family of names and you will never again guess a hyperparameter\'s direction in an interview.',
        concept: `**What the penalty actually buys.** Regularisation adds a cost for complexity to the training objective: minimise (fit error) + λ · (model complexity), where λ is the strength and "complexity" is measured in whatever currency the family uses — squared coefficient size for Ridge, absolute coefficient size for Lasso, tree size for cost-complexity pruning, path length for isolation, distance span for kNN. Raising λ pushes the solution toward simpler functions: predictions shrink, boundaries smooth, fewer splits, smaller neighbourhoods. In bias–variance terms you are *buying bias to shed variance* — which is exactly why the direction of every one of these knobs is the same, and why over-regularising underfits (the far end of every curve: all coefficients at zero means the model predicts the mean, all tree depth at one means majority votes).

**The levers, by family.** **Linear models**: alpha (λ) is the strength dial — Ridge (L2) shrinks all coefficients smoothly toward zero without zeroing any, which tames correlated features by shrinking them together; Lasso (L1) drives some coefficients to *exactly* zero, performing feature selection; ElasticNet mixes both (l1_ratio), useful when features come in correlated groups. Critical detail: the penalty compares coefficients to each other, so features must be standardised first — a coefficient on a feature measured in rupees is not commensurable with one on a ratio, and an unscaled penalty distorts which feature gets cut. (Module 3 did this arithmetic; this lesson makes it a rule: scale, then regularise.) **Decision trees**: max_depth and max_leaf_nodes cap structure; min_samples_leaf forces every leaf to carry enough rows that its prediction is an average rather than a memorised singleton (often the single most effective smoothing knob); ccp_alpha is the explicit cost-complexity pruning parameter — train fully, then prune the branch whose removal buys enough impurity reduction to pay for its leaf count. **Random forests**: n_estimators lowers variance through averaging (gains flatten after a few hundred; almost never the overfitting knob), while max_depth/min_samples_leaf/max_features keep individual trees weak so their errors stay uncorrelated — remember Module 4: the forest\'s regularisation is *decorrelation plus averaging*, not any single tree\'s fit. **Gradient boosting**: learning_rate (shrinkage) and n_estimators form one joint lever — small learning rates need more trees but usually generalise better; max_depth of 2–4 keeps each learner a weak contributor; subsample < 1 adds stochastic noise that regularises like bagging; **early stopping** watches validation error during training and halts when it stops improving (patience in iterations) — a regulariser that picks the effective iteration count for you, and the default defence for boosted trees. **kNN**: k itself — larger k smooths the boundary (more bias, less variance); weight by distance to let near neighbours dominate. **SVM**: C is the soft-margin price of errors and gamma the RBF influence radius (Module 5) — jointly, they are this family\'s λ. **Neural nets** (a preview for the DL course): weight decay (L2), dropout, batch size, augmentation and early stopping play the identical roles. One family\'s table is another family\'s vocabulary: the interview answer is the mapping, not the memorisation.

**Choosing strength: the curve and the one-standard-error rule.** Sweep λ on a log grid (0.001, 0.01, 0.1, 1, 10, 100 — regularisation strength is a scale, not a step) and plot CV error against λ: the classic U-shape — falling as variance is shed, rising again as bias takes over. Two selection rules: **pick the minimum** (maximises the CV mean), or the more conservative **one-standard-error rule**: find the best mean and its standard error, then choose the most regularised (simplest) configuration whose mean lies within one standard error of the best. The one-SE rule exists because CV differences under one SE are indistinguishable from noise — and when two candidates are statistically tied, the simpler one is the better bet for data you have not seen. Report the chosen λ, the CV curve shape and the final untouched test number; never tune λ on the test set. Also worth knowing: **regularisation and data volume substitute for each other** — with abundant data, strong penalties matter less (there is enough signal to estimate many parameters); with scarce data, λ does much of the stabilising work.`,
        extras: [
          table(
            'The regularisation levers, one row per family',
            ['Family', 'Lever(s)', 'What raising it does', 'Watch out for'],
            [
              ['Linear (Ridge/Lasso/ElasticNet)', 'alpha (and l1_ratio)', 'Shrinks coefficients (Lasso: zeros them)', 'Unscaled features distort the penalty; log-scale the grid'],
              ['Decision tree', 'max_depth, min_samples_leaf, ccp_alpha', 'Fewer, smoother leaves', 'Too deep a prune collapses to the majority class'],
              ['Random forest', 'max_depth, min_samples_leaf, max_features', 'Weaker, more decorrelated trees', 'n_estimators mainly costs time, it rarely overfits'],
              ['Gradient boosting', 'learning_rate (with n_estimators), subsample, max_depth', 'Each learner contributes less, more slowly', 'Small lr without more trees simply underfits'],
              ['kNN', 'k', 'Wider neighbourhood, smoother boundary', 'k=1 memorises; k=n predicts the global mean'],
              ['SVM', 'C (and gamma for RBF)', 'Tolerates more margin errors', 'Must be tuned jointly with gamma, on scaled features'],
              ['Any iterative model', 'early stopping (patience)', 'Halts before validation starts worsening', 'Patience tuned on the same validation set you report'],
            ],
          ),
          code(
            '# Regularisation path + the one-standard-error rule\nimport numpy as np\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.linear_model import RidgeCV\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.model_selection import cross_validate, KFold\n\n# alpha is a SCALE parameter: always search it on a log grid\nalphas = np.logspace(-3, 3, 13)\n\ncv = KFold(n_splits=5, shuffle=True, random_state=0)\n\n# RidgeCV does the inner CV over the log grid; cross_validate wraps the outer loop\ninner = KFold(n_splits=5, shuffle=True, random_state=0)\nridge_cv = Pipeline([(\"scale\", StandardScaler()),\n                     (\"ridge\", RidgeCV(alphas=alphas, cv=inner))])\nout = cross_validate(ridge_cv, X_train, y_train, cv=cv,\n                     scoring=\"neg_root_mean_squared_error\", return_estimator=True)\n\nbest_alphas = [e.named_steps[\"ridge\"].alpha_ for e in out[\"estimator\"]]\nprint(\"alpha chosen per outer fold:\", np.round(best_alphas, 3))\n\n# One-standard-error rule, computed on an explicit CV table:\n# means = np.array([...])  # CV error per alpha (ascending grid)\n# ses   = np.array([...])  # standard error per alpha\n# i_best = means.argmin()\n# candidates = np.where(means <= means[i_best] + ses[i_best])[0]\n# chosen = alphas[candidates].max()   # most regularised still within 1 SE',
            'regularisation_path.py',
            'python'
          ),
          warn(
            'An unscaled feature set makes the penalty arbitrary',
            'Ridge/Lasso compare coefficient magnitudes; if one feature lives in rupees and another in [0,1], the penalty effectively targets the small-scale feature. StandardScaler inside the pipeline, always.',
          ),
          tip(
            'When two settings are within one standard error, take the simpler one',
            'The one-SE rule converts "3.98 vs 4.05, which is better?" into a decision rule: statistically tied means choose the more regularised model that will degrade less on unseen data.',
          ),
        ],
        worked: {
          title: 'Choosing alpha from a CV table with the one-standard-error rule',
          problem:
            'Ridge CV results (5-fold, RMSE mean ± std): alpha 0.01 → 4.31 ± 0.09; 0.1 → 4.12 ± 0.10; 1 → 3.98 ± 0.08; 10 → 4.05 ± 0.09; 100 → 4.60 ± 0.12. Coefficients at alpha 0 / 1 / 10 are [−12.40, 8.10, −0.62], [−3.10, 2.05, −0.28], [−0.94, 0.71, −0.11]. (a) Apply the minimum rule. (b) Apply the one-standard-error rule. (c) Interpret the coefficient movement and the alpha = 100 end.',
          steps: [
            {
              title: '(a) Minimum rule',
              desc: 'The best CV mean is 3.98 at alpha = 1. Naively, that is your pick.',
            },
            {
              title: '(b) One-SE rule',
              desc: 'Best mean 3.98 with SE (std of the best fold set) 0.08 → accept any alpha whose mean ≤ 3.98 + 0.08 = 4.06. That includes alpha = 1 (3.98) and alpha = 10 (4.05), and excludes 0.1 (4.12) and 100 (4.60). Among accepted candidates choose the MOST regularised → alpha = 10. Rationale: 3.98 and 4.05 are within noise of each other, so buy the extra stability for free.',
            },
            {
              title: '(c) What the penalty is doing',
              desc: 'From alpha 0 → 1 → 10 the coefficients shrink smoothly (−12.40 → −3.10 → −0.94; the small feature’s −0.62 → −0.11) without hitting exact zero — L2 behaviour. The dominant feature keeps its sign and rank, so interpretation survives; only the scale of confidence changes. At alpha = 100, RMSE rebounds to 4.60: the model is being flattened toward the mean (predicting near-constant) — the high-bias end of the U-curve.',
            },
            {
              title: 'The reporting step',
              desc: 'Refit with alpha = 10 on all training data, evaluate once on the sealed test set, and report "Ridge, alpha = 10 (one-SE rule over log grid 1e-3..1e3), test RMSE = ..." — the selection story travels with the number.',
            },
          ],
          solution:
            'Minimum rule → alpha = 1 (3.98). One-SE rule → threshold 4.06 admits alpha 1 and 10 → choose the more regularised alpha = 10. Coefficients shrink monotonically under L2 (no zeros — that is Lasso\'s signature) and alpha = 100 shows the underfit rebound. Selection rule, log grid, and the final untouched test number: the three sentences that make a tuning result defensible.',
        },
        practice: {
          title: 'Feel the U-curve in your own model',
          prompt:
            'For one linear and one tree model: sweep the family\'s strength parameter on a log grid (alpha for Ridge; max_depth or ccp_alpha for a tree) with 5-fold CV, print mean ± std per value, and plot the U-shape. Apply both the minimum and one-SE rules and state which alpha/depth each selects. Note the training score trend alongside the validation trend.',
          hint: 'Training error rises monotonically with the penalty while validation error U-shapes — the crossing region is where the trade-off lives.',
        },
        mistakes: [
          {
            mistake: 'Regularising without standardising the features',
            fix: 'The penalty weighs coefficients that live in different units. StandardScaler in the pipeline before Ridge/Lasso/ElasticNet, every time.',
          },
          {
            mistake: 'Searching alpha linearly (0.1, 0.2, 0.3 …)',
            fix: 'Strength is a scale: use logspace (1e-4 … 1e3). The interesting region spans orders of magnitude, not hundredths.',
          },
          {
            mistake: 'Assuming raising n_estimators regularises a random forest',
            fix: 'More trees reduce variance through averaging and then plateau; they do not make individual trees weaker. Depth, leaf size and max_features are the strength knobs.',
          },
          {
            mistake: 'Stopping training at the best epoch found on the test set (or never stopping boosting)',
            fix: 'Early stopping needs its own validation signal inside training; report the iteration count as a chosen hyperparameter, not a peeked number.',
          },
          {
            mistake: 'Choosing the unregularised best within CV noise',
            fix: 'When candidates are within one standard error, take the more regularised (simpler) one — it is the statistically defensible tiebreak.',
          },
        ],
        exam: {
          question:
            'List the primary regularisation lever for Ridge, a decision tree, a random forest, gradient boosting and kNN, and state the direction of each for reducing variance. Explain why alpha requires standardised features and when you would use the one-standard-error rule.',
          answer:
            'Ridge: alpha — raise it to shrink all coefficients toward zero (L2; Lasso\'s alpha additionally zeroes features via L1). Tree: max_depth / min_samples_leaf / ccp_alpha — raise to prune structure and force averages over leaves. Forest: max_depth and min_samples_leaf (and max_features for decorrelation); n_estimators is averaging, not strength. Boosting: lower learning_rate (paired with more trees), lower max_depth, subsample, plus early stopping. kNN: raise k for wider, smoother neighbourhoods. All directions share one meaning: buy bias to shed variance. Alpha requires standardised features because the penalty compares raw coefficient magnitudes — unscaled units decide which feature is penalised rather than its usefulness. The one-SE rule applies when choosing among configurations whose CV means are within one standard error of the best: pick the most regularised one, since the differences are indistinguishable from noise and simpler models degrade less on unseen data.',
          source: 'Core ML tuning interview question (lever mapping + selection rule).',
        },
        summary: [
          'Regularisation adds a complexity price to the loss — raising it buys bias and sheds variance in every family.',
          'Linear: alpha (Ridge shrinks, Lasso zeros, ElasticNet mixes); trees: depth/leaf-size/pruning; forest: depth/leaf/max_features; boosting: shrinkage + early stopping; kNN: k; SVM: C and gamma.',
          'Scale features before penalising coefficients — otherwise units, not signal, decide what gets cut.',
          'Search strength on a log grid; expect a U-shaped validation curve with training error rising all along.',
          'One-SE rule: within noise of the best, take the simpler/more regularised candidate.',
          'Data volume and regularisation substitute: scarce data needs the penalty; abundant data forgives it.',
        ],
      }),
      [
        [
          'Increasing alpha in Ridge regression causes the coefficients to:',
          [
            'Grow larger to fit the data harder',
            'Shrink smoothly toward zero (none exactly zero under pure L2), trading training fit for stability',
            'Become exactly zero for unimportant features',
            'Flip sign randomly',
          ],
          1,
          'L2 penalises squared magnitude, pulling every coefficient toward zero continuously; exact zeros are the L1 (Lasso) signature.',
        ],
        [
          'Which pair of hyperparameter changes makes an individual model SIMPLER (lower variance)?',
          [
            'Deeper trees and smaller min_samples_leaf',
            'Higher ridge alpha and a larger min_samples_leaf',
            'Higher boosting learning rate with fewer trees and k = 1 in kNN',
            'Smaller k in kNN and higher SVM C',
          ],
          1,
          'Both reduce capacity: alpha shrinks coefficients; a larger min_samples_leaf forces every prediction to average more rows.',
        ],
        [
          'Early stopping in gradient boosting means:',
          [
            'Stopping when training error first hits zero',
            'Halting tree addition when validation performance stops improving (with patience) — the iteration count becomes the regulariser',
            'Stopping if the learning rate decays below a threshold',
            'Removing features whose importance drops',
          ],
          1,
          'Each added tree can overfit eventually; monitoring validation performance picks the effective ensemble size without peeking at the test set.',
        ],
        [
          'You must search regularization strength spanning 0.0001 to 1000. The correct grid is:',
          [
            'np.arange(0.0001, 1000, 1)',
            'A log-spaced grid (e.g. np.logspace(-4, 3, 15)) — strength acts across orders of magnitude',
            'Values centred at 1 only',
            'Any grid; CV compensates',
          ],
          1,
          'Penalty strength is a scale parameter: equally spaced linear grids waste almost all evaluations at the wrong end of the range.',
        ],
      ]
    ),
    lesson(
      M7,
      'mlf-7-3',
      73,
      'Hyperparameter Search: Grid, Random, and Bayesian (the Optuna Idea)',
      'Three search strategies with their budget arithmetic — why random beats grid when only some parameters matter, how Bayesian optimisation learns from finished trials, and the rules that keep the search honest.',
      21,
      nineBlocks({
        objectives: [
          'Compute the fit budget of a grid search and explain why random search resolves important dimensions better at equal budget',
          'Describe how a Bayesian optimiser (TPE/GP) uses past trials to choose the next configuration',
          'Set up a log-scale search space with conditional parameters for an Optuna study',
          'Protect the evaluation protocol from multiple-comparisons inflation during a long search',
        ],
        hook:
          'Grid search feels rigorous: every combination, systematically, nothing missed. It is the spreadsheet instinct applied to model tuning, and it fails for exactly the reason spreadsheets fail — it spends your budget equally on things that do not matter. Tune a boosting learning rate over five values while three other parameters are also in the grid and three quarters of your fits vary only the parameters that barely move the score. Meanwhile a rival who drew configurations at random covered ten distinct values of the parameter that mattered, found a better model with half the fits, and got home earlier. Then a third practitioner let a Bayesian optimiser plan each trial from the results of the last fifty, and beat both on a hundred evaluations. This lesson is about spending a fixed budget of fits as intelligently as possible — and keeping the resulting number honest.',
        concept: `**The search problem.** Hyperparameters are the settings chosen *outside* training (alpha, depth, learning_rate, k, threshold); parameters are what training learns (weights, split rules). The goal: given a budget of evaluations (each = k folds × training time), find the configuration whose cross-validated score is highest. Three strategies spend that budget differently, and the right choice depends on how many parameters actually matter and how expensive one evaluation is.

**Grid search: exhaustive and myopic.** GridSearchCV enumerates the Cartesian product of a discrete list per parameter. Its virtue — complete coverage of the *grid you specified* — is also its failure: the product explodes multiplicatively (4 depths x 5 leaf sizes x 5 learning rates = 100 configurations; at 5 folds that is 500 fits before you have tuned anything else), and every dimension gets the same resolution whether or not it matters. If only one of five parameters influences the score, a 3-point grid gives that parameter exactly three tested values, repeated across all the irrelevant combinations — budget spent re-running near-identical models. Grid is defensible for one or two genuinely discrete, low-importance parameters where you want every cell reported; beyond that it is the default people inherit rather than the default they choose.

**Random search: the resolution argument.** Draw configurations uniformly at random from the space (continuous parameters come free — no discretisation decision). The celebrated result behind this (Bergstra & Bengio, 2012): suppose only *d* of your *N* parameters affect the score. A grid with k values per dimension must evaluate k^N combinations to achieve k distinct values of each important parameter; random search achieves *k distinct values of each important parameter in only k evaluations on average* — because no two random draws repeat a coordinate the way a grid does. With a budget of 9 runs, a 3x3 grid probes the important parameter at 3 values while random probing delivers roughly 8 or 9 distinct values of it. When you do not know which parameters matter (you never do), random search strictly dominates at equal budget — and it also *reveals* which parameters matter, because you can plot score against each parameter independently afterwards. The implementation is a one-line upgrade: RandomizedSearchCV(n_iter=..., param_distributions={...}, log-distributed where needed).

**Bayesian optimisation: search that remembers.** Grid and random are *memoryless* — trial 90 learns nothing from trials 1–89. Bayesian hyperparameter optimisation builds a probabilistic surrogate model of score-as-a-function-of-configuration from all completed trials, then picks the next configuration by maximising an acquisition function that trades **exploration** (regions where the surrogate is uncertain) against **exploitation** (regions the surrogate predicts are good). In practice: early trials look random (the surrogate knows nothing), and later trials concentrate around promising regions while still probing the edges — you get more high-scoring trials per evaluation, which is exactly what you want when each trial costs GPU-hours. The dominant modern implementation is **TPE** (Tree-structured Parzen Estimator, Optuna\'s default): instead of modelling score directly, it models "good configurations" vs "bad configurations" as separate densities and samples where their ratio is best — which handles conditional spaces naturally (gamma only matters if the kernel is RBF; the surrogate just learns that). GP-based SMBO (the classical smac-style approach) is the other family; TPE scales better to many trials and mixed parameter types. Bayesian search also buys **multi-fidelity tricks**: successive halving/Hyperband train many configurations briefly and only continue the promising ones, and Optuna\'s **pruner** (MedianPruner and friends) aborts a trial whose intermediate signal (validation loss at epoch t, or score after fold i) is below the median of trials at the same stage — you stop paying for losers early. Typical guidance: random for the first 10–20 trials (warm-up the surrogate), then let acquisition take over; 50–200 trials for a serious tabular model; parallelize with caveats (a parallel sampler approximates the acquisition).

**The rules that keep a search honest.** (1) **One frozen protocol**: identical CV splits, identical metric, identical preprocessing for every configuration — otherwise you are tuning noise differences between folds. (2) **Budget accounting**: trials x folds x fit-time; if the budget is fixed, fewer folds and more trials often explore better than many folds on few trials (and vice versa when data is tiny and estimates are noisy). (3) **Log-scale everything scale-like**: alpha, learning_rate, C, gamma, regularization strength — draw them log-uniformly, because their interesting ranges are multiplicative. (4) **The validation set is now training data for the search**: after 100 trials the best validation score is a *selected* maximum and is optimistically biased (Lesson 7.4 puts numbers on it) — so the score you publish comes from a sealed holdout or an outer CV loop, and the test set is touched exactly once with the final frozen configuration. (5) **Log everything**: configuration, seed, fold scores, timestamp — the study object is your experiment record, and a search you cannot reproduce was a lottery, not an experiment.`,
        extras: [
          table(
            'Grid vs random vs Bayesian',
            ['Strategy', 'How it picks', 'Budget efficiency', 'Best when', 'Main risk'],
            [
              ['Grid', 'Cartesian product of lists', 'Poor beyond ~2–3 params — repeats irrelevant combinations', 'One/two discrete params, every cell must be reported', 'Combinatorial blow-up; equal resolution on unimportant dims'],
              ['Random', 'Independent draws per parameter', 'Strong: ~k distinct values of each important param in k trials', 'Unknown parameter importance (always); warm-up phase', 'Memoryless — never concentrates on good regions'],
              ['Bayesian (TPE/GP)', 'Surrogate + acquisition over past trials', 'Best per evaluation once warm; pairs with pruning', 'Expensive evaluations; 50–200 trial budgets', 'Needs a sane search space; early trials are essentially random'],
              ['Successive halving / Hyperband', 'Racing: many cheap starts, few full runs', 'Best when training length itself is a resource', 'Long-running learners (boosting rounds, epochs)', 'Badly set rungs can eliminate early winners'],
            ],
          ),
          code(
            '# Three searches on the same protocol — same folds, same metric\nfrom sklearn.model_selection import (GridSearchCV, RandomizedSearchCV,\n                                     StratifiedKFold)\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.ensemble import GradientBoostingClassifier\nfrom scipy.stats import loguniform, uniform\nimport numpy as np\n\ncv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)  # frozen splits\npipe = Pipeline([(\"scale\", StandardScaler()),\n                 (\"gb\", GradientBoostingClassifier(random_state=0))])\n\n# 1) Grid — small, discrete, and only because the space is tiny\ngrid = {\"gb__max_depth\": [2, 3, 4], \"gb__n_estimators\": [100, 200]}\nGridSearchCV(pipe, grid, cv=cv, scoring=\"roc_auc\").fit(X_train, y_train)\n\n# 2) Random — log-uniform on scale parameters, budget expressed as n_iter\nspace = {\"gb__max_depth\": [2, 3, 4, 5, 6],\n         \"gb__learning_rate\": loguniform(1e-3, 0.3),\n         \"gb__subsample\": uniform(0.6, 0.4)}\nrand = RandomizedSearchCV(pipe, space, n_iter=40, cv=cv, scoring=\"roc_auc\",\n                          random_state=0).fit(X_train, y_train)\nprint(\"random best:\", rand.best_params_, round(rand.best_score_, 4))\n\n# 3) Bayesian — Optuna suggests, prunes and records every trial\nimport optuna\noptuna.logging.set_verbosity(optuna.logging.WARNING)\n\ndef objective(trial):\n    depth = trial.suggest_int(\"max_depth\", 2, 8)\n    lr = trial.suggest_float(\"learning_rate\", 1e-3, 0.3, log=True)\n    sub = trial.suggest_float(\"subsample\", 0.6, 1.0)\n    total, aucs = 0.0, []\n    for i, (tr, va) in enumerate(cv.split(X_train, y_train)):\n        m = GradientBoostingClassifier(max_depth=depth, learning_rate=lr,\n                                       subsample=sub, n_estimators=400,\n                                       random_state=0)\n        m.fit(X_train[tr], y_train[tr])\n        s = roc_auc_score(y_train[va], m.predict_proba(X_train[va])[:, 1])\n        aucs.append(s)\n        total = (total * i + s) / (i + 1)      # running mean across folds\n        trial.report(total, i)\n        if trial.should_prune():               # stop paying for a loser\n            raise optuna.TrialPruned()\n    return float(np.mean(aucs))\n\nstudy = optuna.create_study(direction=\"maximize\",\n                            pruner=optuna.pruners.MedianPruner(n_warmup_trials=5))\nstudy.optimize(objective, n_trials=80, timeout=900)\nprint(study.best_params, round(study.best_value, 4),\n      \"pruned:\", len([t for t in study.trials if t.state.is_pruned()]))\n# Final: refit best config on ALL training data, evaluate ONCE on the sealed test',
            'search_grid_random_bayes.py',
            'python'
          ),
          warn(
            'After 100 trials, the best validation score is a selected maximum',
            'Selection inflates the number you saw being optimised. Publish only the sealed-holdout or outer-CV score of the frozen winner — and keep the test set for exactly one evaluation.',
          ),
          tip(
            'Log-scale every scale hyperparameter, and declare conditional spaces',
            'alpha, learning_rate, C and gamma span orders of magnitude — draw them log-uniformly. Parameters that only exist under a condition (gamma for an RBF kernel) should be suggested inside that branch; TPE handles it natively.',
          ),
        ],
        worked: {
          title: 'Budget arithmetic: why the grid wastes your fits, and what Bayesian adds',
          problem:
            'You may afford 450 fits (5 folds x 90 configurations). The grid is max_depth {4,6,8,10} x min_samples_leaf {1,5,10,20,50} x learning_rate {0.01,0.05,0.1,0.2,0.5} = 100 configs. (a) How many fits does the full grid take, and how many distinct values does each parameter get? (b) With a 9-evaluation budget where ONLY learning_rate matters, compare a 3x3 grid with 9 random draws on the resolution of learning_rate. (c) Describe what trial 40 of an Optuna study knows that random draw 40 does not.',
          steps: [
            {
              title: '(a) Grid budget',
              desc: '100 configs x 5 folds = 500 fits — already over the 450-fit budget, so the grid must be cut (say to 90 configs by dropping a row), and each parameter still only ever sees its listed values: 4 depths, 5 leaf sizes, 5 rates. Everything not on the list is invisible, no matter how promising the region.',
            },
            {
              title: '(b) Resolution where it matters',
              desc: 'Grid 3x3 (learning_rate x depth): learning_rate is evaluated at exactly 3 distinct values, each three times (2 of every 3 fits vary only depth, which is irrelevant here). Nine random draws give about 8–9 distinct learning_rate values across the same range — roughly three times the resolution on the only dimension that counts, with the same budget. Nothing about the data was needed for this argument; it is pure budget geometry, and it is why random is the default.',
            },
            {
              title: '(c) What memory buys',
              desc: 'Trial 40 of a Bayesian study has a surrogate fitted on 39 completed (config, score) pairs: it knows that learning_rate near 0.03 with depth 5 was good, that subsample 0.65 was mediocre, and that an entire corner of the space is uncertain. Its next suggestion maximises an acquisition function balancing exploitation (that good region) with exploration (the uncertain corner). Random draw 40 knows none of it — it is equally likely to waste the trial in a region 39 trials already disproved. At equal trial counts, the Bayesian study tends to end with more of its budget sitting on high scores — and with a pruner, part of the budget was never spent to completion at all.',
            },
          ],
          solution:
            '(a) 500 fits > 450 budget; grid resolution = 4/5/5 distinct values. (b) 3 vs ~8–9 distinct values of the important parameter at equal budget — random wins resolution where it matters. (c) The Bayesian trial conditions on all past results (exploit good, explore uncertain, prune losers); random is memoryless. Same budget, different information use — and always: frozen splits, log-scale draws, sealed final evaluation.',
        },
        practice: {
          title: 'Run the three-way race',
          prompt:
            'On one moderately expensive model (a forest or booster): fix 5-fold CV and one metric, then run (1) a small grid, (2) RandomizedSearchCV with 40 log-distributed trials, (3) an Optuna study with 40 trials and pruning. Record best validation score, time taken and number of fits for each. Report which won per unit of compute and what each strategy revealed about which parameters matter.',
          hint: 'Plot score vs each parameter for the random/Bayesian runs — the visible correlation instantly ranks parameter importance, which a grid cannot do.',
        },
        mistakes: [
          {
            mistake: 'Defaulting to a grid because it "covers everything"',
            fix: 'It covers the product of your lists — at the cost of re-testing irrelevant combinations. Random covers more of what matters at equal budget; use grids only for tiny discrete spaces.',
          },
          {
            mistake: 'Drawing scale parameters uniformly (alpha from 0 to 100 linearly)',
            fix: 'Log-uniform draws: most useful values of alpha, lr, C, gamma live near the small end; linear draws waste most trials on huge values.',
          },
          {
            mistake: 'Reporting the best validation score found by a 100-trial search as the model result',
            fix: 'That is a selected maximum. Freeze the winner, evaluate on a sealed holdout or outer CV, and quote that number (Lesson 7.4\'s arithmetic shows how large the inflation can be).',
          },
          {
            mistake: 'Changing CV splits or metric between configurations',
            fix: 'Identical frozen folds for the whole search — otherwise the optimiser is fitting fold luck, and comparisons between trials are meaningless.',
          },
          {
            mistake: 'Forgetting to log configs, seeds and per-fold scores',
            fix: 'The study is your experiment record. An unlogged search cannot be reproduced, audited or defended — it was a lottery with extra steps.',
          },
        ],
        exam: {
          question:
            'Explain why random search can outperform grid search at equal budget when only some hyperparameters matter. Then describe how Bayesian (TPE) search chooses its next trial, name one pruning strategy, and state the protocol that keeps the final reported score honest.',
          answer:
            'Resolution argument: a grid achieves k distinct values of each of N parameters only by evaluating k^N combinations, so if only d < N matter, most evaluations repeat the important coordinates — with a budget of k random draws, each important parameter still gets ~k distinct values on average. When importance is unknown (always), random puts strictly more resolution on the dimensions that count and additionally reveals importance by score-vs-parameter plots. Bayesian/TPE: maintain a surrogate (density-ratio model of good vs bad configurations) over completed trials; pick the next configuration where the acquisition (exploitation of predicted-good regions vs exploration of uncertain ones) is best — early trials look random, later ones concentrate. Pruning: MedianPruner-style mid-trial aborts when the intermediate signal (validation loss at epoch t, running CV mean after fold i) falls below the median of trials at the same stage; successive halving/Hyperband are the same idea at population scale. Honesty protocol: frozen CV splits and metric for every trial; log-scale/conditional search spaces; treat validation as training-for-the-search (selection inflates the best score); freeze the winning configuration, refit on all training data, and evaluate exactly once on a sealed test set (or use nested CV) — only that number is reportable.',
          source: 'Standard model-tuning interview sequence (grid vs random rationale + Bayesian mechanics + evaluation hygiene).',
        },
        summary: [
          'Grid = complete over your lists, wasteful when parameters differ in importance; fine only for tiny discrete spaces.',
          'Random search resolves important dimensions ~k times in k trials — the default when importance is unknown (it always is).',
          'Bayesian search (TPE in Optuna) models finished trials and trades exploration vs exploitation; pruners stop losers mid-run.',
          'Log-uniform draws for scale parameters; conditional spaces for parameter dependencies; log every trial.',
          'Identical frozen folds and metric for the whole search; budget = trials x folds x fit-time.',
          'Best validation score after many trials is a selected maximum — the reportable number comes from a sealed holdout or outer loop.',
        ],
      }),
      [
        [
          'With a budget of 9 evaluations and only ONE of your hyperparameters actually affecting performance, random search will usually:',
          [
            'Test that parameter at roughly 9 distinct values, while a 3x3 grid tests only 3 — better resolution where it matters',
            'Perform identically to the grid, by definition',
            'Test fewer distinct values than the grid',
            'Fail because random search needs a grid to define bounds',
          ],
          0,
          'Grid repeats coordinates across combinations; random draws almost never repeat — that is the Bergstra-Bengio resolution result.',
        ],
        [
          'A Bayesian optimiser selects the next configuration by:',
          [
            'Trying every neighbour of the current best',
            'Maximising an acquisition function over a surrogate fitted to past trials, balancing exploration against exploitation',
            'Sampling uniformly until the surrogate converges',
            'Always re-running the current best with a new random seed',
          ],
          1,
          'The surrogate encodes what has been learned; acquisition trades uncertain exploration against predicted-good exploitation — the memory that random lacks.',
        ],
        [
          'In Optuna, a pruner stops a trial when:',
          [
            'The trial exceeds the wall-clock limit of the fastest trial',
            'Its intermediate signal (e.g. running CV mean, validation loss at epoch t) is worse than the median of comparable trials',
            'The study has already found the best params',
            'Any fold scores below 0.5',
          ],
          1,
          'Median-style pruning aborts losers early so budget flows to promising trials — multi-fidelity search applied inside a trial.',
        ],
        [
          'After a 100-trial search, the highest validation score you observed should be treated as:',
          [
            'The model\'s expected performance',
            'An optimistically biased selected maximum — publish only the sealed-holdout or outer-CV score of the frozen winner',
            'A lower bound on true performance',
            'Identical to the test score by construction',
          ],
          1,
          'Maximising over many noisy estimates inflates the maximum; selection and estimation must happen on different data.',
        ],
      ]
    ),
    lesson(
      M7,
      'mlf-7-4',
      74,
      'Feature Importance and Leakage, Re-checked Under Tuning Pressure',
      'Impurity vs permutation importance and what each one lies about, plus the leaks that a long hyperparameter search actively finds and exploits — with the arithmetic of validation overfitting.',
      20,
      nineBlocks({
        objectives: [
          'Compute permutation importance as a held-out score drop and contrast it with impurity (MDI) importance',
          'Name the two main biases of each importance method and explain why correlated features distort both',
          'Quantify the expected inflation of a best-of-N validation search with the sqrt(2 ln N) rule',
          'Run a leakage audit checklist that covers target leakage, fold leakage and test-set reuse',
        ],
        hook:
          'The report says the model is excellent and the third most important feature is customer_id. Nobody ordered that: impurity importance adores high-cardinality columns, because every distinct value offers another chance to carve a lucky split. Fix it with permutation importance and a different surprise appears — the true driver income looks unimportant, because income_city (a near-duplicate) absorbs its credit when you shuffle one of the pair. And while the team debates which number to believe, a 200-trial hyperparameter search quietly discovers that a leaky feature exists, selects the configuration that leans on it hardest, and reports a validation score that will collapse on day one of production. Importance methods and tuning searches have the same failure mode: they are optimisers pointed at your data, and anything exploitable in the data — bias, correlation, leakage — will be found and maximised.',
        concept: `**Impurity importance (MDI): fast, built-in, structurally biased.** Random forests and boosted trees expose feature_importances_ as the total decrease in node impurity (Gini/entropy), summed across every split that used the feature and weighted by the number of rows reaching the split. It is free (computed during training), covers every feature, and gives a plausible ranking — with three documented lies. (1) **Cardinality bias**: a continuous or high-ID feature has many candidate thresholds, so it gets many more chances to find a good split than a binary flag; MDI systematically promotes columns like IDs, dates and codes even when they carry no signal (the customer_id example above). (2) **Training-data optimism**: it is computed on the same rows the splits were chosen to fit — noisy features look useful because the split *was* chosen to look useful. (3) **Correlated credit-splitting**: when two features carry the same signal, the forest splits on whichever came first at random, so the importance fragments across the pair and both look weaker than the truth. MDI answers "how much did the fitted forest use this feature?" — not "does this feature matter?" and certainly not "does this feature cause anything".

**Permutation importance: the model-agnostic question done right.** The procedure: take held-out data, record the model\'s score; shuffle one feature\'s column (breaking its relationship with the target while keeping its distribution); re-score; the **drop** is that feature\'s importance; repeat a few times and report mean ± sd of the drop. Because it runs on data the model never trained on and asks a counterfactual ("does the model need this column?"), it inherits neither MDI\'s training optimism nor its cardinality love — the ID column shuffles to nothing because the model cannot use a permuted ID either. sklearn\'s permutation_importance does exactly this (n_repeats, scoring, random_state). Its own caveats: (1) **correlated features mask each other** — shuffle income while income_city still holds the signal and the score barely moves, so both appear unimportant (the complement of MDI\'s splitting problem); (2) **shuffling creates impossible rows** (income shuffled onto rows with its own correlated companions), which can *overstate* importance by punishing off-manifold inputs; (3) it costs predictions, not training — cheap, but still n_features x repeats x rows. Practical protocol: run both methods; where they **disagree**, you have found structure — high MDI with low permutation usually means cardinality bias; low MDI with high permutation usually means correlated masking. Then group correlated features and permute them together (or use drop-column refits for the few features you actually care about). And keep the epistemic humility: importance is association under a model, not causation; a feature can be important because it encodes a leak, and importance never tells you the sign or shape of the effect (that is what partial dependence or a coefficient table are for).

**Leakage, re-checked through the tuning lens.** A single model might stumble into a leak by accident; a *search* systematically finds it. Every candidate configuration is an experiment asking "what maximises this validation score?" — so any information path from validation/test into training is a hill the optimiser will climb. Four families, four audits. (1) **Target leakage**: a feature whose value is only known after the label (days_until_default, cancel_flag, post_purchase fields) — audit by asking, for every feature, "would this value exist, unchanged, at the moment of prediction?" (2) **Fold leakage**: scaling, imputation, feature selection, SMOTE or target encoding fitted before/outside cross-validation; groups or time leaking across folds — audit by insisting everything learned lives inside a Pipeline inside the splitter (Module 6, restated because tuning is where it hurts). (3) **Test-set reuse**: touching the test set across iterations (or reporting best-of-N validation as the result) converts the test set into training signal for *your decisions*; audit by counting test evaluations — the number should be one. (4) **Selection inflation** even on clean validation: with N configurations tried, the best score contains a pure-selection component. The approximation: the expected maximum of N draws of pure noise is about σ·√(2 ln N) above the mean — N = 100 and fold noise σ = 0.01 gives 0.01 × √(2 ln 100) ≈ 0.01 × 3.03 ≈ **0.030**: three accuracy points conjured from nothing by the act of choosing. That is why "we tried 200 configs and validation improved 0.4%" can mean exactly zero, and why the confirm-on-sealed-holdout step is not ceremony — it is the difference between a measurement and a mirage.`,
        extras: [
          table(
            'Impurity (MDI) vs permutation importance',
            ['Aspect', 'Impurity / MDI', 'Permutation'],
            [
              ['Source', 'Computed during training (sum of Gini decreases)', 'Score drop when a column is shuffled on held-out data'],
              ['Data used', 'Training rows (optimistic)', 'Held-out rows'],
              ['Main bias', 'Favours continuous/high-cardinality features', 'Understates importance of correlated twins; shuffling creates off-manifold rows'],
              ['Cost', 'Free', 'Predictions x repeats x features'],
              ['Question answered', 'What did the fitted forest use?', 'Does the model\'s score depend on this column?'],
              ['Causality', 'Neither method gives causation — both are association under a model', ''],
            ],
          ),
          code(
            '# Permutation importance on held-out data, and an MDI comparison\nimport numpy as np\nfrom sklearn.inspection import permutation_importance\nfrom sklearn.ensemble import RandomForestClassifier\nfrom sklearn.model_selection import train_test_split\n\nX_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25,\n                                            stratify=y, random_state=0)\nrf = RandomForestClassifier(n_estimators=400, random_state=0).fit(X_tr, y_tr)\n\nmdi = rf.feature_importances_                       # built-in, training-based\nperm = permutation_importance(rf, X_te, y_te, n_repeats=15,\n                              scoring=\"roc_auc\", random_state=0)\n\norder = np.argsort(perm.importances_mean)[::-1]\nfor i in order:\n    print(f\"{X.columns[i]:>20s}  perm={perm.importances_mean[i]:.4f} \"\n          f\"+/- {perm.importances_std[i]:.4f}   mdi={mdi[i]:.4f}\")\n\n# High MDI + near-zero permutation on an id/date column = cardinality bias.\n# Low MDI + high permutation on twins = correlated masking -> permute together:\n# X_te[[\"income\", \"income_city\"]] = X_te[[\"income_city\", \"income\"]].to_numpy()\n\n# Leakage tripwire: a feature whose importance EXCEEDS plausible signal\n# (e.g. importance ~ the whole score) deserves the \"known at predict time?\" audit.',
            'importance_audit.py',
            'python'
          ),
          warn(
            'A hyperparameter search will find and exploit any leak you leave in the data',
            'Each trial is an experiment maximising your validation score; a leaky feature is a shortcut that the optimiser will pick and amplify. Audit features for predict-time availability BEFORE searching.',
          ),
          info(
            'The sqrt(2 ln N) rule for validation overfitting',
            'Best-of-N selection on noise alone adds about sigma x sqrt(2 ln N) to the reported maximum: N = 100 and sigma = 1 point gives roughly +3 points of imaginary gain. Confirm every winner on a sealed holdout before believing it.',
          ),
        ],
        worked: {
          title: 'Two importance readings, then the price of 100 trials',
          problem:
            'A classifier scores 0.840 on held-out AUC-accuracy. Shuffling feature A drops it to 0.760; shuffling a high-cardinality customer_id column drops it to 0.839 — yet the forest\'s impurity importance ranks customer_id second. Separately, a search runs 100 configurations with fold noise sigma = 0.01 and the best improves validation by 0.030. (a) Interpret both importance numbers. (b) Compute the expected pure-selection inflation and verdict on the 0.030 gain. (c) State the fix protocol for each problem.',
          steps: [
            {
              title: '(a) Importance, read twice',
              desc: 'Permutation: A matters (0.840 → 0.760, a drop of 0.080 — the score depends on that column); customer_id does not (0.840 → 0.839, drop 0.001). MDI ranking customer_id second is the cardinality bias: many candidate thresholds = many chances for a lucky split, measured on the training rows where that luck was chosen. The disagreement is the diagnosis — trust the held-out counterfactual, and go look for what ID was proxying (site, region, batch).',
            },
            {
              title: '(b) Selection inflation arithmetic',
              desc: 'Expected max of N = 100 noise draws above the mean ≈ sigma·sqrt(2 ln N) = 0.01 × sqrt(2 × ln 100) = 0.01 × sqrt(9.21) = 0.01 × 3.03 ≈ 0.030. The observed best-of-100 gain is 0.030 — exactly what selection alone produces when nothing differs. Verdict: indistinguishable from nothing.',
            },
            {
              title: '(c) The fixes',
              desc: 'Importance: compute permutation on held-out data; drop or bin ID-like columns before training; permute correlated groups together; corroborate with a domain check. Selection: freeze the winner, refit on all training data, evaluate once on a sealed holdout (or nest the CV loops); if the gain does not survive, keep the simpler model and log the negative result so nobody re-runs it.',
            },
            {
              title: 'The deeper point',
              desc: 'Both failures are optimisers exploiting structure that is not signal: MDI exploiting cardinality, the search exploiting noise, a tuned pipeline exploiting leakage. Every number in a report is downstream of what your procedure *could* have maximised — design the procedure first.',
            },
          ],
          solution:
            '(a) Permutation says A = 0.080 (real dependence) and customer_id = 0.001 (noise); MDI\'s second-place ranking for the ID is cardinality bias on training rows. (b) 0.01 x sqrt(2 ln 100) ≈ 0.030 — the reported 0.030 gain equals pure selection inflation; believe nothing until a sealed holdout confirms it. (c) Held-out permutation + ID removal + group permutation for importance; frozen winner + single holdout evaluation + logged negatives for the search. Optimisers maximise whatever you leave maximisable — leaks, luck and all.',
        },
        practice: {
          title: 'Disagree the two importance methods on purpose',
          prompt:
            'Fit a random forest with at least one high-cardinality column (id, date, zip) and a pair of correlated features. Compute impurity importance and held-out permutation importance (15 repeats). Rank them side by side and explain every disagreement in one sentence each. Then write the predict-time availability question and answer it for your two top features.',
          hint: 'MDI promoting an ID/date column = cardinality bias; permutation hiding a correlated twin = masking (permute the pair together to recover the shared credit).',
        },
        mistakes: [
          {
            mistake: 'Reading feature_importances_ as "what matters" without a held-out check',
            fix: 'Run permutation importance on held-out data; treat MDI–permutation disagreement as a diagnostic (cardinality bias vs masking), not an inconvenience.',
          },
          {
            mistake: 'Permuting correlated features one at a time and declaring them unimportant',
            fix: 'Shuffle correlated groups together (or refit without the group) — otherwise each twin hides behind the other and the total contribution vanishes from the report.',
          },
          {
            mistake: 'Tuning for weeks and reporting the best validation score seen',
            fix: 'That number is a selected maximum inflated by roughly sigma x sqrt(2 ln N). Freeze the winner and confirm on a sealed holdout, or nest the loops.',
          },
          {
            mistake: 'Fitting selection/encoding/resampling outside the CV folds',
            fix: 'Everything learned goes inside the Pipeline inside the splitter; SMOTE inside an imblearn pipeline; target encoding computed per fold. Leaks survive only where procedures allow them.',
          },
          {
            mistake: 'Treating importance as causation or as a sign of effect',
            fix: 'Importance is association under a fitted model. For direction and shape use coefficients/partial dependence; for causation use an experiment, not a forest.',
          },
        ],
        exam: {
          question:
            'Contrast impurity (MDI) and permutation importance, including one bias of each. A search over 100 configurations improves validation by 0.03 with fold noise sigma = 0.01 — assess it quantitatively and prescribe the protocol that would make the gain credible.',
          answer:
            'MDI: sum of impurity decreases across a feature\'s splits on training data — free and instantaneous, but biased toward high-cardinality/continuous features (more candidate thresholds → more chances for lucky splits), optimistic (measured on fitted rows), and it splits credit between correlated features. Permutation: shuffle the column on held-out data and measure the score drop — model-agnostic and honest about IDs, but understates importance when a correlated twin remains, and shuffling can create off-manifold rows that overstate importance; run both and treat disagreement as diagnosis. Assessment of the gain: best-of-N selection on noise alone adds about sigma x sqrt(2 ln N) = 0.01 x sqrt(2 ln 100) = 0.01 x 3.03 ≈ 0.030 — exactly the observed improvement, so the gain is indistinguishable from selection inflation. Credible protocol: freeze the winning configuration, refit on all training data, evaluate once on a sealed holdout (or use nested CV for the whole selection), compare against the baseline and the simpler challenger on that single evaluation, and log the result. Only a gain that survives untouched data is a gain; everything before that is a hypothesis.',
          source: 'Interview-grade synthesis (importance methods + multiple-comparisons arithmetic).',
        },
        summary: [
          'Impurity importance is free but biased toward high-cardinality features, optimistic on training rows, and splits credit under correlation.',
          'Permutation importance asks the right counterfactual on held-out data; correlated twins mask each other — permute groups together.',
          'Disagreement between the two methods is information: cardinality bias vs correlated masking.',
          'Importance is association under a model — never causation, never a direction of effect.',
          'A search amplifies every leak: audit predict-time availability of features before tuning, and keep all learned steps inside the pipeline inside the folds.',
          'Best-of-N validation inflation ≈ sigma x sqrt(2 ln N); confirm winners on a sealed holdout before reporting anything.',
        ],
      }),
      [
        [
          'Permutation importance of a feature is measured as:',
          [
            'The coefficient magnitude in a linear model',
            'The drop in held-out score when that feature\'s column is randomly shuffled',
            'The number of splits the forest made with it',
            'Its correlation with the target',
          ],
          1,
          'Shuffling breaks the feature–target relationship while keeping its marginal distribution; the score drop quantifies the model\'s dependence on it.',
        ],
          [
          'Impurity (MDI) importance tends to over-rate a high-cardinality column such as customer_id because:',
          [
            'IDs are always predictive',
            'More distinct values mean more candidate split thresholds — more chances for a lucky impurity decrease, measured on training rows',
            'The forest stores IDs separately',
            'Permutation importance cannot see IDs',
          ],
          1,
          'Cardinality bias is structural: many thresholds = many opportunities; held-out permutation exposes the truth (near-zero drop).',
        ],
        [
          'You tried 100 configurations with fold noise sigma = 0.01, and the best beat the mean by 0.03. The correct verdict is:',
          [
            'A strong result — deploy immediately',
            'The gain equals the expected pure-selection inflation (0.01 x sqrt(2 ln 100) ≈ 0.030); confirm it on a sealed holdout before believing it',
            'The search was too small; run 1000 trials',
            'The folds must be broken',
          ],
          1,
          'Maximising over noisy estimates inflates the maximum by about sigma*sqrt(2 ln N); this gain is indistinguishable from choosing the luckiest trial.',
        ],
        [
          'Two features are 0.95 correlated; permutation shows near-zero importance for both. Best next step:',
          [
            'Delete both as irrelevant',
            'Permute them together (or refit without the pair) so their shared signal cannot hide behind its twin',
            'Switch to impurity importance and trust whichever is larger',
            'Increase the permutation repeats only',
          ],
          1,
          'Correlated masking: either twin preserves the signal when the other is shuffled. Group permutation (or drop-column refit) recovers the joint credit.',
        ],
      ]
    ),
  ],
};
