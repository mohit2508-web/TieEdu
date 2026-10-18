// Module 4 — Trees & Ensembles
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code } from '../nineBlocks';
import { lesson, M4, COURSE_ID } from './helpers';

export const module4: CourseModule = {
  id: M4,
  course_id: COURSE_ID,
  title: 'Module 4 — Trees & Ensembles',
  summary:
    'Decision trees from split criteria to pruning; the invariances that explain why trees need no scaling and where they break; random forests via bagging, feature randomness, and out-of-bag scoring; and gradient boosting — learners correcting residuals — including when trees dominate tabular ML and when they quietly lose to linear models.',
  sort_order: 4,
  lessons: [
    lesson(
      M4,
      'mlf-4-1',
      41,
      'Decision Trees: Splits, Gini, Entropy, Depth, and Pruning',
      'How a tree grows by greedy impurity reduction, how to compute Gini and information gain by hand, why depth is the overfitting dial, and how pre- and post-pruning keep trees honest.',
      21,
      nineBlocks({
        objectives: [
          'Compute Gini impurity and entropy for a node and choose the better split by weighted impurity reduction',
          'Explain the greedy top-down growth of a decision tree and its myopia',
          'Diagnose overfitting from tree depth and control it with max_depth, min_samples_leaf, and pruning',
          'Read a small fitted tree and state the decision path for a new instance',
        ],
        hook:
          'Twenty yes/no questions. That is the game a decision tree plays with your data — "Is area > 100 sqm? Yes → Is bedrooms ≥ 3? No → predict ₹18.5 lakh." Humans built trees to sort mail, diagnose equipment, and approve small loans long before anyone called it machine learning. Then the tree met a dataset with noise and grew 400 questions deep, memorised every quirk, and collapsed on new data. Same structure, opposite outcome — the difference is entirely in how deep you let it grow and when you stop it.',
        concept: `**The structure: axis-aligned questions, recursively applied.** A decision tree partitions the feature space into axis-aligned boxes by asking one feature threshold at a time, and stores a prediction (class majority or mean) in each leaf. Growing is greedy and top-down: at each node, scan every feature, scan candidate thresholds (usually midpoints between sorted values), and pick the split that maximises impurity reduction — **information gain** — measured on the training rows reaching that node; recurse on the children; stop by rules (pure node, max depth, minimum samples per leaf, no split improves gain). The beauty: no scaling needed, mixed feature types welcome, decisions readable as if-then rules. The curse: greed is myopic (a split that looks mediocre now can unlock great splits two levels down — greedy growth never sees it) and, unrestricted, the tree grows until every leaf is pure — i.e., until it has memorised the data, noise included.

**Impurity: how mixed a node is.** Two standard rulers, both in [0, 1], both zero when a node is pure. **Gini impurity**: G(node) = 1 − Σₖ pₖ², where pₖ is the fraction of class k in the node — interpretable as the probability that two randomly drawn rows (with replacement) carry different labels. **Entropy**: H(node) = −Σₖ pₖ·log₂(pₖ) — information-theory surprise; zero for pure nodes, one for a balanced binary node. The two usually select the same splits; entropy\'s log makes it slightly more eager to create pure nodes. The split score: weighted child impurity = (n_left/n)·G(left) + (n_right/n)·G(right); gain = G(parent) − weighted children; pick the maximum. One criterion is not "more correct" than the other in practice — knowing *both* definitions and computing Gini by hand is exam territory; entropy shows up again in gradient boosting\'s cross-entropy framing and in clustering.

**Stopping rules and the overfitting dial.** Left alone, recursion continues until purity or feature exhaustion — producing deep trees that quote training accuracy like a boast and validation accuracy like a confession. The controls: **max_depth** (the master dial — shallow trees underfit, deep trees memorise); **min_samples_split** and **min_samples_leaf** (prevent tiny, noise-chasing leaves; a leaf of 2 rows is usually an opinion, not a pattern); **max_leaf_nodes** (budget the leaves directly); and **ccp_alpha** (cost-complexity pruning — grow a big tree, then cut branches whose impurity improvement does not pay for the leaves they add; post-pruning in the classical CART sense). Practical starting grid: depth 3–10, min_samples_leaf 1–5% of n for noisy data. The interpretability sweet spot is often depth 3–4: a tree a product manager can hold in their head — and those shallow trees frequently match deep ones on validation, which tells you most of the extra splits were memorising.

**Greedy myopia, in one picture.** XOR: labels are 1 when x1 and x2 differ, 0 when they match. No single-axis split at the root reduces impurity at all (every threshold gives 50/50 children) — so a greedy tree stalls at a useless root even though two more levels would classify perfectly. XOR is the canonical example of greedy trees missing globally good structures; real data rarely is pure XOR, but the lesson generalises: trees thrive on problems where one feature at a time carves real signal, and need ensembles (next lessons) to overcome the myopia otherwise.

**Reading a tree like a document.** A fitted tree is a set of paths: root test → child tests → leaf prediction (plus samples, class distribution, value for regression). Audit it: which features appear near the root (those carry the big splits — compare against domain sense and leakage suspicion); whether leaves have enough samples (a leaf with 3 rows and 99% confidence is a red flag); and whether the depth matches your regularization intent. Export rules ("age ≤ 42.5 and debt_ratio ≤ 0.37 → risk=low") become policy documents in regulated domains — the reason banks still quote trees even when boosters score better.`,
        extras: [
          table(
            'Gini vs entropy',
            ['Aspect', 'Gini impurity', 'Entropy (information gain)'],
            [
              ['Formula', '1 − Σ pₖ²', '−Σ pₖ log₂ pₖ'],
              ['Max (binary, balanced)', '0.5', '1.0'],
              ['Pure node', '0', '0'],
              ['Character', 'Slightly faster; default in sklearn', 'Slightly more purity-seeking; theory roots'],
              ['In practice', 'Usually identical splits', 'Usually identical splits'],
            ],
          ),
          code(
            '# Decision tree with honest depth controls (scikit-learn style)\nfrom sklearn.tree import DecisionTreeClassifier, export_text\nfrom sklearn.model_selection import cross_val_score\n\nfor depth in [2, 3, 5, 10, None]:\n    t = DecisionTreeClassifier(max_depth=depth, min_samples_leaf=20,\n                               random_state=0)\n    acc = cross_val_score(t, X_train, y_train, cv=5).mean()\n    print(f\"depth={depth!s:>4}  CV acc={acc:.3f}\")\n# Expect: CV accuracy rises with depth, peaks (e.g., 3–5), then falls — the overfit dial\n\ntree = DecisionTreeClassifier(max_depth=3, min_samples_leaf=20,\n                              ccp_alpha=0.002, random_state=0).fit(X_train, y_train)\nprint(export_text(tree, feature_names=feat_names))\n# Human-readable rules — the tree\'s real deliverable in many organisations',
            'tree_controls.py',
            'python'
          ),
          tip(
            'Plot train-vs-CV accuracy against max_depth',
            'Train accuracy climbing while CV plateaus or drops = the depth where memorisation starts. Set max_depth just before the gap opens — one chart, one decision.',
          ),
        ],
        worked: {
          title: 'Compute Gini and entropy, pick the split by hand',
          problem:
            'A node has 10 rows: 6 positive, 4 negative. Two candidate splits: Split A → left [4 pos, 2 neg], right [2 pos, 2 neg]. Split B → left [5 pos, 0 neg], right [1 pos, 4 neg]. Compute Gini for the parent and both splits (weighted), pick the winner by Gini gain, then verify with entropy.',
          steps: [
            {
              title: 'Parent impurity',
              desc: 'Gini(parent) = 1 − (0.6² + 0.4²) = 1 − (0.36 + 0.16) = 0.48. Entropy(parent) = −(0.6·log₂0.6 + 0.4·log₂0.4) = 0.6×0.737 + 0.4×1.322 ≈ 0.442 + 0.529 = 0.971 bits.',
            },
            {
              title: 'Split A by Gini',
              desc: 'Left: p = 4/6, G = 1 − ((2/3)² + (1/3)²) = 1 − (4/9 + 1/9) = 5/9 ≈ 0.556. Right: balanced → G = 0.5. Weighted = 0.6×0.556 + 0.4×0.5 ≈ 0.333 + 0.2 = 0.533. Gain = 0.48 − 0.533 = −0.053 — Split A makes the node *worse* (children mixed more than useful weighting suggests).',
            },
            {
              title: 'Split B by Gini',
              desc: 'Left: pure → G = 0. Right: 1/5 pos → G = 1 − (0.04 + 0.64) = 0.32. Weighted = 0.5×0 + 0.5×0.32 = 0.16. Gain = 0.48 − 0.16 = 0.32 — a strong improvement.',
            },
            {
              title: 'Entropy check',
              desc: 'Split A: left H ≈ 0.918, right H = 1.0 → weighted ≈ 0.6×0.918 + 0.4×1.0 ≈ 0.951; gain ≈ 0.020. Split B: left H = 0, right H ≈ 0.722 → weighted 0.361; gain ≈ 0.610. Both rulers crown Split B — as they almost always do; trust the arithmetic you can reproduce by hand.',
            },
          ],
          solution:
            'Gini: parent 0.48; Split A weighted 0.533 (negative gain); Split B weighted 0.16 (gain 0.32) — Split B wins decisively. Entropy agrees (gain ≈ 0.61). The mechanics of "pick the split with maximum weighted impurity reduction" is the entire growth procedure — applied greedily at every node.',
        },
        practice: {
          title: 'Grow a tree in your head, then in code',
          prompt:
            'Make up 12 rows with two numeric features and a binary label where depth-2 structure exists. Write the three splits you would choose (with rough thresholds) and the prediction in each leaf. Then, if you can, fit DecisionTreeClassifier(max_depth=2) on any small dataset and compare its rules with yours.',
          hint: 'Sort values per feature; candidate thresholds are midpoints; compute Gini for each side — the hand practice makes library output feel obvious.',
        },
        mistakes: [
          {
            mistake: 'Fitting an unpruned tree and quoting its training accuracy',
            fix: 'A fully grown tree can approach 100% training accuracy by memorisation — quote cross-validated accuracy at a tuned depth instead, and show the depth-sensitivity curve.',
          },
          {
            mistake: 'Believing entropy and Gini produce radically different trees',
            fix: 'They usually pick the same splits; differences are marginal. The depth and leaf-size controls dominate tree behaviour far more than the criterion choice.',
          },
          {
            mistake: 'Ignoring tiny leaves as "more detail"',
            fix: 'Leaves with a handful of samples encode noise. Raise min_samples_leaf (even 1–5% of n on messy data) — CV will usually thank you.',
          },
          {
            mistake: 'Expecting a single tree to beat ensembles on messy tabular data',
            fix: 'One tree is interpretable and unstable; forests and boosters trade a little interpretability for accuracy. Start with a tree for the story, ensemble for the score.',
          },
        ],
        exam: {
          question:
            'Define Gini impurity. For a node with class proportions 0.5/0.5, compute it. Explain why a greedy tree can fail on the XOR pattern and how depth controls relate.',
          answer:
            'Gini impurity G = 1 − Σₖ pₖ² — for binary classes, the probability that two randomly drawn rows (with replacement) from the node have different labels. At p = 0.5/0.5: G = 1 − (0.25 + 0.25) = 0.5, the maximum. XOR failure: labels are 1 iff x1 ≠ x2; every single-threshold split on either feature produces children that remain 50/50 — zero information gain at the root — so the greedy procedure stops improving and cannot reach the perfect two-level solution. Depth controls (max_depth, min_samples_leaf, post-pruning) exist because unlimited depth memorises noise; the XOR lesson is that greedy local choices can also miss *good* structure, which ensembles (forests/boosting) partially rescue by adding diversity or staged corrections.',
          source: 'Classic theory question in ML finals (Gini/entropy/XOR appear constantly).',
        },
        summary: [
          'Trees grow greedily: at each node, pick the split maximising weighted child impurity reduction.',
          'Gini = 1 − Σpₖ²; entropy = −Σpₖlog₂pₖ; both zero at purity, and they usually pick the same splits.',
          'Unrestricted growth memorises — depth, leaf-size, and cost-complexity pruning are the honesty controls.',
          'Greedy myopia (XOR) means single trees can miss structure; ensembles fix much of this later.',
          'Shallow trees (depth 3–4) are often validation-competitive and always more readable — rules are a deliverable.',
          'Audit root features against domain sense and leakage suspicion every time you fit a tree.',
        ],
      }),
      [
        [
          'Gini impurity of a pure node (all one class) is:',
          ['0.5', '1', '0', 'Equal to the class prior'],
          2,
          'G = 1 − Σpₖ² = 1 − 1 = 0 for a single class with p = 1.',
        ],
        [
          'A decision tree is grown to full depth on training data. Training accuracy 99.9%, CV accuracy 71%. The diagnosis is:',
          [
            'The tree needs more depth',
            'Severe overfitting — the tree memorised training noise; prune or limit depth/leaf size',
            'Data leakage',
            'Entropy should replace Gini',
          ],
          1,
          'A maximal tree is a memorisation machine; the train/CV gap is the textbook overfit signature — fix with depth and leaf controls.',
        ],
        [
          'In CART split selection, the criterion is:',
          [
            'The split with the fewest features',
            'The split maximising (parent impurity − weighted child impurity)',
            'The split closest to the median',
            'The split with equal child sizes',
          ],
          1,
          'Maximum impurity reduction (information gain with Gini or entropy) at each node — greedy, one level at a time.',
        ],
        [
          'Why can a greedy tree fail on XOR-labeled data?',
          [
            'XOR needs more than two features',
            'No single-axis split reduces impurity at the root, so the greedy procedure cannot get started',
            'Gini is undefined for XOR',
            'Trees cannot handle binary labels',
          ],
          1,
          'Every root split leaves 50/50 children — zero gain — even though two-level structure classifies perfectly.',
        ],
      ]
    ),
    lesson(
      M4,
      'mlf-4-2',
      42,
      'What Trees See: Invariance, Strengths, Weaknesses, and Interpretability',
      'Why trees ignore feature scaling entirely, what kinds of problems they nail (mixed types, interactions, outliers), where they break (extrapolation, axis-aligned boundaries, instability), and how to read feature importance — critically.',
      19,
      nineBlocks({
        objectives: [
          'Prove to yourself that monotone rescaling never changes a tree\'s splits',
          'List three problem structures trees handle well and three they handle poorly, with reasons',
          'Explain why trees cannot extrapolate and demonstrate the failure on a time trend',
          'Compute and critically interpret impurity-based feature importance',
        ],
        hook:
          'A data scientist standardises features for every model — it is drilled in as hygiene. She fits a decision forest, notices StandardScaler in the pipeline, removes it "since trees don\'t need it", and waits for the accuracy to drop. It doesn\'t. Not by a tenth of a point. Some models are scale-sensitive to the bone — distance and gradient models; trees are scale-flippers: because they only ever ask "is x ≤ t?", and rescaling slides thresholds without reordering values, nothing about the fitted tree can change. Knowing which invariances your model family has is the difference between ritual and understanding.',
        concept: `**The invariance theorem, informally: order is all trees see.** A split "xⱼ ≤ t" depends only on the *ordering* of values of feature j, not their magnitudes. Any strictly increasing transformation (standard scaling, min-max, log, square) preserves that ordering — so the same thresholds (expressed in transformed coordinates) produce identical partitions, identical impurity reductions, identical trees. This is why tree pipelines skip scaling: not a style choice, a mathematical fact. It also explains two neighbouring behaviours: trees are equally happy with features in rupees or in lakhs (unlike linear models), and they are *blind to the shape of within-bin distributions* — the difference between a feature valued {1, 2, 3} and {1, 2, 1000} matters only through the ordering and the split points, not through magnitude gaps per se.

**Where trees win.** (1) **Heterogeneous tabular features** — mixed numeric and categorical, different scales, no preprocessing ceremony; this is why trees (boosted especially) still dominate Kaggle-style and business tabular ML. (2) **Interactions and nonlinearities, automatically** — a tree capturing "age matters only when income is low" does so by nesting splits; linear models need explicit interaction terms to say the same. (3) **Outlier tolerance in the input** — a value of 10⁹ sorts to one end; it does not drag a squared-error gradient the way it does in linear regression; splits care about rank, not distance. (4) **Interpretability at shallow depth** — a depth-3 tree is a policy document; no other strong family offers that transparency natively.

**Where trees lose.** (1) **Extrapolation** — a tree can only ever predict values (or vote averages) seen in its leaves. Train on y = x for x ∈ [0, 10] and ask for x = 15: the prediction is the mean of the y = 10-region leaves — flat, wrong, confidently. Any smooth trend (time series, growth curves) is invisible beyond the training range; this is the single most important reason trees lose to linear models and specialised time-series methods on forecasting-with-trend tasks. (2) **Axis-aligned boundaries** — a truly diagonal decision boundary (x1 + x2 > 1.5) needs a staircase of many splits; the tree approximates it inefficiently with depth, while a linear classifier gets it in one shot. Smooth, low-dimensional, mostly-linear relationships are linear models\' home turf — and with enough data a flexible linear/GBM comparison is the honest way to check. (3) **Instability** — small perturbations of the training data (new rows, a resample) can flip a near-tied split choice near the root, producing a very different tree with similar training scores and different predictions for some points. Single-tree instability is not a nuisance to argue away — it is the *reason bagging and boosting exist* (next two lessons); averaging many decorrelated trees is the cure. (4) **Sparsity in very high dimensions** — pure sparse text/one-hot problems often favour linear models, where each dimension votes independently.

**Feature importance, and its bias.** The classic impurity-based importance: total impurity reduction attributed to feature j across all its splits, weighted by sample counts, normalised to sum to 1. It answers "how much did this feature contribute to purity during growth?" — a training-time story, not a causal claim and not a permutation-truth. Three known flaws: **bias toward high-cardinality features** (a feature with many unique values offers many candidate thresholds, hence more chances to look good — patient-ID-like columns can rank top spuriously); **inflated scores for training noise** (importances never go negative, so noise features keep small positive scores); and **no direction** (importance does not say whether high values raise or lower the target — use partial dependence or aSHAP-style analyses for that). The robust alternative: **permutation importance** — shuffle feature j on validation data, measure the score drop; no drop means no reliance. It is slightly more expensive and infinitely more honest; run it on held-out data, not training.

**Interpretability checklist for tree users.** Export the shallow tree for the human-readable story. For the ensemble, report permutation importance plus 2–3 partial dependence plots for the top features. Cross-check top features for leakage (importance top-3 is where leaked columns always sit). And keep a holdout evaluation of any "insight" before writing it into a business narrative — feature importance is a hypothesis generator, not a verdict.`,
        extras: [
          table(
            'Trees: the honest report card',
            ['Strong at', 'Weak at'],
            [
              ['Mixed tabular features, no scaling needed', 'Extrapolation beyond training targets (flat predictions)'],
              ['Automatic interactions and nonlinearities', 'Diagonal/smooth boundaries (staircase inefficiency)'],
              ['Outlier-robust inputs (rank-based splits)', 'Instability — small data changes flip single trees'],
              ['Shallow-depth interpretability (rules)', 'Very high-dimensional sparse text problems'],
            ],
          ),
          code(
            '# Invariance check + honest permutation importance\nfrom sklearn.tree import DecisionTreeClassifier\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.pipeline import make_pipeline\nfrom sklearn.inspection import permutation_importance\n\n# Same tree with and without scaling — identical predictions\na = DecisionTreeClassifier(max_depth=4, random_state=0).fit(X_train, y_train)\nb = make_pipeline(StandardScaler(), DecisionTreeClassifier(max_depth=4, random_state=0))\nb.fit(X_train, y_train)\nprint(\"same predictions:\", (a.predict(X_test) == b.predict(X_test)).all())\n\n# Permutation importance on VALIDATION data\nr = permutation_importance(b, X_val, y_val, n_repeats=10, random_state=0)\nfor name, imp in sorted(zip(feat_names, r.importances_mean), key=lambda t: -t[1]):\n    print(f\"{name:>24}: {imp:+.4f}\")\n# A near-zero permutation score = the model does not rely on that feature, whatever impurity said',
            'tree_invariance_importance.py',
            'python'
          ),
          tip(
            'Extrapolation red-flag test',
            'For any tree-based model on trending data, check predictions on the last period: if the forecast is a flat line at "recent average", the tree is doing exactly what trees do — admit you need linear trends, differencing, or a dedicated time-series model beyond it.',
          ),
        ],
        worked: {
          title: 'The extrapolation cliff, with numbers',
          problem:
            'Training data follows y = 2x for x ∈ {1, 2, 3, 4, 5} (so y ∈ {2, 4, 6, 8, 10}); a fully grown regression tree fits perfectly. Predict y at x = 7 and x = 5.5, then compare with a linear model\'s predictions.',
          steps: [
            {
              title: 'What the tree learned',
              desc: 'With pure leaves, each training value gets its own leaf: x ≤ 1.5 → 2; x ≤ 2.5 → 4; …; x > 4.5 → 10. The tree has memorised five (x, y) pairs — it "knows" nothing else about the world.',
            },
            {
              title: 'Predict at x = 5.5',
              desc: 'Falls in the region x > 4.5 → prediction 10. Reasonable locally — the training data is dense there and the function is flat-ish at the edge. Trees interpolate inside their range by leaf-averaging.',
            },
            {
              title: 'Predict at x = 7 (extrapolation)',
              desc: 'Also lands in x > 4.5 → prediction 10 again. Truth would be 14. The tree is *structurally incapable* of saying "bigger than anything seen" — no leaf exists beyond the training maximum. Predictions clamp at the boundary leaf forever.',
            },
            {
              title: 'The linear contrast',
              desc: 'A linear model fit on the same points recovers ŷ = 2x (essentially exactly), predicting 11 at 5.5 and 14 at 7 — because its functional form extends. Trees buy flexibility by giving up functional form; extrapolation is the bill.',
            },
          ],
          solution:
            'Tree: ŷ(7) = 10 (the clamped boundary-leaf mean). Linear: ŷ(7) = 14 (the trend, extended). Any time your business question involves "what happens beyond the data we have seen", a pure tree answer is a ceiling, not a forecast — combine with linear/trend models or move to methods that carry functional form.',
        },
        practice: {
          title: 'Invariance and importance audit',
          prompt:
            'On any small dataset: (1) fit a decision tree with and without StandardScaler and confirm identical predictions; (2) fit a max-depth tree and list its impurity importances; (3) compute permutation importance on a holdout and compare the rankings. Write two sentences on any disagreement and what you would trust.',
          hint: 'High-cardinality or noisy features often rank high on impurity importance and near-zero on permutation importance — the classic bias gap.',
        },
        mistakes: [
          {
            mistake: 'Scaling features for a pure tree pipeline out of superstition',
            fix: 'Understand the invariance: order-preserving transforms cannot change splits. Save the pipeline complexity — unless a linear/distance model shares the pipeline.',
          },
          {
            mistake: 'Using trees to extrapolate trends (demand, growth, logs)',
            fix: 'Trees clamp at the training range. For trending targets use linear/trend features, differencing, or dedicated time-series models; keep trees for the within-range structure.',
          },
          {
            mistake: 'Treating impurity feature importance as ground truth',
            fix: 'It is biased toward high-cardinality features and training noise. Validate with permutation importance on holdout data (and partial dependence for direction) before acting on it.',
          },
          {
            mistake: 'Judging a single tree\'s instability as a bug',
            fix: 'Instability is inherent to greedy splitting; the production answer is ensembles (forests average it out, boosters regularise it) — the next two lessons are the fix, not a workaround.',
          },
        ],
        exam: {
          question:
            'Explain why a decision tree\'s predictions are unchanged if you multiply a feature by 1000, yet a k-NN model\'s predictions generally change. Then give the standard engineering answer to "our tree model forecasts next quarter\'s sales" and justify it.',
          answer:
            'Trees only use the ordering of feature values via threshold tests ("x ≤ t"); multiplication by 1000 is strictly increasing, so order, candidate partitions, and the fitted tree are identical (thresholds scale with the feature). k-NN aggregates distances across features; rescaling multiplies one feature\'s contribution by 1000, reshuffling neighbours and predictions. On forecasting: trees cannot extrapolate — predictions beyond the training range equal the boundary-leaf averages, so a tree "forecast" is a flat continuation of the most recent regime, blind to trend. The engineering answer: model trend explicitly (linear/time features, differencing, exponential smoothing, Prophet/ARIMA-style methods) and optionally use trees for the residual/nonlinear component within the training range; never ship a raw tree as a trend forecaster without a baseline comparison against a trend-aware model.',
          source: 'Frequent pairing in interviews: invariance reasoning + extrapolation honesty.',
        },
        summary: [
          'Trees see order, not magnitude: any monotone rescaling leaves the fitted tree identical — scaling is optional for trees.',
          'Trees win on mixed tabular data, automatic interactions, outlier-robust inputs, and shallow-rule interpretability.',
          'Trees lose on extrapolation (predictions clamp at boundary leaves), diagonal boundaries (staircase), and single-model stability.',
          'Instability is why forests and boosters exist — averaging and staged correction are the structural cures.',
          'Impurity feature importance is biased (high cardinality, noise); prefer permutation importance on holdout data.',
          'Direction of effect needs partial dependence / SHAP-style tools, not importance scores alone.',
        ],
      }),
      [
        [
          'Multiplying all values of one feature by 1000 before fitting a decision tree will:',
          [
            'Ruin accuracy unless you also scale other features',
            'Leave the fitted tree\'s splits and predictions unchanged (thresholds rescale with the feature)',
            'Force the tree to use the feature less',
            'Make the tree require gradient descent',
          ],
          1,
          'Threshold splits depend on value ordering only; any strictly increasing transform preserves order and the entire tree.',
        ],
        [
          'A regression tree trained on y = 3x for x ∈ [1, 10] predicts for x = 15 approximately:',
          ['45', '30 (clamped to the boundary-leaf average near x = 10)', '0', 'A random value'],
          1,
          'Trees cannot extrapolate beyond training targets — the new point falls in the rightmost leaf, predicting roughly the mean y seen there.',
        ],
        [
          'The main known bias of impurity-based feature importance is:',
          [
            'Bias toward features with low variance',
            'Bias toward high-cardinality features (many candidate splits) and inflated scores for noise',
            'Bias toward categorical features only',
            'It always assigns negative importance',
          ],
          1,
          'More unique values → more split candidates → more chances to reduce impurity spuriously; permutation importance on holdout is the fairer audit.',
        ],
        [
          'Single decision trees are unstable because:',
          [
            'They cannot handle missing values',
            'Small changes in training data can flip near-tied greedy splits near the root, reshaping the whole tree',
            'They require too much memory',
            'Their loss function is non-convex',
          ],
          1,
          'Greedy near-ties amplify small data perturbations — the motivation for bagging (forests) and boosting.',
        ],
      ]
    ),
    lesson(
      M4,
      'mlf-4-3',
      43,
      'Random Forests: Bagging, Feature Randomness, and Out-of-Bag Scoring',
      'How bootstrap sampling plus feature subsampling decorrelates an army of unstable trees, why averaging them slashes variance, and how out-of-bag samples hand you a free validation estimate.',
      20,
      nineBlocks({
        objectives: [
          'Explain the bagging procedure and compute the fraction of unique rows in a bootstrap sample',
          'State the role of max_features (feature randomness) and how it decorrelates trees',
          'Compute a forest vote/average for a small example and explain variance reduction',
          'Use out-of-bag scoring as a free validation estimate and audit a forest\'s hyperparameters',
        ],
        hook:
          'One unstable model is a liability. A thousand unstable models, each trained on a different random slice of reality, each making different mistakes — and the mistakes *average out*. That is the random forest\'s trick, and it is why a method built entirely of the overfitting-prone decision trees routinely produces some of the most robust accuracy in applied tabular ML. The forest does not fix any single tree\'s myopia; it drowns it in a vote.',
        concept: `**Bagging: parallel models on different realities.** Bootstrap aggregating (bagging, Breiman 1996) trains m learners on m bootstrap samples: each sample is drawn from the training set *with replacement*, size n — so some rows appear multiple times, some not at all (about 63.2% of rows appear at least once per bootstrap; the ~36.8% left out are each tree\'s **out-of-bag (OOB)** rows). Train a full unstable learner (a deep decision tree) on each sample independently, then aggregate: **average** their outputs for regression, **majority vote** for classification. Why it works, in one sentence: the learners\' *errors* are partially independent, and averaging independent-ish errors shrinks variance while bias stays roughly put — the classic variance-reduction trade from Lesson 2.4, weaponised. Bagging a stable model (linear regression on clean features) gains little — the individual bias remains after averaging. Bagging exists for *high-variance, low-bias* learners; the decision tree is the poster child.

**Feature randomness: the "random" in random forest.** Plain bagged trees still correlate: the strongest feature dominates root splits in every bootstrap, so the trees agree more than they should, and averaging stalls. Random forests add a second randomness at each split: when searching for the best feature/threshold, consider only a **random subset of mtry features** — classic defaults: mtry = √d for classification, mtry = d/3 for regression (scikit-learn: max_features="sqrt" / "log2" / fraction; sklearn\'s classifier default of all features is actually closer to bagged trees — set "sqrt" for the classic forest). Sometimes the globally best feature is excluded from a split, forcing different trees down different paths — **decorrelation**. The bias side: each tree gets slightly worse (its splits are handicapped), but the variance drop from decorrelated averaging more than pays for it. The mtry dial trades exactly this: mtry = d ≈ bagged trees (correlated, lower bias), tiny mtry ≈ very diverse trees (higher bias, lower variance).

**Aggregation with real numbers.** Nine trees vote on a transaction: six say fraud, three say genuine → majority fraud (classification). Seven regressors predict delivery minutes [22, 24, 23, 27, 21, 25, 24] → average 23.7 (regression). Probabilities: average the per-tree probabilities, not their hard votes — you keep the confidence continuum for threshold tuning (Lesson 3.4\'s operating-point machinery still applies on the forest\'s averaged probabilities). Forests also provide crude **uncertainty**: disagreement among trees (vote fraction, spread of regression outputs) — useful in production to route low-confidence cases to humans.

**Out-of-bag scoring: validation for free.** Each tree was never trained on its ~36.8% OOB rows, so predicting those rows with each tree and aggregating (per row: average only the trees for which it was OOB) yields an OOB estimate of generalisation — computed during training, no extra split needed. OOB ≈ a cross-validated score and is excellent for quick sanity checks and default tuning (RandomForestClassifier(oob_score=True)); it is not a substitute for a proper test set in final reporting — it shares the training distribution and can be optimistic under heavy class imbalance or leakage. The full audit for a forest: tune n_estimators (more trees = more stable, diminishing returns, essentially never overfits by itself — 300–1000 is cheap insurance), max_depth / min_samples_leaf (each tree\'s capacity — this is where overfitting enters), max_features (decorrelation dial), and class_weight (imbalance handling from Module 2 still applies). Inference cost grows linearly in n_estimators — prune the count for latency-critical serving once the OOB/CV curve has plateaued.`,
        extras: [
          table(
            'Single tree vs random forest',
            ['Aspect', 'Single tree', 'Random forest'],
            [
              ['Variance', 'High (unstable splits)', 'Low (averaged over decorrelated trees)'],
              ['Bias', 'Low when deep', 'Slightly higher per tree (handicapped splits), still low overall'],
              ['Scaling needed', 'No', 'No'],
              ['Interpretability', 'Rules readable at depth 3–4', 'Aggregate — use importances/PDPs'],
              ['OOB estimate', 'None', 'Free, during training'],
              ['Typical tabular accuracy', 'Baseline', 'Strong default before boosting'],
            ],
          ),
          code(
            '# Random forest with OOB monitoring\nfrom sklearn.ensemble import RandomForestClassifier\n\nrf = RandomForestClassifier(\n    n_estimators=500,\n    max_features="sqrt",      # classic decorrelation for classification\n    min_samples_leaf=2,       # per-tree capacity control\n    oob_score=True,           # free validation estimate\n    class_weight="balanced",  # imbalance remedy from Module 2\n    random_state=42,\n    n_jobs=-1,\n)\nrf.fit(X_train, y_train)\nprint(\"OOB:\", rf.oob_score_)\nprint(\"val:\", rf.score(X_val, y_val))   # OOB should roughly agree — big gap = leakage/skew\n\n# Permutation importance on validation — honest feature story\nfrom sklearn.inspection import permutation_importance\nr = permutation_importance(rf, X_val, y_val, n_repeats=10, random_state=0)',
            'random_forest.py',
            'python'
          ),
          warn(
            'n_estimators never fixes overfitting',
            'Adding trees cannot overfit the forest — averaging more trees only stabilises. Overfitting enters through deep individual trees and rich max_features; control those, not the vote count.',
          ),
          tip(
            'OOB vs validation: treat disagreement as an alarm',
            'If OOB says 0.93 and your honest validation split says 0.74, stop tuning — something structural is wrong (entity leakage, time leakage, skew). The two numbers should be cousins.',
          ),
        ],
        worked: {
          title: 'Bootstrap arithmetic, votes, and OOB logic',
          problem:
            'A training set has n = 5 rows. (a) In one bootstrap sample of size 5 drawn with replacement, how many unique rows do you expect? (b) Nine forest trees vote [fraud, fraud, genuine, fraud, genuine, fraud, fraud, genuine, fraud] — aggregate. (c) Explain how OOB scoring works for row #3.',
          steps: [
            {
              title: '(a) Bootstrap uniqueness',
              desc: 'Probability a given row is NOT picked in one draw = 4/5; not in five draws = (4/5)⁵ ≈ 0.328. So ~32.8% of rows are expected absent per bootstrap — the 63.2%-seen / 36.8%-OOB split generalises to any n (from (1 − 1/n)ⁿ ≈ 1/e). Here: ~1.64 unique rows per bootstrap of 5 — a vivid reminder that each tree sees a thin, quirky slice.',
            },
            {
              title: '(b) Majority vote',
              desc: 'Fraud votes: 6; genuine: 3 → forest predicts fraud (6/9 ≈ 0.67 fraud probability). Had you averaged probabilities instead (each tree emitting 0/1), you would get the same 0.67 — keep it for threshold tuning rather than discarding to hard votes.',
            },
            {
              title: '(c) OOB for row #3',
              desc: 'Suppose row #3 was absent from bootstraps of trees 2, 5, and 7. Those three trees never saw it during training, so their predictions on row #3 are honest; aggregate *those* (and only those) for row #3\'s OOB score. Every row gets its own OOB panel of trees — that is the free validation set woven into training.',
            },
            {
              title: 'When to trust OOB',
              desc: 'Use OOB for rapid tuning and sanity checks. For final numbers keep a proper held-out (or time/group-aware) test set — OOB inherits the training distribution\'s quirks and does not protect against leakage.',
            },
          ],
          solution:
            '(a) ~63.2% unique rows per bootstrap (≈1.64 of 5). (b) 6–3 majority → fraud, probability ≈ 0.67. (c) Each row is OOB for the ~1/e of trees whose bootstrap excluded it; average only those trees\' predictions for that row\'s OOB estimate. Bagging turns randomness into a validation set and averaging into variance control.',
        },
        practice: {
          title: 'Tune the two dials',
          prompt:
            'On any tabular dataset, compare: (1) a single DecisionTree at a few depths; (2) bagged trees (max_features = n_features, few vs many estimators); (3) classic forests (max_features = "sqrt"). Report CV accuracy and note which dial moved the needle. Then check OOB_score_ against CV — do they roughly agree?',
          hint: 'Expect: single tree unstable → bagging helps a lot → sqrt-feature forests usually help further on correlated data; n_estimators beyond ~300 changes little.',
        },
        mistakes: [
          {
            mistake: 'Expecting more trees to reduce overfitting',
            fix: 'Vote count stabilises the average; it does not constrain any tree\'s capacity. Overfitting is controlled by max_depth/min_samples_leaf/max_features — the per-tree knobs.',
          },
          {
            mistake: 'Leaving max_features at all features and calling it a random forest',
            fix: 'Without feature subsampling you have bagged trees — correlated siblings. For classification set max_features="sqrt" (or a fraction) and feel the decorrelation.',
          },
          {
            mistake: 'Treating OOB score as the final reported metric',
            fix: 'OOB is a training-time estimate sharing the training distribution. Final reporting needs the untouched, properly structured test set — plus OOB as a consistency check.',
          },
          {
            mistake: 'Using the forest\'s impurity importances without a permutation cross-check',
            fix: 'Same bias as single trees (high-cardinality features, noise). Confirm with permutation importance on validation before any feature gets cut from the product narrative.',
          },
        ],
        exam: {
          question:
            'Explain how a random forest reduces variance relative to a single decision tree: cover bootstrap sampling, feature randomness (with default mtry), aggregation, and the OOB estimate. Why does adding trees not cause overfitting?',
          answer:
            'A single deep tree has low bias but high variance — small data changes flip splits and reshape it. Bagging: each of m trees trains on an independent bootstrap sample (~63.2% unique rows), so their idiosyncrasies differ; averaging (regression) or majority vote (classification) cancels partially independent errors, cutting variance while bias stays near the individual trees\'. Feature randomness: at each split only ~√d features (classification) are considered, so even identical bootstraps diverge in structure — decorrelating the trees, trading a little bias for a large variance drop; without it, bagged trees stay correlated through the dominant root feature and averaging stalls. OOB: each row is excluded from ~36.8% of trees\' bootstraps; aggregating only those trees\' predictions for that row yields a held-out-style estimate for free. Adding trees only averages more — the variance of an average falls with more terms and the trees\' bias cannot grow — so the forest\'s test error plateaus rather than climbs; overfitting, if present, comes from unconstrained individual trees (depth, leaf size), not from the number of them.',
          source: 'Evergreen GATE/interview question — bagging, mtry, OOB, and the "why no overfitting" follow-up.',
        },
        summary: [
          'Bagging trains m trees on m bootstrap samples (~63.2% unique rows each) and averages/votes.',
          'Feature randomness (mtry ≈ √d for classification) decorrelates trees — the "random" in random forest.',
          'Averaging shrinks variance; forests suit high-variance learners like deep trees.',
          'OOB rows give a free validation estimate — trust it as a sanity check, not as the final test.',
          'Tune per-tree capacity (depth, leaf size) and max_features; n_estimators only stabilises.',
          'Forest probabilities (averaged, not hard votes) keep the threshold-tuning machinery alive.',
        ],
      }),
      [
        [
          'In a bootstrap sample of size n drawn with replacement, the expected fraction of DISTINCT original rows it contains is approximately:',
          ['100%', '63.2%', '50%', '36.8%'],
          1,
          'Each row has ≈ 1 − (1 − 1/n)ⁿ ≈ 1 − 1/e ≈ 0.632 chance of appearing at least once.',
        ],
        [
          'The purpose of sampling a random subset of features (max_features < d) at each split is to:',
          [
            'Speed up training only',
            'Decorrelate the trees so averaging reduces variance effectively',
            'Handle missing values',
            'Perform feature selection before training',
          ],
          1,
          'Without it, trees all split on the same dominant feature, stay correlated, and bagging gains little.',
        ],
        [
          'Out-of-bag (OOB) scoring uses, for each row, the predictions of:',
          [
            'All trees in the forest',
            'The trees whose bootstrap sample did NOT contain that row (≈36.8% of trees)',
            'The first tree only',
            'Trees trained after the row was removed',
          ],
          1,
          'Those trees never trained on the row — their aggregated prediction is a held-out-style estimate for free.',
        ],
        [
          'A random forest is overfitting. The correct knob to reach for first is:',
          ['n_estimators', 'Per-tree capacity: max_depth / min_samples_leaf (and check max_features)', 'Learning rate', 'Feature scaling'],
          1,
          'More trees cannot overfit an ensemble of averaged trees; deep, unconstrained individual trees can.',
        ],
      ]
    ),
    lesson(
      M4,
      'mlf-4-4',
      44,
      'Gradient Boosting: Small Trees Correcting Residuals (XGBoost & LightGBM)',
      'Boosting\'s sequential recipe — fit the current errors, add a shrinkage-corrected tree — with a numeric residual walk-through, the practical hyperparameters of XGBoost/LightGBM, and a clear map of when trees win and when they do not.',
      21,
      nineBlocks({
        objectives: [
          'Execute two rounds of residual-fitting boosting by hand on a tiny dataset',
          'Explain the roles of learning rate, n_estimators, max_depth, and subsample in gradient boosting',
          'Contrast random forest (parallel averaging) with gradient boosting (sequential correction)',
          'Decide, from problem structure, when trees are the right family and when a linear model should win',
        ],
        hook:
          'Random forest asks a thousand mediocre students for their answers and averages them. Gradient boosting takes one student, marks her mistakes, has her rewrite *only the parts she got wrong*, marks those mistakes, and repeats — each round a small, humble tree fixing the previous round\'s residuals with a cautious learning rate. On tabular data, that second recipe wins a lot of leaderboards. It also overfits faster when you get greedy. Same trees — opposite training philosophy.',
        concept: `**The boosting loop: stage-wise error correction.** Gradient boosting (Friedman 2001) builds an ensemble sequentially. Start with a dumb prediction — the mean (regression) or the log-odds base rate (classification). Compute the current model\'s errors — for squared-error regression, the **residuals** rᵢ = yᵢ − ŷᵢ — and train a *small* new tree to predict those residuals (technically: the negative gradient of the loss with respect to the current prediction, which for MSE is exactly the residual). Add the new tree\'s output to the ensemble, multiplied by a **learning rate** ν (shrinkage): ŷ ← ŷ + ν·tree(x). Repeat for m stages. The final model is the sum of all the shrinkage-scaled trees plus the base value. Read the loop again: each stage fits *what the ensemble currently gets wrong*, not the raw target — a relay of specialists on residuals, where each new tree is a small correction, not a fresh opinion. This is literally gradient descent in function space: the residual is the gradient direction for MSE; other losses (logistic: negative gradients weighted by probabilities; Poisson, quantile: same recipe) just change how the "error to fit" is computed — the skeleton is universal, which is why one library handles regression, classification, ranking, and more.

**The hyperparameters, and what they buy.** **n_estimators (m)**: number of stages — more stages = more capacity; combined with learning rate in a trade you must know: small ν (0.01–0.1) needs more trees but generalises better (gentler steps are harder to overfit with); large ν needs few trees and overfits faster. **max_depth** of each base learner: shallow — 3–5 typical (LightGBM leaves-wise depth can differ) — because each tree only needs to model a residual *fragment*; a deep tree per stage double-counts capacity catastrophically. **subsample** (< 1.0): stochastic boosting — each stage sees a fraction of rows, injecting forest-style noise and often improving generalisation. **min_child_weight / min_samples_leaf**: leaf-size floors, the usual noise guards. **regularisation terms** (XGBoost/LightGBM: lambda/L2 on leaf weights, alpha/L1, gamma on split gain): per-leaf penalties à la Module 3.3. **Early stopping**: monitor validation error per stage; stop when it plateaus (the single most important regulariser in practice; it converts "how many trees?" from a guess into a measurement). **class imbalance**: scale_pos_weight or sample weights (Module 2 rules still apply). LightGBM\'s differences worth knowing: histogram-based split finding (faster), leaf-wise growth (grows the most promising leaf first — accurate but needs depth/leaf constraints), native categorical handling, excellent speed at n in the millions. XGBoost: column subsampling (forest-style randomness inside boosting), robust regularisation, the workhorse default of a decade of Kaggle tabular wins.

**Boosting vs forest: one comparison to memorise.** Random forest: parallel, decorrelated, deep trees, no learning rate; robust defaults, hard to overfit with more trees, averages variance away. Gradient boosting: sequential, correlated-by-design (each stage depends on the last), shallow trees, learning rate + early stopping; lower bias floor, faster to peak *and* to overfit if you ignore validation. Forest = variance killer; booster = bias killer with a sharp early-stopping discipline. On clean tabular data the booster usually edges ahead at careful tuning; on noisy, small, or heavily-irregular data the forest\'s bluntness is a feature.

**When trees win; when they lose.** *Trees (usually) win*: heterogeneous tabular features with mixed types and scales; problems rich in interactions and nonlinear thresholds; medium-n settings (thousands to millions of rows) with decent feature engineering; missing-value-heavy data (boosters\' native routing); when you need fast iteration with strong defaults. *Trees (often) lose*: **very high-dimensional sparse text/one-hot** — linear models or NB see each dimension\'s signal directly, trees waste splits searching dense axes; **smooth low-dimensional relationships** (a clean linear signal with mild noise) — a linear/logistic model achieves the same accuracy with a fraction of the variance and full interpretability; **extrapolation-heavy forecasting** (Lesson 4.2 — trees clamp at the range edge); **tiny data** (n < few hundred) — flexible trees chase noise where regularised linear models stay calm; **strict latency** with large ensembles (thousands of trees per prediction — though distillation/pruning help); and **causal/regulated interpretation** demands where coefficient-level audits are required. The working professional\'s protocol: linear/logistic baseline → forest → booster, each rung on the same honest split; if the booster\'s edge does not survive into the test set or the business metric, ship the simpler model and the shorter explanation.`,
        extras: [
          table(
            'Forest vs boosting',
            ['Aspect', 'Random forest', 'Gradient boosting (XGBoost/LightGBM)'],
            [
              ['Training', 'Parallel, independent trees', 'Sequential, each stage fits current errors'],
              ['Base trees', 'Deep (low bias)', 'Shallow (3–5 deep correction fragments)'],
              ['Main dial', 'max_features, depth, count', 'learning rate × n_estimators, early stopping'],
              ['Overfit with more trees?', 'No (plateaus)', 'Yes, without early stopping'],
              ['Noise robustness', 'High (averaging)', 'Lower — chases residuals, including noise'],
              ['Typical edge', 'Robust default, less tuning', 'Peak tabular accuracy with careful tuning'],
            ],
          ),
          code(
            '# Gradient boosting with early stopping — the production recipe\nimport xgboost as xgb\n# (LightGBM mirrors the same skeleton: lgb.train + early_stopping)\n\nparams = dict(\n    objective=\"binary:logistic\",\n    learning_rate=0.05,        # small steps; needs more stages\n    max_depth=4,               # shallow correction trees, not fresh deep opinions\n    subsample=0.8,             # stochastic boosting — forest-style noise\n    colsample_bytree=0.8,      # per-tree feature subsampling\n    reg_lambda=1.0,            # L2 on leaf weights\n    min_child_weight=5,\n    eval_metric=\"aucpr\",       # rare-event? use PR-AUC, not error\n    seed=42,\n)\ndtrain = xgb.DMatrix(X_train, label=y_train, feature_names=feat_names)\ndvalid = xgb.DMatrix(X_val, label=y_val, feature_names=feat_names)\n\nmodel = xgb.train(\n    params, dtrain,\n    num_boost_round=5000,\n    evals=[(dtrain, \"train\"), (dvalid, \"val\")],\n    early_stopping_rounds=50,  # stop when val metric stops improving\n    verbose_eval=100,\n)\nprint(\"best iteration:\", model.best_iteration)\n# Ship the model at the early-stopped iteration — that number is your regularisation',
            'xgb_early_stopping.py',
            'python'
          ),
          tip(
            'Learning-rate × trees: shrink and extend',
            'When validation peaks too early, halve the learning rate and double (or more) the rounds, re-tuning early stopping. The gentler path almost always finds a better generalising ensemble — the standard boosting move.',
          ),
        ],
        worked: {
          title: 'Two rounds of residual boosting by hand',
          problem:
            'Regression data y = [10, 20, 30]. Stage 0 predicts the mean everywhere. Each later stage fits the CURRENT residuals perfectly with a small tree and is added with shrinkage ν = 0.5. Trace predictions and residuals through two stages.',
          steps: [
            {
              title: 'Stage 0: baseline',
              desc: 'ŷ⁰ = mean(y) = 20 for every row. Residuals r = y − ŷ⁰ = [−10, 0, +10]. Errors are pure distance from the mean — exactly what the baseline of Lesson 1.4 leaves on the table.',
            },
            {
              title: 'Stage 1 with shrinkage',
              desc: 'Tree-1 fits the residuals perfectly: output [−10, 0, +10]. Update with ν = 0.5: ŷ¹ = 20 + 0.5×[−10, 0, 10] = [15, 20, 25]. New residuals: [−5, 0, +5] — every error halved, because the stage took only half the suggested correction.',
            },
            {
              title: 'Stage 2',
              desc: 'Tree-2 fits the new residuals: output [−5, 0, +5]. Update: ŷ² = [15, 20, 25] + 0.5×[−5, 0, 5] = [17.5, 20, 22.5]. Residuals: [−2.5, 0, +2.5]. With perfect residual trees, remaining error scales by (1 − ν) = 0.5 per stage: 10 → 5 → 2.5 — a geometric series toward zero.',
            },
            {
              title: 'What the walk-through teaches',
              desc: 'Each stage sees smaller residuals; shrinkage slows convergence so noisy corrections cannot dominate; depth-1/2 trees suffice per stage because each only models a fragment. Stop by early stopping when validation stops improving — stages beyond that fit noise residuals.',
            },
          ],
          solution:
            'Stage 0: [20, 20, 20], errors ±10. Stage 1 (ν = 0.5): [16, 20, 24], errors ±5. Stage 2 (perfect continuation): [14, 20, 26], errors ±2.5 — errors halve per stage under (1 − ν). The recipe in production: shallow trees, small ν, hundreds-to-thousands of stages, early stopping as the brake — the residual relay, regularised.',
        },
        practice: {
          title: 'Boosting vs forest head-to-head',
          prompt:
            'On one tabular dataset with a validation split: fit (a) a tuned random forest, (b) XGBoost/LightGBM with learning rate 0.05, depth 4, and early stopping, (c) logistic regression on scaled features. Tabulate validation metrics. Write two sentences on which won, by how much, and which you would ship — including the interpretability cost.',
          hint: 'The booster often wins by a few points; the shipping decision includes tuning effort, latency, and explainability, not just the leaderboard delta.',
        },
        mistakes: [
          {
            mistake: 'Using deep trees (depth 10+) as boosting base learners',
            fix: 'Each stage should be a humble correction fragment (depth 3–5); deep stages overfit residuals instantly and the learning rate cannot save them.',
          },
          {
            mistake: 'Ignoring early stopping and picking n_estimators by tradition',
            fix: 'Watch the validation curve every 50–100 rounds; stop at the plateau (XGBoost/LightGBM do this natively). The stopping iteration IS your regularisation.',
          },
          {
            mistake: 'Setting learning rate = 1.0 with few trees "to save time"',
            fix: 'Large steps memorise noise; the standard trade is small η (0.01–0.1) with many stages. Halve η, extend rounds — then re-check the plateau.',
          },
          {
            mistake: 'Defaulting to boosting on tiny or extremely sparse high-dimensional data',
            fix: 'Small n: regularised linear models are stabler. High-dim sparse text: linear/NB often match boosters at a fraction of the complexity. Let problem structure choose the family — not the leaderboard meme.',
          },
        ],
        exam: {
          question:
            'Describe how gradient boosting uses decision trees to minimise MSE, including the role of the negative gradient, shrinkage, and early stopping. Contrast with random forest training. Name one dataset regime where a linear model should still beat both.',
          answer:
            'GBDT starts with the mean prediction; at each stage it computes the loss\'s negative gradient w.r.t. current predictions — for MSE this is the residual y − ŷ — fits a small tree to those residuals, and adds the tree\'s output scaled by the learning rate ν: ŷ ← ŷ + ν·h(x). Repeat for many stages; the ensemble is a staged approximation of gradient descent in function space, with each shallow tree a single cautious step. Shrinkage (small ν) reduces each step\'s influence so noisy corrections cannot dominate — traded for more stages. Early stopping on validation error freezes the number of stages at the generalisation peak, acting as the main regulariser. Random forest is structurally different: trees are trained in parallel, independently, on bootstrap samples with split-level feature randomness, all deep, aggregated by averaging/voting — variance reduction via averaging, with no sequential error-fitting and no learning rate. Linear models should still win (or tie) when the true signal is roughly linear in low dimension with limited n: they reach the same accuracy with far less variance, full interpretability, and no tuning ritual — plus the high-dimensional sparse regime (text one-hots) and extrapolation-heavy forecasting.',
          source: 'Top-frequency ML systems interview question; also a standard advanced-GATE short note.',
        },
        summary: [
          'Gradient boosting: predict the mean, then repeatedly fit small trees to the current residuals (negative gradients) and add them with shrinkage ν.',
          'Each stage is a small correction fragment — shallow depth, hundreds-to-thousands of stages, early stopping as the brake.',
          'Learning rate × n_estimators trade: small η with more trees generally generalises better.',
          'Forest averages decorrelated deep trees (variance killer); boosting sequences shallow ones (bias killer, sharper overfit risk).',
          'LightGBM/XGBoost engineering: histogram splits, native categoricals/NaNs, leaf-wise vs depth-wise growth, rich regularisation.',
          'Trees win on heterogeneous tabular data; linear models still win on smooth low-dim signals, tiny n, sparse text, and extrapolation.',
        ],
      }),
      [
        [
          'In gradient boosting for regression, a new tree is trained at each stage to predict:',
          [
            'The original target y',
            'The current residuals (negative gradient of the loss) of the ensemble',
            'The bootstrap sample labels',
            'The learning rate',
          ],
          1,
          'Stage-wise boosting fits what the ensemble currently gets wrong — residuals for MSE; other losses use their own negative gradients.',
        ],
        [
          'Reducing the learning rate (e.g., 0.1 → 0.03) while increasing the number of trees typically causes:',
          [
            'Automatic overfitting',
            'Slower, gentler steps that often generalise better (with early stopping to pick the stage count)',
            'The loss to become non-convex',
            'Trees to become deeper',
          ],
          1,
          'The classic shrink-and-extend trade: smaller steps need more stages and usually improve generalisation.',
        ],
        [
          'Compared with random forests, gradient-boosted trees typically:',
          [
            'Train fully in parallel with no ordering between trees',
            'Train sequentially, with each tree depending on the current ensemble\'s errors',
            'Never overfit regardless of settings',
            'Require feature scaling to work',
          ],
          1,
          'Boosting is inherently sequential (the next tree needs the current residuals); forests are parallel and independent.',
        ],
        [
          'For a small dataset (n = 150) with an approximately linear signal, the strongest practical baseline is usually:',
          ['A 12-layer boosted ensemble', 'A regularised linear (logistic/ridge) model on scaled features', 'A fully grown decision tree', 'k-NN with k = 1'],
          1,
          'Flexible trees chase noise at tiny n; regularised linear models hit low variance and stay interpretable — try them before ensembles.',
        ],
      ]
    ),
  ],
};
