// Machine Learning Fundamentals — course index.
//
// Part I (Modules 1–5, Agent A) builds the foundations: task families and
// paradigms, honest evaluation and leakage, data prep and EDA, linear and
// logistic regression, trees and ensembles, then similarity, probability and
// reduction. Part II (Modules 6–10) closes the loop: metrics chosen from the
// cost of errors, overfitting and tuning, unsupervised structure, production
// concerns (drift, monitoring, fairness, restraint), and the lifecycle,
// experimentation and capstone defence.
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

// A 30-question bank spanning all 40 lessons: exactly three per module (so a
// drawn paper of 15 covers the whole syllabus), mixed 12 easy / 12 medium /
// 6 hard, each module's trio touching all four of its lessons — computation
// questions where arithmetic carries the point (Gini 0.42, a 1.36 gradient
// step, MAE 30 vs RMSE 37, precision 0.45 at 1% base rate, sqrt(2 ln 100),
// group base rates recovered from TPR/FPR, the slice-collapse weighted
// average). Answer keys never leave the server pre-submission —
// sanitizeCourse strips the bank from the student payload.
const examBank: ExamQuestion[] = [
  // Foundations (Module 1)
  {
    id: 'mlf-bank-01',
    prompt:
      'A colleague lists four modelling requests. Which one is a regression problem in the sense of Module 1 — a continuous quantity predicted from features?',
    options: [
      'Predict tomorrow\'s rainfall in mm from humidity, pressure and wind readings',
      'Sort support tickets into billing, technical and account categories',
      'Choose the next video to recommend from a user\'s watch history',
      'Flag whether a card transaction is fraudulent',
    ],
    correct_index: 0,
    explanation:
      'Regression predicts a continuous quantity (millimetres of rainfall); the others are classification (ticket categories, fraud flag) or ranking/recommendation. The family fixes the output type, the loss and the honest metric — naming it correctly is the first decision of every project.',
    difficulty: 'easy',
    topic: 'foundations',
  },
  {
    id: 'mlf-bank-02',
    prompt: 'The core difference between reinforcement learning and supervised learning is that the reinforcement learner:',
    options: [
      'Receives no per-example correct answers — it takes actions, observes rewards in a changing environment, and must explore to learn a policy',
      'Needs far more labelled examples than supervised learning',
      'Cannot be evaluated on held-out data',
      'Only works on image data',
    ],
    correct_index: 0,
    explanation:
      'Supervised learning maps inputs to given labels (instructional feedback); unsupervised finds structure with no labels at all; reinforcement learning gets delayed scalar reward from actions (evaluative feedback), so exploration versus exploitation becomes part of training. The feedback type — not the algorithm name — defines the paradigm.',
    difficulty: 'easy',
    topic: 'foundations',
  },
  {
    id: 'mlf-bank-03',
    prompt:
      'A churn pipeline scores AUC 0.98. You retrain the identical pipeline on SHUFFLED labels and it still scores AUC 0.94. Best conclusion and next step?',
    options: [
      'The model is extraordinarily robust — deploy it',
      'Something other than the label relationship is driving the score: audit feature timing and the split for leakage, because a shuffle test that stays high means the evaluation itself is broken',
      'AUC is the wrong metric — switch to accuracy',
      'Shuffle the test set as well, then compare the two scores',
    ],
    correct_index: 1,
    explanation:
      'With shuffled labels no genuine signal exists, so an honest pipeline collapses to about 0.5 — at the baseline. A 0.94 proves a side channel: a feature computed with the outcome, train–test contamination, or preprocessing fitted across the split. Fix the evaluation before believing any number, and always quote it against the dumb baseline (always-mean / always-majority) the model must clear.',
    difficulty: 'medium',
    topic: 'foundations',
  },
  // Data prep and EDA (Module 2)
  {
    id: 'mlf-bank-04',
    prompt: 'Why does plotting the TARGET distribution come first in EDA for ML?',
    options: [
      'It is the convention examiners require',
      'It decides the metric, the split and any transform: a 99:1 class ratio makes accuracy meaningless and forces stratification, while a skewed regression target suggests a log transform and a median baseline',
      'Feature plots are optional once the target column exists',
      'It proves the dataset has no leakage',
    ],
    correct_index: 1,
    explanation:
      'Class balance picks the metric family (F1 / PR-AUC over accuracy) and the split (stratified); target skew picks the transform and the baseline. Everything else in the EDA serves those decisions — four jobs only: target, feature–target relationships, data quality, split integrity and leakage.',
    difficulty: 'easy',
    topic: 'data-prep',
  },
  {
    id: 'mlf-bank-05',
    prompt:
      'You compute a column\'s median over the FULL dataset, fill the missing cells, then split into train and test. What went wrong, and what is the fix?',
    options: [
      'Nothing — a median is just a constant',
      'Holdout statistics leaked into training: fit the imputer on the training fold inside a Pipeline, then transform validation and test with that fitted object',
      'Medians must never be used — delete every row with a gap',
      'Split first, then delete the rows that landed in the test set',
    ],
    correct_index: 1,
    explanation:
      'Even a scalar computed over all rows carries information about the held-out distribution; one median leaks a little, target-informed or high-dimensional statistics leak a lot. The rule: every data-dependent step (impute, encode, scale, select) fits inside the training fold, inside a Pipeline. Row deletion is defensible only for tiny, demonstrably random gaps.',
    difficulty: 'medium',
    topic: 'data-prep',
  },
  {
    id: 'mlf-bank-06',
    prompt:
      'A 99:1 imbalanced table with 8 nominal and 40 numeric columns. Which sequence keeps the holdout clean?',
    options: [
      'SMOTE the full data, then one-hot, then scale, then fit, then evaluate',
      'Split first; fit preprocessing on the training fold only (one-hot for nominal, scaling for distance/gradient models); SMOTE the training fold only; fit; evaluate on the untouched holdout',
      'Fit the scaler on all rows, split, then one-hot the training set',
      'Build the one-hot vocabulary from the test set so no category is missed',
    ],
    correct_index: 1,
    explanation:
      'Order is the whole game. Split first; imputation/encoding/scaling are fitted on the train fold (inside each CV fold); resampling happens on the training fold only — synthetic points derived from soon-to-be-test rows contaminate evaluation. Encoding must also handle unknown categories (handle_unknown="ignore") so the test set never invents its own vocabulary.',
    difficulty: 'medium',
    topic: 'data-prep',
  },
  // Linear and logistic regression (Module 3)
  {
    id: 'mlf-bank-07',
    prompt:
      'A model predicts y = w·x with squared error. One sample is x = 2, y = 5. With w = 1 and learning rate 0.03, what is w after one gradient-descent step on the loss (w·x − y)²?',
    options: ['1.12', '1.36', '1.24', '0.64'],
    correct_index: 1,
    explanation:
      'L = (2w − 5)², so dL/dw = 2(2w − 5)·2 = 4(2w − 5); at w = 1 that is 4(−3) = −12. Update: w − 0.03 × (−12) = 1 + 0.36 = 1.36. The negative gradient (prediction 2 was below the target 5) pushes w up toward the true value of 2.5 — you can always predict the next step before running it.',
    difficulty: 'easy',
    topic: 'regression',
  },
  {
    id: 'mlf-bank-08',
    prompt:
      'Ridge (L2) versus lasso (L1) on 40 features including several correlated pairs. Which pair of statements is correct?',
    options: [
      'Lasso zeroes weak features for a sparse story but arbitrarily keeps one of a correlated pair; ridge keeps every coefficient, shrinking them together for stability — and both penalties require standardised features because the penalty is scale-blind',
      'Ridge performs automatic feature selection while lasso never sets a coefficient exactly to zero',
      'Neither penalty needs scaling — scaling only matters for gradient descent',
      'Lasso is the right pick when every feature carries weak signal and you want stable individual coefficients',
    ],
    correct_index: 0,
    explanation:
      'L1 lands exactly on zero (selection) but picks arbitrarily among near-twins; L2 spreads weight densely, which stabilises correlated groups. Because the penalty bills raw coefficient magnitude, an unscaled rupee-scale feature is penalised far harder per unit of influence — standardise inside the pipeline first. The fourth option describes ridge, not lasso.',
    difficulty: 'medium',
    topic: 'regression',
  },
  {
    id: 'mlf-bank-09',
    prompt:
      'A logistic model gives a coefficient of −0.01 per credit-score point. Which interpretation and action are correct?',
    options: [
      'Each extra point multiplies the odds of default by exp(−0.01) ≈ 0.990 (50 points ≈ 0.61× the odds); σ(−2) ≈ 0.12 means about a 12% default probability — if too many risky borrowers are approved, raise the decision threshold on validation against the bank\'s FP/FN costs rather than retraining first',
      'Each extra point lowers the default probability by exactly one percentage point',
      'The coefficient means credit score reduces risk by 0.01 units of loss per point, linearly',
      'To reduce bad approvals, lower the threshold below 0.5',
    ],
    correct_index: 0,
    explanation:
      'Logistic regression regresses log-odds: exp(coef) is the odds ratio (0.990 per point; exp(−0.5) ≈ 0.61 over 50 points). Probabilities come from the sigmoid — σ(−2) = 1/(1+e²) ≈ 0.119 — and the operating point is a separate, tunable decision: raising the threshold trades recall for precision, tuned on validation with the test set sealed. Odds are not probability: odds 2:1 means probability 2/3.',
    difficulty: 'hard',
    topic: 'regression',
  },
  // Trees and ensembles (Module 4)
  {
    id: 'mlf-bank-10',
    prompt: 'A node holds 70% class A and 30% class B. Its Gini impurity is:',
    options: ['0.21', '0.42', '0.49', '0.60'],
    correct_index: 1,
    explanation:
      'G = 1 − (0.7² + 0.3²) = 1 − (0.49 + 0.09) = 0.42 — also readable as the probability that two draws with replacement carry different labels (2 × 0.7 × 0.3 = 0.42). A split is judged by the weighted child impurity against this parent number; zero means pure.',
    difficulty: 'easy',
    topic: 'trees-ensembles',
  },
  {
    id: 'mlf-bank-11',
    prompt:
      'A random forest trains 500 trees. Roughly what share of rows does each bootstrap sample omit, and what is out-of-bag scoring good for?',
    options: [
      'None — every bootstrap contains every row',
      'About 36.8% omitted; OOB is a free validation-style estimate because each row is scored only by the trees that never saw it',
      'About 50% omitted; OOB measures training error',
      'About 5% omitted; OOB detects label leakage',
    ],
    correct_index: 1,
    explanation:
      'Drawing n rows with replacement leaves out about 1/e ≈ 36.8% per tree; scoring each row with only its OOB trees estimates generalisation during training — excellent for sanity checks and default tuning. It is not a substitute for a sealed test set: OOB shares the training distribution and is blind to leakage.',
    difficulty: 'easy',
    topic: 'trees-ensembles',
  },
  {
    id: 'mlf-bank-12',
    prompt: 'Which pair of statements about tree-based models is correct?',
    options: [
      'A tree\'s fitted structure changes when you min–max scale a feature; boosting\'s first step always fits the raw labels directly',
      'A tree is invariant to monotone rescaling (thresholds reorder identically) yet cannot extrapolate beyond the training range; boosting fits each new tree to the current residuals with a shrinkage learning rate, so small rates plus many trees usually beat one deep tree',
      'Trees need feature scaling for gradient descent; boosting never overfits because its learners are weak',
      'A tree forecasts a trend past its training range by extending its final leaf',
    ],
    correct_index: 1,
    explanation:
      'Splits test only the order of values, so any monotone transform reproduces the tree exactly — but leaves average values they have seen, so a "forecast" beyond the range is a flat continuation (no extrapolation). Boosting chases residuals sequentially with learning-rate shrinkage and depth control; that is where its bias–variance win comes from, and where its overfitting dial lives.',
    difficulty: 'medium',
    topic: 'trees-ensembles',
  },
  // Similarity, probability and reduction (Module 5)
  {
    id: 'mlf-bank-13',
    prompt:
      'One feature ranges 0–10 sessions and another 0–5000 MB; k-NN predicts on unscaled data. What happens?',
    options: [
      'k-NN is scale-invariant because it ranks neighbours',
      'Neighbours are decided almost entirely by the MB feature — Euclidean distance sums raw magnitudes, so the widest-scale column dominates — fix it by standardising inside the pipeline',
      'k-NN normalises its features automatically',
      'Nothing; k-NN uses only the labels',
    ],
    correct_index: 1,
    explanation:
      'Distance is the model in k-NN: squared contributions scale with the range, so 5000² swamps 10². Scale on the training fold — the same reasoning applies to RBF SVMs and neural nets. Trees and Naive Bayes shrug at scaling; knowing which invariances your model family has is the difference between ritual and understanding.',
    difficulty: 'easy',
    topic: 'similarity-reduction',
  },
  {
    id: 'mlf-bank-14',
    prompt:
      'A spam filter never saw the word "invoice" in spam training data, so that word\'s likelihood became zero and the whole email scored zero. The correct fix and rationale?',
    options: [
      'Remove the word from the vocabulary entirely',
      'Laplace (add-k) smoothing: put a small floor under every word count so one unseen event cannot annihilate the product — and compute the score in log space so many small factors cannot underflow',
      'Switch to a neural network immediately',
      'Keep the zero — it is the honest probability',
    ],
    correct_index: 1,
    explanation:
      'Naive Bayes multiplies per-word likelihoods, so a single zero destroys the posterior, and many tiny factors underflow — hence additive smoothing plus log-space sums (adding log-probabilities). The "naive" independence assumption is false yet still wins at text classification, because ranking only needs the scores to be roughly right.',
    difficulty: 'medium',
    topic: 'similarity-reduction',
  },
  {
    id: 'mlf-bank-15',
    prompt: 'Which pair of statements about SVM and PCA is correct?',
    options: [
      'Raising C loosens the margin and tolerates more violations; PCA components are chosen to minimise total variance',
      'Raising C penalises violations harder, giving a narrower margin fitted more tightly to the data (overfit risk); PC1 captures the LARGEST possible variance of the centred data, and on mixed-unit columns you standardise first so the widest column does not own component 1',
      'Lowering C always improves generalisation; PCA uses the labels to find separating directions',
      'Kernel methods require computing the explicit high-dimensional mapping first; a single component\'s explained-variance ratio can exceed 1',
    ],
    correct_index: 1,
    explanation:
      'C trades margin width against misclassification cost: small C = wide robust margin, large C = tight fit. PCA is unsupervised variance maximisation on centred (usually standardised) data — ratios sum to 1, signs are arbitrary, and the transform is linear, so it cannot unfold non-linear structure (that is the embedding lesson of Module 8).',
    difficulty: 'hard',
    topic: 'similarity-reduction',
  },
  // Evaluation metrics (Module 6)
  {
    id: 'mlf-bank-16',
    prompt: 'On a test set with 1% positives, a model has TP = 80 and FP = 99. Precision is closest to:',
    options: ['0.01', '0.80', '0.45', '0.55'],
    correct_index: 2,
    explanation:
      'Precision = TP/(TP + FP) = 80/179 ≈ 0.447 ≈ 0.45 — fewer than half the alerts are real, so alert fatigue is already a design risk. On the same imbalanced set, the no-skill average-precision baseline equals the prevalence (0.01), which is why PR-AUC is judged against 0.01 while ROC-AUC is judged against 0.5 — and accuracy would report about 99% for a model that never fires.',
    difficulty: 'easy',
    topic: 'evaluation',
  },
  {
    id: 'mlf-bank-17',
    prompt: 'Three test errors are +10, +20 and −60 (in ₹). MAE and RMSE are closest to:',
    options: [
      'MAE 30 and RMSE about 37',
      'MAE 30 and RMSE 30',
      'MAE 20 and RMSE 24',
      'MAE 37 and RMSE 30',
    ],
    correct_index: 0,
    explanation:
      'MAE = (10 + 20 + 60)/3 = 30. MSE = (100 + 400 + 3600)/3 = 1366.7, so RMSE = 36.97 ≈ 37. RMSE exceeds MAE whenever errors are unequal: the squaring lets the −60 miss dominate (its square is 3600 of the 4100 total). Report both — typical error in rupees (MAE) and the price of a catastrophic miss (RMSE) — and remember MAPE\'s percent framing and its zero-denominator trap.',
    difficulty: 'medium',
    topic: 'evaluation',
  },
  {
    id: 'mlf-bank-18',
    prompt:
      'Two statements: (i) on 1% positive data a model can look excellent on ROC-AUC while PR-AUC exposes near-useless precision; (ii) evaluating 20 hyperparameter candidates with 5-fold CV fits 100 models. Which is correct, and why?',
    options: [
      'Both are wrong — ROC-AUC always exposes imbalance, and CV fits one model in total',
      'Both are correct: ROC-AUC averages ranking quality across a huge negative class so false alarms barely move it, while precision collapses under rarity; and each candidate is refit per fold, so 20 × 5 = 100 fits — the honest price of selection',
      '(i) is correct, (ii) is wrong — CV reuses one fit across candidates',
      '(i) is wrong, (ii) is correct — but only for stratified CV',
    ],
    correct_index: 1,
    explanation:
      'With 9,900 negatives, a modest FPR still produces many false positives; ROC-AUC barely notices while PR-AUC (baseline 0.01) collapses — pick the family from the harm and base rate. And CV refits the entire pipeline per fold per candidate: 100 fits for 20 candidates, plus a sealed holdout when the search was extensive (see the selection-inflation arithmetic of Module 7).',
    difficulty: 'hard',
    topic: 'evaluation',
  },
  // Overfitting and tuning (Module 7)
  {
    id: 'mlf-bank-19',
    prompt:
      'A model scores 0.99 on train and 0.74 on validation while a baseline scores 0.62. Which regime applies, and which lever set?',
    options: [
      'High bias — add capacity and features; stronger regularisation would also help',
      'High variance — the large gap at a healthy distance above baseline calls for more data, stronger regularisation, simpler structure or early stopping; more capacity would widen the gap',
      'The data does not matter; only the algorithm choice does',
      'Below baseline — retune the classification threshold',
    ],
    correct_index: 1,
    explanation:
      'High train with much lower validation is the gap signature of overfitting; 0.74 versus baseline 0.62 says there is real signal worth protecting. High bias looks opposite (train AND validation similarly low, small gap) and needs capacity or features — applying a variance remedy to a bias problem drives both scores toward the baseline.',
    difficulty: 'easy',
    topic: 'tuning',
  },
  {
    id: 'mlf-bank-20',
    prompt:
      'A search tries 100 configurations; fold noise has sigma = 1 accuracy point. The best candidate beats the validation mean by 3 points. Verdict?',
    options: [
      'A strong result — 100 trials is a thorough, defensible search',
      'Expected pure-selection inflation is about sigma × sqrt(2 ln 100) ≈ 3.03 points, so a 3-point gain is indistinguishable from choosing the luckiest trial — freeze the winner and confirm it on a sealed holdout before believing it',
      'The folds must be broken — rerun with different seeds until the gain holds',
      'Sigma is too large — remove noisy folds and re-search',
    ],
    correct_index: 1,
    explanation:
      'Best-of-N selection on noise alone lifts the reported maximum by roughly sigma × sqrt(2 ln N): 1 × sqrt(2 × 4.605) = 1 × 3.03 ≈ 3.03 points — exactly the observed gain. The procedure maximised luck, not learning: only one evaluation on untouched data (winner frozen, refit on all training rows) converts it into evidence.',
    difficulty: 'medium',
    topic: 'tuning',
  },
  {
    id: 'mlf-bank-21',
    prompt:
      'Permutation on held-out data: shuffling feature A drops AUC from 0.840 to 0.760, shuffling customer_id drops it to 0.839 — yet impurity importance ranks customer_id second. On a 13-point alpha grid, fold mean is 4.06 at alpha = 10 versus best 4.01 at alpha = 0.1. Which reading is correct?',
    options: [
      'Trust impurity importance, and use alpha = 0.1 because it has the lowest mean',
      'Impurity is inflating the ID column (cardinality bias: many candidate thresholds, measured on the training rows where the luck happened) while held-out permutation shows a 0.001 drop — drop or bin the ID; and by the one-standard-error rule alpha = 10 is the defensible pick: within 0.05 of the best with a simpler, more stable model',
      'Permutation is broken under correlation — customer_id really is the second-most important feature',
      'Both importance methods agree; simply extend the grid to 100 alphas',
    ],
    correct_index: 1,
    explanation:
      'MDI rewards columns with many split candidates on rows that already chose the lucky split; the held-out counterfactual (drop 0.080 for A versus 0.001 for the ID) is the honest reading — and correlated twins must be permuted together or they mask each other. For tuning, the one-standard-error rule buys robustness over a 0.05 fluke; and remember best-of-N inflation before trusting any grid winner.',
    difficulty: 'hard',
    topic: 'tuning',
  },
  // Unsupervised learning (Module 8)
  {
    id: 'mlf-bank-22',
    prompt:
      'K-means on unscaled features (0–10 sessions, 0–5000 MB) yields clusters aligned entirely with MB. First fix, and the honest k-selection rule?',
    options: [
      'Increase k until inertia stops falling',
      'Standardise inside a pipeline, then choose k from the elbow, silhouette and downstream lift — never by minimum inertia, which falls monotonically and reaches zero at k = n',
      'Switch to hierarchical clustering, which scales automatically',
      'Delete the sessions column only if k-means fails to converge',
    ],
    correct_index: 1,
    explanation:
      'Distance is the whole model, so the widest-scale column votes alone; scaling restores balance (then inverse-transform centroids to describe segments in real units). Selection: inertia always prefers more clusters, so use the elbow (shape), silhouette (cohesion vs separation, undefined at k = 1) and the business metric that pays — with stability across seeds (n_init, adjusted Rand) as insurance.',
    difficulty: 'easy',
    topic: 'unsupervised',
  },
  {
    id: 'mlf-bank-23',
    prompt:
      'Cross distances between X = {A, B} and Y = {C, D} are 9, 10, 8 and 9. The X–Y merge heights under single and complete linkage, and the state of each tree after cutting at height 9, are:',
    options: [
      'Single 8, complete 10: at height 9 the single-linkage tree has already closed into one cluster while complete still shows two',
      'Single 10, complete 8: at height 9 both trees still show two clusters',
      'Single 9, complete 9 — linkage criteria never disagree',
      'Both equal 9 — the cut height is also the number of clusters',
    ],
    correct_index: 0,
    explanation:
      'Single takes the minimum cross distance (8), complete the maximum (10), average the mean (9) — the rule, not the data, sets the height. A cut keeps merges at or below it: single closed at 8 (one cluster), complete needs 10 (still two). Ward heights are variance increases on another scale entirely, and the O(n²) distance matrix caps the method at a few thousand rows.',
    difficulty: 'medium',
    topic: 'unsupervised',
  },
  {
    id: 'mlf-bank-24',
    prompt:
      'Latencies 40, 42, 41, 43, 44, 42, 41, 95 give mean 48.5, sigma 17.6, median 42 and MAD 1. Separately, a t-SNE plot shows two islands with a wide gap. Which pair of statements is correct?',
    options: [
      'The 3-sigma z of the 95 (≈ 2.6) correctly passes it as normal, and the t-SNE gap proves the clusters are real',
      'Mean/sigma masks the spike — its z ≈ 2.6 fails 3σ because the outlier inflated its own ruler — while the robust z ≈ 0.6745 × 53/1 = 35.7 flags it at the 3.5 threshold; and the t-SNE gap, areas and island count are layout artefacts of perplexity and seed, so structure must be verified in original/PCA space',
      'Both detectors agree, and t-SNE distances are metric — safe to cluster on',
      'MAD is unusable here, so 3-sigma plus t-SNE clustering is the right stack',
    ],
    correct_index: 1,
    explanation:
      'Breakdown points decide it: mean/sigma are vandalised by the very value they measure (masking), median/MAD resist up to half the sample. Isolation forests catch the same rarity through short random-split paths (contamination is a budget statement). Non-linear embeddings preserve local neighbourhoods only — global geometry, cluster size and even island counts move with parameters and seed.',
    difficulty: 'medium',
    topic: 'unsupervised',
  },
  // ML systems in production (Module 9)
  {
    id: 'mlf-bank-25',
    prompt: 'A feature\'s PSI against training is 0.46 and performance has slipped. The correct first response?',
    options: [
      'Retrain immediately on the latest week — PSI above 0.25 always means retraining',
      'Treat it as a significant shift (> 0.25) and diagnose first: validate the feed (schema, nulls, units, joins), localise the feature and change point, classify covariate / prior / concept drift — then apply only the matching repair',
      'Raise the PSI threshold to 0.5 so alerts stop firing',
      'Delete the feature with the highest PSI and re-run',
    ],
    correct_index: 1,
    explanation:
      'PSI = sum over training-defined bins of (actual share − expected share) × ln(actual/expected): below 0.10 stable, 0.10–0.25 investigate, above 0.25 act — but PSI cannot tell a partner-schema bug from genuine concept change. Root cause first: retraining on a broken feed entrenches the breakage; the real repair is fix source (covariate), recalibrate (prior), retrain on time-ordered windows (concept) or model the calendar (seasonal).',
    difficulty: 'easy',
    topic: 'ml-systems',
  },
  {
    id: 'mlf-bank-26',
    prompt:
      'Group A: approval 0.60, TPR 0.90, FPR 0.15. Group B: approval 0.35, TPR 0.70, FPR 0.30. Recover the base rates and B\'s PPV among approved, and read the disparate-impact ratio:',
    options: [
      'Base rates A = 0.45, B = 0.25; PPV(B) = 0.70; ratio 0.58 passes the 4/5ths rule',
      'Base rates A = 0.60, B = 0.125; PPV(B) = 0.0875/0.35 = 0.25; ratio 0.35/0.60 ≈ 0.58, below 0.80 — flagged, and with unequal base rates calibration and equal error rates cannot both hold',
      'Base rates cannot be recovered from these three numbers; the ratio is 1.0',
      'Base rates A = 0.60, B = 0.125; PPV(B) = 0.70; ratio 0.58 passes the 4/5ths rule',
    ],
    correct_index: 1,
    explanation:
      'approval = TPR·p + FPR·(1−p): A gives 0.60 = 0.15 + 0.75p → p = 0.60; B gives 0.35 = 0.30 + 0.40p → p = 0.125. B\'s true approvals are 0.70 × 0.125 = 0.0875 of the group against 0.35 approvals, so PPV = 0.25 (A: 0.54/0.60 = 0.90). Ratio = 0.35/0.60 ≈ 0.58 < 0.80 → disparate-impact flag; the incompatibility theorem says unequal prevalence makes within-group calibration and equal FPR/TPR mutually exclusive — you choose whose error you accept, in writing.',
    difficulty: 'medium',
    topic: 'ml-systems',
  },
  {
    id: 'mlf-bank-27',
    prompt:
      'Two findings: (i) overall accuracy 0.90 = 0.98 × 0.91 + 0.02 × 0.55 while a 2% slice sits at 0.55; (ii) rules flag 660 reviews/day against a team capacity of 500, while an ML option flags 480/day plus Rs 500/day run cost, at Rs 12.50 per review and a Rs 1,05,000 build. Which conclusions follow?',
    options: [
      'The model is healthy at 0.90, and rules are cheaper, so keep the rules',
      'The slice collapse is invisible in the average — pre-register slices with floors, gap rules and sample sizes — and the ML option (Rs 6,500/day versus Rs 8,250/day) both fits capacity and saves Rs 1,750/day, paying back the build in 60 days, while rules overflow the queue by 160/day and fail silently',
      'Overall metrics are sufficient; capacity affects cost but never correctness',
      'Resample segment B to raise the average, and deploy the ML system without a holdback',
    ],
    correct_index: 1,
    explanation:
      'A weighted average moves by slice share × slice change: a 2% slice can lose 36 points while the headline moves 0.7 — monitoring must be sliced, with floors, gap rules, n shown, and label-free volume/score panels daily. Ops arithmetic: rules 660 × 12.50 = 8,250; ML 480 × 12.50 + 500 = 6,500 → saving 1,750/day, payback 1,05,000/1,750 = 60 days, and 480 ≤ 500 fits capacity while 660 > 500 queues unreviewed work every single day.',
    difficulty: 'hard',
    topic: 'ml-systems',
  },
  // Lifecycle, experimentation and defence (Module 10)
  {
    id: 'mlf-bank-28',
    prompt: 'Leadership asks ML to "cut churn by 20%". The correct first move?',
    options: [
      'Train three algorithms and compare AUC',
      'Write the one-page decision spec: decision, unit, prediction time, label timing rule, baselines, capacity, guardrails and ship criteria — frozen before any training',
      'Collect every available feature, including cancellation and retention-offer flags',
      'Set the success metric to whatever the model scores best',
    ],
    correct_index: 1,
    explanation:
      'The business goal is not the target: predict an observable outcome (non-renewal after a fixed prediction time), separate the intervention, and measure the 20% goal against a holdback. Cancellation and retention-process features are banned — they are the label arriving early — and criteria written after seeing results are press releases, not gates.',
    difficulty: 'easy',
    topic: 'lifecycle-capstone',
  },
  {
    id: 'mlf-bank-29',
    prompt:
      'An A/B test\'s sample-ratio-mismatch check alarms (chi-square p = 0.0004) while the treatment looks 2 points better. You should:',
    options: [
      'Read the lift — the split is only about 1% off',
      'Stop and debug assignment, redirects and logging first: SRM means the arms are not exchangeable, so every metric in the test — including the 2-point win — is contaminated and uninterpretable',
      'Switch to the secondary metric, which is unaffected',
      'Extend the test until the SRM p-value rises above 0.001',
    ],
    correct_index: 1,
    explanation:
      'A significant SRM (teams typically alarm below p = 0.001) says randomisation or logging is broken; downstream p-values inherit that bias no matter how small the size difference looks. Then resume under full hygiene: one pre-registered primary metric, power at the MDE, no peeking without always-valid intervals, guardrails with veto, full-cycle duration against novelty, and a persistent holdback.',
    difficulty: 'medium',
    topic: 'lifecycle-capstone',
  },
  {
    id: 'mlf-bank-30',
    prompt: 'Which option gives BOTH a complete model-card requirement and the correct defence structure?',
    options: [
      'Card: a marketing README updated yearly; defence: present the architecture first, then the accuracy number',
      'Card: nine versioned sections — details, intended use, out-of-scope naming populations/decisions/couplings, factors and metrics, evaluation data, a disaggregated quantitative table with n, training procedure, ethics, and caveats with expiry — registry-gated to match the model version; defence: frame → data/split with leakage audit → modelling → evaluation with slices and limits → operations with triggers, answering the "0.95 offline, useless in production" gap as leakage / split mismatch / skew / drift / metric mismatch, one check each',
      'Card: accuracy tables only — documentation exists for auditors; defence: quote AUC and wait for questions',
      'Card: omit out-of-scope (too restrictive); defence: demo the notebook and take questions',
    ],
    correct_index: 1,
    explanation:
      'The card prevents memory-and-imagination failures — who owns it, what it must never do, which subgroups were measured, when it expires — and must version with the artefact or it rots. The defence structure IS the lifecycle: each stage pre-answers its attacks (shuffle test for leakage, time/group splits, backfill-and-diff for skew, PSI for drift, operating-point metrics for mismatch), which is why a framing-led narrative survives interrogation and an architecture tour does not.',
    difficulty: 'hard',
    topic: 'lifecycle-capstone',
  },
];

export function getMLFundamentalsCourse(): Course {
  return {
    id: 'crs-ml-fundamentals',
    slug: 'ml-fundamentals',
    title: 'Machine Learning Fundamentals',
    subtitle:
      'From "what is a label" to defending a deployed system — the forty-lesson path through modelling, evaluation, tuning, production and interviews',
    description: `Most people meet machine learning as a library call: fit, predict, submit. This course treats it as a discipline of decisions — which problem shape you have, which metric your errors actually cost, which split your data allows, when the number you are quoting is noise, and what happens to the model on the Tuesday after it ships. Forty lessons, ten modules, one level: intermediate, with Python and basic statistics assumed and nothing else waved through.

Modules 1 to 5 build the modelling core. Module 1 fixes vocabulary and honesty — the four task families, the three paradigms, features versus labels with prediction-time availability, the leakage taxonomy and the baseline you must beat. Module 2 is data work in service of a model: EDA with a purpose, missing data without leakage, encoding and scaling with the reasoning that explains why trees shrug, and surviving 99:1 datasets with splits that do not lie. Modules 3, 4 and 5 carry the classical toolkit — linear and logistic regression with hand-computed gradient steps and odds ratios, decision trees with Gini arithmetic, random forests and boosting, then k-nearest neighbours, naive Bayes, support vector machines and PCA.

Modules 6 and 7 turn modelling into evidence. Module 6 derives every metric from the cost of errors — the confusion matrix and its prices, PR versus ROC at rare base rates, MAE versus RMSE, cross-validation against baselines. Module 7 names the two failure modes and their levers (bias and variance, learning curves), the regularisation dial across model families, the three species of hyperparameter search with their budget arithmetic, and the honest reading of feature importance. Module 8 works without labels — k-means and choosing k honestly, hierarchical dendrograms, anomaly detection under an alert budget, and the strict list of sentences a t-SNE plot is allowed to claim. Module 9 is production: drift with PSI arithmetic and root-cause-first repair, the monitoring stack including slices and training-serving skew, fairness with its incompatibility limits, and the judgement of when rules beat models. Module 10 closes with the lifecycle itself, experimentation hygiene, the model card, and a capstone where you defend an end-to-end system under attack.

Every lesson runs the same nine steps — objective, hook, concept, worked example with real arithmetic, practice task, common mistakes, exam/interview angle, a four-question quiz, and a revision summary — and every module feeds a 30-question final-exam bank drawn as a balanced 15-question paper. You finish with a certificate gated on defending a real project, and with the classic interview questions answered from memory with numbers behind them.`,
    category: 'AI & Data Science',
    level: 'intermediate',
    is_free: true,
    price_inr: 0,
    thumbnail_url: '',
    thumbnail_alt: 'Machine Learning Fundamentals course cover',
    tags: ['machine-learning', 'ml', 'sklearn', 'classification', 'regression', 'interviews'],
    outcomes: [
      'Classify any prediction request into the right task family, paradigm and metric before writing a line of code',
      'Build leakage-safe preprocessing (imputation, encoding, scaling, resampling) inside pipelines fitted on training folds only',
      'Choose splits that match the data — stratified, time-ordered, grouped — and defend them with the label-shuffle test',
      'Fit and interpret linear and logistic regression, from coefficients and odds ratios to the threshold that becomes a decision',
      'Grow, regularise and ensemble trees: bootstrap and OOB, boosting residuals, and the extrapolation limit trees cannot cross',
      'Select metrics from the cost of errors — confusion matrix, PR versus ROC at rare bases, MAE versus RMSE, calibration and cross-validated baselines',
      'Diagnose bias and variance from learning curves and apply only the correct levers; tune with grid, random and Bayesian search without overfitting validation',
      'Run k-means, hierarchical clustering, anomaly detection and PCA — choosing k, reading dendrograms, and stating what a 2-D embedding may claim',
      'Monitor a deployed model for drift, skew and slice collapse, and reason about fairness metrics with their incompatibility limits',
      'Scope, experiment, document (model card) and defend an end-to-end ML system — and answer the classic ten interview questions with arithmetic',
    ],
    prerequisite_course_id: null,
    certificate_eligible: true,
    published: true,
    created_at: '2026-10-15T09:00:00.000Z',
    updated_at: '2026-10-15T09:00:00.000Z',
    instructor_id: null,
    about_course: `Machine learning is a chain of decisions, and this course teaches the chain in order — forty lessons where every worked example has numbers you can check and every interview angle has a procedure behind it.

Module 1 — ML Foundations: Problems, Paradigms, and Honest Evaluation. The four task families matched to output types and metrics; supervised, unsupervised and reinforcement learning distinguished by feedback; features and labels with the prediction-time availability audit; the leakage taxonomy (target, contamination, temporal, entity) with the label-shuffle test and the baseline-first workflow.

Module 2 — Data Prep and EDA for ML. Target-first exploratory analysis in service of the model; missing-data mechanisms and imputation that fits on train only; one-hot, ordinal and target encoding with the leakage footgun, plus scaling and why distance models need it while trees do not; imbalance remedies with their bills, and stratified, time-ordered and group splits that match the data rather than the habit.

Modules 3 to 5 — the classical toolkit. Least-squares regression by hand and library, coefficient interpretation with multicollinearity caveats, squared-error loss and gradient descent walked step by step; ridge and lasso with standardisation, coefficient paths and the one-standard-error rule; logistic regression as log-odds modelling with sigmoid outputs, cross-entropy and thresholding. Then trees: greedy impurity reduction with Gini computed by hand, pruning, scale invariance and the extrapolation wall, bagging with feature randomness and out-of-bag scoring, boosting's residual chase with shrinkage. Finally k-nearest neighbours with the curse of dimensionality, naive Bayes with Laplace smoothing, SVM margins and kernels, and PCA as variance-maximising projection.

Module 6 — Evaluation: Choosing the Metric from the Cost of Errors. Precision, recall and F1 with a fraud example priced in rupees; ROC-AUC versus PR-AUC with the 100/9,900 arithmetic; MAE, MSE, RMSE and MAPE computed on the same residuals; cross-validation against baselines with group leakage exposed by honest folds.

Module 7 — Overfitting, Regularisation and Hyperparameter Tuning. Bias-squared plus variance plus noise as a computable decomposition; learning curves that decide whether to buy data or capacity; every regularisation lever across model families with the one-standard-error rule; grid, random and Bayesian search (Optuna) with budget arithmetic and selection inflation; permutation versus impurity importance and a leakage re-audit under tuning pressure.

Module 8 — Unsupervised Learning. Lloyd's algorithm by hand, scaling as a prerequisite, elbow/silhouette/downstream-lift for choosing k; hierarchical clustering with linkage failure modes and dendrogram cuts; anomaly detection with median/MAD robust statistics, isolation forests and thresholds set by alert budgets; PCA budgets with the trace check, and the strict claim list for t-SNE and UMAP.

Module 9 — ML in Production. Covariate, prior and concept drift with PSI computed by hand and a root-cause-first playbook; the six-layer monitoring stack, slice arithmetic that shows how averages hide collapse, and training-serving skew found by backfill-and-diff; fairness metrics computed per group with the incompatibility theorem and the harm-first selection rule; when rules beat ML, with cost and capacity arithmetic, and human-in-the-loop designed and measured.

Module 10 — The ML Lifecycle, Experimentation and Defending Your Work. Eight lifecycle gates with their artefacts, a churn problem framed end to end, experiment hygiene (pre-registration, SRM, power, guardrails and the best-of-N arithmetic), the nine-section model card, and the capstone: a ten-minute defence of your system under the standard attack sequence, closed by the classic ten interview questions.

The interview and exam angle runs through every lesson — "why does this split leak", "which metric and why", "your offline score is 0.95 and production is not, explain it" — the questions placement panels and semester exams actually ask, answerable from first principles rather than from flashcards.`,
    prerequisites: [
      'Python for AI (or equivalent): functions, pandas basics and running a scikit-learn script end to end',
      'Basic statistics: mean, standard deviation, percentiles and simple probability',
      'A tabular dataset you care about — the practice tasks run on real data, not toy arrays',
    ],
    audience: [
      'CSE / AIML / data-science students who need modelling fluency rather than API familiarity',
      'Placement-prep students: ML interview rounds test exactly these forty lessons',
      'Working analysts and engineers moving from dashboards and queries to deployed models',
      'Career switchers who can code in Python and want a defensible machine-learning foundation',
    ],
    audio_language: 'English',
    caption_language: 'English',
    // AI/DS primary course, open to all branches — professional tier, 20h.
    branch: 'ai-ds',
    branch_label: 'AI/DS primary — open to all branches',
    bucket: 'B',
    certificate_tier: 'professional',
    estimated_hours: 20,
    perks: [
      { key: 'certificate', label: 'Verifiable certificate' },
      { key: 'xp', label: 'XP on the leaderboard' },
      { key: 'capstone', label: 'Capstone defence project' },
    ],
    // Semester Exam Mode payload — the one-night revision sheet.
    exam_prep: {
      target: 'University AI/ML semester exams and placement interviews (CSE / AIML) — modules 1 to 10',
      units: [
        {
          title: 'Foundations and data prep (M1–M2)',
          summary:
            'Task families by output type: regression (continuous), classification (labels), ranking/recommendation, clustering (no label) — the family picks the metric. Paradigms by feedback: supervised (labels), unsupervised (structure), reinforcement (reward from actions). Features vs labels with the prediction-time rule: every column must exist, in code and meaning, strictly before the prediction moment or it is leakage. Leakage families: target, train–test contamination, temporal, entity — detect with the label-shuffle test (shuffled labels must collapse to baseline) and prevent with pipelines and honest splits. Baselines: always-mean / always-majority / current rule / simple linear — the floor every model must clear. EDA jobs: target first (balance sets metric and split; skew sets transform), feature–target relationships, quality bugs, split integrity. Missing data: mechanism matters (MCAR/MAR/MNAR), impute on train only, keep missingness indicators where absence is information. Encoding: one-hot for low cardinality, ordinal only when order is real, target encoding must be cross-fitted and smoothed. Scaling: mandatory for distance/gradient/penalty models, irrelevant for trees (threshold order is invariant). Imbalance: accuracy is meaningless at 99:1; weights, threshold tuning, PR-AUC, SMOTE inside the training fold only. Splits: stratified for rarity, time-ordered for temporal, grouped for repeated entities.',
          questions: [
            'Why is a feature computed after the outcome banned even when it predicts beautifully? Give two examples and the audit you run.',
            'Explain the label-shuffle test: what result indicates leakage, and what an honest pipeline produces.',
            'Order the steps for an imbalanced dataset with categorical features: split, impute, encode, scale, SMOTE, fit — and say where each must be fitted.',
          ],
          pyqs: [],
        },
        {
          title: 'Regression and regularisation (M3)',
          summary:
            'Least squares picks the line minimising squared residuals; slope = covariance/variance of x, intercept passes through the point of means. Interpretation: coefficient = change in y per unit of x holding others fixed — valid only without severe multicollinearity (check VIF; correlated predictors flip signs). Evaluation: MAE (typical error, robust), RMSE (same units, punishes big misses), R-squared (variance explained, can be negative on holdout, gamed by adding features — hence adjusted R-squared and baselines). Gradient descent: prediction, loss, gradient, step w minus lr times gradient; with squared loss on one point (x=2, y=5, w=1, lr=0.03) the step lands at 1.36. Batch/mini-batch/stochastic trade stability for speed; learning rate too high diverges, too low crawls. Regularisation: ridge (L2) shrinks all coefficients toward zero for stability under correlation; lasso (L1) lands on exact zeros for selection; elastic net combines both — and the penalty is scale-blind, so standardise first; alpha is searched on a log grid by CV, with the one-SE rule preferring the simpler model. Logistic regression: models log-odds through the sigmoid, trained with cross-entropy; exp(coefficient) is the odds ratio per unit; sigma(-2) is about 0.12; multi-class via softmax or one-vs-rest; the decision threshold is tuned on validation against asymmetric costs, never left at 0.5 by default.',
          questions: [
            'Walk one gradient-descent step numerically for y = w·x at w = 1, x = 2, y = 5, lr = 0.03, and predict the direction of the next three steps.',
            'Why must features be standardised before ridge/lasso, and how does the coefficient path change as alpha grows?',
            'Interpret exp(coef) = 0.99 per credit-score point and explain why reducing bad approvals is a threshold decision, not a retraining decision.',
          ],
          pyqs: [],
        },
        {
          title: 'Trees, ensembles and similarity methods (M4–M5)',
          summary:
            'Trees split greedily to maximise impurity gain: Gini = 1 minus sum of squared class shares (a 70/30 node is 0.42, also the chance two draws disagree), entropy as the log variant; depth is the overfitting dial, pruned pre- and post-hoc (cost-complexity). Trees ignore scaling (only threshold order matters) and need none (no gradient descent) — but they cannot extrapolate (leaves average seen values), prefer axis-aligned boundaries, and are unstable under resampling, which is why ensembles exist. Random forests: bootstrap samples leave about 36.8% OOB per tree, giving free validation; feature subsampling (sqrt for classification) decorrelates trees so averaging cuts variance; tune depth, leaf size, max_features — the tree count mainly buys stability. Boosting fits each tree to current residuals with shrinkage learning rate and depth control — small rate plus many trees usually beats one deep tree; watch the validation curve because boosting can overfit. k-NN: lazy, distance-based — scale first, choose k, weighted voting; distances concentrate as dimensions explode (curse of dimensionality; PCA helps). Naive Bayes: prior times likelihood over word counts, log-space sums, Laplace smoothing for unseen events; the independence assumption is false yet competitive at text ranking. SVM: maximise the margin, C trades margin width against violations, kernels separate in higher dimensions without computing the mapping explicitly. PCA: centred (usually standardised) data rotated onto directions of decreasing variance; explained-variance ratios sum to 1, cumulative threshold (95%) sets the component count, dropped eigenvalues equal reconstruction error; PCA is unsupervised and linear — variance retained is not accuracy retained.',
          questions: [
            'Compute Gini for a 70/30 node and explain both readings (impurity and draw probability).',
            'Why does a random forest score rows its trees never saw, and what does each bootstrap omit (about 36.8%)?',
            'Which models must be scaled and which are invariant? Justify with what each model computes from the data.',
          ],
          pyqs: [],
        },
        {
          title: 'Evaluation metrics (M6)',
          summary:
            'Every metric is a cost model in disguise. Confusion matrix: TP/FP/FN/TN; precision = TP/(TP+FP) is what a flag means (80/179 is about 0.45 — fewer than half of alerts real); recall = TP/(TP+FN) is what fraction of positives you caught; F1 harmonises them, F-beta shifts weight; thresholds move along the trade — pick from FP versus FN costs on validation, not 0.5 by habit. ROC-AUC: probability a random positive outranks a random negative, judged against 0.5; PR-AUC: precision against recall with baseline equal to prevalence (0.01 on 1% data) — on rare events ROC-AUC looks fine while PR-AUC exposes useless precision. Pick the family from the base rate and harm. Regression: MAE (average absolute error, robust, in rupees), MSE/RMSE (squares punish the worst miss: errors 10, 20, -60 give MAE 30 and RMSE about 37), MAPE (percent framing, breaks on zeros and asymmetry); compare all against the naive baseline (mean/median/seasonal lag). Cross-validation: k folds refit the whole pipeline per fold per candidate — 20 candidates x 5 folds = 100 fits; stratified for rarity, grouped for entities, time-ordered for temporal (random k-fold on time leaks the future); report mean and spread, never the best fold; keep a sealed holdout for the final claim.',
          questions: [
            'A test set has 1% positives with TP = 80, FP = 99. Compute precision and state the PR-AUC no-skill baseline.',
            'Errors of +10, +20 and -60: compute MAE and RMSE and explain why RMSE is larger.',
            'When does a model look great on ROC-AUC but fail in production, and which metric would have exposed it? Include the CV fit-count arithmetic for a 20-candidate, 5-fold search.',
          ],
          pyqs: [],
        },
        {
          title: 'Overfitting and tuning (M7)',
          summary:
            'Expected error = bias-squared + variance + irreducible noise; tuning minimises the sum, never bias alone (worked: bias -2.6/sd 1.0 gives 11.76, bias -0.4/sd 2.5 gives 10.41, bias -1.5/sd 1.4 gives 8.21 — the least-biased model loses). Symptoms: high bias = train low and validation similarly low (needs capacity, features, weaker penalties); high variance = train high, validation far lower (needs data, stronger regularisation, simpler model, early stopping). Learning curves answer "will more data help?" — plateaued together means buy capacity, wide gap with validation still rising means buy data. Regularisation levers across families: L2/L1/elastic net (standardise first), tree depth/leaf size, boosting shrinkage, early stopping, dropout (nets); the one-SE rule picks the simplest model within one standard error of the best. Search: grid (systematic, wasteful — 500 fits where random takes 450 for better coverage), random (better spread per fit), Bayesian/Optuna (models the objective, suggests the next trial, prunes losers early — still optimising a noisy estimate). Best-of-N inflation: sigma times sqrt(2 ln N) — 100 trials at sigma 0.01 gains about 0.03 of pure luck; sigma 1 point at 50 variants is 1.4 points. Importance: impurity (free, biased to high-cardinality, optimistic on training rows) versus permutation on held-out data (honest, but correlated features mask each other — permute groups); importance is association, never causation. Leakage returns under tuning pressure: everything learned lives inside the Pipeline inside the splitter (SMOTE, encoders, selectors), and predict-time availability is re-audited before deployment.',
          questions: [
            'Compute expected MSE from bias and variance for three candidates and choose the model; name the lever for each loser.',
            'Why can minimum inertia (or any training objective) never select complexity? Apply the rule to k and to alpha.',
            'Compute selection inflation for N = 100 at sigma = 0.01, and state the protocol that makes a small validation gain credible.',
          ],
          pyqs: [],
        },
        {
          title: 'Unsupervised learning (M8)',
          summary:
            'K-means alternates nearest-centroid assignment and centroid-mean update until assignments stop; inertia only falls and reaches zero at k = n, so lowest inertia can never choose k; restarts (n_init) exist because only a local optimum is guaranteed. Distance is the model, so unscaled or duplicated columns silently decide the clusters — standardise inside a pipeline and inverse-transform centroids to describe segments in real units. Choose k honestly: elbow (shape), silhouette (cohesion a versus separation b, s = (b-a)/max(a,b): 1 clean, 0 boundary, negative misassigned) and downstream lift (the only one that pays), plus stability across seeds. Hierarchical: agglomerative merging with linkage defining cluster distance — single chains through noise (min cross distance 8 in the worked set), complete is compact but outlier-sensitive (max 10), average is the mean (9), ward minimises added within-cluster variance (heights on a different scale); a cut at height h keeps merges at or below h and replaces k with a defensible granularity dial; O(n-squared) memory caps the method at a few thousand rows. Anomalies: point, contextual and collective species need different tools; mean/sigma are vandalised by the outlier they measure (masking — the 95 ms spike scores only 2.6 sigma), median/MAD robust z = 0.6745(x - median)/MAD with threshold 3.5 survives half the sample; isolation forests flag items isolated by fewer random splits (contamination = alert budget); thresholds come from the cost matrix and the team capacity, flags are hypotheses for humans, review before retrain. PCA budgets: ratios from eigenvalues, cumulative threshold at 95%, trace equals feature count when standardised (units otherwise own component 1); t-SNE/UMAP preserve local neighbourhoods only — gaps, areas and island counts move with perplexity and seed, so cluster in real or PCA space and embed for eyes only.',
          questions: [
            'Run one Lloyd iteration on four points by hand, declare convergence, and compute one silhouette coefficient.',
            'Single versus complete versus Ward: merge heights, cut behaviour, and why heights cannot be compared across methods.',
            'Why does the 3-sigma alarm miss the 95 ms spike while median/MAD flags it? Compute both and give the production threshold rule.',
          ],
          pyqs: [],
        },
        {
          title: 'Production, monitoring and fairness (M9)',
          summary:
            'Drift types decide repairs: covariate (P(X) moves, relationship stable) — fix the source or retrain; prior/label (P(Y) moves) — recalibrate; concept (P(Y|X) moves) — retrain on time-ordered windows; seasonal — model the calendar. PSI = sum over training-defined bins of (actual minus expected) times ln(actual/expected): below 0.10 stable, 0.10-0.25 investigate, above 0.25 act — and act means diagnose first (schema, units, joins, change point), because retraining on a broken feed entrenches the bug; the worked window (7/15/28/50 versus 25 each) sums to about 0.46. While labels are late, monitor features, score distributions, nulls and volume daily. Monitoring layers: data quality, input PSI, score PSI, operations (p95/p99), performance on label cadence, and slices with pre-registered floors, gap rules and sample sizes — the worked average (0.98 x 0.91 + 0.02 x 0.55 = 0.90) hides a slice at 0.55. Training-serving skew is silent: backfill training rows through the serving path and diff, shadow-compare scores. Alerts need thresholds, owners, runbooks and severity tiers or the team learns to ignore them. Fairness: start from harm (who pays for FP, who pays for FN), then compute demographic parity, equal opportunity (TPR), equalised odds (TPR and FPR) and predictive parity (PPV) per group with n; the worked groups (A: 0.90/0.15/0.60, B: 0.70/0.30/0.35) recover base rates 0.60 and 0.125 and PPV 0.90 versus 0.25 — with unequal base rates, calibration and equal error rates are provably incompatible, so you choose and document; removing the protected column hides the audit without removing the effect. When not to use ML: no trusted label, no signal beyond written rules, thin data, unreviewable harm, no monitoring capacity, no right to use the inputs; compare on operating numbers (rules 660 reviews versus ML 480 plus run cost fits a 500/day capacity with 60-day payback) and keep humans in the loop with an abstention band sized to capacity, measured combined performance and automation-bias checks.',
          questions: [
            'Distinguish the three drift types and compute PSI for bin shares 7/15/28/50 against a uniform training split.',
            'Why does an overall 0.90 hide a failing slice? Compute the weighted average and specify the panel rules that would have fired.',
            'Recover base rates and PPV from the two-group table; explain why all four fairness metrics cannot be equalised and what the model card must record.',
          ],
          pyqs: [],
        },
        {
          title: 'Lifecycle, experiments and defence (M10)',
          summary:
            'Lifecycle gates, each with an artefact: framing (decision spec: decision, unit, prediction time, label timing rule), metrics (baselines, offline/online metrics, guardrails, ship criteria frozen before training), data (rights, availability audit), features (shared train/serve definitions, dumb baselines), validation (time/group-aware report with error analysis), release (shadow, canary, ramp, one-command rollback), monitoring (layers with owners), retirement (retrain and expiry triggers). The churn walkthrough separates the decision (who gets a call), the prediction (non-renewal probability at a fixed moment) and the intervention (measured against a holdback) — cancellation and offer-sent flags are banned as features because they arrive after the decision they encode. Experimentation: pre-register one primary metric with MDE, power (n = 2(1.96+0.84)^2 p(1-p)/delta^2: about 109,000 per arm for a 0.6-point effect at 50%), no peeking without always-valid intervals, guardrails with veto, SRM alarm (chi-square) stops the test before any metric is read, novelty needs full cycles, interference needs cluster or switchback designs; best-of-N inflation (sigma 0.5 over 50 variants = 1.4 points) kills most reported wins (observed +0.6 loses). Model cards: nine versioned sections with named out-of-scope prohibitions, a disaggregated evaluation table with n and floors, ethics and expiry — registry-gated with the model. Capstone defence: frame, data/split with leakage audit, modelling, evaluation with slices and limits, operations with triggers — answering offline-0.95-versus-production as leakage (shuffle test), split (time/group), skew (backfill diff), drift (PSI) or metric mismatch (operating point), plus the classic ten interview questions with definitions, numbers and boundary cases.',
          questions: [
            'Write the one-page decision spec for a churn model: unit, prediction time, label timing rule, two banned features, baselines and ship criteria.',
            'Compute best-of-50 selection inflation at sigma 0.5 and judge a +0.6-point lift; then state the per-arm n for a 0.6-point MDE.',
            'List the nine model-card sections and the five-move defence structure; give the five-suspect taxonomy for "0.95 offline, useless in production".',
          ],
          pyqs: [],
        },
      ],
      important_questions: [
        'Explain the confusion matrix and derive precision, recall and F1 from a fraud example — then show how the cost ratio between false positives and false negatives sets the threshold.',
        'Define data leakage in its four forms, explain why the label-shuffle test detects it, and list the pipeline discipline that prevents it.',
        'State the bias–variance decomposition, compute expected MSE for two candidates from bias and variance, and name the correct lever for each regime.',
        'Compare stratified, time-ordered and grouped cross-validation: which data structure demands which split, and what does random k-fold falsely assume?',
        'Explain standardisation before PCA with the unit-domination example, and compute component count from explained-variance ratios (cumulative 50/78/92/98/100).',
        'Distinguish covariate, prior and concept drift; compute PSI by hand; and outline the root-cause-first incident playbook with thresholds 0.10 and 0.25.',
        'Given per-group TPR, FPR and approval rates, recover base rates and PPV, compute the disparate-impact ratio, and explain the fairness incompatibility result.',
        'Explain best-of-N selection inflation with the sigma sqrt(2 ln N) formula, the sample-ratio-mismatch check, and what pre-registration fixes that peeking cannot.',
      ],
      previous_year_questions: [
        {
          year: '2025',
          question:
            'Your classifier reports 99% accuracy and 0.99 ROC-AUC on a dataset with 1% fraud positives, using a random train/test split. In production it catches almost no fraud. Diagnose every defect in this evaluation and specify the corrected protocol.',
          solution:
            'Three stacked defects. (1) The metric: with 1% positives, an always-genuine classifier scores 99% accuracy — accuracy is undefined as a goal here; and ROC-AUC averages ranking quality over the huge negative class, so a modest FPR still floods the alert queue while the curve looks excellent. Fix: PR-AUC (no-skill baseline = 0.01), precision and recall at the operating threshold, and precision at the alert budget (how many alerts/day the team can work). (2) The split: fraud transactions repeat per customer/device/merchant, so a random split scatters the same entity across train and test — the model recognises rows instead of detecting fraud. Fix: group split by entity, or better a time-ordered split, because production faces the future. (3) Possible leakage: audit every feature against the fraud-label timing (chargeback flags, investigation fields, post-transaction aggregates) and run the label-shuffle test — shuffled labels must collapse to the baseline, otherwise a side channel exists. Corrected protocol: leakage audit plus shuffle test, grouped/time split inside a Pipeline, class weighting or in-fold resampling, PR-AUC and precision@k as primary metrics against the majority and current-rule baselines, threshold chosen on validation from alert-capacity and FP/FN costs, sealed final holdout, then canary deployment with score-PSI and slice monitoring.',
        },
        {
          year: '2025',
          question:
            'Define the bias–variance decomposition. A model has bias −2.6 with prediction sd 1.0 across retrains and noise sd 2; another has bias −0.4 and sd 2.5. Compute both expected errors, choose the model, and state why more data will not fix the loser you rejected.',
          solution:
            'Expected error = bias² + variance + irreducible noise². Model 1: (−2.6)² + 1.0² + 2² = 6.76 + 1.00 + 4.00 = 11.76. Model 2: (−0.4)² + 2.5² + 4.00 = 0.16 + 6.25 + 4.00 = 10.41. Model 2 wins despite near-zero bias, because its swings cost more than Model 1’s steady miss — tuning minimises the SUM, never bias alone; a third model with bias −1.5 and sd 1.4 (8.21) would win outright. The rejected Model 1 is the high-bias (underfit) case: its remedy is more capacity, better features or weaker regularisation — and more data does not help it, because a learning curve for a high-bias model plateaus: the model class cannot express the pattern, so extra rows reduce neither bias nor the (already small) variance. The noise floor of 4 is also instructive: if label error dominates for every candidate, better labelling beats better modelling.',
        },
        {
          year: '2026',
          question:
            'A growth team reports that the best of 50 A/B variants lifted conversion by 0.6 percentage points (daily noise sigma = 0.5). Evaluate the claim quantitatively and specify the protocol that would make a lift of this size believable.',
          solution:
            'Evaluate with selection arithmetic: the expected maximum of 50 noisy estimates exceeds the truth by about sigma x sqrt(2 ln N) = 0.5 x sqrt(2 x ln 50) = 0.5 x 2.80 = 1.4 points from pure selection alone — the reported +0.6 is less than half of that, so it is indistinguishable from naming the luckiest variant. As a single pre-registered test it also fails: with n = 10,000 per arm at p = 0.5, SE of the difference is sqrt(0.5 x 0.5 x 2/10000) = 0.707 points, so z = 0.6/0.707 = 0.85, far under 1.96 (p about 0.20); and powering a 0.6-point MDE at 80%/5% needs n = 2(1.96 + 0.84)² × 0.25 / 0.006² ≈ 109,000 per arm — the test was about ten times underpowered. Believable protocol: pre-register ONE primary metric, MDE, power calculation and duration; check SRM first (chi-square on assigned versus observed splits) and stop if it fires; no peeking (fixed horizon or always-valid confidence sequences); guardrails with veto power; run through full weekly cycles to exclude novelty; optionally apply CUPED to cut variance and required n; freeze the winner and confirm it once on untouched holdout traffic; keep a long-run holdback; and log the negative results so the same 50 variants are never resold.',
        },
      ],
    },
    // Final exam: 15 drawn from the 30-question bank, mixed difficulty and
    // topic-tagged across all ten modules (three questions each, so a paper
    // spans the whole syllabus). Pass 60, distinction 85 on the first
    // attempt, 24h retake.
    exam: {
      question_count: 15,
      duration_minutes: 30,
      passing_percent: 60,
      retake_cooldown_hours: 24,
      distinction_percent: 85,
      bank: examBank,
    },
    // Capstone: defend an end-to-end ML system. Required for the certificate —
    // the course claims you can take a problem from framing to monitoring and
    // survive an adversarial reader, and this document is the proof.
    project: {
      title: 'Defend an end-to-end ML system',
      brief:
        'Pick one problem with real (or realistic) tabular data and produce the full artefact set the course taught, then defend it. (1) The one-page decision spec: decision and decision-maker, unit, prediction time, label with timing rule, three features with availability timestamps, two deliberately banned features with reasons, capacity or cost constraint, offline metric, baselines (base rate, current rule, simple model), guardrails, and ship criteria — all written before your first training run and dated. (2) The leakage audit: the banned-feature list, the label-shuffle test result (shuffled labels must collapse to baseline), and the preprocessing order proving every data-dependent step fitted on the training fold inside a Pipeline. (3) The evaluation report: the split you chose and why (stratified / time-ordered / grouped), cross-validation with mean and spread, tuning with a stated budget and the selection-inflation arithmetic applied to your own search, final sealed-holdout numbers against the baselines, a disaggregated table with sample sizes (pre-registered slices with floors), calibration where probabilities matter, and a written error analysis of at least ten real mistakes. (4) The model card: all nine sections filled with real content, versioned to your model, including named out-of-scope uses and an expiry with retrain triggers. (5) The operations plan: monitoring layers with thresholds and owners (data quality, input and score PSI, slice metrics on label cadence, ops), the backfill-and-diff check for training-serving skew, release ladder (shadow/canary/ramp with rollback), and the fairness metrics for any group a reviewer would ask about, with the harm rationale for the metric you chose. (6) The rules-versus-ML justification: cost and capacity arithmetic showing why ML (or rules) wins your case, with payback. (7) The human-in-the-loop design: abstention band sized to review capacity and the measure you would use to prove human+model beats each alone. Close with a recorded ten-minute defence answering the standard attack sequence (leakage, split, skew, noise, drift, fairness) from your own work — every claim a reviewer could attack already has a procedure and a receipt.',
      submission_hint:
        'A public or shareable repository (or linked document) containing the spec, the notebooks or scripts with their outputs, the model card, the monitoring plan — plus a link to a recorded 10-minute defence (any screen-recording link works).',
      required_for_certificate: true,
    },
    modules,
  };
}
