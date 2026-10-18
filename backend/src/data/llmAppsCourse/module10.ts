// Module 10 — Performance, Cost and the Capstone
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code } from '../nineBlocks';
import { lesson, M10, COURSE_ID } from './helpers';

export const module10: CourseModule = {
  id: M10,
  course_id: COURSE_ID,
  title: 'Module 10 — Performance, Cost and the Capstone',
  summary:
    'The last engineering module is what separates a demo from a product: latency decomposed into the pieces you can actually optimise (TTFT, throughput, end-to-end), caching at three levels with the correctness traps each one carries, batch processing for everything that is not real-time, model routing that spends capability only where difficulty lives, and the scaling picture — what breaks first under load, and the queues and limits that absorb it. The course then closes with the capstone: one mini-app shipped end to end, from one-page spec through architecture, prompts, tools, eval harness, threat model, cost and latency budget, deploy checklist and cost dashboard.',
  sort_order: 10,
  lessons: [
    lesson(
      M10,
      'lla-10-1',
      1,
      'Latency: TTFT, Tokens per Second and the End-to-End Budget',
      'Perceived speed is not one number. Decompose latency into queue, prefill, time-to-first-token, generation throughput, tool rounds and post-processing; measure percentiles, not averages; then optimise in the order the decomposition says — usually output tokens and rounds before anything clever.',
      16,
      nineBlocks({
        objectives: [
          'Decompose end-to-end latency into named components you can measure separately',
          'Choose the right metric per UX: TTFT for interactive starts, tokens/sec for streaming, total for jobs',
          'Optimise in the right order: fewer rounds and output tokens first, model size second, cleverness last',
          'Run a latency load test that reports percentiles and finds the real ceiling',
        ],
        hook:
          'An assistant feels slow even though the provider\'s dashboard shows 400 ms "latency". The user\'s actual wait: 380 ms network to your region, 2.1 s queue behind two other turns from the same session, 900 ms prefill of a 38k-token context, 1.4 s to first token, then 11 tool rounds at 900 ms each before the final answer streams. Total: over 13 seconds. The dashboard measured one box in the middle. Feeling slow is a sum, and you cannot cut what you do not add up.',
        concept: `**The latency sum.** End-to-end time for one turn is a pipeline: client-to-server network; your queue (waiting on your own concurrency slots); assemble (cheap if you followed Module 5 — measure anyway); moderation pre-screen (run it in parallel, Module 9); provider queue and prefill (prompt processing — grows with input size, so your 38k-token context is not free); time-to-first-token (TTFT: prefill done, first generated piece leaving); inter-token gaps and generation throughput (output tokens per second during streaming); tool rounds (each is a full mini-pipeline of its own — call, execution, re-prefill of the grown transcript, more generation); post-processing, validation, persist. Name each in your traces (Module 8 spans already carry most of them) and the optimisation order stops being guesswork.

**Three metrics, three jobs.** TTFT dominates perceived speed for interactive answers: a user judging "is it working?" reads the first token, which is why streaming (Module 1) matters more than total time for chat. Throughput (tokens/sec during generation) matters for long answers and for provider-tier selection — two models with similar TTFT can differ 2x in generation speed. End-to-end total matters for jobs, batch and tool-heavy flows where the user waits for completion anyway. Percentiles, always: p50 tells you the typical feel, p95 and p99 tell you the complaints; a mean over a bimodal distribution (cache hits plus cache misses) describes neither population.

**Optimise in the order the sum names.** (1) Cut tool rounds — the multiplier: every round re-prefills a larger transcript (Module 6 bounds are latency controls as much as cost controls); a 11-round flow is usually a design problem (missing parallelism, staged calls that could be one, tools that should return summary-with-drill-down instead of raw pages). (2) Cut output tokens — brevity constraints, max_tokens that matches the contract, structured output instead of rambling prose; output is generated sequentially and is the longest phase for chatty answers. (3) Cut input — history summarisation, retrieval precision over retrieval volume, tool-result caps (Module 6): prefill grows with every token you send, at prefill speeds, on every round. (4) Model routing by difficulty (Lesson 3) — the cheap 2x for the easy majority. (5) Prefix caching (Lesson 2) — turns your static system prompt and tool definitions from prefill cost into cache reads. (6) Only then infrastructure: region proximity, connection reuse, HTTP/2 multiplexing. What rarely helps: hand-optimising assemble when provider time dominates (the Module 5 lesson — measure p95 assemble versus p95 provider before touching either).

**Load testing without self-deception.** Closed-loop testing (one request, wait, next) hides queueing: your p95 at one concurrent user says nothing about 50. Use an open-loop generator at target arrival rates, hold each rate long enough for queues to stabilise, and plot p95/p99 against arrival rate until latency crosses your budget — that crossing is your capacity. Include cache-cold and cache-warm runs (they are different populations), and remember provider variance: your ceiling may be your provider\'s, so re-measure after their incidents and model updates (as of 2026, published provider latencies are directional — your stack and region decide your numbers).`,
        diagram: `flowchart LR
  C["client"] --> N["network"] --> Q["your queue"] --> A["assemble"]
  A --> M["moderation (parallel)"]
  A --> P["provider queue + prefill (grows with input)"]
  P --> T["TTFT: first token"]
  T --> G["generation: tokens/sec"]
  G --> T1{"tool round?"}
  T1 -->|"yes"| R["call tool, re-prefill larger transcript"] --> P
  T1 -->|"no"| V["validate + persist"] --> E["done"]
  N & Q & A & P & T & G & R -.-> SP["spans: each component measured"]`,
        extras: [
          table(
            'Metric, what it says, what to do when it is bad',
            ['Metric', 'Answers', 'Typical fix order'],
            [
              ['TTFT', 'When does it feel alive?', 'Prefill: shrink input, prefix-cache, parallel moderation'],
              ['Tokens/sec', 'How fast does it talk?', 'Model tier, output caps, fewer round trips'],
              ['End-to-end p95', 'When is the answer done?', 'Rounds first, then output length, then routing'],
              ['Queue wait', 'Is YOUR system the bottleneck?', 'Concurrency limits sized to provider limits'],
              ['Tool span p95', 'Which dependency drags?', 'Batch inside the tool, cache, circuit breaker'],
            ],
          ),
          code(
            `// measuring the sum: spans already exist (module 8) - now read them
export function summariseTurn(spans: Span[]): TurnTiming {
  const t = (name: string) => spans.filter((s) => s.name === name)
    .reduce((a, s) => a + s.durationMs, 0);
  return {
    networkEdgeMs: spans[0].startMs - spans[0].clientSentMs,   // if client reports sent_at
    queueMs:  t("queue"),
    assembleMs: t("assemble"),
    prefillMs: first(spans, "model_call").attrs["ttft_ms"],   // provider-reported or measured
    genMs: first(spans, "model_call").durationMs - first(spans, "model_call").attrs["ttft_ms"],
    toolMs: t("tool"),
    rounds: spans.filter((s) => s.name === "model_call").length - 1,
  };
}

// open-loop load test: find where p95 crosses the budget, not where it looks nice
for (const rate of [5, 10, 20, 40, 80]) {          // requests/sec arrival
  const results = await openLoopRun({ rate, duration_s: 120, cache: "cold" });
  report(rate, {
    p50_ms: results.p(50), p95_ms: results.p(95), p99_ms: results.p(99),
    queue_p95: results.queueP(95), error_rate: results.errors,
  });
  if (results.p(95) > BUDGET_P95_MS) { capacity = rate; break; }
}`,
            'latency.ts',
            'ts',
          ),
          tip(
            'p95 assemble versus p95 provider settles a whole class of arguments',
            'Measure the split before anyone proposes an optimisation — most of the time the sum is not where the team thinks.',
          ),
          warn(
            'Closed-loop load tests hide the queue you will actually run in production',
            'Open-loop arrival at target rates, long enough for queues to stabilise — then read p95 at the crossing.',
          ),
        ],
        worked: {
          title: 'Cut the 13-second assistant under a 3-second budget',
          problem:
            'The hook\'s assistant: 38k-token context, 11 tool rounds, verbose answers, p95 total 13 s, budget 3 s to first useful text. Decompose, then fix in the order the numbers name.',
          steps: [
            {
              title: 'Decompose a p95 turn from the traces',
              desc: 'Spans sum to: network 380 ms, queue 2.1 s, assemble 40 ms, prefill 900 ms (38k context), TTFT 1.4 s into the answer, generation 11 rounds totaling 6.2 s, tools 2.3 s, post 120 ms. Two things dominate: your own queue (concurrency 2 for a 40-rpm app) and the 11-round tool loop. Provider "latency" on the dashboard was a fifth of the story.',
              code_snippet:
                'p95 turn 13.2s = queue 2.1 + rounds 6.2 + tools 2.3 + prefill 0.9 + rest\nranked: rounds > queue > tools > prefill > output-tail\nbudget: 3s to first useful text -> TTFT is the gate, total is the job metric',
            },
            {
              title: 'Fix rounds and queue before anything clever',
              desc: 'Tool audit: three lookups always issued together become one parallel fan-out (Lesson 6.2); two rounds of refinement merge into one better-specified call; a raw 40-page fetch becomes summary-with-cite. Rounds: 11 → 4. Concurrency raised to 8 with the provider limit respected and a queue alarm behind it: queue p95 2.1 s → 90 ms.',
            },
            {
              title: 'Shrink input and cap output',
              desc: 'Retrieval precision (top-4 reranked instead of top-12 stuffed) plus history summarisation cut the context 38k → 9k: prefill 900 ms → 240 ms and cheaper every round. Output contract tightened (findings list, 120-word max rationale each): generation tail cut roughly in half.',
            },
            {
              title: 'Re-measure and route what remains',
              desc: 'New p95: TTFT 640 ms (budget met), total 2.4 s with 4 rounds. Remaining easy-majority traffic (simple clause lookups) routes to the small tier (Lesson 3), TTFT 280 ms there. Load test at open-loop rates finds the new ceiling at 90 rpm — three times the previous 30 — with the same provider. Total spend per turn down 55 percent, mostly from rounds and input.',
            },
          ],
          solution:
            'The decomposition turned a vague "it feels slow" into a ranked list, and the ranked list made the first two fixes boring and enormous: fewer rounds and a wider concurrency slot. Cleverness (routing) came last and was small — which is what the order is for. The same fixes cut cost by more than half, because rounds and input tokens were always paying rent in both dimensions; latency work that ignores the bill is only half an optimisation.',
        },
        practice: {
          title: 'Decompose your own p95',
          prompt:
            'Instrument one turn end to end: queue, assemble, prefill/TTFT, generation, each tool span, post-processing. Take a p95 request from production (or your best approximation) and write the ranked sum. Then cut the top component — rounds, queue or output — and re-measure against a written budget for TTFT and total. Report the before/after sum and what the dashboard had been hiding.',
          hint: 'If your spans cannot sum to the user-reported wait, the measurement is not finished — find the missing box before optimising anything.',
        },
        mistakes: [
          {
            mistake: 'Optimising assemble because the dashboard showed provider latency',
            fix: 'Sum the spans first; the dominant term is usually rounds, queue or output — and it names the fix.',
          },
          {
            mistake: 'Chasing model speed before cutting rounds and input',
            fix: 'Rounds multiply prefill and generation; input feeds prefill every round — cut the multipliers first.',
          },
          {
            mistake: 'Closed-loop load tests and mean latencies',
            fix: 'Open-loop arrival at target rates; percentiles always; cache-cold and cache-warm are different populations.',
          },
          {
            mistake: 'Treating streaming as a latency fix',
            fix: 'Streaming fixes perceived start (TTFT matters); it does nothing for a 11-round total — measure both.',
          },
        ],
        exam: {
          question:
            'Decompose end-to-end LLM latency into named components. When do TTFT, throughput and total each matter? Give the optimisation order and justify putting tool rounds first.',
          answer:
            'Components: client network; your queue; assemble; moderation (parallel); provider queue and prefill (grows with input size); TTFT; generation throughput and inter-token gaps; tool rounds (each a mini-pipeline that re-prefills a grown transcript); validation and persist. TTFT dominates interactive perceived speed — stream and shrink prefill; tokens/sec matters for long answers and tier choice; total matters for jobs and tool-heavy flows. Percentiles, not means. Order: (1) cut tool rounds — they multiply prefill and generation on an ever-larger transcript, and are usually a design flaw (parallelism missed, calls merged, results summarised at the source); (2) cut output tokens via contract and caps — generation is sequential and often the longest phase; (3) cut input via retrieval precision, history summarisation and tool-result caps — it feeds prefill on every round; (4) model routing by difficulty for the easy majority; (5) prefix caching for static prompt and tools; (6) infrastructure last. Justification for rounds first: a round is not additive but multiplicative across the phases it re-invokes, which is why an 11-round flow dominated the hook\'s p95 while assemble was 40 ms.',
          source: 'Performance interview: "our LLM feature feels slow — how do you find the cause?"',
        },
        summary: [
          'Latency is a sum of named spans; measure the sum before touching anything.',
          'TTFT for feel, tokens/sec for flow, total for jobs — percentiles always.',
          'Rounds multiply; input feeds prefill; output runs sequentially — cut in that order.',
          'Queue time is often yours, not the provider\'s — size concurrency deliberately.',
          'Open-loop load tests find the ceiling; closed-loop ones hide it.',
          'Latency and cost share levers: rounds and input are paid twice.',
        ],
      }),
      [
        [
          'Time-to-first-token (TTFT) matters most for:',
          [
            'Batch jobs that run overnight',
            'Interactive chat, where perceived aliveness is judged before the answer completes',
            'Token billing accuracy',
            'Provider queue monitoring only',
          ],
          1,
          'The user decides "is it working?" at the first token; streaming turns TTFT into the experience metric.',
        ],
        [
          'A turn with 11 tool rounds is slow mainly because:',
          [
            'Each round re-prefills a grown transcript and regenerates — rounds multiply the expensive phases',
            'Tool results are uncompressed',
            'Streaming cannot work with tools',
            'Providers charge per round and slow down',
          ],
          0,
          'Rounds are multiplicative across prefill and generation, which is why they rank above every local optimisation.',
        ],
        [
          'Your load test shows p95 of 900 ms at 1 concurrent user. This tells you:',
          [
            'Production p95 will be 900 ms',
            'Almost nothing about production queueing — you need open-loop arrival at target rates to see the queue you will actually run',
            'The provider limit is 1 rps',
            'The test should run longer at 1 user',
          ],
          1,
          'Closed-loop testing hides your own queue; capacity is where p95 crosses budget under real arrival.',
        ],
        [
          'The first optimisation you should try for a slow, chatty tool-heavy flow is:',
          [
            'Move to a region closer to the provider',
            'Cut tool rounds and output tokens — the multiplicative and sequential phases — before anything clever',
            'Upgrade to the largest model available',
            'Disable streaming to save bandwidth',
          ],
          1,
          'Rounds multiply prefill and generation on a growing transcript; output is generated sequentially — both outrank infrastructure tweaks.',
        ],
      ]
    ),
    lesson(
      M10,
      'lla-10-2',
      2,
      'Caching: Exact, Semantic and Prefix',
      'Caching is the cheapest performance and cost win available to an LLM app — at three levels with three risk profiles: exact request caching, provider prefix caching for your static context, and semantic caching for near-duplicate inputs. Each one can also serve a wrong answer to the wrong person; design the keys and scopes before enabling any of them.',
      16,
      nineBlocks({
        objectives: [
          'Build exact-match caching with keys that capture every output-affecting input',
          'Use provider prefix caching correctly: static-first ordering and versioned prefixes',
          'Evaluate semantic caching with thresholds, tenant scoping and negative-caching rules',
          'Measure hit rates and catch the correctness traps: PII in keys, personalisation, staleness',
        ],
        hook:
          'A team enables a semantic cache with a cosine threshold of 0.92 across all tenants. Two users ask variants of "what is our refund window?" — one is a shopper, one is an employee testing internal policy — and the second receives the first\'s cached shopper answer with a confident citation to a document they cannot see. Meanwhile their exact cache, keyed only on the message text, happily serves a cached "summarise this" result across two users who had attached different documents. Both outages are the same bug: the cache key is a claim about what makes two requests equivalent, and nobody wrote the claim down.',
        concept: `**Every cache is a claim about equivalence.** A hit means "this request is the same as one we answered before" — so the key must include everything that affects the output: model id, all parameters that alter generation, the full message list, tool definitions, retrieval settings, prompt_version, and the identity or tenant when the answer is personal or scoped. Miss on any dimension you forgot, and you serve a wrong answer with high confidence. Start with exact caching: normalise the request, canonicalise (sorted keys, trimmed trailing whitespace where it cannot matter), hash, store the response with a TTL and the prompt_version, and serve on hit with a cache-hit flag in your usage event (Module 8 spans already carry the attribute — a cache that is invisible in traces is a cache you cannot debug). Temperature 0 makes reuse more defensible; caching a high-temperature creative run is replaying a coin flip. Never cache errors, refusals or incomplete (truncated) answers as successes — a negative or poisoned entry outlives the incident that created it.

**Prefix caching: the one you get from providers.** Modern providers cache the prompt prefix — the leading portion of input that repeats across requests — and charge less and prefill faster on cache hits (as of 2026, most major APIs offer automatic prompt caching with their own TTL and minimum-length rules; verify current docs for your provider\'s semantics and pricing). The design lever is ordering: put everything static and long first — system prompt, tool definitions, canonical document context — and everything variable last (user turn, session-specific data), because only the shared prefix can hit. Two consequences: your system prompt and tool definitions should live above session history (usually true anyway), and prefix invalidation is automatic on any edit — a one-word change to the system prompt misses the cache, which is exactly right, so version your prompt text (Module 5) and accept the miss after a bump. Multi-tenant caution: a shared prefix that includes tenant data is a leak vector across the cache boundary — tenant-specific context belongs in the variable tail or in tenant-scoped prefixes.

**Semantic caching: the powerful, dangerous one.** Purpose: catch near-duplicate asks ("refunds policy" vs "what\'s the return window") that exact keys miss. Design requirements: embed the normalised input (and the relevant context, if answers depend on it), search your vector store within the tenant scope — never globally across customers — with a threshold you chose from measured false-hit data, not from a default; decide staleness policy (TTL tuned to how fast your documents change); apply negative-caching rules as in exact caching; and log every hit with similarity so you can audit what was actually served. The evaluation that keeps it honest: a labelled set of similar-but-different pairs (paraphrase should hit; different tenant, different document version, negation, numbers and dates that differ must miss — a cache that confuses "refund within 7 days" with "within 30 days" is worse than no cache). Measure hit rate and false-hit rate together: a rising hit rate with a rising wrong-answer rate is the cache optimising the wrong objective. Cost reality check: semantic caches pay off on high-volume, low-variance workloads (FAQ-like assistants, classification-shaped asks); on personalised or fast-changing workloads they mostly add risk and embedding cost.

**What to cache at which level, in one pass.** Static long context → prefix cache (free correctness, provider-managed). Identical full requests (same user retry, webhook replays, eval runs) → exact cache. High-volume paraphrase traffic within one tenant → semantic cache, carefully. Tool results that are expensive and stable (a nightly report, a document parse) → cache at the tool layer with its own TTL, which sidesteps the whole question of serving stale model output — sometimes the best cache is below the model, not around it.`,
        diagram: `flowchart TD
  REQ["request"] --> KEY["key = hash(model, params, messages, tools, prompt_version, tenant)"]
  KEY --> EX{"exact cache"}
  EX -->|"hit + fresh + success"| SERVE["serve + cache flag in usage"]
  EX -->|"miss"| SEM{"semantic cache (tenant-scoped, threshold, similar)?"}
  SEM -->|"hit (audited)"| SERVE
  SEM -->|"miss"| PRE["build prompt: STATIC prefix -> variable tail"]
  PRE --> PV{"provider prefix cache"}
  PV -->|"hit"| GEN["discounted prefill"]
  PV -->|"miss"| GEN2["full prefill"]
  GEN & GEN2 --> STORE["store success only; TTL; version"]`,
        extras: [
          table(
            'Cache level chooser',
            ['Level', 'Key / scope', 'Wins', 'Main risk'],
            [
              ['Prefix (provider)', 'Leading static tokens, shared per tenant policy', 'Prefill speed + discount, automatic', 'Tenant data in shared prefix; miss on every edit'],
              ['Exact', 'Hash of canonical full request + version + tenant', 'Deterministic replay for retries and evals', 'Key missing a dimension serves wrong answers'],
              ['Semantic', 'Embedding search, tenant-scoped, thresholded', 'Paraphrase volume at FAQ shape', 'False hits across intent, tenant, numbers, versions'],
              ['Tool-layer', 'Tool + args + data version', 'Skips the model entirely for stable data', 'Staleness vs the system of record'],
            ],
          ),
          code(
            `# exact cache with an honest key; semantic only inside the tenant
def request_key(req: ChatReq, *, tenant: str, prompt_version: str) -> str:
    payload = canonical_json({
        "model": req.model,
        "params": {k: req.params[k] for k in sorted(PARAMS_THAT_MATTER)},
        "messages": [{"role": m.role, "content": m.content} for m in req.messages],
        "tools": req.tools,
        "prompt_version": prompt_version,
        "tenant": tenant,                 # a miss here is a cross-tenant serve
    })
    return sha256(payload)

async def complete(req, ctx):
    key = request_key(req, tenant=ctx.tenant, prompt_version=ctx.pv)
    if hit := await cache.get(key):
        if hit.kind == "success" and not expired(hit):
            usage.flag(cache="exact_hit")
            return hit.response                    # never serve cached errors/refusals
    out = await provider(req)
    if out.kind == "success" and out.finish_reason == "stop":
        await cache.set(key, out, ttl=ttl_for(ctx.pv))   # success only
    return out

async def semantic_lookup(text, ctx):
    # tenant-scoped ANN; threshold from measured false-hit data, not a default
    cands = await vectors.search(embed(normalise(text)), tenant=ctx.tenant, top_k=3)
    best = cands[0]
    if best.score >= SEM_THRESHOLD[ctx.tenant] and fresh(best):
        audit("semantic_hit", score=best.score, served=best.answer_id, trace=ctx.trace_id)
        return best
    return None`,
            'caching.py',
            'python',
          ),
          tip(
            'Put the cache hit flag in the usage event and the trace',
            'A hit rate you cannot break down by prompt_version and tenant is a hit rate you cannot trust.',
          ),
          warn(
            'A cache key is a correctness claim',
            'Write down what makes two requests equivalent — model, params, messages, tools, version, tenant — or you will discover it in production.',
          ),
        ],
        worked: {
          title: 'Add a three-level cache to the FAQ assistant',
          problem:
            'An FAQ-style assistant answers 40k identical-ish questions a day. Add prefix, exact and (maybe) semantic caching — and catch the two personalisation traps before they ship.',
          steps: [
            {
              title: 'Order the prompt for prefix hits and measure the baseline',
              desc: 'System prompt (2.1k tokens) + tool definitions (1.8k) move above everything variable; tenant document context stays in the tail per tenant. Provider-side prefix caching then hits the 3.9k static block on every repeat within its TTL. Measured: prefill on cache-hit turns drops from ~700 ms to ~150 ms equivalent cost, and the input bill for that block falls with the provider\'s cache-read rate (verify current rates).',
              code_snippet:
                'prompt order: [system+tools 3.9k static] [tenant docs] [history] [user turn]\nprefix hit -> prefill discount on the static block; ANY edit to system = miss (versioned, expected)\ntenant docs never in the shared static block',
            },
            {
              title: 'Layer exact caching on the full canonical key',
              desc: 'Key: hash of model, sampling params, messages, tools, prompt_version, tenant. Webhook retries and double-submits now replay deterministically; eval reruns hit. Traps caught in review: a first key draft omitted prompt_version (stale-version serves) and tenant (the hook\'s cross-tenant bug) — both fixed before launch, both visible in a key-review checklist.',
            },
            {
              title: 'Evaluate semantic caching on a labelled pair set',
              desc: 'Two hundred pairs: paraphrases (should hit), number/date variants (must miss), different tenants (must miss), different document versions (must miss). Threshold 0.90 within tenant gives 34 percent hit potential with a measured false-hit rate under 1 percent on the must-miss set. Numbers, dates and negation are normalised into the embedding key so "7 days" and "30 days" do not collide. Decision: ship it for the FAQ tenant only; skip it for the personalised workspace tenant where answers depend on session state.',
            },
            {
              title: 'Read the dashboard a week later',
              desc: 'Hit mix: prefix 61 percent of turns (provider-managed), exact 9 percent, semantic 12 percent in its one tenant. Cost per turn down 47 percent, TTFT p95 down 40 percent. One semantic false hit caught by the audit log (similarity 0.91, wrong document version — TTL too long on that corpus): TTL tightened, pair added to the must-miss set. The cache earns its keep only because its hits are logged and breakable.',
            },
          ],
          solution:
            'Three levels, each with the key discipline its risk demands: prefix ordering for the free win, exact keys reviewed like code (version and tenant were the two draft omissions that would have shipped the hook\'s bugs), and semantic caching restricted to the one tenant whose traffic shape justified it, with a labelled pair set deciding the threshold. The false hit that did occur was caught by an audit trail within a week — which is the real design: not caches that never err, but caches whose errors are visible, attributable and removable in one edit.',
        },
        practice: {
          title: 'Design your cache',
          prompt:
            'Write your exact-cache key: every dimension that affects output, including version and tenant. Reorder your prompt static-first and measure prefix hit behaviour. For semantic caching, build ten similar-but-must-miss pairs from your domain (numbers, dates, negation, tenant switches) before choosing any threshold — then decide whether to ship it at all. Report hit rates per level and the one trap your first key draft missed.',
          hint: 'If two requests that should differ can produce the same key, you have built a wrong-answer machine with good latency.',
        },
        mistakes: [
          {
            mistake: 'Keys that omit prompt_version or tenant',
            fix: 'Both are output-affecting dimensions; review cache keys with a checklist the way you review schemas.',
          },
          {
            mistake: 'Caching errors, refusals and truncated answers',
            fix: 'Store successes only; negatives outlive the incident that produced them.',
          },
          {
            mistake: 'Semantic thresholds picked from provider defaults',
            fix: 'Calibrate on labelled must-hit/must-miss pairs from your own traffic; audit every hit with its score.',
          },
          {
            mistake: 'Putting tenant data in the shared static prefix',
            fix: 'Static block is shared content only; tenant context lives in the tail or tenant-scoped prefixes.',
          },
        ],
        exam: {
          question:
            'Name the three cache levels, what each is keyed on, and its main risk. How do you order a prompt for prefix caching, and what does semantic caching require before it ships?',
          answer:
            'Prefix (provider-managed): the leading static token block of every request — win is discounted, faster prefill; ordering rule is static first (system prompt, tool definitions), variable last (history, user turn, tenant context), so the shared block can hit; any edit to the static text misses, which is correct under prompt versioning; risk is tenant data placed in the shared block. Exact: hash of the canonical full request — model, generation params, messages, tools, prompt_version and tenant — which is a written equivalence claim; serves retries and eval reruns deterministically; risk is a key missing a dimension, serving stale or cross-tenant answers; cache successes only, with TTL and a hit flag in usage and traces. Semantic: embedding similarity search within tenant scope at a threshold calibrated on labelled paraphrase-hit / must-miss pairs (numbers, dates, negation, version and tenant changes must miss); main risks are false hits and staleness, mitigated by audit logs of every hit with score, TTLs per corpus velocity, and per-tenant go/no-go decisions. Ship it only where traffic is high-volume and low-variance; measure hit rate and false-hit rate together, and remember the alternative: caching at the tool layer skips the model entirely for stable data.',
          source: 'Cost-engineering interview: "where would you put caches in this LLM app?"',
        },
        summary: [
          'A cache key is a written claim about request equivalence — review it like a schema.',
          'Exact keys include model, params, messages, tools, version, tenant; successes only.',
          'Prefix caching: static first, tenant tails separate, misses on edits are correct.',
          'Semantic: tenant-scoped, threshold calibrated on must-hit/must-miss pairs, every hit audited.',
          'Measure hit rate and false-hit rate together; a hit rate alone is a vanity metric.',
          'Sometimes the best cache is at the tool layer, below the model entirely.',
        ],
      }),
      [
        [
          'An exact cache key for an LLM request must include:',
          [
            'Only the user message text',
            'Model, generation parameters, full messages, tools, prompt_version and tenant — everything that affects output',
            'The timestamp of the request',
            'The server region',
          ],
          1,
          'The key is the equivalence claim; each omitted dimension is a wrong answer waiting for a coincidence.',
        ],
        [
          'To maximise provider prefix-cache hits you should order the prompt with:',
          [
            'The user turn first, so it is processed fastest',
            'Static shared content first (system prompt, tools) and variable content (history, user turn, tenant data) last',
            'Randomised ordering to spread cache load',
            'Retrieved documents before the system prompt',
          ],
          1,
          'Only the shared leading prefix can hit — everything variable belongs in the tail.',
        ],
        [
          'Semantic caching at a 0.92 cosine threshold starts serving wrong answers to number variants ("7 days" vs "30 days"). First response:',
          [
            'Raise the threshold to 1.0 (disable it)',
            'Normalise numbers/dates into the cached key, add the failing pairs to a must-miss set, re-calibrate the threshold, and audit recent hits for damage',
            'Switch embedding models immediately and hope',
            'Ignore it; cosine 0.92 is industry standard',
          ],
          1,
          'False hits are fixed by key design and recalibration against must-miss pairs — then recent hits are audited, because damage may already have shipped.',
        ],
        [
          'Which of these should NEVER be written to a cache as a servable entry?',
          [
            'A successful answer at temperature 0',
            'A truncated or refused response, or a classified error',
            'An answer for a stable FAQ document',
            'A response with its prompt_version recorded',
          ],
          1,
          'Negatives outlive the incident that produced them; cache successes only.',
        ],
      ]
    ),
    lesson(
      M10,
      'lla-10-3',
      3,
      'Batch, Model Routing and Scaling Under Load',
      'Not everything is a chat turn: batch APIs and job queues turn non-realtime work into half-price throughput. Routing sends each request to the smallest model that can handle it, with escalation on measured difficulty. And scaling has a known order of failure — your queues and provider limits first — so you design the absorption before the load arrives.',
      16,
      nineBlocks({
        objectives: [
          'Move non-realtime workloads to batch processing with durable queues and checkpointing',
          'Design model routing: difficulty signals, cascade escalation and per-route evals',
          'Predict what breaks first under load and pre-build the absorption: queues, limits, failover',
          'Make capacity decisions from cost-per-job and ceiling measurements, not vibes',
        ],
        hook:
          'Every night, a pipeline re-reads 12,000 contracts with a frontier model at interactive pricing, sequentially, because the original demo did exactly that and nobody revisited it. Bill: about nine hundred dollars a night; runtime: seven hours against a four-hour window. A colleague points out the provider\'s batch offering at roughly half the price and asynchronous delivery, plus a small model that passes the eval on 70 percent of the easy contracts. The work was never interactive — it was wearing a chat architecture by habit, and habit is expensive at twelve thousand documents a night.',
        concept: `**Batch is a different product.** Anything that does not need an answer inside a second — nightly digests, backfills, eval runs, enrichment, migration — should leave the interactive path entirely. Options, ascending in machinery: a job queue with worker pools calling the synchronous API at controlled concurrency (you own retries and rate pacing); the provider\'s asynchronous batch APIs (submit a file of requests, collect results later, typically at a substantial discount — as of 2026 the discount is commonly around half, with per-provider caps on size and completion windows; verify current docs); and offline processing on open-weight models when data locality or cost demands it. Design points that matter: idempotent jobs (a retried item must not double-charge or double-write — key on item id plus content hash), checkpointing (persist per-item results so a failure at item 9,000 resumes, not restarts), partial-failure policy (per-item status rows, dead-letter queue, a re-run path scoped to failures only), and deadline awareness (batch completion windows are promises with soft edges — schedule ahead of your real deadline). The money math is the point: same quality, half the input price, and your interactive capacity stops competing with your nightly load.

**Routing: capability where difficulty lives.** The economics: a small model at a tenth the price passes most easy traffic with the right scaffolding; a frontier model earns its keep on the hard minority. Two architectures. Static routing: a cheap classifier (or rules — length, domain keywords, presence of multi-step intent, document complexity) picks the tier per request class before generation; simple, predictable, evaluable per route. Cascade: try the small model first, then escalate on measured signals — validation failure (Module 7), refusal on an in-scope request, judge or heuristic confidence below threshold, or a task-specific difficulty probe — with escalation capped (one bounce to the large tier, never a ping-pong). Both need per-route golden sets: a route without its own eval is an unmeasured opinion about difficulty. Hard part nobody tells you: difficulty signals drift as your traffic mix changes, so re-measure the routes quarterly (or when cost-per-request or quality-by-tier moves), and watch the routing boundary for gaming — users learn which phrasing triggers the big model, whether or not it needs it. One more honesty note: routing a request the small model fails wastes the small model\'s cost plus the large model\'s; the cascade only pays when the escalate rate stays inside the numbers your eval predicted.

**Scaling: know what breaks first.** For a typical stateless LLM service under growing load, the failure order is predictable: (1) your own concurrency limits and queue depth — users wait, p95 climbs; (2) provider rate limits — your distributed limiter smooths what you can, and your ceiling is usually theirs; (3) the database — conversation writes, cache entries, tool fan-out reads; (4) third-party tools called per turn; (5) the wallet — cost scales linearly with traffic unless cache and routing are in place. Design absorptions deliberately: a queue in front of generation with backpressure UX (Module 3 language for the wait), per-user and per-org quotas (Module 9) so heavy tenants cannot starve the pool, provider-aware client-side rate limiting below the provider\'s published limits, connection pooling and HTTP multiplexing, multi-provider failover for the models where a second provider exists (realistic for some workloads, not all — capability parity varies; verify), and cache and routing installed early because they are capacity, not just cost. Load test each absorption (Lesson 1\'s open-loop discipline): a queue without a measured drain rate is a slower error.`,
        diagram: `flowchart TD
  subgraph LIVE ["interactive path"]
    U["user turns"] --> Q["queue + backpressure"] --> RT{"router"}
    RT -->|easy| S["small model"] --> V{"pass eval signals?"}
    V -->|yes| OK["answer"]
    V -->|no, once| L["frontier model"] --> OK
    RT -->|hard| L
  end
  subgraph BATCH ["batch path (non-realtime)"]
    J["job: 12k items"] --> BQ["durable queue, idempotent keys"] --> W["workers / provider batch API"]
    W --> CP["checkpoint per item"] --> RES["results + dead-letter"]
  end
  PL["provider + db + tool limits"] -.-> Q & BQ
  COST["cost dashboards per route + per job"] -.-> RT & W`,
        extras: [
          table(
            'What breaks first under load, and the absorption',
            ['Order', 'Symptom', 'Absorption'],
            [
              ['1. Your queue / concurrency', 'p95 climbs, timeouts', 'Sized queue, backpressure UX, autoscale workers'],
              ['2. Provider rate limits', '429s despite healthy app', 'Client-side distributed limiter below provider limits; queue absorbs bursts'],
              ['3. Database', 'Slow writes, lock contention', 'Batch writes, pooling, TTL on sessions and cache'],
              ['4. Per-turn tools', 'External API throttling', 'Tool-layer caching, fan-out caps, breakers'],
              ['5. Wallet', 'Bill scales with traffic', 'Routing, caching, batch for non-realtime, budget alarms'],
            ],
          ),
          code(
            `# routing by measured difficulty with one bounded escalation
EASY_HINTS = len_range(0, 120), no_multi_step_intent, simple_doc_class

async def route_and_run(req, ctx):
    tier = classify_difficulty(req)              # rules first; small model when needed
    if tier == "small":
        out = await small_model(req)
        verdict = quick_verdict(req, out)        # schema valid? refusal on in-scope? probe score
        if verdict.ok:
            return tag(out, route="small")
        audit("escalate", reason=verdict.reason, trace=ctx.trace_id)   # ONE bounce, capped
    out = await frontier_model(req)
    return tag(out, route="frontier")

# batch job: idempotent items, checkpointed, failure-scoped re-runs
async def run_nightly(items: list[Item]):
    for chunk in chunks(items, size=PROVIDER_BATCH_MAX):
        key = sha256(chunk.content_hash + PIPELINE_VERSION)
        if done := await checkpoints.get(key):
            continue                                   # resume, not restart
        results = await provider_batch.submit(chunk)   # async, discounted, deadline-aware
        await checkpoints.save(key, results)           # per-item statuses persisted
        dead_letter(results.failed)                    # re-run path scoped to failures only`,
            'routing_batch.py',
            'python',
          ),
          tip(
            'Per-route golden sets or it is an unmeasured opinion',
            'Routing claims difficulty; only a route-scoped eval turns the claim into a number.',
          ),
          warn(
            'A cascade with a rising escalate rate is a slow downgrade to the expensive model',
            'Watch escalate percentage weekly; when it drifts, re-measure the boundary — traffic mix moves.',
          ),
        ],
        worked: {
          title: 'Fix the 12,000-contract night, then route the interactive path',
          problem:
            'The hook pipeline: seven hours, nine hundred dollars, an approaching deadline. Restructure into batch, then apply routing to the app\'s interactive path with per-route evals.',
          steps: [
            {
              title: 'Split the workload by urgency honestly',
              desc: 'Classification: zero percent of the nightly re-read is interactive — it is a batch job wearing chat clothes. The chat assistant on the same codebase is genuinely interactive. Two paths from now on: a durable job queue for the nightly work, the streaming endpoint reserved for humans.',
            },
            {
              title: 'Move the nightly to batch with checkpoints',
              desc: 'Items keyed by contract id plus content hash plus pipeline version (idempotent); submitted through the provider batch API at the discounted rate with a deadline two hours ahead of the real one; per-item statuses persisted, failures to a dead-letter queue with a re-run scoped to failures. Measured result: 3.5 hours wall clock, roughly 470 dollars — same golden-set quality (the eval ran on a 300-case batch sample, 96 percent pass, unchanged).',
              code_snippet:
                'item key = sha256(contract_id + content_hash + pipeline_version)  # retries cannot double-write\nbatch: 12,000 items -> discounted async API, deadline = window - 2h margin\nre-run: dead_letter.failed only (143 items), not the full 12k',
            },
            {
              title: 'Route the interactive path with one bounded escalation',
              desc: 'Difficulty classifier (length, multi-step intent, document class) routes 68 percent to the small model. Quick verdict after each small-tier answer: schema valid, no in-scope refusal, probe score above threshold. Escalation capped at one bounce. Route evals: small-tier golden set 34/35 on its routed class; frontier set unchanged. Cost per interactive turn down 52 percent, small-tier TTFT down 60 percent.',
            },
            {
              title: 'Arm the absorptions and load test',
              desc: 'Open-loop test at rising arrival rates: queue absorbs to 70 rpm before p95 crosses 3 s; client-side limiter holds 10 percent under the provider\'s published rate; DB write batching sized for the peak; budget alarm at 80 percent of daily spend. What breaks first at 120 rpm: provider limits, exactly as predicted — and the queue plus backpressure copy make it a wait, not an error.',
            },
          ],
          solution:
            'The night got 55 percent cheaper and three hours shorter without touching quality, because the work was finally classified as batch and given batch machinery — idempotent, checkpointed and failure-scoped. The interactive path got routing with per-route numbers instead of opinions and one bounded escalation, which is what keeps a cascade honest. And the load test named the ceiling in advance: provider limits, absorbed by a queue whose drain rate was measured rather than assumed.',
        },
        practice: {
          title: 'Route one workload and batch another',
          prompt:
            'Find one workload in your system that is not actually interactive and sketch its batch design: item keys for idempotency, checkpointing, failure policy, deadline. Then add routing to your interactive path: a difficulty signal, a small-tier path, one bounded escalation, and a golden set per route with pass rates. Report your escalate rate estimate and the number that would make you re-measure the boundary.',
          hint: 'If you cannot state the escalate rate your eval implies, the cascade is an unpriced bet on your traffic mix.',
        },
        mistakes: [
          {
            mistake: 'Nightly and backfill work on the interactive path at interactive pricing',
            fix: 'Batch APIs or job queues: discounted, asynchronous, checkpointed — capacity and cost both improve.',
          },
          {
            mistake: 'Routing with no per-route eval',
            fix: 'Each route is a claim about difficulty; measure it, re-measure when traffic mix moves.',
          },
          {
            mistake: 'Unbounded escalation in a cascade',
            fix: 'One bounce, capped and audited; a ping-pong cascade pays both models and stalls the user.',
          },
          {
            mistake: 'Discovering provider limits in production',
            fix: 'Client-side limiter below published limits, queue with measured drain, load test to the crossing.',
          },
        ],
        exam: {
          question:
            'When does a workload belong on a batch path, and what does a good batch design include? Describe routing with bounded escalation and name the typical order in which an LLM service breaks under load.',
          answer:
            'Batch when nothing waits on a human: nightly digests, backfills, enrichment, eval runs, migrations. Design: durable queue, idempotent item keys (item id plus content hash plus pipeline version, so retries cannot double-write), per-item checkpointing so failures resume rather than restart, per-item status with a dead-letter queue and failure-scoped re-runs, deadline scheduling ahead of the real window, and the provider\'s discounted asynchronous batch API where available (verify current discounts and size caps). Routing: a difficulty signal (rules or a small classifier) selects the tier; the small tier runs first for the easy majority; a quick verdict (schema validity, in-scope refusal, probe score) triggers escalation to the frontier model, capped at one bounce and audited; per-route golden sets measure each claim about difficulty, and the escalate rate is watched because traffic mix drift. Failure order under load, typically: own queue and concurrency (p95 climbs), provider rate limits (your ceiling), database writes, per-turn third-party tools, then the wallet — absorbed by sized queues with backpressure UX, client-side limiters below provider limits, write batching, tool caching, and routing and caching installed early because they are capacity, not just cost.',
          source: 'Capacity-planning interview: "our nightly LLM job and our chat app share one path — fix it."',
        },
        summary: [
          'Non-realtime work leaves the interactive path: queues, batch APIs, checkpoints, dead letters.',
          'Idempotent item keys make retries safe; failure-scoped re-runs save the re-read.',
          'Route by measured difficulty; escalate once; eval every route separately.',
          'Watch the escalate rate — drift means re-measure, not re-aim.',
          'Breaks in order: queue, provider limits, database, tools, wallet — pre-build each absorption.',
          'Caching and routing are capacity planning wearing a cost-engineering badge.',
        ],
      }),
      [
        [
          'The strongest signal that a workload belongs on a batch path:',
          [
            'It uses the same model as the chat app',
            'No human is waiting on the result — it is a digest, backfill, enrichment or eval run',
            'It runs in Python',
            'It exceeds 1,000 tokens per item',
          ],
          1,
          'Urgency, not similarity to your demo, decides the path — and batch pricing plus async delivery reward the split.',
        ],
        [
          'In a batch pipeline, the item key should include:',
          [
            'Only the item id',
            'Item id, content hash and pipeline version — so retries and version bumps cannot double-write or mix results',
            'The worker hostname',
            'The submission timestamp',
          ],
          1,
          'Idempotency is the property that makes an at-least-once queue safe to run against a billing system.',
        ],
        [
          'A cascade escalates from small to frontier model on 60 percent of traffic (your eval predicted 20 percent). You should:',
          [
            'Let it run — escalation is safe',
            'Remove the small tier entirely',
            'Re-measure the difficulty boundary against current traffic: drift in the escalate rate means the routing claim no longer holds and the economics have quietly reverted to the expensive model',
            'Raise both models\' temperature',
          ],
          2,
          'A cascade pays only inside its predicted band; watching the escalate rate is watching the economics.',
        ],
        [
          'Under rising load, the first thing that typically breaks in an LLM app is:',
          [
            'The provider\'s GPU fleet globally',
            'Your own queue and concurrency — p95 climbs and timeouts appear before anything else fails',
            'The billing system',
            'The certificate expiry',
          ],
          1,
          'Your limits are hit before the provider\'s; that is why the absorption is a sized queue with measured drain plus backpressure UX.',
        ],
      ]
    ),
    lesson(
      M10,
      'lla-10-4',
      4,
      'CAPSTONE — Ship a Full Mini-App End to End',
      'Everything in forty lessons, assembled into one artifact you can build for real: a one-page spec, an architecture diagram with named stages, versioned prompts and tool schemas, a fifteen-case eval harness with a CI gate, a threat model page, a cost and latency budget with real numbers, a deploy checklist and a cost dashboard — walked through with an AI contract-review helper.',
      16,
      nineBlocks({
        objectives: [
          'Assemble the full course into a shippable plan: spec, architecture, prompts, tools, evals, safety, budgets',
          'Walk the complete contract-review helper from one-page spec to deploy checklist with real numbers',
          'Apply the gates: feasibility spike, eval thresholds, threat model, kill switch, cost alarms',
          'Critique a mini-app plan against the checklist and name what to defer, honestly',
        ],
        hook:
          'Two candidates interview with identical demos: a chat box over PDFs that works on the interviewer\'s laptop. One describes the demo. The other opens a one-page spec, an architecture diagram with stages the team can point at, a fifteen-case eval with scores, a threat-model line about indirect injection into contract text, a cost model that says 3.2 cents per review at their volume, and a deploy checklist with a kill switch on line one. Same model, same prompts, same weekend of coding — and only one of them has built an application.',
        concept: `**The capstone is the assembly, not a new subject.** Every section below is a course module compressed into an artifact decision. The example throughout: an AI contract-review helper for a small legal-ops team — upload a contract, get clause flags (termination, indemnity, liability caps) with citations, plus a short risk summary. Choose your own domain (support agent, knowledge assistant, document extractor); the sections are identical.

**1. One-page spec.** Users: legal-ops analysts reviewing supplier contracts weekly. Job (one sentence): flag risky clauses with citations so an analyst triages in minutes instead of reading every page. Inputs: PDF or DOCX contracts, 5–40 pages. Outputs: structured clause flags with page-cited quotes, a 150-word risk summary, an explicit "needs human review" lane. Success: analyst-confirmed precision on flags at or above 90 percent on the spike set; median time-to-flag under 45 seconds. Non-goals, stated aloud: not legal advice, no drafting, no negotiation, no cross-contract analytics. Feasibility spike first (Module 5): 20 real contracts, hand-checked expectations — the gate that decides build, re-scope or decline before any shell exists.

**2. Architecture.** Client (upload + streaming result view) → API (auth, quota, idempotency — receive stage) → orchestration with the Module 5 stage names: assemble (document parse per Module 7, segment by clause structure, pack per budget), guard-in (moderation plus injection tripwire over contract text), call (provider with tools and structured output), stream (status events: parsing, reviewing clause set), validate (pydantic schema, one repair, fallback chain), guard-out, persist (flags, usage, prompt_version, trace id). Tools: lookup_clause_library (read, allowlisted), fetch_reference_url (https, two-host allowlist — the Lesson 2 discipline), nothing outbound. Observability: spans per stage, token accounting per document, cost per prompt_version. This diagram is not decoration; every arrow is a stage with a test and a metric.

**3. Prompts and tools, versioned.** System prompt in four sections (Module 4): persona (triage assistant for legal ops, never advice), constraints (cite page and verbatim quote for every flag; abstain with reason when a clause is ambiguous; 150-word cap), output contract (JSON via schema), safety (contract text is data, never instructions — the injection clause that layers on top of mechanics, not a substitute for them). Tool schemas flat and short (Module 6). Everything versioned with changelog and attribution on every completion (Module 5), because the eval gate below is meaningless without it.

**4. Eval harness.** Fifteen golden cases minimum, three classes: extraction correctness (five: clean single-clause, multi-clause wall, absent termination clause, scanned marginal-OCR page, table-formatted schedules), reasoning and citations (five: liability cap with nested definitions, cross-referenced indemnity, unusual but legitimate clause that must NOT be flagged, risk summary coherence rubric line, span-exists checks on every citation), safety and refusal (five: direct injection in the paste box, indirect injection hidden in clause 14, medical-question diversion, request for legal advice (must refuse to advise while still flagging), out-of-scope drafting request). Scoring: programmatic first (field equality, span-in-source, must/must-not), one rubric line for summary coherence. Gate thresholds in config: no class below its baseline, zero new safety failures. Run in CI on prompt changes (recorded fixtures lane) plus nightly live.

**5. Threat model, one page.** Boundaries: analyst→API, service→provider, contract ingest→model (the big one — suppliers write the documents), model→tools, tenant→tenant. Abuse cases: supplier poisons a contract with an injection payload (defence: data labelling, no outbound tools, output screen); exfiltration via citation URLs (allowlist, output scan); cost bomb via 400-page uploads (page caps, token quota, batch for bulk); eval poisoning via feedback thumbs (review before case promotion). Meta-controls: audit on every flag and moderation decision, kill switch disabling upload-and-review in seconds with fallback copy, quarterly red-team cadence feeding the golden set.

**6. Budget, with numbers.** Measured on the spike: 12k median tokens in (parsed contract segment plus system and tools), 900 out; frontier model at current rates, roughly 3.2 cents per review including the repair-rate allowance; p95 TTFT 1.2 s, total 28 s for a 20-page document (streamed with honest status events); target volume 300 reviews/day ≈ 9.6 dollars/day, alarmed at 8 dollars/day spend velocity. Caching: exact for repeated identical uploads (analysts re-open), tool-layer cache for the clause library. Routing (deferred, honestly): the spike shows one difficulty class — revisit at 1,000 reviews/day.

**7. Deploy checklist and dashboard.** Staging parity (same prompt version, same model id); secrets in the store, none in prompts; quotas on; moderation ladders set; dashboards: cost per prompt_version, p95 TTFT and total, repair rate per field, injection-attempt count, cache hit rate; alert thresholds written; kill switch tested; rollback = config point at the previous prompt version; runbook page one: trace id in every support report. Then the hard part, named out loud: what you are NOT building yet — memory across reviews (Module 4 strategies when a real need appears), semantic cache (traffic too small), multi-provider failover (capability parity unverified for this task), fine-tuning (the prompt-plus-schema eval is nowhere near its ceiling). Deferral with reasons is the mark of the assembled engineer.`,
        diagram: `flowchart LR
  S["1-page spec + spike"] --> A["architecture: named stages"]
  A --> P["versioned prompts + tool schemas"]
  P --> E["eval harness: 15 cases, 3 classes, CI gate"]
  E --> T["threat model page + kill switch"]
  T --> B["cost + latency budget with alarms"]
  B --> D["deploy checklist + cost dashboard"]
  D --> F["deferred list with reasons"]
  subgraph loop ["the loop after launch"]
    V["version attribution"] --> M["measure classes"] --> X["one fix per cycle"] --> E
  end
  D -.-> loop`,
        extras: [
          table(
            'Capstone artifact checklist (one row per course module)',
            ['Artifact', 'Course source', 'Done means'],
            [
              ['One-page spec + spike results', 'M5', 'Go / re-scope / no-go written with numbers'],
              ['Stage-named architecture diagram', 'M5', 'Every arrow has a test and a metric'],
              ['Versioned system prompt + tools', 'M4, M5, M6', 'prompt_version on every completion'],
              ['15-case eval + CI gate thresholds', 'M8', 'Gate blocks a merge in staging rehearsal'],
              ['Threat model page + kill switch', 'M9', 'Switch tested; abuse table has owners'],
              ['Cost + latency budget with alarms', 'M10', 'Per-review cost measured, spend alarm firing in test'],
              ['Deploy checklist + dashboard', 'M2, M8, M10', 'Trace id in final event; rollback is a config change'],
            ],
          ),
          code(
            `# the capstone contract-review helper: the shape of the code you ship
# 1. spec: legal-ops analysts triage supplier contracts; flags + citations, not advice
# 2. stages (module 5): receive -> assemble -> guard_in -> call -> stream -> validate
#                      -> guard_out -> persist  (trace id throughout)

SCHEMA = ClauseFlags(
    flags=[ClauseFlag(clause_type: enum, page: int, quote: str, risk: enum, reason: str)],
    summary: str,                     # <= 150 words, rubric-checked in eval
    needs_human_review: bool,
    abstentions: list[AbsentReason],  # module 7 honesty
)

async def review(contract: Upload, ctx) -> Stream:
    trace = receive(ctx, contract)                       # auth, quota, idempotency
    pages, quality = parse_document(contract)            # module 7: classify, gate, provenance
    if quality == "poor":
        return honest_reject(trace, reason="low_quality_scan")
    segments = segment_by_clause(pages)                  # structure, not character windows
    guard_input(contract_text, ctx)                      # tripwire + audit (module 9)
    flags = []
    for seg in segments:                                 # budgeted; fan-out where independent
        out = await extract_flags(seg, schema=SCHEMA, prompt_version=PV)
        flags.append(validate_or_repair_or_queue(out))   # module 7 loop
    risk = summarise(flags, cap_words=150)
    guard_output(risk, ctx)
    persist(ctx, flags, risk, usage, trace, prompt_version=PV)
    return stream_result(flags, risk, trace)             # final event: usage, version, trace id

# gates that ship with it: eval gate (15 cases, thresholds in config),
# threat model (docs/threat-model.md, kill switch: disable review route),
# budget alarm (spend velocity > 8 USD/day), rollback (PV -> previous)`,
            'capstone.py',
            'python',
          ),
          tip(
            'The deferred list is a deliverable',
            'What you are not building, with the measurement that would change your mind, is what separates an engineer from a demo.',
          ),
          warn(
            'A capstone without the spike, the gate and the kill switch is a demo wearing a plan',
            'Feasibility, regression and containment are the three checks that make the rest safe to build.',
          ),
          info(
            'The interview version of this artifact is one screen',
            'Spec sentence, diagram, eval numbers, cost per unit, kill switch line — the demo candidate and the engineer are distinguishable in sixty seconds.',
          ),
        ],
        worked: {
          title: 'Assemble the contract-review helper in one pass',
          problem:
            'Take the capstone from spec to deploy checklist for the legal-ops contract reviewer, with the numbers that make each section a decision rather than a description.',
          steps: [
            {
              title: 'Spec and spike (decide before building)',
              desc: 'One-page spec as in the concept; then the 20-contract spike on a strong model with a draft schema: 18/20 on clean digital contracts, 12/20 on scanned schedules, clear failure class = OCR quality (Module 7 path), one genuine no-go candidate (nested cross-reference clauses) fixed by a second targeted pass. Decision: build, with scan-quality gating and the second pass budgeted — written as a paragraph a skeptic can check.',
              code_snippet:
                'spike: 20 contracts, hand-checked expected flags\nresult: digital 18/20, scans 12/20 (class: parse quality), cross-ref misses 4\n-> build + quality gate + second pass; cost model: 3.2 cents/review @ 12k tokens',
            },
            {
              title: 'Architecture, prompts, tools (the wiring)',
              desc: 'Stage diagram as in the concept, every arrow owned; system prompt v1 in four sections with the citation-and-abstain contract; two tools only (clause library lookup, allowlisted reference fetch); version attribution on every completion; mock provider path with six fixtures (Module 5) so the UI ships while the model is tuned.',
            },
            {
              title: 'Eval harness and gate (the discipline)',
              desc: 'Fifteen cases across the three classes; scoring mostly programmatic (field equality, span-in-source, must/must-not) plus one rubric line; thresholds: extraction and citation classes at baseline, zero new safety failures. Rehearsal: a prompt edit that tightens risk wording regresses two citation cases — blocked in CI with the class report; the gate worked before production existed to protect.',
            },
            {
              title: 'Threat model, budgets, deploy (the ship)',
              desc: 'One-page threat model with the contract-ingest boundary flagged; kill switch on the review route tested in staging (fallback copy from Module 3); spend alarm firing in a drill at the 8-dollar line; dashboards live: cost per prompt_version, p95 TTFT/total, repair rate per field, injection count, cache hits. Rollback rehearsed as a config change. Deferred list published in the repo: memory, semantic cache, multi-provider, fine-tuning — each with the measurement that would promote it.',
            },
          ],
          solution:
            'One pass, seven artifacts, zero new subjects: every section is a Part I or Part II module rendered as a decision with a number attached. The spike chose build-with-fixes; the gate caught a regression before launch existed; the threat model named the boundary suppliers actually attack; the budget made volume a conversation about dollars rather than vibes; and the deferred list did the quiet work of keeping the first version shippable. That is the whole course assembled: a spec that can say no, stages that can be tested, prompts that can be rolled back, evals that can block, controls that can fail visibly, and numbers that can be argued with.',
        },
        practice: {
          title: 'Build your capstone artifact',
          prompt:
            'Choose one: support agent, knowledge assistant or document extractor for a domain you know. Produce the seven artifacts: one-page spec with spike results; stage-named architecture diagram; versioned system prompt plus tool schemas; a fifteen-case golden eval (five extraction, five reasoning/citation, five safety) with scoring and CI thresholds; a one-page threat model with kill switch; a cost and latency budget with a real per-unit number and an alarm line; a deploy checklist and the deferred list with promotion criteria. Then present it in one screen and note which section took the longest — that is usually the one your next week of work should attack.',
          hint: 'If a section has no number in it (spike rate, cases, cents, thresholds), it is still a description — convert it to a decision.',
        },
        mistakes: [
          {
            mistake: 'Skipping the spike because the demo worked once',
            fix: 'Twenty representative cases with hand-checked expectations; the cheapest month of work you will ever save.',
          },
          {
            mistake: 'Eval harness with no safety class and no CI gate',
            fix: 'Three classes, written thresholds, a rehearsal where the gate blocks something — before launch, not after.',
          },
          {
            mistake: 'Threat model as an appendix nobody names an owner for',
            fix: 'One page, boundaries drawn, owners on rows, kill switch tested; deferral with reasons beats ornamental security.',
          },
          {
            mistake: 'Budgets as ranges with no alarm',
            fix: 'Measured per-unit cost times volume, spend-velocity alarm tested in a drill, rollback rehearsed as config.',
          },
        ],
        exam: {
          question:
            'List the seven capstone artifacts and the course module each comes from. For the contract-review helper, give the eval class breakdown and one abuse case with its control.',
          answer:
            'Artifacts: (1) one-page spec plus feasibility-spike results with a go/re-scope/no-go decision (M5); (2) architecture diagram with Module 5 stage names, every arrow owning a test and a metric (M5); (3) versioned system prompt in four sections plus flat tool schemas with attribution on every completion (M4, M5, M6); (4) a fifteen-case golden eval — five extraction/correctness, five reasoning-and-citation, five safety/refusal — scored mostly programmatically with written CI-gate thresholds (M8, building on M7 validation); (5) a one-page threat model with trust boundaries, abuse-case table with owners, and a tested kill switch (M9); (6) a cost and latency budget with a measured per-review number, p95 targets and a spend-velocity alarm (M10, built on M8 tracing); (7) a deploy checklist with staging parity, dashboards, rehearsed rollback and a published deferred list with promotion criteria (M2, M8, M10). Contract-review eval breakdown as above. Example abuse case: a supplier hides an indirect-injection payload in clause 14 aiming to make the assistant exfiltrate session content — control is layered (contract text labelled as data at ingest, no outbound tools beyond a two-host allowlisted fetch, output screen for prompt-phrase leakage, attempt logged and the payload added to the safety class of the golden set).',
          source: 'Capstone review: "show me the plan behind your LLM app, not the demo."',
        },
        summary: [
          'Spec and spike first — the gate that decides build, re-scope or decline.',
          'Named stages everywhere: every arrow owns a test and a metric.',
          'Versioned prompts, flat tools, attribution on every completion.',
          'Fifteen-case eval in three classes with thresholds that can block a merge.',
          'One-page threat model, tested kill switch, measured budget with a real alarm.',
          'The deferred list is a deliverable: deferral with promotion criteria is engineering.',
        ],
      }),
      [
        [
          'The capstone artifact that decides build, re-scope or decline before any shell code is:',
          [
            'The architecture diagram',
            'The one-page spec backed by a feasibility spike with hand-checked expectations',
            'The deploy checklist',
            'The cost dashboard',
          ],
          1,
          'The spike makes the expensive news cheap and early; everything downstream assumes its verdict.',
        ],
        [
          'In the eval harness, the safety class of cases exists to:',
          [
            'Pad the pass rate with easy wins',
            'Regression-test injection, refusal and diversion behaviour — the class that fails silently when prompts change',
            'Satisfy a compliance checkbox nobody reads',
            'Replace the threat model',
          ],
          1,
          'Safety behaviour regresses exactly like formatting does; only cases in the gate catch it.',
        ],
        [
          'The kill switch in the capstone deploy checklist must:',
          [
            'Exist as a config file entry',
            'Be tested — specific capability disabled in seconds, fallback UX ready, rehearsed before launch',
            'Contact the provider for a global halt',
            'Wait for the next deploy',
          ],
          1,
          'An unthrown switch fails at 2 a.m.; rehearsal is the control.',
        ],
        [
          'The deferred list should contain, for each item:',
          [
            'A complaint about the original scope',
            'The feature, the reason it waits, and the measurement that would promote it — deferral with criteria is the mark of the assembled engineer',
            'Only the feature names',
            'Nothing; deferral means it is dropped',
          ],
          1,
          'Named non-goals with promotion criteria keep version one shippable and the roadmap honest.',
        ],
      ]
    ),
  ],
};
