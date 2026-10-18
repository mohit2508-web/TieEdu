// Module 7 — Cost, Latency & Quality Engineering
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code } from '../nineBlocks';
import { lesson, M7, COURSE_ID } from './helpers';

export const module7: CourseModule = {
  id: M7,
  course_id: COURSE_ID,
  title: 'Module 7 — Cost, Latency and Quality Engineering',
  summary:
    'Treating tokens as money and milliseconds as UX: pricing-page arithmetic with worked bill estimates, batching and caching (exact, prefix and semantic), routing small versus large models with escalation economics, streaming and latency budgets, and quality-per-rupee as a first-class engineering metric with Pareto decisions and unit-cost guardrails.',
  sort_order: 7,
  lessons: [
    lesson(
      M7,
      'gae-7-1',
      1,
      'Token Pricing Arithmetic: Reading the Bill Before It Reads You',
      'The units, the multipliers and the maths: per-million-token rates, input versus output pricing, hand-worked bill estimates for three real workloads, and where estimates silently go 5× wrong.',
      19,
      nineBlocks({
        objectives: [
          'Read a model pricing page correctly — input, output, cached-input and batch rates per million tokens',
          'Estimate tokens per request and compute per-call and monthly cost from a workload description',
          'Identify the bill multipliers: repeated system prompts, growing chat history, retries, tool loops and retrieval stuffing',
          'Build a habit of logging real usage and comparing it to the estimate as a shipping gate',
        ],
        hook:
          'Two teams, same feature: an "AI meeting-notes" tool estimated at ₹40,000 a month came in at ₹9,000; a "chat with your documents" helper estimated at ₹15,000 came in at ₹78,000. Neither team was lying — they were counting different things. One forgot that every chat turn resends the whole conversation (and the 800-token system prompt) as input; the other assumed output tokens cost the same as input tokens. Pricing is not a number you look up once; it is arithmetic you practise. This lesson gives you the units, the worked estimates and the multipliers that separate the two teams.',
        concept: `**The units.** Providers price in *tokens* — subword units from the tokenizer (Lesson 2.1), quoted per **1,000,000 tokens** (per-Mtok). Rules of thumb, hedged: English prose runs roughly 0.7–0.8 words per token; code, numbers and Indic scripts tokenise less efficiently, so a Hindi or mixed-language workload can carry 20–50% more tokens for the same visible content — measure with your provider's tokenizer rather than guessing. Every request has two metered parts: **input** (everything you send: system prompt, history, retrieved context, the user's message) and **output** (everything generated). Output has historically been priced at a premium — often 2–4× input — because decoding is sequential compute while prefill parallelises; cached-input tokens (identical prefix served from cache, Lesson 7.2) are usually priced far below fresh input; batch/async APIs trade latency for a discount (historically around half, verify per release). All four rates move — treat every price in this course as "as of 2026, check the pricing page before you ship".

**The formula.** Cost = (input_tokens ÷ 1e6 × p_in) + (output_tokens ÷ 1e6 × p_out) + (cached_input ÷ 1e6 × p_cached) + tool/extra charges. Per-request cost × calls per day × 30 = monthly. Two derived numbers matter more than the total: **cost per task** (per summary, per ticket, per answer — the unit that becomes a product decision) and **cost per successful task** (divide by success rate — a pipeline at 70% first-pass success that retries costs 1.4× more than it looks). Worked example in the exercises below walks three workloads with illustrative rates.

**The multipliers — where estimates go wrong.** (1) *System prompt repetition*: a 900-token system prompt is billed on every call; at a million calls a month that is 0.9 billion input tokens of pure overhead — which is exactly why prompt-cacheable prefixes (7.2) matter. (2) *History growth*: multi-turn chat resends the transcript each turn, so a conversation of n turns costs O(n²) in input tokens (turn 1 sends 1k, turn 20 sends 20k) — cap, summarise or trim history. (3) *Retrieval stuffing*: 30k characters of context to answer a 40-token question multiplies input cost while often hurting quality (Lesson 3.3). (4) *Retries and rate limits*: 429s, timeouts and thrown exceptions that still generated tokens — metered output with no delivered answer. (5) *Tool loops*: each function call round-trip resends context and adds output; agentic flows bill 5–20 calls for one user intent (Module 10.2). (6) *Verbosity*: output tokens are the premium ones — an assistant told to "be thorough" can double the bill per answer with no quality gain (measure quality-per-token, Lesson 7.4). (7) *Wasted generation*: JSON-with-prose, regeneration spam, and users hitting "stop" after tokens were already streamed (you pay for generated tokens).

**Verify against reality.** Every provider returns a \`usage\` field per response — log it (input, output, cached) per request alongside your route and model version. Compare estimated versus actual on day one of any new workload; a variance above ~20% means your token-count assumptions (history, context, verbosity) are wrong somewhere specific. Then set a monthly budget with alerts (e.g., 70% warning, 90% throttle) and track **cost per task over time** — the metric drifts upward whenever prompts bloat, history caps loosen or a model silently upgrades. The economics also fall over time: capability gets cheaper per generation, so re-price your stack quarterly rather than annually (Lesson 10.4).

**Cost has a ceiling, not a goal.** Cheapest-possible is not the objective — a system that hallucinates refunds is "cheap" right up to the incident (Lesson 7.4 pairs cost with measured quality). The habit this lesson installs: every GenAI feature ships with a cost model attached to its PR, in the same units its latency budget is written.`,
        extras: [
          table(
            'Pricing components on a typical API page',
            ['Component', 'What it meters', 'Relative level (illustrative, verify)', 'Your lever'],
            [
              ['Input', 'Prompt + history + context sent', '1× base', 'Prompt slimming, history caps, retrieval top-k'],
              ['Output', 'Tokens generated', 'Often 2–4× input', 'Verbosity limits, max_tokens, smaller model for drafts'],
              ['Cached input', 'Identical prefix from prompt cache', 'A fraction of input (check TTL rules)', 'Stable-first prompt layout (7.2)'],
              ['Batch/async', 'Offline jobs in a window', 'Historically ~50% off', 'Nightly enrichment, eval runs (7.2)'],
              ['Tool calls', 'Extra round-trips + their context', 'Adds up fast in loops', 'Loop caps, coarse tools (10.2)'],
            ],
          ),
          code(
            `# Bill estimate for one workload (illustrative rates - verify)
IN_PRICE, OUT_PRICE = 3.0, 15.0        # USD per 1M tokens
in_tok, out_tok = 1500, 400            # per request (system+history+ctx / reply)
per_req = in_tok/1e6*IN_PRICE + out_tok/1e6*OUT_PRICE
daily   = per_req * 2000               # requests/day
monthly = daily * 30
print(per_req, daily, monthly)         # ~0.0105 USD, ~21 USD, ~630 USD`,
            'estimate_bill.py',
            'python'
          ),
          warn(
            'History is quadratic, not linear',
            'Every turn resends every earlier turn. A chat that looks like "1k tokens per message" is 21k input by message 20. Cap it, summarise it, or pay for it — the choice is yours, the default is to pay.',
          ),
        ],
        worked: {
          title: 'Estimate three workloads and diagnose a 5× bill overrun',
          problem:
            'A team runs three features. (a) Nightly summariser: 4,000 documents/day, 6,000 input + 400 output tokens each, batch-eligible. (b) Support assistant: 2,000 conversations/day, average 1,500 input + 400 output. (c) Extraction: 30,000 calls/day, 900 input + 150 output. Illustrative rates: $3 input / $15 output per Mtok; batch −50%. Last month actual bill was ~5× the naive estimate for feature (b). Produce the estimate, then find the overrun.',
          steps: [
            {
              title: 'Step 1 — per-request arithmetic (all three)',
              desc: 'Compute per-call cost, then daily and 30-day monthly totals at list rates. Keep every step in the same units (USD per million → per call → per day).',
              code_snippet:
                '(a) 6000/1e6*3 + 400/1e6*15 = 0.018+0.006 = $0.024/call -> 4000*0.024 = $96/day\n     batch: 0.012/call -> $48/day   (~$1,440/month)\n(b) 1500/1e6*3 + 400/1e6*15 = 0.0045+0.006 = $0.0105 -> $21/day (~$630/month)\n(c) 900/1e6*3 + 150/1e6*15 = 0.0027+0.00225 = $0.00495 -> $148.5/day (~$4,455/month)',
            },
            {
              title: 'Step 2 — sanity-check the mix',
              desc: 'Note the counter-intuitive ranking: (c) costs most per month despite the cheapest per call, purely on volume; (a) has the highest per-call cost but is batch-halved; (b) looks trivially cheap. Reporting only per-call cost would have picked the wrong optimisation target.',
            },
            {
              title: 'Step 3 — diagnose the 5× on (b)',
              desc: 'Log usage for a week and decompose: actual average input was 6,200 tokens, not 1,500. Cause stack: 900-token system prompt resent every call; untrimmed history — conversations averaged 14 turns, so turn-k resends the whole prefix (O(n²)); retrieved context top-10 chunks (~3,000 chars) always attached even for greetings; 6% of calls were retries after 429 timeouts, and one regeneration path billed twice. Naive estimate counted the user message only; reality counted everything the API saw.',
              code_snippet: 'actual in/request 6,200 (est 1,500) = 4.1x\n+ 6% retry waste + regen double-billing ~1.1x  ->  ~5x overrun',
            },
            {
              title: 'Step 4 — the fixes in cost order',
              desc: 'Prompt-cache the stable 900-token prefix (7.2 — biggest single win); trim history to last 4 turns plus a rolling summary; retrieval top-3 with a "greetings need no context" gate (most calls drop to ~1k input); cap retries with jitter and make regeneration share the cache. Target: bring (b) from ~$3,100 back under $800/month with equal quality (verify on the golden set — trimming history can hurt long conversations). Then wire usage logging and a 70% budget alert so the estimate and reality stay married.',
            },
          ],
          solution:
            'Three hand-computed bills ($1,440 batched / $630 / $4,455 monthly, illustrative rates), a counter-intuitive volume finding, a 5× overrun traced to real input composition (history quadratic, context stuffing, retries) and a fix list ordered by token share — closed with usage logging and budget alerts so drift surfaces as a graph, not an invoice surprise.',
        },
        practice: {
          title: 'Price your own usage',
          prompt:
            'Take a GenAI task you actually run. (1) Estimate its input/output tokens using chars ÷ 4 as a first pass. (2) Run it five times, read the provider usage field, and compute the true per-call cost at that provider\'s current rates. (3) Multiply by your real monthly volume. (4) List three multipliers from the concept that apply to you, with the token share each one costs. (5) State one change that cuts the bill without touching output quality, and how you would verify "without touching quality".',
          hint: 'If your estimate is off by more than 2×, the gap is almost always history and system-prompt resends — count what the API sees, not what the user typed.',
        },
        mistakes: [
          {
            mistake: 'Counting words (or characters) instead of tokens',
            fix: 'Use the provider tokenizer or chars÷4 as a rough pass; code and Indic text diverge most. Log actual usage to calibrate your intuition.',
          },
          {
            mistake: 'Pricing output at input rates',
            fix: 'Output is typically the premium 2–4× tier (verify per release). Verbosity is therefore a cost decision as well as a quality one.',
          },
          {
            mistake: 'Estimating one turn of chat as the unit',
            fix: 'Multi-turn history resent each turn is O(n²) input. Estimate the conversation, not the message: cap history, summarise, or budget for it.',
          },
          {
            mistake: 'One-time pricing review',
            fix: 'Rates, cache tiers and model line-ups change; so does your prompt. Track cost per task monthly and re-price quarterly (Lesson 10.4).',
          },
        ],
        exam: {
          question:
            'A chat feature is billed at $3/Mtok input and $15/Mtok output. Each turn sends a 900-token system prompt, the trimmed history (avg 1,200 tokens) and the user message (300 tokens), and generates 350 tokens. Compute cost per turn and per 1,000 conversations of 10 turns each. Then name two multipliers this calculation ignores.',
          answer:
            'Input per turn = 900 + 1,200 + 300 = 2,400 tokens; output = 350. Per-turn cost = 2,400/1e6 × $3 + 350/1e6 × $15 = $0.0072 + $0.00525 = $0.01245. A 10-turn conversation therefore costs about 10 × 0.01245 = $0.1245 (with the important caveat that history grows per turn in an untrimmed design — here history is already capped, so linear applies; without a cap, input grows each turn and the conversation is quadratic). 1,000 conversations ≈ $124.50. Ignored multipliers (any two): retries after rate limits and exception paths that still bill; tool/function-call round-trips that resend context; retrieval context stuffed into every call; regeneration and abandoned streaming (tokens paid but unused); cached-input and batch discounts not taken; output verbosity above what quality requires. The habit: estimate, log the usage field, and reconcile — the delta is where the real system lives.',
          source: 'Standard cost-modelling screen question for LLM product engineering.',
        },
        summary: [
          'Units: tokens per million, input vs output vs cached vs batch rates — every price is "as of 2026, verify per release".',
          'Two numbers beat the total: cost per task and cost per successful task (retries count).',
          'Multipliers: repeated system prompt, quadratic history, retrieval stuffing, retries, tool loops, verbosity, wasted generation.',
          'Estimate → log usage → reconcile → alert: a variance above ~20% is a bug in your model of your own system.',
          'Cost is a budgeted constraint with a quality twin (7.4), not a goal to minimise into failure.',
        ],
      }),
      [
        [
          'API prices are quoted per:',
          [
            '1,000 tokens, flat across input/output',
            '1,000,000 tokens, with separate rates for input and output (and usually cheaper cached-input and batch tiers)',
            'One conversation',
            'One generated page',
          ],
          1,
          'Per-Mtok with tiered rates is the industry convention; output historically carries a premium because decoding is sequential.',
        ],
        [
          'A 10-turn chat without history trimming costs input tokens that grow:',
          [
            'Linearly with turns',
            'Roughly quadratically — each turn resends the whole prefix, so turn k costs O(k)',
            'Not at all — history is free',
            'Only for the first three turns',
          ],
          1,
          'Sum of 1..n is O(n²): the classic reason chat bills outrun estimates.',
        ],
        [
          'Which single change most directly cuts input cost for a fixed 900-token system prompt resent on every call?',
          [
            'Lowering temperature',
            'Enabling prompt/prefix caching so the stable prefix bills at cached rates',
            'Raising max_tokens',
            'Switching to JSON mode',
          ],
          1,
          'Caching monetises prompt stability — the prefix must stay byte-stable (Lesson 7.2).',
        ],
        [
          'The most decision-useful cost metric for a product team is:',
          [
            'Total monthly spend alone',
            'Cost per task (and per successful task) tracked over time, paired with quality',
            'Price per token of the cheapest model',
            'GPU utilisation of the provider',
          ],
          1,
          'Unit economics connect architecture choices to the product; totals alone hide volume effects.',
        ],
      ]
    ),
    lesson(
      M7,
      'gae-7-2',
      2,
      'Batching and Caching: Buying Tokens at Wholesale',
      'Four discount layers — async batch APIs, provider prefix caching, application-level exact caches and semantic caches — each with its key, its invalidation rule and its distinctive way of being wrong.',
      18,
      nineBlocks({
        objectives: [
          'Route latency-insensitive workloads to batch APIs and compute the discount trade-off',
          'Design prompts for prefix caching: stable content first, volatile last, and know what silently invalidates a cache hit',
          'Build an application cache with correct keys — tenant-scoped, versioned, normalised — and reject dangerous hits',
          'Evaluate semantic caching with similarity thresholds and break-even arithmetic against the cost of a wrong answer',
        ],
        hook:
          'Two identical workloads: 10,000 document enrichments to run overnight, and 10,000 customer questions arriving in real time. The first is a candidate for a batch discount and costs half as much; the second cannot wait. Meanwhile, in a chat assistant, 60% of every input bill was re-billing the same 2,400-token system-and-tools prefix — for a user asking "what are your hours?" for the fifth time this week, the entire answer was already known. Discounting is not coupon-clipping; it is recognising which tokens are genuinely repeatable, which jobs are genuinely patient, and where a stale answer would cost more than the saving.',
        concept: `**Batch APIs: wholesale for patient jobs.** Most major providers (as of 2026 — verify per vendor) accept offline jobs through an asynchronous batch endpoint: submit thousands of requests, get results within a processing window (commonly hours), pay a discount historically around 50%. The fit is strict: nightly enrichment, backfills, dataset labelling, eval runs, bulk summaries — anything where "done by morning" is a requirement. The anti-fit: chat, live agents, anything user-waiting. Two engineering notes make batches actually win: results arrive out of order, so correlate by client id (not index); and batch failures are silent if you never poll — write completion checks and a re-submit path. Client-side concurrency matters too: for synchronous APIs, parallel requests let the provider's dynamic batching fill GPU batches, improving throughput and sometimes effective latency — throttle gently and respect rate limits.

**Provider prefix caching: the invisible discount on conversation.** Because prefill work for an identical prefix can be reused (the KV cache from Lesson 2.4, exposed as a service), providers serve repeated prompt prefixes from cache at a lower input price and lower latency. The mechanics are provider-specific and worth verifying per release, but the pattern is stable: a *minimum prefix length* must match (often on the order of a couple thousand tokens — short prompts never cache), matching is *prefix-sensitive* (byte-level from the start), there is a *TTL* measured in minutes (expiring between turns of a slow conversation loses the hit), and cache writes may themselves carry a small charge. Design rules follow directly: put stable, high-volume content first — system prompt, tool definitions, few-shot examples — and volatile content (timestamp, user message, retrieved chunk that changes) last; keep the prefix byte-stable (no dynamic ids injected mid-prefix; even whitespace edits reset it); accept that retrieval results inside the prefix will break hits unless you order them stably. A chat product with a heavy system prompt should think of caching as converting its biggest repeated cost into its cheapest.

**Application-level exact cache: your key, your rules.** Independently of the provider, you can store responses keyed by a normalised request. The key must include: the full prompt after normalisation (strip volatile noise — timestamps, session ids — else you miss), the model id, all sampling parameters, *and the tenant/user scope where answers are personalised* (cross-tenant hits on personalised prompts are a privacy incident, Lesson 9.3). Invalidation is mandatory: prompt template version, model version and data version all belong in the key or as flush triggers — a cached answer from the old prompt is a regression you chose to serve. Exact caches shine on FAQ-style repeats, document-QA with stable inputs and any deterministic-feeling transformation (format conversion, classification of identical text).

**Semantic cache: powerful, and the one that hurts when wrong.** Embed the request, look up near-neighbours, serve the stored answer above a similarity threshold. The economics are attractive — embedding a query is orders of magnitude cheaper than a completion — but the failure mode is distinctive: *semantic near-misses*. "How do I reset my password?" and "How do I change my registered email?" are highly similar in embedding space and require different answers; so are "What is the refund window?" asked with different order numbers. Design rules: exclude personalised, numeric and state-dependent queries from the cache entirely (route key patterns, not vibes); set the threshold empirically by replaying real traffic and measuring *precision of hits* (of the served hits, how many were truly answer-identical?) — aim high precision at the cost of lower recall; add freshness TTLs so cached answers expire with the facts; store the question alongside the hit for audit. A semantic cache with 95% precision at 30% recall is usually a win; at 80% precision it is an incident generator.

**Stack the layers with honest accounting.** Batch for offline work; provider prefix cache for every interactive call (free once designed in); app exact cache for verbatim repeats; semantic cache only for a vetted, non-personal slice. Measure each layer's hit rate and what it saves (tokens × rate), and total the bill before/after. What none of them fix: wrong-but-cached answers (evict on data change), stale policy served fast (TTL discipline), and cross-tenant leakage (key scoping). Cache engineering is grep-able in prod dashboards: hit rate, precision sample, invalidation events.`,
        extras: [
          table(
            'Four discount layers: key, invalidation, signature failure',
            ['Layer', 'Key / trigger', 'Invalidation', 'Signature failure'],
            [
              ['Batch API', 'Async job submission', 'Job completion (poll it)', 'Silent unprocessed job; out-of-order results'],
              ['Provider prefix cache', 'Byte-identical prompt prefix', 'Any prefix edit; TTL expiry (minutes)', 'Assuming hits that min-length/stability rules never deliver'],
              ['App exact cache', 'Normalised prompt + model + params + tenant', 'Prompt/model/data version bump', 'Cross-tenant hit on personalised prompt'],
              ['Semantic cache', 'Embedding similarity ≥ threshold', 'TTL + eviction on data change; exclusion rules', 'Near-miss served: similar question, different correct answer'],
            ],
          ),
          code(
            `# Semantic cache decision (shape, with the safety rails inline)
if is_personalised(q) or has_numbers(q) or is_stateful(q):
    return MISS                      # never serve near-neighbours of these
hits = ann.search(embed(q), top_k=1, threshold=0.94)
if hits and hits.precision_audit_ok and fresh(hits.created_at, ttl_hours=6):
    return HIT                       # log q, hit_id, threshold for audit
return MISS                         # measure: hit rate x, hit precision y`,
            'semantic_cache.py',
            'python'
          ),
          tip(
            'Stable-first prompt layout pays twice',
            'Ordering system prompt + tools + examples before volatile content unlocks prefix caching AND keeps your prompt diff clean. Dynamic timestamps belong at the end or not at all.',
          ),
        ],
        worked: {
          title: 'Cut a document-QA assistant bill with all four layers',
          problem:
            'A document-QA assistant: 5,000 questions/day; per call = 2,400-token system+tools prefix, 1,200-token rolling history, 400-token question with 3 retrieved chunks (~1,600 tokens), 350 output. Rates (illustrative): $3/Mtok input fresh, $0.50/Mtok cached input, $15 output; batch −50% for offline. Separately, a nightly job embeds 60,000 notes (batch-eligible). Design the discount stack and estimate before/after monthly cost.',
          steps: [
            {
              title: 'Step 1 — baseline and layer assignment',
              desc: 'Interactive input per call = 2,400 + 1,200 + 400 + 1,600 = 5,600 fresh input + 350 output. Per call = 5,600/1e6×3 + 350/1e6×15 = 0.0168 + 0.00525 = $0.02205 → ×5,000×30 ≈ $3,308/month interactive. Nightly embedding job and any doc re-summaries go to batch (−50%). Layer decisions: prefix cache (interactive), exact app cache (verbatim repeats), semantic cache (vetted FAQ slice only), batch (nightly).',
              code_snippet: 'baseline interactive: 0.02205/call x 5000/day x 30 = ~$3,308/mo',
            },
            {
              title: 'Step 2 — reorder the prompt and claim prefix cache',
              desc: 'Reorder: system+tools (2,400, byte-stable) → examples → history → question. Assume the prefix caches for 90% of calls (TTL fine within a conversation; misses on cold starts). New input cost: 2,400 at $0.50 + 3,200 fresh at $3 = 0.0012 + 0.0096 = $0.0108 + 0.00525 output = $0.01605/call → ≈$2,408/month. Saving ≈ $900/month from layout alone — before any cleverness.',
            },
            {
              title: 'Step 3 — exact and semantic caches on a vetted slice',
              desc: 'From a week of logs: 12% of questions are byte-identical repeats (after stripping session ids) → exact cache serves them at embedding+lookup cost ≈ free. Of the remainder, traffic shows a cluster of ~450 FAQ-style question intents; a semantic cache with threshold set for ≥95% hit precision on an audited replay, with numeric/stateful/personal questions excluded, captures ~10% more. Combined: ~22% of calls skip generation entirely (≈ $530/month saved at $0.01605). Non-negotiables: tenant-scoped keys, TTL 6h, eviction on document re-index (cached answers reference old chunks — invalidation trigger is the index version).',
            },
            {
              title: 'Step 4 — batch the patient work and audit the stack',
              desc: 'Nightly embedding/re-summaries: submit through the batch endpoint (−50% on that workload), poll for completion with a failure path. New interactive bill ≈ $1,878/month + batched offline ≈ 35% cheaper on its share. Verify no quality loss: golden set unchanged (7.4 / 6.4), plus two new canaries — a question whose answer changed this week (must miss the cache after eviction) and a cross-tenant probe (must never hit). Track monthly: prefix hit %, exact hit %, semantic hit % + precision sample, invalidation lag.',
            },
          ],
          solution:
            'Baseline $3,308 → prompt reordering with prefix cache → exact and semantic caches on a vetted, tenant-scoped, versioned slice → batch for nightly work: roughly a 40% cut at equal measured quality, with hit-rate, precision and invalidation dashboards as the ongoing proof.',
        },
        practice: {
          title: 'Find your cache wins and your forbidden hits',
          prompt:
            'Open your most-used prompt. Split it into stable prefix and volatile tail, then propose the byte-stable ordering you would ship. Write the exact cache-key function for an app-level cache of your feature (include model id, params, tenant, template version). List two inputs that must NEVER hit that cache and why. Finally, compute a break-even: if your semantic cache adds an embedding call at 1/500th of a completion cost, what hit precision do you need to call it worth it — and what hit precision makes it an incident?',
          hint: 'A cache key you would not post publicly is the wrong key: no raw PII, always tenant-scoped, always version-stamped.',
        },
        mistakes: [
          {
            mistake: 'Assuming prefix caching fires on short or unstable prompts',
            fix: 'Most providers need a meaningful minimum prefix and byte-identical match. Verify with usage fields (cached-token counts) instead of hoping — reorder stable content first.',
          },
          {
            mistake: 'Semantic cache without exclusion rules',
            fix: 'Personalised, numeric, time- and state-dependent questions must bypass the cache; similarity is not sameness of required answer. Set the threshold from audited hit precision.',
          },
          {
            mistake: 'One global cache key across tenants or model versions',
            fix: 'Cross-tenant hits are privacy incidents; old-model hits are regressions served on purpose. Scope keys by tenant and version, and flush on data/index changes.',
          },
          {
            mistake: 'Sending interactive workloads to batch APIs',
            fix: 'Batch is for patient jobs — evals, backfills, nightly reports. Latency-insensitive is a requirement you verify, not a hope; live traffic needs the synchronous path.',
          },
        ],
        exam: {
          question:
            'Explain the difference between provider prefix caching and a semantic cache: what each keys on, what invalidates it, and the distinctive failure mode of each. Then state the requirement that makes a workload eligible for a batch API.',
          answer:
            'Provider prefix caching reuses prefill computation for an identical prompt *prefix* (from the start of the prompt, typically above a minimum length, with a short TTL), billed at a discounted cached-input rate; it is invalidated by any prefix edit, TTL expiry or model change. Its failure mode is the missed hit — volatile content placed early (timestamps, random ids, unstable retrieval) silently resets caching, so teams pay fresh-input prices while believing they cache. A semantic cache keys on embedding similarity of the *request* (the whole query, not a prefix), stored at the application layer with a similarity threshold and its own TTL; it is invalidated by data/version changes and tuned thresholds. Its failure mode is the dangerous hit — a near-neighbour question with a different correct answer (password reset vs email change, different order numbers), which is why personalisation/numeric/stateful queries are excluded and hit precision is audited. Batch-eligibility requirement: the workload must be genuinely latency-insensitive (results acceptable within an hours-scale window), which fits offline enrichment, labelling and eval runs and categorically excludes anything a user is waiting on.',
          source: 'Common platform-engineering question in LLM cost interviews.',
        },
        summary: [
          'Batch APIs: −50% class discounts (verify) for patient jobs — poll completion, correlate by id, handle silent failures.',
          'Prefix caching: stable-first prompt design converts your biggest repeated token into your cheapest; byte-stability and min-length rules decide hits.',
          'App exact caches: tenant-scoped, normalised, version-stamped keys — invalidation is part of the feature, not an afterthought.',
          'Semantic caches: exclude personal/stateful queries, tune threshold on audited precision, TTL and index-version eviction.',
          'Stack the layers, then prove it: hit rates, precision samples and before/after unit cost on one dashboard.',
        ],
      }),
      [
        [
          'Provider prompt/prefix caching typically requires:',
          [
            'Any prompt at all',
            'A byte-identical prefix above a provider minimum length, with a limited TTL — volatile content must come last',
            'Temperature 0',
            'A batch submission',
          ],
          1,
          'Prefix stability plus minimum length is the whole mechanism; edit the prefix and you start paying fresh rates again.',
        ],
        [
          'The distinctive risk of a semantic cache is:',
          [
            'Too slow',
          'Serving a similar-looking request whose correct answer differs — hence exclusion rules and audited hit precision',
            'Costing more than completions',
            'Never hitting on repeated questions',
          ],
          1,
          'Similarity of phrasing is not sameness of required answer; precision of hits is the safety metric.',
        ],
        [
          'A nightly dataset-labelling job is the ideal batch-API candidate because it is:',
          [
            'Small',
            'Latency-insensitive — results within an hours-scale window satisfy the requirement',
            'Interactive',
            'A single request',
          ],
          1,
          'Patience is the eligibility criterion; interactive traffic never qualifies.',
        ],
        [
          'Which cache key is correct for an app-level response cache?',
          [
            'The user message text only',
            'Normalised prompt + model id + sampling params + tenant scope + template/data version',
            'A hash of the answer',
            'The timestamp of the request',
          ],
          1,
          'Anything omitted (model, params, tenant, version) is a wrong-answer or privacy incident waiting to be served.',
        ],
      ]
    ),
    lesson(
      M7,
      'gae-7-3',
      3,
      'Routing and Perceived Latency: Where the Milliseconds and Paise Go',
      'Right model per request — task tiers, cheap-first cascades with escalation economics — and the latency half of the budget: time-to-first-token, streaming UX and p95 discipline.',
      19,
      nineBlocks({
        objectives: [
          'Classify requests into task tiers and assign model classes with a defensible rationale',
          'Design a cascade: small model first, verification-gated escalation, with break-even arithmetic',
          'Decompose latency into queue, prefill, decode, tools and network — and budget it at p95',
          'Specify streaming UX: first-token targets, incremental rendering, stop/regenerate and error states',
        ],
        hook:
          'Two findings from the same traffic log: 92% of requests were shallow — label this ticket, rewrite this sentence, answer from a five-line KB entry — yet every one of them paid frontier-model prices for frontier-model latency. And users abandoned at 3.8 seconds, even though the total answer time was 4 seconds: they had seen nothing happen. Fix one without the other and you lose twice. Routing is the cost lever; streaming and latency budgets are the experience lever; this lesson uses both on the same traffic.',
        concept: `**Routing: the model you call should be the model the task deserves.** Start with task tiers. *Tier 1 — trivial*: classification, extraction of a few fields, formatting, rewriting, short KB lookups. Small models (roughly 3–8B class open weights or the vendor's mini/haiku tier) handle these at a fraction of the price and often at lower latency. *Tier 2 — standard*: summaries, drafts, grounded answers, multi-field extraction. Mid-size or a strong small model with grounding. *Tier 3 — hard*: multi-step reasoning, ambiguous or high-stakes advice, complex code changes. Frontier-class models. Three routing mechanisms, increasing sophistication: *static* (endpoint determines model — simple, blunt); *rules* (length, language, user tier, detected task → model — transparent and testable); *learned or LLM routers* (a cheap classifier or small LLM chooses per request — flexible, but now the router itself needs evals). The production favourite is the **cascade**: try the cheap model first, run a *verification gate* — schema validity (6.3), self-consistency (6.1), a judge rubric sample (6.4), retrieval-hit checks — and escalate to the large model only when the gate fails. Verification must be cheaper than the escalation it prevents, or the cascade is theatre.

**The cascade arithmetic.** Suppose small = $0.002/task, large = $0.03/task, gate = $0.001, escalate 25% of requests. Cascade cost = 0.002 + 0.001 + 0.25 × 0.03 = $0.0105 vs $0.03 all-large — a 65% saving. Now vary escalation: at 60% escalation you pay $0.021, still under, but the *quality* only converges to large-model quality if the gate is well-calibrated: the real risk is the gate passing weak answers (silently capping quality) or failing good ones (burning the saving). Measure both: gate false-pass rate on a golden set, escalation rate in production, and overall task quality versus the all-large baseline. The second honest cost is latency: escalators pay the small model *and* the large one — worst-case latency is the full cascade, so p95 can worsen even as average cost falls. Budget for it.

**Latency anatomy.** Total time = queueing + **prefill** (processing your input — grows with prompt and context length; a 30k-token context delays first token even for a 50-word answer) + **decode** (output tokens at the model's tokens-per-second — output length dominates completion time) + tool/retrieval calls (each serial hop adds round-trip) + network. Consequences: grounding adds retrieval to the critical path (parallelise, cache); long outputs cost seconds (cap them); input trimming helps TTFT as much as it helps the bill (7.1). Report **p50 and p95, never averages** — averages hide the 3-second tail users actually rage-quit — and break the metric down per stage, or you will optimise the model while the vector store was the tail.

**Streaming is a UX technique, not a speedup.** Token streaming (the KV-cache serving physics of Lesson 2.4) does not reduce total work; it moves *perceived* latency to time-to-first-token (TTFT), which users feel far more than completion time. Design rules: target first paint under ~1 second class (set your own number, measure p95); show a stable skeleton or "thinking" state immediately so layout never jumps; stream markdown incrementally with tolerant parsing (never render half a code fence as raw garbage); keep stop and regenerate controls live — cancellation also stops billing for undelivered output; handle mid-stream failure explicitly (retry policy, "connection lost — retry from here"), because partial answers look like truth; and *do not stream* when the consumer needs an atomic result — a JSON-driven UI or a structured record should validate first (6.3) and then render, or the user watches a broken widget. Perceived-latency stacks with quality: a fast wrong answer escalates twice (7.4's cost per successful task).

**Close the loop.** Per feature: a latency budget (p95 TTFT, p95 total), a cost-per-task budget (7.1), and a quality gate (6.4) — three numbers reviewed together, because routing changes move all three at once. Route with gates, stream with intent, and re-measure after every model version bump (10.4).`,
        extras: [
          table(
            'Task tiers → model class → routing rule of thumb',
            ['Tier', 'Example requests', 'Model class', 'Gate before accepting'],
            [
              ['Trivial', 'Classify, reformat, extract one field, canned KB line', 'Small / mini tier (or classic ML classifier — 8.3)', 'Schema validity; label confidence'],
              ['Standard', 'Summarise, grounded answer, draft reply, multi-field extraction', 'Mid-size or small + grounding', 'Retrieval hit + claim checks'],
              ['Hard', 'Multi-step reasoning, ambiguous/high-stakes, complex code', 'Frontier class', 'Rubric sample + human review where stakes demand'],
            ],
          ),
          code(
            `# Cascade with a verification gate (shape)
r = call(small, req)
if verify(r) == PASS:            # schema + consistency + retrieval checks
    return r                     # cheap path
r2 = call(large, req)            # escalation: pays both models
return r2
# track: escalation_rate, gate_false_pass (vs golden set), p95, cost/task`,
            'cascade.py',
            'python'
          ),
          warn(
            'A cascade\'s p95 is the escalation path',
            'Average cost falls while tail latency can rise: escalated requests pay two round-trips. Budget and alert on p95 of escalated traffic separately, or the UX quietly degrades for exactly the hard cases.',
          ),
        ],
        worked: {
          title: 'Route a campus assistant\'s traffic and put streaming on its budget',
          problem:
            'A university assistant handles 12,000 requests/day: 60% one-line FAQ lookup from a small KB, 25% summarise/reformat, 10% multi-step ("explain my fee break-up with calculations"), 5% ambiguous admin advice. Current setup: one frontier model for everything, average 4.1s to completion, no streaming, $2,900/month. Design tiers, a cascade with gates, a latency budget with streaming — and estimate the new monthly bill and quality position.',
          steps: [
            {
              title: 'Step 1 — tier the traffic and pick models',
              desc: '60% FAQ → Tier 1 small model with grounding (KB top-3, source-or-abstain from 6.2). 25% summarise/reformat → Tier 2 mid-size. 10% calculations → Tier 3 frontier *with tools* — never let any model do fee arithmetic from memory (6.1). 5% ambiguous advice → Tier 3 plus escalation-to-human flag. Static-by-endpoint first (transparent, testable), then a rules layer for exceptions.',
            },
            {
              title: 'Step 2 — cascade + gates on Tier 1/2',
              desc: 'Tier 1 answer passes gates (KB hit + claim check + schema for structured replies) or escalates to Tier 2; Tier 2 sample-gated by rubric (6.4) on 5% with automatic escalation on failure signals. Assume 15% escalation from Tier 1, 10% from Tier 2. Small $0.0015, mid $0.006, frontier $0.02 per call (illustrative).',
              code_snippet: 'blended = 0.0015 + 0.15*0.006 + (0.10*0.02 on escalated share)\nest. blended ~$0.0045/call vs frontier-only $0.02  ->  ~$1,160/mo vs $2,900',
            },
            {
              title: 'Step 3 — latency budget and streaming',
              desc: 'Budget p95: TTFT ≤ 1.2s (retrieval 200ms parallel with prefill, Tier-1 prefill small), total ≤ 4s; escalated p95 tracked separately (frontier prefill on long context can dominate — trim context first). Ship streaming with stable skeleton, incremental markdown, live stop; atomic JSON replies validate-before-render. Expect *perceived* time to fall to first-paint (~sub-second class) even though escalated total time is unchanged.',
            },
            {
              title: 'Step 4 — prove no quality loss',
              desc: 'Same 60-case golden set (6.4) evaluated across all tiers vs the old single-model baseline: overall task score must be ≥ baseline, FAQ abstention must not regress (small models guess — test it), and escalation quality measured by gate false-pass rate on the golden set (target low single digits, hedged per task). Weekly dashboard: cost/task, escalation rate, p50/p95 TTFT and total, golden-set score. Re-run everything on the next model upgrade — routing tables rot.',
            },
          ],
          solution:
            'Four tiers with tool-enforced arithmetic, gated cascades at 15%/10% escalation (illustrative ~60% bill reduction), a p95 budget with per-stage attribution, streaming for perceived latency, and a golden-set gate proving the small-model routes did not cheapen the answers — cost, latency and quality reviewed as one change.',
        },
        practice: {
          title: 'Tier your own traffic and time first tokens',
          prompt:
            'List the last 20 requests you personally made to an AI feature; classify each into trivial/standard/hard and note which model class you would route it to and why. Then, on two providers you can access, time (a) time to first token and (b) total time for the same short prompt, twice each — record the numbers, not feelings. Finally, write the verification gate you would trust to escalate a trivial-tier answer, and what false-pass rate would make you disable it.',
          hint: 'If you cannot name the gate, you do not have a cascade — you have a lottery with extra steps.',
        },
        mistakes: [
          {
            mistake: 'Routing by cost alone with no quality gate',
            fix: 'Every route carries a golden-set score (6.4); escalation exists because the gate failed. A router without gates is an unmonitored quality lottery.',
          },
          {
            mistake: 'Reporting average latency',
            fix: 'Averages hide the tail users abandon on. Track p50 and p95 per stage (prefill, decode, tools) — the tail is a specific stage, usually retrievable.',
          },
          {
            mistake: 'Streaming into an atomic UI',
            fix: 'Structured consumers (JSON-driven widgets, records) should validate then render (6.3). Half-rendered structures read as bugs even when the final object is valid.',
          },
          {
            mistake: 'Forgetting double-payment in cascades',
            fix: 'Escalated requests pay the small model and the large one, and their p95 spans both round-trips. Track escalation cost share and escalated p95 as first-class metrics.',
          },
        ],
        exam: {
          question:
            'Design a routing strategy for a traffic mix of 60% simple FAQ, 25% summarisation and 15% hard reasoning. Include tiering, a cascade with a verification gate, and the metrics that tell you the router is working. Then decompose end-to-end latency and say where streaming helps and where it does not.',
          answer:
            'Tiering: FAQ → small model with grounding (gates: KB hit, claim check, abstention when KB is silent); summarisation → mid-size model (gate: schema/length + rubric sample); hard reasoning → frontier class, optionally with tools for calculation, with human review where stakes require. Cascade: cheap first, verification gate (schema validity, self-consistency, retrieval-hit checks — cheaper than escalation), escalate on gate failure; all routes scored on one golden set so overall quality equals or beats the old single-model baseline. Metrics: escalation rate, gate false-pass rate (against golden set), cost per task, p50/p95 per route, golden-set score over time. Latency decomposition: queueing + prefill (scales with input/context — the reason retrieval and history caps affect TTFT) + decode (scales with output length) + tool/retrieval round-trips + network; measure p95 per stage. Streaming reduces *perceived* latency by delivering a fast first token and incremental rendering — huge for long text chat — but it does not shorten decode, does not help atomic/structured consumers (validate then render), and cannot hide a slow prefill; escalated cascades still pay full tail latency and must be budgeted separately.',
          source: 'Classic system-design question for LLM serving and product engineering.',
        },
        summary: [
          'Tier by task difficulty; route with gates; small models win trivial work at 10× the savings.',
          'Cascade economics: cheap-first + verification + escalation beats all-frontier — if the gate\'s false-pass rate is measured and low.',
          'Latency = queue + prefill + decode + tools; budget p95 per stage, never average-only.',
          'Streaming moves perceived latency to TTFT — design skeleton, incremental render, stop/error states; validate before rendering atomic structures.',
          'Cost, latency and quality move together — change routing only with all three dashboards open.',
        ],
      }),
      [
        [
          'In a cheap-first cascade, the verification gate exists to:',
          [
            'Slow the response down',
            'Accept good cheap answers and escalate the rest — making escalation rate and false-pass rate the metrics to watch',
            'Replace the large model entirely',
            'Reduce output tokens',
          ],
          1,
          'The gate is the routing brain: pass weak answers and quality caps out; fail good ones and the savings evaporate.',
        ],
        [
          'Time-to-first-token is dominated by:',
          [
            'Output length',
            'Input prefill — queueing and processing the prompt/context before decoding begins',
            'The user\'s bandwidth only',
            'max_tokens',
          ],
          1,
          'Prefill scales with everything you send; long outputs affect total time, not first token.',
        ],
        [
          'A feature shows 2.1s average latency but 7s p95. The correct conclusion is:',
          [
            'The feature is fast',
            'Half the traffic is fine and a substantial tail is slow — investigate the tail per stage (users experience the tail)',
            'Averages are sufficient for UX budgets',
            'The model should be replaced immediately',
          ],
          1,
          'Tail latency is abandonment latency; per-stage p95 attribution tells you whether it is retrieval, prefill or tools.',
        ],
        [
          'Streaming is the wrong choice when the consumer:',
          [
            'Is a human reading prose',
            'Is an atomic structured consumer (JSON UI) that must validate before rendering',
            'Wants a stop button',
            'Benefits from an early skeleton state',
          ],
          1,
          'Humans enjoy incremental text; machines need validated wholes (Lesson 6.3).',
        ],
      ]
    ),
    lesson(
      M7,
      'gae-7-4',
      4,
      'Quality-per-Rupee: Making the Trade-off an Engineering Number',
      'Defining measurable quality for your task, comparing candidates on one golden set with real unit costs, reading the Pareto frontier, and running unit economics as a monitored metric — with safety as a gate, never a numerator.',
      18,
      nineBlocks({
        objectives: [
          'Operationalise "quality" as a task metric on a shared golden set before comparing any two models',
          'Compute cost per task from real usage and combine it into a quality-per-rupee comparison',
          'Construct and interpret a Pareto frontier over quality, cost and latency — and make the business-side trade explicit',
          'Install unit-economics guardrails: target cost per task, drift alerts and a re-evaluation cadence',
        ],
        hook:
          'The demo question: model A scores 92% on your eval, model B scores 88% — B costs one-twentieth as much. Which is better? The honest answer: the question is malformed until you can say what quality means for this task, what a wrong answer costs you, and whether 4 points buys anything you value. Teams that skip those questions argue in adjectives ("B feels fine"); teams that answer them ship a spreadsheet that settles the debate in one meeting. This lesson is about turning quality-versus-cost from taste into a number you can put on a dashboard and defend.',
        concept: `**Quality must be defined before it is compared.** "Quality" without a task metric is not a metric — it is a mood. Map yours to something measurable: exact-match or macro-F1 for closed tasks (classification, extraction — 8.2/8.3), claim-level faithfulness and number-preservation for factual text (6.2/8.1), rubric pass rate or judge score for open text (6.4), task success (did the user\'s job complete?) for agents (10.2). Then pin it to one frozen golden set — the same cases, same scorer, same thresholds for every candidate — because scores from different evals are not comparable, and vendor benchmarks answer vendor questions (10.4). Guardrails come first and separately: safety, format validity and policy compliance are *gates* (pass/fail thresholds from 6.4), not points on a quality scale — a model that is unsafe but cheap does not get a high ratio, it gets rejected.

**The comparison sheet.** For each candidate: golden-set quality (same set), cost per task computed from real usage (7.1 — tokens × rates, including retries), p95 latency (7.3), plus operational columns teams forget (privacy posture, data retention, lock-in, hosting options — Module 3.3\'s selection frame applied). *Quality per rupee* = quality ÷ cost per task (or equivalently: quality points per ₹100 of spend) — a coarse but decisive ratio when quality is on a common scale. Then plot quality vs cost: the **Pareto frontier** is the set of candidates where you cannot improve quality without paying more (or cut cost without losing quality). Anything below the frontier is dominated — eliminated without discussion. The frontier rarely has one winner: it has a *decision*, and that decision is business logic: what is one point of faithfulness worth? If a wrong fee costs ₹50 in support time and you handle 40,000 tasks/month, 3 avoided errors ≈ ₹6,000/month — now compare that to the frontier\'s price gap. Write the arithmetic; the argument ends.

**Quality-per-rupee as an operating metric.** Not a one-time comparison but a per-feature dashboard line: cost per task (from usage logs) and rolling golden-set/judge quality, both trending over time. Alert when either drifts: unit cost up (prompt bloat, cache misses, model upgrade, verbosity creep) or quality down (vendor model change, prompt edit, retrieval shift). This is where the hidden costs join: escalation and retries inflate cost per *successful* task (7.1), human review time belongs in the denominator for high-stakes flows, and incident cost (a fabricated public statement) dwarfs a month of API savings — risk-weighted cost, honestly estimated, not just the token bill.

**Where cheap wins, where it does not.** High-volume, low-stakes work (classification, formatting, first drafts, internal summaries) is where small models dominate the frontier — 10–50× cheaper with quality that the golden set says is "good enough" for the task, and "good enough" is a measured claim, not a shrug. Low-volume, high-stakes work (money movement, safety-relevant advice, external publication) favours large models plus human review — because the cost of a wrong answer is asymmetric. Hybrid patterns capture both: small drafts critiqued by a large model (two-model pipelines — the critic only sees drafts, so it bills far less than generating), large-model routing for the hard slice only (7.3), or open-weight self-hosting where volume justifies the ops burden (Module 3.1, 10.3). Every option returns to the same sheet.

**Re-decide quarterly.** Both axes move: prices drop, new model generations raise the quality floor, your prompt improves, your traffic mix shifts. A frontier choice from early 2025 can be dominated by a mid-tier model a year later. The discipline: re-run the comparison sheet on the current stack every quarter and after every vendor price/model change (the re-verification ritual of 10.4). Ratios without dates are folklore.`,
        extras: [
          table(
            'Comparison sheet: three candidates, one task (illustrative)',
            ['Candidate', 'Golden-set quality', 'Cost/task (₹)', 'p95 latency', 'Quality per ₹100', 'Verdict'],
            [
              ['Frontier API', '94%', '1.60', '3.1s', '58.8', 'Pareto — pay for hard slice only'],
              ['Mid-tier API', '91%', '0.32', '2.2s', '284', 'Pareto — default for standard tier'],
              ['Small open 8B (hosted)', '84%', '0.28', '1.4s', '300', 'Pareto on cost, but check gates'],
              ['Old small API (dominated)', '83%', '0.45', '1.8s', '184', 'Eliminated: worse and pricier'],
            ],
          ),
          warn(
            'Safety and compliance are gates, not numerator terms',
            'Quality-per-rupee optimises inside the safe region only. A candidate failing a safety gate (6.4) never enters the ratio comparison — otherwise a cheap unsafe model "wins" the spreadsheet and loses the company the incident.',
          ),
          tip(
            'Report cost per successful task',
            'Divide cost by tasks that passed their quality bar, not by calls made. Retries, escalations and regenerations then show up honestly — usually moving the ranking closer together than naïve per-call maths suggests.',
          ),
        ],
        worked: {
          title: 'Pick a summarisation model with the spreadsheet argument',
          problem:
            'Support-team digest: 45,000 ticket-summaries/month. Three candidates. F: frontier API — 96% faithfulness on your 60-case golden set, ₹1.90/task. M: mid-tier — 91%, ₹0.38/task. S: small model — 82%, ₹0.09/task. Quality bar for shipping: ≥90% faithfulness (a wrong number in a digest misleads a decision). A wrong summary costs ~₹40 in downstream confusion (measured from team rework, hedged). Choose, compute economics, and state what would change your mind.',
          steps: [
            {
              title: 'Step 1 — apply the gate first',
              desc: 'Shipping bar ≥90% faithfulness: S (82%) fails outright — cheapness irrelevant outside the safe region (also check safety/format gates from 6.4 — none waived). F and M both pass; the comparison narrows to the two viable frontier points.',
            },
            {
              title: 'Step 2 — build cost and error arithmetic',
              desc: 'Monthly cost: F = 45,000 × 1.90 = ₹85,500; M = 45,000 × 0.38 = ₹17,100; gap ₹68,400/month. Error exposure at 4% vs 9% error rates: F produces ~1,800 flawed summaries/month, M ~4,050 — a delta of ~2,250 errors × ₹40 = ₹90,000/month of *modelled* confusion cost. That number is contestable (does every error reach a decision? weight it — say 30% reach decisions → ₹27,000), which is exactly why the sheet shows assumptions instead of hiding them.',
              code_snippet: 'F: 45,000 x 1.90 = 85,500/mo ; errors 4%   (1,800)\nM: 45,000 x 0.38 = 17,100/mo ; errors 9%   (4,050)  delta ~2,250/mo',
            },
            {
              title: 'Step 3 — decide with stated assumptions',
              desc: 'At full error weighting, F\'s ₹68,400 premium roughly cancels M\'s error delta (₹90,000 modelled) — closer than intuition suggested. At 30% weighting, M wins by ~₹41,000/month. Decision: run M for all digests *with* the citation-preserving prompt and an error canary (sample 200 summaries/month through claim-checks, 6.2) — and escalate to F automatically when claim-checks fail (a per-item cascade, 7.3) — capturing most of M\'s saving while bounding its error tail. Quality-per-rupee check: M = 91/0.38 ≈ 239 points per ₹100 vs F = 96/1.90 ≈ 50.',
            },
            {
              title: 'Step 4 — install guardrails and re-decision triggers',
              desc: 'Dashboard: cost/task, rolling claim-check pass rate, escalation share, monthly error-canary results — alerts on drift in either direction. Re-run the full sheet: quarterly, after any vendor price or model-version change, and if error-canary findings cross 6% (the point where the original arithmetic flips back toward F). Write the flip condition down now, while nobody is emotionally invested in the choice.',
            },
          ],
          solution:
            'Gate first (S eliminated at 82%), honest error-cost arithmetic with visible assumptions, then a hybrid decision: mid-tier default + claim-check cascade to frontier on failures — bounded error tail at ~80% of the saving, with dashboards and a pre-written flip condition so the decision re-decides itself when the numbers move.',
        },
        practice: {
          title: 'Run your own comparison sheet',
          prompt:
            'Take a task you use AI for. Run the same 10 prompts on two different models (or two tiers of one provider). Score both against a rubric you write before reading outputs. Retrieve real token usage and compute cost per task at current rates. Build the two-row sheet: quality, cost/task, cost per successful task, quality per ₹100. Write a three-sentence decision with one stated assumption — and one condition that would make you switch.',
          hint: 'If your rubric cannot separate the two outputs at all, your task may be quality-saturated: then the cheaper model is the honest winner.',
        },
        mistakes: [
          {
            mistake: 'Arguing quality without a shared golden set',
            fix: 'Different evals, different scores, no comparison. One frozen set, one scorer, same thresholds for every candidate — gates for safety/format before ratios.',
          },
          {
            mistake: 'Optimising the ratio past safety and policy gates',
            fix: 'Gates are pass/fail conditions on entry to the comparison. A failed gate removes the candidate; it never becomes a cheap-but-dangerous data point.',
          },
          {
            mistake: 'One-time model choice treated as permanent',
            fix: 'Prices, capability and your traffic all move. Re-run the sheet quarterly and on every vendor change; today\'s frontier point is often next quarter\'s dominated row.',
          },
          {
            mistake: 'Counting only API cost in the denominator',
            fix: 'Include retries, escalation, human review and estimated incident cost per bad output — cost per successful task is the number that reflects reality.',
          },
        ],
        exam: {
          question:
            'Define quality-per-rupee for an LLM feature. Explain how you would compare three models fairly, what the Pareto frontier tells you, and why safety cannot be part of the ratio.',
          answer:
            'Quality-per-rupee = a task-specific measured quality score divided by the real cost per task (from logged token usage at current rates), optionally expressed per ₹100 of spend. Fair comparison: define the task metric first (exact-match for closed tasks, claim-level faithfulness or rubric pass rate for open text), pin every candidate to the same frozen golden set with the same scorer, compute cost per *successful* task including retries and escalations, and record p95 latency and operational factors alongside. The Pareto frontier is the set of candidates not dominated — improving quality costs more or cutting cost loses quality — so any point below it is eliminated immediately; the frontier still usually leaves a genuine trade-off, which is settled by the business value of quality (what a wrong answer costs, priced against the price gap). Safety, compliance and format validity are gates, not numerator terms: a candidate failing a gate is excluded from the comparison entirely, otherwise a cheap unsafe model maximises the ratio while maximising risk. Finally, the sheet is dated: re-run it quarterly and on vendor price or model changes, because both axes move.',
          source: 'Model-selection and unit-economics question; pairs with Lesson 3.3\'s weighted rubric.',
        },
        summary: [
          'Quality is a task metric on one frozen golden set — never an adjective and never a vendor benchmark.',
          'Gates first (safety/format/policy), Pareto next, business arithmetic last: the ratio lives only inside the safe region.',
          'Cost per successful task includes retries, escalation, review and incident exposure — not just list-price tokens.',
          'High-volume/low-stakes favours small models; low-volume/high-stakes favours large + review; hybrids and cascades capture both.',
          'Date every decision: re-run the sheet quarterly and on any price, model or traffic change.',
        ],
      }),
      [
        [
          'Quality-per-rupee is computed as:',
          [
            'Model parameter count divided by price',
            'A measured task-quality score on a shared golden set divided by real cost per task',
            'Tokens per rupee',
            'User ratings divided by latency',
          ],
          1,
          'A ratio of like-for-like quality to unit cost — both terms must be measured on your own task.',
        ],
        [
          'On a quality-vs-cost plot, a candidate that is more expensive AND lower quality than another is:',
          [
            'Pareto optimal',
          'Dominated — eliminated from the comparison without further discussion',
            'The premium choice',
            'Unmeasurable',
          ],
          1,
          'The frontier contains only non-dominated points; dominated rows end the debate early.',
        ],
        [
          'Why must safety and policy compliance be treated as gates rather than terms in the quality ratio?',
          [
            'They are hard to measure',
            'Otherwise a cheap unsafe model can maximise the ratio while failing requirements — gates exclude candidates before any optimisation',
            'Ratios cannot accept multiple units',
            'They are covered by the licence',
          ],
          1,
          'Pass/fail conditions define the feasible set; optimisation happens only inside it.',
        ],
        [
          'The best response to a vendor announcing new pricing or a model-version change is to:',
          [
            'Wait for user complaints',
            'Re-run your comparison sheet and golden set — both cost and quality axes moved, so your dated decision may now be dominated',
            'Immediately switch everything',
            'Update nothing because your prompts are stable',
          ],
          1,
          'Decisions expire; the re-verification ritual (10.4) exists because both axes of this trade-off drift.',
        ],
      ]
    ),
  ],
};
