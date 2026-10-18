// Module 8 — Unsupervised Learning: Clustering, Anomalies and Structure
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, code } from '../nineBlocks';
import { lesson, M8, COURSE_ID } from './helpers';

export const module8: CourseModule = {
  id: M8,
  course_id: COURSE_ID,
  title: 'Module 8 — Unsupervised Learning: Clustering, Anomalies and Structure',
  summary:
    'Learning without labels: k-means with the honest ways to choose k (elbow, silhouette, downstream lift), hierarchical clustering and the dendrogram as a granularity dial, anomaly detection with robust statistics and isolation forests under an alert budget, and PCA with a strict reading of what t-SNE and UMAP plots are allowed to claim. Every result is judged by stability, utility or cost, because with no labels the training objective itself is never evidence.',
  sort_order: 8,
  lessons: [
    lesson(
      M8,
      'mlf-8-1',
      81,
      'K-Means: Assignment, Scaling, and Choosing k Without Fooling Yourself',
      'The algorithm that only needs distances, why feature units decide your clusters, and the three honest ways to pick k when inertia alone will always lie to you.',
      20,
      nineBlocks({
        objectives: [
          'Execute one full Lloyd iteration (assign, update, re-assign) by hand and declare convergence correctly',
          'Explain why unscaled features make distance-based clustering meaningless, and fix it with a pipeline',
          'Choose k using elbow, silhouette and downstream lift, and state the caveat of each method',
          'Predict when k-means will fail (non-spherical shapes, size imbalance, outliers, high dimension) and name the remedy',
        ],
        hook:
          'A telecom team clusters customers on two columns: sessions per week (range 0 to 10) and data used per month (range 0 to 5000 MB). The output is beautiful - three crisp segments that all line up along the MB axis, and the sessions column contributes nothing. The segments are real arithmetic and worthless business: they are a rescaled histogram of one feature. Nothing in the KMeans object warns you, because Euclidean distance does not know that 5000 MB and 10 sessions are not the same kind of number. Scale is not a preprocessing detail in clustering - scale IS the model, because distance is the only thing k-means has.',
        concept: `**The algorithm: assign, update, repeat.** K-means picks k initial points as centroids, then alternates two trivial steps until nothing moves. **Assign:** every row joins the cluster of its nearest centroid (the course uses squared Euclidean distance, which has the same ordering as the distance itself). **Update:** each centroid becomes the mean of the rows that joined it. **Repeat** until assignments stop changing. Two properties matter more than the mechanics. First, each full iteration can only reduce the **inertia** (within-cluster sum of squared distances to the centroid) - the quantity k-means minimises - so the number always falls and training always terminates. Second, it only ever finds a **local** optimum: a bad seeding can leave you in a partition another seed would beat, which is why scikit-learn restarts with n_init (default 10) and keeps the best inertia. K-means is therefore an optimiser for a chosen objective, not a discoverer of truth - and a lower inertia is only evidence that you optimised harder, never that the segments are real.

**Scale decides everything.** Distance is computed feature by feature, so the column with the biggest numbers votes the loudest. If one feature spans 0 to 5000 and another 0 to 10, the first contributes up to 25 million to a squared distance and the second at most 100: the clustering reduces to bucketing that one column. The fix is standardisation (zero mean, unit variance) inside a pipeline so the same transformation is available at scoring time - or deliberate feature selection when you already know which columns define the segment. The mirror-image trap is clustering columns that are duplicates in disguise: three versions of the same usage count triple its vote; drop or combine them first.

**Choosing k: three honest options and one dishonest one.** The dishonest one is lowest inertia - inertia falls monotonically as k rises (at k = n it is exactly 0), so that rule always returns the largest k you allowed. The honest options are complementary. **Elbow:** plot inertia against k and look for the knee where each extra cluster stops buying much reduction; cheap, but the knee is often a judgement call. **Silhouette:** for each point, a = mean distance to its own cluster, b = mean distance to the nearest other cluster, s = (b - a) / max(a, b); it runs from -1 (in the wrong cluster) through 0 (on the boundary) to 1 (clearly separated), and the average peaks at a k that balances cohesion and separation. It costs O(n squared) distance computations, so sample your rows for large n. **Downstream lift:** add the cluster id as a feature or a segmentation report and check whether the real metric moves - this is the only one that pays the bills, and it needs the usual held-out discipline. When they disagree, trust the downstream answer, use silhouette as the tie-breaker and the elbow as a sanity check.

**When k-means cannot work.** It assumes convex, roughly equal-size, isotropic blobs - the objective literally pulls every cluster toward a centre. Two interleaving moons get cut by a straight line no matter what k is (use DBSCAN or a spectral method); one huge segment plus many tiny ones get equalised by the centroid update; a single far outlier drags its centroid and warps its whole group (remove or winsorise first); in very high dimensions all distances concentrate and nearest stops meaning anything (reduce with PCA first, then re-examine); mixed numeric and categorical columns need k-prototypes or Gower distances rather than Euclidean. And the meta-rule: never evaluate a clustering with the inertia it just minimised - report silhouette, stability under resampling, or downstream lift instead.`,
        extras: [
          table(
            'Choosing k — what each method is actually answering',
            ['Method', 'What it measures', 'How to read it', 'Caveat'],
            [
              ['Elbow (inertia)', 'Total within-cluster squared distance', 'The point where extra k stops buying reduction', 'Always falls; the knee is a judgement call'],
              ['Silhouette', 'Cohesion a vs separation b per point', 'Near 1 = clean; 0 = boundary; negative = misassigned', 'O(n squared); favours equal-size convex clusters'],
              ['Downstream lift', 'Whether the segment changes a real metric', 'Held-out business metric improves with cluster id', 'The only method that pays; needs a holdout'],
              ['Stability', 'Same clusters after resampling rows', 'High overlap (Jaccard) = structure, not noise', 'Stable can still be wrong; cheap insurance'],
            ],
          ),
          code(
            '# Elbow + silhouette in one loop, scaled inside the loop of truth\nimport numpy as np\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.cluster import KMeans\nfrom sklearn.metrics import silhouette_score\n\nXs = StandardScaler().fit_transform(X)   # distances need comparable units\n\ninertias, sils = [], []\nfor k in range(2, 11):\n    km = KMeans(n_clusters=k, n_init=10, random_state=0).fit(Xs)\n    inertias.append(km.inertia_)\n    sils.append(silhouette_score(Xs, km.labels_))\n\nprint("inertia:", np.round(inertias, 1))      # always falls - never the criterion\nprint("silhouette:", np.round(sils, 3))       # peak = candidate k\nbest = int(np.argmax(sils) + 2)\n\n# report centroids back in ORIGINAL units so segments can be described\nscaler = StandardScaler().fit(X)\ncentres = scaler.inverse_transform(\n    KMeans(n_clusters=best, n_init=10, random_state=0).fit(Xs).cluster_centers_)\nprint("k =", best, "centroids:", np.round(centres, 2))',
            'kmeans_choose_k.py',
            'python'
          ),
          warn(
            'Distance-based clustering on unscaled columns',
            'If features have different units or ranges, k-means clusters the biggest number. StandardScaler (or MinMax, chosen deliberately) inside a pipeline is mandatory, not optional.',
          ),
          tip(
            'Describe clusters in original units, decide with downstream lift',
            'Centroids come back scaled - inverse-transform them so stakeholders can read segments. Then test whether the segment id moves a held-out metric; if it does not, the clusters were decoration.',
          ),
        ],
        worked: {
          title: 'One Lloyd iteration by hand, then a silhouette score',
          problem:
            'Four points: p1 = (1, 1), p2 = (2, 1), p3 = (8, 8), p4 = (9, 8). k = 2 with initial centroids mu1 = (1, 1), mu2 = (9, 9). (a) Perform the assignment and update steps of one iteration (use squared Euclidean distance). (b) Assign again: has training converged, and what is the inertia? (c) Compute the silhouette of p1 and interpret it. (d) With 10 candidate values of k, what procedure would you report to your manager and why is lowest inertia not part of it?',
          steps: [
            {
              title: '(a) Assign and update',
              desc: 'Squared distances: p1 to mu1 = 0 vs 100; p2 to mu1 = 1 vs 113; p3 to mu1 = 98 vs 2; p4 to mu1 = 100 vs 26. Clusters: {p1, p2} and {p3, p4}. Update: mu1 = mean of p1, p2 = (1.5, 1); mu2 = mean of p3, p4 = (8.5, 8).',
            },
            {
              title: '(b) Re-assign and converge',
              desc: 'p1: 0.25 vs 105.25; p2: 0.25 vs 91.25; p3: 91.25 vs 0.25; p4: 105.25 vs 0.25 - identical membership, so assignments stopped changing: converged. Inertia = 0.25 + 0.25 + 0.25 + 0.25 = 1.0 (each point sits 0.5 off its centroid in x).',
            },
            {
              title: '(c) Silhouette of p1',
              desc: 'a = mean distance to its own cluster member p2 = 1.0. b = mean distance to the other cluster: d(p1, p3) = sqrt(98) = 9.90, d(p1, p4) = sqrt(113) = 10.63, so b = 10.26. s = (b - a) / max(a, b) = 9.26 / 10.26 = 0.90 - p1 is nowhere near a boundary.',
            },
            {
              title: '(d) Choosing k with 10 candidates',
              desc: 'Run k = 2..10 (n_init 10, same scaled data), plot the elbow, compute average silhouette for each k (undefined at k = 1), then pick k by downstream lift on a held-out metric and use silhouette as the tie-breaker. Lowest inertia is excluded because it decreases mechanically with k and is minimised at k = n; reporting it as a selection rule would always choose the most fragmented partition available.',
            },
          ],
          solution:
            'One iteration: {p1, p2} / {p3, p4}, centroids (1.5, 1) and (8.5, 8); the second assignment is unchanged, so training converged with inertia 1.0. Silhouette of p1 = 0.90 (tight and far). Selection: elbow for shape, silhouette for cohesion-vs-separation, downstream lift for the decision - never minimum inertia, which is minimised at k = n and therefore selects over-fragmentation by construction.',
        },
        practice: {
          title: 'Two seeds, one dataset, and a stability check',
          prompt:
            'Run KMeans (k = 4) on your own dataset twice with different random_state values. Print both inertias, then match the clusters between runs (compare with a crosstab after optimal label matching, or with the adjusted Rand index). Report: the inertia difference, whether the segments are the same up to label switching, and what you would conclude about whether the structure is real or a coin flip of initialisation.',
          hint: 'Cluster numbers are names, not ranks - never compare cluster 1 across runs directly. Low adjusted Rand index between seeds means the structure is weak; raise stability by removing noise features, scaling, or reconsidering k.',
        },
        mistakes: [
          {
            mistake: 'Clustering raw columns with different units or ranges',
            fix: 'Scale inside a pipeline first. If one feature dominates the variance, it dominates the distance, and the clusters become a rescaling of that column.',
          },
          {
            mistake: 'Choosing k by the lowest inertia',
            fix: 'Inertia falls monotonically with k and hits zero at k = n. Use elbow for shape, silhouette for separation, downstream lift for the decision.',
          },
          {
            mistake: 'Reading cluster ids as ordered or comparable across runs',
            fix: 'Cluster 3 in one run has no relation to cluster 3 in another - labels are names. Match runs with adjusted Rand index or a crosstab before comparing.',
          },
          {
            mistake: 'Applying k-means to moons, rings or strongly imbalanced segments',
            fix: 'The objective assumes convex equal-size blobs. Use DBSCAN/spectral clustering for non-convex shapes, or re-sample/weight for heavy size imbalance.',
          },
          {
            mistake: 'Fitting the scaler and clusters on all rows, then evaluating the cluster id in a supervised model',
            fix: 'Everything learned must fit on training rows only - fit scaler and k-means on the train split and use .predict on validation, or the segment feature leaks.',
          },
        ],
        exam: {
          question:
            'Explain why minimum inertia can never be the rule for choosing k. Define the silhouette coefficient including what s = 0 and s = -1 mean, and outline a defensible k-selection procedure combining elbow, silhouette and a business metric.',
          answer:
            'Inertia (within-cluster sum of squared distances to centroids) decreases monotonically as k grows - splitting a cluster can never increase it - and equals zero at k = n, so minimising it always selects the most fragmented partition allowed, however meaningless the segments are. Silhouette: for a point, a = mean distance to points in its own cluster, b = mean distance to the nearest other cluster, s = (b - a) / max(a, b). s = 0 means the point sits on the boundary between two clusters (equally close to both); s = -1 means it is closer on average to another cluster than to its own - it is in the wrong cluster. Procedure: (1) standardise features in a pipeline; (2) run k = 2..10 with multiple restarts and plot inertia to find the knee region; (3) compute average silhouette within that region and take its maximum as the candidate; (4) test candidate k values as a segment feature or report on a held-out business metric (downstream lift) and confirm stability under resampling; (5) report the choice with the metric that matters to the stakeholder, keeping elbow and silhouette as supporting evidence rather than the decision itself.',
          source: 'Evergreen clustering exam question (k-selection reasoning + silhouette definition).',
        },
        summary: [
          'K-means alternates nearest-centroid assignment and centroid update until assignments stop; inertia only ever falls, and restarts are needed because only a local optimum is guaranteed.',
          'Distance is the whole model, so unscaled or duplicated features silently decide the clusters - standardise inside a pipeline.',
          'Silhouette balances cohesion and separation per point: 1 = clean, 0 = boundary, negative = misassigned.',
          'Never choose k by minimum inertia; combine elbow (shape), silhouette (separation) and downstream lift (the decision).',
          'k-means assumes convex equal-size blobs - moons, heavy imbalance, outliers and high dimensions each need a different tool.',
        ],
      }),
      [
        [
          'Lloyd\'s algorithm for k-means is guaranteed to find:',
          [
            'The global minimum of inertia',
            'A local optimum of inertia - the result depends on the initial centroids, hence multiple restarts',
            'The same partition on every run regardless of seed',
            'The clustering that maximises silhouette',
          ],
          1,
          'The objective is non-convex in the assignments; different seeds can land in different local optima, which is why n_init restarts and keeps the best inertia.',
        ],
        [
          'Feature A ranges 0 to 10 and feature B ranges 0 to 5000, and you cluster without scaling. What happens?',
          [
            'Both features contribute equally after distance is computed',
            'The clusters track feature B almost exclusively, because its squared distance contribution can reach millions while A contributes at most 100',
            'K-means automatically normalises the columns',
            'Nothing - k-means uses ranks, not values',
          ],
          1,
          'Euclidean distance has no notion of units: the widest-scale column dominates. StandardScaler (or MinMax) inside a pipeline restores balanced voting.',
        ],
        [
          'A point with silhouette coefficient approximately 0 means:',
          [
            'It is perfectly in the middle of a cluster',
            'It sits on the boundary - about equally distant from its own cluster and the nearest other cluster',
            'It is in the wrong cluster',
            'It is an outlier',
          ],
          1,
          's = (b - a) / max(a, b): s near 0 means a and b are almost equal, the definition of a boundary point. Negative s means the point is closer to another cluster.',
        ],
        [
          'A student reports that k = 9 beats k = 3 because inertia is lower. The correct response is:',
          [
            'Agree - lower inertia is always a better model',
            'Point out that inertia decreases with every extra cluster and is zero at k = n; compare elbow, silhouette and downstream lift on the same scaled data instead',
            'Agree only if the gap is larger than 10 percent',
            'Ask them to increase n_init until the gap closes',
          ],
          1,
          'Lower inertia at larger k is arithmetic, not evidence. Selection requires a criterion that can prefer a smaller k: the elbow, silhouette, stability, or a held-out business metric.',
        ],
      ]
    ),
    lesson(
      M8,
      'mlf-8-2',
      82,
      'Hierarchical Clustering: Dendrograms, Linkage, and When Segments Pay Off',
      'Bottom-up merging under four different definitions of between-cluster distance, reading a dendrogram as a granularity dial, knowing the O(n squared) price, and separating clustering that pays from clustering that decorates.',
      21,
      nineBlocks({
        objectives: [
          'Run agglomerative merging on a small distance set under single, complete and average linkage',
          'Read a dendrogram, cut it at a chosen height, and explain how the cut replaces k',
          'State the time and memory cost of hierarchical clustering and its practical data-size limit',
          'Decide from a business question whether clustering adds value or merely restates the data',
        ],
        hook:
          'A support lead has 40,000 ticket texts and a director asking for "the six types of complaint". There are no labels, so she has two bad options: guess six flat clusters with k-means and defend an arbitrary number, or refuse. Agglomerative clustering gives her a third: a dendrogram where the merges are visible, so the director can see that complaints split into billing and technical at a coarse cut, then into five sub-types when cut lower, and pick the granularity with the business logic in the room. The dendrogram does not discover truth - it turns an argument about k into a picture about structure, and it does so once, for a cost that grows quadratically with rows.',
        concept: `**Agglomerative, bottom-up.** Hierarchical clustering starts with every row as its own cluster and merges the two closest ones, repeatedly, until one cluster contains everything. Nothing is ever unmerged, so the whole history is one tree - a **dendrogram** - whose leaf nodes are rows and whose internal nodes are merges. The only decisions the algorithm needs are (1) a distance between rows and (2) a definition of distance between *clusters*, since after the first merge you must compare groups rather than points. That second choice is **linkage**, and it changes the answer completely.

**The four linkages, by their failure modes.** **Single** linkage takes the minimum pairwise distance between clusters: it happily follows elongated, curved shapes (it will trace a moon) but suffers **chaining** - one bridge row of noise can glue two real groups together. **Complete** linkage takes the maximum: it builds compact, equal-diameter groups and treats a single outlier as the whole distance to the next cluster, so outliers distort it. **Average** is the mean of all pairwise distances, a compromise that behaves sanely on mixed shapes. **Ward** (the usual default for continuous data) does not use a distance between clusters at all - it merges the pair whose fusion adds the least to the total within-cluster variance, which is the same objective spirit as k-means and tends to produce balanced, spherical groups; its dendrogram heights are therefore increases in variance (scipy implements ward on squared distances), and they are **not** on the same scale as single/complete heights. Reading one dendrogram line and comparing it across methods is a category error.

**The dendrogram is a granularity dial, not an answer.** The y-axis is merge height: cutting at height h yields exactly the clusters formed by all merges at or below h. Low cut = few broad groups; high cut = many fine groups. This is the practical advantage over k-means - you decide k *after* seeing the structure - and the practical trap: cutting wherever the picture looks tidy is post-hoc selection. Pick the cut from domain meaning (operational teams, price bands), from a stability check, or from a downstream metric, and record why. Beware heights under Ward (variance units) versus linkage methods (distance units), and never read a leaf ordering as meaningful: siblings can be drawn left-to-right in any order without changing the clustering.

**The price, and when clusters actually pay.** Storing the distance matrix costs O(n squared) memory and naive merging costs O(n squared) to O(n³) time: comfortable up to a few thousand rows (scipy handles tens of thousands with fast algorithms, but memory is the wall), hopeless for millions - there you sample, or use k-means/BIRCH first. Value test: clustering earns its place when it (1) **summarises** for humans (segments, prototypes, taxonomy for a director), (2) **features** a downstream model (cluster id or distance-to-centroid as columns, fit on training rows only), (3) **samples** intelligently (stratified acquisition by segment), or (4) **grounds anomalies** (rows far from their own segment are more interesting than rows far from the global mean). It does not earn its place when a label exists that you could simply measure, when the same question was already answered by a supervised model, or when the clusters will be shown as proof of anything - a segment is a compression of your data, not a finding about the world. Stability is the cheapest honesty test: re-run on 80% of rows, match clusters, and compute the overlap; if the taxonomy dissolves, do not ship it.`,
        extras: [
          table(
            'Linkage: one algorithm, four very different clusterings',
            ['Linkage', 'Distance between clusters', 'Behaviour', 'Reach for it when'],
            [
              ['Single', 'Minimum pairwise distance', 'Chains elongated shapes; one noisy bridge can fuse groups', 'Structure is elongated and noise is truly isolated'],
              ['Complete', 'Maximum pairwise distance', 'Compact equal-size groups; one outlier sets the distance', 'Groups are tight and you prefer hard boundaries'],
              ['Average', 'Mean of all pairwise distances', 'Compromise; less brittle than either extreme', 'You want a neutral default on mixed shapes'],
              ['Ward', 'Least increase in within-cluster variance', 'Rounded, balanced, k-means-like groups (variance heights)', 'Continuous features and you want one defensible default'],
            ],
          ),
          code(
            '# Dendrogram as the granularity dial: cut where the business says so\nimport numpy as np\nfrom scipy.cluster.hierarchy import linkage, dendrogram, fcluster\nimport matplotlib.pyplot as plt\n\nZ = linkage(X, method=\"ward\")   # merge adding the least within-cluster variance\n\ndendrogram(Z, color_threshold=5, truncate_mode=\"lastp\", p=30)\nplt.axhline(5, ls=\"--\")        # the cut = the argument you can defend\nplt.ylabel(\"merge height (variance units for ward)\")\nplt.show()\n\nlabels = fcluster(Z, t=5, criterion=\"distance\")   # groups formed by merges <= 5\nprint(\"clusters:\", labels.max(), \"sizes:\", np.bincount(labels)[1:])\n\n# same data, four linkages - compare STRUCTURE, not raw heights\nfor m in (\"single\", \"complete\", \"average\", \"ward\"):\n    Zm = linkage(X, method=m)\n    print(m, \"->\", fcluster(Zm, t=5, criterion=\"distance\").max(), \"clusters at h=5\")',
            'dendrogram_cut.py',
            'python'
          ),
          warn(
            'Single linkage chaining and ward height scales',
            'Single linkage will weld two clusters together through one bridge row of noise; check the cut under complete linkage too. Ward heights are variance increases (scipy uses squared distances) - never compare them numerically with single/complete heights.',
          ),
          tip(
            'Stability before shipping a taxonomy',
            'Re-run on 80% of rows and match clusters (adjusted Rand index against the full run). High agreement means structure; low agreement means your categories are a property of the sample, not the customers.',
          ),
        ],
        worked: {
          title: 'Merge sequence under three linkages, and what a cut means',
          problem:
            'Four points on a line: A = 1, B = 2, C = 10, D = 11. Pairwise distances: d(A,B) = 1, d(C,D) = 1, d(A,C) = 9, d(A,D) = 10, d(B,C) = 8, d(B,D) = 9. (a) What merges first? (b) After forming X = {A, B} and Y = {C, D}, compute the distance between X and Y under single, complete and average linkage. (c) At what final height does the tree close under each? (d) Cutting at height 5 gives how many clusters; cutting at height 9 under complete linkage? (e) Why is a ward dendrogram not directly comparable?',
          steps: [
            {
              title: '(a) First merges',
              desc: 'The two smallest distances are d(A,B) = 1 and d(C,D) = 1, so A and B merge into X at height 1, and C and D merge into Y at height 1. Two clusters remain: X and Y.',
            },
            {
              title: '(b) X to Y under three rules',
              desc: 'The four cross distances are 9, 10, 8, 9. Single = min = 8. Complete = max = 10. Average = (9 + 10 + 8 + 9) / 4 = 9. Same data, three different numbers - the rule, not the data, chose them.',
            },
            {
              title: '(c) Closing heights',
              desc: 'Under single the tree closes at 8, under average at 9, under complete at 10. The ordering (single <= average <= complete) always holds because min <= mean <= max of the same set.',
            },
            {
              title: '(d) Reading the cuts',
              desc: 'Cut at 5: nothing above height 1 has merged, so every method gives two clusters, {A, B} and {C, D}. Cut at 9 under complete: the merge needs height 10, so still two clusters; under single it would already be one cluster (closed at 8). The cut height is a granularity dial whose meaning depends on the linkage that produced the tree.',
            },
            {
              title: '(e) Ward is on another scale',
              desc: 'Ward merges by the increase in total within-cluster variance (scipy computes it from squared distances), so its heights are variance additions, not row-to-row distances. Two ward heights cannot be compared with single/complete heights, and a cut value of 5 in one method means nothing in another - choose cuts per method, from structure or domain, never by copying the number.',
            },
          ],
          solution:
            'Merges: AB and CD at height 1; X-to-Y distance = 8 (single), 10 (complete), 9 (average); tree closes at 8 / 10 / 9 respectively. Cut at 5 yields {A, B} and {C, D} under every rule; cut at 9 yields one cluster under single but two under complete. Ward heights are variance increases (squared-distance based) and live on a different scale - compare structure across methods, never raw heights.',
        },
        practice: {
          title: 'Cut the same tree at two heights and defend both',
          prompt:
            'Build an agglomerative clustering (ward and complete) on a real table with 500 to 5,000 rows. Cut each at two heights that give roughly 3 and 8 clusters. Write the cluster sizes for both cuts, compute a stability score (re-run on a random 80% and match with adjusted Rand index), and produce a two-sentence description of each segment in business language. Which cut would you ship and what evidence supports it?',
          hint: 'Sizes tell you if one segment is a dumping ground; stability tells you if the taxonomy survives resampling; the business sentence is the real acceptance test - if you cannot write it, the cut is arbitrary.',
        },
        mistakes: [
          {
            mistake: 'Cutting the dendrogram wherever the picture looks tidy',
            fix: 'Record a rule before looking: domain granularity, a stability threshold, or downstream lift. A cut chosen after seeing the plot is a result manufactured to fit the eye.',
          },
          {
            mistake: 'Comparing merge heights across linkage methods (especially ward)',
            fix: 'Heights are defined by the method: pairwise distances for single/complete/average, variance increases for ward. Compare which rows group together, not the y-values.',
          },
          {
            mistake: 'Running hierarchical clustering on tens of thousands of rows and wondering where the memory went',
            fix: 'The full distance matrix is O(n squared) memory. Sample, pre-aggregate, or switch to k-means/BIRCH; use hierarchical on the sample to inform k, then assign the rest.',
          },
          {
            mistake: 'Treating the dendrogram leaf order as an ordering of the rows',
            fix: 'Siblings can be drawn in either order without changing the clustering; only merge structure and heights carry meaning, not left-to-right sequence.',
          },
          {
            mistake: 'Fitting clusters on all rows and then feeding cluster id to a supervised model evaluated on a holdout',
            fix: 'The cluster feature must be fitted on training rows only (scaler + linkage + cut on train, assignment rule for validation) or the segment id leaks test information.',
          },
        ],
        exam: {
          question:
            'Compare single, complete, average and ward linkage, including one failure mode each. A dendrogram must be cut to produce segments for a marketing team: describe how the cut replaces k, what two things you must not do when reading heights, and one test that tells you whether the taxonomy is stable.',
          answer:
            'Single: minimum pairwise distance between clusters - follows elongated shapes but chains groups through bridge rows of noise. Complete: maximum distance - compact groups, but one outlier can dominate the distance. Average: mean of pairwise distances - a robust compromise. Ward: merges the pair that adds least to total within-cluster variance - balanced, k-means-like, but its heights are variance increases (scipy uses squared distances), not distances. The cut: cutting at height h keeps every merge formed at or below h, so the cut chooses the number of clusters after seeing the structure - the post-hoc replacement for choosing k up front; pick it from domain meaning, stability or downstream lift, never from visual tidiness. Two reading rules: never compare heights across linkage methods (different units), and never read the leaf order as an ordering of observations. Stability test: re-run on a random 80% subsample, match the clusters to the full run with adjusted Rand index (or per-cluster Jaccard overlap); high agreement indicates structure that survives resampling, low agreement means the taxonomy is a property of the sample and should not be shipped as fact.',
          source: 'Interview-grade synthesis (linkage comparison + dendrogram interpretation).',
        },
        summary: [
          'Agglomerative clustering merges nearest groups until one remains; the full history is a dendrogram, and a cut at height h replaces the choice of k.',
          'Linkage decides the answer: single chains, complete is compact but outlier-sensitive, average is a compromise, ward minimises added within-cluster variance.',
          'Ward heights are variance increases, not distances - never compare them with single/complete heights, and never read leaf order as meaning.',
          'Cost is O(n squared) memory for the distance matrix: sample first, or switch to k-means/BIRCH at scale.',
          'Clustering pays when it summarises for humans, features a downstream model (fit on train), samples intelligently, or grounds anomaly detection - it decorates when a label could have been measured.',
          'Stability under resampling is the cheapest honesty test before a taxonomy ships.',
        ],
      }),
      [
        [
          'Four points with d(A,B) = 1, d(C,D) = 1, and cross distances 9, 10, 8, 9 between {A,B} and {C,D}. The distance between the two clusters under single and complete linkage is:',
          ['8 and 10', '9 and 9', '10 and 8', '9.5 and 9.5'],
          0,
          'Single takes the minimum cross distance (8), complete takes the maximum (10); average would give (9 + 10 + 8 + 9) / 4 = 9.',
        ],
        [
          'Ward linkage is defined by:',
          [
            'The minimum pairwise distance between clusters',
            'The merge that increases total within-cluster variance the least',
            'The maximum pairwise distance between clusters',
            'The cosine angle between cluster centroids',
          ],
          1,
          'Ward optimises the same variance-addition criterion family as k-means, which is why its dendrogram heights are variance increases (scipy uses squared distances) rather than row distances.',
        ],
        [
          'You cut a dendrogram at height h. The resulting clusters are:',
          [
            'The h clusters closest to the root',
            'The groups formed by every merge whose height is at most h',
            'The leaves within h positions of each other in the drawing',
            'Always exactly the same as k-means with k = h',
          ],
          1,
          'The cut keeps the tree below a height threshold: merges at or below h define the groups. The count of resulting clusters depends on the merge heights, so cluster count is not equal to h.',
        ],
        [
          'Hierarchical clustering with the full distance matrix becomes impractical mainly because:',
          [
            'The algorithm needs labels for each merge',
            'Memory and time grow with the square of the number of rows (O(n squared) storage), so tens of thousands of rows exhaust memory',
            'It can only handle one feature',
            'Dendrograms cannot be drawn for more than 10 clusters',
          ],
          1,
          'Every pair must be stored (and naively re-compared), so cost grows quadratically: sample or pre-aggregate for large n, or use k-means/BIRCH and keep hierarchical clustering for structure discovery on samples.',
        ],
      ]
    ),
    lesson(
      M8,
      'mlf-8-3',
      83,
      'Anomaly Detection: Robust Statistics, Isolation, and Alert Budgets',
      'Three kinds of anomalies, why mean and standard deviation hide the very outlier you are hunting, how isolation forests separate rarity from normality, and how to set a threshold from cost instead of folklore.',
      20,
      nineBlocks({
        objectives: [
          'Classify an anomaly as point, contextual or collective and say what evidence would confirm it',
          'Compute median-MAD robust z-scores and contrast them with mean-sigma z-scores on the same sample',
          'Explain isolation-forest logic and set contamination from an alert budget',
          'Choose an alarm threshold from a cost matrix and an alert rate the team can actually absorb',
        ],
        hook:
          'A payments service alarms at mean + 3 sigma on checkout latency. Traffic is calm for days, then one request takes 95 ms while nobody is watching. The morning review finds no alert: that single 95 ms reading joined the sample, pushed the mean to 48.5 and sigma to 17.6, and the spike itself measured only 2.6 sigma - inside the band. The outlier rewrote the ruler used to measure it. The next week a real degradation sat at 72 ms, comfortably under the fattened threshold, and cost an hour of incident time. The monitor was never bad at arithmetic; it was measuring location and spread with statistics that one weird value is allowed to vandalise.',
        concept: `**Three species of weird.** A **point anomaly** is a single row that is far from the rest: one transaction of Rs 9,00,000 in an account of small spenders. A **contextual anomaly** is normal in one context and strange in another: 70 ms latency at 3 am is alarming, 70 ms during a flash sale is Tuesday - the row is only anomalous relative to time, season or segment. A **collective anomaly** is a *sequence or pattern* that is odd even though every individual row looks fine: five logins from five countries in four minutes, where each login alone is ordinary. The species decides the tool: point anomalies suit distance or density methods, contextual ones need a seasonal baseline or features of the context, and collective ones need sequence models or window statistics. Calling everything a point anomaly is the most common design error in monitoring.

**Rulers that cannot be vandalised: median and MAD.** The mean and standard deviation have a breakdown point near zero - a single sufficiently large value can move them arbitrarily, and (worse) inflate sigma enough to hide itself: the **masking** effect. The robust pair resists this: the **median** is the middle value and ignores how extreme the tails are (it can absorb up to half the data before breaking), and the **MAD** (median absolute deviation) is the median of |x - median|. The standard robust z-score is 0.6745 x (x - median) / MAD - the 0.6745 rescales MAD to be comparable with sigma for Gaussian data - and the conventional flag threshold is 3.5 (Iglewicz and Hoaglin). Two caveats to carry: MAD of 0 (more than half the values identical) makes the score undefined - fall back to mean absolute deviation or a business floor; and robust does not mean contextual - a robust score still does not know it is Sunday.

**Isolation forest: rarity as a short path.** Instead of density or distance, this method exploits the defining property of anomalies: they are **few and different**. Build trees that recursively pick a random feature and a random threshold between min and max; every row walks down until isolated in a leaf. Points that are rare and far out get cut off in a handful of splits; normal points in the dense core need many. The anomaly score comes from the average path length - shorter is more anomalous (normalised against a random-sample baseline). Practical knobs: n_estimators (a few hundred for stability), **contamination** (the fraction of the training set you expect to be anomalous - it sets the decision threshold, so set it from your alert budget or known incident rate, not to make the output look right), and feature hygiene (irrelevant columns dilute splits and bury the signal). Isolation forests are fast, scale to large n, need no labels, and handle mixed numeric features well; they are *novelty-or-outlier* detectors - if the world drifts, yesterday's scores drift with it. **Local Outlier Factor** is the density alternative: it compares each point's local density with its k neighbours, catching anomalies that are normal-looking globally but strange within their neighbourhood - at O(n squared) cost.

**Evaluation and thresholds: there are no labels, so design the loop.** With no ground truth you cannot compute accuracy - so (1) hold back a few *confirmed* incidents from the past as a labelled sanity set and report recall on them plus alert volume on clean periods; (2) judge by **precision at the alert budget**: if the team can investigate 20 alerts a day, is the top-20-by-score list useful?; (3) set the threshold from the **cost matrix** - false alarm cost (analyst time, alarm fatigue) versus miss cost (the incident) - not from folklore like 3 sigma; (4) remember every flag is a *hypothesis for a human*, not a verdict, because the domain cost of a wrong accusation can dwarf the detection gain. Finally, drift is the meta-trap: after a release, the new normal looks anomalous until the detector adapts, and retraining on unreviewed flags teaches it that the incident was normal. Review before retrain, always.`,
        extras: [
          table(
            'Detectors: what each one is actually measuring',
            ['Method', 'Idea', 'Key knob', 'Fails when'],
            [
              ['Median + MAD z', 'Robust location and spread, thresholded at 3.5', 'Threshold (3.5 conventional)', 'MAD = 0; seasonality and context not modelled'],
              ['Isolation forest', 'Anomalies isolate in fewer random splits', 'contamination = expected anomaly share', 'Dense anomaly clumps; irrelevant features dilute splits'],
              ['LOF', 'Local density vs k nearest neighbours', 'n_neighbors', 'n large (O(n squared)); regimes with different densities'],
              ['Supervised classifier', 'You hold labels from past incidents', 'Class weights, decision threshold', 'Labels are scarce or drift makes them stale'],
            ],
          ),
          code(
            '# Robust z-scores plus an isolation forest under an alert budget\nimport numpy as np\nfrom sklearn.ensemble import IsolationForest\n\nmed = np.median(x)\nmad = np.median(np.abs(x - med))\nif mad > 0:\n    robust_z = 0.6745 * (x - med) / mad          # Iglewicz-Hoaglin\nelse:\n    robust_z = 0.7979 * np.abs(x - med) / np.mean(np.abs(x - med))\nprint(\"median/MAD flags:\", np.where(np.abs(robust_z) > 3.5)[0])\n\nprint(\"mean/sigma z of worst:\", np.round(np.max(np.abs(x - x.mean()) / x.std()), 2))\n\n# isolation forest: score first, threshold from the alert budget\nclf = IsolationForest(n_estimators=300, contamination=0.01, random_state=0)\nclf.fit(X)\nscores = -clf.score_samples(X)                   # higher = more anomalous\nbudget = int(0.01 * len(X))                      # 1 percent of rows may be alerted\ntop = np.argsort(scores)[-budget:]\nprint(\"alerting on\", budget, \"rows; top score:\", round(float(scores[top[-1]]), 3))',
            'robust_anomaly.py',
            'python'
          ),
          warn(
            'The mean-and-sigma ruler masks the very outlier you hunt',
            'One extreme value inflates sigma and drags the mean, so the value that caused the problem measures as normal (masking), and borderline rows get swept in (swamping). Use median/MAD for thresholds and keep seasonal baselines per context.',
          ),
          tip(
            'Set the threshold from the alert budget, then let the cost matrix argue',
            'Ask how many alerts a day the team can actually investigate, take the top of the ranked scores, and check miss-cost against false-alarm cost. An unactionable detector is worse than none: every false alarm spends trust.',
          ),
        ],
        worked: {
          title: 'The masking effect: 95 ms hides inside 3 sigma',
          problem:
            'Checkout latencies for eight requests (ms): 40, 42, 41, 43, 44, 42, 41, 95. (a) Compute the mean and population sigma, then the z-score of 95 - does a 3-sigma rule fire? (b) Compute the median, MAD and the robust z-score of 95 at the 3.5 threshold - does it fire? (c) Explain the disagreement quantitatively. (d) The team can investigate 1 alert per 100 requests; how would you turn either detector into a defensible alerting rule?',
          steps: [
            {
              title: '(a) Mean and sigma',
              desc: 'Sum = 388, mean = 48.5. Squared deviations: 72.25, 42.25, 56.25, 30.25, 20.25, 42.25, 56.25, 2162.25 - total 2482. Population variance = 2482 / 8 = 310.25, sigma = 17.61. z(95) = (95 - 48.5) / 17.61 = 2.64 - below 3, so the 3-sigma alarm NEVER FIRES on the most extreme value in the sample.',
            },
            {
              title: '(b) Median, MAD and robust z',
              desc: 'Sorted: 40, 41, 41, 42, 42, 43, 44, 95 - median = (42 + 42) / 2 = 42. Absolute deviations: 2, 1, 1, 0, 0, 1, 2, 53 - sorted: 0, 0, 1, 1, 1, 2, 2, 53 - MAD = (1 + 1) / 2 = 1. Robust z = 0.6745 x (95 - 42) / 1 = 35.7, far beyond 3.5: flagged instantly. The 44 ms row scores 0.6745 x 2 / 1 = 1.35, comfortably clean.',
            },
            {
              title: '(c) Why they disagree',
              desc: 'The outlier itself inflated sigma from a typical 1-2 ms to 17.61 and dragged the mean up by 5.8: the statistic used as the ruler was rewritten by the thing being measured (masking - breakdown point of mean/sigma is near 0 percent). The median ignored the tail entirely (it can resist up to 50 percent contamination) and MAD measured the body of the distribution, so the 95 stands out by 53 MADs instead of hiding inside 2.6 sigmas.',
            },
            {
              title: '(d) From score to rule',
              desc: 'Budget = 1 alert per 100 requests = top 1 percent. Rank every request by |robust z| (or by -score from an isolation forest, which also uses the other features) and alert on the top 1 percent; equivalently set the threshold at the 99th percentile of scores. Then add the context layer: suppress or re-baseline during known windows (backups, flash sales), require two consecutive flags for paging, and log every false alarm to re-price miss cost vs false-alarm cost at the next review.',
            },
          ],
          solution:
            'Mean 48.5, sigma 17.61, z(95) = 2.64 - the 3-sigma rule misses the anomaly that broke its own ruler. Median 42, MAD 1, robust z(95) = 35.7 - flagged at the 3.5 threshold while normal rows stay below 1.4. The disagreement is masking: mean/sigma have near-zero breakdown, median/MAD resist half the sample. Operational rule: rank by robust score, alert on the top 1 percent (the budget), gate by context windows, and keep re-pricing the threshold from the false-alarm vs miss cost matrix.',
        },
        practice: {
          title: 'Inject anomalies and count what each detector catches',
          prompt:
            'Take a clean metric (latency, daily sales, sensor readings) and inject three synthetic anomalies: one spike, one drift to a new level, and five consecutive mildly high readings. Run a mean/sigma z-detector, a median/MAD detector and IsolationForest (contamination 0.01). Tabulate: which detector caught which anomaly, how many false alarms each raised on the clean days, and which anomaly type needs a window or context rule rather than a per-row score.',
          hint: 'Point spikes should fall to all three; level shifts break per-row detectors until the window moves (that is contextual drift); collective mild runs are caught by sequences, not single-row scores - that gap tells you what monitor to add.',
        },
        mistakes: [
          {
            mistake: 'Thresholding with mean and sigma on skewed, spike-prone data',
            fix: 'Use median and MAD (robust z at 3.5) for point anomalies; the mean/sigma pair has near-zero breakdown and masks the very value you are hunting.',
          },
          {
            mistake: 'Ignoring context: alarming on values that are normal in their window',
            fix: 'Model the context - per-hour or per-day baselines, holiday and campaign flags - or explicitly suppress known windows. Contextual anomalies are defined by context, not by the row.',
          },
          {
            mistake: 'Treating a detector flag as proof and acting on it directly',
            fix: 'A flag is a hypothesis for a human. Route to review, capture the verdict, and only feed reviewed labels back - otherwise you automate accusations and poison your own training data.',
          },
          {
            mistake: 'Tuning contamination until the output matches expectations',
            fix: 'contamination is a budget statement about expected anomaly share (or a cost-derived threshold). Setting it to force a desired conclusion makes the detector a mirror of your prior, not a measurement.',
          },
          {
            mistake: 'Retraining on unreviewed flags',
            fix: 'If an incident was flagged and then retrained as normal, the next model learns the incident was normal. Review first, then retrain; keep confirmed incidents in a held-back sanity set for recall checks.',
          },
        ],
        exam: {
          question:
            'For the latencies 40, 42, 41, 43, 44, 42, 41, 95 compute (i) mean, sigma and the 3-sigma verdict for 95; (ii) median, MAD and the robust z verdict at 3.5. Explain the disagreement in one term and justify why the robust pair is the default for thresholding. Finish by describing how an alert threshold should be chosen in production.',
          answer:
            '(i) mean = 48.5; sum of squared deviations = 2482, variance = 310.25, sigma = 17.61; z(95) = 46.5 / 17.61 = 2.64 < 3 - the rule does not fire, even on the most extreme value. (ii) median = 42; absolute deviations are 2, 1, 1, 0, 0, 1, 2, 53, which sort to 0, 0, 1, 1, 1, 2, 2, 53, so MAD = (1 + 1) / 2 = 1; robust z = 0.6745 x 53 / 1 = 35.7 > 3.5 - flagged, while 44 scores 1.35. Disagreement: masking - the outlier inflated sigma (and pulled the mean), so the ruler was vandalised by the value it was measuring; mean/sigma have a breakdown point near zero while median/MAD tolerate up to half contamination, which is why the robust pair is the default for thresholds. Production threshold: rank by robust (or model-based) score, alert on the volume the team can investigate (alert budget), derive the cut from the cost matrix of false alarm versus miss, gate by context windows and consecutive-hit rules, and re-price the threshold when the reviewed outcomes change - never from folklore constants alone.',
          source: 'Evergreen robust-statistics exam question (masking arithmetic + threshold design).',
        },
        summary: [
          'Point, contextual and collective anomalies need different tools - per-row scores only catch the first species.',
          'Mean and sigma are vandalisable: one extreme value inflates sigma and hides itself (masking), so use median/MAD robust z with the 3.5 threshold.',
          'Isolation forests score rarity as a short path through random splits; contamination is a budget statement, not a discovered truth.',
          'There are no labels: evaluate with held-back incidents, precision at the alert budget, and alert volume on clean periods.',
          'Set thresholds from the cost matrix and the team capacity - every false alarm spends trust, and every unactionable alert is worse than no detector.',
          'Review verdicts before retraining, or the model learns that incidents are normal.',
        ],
      }),
      [
        [
          'The robust z-score used with median and MAD is 0.6745 x (x - median) / MAD. The constant 0.6745 is there to:',
          [
            'Speed up the computation',
            'Rescale MAD so the statistic is comparable with a sigma-based z-score for Gaussian data',
            'Correct for small sample sizes',
            'Convert MAD into a mean absolute deviation',
          ],
          1,
          'MAD measures the 50th percentile of deviations, which is smaller than sigma for a Gaussian; 0.6745 maps it onto a sigma-equivalent scale so familiar thresholds transfer.',
        ],
        [
          'An isolation forest flags a row as anomalous when:',
          [
            'Its distance to the global centroid is largest',
            'Random feature-threshold splits isolate it in fewer steps (shorter average path length), because it is few and different',
            'Its feature values exceed 3 standard deviations',
            'It forms a cluster of size one after k-means',
          ],
          1,
          'The method encodes rarity directly: rare, outlying rows are cut off quickly by random splits, while dense-core rows need many splits - short path equals high anomaly score.',
        ],
        [
          'Checkout latency of 70 ms during a midnight backup window, where 70 ms is routine, but alarming at noon: this is best classified as:',
          [
            'A point anomaly',
            'A contextual anomaly - normal in one context, strange in another',
            'A collective anomaly',
            'Not an anomaly at all, since the value is ordinary',
          ],
          1,
          'The row is only odd relative to its context (time of day, season, segment). Detecting it needs a contextual baseline or context features, not a global threshold.',
        ],
        [
          'Why does a mean-and-sigma (3-sigma) alarm sometimes fail to fire on the most extreme value in a sample?',
          [
            'Sigma is capped by definition',
            'The extreme value itself inflates sigma and pulls the mean toward it (masking), so its own z-score shrinks below the threshold',
            'The alarm compares against the median instead',
            '3-sigma alarms only work for negative values',
          ],
          1,
          'Both statistics are computed from the same sample: the outlier widens the band it is judged against. Median/MAD resist this because they ignore how extreme the tails are.',
        ],
      ]
    ),
    lesson(
      M8,
      'mlf-8-4',
      84,
      'PCA, t-SNE and UMAP: What a 2-D Plot Is Allowed to Claim',
      'PCA as variance accounting with a component budget you compute yourself, the scaling decision that makes or breaks it, and the strict list of sentences a non-linear embedding plot can and cannot support.',
      22,
      nineBlocks({
        objectives: [
          'Compute explained-variance ratios and cumulative variance, and choose a component count at a stated threshold',
          'Decide when to standardise before PCA and explain the unit-domination failure it prevents',
          'Use PCA honestly for compression, denoising and leakage-safe features in a pipeline',
          'State which claims a t-SNE or UMAP plot supports, and which claims it fabricates',
        ],
        hook:
          'An intern runs t-SNE on 3,000 customer rows, gets a picture with seven crisp islands, and writes in the slide: "Our customers fall into seven distinct groups." A senior engineer changes one argument - perplexity from 30 to 5, new random seed - and the islands rearrange: three of them split, two fused, one vanished. Same data, different painting. Nothing about the customers changed between the two runs, so the difference between the pictures cannot be evidence about customers. The 2-D plot is a hypothesis generator you follow up with numbers; treating it as the finding is the most common way beautiful visualisation becomes bad science.',
        concept: `**PCA: spend a variance budget.** Principal component analysis finds the orthogonal directions along which the data varies most. Procedure: centre every column (subtract the mean - this is not optional), then either diagonalise the covariance matrix or, equivalently and more stably, take the singular value decomposition of the centred matrix. The eigenvectors are the **components** (linear combinations of the original features, ordered by importance) and the eigenvalues are the **variance captured** by each. The working number is the **explained-variance ratio**: eigenvalue divided by total variance, per component, and its cumulative sum - which answers the only question that matters: how many components buy 95% of the variance? The dropped components carry the remainder, and reconstruction error measured on standardised data is exactly that dropped fraction. Three properties define what PCA is: it is **linear** (rotations and projections only - it cannot unfold a spiral), **unsupervised** (it maximises variance, which is not the same as preserving the label), and **scale-sensitive** (the covariance matrix is computed in your units, so the widest column dominates component 1).

**The scaling decision, stated as a rule.** If your columns are in different units or ranges (MB and counts, rupees and ratings), run PCA on standardised data: the correlation-matrix PCA, whose eigenvalues sum to the number of features - a free sanity check, because trace-invariance tells you immediately whether the matrix you diagonalised was standardised or not. If all columns genuinely share units and you want structure in raw magnitude, covariance PCA is defensible - but say so in the report. Skipping the decision means PCA quietly becomes a unit converter: with one feature at variance 10,000 and another at variance 4, component 1 is the first feature wearing a disguise, and the second feature's signal about the target is discarded as noise. Two more usage rules: fit the scaler and PCA **on training rows only** (a PCA fitted on all data leaks test-distribution information into the features), and remember the sign of a component is arbitrary - component 1 pointing "up" in one run points "down" in an otherwise identical run, so never interpret a sign, only loadings and magnitudes.

**What PCA is for.** Compression (store 40 components instead of 500 columns), denoising (low-variance directions are often noise - often, not always, since a rare class can live in a low-variance direction), decorrelation (feed uncorrelated components to a model that assumes it), speed, mitigating the curse of dimensionality, and honest 2-D visualisation: the top two components are the two largest-variance directions, plotted with real axis units, so distances are *linear-globally* meaningful up to the projection loss. What it is not: a feature selector with a target in mind (use supervised methods for that), a guarantee that 95% variance means 95% accuracy, or a clusterer by itself - though clustering in PCA space is a perfectly good practice.

**t-SNE and UMAP: local neighbourhood painters.** Both are non-linear optimisers that place points in 2-D (or low-D) so that *neighbourhoods* stay neighbours: t-SNE converts distances to conditional probabilities and matches them between high-D and low-D; UMAP builds a fuzzy neighbourhood graph and lays it out preserving local connectivity. The consequence is the whole lesson: **local structure is approximately preserved; global geometry is not guaranteed.** Between-cluster distances, relative cluster sizes, densities and empty space in the picture are all shaped by parameters (t-SNE perplexity, UMAP n_neighbors and min_dist) and by the seed - two runs of the same data routinely disagree on everything except which points are tight neighbours. Therefore the rule set: cluster and score in the original or PCA space, never in the embedding; use the picture to *notice* candidate structure and then verify it numerically (silhouette in the real space, stability across seeds, downstream lift); treat a t-SNE picture as a hypothesis with a run-to-run stability check attached; and when a reviewer demands "just show the clusters", show the PCA plot with axis values *and* the embedding side by side, labelled by what each may claim. t-SNE and UMAP are excellent at surfacing rare subgroups that linear PCA hides, and useless as evidence that seven groups exist.`,
        extras: [
          table(
            'What each 2-D picture is allowed to claim',
            ['Claim', 'PCA plot', 't-SNE / UMAP plot'],
            [
              ['Distances between far-apart groups are meaningful', 'Yes within linear projection loss', 'No - non-linear layout distorts global geometry'],
              ['Cluster area reflects population size', 'Only via projected spread', 'No - area follows density and parameters'],
              ['Two runs should agree', 'Yes (up to arbitrary sign)', 'No - seed and perplexity/n_neighbors move everything'],
              ['Safe to compute metrics or labels here', 'Fine as features if fit on train', 'Never - cluster in original/PCA space, embed for eyes only'],
              ['Spots rare subgroups hiding in low-variance directions', 'Weak', 'Often strong - then verify numerically'],
            ],
          ),
          code(
            '# PCA budget, then embed only for looking\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.decomposition import PCA\nimport numpy as np\nimport matplotlib.pyplot as plt\n\nXs = StandardScaler().fit_transform(X)      # never let units choose your components\npca = PCA().fit(Xs)                          # fit on TRAIN rows in a real pipeline\nratios = pca.explained_variance_ratio_\nprint(\"per component:\", np.round(ratios, 3))\nprint(\"cumulative:  \", np.round(np.cumsum(ratios), 3))\nprint(\"trace check (should equal n features):\", round(pca.explained_variance_.sum(), 3))\n\nn95 = int(np.searchsorted(np.cumsum(ratios), 0.95) + 1)\nprint(\"components for 95% variance:\", n95)\nZ = PCA(n_components=n95, random_state=0).fit_transform(Xs)   # Z goes to the model\n\nplt.scatter(Z[:, 0], Z[:, 1], s=8)           # top two PCs: real linear geometry\nplt.xlabel(\"PC1\"); plt.ylabel(\"PC2\"); plt.show()\n\n# t-SNE / UMAP: look, then VERIFY in Xs or Z - never cluster inside the embedding',
            'pca_then_embed.py',
            'python'
          ),
          warn(
            'Computing clusters or metrics inside a t-SNE/UMAP picture',
            'The embedding optimises neighbourhood probabilities, not distances you can compare. Run k-means and silhouette in Xs or in PCA space; use the picture only to generate the hypothesis you then test.',
          ),
          tip(
            'Report the cumulative curve with the component count',
            'One line - components kept, variance retained, dropped variance as reconstruction error - turns a dimensionality decision from a default into a defensible number. Add the trace check to prove you standardised.',
          ),
        ],
        worked: {
          title: 'Reading an eigenvalue budget, and the unit-domination trap',
          problem:
            'Five features were standardised; the eigenvalues of their correlation matrix are 2.5, 1.4, 0.7, 0.3 and 0.1. (a) Compute the explained-variance ratio of each component and the cumulative series. (b) How many components reach at least 95%? (c) If only three are kept, what fraction of variance is lost, and what is the reconstruction error on standardised data? (d) What does the sum of the eigenvalues confirm? (e) Now two raw features: MB with variance 10,000 and count with variance 4, PCA on unscaled data - what does component 1 become, and what is the fix?',
          steps: [
            {
              title: '(a) Ratios and cumulative series',
              desc: 'Total variance = 2.5 + 1.4 + 0.7 + 0.3 + 0.1 = 5.0. Ratios: 0.50, 0.28, 0.14, 0.06, 0.02. Cumulative: 0.50, 0.78, 0.92, 0.98, 1.00 (50%, 78%, 92%, 98%, 100%).',
            },
            {
              title: '(b) The component budget',
              desc: 'Three components stop at 92% - short of the 95% target. Four reach 98%, so the answer is 4 components. State it as a decision: "4 of 5 components, 98% variance retained, 2% dropped".',
            },
            {
              title: '(c) Cost of keeping three',
              desc: 'Dropped variance = 0.3 + 0.1 = 0.4 of 5.0 = 8%. On standardised data, mean squared reconstruction error per feature equals the dropped fraction, 0.08 - the reconstruction is off by roughly 0.28 standard deviations per feature on average (square root of 0.08).',
            },
            {
              title: '(d) The sanity check',
              desc: 'The eigenvalues sum to 5.0 - exactly the number of features. For standardised data the correlation matrix has trace equal to the feature count (trace invariance: standardisation pins every variance at 1), so this confirms correlation PCA. A sum of 14,007 instead would tell you the matrix was a raw covariance matrix and the widest column was voting unopposed.',
            },
            {
              title: '(e) Unit domination',
              desc: 'On unscaled data the total variance is about 10,000 + 4 = 10,004, so the MB feature holds 99.96% of it: component 1 aligns with MB (the count feature contributes a rounding error), and PCA becomes a rescaling of one column while the count signal is discarded as noise. Fix: standardise (or convert to comparable units) before PCA, or make the correlation-matrix choice explicitly - then re-check the trace equals 5.',
            },
          ],
          solution:
            'Ratios 0.50 / 0.28 / 0.14 / 0.06 / 0.02; cumulative 0.50 / 0.78 / 0.92 / 0.98 / 1.00; 4 components for >= 95%. Keeping 3 loses 8% of variance = 0.08 mean squared reconstruction error on standardised data. The eigenvalue sum of 5.0 confirms correlation (standardised) PCA. With raw MB (variance 10,000) vs count (variance 4), unscaled PCA makes PC1 the MB column - standardise first, then the trace check proves you did.',
        },
        practice: {
          title: 'Build the evidence pack before anyone shows a t-SNE',
          prompt:
            'On one dataset: standardise, fit PCA, and report the explained-variance table with the component count at 95%. Then produce three pictures of the same data - top two PCs, t-SNE at perplexity 5, t-SNE at perplexity 30 - each with a different random seed on a second run. List which visual claims (number of groups, relative sizes, spacing between groups) stayed the same across all four pictures and which changed. Conclude in two sentences what you would tell a stakeholder the plots show.',
          hint: 'Anything that survives every run and parameter is a candidate fact to verify numerically; anything that moves is a property of the layout algorithm - report it as "structure to investigate", never as a finding.',
        },
        mistakes: [
          {
            mistake: 'Running k-means or computing silhouette inside a t-SNE/UMAP embedding',
            fix: 'Cluster and score in the original or PCA space; the embedding is for eyes. Metrics computed there measure the layout algorithm, not the data.',
          },
          {
            mistake: 'Interpreting PC axis values or sign as real-world quantities',
            fix: 'A component is a weighted mix of features with arbitrary sign; interpret via loadings (which features dominate and their relative weight), not the axis number, and never read direction as cause.',
          },
          {
            mistake: 'Skipping standardisation because the data "looks fine"',
            fix: 'Covariance PCA is unit-sensitive: the widest column wins by construction. Standardise when units or ranges differ, and confirm with the trace check (eigenvalues sum to the feature count).',
          },
          {
            mistake: 'Fitting the scaler and PCA on all rows before splitting',
            fix: 'PCA is learned structure: fit on training rows inside the pipeline, transform validation and test with the fitted object - otherwise test-distribution information leaks into the features.',
          },
          {
            mistake: 'Equating 95% explained variance with 95% of the predictive signal',
            fix: 'Variance is unsupervised; the label can live in a low-variance direction. Retain components by variance for compression, but validate the downstream metric after the reduction.',
          },
        ],
        exam: {
          question:
            'Eigenvalues of a standardised 5-feature correlation matrix: 2.5, 1.4, 0.7, 0.3, 0.1. Give the cumulative explained variance, the number of components for 95%, and the reconstruction error of a 3-component model. Then: a colleague shows a t-SNE plot and claims the distances between clusters and their relative sizes are real - state three claims the plot cannot support and one workflow that would test the claim properly.',
          answer:
            'Total = 5.0; cumulative explained variance = 50%, 78%, 92%, 98%, 100% - so 4 components are required for at least 95% (3 gives only 92%). Keeping 3 drops 0.4 of 5.0 = 8% of variance, i.e. mean squared reconstruction error of 0.08 per standardised feature. The eigenvalue sum equal to 5 confirms correlation PCA on standardised data. Claims the t-SNE picture cannot support: (1) the distance between two far clusters - the non-linear layout distorts global geometry; (2) the area of a cluster - size follows local density and parameters, not population; (3) that the group count is a property of the data - perplexity and seed routinely split, merge or delete islands on identical rows. Legitimate workflow: generate candidate groups from the picture, then verify numerically in the original or PCA space - fit the clustering there, report silhouette and stability across resamples and seeds, check downstream lift on a held-out metric, and only then present the groups, with the picture as illustration rather than evidence.',
          source: 'Interview-grade synthesis (PCA arithmetic + embedding interpretation discipline).',
        },
        summary: [
          'PCA = centre, then rotate onto directions of decreasing variance; explained-variance ratios and their cumulative sum set the component budget.',
          'Correlation (standardised) PCA has eigenvalues summing to the feature count - the trace check that proves you scaled.',
          'Scale-sensitive, linear and unsupervised: PCA can neither unfold non-linear structure nor promise that retained variance equals retained signal.',
          'Fit scaler and PCA on training rows only; component sign is arbitrary, interpret loadings instead.',
          't-SNE and UMAP preserve local neighbourhoods, not global geometry - distances, sizes and even cluster counts move with seed and parameters.',
          'Cluster and score in real space, embed for eyes, and verify every picture with stability, silhouette or downstream lift before it becomes a claim.',
        ],
      }),
      [
        [
          'Explained-variance ratios of the first three components are 0.50, 0.28 and 0.14. To retain at least 95% of variance you need:',
          [
            'Two components (78%)',
            'Four components - three reach only 92%, the fourth crosses 95%',
            'All five components, since nothing below 95% can be dropped',
            'Exactly three components (95% exactly)',
          ],
          1,
          'Cumulative: 0.50, 0.78, 0.92 - three components are short of the threshold, so you go to four (0.98 with the fourth). Thresholds are crossed by adding components, never reached by rounding.',
        ],
        [
          'You run PCA on columns measured in MB (variance 10,000) and counts (variance 4) without standardising. What happens?',
          [
            'Both features contribute equally to the components',
            'PC1 aligns with the MB column (it holds about 99.9% of total variance) and the count feature is discarded as noise - PCA becomes a unit converter',
            'PCA refuses to run until columns are scaled',
            'The components are automatically normalised to unit variance',
          ],
          1,
          'PCA maximises variance in your units: the widest-scale feature wins outright. Standardise (correlation PCA) or convert units first - otherwise component 1 is the MB column wearing a disguise.',
        ],
        [
          'A t-SNE plot shows two islands with a large gap. The justified interpretation is:',
          [
            'The gap size proves how different the groups are, and each island size reflects its population',
            'Only that those points were close neighbours in the high-dimensional data - the gap distance, cluster areas and island count are shaped by perplexity and seed, so verify structure in original/PCA space',
            'The plot is invalid and should be discarded entirely',
            'The islands are exactly the clusters you should deploy',
          ],
          1,
          't-SNE preserves local neighbourhoods, not global geometry: inter-cluster distance, cluster area and even the number of islands move with perplexity and seed. Treat the picture as a hypothesis and verify clustering in original/PCA space.',
        ],
        [
          'Principal component analysis finds directions that:',
          [
            'Maximise correlation with the target',
            'Maximise variance of the (centred) data, subject to being orthogonal to earlier components',
            'Minimise reconstruction error of the labels',
            'Separate classes by the largest margin',
          ],
          1,
          'PCA is unsupervised variance maximisation with orthogonality constraints - no labels involved (maximising target correlation is PLS/ supervised methods; max-margin separation is SVM).',
        ],
      ]
    ),
  ],
};
