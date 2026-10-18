// Module 8 — Generation & Sampling
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, code } from '../nineBlocks';
import { lesson, M8, COURSE_ID } from './helpers';

export const module8: CourseModule = {
  id: M8,
  course_id: COURSE_ID,
  title: 'Module 8 — Generation & Sampling',
  summary:
    'Decoding as search: greedy and beam search with length normalization and the V^T search-space arithmetic; temperature, top-k and top-p computed on a real logit vector; repetition penalties and speculative draft-then-verify decoding with its acceptance-rate math; then image generation from the inside — forward and reverse diffusion, guidance, schedulers — and how multimodal systems put vision and text into one generation loop.',
  sort_order: 8,
  lessons: [
    lesson(
      M8,
      'dl-8-1',
      1,
      'Autoregressive Decoding: Greedy, Beam Search, and the Search Space',
      'Turning next-token probabilities into a sequence: why per-step argmax is not sequence argmax, beam search as best-first tracking with the length-normalization fix, and the arithmetic of a search space nobody can enumerate.',
      21,
      nineBlocks({
        objectives: [
          'Explain why greedy decoding can be suboptimal with a worked local-vs-sequence probability example',
          'Execute a width-2 beam search by hand, including cumulative log-prob bookkeeping',
          'Compute the effect of length normalization and state when it is required',
          'Size the decoding search space (V^T) and the beam-search cost (O(B x V x T))',
        ],
        hook:
          'The model gives you a probability distribution over the next token at every step — so generation looks trivial: take the best token, repeat. Two surprises await. First, taking the locally best token at every step does not produce the globally most probable sequence (greedy can walk itself into a low-probability sentence after an early "great" choice). Second, when people tried the obvious fix — beam search — on open-ended text generation, bigger beams often made outputs WORSE: blander, more repetitive, less diverse. Both surprises are explained by the search-space arithmetic in this lesson.',
        concept: `**The task.** A causal LM defines p(y_1..y_T) = PRODUCT_t p(y_t | y_<t) (Module 5.3). Decoding aims to produce y* = argmax over ALL token sequences of p(y|x) — maximum a-posteriori sequence generation. The catch: the space is V^T sequences — for V = 50,000 and T = 100, that is 50,000^100 candidates (a 1 followed by 480 digits). Exact MAP search is impossible by enumeration; every decoder is a heuristic over this space.

**Greedy: one-step lookahead, forever.** At each step emit argmax_t p(y_t | prefix). Cost: one forward pass per token (plus KV cache, Module 5.4) — the cheapest legal decoder. Failure mode: LOCAL CHOICES DO NOT COMPOSE GLOBALLY. Example shape: at step 1, "The" (0.30) edges out "Photosynthesis" (0.28) for a biology prompt; after "The", every continuation is mediocre (product ~0.01), while after "Photosynthesis" the sentence becomes highly probable (product ~0.05). Greedy is locked into the first branch — sequence probability 5x worse despite winning step 1. Greedy also has a signature failure: it REPEATES itself (a loop gives each repeated token high conditional probability — the degenerate attractor that module 8.3 attacks).

**Beam search: track B partial hypotheses.** Keep the B highest cumulative-log-probability prefixes alive; at each step, expand each by its top successors, keep the B best globally; finish at EOS and return the best. Width B = 1 is greedy; B = 8-64 standard for TRANSLATION/summarization-style tasks where the objective really is sequence probability. Complexity: per step, score B x V candidates and select top B (O(B V) with selection, O(B V log(BV)) with heap/sort per step; total O(B V T)) — still linear-ish, not V^T: search, not enumeration. Two known issues: (1) LENGTH BIAS: cumulative log-probs are negative and accumulate — a 20-token sequence is penalized ~10x more than a 2-token one for equal per-token quality, so raw-sum beam search systematically prefers SHORT outputs; fix with LENGTH NORMALIZATION: score = (sum log p) / T (average log-prob) or the GNMT form (sum log p) / T^alpha with alpha ≈ 0.7 — a tuned compromise; (2) DIVERSITY COLLAPSE on open-ended text: beams converge to similar high-likelihood phrasings; worse, with a strong LM the first-best token usually dominates so much that all B beams share it (beam search degenerates to greedy with wasted compute), while its deterministic mode strips the naturalness that sampling provides. Verdict by task: translation/structured extraction — beam (or length-normalized beam) still reasonable; chat/creative/anything open-ended — SAMPLING (next lesson) beats beams almost universally in modern LLM serving.

**Where sampling and constraints fit.** Stopping criteria matter too: EOS token, max-length caps, stop strings, and CONSTRAINTS (grammar/JSON-schema constrained decoding: at each step mask the logits to only tokens that keep the partial output syntactically valid — search with rules, guaranteeing parseable output; the clean bridge to structured-output APIs). And remember the prefill/decode split: prompt processing is parallel, decode is sequential — every decoder in this lesson assumes the KV cache is warm (Module 5.4).`,
        extras: [
          table(
            'Decoding strategies compared',
            ['Strategy', 'Search', 'Output character', 'Best for', 'Cost per token'],
            [
              ['Greedy', 'Local argmax', 'Deterministic, repetitive risk', 'Factual/short completions, baselines', '1 decode step'],
              ['Beam (width B, length-norm)', 'B tracked hypotheses', 'Deterministic, "safe" high-likelihood', 'Translation, extraction, scoring', 'B x V scored per step'],
              ['Temperature sampling', 'None — stochastic', 'Diverse, natural', 'Chat, creative, open-ended', '1 decode step + RNG'],
              ['Constrained decoding', 'Masked argmax/sample', 'Guaranteed valid structure', 'JSON/grammar-bound output', '1 step + mask logic'],
            ],
          ),
          code(
            `import torch
import torch.nn.functional as F

# ---- Greedy vs beam on toy next-token distributions ----
def greedy(step_probs):                 # list of (V,) distributions per step
    out, lp = [], 0.0
    for p in step_probs:
        i = p.argmax().item()
        out.append(i); lp += torch.log(p[i]).item()
    return out, lp

def beam(step_probs, B=2):
    beams = [([], 0.0)]                 # (tokens, cumulative log-prob)
    for p in step_probs:
        cand = []
        for toks, s in beams:
            topk = torch.topk(p, B)
            for v, logp in zip(topk.indices, topk.values):
                cand.append((toks + [v.item()], s + torch.log(logp).item()))
        beams = sorted(cand, key=lambda x: x[1], reverse=True)[:B]   # keep best B
    return beams

probs = [torch.tensor([0.4, 0.35, 0.15, 0.1]),
         torch.tensor([0.5, 0.2, 0.2, 0.1]),
         torch.tensor([0.6, 0.2, 0.1, 0.1])]
print("greedy:", greedy(probs))
print("beam  :", beam(probs, B=2))

# ---- Length normalization: the length-bias fix ----
def norm_score(sum_logp, length, alpha=1.0):
    return sum_logp / (length ** alpha)     # alpha=1: average; alpha~0.7: GNMT style

print(norm_score(-6.0, 3), norm_score(-7.0, 5))   # raw sum prefers first; average may not

# ---- EOS / stop handling: decode loop skeleton ----
def decode(model, prompt_ids, max_new=64):
    ids = prompt_ids
    for _ in range(max_new):
        logits = model(ids[:, -512:]).logits[:, -1]        # prefill/decode with cache in practice
        nxt = logits.argmax(-1, keepdim=True)              # greedy step
        if (nxt == model.eos_token_id).all():
            break                                          # stop on EOS
        ids = torch.cat([ids, nxt], dim=-1)
    return ids`,
            'decoding.py',
            'python',
          ),
          tip(
            'Match the decoder to the objective',
            'If you would score the output by sequence log-likelihood (translation, extraction), search for it (beam + length normalization). If you would score it by human preference (chat, creative), sample from the distribution — beam search optimizes the wrong objective there and collapses diversity.',
          ),
          warn(
            'Raw-sum beam search quietly truncates outputs',
            'Cumulative log-probs are negative: longer hypotheses accumulate more penalty, so the beam returns shorter and shorter answers as V and T grow. Always divide by T (or T^0.7) before comparing hypotheses of different lengths — this single line is the difference between beam search working and "the model stopped answering".',
          ),
        ],
        worked: {
          title: 'Run a width-2 beam and audit length bias',
          problem:
            'Step-1 token probabilities: A = 0.45, B = 0.35, C = 0.20. After A: X = 0.70, Y = 0.30. After B: X = 0.50, Y = 0.50. After C: X = 0.90, Y = 0.10. (a) Greedy decode (width 1) with cumulative log-prob (use ln). (b) Beam width 2 through step 2 — which two hypotheses survive? (c) Length bias: hypothesis H1 = 2 tokens with sum log p = -1.2, H2 = 5 tokens with sum = -2.0 — which wins raw, which wins average, and which SHOULD win if per-token quality is what we want? (d) Compute V^T for V = 50,000, T = 100 as a power of ten. (e) Beam cost: B = 4, V = 50k, T = 100 — how many scores per sequence, and what fraction of exhaustive search?',
          steps: [
            {
              title: '(a) Greedy',
              desc: 'Step 1: argmax = A (0.45), ln 0.45 = -0.799. Step 2 after A: argmax = X (0.70), ln = -0.357. Cumulative = -1.156; sequence AX with p = 0.45 x 0.70 = 0.315. Greedy never looks back.',
              code_snippet: 'greedy: AX,  sum ln p = -0.799 + -0.357 = -1.156',
            },
            {
              title: '(b) Beam width 2 after step 2',
              desc: 'Step 1 keep top-2: A (-0.799), B (ln 0.35 = -1.050). Expand: AX = -0.799 - 0.357 = -1.156; AY = -0.799 + ln 0.30 (-1.204) = -2.003; BX = -1.050 + ln 0.50 (-0.693) = -1.743; BY = -1.050 - 0.693 = -1.743. Global top-2: AX (-1.156) and BX (-1.743) (BY ties BX at -1.743 — tie broken by order). Survivors: AX, BX.',
              code_snippet: 'AX -1.156 ;  BX -1.743 ;  (AY -2.003, BY -1.743 dropped/tied)',
            },
            {
              title: '(c) Length normalization',
              desc: 'Raw sums: H1 = -1.2 beats H2 = -2.0 (higher is better) — beam with raw scores prefers the 2-token answer. Average: H1 = -1.2/2 = -0.60; H2 = -2.0/5 = -0.40 — H2 WINS under average log-prob. If both hypotheses have comparable per-token quality, H2 deserves the win: raw summation is systematically biased against longer sequences, which is precisely the truncation pathology of the warning above.',
              code_snippet: 'raw: -1.2 > -2.0 (H1)   |   avg: -0.40 > -0.60 (H2)',
            },
            {
              title: '(d) The exhaustive space',
              desc: 'V^T = 50,000^100 = (5 x 10^4)^100 = 5^100 x 10^400. 5^100 ≈ 7.9 x 10^69, so total ≈ 7.9 x 10^469 sequences — more candidates than atoms in the observable universe by a factor of ~10^440. No amount of compute enumerates this; decoding MUST be heuristic (or exploit structure like constraints/DP for special cases).',
              code_snippet: '50,000^100 = 5^100 x 10^400 ~ 7.9 x 10^469 sequences',
            },
            {
              title: '(e) Beam cost vs exhaustive',
              desc: 'Scores computed: B x V per step x T = 4 x 50,000 x 100 = 2 x 10^7 scores per sequence. Fraction of exhaustive: 2e7 / 7.9e469 ~ 10^-463 — beam search touches an infinitesimal slice of the space, guided by the model\'s own probabilities. Cost is linear in B, V, T — the practical trade: B = 1..64 buys modest search quality for linear compute.',
              code_snippet: '4 x 50,000 x 100 = 2e7 scores  ~  10^-463 of the space',
            },
          ],
          solution:
            '(a) Greedy: AX, sum ln p = -1.156. (b) Beam-2 survivors: AX (-1.156), BX (-1.743). (c) Raw sums favor short H1; average log-prob favors H2 — normalize by length (T or T^0.7) whenever hypotheses differ in length. (d) ~7.9 x 10^469 candidates: exact MAP is impossible, decoding is heuristic search. (e) 2 x 10^7 scores = an infinitesimal fraction of the space — beam is cheap linear-time guessing with a model prior, not search in the exhaustive sense.',
        },
        practice: {
          title: 'Compare decoders on a real model',
          prompt:
            'With a small open model (GPT-2 class): (1) implement greedy and width-8 length-normalized beam (pure PyTorch, no library magic) and generate 10 prompts each; (2) score every output BOTH ways (total and average log-prob) and show at least one prompt where the rankings disagree; (3) trigger greedy repetition (long max-new-tokens on a factual prompt) and paste the loop; (4) show beam width 64 producing blander text than width 2 on a creative prompt — measure with distinct-2 (unique bigrams / total bigrams); (5) conclude with a one-line decoder recommendation per task type.',
          hint: 'Total-vs-average ranking disagreement is the length-bias lesson made visible. For (4), expect distinct-2 to FALL as beam width rises on open-ended prompts — diversity collapse, quantified.',
        },
        mistakes: [
          {
            mistake: 'Assuming greedy finds the most probable sequence',
            fix: 'Per-step argmax optimizes each conditional independently; the product over steps can be beaten by a different path (local vs global optimum). Beam approximates global MAP — but only under the sequence-likelihood objective, with length normalization.',
          },
          {
            mistake: 'Comparing raw cumulative log-probs across different lengths',
            fix: 'Log-probs are negative and additive: longer sequences always accumulate lower sums at equal per-token quality. Divide by T (or T^0.7) before comparing, or your beam systematically truncates.',
          },
          {
            mistake: 'Using beam search for open-ended chat because "it searches harder"',
            fix: 'More beams on a strong LM converge to near-identical safe phrasings and REMOVE sampling diversity — often worse than greedy. Beam suits likelihood-scored tasks (translation/extraction); chat wants sampling (lesson 8.2).',
          },
          {
            mistake: 'Forgetting stopping logic (EOS, max length, stop strings)',
            fix: 'A decode loop without EOS checks either runs to the cap or stitches irrelevant continuations; define stop conditions per task — and for structured output, prefer constrained decoding over post-hoc regex patching.',
          },
        ],
        exam: {
          question:
            '(a) Why can greedy decoding fail to find the most probable sequence? (b) Describe beam search: state update rule, complexity, and the length-bias problem with its fix. (c) Compute the size of the exact search space for V = 50,000 and T = 100 and explain what this implies for decoding design. (d) When is beam search the wrong tool?',
          answer:
            '(a) Greedy takes argmax of p(y_t | prefix) at each step, optimizing conditionals independently; sequence probability is the PRODUCT over steps, so a step-1 winner whose continuations are low-probability can be beaten by a slightly worse early choice with much better later conditionals — local optima do not compose into the global MAP sequence (and greedy\'s repetition attractors show the same failure). (b) Beam search keeps the B highest-cumulative-log-probability partial hypotheses; each step expands all B by their top successors and retains the best B globally (B = 1 is greedy), returning the best at EOS. Complexity: O(B x V) scored candidates per step, O(B x V x T) total — linear in B, versus the V^T exhaustive space. Length bias: log-probs are negative and additive, so longer hypotheses accumulate lower sums at equal per-token quality, biasing selection toward short outputs; fix by length normalization — sum(log p)/T or sum(log p)/T^alpha (alpha ~ 0.7) — before comparing across lengths. (c) 50,000^100 = 5^100 x 10^400 ~ 7.9 x 10^469 sequences: exact MAP enumeration is impossible, so every decoder is heuristic — beam buys a slice of global search at linear cost, sampling trades optimality for naturalness and diversity. (d) Wrong tool for open-ended generation (chat, creative): beams collapse diversity toward high-likelihood generic phrasing, often regressing to greedy behaviour with extra compute; human-preference objectives want stochastic samples (temperature/top-p, lesson 8.2), while beam remains reasonable for likelihood-scored tasks such as translation and extraction.',
          source: 'The canonical decoding exam question — greedy-vs-MAP, beam mechanics and length normalization appear across advanced DL and NLP papers/interviews.',
        },
        summary: [
          'Decoding = heuristic search over V^T sequences; greedy is per-step argmax and can lose globally.',
          'Beam keeps B best cumulative-log-prob prefixes; cost O(B x V x T), B=1 equals greedy.',
          'Raw log-prob sums bias toward short outputs — normalize by T (or T^0.7) before comparing lengths.',
          'Beam fits likelihood-scored tasks; open-ended text prefers sampling — more beams usually means blander text.',
          'Stopping logic and constraints (grammar-masked logits) belong in the decoder, not after it.',
        ],
      }),
      [
        [
          'Greedy decoding can produce a lower-probability sequence than an alternative because:',
          [
            'Log-probs are always negative',
            'It optimizes each next-token conditional independently — locally best choices need not compose to the globally most probable sequence',
            'The model is miscalibrated',
            'It samples randomly',
          ],
          1,
          'Sequence probability multiplies conditionals: an early argmax win with poor continuations can be beaten by a slightly worse early token with far better later conditionals.',
        ],
        [
          'The main purpose of length normalization in beam search is to:',
          [
            'Reduce memory usage',
            'Cancel the systematic bias of cumulative (negative, additive) log-probs against longer hypotheses',
            'Speed up matrix multiplications',
            'Prevent repeated tokens',
          ],
          1,
          'Raw sums always grow more negative with length, so un-normalized beams truncate outputs; dividing by T (or T^alpha, alpha ~ 0.7) compares hypotheses on average per-token quality.',
        ],
        [
          'With vocabulary V = 50,000 and target length T = 100, the exact decoding search space is:',
          [
            '5,000 candidates',
            '50,000 x 100 = 5 million',
            'V^T ~ 7.9 x 10^469 sequences — infeasible; decoding must be heuristic',
            'Always computable with a GPU',
          ],
          2,
          'Every position offers V choices over T positions: V^T sequences — enumeration is impossible, which is exactly why greedy/beam/sampling heuristics exist.',
        ],
        [
          'On an open-ended creative writing prompt, widening beam search from 2 to 64 typically:',
          [
            'Improves creativity',
            'Reduces diversity — beams converge on similar high-likelihood phrasings (often degenerating toward greedy behaviour with extra compute)',
            'Has no effect',
            'Produces invalid text',
          ],
          1,
          'Sequence-likelihood search rewards safe, common continuations; the B beams overlap heavily and text becomes generic — sampling with temperature/top-p dominates for open-ended work.',
        ],
      ]
    ),
    lesson(
      M8,
      'dl-8-2',
      2,
      'Temperature, Top-k, and Top-p: Steering the Next-Token Distribution',
      'The three controls behind every creativity slider — computed on a worked logit vector so you can predict exactly what each does to probabilities, entropy, and the sampled output.',
      22,
      nineBlocks({
        objectives: [
          'Compute softmax at three temperatures on the same logits and describe the entropy change',
          'Hand-execute top-k and nucleus (top-p) filtering including the renormalization step',
          'State the order of operations in a production sampling stack and why it is that order',
          'Choose temperature/top-k/top-p settings for factual QA, chat, and brainstorming with rationale',
        ],
        hook:
          'Every AI product\'s "creativity" slider is three lines of math: divide logits by a temperature, cut the tail of the distribution, renormalize, sample. Set temperature to 0.2 and a legal model cites statute; set it to 1.4 and it writes hallucinatory poetry — same weights, same prompt, different number. And yet these knobs are routinely misused (temperature applied twice, top-p forgotten, top-k left at a library default nobody chose). This lesson computes all three by hand on one logit vector so the knobs stop being magic.',
        concept: `**Start where the model ends: logits.** The LM outputs an unnormalized score z in R^V per step; softmax converts to probabilities p_i = exp(z_i) / SUM_j exp(z_j) (Module 1.3/5.1 — the same competition-over-a-budget structure as attention weights). Sampling then modifies this distribution in a fixed pipeline.

**Temperature: rescale before softmax.** p_i(T) = exp(z_i / T) / SUM_j exp(z_j / T). T = 1: unchanged. T < 1: divides logits by a constant < 1 — spreads them apart BEFORE softmax — sharpening: the leader gains mass, the tail shrinks, entropy falls; as T -> 0 the distribution approaches one-hot at argmax, so T -> 0 IS greedy decoding (the limit connects to lesson 8.1). T > 1: compresses logit gaps — flattening toward uniform, entropy rises, unlikely tokens become reachable; T -> infinity gives the uniform distribution over the vocab (pure noise). Crucially: temperature changes nothing about WHAT THE MODEL KNOWS — only how boldly it departs from its most likely continuation. Also: apply it ONCE, to the raw logits, before filtering (double-application is a real production bug: API default plus your own re-scaling).

**Top-k: keep the k leaders.** Retain the k highest-probability tokens (after temperature), set the rest to zero probability, RENORMALIZE so the kept set sums to 1, then sample. Simple, but its fixed window mismatches distribution shape: when the model is confident (p_top1 = 0.97), k = 50 still wastes 3% of mass on 49 junk tokens — harmless but pointless; when the model is flat (top-10 all near 0.05), k = 50 truncates a genuinely uncertain tail too aggressively — you had wanted to sample broadly. Top-k cannot adapt to confidence within a single step.

**Top-p (nucleus): keep the smallest set covering probability mass p.** Sort tokens by probability descending; keep tokens until the cumulative mass reaches p; renormalize over that set. The kept count is DYNAMIC: 1-2 tokens when confident (nucleus of 0.9 may contain just the leader plus one), dozens when flat. This confidence adaptivity is why top-p (often with a small top-k as a speed cap) is the modern default — typical stacks: temperature 0.7-1.0, top-k 40-50, top-p 0.9-0.95. Order of operations in a production stack: logits -> temperature -> (optional) penalties (lesson 8.3 operate on logits) -> top-k -> top-p -> renormalize -> torch.multinomial sample. Filtering first then sampling from the renormalized tail is what makes "p=0.9" mean what it says.

**Practical settings, with reasoning.** Factual/extractive (SQL, citation, classification via generation): T = 0-0.2, top-p ~ 1.0 or pure argmax — you want the mode. Assistant/chat: T = 0.6-0.8, top-p 0.9 — enough variety to avoid robotic repetition, not enough to wander off-fact. Brainstorming/creative: T = 1.0-1.3, top-p 0.95 — explore the tail deliberately. And a calibration reminder: sampling from an OVERCONFIDENT model at high T amplifies hallucination (the tail is wrong confidently); temperature is a risk dial, not a creativity engine.`,
        extras: [
          table(
            'The three controls, at a glance',
            ['Control', 'What it changes', 'Adaptive?', 'Too high', 'Too low'],
            [
              ['Temperature T', 'Logit scale before softmax — sharpness/entropy', 'No (single scalar)', 'Random, incoherent, hallucination-prone', 'Robotic, repetitive, greedy-like'],
              ['Top-k', 'Fixed-size candidate window', 'No (fixed k)', 'Keeps irrelevant tail tokens (harmless)', 'Cuts a genuinely broad distribution short'],
              ['Top-p', 'Smallest nucleus covering mass p', 'Yes — adapts per step', 'Near-noise (p -> 1 keeps everything)', 'Only the leader sampled; near-deterministic'],
            ],
          ),
          code(
            `import torch
import torch.nn.functional as F

def sample(logits, T=1.0, top_k=0, top_p=1.0):
    logits = logits / max(T, 1e-8)                       # 1. temperature FIRST
    if top_k > 0:                                         # 2. optional fixed window
        kth = logits.topk(top_k).values[..., -1, None]
        logits = logits.masked_fill(logits < kth, float("-inf"))
    if top_p < 1.0:                                       # 3. nucleus
        sorted_idx = logits.argsort(descending=True)
        sorted_p = F.softmax(logits, dim=-1).gather(-1, sorted_idx)
        keep = sorted_p.cumsum(-1) <= top_p               # simple variant: strict <= p
        keep[..., 0] = True                               # never drop the leader
        cut = sorted_idx.masked_fill(keep, 0)
        logits = logits.scatter(-1, cut, float("-inf"))   # zero out beyond nucleus
    probs = F.softmax(logits, dim=-1)                     # 4. renormalize
    return torch.multinomial(probs, num_samples=1), probs

# worked-example logits from the lesson:
z = torch.tensor([3.0, 1.0, 0.5, -1.0])
for T in (1.0, 0.5, 2.0):
    print(T, F.softmax(z / T, dim=-1))                    # check against the hand math`,
            'sampling.py',
            'python',
          ),
          tip(
            'Entropy is the number to watch',
            'If you log only one sampling diagnostic, log the entropy of the final distribution: falling entropy means your model is confident (temperature matters little); high entropy means the knobs dominate output. Sweeping temperature with entropy plotted tells you where your task\'s operating point actually sits.',
          ),
          warn(
            'Temperature applied twice halves your intent',
            'Client libraries sometimes apply a default temperature while your service applies its own — the effective temperature becomes T1 x T2 on the logits (dividing twice), silently pushing output toward greedy. Set temperature at exactly one layer of the stack and assert it in tests.',
          ),
        ],
        worked: {
          title: 'Compute the full sampling stack by hand',
          problem:
            'Logits z = [3.0, 1.0, 0.5, -1.0] over tokens [t1, t2, t3, t4]. (a) Softmax at T = 1. (b) Softmax at T = 0.5 and T = 2 — how does mass move? (c) At T = 1 apply top-k = 2: keep, renormalize. (d) At T = 1 apply top-p = 0.9: which tokens survive the nucleus, and how does it differ from (c) here? (e) The model is confident (leader 0.97) AND flat (leader 0.06) in two different steps — describe what top-p = 0.9 keeps in each, and why that adaptivity beats fixed top-k.',
          steps: [
            {
              title: '(a) Softmax at T = 1',
              desc: 'exp: e^3 = 20.086, e^1 = 2.718, e^0.5 = 1.649, e^-1 = 0.368. Sum = 24.820. p = [0.809, 0.109, 0.066, 0.015]. The leader holds 81% — confident but not degenerate; ~19% mass spread over the tail.',
              code_snippet: 'p(T=1) = [0.809, 0.109, 0.066, 0.015]',
            },
            {
              title: '(b) T = 0.5 and T = 2',
              desc: 'T = 0.5 doubles logits: [6, 2, 1, -2] -> exp [403.43, 7.389, 2.718, 0.135], sum 413.67 -> p = [0.975, 0.018, 0.007, 0.0003]. Leader takes 97.5%, tail nearly dies (near-greedy). T = 2 halves logits: [1.5, 0.5, 0.25, -0.5] -> exp [4.482, 1.649, 1.284, 0.607], sum 8.022 -> p = [0.559, 0.206, 0.160, 0.076]. The tail gained: t4 rose from 1.5% to 7.6% — exploration turned up.',
              code_snippet: 'T=0.5: [0.975, 0.018, 0.007, 0.0003] | T=2: [0.559, 0.206, 0.160, 0.076]',
            },
            {
              title: '(c) Top-k = 2 at T = 1',
              desc: 'Keep t1 (0.809) and t2 (0.109); drop t3, t4. Mass kept = 0.918; renormalize: [0.809/0.918, 0.109/0.918] = [0.881, 0.119]. Sampling now draws t1 88% of the time — t3 (6.6%, a real candidate!) is structurally excluded regardless of how the distribution shifts.',
              code_snippet: 'top-k 2 -> [0.881, 0.119] after renormalization',
            },
            {
              title: '(d) Top-p = 0.9 nucleus',
              desc: 'Cumulative sorted mass: t1 = 0.809 (< 0.9); t1+t2 = 0.918 (>= 0.9) — nucleus = {t1, t2}, same set as top-k 2 HERE, and renormalization identical: [0.881, 0.119]. Coincidence of this particular distribution: the threshold fell at the same cut point. On a flatter distribution the nucleus would expand past 2; on a more confident one it would shrink to 1 — that is the difference.',
              code_snippet: 'p=0.9: cum 0.809 -> 0.918 >= 0.9 : nucleus {t1, t2} = [0.881, 0.119]',
            },
            {
              title: '(e) Adaptivity in the two regimes',
              desc: 'Confident step (leader 0.97): nucleus 0.9 = {leader} alone (0.97 >= 0.9 immediately) — sampling is effectively deterministic, exactly right: do not inject noise when the model is sure. Flat step (leader 0.06): the nucleus keeps expanding until mass 0.9 is covered — maybe 40 tokens — genuine uncertainty preserved. Fixed top-k = 50 does the opposite pair of wrong things: keeps 49 junk tokens in the confident case and may truncate the flat case (if its 90% mass needs 80 tokens). Top-p spends candidate budget exactly where uncertainty lives.',
              code_snippet: 'confident: nucleus size ~1 ;  flat: nucleus size ~40 ;  top-k: fixed 50 either way',
            },
          ],
          solution:
            '(a) [0.809, 0.109, 0.066, 0.015]. (b) T=0.5 sharpens to [0.975, 0.018, 0.007, 0.0003]; T=2 flattens to [0.559, 0.206, 0.160, 0.076]. (c) top-k 2 -> [0.881, 0.119]. (d) top-p 0.9 lands on the same {t1, t2} nucleus here, but only by coincidence of this distribution. (e) Nucleus size tracks uncertainty (1 when confident, dozens when flat) while top-k stays fixed — the adaptivity that makes top-p the default.',
        },
        practice: {
          title: 'Map your task\'s operating point',
          prompt:
            'On an open model: (1) implement the exact pipeline from this lesson (temperature -> penalties hook -> top-k -> top-p -> renormalize -> multinomial); (2) generate 20 completions at T in {0.0, 0.3, 0.7, 1.0, 1.4} for a factual question, a chat prompt, and a brainstorm prompt; (3) compute distinct-1/distinct-2 diversity AND a simple factual-consistency check for each cell (e.g., does it still answer the question correctly); (4) plot diversity vs T per task; (5) recommend per-task (T, top-k, top-p) with evidence, and verify top-p 0.9 nucleus sizes on confident vs flat steps by logging kept-token counts.',
          hint: 'Expect diversity to rise with T while factual accuracy holds then falls off — your task curves locate the safe operating band. Log nucleus sizes: they should vary wildly between steps if top-p is doing its job.',
        },
        mistakes: [
          {
            mistake: 'Applying temperature twice (library default plus your own)',
            fix: 'Temperatures compose multiplicatively on the logits: two T = 0.7 passes behave like T = 0.49 — output slides toward greedy with no visible warning. Set the knob in exactly one layer and test it.',
          },
          {
            mistake: 'Forgetting to renormalize after top-k/top-p truncation',
            fix: 'Truncated mass must be redistributed or torch.multinomial (which needs sum-1 probabilities) samples incorrectly or errors. Always softmax AFTER filtering — filter, then renormalize, then sample.',
          },
          {
            mistake: 'Reaching for repetition penalties before checking temperature',
            fix: 'Many repetition problems are temperature problems: near-zero temperature loops, near-1.4 temperatures ramble. Tune T/top-p first (8.3), and only then add logit penalties — penalties distort probabilities and can hurt factuality.',
          },
          {
            mistake: 'High temperature on a factual task "to be creative"',
            fix: 'Temperature samples the model\'s TAIL, and for factual questions the tail is hallucination: raising T buys stylistic variety at the direct cost of accuracy. Match the knob to the risk: argmax or T ~ 0 for extraction, T 0.6-1.0 for prose.',
          },
        ],
        exam: {
          question:
            'Define temperature scaling in autoregressive sampling and show its effect on a given logit vector at T = 0.5 and T = 2. Explain top-k and top-p filtering including renormalization, contrast their adaptivity, and give an order of operations for a production sampling stack.',
          answer:
            'Temperature: p_i(T) = exp(z_i/T) / SUM_j exp(z_j/T) — logits are divided by T BEFORE softmax. T < 1 magnifies logit gaps (sharper distribution, lower entropy, mass concentrates on the leader; T -> 0 approaches argmax/greedy); T > 1 shrinks gaps (flatter, higher entropy, tail tokens become reachable; T -> infinity approaches uniform). It changes sampling boldness, never the model\'s knowledge; apply exactly once. Top-k: keep the k highest-probability tokens, discard the rest, and RENORMALIZE so the kept set sums to 1 — fixed window, confidence-blind. Top-p (nucleus): sort by probability descending and keep the smallest set whose cumulative mass reaches p, then renormalize — the kept size adapts per step (1-2 tokens when confident, dozens when the distribution is flat), which is why top-p is the default and top-k usually survives only as a cheap pre-cap. Production order: raw logits -> temperature -> repetition/frequency penalties (logit-level, lesson 8.3) -> top-k -> top-p -> renormalize to sum 1 -> multinomial sample (T = 0 degenerates to argmax). Settings: factual/extractive T ~ 0-0.2; assistant chat T ~ 0.6-0.8 with top-p 0.9; brainstorming T ~ 1.0-1.3 with top-p 0.95.',
          source: 'The sampling-knobs question every LLM-application and systems interview asks — the hand computation separates candidates who have actually tuned generation from those who have only read about it.',
        },
        summary: [
          'Temperature divides logits before softmax: < 1 sharpens (T -> 0 = greedy), > 1 flattens (T -> inf = uniform).',
          'Top-k: fixed window; top-p: smallest set covering mass p — adaptive to confidence.',
          'Always filter THEN renormalize THEN sample; apply temperature exactly once.',
          'Typical stack: penalties -> T 0.7-1.0 -> top-k ~50 -> top-p ~0.9.',
          'Match the dial to risk: high T samples the tail, and on factual tasks the tail is hallucination.',
        ],
      }),
      [
        [
          'Dividing logits by a temperature T = 0.5 before softmax results in:',
          [
            'A flatter distribution',
            'A sharper distribution — the leader gains mass, the tail shrinks (approaching argmax as T -> 0)',
            'An unchanged distribution',
            'Uniform probabilities',
          ],
          1,
          'Halving logits doubles logit gaps: exp-scores separate before normalization, so probability concentrates on the argmax — the T -> 0 limit IS greedy decoding.',
        ],
        [
          'Top-p (nucleus) sampling with p = 0.9 keeps:',
          [
            'The 90 highest-probability tokens',
            'Exactly 90% of the probability mass, discarding the rest, then renormalizes',
            'All tokens with probability above 0.9',
            'The top 9 tokens',
          ],
          1,
          'Sort descending, accumulate until mass p is covered (smallest such set), drop the tail, renormalize — the kept count varies with distribution shape.',
        ],
        [
          'The correct order in a production sampling stack is:',
          [
            'top-p -> top-k -> temperature -> sample',
            'temperature -> penalties -> top-k -> top-p -> renormalize -> sample',
            'sample -> temperature -> top-k',
            'top-k -> softmax -> temperature -> sample',
          ],
          1,
          'Temperature rescales raw logits first; logit-level penalties next; then truncation filters (k, then p); renormalization makes the distribution valid for multinomial sampling.',
        ],
        [
          'For a fact-extraction task where exactly one correct answer exists, the best sampling configuration is:',
          [
            'T = 1.4, top-p = 1.0',
            'T ~ 0 (argmax) or very low temperature with near-full nucleus — do not sample the tail',
            'T = 0.7 with repetition penalties',
            'T = 2.0 for diversity',
          ],
          1,
          'The tail of a factual distribution is hallucination risk: with one right answer, sampling only adds variance. Greedy/low-T decode the mode.',
        ],
      ]
    ),
    lesson(
      M8,
      'dl-8-3',
      3,
      'Repetition Control and Speculative Decoding',
      'Two production necessities: stopping degenerate loops with logit-level penalties (and knowing their costs), and speeding up decode with draft-then-verify speculation that provably preserves the target model\'s distribution.',
      22,
      nineBlocks({
        objectives: [
          'Classify repetition-control mechanisms (frequency, presence, multiplicative, n-gram ban) by where and how they modify logits',
          'Compute the effect of a frequency penalty on a specific token\'s logit and predict side effects',
          'Explain the speculative acceptance rule and compute expected accepted tokens per round',
          'Estimate speculative-decoding speedup from draft-cost and acceptance-rate numbers',
        ],
        hook:
          'Two problems sit between a trained model and a shipped product. The first: models LOOP — "the the the the" is not a training accident but a property of sampling from self-reinforcing conditionals; once a phrase repeats, its conditional probability rises, and greedy decoding walks straight into the attractor. The second: decoding is SLOW — each token streams all model weights from memory (Module 5.4\'s bandwidth wall), so users wait. This lesson gives the two industry answers: logit penalties that break loops at a calibrated cost, and speculative decoding, where a cheap draft model writes ahead and the expensive model verifies a whole batch in one pass — same output distribution, 2-3x faster.',
        concept: `**Why degenerate repetition happens.** Autoregressive models learn surface statistics: repeated n-grams raise the conditional probability of continuing the repetition (in a loop, the next token is maximally predictable), and exposure bias widens the gap — training always conditioned on GOLD prefixes (Module 4\'s teacher forcing), inference conditions on its OWN possibly-drifting outputs, with no training signal for escaping a loop it never saw in training. Greedy decoding maximizes this trap (the loop is a local optimum); temperature mitigates by letting a lower-probability escape token through.

**Penalty taxonomy — all logit-level.** (1) FREQUENCY PENALTY (OpenAI-style): for every token already generated with count c_i, logit_i -= f * c_i — scales linearly with repeats: the third "the" is hit harder than the second. (2) PRESENCE PENALTY: logit_i -= p if c_i > 0 at all — flat tax on any reuse, encourages topic diversity without gradation. (3) MULTIPLICATIVE REPETITION PENALTY (CTRL-style): for tokens seen, divide positive logits by r and multiply negative logits by r (r > 1) — pushes seen tokens toward zero logit regardless of sign, conservative and commonly the HF default. (4) STRUCTURAL BANS: no_repeat_ngram — build a banned-token list at each step from n-grams already generated (if "in the" preceded "cat" twice, and the last two tokens are "in the", ban "cat") — HARD guarantees of no repeated n-gram, at the cost of broken sentences when a legitimate continuation is banned. Costs to know: penalties distort the calibrated distribution — overuse yields stilted word choice, forgotten names (taxing a proper noun you need again), and degraded factuality; they also interact badly with constrained JSON decoding (banning tokens can violate the grammar). Rule of thumb: fix temperature/top-p first (8.2); reach for presence/frequency in the 0.1-0.5 band; use structural bans only when repetition is contractually unacceptable (e.g., list generation), and NEVER during likelihood scoring.

**Speculative decoding — verify-in-parallel, not recompute.** Setup: a large TARGET model p (the one you serve) and a small DRAFT model q (10-100x smaller — sometimes a shallower copy of the same model, or extra heads). One round: (1) draft generates k tokens autoregressively under q (cheap: small model, k sequential steps); (2) the target evaluates all k draft tokens in ONE PARALLEL FORWARD PASS (positions 1..k given the prefix — exactly the teacher-forced parallelism of Module 5.3: one pass over k positions, not k passes); (3) ACCEPT each draft token with probability min(1, p_i / q_i); at the first rejection, stop and RESAMPLE from the corrected distribution max(0, p - q) over that position (in the greedy variant: accept while draft argmax equals target argmax, then keep the target\'s argmax at the mismatch). Guarantee: with the rejection-sampling rule, the output distribution is EXACTLY p — speculation changes NOTHING about quality, only cost (this is the theorem that makes it safe to ship).

**The economics.** Baseline: k tokens cost k sequential target passes. Speculative round: k cheap draft passes + 1 target pass (over ~accepted+1 positions). Decode is memory-bandwidth-bound (weights stream per step — Module 5.4), so a draft 10x smaller costs ~0.1 of a target step; a round producing (on average) a tokens costs 0.1k + 1 target-step-equivalents versus a target steps baseline. Worked below: with k = 4, expected 3.6 tokens per round — baseline 3.6 steps vs 0.4 + 1 = 1.4 steps => ~2.6x speedup. Speedup rises with (a) DRAFT QUALITY (acceptance rate — code domains need a code-capable draft; a mismatched draft gets rejected early and wastes rounds) and (b) draft cheapness. Family tree: Medusa (multiple prediction heads on the same model instead of a separate draft), EAGLE (draft learned over target hidden states), tree variants (draft proposes a TREE, verification accepts an entire path) — all are refinements of draft-then-verify. Failure mode: when the draft is bad (acceptance ~0), you pay the draft passes AND the target pass — speedup dips below 1; monitor acceptance rate per domain and fall back when it drops.`,
        extras: [
          table(
            'Repetition controls by mechanism',
            ['Method', 'Operation on logits', 'Guarantee', 'Risk'],
            [
              ['Frequency penalty', 'logit -= f x count', 'Soft — scales with repeats', 'Distorts calibrated probs; overuse = stilted text'],
              ['Presence penalty', 'logit -= p if seen', 'Soft — flat tax on reuse', 'Punishes legitimate reuse (names, keywords)'],
              ['Repetition penalty (multiplicative)', 'seen positive logits /= r (negatives *= r)', 'Soft — sign-symmetric', 'Mild distortion; HF default behavior'],
              ['no_repeat_ngram', 'Ban tokens completing seen n-grams', 'HARD: no repeated n-gram', 'Can forbid the only correct continuation'],
            ],
          ),
          code(
            `import torch
import torch.nn.functional as F

# ---- Logit-level penalties ----
def apply_penalties(logits, generated, freq=0.3, pres=0.0, rep=1.0):
    out = logits.clone()
    if pres:                                          # flat tax per distinct token
        out[torch.unique(generated)] -= pres
    if freq:                                          # linear in occurrences
        counts = torch.bincount(generated, minlength=out.size(-1)).float()
        out -= freq * counts
    if rep != 1.0:                                    # multiplicative (sign-symmetric)
        seen = torch.unique(generated)
        pos = seen[out[seen] > 0]
        out[pos] /= rep
        neg = seen[out[seen] < 0]
        out[neg] *= rep
    return out

def banned_next_tokens(generated, n=3):
    """no-repeat-ngram: ban tokens that would complete a seen n-gram."""
    banned = set()
    gen = generated.tolist()
    for i in range(len(gen) - n + 1):
        ctx, nxt = tuple(gen[i:i + n - 1]), gen[i + n - 1]
        if tuple(gen[-(n - 1):]) == ctx:
            banned.add(nxt)
    return banned

# ---- Speculative decoding: draft k, verify in one parallel pass ----
def speculative_round(target, draft, prefix, k=4):
    with torch.no_grad():
        draft_toks, q_logits = [], None
        cur = prefix
        for _ in range(k):                            # 1) draft: k cheap sequential steps
            q = F.softmax(draft(cur).logits[:, -1], -1)
            t = torch.multinomial(q, 1)
            draft_toks.append(t); cur = torch.cat([cur, t], 1)
        cand = torch.cat([prefix] + draft_toks, 1)
        p = F.softmax(target(cand).logits, -1)        # 2) verify ALL positions in ONE pass
    accepted = []
    for i, tok in enumerate(draft_toks):
        pi = p[:, prefix.size(1) + i - 1, tok]
        qi = q_of_draft_at_that_step                    # recorded during drafting
        if torch.rand(()) < torch.minimum(torch.ones(()), pi / qi):
            accepted.append(tok)                        # 3) accept ~ min(1, p/q)
        else:
            break                                       # first rejection: resample from max(0, p - q)
    return accepted`,
            'repeat_spec.py',
            'python',
          ),
          tip(
            'Measure acceptance rate before promising speedup',
            'Speculative decoding lives or dies on min(1, p/q) averaging high. Log accepted-per-round per domain: >0.85 is excellent, <0.5 means the draft is mismatched (wrong domain or too weak) — switch draft or disable for that traffic rather than burning round passes for nothing.',
          ),
          warn(
            'Strong repetition penalties damage factuality and lists',
            'A presence penalty of 1.0+ can tax a product name, a number you must repeat, or a code identifier until the model avoids correct text; hard n-gram bans break grammar when the banned token is the only valid continuation. Calibrate on your own outputs, keep penalties in the 0.1-0.5 band, and prefer temperature/top-p fixes first.',
          ),
        ],
        worked: {
          title: 'Compute a penalty step, then price a speculative round',
          problem:
            '(a) Generated tokens so far: [5, 5, 7, 5]. Token 5 has logit 2.0, token 7 has logit 1.5, token 9 (unseen) has logit 1.8. Frequency penalty f = 0.3, presence penalty p = 0.5 — compute final logits for tokens 5, 7, 9. (b) Same logits with multiplicative repetition penalty r = 1.2 on seen tokens (positive logits divided). (c) Speculative round: draft k = 4; target p for the draft tokens = [0.9, 0.8, 0.4, 0.6]; draft q = [0.7, 0.9, 0.5, 0.5] — acceptance probabilities and EXPECTED accepted tokens (stopping at first rejection). (d) Cost model: draft step = 0.1 target-step, one verification pass = 1 target-step — speedup vs baseline for the tokens one round produces. (e) Acceptance-rate reality check: if the draft is mismatched and accepts only 0.3 tokens/round, what happens to the speedup?',
          steps: [
            {
              title: '(a) Additive penalties',
              desc: 'Token 5 appears 3x: frequency -> 2.0 - 0.3x3 = 1.1; presence -> subtract 0.5 once (seen at all) -> 0.6. Token 7 (1x, seen): 1.5 - 0.3 - 0.5 = 0.7. Token 9 (unseen): untouched by both -> 1.8. Net effect: unseen token 9 now OUTRANKS the repeated 5 (0.6) and the seen 7 (0.7) — the repeated token is actively suppressed, by exactly its count.',
              code_snippet: 't5: 2.0-0.9-0.5 = 0.6 | t7: 1.5-0.3-0.5 = 0.7 | t9: 1.8',
            },
            {
              title: '(b) Multiplicative penalty',
              desc: 'Seen positive logits divided: t5: 2.0/1.2 = 1.667; t7: 1.5/1.2 = 1.25; t9 (unseen): 1.8. Milder than additive here (no count scaling): repetition is discouraged without the linear ratchet — which is why the multiplicative form is the gentler default, and why heavy additive penalties feel "sharper" in outputs.',
              code_snippet: 't5: 1.667 | t7: 1.25 | t9: 1.8  (gentler ratchet)',
            },
            {
              title: '(c) Acceptance arithmetic',
              desc: 'Ratios min(1, p/q): token1: 0.9/0.7 = 1.29 -> 1.0 (always accepted); token2: 0.8/0.9 = 0.889; token3: 0.4/0.5 = 0.80; token4: 0.6/0.5 -> 1.0 (never reached if 3 rejects). Expected accepted (stop at first rejection): 1.0 + 0.889 + (0.889 x 0.80 = 0.711) = 2.60 draft tokens, plus the forced resampled token at the rejection point = ~3.60 tokens produced this round.',
              code_snippet: 'E[accepted] = 1 + 0.889 + 0.711 = 2.60  (+1 resampled = 3.60 tokens)',
            },
            {
              title: '(d) Speedup',
              desc: 'Baseline: 3.60 tokens = 3.60 target steps. Speculative: 4 draft steps x 0.1 = 0.4, plus 1 verification pass (over ~3-4 positions, parallel) = 1.4 target-step-equivalents. Speedup = 3.60/1.4 = 2.57x. Distribution unchanged (rejection sampling theorem) — pure cost win. Note the parallelism doing the work: verification of 4 positions is ONE pass because teacher forcing makes positions independent (Module 5.3).',
              code_snippet: '3.60 / (0.4 + 1.0) = 2.57x  (output distribution identical)',
            },
            {
              title: '(e) Mismatched draft reality',
              desc: 'At 0.3 expected accepted tokens/round: tokens per round = 0.3 + 1 = 1.3 (rejections arrive early, verification still costs a full pass; draft cost 0.4 remains). Baseline would produce 1.3 tokens in 1.3 steps; speculative cost = 1.4 steps for 1.3 tokens -> speedup 0.93x, i.e., SLOWER. This is why acceptance rate is the KPI: speculation is never assumed, it is measured per domain and disabled when the draft does not match.',
              code_snippet: '0.3 accept: 1.3 / 1.4 = 0.93x  ->  disable for this domain',
            },
          ],
          solution:
            '(a) Additive: t5 = 0.6, t7 = 0.7, t9 = 1.8 — unseen tokens promoted past repeated ones. (b) Multiplicative: 1.667 / 1.25 / 1.8 — gentler, no count ratchet. (c) Acceptances [1.0, 0.889, 0.80, never]: E[accepted] = 2.60, ~3.60 tokens/round including the resample. (d) 3.60/1.4 = 2.57x speedup at unchanged distribution — parallel verification is the trick. (e) At 0.3 acceptance the scheme loses (0.93x): measure acceptance per domain and fall back.',
        },
        practice: {
          title: 'Break repetition, then speed up decode',
          prompt:
            '(1) With a small LM and greedy decoding, force a repetition loop (long max_new_tokens on a factual prompt) — capture it; then apply presence 0.3 / frequency 0.3 / no_repeat_ngram=3 in turn and record which fixes it and what text quality cost (note any stilted phrasing). (2) Implement speculative decoding with a tiny draft model (or an untrained-shallow copy): run target-only vs speculative on 100 prompts, measure tokens/sec AND verify distributional equivalence — compare average log-prob of sampled outputs, or with greedy variants assert token-by-token identity. (3) Log acceptance rate; then degrade the draft (truncate it / use a wrong-domain draft) and show speedup fall below 1x. (4) Recommend a production policy: when to enable, when to disable.',
          hint: 'The identity assertion for greedy speculation (draft-argmax agreement path) is the cleanest correctness check. Expect acceptance to vary sharply by domain — that variability IS the lesson of step (3).',
        },
        mistakes: [
          {
            mistake: 'Believing speculative decoding changes or improves the output',
            fix: 'With correct rejection sampling the output distribution is EXACTLY the target model\'s — it is a cost optimization, not a quality one. If your outputs differ after enabling it, the acceptance/resample logic is buggy.',
          },
          {
            mistake: 'Reaching for heavy repetition penalties before tuning temperature/top-p',
            fix: 'Loops are often near-deterministic-sampling artifacts: T ~ 0 or a stale top-p invites them. Fix sampling first; then gentle penalties (0.1-0.5). Penalties distort calibration — they are the second tool, not the first.',
          },
          {
            mistake: 'Deploying speculation without monitoring acceptance rate',
            fix: 'A mismatched draft gives you the worst of both: draft cost plus full verification with almost no accepted tokens (below-1x speedup). Track accepted-tokens-per-round per traffic domain and route or disable when it drops.',
          },
          {
            mistake: 'Applying repetition penalties during constrained/structured decoding',
            fix: 'Penalties alter logits while the grammar mask constrains the allowed set — their interaction can forbid required tokens or break the guarantee you contracted for. Apply constraints, not penalties, in structured output; penalties belong to free-text generation.',
          },
        ],
        exam: {
          question:
            'Explain why autoregressive models produce degenerate repetition, classify the main logit-level remedies, and then describe speculative decoding: the draft-verify procedure, the acceptance rule, the distribution-preservation guarantee, and the conditions under which it speeds generation up.',
          answer:
            'Repetition arises because training conditions on gold prefixes (exposure bias) while inference conditions on the model\'s own output: once a phrase repeats, its continuation becomes maximally predictable, creating a self-reinforcing loop that greedy decoding walks into (a local optimum of sequence probability). Remedies, all applied to logits before sampling: frequency penalty (subtract f x count — graduated suppression), presence penalty (flat subtraction for any seen token), multiplicative repetition penalty (divide seen positive logits by r > 1, multiply negatives — sign-symmetric, gentler), and structural bans like no-repeat-ngram (ban tokens that would complete an already-seen n-gram — a hard guarantee with grammar-breaking risk). All distort calibration: overuse causes stilted text and factuality loss, so tune temperature/top-p first and keep penalties mild. Speculative decoding: a small draft model q generates k tokens autoregressively; the target model p verifies all k in ONE parallel forward pass (teacher forcing makes positions independent); each draft token is accepted with probability min(1, p(x)/q(x)), and at the first rejection the token is resampled from the corrected distribution proportional to max(0, p - q). This rejection scheme makes the accepted sequence distributed EXACTLY as p — quality-neutral by theorem. Economics: decode is bandwidth-bound, so one verification pass (~1 target step, processing k positions in parallel) plus k cheap draft steps can emit several tokens per round: with 0.1-cost draft steps and high acceptance, ~2-3x speedup; when acceptance collapses (mismatched draft/domain), you pay draft + verify for few tokens and the scheme can fall below 1x — acceptance rate per domain is the KPI that decides enabling it.',
          source: 'The serving-optimization question family (repetition pathology + speculative decoding) now appears in advanced exams and LLM-systems interviews alike.',
        },
        summary: [
          'Repetition is exposure-bias meeting self-reinforcing conditionals; greedy decoding walks into the loop.',
          'Penalties: frequency (count-scaled), presence (flat), multiplicative (sign-symmetric), n-gram bans (hard) — all distort calibration; keep them mild and last.',
          'Speculative: draft k -> one parallel target pass -> accept with min(1, p/q) -> resample at first rejection: output distribution unchanged.',
          'Round economics: E[accepted] draft tokens + 1 resample at cost (k x draft + 1 target pass) — ~2-3x typical when acceptance is high.',
          'Acceptance rate per domain is the KPI; below ~1x speedup, disable.',
        ],
      }),
      [
        [
          'A frequency penalty of 0.3 on a token generated 4 times reduces its logit by:',
          ['0.3', '0.6', '1.2', '1.5'],
          2,
          'Frequency penalty subtracts penalty x count: 0.3 x 4 = 1.2 — graduated suppression, unlike the flat presence penalty.',
        ],
        [
          'no_repeat_ngram_size differs from frequency penalties in that it:',
          [
            'Is a soft statistical nudge',
            'HARD-bans tokens that would complete an already-seen n-gram — a guarantee, at the risk of forbidding valid continuations',
            'Only affects the first token',
            'Changes the model weights',
          ],
          1,
          'Structural bans operate on the allowed set, not the probabilities: repetition becomes impossible, but a banned token may have been the only grammatical choice.',
        ],
        [
          'In speculative decoding, a draft token is accepted with probability min(1, p/q) so that:',
          [
            'The draft model gets credit',
            'The final output distribution EXACTLY matches the target model — speculation is quality-neutral by construction',
            'Longer drafts are always accepted',
            'The target model is bypassed',
          ],
          1,
          'Correct rejection sampling (accept min(1, p/q), resample from max(0, p - q)) provably reproduces p — only the cost structure changes.',
        ],
        [
          'Speculative decoding yields a speedup only when:',
          [
            'The draft model is bigger than the target',
            'Draft acceptance is high (draft distribution close to target) — one verification pass emits several accepted tokens; low acceptance means paying draft + verify for few tokens, potentially slower than baseline',
            'Temperature is zero',
            'The batch size is one',
          ],
          1,
          'Round cost is roughly fixed (k draft steps + 1 target pass); tokens per round scale with acceptance. Mismatched drafts drive tokens/round toward zero and the speedup below 1x.',
        ],
      ]
    ),
    lesson(
      M8,
      'dl-8-4',
      4,
      'Diffusion Models and Multimodal Generation',
      'Image generation from the inside: the forward noising process and its closed form computed by hand, the learned reverse process, classifier-free guidance arithmetic, schedulers and the denoising-step budget, and how vision-language models interleave images and text in one generation loop.',
      24,
      nineBlocks({
        objectives: [
          'Compute x_t from x_0 given a beta schedule (closed form with cumulative product) and interpret the signal-to-noise trade',
          'Write the diffusion training objective and one DDIM/DDPM reverse step',
          'Derive and compute classifier-free guidance output for a given scale w',
          'Explain latent diffusion\'s compression arithmetic and the two families of multimodal generation architectures',
        ],
        hook:
          'Autoregressive models write token by token; diffusion models denoise an image into existence over 20-50 iterative steps. Same course, radically different machine: no sequence factorization, no sampling distribution over a vocabulary — instead, learn a function that removes Gaussian noise, apply it again and again starting from pure randomness, and watch structure crystallize. This is Stable Diffusion\'s engine and the engine behind every modern image generator. The lesson goes past the metaphor into the actual equations: the forward process you can compute in closed form, the reverse process you train, guidance as an amplification trick, and the arithmetic that made running it on one GPU possible.',
        concept: `**Forward process — no information, all math.** Take data x_0 and add a little Gaussian noise at each of T steps with variance schedule beta_t (beta small early, large late; original DDPM: linear 1e-4 -> 0.02 over 1000 steps): q(x_t | x_{t-1}) = N(sqrt(1 - beta_t) x_{t-1}, beta_t I). Beautiful property: x_t in ONE jump from x_0 is closed-form: x_t = sqrt(abar_t) x_0 + sqrt(1 - abar_t) epsilon, where abar_t = PRODUCT_{s<=t} (1 - beta_s). Nothing to simulate during training — pick a random t, noise directly. Read the equation as a signal/noise mixer: abar_t is the surviving signal fraction; SNR_t = abar_t / (1 - abar_t) interpolates from all-signal (t = 0) to all-noise (t = T, abar -> 0, x_T ~ N(0, I)).

**Reverse process — the learned part.** Train a network epsilon_theta(x_t, t, c) (a U-Net with time/conditioning embeddings; c = class/text condition) to predict the noise that was added: sample x_0, epsilon ~ N(0, I), t uniform, then minimize L = E || epsilon - epsilon_theta(x_t, t, c) ||^2 — plain MSE, every term computable. Why predict epsilon: the closed form makes the target free. (Variants: predict x_0 directly, or v-prediction = alpha*epsilon - sigma*x_0 — better-behaved at the extremes; keep the family in mind.) Sampling: start x_T ~ N(0, I) and iterate an approximate inverse: DDPM\'s stochastic step x_{t-1} = (1/sqrt(alpha_t)) (x_t - (beta_t/sqrt(1-abar_t)) eps_theta) + sigma_t z; DDIM\'s deterministic variant skips noise (z = 0) and lets you jump the schedule — 1000 training steps become 20-50 sampling steps. Schedulers ARE this equation plus a schedule: linear vs cosine beta (cosine spends more steps at moderate SNR — friendlier), karras/EDM sigma-spacing (reweights step sizes by noise level; modern quality default), plus CFG scale and step count as the two UI knobs. This is also where DPM-solver style fast samplers live: fewer steps for the same quality.

**Guidance — steering the conditional generation.** TRAIN conditionally (with c) and UNCONDITIONALLY (empty prompt), by randomly dropping c ~15% during training (classifier-free guidance). At sampling, run the network twice per step and extrapolate: eps~ = eps_theta(x_t, empty) + (1 + w) * (eps_theta(x_t, c) - eps_theta(x_t, empty)) — equivalently (1+w) eps_cond - w eps_uncond. The difference vector is the "direction of the condition": w amplifies it. w = 0: pure conditional? no — w = 0 gives eps_uncond + 1*(diff) = eps_cond (pure conditional, correct). Higher w = stronger prompt adherence but less diversity and, past ~7-10, oversaturation/burnt artifacts — the classic "guidance scale 7.5" default. This arithmetic (computed below) is also where negative prompts come from: they only modify the UNCONDITIONAL branch.

**Latent diffusion — the compute unlock.** Pixel-space diffusion at 512x512 = 262,144 positions; convolutions and (at the latent resolution) attention are brutal there. Stable Diffusion\'s move: an autoencoder first COMPRESSES the image to a latent — factor-8 spatial downsampling: 512x512x3 = 786,432 values -> 64x64x4 = 16,384 latents, 48x fewer — and the U-Net denoises in latent space (attention cost over 4,096 latent tokens vs 262,144 pixel tokens: (64x)2 = 4096x cheaper for full attention). Same diffusion math, different domain: train/step in latent space, decode to pixels only at the end. Guidance on the text side stays identical (text encoder conditions the U-Net), which is why CLIP/T5 text features figure everywhere in the stack.

**Multimodal generation — one loop or two.** (1) VISION-LANGUAGE MODELS (understanding + text generation): a vision encoder (ViT/CLIP family, Module 6 lineage) emits image patches; a CONNECTOR (linear projector, Q-Former/resampler) maps them into the LLM\'s embedding space; the decoder then treats image tokens as context and generates TEXT autoregressively over the interleaved sequence — captioning, VQA, document understanding. (2) INTERLEAVED / ANY-TO-ANY generation: the same LLM also EMITS images: discrete image tokens autoregressively (tokenizer over image patches — pure transformer, one probability space) or continuous patches produced by a diffusion head attached to hidden states — text, image, text, image in one stream; audio/video follow the same pattern with their own codecs. The unifying idea to carry: align every modality into ONE token space or ONE denoising objective, then reuse Modules 5 and 8 wholesale. Eval diverges from text: FID (distribution distance to real images), CLIP score (image-text agreement), plus human preference — because "correct output" for generation is partly a matter of taste.`,
        extras: [
          table(
            'Forward vs reverse process',
            ['Aspect', 'Forward q', 'Reverse (learned)'],
            [
              ['Direction', 'Data -> noise, fixed schedule', 'Noise -> data, learned'],
              ['Math', 'Gaussian; closed form x_t = sqrt(abar)x_0 + sqrt(1-abar)eps', 'Iterative: network predicts epsilon (or x_0 / v) each step'],
              ['Trainable?', 'No — no parameters', 'Yes: MSE on noise prediction'],
              ['Sampling cost', 'Free (one-shot)', 'N network passes (20-50 with DDIM/karras fast samplers)'],
              ['Conditioning', 'None', 'Text/class via cross-attention + CFG (dropped ~15% of steps in training)'],
            ],
          ),
          code(
            `import torch
import torch.nn.functional as F

# ---- Forward process in closed form: x_t = sqrt(abar) x_0 + sqrt(1-abar) eps ----
def abar(beta):                       # beta: (T,) variance schedule
    return torch.cumprod(1 - beta, dim=0)

def q_sample(x0, t, beta, eps=None):
    eps = torch.randn_like(x0) if eps is None else eps
    a = abar(beta)[t]
    while a.dim() < x0.dim():         # broadcast over spatial dims
        a = a.unsqueeze(-1)
    return a.sqrt() * x0 + (1 - a).sqrt() * eps, eps

beta = torch.full((5,), 0.1)          # toy: constant beta
a5 = (1 - beta).prod()                # 0.9^5 = 0.59049
print("abar_5 =", a5.item(), " SNR =", (a5 / (1 - a5)).item())

# ---- Training step: predict the injected noise ----
def diffusion_loss(model, x0, t, beta, cond):
    xt, eps = q_sample(x0, t, beta)
    return F.mse_loss(model(xt, t, cond), eps)      # the ENTIRE training objective

# ---- Classifier-free guidance at sampling time ----
def cfg(model, xt, t, cond, w=7.5):
    e_c = model(xt, t, cond)                        # conditional pass
    e_u = model(xt, t, None)                        # unconditional pass
    return e_u + (1 + w) * (e_c - e_u)              # = (1+w) e_c - w e_u

# ---- DDIM step (deterministic: sigma = 0) ----
def ddim_step(xt, eps_pred, abar_t, abar_prev):
    x0_pred = (xt - (1 - abar_t).sqrt() * eps_pred) / abar_t.sqrt()
    return abar_prev.sqrt() * x0_pred + (1 - abar_prev).sqrt() * eps_pred`,
            'diffusion.py',
            'python',
          ),
          tip(
            'Spend your budget on guidance and steps — carefully',
            'Steps plateau first (20-40 with a modern scheduler covers most quality), then guidance (w 3-8 typical; higher = adherence up, diversity/artifact risk up). Log both in every experiment: a quality difference without recorded (scheduler, steps, w) is not reproducible.',
          ),
          warn(
            'Scaling latents (and their autoencoder) wrong breaks everything silently',
            'Latent-space diffusion requires exact inverse preprocessing: latents scaled to roughly unit variance during training, unscaled before the autoencoder decode at inference. Forget it and images come out washed-out or blown-out with NO error thrown — a canonical "why are my samples grey" bug. Keep the scale factor next to the model weights in config.',
          ),
        ],
        worked: {
          title: 'Compute forward noising, guidance, and latent savings',
          problem:
            'Constant beta = 0.1 for 5 steps. (a) abar_5 and x_5 in terms of x_0 and epsilon. (b) SNR at t = 5; describe what a model must handle at that point. (c) CFG: eps_cond = [0.2, 0.5], eps_uncond = [0.4, 0.4], w = 7.5 — compute eps~ two ways (the identity and the expanded form). (d) Same with w = 0 — what does the formula return, and what does that tell you about what w means? (e) Latent arithmetic: 512x512x3 -> factor-8 VAE -> 64x64x4 — compression ratio; full-attention cost ratio pixels vs latents; (f) A 1000-step DDPM budget cut to 30 DDIM steps — the cost change per image.',
          steps: [
            {
              title: '(a) Closed-form noising',
              desc: 'abar_5 = (1 - 0.1)^5 = 0.9^5 = 0.59049. So x_5 = sqrt(0.59049) x_0 + sqrt(0.40951) eps = 0.7684 x_0 + 0.6401 eps. The whole forward trajectory is one interpolation line between data and pure noise — no simulation needed, which is what makes the training sample (t, eps) free.',
              code_snippet: 'x_5 = 0.7684 x_0 + 0.6401 eps   (abar_5 = 0.59049)',
            },
            {
              title: '(b) SNR at t = 5',
              desc: 'SNR = abar/(1-abar) = 0.59049/0.40951 = 1.442 (>1: signal still dominant — ln SNR ≈ 0.37). At this noise level the model mostly restores recognizable structure; as t grows, abar -> 0 and SNR collapses (at abar = 0.01, SNR = 0.0101: 99% noise), where the model must paint global structure from almost nothing. Noise prediction is hardest where SNR crosses ~1 — the middle of the schedule.',
              code_snippet: 'SNR = 0.59049 / 0.40951 = 1.442',
            },
            {
              title: '(c) CFG arithmetic',
              desc: 'Identity form: eps~ = e_u + (1+w)(e_c - e_u); 1 + w = 8.5; diff = [0.2 - 0.4, 0.5 - 0.4] = [-0.2, 0.1]. eps~ = [0.4, 0.4] + 8.5*[-0.2, 0.1] = [0.4 - 1.7, 0.4 + 0.85] = [-1.3, 1.25]. Expanded form check: (1+w)e_c - w e_u = [8.5*0.2 - 7.5*0.4, 8.5*0.5 - 7.5*0.4] = [1.7 - 3.0, 4.25 - 3.0] = [-1.3, 1.25] ✓. The conditional UNCONDITIONAL gap is amplified 8.5x — the model is pushed far beyond its average conditional prediction, along the prompt direction.',
              code_snippet: 'eps~ = [0.4,0.4] + 8.5*[-0.2,0.1] = [-1.3, 1.25]  ✓ both forms',
            },
            {
              title: '(d) w = 0 meaning',
              desc: 'w = 0: eps~ = e_u + 1*(e_c - e_u) = e_c — EXACTLY the plain conditional prediction. So w is an EXCESS-guidance dial: 0 = no amplification, 7.5 = amplify the prompt direction 8.5x total while canceling the unconditional component. As w -> large, e_c dominates and diversity collapses toward the single most prompt-aligned mode — adherence/diversity is literally this knob.',
              code_snippet: 'w=0 -> eps~ = eps_cond (pure conditional) ;  w grows -> prompt direction x(1+w)',
            },
            {
              title: '(e) Latent compression and attention cost',
              desc: 'Values: 512*512*3 = 786,432 vs 64*64*4 = 16,384 — ratio 48x fewer scalars. Attention positions: 262,144 pixels vs 4,096 latents — a T x T attention matrix costs (262144/4096)^2 = 64^2 = 4,096x more in pixel space. Even ignoring conv savings, that ratio is why pixel-space 512 diffusion needed clusters while latent diffusion runs on one consumer GPU — same math, cheaper domain.',
              code_snippet: '786,432 -> 16,384 (48x) ;  attention: (64)^2 = 4096x cheaper',
            },
            {
              title: '(f) Step budget',
              desc: '1000 -> 30 steps = 33x fewer network evaluations per image (each step = one full U-Net pass — the entire sampling cost). DDIM/karras-style samplers trade the stochasticity of DDPM for trajectory quality per step, so 20-40 steps lands near 1000-step quality: this sampler progress, not hardware, is what made interactive image generation viable.',
              code_snippet: '1000 / 30 = 33x fewer U-Net passes per sample',
            },
          ],
          solution:
            '(a) abar_5 = 0.59049, x_5 = 0.7684 x_0 + 0.6401 eps. (b) SNR = 1.442 — signal-dominant; SNR crosses below 1 deeper in, where generation gets hardest. (c) eps~ = [-1.3, 1.25] via both forms. (d) w = 0 returns eps_cond exactly: w is excess guidance, scaling the (cond - uncond) direction by 1 + w. (e) 48x scalar compression, 4096x attention saving. (f) 33x fewer passes — fast samplers made single-GPU generation real.',
        },
        practice: {
          title: 'Train a tiny diffusion model',
          prompt:
            'On 2D moons or 8x8 MNIST: (1) implement q_sample in closed form and verify empirically that at large t samples are ~N(0, I) (print means/vars at t = 0/500/1000 with a linear schedule); (2) train an MLP/U-Net epsilon-predictor with L = MSE(eps, eps_theta); (3) sample with ancestral DDPM and with DDIM at 10/30/100 steps — compare quality and cost; (4) add classifier-free guidance (drop condition 15%, w sweep 0/3/7.5) on a class-conditional setup — show class fidelity rising with w and diversity falling (count distinct classes sampled); (5) report scheduler, steps, w for every figure — reproducibility is the deliverable.',
          hint: 'DDIM at 30 steps should approach 1000-step ancestral quality at 33x less cost — that IS lesson point (f). For (4), the fidelity/diversity trade across w is visible in a simple class-histogram.',
        },
        mistakes: [
          {
            mistake: 'Forgetting the closed form and simulating t forward steps per training sample',
            fix: 'The whole point of q(x_t | x_0) in closed form is one-shot noising: x_t = sqrt(abar_t) x_0 + sqrt(1-abar_t) eps. Simulating per-sample is orders of magnitude slower for identical data.',
          },
          {
            mistake: 'Misreading the CFG scale as a blend ratio',
            fix: 'eps~ = (1+w) eps_cond - w eps_uncond — w is EXCESS guidance (w = 0 gives pure conditional), not a weight in [0,1]. Treating w = 7.5 as "75% conditional" (or forgetting the second forward pass) produces badly oversaturated or unconditional-looking samples.',
          },
          {
            mistake: 'Ignoring latent scaling/autoencoder preprocessing',
            fix: 'Latents must be scaled to the distribution the U-Net was trained on, and unscaled before decode — mismatches yield grey/blown-out images with no exception raised. Store the scale factor in the model config alongside weights.',
          },
          {
            mistake: 'Judging a diffusion sampler without recording scheduler, steps, and guidance',
            fix: 'Quality claims are meaningless without (scheduler, step count, w): a 20-step karras run and a 1000-step linear run of the same model differ vastly. Log the full sampling config with every artifact, and sweep steps and w before blaming the network.',
          },
        ],
        exam: {
          question:
            'Describe the diffusion forward process with its closed-form equation, the training objective for the reverse process, and one reverse sampling step. Then derive classifier-free guidance and explain what the scale w controls. Finally, explain latent diffusion and its computational motivation.',
          answer:
            'Forward: at each step t, x_t = sqrt(1-beta_t) x_{t-1} + sqrt(beta_t) eps; telescoping gives the closed form x_t = sqrt(abar_t) x_0 + sqrt(1 - abar_t) epsilon with abar_t = prod_{s<=t}(1 - beta_s), so any noise level is reachable in one jump from x_0 (abar interpolates signal; SNR = abar/(1-abar) from all-signal to all-noise). Training: sample x_0, t ~ Uniform, eps ~ N(0, I), form x_t by the closed form, and minimize L = E ||eps - eps_theta(x_t, t, c)||^2 (epsilon-prediction; x_0- and v-prediction are variants) — MSE with a free analytic target. Reverse sampling: start x_T ~ N(0, I); DDPM step x_{t-1} = (1/sqrt(alpha_t))(x_t - (beta_t/sqrt(1-abar_t)) eps_theta) + sigma_t z; DDIM is the deterministic (z = 0) special case enabling 20-50 step schedules instead of 1000. Classifier-free guidance: train conditional AND unconditional by dropping c with ~15% probability; at sampling compute eps~ = eps_uncond + (1 + w)(eps_cond - eps_uncond) = (1+w) eps_cond - w eps_uncond. The difference vector is the condition\'s direction; w is EXCESS guidance (w = 0 yields plain eps_cond), so raising w amplifies prompt adherence at the cost of diversity and, at high values, oversaturation — guidance scale ~7.5 is the canonical default. Latent diffusion: an autoencoder compresses images (512x512x3 -> 64x64x4 latent, 48x fewer scalars; attention over 4,096 rather than 262,144 positions — ~4096x cheaper for full attention) and diffusion runs in latent space, decoding to pixels only at the end — the same equations at a fraction of the compute, which put high-resolution generation on a single GPU.',
          source: 'The flagship generative-model question of the diffusion era — expected in advanced DL exams and generative-ML interviews.',
        },
        summary: [
          'Forward: closed form x_t = sqrt(abar)x_0 + sqrt(1-abar)eps — training samples noise levels for free.',
          'Train epsilon_theta with plain MSE; sample by iterating the reverse (DDPM stochastic / DDIM deterministic).',
          'CFG: eps~ = (1+w)eps_cond - w eps_uncond — w amplifies the prompt direction; w = 0 is pure conditional.',
          'Latent diffusion: 48x scalar and ~4096x attention savings put 512px generation on one GPU.',
          'Multimodal = aligning modalities into one token space (VLM connectors) or one denoising objective (diffusion heads); eval becomes FID/CLIP-score plus human preference.',
        ],
      }),
      [
        [
          'In the forward diffusion process, x_t given x_0 is computed as:',
          [
            'By simulating t gradient steps',
            'x_t = sqrt(abar_t) x_0 + sqrt(1 - abar_t) eps, with abar_t the cumulative product of (1 - beta_s) — one-shot noising',
            'x_t = x_0 + t * eps',
            'x_t = softmax(x_0)',
          ],
          1,
          'The geometric schedule telescopes into a closed form, so training can jump to any t directly — the property that makes the MSE target free.',
        ],
        [
          'The diffusion training objective for an epsilon-predictor is:',
          [
            'Cross-entropy over pixels',
            'E || eps - eps_theta(x_t, t, c) ||^2 — MSE between injected and predicted noise',
            'Adversarial loss against a discriminator',
            'KL divergence to the prior',
          ],
          1,
          'Sample x_0, t, and eps; noise once via the closed form; regress the network output onto the exact eps used — no iterative simulation required.',
        ],
        [
          'Classifier-free guidance with scale w computes eps~ = (1+w) eps_cond - w eps_uncond. With w = 0 the result is:',
          [
            'Pure unconditional prediction',
            'Pure conditional prediction (eps_cond) — w is EXCESS guidance beyond the conditional',
            'The average of both',
            'Zero',
          ],
          1,
          'Substituting w = 0: eps~ = eps_uncond + 1*(eps_cond - eps_uncond) = eps_cond. Larger w amplifies the condition direction (1+w) at the cost of diversity.',
        ],
        [
          'The key computational benefit of latent diffusion is that:',
          [
            'It uses a smaller text encoder',
            'Denoising runs on a compressed latent (e.g., 48x fewer scalars, ~4096x cheaper full attention) with decoding to pixels only at the end',
            'It removes the need for a noise schedule',
            'It trains on fewer images',
          ],
          1,
          'The autoencoder shrinks the spatial problem before diffusion: same equations, fraction of the cost — the reason 512px generation runs on a single consumer GPU.',
        ],
      ]
    ),
  ],
};
