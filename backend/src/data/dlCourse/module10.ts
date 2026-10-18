// Module 10 — Scaling, Efficiency & the Capstone
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code } from '../nineBlocks';
import { lesson, M10, COURSE_ID } from './helpers';

export const module10: CourseModule = {
  id: M10,
  course_id: COURSE_ID,
  title: 'Module 10 — Scaling, Efficiency & the Capstone',
  summary:
    'The engineering economics of deep learning: diagnosing capacity-versus-data with learning curves, label-noise ceilings, and compute-optimal allocation; compressing models with quantization, distillation, and pruning (with error bounds and bandwidth arithmetic); serving and evaluating honestly — TTFT/TPOT, KV-cache budgets, contamination, judge bias, cost per million tokens; and a capstone that designs a full system against a frontier of MoE, long context, multimodality, and on-device constraints.',
  sort_order: 10,
  lessons: [
    lesson(
      M10,
      'dl-10-1',
      1,
      'Capacity vs Data: Recipes That Generalize',
      'Reading learning curves as a diagnosis: underfit versus overfit quadrants, the label-noise accuracy ceiling you can compute, imbalance baselines that expose fake accuracy, and compute-optimal allocation before you buy a bigger model.',
      22,
      nineBlocks({
        objectives: [
          'Diagnose a run from train/val curves and prescribe a prioritized fix order',
          'Compute the accuracy ceiling and irreducible loss under symmetric label noise',
          'Expose majority-class and leakage artifacts with the right baselines and splits',
          'Allocate fixed compute between parameters and tokens using the C = 6ND view',
        ],
        hook:
          'Two teams each report "our model needs more data". Team A has 99% train accuracy and 72% validation — their model has memorized and their dataset has near-duplicates it exploits. Team B has 62% train and 60% validation — no amount of dropout will help; their model cannot even fit the training set. Same headline, opposite diagnoses, opposite fixes: reading the curves correctly is worth more than any single regularizer.',
        concept: `**Two curves, four patterns.** Track train and validation loss (and accuracy) per epoch. (1) BOTH weak — train ≈ val at poor values: UNDERFIT — optimization or capacity problem: raise capacity, fix a broken LR (too low / zeroed gradients), check labels, train longer. (2) Train strong, val weak and diverging: OVERFIT — data volume/quality/noise problem first, regularization second. (3) Val BETTER than train: not leakage by itself — dropout/BN in train mode and augmentation make training harder than evaluation; expected gap, keep going. (4) Sudden cliff at step k: LR schedule spike, corrupt batch, fp16 overflow — go to the module 9.4 trace. The fix ORDER: prove the model can overfit a tiny subset (10 batches to ~zero loss — if not, the bug is code/hyperparameters, not data), then choose capacity, then data, then regularization. Never tune regularization against an unproven optimization pipeline.

**Capacity, data, and ceilings.** Capacity comes from width/depth/parameters; useful capacity at any compute budget is bounded by data (Chinchilla view, module 7.3: compute-optimal training wants roughly D ≈ 20x params tokens — for a 7B model that is ~140B tokens; C = 6ND fixes the trade: doubling params at fixed C halves your tokens, and undertrained big models lose to well-trained smaller ones). Data VOLUME helps until redundancy saturates; data QUALITY helps almost always (dedup, quality filters, PII removal — module 7.1's pipeline at smaller scale). Then the REGULARIZATION LADDER, in cost order: weight decay -> dropout/stochastic depth -> label smoothing -> augmentation (domain-legal transforms) -> early stopping -> EMA weights. Know the two ceilings data cannot fix around: LABEL NOISE — with symmetric noise rate eta in K classes, the best achievable accuracy on noisy labels is (1 - eta) + eta/K: eta = 0.15, K = 10 → 0.85 + 0.015 = 86.5%, and the irreducible cross-entropy is H = -0.865 ln 0.865 - 9 x 0.015 ln 0.015 ≈ 0.692 nats ≈ 1.00 bit — no architecture beats a corrupted ceiling; fix the labels. And CLASS IMBALANCE — a 99:1 dataset rewards a constant predictor with 99% "accuracy" (balanced accuracy 50%, minority F1 = 0): accuracy is the WRONG metric, and the fix set is weighted cross-entropy (weight N/(K n_k), giving the rare class weight 50 in a 1000-sample 10/990 split), resampling, focal loss, and threshold tuning — report PR-AUC / per-class F1 / minority recall.

**Leakage and double descent.** Split hygiene: random splits LIE when rows are near-duplicates or ordered in time — split by entity or timestamp (forecasting: never train on the future), dedup before splitting, fit preprocessing on TRAIN only. Generalization has one more surprise: the double-descent curve — past the interpolation threshold (enough parameters to fit training data exactly), test error can FALL again as width grows; "bigger model, better generalization" is real in the over-parameterized regime because gradient-descent solutions there are low-complexity (norm-minimizing-ish). Do not memorize it as a law — memorize the practice: capacity decisions belong in cheap scaling runs (fit the curve at 5 sizes, extrapolate) before you commit the budget.`,
        extras: [
          table(
            'Curve diagnosis card',
            ['Pattern', 'Evidence', 'First actions'],
            [
              ['Underfit', 'train ≈ val, both poor (e.g., 62% / 60%)', 'Prove tiny-batch overfit; capacity up; LR range test; check labels/loss'],
              ['Overfit', 'train high, val gap (99% / 72%)', 'More/better data -> dedup/filters -> augmentation -> weight decay/dropout -> early stop'],
              ['Val > train', 'e.g., 70% / 75%', 'Expected under dropout/BN/aug — not a bug; keep training'],
              ['Sudden cliff', 'loss NaN/spike at step k', 'Grad-norm + LR + scale traces (9.4); resume from last clean checkpoint'],
              ['Chance-level val', '50% on binary with confident train', 'Leakage check, label permutation bug, wrong class mapping'],
            ],
          ),
          code(
            `import torch
from torch.optim.lr_scheduler import LambdaLR

# ---- LR range test: find the usable band in one short run ----
def lr_range_test(model, dl, lo=1e-6, hi=10.0, steps=200):
    opt = torch.optim.SGD(model.parameters(), lr=lo)
    lrs, losses = [], []
    gamma = (hi / lo) ** (1 / steps)
    for i, (xb, yb) in enumerate(dl):
        if i >= steps: break
        lr = lo * gamma ** i
        for g in opt.param_groups: g["lr"] = lr
        loss = torch.nn.functional.cross_entropy(model(xb.to("cuda")), yb.to("cuda"))
        opt.zero_grad(set_to_none=True); loss.backward(); opt.step()
        lrs.append(lr); losses.append(loss.item())
    return lrs, losses          # steepest-decline LR -> good base; divergence -> upper bound

# ---- early stopping on val loss with restore ----
best, bad, best_state = float("inf"), 0, None
for epoch in range(EPOCHS):
    train_one_epoch(model, train_dl, opt)
    v = evaluate(model, val_dl)
    if v < best - 1e-4:
        best, bad, best_state = v, 0, {k: t.clone() for k, t in model.state_dict().items()}
    else:
        bad += 1
        if bad >= PATIENCE:
            model.load_state_dict(best_state); break      # stop on the best epoch`,
            'diagnosis_tools.py',
            'python',
          ),
          tip(
            'Overfit ten batches before touching the data',
            'A model that cannot drive the loss to ~0 on 10 batches has an optimization or implementation problem — no dataset change will fix it. This 5-minute test separates "needs more data" from "my learning rate is wrong" faster than any argument.',
          ),
          warn(
            'Accuracy on imbalanced data is a vanity metric',
            'At 99:1, a constant predictor scores 99%. Always print the majority baseline next to your number, and report balanced metrics (PR-AUC, per-class F1, minority recall). A model that beats nothing by 0.2 points has earned nothing.',
          ),
          info(
            'Some ceilings are arithmetic, not engineering',
            'Under 15% symmetric noise in 10 classes the best possible noisy-label accuracy is 86.5% and irreducible loss is ~0.69 nats — before any architecture enters the room. Computing the ceiling first tells you whether a month of tuning is mathematically pointless and relabeling is the real project.',
          ),
        ],
        worked: {
          title: 'Diagnose two runs, compute a noise ceiling, and allocate compute',
          problem:
            'Given four scenarios: (A) train 62% / val 60%; (B) train 99% / val 72%; (C) val 75% / train 70%; (D) loss spikes to NaN at step 43,001. (a) Diagnose each and give the first fix. (b) Label noise: eta = 0.15 symmetric, K = 10 — best achievable accuracy and the irreducible cross-entropy H in nats (to 3 decimals). (c) Imbalance: 1000 samples, 10 minority / 990 majority — majority-baseline accuracy, balanced accuracy of that baseline, and the weighted-CE weight for each class via N/(K n_k). (d) Fixed compute C = 6ND: a run doubles parameters at fixed C — what happens to token count, and what token count does D ≈ 20N prescribe for a 7B model? (e) Augmentation: 60,000 images with 10 random views each — nominal epoch size, and why the effective diversity is less.',
          steps: [
            {
              title: '(a) Four diagnoses',
              desc: 'A: underfit — train never got low; prove 10-batch overfit, then capacity/LR/features (regularization would make it worse). B: classic overfit — data first: dedup, filters, augmentation; then weight decay/dropout/early stop (order matters: regularization on garbage data only slows memorization). C: expected gap — dropout/BN/aug harder than eval; keep training, verify eval uses eval() + no_grad. D: systems failure, not modeling — read grad-norm/LR/scale traces at step 43k (likely LR schedule spike or fp16 overflow), resume from the last clean checkpoint.',
              code_snippet: 'A: capacity/LR  B: data->reg  C: expected  D: trace + resume',
            },
            {
              title: '(b) Symmetric-noise ceiling',
              desc: 'Observed label distribution: P(true class) = (1 - eta) + eta/K = 0.85 + 0.015 = 0.865; each other class = eta/K = 0.015 (check: 0.865 + 9 x 0.015 = 1.0). Best achievable noisy-label accuracy = 86.5%. Irreducible loss H = -sum p ln p = -0.865 ln 0.865 - 9 x 0.015 ln 0.015 = 0.12542 + 0.56696 = 0.69238 ≈ 0.692 nats = 0.692/0.6931 ≈ 1.00 bit per example — matching the classic "one bit lost to noise" intuition.',
              code_snippet: 'ceiling 86.5% ; H ≈ 0.692 nats ≈ 1.00 bit',
            },
            {
              title: '(c) Imbalance arithmetic',
              desc: 'Majority baseline: 990/1000 = 99% accuracy. Its balanced accuracy = (recall_majority + recall_minority)/2 = (1.0 + 0.0)/2 = 50%; minority F1 = 0 — the pair that exposes the vanity metric. Weighted CE with N/(K n_k): minority = 1000/(2 x 10) = 50.0; majority = 1000/(2 x 990) = 0.505 — the rare class now contributes ~99x more loss per sample, matching the cost of missing it.',
              code_snippet: 'baseline 99% acc / 50% balanced ; weights 50.0 vs 0.505',
            },
            {
              title: '(d) Compute allocation',
              desc: 'C = 6ND: at fixed C, N x D is invariant — doubling N halves D (2x params, 0.5x tokens): the model is now undertrained per-parameter, which is exactly the trap Chinchilla quantified (optimal D ≈ 20N — earlier recipes over-spent on parameters and under-spent on data). For N = 7B: D ≈ 20 x 7e9 = 1.4e11 = 140B tokens. Spend compute where the fitted scaling curve is steepest, verified by cheap proxy runs — not by fashion.',
              code_snippet: 'fixed C: N x 2, D / 2 ; D* ≈ 20 x 7B = 140B tokens',
            },
            {
              title: '(e) Augmentation arithmetic',
              desc: 'Nominal epoch = 60,000 x 10 = 600,000 views (10x batch traffic, 10x compute per epoch). Effective diversity is LESS than 10x: views of the same image share label and nearly all content — they constrain invariances (rotation/occlusion/stroke jitter) rather than add independent information. Augmentation substitutes for data where the transform preserves the label; it cannot substitute for new classes, new domains, or corrupted labels (and label-illegal transforms — rotations that change 6 into 9 — inject noise the ceiling math already priced).',
              code_snippet: '60k x 10 = 600k views (10x traffic, <10x information)',
            },
          ],
          solution:
            '(a) A underfit (capacity/LR), B overfit (data then reg), C expected train/eval gap, D systems spike (traces + resume). (b) Ceiling 86.5%; H ≈ 0.692 nats ≈ 1.00 bit. (c) Baseline 99% acc vs 50% balanced; weights 50.0 / 0.505. (d) At fixed C, 2x params = 0.5x tokens; D ≈ 20N → 140B tokens for 7B. (e) 600k nominal views with <10x effective information — augmentation buys invariance, not independence.',
        },
        practice: {
          title: 'Run a capacity-vs-data study you could present',
          prompt:
            'On a real dataset (imbalanced is a bonus): (1) four model sizes, same recipe — plot train/val curves and label each regime (underfit/overfit/sweet spot); (2) run an LR range test for the chosen size and justify your LR band; (3) run the 10-batch overfit test first and paste the result; (4) compute and report the majority baseline and balanced metrics for your split — if the dataset is imbalanced, apply weighted CE and show minority-recall movement; (5) introduce 15% synthetic label noise on 10% of the data, retrain, and compare against the ceiling logic; (6) dedup NEAR-duplicates before/after splitting and show the val-metric difference; (7) end with a one-page decision: which fix buys the next accuracy point — data, capacity, or regularization — with evidence.',
          hint: 'For (6) use exact or near-exact hash matches (or embedding cosine > 0.98) — the val delta you see is leakage removed, which usually beats a regularizer. For (5), you will not exceed the noisy ceiling on the corrupted portion — that IS the point.',
        },
        mistakes: [
          {
            mistake: 'Adding regularization to an underfit model',
            fix: 'Dropout/weight decay on a model that cannot fit training data widens both gaps in the wrong direction. Prove tiny-batch overfit first, fix capacity/LR, and only then regularize a model that overfits.',
          },
          {
            mistake: 'Tuning against a contaminated or future-leaking split',
            fix: 'Near-duplicate rows across splits and time-ordered data split at random inflate validation until test day. Dedup before splitting; split by entity or timestamp; fit preprocessing on train only; keep the test set sealed until the end.',
          },
          {
            mistake: 'Chasing accuracy on 99:1 data',
            fix: 'Report the majority baseline alongside; switch to PR-AUC, per-class F1, minority recall; rebalance the loss (N/(K n_k)) and tune decision thresholds. Otherwise you are measuring how common the common class is.',
          },
          {
            mistake: 'Buying a bigger model before fixing data quality',
            fix: 'Capacity multiplies what the data teaches — including its noise and duplicates. Dedup, filter, and relabel first; then use cheap 5-point scaling runs to see whether the next unit of compute belongs in parameters or tokens (C = 6ND, D ≈ 20N).',
          },
        ],
        exam: {
          question:
            'A model shows 99% training accuracy and 72% validation accuracy. Diagnose the run, give a prioritized action list in order, and compute: (i) the best achievable accuracy under 15% symmetric label noise with 10 classes, (ii) the weighted cross-entropy factor for a class with 10 of 1000 samples, and (iii) the compute-optimal token count for a 7B-parameter model. Explain why augmentation cannot fix a label-noise problem.',
          answer:
            'Diagnosis: overfitting — the model fits training data and fails to generalize; the gap points first at data (volume, quality, duplicates) rather than capacity (which is evidently sufficient). Order: (1) verify the pipeline — 10-batch overfit test, sanity of LR/loss; (2) audit split hygiene — dedup, temporal/entity split, preprocessing fit on train only (a big chunk of this gap is often leakage); (3) improve data: more examples, quality filters, label repair; (4) only then the regularization ladder: weight decay, dropout, augmentation, early stopping; (5) if capacity were in doubt, scaling runs — but 99% train acc says capacity is not the constraint. (i) Noise ceiling: (1-eta) + eta/K = 0.85 + 0.015 = 86.5% on noisy labels; irreducible H ≈ 0.692 nats (~1.00 bit) — beyond that, only cleaner labels help. (ii) N/(K n_k) = 1000/(2 x 10) = 50 (rare class weighted 50x vs 0.505 for the majority). (iii) Compute-optimal D ≈ 20N = 140B tokens for 7B params (C = 6ND: at fixed compute, params and tokens trade 1-for-1 — doubling N halves D). Augmentation cannot fix noise because transforms are label-preserving by assumption: they replicate corrupted labels too (and illegal transforms create new corruption) — the ceiling moves only when labels or data distribution change.',
          source: 'The standard applied-DL case question: diagnose, prioritize, compute the ceilings.',
        },
        summary: [
          'Read curves: both weak = underfit (capacity/LR); train high/val low = overfit (data first, reg second); val > train = expected under dropout/BN/aug.',
          'Prove 10-batch overfit before changing data or regularization — it isolates code/hyperparameter bugs.',
          'Noise ceiling: (1-eta)+eta/K accuracy, H ≈ 0.692 nats at eta=0.15/K=10 — some ceilings are arithmetic.',
          'Imbalance: print the majority baseline, report balanced metrics, weight loss by N/(K n_k).',
          'Compute allocation: C = 6ND trades params against tokens 1-for-1; D ≈ 20N is the compute-optimal anchor.',
        ],
      }),
      [
        [
          'Train 62% / val 60% (both weak) indicates:',
          ['Overfitting — add dropout', 'Underfitting — capacity/optimization problem', 'Data leakage', 'Metric bug'],
          1,
          'Both curves weak means the model has not learned the training data yet: fix LR/capacity/features — regularization would only widen the gap.',
        ],
        [
          'Under 15% symmetric label noise with 10 classes, the best achievable accuracy on the noisy labels is:',
          ['100%', '98.5%', '86.5%', '85%'],
          2,
          '(1-0.15) + 0.15/10 = 0.865 — a model can only score the true label 85% of the time plus its 1.5% chance of noise agreeing.',
        ],
        [
          'On 1000 samples with 10 minority / 990 majority, a constant majority predictor achieves:',
          ['10% accuracy', '50% accuracy', '99% accuracy with minority recall 100%', '99% accuracy with 50% balanced accuracy (minority recall 0)'],
          3,
          'The constant predictor scores 99% plain accuracy while balanced accuracy = (1.0 + 0.0)/2 = 50% — the pair that exposes the vanity metric.',
        ],
        [
          'At fixed compute C = 6ND, doubling parameters while keeping C fixed means:',
          ['Tokens available also double', 'Tokens are halved — the model becomes undertrained per parameter', 'Nothing changes', 'The learning rate must double'],
          1,
          'N x D is invariant at fixed C: double N, halve D. This is why Chinchilla-style recipes buy tokens instead of parameters.',
        ],
      ]
    ),
    lesson(
      M10,
      'dl-10-2',
      2,
      'Compression: Quantization, Distillation, and Pruning',
      'Post-training int8/int4 with a per-weight error bound you can compute, distillation as temperature-scaled KL, and pruning from magnitude sparsity to hardware N:M — plus the bandwidth arithmetic that makes compression change latency.',
      23,
      nineBlocks({
        objectives: [
          'Quantize and dequantize a tensor symmetrically and bound the per-weight error at s/2',
          'Compute memory and decode-bandwidth effects of fp32/fp16/int8/int4 representations',
          'Formulate temperature-scaled distillation loss with the T^2 gradient-scale correction',
          'Choose between unstructured, structured, and N:M pruning by the hardware that will run it',
        ],
        hook:
          'A 1.7B-parameter assistant needed 3.4 GB in fp16 — the phone target was under 1 GB. The winning recipe was not one trick: int4 weights (0.79 GiB), a distilled student trained from the original, and 2:4 structured sparsity on the accelerator that supported it. Compression is a stack of techniques, each with a number attached — and every number in this lesson is small enough to compute by hand before you run anything.',
        concept: `**Quantization: integers with a scale.** Symmetric per-tensor int8: pick s = max|w| / 127, map w -> q = clamp(round(w/s), -127, 127), dequantize with q x s. Rounding error per weight is at most s/2 — the whole accuracy question is how big s gets: per-OUTPUT-CHANNEL scales shrink s for outlier channels (a channel with max|w| = 2.0 no longer drags the whole tensor's s upward); per-group scales (groups of 128, GPTQ/AWQ style) shrink it further at the cost of one scale per group (fp16 scale per 128 weights = 1.56% storage overhead — 26.6 MB for 1.7B weights, negligible). ACTIVATIONS are harder: they have dynamic range and token outliers, so W8A8 schemes calibrate activation ranges (SmoothQuant migrates activation outliers into weights), while WEIGHT-ONLY formats (W4A16) keep activations fp16 and dequantize weights into fp16 GEMMs — the practical default for open models. Quality cliff: ~8-bit is usually lossless; ~4-bit with group scales + a little fine-tuning (or QAT — fake-quant in the training graph) stays within noise; below 4 bits expect visible degradation without QAT. Accuracy validation is ALWAYS task metrics (perplexity/accuracy delta vs fp16 baseline), never weight MSE.

**Distillation: transfer the distribution, not the labels.** Softmax at temperature T: p_i = exp(z_i/T) / sum — higher T flattens the distribution, exposing RELATIVE logits (the dark knowledge: "this image is 60% t-shirt, 30% pullover, 5% coat"). Loss: L = (1 - alpha) x CE(hard labels) + alpha x T^2 x KL(p_teacher^T || p_student^T). The T^2 factor compensates: softmax gradients scale as 1/T^2 at temperature T, so without it the soft term's gradients vanish as T grows and T becomes a noise knob instead of a sharpening knob. Why it works: the teacher's soft targets are a richer, lower-variance signal than one-hot labels — a small student trained on them beats the same student trained on labels alone (extra data need not be labeled — self-distillation from a bigger sibling).

**Pruning: remove weights, carefully.** Unstructured magnitude pruning: zero the smallest |w| (global or per-layer threshold) to a target sparsity (e.g., 90%); on dense kernels this buys NOTHING in wall-clock — memory only shrinks with sparse formats, and many stacks do not exploit them. STRUCTURED pruning removes whole channels/filters/attention heads → dense-but-narrower models that any kernel speeds up (measured speedup < theoretical because of fixed overheads and uneven layer sensitivity — prune iteratively: prune -> fine-tune -> re-evaluate, per layer). HARDWARE sparsity: N:M (2:4 = 2 nonzeros per 4-element group, 50%) is supported natively by Ampere+ tensor cores → ~2x math throughput with a post-training mask + brief fine-tune. The lottery-ticket finding: dense networks contain sparse subnetworks that, re-initialized, train to full accuracy alone — the theory behind why masks survive fine-tuning. Compose the stack: distill to a student, quantize the student, prune structured — each layer of the stack re-validated on the task metric.`,
        extras: [
          table(
            'Compression levers',
            ['Technique', 'Memory', 'Latency (typical)', 'Risk / requirement'],
            [
              ['fp16/bf16 (baseline)', '2 B/param', 'Baseline', 'Range/precision trade only'],
              ['int8 weight+act (W8A8)', '1 B/param + scales', 'Good (hardware int8)', 'Activation calibration; outlier handling'],
              ['int4 weight-only (W4A16)', '0.5 B/param + scales', 'Decode up to ~4x (bandwidth-bound)', 'Group scales; ~4-bit quality cliff'],
              ['Distillation', 'Smaller student', 'Follows student size', 'Teacher quality; training compute'],
              ['Unstructured 90% sparse', 'Storage w/ sparse fmt', '~No gain on dense kernels', 'Sparse kernel/hardware needed'],
              ['2:4 structured (N:M)', '2x math saving', '~2x on supported HW', 'Ampere+; fine-tune after masking'],
            ],
          ),
          code(
            `import torch
import torch.nn.functional as F

# ---- symmetric int8: quantize, dequantize, bound ----
def quant_symmetric(w, axis=None):
    if axis is None:                                   # per-tensor
        s = w.abs().max() / 127
    else:                                              # per-output-channel
        s = w.abs().amax(dim=axis, keepdim=True) / 127
    q = (w / s).round().clamp(-127, 127).to(torch.int8)
    return q, s

q, s = quant_symmetric(torch.randn(1024, 512))
w_hat = q.float() * s
print("s:", s.item(), "| error bound s/2:", (s / 2).item())
print("int8 bytes:", q.numel(), "vs fp32:", q.numel() * 4)

# ---- temperature-scaled distillation loss ----
def distill_loss(student_logits, teacher_logits, labels, T=4.0, alpha=0.7):
    soft = F.kl_div(F.log_softmax(student_logits / T, dim=-1),
                    F.log_softmax(teacher_logits / T, dim=-1),
                    reduction="batchmean") * (T * T)
    hard = F.cross_entropy(student_logits, labels)
    return (1 - alpha) * hard + alpha * soft

# ---- magnitude pruning to target sparsity ----
def prune_(model, sparsity=0.9):
    for name, p in model.named_parameters():
        if p.dim() >= 2 and "weight" in name:
            k = int(p.numel() * sparsity)
            thresh = torch.kthvalue(p.abs().flatten(), k).values
            p.masked_fill_(p.abs() < thresh, 0.0)      # fine-tune after this!`,
            'compression.py',
            'python',
          ),
          tip(
            'Validate compression on the task, not on weights',
            'Weight-space MSE says nothing about decision boundaries: a 4-bit tensor can look "close" and still flip the top-1 logit that matters. Always report task deltas vs the fp16 baseline — perplexity/accuracy/F1 — for every compression point you ship.',
          ),
          warn(
            'Unstructured sparsity is a storage feature, not a speed feature',
            '90% zeros on dense kernels runs at dense speed; memory saves only appear with sparse formats that many runtimes do not use. If latency is the goal, prune STRUCTURED (channels/heads) or use hardware-supported 2:4 — and measure end-to-end at the serving batch size, not a FLOPs calculator.',
          ),
        ],
        worked: {
          title: 'Bound an int8 quantizer, size an int4 model, and compute a distillation term',
          problem:
            'Weights with max|w| = 0.08 quantized symmetric int8. (a) Scale s, the per-weight error bound, and the dequantized value/error for w = 0.0313. (b) A 1.7B model in fp32/fp16/int8/int4 (GiB) plus per-128-group fp16 scale overhead for int4. (c) Distillation: teacher probs [0.9, 0.1], student probs [0.6, 0.4] — KL(teacher || student) in nats, and the scaled soft term at T = 4. (d) Compare the hard-label CE for the same student prediction. (e) Bandwidth: on 1,555 GB/s HBM, theoretical decode ceiling for 1.7B fp16 weights vs int4 — tokens/sec per stream (weights-only model), and the ratio.',
          steps: [
            {
              title: '(a) Scale and error bound',
              desc: 's = 0.08/127 = 6.299e-4; rounding puts every weight within s/2 = 3.15e-4 of its true value. For w = 0.0313: q = round(0.0313/6.299e-4) = round(49.69) = 50; dequantized = 50 x 6.299e-4 = 0.031496; error = 0.031496 - 0.0313 = 1.96e-4 — comfortably inside the 3.15e-4 bound. Per-channel scales would only shrink s further for this layer by removing cross-channel outlier influence.',
              code_snippet: 's = 6.299e-4 ; bound s/2 = 3.15e-4 ; w=0.0313 -> err 1.96e-4',
            },
            {
              title: '(b) Memory ladder',
              desc: 'fp32: 6.33 GiB; fp16: 3.17 GiB; int8: 1.58 GiB; int4: 0.79 GiB (weights only). Scales at group 128 in fp16: (1.7e9/128) x 2 B = 26.6 MB ≈ 0.025 GiB — 3% of the int4 payload, acceptable. int4 hits the under-1-GB phone budget that fp16 (3.17 GiB) missed; activations/KV remain fp16 — the budget that decides context length (module 10.3).',
              code_snippet: '6.33 / 3.17 / 1.58 / 0.79 GiB ; scales +0.025 GiB',
            },
            {
              title: '(c) KL and temperature scaling',
              desc: 'KL(p||q) = 0.9 ln(0.9/0.6) + 0.1 ln(0.1/0.4) = 0.9 ln 1.5 + 0.1 ln 0.25 = 0.9(0.40546) + 0.1(-1.38629) = 0.36492 - 0.13863 = 0.22629 nats. Scaled at T = 4: T^2 x KL = 16 x 0.22629 = 3.62 nats — the soft term dominates when alpha = 0.7, as intended: it is the richer signal (full distribution vs one hot).',
              code_snippet: 'KL = 0.22629 nats ; T^2 KL = 16 x 0.22629 = 3.62',
            },
            {
              title: '(d) Hard label for comparison',
              desc: 'CE = -ln(0.6) = 0.5108 nats for the one-hot truth. The teacher term carries the same target plus the runner-up structure (0.9 vs 0.6 margin AND the 0.1 vs 0.4 tail) — strictly more information per example at the cost of teacher inference. Note the asymmetry: KL is computed teacher-to-student (KL(p||q)), so the student is penalized for putting mass where the teacher puts none — never reverse the arguments.',
              code_snippet: 'hard CE = -ln 0.6 = 0.5108 nats (soft carries more)',
            },
            {
              title: '(e) Bandwidth ceiling',
              desc: 'Decode is weight-streaming bound: ceiling = HBM bandwidth / bytes-per-token-of-weights. fp16: 1.7e9 x 2 B = 3.4e9 B -> 1555/3.4 = 457 tok/s. int4: 1.7e9 x 0.5 B = 8.5e8 B -> 1555/0.85 = 1,829 tok/s. Ratio = 4.0x theoretical — real serving lands around 2.5-3.5x because KV reads, kernel launches, and sampling overheads occupy part of each step. The whole point of weight-only int4: decode is bandwidth-bound, so bytes/param IS tokens/sec.',
              code_snippet: 'fp16 457 tok/s ; int4 1829 tok/s ; 4.0x ceiling',
            },
          ],
          solution:
            '(a) s = 6.299e-4, bound 3.15e-4; w = 0.0313 -> q = 50 -> 0.031496 (error 1.96e-4). (b) 6.33/3.17/1.58/0.79 GiB; group scales +0.025 GiB. (c) KL = 0.2263 nats; T^2 KL = 3.62 at T = 4. (d) Hard CE = 0.5108 — the teacher distribution carries strictly more per-example information. (e) 457 vs 1,829 tok/s = 4.0x ceiling (2.5-3.5x in practice).',
        },
        practice: {
          title: 'Build the compression frontier for one model',
          prompt:
            'Take a fine-tuned classifier or small LM: (1) PTQ int8 (per-tensor vs per-channel) and int4 (group 128) — report task metric deltas vs fp16 and the exact memory table; (2) distill into a 4x-smaller student: sweep T in {1,2,4,8} and alpha in {0.3,0.5,0.7,0.9} — show why T=8 without enough alpha underperforms; (3) prune unstructured 50/80/90% and structured (channels) 25/50% — measure REAL latency at your serving batch size for each, and explain any zero speedup; (4) try 2:4 masking if hardware supports it; (5) compose two techniques (e.g., distilled student + int4) and verify the combined delta is not additive-worse; (6) present the frontier: quality vs memory vs latency with one recommended point per deployment target.',
          hint: 'For (3), unstructured pruning latency staying FLAT on dense kernels is the expected lesson, not a bug. For (2), watch the soft loss magnitude: T^2 matters — check gradient scales at T=8 with and without it.',
        },
        mistakes: [
          {
            mistake: 'Deriving scales from the whole tensor when channels differ wildly',
            fix: 'One outlier channel inflates per-tensor s and wastes int8 levels on every other channel. Use per-output-channel (int8) or per-group-128 (int4) scales; the storage overhead (~1.5% at group 128) buys most of the accuracy you were about to lose.',
          },
          {
            mistake: 'Dropping the T^2 factor in distillation',
            fix: 'Softmax gradients shrink ~1/T^2 as T rises; without T^2 the soft term fades toward zero at high temperatures and T acts like a mute. Keep L = (1-a) CE + a T^2 KL so temperature controls SHARPNESS, not magnitude.',
          },
          {
            mistake: 'Shipping unstructured sparsity as a latency win',
            fix: 'Dense kernels process zeros like any number — no speedup; memory savings need sparse formats most runtimes lack. For latency, prune channels/heads (structurally narrower) or use hardware N:M (2:4) — and benchmark end-to-end at serving batch sizes.',
          },
          {
            mistake: 'Compressing without a task-metric gate',
            fix: 'Weight MSE or even a single forward-pass smoke test hides boundary flips. Gate every compression point on the full eval set (perplexity/accuracy/F1 vs fp16), plus a regression golden set — compression bugs ship silently otherwise.',
          },
        ],
        exam: {
          question:
            'Describe post-training quantization: give the symmetric int8 procedure, derive the per-weight error bound in terms of the scale s, and explain per-channel and per-group scaling. Then formulate the distillation objective with temperature and justify the T^2 factor, and contrast unstructured, structured, and N:M pruning by the speedups each can actually deliver.',
          answer:
            'Symmetric int8: s = max|w|/127 (per tensor) — or per output channel / per group of 128; q = clamp(round(w/s), -127, 127); dequantize q x s. Error analysis: round() places q within 0.5 of w/s, so |w - q s| <= s/2 per weight — e.g., max|w| = 0.08 gives s = 6.30e-4 and bound 3.15e-4. Larger s (driven by outliers) means larger absolute error across the tensor, which is why per-channel/group scales localize the max and shrink effective s at the cost of storing scales (fp16 per 128 weights = 1.56% overhead). Activations need calibration (W8A8) or stay fp16 (weight-only W4A16, the common open-model recipe). Distillation: L = (1-alpha) CE(hard) + alpha T^2 KL(p_t^T || p_s^T) with softmax at temperature T; higher T flattens distributions and exposes relative logits (dark knowledge); gradients of the T-softmax scale as 1/T^2, so the T^2 multiplier keeps the soft-term magnitude constant — T becomes a sharpness control instead of a volume control. Validate on task metrics vs the fp16 baseline, never weight MSE. Pruning: unstructured magnitude sparsity saves memory only with sparse formats and runs at dense speed on normal kernels (~no latency gain); structured channel/head pruning produces genuinely smaller dense models → real (if sub-linear) speedups on any hardware; N:M (2:4) is hardware-supported on Ampere+ tensor cores → ~2x math throughput at 50% sparsity with brief fine-tuning after masking — prune iteratively, re-validating the task metric each round.',
          source: 'Deployment-heavy interview: "how would you get this model on a phone?" — numbers expected.',
        },
        summary: [
          'Symmetric int8: s = max|w|/127, error <= s/2; per-channel/group scales fight outliers cheaply.',
          'Memory ladder: 6.33 / 3.17 / 1.58 / 0.79 GiB for fp32/fp16/int8/int4 at 1.7B.',
          'Distillation: (1-a) CE + a T^2 KL(teacher||student); T^2 neutralizes the 1/T^2 gradient shrink.',
          'Pruning: unstructured = storage only; structured = real speedup; 2:4 = hardware 2x — measure end-to-end.',
          'Decode is bandwidth-bound: bytes/param IS tokens/sec — int4 gives a 4.0x theoretical ceiling.',
        ],
      }),
      [
        [
          'Symmetric int8 quantization with max|w| = 0.08 gives a per-weight error bound of:',
          ['0.08', '0.0063', '0.000315', '0.0063/2 only for outliers'],
          2,
          's = 0.08/127 = 6.299e-4; rounding guarantees error <= s/2 = 3.15e-4 for every weight in the tensor.',
        ],
        [
          'In L = (1-alpha) CE + alpha T^2 KL(p_t || p_s), the T^2 factor is needed because:',
          ['KL grows with T', 'Softmax gradients shrink approximately as 1/T^2 at temperature T — T^2 restores their magnitude', 'Cross-entropy is undefined at high T', 'It normalizes the batch size'],
          1,
          'Without T^2 the soft term silently fades as T rises; with it, temperature controls distribution sharpness rather than loss scale.',
        ],
        [
          '90% unstructured magnitude pruning typically delivers on a dense GPU kernel:',
          ['9x speedup', 'About 1x — zeros still cost dense compute; memory saves need sparse formats', 'A guaranteed 2x', 'An error — pruning cannot reach 90%'],
          1,
          'Dense kernels waste the sparsity: latency stays ~flat unless the stack exploits sparse storage — for speed, prune structured or use hardware 2:4.',
        ],
        [
          'Weight-only int4 improves decode speed mainly because decode is:',
          ['Compute-bound on prefill', 'Memory-bandwidth-bound — streaming fewer weight bytes per token raises tokens/sec', 'Latency-bound by sampling', 'Limited by attention FLOPs only'],
          1,
          'Each decode step streams the weights: ceiling = HBM bandwidth / bytes-per-token — 4.0x fewer bytes (fp16 -> int4) approaches 4.0x ceiling before overheads.',
        ],
      ]
    ),
    lesson(
      M10,
      'dl-10-3',
      3,
      'Serving and Evaluation in Practice',
      'TTFT versus TPOT and who is bound by what, the KV-cache budget formula, perplexity done comparably, contamination and judge bias in evaluation, and cost per million tokens with utilization honestly included.',
      22,
      nineBlocks({
        objectives: [
          'Decompose request latency into prefill and decode and classify each by its bottleneck',
          'Compute KV-cache memory for GQA and MHA configurations from first principles',
          'Design an evaluation suite resistant to contamination, batching artifacts, and judge bias',
          'Convert GPU economics into cost per million tokens at stated utilization',
        ],
        hook:
          'A team benchmarked their endpoint at "90 ms average latency" and shipped — then p99 hit 4 seconds under load and the product review went badly. The average hid queueing; the queueing hid batching; and their eval suite, it turned out, contained 5% of its test items in the training corpus. Evaluation and serving are where honest numbers are made or destroyed, and both fields run on arithmetic you already know.',
        concept: `**Latency has two regimes.** Every request = PREFILL (prompt processing: all prompt tokens in parallel — compute-bound, FLOPs dominated by attention's T^2 term; time-to-first-token TTFT is essentially prefill time plus queueing) and DECODE (one new token per step: sequential, memory-bandwidth-bound — stream weights + KV cache each step; tokens/second/sequence is the inverse of TPOT, time-per-output-token). End-to-end latency ≈ TTFT + (n-1) x TPOT (n = new tokens): interactive products optimize TTFT and TPOT p99; offline batch jobs optimize aggregate throughput (bigger batches amortize weight streaming: throughput rises with batch until memory/KV limits — but interactive latency pays queueing for it). SCHEDULING: static batching waits for the longest sequence (wasted slots); CONTINUOUS (in-flight) batching admits/retires sequences per step — near-full utilization at chat latencies — plus prefix caching (shared system prompts skip re-prefill), chunked prefill (mix long prompts into decode without stalling), and speculative decoding (module 8.3) for TPOT. Report p50/p95/p99 AND throughput at a stated concurrency — never a single mean.

**KV-cache budget (the constraint behind every context-length claim).** Bytes = B x L x T x n_kv_heads x d_head x 2 (K and V) x bytes_per_elem. Llama-class example: L = 32 layers, d_head = 128, n_kv = 8 (GQA — recall module 5.4), T = 4096, fp16: ONE sequence = 2 x 32 x 4096 x 8 x 128 x 2 B = 536,870,912 B = 0.5 GiB; B = 8 concurrent → 4.0 GiB (4.29 GB). Full MHA (n_kv = 32) → 4x that: 16.0 GiB (17.2 GB) — GQA's 4x saving, paid in a modest quality cost. KV grows LINEARLY in T and B: 32k context = 8x the T=4096 figure — which is why GQA, KV quantization (fp8/int8 KV), sliding-window attention, and paged KV (vLLM-style block management that kills fragmentation) are the serving stack's core, and why "supports 128k context" is a memory statement as much as a quality statement.

**Evaluation that survives contact with reality.** Layers: (1) OFFLINE held-out metrics — task metrics (accuracy/F1/PR-AUC), perplexity = exp(mean NLL) — but ppl is TOKENIZER-DEPENDENT (byte-BPE vs character models are not comparable — module 7.2's tokenizer is part of the metric); compare only within a tokenizer, or move to bits-per-byte/character for cross-model claims. (2) CONTAMINATION defense: measure n-gram overlap between train and test; with 5% contaminated items all memorized, a 70%-true model reports 0.95 x 70 + 0.05 x 100 = 71.5% — a free +1.5 points; decontaminate or switch test sets. (3) HUMAN/JUDGE preference — MT-Bench-style pairwise or rubric judging: LLM judges carry position bias (prefer the first/second answer — randomize order and average both), length bias (longer looks better — control or penalize), and self-preference (models favor their own style); calibrate the judge against a human-labeled subset (agreement %) before trusting it. (4) ONLINE A/B with guardrails (latency, safety, cost as non-inferiority gates) and rollback criteria. (5) PRODUCTION monitoring: golden-set regression in CI (a fine-tune may not move the suite), drift (input/embedding distribution), feedback loops (user edits become training data — filter them), safety/refusal suites re-run per release.

**Cost arithmetic.** Cost per 1M tokens = GPU $/hour x 3600 / (tokens/hour at stated utilization). Ideal: 2,000 tok/s → 7.2M tok/h → at $2.00/GPU-h: $0.278/M. At 70% utilization (batching reality, long prompts eating prefill): effective 1,400 tok/s → 5.04M/h → $0.397/M. Long prompts shift cost into prefill (compute) while long generations stream decode (bandwidth) — both billed in tokens, but they stress different bottlenecks; quote cost WITH the utilization assumption or the number is marketing.`,
        extras: [
          table(
            'Latency and eval vocabulary',
            ['Term', 'Definition', 'Trap'],
            [
              ['TTFT', 'Prompt arrival -> first token (prefill + queue)', 'Hides behind the mean; dominated by long prompts'],
              ['TPOT / ITL', 'Time per output token after the first', 'Batching raises throughput while worsening it'],
              ['p99 latency', '99th percentile end-to-end', 'Shipping "average latency" alone conceals tail explosions'],
              ['Perplexity', 'exp(mean NLL)', 'Tokenizer-dependent — never across tokenizers'],
              ['Balanced accuracy', '(recall_pos + recall_neg)/2', 'Plain accuracy lies on imbalanced sets'],
              ['Contamination', 'Test items present in training', 'Inflates scores; measure n-gram overlap'],
            ],
          ),
          code(
            `import time, statistics, math
import torch, torch.nn.functional as F

# ---- offline eval: perplexity from TOTAL NLL (not batch averages) ----
@torch.no_grad()
def perplexity(model, dl, pad_id=0):
    nll, tokens = 0.0, 0
    for input_ids, labels in dl:
        logits = model(input_ids.to("cuda"))
        nll += F.cross_entropy(logits.flatten(0, 1).float(),
                               labels.to("cuda").flatten(),
                               ignore_index=pad_id, reduction="sum").item()
        tokens += (labels != pad_id).sum().item()
    return math.exp(nll / tokens)          # tokenizer-dependent: compare like for like

# ---- latency percentiles at a stated concurrency ----
def bench(send_request, prompts, concurrency=8, n=500):
    ttfts, tpots = [], []
    for i in range(n):
        t0 = time.perf_counter()
        r = send_request(prompts[i % len(prompts)])
        first = time.perf_counter() - t0
        ttfts.append(first)
        tpots.append((time.perf_counter() - t0 - first) / max(r.n_new - 1, 1))
    pct = lambda xs, p: sorted(xs)[int(p * len(xs))]
    return dict(ttft_p50=pct(ttfts, 0.5), ttft_p99=pct(ttfts, 0.99),
                tpot_p50=pct(tpots, 0.5), tpot_p99=pct(tpots, 0.99),
                concurrency=concurrency)      # always report the load too

# ---- judge calibration: swap order, both directions ----
def judge_pair(prompt, ans_a, ans_b, judge):
    s1 = judge(prompt, ans_a, ans_b)      # A first
    s2 = judge(prompt, ans_b, ans_a)      # B first
    return s1, s2                          # disagreement -> position bias in action`,
            'serving_eval.py',
            'python',
          ),
          tip(
            'One tokenizer, one perplexity',
            'Perplexity = exp(mean NLL) is meaningful only for models sharing the tokenizer — a character model can "beat" a BPE model by tokenizing differently. For cross-model claims use bits-per-byte (cross-entropy / ln 2 per byte), the tokenizer-invariant metric from module 7.',
          ),
          warn(
            'Uncalibrated LLM judges are biased measuring instruments',
            'Position, length, and self-preference biases move win-rates by several points — enough to pick the wrong model in an A/B. Randomize order (score both directions), control length, and publish judge-human agreement on a labeled subset before any "model X beats Y" claim.',
          ),
        ],
        worked: {
          title: 'Decompose latency, budget the KV cache, and price the tokens',
          problem:
            'A chat endpoint: prefill 2,048 prompt tokens at 51,200 tok/s; decode 100 new tokens at 40 tok/s per sequence; serving model L = 32, d_head = 128, n_kv = 8 (GQA), fp16, T = 4096, batch 8. GPU: 1,555 GB/s HBM, $2.00/hour, sustained 2,000 tok/s at stated load. (a) TTFT, TPOT, and end-to-end latency for the request. (b) KV-cache bytes per sequence and for the batch; same batch with full MHA (n_kv = 32). (c) Mean NLL 2.3026 — perplexity; why it cannot be compared to a character-level model. (d) Cost per 1M tokens: ideal and at 70% utilization. (e) Eval contamination: 5% of test items in training, all memorized, true accuracy 70% — measured accuracy and inflation.',
          steps: [
            {
              title: '(a) Latency decomposition',
              desc: 'TTFT = prefill time = 2048/51,200 = 0.0400 s = 40.0 ms (compute-bound prefill). TPOT = 1/40 tok/s = 25 ms/token (decode, bandwidth-bound). End-to-end for 100 new tokens = TTFT + 99 x TPOT = 40 + 2,475 = 2,515 ms ≈ 2.52 s. The first token arrives at 40 ms (perceived instant), the tail of the answer streams at 25 ms/token — optimize each half separately: prefill kernels/batching for TTFT, KV/weights streaming and continuous batching for TPOT.',
              code_snippet: 'TTFT 40 ms | TPOT 25 ms | total 40 + 99x25 = 2,515 ms',
            },
            {
              title: '(b) KV-cache budget',
              desc: 'Per sequence: 2 (K,V) x 32 layers x 4096 T x 8 heads x 128 dim x 2 B(fp16) = 536,870,912 B = 0.5 GiB. Batch 8: 4.0 GiB (4.29 GB) — before weights and activations. Full MHA (n_kv = 32, 4x): 16.0 GiB (17.2 GB) for the same batch — GQA saved 12 GiB here, and at T = 32,768 every figure multiplies by 8 (GQA batch = 32 GiB). This is the arithmetic behind "context length x concurrency" capacity planning.',
              code_snippet: 'GQA: 0.5 GiB/seq, 4.0 GiB x8 ; MHA: 16.0 GiB x8',
            },
            {
              title: '(c) Perplexity',
              desc: 'PPL = exp(mean NLL) = exp(2.3026) = 10.00 — a model whose average next-token distribution gives the true token probability 1/10 behaves like a uniform 10-way guess on average. Comparability: PPL is per-TOKEN, and tokens differ across tokenizers (BPE merges vary; one model might get an easier segmentation) — report within-tokenizer only, or use bits-per-byte = mean NLL (nats) / ln 2 per byte for cross-family claims (module 7.2).',
              code_snippet: 'exp(2.3026) = 10.00 ; cross-tokenizer -> bits-per-byte',
            },
            {
              title: '(d) Cost per million tokens',
              desc: 'Ideal: 2,000 tok/s x 3600 = 7.2M tok/h → $2.00 / 7.2 = $0.278 per 1M tokens. At 70% utilization (queueing, prefill overhead, imperfect batching): effective 1,400 tok/s → 5.04M tok/h → $2.00/5.04 = $0.397/M. Quote the second number in capacity planning: utilization assumptions are the difference between a 43% cost error and an honest budget.',
              code_snippet: 'ideal $0.278/M ; at 70% util $0.397/M',
            },
            {
              title: '(e) Contamination inflation',
              desc: 'Measured = 0.95 x 70% + 0.05 x 100% = 66.5 + 5.0 = 71.5% — a free +1.5 points for nothing, and that is the OPTIMISTIC case (memorized items score perfectly; partially leaked sets inflate less but still move leaderboard positions). Defense: n-gram overlap scan between train and test, decontamination before splitting, sealed fresh test sets, and live A/B where contamination cannot help.',
              code_snippet: '0.95x70 + 0.05x100 = 71.5%  (+1.5 points for free)',
            },
          ],
          solution:
            '(a) TTFT 40 ms, TPOT 25 ms, total 2,515 ms. (b) GQA 0.5 GiB/seq, 4.0 GiB for batch 8; MHA 16.0 GiB — linear in B and T. (c) PPL = 10.00; tokenizer-dependent — use bits-per-byte across families. (d) $0.278/M ideal, $0.397/M at 70% utilization. (e) 71.5% measured (+1.5 inflated) — decontaminate and A/B.',
        },
        practice: {
          title: 'Benchmark and evaluate like a serving team',
          prompt:
            'Against any local or hosted model: (1) measure TTFT and TPOT p50/p95/p99 across 3 prompt lengths and concurrency 1/4/16 — show the throughput-vs-latency curve and where queueing starts; (2) compute the KV-cache table for your model/config at T = 1k/8k/32k and batch 1/8/32 — verify one cell with torch (allocate and measure); (3) report perplexity for two models WITH the same tokenizer, and bits-per-byte if tokenizers differ; (4) contamination audit: n-gram overlap your eval set against a public corpus (or your train split) and recompute a score after removing hits; (5) run a judge pairwise eval with order swapped — quantify position bias (disagreement rate) and calibrate against 20 human-labeled pairs; (6) write the cost model: tokens/hour at measured utilization, $/M, with the assumption sheet attached.',
          hint: 'For (1) expect TPOT to worsen with concurrency while aggregate tokens/s rises — that crossing IS the interactive/offline trade. For (5), disagreement above ~10% means the judge is measuring order, not quality.',
        },
        mistakes: [
          {
            mistake: 'Quoting mean latency without percentiles or load',
            fix: 'Means hide queueing tails; p99 at concurrency 8 is the user experience. Always publish p50/p95/p99 with the stated concurrency, prompt-length mix, and batch settings — otherwise the number is not reproducible and the tail is invisible.',
          },
          {
            mistake: 'Static batching for an interactive product',
            fix: 'Waiting for the slowest sequence in the batch inflates everyone\'s TPOT; continuous/in-flight batching retires finished sequences per step and keeps slots full. Interactive = continuous batching; offline throughput jobs = big static batches.',
          },
          {
            mistake: 'Comparing perplexities across tokenizers',
            fix: 'PPL is per-model-token: a tokenizer that merges more aggressively gets an easier denominator. Compare within one tokenizer, or convert to bits-per-byte (nats/byte / ln 2) — the only honest cross-family language-model comparison.',
          },
          {
            mistake: 'Trusting an LLM judge without order-swaps and calibration',
            fix: 'Position and length biases shift win-rates enough to reverse conclusions. Score both answer orders, control length, and report agreement with human labels on a subset — an uncalibrated judge is an instrument with unknown bias.',
          },
        ],
        exam: {
          question:
            'Define TTFT and TPOT, classify each by its computational bottleneck, and derive the end-to-end latency for a 100-token completion given prefill and decode rates. Give the KV-cache memory formula, compute it for a GQA configuration, and contrast with MHA. Finally, lay out an evaluation plan covering perplexity comparability, contamination, judge calibration, and cost per million tokens.',
          answer:
            'TTFT = time to first token = queueing + prefill; prefill processes all prompt tokens in parallel — compute-bound (attention T^2 grows quadratically with prompt length). TPOT = inter-token latency after the first = one decode step: sequential, memory-bandwidth-bound (stream weights + KV per token; batching amortizes weights but adds queueing). E2E = TTFT + (n-1) x TPOT: prefill 2,048 @ 51,200 tok/s = 40 ms; decode 40 tok/s → TPOT 25 ms; 100 tokens → 40 + 99 x 25 = 2,515 ms. KV cache bytes = B x L x T x n_kv x d_head x 2 x bytes/elem: L=32, T=4096, n_kv=8, d=128, fp16, B=1 → 2x32x4096x8x128x2 = 0.5 GiB; B=8 → 4.0 GiB; MHA (n_kv=32) → 4x = 16 GiB — linear in B and T, which is why GQA, KV quantization, sliding windows, and paged KV exist. Evaluation: (1) perplexity = exp(mean NLL) computed from total NLL/token counts (never batch-average) and only within a tokenizer (bits-per-byte across families); (2) contamination — n-gram overlap scan; 5% leaked + memorized turns 70% into 71.5%; (3) LLM judges — order both ways, control length, calibrate against human labels; (4) online A/B with latency/safety/cost guardrails and rollback rules; (5) cost = $/GPU-h x 3600 / tokens-at-stated-utilization: 2,000 tok/s → 7.2M tok/h → $0.278/M ideal, $0.397/M at 70% — quote the utilization or the price is fiction.',
          source: 'The systems-interview pairing: "explain your latency and defend your eval" — asked together at serving teams.',
        },
        summary: [
          'TTFT = compute-bound prefill (+ queueing); TPOT = bandwidth-bound decode; E2E = TTFT + (n-1) x TPOT.',
          'KV bytes = B x L x T x n_kv x d x 2 x bytes — linear in batch and context; GQA-8 example: 0.5 GiB/seq vs 4x for MHA.',
          'PPL = exp(mean NLL) from totals; tokenizer-dependent — cross-family claims use bits-per-byte.',
          'Contamination (5% leak = +1.5 pts) and judge bias (position/length/self) are measurable — measure them.',
          'Cost/M tokens = GPU$/h x 3600 / (tok/s x 3600 x utilization) — always state utilization.',
        ],
      }),
      [
        [
          'Decode (token-by-token generation) is primarily bound by:',
          ['Matrix-multiplication FLOPs', 'Memory bandwidth — streaming weights and KV cache per token', 'Disk I/O', 'CPU branch prediction'],
          1,
          'Each step reads the weights (and KV) to produce one token: bytes-per-token divided by HBM bandwidth is the throughput ceiling — exactly what int4/quantized KV attack.',
        ],
        [
          'A GQA model with L=32, T=4096, n_kv=8, d_head=128, batch 8, fp16 needs for the KV cache:',
          ['0.5 GiB', '4.0 GiB', '16.0 GiB', '32.0 GiB'],
          1,
          '2x32x4096x8x128 = 2^28 elements x2 B = 0.5 GiB per sequence; x8 batch = 4.0 GiB (MHA with 32 KV heads would be 16 GiB).',
        ],
        [
          'Perplexity values are directly comparable between models only when:',
          ['Both have the same parameter count', 'Both use the same tokenizer (otherwise use bits-per-byte)', 'Both are fp16', 'The batch sizes match'],
          1,
          'PPL = exp(mean NLL) is per model-token; tokenizers segment differently — cross-family comparison needs the tokenizer-invariant bits-per-byte.',
        ],
        [
          'The cost of 2,000 tok/s on a $2.00/GPU-hour device at 70% utilization is about:',
          ['$0.278 per 1M tokens', '$0.397 per 1M tokens', '$1.43 per 1M tokens', '$0.139 per 1M tokens'],
          1,
          'Effective 1,400 tok/s → 5.04M tok/h → 2.00/5.04 = $0.397/M — utilization assumptions belong in every price you quote.',
        ],
      ]
    ),
    lesson(
      M10,
      'dl-10-4',
      4,
      'CAPSTONE: Design an End-to-End Deep Learning System',
      'The full design doc — requirements to monitoring with every number attached — plus the frontier it must face: mixture-of-experts memory versus compute, RoPE and long-context KV growth, multimodal token spaces, and on-device int4 economics.',
      25,
      nineBlocks({
        objectives: [
          'Produce a complete system design: requirements, data, model, training, evaluation, serving, monitoring',
          'Compute serving budgets: tokens/day to GPU-hours to dollars with headroom',
          'Reason about MoE, long-context, and on-device trade-offs with concrete arithmetic',
          'Define quality/safety gates and rollback criteria before shipping anything',
        ],
        hook:
          'Every module of this course has been a section of one document. A design that says "fine-tune an LLM, evaluate with a judge, deploy on GPUs" is not a design — it is a wish. The capstone asks for the other kind: constraints with numbers (p99, $/M tokens, safety gate), data with provenance, an evaluation suite that has survived contamination checks, and monitoring that tells you when to roll back. The frontier architectures later in this lesson are new entries in the same document — same questions, different arithmetic.',
        concept: `**The design doc, in seven sections.** (1) REQUIREMENTS: task definition, quality bar vs a baseline (metric + minimum improvement + confidence), p99 latency, cost ceiling per 1M tokens or per request, safety/privacy constraints, and the rollback criteria you will accept BEFORE training. (2) DATA: sources with consent/licensing, dedup and quality filters (module 7.1 at your scale), labeling plan and agreement stats, split hygiene (time/entity, sealed test), PII handling. (3) MODEL: build vs fine-tune vs distill — the capacity-vs-data evidence from 10.1, parameter count against your D ≈ 20N compute view (7.3), quantization target chosen with 10.2 numbers, and a documented reason the frontier option (MoE, long context) was or was not chosen. (4) TRAINING: objective, schedule with LR/accumulation arithmetic (9.4), instrumentation from step 0 (grad-norm/LR/scale traces), checkpoint/resume policy, and budget (GPU-hours from the C = 6ND view). (5) EVALUATION: golden set (contamination-audited), task metrics with baselines, judge calibration if used, ablation plan (change one thing), safety/refusal suite, human spot-checks. (6) SERVING: endpoint shape from 10.3 — TTFT/TPOT targets, batching mode (continuous for interactive), KV budget at target context and concurrency, quantized weights, cost model at stated utilization, canary/rollback. (7) MONITORING: drift (input and output distributions), latency/cost dashboards, feedback capture (edited responses as noisy labels — filter before reuse), retraining triggers, incident runbook. Quality GATES: ship only if (a) metric >= bar with margin, (b) p99 and cost within budget, (c) safety suite passes, (d) golden set shows no regressions — four gates, any failure = no ship.

**The frontier, priced.** MIXTURE-OF-EXPERTS: total parameters large, ACTIVE per token fixed — 8-expert style model at 47B total / 13B active: weights (all loaded, fp16) = 47e9 x 2 B = 94 GB = 87.5 GiB (memory cost is TOTAL), while per-token compute tracks the active slice: 13/47 = 28% of a dense-47B's FLOPs. You pay memory for the whole routing table of experts and compute only for what you route — plus load-balancing aux losses (router collapse = hot expert = wasted capacity) and expert-parallel communication. LONG CONTEXT: rotary (RoPE) encodes relative position by rotation — extrapolation needs position remapping (position interpolation / NK/YaRN-style scaling) because attention scores were trained for seen relative distances; costs are arithmetic: KV grows linear in T (10.3: 4096 → 32,768 = 8x KV), attention FLOPs grow quadratically in T (5.4: 8x T = 64x the T^2 part) — hence sliding windows, chunked attention, sparse/linear attention research. MULTIMODAL: project patches/audio into the SAME token stream (connector + shared transformer) or keep modality-specific towers with alignment objectives (module 6.3); generation side: discrete tokens vs diffusion heads (8.4) — evaluation adds FID/CLIP-score plus preference, never replaces the human bar. ON-DEVICE: int4 weights (1.7B = 0.79 GiB) fit phones alongside activations and OS budget; but sustained throughput is thermal-bound and the CPU/NPU memory hierarchy punishes big KV — small context, aggressive caching, and distillation are the pattern; privacy/offline benefits are product features, not footnotes. The constants through ALL of it: data quality, honest evaluation, instrumentation, and cost accounting — this course, applied.`,
        extras: [
          table(
            'Capstone gate checklist',
            ['Gate', 'Evidence required', 'Failure action'],
            [
              ['Quality', 'Metric >= baseline + margin on sealed, decontaminated test', 'No ship; more data/iterations'],
              ['Latency', 'p50/p99 TTFT/TPOT at target concurrency', 'Re-batch, quantize, or shrink model'],
              ['Cost', '$/M (or $/request) at stated utilization <= budget', 'Cache, distill, renegotiate hardware'],
              ['Safety', 'Refusal/harm suite pass + human spot-check', 'Block release; retrain/re-align'],
              ['Regression', 'Golden set unchanged (CI run)', 'Rollback candidate; bisect the change'],
              ['Rollback plan', 'One-command revert, canary %, alert thresholds defined', 'Ship nothing without it'],
            ],
          ),
          code(
            `# ---- capstone budget sheet: requirements -> dollars ----
REQS = dict(requests_per_day=1_000_000, new_tokens_per_request=500,
            ttft_p95_ms=800, tpot_p95_ms=40, cost_per_1m_budget=0.60)

tokens_per_day = REQS["requests_per_day"] * REQS["new_tokens_per_request"]   # 5e8
tok_per_s_needed = tokens_per_day / 86_400                                   # 5,787 tok/s avg
gpu_tok_per_s = 2_000                                                         # measured, stated util
gpus = -(-tok_per_s_needed // gpu_tok_per_s)                                 # ceil -> 3
gpu_hours_per_day = gpus * 24
usd_per_day = gpu_hours_per_day * 2.00                                       # $2.00/GPU-h
usd_per_1m = usd_per_day / (tokens_per_day / 1e6)                            # $/M at that load
print(dict(tokens_per_day=tokens_per_day, gpus=int(gpus),
           usd_per_day=round(usd_per_day, 2), usd_per_1m=round(usd_per_1m, 3)))

# ---- MoE vs dense: memory TOTAL, compute ACTIVE ----
total, active = 47e9, 13e9
fp16_gib = total * 2 / 2**30          # 87.5 GiB loaded (all experts)
act_frac = active / total             # 0.277 -> ~28% of dense-47B FLOPs
print(fp16_gib, round(act_frac, 3))`,
            'capstone_budget.py',
            'python',
          ),
          tip(
            'Write the rollback criteria before the first training step',
            'Gates defined after results arrive are negotiation, not engineering. Fix the metric bar, p99, cost ceiling, safety pass, and the revert command in the design doc — then the ship decision is a checklist anyone can run.',
          ),
          warn(
            'Frontier architecture is not a requirement',
            'MoE buys compute-per-token at the price of memory, routing complexity, and serving machinery; 128k context buys retrieval breadth at the price of KV memory and quadratic attention. A distilled, quantized 7B fine-tuned on clean domain data beats a badly evaluated frontier model on every gate that matters — choose with arithmetic, not fashion.',
          ),
        ],
        worked: {
          title: 'Run the capstone budget: traffic, experts, context, and gates',
          problem:
            'Service: 1,000,000 requests/day, 500 new tokens each; measured 2,000 tok/s per GPU; $2.00/GPU-hour; budget $0.60 per 1M tokens. (a) Tokens/day, average tok/s required, GPUs (ceil), GPU-hours/day, $/day, $/1M — does it pass the budget? (b) Add 30% headroom — new $/day and $/1M. (c) Alternative model: MoE 47B total / 13B active — fp16 weight memory, active-compute fraction vs a dense 47B, and what memory/compute conclusion a designer draws. (d) Context 4,096 → 32,768 for the GQA serving config of 10.3 (per-sequence KV, batch 8): KV memory now, and the attention-FLOPs multiplier. (e) int4 on-device: 1.7B weights in GiB, and the four gates this phone build must pass.',
          steps: [
            {
              title: '(a) Traffic to dollars',
              desc: 'tokens/day = 1e6 x 500 = 5e8. Average rate = 5e8 / 86,400 = 5,787 tok/s. GPUs = ceil(5,787/2,000) = 3 (4 would idle ~43%, so provision 3 with autoscale to 4 at peaks). GPU-hours = 3 x 24 = 72 → $144/day at $2.00. $/1M = 144 / 500 = $0.288/M — passes the $0.60 budget with 52% margin (headroom you can spend on quality: better eval, more retries).',
              code_snippet: '5e8 tok/day ; 5,787 tok/s ; 3 GPUs ; $144/day ; $0.288/M OK',
            },
            {
              title: '(b) Headroom',
              desc: '+30%: 3.9 GPUs → provision 4 (round UP — you cannot rent 0.9 of a GPU), 96 GPU-h → $192/day; $/1M = 192/500 = $0.384/M — still inside $0.60. Alternatively keep 3 GPUs and accept queueing risk: the design doc must state which (headroom vs queueing p99) you chose and why; the p99 gate from 10.3 decides.',
              code_snippet: '4 GPUs : $192/day ; $0.384/M (budget $0.60 — passes)',
            },
            {
              title: '(c) MoE arithmetic',
              desc: 'Weights fp16: 47e9 x 2 B = 94e9 B = 87.5 GiB — ALL experts loaded (memory follows TOTAL params: needs tensor/expert parallelism, or int4 → 21.9 GiB, comparable to a dense 13-14B). Compute: active 13/47 = 0.277 → ~28% of dense-47B FLOPs per token — decode is bandwidth-bound (10.2) so the win shows up as fewer bytes streamed per token too, IF expert weights are fetched only when routed (irregular memory access is the systems tax). Conclusion: MoE = memory-heavy, compute-light per token — buy it when serving volume amortizes the machinery, not as a default.',
              code_snippet: '87.5 GiB fp16 (21.9 GiB int4) ; active 13/47 = 0.277 FLOPs',
            },
            {
              title: '(d) Context scaling',
              desc: 'T: 4096 → 32,768 = 8x. KV (linear): per-sequence 0.5 → 4.0 GiB; batch 8: 4.0 → 32.0 GiB (34.4 GB) — near the wall for an 80 GB card alongside weights and activations; mitigations from the lesson: GQA already applied, KV fp8/int8 (halve), sliding window (cap effective T), paged allocation (fragmentation). Attention FLOPs (quadratic): 8x T = 64x the T^2 term — prefill TTFT grows visibly; that is the true cost of "supports 32k".',
              code_snippet: '8x T : KV x8 (32 GiB/b8) ; attention FLOPs x64',
            },
            {
              title: '(e) Phone build + gates',
              desc: 'int4: 1.7e9 x 0.5 B = 8.5e8 B = 0.79 GiB of weights — fits a phone budget with activations/context in the remainder (and thermal limits cap sustained tok/s: bursty, cache-heavy design). Gates for shipping it: (1) quality — task metric >= baseline on the sealed, decontaminated set; (2) latency — p95 TTFT/TPOT on-device targets met under thermal steady state, not cold burst; (3) cost/UX — fits battery/memory budget (the mobile analogue of $/M); (4) safety + regression — on-device suite passes, golden set unchanged, one-command rollback via app channel.',
              code_snippet: '0.79 GiB int4 ; gates: quality, thermal p95, resource, safety/rollback',
            },
          ],
          solution:
            '(a) 5e8 tok/day, 5,787 tok/s, 3 GPUs, $144/day, $0.288/M — passes $0.60. (b) +30% → 4 GPUs, $192/day, $0.384/M — still passes. (c) MoE: 87.5 GiB fp16 weights (all experts) with 28% of dense-47B active FLOPs — memory-heavy, compute-light. (d) 8x context → 8x KV (32 GiB at batch 8) and 64x attention FLOPs — mitigate with KV quantization/sliding window/paging. (e) int4 = 0.79 GiB weights; ship only through the four gates: quality, thermal latency, resource budget, safety + rollback.',
        },
        practice: {
          title: 'Write and defend the capstone design',
          prompt:
            'Pick a real problem (campus document QA, code assistant, demand forecasting, medical-image triage — any domain). Deliver: (1) a design doc covering all seven sections with NUMBERS — quality bar vs baseline, p99, $/M at stated utilization, data provenance + split hygiene; (2) a scaled-down proof: fine-tune or prompt a small model, build a contamination-audited golden set, report task metrics + baselines + one ablation; (3) compress it (10.2): pick a quantization/distillation point on a measured quality-memory frontier; (4) a serving plan (10.3): batching mode, KV budget at your context/concurrency, TTFT/TPOT targets, cost sheet; (5) one frontier paragraph: you chose MoE / long-context RoPE / multimodal / on-device — or explicitly declined, with the arithmetic that decided it; (6) monitoring + rollback: dashboards, drift signals, gates, revert command. Be ready to defend every number.',
          hint: 'The strongest documents read as arithmetic chains: requirement -> measurement -> budget -> gate. If a number has no source (measured, cited, or derived), it is a wish — cut it or measure it.',
        },
        mistakes: [
          {
            mistake: 'Designing without pre-registered gates',
            fix: 'Bars set after seeing results are negotiation. Write metric bar, p99, cost ceiling, safety pass, and rollback command BEFORE training — then the ship call is mechanical and reviewable by anyone.',
          },
          {
            mistake: 'Quoting cost or latency without utilization and load',
            fix: '$/M at "ideal" throughput and mean latency at concurrency 1 both collapse under real traffic. State utilization, concurrency, prompt-length mix, and batching mode with every performance number — or the budget is fiction.',
          },
          {
            mistake: 'Adopting a frontier architecture to look current',
            fix: 'MoE doubles down on memory and serving complexity; 128k context multiplies KV and attention cost 8-32x. Quantify the requirement first (retrieval breadth? tokens/s?) — a distilled, quantized, well-evaluated small model usually wins the gates that matter.',
          },
          {
            mistake: 'Eval suite assembled the week before launch',
            fix: 'Contamination, judge bias, and missing baselines surface too late to fix cheaply. Build the golden set + baselines + judge calibration EARLY (module 7.1 decontaminate, 10.3 calibrate), run it in CI every change — the capstone is a continuous discipline, not a final exam.',
          },
        ],
        exam: {
          question:
            'Design an end-to-end deep learning system for a high-traffic text assistant: specify requirements (quality/latency/cost), data and split hygiene, model selection reasoning (including when NOT to use a frontier architecture), training instrumentation, evaluation suite, serving configuration, and monitoring with rollback. Include: traffic-to-dollars arithmetic for 1M requests/day at 500 tokens/request on 2,000 tok/s GPUs at $2/h; the MoE memory-vs-compute distinction for a 47B/13B-active model; and the KV/attention costs of going from 4k to 32k context.',
          answer:
            'Requirements: task + metric bar vs baseline with margin, p99 TTFT/TPOT at target concurrency, $/M ceiling at stated utilization, safety constraints, rollback criteria — all pre-registered. Data: consented sources, dedup/quality filters, labeling agreement, time/entity splits with a sealed decontaminated test set, PII handling. Model: capacity-vs-data evidence (10.1), compute view C = 6ND / D ≈ 20N (7.3), quantization target from 10.2 (e.g., int4 for decode bandwidth), and decline MoE/128k unless the arithmetic demands it — MoE 47B/13B-active loads 87.5 GiB fp16 (all experts = memory follows TOTAL) while per-token compute is 13/47 ≈ 28% of dense-47B: memory-heavy, compute-light, with routing/serving complexity as the tax; a distilled quantized 7B often clears the gates cheaper. Training: LR/accumulation schedule in optimizer steps, grad-norm/LR/scale traces from step 0, atomic full-state checkpoints, budgeted GPU-hours. Evaluation: golden set (contamination-audited — 5% leak can add +1.5 points), baselines, ablations, judge calibration with order-swaps if used, safety suite, CI regression. Serving: continuous batching for interactive use, KV budget = B x L x T x n_kv x d x 2 x bytes — 4k→32k is 8x KV (GQA batch 8: 4→32 GiB) and 64x attention FLOPs (T^2), mitigated by KV quantization, sliding windows, paged allocation; cost arithmetic: 5e8 tokens/day → 5,787 tok/s → 3 GPUs → $144/day → $0.288/M (4 GPUs at +30% headroom = $0.384/M), both under a $0.60/M budget. Monitoring: drift, latency/cost dashboards, feedback filtering, retraining triggers, canary + one-command rollback. Ship only through the four gates: quality, latency, cost, safety/golden-set — any failure blocks release.',
          source: 'The capstone question: identical to defending this course\'s final project in an architecture review.',
        },
        summary: [
          'Seven sections: requirements (pre-registered gates) -> data -> model -> training -> evaluation -> serving -> monitoring/rollback.',
          'Budget chain: 5e8 tok/day -> 5,787 tok/s -> 3 GPUs -> $144/day -> $0.288/M (4 GPUs w/ headroom = $0.384/M).',
          'MoE: memory follows TOTAL params (87.5 GiB fp16 at 47B), compute follows ACTIVE (13/47 ≈ 28%).',
          'Long context: KV x linear (8x at 32k), attention FLOPs x quadratic (64x) — pay in memory and TTFT.',
          'Ship through gates only: quality, p99, cost, safety + golden set — with a rollback command already written.',
        ],
      }),
      [
        [
          'A MoE model at 47B total / 13B active parameters:',
          ['Costs dense-47B compute per token', 'Loads ~87.5 GiB of fp16 weights (all experts) while running ~28% of dense-47B FLOPs per token', 'Uses 13B GiB of memory', 'Is always smaller than a dense 13B'],
          1,
          'Memory follows TOTAL (all experts resident: 47e9 x 2 B = 87.5 GiB); per-token compute follows the active slice (13/47 = 0.277) — memory-heavy, compute-light.',
        ],
        [
          'Going from 4,096 to 32,768 context (8x) multiplies the attention FLOPs by:',
          ['8x', '16x', '64x', '512x'],
          2,
          'Attention over T positions is quadratic in T: (8)^2 = 64x for the attention term — while the KV cache grows linearly (8x).',
        ],
        [
          'Serving 1M requests/day x 500 tokens at 2,000 tok/s per GPU ($2/h) requires about:',
          ['0.7 GPUs and $14/day', '3 GPUs and $144/day ($0.288/M tokens)', '30 GPUs and $1,440/day', '1 GPU and $48/day'],
          1,
          '5e8 tok/day -> 5,787 tok/s -> ceil to 3 GPUs -> 72 GPU-h -> $144/day -> $0.288 per 1M tokens.',
        ],
        [
          'The four ship gates for a capstone system are:',
          ['Accuracy, speed, hype, model size', 'Quality, latency, cost, and safety/golden-set regression (plus a written rollback)', 'Training loss, val loss, test loss, leaderboard', 'Model, data, GPU, cloud'],
          1,
          'Any failing gate blocks release; rollback criteria are written before training so the ship decision is a checklist, not a negotiation.',
        ],
      ]
    ),
  ],
};
