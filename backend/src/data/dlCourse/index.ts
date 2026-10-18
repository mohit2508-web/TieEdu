// Deep Learning with Neural Networks — an advanced 40-lesson course.
//
// Ten modules, forty nine-block lessons: foundations through transformers
// (Modules 1-5, authored alongside), then embeddings, LLM training, generation,
// PyTorch in practice, and the scaling/serving capstone (Modules 6-10). The
// 30-question final-exam bank is mixed difficulty and topic-tagged so the exam
// engine can draw a balanced paper; answer keys are stripped by
// sanitizeExamQuestions on the public payload.
import type { Course, CourseModule, ExamQuestion } from '../db';
import { module1 } from './module1';
import { module2 } from './module2';
import { module3 } from './module3';
import { module4 } from './module4';
import { module5 } from './module5';
import { module6 } from './module6';
import { module7 } from './module7';
import { module8 } from './module8';
import { module9 } from './module9';
import { module10 } from './module10';

const modules: CourseModule[] = [
  module1,
  module2,
  module3,
  module4,
  module5,
  module6,
  module7,
  module8,
  module9,
  module10,
];

// 30 questions: 10 easy, 12 medium, 8 hard — one strong question per lesson,
// tagged by topic for targeted revision and a balanced draw per attempt.
const examBank: ExamQuestion[] = [
  // Easy — foundations & fundamentals
  {
    id: 'dl-bank-01',
    prompt: 'A network of two linear layers with no activation between them can be replaced by:',
    options: [
      'A deeper nonlinear network with the same expressiveness',
      'A single linear layer — the composition of linear maps is linear',
      'A convolutional layer with kernel size 1',
      'Two linear layers with a softmax between them',
    ],
    correct_index: 1,
    explanation:
      'W2(W1x + b1) + b2 = (W2W1)x + (W2b1 + b2) — still one affine map. Non-linearity between layers is what lets depth carve non-linear decision boundaries.',
    difficulty: 'easy',
    topic: 'foundations',
  },
  {
    id: 'dl-bank-02',
    prompt: 'Backpropagation computes gradients by:',
    options: [
      'Finite differences of the loss with respect to each weight',
      'Running the forward pass a second time with weights nudged',
      'Applying the chain rule in reverse topological order, from the loss back to the inputs',
      'Sampling gradients from the empirical Fisher information',
    ],
    correct_index: 2,
    explanation:
      'Each node stores its local derivative; backward walks the recorded graph in reverse, multiplying local derivatives along each path — one backward pass yields every parameter gradient.',
    difficulty: 'easy',
    topic: 'foundations',
  },
  {
    id: 'dl-bank-03',
    prompt: 'Adam applies the correction 1/(1 - beta2^t) to the second moment estimate because:',
    options: [
      'The moments start at zero, so early estimates are biased toward zero — the correction un-biases them',
      'The learning rate decays too slowly without it',
      'Gradients occasionally contain inf values',
      'Weight decay must be applied before the adaptive step',
    ],
    correct_index: 0,
    explanation:
      'm and v are initialized to 0; at step t their expectation is scaled by (1 - beta^t). Dividing by (1 - beta2^t) (and 1 - beta1^t for m) un-biases the estimates when they matter most — early.',
    difficulty: 'easy',
    topic: 'optimizers',
  },
  {
    id: 'dl-bank-04',
    prompt: 'A Conv2d layer with in_channels=3, out_channels=16, kernel_size=3x3 and bias has how many parameters?',
    options: ['432', '1600', '464', '448'],
    correct_index: 3,
    explanation:
      'Weights: 3 x 16 x 3 x 3 = 432, bias: 16 — total 448. Parameter count of a conv is C_out x (C_in x k x k) + C_out, independent of input spatial size.',
    difficulty: 'easy',
    topic: 'cnn',
  },
  {
    id: 'dl-bank-05',
    prompt: 'In an LSTM, the gate that multiplies the candidate cell update (tanh of the new input) is the:',
    options: ['Forget gate', 'Input gate', 'Output gate', 'Peephole connection'],
    correct_index: 1,
    explanation:
      'c_t = f_t * c_{t-1} + i_t * tanh(...): the input gate i_t decides how much of the NEW candidate is written; the forget gate decides how much of the OLD cell survives.',
    difficulty: 'easy',
    topic: 'sequences',
  },
  {
    id: 'dl-bank-06',
    prompt: 'In scaled dot-product attention, softmax is applied:',
    options: [
      'Across all elements of the score matrix at once',
      'Across each column (over queries for each key)',
      'Across each row — one probability distribution per query over the keys',
      'Across the channel dimension of the values',
    ],
    correct_index: 2,
    explanation:
      'Each query row scores every key; softmax over that row makes the attention weights for one query sum to 1, so the output is a convex combination of value vectors.',
    difficulty: 'easy',
    topic: 'attention',
  },
  {
    id: 'dl-bank-07',
    prompt: 'The cosine similarity between a vector v and the vector 3v is:',
    options: ['1.0', '0.33', '3.0', '0.0'],
    correct_index: 0,
    explanation:
      'Cosine ignores magnitude: cos(v, 3v) = (v . 3v) / (||v|| ||3v||) = 3||v||^2 / (3||v||^2) = 1 — direction is identical, which is why cosine is scale-invariant for embeddings.',
    difficulty: 'easy',
    topic: 'embeddings',
  },
  {
    id: 'dl-bank-08',
    prompt: 'Byte-level BPE tokenizers cannot produce an out-of-vocabulary token because:',
    options: [
      'They cap vocabulary size below 10,000 tokens',
      'The vocabulary contains all 256 byte values, so any byte string is representable as a fallback',
      'They store every word seen during training',
      'They fall back to character-level models at inference',
    ],
    correct_index: 1,
    explanation:
      'Every string is a sequence of bytes; unseen inputs degrade to single bytes rather than UNK — the property that makes OOV impossible at the cost of longer token sequences for rare content.',
    difficulty: 'easy',
    topic: 'llm-training',
  },
  {
    id: 'dl-bank-09',
    prompt: 'Greedy decoding produces:',
    options: [
      'The globally most probable sequence',
      'The token with the highest unigram probability in the vocabulary',
      'A temperature-scaled sample from the output distribution',
      'At each step the locally highest-probability next token — which is not guaranteed to be the best sequence',
    ],
    correct_index: 3,
    explanation:
      'Per-step argmax optimizes each conditional independently; local choices do not compose into a global optimum (an early "great" token can lead to a low-probability continuation) — and greedy loops.',
    difficulty: 'easy',
    topic: 'sampling',
  },
  {
    id: 'dl-bank-10',
    prompt: 'In PyTorch, gradients from one backward() call persist across steps unless you:',
    options: [
      'Call opt.zero_grad() (or set grads to None) before the next backward',
      'Wrap every backward() in torch.no_grad()',
      'Call retain_graph=True on every backward()',
      'Rebuild the optimizer each epoch',
    ],
    correct_index: 0,
    explanation:
      'Autograd accumulates into .grad with += (by design — DDP and gradient accumulation sum across micro-batches). Reset per step or per accumulation window, or the optimizer sees stale summed gradients.',
    difficulty: 'easy',
    topic: 'pytorch',
  },
  // Medium
  {
    id: 'dl-bank-11',
    prompt: 'During evaluation, a model with BatchNorm layers uses:',
    options: [
      'The current minibatch mean and variance, as in training',
      'The weights beta and gamma only, with no normalization',
      'Running (exponential moving average) statistics accumulated during training',
      'Statistics from the validation set as a whole',
    ],
    correct_index: 2,
    explanation:
      'model.eval() switches BN to its stored running stats — batch statistics would make predictions depend on which other examples share the minibatch (and a batch of 1 would break).',
    difficulty: 'medium',
    topic: 'regularization',
  },
  {
    id: 'dl-bank-12',
    prompt: 'Inverted dropout (scale during training, nothing at test time) exists so that:',
    options: [
      'Training runs faster with fewer active units',
      'The expected activation at train time equals the activation at test time',
      'Test-time activations match training-time activations only after renormalizing',
      'Dropout can be applied to the loss instead of the activations',
    ],
    correct_index: 1,
    explanation:
      'Units are kept with prob p and scaled by 1/p, so E[output] is unchanged — train and test see the same scale. Scaling at TEST time instead would systematically shrink activations.',
    difficulty: 'medium',
    topic: 'regularization',
  },
  {
    id: 'dl-bank-13',
    prompt: 'A network applies 5x5 conv (stride 1), then 5x5 conv (stride 1), then 2x2 max-pool (stride 2). The receptive field of the output neuron is:',
    options: ['7x7', '8x8', '10x10', '14x14'],
    correct_index: 2,
    explanation:
      'Receptive field grows as r += (k - 1) x jump: 1 -> 5 -> 9 after the two convs (jump still 1), then pooling adds (2-1) x 1 = 1 -> 10, with jump now 2 for the next layer.',
    difficulty: 'medium',
    topic: 'cnn',
  },
  {
    id: 'dl-bank-14',
    prompt: 'For a ResNet block y = F(x) + x with an identity shortcut, the shortcut guarantees that:',
    options: [
      'The gradient of the loss w.r.t. x includes an additive identity path — gradients reach early layers even if F learns nothing',
      'The block can never overfit',
      'F is always smaller than the identity map',
      'The output equals the input in every trained network',
    ],
    correct_index: 0,
    explanation:
      'dL/dx = dL/dy x (dF/dx + 1): the +1 term is a gradient highway unaffected by F — no vanishing through the block. F only has to learn a residual, which is why deep ResNets train at all.',
    difficulty: 'medium',
    topic: 'resnet',
  },
  {
    id: 'dl-bank-15',
    prompt: 'Layer-wise learning-rate decay when fine-tuning a pretrained backbone means:',
    options: [
      'All layers get the same decayed LR from the scheduler',
      'Early layers are reinitialized and trained from scratch',
      'Later (task-specific) layers use a higher LR than earlier (generic) layers',
      'The head is frozen while the backbone trains',
    ],
    correct_index: 2,
    explanation:
      'Early layers hold generic features (edges, textures) that transfer — tiny updates preserve them; later layers must change most for the new task, so the LR grows toward the top of the stack.',
    difficulty: 'medium',
    topic: 'transfer',
  },
  {
    id: 'dl-bank-16',
    prompt: 'Full backpropagation through time over a sequence of length T stores activations for:',
    options: [
      'Only the final hidden state',
      'All T time steps until backward completes — memory grows linearly with T',
      'A fixed window regardless of T',
      'Only the layers, not the steps',
    ],
    correct_index: 1,
    explanation:
      'Each step’s activation is needed to compute that step’s gradient, so the graph holds O(T) state — the reason for truncated BPTT (and for attention’s parallelism, which sidesteps the recurrence entirely).',
    difficulty: 'medium',
    topic: 'sequences',
  },
  {
    id: 'dl-bank-17',
    prompt: 'A transformer with d_model = 512 and 8 attention heads projects each head into a subspace of dimension:',
    options: ['64', '128', '256', '512'],
    correct_index: 0,
    explanation:
      '512 / 8 = 64 per head. Total Q/K/V parameter count is unchanged by the head count (3 x 512 x 512) — heads only repartition the same capacity into parallel subspaces.',
    difficulty: 'medium',
    topic: 'attention',
  },
  {
    id: 'dl-bank-18',
    prompt: 'Applying a causal mask (upper triangle set to -inf) before softmax means:',
    options: [
      'Every position attends only to itself',
      'The lower triangle is zeroed',
      'Keys and values are swapped',
      'Future positions receive zero attention weight exactly — position t can only see tokens <= t',
    ],
    correct_index: 3,
    explanation:
      '-inf pre-softmax maps to probability 0 post-softmax, so each query row covers only past-and-present tokens — this is what makes decoder-only generation legal without leakage from the future.',
    difficulty: 'medium',
    topic: 'transformers',
  },
  {
    id: 'dl-bank-19',
    prompt: 'In the InfoNCE contrastive objective, the negatives for an anchor are typically:',
    options: [
      'Random noise vectors',
      'Augmentations of the anchor itself',
      'The other samples in the same batch (in-batch negatives)',
      'Only examples from different datasets',
    ],
    correct_index: 2,
    explanation:
      'Each in-batch sample is a negative for every other anchor — batch size directly sets the number of distractors, which is why contrastive pretraining wants very large batches (and why the loss hardens with more negatives).',
    difficulty: 'medium',
    topic: 'embeddings',
  },
  {
    id: 'dl-bank-20',
    prompt: 'Sorted next-token probabilities are [0.809, 0.109, 0.066, 0.015]. Nucleus (top-p) sampling with p = 0.9 retains:',
    options: ['1 token', '2 tokens', '3 tokens', '4 tokens'],
    correct_index: 1,
    explanation:
      'Cumulative: 0.809 < 0.9, then 0.809 + 0.109 = 0.918 >= 0.9 — the smallest set reaching 90% mass is the top 2; sampling then renormalizes over them (0.881 / 0.119).',
    difficulty: 'medium',
    topic: 'sampling',
  },
  {
    id: 'dl-bank-21',
    prompt: 'With micro-batch 8, gradient accumulation 4, and 4 GPUs in DDP, the effective batch size is:',
    options: ['128', '32', '512', '8'],
    correct_index: 0,
    explanation:
      '8 x 4 x 4 = 128 — memory scales with the micro-batch (8), optimizer statistics with the effective batch (128). Schedulers must count optimizer updates (micro-steps / 4), not micro-steps.',
    difficulty: 'medium',
    topic: 'pytorch',
  },
  {
    id: 'dl-bank-22',
    prompt: 'A language model reports a mean negative log-likelihood of 2.3026 nats per token. Its perplexity is:',
    options: ['≈ 2.30', '≈ 6.93', '≈ 10.0', '≈ 20.1'],
    correct_index: 2,
    explanation:
      'Perplexity = exp(mean NLL) = e^2.3026 = 10.0 — the model behaves like a uniform 10-way guess on average. Compute from TOTAL NLL / total tokens, and compare only across identical tokenizers.',
    difficulty: 'medium',
    topic: 'deployment',
  },
  // Hard
  {
    id: 'dl-bank-23',
    prompt: 'For sequence length T = 2048 and head dimension d = 4096, the two attention matmuls (QK^T and the weighted value product) cost approximately:',
    options: ['0.69 GFLOPs', '6.9 GFLOPs', '690 GFLOPs', '69 GFLOPs'],
    correct_index: 3,
    explanation:
      'Each matmul is 2 x T^2 x d FLOPs; both together 4T^2d = 4 x 2048^2 x 4096 ≈ 6.87 x 10^10 ≈ 69 GFLOPs per layer — quadratic in T, which is why long context costs attention both in time and in KV memory.',
    difficulty: 'hard',
    topic: 'attention',
  },
  {
    id: 'dl-bank-24',
    prompt: 'Using the Chinchilla compute-optimal relations D ≈ 20N and C ≈ 6ND, a budget of C = 6 x 10^23 FLOPs supports approximately:',
    options: ['71B params trained on 1.4T tokens', '7B params trained on 140B tokens', '707B params trained on 7T tokens', '71B params trained on 140B tokens'],
    correct_index: 0,
    explanation:
      'N* = sqrt(C/120) = sqrt(5 x 10^21) ≈ 7.07 x 10^10 ≈ 71B parameters; D = 20N ≈ 1.4T tokens. Spending the same C on a 707B model would starve it of tokens and lose to the smaller, fully-trained one.',
    difficulty: 'hard',
    topic: 'llm-training',
  },
  {
    id: 'dl-bank-25',
    prompt: 'For sets A and B, the probability that a single MinHash signature of A equals that of B is:',
    options: [
      'The intersection size |A ∩ B|',
      'The Jaccard similarity |A ∩ B| / |A ∪ B|',
      'The cosine similarity of their frequency vectors',
      '1 minus the Jaccard similarity',
    ],
    correct_index: 1,
    explanation:
      'A random-permutation minimum hash is equal exactly when the first shared element (in permutation order) is in the intersection — a classic probability argument giving P[match] = J(A, B). Estimating agreement across many hashes approximates Jaccard, powering near-duplicate detection in pretraining corpora.',
    difficulty: 'hard',
    topic: 'llm-training',
  },
  {
    id: 'dl-bank-26',
    prompt: 'Classifier-free guidance with w = 7.5, eps_cond = [0.2, 0.5] and eps_uncond = [0.4, 0.4] yields eps~ =',
    options: ['[-0.2, 0.1]', '[-0.9, 1.1]', '[-1.3, 1.25]', '[1.7, 4.25]'],
    correct_index: 2,
    explanation:
      'eps~ = (1+w) eps_cond - w eps_uncond = 8.5 x [0.2, 0.5] - 7.5 x [0.4, 0.4] = [1.7 - 3.0, 4.25 - 3.0] = [-1.3, 1.25] — equivalently e_u + 8.5 (e_c - e_u); the prompt direction is amplified 8.5x.',
    difficulty: 'hard',
    topic: 'diffusion',
  },
  {
    id: 'dl-bank-27',
    prompt: 'An AMP training run turns its loss into NaN at step 43,001. The correct first action is to:',
    options: [
      'Restart from scratch with the learning rate cut 10x and a new seed',
      'Inspect the grad-norm, LR, and GradScaler-scale traces at and just before the NaN step, then resume from the last clean checkpoint',
      'Delete checkpoints and rerun without AMP',
      'Disable all evaluation loops, which usually cause the NaN',
    ],
    correct_index: 1,
    explanation:
      'The traces discriminate causes cheaply: an fp16 overflow shows in scale/skip counters, an LR spike in the LR trace, corrupt data in the grad-norm jump at exactly one step. Diagnose first, change one thing, resume — never discard the clean state.',
    difficulty: 'hard',
    topic: 'pytorch',
  },
  {
    id: 'dl-bank-28',
    prompt: 'Symmetric int8 quantization of a tensor with max|w| = 0.08 guarantees a per-weight error of at most:',
    options: ['3.15e-4', '6.3e-4', '8.0e-4', '1.6e-3'],
    correct_index: 0,
    explanation:
      's = 0.08 / 127 = 6.299e-4; round() places every weight within half a step: error <= s/2 = 3.15e-4. Per-channel/per-group scales shrink the effective s further where outliers live.',
    difficulty: 'hard',
    topic: 'deployment',
  },
  {
    id: 'dl-bank-29',
    prompt: 'A GQA model (L = 32 layers, n_kv = 8 heads, d_head = 128) runs T = 4096 context at batch 8 with fp16 K and V. The KV cache holds approximately:',
    options: ['0.5 GB', '16.2 GB', '8.6 GB', '4.3 GB'],
    correct_index: 3,
    explanation:
      'Bytes = B x L x T x n_kv x d_head x 2 (K and V) x 2 B = 8 x 32 x 4096 x 8 x 128 x 2 x 2 = 4.29 x 10^9 B ≈ 4.3 GB (4.0 GiB). Full MHA (32 KV heads) would be 4x that — GQA is a memory feature as much as a quality trade.',
    difficulty: 'hard',
    topic: 'deployment',
  },
  {
    id: 'dl-bank-30',
    prompt: 'Run: 60,000 samples, batch 128, drop_last=True, 10 epochs, gradient accumulation 4. The optimizer performs exactly how many updates?',
    options: ['4,680', '468', '1,170', '2,340'],
    correct_index: 2,
    explanation:
      'Batches/epoch = floor(60,000 / 128) = 468 (the 96-sample tail is dropped); micro-steps = 468 x 10 = 4,680; optimizer updates = 4,680 / 4 = 1,170 with no remainder. LR warmup/decay must span 1,170 steps — counting the 4,680 micro-steps instead decays the schedule 4x too fast.',
    difficulty: 'hard',
    topic: 'pytorch',
  },
];

export function getDeepLearningCourse(): Course {
  return {
    id: 'crs-deep-learning',
    slug: 'deep-learning-neural-networks',
    title: 'Deep Learning with Neural Networks',
    subtitle:
      'Forty lessons from the perceptron to shipped transformers — backprop by hand, attention arithmetic, LLM training pipelines, PyTorch debugging, and a capstone you can defend line by line',
    description: `Deep learning is not a bag of architectures — it is one chain of ideas: the chain rule makes layers learn, scale makes gradient descent survive depth, convolutions and attention are two answers to the same locality-and-relationship problem, and every training run since 2015 is the same loop with better bookkeeping.

This advanced course walks that chain end to end in forty lessons across ten modules. Modules 1–5 build the foundations and the vision/sequence/transformer stack with hand-computable arithmetic at every step. Modules 6–10 go where most courses stop: embeddings and contrastive learning, the full LLM training pipeline (data, tokenizer, scaling laws, post-training), decoding and diffusion, PyTorch as an engineering system (autograd, data loops, AMP, checkpointing), and finally the economics — compression, serving, honest evaluation, and a capstone design document with every number attached.

**Who this is for:** final-year students and engineers who can already train a model with a tutorial and now want to know exactly what happens inside it — and to pass the interviews that ask.`,
    category: 'AI & Data Science',
    level: 'advanced',
    is_free: true,
    price_inr: 0,
    thumbnail_url: '',
    thumbnail_alt: 'Deep Learning with Neural Networks course cover',
    tags: ['deep-learning', 'neural-networks', 'pytorch', 'transformers', 'cnn', 'advanced'],
    outcomes: [
      'Derive forward and backward passes with the chain rule, and verify them against autograd',
      'Choose optimizers, schedules, initialization and regularization with quantified justification',
      'Design CNN, ResNet and transfer-learning pipelines using receptive-field and parameter arithmetic',
      'Explain RNN/LSTM dynamics and hand-compute gate updates and truncated BPTT trade-offs',
      'Derive multi-head self-attention, causal masking, and the FLOPs/memory budgets of any transformer',
      'Build and evaluate embeddings with similarity, analogy and contrastive (InfoNCE) objectives',
      'Run an LLM training pipeline: data quality, BPE, scaling laws, SFT/RLHF/DPO post-training',
      'Control generation: greedy vs beam, temperature/top-k/top-p arithmetic, and diffusion sampling',
      'Train with PyTorch like an engineer: autograd internals, DataLoader correctness, AMP, accumulation, checkpoint/resume, NaN debugging',
      'Compress, serve and evaluate honestly: quantization bounds, distillation, TTFT/TPOT/KV budgets, contamination, and cost per million tokens',
    ],
    prerequisite_course_id: null,
    certificate_eligible: true,
    published: true,
    created_at: '2026-10-15T09:00:00.000Z',
    updated_at: '2026-10-15T09:00:00.000Z',
    instructor_id: null,
    about_course: `Forty lessons, ten modules, one continuous argument. Every lesson follows the same nine steps — objective, hook, concept, worked example, practice task, common mistakes, exam/interview angle, quiz, summary — and every worked example is arithmetic you can redo on paper: parameter counts, receptive fields, gradient values, attention FLOPs, scaling budgets, quantization error bounds.

Modules 1–4 rebuild the field from first principles: perceptron to MLP, activations and backprop with real numbers, loss-surface geometry, the optimizer ladder (SGD → Adam/AdamW), schedules and warmup, initialization and batch norm, dropout and clipping; then convolutions with output-size and receptive-field arithmetic, the LeNet-to-VGG race, ResNet's identity-shortcut insight, transfer learning, and the RNN line — unrolling, BPTT, vanishing gradients, LSTM/GRU gate surgery, and the single-vector bottleneck that motivated attention.

Module 5 assembles the transformer block by block with a full hand-computed attention matrix, multi-head and positional encoding, masked vs cross attention, the BERT/GPT split, and the FLOP/parameter formulas that let you read any model card. Module 6 turns to embeddings: word2vec-era objectives to contrastive learning with InfoNCE and probing. Module 7 is the modern LLM pipeline — deduplicated data, byte-level BPE, Chinchilla-era scaling laws, and post-training from SFT to RLHF/DPO. Module 8 covers generation as search and sampling: greedy/beam with length normalization, temperature/top-k/top-p on real logits, repetition control and speculative decoding, then diffusion models with hand-computed guidance. Module 9 makes PyTorch an engineering system — tensors as strided views, autograd as the recorded chain rule, Dataset/DataLoader contracts with an annotated training loop, and AMP/accumulation/clipping/checkpointing with the NaN-debugging playbook. Module 10 closes with capacity-vs-data recipes, compression, serving and evaluation economics, and the capstone: a full system design defended with arithmetic.

The interview thread runs through all of it: "backprop this network by hand", "why does attention divide by sqrt(d)", "your validation is 27 points below training — diagnose it", "size the KV cache", "what does this run cost". By the end you have answered all of them yourself, with numbers.`,
    prerequisites: [
      'Fluency in Python — classes, comprehensions, virtual environments, reading framework source',
      'Machine learning fundamentals: train/validation/test discipline, loss functions, gradient descent (a first ML course or equivalent experience)',
      'Linear algebra comfort (matrix shapes, multiplication) and calculus (chain rule) — notation is glossed but never introduced from zero',
      'A machine with 8 GB RAM for the exercises; a GPU helps (free Colab-class tier is enough) but the first half runs on CPU',
    ],
    audience: [
      'Final-year students and job-seekers targeting ML/DL engineer interviews',
      'Software engineers moving into applied deep learning who want first-principles depth',
      'Practitioners who have trained models by recipe and now need to debug, compress, and ship them',
      'Anyone preparing for advanced exams where backprop, attention, and training-system questions carry the marks',
    ],
    audio_language: 'English',
    caption_language: 'English',
    branch: 'ai-ds',
    branch_label: 'AI/DS primary — open to all branches',
    bucket: 'B',
    certificate_tier: 'premium',
    estimated_hours: 24,
    perks: [
      { key: 'certificate', label: 'Verifiable certificate' },
      { key: 'xp', label: 'XP on the leaderboard' },
      { key: 'exam', label: '30-question final exam with distinction track' },
      { key: 'capstone', label: 'Capstone system-design project' },
    ],
    exam_prep: {
      target: 'University AI/Deep Learning examinations and ML engineering interviews',
      units: [
        {
          title: 'Neural network foundations (Modules 1–2)',
          summary:
            'Perceptron = one hyperplane; XOR kills it; MLP + non-linearity = arbitrary boundaries. Backprop = reverse-mode AD: forward records, backward applies chain rule, cost ≈ forward. Loss surfaces are non-convex but survivable (saddle points, noise). Optimizers: SGD → momentum → Adam (bias correction 1/(1-b^t)) → AdamW (decoupled decay). Schedules: cosine/cyclical/step + linear warmup; linear scaling rule for batch size. Init: Xavier (tanh/sigmoid), He (ReLU) from variance arguments; BN normalizes pre-activations with EMA stats at eval. Dropout = inverted-scaled subnetwork ensemble; clip by norm; weight decay.',
          questions: [
            'Why is a stack of linear layers equivalent to a single linear layer?',
            'Derive the backprop update for a 2-layer net with one hidden unit and numeric inputs.',
            'Why does Adam need bias correction, and what fails without it on step 1?',
          ],
          pyqs: [],
        },
        {
          title: 'Vision architectures (Module 3)',
          summary:
            'Conv output: floor((W + 2P - K)/S) + 1; weight sharing = translation equivariance + few params. Receptive field: r += (k-1) x jump; pooling downsamples without parameters. LeNet → AlexNet → VGG (uniform 3x3): each era fixes the previous bottleneck. ResNet: degradation problem (20 worse than 16 layers) → identity shortcuts keep an additive gradient highway; bottleneck 1x1/3x3/1x1 for FLOP control. Transfer: features transfer early-generic, late-specific → freeze head, fine-tune with layer-wise LR decay; small data = stronger freeze.',
          questions: [
            'Compute parameters of Conv(3→16, 3x3, bias) and explain why input size does not matter.',
            'Why does the identity shortcut fix the degradation problem — argue with gradients.',
            'When do you freeze the whole backbone, and when do you unfreeze it with a low LR?',
          ],
          pyqs: [],
        },
        {
          title: 'Sequences: RNN to attention (Module 4)',
          summary:
            'One recurrence, unrolled = a deep net sharing weights across time; BPTT is ordinary backprop on that graph — memory O(T), gradients are products of the same Jacobian → vanish/explode. LSTM: forget/input/output gates, cell state as the gradient highway; GRU merges two gates. Bidirectional encoders, stacked layers, seq2seq handoff. Fixed-vector bottleneck: squeezing a sentence into one vector must lose information → Bahdanau attention: learn to look back at encoder states, differentiably — the bridge to transformers.',
          questions: [
            'Explain vanishing gradients in a tanh RNN with the Jacobian-product argument.',
            'What does each LSTM gate control, and what does the cell state buy over a plain hidden state?',
            'Why must an encoder-decoder use attention instead of one final state for long sentences?',
          ],
          pyqs: [],
        },
        {
          title: 'Transformers (Module 5)',
          summary:
            'Attention = content-based retrieval: softmax(QK^T / sqrt(d_k)) V — scaled so softmax does not saturate. h heads = parallel subspaces, d/h each, concat back; params independent of h. Positional encoding (sinusoidal/learned/relative) injects order into an order-blind operator. Decoder masking (causal) makes generation legal; cross-attention replaces recurrence for alignment. BERT (masked prediction → understanding) vs GPT (next-token → generation). Training/inference split: prefill parallel, decode sequential with KV cache. Parameter/FLOP formulas read any model card: memory = params x bytes (+ optimizer x4 for training).',
          questions: [
            'Why divide attention scores by sqrt(d_k)? What goes wrong without it?',
            'Derive parameter counts for Q/K/V/O projections at d=512 with and without multi-head.',
            'Compute attention FLOPs for T=2048, d=4096 and the KV-cache bytes for a GQA config.',
          ],
          pyqs: [],
        },
        {
          title: 'Embeddings & contrastive learning (Module 6)',
          summary:
            'Word2vec/GloVe era → contextual embeddings → contrastive learning: positives = augmented/same-class views, negatives = everything else; InfoNCE = classify the true positive among in-batch negatives. Temperature controls hardness. Cosine similarity is scale-invariant; analogy arithmetic (king - man + woman). Probing: can a linear classifier read feature X from the representation? Dimensionality trade-off: capacity vs sparsity of signal vs downstream data.',
          questions: [
            'State the InfoNCE loss and explain why batch size acts as the number of negatives.',
            'Why is cosine similarity invariant to scaling — and when would you prefer dot product?',
            'How do you measure whether an embedding space encodes syntax or sentiment (probing)?',
          ],
          pyqs: [],
        },
        {
          title: 'LLM training pipeline (Module 7)',
          summary:
            'Data: crawl → dedup (MinHash P(match) = Jaccard) → quality filters → PII removal — quality beats quantity. Tokenizer: byte-level BPE, merges learned from corpus, no OOV; bits-per-byte for cross-tokenizer comparison. Scaling laws: loss = a/N^a + b/D^b + c; Chinchilla C ≈ 6ND, compute-optimal D ≈ 20N. Post-training: continued pretraining → SFT on demonstrations → preference data → RLHF (reward model + PPO, sigmoid(1.7) style reward margins) or DPO (implicit reward = log-ratio, margin -0.07 → loss 0.729).',
          questions: [
            'What does deduplication with MinHash estimate, and why does near-dup data hurt evals?',
            'Given C = 6 x 10^23, compute compute-optimal N and D (Chinchilla).',
            'Contrast SFT, RLHF and DPO: what signal does each optimize and what breaks in each?',
          ],
          pyqs: [],
        },
        {
          title: 'Generation & sampling (Module 8)',
          summary:
            'Decoding = heuristic search over V^T sequences. Greedy = local argmax (repeats, suboptimal); beam tracks B hypotheses but needs length normalization (raw sum biases short) and collapses diversity on open-ended text. Sampling: temperature reshapes logits (softmax(z/T)), top-k truncates to k, top-p keeps the smallest set with cumulative prob >= p (our logits: p=0.9 keeps 2 tokens). Repetition penalties fix loops; speculative decoding drafts k, verifies in one forward — acceptance rate sets the speedup. Diffusion: closed-form noising x_t = sqrt(abar)x_0 + sqrt(1-abar)eps, train eps-prediction with MSE, sample via DDPM/DDIM; CFG eps~ = (1+w)eps_c - w eps_u; latent diffusion = same math on 48x-compressed latents.',
          questions: [
            'Why is greedy decoding not the MAP sequence? Fix it with beam search + length normalization.',
            'Compute top-p retention and the renormalized distribution for a given logit vector.',
            'Derive classifier-free guidance and compute eps~ for w = 7.5 on example vectors.',
          ],
          pyqs: [],
        },
        {
          title: 'PyTorch, scaling & serving (Modules 9–10)',
          summary:
            'Tensor = storage + (shape, stride, offset); transpose is a view; fp32 4B/fp16 2B/int8 1B — Adam training = 4x fp32 per param before activations. Autograd records a DAG forward; backward walks it in reverse; gradients ACCUMULATE (zero_grad per step); create_graph for second order; no_grad for eval. DataLoader: __len__/__getitem__ + collate; batches = ceil/floor(N/B); updates = micro/accum; metrics from totals, never batch-means. AMP: fp16 needs GradScaler (scale → unscale → skip+halve on inf, double after 2000 clean); clip_grad_norm_ shrinks only above max_norm; checkpoint = weights+optimizer+scheduler+scaler+RNG, atomic. Compression: int8 error <= s/2, int4 decode bandwidth 4x ceiling, distillation (1-a)CE + aT^2KL, structured vs 2:4 pruning. Serving: TTFT = prefill (compute-bound), TPOT = decode (bandwidth-bound), KV = B x L x T x n_kv x d x 2 x bytes; perplexity = exp(NLL), tokenizer-bound; contamination + judge bias; $/M tokens at stated utilization. Capstone: requirements → gates → rollback.',
          questions: [
            'Compute KV-cache bytes for a GQA config and contrast with full MHA.',
            'Explain the GradScaler cycle: why scale, when skip, why halve, when double.',
            'Turn 1M requests/day x 500 tokens into GPU count and $/M tokens on a $2/h GPU.',
          ],
          pyqs: [],
        },
      ],
      important_questions: [
        'Backpropagate a 2-layer network numerically by hand and explain what the chain rule buys at each step.',
        'Why does attention scale by 1/sqrt(d_k)? Show what the softmax does unscaled.',
        'Your model trains to 99% and validates at 72%. Diagnose it and give a prioritized fix list with reasoning.',
        'Compute the receptive field after a given conv/pool stack, and the parameter count of each layer.',
        'Derive the Chinchilla compute-optimal split for a fixed FLOP budget and explain why the alternative loses.',
        'Explain the GradScaler cycle (scale, unscale, skip, halve, double) and what each part protects.',
        'Size the KV cache for a GQA vs MHA configuration, then estimate serving cost per million tokens.',
        'Compare greedy, beam, and top-p sampling: which objective does each optimize, and where does each fail?',
      ],
      previous_year_questions: [
        {
          year: '2024',
          question:
            'Explain why a deep network without non-linear activation functions collapses to a single linear transform, and state which activation you would choose for a very deep ReLU network and why.',
          solution:
            'Composition of affine maps is affine: W2(W1x+b1)+b2 = (W2W1)x + b2*, so depth adds no expressive power — every layer pair still cuts the input space with a single hyperplane. Non-linear activations make each layer a non-linear piecewise map, so stacking carves increasingly complex decision boundaries. For very deep ReLU nets, prefer ReLU family variants (Leaky ReLU/PReLU/ELU) or residual connections with ReLU: plain ReLU kills negative units ("dying ReLU"), and the gradient through max(0,z) is 0 for z<0 — a small negative slope or skip paths keep gradients alive. He initialization (variance 2/fan_in) pairs with ReLU to keep activation variance ~1 across depth.',
        },
        {
          year: '2024',
          question:
            'A transformer has d_model = 512 and 8 heads. Compute the per-head dimension and the total parameters of the Q, K, V and output projections, and comment on how head count affects this total.',
          solution:
            'Per head: 512 / 8 = 64 dimensions. Projections: W_Q, W_K, W_V each 512 x 512 (the heads are just a repartition of the same 512 columns), and W_O another 512 x 512 — total 4 x 512 x 512 = 1,048,576 parameters (biases add 4 x 512 = 2,048). The total is independent of the number of heads: changing h only changes how the 512 dims are split into subspaces (h x 64) and which positions interact within one softmax — more heads = more parallel relational patterns, same parameter budget. FLOPs of the projections are likewise unchanged; only the attention softmax pattern changes.',
        },
        {
          year: '2025',
          question:
            'Explain why validation accuracy must be computed by accumulating correct and total counts instead of averaging per-batch accuracies, and give a numeric example where the two differ.',
          solution:
            'Batch means give each batch an equal vote regardless of sample count. Example: batches of 128 that are each 95% correct and a final batch of 16 that is 25% correct. True (count-based) accuracy: (4x128x0.95 + 16x0.25) / (4x128 + 16) = 490.4 / 528 = 92.9%. Naive mean of batch accuracies: (0.95 + 0.95 + 0.95 + 0.95 + 0.25) / 5 = 81.0% — the 16-sample tail receives 20% of the vote instead of 3%, dragging the metric 11.9 points off (in this case below truth; with an unusually good tail it would overshoot). The fix is protocol-level: accumulate (correct, total) — or (loss x batch_size, tokens) — and divide once at the end, making the metric depend on data rather than batching. The same rule applies to perplexity (total NLL / total tokens) and RMSE (sum of squared errors / count).',
        },
      ],
    },
    exam: {
      question_count: 15,
      duration_minutes: 35,
      passing_percent: 60,
      retake_cooldown_hours: 24,
      distinction_percent: 85,
      bank: examBank,
    },
    project: {
      title: 'CAPSTONE: Design an end-to-end deep learning system',
      brief:
        'Pick one real problem (campus document QA, a code assistant, demand forecasting, medical-image triage — any domain) and produce a design document plus a working proof, defended with arithmetic. The document must cover all seven sections: (1) requirements with pre-registered gates — quality bar vs a baseline, p99 latency, cost ceiling per 1M tokens or per request, safety constraints, and written rollback criteria; (2) data — sources with provenance, dedup/quality filters, labeling plan, time/entity split with a sealed test set; (3) model selection — capacity-vs-data evidence, compute-optimal view (C = 6ND, D ≈ 20N), quantization target, and an explicit reasoned decision on at least one frontier option (MoE, long context, multimodal, on-device); (4) training plan — objective, LR/accumulation schedule in optimizer steps, instrumentation from step 0, checkpoint/resume policy, GPU-hour budget; (5) evaluation — contamination-audited golden set, baselines, one ablation, judge calibration if an LLM judge is used; (6) serving — batching mode, KV-cache budget at your target context and concurrency, TTFT/TPOT targets, cost at stated utilization; (7) monitoring — drift signals, dashboards, feedback filtering, canary and one-command rollback. The working proof: fine-tune or distill a small model, evaluate against the golden set, apply one compression technique from Module 10 with a measured quality-memory-latency frontier, and report one table of ablations. Every number must be measured, cited, or derived — no unattributed figures.',
      submission_hint:
        'Link to the design document (public drive or repo README) plus the repository containing training/eval/serving scripts and the results tables.',
      required_for_certificate: true,
    },
    modules,
  };
}
