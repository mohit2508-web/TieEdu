// Module 2 — How Machines Learn
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info } from '../nineBlocks';
import { lesson, M2, COURSE_ID } from './helpers';

export const module2: CourseModule = {
  id: M2,
  course_id: COURSE_ID,
  title: 'Module 2 — How Machines Learn',
  summary:
    'Learning from examples — features, labels, training data; the three learning paradigms with real examples; the train/validation/test discipline; and the overfitting/underfitting intuition that explains most bad models.',
  sort_order: 2,
  lessons: [
    lesson(
      M2,
      'lit-2-1',
      1,
      'Learning From Examples: Features, Labels and Training Data',
      'What a machine-learning dataset actually contains, how features and labels are chosen, and why data quality beats model cleverness in almost every real project.',
      16,
      nineBlocks({
        objectives: [
          'Define features, labels and training examples using a concrete dataset',
          'Turn a raw table into a features-plus-label description of a prediction task',
          'Explain at least three ways real training data goes wrong (leakage, bias, drift)',
          'Argue why a better dataset often beats a better model',
        ],
        hook:
          'A widely cited industry rule of thumb says data scientists spend most of their time cleaning and preparing data, not building models. Learners find that disappointing — they signed up to build AI, not to fix spreadsheets. Then their first project ships a model that scores brilliantly offline and fails in production, and they discover the rule of thumb was generous: data is not part of the job, it is the job.',
        concept: `**The anatomy of an example.** Machine learning means learning a function from examples, and every example has the same anatomy: a set of **features** (the inputs — numbers or categories describing the situation) and a **label** (the output you want the model to predict). Predict whether an email is spam? Features: word counts, sender domain, time sent, number of links. Label: 1 for spam, 0 for not. Predict tomorrow's delivery time? Features: route, hour, day, weather, historical segment speeds. Label: actual minutes. The model's whole job at prediction time is: take new features, output a prediction — learn the arrow features → label from thousands of labelled arrows.

**Features are a design decision, not a given.** Raw data rarely arrives as ready features. A "customer" row becomes features like recency of last purchase, purchase frequency, average order value. A photo becomes a grid of pixel values (or, in modern systems, embeddings a neural net computed). Choosing features is choosing what the model is allowed to see — and what it can possibly learn. Miss a predictive feature and no model can recover it; include a leaky one and every model will cheat (more below). Feature engineering used to be the core craft of classical ML; deep learning partially automated it by learning representations from raw pixels and characters, but the human still chooses *which* raw data enters the pipe and how the task is framed.

**Labels: where the money goes.** Labels are expensive — someone or something must produce the truth. Options each carry tradeoffs: human annotation (accurate-ish, slow, costly, annotator disagreement is real), user behaviour as implicit labels (cheap, abundant, biased toward engagement), existing databases (fast, inherits historical errors), or heuristics/rules (cheap but circular — the model can at best learn to imitate your rules). A famous cautionary tale pattern: a hospital built a model to predict which patients need extra care; the labels came from "who cost the most last year", which is a cost proxy, not a need proxy — the model learned to find expensive patients, not sick ones. The label choice *is* the task definition.

**Why data quality beats model cleverness.** Two teams on the same task: one tries three standard algorithms with clean, well-chosen features and trustworthy labels; the other uses a cutting-edge model on messy, leaky, biased data. Team one wins, usually by a wide margin, usually every time. Models are commodity components; data is specific to your problem. The failure modes are all data-shaped: **label errors** teach the model wrong associations; **selection bias** means training data does not represent deployment (training on desktop clicks, deploying to phones); **leakage** means a feature secretly contains the answer (a "churn prediction" feature that records whether the customer already cancelled); and **drift** means yesterday's data no longer matches today's world (a fraud model trained before a new payment method exists). None of these show up as a crash — they show up as a model that works and quietly lies.

**The practical mindset.** Before choosing a model, interrogate the dataset: Where did the rows come from? Who labelled them and how? Could any feature encode the future or the answer? Does the training population match the deployment population? What will change in six months? This is not bureaucracy — it is the actual leverage in a machine-learning project.`,
        extras: [
          table(
            'One dataset, named properly',
            ['Column', 'Role', 'Notes'],
            [
              ['sender_domain', 'Feature', 'Categorical; high-cardinality — needs encoding or hashing'],
              ['link_count', 'Feature', 'Numeric; cheap and surprisingly informative for spam'],
              ['hour_sent', 'Feature', 'Numeric/cyclic; spam timing patterns exist'],
              ['label_spam', 'Label', 'The target; came from user "report spam" clicks — biased but cheap'],
              ['user_marked_spam_at', 'Future info', 'Must be excluded at prediction time — leakage if used as a feature'],
            ],
          ),
          warn(
            'Leakage is the silent killer',
            'A feature that would not exist (or would be knowable) at real prediction time will make your offline metrics spectacular and your production model useless. Whenever a model scores "too good", your first suspect is leakage.',
          ),
          tip(
            'Data-first project order',
            '1) Write the prediction in one sentence (features in, label out). 2) Build a tiny dataset by hand and inspect 50 rows. 3) Establish a dumb baseline (majority class, simple average). 4) Only then try models. This order prevents weeks of elegant work on an unsound task.',
          ),
        ],
        worked: {
          title: 'Design the dataset before the model',
          problem:
            'A college wants to predict which students will fail a course so advisors can intervene. Sketch the features, the label, and name two leakage risks.',
          steps: [
            {
              title: 'Write the task',
              desc: 'Predict at week 4 of the semester: P(student fails final course grade) using only information available by week 4.',
            },
            {
              title: 'Features (available by week 4)',
              desc: 'Attendance count so far, assignment submission counts and scores, LMS login frequency, prior-semester GPA, credits carried, distance from home (optional, sensitive).',
            },
            {
              title: 'Label',
              desc: 'End-of-semester outcome: fail (D/F/withdraw) vs pass — from the registrar, defined before modelling.',
            },
            {
              title: 'Leakage risks',
              desc: '(1) Any feature recorded after week 4 (final attendance, later assignment scores) leaks the future. (2) A feature like "advisor already flagged this student" leaks prior human decisions the model should replace, creating a self-fulfilling loop.',
            },
            {
              title: 'Bias check',
              desc: 'Training on past cohorts embeds past intervention effects and demographic patterns. Define the intervention, audit subgroup false-positive rates, and treat predictions as triage for human advisors, not automatic judgements.',
            },
          ],
          solution:
            'A week-4 features snapshot, a registrar-defined fail label, and an explicit ban on post-cutoff and prior-decision features. The dataset design — cut-off date, label definition, leakage audit — determines whether the model can be trusted at all; the algorithm is the easy part.',
        },
        practice: {
          title: 'Spec a dataset for something you care about',
          prompt:
            'Choose one prediction you could plausibly make in your own life or campus (bus delay, exam readiness, club event turnout). Write: one-sentence task, 5–8 features with their sources, the label and how you would obtain it, and two things that could poison the data. Do not build a model.',
          hint: 'If you cannot get even 50 honest labelled examples by hand, the project is not ready for ML — pick a simpler task or a cheaper label source.',
        },
        mistakes: [
          {
            mistake: 'Choosing the model first and bending the data to fit it',
            fix: 'The task (features → label) comes first. Model choice is a late, boring, benchmarkable decision — not the creative core of the project.',
          },
          {
            mistake: 'Using features computed after the prediction moment',
            fix: 'Define the prediction time explicitly, then audit every feature against it. Anything knowable only later is leakage — delete it.',
          },
          {
            mistake: 'Treating any available column as a label',
            fix: 'Labels must match the decision you actually want to make. "High cost" is not "high need"; "clicked" is not "satisfied". Name the target like a product decision.',
          },
          {
            mistake: 'Ignoring who is missing from the data',
            fix: 'Selection bias hides in collection: only survey responders, only paying users, only scanned documents. If deployment adds a population the data lacks, expect silent failure there.',
          },
        ],
        exam: {
          question:
            'A bank builds a loan-default model; among the columns is `recovered_amount`, populated only after a default occurs and collection succeeds. Why is this a problem, and what is the general principle?',
          answer:
            '`recovered_amount` is unknown at application time — it exists only in the label\'s future. As a feature it leaks information downstream of the outcome, inflating offline metrics and collapsing in production where the column does not yet exist. General principle: every feature must be knowable at the exact moment the prediction will be made; anything derived from the outcome or from post-decision data must be quarantined to the label side of the split.',
          source: 'Classic leakage interview question in banking and fintech ML rounds.',
        },
        summary: [
          'ML learns the arrow features → label from thousands of labelled examples.',
          'Features are designed; labels are chosen; both are the real creative decisions.',
          'Bad labels teach bad models — the label defines the task as much as your prompt does.',
          'Leakage, selection bias and drift are the three data poisons; none crash, all lie.',
          'Clean, representative, well-specified data beats model cleverness in nearly every real project.',
        ],
      }),
      [
        [
          'In a spam-detection dataset, "number of links in the email" is an example of a:',
          ['Label', 'Feature', 'Loss function', 'Hyperparameter'],
          1,
          'It is an input describing the example; the label would be spam / not-spam.',
        ],
        [
          'A churn model uses a feature "cancellation_confirmed_date". The customer is being scored BEFORE they cancel. This is:',
          [
            'A strong predictive feature',
            'Data leakage — the feature is unknowable at prediction time',
            'A useful proxy label',
            'Normal feature engineering',
          ],
          1,
          'The column only exists downstream of the outcome; including it inflates offline metrics and cannot exist in production scoring.',
        ],
        [
          'Why is the choice of label especially consequential?',
          [
            'Labels determine which algorithm you may use',
            'The label literally defines what the model is optimised to predict',
            'Longer labels train slower models',
            'Labels only matter for unsupervised learning',
          ],
          1,
          'Predicting "high cost" instead of "high need" produces a different system entirely — the model will faithfully chase whatever target you supply.',
        ],
        [
          'Which is MOST likely to improve a stuck ML project?',
          [
            'Switching to a larger neural network',
            'Auditing and fixing label errors and training/deployment mismatch',
            'Adding more GPU hours',
            'Rewriting the code in a faster language',
          ],
          1,
          'When metrics stall, data problems (labels, leakage, population mismatch) usually dominate algorithm tweaks.',
        ],
      ]
    ),
    lesson(
      M2,
      'lit-2-2',
      2,
      'The Three Ways Machines Learn: Supervised, Unsupervised, Reinforcement',
      'The learning paradigms distinguished by what feedback the learner gets, with concrete examples of each and guidance on which question each answers.',
      17,
      nineBlocks({
        objectives: [
          'Classify a learning problem as supervised, unsupervised, or reinforcement based on its feedback signal',
          'Give a real-world example of each paradigm and state what the feedback is',
          'Explain semi-supervised and self-supervised learning as practical blends',
          'Match a business question to the correct paradigm and output type',
        ],
        hook:
          'Three identical-looking projects can be three different species. "Predict tomorrow\'s stock price", "group our customers into segments", and "teach a robot to walk" all look like "AI work" on a slide. But the first has labels, the second has none, and the third has neither labels nor a teacher — only a score that arrives after a lifetime of trying. Which species you are in determines your data, your metrics, and your chances.',
        concept: `**Supervised learning — learning with a teacher.** You have a dataset of examples where someone has already provided the correct answer: the **label**. Learn the function features → label so you can predict labels for unseen examples. Two classic shapes: **classification** (discrete answers — spam/not-spam, disease/no-disease, which digit is this?) and **regression** (continuous answers — price in rupees, delivery minutes, temperature). Roughly the commercially dominant form of ML, because most business questions are supervised: will this user churn, is this transaction fraud, how long will this take. The catch is always labels: supervised learning trades annotation cost for a clear target and clear metrics.

**Unsupervised learning — learning without a teacher.** You have examples but no labels, and the goal is to find structure in the data itself. The flagship task is **clustering**: group customers by purchase behaviour without telling the algorithm what the segments should be (k-means and its relatives); the groups are yours to interpret and name. Other unsupervised jobs: **dimensionality reduction** for visualising high-dimensional data in 2-D (PCA, t-SNE, UMAP); **anomaly detection** — find the transactions that do not fit any cluster (fraud, machine failure, network intrusion); **topic modelling** over documents. The eternal difficulty of unsupervised learning: there is no ground-truth score for "correct clusters". Two algorithms can both be right with different granularities. Unsupervised output is a lens for a human, not an answer to grade.

**Reinforcement learning — learning by doing and scoring.** No teacher labels each action. Instead, an **agent** takes **actions** in an **environment**, receives **rewards** (or penalties), and learns a **policy** — a strategy for choosing actions that maximises cumulative reward. Classic examples: AlphaGo (reward = winning the game); robotics locomotion (reward = forward progress minus falling); recommendation systems framed as bandits (reward = engagement); RLHF in chatbots (reward = human preference ratings of answers). RL\'s signature features: **delayed reward** (the good opening move in Go pays off 50 moves later), **exploration vs exploitation** (try something new vs repeat what worked), and often enormous sample needs — simulated environments or massive parallel training are usually required. It is the paradigm that matches how you actually teach a skill: not by labelling every step, but by grading outcomes.

**The blends that run the world.** Pure paradigms are textbook-clean; production is blended. **Self-supervised learning** manufactures labels from the data itself — predict the next word in a sentence (the label is the word that follows: supervision without human annotation). This is how every large language model is pretrained, and it blurs supervised and unsupervised more than any other idea in modern ML. **Semi-supervised learning** labels a little, propagates structure to the rest. **Active learning** asks a human to label only the examples the model is least sure about — cutting annotation cost dramatically. When someone says "we use AI", asking "which paradigm?" is a shortcut to understanding what they built, what data they needed, and what they can claim about it.`,
        extras: [
          table(
            'The three paradigms compared',
            ['Aspect', 'Supervised', 'Unsupervised', 'Reinforcement'],
            [
              ['Feedback', 'Correct labels for each example', 'None — structure only', 'Reward/penalty after actions'],
              ['Typical task', 'Classify, regress', 'Cluster, reduce, detect anomalies', 'Control, optimise sequences of decisions'],
              ['Output', 'Prediction per input', 'Groups / structure / scores', 'A policy (action strategy)'],
              ['Success metric', 'Accuracy, F1, RMSE', 'Silhouette, domain utility, human judgement', 'Cumulative reward, task success rate'],
              ['Real example', 'Spam filter, price prediction', 'Customer segments, fraud outliers', 'Game-playing AI, RLHF-tuned chatbots'],
            ],
          ),
          info(
            'Self-supervised: the modern workhorse',
            'LLMs are trained by hiding part of the data and predicting it — next word, missing span, next image patch. The labels come free from the data itself. This is why internet-scale corpora became trainable: no human had to label a trillion sentences.',
          ),
          tip(
            'Classify by feedback, not by buzzword',
            'Ignore what the deck calls the project. Ask: "what signal teaches the system?" Labels → supervised. No signal, structure-hunting → unsupervised. Sequential actions + delayed score → reinforcement. This single question resolves almost every classification argument.',
          ),
        ],
        worked: {
          title: 'Classify three project proposals',
          problem:
            'Classify each and name the output: (a) "Score each UPI transaction 0–100 for fraud using five years of labelled cases", (b) "Group our 40,000 retail customers into behaviourally distinct segments for a marketing test", (c) "Get a chatbot\'s answers ranked closer to human raters\' preferences".',
          steps: [
            {
              title: '(a) Fraud scoring',
              desc: 'Supervised, regression-flavoured (or classification if thresholded). Feedback: historical labelled fraud/legit cases. Output: a per-transaction score.',
            },
            {
              title: '(b) Customer segments',
              desc: 'Unsupervised clustering. Feedback: none — no one labelled segments. Output: group assignments that humans must interpret and validate against business reality.',
            },
            {
              title: '(c) Chatbot preferences',
              desc: 'Reinforcement learning (specifically RLHF). Human raters compare answers; that preference data trains a reward signal; the model is updated to maximise it. Output: a tuned model/policy. Note the pipeline also contains supervised steps — more in Module 5.',
            },
          ],
          solution:
            '(a) Supervised — labels exist, output is a score. (b) Unsupervised — no labels, output is groups for humans to judge. (c) Reinforcement — action = answer, reward = human preference, output = an improved response policy. The feedback signal, not the topic, decides the paradigm.',
        },
        practice: {
          title: 'Paradigm-hunt in job posts',
          prompt:
            'Find three real "AI/ML intern" or junior job descriptions. For each, infer the paradigm from the described work (data, tasks, metrics), write one sentence justifying your call, and note any signal that suggests the posting itself confuses paradigms.',
          hint: 'Phrases like "labelled dataset", "accuracy/F1" suggest supervised; "segment", "cluster", "explore structure" suggest unsupervised; "reward", "preference", "agent", "trial and error" suggest RL.',
        },
        mistakes: [
          {
            mistake: 'Calling every group-finding task "classification"',
            fix: 'Classification needs labels to learn from. Grouping unlabelled customers is clustering — the segments are discovered, not predicted from a supervised target.',
          },
          {
            mistake: 'Thinking reinforcement learning means "the model reinforces good answers in a chat"',
            fix: 'RL has a precise meaning: sequential actions, delayed reward, policy learning. "Reinforcement" in casual speech is not the paradigm; RLHF is.',
          },
          {
            mistake: 'Assuming unsupervised learning needs less care because "there are no labels"',
            fix: 'Evaluation is harder, not easier. Garbage-in still produces clusters — of the garbage. Feature choice and validation by domain inspection become the whole game.',
          },
          {
            mistake: 'Ignoring blends (self-supervised, semi-supervised, RLHF) when forced to pick one label',
            fix: 'Real pipelines are staged: self-supervised pretrain, supervised fine-tune, reinforcement preference-tune. Name the stage you mean; do not force the whole system into one box.',
          },
        ],
        exam: {
          question:
            'Classify and justify: a delivery company (i) predicts courier delivery time per order, (ii) discovers regional demand clusters for warehouse planning, (iii) learns courier-assignment rules online from customer ratings and late-delivery penalties.',
          answer:
            '(i) Supervised regression — labelled historical deliveries provide features → minutes. Output: a per-order time prediction. (ii) Unsupervised clustering — no labels; the algorithm groups regions by demand patterns and humans interpret the clusters. (iii) Reinforcement learning — assignment decisions (actions) followed by delayed rewards/penalties (ratings, lateness); the system learns an assignment policy to maximise cumulative reward. If forced to pick the paradigm of the whole company: it is a supervised-first ML shop with one RL-flavoured optimisation layer.',
          source: 'Typical multi-part classification question in operations-analytics interviews.',
        },
        summary: [
          'Supervised = labels; shapes into classification and regression; the commercial default.',
          'Unsupervised = structure without labels (clustering, anomaly detection, visualisation); humans judge success.',
          'Reinforcement = actions plus delayed reward, learning a policy; the paradigm of games, control, and RLHF.',
          'Self-supervised training (predict the hidden part) is how LLMs learn at internet scale with no human labels.',
          'Diagnose any project by its feedback signal, not its buzzword.',
        ],
      }),
      [
        [
          'Predicting a house price in rupees from its features is best described as:',
          [
            'Supervised classification',
            'Supervised regression',
            'Unsupervised clustering',
            'Reinforcement learning',
          ],
          1,
          'Continuous numeric target from labelled examples = supervised regression.',
        ],
        [
          'Grouping unlabeled customers into behavioural segments is an example of:',
          ['Supervised classification', 'Reinforcement learning', 'Unsupervised clustering', 'Semi-supervised labelling'],
          2,
          'No labels exist; the algorithm discovers groups, and humans interpret them.',
        ],
        [
          'In reinforcement learning, the learner receives:',
          ['A correct label after every action', 'A delayed reward or penalty signal', 'Human-written rules', 'Nothing — it memorises the data'],
          1,
          'RL feedback is evaluative (good/bad outcome), often delayed across a sequence of actions, not instructional labels.',
        ],
        [
          'How do large language models obtain supervision for pretraining?',
          [
            'Humans label each sentence',
            'Self-supervised learning — predict text hidden in the data itself (e.g. the next token)',
            'Reinforcement learning from day one',
            'They are not trained on data',
          ],
          1,
          'Labels are manufactured from the corpus: the model predicts the next token, and the actual next token supervises it — no human annotation needed.',
        ],
      ]
    ),
    lesson(
      M2,
      'lit-2-3',
      3,
      'Train, Validation, Test: Why You Never Test on Training Data',
      'The three-way split, cross-validation, the honest-metrics mindset, and how leakage through the split produces models that are secretly useless.',
      15,
      nineBlocks({
        objectives: [
          'Split a dataset into train/validation/test sets and state the purpose of each',
          'Explain why training accuracy is not evidence of real-world performance',
          'Use a validation set correctly for model selection without contaminating the test set',
          'Describe k-fold cross-validation and when it earns its cost',
        ],
        hook:
          'A classic interview trap: "Your model scores 99% accuracy on the data it trained on. What have you learned?" The right answer is: almost nothing. A sufficiently large model can memorise its training data — including the labels of noise — and still fail on every new example. The question is not whether you scored well on the data you studied; it is whether you scored well on data you deliberately kept hidden from yourself.',
        concept: `**The core idea: hide data from yourself.** A model's job is to perform on examples it has never seen. So the evaluation ritual mirrors that: hold out data the model is not allowed to train on, then measure on the held-out part. The standard three-way split: **training set** (the model learns parameters from this — usually the largest slice, commonly 60–80%); **validation set** (used during development to compare models, choose settings, and decide when to stop — the model never trains on it, but *you* tune against it repeatedly); **test set** (untouched until the very end — a single, honest report card for the final chosen model, and ideally used once).

**Why training accuracy lies.** Training metrics measure how well the model fit the data it saw — including its noise. A model complex enough can nearly memorise the training set: perfect scores, zero real skill. The gap between training performance and held-out performance is the first health indicator you should look at. If training is 99% and validation is 72%, you are not "nearly done" — you have a generalisation problem (more in the next lesson).

**The validation set is not a free lunch either.** Every time you check validation performance and change something, information about the validation set leaks into your decisions. Check it fifty times across fifty architectures and your "validation" score becomes optimistic — you have overfit *to the validation set* through your own iteration. This is why the test set must stay sealed: it measures the whole pipeline (model + your tuning process) on data that influenced nothing. When people "iterate on the test set" (peek, tweak, peek), test scores decay into validation scores and the final number stops meaning anything.

**Cross-validation: when data is scarce.** With limited data, a single split is noisy — unlucky splits make good models look bad. **k-fold cross-validation** splits the data into k parts (commonly 5 or 10), trains k times, each time holding out one part, and averages the scores. You get a stabler estimate and use every example for both training and evaluation across folds. Costs k times the compute, so on huge datasets a single split (or a time-based split) is preferred. One special case matters in practice: **time-series and event data must be split by time, not randomly** — train on months 1–9, validate on month 10, test on month 11. Random splits let the future leak into the past and inflate every metric.

**Data leakage through the split.** Leakage is not only bad features (Lesson 2.1); it is also bad splitting. Two classic forms: **group leakage** — near-duplicate rows (same patient's multiple scans, same user's many transactions, same article in train and test) let the model recognise rather than generalise; fix by splitting by group (patient, user, document). **Preprocessing leakage** — computing scaling, encoding or feature transforms on the full dataset before splitting; fix by fitting preprocessing on training only, then applying it to validation and test. Both produce beautiful offline numbers and ugly production numbers.

**The discipline in one sentence:** train on train, choose on validation, report on test, split by time or group when the data demands it, and touch the test set like it is a sealed exam envelope — once.`,
        extras: [
          table(
            'What each split is for (and forbidden from)',
            ['Split', 'Model trains on it?', 'You tune on it?', 'Purpose'],
            [
              ['Training', 'Yes', 'Indirectly', 'Parameter learning'],
              ['Validation', 'No', 'Yes — repeatedly', 'Model/hyperparameter selection, early stopping'],
              ['Test', 'No', 'No — once', 'Final honest estimate of the whole process'],
            ],
          ),
          warn(
            'Preprocessing must happen inside the split',
            'Normalising with the mean of the whole dataset (before splitting) leaks test information into training. Fit scalers, encoders and feature transforms on train only; apply the fitted transform to val/test.',
          ),
          tip(
            'Sanity check: shuffle the labels',
            'Train with labels randomly shuffled. If your pipeline still gets well above chance accuracy, you have leakage somewhere — the model is reading the answer through a side channel. This 10-minute test has caught million-rupee mistakes in industry.',
          ),
        ],
        worked: {
          title: 'Set up an honest evaluation for a course-failure predictor',
          problem:
            'You have 8,000 historical student records spanning five academic years and want to predict course failure for next year. Design the split, the tuning process, and the final report.',
          steps: [
            {
              title: 'Split by time, not randomly',
              desc: 'Train: years 1–3 (≈4,800 rows). Validation: year 4 (≈1,600). Test: year 5 (≈1,600). Next year\'s students are the future — the split should mimic that.',
            },
            {
              title: 'Group check',
              desc: 'If a student appears in multiple courses/years, keep each student entirely within one split (group by student id) so the model cannot recognise individuals across sets.',
            },
            {
              title: 'Tune on validation only',
              desc: 'Try three model families and a handful of settings; compare validation scores; pick the best and freeze it. Do not touch test yet.',
            },
            {
              title: 'Final evaluation',
              desc: 'Run the frozen pipeline once on the year-5 test set. Report that number, plus subgroup metrics (by department, by prior GPA band) — overall accuracy can hide concentrated failures.',
            },
          ],
          solution:
            'Chronological split (years 1–3 train, year 4 validation, year 5 sealed test), group-by-student integrity, tuning confined to validation, one final test evaluation. The test score is your best available estimate of next year\'s performance — because nothing in the pipeline ever saw year 5.',
        },
        practice: {
          title: 'Run the label-shuffle test mentally, then for real if you can',
          prompt:
            'Take any small labelled dataset (the classic Iris dataset ships with most ML libraries). Describe exactly how you would split it 60/20/20. Then, if you can run code: train a simple model on shuffled labels and record the training vs held-out accuracy. If you cannot run code, write what you predict would happen and why.',
          hint: 'With shuffled labels, training accuracy can climb toward 100% via memorisation while held-out accuracy collapses to chance (~33% on a 3-class problem).',
        },
        mistakes: [
          {
            mistake: 'Reporting training accuracy as the model\'s accuracy',
            fix: 'Training scores measure fit, not skill. Quote held-out (validation or test) numbers only — and say which split they came from.',
          },
          {
            mistake: 'Iterating on the test set ("just one more peek")',
            fix: 'Every peek tunes you to the test set. Freeze a protocol: develop on train/validation, evaluate on test once, and if you change the pipeline afterwards, the test result must be re-earned, not re-peeked.',
          },
            {
            mistake: 'Randomly splitting data that has time structure or repeated entities',
            fix: 'Use time-ordered splits for forecasting and event data; group splits when the same patient/user/document can appear multiple times.',
          },
          {
            mistake: 'Fitting scalers/encoders on the full dataset before splitting',
            fix: 'Fit preprocessing on the training fold only, then transform validation/test with the fitted objects. In libraries this is what Pipeline objects enforce automatically.',
          },
        ],
        exam: {
          question:
            'Your model scores 98% on training data and 71% on the validation set. Explain what this gap suggests, and describe what a correct next step is (and what an incorrect next step would be).',
          answer:
            'The gap indicates the model fits training data (including noise) far better than it generalises — a generalisation problem, typically overfitting, possibly worsained by tiny training data or excessive model capacity. Correct next steps: simplify the model, regularise, gather more data, engineer better features, or run learning curves to see whether more data would help; re-check for leakage that could distort either number. Incorrect next steps: report 98% as "the accuracy"; keep tuning against validation until it happens to hit 98% (overfitting the validation set); or "fix" the gap by training longer — which usually widens it.',
          source: 'Bread-and-butter ML interview question for internship and junior data-scientist roles.',
        },
        summary: [
          'Train to learn parameters; validate to choose; test once to tell the truth.',
          'Training accuracy is fit-to-data, not evidence of generalisation — the gap to validation is a health metric.',
          'Repeated tuning against validation leaks too; the sealed test set measures the entire process.',
          'Split by time for event data and by group when entities repeat; keep preprocessing inside the split.',
          'The label-shuffle test is your cheapest leakage detector — know it by heart.',
        ],
      }),
      [
        [
          'What is the primary purpose of the validation set?',
          [
            'To train the model\'s parameters',
            'To compare models and settings during development without training on it',
            'To report the final headline accuracy in a paper',
            'To increase the dataset size',
          ],
          1,
          'Validation guides selection and early stopping; the model never trains on it, but your decisions do consume its information.',
        ],
        [
          'Why must the test set ideally be used only once?',
          [
            'Test sets are too small to reuse',
            'Repeated peeking tunes your pipeline to the test set, turning its score into an optimistic validation score',
            'Computers cannot evaluate the same data twice',
            'The test set decays physically over time',
          ],
          1,
          'Each peek leaks information into your choices; the test stops being an independent estimate of generalisation.',
        ],
        [
          'For predicting next month\'s sales from two years of daily data, the correct split is:',
          [
            'Random shuffle 70/15/15',
            'Time-ordered: train on the past, validate on the recent past, test on the latest period',
            'All data for training, none for testing',
            'Test on the oldest month',
          ],
          1,
            'Forecasting must mimic deployment — the future is after the training window. Random splits leak future patterns into training.',
        ],
        [
          'A pipeline gets 95% accuracy even when labels are randomly shuffled. What does this indicate?',
          [
            'The model is exceptionally good',
            'Data leakage — a feature or split issue lets the model access the answer',
            'The dataset is too small',
            'The learning rate is too high',
          ],
          1,
          'Skill with shuffled labels is impossible; the only remaining explanation is a side channel from features/splits to the label.',
        ],
      ]
    ),
    lesson(
      M2,
      'lit-2-4',
      4,
      'Overfitting and Underfitting: When Models Learn Too Much or Too Little',
      'The bias–variance intuition without heavy math, the diagnosis via learning curves, and the practical levers that actually fix each side.',
      16,
      nineBlocks({
        objectives: [
          'Diagnose overfitting and underfitting from training vs validation performance',
          'Explain overfitting using the analogy of memorising past exam papers',
          'Name at least three practical fixes for overfitting and two for underfitting',
          'Describe the bias–variance tradeoff in plain language',
        ],
        hook:
          'You have done this yourself as a student, without any machine learning: you "trained" on exactly five past papers, memorised every answer, scored them perfectly — and walked into the real exam facing questions you had never seen. Your classmate solved only three papers but practised the general methods. She beat you. Overfitting is that mistake, committed by a model, at scale, with numbers attached.',
        concept: `**Underfitting: too simple to capture the pattern.** If a model cannot even fit the training data well — low training performance and low validation performance — it is underfitting. The cause is usually that the model is too simple for the structure in the data (a straight line for a curved relationship), trained too briefly, or starved of informative features. A temperature model that only knows "is it summer?" underfits. The feel of underfitting in a product: the system is mediocre at everything, obviously missing patterns that are right there in the data. Fix: give it more capacity (a richer model), train longer, or add better features. Classic tell: both training and validation metrics are bad and close together.

**Overfitting: memorising the noise.** If training performance is excellent but validation performance is clearly worse, the model has learned the training data's *noise* — the random quirks that do not repeat in new data — along with (or instead of) the real pattern. A polynomial fitted through every noisy point of a small dataset will thread the needle on training data and zigzag wildly between points on new data. The feel of overfitting in a product: great demo on the data you showed, embarrassing failures elsewhere. Fix levers, in rough order of practicality: **more training data** (the single most reliable cure), **regularisation** (penalise complexity so the model cannot chase noise), **simpler models or early stopping** (stop training before noise gets memorised), **data augmentation** (create honest variety from existing data), and **dropout/ensembles** (modern neural-network regularisation; ensembles average out individual quirks). The classic tell: a wide gap between strong training metrics and weaker validation metrics.

**Bias–variance, said simply.** The bias–variance decomposition is the cleanest mental model of the two failures. **Bias error** = wrong assumptions about the form of the pattern (a linear model on nonlinear reality) → underfitting. **Variance error** = excessive sensitivity to the particular training sample (tiny changes in training data produce very different models) → overfitting. Real-world error is roughly bias² + variance + irreducible noise (some randomness no model can remove — coin flips, human mood). Simplifying the model lowers variance and raises bias; enriching it does the opposite. The art of ML is finding the middle where total error is smallest — which is also why "just use a bigger model" is not a universal answer: capacity helps until variance (and data-hunger) takes over.

**Diagnosis and the learning curve.** The diagnostic ritual: plot training and validation performance against model complexity or training time. Underfitting: both low, close together. Overfitting: training high, validation lags, often widening with more training. Healthy: both high, small stable gap. A **learning curve** (performance vs training-set size) tells you the fix: if more data would help, validation performance is still climbing as data grows; if it has plateaued, more data of the same kind will not save you — change the model or the features. One modern wrinkle worth knowing: very large neural networks sometimes *underfit* in the classical sense (they do not fully memorise even their training data) yet still generalise superbly — the "double descent" regime. The beginner-safe default remains the classical picture; know the exception exists, do not start there.

**Regularisation, in one image.** Think of a model with a budget: every point of complexity costs. Regularisation sets the price list so the model spends its capacity on the pattern that repeats and not on the noise that does not. Early stopping is the timeout version: stop before the model finishes memorising. Dropout is the ensemble version: randomly disable parts of the network during training so no single pathway can memorise idiosyncrasies. None of these add information — they constrain greed. When constraints fail, only more or better data remains.`,
        extras: [
          table(
            'Symptoms and fixes at a glance',
            ['Symptom', 'Diagnosis', 'First levers'],
            [
              ['Train low, validation low, gap small', 'Underfitting (high bias)', 'Richer model, better features, train longer'],
              ['Train high, validation much lower', 'Overfitting (high variance)', 'More data, regularisation, simpler model, early stopping'],
              ['Both fine offline, bad in production', 'Distribution shift or leakage — neither over nor underfitting', 'Audit data pipeline and split; re-check features'],
              ['Validation noisy across runs', 'Small validation set / unstable training', 'Cross-validation, seed averaging, more validation data'],
            ],
          ),
          tip(
            'The one-chart habit',
            'Always keep a plot of train vs validation metric over training time (or model size). It converts "the model feels bad" into a diagnosis in under a minute — and it is the first plot interviewers ask you to draw.',
          ),
          warn(
            'Data augmentation done wrong is memorisation with extra steps',
            'Augmentations must create realistic variety (image crops, synonym swaps that keep the label). Duplicates or near-duplicates inflate training scores and change nothing about generalisation.',
          ),
        ],
        worked: {
          title: 'Read a learning-curve situation and pick the fix',
          problem:
            'A team trains an image classifier: training accuracy 99.2%, validation accuracy 78.4%, and the gap grows as they train longer and as they add more layers. Their slide says "almost perfect — needs more training time". Diagnose and prescribe.',
          steps: [
            {
              title: 'Read the numbers',
              desc: 'Very high training accuracy with a much lower validation accuracy = classic overfitting. The widening gap with longer training confirms it: continued training memorises noise.',
            },
            {
              title: 'Check the proposed fix',
              desc: '"More training time" will make it worse, not better — memorisation deepens with epochs. More layers likely worsen variance too, unless data grows to match.',
            },
            {
              title: 'Prescribe',
              desc: 'Collect or relabel more diverse images; add augmentation; apply early stopping (save at best validation epoch); add regularisation (weight decay/dropout); or try a smaller pretrained model with transfer learning.',
            },
            {
              title: 'Verify',
              desc: 'Retrain and watch the gap: validation should rise and stabilise closer to training. If both are still low, revisit features/labels — that would flip the diagnosis toward underfitting.',
            },
          ],
          solution:
            'Overfitting, worsened by more capacity and more epochs. The fix is constraint and data — not duration. The team\'s slide confuses fit-to-training-data with skill; only the validation number speaks to skill.',
        },
        practice: {
          title: 'Fit two models in your head (or in a notebook)',
          prompt:
            'Take ten points that roughly follow a line with a little scatter. Describe what a straight-line fit would look like (bias?) and what a degree-9 polynomial through every point would do between the points (variance?). Which would you trust on a new point, and why? If you can run code, plot both.',
          hint: 'The degree-9 curve has near-zero training error and wild oscillations between data — zero-variance-free memorisation in one picture.',
        },
        mistakes: [
          {
            mistake: 'Treating "training accuracy still climbing" as a reason to train longer',
            fix: 'Watch validation. If validation has plateaued or fallen, more epochs only deepen memorisation — stop and change data, features or regularisation.',
          },
          {
            mistake: 'Assuming a bigger model always generalises better',
            fix: 'Capacity helps only if data and task warrant it; excess capacity with scarce data is overfitting on steroids. Match capacity to data volume and diversity.',
          },
          {
            mistake: 'Confusing distribution shift with overfitting',
            fix: 'If train and validation both look great but production fails, the world changed or the pipeline lies — more regularisation will not fix a shifted deployment population.',
          },
          {
            mistake: 'Augmenting by duplicating rows and calling it more data',
            fix: 'Duplicates change nothing. Augmentation must add realistic variation that preserves the label; otherwise you are just reweighting the same examples.',
          },
        ],
        exam: {
          question:
            'Explain overfitting and underfitting using the bias–variance framework, and give one remedy for each that is NOT "collect more data".',
          answer:
            'Underfitting is high bias: the model\'s assumptions are too simple to capture the pattern, so both training and validation error are high. Remedy: increase capacity or improve features (or train longer). Overfitting is high variance: the model is excessively sensitive to the training sample and memorises noise, so training error is low while validation error is high. Remedy: regularisation, early stopping, or a simpler model. (Collecting more data reduces variance as well, but the question excludes it.) Irreducible noise bounds both — some error remains no matter what.',
          source: 'Evergreen exam and interview question; appears in university ML finals and ML-engineering screens alike.',
        },
        summary: [
          'Underfitting: model too simple — low train and validation scores, small gap. Fix with capacity, features, training.',
          'Overfitting: model memorises noise — high train score, much lower validation. Fix with data, regularisation, early stopping, simplicity.',
          'Bias–variance: simplification trades variance for bias; the art is the middle where total error is lowest.',
          'Learning curves tell you the fix: climbing validation with more data means "get data"; a plateau means "change the model".',
          'Big modern nets can violate the classical picture — learn the default first, the exception second.',
        ],
      }),
      [
        [
          'A model has 99% training accuracy and 70% validation accuracy. This is the signature of:',
          ['Underfitting', 'Overfitting', 'Perfect generalisation', 'Data leakage only'],
          1,
          'A large train/validation gap means the model memorised training specifics (noise) that do not repeat in held-out data.',
        ],
        [
          'Both training and validation accuracy are around 55% on a task where 90% should be achievable. The most likely diagnosis is:',
          ['Overfitting', 'Underfitting', 'The validation set is too large', 'Success — deploy it'],
          1,
          'Low scores with a small gap mean the model cannot capture the pattern at all — classic underfitting (high bias).',
        ],
        [
          'Which action will MOST reliably reduce overfitting?',
          [
            'Training for more epochs',
            'Adding more layers with the same small dataset',
            'Gathering more diverse, representative training data',
            'Raising the learning rate sharply',
          ],
          2,
          'More representative data is the most reliable variance reducer; more epochs or capacity on the same data usually worsen memorisation.',
        ],
        [
          'In plain language, high bias in a model means:',
          [
            'It is unfairly skewed against a group',
            'Its built-in assumptions are too simple to capture the real pattern',
            'It has too much training data',
            'It changes its predictions too often across random splits',
          ],
          1,
          'Bias (in the statistical sense) is error from wrong oversimplified assumptions — underfitting. The other option (changing across splits) describes variance.',
        ],
      ]
    ),
  ],
};
