// Module 2 — Training Deep Networks: Optimizers, Schedules, and Stability
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code } from '../nineBlocks';
import { lesson, M2, COURSE_ID } from './helpers';

export const module2: CourseModule = {
  id: M2,
  course_id: COURSE_ID,
  title: 'Module 2 — Training Deep Networks: Optimizers, Schedules, and Stability',
  summary:
    'The optimizer ladder from SGD through momentum to Adam/AdamW and when plain SGD still wins, learning-rate schedules with warmup and their interaction with batch size, Xavier/He initialization that keeps signal variance alive across layers, batch normalization and dropout as training-time stabilizers, gradient clipping, and a concrete first-training-run recipe you can execute.',
  sort_order: 2,
  lessons: [
    lesson(
      M2,
      'dl-2-1',
      1,
      'Optimizers: From SGD to Momentum to Adam and AdamW',
      'The optimizer ladder in full — update equations with bias correction, why adaptivity helps and what it costs, and the evidence-backed cases where tuned plain SGD still beats Adam.',
      22,
      nineBlocks({
        objectives: [
          'Write the update equations for SGD+momentum, RMSProp, Adam, and AdamW and identify each term\'s role',
          'Explain the bias-correction terms in Adam and predict what happens without them',
          'Diagnose an optimizer choice problem: when Adam diverges on a problem SGD handles (and vice versa)',
          'State two concrete reasons tuned SGD + momentum can outperform Adam on large vision workloads',
        ],
        hook:
          'In the 2017 "Attention Is All You Need" paper, the transformer base model was trained with... Adam (beta1 = 0.9, beta2 = 0.98, warmup). Every LLM you have used since was trained with the same optimizer. Meanwhile the ImageNet-best vision recipes of the same era largely said SGD with momentum. Two fields, same decade, opposite defaults — and both choices are defensible. Knowing WHY each camp picked its weapon, and which one you should pick for your next training run, is the mark of someone who has trained models rather than only read about them.',
        concept: `**Vanilla SGD and its two ancient problems.** SGD\'s update w <- w - eta*g works but has two structural weaknesses: (1) it treats all gradients equally regardless of the parameter\'s history — on ravines it oscillates (Module 1.4); (2) it treats all parameters equally regardless of their gradient SCALES — a rarely-updated parameter and a constantly-firing one get the same step size eta, which is wrong when feature frequencies differ (they always do).

**Heavy-ball momentum** fixes problem (1): v <- beta*v + g, w <- w - eta*v, beta ~ 0.9. The velocity low-pass-filters gradient noise and accumulates consistent descent. Effective step in a steady gradient direction grows geometrically: after k steps of constant g, effective displacement ~ eta * g * (1 + beta + ... + beta^(k-1)) = eta*g*(1-beta^k)/(1-beta) — up to 1/(1-beta) = 10x amplification at beta = 0.9. This amplification is why lr and momentum interact: raising beta effectively raises lr.

**RMSProp fixes problem (2)**: maintain a running mean of squared gradients per parameter, v <- gamma*v + (1-gamma)*g^2, and step w <- w - eta * g / (sqrt(v) + eps). Parameters with historically huge gradients get divided down; consistently tiny-gradient parameters get divided up — per-coordinate preconditioning. Divide-by-RMS normalizes for the gradient\'s own scale (a diagonal, coordinate-wise cousin of natural gradient preconditioning — a useful interview gloss).

**Adam = momentum + RMSProp + bias correction.** m <- beta1*m + (1-beta1)*g (first moment — direction); v <- beta2*v + (1-beta2)*g^2 (second moment — scale); bias-corrected m-hat = m/(1-beta1^t), v-hat = v/(1-beta2^t); update w <- w - eta * m-hat / (sqrt(v-hat) + eps). Why bias correction: m and v start at zero; without correction, early steps use values shrunk by (1-beta1) and (1-beta2) respectively — with beta2 = 0.999, v is initially ~1000x too small, inflating effective steps wildly in the first moments. Correction divides by (1 - beta^t), which starts near 1/(1-beta) and converges to 1 as t grows — exactly compensating the cold-start. Defaults: beta1 = 0.9, beta2 = 0.999 (transformers often use 0.98), eta = 1e-3 or 3e-4, eps = 1e-8.

**The Adam costs and failure modes.** Memory: two extra scalars PER PARAMETER (m and v) — for a 7B model in fp32 that is 56GB of optimizer state before gradients and weights, the reason optimizers dominate training memory. Convergence folklore: Adam\'s adaptive steps can prevent sharp features from converging on some problems (the AMSGrad/rectified-Adam literature) — in practice: occasional loss plateaus or worse final loss than SGD at scale. And its noise response differs: Adam\'s normalized steps can amplify mini-batch noise in low-gradient regimes. On the flip side: it converges fast with little tuning, tolerates sparse/ noisy gradients beautifully (NLP from the start was Adam country), and needs less LR babysitting.

**AdamW: decoupled weight decay.** Classic L2 regularization adds lambda*w to the gradient; Adam then divides that term by sqrt(v_t), so each parameter gets a DIFFERENT effective decay than intended — parameters with large gradient magnitudes get their decay systematically distorted. Loshchilov & Hutter\'s fix (2019): apply decay directly to the weights, w <- w - eta*lambda*w, outside the adaptive update. Practical impact: cleaner hyperparameter semantics (weight_decay means what it says), better final accuracy at large scale — hence AdamW is now the default in every serious LLM recipe (PyTorch\'s AdamW, HF Trainer, LLaMA recipes).

**When plain SGD + momentum wins.** The vision camp\'s case: (1) isotropic noise — SGD\'s steps have the same scale in all coordinates; its implicit regularization biases toward flat minima that generalize well, while Adam\'s coordinate-wise preconditioning can warp the effective geometry and land in basins that fit train but transfer worse; (2) at large batch and carefully scheduled settings on clean, abundant data (ImageNet), SGD + momentum + cosine schedule + careful initialization remains competitive or superior after equal tuning effort; the ADAM SIDE concedes this for vision, and the SGD side concedes Adam for NLP/transformers where gradient scales vary wildly across parameters and sparse attention patterns. Decision rule: transformers/sequences/sparse → AdamW; large clean vision with tuning budget → try SGD+momentum; uncertain tabular/small nets → Adam, quickly, and check SGD as a sanity baseline.`,
        extras: [
          table(
            'Optimizer decision guide',
            ['Situation', 'Recommended optimizer', 'Why'],
            [
              ['Transformer / LLM / any sequence model', 'AdamW (beta1 0.9, beta2 0.98-0.999)', 'Per-coordinate adaptivity suits wildly varying gradient scales; standard in every recipe'],
              ['Large ImageNet-style CNN with tuning budget', 'SGD + momentum 0.9 (+ Nesterov option)', 'Isotropic noise + cosine schedule tends to generalize as well or better'],
              ['Sparse gradients (embeddings, huge vocab)', 'Adam/AdamW (or AdaGrad for very sparse)', 'Second-moment scaling lifts tiny-gradient coordinates'],
              ['Quick baseline / small MLP', 'Adam, lr 1e-3', 'Fast convergence with almost no tuning'],
              ['Reinforcement learning / very noisy gradients', 'Often Adam with clipped or high-eps settings', 'Noise tolerance; some fields add gradient clipping first'],
            ],
          ),
          code(
            `import torch.optim as optim

# The three recipes, as they appear in real code
sgd   = optim.SGD(model.parameters(), lr=0.1, momentum=0.9, nesterov=True, weight_decay=1e-4)
adam  = optim.Adam(model.parameters(), lr=1e-3, betas=(0.9, 0.999), eps=1e-8)
adamw = optim.AdamW(model.parameters(), lr=3e-4, betas=(0.9, 0.98),
                    weight_decay=0.1, eps=1e-8)     # LLM-style

# Bias correction, made visible (Adam internals)
for t in range(1, 4):                               # first three steps, beta2=0.999
    m = 0.9 * 0 + 0.1 * 1.0                         # first moment after 1 step (starts 0)
    v = 0.999 * 0 + 0.001 * 1.0
    mhat = m / (1 - 0.9 ** t)                       # corrects toward unbiased estimate
    vhat = v / (1 - 0.999 ** t)
    print(t, round(mhat, 4), round(vhat, 4))        # vhat starts ~1.0, not ~0.001`,
            'optimizer_recipes.py',
            'python',
          ),
          tip(
            'Match weight decay to optimizer semantics',
            'With AdamW, weight_decay typically 0.01-0.1 (LLM) or 1e-4-1e-2 (vision); with SGD, the same number lands in the gradient so effective decay differs. When porting a recipe between optimizers, retune lr AND decay — never carry numbers over unchanged.',
          ),
          warn(
            'Do not run Adam with weight decay on parameters that should not shrink',
            'Biases and normalization parameters are conventionally excluded from weight decay (filter groups in PyTorch: decay only 2D weights). AdamW with decay applied to biases is a subtle, silent quality leak.',
          ),
        ],
        worked: {
          title: 'Compute Adam\'s first two updates from scratch',
          problem:
            'One scalar parameter w = 0.0, true gradient g = 1.0 every step. Adam: lr = 0.001, beta1 = 0.9, beta2 = 0.999, eps negligible. (a) Step 1: compute m, v, bias-corrected m-hat, v-hat, and w1. (b) Step 2: same. (c) What would w1 have been WITHOUT bias correction, and why does the difference matter?',
          steps: [
            {
              title: 'Step 1 raw moments',
              desc: 'm1 = 0.9*0 + 0.1*1.0 = 0.1. v1 = 0.999*0 + 0.001*(1.0)^2 = 0.001. Both are shrunken because they started at zero.',
              code_snippet: 'm1 = 0.1;  v1 = 0.001',
            },
            {
              title: 'Step 1 bias correction',
              desc: 'm-hat = 0.1 / (1 - 0.9^1) = 0.1/0.1 = 1.0. v-hat = 0.001 / (1 - 0.999^1) = 0.001/0.001 = 1.0. The correction exactly un-shrinks the cold-start values.',
              code_snippet: 'mhat = 0.1 / 0.1 = 1.0\nvhat = 0.001 / 0.001 = 1.0',
            },
            {
              title: 'Step 1 update',
              desc: 'w1 = 0.0 - 0.001 * (1.0 / sqrt(1.0)) = -0.001. A clean full-size first step in the negative-gradient direction.',
              code_snippet: 'w1 = 0 - 0.001 * 1.0/sqrt(1.0) = -0.001',
            },
            {
              title: 'Step 2',
              desc: 'm2 = 0.9*0.1 + 0.1*1.0 = 0.19; v2 = 0.999*0.001 + 0.001*1 = 0.001999. m-hat = 0.19/(1-0.81) = 0.19/0.19 = 1.0; v-hat = 0.001999/(1-0.998001) = 0.001999/0.001999 = 1.0. w2 = -0.002. With constant gradient and full correction, steps are constant — as they should be at start.',
              code_snippet: 'mhat = 1.0;  vhat = 1.0;  w2 = -0.002',
            },
            {
              title: 'Without bias correction (contrast)',
              desc: 'Uncorrected step 1: 0.001 * 0.1 / sqrt(0.001) = 0.001 * 0.1/0.0316 = 0.00316 — actually LARGER here (v-hat\'s shrinkage dominated), and for larger beta2 (0.9999) the distortion flips and grows further: early steps become wildly eta-dependent on beta2. The point: uncorrected early dynamics are an arbitrary function of the hyperparameters rather than an estimate of the moment.',
              code_snippet: 'uncorrected: 0.001 * 0.1/sqrt(0.001) = 0.0032  (hyperparameter artifact)',
            },
          ],
          solution:
            'w1 = -0.001, w2 = -0.002 with bias correction; the raw moments started at 10% (m) and 0.1% (v) of their steady values, and correction divides by (1 - beta^t) to restore unbiased estimates early. Without correction the first steps are distorted by a factor that depends arbitrarily on beta1/beta2 and vanishes only as t grows — bias correction makes step 1 behave like step 1 should.',
        },
        practice: {
          title: 'Set up an optimizer bake-off properly',
          prompt:
            'Design a fair optimizer comparison for a 6-layer MLP on Fashion-MNIST: specify for each of SGD+momentum, Adam, AdamW — the lr grid you would tune, the schedule (must be identical across optimizers AFTER tuning), epochs, batch size, and the two statistics you would report beyond final accuracy (e.g., convergence speed at epoch 5, run-to-run variance over 3 seeds). Then state the one mistake that would invalidate the whole comparison.',
          hint: 'Each optimizer deserves its own lr grid (Adam\'s sweet spot is typically ~30-100x smaller than SGD\'s). Equalizing lr across optimizers is the classic invalidating mistake.',
        },
        mistakes: [
          {
            mistake: 'Using one learning rate for all optimizers in a comparison',
            fix: 'Adam\'s effective step size is normalized by gradient RMS; SGD\'s is not. The same numeric lr means completely different things. Tune lr per optimizer or the comparison measures mis-tuning.',
          },
          {
            mistake: 'Applying weight decay via L2-in-the-gradient when using Adam',
            fix: 'The decay gets divided by sqrt(v_t) per parameter, producing unintended per-parameter decay rates. Use AdamW (decoupled decay) with Adam — this is now a default, not an optimization.',
          },
          {
            mistake: 'Keeping Adam\'s default lr (1e-3) for a large-batch transformer run',
            fix: 'At scale, lr must be tuned jointly with batch size and warmup; transformer recipes typically run 3e-4 to 1e-4 with warmup and a decay schedule. Defaults from small-batch MLP landings do not transfer.',
          },
          {
            mistake: 'Ignoring optimizer state memory when sizing a training run',
            fix: 'AdamW holds two fp32 copies per parameter (m, v) — 8 bytes/param — plus weights and gradients. For big models this exceeds the weights themselves; plan checkpointing, sharding, or optimizer offloading accordingly.',
          },
        ],
        exam: {
          question:
            'Explain (a) the two components of Adam\'s update and the purpose of bias correction; (b) why AdamW replaced plain Adam + L2 in large-scale training.',
          answer:
            '(a) Adam maintains a first moment m (exponential moving average of gradients) providing momentum — smoothed direction — and a second moment v (EMA of squared gradients) providing per-parameter adaptive scaling: steps are m-hat/sqrt(v-hat), so coordinates with historically large gradients receive proportionally smaller steps and vice versa. Because m and v are initialised to zero, their early values are biased toward zero by factors (1-beta1^t) and (1-beta2^t); dividing by (1 - beta^t) produces unbiased estimates — critical since with beta2 = 0.999 the raw second moment starts ~1000x too small, which would distort early effective learning rates. (b) With L2 regularization the decay term lambda*w enters the gradient and is subsequently divided by sqrt(v_t), so each parameter receives a different, magnitude-dependent effective decay — the decay no longer means a constant shrinkage per step, harming hyperparameter transfer and final quality at scale. AdamW applies decay directly to weights (w <- w - eta*lambda*w) decoupled from the adaptive normalization, restoring intended semantics; empirical gains at scale made it the default in LLM training recipes.',
          source: 'Standard advanced DL/LLM-interview optimizer question; the AdamW justification is a favourite screening item since 2020.',
        },
        summary: [
          'SGD\'s two structural weaknesses — no history, no per-parameter scaling — are fixed by momentum and by RMS-type preconditioning respectively.',
          'Adam = first-moment momentum + second-moment scaling + bias correction; robust default for transformers and sparse/noisy gradients.',
          'Bias correction compensates zero initialisation of m and v: divide by (1 - beta^t) until the estimate warms up.',
          'AdamW decouples weight decay from the adaptive machinery — the fix that made Adam\'s regularization semantics honest at scale.',
          'Tuned SGD + momentum still contends on large clean vision data: isotropic noise and flat-minima bias can beat adaptivity.',
        ],
      }),
      [
        [
          'Adam maintains, per parameter, an exponential moving average of:',
          [
            'The weights and the loss',
            'The gradient (first moment) and the squared gradient (second moment)',
            'The batch size and the learning rate',
            'The validation accuracy and the training accuracy',
          ],
          1,
          'm tracks the gradient direction (momentum); v tracks gradient magnitude history (adaptive step scaling). Together they give direction plus per-coordinate preconditioning.',
        ],
        [
          'The purpose of Adam\'s bias-correction terms (1 - beta^t) is to:',
          [
            'Clip exploding gradients',
            'Compensate for m and v starting at zero, which would otherwise bias early updates',
            'Increase the effective learning rate over time',
            'Apply weight decay',
          ],
          1,
          'EMAs initialised at zero are systematically shrunk by (1 - beta^t) in early steps; dividing by that factor restores unbiased moment estimates, matters most for beta2 = 0.999 in the first hundreds of steps.',
        ],
        [
          'The main reason AdamW is preferred over Adam + L2 regularization is:',
          [
            'AdamW uses less memory',
            'L2-in-the-gradient decay gets distorted by Adam\'s per-parameter scaling; AdamW applies decay to weights directly, preserving intended semantics',
            'AdamW removes the need for a learning rate',
            'AdamW converges only on convex problems',
          ],
          1,
          'Under Adam, the decay term is divided by sqrt(v_t), giving each parameter a different effective decay rate. AdamW decouples decay from the adaptive update so weight_decay means a constant per-step shrinkage as intended.',
        ],
        [
          'Tuned SGD + momentum is often preferred for large ImageNet-style CNN training because:',
          [
            'SGD cannot overfit',
            'Its isotropic step noise biases toward flat minima that generalize well, matching or beating Adam after equal tuning',
            'Adam fails on convolutional layers',
            'SGD requires no learning rate',
          ],
          1,
          'The vision community\'s evidence: with proper schedules and tuning, SGD+momentum matches or exceeds Adam on large clean image data, plausibly due to uniform noise aiding generalization; Adam remains dominant for transformers and sparse/noisy regimes.',
        ],
      ]
    ),
    lesson(
      M2,
      'dl-2-2',
      2,
      'Learning-Rate Schedules and Warmup',
      'Cyclical, cosine, step, and inverse schedules; why transformers need linear warmup; the linear-scaling rule for batch size; and how schedule choice shapes the loss curve you actually see.',
      20,
      nineBlocks({
        objectives: [
          'Plot (from memory) five common LR schedules and name the training phase each suits',
          'Explain why warmup protects early training of adaptive optimizers on large models',
          'Apply the linear learning-rate scaling heuristic when doubling batch size, with its caveats',
          'Diagnose schedule-driven loss-curve shapes: warmup ramp, annealing plateau, and the end-of-training dip',
        ],
        hook:
          'There is a strange, repeatable phenomenon: train a transformer with a constant learning rate and you get a mediocre model; train the SAME model with a rate that climbs gently for a few thousand steps, holds near its peak through training, then decays smoothly to near zero — and you get a frontier-grade one. No weight, no data point, no architecture changed. Only the schedule of step sizes did. Learning rate is the single most influential hyperparameter in deep learning, and its SCHEDULE — how it moves over time — is the quiet second half of optimizer design.',
        concept: `**Why decay helps, in one sentence.** Early in training you are far from any good solution and want big steps to travel; late in training you are in a basin and want small steps to settle into its flat centre rather than bounce around its walls. Any schedule that is high-then-low respects this — which is why decay of some kind is nearly universal.

**The catalogue.** (1) STEP DECAY: lr *= gamma every N epochs (the classic ResNet recipe: divide by 10 at epochs 30/60/90). Simple, robust, produces the famous stair-step loss curve where each drop gives loss a visible renewed descent. (2) COSINE DECAY: lr(t) = lr_min + 0.5*(lr_max - lr_min)*(1 + cos(pi * t/T)) — smooth, long plateau near max then gentle fall; the modern default for vision and LLM fine-tuning, often to a final lr_min of 1-10% of peak (or near zero). (3) LINEAR DECAY: same start/end, straight line — used in BERT pretraining alongside polynomial decay. (4) EXPONENTIAL: lr = lr0 * gamma^t — constant rate of decay, common in RL and older work. (5) CYCLICAL / TRIANGULAR: lr oscillates between bounds over iterations (Smith, 2017) — the oscillation helps escape sharp minima and the rising phase can even replace warmup. (6) ONE-CYCLE (super-convergence): one big sweep up then down within a single epoch-sized cycle, with momentum inverted — lets you train far faster at high lr portions, a favourite of fastai. (7) CONSTANT: rare, small models only.

**Warmup: why the ramp exists.** In the first steps, Adam\'s second moment v is barely informed (bias correction helps but estimates are still noisy), gradients themselves are noisy because weights are far from any good region (huge, erratic gradients across layers), and layer-wise gradient scales are wildly mismatched after random init. A full-size lr from step 1 smashes the freshly initialized network — a few catastrophic steps can throw activations/normalizations into bad regimes that take forever to repair. Warmup — typically LINEAR from ~0 or 10% of peak to peak over 500-10,000 steps (GPT-3: 3,000; LLaMA-class: thousands) — lets the optimizer\'s moments and the network\'s layer statistics settle before full-strength steps apply. Empirical rule: warmup steps scale roughly with model size and batch size; bigger runs need longer warmup. Beyond a point (typically peak lr reached), the DECAY phase takes over.

**Interactions you must know.** (a) Batch size: larger batches give lower-variance gradients, so you can take bigger steps — the heuristic lr *proportional to* batch size (linear scaling rule, Goyal et al. 2017) holds roughly when also extending warmup proportionally and keeping the number of optimizer steps constant (i.e., training for fewer epochs). It BREAKS at extreme batch sizes (large-batch regime: beyond a critical point, generalization and speed both degrade — the "critical batch size" concept). (b) Epoch count: cosine schedules are defined over total steps; if you extend training, re-plan the curve rather than truncating a schedule mid-flight. (c) lr_min: decaying to near zero gives a clean "polish" phase; too-small lr_min wastes wall-clock, too-large leaves oscillation at the end. (d) Adam needs smaller peak lr than SGD (typically 10-100x) — schedules multiply the PEAK, so tune peak first, shape second.

**Reading a scheduled loss curve.** Warmup phase: loss may fall slowly or even wobble — this is normal, do not panic-interfere. Mid-training at peak lr: noisy but steadily falling. Post-decay: loss visibly smooths and drops again — if your curve does NOT show extra improvement when lr decays, something is wrong (lr too low throughout, or the model already converged and the schedule was pointless). The end-of-run dip before evaluation is a genuine effect of the final annealing phase, and why "the last checkpoint wins" in properly scheduled runs.`,
        extras: [
          table(
            'Schedule selection',
            ['Schedule', 'Formula gist', 'Where it is standard'],
            [
              ['Step decay', 'Multiply by 0.1 every N epochs', 'Classic ResNet/CNN vision recipes'],
              ['Cosine', 'Half-cosine from peak to lr_min over total steps', 'Modern CNNs, LLaMA/GPT fine-tuning, most 2020s recipes'],
              ['Linear decay', 'Straight line peak -> 0', 'BERT pretraining, many fine-tune scripts'],
              ['Linear warmup + constant', 'Ramp then flat', 'Early/legacy transformer runs, some RL'],
              ['One-cycle / cyclical', 'Up-sweep then down-sweep within a cycle', 'Super-convergence, fastai, short budgets'],
            ],
          ),
          code(
            `import math

def cosine_lr(step, total, peak=3e-4, warmup=2000, min_lr=3e-5):
    if step < warmup:                       # linear warmup phase
        return peak * (step + 1) / warmup
    if step >= total:
        return min_lr
    progress = (step - warmup) / (total - warmup)   # 0 -> 1 after warmup
    return min_lr + 0.5 * (peak - min_lr) * (1 + math.cos(math.pi * progress))

# Typical LLM-style invocation (linear warmup, cosine decay)
# scheduler = get_cosine_schedule_with_warmup(
#     optimizer, num_warmup_steps=2000, num_training_steps=200000)

# Linear scaling rule: batch 256 -> 1024 (x4)?
old_lr, old_bs, new_bs = 0.1, 256, 1024
new_lr = old_lr * (new_bs / old_bs)         # 0.4  (and x4 warmup steps)
# LARS/LAMB style large-batch recipes do exactly this, then verify empirically.`,
            'schedules.py',
            'python',
          ),
          tip(
            'Log the lr every step, not just every epoch',
            'A one-line lr value in your training log confirms the scheduler actually stepped (a missing scheduler.step() call runs constant lr forever — one of the most common silent training bugs). Plot lr beside loss; the two curves should tell one coherent story.',
          ),
          warn(
            'Retune peak lr when you change ANYTHING upstream',
            'Different batch size, model width, initialization, optimizer, or dataset scale shifts the optimal peak lr. Schedules are multipliers on a peak you must re-establish — copying a recipe\'s shape without re-tuning its peak is the most common failed reproduction.',
          ),
        ],
        worked: {
          title: 'Compute cosine + warmup lr at four points of a run',
          problem:
            'LLM fine-tuning run: peak lr = 3e-4, warmup = 2,000 steps, total = 20,000 steps, min lr = 3e-5, cosine decay after warmup. Compute the learning rate at steps 0, 1,000, 10,000, and 20,000.',
          steps: [
            {
              title: 'Step 0 (first warmup step)',
              desc: 'Linear warmup: lr = 3e-4 * (0 + 1)/2000 = 1.5e-7. Essentially zero — the network barely moves while gradients and Adam moments are wildest.',
              code_snippet: '3e-4 * (0+1)/2000 = 1.5e-7',
            },
            {
              title: 'Step 1,000 (mid-warmup)',
              desc: 'lr = 3e-4 * 1001/2000 = 1.5e-4 — halfway to peak. Linear ramp, no decay terms yet.',
              code_snippet: '3e-4 * 1001/2000 = 1.5e-4',
            },
            {
              title: 'Step 10,000 (mid-run, cosine phase)',
              desc: 'Warmup done; progress = (10000-2000)/(20000-2000) = 8000/18000 = 0.444. cos(pi*0.444) = cos(80 deg) = 0.174. lr = 3e-5 + 0.5*(3e-4 - 3e-5)*(1 + 0.174) = 3e-5 + 0.5*2.7e-4*1.174 = 3e-5 + 1.58e-4 = 1.88e-4.',
              code_snippet: 'progress = 0.444;  cos(pi*0.444) ≈ 0.174\nlr = 3e-5 + 0.5*2.7e-4*1.174 ≈ 1.88e-4',
            },
            {
              title: 'Step 20,000 (end)',
              desc: 'Step >= total: lr = min_lr = 3e-5 (schedule floors here). The model has spent the last thousands of steps in tiny annealing steps, polishing into the flat centre of its basin.',
              code_snippet: 'end of run: lr = 3e-5 (min_lr)',
            },
          ],
          solution:
            'lr(0) = 1.5e-7, lr(1000) = 1.5e-4, lr(10000) ≈ 1.88e-4, lr(20000) = 3e-5. The curve: near-zero start (warmup protection), linear climb to 3e-4 at step 2,000, long cosine glide down to a floor 10% of peak. Notice peak lr occurs at 10% of the run — the "hot" phase is early, the long tail is refinement.',
        },
        practice: {
          title: 'Predict, then verify, a schedule\'s loss curve',
          prompt:
            'Before running anything: sketch (in words or on paper) the loss curve you expect from: (a) constant lr 0.1 with no schedule for 50 epochs; (b) warmup 5 epochs + cosine decay to near zero. State at which points each curve should look noisy vs smooth. Then train a small CNN on CIFAR-10 with each (use PyTorch OneCycleLR or a cosine scheduler) and compare reality to prediction — write two sentences on any divergence.',
          hint: 'Expect (a): fast early fall, then noisy plateau with oscillation that never fully settles. Expect (b): gentler start, noisy middle, visibly smoother/lower tail after decay begins.',
        },
        mistakes: [
          {
            mistake: 'Decaying the learning rate but not the weight decay (or vice versa)',
            fix: 'When schedules shrink lr, effective per-step decay (eta * lambda) shrinks too — sometimes intended, sometimes not. LLM recipes often keep decay OFF during training and apply it explicitly, or rescale lambda. Decide deliberately and document it.',
          },
          {
            mistake: 'Adding warmup to a small model "because recipes have it"',
            fix: 'Warmup protects LARGE, freshly-initialized, adaptive-optimizer runs. A tiny MLP with Adam at 1e-3 trains fine from step 1. Warmup costs steps; add it when gradient instability is real, not by cargo cult.',
          },
          {
            mistake: 'Applying linear LR scaling to batch size far past the critical batch size',
            fix: 'Linear scaling holds in the small-batch regime; beyond the critical batch size, larger batches yield diminishing gradient noise reduction while generalization and wall-clock efficiency degrade. Verify with a batch-size sweep rather than trusting the rule.',
          },
          {
            mistake: 'Changing total epochs without re-planning a step-defined schedule',
            fix: 'Step decay keyed to "every 30 epochs" simply never fires if you train for 20; cosine defined over 100k steps anneals too early if you extend to 200k. Schedules are defined over a training HORIZON — rebuild them when the horizon moves.',
          },
        ],
        exam: {
          question:
            'Why do large transformer models use linear warmup followed by cosine or linear decay, instead of a constant learning rate? Answer in terms of optimizer state and loss-landscape position.',
          answer:
            'Early training combines three instabilities: (1) Adam\'s moment estimates m, v begin at zero and are noisy for the first thousands of steps, so per-parameter scaling is unreliable; (2) gradients at random initialization are large and inconsistent layer-to-layer, and a full-strength first step can push activations and normalization statistics into bad regimes from which recovery is slow; (3) the loss surface far from a basin has steep, ill-conditioned directions where large steps risk divergence. Warmup ramps the rate so moments and layer statistics settle before peak steps — empirically required for stable large runs (GPT/BERT recipes all include it). After the peak, decay serves the complementary need: near a good basin, smaller steps reduce oscillation, allow the optimizer to settle into flat minima that generalize better, and the final low-lr phase effectively polishes the solution — hence constant-rate runs typically end with higher, noisier loss than properly annealed ones.',
          source: 'Common advanced DL exam/interview question on transformer training; also appears in LLM-training screening rounds.',
        },
        summary: [
          'Big steps early (travel), small steps late (settle) — every useful schedule encodes that asymmetry.',
          'Step, cosine, linear, cyclical, and one-cycle are the standard shapes; cosine + linear warmup dominates 2020s recipes.',
          'Warmup shields early training: cold Adam moments, wild gradients, fresh initialization — ramp before peak.',
          'Linear LR scaling with batch size works only in the small-batch regime; large batches add warmup and require empirical checks.',
          'Always log lr next to loss — a silently dead scheduler is a silent constant-lr run.',
        ],
      }),
      [
        [
          'The primary reason large transformer training runs use a linear warmup phase is to:',
          [
            'Save GPU memory in early steps',
            'Let Adam\'s moment estimates and the fresh random initialization settle before applying peak step sizes',
            'Increase the number of optimizer steps',
            'Make the cosine schedule possible',
          ],
          1,
          'Cold optimizer moments plus large, erratic gradients at init make full-size early steps destabilizing; warmup ramps gradually so state settles first.',
        ],
        [
          'Under a standard cosine schedule with warmup, the learning rate peaks:',
          [
            'At the very first step',
            'At the end of the warmup phase, then decays smoothly to lr_min',
            'Halfway through warmup',
            'It stays constant after warmup',
          ],
          1,
          'Linear warmup climbs to peak lr exactly when warmup ends; from there the cosine half-wave decays to the minimum over the remaining steps.',
        ],
        [
          'The linear scaling rule for batch size states that when you multiply the batch size by k you should roughly:',
          [
            'Divide the learning rate by k',
            'Multiply the learning rate by k, extend warmup proportionally, and verify beyond the critical batch size',
            'Halve the number of epochs and keep lr fixed',
            'Switch to full-batch gradient descent',
          ],
          1,
          'Larger batches reduce gradient noise, so larger steps can be taken (lr * k) with proportionally longer warmup and constant step count — but the rule fails past the critical batch size where further noise reduction stops helping.',
        ],
        [
          'A loss curve that becomes visibly smoother and drops again right after the LR decay begins indicates:',
          [
            'A bug — decay should not change the loss',
            'Healthy annealing: smaller steps are settling the model into the flat centre of a basin',
            'The dataset was shuffled incorrectly',
            'Overfitting has started',
          ],
          1,
          'The polish phase is real: reduced step size stops bouncing around the basin walls, averaging the weights into flatter regions — a properly scheduled run shows exactly this end-of-training improvement.',
        ],
      ]
    ),
    lesson(
      M2,
      'dl-2-3',
      3,
      'Initialization and Batch Normalization',
      'Xavier and He initialization derived from variance arguments, why broken init kills deep networks before training starts, and batch normalization\'s moving-statistics machinery that keeps every layer\'s inputs in a trainable regime.',
      22,
      nineBlocks({
        objectives: [
          'Derive the variance-preservation condition for a layer and select Xavier vs He init from a layer\'s activation',
          'Predict the failure signature of zero-init, too-large-init, and symmetric-init configurations',
          'Explain batch normalization\'s train-time vs inference-time behaviour, including the running-statistics update',
          'Compare batch norm against layer norm and identify which one transformers use and why',
        ],
        hook:
          'Two identical networks, same data, same optimizer, same learning rate. One trains to 95%. The other, differing only in how its weights were randomized in the first millisecond of its existence, shows 10% loss that never moves. Initialization is the first thing training does and the most neglected: get it wrong and no optimizer choice, schedule, or architecture can rescue the run. Batch normalization — the second topic of this lesson — was the 2015 technique that made deep networks forgiving enough to train robustly, and its train/inference split is a bug source engineers still trip over years into their careers.',
        concept: `**Why variance matters: the signal-propagation argument.** Consider a layer a^{l} = f(W^{l} a^{l-1}) with n_in inputs, each of variance Var(a) ~ 1 (rough assumption), and weights drawn i.i.d. with mean 0 and variance Var(w). Then Var(sum_j w_j a_j) = n_in * Var(w) * Var(a). If Var(w) = 1/n_in, output variance stays ~1 — the signal NEITHER explodes nor vanishes as it travels forward. This is the whole game: choose Var(w) so that variance stays O(1) layer after layer, for the ACTUAL activation distribution the layer sees.

**Xavier/Glorot init** derives Var(w) = 1/n_in for sigmoid/tanh networks — equivalently 2/(n_in + n_out) (the average of fan-in and fan-out versions) — designed so signals and their gradients flow with roughly constant variance through linear+squash layers. It assumes activations are approximately zero-centred with unit-ish scale — true near init for tanh, NOT true for ReLU, whose outputs are strictly non-negative (mean ~0.5 of units active, variance halved-ish before correction).

**He/Kaiming init** adjusts for ReLU: ReLU zeroes half the units, halving the signal — so He doubles the variance: Var(w) = 2/n_in. That single factor of 2 is the difference between a ReLU network that trains from step one and one whose deep layers receive ever-thinner signals. PyTorch defaults: nn.Linear defaults to Kaiming-uniform-ish (actually the "fan-in, uniform, +/- 1/sqrt(fan_in)" scheme), conv layers use kaiming_normal_ in vision recipes. Rule of thumb: ReLU-family layers -> He; tanh/sigmoid layers -> Xavier; transformer linear layers inside pre-norm blocks -> default scaled init or He with appropriate gain (the GPT-3 paper famously scaled remaining weights by 1/sqrt(N_layers) — an acknowledgement that init interacts with depth).

**The three classic init sins.** (1) ALL-ZERO init: every neuron computes the SAME function; gradients are identical across units; symmetry never breaks; the whole layer collapses to one redundant detector. (2) TOO-LARGE init: pre-activations saturate immediately (sigmoid) or activations grow exponentially with depth (any), gradients explode or vanish before step 1; symptom: loss = log(num_classes) forever or NaN. (3) FORGETTING the gain: using Xavier on a deep ReLU stack — symptoms include dead-layer behaviour in early/late layers and slow, sad convergence. Also relevant: biases usually init to 0 (or small constants for dead-ReLU mitigation, e.g. 0.01), and output layers often get their own smaller init.

**Batch normalization, the mechanism.** For a mini-batch B with per-feature mean mu_B and variance sigma^2_B, BN computes x-hat = (x - mu_B)/sqrt(sigma^2_B + eps), then y = gamma * x-hat + beta (learnable scale and shift — so the layer can undo normalization if the task wants it). Two conceptual jobs: (a) it keeps each layer\'s inputs in a well-scaled regime regardless of how the previous layer\'s weights drift during training — a kind of per-layer, per-batch stabilizer; (b) (the more defensible modern view) it mildly smooths the loss surface by normalizing scale directions — small-batch gradient noise is reduced in directions of high curvature, enabling higher learning rates and faster convergence. Batch size interacts: BN statistics from batch 1 are the batch itself (degenerate) — hence BN is avoided at batch size 1 (or replaced with GroupNorm/sync-BN in distributed training).

**Train vs inference — the bug you will hit.** During TRAINING, mu_B and sigma^2_B come from the current mini-batch, and each is ALSO blended into running averages (running_mean, running_var, momentum ~0.1 in PyTorch terms) used later. During EVALUATION/INFERENCE, batches may be size 1, so BN uses the accumulated running statistics instead — deterministic, batch-independent. Failure symptoms: model eval-mode metrics look nothing like train-mode? Check you called model.eval() / model.train() correctly. Freeze BN layers (requires_grad=False + eval mode) when fine-tuning on small batches — otherwise running stats get destroyed by tiny-batch noise. In transfer learning (Module 3), frozen-backbone BN layers must stay in eval mode even while other layers train.

**Layer norm and why transformers use it.** LayerNorm normalizes across the FEATURES of a single example (not across the batch), so it has no running statistics, works at batch size 1, and is batch-independent — exactly what variable-length sequence models (transformers) need, since batches pad/aggregate heterogeneous sequences. Modern transformers are "pre-norm" (LN before the sublayer: x + Sublayer(LN(x))), which trains more stably at depth than the original post-norm. If you remember one mapping: CNNs -> BatchNorm; transformers -> LayerNorm (pre-norm). RNNs had LayerNorm/other variants too. Choosing the wrong normalizer for the data layout is a real, findable bug.`,
        extras: [
          table(
            'Init and normalization selection',
            ['Layer / model', 'Use', 'Reason'],
            [
              ['Linear/conv with ReLU-family', 'He init (Var = 2/fan_in)', 'Compensates ReLU zeroing half the signal'],
              ['Linear/conv with tanh/sigmoid', 'Xavier/Glorot (Var = 2/(fan_in+fan_out))', 'Assumes centered saturating activations'],
              ['CNN stacks (ResNet era)', 'BatchNorm layers + He init', 'Per-batch feature standardization; batch available and large'],
              ['Transformer blocks', 'Pre-norm LayerNorm (+ scaled residual init)', 'Batch-independent; stable at depth; variable-length batches'],
              ['Batch size 1 / small-batch fine-tune', 'LayerNorm / GroupNorm, or freeze BN stats', 'BN statistics are unreliable at tiny batch sizes'],
            ],
          ),
          code(
            `import torch, torch.nn as nn

# Initialization: the variance argument made runnable
def report(layer, name):
    w = layer.weight.data
    print(name, "var =", round(w.var().item(), 4),
          "target(he) =", round(2 / w.shape[1], 4))

lin_relu = nn.Linear(512, 512)
nn.init.kaiming_normal_(lin_relu.weight, nonlinearity='relu')   # He: Var = 2/fan_in
report(lin_relu, "He init   ")

lin_tanh = nn.Linear(512, 512)
nn.init.xavier_normal_(lin_tanh.weight)                          # Xavier: Var = 2/(fan_in+fan_out)
report(lin_tanh, "Xavier    ")

# BatchNorm: train vs inference behaviour
bn = nn.BatchNorm1d(64)
bn.train()
x = torch.randn(32, 64) * 7 + 3          # badly scaled batch
y = bn(x)
print("train: batch mean ~0, var ~1 ->", y.mean().item(), y.var().item())
print("running_mean captured:", bn.running_mean.abs().mean().item())
bn.eval()                                 # <-- THE switch people forget
z = bn(torch.randn(1, 64) * 7 + 3)        # size-1 batch now works via running stats`,
            'init_and_bn.py',
            'python',
          ),
          tip(
            'Log weight std per layer at step 0',
            'One line at initialization: for each parameter, print std. Healthy: roughly sqrt(2/fan_in)-ish for He layers, decaying sensibly at the output. Identical zeros (symmetry), huge stds (explosion), or vanishingly small values (bad gain) — all caught before wasting a single epoch.',
          ),
          warn(
            'Fine-tuning with BN is a classic silent quality leak',
            'When you freeze a backbone but leave BN layers in train() mode, their running statistics keep updating on your small downstream batch statistics — corrupting features for the whole model. Freeze properly: put the backbone in eval() mode and requires_grad=False on BN parameters.',
          ),
        ],
        worked: {
          title: 'Compute the right init variance for two layer shapes',
          problem:
            'A ReLU layer maps 1024 -> 256 (a typical transformer MLP inner expansion reversed). (a) Compute He init std for its weights. (b) Assume incoming activations have variance 1; what is the variance of the pre-activation with He init vs with Xavier-on-ReLU (Xavier Var = 2/(1024+256))? (c) A 50-layer stack of ReLU layers each using Xavier: what happens to variance after 50 layers (approximate: each ReLU + xavier combo gives ~0.5x per layer)?',
          steps: [
            {
              title: 'He std for 1024 -> 256',
              desc: 'He Var = 2/fan_in = 2/1024 = 0.001953; std = sqrt(0.001953) = 0.0442. PyTorch would draw weights ~ N(0, 0.0442^2).',
              code_snippet: 'var = 2/1024 = 0.001953;  std = 0.0442',
            },
            {
              title: 'Pre-activation variance with He',
              desc: 'Var(sum) = fan_in * Var(w) * Var(a) = 1024 * (2/1024) * 1 = 2. ReLU then halves (zeros negatives): post-ReLU variance ~ O(1) — healthy, stable across depth.',
              code_snippet: '1024 * (2/1024) * 1 = 2 (pre-ReLU); ReLU centers it back to ~O(1)',
            },
            {
              title: 'Pre-activation variance with Xavier on ReLU',
              desc: 'Var(w) = 2/1280 = 0.001563. Var(sum) = 1024 * 0.001563 * 1 = 1.6 — close, BUT Xavier assumes centered activations; ReLU outputs are non-centered, and in deep stacks the mismatch compounds: each layer feeds a shifted, slightly attenuated distribution.',
              code_snippet: '1024 * 2/1280 = 1.6 (naive), mismatch grows with depth',
            },
            {
              title: 'Fifty-layer stack with the naive ~0.5x rule',
              desc: 'Variance after 50 layers ~ 0.5^50 = 8.9e-16 — signal has vanished to numerical noise; gradients flowing backward through the same chain vanish identically. With He, the per-layer factor stays ~1 and variance remains O(1) at any depth. This single arithmetic fact explains the 2015-era "deep nets just won\'t train" complaints.',
              code_snippet: '0.5^50 ≈ 8.9e-16  (vanished)   vs   1^50 = 1  (He, healthy)',
            },
          ],
          solution:
            'He std = 0.0442 for a 1024-in ReLU layer, keeping variance O(1) across depth; Xavier-on-ReLU attenuates by roughly half per layer in this approximation, compounding to ~1e-15 over 50 layers — total signal death. Init is not a detail; it is the difference between a trainable and an untrainable network, before a single gradient step.',
        },
        practice: {
          title: 'Run the init ablation',
          prompt:
            'Train the same 12-layer MLP (tanh and ReLU versions) on a standard dataset under four inits: zeros, uniform U(-1,1), Xavier, He. For each, record: loss at step 0, loss after 10 epochs, and the per-layer activation std logged at step 0 and after 1 epoch. Write a four-row table of symptoms and diagnose each failure in one sentence.',
          hint: 'Zeros -> symmetry collapse (all units identical). U(-1,1) -> exploding pre-activations with depth. Xavier on ReLU -> attenuated signal. He -> healthy. Check your act_std logs to confirm each story.',
        },
        mistakes: [
          {
            mistake: 'Forgetting model.eval()/model.train() around BN layers',
            fix: 'Train mode uses batch statistics and updates running stats; eval uses running stats only. Metrics computed without the right mode give wildly different (and invalid) numbers — set the mode explicitly in both training loops and evaluation.',
          },
          {
            mistake: 'Keeping BN active while fine-tuning with small batches',
            fix: 'Tiny batches produce noisy statistics; worse, they OVERWRITE the pretrained running stats. Freeze: backbone in eval mode, BN params requires_grad=False — or convert BN to Layer/GroupNorm for small-batch work.',
          },
          {
            mistake: 'Using Xavier everywhere by default',
            fix: 'Xavier is tuned for centered saturating activations. ReLU-family layers want He (Var = 2/fan_in); transformer blocks want their scaled init variants. Match init to activation and depth, per layer type.',
          },
          {
            mistake: 'Assuming batch norm reduces the model\'s internal covariate shift as its main modern explanation',
            fix: 'The original ICIR-shift story is contested; the more accepted mechanism is that BN smooths/scales the optimization landscape, permitting larger learning rates and faster convergence. If asked in an exam, state the mechanism honestly with both the original and modern views.',
          },
        ],
        exam: {
          question:
            'Compare Batch Normalization and Layer Normalization: formulas (conceptually), what statistics they use, inference behaviour, and which architecture each is standard for — with reasons.',
          answer:
            'BatchNorm normalizes each feature across the mini-batch: x-hat = (x - mu_B)/sqrt(sigma_B^2 + eps) with mu_B, sigma_B computed over batch samples; it also learns per-feature gamma, beta and maintains running mean/variance for INFERENCE, where batch statistics are replaced by the running estimates (hence train()/eval() mode switching). LayerNorm normalizes the features of ONE sample across its feature dimension: no batch statistics, no running averages, identical behaviour in train and inference, and it works at batch size 1. Architecture fit: BN assumes large homogeneous batches of fixed-shape data — standard in CNNs (ResNet etc.), where batches of images are large and stats are stable; LN is batch-independent and suits variable-length, padded sequence batches — standard in transformers (originally post-norm, now typically pre-norm: x + Sublayer(LN(x)) for depth-stability). Failure cases follow: BN degenerates at batch size 1 and under distribution shift between batches; LN at large batch does not exploit cross-sample statistics but needs none.',
          source: 'A near-certain question in advanced DL courses and a standard LLM-engineering interview discriminator.',
        },
        summary: [
          'Init solves one equation: keep activation (and gradient) variance O(1) through every layer — Xavier for centered saturating activations, He for ReLU-family (Var = 2/fan_in).',
          'Zero init breaks symmetry; oversized init explodes signals — both fail before training even begins.',
          'BatchNorm standardizes each feature over the mini-batch, learns scale/shift, and swaps to running statistics at inference.',
          'Wrong train/eval mode — especially while fine-tuning — silently corrupts BN behaviour; it is one of the most common applied bugs.',
          'Transformers use pre-norm LayerNorm because it is batch-independent, works at batch size 1, and trains more stably at depth.',
        ],
      }),
      [
        [
          'He (Kaiming) initialization for a ReLU layer with fan_in = 512 sets the weight variance to:',
          ['1/512', '2/512', '1/1024', '512'],
          1,
          'He init uses Var = 2/fan_in to compensate for ReLU zeroing out roughly half the signal: 2/512 = 0.0039.',
        ],
        [
          'Initialising ALL weights of a hidden layer to exactly zero causes:',
          [
            'Faster convergence',
            'All neurons to learn identical functions — symmetry never breaks',
            'The loss to be zero at step 0',
            'Exploding gradients only',
          ],
          1,
          'Identical weights give identical outputs and gradients, so every unit stays identical forever — the layer collapses to a single redundant detector. Randomness breaks this symmetry.',
        ],
        [
          'At inference time, a BatchNorm layer computes its output using:',
          [
            'The statistics of the test batch',
            'The running mean/variance accumulated during training (when in eval mode)',
            'Random noise for robustness',
            'LayerNorm instead',
          ],
          1,
          'Eval mode uses stored running statistics so results are deterministic and valid at batch size 1; train mode uses per-batch statistics AND updates those running estimates.',
        ],
        [
          'Transformers use LayerNorm rather than BatchNorm mainly because:',
          [
            'LayerNorm is faster on all hardware',
            'LayerNorm needs no batch statistics: it normalizes per sample, working at batch size 1 and across variable-length padded sequences',
            'BatchNorm cannot be backpropagated',
            'LayerNorm has no parameters',
          ],
          1,
          'Sequence batches are heterogeneous and often tiny (batch 1 at inference); per-sample normalization avoids batch-statistics fragility entirely. LayerNorm does have learnable gamma/beta — the last option is wrong too.',
        ],
      ]
    ),
    lesson(
      M2,
      'dl-2-4',
      4,
      'Regularization on the Rails: Dropout, Clipping, and a First-Run Recipe',
      'Dropout as ensemble learning with an inverted-scale twist, gradient clipping\'s norm math, weight decay\'s role, and a concrete, numbered first-training-run checklist you can follow on any new model.',
      22,
      nineBlocks({
        objectives: [
          'Explain dropout\'s train/inference asymmetry and the inverted scaling trick mathematically',
          'Compute global-norm gradient clipping and predict when clipping is essential vs harmful',
          'Choose among dropout, weight decay, early stopping, and data augmentation for a given overfitting scenario',
          'Execute a first-training-run recipe: baseline, sanity overfit, monitoring, then one change at a time',
        ],
        hook:
          'The most dangerous phase of any training project is run number one. Not because the code is hard — because everything is wrong at once and you do not yet know which wrongness matters. Veterans separate from beginners at this moment: the beginner changes five hyperparameters, gets a better loss, and cannot say which change did it. The veteran first proves the model CAN memorize one batch (so the pipeline works), then establishes a boring baseline (so there is something to beat), then changes ONE thing per run with the loss curve as judge. This lesson hands you that playbook, plus the two classic regularizers — dropout and clipping — it depends on.',
        concept: `**Dropout: training an ensemble by deletion.** Dropout(p) randomly zeroes each activation with probability p during TRAINING (p = 0.5 classic for hidden layers, 0.1-0.3 for transformer feed-forward blocks). Each batch, a different random sub-network is trained. The ensemble intuition (Srivastava et al. 2014): at inference you effectively average the predictions of exponentially many thinned networks — a model whose members are forced to be individually competent rather than co-adapted. The mechanism in practice: with random deletions, no unit can rely on any specific co-worker, spreading and robustifying representations — an information-bottleneck-ish regularizer that hurts training accuracy while improving test accuracy.

**The inverted scaling trick.** During training, kept activations are NOT rescaled — y = x * m where m ~ Bernoulli(1-p). Expected output at inference should match the train-time expectation: E[dropout output] = (1-p)*x. Two equivalent fixes: (1) inverted dropout (PyTorch default): scale kept activations by 1/(1-p) during TRAINING, so train and test have matching expectations; (2) scale at inference instead. PyTorch nn.Dropout does (1) — hence nothing changes at eval, a property beginners often misread as "dropout is off now, obviously" (it is — but only because scaling already happened). Rule: dropout is a TRAIN-time regularizer; ALWAYS call model.eval() (or disable dropout modules) for inference and validation, or your validation numbers will be garbage from the added noise.

**Where dropout belongs in 2026.** Residual connections + LayerNorm + good init already regularize transformers substantially, so modern LLMs often use LITTLE or NO dropout in core blocks (GPT-3/LLaMA recipes: 0 or 0.1 on embeddings), relying on massive data and weight decay instead. CNNs still like dropout in classifier heads; RNNs liked variational (same mask across time) dropout. The general lesson: dropout is one tool among many, and stacking every regularizer usually over-regularizes — you can drive train accuracy down for no test gain.

**Gradient clipping: the fuse on exploding gradients.** Backprop\'s multiplied chains sometimes yield a step with enormous norm (a bad batch, a loss spike, mixed-precision instability). Global-norm clipping: if ||g||_total > max_norm, scale ALL gradients by max_norm / ||g||_total — preserving direction, capping magnitude. Per-value clipping (torch.nn.utils.clip_grad_value_) instead clamps each element independently — simpler but distorts direction; global-norm (the default in transformers) is standard. Typical max_norm for transformers: 1.0. When clipping is essential: training RNNs on long sequences (the historic exploding-gradient problem), mixed-precision runs with occasional loss spikes, RL with high-variance returns. When it can mask bugs: if EVERY step is clipped 100% of the time, your real problem is upstream (lr too high, bad init, broken loss) — clip and then INVESTIGATE the clip rate; a healthy run clips rarely (log the fraction of clipped steps!).

**Weight decay vs dropout vs early stopping vs augmentation.** Weight decay (L2/AdamW decay) shrinks weights toward zero each step — simpler functions, the default backbone of regularization in modern training (typically 0.01-0.1 for LLMs, 1e-4 for SGD vision). Early stopping halts when validation stops improving — free but wastes the tail of your schedule. Data augmentation (images: flips/crops/color jitter; text: back-translation/paraphrase) adds effective data — usually the highest-leverage regularizer when you have raw data but few labels. Dropout: architectural noise, most useful where data is small and models are wide MLP-ish. Choosing: small vision dataset -> augmentation + weight decay first; small tabular -> weight decay + early stopping, dropout in dense heads; huge pretraining -> weight decay (often no dropout); noisy small-nlp -> dropout 0.1-0.3 + weight decay.

**The first-training-run recipe (follow it literally).** 1) Unit-test the data path: one batch through the model, check shapes and label alignment. 2) OVERFIT ONE BATCH: set aside a single batch, train until loss ~ 0 — if you cannot drive one batch to near-zero, your pipeline (loss, labels, lr, model wiring) is broken; do not proceed. 3) Baseline run: default-ish config, modest budget, full logging (train loss, val loss, lr, grad norm, activation stds, time/step). 4) Read the curves: is val loss falling? Plateauing? Overfitting? Adjust ONE thing — lr first (it dominates), then schedule, then regularization. 5) Only after a healthy baseline: sweep (batch size, decay, dropout, width) one axis at a time or with a small grid. 6) Keep a run table: config hash, seed, final metrics — every number in your report must trace to a row. This discipline, more than any hyperparameter, is what makes training reproducible rather than lucky.`,
        extras: [
          table(
            'Regularization chooser',
            ['Symptom', 'First lever', 'Second lever'],
            [
              ['Train acc >> val acc, images raw', 'Strong augmentation', 'Weight decay up, dropout in head'],
              ['Train acc >> val acc, no aug possible', 'Weight decay + early stopping', 'Dropout 0.1-0.3; smaller model'],
              ['Loss spikes / NaN mid-training', 'Gradient clipping (max_norm 1.0)', 'Lower lr, check mixed-precision loss scaling'],
              ['Small tabular dataset, overfits fast', 'Weight decay + early stopping', 'Dropout in dense layers; simpler features'],
              ['LLM fine-tune, small data', 'Weight decay 0.1 + 3 epochs max', 'Dropout 0-0.1 (often none needed)'],
              ['RNN exploding gradients', 'Clip grad norm 1.0-5.0', 'Gradient checkpointing; truncate BPTT length'],
            ],
          ),
          code(
            `import torch
import torch.nn as nn

# Dropout: train/inference asymmetry with inverted scaling
drop = nn.Dropout(p=0.5)
drop.train()
x = torch.ones(8)
y = drop(x)            # ~half zeros; kept values stay as-is
                         # EXPECTATION matches eval: E[y] = 0.5 * x = x * (1-p)
                         # (PyTorch scales kept activations by 1/(1-p) internally)
drop.eval()
z = drop(torch.ones(8)) # z = all ones: dropout off at inference

# Gradient clipping, global norm — the transformer standard
model, opt = nn.Linear(64, 64), torch.optim.AdamW(nn.Linear(64, 64).parameters(), lr=3e-4)
opt.zero_grad()
loss = (model(torch.randn(32, 64)) ** 2).mean()
loss.backward()
before = torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
print("grad norm before clip:", round(before.item(), 3),
      "-> clipped!" if before > 1.0 else "-> untouched")

# First-run sanity check: overfit a single batch
xb, yb = next(iter(train_loader))       # ONE batch
for _ in range(200):
    opt.zero_grad()
    criterion(model(xb), yb).backward()
    opt.step()                          # loss should approach 0 — if not, debug NOW`,
            'dropout_clip_first_run.py',
            'python',
          ),
          tip(
            'Log three vital signs every N steps',
            'Train loss (obviously), global grad norm (clipping health, divergence early-warning), and lr (schedule confirmation). Grad norm is the ECG of backprop: a slow climb warns of instability long before loss moves; a spike tells you exactly which batch broke — inspect it.',
          ),
          warn(
            'Validation with dropout still on is a classic silent error',
            'Dropout at eval injects noise: your val metric jitters and reads pessimistically, and early stopping fires at the wrong epoch. One line — model.eval() under torch.no_grad() — prevents weeks of confusing numbers.',
          ),
        ],
        worked: {
          title: 'Compute inverted dropout by hand, then decide a clipping policy',
          problem:
            'A layer output is x = [2.0, 4.0, 6.0, 8.0], dropout p = 0.5. (a) With PyTorch\'s inverted dropout, the mask m = [1, 0, 1, 1] is sampled; compute the train-time output. (b) Show that E[train output] = eval output (the layer output with dropout disabled). (c) A backward pass yields per-parameter gradient norms [3.0, 4.0, 12.0] (three params). With global max_norm = 5.0, compute the post-clip gradients for the third parameter, and state the clip fraction applied.',
          steps: [
            {
              title: 'Inverted dropout forward',
              desc: 'Keep scale = 1/(1-p) = 1/0.5 = 2. Apply mask: [2, 4, 6, 8] * [1, 0, 1, 1] = [2, 0, 6, 8], then scale: [4, 0, 12, 16]. (This is the train-time output.)',
              code_snippet: 'keep_scale = 1/(1-0.5) = 2.0\nout = [2,0,6,8] * 2 = [4, 0, 12, 16]',
            },
            {
              title: 'Expectation check',
              desc: 'Each unit survives with prob 0.5, and survivors are doubled: E[out_i] = 0.5 * (2 * x_i) + 0.5 * 0 = x_i. Eval output (dropout off) = [2, 4, 6, 8]. Expectations match — no test-time rescaling needed, which is exactly why inverted dropout is PyTorch\'s default.',
              code_snippet: 'E[out_i] = 0.5 * 2 * x_i = x_i  ==  eval output',
            },
            {
              title: 'Gradient clipping arithmetic',
              desc: 'Global norm = sqrt(3^2 + 4^2 + 12^2) = sqrt(9 + 16 + 144) = sqrt(169) = 13.0. Scale factor = max_norm / norm = 5.0 / 13.0 = 0.3846.',
              code_snippet: 'norm = sqrt(9+16+144) = 13.0;  scale = 5/13 = 0.3846',
            },
            {
              title: 'Apply the scale to all grads (direction preserved)',
              desc: 'g1: 3.0 * 0.3846 = 1.154; g2: 4.0 * 0.3846 = 1.538; g3: 12.0 * 0.3846 = 4.615 (<= 5, and global norm exactly 5). Uniform scaling keeps the update DIRECTION identical — only magnitude is capped.',
              code_snippet: 'g3 = 12 * 0.3846 = 4.615   (global norm now = 5.0)',
            },
          ],
          solution:
            'Train output = [4, 0, 12, 16], whose expectation equals the eval output [2, 4, 6, 8] — the inverted-scale trick makes train/inference consistent without post-hoc changes. Clipping: global norm 13 with cap 5 applies a uniform 0.3846 factor to every gradient (g3: 12 -> 4.615), preserving direction while capping magnitude. Note the diagnostic: a run where clipping fires on every step is telling you something upstream is wrong.',
        },
        practice: {
          title: 'Build your first-run harness',
          prompt:
            'Write (pseudocode or PyTorch) a training harness that: (1) runs the one-batch overfit test and aborts if loss fails to drop below 0.1× initial after 300 steps; (2) logs train loss, val loss, lr, grad norm, and clip fraction every N steps to CSV; (3) stops with early stopping after 10 epochs without val improvement. Then state which single hyperparameter you would tune first on the first real run, and why.',
          hint: 'The overfit gate catches wiring bugs; grad-norm/clip-fraction logging catches instability; early stopping protects the budget. First knob: learning rate — it dominates everything else.',
        },
        mistakes: [
          {
            mistake: 'Leaving dropout active during validation or inference',
            fix: 'call model.eval() (and model.train() back before the next training epoch). Silent metric corruption from train/eval mode mixups is one of the most frequent applied-DL bugs — make mode-setting part of your loop skeleton.',
          },
          {
            mistake: 'Stacking maximum dropout + maximum weight decay + heavy augmentation on every run',
            fix: 'Over-regularization starves the model: training accuracy collapses, and you cannot tell which lever caused it. Regularize in response to a MEASURED generalization gap, one lever at a time, watching both train and val curves.',
          },
          {
            mistake: 'Using clipping to hide a diverging loss curve',
            fix: 'If clip fraction is ~100% every step, the update direction may be fine but your lr/loss/precision pipeline is broken. Clipping is a fuse, not an engine — investigate sustained clipping instead of shipping with it.',
          },
          {
            mistake: 'Skipping the one-batch overfit test and debugging for days',
            fix: 'If the model cannot memorize a single batch, no hyperparameter search will help — labels, loss, optimizer wiring, or gradient flow are broken. Ninety seconds of overfit testing saves entire lost afternoons.',
          },
        ],
        exam: {
          question:
            'Explain how dropout acts as regularization, justify the inverted scaling factor 1/(1-p), and state how gradient clipping\'s global-norm rule differs from element-wise clipping.',
          answer:
            'Dropout randomly zeroes activations with probability p during training, so each update trains a randomly thinned sub-network; units cannot rely on specific co-workers, which discourages fragile co-adaptation and can be viewed as approximate ensembling over exponentially many sub-models at inference. Inverted scaling: if kept activations are passed unchanged, the expected output during training is (1-p)x while eval (dropout off) gives x — a systematic scale mismatch between train and test. Scaling kept activations by 1/(1-p) during training makes E[dropout(x)] = x, matching the eval-time behaviour, so no test-time adjustment is needed (PyTorch\'s default). Global-norm clipping: compute the L2 norm of ALL gradients jointly; if it exceeds max_norm, multiply EVERY gradient by max_norm/norm — capping the total update magnitude while PRESERVING its direction. Element-wise clipping instead clamps each coordinate independently to a threshold, which distorts direction (large coordinates are cut disproportionately) and does not control the total norm. Global-norm is standard for transformers/RNNs because update direction is the information you most want to keep.',
          source: 'Common advanced-DL exam question (dropout mechanism + scaling) and a standard systems-interview item on clipping semantics.',
        },
        summary: [
          'Dropout trains thinned sub-networks per batch; inverted scaling (1/(1-p)) keeps train and inference expectations identical.',
          'Modern transformers often use little or no dropout — data scale + weight decay + residual/LayerNorm do much of the regularizing.',
          'Global-norm clipping scales all gradients uniformly when their joint norm exceeds a cap, preserving direction — the standard fuse for loss spikes.',
          'Regularizers are chosen from a measured generalization gap: augmentation > weight decay > dropout > early stopping, in rough leverage order by scenario.',
          'First-run discipline: one-batch overfit test, boring baseline, full vital-sign logging, then ONE change per run.',
        ],
      }),
      [
        [
          'Inverted dropout means that during TRAINING, kept activations are:',
          [
            'Left unchanged and scaled up at inference by 1/(1-p)',
            'Scaled by 1/(1-p) during training so no change is needed at inference',
            'Scaled by (1-p) during training',
            'Never rescaled in either phase',
          ],
          1,
          'Scaling kept units by 1/(1-p) in training makes E[output] equal the dropout-off output, so inference needs no adjustment — PyTorch\'s default behaviour.',
        ],
        [
          'Global-norm gradient clipping with max_norm = M and computed gradient norm G > M scales gradients by:',
          ['M * G', 'M / G', 'G / M', '1 / G'],
          1,
          'Every gradient is multiplied by M/G (a factor < 1), so the new joint norm equals exactly M while the update direction stays identical to the unclipped gradient.',
        ],
        [
          'A training log shows grad-clip fraction = 1.0 on every step for the whole run. The best interpretation is:',
          [
            'Clipping is working perfectly — ship it',
            'Something upstream is broken (lr too high, loss/precision instability, bad init) — clipping is masking a real problem',
            'The batch size is too small',
            'Weight decay is too high',
          ],
          1,
          'A healthy run clips occasionally (rarely). Clipping on 100% of steps means the raw gradients are persistently enormous — investigate lr, loss scale, and numerical stability rather than trusting the clipped values.',
        ],
        [
          'The correct first step when a brand-new model\'s training loss will not move is to:',
          [
            'Launch a full hyperparameter grid search',
            'Try a larger architecture',
            'Run the one-batch overfit sanity test to verify the pipeline (data, loss, gradients, wiring)',
            'Add more dropout',
          ],
          2,
          'If the model cannot drive a single batch to near-zero loss, the pipeline itself is broken; no search over architecture or regularization can fix a wiring bug — overfit-one-batch isolates it fast.',
        ],
      ]
    ),
  ],
};
