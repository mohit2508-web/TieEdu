// Module 3 — Model Families & Selection
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code } from '../nineBlocks';
import { lesson, M3, COURSE_ID } from './helpers';

export const module3: CourseModule = {
  id: M3,
  course_id: COURSE_ID,
  title: 'Module 3 — Model Families & Selection',
  summary:
    'Open weights vs frontier APIs in practical terms (license, hosting, control), parameter counts versus real capability and cost, context windows and their hidden quality tax, and a weighted decision framework you can run on any use case.',
  sort_order: 3,
  lessons: [
    lesson(
      M3,
      'gae-3-1',
      1,
      'Open vs Closed Weights: Llama, Mistral, Qwen, DeepSeek and the Frontier APIs',
      'What "open" really buys you, what an API-only model hides, and the three practical axes — hosting, cost shape, control — that decide deployments.',
      19,
      nineBlocks({
        objectives: [
          'Distinguish open weights, fully open-source releases, and API-only models, and cite one real license caveat for each open family',
          'Compare self-hosting and API access across deployment, data control, customisation, cost shape and ops burden',
          'Choose a deployment mode for three scenarios with different privacy, scale and team constraints',
          'State one operational risk of each option and a mitigation for each',
        ],
        hook:
          'Two headlines from the last few years, both true: an open-weight release reset expectations of what a freely downloadable model can do — labs from Meta (Llama), Mistral, Alibaba (Qwen) and DeepSeek shipping weights anyone can download — while the best *fully-tuned product experience* remained behind GPT-, Claude- and Gemini-class APIs. "Open vs closed" is not a morality play; it is a deployment decision with line items: license text, GPU bills, data boundaries, and who patches the model at 2 a.m.',
        concept: `**Three categories, not two.** (1) **API-only** (GPT, Claude, Gemini families): you get inference, never weights. You trade control for a maintained product — quality tuning, safety layers, and infra are the vendor's job. (2) **Open weights** (Llama, Mistral, Qwen, DeepSeek families): weights (and usually an inference stack) are downloadable; you run them yourself or via hosted endpoints. License terms vary per model — some under Apache 2.0 (permissive, commercial-friendly), others under custom community licenses with clauses (e.g. monthly-active-user thresholds triggering terms, or acceptable-use riders). (3) **Fully open-source** in the strict sense (weights + training code + data recipe) is rare at frontier scale; when vendors say "open", ask which of the three you actually got. As of 2026, licenses and line-ups move fast — always read the specific model's license before shipping, not a blog summary of the family.

**The three practical axes.** *Hosting*: open weights run on your GPUs, in your VPC, or on a specialist host (vLLM-style serving stacks make this routine); API-only means data leaves your boundary unless the vendor offers contractual zero-retention, residency controls, or enterprise data agreements — which many do, but you must verify per vendor and tier. *Cost shape*: APIs bill per token (OpEx scales with usage, zero idle cost); self-hosting bills per GPU-hour (cost exists whether or not you use it — so unit economics favour self-hosting at steady high volume, and APIs at spiky or low volume). *Control*: open weights can be fine-tuned (LoRA on your schema and jargon), quantised (smaller, cheaper serving), inspected for known behaviours, and pinned forever; APIs give you a moving product — better on average each quarter, but version drift, silent behaviour changes, rate limits and policy filters you do not control.

**Capability reality check (as of 2026, hedged).** The strongest *closed* models still tend to lead open-ended reasoning, very long context, and polished safety tuning; but open-weight gaps have narrowed sharply per generation, and on narrow, well-specified tasks a fine-tuned open model often *beats* a frontier API outright (Lesson 3.2). Mixture-of-experts (MoE) releases have muddied "open catches up" claims too: an open MoE can have huge total parameters but modest active compute per token, so raw parameter bragging rights mislead. The professional habit: stop asking "is open as good?" and start asking "is open good *enough on my eval set*, at *my volume*, under *my constraints*?"

**The ops tax nobody puts on the slide.** Self-hosting means: model selection, quantisation choice, a serving stack, autoscaling, monitoring, red-teaming your own fine-tune, upgrading when a better release lands — engineering time that an API bills you for invisibly inside the token price. Many teams end up hybrid: open weights for the high-volume, data-sensitive core of the product; frontier API for the long tail of hard requests (Lesson 3.4 makes this arithmetic explicit). That hybrid is not indecision — it is the two economic models used where each is strong.`,
        extras: [
          table(
            'Open weights vs API-only: the deployment view',
            ['Axis', 'Open weights (Llama/Mistral/Qwen/DeepSeek families)', 'API-only (GPT/Claude/Gemini families)'],
            [
              ['Data boundary', 'Stays inside your infra — strongest PII/residency story', 'Leaves your boundary; verify retention terms per vendor/tier'],
              ['Customisation', 'Fine-tune (LoRA), quantise, pin versions', 'Prompting, tools, maybe vendor-side fine-tuning APIs'],
              ['Cost shape', 'GPU-hours — fixed-ish, favours steady high volume', 'Per-token — variable, favours spiky/low volume'],
              ['Ops burden', 'You own serving, upgrades, monitoring, red-teaming', 'Vendor owns it; you own integration and policy compliance'],
              ['License caveat', 'Read the specific model — Apache 2.0 vs custom clauses', 'Terms of service; usage policies; no right to inspect'],
              ['Capability ceiling', 'Narrow tasks: often best-in-class after fine-tuning', 'Broad reasoning/safety polish usually leads per generation'],
            ],
          ),
          warn(
            '"Open weights" is not one license',
            'Permissive Apache-2.0 releases sit next to custom community licenses with user-count clauses and use restrictions. Compliance is a per-model due-diligence task: pull the LICENSE from the model repo, read it, record it.',
          ),
          tip(
            'Hybrid is a legitimate architecture',
            'Route by sensitivity and difficulty: private/high-volume flows to a self-hosted open model; hard, low-volume flows to a frontier API; keep a kill-switch to flip routing when a vendor changes terms or pricing.',
          ),
        ],
        worked: {
          title: 'Pick a deployment mode for three products',
          problem:
            'Choose self-hosted open weights, a frontier API, or hybrid for: (a) a hospital triage assistant processing patient notes (PII, unpredictable volume, small eng team); (b) a student essay-feedback tool (spiky evening peaks, near-zero PII, tight budget); (c) a legal research copilot (long documents, high reasoning bar, large steady document volume). Defend each in one line of constraint arithmetic.',
          steps: [
            {
              title: '(a) Hospital triage — constraint: PII cannot leave',
              desc: 'Hard filter eliminates naive API use: patient notes in a third-party prompt violate the strongest data-boundary requirement. Self-host a mid-size open model (quantised, on-prem/VPC). Volume is unpredictable, so carry the GPU idle-cost risk consciously; mitigate with autoscaling and a narrow task scope. If the vendor offers a compliant enterprise tier with contractual non-retention, an API becomes arguable — with legal sign-off, not marketing copy.',
            },
            {
              title: '(b) Essay tool — constraint: budget, spiky load',
              desc: 'Evenings spike, afternoons idle — exactly where per-token pricing beats owned GPUs (no idle billing). Start API-only at low temperature with strict output schemas. Revisit at ~10× volume: then a small self-hosted model (or batch API discounts) may undercut it. Decision driver: cost shape, not capability.',
            },
            {
              title: '(c) Legal copilot — constraint: quality bar + volume',
              desc: 'High reasoning bar initially favours a frontier API; high steady volume makes its per-token bill grow linearly. Hybrid: frontier API for hard multi-step analysis (10–20% of traffic), self-hosted larger open model for summarise/extract/route on the rest (80–90%). Evaluate quarterly — open releases move fast, and your own eval set (Lesson 3.4) decides when the open tier absorbs more traffic.',
            },
            {
              title: 'Generalise',
              desc: 'Order of operations: (1) hard constraints (privacy, residency, licensing) eliminate options; (2) volume shape picks the cost model; (3) your eval set picks the model; (4) team capacity prices the ops burden. Capability is only step 3 — teams that start there end up with impressive demos and unsupportable bills.',
            },
          ],
          solution:
            '(a) self-hosted open — PII boundary is a hard filter. (b) API — spiky volume prefers per-token economics. (c) hybrid — frontier for the hard tail, open for the high-volume core, with a quarterly re-evaluation cadence tied to an internal eval set.',
        },
        practice: {
          title: 'Read a license like an engineer',
          prompt:
            'Open the model card or repo of one open-weight family you use (Llama, Mistral, Qwen or DeepSeek). Find the actual license text and answer: (1) is it Apache-2.0-style or custom? (2) any user-count or use-restriction clauses? (3) can you fine-tune and serve commercially? Write a five-line internal memo recommending or blocking a commercial use, citing clauses — not headlines.',
          hint: 'The LICENSE file in the model repo is authoritative; blog posts about "open models" are not.',
        },
        mistakes: [
          {
            mistake: 'Treating open weights as "free"',
            fix: 'Weights cost zero; GPUs, serving engineering, safety evaluation and upgrades do not. Compare total cost of ownership against token bills, not against zero.',
          },
          {
            mistake: 'Assuming all open models share one license',
            fix: 'Apache-2.0, custom community licenses and research-only releases coexist in the same "open" bucket. Due diligence is per-model, per-version.',
          },
          {
            mistake: 'Concluding that an API-only model automatically protects your data',
            fix: 'Data governance is contractual: read retention terms, residency options and training-use clauses for your specific tier. Some enterprise tiers are strong; the default tiers may not be.',
          },
          {
            mistake: 'Deciding open vs closed on benchmark headlines alone',
            fix: 'Benchmarks measure population-level capability; your decision turns on your eval set, your volume, your constraints. Run your own numbers before committing.',
          },
        ],
        exam: {
          question:
            'Compare self-hosted open-weight models with API-only frontier models across deployment, cost structure, and customisation. Under which three conditions would you recommend self-hosting?',
          answer:
            'Deployment: open weights run inside your own infrastructure (or a chosen host), giving full control over data residency and network boundaries; API-only routes inputs through the vendor, requiring contractual data terms. Cost: self-hosting is GPU-hour OpEx with fixed idle cost — economical at steady high volume — while APIs are per-token, economical at low or spiky volume with no ops burden. Customisation: open weights can be fine-tuned, quantised and version-pinned; APIs offer prompting and vendor-managed improvements but silent version drift and policy limits. Recommend self-hosting when: (1) data-boundary requirements (PII, residency, secrecy) cannot be met by any available API tier; (2) sustained high volume makes token pricing strictly more expensive than GPU amortisation; and (3) the team has (or will build) the serving and evaluation capability to own the stack — or the task is narrow enough that a fine-tuned small open model beats a frontier call on your own evals.',
          source: 'Standard system-design discussion for GenAI product roles: "build vs buy vs hybrid".',
        },
        summary: [
          'Three buckets: API-only, open weights (per-model licenses), truly fully-open releases — always read the specific license.',
          'Self-hosting buys data control, fine-tuning and version pinning at the price of an ops tax and idle GPU cost.',
          'APIs buy a maintained product with zero idle cost at the price of data egress, per-token bills and version drift.',
          'Decision order: hard constraints → volume shape → your eval set → team capacity. Capability benchmarks are step three, not one.',
          'Hybrid routing — open for the high-volume core, frontier for the hard tail — is a normal, defensible architecture.',
        ],
      }),
      [
        [
          'The most accurate description of "open weights" is:',
          [
            'Fully open source including training data and code in every case',
            'Model weights are downloadable and runnable, under licenses that vary from permissive (e.g. Apache-2.0-style) to custom community terms',
            'A marketing term with no licensing implications',
            'Models that are free of any usage restrictions',
          ],
          1,
          'Weights availability is the constant; license terms are the variable that must be read per model.',
        ],
        [
          'The strongest technical argument for self-hosting an open model is:',
          [
            'It is always cheaper than any API',
            'Input data never leaves your infrastructure — the strongest data-boundary control',
            'Open models never hallucinate',
            'No GPUs are required',
          ],
          1,
          'Privacy and residency are where self-hosting dominates; cost only wins at high steady volume.',
        ],
        [
          'Per-token API pricing is generally preferable when your traffic is:',
          [
            'Steady and very high volume, 24/7',
            'Low or spiky, so you would otherwise pay for idle GPUs',
            'Exactly zero after the pilot',
            'Classified',
          ],
          1,
          'You pay only for usage — the economics flip only when sustained utilisation amortises owned hardware below the token bill.',
        ],
        [
          'A hybrid architecture typically routes:',
          [
            'All traffic to the cheapest model always',
            'High-volume and data-sensitive flows to a self-hosted open model; hard, low-volume flows to a frontier API',
            'Only English to the API and other languages to open models',
            'Training traffic to open and inference to closed, always',
          ],
          1,
          'Each side serves where its economics and strengths are real: control/volume on one side, broad capability on the other.',
        ],
      ]
    ),
    lesson(
      M3,
      'gae-3-2',
      2,
      'Parameters, Capability and Cost: When a Small Model Wins',
      'What parameter count does and does not tell you, the real arithmetic of API bills versus GPU hours, and the five situations where a 7B-class model beats a frontier call.',
      18,
      nineBlocks({
        objectives: [
          'Explain the capability–parameter relationship including the MoE nuance (total vs active parameters)',
          'Compute monthly cost of an API extraction pipeline from token counts and published rates',
          'Name five conditions under which a small fine-tuned model outperforms a frontier API on a task',
          'Design a two-tier routing policy for a high-volume product and estimate its blended cost',
        ],
        hook:
          'A structured-extraction pipeline at a fintech: five fields out of a vendor invoice, 50,000 invoices a day, no prose required. The team compared a 7B-class open model fine-tuned on 800 of their own examples against a frontier API call on the same held-out set. Quality: 96.1% field-level accuracy vs 96.8% — a tie that would not survive contact with the invoice volume. Cost: one GPU versus a bill that scaled with every document. Parameter count never appeared in either result. This lesson is about the numbers that actually decide.',
        concept: `**What parameter count is (and is not).** Parameters are the learned weights — capacity for storing patterns. In the dense-model era, more parameters generally meant more capability per generation, driven by scaling laws (capability improves smoothly with scale, given enough data and compute). But "generally" hides everything that matters for your decision: (1) **Capability on your task** depends on data mix, post-training and context support — a smaller model fine-tuned on your schema can beat a frontier model zero-shot on exactly that schema. (2) **Mixture-of-Experts (MoE)** models — common in open releases like DeepSeek-V3-class and Mixtral-class lineages — route each token through only a subset of experts: total parameters might be in the hundreds of billions while *active* parameters per token are far lower. The lesson: total parameters are a rough capacity proxy, active parameters and tokens-per-second are closer to cost, and neither is a capability certificate.

**The cost arithmetic, done twice.** APIs: bill = input tokens × input rate + output tokens × output rate (per million tokens; output typically 3–5× input because decoding is sequential). Self-hosting: bill = GPU-hours × rate, where GPU-hours = wall-clock time — which depends on throughput (tokens/sec at your batch size) and utilisation. The crossover: at low volume, API wins because idle GPUs are pure loss; at high steady volume, one well-utilised GPU can undercut an API bill by an order of magnitude. Everything in between needs your spreadsheet, not intuition. Hidden API levers: batch discounts (async processing at half-price tiers is common), prompt caching (repeat prefixes billed cheaper), and model-tier routing (use the smallest model that passes your eval). Hidden self-hosting levers: quantisation (4/8-bit weights shrink memory and raise throughput), continuous batching, and distillation (a small model trained on a big model\'s outputs — the R1-era distill wave showed how far this carries).

**When the small model wins — the five conditions.** (1) *Narrow, well-specified output*: extraction into a fixed schema, classification, rewriting to a house style — tasks where behaviour is learnable from hundreds of examples. (2) *High volume*: unit cost multiplies everything. (3) *Latency sensitivity*: small models hit first-token targets a frontier call cannot. (4) *Data sensitivity*: on-prem weights keep inputs inside. (5) *Determinism/maintenance*: a pinned quantised model behaves the same next quarter; a frontier endpoint might not. When the small model *loses*: open-ended reasoning, rare languages, long messy contexts, agentic multi-step work — anything where generality is the point. The professional skill is not picking a side; it is classifying your workloads into these two bins and refusing to use one model for both.`,
        extras: [
          code(
            `# 50,000 invoices/day, 800 in / 150 out tokens each
docs_per_day = 50_000
in_tok, out_tok = 800, 150

# Option A: frontier API, $3 in / $15 out per 1M tokens
per_doc = in_tok / 1e6 * 3 + out_tok / 1e6 * 15   # $0.00465
print(round(per_doc * docs_per_day, 2))            # $232.50 / day
print(round(per_doc * docs_per_day * 30, 0))       # ~$6,975 / month

# Option B: 7B-class model, one rented GPU @ $1.20/hr, 24/7
print(round(1.20 * 24 * 30, 0))                    # $864 / month
# -> ~8x cheaper, if one GPU really sustains the throughput`,
            'cost_crossover.py',
            'python'
          ),
          table(
            'Small model vs frontier API: pick by workload, not by brand',
            ['Workload trait', 'Favours small fine-tuned open model', 'Favours frontier API'],
            [
              ['Output shape', 'Fixed schema, short answers', 'Open-ended analysis, long-form'],
              ['Volume', 'High and steady', 'Low or spiky'],
              ['Latency budget', 'Tens of ms–low seconds, p95 critical', 'Seconds acceptable'],
              ['Data', 'PII / secrecy / residency', 'Public or contractually covered'],
              ['Change cadence', 'Pinned behaviour preferred', 'Happy to inherit vendor improvements'],
              ['Language/edge cases', 'In-distribution only', 'Long tail of rare cases'],
            ],
          ),
          tip(
            'Route before you retrain',
            'Cheapest high-leverage move in most products: classify each request, send the easy majority to a small model, escalate the hard minority to a frontier API. You often cut 60–80% of cost without touching quality on the hard cases.',
          ),
        ],
        worked: {
          title: 'Run the crossover math, then design a two-tier router',
          problem:
            'Extraction pipeline: 50,000 docs/day, 800 input + 150 output tokens each. Frontier API: $3/$15 per 1M tokens. Self-hosted 7B: one GPU at $1.20/hr running 24/7, throughput measured at 1,200 docs/hour at target quality. (1) Compute both monthly costs. (2) Does the GPU keep up? (3) Design a hybrid routing policy if the small model passes only 90% of docs with the rest needing escalation, priced at the same API rates, and compute the blended monthly cost.',
          steps: [
            {
              title: 'Step 1 — API monthly cost',
              desc: 'Per doc: 800/1e6 × $3 = $0.0024 (input) + 150/1e6 × $15 = $0.00225 (output) = $0.00465. Daily: 50,000 × 0.00465 = $232.50. Monthly (30 days): ≈ $6,975.',
              code_snippet: '0.0024 + 0.00225 = $0.00465/doc\n$0.00465 * 50000 * 30 = $6,975',
            },
            {
              title: 'Step 2 — GPU throughput and cost',
              desc: 'Capacity: 1,200 docs/hr × 24 hr = 28,800 docs/day < 50,000 needed — one GPU is NOT enough; you need two (57,600/day headroom ok) or better batching. Cost at two GPUs: 2 × $1.20 × 720 hr = $1,728/month. Still ~4× cheaper than pure API.',
              code_snippet: '2 GPUs: 2 * 1.20 * 24 * 30 = $1,728/mo',
            },
            {
              title: 'Step 3 — hybrid routing arithmetic',
              desc: 'Route 90% (45,000/day) to ONE GPU — which now handles 45,000/24 = 1,875/hr needed… still above 1,200/hr. Recalibrate: with quality-90% routing, accept the small model at slightly relaxed threshold or add batching optimisation; assume routing pushes small-model load to 45k/day after tuning throughput to 2,000/hr (one GPU). Escalate 10% (5,000/day) to API at $0.00465: 5,000 × 0.00465 × 30 = $697.50.',
            },
            {
              title: 'Step 4 — blended total and the decision rule',
              desc: 'Hybrid ≈ $698 (API tail) + $864 (one GPU) = $1,562/month vs $6,975 pure API — a ~77% cut, with frontier quality reserved for the hard 10%. Decision rule: pure API below ~5k docs/day; hybrid in the middle; full self-host when the hard tail is tiny and throughput is proven.',
            },
          ],
          solution:
            'Pure API ≈ $6,975/mo; honest GPU sizing needs two cards ($1,728) at the measured throughput; the tuned hybrid (90/10 with throughput validated) lands ≈ $1,562/mo. The lesson is not "open always wins" — it is that quality parity on narrow tasks plus volume arithmetic decides before ideology enters the room.',
        },
        practice: {
          title: 'Price your own workflow',
          prompt:
            'Pick one AI task you run repeatedly (summarise lecture notes, generate flashcards, classify emails). Measure or estimate its token counts per run, multiply by your monthly volume, and price it at two API tiers (e.g. a small model and a frontier model). Then estimate what one GPU-hour could do instead (rough tokens/sec × 3600). Write three sentences on where you sit on the crossover curve — and what would move you across it.',
          hint: 'Include output tokens — they cost several times input, and people consistently forget the reply in their bill estimates.',
        },
        mistakes: [
          {
            mistake: 'Reading parameter count as a capability ranking',
            fix: 'Data mix, post-training, context and MoE routing all intervene. Measure your task on your eval set; treat parameters as a weak prior about capacity and cost.',
          },
          {
            mistake: 'Assuming self-hosting is free because the weights are free',
            fix: 'GPUs, serving, upgrades and engineering time are the real bill. Compare GPU-hour amortisation against the token bill at YOUR utilisation — idle GPUs are pure loss.',
          },
          {
            mistake: 'Comparing API and open models on different quality bars',
            fix: 'Same held-out set, same scoring script, same output schema — otherwise the comparison measures your prompting luck, not the models.',
          },
          {
            mistake: 'Ignoring MoE active-parameter economics',
            fix: 'A huge-total-parameter MoE can be cheap per token (few experts active). Cost scales with active compute and tokens/sec — not with the parameter count on the model card.',
          },
        ],
        exam: {
          question:
            'Under what conditions would you recommend a 7B-class open model over a frontier API call for a production task? Justify with both quality and cost arguments.',
          answer:
            'When the task is narrow and well-specified — fixed-schema extraction, classification, style rewriting — a 7B model fine-tuned (e.g. LoRA) on a few hundred to a few thousand task examples can match or exceed a zero-shot frontier model on that exact distribution, because fine-tuning adapts format, vocabulary and edge cases directly. Cost then decides decisively at volume: one GPU amortises to a fraction of a per-token API bill for millions of daily calls, while also delivering lower and more stable latency, version pinning, and full data locality (inputs never leave your infrastructure). The recommendation flips when the task needs open-ended reasoning, long messy contexts, rare languages, or frequent distribution shifts — cases where the frontier model\'s breadth is exactly what you are paying for. The defensible engineering answer is therefore: validate on a shared eval set first, then route — small model for the in-distribution majority, frontier API for the hard tail.',
          source: 'Frequent ML-engineering interview: "when is a small model enough?"',
        },
        summary: [
          'Parameter count is a weak capacity prior — task fit comes from data, post-training and your own eval set; MoE adds a total-vs-active-parameters split.',
          'API cost = input tokens × in-rate + output tokens × out-rate; self-host cost = GPU-hours × rate — the crossover is pure arithmetic at your volume.',
          'Small fine-tuned models win on five conditions: narrow output, high volume, latency pressure, data sensitivity, pinned behaviour.',
          'Small models lose where generality is the point: open-ended reasoning, long tail cases, agentic work.',
          'Two-tier routing (small for the majority, frontier for the hard tail) is the default cost engineering move — measure, then cut.',
        ],
      }),
      [
        [
          'In a Mixture-of-Experts model, the parameter count most relevant to per-token compute is the:',
          [
            'Total parameter count across all experts',
            'Active parameters routed for that token',
            'Embedding parameter count alone',
            'The context window size',
          ],
          1,
          'Each token visits only a subset of experts — active parameters track compute better than the headline total.',
        ],
        [
          'API input and output token prices differ mainly because:',
          [
            'Output tokens are longer words',
            'Output generation is sequential decoding — slower and more compute-bound per token than prompt processing',
            'Providers round output up',
            'Input is encrypted',
          ],
          1,
          'Prefill parallelises over the prompt; decoding produces one token at a time — hence output rates typically run 3–5× input rates.',
        ],
        [
          'A 7B fine-tuned model beats a frontier API most plausibly on:',
          [
            'An open-ended research essay spanning fifty sources',
            'Five-field invoice extraction at 50,000 docs/day with 800 training examples',
            'A one-off legal analysis with rare-language documents',
            'An agentic multi-step planning task',
          ],
          1,
          'Narrow schema + high volume + task examples is exactly the small-model sweet spot.',
        ],
        [
          'At low, spiky volume, the API is usually cheaper than self-hosting because:',
          [
            'APIs are always cheaper',
            'Self-hosted GPUs bill by the hour whether idle or not, while APIs bill only for tokens used',
            'Open models consume more electricity',
            'APIs include free fine-tuning',
          ],
          1,
          'Idle-capacity economics — the fixed cost of owned hardware dominates until utilisation is high and steady.',
        ],
      ]
    ),
    lesson(
      M3,
      'gae-3-3',
      3,
      'Context Windows and Long-Context Tradeoffs',
      'A million tokens of context is not a million tokens of comprehension: cost curves, latency physics, lost-in-the-middle, and when retrieval still wins.',
      18,
      nineBlocks({
        objectives: [
          'Compute the token fit and full-dump cost of a document collection against a given window and rate',
          'Explain lost-in-the-middle and at least one other quality degradation in long contexts',
          'Distinguish prefill and decode cost growth with sequence length',
          'Design a long-document workflow that beats naive full-dump on cost and quality, with numbers',
        ],
        hook:
          'The window race made "just paste it all" feel like an architecture. Vendor pages advertised windows that swallow entire codebases and bookshelves — 200k tokens, then 1M and beyond (figures as of 2026, still moving). Then evaluation kept finding the same humbling pattern: a fact planted in the middle of a very long document gets retrieved *less reliably* than the same fact at the top or the bottom. Fitting is not using. This lesson prices the window, taxes its length, and shows when retrieval still wins.',
        concept: `**What the window is.** The context window is the maximum tokens the model can attend over in one pass: system prompt + history + your pasted files + the tokens it is generating right now. Two budgets govern every call: *input* tokens (you pay per token, usually parallelised as prefill) and *output* tokens (capped separately by providers, priced higher — a "1M context" model may still only emit a few thousand tokens per turn). Estimation discipline from the token lessons applies: convert documents to token estimates before promising anything.

**The cost and latency curves.** Money: input cost scales linearly with prompt length — a full 250k-token dump at $2/M is half a dollar *per query*, which becomes serious at production volume. Latency has two regimes: **prefill** (processing your prompt — parallel, but total work grows with input length, so TTFT rises) and **decode** (per-token generation — each new token attends over the entire cached context, so per-token cost creeps upward as the sequence fills; the KV cache from Lesson 2.4 is the memory bottleneck). Servers feel both: long-context requests consume disproportionate memory per request, so providers throttle concurrency or price long-context tiers higher. Rule of thumb to carry: **quadratic-ish prefill growth, linear per-token attention growth, linear-in-length KV memory — per request.**

**The quality tax.** Long context degrades usefully-invisible ways: (1) *lost-in-the-middle* — retrieval accuracy for facts positioned mid-context dips; put critical instructions or evidence at the start or end (primacy/recency). (2) *Distraction* — irrelevant filler is not neutral: it competes for attention and measurably hurts reasoning on multi-hop questions. (3) *Instruction drift* — in very long chat histories, early constraints fade against later conversational pressure. (4) *Needle-test complacency* — "99% needle recall" benchmarks measure single-fact lookup, not multi-document synthesis; do not extrapolate. The research picture as of 2026: long-context capability keeps improving, position bias softens, but attention dilution has not vanished — treat long context as a workspace with a quality budget, not a warehouse.

**The decision: dump vs retrieve.** Full-dump wins when: documents are few, genuinely all relevant, and queried once or twice (a one-shot legal review of a short contract set). Retrieval (RAG) wins when: corpus is large, queries are many, per-query cost matters, or precision requires showing the model only evidence — retrieval *focuses* attention, which doubles as a quality intervention. A third option increasingly matters: **long-context + map-reduce summarisation** — chunk-level passes feeding a synthesis pass — for whole-corpus tasks where no single excerpt suffices. The architecture conversation is no longer "window or RAG"; it is "how much context per call, chosen deliberately, with numbers attached".`,
        extras: [
          code(
            `# Long-doc arithmetic (illustrative rates)
pages, words_per_page = 400, 500
tokens = pages * words_per_page * 4 / 3      # ~266,667 tokens
print("fits 200k window:", tokens <= 200_000)  # False
print("full dump @ $2/M:", round(tokens / 1e6 * 2, 2))   # ~$0.53 / query
print("top-10 chunks (8k) @ $2/M:", round(8_000 / 1e6 * 2, 3))  # ~$0.016
# 20 queries/day * 30 days: dump=$318/mo vs retrieve=$9.6/mo`,
            'longctx_cost.py',
            'python'
          ),
          table(
            'Where key content lives, and what to do about it',
            ['Position in context', 'Relative reliability', 'Practical move'],
            [
              ['Start (system + top)', 'High — primacy effect', 'Durable instructions, ground rules'],
              ['Middle', 'Lowest — lost-in-the-middle', 'Avoid burying critical evidence; compress or retrieve instead'],
              ['End (near the query)', 'High — recency effect', 'Restate the task and key constraints just before the ask'],
            ],
          ),
          warn(
            'Needle tests measure lookup, not reasoning',
            '"Finds a planted fact at 128k" does not mean "synthesises 40 documents reliably". Evaluate long context on tasks shaped like yours: multi-hop, conflicting-evidence, numeric aggregation.',
          ),
          tip(
            'Place instructions twice',
            'In very long contexts, put hard constraints in the system prompt AND restate them right before the query. Cheap insurance against drift — two placements, one instruction.',
          ),
        ],
        worked: {
          title: 'Pick an architecture for a 400-page contract corpus with 20 questions a day',
          problem:
            'Legal team: 400 pages (~500 words/page), asked ~20 reviewer questions daily. Options: (A) full-dump into a 1M-token window at $2/M input; (B) retrieve top-10 chunks (~8k tokens) per question, same rate; (C) map-reduce whole-corpus summary once/day + targeted retrieval. Compare monthly cost and argue quality. Word-to-token: ×4/3.',
          steps: [
            {
              title: 'Step 1 — size the corpus',
              desc: '400 × 500 = 200,000 words × 4/3 ≈ 266,667 tokens. Fits a 1M window; does NOT fit a 200k window. Check before choosing anything else.',
              code_snippet: '200000 * 4 / 3 = 266,667 tokens',
            },
            {
              title: 'Step 2 — cost option A (full dump, 20×/day)',
              desc: '266,667 tokens × $2/M = $0.533 per query. × 20 queries × 30 days = $320/month — plus long TTFT on every call and the lost-in-the-middle risk across 266k tokens of clauses.',
              code_snippet: '0.533 * 20 * 30 = $320 / month',
            },
            {
              title: 'Step 3 — cost options B and C',
              desc: 'B: 8,000 tokens × $2/M = $0.016/query → 0.016 × 20 × 30 = $9.60/month (embedding + index amortised separately). C: one 266k map-reduce pass/day ≈ $0.53 × 30 = $16/month, plus B\'s per-query cost ≈ $26/month total — and the summary pre-compresses context, improving mid-corpus questions.',
            },
            {
              title: 'Step 4 — decide on quality, not just price',
              desc: 'A is fine for one-off reviews of short sets; at 20 questions/day over 266k tokens it pays a quality tax (position bias, distraction) and a latency tax. Choose C+B hybrid: daily structured summary for coverage, retrieval for precision, and escalate to A-style wide context only when a question genuinely spans the corpus (rare — budget for it explicitly).',
            },
          ],
          solution:
            'Sizes: 266,667 tokens (misses 200k, fits 1M). Costs: A ≈ $320/mo, B ≈ $10/mo, C+B ≈ $26/mo. Decision: hybrid map-reduce + retrieval — 97% cheaper than full-dump at 20 queries/day and it *focuses* attention, attacking the quality problem with the same move that solves the cost problem.',
        },
        practice: {
          title: 'Run your own mini needle test',
          prompt:
            'Take any long document (a textbook chapter, a legal PDF). Plant or select three facts: one in the first quarter, one mid-way, one near the end. Using a long-context assistant, ask for each fact in separate turns, with the full document attached. Record whether it is found and how confidently. Then repeat with the document chunked and only the relevant section supplied. Write three sentences on what the comparison says about your retrieval habit.',
          hint: 'Vary the position deliberately — the middle failure is subtle because the model often answers confidently even when wrong.',
        },
        mistakes: [
          {
            mistake: 'Equating window size with comprehension',
            fix: 'Attention dilutes over length; needle recall ≠ synthesis. Long context is capacity with a quality budget — validate on multi-hop tasks shaped like yours.',
          },
          {
            mistake: 'Ignoring output-token caps when promising "the model reads the whole file"',
            fix: 'Providers cap completion length separately from window size. "1M in, 8k out" changes what one turn can accomplish — plan multi-turn or map-reduce accordingly.',
          },
          {
            mistake: 'Burying critical constraints mid-context',
            fix: 'Lost-in-the-middle is real and positional: system prompt for durable rules, restatement near the query for the current ask.',
          },
          {
            mistake: 'Choosing full-dump because "RAG adds complexity"',
            fix: 'Complexity is a cost, not an argument. At production volume, dump pays 20–100× more per query and degrades quality — measure both before buying simplicity.',
          },
        ],
        exam: {
          question:
            'Explain "lost-in-the-middle" in long-context models and its practical implication for how documents and instructions should be arranged in a prompt.',
          answer:
            'Long-context evaluations consistently show that information placed in the middle of a very long context is retrieved and used less reliably than the same information at the beginning or the end — a U-shaped position curve attributed to attention competition and training-data position statistics (recency and primacy effects). Practical implications: (1) put durable instructions and ground rules in the system prompt at the top; (2) restate the current task and key constraints immediately before the query at the bottom; (3) avoid burying critical evidence mid-document — either extract and place it near the query, or retrieve the relevant chunk instead of full-dumping; (4) when synthesising long corpora, use hierarchical summarisation or retrieval to shorten what the model attends over. Long-context models improve year over year, but as of 2026 position effects remain measurable — arrangement is a cheap, reliable quality lever that teams routinely skip.',
          source: 'Widely discussed long-context evaluation finding; standard applied-LLM interview topic.',
        },
        summary: [
          'The window counts prompt + history + generation; output caps are separate and priced higher.',
          'Costs: input linear in length; prefill time grows with prompt size; per-token decode attention and KV memory grow with sequence length.',
          'Quality degrades with length: lost-in-the-middle, distraction, instruction drift — needle tests over-promise.',
          'Dump vs retrieve is arithmetic: at volume, retrieval (or map-reduce + retrieval) wins on cost AND often on quality by focusing attention.',
          'Place instructions top and restated bottom; treat long context as a budgeted workspace, not a warehouse.',
        ],
      }),
      [
        [
          'A "1M-token context window" does NOT imply that:',
          [
            'You can send that much input in one request',
            'The model will use every part of it equally well',
            'The output can also be 1M tokens',
            'Input cost scales roughly linearly with prompt length',
          ],
          2,
          'Output limits are separate; quality is also non-uniform across positions — capacity is not comprehension.',
        ],
        [
          '"Lost-in-the-middle" refers to the finding that in long contexts:',
          [
            'Models forget their training after mid-generation',
            'Facts positioned in the middle are used less reliably than facts at the start or end',
            'Middle tokens cost twice as much',
            'Attention is disabled for middle positions',
          ],
          1,
          'A U-shaped position curve — retrieval reliability dips mid-context.',
        ],
        [
          'Asking a long question with many irrelevant paragraphs attached typically:',
          [
            'Improves accuracy by giving more evidence',
            'Can degrade accuracy — irrelevant context competes for attention and dilutes focus',
            'Has no effect on cost',
            'Reduces latency because prefill parallelises',
          ],
          1,
          'More context is not neutral: distraction and dilution are measurable quality costs.',
        ],
        [
          'For 20 daily questions over a 266k-token corpus, the approach that usually wins on cost AND quality is:',
          [
            'Full-dump into a 1M window every query',
            'Retrieval of the relevant ~8k tokens per query, optionally plus a pre-computed whole-corpus summary',
            'Splitting the corpus into 50 chat sessions',
            'Raising temperature to handle the length',
          ],
          1,
          'Focused context cuts cost by orders of magnitude and improves reliability by reducing dilution and position effects.',
        ],
      ]
    ),
    lesson(
      M3,
      'gae-3-4',
      4,
      'A Model Selection Framework with a Worked Comparison',
      'Turn "which model should we use?" into arithmetic: hard filters, a weighted rubric, a sensitivity check, and a decision that survives contact with production.',
      19,
      nineBlocks({
        objectives: [
          'Structure a model decision: define the task and metric, apply hard constraints, shortlist, evaluate, weight, and sense-check',
          'Compute weighted rubric totals for four candidates and run a weights-sensitivity re-check',
          'Identify the three most common model-selection anti-patterns and their consequences',
          'Write a one-paragraph model recommendation including monitoring and a rollback plan',
        ],
        hook:
          'A team spends six weeks "evaluating models": someone screenshots a leaderboard, someone else demos a shiny reply at a conference, and a third argues from a tweet about benchmarks. Then the invoice arrives. Model selection fails not because people are careless but because it is done without a rubric — so every bias (recency, brand, the demo that felt magical) fills the vacuum. This lesson replaces that vacuum with a spreadsheet you can defend in a design review.',
        concept: `**The process, in order.** (1) **Define the task and its success metric** before looking at any model: what output, scored how, on what golden set of 50–200 real examples with labels or rubrics? (2) **Hard constraints as filters**: data residency, required modality, context length, latency ceiling, budget ceiling, license compatibility. Anything failing a hard filter is out — no matter its benchmark. (3) **Shortlist 3–4 candidates** spanning categories (frontier API, mid-tier API, self-hosted open, hybrid) — shortlists of two systematically under-explore. (4) **Run the same eval set** with the same harness: identical prompts, identical scoring, ideally blind pairwise judging where possible. (5) **Score a weighted rubric** — criteria with weights that reflect *your* product, not the field\'s fashions. (6) **Sense-check**: rerun with perturbed prompts, check failure modes, estimate cost at real volume, then decide. (7) **Revisit quarterly**: the field moves; your decision needs an expiry date.

**Criteria that earn their place.** *Quality on your eval* (typically 30–50% weight): the only quality number that matters is the one you measured. *Unit cost at volume* (15–25%): from the Lesson 3.2 arithmetic, blended across routing. *p95 latency* (10–15%): users feel the tail, not the mean. *Data and compliance* (10–20%): boundary requirements, contractual terms, audit needs. *Ops and maintainability* (5–15%): who pages at 3 a.m., version drift risk, upgrade cadence. Optional additions where relevant: tool-calling reliability, structured-output adherence, ecosystem fit. Weights are a *stakeholder negotiation made numeric* — write them down, and change them only on record.

**The three anti-patterns.** *Leaderboard worship*: public benchmarks are contaminated-prone, saturating, and orthogonal to your domain — cite them only as sanity checks. *Vibe demos*: one beautiful response tells you about sampling luck, not tail behaviour — your golden set exists precisely to kill this. *Forgetting ops and drift*: a model decision is a maintenance commitment; models deprecate, prices change, and "pin the version" must appear in the plan. One more discipline: **version-pin everything** you evaluate — model ids, parameters, prompt text — or your comparison is not reproducible next month.

**The deliverable.** The output of a selection process is a short written artifact: problem statement, hard filters, rubric with weights, scores with evidence links, sensitivity note, recommendation, monitoring metrics (quality proxy, cost/day, p95 latency, refusal/escalation rate), and the rollback path (previous model id + config, flip on alert). This document is what makes the decision survive staff turnover — and what makes the quarterly re-run trivial.

**Building the golden set without kidding yourself.** Sample real inputs from production logs or realistic archives, not from the team\'s imagination; include the ugly tail (empty fields, mixed languages, adversarial phrasings) at its true-ish proportion plus an oversampled slice so it is measurable at all. Label with the rubric you will actually ship — and freeze it: silently changing the rubric between model runs invalidates every comparison. When labels are expensive, prefer *pairwise* judgements between two model outputs over absolute scores; humans compare more reliably than they grade. And keep a small canary slice that never changes across quarters, so you can prove your harness still measures what it measured last time. A golden set is a product asset with versioning, ownership and a changelog — not a folder of demos.`,
        extras: [
          table(
            'Rubric criteria: measure, weight, trap',
            ['Criterion', 'How to measure', 'Common trap'],
            [
              ['Quality on your task', 'Golden set score (exact/LLM-judge/rubric)', 'Substituting public benchmarks for your domain'],
              ['Unit cost at volume', 'Token math × monthly volume (+ GPU math if self-hosted)', 'Comparing list prices without quality parity'],
              ['p95 latency', 'Timed eval harness under load', 'Optimising the mean while p95 falls apart'],
              ['Data/compliance', 'Contract terms, residency, audit trail', 'Assuming defaults instead of reading terms'],
              ['Ops burden', 'Engineering hours/month estimate', 'Treating "no infra" as free while version drift bites'],
            ],
          ),
          tip(
            'Blind pairwise judging stretches small eval sets',
            'With 100 examples, anonymous A/B comparisons between two models often discriminate faster than absolute scoring — and it debiases the evaluator against brand names.',
          ),
          info(
            'Pin versions or reproduce nothing',
            'Frontier endpoints change under you. Record full model ids, parameter values and prompt hashes; when a vendor deprecates a version, treat the re-evaluation as scheduled work, not an incident.',
          ),
        ],
        worked: {
          title: 'Score four candidates with a weighted rubric — then flip the winner by moving one weight',
          problem:
            'Customer-support assistant: classify and draft replies for tickets (PII-heavy, ~200k tickets/month, p95 target 4 s). Candidates: A = frontier API; B = self-hosted 8B fine-tuned; C = self-hosted 70B; D = hybrid (B default, A for escalated 15%). Scores (1–10) and weights: quality 40%, unit cost 20%, p95 latency 15%, compliance 15%, ops 10%. Compute totals; then re-run with quality at 50% (other weights rescaled proportionally) and decide.',
          steps: [
            {
              title: 'Step 1 — hard filters first',
              desc: 'PII: any API candidate needs contractual non-retention; assume A and D qualify only with enterprise terms (flag as a dependency). Latency 4 s: all pass at p95 on paper. Budget ceiling: set at $4k/month — C at this volume likely fails on cost/ops; keep it scored for transparency.',
            },
            {
              title: 'Step 2 — the rubric table',
              desc: 'A: [9.0, 4.0, 7.0, 6.0, 9.0]. B: [7.5, 9.5, 9.0, 9.5, 5.0]. C: [8.5, 6.0, 6.5, 9.5, 3.5]. D: [8.5, 8.5, 8.0, 8.5, 4.5]. (Scores from your eval harness, not opinions — placeholders here for arithmetic.)',
              code_snippet: 'weights = [0.40, 0.20, 0.15, 0.15, 0.10]',
            },
            {
              title: 'Step 3 — weighted totals',
              desc: 'A = 3.60+0.80+1.05+0.90+0.90 = 7.25. B = 3.00+1.90+1.35+1.43+0.50 = 8.18. C = 3.40+1.20+0.98+1.43+0.35 = 7.35. D = 3.40+1.70+1.20+1.28+0.45 = 8.03. Winner at these weights: B (8.18), D a close second.',
              code_snippet: 'B: 8.18   D: 8.03   C: 7.35   A: 7.25',
            },
            {
              title: 'Step 4 — sensitivity check flips the call',
              desc: 'Raise quality weight to 50% (others ×0.8 effectively: cost .20, latency .10, compliance .10, ops .10): A = 7.50, B = 8.00, C = 7.40, D = 8.05 — D now wins. Interpretation: the decision hinges on how much you pay for the last 10 points of quality. Take it to stakeholders with both numbers; pick D (hybrid) as the robust default — it wins the sensitivity case and stays within 0.2 of B in the cost-weighted case.',
            },
          ],
          solution:
            'Base weights: B 8.18 > D 8.03 > C 7.35 > A 7.25. Quality-heavy weights: D 8.05 > B 8.00 > A 7.50 > C 7.40. The honest conclusion is not "B" or "D" — it is "the weights decide; stakeholders must own the weights". Recommendation: ship D, instrument escalation rate and quality proxy, re-run the rubric next quarter.',
        },
        practice: {
          title: 'Run the framework on something you own',
          prompt:
            'Choose one AI feature you could build (summariser, flashcard generator, code reviewer). Write: task + golden-set plan (10 example items sketched), three hard filters, five rubric criteria with weights summing to 100%, three candidate models, and the table you would fill from your eval harness. You do not need to run models to complete this — the skeleton is the deliverable.',
          hint: 'If you cannot name your quality metric in one sentence, you are not ready to compare models — fix the metric first.',
        },
        mistakes: [
          {
            mistake: 'Starting from a leaderboard instead of a golden set',
            fix: 'Public benchmarks are contaminated, saturating and domain-mismatched. Cite them as context; decide on your own eval with your own scoring.',
          },
          {
            mistake: 'Scoring on a handful of vibe demos',
            fix: 'Sampling luck flatters every model. 50–200 real examples with a rubric or pairwise judging is the minimum instrument that sees tail behaviour.',
          },
          {
            mistake: 'Leaving ops burden and version drift out of the rubric',
            fix: 'A model choice is a maintenance commitment — page load, upgrade cadence, deprecation risk must be scored, not discovered in production.',
          },
          {
            mistake: 'Deciding once and never re-running',
            fix: 'Models, prices and licenses move — especially fast as of 2026. Put a quarterly re-run date and a rollback path in the decision document.',
          },
        ],
        exam: {
          question:
            'Describe a model-selection framework for a production GenAI feature. Include the process steps, at least four rubric criteria with rationale, and one way to test the robustness of your decision.',
          answer:
            'Process: (1) define the task and a golden eval set with a concrete metric; (2) apply hard constraints (residency, modality, latency ceiling, budget, licensing) as pass/fail filters; (3) shortlist 3–4 candidates spanning categories; (4) evaluate all on the identical harness with version-pinned models and prompts; (5) score a weighted rubric and document evidence per score; (6) recommend with monitoring metrics and a rollback path; (7) schedule a re-evaluation (quarterly — the field moves). Rubric criteria: quality on your eval (largest weight — it is the only task-relevant quality signal), unit cost at real volume (token/GPU arithmetic), p95 latency (tail latency is what users feel), data/compliance fit (contractual and legal constraints), ops burden (who maintains it, drift and deprecation risk). Robustness test: perturb the weights (e.g. raise quality weight by 10 points) and see whether the ranking flips; if it does, surface the trade-off explicitly to stakeholders rather than hiding it behind false precision — the weights, not the arithmetic, are where the real decision lives.',
          source: 'System-design interview staple: "how do you choose a model for production?"',
        },
        summary: [
          'Selection is a process: metric → hard filters → shortlist → identical eval harness → weighted rubric → decide → monitor → re-run quarterly.',
          'The only quality number that matters is the one you measured on your own golden set.',
          'Weight criteria to your product: quality, unit cost, p95 latency, compliance, ops burden — weights are a stakeholder decision made numeric.',
          'Sensitivity-check the ranking: if a small weight change flips the winner, present the trade-off, do not bury it.',
          'Every decision document ends with pinned versions, monitoring metrics and a rollback path — or it is not a decision, it is a mood.',
        ],
      }),
      [
        [
          'The correct FIRST step in a model selection process is:',
          [
            'Shortlisting the three most famous models',
            'Defining the task, the golden eval set and the success metric',
            'Reading the latest leaderboard',
            'Estimating GPU rental prices',
          ],
          1,
          'Without a task-specific metric you cannot compare anything except vibes.',
        ],
        [
          'Hard constraints in model selection should be treated as:',
          [
            'Weighted criteria that can be traded off against quality',
            'Pass/fail filters applied before any scoring',
            'Items to mention in the final report only',
            'Optional considerations for later phases',
          ],
          1,
          'Residency, licensing, modality and budget ceilings eliminate candidates outright — no score recovers a compliance failure.',
        ],
        [
          'A weights-sensitivity check (e.g. raising the quality weight 10 points) is valuable because it:',
          [
            'Improves the model\'s accuracy',
            'Reveals whether the decision depends on a debatable weighting, exposing the real stakeholder trade-off',
            'Satisfies a compliance requirement',
            'Automatically re-runs the eval',
          ],
      1,
          'Ranking flips under small weight changes mean the "winner" is a values question wearing a spreadsheet costume.',
        ],
        [
          'Why must a model decision document pin model versions and include a rollback path?',
          [
            'Vendors require it for billing',
            'Endpoints and behaviours drift or get deprecated — reproducibility and a safe fallback are engineering requirements, not paperwork',
            'It improves model quality',
            'Rollbacks are legally required everywhere',
          ],
          1,
          'Version drift is the normal state of fast-moving model lines; the plan anticipates it instead of discovering it in an incident.',
        ],
      ]
    ),
  ],
};
