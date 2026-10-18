// Module 3 — Linear & Logistic Regression
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code } from '../nineBlocks';
import { lesson, M3, COURSE_ID } from './helpers';

export const module3: CourseModule = {
  id: M3,
  course_id: COURSE_ID,
  title: 'Module 3 — Linear & Logistic Regression',
  summary:
    'The models that earn their keep in every interview and every production stack: simple and multiple linear regression with least-squares fitting and R²; MSE and gradient descent walked through with real numbers; ridge and lasso regularization and what they do to coefficients; and logistic regression — sigmoid, log-odds, decision threshold, and why a classifier carries the word "regression" in its name.',
  sort_order: 3,
  lessons: [
    lesson(
      M3,
      'mlf-3-1',
      31,
      'Simple and Multiple Linear Regression: Fitting Lines That Mean Something',
      'Least-squares fitting by hand and by library, coefficient interpretation, R², and how multiple regression extends the line to a plane — plus the assumptions that make coefficients quotable.',
      21,
      nineBlocks({
        objectives: [
          'Compute the least-squares slope and intercept of a simple linear regression by hand',
          'Interpret a fitted slope and intercept in the units of the original problem',
          'Extend simple regression to multiple regression and explain the partial interpretation of each coefficient',
          'Evaluate a regression model with MAE, RMSE, and R² and say what each one measures',
        ],
        hook:
          'A tuition centre claims: "Every extra hour of coaching adds exactly 5.1 marks to your exam score — our data proves it." Five data points behind the claim: (1h, 52), (2h, 57), (3h, 61), (4h, 68), (5h, 72). You can fit that line by hand in ninety seconds — and once you can, you can also interrogate it: is 5.1 an effect or a coincidence? What would the model predict for ten hours — and should you believe it? Linear regression is the simplest model that still teaches you to read a coefficient like an economist, not like a button.',
        concept: `**The model: a line through a cloud of points.** Simple linear regression assumes the relationship y = β₀ + β₁x + noise: a straight line plus error. Given n pairs (xᵢ, yᵢ), the least-squares fit chooses β₀ (intercept — expected y when x = 0) and β₁ (slope — expected change in y per one-unit increase in x) to minimise the sum of squared residuals Σ(yᵢ − ŷᵢ)². The closed-form answers: β₁ = Sxy/Sxx where Sxy = Σ(xᵢ−x̄)(yᵢ−ȳ) and Sxx = Σ(xᵢ−x̄)², and β₀ = ȳ − β₁x̄ (the line always passes through the point of means (x̄, ȳ)). Squared residuals — not absolute — because the square is differentiable everywhere, punishes large misses superlinearly, and yields these clean formulas. You will almost never compute these by hand in practice, but computing them once builds the intuition that "the slope is covariance over variance of x" — correlation\'s raw, unit-carrying sibling.

**Interpretation: units are everything.** β₁ = 5.1 in the tuition example means: for each additional hour of coaching, predicted exam score rises by 5.1 marks, on average, among students like those observed. The intercept β₀ = 46.7 means the model predicts 46.7 marks for a student with zero coaching hours — meaningful here, nonsense in problems where x = 0 is impossible or dangerous (house size = 0). Two standing cautions: the fit is correlational — hours and marks may both rise with prior ability; the coefficient describes the data you have, not necessarily a causal effect. And extrapolation: a line fitted on 1–5 hours says nothing trustworthy about 50 hours — the world bends, lines do not.

**Multiple regression: from a line to a plane, and beyond.** With d features, ŷ = β₀ + β₁x₁ + … + β_d x_d — a hyperplane. Each βⱼ now has a *partial* interpretation: expected change in y per unit of xⱼ, **holding all other features fixed**. "Holding income fixed, each additional year of education adds ₹8,200 to predicted salary." That ceteris paribus reading is the entire reason to like linear models in business settings — and it is also where multicollinearity bites: when two features move together (area and number of rooms), "holding rooms fixed while area rises" describes a rare, noisy slice of reality, and individual coefficients become unstable and large with wide confidence intervals even while predictions stay decent. Diagnose with correlations among features and VIF (variance inflation factor); fix by dropping/recombining features, regularisation (Module 3.3), or simply reporting groups of features together. Ordinary Least Squares has an exact solution (β = (XᵀX)⁻¹Xᵀy) — no training loop — which is why linear regression is instant even at moderate scale.

**Evaluation: three numbers, three questions.** **MAE**: average |error| in original units — "we are typically off by ₹12,000", robust to outliers. **RMSE**: root of mean squared error — same units, punishes big misses harder; watch it when catastrophic errors matter. **R²** = 1 − SS_res/SS_tot — the fraction of the target\'s variance the model explains; R² = 1 is perfect, R² = 0 is no better than predicting the mean (the baseline of Lesson 1.4), and negative R² is possible on holdout when the model is worse than the mean — always a red flag worth investigating. R² is not "percent correct"; it is variance explained, and it can be gamed by adding features (it never decreases on training data) — which is exactly why **adjusted R²** (penalises each added feature) and held-out metrics exist. Report held-out MAE/RMSE/R² alongside the baseline; a coefficient table is only worth reading if the model clears its floor.

**Assumptions: what makes coefficients quotable.** OLS still *computes* coefficients when assumptions fail, but the inferences (confidence intervals, p-values, the causal-sounding interpretation) degrade. The core four, in plain language: **linearity** (the relationship is roughly straight in the parameters — check residual plots for curves; fix with transforms like log(y) or polynomials); **independent errors** (no leftover time-series or grouped correlation — violated hard in temporal data); **homoscedasticity** (error spread roughly constant across predictions — fan-shaped residuals mean your RMSE is hiding regime changes; robust errors or transforms help); and **no severe multicollinearity** (stable partial interpretations). Normality of residuals matters mainly for small-sample inference, not for prediction. Knowing these four lets you defend a linear baseline in any review — and know when to graduate to trees.`,
        extras: [
          table(
            'Regression metrics: what each answers',
            ['Metric', 'Question it answers', 'Watch out for'],
            [
              ['MAE', 'How far off are we, typically, in original units?', 'Blind to whether one huge miss hides among small ones'],
              ['RMSE', 'How bad are the worst misses (squared weight)?', 'Outliers dominate; always pair with MAE'],
              ['R²', 'What fraction of target variance do we explain?', 'Never decreases on train with more features; can go negative on holdout'],
              ['Adjusted R²', 'Same, penalised per feature', 'Still an in-sample number — held-out metrics remain the referee'],
            ],
          ),
          code(
            '# Simple then multiple linear regression (scikit-learn style)\nimport numpy as np\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score\n\n# Simple: hours -> score (the five-point example)\nX_simple = np.array([[1], [2], [3], [4], [5]])\ny = np.array([52, 57, 61, 68, 72])\nm = LinearRegression().fit(X_simple, y)\nprint(m.intercept_, m.coef_)        # ~46.7, ~5.1  -> y_hat = 46.7 + 5.1 x\n\n# Multiple: two features, partial interpretations\nX_multi = np.array([[1, 8.0], [2, 6.5], [3, 7.0], [4, 5.0], [5, 4.0]])  # hours, past_score\nm2 = LinearRegression().fit(X_multi, y)\nprint(dict(zip([\"b_hours\", \"b_past\"], m2.coef_)))\n# b_hours > 0 holding past score fixed: the coaching association itself\n\npred = m2.predict(X_multi)\nprint(\"MAE\", mean_absolute_error(y, pred),\n      \"RMSE\", mean_squared_error(y, pred) ** 0.5,\n      \"R2\", r2_score(y, pred))',
            'linear_regression.py',
            'python'
          ),
          tip(
            'Log-transform heavy-tailed targets in EDA',
            'Prices, incomes, durations: if the target histogram has a long right tail, fitting log(y) and exponentiating predictions often cuts RMSE dramatically and stabilises residuals — decide this during EDA, not after a failed model.',
          ),
        ],
        worked: {
          title: 'Fit the tuition line by hand, then judge it',
          problem:
            'Data: (hours, score) = (1,52), (2,57), (3,61), (4,68), (5,72). Compute β₁ and β₀ by hand, predict the score for 6 hours, compute R², and answer the centre\'s claim.',
          steps: [
            {
              title: 'Means',
              desc: 'x̄ = (1+2+3+4+5)/5 = 3. ȳ = (52+57+61+68+72)/5 = 310/5 = 62.',
            },
            {
              title: 'Sxy and Sxx',
              desc: 'Sxy = (−2)(−10) + (−1)(−5) + (0)(−1) + (1)(6) + (2)(10) = 20+5+0+6+20 = 51. Sxx = 4+1+0+1+4 = 10. β₁ = 51/10 = 5.1. β₀ = 62 − 5.1×3 = 62 − 15.3 = 46.7. Model: ŷ = 46.7 + 5.1·hours.',
            },
            {
              title: 'Predict and check residuals',
              desc: 'Predictions: 51.8, 56.9, 62.0, 67.1, 72.2. Residuals: +0.2, +0.1, −1.0, +0.9, −0.2. For 6 hours: ŷ = 46.7 + 30.6 = 77.3.',
            },
            {
              title: 'R²',
              desc: 'SS_tot = (−10)²+(−5)²+(−1)²+6²+10² = 100+25+1+36+100 = 262. SS_res = 0.04+0.01+1.00+0.81+0.04 = 1.90. R² = 1 − 1.90/262 ≈ 0.993 — the line explains 99.3% of score variance in these five points.',
            },
            {
              title: 'Interrogate the claim',
              desc: '"Exactly 5.1 marks per hour" overstates two things: the coefficient is an average association over 1–5 hours in five students, not a causal law; and 10 hours of prediction (97.7) extrapolates past the data. A defensible phrasing: among students like these, each extra hour is associated with ~5 marks higher scores.',
            },
          ],
          solution:
            'ŷ = 46.7 + 5.1·hours, R² ≈ 0.993, 6-hour prediction 77.3. The arithmetic is airtight; the *claim* needs the caveats of correlation, small sample, and no extrapolation — reading coefficients like an analyst, not a slogan.',
        },
        practice: {
          title: 'Fit, interpret, and distrust',
          prompt:
            'Take any two-variable dataset (study hours vs sleep, temperature vs ice-cream). Fit a simple linear regression (by library, or by hand if only 5–8 points). Write: the equation with units, the interpretation of slope and intercept, R², and one reason the relationship might not be causal.',
          hint: 'A high R² with a lurking third variable (ability, season) is the classic confounder story — name yours.',
        },
        mistakes: [
          {
            mistake: 'Reading the intercept as a meaningful prediction when x = 0 is impossible',
            fix: 'Check whether x = 0 exists in the data\'s world. If not, treat the intercept as a mathematical anchor, not a finding — or centre the feature.',
          },
          {
            mistake: 'Calling the slope a causal effect',
            fix: 'OLS gives association. Causation needs experimental control or explicit causal assumptions (confounders, selection). Say "associated with", not "adds", unless you ran the experiment.',
          },
          {
            mistake: 'Extrapolating the line far beyond the training range',
            fix: 'Predictions outside observed x-ranges inherit the line\'s fiction. Restrict predictions to the data\'s range or collect data there — every forecaster learns this the hard way once.',
          },
          {
            mistake: 'Quoting individual coefficients while multicollinearity is unchecked',
            fix: 'Inspect feature correlations and VIF; with high VIF, group the story ("housing size features together") or apply ridge — never over-interpret one coefficient\'s sign flip.',
          },
        ],
        exam: {
          question:
            'A regression of salary on (education_years, experience_years) yields β_education = 8.2 (thousand ₹) and β_experience = 3.1. A colleague says "education is 2.6× more important than experience". Critique the statement and give the correct interpretation.',
          answer:
            'The coefficients are correctly read *unit-wise*: holding experience fixed, one extra year of education is associated with ₹8.2k higher salary; holding education fixed, one extra year of experience with ₹3.1k. The "2.6× more important" claim is wrong on three counts: (1) importance is not coefficient magnitude alone — it depends on each feature\'s spread (a small-variation feature with a big coefficient may move predictions less overall); (2) correlated predictors distort partial coefficients (education and experience often trade off — multicollinearity); (3) the ratios compare years-to-years only if the units and ranges are comparable. For importance use standardised coefficients, permutation importance, or drop-in-R² tests — and state the ceteris-paribus interpretation exactly as above.',
          source: 'Classic interpretation question in data-science interviews and econometrics exams.',
        },
        summary: [
          'Least squares fits y = β₀ + β₁x by minimising squared residuals; the line passes through (x̄, ȳ).',
          'Slope = change in ŷ per unit of x; intercept = ŷ at x = 0 (check that x = 0 means anything).',
          'Multiple regression adds the partial interpretation: per-feature effect holding all else fixed.',
          'MAE (typical miss), RMSE (big-miss punisher), R² (variance explained) — report with the mean baseline.',
          'Multicollinearity destabilises individual coefficients while predictions may stay fine.',
          'Assumptions (linearity, independence, homoscedasticity, no severe collinearity) gate the *interpretation*, not the computation.',
        ],
      }),
      [
        [
          'The least-squares line always passes through:',
          ['(0, 0)', 'The point of means (x̄, ȳ)', 'The median point', 'The point with the largest residual'],
          1,
          'β₀ is defined as ȳ − β₁x̄, so plugging x = x̄ returns ŷ = ȳ exactly.',
        ],
        [
          'In ŷ = 46.7 + 5.1·hours, the slope 5.1 means:',
          [
            'Every student scores exactly 5.1 more marks per hour',
            'Among students like those observed, each additional hour is associated with ~5.1 marks higher predicted score, on average',
            'The intercept will increase by 5.1',
            'R² equals 5.1',
          ],
          1,
          'Slopes are average associations in the observed data, not per-student guarantees or causal laws.',
        ],
        [
          'R² = 0 means the model:',
          ['Explains all variance', 'Explains none of the variance — no better than predicting the mean', 'Has zero residuals', 'Is perfectly calibrated'],
          1,
          'R² = 1 − SS_res/SS_tot; when residual sum of squares equals total, you gained nothing over the mean baseline.',
        ],
        [
          'Holding all other features fixed, "each extra bedroom adds ₹5 lakh to price, on average" is the interpretation of:',
          ['A simple regression intercept', 'A multiple-regression partial coefficient', 'R²', 'The RMSE'],
          1,
          'In multiple regression, each coefficient is the partial (ceteris-paribus) association of that feature with the target.',
        ],
      ]
    ),
    lesson(
      M3,
      'mlf-3-2',
      32,
      'Loss, MSE, and Gradient Descent: Watching a Model Learn by Hand',
      'Why squared error is the default loss, what RMSE/MAE each hide, and gradient descent walked through numeric step by step until you can predict the next weight update yourself.',
      21,
      nineBlocks({
        objectives: [
          'Compute MSE, RMSE, and MAE for a set of predictions by hand and state what each punishes',
          'Perform a full gradient-descent update step by hand for a single-weight model',
          'Explain the role of the learning rate and diagnose divergence vs crawl from step behaviour',
          'Differentiate batch, mini-batch, and stochastic gradient descent by update frequency and noise',
        ],
        hook:
          'A model has one knob: w, the weight it multiplies x by. Data says the true relationship is roughly y = 2x. You set w = 0. Your model\'s mean squared error is 10. Your job: nudge w so the error falls. You may not solve any equation — only look at the error, feel which direction is downhill, and take a small step. Do that a few times and something remarkable happens: w walks toward 2 without anyone ever telling it the answer. That is gradient descent — the engine under linear regression, logistic regression, and every neural network — and you are about to do it by hand.',
        concept: `**Loss: the number your model exists to shrink.** A loss function L(θ) scores how badly the current parameters θ fit the data. Training = optimisation: find θ that minimises L. The default regression loss is **mean squared error**: MSE = (1/n)Σ(yᵢ − ŷᵢ)² — average the squared misses. Why square? Three reasons that matter: it punishes a 10-point miss 100× harder than a 1-point miss (big errors are usually the expensive ones); it is smooth and differentiable everywhere (gradients exist even at zero error — absolute value does not, at the kink); and it has deep statistical roots (the maximum-likelihood fit when errors are Gaussian). The costs of squaring: sensitivity to outliers — one bad row can dominate the mean — and a units mismatch (MSE is in squared units: "₹²" means nothing to a stakeholder). Hence the two companions: **RMSE** = √MSE puts the error back in original units ("typically off by about ₹13k") and remains the reportable headline; **MAE** = (1/n)Σ|yᵢ − ŷᵢ| uses absolute error — robust to outliers, median-flavoured — the better loss when one rogue row should not run the show. Choosing MSE vs MAE is choosing whether big misses deserve superlinear punishment; choose deliberately, not by default.

**Gradient descent: downhill by local slope.** Start with random parameters (w = 0 is a fine start). At each step: (1) compute predictions and the loss; (2) compute the **gradient** ∂L/∂w — the slope of the loss surface at the current w; (3) update **w := w − η·∂L/∂w**, where η is the **learning rate**. The minus sign is the whole trick: the gradient points *uphill*; subtracting it walks downhill. For MSE with a single weight and no intercept, ∂L/∂w = (2/n)Σ(ŷᵢ − yᵢ)·xᵢ — the average miss, weighted by each input: features that were large when the model was wrong push the weight harder. Watch the mechanics: if predictions are too small, the gradient is negative, and the update *increases* w. The model needs no knowledge of the "true" w — only the local slope and the courage to step.

**Learning rate: the dial that breaks either way.** η controls step size. Too large — the steps overshoot the minimum and the loss explodes or oscillates forever (divergence: your first sign is loss going to NaN). Too small — you inch toward the minimum across thousands of updates (crawling; a small dataset takes minutes that should take seconds). The intuition to carry: the gradient already contains direction *and* scale (steep slopes → bigger natural steps); η just multiplies it. Practical practice: try 1e-3 / 1e-2 / 1e-1 style sweeps on a log scale, watch the loss curve, and use schedules (large early, small later) or adaptive methods (Adam — Module 4 territory) when defaults misbehave. Feature scaling re-enters here: with wildly different feature scales, the loss surface becomes an elongated valley, and a single η that is safe along one axis crawls along the other — exactly the failure scaling prevents.

**Batch, mini-batch, stochastic.** The gradient estimate can use all n rows (**batch** — stable, expensive per step), a single row (**stochastic/SGD** — noisy, fast, a row per update), or a small chunk (**mini-batch**, the universal default — GPUs like matrices, noise regularises a little). Noise is a feature and a bug: SGD\'s jitter can bounce out of bad local minima (in non-convex landscapes like neural nets) yet makes the final approach to a minimum need learning-rate decay. For least-squares linear regression the loss surface is a nice convex bowl with one minimum — closed-form OLS exists and is exact — so gradient descent on it is a teaching tool, not a necessity. The reason gradient descent dominates ML anyway: most interesting models (logistic regression\'s cross-entropy is convex but noisier; neural nets are wildly non-convex) have no closed-form solution. Learn the walk here, where every number is checkable.`,
        extras: [
          table(
            'MSE, RMSE, MAE — pick by what you want punished',
            ['Loss', 'Formula shape', 'Punishes big errors', 'Robust to outliers', 'Units'],
            [
              ['MSE', 'mean of squared misses', 'Yes (quadratically)', 'No', 'Squared (unreportable)'],
              ['RMSE', '√MSE', 'Yes (quadratically)', 'No', 'Original units (reportable)'],
              ['MAE', 'mean of |misses|', 'Linearly only', 'Yes', 'Original units (reportable)'],
            ],
          ),
          code(
            '# Gradient descent for y_hat = w * x, MSE loss — every step visible\nimport numpy as np\n\nx = np.array([1.0, 2.0])\ny = np.array([2.0, 4.0])          # true relationship: y = 2x\nw, lr, losses = 0.0, 0.1, []\n\nfor epoch in range(6):\n    y_hat = w * x\n    loss = np.mean((y_hat - y) ** 2)          # MSE: 10, 2.5, 0.625, ...\n    grad = np.mean(2 * (y_hat - y) * x)       # dL/dw = mean(2 * error * x)\n    w = w - lr * grad                          # step downhill\n    losses.append(round(loss, 4))\n    print(f\"epoch {epoch}: loss={loss:.4f} grad={grad:.3f} w={w:.3f}\")\n# loss falls 10 -> 2.5 -> 0.625 -> ... while w climbs 0 -> 1 -> 1.5 -> ... -> 2\n# smaller lr (0.01) does the same dance in ~10x more steps; lr = 5 diverges',
            'gd_by_hand.py',
            'python'
          ),
          tip(
            'Read the loss curve like an ECG',
            'Smooth steady decline: healthy. Oscillating then exploding: learning rate too high. Flatline near baseline: rate too low or features unscaled. Val-loss rising while train-loss falls: overfitting — stop, regularise (next lessons).',
          ),
        ],
        worked: {
          title: 'Three gradient-descent steps by hand',
          problem:
            'Model: ŷ = w·x, MSE loss, data (x, y) = (1, 2), (2, 4), start w = 0, learning rate η = 0.1. Compute the loss and the update for the first three steps.',
          steps: [
            {
              title: 'Step 1: w = 0',
              desc: 'ŷ = (0, 0). Errors = (−2, −4). MSE = (4 + 16)/2 = 10. Gradient = mean(2·error·x) = [2(−2)(1) + 2(−4)(2)]/2 = (−4 − 16)/2 = −10. Update: w := 0 − 0.1×(−10) = 1.0.',
            },
            {
              title: 'Step 2: w = 1.0',
              desc: 'ŷ = (1, 2). Errors = (−1, −2). MSE = (1 + 4)/2 = 2.5. Gradient = [2(−1)(1) + 2(−2)(2)]/2 = (−2 − 8)/2 = −5. Update: w := 1.0 − 0.1×(−5) = 1.5.',
            },
            {
              title: 'Step 3: w = 1.5',
              desc: 'ŷ = (1.5, 3). Errors = (−0.5, −1). MSE = (0.25 + 1)/2 = 0.625. Gradient = [2(−0.5)(1) + 2(−1)(2)]/2 = (−1 − 4)/2 = −2.5. Update: w := 1.5 − 0.1×(−2.5) = 1.75. Loss history: 10 → 2.5 → 0.625; w: 0 → 1.0 → 1.5 → 1.75 → … → 2.',
            },
            {
              title: 'Sanity: the shape of convergence',
              desc: 'Each step the misses shrink, the gradient shrinks, and the steps automatically get smaller even at constant η — the bowl flattens near the bottom. With η = 5 instead: w jumps 0 → 50 → … and the loss explodes — divergence, the over-large learning rate\'s signature.',
            },
          ],
          solution:
            'Loss: 10 → 2.5 → 0.625; weights: 0 → 1.0 → 1.5 → 1.75, marching toward the true w = 2. Every number was reachable with a calculator and the one rule w ← w − η·gradient — that same rule, scaled up, trains every deep network you have ever heard of.',
        },
        practice: {
          title: 'Break the learning rate on purpose',
          prompt:
            'Replay the two-point example (y = 2x, w₀ = 0) with η = 0.5 (what happens in three steps?), η = 1.1 (analyse the oscillation), and η = 5 (predict the divergence). Then state the rule of thumb you would tell a friend for choosing η.',
          hint: 'η = 0.5 lands on w = 2 in one clean step for this perfectly quadratic bowl; η > 1.01 overshoots and grows. Real losses are messier — the failure signatures transfer.',
        },
        mistakes: [
          {
            mistake: 'Confusing the gradient\'s sign with the update direction',
            fix: 'The gradient points uphill; the update subtracts it. Gradient negative → w increases. Write the update rule out before every hand computation.',
          },
          {
            mistake: 'Reporting MSE to a stakeholder',
            fix: 'MSE lives in squared units. Report RMSE or MAE ("typically off by ₹13k"); keep MSE as the training loss if you like its gradients.',
          },
          {
            mistake: 'Using a giant learning rate because epochs are expensive',
            fix: 'Diverged steps cost more than they save. Start with a modest η, watch the loss curve for a few epochs, then scale up — decay later rather than gamble early.',
          },
          {
            mistake: 'Assuming gradient descent is required for linear regression',
            fix: 'OLS has an exact closed-form solution and should be your first linear baseline. Gradient descent earns its keep where no closed form exists — logistic regression\'s full objective, and neural nets.',
          },
        ],
        exam: {
          question:
            'Walk through one full gradient-descent update for ŷ = w·x with MSE on (x, y) = (3, 6), starting at w = 1 with η = 0.1. Then explain, without computation, what happens to the step size as w approaches the optimum and why.',
          answer:
            'ŷ = 3. Error = 3 − 6 = −3. MSE = 9. Gradient = 2·(−3)·3 / 1 = −18 (single point: mean is just the value). Update: w := 1 − 0.1·(−18) = 2.8. Next round w = 2.8 → error −1.6 → gradient −9.6 → w = 3.76…, oscillating toward the true w = 2... (note: with this η the approach oscillates across the bowl and settles — a visible lesson in step size). As w nears the optimum, the loss bowl flattens: the gradient magnitude shrinks toward zero, so even with constant η the absolute steps η·|grad| automatically shrink — the model decelerates into the minimum without any extra machinery. If the gradient were exactly zero, the model has reached a stationary point: for this convex bowl, the minimum.',
          source: 'Standard hand-computation question in ML fundamentals exams.',
        },
        summary: [
          'MSE is the default regression loss: smooth, differentiable, big-miss punishing — RMSE makes it reportable, MAE is the robust sibling.',
          'Gradient descent updates w ← w − η·∇L using only the local slope of the loss.',
          'Squared-error gradient = mean of 2·error·x — misses weighted by their feature values.',
          'Learning rate too big diverges; too small crawls — read the loss curve, sweep on a log scale.',
          'Batch/mini-batch/stochastic differ only in how many rows estimate the gradient; mini-batch is the default.',
          'Least squares has a closed form — gradient descent matters because most interesting models do not.',
        ],
      }),
      [
        [
          'MSE = 1600 for a price model (target in ₹). The reportable error in original units is:',
          ['MSE itself', 'RMSE = √1600 = 40', 'MAE = 1600/2', 'R² = 40'],
          1,
          'RMSE restores the target\'s units; MSE\'s units are squared and uninterpretable to stakeholders.',
        ],
        [
          'In the update w := w − η·∂L/∂w, the minus sign exists because:',
          [
            'Gradients point downhill',
            'The gradient points uphill, so subtracting it moves toward lower loss',
            'Weights must always decrease',
            'It prevents overfitting',
          ],
          1,
          'Direction of steepest ascent is the gradient; optimisation goes the other way — descent.',
        ],
        [
          'Training loss oscillates violently and then goes NaN. The most likely cause is:',
          [
            'Too little data',
            'Learning rate too high — steps overshoot the minimum and explode',
            'The target needs log-transforming',
            'Too many features',
          ],
          1,
          'Explosive oscillation is the classic divergence signature of an oversized η.',
        ],
        [
          'Compared with MSE, MAE is:',
          [
            'More sensitive to outliers',
            'Less sensitive to outliers, because errors enter linearly rather than squared',
            'Always larger numerically',
            'Not differentiable anywhere, unlike MSE',
          ],
          1,
          'Absolute errors do not square, so one huge miss cannot dominate the average the way it does in MSE.',
        ],
      ]
    ),
    lesson(
      M3,
      'mlf-3-3',
      33,
      'Regularization: Ridge, Lasso, and the Coefficients They Tame',
      'How L2 and L1 penalties shrink coefficients, why lasso performs automatic feature selection, why you must standardise before penalising, and how λ traces the bias–variance story on a coefficient path.',
      20,
      nineBlocks({
        objectives: [
          'Write the ridge and lasso objectives and explain the meaning of the λ (alpha) hyperparameter',
          'Compare the coefficient behaviour of L2 vs L1 penalties, including sparsity',
          'Explain why feature standardisation is required before applying penalties',
          'Select λ via cross-validation and read a coefficient path plot',
        ],
        hook:
          'A team fits a rent model with 80 features and gets a training R² of 0.99 and a test R² of 0.51. One feature — "number_of_power_outages_in_building_last_year" — has a coefficient of ₹900,000 per outage, swinging wildly between runs. The data screams: the model is buying variance with giant coefficients on noise features. Regularisation is the answer — not more data, not a different algorithm, but a price list: every unit of coefficient magnitude now costs you part of the fit. Ridge bills the squares; lasso bills the absolute values — and lasso, uniquely, can drive a coefficient all the way to zero and fire the feature.',
        concept: `**The idea: charge for complexity.** Ordinary least squares minimises MSE alone, so on collinear or noisy features it happily assigns huge offsetting coefficients (w₁ = +500, w₂ = −499.7) that fit training quirks and explode on new data. Regularisation adds a penalty term to the loss: minimise MSE + λ·P(w). The hyperparameter **λ** (called alpha in scikit-learn) sets the exchange rate between fit and magnitude: λ = 0 recovers plain OLS; large λ forces all weights small, underfitting toward the mean; the best λ is found by cross-validation on validation performance — never guessed once and trusted.

**Ridge (L2): MSE + λ·Σwⱼ².** Squaring means the penalty grows quadratically with each coefficient, applying relentless pull toward zero that never quite arrives — ridge coefficients shrink toward zero but essentially never equal it. What ridge buys: **stability under multicollinearity** — when two features duplicate each other\'s signal, OLS splits the weight arbitrarily and unstablely between them; the L2 penalty prefers spreading small weight across both instead of letting one run large, so predictions stabilise and individual coefficients become quotable again. Ridge keeps every feature (no selection) — the right choice when most features carry weak signal (genomics-style dense settings, many correlated predictors) and you want variance reduction without dropping anything.

**Lasso (L1): MSE + λ·Σ|wⱼ|.** The absolute-value penalty has a geometric quirk (its constraint diamond has corners on the axes) that lets the optimiser land exactly on wⱼ = 0 for weak features. The practical consequence is **automatic feature selection**: as λ grows, features fall out one by one, leaving a sparse, interpretable model — "these six features are the real story". Lasso\'s bill: with strongly correlated features it tends to pick one and zero the other (arbitrary among near-twins), which is unstable for interpretation; and it can keep at most n features in extremely high-dimensional settings. **Elastic Net** (λ₁·Σ|w| + λ₂·Σw²) is the treaty: lasso\'s sparsity with ridge\'s grouping behaviour, usually the safe hybrid when p is huge and features cluster.

**Standardise first — the penalty is scale-blind.** The penalty counts coefficient magnitude in raw units, but a coefficient\'s *effect* depends on the feature\'s scale: income measured in rupees gets tiny coefficients; the same income in lakhs gets 100× larger ones with identical fit. An L1/L2 penalty applied to unscaled features therefore penalises features unevenly — the rupee-scale feature is effectively penalised 100× harder per unit of its influence. Standardising (zero mean, unit variance) puts every coefficient in the same currency before the bill arrives. This is not optional hygiene; forgetting it is the most common ridge/lasso bug in the wild. (Same reason logistic regression with penalty needs scaling — and scikit-learn pipelines make the order automatic.)

**The coefficient path: watching λ do its work.** Sweep λ from tiny to large and plot each coefficient: at λ ≈ 0, coefficients sit near their OLS values (wild, large, correlated); as λ grows, ridge paths shrink smoothly toward zero together; lasso paths descend, hit zero, and stay there — the plot literally shows which features survive at each penalty strength. The sweet spot is chosen by cross-validation: plot mean validation MSE (or R²) vs log(λ) — typically a U-shape — and take the best, optionally the "one-standard-error" λ for a simpler, sparser model. Two practical notes: λ is searched on a log grid (1e-4 … 1e4); and the penalty\'s interaction with intercepts is why libraries leave the intercept unpenalised by default — the intercept just centres predictions, it is not complexity.`,
        extras: [
          table(
            'Ridge vs Lasso vs Elastic Net',
            ['Aspect', 'Ridge (L2)', 'Lasso (L1)', 'Elastic Net'],
            [
              ['Penalty', 'λ·Σwⱼ²', 'λ·Σ|wⱼ|', 'λ₁·Σ|wⱼ| + λ₂·Σwⱼ²'],
              ['Coefficients → 0?', 'Shrink, never exactly 0', 'Yes — exact zeros (selection)', 'Yes, with grouping among correlated features'],
              ['Feature selection?', 'No — keeps all', 'Yes — sparse models', 'Partial'],
              ['Correlated features', 'Shares weight stably', 'Picks one, zeros the rest', 'Groups them (preferred hybrid)'],
              ['Use when', 'Many weak/correlated signals', 'Sparse, interpretable model wanted', 'High-dimensional, clustered features'],
            ],
          ),
          code(
            '# Ridge and lasso with CV — and the mandatory scaling\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.linear_model import RidgeCV, LassoCV, ElasticNetCV\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.model_selection import cross_val_score\n\nscale = StandardScaler()          # penalties are scale-blind: always scale first\n\nridge = Pipeline([(\"s\", scale), (\"m\", RidgeCV(alphas=np.logspace(-3, 3, 25)))])\nlasso = Pipeline([(\"s\", scale), (\"m\", LassoCV(alphas=np.logspace(-4, 1, 50), cv=5, random_state=0))])\n\nridge.fit(X_train, y_train)\nlasso.fit(X_train, y_train)\nprint(\"ridge best alpha:\", ridge[-1].alpha_)\nprint(\"lasso best alpha:\", lasso[-1].alpha_)\nprint(\"lasso nonzero coefs:\", int((lasso[-1].coef_ != 0).sum()), \"of\", lasso[-1].coef_.size)\n# Read: lasso fired (coef=0) the noisy outage feature; ridge kept it but shrank it.',
            'regularization_cv.py',
            'python'
          ),
          tip(
            'Pick the simpler model within one standard error',
            'When validation performance is flat across a range of λ, prefer larger λ (smaller coefficients, sparser lasso) — nearly equal performance, more robust to the next data batch.',
          ),
        ],
        worked: {
          title: 'Penalty arithmetic and the firing of a noisy feature',
          problem:
            'Two candidate coefficient settings on standardised features achieve training MSE 18.0 and 18.4: Model A has w = (5.0, 0.5); Model B has w = (1.2, 0.8). With λ = 0.5, compute MSE + λ·P for ridge (L2) and lasso (L1) and discuss.',
          steps: [
            {
              title: 'Ridge penalties',
              desc: 'P₂(A) = 5.0² + 0.5² = 25.25 → objective 18.0 + 0.5×25.25 = 30.63. P₂(B) = 1.2² + 0.8² = 1.44 + 0.64 = 2.08 → objective 18.4 + 1.04 = 19.44. Ridge prefers B: Model A pays a heavy bill for its huge coefficient despite better raw fit.',
            },
            {
              title: 'Lasso penalties',
              desc: 'P₁(A) = 5.0 + 0.5 = 5.5 → 18.0 + 2.75 = 20.75. P₁(B) = 1.2 + 0.8 = 2.0 → 18.4 + 1.0 = 19.4. Lasso also prefers B — and with larger λ, its optimum pushes the weak coefficient to exactly 0 rather than merely small.',
            },
            {
              title: 'Interpret the exchange rate',
              desc: 'A coefficient of 5 costs ridge 12.5 units of objective and lasso 2.5 — both overwhelm a 0.4 MSE advantage. The penalty converts "slightly better fit" into "clearly worse objective" whenever the price of the weights exceeds the fit gained — the entire regularisation bargain in two arithmetic lines.',
            },
            {
              title: 'Connect to validation',
              desc: 'In practice you never hand-pick λ from toy objectives: cross-validate a log grid, watch train error fall and validation error U-turn as λ grows, and take the validation optimum (or the sparser one-standard-error choice).',
            },
          ],
          solution:
            'For both penalties Model B wins the combined objective (19.44 ridge, 19.4 lasso vs 30.63/20.75 for A): the fit gain of A\'s huge coefficient cannot pay its magnitude bill. Scale features first, sweep λ by CV, and let the coefficient path show you which features survive.',
        },
        practice: {
          title: 'Predict the coefficient path',
          prompt:
            'You have three features: x1 strongly predictive, x2 moderately predictive, x3 pure noise but correlated with x1. Sketch (words or pencil) how ridge and lasso coefficients for x1, x2, x3 behave as λ grows from 0 to large. Which model drops x3? What happens to x2 under lasso?',
          hint: 'Lasso zeroes weak/noise features (x3 first); near-twins like x1/x3 under correlation see lasso pick one. Ridge shrinks everything smoothly and keeps all three.',
        },
        mistakes: [
          {
            mistake: 'Applying ridge/lasso to unscaled features',
            fix: 'StandardScaler inside the pipeline, always: the penalty is blind to units, so unscaled features are penalised unevenly and the λ search is meaningless.',
          },
          {
            mistake: 'Keeping the default λ/alpha forever',
            fix: 'α is THE hyperparameter of these models — search it on a log grid with cross-validation; validation curves are cheap and decisive.',
          },
          {
            mistake: 'Interpreting lasso\'s zeros as "these features do not matter at all"',
            fix: 'Zeros mean "did not earn their penalty at this λ, given the other features". Correlated substitutes may have taken their job — re-run with correlated features grouped or with elastic net before writing the feature off scientifically.',
          },
          {
            mistake: 'Penalising the intercept',
            fix: 'Leave intercepts unpenalised (the library default): the intercept only centres the prediction scale; penalising it biases all predictions toward zero for no regularisation benefit.',
          },
        ],
        exam: {
          question:
            'Your 200-feature regression overfits (train R² 0.99, CV R² 0.55). Compare ridge and lasso as fixes, state what you would standardise and tune, and say which you would choose if the goal were an interpretable shortlist of drivers for a business report.',
          answer:
            'Both add λ·P(w) to MSE to bill coefficient magnitude and tame variance; the difference is the bill\'s shape. Ridge (L2) shrinks all 200 coefficients toward zero without zeroing any — excellent for stability with correlated, densely weak features; CV R² should recover, coefficients stop swinging between runs. Lasso (L1) can set coefficients exactly to zero — sparse models, built-in selection — ideal when the business wants a shortlist of drivers; risk: among correlated drivers it arbitrarily keeps one. Procedure: standardise features inside a pipeline (penalties are scale-blind), search alpha on a log grid with k-fold CV (RidgeCV/LassoCV), read the coefficient path, and prefer the one-standard-error solution for parsimony. For the report\'s shortlist goal: lasso (or elastic net with strong L1 component) — it delivers the named drivers; validate the shortlist\'s stability across folds before printing it.',
          source: 'Bread-and-butter regularisation question in ML interviews; a GATE-style variant asks to contrast L1/L2 effects on weights.',
        },
        summary: [
          'Regularisation = MSE + λ·penalty; λ trades fit against coefficient magnitude; tune it by CV on a log grid.',
          'Ridge (L2): smooth shrinkage, never exact zeros; stabilises multicollinearity, keeps all features.',
          'Lasso (L1): exact zeros — automatic feature selection; unstable among correlated twins.',
          'Elastic Net combines both; the safe hybrid for high-dimensional clustered features.',
          'Standardise before penalising — otherwise the penalty is applied in mixed currencies.',
          'The coefficient path vs log(λ) is the picture of the bias–variance bargain; the CV U-curve picks the crossing.',
        ],
      }),
      [
        [
          'The ridge regression objective minimises:',
          [
            'MSE + λ·Σ|wⱼ|',
            'MSE + λ·Σwⱼ²',
            'MAE only',
            'R² + λ·Σwⱼ²',
          ],
          1,
          'Ridge = least squares plus the L2 (squared-magnitude) penalty.',
        ],
        [
          'The key practical difference between lasso and ridge is:',
          [
            'Lasso is faster to train',
            'Lasso can drive coefficients exactly to zero (feature selection); ridge shrinks but keeps all features',
            'Ridge requires scaled data; lasso does not',
            'Ridge performs better on all datasets',
          ],
          1,
          'L1 geometry permits exact zeros; L2 never lands on them — the sparsity difference defines their roles.',
        ],
        [
          'Before fitting ridge/lasso, you should standardise features because:',
          [
            'The algorithms cannot read raw numbers',
            'The penalty measures coefficient magnitude in raw units, so unscaled features would be penalised unevenly',
            'It reduces the number of features',
            'It is required only for the intercept',
          ],
          1,
          'A coefficient of 5 means different things for features with std 1 vs std 1000; standardisation puts all penalties in the same currency.',
        ],
        [
          'As λ increases from 0 toward large values, validation error typically:',
          [
            'Decreases monotonically',
            'Falls, reaches a minimum, then rises (underfitting sets in)',
            'Stays constant',
            'Rises monotonically',
          ],
          1,
          'Small λ fixes overfitting; excessive λ shrinks coefficients too far and underfits — the classic U-shaped CV curve.',
        ],
      ]
    ),
    lesson(
      M3,
      'mlf-3-4',
      34,
      'Logistic Regression: Sigmoid, Log-Odds, and the Decision Threshold',
      'How a linear model becomes a probability machine: the sigmoid squash, cross-entropy training, multi-class via softmax, and the threshold that turns probabilities into decisions — with the reason the name says "regression".',
      21,
      nineBlocks({
        objectives: [
          'Compute sigmoid outputs for given logits and interpret them as probabilities',
          'Explain why logistic regression uses cross-entropy loss instead of MSE, and why it is called "regression"',
          'Map coefficients to log-odds and odds ratios for interpretation',
          'Choose and justify a decision threshold other than 0.5 for a cost-asymmetric problem',
        ],
        hook:
          'Interviewer: "Logistic regression — is it regression or classification?" Half the room says regression because of the name. Half says classification because of the use. Both are right, and the full answer is the best thirty seconds you will spend in the interview: logistic regression *regresses the log-odds of the probability*, outputs a continuous score, and someone — not the model — draws the decision line. The name records what happens inside; the use records what happens at the end. Hold both and you understand the model.',
        concept: `**The problem with squaring a probability.** You want probabilities, so the output should live in [0, 1]. A linear model w·x + b outputs any real number — negative "probabilities" are nonsense, and MSE on probabilities creates a non-convex loss with ugly local minima. The fix: keep the linear part but wrap it in a link function. Compute the **logit / log-odds**: z = w·x + b = log(p/(1−p)) — the linear model\'s honest job is to model *log-odds*, an unbounded quantity that suits a straight line perfectly. Then squash through the **sigmoid**: σ(z) = 1/(1 + e^(−z)), which maps any real z to (0, 1). σ(0) = 0.5 (even odds), σ(2) ≈ 0.88, σ(−2) ≈ 0.12, and large |z| saturates at 0 or 1 with a beautiful S-curve. The composite p̂ = σ(w·x + b) is the model: a linear score converted to a probability.

**Training: cross-entropy, not squared error.** Logistic regression is fitted by minimising **log loss (cross-entropy)**: for a binary label y ∈ {0,1}, L = −[y·log(p̂) + (1−y)·log(1−p̂)]. Read it as a punishment schedule: if the true class is 1 and the model says p̂ = 0.99, the loss is tiny; if it says p̂ = 0.01, the loss explodes toward infinity — confident wrongness is maximally expensive, which is exactly the behaviour you want for probabilities. Cross-entropy plus the sigmoid gives a **convex** objective — one global minimum — optimised by the same gradient descent family (or better solvers) you met in Lesson 3.2; no closed form, but guaranteed convergence. And the reason not to reuse MSE: squared error on sigmoid outputs is non-convex and vanishing-gradient-prone (the S-curve flattens at the extremes, killing the gradient exactly when the model is most wrong).

**Why the name says regression — three defensible readings.** (1) It regresses the log-odds: the linear part models log(p/(1−p)), a continuous quantity — regression machinery on a transformed target. (2) It emits continuous outputs: probabilities (or scores), not just hard labels — many call it a "probabilistic classifier" or a "linear model for probabilities". (3) Historical: it belongs to the generalized linear model family alongside linear regression (same least-squares-era tribe, different link). The operational answer for interviews: *a linear model trained for classification that regresses log-odds and thresholds the resulting probabilities.* Multi-class extension: **softmax regression / multinomial logistic** squashes a vector of logits into a probability distribution across K classes (softmax is the sigmoid\'s multi-class generalisation); the one-vs-rest trick (K separate binary fits) is the cheaper alternative.

**Interpretation: coefficients act on log-odds.** exp(wⱼ) is the **odds ratio**: one unit increase in xⱼ multiplies the odds of the positive class by e^wⱼ, holding other features fixed. wⱼ = 0.7 → odds × e^0.7 ≈ 2.0 — each unit doubles the odds. This is the linear model\'s interpretability superpower carried into classification ("each additional late payment doubles the odds of default"), and it is why logistic regression remains the production model in credit, healthcare triage, and any regulated domain: auditable, coefficient-quotable, stable. Remember "odds" is not "probability": odds 2:1 means probability 2/3.

**The threshold is a business decision.** The model emits p̂; someone must map p̂ to an action. The default 0.5 corresponds to symmetric costs and balanced classes — assumptions rarely true. Credit scoring: false positives (approving a defaulter) cost more than false negatives (missing a good customer) → raise the threshold. Cancer screening: misses are catastrophic → lower it, accept more false alarms. The mechanics: pick the threshold on a **validation** set to hit an operational constraint (recall ≥ 0.9; precision at top-N alerts; minimum expected cost given FP/FN prices), freeze it, then report test metrics at that frozen threshold. Precision-recall trade-off across thresholds is the operating curve of the whole system — the ROC curve plots the same trade-off in FPR/recall coordinates — and threshold tuning is often worth more than swapping model families. Calibration matters too: when the probability itself is the product (risk scores fed into a pricing engine), check calibration (reliability plots, Brier score), because a well-ranking model can still output overconfident numbers.`,
        extras: [
          table(
            'Sigmoid checkpoints (memorise these)',
            ['Logit z', 'σ(z) = p̂', 'Odds p̂/(1−p̂)'],
            [
              ['−3', '≈ 0.047', '1 : 20'],
              ['−2', '≈ 0.12', '≈ 1 : 7'],
              ['−1', '≈ 0.27', '≈ 1 : 2.7'],
              ['0', '0.50', '1 : 1'],
              ['+1', '≈ 0.73', '≈ 2.7 : 1'],
              ['+2', '≈ 0.88', '≈ 7 : 1'],
              ['+3', '≈ 0.95', '≈ 20 : 1'],
            ],
          ),
          code(
            '# Logistic regression: probabilities, threshold, and interpretation\nfrom sklearn.linear_model import LogisticRegression\nfrom sklearn.metrics import precision_recall_curve, classification_report\nimport numpy as np\n\nclf = LogisticRegression(max_iter=1000).fit(X_train_scaled, y_train)\np = clf.predict_proba(X_test_scaled)[:, 1]\n\n# Default threshold 0.5 vs a recall-oriented threshold picked on VALIDATION\np_val = clf.predict_proba(X_val_scaled)[:, 1]\nprec, rec, thr = precision_recall_curve(y_val, p_val)\n# find threshold where recall first >= 0.90\nidx = np.argmax(rec[::-1] >= 0.90)      # example logic; adjust to your arrays\nt = thr[idx]\nprint(classification_report(y_test, (p >= t).astype(int)))\n\n# Odds-ratio interpretation\nprint(\"odds ratio per unit feature j:\", np.exp(clf.coef_[0]))\n# exp(coef) = multiplicative change in odds per unit of that feature',
            'logistic_threshold.py',
            'python'
          ),
          warn(
            'Never tune the threshold on the test set',
            'Threshold selection consumes information — do it on validation, freeze it, then evaluate test once. Test-set threshold hunting is the leakage you will not see in the code review.',
          ),
          tip(
            'When classes are balanced and costs symmetric, 0.5 is fine',
            'The 0.5 default is not wrong by decree — it is wrong by assumption. When the assumptions hold, keep it; when they do not, price the errors explicitly.',
          ),
        ],
        worked: {
          title: 'A spam score, its log-odds, and a threshold decision',
          problem:
            'A logistic spam model for one email: log-odds z = −3.0 + 4.0·(contains_free) + 2.0·(link_count ≥ 3) + 1.5·(sender_unknown). For an email with contains_free = 1, link_count = 5, sender_unknown = 0: compute the probability, then decide the label at thresholds 0.5 and 0.3, with a precision/recall argument.',
          steps: [
            {
              title: 'Logit and probability',
              desc: 'z = −3.0 + 4.0·1 + 2.0·1 + 1.5·0 = 3.0. p̂ = σ(3) = 1/(1+e^(−3)) ≈ 0.953. The model says ~95% chance of spam. Odds: 0.953/0.047 ≈ 20:1.',
            },
            {
              title: 'Threshold 0.5',
              desc: '0.953 ≥ 0.5 → classify SPAM. Fine for symmetric costs — but a false-positive (legitimate mail nuked) may annoy a paying user more than a missed spam.',
            },
            {
              title: 'Threshold 0.3 (precision-sensitive)',
              desc: 'Still spam here — the threshold mostly affects borderline scores (p̂ ≈ 0.3–0.5). Raising toward 0.7 would demote borderline messages to inbox: higher precision for "spam" calls, more spam slips through.',
            },
            {
              title: 'Cost reasoning',
              desc: 'Suppose FP (losing real mail) costs 5× FN (seeing spam). Set the threshold on validation to optimise expected cost or to hold precision ≥ 0.98, accept the recall hit, freeze, then report test metrics at that operating point. The model\'s probabilities did not change — only the business line.',
            },
          ],
          solution:
            'z = 3.0 → p̂ ≈ 0.953 → spam at any sane threshold. The threshold debate is not about this confident email; it is about the borderline mass, and it is settled by error costs measured on validation data — 0.5 is one candidate, not a commandment.',
        },
        practice: {
          title: 'Threshold surgery',
          prompt:
            'On any binary dataset, train logistic regression and plot (or tabulate) precision, recall, and predicted-positive-rate at thresholds 0.2, 0.3, 0.5, 0.7, 0.8. Pick the operating point you would defend for (a) a fraud queue with 500 alerts/day capacity, (b) a disease pre-screen where misses are dangerous — and justify each in one sentence.',
          hint: 'Capacity problems want precision@N; miss-cost problems want high recall at an acceptable false-alarm budget. Both choices live on validation data.',
        },
        mistakes: [
          {
            mistake: 'Applying MSE to a classifier\'s probabilities',
            fix: 'Use cross-entropy: it is convex with the sigmoid, and it punishes confident wrongness properly. MSE on probabilities is non-convex with vanishing gradients at the extremes.',
          },
          {
            mistake: 'Interpreting logistic coefficients as "change in probability"',
            fix: 'They act on log-odds: exp(coef) is the odds ratio per unit. Probability change depends on the starting point (the sigmoid is nonlinear) — quote odds ratios, or compute marginal effects explicitly.',
          },
          {
            mistake: 'Shipping the 0.5 threshold without looking at costs',
            fix: 'State the FP/FN costs, sweep thresholds on validation, choose the operating point that prices them, and freeze it. In production the threshold is part of the product spec.',
          },
          {
            mistake: 'Forgetting to scale features before a penalised logistic regression',
            fix: 'Same rule as ridge/lasso: the penalty is scale-blind; put StandardScaler in the pipeline or the regularisation distorts.',
          },
        ],
        exam: {
          question:
            'A logistic regression on loan data gives coefficient β_credit_score = −0.01 per point (other features fixed). (a) Interpret exp(β). (b) Compute the probability for a customer with z = −2. (c) The bank wants fewer bad approvals; what do you change first and where do you do it?',
          answer:
            '(a) exp(−0.01) ≈ 0.990: each extra credit-score point multiplies the odds of default by 0.990 — a ~1% odds reduction per point; 50 points ≈ exp(−0.5) ≈ 0.61× the odds. (b) σ(−2) = 1/(1+e²) ≈ 0.119 — about 12% default probability. (c) First move: raise the approval threshold on the default probability (e.g., from 0.5 to 0.7) — decided on a validation set against the bank\'s FP/FN costs — because it directly reduces bad approvals at the expense of rejecting some good applicants (recall of good customers falls). Alternatives after that: retrain with class weighting toward the bad-approval cost, add features, or recalibrate. Do all threshold work on validation; test remains sealed.',
          source: 'Standard interview sequence: interpret → compute → operate; common in lending and risk analytics rounds.',
        },
        summary: [
          'Logistic regression: linear score z = w·x + b → sigmoid → probability p̂ ∈ (0,1).',
          'It is called regression because it models the log-odds (a continuous quantity) and outputs continuous probabilities — used for classification by thresholding.',
          'Train with cross-entropy, not MSE: convex with the sigmoid, and maximally punishing of confident mistakes.',
          'Coefficients act on log-odds; exp(coef) is the odds ratio per unit feature, holding others fixed.',
          'The 0.5 threshold encodes symmetric costs — pick the real threshold on validation from FP/FN prices or capacity.',
          'Multi-class: softmax (multinomial) or one-vs-rest; probabilities can be calibrated when the number itself matters.',
        ],
      }),
      [
        [
          'The sigmoid function σ(z) maps:',
          [
            '[0, 1] to the whole real line',
            'Any real logit to a probability in (0, 1)',
            'Probabilities to log-odds only',
            'Vectors to their L2 norm',
          ],
          1,
          'It is the squashing link: z ∈ ℝ ↦ p̂ ∈ (0,1), with σ(0) = 0.5.',
        ],
        [
          'Why is cross-entropy preferred over MSE for training logistic regression?',
          [
            'It is faster to write in code',
            'It is convex with the sigmoid and heavily punishes confident wrong predictions, avoiding vanishing gradients',
            'MSE cannot be computed for binary labels',
            'Cross-entropy requires no threshold',
          ],
          1,
          'Squared error on S-curved outputs is non-convex with tiny gradients when the model is most wrong; log loss fixes both.',
        ],
        [
          'exp(β) for a logistic regression coefficient β is best described as:',
          [
            'The change in probability per unit feature',
            'The odds ratio: multiplicative change in the odds of the positive class per unit feature',
            'The RMSE of the model',
            'The learning rate',
          ],
          1,
          'The linear part lives on log-odds; exponentiating gives the per-unit multiplier on odds (probabilities move nonlinearly).',
        ],
        [
          'A screening model must not miss positive cases. The most direct operational change is:',
          [
            'Lower the decision threshold on the validation-chosen operating point (accept more false alarms for higher recall)',
            'Raise the threshold',
            'Delete the test set',
            'Switch the loss to MSE',
          ],
          0,
          'Lowering the threshold labels more cases positive — recall rises, precision falls; choose the exact point on validation.',
        ],
      ]
    ),
  ],
};
