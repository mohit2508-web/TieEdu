// Module 6 — Evaluation: Choosing the Metric from the Cost of Errors
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code } from '../nineBlocks';
import { lesson, M6, COURSE_ID } from './helpers';

export const module6: CourseModule = {
  id: M6,
  course_id: COURSE_ID,
  title: 'Module 6 — Evaluation: Choosing the Metric from the Cost of Errors',
  summary:
    'Evaluation as an economics problem rather than a scoreboard: reading the cost of a false alarm against the cost of a miss; the confusion matrix with precision, recall and F1 computed by hand; ROC-AUC versus PR-AUC when the positive class is rare; regression metrics (MAE, MSE, RMSE, MAPE) and which one the business actually feels; and the two disciplines that make any number worth reporting — cross-validation and baselines.',
  sort_order: 6,
  lessons: [
    lesson(
      M6,
      'mlf-6-1',
      61,
      'The Cost of Errors: Confusion Matrices, Precision, Recall, and F1',
      'Every classification metric is arithmetic on four cells — and the right metric is the one whose denominators match the mistake that costs you money.',
      21,
      nineBlocks({
        objectives: [
          'Build a 2x2 confusion matrix from raw predictions and compute accuracy, precision, recall and F1 by hand',
          'Derive the primary metric from an explicit cost of false positives versus false negatives',
          'Decide between precision, recall and F1 given a stated business cost, and defend the choice',
          'Explain why accuracy collapses on a 1%-positive dataset and compute the majority-class baseline that proves it',
        ],
        hook:
          'A bank ships a fraud model that is 99.4% accurate. It also misses 60% of actual fraud, because the model learned that almost nothing is fraud. Meanwhile a screening model that catches nearly every case gets fired for being "only 70% accurate" — because its false alarms annoyed the operations team. Both verdicts came from the same number, accuracy, and both were wrong. The metric is not a formality you pick after training; it is the contract that says which mistake you are willing to make. Get it wrong and you will optimise the model into the opposite of what anyone wanted.',
        concept: `**Four cells, one matrix.** Take every prediction and sort it by two questions: what did the model say, and what was actually true. Predicted positive/negative crossed with actual positive/negative gives four counts: **TP** (predicted yes, truly yes), **FP** (predicted yes, actually no — a false alarm), **FN** (predicted no, actually yes — a miss), **TN** (predicted no, truly no). This is the confusion matrix, and — this is the part interviewers probe — *every* classification metric you will ever meet is arithmetic on those four numbers. Accuracy = (TP+TN)/all. Precision = TP/(TP+FP): of everything the model flagged, how much was real — a statement about the quality of your alarms. Recall (sensitivity, TPR) = TP/(TP+FN): of everything that was real, how much did you catch — a statement about your coverage. F1 = 2·P·R/(P+R): the harmonic mean of the two, a single number that punishes any model that is strong on one side and useless on the other (P = 0.90, R = 0.10 gives F1 = 0.18, not 0.50 — the harmonic mean drags toward the smaller operand). Keep the denominators straight: precision's denominator is *predictions*; recall's denominator is *actual positives*. Nearly every confusion in an interview is a denominator confusion.

**The cost matrix decides the metric.** Before choosing a metric, price the mistakes. A false positive on a fraud alert costs an operations review (minutes, salary); a false negative costs the stolen amount, perhaps multiplied by reputational loss. A missed cancer screening costs a life trajectory; a false alarm costs a follow-up test. Write it as a cost: total cost = C_FN·FN + C_FP·FP. That single line resolves every "which metric?" debate. If C_FP dominates (you may not accuse a loyal customer of fraud), you are buying **precision** — few alarms, all of them defensible. If C_FN dominates (you may not let threats through), you are buying **recall** — catch everything, tolerate noise. If you genuinely cannot price the two, F1 is the honest compromise, because it refuses to let one side do all the talking. Note what F1 assumes: implicitly equal weight on precision and recall, and it ignores TN entirely — correct for a rare-positive problem, wrong when true negatives are the bulk of your value (spam filtering still cares that 99% of mail passes untouched; that is a specificity story).

**Accuracy, and its well-known lie.** Accuracy is the right metric exactly when classes are balanced *and* the two error types cost roughly the same. Break either condition and it misleads. On a dataset with 1% positives, a model that always answers "not positive" scores 99% while catching nothing — accuracy measured the model's laziness, not its skill. So the first number you compute alongside accuracy is the **baseline**: majority-class accuracy, or stratified-random predictions. A model that scores 0.96 against a 0.96 baseline has added nothing, no matter what the leaderboard says. This is the baseline discipline from Module 1 meeting the arithmetic of Module 6: report (metric, baseline, confusion matrix) together, always.

**From counts to practice.** In scikit-learn: confusion_matrix(y, pred) prints the grid (careful with row/column orientation — sklearn puts *actual* in rows by convention: [[TN, FP], [FN, TP]] for binary labels), precision_recall_fscore_support gives all three, classification_report wraps them with support counts, and f1_score(y, pred, pos_label=...) picks which class is "positive". For multiclass you must state the averaging: **macro** gives every class equal weight (the honest view of rare classes), **weighted** scales by support (flatters the majority), **micro** pools all counts (in single-label problems it equals accuracy — usually the least informative choice). Thresholding matters too: these numbers are computed at whatever decision boundary you used, usually 0.5 by default. The threshold is a dial, not a constant — you will move it in Lesson 6.2, and every move trades FP against FN exactly as the cost line demands.`,
        extras: [
          table(
            'The classification metrics, by the question each answers',
            ['Metric', 'Formula', 'The question it answers', 'Choose it when'],
            [
              ['Accuracy', '(TP + TN) / total', 'How often is the model right, overall?', 'Classes balanced AND both errors cost the same'],
              ['Precision', 'TP / (TP + FP)', 'Of the alarms, how many are real?', 'False alarms are expensive (fraud alerts, spam quarantine)'],
              ['Recall', 'TP / (TP + FN)', 'Of the real cases, how many did we catch?', 'Misses are expensive (screening, threat detection)'],
              ['F1', '2PR / (P + R)', 'Do both sides exist at all?', 'You cannot price the two errors and the classes are imbalanced'],
              ['Specificity', 'TN / (TN + FP)', 'Of the negatives, how many passed correctly?', 'The non-event population must stay undisturbed'],
            ],
          ),
          code(
            '# Confusion matrix, P/R/F1, and the baseline — in the order you should run them\nfrom sklearn.dummy import DummyClassifier\nfrom sklearn.metrics import (confusion_matrix, precision_recall_fscore_support,\n                             accuracy_score, classification_report)\n\n# 0. The baseline first — everything else is judged against it\nbase = DummyClassifier(strategy=\"most_frequent\").fit(X_train, y_train)\ny_base = base.predict(X_test)\nprint(\"baseline accuracy:\", accuracy_score(y_test, y_base))\n\n# 1. Your model\ny_pred = model.predict(X_test)\nprint(confusion_matrix(y_test, y_pred))          # [[TN, FP], [FN, TP]]\np, r, f1, _ = precision_recall_fscore_support(y_test, y_pred, average=\"binary\")\nprint(f\"precision={p:.3f} recall={r:.3f} f1={f1:.3f}\")\n\n# 2. The honest report, with the positive class named explicitly\nprint(classification_report(y_test, y_pred, digits=3, zero_division=0))\n\n# 3. A cost line: choose the threshold that minimises C_FN*FN + C_FP*FP\nimport numpy as np\nproba = model.predict_proba(X_test)[:, 1]\nis_pos, is_neg = (y_test == 1), (y_test == 0)\nC_FN, C_FP = 10000, 500            # business prices, not guesses\ncosts = [(t, C_FN * (is_pos & (proba < t)).sum() + C_FP * (is_neg & (proba >= t)).sum())\n         for t in np.linspace(0.05, 0.95, 18)]\nbest_t, best_cost = min(costs, key=lambda x: x[1])\nprint(\"threshold\", round(best_t, 2), \"min cost\", best_cost)',
            'confusion_and_cost.py',
            'python'
          ),
          warn(
            'Accuracy without a baseline is not a result',
            'On 1%-positive data, always-negative scores 99%. Print majority-class (or dummy) accuracy in the same cell as your model number, or the number means nothing.',
          ),
          tip(
            'Report the matrix, not just the scalar',
            'One F1 hides two different failures. The confusion matrix plus a per-class report lets you say exactly which mistake grew when a number moved — and that is what an interviewer or a stakeholder actually wants to hear.',
          ),
        ],
        worked: {
          title: 'A fraud model by hand: matrix, metrics, baseline, and the cost line',
          problem:
            '1,000 transactions; 40 are truly fraudulent. Your model flags 60 transactions as fraud; 30 of them are real fraud. (a) Fill the confusion matrix. (b) Compute precision, recall, F1 and accuracy. (c) Compare accuracy with the always-not-fraud baseline. (d) With each missed fraud costing Rs 10,000 and each false flag costing Rs 500 of analyst time, which strategy is cheaper?',
          steps: [
            {
              title: '(a) The four cells',
              desc: 'TP = 30 (flagged and real). FN = 40 - 30 = 10 (real fraud never flagged). FP = 60 - 30 = 30 (flagged, not fraud). TN = 960 - 30 = 930 (correctly passed; 960 non-fraud rows minus the 30 false alarms). Totals check: 30 + 30 + 10 + 930 = 1,000.',
            },
            {
              title: '(b) The four metrics',
              desc: 'Precision = TP/(TP+FP) = 30/60 = 0.50 — half the alerts are real. Recall = TP/(TP+FN) = 30/40 = 0.75 — three quarters of fraud caught. F1 = 2PR/(P+R) = 2(0.50)(0.75)/(1.25) = 0.75/1.25 = 0.60. Accuracy = (30+930)/1000 = 960/1000 = 0.96.',
            },
            {
              title: '(c) The baseline that embarrasses the accuracy',
              desc: 'A model that never flags anything gets TN = 960, FN = 40, and accuracy = 960/1000 = 0.96 — identical to your model. By accuracy, the two are indistinguishable; by recall, yours catches 30 frauds the baseline never will. Accuracy was measuring the class balance, not the model.',
            },
            {
              title: '(d) The cost line decides',
              desc: 'Your model: 10 misses x Rs 10,000 + 30 false flags x Rs 500 = Rs 1,00,000 + Rs 15,000 = Rs 1,15,000. Never-flag baseline: 40 misses x Rs 10,000 + 0 = Rs 4,00,000. The model saves Rs 2,85,000 per 1,000 transactions while posting the same accuracy. That sentence — not the 96% — is the business case.',
            },
          ],
          solution:
            'Matrix: TP 30, FP 30, FN 10, TN 930. Precision 0.50, recall 0.75, F1 0.60, accuracy 0.96 — exactly the baseline accuracy of 0.96. Cost: model Rs 1,15,000 vs baseline Rs 4,00,000, so the model wins by Rs 2,85,000. The lesson in one line: pick the metric whose denominator maps to your cost, prove it beats a baseline, and show the matrix so nobody can hide behind one number.',
        },
        practice: {
          title: 'Price a different pair of errors',
          prompt:
            'Take any binary problem with known counts (or invent 500 rows: 50 positives). Compute the confusion matrix, precision, recall and F1 at the default threshold. Now write explicit costs C_FP and C_FN for your domain and compute total cost. Move one prediction from TP to FN (imagine recall dropped) and one from TN to FP, and watch which metric and which cost react more. Which metric would you defend to your stakeholder, and why?',
          hint: 'Precision reacts to FP only; recall reacts to FN only; F1 moves when either side collapses; the cost line moves with whichever price you set higher.',
        },
        mistakes: [
          {
            mistake: 'Optimising accuracy on imbalanced data',
            fix: 'Print the dummy baseline next to it. If the gain is under the noise, the model has learned the class prior and nothing else.',
          },
          {
            mistake: 'Confusing the denominators of precision and recall',
            fix: 'Precision is over *predicted* positives; recall is over *actual* positives. Say the sentence out loud with your own numbers before quoting either.',
          },
          {
            mistake: 'Defaulting to F1 when you can actually price the errors',
            fix: 'F1 encodes an unstated symmetry between FP and FN. If you can write C_FP and C_FN, minimise expected cost at a chosen threshold instead — it is the metric of record, with F1 as a summary.',
          },
          {
            mistake: 'Quoting a single F1 for a multiclass problem without stating the averaging',
            fix: 'Say macro (rare classes count), weighted (support-weighted) or micro (pooled; equals accuracy in single-label settings). Macro with per-class rows is the default honest report.',
          },
          {
            mistake: 'Reporting metrics at an undeclared 0.5 threshold as if they were properties of the model',
            fix: 'Precision, recall and F1 all move with the threshold. State the threshold (or show the curve) — the model ranks; the threshold decides; the cost sets the threshold.',
          },
        ],
        exam: {
          question:
            'A model on 1,000 rows (40 positives) flags 60, of which 30 are true positives. Give the confusion matrix, precision, recall and F1. Now state, in one sentence each, when you would choose precision as the primary metric, when you would choose recall, and why accuracy fails here.',
          answer:
            'TP = 30, FP = 30, FN = 10, TN = 930. Precision = 30/60 = 0.50; recall = 30/40 = 0.75; F1 = 2(0.5)(0.75)/(0.5+0.75) = 0.60. Choose precision as primary when a false alarm is the expensive mistake (fraud alerts, spam quarantine, pushing content to a user) — the denominator is your alarm queue, and you are buying a clean queue. Choose recall when a miss is the expensive mistake (disease screening, security threats, compliance checks) — the denominator is the population of real cases, and you are buying coverage. Accuracy fails here because the majority class is 96%: a never-flag model scores 0.96, identical to this model, so accuracy measures the class balance rather than the learned behaviour. Rule: metric follows the cost line; every reported number comes with its baseline and its confusion matrix.',
          source: 'Evergreen placement/GATE-style evaluation question (matrix arithmetic + metric choice).',
        },
        summary: [
          'The confusion matrix is four cells — TP, FP, FN, TN — and every classification metric is arithmetic on them.',
          'Precision = TP/(TP+FP) is about alarm quality; recall = TP/(TP+FN) is about coverage; F1 is their harmonic mean and punishes one-sided models.',
          'Price the mistakes first: C_FN·FN + C_FP·FP decides whether you buy precision or recall; F1 is the fallback when you cannot price them.',
          'Accuracy only fits when classes are balanced and the two errors cost the same — always print the majority baseline beside it.',
          'State pos_label and the averaging (macro/weighted/micro) for multiclass; state the threshold for every number.',
          'Report (metric, baseline, confusion matrix) as one unit — any of them alone can be made to look good.',
        ],
      }),
      [
        [
          'Precision is computed as:',
          [
            'TP / (TP + FN)',
            'TP / (TP + FP)',
            '(TP + TN) / total',
            'TP / (TP + FN + FP)',
          ],
          1,
          "Precision's denominator is everything the model predicted positive — it measures how clean the alarm queue is.",
        ],
        [
          'A screening test must not miss any real case, even at the cost of extra follow-ups. The primary metric should be:',
          ['Precision', 'Recall (sensitivity)', 'Accuracy', 'Specificity'],
          1,
          'A miss (FN) is the expensive error here, so coverage of actual positives — recall — is what you optimise.',
        ],
        [
          'A dataset is 99% negative. A model predicting "negative" for everything scores 99% accuracy. This shows that:',
          [
            'Accuracy is always the wrong metric',
            'Accuracy must be read against a majority-class baseline; here the model added nothing',
            'The dataset must be cleaned before training',
            'The model is well calibrated',
          ],
          1,
          'The score equals the trivial baseline, so accuracy reported the class balance, not any learned signal.',
        ],
        [
          'Precision = 0.90 and recall = 0.10. The F1 score is closest to:',
          ['0.50', '0.45', '0.18', '0.90'],
          2,
          'F1 = 2(0.9)(0.1)/(1.0) = 0.18/1.0 = 0.18 — the harmonic mean drags toward the weaker side, exposing the one-sided model.',
        ],
      ]
    ),
    lesson(
      M6,
      'mlf-6-2',
      62,
      'ROC-AUC vs PR-AUC: Ranking Quality When the Positive Class Is Rare',
      'What threshold-free metrics really measure, why a beautiful ROC curve can hide a useless precision number on 1%-positive data, and how to pick the operating threshold from cost.',
      20,
      nineBlocks({
        objectives: [
          'Interpret ROC-AUC as the probability that a random positive outranks a random negative',
          'Compute precision from an FPR/recall pair on an imbalanced dataset and explain why the ROC plot flatters it',
          'State the random baseline for ROC-AUC and for PR-AUC under a given class prevalence',
          'Select a deployment threshold from an explicit cost or capacity constraint rather than defaulting to 0.5',
        ],
        hook:
          'The demo curve is gorgeous: hugs the top-left corner, area under the curve 0.97. The stakeholder deploys it, then discovers that at the recall the business needs, three of every four fraud alerts are false. Nothing lied — the ROC curve simply answered a different question than the one being asked. ROC-AUC measures ranking quality across all thresholds while weighting the false-positive rate against the whole negative class, and on a 1:100 problem the whole negative class is a very forgiving audience. This lesson teaches you to read both curves, know which one your class balance makes honest, and to never confuse a good curve with a good operating point.',
        concept: `**Scores, thresholds, labels.** A classifier usually emits a *score* (probability or margin), not a final label. The threshold converts one to the other, and every threshold produces one pair of rates: true positive rate (recall) and false positive rate, FPR = FP/(FP+TN). Sweep the threshold from "flag everything" to "flag nothing" and you trace the **ROC curve**: TPR against FPR. Start at (0,0) (threshold so high nothing is flagged) and end at (1,1) (everything flagged). The **ROC-AUC** is the area under that curve, and its cleanest interpretation is probabilistic: *the chance that a randomly chosen positive example receives a higher score than a randomly chosen negative one*. Random guessing gives 0.50 (the diagonal), perfect ranking gives 1.0, and — a favourite interview line — an AUC of 0.90 means: pick one fraud and one legitimate transaction at random; the model ranks the fraud higher 90% of the time. Because it is built from ranking, ROC-AUC ignores the threshold entirely: it measures the model's ordering ability, and only the ordering.

**Why ROC flatters imbalance.** The FPR denominator is the *actual negatives*. With 10,000 negatives and 100 positives, a 1% FPR is 100 false alarms — a queue that will drown any team — yet on the ROC plane that operating point sits at (0.01, 0.80), visually indistinguishable from perfection. Translate it into precision (the question the business asks): catching 80 of 100 positives with 99 false alarms gives precision = 80/(80+99) ≈ 0.45. Good-looking curve, barely half the alerts real. The **precision-recall curve** plots precision against recall across thresholds and refuses to hide this, because precision's denominator includes the false alarms themselves. Its baseline is the *prevalence*: a random ranker achieves average precision ≈ 100/10,100 ≈ 0.01 on that data — so an AUPRC of 0.30 is 30x random, while the same model might show ROC-AUC 0.92 that looks merely "very good" against a 0.50 baseline. The rule of thumb: **balanced problems → ROC-AUC is fine; rare positives (say under ~10%) → PR-AUC (average precision) is the metric of record, and ROC-AUC becomes a secondary sanity number.** One caveat that cuts the other way: PR-AUC changes when prevalence changes, so you may compare models on the same test set but never compare AUPRC numbers across datasets with different positive rates. In sklearn: roc_curve, auc, roc_auc_score; precision_recall_curve, average_precision_score (prefer average precision over the trapezoid on discretised PR curves — it interpolates properly).

**The operating point is a decision, not a default.** AUC summarises the whole curve, but production runs at exactly one threshold. Choose it from constraints: (1) **cost** — sweep thresholds, compute C_FN·FN + C_FP·FP at each, deploy the minimum (Lesson 6.1's arithmetic, now continuous); (2) **capacity** — "the fraud team can review 200 alerts a day" → pick the threshold whose flag count equals the budget, then report the precision and recall you get there; (3) **constraint** — "precision at least 0.60" or "recall at least 0.90" → find the threshold that satisfies the constraint with margin. All three need *calibrated* probabilities if you read the threshold as a probability; a well-ranked but miscalibrated model can be thresholded by score, but not reasoned about as risk. Calibration tools (Platt scaling, isotonic regression) and calibration curves exist for exactly this; naive Bayes and uncalibrated SVM margins are the classic offenders from Module 5. Final discipline: after choosing the threshold on validation data, freeze it, evaluate once on the test set, and report the confusion matrix *at that threshold* beside both AUCs. Curves are for comparing models; matrices are for running a business.`,
        extras: [
          table(
            'ROC-AUC vs PR-AUC',
            ['Question', 'ROC-AUC', 'PR-AUC (average precision)'],
            [
              ['What it measures', 'Ranking quality across all thresholds', 'Quality of the positive-class ranking (precision at each recall)'],
              ['Random baseline', '0.50 always', 'Equals the positive prevalence (e.g. 0.01 at 1% positives)'],
              ['Effect of class balance', 'Insensitive — FPR is normalised by negatives', 'Moves with prevalence — compare only within one dataset'],
              ['Behaviour under heavy imbalance', 'Can look excellent while alerts are mostly false', 'Stays honest: falls when false alarms dominate'],
              ['When to lead with it', 'Balanced classes, or ranking is the product (search, ads)', 'Rare positives: fraud, disease, churn, defect detection'],
            ],
          ),
          code(
            '# Both curves, both AUCs, and a cost-chosen threshold\nfrom sklearn.metrics import (roc_curve, roc_auc_score, precision_recall_curve,\n                             average_precision_score, confusion_matrix)\nimport numpy as np\n\nproba = model.predict_proba(X_test)[:, 1]\nprint(\"ROC-AUC:\", round(roc_auc_score(y_test, proba), 3))\nprint(\"AP (PR-AUC):\", round(average_precision_score(y_test, proba), 3))\nprint(\"prevalence (random PR baseline):\", round(y_test.mean(), 4))\n\nfpr, tpr, thr_roc = roc_curve(y_test, proba)\nprec, rec, thr_pr = precision_recall_curve(y_test, proba)\n\n# Operating point from cost: same sweep as Lesson 6.1, on the score axis\nC_FN, C_FP = 10000, 500\nbest = min(\n    ((t, C_FN * ((y_test == 1) & (proba < t)).sum() +\n            C_FP * ((y_test == 0) & (proba >= t)).sum())\n     for t in np.unique(proba)),\n    key=lambda x: x[1],\n)\nthr = best[0]\ny_at_thr = (proba >= thr).astype(int)\nprint(\"threshold\", round(float(thr), 3), \"cost\", best[1])\nprint(confusion_matrix(y_test, y_at_thr))   # the matrix you actually ship with',
            'roc_pr_thresholds.py',
            'python'
          ),
          warn(
            'A high AUC does not bless the deployed operating point',
            'AUC-ROC is an average over thresholds you will never run. Always report the confusion matrix at the chosen threshold — that is the only place the business lives.',
          ),
          tip(
            'Report AUPRC next to the prevalence',
            '"AP = 0.31 on 1.8% positives" is interpretable (17x random); "AP = 0.31" alone is not. The baseline travels with the number.',
          ),
        ],
        worked: {
          title: 'The same model, read through both curves',
          problem:
            'A fraud test set has 100 positives and 9,900 negatives (9,900 + 100 = 10,000). At one threshold the model catches 80 positives (recall 0.80) with an FPR of 1%. (a) Compute precision at that point. (b) Describe where the point sits on the ROC plane. (c) What are the random baselines for ROC-AUC and for average precision here? (d) The fraud team can review 150 alerts a day on this volume — is this threshold deployable?',
          steps: [
            {
              title: '(a) Precision from the FPR',
              desc: 'FP = FPR x negatives = 0.01 x 9,900 = 99. TP = 80. Precision = 80/(80 + 99) = 80/179 ≈ 0.45. Fewer than half the alerts are real fraud — an analyst rejecting 99 wasted cases a day on this slice.',
            },
            {
              title: '(b) The ROC view of the identical fact',
              desc: 'The point is (FPR = 0.01, TPR = 0.80) — in the top-left corner, visually "excellent". The ROC plane did not lie; it simply normalised the false alarms by 9,900 negatives, which makes 99 false alarms look like almost nothing.',
            },
            {
              title: '(c) Baselines',
              desc: 'ROC-AUC baseline = 0.50 (random ranking), always. Average precision baseline = prevalence = 100/10,000 = 0.01. So AP should be read as a multiple of 0.01, while ROC-AUC is read against 0.50 — two different rulers for the same model.',
            },
            {
              title: '(d) Capacity check',
              desc: 'Alerts = TP + FP = 80 + 99 = 179 per 10,000 transactions. Scale to daily volume: if 10,000 transactions arrive per day, 179 alerts exceeds a 150/day budget. Raise the threshold until alerts ≤ 150, then recompute precision and recall at that exact point and report them — capacity is a legitimate tiebreaker when cost is unknown.',
            },
          ],
          solution:
            '(a) Precision ≈ 0.45 (80/179). (b) ROC point (0.01, 0.80) — flattering by construction on rare positives. (c) Random ROC-AUC = 0.50; random AP = prevalence = 0.01. (d) 179 alerts breaches a 150/day budget — raise the threshold to fit capacity, then report P/R and the confusion matrix at that threshold. One model, two curves, one operating decision: PR for honesty under imbalance, ROC for ranking shape, cost/capacity for the threshold.',
        },
        practice: {
          title: 'Find the operating point yourself',
          prompt:
            'On any imbalanced binary dataset: fit a probabilistic model, compute ROC-AUC and average precision, and print the prevalence. Plot (or tabulate) both curves. Pick the threshold that meets precision >= 0.50 (or minimises a cost you define), and print the confusion matrix there. Note the gap between "best AUC" and "usable operating point".',
          hint: 'If AP is a large multiple of prevalence while ROC-AUC is a modest distance above 0.5, you are on imbalanced data — lead with PR.',
        },
        mistakes: [
          {
            mistake: 'Leading with ROC-AUC on a 1:100 problem',
            fix: 'Report average precision with prevalence as the baseline; keep ROC-AUC as a secondary ranking check only.',
          },
          {
            mistake: 'Comparing AUPRC numbers across datasets with different positive rates',
            fix: 'AP moves with prevalence by construction. Compare models on the same test set, or normalise against the baseline explicitly (AP / prevalence as a lift multiple).',
          },
          {
            mistake: 'Passing hard 0/1 labels instead of scores into roc_auc_score',
            fix: 'AUC on binary labels uses a single operating point and reports tie-heavy garbage (effectively one point on the curve). Feed probabilities or decision scores.',
          },
          {
            mistake: 'Choosing the threshold on the test set',
            fix: 'The threshold is a hyperparameter: choose it on validation/CV (by cost or capacity), freeze it, and touch the test set exactly once with the frozen pipeline.',
          },
          {
            mistake: 'Reading threshold 0.5 as optimal by default',
            fix: '0.5 is optimal only under calibrated probabilities and symmetric costs. With asymmetric costs or a capacity limit, the optimal threshold is almost never 0.5.',
          },
        ],
        exam: {
          question:
            'Define ROC-AUC probabilistically. A test set is 1% positive; the model achieves TPR 0.80 at FPR 0.01. Compute the precision at that point (assume 10,000 rows), give the random baselines for both AUCs, and state which curve you would lead with and why.',
          answer:
            'ROC-AUC = P(score(positive) > score(negative)) — the probability a random positive is ranked above a random negative; 0.5 = random, 1.0 = perfect ordering; it is threshold-free and ignores calibration. Rows: 100 positives, 9,900 negatives. TP = 80; FP = 0.01 x 9,900 = 99; precision = 80/179 ≈ 0.45. Baselines: ROC-AUC random = 0.50; PR-AUC random = prevalence = 0.01 (so AP 0.30 would be 30x random). Lead with the precision-recall curve / average precision: at this prevalence the ROC plane normalises false alarms by 9,900 negatives and makes 99 wasted reviews look negligible, while precision exposes that fewer than half the alerts are real. ROC-AUC stays useful as a threshold-free ranking sanity check; the deployed threshold is then chosen by cost or alert-queue capacity, and the shipped confusion matrix is reported at that threshold.',
          source: 'Standard evaluation interview question (AUC interpretation + imbalance arithmetic).',
        },
        summary: [
          'ROC-AUC = the probability a random positive outranks a random negative; it measures ranking, not the deployed decision.',
          'FPR is normalised by the negative class, so ROC curves flatter rare-positive problems; precision includes false alarms and does not.',
          'Random baselines: ROC-AUC 0.50 always; PR-AUC equals prevalence — always quote it with the positive rate.',
          'Lead with PR-AUC under heavy imbalance; compare AUPRC only within one dataset.',
          'The threshold is chosen by cost, capacity or a precision/recall constraint — on validation, never on test.',
          'Ship the confusion matrix at the frozen threshold next to the AUCs; curves compare models, matrices run businesses.',
        ],
      }),
      [
        [
          'ROC-AUC is most precisely interpreted as:',
          [
            'The fraction of predictions that are correct at threshold 0.5',
            'The probability that a randomly chosen positive example scores higher than a randomly chosen negative one',
            'The recall achieved at 90% precision',
            'The area of the confusion matrix that is correct',
          ],
          1,
          'It is a ranking probability over all thresholds: 0.5 is random ordering, 1.0 is perfect ordering.',
        ],
        [
          'On data with 1% positives, a random ranker achieves an average precision of approximately:',
          ['0.50', '0.99', '0.01', '1.00'],
          2,
          'The PR baseline equals prevalence: with 1% positives, a random ordering averages about 0.01 precision across recall levels.',
        ],
        [
          'Your model shows ROC-AUC 0.97 but, at the recall you need, only 35% of alerts are real. The best explanation is:',
          [
            'The AUC was computed incorrectly',
            'ROC normalises false positives by the huge negative class, so rare-positive problems flatter ROC while precision exposes the false-alarm load',
            'ROC-AUC always implies precision above 0.90',
            'The model is miscalibrated, so the curve is invalid',
          ],
          1,
          'FPR = FP/(FP+TN): with thousands of negatives, dozens of false alarms still look tiny on the ROC plane. The PR curve shows the same operating point honestly.',
        ],
        [
          'The threshold used in production should be selected:',
          [
            'Always at 0.5, because that is the default',
            'On validation data by minimising expected cost or meeting a capacity/constraint target, then frozen before the test set is touched',
            'On the test set, to maximise test F1',
            'At the threshold where the ROC curve is closest to the corner',
          ],
          1,
          'The threshold is a tuned decision variable tied to cost or capacity; tuning it on test data leaks the test set.',
        ],
      ]
    ),
    lesson(
      M6,
      'mlf-6-3',
      63,
      'Regression Metrics: MAE, MSE, RMSE and MAPE (and When Each One Lies)',
      'Four numbers for continuous predictions — their arithmetic, their units, their tolerance for outliers, and the honest reason a business prefers one over another.',
      20,
      nineBlocks({
        objectives: [
          'Compute MAE, MSE, RMSE and MAPE by hand from four predictions and interpret each in plain English',
          'Explain why RMSE is always at least MAE and what a large gap between them signals',
          'Identify the failure modes of MAPE (zeros, near-zeros, asymmetry) and propose a guarded alternative',
          'Choose the primary regression metric from the stakeholder loss function and compare against a mean baseline',
        ],
        hook:
          'Two teams report their demand-forecasting model. Team A: "MAE 42 units — we are off by 42 boxes on average." Team B: "RMSE 61 units." Same model? Neither can say until they agree on what an error costs. If every missed box costs the same, the average absolute error is the price. If a single huge miss shuts a factory line, the squared error — which charges quadratically for disasters — is the price. And if the CFO asks "what error percentage are we talking about?", someone is about to say MAPE and quietly divide by a near-zero target. Regression metrics look like four ways of computing "how wrong"; they are four different opinions about which wrongness matters.',
        concept: `**Four formulas, four opinions about what an error is.** Let eᵢ = yᵢ − ŷᵢ be the residuals on your test set. **MAE** = mean|eᵢ| — the average mistake, in the target's own units; every error counts linearly, so a 10-unit miss costs exactly ten times a 1-unit miss and one catastrophe cannot drown out the rest. **MSE** = mean eᵢ² — units are *squared* (rupees squared, kilograms squared), which makes it a great optimisation target (smooth and differentiable everywhere) and a terrible slide statistic; its real message is that it charges quadratically, so a single 100-unit miss outweighs a hundred 10-unit misses. **RMSE** = √MSE — the same verdict with the units restored, which is why it is the default headline number; it always satisfies RMSE ≥ MAE (the root-mean of |e| is never below the mean of |e|), it sits between MAE and the largest error, and for roughly Gaussian errors it lands near 1.25 × MAE. That ratio is a diagnostic: **RMSE far above MAE means a small number of huge errors is driving your score** — go look at those rows before you trust either number. **MAPE** = mean(|eᵢ|/|yᵢ|) × 100 — unitless and instantly readable ("we are off by 5% on average"), which is exactly why finance teams ask for it, and exactly why it needs guards.

**Where MAPE lies.** Three failure modes, each worth a sentence in any report that uses it. (1) **Zeros and near-zeros**: y = 0 makes the term undefined; y = 12 makes an ordinary 30-unit error a 250% error — MAPE is dominated by whichever targets happen to be small, not by whichever predictions are worst. (2) **Asymmetry**: with non-negative predictions, under-prediction can never exceed 100% (ŷ ≥ 0 caps |e|/y at 1) while over-prediction is unbounded — so optimising MAPE systematically pushes forecasts *low*. (3) **Equal weight on unequal targets**: a 2-unit error on a target of 4 scores the same as a 200-unit error on a target of 400, which is rarely the economics. Guardrails: exclude or floor near-zero targets explicitly; use **WAPE** = Σ|eᵢ| / Σ|yᵢ| (aggregate error over aggregate volume — stable, weights big targets as the business does); or use a **symmetric MAPE** variant with its own caveats. And when the two directions genuinely cost differently (an unsold coat versus a stockout, in retail), no symmetric metric is right: use **quantile (pinball) loss** — pinball(y, ŷ_q, q) penalises under- and over-shoot by q and 1−q — and pick q from the cost ratio. Under asymmetric cost, the *model* changes too: you are now fitting the cost-optimal quantile, not the mean.

**Choosing from the stakeholder's loss, and the baseline that anchors it.** The decision procedure: (1) write the cost of an error as a function of its size and direction; (2) pick the metric whose sensitivity curve matches it — roughly linear → MAE; quadratic/disaster-averse → RMSE; proportional/percentage → WAPE or guarded MAPE; directional → pinball; (3) always report a second view (MAE + RMSE together; MAPE + WAPE together) so outliers and target-mix effects are visible; (4) compare against **DummyRegressor(strategy="mean" or "median")** on the same split — a model that does not beat the mean predictor has learned nothing, whatever R² says; (5) state R² only as "variance explained relative to the mean baseline on this dataset" — it can be negative, and it is meaningless to compare across datasets with different y-spread, because the denominator (variance of y) changed. Numbers on a slide should be in units the stakeholder owns: "RMSE ₹1.4 lakh" beats "MSE 1.96e10".`,
        extras: [
          table(
            'Regression metrics at a glance',
            ['Metric', 'Formula shape', 'Units', 'Outlier sensitivity', 'Main trap', 'Use when'],
            [
              ['MAE', 'mean |y − ŷ|', 'Target units', 'Low (linear)', 'Blind to which rows are catastrophic', 'Symmetric cost; noisy labels; report the honest average'],
              ['MSE', 'mean (y − ŷ)²', 'Squared target units', 'Very high (quadratic)', 'Unreadable units; dominated by worst row', 'Optimisation loss inside training'],
              ['RMSE', '√MSE', 'Target units', 'High', 'Looks like MAE but punishes tails', 'Large misses are disproportionately bad'],
              ['MAPE', 'mean |y − ŷ| / |y|', 'Percent', 'High on small targets', 'Explodes near y = 0; asymmetric', 'Targets strictly positive and well away from zero'],
              ['WAPE', 'Σ|y − ŷ| / Σ|y|', 'Percent', 'Weighted by volume', 'Hides per-item fairness', 'Percentage reporting with stable denominators'],
              ['Median AE', 'median |y − ŷ|', 'Target units', 'Ignores the tails entirely', 'May hide real risk', 'When a few wild rows wreck the mean'],
            ],
          ),
          code(
            '# All four metrics, the baseline, and the outlier share of MSE\nfrom sklearn.metrics import mean_absolute_error, mean_squared_error\nfrom sklearn.dummy import DummyRegressor\nimport numpy as np\n\ny_true = np.array([100.0, 200.0, 300.0, 400.0])\ny_pred = np.array([110.0, 180.0, 330.0, 520.0])\n\nmae = mean_absolute_error(y_true, y_pred)\nrmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))\nwape = np.abs(y_true - y_pred).sum() / np.abs(y_true).sum() * 100\n# guarded MAPE: skip (or floor) targets near zero instead of dividing by them\nmask = np.abs(y_true) > 1e-9\nmape = np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100\nprint(f\"MAE={mae:.1f} RMSE={rmse:.2f} MAPE={mape:.1f}% WAPE={wape:.1f}%\")\n\n# Baseline on the SAME split — the number your model must beat\ndummy = DummyRegressor(strategy=\"mean\").fit(y_true.reshape(-1, 1), y_true)\ny_base = dummy.predict(y_true.reshape(-1, 1))\nprint(\"mean-baseline MAE:\", mean_absolute_error(y_true, y_base))\n\n# Which row is driving MSE?\nsq = (y_true - y_pred) ** 2\nprint(\"share of MSE from worst row:\", round(float(sq.max() / sq.sum()) * 100, 1), \"%\")\n\n# Asymmetric cost -> quantile (pinball) loss at q = cost-implied quantile\nfrom sklearn.metrics import mean_pinball_loss\nprint(\"pinball@0.7:\", mean_pinball_loss(y_true, y_pred, alpha=0.7))',
            'regression_metrics.py',
            'python'
          ),
          warn(
            'MAPE on targets containing zero (or near-zero) values is not a metric, it is a division error',
            'One y = 0 makes it infinite; small y values dominate the average. Report WAPE (or MAE in units) and state the exclusion rule if you must use a percentage.',
          ),
          tip(
            'Always report one robust and one tail-sensitive metric together',
            'MAE + RMSE tells the reader the typical miss and whether a few rows are exploding; MAPE + WAPE does the same for percentages. Two numbers, one paragraph of honest diagnosis.',
          ),
        ],
        worked: {
          title: 'Four metrics by hand, plus the mean baseline and the MSE hog',
          problem:
            'Actual demand [100, 200, 300, 400]; predictions [110, 180, 330, 520]. Compute MAE, MSE, RMSE and MAPE. Then compute the mean baseline MAE, and report what share of MSE the single worst error contributes.',
          steps: [
            {
              title: 'The residuals',
              desc: 'e = ŷ − y = +10, −20, +30, +120. Absolute errors: 10, 20, 30, 120. Squared errors: 100, 400, 900, 14,400.',
            },
            {
              title: 'MAE, MSE, RMSE',
              desc: 'MAE = (10 + 20 + 30 + 120)/4 = 180/4 = 45. MSE = (100 + 400 + 900 + 14,400)/4 = 15,800/4 = 3,950. RMSE = √3,950 ≈ 62.8 — in target units, and about 1.4x the MAE (a healthy-but-visible outlier pull).',
            },
            {
              title: 'MAPE',
              desc: 'Per-row: 10/100 = 10%, 20/200 = 10%, 30/300 = 10%, 120/400 = 30%. MAPE = (10 + 10 + 10 + 30)/4 = 15%. Note the pattern: MAPE is happy here only because no target is near zero — move the last actual to 4 and the same error becomes 3,000%.',
            },
            {
              title: 'Baseline and the MSE hog',
              desc: 'Mean baseline: predicted 250 on every row → |errors| = 150, 50, 50, 150 → baseline MAE = 400/4 = 100. The model (45) beats it by 55 — real skill, not target luck. MSE share from the worst row: 14,400/15,800 = 91%. One prediction out of four explains 91% of RMSE — if you fix or explain that row, the headline moves; that is exactly what "RMSE ≫ MAE" was telling you.',
            },
          ],
          solution:
            'MAE = 45, MSE = 3,950, RMSE ≈ 62.8, MAPE = 15%. Mean baseline MAE = 100, so the model has genuine skill (45 vs 100). The worst row contributes 91% of MSE — report MAE and RMSE together and inspect that row, because the tail, not the typical case, is currently writing your headline number.',
        },
        practice: {
          title: 'Compute, compare, diagnose',
          prompt:
            'On any regression dataset (boston-style, housing, or demand data): split once, fit a linear model and a tree model, and report MAE, RMSE, MAPE (guarded for zeros) and WAPE for both — plus DummyRegressor mean/median baselines on the same split. Write two sentences: which model wins on MAE vs RMSE, and what the RMSE/MAE ratio implies about outliers in this dataset.',
          hint: 'If the tree wins RMSE but ties MAE, it is cleaning up tail errors; if MAPE and WAPE disagree wildly, small targets are distorting MAPE.',
        },
        mistakes: [
          {
            mistake: 'Quoting MSE (or a squared-unit number) to a stakeholder',
            fix: 'Report RMSE or MAE in target units — "off by 45 boxes", not "MSE 3,950 boxes squared". Keep MSE where it belongs: inside the loss.',
          },
          {
            mistake: 'Using MAPE on data with zeros, near-zeros, or heavy small-value rows',
            fix: 'Switch to WAPE or MAE, or state and enforce an exclusion/floor rule. Never let one y ≈ 0 row write the report.',
          },
          {
            mistake: 'Reporting R² as if it were accuracy, or comparing it across datasets',
            fix: 'R² is improvement over the mean baseline on THIS dataset (can be negative; denominator is that dataset\'s variance). Quote it with the baseline metric, never alone or across different y-spreads.',
          },
          {
            mistake: 'Picking RMSE because it is the default, without checking the cost shape',
            fix: 'RMSE encodes "big errors are quadratically worse". If the business feels errors linearly, MAE is the true number; if directionally, pinball at the cost-implied quantile. State the loss you are optimising.',
          },
          {
            mistake: 'Comparing models without a mean/median baseline on the same split',
            fix: 'DummyRegressor takes one line. If your model does not beat it by more than split noise, the problem is the target or the features — not the algorithm.',
          },
        ],
        exam: {
          question:
            'Compute MAE, RMSE and MAPE for actual [100, 200, 300, 400] and predicted [110, 180, 330, 520]. State what a large RMSE/MAE gap signals, two reasons MAPE is dangerous here, and which metric you would choose if over-forecasting cost half as much as under-forecasting.',
          answer:
            'Errors: +10, −20, +30, +120. MAE = 180/4 = 45. MSE = 15,800/4 = 3,950 → RMSE ≈ 62.8. MAPE = (10% + 10% + 10% + 30%)/4 = 15%. RMSE/MAE ≈ 1.4 — a large gap means the squared-error tail dominates: the worst row alone is 14,400/15,800 = 91% of MSE, so a few catastrophic predictions drive the headline. MAPE dangers: (1) division by zero/near-zero targets makes it undefined or dominated by tiny rows (here every target happens to be large, which is luck, not safety); (2) it is asymmetric — under-prediction is capped at 100% while over-prediction is unbounded, so minimising MAPE biases forecasts low. With under-forecasting costing twice as much as over-forecasting, neither symmetric metric fits: use quantile (pinball) loss at the quantile implied by the cost ratio (q = C_under/(C_under + C_over) in the standard formulation), or equivalently a cost-weighted absolute error — and report MAE alongside it for comparability. Anchor everything to a mean-baseline DummyRegressor on the same split.',
          source: 'Standard regression-metrics exam question (hand computation + metric choice under asymmetric cost).',
        },
        summary: [
          'MAE = typical miss in target units (linear cost); MSE = squared units, quadratic cost, training-loss territory; RMSE = MSE in readable units.',
          'RMSE ≥ MAE always — a wide gap means a few huge errors dominate; inspect them before trusting either number.',
          'MAPE reads well but explodes near zero targets, weights small rows equally, and biases toward under-prediction; WAPE is the stable percentage.',
          'Asymmetric costs → quantile (pinball) loss at the cost-implied quantile; symmetric costs → MAE (linear) or RMSE (disaster-averse).',
          'Report two views (MAE+RMSE or MAPE+WAPE) plus the mean/median baseline on the same split.',
          'R² is relative to that dataset\'s variance — never a cross-dataset leaderboard number, never "accuracy".',
        ],
      }),
      [
        [
          'RMSE is always greater than or equal to MAE, and a large gap between them indicates:',
          [
            'A bug in the metric implementation',
            'A small number of very large errors driving the squared-error total',
            'That the model is underfitting',
            'That the target is not normally distributed',
          ],
          1,
          'Squaring charges the tail quadratically; RMSE reacts to catastrophes while MAE averages them linearly. The gap is your outlier alarm.',
        ],
        [
          'Actual [100, 200, 300], predicted [110, 180, 360]. The RMSE is closest to:',
          ['30', '37', '1367', '45'],
          1,
          'Errors 10, −20, 60 → squares 100, 400, 3600 → mean 1366.7 → RMSE = sqrt(1366.7) ≈ 37.0 (MAE would be 30).',
        ],
        [
          'Your demand dataset contains many days with target = 0. The metric you should NOT lead with is:',
          ['MAE', 'WAPE', 'MAPE', 'RMSE'],
          2,
          'MAPE divides by the actual value — zeros make it undefined and near-zeros dominate the average. Use WAPE (or MAE in units) instead.',
        ],
        [
          'Over-stocking costs Rs 50 per unit, stockouts cost Rs 150 per unit. The defensible primary metric is:',
          [
            'Plain RMSE — it handles asymmetry automatically',
            'MAPE, because percentages handle cost differences',
            'Quantile (pinball) loss at the quantile implied by the cost ratio, or a cost-weighted error',
            'Accuracy of the sign of the error',
          ],
          2,
          'Symmetric metrics treat both directions equally; an asymmetric cost line maps to a specific quantile, which pinball loss optimises directly.',
        ],
      ]
    ),
    lesson(
      M6,
      'mlf-6-4',
      64,
      'Cross-Validation and Baselines: Earning the Right to Report a Number',
      'k-fold, stratified, grouped and time-ordered splits; why every learned preprocessing step belongs inside the fold; and the trivial models your number is judged against.',
      22,
      nineBlocks({
        objectives: [
          'Explain why a single holdout score is a noisy estimate and compute mean and spread across k folds by hand',
          'Choose between plain k-fold, stratified, grouped and time-ordered splits given a dataset\'s structure',
          'Prevent cross-validation leakage by placing all fitted preprocessing inside a Pipeline within the folds',
          'Compare a model against a dummy baseline and decide whether the gain exceeds fold noise',
        ],
        hook:
          'The dataset has 1,200 rows. You split 80/20 once and get 0.87. Your classmate splits the same data differently and gets 0.81. Both of you are about to argue about algorithms. Neither has established that 0.87 and 0.81 are even different numbers — with one holdout, the score depends on which rows happened to land where, and the difference could be pure luck. Worse, the winner who never measured a baseline cannot tell you whether 0.87 means anything: if always predicting the majority class scores 0.86, the entire exercise added one point. Evaluation has exactly two jobs — estimate performance with a spread, and compare against the obvious alternative — and this lesson is the discipline that does both.',
        concept: `**Why one holdout is not an estimate.** A single 20% test split answers "how did this particular model do on these particular 240 rows?" — and that answer moves when rows move. With small data the sampling noise of one split is routinely several accuracy points, which is larger than most of the improvements you will fight for. **k-fold cross-validation** replaces luck with structure: shuffle (when legitimate), cut the data into k equal folds; for each of k rounds, train on k−1 folds and score the held-out fold; report the mean across folds — and, just as important, the spread. Every row serves as test data exactly once; each round still trains on (k−1)/k of the data, so the estimate slightly *understates* the final model (trained on all data) — a small, known bias you accept in exchange for much lower variance. k = 5 or 10 are the standards: smaller k (2–3) trains on less data per round (more bias, cheaper); very large k (leave-one-out) trains n times, correlates the folds badly, and has famously high variance for little gain. Cross-validation creates no new information — it is a better *measurement instrument*, not more data. And it has a price: with P hyperparameter configurations and k folds, the search costs k·P fits — budget it before you start (Lesson 7.3 makes this arithmetic central).

**Match the split to the structure of the data.** Plain KFold with shuffling assumes rows are independent and identically distributed. Three violations, three different splitters. (1) **Rare classes**: with 1% positives, unstratified folds can contain zero or a handful of positives — recall becomes undefined or wild. StratifiedKFold keeps each fold's class proportions aligned with the dataset's (in classification, the default you should reach for). (2) **Groups**: if a patient contributes 20 records, a user leaves 50 sessions, or near-duplicate documents from one source are scattered across rows, random folds put the *same entity* in train and test. The model half-recognises the entity, scores soar, and the number describes memorisation, not generalisation. GroupKFold (and StratifiedGroupKFold when you also need class balance) keeps every member of a group on one side. (3) **Time**: future rows in training to predict the past is time travel. Use TimeSeriesSplit or an explicit cut date, always training on the past and testing on what follows. Random k-fold on time-ordered data mixes market regimes together and routinely overstates future performance by points — the same data-mixing instinct that will hide drift in Module 9. Rule of thumb: shuffle only for genuinely i.i.d. data; everything else has a splitter that respects its dependence structure.

**Leakage lives or dies inside the pipeline.** Any preprocessing that *learns from data* — imputation statistics, scalers, PCA, feature selection, target encoding, oversampling like SMOTE — must be fit on the training folds only. The classic leak: StandardScaler().fit_transform(X) on the whole dataset *before* cross-validation, so every fold\'s held-out rows already influenced the mean and variance the model trained with. The leak is small for a scaler on clean data and enormous for feature selection or target encoding, but the principle is identical: evaluation must mimic deployment, where you will never have statistics computed from the future. The fix is mechanical: put every step in a Pipeline and cross_validate the pipeline, so scikit-learn refits each step on each training fold and applies it untouched to that fold\'s test rows. The same rule settles the oversampling debate — SMOTE before splitting leaks synthetic examples of test rows; SMOTE inside an imblearn Pipeline inside the folds is correct. Finally, if you *tune* hyperparameters on cross-validation and then report that same cross-validated score as your result, you have selected your number the way you selected your model: optimistically. The honest options are nested CV (inner loop tunes, outer loop estimates) or a fixed validation for tuning plus a sealed test set touched exactly once.

**Baselines: the other half of the report.** Every reported metric needs a comparison point: **DummyClassifier** (most_frequent, stratified, or prior-proportional) and **DummyRegressor** (mean or median) establish what the algorithm must beat; a *domain* baseline is often harder still — persistence ("tomorrow equals today" for time series), last year\'s value, the current rules engine, or simple heuristics your operations team already trusts. A useful framing is the skill score: skill = (model − baseline) / (perfect − baseline) — it says what fraction of the available improvement you captured, on the metric\'s own scale. The reporting discipline, in one line: metric with mean ± spread across folds, split scheme (k, shuffle?, stratify?, group column?), pipeline statement, and the baseline — *together*. If the model\'s edge over baseline is smaller than the fold spread, you do not have a result; you have noise with a model attached, and the honest next move is better features or better labels, not a bigger algorithm. That sentence is the spine of every honest evaluation you will ever write.`,
        extras: [
          table(
            'Split strategies and the failure each prevents',
            ['Situation', 'Splitter', 'Prevents'],
            [
              ['Balanced i.i.d. rows', 'KFold (shuffled) or train/test with a fixed seed', 'Score depending on one lucky holdout'],
              ['Imbalanced classes', 'StratifiedKFold / stratified split', 'Folds with zero (or a handful of) positives — undefined or wild metrics'],
              ['Repeated entities (patients, users, devices, duplicate docs)', 'GroupKFold / StratifiedGroupKFold / GroupShuffleSplit', 'Entity recognition across the split — memorisation scored as generalisation'],
              ['Time-ordered data', 'TimeSeriesSplit / explicit date cut, train-on-past', 'Time travel: training on the future to predict the past'],
              ['Tuning + one honest number', 'Nested CV, or validation for tuning + sealed test', 'Reporting the best-of-many CV score as the result'],
            ],
          ),
          code(
            '# Leakage-safe CV against a dummy baseline, mean +/- spread\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.impute import SimpleImputer\nfrom sklearn.model_selection import cross_validate, StratifiedKFold, GroupKFold\nfrom sklearn.dummy import DummyClassifier, DummyClassifier as Dummy\nfrom sklearn.ensemble import RandomForestClassifier\n\npipe = Pipeline([\n    (\"impute\", SimpleImputer(strategy=\"median\")),  # fit INSIDE each fold\n    (\"scale\", StandardScaler()),                   # same — inside the pipeline\n    (\"model\", RandomForestClassifier(n_estimators=300, random_state=0)),\n])\n\ncv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)\nres = cross_validate(pipe, X, y, cv=cv, scoring=[\"accuracy\", \"average_precision\"],\n                     return_train_score=True)\nprint(\"val acc: %.3f +/- %.3f\" % (res[\"test_accuracy\"].mean(),\n                                  res[\"test_accuracy\"].std()))\nprint(\"val AP : %.3f +/- %.3f\" % (res[\"test_average_precision\"].mean(),\n                                  res[\"test_average_precision\"].std()))\n\n# Baseline on the SAME folds — the bar to clear\ndummy = Dummy(strategy=\"stratified\", random_state=0)\nbase = cross_validate(dummy, X, y, cv=cv, scoring=\"accuracy\")\nprint(\"dummy  : %.3f +/- %.3f\" % (base[\"test_score\"].mean(), base[\"test_score\"].std()))\n\n# Grouped data: same entity never on both sides\n# groups = df[\"patient_id\"].values\n# gcv = GroupKFold(n_splits=5)\n# cross_validate(pipe, X, y, groups=groups, cv=gcv, scoring=\"accuracy\")',
            'cv_baseline.py',
            'python'
          ),
          warn(
            'Fitting scaler/selector/SMOTE before CV is leakage',
            'Held-out rows must be invisible to anything that learns. Only transformations that touch training-fold rows may run — which means everything learned lives inside the Pipeline.',
          ),
          tip(
            'One line, four facts: metric, spread, scheme, baseline',
            '"Accuracy 0.85 +/- 0.03, 5-fold stratified CV, preprocessing inside folds, dummy 0.62." That sentence is a defensible result; "accuracy 0.87" is not.',
          ),
        ],
        worked: {
          title: 'Mean and spread by hand, a group leak in the wild, and the budget of a search',
          problem:
            '(a) Five stratified folds give accuracies [0.86, 0.83, 0.88, 0.81, 0.87] with a majority-class baseline of 0.62. Compute mean and standard deviation and judge the result. (b) The data is 1,000 rows from 50 patients (20 records each). Random 5-fold CV scores 0.95; GroupKFold by patient scores 0.71. Explain. (c) You plan to grid-search 20 hyperparameter configurations with 5 folds — how many fits, and what must you not report?',
          steps: [
            {
              title: '(a) Mean and spread',
              desc: 'Mean = (0.86 + 0.83 + 0.88 + 0.81 + 0.87)/5 = 4.25/5 = 0.85. Deviations: +0.01, −0.02, +0.03, −0.04, +0.02; variance ≈ 0.0034/5 = 0.00068 → sd ≈ 0.026, so report 0.85 ± 0.03. Against the 0.62 baseline the gap is +0.23 — nearly eight times the spread. Verdict: real skill, confidently reported.',
            },
            {
              title: '(b) The group leak',
              desc: 'With random folds, each patient\'s 20 records are spread across train and test — the model can key off patient-specific fingerprints (stable vitals, device quirks, phrasing) and effectively recognise the person. 0.95 measures recall of identities. GroupKFold holds all 20 records of each patient on one side, forcing the model to generalise to unseen people: 0.71 is the deployment number. The 24-point difference was entirely memorisation dressed as evaluation.',
            },
            {
              title: '(c) The search budget and the forbidden report',
              desc: 'Fits = 20 configs x 5 folds = 100 training runs (plus the final refit on all data). What you must not do: pick the best config and quote its mean CV score as your final result — that number was maximised over 20 candidates and is optimistic (best-of-N selection; Lesson 7.4 quantifies the inflation). Use inner CV for selection and an outer loop or a sealed holdout for the number you publish.',
            },
          ],
          solution:
            '(a) 0.85 ± 0.03 vs baseline 0.62 — gain of 0.23, far beyond fold noise: report it as such. (b) 0.95 was entity memorisation; GroupKFold by patient gives the honest 0.71. (c) 100 fits, and never report the winning config\'s selection CV score as the result — nest it or confirm on a sealed holdout. Evaluation is a protocol, not a number: structure-aware splits, learned steps inside the folds, spread reported, baseline attached.',
        },
        practice: {
          title: 'Run the defensible evaluation',
          prompt:
            'On one dataset: (1) build a Pipeline with imputation + scaling + model; (2) run 5-fold StratifiedKFold cross_validate printing mean and std; (3) run the same folds with a dummy baseline; (4) if your data has any grouping or time structure, redo it with GroupKFold or a date split and compare. Write the one-line result statement for each — scheme, spread, baseline included.',
          hint: 'If grouped/time CV scores much lower than random CV, your original number was measuring structure in the rows, not generalisation — that gap is the most valuable number you produced.',
        },
        mistakes: [
          {
            mistake: 'Fitting preprocessing (scaler, selector, encoder, SMOTE) on the full dataset before CV',
            fix: 'Pipeline everything and cross_validate the pipeline — each fold\'s held-out rows then stay unseen by every learned step.',
          },
          {
            mistake: 'Random k-fold on grouped or time-ordered data',
            fix: 'GroupKFold for repeated entities, TimeSeriesSplit/date cuts for time. Match the splitter to the dependence structure, or the score describes memorisation or time travel.',
          },
          {
            mistake: 'Tuning on cross-validation and reporting that same CV score as the result',
            fix: 'Nested CV, or tune on a validation split and evaluate once on a sealed test set. A score maximised over many candidates is a biased estimate by construction.',
          },
          {
            mistake: 'Reporting the mean without the spread, or the best fold',
            fix: 'mean ± std across folds, every time; best-fold is selection noise. The spread is what tells your reader whether two models differ at all.',
          },
          {
            mistake: 'Skipping the baseline because the number "looks good"',
            fix: 'DummyClassifier/DummyRegressor on identical folds is one line. No baseline, no claim — 0.87 means nothing next to an unknown 0.86.',
          },
        ],
        exam: {
          question:
            'You must evaluate a classifier on 2,000 rows with 3% positives, repeated records for 60 users, and hyperparameters to tune. Specify your evaluation protocol: splitter, k, pipeline discipline, baseline, tuning strategy, and exactly what single number you would report.',
          answer:
            'Splitter: StratifiedGroupKFold (5 folds) with the user id as group — stratification keeps ~3% positives present in every fold; grouping stops the model recognising a user\'s own records across the split. Pipeline: imputation/encoding/scaling (and any resampling — SMOTE only inside an imblearn Pipeline) fit inside each training fold, so fold test rows stay unseen. Baseline: DummyClassifier(strategy="stratified") (and most_frequent for accuracy context) evaluated on the identical folds. Tuning: inner cross-validation inside each outer training fold (nested CV), or a dedicated validation split — never the outer score used for selection. Report: outer-CV mean ± std for the primary metric with its baseline beside it, e.g. "AP 0.31 ± 0.04 (5-fold stratified-group CV), prevalence 0.03, dummy AP 0.03"; refit the chosen configuration on all available training data, and only if a sealed test split exists, quote its single frozen-threshold confusion matrix once. In one sentence: structure-aware splits, learned steps inside folds, spread and baseline attached, selection separated from estimation.',
          source: 'Classic evaluation-protocol design question (splitter choice + leakage + baseline) in ML interviews.',
        },
        summary: [
          'One holdout is noisy; k-fold gives a mean and a spread by rotating the held-out fold — every row tested exactly once.',
          'Match the splitter: stratified for rare classes, grouped for repeated entities, time-ordered for temporal data; shuffle only i.i.d. data.',
          'Everything that learns (imputer, scaler, selector, encoder, SMOTE) lives inside a Pipeline fitted within the folds — otherwise CV leaks.',
          'Tuning on CV and reporting the same CV score is selection bias; nest the loops or seal a holdout.',
          'No baseline, no claim: DummyClassifier/DummyRegressor on identical folds, plus any domain baseline worth beating.',
          'The report format: metric ± spread, split scheme, pipeline statement, baseline — all four together or the number is not defensible.',
        ],
      }),
      [
        [
          'StratifiedKFold is preferred over plain KFold when:',
          [
            'The dataset has many features',
            'Class proportions differ strongly between classes, so every fold must preserve the class balance',
            'Rows are grouped by patient',
            'The data is time-ordered',
          ],
          1,
          'Without stratification, rare classes can vanish from a fold entirely, making the metric undefined or wildly unstable.',
        ],
        [
          '20 records exist for each of 50 patients. Random k-fold yields 0.95 while GroupKFold by patient yields 0.71. The best interpretation is:',
          [
            'GroupKFold is buggy',
            'Random folds let the model recognise each patient\'s own records across train/test — 0.95 measured memorisation; 0.71 is the honest estimate',
            'The model needs more trees',
            '71% is below chance',
          ],
          1,
          'Entity overlap across the split inflates scores; groups must stay on one side for the number to describe generalisation to new patients.',
        ],
        [
          'You run StandardScaler().fit_transform on the whole dataset before cross-validation. The consequence is:',
          [
            'None — scaling is deterministic',
            'Fold test rows leak into the training statistics through the global mean/variance, so CV is optimistic; fit the scaler inside a Pipeline per fold',
            'The scaler crashes',
            'Training becomes faster',
          ],
          1,
          'Any learned statistic must come from the training fold only; the pipeline refits each step per fold automatically.',
        ],
        [
          'Model CV accuracy is 0.84 ± 0.03; the stratified dummy baseline is 0.83 ± 0.02. The honest conclusion is:',
          [
            'Ship it — 0.84 is high',
            'The model has essentially no skill over the trivial baseline; improve features/labels or reframe the target before adding complexity',
            'Increase k to 50',
            'Report the best fold instead',
          ],
          1,
          'The 0.01 gain sits inside the noise band. A model must beat its baseline by more than the spread to justify existing.',
        ],
      ]
    ),
  ],
};
