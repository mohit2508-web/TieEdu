// Module 9 — Statistics for AI
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, code } from '../nineBlocks';
import { lesson, M9, COURSE_ID } from './helpers';

export const module9: CourseModule = {
  id: M9,
  course_id: COURSE_ID,
  title: 'Module 9 — Statistics for AI',
  summary:
    'Mean, median, variance and standard deviation from first principles; populations, samples and the sampling distribution of the mean; correlation versus causation with confounders; outlier detection with IQR fences; and the train/test split with random_state that keeps evaluation honest.',
  sort_order: 9,
  lessons: [
    lesson(
      M9,
      'pyai-9-1',
      1,
      'Mean, Median, Variance & Standard Deviation',
      'The four numbers every dataset summary starts with — what each measures, how variance and std are computed, and why sample variance divides by n − 1.',
      18,
      nineBlocks({
        objectives: [
          'Compute mean, median, variance and standard deviation with NumPy and pandas',
          'Explain variance as the mean squared deviation and standard deviation as its unit-restoring square root',
          'Distinguish population (ddof=0) from sample (ddof=1) variance and say why the correction exists',
          'Decide when the median tells the story that the mean hides',
        ],
        hook:
          'Ten quiz scores: 72, 85, 90, 45, 67, 55, 88, 92, 60, 78. The class average is 73.2 — but nobody scored 73, and the "average" student sits above six of their ten classmates. Two numbers, mean 73.2 and median 75.0, already disagree about the story. Add the standard deviation and you learn the scores are not a tight cluster at all. These four statistics are the first language you speak to any model, any chart and any interviewer.',
        concept: `**The mean: a balance point.** The mean (average) is the value that would balance the data on a seesaw: sum every observation, divide by the count. It uses every value, which is both its strength and its weakness — one extreme value drags it. \`np.mean(scores)\` is \`scores.sum() / len(scores)\` underneath; pandas reaches it with \`df["col"].mean()\`.

**The median: the middle by rank.** Sort the values and take the centre (or average the two centres for even counts). The median ignores magnitude and cares only about rank, so an absurd outlier moves it by almost nothing. Rule of thumb: **skewed data tells its story in the median; symmetric data tells it in the mean.** Income classically runs skewed — a few huge salaries pull the mean above what most people earn, which is why reports quote medians.

**Variance: the average squared distance from the mean.** Spread cannot be measured by raw distances (they cancel: some positive, some negative), so each deviation is squared, then averaged:
\`\`\`
variance = mean( (x - mean(x))**2 )
\`\`\`
Squaring makes every contribution positive and punishes far-away points disproportionately. \`np.var(scores)\` uses **ddof=0** (divide by n) — the *population* formula. \`np.var(scores, ddof=1)\` divides by n − 1 — the *sample* formula. The difference is not pedantry: your ten scores are a sample of a larger population of possible scores. Dividing by n systematically underestimates the true population variance, because the sample mean sits closer to the sample's own points than to the population's true centre. Bessel's correction (n − 1) compensates; pandas' \`std()\` and \`var()\` default to **ddof=1**, NumPy to 0 — one of the stack's quietest inconsistencies.

**Standard deviation: variance back in original units.** Squaring broke the units (marks²), so take the square root: \`np.std(scores, ddof=1)\` ≈ 16.19 marks. The standard deviation answers "a typical point sits about this far from the mean" in the same units as the data — which is why it, not the variance, gets quoted. Together the four numbers sketch the distribution: centre (mean and median), spread (std), and the gap between mean and median (a skew hint).

**Reading the pair, quickly.** mean ≫ median: right-skewed (a high tail). mean ≪ median: left-skewed. mean ≈ median with a moderate std: roughly symmetric. These are hints, not proofs — Lesson 9.2 turns the sketch into a full picture with distributions and sampling.`,
        extras: [
          table(
            'The four summaries at a glance',
            ['Statistic', 'What it measures', 'Sensitive to outliers?', 'pandas / NumPy'],
            [
              ['Mean', 'Balance point — sum / n', 'Yes, heavily', 'df.mean() / np.mean'],
              ['Median', 'Middle value by rank', 'Almost never', 'df.median() / np.median'],
              ['Variance', 'Mean squared deviation', 'Yes', 'df.var() (ddof=1) / np.var'],
              ['Std deviation', 'Spread in original units', 'Yes', 'df.std() (ddof=1) / np.std'],
            ],
          ),
          code(
            'import numpy as np\n\nscores = np.array([72, 85, 90, 45, 67, 55, 88, 92, 60, 78], dtype=float)\nprint(scores.mean())                 # 73.2\nprint(np.median(scores))             # 75.0\nprint(scores.var(ddof=0))            # 235.76 — population (divide by n)\nprint(scores.var(ddof=1))            # 261.96 — sample (divide by n-1)\nprint(scores.std(ddof=1))            # 16.19 marks — original units',
            'four-stats.py',
            'python',
          ),
          warn(
            'NumPy and pandas disagree on ddof by default',
            'np.std/var default to ddof=0 (population); pandas .std()/.var() default to ddof=1 (sample). Mixing them silently gives two different answers for the "same" statistic — always state which you mean.',
          ),
        ],
        worked: {
          title: 'Summarise ten quiz scores, and defend the n − 1 correction',
          problem:
            'scores = [72, 85, 90, 45, 67, 55, 88, 92, 60, 78]. Compute mean, median, both variances and the sample standard deviation; count how many scores fall within one sample standard deviation of the mean; and explain in words why the two variances differ.',
          steps: [
            {
              title: '1. Centre: mean and median side by side',
              desc: 'Mean 73.2 versus median 75.0 — close, with the mean pulled slightly below by the low tail (45, 55). Mild left skew, nothing dramatic.',
              code_snippet: 'import numpy as np\n\nscores = np.array([72, 85, 90, 45, 67, 55, 88, 92, 60, 78], dtype=float)\nprint(scores.mean())        # 73.2\nprint(np.median(scores))    # 75.0',
            },
            {
              title: '2. Spread: variance both ways, then std',
              desc: 'Population variance divides by n = 10; sample variance by n − 1 = 9. The sample figure is larger — and the default of pandas.',
              code_snippet: 'print(scores.var(ddof=0))   # 235.76 — population\nprint(scores.var(ddof=1))   # 261.96 — sample\nprint(scores.std(ddof=1))   # 16.19 — sqrt of the sample variance',
            },
            {
              title: '3. One band around the mean',
              desc: 'The interval 73.2 ± 16.19 runs about 57.0 to 89.4. Scores inside it: 60, 67, 72, 78, 85, 88 — six of ten. 90, 92, 55 and 45 sit outside.',
              code_snippet: 'lo = scores.mean() - scores.std(ddof=1)\nhi = scores.mean() + scores.std(ddof=1)\nprint(lo, hi)                          # 57.01 89.39\nprint(((scores >= lo) & (scores <= hi)).sum())   # 6',
            },
            {
              title: '4. Defend the correction in one sentence each',
              desc: 'ddof=0 answers "if these ten WERE the whole population"; ddof=1 answers "these ten are a sample — estimate the population". The second is almost always the question a data analysis is asking.',
              code_snippet: '# population variance: mean((x - x_bar)^2), divisor n\n# sample variance: divisor n-1 — unbiased estimate of the population figure',
            },
          ],
          solution:
            'Mean 73.2, median 75.0 (mild left tail), population variance 235.76, sample variance 261.96, sample std 16.19 marks. Six of ten scores lie inside one standard deviation of the mean. The two variances differ by the divisor: n versus n − 1. The sample formula is larger because the sample mean is optimally close to the sample itself; dividing by n − 1 corrects that optimism so the estimate centres on the true population variance.',
        },
        practice: {
          title: 'Compute, compare, explain',
          prompt:
            'daily_payments = np.array([420, 380, 450, 410, 980, 395, 430, 405, 440, 415], dtype=float): (1) compute mean, median, sample std; (2) compute mean with and without the 980 outlier and report the drop; (3) compute the median with and without it — how much did it move?; (4) write the one-sentence finding a shop owner should read: which centre would you quote and why? (5) verify by hand one variance term: (x − mean)**2 for the first value, then confirm your sum of squared deviations / 9 matches scores.var(ddof=1)-style output for this array.',
          hint: 'np.delete(arr, idx) removes an element; the mean will move a lot, the median almost not at all.',
        },
        mistakes: [
          {
            mistake: 'Reporting variance when asked for spread "in marks"',
            fix: 'Variance is in squared units. The standard deviation — its square root — is the interpretable spread. Quote std unless you specifically need variance.',
          },
          {
            mistake: 'Mixing ddof=0 and ddof=1 across cells of one analysis',
            fix: 'pandas defaults to ddof=1, NumPy to 0. Pick the sample formula for estimates, state it, and keep it consistent — or your own notebook contradicts itself.',
          },
          {
            mistake: 'Quoting the mean of a heavily skewed column as "typical"',
            fix: 'Income, latency and revenue skew right; one outlier drags the mean. Report the median (and the std or IQR) as the typical value.',
          },
          {
            mistake: 'Assuming 68% of data is within one std for any dataset',
            fix: 'That rule belongs to normal distributions (Lesson 9.2). Skewed or heavy-tailed data can put far more — or far less — inside the band.',
          },
        ],
        exam: {
          question:
            'Define variance and standard deviation. Why does sample variance divide by n − 1 while population variance divides by n, and which does pandas use by default?',
          answer:
            'Variance is the mean squared deviation from the mean: average of (x − x̄)². Squaring makes deviations additive and non-cancelling, but leaves squared units. Standard deviation is its square root — spread back in the data\'s own units, which is why it is the quoted figure. Population variance divides by n and is exact when the data IS the whole population. Sample variance divides by n − 1: because the sample mean is computed from the same data, squared distances to it are systematically smaller than distances to the unknown population mean; dividing by n − 1 (Bessel\'s correction) removes that downward bias so the estimator centres on the true population variance. pandas .var()/.std() default to ddof=1 (sample); NumPy defaults to ddof=0 — always check which you are calling.',
          source: 'The standard descriptive-statistics question in DS interviews and university practicals.',
        },
        summary: [
          'Mean = balance point (outlier-sensitive); median = middle by rank (outlier-proof).',
          'Variance = mean squared deviation; std = its square root, back in original units.',
          'Sample variance divides by n − 1 (ddof=1); population variance by n (ddof=0).',
          'pandas defaults to ddof=1; NumPy to ddof=0 — state which you use.',
          'mean ≫ median hints right skew; mean ≪ median hints left skew.',
        ],
      }),
      [
        [
          'scores = [72, 85, 90, 45, 67, 55, 88, 92, 60, 78]. The mean and median are:',
          ['73.2 and 75.0', '75.0 and 73.2', '73.2 and 73.2', '71.0 and 76.0'],
          0,
          'Sum 732 / 10 = 73.2; sorted, the two middle values 72 and 78 average to 75.0.',
        ],
        [
          "pandas' Series.std() with no arguments divides the squared-deviation sum by:",
          ['n', 'n − 1', 'n + 1', 'the number of unique values'],
          1,
          'pandas defaults to ddof=1 (sample standard deviation); NumPy is the one that defaults to 0.',
        ],
        [
          'Standard deviation is preferred over variance for reporting because:',
          [
            'It is faster to compute',
            'It is in the original units of the data',
            'It is immune to outliers',
            'It always equals the range',
          ],
          1,
          'Squaring breaks units; the square root restores them — "16 marks from the mean" is interpretable.',
        ],
        [
          'A column with mean 92,000 and median 41,000 most likely:',
          ['Is left-skewed', 'Is right-skewed — a few huge values drag the mean up', 'Is perfectly symmetric', 'Has no outliers by definition'],
          1,
          'Mean far above median is the classic signature of a right (high) tail.',
        ],
      ]
    ),
    lesson(
      M9,
      'pyai-9-2',
      2,
      'Distributions, Samples & the Sampling Mean',
      'What a distribution is; normal, skewed and bimodal shapes; why sample statistics vary; and the central limit theorem that makes sample means behave.',
      18,
      nineBlocks({
        objectives: [
          'Describe a distribution by centre, spread and shape (symmetric, skewed, bimodal)',
          'Distinguish a population from a sample and explain sampling variability',
          'Simulate repeated sampling and observe the sampling distribution of the mean',
          'State the central limit theorem qualitatively and its practical consequence for n',
        ],
        hook:
          'Take 50 dice rolls, average them: you might get 3.3. Roll again: 3.7. Again: 3.4. The TRUE average of a die is 3.5 — but no single sample of 50 hits it exactly. Now average the averages of 2,000 such samples: the result crowds 3.5 with startling precision, and the spread of those averages shrinks as √n. That quiet regularity — the central limit theorem — is why "the sample mean is 3.42 ± 0.05" is a scientific statement, and why every ML metric you ever report is really a sample estimate.',
        concept: `**A distribution is the whole population of values.** One column of data has a distribution: every value, with how often each occurs. Summarising it means describing three things — **centre** (mean, median), **spread** (std, IQR, range) and **shape**:
- **Symmetric / normal (bell):** mean ≈ median, thin tails. Heights, measurement errors, many averages. The 68–95–99.7 rule lives here: ~68% of values within 1 std of the mean, ~95% within 2, ~99.7% within 3.
- **Skewed:** a tail on one side; mean chases the tail, median stays put (Lesson 9.1). Income, delivery times, house prices.
- **Bimodal:** two humps — usually two populations mixed (e.g. two cohorts, day vs night). The mean can land in the valley where almost nobody lives — the classic "average student who does not exist".

**Population vs sample.** The **population** is everything you want to know about; the **sample** is the subset you observed. You almost never have the population — you have a sample, and every statistic you compute (mean, std, accuracy!) is a **statistic estimating a parameter**. Because the sample could have come out differently, the statistic would too: that variability across hypothetical resamples is the **sampling distribution** of that statistic.

**The sampling distribution of the mean, simulated.** A single sample mean is noisy. The distribution of sample means is not: it centres on the population mean and has a predictable spread — the **standard error**, σ/√n. Simulate it:
\`\`\`
rng = np.random.default_rng(42)
means = [rng.integers(1, 7, 50).mean() for _ in range(2000)]
\`\`\`
A single die has σ ≈ 1.71; a mean of 50 rolls has standard error ≈ 1.71/√50 ≈ 0.24. The simulated means spread with std ≈ 0.25 and centre ≈ 3.5 — theory and simulation shaking hands.

**The central limit theorem, stated honestly.** For i.i.d. samples with finite variance, the sampling distribution of the mean approaches a normal curve as n grows — regardless of the population's own shape (dice are uniform, not bell). Consequences you will use forever: (1) means of reasonably large samples behave predictably even from skewed data; (2) uncertainty shrinks with 1/√n — quadrupling n only halves the error bar; (3) a confidence interval is just the estimate ± a multiple of the standard error. The theorem does NOT say your data becomes normal, nor that n = 30 is a magic law — it is about the mean's behaviour across resamples.`,
        extras: [
          table(
            'Population vs sample — the vocabulary of inference',
            ['Word', 'Means', 'Example'],
            [
              ['Population', 'Everything you want to generalise to', 'All delivery times this year'],
              ['Sample', 'The subset you actually observed', 'This week\'s 500 deliveries'],
              ['Parameter', 'A population fact (usually unknown)', 'True mean delivery time'],
              ['Statistic', 'A sample computation', 'Sample mean = 38.2 min'],
              ['Standard error', 'Std of a statistic across resamples', 'σ/√n for the mean'],
            ],
          ),
          code(
            'import numpy as np\n\nrng = np.random.default_rng(42)\ndice = np.arange(1, 7)\nprint(dice.mean(), dice.std())            # 3.5, 1.71\n\none = rng.integers(1, 7, 50)\nprint(one.mean())                          # one noisy sample, e.g. 3.34\n\nmeans = np.array([rng.integers(1, 7, 50).mean() for _ in range(2000)])\nprint(means.mean(), means.std())           # ~3.50, ~0.25 (theory: 1.71/sqrt(50) ~ 0.24)',
            'clt-sim.py',
            'python',
          ),
          tip(
            'Seed before you simulate',
            'rng = np.random.default_rng(42) makes the whole simulation repeatable — the same lesson, the same numbers, every run. Report seeds with results.',
          ),
        ],
        worked: {
          title: 'Simulate the sampling distribution of a die mean',
          problem:
            'A fair die has population mean 3.5 and std ≈ 1.71. (1) Draw ONE sample of 50 rolls and report its mean. (2) Draw 2,000 samples of 50 and build the sampling distribution of the mean. (3) Report its centre and spread, compare to σ/√n, and explain what one sample hid.',
          steps: [
            {
              title: '1. The population facts, then one noisy sample',
              desc: 'faces 1..6: mean 3.5, std(ddof=0) ≈ 1.71. One sample of 50 lands somewhere near but rarely exactly on 3.5.',
              code_snippet: 'import numpy as np\n\nrng = np.random.default_rng(42)\nfaces = np.arange(1, 7)\nprint(faces.mean(), faces.std())          # 3.5 1.7078...\none = rng.integers(1, 7, 50)\nprint(one.mean())                          # e.g. 3.76 — off by ~0.26',
            },
            {
              title: '2. Repeat 2,000 times — the sampling distribution',
              desc: 'Each replicate draws 50 fresh rolls and averages them. The array of 2,000 means IS (a Monte Carlo approximation to) the sampling distribution of the mean.',
              code_snippet: 'means = np.array([rng.integers(1, 7, 50).mean() for _ in range(2000)])\nprint(means.shape)                         # (2000,)',
            },
            {
              title: '3. Read the distribution of means',
              desc: 'Centre ≈ 3.50 (the population mean). Spread ≈ 0.25 — matching σ/√n = 1.71/√50 ≈ 0.24. Far tighter than the 1.71 spread of single rolls.',
              code_snippet: 'print(means.mean(), means.std())           # ~3.50, ~0.25\nprint(faces.std() / np.sqrt(50))           # 0.2415 — the standard error, theory side',
            },
            {
              title: '4. Shrink n, watch the spread grow',
              desc: 'Halve the sample size to 12: the standard error rises to ≈ 1.71/√12 ≈ 0.49. Uncertainty pays a √n tax — always.',
              code_snippet: 'small = np.array([rng.integers(1, 7, 12).mean() for _ in range(2000)])\nprint(small.std())                         # ~0.50 — double the n, 0.7x the error',
            },
          ],
          solution:
            'One sample of 50 gave a mean around 3.76 — honest noise. The 2,000-replicate sampling distribution centred on 3.50 with std ≈ 0.25, matching the theoretical standard error 1.71/√50 ≈ 0.24. With n = 12 the spread doubled to ≈ 0.50. The central limit theorem in one simulation: the mean\'s sampling distribution is roughly normal, centred on the truth, and its width falls with √n — which is why bigger samples buy proportionally (not linearly) more precision.',
        },
        practice: {
          title: 'Simulate, then predict',
          prompt:
            'Without running first: predict the sampling-distribution std of the mean for (a) 100 rolls of a die (σ ≈ 1.71), (b) 400 rolls. Then simulate 3,000 samples each with default_rng(7) and check. Next, simulate sample MEDIANS of 50 rolls the same way: is the distribution of medians also roughly bell-shaped and centred at 3.5? Finally, draw one histogram of a single big sample of exponential-like data (rng.exponential(2.0, 1000)) and describe its shape in three words before comparing its mean and median.',
          hint: 'Standard error = σ/√n; medians also concentrate (slightly wider than means), and the exponential is right-skewed — its mean sits well above its median.',
        },
        mistakes: [
          {
            mistake: 'Treating the sample std as "the" uncertainty of the mean',
            fix: 'The std describes individual points; the standard error (σ/√n) describes the mean\'s noise. They differ by √n — quoting the wrong one overstates uncertainty by that factor.',
          },
          {
            mistake: 'Assuming the central limit theorem makes raw data normal',
            fix: 'It governs the shape of SAMPLE MEANS across resamples, not your column. Your skewed revenue stays skewed; its sample mean is what becomes roughly normal.',
          },
          {
            mistake: 'Expecting n = 30 to magically activate the CLT',
            fix: 'Convergence speed depends on the population\'s skew and tails. Heavy-tailed data may need far larger n; check the sampling distribution by simulation when it matters.',
          },
          {
            mistake: 'Unseeded simulations presented as evidence',
            fix: 'Different seeds give different sample numbers. Seed the generator and report the seed so anyone can reproduce your figures exactly.',
          },
        ],
        exam: {
          question:
            'State the central limit theorem, sketch its consequence for a sample mean from skewed data, and explain why the standard error falls with √n rather than n.',
          answer:
            'The CLT: for independent samples with finite variance, the sampling distribution of the sample mean approaches a normal distribution as n increases, centred at the population mean, regardless of the population\'s own shape (which need not be normal). So even from right-skewed data — delivery times, income — the MEAN of a sufficiently large sample is approximately normal, enabling confidence intervals and hypothesis tests, while the raw data remain skewed. The spread of that sampling distribution is the standard error, σ/√n: averaging cancels independent positive and negative noise, and averaging n items reduces noise by the square root of n — not n — because variances (not standard deviations) add. Quadrupling n only halves the uncertainty; that diminishing return is why precision gets expensive and why ML test sets in the thousands, not the millions, are usually enough.',
          source: 'The CLT + standard-error pair — every statistics exam and ML interview\'s opening act.',
        },
        summary: [
          'A distribution = all values with frequencies; describe it by centre, spread and shape.',
          'Normal (68-95-99.7), skewed (mean chases the tail), bimodal (mixed populations).',
          'Population = what you generalise to; sample = what you observed; statistics estimate parameters.',
          'The sampling distribution of the mean centres on μ with standard error σ/√n.',
          'CLT: sample means go roughly normal with large n, whatever the population shape — it does not normalise the data itself.',
        ],
      }),
      [
        [
          'The standard error of a sample mean differs from the standard deviation in that it:',
          [
            'Describes individual data points',
            "Describes how the mean would vary across resamples — σ/√n",
            'Is always smaller than the data range',
            'Only exists for normal data',
          ],
          1,
          'Std = spread of points; standard error = spread of the statistic across hypothetical resamples.',
        ],
        [
          'The central limit theorem says the sampling distribution of the mean becomes approximately:',
          ['Uniform as n grows', 'Normal as n grows, regardless of population shape', 'Skewed as n grows', 'Bimodal as n grows'],
          1,
          'The theorem is about the MEAN\'s behaviour across resamples — the population itself keeps its shape.',
        ],
        [
          'Doubling the sample size shrinks the standard error by a factor of:',
          ['2', '√2 ≈ 1.41', '4', 'It does not shrink'],
          1,
          'Standard error goes as 1/√n — twice the data buys only ~30% less uncertainty.',
        ],
        [
          'A bimodal distribution of student marks usually indicates:',
          [
            'A measurement error',
            'Two distinct populations mixed in one column (e.g. two cohorts)',
            'That the mean equals the median',
            'That the data must be normal',
          ],
          1,
          'Two humps = two groups; the overall mean often falls in the valley where few students live.',
        ],
      ]
    ),
    lesson(
      M9,
      'pyai-9-3',
      3,
      'Correlation vs Causation: Reading r Without Being Fooled',
      'Pearson correlation from first principles, what r can and cannot claim, how outliers and nonlinearity distort it, and the confounder that turns causation talk into fiction.',
      19,
      nineBlocks({
        objectives: [
          'Compute Pearson correlation with NumPy and pandas and interpret sign and magnitude',
          'Explain why correlation measures linear association only and reacts to outliers',
          'Identify a confounding variable in a three-variable example',
          'State the evidence required before any causal claim is defensible',
        ],
        hook:
          'Ice-cream sales and drowning deaths rise together, month after month, with a correlation near +1. Ban the ice cream and the drownings will not fall — summer temperature drives both. Correlation is easy to compute, easy to plot, and very easy to over-claim. This lesson installs the reflex every data professional needs: compute r, respect r, never promote r to causation without a design that earns it.',
        concept: `**Pearson r: linear togetherness in one number.** Pearson's correlation coefficient measures how two numeric variables move together *linearly*:
- r ≈ +1: perfect straight-line rise (x up, y up, all points on a line).
- r ≈ 0: no linear pattern (but see the traps below).
- r ≈ −1: perfect straight-line fall.

Mechanically: standardise both variables (subtract means, divide by stds), then average their products — the average of (z_x · z_y). Positive z-pairs (both above their means) push r up; mixed pairs pull it down. \`np.corrcoef(x, y)[0, 1]\` or pandas \`df.corr()\` compute it; both need no NaNs.

**What r does NOT say.** (1) **Not causation** — full stop, next section. (2) **Not nonlinearity** — a perfect parabola y = (x − 5)² over x in 0..10 has r ≈ 0; the relationship is total, just not straight. Plot before you quote r. (3) **Not "no relationship" at r ≈ 0** — U-shapes and cycles average out to zero linear correlation. (4) **Not outlier-proof** — one far-off point can drag r from 0 to 0.9 or smash 0.9 down to 0.3. Always look at the scatter.

**Confounding: the third variable that explains two.** A **confounder** influences both variables you are correlating, creating association without a direct link:
\`\`\`
temperature → ice-cream sales
temperature → swimming → drowning risk
\`\`\`
Sales and drownings correlate strongly *through* temperature. Control for temperature (compare within heat bands) and the sales–drowning link shrinks toward nothing. Real confounders are everywhere: wealth in health data, city size in crime counts, study hours and access to tutoring in exam data.

**What would make a causal claim?** Hierarchy of evidence: (1) a **randomised controlled experiment** — randomly assign the cause, measure the effect; randomisation balances confounders on average. (2) Strong quasi-experiments (natural experiments, instrumental variables, regression discontinuity). (3) Meticulous observational adjustment — measure likely confounders, control for them, check robustness — still short of proof. (4) A scatterplot — never. Plus two cheap checks: does the cause come first in time? Is there a plausible mechanism? "Correlation is not causation" is not a conversation-stopper; it is a demand for a better design.`,
        extras: [
          table(
            'What r can and cannot support',
            ['Claim', 'Supported by r?', 'What would support it'],
            [
              ['"x and y move together linearly"', 'Yes — that IS r', 'The coefficient plus the scatterplot'],
              ['"x explains y"', 'Partially — shared variance only (r²)', 'r² plus domain reasoning'],
              ['"x causes y"', 'No', 'RCT / quasi-experiment / adjusted observational design'],
              ['"no relationship exists"', 'No — only no LINEAR one', 'Scatterplot, nonlinear checks'],
            ],
          ),
          code(
            'import numpy as np\n\ntemp   = np.array([22, 24, 27, 29, 31, 33, 34, 35, 36, 38], dtype=float)\nsales  = np.array([12, 15, 19, 22, 26, 30, 32, 33, 35, 38], dtype=float)\nswim   = np.array([1, 2, 3, 4, 6, 7, 8, 9, 11, 12], dtype=float)\n\nprint(np.corrcoef(temp, sales)[0, 1])   # 0.998\nprint(np.corrcoef(temp, swim)[0, 1])    # 0.979\nprint(np.corrcoef(sales, swim)[0, 1])   # 0.984 — confounded by temp',
            'confounder.py',
            'python',
          ),
          warn(
            'r on autopilot over every column pair',
            'df.corr() on 30 columns produces 435 numbers, most meaningless. Correlate pairs your question implies, and never quote one without its scatterplot.',
          ),
        ],
        worked: {
          title: 'Compute r, then watch a confounder fabricate a relationship',
          problem:
            'hours and marks for 10 students correlate at ~0.97 — an honest association. Then: monthly temperature, ice-cream sales and swimming counts correlate pairwise at ~0.98+. Compute all four coefficients, then explain the structure that makes the sales–swimming number misleading, and rewrite its finding honestly.',
          steps: [
            {
              title: '1. A real association: hours and marks',
              desc: 'One scatter-driven pair. r ≈ 0.97: strong, positive, linear. Causal? Still a claim needing a design — but at least the two variables are the ones in question.',
              code_snippet: 'import numpy as np\n\nhours = np.array([2, 4, 5, 6, 7, 8, 9, 10, 12, 14], dtype=float)\nmarks = np.array([45, 55, 62, 71, 74, 78, 83, 88, 91, 95], dtype=float)\nprint(np.corrcoef(hours, marks)[0, 1])   # 0.972',
            },
            {
              title: '2. Build the confounded triangle',
              desc: 'Temperature drives both sales and swimming; sales and swimming then correlate through it. Every pairwise r is high — and the sales–swimming link is the artifact.',
              code_snippet: 'temp  = np.array([22, 24, 27, 29, 31, 33, 34, 35, 36, 38], dtype=float)\nsales = np.array([12, 15, 19, 22, 26, 30, 32, 33, 35, 38], dtype=float)\nswim  = np.array([1, 2, 3, 4, 6, 7, 8, 9, 11, 12], dtype=float)\nprint(np.corrcoef(temp, sales)[0, 1])   # 0.998\nprint(np.corrcoef(temp, swim)[0, 1])    # 0.979\nprint(np.corrcoef(sales, swim)[0, 1])   # 0.984',
            },
            {
              title: '3. Name the structure',
              desc: 'Draw the arrows: temp → sales, temp → swim. The sales–swim correlation has no direct arrow — it is induced. A third variable you did not plot explains it.',
              code_snippet: '# temp --> sales\n#   |        \\\n#   v         v (spurious)\n# swim <------\'',
            },
            {
              title: '4. Rewrite the finding honestly',
              desc: 'The honest sentence: "Ice-cream sales and swimming counts rise together, almost entirely because both rise with temperature — within a fixed temperature band, the association shrinks." No causal verb, confounder named.',
              code_snippet: '# Dishonest: "Ice-cream sales drive swimming."\n# Honest: "Sales and swimming co-move with temperature; the direct link is unproven."',
            },
          ],
          solution:
            'Hours–marks r ≈ 0.97: a strong linear association between the two variables actually under study. The temperature triangle produced three near-perfect correlations, of which sales–swimming is spurious — a confounder (temperature) points at both, and the pairwise r cannot see the third arrow. The rewrite names the confounder and refuses the causal verb. That is the entire discipline: compute r, plot the scatter, ask "what third variable is missing?" before any sentence with "drives" or "causes" leaves your keyboard.',
        },
        practice: {
          title: 'Compute, plot mentally, interrogate',
          prompt:
            'For each pair, compute r with np.corrcoef, sketch the scatter in words, then write the honest one-sentence finding: (1) [1,2,3,4,5] and [2,4,5,4,2] (a V-shape — predict r near 0 despite a perfect relationship); (2) study hours [1..10] and sleep hours [8, 7.5, 7, 6.5, 6, 5.5, 5, 4.5, 4, 3.5] (negative r — then name one confounder of the hours/sleep relation in real student life); (3) add one extreme outlier to pair (1) — x=[1..5, 100], y=[2,4,5,4,2, 0] — and watch r move. For every pair: does r ≈ 0 mean "no relationship"? Justify with the shape.',
          hint: 'A symmetric V has zero linear correlation — r measures the straight line only. np.corrcoef(x, y)[0, 1] is the call.',
        },
        mistakes: [
          {
            mistake: 'Reading r ≈ 0 as "no relationship"',
            fix: 'It means no LINEAR relationship. Plot the scatter: U-shapes, parabolas and cycles can have r ≈ 0 with a perfect deterministic link.',
          },
          {
            mistake: 'Quoting r without the scatterplot',
            fix: 'One outlier can manufacture or destroy r. The coefficient and the plot are a package deal — publish both or neither.',
          },
          {
            mistake: 'Causal verbs on observational correlations',
            fix: '"Associated with", "co-moves with", "predicts" are earned. "Drives", "causes", "leads to" require experimental or quasi-experimental evidence — or delete them.',
          },
          {
            mistake: 'Correlating everything, understanding nothing',
            fix: 'A correlation matrix of every column pair generates coincidences by sheer volume. Correlate pairs your causal story implies; treat the rest as exploration, not findings.',
          },
        ],
        exam: {
          question:
            'Sales and swimming counts correlate at 0.98. Explain why this does not show that ice-cream sales cause drownings, identify the confounder, and state what evidence WOULD justify a causal claim.',
          answer:
            'Pearson r measures linear co-movement, nothing more — it cannot distinguish "x causes y" from "z causes both". Here temperature is the confounder: hot months raise both ice-cream sales and swimming (and therefore drowning opportunity). The sales–swimming association is induced through temperature; within a narrow temperature band it largely vanishes. Two further cautions: correlation is not immune to outliers, and r only captures linear patterns. For a causal claim you would need, at minimum, temporal precedence (sales before drownings), a plausible mechanism, and control of confounders — ideally a randomised experiment (infeasible and unethical here), or a credible quasi-experiment / natural experiment that varies sales while holding summer conditions fixed. Absent that, the honest statement is association mediated by a named third variable.',
          source: 'The classic correlation-vs-causation exam scenario; mirrors every "spurious correlation" teaching example.',
        },
        summary: [
          'Pearson r ∈ [−1, 1] measures linear association; compute with np.corrcoef or df.corr().',
          'r ≈ 0 means "no linear pattern" — check the scatter for U-shapes and cycles.',
          'One outlier can rewrite r; always publish the plot with the number.',
          'A confounder causes both variables and fakes the link between them — name it before you narrate.',
          'Causal claims need experiments or strong quasi-experiments; scatterplots never suffice.',
        ],
      }),
      [
        [
          'Pearson r = −0.9 between hours of gaming and marks means:',
          [
            'Gaming caused the marks to fall',
            'A strong negative LINEAR association — causation still unproven',
            'That 90% of marks are explained exactly',
            'That the data is normally distributed',
          ],
          1,
          'r quantifies linear co-movement; the causal leap needs a design, not a coefficient.',
        ],
        [
          'A perfect U-shaped relationship between x and y can produce r close to:',
          ['+1', '−1', '0', '0.5'],
          2,
          'Rising and falling halves cancel in the linear average — r sees no straight line.',
        ],
        [
          'A confounder is a variable that:',
          [
            'Is correlated with x only',
            'Influences BOTH x and y, inducing association between them',
            'Must be included as a model feature always',
            'Is simply an outlier in y',
          ],
          1,
          'The third arrow points at both variables — creating correlation without a direct x → y link.',
        ],
        [
          'The strongest ordinary evidence for a causal claim is:',
          [
            'A scatterplot with r > 0.9',
            'A randomised controlled experiment',
            'A large observational correlation',
            'A headline citing both variables',
          ],
          1,
          'Randomisation balances confounders on average — the design that earns the causal verb.',
        ],
      ]
    ),
    lesson(
      M9,
      'pyai-9-4',
      4,
      'Outliers & the Train/Test Split: Evaluating Without Cheating',
      'Detecting outliers with IQR fences, their asymmetric damage to mean versus median, and the holdout split with random_state that keeps every reported metric honest.',
      19,
      nineBlocks({
        objectives: [
          'Detect outliers with the IQR fence rule and judge error vs rare-event',
          'Explain why the median and IQR resist outliers that break mean and std',
          'Split data into train and test BEFORE fitting anything, with train_test_split',
          'Use random_state for reproducible splits and state why the test set stays unseen',
        ],
        hook:
          'A sensor logs 10 typical readings, then 109. Your mean detector now says the machine is failing; your median detector shrugs. Then a subtler trap: you train a model on all your data, evaluate it on the same data, and it looks brilliant — until real customers arrive. Two enemies of honest analysis, one lesson: outliers that distort the summaries, and test data that leaks into training.',
        concept: `**Outliers: errors, rarity, or signal.** An outlier is a value far from the rest. Sources differ: data-entry errors (age = 900), unit mismatches (cm mixed with m), instrument glitches — fix or drop these; and genuine rare events (a celebrity order in a retail feed) — usually keep, because they are real. The rule: **investigate before removing**. Deleting inconvenient data is how analyses become propaganda.

**The IQR fence rule.** Quartile-based and distribution-free: compute Q1 (25th percentile), Q3 (75th) and IQR = Q3 − Q1. Values below Q1 − 1.5·IQR or above Q3 + 1.5·IQR are **fences**; points beyond them are outliers. (The 1.5 is Tukey's convention — a display choice, not a law; 3·IQR marks far outliers.) Pandas: \`q1 = df["col"].quantile(0.25)\`. Resistant summaries travel together: **median with IQR** versus **mean with std** — the first pair barely notices outliers; the second pair is dragged by them. Device readings [10, 12, 12, 13, 12, 11, 14, 13, 15, 109]: mean 22.1 "typical" — nonsense; median 12.5 — true; the fence at 16.375 flags 109 alone.

**The train/test split: evaluation that means something.** A model is judged on data it has never seen. So split first, always:
\`\`\`
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.25, random_state=42, stratify=y)
\`\`\`
Fit on train only; evaluate once on test. **random_state** pins the shuffle so the same split regenerates on every run — without it, your metrics wobble run to run and nobody, including next-week-you, can reproduce them. **stratify=y** keeps class proportions equal in both halves (matters for imbalanced classification). The test set is a one-shot exam: every time you tune a model to improve its test score, the test set is silently becoming training data. That is why real projects add a third, validation, slice — the idea arrives fully in the ML-fundamentals course.

**All statistics stay on the train side.** Medians for filling, means for standardising, PCA, feature selection — anything learned from data must be learned on the training split and merely APPLIED to test. A median computed on the whole dataset leaks test information into training (the "leakage" of Module 6.4). The pattern you will formalise as scikit-learn pipelines in the next module starts as this habit: **split → fit on train → transform both with train-fitted objects**.`,
        extras: [
          table(
            'Resistant vs sensitive statistics',
            ['Question', 'Resistant pair', 'Sensitive pair'],
            [
              ['Centre', 'Median', 'Mean'],
              ['Spread', 'IQR (Q3 − Q1)', 'Standard deviation'],
              ['Outlier detection', 'IQR fences', 'k · std from mean (sensitive to the very thing you hunt)'],
            ],
          ),
          code(
            'import numpy as np\nfrom sklearn.model_selection import train_test_split\n\nreadings = np.array([10, 12, 12, 13, 12, 11, 14, 13, 15, 109], dtype=float)\nq1, q3 = np.percentile(readings, [25, 75])\niqr = q3 - q1\nlo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr\nprint(q1, q3, lo, hi)                       # 12.0 13.75 9.375 16.375\nprint(readings[(readings < lo) | (readings > hi)])   # [109.]\nprint(readings.mean(), np.median(readings))  # 22.1, 12.5',
            'iqr-split.py',
            'python',
          ),
          warn(
            'The test set is not free real estate',
            'Every model choice steered by the test score contaminates it. Fit on train, peek at test rarely, and treat the final number as an estimate with uncertainty — not a scoreboard to maximise.',
          ),
        ],
        worked: {
          title: 'Flag a sensor outlier, then split data the honest way',
          problem:
            'Sensor readings contain one absurd value — detect it with IQR fences and show how mean versus median report the "typical" reading. Then, with a 100-sample regression dataset, split train/test with random_state=42, compute the target mean on TRAIN ONLY, and show the leakage version (full-data mean) differs.',
          steps: [
            {
              title: '1. Fences first, judgement second',
              desc: 'Q1 = 12.0, Q3 = 13.75, IQR = 1.75, upper fence = 16.375. Exactly one point beyond it: 109. Investigate (glitch? unit error?) before any removal.',
              code_snippet: 'import numpy as np\n\nreadings = np.array([10, 12, 12, 13, 12, 11, 14, 13, 15, 109], dtype=float)\nq1, q3 = np.percentile(readings, [25, 75])\niqr = q3 - q1\noutliers = readings[(readings < q1 - 1.5 * iqr) | (readings > q3 + 1.5 * iqr)]\nprint(outliers)          # [109.]',
            },
            {
              title: '2. Watch the summaries disagree',
              desc: 'Mean 22.1 claims a "typical" reading that never happened; median 12.5 sits right in the data. Std is inflated the same way — one reason resistant pairs exist.',
              code_snippet: 'print(readings.mean(), readings.std(ddof=1))   # 22.1, 30.6...\nprint(np.median(readings), np.subtract(*np.percentile(readings, [75, 25])))   # 12.5, 1.75 (the IQR)',
            },
            {
              title: '3. Split before fitting — reproducibly',
              desc: '100 samples, 25% holdout, pinned shuffle. Re-running this cell returns the identical split — the whole point of random_state.',
              code_snippet: 'from sklearn.model_selection import train_test_split\n\nrng = np.random.default_rng(0)\nX = rng.normal(size=(100, 2))\ny = 2 * X[:, 0] + 0.5 * X[:, 1] + rng.normal(scale=0.1, size=100)\n\nX_train, X_test, y_train, y_test = train_test_split(\n    X, y, test_size=0.25, random_state=42)\nprint(X_train.shape, X_test.shape)   # (75, 2) (25, 2)',
            },
            {
              title: '4. Prove the leakage point with a mean fill',
              desc: 'The full-data mean uses all 100 targets; the train-only mean uses 75. They differ — and only the second is legal in a pipeline. Scale or fill statistics belong to the train side, always.',
              code_snippet: 'full_mean = y.mean()        # leaks test information\ntrain_mean = y_train.mean()  # honest\nprint(round(full_mean, 4), round(train_mean, 4))   # e.g. -0.0031 0.0117',
            },
          ],
          solution:
            'IQR fences flagged exactly the 109 reading (fence 16.375) while the median (12.5) stayed honest and the mean (22.1) lied about "typical". The 75/25 split with random_state=42 is deterministic and reproducible; the train-only target mean differs from the full-data mean, demonstrating in miniature why every learned statistic must come from the training side. Split first, fit on train, apply to test — the discipline every module from here builds on.',
        },
        practice: {
          title: 'Detect, defend, split',
          prompt:
            'latency_ms = np.array([120, 135, 128, 141, 130, 126, 150, 133, 129, 850, 138, 125]): (1) IQR-fence the outliers — what is flagged, and would you drop or keep it after investigation? (2) Report mean/median and std/IQR before and after removing the flag — which pair moved? (3) Build a 2-feature regression set with default_rng(1), 60 samples, split 75/25 with random_state=1 and stratify omitted; re-run twice and prove identical test sizes; (4) compute the target std on train only and on the full set — report the difference and state which a standardisation step must use. (5) Write the one-line policy you will apply in every future project.',
          hint: 'np.percentile(arr, [25, 75]); train_test_split is deterministic given random_state.',
        },
        mistakes: [
          {
            mistake: 'Deleting outliers because they hurt the metric',
            fix: 'Investigate first: error (fix/drop) or rare truth (keep). Log every removal with its count — an analysis that quietly discarded 4% of rows must say so.',
          },
          {
            mistake: 'Using mean/std rules to detect outliers in skewed data',
            fix: 'The mean and std are themselves dragged by the outliers you are hunting. Use resistant statistics — median, IQR fences — for detection.',
          },
          {
            mistake: 'Splitting AFTER fitting or scaling on the full data',
            fix: 'Split first. Any transformation that learns parameters (median fills, scaling, PCA) is fit on train only, then applied to test. Reverse the order and the test metric is fiction.',
          },
          {
            mistake: 'Omitting random_state and chasing a better score across reruns',
            fix: 'An unseeded split changes each run; "improvements" may be shuffle luck. Pin random_state, and for real rigor average over several seeded splits or folds (the next course).',
          },
        ],
        exam: {
          question:
            'Explain the IQR fence rule for outlier detection and why it beats a "more than two standard deviations from the mean" rule. Then justify splitting data before any fitting, including the role of random_state.',
          answer:
            'IQR rule: compute Q1, Q3 and IQR = Q3 − Q1; values outside [Q1 − 1.5·IQR, Q3 + 1.5·IQR] are outliers. It is resistant: quartiles barely move when extreme values appear, so the fence stays put and the outlier stands out. The std-based rule fails by circularity — outliers inflate the very mean and std used to define "far", widening the fence and hiding the culprit (in the sensor example, one 109 inflates the std to ~30, making 109 barely unusual). Splitting: a model must be evaluated on unseen data, so the holdout is set aside before ANY fitting — including learned preprocessing statistics, which would otherwise leak test information (leakage). train_test_split(..., test_size, random_state, stratify) performs a seeded shuffle-sampled split: random_state pins the shuffle so results reproduce run to run; stratify preserves class balance for classification. Fit on train; transform and score on test; touch the test score rarely.',
          source: 'The standard "outlier detection + holdout justification" pairing in DS interviews and semester papers.',
        },
        summary: [
          'Outliers: investigate (error vs rare truth) before removing; log every removal.',
          'IQR fences (Q1 − 1.5·IQR, Q3 + 1.5·IQR) detect outliers robustly; mean/std rules are self-sabotaging.',
          'Median + IQR resist outliers; mean + std are dragged by them.',
          'Split BEFORE fitting; learn fills/scalers on train only; apply to test (no leakage).',
          'random_state pins the split for reproducibility; stratify keeps class balance.',
          'The test set is a scarce exam — tuning to it turns it into training data.',
        ],
      }),
      [
        [
          'For heavily skewed data, the resistant pair of summaries is:',
          ['Mean and standard deviation', 'Median and IQR', 'Mean and range', 'Maximum and minimum'],
          1,
          'Quartile/rank-based statistics barely move when a tail drags the mean and std around.',
        ],
        [
          'readings = [10, 12, 12, 13, 12, 11, 14, 13, 15, 109]. The IQR fence rule flags:',
          ['Nothing', 'Only 109 (fence ≈ 16.375)', '10 and 109', 'Everything below 12'],
          1,
          'Q1 = 12, Q3 = 13.75, IQR = 1.75; the upper fence 13.75 + 2.625 = 16.375 catches only 109.',
        ],
        [
          'random_state=42 in train_test_split ensures:',
          [
            'The model is trained 42 times',
            'The same shuffle — an identical, reproducible split on every run',
            'That 42% of rows go to test',
            'Stratification is automatic',
          ],
          1,
          'It seeds the permutation so the split is deterministic; without it every run holds out different rows.',
        ],
        [
          'Computing a column median on the FULL dataset before splitting is:',
          ['Best practice — more data is used', 'Leakage — test information informed training', 'Only slower', 'Required by scikit-learn'],
          1,
          'The median has seen test rows; that knowledge flows into training. Learn it on train, apply it everywhere.',
        ],
      ]
    ),
  ],
};
