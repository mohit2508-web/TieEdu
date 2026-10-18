// Module 1 — ML Foundations: Problems, Paradigms, and Honest Evaluation
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code } from '../nineBlocks';
import { lesson, M1, COURSE_ID } from './helpers';

export const module1: CourseModule = {
  id: M1,
  course_id: COURSE_ID,
  title: 'Module 1 — ML Foundations: Problems, Paradigms, and Honest Evaluation',
  summary:
    'The four ML problem families and how to recognise them; the three learning paradigms distinguished by their feedback signal; the anatomy of a training set (features, labels, instances); and the two disciplines that keep you honest — data leakage detection and baseline-first evaluation.',
  sort_order: 1,
  lessons: [
    lesson(
      M1,
      'mlf-1-1',
      1,
      'What Machine Learning Solves: Regression, Classification, Clustering, Ranking',
      'The four task families every ML practitioner must recognise on sight, with the output type, evaluation metric, and real examples of each.',
      18,
      nineBlocks({
        objectives: [
          'Classify any ML proposal as regression, classification, clustering, or ranking and state its output type',
          'Name an appropriate evaluation metric for each of the four task families',
          'Turn a vague business request into a concrete ML task specification',
          'Explain why the task family determines the model family you may even consider',
        ],
        hook:
          'An interviewer slides a sheet of paper across the table: "We have click data from our shopping app. Build us AI." That is all. The correct next question is not "which algorithm?" — it is "do you want a number per user, a yes/no flag per session, hidden groups of users, or an ordered feed?" Four different answers, four different datasets, four different metrics, four different careers. Choosing the task family is the first technical decision in every ML project, and most bad projects die right here, before a single line of model code.',
        concept: `**Every ML problem is one of four shapes.** The field looks infinite in its applications and surprisingly narrow in its task types. Strip any ML project proposal down and you will almost always find one of four shapes underneath: predict a number (**regression**), predict a category (**classification**), discover hidden groups (**clustering**), or produce an ordered list (**ranking**). Learning to see the shape instantly is the single highest-leverage skill in the foundation stage — because the shape decides your label format, your loss function, your metrics, your model shortlist, and what "success" even means.

**Regression — predict a continuous quantity.** The label is a number on a continuous scale, and you want a number out. How much will this house sell for? How many minutes until the courier arrives? What will tomorrow's peak electricity demand be? The model outputs ŷ ∈ ℝ, and evaluation compares prediction to truth with error measures in the original units: **MAE** (mean absolute error — average rupee-sized miss, robust to outliers), **MSE/RMSE** (squared error — punishes big misses harder; RMSE puts the penalty back in original units), and **R²** (what fraction of the target's variance your model explains; 0 means no better than predicting the mean). Regression models the *magnitude* of an outcome. A classic beginner mistake is treating a discrete-count target ("how many complaints next month?") as either trivially regression or trivially classification — counts are their own family (Poisson-flavoured), but plain regression is a defensible first baseline when counts are large.

**Classification — predict a discrete label.** The label is one of a small set of categories. Binary: spam or not, default or not, tumor malignant or not. Multiclass: which digit (0–9), which department will this ticket go to, which disease. The model outputs either a hard label or a probability per class, and evaluation uses **accuracy** (only when classes are balanced — more on the trap in Module 2), **precision/recall/F1** (the workhorses when costs are asymmetric), and **ROC-AUC / PR-AUC** (threshold-free ranking quality). Note the tight relationship: a binary classifier that outputs probabilities is really producing a continuous score, and you *threshold* it to a label. That threshold is a business decision — catching fraud at 0.5 versus 0.1 catches different amounts of fraud and generates different amounts of false alarms.

**Clustering — discover structure without labels.** No one hands you the answer; the goal is to find groups that are internally similar and externally different. Customer segmentation by purchase behaviour, grouping sensor faults into failure types, organising documents into topics before anyone has a taxonomy. The output is a partition (or soft membership) of your data, and evaluation is the field's eternal pain: there is usually no ground truth to score against. Practitioners use internal measures (**silhouette** — how much closer points are to their own cluster than to the nearest other one), stability checks (does the clustering survive resampling?), and, most importantly, *domain usefulness* — does a human look at the segments and say "yes, these are real, actionable groups?" Clustering is a lens for human decision-making, not an answer machine.

**Ranking — order items by relevance.** The task is not "is this relevant?" in isolation but "given a query and a pool of candidates, produce the best *order*". Search results, recommender feeds, document retrieval, ad ordering. Ranking is built from classification-like relevance judgements but evaluated as sequences: **precision@k** (of the top k shown, how many are relevant), **MAP** (mean average precision across queries), **NDCG** (discounted gain — early positions matter more, graded relevance allowed). A system can be excellent at classifying each item independently and terrible at ranking if it does not calibrate scores across items. Ranking deserves its own lesson (and often its own engineer) precisely because the unit of quality is the *list*, not the item.

**How to decide, in practice.** Ask the stakeholder one question: "what will you do differently, per what unit?" A price on each house → regression per house. A red flag on each transaction → classification per transaction. A segment for a marketing campaign → clustering per customer cohort. A reordered home feed → ranking per session. Then write the one-sentence spec: *predict [label] from [features available at prediction time] for [unit], evaluated by [metric] on [held-out data]*. If you cannot fill in that sentence, you do not yet have an ML problem — you have a conversation you have not finished.`,
        extras: [
          table(
            'The four task families at a glance',
            ['Family', 'Output', 'Classic metrics', 'Real examples'],
            [
              ['Regression', 'A continuous number', 'MAE, RMSE, R²', 'House price, ETA in minutes, demand forecast'],
              ['Classification', 'A category (or probability per category)', 'F1, precision/recall, ROC-AUC', 'Spam, fraud, disease, ticket routing'],
              ['Clustering', 'Group assignments / memberships', 'Silhouette, stability, domain usefulness', 'Customer segments, document topics, fault types'],
              ['Ranking', 'An ordered list', 'precision@k, MAP, NDCG', 'Search results, recommender feed, ad order'],
            ],
          ),
          info(
            'Recommendation is usually ranking',
            'When someone says "build a recommender", the ML core is almost always a ranking problem: score candidate items for a user, then order them. The scoring model may be collaborative filtering, a gradient booster, or an LLM — the evaluation unit is still the ordered list.',
          ),
          tip(
            'Write the spec sentence before touching data',
            'Predict [label] from [features available at prediction time] for [unit], evaluated by [metric] on [held-out data]. Every blank you cannot fill is a decision you are postponing — and postponed decisions become leaky pipelines.',
          ),
        ],
        worked: {
          title: 'Classify five proposals into task families',
          problem:
            'A campus tech club receives five project proposals. For each, decide the family, the output unit, and a sensible primary metric.',
          steps: [
            {
              title: '(a) "Estimate each delivery rider\'s remaining time, in minutes"',
              desc: 'Regression — output is continuous minutes per delivery. Metric: MAE (easy to explain: "off by 6.2 minutes on average") or RMSE if large misses are extra costly.',
            },
            {
              title: '(b) "Flag each payment as fraud or not fraud, for the review queue"',
              desc: 'Binary classification per transaction — but note the output used operationally is a score sorted into a queue, so PR-AUC and precision@queue-length matter more than raw accuracy (fraud is rare).',
            },
            {
              title: '(c) "Group our 40,000 members into behaviourally distinct clusters for a newsletter test"',
              desc: 'Clustering — no labels exist; output is group memberships per member. Metric: silhouette plus human validation that segments are actionable.',
            },
            {
              title: '(d) "Order job-internship matches on each student\'s home screen"',
              desc: 'Ranking — each student session gets an ordered list of internship cards. Metric: NDCG@10 or click-based precision@5.',
            },
            {
              title: '(e) "Predict how many lab-session no-shows the department will have next month"',
              desc: 'Regression on a count (or a dedicated count model later). Unit: no-shows per month. Metric: MAE on held-out months. Count-specific: Poisson deviance is the specialised upgrade — know it exists, start with MAE.',
            },
          ],
          solution:
            '(a) regression · (b) classification · (c) clustering · (d) ranking · (e) regression (count-flavoured). Notice how each answer immediately implies a different label format, a different metric, and a different failure conversation with the stakeholder — the algorithm was never the deciding factor.',
        },
        practice: {
          title: 'Decompose three real requests',
          prompt:
            'Find three data-ish requests in your own life or campus ("predict exam results", "improve our club\'s Instagram", "reduce canteen queues"). For each: write the spec sentence, name the family, and state one metric you would argue for in the meeting. If a request is not ML-shaped at all, say so — "just average last year\'s numbers" is often the winning answer.',
          hint: 'If there is no label and no evaluation story, it may be a dashboard, an A/B test, or a rule — not an ML problem.',
        },
        mistakes: [
          {
            mistake: 'Jumping to algorithms before fixing the task family',
            fix: 'The family determines the loss, metric, and shortlist. "Use a neural net" is never the first decision; "regression on minutes, MAE, features from trip history" is.',
          },
          {
            mistake: 'Using accuracy for a rare-event classification problem',
            fix: '99% accuracy by always predicting "not fraud" on 1% fraud data is worthless. Use precision/recall/F1 or PR-AUC, and state the business cost of each error type.',
          },
          {
            mistake: 'Treating clustering output as ground truth',
            fix: 'Clusters are hypotheses for humans to validate. If no downstream decision changes based on the segments, the clustering has zero value regardless of its silhouette score.',
          },
          {
            mistake: 'Framing ranking as per-item classification and evaluating with accuracy',
            fix: 'The quality unit is the ordered list (precision@k, NDCG). Two systems with identical per-item AUC can differ hugely in top-of-list quality — that difference is the product.',
          },
        ],
        exam: {
          question:
            'A telecom company wants to "use AI to reduce customer churn". Rewrite this as an ML task specification: name the family, the unit, the label, and a primary metric — and name one non-ML alternative that should be considered first.',
          answer:
            'Family: binary classification (churn / no-churn) per subscriber per month; operationally a risk score sorted into a retention-call queue. Label: cancelled within the next billing cycle (defined before modelling, from historical records). Features: usage trends, complaints, tenure, plan, payment delays — all available at scoring time. Primary metric: PR-AUC or precision@top-N-call-list (churn is rare, and the call list is finite), plus the business metric of retained revenue. Non-ML alternative: a rule like "call everyone with two consecutive late payments" — your model must beat that rule on the same cost basis, or it is decoration.',
          source: 'Standard product-sense + ML framing question in analyst and ML-engineer screens.',
        },
        summary: [
          'Four shapes cover almost all applied ML: regression (number), classification (label), clustering (groups), ranking (ordered list).',
          'The shape fixes the label format, the loss, the metric, and the model shortlist — decide it first.',
          'Regression uses MAE/RMSE/R²; classification uses F1/AUC; clustering uses internal measures plus human usefulness; ranking uses precision@k/MAP/NDCG.',
          'Rare-event classification makes accuracy a trap; choose metrics that price false alarms and misses.',
          'Write the spec sentence (predict X from Y for Z, evaluated by M) before touching a dataset.',
        ],
      }),
      [
        [
          'Predicting the sale price of a used scooter in rupees is an example of:',
          ['Binary classification', 'Regression', 'Clustering', 'Ranking'],
          1,
          'The label is a continuous quantity and the model outputs a number; evaluate with MAE/RMSE.',
        ],
        [
          'Which metric family is most appropriate for evaluating a search engine\'s ordered results?',
          ['RMSE and MAE', 'precision@k and NDCG', 'Silhouette coefficient', 'Training accuracy'],
          1,
          'Ranking quality is measured on the ordered list, with early positions weighted more heavily.',
        ],
        [
          'A fraud-detection model predicts "not fraud" for every transaction and achieves 99% accuracy on data with 1% fraud. The correct statement is:',
          [
            'The model is excellent — 99% is high accuracy',
            'The model has zero recall for fraud; accuracy is the wrong metric for this imbalance',
            'The model should be retrained for more epochs',
            'The dataset is too small to evaluate',
          ],
          1,
          'It catches none of the 1% positives. Precision/recall on the fraud class (or PR-AUC) is the honest evaluation.',
        ],
        [
          'Grouping unlabeled customers into segments for a marketing campaign is:',
          ['Supervised classification', 'Regression', 'Unsupervised clustering', 'Ranking'],
          2,
          'No labels exist; the algorithm discovers groups and humans judge their usefulness.',
        ],
      ]
    ),
    lesson(
      M1,
      'mlf-1-2',
      2,
      'Supervised, Unsupervised, Reinforcement: The Feedback Signal Decides',
      'The three learning paradigms distinguished not by buzzwords but by what feedback the learner actually receives, plus the modern blends every practitioner must recognise.',
      17,
      nineBlocks({
        objectives: [
          'Classify a learning problem as supervised, unsupervised, or reinforcement from a description of its feedback signal',
          'State for each paradigm what the training signal is, what the output is, and how success is measured',
          'Give a real-world example of each paradigm and identify the delayed reward (for RL)',
          'Recognise self-supervised and semi-supervised learning as practical blends, not separate worlds',
        ],
        hook:
          'Three teams at one company, three "AI projects". Team A trains on 200,000 labelled support tickets to route new ones. Team B has 200,000 tickets and no labels, and wants hidden topic groups. Team C is building a chatbot that learns which of two answers a human rater prefers — no one ever labels a single answer "correct". Same buzzword on all three slide decks. Completely different data problems. The difference between them is one question: what signal teaches the system? Labels? Structure alone? Delayed preference?',
        concept: `**Classify by the feedback signal, never by the buzzword.** The three classical paradigms are not three brands of AI — they are three answers to "what does the learner get told?" That question determines what data you must collect, what a training step looks like, what evaluation can even mean, and how much human effort the project costs. Mastering the paradigms is less about memorising definitions and more about interrogating the signal.

**Supervised learning — the learner gets answers.** Your dataset is a set of instances, each with features x and a known label y. The job: learn a function f such that f(x) ≈ y on data the model has never seen. Two shapes: **classification** (y is a category — spam/not, which digit) and **regression** (y is a number — price, minutes). The training loop is conceptually simple: predict, compare to the true label with a loss, adjust, repeat. Evaluation is clean because truth exists: held-out accuracy, F1, RMSE, and friends. Supervision is the commercial default of applied ML — most business questions are supervised — and its permanent price is **label acquisition**: someone or something must have produced the answers. Human annotation is slow and expensive; using user behaviour as implicit labels (clicked = good, refunded = bad) is cheap and biased; inheriting old database labels is fast and inherits old errors. When a project stalls, the bottleneck is very often the label pipeline, not the algorithm.

**Unsupervised learning — the learner gets structure, no answers.** You have instances, no labels, and the goal is to find regularity in the data itself. **Clustering** partitions into similar groups (customer segments, cell types in biology). **Dimensionality reduction** compresses high-dimensional data into a viewable, denoised low-dimensional form (PCA in 2-D plots of 50-feature tables). **Anomaly detection** flags instances that fit no structure (fraud, defective parts). **Density estimation and topic modelling** round out the family. The deep difficulty: there is no ground truth, so "how good are my clusters?" has no universal number. Two algorithms can disagree and *both be right* at different granularities. Unsupervised results are a lens handed to a human expert, and success is judged by downstream usefulness — did the segments change the campaign? did the anomalies catch real fraud? Unsupervised learning is also the modern engine of representation learning: the features that power today's large models were largely learned without human labels.

**Reinforcement learning — the learner gets scores, after acting.** No per-step teacher. An **agent** chooses **actions** in an **environment** and receives **rewards** (or penalties), often with delay. The goal is a **policy** π: a strategy mapping situations to actions that maximises cumulative reward over time. The signature features make RL hard and distinctive: **delayed reward** (the correct opening move in Go pays off fifty moves later — the credit assignment problem); **exploration vs exploitation** (try a new action that might be great, or repeat the one that already worked); and often enormous sample needs — millions of interactions, usually in simulation, or massive parallel farms. Canonical examples: game-playing agents (reward = winning), robotics control (reward = progress minus falling), and **RLHF** — reinforcement learning from human feedback — where a chatbot's answers are compared by human raters, a reward model learns those preferences, and the language model is tuned to maximise it. RL is the paradigm that matches how humans teach skills: not labelling every step, but grading outcomes.

**The blends that run production.** Textbook purity is rare in real systems. **Self-supervised learning** manufactures its own labels from the data: predict the next word, reconstruct a masked span, match an image to its caption. No human annotation — which is exactly how every large language model is pretrained at internet scale. **Semi-supervised learning** starts with a small labelled set and propagates structure to a large unlabelled pool. **Active learning** spends the labelling budget wisely: the model asks a human only for the examples it is least certain about, often cutting annotation needs by large multiples. A modern LLM pipeline is a blend in sequence: self-supervised pretrain → supervised fine-tune on instructions → reinforcement preference-tune with human (or AI) ratings. When someone forces you to pick one label for such a pipeline, name the stage you mean — not the whole system.`,
        extras: [
          table(
            'The three paradigms compared',
            ['Aspect', 'Supervised', 'Unsupervised', 'Reinforcement'],
            [
              ['Training signal', 'Label y for each x', 'None — regularity in x alone', 'Reward/penalty after actions'],
              ['Typical tasks', 'Classify, regress', 'Cluster, reduce, detect anomalies', 'Control, games, preference optimisation'],
              ['Output', 'Prediction function f(x)', 'Groups / structure / scores', 'A policy π(state) → action'],
              ['Success metric', 'Held-out accuracy, F1, RMSE', 'Silhouette, stability, human usefulness', 'Cumulative reward, task success rate'],
              ['Main cost', 'Label acquisition', 'Interpreting results with no ground truth', 'Sample efficiency, safe exploration'],
              ['Example', 'Ticket routing from labelled history', 'Customer segments from raw behaviour', 'Go-playing agent, RLHF-tuned chatbot'],
            ],
          ),
          info(
            'Self-supervised: the label factory inside your own data',
            'Mask a word, predict it. Crop an image, match the crop to the full picture. The supervision comes from the data\'s own structure. This is why web-scale corpora became trainable — no human needed to label a trillion sentences.',
          ),
          tip(
            'The one-question audit',
            'In any interview or standup, ask "what signal teaches the system?" Labels → supervised. Nothing but structure → unsupervised. Actions plus delayed scores → reinforcement. This resolves nine out of ten paradigm confusions instantly.',
          ),
        ],
        worked: {
          title: 'Classify three proposals by feedback signal',
          problem:
            'A logistics company pitches three projects: (a) predict delivery delay per order from five years of labelled history; (b) discover hidden regional demand shapes for warehouse planning; (c) learn courier-assignment rules online from late penalties and customer ratings. Identify paradigm, training signal, and output.',
          steps: [
            {
              title: '(a) Delay prediction',
              desc: 'Supervised regression. Signal: historical orders each carry an observed delay in minutes. Output: a function mapping order features → predicted minutes. Metric: MAE on a time-split holdout.',
            },
            {
              title: '(b) Demand shapes',
              desc: 'Unsupervised clustering. Signal: none — no one labelled the regions. Output: group assignments per region (or per grid cell) for planners to interpret. Metric: silhouette/stability plus whether planners act on the groups.',
            },
            {
              title: '(c) Courier assignment',
              desc: 'Reinforcement learning. Signal: delayed reward — assignment (action) followed minutes-to-days later by penalties (late) and ratings (happy customer). Output: an assignment policy maximising cumulative reward. Note the credit-assignment challenge: an unlucky traffic jam can punish a good assignment.',
            },
          ],
          solution:
            '(a) supervised — labelled pairs (x, y), output a regressor. (b) unsupervised — structure only, output groups for humans. (c) reinforcement — actions with delayed rewards, output a policy. The feedback signal, not the domain, assigns the paradigm.',
        },
        practice: {
          title: 'Paradigm audit of an ML job posting',
          prompt:
            'Open two real "ML intern" or "data scientist" job descriptions. For each, infer the paradigm from the described data and tasks, quote the phrase that gave it away, and state what the candidate would have to build for the training loop of that paradigm.',
          hint: 'Supervised postings mention labelled datasets and accuracy/F1; unsupervised mention segments/exploration; RL postings mention rewards, preferences, agents, or trial-and-error.',
        },
        mistakes: [
          {
            mistake: 'Calling any group-finding exercise "classification"',
            fix: 'Classification requires labels. Unlabelled grouping is clustering; the moment someone says "we labelled 5,000 examples and trained a classifier", it has become supervised.',
          },
          {
            mistake: 'Assuming unsupervised = unsupervised-feeling or easier',
            fix: 'Evaluation is harder, not easier: no ground truth means garbage-in still produces tidy-looking clusters of garbage. Domain validation becomes the entire game.',
          },
          {
            mistake: 'Thinking RL means "the model reinforces good answers in chat"',
            fix: 'RL is precise: sequential actions, delayed reward, policy learning. Casual reinforcement of behaviour is not the paradigm; RLHF is the RL application people mean.',
          },
          {
            mistake: 'Forcing one paradigm label onto a modern LLM pipeline',
            fix: 'Name the stage: self-supervised pretraining, supervised instruction fine-tuning, reinforcement preference tuning. Pipelines are staged; single labels erase the part you actually need to discuss.',
          },
        ],
        exam: {
          question:
            'Classify each and justify in one sentence: (i) a medical-imaging lab labels 40,000 scans and trains a tumor-detection model; (ii) the same lab clusters cell-shape measurements from unlabelled samples to propose new subtypes; (iii) a robotics team trains a walking gait by rewarding forward metres and penalising falls over 10 million simulated steps.',
          answer:
            '(i) Supervised classification — labelled scans provide (x, y) pairs; output a detector; success measured by held-out sensitivity/specificity. (ii) Unsupervised clustering — no labels; output candidate subtypes that biologists must validate; success is scientific usefulness, not an accuracy number. (iii) Reinforcement learning — the gait controller is an agent, actions are motor commands, rewards are delayed (walking well compounds over seconds); output a policy; success is cumulative simulated reward. If the interviewer asks about the whole lab: supervised-first research with one unsupervised discovery track and one RL system.',
          source: 'Evergreen multi-part paradigm question in biotech and robotics ML interviews.',
        },
        summary: [
          'The feedback signal — not the buzzword — assigns the paradigm.',
          'Supervised = labelled (x, y) pairs; splits into classification and regression; cost is labels.',
          'Unsupervised = structure without answers (clustering, reduction, anomaly detection); humans judge success.',
          'Reinforcement = actions with delayed rewards, learning a policy; the paradigm of control, games, and RLHF.',
          'Self-supervised training (predict the hidden part) is how LLMs learn at scale with zero human labels.',
          'Modern pipelines blend paradigms in stages — name the stage, not the whole system.',
        ],
      }),
      [
        [
          'The defining feedback signal of supervised learning is:',
          [
            'Delayed rewards only',
            'A correct label y for each training example x',
            'Structure discovered without any signal',
            'Human preference comparisons between two outputs',
          ],
          1,
          'Supervision means an answer key exists for each example; the loss compares predictions to that key.',
        ],
        [
          'A team groups 50,000 unlabeled bank transactions into behavioural clusters. This is supervised because the clusters are evaluated afterwards.',
          ['True', 'False', 'True only for banks', 'True only when k-means is used'],
          1,
          'Evaluating clusters afterwards does not create supervision during training; the training signal was structure alone — unsupervised.',
        ],
        [
          'In reinforcement learning, the agent learns:',
          ['A mapping from features to labels', 'A policy that maximises cumulative reward over time', 'A partition of the data into groups', 'The inverse of the data covariance matrix'],
          1,
          'RL output is a policy — the action strategy — optimised for long-run reward, often with delayed consequences.',
        ],
        [
          'Large language model pretraining ("predict the next token") is best described as:',
          ['Classical supervised learning with human labels', 'Reinforcement learning', 'Self-supervised learning — labels manufactured from the data itself', 'Unsupervised clustering'],
          2,
          'The next token in the corpus IS the label — supervision extracted from raw text with no human annotation.',
        ],
      ]
    ),
    lesson(
      M1,
      'mlf-1-3',
      3,
      'Features, Labels, Instances: The Anatomy of a Training Set',
      'What each row of a training table actually is, how features and labels are chosen and typed, and why feature availability at prediction time is the audit that saves projects.',
      18,
      nineBlocks({
        objectives: [
          'Identify instances, features, and labels in any given dataset and describe their roles',
          'Classify common feature types (numeric, binary, categorical, datetime, text) and their typical handling',
          'Design a feature set and label for a new prediction task, with a source for every column',
          'Audit features for prediction-time availability and training-serving skew',
        ],
        hook:
          'A team built a loan-default model with 94% AUC. Impressive — until someone asked one question: "walk me through exactly how each feature is computed at the moment a new applicant applies." Silence. Two of the top five features were derived from data that only exists months after approval. The model had not learned who defaults; it had learned to read the future. Every ML dataset is a table of instances, features and labels — and the difference between a working model and a lie lives in the fine print of how those columns were produced.',
        concept: `**The three nouns you must never blur.** Every supervised (and most unsupervised) dataset is a table with a fixed anatomy. An **instance** (also called a sample, row, or example) is one unit of prediction — one email, one transaction, one patient visit, one house listing. A **feature** is one input attribute of an instance — one column the model is allowed to see at prediction time. A **label** is the output the model learns to predict — the column that exists because someone (or something) recorded what actually happened. Mathematically you will meet this as: the **feature matrix X** of shape n × d (n instances, d features) and the **label vector y** of length n. Keeping n, d, and the meaning of a row firmly in your head prevents an entire category of bugs — like training on 10,000 emails thinking they were 10,000 users.

**Feature types dictate handling.** Not all columns are the same species. **Numeric continuous** features (income, temperature, latency_ms) feed directly into most models but may need scaling (Module 2). **Numeric discrete/count** features (number_of_children, page_views) look continuous but are often sparse or skewed. **Binary** features (has_verified_email: 0/1) are the easiest citizens of ML. **Categorical** features (city, device_type, diagnosis_code) carry enormous information but must be encoded — one-hot, ordinal, or target encoding — because most algorithms only consume numbers (trees being the notable exception; Module 2). **Datetime** features are usually exploded into cyclical and calendar parts (hour-of-day, day-of-week, is_weekend, month) rather than consumed as raw timestamps. **Free text and images** are not features yet — they become features only after a representation step (bag-of-words, embeddings). A useful habit: before any modelling, write down each feature, its type, its range, and its **source system** — the table, API, or sensor it comes from. A feature with no honest source is a leakage waiting to happen.

**The label: definition before collection.** The label is not "whatever column is left over" — it is a definition you must write in plain language before you collect anything. "Default" means missed payment by day 90, not by day 30. "Churn" means cancelled subscription, not merely inactive for 30 days. "Fraud" means confirmed by the investigations team, not merely flagged by rules. Ambiguous labels create ambiguous models, and worse, inconsistent labels across time create models that learn your company's process changes instead of reality. Remember the cost-proxy trap from the foundations of ML: using last year's treatment costs as a label for "who needs care" trains the model to reproduce last year's spending, not current need. The label defines the task as rigorously as the prompt defines an LLM's job.

**Prediction-time availability: the audit that saves projects.** Every feature must be computable, in production, at the exact moment the prediction is made, with no access to the future. This sounds obvious and is violated constantly. "Days since last purchase" is fine for scoring today and leaky if computed with tomorrow's purchase. "Average of all sensor readings during the flight" is fine for post-flight analytics and leaky for in-flight turbulence prediction. The formal version: define the **prediction moment** (application submitted / order placed / patient arrives), then walk each feature and ask "is this knowable, computed, and unchanged at that moment?" Any feature derived from the outcome, from post-outcome behaviour, or from data that arrives later must be quarantined to the label side.

**Training-serving skew.** A subtler cousin: features computed one way in the training pipeline and another way in production (different SQL, different timezone handling, different default for missing values). The model scores beautifully offline and degrades on day one of deployment because the world it trained in is not the world it serves. Feature stores, shared transformation code, and pipeline objects exist precisely to make training and serving use the same arithmetic. When a deployed model mysteriously drifts, skew in feature computation is always on the shortlist of suspects.`,
        extras: [
          table(
            'One dataset, named properly',
            ['Column', 'Role', 'Type', 'Source / note'],
            [
              ['order_id', 'Identifier', 'ID', 'Not a feature — keys invite memorisation; exclude'],
              ['restaurant_rating_avg', 'Feature', 'Numeric continuous', 'Rolling average from reviews DB; available at order time'],
              ['distance_km', 'Feature', 'Numeric continuous', 'Computed from pickup/dropoff geocodes at order time'],
              ['is_rainy', 'Feature', 'Binary', 'Weather API call at order time (hour granularity)'],
              ['prep_time_minutes', 'Label', 'Numeric continuous', 'Recorded after delivery completes — the target, never a feature'],
              ['customer_called_support', 'Future info', 'Binary', 'Often happens AFTER delay is known — leakage risk if used as feature'],
            ],
          ),
          warn(
            'Identifiers are not features',
            'order_id, customer_id, row_index — models can memorise these and produce spectacular offline metrics that mean nothing. IDs go in a side table for joins, never into X.',
          ),
          tip(
            'The source-system column',
            'For every feature, write the table/API/sensor it comes from and the timestamp semantics. If two engineers cannot agree on the source, you do not have a feature — you have a rumour.',
          ),
        ],
        worked: {
          title: 'Design and audit the features for a taxi ETA model',
          problem:
            'Design instances, features, and a label for predicting a taxi trip\'s total duration at the moment a ride is requested. Then audit three candidate features for prediction-time validity.',
          steps: [
            {
              title: 'Fix the prediction moment and the instance',
              desc: 'Instance = one ride request. Prediction moment = the second the request is accepted by the app, before any trip data exists.',
            },
            {
              title: 'Candidate features (all computable at request time)',
              desc: 'pickup_hour, weekday, pickup_zone_id, dropoff_zone_id, straight_line_km, historical_mean_duration_for_this_zone_pair_at_this_hour, driver_waiting_count_in_zone, is_rainy, event_nearby_flag. Types: datetime-derived, categorical, numeric — write the source for each.',
            },
            {
              title: 'Label',
              desc: 'trip_duration_minutes = dropoff_timestamp − pickup_timestamp, recorded after the trip. Exclude cancelled rides or handle them as a separate upstream problem.',
            },
            {
              title: 'Audit three suspects',
              desc: '(1) actual_route_km from GPS after the trip: LEAKED — route is unknown at request time; use straight-line distance plus historical route estimates instead. (2) driver_rating: fine if it is the assigned driver\'s rating known at assignment time; leakage if it averages ratings earned during this trip. (3) surge_multiplier at request time: valid; surge computed after surge ends: invalid.',
            },
            {
              title: 'Skew check',
              desc: 'Ensure the zone-pair historical means in training were computed exactly as they will be in serving (same windows, same timezone, same missing-zone default). Differences here cause silent production degradation.',
            },
          ],
          solution:
            'Instances = ride requests; features = request-time-known zone, time, distance-proxy, history, and weather columns; label = realised trip duration. The audit removed GPS-derived route distance and any during-trip statistics; only request-time-computable columns entered X. That audit — not the model choice — is what makes the 94% believable.',
        },
        practice: {
          title: 'Spec and audit your own dataset',
          prompt:
            'Pick a prediction task (exam pass/fail, bus late/on-time, canteen queue length). Write: the instance, the prediction moment, 6–8 features each with source and type, the label with a precise definition, and one tempting feature you must reject because it is not knowable at prediction time.',
          hint: 'If a feature would require waiting for the outcome to compute it, it is the label\'s cousin — ban it.',
        },
        mistakes: [
          {
            mistake: 'Feeding identifier columns (IDs, row numbers, phone numbers) as features',
            fix: 'Models memorise IDs. Keep keys for joins; exclude them from X. Audit feature importance for a suspicious top-ranked ID before every release.',
          },
          {
            mistake: 'Choosing the label loosely ("customers who had a problem")',
            fix: 'Write an operational definition with a time window and a data source. "Problem = complaint ticket within 30 days of purchase, from the tickets DB" — that is a label.',
          },
          {
            mistake: 'Using features computed after the prediction moment',
            fix: 'Fix the prediction moment first, then require every feature to be computable at that instant. Anything derived from the outcome or from later behaviour is leakage.',
          },
          {
            mistake: 'Allowing training and serving to compute the same feature differently',
            fix: 'Share transformation code (pipelines / feature stores), version feature definitions, and monitor feature distributions after deployment — skew is drift\'s quieter sibling.',
          },
        ],
        exam: {
          question:
            'A bank scores loan applicants. Among the candidate features are: (a) applicant income (from the application form), (b) average bank balance over the past 6 months (from transaction history), (c) whether the loan was eventually sold to a third party, (d) number of previous late payments in the last 12 months. Which belong in X, which is the label\'s territory, and why?',
          answer:
            '(a) and (b) and (c-not) — sorry, walk it precisely: (a) income is known at application time: valid feature. (b) six-month balance history is complete before application: valid feature. (c) whether the loan was later sold is post-decision information: invalid — leakage; it exists only downstream of approval. (d) late payments in the last 12 months are historical and knowable: valid. The label itself would be "defaulted within 12 months of disbursement", defined on the label side only. General principle: each feature must be frozen at the scoring timestamp; any column whose value depends on events after that timestamp is quarantined.',
          source: 'Classic feature-audit question in banking and fintech ML interviews.',
        },
        summary: [
          'Dataset anatomy: instances (rows), features (inputs X), labels (targets y) — keep n, d, and row meaning straight.',
          'Feature types (numeric, binary, categorical, datetime, text) dictate encoding and handling later.',
          'The label needs an operational definition with a time window and a data source before collection starts.',
          'Every feature must be computable at the prediction moment — the availability audit kills leakage early.',
          'Training-serving skew (same name, different arithmetic) silently degrades deployed models; share transformation code.',
          'Identifiers are for joins, never for learning.',
        ],
      }),
      [
        [
          'In a dataset of emails used to train a spam filter, "contains the word \'free\'" is:',
          ['The label', 'A feature', 'An instance', 'A hyperparameter'],
          1,
          'It is an input attribute computed for each instance (email) before the model predicts the spam/not-spam label.',
        ],
        [
          'A fraud model uses "account_closed_date" as a feature while scoring live transactions. The main problem is:',
          [
            'The column has too many missing values',
            'It is not available at prediction time — leakage',
            'Categorical columns cannot be used',
            'Dates should always be excluded from ML',
          ],
          1,
          'The account is open when it is being scored; the closure date is downstream of the outcome, inflating offline metrics.',
        ],
        [
          'order_id, customer_id, and row_index should generally be:',
          ['Included as high-value numeric features', 'Excluded from the feature matrix (kept only for joins)', 'Converted to one-hot columns', 'Used as the label'],
          1,
          'Models can memorise identifiers, producing meaningless offline scores. IDs are keys, not signals.',
        ],
        [
          'The label "churn" is only well-defined when you specify:',
          ['The model architecture to be used',
            'An operational definition: what event counts, in what time window, from which source',
            'The colour of the dashboard chart',
            'The number of features in X'],
          1,
          '"Cancelled subscription within 30 days, from the billing DB" is a label; the bare word "churn" is not.',
        ],
      ]
    ),
    lesson(
      M1,
      'mlf-1-4',
      4,
      'Data Leakage and Baselines: Proving Your Model Earns Its Keep',
      'The leakage taxonomy that explains suspiciously good results, the label-shuffle test, and the baseline-first workflow — including why "always predict the mean" is your first competitor.',
      19,
      nineBlocks({
        objectives: [
          'Identify the four common forms of data leakage and give an example of each',
          'Run the label-shuffle test and interpret the result as a leakage detector',
          'Establish an appropriate baseline (mean/majority/rule) before training any model',
          'Compute baseline MAE and RMSE by hand for a small regression problem',
        ],
        hook:
          'Your model scores 99.2% accuracy on the test set. Your manager opens champagne. Then a colleague shuffles the labels, re-runs your exact pipeline, and gets 96%. No one is celebrating anymore. A model that scores 96% on random labels has not learned anything about the world — it is reading the answer through a hidden channel. Leakage and absent baselines are the two failure modes that let nonsense masquerade as breakthroughs, and both are cheap to check. Cheap checks that prevent million-rupee mistakes: this lesson.',
        concept: `**When a model is too good, it is lying.** Data leakage is any situation where information from outside the training set — or from the future, or from the label itself — sneaks into the features or the pipeline, letting the model cheat. The symptom is always the same: offline metrics that feel like a promotion, and production metrics that feel like a resignation letter. Leakage is the most expensive bug in applied ML because it never crashes; it just quietly produces a model that has learned a shortcut that will not exist in production. The taxonomy below covers nearly every real case.

**Four forms of leakage.** (1) **Target leakage**: a feature is computed using the label or something caused by the label. "Was the customer offered the retention discount?" in a churn model — the discount was offered *because* they looked likely to churn, so the feature encodes a previous model\'s output and the business process around it. (2) **Train-test contamination**: the held-out set is not truly held out — preprocessing (scalers, imputers, encoders) fitted on the full dataset, feature selection run before splitting, duplicate or near-duplicate rows across splits, or the same entity\'s rows scattered across train and test. (3) **Temporal leakage**: the future leaks into the past — using tomorrow\'s weather to predict today\'s demand, or computing "average rating this product will receive this year" from full-year data to predict early-year sales. (4) **Group/entity leakage**: one patient\'s 12 scans split across train and test, one user\'s transactions in both — the model recognises individuals instead of generalising. Each form has its own fix, but all share the diagnostic mindset: *where could the answer have leaked in?*

**The label-shuffle test — leakage detector in ten minutes.** Randomly permute y, retrain your entire pipeline unchanged, and evaluate on the real holdout. If accuracy stays well above chance (or RMSE stays suspiciously low), the model is reading the answer through a side channel — a leaky feature, a contaminated split, or an evaluation bug. This test is the cheapest high-yield audit in machine learning; run it on every new pipeline. (Note: for a tiny fraction of leaky-looking cases the pipeline is simply buggy in the other direction — but "shuffle labels, get skill" always means stop and hunt.)

**Baselines: your first competitor is the dumbest possible model.** Before any serious model, train — or just compute — a **baseline**: the simplest imaginable predictor. For regression, the classic baseline is **always predict the mean (or median) of the training labels**. This is not a straw man you sneak past; it is the floor your model must clear to deserve deployment. If your gradient boosting machine predicts house prices with RMSE ₹42,000 and predicting the training mean also gives ₹41,500, your sophisticated model has added nothing — the honest conclusion is "price is unpredictable from these features at this granularity", and that conclusion is worth crores to avoid deploying noise. For classification, the twins are **always predict the majority class** (gives 99% "accuracy" on 1% fraud data — that is the point) and, when probabilities matter, **always predict the base rate** (P(fraud)=0.01 for everyone). Stronger baselines — a business rule, a simple linear model, last quarter\'s value for time series — tell you how much a smarter model must earn.

**The baseline-first workflow.** 1) Split the data honestly (time or group aware — Module 2 goes deep). 2) Compute the dumb baseline metric on the holdout. 3) Train the simplest credible model (linear/logistic regression) as the "weak learner" baseline. 4) Only then bring in trees, ensembles, or deep models — each upgrade must beat the previous rung by a margin that survives variance across seeds and splits. 5) Report every rung in your write-up. This sequence changes the story you tell from "my model got 94%" to "my model beats the mean baseline by 31% RMSE and the linear baseline by 12% on a leakage-free split" — which is the sentence interviewers and managers actually trust. Note scikit-learn ships this idea directly: DummyRegressor (strategy="mean") and DummyClassifier (strategy="most_frequent") exist so you never forget to run it.`,
        extras: [
          table(
            'Leakage taxonomy with fixes',
            ['Form', 'Example', 'Fix'],
            [
              ['Target leakage', 'Feature encodes label or a cause of the label', 'Audit every feature\'s computation vs the label timeline; quarantine post-outcome columns'],
              ['Train-test contamination', 'Scaler fitted on full data; duplicates across splits', 'Split first, fit preprocessing on train only; deduplicate; use Pipelines'],
              ['Temporal leakage', 'Features computed from full-year data to predict early-year targets', 'Time-ordered splits; compute features from past-only windows'],
              ['Group/entity leakage', 'Same patient/user/document in train and test', 'GroupShuffleSplit / GroupKFold by entity id'],
            ],
          ),
          code(
            '# Baselines and the label-shuffle test (scikit-learn style)\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.dummy import DummyRegressor\nfrom sklearn.metrics import mean_absolute_error, mean_squared_error\nfrom sklearn.utils import shuffle\nimport numpy as np\n\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\n\n# Rung 1: the dumb baseline — always predict the mean\ndummy = DummyRegressor(strategy="mean").fit(X_train, y_train)\nprint("baseline MAE:", mean_absolute_error(y_test, dummy.predict(X_test)))\n\n# Rung 2: simple linear model\nlin = LinearRegression().fit(X_train, y_train)\nprint("linear    MAE:", mean_absolute_error(y_test, lin.predict(X_test)))\n\n# Label-shuffle leakage test: skill on shuffled labels must collapse to ~baseline\ny_shuf = shuffle(y_train, random_state=0)\nshuf = LinearRegression().fit(X_train, y_shuf)\nprint("shuffled-label MAE:", mean_absolute_error(y_test, shuf.predict(X_test)))\n# If this is close to the real MAE, suspect leakage or an evaluation bug.',
            'baseline_and_shuffle.py',
            'python'
          ),
          tip(
            'Report uplift, not absolute score',
            '"RMSE 38,200" means nothing alone. "RMSE 38,200 vs mean-baseline 55,400 on a time-split holdout" is a result. Always quote the gap to the strongest baseline you ran.',
          ),
        ],
        worked: {
          title: 'Beat the mean baseline — by hand, with real numbers',
          problem:
            'Five apartments sold for (sqm, price_k): (50, 22), (60, 28), (70, 31), (80, 36), (90, 43). A lazy model predicts the mean price for every house. A simple model predicts ŷ = 15 + 0.25·sqm. Compute both models\' MAE and RMSE on these five points and judge.',
          steps: [
            {
              title: 'Mean baseline',
              desc: 'Mean price = (22+28+31+36+43)/5 = 160/5 = 32. Errors: −10, −4, −1, +4, +11. MAE = (10+4+1+4+11)/5 = 30/5 = 6.0 (k). RMSE = √((100+16+1+16+121)/5) = √(254/5) = √50.8 ≈ 7.13 (k).',
            },
            {
              title: 'Simple model predictions',
              desc: 'ŷ = 15 + 0.25x → for 50: 27.5; 60: 30.0; 70: 32.5; 80: 35.0; 90: 37.5.',
            },
            {
              title: 'Simple model errors',
              desc: 'Errors (pred − actual): +5.5, +2.0, +1.5, −1.0, −5.5. MAE = (5.5+2+1.5+1+5.5)/5 = 15.5/5 = 3.1 (k). RMSE = √((30.25+4+2.25+1+30.25)/5) = √(67.75/5) = √13.55 ≈ 3.68 (k).',
            },
            {
              title: 'Judge honestly',
              desc: 'MAE improved from 6.0 to 3.1 (48% better); RMSE from 7.13 to 3.68 (48% better). The linear model earns its keep on these points. Note what the baseline already told you: "prices vary by about ±7k around the mean" — any model must beat that noise floor.',
            },
          ],
          solution:
            'Baseline MAE 6.0k / RMSE ≈ 7.13k; linear model MAE 3.1k / RMSE ≈ 3.68k — a real 48% improvement. This is the sentence that justifies deployment discussion. Had the linear model scored 5.8k MAE, the honest verdict would have been "not worth shipping over the mean" — a conclusion the baseline makes unavoidable.',
        },
        practice: {
          title: 'Run the two cheap audits on any dataset',
          prompt:
            'Take any labelled dataset (Iris, Titanic, or one of your own). (1) Compute the majority-class accuracy or mean-predictor MAE as your baseline. (2) If you can code: shuffle the labels, train your planned model, and compare held-out scores against the honest run. If you cannot code, write out exactly which features you suspect of leakage and how you would test each suspicion.',
          hint: 'With shuffled labels, held-out skill should fall to chance (classification) or to the baseline (regression). Anything else means leakage or a bug.',
        },
        mistakes: [
          {
            mistake: 'Celebrating a test score without ever computing a baseline',
            fix: 'The mean/majority baseline is free and instant. No metric should be presented without its baseline gap — "94%" alone is not a result.',
          },
          {
            mistake: 'Fitting preprocessing (scalers, imputers, encoders) before the train/test split',
            fix: 'Split first. Fit every data-dependent transform on the training fold only, then apply it to validation/test — or use a Pipeline that enforces this automatically.',
          },
          {
            mistake: 'Discounting a "too good" score as luck instead of hunting leakage',
            fix: 'Extreme scores deserve a reverse audit: shuffle labels, inspect top feature importances, trace each feature\'s computation vs the label timeline. Find the leak before the demo.',
          },
          {
            mistake: 'Using a baseline so weak it proves nothing',
            fix: 'After the mean/majority rung, add a credible weak competitor: linear/logistic regression, a business rule, or last-period value for time series. Your real model must beat the strongest simple thing you can build.',
          },
        ],
        exam: {
          question:
            'A colleague reports test accuracy of 99.1% for a credit-default model (about 3% of applicants default). You suspect leakage. Describe the diagnostic sequence you would run, in order, and what each result would mean.',
          answer:
            '1) Recompute the majority-class baseline: always predicting "no default" already yields ≈ 97% accuracy — so 99.1% is only +2.1 points; insist on precision/recall for the default class next. 2) Label-shuffle test on the full pipeline: accuracy collapsing to ≈ 97% (baseline) is healthy; staying near 99% proves leakage. 3) Feature trace: audit the top features by importance for computation vs the application timestamp — anything derived from post-approval collections behaviour, "restructured loan" flags, or full-dataset statistics is target or temporal leakage. 4) Split audit: check for duplicate applicants, group leakage by customer ID, and whether preprocessing saw the test set. 5) Re-train the cleaned pipeline and re-baseline: report recall for defaults and PR-AUC, not accuracy. The sequence moves from free checks to invasive ones, and each result narrows the suspect list.',
          source: 'Standard leakage-debugging screen for junior ML and risk-analytics roles.',
        },
        summary: [
          'Leakage has four shapes — target, contamination, temporal, group — and all produce too-good offline metrics plus production failure.',
          'The label-shuffle test is a ten-minute leakage detector: skill on shuffled labels means a side channel exists.',
          'Baselines are not straw men: mean (regression) and majority-class (classification) are the floors every model must beat.',
          'Always report uplift over the strongest baseline on an honest split, never an absolute score alone.',
          'Baseline-first workflow: honest split → dumb baseline → simple model → complex models, each rung earning its place.',
          'DummyRegressor/DummyClassifier in scikit-learn exist so the baseline step is never skipped.',
        ],
      }),
      [
        [
          'A feature "days_until_loan_default" is present in a default-prediction dataset. This is:',
          ['A strong numeric feature', 'Target leakage — the feature is downstream of the label', 'A valid time feature', 'A baseline feature'],
          1,
          'It literally contains the outcome\'s timing; at application time it does not exist. Delete it.',
        ],
        [
          'The purpose of the label-shuffle test is to:',
          [
            'Increase model accuracy',
            'Detect leakage or evaluation bugs by showing whether the pipeline learns from random labels',
            'Enlarge the dataset',
            'Select the best hyperparameters',
          ],
          1,
          'If the pipeline scores well on shuffled labels, it is reading the answer through a side channel — leakage is present.',
        ],
        [
          'For a regression problem, the classic baseline is:',
          [
            'Always predict the maximum label',
            'Always predict the mean (or median) of the training labels',
            'Predict random numbers in the label range',
            'Predict zero for every instance',
          ],
          1,
          'The mean predictor minimises MAE/MSE among constant predictors — it is the honest floor a model must beat.',
        ],
        [
          'Your gradient-boosted model gets RMSE 41,000 on house prices; the mean baseline gets RMSE 40,200. The correct conclusion is:',
          [
            'Deploy immediately — 41,000 sounds precise',
            'The model adds negligible value over predicting the mean; revisit features/split or accept the task may be hard',
            'Switch to an even larger model',
            'Report 41,000 in the slides and omit the baseline',
          ],
          1,
          'A model that cannot clear the free baseline has not earned deployment; the gap is the result, not the raw number.',
        ],
      ]
    ),
  ],
};
