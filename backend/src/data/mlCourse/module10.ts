// Module 10 — The ML Lifecycle, Experimentation and Defending Your Work
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, code } from '../nineBlocks';
import { lesson, M10, COURSE_ID } from './helpers';

export const module10: CourseModule = {
  id: M10,
  course_id: COURSE_ID,
  title: 'Module 10 — The ML Lifecycle, Experimentation and Defending Your Work',
  summary:
    'The capstone layer: the end-to-end lifecycle from framing to retirement with a worked churn specification, experimentation hygiene (pre-registration, SRM checks, guardrails and the selection-inflation arithmetic that kills most reported lifts), the model card as a structured accountability document, and the capstone defence - a lifecycle walkthrough plus the ten classic interview questions every graduate should be able to answer from memory.',
  sort_order: 10,
  lessons: [
    lesson(
      M10,
      'mlf-10-1',
      101,
      'The ML Lifecycle: From Business Goal to Monitored System',
      'The eight stages that separate a demo from a system, and a full worked specification turning "reduce churn by 20%" into a buildable, launchable, monitored ML project.',
      21,
      nineBlocks({
        objectives: [
          'Name the lifecycle stages and the artifact each stage must produce before the next begins',
          'Convert a vague business goal into a prediction problem with unit, prediction time and a timing-safe label',
          'Write baselines, offline metrics and online success criteria before any model is trained',
          'Define release strategy, monitoring and retirement triggers for a deployed model',
        ],
        hook:
          'Two teams start on the same day. Team A opens a notebook, tries four algorithms, reaches 0.93 AUC in two weeks, demos triumphantly - and then stalls for three months: nobody can say what the model replaces, which decisions it changes, what happens when the label arrives late, or who gets paged when it degrades. Team B spends the first week writing one page: the decision, the prediction moment, the label timing rule, the baseline, the capacity constraint, the ship criteria and the rollback plan. Their model reaches only 0.88 - and ships in week four, because every question a reviewer could ask already had an answer on that page. The difference was never modelling skill; it was that Team B treated the lifecycle as the deliverable and the model as one stage of it.',
        concept: `**Eight stages, each with an artifact.** (1) **Problem framing** - what decision changes, for whom, and how often; artifact: a one-page decision spec. (2) **Success metrics** - the business metric, the offline proxy, guardrails and baselines; artifact: written ship criteria *before* training. (3) **Data** - sources, labels, privacy and rights, timelines; artifact: a data card and an availability audit (every column must exist at prediction time). (4) **Features and baseline** - feature definitions shared between training and serving, plus the dumb baselines (mean, majority, current rule); artifact: the baseline table your model must clear. (5) **Modelling and validation** - right split (time/group aware), CV protocol, tuning budget; artifact: an evaluation report with error analysis, not just a score. (6) **Release** - shadow, canary, ramp, rollback; artifact: a launch plan with gates. (7) **Monitoring** - the six layers from Module 9 plus ownership; artifact: dashboards, thresholds, runbooks. (8) **Retirement and retraining** - triggers, cadence, model registry; artifact: a decision log. Skipping a stage does not delete it - it reappears later as an incident, a rework or a compliance question.

**Framing: the goal is not the target.** Leadership asks for "20% less churn". That is a business outcome influenced by pricing, product and support - a model alone cannot deliver it, and predicting churn is not the same as reducing it. The translation keeps three things separate: the **decision** (who gets a retention call this week?), the **prediction** (probability this customer does not renew in the next 30 days, given what is known at a fixed moment), and the **intervention** (the offer, which has its own effect that must be measured against a holdback). Freeze the **prediction time** first (for churn: say, 7 days before cycle end) and enforce a timing rule on the **label**: it may only use events strictly after prediction time, and every feature must be computable strictly before it. That single rule kills the leakage family: cancellation flags, refund records and anything the retention team wrote after contacting the customer are banned from X even though they predict beautifully.

**Metrics and baselines, written before training.** Offline: choose the metric from the harm and the rarity (PR-AUC for rare events, calibration if probabilities drive thresholds, precision at k when only k actions fit per day) and report it against three baselines - always-the-base-rate, the current production rule, and a simple linear model. Online: the metric that pays (retention rate among treated vs a no-contact **holdback**, revenue per customer, cost per save), plus **guardrails** (opt-out rate, complaint rate, margin) that veto the launch if they move the wrong way. Then the ship criteria as numbers: offline improvement over baseline by X, calibration error below Y, canary healthy for Z days, no guardrail breach - all frozen before the first training run, because criteria written after seeing results are not criteria.

**Release, monitor, retire.** Release is a ladder: **shadow** (model scores alongside production, no effect - compare distributions and catches), **canary** (5-10% of traffic, watch alerts and guardrails), **ramp** (25, 50, 100% with automatic rollback on threshold breach), always with the incumbent still deployable in one command. Monitoring is the Module 9 stack with named owners: data quality and score PSI daily, slice metrics on label cadence, ops continuously, a retraining trigger when PSI or performance crosses its line, and a **retirement** trigger too - every model has an expiry: a stale champion that nobody revalidates is a liability with a dashboard. The lifecycle closes where it started: re-ask the framing question each quarter - is the decision still being made this way? - because the fastest way to a useless model is a perfect answer to a question the business has already stopped asking.`,
        extras: [
          table(
            'The lifecycle gates - artifact required before moving on',
            ['Stage', 'Core question', 'Artifact', 'Cost of skipping'],
            [
              ['Framing', 'What decision changes, for whom?', 'One-page decision spec (unit, prediction time, label timing)', 'A model nobody uses; leakage baked in'],
              ['Metrics', 'What does success pay as?', 'Baselines + offline/online metrics + guardrails + ship criteria', 'Moving goalposts after seeing results'],
              ['Data & features', 'What legally exists at prediction time?', 'Data card + availability audit + shared feature definitions', 'Training-serving skew; leaked features'],
              ['Validation', 'Does it beat baselines honestly?', 'Time/group-aware CV report + error analysis', 'Optimistic scores; wrong split'],
              ['Release', 'How does it reach users safely?', 'Shadow/canary/ramp plan with rollback gates', 'All-or-nothing launches; slow rollbacks'],
              ['Monitor & retire', 'Is it still true, and when does it die?', 'Dashboards, thresholds, runbooks, expiry/retrain triggers', 'Silent degradation; immortal zombies'],
            ],
          ),
          code(
            '# Ship gate: baselines first, capacity-aware metrics, criteria frozen\nimport numpy as np\nfrom sklearn.metrics import average_precision_score\n\nbase_rate = float(np.mean(y_test))\nrule_ap = average_precision_score(y_test, rule_scores)     # current production rule\nmodel_ap = average_precision_score(y_test, model_scores)\n\nK = 500                                     # outreach capacity: calls per day\norder = np.argsort(-model_scores)[:K]\nprecision_at_k = float(np.mean(y_test[order]))\nrule_order = np.argsort(-rule_scores)[:K]\nrule_at_k = float(np.mean(y_test[rule_order]))\n\nprint(\"base rate:\", round(base_rate, 4))\nprint(\"rule AP:\", round(rule_ap, 4), \" model AP:\", round(model_ap, 4))\nprint(\"precision@500 rule:\", round(rule_at_k, 4),\n      \"model:\", round(precision_at_k, 4))\n\n# Criteria written BEFORE training - the gate decides, not the demo\ngates = {\n    \"beats_rule_ap\": model_ap > rule_ap + 0.02,\n    \"beats_rule_at_k\": precision_at_k > rule_at_k,\n    \"calibration_ok\": True,                 # fill from reliability diagram\n}\nprint(gates, \"SHIP\" if all(gates.values()) else \"HOLD\")',
            'ship_gates.py',
            'python'
          ),
          warn(
            'Writing ship criteria after looking at results',
            'Post-hoc criteria are press releases. Freeze baselines, thresholds, guardrails and ramp rules before the first training run, and record the date - reviewers will ask for exactly that.',
          ),
          tip(
            'The one-page decision spec is the cheapest artefact in the course',
            'Decision, unit, prediction time, label timing rule, capacity, baselines, guardrails, ship and rollback criteria - one page that turns every later argument into a checklist item.',
          ),
        ],
        worked: {
          title: 'Turning "reduce churn by 20%" into a buildable specification',
          problem:
            'A subscription business asks ML to cut churn by 20%. Write the full specification: (a) the ML question with unit and prediction time; (b) the label with its timing rule; (c) three candidate features and two banned ones with reasons; (d) the offline metric and three baselines; (e) the online experiment design with holdback and guardrails, given an outreach capacity of 500 calls/day; (f) the ship criteria you freeze before training.',
          steps: [
            {
              title: '(a) Decision, unit, prediction time',
              desc: 'Decision: which customers get a retention outreach this week (the model ranks; humans call). Unit: one customer-cycle. Prediction time: fixed at 7 days before cycle end - all features frozen as of that instant. ML question: P(no renewal within 30 days past cycle end | state at day D - 7). The 20% business goal stays OUT of the model definition; it is the outcome the intervention must move, measured against a holdback.',
            },
            {
              title: '(b) Label with timing rule',
              desc: 'Label = 1 if the subscription is cancelled or payment fails within 30 days after cycle end, computed strictly from events after prediction time. Timing rule stated in one line: the label may reference only events later than day D - 7; anything at or before D is a feature, anything after is either the label or banned. Churn definitions must also decide whether planned cancellations and non-payments both count - write it down, because the label is the project.',
            },
            {
              title: '(c) Features: two banned',
              desc: 'Valid (computable before D): 8-week usage trend (sessions last 4 weeks vs prior 4); support contacts raised before D; payment failures and dunning status before D; tenure and plan tier. BANNED: cancellation-initiated flag (it is the label arriving early) and retention-offer-sent status (written by the intervention team after contact - the feature encodes the treatment and a previous process, a textbook process-leak). Also audit: does any feature get computed with full-month data when only 7 days exist? That is point-in-time leakage.',
            },
            {
              title: '(d) Offline metric and baselines',
              desc: 'Primary: PR-AUC (churn is rare; ROC-AUC and accuracy flatter). Secondary: calibration by decile (thresholds are set on probabilities) and precision@500 (only 500 calls fit per day - the metric is the capacity). Baselines: (1) always predict base rate - AP equals prevalence; (2) current rule (no login in 14 days) scored the same way; (3) logistic regression on the same features - the complexity floor.',
            },
            {
              title: '(e) Online experiment',
              desc: 'Randomise customer-cycles into treatment (ranked model list, agents work top-down) and a 5% no-contact holdout that keeps receiving business-as-usual. Primary online metric: 30-day renewal rate on at-risk customers (treatment vs holdback). Guardrails: opt-out/complaint rate, margin after offer cost, calls per save, agent handle time. Run long enough to cover a full renewal cycle, check sample ratio daily (SRM = broken randomisation), and analyse intention-to-treat.',
            },
            {
              title: '(f) Ship criteria, frozen',
              desc: 'Offline: PR-AUC beats the current rule by at least +0.02 and precision@500 beats it outright; calibration error within tolerance on the top decile; no subgroup (tenure band, plan, region) below floor with n >= 100. Release: shadow 1 week (score distributions match, no feature errors), canary 5% with auto-rollback on PSI > 0.25 or guardrail breach, ramp 25/50/100%. Retire/retrain trigger: PSI > 0.25 on two consecutive days or PR-AUC (on matured labels) below baseline.',
            },
          ],
          solution:
            'Spec: decision = outreach ranking; unit = customer-cycle; prediction = renewal failure probability 7 days out; label = non-renewal within 30 days (post-prediction events only); features frozen at D with cancellation/retention flags banned; offline = PR-AUC + precision@500 vs three baselines; online = 5% holdout with renewal-rate primary and complaint/margin guardrails; ship criteria frozen in advance (offline margins, subgroup floors, shadow-canal-ramp gates) with PSI and matured-performance retraining triggers. The 20% goal is then tested as an intervention outcome against the holdback, not claimed by the model.',
        },
        practice: {
          title: 'Write your own one-page decision spec',
          prompt:
            'Pick a problem you care about and fill every line of the spec: decision and decision-maker; unit; prediction time; label with timing rule; three features with their availability timestamps and two deliberately banned ones; three baselines; offline metric plus one capacity or cost metric; online design with holdback and guardrails; ship criteria; monitoring triggers; retirement trigger. Then give it to a friend and let them attack it - every question they raise that the page already answers is a defect the project will never pay for.',
          hint: 'If you cannot state the prediction time in one sentence, you cannot audit a single feature - fix that first. If there is no baseline, there is no project: a score without a floor is an unverifiable number.',
        },
        mistakes: [
          {
            mistake: 'Equating the business goal with the prediction target',
            fix: 'Predict the observable outcome (non-renewal), decide the intervention separately, and measure the business goal against a holdback - the model alone never delivers a percentage goal.',
          },
          {
            mistake: 'Training before baselines, metrics and ship criteria exist',
            fix: 'Freeze the ladder (base rate, current rule, simple model) and the gate numbers first; criteria written after results are press releases.',
          },
          {
            mistake: 'Letting post-prediction events into features',
            fix: 'State prediction time, then audit every feature: computable strictly before it, or banned. Cancellation flags, retention-offer status and outcome-derived aggregates are the classic leaks.',
          },
          {
            mistake: 'Shipping without shadow, canary, ramp and a one-command rollback',
            fix: 'Every release stage catches a different failure class (feature errors, distribution shift, guardrail breaches); deploy is a ladder with automatic rollback, not an event.',
          },
          {
            mistake: 'No retrain or retirement trigger after launch',
            fix: 'A model with no expiry is a zombie: define PSI and performance triggers, retraining cadence, ownership and a documented retirement path in the launch plan.',
          },
        ],
        exam: {
          question:
            'List the eight lifecycle stages with the artifact each must produce. Then for a churn model, define the prediction time and explain why a retention-offer-sent feature must be banned even though it predicts churn strongly.',
          answer:
            'Stages and artifacts: (1) problem framing - one-page decision spec (decision, unit, prediction time, label timing rule); (2) success metrics - baselines, offline/online metrics, guardrails, ship criteria frozen pre-training; (3) data - data card, rights/privacy, availability audit; (4) features and baseline - shared train/serve feature definitions plus the dumb baselines to clear; (5) modelling and validation - time/group-aware evaluation report with error analysis; (6) release - shadow/canary/ramp plan with rollback gates; (7) monitoring - the layered dashboards, thresholds and runbooks with named owners; (8) retirement/retraining - triggers, cadence and decision log. For churn: prediction time = a fixed instant (e.g. 7 days before cycle end) at which all features are frozen and from which the label window runs forward. Retention-offer-sent must be banned because it is written by the intervention team AFTER the risk was recognised (and often after contact): it encodes the business process and a previous selection into X, it is unavailable when the model must make the ranking that triggers the offer (circular), and on deployment the feature distribution collapses because the model itself changes who gets offers - a leakage that guarantees train-serve skew. Features must exist, in meaning and in code, strictly before prediction time.',
          source: 'Evergreen lifecycle exam question (stages + leakage reasoning).',
        },
        summary: [
          'Lifecycle: framing, metrics, data, features/baseline, validation, release, monitoring, retirement - each stage ships an artifact, and skipped stages return as incidents.',
          'Separate the decision, the prediction and the intervention; freeze prediction time first and audit every feature against it.',
          'Baselines (base rate, current rule, simple model) and ship criteria are written before training - post-hoc criteria are not criteria.',
          'Labels use only post-prediction events; process features written after contact are leaks that also guarantee serving skew.',
          'Release is a ladder (shadow, canary, ramp, rollback); monitoring has owners and thresholds; every model carries a retrain and a retirement trigger.',
        ],
      }),
      [
        [
          'The correct FIRST stage of an ML project is:',
          [
            'Selecting the algorithm family',
            'Problem framing: the decision, unit, prediction time and label timing rule, then the metrics and baselines',
            'Training a gradient boosting baseline',
            'Collecting as many features as possible',
          ],
          1,
          'Nothing downstream can be audited without the framing page: it fixes what the label means, which features are legal and what success pays as. Algorithms come after baselines.',
        ],
        [
          'Why is a "retention offer sent" column banned as a feature for churn prediction?',
          [
            'It is a categorical column',
            'It is written by the intervention process after risk was recognised - it encodes the business process, is unavailable at ranking time, and collapses in distribution once the model changes who gets offers',
            'It has too many nulls',
            'Trees cannot split on it',
          ],
          1,
          'The feature is post-decision, circular (the model triggers it) and self-destroying under deployment - the three signatures of process leakage, regardless of how predictive it looks offline.',
        ],
        [
          'Baselines for a churn model should include:',
          [
            'Only the previous version of the same model',
            'Always-predict-the-base-rate, the current production rule, and a simple linear model - the floor your model must clear to be worth operating',
            'A large language model for comparison',
            'No baseline; PR-AUC speaks for itself',
          ],
          1,
          'A score without a floor is unverifiable: base rate shows what prevalence alone gives, the rule shows what the business already achieves, and the linear model prices the complexity you are adding.',
        ],
        [
          'A launched model with no retraining or retirement trigger is best described as:',
          [
            'Stable by design',
            'A zombie - it will silently degrade, and without documented triggers, ownership and a rollback path nobody will notice until a review does',
            'Efficient, since retraining costs money',
            'Compliant with most model governance',
          ],
          1,
          'Drift is normal; the lifecycle closes with explicit PSI/performance retrain triggers and an expiry decision. An immortal model without owners is unmanaged risk with a dashboard.',
        ],
      ]
    ),
    lesson(
      M10,
      'mlf-10-2',
      102,
      'Experimentation Hygiene: Pre-Registration, Power and the Arithmetic of False Wins',
      'Why the best-of-50 A/B result is usually noise, the four checks that keep an experiment honest, and the protocol you write before the traffic starts flowing.',
      20,
      nineBlocks({
        objectives: [
          'Compute expected best-of-N selection inflation and judge a reported lift against it',
          'Run a two-proportion z-test and a power calculation for a target minimum detectable effect',
          'Detect sample ratio mismatch and name what it invalidates',
          'Write a pre-registered experiment plan with primary metric, guardrails and ship criteria',
        ],
        hook:
          'A growth team tests 50 button variants over four weeks, finds the winner at +0.6 points, and announces a win at the all-hands. Nobody asks the question that ends the meeting: with day-to-day noise of half a point, how much lift would the LUCKIEST of 50 identical variants show by pure chance? The answer, from one line of statistics, is about 1.4 points - more than double what they found. Their +0.6 does not beat randomness; it loses to it. The team did not lie, and they did not learn anything either: they ran a search over noise and reported the maximum. Experimentation hygiene is the discipline that makes sure a number means something.',
        concept: `**Pre-registration: decide before you look.** An experiment is a promise made in advance: one **primary metric**, the **minimum detectable effect (MDE)** you care about, the **sample size** required to see it, the **duration**, the **guardrails** that veto a win, and the **ship criteria** - all written down before the first assignment is served. Change any of them after seeing data and you are shopping for significance: with enough peeks and enough metric variants, everything reaches p < 0.05 eventually. Companion rules: **no peeking** (repeatedly checking a fixed-horizon test inflates false positives - either commit to the horizon, use always-valid confidence sequences, or pre-plan interim looks with error spending), and **one primary metric** (secondary metrics are diagnostics, not alternatives to promote from).

**Power: the sample size arithmetic.** For a two-proportion comparison, the standard error of the difference is approximately sqrt(p(1-p)(1/n1 + 1/n2)); at p = 0.5 with n = 10,000 per arm that is sqrt(0.25 x 2/10000) = 0.707 percentage points. A detected +0.6-point lift against SE 0.707 is z = 0.85 - not significant (p about 0.20) even as a single pre-registered test. Power for a target delta: n per arm = 2 x (z for 95% + z for 80%) squared x p(1-p) / delta squared = 2 x (1.96 + 0.84) squared x 0.25 / delta squared, which for delta = 0.6 points is about 109,000 per arm. Read that as a business statement: either run a six-figure-per-arm test, chase a larger effect, or use variance reduction (CUPED - covariates from the pre-period as control variates, commonly cutting variance 10-50% and thus the required n) to make a small MDE affordable. An underpowered experiment does not find "no effect"; it finds nothing, at full cost.

**Selection inflation: why best-of-N never wins on its own.** If N variants each produce a noisy estimate with standard deviation sigma, the expected maximum of the N estimates exceeds the truth by roughly sigma x sqrt(2 ln N) even when all N are identical. With sigma = 0.5 points and N = 50: 0.5 x sqrt(2 x ln 50) = 0.5 x sqrt(7.82) = 0.5 x 2.80 = 1.4 points of expected lift from pure selection. The same arithmetic (Module 7) applies to hyperparameter sweeps, and to trying many metrics or segments until one glows. The defence is structural: pre-register the winner count (usually one variant versus one control), correct for multiple comparisons when you genuinely test many (Bonferroni, or false-discovery control), and confirm the frozen winner once on untouched traffic.

**The four hygiene checks.** (1) **Sample ratio mismatch (SRM):** did the arms receive the traffic split you assigned? Compare assigned vs observed with a chi-square goodness-of-fit; any significant mismatch (most orgs alarm at p < 0.001) means randomisation, redirects, bot filtering or logging is broken, and EVERY metric in the test is suspect - stop, do not interpret. (2) **Guardrails:** metrics that must not regress (latency, error rate, opt-out, revenue-per-user, complaint rate) with veto power. (3) **Novelty and novelty-plus:** new UIs get a novelty spike and an early-adopter skew - run long enough to cover a full usage cycle (weekly seasonality included) and look at the time series of the effect, not just the aggregate; an effect that decays from day 1 is usually novelty. (4) **Interference:** when units affect each other (marketplace auctions, social feeds, pricing), SUTVA breaks and per-user randomisation lies - randomise at the cluster (market, region, seller) or switch design. Then close the loop: log the result including negatives (the pre-registered plan, the SRM check, the verdict, the ship decision), because a culture that only remembers wins re-runs the same experiments forever.`,
        extras: [
          table(
            'Experiment failures and their signature',
            ['Failure', 'Signature', 'Fix'],
            [
              ['Peeking / metric shopping', 'p-value dips below 0.05 on some check, then drifts up', 'Pre-register one primary metric and horizon; always-valid intervals if you must watch daily'],
              ['Sample ratio mismatch', 'Observed split differs from assigned split (chi-square alarm)', 'Stop and debug assignment, redirects and logging - all metrics are invalid until it clears'],
              ['Best-of-N search', 'Winner among many variants beats noise by sigma x sqrt(2 ln N)', 'Few arms, multiple-comparison correction, confirm on untouched traffic'],
              ['Novelty / ramp effects', 'Effect size decays over days or varies by exposure share', 'Run full cycles, plot effect over time, hold a long-run holdback'],
              ['Interference (SUTVA break)', 'Per-user results unstable; cross-arm contamination', 'Randomise at cluster level or use switchback designs'],
            ],
          ),
          code(
            '# Is the lift real? Inflation, z-test, power - three lines each\nimport numpy as np\nfrom math import log, sqrt\n\n# 1) best-of-N selection inflation (all 50 variants may be identical)\nsigma, N = 0.5, 50                       # daily noise (points), variants tried\ninflation = sigma * sqrt(2 * log(N))\nprint(\"expected best-of-50 noise lift:\", round(inflation, 2), \"points\")\n# 0.5 * sqrt(2 * ln 50) = 1.40 points - a +0.6 win LOSES to randomness\n\n# 2) two-proportion z-test at n = 10,000 per arm\nn, p1 = 10000, 0.50\np2 = 0.506                                    # observed +0.6 points\nse = sqrt(p1 * (1 - p1) * (2 / n))\nz = (p2 - p1) / se\nprint(\"SE (points):\", round(se * 100, 2), \" z:\", round(z, 2), \"-> not significant\")\n\n# 3) sample size for a 0.6-point MDE at 80% power, 5% significance\ndelta = 0.006\nn_per_arm = 2 * (1.96 + 0.84) ** 2 * 0.25 / delta ** 2\nprint(\"n per arm needed:\", int(n_per_arm))   # about 109,000\n\n# SRM: assigned 50/50 but observed different? chi-square - if it fires, STOP\nfrom scipy.stats import chisquare\ncounts = [50210, 49790]\nprint(\"SRM p-value:\", chisquare(counts).pvalue)  # alarm below 0.001',
            'experiment_arithmetic.py',
            'python'
          ),
          warn(
            'A significant SRM invalidates every metric in the test',
            'Broken assignment (redirect bugs, bot filters, logging gaps) contaminates arms non-randomly: no p-value downstream is trustworthy. Alarm on chi-square p < 0.001 and debug before reading any result.',
          ),
          tip(
            'Pre-register the plan and log the negatives',
            'One page: primary metric, MDE, n, duration, guardrails, ship criteria - timestamped before traffic flows. Logging failed experiments is the only thing that stops the org from re-running them forever.',
          ),
        ],
        worked: {
          title: 'Judging the +0.6 point "win" from 50 variants',
          problem:
            'A team tested 50 variants; the best beat control by +0.6 points. Daily/segment noise sigma = 0.5 points. At n = 10,000 per arm with control rate 50%, the treatment showed 50.6%. (a) Compute the expected best-of-50 lift from pure selection and give a verdict. (b) Compute the standard error and z for the observed lift as a SINGLE pre-registered test. (c) Compute the per-arm sample size needed to detect 0.6 points at 80% power and 5% significance. (d) Rewrite the experiment so a real 0.6-point effect would be believable.',
          steps: [
            {
              title: '(a) Selection inflation',
              desc: 'Expected max of 50 noise estimates above truth ~ sigma x sqrt(2 ln N) = 0.5 x sqrt(2 x ln 50) = 0.5 x sqrt(7.824) = 0.5 x 2.80 = 1.40 points. The reported +0.6 is LESS than half of what pure luck over 50 variants produces. Verdict: indistinguishable from searching noise - the experiment as run supports no claim.',
            },
            {
              title: '(b) Even as one test, it fails',
              desc: 'SE = sqrt(0.5 x 0.5 x 2/10000) = sqrt(0.00005) = 0.00707 = 0.707 points. z = 0.6 / 0.707 = 0.85. For a two-sided 5% test the critical value is 1.96 - we are far below it (p about 0.20). So the lift is not significant even before accounting for the 50-way search, which makes it strictly worse.',
            },
            {
              title: '(c) Power for a 0.6-point MDE',
              desc: 'n per arm = 2 x (1.96 + 0.84) squared x 0.5 x 0.5 / 0.006 squared = 2 x 7.84 x 0.25 / 0.000036 = 3.92 / 0.000036 = about 108,900 per arm (round to 109k). At 10,000 per arm the test is roughly 10x underpowered for the effect the team hopes to see.',
            },
            {
              title: '(d) The protocol that makes a 0.6-point win believable',
              desc: 'Pre-register ONE primary metric and ONE treatment (or correct for N arms); power at the MDE first - 109k per arm, or apply CUPED using pre-period covariates to cut variance and n; check SRM before reading metrics; no peeking (fixed horizon or always-valid intervals); guardrails with veto; run through full weekly cycles to rule out novelty; then confirm the frozen winner on a fresh holdout. Only a lift that survives that gauntlet ships with a number attached.',
            },
          ],
          solution:
            '(a) 0.5 x sqrt(2 ln 50) = 1.40 points of expected pure-selection lift; the +0.6 win is inside the noise floor of the search - verdict: no effect demonstrated. (b) SE = 0.707 points, z = 0.85, p about 0.20: not significant even as a single pre-registered test. (c) n about 109,000 per arm for 80% power at 5% significance. (d) Pre-register one comparison at the right power (or CUPED-reduce variance), SRM check, no peeking, guardrails, full-cycle duration, holdback confirmation - then the number means something.',
        },
        practice: {
          title: 'Pre-register a real experiment',
          prompt:
            'Take a product change you would like to test and write the full plan before anything runs: primary metric with baseline value, MDE, power calculation for n, duration in usage cycles, assignment unit (user/session/cluster - justify), SRM check and alarm threshold, two guardrails with veto rules, ship criteria, and the analysis you will run exactly once. Then compute the selection inflation you would face if you instead tried 10 metrics and 5 segments looking for a win (sigma = 0.4 points) and state what that number forbids.',
          hint: 'Inflation = sigma x sqrt(2 ln N) with N = the number of opportunities you gave yourself to be lucky (metrics x segments x variants) - if it exceeds your MDE, your MDE was theatre.',
        },
        mistakes: [
          {
            mistake: 'Peeking daily at a fixed-horizon test and stopping when significant',
            fix: 'Each look is another chance to cross the line: commit to the horizon, use always-valid confidence sequences, or pre-plan interim looks with error spending.',
          },
          {
            mistake: 'Reporting the best of many variants, metrics or segments',
            fix: 'Expected best-of-N lift is sigma x sqrt(2 ln N); keep arms few, correct for multiplicity, and confirm the frozen winner on untouched traffic.',
          },
          {
            mistake: 'Reading results while the sample ratio mismatch alarm is lit',
            fix: 'SRM means assignment or logging is broken and every downstream metric is contaminated: stop, debug, restart. A beautiful p-value on broken randomisation is fiction.',
          },
          {
            mistake: 'Launching underpowered tests and concluding no effect',
            fix: 'Power at the MDE before launch: n = 2 (1.96 + 0.84) squared p(1-p)/delta squared, or shrink variance with CUPED; otherwise the test buys nothing at full cost.',
          },
          {
            mistake: 'Shipping a win with no holdback left behind',
            fix: 'Keep a persistent holdout to measure the long-run effect (novelty decay, equilibrium shifts); a win measured only in week one is a novelty artifact more often than not.',
          },
        ],
        exam: {
          question:
            'Define pre-registration and sample ratio mismatch. For sigma = 0.5 points and 50 variants, compute the expected pure-selection lift and judge a reported +0.6-point win. Then compute the SE and z at n = 10,000 per arm (control 50%) and the per-arm n for a 0.6-point MDE at 80% power, 5% significance.',
          answer:
            'Pre-registration: fixing the primary metric, MDE, sample size, duration, guardrails, analysis and ship criteria in writing before traffic flows - so no element can be revised after seeing data (which would turn the test into metric shopping). SRM: a mismatch between assigned and observed arm sizes (chi-square on the split, alarm at p < 0.001), which indicates broken assignment or logging and invalidates every metric in the test until debugged. Selection: sigma x sqrt(2 ln 50) = 0.5 x sqrt(7.824) = 0.5 x 2.80 = 1.40 points expected from pure luck - a +0.6 lift is well inside that, so it demonstrates nothing. Single-test arithmetic: SE = sqrt(0.5 x 0.5 x 2/10000) = 0.707 points; z = 0.6/0.707 = 0.85 versus the 1.96 critical value - not significant (p about 0.20) even before the multiplicity penalty. Power: n per arm = 2 x (1.96 + 0.84) squared x 0.25 / 0.006 squared = about 109,000. Conclusion: pre-register, power properly (or CUPED), check SRM, never peek, keep guardrails and a holdback - only then does a 0.6-point effect carry meaning.',
          source: 'Evergreen experimentation exam question (inflation + power arithmetic).',
        },
        summary: [
          'Pre-register: one primary metric, MDE, n, duration, guardrails, ship criteria - written before traffic; after-the-fact plans are metric shopping.',
          'Best-of-N expected lift ~ sigma x sqrt(2 ln N): sigma 0.5 and 50 variants = 1.40 points of pure noise - a 0.6-point win loses to it.',
          'SE of a difference ~ sqrt(p(1-p) x 2/n): 0.707 points at 10k/arm makes +0.6 insignificant (z = 0.85); a 0.6-point MDE needs about 109k per arm.',
          'SRM invalidates everything in the test; guardrails veto; novelty needs full cycles; interference needs cluster or switchback designs.',
          'No peeking without always-valid intervals, and always keep a long-run holdback plus a log of negative results.',
        ],
      }),
      [
        [
          'Fifty variants are tested; sigma of daily noise is 0.5 points. The expected lift of the BEST variant from pure selection alone is approximately:',
          ['0.5 points', '1.4 points', '2.8 points', '5 points'],
          1,
          'sigma x sqrt(2 ln 50) = 0.5 x 2.80 = 1.40 points. Any reported best-of-50 lift below that is inside the noise floor of the search itself.',
        ],
        [
          'A chi-square check shows observed arm sizes of 50,210 and 49,790 against a 50/50 assignment with p = 0.0004 (alarm threshold 0.001). You should:',
          [
            'Proceed - the split looks close to 50/50',
            'Stop and debug assignment, redirects and logging before reading any metric: SRM means randomisation is broken and all downstream results are contaminated',
            'Switch to the secondary metric instead',
            'Increase the sample size until it clears',
          ],
          1,
          'A significant sample ratio mismatch says the arms did not receive their assigned traffic non-randomly - every comparison downstream inherits that bias, however small the size difference looks.',
        ],
        [
          'With p = 0.5 and n = 10,000 per arm, a +0.6-point difference has z about 0.85. This means:',
          [
            'The effect is real but small',
            'Even as a single pre-registered test it is not significant at 5% (critical z = 1.96) - and the team then compounded this by searching 50 variants',
            'The test is overpowered',
            'The control rate must be wrong',
          ],
          1,
          'z = 0.6 / 0.707 = 0.85 < 1.96, so p about 0.20: no evidence in one look; the best-of-50 search makes the claim strictly weaker, not stronger.',
        ],
        [
          'To detect a 0.6-point lift with 80% power at 5% significance (baseline 50%) you need roughly:',
          ['1,000 per arm', '10,000 per arm', '109,000 per arm', 'Only 3 days of traffic'],
          2,
          'n = 2 x (1.96 + 0.84) squared x 0.25 / 0.006 squared is about 109,000 per arm - or a variance-reduction method like CUPED to make a smaller n honest.',
        ],
      ]
    ),
    lesson(
      M10,
      'mlf-10-3',
      103,
      'Model Cards: Writing the Accountability Document',
      'The nine sections every deployed model needs, what each one protects against, and a worked card that a reviewer, a lawyer and a new engineer can all interrogate.',
      19,
      nineBlocks({
        objectives: [
          'Produce a model card with all nine standard sections filled with real content, not placeholders',
          'Write an out-of-scope section that prevents specific foreseeable misuses',
          'Specify disaggregated evaluation (factors, metrics, subgroups, sample sizes) in a table skeleton',
          'Version the card with the model so documentation and artefact never drift apart',
        ],
        hook:
            'Six months after a hiring-screening model shipped, three people ask it three questions. The engineer asks: which training window and features produced this version? The compliance officer asks: which groups was it evaluated on, and what were the error rates? The customer asks: can we use it to rank freelance candidates too? Nobody can answer the first two from documentation - the third was being done already, by a team that assumed "it worked for employees". The model itself is fine; the system around it is unaccountable. A model card is the cheapest fix: one document, nine sections, versioned with the artefact, that answers those questions before they are asked - and the out-of-scope section is the one that stops the freelance ranking before a lawyer does.',
        concept: `**What a model card is (and is not).** A model card (Mitchell et al., 2019) is a structured, versioned document attached to a deployed model - not a marketing page, not a paper, not the README. Its nine sections each exist to close a specific failure of memory or imagination. (1) **Model details**: owner, version, date, architecture, hyperparameters, training code commit, registry path - provenance so anyone can reconstruct what is running. (2) **Intended use**: the decision, the users, the context, the input distribution the model expects. (3) **Out-of-scope use**: the foreseeable misuses you are forbidding explicitly - different population, different decision, automated action without review - because "we never imagined that use" is not a defence when the use was obvious. (4) **Factors and metrics**: which factors (subgroups) the model was evaluated on, which metrics were chosen and why (the harm-driven choice from Module 9). (5) **Evaluation data**: datasets, time windows, sizes, sampling method - was it time-ordered, was it representative, how old is it. (6) **Quantitative analyses**: the disaggregated results table - overall AND per factor, with n and intervals; a single aggregate number is exactly what the card exists to prevent. (7) **Training data and procedure**: sources, labelling process and its known issues, features with availability times, preprocessing, split strategy, tuning budget, seeds. (8) **Ethical considerations**: privacy exposure, consent and rights, potential harms by group, feedback loops (the model changing the world it measures), appeal paths. (9) **Caveats and recommendations**: known failure modes, distribution assumptions, monitoring hooks, retrain triggers, who to contact.

**The out-of-scope section is the teeth.** Weak out-of-scope text says "not intended for other purposes" - unenforceable and uninformative. Strong text enumerates: populations not covered (tenure below two cycles, traffic from partner apps), decisions not covered (pricing, termination, any irreversible action without human review), coupling not covered (using scores as labels for a downstream model, combining with other systems into a composite decision you never tested), and temporal limits (valid only while PSI stays below its threshold; expires at the next retraining). Each line is a sentence a reviewer can check against reality - which is the point.

**Disaggregated evaluation is the heart.** The quantitative section is a table: rows = overall plus every factor worth protecting (tenure band, plan tier, region, language, device, protected attributes under governance), columns = n, the primary metric, the operational metric (precision at k), calibration error, each with confidence intervals where n allows; small-n cells get flagged rather than averaged away. Beside the table sit qualitative analyses: a hand-reviewed error sample per subgroup (what does the model get wrong, in sentences), and the decision taken on the results (which floors were set, which trade-offs accepted - the fairness work of Module 9 recorded as a decision, not an aspiration).

**Versioning: the doc must travel with the artefact.** The card carries the model version, training-data window and code commit; the registry refuses promotion without one; any retraining, feature change or threshold move creates a new card version (changelogs beat dissertations). Distribution matters too: the card lives where decisions get made - beside the deploy button, in the incident channel, attached to the API docs - because documentation nobody can find is documentation nobody has. The test for adequacy is a simple drill: give the card to a colleague who has never seen the project and ask them five questions (what does it predict, for whom, what breaks it, how was it measured, what must never be done with it). If they cannot answer, the card is written for its author, not its readers.`,
        extras: [
          table(
            'The nine sections and the failure each one prevents',
            ['Section', 'Must contain', 'Failure it prevents'],
            [
              ['Model details', 'Owner, version, date, code commit, registry path', 'Nobody knows what is actually running'],
              ['Intended use', 'Decision, users, context, input distribution', 'Silent scope creep into new decisions'],
              ['Out-of-scope use', 'Named populations, decisions and couplings forbidden', 'Obvious misuse defended as "unimagined"'],
              ['Factors and metrics', 'Subgroups evaluated, metrics chosen and why', 'Metric choice presented as objective fact'],
              ['Evaluation data', 'Windows, sizes, sampling, representativeness', 'Stale or unrepresentative test sets passing as truth'],
              ['Quantitative analyses', 'Disaggregated table with n and intervals', 'One aggregate number hiding a collapsed slice'],
              ['Training data & procedure', 'Sources, labels, features with availability, split, seed', 'Irreproducible training; unexamined label bias'],
              ['Ethical considerations', 'Privacy, harms by group, feedback loops, appeal path', 'Rights and harms discovered after launch'],
              ['Caveats & recommendations', 'Failure modes, monitoring hooks, retrain triggers, contact', 'A zombie model with no expiry and no owner'],
            ],
          ),
          code(
            '# A model card as data - versioned with the artefact it describes\nimport json\nfrom datetime import date\n\ncard = {\n    \"model_version\": \"churn-gbm-2.3.1\",\n    \"code_commit\": \"a1f9c2e\",\n    \"trained_on\": \"2024-01-01..2025-03-31 (time-ordered holdout after)\",\n    \"owner\": \"retention-ml@company\",\n    \"intended_use\": \"Rank subscribers for outreach 7 days before cycle end\",\n    \"out_of_scope\": [\n        \"Tenure < 2 cycles (not represented in training)\",\n        \"Automated cancellation or billing decisions\",\n        \"Pricing or offer-size optimisation\",\n        \"Partner-app traffic (different feature distribution)\",\n    ],\n    \"factors\": [\"tenure_band\", \"plan_tier\", \"region\", \"language\"],\n    \"primary_metric\": \"PR-AUC\",\n    \"operational_metric\": \"precision@500/day\",\n    \"evaluation\": {\n        \"overall\": {\"n\": 182344, \"pr_auc\": 0.41, \"p500\": 0.62},\n        \"tenure_lt_2_cycles\": {\"n\": 940, \"pr_auc\": 0.24, \"flag\": \"below floor - route to human\"},\n    },\n    \"retrain_trigger\": \"PSI > 0.25 for 2 days or PR-AUC below baseline on matured labels\",\n    \"expires\": \"2026-01-31\",\n    \"caveats\": [\"Degrades after pricing changes\", \"Needs recalibration each quarter\"],\n}\n\nprint(json.dumps(card, indent=2))\nassert card[\"expires\"] and card[\"retrain_trigger\"], \"no expiry, no trigger - do not ship\"\n# Registry gate: promotion blocked unless the card version matches the model version.',
            'model_card.py',
            'python'
          ),
          warn(
            'A card written once and never versioned rots faster than no card',
            'Retraining, feature changes and threshold moves all require a card update; a registry that accepts a model without a matching card version manufactures exactly the stale-documentation problem it was meant to solve.',
          ),
          tip(
            'Run the five-question drill on every card',
            'A colleague who never saw the project must answer: what does it predict, for whom, what breaks it, how was it measured, what must never be done? Failing readers, not failing sections, is the test.',
          ),
        ],
        worked: {
          title: 'Filling the two hardest sections for a churn model',
          problem:
            'Draft the Intended use, Out-of-scope use, and the Quantitative analyses skeleton for the churn model of Lesson 10.1 (ranked outreach, 500 calls/day, PR-AUC primary). Include at least three out-of-scope lines with the reason each protects you, and design the evaluation table so a slice collapse cannot hide. Then say how the card is versioned and where it lives.',
          steps: [
            {
              title: 'Intended use',
              desc: 'Predicts P(non-renewal within 30 days) at 7 days before cycle end; output is a RANK for human outreach agents (top 500/day), in the consumer subscription product, for customers with 2+ completed cycles on the current pricing page. Users: retention agents and the ranking service. The score informs prioritisation only; offers, messaging and pricing remain human decisions.',
            },
            {
              title: 'Out-of-scope use (three with reasons)',
              desc: '(1) Customers with under 2 cycles - not represented in training; early-tenure behaviour differs and the model would fail silently on them. (2) Any automated cancellation, downgrade or collection action - the model is a probability from observational data, not a verdict; irreversible actions need human review and reason codes. (3) Re-scoring partner-app or post-pricing-change traffic without revalidation - feature distributions shift (the Module 9 PSI problem), so scores outside the audited distribution are unvalidated. Bonus line: do not use churn scores as labels to train downstream models - that compounds errors and hides the original metric.',
            },
            {
              title: 'Quantitative analyses skeleton',
              desc: 'Rows: overall, then each factor - tenure bands (2-4, 5-12, 13+ cycles), plan tier, region, language - including the protected-attribute audit cuts held under governance. Columns: n, PR-AUC, precision@500, calibration error (top decile), all with 95% intervals where n permits; cells with n < 100 flagged as insufficient rather than reported bare. A slice at 0.55 under an overall 0.90 cannot hide because the floor rule (Module 9) lives in the table: any cell below floor or more than 10 points under overall triggers review before release. Beside the table: qualitative error review (30 hand-checked cases per major subgroup) and the decisions taken from both.',
            },
            {
              title: 'Versioning and placement',
              desc: 'Header fields: model version, code commit, training window, evaluation window, owner, date - and every retrain, feature change or threshold move bumps a card version with a changelog entry. The registry blocks promotion without a matching card version. Placement: next to the deploy button, in the API documentation, linked from the runbook and the incident channel - findable at the moment of decision, not in a wiki nobody opens. Expiry date and retrain triggers are fields, so the card expires loudly alongside the model.',
            },
          ],
          solution:
            'Intended use: rank 2+ cycle subscribers for human outreach 7 days pre-renewal, top 500/day, PR-AUC primary. Out-of-scope: under-2-cycle customers (unrepresented), automated cancellation/collection (needs human review), unvalidated partner or post-pricing traffic (distribution shift), and feeding scores back as labels (error compounding). Evaluation table: overall + subgroup rows (tenure, plan, region, language), columns n / PR-AUC / precision@500 / calibration with intervals, floor rules enforced in-table, small-n flagged, qualitative error review beside it. Versioned with model version and commit, registry-gated, placed beside deploy and in the runbook, with expiry and retrain triggers as mandatory fields.',
        },
        practice: {
          title: 'Write a card for a model you already built',
          prompt:
            'Take any model from this course and write its full nine-section card with real content: provenance fields, intended use, five out-of-scope lines, factors and metrics with rationale, evaluation data windows and sizes, a disaggregated quantitative table with n, training procedure including features and split, ethical considerations, caveats with monitoring hooks and expiry. Then hand it to someone who has never seen the project and take notes on every question they ask that the card fails to answer - those are the revisions.',
          hint: 'If you cannot fill a section with specifics, that section is documenting a gap in the project, not a gap in your writing - which is exactly the information the card exists to surface.',
        },
        mistakes: [
          {
            mistake: 'Writing a vague out-of-scope section ("not intended for other uses")',
            fix: 'Name the populations, decisions and couplings you forbid, each with a reason - specific lines are checkable; generalities are unenforceable.',
          },
          {
            mistake: 'Reporting only the aggregate evaluation number',
            fix: 'The card exists to prevent this: disaggregated table with n and intervals, floor rules per cell, small-n cells flagged instead of averaged into comfort.',
          },
          {
            mistake: 'Documentation that is not versioned with the model',
            fix: 'Card version = model version; retrain, feature or threshold changes bump it; registry promotion blocked without a matching card. Changelog, not rewrite.',
          },
          {
            mistake: 'Listing metrics without saying why they were chosen',
            fix: 'Metrics follow the harm structure (Module 9): state the primary metric, the harm it protects against, and which fairness guarantees were not chosen and why.',
          },
          {
            mistake: 'Filing the card where nobody will find it during an incident',
            fix: 'Place it beside deploy, in the API docs and linked from the runbook; documentation that is not findable at the moment of decision does not exist.',
          },
        ],
        exam: {
          question:
            'List the nine model-card sections. Write three defensible out-of-scope lines for a ranked-outreach churn model, each with its reason. Design the quantitative analyses table so that a failing 2% slice cannot hide behind a 0.90 overall number, and state the versioning rule.',
          answer:
            'Sections: model details; intended use; out-of-scope use; factors and metrics; evaluation data; quantitative analyses; training data and procedure; ethical considerations; caveats and recommendations. Out-of-scope examples: (1) customers with under 2 cycles - absent from training, so scores are unvalidated for them; (2) automated cancellation or collection actions - probabilities are not verdicts, and irreversible actions require human review with reason codes; (3) partner-app or post-pricing-change traffic without revalidation - shifted feature distributions (PSI problem) invalidate the calibration. (Any of: using scores as downstream labels - compounds and hides error.) Quantitative design: rows = overall + every subgroup (tenure, plan, region, language), columns = n, PR-AUC, precision@500, calibration error, with confidence intervals; each cell checked against a pre-registered floor and a gap rule (cell more than 10 points below overall triggers review), so the 2% slice at 0.55 fires regardless of the overall 0.90; small-n cells flagged, never averaged. Versioning: the card carries model version, code commit and training window; every retrain or threshold change creates a new card version; the registry blocks promotion of a model whose card version does not match, and the card sits beside deploy with an expiry and retrain triggers as mandatory fields.',
          source: 'Interview-grade synthesis (model card structure + disaggregated evaluation).',
        },
        summary: [
          'Nine sections: details, intended use, out-of-scope, factors/metrics, evaluation data, quantitative analyses, training procedure, ethics, caveats - each prevents a named failure.',
          'Out-of-scope must name populations, decisions and couplings with reasons - specific lines are enforceable, generalities are not.',
          'The quantitative table is disaggregated with n, intervals, floors and gap rules so no slice can hide behind the aggregate.',
          'Metrics are justified by harm, not habit; small-n cells are flagged, never averaged into comfort.',
          'Version the card with the artefact: registry-gated, changelog-bumped, placed where decisions happen, expiring with the model.',
        ],
      }),
      [
        [
          'The primary purpose of the out-of-scope use section is to:',
          [
            'Make the document look complete',
            'Name the specific populations, decisions and couplings that must not be used, with reasons - so foreseeable misuse is documented and enforceable rather than defended as unimagined',
            'Replace the need for monitoring',
            'Satisfy a word-count requirement',
          ],
          1,
          'Only named, checkable prohibitions can be enforced and audited; "not intended for other purposes" stops nobody and proves nothing.',
        ],
        [
          'Your model reports overall PR-AUC 0.41 with a subgroup cell (n = 940) at 0.24. The card should show:',
          [
            'Only the overall number - the subgroup is too small to publish',
            'Both numbers with n and a flag/decision for the subgroup cell - small-n cells are flagged and reviewed, never averaged into the aggregate',
            'The subgroup averaged with a neighbour to raise n',
            'Neither, until the next retrain',
          ],
          1,
          'Disaggregation with n and an explicit handling (flag, floor rule, route-to-human) is the whole point of the quantitative section; hiding or pooling small cells is how slice failures hide.',
        ],
        [
          'The versioning rule for model cards is:',
          [
            'Update the card once a year',
            'Card version equals model version: any retraining, feature change or threshold move bumps the card, and the registry blocks promotion without a matching version',
            'Only the model version matters; the card can lag',
            'Cards are per team, not per model',
          ],
          1,
          'Documentation and artefact must travel together: a promoted model with a lagging card recreates the stale-documentation problem the card exists to solve.',
        ],
        [
          'A colleague who has never seen the project cannot answer "what must never be done with this model" from the card. This means:',
          [
            'The card is fine; they should read the code',
            'The card fails its readership test - revise the out-of-scope and caveats sections until the five-question drill passes',
            'The model needs retraining',
            'Nothing; cards are for auditors only',
          ],
          1,
          'The five-question drill (predicts what, for whom, what breaks it, how measured, what is forbidden) is the adequacy test: a card written for its author, not its readers, does not prevent anything.',
        ],
      ]
    ),
    lesson(
      M10,
      'mlf-10-4',
      104,
      'Capstone Defence and the Classic Ten Interview Questions',
      'The final drill: defending an end-to-end ML system under attack, with the ten questions that recur in interviews - and what a strong answer for each actually contains.',
      22,
      nineBlocks({
        objectives: [
          'Structure a ten-minute defence of a complete ML system from framing to monitoring',
          'Respond to the standard attack sequence (leakage, skew, split, drift, metric mismatch) with concrete checks',
          'Answer the classic ten interview questions with definitions, arithmetic and examples rather than slogans',
          'Diagnose an "offline great, production useless" incident as a systematic taxonomy',
        ],
        hook:
          'The final interview loop gives you 45 minutes and one prompt: "Walk me through a system you built, and then defend it - I will attack the weakest assumption." Candidates who trained on questions open with their architecture and hope. Candidates who trained on this course open with the framing page: the decision, the label timing rule, the baseline they beat, the split they used and why, the leakage they ruled out, the slices they monitored and the trigger that would retire the model. Every attack the interviewer can launch - leakage, skew, drift, overfitting, metric choice, fairness - has a named answer in that narrative, because the lifecycle IS the defence structure. The capstone is not a project format; it is this drill, performed on your own work until the attacks bounce off.',
        concept: `**The defence structure: ten minutes, five moves.** (1) **Frame** (90 seconds): decision, unit, prediction time, label timing rule, baseline and capacity - the page from Lesson 10.1, which pre-answers "what problem, for whom". (2) **Data and split** (2 minutes): sources, sizes, why the split matched the data (time-ordered for temporal, grouped for entities, stratified for rarity), and the leakage audit - name two features you banned and why. (3) **Modelling and selection** (2 minutes): baselines ladder, model family choice priced against the alternative, CV protocol, tuning budget and the anti-overfit discipline (nested or sealed holdout). (4) **Evaluation and honesty** (3 minutes): the primary metric with the harm rationale, the disaggregated table with n, calibration, error analysis in sentences, and what you would NOT claim from these numbers. (5) **Operations** (2 minutes): shadow/canary/ramp, the monitoring stack, retrain and retirement triggers, guardrails and the human-in-the-loop boundary. The attacks then have nowhere to land: every stage already carried its own defence.

**The attack sequence, and the check for each.** Interviewers probe in a rough order, and you should beat them to it: (1) "How do you know it is not leakage?" - label-shuffle test (skill must collapse to baseline), feature availability audit against prediction time, process-feature bans. (2) "Offline 0.95, production worse?" - taxonomy: train-test contamination, training-serving skew (backfill diff), wrong split (random on temporal/grouped data), drift since training (PSI), threshold or calibration mismatch (AUC fine, operating point wrong). Work the list in order; skew is the most common because it is silent. (3) "Why that split?" - deployment faces the future and unseen entities; random splits leak both. (4) "How do you know the number is not noise?" - baselines with spread (mean and sd across folds), selection-inflation arithmetic, sealed holdout for the final claim. (5) "What happens when it drifts?" - the Module 9 playbook plus triggers. (6) "What if it is unfair?" - per-group metrics with n, the chosen harm metric, mitigations and appeal path. Each answer is a procedure, not an opinion - that is what makes it senior.

**The classic ten, and what a strong answer contains.** These recur because they compress whole courses: (1) **Bias vs variance** - decomposition arithmetic plus the lever set per regime. (2) **L1 vs L2** - bill shape: ridge shrinks densely (stability), lasso zeroes (selection), elastic net the hybrid; scale first. (3) **Precision vs recall** - who pays for each error, with the threshold knob and one domain example each way. (4) **Imbalanced data** - why accuracy fails (the 99.6% example), then weights, threshold tuning, PR-AUC, resampling inside folds. (5) **Cross-validation** - what it estimates and when it is wrong (time, groups, nested selection). (6) **Bagging vs boosting** - variance reduction by averaging decorrelated learners vs sequential error chasing; random forest as the robust default, boosting as the accuracy default with depth/learning-rate discipline. (7) **Feature importance** - impurity vs permutation, their biases and caveats, never causation. (8) **Leakage** - the four families with a detection (shuffle test) and prevention (pipelines, time splits). (9) **Overfitting diagnosis** - train/val scores and learning curves deciding more data vs more capacity. (10) **Concept drift** - the three shifts, PSI thresholds, root-cause-first response. A strong answer has a definition, a number or procedure, and a boundary case - three sentences beats thirty.

**Capstone: defend an end-to-end system.** The project asks you to assemble the whole course into one artefact and survive the drill: a problem framed on the one-page spec, a leakage audit with banned features, a baseline ladder, a split protocol justified by the data structure, honest evaluation with slices and error analysis, a model card, a monitoring plan with thresholds and triggers, a rules-vs-ML justification with cost arithmetic, and a human-in-the-loop design with measured combined performance - then a recorded ten-minute defence answering the attack sequence from your own work. The goal is not a model that scores highest; it is a system whose every claim survives an adversarial reader. That is the whole course, performed once, on your own problem.`,
        extras: [
          table(
            'The classic ten interview questions and what a strong answer contains',
            ['#', 'Question', 'A strong answer contains', 'Weak answer sounds like'],
            [
              ['1', 'Bias vs variance', 'Decomposition with numbers; regime-specific levers (data vs capacity)', 'A slogan about a trade-off with no arithmetic'],
              ['2', 'L1 vs L2', 'Bill shape; sparsity vs shrinkage; scale first; elastic net', 'Lasso does selection, ridge does not - full stop'],
              ['3', 'Precision vs recall', 'Who pays for each error; threshold as the dial; domain example', 'Formulas only, no cost story'],
              ['4', 'Imbalanced data', 'Why accuracy fails; weights, thresholds, PR-AUC, in-fold resampling', 'Just use SMOTE'],
              ['5', 'Cross-validation', 'What it estimates; stratified/group/time variants; nested for selection', 'Ten folds is always better than five'],
              ['6', 'Bagging vs boosting', 'Averaging decorrelated learners vs sequential correction; when each wins', 'Random forest is older'],
              ['7', 'Feature importance', 'Impurity vs permutation, biases, group permutation, never causation', 'Read feature_importances_'],
              ['8', 'Leakage', 'Four families + shuffle test + pipelines/time splits as prevention', 'Sometimes data leaks - be careful'],
              ['9', 'Overfitting diagnosis', 'Train/val gap vs baseline + learning curve deciding the lever', 'Add regularisation'],
              ['10', 'Concept drift', 'Three shifts, PSI thresholds, root-cause before retrain', 'Retrain when accuracy drops'],
            ],
          ),
          tip(
            'Rehearse the attack sequence on your own project',
            'Ask yourself the six attacks in order - leakage, skew, split, noise, drift, fairness - and answer each with a procedure you actually ran. Unrun checks are opinions; the defence is the receipts.',
          ),
          warn(
            'Memorising answers without boundaries collapses under one follow-up',
            'Every strong answer ends with a boundary: when CV lies (time/groups), when SMOTE hurts, when fairness metrics conflict, when retraining is wrong. The follow-up question is where interviews are actually decided.',
          ),
        ],
        worked: {
          title: 'The "0.95 offline, useless in production" interrogation',
          problem:
            'Your classifier reports AUC 0.95 offline. In production it does no better than the existing rule. An interviewer asks you to explain it in one minute and then to specify the checks you would run, in order, with what each finding would mean. Cover: leakage families, split mismatch, training-serving skew, drift, and metric/threshold mismatch. Close with what monitoring would have caught it earlier and what you would report to your manager.',
          steps: [
            {
              title: 'Minute one: the taxonomy in one breath',
              desc: 'Five suspects, ordered by how often they explain this: (1) leakage - the test set was not a fair question; (2) split mismatch - random split on temporal or grouped data; (3) training-serving skew - different features online; (4) drift - the world moved after training; (5) metric mismatch - AUC was optimised but the operating point, calibration or capacity metric (precision@k) is what production measures. Offline numbers and production numbers can disagree for exactly these reasons, and each has a check.',
            },
            {
              title: 'Checks, in order',
              desc: '(1) Label-shuffle test: train with shuffled labels - if AUC stays high, leakage exists. Audit features against prediction time; look for process fields (post-contact flags) and full-window aggregates. (2) Recompute metrics on a time-ordered (and entity-grouped) holdout - if 0.95 drops to 0.78, the split was the lie. (3) Backfill: recompute training rows through the serving feature path and diff columns - mismatches quantify skew. (4) PSI on live features and scores vs training - above 0.25 says the inputs moved since training. (5) Compare at the operating point: precision@500/day, calibration by decile - AUC can hold while the threshold region you use is wrong (a calibration or prior shift, fixed by recalibration, not retraining).',
            },
            {
              title: 'What each finding means',
              desc: 'Leakage found = rebuild the evaluation and re-estimate everything; the 0.95 was fiction. Split mismatch = the honest number is the time/group-aware one; restate the project around it. Skew = fix the feature pipeline (shared definitions), then re-evaluate; no retraining needed. Drift = classify the shift (Module 9) before choosing repair. Metric mismatch = the model may be fine: recalibrate, re-tune the threshold against capacity and cost, re-measure with the metric production actually uses.',
            },
            {
              title: 'What would have caught it earlier, and the report',
              desc: 'Earlier: the backfill diff at training time (catches skew before launch), a time-aware holdout (catches split mismatch at evaluation), and the Module 9 monitoring stack (score PSI drifts daily, slice metrics on label cadence, canary comparison of model vs rule on identical traffic). Report in three lines: what the honest offline number is now, which defect class caused the gap, and the fix with a date - plus the process change (leakage checklist in the evaluation template, backfill test as a launch gate) so the next project cannot repeat it.',
            },
          ],
          solution:
            'One-minute answer: the gap comes from five places - leakage (unfair test), split mismatch (random split over time/entities), training-serving skew (different features online), drift (world moved), or metric/threshold mismatch (AUC vs calibration at the operating point). Checks in order: label-shuffle test and feature-timing audit; re-score on time/group-aware holdout; backfill-and-diff features through the serving path; PSI on live inputs/scores; then compare at the operating point (precision@500, calibration). Each finding maps to its repair: rebuild evaluation, restate the split, fix the feature pipeline, classify-then-repair drift, or recalibrate/re-tune. Prevention: leakage checklist in the template, backfill as a launch gate, canary model-vs-rule comparison, and the layered monitoring stack; report honest number, defect class, fix date, process change.',
        },
        practice: {
          title: 'Record the ten-minute defence',
          prompt:
            'Record yourself giving the five-move defence of your capstone (or any project you know end to end) in ten minutes flat. Then play the interviewer: attack leakage, split, skew, noise, drift and fairness - answer each out loud with a procedure you actually ran. Transcribe one weak answer and rewrite it as a three-sentence strong answer with a number and a boundary. Finally, answer the classic ten in writing, three sentences each, under exam conditions.',
          hint: 'Timings: 90s frame, 2m data/split, 2m model, 3m evaluation, 2m operations. If any move runs long, the underlying thinking is still hazy - cut until the receipts fit.',
        },
        mistakes: [
          {
            mistake: 'Opening a defence with architecture instead of framing',
            fix: 'Lead with decision, unit, prediction time, label rule, baseline - every later answer hangs off that page, and it pre-empts half the attacks.',
          },
          {
            mistake: 'Answering "offline vs production" with one guess',
            fix: 'Work the five-item taxonomy in order - leakage, split, skew, drift, metric mismatch - each with its own check; naming the class is half the credibility.',
          },
          {
            mistake: 'Quoting a single score as evidence of generalisation',
            fix: 'Baselines with fold spread, the right split, a sealed holdout and a selection-inflation check; the score is trustworthy only inside that scaffolding.',
          },
          {
            mistake: 'Reciting interview answers without boundary cases',
            fix: 'End each answer with when it stops being true (CV lies on time/groups; SMOTE can blur; fairness metrics conflict; retraining entrenches bugs) - the follow-up is where offers are decided.',
          },
          {
            mistake: 'A capstone project with no monitoring plan, model card or rules-vs-ML justification',
            fix: 'The lifecycle is the deliverable: card, thresholds, triggers, cost arithmetic and the human-in-the-loop boundary belong in the same submission as the model.',
          },
        ],
        exam: {
          question:
            'Lay out the five-move structure of a ten-minute ML system defence. Your model shows offline AUC 0.95 and production no better than the incumbent rule: give the five-suspect taxonomy, one check per suspect, and the repair implied by each finding. Then name three of the classic ten interview questions and outline each answer in two sentences.',
          answer:
            'Defence: (1) frame - decision, unit, prediction time, label timing rule, baseline, capacity; (2) data and split - sources, why time/group/stratified split, two banned features from the leakage audit; (3) modelling - baseline ladder, family choice, CV protocol, tuning budget; (4) evaluation - primary metric with harm rationale, disaggregated table with n, calibration, error analysis, limits of the claim; (5) operations - shadow/canary/ramp, monitoring stack, retrain and retirement triggers, HITL boundary. Taxonomy with checks: leakage - label-shuffle test plus feature-timing audit; rebuild evaluation if found. Split mismatch - re-score on time-ordered/entity-grouped holdout; restate the honest number. Training-serving skew - backfill training rows through the serving pipeline and diff; fix shared feature definitions, no retraining. Drift - PSI on features/scores vs training; classify the shift before repairing. Metric/threshold mismatch - compare at the operating point (precision@k, calibration); recalibrate or re-tune the threshold rather than retrain. Preventive: backfill as a launch gate, canary model-vs-rule comparison, layered monitoring. Classic three examples: bias-variance - expected error = bias squared + variance + noise, levers differ by regime (data for variance, capacity for bias); L1 vs L2 - ridge shrinks all coefficients for stability, lasso zeroes them for selection, always after standardising; leakage - four families (target, contamination, temporal, entity), detected by the shuffle test and prevented by pipelines and time-aware splits.',
          source: 'Capstone-aligned synthesis (defence structure + failure taxonomy + classic questions).',
        },
        summary: [
          'Five-move defence: frame, data/split with leakage audit, modelling, evaluation with slices and limits, operations with triggers - the lifecycle IS the defence structure.',
          'Offline-vs-production gap taxonomy: leakage, split mismatch, skew, drift, metric mismatch - each with its own check and its own repair.',
          'Baselines, fold spread, the right split and a sealed holdout are what make a single score quotable at all.',
          'The classic ten recur because they compress the course: answer with a definition, a number or procedure, and a boundary case.',
          'Capstone = one artefact carrying spec, audit, baselines, split, evaluation, card, monitoring, cost arithmetic and HITL design, defended under the attack sequence.',
        ],
      }),
      [
        [
          'Offline AUC 0.95, production no better than the incumbent rule. FIRST check:',
          [
            'Retrain with more trees',
            'Run the label-shuffle test and audit feature availability against prediction time - leakage is the most common cause of spectacular offline numbers',
            'Switch to ROC-AUC instead of PR-AUC',
            'Raise the production threshold immediately',
          ],
          1,
          'Leakage (test-set contamination, process features, future data) inflates every offline number; the shuffle test collapses skill to baseline when leakage exists, and the timing audit finds the offending columns.',
        ],
        [
          'The five-move structure of a ten-minute ML defence is:',
          [
            'Architecture, code walkthrough, results, questions, thanks',
            'Frame (decision, label rule, baseline), data/split with leakage audit, modelling, evaluation with slices and limits, operations with monitoring and triggers',
            'Model choice, tuning, score, demo, deployment',
            'Dataset, algorithm, accuracy, confusion matrix, conclusion',
          ],
          1,
          'The lifecycle is the defence structure: each move pre-answers its family of attacks, which is why a framing-led narrative survives interrogation better than an architecture tour.',
        ],
        [
          'Your time-series demand model uses random 5-fold CV and scores 0.94; deployment faces the future. The main problem is:',
          [
            'Five folds are too few',
            'Random folds put future rows in training and past rows in validation, so the score measures a world deployment will never see - use walk-forward or an expanding-window split',
            'Time series cannot use cross-validation',
            'The model must be a linear model',
          ],
          1,
          'Temporal leakage through the split inflates every fold: training has already seen what comes after validation. Walk-forward/expanding-window CV mirrors deployment, where only the past trains and only the future is scored.',
        ],
        [
          'A classifier on 1% positive data reports 99% accuracy. The correct response is:',
          [
            'Deploy - 99% is excellent',
            'Accuracy is meaningless here (always-negative scores 99%): report PR-AUC and precision/recall at the operating threshold, and treat baseline, class weights or resampling as the levers',
            'The dataset needs more negatives',
            'Switch to a decision tree',
          ],
          1,
          'The majority-class baseline is 99% accuracy with zero positives found - the metric rewards doing nothing. Rare-event work is judged by PR-AUC and operating-point precision/recall against that baseline.',
        ],
      ]
    ),
  ],
};
