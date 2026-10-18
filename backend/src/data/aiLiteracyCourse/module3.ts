// Module 3 — Neurons and Neural Networks
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code } from '../nineBlocks';
import { lesson, M3, COURSE_ID } from './helpers';

export const module3: CourseModule = {
  id: M3,
  course_id: COURSE_ID,
  title: 'Module 3 — Neurons and Neural Networks',
  summary:
    'A neuron as weighted inputs plus an activation, layers and why depth helps, what training actually changes (the weights), and loss intuition — arithmetic only, analogies throughout, one fully worked numeric example.',
  sort_order: 3,
  lessons: [
    lesson(
      M3,
      'lit-3-1',
      1,
      'The Artificial Neuron: Weighted Inputs and an Activation',
      'The single smallest unit of every neural network, computed end to end with real numbers — multiply, add, threshold — and why that boring arithmetic is enough to build everything.',
      16,
      nineBlocks({
        objectives: [
          'Compute a neuron\'s output by hand from inputs, weights, a bias and an activation',
          'Explain what a weight means as "how much this input matters"',
          'Explain what the bias does and why it is not just another input',
          'Describe what an activation function adds compared to plain multiplication',
        ],
        hook:
          'Every ChatGPT answer, every face unlock, every generated image passes through billions of copies of one embarrassingly simple calculation: multiply each input by a number, add the results, pass the sum through one small function. That is the entire neuron. The miracle of deep learning is not the unit — it is what emerges when you wire a billion of them together and let data choose the multipliers.',
        concept: `**The calculation.** A neuron receives several numeric inputs: x1, x2, x3 (say a patient's temperature, age and blood pressure, each normalised to a small number). Each input has a **weight**: w1, w2, w3. The neuron computes:

weighted sum = x1×w1 + x2×w2 + x3×w3

then adds a **bias** b, then passes the result through an **activation function** f:

output = f(x1×w1 + x2×w2 + x3×w3 + b)

That is the whole object. Nothing else is hidden.

**Weights are "how much this input matters" — with a sign.** A large positive weight means: when this input is big, push the output up strongly. A weight near zero means: this input barely matters to this neuron. A negative weight means: when this input is big, pull the output down. A neuron trained on the patient example might end up with a large positive weight on temperature (strong signal) and a near-zero weight on age (weak signal for this particular detector). Weights are not hand-chosen by people — they are the numbers that training adjusts. When you hear "the model has learned something", the precise meaning is: useful numbers have settled into the weights.

**The bias is the neuron\'s willingness to fire.** Without bias, the neuron can only say "positive combination of inputs" — its decision surface is forced through the origin. The bias shifts that. Think of a metal detector: the weights decide what the detector is sensitive to (what counts as signal); the bias decides how sensitive — the threshold you set so it does not beep at every bottle cap. High bias: hard to activate, fires only on strong evidence. Low/negative bias: triggers easily. One bias per neuron, one weight per input, always.

**Activation: the bend in the road.** Without an activation function, stacking neurons would collapse into one big linear equation — multiplying and adding lines can only ever produce lines/planes, no matter how many layers you add. The activation is the non-linearity that lets networks learn curves, boundaries, and eventually cat pictures. Historically sigmoid (squashes everything into 0–1) and tanh (−1 to 1) dominated; modern networks mostly use **ReLU** — max(0, input) — which passes positives through unchanged and zeroes out negatives. ReLU won because it is cheap, trains fast, and avoids the "vanishing signal" problems of older squashing functions. Newer variants (GELU, SiLU/Swish) are gentle refinements of the same idea: a simple, differentiable bend.

**A neuron is a detector; a network is a voting system.** One neuron asks one question: "how strong is *my particular* pattern of inputs?" A layer of 128 neurons asks 128 questions at once; the next layer combines those answers into higher-order questions ("is there an eye *and* a nose *and* the right spatial arrangement?"). No single neuron understands anything. Understanding, in the useful engineering sense, is the *pattern of weights across the whole network*. That distinction — unit versus pattern — protects you from the worst neural-network myths: nothing in one weight "means" a concept the way a dictionary entry does; concepts live distributed across many weights, which is also why explaining a trained network is genuinely hard.

One last honest note: the neuron is deliberately *not* a brain cell. Biological neurons are messier and organised differently. The artificial neuron is a small, clean, invented machine — a weighted vote with a threshold — and its power comes from scale and wiring, not from biological fidelity.`,
        extras: [
          table(
            'The parts and their jobs',
            ['Part', 'Job', 'Analogy'],
            [
              ['Inputs (x)', 'The evidence for this situation', 'Symptoms measured at a checkup'],
              ['Weights (w)', 'Importance and sign of each input', 'How seriously you take each symptom'],
              ['Bias (b)', 'Threshold / eagerness to fire', 'How careful the doctor is before flagging'],
              ['Activation (f)', 'Non-linear bend; gates the output', 'A rule like "only escalate if clearly above line"'],
            ],
          ),
          tip(
            'Read weights as stories',
            '"Weight on fever = +2.5, weight on shoe size = +0.01" tells you the neuron uses fever and ignores shoe size. Whenever you see model coefficients, read them like this first — it is the cheapest form of model inspection there is.',
          ),
          warn(
            'Do not map neurons onto brain cells',
            'The name is historical homage, not a mechanism claim. Artificial neurons are weighted sums with a bend; biological neurons involve spikes, timing and chemistry. Analogy fine, identity claim wrong.',
          ),
        ],
        worked: {
          title: 'Compute a spam neuron by hand',
          problem:
            'A neuron scores emails. Inputs: x1 = 0.8 (fraction of ALL-CAPS words), x2 = 1.0 (contains "free money" phrase: 1 yes / 0 no), x3 = 0.2 (sender is in your contacts: 1 yes / 0 no — here 0.2 as a graded trust). Weights: w1 = 2.0, w2 = 3.0, w3 = −4.0. Bias b = −1.5. Activation: ReLU (max with 0). Compute the output. If the spam rule is "output > 1", is this email spam?',
          steps: [
            {
              title: 'Weighted sum',
              desc: 'x1·w1 + x2·w2 + x3·w3 = 0.8×2.0 + 1.0×3.0 + 0.2×(−4.0) = 1.6 + 3.0 − 0.8 = 3.8.',
              code_snippet: '0.8*2.0 + 1.0*3.0 + 0.2*(-4.0) = 3.8',
            },
            {
              title: 'Add bias',
              desc: '3.8 + (−1.5) = 2.3. The bias of −1.5 makes the neuron harder to fire — it demands real evidence.',
              code_snippet: '3.8 + (-1.5) = 2.3',
            },
            {
              title: 'Apply activation',
              desc: 'ReLU(2.3) = max(0, 2.3) = 2.3. (If the sum had been −0.4, ReLU would output 0 — the neuron stays silent.)',
              code_snippet: 'ReLU(2.3) = max(0, 2.3) = 2.3',
            },
            {
              title: 'Decide',
              desc: '2.3 > 1 → spam flag fires. Note the contacts feature pulled hard the other way (−4.0 × 0.2 = −0.8), but caps and the phrase outweighed it.',
            },
          ],
          solution:
            'Output = 2.3; the email is flagged as spam. The neuron "voted" using three graded pieces of evidence: caps and the magic phrase pushed up, being a contact pushed down, and the bias demanded a minimum strength before firing. Training, in the end, is nothing more than finding the w\'s and b\'s that make outputs match labels on thousands of examples like this one.',
        },
        practice: {
          title: 'Be the neuron',
          prompt:
            'Design a "should-I-leave-the-house" neuron with three inputs of your choosing. Assign each input a weight (with at least one negative), a bias, and ReLU as activation. Then compute the output for two different weather scenarios by hand, and say whether the neuron "fires" (output > 0).',
          hint: 'Normalise inputs to roughly 0–1 first (e.g. rain probability). Keep the arithmetic to three multiplications and an add — if it feels simple, you are doing it right.',
        },
        mistakes: [
          {
            mistake: 'Thinking the bias is just another input feature',
            fix: 'Features vary per situation; the bias is a fixed per-neuron threshold that shifts the decision independently of the inputs. Features describe the world; the bias describes the neuron\'s eagerness.',
          },
          {
            mistake: 'Believing one neuron "recognises" a concept by itself',
            fix: 'A neuron detects one linear pattern of weighted inputs. Concepts like "cat" emerge from the coordinated weights of many neurons across layers — never from a single cell.',
          },
          {
            mistake: 'Skipping the activation and wondering why deep networks fail',
            fix: 'Without a non-linearity, a deep stack collapses to a single linear map — all those layers learn nothing extra. The bend is what makes depth worth having.',
          },
          {
            mistake: 'Assuming weights are meaningful before training',
            fix: 'Randomly initialised weights are noise. Their meaning is acquired — shaped by data through training. A weight only "counts as knowledge" after the optimiser has moved it.',
          },
        ],
        exam: {
          question:
            'A neuron has inputs (0.5, 1.0), weights (4.0, −2.0), bias 0.5, and ReLU activation. Compute its output and interpret each component.',
          answer:
            'Weighted sum: 0.5×4.0 + 1.0×(−2.0) = 2.0 − 2.0 = 0.0. Add bias: 0.0 + 0.5 = 0.5. ReLU(0.5) = 0.5. Interpretation: the first input is a strong positive driver (weight 4), the second actively suppresses (weight −2), and the bias nudges the neuron toward firing even when the weighted sum is zero. Output 0.5 — the neuron fires moderately.',
          source: 'Standard hand-computation question in intro neural-network courses and ML interviews.',
        },
        summary: [
          'A neuron: weighted sum of inputs + bias, squashed by an activation — multiply, add, bend.',
          'Weights = importance and direction of each input; they are what training changes.',
          'Bias = threshold/eagerness: how much evidence the neuron demands before firing.',
          'Activation adds the non-linearity that makes multi-layer networks able to learn anything beyond a plane.',
          'Concepts live in patterns of weights across a network, never inside one neuron.',
        ],
      }),
      [
        [
          'Compute a neuron\'s output: inputs (1.0, 0.5), weights (2.0, 2.0), bias −2.0, ReLU activation.',
          ['2.0', '1.0', '0', '3.0'],
          1,
          'Weighted sum = 1.0×2 + 0.5×2 = 3.0; plus bias −2.0 = 1.0; ReLU(1.0) = 1.0.',
        ],
        [
          'The role of a weight in a neuron is to:',
          [
            'Store a memory of one training example',
            'Scale an input\'s contribution by its importance and direction',
            'Count how many layers the network has',
            'Act as the learning rate',
          ],
          1,
          'A weight multiplies one input: large positive = strong push up, negative = push down, near zero = ignore.',
        ],
        [
          'What does the bias term do?',
          [
            'Adds noise for regularisation',
            'Shifts the neuron\'s firing threshold independently of the inputs',
            'Selects the learning rate',
            'Normalises the input data',
          ],
          1,
          'The bias raises or lowers the pre-activation by a constant, controlling how strong the evidence must be before the neuron activates.',
        ],
        [
          'Why do neural networks need a non-linear activation function?',
          [
            'To make training faster on GPUs',
            'Without it, stacked layers collapse into a single linear map and cannot learn curved patterns',
            'To reduce the number of weights',
            'Activations store the model\'s memories',
          ],
          1,
          'Compositions of linear maps are still linear. The non-linear bend is what lets depth express complex decision boundaries.',
        ],
      ]
    ),
    lesson(
      M3,
      'lit-3-2',
      2,
      'Layers and Depth: Why Stacking Neurons Helps',
      'How layers compose simple detectors into hierarchical features — edges to shapes to objects — and why depth beats width in practice.',
      15,
      nineBlocks({
        objectives: [
          'Describe the roles of input, hidden and output layers in a feedforward network',
          'Explain feature hierarchy: how later layers build on earlier ones',
          'Compare adding depth (layers) versus adding width (neurons per layer)',
          'Sketch what an output layer looks like for regression, binary and multi-class tasks',
        ],
        hook:
          'Ask someone to draw "a cat" using only three shapes — and they will fail hilariously. Ask them to compose circles, triangles and arcs, then compose those compositions, and suddenly a cat appears. Hierarchical composition is exactly the trick deep networks learned to automate: simple features combined into complex ones, layer by layer. Depth is not a luxury parameter — it is the architecture\'s core idea.',
        concept: `**The stack.** A typical feedforward network is a chain of layers. The **input layer** receives the raw features (one neuron per feature — pixels, measurements, word-vectors). **Hidden layers** (one or more; "hidden" just means not exposed to the outside world) transform the representation step by step. The **output layer** emits the prediction, shaped to match the task. Information flows one way — input to output — hence "feedforward". (Recurrent networks and Transformers change the wiring; the layering idea stays.)

**The hierarchy intuition, from vision.** In image networks, the layers line up with a feature hierarchy that researchers have actually inspected by visualising what maximally activates each neuron. Early layers learn **edges and gradients** — tiny oriented strokes. Middle layers **combine edges into motifs**: corners, circles, textures, stripes. Later layers **combine motifs into parts and objects**: a wheel, an eye, a face; the final layers respond to whole concepts. No engineer programmed this decomposition; it emerges because predicting pixels (or labels) is easier when you build intermediate representations. Language models show an analogous hierarchy — early layers track local syntax and nearby word relationships; later layers track longer-range meaning and task-relevant abstractions — though the picture is messier than vision\'s clean story.

**Why depth beats width, usually.** You could try one giant wide layer with a million neurons. Practically, this fails: a single layer must learn the entire hierarchy in one linear-then-activate jump, which is exponentially inefficient. Depth lets each layer reuse the previous layer\'s features — layer 50\'s job is much easier because layer 49 already delivered parts, not pixels. This parameter-efficiency is the engineering reason depth won. There are real costs to depth though: vanishing/exploding signals in very deep stacks (solved by residual "skip" connections in ResNets and modern transformers), slower training, and trickier debugging. Width helps when the layer\'s job is genuinely to hold many parallel detectors (think 4,096 neurons in an intermediate LLM layer); depth helps when the job is abstraction steps. Modern best practice: enough width for the layer\'s diversity, enough depth for the abstraction chain, plus architectural tricks to keep signals flowing.

**The output layer is the task\'s fingerprint.** The output layer\'s shape tells you the task at a glance: **one neuron, no activation (or ReLU/linear)** — regression (predict a price); **one neuron, sigmoid** — binary classification (spam probability, a number 0–1); **one neuron per class, softmax** — multi-class classification (scores across 10 digits, normalised to a probability distribution summing to 1). Softmax deserves its name-check: it turns raw scores into probabilities that must add up to 1, which is why "the model is 70% sure" is a meaningful statement only for a properly softmaxed output. When someone shows you a network diagram, reading the output layer first tells you what the network was built to do.

**A note on "how many layers?".** There is no universal number. Classical tabular models: one to three hidden layers often suffice. Vision CNNs and language Transformers: tens to hundreds of layers. The right depth is an empirical question — measured by held-out performance, not by dogma — and a huge modern shortcut is **transfer learning**: take a network already deep and already trained on a massive related dataset, and adapt it. Then you inherit the hierarchy and only re-learn the last mile. That shortcut underlies most applied deep learning today.`,
        extras: [
          table(
            'A five-layer image network, imagined',
            ['Layer', 'What neurons tend to detect', 'Receptive scope'],
            [
              ['Input', 'Raw pixels (e.g. 64×64×3 values)', 'One image'],
              ['Hidden 1', 'Edges, gradients', 'Tiny local patches'],
              ['Hidden 2', 'Corners, textures, stripes', 'Small regions'],
              ['Hidden 3', 'Parts — eyes, wheels, petals', 'Larger regions'],
              ['Output', 'Class scores (cat / dog / bird…)', 'Whole image'],
            ],
          ),
          info(
            'The output layer as task fingerprint',
            'One linear neuron → regression. One sigmoid neuron → yes/no probability. N-way softmax → class probabilities. You can often reconstruct a model\'s entire job description from this one structural detail.',
          ),
          tip(
            'Transfer learning changes the economics',
            'Training a deep hierarchy from scratch needs industrial data and compute. Fine-tuning a pretrained backbone needs a laptop-sized dataset and hours. For 2026 applied work, "start from a pretrained model" is the default, not the advanced option.',
          ),
        ],
        worked: {
          title: 'Read a network from its shape',
          problem:
            'Network A: input 784 → hidden 128 → hidden 64 → output 10 with softmax. Network B: input 20 → hidden 16 → output 1 with sigmoid. State what each task probably is and what each layer contributes.',
          steps: [
            {
              title: 'Decode A',
              desc: '784 = 28×28 grayscale pixels (the classic MNIST-sized input). Output 10 with softmax = ten class probabilities. Task: handwritten digit classification. Hidden 128 and 64 form a compression hierarchy: pixels → stroke features → digit-level evidence.',
            },
            {
              title: 'Decode B',
              desc: '20 tabular features; single sigmoid output = one probability. Task: binary classification — e.g. "will this transaction be flagged?" 16 hidden neurons learn up to 16 nonlinear combinations of the 20 features.',
            },
            {
              title: 'Depth comparison',
              desc: 'A is deeper and narrower-per-layer relative to its input — appropriate because pixels need multi-step composition into shapes. B is shallow because 20 engineered features already are the representation; a deep stack would have little abstraction left to build and would risk overfitting.',
            },
            {
              title: 'Sanity check',
              desc: 'A\'s 784→128 also acts as learned compression — dimensionality reduction tuned to the task, unlike PCA which is task-blind.',
            },
          ],
          solution:
            'A: 10-class digit classifier; its hidden layers learn a stroke-to-shape hierarchy. B: binary classifier on 20 features; its single hidden layer learns nonlinear feature mixes. The output shape fingerprinted both tasks before any code was read.',
        },
        practice: {
          title: 'Design a network on paper',
          prompt:
            'You must classify campus cafeteria queue length (minutes, a number) and, separately, dish popularity (1 of 5 menu items). Specify input size (make up 6 plausible features), hidden-layer shapes, and the exact output layer for each — including activation. Justify each choice in one sentence.',
          hint: 'Regression ends in one linear neuron; 5-way classification ends in 5 softmax neurons. Inputs are features you would actually have at order time.',
        },
        mistakes: [
          {
            mistake: 'Assuming more layers always means better performance',
            fix: 'Depth pays only when the data supports the abstraction chain. On small tabular datasets, deep stacks usually overfit — measured on validation, shallow models frequently win.',
          },
            {
            mistake: 'Expecting a single neuron to correspond to a named real-world concept',
            fix: 'Individual neurons are often polysemantic (responding to mixed patterns); concepts are distributed across populations of neurons. Interpretation is done at the layer or direction level, not usually per neuron.',
          },
          {
            mistake: 'Using sigmoid on every output of a multi-class problem',
            fix: 'Independent sigmoids allow contradictory probabilities (cat 0.9 *and* dog 0.8). For mutually exclusive classes use softmax, which normalises scores into one coherent distribution.',
          },
          {
            mistake: 'Thinking "hidden" means mysterious or uninterpretable by definition',
            fix: 'Hidden means not the network\'s interface. We can and do inspect hidden activations (probing, visualisation, causal patches) — that is how the feature-hierarchy story above was discovered.',
          },
        ],
        exam: {
          question:
            'Explain the hierarchical feature argument for why deep networks outperform shallow ones on images, and give one architectural technique that enabled very deep networks to train successfully.',
          answer:
            'Images have compositional structure: pixels form edges, edges form parts, parts form objects. A deep stack mirrors this decomposition — each layer transforms the previous layer\'s features into more abstract ones, reusing computation. Representing the same hierarchy in a single wide shallow layer requires an explosion of units to cover all combinations; depth represents it with far fewer parameters per abstraction step. Very deep stacks initially suffered from vanishing/exploding signals; residual (skip) connections — adding a layer\'s input directly to its output — restored gradient flow and made networks of 50–100+ layers trainable (ResNet, 2015), after which depth scaled aggressively.',
          source: 'Core deep-learning course question; also common in CV-focused interviews.',
        },
        summary: [
          'Networks are stacks: input features → hidden transformations → task-shaped output.',
          'Depth works by hierarchical composition — edges to parts to wholes; syntax to meaning in language.',
          'Depth beats width for abstraction chains; width supplies parallel detectors per step.',
          'The output layer fingerprints the task: linear (regression), sigmoid (binary), softmax (multi-class).',
          'Transfer learning lets you inherit a pretrained hierarchy instead of paying to build one.',
        ],
      }),
      [
        [
          'In an image classifier, neurons in the earliest hidden layers typically respond most strongly to:',
          ['Whole objects like cars', 'Edges and simple gradients', 'Sentences', 'Final class labels'],
          1,
          'Early layers learn local, simple features (edges/textures); complexity increases with depth.',
        ],
        [
          'A network\'s final layer has 5 neurons with softmax. The task is most likely:',
          ['Regression of 5 prices', 'Binary yes/no decision', '5-class classification', 'Clustering into 5 groups without labels'],
          2,
          'One softmax neuron per mutually exclusive class, probabilities summing to 1, is the multi-class classification signature.',
        ],
        [
          'Why is depth generally more parameter-efficient than extreme width for compositional tasks?',
          [
            'Deep layers have more GPU cache',
            'Each layer reuses the previous layer\'s features, so abstraction steps build on each other instead of being learned in one jump',
            'Narrow layers cannot overfit',
            'Width is illegal in modern frameworks',
          ],
          1,
          'Reuse of intermediate representations is the point: hierarchy is assembled stepwise, requiring fewer units per step than flattening the whole hierarchy into one layer.',
        ],
        [
          'Which technique most directly made 100+ layer networks trainable?',
          ['Softmax outputs', 'Residual (skip) connections', 'Larger learning rates', 'Removing activation functions'],
          1,
          'Skip connections preserve signal/gradient across many layers, fixing the vanishing-signal problem that capped practical depth before ResNets (2015).',
        ],
      ]
    ),
    lesson(
      M3,
      'lit-3-3',
      3,
      'What Training Actually Changes: The Weights',
      'Training demystified: initialise randomly, measure error, nudge every weight a little in the direction that reduces error, repeat — plus gradient descent intuition and the learning rate dial.',
      16,
      nineBlocks({
        objectives: [
          'Describe the training loop in plain language: initialise, predict, measure, adjust, repeat',
          'Explain what a gradient is using the hill-fog analogy, without calculus',
          'Predict the effect of a learning rate that is too large or too small',
          'Clarify what it means to say a model "memorised" data in weight terms',
        ],
        hook:
          'People imagine neural-network training as downloading knowledge, like copying an encyclopedia. It is nothing like that. Training starts with a network that knows literally nothing — every weight is random noise — and the network becomes useful only through millions of tiny nudges, each computed from one question: "if I moved each weight a hair, would my error go down or up?" Training is hill-finding in fog, at a scale of billions of dimensions, repeated for hours on rooms full of GPUs.',
        concept: `**Start from nothing.** Every weight and bias begins as small random numbers (deliberately tiny and balanced so no path dominates early). At step zero, the network\'s outputs are garbage — a coin flip with extra steps. This matters philosophically: everything the model "knows" at the end was squeezed out of the data through adjustment, not pre-loaded. (With pretraining-then-fine-tuning, later training starts from earlier training\'s weights — same mechanism, warmer start. More on that in Module 5.)

**The loop, five steps.** 1) **Predict:** run a batch of examples forward through the current weights. 2) **Measure loss:** compare predictions to the true labels with a loss function — a single number meaning "how wrong am I, on average, on this batch?" (Module 3.4 goes deeper). 3) **Compute gradients:** for each weight, determine the direction and magnitude of change that would most reduce the loss — this is backpropagation, an efficient way of credit-assigning the error backwards through the layers. 4) **Update:** nudge every weight slightly against its gradient — weight = weight − learning_rate × gradient. 5) **Repeat** over many batches and epochs until held-out performance stops improving. That is the entire religion. Every dramatic AI capability is this loop, industrialised.

**Gradient: the direction of steepest descent.** You are standing on a hillside in thick fog and want to reach the valley. You cannot see the valley. But you can feel the slope under your feet in every direction. The gradient is the vector of those slopes: "if I step this way, terrain rises this much; that way, falls that much." Walk opposite the gradient and you descend fastest locally. That is gradient descent. In a neural network the "hillside" is the **loss landscape** — one axis per weight, potentially billions of them — and the "altitude" is the loss. Nobody visualises billions of dimensions; the analogy\'s job is only to fix the *logic*: measure local slope, step downhill, repeat. Local minima and plateaus exist; modern optimisers and architectures navigate them well enough in practice, which is why the method survived fifty years of skepticism.

**Learning rate: the step size, and the dial everyone touches.** Too large a step: you stomp across the valley, bounce up the far slope, and diverge — loss explodes or oscillates forever. Too small: progress is glacial; you may stop on a plateau mistaking it for the bottom; training time and cost balloon. Too well-tuned: steady, reliable descent — loss curves that fall smoothly and flatten. In practice learning-rate schedules (starting larger, annealing smaller), warmup, and adaptive optimisers (Adam and friends, which set per-weight step sizes automatically) do much of the craft work. When a learner "tunes hyperparameters", learning rate is the first knob — it controls whether training learns anything at all, and how fast.

**What "memorising" means in weights.** Overfitting, in weight-language: the optimiser found a configuration that drives training loss to nearly zero by exploiting every quirk of the training set — including noise. The weights have enough capacity to encode the quirks, and gradient descent, faithful to its objective, uses that capacity. Regularisation (next lesson\'s friend) works by making the path of least resistance favour simpler weight configurations. Memorisation is not a malfunction of the algorithm; it is the algorithm succeeding at a target you mis-specified. You asked for "low training error"; you wanted "low error on data I have not seen". The training loop only knows the target you gave it.

One closing reassurance about the mystique: none of this requires the network to "understand" anything. It is statistics and calculus executed at scale — and the results, while not magic, are genuinely remarkable for being *only* that.`,
        extras: [
          table(
            'The loop in five beats',
            ['Beat', 'What happens', 'In one line'],
            [
              ['Initialise', 'Random small weights', 'The model starts knowing nothing'],
              ['Forward pass', 'Predict on a batch', 'Guess first, judge second'],
              ['Loss', 'One number: how wrong', 'The objective, made measurable'],
              ['Backward pass', 'Gradient per weight', 'Blame assignment, layer by layer'],
              ['Update', 'Weights nudged by lr × gradient', 'One small step downhill'],
            ],
          ),
          code(
            `# One gradient-descent update — pure arithmetic
# For each parameter (weight or bias):
new_value = old_value - learning_rate * gradient

# Example: old=0.6, gradient=+0.3, lr=0.1
new_value = 0.6 - 0.1 * 0.3   # = 0.57
# Applied simultaneously to every parameter in the network.`,
            'update_rule.py',
            'python',
          ),
          warn(
            'Loss going down ≠ model getting smarter',
            'Training loss only reflects training data. Watch validation loss too: if training falls while validation rises, the optimiser is faithfully carving out noise. The gradient serves the objective you gave it — including the wrong parts.',
          ),
          tip(
            'Read loss curves like an ECG',
            'Smooth fall then flat: healthy. Jagged explosion at the start: learning rate too high. Flat from the start: learning rate too low or broken inputs. Falling train, rising validation: overfitting. Five minutes of curve-reading prevents weeks of mystery.',
          ),
        ],
        worked: {
          title: 'Follow one weight through one update',
          problem:
            'A single weight w currently equals 0.6. On the current batch, its gradient is +0.3 (meaning: increasing w would increase the loss by about 0.3 per unit change, locally). Learning rate is 0.1. What is the new weight, and why does the sign work that way?',
          steps: [
            {
              title: 'Read the gradient',
              desc: 'Gradient +0.3 means loss rises as w rises — so to REDUCE loss, decrease w.',
              code_snippet: 'gradient = +0.3  # loss increases when w increases',
            },
            {
              title: 'Apply the update rule',
              desc: 'w_new = w_old − learning_rate × gradient = 0.6 − 0.1 × 0.3 = 0.6 − 0.03 = 0.57.',
              code_snippet: 'w_new = 0.6 - 0.1 * 0.3  # = 0.57',
            },
            {
              title: 'Sanity-check the sign',
              desc: 'We moved AGAINST the gradient (subtracting), which is the descent direction. If the gradient had been −0.3, w would have increased to 0.63.',
              code_snippet: '# gradient -0.3 -> w_new = 0.6 - 0.1*(-0.3) = 0.63',
            },
            {
              title: 'Zoom out',
              desc: 'This one nudge changes essentially nothing alone. The magic is repetition: billions of parameters × millions of such nudges × hours of GPU time. The loop shown once is trivial; the loop at scale is the whole field.',
            },
          ],
          solution:
            'w moves from 0.6 to 0.57 — a small step against the gradient, the locally loss-reducing direction. Multiply this micro-story by billions of weights and hundreds of thousands of steps and you have modern training. No step needs to understand the task; the accumulated direction does the work.',
        },
        practice: {
          title: 'Predict the curve, then check if you can',
          prompt:
            'You set learning rate to 1000× the normal value. Predict what the loss curve does in the first hundred steps, and why. Then (optional) in any ML library, train a tiny model with a ridiculous learning rate (e.g. 10) vs a sane one (0.001) and compare the curves.',
          hint: 'Oversized steps overshoot the valley repeatedly — loss oscillates wildly or explodes to infinity (NaN in extreme cases).',
        },
        mistakes: [
          {
            mistake: 'Thinking training "installs" knowledge from a database somewhere',
            fix: 'Weights start random; every bit of competence is carved in by gradient updates on data. There is no external knowledge store — the weights are the model.',
          },
          {
            mistake: 'Believing gradient descent finds the single best possible model',
            fix: 'It finds a good-enough low point reachable from the random start, not a proven global optimum. In practice that suffices; the guarantee is empirical, not mathematical.',
          },
          {
            mistake: 'Equating lower training loss with a better product',
            fix: 'The product runs on unseen data. Training loss is an internal vital sign; validation loss and real-world metrics are the actual health report.',
          },
          {
            mistake: 'Assuming one epoch = one example = one update',
            fix: 'One epoch = one full pass over the training set. With batches of size B, each epoch performs (dataset_size / B) updates. Batch size is its own dial: smaller = noisier steps, larger = stabler but costlier.',
          },
        ],
        exam: {
          question:
            'Describe gradient descent in plain language for a non-technical manager, then explain in one sentence why the learning rate matters.',
          answer:
            '"Imagine the model\'s error is an altitude on a foggy hillside, and the model\'s internal settings are your position. Each training step, we feel the slope underfoot in every direction and take a small step downhill. Repeated thousands of times across the hill, we end up in a valley where error is low." The learning rate sets the step size: too big and we overshoot and bounce erratically; too small and we barely move and training takes forever.',
          source: 'The standard "explain it to a non-technical person" interview question — answer quality separates candidates.',
        },
        summary: [
          'Training starts from random weights; the loop is predict → measure loss → nudge all weights downhill → repeat.',
          'The gradient is the local slope of the loss; training is walking against it, step by tiny step.',
          'Learning rate is the step-size dial: too big diverges, too small crawls, tuned well descends smoothly.',
          'Backpropagation is just efficient blame assignment — distributing the error backwards through layers.',
          'Overfitting is the optimiser succeeding at the wrong target: training error instead of unseen-data error.',
        ],
      }),
      [
        [
          'At the very start of training, a neural network\'s weights are typically:',
          [
            'Loaded from Wikipedia',
            'Random small values — the model initially knows nothing',
            'All set to 1',
            'Already at the optimal solution, then refined',
          ],
          1,
          'Initialisation is random (small and balanced). All competence is acquired through subsequent gradient updates.',
        ],
        [
          'In gradient-descent terms, the gradient at the current weights tells you:',
          [
            'How many layers the network has',
            'The direction that most increases the loss locally (so you step the opposite way)',
            'The exact global minimum',
            'The true labels of the training set',
          ],
          1,
          'Gradient = direction of steepest increase of loss; descent steps against it to reduce loss.',
        ],
        [
          'Training loss explodes into wild oscillations immediately. The most likely cause is:',
          [
            'A learning rate that is far too large',
            'Too little training data',
            'The model being too small',
            'The test set being contaminated',
          ],
          0,
          'Oversized steps leap across the loss valley and up the far side, repeatedly — the classic high-learning-rate signature.',
        ],
        [
          'What does a single gradient update actually change?',
          [
            'The training data',
            'Every weight and bias, each by a small amount computed from its gradient',
            'Only the output layer',
            'The loss function itself',
          ],
          1,
          'Backprop computes a gradient per parameter; the update nudges all of them simultaneously — each by its own tiny amount.',
        ],
      ]
    ),
    lesson(
      M3,
      'lit-3-4',
      4,
      'Loss: How a Model Measures Its Own Wrongness',
      'What a loss function is, why "one number" is the whole trick, the difference between loss and accuracy, and how the choice of loss encodes what you actually care about.',
      15,
      nineBlocks({
        objectives: [
          'Explain the role of a loss function as a single-number score of error',
          'Compute mean squared error and cross-entropy intuition on tiny examples',
          'Distinguish loss (optimisation target) from accuracy/metrics (business judgement)',
          'Explain why the choice of loss encodes what the model is allowed to optimise',
        ],
        hook:
          'You cannot walk downhill if you cannot measure altitude. A neural network cannot improve if it cannot answer one question: "how wrong am I, right now, as a single number?" Everything — every gradient, every weight nudge, every benchmark of modern AI — depends on compressing "how bad are these ten million predictions" into one scalar. The loss function is that compression, and choosing it is choosing what the model is allowed to care about.',
        concept: `**Why one number?** Gradient descent needs a single altitude to descend. The loss function takes the batch\'s predictions and the batch\'s true labels and outputs one number: higher = worse. Without it there is no direction to walk; with it, every weight\'s gradient is derived from "how would a small change in you move this number?". The loss is therefore not a report card — it is the model\'s entire incentive system. The gradients literally follow whatever the loss rewards.

**The two losses you will meet most.** For **regression** (predicting numbers), the workhorse is **mean squared error (MSE)**: for each example, take prediction minus truth, square it, then average across the batch. Squaring makes positive and negative errors add up instead of cancelling, and punishes large misses disproportionately — an error of 10 costs 100, not 10. Intuition for why squared: one catastrophic prediction should hurt more than ten tiny ones in most product contexts. An alternative, mean absolute error (average of |error|), treats all errors linearly and is more robust to occasional wild outliers — a known tradeoff: MSE punishes big misses harder; MAE ignores them less emotionally. For **classification**, the standard is **cross-entropy loss**: a logarithmic penalty that grows sharply as the predicted probability of the true class drops. Predict the true class at 0.99 and the penalty is tiny; at 0.5 it is moderate; at 0.01 it explodes. That shape is deliberate: the model is strongly incentivised to avoid confident wrongness — and warmly rewarded for calibrated confidence. Softmax (outputs) + cross-entropy (loss) is the classic pairing for multi-class problems.

**Loss vs accuracy — the distinction that trips people up.** Loss is the optimisation target: smooth, differentiable, sensitive to confidence. Accuracy is a human metric: what fraction of predictions are outright correct? They can disagree dramatically. A model that predicts the right class at probability 0.51 has *not* improved its accuracy over 0.50, but its loss has already dropped — because it became less unsure. Training optimises loss precisely because loss notices every nudge of improvement, while accuracy moves in clumsy jumps (it stays flat until a prediction flips). This is why you plot both: loss tells you what the optimiser feels; accuracy (or F1, or RMSE) tells you what the stakeholder feels. When they diverge for long — loss falling while the business metric stalls — you have optimised the wrong proxy.

**Choosing the loss IS choosing the goal.** Swap MSE for cross-entropy and the same architecture becomes a different animal. Weight the loss differently per class (say, false negatives cost 10× false positives in disease screening) and the model\'s whole character changes: it becomes trigger-happy on the positive class. In industry this is routine and powerful: fraud models, safety systems and ranking engines all use custom-weighted or custom-shaped losses to encode business tradeoffs the accuracy metric never captured. Two named consequences worth knowing: **class imbalance** (if 99% of data is class A, a lazy model scores 99% accuracy by always predicting A — use balanced loss weighting, or metrics like F1/AUC-PR that refuse to be gamed by majority guessing) and **label noise** (cross-entropy keeps punishing a model for "wrongly" predicting an example whose label is simply incorrect — one reason noisy labels hurt more under cross-entropy than MSE, and one motivation for robust-loss research).

**The full picture of one training step, loss included.** Predict → loss turns (pred, truth) into one number → gradients propagate that number\'s sensitivity back to every weight → each weight is nudged to shrink it. Say it once more with the incentive framing: whatever the loss function rewards, the model will maximise — including things you did not mean to reward. Choose the loss as carefully as you would choose a KPI for a team. It has the same power over behaviour.`,
        extras: [
          table(
            'Loss functions and their worldviews',
            ['Loss', 'Typical task', 'What it penalises', 'Vibe'],
            [
              ['Mean squared error', 'Regression', 'Squared error; large misses disproportionately', 'Order-of-magnitude blunders are unacceptable'],
              ['Mean absolute error', 'Regression (robust)', 'Absolute error, linearly', 'Treat all misses proportionally; less freaked by outliers'],
              ['Cross-entropy', 'Classification', 'Low predicted probability on the true class, logarithmically', 'Confident wrongness is the worst sin'],
              ['Custom weighted', 'Imbalanced / costly decisions', 'Per-class or per-error-type weights', 'Encodes real business asymmetry directly'],
            ],
          ),
          tip(
            'The accuracy paradox trap',
            'On a 1%-fraud dataset, "always predict legit" scores 99% accuracy and is a useless model. Never accept accuracy alone on imbalanced data — demand the loss curve, class-wise metrics, or AUC-PR.',
          ),
          warn(
            'Optimising a proxy is optimising the product',
            'If the loss rewards confidence instead of correctness, you will get overconfident models. If it rewards watch-time instead of satisfaction, you will get rabbit holes (Module 1, Lesson 4). The loss function is the most under-asked question in any AI project: "exactly what number are we minimising, and is it the thing we want?"',
          ),
        ],
        worked: {
          title: 'Compute two losses by hand',
          problem:
            'A regression model predicts delivery times (minutes): predictions [30, 45, 60], truths [25, 50, 55]. A classifier predicts class "spam" (true class) with probabilities 0.9 for one email and 0.05 for another whose true class is also spam. Compute MSE and the cross-entropy penalty shape (using log base e; report two decimals).',
          steps: [
            {
              title: 'MSE',
              desc: 'Errors: 30−25=5, 45−50=−5, 60−55=5. Squares: 25, 25, 25. Mean: (25+25+25)/3 = 25.0.',
              code_snippet: 'errors = [5, -5, 5]\nmse = (25 + 25 + 25) / 3  # 25.0',
            },
            {
              title: 'Cross-entropy, confident & right',
              desc: 'Penalty = −log(0.9) ≈ 0.11. The model said 0.9 on the true class — small slap on the wrist.',
              code_snippet: '-math.log(0.9)  # ≈ 0.11',
            },
            {
              title: 'Cross-entropy, confidently wrong',
              desc: 'Penalty = −log(0.05) ≈ 3.00. About 28× harsher than the first case, despite both being "wrong-or-right" on the same class. That logarithmic cruelty is the point.',
              code_snippet: '-math.log(0.05)  # ≈ 3.00',
            },
            {
              title: 'Interpret',
              desc: 'MSE treated all three delivery errors identically (symmetric around zero). Cross-entropy treated the confident miss as catastrophic relative to the cautious hit — exactly the incentive a spam filter needs.',
            },
          ],
          solution:
            'MSE = 25.0 minutes². Cross-entropy penalties: ≈0.11 (p=0.9) vs ≈3.00 (p=0.05). Same architecture, two different moral universes: one proportional to error size, one exponentially outraged by confident error. Whoever picks the loss picks the morality.',
        },
        practice: {
          title: 'Catch the gamed metric',
          prompt:
            'A fraud team reports "our model hits 99.2% accuracy". Fraud rate is 0.8%. Write the two-sentence takedown: what trivial model also achieves ~99.2%, and what metrics they should show instead (name at least two). Then describe one loss-level fix (weighted loss, different threshold, etc.).',
          hint: 'Always-legit predictions. Ask for precision/recall on the fraud class, AUC-PR, or the confusion matrix — and consider class-weighted loss during training.',
        },
        mistakes: [
          {
            mistake: 'Confusing low loss with high accuracy',
            fix: 'Loss can fall while accuracy is flat (the model is getting less unsure of the same predictions). Track both; optimise the loss, report the metrics stakeholders understand.',
          },
          {
            mistake: 'Accepting accuracy on heavily imbalanced data',
            fix: 'Majority-class guessing games inflate accuracy to meaninglessness. Switch to precision/recall/F1/AUC-PR and inspect the confusion matrix.',
          },
          {
            mistake: 'Using MSE for classification (or cross-entropy for regression) out of habit',
            fix: 'Match the loss to the output shape and error semantics: MSE for continuous values, softmax + cross-entropy for exclusive classes, sigmoid + binary cross-entropy for independent yes/no probabilities.',
          },
          {
            mistake: 'Treating the loss function as a fixed default you never examine',
            fix: 'The loss is the model\'s incentive contract. On any project with real tradeoffs (safety, cost, fairness), the loss — and its weights — deserves the same scrutiny as the data.',
          },
        ],
        exam: {
          question:
            'Explain why a model can have falling training loss while its accuracy on the validation set stays the same, and why training still uses the loss rather than accuracy directly.',
          answer:
            'Accuracy is piecewise-constant: it only changes when a prediction crosses the decision boundary. A model can move probabilities from 0.55 to 0.80 on already-correct predictions — reducing loss substantially (it is becoming more confident and better calibrated) — without a single accuracy point moving. Training uses loss because it is smooth and differentiable everywhere, giving informative gradients even for predictions that are "already right"; accuracy\'s gradients are zero almost everywhere and useless for learning. This is also why cross-entropy + softmax remains the default classification pair: every nudge of confidence registers as progress the optimiser can chase.',
          source: 'Frequent conceptual question in ML fundamentals exams and model-development interviews.',
        },
        summary: [
          'Loss compresses "how wrong is this batch" into one number — the altitude gradient descent descends.',
          'MSE for regression (punishes big misses quadratically); softmax + cross-entropy for classification (punishes confident wrongness logarithmically).',
          'Loss is the optimisation target and incentive contract; accuracy and F1 are the human report cards.',
          'A model can improve in loss long before accuracy moves — confidence counts in loss, not in accuracy.',
          'Imbalance and label noise distort loss-driven training; examine the loss, never the headline accuracy alone.',
        ],
      }),
      [
        [
          'The role of a loss function in neural-network training is to:',
          [
            'Store the training data as a summary',
            'Compress prediction error into one number the optimiser can descend',
            'Replace the test set',
            'Initialise the weights',
          ],
          1,
          'The loss is the single scalar whose gradients drive every weight update — the model\'s incentive system.',
        ],
        [
          'Mean squared error penalises an error of 10 versus an error of 1 by a factor of:',
          ['10×', '100×', '1000×', 'Equally'],
          1,
          'Squaring: 10² = 100 vs 1² = 1 — large misses are penalised quadratically.',
        ],
        [
          'A classifier predicts the true class with probability 0.05. Cross-entropy loss will be:',
          ['Near zero', 'Moderate', 'Large — confidently wrong predictions are punished hardest', 'Undefined'],
          2,
          '−log(0.05) ≈ 3.0: the logarithmic penalty explodes as predicted probability on the true class approaches zero.',
        ],
        [
          'On a dataset with 1% positive cases, "always predict negative" yields 99% accuracy. This illustrates:',
          [
            'An exceptionally well-trained model',
            'Why accuracy alone is misleading under class imbalance — ask for class-wise metrics or AUC-PR',
            'That the loss function is broken',
            'That the test set is too small',
          ],
          1,
          'Majority guessing games inflate accuracy on imbalanced data; the fix is better metrics and usually class-aware losses/thresholds.',
        ],
      ]
    ),
  ],
};
