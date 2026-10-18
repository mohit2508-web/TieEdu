// Module 5 — Similarity, Probability & Reduction
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code } from '../nineBlocks';
import { lesson, M5, COURSE_ID } from './helpers';

export const module5: CourseModule = {
  id: M5,
  course_id: COURSE_ID,
  title: 'Module 5 — Similarity, Probability & Reduction',
  summary:
    'The similarity-and-probability family: k-nearest neighbours with distance, k, and the curse of dimensionality; naive Bayes and the spam arithmetic that still works when its assumption is wrong; SVM intuition — maximum margins, soft margins, and the kernel trick — without heavy math; and PCA, variance-maximising projection, for visualisation and compression, with its scaling dependence.',
  sort_order: 5,
  lessons: [
    lesson(
      M5,
      'mlf-5-1',
      51,
      'k-Nearest Neighbours: Distance, k, and the Curse of Dimensionality',
      'The lazy learner that decides by neighbourhood — metric choice, weighted voting, the k dial, and why distances stop meaning anything as dimensions explode.',
      20,
      nineBlocks({
        objectives: [
          'Compute Euclidean distances by hand and predict a kNN label for a small 2-D dataset',
          'Explain the effect of k on bias, variance, and decision-boundary smoothness',
          'Compare Euclidean, Manhattan, and cosine distance and choose one given the data',
          'Describe the curse of dimensionality and its consequences for kNN in high dimensions',
        ],
        hook:
          'No training. No gradient. No parameters at all. k-NN stores the entire training set and, when asked, measures the distance from the query to every stored point and votes among the closest k. It is the model you can explain to a non-technical manager in twelve seconds — and the one that silently dies when you forget to scale features or deploy it on 500 dimensions. "Just use the neighbours" is either the laziest or the most honest sentence in machine learning; this lesson makes sure yours is the honest one.',
        concept: `**The algorithm: memorise, then ask around.** k-nearest neighbours is a lazy learner — training is literally storing the training set (plus any scaling statistics); all the work happens at prediction time: compute distances from the query to all n training points, take the k closest, and aggregate: **classification** → majority vote among their labels (optionally weighted by closeness); **regression** → average (or weighted average) of their targets. No fitting, no objective function — the "model" is the dataset plus the metric plus k. This laziness is a feature (no training time, instant updates when data arrives) and a curse (prediction costs O(n·d) per query; latency grows with the dataset; no compression of insight). Understand it as the extreme end of the flexibility spectrum: with k = 1 the decision boundary is carved around every single training point (zero training error, maximum variance); with k = n every query gets the global majority/mean (maximum bias, zero local adaptation). k is the bias–variance dial of Lesson 2.4 made tangible: small k → jagged, overfit boundaries; large k → blurry, underfit ones. Odd k avoids tied votes in binary problems; the practical default is often √n-ish or a CV sweep (k = 3–50 typical), always on scaled features.

**Distance is a modelling choice.** The metric decides what "neighbour" means. **Euclidean** (√Σ(xᵢ−yᵢ)²) is the default for dense, roughly isotropic numeric features — the "straight-line" distance. **Manhattan** (Σ|xᵢ−yᵢ|) sums axis distances; more robust in high dimensions and natural for grid-like or integer data. **Cosine** (1 − x·y/(‖x‖‖y‖)) ignores magnitude and measures angle — the workhorse for text and any setting where direction (topic profile, embedding orientation) matters more than length (document word count); two documents on the same topic at different lengths are near neighbours by cosine, far by Euclidean. **Minkowski** generalises both with a p parameter (p = 2 Euclidean, p = 1 Manhattan). Every metric demands a scale check: Euclidean/Manhattan on unscaled features lets the largest-range feature own the distance (Lesson 2.3\'s flip example) — StandardScaler (or MinMax for bounded geometry) inside the pipeline is non-negotiable for distance models. Weighted voting (each neighbour votes with weight 1/d or 1/d²) is a cheap upgrade: it lets distant, blurrier neighbours outvote near, sharp ones less.

**The curse of dimensionality — why "nearest" stops meaning nearest.** As dimension d grows, three things conspire against distance-based methods. (1) **Distance concentration**: in high dimensions, sampled points' pairwise distances cluster tightly — the farthest and nearest points to a query become nearly equidistant, so the "nearest" neighbours are barely nearer than the rest; the vote degenerates toward the global answer. (2) **Empty space**: the unit hypercube's volume concentrates in its corners; with enough dimensions, there simply are not enough samples near any query for local reasoning — you would need exponentially more data per dimension to keep neighbourhoods populated. (3) **Noise accumulation**: every noisy dimension adds its own distance contribution, drowning the few signal dimensions. Practical consequences: kNN accuracy degrades as irrelevant dimensions pile up (fight with feature selection/PCA and by curating features); you need far more data at high d than intuition suggests; and exact kNN search also becomes computationally painful (KD-trees and ball trees stop helping past ~20 dimensions, which is why ANN indexes and embedding-specific search — the vector-database world — exist). The honest summary: kNN is superb in low, well-chosen dimensions and on learned embeddings that *already* compress meaning into a small effective dimension — and mediocre on raw 500-feature tables.

**The kNN worldview, kept in proportion.** kNN is the model you reach for when: the decision boundary is genuinely local and irregular; n is small-to-medium and d is low; you want a nonparametric baseline that makes almost no assumptions; or you are working with metric spaces where "similarity" is already meaningful (customer similarity, retrieval). It is also the algorithm behind many "similarity" products — recommender lookups, anomaly flags ("far from everything"), zero-shot prototype methods — so its ideas travel far beyond its literal use. Know it deeply; ship it rarely without scaling, tuning k, and checking dimension count.`,
        extras: [
          table(
            'Distance metrics at a glance',
            ['Metric', 'Formula shape', 'Sensitive to scale/magnitude', 'Natural home'],
            [
              ['Euclidean (L2)', '√Σ(xᵢ−yᵢ)²', 'Yes — heavily', 'Dense numeric features (after scaling)'],
              ['Manhattan (L1)', 'Σ|xᵢ−yᵢ|', 'Yes', 'Grid/integer data; more robust as d grows'],
              ['Cosine', '1 − cos angle between vectors', 'Magnitude-invariant', 'Text, embeddings, profile similarity'],
              ['Minkowski (p)', '(Σ|xᵢ−yᵢ|^p)^(1/p)', 'Yes', 'Tunable L1/L2 family'],
            ],
          ),
          code(
            '# kNN inside a leakage-safe, scaled pipeline\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.neighbors import KNeighborsClassifier\nfrom sklearn.model_selection import cross_val_score\nimport numpy as np\n\npipe = Pipeline([\n    (\"scale\", StandardScaler()),          # mandatory for distance models\n    (\"knn\", KNeighborsClassifier(weights=\"distance\")),  # closeness-weighted votes\n])\n\n# Tune k by CV — the bias/variance dial\nscores = []\nfor k in [1, 3, 5, 11, 21, 51]:\n    pipe.set_params(knn__n_neighbors=k)\n    scores.append(cross_val_score(pipe, X_train, y_train, cv=5).mean())\nprint(\"best k:\", [1, 3, 5, 11, 21, 51][int(np.argmax(scores))])\n\n# For text: cosine on raw counts/tfidf instead of scaling\n# KNeighborsClassifier(metric=\"cosine\") via brute-force search',
            'knn_pipeline.py',
            'python'
          ),
          warn(
            'k = 1 with noise: perfect training, fragile everything else',
            'A 1-neighbour model has zero training error and a boundary stitched around every training point — one noisy label creates a pocket of wrongness. Never deploy k = 1 without a validation reason.',
          ),
          tip(
            'kNN doubles as a sanity baseline',
            'A well-scaled kNN is a strong "no assumptions" baseline: if your fancy model cannot beat kNN CV scores, the fancy model is adding complexity without adding signal.',
          ),
        ],
        worked: {
          title: 'kNN by hand on a 2-D point set',
          problem:
            'Training: reds at (2, 3), (3, 3), (2, 4); blues at (8, 9), (9, 8). Query: (3.5, 4). Classify with k = 1 and k = 3 (plain majority). Then note what changes if "area" were on a 0–1000 scale and "distance" on 0–10.',
          steps: [
            {
              title: 'Squared distances to each point',
              desc: 'To (2,3): (1.5² + 1²) = 3.25 → d ≈ 1.80. To (3,3): (0.5² + 1²) = 1.25 → d ≈ 1.12. To (2,4): (1.5² + 0²) = 2.25 → d = 1.50. To (8,9): (4.5² + 5²) = 45.25 → d ≈ 6.73. To (9,8): (5.5² + 4²) = 46.25 → d ≈ 6.80.',
            },
            {
              title: 'k = 1',
              desc: 'Nearest neighbour: (3, 3) at d ≈ 1.12 — a red point. Prediction: RED. Zero smoothing, maximum locality.',
            },
            {
              title: 'k = 3',
              desc: 'Three nearest: (3,3) d≈1.12, (2,4) d=1.50, (2,3) d≈1.80 — all red. Vote: 3 red, 0 blue → RED, unanimously. (Had one blue crept into the top-3, majority would still rule unless you weighted by distance.)',
            },
            {
              title: 'The scaling trap, previewed',
              desc: 'If feature A ranged 0–1000 and B 0–10, the A-differences above would dominate every distance and B would barely vote — the "nearest" neighbours would be chosen almost on A alone. With StandardScaler, each feature contributes in σ-units and the neighbourhood geometry becomes honest (Lesson 2.3\'s full demonstration).',
            },
          ],
          solution:
            'k=1 → red (nearest is (3,3)); k=3 → red (top-3 all red). The hand computation is the whole algorithm — and the scaling caveat is the whole failure mode. kNN rewards disciplined geometry: scaled features, chosen metric, tuned k.',
        },
        practice: {
          title: 'Feel the k dial',
          prompt:
            'On any small 2-D labelled dataset (Iris first two features works), fit kNN for k = 1, 5, 25 and compare training vs CV accuracy. Sketch (words or code) how the decision boundary changes. Predict what happens as k approaches n.',
          hint: 'Boundary smooths from dotted individual pockets to one broad majority region; CV accuracy usually peaks at intermediate k — the bias–variance sweet spot.',
        },
        mistakes: [
          {
            mistake: 'Running kNN without scaling numeric features',
            fix: 'StandardScaler in the pipeline, every time — otherwise the largest-range feature silently owns every vote.',
          },
          {
            mistake: 'Choosing k = 1 or a default k without validation',
            fix: 'k is THE hyperparameter — sweep it on CV (log-ish grid), watch the train/CV gap, and prefer the smallest k within noise of the best CV score.',
          },
          {
            mistake: 'Deploying exact kNN on huge n or high d',
            fix: 'Prediction is O(n·d) per query; beyond ~20 dimensions tree indexes stop helping. For scale: reduce dimensions (feature selection/PCA), move to ANN indexes, or switch families (boosting/linear) when locality is not essential.',
          },
          {
            mistake: 'Using Euclidean distance on text or embeddings where direction is meaning',
            fix: 'Cosine (or normalised vectors + dot) for text/embedding similarity; magnitude usually encodes length, not topic. Match the metric to what "similar" means in the domain.',
          },
        ],
        exam: {
          question:
            'Explain the bias–variance behaviour of kNN as k varies, define the curse of dimensionality, and state one concrete mitigation for a 400-feature tabular problem where kNN underperforms a boosted tree.',
          answer:
            'k → 1: decision boundary wraps every training point — zero training error, high variance, low bias (overfit; sensitive to label noise). k → n: every query gets the global majority/mean — maximum bias, zero locality (underfit). Intermediate k (CV-tuned) balances the two; weighting neighbours by 1/d sharpens local influence. Curse of dimensionality: as d grows, pairwise distances concentrate (nearest ≈ farthest), the space empties out (exponential data needed to keep neighbourhoods populated), and per-dimension noise accumulates — so local similarity stops being informative. Mitigations: aggressive feature selection/PCA to drop nuisance dimensions; learn a compact embedding (metric learning) so similarity lives in low effective dimension; or abandon locality for a family that splits axis-wise (boosted trees) when the signal is not genuinely local. The tree wins on 400 raw features because it does not need global distance geometry — it only needs per-feature thresholds.',
          source: 'Standard theory-and-practice question in ML interviews (k, curse, mitigation).',
        },
        summary: [
          'kNN = store data + choose metric + choose k; classify by majority (or weighted) vote of neighbours.',
          'Small k: high variance, jagged boundaries; large k: high bias, smooth boundaries — tune k by CV.',
          'Euclidean for dense scaled numerics; Manhattan for grid-like data; cosine for text and embeddings.',
          'Scaling is mandatory for distance models — the large-range feature otherwise owns every vote.',
          'Curse of dimensionality: distances concentrate and space empties — kNN needs low, informative dimensions.',
          'Prediction costs O(n·d); beyond ~20 dimensions, indexes fail — reduce d or change families at scale.',
        ],
      }),
      [
        [
          'k-NN is called a "lazy" learner because:',
          [
            'It is slow to write in code',
            'Training stores the data; all computation happens at prediction time',
            'It cannot be parallelised',
            'It ignores most features',
          ],
          1,
          'No parameters are fitted — the model IS the training set, plus metric and k.',
        ],
        [
          'You train kNN on unscaled features: "income" ranges 0–2,000,000 and "age" 18–80. The practical effect is:',
          [
            'None — kNN scales features internally',
            'Income dominates every distance; age barely contributes to the vote',
            'Age dominates every distance',
            'The model automatically switches to cosine distance',
          ],
          1,
          'Euclidean distance sums raw differences — the large-range feature swamps the small-range one unless you standardise.',
        ],
        [
          'As k increases from 1 toward n, the kNN decision boundary:',
          [
            'Becomes more jagged',
            'Becomes smoother and more global (higher bias, lower variance)',
            'Disappears entirely',
            'Becomes diagonal',
          ],
          1,
          'Larger neighbourhoods average over more points — boundaries flatten toward the global majority region.',
        ],
        [
          'The curse of dimensionality means, for kNN in high dimensions, that:',
          [
            'Distances concentrate — nearest neighbours are barely nearer than the rest — and much more data is needed',
            'k must always be set to the dimension count',
            'Cosine distance becomes Euclidean',
            'Training time becomes infinite',
          ],
          0,
          'Distance concentration plus empty space: local similarity stops being informative without exponentially more samples or dimensionality reduction.',
        ],
      ]
    ),
    lesson(
      M5,
      'mlf-5-2',
      52,
      'Naive Bayes: Bayes\' Rule, Independence, and the Spam Arithmetic That Works',
      'How prior × likelihood turns word counts into spam probabilities, why the "naive" independence assumption still wins at text classification, Laplace smoothing, and log-space computation.',
      20,
      nineBlocks({
        objectives: [
          'Apply Bayes\' rule to classify an example by hand with priors and per-feature likelihoods',
          'Explain the naive independence assumption and why it works surprisingly well in practice',
          'Compare Gaussian, Multinomial, and Bernoulli naive Bayes variants and their data homes',
          'Apply Laplace (additive) smoothing and explain why unsmoothed probabilities destroy products',
        ],
        hook:
          'The email filters of the late 1990s did not use deep learning, GPUs, or billion-row datasets. They counted words. "Free" appears in 80% of spam and 10% of ham; "meeting" appears in 5% of spam and 60% of ham; multiply the evidence, compare the totals, and the filter was born. The math behind it is a three-line application of Bayes\' rule with an assumption so wrong it is called naive — and it still ships inside production pipelines today as the baseline every text classifier must beat.',
        concept: `**Bayes\' rule: flip the conditional.** We want P(spam | words) — the probability of the class given the evidence. What is easy to count from data is the reverse: P(words | spam) — how often these words appear in known spam — plus the prior P(spam). Bayes\' rule connects them: P(c | x) = P(x | c)·P(c) / P(x). For classification we only need the numerator per class and a normalisation: score(c) = P(c)·P(x | c), then divide by the sum across classes to get real probabilities (P(x) is the same constant for every class and cancels in the comparison). **P(c)** is the prior — the base rate of the class in training (spam: 0.4); **P(x | c)** is the likelihood of the evidence under the class. Classify by the argmax. This is the whole model — priors, likelihoods, one argmax — and its transparency is a feature: every spam decision can be traced to the word-likelihoods that produced it.

**The naive assumption: features given the class are independent.** P(x | c) for an email with many word-count features would normally require a joint distribution over all combinations — impossible to estimate directly. Naive Bayes factorises it: P(x | c) ≈ Πⱼ P(xⱼ | c) — assume each word\'s count is independent of the others, *given the class*. The assumption is flagrantly false in real language: "free" and "offer" co-occur; "bank" correlates with "account". So why does it work? The classification task only needs the argmax over classes to be right — not calibrated joint probabilities. Correlated features double-count evidence (free+offer count "promotional-ness" twice), which distorts the posterior numbers, but as long as double-counting pushes in roughly the right direction per class, the ranking survives. Additionally, the factorisation turns an impossible estimation problem into d trivial ones — one small table per feature per class — so it trains on tiny data and still behaves. Modern perspective: naive Bayes is a strong, fast, interpretable *baseline* for text; when it loses, it usually loses to models that explicitly model feature dependence (logistic regression, boosted trees, transformers) — and you should know *why* before you upgrade.

**The variants, matched to the data.** **Gaussian NB**: each numeric feature xⱼ is modelled as a Gaussian per class — estimate mean and variance of xⱼ within each class; P(xⱼ | c) is the Gaussian density at the value. Good for continuous sensor-ish features; terrible when features are really categorical counts. **Multinomial NB**: the text workhorse — features are word (or n-gram) counts; P(word | c) = fraction of all word occurrences in class c\'s corpus that are that word. Requires enough counts to estimate per-word rates. **Bernoulli NB**: binary presence/absence features (word appears or not) — often better for short texts where counts saturate and presence is what matters; its complement form handles length well. **Categorical NB**: for discrete non-count categories. Pick by asking "what is my feature actually?" — counts → Multinomial; binary → Bernoulli; continuous → Gaussian. In scikit-learn pipelines: CountVectorizer/TfidfVectorizer → MultinomialNB is the classic two-line text classifier.

**Laplace smoothing: the zero-probability kill switch.** A word never seen in ham training ("wirexfer") has P(word | ham) = 0. Because the model multiplies features, ONE zero annihilates the entire class score — one unseen word forces "spam" regardless of all other evidence. The fix — **additive (Laplace) smoothing** with α: P(word | c) = (count + α) / (total + α·V), where V is vocabulary size; α = 1 is classic Laplace, α < 1 ("Lidstone") is often better. Every word keeps a tiny nonzero mass, the product survives, and rare words are proportionally discounted. A second practical guard: compute everything in **log space** — log P(c) + Σⱼ log P(xⱼ | c) — because multiplying hundreds of small probabilities underflows floating-point (the product becomes 0 for *every* class and the argmax turns to noise). Argmax of the log-score equals argmax of the product (log is monotone), so nothing is lost. Together with class priors, these details turn a three-line formula into a production-credible spam scorer — and the interpretability bonus (top words per class by likelihood ratio) remains available for free, which regulated and trust-sensitive deployments still love.`,
        extras: [
          table(
            'Naive Bayes variants',
            ['Variant', 'Feature type', 'Likelihood model', 'Typical use'],
            [
              ['Gaussian', 'Continuous numeric', 'Per-class mean/variance (normal density)', 'Sensor/tabular numeric baselines'],
              ['Multinomial', 'Word counts / TF-IDF-ish frequencies', 'Per-class word occurrence rates', 'Spam, news categorisation, topic-ish text'],
              ['Bernoulli', 'Binary presence/absence', 'Per-class presence rate', 'Short text, stylometry, presence features'],
              ['Categorical', 'Discrete categories', 'Per-class category frequency tables', 'Survey/categorical naïve baselines'],
            ],
          ),
          code(
            '# Text classification in six lines: counts + Multinomial NB\nfrom sklearn.feature_extraction.text import CountVectorizer\nfrom sklearn.naive_bayes import MultinomialNB\nfrom sklearn.pipeline import make_pipeline\nfrom sklearn.metrics import classification_report\n\nclf = make_pipeline(\n    CountVectorizer(ngram_range=(1, 2), min_df=2),  # word + bigram counts\n    MultinomialNB(alpha=0.5),                        # smoothing < 1\n)\nclf.fit(train_texts, y_train)\nprint(classification_report(y_test, clf.predict(test_texts)))\n\n# Interpretability for free: top spam words by likelihood ratio\nimport numpy as np\nvec, nb = clf.named_steps[\"countvectorizer\"], clf.named_steps[\"multinomialnb\"]\nlog_r = nb.feature_log_prob_[1] - nb.feature_log_prob_[0]   # spam vs ham\nfor i in np.argsort(log_r)[-10:][::-1]:\n    print(vec.get_feature_names_out()[i], round(float(np.exp(log_r[i])), 1))',
            'naive_bayes_text.py',
            'python'
          ),
          tip(
            'NB posterior probabilities are often miscalibrated',
            'Because of double-counted correlation, treat the outputs as scores for ranking/thresholding rather than literal probabilities — recalibrate (Platt/isotonic) if you need real probabilities downstream.',
          ),
          warn(
            'One unseen word must not veto a whole class',
            'Always smooth (alpha > 0) and work in log space; otherwise underflow and zero-probabilities make confident garbage predictions on any text containing a novel token.',
          ),
        ],
        worked: {
          title: 'Spam arithmetic by hand, with and without smoothing',
          problem:
            'P(spam) = 0.4, P(ham) = 0.6. Word likelihoods: P(free|spam) = 0.8, P(free|ham) = 0.1; P(offer|spam) = 0.6, P(offer|ham) = 0.2. Classify "free offer". Then add the unseen word "wirexfer" (count 0 in ham, 0 in spam corpora of V = 1000 words) and see what Laplace α = 1 does.',
          steps: [
            {
              title: 'Smooth-free scores',
              desc: 'Spam score = 0.4 × 0.8 × 0.6 = 0.192. Ham score = 0.6 × 0.1 × 0.2 = 0.012. Normalise: P(spam|x) = 0.192/(0.192+0.012) = 0.192/0.204 ≈ 0.94. Classification: SPAM, and the ratio (16:1) is decisive.',
            },
            {
              title: 'Enter the unseen word',
              desc: '"wirexfer" appears in neither class\'s counts → unsmoothed P(wirexfer|spam) = P(wirexfer|ham) = 0. Both scores multiply to exactly 0. The argmax is now a coin flip between zeros — one novel token destroyed all 16:1 evidence.',
            },
            {
              title: 'Laplace rescue (α = 1)',
              desc: 'Ham: P(wirexfer|ham) = (0 + 1)/(total_ham_words + V) — say total_ham = 9,999, V = 1,000 → 1/10,999 ≈ 9.1e-5. Spam: (0+1)/(total_spam + V) — total_spam = 4,999 → 1/5,999 ≈ 1.67e-4. Both tiny, nonzero, and slightly *favouring spam* (rarer in the ham corpus denominator) — the earlier evidence survives, order intact.',
            },
            {
              title: 'The log-space habit',
              desc: 'Multiply a thousand probabilities of ~0.1 and you hit floating-point underflow; add their logs instead: log-score = log P(c) + Σ log P(xⱼ|c). Argmax over classes is unchanged; the arithmetic stays finite.',
            },
          ],
          solution:
            '"free offer" → P(spam) ≈ 0.94 without the novel word. The naive product is powerful and fragile; smoothing keeps novel tokens from zeroing entire classes, and log-space keeps hundreds of multiplications finite. That trio — Bayes, smoothing, logs — is the filter that started the industry.',
        },
        practice: {
          title: 'Build the six-line spam baseline',
          prompt:
            'On any text dataset (SMS spam, IMDB reviews): build CountVectorizer → MultinomialNB with a train/test split. Report precision/recall for the positive class. List the top 10 words by log-likelihood ratio per class and sanity-check them against your intuition. Note one way the independence assumption visibly misfires in those words (co-occurrence?).',
          hint: 'If the top spam words come in co-occurring pairs ("click" + "here"), you are seeing double-counted correlated evidence — the classic naive miscalibration.',
        },
        mistakes: [
          {
            mistake: 'Interpreting naive Bayes outputs as well-calibrated probabilities',
            fix: 'Correlation double-counting distorts magnitudes; trust the ranking, recalibrate before using probabilities as prices or risk numbers.',
          },
          {
            mistake: 'Forgetting smoothing and meeting an unseen test token',
            fix: 'alpha > 0 always (0.1–1 typical for text); unseen words get tiny nonzero mass instead of zeroing a class.',
          },
          {
            mistake: 'Using Gaussian NB on word-count features (or Multinomial on continuous features)',
            fix: 'Match variant to feature type: counts → Multinomial; binary presence → Bernoulli; continuous → Gaussian.',
          },
          {
            mistake: 'Multiplying long likelihood chains in raw probability space',
            fix: 'Work in log space (the libraries do this internally — know why); otherwise underflow turns every class score into 0.0 and the decision becomes arbitrary.',
          },
        ],
        exam: {
          question:
            'State Bayes\' rule for classification and the naive independence factorisation. A classifier scores spam 1e-12 and ham 9e-13 after multiplying likelihoods — is this a close call? What engineering fixes prevent the underlying numerical problem?',
          answer:
            'P(c|x) ∝ P(c)·P(x|c); naive Bayes approximates P(x|c) ≈ Πⱼ P(xⱼ|c), treating features as independent given the class, and classifies by argmax over c of the (prior × likelihood product). The quoted scores are both catastrophically underflowed products (real evidence has been compressed into denormal/tiny numbers) — the ratio 1e-12 vs 9e-13 might still rank correctly *here*, but at deeper chains both hit 0.0 and ranking dies. Fixes: (1) compute in log space — log P(c) + Σ log P(xⱼ|c) — the argmax is invariant to the monotone log transform and all values stay finite; (2) Laplace/additive smoothing (α > 0) so no single unseen feature assigns exact zero and annihilates a class; (3) vocabulary pruning (min_df, max_df, stopwords) to keep the product over informative tokens. Note also that the class with more zero-smoothed denominators can be favoured — priors and smoothing strength α are the honest knobs, both validated, never guessed on test.',
          source: 'Classic numerical-robustness follow-up in NLP/ML interviews.',
        },
        summary: [
          'Naive Bayes = priors × per-feature likelihoods, factorised by the naive independence assumption, decided by argmax.',
          'The independence assumption is false but usually harmless for ranking — correlated features double-count, so probabilities miscalibrate.',
          'Pick the variant by feature type: Gaussian (continuous), Multinomial (counts), Bernoulli (presence), Categorical (levels).',
          'Laplace smoothing (α > 0) prevents unseen features from zeroing an entire class.',
          'Always compute in log space — hundreds of small probabilities underflow otherwise.',
          'Fast, tiny-data-capable, interpretable via likelihood ratios — the text baseline every other model must beat.',
        ],
      }),
      [
        [
          'Naive Bayes\' "naive" assumption is:',
          [
            'Classes are equally likely',
            'Features are independent of each other given the class',
            'All features are Gaussian',
            'The decision boundary is linear',
          ],
          1,
          'P(x|c) ≈ Π P(xⱼ|c) — conditional independence of features given the class label.',
        ],
        [
          'A test email contains a word never seen in any class\'s training data. Under unsmoothed naive Bayes, the likely result is:',
          [
            'The word is ignored',
            'Both class scores multiply to zero (or the unseen class is annihilated) — the prediction is destroyed',
            'The word is assigned probability 1',
            'Training crashes',
          ],
          1,
          'One zero likelihood zeroes the whole product for that class; additive (Laplace) smoothing is the standard fix.',
        ],
        [
          'For text classification with word counts, the appropriate naive Bayes variant is:',
          ['Gaussian', 'Multinomial', 'Bernoulli with continuous features', 'Any — they are interchangeable'],
          1,
          'Multinomial models per-class word occurrence rates — the classic partner of CountVectorizer.',
        ],
        [
          'Naive Bayes posterior probabilities are often miscalibrated because:',
          [
            'The library does not normalise',
            'Correlated features are double-counted under the independence assumption, distorting magnitudes (while rankings usually survive)',
            'Priors are always wrong',
            'Log space loses information needed for calibration',
          ],
          1,
          'Double-counted correlated evidence inflates or deflates scores; the argmax ranking is robust even when the numbers are not literal probabilities.',
        ],
      ]
    ),
    lesson(
      M5,
      'mlf-5-3',
      53,
      'SVM Intuition: Maximum Margins, Soft Margins, and the Kernel Trick',
      'Finding the widest street between classes, trading margin against misclassifications with C, and how kernels separate data in higher dimensions without ever computing the mapping — no heavy math required.',
      20,
      nineBlocks({
        objectives: [
          'Explain the maximum-margin decision rule and identify support vectors in a small example',
          'Predict the effect of increasing C and of tuning RBF gamma on fit vs generalisation',
          'Describe the kernel trick in plain language and when an RBF kernel helps',
          'Choose sensible SVM preprocessing (scaling) and compare it with logistic regression on the same data',
        ],
        hook:
          'Two classes, one messy cloud each. Logistic regression draws the line that best separates the labels, and the line may weave right up against a few points. SVM has a different obsession: among all lines that separate the classes, draw the one that keeps the widest possible empty street between them. The points closest to the street are the only ones that matter — they are called support vectors, and if you delete every other training point, the street does not move. Different obsession, different model, and for decades of small-and-medium tabular problems, a different kind of champion.',
        concept: `**The maximum-margin rule.** Many lines (hyperplanes in higher dimensions) can separate two classes; SVM picks the one maximising the **margin** — the distance between the hyperplane and the nearest points of either class. Intuition for why: the margin is a built-in safety buffer, so the model is least sensitive to small perturbations of new points near the boundary — the classic bias–variance argument paid in geometry. The points that define the margin — nearest to the street on each side — are the **support vectors**; everything else is geometric ballast. This gives SVM two signature properties: the decision depends on a small, critical subset of the data (robust to far-away outliers — a point deep inside enemy territory never becomes a support vector and never moves the boundary), and models can be compact (prediction only needs the support vectors, not the whole training set).

**Soft margins: real data is not separable.** Real clouds overlap; a hard margin either fails to exist or contorts to accommodate label noise. The **soft-margin SVM** allows errors (points inside the margin or on the wrong side) at a cost controlled by the regularisation parameter **C**. Large C: misclassifications are expensive → the margin narrows to catch more training points → tighter fit, higher variance (can chase noise; behaves like a near-hard margin). Small C: errors are tolerated → wider, smoother street, more bias, better generalisation on noisy data. C is exactly the λ-flavoured bias–variance dial from Module 3 — a penalty on constraint violation — and it is tuned by cross-validation like any other hyperparameter. The hinge loss formulation (max(0, 1 − y·f(x))) is the machinery behind it; you can cite it in interviews without re-deriving it.

**The kernel trick: separating in a higher-dimensional space, without going there.** Some data is not linearly separable in the original space — the classic example is the ring/XOR: one class inside a circle, another outside. Map points to higher dimensions and a hyperplane can often separate them (a circle becomes linearly separable once a dimension like x₁² + x₂² exists). The miracle: for many such maps, the training algorithm only ever needs **dot products** between mapped points — and a **kernel function** K(x, z) computes that dot product *directly in the mapped space* without ever constructing the coordinates. K(x, z) = (γ·⟨x, z⟩ + c₀)^d is the polynomial kernel; K(x, z) = exp(−γ·‖x − z‖²) is the **RBF (Gaussian) kernel** — measuring similarity that decays smoothly with distance; every point gets a similarity profile to every other, and the boundary becomes a flexible contour around clusters. RBF\'s **gamma** controls the reach of each point: small γ → far-reaching, smooth, high-bias boundaries; large γ → each point only influences its immediate neighbourhood, wiggly high-variance boundaries that memorise. Together (C, γ) are the two dials of the standard RBF SVM. In practice: RBF-kernel SVM on well-scaled features is a strong, classic choice for small-to-medium tabular data (n up to tens of thousands); beyond that, training cost (roughly O(n²)–O(n³)) and probability calibration overhead push you toward boosted trees, linear models, or neural nets. Linear-kernel SVM (no trick needed) remains competitive in high-dimensional sparse text — where the data is already separable in the original space, and the margin story applies directly.

**SVM in the family portrait, and the preprocessing rule.** Versus logistic regression: logistic gives smooth probabilities with a linear boundary (and easy incremental updates); SVM gives a max-margin boundary (better geometric robustness on small data) and a kernel option, at the cost of probability outputs that need extra calibration (Platt scaling) and slower training at scale. Versus kNN: SVM *learns* a compact boundary instead of memorising all points — it is the "compressed similarity" answer to kNN\'s laziness. Preprocessing is non-negotiable: margins and RBF distances are computed on raw coordinates, so scale features exactly as for kNN (StandardScaler in the pipeline, always). If you remember nothing else about running SVMs: scale, tune C, and (for RBF) tune gamma on a log grid — an untuned SVM is a coin flip between overfit wiggles and underfit mush.`,
        extras: [
          table(
            'The SVM dials',
            ['Dial', 'Small value', 'Large value', 'Think of it as'],
            [
              ['C', 'Wide margin, tolerate errors (high bias)', 'Narrow margin, punish errors (high variance)', 'Inverse of regularization strength'],
              ['γ (RBF)', 'Smooth, far-reaching boundaries', 'Wiggly, point-local boundaries (memorises)', 'Per-point influence radius'],
              ['kernel', 'linear: hyperplane in original space', 'RBF/poly: flexible boundary via mapped space', 'Shape vocabulary of the model'],
            ],
          ),
          code(
            '# RBF SVM: scale first, tune C and gamma on a log grid\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.svm import SVC\nfrom sklearn.model_selection import GridSearchCV\n\npipe = Pipeline([\n    (\"scale\", StandardScaler()),          # mandatory — margins/distances are geometric\n    (\"svc\", SVC(kernel=\"rbf\")),\n])\n\ngrid = GridSearchCV(\n    pipe,\n    {\"svc__C\": [0.1, 1, 10, 100], \"svc__gamma\": [0.001, 0.01, 0.1, 1]},\n    cv=5, scoring=\"roc_auc\",              # or the metric your costs demand\n)\ngrid.fit(X_train, y_train)\nprint(grid.best_params_, grid.best_score_)\nprint(\"n_support per class:\", grid.best_estimator_.named_steps[\"svc\"].n_support_)\n\n# For probabilities later: SVC(probability=True) fits an internal calibration — or calibrate separately',
            'svm_tuning.py',
            'python'
          ),
          tip(
            'Read n_support_ after fitting',
            'The count of support vectors tells you how much of the data actually defines the boundary. A huge fraction of points as support vectors means the classes genuinely overlap (or C/γ are fighting) — a useful diagnostic of separability.',
          ),
        ],
        worked: {
          title: 'Margins on a line, then the ring that needs a kernel',
          problem:
            'Class 0 occupies x ≤ 2 and class 1 occupies x ≥ 6 on a 1-D feature. (a) Give the maximum-margin boundary and the margin width. (b) Now labels are 1 inside the ring x₁² + x₂² ≤ 4 and 0 outside — explain why no linear boundary works and how an RBF kernel resolves it, without computing any mapping.',
          steps: [
            {
              title: '(a) The street on a line',
              desc: 'The separating interval is (2, 6); the max-margin boundary is the midpoint x = 4 (all such midpoints are equidistant from the extremes). Margin width: the distance between the two support points 2 and 6 is 4 (in 1-D, with the usual 2/‖w‖ convention the geometric margin is reported accordingly — the key fact: the street is as wide as the gap allows, anchored by support vectors at x = 2 and x = 6). Points beyond those supports are irrelevant ballast.',
            },
            {
              title: '(b) Why the linear model fails on the ring',
              desc: 'No straight line (or plane) can put all of "inside the circle" on one side and all of "outside" on the other — try drawing it: the inner class wraps around the boundary direction. Linear SVM (and logistic regression) will plateau at ~50–75% accuracy no matter the C.',
            },
            {
              title: 'The kernel\'s quiet move',
              desc: 'RBF similarity K(x, z) = exp(−γ‖x − z‖²) implicitly compares points in an infinite-dimensional feature space (its Taylor expansion contains all polynomial degrees). In that space the ring becomes linearly separable — the SVM machinery finds the max-margin hyperplane there — yet training only ever evaluated kernel values between training pairs; no coordinates of the mapped space were ever stored. The boundary back in 2-D looks like a circle because the hyperplane in the mapped space pulls back to a ring-shaped contour.',
            },
            {
              title: 'The dial that matters next',
              desc: 'γ sets how quickly similarity decays: too small → every point resembles every other → the boundary underfits toward a blurred ring; too large → each support vector carves its own tiny island → memorisation. Tune (C, γ) jointly by cross-validation on scaled features — the two-dial ritual of every RBF SVM practitioner.',
            },
          ],
          solution:
            '(a) Boundary at the midpoint of the widest gap (x = 4), support vectors at the class extremes x = 2 and x = 6 — the street fills the gap. (b) The ring is not linearly separable; the RBF kernel compares points by smoothly decaying similarity, effectively separating them in an implicit higher-dimensional space where a hyperplane becomes a ring-shaped contour — all without computing the mapping. Margin, support vectors, C, kernel: the four ideas that carry every SVM conversation.',
        },
        practice: {
          title: 'SVM vs logistic regression, fairly',
          prompt:
            'On one small-to-medium tabular dataset: fit (1) scaled logistic regression, (2) linear SVM, (3) RBF SVM with grid-searched C and γ. Compare CV scores and training time. Write three sentences: which won, whether the extra machinery paid for itself, and what you would check (calibration, support-vector count) before shipping.',
          hint: 'On clean low-dim data the three often tie; RBF SVM pulls ahead when the boundary is genuinely nonlinear and n is modest — and loses its charm as n explodes.',
        },
        mistakes: [
          {
            mistake: 'Running an SVM without scaling features',
            fix: 'Margins and RBF distances are computed on raw coordinates — unscaled features distort both. StandardScaler in the pipeline, no exceptions for numeric SVM work.',
          },
          {
            mistake: 'Setting C huge "because accuracy on training matters"',
            fix: 'Large C chases every mislabelled point, narrowing margins and overfitting noise. Tune C on validation; the margin regularisation IS the model\'s generalisation mechanism.',
          },
          {
            mistake: 'Treating SVM probability outputs as free truth',
            fix: 'Default decision_function values are margins, not probabilities; probability=True adds a calibration fit (Platt scaling) that needs its own care. Calibrate deliberately if probabilities drive decisions.',
          },
          {
            mistake: 'Deploying kernel SVM on very large n',
            fix: 'Kernel training grows ~quadratically; at hundreds of thousands of rows, boosted trees, linear models on engineered features, or neural nets are the practical path — keep SVMs for the small/medium regime where their margin geometry shines.',
          },
        ],
        exam: {
          question:
            'Define the margin and support vectors. Explain the effect of C, explain the kernel trick using the RBF kernel as the example, and name the one preprocessing step you must never skip.',
          answer:
            'The margin is the empty street between the two parallel hyperplanes passing through the nearest points of each class; SVM maximises its width for robustness. Support vectors are the training points lying on those hyperplanes — they alone determine the boundary (delete the rest, boundary unchanged). C trades margin width against training errors: large C penalises misclassifications heavily → narrow, high-variance margins; small C tolerates errors → wide, smoother, higher-bias margins. The kernel trick: for many higher-dimensional feature maps φ, the optimiser only needs dot products ⟨φ(x), φ(z)⟩; a kernel function K computes exactly that without ever forming φ — RBF K(x,z) = exp(−γ‖x−z‖²) yields flexible, similarity-based boundaries (infinite-dimensional implicit map), with γ controlling each point\'s influence radius. Mandatory preprocessing: feature scaling — both the linear-margin geometry and RBF distances are coordinate-dependent; skip scaling and you have distorted the model\'s entire notion of space.',
          source: 'Evergreen ML theory exam question; margin/kernel follow-ups are standard in graduate screens.',
        },
        summary: [
          'SVM draws the maximum-margin boundary; support vectors are the few points that define it.',
          'Soft margins allow errors at cost C — the bias–variance dial, tuned by CV.',
          'The kernel trick separates data in an implicit higher dimension using only dot-product shortcuts; RBF is the flexible default with γ as reach.',
          '(C, γ) tuned jointly on a log grid, on scaled features, is the RBF SVM ritual.',
          'Strong on small/medium scaled tabular data and high-dim sparse text (linear kernel); weak at very large n.',
          'Probabilities need calibration; margins are not probabilities — know which output you are thresholding.',
        ],
      }),
      [
        [
          'Support vectors are:',
          [
            'The features with the largest coefficients',
            'The training points closest to the decision boundary that define the margin',
            'The test points nearest the training mean',
            'Vectors used only in the kernel trick',
          ],
          1,
          'They lie on the margin hyperplanes; remove all other points and the boundary does not move.',
        ],
        [
          'Increasing C in a soft-margin SVM makes the model:',
          [
            'Tolerate more misclassifications (wider margin)',
            'Punish misclassifications more heavily (narrower margin, higher variance)',
            'Switch to a polynomial kernel',
            'Automatically scale the features',
          ],
          1,
          'C is the price of constraint violation: expensive errors → tight margins that fit the training data harder.',
        ],
        [
          'The kernel trick allows an SVM to:',
          [
            'Skip feature scaling',
            'Use dot products in an implicit higher-dimensional space without computing the mapped coordinates',
            'Reduce training time to constant',
            'Convert classification into regression',
          ],
          1,
          'Many algorithms need only inner products; kernels supply those inner products in the mapped space directly — the map itself is never built.',
        ],
        [
          'For an RBF kernel, a very large γ typically produces:',
          [
            'A smooth, nearly linear boundary',
            'Wiggly boundaries that follow individual points — high variance, risk of memorisation',
            'A model identical to linear SVM',
            'Faster training',
          ],
          1,
          'Large γ makes similarity decay fast — each point influences only its immediate neighbourhood, so the boundary carves islands around training points.',
        ],
      ]
    ),
    lesson(
      M5,
      'mlf-5-4',
      54,
      'PCA: Compressing Data Along the Directions of Greatest Variance',
      'Principal component analysis as variance-maximising projection — components, explained variance, the 2-D visualisation use case, when compression denoises, and why standardisation is not optional.',
      20,
      nineBlocks({
        objectives: [
          'Explain what the first principal component maximises and interpret explained variance ratios',
          'Choose the number of components via cumulative explained variance and justify the choice',
          'Run PCA (conceptually and in code) for visualisation of a multi-feature dataset in 2-D',
          'State why PCA requires standardised features when scales differ, and when PCA is the wrong tool',
        ],
        hook:
          'You have a table with 30 columns and no way to plot it. Investors, biologists, and quality engineers all share the same trick: squash it to two dimensions that keep as much of the spread as possible, then draw the scatter. Clusters appear; trajectories appear; sometimes a bug (a batch of outliers) appears that 30 separate histograms hid. The trick has a name older than most ML tooling — principal component analysis — and it remains the first thing to try when a dataset is too wide to look at.',
        concept: `**The idea: find the directions data actually spreads along.** Scatter clouds of high-dimensional data are not spheres — they are elongated blobs. PCA finds the straight lines (directions through the mean) along which the data\'s variance is largest, subject to being mutually perpendicular (orthogonal). The first **principal component (PC1)** is the direction with maximum variance — think of it as the axis of the thinnest rubber band you could stretch along the cloud. PC2 is the highest-variance direction orthogonal to PC1, PC3 orthogonal to both, and so on. Each component is a **weighted combination of all original features** — a direction in feature space, not a single column — and projecting the data onto the top-k components gives a k-dimensional summary that retains more variance than any other k-dimensional linear projection. That optimality ("no other linear k-D view keeps more spread") is PCA\'s entire claim to fame, and it is why the method feels principled rather than arbitrary.

**Eigen-speak, translated.** The machinery: compute the covariance matrix of (standardised) features; its eigenvectors are the principal directions and its eigenvalues the variance captured along each. You do not need the linear algebra to *use* PCA, but the translation helps in interviews: eigenvector = a direction that data prefers (stretches along it without tilting); eigenvalue = how much stretch. Components come ordered by eigenvalue descending — PC1 always owns the largest share. In scikit-learn the objects are trivial (PCA(n_components=k); .fit; .transform; .explained_variance_ratio_), and every serious use of PCA checks that ratio array before trusting the projection.

**Explained variance ratio: the honesty check.** explained_variance_ratio_[i] is the fraction of total variance PC i + 1 captures. On a 4-feature table with ratios [0.62, 0.25, 0.09, 0.04], the first two components hold 87% of the spread — a defensible 2-D visualisation and a reasonable 2-D compression if your downstream task tolerates the lost 13%. The standard selection rule: keep the smallest k whose cumulative ratio crosses a threshold (90–95% for compression; 2 components for plotting regardless). The lost tail is often called "noise" — sometimes fairly (measurement jitter, redundant features) and sometimes arrogantly (a low-variance direction can still carry rare-but-critical signal, like a fault indicator). Variance is unsupervised: PCA never looks at your label, so "most spread" ≠ "most predictive". Check downstream task performance after reduction, always.

**The three canonical uses.** (1) **Visualisation** — project to PC1×PC2 and plot; cluster structure, class separation, and outlier batches become visible for datasets that were previously unviewable. This is the single most common honest use. (2) **Compression / denoising** — keep 95% variance in fewer columns; downstream models train faster, and if the truncated components were mostly noise, accuracy can even improve (a mild regulariser). (3) **Decorrelation** — PCs are uncorrelated by construction; some algorithms behave better on orthogonal features (it also removes multicollinearity headaches for linear models — at the cost of interpretability, since components are mixtures). Neighbouring methods worth naming: for *visualisation of very large non-linear manifolds*, t-SNE/UMAP prioritise local neighbourhoods over variance and are the modern plot-of-choice; PCA stays the linear, invertible, variance-accountable workhorse. (Invertible: you can transform back — approximately, if you truncated — which is why PCA underlies "eigenfaces" and compression demos.)

**Scaling dependence — the trap that bites everyone once.** PCA maximises *variance*, and variance is measured in the feature\'s own units: a feature in rupees (variance in the crores) will own PC1 by sheer scale, while a feature in fractions (debt ratio) contributes nothing — the components mirror unit systems, not structure. Standardise first (zero mean, unit variance) whenever features have different scales — which is almost always. (If features genuinely share units and scales — e.g., thousands of equally-scaled sensor channels — raw PCA can be legitimate.) Two further cautions: PCA is **linear** (curved manifolds need kernels/t-SNE/UMAP); and it is **sensitive to outliers** along candidate directions (a few extreme points can grab PC1 — robust scaling or outlier removal beforehand helps). Fit the scaler and PCA on training data only, like every other data-dependent transform — projecting test data with train-fitted components keeps evaluation honest.

**When not to reach for PCA.** If interpretability matters ("which original feature drives this?"), PCA costs you the columns' names — components are mixtures; prefer feature selection. If the goal is supervised prediction with modest d, try the model directly (and regularisation) before reducing — PCA discards label-relevant low-variance directions by design. If classes separate along a low-variance direction, PCA can erase the signal you needed. Use PCA deliberately: for eyes on wide data, for compression with a variance budget, and for decorrelation — not as a ritual preprocessing step before every model.`,
        extras: [
          table(
            'PCA uses and their caveats',
            ['Use', 'Keep', 'Caveat'],
            [
              ['Visualisation', '2 components', 'Linear projection only; try UMAP/t-SNE for non-linear manifolds'],
              ['Compression', 'k at 90–95% cumulative variance', 'Check task metrics after — variance ≠ label signal'],
              ['Decorrelation', 'All components', 'Interpretability lost — components mix original features'],
              ['Denoising', 'Truncated reconstruction', 'Rare low-variance signal can be discarded as "noise"'],
            ],
          ),
          code(
            '# PCA for visualisation + variance-budget compression\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.decomposition import PCA\nimport matplotlib.pyplot as plt\n\nXs = StandardScaler().fit_transform(X_train)      # mandatory when scales differ\npca = PCA().fit(Xs)\nprint(pca.explained_variance_ratio_)\ncum = pca.explained_variance_ratio_.cumsum()\nprint(\"components for 95% variance:\", int((cum <= 0.95).sum() + 1))\n\n# 2-D visualisation\nX2 = PCA(n_components=2).fit_transform(Xs)\nplt.scatter(X2[:, 0], X2[:, 1], c=y_train, s=8, alpha=0.6)\nplt.xlabel(\"PC1\"); plt.ylabel(\"PC2\"); plt.title(\"PCA projection (colored by class)\")\n\n# Compression: transform train/test with the SAME train-fitted objects\npca95 = PCA(n_components=0.95).fit(Xs)            # keep 95% variance automatically\nXs_tr = pca95.transform(StandardScaler().fit_transform(X_train))\nXs_te = pca95.transform(StandardScaler().transform(X_test))',
            'pca_visualize.py',
            'python'
          ),
          warn(
            'Unscaled PCA on mixed-unit data is a unit converter, not an analysis',
            'The largest-scale feature captures PC1 by default. If your explained-variance plot looks like "one component, everything", check your units before trusting anything about structure.',
          ),
          tip(
            'Color PCA plots by label AND by known batches',
            'Class color shows separation; batch/source color catches collection artifacts — PCA plots regularly expose "the clusters were just two hospitals" before a model does.',
          ),
        ],
        worked: {
          title: 'Variance budget by hand, then the 2-D projection story',
          problem:
            'A 2-D dataset (after standardising you would... no — use raw for the first part) has variance 10 along x₁ and variance 1 along x₂ (features nearly uncorrelated). (a) Identify PC1 and the explained variance ratio for keeping one component. (b) Explain what a 2-D→1-D projection loses. (c) If x₁ were measured in "paisa" (×100 scale) and x₂ in "metres", what changes without standardisation?',
          steps: [
            {
              title: '(a) PC1 with uncorrelated features',
              desc: 'With zero correlation, principal directions align with the coordinate axes; the larger-variance axis wins. PC1 = x₁ direction; variance ratio = 10/(10+1) = 10/11 ≈ 0.91. Keeping one component retains ~91% of the total spread — a plausible compression.',
            },
            {
              title: '(b) What 1-D projection loses',
              desc: 'The x₂ variation (9% of spread) is discarded — points differing only in x₂ collapse onto the same PC1 coordinate. If that 9% carried your label signal, downstream accuracy dies while the variance report looks great. Variance is unsupervised; always re-check the task after reducing.',
            },
            {
              title: '(c) The paisa trap',
              desc: 'Multiply x₁ by 100 → its variance scales by 10,000: 100,000 versus x₂\'s 1 — PC1 is x₁ by landslide, and the ratio becomes ≈ 0.99999 — not because structure changed, but because units did. Standardise first: both features at variance 1, PC1 then reflects true correlation structure (here either axis at 50/50, or the correlated direction if any). Same data, two stories — only one of them is about the world.',
            },
            {
              title: 'The interview line',
              desc: 'PC1 maximises variance of the projection; explained_variance_ratio_ reports each component\'s share of total variance; standardisation is required when features have different scales because PCA maximises unit-dependent variance.',
            },
          ],
          solution:
            '(a) PC1 = x₁ direction, ratio ≈ 0.91. (b) The x₂ spread (≈9%) is gone — check label performance after any truncation. (c) Paisa-scaling inflates x₁\'s variance 10,000× and fakes a dominant PC1 — standardise, or PCA reports your unit system instead of your data\'s structure.',
        },
        practice: {
          title: 'Project, plot, and interrogate',
          prompt:
            'On any dataset with 4+ features: standardise, fit PCA, print explained_variance_ratio_ and the component count for 95% variance. Make a 2-D PC1/PC2 scatter colored by the label (if any) and by any known batch/source column. Write down one thing the plot revealed that per-column histograms would have missed.',
          hint: 'Look for: label separation, outlier islands, and "clusters" that are actually data-collection batches — PCA plots confess before models do.',
        },
        mistakes: [
          {
            mistake: 'Running PCA on unscaled mixed-unit features',
            fix: 'StandardScaler first (almost always). The largest-scale feature otherwise owns PC1 for reasons that have nothing to do with structure.',
          },
          {
            mistake: 'Assuming "95% variance kept" means "95% of the predictive signal kept"',
            fix: 'Variance is label-blind; low-variance directions can be the most predictive. Validate the downstream task on the reduced features before shipping the compression.',
          },
          {
            mistake: 'Using PCA and then interpreting components as original features',
            fix: 'Components are mixtures (each loads on every original column). For feature-level storytelling use selection/importance methods; keep PCA for geometry, speed, and visuals.',
          },
          {
            mistake: 'Fitting PCA on the whole dataset before train/test splitting',
            fix: 'Fit scaler+PCA on train only; transform test with the frozen objects. Also remember PCA is linear — for non-linear manifolds at plotting time, try UMAP/t-SNE (but keep them out of any supervised leakage path).',
          },
        ],
        exam: {
          question:
            'Define what the first principal component maximises. Given explained_variance_ratio_ = [0.55, 0.25, 0.12, 0.08] on a standardised 4-feature dataset, how many components would you keep for (a) a 2-D visualisation and (b) a compression pipeline targeting ~95% retained variance? Why must the features be standardised in general?',
          answer:
            'PC1 is the direction (unit vector in feature space) maximising the variance of the projected data; PC2 the maximum-variance direction orthogonal to PC1, and so on — components are ordered by captured variance, mutually orthogonal, and together optimal among linear k-D projections for variance retention. (a) Visualisation: exactly 2 components (PC1 × PC2 scatter) — here holding 55% + 25% = 80% of variance, fine for plotting. (b) Compression at ~95%: cumulative is 0.55, 0.80, 0.92, 1.00 → the 95% threshold is only crossed at all 4 components (or nearest k=4; with this spectrum a 92% budget at k=3 might be the honest engineering compromise, declared as such). Standardisation is required when features have different units/scales because PCA maximises variance measured in those units — an unscaled feature in large units dominates the components regardless of structure, so the projection reflects the unit system rather than the data geometry. (Also fit the scaler and PCA on training data only, to keep evaluation honest.)',
          source: 'Standard PCA exam question (what it maximises + variance-ratio selection + scaling reasoning).',
        },
        summary: [
          'PCA finds orthogonal directions of maximum variance; components are ordered by explained variance.',
          'explained_variance_ratio_ plus its cumulative sum is the selection tool: 2-D for plots, threshold k for compression.',
          'Canonical uses: visualisation of wide data, compression/denoising with a variance budget, decorrelation of collinear features.',
          'Variance is label-blind — low-variance directions can carry predictive signal; always re-check the downstream task.',
          'Standardise when scales differ, or PCA reports your units instead of your structure.',
          'PCA is linear and outlier-sensitive; fit it on train only; reach for UMAP/t-SNE for non-linear visual manifolds.',
        ],
      }),
      [
        [
          'The first principal component is the direction that:',
          [
            'Maximises correlation with the label',
            'Maximises the variance of the projected data',
            'Minimises the distance to the origin',
            'Contains the most missing values',
          ],
          1,
          'Variance-maximising (label-blind) is PCA\'s defining objective.',
        ],
        [
          'explained_variance_ratio_ = [0.60, 0.25, 0.10, 0.05]. Keeping 2 components retains:',
          ['25%', '60%', '85%', '95%'],
          2,
          'Cumulative variance of the first two components: 0.60 + 0.25 = 0.85.',
        ],
        [
          'PCA on unscaled features where one column is measured in rupees (range 1e5) and another as a ratio (range 0–1) will typically:',
          [
            'Ignore the rupees column',
            'Let the large-scale rupees column dominate the components regardless of true structure',
            'Automatically standardise',
            'Fail with an error',
          ],
          1,
          'PCA maximises unit-dependent variance; standardise first or the biggest units win by default.',
        ],
        [
          'A primary reason to use PCA before a supervised model is:',
          [
            'It increases the label information in the data',
            'Compression/decorrelation — fewer uncorrelated features can speed training and reduce multicollinearity (check that task metrics survive)',
            'It is required by logistic regression',
            'It creates new labels',
          ],
          1,
          'PCA summarises existing spread; it adds no information — the gains are efficiency and stability, and only if the retained variance carries the signal.',
        ],
      ]
    ),
  ],
};
