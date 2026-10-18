// Module 5 — Transformers: Self-Attention from First Principles
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code } from '../nineBlocks';
import { lesson, M5, COURSE_ID } from './helpers';

export const module5: CourseModule = {
  id: M5,
  course_id: COURSE_ID,
  title: 'Module 5 — Transformers: Self-Attention from First Principles',
  summary:
    'Scaled dot-product attention computed with real matrices, queries/keys/values with plain-English glosses, multi-head attention as parallel subspaces, positional encoding and why permutation-equivariant attention needs it, encoder versus decoder stacks with masked attention, the BERT-vs-GPT objective split, the parallelism argument that killed recurrence, and FLOPs/parameter arithmetic for a transformer block.',
  sort_order: 5,
  lessons: [
    lesson(
      M5,
      'dl-5-1',
      1,
      'Self-Attention Step by Step: Queries, Keys, Values, and the Scaling Factor',
      'The attention equation derived from content-based retrieval intuition, a full matrix computation with hand-computable numbers, why softmax and the sqrt(d_k) divisor are both load-bearing, and what one attention layer actually does to a sequence.',
      24,
      nineBlocks({
        objectives: [
          'Compute Q, K, V projections and the full softmax(QK^T/sqrt(d_k))V product on a 3-token toy example',
          'Explain each of Q, K, V using the database/retrieval analogy and map the analogy back to matrices',
          'Justify the 1/sqrt(d_k) scaling factor from the variance argument and predict what happens without it',
          'State two properties of self-attention (permutation equivariance, all-to-all path length) and their consequences',
        ],
        hook:
          'Here is the entire idea of self-attention in one sentence: for every position in a sequence, produce a QUESTION (query), match it against every position\'s LABEL (key) by dot product, softmax the matches into weights, and read out a weighted AVERAGE of the CONTENTS (values). That is it — a learned, differentiable dictionary lookup, executed for all positions in parallel, with all projections learned from data. Every large language model on earth is built from millions of copies of this one operation. This lesson computes it by hand until it is boring, which is the goal.',
        concept: `**The retrieval analogy, made exact.** You are at a library desk. Your request slip (QUERY) describes what you want. Every shelf carries a catalogue card (KEY) describing what it holds. You compute a match score between your request and every card (dot product: aligned vectors score high), convert scores into attention weights via softmax (a distribution over shelves: total budget 1, most-relevant shelf gets most weight), then read the weighted average of the shelf CONTENTS (VALUES — what you actually take away). The weights are query-dependent: a different request re-ranks the same shelves (this is exactly the z-flip demo from the last lesson). In transformers, the sequence itself plays all three roles: each position\'s embedding produces its own Q (via W_Q), K (via W_K), V (via W_V) — three learned linear projections of the SAME input. Hence SELF-attention: the sequence queries, labels, and serves itself.

**The equation, one line.** Given input X (sequence length T, model dimension d_model):

Q = X W_Q,  K = X W_K,  V = X W_V       (three linear maps, learned)
Attention(Q, K, V) = softmax( Q K^T / sqrt(d_k) ) V

Read the shapes like a machine: Q is (T x d_k), K is (T x d_k), so QK^T is (T x T) — the ALL-PAIRS score matrix, where entry (i, j) scores how much position i\'s query matches position j\'s key. Row-wise softmax turns each row into a distribution over position j (over what position i attends to). Multiplying by V (T x d_v) mixes values: output row i = weighted average of all value vectors, weights = row i of the attention matrix. Output is (T x d_v): every position gets a contextualized representation in ONE step. Note the ingredients from earlier modules, all present: a linear projection (Module 1), softmax (Module 1.3/3.4), a weighted sum (the Bahdanau move), and parallelism across the T axis (where RNNs could not).

**Why the / sqrt(d_k) — the variance argument.** Suppose Q and K entries are i.i.d. with mean 0, variance 1, dimension d_k. Each dot product q·k = sum of d_k products: variance = d_k. So as d_k grows (64 -> 128), scores spread wider — with, say, d_k = 64, typical |score| ~ 8, and softmax of a vector with spread ±8 saturates: outputs become near-one-hot, gradients vanish (softmax\'s tail gradient dies — the saturation pathology from Module 1.2, now inside attention). Dividing by sqrt(d_k) rescales score variance back to ~1 for ANY d_k, keeping softmax in its informative gradient-rich region. Remove the scaling at large d_k and you train an attention layer that behaves like hard argmax with dead gradients. This is one of the paper\'s one-line details that carry real engineering weight.

**What softmax does here (and its inductive bias).** Row-softmax makes attention COMPETITIVE: positions bid for a fixed budget of 1 — increasing one weight necessarily decreases others (contrast with, e.g., sigmoid gating where each is independent). Consequences: context mixtures are always normalized averages (values can\'t all dominate); extreme competition can create attention-collapse (one position takes everything) — related to attention entropy discussions and to why some modern variants (e.g., sparse/max variants in research) tinker here. The zero-sum competition also makes attention patterns interpretable as distributions — the alignment plots of Module 4.4, now self-generated.

**Properties you must be able to derive.** (1) PERMUTATION EQUIVARIANCE without positions: self-attention treats input as a SET — permute rows of X and outputs permute identically (scores depend on content pairs, not indices). "dog bites man" and "man bites dog" produce identical per-position results absent position signals — hence positional encoding (next lesson) is MANDATORY, not decorative. (2) PATH LENGTH O(1): any position directly reaches any other in a single attention step — gradients and information do not traverse a chain (contrast Module 4\'s O(T) chain). This flat path length is why transformers learn long-range dependencies RNNs could not. (3) COMPUTE O(T^2 * d): the T x T score matrix is quadratic in sequence length — the famous quadratic-cost shadow of the architecture (memory/latency implications examined in lesson 5.4).

**What one layer does, practically.** For each token, output = its old embedding + (attention-weighted mix of contextual info from relevant positions) — attention LAYER 1 empirically tracks syntax (previous-token/next-token heads), deeper layers track coreference, semantic roles, and task-relevant relations (the mechanistic-interpretability head catalogue). Stack the operation with per-position feed-forward blocks (the "mixing across positions" then "processing each position" alternation) and you have the transformer block — lesson 5.3 assembles the full stack.`,
        extras: [
          table(
            'Q / K / V, decoded',
            ['Term', 'Library analogy', 'Shape', 'Produced by'],
            [
              ['Query Q', 'Your request slip: "what am I looking for?"', 'T x d_k', 'X W_Q (learned linear map)'],
              ['Key K', 'Shelf catalogue card: "what do I contain?"', 'T x d_k', 'X W_K'],
              ['Value V', 'Actual shelf contents to take away', 'T x d_v', 'X W_V'],
              ['QK^T', 'All request-card match scores', 'T x T', 'matrix multiply'],
              ['softmax(QK^T/sqrt(d_k))', 'Match scores -> weight distribution per row', 'T x T (rows sum to 1)', 'row-wise softmax'],
            ],
          ),
          code(
            `import torch
import torch.nn.functional as F
import math

torch.manual_seed(0)
T, d_model, d_k = 3, 4, 4                   # toy: 3 tokens, model dim 4

X = torch.randn(T, d_model)                 # embeddings of 3 tokens
W_Q, W_K, W_V = (torch.randn(d_model, d_k) for _ in range(3))

Q, K, V = X @ W_Q, X @ W_K, X @ W_V         # (3 x 4) each

scores = Q @ K.T                            # (3 x 3) all-pairs compatibility
scaled = scores / math.sqrt(d_k)            # <-- variance control: var(scores) ~ d_k
alpha = F.softmax(scaled, dim=-1)           # each ROW sums to 1: a distribution over positions
out = alpha @ V                             # (3 x 4): weighted mixture of values per position

print("scores\\n", scores.round(2))
print("attention weights (rows sum to 1)\\n", alpha.round(3))
print("output shape:", tuple(out.shape))    # (3, 4) — every position contextualized at once

# One-line functional form, exactly as in the paper:
def attention(X, Wq, Wk, Wv, mask=None):
    q, k, v = X @ Wq, X @ Wk, X @ Wv
    s = q @ k.T / math.sqrt(q.size(-1))
    if mask is not None:                    # future-masking arrives in lesson 5.3
        s = s.masked_fill(mask == 0, float('-inf'))
    return F.softmax(s, dim=-1) @ v`,
            'scaled_dot_product.py',
            'python',
          ),
          tip(
            'Read the attention matrix as a map of the model\'s moment',
            'Row i (position i\'s weights over positions j) answers "who is i consulting?". Diagonal-dominant rows = token mostly self-focused (identity-ish); previous-token rows = local syntax heads; a row pointing across a long gap = long-range dependency (coreference etc.). This matrix is the most human-readable activation in any transformer.',
          ),
          warn(
            'Forgetting the sqrt(d_k) at larger dimensions silently kills training',
            'At small toy dimensions softmax still trains without scaling; at d_k = 64+ with typical init, scores saturate early and gradients die — a debugging mystery that looks like "the model is not learning attention". Always keep the scaling term; it is part of the definition, not an optional tweak.',
          ),
        ],
        worked: {
          title: 'Compute scaled attention on 3 tokens by hand',
          problem:
            'After projections (already applied), for a 2-dimensional toy: d_k = 2, so sqrt(d_k) = 1.414. Queries/keys/values: q_1 = [2, 0], q_2 = [1, 1], q_3 = [0, 2]; k_1 = [2, 0], k_2 = [1, 1], k_3 = [0, 2]; v_1 = [1, 0], v_2 = [0, 1], v_3 = [1, 1]. (a) Compute the raw score matrix QK^T. (b) Scale by 1/1.414. (c) Row 1: softmax it (use scaled scores -? compute exp values), get alpha_1. (d) Compute position 1\'s output = alpha_1 · V. (e) Without scaling, what does row 1 look like, and why is that worse for gradients?',
          steps: [
            {
              title: 'Raw score matrix',
              desc: '(i,j) = q_i · k_j. Row 1: [2*2+0*0, 2*1+0*1, 2*0+0*2] = [4, 2, 0]. Row 2: [2+0, 1+1, 0+2] = [2, 2, 2]. Row 3: [0+0, 0+2, 0+4] = [0, 2, 4]. Scores spread over range 4 already at d_k = 2.',
              code_snippet: 'S = [[4, 2, 0],\n     [2, 2, 2],\n     [0, 2, 4]]',
            },
            {
              title: 'Scale by 1/sqrt(2)',
              desc: 'S/1.414 = [[2.83, 1.41, 0], [1.41, 1.41, 1.41], [0, 1.41, 2.83]]. Variance of scores back near 1 instead of 2; softmax will spread more evenly (softer weights, healthier gradients).',
              code_snippet: 'S/sqrt(2) = [[2.83,1.41,0],[1.41,1.41,1.41],[0,1.41,2.83]]',
            },
            {
              title: 'Row 1 softmax (scaled)',
              desc: 'exp: e^2.83 = 16.95, e^1.41 = 4.10, e^0 = 1. Sum = 22.05. alpha_1 = [16.95, 4.10, 1]/22.05 = [0.769, 0.186, 0.045]. Position 1 attends mostly to ITSELF (highest match), some to position 2, little to 3 — a plausible "previous-token/self" pattern.',
              code_snippet: 'alpha_1 = [0.769, 0.186, 0.045]  (sums to 1)',
            },
            {
              title: 'Output at position 1',
              desc: 'out_1 = 0.769*[1,0] + 0.186*[0,1] + 0.045*[1,1] = [0.769 + 0.045, 0.186 + 0.045] = [0.814, 0.231]. A value mixture dominated by v_1 but contaminated with context from v_2, v_3 — the token\'s representation now knows its neighbors.',
              code_snippet: 'out1 = [0.814, 0.231]',
            },
            {
              title: 'The no-scaling contrast',
              desc: 'Row 1 unscaled: scores [4, 2, 0] -> exp [54.6, 7.39, 1] / 63 = [0.867, 0.117, 0.016]. Sharper, but at d_k = 64 typical score spread is ±8: weights become ~one-hot (0.9999...), softmax gradient ~alpha*(1-alpha) ~ 1e-4 or smaller — the layer stops learning to attend. Scaling keeps scores in softmax\'s responsive band for any width.',
              code_snippet: 'unscaled row1 = [0.867, 0.117, 0.016]  (and worse at d_k=64)',
            },
          ],
          solution:
            'Scores [[4,2,0],[2,2,2],[0,2,4]] -> scaled by 1/1.414 -> row-1 weights [0.769, 0.186, 0.045] -> output [0.814, 0.231]: a contextually mixed representation for position 1, computed in ONE matrix operation with no recurrence. The scaling factor kept softmax out of saturation — remove it at realistic widths and attention degenerates into near-argmax with dead gradients. This 5-line computation, tiled across layers and heads, is the transformer.',
        },
        practice: {
          title: 'Build and probe attention on a real sentence',
          prompt:
            'Using PyTorch nn.MultiheadAttention (one head, batch_first), run attention over "the animal didnt cross the street because it was too tired" (tokenize simply, embed with random vectors of dim 64). Extract and print the attention matrix. Then: (a) identify which position attends most to which; (b) REPLACE the embedding of "tired" with a random vector and observe how row for "it" changes; (c) explain in two sentences whether this constitutes evidence that the model resolves coreference.',
          hint: 'Random weights mean patterns reflect initialization, not learned structure — use this to learn the plumbing first; (c) should be an honest "no": one forward pass on random weights proves nothing about learned coreference (the attention-vs-causation caution).',
        },
        mistakes: [
          {
            mistake: 'Dropping the sqrt(d_k) scaling because "softmax already normalizes"',
            fix: 'Softmax normalizes WEIGHTS, not score magnitude — large raw scores still saturate softmax into hard argmax with vanishing gradients. Scaling controls the pre-softmax variance, a separate job.',
          },
          {
            mistake: 'Assuming attention outputs are already position-aware',
            fix: 'Pure self-attention is permutation-equivariant: content pairs determine scores, not indices. Without positional encoding, word-order information never enters — reordering the input merely reorders outputs identically.',
          },
          {
            mistake: 'Reading QK^T scores as probabilities',
            fix: 'Scores are unbounded compatibility logits; only after row-softmax do they become a distribution. Score matrices are asymmetric (row i\'s match to j differs from row j\'s to i) — attention is directed, not symmetric similarity.',
          },
          {
            mistake: 'Believing one attention layer "understands" relationships',
            fix: 'Early heads track local/syntactic patterns; semantic/coreference relations emerge across many layers and heads with residual paths. Judging capability from a single layer\'s weights misreads how depth composes the mechanism.',
          },
        ],
        exam: {
          question:
            'Write the scaled dot-product attention formula, explain the role of each component (Q, K, V, transpose, softmax, sqrt(d_k)), and derive why scores must be divided by sqrt(d_k).',
          answer:
            'Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) V. Q, K, V are learned linear projections of the input sequence (Q = XW_Q etc.), each T x d_k (or d_v): Q holds per-position queries ("what am I seeking"), K per-position keys ("what do I offer"), V per-position values ("what content is available to read"). QK^T computes the T x T matrix of all query-key dot-product compatibility scores — position i versus position j — so the transpose aligns keys as columns for row-wise scoring. Row-wise softmax converts each row of raw scores into a probability distribution over positions (weights nonnegative, summing to 1) — the retrieval weights for that query. Multiplying by V yields, at each row, the weighted average of value vectors — the retrieved representation. Scaling derivation: assume query/key components are independent with mean 0 and variance 1; then each dot product q·k = sum_{i=1}^{d_k} q_i k_i has variance d_k (sum of d_k unit-variance terms). For d_k = 64, the standard deviation of raw scores is 8, pushing softmax into saturated regions where its derivative alpha(1-alpha) approaches zero and gradients vanish. Dividing by sqrt(d_k) rescales the score variance to approximately 1 independent of dimension, keeping softmax in the high-gradient regime — empirically essential at the widths real transformers use.',
          source: 'The standard transformer question in every advanced DL exam and ML interview since 2018 — expect the variance derivation for full marks.',
        },
        summary: [
          'Self-attention = learned dictionary retrieval: Q against K scores, softmax weights, V readout — applied to every position in parallel.',
          'Q = XW_Q, K = XW_K, V = XW_V: three learned projections; QK^T is the T x T all-pairs score matrix.',
          '/sqrt(d_k) holds score variance at ~1 for any width — without it, softmax saturates and attention gradients die.',
          'Attention is permutation-equivariant without positions (hence positional encoding) and gives O(1) path length between any pair of positions.',
          'Its cost is O(T^2 * d) in sequence length — the quadratic shadow every long-context engineering decision must address.',
        ],
      }),
      [
        [
          'In scaled dot-product attention, the matrix QK^T has shape:',
          ['T x d_k', 'T x T (all-pairs score matrix)', 'd_k x d_k', 'T x d_model'],
          1,
          'Q is T x d_k and K^T is d_k x T, so the product is T x T: entry (i, j) is position i\'s query matched against position j\'s key.',
        ],
        [
          'The attention weights entering the weighted sum over V are obtained by:',
          [
            'Applying a linear layer to scores',
            'Row-wise softmax over scaled scores, giving each row a distribution summing to 1',
            'Normalizing with batch norm',
            'Taking the absolute value of scores',
          ],
          1,
          'softmax per query-row converts raw compatibility logits into a nonnegatve, sum-1 distribution over positions — the retrieval weights for that query.',
        ],
        [
          'Dividing scores by sqrt(d_k) is necessary because:',
          [
            'It reduces memory usage by half',
            'Dot-product variance grows with d_k (var = d_k); unscaled scores saturate softmax and kill gradients at large widths',
            'Softmax requires inputs in [-1, 1]',
            'The paper\'s authors preferred smaller numbers',
          ],
          1,
          'With unit-variance components, q·k has variance d_k; sqrt(d_k) scaling returns variance to ~1, keeping softmax in its responsive gradient region for any dimension.',
        ],
        [
          'Without any positional encoding, a stack of self-attention layers computes:',
          [
            'Order-sensitive representations',
            'Permutation-equivariant results: reordering input tokens merely reorders outputs — no order information exists to learn',
            'Exactly the same output vector for all positions',
            'Reversed-order representations automatically',
          ],
          1,
          'Scores depend only on content pairs; the operation has no index awareness. "dog bites man" vs "man bites dog" yield identical per-position outputs — order must be injected explicitly.',
        ],
      ]
    ),
    lesson(
      M5,
      'dl-5-2',
      2,
      'Multi-Head Attention and Positional Encoding',
      'Why one attention distribution per position is too little, how h parallel heads in low-dimensional subspaces fix it, and the positional signals (sinusoidal, learned, relative) that make an order-blind operator sequence-aware.',
      22,
      nineBlocks({
        objectives: [
          'Compute multi-head split/concat/projection shapes for a given model dim and head count',
          'Explain why multiple heads in lower dimensions beat one full-width head, with the subspace/relationship-type argument',
          'Compare sinusoidal vs learned absolute vs relative positional encodings on extrapolation and cost',
          'Diagnose a position-handling bug (shuffled tokens, interpolation of positions) from symptoms',
        ],
        hook:
          'Ask a single question about "The trophy did not fit in the suitcase because it was too big" and you will find at most ONE relationship: who attends to whom with one set of weights. But the sentence contains several simultaneous relationships: syntactic attachment (did-not-fit -> suitcase), coreference (it -> trophy), semantic role (too big -> trophy). One attention distribution per token must choose ONE winner. The transformer\'s answer: run 8 or 64 attention computations side by side, each with its own learned projections — each free to specialize in a different relationship TYPE. Multi-head attention, plus the positional signals this lesson also covers, are the two structural upgrades that turn the raw mechanism from a demo into a language model.',
        concept: `**The single-head limitation.** One head outputs, at each position, ONE weighted mixture of values with ONE weight vector. Softmax rows are competitive (budget of 1): if "it" puts 0.7 on "trophy", the remaining 0.3 must cover everything else — attachment relations, local syntax, negation scope all compete for the same budget. Empirically single-head attention learns an averaged, blurry compromise across relationship types: good at none. (This is also why attention visualizations from single heads mislead — the model\'s actual computation is distributed.)

**Multi-head, mechanically.** With model dim d_model = 512 and h = 8 heads: split each projection bank into h groups of d_k = d_v = 64. Head i computes softmax(Q_i K_i^T / sqrt(64)) V_i independently (in PyTorch: one nn.MultiheadAttention does this as batched matmuls). Outputs CONCATENATED back to (T x 512), then a final output projection W_O: MultiHead(Q, K, V) = Concat(head_1..head_h) W_O. Total parameters: h heads x (d_model x d_k x 3) + final d_model x d_model — roughly the SAME as one full-width head doing 4 matmuls of 512x512 (because 8 x 512x64 = 512x512 per projection set: the splitting is a reshape, not a capacity change). So multi-head buys DIVERSITY (h independent softmax distributions in h learned subspaces) at constant parameter cost — the classic "spend compute on parallel perspectives" trade.

**Why low dimensions per head actually help.** Two arguments, both standard. (1) SUBSPACE SPECIALIZATION: each head\'s W_Q/W_K projections choose a 64-dim slice of the 512-dim content space — attention patterns operate on RELATIONSHIPS as seen through that slice. One head can encode one relation pattern; h heads can encode h simultaneously (empirically: heads specialize to previous-token, next-token, delimiter-matching, coreference, positional-bias patterns — the interpretability head catalogue). (2) SOFTMAX REITS: each head has its own competitive budget — head 3 can put 0.9 on "trophy" for coreference while head 5 spends 0.9 on the local previous token for syntax. With one head, these would fight; with h heads, they coexist. Dimension-per-head also keeps score variances tame (the sqrt(64) scaling), echoing lesson 5.1\'s argument. (Practical nuance: heads are NOT guaranteed distinct — redundancy is measurable, and "attention head pruning" research shows many heads are removable or mergeable.)

**Positional encoding: giving order to an order-blind operator.** Self-attention is permutation-equivariant (5.1); sequence tasks are not. Fix: add a positional signal to the embeddings (or, in later designs, inject relative position information inside attention). Two families:

ABSOLUTE (Vaswani\'s original): PE(pos, 2i) = sin(pos / 10000^{2i/d}), PE(pos, 2i+1) = cos(same) — a fixed sinusoidal code where each dimension oscillates at a different frequency, so any offset produces a LINEAR transform of the pattern (allowing the model to learn relative offsets: PE(pos + k) relates to PE(pos) by a fixed rotation-like mixing), and positions are bounded in [-1, 1], enabling modest extrapolation beyond training length (original paper: unseen lengths generalized OK because sinusoids are smooth functions of position — though modern evidence shows this advantage is weaker in practice than hoped). LEARNED absolute: nn.Embedding(max_len, d_model) trained like everything else — simple, dominant in practice (GPT-2/3 style), but hard-capped at max position index (GPT-2: 1024 — extend by interpolating weights, imperfectly). RELATIVE/ROPE: Rotary Position Embeddings rotate Q and K by position-dependent angles so attention SCORES depend only on (i - j) — relative distance, exactly. RoPE is the 2023-2026 LLM standard (LLaMA, Mistral, Qwen, DeepSeek): it extrapolates better than learned absolutes, respects translation structure of language, and interacts cleanly with long-context extensions (NTK/YaRN interpolation methods all manipulate RoPE\'s frequency bands). ALiBi (press et al.): linear distance penalties on scores — another strong extrapoloation option.

**Selection guide.** New vision/classic transformers: learned absolute or sinusoidal, both fine. Modern LLMs: RoPE, essentially universally. Long-context work: RoPE with frequency scaling — the engineering surface of context extension (lesson 5.4\'s compute story is its other half). Key exam point: ANY of these must accomplish the same thing — make the model distinguish "position 2 then 3" from "3 then 2"; permutation equivariance is a property of the attention OPERATION, and position must be injected somewhere (embeddings, attention scores, or both).`,
        extras: [
          table(
            'Positional encoding options',
            ['Scheme', 'Where injected', 'Extrapolation beyond train length', 'Used by'],
            [
              ['Sinusoidal (fixed)', 'Added to embeddings', 'Modest (smooth functions of pos)', 'Original transformer (2017)'],
              ['Learned absolute', 'Added to embeddings (embedding table)', 'Hard cap at max_len (interpolate to extend)', 'GPT-2/3, ViT, BERT'],
              ['RoPE (rotary, relative)', 'Rotates Q and K inside attention', 'Best of family — extend via frequency scaling (YaRN/NTK)', 'LLaMA, Mistral, Qwen — the 2024+ default'],
              ['ALiBi (linear bias)', 'Added as score bias by distance', 'Strong linear-degradation extrapolation', 'Some efficient/long-context models'],
            ],
          ),
          code(
            `import torch, torch.nn as nn, math

# Multi-head: the split, done transparently
d_model, h, T = 512, 8, 10
x = torch.randn(T, d_model)
Wq, Wk, Wv = (nn.Linear(d_model, d_model) for _ in range(3))   # ONE big projection...
q, k, v = Wq(x), Wk(x), Wv(x)

def heads(t):                                    # ...then split into h subspaces
    return t.view(T, h, d_model // h).transpose(0, 1)   # (h, T, d_k)
Q, K, V = heads(q), heads(k), heads(v)

scale = math.sqrt(d_model // h)                  # sqrt(d_k) PER HEAD (64 -> 8)
scores = Q @ K.transpose(-1, -2) / scale         # (h, T, T): one score matrix PER head
alpha = scores.softmax(-1)
head_out = alpha @ V                             # (h, T, d_k)
concat = head_out.transpose(0, 1).reshape(T, d_model)   # back to (T, 512)
out = nn.Linear(d_model, d_model)(concat)        # output projection W_O
print(out.shape)                                 # [10, 512] — same width, 8 perspectives

# Sinusoidal positional encoding (original transformer)
def sinusoidal_pe(max_len, d_model):
    pos = torch.arange(max_len).unsqueeze(1).float()
    i = torch.arange(0, d_model, 2).float()
    angle = pos / (10000 ** (i / d_model))
    pe = torch.zeros(max_len, d_model)
    pe[:, 0::2] = torch.sin(angle)
    pe[:, 1::2] = torch.cos(angle)
    return pe
print(sinusoidal_pe(100, 512).shape)             # [100, 512]

# Rotary (RoPE) intuition — rotate q,k by position: score(q_i, k_j) depends on (i - j)
def rope(angle, vec):                            # 2D block rotation
    c, s = torch.cos(angle), torch.sin(angle)
    return torch.stack([vec[..., 0::2] * c - vec[..., 1::2] * s,
                        vec[..., 0::2] * s + vec[..., 1::2] * c], -1)`,
            'multihead_position.py',
            'python',
          ),
          tip(
            'Head count vs head dim: keep d_k ~ 64',
            'Common configs: 8 heads x 64 (d_model 512), 16 x 64 (1024), 32 x 64-128 (4096+). The pattern: d_model grows, heads grow, d_k stays in the 64-128 band where scaling and specialization work well. When reading a model card, d_model / heads gives you d_k instantly.',
          ),
          warn(
            'Extrapolating learned absolute positions past max_len is a silent failure',
            'Ask a GPT-2-style model (learned PE, max 1024) for 2000 positions and the embedding lookup either errors or forces ad-hoc index remapping — quality drops with no crash. RoPE\'s frequency-scaling tools (YaRN etc.) exist precisely because position extrapolation is an engineering surface, not an automatic property.',
          ),
        ],
        worked: {
          title: 'Compute multi-head shapes and parameter parity',
          problem:
            'Transformer encoder, d_model = 512, h = 8 heads, d_v = 64, feed-forward dim 2048, vocabulary 32000. (a) Give Q/K/V shapes per head for T = 128 tokens. (b) Compute the parameter count of the attention part (W_Q, W_K, W_V, W_O) with multi-head vs the same total projection width claimed as "one head with d_k = 512" — are they equal? (c) Compute the full block parameter count (attention + FFN with two matrices) and state what fraction the FFN holds. (d) How many independent softmax distributions does the model compute per position per layer?',
          steps: [
            {
              title: 'Per-head shapes',
              desc: 'Per head: Q, K are (T x d_k) = (128 x 64); V is (128 x 64). All 8 heads together: (8, 128, 64) as a batched tensor; scores per head: (8, 128, 128). Concat after: (128, 512).',
              code_snippet: 'per head: Q,K: [128, 64];  V: [128, 64];  scores: [8, 128, 128]',
            },
            {
              title: 'Attention parameter parity',
              desc: 'Multi-head: W_Q = 512 x 512, W_K = 512 x 512, W_V = 512 x 512, W_O = 512 x 512 — total 4 x 512 x 512 = 1,048,576. Splitting into heads is a reshape of the SAME projection matrix (8 x [512 x 64] = 512 x 512 per projection). "One 512-wide head": identical 4 matrices — IDENTICAL parameter count. Multi-head = free diversity.',
              code_snippet: '4 * 512 * 512 = 1,048,576  (same either way)',
            },
            {
              title: 'Full block parameters',
              desc: 'Attention: 1,048,576 (+ biases negligible). FFN: 512 x 2048 + 2048 x 512 = 1,048,576 + 1,048,576 = 2,097,152 (often no bias in modern LLMs). Block total ≈ 3,145,728 (+ norms ~1k). FFN share: 2.10M / 3.15M ≈ 66.7% — two-thirds of block parameters live in the per-token FFN, not attention (despite attention\'s fame).',
              code_snippet: 'attn 1.05M + ffn 2.10M = 3.15M  (FFN = 67%)',
            },
            {
              title: 'Distributions per position per layer',
              desc: '8 heads = 8 independent softmax rows per position per layer (each a full distribution over T positions). Across L layers: 8L retrievals per token. The model\'s "who consults whom" computation per layer per token is genuinely multi-perspective — the reason single-head visualizations never told the whole story.',
              code_snippet: '8 softmax distributions per position per layer',
            },
          ],
          solution:
            '(a) Per head Q/K/V: 128 x 64; per-head score matrix 128 x 128. (b) Multi-head and full-width variants use the SAME four 512x512 projections — parameter parity (1.05M); heads are free parallel perspectives via reshaping. (c) Block ≈ 3.15M params, FFN holding ~67%. (d) 8 independent attention distributions per position per layer. The economics: attention buys diversity at no parameter cost, and the FFN — not attention — carries most block capacity.',
        },
        practice: {
          title: 'Probe head specialization',
          prompt:
            'Load a small pretrained transformer (e.g. GPT-2 small: 12 layers x 12 heads). For one sentence, extract the attention matrices of every head in layers 1, 6, and 12. Classify each head\'s pattern: previous-token? broad/uniform? strong one-target? diagonal? Summarize your findings in a table layer x head, and describe how patterns differ between early, middle, and late layers. What does the variety across heads in ONE layer tell you about the multi-head motivation?',
          hint: 'Earlier heads often look local/mechanical (previous token), middle heads relational, later heads more diffuse or task-specific — the diversity-per-layer observation is the payoff claim of this lesson.',
        },
        mistakes: [
          {
            mistake: 'Thinking each head computes attention over different TOKENS',
            fix: 'Every head sees the same sequence; heads differ in their PROJECTIONS (which subspace of content they compare) and their learned scoring behaviour — not in which positions exist. Heads = different questions asked of the same text.',
          },
          {
            mistake: 'Assuming multi-head costs quadratic extra parameters',
            fix: 'Splitting d_model into h heads of d_k = d_model/h keeps total projection parameters constant (h * 3 * d_model * d_k = 3 * d_model^2). Diversity comes from h separate softmax operations and subspaces, not from added weights.',
          },
          {
            mistake: 'Believing sinusoidal encodings are what modern LLMs use',
            fix: 'The 2017 paper\'s sinusoids were largely displaced by learned absolute embeddings (GPT/BERT era), and those by RoPE (LLaMA era). If your exam/interview answer says "all transformers use sine waves", it is two generations stale.',
          },
          {
            mistake: 'Adding positional encoding twice or forgetting it entirely in a custom model',
            fix: 'Typical design: add absolute PE to embeddings exactly once at input (or use RoPE inside attention INSTEAD) — doing both or neither are both real implementation bugs; symptoms: shuffled-token sensitivity vanishing, or double-counted position priors.',
          },
        ],
        exam: {
          question:
            'Explain multi-head attention: how it is computed, why parameters do not increase relative to a single full-width head, and what it buys. Then compare sinusoidal and learned positional encodings, naming the modern default for LLMs and why.',
          answer:
            'Computation: the input is projected to Q, K, V of full width d_model, reshaped into h heads of dimension d_k = d_model/h; each head independently computes softmax(Q_i K_i^T / sqrt(d_k)) V_i over the same sequence; the h outputs (T x d_v each) are concatenated to (T x d_model) and passed through an output projection W_O. Parameter parity: projections are h separate d_model x d_k maps per Q/K/V — which sum to d_model x d_model each (h * d_k = d_model), identical to a single full-width projection; splitting is a reshape of the same learned capacity. Benefit: h independent softmax distributions in h learned low-dimensional subspaces — heads can specialise in different relationship types (local syntax, coreference, delimiter matching, positional biases) simultaneously, instead of competing for one softmax budget of 1 per position; empirically this multi-perspective capacity improves quality at constant parameter cost (redundancy across heads notwithstanding). Positional encodings: sinusoidal — fixed sin/cos functions at geometric frequencies, added to embeddings; no training parameters, modest extrapolation by smoothness. Learned — a trainable embedding table indexed by absolute position; simple, matches training distribution, but hard-limited to max position and retraining/interpolation needed to extend. Modern LLMs overwhelmingly use ROTARY (RoPE) — a relative scheme rotating Q and K so scores depend on position DIFFERENCES, with frequency scaling for long-context extension — as the de facto default (LLaMA/Mistral/Qwen/DeepSeek); learned absolute remains common in vision transformers.',
          source: 'Core advanced-DL exam pairing (multi-head + positional encoding); RoPE naming separates current from textbook-only answers.',
        },
        summary: [
          'Multi-head: h independent attention computations in h subspaces, concatenated + output-projected — diversity at constant parameters.',
          'Each head gets its own softmax budget: multiple relationship types coexist instead of competing for one weight distribution.',
          'Keep d_k around 64-128; heads scale with model width, not the other way around.',
          'Positional information is mandatory (permutation equivariance otherwise): sinusoidal or learned absolute added to embeddings; RoPE (relative) is the modern LLM default.',
          'Position extrapolation beyond training length is an engineering problem — learned absolute fails silently, RoPE needs frequency scaling.',
        ],
      }),
      [
        [
          'Multi-head attention with d_model = 512 and 8 heads uses d_k = 64 per head. Total projection parameters versus a single full-width head are:',
          [
            '8x larger',
            'Identical — heads partition the same total projection width (h x d_k = d_model)',
            '8x smaller',
            'Unrelated to head count',
          ],
          1,
          'h separate d_model x d_k projections sum to d_model x d_model each for Q, K, V — exactly a full-width projection; the split is a reshape, not added capacity.',
        ],
        [
          'The main functional benefit of multiple heads is that:',
          [
            'Each head processes a different sentence in the batch',
            'Each head computes an independent attention distribution in its own learned subspace, letting different relationship types be captured simultaneously',
            'Heads reduce the quadratic cost of attention',
            'Heads replace the feed-forward layer',
          ],
          1,
          'One head must spend a single softmax budget across all relations; h heads each get their own — specialization (syntax, coreference, positional patterns) coexists rather than averaging into a blur.',
        ],
        [
          'Rotary position embeddings (RoPE), now standard in LLMs, work by:',
          [
            'Adding a learned vector to each embedding',
            'Rotating queries and keys by position-dependent angles so attention scores depend on relative position (i - j)',
            'Concatenating position indices to the input',
            'Shuffling tokens during training',
          ],
          1,
          'RoPE encodes position as rotation of Q/K; the inner product after rotation depends on the angular difference — relative distance — which extrapolates and scales for long context better than absolute lookup embeddings.',
        ],
        [
          'A model with learned absolute positional embeddings of max_len = 512 asked to process 800 tokens will:',
          [
            'Automatically learn positions 513-800 on the fly',
            'Fail or require out-of-range handling — the embedding table has no rows beyond 511, and any ad-hoc extension degrades quality silently',
            'Ignore the last 288 tokens only',
            'Switch to sinusoidal encoding automatically',
          ],
          1,
          'A finite learned table ends at max_len; running past it forces truncation, index remapping, or interpolation — all degrade without a hard crash. This extrapolation gap is a key reason RoPE displaced learned absolutes.',
        ],
      ]
    ),
    lesson(
      M5,
      'dl-5-3',
      3,
      'Encoder vs Decoder Stacks, Masked Attention, and the BERT/GPT Split',
      'The transformer\'s two stacks assembled block by block, causal masking that makes generation legal, cross-attention as Bahdanau\'s successor, and how pretraining objectives (masked prediction vs next-token) created the BERT-understanding and GPT-generation lineages.',
      24,
      nineBlocks({
        objectives: [
          'Draw the transformer encoder and decoder stacks with every sublayer (LN position, FFN dims, residual paths)',
          'Explain why causal masking makes self-attention legal for autoregressive generation and compute a masked score row',
          'Distinguish encoder-only, decoder-only, and encoder-decoder models by objective, mask, and use case',
          'State what cross-attention queries/keys/values come from in a seq2seq transformer',
        ],
        hook:
          'Two models, identical attention mechanism, opposite world-views. BERT reads a sentence with BOTH sides visible, hides 15% of tokens, and must guess them from context — a reader\'s skill: cloze, comprehension, classification. GPT sees only the left context and must produce the very next token — a writer\'s skill: continuation, generation. Same blocks, one difference — the MASK — and from that fork grew the entire modern model taxonomy: understanding models vs generation models vs the seq2seq middle path that translation built. This lesson assembles the architecture, then explains the fork.',
        concept: `**The encoder stack (BERT\'s body).** N identical blocks (12 in BERT-base, 12-96 in modern encoders). Each block: (1) multi-head SELF-attention over the whole sequence — every position attends to every position (bidirectional, NO mask); (2) position-wise feed-forward network: FFN(x) = W_2 · gelu(W_1 x) applied independently at each position with expansion (d_model -> d_ff = 4 x d_model -> d_model) — the "think about the gathered info" step; (3) residuals + layer norms around each sublayer, PRE-norm in modern variants (x + Sublayer(LN(x)) — ResNet\'s lesson, applied everywhere) with post-norm in the original 2017 formulation (LayerNorm(x + Sublayer(x))). Input: token embeddings + positional encodings. Output at each position: a contextualized representation used for classification, tagging, or as keys/values for a decoder.

**The decoder stack (GPT\'s body, and translation\'s second half).** Same skeleton with two differences: (1) MASKED (causal) self-attention — position i may attend only to positions <= i, enforced by setting all score entries where j > i to negative infinity BEFORE softmax (they become weight 0 exactly). Masked attention makes each output depend only on left context — the legal foundation for autoregressive generation and the direct formal descendant of Module 4\'s "decoders must be causal" rule. (2) In encoder-decoder transformers, an additional CROSS-ATTENTION sublayer between masked self-attn and FFN: queries from the decoder\'s current states, keys and values from the ENCODER\'s outputs — Bahdanau attention with dot-product scoring and multiple heads, unchanged in spirit. A decoder-only LLM (GPT/LLaMA) simply omits the cross-attention (no encoder) — full-length causal self-attention over the prompt+generation.

**Causal masking, computed.** For T = 4, the mask is a lower-triangular 0/1 matrix: row i allows columns 0..i. Implementation: scores.masked_fill(upper_triangle, -inf), then softmax — rows become distributions over the visible prefix only (row 3 sums weights over all 4; row 0 only over itself: a position can always attend to itself). The causal property is what makes training massively parallel DESPITE generation being sequential: during teacher-forced training, ALL next-token predictions are computed in ONE forward pass (each position\'s output already only saw its prefix — no leakage), while INFERENCE must still generate one token per step (feed back the last token, recompute attention with the growing KV cache — lesson 5.4\'s efficiency story).

**The three model families, and the fork\'s cause.** ENCODER-ONLY (BERT, RoBERTa, ALBERT): bidirectional self-attention, no mask, pretrained with MASKED LANGUAGE MODELLING (hide 15% of tokens, predict them — plus NSP in original BERT) and typically fine-tuned for classification, QA extraction, tagging — understanding tasks where the whole input exists. DECODER-ONLY (GPT family, LLaMA, Mistral, Qwen, DeepSeek): causal masked self-attention, NEXT-TOKEN PREDICTION objective, pretrained autoregressively and used for generation, chat, reasoning — anything you prompt. ENCODER-DECODER (original transformer, T5, BART, mBART, NMT systems): bidirectional encoder + masked decoder + cross-attention, pretrained with span corruption (T5) or denoising; traditional strength: translation, summarization, tasks with distinct input/output modalities. The 2018-2020 history: BERT dominated understanding benchmarks, GPT-1/2 showed scaling of generative pretraining, and by GPT-3 (2020) the "one causal model for everything via prompting" view began winning the market — today\'s LLM landscape is overwhelmingly decoder-only, with encoder-decoder persisting in translation/summarization products and encoder-only in classification-as-a-service. The masks differ; the blocks do not.

**Reading a spec sheet, finally.** "12-layer, 768-dim encoder with 12 heads" = BERT-base: 12 blocks, d_model 768, d_k 64, bidirectional. "32-layer decoder, 4096-dim, 32 heads, d_ff 11008" = a LLaMA-7B-class model: 32 masked blocks, d_k 128, SwiGLU FFN expansion ~2.7x with gate — decode it all from Module 5\'s vocabulary: blocks = layers, dims = d_model, heads -> d_k, FFN dims, and the mask tells you which family. (For the parameter counting that makes "7B" mean something, the next lesson does the arithmetic.)`,
        extras: [
          table(
            'Three families, one mechanism',
            ['Family', 'Attention mask', 'Pretraining objective', 'Typical uses', 'Examples'],
            [
              ['Encoder-only', 'Bidirectional (none)', 'Masked token prediction (MLM)', 'Classification, tagging, QA extraction, embeddings', 'BERT, RoBERTa, DeBERTa'],
              ['Decoder-only', 'Causal (lower-triangular)', 'Next-token prediction', 'Generation, chat, code, reasoning — modern LLM default', 'GPT-2/3/4-class, LLaMA, Mistral'],
              ['Encoder-decoder', 'Enc: none / Dec: causal + cross', 'Denoising / span corruption / MLM', 'Translation, summarization', 'Original transformer, T5, BART'],
            ],
          ),
          code(
            `import torch, torch.nn.functional as F
import math

# Causal mask: the one line that makes generation legal
T = 4
scores = torch.randn(T, T)
causal = torch.tril(torch.ones(T, T))               # lower triangle = 1
scores_masked = scores.masked_fill(causal == 0, float('-inf'))
alpha = F.softmax(scores_masked, dim=-1)
print(alpha.round(3))
# row 0: [w, 0, 0, 0]      <- attends only to itself
# row 1: [w, w, 0, 0]      <- prefix of length 2
# row 3: [w, w, w, w]      <- full visibility (all are "past" of position 3)
assert torch.allclose(alpha.triu(diagonal=1), torch.zeros(T, T))  # strict future = 0

# Transformer block (pre-norm, modern ordering)
class Block(torch.nn.Module):
    def __init__(self, d=512, h=8, ffn=2048):
        super().__init__()
        self.ln1 = torch.nn.LayerNorm(d)
        self.attn = torch.nn.MultiheadAttention(d, h, batch_first=True)
        self.ln2 = torch.nn.LayerNorm(d)
        self.ffn = torch.nn.Sequential(
            torch.nn.Linear(d, ffn), torch.nn.GELU(), torch.nn.Linear(ffn, d))
        self.register_buffer('mask', torch.triu(torch.ones(999, 999), 1) == 0)

    def forward(self, x):
        a, _ = self.attn(self.ln1(x), self.ln1(x), self.ln1(x), attn_mask=self.mask)
        x = x + a                                  # residual around sublayer 1
        x = x + self.ffn(self.ln2(x))               # residual around sublayer 2
        return x

# Cross-attention (seq2seq decoder sublayer): Q from decoder, K/V from encoder
# cross_attn(query=dec_x, key=enc_out, value=enc_out)`,
            'mask_and_block.py',
            'python',
          ),
          tip(
            'The mask tells you the family before the name does',
            'Reading a new model\'s code: attention with no mask -> encoder; lower-triangular mask -> decoder-only; both a triangular mask AND a cross-attention call to encoder outputs -> encoder-decoder seq2seq. One grep for triu/masked_fill classifies any architecture.',
          ),
          warn(
            'Post-norm vs pre-norm changes training stability, not capacity',
            'Original 2017 post-norm (LN after residual) needed warmup care and capped practical depth; pre-norm (x + Sublayer(LN(x))) trains deeper stacks stably with less warmup sensitivity — modern default. If a deep model diverges early in training, LN placement is one of the first suspects.',
          ),
        ],
        worked: {
          title: 'Assemble and mask a 2-layer decoder block chain',
          problem:
            'Decoder-only model, d_model = 8, 2 heads, T = 4 tokens. (a) State the sublayer order in one block and what each sublayer does at position 2 specifically (which positions can masked self-attn at position 2 see?). (b) A cross-attention in an encoder-decoder variant at position 2: what do Q, K, V come from, and what is K/V\'s length? (c) Compute the number of score entries zeroed by the causal mask at T = 4, and the general formula. (d) Given per-head d_k = 4, verify the scaling divisor for this model.',
          steps: [
            {
              title: 'Block order and position 2 visibility',
              desc: 'Pre-norm order: LN -> masked MHA -> residual add -> LN -> FFN -> residual add. At position 2 (0-indexed), masked self-attention may attend to positions 0, 1, 2 — row 2 of the attention matrix has exactly 3 nonzero weights (columns 3 forced to 0 by the mask), each summing to 1 across those 3. Position 2\'s output depends only on tokens 0-2 — causal by construction.',
              code_snippet: 'pos 2 sees cols {0,1,2};  col 3 masked -> weight = 0',
            },
            {
              title: 'Cross-attention sources',
              desc: 'Q = projections of the DECODER\'s current hidden states (length T_dec: at step s, the positions generated so far); K, V = projections of the ENCODER\'s outputs (length T_enc: the complete source). So the decoder\'s question is answered from the full input — this is Bahdanau\'s c_s = sum alpha h_t, now with learned Q/K/V projections and h heads. Score matrix shape: (T_dec x T_enc), unlike square self-attention.',
              code_snippet: 'Q: [T_dec, d];  K,V: [T_enc, d];  scores: [T_dec, T_enc]',
            },
            {
              title: 'Mask arithmetic',
              desc: 'Full score matrix: T^2 = 16 entries. Masked (strict upper triangle, j > i): T(T-1)/2 = 4*3/2 = 6 entries set to -inf -> exactly 0 after softmax. General: for length T, T(T-1)/2 of T^2 entries are zeroed — about half the matrix at large T, i.e., causal models still compute (and store) the full square matrix in naive implementations, only relying on the mask for correctness (which is where FlashAttention-style skipping earns its memory savings).',
              code_snippet: 'T=4: 6 of 16 entries masked;  general: T(T-1)/2',
            },
            {
              title: 'Scaling check',
              desc: 'd_model = 8, h = 2 -> d_k = 8/2 = 4. sqrt(d_k) = 2. Scores = QK^T / 2. The divisor uses PER-HEAD d_k, not d_model — using d_model (sqrt(8) = 2.83) would under-scale by 41%, a subtle but real mismatch.',
              code_snippet: 'd_k = 8/2 = 4;  scale = sqrt(4) = 2',
            },
          ],
          solution:
            '(a) LN -> masked self-attn -> residual -> LN -> FFN -> residual; position 2 sees only positions 0-2. (b) Cross-attn: Q from decoder, K/V from encoder outputs — scores are (T_dec x T_enc), the sequentiel look-back upgraded to multi-head. (c) 6 of 16 entries masked at T=4; T(T-1)/2 generally. (d) scale = sqrt(d_k) = sqrt(4) = 2 — the per-head dimension, never d_model. Four details, each a place implementations go subtly wrong; each a favourite exam check.',
        },
        practice: {
          title: 'Map a real model onto this vocabulary',
          prompt:
            'Take any publicly documented model (GPT-2, BERT-base, t5-small, LLaMA-3-8B-config): fill a table with layers, d_model, heads, d_k, FFN dim, norm placement (pre/post), activation, mask type, and family (encoder/decoder/enc-dec). Then write three sentences predicting which family best fits each task: legal-contract clause classification with full document; email auto-reply generation; English-Hindi translation.',
          hint: 'Full document + label = encoder (bidirectional); generation = decoder-only (causal); two-language transformation with distinct input/output = encoder-decoder with cross-attention.',
        },
        mistakes: [
          {
            mistake: 'Applying cross-attention between two decoder sequences in a decoder-only LLM',
            fix: 'Decoder-only models have NO encoder and NO cross-attention — everything is causal self-attention over one stream (prompt + generation). Cross-attention exists only in encoder-decoder architectures (T5, NMT). Mislabeling sublayers confuses audits of any new model.',
          },
          {
            mistake: 'Forgetting the mask during training but using it at inference (or vice versa)',
            fix: 'Training without the mask lets each position see the answer (future tokens) and produces a model that fails at generation; inference without it is impossible anyway. Teacher forcing + mask is the consistent pair — check any custom loop for this exact inconsistency.',
          },
          {
            mistake: 'Assuming BERT can generate text naturally',
            fix: 'BERT\'s bidirectional masked objective never trains left-to-right continuation; text generation with BERT-style models requires awkward fill-in schemes (and is generally abandoned). Objective + mask define capability — architecture alone does not.',
          },
          {
            mistake: 'Mixing up where LayerNorm sits between pre-norm and post-norm when reading papers',
            fix: 'Post-norm: LN(x + Sublayer(x)) — original transformer, harder to train at depth. Pre-norm: x + Sublayer(LN(x)) — modern default (GPT-2+ transition), stabilizes deep training. Schematics differ; code diffs are one line; exam answers get marked on the distinction.',
          },
        ],
        exam: {
          question:
            'Describe the transformer decoder\'s masked self-attention: its purpose, mechanics (how masking is implemented), and its gradient/behavioural consequences. What does it make possible during training that sequential RNN generation could not do?',
          answer:
            'Purpose: enable autoregressive generation while keeping training parallel — each output position may depend ONLY on positions at or before it, mirroring the requirement that a generative model at inference sees no future tokens. Mechanics: before softmax, all score entries with key-position j > query-position i are set to -infinity (implementation: add a lower-triangular boolean/float mask, or masked_fill with -inf); softmax maps -inf to exactly zero weight, so row i of the attention matrix distributes its unit mass over positions 0..i only. (Formally the mask keeps the causal factorization p(x_1..x_T) = prod p(x_t | x_<t) consistent with training.) Consequences: the representation at position t is a function of the prefix only — legal at inference; row lengths differ per position so early positions have softmax over fewer entries; about half the score matrix is structurally zero. What it makes possible: with teacher forcing, the ENTIRE training sequence computes next-token logits at all T positions in ONE forward pass (all rows already satisfy causality), so training parallelizes across time — something the RNN\'s mandatory step-by-step recurrence could never do (Module 4\'s sequential wall). Inference remains sequential by nature (each new token depends on previous ones), optimized with KV caching rather than recomputation.',
          source: 'Standard transformer-mechanics exam/interview question; the training-parallelism point is what links it back to the RNN comparison.',
        },
        summary: [
          'Encoder = bidirectional self-attn + FFN per block (BERT): whole input visible, understanding tasks.',
          'Decoder = masked causal self-attn + FFN (GPT), plus cross-attention (Q from decoder, K/V from encoder) when a source exists.',
          'Causal masking = lower-triangular -inf before softmax: rows distribute weight over the prefix only — generation-legal, training-parallel.',
          'Objectives fork the lineage: masked prediction (BERT, encoder) vs next-token (GPT, decoder) vs denoising (T5, enc-dec).',
          'Pre-norm residuals + per-head d_k scaling + correct mask placement: the implementation details where architectures silently break.',
        ],
      }),
      [
        [
          'In a transformer decoder, queries, keys, and values for CROSS-ATTENTION come from:',
          [
            'All from the decoder',
            'All from the encoder',
            'Q from the decoder\'s states; K and V from the encoder\'s outputs',
            'Q and K from the decoder; V from embeddings',
          ],
          2,
          'Cross-attention lets each decoder position query the full encoded source: queries are decoder-side questions, keys/values are the source representations — Bahdanau attention with learned projections.',
        ],
        [
          'Causal (masked) self-attention is implemented by:',
          [
            'Shuffling the input tokens',
            'Setting all score entries with key position > query position to -infinity before softmax, so their weights become exactly 0',
            'Applying dropout to future positions',
            'Removing future tokens from the batch entirely',
          ],
          1,
          'A lower-triangular mask over the T x T score matrix: row i keeps columns 0..i; -inf entries are mapped to zero probability by softmax — strict prefix-only attention.',
        ],
        [
          'BERT is an encoder-only model pretrained with masked language modelling; its natural strengths are:',
          [
            'Autoregressive text generation',
            'Bidirectional understanding tasks: classification, tagging, extraction, embeddings',
            'Translation between two languages',
            'Image generation',
          ],
          1,
          'Full-context bidirectional attention + cloze-style pretraining suits representation/understanding tasks; it was never trained for left-to-right generation — the mask/objective split in action.',
        ],
        [
          'A key training consequence of causal masking with teacher forcing is:',
          [
            'Loss becomes zero',
            'All T next-token predictions compute in a single parallel forward pass (each position sees only its prefix), removing the RNN\'s sequential-through-time training barrier',
            'The model no longer needs backpropagation',
            'Inference also becomes a single step',
          ],
      1,
          'With teacher forcing and the mask, every position\'s prediction is valid simultaneously — training parallelizes across time. Inference stays sequential (each token depends on prior ones), accelerated by KV caching.',
        ],
      ]
    ),
    lesson(
      M5,
      'dl-5-4',
      4,
      'Why Transformers Parallelize — and the FLOPs/Parameter Arithmetic',
      'The recurrent wall versus attention\'s parallel-time computation, training vs inference cost split with KV caching, and the parameter/FLOP formulas that let you read any "7B/70B" model card and estimate its memory or training budget.',
      24,
      nineBlocks({
        objectives: [
          'Derive why RNN training is sequential across time while transformer training parallelizes over sequence positions',
          'Compute a transformer\'s parameter count from its config (embeddings, attention, FFN, norms) and check against a published size',
          'Estimate inference memory: parameters vs KV cache, with a worked multi-GPU example',
          'Compute attention FLOPs for a given (T, d, layers) and identify when the quadratic term dominates',
        ],
        hook:
          'In 2017 the transformer\'s pitch was not primarily accuracy — it was arithmetic you can do on a whiteboard. "Attention Is All You Need" reported training a base model (65M params) in 12 hours on 8 GPUs; recurrence could not touch that parallelism, and the gap compounds: an RNN with a 2,000-step sequence performs 2,000 sequential operations where the transformer performs ONE batched operation over all positions. On GPUs, where throughput is everything, sequential time is the most expensive currency in the building. This final lesson does the cost arithmetic — parameter counts, FLOPs, memory, KV caches — because every deployment decision you will ever make is a cost decision.',
        concept: `**The parallelism argument, stated precisely.** RNN: output h_t is a FUNCTION of h_{t-1} — the forward pass for step 2000 cannot begin until step 1999 finished. That is T sequential kernel launches per sequence per layer; gradient computation (BPTT) is likewise sequential through time. Training wall-clock scales with sequence length in a way GPUs hate: idle silicon waiting on dependencies. Transformer self-attention: outputs at ALL positions are computed by ONE matrix product — softmax(QK^T/sqrt(d_k))V — where every position\'s result depends on the same projected Q, K, V tensors, computable simultaneously (after the projections, which are also batched). Sequences of length 2,000 cost the same DEPTH of computation as length 100 (with more FLOPs, but the same number of sequential steps). The fundamental shift: recurrence bought sequential correctness with sequential cost; attention buys parallel computation with a quadratic FLOP bill instead. GPUs forgive FLOPs (they are what GPUs are made of); they cannot forgive serialization.

**Where the quadratic shows up (and doesn\'t).** Attention scores: QK^T is T x d times d x T => O(T^2 * d) per layer — the term that grows with sequence length. Matrix multiplies in FFN and projections: O(T * d^2) per layer — grows with WIDTH, constant in T\'s quadratic sense. At small T and large d (typical early training: T = 4k, d = 8k), the d^2 terms dominate and attention\'s quadratic is invisible; at LONG T (64k, 128k context), T^2 d catches up and attention cost/memory becomes the design constraint — which is why the long-context race spawned FlashAttention (memory-efficient exact attention), sliding-window/local attention, linear-attention research, and RoPE frequency-scaling context extension. The quadratic is real but lives at the LONG-context end; short-context serving is dominated by FFN/weight-matmul cost (and memory bandwidth).

**Training vs inference: the split that runs production.** TRAINING compute (forward + backward): roughly 6 * N * P FLOPs for a model with P parameters trained on N tokens (6 = 2x forward + 2x backward-of-forward + 2x backward-into-weights, the Chinchilla-era standard rule: ~6 params * tokens). P = 7B, N = 1T tokens: 6 * 7e9 * 1e12 = 4.2e22 FLOPs — at 1e15 effective FLOPs/s (a small cluster), ~490 days; at 4e15 (serious cluster), ~120 days. (The same rule gives the Chinchilla-optimal 20 tokens/param: 7B -> 140B tokens.) INFERENCE: per generated token, one forward pass ~2 * P FLOPs — sequential per token (generation is inherently autoregressive), but BATCHED across requests. The growing cost at inference is the KV CACHE: attention at step s needs keys/values for ALL previous positions — stored per layer per head: kv_bytes = 2 (K and V) * layers * d_model * seq_len * batch * bytes_per_param (fp16 = 2). Worked below: a 70B model at 8k context per request holds tens of GB of cache — the reason serving engines (vLLM, paged attention) treat KV as their central resource, why long context costs money, and why speculative/prefix caching exist.

**Parameter counting, the universal skill.** For a decoder-only model with d_model = d, L layers, h heads, FFN inner dim m, vocab V, max position P: (1) embeddings: V * d (token table; tied with output head in many models — GPT-2 ties, LLaMA\'s lm_head is separate: 2*V*d or V*d depending on tying); (2) per layer: attention 4 * d^2 (W_Q, W_K, W_V, W_O each d x d; LLaMA-style GQA reduces K/V projection sizes — grouped-query attention with g kv-groups cuts K and V to d*(d/g)); FFN: 3 * d * m for gated (SwiGLU: gate + up + down = 3 matrices) or 2 * d * m for plain; norms negligible. Sanity check on LLaMA-7B: d = 4096, L = 32, m = 11008, V = 32000: attn = 32 * 4 * 4096^2 ≈ 2.15B; ffn = 32 * 3 * 4096 * 11008 ≈ 4.43B; embeddings = 32000 * 4096 ≈ 0.13B (+ head) => ~6.7B — the "7B". From a config you can reconstruct a model\'s size; from size and context you can reconstruct its memory; from memory you can reconstruct its GPU bill. This chain — config -> params -> memory -> cost — is the FLOPs/parameter intuition the course wants, and it is exactly what deployment sizing, model selection, and LLM interviews test.

**The scorecard closing the module.** Transformers won because: parallel-through-time training (GPU economics), O(1) path length (long dependencies), softmax-weighted random access (quality on long context), and a clean uniform block (hardware-friendly regularity, simple scaling laws). They pay: quadratic-in-length attention (mitigated by engineering), no built-in recurrence prior (data-hungry), and autoregressive inference latency (mitigated by batching, caching, and speculation). Every module in Part II of this course — embeddings, LLM pipelines, generation/sampling, practical PyTorch, optimization/deployment — operates on top of the machinery you now hold: the block, the mask, the cost model.`,
        extras: [
          table(
            'RNN vs transformer compute structure',
            ['Phase', 'RNN', 'Transformer'],
            [
              ['Forward through T steps', 'T sequential steps (each waits on previous)', '1 batched computation over all positions'],
              ['Gradient through T', 'Sequential BPTT chain', 'Backprop over parallel graph — still no time-chain'],
              ['Cost growth in T', 'Linear in FLOPs, linear in SEQUENTIAL depth', 'Linear FLOPs in projections/FFN, QUADRATIC in attention scores'],
              ['GPU utilization', 'Low at long T (idle waiting)', 'High — big matmuls saturate tensor cores'],
              ['Inference state', 'O(1) recurrent state', 'KV cache O(T) growing per sequence'],
            ],
          ),
          code(
            `import math

# ---- Parameter count from config (decoder-only, LLaMA-style) ----
def params_llama(d=4096, L=32, m=11008, V=32000, tied=True):
    emb = V * d if tied else 2 * V * d
    per_layer = 4 * d * d + 3 * d * m          # attn (QKVO) + gated FFN (3 mats)
    norms = 2 * d                              # 2 pre-norms per layer (approx)
    return emb + L * (per_layer + norms)

P = params_llama()                              # ~6.7e9 -> "7B"
print(f"params: {P/1e9:.2f}B")

# ---- Training FLOPs: 6 * P * N tokens ----
N = 140e9                                       # Chinchilla-ish: ~20 tokens/param
train_flops = 6 * P * N
print(f"train FLOPs: {train_flops:.2e}")         # ~5.6e22
# 1 minute at 1e15 FLOP/s sustained: 6e16 -> days = train_flops / 1e15 / 86400

# ---- KV cache for inference ----
def kv_cache_gb(L=32, d=4096, seq=8192, batch=1, heads_kv=32, bytes=2):
    # per token per layer: 2 (K,V) * (d/h * heads_kv) ; here full heads
    per_tok = 2 * L * d * bytes                 # fp16: K and V at each layer
    return per_tok * seq * batch / 1e9

print(f"KV cache 70B-ish, 1 seq, 8k ctx: {kv_cache_gb(80, 8192, 8192, 1):.2f} GB")
print(f"x batch 32: {kv_cache_gb(80, 8192, 8192, 32):.2f} GB")  # cache dominates GPUs

# ---- Attention vs FFN FLOPs at long context ----
def block_flops(T, d, m):
    attn_scores = 2 * 2 * T * T * d             # QK^T + alpha*V (x2 for mul-add)
    attn_proj   = 2 * 2 * T * d * d             # Q,K,V,O projections
    ffn         = 2 * T * d * m * (3 if gated else 2)
    return attn_scores, attn_proj + ffn

s, p = block_flops(T=131072, d=8192, m=28672)   # 128k context, big model
print(f"attn-score FLOPs {s:.2e} vs linear-ish {p:.2e}  -> quadratic dominates")`,
            'cost_arithmetic.py',
            'python',
          ),
          tip(
            'The three numbers to memorise',
            '(1) ~6 * P * N FLOPs to train P params on N tokens. (2) ~2 * P FLOPs per generated token (forward only). (3) KV bytes = 2 * L * d_model * seq * batch * dtype-bytes. From these three you can size a cluster, a GPU, or a serving bill for any model in minutes.',
          ),
          warn(
            'GQA/MQA shrink the KV cache\'s K/V projections — update your formulas',
            'Grouped-query attention (LLaMA-2 70B onward) uses fewer KV head groups than Q heads (e.g., 8 KV heads vs 64 Q heads): K/V projections and the KV CACHE both shrink by that ratio (64 -> 8 = 8x smaller cache). When estimating cache for a modern model, count KV groups, not attention heads.',
          ),
        ],
        worked: {
          title: 'Size a training run and an inference server from scratch',
          problem:
            'Model A: 13B params, trained on 500B tokens. Model B: 70B with grouped-query attention (8 KV groups, d_model 8192, 80 layers), fp16, serving batch 16 requests at 4,096-token context. (a) Training FLOPs for A; days on a cluster sustaining 4e15 FLOPs/s. (b) Per-token forward FLOPs for A. (c) KV cache bytes per sequence for B; total for batch 16; interpret against an 80GB GPU. (d) For a layer\'s attention scores at T = 4096, d = 8192 on B: score-matrix FLOPs vs projection FLOPs — which dominates?',
          steps: [
            {
              title: '(a) Training FLOPs for 13B x 500B tokens',
              desc: '6 * P * N = 6 * 1.3e10 * 5e11 = 3.9e22 FLOPs. At 4e15 FLOP/s: 3.9e22 / 4e15 = 9.75e6 seconds = 9.75e6/86400 ≈ 113 days of full cluster time.',
              code_snippet: '6 * 1.3e10 * 5e11 = 3.9e22  ->  3.9e22/4e15/86400 ≈ 113 days',
            },
            {
              title: '(b) Per-token inference FLOPs for A',
              desc: 'One forward pass ≈ 2 * P = 2 * 1.3e10 = 2.6e10 FLOPs per token. At 100 tokens/s decode on one request: 2.6e12 FLOP/s — far below a GPU\'s peak (memory-bandwidth bound, not FLOP bound: weights must stream per token — the real inference bottleneck).',
              code_snippet: '2 * 1.3e10 = 2.6e10 FLOPs/token',
            },
            {
              title: '(c) KV cache for B, batch 16',
              desc: 'Per sequence: 2 (K,V) * 80 layers * 8192 d_model * 4096 tokens * 2 bytes (fp16) — with GQA the K/V width equals KV-groups * head_dim: 8 heads * 128 = 1024, NOT 8192: 2 * 80 * 1024 * 4096 * 2 = 1.34e9 bytes ≈ 1.34 GB per sequence. Batch 16: ~21.5 GB of cache — plus 70B * 2 bytes = 140 GB of weights (itself multi-GPU). GQA\'s 8x cache reduction (vs full 64-head KV: ~10.7 GB/seq) is precisely why it became standard.',
              code_snippet: '2*80*1024*4096*2 = 1.34 GB/seq;  x16 = 21.5 GB',
            },
            {
              title: '(d) Score vs projection FLOPs at T = 4096',
              desc: 'Score path (QK^T + weighted V): 4 * T^2 * d = 4 * 4096^2 * 8192 = 5.5e11 FLOPs. Projections (QKVO): 8 * T * d^2 = 8 * 4096 * 8192^2 = 2.2e12. At T=4096 the LINEAR-in-T projection/FFN terms still dominate (~4x); the quadratic catches attention only when T approaches d-scale (T > 8k-16k). Lesson: short-context serving is weight-bound, long-context is attention-bound.',
              code_snippet: 'scores 5.5e11 vs projections 2.2e12  ->  projections win at 4k',
            },
          ],
          solution:
            '(a) 3.9e22 FLOPs ≈ 113 days at 4e15 FLOP/s — this is what "training cost" means numerically. (b) 2.6e10 FLOPs/token forward; serving is usually bandwidth-bound regardless. (c) GQA KV cache: ~1.34 GB/sequence, ~21.5 GB at batch 16 — 8x smaller than naive full-KV, and still a multi-tens-of-GB system alongside 140 GB of weights. (d) At 4k context, projections/FFN beat score-matrices ~4:1; the quadratic only rules at genuinely long contexts. Config-to-cost arithmetic, end to end — the working intuition this module closes on.',
        },
        practice: {
          title: 'Read a model card and price it',
          prompt:
            'Pick any open model with a published config (LLaMA-3-8B, Mistral-7B, Qwen-2.5-7B): (1) reconstruct its parameter count from config and compare to the advertised number (explain any gap — embeddings, GQA, tied heads); (2) compute fp16 weight memory; (3) compute KV cache per sequence at its max context with GQA accounted; (4) estimate training FLOPs if it had seen 8x its parameter count in tokens, and days on 1024 H100s at 50% utilization (H100 bf16: ~990 TFLOP/s peak). Show all arithmetic.',
          hint: 'Params: emb + L*(4d^2 + ffn mats + GQA-adjusted K/V). FLOPs/s cluster: 1024 * 990e12 * 0.5 ≈ 5e17. Keep units honest — this exercise is unit-discipline more than theory.',
        },
        mistakes: [
          {
            mistake: 'Assuming generation is fast because "attention computes all positions at once"',
            fix: 'PARALLEL applies to training (teacher-forced) and prefill (processing a prompt). Autoregressive DECODE is one token per step by definition — each depends on previous outputs. Parallelism bought training throughput; decode latency is tamed by batching and KV caching, not by attention itself.',
          },
          {
            mistake: 'Estimating KV cache with full d_model per layer when the model uses GQA',
            fix: 'With KV groups g < heads, K/V store g * head_dim per position, not d_model — overestimates cache by the head/group ratio (often 4-8x). Check the config\'s num_key_value_heads before sizing GPUs.',
          },
          {
            mistake: 'Concluding quadratic attention makes long context impossible',
            fix: 'The quadratic term is exact but ENGINEERABLE: FlashAttention (memory-efficient exact kernels), sparse/sliding-window attention (approximate), and better hardware change constants and memory behaviour; context-extension methods stretch trained models. "Quadratic" is a cost curve, not a wall.',
          },
          {
            mistake: 'Forgetting the backward pass triples training cost vs forward-only',
            fix: 'Forward = ~2P FLOPs/token; training adds backward-through-activations and backward-into-weights — the standard 6PN rule encodes it. Deployments compare forward-only (inference) against 3x-forward training steps; mixing the two constants misprices runs.',
          },
        ],
        exam: {
          question:
            '(a) Explain why transformer training parallelizes over sequence positions while RNN training cannot. (b) Given d_model = 4096, 32 layers, ffn dim 11008, vocab 32000 (tied embeddings), compute the approximate parameter count of a decoder-only transformer, showing components. (c) State the standard training-FLOP rule of thumb and the KV-cache size formula.',
          answer:
            '(a) An RNN\'s h_t depends on h_{t-1}; computing any later step requires all earlier steps — T sequential kernel operations per layer, and BPTT\'s gradient chain mirrors that serialization. Transformer self-attention computes outputs for ALL T positions from the SAME projected Q, K, V with batched matrix multiplication — no inter-position dependency exists within the operation (the mask is a static pattern, not a data dependency), so the entire sequence forward/backward runs in parallel; wall-clock training becomes independent of sequence length in DEPTH (only FLOPs grow). That GPU-friendly structure is the core efficiency argument of the 2017 paper. (b) Embeddings: 32000 * 4096 = 131M. Per layer: attention 4 * 4096^2 = 67.1M; FFN (2 matrices) 2 * 4096 * 11008 = 90.2M; norms ~8k negligible; total per layer ≈ 157.3M; x32 layers ≈ 5.03B; plus embeddings ≈ 5.17B (with separate output head: +131M -> ~5.3B; gated-FFN variants use 3 matrices: +45.1M/layer ≈ 6.6B total — which is why config details like gated FFN and tied heads matter for exact counts). (c) Training rule of thumb: ~6 * P * N FLOPs for P parameters trained on N tokens (forward 2PN + backward 4PN); per-token generation forward ≈ 2P FLOPs. KV cache bytes ≈ 2 * L * d_kv * T * B * bytes_per_element where d_kv is the K/V width per position (full d_model for MHA; KV-groups * head_dim for GQA), L layers, T context, B batch, and 2 bytes for fp16/bf16.',
          source: 'The capstone arithmetic question of transformer mechanics sections — common in advanced DL exams and LLM-systems interview screens.',
        },
        summary: [
          'RNN forward/gradient are sequential through time; attention computes all positions in one batched operation — GPU economics made this decisive.',
          'Attention scores cost O(T^2 d); projections/FFN cost O(T d^2) — short contexts are weight-bound, long contexts attention-bound.',
          'Train: ~6PN FLOPs. Generate: ~2P per token. Serve: KV cache = 2 * L * d_kv * T * B * bytes — the three sizing formulas.',
          'Parameter counting from config: embeddings + L * (4d^2 + FFN mats) — reconstruct any model card\'s B-number and memory.',
          'GQA shrinks K/V projections and cache by the group ratio; FlashAttention and context extension are engineering answers to the quadratic.',
        ],
      }),
      [
        [
          'Transformer training parallelizes across sequence positions because:',
          [
            'It uses smaller batches than RNNs',
            'All positions\' attention outputs derive from the same projected Q, K, V in batched matrix multiplies — no step depends on the previous position\'s OUTPUT (the mask is static)',
            'It does not need backpropagation',
            'Positional encodings remove the need for sequential computation',
          ],
          1,
          'Self-attention has no data dependency across positions within the operation: T outputs compute simultaneously; the causal mask is a fixed pattern, not a runtime dependency — versus h_t\'s hard dependence on h_{t-1}.',
        ],
        [
          'A model config: d_model = 2048, 24 layers, FFN 8192, vocab 25000 (tied embeddings). Approximate total parameters:',
          ['~1.9B', '~0.3B', '~12B', '~250B'],
          0,
          'Emb 25000*2048 ≈ 51M; per layer: 4*2048^2 = 16.8M + 2*2048*8192 = 33.6M ≈ 50.4M; x24 ≈ 1.21B; total ≈ 1.26B (plain FFN; gated 3-matrix FFN pushes ~1.45B) — closest is the billion-class option.',
        ],
        [
          'The KV cache at inference exists because:',
          [
            'The model weights must be duplicated per request',
            'Autoregressive attention at step s needs keys/values of all previous tokens — caching them avoids recomputing projections over the whole prefix every step',
            'Softmax requires stored gradients',
            'Training data must be kept in memory',
          ],
          1,
          'Each decode step reuses prior positions\' K/V; recomputing them from scratch every step would be O(T) wasted work per token — the cache trades O(T) memory for O(1)-ish incremental computation, and its growth is the central serving constraint.',
        ],
        [
          'The standard rule "training cost ≈ 6 * P * N FLOPs" means that doubling the training data at fixed model size:',
          [
            'Doubles training compute (6PN is linear in tokens N)',
            'Quadruples it',
            'Leaves it unchanged',
            'Halves it',
          ],
          0,
          '6PN is linear in N: twice the tokens = twice the FLOPs. (The 2PN forward-only constant covers inference prefill/generation passes — a different budget.)',
        ],
      ]
    ),
  ],
};
