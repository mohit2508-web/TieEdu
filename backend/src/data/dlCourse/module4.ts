// Module 4 — Sequence Models Before Transformers
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code, diagram } from '../nineBlocks';
import { lesson, M4, COURSE_ID } from './helpers';

export const module4: CourseModule = {
  id: M4,
  course_id: COURSE_ID,
  title: 'Module 4 — Sequence Models Before Transformers',
  summary:
    'RNNs as unrolled computation graphs with persistent hidden state and truncated BPTT, the vanishing/exploding gradient pathology of long chains, LSTM and GRU gate mechanics with hand-computed cell updates, bidirectional and stacked variants, an honest account of where RNNs still fit, and the sequential bottleneck that motivated attention.',
  sort_order: 4,
  lessons: [
    lesson(
      M4,
      'dl-4-1',
      1,
      'The RNN: Unrolling, Hidden State, and Backpropagation Through Time',
      'One recurrence written once and unrolled into a deep feedforward graph, what the hidden state carries, BPTT as ordinary backprop on the unrolled copy, and truncated BPTT as the practical compromise.',
      22,
      nineBlocks({
        objectives: [
          'Write the RNN recurrence and unroll it for a 4-step sequence into an equivalent feedforward graph',
          'Explain what the hidden state encodes and why it is a learned, fixed-size memory',
          'Compute forward outputs of a simple RNN cell step by step with real numbers',
          'Distinguish full BPTT from truncated BPTT and state the memory/gradient-horizon tradeoff',
        ],
        hook:
          'A language model must predict the next word knowing everything before it — but also must forget. Reading "the trophy would not fit in the suitcase because it was too big", the word "it" refers to the trophy, not the suitcase; two sentences earlier, the pronoun sense flips. An RNN faces this with one brutally simple weapon: a single vector of numbers, rewritten at every step, that must carry whatever matters forward and discard the rest. No attention, no retrieval, no growing context window — one fixed-width summary, endlessly rewritten. Understanding what that design can and cannot do explains both the RNN era\'s achievements and why attention was invented.',
        concept: `**The recurrence, written once.** At each time step t, the RNN receives input x_t and its previous hidden state h_{t-1}, and computes:

h_t = tanh(W_hh * h_{t-1} + W_xh * x_t + b)
y_t = W_hy * h_t + b_y

Same weights W_hh, W_xh, W_hy at EVERY step — weight sharing across time, exactly like convolution shares across space. h_0 is usually initialized to zeros. The hidden state is the model\'s working memory: a fixed-width vector (say 256 or 1024 floats) summarizing everything relevant from steps 1..t-1 that survives into step t. "Everything relevant" is learned from data — the network is TRAINED to write useful information into h and erase stale information, a genuinely hard optimization target (which is precisely why gates — next lesson — were invented).

**Unrolling: the identity that makes it all click.** Draw the recurrence for a length-4 sequence and you get EXACTLY a 4-layer feedforward network with SHARED weights across the layers: x_1 -> h_1 -> h_2 -> h_3 -> h_4, inputs entering at each step. Unrolling reveals three truths at once. (1) An RNN IS a deep network — depth equals sequence length. (2) Backprop through an RNN is ordinary backprop on the unrolled graph — no new calculus needed; the algorithm applied to this graph is called BPTT (backpropagation through time). (3) The vanishing/exploding gradient problem is now obvious in advance: gradients from y_4 back to h_1 multiply through FOUR weight/Jacobian factors — for a length-1000 sentence, ~1000 factors. Chain rule does the rest (Module 1.3\'s pathologies, now multiplied through TIME).

**BPTT concretely.** To train on the sequence (x_1..x_T, labels at each step), you unroll, compute all outputs, sum per-step losses L = sum_t L_t, and backpropagate across the unrolled graph — accumulating gradients into the SHARED weights (each weight gets contributions from every step\'s path; PyTorch\'s backward on an RNN loop does this transparently). Two complications that bite: (1) MEMORY — storing all T hidden states and activations for backward is O(T * batch * hidden); a 1000-step sequence with large hidden states exhausts GPU memory fast. (2) GRADIENT HORIZON — true sequence dependencies can span thousands of steps, but gradients flowing that far both blow up memory and vanish/explode mathematically. 

**Truncated BPTT: the standard compromise.** Process the sequence in segments of, say, 128-512 steps: run forward THROUGH segments (carrying hidden state and its value detached between segments — the state keeps flowing as data), but backpropagate only within each segment (detaching h between chunks stops gradients crossing the boundary). Result: gradients span ~segment length; long-range learning happens only INDIRECTLY as state-carrying statistics; memory is bounded. TensorFlow/PyTorch "stateful" RNN training and language-model training of the pre-transformer era (LSTMs on word-level corpora) all ran this way. Its honest limitation: an LSTM trained with 128-step truncation learns dependencies up to a few hundred steps RELIABLY; beyond that, you are hoping the hidden state organizes itself — which gradients never directly verify.

**Design variants, briefly.** GRU/LSTM (next lesson) replace the tanh cell with gated ones. Stacking: h_t^l from h_t^{l-1} gives depth ACROSS time-steps. Bidirectional: two recurrent passes (forward and backward), concatenated per step — powerful for tagging/translation encoders, but REQUIRES the whole sequence in advance (no online generation). Many-to-one (classification: last/averaged state), many-to-many (per-step outputs), sequence-to-sequence (encoder consumes input, decoder emits output — the 2014-2017 architecture that made neural machine translation work; attention\'s debut stage). Next lesson: the gradient wall this design hits, and the gates that patched it.`,
        extras: [
          diagram(
            'Unrolled RNN: shared weights across time',
            'graph LR\n  X1[x1] --> H1[h1]\n  X2[x2] --> H2[h2]\n  X3[x3] --> H3[h3]\n  X4[x4] --> H4[h4]\n  H0[h0 = 0] --> H1\n  H1 --> H2\n  H2 --> H3\n  H3 --> H4\n  H1 --> Y1[y1]\n  H2 --> Y2[y2]\n  H3 --> Y3[y3]\n  H4 --> Y4[y4]',
          ),
          table(
            'RNN output modes',
            ['Mode', 'Outputs used', 'Typical task'],
            [
              ['Many-to-one', 'Final h_T (or pooled states)', 'Sentiment classification, video-level labels'],
              ['Many-to-many (aligned)', 'y_t at every step', 'POS tagging, per-frame labelling, language modelling'],
              ['Encoder-decoder', 'Encoder state seeds decoder', 'Translation, summarization (seq2seq)'],
            ],
          ),
          code(
            `import torch, torch.nn as nn

# The recurrence, explicit — one step of an RNN cell by hand-equivalent math
torch.manual_seed(0)
rnn = nn.RNN(input_size=3, hidden_size=4, batch_first=True)   # tanh cell, shared over time
x = torch.randn(1, 5, 3)                 # (batch=1, seq_len=5, features=3)
y, h_n = rnn(x)                          # y: all step outputs; h_n: final state
print(y.shape, h_n.shape)                # [1, 5, 4]  [1, 1, 4]

# Manual one-step computation (what the cell does internally):
def rnn_step(x_t, h_prev, W_xh, W_hh, b):
    h_t = torch.tanh(W_xh @ x_t + W_hh @ h_prev + b)   # shared weights every step
    return h_t

# Truncated BPTT pattern: carry state, stop gradients at segment boundaries
segs = torch.split(x, 2, dim=1)          # 5 steps -> segments of 2
h = None
for seg in segs:
    out, h = rnn(seg, h if h is not None else None)
    loss = (out ** 2).mean()
    loss.backward()                      # grads span ONLY this segment
    h = h.detach()                       # <-- truncate: state flows, gradient stops
    rnn.zero_grad()`,
            'rnn_unroll_bptt.py',
            'python',
          ),
          tip(
            'Hidden state is a learned cache — inspect it',
            'Plot h_t norms over a sequence: healthy models show structure (state builds, resets at boundaries like sentence ends). A state whose norm explodes toward the end of sequences means unstable dynamics; a state pinned near zero means the model is ignoring history — both diagnosable before any accuracy metric moves.',
          ),
          warn(
            'Do not claim BPTT is a different algorithm from backprop',
            'BPTT is backprop applied to the UNROLLED graph, with gradient accumulation into shared weights. Exam answer precision matters: "the same chain rule, applied through time" is correct; "a special temporal algorithm" is not.',
          ),
        ],
        worked: {
          title: 'Unroll and forward a 3-step RNN with tiny numbers',
          problem:
            'Scalar input x, scalar hidden state h, single units for hand-traceability. W_xh = 0.5, W_hh = 0.8, b = 0, activation tanh (use values: tanh(0.4)=0.38, tanh(0.66)=0.58, tanh(1.4)=0.89 — compute as needed). Sequence: x_1 = 0.8, x_2 = -0.4, x_3 = 1.2; h_0 = 0. (a) Compute h_1, h_2, h_3. (b) Which weight path would a gradient from loss at step 3 travel to reach W_xh\'s step-1 contribution? (c) What does the multiplication across steps imply for length-50 sequences?',
          steps: [
            {
              title: 'Step 1',
              desc: 'z_1 = W_xh*x_1 + W_hh*h_0 = 0.5*0.8 + 0.8*0 = 0.4. h_1 = tanh(0.4) = 0.38.',
              code_snippet: 'z1 = 0.5*0.8 + 0.8*0 = 0.4;  h1 = tanh(0.4) = 0.38',
            },
            {
              title: 'Step 2',
              desc: 'z_2 = 0.5*(-0.4) + 0.8*0.38 = -0.2 + 0.304 = 0.104. h_2 = tanh(0.104) ≈ 0.104 (small input, near-linear region). Note the negative input barely dents the state — history dominates this step.',
              code_snippet: 'z2 = -0.2 + 0.304 = 0.104;  h2 ≈ 0.104',
            },
            {
              title: 'Step 3',
              desc: 'z_3 = 0.5*1.2 + 0.8*0.104 = 0.6 + 0.083 = 0.683. h_3 = tanh(0.683) ≈ 0.593. Final state mixes all three inputs, weighted by decaying powers of W_hh — an exponential memory kernel (0.8^n) of the past.',
              code_snippet: 'z3 = 0.6 + 0.083 = 0.683;  h3 ≈ 0.593',
            },
            {
              title: 'Gradient path and its consequence',
              desc: 'Loss at step 3 to W_xh\'s step-1 effect: chain = d h3/d h2 * d h2/d h1 * d h1/d W_xh — three Jacobian factors, each bounded by W_hh * tanh\' (<= 0.8 here) times downstream terms. At length 50: ~0.8^49-ish factor if tanh\' averages ~0.5, giving ~1e-5 or worse — vanishing. Magnitudes >1 across factors explode instead. This multiplicative-through-time behaviour IS the RNN gradient pathology.',
              code_snippet: 'path: dL/dh3 -> dh3/dh2 -> dh2/dh1 -> dh1/dWxh  (product of ~0.4 factors)',
            },
          ],
          solution:
            'h_1 = 0.38, h_2 ≈ 0.104, h_3 ≈ 0.593: each state is a recency-weighted blend of inputs with geometric decay 0.8^n. The step-3 loss reaches step-1\'s weights only through a PRODUCT of per-step Jacobians — over 50 steps that product collapses toward zero (or explodes above 1), which is exactly the vanishing/exploding problem and the reason plain tanh RNNs learn only short-range dependencies. Gates (LSTM/GRU) and, ultimately, attention are the two historical answers.',
        },
        practice: {
          title: 'Unroll an RNN in a diagram and in PyTorch',
          prompt:
            'Take the 5-step sequence ["the", "cat", "sat", "on", "mat"] (map each word to a random 8-dim vector). (a) Draw the unrolled graph with shared weights, marking where one loss per step would attach for language modelling. (b) Run nn.RNN(8, 16) over it in PyTorch, print output shapes, and verify y[:, t] depends on x_0..x_t but not x_{t+1} by perturbing a future input and comparing earlier outputs. (c) State in one sentence what this non-causality direction implies for decoder design.',
          hint: 'Perturb x_4, assert y_0..y_3 unchanged, y_4 changed — causality flows forward only. Decoders need outputs at t to depend only on inputs <= t (masking — foreshadowing masked attention).',
        },
        mistakes: [
          {
            mistake: 'Assuming each step\'s output depends on FUTURE inputs',
            fix: 'A vanilla RNN is causal: h_t sees only x_1..x_t. Bidirectional RNNs deliberately break this for offline encoders (the backward pass sees the future) — fine for tagging, impossible for autoregressive generation.',
          },
          {
            mistake: 'Confusing hidden-state flow with gradient flow under truncation',
            fix: 'In truncated BPTT the state VALUE carries across segments (the model can still USE old information), but gradients stop at boundaries (learning to WRITE that old information far back is not directly trained). Detach controls gradients, not data.',
          },
          {
            mistake: 'Claiming RNNs have no parameter growth with sequence length',
            fix: 'Correct: parameters are fixed (shared W\'s across time) — that is the point. MEMORY during training, however, grows with unrolled length — fixed parameters, growing activation storage. Keep the two bookkeeping systems straight.',
          },
          {
            mistake: 'Treating tanh\'s bounded output as sufficient to keep states stable forever',
            fix: 'h_t is bounded, but the JACOBIAN products through time still vanish/explode (tanh\' shrinks, W_hh multiplies). Bounded activations do not imply healthy gradients — the pathology lives in derivatives, not values.',
          },
        ],
        exam: {
          question:
            'Define backpropagation through time and explain why an RNN\'s gradient with respect to early-step weights involves products of many Jacobian terms. What practical compromise is used for long sequences?',
          answer:
            'BPTT is backpropagation applied to the unrolled (in-time) computation graph of an RNN: the recurrence is replicated once per time step, producing a deep feedforward graph with shared weights; gradients of the total (summed) loss are computed across all steps and accumulated into the shared parameters. Differentiating a loss at step T with respect to parameters influencing step t requires the chain rule across every intermediate step: the gradient is a product of per-step Jacobian factors (d h_{k+1} / d h_k = diag(f\'(W_hh h_k + ...)) * W_hh ...), one factor per time step from t to T. With T large, this product shrinks geometrically toward zero when the average factor\'s norm is below one (vanishing gradients — early steps get no learning signal) or grows without bound when above one (exploding gradients — unstable updates). Hence plain RNNs cannot learn long-range dependencies directly. Practical compromise: TRUNCATED BPTT — process long sequences in segments, carrying the hidden-state value across segment boundaries (detached from the graph) while backpropagating only within each segment; this bounds memory and gradient products at the cost of limiting the directly learned dependency horizon to the segment length (gated cells — LSTM/GRU — extend the effective horizon further).',
          source: 'Standard advanced-DL/GATE question; the BPTT definition plus vanishing-product argument is the expected core.',
        },
        summary: [
          'An RNN rewrites one hidden state per step with shared weights — unrolling reveals a deep feedforward net, one layer per time step.',
          'BPTT is ordinary backprop on the unrolled graph, with gradients accumulated into shared weights.',
          'Gradient products through time cause vanishing/exploding signals — early steps starve or updates blow up at long sequence lengths.',
          'Truncated BPTT detaches state between segments: values flow forever, gradients only across the segment — the memory/learning-horizon tradeoff.',
          'The hidden state is a fixed-width, learned summary — its capacity ceiling is what attention later bypassed.',
        ],
      }),
      [
        [
          'An RNN unrolled for T time steps is equivalent to a feedforward network with:',
          [
            'T different parameter sets',
            'T layers sharing the same parameters',
            'No layers at all',
            'One layer applied repeatedly without backpropagation',
          ],
          1,
          'The recurrence replicated across time forms a T-layer deep net whose weights are tied — the same W_hh/W_xh at every step; BPTT is then backprop on that unrolled graph.',
        ],
        [
          'In truncated BPTT, detaching the hidden state between segments means:',
          [
            'The state VALUE stops being passed forward',
            'The state value still flows as data, but gradients do not propagate across the segment boundary',
            'The hidden state is reinitialised each segment',
            'Weights are frozen after the first segment',
          ],
          1,
          'detach() blocks only the gradient path; the state itself carries forward so the model can still USE long history — it just cannot directly TRAIN the writing of that history across the boundary.',
        ],
        [
          'The gradient of a late-step loss with respect to early-step parameters passes through:',
          [
            'One Jacobian factor regardless of sequence length',
            'A product of per-step Jacobian factors — one per intervening time step',
            'Only the final layer\'s weights',
            'An average of per-step gradients',
          ],
          1,
          'The chain rule through T steps multiplies T-1 Jacobians (each involving W_hh and the activation derivative); the product vanishes below unit norm and explodes above — the temporal version of the deep-net gradient problem.',
        ],
        [
          'A vanilla (tanh) RNN\'s hidden state can be best described as:',
          [
            'A lookup table of seen tokens',
            'A fixed-width vector rewritten at each step, intended to summarize all relevant history',
            'A copy of the entire input sequence',
            'The model\'s output probability distribution',
          ],
          1,
          'Fixed-capacity learned summary — bounded in width no matter the sequence length, which is both its elegance (fixed parameters) and its eventual bottleneck (what attention replaced).',
        ],
      ]
    ),
    lesson(
      M4,
      'dl-4-2',
      2,
      'Vanishing Gradients, and the Gate Surgery of LSTM and GRU',
      'Why tanh RNNs lose long-range dependencies mathematically, then the LSTM\'s three gates with hand-computed cell updates, GRU\'s merged two-gate economy, and what gates actually buy.',
      24,
      nineBlocks({
        objectives: [
          'Explain the vanishing-gradient mechanism in a plain RNN in terms of the tanh-derivative and W_hh product',
          'Compute an LSTM cell\'s forget/input/output gates and cell state for one step with given numbers',
          'Contrast GRU against LSTM: gate count, candidate computation, and when the difference matters little',
          'State what gates enable (selective persistence) that a plain tanh recurrence cannot express',
        ],
        hook:
          'Here is a sentence an LSTM was built for: "The employees of the company, who had worked there for decades before the merger was announced, were shocked when THEY were laid off." The pronoun sits 24 words from its referents — and every word between them is noise a naive recurrent net must preserve through a chain of matrix multiplications that erases it. Hochreiter and Schmidhuber saw this coming in 1997: gradients through long chains decay exponentially, so the network literally cannot learn to connect distant events. Their fix was surgical — give the cell a highway of its own, and put learned gates on the ramps.',
        concept: `**The vanishing gradient, precisely.** In a plain RNN, h_t = tanh(W_hh h_{t-1} + ...). The gradient from step t+k back to step t is a product of k factors, each containing diag(tanh\'(z)) * W_hh. Two multiplicative killers: (1) tanh\' <= 1 and typically << 1 (average ~0.5, shrinking toward 0 in the saturating tails); (2) if the spectral norm of W_hh is below 1 (common under stable training), each factor is < 1 — k factors give an ~0.4^k decay: at k = 50, 1e-20 — learning signal from distant past is numerically zero. Exploding is the mirror (norms > 1), historically patched by global gradient clipping. The deep-net answer from Module 2 (residual highways) had no RNN analogue until LSTM\'s cell state — a path where gradients multiply by ~1 instead of ~tanh\' * W_hh.

**LSTM: three gates and one highway.** The LSTM cell maintains TWO states: hidden h_t (output, filtered) and cell state c_t (the highway — internal memory flowing through time with minimal interference). Four computed quantities per step, all sigmoids/candidates:

f_t = sigmoid(W_f [h_{t-1}, x_t] + b_f)          FORGET gate: how much of c_{t-1} to keep
i_t = sigmoid(W_i [h_{t-1}, x_t] + b_i)           INPUT gate: how much candidate to admit
c~_t = tanh(W_c [h_{t-1}, x_t] + b_c)             candidate memory
c_t = f_t * c_{t-1} + i_t * c~_t                  cell update (the multiplication-addition!)
o_t = sigmoid(W_o [h_{t-1}, x_t] + b_o)           OUTPUT gate: how much cell state to expose
h_t = o_t * tanh(c_t)

Read the cell update carefully: c_t = f_t * c_{t-1} + (stuff). Along the gradient path d c_t / d c_{t-1} = f_t — a SOFT value in (0,1), not a matrix-Jacobian-tanh product. If the forget gate sits near 1 (its common trained state), gradients flow backward through time nearly UNATTENUATED — the same trick as ResNet\'s +1, in multiplicative-sigmoid clothing. Crucially the gate values are LEARNED PER STEP AND PER DIMENSION from the current context: the network learns WHEN to remember (carry the pronoun\'s referent for 24 words) and WHEN to clear (reset at sentence boundaries) — selective persistence, which a plain tanh cell cannot express because it always overwrites h_t = tanh(everything).

**The forget-gate bias trick.** Initialize forget-gate bias positively (say +1 or +2): at start of training, sigmoid(b_f) ≈ 0.73-0.88 — the cell begins by PASSING information, not erasing it. Forgetting to do this (bias 0 -> gate 0.5, halving the cell each step) measurably hurts sequence tasks. This is one of the most replicated small tricks in recurrent modelling.

**GRU: the two-gate economy.** Cho et al. (2014) merged LSTM\'s forget and input gates into ONE update gate z_t, dropped the separate output gate (exposes h_t = (1-z_t)*h~_t + z_t*h_{t-1}-ish, precisely: h_t = (1 - z_t) * h~_t + z_t * h_{t-1} where h~ is the tanh candidate), and let a reset gate r_t control how much past enters the candidate. Fewer parameters (~25% less), often matching LSTM quality on moderate tasks; LSTM retains the edge on some very-long-range or memory-heavy tasks (its separate cell state is a purer highway). Practical verdict: try GRU first for speed; use LSTM where every point matters and budget allows; the two are close enough that the CHOICE matters far less than gates-versus-no-gates.

**What gates bought — and their limits.** They bought: gradient flow over hundreds of steps (empirically 100-1000 with BPTT tricks), selective memory (the actual mechanism for long-dependency tasks: copying, memorisation, language modelling with long contexts), and the workhorse of speech, MT, and time-series from ~2013-2017 (LSTM machines translated Google Translate\'s 2016 neural MT; still live in parts of speech synthesis and on-device sequence tasks where latency budgets forbid attention\'s quadratic cost). They did NOT buy: true random access (still one rewriting stream — to USE a fact you must have preserved it all along the chain), parallel training (h_t depends on h_{t-1}: T sequential steps per forward = T sequential gradient steps — the wall Transformers shot through), or open-ended context (fixed-width states, same as vanilla RNN). Gates fixed the gradient AND kept the bottleneck — the last gap attention closed.`,
        extras: [
          table(
            'LSTM vs GRU vs plain RNN',
            ['Feature', 'Vanilla RNN', 'LSTM', 'GRU'],
            [
              ['Gates', 'None', '3 (forget, input, output)', '2 (update, reset)'],
              ['States', 'h only', 'h + c highway', 'h only (merged update)'],
              ['Long dependency (empirical)', 'Tens of steps', 'Hundreds+', 'Hundreds (near-LSTM)'],
              ['Params per layer', 'Low', '4x vanilla', '3x vanilla'],
              ['Parallelism', 'Sequential in time', 'Sequential in time', 'Sequential in time'],
            ],
          ),
          code(
            `import torch, torch.nn as nn

# One LSTM cell computation, made explicit (hidden=1 for hand-traceability)
def lstm_step(x_t, h_prev, c_prev, W, b):
    gates = torch.sigmoid(W['f'] @ x_t + W['fh'] @ h_prev + b['f'])   # forget
    i    = torch.sigmoid(W['i'] @ x_t + W['ih'] @ h_prev + b['i'])    # input
    c_tilde = torch.tanh(W['c'] @ x_t + W['ch'] @ h_prev + b['c'])    # candidate
    c_t = gates * c_prev + i * c_tilde                                # <-- highway update
    o    = torch.sigmoid(W['o'] @ x_t + W['oh'] @ h_prev + b['o'])    # output
    h_t = o * torch.tanh(c_t)
    return h_t, c_t

lstm = nn.LSTM(input_size=8, hidden_size=16, num_layers=2, batch_first=True)
x = torch.randn(3, 10, 8)             # batch 3, seq 10, feat 8
out, (h_n, c_n) = lstm(x)
print(out.shape, h_n.shape, c_n.shape) # [3,10,16] [2,3,16] [2,3,16]  (2 stacked layers)

gru = nn.GRU(input_size=8, hidden_size=16, num_layers=2, batch_first=True)
out_g, h_g = gru(x)
print(out_g.shape, h_g.shape)          # same shapes; fewer parameters inside`,
            'lstm_gates.py',
            'python',
          ),
          tip(
            'Forget-gate bias: check it when long tasks fail',
            'If your LSTM\'s memory tasks (copy, long-range language) train poorly early, inspect forget-gate biases: all near 0? Set them to +1..+2 and retrain. Gate-activation histograms over training tell the memory story directly — forget sitting at 0.5 forever means the cell never learned selective persistence.',
          ),
          warn(
            'Do not say LSTM "solves" the vanishing gradient problem',
            'It MITIGATES it: gradients can flow far through the c-highway when forget gates stay high, but gates driven to saturation still clip paths, BPTT truncation still limits horizon, and exploding gradients still need clipping. Accurate exam language: "gates create an approximately identity-preserving cell-state path".',
          ),
        ],
        worked: {
          title: 'Compute one LSTM step by hand',
          problem:
            'Scalar cell, one unit throughout. h_0 = 0.2, c_0 = 1.0, x_1 = 0.5. Given pre-activation values (already including weights): forget pre-act = 0.5, input pre-act = -1.0, candidate pre-act = 0.4, output pre-act = 0.0. Use sigmoid(0.5) = 0.62, sigmoid(-1.0) = 0.27, tanh(0.4) = 0.38, sigmoid(0) = 0.5. (a) Compute f_1, i_1, c~_1, c_1, o_1, h_1. (b) Now compute c after 50 more IDENTICAL steps (forget gate each step) — compare against a plain tanh RNN\'s ~0.4^50 gradient factor. (c) What does gate f = 0.62 imply for gradient retention per step?',
          steps: [
            {
              title: 'Gates and candidate',
              desc: 'f_1 = sigmoid(0.5) = 0.62. i_1 = sigmoid(-1.0) = 0.27 (input mostly closed — this step writes little). c~_1 = tanh(0.4) = 0.38. o_1 = sigmoid(0) = 0.5.',
              code_snippet: 'f=0.62;  i=0.27;  c~=0.38;  o=0.50',
            },
            {
              title: 'Cell update',
              desc: 'c_1 = f * c_0 + i * c~ = 0.62*1.0 + 0.27*0.38 = 0.62 + 0.103 = 0.723. The old memory mostly survived (62%) and a little new content arrived (10%).',
              code_snippet: 'c1 = 0.62*1.0 + 0.27*0.38 = 0.723',
            },
            {
              title: 'Hidden output',
              desc: 'h_1 = o * tanh(c_1) = 0.5 * tanh(0.723) = 0.5 * 0.619 = 0.310. The output gate throttles how much of the (protected) memory is EXPOSED — c keeps full history, h is the filtered view.',
              code_snippet: 'h1 = 0.5 * tanh(0.723) = 0.31',
            },
            {
              title: 'Fifty identical steps and the gradient comparison',
              desc: 'With f = 0.62 constant and no new input (i*c~ = 0): c decays as 0.62^n. After 50 steps: 0.62^50 ≈ 4e-11 — memory itself fades unless the gate rises toward 1 (in trained models, forget on kept information sits near 0.95+, giving 0.95^50 ≈ 0.08 — 9 orders of magnitude better retention). Gradient path: d c_t/d c_{t-k} = product of f\'s — pure sigmoid values, no tanh-derivative matrix sandwich. Compare plain RNN: ~0.4^50 = 1e-20. At f = 0.98: 0.98^50 = 0.36 — a PRACTICAL learning signal at 50 steps.',
              code_snippet: '0.62^50 = 4e-11   |   0.98^50 = 0.36   |   plain ~0.4^50 = 1e-20',
            },
          ],
          solution:
            'c_1 = 0.723, h_1 = 0.310: memory preserved, candidate mostly rejected, exposure throttled. Gradient retention equals the product of forget gates — at f = 0.98, 50-step gradients retain 36% of signal versus the plain RNN\'s 1e-20; that four-orders-plus difference at moderate lengths (and far more at 100+) is the whole justification for gate surgery. Train your forget gates to stay high on retained content and long-range learning becomes numerically possible.',
        },
        practice: {
          title: 'Train the long-dependency benchmark',
          prompt:
            'Implement the copy task: input = K random tokens, delimiter, then T steps of padding; target = reproduce the K tokens after the delimiter. Train (a) a vanilla tanh RNN, (b) an LSTM, same hidden size, T = 50. Plot test accuracy vs T for T in [10, 20, 40, 50] for both. Report where each collapses and explain the vanilla RNN\'s failure using gradient-norm-per-timestep logs you capture during training.',
          hint: 'Log mean |gradient| entering the cell at each time step (register hooks on the recurrent weights per time). Vanilla: gradient decays geometrically toward early steps; LSTM: flatter profile — the numbers will match the theory directly.',
        },
        mistakes: [
          {
            mistake: 'Saying LSTM has "no vanishing gradient problem"',
            fix: 'Mitigation, not elimination: the c-highway with high forget gates greatly extends the horizon, but saturated gates, truncation, and exploding norms remain. Precision on this distinction is exactly what advanced exams probe.',
          },
          {
            mistake: 'Confusing the cell state c_t with the hidden state h_t',
            fix: 'c_t is the full internal memory flowing through time (the highway); h_t = o_t * tanh(c_t) is the output-facing, gated view. Memory can persist in c while h shows something filtered — dual-state design is the point.',
          },
          {
            mistake: 'Believing LSTM/GRU solved long contexts, so transformers were unnecessary',
            fix: 'Gates extended usable ranges to hundreds of steps, but still through a SEQUENTIAL single stream — no parallel-across-time training, no random access to arbitrary positions. Long-context LLMs (10k+) are infeasible as RNN chains; attention was a different kind of fix.',
          },
          {
            mistake: 'Assuming GRU is always worse because it has fewer gates',
            fix: 'GRU matches or beats LSTM on many tasks while training faster with fewer parameters — merged gates often suffice. The gate-count difference matters only on specific long-memory tasks; treat it as an empirical, budget-based choice.',
          },
        ],
        exam: {
          question:
            'Describe the LSTM cell update equations, explain how the forget gate enables long-range gradient flow, and state the advantage of the GRU\'s design.',
          answer:
            'At step t: forget f_t = sigmoid(W_f [h_{t-1}, x_t] + b_f); input i_t = sigmoid(W_i [h_{t-1}, x_t] + b_i); candidate c~_t = tanh(W_c [h_{t-1}, x_t] + b_c); cell c_t = f_t ⊙ c_{t-1} + i_t ⊙ c~_t; output o_t = sigmoid(W_o [h_{t-1}, x_t] + b_o); hidden h_t = o_t ⊙ tanh(c_t). Long-range flow: the gradient of a late loss w.r.t. c_{t-1} through the cell update is d c_t/d c_{t-1} = diag(f_t) — elementwise sigmoid values rather than a product of matrix Jacobians and tanh derivatives; when f_t is near 1 (the typical trained state for retained information, often aided by positive forget-bias initialisation), gradients propagate across many steps with near-unity retention, whereas a plain tanh RNN multiplies by diag(tanh\')W each step and decays geometrically. The gates are learned per step per dimension, giving SELECTIVE persistence: write, hold, or erase according to context. GRU advantage: merges forget+input into a single update gate z_t and drops the separate output gate (h_t = (1-z_t) ⊙ c~_t + z_t ⊙ h_{t-1} with a reset gate shaping c~_t), reducing parameters by ~25% and computation per step while delivering near-LSTM quality on most tasks — a simpler, faster cell when the full LSTM memory machinery is not measurably needed.',
          source: 'High-frequency advanced-DL exam question; gate equations plus the diag(f_t) gradient argument constitute a full-marks answer.',
        },
        summary: [
          'Plain RNN gradients multiply through tanh-derivatives and W_hh — geometric decay erases long-range signal (exploding needs clipping).',
          'LSTM: f/i/o gates + tanh candidate maintain a cell-state highway where gradients multiply by f_t (~1 when remembering), enabling selective persistence.',
          'c_t = f_t * c_{t-1} + i_t * c~_t is the key line: near-identity gradient path, unlike any tanh-stack recurrence.',
          'GRU merges gates into update+reset — fewer parameters, near-LSTM results; the gate choice matters less than having gates.',
          'Gates fixed the gradient but kept sequential training and fixed-width memory — attention addresses both.',
        ],
      }),
      [
        [
          'The LSTM cell state\'s gradient with respect to the previous cell state passes through:',
          [
            'The full W_hh matrix times tanh\'',
            'Elementwise forget-gate values (diag(f_t)) — approximately identity when the gate is near 1',
            'The output gate only',
            'A softmax',
          ],
          1,
          'c_t = f_t * c_{t-1} + i_t * c~_t differentiates to f_t elementwise — sigmoid values in (0,1), near 1 when remembering — instead of a shrinking matrix-tanh Jacobian product.',
        ],
        [
          'The role of the forget gate f_t is to:',
          [
            'Delete the hidden state h_t',
            'Control how much of the previous cell state c_{t-1} is retained into c_t',
            'Select which input features to read',
            'Scale the output probability',
          ],
          1,
          'f_t elementwise-multiplies the old cell state before the input gate adds new content — "how much of my memory do I keep this step", learned per step and per dimension.',
        ],
        [
          'A practical, well-replicated LSTM trick is to initialise forget-gate bias to a POSITIVE value (e.g. +1) because it:',
          [
            'Speeds up the sigmoid computation',
            'Starts the cell passing (remembering) rather than erasing, improving early long-range learning',
            'Prevents gradient explosion entirely',
            'Acts as dropout',
          ],
          1,
          'sigmoid(0) = 0.5 would halve memory each early step; sigmoid(1) ≈ 0.73 biases the initial cell toward retention — a small init detail with measurable task-level effects.',
        ],
        [
          'The GRU differs from the LSTM by:',
          [
            'Having four gates',
            'Merging forget and input into a single update gate and dropping the separate output gate, giving fewer parameters',
            'Removing tanh entirely',
            'Using convolution instead of recurrence',
          ],
          1,
          'GRU: update gate z_t replaces (forget, input); reset gate r_t shapes the candidate; h alone suffices — ~25% fewer parameters with near-LSTM empirical performance.',
        ],
      ]
    ),
    lesson(
      M4,
      'dl-4-3',
      3,
      'Bidirectional Models, Stacks, and Where RNNs Still Fit',
      'Going both directions at once for encoders, stacking for depth, seq2seq with encoder-decoder state handoff, an honest scorecard of RNNs in the 2020s, and the design constraints that still favour them.',
      20,
      nineBlocks({
        objectives: [
          'Explain what a bidirectional RNN computes and identify tasks where it is invalid (autoregressive decoding)',
          'Design a stacked encoder-decoder seq2seq configuration for a translation-style task',
          'List three 2020s application areas where recurrent components remain the right tool, with reasons',
          'Compare an RNN-based sequence model against a transformer on the axes of parallelism, context, and inductive bias',
        ],
        hook:
          'Every large language model you talk to today still contains recurrence\'s descendants — but the raw bidirectional RNN has a strange modern life. It sits inside speech recognition front-ends (you can listen to a whole utterance before deciding its first phoneme), inside some on-device time-series controllers where milliseconds and milliwatts are the entire budget, and inside the token-mixing half of a few 2020s architectures (Mamba, RWKV) that re-emerged because linear-time sequential models DO something attention cannot: constant memory over infinite streams. The RNN\'s story did not end in 2017 — it narrowed into niches where its constraints are features.',
        concept: `**Bidirectional RNNs: two passes, concatenated memory.** A standard RNN only sees the past. A bidirectional RNN runs TWO recurrent passes over the SAME sequence: forward (h->_t from x_1..x_t) and backward (h<-_t from x_T..x_t), then concatenates h_t = [h->_t ; h<-_t] as the representation at each position. Each position\'s encoding now summarizes BOTH directions\' context — the classic example: "bank" in "river bank" is disambiguated by the word AFTER it; a forward-only encoder encoding "bank" at position 3 never sees "river". For offline tagging, chunking, NER, and encoder-side representation learning, bidirectionality is a big, cheap win (parameters double, quality often jumps).

**Why bidirectionality is FORBIDDEN in decoders.** At generation time step t, the model must predict x_{t+1} knowing only x_1..x_t — a backward pass would need the future tokens that do not exist yet. Worse: teacher-forced training with a backward pass LEAKS the target into every representation (the backward state at t literally contains x_T..x_{t+1}), so the model learns to cheat, and inference collapses. The rule: bidirectional for encoders over complete inputs; unidirectional (causal) for decoders/generators. (This causal/non-causal split reappears exactly in transformer design: BERT-style bidirectional encoders vs GPT-style causal decoders — next module makes this precise with attention masks.)

**Stacking: depth across representations.** Run an RNN layer, take ALL its outputs as the input to ANOTHER RNN layer (h^l_t = RNN_layer_l(h^{l-1}_t)). Stacking adds abstraction levels: layer 1 might encode phonetic/acoustic patterns, layer 2 word-ish patterns, layer 3 phrase patterns — the hierarchy argument from Module 1 applied over sequences. Typical: 2-4 layers (deeper stacks hit diminishing returns AND multiply sequential cost); hidden widths often equal across layers for clean state handoffs. Bidirectional + stacked is the classic encoder: 2-layer bidirectional LSTM was the default NMT/speech encoder of 2015-2017.

**Seq2seq: the state-handoff pattern.** Sequence-to-sequence (Sutskever, Vinyals, Le 2014): a bidirectional/unidirectional LSTM ENCODER consumes the whole input; its final states (every layer\'s h_T and c_T) initialise the DECODER; the decoder then generates the output autoregressively, feeding its own previous output as next input (teacher forcing during training, scheduled sampling debates notwithstanding). Information for translation must squeeze through that finite state vector — the "information bottleneck" problem. Bahdanau et al. (2014) noticed the fix: let the decoder LOOK BACK at all encoder states at every step instead of through one vector — that is attention, born inside the RNN era to fix the RNN\'s own bottleneck (Module 4.4 details).

**The 2020s RNN scorecard — honest version.** LOSING: language modelling and machine translation at scale (transformers dominate on quality, parallelism, and long-range access); anything wanting trillions of tokens of pretraining (sequential training is too slow); retrieval-style tasks needing random access to context (attention does it natively). STILL WINNING or competing: (a) STREAMING / ONLINE inference with constant state — keyword spotting, wake-word detection, on-device anomaly detection where you must process forever-length streams in O(1) memory; (b) TIGHT LATENCY/POWER edge controllers — small GRUs in sensor fusion, robotics control loops, where 1-10k-parameter cells run in microseconds without attention\'s KV buffers; (c) certain time-series and control tasks where strong sequential inductive bias + tiny data beats attention\'s flexibility; (d) the hybrid frontier: MAMBA/state-space models (2023-2026) are recurrent-linear-time models with learned selection — proving recurrence\'s efficiency argument survived while fixing its content-bottleneck; RWKV blends RNN inference with transformer training. Speech pipelines still use BiLSTM/GRU layers in production ASR. The lesson: architecture choice is about CONSTRAINTS — if you need random access and massive parallel pretraining, attention; if you need constant-memory streaming at microsecond latency, recurrence wins and always has.

**The comparison table you should be able to produce from memory.** Parallelism: RNN O(1) parallel-across-time (must step sequentially); transformer full (all positions). Context: RNN fixed state; transformer attends to all in window (KV cache grows linearly with length at inference). Inductive bias: RNN strong locality/recency bias (helps on small data, hurts when distant info matters); transformer weak prior, learns positions via encoding. Training length handling: RNN truncated BPTT; transformer fixed/positional windows with quadratic-in-length attention cost (next module).`,
        extras: [
          table(
            'RNN vs transformer (the axes that decide designs)',
            ['Axis', 'RNN/LSTM/GRU', 'Transformer'],
            [
              ['Across-time parallelism', 'None — step t needs t-1 (sequential)', 'Full — all positions computed together'],
              ['Context mechanism', 'Fixed-width state rewrite', 'Attention over all positions in window'],
              ['Long-range access', 'Indirect, via preserved state', 'Direct — any position attends to any other'],
              ['Training memory vs length', 'O(T) activations (truncated to segment)', 'Attention matrix / KV grows with T (O(T^2) compute)'],
              ['Inference state', 'O(1) recurrent state', 'KV cache O(T) and growing'],
              ['Small-data inductive bias', 'Strong (recency prior)', 'Weaker (needs data to exploit)'],
            ],
          ),
          code(
            `import torch, torch.nn as nn

# Bidirectional encoder: two directions, concatenated per step
bi = nn.LSTM(input_size=64, hidden_size=128, bidirectional=True, batch_first=True)
x = torch.randn(8, 30, 64)              # 8 sequences of length 30
out, (h_n, c_n) = bi(x)
print(out.shape)                        # [8, 30, 256]  (128 forward + 128 backward)
print(h_n.shape)                        # [2, 8, 256] -> layer 0 fwd+h_bwd stacked

# NOTE the leak: a backward pass at position t contains x_T..x_{t+1}.
# For GENERATION this is illegal — decoders must stay unidirectional (causal).

# Stacked encoder-decoder seq2seq skeleton
enc = nn.LSTM(64, 128, num_layers=2, batch_first=True)          # takes full input
dec = nn.LSTM(128, 128, num_layers=2, batch_first=True)         # generates output
_, (h_n, c_n) = enc(src)                                        # final states...
_, _ = dec(tgt_in, (h_n, c_n))                                  # ...seed the decoder
# (Bahdanau attention would additionally let each dec step see ALL enc outputs)`,
            'bi_seq2seq.py',
            'python',
          ),
          tip(
            'The encoder/decoder question to ask before any architecture choice',
            'Does this task need the WHOLE input before any output (classify/tag/encode: bidirectional fine) or must each output depend only on previous outputs (generate: causal only)? This single question rules out half the design space immediately — and it is exactly the BERT-vs-GPT question next module formalizes.',
          ),
          warn(
            'Teacher forcing with a bidirectional decoder leaks labels',
            'If the backward direction during training can see future target tokens, the model learns to copy the future and fails at inference. Auditing whether any bidirectional component touches TARGET tokens is a mandatory review step in seq2seq implementations.',
          ),
        ],
        worked: {
          title: 'Design the RNN for three different tasks',
          problem:
            'Specify architecture choices (direction, layers, output mode, state handoff) for: (A) part-of-speech tagging a complete sentence; (B) streaming next-word prediction on a live microphone feed; (C) English-to-French translation. For each justify direction, and state whether teacher forcing applies. Then count parameters qualitatively: which configuration is largest and why?',
          steps: [
            {
              title: 'Task A: POS tagging (offline, per-token labels)',
              desc: 'Input is complete, every tag may use both-sided context: 2-layer BIDIRECTIONAL LSTM, many-to-many output (a classifier on each concatenated h_t). No teacher forcing (labels are per-position, not autoregressive). Parameter count: 4 gates * (directions=2) * (layers=2) * per-layer weights — bidirectional doubles the recurrent params.',
              code_snippet: 'BiLSTM, 2 layers, many-to-many;  no teacher forcing',
            },
            {
              title: 'Task B: streaming next-word (online, causal)',
              desc: 'Future unavailable AND the stream may be endless: single-direction (forward-only) GRU/LSTM, state carried indefinitely, many-to-one output at each step (word distribution), truncated BPTT for training segments. Bidirectional strictly illegal (future tokens do not exist; also leaks). Teacher forcing applies during training (condition on true previous words), with state carried across training segments via detach.',
              code_snippet: 'unidirectional GRU, stateful;  causal;  truncated BPTT',
            },
            {
              title: 'Task C: translation (encoder-decoder)',
              desc: 'Encoder over the FULL source sentence may be bidirectional (source is complete when encoding — 2-layer BiLSTM). Decoder over the TARGET must be unidirectional/causal, initialised with encoder final states, trained with teacher forcing (feed true previous target tokens), decoded greedily/beam at inference. No backward pass ever touches target-side states.',
              code_snippet: 'enc: BiLSTM (full source);  dec: uni LSTM + teacher forcing',
            },
            {
              title: 'Parameter comparison',
              desc: 'Largest: Task C — it contains BOTH a full bidirectional encoder AND an autoregressive decoder, roughly twice Task A\'s recurrent machinery plus output projections over the target vocabulary (often the single biggest tensor: hidden x vocab). Task B is smallest (one unidirectional layer, small vocab head). This mirrors real systems: generation stacks are encoder+decoder; streaming edge models stay tiny and recurrent.',
              code_snippet: 'C (enc+dec+vocab head) > A (Bi) > B (uni single)',
            },
          ],
          solution:
            'A: 2-layer bidirectional LSTM, per-position outputs, no forcing — both-sided context is legal and helpful. B: forward-only GRU with carried state, causal by necessity, teacher-forced training on truncated segments. C: bidirectional encoder + unidirectional decoder, teacher forcing on targets, autoregressive decoding. Parameter ranking C > A > B, dominated in C by vocab-sized output projections. Direction legality — not accuracy fashion — drives these choices.',
        },
        practice: {
          title: 'Audit an RNN system design',
          prompt:
            'You inherit a speech-pipeline design: "Bidirectional LSTM encoder over audio, autoregressive LSTM decoder for streaming TTS output tokens, teacher-forced training." Find every flaw (there are at least two serious ones), state WHY each fails at inference, and write the corrected architecture — including whether any component may legitimately stay bidirectional.',
          hint: 'The decoder sees live requests — bidirectional decoder leaks future target tokens and is impossible online. Also consider: is the audio complete before decoding (yes — encoder may stay Bi), and how does state handoff work?',
        },
        mistakes: [
          {
            mistake: 'Using a bidirectional RNN anywhere in an autoregressive generator',
            fix: 'The backward pass reads tokens that will not exist at inference (or leaks them during training). Causal-only on the target side, always — the direct ancestor of masked attention in decoders.',
          },
          {
            mistake: 'Stacking 8 RNN layers because transformer blocks stack 12',
            fix: 'Each added RNN layer multiplies SEQUENTIAL depth (time steps x layers per step) and historically yields diminishing returns past ~3-4 layers without careful tricks. Depth budgets are architecture-specific, not transferable across paradigms.',
          },
          {
            mistake: 'Concluding "RNNs are dead" from transformer dominance in language',
            fix: 'RNN/GRU components remain standard in streaming detection, edge control, parts of speech pipelines, and re-emerge in modern state-space hybrids. The correct claim: for parallel-pretrained, random-access language models, attention won — a narrower statement.',
          },
          {
            mistake: 'Forgetting to detach hidden state across segments in stateful training',
            fix: 'Without detaching, BPTT graphs grow unboundedly across the stream and OOM; with full reinit, the model loses long memory. Detach-between-segments is the standard pattern — value flows, gradient stops.',
          },
        ],
        exam: {
          question:
            'Why are bidirectional RNNs appropriate as encoders but invalid in autoregressive decoders? Illustrate with a leakage argument and connect it to a named transformer-era counterpart.',
          answer:
            'An encoder processes a COMPLETE input (a sentence to tag, audio to transcribe) before/while producing representations; running a backward pass lets each position\'s representation incorporate right-side context, which is legitimate because that context exists at encoding time and never has to be "generated". An autoregressive decoder must produce output token y_t conditioned only on y_<t (and the encoded input): at inference the future y_>t does not exist, so a backward recurrent pass cannot even be computed. Worse, during teacher-forced TRAINING, a backward pass over target tokens would place future ground-truth tokens inside every state from which predictions are made — the model can trivially copy the future, achieving low training loss while collapsing at inference (label leakage). Hence decoders are strictly unidirectional/causal. The transformer-era counterpart is exactly the BERT-vs-GPT split: BERT-style bidirectional masked models suit understanding/encoding over complete text, while GPT-style models use CAUSAL attention masks (position t attends only to positions <= t) for generation — the attention mask is the transformer formalisation of this same encoder/decoder directionality rule.',
          source: 'Classic seq2seq/interview question; the leakage argument and the BERT/GPT causal-mask connection are what distinguish top answers.',
        },
        summary: [
          'Bidirectional RNNs concatenate forward and backward states for both-sided context — legal only when the full input exists (encoders).',
          'Autoregressive decoders must be causal: backward passes are impossible at inference and leak targets during training.',
          'Stacking adds representational depth across time; seq2seq hands encoder final states to the decoder — the birthplace of attention.',
          'RNNs still fit streaming O(1)-memory inference, edge latency/power budgets, small-data time series, and modern state-space hybrids.',
          'The RNN-vs-transformer axes: across-time parallelism, random access, context limits, and inductive bias — choose by constraints.',
        ],
      }),
      [
        [
          'A bidirectional RNN\'s output at position t concatenates:',
          [
            'Two forward passes',
            'The forward state summarizing x_1..x_t and the backward state summarizing x_T..x_t',
            'The hidden and cell states of one LSTM',
            'Two independent models\' votes',
          ],
          1,
          'Forward pass sees the past through t; backward pass runs from the end toward t — each position\'s representation summarizes both directions of context.',
        ],
        [
          'Bidirectional RNNs cannot be used in an autoregressive decoder because:',
          [
            'They are too slow',
            'The backward pass needs future tokens that do not exist at inference, and would leak ground-truth targets during teacher-forced training',
            'They require twice the vocabulary',
            'Backward passes cannot be backpropagated',
          ],
          1,
          'Both failure modes stem from causality: unavailable future at generation time; label leakage at training time. The model would cheat during training and collapse in deployment.',
        ],
        [
          'In a seq2seq model, the decoder is typically initialised from:',
          [
            'Random states only',
            'The encoder\'s final (per-layer) hidden and cell states for the complete source sequence',
            'The output projection weights',
            'The source vocabulary embedding',
          ],
          1,
          'The encoder\'s final states are the compressed source representation handed to the decoder as its starting memory — the design whose bottleneck motivated Bahdanau attention.',
        ],
        [
          'In the 2020s, recurrent components still commonly appear in:',
          [
            'Frontier LLM pretraining at trillion-token scale',
            'Streaming/edge tasks needing O(1) state, constant-memory inference and microsecond latency (plus modern state-space hybrids)',
            'ImageNet classifiers',
            'Batch offline translation',
          ],
          1,
          'Transformer dominance applies to parallel-pretrained, random-access language workloads; streaming detection, tight-latency control, and Mamba/RWKV-style hybrids are where recurrence\'s constant-state efficiency remains the right constraint match.',
        ],
      ]
    ),
    lesson(
      M4,
      'dl-4-4',
      4,
      'The Bottleneck That Motivated Attention',
      'Why squeezing a sentence into one vector must lose information, Bahdanau\'s additive attention as differentiable look-back, the encoder-decoder alignment it learned, and the logical step from attending over RNN states to attending directly over tokens.',
      22,
      nineBlocks({
        objectives: [
          'Describe the seq2seq fixed-vector bottleneck and why it degrades with sequence length',
          'Explain Bahdanau attention as a differentiable, learned lookup over encoder states with softmax weights',
          'Compute attention weights from a toy alignment score matrix by hand',
          'Trace the design evolution from attention-over-RNN-states to full self-attention (transformer)',
        ],
        hook:
          'The 2014 neural translation model had one job and one weakness: compress an entire French sentence into a single vector, then unpack it into English. Researchers noticed the translation quality collapsed as sentences lengthened past ~20 words — and for a German sentence beginning "Ich reiste nach Berlin, wo ich drei Jahre..." the model would translate the opening beautifully only if it was SHORT, because by the end of the encoding, the details of the beginning had been smeared into statistical mush. The fix proposed was almost impertinently simple: at every generation step, let the decoder look back at ALL encoder positions and pick, by a learned softmax, which ones matter. That single idea — attention — is the seed of every large language model in existence.',
        concept: `**The fixed-vector bottleneck, stated formally.** The encoder maps a source sequence of length T_s to a finite state: either a single vector or a small set of layer-direction summaries (for a 2-layer BiLSTM: 4 x hidden floats total, say 1024 numbers). The decoder must generate from that alone. Information-theoretically, an arbitrary source sequence has unbounded entropy; a fixed-width vector cannot losslessly encode it, so SOMETHING must be discarded — and gradient descent discards whatever hurts the training objective least, which empirically is the low-frequency detail: names, numbers, long-distance agreements, word order in the middle. Empirical signature of the bottleneck: BLEU/accuracy vs sentence length curves drooping steadily after ~15-25 tokens; copy-style tasks (named entities) failing disproportionately. The same signature reappears, at far larger scale, as "lost in the middle" in long-context LLMs decades later — the bottleneck relocated, not eliminated, by naive pooling.

**Bahdanau attention: differentiable look-back.** Keep ALL encoder hidden states (h_1..h_{T_s}) — not just the last. At decoder step s, with its current state z_s, compute a compatibility score e_{s,t} = score(z_s, h_t) for every source position t (originally: a small feedforward net v^T tanh(W_1 z_s + W_2 h_t) — "additive" attention; later simplifications use dot products). Turn scores into weights with SOFTMAX: alpha_{s,t} = exp(e_{s,t}) / sum_k exp(e_{s,k}) — a learned, differentiable DISTRIBUTION over source positions (weights sum to 1; interpretable!). The context vector: c_s = sum_t alpha_{s,t} * h_t — a weighted average of encoder states, dominated by the positions the scorer found relevant. Decoder then computes its step from [z_s, c_s] instead of z_s alone. Crucially EVERYTHING is differentiable: the alpha weights are learned end-to-end by the same backprop that trains everything else — no external alignment tooling, no hard rules. Training implicitly learns ALIGNMENT: visualizing alpha over (source, target) positions reveals the model\'s soft word correspondences — "le" attending to "the", articles drifting under reordering — alignment discovered as a by-product of translation loss.

**What this fixed, quantitatively.** Translation quality stopped collapsing with length; the model could copy rare words by attending directly to them (name translation improved markedly); and the alpha matrix gave the field its first widely-used attention visualization (widely MISused too — attention weights are not causal explanations; correlation, not proof of use — a caution worth carrying into the LLM era\'s attention-map lore). The mechanism\'s conceptual jump: replace "remember everything through a chain" with "retrieve what you need, when you need it". Memory went from lossy sequential to indexed random access — scored by a learned query.

**From attention-over-states to self-attention to transformers — the three logical steps.** (1) ADDITIVE ATTENTION in seq2seq (Bahdanau 2014): decoder queries encoder states; positions in a chain of RNN outputs. (2) Luong/other score variants + multi-step refinements (2015-2016): dot-product scoring, better scoring functions; attention becomes standard inside NMT stacks. (3) THE OBSERVATION (Vaswani et al. 2017): if attending over RNN-generated states works well, why generate the states with an RNN at all? Every RNN-state already summarizes its prefix — but the summary is expensive and lossy. Compute CONTEXTUALIZED representations directly: let every position attend to every position of a raw embedding sequence — SELF-ATTENTION (queries, keys, values all from the same sequence) — stack it with feed-forwards, add positional information (positions have no recurrence to imply order), and you have the transformer. The RNN provided the sequence-modelling scaffolding attention was born inside; attention then replaced it entirely, because direct all-to-all interaction (a) removes the lossy sequential summary, (b) parallelizes across positions, (c) gives O(1) path length between ANY two positions instead of O(T) — long dependencies become one dot product away.

**The economic framing (why this matters for your course trajectory).** RNN era: each new long dependency paid a chain-tax (gradients and information both degrade over distance). Attention: dependency cost is flat in distance — position 1 reaches position 4096 as cheaply as position 4097. Everything in Part II of this course — multi-head attention, positional encodings, BERT/GPT, LLM training — is the direct maturation of the mechanism introduced in this lesson: a softmax-weighted retrieval of values guided by query-key compatibility. Learn it here as "learned, differentiable, content-based lookup" and the next module is expansion, not revelation.`,
        extras: [
          table(
            'The bottleneck lineage',
            ['Era', 'Memory mechanism', 'Long-dependency cost', 'Context limit'],
            [
              ['Plain RNN', 'Overwrite h_t each step', 'Chain of O(T) Jacobians — vanishes', 'Fixed width, effectively short'],
              ['LSTM/GRU', 'Gated cell highway', 'Gradient survives ~hundreds of steps', 'Fixed width, hundreds of steps'],
              ['Seq2seq + Bahdanau', 'All encoder states kept; softmax lookup per step', 'O(1) path to any source position', 'Source length (linear RNN encode)'],
              ['Self-attention (transformer)', 'All positions as keys/values', 'O(1) path between any pair', 'Window/length limits — next module'],
            ],
          ),
          code(
            `import torch
import torch.nn.functional as F

# Bahdanau-style additive attention by hand on a toy step
# Decoder state at step s, encoder states h_1..h_3 (dim 4)
torch.manual_seed(0)
z_s = torch.randn(4)                       # current decoder state
H = torch.randn(3, 4)                      # three encoder states

W1, W2, v = torch.randn(4, 4), torch.randn(4, 4), torch.randn(4)

# Compatibility: e_t = v . tanh(W1 z + W2 h_t)
e = torch.stack([v @ torch.tanh(W1 @ z_s + W2 @ H[t]) for t in range(3)])
alpha = F.softmax(e, dim=0)                # learned distribution over source positions
print("scores:", e.round(decimals=2))
print("attention weights:", alpha.round(decimals=3), "sum =", alpha.sum().item())

context = alpha @ H                        # c = sum_t alpha_t * h_t  -> weighted average
print("context shape:", context.shape)     # [4] — the retrieval the decoder conditions on

# Note: alpha is fully differentiable; training the translation loss trains the
# alignment itself. Visualize alpha over (source, target) = classic alignment plots.`,
            'bahdanau_toy.py',
            'python',
          ),
          tip(
            'Attention weights are a debugging tool, not proof',
            'High weight on token X does not prove the output DEPENDS on X (attention can be non-causal; value vectors and later layers may ignore it). For dependency claims, use ablation/causal tracing. Attention maps are great for spotting alignment failures (the model looking at the wrong source region) — exactly how they were first used in NMT.',
          ),
          warn(
            'Do not "just average" encoder states as a modern substitute for attention',
            'Mean/last-state pooling recreates the 2014 bottleneck in miniature: fixed vector, position-blurred, detail-destroying. Pooling is fine for broad classification (where the head wants one summary), catastrophic for generation or precise extraction — anything that must RETIE specific content to specific positions.',
          ),
        ],
        worked: {
          title: 'Compute additive attention over three encoder states',
          problem:
            'Decoder state z = [1.0, 0.0]. Encoder states: h_1 = [1.0, 1.0], h_2 = [0.0, 1.0], h_3 = [-1.0, 1.0]. Score function (given): e_t = 0.8 * (z · h_t) + 0.3. (a) Compute e_1, e_2, e_3. (b) Softmax them into alpha (use exp values e^1.1 = 3.00, e^0.3 = 1.35, e^-0.5 = 0.61). (c) Compute context c = sum alpha_t h_t. (d) Interpret: which source positions does this decoder step retrieve, and how would you expect c to change if z flipped to [-1.0, 0.0]?',
          steps: [
            {
              title: 'Compatibility scores',
              desc: 'e_1 = 0.8*(1*1 + 0*1) + 0.3 = 0.8 + 0.3 = 1.1. e_2 = 0.8*(1*0 + 0*1) + 0.3 = 0.3. e_3 = 0.8*(1*-1 + 0*1) + 0.3 = -0.8 + 0.3 = -0.5.',
              code_snippet: 'e1 = 1.1;  e2 = 0.3;  e3 = -0.5',
            },
            {
              title: 'Softmax to attention weights',
              desc: 'Denominator = 3.00 + 1.35 + 0.61 = 4.96. alpha = [3.00, 1.35, 0.61]/4.96 = [0.605, 0.272, 0.123]. Sums to 1 — a proper distribution: 60% of retrieval focused on position 1.',
              code_snippet: 'alpha = [0.605, 0.272, 0.123]   (sum = 1.0)',
            },
            {
              title: 'Context vector',
              desc: 'c = 0.605*[1,1] + 0.272*[0,1] + 0.123*[-1,1] = [0.605 + 0 - 0.123, 0.605 + 0.272 + 0.123] = [0.482, 1.0]. A weighted blend pulled toward h_1 (the state aligned with z\'s positive first coordinate).',
              code_snippet: 'c = [0.482, 1.000]',
            },
            {
              title: 'Flip z and predict the shift',
              desc: 'z = [-1, 0]: scores become e_t = 0.8*(-h_t[0]) + 0.3 -> e_1 = -0.5, e_2 = 0.3, e_3 = 1.1 — EXACTLY reversed. Softmax: [0.123, 0.272, 0.605] — retrieval mass swings to h_3. The mechanism is content-addressed: matching query-key sign patterns select different memories. This query-dependent re-weighting per step IS the look-back that fixed seq2seq.',
              code_snippet: 'z flipped: alpha -> [0.123, 0.272, 0.605]  (mass on h3)',
            },
          ],
          solution:
            'Scores [1.1, 0.3, -0.5] -> weights [0.605, 0.272, 0.123] -> context [0.482, 1.0], dominated by h_1. Flipping the query z reverses the ranking entirely ([0.123, 0.272, 0.605], dominated by h_3): attention is a query-conditioned, softmax-normalized, differentiable retrieval — content-based addressing. From this mechanism to self-attention (query = key = value source: the sequence itself) is one conceptual substitution, which the next module executes.',
        },
        practice: {
          title: 'Visualize what attention learned',
          prompt:
            'Train a small seq2seq model (single-layer LSTM encoder/decoder with Bahdanau attention) on character-level reverse-copy or a tiny translation corpus. Plot the alpha matrix for a few sequences as a heatmap. Describe the structure you see for reverse-copy (expect a clear anti-diagonal) and for any real pairs (rough word alignment). Then state one failure case: a sequence where the heatmap is diffuse, and what that predicts about output quality.',
          hint: 'Reverse-copy: position t in output attends to position T-t of input — diagonal stripe. Diffuse alpha everywhere = the model did not learn alignment = expect hallucinated or dropped content.',
        },
        mistakes: [
          {
            mistake: 'Thinking attention replaced the encoder\'s need to represent context',
            fix: 'Attention SELECTS among position representations; those representations still must be contextualized (RNN states did this, transformers do it via self-attention layers). Retrieval over uncontextualized embeddings is far weaker — representation and selection are complementary.',
          },
          {
            mistake: 'Reading alpha heatmaps as causal explanations of model behaviour',
            fix: 'Attention weights show where a head LOOKS, not what the output DEPENDS ON; values can be overwritten downstream and attention can be redundant. Use them for alignment debugging; use ablation for causal claims.',
          },
          {
            mistake: 'Assuming the fixed-vector bottleneck disappeared with attention',
            fix: 'It moved: attention gives random access within the attended window, but pooling-based embeddings (sentence vectors), truncated contexts, and KV-cache limits recreate fixed/limited-width summaries elsewhere. "Lost in the middle" results are the bottleneck\'s long-context echo.',
          },
          {
            mistake: 'Skipping positional information once recurrence is removed',
            fix: 'RNNs implied order through step sequence; self-attention is permutation-equivariant over positions — without positional encodings, "dog bites man" and "man bites dog" are identical input sets. Position must be re-injected explicitly (next module).',
          },
        ],
        exam: {
          question:
            'Explain the seq2seq fixed-vector bottleneck, describe Bahdanau attention\'s computation (scoring, softmax, context), and explain how it differs conceptually from full self-attention in transformers.',
          answer:
            'Bottleneck: a standard encoder-decoder compresses the entire source into the encoder\'s final finite state(s); since a fixed-width vector cannot losslessly encode an unbounded sequence, details are discarded, with translation quality degrading as length grows (empirically past ~15-25 tokens) — long-range specifics like names and middle-of-sentence structure are smeared out. Bahdanau attention: at each decoder step s, score every encoder state against the current decoder state — e_{s,t} = v^T tanh(W_1 z_s + W_2 h_t); normalize across source positions with softmax to get attention weights alpha_{s,t} (a learned distribution summing to 1); form the context c_s = sum_t alpha_{s,t} h_t, a differentiable weighted average emphasizing relevant positions; condition the decoder\'s next step on [z_s, c_s]. All components are trained end-to-end by the same loss, and the alpha matrix implicitly learns word alignment. Conceptual difference from self-attention: Bahdanau attention is CROSS-attention where the query comes from the decoder\'s recurrent state and keys/values are encoder outputs — a look-back into another sequence\'s RNN-computed states. Transformer self-attention instead computes queries, keys, AND values from the SAME sequence directly (no RNN states anywhere), lets every position interact with every position in one parallel step, and is stacked into the whole encoder/decoder — removing both the lossy recurrent chain and the sequential dependency across positions. Attention was born as an RNN accessory; self-attention promoted it to the primary sequence operator.',
          source: 'The canonical "pre-transformer history" question in advanced DL courses; a favourite for testing whether attention\'s origin is understood, not just its equations.',
        },
        summary: [
          'Fixed-vector seq2seq loses information with length — details smear; quality droops past ~20 tokens.',
          'Bahdanau attention: score (z, h_t), softmax to weights, weighted-sum context — differentiable, learned, interpretable alignment.',
          'Attention converts lossy sequential memory into content-addressed retrieval: O(1) path to any source position.',
          'Self-attention is the final substitution: Q, K, V all from the sequence itself — no RNN states, full parallelism, the transformer\'s core.',
          'Attention weights debug alignment but do not prove causation; pooling recreates the bottleneck wherever it is used for precise tasks.',
        ],
      }),
      [
        [
          'The primary defect of fixed-vector seq2seq encoding is that:',
          [
            'It is too slow to train',
            'A finite vector cannot losslessly hold an unbounded sequence, so details are discarded and quality degrades with length',
            'It cannot handle batches',
            'It requires bidirectional LSTMs',
          ],
          1,
          'Information must be squeezed through a fixed-width state; gradient descent keeps what the loss needs most and discards the rest — showing up as length-dependent quality droop and name/copy failures.',
        ],
        [
          'In Bahdanau attention, the context vector c_s at decoder step s is:',
          [
            'The decoder\'s final hidden state',
            'A softmax-weighted average of ALL encoder states, with weights from scoring compatibility with the current decoder state',
            'The concatenation of encoder states',
            'The previous target embedding',
          ],
          1,
          'c_s = sum_t alpha_{s,t} h_t with alpha from softmax over e_{s,t} = score(z_s, h_t) — the differentiable retrieval that replaced reliance on the last state alone.',
        ],
        [
          'Attention weights alpha_{s,t} are produced by a softmax over compatibility scores, which means they:',
          [
            'Are always exactly 0 or 1',
            'Sum to 1 across source positions and form a differentiable distribution trained end-to-end',
            'Equal the model\'s loss gradient',
            'Cannot be visualized',
          ],
          1,
          'Softmax normalizes scores into a probability distribution (sum 1, positive, differentiable) — trainable with everything else, and interpretable as a soft alignment view.',
        ],
        [
          'The conceptual step from Bahdanau attention to the transformer\'s self-attention was to:',
          [
            'Remove softmax from the mechanism',
            'Compute queries, keys, and values directly from the sequence itself instead of attending over RNN-generated encoder states — eliminating the recurrent chain and enabling full parallelism',
            'Apply attention only to the final layer',
            'Replace vectors with scalars',
          ],
          1,
          'If attending over contextual states works, generate those states by attention itself: all positions interact with all positions in one parallel operation — the RNN, the sequential dependency, and the lossy prefix summary all removed at once.',
        ],
      ]
    ),
  ],
};
