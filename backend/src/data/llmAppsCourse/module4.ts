// Module 4 — Context Engineering: System Prompts, Memory, Budgets, Truncation
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code } from '../nineBlocks';
import { lesson, M4, COURSE_ID } from './helpers';

export const module4: CourseModule = {
  id: M4,
  course_id: COURSE_ID,
  title: 'Module 4 — Context Engineering: System Prompts, Memory, Budgets, Truncation',
  summary:
    'The context window is a scarce, metered resource and the real interface of an LLM app. Design system prompts as versioned contracts with testable constraints; build conversation memory with windows, structured summaries and entity stores; budget the window across system, history, tools and user with real token counting; and manage overflow with a priority-based truncation ladder plus explicit state machines that keep flow state outside the window.',
  sort_order: 4,
  lessons: [
    lesson(
      M4,
      'lla-4-1',
      1,
      'System Prompt Design: Persona, Constraints, Contract, Safety',
      'The system prompt is your application standing contract. Assemble it in four sections, write constraints that are testable, keep instructions separate from data, and version the whole thing like the code it is.',
      16,
      nineBlocks({
        objectives: [
          'Assemble a system prompt from persona, constraints, output contract and safety sections',
          'Rewrite aspirational constraints into testable ones',
          'Separate instructions from user data at the prompt level with explicit delimiters',
          'Version and log prompts so every response knows which contract produced it',
        ],
        hook:
          'A team\'s system prompt has grown to nineteen hundred lines. It began as twelve, then someone added never say refund without an order number, then a tone note, then a competitor\'s name to avoid, then a formatting rule per feature. Quality has quietly dropped: the model follows the middle of the document and ignores both ends. Nobody can say which line to delete because nobody can say which line does what. A contract nobody can read is not a contract; it is sediment.',
        concept: `**What the system prompt is.** Everything that is true on every turn and is not user data. It carries product behaviour: who the assistant is, what it must and must not do, what shape answers take, and where the policy lines are. Treating it as a prompt to be clever with is the mistake; treat it as a specification to be maintained.

**The four sections.**

1. **Persona and role.** Who the assistant is: domain, voice, altitude. Short — persona does far less work than the prompt-crafting folklore suggests, and specificity lives in the constraints. A product persona encodes identity (the returns desk for ShopCo), not a character biography.
2. **Constraints.** Behavioural rules, written so a test can judge them. Compare: be concise versus answer in at most 120 words; be helpful with sources versus cite every policy claim with a bracketed document id; never invent versus if an order number is not in the context, say so and ask. Testable constraints become eval cases (Module 8); aspirational ones become vibes you cannot regress against.
3. **Output contract.** The shape of every response: structure of paragraphs, when lists are allowed, language matching the user, and — for structured endpoints — the semantic meaning of fields that the schema itself cannot express (Module 2, Lesson 3 defines the syntax; the system prompt defines what needs_human really means).
4. **Safety and policy.** Out-of-scope topics, refusal phrasing, PII rules (never ask for card or government id numbers), escalation paths. This is your product policy in text; provider-level moderation is a separate, complementary layer (Part II, M9 covers the whole abuse surface).

**Instruction versus data.** User content and retrieved documents are data. Wrap them in explicit delimiters, state once that content inside those delimiters is untrusted material to analyse, not instructions to follow, and never interleave system rules into user turns. This is a hygiene layer, not a security guarantee — real injection defence is Module 9 — but skipping it manufactures avoidable failures.

**Placement and length.** Put standing rules at the top where they are read first, and keep the document tight. Every line is paid in tokens on every turn (prefix caching from providers can soften the cost when the system block is byte-identical across calls — support and semantics vary; verify docs), and long prompts dilute attention: the middle of a huge document is where instructions go to die. For a bloated prompt, prune by ablation: delete a line, re-run the eval set, keep the deletion if nothing broke. That experiment turns sediment back into specification.

**System prompt is not a database.** Per-query facts — today\'s order status, the retrieved document, the user\'s current cart — do not belong in the system prompt. The system prompt holds always-true rules; data arrives per turn through the assembly layer. When teams stuff data into system for convenience, they get stale data, bloated costs, and a prompt that cannot be versioned without redeploying facts.

**Version it like code.** Name and version the prompt (returns-desk/v4), keep a changelog entry per bump stating why, store it in reviewable config, promote through staging with an eval gate, and log prompt_version on every completion (Module 1, Lesson 3 made the column; this is why it exists). Prompt changes are product changes; they deserve the same discipline as a code diff — because they are one.`,
        extras: [
          table(
            'The four sections with example lines',
            ['Section', 'Job', 'Example line', 'Test'],
            [
              ['Persona', 'Identity and voice', 'You are the returns desk for ShopCo support', 'Tone sample in eval set'],
              ['Constraints', 'Testable behaviour', 'Answer in at most 120 words', 'Token/word count check'],
              ['Output contract', 'Shape and semantics', 'Cite a document id for every policy claim', 'Citation presence check'],
              ['Safety and policy', 'Boundaries and escalation', 'Never request card numbers; offer human handoff', 'Red-team cases'],
            ],
          ),
          code(
            `// prompt as reviewable, versioned config - not a magic string\nexport const PROMPT = {\n  name: "returns-desk",\n  version: "v4",\n  changelog: [\n    { v: "v4", why: "cite document ids on policy claims (T-812)" },\n    { v: "v3", why: "removed 40 lines of duplicated tone guidance" },\n  ],\n  build(vars: { locale: string }) {\n    return [\n      section("Persona",\n        "You are the returns desk for ShopCo. Practical, plain language."),\n      section("Constraints",\n        "- Answer in at most 120 words.\\n" +\n        "- Cite a [doc:id] for every policy claim.\\n" +\n        "- If an order id is not in context, say so and ask for it."),\n      section("Output contract",\n        "Lead with the answer, then the policy line, then next steps."),\n      section("Safety",\n        "Never request card or government ids. Escalate threats of harm to a human."),\n      "User locale: " + vars.locale,\n    ].join("\\n\\n");\n  },\n};\n\n// logged with every completion\nlog({ prompt_version: PROMPT.version, model, trace_id });`,
            'promptConfig.ts',
            'ts',
          ),
          tip(
            'Write constraints the way you write assertions',
            'If you cannot imagine a test for the sentence, it is a vibe — cut it or rewrite it until a test fits.',
          ),
          warn(
            'Data in the system prompt is a stale-cache bug wearing a convenience costume',
            'Always-true rules live in system; per-query facts ride in the assembled context where they can expire honestly.',
          ),
        ],
        worked: {
          title: 'Rebuild a bloated prompt into a versioned four-section contract',
          problem:
            'The nineteen-hundred-line returns-desk prompt is underperforming and unreviewable. Reduce it to a four-section contract, wire versioning and logging, and set up the ablation process that keeps it from growing back.',
          steps: [
            {
              title: 'Audit: what is actually in the 1,900 lines',
              desc: 'A day of reading finds: 200 lines of genuine policy, 600 lines of duplicated tone and style guidance from three rewrites that were appended not replaced, 700 lines of per-feature formatting rules that belong in output contracts, and 400 lines of order data pasted for convenience. Only the first bucket belongs where it is.',
            },
            {
              title: 'Rewrite in four sections with testable constraints',
              desc: 'Policy distilled to the claims with document ids; style compressed to one exemplar paragraph; formatting moved to a short output contract; data removed to the assembly layer where it can be fetched fresh per turn.',
              code_snippet:
                '### Persona\nYou are the returns desk for ShopCo. Practical, plain.\n\n### Constraints\n- At most 120 words per answer.\n- Every policy claim carries [doc:<id>].\n- Missing order id -> say so, ask for it. Never invent.\n\n### Output contract\nAnswer first, then policy line with citation, then next steps.\n\n### Safety\nNo card or government ids. Threats -> human escalation.',
            },
            {
              title: 'Version, log, gate',
              desc: 'Store as returns-desk/v4 with a changelog line stating why. Add prompt_version to every completion log. Run the 40-case eval set before promoting: two cases regress (citation missing on refund-window answers) — fix the constraint wording, re-run, promote at v5.',
            },
            {
              title: 'Ablation as maintenance',
              desc: 'Quarterly, delete one constraint at a time and re-run the set. Lines nothing depends on are documentation, not behaviour — move them to docs or delete. This is how a prompt stops being sediment.',
            },
          ],
          solution:
            'The prompt shrank from 1,900 lines to under forty and became reviewable: four sections, each constraint testable, data evicted to the assembly layer, and a version plus changelog that make every behavioural change attributable. The eval gate caught the one real regression the rewrite introduced, which is precisely the point of gating prompt changes like code. And the ablation habit gives the team a lawful way to shrink the document again after every well-meaning append — the process fix that stops the next nineteen hundred lines.',
        },
        practice: {
          title: 'Cut your system prompt to four sections',
          prompt:
            'Take your current system prompt. Split it into persona, constraints, output contract and safety; delete duplicates; move data out to context assembly; rewrite three aspirational constraints as testable ones. Add version plus changelog and log prompt_version on every call. Report the before/after token count and which lines you could not classify.',
          hint: 'Every line should answer: which test would fail if I deleted this? If none would, the line is not behaviour.',
        },
        mistakes: [
          {
            mistake: 'Aspirational constraints with no test',
            fix: 'Write numbers, formats and citation rules a checker can judge; vibes cannot be regression-gated.',
          },
          {
            mistake: 'Stuffing per-query data into the system prompt',
            fix: 'Always-true rules in system; fresh data assembled per turn where it can expire and be versioned honestly.',
          },
          {
            mistake: 'Appending prompt changes instead of editing them',
            fix: 'Rewrite in place under version control with a changelog; appends create the nineteen-hundred-line sediment problem.',
          },
          {
            mistake: 'Shipping prompt edits without an eval gate',
            fix: 'Promote through a golden set under version control; a prompt change is a product change and deserves a diff and a check.',
          },
        ],
        exam: {
          question:
            'Describe the four sections of an application system prompt, explain the difference between a testable constraint and an aspirational one with an example of each, and state where per-query data belongs and why.',
          answer:
            'Sections: (1) persona and role — domain, voice, altitude, kept short because specificity lives elsewhere; (2) constraints — behavioural rules the application must follow; (3) output contract — the shape and semantics of every answer, complementing any schema; (4) safety and policy — scope boundaries, refusal phrasing, PII rules and escalation. Testable versus aspirational: be concise is aspirational (no checker can judge it); answer in at most 120 words is testable (a counter can), and testable constraints become eval cases that catch regressions. Per-query data — order status, retrieved documents, current cart — belongs in the assembled per-turn context, not the system prompt: data in system goes stale, bloats every request, and cannot be changed without redeploying what is supposed to be an always-true contract. The system prompt is for rules; the assembly layer is for facts.',
          source: 'Standard prompt-architecture question for LLM application engineers.',
        },
        summary: [
          'System prompt = standing product contract: persona, constraints, output contract, safety.',
          'Constraints must be testable; vibes cannot be regression-gated.',
          'Data is not rules: per-query facts belong in assembly, not in the standing contract.',
          'Version, changelog and prompt_version logging make behaviour changes attributable.',
          'Prune by ablation against an eval set; appends without edits are how prompts die.',
          'Keep it tight: every line is paid per turn and the middle of a huge prompt is where instructions go to die.',
        ],
      }),
      [
        [
          'Which line is a testable constraint?',
          [
            'Answer in at most 120 words and cite a document id for every policy claim',
            'Be concise and helpful',
            'Use a professional tone',
            'Do your best for the customer',
          ],
          0,
          'Numbers and artefacts can be checked by a test; adjectives cannot.',
        ],
        [
          'Today\'s order status should be included:',
          [
            'In the system prompt, so it is always available',
            'In both places, for redundancy',
            'In the per-turn assembled context, fetched fresh — system holds always-true rules, not facts that expire',
            'In the user profile only',
          ],
          2,
          'Facts in the standing contract go stale and bloat every call; rules stay, facts are fetched.',
        ],
        [
          'A prompt change should ship by:',
          [
            'Editing the live console string during the incident',
            'Appending the new rule to the end of the prompt',
            'Asking the model to remember the update',
            'Versioned config with a changelog, gated by an eval set before promotion',
          ],
          3,
          'Behaviour changes deserve diffs, reviews and regression checks — same as code.',
        ],
        [
          'User-uploaded document text in the context should be:',
          [
            'Interleaved into system rules for convenience',
            'Delimited and described as untrusted data to analyse, not instructions to follow',
            'Summarised into the persona section',
            'Dropped entirely',
          ],
          1,
          'Delimiters plus a data-is-not-instructions line is prompt-level injection hygiene; full defence is Module 9.',
        ],
      ]
    ),
    lesson(
      M4,
      'lla-4-2',
      2,
      'Conversation Memory: Windows, Summaries and Entities',
      'Long conversations break naive resend. Choose a strategy — sliding window, structured summarisation, entity extraction, or the hybrid real apps converge on — and know the failure modes each one produces.',
      16,
      nineBlocks({
        objectives: [
          'Choose a memory strategy matched to the task and the token budget',
          'Design a structured summary schema that preserves corrections and verbatim constraints',
          'Extract durable facts into an entity store with provenance',
          'Diagnose memory failures: stale summary, lost constraint, drift, duplication',
        ],
        hook:
          'A travel assistant summarises the conversation every ten turns. On turn forty it cheerfully books Delhi to Pune, the trip the user corrected away on turn three. The summary says the user prefers Pune, because summaries are lossy compression and the correction was a small sentence in a large turn. The assistant did not hallucinate; it played telephone with its own memory and lost the one field that mattered.',
        concept: `**The default failure.** Resend everything and the cost curve from Module 1 eventually bites; also, very long transcripts are not used very well — instructions at the top and questions at the bottom are attended, and the middle is famously slippery (the lost-in-the-middle effect; long-context capability keeps improving, so verify current model behaviour rather than assuming worst case). Memory design exists because of both: money and attention.

**Strategy 1: sliding window.** Keep the last K turns (or K tokens) plus the standing system prompt. Cheap, predictable, and fine when only recent turns matter — most support threads, most chat. It loses early facts by design, which is acceptable only if durable facts live elsewhere (strategy 3). Choose K from the budget (Lesson 3), not from folklore.

**Strategy 2: summarisation.** Periodically compress older turns into a standing summary that rides at the boundary between retained history and system. Done badly it is exactly the telephone failure above. Done well:

- Trigger by tokens or turns, not vibes.
- Use a schema, not free prose: goal, decided facts, corrections (with what was rejected and why), open items, user constraints. Corrections are the field that prevents the booking-from-Pune disaster.
- Copy verbatim what must be exact: dates, amounts, ids, names. Summarise style; never paraphrase contracts.
- Keep provenance: summary_of turn range, generated_at. When a claim looks wrong, you can find when it entered memory.
- Keep recent raw turns alongside the summary so the model can verify against primary evidence.
- Re-summarise hierarchically (turns to episode, episode to session) instead of summarising a summary forever — each compression step invents a little.

**Strategy 3: entity and key-value extraction.** Pull durable facts into structured storage: name, trip dates, plan tier, constraints. Inject only what the current turn needs (retrieval over your own memory). This is testable, editable by the user (that UI is a trust feature), survives sessions, and keeps the window flat. Cost: an extractor model or rules, with its own error rate — so make facts user-visible and correctable.

**Strategy 4: hybrid — what real apps converge on.** Recent raw window plus structured summary plus injected entity subset plus, where relevant, retrieved past episodes. Each layer handles what it is good at: recency, narrative continuity, exact facts, and history search.

**Failure modes, named.** Stale summary contradicting newer turns (raw beats summary; reconcile on conflict). Lost constraint (hard requirements must live in entities, not only in prose summaries). Summary drift (re-summarisation invents; keep provenance and raw checkpoints). Duplication (summary and raw both present; mark ranges so the model knows what is compressed). Unbounded growth (memory itself becomes the overflow problem — budgets and TTLs apply to memory too). And the privacy failure: remembering what you promised to forget. Deletion must reach summaries, entities and caches.

**The principle.** State that matters to flow lives in code and storage; state that matters to tone and narrative lives in context; state that must be exact lives as structured facts. The window is for what only the model can hold — everything else is a database with a nicer name. The diagram below shows the hybrid: four memory feeds into one assembler, and the model sees a flat context of the same shape every turn.`,
        diagram: `flowchart LR
  T["Recent turns (raw window)"] --> A["Assembler"]
  S["Structured summary (goal, decisions, corrections)"] --> A
  E["Entity store (exact facts, user-editable)"] --> A
  D["Retrieved past episodes (on demand)"] --> A
  A --> M["Model call: flat context, same shape every turn"]`,
        extras: [
          table(
            'Memory strategies compared',
            ['Strategy', 'Keeps', 'Loses', 'Use when'],
            [
              ['Sliding window', 'Last K turns', 'Everything older', 'Recent turns dominate the task'],
              ['Rolling summary', 'Goal, decisions, corrections', 'Verbatim detail', 'Long narrative threads'],
              ['Entity store', 'Exact durable facts', 'Dialogue colour', 'Facts must survive sessions'],
              ['Hybrid', 'All three, injected by need', 'Nothing silently', 'Real assistants in production'],
            ],
          ),
          code(
            `// structured summary: schema first, prose second\nconst SummarySchema = {\n  goal: string,           // what the user is trying to do\n  decided: string[],      // facts both parties agreed\n  corrections: [{        // THE field that prevents drift\n    rejected: string, kept: string, why: string,\n  }],\n  openItems: string[],\n  constraints: string[],  // hard user requirements, verbatim\n};\n\nasync function rollup(olderTurns, recentTurns) {\n  const s = await chat({\n    messages: [\n      { role: "system", content: SUMMARY_PROMPT },   // schema + rules\n      { role: "user", content: serialize(olderTurns) },\n    ],\n    response_format: { type: "json_schema", json_schema: SummarySchema },\n  });\n  const parsed = validate(s);\n  return {\n    summary: parsed,\n    provenance: { from: olderTurns[0].n, to: olderTurns.at(-1).n,\n                  generatedAt: Date.now() },\n    // recentTurns stay raw so the model can check primary evidence\n  };\n}`,
            'memory.ts',
            'ts',
          ),
          tip(
            'Corrections deserve their own field',
            'A one-line rejected-versus-kept record is what stops a summary from confidently carrying the wrong preference forward.',
          ),
          warn(
            'A summary is a lossy cache, not the truth',
            'On conflict, recent raw turns win; keep provenance so you can trace when a claim entered memory.',
          ),
        ],
        worked: {
          title: 'Fix the telephone: hybrid memory for a booking assistant',
          problem:
            'A booking assistant with free-prose rolling summaries lost a correction and proposed the wrong city. Redesign the memory layer: window, schema, entities, provenance — and a reconciliation rule.',
          steps: [
            {
              title: 'Reproduce: find where the fact went',
              desc: 'Inspect the stored summary: goal and dates correct; the correction (user rejected Pune, kept Goa) is absent — it was one sentence inside turn 3 and the free-prose rollup compressed it away. Provenance is missing entirely, so nobody can tell which rollup dropped it.',
            },
            {
              title: 'Schema the summary, force corrections in',
              desc: 'Rollup now produces a structured object with a corrections array and verbatim constraints. The rollup prompt instructs: every user correction must appear with rejected, kept and why; dates and amounts are copied exactly.',
            },
            {
              title: 'Entities for what must be exact',
              desc: 'City, dates and budget move to an entity store, injected per turn and editable in a small memory UI. A correction now updates a row — it can no longer be compressed out of existence by a later rollup.',
              code_snippet:
                'entities: { destination: "Goa", dates: "2026-11-03..11-08",\n           budget_inr: 120000 }\n\n// user edits "actually Pune" -> update row + append correction\n// injection next turn: exact facts from rows, narrative from summary',
            },
            {
              title: 'Reconcile on conflict, keep the window honest',
              desc: 'Assembly rule: on any conflict, recent raw turns and entity rows beat the summary; the summary is rewritten at the next rollup. Window: last 8 turns raw plus summary plus needed entities — flat context regardless of session length.',
            },
          ],
          solution:
            'The failure decomposed into three missing pieces: corrections had no home, exact facts lived only in prose, and nothing tracked where memory came from. The schema gives corrections a required field, the entity store gives facts an address the user can edit, and provenance makes any future drift traceable to a rollup. The window-plus-summary-plus-entities hybrid keeps context size flat while preserving both narrative continuity and contractual exactness — the two things free-prose memory reliably trades against each other.',
        },
        practice: {
          title: 'Build a window and beat it with a rollup',
          prompt:
            'Run a 20-turn conversation with a fixed sliding window. Record tokens per turn and whether an early hard constraint (a budget, a date) still reaches the model at turn 20. Then add a structured rollup with a corrections field and an entity row for the constraint, and show that it survives to turn 40 in both designs.',
          hint: 'If you cannot point at where an early constraint lives in context at turn 40, your memory design is hope.',
        },
        mistakes: [
          {
            mistake: 'Free-prose summaries with no schema',
            fix: 'Schema the rollup: goal, decisions, corrections, open items, constraints — prose compresses away exactly what you needed.',
          },
          {
            mistake: 'Losing user corrections during rollup',
            fix: 'Require a corrections array with rejected, kept and why; corrections are the load-bearing field of honest memory.',
          },
          {
            mistake: 'Keeping exact facts only in the summary',
            fix: 'Dates, amounts and ids belong in an entity store: editable, verifiable, and immune to compression drift.',
          },
          {
            mistake: 'Letting memory grow without budget or TTL',
            fix: 'Memory is context too: window caps, rollup triggers and retention limits keep it inside the same budget discipline.',
          },
        ],
        exam: {
          question:
            'Compare sliding-window memory, structured summarisation and entity extraction. Describe the telephone failure in rolling summaries and the three design choices that prevent it. What wins on conflict?',
          answer:
            'Sliding window keeps the last K turns and is cheap and predictable, but drops everything older by design — acceptable only if durable facts live elsewhere. Structured summarisation compresses older turns into a standing summary, preserving narrative continuity and intent at the cost of detail; it must be schema-driven (goal, decisions, corrections, open items, constraints) with verbatim handling of dates and amounts. Entity extraction stores durable facts as structured rows — testable, user-editable, session-surviving — at the cost of an extractor and a correction UI. The telephone failure: free-prose rollups compress away a small correction sentence, so the summary confidently carries the rejected preference forward. Prevention: (1) a required corrections field recording rejected, kept and why; (2) verbatim copy for contractual values; (3) provenance (turn range, timestamp) plus retained recent raw turns so claims can be traced to primary evidence. On conflict, recent raw turns and entity rows win over the summary; the summary is then rewritten to match.',
          source: 'Design interview topic: long-term conversation memory in production assistants.',
        },
        summary: [
          'Resend-everything dies on cost and attention; memory strategy is a design, not an accident.',
          'Windows for recency, schema rollups for narrative, entities for exactness — hybrid wins in production.',
          'Corrections are the load-bearing field: rejected, kept, why.',
          'Dates and amounts are copied verbatim; style is summarised; provenance is mandatory.',
          'On conflict, raw recent and entities beat the summary — a summary is a lossy cache.',
          'Memory needs budgets, TTLs and deletion paths like every other layer.',
        ],
      }),
      [
        [
          'The booking assistant ignores a correction made early in the session. Root cause most consistent with the symptoms:',
          [
            'The model cannot understand corrections at all',
            'Temperature was too low',
            'Free-prose summarisation compressed the correction away; structured corrections fields and entity rows keep it load-bearing',
            'The window was too large',
          ],
          2,
          'Lossy compression drops small but critical sentences; schema and storage make corrections durable.',
        ],
        [
          'Where should the exact travel dates of a multi-turn booking live?',
          [
            'Only in the rolling summary prose',
            'In the system prompt forever',
            'Nowhere; the model will infer them',
            'In an entity store, injected per turn — summaries may compress, facts must not',
          ],
          3,
          'Contractual values need an address outside the lossy path, ideally user-editable and verifiable.',
        ],
        [
          'A summary conflicts with the last three user turns. Assembly should:',
          [
            'Prefer the summary, since it is more recent overall',
            'Prefer recent raw turns and entities, then rewrite the summary at the next rollup',
            'Send both with a vote',
            'Drop the session',
          ],
          1,
          'The summary is a cache; primary evidence wins, and the cache is refreshed to match.',
        ],
        [
          'What does provenance in a summary buy you?',
          [
            'The turn range and time a claim entered memory, so drift is traceable to a specific rollup',
            'Fewer tokens',
            'Stronger model attention',
            'Automatic deletion of old turns',
          ],
          0,
          'Without provenance, a wrong remembered claim is unexplainable; with it, you can find the rollup that invented it.',
        ],
      ]
    ),
    lesson(
      M4,
      'lla-4-3',
      3,
      'Token Budgeting: Counting and Allocating the Window',
      'Tokens are the unit of cost, latency and capacity. Count them with a real tokenizer, allocate the window across system, history, tools and user with a written policy, and calibrate your estimates against the usage the provider reports.',
      16,
      nineBlocks({
        objectives: [
          'Count tokens with the model tokenizer and check requests against a written budget',
          'Allocate a window across system, tools, memory, history, documents and output',
          'Compute the quadratic cost curve of a conversation and set per-session caps',
          'Calibrate pre-counts against reported usage and act on overflow before the provider rejects',
        ],
        hook:
          'A team chose a very large context model so we never have to think about tokens. Their assistant ships with tool schemas, forty turns of history, and a pasted thirty-thousand-token policy document. On turn fifty-five, requests start failing and the user sees something went wrong. The window was not the problem they avoided; it was the problem they stopped measuring — and the bill had been quietly quadratic the whole time.',
        concept: `**Why counting is non-negotiable.** Every practical property of your feature rides on tokens: price (input and output priced per million, output usually several times pricier), latency (prefill grows with input, so a bloated context slows time-to-first-token even when it fits), capacity (the window is finite), and rate limits (many providers meter tokens per minute, not just requests). Characters divided by four is a fine early heuristic for English prose, but budgets deserve the real tokenizer — tokenizers differ across providers and languages, and your estimates should not be the thing that surprises you in production.

**The quadratic bill, restated with numbers.** History is resent, so turn N costs roughly the running prefix. For thirty turns averaging eight hundred tokens, total input across the session is about 800 × (1 + … + 30) ≈ 372,000 tokens — the cost of roughly 465 average turns paid to serve thirty. Illustrative pricing: at three dollars per million input tokens that is a little over a dollar per conversation before tool schemas and system prompt, which are themselves paid thirty times. Verify current pricing, then plot your own curve: it is the most under-read chart in LLM product analytics.

**The allocation table.** A budget is a written policy with numbers, not a vibe. Example for a 32,000-token window on a document-QA assistant:

- system prompt: 1,200 (the contract, never truncated below its floor)
- tool schemas: 1,800 (only tools available this turn)
- memory (summary plus entities): 3,000
- history window: 14,000
- retrieved documents: 8,000
- current user turn: 1,500
- reserved output: 2,000
- headroom: 500

Sums to the window with room to breathe. The reservation rule matters most: output must fit inside the window with input, so you budget output first and constrain the rest — never let history fill the window and hope the answer fits.

**The pipeline.** Assemble components, tokenize each (local tokenizer matching the provider, or a count endpoint where offered — verify current docs), sum against the allocation, then assert: pre-count plus output reservation is within the window. When it is not, truncate per policy (Lesson 4) — do not let the provider reject the request, because a 400 from overflow is a failure your architecture caused and the user cannot fix.

**Calibrate against reality.** Log your pre-count beside the provider-reported prompt tokens on every response. The delta is your estimator error: tool-message overhead, image tokens, provider-specific formatting. Correct the estimator and your budgets stop being lies. Teams that skip calibration argue about window sizes with numbers that were never real.

**App-level caps.** Max history tokens per session, max upload size, max turns per session, and a per-user token budget per day wired to the spend controls of Module 2. Meter every response — including failures — into the ledger (Module 1, Lesson 3 built the columns). Caps turn cost incidents into feature decisions: when a user hits the cap, that is a product moment (upgrade, wait, shorten), not an apology.

**Latency deserves a line in the budget.** A request that fits the window but takes twelve seconds of prefill to start streaming has failed the latency budget (Module 3). Big contexts are not free just because they fit.`,
        extras: [
          table(
            'A 32k window allocation policy',
            ['Component', 'Budget (tokens)', 'Floor', 'Overflow action'],
            [
              ['System prompt', '1,200', 'Never cut', 'Alert — contract changed without review'],
              ['Tool schemas', '1,800', 'Active tools only', 'Drop inactive tools'],
              ['Memory (summary + entities)', '3,000', 'Entities intact', 'Re-rollup summary'],
              ['History window', '14,000', 'Last 2 turns', 'Drop oldest raw, keep summary'],
              ['Retrieved documents', '8,000', 'Top chunks', 'Lower k, re-rank'],
              ['Current user turn', '1,500', 'Always whole', 'Ask for shorter input'],
              ['Reserved output', '2,000', 'Always reserved', 'Reduce max_tokens only knowingly'],
            ],
          ),
          code(
            `// budget check at assembly time: fail before the provider does\nconst BUDGET = {\n  window: 32_000, system: 1_200, tools: 1_800, memory: 3_000,\n  history: 14_000, docs: 8_000, user: 1_500, output: 2_000, headroom: 500,\n};\n\nfunction assertFits(parts, usage) {\n  const count = (s) => tokenizer.encode(s).length;\n  const sum = Object.entries(parts)\n    .filter(([k]) => k !== "output")\n    .reduce((n, [, v]) => n + count(v), 0);\n  if (sum + BUDGET.output > BUDGET.window - BUDGET.headroom)\n    throw new OverflowError({ sum, policy: "truncate_per_ladder" });\n  return { sum, reported: usage?.prompt_tokens ?? null };\n}\n\n// calibration: pre-count vs reported, every call\nlog({ trace_id, estimated: sum, reported: usage.prompt_tokens,\n      delta: usage.prompt_tokens - sum, prompt_version });`,
            'budget.ts',
            'ts',
          ),
          tip(
            'Reserve output before you allocate anything else',
            'History always expands to fill space it is given; the output reservation is the line it must not cross.',
          ),
          warn(
            'A window that fits is not a budget',
            'Without allocation, floors and overflow actions, every conversation eventually becomes an incident with a generic error message.',
          ),
        ],
        worked: {
          title: 'Write the budget for a doc-QA assistant and calibrate it',
          problem:
            'A doc-QA assistant on a large-window model ships with no token policy: history unbounded, documents pasted whole, tool schemas always on. Requests occasionally fail at overflow and cost per conversation is a surprise every month. Build the policy.',
          steps: [
            {
              title: 'Measure first: where the tokens actually go',
              desc: 'Instrument one week: system 1.1k average, tool schemas 2.3k (twelve tools, all always attached), history climbing to 40k by turn twelve, documents up to 25k, and 6 percent of requests dying at the provider with context-length errors. The data settles the allocation argument before it starts.',
            },
            {
              title: 'Write the allocation with floors and overflow actions',
              desc: 'Adopt the table from the extras for a 32k policy — with three product decisions inside it: only tools for the current feature are attached, documents are chunked and top-k packed instead of pasted whole, and history is windowed with a rollup. Every line has a floor and an overflow action, so assembly is deterministic.',
            },
            {
              title: 'Enforce at assembly, reserve output, cap sessions',
              desc: 'assertFits runs before the call: any overflow truncates per the ladder instead of failing at the provider. Per-session caps: 60k total tokens, 40 turns, 3 uploads — at the cap the user gets a product moment (start a new thread, upgrade), not a stack trace.',
            },
            {
              title: 'Calibrate and project the bill',
              desc: 'Log estimated versus reported prompt tokens: the estimator was 4 percent light because of tool-message overhead; correct it. Then plot cost per conversation against turn count — the curve now bends at the window instead of climbing forever, and the pricing page can be written with a straight face.',
              code_snippet:
                'week 1 deltas: reported - estimated = +3.8% avg\n  cause: tool message overhead + image parts\nfix: estimator applies 1.04 factor until re-measured\nresult: overflow errors 6% -> 0.1% (only user-supplied zips)',
            },
          ],
          solution:
            'The window stopped being a large number they ignored and became a policy with named lines, floors and overflow actions. Overflow now happens in assembly where it is cheap and deterministic, output is reserved so answers never truncate at the cap, and calibration makes the budget arithmetic honest instead of hopeful. The cost curve is finally legible per conversation, which is the precondition for every pricing and caching decision in Module 10. The lesson generalises: context windows are not free headroom; they are inventory you allocate.',
        },
        practice: {
          title: 'Write your allocation and calibrate it',
          prompt:
            'Instrument your app: tokens per component per request, pre-count versus reported, overflow incidents, cost per conversation over turns. Write the allocation table with floors and overflow actions, enforce it in assembly, and reserve output. After a week, report the calibration delta and where the largest reallocation had to be made.',
          hint: 'If your estimate and the provider-reported number disagree by more than a few percent, every other token decision you make is fiction.',
        },
        mistakes: [
          {
            mistake: 'Budgeting with characters divided by four and never checking',
            fix: 'Use the real tokenizer for budgets and calibrate against reported prompt tokens every call.',
          },
          {
            mistake: 'Filling the window with history and hoping output fits',
            fix: 'Reserve output first; history is what gets truncated, never the reservation.',
          },
          {
            mistake: 'Pasting whole documents and always attaching every tool schema',
            fix: 'Pack top chunks within a documents budget; attach only the tools this turn can use.',
          },
          {
            mistake: 'No per-session or per-user token caps',
            fix: 'Caps turn cost incidents into product decisions and connect directly to the spend controls of Module 2.',
          },
        ],
        exam: {
          question:
            'Why does conversation cost grow quadratically with turn count? Give an allocation policy for a 32k window with a reservation rule, and explain calibration against reported usage.',
          answer:
            'Because history is resent every call: turn N re-pays roughly the sum of prior turns, so cost per turn grows linearly and the session total grows with N squared — thirty turns averaging 800 tokens cost about 800 × 465 ≈ 372,000 input tokens in total. Allocation policy: reserve output first (for example 2,000 tokens), then divide the remainder into named lines — system 1,200 with a never-cut floor, tool schemas 1,800 for active tools only, memory 3,000, history 14,000, documents 8,000, current turn 1,500, headroom 500 — each with a floor and a documented overflow action (drop inactive tools, re-rollup, lower retrieval k, window history). Assembly enforces the budget and truncates per ladder rather than letting the provider reject at overflow. Calibration: log your tokenized pre-count beside the provider-reported prompt tokens on every response; the delta (from tool overhead, images, formatting) corrects the estimator so future budgets are measured, not guessed.',
          source: 'Cost-engineering question in LLM system design: window budgeting and token economics.',
        },
        summary: [
          'Tokens price the feature, set latency and cap rate limits — count with the real tokenizer.',
          'Resent history makes session cost quadratic; plot your curve before pricing anything.',
          'Budget is a table: named lines, floors, overflow actions, output reserved first.',
          'Enforce at assembly so overflow is your policy, not a provider 400.',
          'Calibrate pre-counts against reported usage; uncalibrated budgets are fiction.',
          'Caps per session and per user turn cost surprises into product decisions.',
        ],
      }),
      [
        [
          'Why does a 30-turn conversation cost far more than 30 times a single-turn call?',
          [
            'Providers apply a long-session surcharge',
            'Streaming costs extra per turn',
            'System prompts scale with history length',
            'Each turn re-sends the growing history, so session input grows with the square of turn count',
          ],
          3,
          'The resent prefix is the mechanism; the arithmetic of paying it every turn is what a budget manages.',
        ],
        [
          'When assembling context that does not fit the window, the correct first move is:',
          [
            'Let the provider reject and surface the error',
            'Truncate per a written priority ladder after reserving output — overflow is your policy, not an incident',
            'Delete the system prompt to make room',
            'Raise temperature so the model copes',
          ],
          1,
          'Assembly-time enforcement keeps control with you; the reservation protects the answer itself.',
        ],
        [
          'Calibrating token budgets means:',
          [
            'Comparing your tokenized pre-count with the provider-reported prompt tokens and correcting the estimator',
            'Asking the model how many tokens it used',
            'Using the context window size as the budget',
            'Counting only the user message',
          ],
          0,
          'The reported number is ground truth for billing; the delta teaches you what your counter misses.',
        ],
        [
          'A user hits the per-session token cap. The designed behaviour is:',
          [
            'A generic error toast',
            'Silently dropping the oldest history without telling anyone',
            'A product moment: offer a new thread, a shorter input, or an upgrade — the cap is policy, not punishment',
            'Doubling the window',
          ],
          2,
          'Caps convert cost incidents into decisions the user can understand and act on.',
        ],
      ]
    ),
    lesson(
      M4,
      'lla-4-4',
      4,
      'Truncation and State Machines: Context That Refuses to Shrink',
      'Design overflow as policy: a truncation ladder ordered by re-addability, cut-aware instructions, and explicit state machines that keep flow state in code so the window stays flat no matter how long the task runs.',
      16,
      nineBlocks({
        objectives: [
          'Order a truncation ladder by re-addability and never cut load-bearing pairs',
          'Implement an assembler with per-component floors and ceilings',
          'Model a multi-step flow as a state machine with state outside the context window',
          'Decide when a flow needs structure instead of more context',
        ],
        hook:
          'A loan-application assistant truncates oldest-first when it runs out of window. On turn nine it drops the middle of the conversation — including the step counter the model was using to remember where the application stood. The assistant restarts question three from scratch, the user re-enters a salary they already gave, and support files it as a model bug. The model had no idea where the flow was, because the only place the flow existed was inside the window that just got cut.',
        concept: `**Truncation is policy or it is an accident.** Without a designed ladder, overflow resolves itself in one of two bad ways: the provider rejects the request (visible, embarrassing) or generation quietly proceeds on a context that dropped something that mattered (invisible, worse). The ladder makes the choice explicit, ordered by one question: what can we re-obtain cheapest?

**The re-addability ladder.** Typical order for a chat-plus-tools app:

1. Stale retrieved documents and old tool results from prior turns — re-retrievable on demand. Drop or summarise first.
2. Middle-aged raw turns that already have a summary representation — replace raw with the summary bullet.
3. Old assistant verbose replies — the user can re-read them in the UI; a one-line gist suffices in context.
4. Early user turns — compress to intent bullets, never fully delete if they contain requirements.
5. Never drop: the current turn, the system contract, active tool schemas, extracted entity facts, and safety policy.

Floors guarantee each component a minimum (system never below its contract size; entities never below all-of-them); ceilings cap growth. Cut whole messages, never mid-message — and never sever a tool call from its result, because a call without its result is not smaller context, it is misleading context. Mark what was removed ([earlier turns omitted]) so the model does not invent continuity across the gap, or instruct it to ask rather than assume.

**Where truncation fails: multi-step flows.** A flow that tracks its own position inside free conversation is a flow waiting to be truncated. The fix is structural: make the application — not the model — own the step. A state machine names the states (collect income, verify identity, quote, confirm), the transitions, and the guards (a date is a date because code parsed it, not because the model felt it). The context then receives only what the current step needs: the step instructions, the structured fields collected so far, validation errors to correct. Context stays flat regardless of turn count; refresh mid-flow resumes from stored state; the transition table is unit-testable; and per-step prompts version independently.

In that pattern the LLM is a parser and a conversational surface inside a step — it turns messy user language into structured fields — while code is the controller. That is the LLM-as-a-function model (Module 1, Lesson 4) applied to flows. Invert the roles only for open-ended goals (research, drafting) where a plan must evolve; even then, checkpoint the plan to storage so the window is not the only copy.

**The hybrid that holds up.** State machine for the spine; free chat within a step; entity store for facts; summary for narrative; truncation ladder as the backstop when all of it still overflows. Each layer removes a class of failure: the ladder prevents silent loss, the state machine prevents loss from mattering, and the entity store prevents contractual facts from living in a lossy medium.

**The principle.** State that determines what happens next lives in code and storage. Context carries what only a language model can use: wording, tone, world knowledge, the messiness of human input. When you find yourself protecting a conversation from truncation, ask whether the thing you are protecting is really a value that belongs in a database.`,
        extras: [
          table(
            'Truncation ladder by re-addability',
            ['Priority to drop', 'Component', 'Why it is safe', 'Replacement'],
            [
              ['1', 'Stale docs and old tool results', 'Re-retrievable', 'Re-fetch on demand'],
              ['2', 'Middle raw turns', 'Already summarised', 'Summary bullet'],
              ['3', 'Old assistant replies', 'User can re-read', 'One-line gist'],
              ['4', 'Early user turns', 'Intent recoverable', 'Intent bullets; keep requirements verbatim'],
              ['Never', 'System, current turn, entities, active tools, safety', 'Load-bearing', 'Floored in the assembler'],
            ],
          ),
          code(
            `// assembler: floors, ceilings, whole-message cuts, cut marker\nconst LADDER = [\n  { part: "oldToolResults", reAdd: "retrievable" },\n  { part: "middleTurns",    reAdd: "summarised" },\n  { part: "oldAssistant",   reAdd: "gist" },\n  { part: "earlyUserTurns", reAdd: "bullets" },\n];\nconst FLOORS = { system: 1200, entities: "all", currentTurn: "whole",\n                 activeTools: "all" };\n\nfunction assemble(ctx) {\n  let parts = selectParts(ctx);          // per Lesson 3 allocation\n  while (overBudget(parts)) {\n    const next = LADDER.find(l => parts[l.part].size > 0);\n    if (!next) throw new BudgetError("floors exhausted");\n    parts[next.part] = shrink(next, parts[next.part]);\n  }\n  parts.notice = parts.cutAnything\n    ? "[earlier turns omitted - ask rather than assume]"\n    : "";\n  return toMessages(parts);              // whole messages only\n}\n\n// flow spine: the window never has to remember where we are\nconst FLOW = {\n  states: ["collect", "verify", "quote", "confirm"],\n  transitions: {\n    collect: { on: "fields_ok",  to: "verify"  },\n    verify:  { on: "id_ok",      to: "quote"   },\n    quote:   { on: "accepted",   to: "confirm" },\n    confirm: { on: "submitted",  to: "done"    },\n  },\n};`,
            'assembler.ts',
            'ts',
          ),
          tip(
            'Never cut a tool call away from its result',
            'A dangling call is not smaller context; it is context that lies about what happened.',
          ),
          warn(
            'A flow remembered only in the window is a flow waiting to be truncated',
            'Keep step and collected fields in storage; let the model handle language inside the current step.',
          ),
        ],
        worked: {
          title: 'Fix the loan assistant: ladder for overflow, state machine for flow',
          problem:
            'The loan assistant truncates oldest-first and lost the flow position on turn nine. Two changes: a ladder-based assembler with floors, and a state machine that owns step and collected fields outside the window.',
          steps: [
            {
              title: 'Name the real state of the flow',
              desc: 'Today the flow lives in prompt text and hope. Rewrite it as explicit states (collect → verify → quote → confirm → done) with transition events and guards: identity check is code, income is a parsed number, quote math is deterministic. The model never decides where the flow is; it only extracts and speaks.',
            },
            {
              title: 'Persist step and fields; assemble per step',
              desc: 'Session row stores step plus collected fields. Each turn, assembly injects: system contract, the current step instructions only, collected fields as data, validation errors to fix, and recent turns for tone. Early conversational history can vanish entirely without harming the flow — which is the whole point.',
              code_snippet:
                'session = { step: "verify", fields: { income: 900000,\n            city: "Pune" }, errors: [] }\n\n// this turn injects: step=verify instructions + fields + last\n// 2 turns for tone. History can drop to zero: flow survives.',
            },
            {
              title: 'Add the ladder for the parts that still overflow',
              desc: 'Document-heavy turns used to blow the window. The assembler now drops stale tool results first, replaces summarised middle turns with bullets, and floors system, entities and the current turn. A cut emits the omission marker so the model asks instead of assuming.',
            },
            {
              title: 'Verify the old failure class is gone',
              desc: 'Replay the turn-nine scenario: force an overflow mid-flow. The assistant continues from verify with the salary intact — the flow resumed from storage, the ladder cut only re-addable material, and no question was asked twice. Regression test: truncation cannot change flow behaviour.',
            },
          ],
          solution:
            'Two different problems had one symptom. Flow amnesia was fixed by moving step and fields out of the window entirely — the state machine owns them, code guards transitions, and the model handles language inside a step. Overflow sloppiness was fixed by the ladder: re-addable material goes first, load-bearing components are floored, cuts are marked. Truncation still happens; it just no longer matters to correctness. That is the design target: not a context that never shrinks, but a system whose behaviour does not depend on everything surviving.',
        },
        practice: {
          title: 'Write your ladder and extract one flow',
          prompt:
            'Write the truncation ladder for your app with floors and overflow actions, then implement the assembler and force an overflow in a test: confirm the load-bearing pieces survive and the omission marker appears. Separately, pick one multi-step flow currently carried in conversation, extract it into a state machine with stored fields, and measure how much context per turn it removes.',
          hint: 'Count how many tokens your flow instructions occupy per turn today; after extraction, the same flow usually costs a tenth of that — because it stops being re-explained to a forgetful model.',
        },
        mistakes: [
          {
            mistake: 'Oldest-first truncation with no ladder',
            fix: 'Order by re-addability: stale tool output first, load-bearing components floored, tool calls kept with their results.',
          },
          {
            mistake: 'Cutting mid-conversation with no omission marker',
            fix: 'Tell the model what was removed or instruct it to ask; silent gaps invite invented continuity.',
          },
          {
            mistake: 'Letting the model act as flow controller',
            fix: 'Step, collected fields and transitions belong in code and storage; the model extracts and phrases inside a step.',
          },
          {
            mistake: 'Protecting flow state by forbidding truncation',
            fix: 'Move flow out and truncation stops being dangerous; the window is for language, not for your state machine.',
          },
        ],
        exam: {
          question:
            'Describe a truncation ladder ordered by re-addability for a chat app with tools, including what must never be cut. Then explain why multi-step flows should be state machines outside the context window, and what the model\'s role becomes.',
          answer:
            'Ladder: drop first the stale retrieved documents and old tool results (re-retrievable); then middle raw turns already covered by a summary; then old assistant replies the user can re-read (keep a gist); then early user turns compressed to intent bullets with requirements kept verbatim. Never cut: the current turn, the system contract, active tool schemas, extracted entity facts and the safety policy — with floors enforced in assembly, whole-message cuts only, tool calls kept with their results, and an omission marker so the model does not invent continuity. Flows become state machines because a flow remembered only inside the window is one truncation away from amnesia: the application stores step, collected fields and transitions; guards (parsing, checks, quote math) are deterministic code; and each turn injects only the current step instructions plus stored fields and recent turns for tone. Context stays flat with turn count, refreshes resume, transitions are testable, and the model\'s role narrows to what it is good at: extracting structure from messy language and speaking naturally inside the current step.',
          source: 'System-design question: memory-safe multi-step LLM workflows.',
        },
        summary: [
          'Truncation is policy: order cuts by re-addability, floor the load-bearing, mark the gaps.',
          'Never sever a tool call from its result; never cut mid-message.',
          'Flows in the window are flows waiting to be truncated — own step and fields in storage.',
          'Code guards transitions; the model extracts and phrases inside a step.',
          'The goal is not an unshrunk context — it is behaviour that survives shrinking.',
          'Ladder plus state machine plus entities: three layers, three failure classes removed.',
        ],
      }),
      [
        [
          'A tool call from three turns ago must be dropped first. Why?',
          [
            'Tool results are the least accurate content',
            'They are re-addable: re-fetching is cheap and deterministic, so they sit at the top of the truncation ladder',
            'Providers forbid old tool results',
            'They confuse the attention mechanism entirely',
          ],
          1,
          'Re-addability is the ordering principle; re-obtainable material is the safest to cut.',
        ],
        [
          'A flow assistant forgets which step the user is on after a long session. Best fix:',
          [
            'Store step and collected fields in your session store and inject only the current step — the flow leaves the window entirely',
            'Increase the context window',
            'Repeat the full flow instructions every turn',
            'Raise temperature so the model remembers better',
          ],
          0,
          'Durable flow state belongs in code; context carries language, not your state machine.',
        ],
        [
          'When the assembler removes earlier turns, it should:',
          [
            'Say nothing so the answer looks clean',
            'Delete the session instead',
            'Include a marker such as [earlier turns omitted] or instruct the model to ask rather than assume continuity',
            'Also drop the system prompt to compensate',
          ],
          2,
          'Silent gaps invite invented continuity; a marker converts uncertainty into an honest question.',
        ],
        [
          'What must a truncation assembler never do?',
          [
            'Drop old documents',
            'Sever a tool call from its result or cut a message in half',
            'Keep the system prompt',
            'Summarise middle turns',
          ],
          3,
          'Dangling calls and sliced messages are not smaller context; they are misleading context.',
        ],
      ]
    ),
  ],
};
