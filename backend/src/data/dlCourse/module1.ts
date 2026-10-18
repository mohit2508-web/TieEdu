// Module 1 — Foundations: From Perceptron to Gradient Descent
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code, diagram } from '../nineBlocks';
import { lesson, M1, COURSE_ID } from './helpers';

export const module1: CourseModule = {
  id: M1,
  course_id: COURSE_ID,
  title: 'Module 1 — Foundations: From Perceptron to Gradient Descent',
  summary:
    'The perceptron and its limits, multilayer networks as universal approximators, the full zoo of activation functions and why non-linearity is the price of depth, backpropagation as systematic blame assignment via the chain rule, and the geometry of loss surfaces under gradient descent and its variants.',
  sort_order: 1,
  lessons: [
    lesson(
      M1,
      'dl-1-1',
      1,
      'From Perceptron to Multilayer Network',
      'Rosenblatt\'s linear classifier, the XOR failure that exposed its limits, and how stacking layers plus non-linearity turns a single hyperplane into an arbitrarily complex decision boundary.',
      22,
      nineBlocks({
        objectives: [
          'Write the perceptron update rule and trace one training epoch by hand',
          'Prove that a single perceptron cannot represent XOR, geometrically and algebraically',
          'Explain how a two-hidden-layer network carves decision regions a perceptron cannot',
          'Distinguish representational power (what a network CAN fit) from trainability (what SGD actually finds)',
        ],
        hook:
          'In 1958 the New York Times reported that the Navy expected the perceptron to "walk, talk, see, write, reproduce itself and be conscious of its existence". It was a single neuron trained on photosensors. Seven years later, Minsky and Papert proved in one book chapter that this machine cannot even solve XOR — the four-point puzzle any child solves by hand. That single counterexample redirected the entire field, and understanding WHY a linear machine fails XOR, and exactly what machinery fixes it, is the foundation everything else in this course stands on.',
        concept: `**The perceptron, precisely.** Rosenblatt\'s perceptron is a single artificial neuron with a hard threshold. It receives inputs x1..xn, computes a weighted sum z = w·x + b, and outputs 1 if z >= 0, else 0. It is a linear classifier: the decision boundary w·x + b = 0 is a hyperplane (a line in 2D, a plane in 3D). Everything on one side is positive, everything on the other negative.

**The perceptron learning rule.** Training is embarrassingly direct. Predict on an example. If the prediction is correct, do nothing. If the model predicted 0 but the label is 1, nudge every weight toward the input: w_i <- w_i + eta * x_i (and b <- b + eta). If it predicted 1 but the label is 0, nudge away: w_i <- w_i - eta * x_i. The geometric picture: each misclassified example pushes the hyperplane so that it flips that point to the correct side. Rosenblatt\'s Perceptron Convergence Theorem guarantees this procedure finds a separating hyperplane in finite steps — IF one exists. That if is the whole story.

**The XOR wall.** XOR (exclusive OR) has four points: (0,0)->0, (0,1)->1, (1,0)->1, (1,1)->0. Try to draw a single straight line separating the 1s from the 0s. You cannot: the two 1s sit at opposite corners of a square, and the two 0s sit on the other diagonal. No hyperplane in the input space separates these classes, so no weight setting of a single perceptron represents XOR — the problem is geometric, not an optimization failure. No amount of training data, better learning rate, or clever initialization rescues a model class that cannot express the answer. This is the distinction between representational failure and training failure, and confusing them is the most common beginner error in the field.

**What actually solves it: depth plus non-linearity.** A multilayer network (MLP) composes multiple neurons into hidden layers, with a non-linear activation between layers. For XOR, one classic construction uses two hidden neurons computing h1 = ReLU(x1 + x2 - 1) and h2 = ReLU(x1 + x2 - 2)... more cleanly, the standard trick: h1 = AND(x1, x2-ish), h2 = OR-ish, output = h2 - h1. In continuous terms, two hidden ReLU units create two half-plane boundaries; the output layer recombines their regions so the positive area becomes the union of two corners. One hyperplane cannot do this; a composition of two can. The general theorem: a network with one hidden layer of sufficient width and a non-linear activation can approximate any continuous function on a compact set to arbitrary accuracy (the universal approximation theorem). Depth is not required for approximation in principle — it is required for efficiency in practice. Functions like hierarchical image structure need exponentially many neurons in a shallow net but polynomially many in a deep one.

**From classifier to feature machine.** The deeper insight of the MLP is not "more boundaries", it is that hidden layers learn FEATURES. The first hidden layer learns useful rotations and projections of the raw input; the second layer learns combinations of those; the output layer classifies in the learned feature space. What was a non-linearly-separable problem in the raw input often becomes linearly separable in a well-chosen feature space. This is the connection to classical SVM thinking: hand-engineered features plus a linear classifier, except here the features are learned jointly with the classifier by gradient descent through the whole stack.

**The honest caveats.** Universal approximation says a solution EXISTS in the weight space. It says nothing about whether SGD finds it in reasonable time, whether it generalizes, or whether the needed width is practical. The gap between "can represent" and "can train" is where most of the next four modules live: optimization, initialization, normalization, and architecture design are all responses to that gap.`,
        extras: [
          table(
            'Perceptron vs MLP',
            ['Property', 'Perceptron', 'Multilayer network'],
            [
              ['Decision boundary', 'Single hyperplane', 'Piecewise-linear / curved composite boundary'],
              ['Can represent XOR', 'No — provably', 'Yes — with one hidden layer of >= 2 units'],
              ['Learning rule', 'Local: update on misclassification only', 'Global: gradient of a loss through all layers'],
              ['Features', 'Uses raw inputs', 'Learns its own intermediate features'],
              ['Failure mode if it cannot fit', 'Optimization (no separating plane)', 'Optimization or capacity — must diagnose which'],
            ],
          ),
          code(
            `import torch
import torch.nn as nn

# XOR as a tiny training set
X = torch.tensor([[0.,0.],[0.,1.],[1.,0.],[1.,1.]])
y = torch.tensor([[0.],[1.],[1.],[0.]])

# A single linear layer: representational ceiling = a straight line
linear = nn.Linear(2, 1)          # cannot fit XOR, ever
# A 2-16-1 MLP with ReLU: can fit XOR
mlp = nn.Sequential(
    nn.Linear(2, 16), nn.ReLU(),
    nn.Linear(16, 1), nn.Sigmoid(),
)

opt = torch.optim.Adam(mlp.parameters(), lr=0.05)
lossfn = nn.BCELoss()
for step in range(500):
    loss = lossfn(mlp(X), y)
    opt.zero_grad(); loss.backward(); opt.step()
print(torch.round(mlp(X)).squeeze())  # -> tensor([0., 1., 1., 0.])`,
            'xor_mlp.py',
            'python',
          ),
          tip(
            'Diagnose before you tune',
            'Model cannot fit even the training set? Either capacity (too small / wrong architecture) or optimization (lr, init, saturation). Fit train but not val? Generalization problem — different playbook. Name the failure before touching hyperparameters.',
          ),
          warn(
            'Universal approximation is not a training guarantee',
            'A theorem about the EXISTENCE of good weights says nothing about SGD finding them. "The network can represent it" and "our run learned it" are different claims — never substitute one for the other in a report or an exam answer.',
          ),
        ],
        worked: {
          title: 'Trace the perceptron on a linearly separable set — and fail on XOR',
          problem:
            'Perceptron with 2 inputs, bias-free, learning rate 1. Initial weights w = (0, 0). Train on: A=(1,1)->1, B=(0,0)->0, C=(0,1)->0, D=(1,0)->0? No — use the separable set: A=(1,1)->1, B=(0,0)->0, C=(1,0)->0 (AND-like). (a) Trace updates until convergence or 3 epochs. (b) Explain in one sentence why the same procedure can never fit XOR.',
          steps: [
            {
              title: 'Epoch 1, point A=(1,1) label 1',
              desc: 'Score = 0*1 + 0*1 = 0 >= 0, so the perceptron predicts 1. Correct. No update. Weights stay (0, 0).',
              code_snippet: 'z = 0; pred = 1 (ties go positive); pred == y -> no update',
            },
            {
              title: 'Epoch 1, point B=(0,0) label 0',
              desc: 'Score = 0 >= 0, predicts 1. Wrong (label 0). Weights move away from the input: w <- w - 1 * (0,0) = (0,0). No change — this point carries no direction. Continue.',
              code_snippet: 'w = (0,0) - (0,0) = (0,0)',
            },
            {
              title: 'Epoch 1, point C=(1,0) label 0',
              desc: 'Score = 0, predicts 1. Wrong. Update away: w <- (0,0) - 1*(1,0) = (-1, 0).',
              code_snippet: 'w = (-1, 0)',
            },
            {
              title: 'Epoch 2, A=(1,1) label 1',
              desc: 'Score = -1*1 + 0*1 = -1 < 0, predicts 0. Wrong. Update toward: w <- (-1,0) + (1,1) = (0, 1).',
              code_snippet: 'w = (0, 1)',
            },
            {
              title: 'Epoch 2, B=(0,0) label 0',
              desc: 'Score 0 >= 0 predicts 1. Wrong. w <- (0,1) - (0,0) = (0,1). Then C=(1,0): score 0, predicts 1, wrong: w <- (0,1) - (1,0) = (-1, 1).',
              code_snippet: 'after B: (0,1); after C: (-1, 1)',
            },
            {
              title: 'Epoch 3, verify all points',
              desc: 'A: -1+1 = 0 -> pred 1 (correct). B: 0 -> pred 1 — STILL WRONG. The bias-free perceptron with w=(-1,1) gives B a tie score of 0 which breaks to the positive class. Continue iterating: next A correct, C: -1 < 0 pred 0 correct, B again updates to (-1,1), and so on — with a bias term this oscillation resolves; without one, ties at the origin can persist. The lesson: ties and the missing bias both matter. With bias b and a few more epochs, AND converges to w=(1,1), b=-1.5.',
              code_snippet: 'with bias: converges to w=(1,1), b=-1.5  # AND: fires only at (1,1)',
            },
          ],
          solution:
            'The perceptron learns AND (a linearly separable function) in a handful of updates: with a bias it settles at w=(1,1), b=-1.5, firing only on (1,1). For XOR, no sequence of these updates can succeed — because no single line separates { (0,1), (1,0) } from { (0,0), (1,1) }, the Perceptron Convergence Theorem\'s precondition ("a separator exists") is violated, and the algorithm will oscillate forever. Depth is the fix, not patience.',
        },
        practice: {
          title: 'Prove XOR is unseparable to a skeptic',
          prompt:
            'Write a four-sentence proof that no linear classifier can fit XOR. Then sketch (words or a diagram) the two-hidden-unit ReLU construction that can: specify each hidden unit\'s weights and the output unit\'s weights so the network outputs 0 at (0,0) and (1,1) and 1 at (0,1) and (1,0).',
          hint: 'For the proof: assume a line w1*x1 + w2*x2 + b separates, derive w1 + b < 0 and w1 + b > 0 (or similar contradiction pair). For the construction: h1 = x1 + x2 - 1 gives 1 at the two "middle" corners, h2 = 2 - x1 - x2 also isolates them; output = min(h1, h2) or a small MLP recombining them.',
        },
        mistakes: [
          {
            mistake: 'Believing a bigger learning rate or more epochs can fix a representational failure',
            fix: 'If the model class cannot express the target (perceptron on XOR), training diverges or cycles forever. Increase capacity or change architecture first; tune optimization second.',
          },
          {
            mistake: 'Quoting the universal approximation theorem as "MLPs can learn anything"',
            fix: 'The theorem says good weights EXIST for any continuous function, given enough width. It says nothing about SGD finding them in feasible time, nor about generalization. Quote it with its caveats or not at all.',
          },
          {
            mistake: 'Assuming deeper is always better than wider because depth is more parameter-efficient',
            fix: 'Depth pays when the target has hierarchical structure (vision, language). On low-dimensional tabular problems a single hidden layer often matches deeper nets. Decide by validation, not fashion.',
          },
          {
            mistake: 'Forgetting the bias and then misreading ties in hand-traced perceptrons',
            fix: 'Without a bias, every hyperplane passes through the origin — the classifier loses a whole degree of freedom. In hand-traces, a score of exactly 0 also needs a stated tie-break convention; pick one (>= 0 is positive) and apply it consistently.',
          },
        ],
        exam: {
          question:
            'GATE-style: (a) Show that no single perceptron can implement XOR. (b) State the universal approximation theorem, and explain in two sentences why it does not guarantee that gradient descent will train a deep network successfully.',
          answer:
            '(a) XOR requires f(0,0)=0, f(1,1)=0, f(0,1)=1, f(1,0)=1. A perceptron computes sign(w1*x1 + w2*x2 + b) — a single straight boundary. The positives (0,1) and (1,0) lie on opposite sides of any line that separates (0,0) from (1,1): assuming w1*x1 + w2*x2 + b < 0 at (0,0) and (1,1) gives b < 0 and w1 + w2 + b < 0; requiring > 0 at (0,1) and (1,0) gives w2 + b > 0 and w1 + b > 0; summing the last two: w1 + w2 + 2b > 0, contradicting w1 + w2 + b < 0 with b < 0. Hence no separating hyperplane exists. (b) The theorem: any continuous function on a compact set can be approximated arbitrarily well by a one-hidden-layer network with a non-linear activation, given sufficient width. It is an existence result over the weight space; it gives no algorithm, no sample-complexity bound, and no guarantee that SGD reaches the good region in polynomial time — those are optimization and generalization questions, addressed by the techniques of Modules 2 and 3.',
          source: 'Classic GATE CS/AI deep-learning question; also a staple of ML interviews at the "prove it" level.',
        },
        summary: [
          'A perceptron is one neuron with a threshold: its boundary is a single hyperplane, trainable by nudging weights on mistakes.',
          'XOR is not linearly separable, so no perceptron can represent it — a representational, not optimization, failure.',
          'MLPs compose neurons through hidden layers with non-linear activations, turning raw inputs into learned features where classes become separable.',
          'Universal approximation: one hidden layer is enough to APPROXIMATE any continuous function; depth buys efficiency, not mere possibility.',
          'Always distinguish three questions: can it represent? can SGD train it? does it generalize?',
        ],
      }),
      [
        [
          'A single perceptron fails on XOR because:',
          [
            'The learning rate is too small',
            'No single hyperplane separates the XOR classes — a representational limitation',
            'XOR needs more training data',
            'The sigmoid activation saturates',
          ],
          1,
          'XOR positives sit at opposite corners of the square; no straight line separates them from the negatives. This is geometric impossibility for a linear boundary, not a training issue.',
        ],
        [
          'The universal approximation theorem guarantees that:',
          [
            'A deep network will be found by SGD in polynomial time',
            'A one-hidden-layer network with enough width can approximate any continuous function on a compact set to arbitrary accuracy',
            'Deeper networks always outperform shallow ones',
            'A trained MLP will generalize to unseen data',
          ],
          1,
          'The theorem is an existence statement about representational capacity for continuous functions on compact sets. It says nothing about trainability, depth efficiency, or generalization.',
        ],
        [
          'In the perceptron learning rule, a misclassified positive example (predicted 0, label 1) causes weights to:',
          [
            'Move away from the input vector',
            'Move toward the input vector: w <- w + eta * x',
            'Stay unchanged',
            'Be reset to the input vector',
          ],
          1,
          'To flip this example to the positive side, the score w·x must increase, so weights are nudged along +x; misclassified negatives get nudged along -x.',
        ],
        [
          'The key efficiency argument for depth over width is:',
          [
            'Deep layers have fewer floating-point operations per step',
            'Hierarchical functions can require exponentially many neurons in a shallow net but only polynomially many in a deep one',
            'Wide layers cannot be parallelized on GPUs',
            'Shallow nets have no activation functions',
          ],
          1,
          'Composition mirrors the hierarchical structure of real-world signals (edges to parts to objects), giving exponential parameter savings for those function classes — the practical reason depth dominates despite the theorem only requiring one layer.',
        ],
      ]
    ),
    lesson(
      M1,
      'dl-1-2',
      2,
      'Activation Functions: The Non-Linearity That Makes Depth Work',
      'The full family — sigmoid, tanh, the ReLU zoo, GELU and friends — with derivative-level detail, and the stacking-of-linear-layers proof that non-linearity is not optional.',
      20,
      nineBlocks({
        objectives: [
          'Prove algebraically that a stack of linear layers collapses to a single linear map',
          'Compute sigmoid, tanh, and ReLU forward values AND their gradients at given points',
          'Compare sigmoid/tanh/ReLU/Leaky-ReLU/GELU on saturation, dead units, and typical use',
          'Predict which activation choice is likely given a model\'s symptoms (dead units, exploding activations, slow convergence)',
        ],
        hook:
          'Here is a deceptively simple question: if you remove every activation function from a 50-layer network, what is the most complex function it can represent? Answer: the same as a single linear layer. Five hundred million parameters, fifty matrix multiplications — and the entire stack algebraically collapses into ONE matrix. This is not a curiosity; it is the reason deep learning needed an idea beyond "stack neurons", and the reason the choice of the small non-linear function in between has been argued about for forty years.',
        concept: `**The collapse theorem.** A linear layer computes h = Wx + b. Compose two: h2 = W2(W1x + b1) + b2 = (W2W1)x + (W2b1 + b2). The result is again a linear function of x — some new matrix W' and bias b'. By induction, any composition of linear maps is a linear map. So a deep "linear network" is expressively identical to a single layer; depth buys nothing without non-linearity. The activation function f, applied elementwise between layers (h = f(Wx + b)), is what breaks this collapse: once f is non-linear, compositions of "linear + f" become piecewise-linear (for ReLU) or genuinely curved functions, and the expressive power of depth is unlocked. One non-linearity per layer, no exceptions.

**Sigmoid and tanh: the saturating originals.** Sigmoid, sigmoid(z) = 1/(1+e^{-z}), squashes any real number into (0,1) — a natural probability interpretation, which is why the final layer of a binary classifier still uses it. Its derivative is elegant: sigma'(z) = sigma(z) * (1 - sigma(z)), peaking at 0.25 when z = 0 and shrinking to near-zero as |z| grows — this is SATURATION. tanh(z) = 2*sigma(2z) - 1 squashes into (-1,1), zero-centred (usually better than sigmoid as a hidden activation), with derivative 1 - tanh^2(z), also peaking near 1 and vanishing in the tails. The shared pathology: once a pre-activation lands deep in the tails, the gradient is ~0 and the neuron stops learning. Stack many saturating activations and gradients multiply down the layers (each factor <= 0.25 for sigmoid), producing the vanishing gradient problem that crippled deep sigmoid networks for decades. That single fact is the historical reason ReLU won.

**ReLU and its family.** ReLU(z) = max(0, z) is piecewise linear: gradient 1 for positive z, 0 for negative z. No saturation on the positive side (gradient stays 1 no matter how large z grows), extremely cheap to compute (a threshold), and empirically it trains deep networks several times faster than sigmoid/tanh. The costs: (1) DEAD UNITS — if a neuron\'s pre-activation is negative for all training examples, its gradient is permanently 0 and it never recovers (a "dying ReLU"); (2) unbounded positive outputs, which occasionally need monitoring. Leaky ReLU (z if z>0, else alpha*z with alpha ~ 0.01) and PReLU (learned alpha) fix death by keeping a small negative-side gradient. ELU and SELU add smooth negative curves for noise robustness. GELU (Gaussian Error Linear Unit, used in BERT and GPT) and SiLU/Swish (z * sigmoid(z)) are smooth, non-monotone-at-negative variants that consistently edge out ReLU in transformers and vision transformers — modern default activations in LLM-era architectures.

**Choosing: rules of thumb with reasons.** CNNs: ReLU or its leaky variants (cheap, works, GPU-friendly max). Transformers/LLMs: GELU (in BERT/GPT) or SwiGLU (in LLaMA/Mistral-class models — a gated variant: Swish(z) * linear gate, trading a third more parameters for better loss). RNN gates: sigmoid and tanh are still mandatory, because gates must output values in (0,1) or (-1,1) by design. Output layers: sigmoid for binary probabilities, softmax for multi-class, linear (identity) for regression. Note the pattern: saturating squashing functions are reserved for GATES and OUTPUTS where a bounded range is the point; hidden layers get non-saturating bends where gradient flow is the point.

**Symptoms to diagnoses.** Training loss flat at log(2) from step 0 with sigmoid/tanh hidden layers: saturation from bad initialization or unscaled inputs. Many dead neurons visible in activation histograms with ReLU: lr too high (large negative swings) or bias init too negative — try Leaky ReLU and He init (Module 2). Activations growing layer by layer: missing normalization or exploding-signal path — see batch norm and residual paths later. A quick activation-and-gradient histogram per layer, plotted every few hundred steps, is the single most informative debugging view in deep learning.`,
        extras: [
          table(
            'Activation cheat sheet',
            ['Activation', 'Range', 'Derivative peak', 'Characteristic failure', 'Where it is used'],
            [
              ['sigmoid', '(0, 1)', '0.25', 'Saturation kills gradients; non-zero-centred', 'Binary outputs, RNN gates'],
              ['tanh', '(-1, 1)', '1.0', 'Saturation in tails', 'RNN gates, older hidden layers'],
              ['ReLU', '[0, inf)', '1.0 (positive side)', 'Dead units on negative side', 'CNNs, MLP default'],
              ['Leaky ReLU', '(-inf, inf)', '1.0 / alpha', 'Slight bias in the kink', 'ReLU fallback when units die'],
              ['GELU', '~(-0.17, inf)', '~1.1', 'Costlier exp/erf ops (negligible on GPU)', 'BERT, GPT, ViT'],
              ['SiLU/Swish', '~(-0.28, inf)', '~1.1', 'Same', 'EfficientNet, modern CNNs'],
              ['SwiGLU', 'unbounded', 'varies', 'Extra parameter matrix to manage', 'LLaMA, PaLM-class LLMs'],
            ],
          ),
          code(
            `import torch
import torch.nn as nn

acts = {
    "sigmoid": nn.Sigmoid(),
    "tanh": nn.Tanh(),
    "relu": nn.ReLU(),
    "leaky_relu": nn.LeakyReLU(0.01),
    "gelu": nn.GELU(),
    "silu": nn.SiLU(),          # Swish
}
z = torch.tensor([-4.0, -1.0, 0.0, 1.0, 4.0], requires_grad=True)
for name, f in acts.items():
    out = f(z).sum()
    out.backward()
    print(f"{name:10s} f(z)={f(z).detach().numpy()}  grad={z.grad.numpy()}")
    z.grad.zero_()

# The collapse proof in code: two linear layers == one
lin1, lin2 = nn.Linear(8, 8), nn.Linear(8, 8)
x = torch.randn(4, 8)
composed = lin2(lin1(x))
merged_W = lin2.weight @ lin1.weight
merged_b = lin2.weight @ lin1.bias + lin2.bias
print(torch.allclose(composed, merged_W @ x.T + merged_b[:, None].T, atol=1e-5))  # True`,
            'activation_survey.py',
            'python',
          ),
          tip(
            'Read activations like a mechanic reads spark plugs',
            'Log per-layer activation means, stds, and dead fractions every N steps. Flat-at-zero std in a sigmoid layer = saturation. >30% dead in a ReLU layer = dead-ReLU syndrome. This one plot catches more bugs than any amount of staring at the loss curve.',
          ),
          warn(
            'Do not use sigmoid/tanh as modern hidden activations',
            'They survive as gate functions (LSTM/GRU) and probability outputs, but as hidden activations in deep MLPs/CNNs they were beaten by ReLU in 2011 and never reclaimed the spot. If you see deep sigmoid hidden layers in 2026 code, that is a red flag, not a style choice.',
          ),
        ],
        worked: {
          title: 'Compute forward and backward through sigmoid and ReLU by hand',
          problem:
            'A hidden neuron receives pre-activation z = 2.0 under sigmoid, and another receives z = -0.5 under ReLU. (a) Compute each neuron\'s output. (b) Compute each activation\'s local gradient dz (derivative at that point). (c) If the upstream gradient arriving at the activation output is 0.6 in both cases, what gradient reaches the pre-activation (and hence flows back toward the weights)? Which neuron is learning faster?',
          steps: [
            {
              title: 'Sigmoid forward',
              desc: 'sigmoid(2.0) = 1/(1 + e^{-2}) = 1/(1 + 0.1353) = 1/1.1353 = 0.881.',
              code_snippet: '1 / (1 + math.exp(-2.0))  # 0.881',
            },
            {
              title: 'Sigmoid local gradient',
              desc: 'sigmoid\'(z) = s(1-s) = 0.881 * 0.119 = 0.105. Already down to ~10% of its peak (0.25) — this neuron is heading toward saturation.',
              code_snippet: '0.881 * (1 - 0.881)  # 0.105',
            },
            {
              title: 'ReLU forward and gradient',
              desc: 'ReLU(-0.5) = max(0, -0.5) = 0. Its derivative at z < 0 is exactly 0. Output is zero AND gradient is zero: this neuron is dead — no upstream signal, no weight updates, ever, unless the bias or upstream weights change through other paths.',
              code_snippet: 'ReLU(-0.5) = 0.0;  ReLU\'(-0.5) = 0.0',
            },
            {
              title: 'Chain both with upstream gradient 0.6',
              desc: 'Sigmoid path: gradient at z = 0.6 * 0.105 = 0.063 — weak but alive; weights will move slowly. ReLU path: gradient at z = 0.6 * 0 = 0.0 — the neuron is frozen. Gradient to the incoming weights also multiplies by the (zero or small) input activation, compounding the effect.',
              code_snippet: 'sigmoid: 0.6 * 0.105 = 0.063    relu: 0.6 * 0.0 = 0.0',
            },
          ],
          solution:
            'Sigmoid neuron: output 0.881, local gradient 0.105, back-propagated gradient 0.063 — learning, but slowly, and slower the more saturated it becomes. ReLU neuron at z = -0.5: output 0, gradient 0.0 — dead, contributing nothing and receiving no updates. This hand computation is exactly why modern hidden layers default to ReLU-family functions (full-strength gradient on the positive side) while sigmoid survives only where a bounded gate or probability is the actual goal.',
        },
        practice: {
          title: 'Activation autopsy on a failing model',
          prompt:
            'A 12-layer MLP with sigmoid hidden layers trains for an hour and its loss barely moves below 0.69 (ln 2). Predict what per-layer activation and gradient statistics you would see, layer by layer, and explain why the EARLY layers are worse off than the late ones. Then propose two concrete fixes and the expected effect of each.',
          hint: 'sigmoid\' max derivative is 0.25; twelve layers multiply those factors. Think about what 0.25^k does as k grows, and where in backprop that multiplication happens for early layers.',
        },
        mistakes: [
          {
            mistake: 'Applying softmax across the wrong axis or using it as a hidden activation',
            fix: 'Softmax normalises a vector of logits into a distribution (sums to 1) — it belongs at multi-class outputs (and inside attention). As a hidden activation it squashes competition between unrelated neurons and gradients get messy. Elementwise activations (ReLU/GELU) are for hidden layers.',
          },
          {
            mistake: 'Assuming dead ReLUs can revive during training',
            fix: 'Once a unit\'s pre-activation is negative for every sample, its gradient is identically zero — it is frozen (only a bias shared with other paths could theoretically move it). Prevention: He initialization, moderate lr, Leaky ReLU, or batch norm. Recovery requires restarting or surgery.',
          },
          {
            mistake: 'Crediting the activation alone for ReLU\'s success',
            fix: 'ReLU\'s win is partly initialization synergy (He init assumes ReLU\'s variance behaviour) and partly computational (a comparison against a max is cheaper than exp). Activations, initialization, and normalization are a SYSTEM — swap one piece without the others and results change.',
          },
          {
            mistake: 'Forgetting activations are elementwise and miscounting parameter shapes',
            fix: 'Activations have no parameters of their own (except PReLU/learned GELU variants); they map each element independently. When sizing tensors between layers, the activation never changes shape — only the linear/conv layers do.',
          },
        ],
        exam: {
          question:
            'Why did ReLU enable training networks far deeper than sigmoid/tanh allowed? Answer at the level of gradients, and name one failure mode of ReLU with its standard mitigation.',
          answer:
            'Sigmoid and tanh SATURATE: for large-magnitude pre-activations their derivatives approach zero (sigmoid\'s peak is only 0.25). During backprop, the gradient at an early layer is a product of these per-layer factors; with many layers the product shrinks geometrically toward zero (vanishing gradients), so early layers receive effectively no learning signal. ReLU has derivative exactly 1 for all positive pre-activations, so gradients pass through the positive path unattenuated regardless of depth — combined with He initialization this restored healthy gradient flow in 20+ layer networks. ReLU\'s failure mode is the DEAD UNIT: a neuron whose pre-activation is negative for all inputs gets a zero gradient forever. Mitigations: Leaky ReLU (small negative-side slope), He initialization, batch normalization, or avoiding excessively large learning rates that slam activations deep negative.',
          source: 'Frequently asked in GATE AI sections and ML interviews as the "why ReLU" question — expect the gradient argument, not just "it works better".',
        },
        summary: [
          'Without non-linear activations, a stack of linear layers algebraically collapses to one linear map — depth buys nothing.',
          'Sigmoid/tanh saturate (gradients -> 0 in the tails), causing vanishing gradients in deep stacks; they survive as gates and probability outputs.',
          'ReLU: gradient 1 on the positive side, 0 on the negative — fast, cheap, but produces dead units when stuck negative.',
          'GELU/SiLU/SwiGLU are the modern hidden defaults in transformers and LLMs; ReLU-family still dominates CNNs.',
          'Match the activation to the job: bounded squashing for gates/outputs, non-saturating bends for hidden layers.',
        ],
      }),
      [
        [
          'A 10-layer network with only linear layers (no activations) is equivalent in expressiveness to:',
          [
            'A single linear layer',
            'A 2-layer linear network',
            'A universal approximator',
            'A convolutional network',
          ],
          0,
          'Compositions of linear maps are linear: W2(W1x + b1) + b2 = (W2W1)x + (W2b1 + b2), still linear. Any depth of linear layers collapses to one affine map.',
        ],
        [
          'The maximum value of the derivative of sigmoid (over all inputs) is:',
          ['1.0', '0.25', '0.5', 'It has no maximum (unbounded)'],
          1,
          'sigmoid\'(z) = s(1-s) is maximised at s = 0.5 (z = 0), giving 0.25, and shrinks toward 0 in the saturating tails.',
        ],
        [
          'A ReLU neuron whose pre-activation is negative for every training example will:',
          [
            'Slowly learn with a small gradient',
            'Have exactly zero gradient and never update — a dead unit',
            'Output a small negative value',
            'Automatically switch to leaky ReLU',
          ],
          1,
          'ReLU\'s derivative is 0 for z < 0; with no positive activations the gradient path through this unit is identically zero, freezing its weights. Mitigate with Leaky ReLU / He init / batch norm.',
        ],
        [
          'GELU and SwiGLU are the preferred hidden activations in modern LLM architectures (BERT/GPT/LLaMA) primarily because they:',
          [
            'Are cheaper than ReLU on GPUs',
            'Are strictly monotonic everywhere',
            'Empirically improve training loss and quality over ReLU in deep transformer stacks, with smooth stochastic-gating behaviour',
            'Are required by the attention mechanism mathematically',
          ],
          2,
          'GELU/SiLU/SwiGLU are smooth ReLU refinements (probabilistic gating) that consistently yield better downstream quality in transformers at negligible compute cost. They are not mathematically required by attention, nor cheaper.',
        ],
      ]
    ),
    lesson(
      M1,
      'dl-1-3',
      3,
      'Backpropagation: The Chain Rule as Blame Assignment',
      'Forward-pass tapes, the chain rule applied layer by layer, vector-and-Jacobian notation with plain-English glosses, and why backprop is just dynamic programming for derivatives.',
      24,
      nineBlocks({
        objectives: [
          'Compute gradients through a two-layer network by hand using the chain rule',
          'Explain backpropagation as reverse-mode automatic differentiation with a computation-graph picture',
          'Derive the sigmoid + cross-entropy gradient simplification (sigma - y) and explain why it is clean',
          'State the computational complexity of forward vs backward passes and why they cost about the same',
        ],
        hook:
          'A modern LLM has hundreds of billions of parameters. To train it you need the derivative of the loss with respect to EVERY one of them — hundreds of billions of numbers — millions of times per run. Naively computing each derivative with its own limit definition would take roughly one full forward simulation per parameter, per step: utterly impossible. Backpropagation\'s trick is to get ALL parameter gradients from essentially ONE backward sweep, reusing intermediate results on the way back. It is the single algorithm that makes deep learning computationally feasible, and it is, at heart, nothing more exotic than the chain rule applied in the right order.',
        concept: `**The computation graph.** Every network is, for derivative purposes, a DAG (directed acyclic graph) of elementary operations: multiplies, adds, exps, maxes. Each node caches its output during the FORWARD pass (PyTorch\'s autograd does this automatically when tensors carry requires_grad=True). The backward pass then walks the graph in REVERSE topological order — from the loss back toward the inputs — applying the chain rule at each node. Why reverse order? Because to compute dL/dw for an early weight you need dL/dz for every downstream node z that consumed its output; those are computed on the way back. Reverse order guarantees every downstream derivative is already known when you arrive at a node. This is dynamic programming: each local derivative is computed once and multiplied into the "blame" flowing through.

**The chain rule, twice-glossed.** Calculus: if y = f(u) and u = g(x), then dy/dx = (dy/du) * (du/dx). Plain English: the sensitivity of the final output to an early variable equals (sensitivity of output to the next intermediate) times (sensitivity of that intermediate to the one before) — sensitivities multiply along the chain. Vector form: when a layer maps x to h = f(Wx + b), the relevant derivative dL/dW is a JACOBIAN (a matrix of all partial derivatives), but reverse-mode avoids ever forming big Jacobians explicitly: it propagates a row vector of "blame" dL/dh backward, and each layer converts it into dL/dx and dL/dW with a cheap matrix multiply.

**Backprop through a tiny MLP, symbolically.** Let x be input, W1/b1 the first layer, h = ReLU(W1 x + b1), W2/b2 the second layer, z = W2 h + b2 the logits, and L = cross-entropy(z, y). Forward: x -> a1 = W1x + b1 -> h = relu(a1) -> z = W2 h + b2 -> L. Backward: start from the well-known combined gradient for softmax/CE (or sigmoid/BCE): dL/dz = p - y (a vector of per-class errors — predicted minus true, the "blame" at the output). Then chain upward: dL/dW2 = (p - y) h^T; dL/dh = W2^T (p - y); dL/da1 = dL/dh * relu\'(a1) (elementwise mask: 0 where a1 <= 0, else pass-through); dL/dW1 = (dL/da1) x^T; dL/db1 = dL/da1. That is the ENTIRE algorithm for this network. Generalize the pattern — one line per layer type, applied in reverse — and you have backprop for any architecture, including transformers.

**Why (p - y) is beautiful.** For softmax output + cross-entropy loss, the derivative of the loss with respect to the logit z_i is exactly p_i - y_i (predicted probability minus true indicator). No messy products of softmax Jacobians survive — they cancel analytically. This is why softmax + cross-entropy is the default multi-class pairing: not just well-motivated probabilistically, but numerically clean in the gradient. For a binary sigmoid + BCE, the same collapse gives dL/dz = sigma(z) - y. When a student re-derives this from scratch and sees the Jacobian terms cancel, backprop stops being magic.

**Cost, and the "backward is ~2x forward" folklore.** The forward pass through a weight matrix W of shape (out, in) costs ~2 * out * in FLOPs per example (the multiply-accumulates). The backward pass needs three such matrix multiplies (upstream gradient times W^T for the input gradient, outer product for dW, and sum for db), so the full train step (forward + backward) costs roughly 3x the forward alone — which is why pure inference (forward only) is about 3x cheaper than training at the same batch size, a ratio that shows up in deployment economics everywhere. None of this requires storing anything exotic: autograd keeps intermediate activations (the "tape") whose memory is often the binding constraint in large-model training — the origin of gradient checkpointing and activation recomputation strategies.

**Where it can go wrong.** Backprop computes EXACT gradients of the objective you specified — it cannot know that objective is wrong. And the chain multiplies: many factors of small numbers (saturating activations, deep stacks without residual paths) yield vanishing gradients at early layers; factors larger than 1 yield exploding gradients. Every technique in Module 2 (initialization, batch norm, gradient clipping, residual connections in Module 3) can be read as a response to pathologies of this chain of multiplications.`,
        extras: [
          diagram(
            'Backprop blame flow (MLP with one hidden layer)',
            'graph TD\n  X[x input] --> A1[a1 = W1x + b1]\n  A1 --> H[h = relu(a1)]\n  H --> Z[z = W2h + b2]\n  Z --> L[L = cross_entropy]\n  L -. dL/dz = p - y .-> Z\n  Z -. dL/dh = W2T(p-y) .-> H\n  H -. dL/da1 = mask .-> A1\n  A1 -. dL/dW1 = (dL/da1)xT .-> X',
          ),
          table(
            'Backprop table for common layers',
            ['Layer', 'Forward', 'Backward (given dL/dout)'],
            [
              ['Linear z = Wx + b', 'z = Wx + b', 'dL/dW = (dL/dz) x^T; dL/db = sum(dL/dz); dL/dx = W^T (dL/dz)'],
              ['ReLU h = max(0, a)', 'h = elementwise max', 'dL/da = dL/dh * 1[a > 0] (mask zeros where a <= 0)'],
              ['Sigmoid h = s(a)', 'h = 1/(1+e^-a)', 'dL/da = dL/dh * s(1-s)'],
              ['Softmax + CE (combined)', 'p = softmax(z), L = -log p_y', 'dL/dz = p - y (one of the cleanest results in deep learning)'],
            ],
          ),
          tip(
            'Debug gradients with finite differences',
            'Pick one parameter, nudge it by eps = 1e-4, measure the loss change; compare (L(w+eps) - L(w-eps)) / (2*eps) against autograd\'s gradient. They should match to ~5 decimal places. One minute of this catches wrong-loss-pairings, detached tensors, and in-place operation bugs that cost days.',
          ),
          warn(
            'In-place ops and detached tensors are the classic autograd bugs',
            'ReLU(inplace=True) on a tensor autograd still needs, or a stray .detach() / .item() on a tensor in the loss path, silently truncates the gradient graph. Symptom: a layer trains, another stays frozen at its init. Fix: remove in-place ops in the training path, check requires_grad on suspicious tensors.',
          ),
        ],
        worked: {
          title: 'Hand-compute backprop through a 2-2-1 network',
          problem:
            'Network: x = (1.0, 2.0). W1 = [[0.5, 0.1],[ -0.2, 0.3]] (2x2), b1 = 0. ReLU hidden. W2 = [[0.7, -0.4]] (1x2), b2 = 0. Output z = W2 h. Loss L = 0.5 * (z - 1.0)^2 (true target 1.0). (a) Forward: compute a1, h, z, L. (b) Backward: compute dL/dz, dL/dh, dL/da1, dL/dW2, dL/dW1[0,0] (just one entry).',
          steps: [
            {
              title: 'Forward through layer 1',
              desc: 'a1 = W1 x = (0.5*1 + 0.1*2, -0.2*1 + 0.3*2) = (0.7, 0.4). Both positive, so ReLU passes through: h = (0.7, 0.4).',
              code_snippet: 'a1 = (0.5*1+0.1*2, -0.2*1+0.3*2) = (0.7, 0.4)\nh = relu(a1) = (0.7, 0.4)',
            },
            {
              title: 'Forward through layer 2 and loss',
              desc: 'z = 0.7*0.7 + (-0.4)*0.4 = 0.49 - 0.16 = 0.33. L = 0.5*(0.33 - 1)^2 = 0.5*0.4489 = 0.2245.',
              code_snippet: 'z = 0.49 - 0.16 = 0.33\nL = 0.5*(0.33-1)**2 = 0.2245',
            },
            {
              title: 'Backprop: loss to z, z to W2 and h',
              desc: 'dL/dz = (z - y) = 0.33 - 1 = -0.67. dL/dW2 = dL/dz * h = -0.67 * (0.7, 0.4) = (-0.469, -0.268). dL/dh = dL/dz * W2^T = -0.67 * (0.7, -0.4) = (-0.469, 0.268).',
              code_snippet: 'dL/dz = -0.67\ndL/dW2 = -0.67 * (0.7, 0.4) = (-0.469, -0.268)\ndL/dh = -0.67 * (0.7, -0.4) = (-0.469, 0.268)',
            },
            {
              title: 'Backprop through ReLU and into W1',
              desc: 'ReLU mask: both a1 entries positive, so gradient passes unchanged: dL/da1 = (-0.469, 0.268). Now dL/dW1[0,0] = dL/da1[0] * x[0] = -0.469 * 1.0 = -0.469. (Full dL/dW1 = (dL/da1)^T x^T outer product: [[-0.469, -0.938],[0.268, 0.536]].)',
              code_snippet: 'mask passes: dL/da1 = (-0.469, 0.268)\ndL/dW1[0,0] = -0.469 * 1.0 = -0.469',
            },
          ],
          solution:
            'Forward: h = (0.7, 0.4), z = 0.33, L = 0.2245. Backward: dL/dz = -0.67; dL/dW2 = (-0.469, -0.268); dL/dh = (-0.469, 0.268); ReLU passes both entries; dL/dW1[0,0] = -0.469. Every gradient emerged from multiplying a chain of local derivatives, reusing the forward-pass values — no limit definitions, no per-parameter simulations. That is backprop, in full.',
        },
        practice: {
          title: 'Break autograd on purpose, then fix it',
          prompt:
            'Write a tiny PyTorch MLP, compute a loss, and (a) verify one weight\'s gradient against a finite-difference estimate; (b) deliberately introduce the two classic bugs — detach the hidden activation from the graph, and zero a gradient twice with retain_graph=False — and describe the exact error or silent wrongness each produces. Restore correct behaviour.',
          hint: 'For finite differences: (L(w+1e-4) - L(w-1e-4)) / (2e-4). For the silent bug, check whether a layer\'s .grad stays None after backward().',
        },
        mistakes: [
          {
            mistake: 'Treating backprop as "the algorithm of learning"',
            fix: 'Backprop only COMPUTES gradients. The update rule (SGD, Adam), the loss choice, and the data determine what is learned. Backprop is a derivative calculator — an extraordinary one — not a learning theory.',
          },
          {
            mistake: 'Computing dL/dW1 before dL/dh is available',
            fix: 'The order is forced: reverse topological traversal. dL/dW1 needs the blame arriving at h (and through the ReLU mask at a1). Forward order would require recomputation — reverse order is the dynamic-programming optimum.',
          },
          {
            mistake: 'Forgetting the ReLU mask in hand derivations',
            fix: 'dL/da1 = dL/dh elementwise-multiplied by 1[a1 > 0]. Negative pre-activations block the gradient entirely. In hand-traces, always list which ReLU units are active before propagating further.',
          },
          {
            mistake: 'Ignoring memory: assuming gradients are free',
            fix: 'Autograd stores every intermediate activation for the backward pass; activation memory often dominates parameter memory (especially with small batches and deep nets). This is why gradient checkpointing (recompute instead of store) and mixed precision exist.',
          },
        ],
        exam: {
          question:
            'Derive the gradient of softmax + cross-entropy loss with respect to the logits and show it equals p - y. (Intermediate-level version: set up the Jacobian product; interview-level version: state the result and explain why it is numerically convenient.)',
          answer:
            'Let p_i = e^{z_i} / sum_j e^{z_j}, and L = -sum_k y_k log p_k (y one-hot). For one class i: dL/dz_i = -sum_k y_k d(log p_k)/dz_i. Using log p_k = z_k - log Z: d(log p_k)/dz_i = delta_ki - p_i. So dL/dz_i = -sum_k y_k (delta_ki - p_i) = -y_i + p_i sum_k y_k = p_i - y_i (since sum y = 1). Hence the full gradient vector is dL/dz = p - y. Convenience: the messy softmax Jacobian p_k(delta_ki - p_i) terms cancel against the cross-entropy derivative analytically, leaving one subtraction — cheap, stable, and interpretable: the gradient is literally "predicted minus true", largest where the model is most wrong and confident.',
          source: 'Standard derivation in GATE/AI exam prep and the canonical "show the gradient is clean" interview question.',
        },
        summary: [
          'Backprop = chain rule on the computation graph, evaluated in reverse topological order so each local derivative is computed once.',
          'Every layer type has a fixed backward rule; stacking those rules in reverse differentiates any architecture.',
          'Softmax + cross-entropy collapses to dL/dz = p - y; sigmoid + BCE to sigmoid(z) - y — cheap and interpretable.',
          'Backward through a layer costs about two forwards, so a train step is roughly 3x a forward pass; inference-only is ~3x cheaper.',
          'Vanishing/exploding gradients are pathologies of the multiplied chain — Modules 2 and 3 are engineering answers to them.',
        ],
      }),
      [
        [
          'Backpropagation computes gradients by traversing the computation graph:',
          [
            'In forward order, recomputing each partial derivative from scratch',
            'In reverse topological order, reusing already-computed downstream derivatives via the chain rule',
            'By finite differences of the loss',
            'By randomly sampling each parameter',
          ],
          1,
          'Reverse order guarantees that when you reach a node, the derivative of everything downstream is already known; the chain rule then multiplies it by the node\'s local derivative. Each local derivative is computed once — dynamic programming.',
        ],
        [
          'For softmax output + cross-entropy loss, dL/dz (gradient at the logits) equals:',
          ['p * y', 'p - y', 'y - p', 'log p - log y'],
          1,
          'The Jacobian terms of softmax cancel against the cross-entropy derivative, leaving dL/dz = p - y: the predicted distribution minus the true (one-hot) label.',
        ],
        [
          'Through a ReLU unit whose pre-activation a is negative, the back-propagated gradient is:',
          ['Multiplied by 0.5', 'Unchanged', 'Multiplied by 0 — the unit blocks the gradient', 'Multiplied by the learning rate'],
          2,
          'ReLU\'s derivative is 1[a > 0]; at a <= 0 the gradient is exactly zero, which is both the dead-unit hazard and a useful sparsity property when handled properly.',
        ],
        [
          'The dominant memory cost during training of a deep network is typically:',
          [
            'The stored forward activations (the autograd tape) for the backward pass',
            'The optimizer states alone',
            'The input dataset in RAM',
            'The Python interpreter',
          ],
          0,
          'Autograd must keep every intermediate activation to compute gradients backwards; for deep nets with large activations this often exceeds parameter memory — hence gradient checkpointing and mixed precision.',
        ],
      ]
    ),
    lesson(
      M1,
      'dl-1-4',
      4,
      'Loss Surfaces and Gradient Descent Variants',
      'The geometry of high-dimensional loss landscapes, why non-convexity is survivable, and the full descent family from vanilla SGD through momentum, RMSProp, and the intuition behind Adam.',
      22,
      nineBlocks({
        objectives: [
          'Characterise the loss landscape: high-dimensionality, non-convexity, saddle points, and flat vs sharp minima',
          'Derive the vanilla SGD update and one step of heavy-ball momentum with real numbers',
          'Compare batch, mini-batch, and stochastic gradient descent on gradient noise and wall-clock tradeoffs',
          'Explain why Adam-family optimizers dominate default training and when plain SGD still wins',
        ],
        hook:
          'The loss surface of a ResNet-50 has over 25 million dimensions. You cannot picture it, and neither can anyone else — but you must reason about it, because every training run is a walk across it. Two facts make the walk interesting: the surface is NOT a nice bowl (it has ridges, plateaus, saddle points, and countless local minima), yet in high dimensions, almost all of those local minima are actually excellent — good enough that "which minimum you land in barely matters, getting to a low region quickly and reliably does". This lesson teaches you the terrain and the vehicles.',
        concept: `**The landscape, honestly described.** The loss L(w) is one scalar over a parameter vector w with millions of coordinates. Three properties dominate intuition-building. (1) NON-CONVEXITY: there is no guarantee a local minimum is global; surfaces have ridges, valleys of varying width, and complex topology. (2) SADDLE POINTS: in high dimensions, points that look like minima along some directions but maxima along others are common (an elegant counting argument: at a critical point, the Hessian eigenvalues are signs of a random walk; with millions of dimensions, essentially zero chance all are positive). Saddle points stall vanilla gradient descent because the gradient is near zero there while the loss is not low. (3) SCALE SYMMETRIES: permuting hidden units, or rescaling one layer by c and the next by 1/c, leave the function unchanged — so the landscape has equivalent copies of every minimum, connected by flat valleys. Modern lottery-ticket and mode-connectivity research exploits exactly this: minima live in connected low-loss basins, not isolated points.

**Flat vs sharp minima — and why generalization favours flat.** Two minima with the same training loss can generalize very differently. A SHARP minimum sits in a narrow valley: tiny parameter perturbations (the noise of mini-batch updates, or the shift from train to test distribution) raise the loss dramatically. A FLAT minimum sits in a wide basin: perturbations barely matter. Empirically, flat minima generalize better, and mini-batch noise, momentum dynamics, and learning-rate choice all bias toward or away from flatness — this connects (with appropriate hand-waving about the modern literature) to why slightly-too-large learning rates sometimes HELP generalization, and why sharpness-aware minimization (SAM) deliberately seeks flatter basins.

**Vanilla SGD, precisely.** The update: w <- w - eta * g_t, where g_t is the gradient estimated on a mini-batch B_t of size B. Three regimes of B: B = 1 (true SGD) — maximum noise, each step sees one example; noisy but noise can help escape saddle points and sharp basins. B = full dataset (batch GD) — exact gradient, smooth but slow per step and often worse-generalizing. B = 32..4096 (mini-batch) — the practical default: GPU-friendly (matrix multiplies amortize), gradient noise regularizing but controlled. The noise is not merely tolerable; it is a feature — full-batch GD often generalizes WORSE than mini-batch SGD on the same problem.

**Heavy-ball momentum.** Vanilla SGD treats every gradient as gospel, so on a ravine (steep across, gentle along) it oscillates violently across the ravine while inching along it. Heavy-ball momentum adds a fraction of the previous velocity: v <- beta * v + g; w <- w - eta * v (equivalent formulations use v <- beta*v - eta*g). With beta = 0.9, the velocity keeps ~90% of its history, so cross-ravine oscillations cancel (opposite signs) while along-ravine progress accumulates — the classic ball gaining momentum downhill. Worked numbers below. Nesterov momentum computes the gradient at the "lookahead" position (g at w + beta*v), giving a slight anticipatory benefit, popular in older vision recipes.

**Adam and AdamW.** Adam = momentum ON THE GRADIENT (first moment m_t = beta1 m + (1-beta1) g, capturing direction) PLUS per-parameter adaptive step sizes (second moment v_t = beta2 v + (1-beta2) g^2, capturing typical magnitude), with bias-correction terms (1 - beta^t) that matter in the first steps. Each parameter\'s effective step is m_t / (sqrt(v_t) + eps) * eta — so a parameter that historically receives big gradients gets proportionally smaller effective steps, and vice versa. This per-coordinate adaptivity makes Adam robust across problems with little tuning — the reason it is the default for transformers, LLMs, and most non-vision work. AdamW decouples weight decay from the gradient path (decay applied directly to weights, not inside the gradient), fixing a long-standing subtle bias in Adam + L1-style decay — AdamW is the current default in the LLM world.

**When does plain SGD win?** Vision models (ImageNet-class CNNs) famously train well with SGD + momentum + a careful schedule, sometimes generalizing better than Adam at equal tuning effort — the implicit regularization of SGD\'s isotropic noise is believed to help on large, clean, image-like data. The practitioner\'s rule: Adam/AdamW is the default everywhere EXCEPT when you have the compute to tune SGD properly on a large well-understood vision dataset, where SGD+momentum may edge ahead. Batch size, learning rate, and warmup interact with all of this — next lesson.`,
        extras: [
          table(
            'Descent variants compared',
            ['Method', 'Update gist', 'Per-param adaptivity', 'Typical home'],
            [
              ['Batch GD', 'Exact full-data gradient', 'No', 'Toy convex problems'],
              ['SGD', 'One mini-batch gradient', 'No', 'Linear models, very large datasets'],
              ['SGD + momentum', 'Velocity with damping beta ~ 0.9', 'No', 'CNN vision training (still competitive)'],
              ['RMSProp', 'Step scaled by RMS of past gradients', 'Yes (second moment)', 'RNNs historically'],
              ['Adam', 'Momentum + RMS scaling + bias correction', 'Yes', 'Transformers, LLMs, default almost everywhere'],
              ['AdamW', 'Adam with decoupled weight decay', 'Yes', 'Modern LLM training default'],
            ],
          ),
          code(
            `import torch

# One heavy-ball momentum step, by hand
w = torch.tensor([0.0])
eta, beta = 0.1, 0.9
v = torch.tensor([0.0])          # velocity starts at zero
g1 = torch.tensor([2.0])         # first gradient (steep)
v = beta * v + g1                # v = 0.9*0 + 2.0 = 2.0
w = w - eta * v                  # w = -0.2  (big first step)

g2 = torch.tensor([-0.5])        # gradient reverses (other side of ravine)
v = beta * v + g2                # v = 1.8 - 0.5 = 1.3
w = w - eta * v                  # w = -0.33  (velocity damped the reversal)

# Contrast vanilla SGD: after g2 it would have stepped BACK toward zero:
# w_sgd = -0.2 + 0.1*0.5 = -0.15  (oscillation without momentum)`,
            'momentum_step.py',
            'python',
          ),
          tip(
            'The loss-curve signatures of optimizer misconfigurations',
            'Sawtooth oscillation with slow progress: lr too high (any optimizer). Smooth slow crawl: lr too low. Early plateau then sudden improvement after a step drop: healthy cosine/step schedule. Loss spikes then NaN: exploding gradients — check clipping and lr; on Adam, check beta2 and loss scaling under mixed precision.',
          ),
          warn(
            'Do not compare optimizers without equalizing effective learning rate and schedule',
            '"Adam converges faster than SGD" is meaningless unless schedules, warmup, and tuned lrs are matched. Most published optimizer comparisons that fail to tune both sides are measuring the tuning, not the algorithm.',
          ),
        ],
        worked: {
          title: 'Take five steps of SGD, then five of momentum, on a 1-D ravine',
          problem:
            'Scalar loss L(w) = 50*w^2 + w^2 * sin-scaled... simpler: consider the quadratic L(w) = 0.5 * k * w^2 with anisotropy simulated as: gradient g(w) = A * w with A oscillating effective curvature — use the concrete sequence: start w0 = 1.0, lr = 0.1. Vanilla SGD gradients: g(1.0) = 2.0, then curvature flips sign each step in this toy ravine: magnitudes follow |g| = 2|w|. (a) Run 3 vanilla SGD steps with the alternating-sign curvature model g_t = (-1)^t * 2 * w_t. (b) Run the same 3 steps with momentum beta = 0.9, and compare positions. Show momentum\'s damping.',
          steps: [
            {
              title: 'Vanilla SGD, step 1 (t=0, curvature +)',
              desc: 'g0 = +2 * 1.0 = 2.0. w1 = 1.0 - 0.1*2.0 = 0.8. Cross-ravine force pushed us hard.',
              code_snippet: 'w1 = 1.0 - 0.1*2.0 = 0.8',
            },
            {
              title: 'Vanilla SGD, steps 2-3 (curvature flips)',
              desc: 'g1 = -2*0.8 = -1.6 (opposite wall). w2 = 0.8 - 0.1*(-1.6) = 0.96 — almost back to the start: violent oscillation. g2 = +2*0.96 = 1.92; w3 = 0.96 - 0.192 = 0.768. Progress after 3 steps: 1.0 -> 0.768, with a large overshoot in between.',
              code_snippet: 'w2 = 0.8 + 0.16 = 0.96\nw3 = 0.96 - 0.192 = 0.768',
            },
            {
              title: 'Momentum, step 1',
              desc: 'v0 = 0.9*0 + 2.0 = 2.0; w1 = 1.0 - 0.1*2.0 = 0.8. Same first move (velocity starts empty).',
              code_snippet: 'v = 2.0;  w1 = 0.8',
            },
            {
              title: 'Momentum, steps 2-3 — the damping shows',
              desc: 'g1 = -1.6: v = 0.9*2.0 + (-1.6) = 0.2 (momentum mostly cancels the reversal!); w2 = 0.8 - 0.1*0.2 = 0.78. g2 = +2*0.78 = 1.56: v = 0.9*0.2 + 1.56 = 1.74; w3 = 0.78 - 0.174 = 0.606.',
              code_snippet: 'v = 1.8 - 1.6 = 0.2;   w2 = 0.78\nv = 0.18 + 1.56 = 1.74;  w3 = 0.606',
            },
          ],
          solution:
            'After three steps: vanilla SGD at 0.768 (having bounced to 0.96 on the way), momentum at 0.606 — further downhill with the cross-oscillation damped by the accumulated velocity. This is exactly the heavy-ball intuition: oscillating gradient signs cancel inside the velocity term, while consistent downhill components accumulate. Scale this behaviour across millions of coordinates with per-parameter adaptive scaling and you have Adam.',
        },
        practice: {
          title: 'Compare optimizers on a genuine loss surface',
          prompt:
            'On Google Colab, train the same small CNN on CIFAR-10 three times: SGD (lr 0.1, momentum 0.9), Adam (lr 1e-3), AdamW (lr 1e-3, weight_decay 0.01), with an identical cosine schedule. Record final test accuracy and the shape of each loss curve. Write three sentences on what you observed and one hypothesis for WHY (noise, adaptivity, or interaction with the schedule).',
          hint: 'Keep everything identical except the optimizer: same seeds where possible, same batch size, same epochs. Look at curve smoothness as well as final accuracy.',
        },
        mistakes: [
          {
            mistake: 'Assuming the global minimum of the training loss is the goal',
            fix: 'Generalization depends on which low-loss basin you find (flat vs sharp) and the train-test gap, not on the exact training-loss value. Two runs with identical train loss can differ by points of test accuracy.',
          },
          {
            mistake: 'Using full-batch gradient descent because "it is the true gradient"',
            fix: 'Full-batch gradients remove the noise that helps SGD escape saddles and sharp minima, and are wasteful on large datasets. Mini-batches are the default for a reason — GPU utilization AND generalization.',
          },
          {
            mistake: 'Applying weight decay with Adam using the classic L2-in-the-gradient trick',
            fix: 'Under adaptive optimizers, L2-in-the-gradient gets rescaled by 1/sqrt(v_t) per parameter, distorting the intended decay. AdamW applies decay directly to weights, decoupled from the adaptive machinery — use it with Adam by default.',
          },
          {
            mistake: 'Concluding from a 2-D loss plot that you understand a million-D landscape',
            fix: '2-D visualizations slice through a tiny subspace and mislead about saddle prevalence and connectivity. Reason with the statistics of critical points (Hessian eigenvalues) and empirical tools (sharpness probes, mode connectivity), not cartoons.',
          },
        ],
        exam: {
          question:
            'Explain saddle points in high-dimensional loss landscapes, why they are a practical problem for vanilla gradient descent, and how momentum mitigates the stall.',
          answer:
            'A saddle point is a critical point that is a minimum along some directions and a maximum along others; the gradient vanishes there but the loss is not low. Counting arguments show saddles dominate critical points in high dimensions: for a random critical point, Hessian eigenvalue signs behave like a random walk, making the probability that ALL eigenvalues are positive (a true local minimum) vanish exponentially with dimension. Vanilla GD stalls because its step size is proportional to the gradient, which is ~0 at the saddle even though low-loss directions exist nearby. Heavy-ball momentum helps because its velocity accumulates consistent downhill components across steps while cancelling oscillating ones; near a saddle, even tiny but consistent gradients in escape directions build up velocity over several steps, accelerating away — whereas vanilla GD takes ever-smaller steps. Adaptive second-moment methods (Adam/RMSProp) add a complementary fix: dividing by the running RMS of the gradient LIFTS steps in directions with persistently tiny gradients, directly counteracting the stall.',
          source: 'Core GATE deep-learning question and a favourite "probe understanding" interview question for MSc-level candidates.',
        },
        summary: [
          'Loss landscapes are high-dimensional and non-convex; saddles dominate critical points, and flat minima generalize better than sharp ones.',
          'SGD\'s mini-batch noise is a feature: it escapes saddles, rejects sharp basins, and often generalizes better than full-batch GD.',
          'Heavy-ball momentum accumulates consistent downhill velocity and cancels oscillatory components — the ball-in-a-ravine picture, with numbers.',
          'Adam = momentum (first moment) + per-parameter adaptive steps (second moment) + bias correction; AdamW decouples weight decay — the LLM default.',
          'Plain SGD + momentum still wins, sometimes, on large tuned vision workloads; optimizer choice is an empirical, schedule-matched comparison.',
        ],
      }),
      [
        [
          'In high-dimensional non-convex loss landscapes, critical points that dominate in number are:',
          [
            'Strict global minima',
            'Saddle points (minima along some directions, maxima along others)',
            'Points of infinite loss',
            'Perfectly flat plateaus with exactly zero Hessian everywhere',
          ],
          1,
          'Random-matrix arguments show that at a typical critical point the Hessian eigenvalue signs are balanced; requiring ALL of them positive (a true local minimum) is exponentially unlikely in the dimension.',
        ],
        [
          'Heavy-ball momentum damps cross-ravine oscillation because:',
          [
            'It reduces the learning rate automatically',
            'Opposite-signed oscillating gradients cancel inside the accumulated velocity, while consistent downhill components add up',
            'It clips gradients to a fixed range',
            'It increases the batch size',
          ],
          1,
          'The velocity is a discounted sum of past gradients: alternating signs cancel, consistent signs accumulate — exactly the damping effect shown in the worked example.',
        ],
        [
          'The key difference between Adam and AdamW is that AdamW:',
          [
            'Removes the second-moment estimate',
            'Applies weight decay directly to the weights, decoupled from the gradient/adaptive machinery',
            'Uses a larger default learning rate',
            'Is an LSTM optimizer, not for transformers',
          ],
          1,
          'In Adam + L2-style decay, the decay term is rescaled per-parameter by 1/sqrt(v_t), distorting it. AdamW decouples decay from the loss gradient, making the regularisation behave as intended — hence the LLM-world default.',
        ],
        [
          'Mini-batch SGD often generalizes better than full-batch gradient descent primarily because:',
          [
            'Full-batch gradients are mathematically incorrect',
            'The step noise helps escape saddle points and sharp minima, acting as a regulariser',
            'Mini-batches use less memory only',
            'Full-batch training cannot use a GPU',
          ],
          1,
          'Full-batch steps follow the exact gradient — straight into whatever minimum the current basin offers, often sharper ones. Mini-batch noise rejects sharp basins and helps cross saddle plateaus; GPU efficiency is a bonus, not the reason.',
        ],
      ]
    ),
  ],
};
