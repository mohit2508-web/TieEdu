// Module 9 — ML in Production: Drift, Monitoring, Fairness and Restraint
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, code } from '../nineBlocks';
import { lesson, M9, COURSE_ID } from './helpers';

export const module9: CourseModule = {
  id: M9,
  course_id: COURSE_ID,
  title: 'Module 9 — ML in Production: Drift, Monitoring, Fairness and Restraint',
  summary:
    'What happens after deployment: telling covariate shift, prior shift and concept drift apart with PSI arithmetic and a root-cause-first playbook; monitoring the layers labels cannot answer daily (data quality, score distributions, training-serving skew, slices); fairness as competing harm definitions that cannot all hold when base rates differ; and the judgement call of choosing rules over models with human review designed and measured instead of assumed.',
  sort_order: 9,
  lessons: [
    lesson(
      M9,
      'mlf-9-1',
      91,
      'Drift: Detecting When the World Changed Under Your Model',
      'Three different things called drift, the PSI computation that quantifies a distribution shift on four bins, and a root-cause-first playbook that stops you retraining on a bug.',
      21,
      nineBlocks({
        objectives: [
          'Classify a given shift as covariate, prior/label or concept drift and name what stays unchanged in each',
          'Compute PSI by hand from binned training and current percentages and interpret it against the 0.10 and 0.25 thresholds',
          'Diagnose the cause of a performance drop before choosing between rebaselining, retraining and rebuilding',
          'Design monitoring for delayed labels using input and score distributions as interim signals',
        ],
        hook:
          'A credit-risk model held 0.84 AUC for two years. In March it slid to 0.76. The team\'s instinct was to retrain that evening. One engineer asked a different question first: which features moved, and when did they start moving? The answer: a partner app changed its income field from monthly to yearly figures on 2 March - every income feature suddenly multiplied by about twelve, and no amount of retraining on that feed would have helped, because the data was wrong, not the relationship. The fix was one line in the ingestion pipeline and a validation rule. Drift monitoring that skips root cause is a machine for retraining on garbage faster.',
        concept: `**Three shifts, three different repairs.** Drift is not one phenomenon, and each type demands a different response. **Covariate shift:** the input distribution P(X) changes while the relationship P(Y|X) stays the same - a new device mix, a marketing channel that brings different customers, income fields multiplied by twelve. The model is still correct in principle; the data it sees moved. **Prior (label) shift:** P(Y) changes while P(X|Y) is stable - the fraud rate doubles overnight because a new attack campaign starts; features of fraud still look like fraud, but fraud is now commoner, so every probability the model outputs needs recalibration (the posterior must be adjusted for the new base rate, not relearned). **Concept drift:** P(Y|X) itself changes - the same features now lead to a different outcome. Customers learn the routing rules, sensors age, competitors respond; yesterday\'s mapping is genuinely obsolete and only new training data repairs it. A fourth, benign category is **recurring/seasonal change** - the same pattern every December - which calls for seasonality-aware baselines, not a retrain that half-learns last Christmas. The type determines the fix: wrong data means fix the pipeline, prior shift means recalibrate, concept drift means retrain, seasonality means model the calendar.

**PSI: the cheap numeric alarm.** Population Stability Index compares a binned distribution now against the training distribution: PSI = sum over bins of (actual share - expected share) x ln(actual share / expected share). Procedure: take the training sample of a feature or the model\'s training-time scores, cut it into 10 equal-frequency bins (deciles), apply those same edges to the current window, compute each bin\'s share in both, and sum. Read it against the working thresholds: below 0.10 = stable; 0.10 to 0.25 = moderate, investigate; above 0.25 = significant shift, act. PSI is one number per feature or for the score vector, so you can watch hundreds cheaply, and the bin-by-bin table tells you *where* the mass moved (which is the first clue to cause). Its limits: it needs enough rows per bin (clip tiny shares to avoid division blow-ups), it says nothing about whether the shift *matters* to performance, and it fires on both real drift and pipeline bugs - which is exactly why it is a trigger for diagnosis, never a trigger for blind retraining. Companion tests: the Kolmogorov-Smirnov statistic for a single continuous feature (statistically sharp - so sharp that with a million rows it flags trivial differences; pair every p-value with an effect size), and simple null-rate or category-share alarms for categorical columns.

**The playbook: confirm, localise, classify, then act.** (1) **Confirm it is real** - is the shift in the data or in the *data pipeline*? Check schema, null rates, units, timezones, joins; a surprising PSI on one feature almost always localises there. (2) **Localise** - which features moved, since when, correlated with which release, region or campaign? Plot PSI or means over time to find the change point. (3) **Classify** using the three-shift table above: P(X) moved with stable relationship = covariate (fix source or retrain with the corrected feed); only the base rate moved = recalibrate thresholds and expected volumes; relationship broke = concept drift, retrain; calendar-driven = seasonality. (4) **Act and validate** - retrain on a time-ordered window (never random-shuffle splits across time), evaluate on the most recent sealed period, deploy behind a canary or shadow mode against the incumbent, and keep the old model ready to roll back. (5) **Close the loop** - add the failed check to monitoring so the same cause alarms within days next time.

**Monitoring while labels are late.** Many outcomes arrive weeks or months after the prediction (defaults, churn, clinical results), so accuracy cannot be your daily alarm. Use the cheap proxies: PSI or KS on the features and on the **score distribution** (if scores shift, either X moved or the world moved - either way look), data-quality rates (nulls, unseen categories, range violations), and volume anomalies. Beware **early-label bias**: retraining on only the labels that have arrived so far trains on outcomes that were easier or faster to resolve (approved loans default later than rejected ones are never observed), which quietly distorts the target - wait for matured labels or model the censoring explicitly. The daily dashboard is therefore mostly *input* health; the *performance* panels light up on label cadence, and the gap between them is where the playbook runs.`,
        extras: [
          table(
            'The three shifts - what moves, what stays, what fixes it',
            ['Drift type', 'What changes', 'What stays', 'First repair'],
            [
              ['Covariate shift', 'P(X) - inputs move', 'P(Y|X) - the relationship', 'Fix the source if wrong; otherwise retrain on current data'],
              ['Prior / label shift', 'P(Y) - base rate moves', 'P(X|Y) - class-conditional features', 'Recalibrate probabilities and thresholds; retrain only if prolonged'],
              ['Concept drift', 'P(Y|X) - the relationship itself', 'P(X) may be fine', 'Retrain on recent, time-ordered data; revalidate features'],
              ['Recurring / seasonal', 'P(X), P(Y) cyclically', 'The cycle itself', 'Seasonal baselines and calendar features - not repeated retraining'],
            ],
          ),
          code(
            '# PSI: score distribution now vs at training, plus the verdict band\ndef psi(expected, actual, bins=10):\n    edges = np.quantile(expected, np.linspace(0, 1, bins + 1))  # TRAINING edges\n    edges[0], edges[-1] = -np.inf, np.inf\n    e = np.histogram(expected, edges)[0] / len(expected)\n    a = np.histogram(actual, edges)[0] / len(actual)\n    e, a = np.clip(e, 1e-4, None), np.clip(a, 1e-4, None)       # no divide by zero\n    return float(np.sum((a - e) * np.log(a / e)))\n\nfor window, name in zip(weekly_scores, [\"w4\", \"w8\", \"w12\"]):\n    s = psi(train_scores, window)\n    verdict = \"stable\" if s < 0.10 else (\"investigate\" if s < 0.25 else \"major shift\")\n    print(name, round(s, 3), verdict)\n\n# A high PSI on ONE feature is a localisation clue, not a retraining order.\n# Confirm the pipeline, find the change point, classify the shift, THEN act.',
            'psi_monitor.py',
            'python'
          ),
          warn(
            'Retraining without a root cause entrenches the bug',
            'Most sudden "drift" incidents are ingestion faults - units, timezones, joins, schema changes. Confirm the data is valid first; retraining on a broken feed teaches the model the breakage is correct.',
          ),
          tip(
            'Watch the score distribution daily, performance on label cadence',
            'Scores are available the moment predictions are made: PSI on scores is your interim alarm while labels are weeks away. Performance panels then confirm or clear the alarm when outcomes mature.',
          ),
        ],
        worked: {
          title: 'PSI by hand: a window that fails the 0.25 test',
          problem:
            'A model was trained when its score distribution was uniform across four quartile bins: 25%, 25%, 25%, 25%. In the current window the same bins hold 7%, 15%, 28% and 50%. (a) Compute PSI with the standard formula. (b) Give the verdict against the 0.10 / 0.25 thresholds. (c) Name two very different real-world causes consistent with this number and the first check for each. (d) State what you would NOT do purely because of this PSI value.',
          steps: [
            {
              title: '(a) The four terms',
              desc: 'PSI = sum (actual - expected) x ln(actual / expected). Bin 1: (0.07 - 0.25) x ln(0.07/0.25) = (-0.18) x (-1.2730) = 0.2291. Bin 2: (0.15 - 0.25) x ln(0.60) = (-0.10) x (-0.5108) = 0.0511. Bin 3: (0.28 - 0.25) x ln(1.12) = 0.03 x 0.1133 = 0.0034. Bin 4: (0.50 - 0.25) x ln(2.00) = 0.25 x 0.6931 = 0.1733.',
            },
            {
              title: '(b) Sum and verdict',
              desc: 'PSI = 0.2291 + 0.0511 + 0.0034 + 0.1733 = 0.4569, about 0.46. That is above 0.25, so the shift is significant: the monitoring rule says act - diagnose now, not "watch and wait". Note where the mass went: the top bin nearly doubled while the bottom bin shrank, so scores moved upward as a whole.',
            },
            {
              title: '(c) Two causes, two first checks',
              desc: 'Cause 1: pipeline fault - a unit change, a broken join dropping a predictive column, or leakage entering the feed. First check: null rates, schema, value ranges, and per-feature PSI to see if one feature drives the score move. Cause 2: real world - a seasonal campaign, a new customer segment from a marketing push, or genuine concept change. First check: correlate the change point with releases and campaign calendars, and compare input PSI against performance once labels mature.',
            },
            {
              title: '(d) What not to do',
              desc: 'Do not retrain tonight on this evidence alone. PSI says a distribution moved, nothing about why or whether accuracy suffered; retraining on a broken feed legitimises the breakage, and retraining on a seasonal spike teaches the model that December is the new normal. Confirm, localise, classify - then apply the matching repair (fix source, recalibrate, retrain on time-ordered data, or add seasonality).',
            },
          ],
          solution:
            'PSI = 0.2291 + 0.0511 + 0.0034 + 0.1733 = 0.4569 (about 0.46) - well above the 0.25 significance threshold, driven by the top bin doubling and the bottom bin collapsing. Possible causes: ingestion fault (check schema, nulls, per-feature PSI first) or genuine shift (correlate the change point with releases and campaigns, then confirm with matured performance). The wrong response is blind retraining: PSI triggers diagnosis, and the repair follows the shift classification - fix the source, recalibrate, retrain on time-ordered data, or model the season.',
        },
        practice: {
          title: 'Localise a shift with per-feature PSI',
          prompt:
            'Take two windows of your own data (or a synthetic time split) and compute PSI per feature plus PSI on the model scores. Rank features by PSI. For the top two, write the change point you observe (the first window where it jumps), one plausible pipeline cause and one plausible real-world cause. Only if you cannot find a pipeline cause, define the retraining window you would use and the time-ordered validation split you would evaluate on.',
          hint: 'One feature dominating score PSI points at that feature\'s feed; a synchronized jump across many features points at a pipeline-wide event (schema, timezone, join) or a genuine regime change - the breadth of the jump is the diagnostic.',
        },
        mistakes: [
          {
            mistake: 'Retraining the moment any PSI crosses 0.25',
            fix: 'PSI is a diagnosis trigger: confirm the feed is valid, localise the feature and change point, classify the shift, then choose the matching repair (fix / recalibrate / retrain / seasonality).',
          },
          {
            mistake: 'Calling every performance drop concept drift',
            fix: 'Check the three-shift table first: covariate shift and pipeline faults look identical to concept drift in a headline metric but need no retraining at all - they need the source corrected.',
          },
          {
            mistake: 'Shuffling time into the train/validation split when retraining after drift',
            fix: 'Random splits mix the future into the past and score the model on a world it had already seen. Split by time and seal the most recent period as the evaluation.',
          },
          {
            mistake: 'Retraining on partially matured labels',
            fix: 'Early labels are biased (fast-resolving outcomes over-represented). Wait for maturity or model the censoring; otherwise the new model learns a distorted target.',
          },
          {
            mistake: 'Treating a tiny p-value from a KS test as proof of material drift',
            fix: 'With large n, KS flags negligible differences. Always pair statistical tests with an effect size (PSI, mean shift) and with whether performance or the decision boundary actually moved.',
          },
        ],
        exam: {
          question:
            'Distinguish covariate shift, prior shift and concept drift, stating for each what changes, what stays stable and the appropriate first repair. Then compute PSI for bin shares (training 25/25/25/25 vs current 7/15/28/50) and give the verdict, plus the first three steps of your incident playbook.',
          answer:
            'Covariate shift: P(X) changes while P(Y|X) is stable - inputs moved but the relationship still holds; first repair is fixing the source if the data is wrong, otherwise retraining on current data (probabilities usually remain calibrated). Prior/label shift: P(Y) (the base rate) changes while P(X|Y) is stable - first repair is recalibrating probabilities and re-tuning thresholds for the new base rate. Concept drift: P(Y|X) changes - the relationship itself is obsolete; repair is retraining on recent time-ordered data with feature re-examination. PSI: (0.07-0.25)ln(0.28) + (0.15-0.25)ln(0.60) + (0.28-0.25)ln(1.12) + (0.50-0.25)ln(2) = 0.2291 + 0.0511 + 0.0034 + 0.1733 = 0.4569 (about 0.46) - above 0.25, significant shift. Playbook: (1) confirm the data is valid (schema, nulls, units, joins - pipeline faults mimic drift), (2) localise which features moved and find the change point in time, (3) classify the shift with the table and apply only that repair, validating on a sealed time-ordered holdout with the incumbent kept for rollback.',
          source: 'Evergreen MLOps exam question (drift taxonomy + PSI arithmetic).',
        },
        summary: [
          'Covariate shift moves P(X); prior shift moves P(Y); concept drift moves P(Y|X) - the repair is different for each (fix source, recalibrate, retrain).',
          'PSI = sum (actual share - expected share) x ln(actual/expected) over training-defined bins; below 0.10 stable, 0.10-0.25 investigate, above 0.25 act.',
          'PSI fires on bugs as easily as on real drift - confirm the feed, localise the feature, find the change point, then classify before repairing.',
          'Retrain on time-ordered windows with a sealed recent holdout; never shuffle time, never retrain on immature labels.',
          'While labels are late, monitor features and score distributions daily - performance panels confirm on the label cadence.',
        ],
      }),
      [
        [
          'P(X) is unchanged, P(X|Y) is unchanged, but P(Y) has doubled after a fraud campaign. This is:',
          [
            'Concept drift',
            'Prior (label) shift - repair by recalibrating probabilities and thresholds for the new base rate',
            'Covariate shift',
            'Data leakage',
          ],
          1,
          'Only the base rate moved; class-conditional feature distributions are stable, so Bayes-conditional probabilities shift by a constant factor - recalibration is the repair, not full retraining.',
        ],
        [
          'PSI for a feature comes out at 0.46 against training-defined bins. The correct action is:',
          [
            'Ignore it - only accuracy matters',
            'Treat it as a significant shift (> 0.25): diagnose the cause (pipeline vs real world), classify the shift, then apply the matching repair',
            'Delete the feature immediately',
            'Retrain on the current window before investigating',
          ],
          1,
          '0.46 exceeds the 0.25 significance threshold, so act - but "act" means diagnose and classify first; retraining before root-causing risks entrenching an ingestion bug.',
        ],
        [
          'PSI is computed by:',
          [
            'Comparing model accuracy this month with accuracy last month',
            'Binning the training sample (e.g. deciles), applying those same edges to the current window, and summing (actual share - expected share) x ln(actual/expected) across bins',
            'Measuring the correlation between features and the target in both windows',
            'Counting the number of categories that disappeared',
          ],
          1,
          'PSI compares binned distributions using training-defined edges: the sum over bins of (a - e) x ln(a/e). Bins must come from training so the comparison has a fixed reference.',
        ],
        [
          'A seasonal business repeats the same December pattern every year and the model alerts every December. Best response:',
          [
            'Retrain every December on the latest data',
            'Treat it as recurring drift: add calendar/season features and seasonal baselines so the pattern is expected rather than relearned',
            'Raise the PSI threshold above 0.25 permanently',
            'Retrain monthly year-round',
          ],
          1,
          'Recurring change is structure, not deterioration: a seasonal baseline or calendar feature makes December predictable, whereas repeated retraining spends cycles half-learning the same cycle and risks forgetting the rest of the year.',
        ],
      ]
    ),
    lesson(
      M9,
      'mlf-9-2',
      92,
      'Monitoring in Production: Slices, Skew and the Metrics You Can Actually See',
      'The layered monitoring stack that works when labels are weeks late, the slice arithmetic that proves one overall number can hide a collapse, and the training-serving skew check that catches silent feature bugs.',
      20,
      nineBlocks({
        objectives: [
          'Lay out the monitoring layers (data quality, distributions, scores, ops, performance, slices) and state what each can and cannot tell you',
          'Reproduce the slice-collapse arithmetic showing how an overall metric hides a failing subgroup',
          'Define training-serving skew and design a backfill test that detects it',
          'Design an alerting setup with thresholds, owners and runbooks that survives contact with the on-call team',
        ],
        hook:
          'A fraud model reported 0.90 accuracy all quarter while it was quietly failing one segment: 98% of traffic came from a healthy slice scoring 0.91, and 2% of traffic - a new merchant category - scored 0.55. The overall number never moved, because a weighted average of 0.98 x 0.91 and 0.02 x 0.55 is 0.90, close enough to last quarter to pass every review. The failure was visible for months in a table nobody plotted. Monitoring a model with one global number is monitoring the average of your success and your failure, and hoping the success is bigger.',
        concept: `**A stack of layers, because no single metric can see everything.** Production monitoring is not one graph; it is layers that fail independently. **Layer 1 - data quality:** schema changes, null rates, range violations, unseen categories, value frequencies (cheapest, catches the ingestion bugs that cause most incidents). **Layer 2 - input distributions:** PSI or KS per feature against training - did the world of inputs move? **Layer 3 - score/output distribution:** the model\'s own predictions over time; a shift here with stable inputs means the model is amplifying small input moves, and a shift with unstable inputs localises the cause. **Layer 4 - operations:** latency percentiles (p95, p99 - averages hide the tail users feel), error rates, throughput, timeouts, dependency health. **Layer 5 - performance:** accuracy, AUC, calibration, business metrics - *once labels arrive*, on their cadence, always with a baseline period. **Layer 6 - slices:** the same performance metrics cut by the segments that matter. Layers 1-4 run continuously on every prediction; layer 5 runs when truth matures; layer 6 runs forever, because that is where failures hide.

**Slice monitoring: the arithmetic of hiding.** An overall metric is a weighted average over slices: 0.98 x 0.91 + 0.02 x 0.55 = 0.8918 + 0.0110 = 0.9028, reported as 0.90 - indistinguishable from a healthy 0.90 while a slice sat at 0.55. The fix is procedural, not clever: (1) choose slices **in advance** - region, device, plan, channel, language, price band, new-vs-existing, any group with a different harm story - because slices discovered after a failure are always the wrong ones for the next failure; (2) set a **floor** (minimum acceptable metric per slice) and a **gap rule** (slice more than, say, 10 points below overall triggers an incident); (3) respect **sample size** - a slice with 40 rows cannot support a claim (use confidence intervals or pool until n is meaningful; a 55% on n = 40 has a wide interval), and state n next to every slice number; (4) monitor the **volume** of each slice too - a slice disappearing is itself an alarm (an upstream partner stopped sending that traffic). Slice metrics are also where fairness (next lesson), region outages and season effects surface - one panel, many alarms.

**Training-serving skew: the silent one.** The model validates at 0.92 offline and scores badly online, with identical inputs "in spirit". Skew means the features the model sees at serving differ from the features it learned from - different code paths (offline SQL vs online feature service), timezones or window boundaries computed differently, aggregations that include the future offline but only the past online (point-in-time violation), preprocessing fitted separately, or the training table joining a table that the online system cannot reach. It produces no data-quality alarm, because every value is plausible. Two tests catch it: **backfill** - take training rows with known features, re-compute them through the *serving* pipeline, and diff column by column (any mismatch is skew), and **canary comparison** - run the new model in shadow, compare its scores with the old model\'s on identical traffic and investigate systematic divergence. Prevention: one shared feature definition used by both paths (feature store or generated code), point-in-time joins by construction, and a freshness SLA per feature.

**Alerts that do not train people to ignore them.** Every alert needs a threshold with rationale, an owner, and a runbook saying what to check in the first ten minutes; otherwise alerts are noise with a siren. Separate **pages** (wake someone: error rate, score collapse, data quality hard-fail) from **tickets** (business hours: PSI drift, slice gap, volume dip). Use hysteresis and multi-window rules (two consecutive bad windows) so a single noisy hour does not wake anyone, and review alert precision monthly: if the team cannot remember the last alert that mattered, the thresholds have already failed. Also monitor the monitor: dead dashboards, stale pipelines and unsent alerts are the most common outage of monitoring itself - a weekly synthetic alarm tests the whole chain.`,
        extras: [
          table(
            'Monitoring layers: what each one can and cannot answer',
            ['Layer', 'Signals', 'Cadence', 'Answers'],
            [
              ['Data quality', 'Schema, nulls, ranges, unseen categories', 'Every batch / stream', 'Is the feed valid right now?'],
              ['Input distributions', 'PSI or KS per feature vs training', 'Daily', 'Did the input world move, and where?'],
              ['Score distribution', 'PSI on predicted probabilities', 'Daily', 'Did the model\'s output regime move?'],
              ['Operations', 'p95/p99 latency, errors, throughput', 'Continuous', 'Can users get answers at all?'],
              ['Performance', 'AUC, accuracy, calibration, business KPI', 'Label cadence', 'Is it still right?'],
              ['Slices', 'Performance and volume per segment', 'Label cadence + volume daily', 'Who is it failing for, hidden by the average?'],
            ],
          ),
          code(
            '# Slice panel + the arithmetic that hides failures\nimport numpy as np\nimport pandas as pd\n\n# overall accuracy is a weighted average - the weights hide the tail\nsl = df.groupby(\"segment\").apply(\n    lambda g: pd.Series({\"n\": len(g), \"acc\": (g.pred == g.y).mean()}))\noverall = float((sl[\"n\"] * sl[\"acc\"]).sum() / sl[\"n\"].sum())\nsl[\"gap\"] = overall - sl[\"acc\"]\nprint(\"overall:\", round(overall, 3))\nprint(sl.sort_values(\"acc\").head())\n\nFLOOR, GAP = 0.75, 0.10                       # set BEFORE the failure\nbad = sl[(sl[\"acc\"] < FLOOR) | (sl[\"gap\"] > GAP)]\nfor seg, row in bad.iterrows():\n    acc, n = row[\"acc\"], int(row[\"n\"])\n    if n >= 100:                           # n too small = no claim\n        page(f\"slice {seg}: acc {acc:.2f} n {n}\")\n\n# volume disappearing is an alarm too\nif sl[\"n\"].min() < 0.5 * sl[\"n\"].median():\n    ticket(\"a segment lost more than half its traffic - check upstream\")',
            'slice_monitor.py',
            'python'
          ),
          warn(
            'Backfill-test your features before trusting a live score',
            'Offline and online feature code drifts apart silently: different SQL, windows, timezones, preprocessing. Recompute training rows through the serving path and diff - any mismatch is skew that no data-quality alarm will ever catch.',
          ),
          tip(
            'Set slice floors and gap rules before the first incident',
            'Slices discovered after a failure never cover the next one. Pre-register segments, floors, gap rules and minimum sample sizes, then let the panel fire without a meeting about what to look at.',
          ),
        ],
        worked: {
          title: 'The slice that the headline number ate',
          problem:
            'A classifier serves 100,000 predictions: 98,000 from segment A with 0.91 accuracy, 2,000 from segment B with 0.55 accuracy. (a) Compute the overall accuracy. (b) Explain why no weekly review would have flagged it. (c) With floors of 0.75 and a gap rule of 10 points, what should the panel have fired, and on which signals - with the sample-size caveat? (d) Segment B is a new merchant category that appeared 6 weeks ago: name the two additional panels (not accuracy) that would have caught the problem earlier, and the fix sequence.',
          steps: [
            {
              title: '(a) Overall arithmetic',
              desc: 'Overall = 0.98 x 0.91 + 0.02 x 0.55 = 0.8918 + 0.0110 = 0.9028, reported as 0.90. The 0.35 collapse in B contributes only 0.007 of the total - below the noise of any weekly comparison.',
            },
            {
              title: '(b) Why reviews missed it',
              desc: 'Reviews tracked one global number against last week: 0.90 versus 0.90, a pass. The weighted average moves by slice_size x slice_change, so a 2% slice can lose 36 points before the headline moves half a point. Averages are designed to be insensitive to exactly the thing you need to notice.',
            },
            {
              title: '(c) What the pre-registered panel fires',
              desc: 'Segment B: accuracy 0.55 < floor 0.75 (fire) and gap 0.90 - 0.55 = 0.35 > 0.10 (fire). n = 2,000 is large enough that the estimate is trustworthy - state n beside the number so nobody waves it off as noise. Segment A passes both. The panel should have paged on the floor breach and opened an incident ticket citing the gap.',
            },
            {
              title: '(d) Earlier signals and the fix sequence',
              desc: 'Panel 1: slice VOLUME over time - a new category arriving as 0 to 2% then growing is visible before any label exists. Panel 2: slice-level score distribution or input PSI (is the model confidently wrong on unseen categories? low confidence or extreme scores both localise it). Fix sequence: confirm the label quality for B (new categories often have broken labels), check training coverage (was B represented in training?), then either retrain with B, add a fallback path (route low-coverage categories to human review), or ship a category-aware feature - and add B to the pre-registered slice list permanently.',
            },
          ],
          solution:
            'Overall = 0.98 x 0.91 + 0.02 x 0.55 = 0.9028 (0.90) - a 36-point slice collapse moved the headline by 0.7 points, so weekly global reviews were blind by construction. Pre-registered panel: B breaches both the 0.75 floor (0.55) and the 10-point gap (0.35), on n = 2,000, which is solid evidence. Earlier catches without labels: slice volume trend (new category arriving) and slice score/input distributions. Then: verify labels for the new category, check training coverage, and retrain, route to human review, or add a category-aware feature - with the slice added to the permanent panel.',
        },
        practice: {
          title: 'Pre-register your slice list',
          prompt:
            'For a model you know, write the six monitoring layers as concrete checks (signal, cadence, threshold, owner) and list ten pre-registered slices with a floor and expected volume for each. Then take any historical predictions you can reconstruct, compute overall vs per-slice metrics, and report the worst gap your single-number dashboard would have hidden. Finally, describe the backfill test you would run between offline training features and an online serving path.',
          hint: 'Floors come from business harm, not from the data you happen to have; volume checks catch disappearing segments; the backfill test is recompute-and-diff of training rows through the serving pipeline.',
        },
        mistakes: [
          {
            mistake: 'Watching one overall metric and calling the model healthy',
            fix: 'Pre-register slices with floors and gap rules: a 2% slice at 0.55 leaves the headline at 0.90. Overall numbers are for trends; slices are for failure.',
          },
          {
            mistake: 'Choosing slices after the incident',
            fix: 'Post-hoc slices cover yesterday\'s failure. Fix the list from the harm map (regions, devices, plans, channels, new categories) and revisit it each quarter.',
          },
          {
            mistake: 'Judging a slice of 40 rows as a collapse (or as proof of health)',
            fix: 'Show n with every slice metric and apply a minimum-n or confidence-interval gate before firing; pool or extend the window until the estimate is meaningful.',
          },
          {
            mistake: 'Assuming offline validation proves online behaviour',
            fix: 'Training-serving skew is invisible to offline metrics: backfill training rows through the serving feature path and diff, and shadow-run models to compare score distributions on identical traffic.',
          },
          {
            mistake: 'Firing alerts with no owner, threshold rationale or runbook',
            fix: 'Pages for user-facing breakage, tickets for drift and dips, multi-window rules against noise, and a monthly precision review - unactionable alerts train the team to ignore monitoring.',
          },
        ],
        exam: {
          question:
            'A model reports overall accuracy 0.90: segment A is 98% of traffic at 0.91, segment B is 2% at 0.55. Verify the overall figure, explain why weekly reviews missed the failure, and specify the monitoring design (slices, rules, cadence, n-caveat) that would have caught it. Then define training-serving skew and give the test that detects it.',
          answer:
            'Overall = 0.98 x 0.91 + 0.02 x 0.55 = 0.8918 + 0.0110 = 0.9028 (0.90): the slice collapse contributed about 0.007, below week-to-week noise, so a global trend line never moved. Design: pre-register segment B alongside region/device/plan/channel slices with a floor (0.75) and a gap rule (slice > 10 points below overall), compute per-slice accuracy with n shown (n = 2,000 here - far past the minimum, so the 0.35 gap is real signal), fire a page on floor breach and an incident ticket on gap breach, and monitor slice VOLUME daily so a segment arriving or vaniring is caught before labels exist; performance panels run on label cadence, data-quality and score panels daily. Training-serving skew: features used at prediction time differ from the features the model trained on (different code, windows, timezones, preprocessing, or point-in-time violations). Detection: backfill - recompute training rows through the serving pipeline and diff every column - plus shadow/canary comparison of new-model vs incumbent scores on identical traffic; prevention is a single shared feature definition for both paths.',
          source: 'Interview-grade synthesis (slice arithmetic + skew testing).',
        },
        summary: [
          'Monitor in layers: data quality, input PSI, score PSI, operations, performance on label cadence, and slices - each layer answers a question the others cannot.',
          'Overall = sum of slice_size x slice_accuracy: 0.98 x 0.91 + 0.02 x 0.55 = 0.90 hides a 0.55 segment; pre-register slices, floors and gap rules with n beside every number.',
          'Slice volume is a label-free alarm: a segment shrinking or vanishing is an upstream event.',
          'Training-serving skew is silent: detect it by backfilling training rows through the serving pipeline and diffing, plus shadow comparison of scores.',
          'Alerts need thresholds, owners, runbooks and severity tiers; review alert precision or the team learns to ignore monitoring.',
        ],
      }),
      [
        [
          'Overall accuracy is 0.98 x 0.91 + 0.02 x 0.55. What is it, and what does it hide?',
          [
            '0.95; it hides nothing - the average is the truth',
            '0.90; it hides a 2% segment collapsing to 0.55, because the weighted average moves by slice share times slice change',
            '0.73; the small segment dominates',
            '0.90; but segment B cannot be at 0.55 because that would lower the average more',
          ],
          1,
          '0.8918 + 0.0110 = 0.9028. The 0.35 deficit in a 2% slice contributes only 0.007 to the headline - invisible in weekly global reviews, fatal for that segment\'s users.',
        ],
        [
          'Training-serving skew means:',
          [
            'The model was trained before it was deployed',
            'The features computed at serving time differ from the features the model trained on (different code, windows, timezones or point-in-time joins)',
            'The training set is larger than the test set',
            'Accuracy is higher offline than online by chance',
          ],
          1,
          'Skew is a systematic difference between the offline feature pipeline and the online one; it produces plausible-looking values, so no data-quality alarm fires. Backfill-and-diff detects it.',
        ],
        [
          'Labels arrive six months after prediction (loan default). What can you monitor daily?',
          [
            'Nothing until labels arrive',
            'Data quality, input distributions, score distributions and operations - performance joins when labels mature',
            'Accuracy, since it can be estimated from scores',
            'Only the p99 latency of the model server',
          ],
          1,
          'Layers 1-4 (quality, PSI, scores, ops) are label-free and continuous; performance and slice metrics light up on label cadence. Scores are the best interim proxy for the model\'s regime.',
        ],
        [
          'Your team ignores most monitoring alerts. The best structural fix is:',
          [
            'Raise every threshold until alerts stop',
            'Delete the dashboards',
            'Give each alert a threshold with rationale, an owner, a runbook and a severity tier; review alert precision monthly so only actionable signals page',
            'Add more alerts so at least some matter',
          ],
          2,
          'Alerts without action paths train people to ignore monitoring. Pages for user-facing breakage, tickets for drift, multi-window rules against noise, and a precision review keep signal and trust intact.',
        ],
      ]
    ),
    lesson(
      M9,
      'mlf-9-3',
      93,
      'Fairness: Competing Definitions, Incompatible Guarantees, Honest Trade-offs',
      'Four group metrics computed from one confusion matrix per group, the theorem that stops you promising everything, and the practice of choosing whose harm you are counting before you tune anything.',
      21,
      nineBlocks({
        objectives: [
          'Compute TPR, FPR, approval rate and PPV for two groups from a given base rate and error rates',
          'Explain why calibration and equal error rates cannot both hold when base rates differ',
          'Select a fairness metric from the harm structure of the application and defend the choice',
          'Audit a model for proxy variables and design mitigations that survive scrutiny',
        ],
        hook:
          'A lending model approves 60% of applicants in group A and 35% in group B. Three reviewers look at the same system and each finds discrimination: the demographic-parity auditor sees a 25-point approval gap; the equal-opportunity auditor sees TPRs of 0.90 versus 0.70 - good applicants in B are missed at more than twice A\'s rate; and the predictive-parity auditor notices that among approved applicants, 90% of A\'s and only 25% of B\'s actually repay. All three numbers come from the same predictions. None of the three reviewers is wrong - they are counting different harms, and the model cannot satisfy all three at once. Fairness in ML is not a metric you maximise; it is a decision about who absorbs the error.',
        concept: `**Start from the harm, not the metric.** Before any number, write down what a false positive and a false negative cost, and for whom. In credit: approving a borrower who defaults costs the lender money; rejecting a creditworthy applicant costs the applicant opportunity (and the lender profit). In medical screening: a false negative costs a patient a delayed diagnosis; a false positive costs anxiety and a follow-up test. In content moderation: a false positive silences a speaker; a false negative leaves harmful content up. Only then does a metric mean something, because each definition of fairness protects a different party.

**The metric zoo, from one confusion matrix per group.** **Demographic parity:** P(hat = 1 | group) equal across groups - selection rates match; it ignores who *deserves* the outcome and is the disparate-impact family (a ratio below 0.80, the 4/5ths rule, is a conventional legal red flag). **Equal opportunity:** TPR equal across groups - qualified members of every group get in at the same rate; it protects the *deserving* who are rejected. **Equalised odds:** TPR *and* FPR both equal - the model errs at the same rate for everyone; the strongest of the error-based guarantees. **Predictive parity:** PPV equal - a positive prediction means the same thing in every group; it protects the *recipient* of the decision from being flagged at different reliability. **Calibration:** predicted probabilities match observed frequencies within each group. **Individual fairness:** similar individuals get similar decisions regardless of group. Compute all of them from per-group confusion matrices (see the code block) and you will usually find they disagree - which is the point of the next paragraph.

**The incompatibility theorem - why you must choose.** When base rates (the true positive prevalence) differ between groups, calibration within groups and equal false-positive/false-negative rates **cannot hold simultaneously** except in degenerate cases (Chouldechova 2017; Kleinberg, Mullainathan & Raghavan 2016). Intuition: predictive parity says the score has the same meaning in both groups; equal error rates say the same threshold cuts both groups at the same operating point - with different prevalences, those two statements cannot both be true, because the same score implies different posterior risks. The practical consequence is liberating: there is no "fair setting" waiting to be found by testing more metrics. You are choosing - explicitly, in writing, with stakeholders - which error you are willing to concentrate and in whose ledger. Note the seductive non-solutions: **removing the protected attribute does not remove the effect** (proxies - postcode, occupation, device, purchase patterns - reconstruct it, and you lose the ability to measure group metrics at all, which is worse); **equal thresholds with unequal calibration** silently concentrate harm wherever the score is systematically shifted.

**Practice: measure, document, mitigate, then verify.** (1) **Measure** per-group confusion matrices, all candidate metrics, gaps with sample sizes, and intersectional cuts (group x region - single-axis audits hide within-group disparity). (2) **Document** the chosen metric and why, in the model card, including metrics deliberately not chosen. (3) **Mitigate** at the right stage: better and more representative labels (the most honest lever), rebalanced sampling, threshold selection per group (legally sensitive in many jurisdictions - involve counsel; some jurisdictions treat group-specific thresholds as discriminatory by construction), abstention or human review for low-confidence or high-stakes cases, and feature work to break proxies (remove or transform reconstructed attributes and check what remains). (4) **Verify** post-mitigation that the utility did not collapse and the gap moved as predicted - and remember the upstream question: if the *policy* (who may even apply, what counts as qualified) is discriminatory, the model merely automates it accurately; fix eligibility and label definitions first. Finally, fairness metrics are group statistics - they say nothing about any individual. Individual review, appeals and explanation are not optional extras; they are where the residual harm of every group-level guarantee gets caught.`,
        extras: [
          table(
            'One model, four fairness questions',
            ['Metric', 'Equalises', 'Protects', 'Fails to control'],
            [
              ['Demographic parity', 'Selection rate P(hat=1)', 'Group-level access / disparate impact', 'Whether the selected actually qualify'],
              ['Equal opportunity', 'TPR (recall)', 'Qualified people wrongly rejected', 'False positives among the unqualified'],
              ['Equalised odds', 'TPR and FPR', 'Both error types at once', 'Calibration when base rates differ'],
              ['Predictive parity', 'PPV (precision)', 'What a positive flag means to the recipient', 'Who gets flagged in absolute numbers'],
            ],
          ),
          code(
            '# Per-group confusion metrics: compute them all, then choose consciously\ndef group_report(y, pred, group):\n    out = {}\n    for g in sorted(set(group)):\n        m = group == g\n        tp = int(((pred == 1) & (y == 1) & m).sum())\n        fn = int(((pred == 0) & (y == 1) & m).sum())\n        fp = int(((pred == 1) & (y == 0) & m).sum())\n        tn = int(((pred == 0) & (y == 0) & m).sum())\n        out[g] = {\n            \"n\": int(m.sum()),\n            \"tpr\": tp / (tp + fn),\n            \"fpr\": fp / (fp + tn),\n            \"approval\": (tp + fp) / max(tp + fp + fn + tn, 1),\n            \"ppv\": tp / max(tp + fp, 1),\n        }\n    return out\n\nrep = group_report(y_test.values, preds, group.values)\nfor g, r in rep.items():\n    print(g, {k: round(v, 3) for k, v in r.items()})\n\nrates = [r[\"approval\"] for r in rep.values()]\ndi = min(rates) / max(rates)          # 4/5ths rule: below 0.80 = red flag\nprint(\"disparate impact ratio:\", round(di, 3))\n# Every number here is a DIFFERENT harm. Write down whose harm you count.',
            'group_fairness.py',
            'python'
          ),
          warn(
            'Dropping the protected column does not make the model blind',
            'Postcode, occupation, device and browsing patterns reconstruct it; you just lose the ability to measure group metrics. Keep the attribute for AUDITING (with governance), fix proxies and labels, and choose the error you accept - in writing.',
          ),
          tip(
            'Write the harm statement before picking the metric',
            'One paragraph: who is hurt by a false positive, who is hurt by a false negative, and which group-level guarantee you are buying with which sacrifice. That paragraph is the fairness requirement; the metric is its translation.',
          ),
        ],
        worked: {
          title: 'Two groups, one model, four incompatible verdicts',
          problem:
            'A loan model: group A approval 0.60 with TPR 0.90 and FPR 0.15; group B approval 0.35 with TPR 0.70 and FPR 0.30. (a) Recover each group\'s true base rate (share who actually repay). (b) Compute PPV among approved applicants in each group. (c) Compute the demographic-parity gap and the disparate-impact ratio, with the 4/5ths verdict. (d) Show that TPR, FPR and PPV disagree in direction across groups and explain what the incompatibility theorem says about trying to equalise all of them. (e) Which single metric would you choose for a lender, and what must the model card say?',
          steps: [
            {
              title: '(a) Base rates from the approval identity',
              desc: 'approval = TPR x p + FPR x (1 - p). Group A: 0.60 = 0.90p + 0.15(1 - p) = 0.15 + 0.75p, so p = 0.45/0.75 = 0.60. Group B: 0.35 = 0.70p + 0.30(1 - p) = 0.30 + 0.40p, so p = 0.05/0.40 = 0.125. Base rates: A = 0.60, B = 0.125 - already very different, which drives everything below.',
            },
            {
              title: '(b) Predictive value of an approval',
              desc: 'Group A: TP share = 0.90 x 0.60 = 0.54 of the group; approvals = 0.60; PPV = 0.54/0.60 = 0.90 (FP share = 0.15 x 0.40 = 0.06, checks: 0.54 + 0.06 = 0.60). Group B: TP share = 0.70 x 0.125 = 0.0875; approvals = 0.35; PPV = 0.0875/0.35 = 0.25 (FP share = 0.30 x 0.875 = 0.2625; 0.0875 + 0.2625 = 0.35, checks). An approval in group A means "90% will repay"; in group B it means "25% will repay".',
            },
            {
              title: '(c) Disparate impact',
              desc: 'Demographic-parity gap = 0.60 - 0.35 = 0.25. Disparate-impact ratio = 0.35/0.60 = 0.583, below the 0.80 (4/5ths) threshold: a red flag under US-style disparate-impact analysis regardless of intent.',
            },
            {
              title: '(d) The directions and the theorem',
              desc: 'TPR favours A (0.90 vs 0.70): B\'s good applicants are missed more. FPR favours A too (0.15 vs 0.30): B\'s bad applicants are approved at double the rate. PPV favours A overwhelmingly (0.90 vs 0.25): B\'s approvals are far less reliable. So B is worse off on every error-based measure while the approval-gap narrative suggests A is "favoured" - the metrics point in different directions because base rates (0.60 vs 0.125) differ. The incompatibility theorem says calibration/predictive parity and equal error rates cannot both hold across groups with unequal base rates, so no threshold setting can make all four numbers match; equalising TPR and FPR necessarily breaks PPV parity, and vice versa.',
            },
            {
              title: '(e) Choosing and documenting',
              desc: 'For a lender the binding harms are: creditworthy applicants wrongly rejected (FN - the fairness-of-opportunity harm) and defaults approved (FP - the prudential harm). Choose equal opportunity as the primary guarantee (equal TPR), accept that FPR and PPV will differ, and set the operating threshold from the cost of default vs lost margin. The model card must state: base rates per group, all four metrics with n, the chosen metric and the harm rationale, the metrics knowingly not equalised and why, intersectional cuts examined, mitigation applied (label quality, sampling, human review for borderline cases), and the appeal path for individual rejections.',
            },
          ],
          solution:
            'Base rates: A = 0.60, B = 0.125 (from approval = TPR x p + FPR x (1-p)). PPV: A = 0.54/0.60 = 0.90, B = 0.0875/0.35 = 0.25. Demographic gap 0.25; disparate-impact ratio 0.583 < 0.80 (flagged). TPR (0.90 vs 0.70), FPR (0.15 vs 0.30) and PPV (0.90 vs 0.25) all differ across groups and cannot all be equalised with unequal base rates - the incompatibility theorem makes that a proof, not a tuning failure. Choose by harm (equal opportunity for a lender: protect the wrongly rejected), state the sacrifice (FPR/PPV parity not achieved), and document everything in the model card with sample sizes and an appeal path.',
        },
        practice: {
          title: 'Audit a real or public dataset with the full metric set',
          prompt:
            'Using a public dataset with a sensitive attribute (e.g. Adult income, COMPAS-style, or a credit set), train a simple model and produce the per-group confusion table: TPR, FPR, approval rate, PPV, base rate, with n. Compute the demographic-parity gap and disparate-impact ratio. Then write the harm paragraph: which error hurts whom, which metric you adopt as primary, and which guarantee you are explicitly sacrificing. Check one proxy: remove the sensitive column, retrain, and show the group gap barely moved.',
          hint: 'Removing the attribute while the gap persists is the demonstration that proxies carry it - the fix lives in labels, features and thresholds, not in hiding the column you need for measurement.',
        },
        mistakes: [
          {
            mistake: 'Picking a fairness metric because it gives the smallest gap',
            fix: 'Choose the metric from the harm structure first (who is hurt by FP, who by FN), then report the gap. Metric-shopping until the number looks good is selecting on the outcome you want to defend.',
          },
          {
            mistake: 'Deleting the protected attribute and declaring the model blind',
            fix: 'Proxies reconstruct it; you have only destroyed your ability to measure group metrics. Keep the attribute under governance for auditing, and fix proxies and labels instead.',
          },
          {
            mistake: 'Promising demographic parity and calibration at the same time under unequal base rates',
            fix: 'It is provably impossible: equal error rates and within-group calibration cannot coexist when prevalences differ. Choose which guarantee you buy and record the sacrifice.',
          },
          {
            mistake: 'Auditing only one axis (gender OR region, never both)',
            fix: 'Intersectional cuts (group x region x device) expose disparities that vanish in single-axis averages. Report cells with n and pool or flag small samples.',
          },
          {
            mistake: 'Treating group metrics as sufficient justice for individuals',
            fix: 'Group guarantees say nothing about any single applicant: keep human review, reason codes and an appeal path, and feed appeal outcomes back into the audit.',
          },
        ],
        exam: {
          question:
            'Group A: approval 0.60, TPR 0.90, FPR 0.15. Group B: approval 0.35, TPR 0.70, FPR 0.30. Recover both base rates, compute PPV per group and the disparate-impact ratio, and use the results to explain why demographic parity, equal opportunity and predictive parity cannot all be satisfied here. What should the model card record?',
          answer:
            'Base rates: A: 0.60 = 0.15 + 0.75p gives p = 0.60; B: 0.35 = 0.30 + 0.40p gives p = 0.125. PPV: A = (0.90 x 0.60)/0.60 = 0.90; B = (0.70 x 0.125)/0.35 = 0.25 (check: B false approvals = 0.30 x 0.875 = 0.2625, and 0.0875 + 0.2625 = 0.35). Disparate-impact ratio = 0.35/0.60 = 0.583, below 0.80 - a red flag on demographic parity alone. The metrics conflict because base rates differ by 0.475: demographic parity demands equal selection rates (0.60 vs 0.35 today); equal opportunity demands equal TPR (0.90 vs 0.70 today); predictive parity demands equal PPV (0.90 vs 0.25 today). The incompatibility theorem (Chouldechova; Kleinberg et al.) proves that with unequal prevalence, calibration within groups and equal FPR/FNR cannot hold simultaneously - so equalising TPR/FPR will break PPV parity and vice versa; no threshold setting resolves it. The model card must record: per-group base rates, n, and all four metrics with gaps; the chosen primary metric and the harm rationale; the guarantees knowingly not met and why; mitigation steps (label quality, sampling, thresholds with legal review, human review of borderline cases); intersectional results; monitoring cadence; and the individual appeal path.',
          source: 'Interview-grade fairness question (base-rate recovery + incompatibility theorem).',
        },
        summary: [
          'Fairness starts with the harm statement: a false positive and a false negative cost different parties - the metric is just the translation.',
          'Demographic parity, equal opportunity, equalised odds and predictive parity each protect a different victim and usually disagree.',
          'With unequal base rates, calibration and equal error rates cannot coexist - choosing a metric is choosing whose error you accept, in writing.',
          'Removing the protected attribute hides the audit without removing the effect; proxies reconstruct it.',
          'Measure per-group confusion matrices with n and intersectional cuts, mitigate at labels/features/thresholds, verify utility, and keep an individual appeal path.',
        ],
      }),
      [
        [
          'Group A approval 0.60 = TPR 0.90 x p + FPR 0.15 x (1 - p). The base rate p for group A is:',
          ['0.45', '0.60', '0.75', '0.15'],
          1,
          '0.60 = 0.15 + 0.75p, so p = 0.45/0.75 = 0.60. The identity approval = TPR x p + FPR x (1 - p) recovers prevalence from observable rates.',
        ],
        [
          'With base rates of 0.60 (group A) and 0.125 (group B), which statement is TRUE?',
          [
            'All four fairness metrics can be equalised by choosing a better threshold',
            'Calibration (predictive parity) and equal TPR/FPR cannot hold simultaneously - the incompatibility result makes that a theorem, not a tuning failure',
            'Only demographic parity matters mathematically',
            'The model is fair if you drop the group column',
          ],
          1,
          'Unequal prevalence makes equal error rates and within-group calibration mutually exclusive; you must choose which guarantee to buy and document the sacrifice.',
        ],
        [
          'In lending, the primary harm of a false negative is:',
          [
            'A creditworthy applicant is rejected - equal opportunity (equal TPR) is the metric that protects them',
            'The lender loses money on a default',
            'The model latency increases',
            'The training set becomes imbalanced',
          ],
          0,
          'FN = qualified applicant turned away: the fairness-of-opportunity harm, guarded by equal TPR (equal opportunity). The lender\'s money harm is the false positive, guarded by FPR control.',
        ],
        [
          'You delete the protected attribute from training data. The likely result is:',
          [
            'The group gap disappears because the model cannot see the group',
            'The gap largely persists via proxies (postcode, occupation, device), and you have also lost the ability to measure group metrics',
            'Accuracy improves by 5 percent',
            'Calibration becomes equal across groups automatically',
          ],
          1,
          'Proxies reconstruct the attribute, so the effect survives; worse, without the column (held separately for audit) you cannot compute any group metric at all - the audit blindfold, not fairness.',
        ],
      ]
    ),
    lesson(
      M9,
      'mlf-9-4',
      94,
      'When Not to Use ML - and How to Keep a Human in the Loop on Purpose',
      'The decision table that favours three lines of rules over a model when the arithmetic says so, the payback and capacity calculation behind that decision, and human review as a designed, measured component rather than a comfort blanket.',
      21,
      nineBlocks({
        objectives: [
          'Decide between rules and ML for a given problem using data, label, scale and cost criteria',
          'Compute daily operating cost, capacity feasibility and payback period for both options',
          'Design a human-in-the-loop workflow with an abstention band, escalation path and measured combined performance',
          'Detect and measure automation bias before it turns review into rubber-stamping',
        ],
        hook:
          'A logistics team spent four months and Rs 6,00,000 building a classifier to decide which parcels get opened for inspection. The prior rule was three lines: sender never inspected before, weight over 2 kg, cross-border - open. When the model finally shipped, its precision was 0.87 against the rule\'s 0.85, inside the noise. The four months, the monitoring burden and the drift risk had been spent rediscovering logic the operations manager had written in 2019. The question "can we build a model?" had never been paired with the question "is there anything to learn that we do not already know?", and that question - not accuracy - is the real gate.',
        concept: `**The gate questions, in order.** Ask them before any modelling, because each one can end the project honestly. (1) **Is there a label?** If the outcome cannot be defined, recorded and trusted - "good service", "risky customer" with no realized outcome - there is nothing to learn from, and the project becomes opinion laundering with a probability attached. (2) **Is there signal beyond what we already encode?** If the decision is three stable rules and someone can write them, rules win: they are free to run, perfectly explainable, auditable, and they never drift. Build ML where the mapping is genuinely complex (vision, language, high-dimensional behaviour) or where the world changes too fast for hand-written logic. (3) **Is there enough data of acceptable quality?** Small n plus noisy labels plus rare positives is a guaranteed way to spend a quarter measuring noise. (4) **Is the error cost compatible with model behaviour?** Models fail softly and mysteriously; if a wrong output triggers irreversible harm with no review (autonomous dosing, irreversible financial transfers, life-safety), you need deterministic bounds or a human gate by design. (5) **Can we operate it?** Monitoring, retraining, alert response and on-call are recurring costs that exist forever - if the team has no capacity to watch it, deployment is negligence with a delay. (6) **Do we have the right to use the inputs?** Privacy, consent, regulation and reciprocity are gates too, not paperwork.

**The arithmetic that settles it: cost, capacity, payback.** Compare options on *operating* numbers, not demos. Rules cost what review costs at their flag rate; ML costs its review volume plus compute plus the recurring monitoring tax; both must fit inside the review team\'s daily capacity, because a detector that flags more than the team can investigate does not fail loudly - it fails by queue. Add the build cost and divide: payback = build cost / daily saving. Then stress-test the conclusion: if volume halves, if the review rate doubles, if monitoring costs more than modelled - does the choice still hold? The honest answer is often hybrid: ML to *rank and triage* (the model sorts the queue, humans decide) captures most of the value while keeping the human in the consequential position. And include what rules give you for free: reason codes for every decision, deterministic test coverage, and zero drift risk.

**Human-in-the-loop as a designed component.** Three deployment modes, each needing its own metrics: **model decides** (only for low-stakes, well-monitored, calibrated cases), **model proposes, human disposes** (the default for consequential decisions), and **human decides with model assist** (model ranks, explains or retrieves; human owns the call). Design the boundary explicitly with an **abstention band**: scores above 0.8 auto-decide, below 0.2 auto-decide the other way, and the middle - where the model is uncertain and the stakes are highest - routes to review. Choose the band width from review capacity (band = what the team can actually process daily), and set escalation rules (high-value cases always human regardless of score). Then **measure the combination, not the model**: run a design where you can compare human-alone, model-alone and human+model on the same held-out cases - the combined system must beat both, otherwise the human is decoration. Watch for **automation bias**: reviewers who see the model\'s verdict first tend to agree with it (overrides fall to a trickle and accuracy tracks the model exactly). Countermeasures: blind-first reviews on a random sample (verdict recorded before revealing the score), forced reason capture on overrides, periodic gold-standard cases injected to score the reviewer, and dashboards of override rate by reviewer - an override rate near zero is an alarm, not a compliment. Close the loop: every overturned decision becomes a labelled case, every review a training signal, and every model update re-tested against the human baseline before it takes more autonomy.

**Restraint is a deliverable.** The mature outcome of a scoping exercise can be "keep the rules", "ship assist-mode only", or "fix the label and re-measure in a quarter" - and shipping that recommendation with the arithmetic behind it is senior practice. The model that does not get built cannot drift, cannot discriminate, cannot wake anyone at 3 am, and cannot be wrong at Rs 4,00,000 a mistake.`,
        extras: [
          table(
            'Rules, model, or hybrid - the gate table',
            ['Question', 'Favours rules', 'Favours ML'],
            [
              ['Decision logic', 'Three stable, writable conditions', 'Complex, high-dimensional, hard to articulate'],
              ['Label', 'None, or definition disputed', 'Recorded, trusted outcomes at volume'],
              ['Data volume', 'Thin; positives rare', 'Thousands of representative examples'],
              ['Error cost', 'Irreversible, unreviewable harm', 'Reviewable, priced asymmetric errors'],
              ['Operating capacity', 'No one to monitor drift or alerts', 'On-call, monitoring and retraining staffed'],
              ['Requirements', 'Reason codes, deterministic audit', 'Pattern recognition where rules plateau'],
            ],
          ),
          code(
            '# The decision arithmetic before any model gets built\nreviews_ml, rate, run = 480, 12.50, 500   # reviews/day, Rs per review, daily run cost\nreviews_rules = 660\nbuild = 105000                            # build + validation, one-off\n\nrules_cost = reviews_rules * rate\nml_cost = reviews_ml * rate + run\nsaving = rules_cost - ml_cost\nprint(\"rules/day:\", rules_cost, \" ml/day:\", ml_cost, \" saved/day:\", saving)\nprint(\"payback days:\", build / saving)              # 105000 / 1750 = 60\nprint(\"fits capacity?\", reviews_ml <= 500, \"rules fit?\", reviews_rules <= 500)\n\n# Human-in-the-loop: the model may abstain exactly where it is weakest\np = model.predict_proba(X)[:, 1]\ndecision = np.where(p > 0.80, \"auto-approve\",\n            np.where(p < 0.20, \"auto-reject\", \"human-review\"))\nprint(\"auto share:\", round(float(np.mean(decision != \"human-review\")), 3),\n      \"queue:\", int(np.sum(decision == \"human-review\")))   # must be <= capacity',
            'rules_vs_ml.py',
            'python'
          ),
          warn(
            'An override rate near zero means reviewers have stopped reviewing',
            'Show the score first and humans converge on it within weeks (automation bias). Blind-first sample reviews, forced override reasons and gold-standard injections keep the combined system honest - and keep measuring human+model against both alone.',
          ),
          tip(
            'Band the abstention by capacity, escalate by stakes',
            'The width of the human-review band is a staffing number, not a modelling vanity: queue = band share x volume must fit daily capacity. High-value or irreversible cases go to a human regardless of score.',
          ),
        ],
        worked: {
          title: 'Rules vs ML: cost, capacity and payback in one pass',
          problem:
            'A claims desk processes 10,000 claims/day. The rules engine flags 660/day for review; a proposed ML system would flag 480/day. Each review costs Rs 12.50 of analyst time; the ML system also costs Rs 500/day to run and monitor. The review team can absorb at most 500 reviews/day. Building and validating the ML system costs Rs 1,05,000 one-off. (a) Daily cost of each option and daily saving. (b) Which option fits capacity, and what actually happens to the one that does not? (c) Payback period for ML. (d) List two findings that would flip the decision back to rules, and one architecture that hedges the bet.',
          steps: [
            {
              title: '(a) Operating cost per day',
              desc: 'Rules: 660 x 12.50 = Rs 8,250/day. ML: 480 x 12.50 + 500 = 6,000 + 500 = Rs 6,500/day. Daily saving = 8,250 - 6,500 = Rs 1,750/day.',
            },
            {
              title: '(b) Capacity feasibility',
              desc: 'Capacity is 500/day. ML needs 480 - it fits with 20 reviews of headroom. Rules need 660 - they exceed capacity by 160/day, so 160 reviews pile up every day: roughly 1,120 per week sit unreviewed, claims age past SLA, and the flag rate quietly becomes fiction (the desk starts auto-closing flags). The "cheaper" option was already failing a constraint the cost line did not show.',
            },
            {
              title: '(c) Payback',
              desc: 'Payback = build cost / daily saving = 1,05,000 / 1,750 = 60 days. Two months to recover the build, after which the ML path is Rs 1,750/day cheaper - about Rs 6.4 lakh a year at constant volume - provided monitoring does not eat the saving.',
            },
            {
              title: '(d) What flips it back, and the hedge',
              desc: 'Flip 1: no stable, trusted label for what the model is meant to predict (a disputed or unrecorded outcome means the model learns annotation habits, not truth). Flip 2: monitoring and retraining capacity does not exist, so drift would run unwatched for months - the Rs 500/day run cost becomes a person who was never hired. Flip 3 (bonus): the decision requires per-claim reason codes the model cannot produce reliably. Hedge architecture: keep the rules as the floor, use the ML score to RANK the queue (triage mode) so humans still decide every flagged case, and measure the combined system against rules-alone on a holdout; graduate to auto-decide only the band where the model demonstrably beats the review baseline.',
            },
          ],
          solution:
            '(a) Rules Rs 8,250/day; ML Rs 6,500/day (480 x 12.50 + 500); saving Rs 1,750/day. (b) ML fits 500/day capacity; rules at 660 overflow by 160/day - a queue that silently becomes SLA breach and auto-closed flags. (c) Payback = 1,05,000/1,750 = 60 days. (d) Rules win again if the label is untrustworthy, if monitoring capacity does not exist, or if reason codes are mandatory; the hedged design is ML-as-triage with humans deciding, measured against rules-alone, graduating to automation only where the evidence supports it.',
        },
        practice: {
          title: 'Run the gate on an idea you have',
          prompt:
            'Take a project idea (yours or imaginary) and answer the six gate questions in writing: label, learnable signal beyond rules, data volume, error-cost structure, operating capacity, right to use inputs. Then do the arithmetic: expected flag volume, cost per review, daily cost of rules vs ML, build cost, payback, and capacity fit at your expected volume. Finish with the deployment mode you would choose (auto / model-proposes-human-disposes / human-with-assist) and the one metric you would use to prove the combined system beats both parts alone.',
          hint: 'If any gate question fails, the deliverable is the recommendation itself - "keep the rules, fix the label, come back in a quarter" is a successful scoping outcome, not a dead project.',
        },
        mistakes: [
          {
            mistake: 'Building a model to rediscover a rule that is already written and correct',
            fix: 'Ask what the model can learn that you do not already know. If the logic fits in three lines and never changes, run the rules and spend the engineering budget elsewhere.',
          },
          {
            mistake: 'Comparing options on accuracy demos and ignoring operating cost and capacity',
            fix: 'Count review volume x cost, run cost, monitoring tax and capacity fit daily - a detector that flags more than the team can handle fails quietly through the queue.',
          },
          {
            mistake: 'Deploying irreversible, high-stakes decisions with no review path',
            fix: 'Set an abstention band and escalation rules so uncertain or high-value cases reach a human; require deterministic bounds for anything unreviewable.',
          },
          {
            mistake: 'Assuming human review adds accuracy without measuring it',
            fix: 'Measure human-alone, model-alone and human+model on the same cases; if the combination does not beat both, the reviewer is decoration (or worse, a liability).',
          },
          {
            mistake: 'Treating a near-zero override rate as reviewer quality',
            fix: 'It is automation bias: show scores blind-first on a sample, force reason codes on overrides, inject gold-standard cases and track override rates per reviewer.',
          },
        ],
        exam: {
          question:
            'State six gate questions to answer before building any model, marking which answer favours rules. Then for a desk with 660 rule-flags/day at Rs 12.50 per review versus an ML system flagging 480/day plus Rs 500/day run cost, capacity 500/day and build cost Rs 1,05,000: compute daily costs, payback and the capacity verdict. How would you hedge?',
          answer:
            'Gates: (1) Is there a trusted label? (no = stop, rules or fix labels). (2) Is there signal beyond what we can write as rules? (no = rules). (3) Enough quality data? (no = stop or collect). (4) Is the error cost compatible with model failure - reviewable or requiring deterministic bounds? (irreversible unreviewable harm = rules/human gate). (5) Is there staffed capacity to monitor, alert and retrain? (no = do not deploy). (6) Right and consent to use the inputs? (no = stop). Arithmetic: rules = 660 x 12.50 = Rs 8,250/day; ML = 480 x 12.50 + 500 = Rs 6,500/day; saving = Rs 1,750/day; payback = 1,05,000/1,750 = 60 days. Capacity: ML 480 <= 500 fits; rules 660 > 500 overflow by 160/day - the queue silently becomes SLA breach and auto-closed flags, so rules are actually infeasible at this volume. Hedge: keep rules as the floor, use the ML score to rank the human queue (triage), measure human+model against rules-alone on a holdout, and only graduate bounded score bands to auto-decision once the combined evidence supports it.',
          source: 'Interview-grade synthesis (build-vs-buy gates + operating arithmetic).',
        },
        summary: [
          'Gate before building: trusted label, signal beyond rules, sufficient data, compatible error costs, staffed monitoring, right to use inputs.',
          'Rules win for stable three-line logic, mandatory reason codes and unreviewable harm; ML wins for complex mappings with volume and monitoring capacity.',
          'Compare on operating numbers: daily review cost, run cost, capacity fit and payback - capacity overflow fails silently through the queue.',
          'Human-in-the-loop needs design: abstention band sized to capacity, escalation by stakes, and measured human+model vs each alone.',
          'Watch automation bias with blind-first samples, override reasons and gold-standard injections; an override rate near zero is an alarm.',
          'Not building (or shipping triage-only) is a legitimate, senior deliverable - the model that does not exist cannot drift or discriminate.',
        ],
      }),
      [
        [
          'Which finding most strongly favours keeping a rules engine instead of building ML?',
          [
            'The dataset has 2 million labelled examples',
            'The decision is three stable, auditable conditions with mandatory reason codes and no learnable residual signal',
            'The team has on-call staff for monitoring',
            'The error cost is asymmetric but reviewable',
          ],
          1,
          'If the logic is writable, stable and must be explained per decision, a model only re-learns what you already know while adding drift, monitoring and audit burden.',
        ],
        [
          'Rules flag 660 reviews/day, ML flags 480/day, each review costs Rs 12.50, ML adds Rs 500/day run cost. Daily saving of ML is:',
          ['Rs 2,250', 'Rs 1,750', 'Rs 6,500', 'Rs 500'],
          1,
          'Rules: 660 x 12.50 = 8,250. ML: 480 x 12.50 + 500 = 6,500. Saving = 1,750/day (and payback on a Rs 1,05,000 build = 60 days).',
        ],
        [
          'The human-review band in a score-based workflow should be set by:',
          [
            'Whatever width minimises model error',
            'Review capacity and stakes: the queue (band share x volume) must fit daily capacity, and irreversible cases escalate to humans regardless of score',
            'The middle 50 percent by definition',
            'The regulator\'s preferred number only',
          ],
          1,
          'The band is a staffing and risk decision: too wide and the queue overflows (silent failure), too narrow and consequential cases auto-decide. Escalation by stakes is independent of the score.',
        ],
        [
          'Reviewers override the model in fewer than 1 percent of cases and their accuracy exactly tracks the model. Best interpretation:',
          [
            'The model is perfect and the team is excellent',
            'Automation bias - reviewers are rubber-stamping; verify with blind-first sample reviews, forced override reasons and injected gold-standard cases',
            'The thresholds are set too wide',
            'Nothing - this is the ideal operating point',
          ],
          1,
          'Independence has collapsed: measure human-alone, model-alone and human+model; blind-first reviews and gold cases restore a genuine second opinion instead of an echo chamber.',
        ],
      ]
    ),
  ],
};
