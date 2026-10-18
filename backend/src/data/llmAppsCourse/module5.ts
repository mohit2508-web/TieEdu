// Module 5 — From Idea to First Working Slice
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code } from '../nineBlocks';
import { lesson, M5, COURSE_ID } from './helpers';

export const module5: CourseModule = {
  id: M5,
  course_id: COURSE_ID,
  title: 'Module 5 — From Idea to First Working Slice',
  summary:
    'The bridge from integration knowledge to a shipped feature: the request lifecycle as named, testable stages; prompts as versioned application config instead of pasted prose; model and task fit decided by a feasibility spike and the smallest model that passes your eval — including the judgement call to not use an LLM at all; and the thin vertical slice with a mock path and a frozen baseline, which is what Part II builds on.',
  sort_order: 5,
  lessons: [
    lesson(
      M5,
      'lla-5-1',
      1,
      'The Orchestration Layer: Anatomy of a Request Lifecycle',
      'Trace one request through named stages — receive, assemble, guard, call, stream, validate, persist — place cross-cutting hooks and trace ids correctly, and keep the pure stages unit-testable without a provider key.',
      16,
      nineBlocks({
        objectives: [
          'Name the stages of an LLM request lifecycle and the responsibility of each',
          'Place tracing, metering, moderation and caching hooks at the correct stage',
          'Separate pure assembly from I/O so context building is unit-testable',
          'Define the client-orchestrator API surface: typed SSE events and idempotent submission',
        ],
        hook:
          'A team has one nine-hundred-line handler. It authenticates the user, builds the prompt, calls the provider, parses JSON, writes three tables and emits analytics — in that order, in one function. Nobody can unit-test the prompt assembly because testing it requires a live API key and a database, and nobody can change the retry policy without risking the parsing branch. The orchestration layer is not missing; it is interleaved. And interleaved is unfixable under deadline pressure, so it stays interleaved.',
        concept: `**Name the stages.** A request through an LLM feature has a fixed shape once you look for it. Naming the stages in code is what turns a handler into an architecture:

1. **Receive** — authenticate, validate the request shape (fail before spending), check per-user quotas, check the idempotency key (Module 2, Lesson 4).
2. **Assemble** — the pure function: session history plus system prompt version plus retrieved data plus the current input becomes final messages, parameters and a budget check (Modules 1 and 4). No I/O lives here; that is what makes it testable with fixtures.
3. **Guard (input)** — moderation, injection heuristics, PII redaction. Cheap checks that should not waste a generation (Module 9 deepens this; the hook belongs here now).
4. **Call** — provider call with the error taxonomy, timeouts and retries of Module 2. The only stage that knows provider shapes.
5. **Stream** — deltas forwarded to the client; optional per-chunk checks; abort propagation from client disconnect (Module 1, Lesson 2).
6. **Validate** — parse, schema-check, one repair attempt (Module 2, Lesson 3); finish_reason handling including truncation and refusal.
7. **Guard (output)** — moderation on the way out, because input filters do not see what generation produced.
8. **Persist** — append messages, record usage and prompt version, write the trace (Module 1, Lesson 3).
9. **Respond** — final stream event with usage, finish reason and trace id; close.

**Cross-cutting concerns attach to stages, not to vibes.** Tracing: one trace id created in receive, attached to every log and the provider call, returned to the client for support. Logging: structured events per stage, secrets redacted. Metering: usage written in persist regardless of outcome. Caching: a cache lookup naturally sits between assemble and call, keyed on the assembled request — which is why assembly purity pays off twice. When a concern has a stage, it has a test and a dashboard.

**The API surface between client and orchestrator.** One endpoint per logical action (for example POST sessions/:id/messages) that returns a typed event stream: delta events carrying text fragments; a final event carrying usage, finish_reason, prompt_version and trace id; an error event carrying a taxonomy kind, never a raw provider dump (Module 3, Lesson 3). The client sends a message id it generated, so submission is idempotent across double-clicks and flaky networks.

**Testing the layers you can test without money.** Assemble is pure: fixtures in, messages out, assert on the exact transcript, token pre-count and truncation decisions. Validate is pure: bad payloads in, taxonomy out. Call is thin enough to test against a mock provider (Lesson 4 builds one and reuses it). The stage that needs a live key shrinks to a few lines — which is the whole point.

**Keep the layer thin.** Orchestration is control flow and policy, not cleverness. Before any framework, prefer a directory of named functions with typed boundaries; frameworks earn their complexity when you actually have graphs, loops and recovery policies (Part II agents will). Build the seam first: one module where the stages live, one place where providers are swapped, one place where a stage gets a metric. The diagram below is the pipeline to keep in your head.`,
        diagram: `flowchart LR
  R["Receive: auth, validate, quota, idempotency"] --> A["Assemble (pure)"]
  A --> G1["Guard in"]
  G1 --> C["Call: retries, timeouts"]
  C --> S["Stream deltas to client"]
  S --> V["Validate: schema, repair, finish_reason"]
  V --> G2["Guard out"]
  G2 --> P["Persist: messages, usage, trace"]
  P --> F["Final event: usage, version, trace id"]`,
        extras: [
          table(
            'Stages, jobs and tests',
            ['Stage', 'Job', 'Test without a provider key'],
            [
              ['Receive', 'Auth, validation, quota, idempotency', 'Request fixtures, quota table'],
              ['Assemble', 'History + prompt + data -> messages', 'Golden transcripts, token counts'],
              ['Guard in/out', 'Moderation, PII, injection heuristics', 'Red-team strings, snapshot policy'],
              ['Call', 'Provider I/O, retry taxonomy', 'Mock provider with scripted failures'],
              ['Validate', 'Schema, repair, finish_reason', 'Malformed payload corpus'],
              ['Persist / Respond', 'Usage ledger, trace, final event', 'In-memory store, event snapshots'],
            ],
          ),
          code(
            `// one request, named stages - each testable on its own\nexport async function runTurn(ctx: Ctx, input: UserTurn): Promise<void> {\n  const trace = newTraceId();\n  const req = await receive(ctx, input, trace);      // idem + quota here\n  const built = await assemblePure(req);             // fixtures-testable\n  assertBudget(built, req.tokenBudget);\n  guardInput(built.texts, ctx);\n\n  const stream = await callProvider(built, {         // only provider-aware stage\n    onAbort: req.signal,\n  });\n\n  try {\n    const reply = await pipeDeltas(stream, req.sse); // deltas -> client\n    const final = validateOrRepair(reply, built);    // schema + finish_reason\n    guardOutput(final.text, ctx);\n    await persist(ctx, final, { trace, promptVersion: built.version });\n    req.sse.final({\n      usage: final.usage, finishReason: final.finishReason,\n      promptVersion: built.version, traceId: trace,\n    });\n  } catch (err) {\n    req.sse.error(toUserError(err), trace);          // taxonomy, not a dump\n    throw err;\n  }\n}`,
            'runTurn.ts',
            'ts',
          ),
          tip(
            'If a stage has a name, it can have a metric',
            'p95 assemble time versus p95 provider time is the difference between debugging your app and guessing about someone else\'s.',
          ),
          warn(
            'Validation after persist is a data bug generator',
            'Validate and guard first; persist only payloads you would defend in a post-mortem.',
          ),
        ],
        worked: {
          title: 'Split the 900-line handler into named stages',
          problem:
            'One route does everything; a retry-policy change broke parsing last month. Refactor into stages without changing behaviour, and define what becomes testable at each step.',
          steps: [
            {
              title: 'Inventory the handler, assign each block a stage name',
              desc: 'Read top to bottom and label: auth and body checks (receive), history load and prompt build (assemble), moderation call (guard in), provider request with a two-attempt retry (call), delta forwarding (stream), JSON parse (validate), second moderation (guard out), three inserts (persist), response write (respond). Nothing is rewritten yet — the labels are the design.',
            },
            {
              title: 'Extract pure stages first',
              desc: 'assemble moves to its own module with typed inputs and no I/O: history rows, prompt version, retrieved chunks, current text in; messages, parameters, token pre-count out. Now a fixture test locks the exact transcript — the first regression test the team has ever had for prompt behaviour.',
              code_snippet:
                'test("assemble keeps last correction before summary", () => {\n  const built = assemblePure({\n    history: FIXTURE_HISTORY, promptVersion: "v4",\n    docs: [], current: "and add insurance",\n  });\n  expect(built.messages.at(-2).content).toContain("correction");\n  expect(built.preCount).toBeLessThan(built.budget);\n})',
            },
            {
              title: 'Wrap the provider call as the only aware stage',
              desc: 'The adapter owns retries and the error taxonomy; every other stage now speaks normalised types. Changing retry policy touches one file and cannot reach the parsing branch, because parsing no longer lives next to it.',
            },
            {
              title: 'Wire trace and final event, then measure',
              desc: 'Trace id created in receive is attached to all logs and returned in the final SSE event. One week of stage-level metrics later: assembly is 12 ms, provider is 2.4 s p95 — the team stops blaming their own code for latency, and the retry-policy debate happens with evidence.',
            },
          ],
          solution:
            'The handler became a pipeline with names, and each name unlocked the matching test: golden transcripts for assembly, scripted failures for the call layer, malformed payloads for validation. Retry policy changes now land in one file with a suite around them, and stage-level timing ends the finger-pointing about where latency lives. The refactor cost a day; the ongoing tax it removes — every future change negotiating with nine hundred interleaved lines — is unbounded. That is the orchestration layer paying for itself before a single new feature is built on top.',
        },
        practice: {
          title: 'Name your stages and test one pure stage',
          prompt:
            'Write the lifecycle table for your app: stage, responsibility, current owner, test. Extract assemble as a pure function with three fixture tests asserting the transcript and the token pre-count. Add a trace id that reaches the client final event. Report which stage was hiding the most bugs.',
          hint: 'If assemble needs a network call, it is not assembly — it is retrieval wearing the wrong name; inject the results instead.',
        },
        mistakes: [
          {
            mistake: 'Interleaving I/O, prompt building and parsing in one handler',
            fix: 'Extract named stages; keep assemble and validate pure so they test without keys, mocks or databases.',
          },
          {
            mistake: 'Validating and guarding after persist',
            fix: 'Order matters: validate and guard first, persist only what you would defend later.',
          },
          {
            mistake: 'No trace id across stages',
            fix: 'Create it in receive, thread it through logs and the provider call, return it in the final event.',
          },
          {
            mistake: 'Reaching for an agent framework before stages exist',
            fix: 'A directory of typed functions is the right complexity until you genuinely need graphs, loops and recovery policies.',
          },
        ],
        exam: {
          question:
            'List the stages of an LLM request lifecycle in order and give the responsibility of assemble and validate. Where do tracing, moderation and caching attach, and why must assemble stay pure?',
          answer:
            'Order: receive (auth, validation, quota, idempotency) → assemble → guard input → call (retries, timeouts) → stream deltas → validate (schema, repair, finish_reason) → guard output → persist (messages, usage, trace) → respond (final event). Assemble is the pure function that turns session history, prompt version, retrieved data and the current input into final messages, parameters and a token pre-count; validate parses the response, schema-checks it, attempts at most one repair and interprets finish reason. Tracing attaches at receive (one id for all logs and the client final event); moderation attaches twice — guard in before spending a generation, guard out on what generation produced; caching attaches between assemble and call, keyed on the assembled request. Assemble must stay pure because purity is what makes context building testable with fixtures — golden transcripts catch prompt and truncation regressions without a provider key, money or flakiness — and because a pure boundary is where a future provider swap or cache plugs in cleanly.',
          source: 'Architecture interview for LLM feature roles: structure the request path.',
        },
        summary: [
          'Nine named stages turn a handler into an architecture you can test and measure.',
          'Assemble and validate stay pure: fixtures in, transcripts and errors out, no keys required.',
          'The call stage is the only provider-aware one — retries and taxonomy live there and nowhere else.',
          'Guard in before spending, guard out before showing; persist only validated payloads.',
          'One trace id from receive to final event is what makes incidents reconstructable.',
          'Keep orchestration thin: named functions first, frameworks only when the graph earns them.',
        ],
      }),
      [
        [
          'Why must the assemble stage be pure (no I/O)?',
          [
            'It becomes unit-testable with fixtures: golden transcripts and token counts without keys, mocks or databases',
            'Providers forbid I/O there',
            'It is faster than I/O by definition',
            'Pure functions stream better',
          ],
          0,
          'Purity buys deterministic tests for the layer where prompt and truncation regressions actually happen.',
        ],
        [
          'Where should output moderation run?',
          [
            'Only on the user input, once',
            'In the browser after render',
            'After validation, before persist and respond — generation can produce what input never contained',
            'On a weekly batch job',
          ],
          2,
          'Guard out catches what generation added; persist only payloads that passed it.',
        ],
        [
          'The trace id should be created:',
          [
            'At the provider, and copied later',
            'Only when an error occurs',
            'In the analytics pipeline',
            'In receive, then attached to every stage log and returned in the final event',
          ],
          3,
          'One id from the edge inward is what ties a user report to the exact stages that ran.',
        ],
        [
          'What is the right first abstraction for orchestration?',
          [
            'A multi-agent framework on day one',
            'A directory of named, typed stage functions with one provider adapter — frameworks when graphs and recovery policies actually arrive',
            'Direct provider calls from route handlers',
            'A drag-and-drop workflow builder',
          ],
          1,
          'Stages give you tests and metrics; framework complexity is only justified by real control-flow needs.',
        ],
      ]
    ),
    lesson(
      M5,
      'lla-5-2',
      2,
      'Prompt-as-Code: Versioning, Templates and Drift',
      'A prompt changes product behaviour, so it is code: reviewable, versioned, tested and promoted under a gate. Externalise prompts into typed templates, know which version produced every response, and detect drift before your users do.',
      16,
      nineBlocks({
        objectives: [
          'Externalise prompts into versioned, reviewable configuration with typed variables',
          'Template safely: escape user data, default variables, fail on missing ones',
          'Trace any response back to the exact prompt version that produced it',
          'Promote prompt changes through an eval gate with a rollback path',
        ],
        hook:
          'A support bot\'s best-performing prompt lives in a Google doc. Three engineers paste it into the code with three small edits each; production is running a fourth variant that nobody has written down. When quality dips on Thursday, the team cannot answer what changed, when, or where. The model version is the same. The prompt is unmanaged — and so the behaviour is unmanageable.',
        concept: `**A prompt is a behaviour change with no compiler.** Code changes go through review, tests and deploys; prompt changes can be equally behaviour-altering and arrive as a paste. The discipline is therefore borrowed wholesale from engineering, with one twist: your tests are evaluation cases, and your compiler is a gate you run yourself.

**Where prompts live.** Three options, chosen consciously. (1) Constants in code: reviewed with the code, versioned with the deploy — good default for most teams, with the cost that a wording fix rides a full release. (2) A prompt registry or config service: independent rollout, environment overrides, an admin trail — buy this when non-engineers change prompts regularly or you need per-tenant variants, and audit-log every edit. (3) Live console edits at the provider: fastest way to create the Google-doc problem; if you allow them at all, treat them as emergency-only, audited, and reconciled back into versioned source. Whichever you pick, prompt_version and model id must be logged on every completion — the attribution line without which nothing else is debuggable.

**Templates, not concatenation.** A template names its variables with types and defaults: locale, doc_text, user_name. Two safety rules carry most of the weight. First, escaping: user and document content is data — it is injected at data positions, wrapped in delimiters, and never interpolated into instruction positions or into JSON examples (a variable inside an example string breaks structure and invites injection). Second, validation: a template that renders with undefined in it is a production incident waiting for a deploy; fail the build when a required variable is missing. Typed template functions give you both for free.

**Versioning that supports rollback.** Immutable versions: returns-desk/v4 stays exactly what v4 was forever, so an old version can be re-run against new evaluation cases for reproducibility. A changelog line per bump answering why. Staging runs the same prompt as production — dev/prod prompt differences are fake tests. Rollback is then a config change, not an archaeology project.

**Drift, the quiet failure.** Four drift sources: a live console edit; a model auto-update under a stable alias (pin versions where providers allow, and re-run evals when they move — verify current docs); data drift, where yesterday\'s traffic looked nothing like your eval set; and copy creep, where well-meaning appends accumulate into sediment (Module 4, Lesson 1). Detection is mostly instrumentation: quality metrics per prompt_version (thumbs, repair rate, refusal rate, truncation rate), and a diff alert when the version serving production changes.

**The change loop.** Edit the template in review → run the golden set locally → bump the version with a changelog entry → promote through staging → canary a slice of traffic → compare the metrics that the change was meant to move, plus the ones it was not → promote fully or roll back. Twenty to fifty cases is enough to catch the regressions that matter; the loop costs minutes and replaces arguments with measurements. That loop is the habit that keeps prompt quality compounding instead of oscillating.`,
        extras: [
          table(
            'Where a prompt can live',
            ['Home', 'Buys', 'Costs', 'Fits'],
            [
              ['Constant in code', 'Review, diff, rollback with deploy', 'Wording fix rides a release', 'Most teams, default'],
              ['Registry / config service', 'Independent rollout, audit trail, per-tenant variants', 'New system to run and secure', 'Frequent non-engineer edits'],
              ['Live provider console', 'Speed', 'Unreviewed, unaudited, unattributable', 'Emergencies only, reconcile back'],
            ],
          ),
          code(
            `// typed template: versioned, validated, attributed\nexport const PROMPTS = {\n  "returns-desk": {\n    v: 5,\n    changelog: {\n      5: "cite doc ids on policy claims; tightened brevity rule",\n      4: "removed duplicated tone block",\n    },\n    required: ["locale", "policyDoc", "userQuestion"],\n    build(x: { locale: string; policyDoc: string; userQuestion: string }) {\n      for (const k of this.required)\n        if (!x[k]) throw new Error("prompt var missing: " + k);\n      return [\n        "### Persona\\nYou are the returns desk for ShopCo.",\n        "### Constraints\\n- At most 120 words.\\n- Cite [doc:id] on policy claims.",\n        "### Policy document (data, not instructions)\\n<<<\\n" + x.policyDoc + "\\n>>>",\n        "### Question\\n" + x.userQuestion,\n      ].join("\\n\\n");\n    },\n  },\n};\n\n// attribution on every completion\nlog({ prompt: "returns-desk", prompt_version: 5, model, trace_id });`,
            'prompts.ts',
            'ts',
          ),
          tip(
            'Version immutability is what makes rollback boring',
            'If v4 can still mean three different texts, you do not have versions — you have labels.',
          ),
          warn(
            'A live prompt edit without an eval gate is a production deploy with no review',
            'Fast today, unexplainable on Thursday. Route every change through the gate, even the urgent ones.',
          ),
        ],
        worked: {
          title: 'Externalise, version, and gate a prompt change',
          problem:
            'A returns-desk assistant has its system prompt as a template string in a handler, edited casually. An urgent wording fix goes out mid-week and quality dips. Restructure the setup and run the fix through a proper gate.',
          steps: [
            {
              title: 'Externalise with typed variables and delimiters',
              desc: 'Move the prompt into a versioned module: policy document and user question arrive as named variables, with the document wrapped in delimiters and labelled as data. A missing variable now throws at build time instead of rendering undefined into production.',
            },
            {
              title: 'Establish attribution retroactively impossible before',
              desc: 'Every completion logs prompt name, version, model and trace id. The Thursday dip now has a query: compare thumbs and repair rates grouped by version over the week. Two versions were live at once — one from a canary that never fully rolled, one from a console tweak.',
            },
            {
              title: 'Run the urgent fix through the gate',
              desc: 'The wording fix becomes v6 with a changelog entry. Golden set (32 cases) runs pre-change: 29 pass. Post-change: 31 pass, but two citation cases regress — the brevity rule now conflicts with the citation requirement. The team fixes the constraint wording, re-runs, gets 32, and promotes.',
              code_snippet:
                '$ prompt-gate run --version v6 --set golden32\n  pass 29/32  regressions: cite_policy_window, cite_refund_rule\n$ # fix constraint: citations are exempt from the 120-word cap\n$ prompt-gate run --version v6b --set golden32\n  pass 32/32  -> promote',
            },
            {
              title: 'Canary, compare, and keep rollback one command',
              desc: 'v6b goes to 10 percent of traffic; repair rate and thumbs hold; full promote. The previous version remains immutable, so rollback is pointing config at v5 — a decision that takes a minute at 2 a.m.',
            },
          ],
          solution:
            'The prompt stopped being prose that happens to run in production and became a versioned artefact with attribution, a gate and a rollback. The gate earned its keep on the first real change by catching a cross-constraint regression the author could not see by reading — which is exactly what gates are for. And retroactive attribution answered the original Thursday mystery: two versions were live because nothing bound a response to the text that produced it. One logging line would have saved the week of argument.',
        },
        practice: {
          title: 'Version your prompts this week',
          prompt:
            'Externalise every system prompt into versioned modules with typed variables and delimiter-safe data injection. Add prompt_version and model to your completion logs. Build a five-case golden set for your most important prompt and run one proposed change through it. Report what the gate caught that reading did not.',
          hint: 'If you cannot answer which prompt version produced last Tuesday\'s worst answer, stop and add attribution before anything else.',
        },
        mistakes: [
          {
            mistake: 'Prompts in documents or live consoles',
            fix: 'Reviewable versioned source with a changelog; console edits are audited emergencies that get reconciled back.',
          },
          {
            mistake: 'No prompt_version on completions',
            fix: 'Attribution is the foundation: quality per version, incident forensics and rollback all query that column.',
          },
          {
            mistake: 'String-concatenating user data into instructions or examples',
            fix: 'Typed variables at data positions, delimited and labelled as data; never inside instruction text or JSON examples.',
          },
          {
            mistake: 'Shipping prompt edits without an eval gate',
            fix: 'A twenty-case golden set in minutes replaces a week of arguing; canary and compare before full promote.',
          },
        ],
        exam: {
          question:
            'Why should prompts be treated as versioned code? Describe template safety rules and the sources of prompt drift. Lay out the gated change loop.',
          answer:
            'Prompts change product behaviour as surely as code, so they need the same controls: review, immutability (a version label means one exact text forever), changelog with rationale, and rollback by pointing at the previous version. Template safety: typed variables with required-field validation so nothing renders as undefined; user and document content injected only at data positions, wrapped in delimiters and labelled as data — never interpolated into instructions or JSON examples, which breaks structure and opens injection. Drift sources: unaudited live console edits, provider model updates under stable aliases, input data that no longer matches the eval set, and copy creep from unreviewed appends. Detection: log prompt_version and model on every completion, watch quality metrics grouped by version, and alert on unexpected version changes. The gated loop: edit under review, run the golden set, bump version with changelog, promote through staging, canary a traffic slice, compare the metrics the change targeted plus guardrail metrics, then full promote or one-command rollback.',
          source: 'Engineering-practice question: prompt management in production LLM apps.',
        },
        summary: [
          'Prompt changes are product changes: versioned, reviewed, gated, rollbackable.',
          'Attribution first: prompt_version plus model on every completion, no exceptions.',
          'Typed templates with validated variables; data injected delimited, never into instructions.',
          'Drift is quiet: console edits, model updates, data shift, copy creep — instrument for all four.',
          'The gate is minutes of compute that replace weeks of argument.',
          'Immutable versions make reproducibility and 2 a.m. rollback boring, which is the goal.',
        ],
      }),
      [
        [
          'The most important line of prompt instrumentation is:',
          [
            'The prompt text in a log for every request',
            'A daily screenshot of the prompt',
            'prompt_version and model recorded with every completion, so responses are attributable to the text that produced them',
            'The user\'s locale',
          ],
          2,
          'Attribution powers quality-per-version queries, forensics and rollback; full text logs are a privacy and storage problem.',
        ],
        [
          'A template variable containing user text should be injected:',
          [
            'Into the system instructions for visibility',
            'Inside a JSON example so the model mimics it',
            'Only into the final assistant message',
            'At a delimited data position, labelled as data — never into instruction positions or examples',
          ],
          3,
          'Data in instruction positions is both a structure bug and an injection surface.',
        ],
        [
          'Two versions of a prompt are serving production simultaneously. This is detected by:',
          [
            'Reading the code once a month',
            'Grouping quality metrics by prompt_version and alerting on unexpected version mixes',
            'Asking the model which prompt it received',
            'Checking the provider status page',
          ],
          1,
          'Version attribution plus grouping is the drift detector; without the column, the mix is invisible.',
        ],
        [
          'The correct rollback story for a bad prompt release:',
          [
            'Point config at the previous immutable version, since each label maps to exactly one text',
            'Revert the code deploy and re-ship overnight',
            'Ask users to refresh their caches',
            'Write an apology and ship a new prompt from memory',
          ],
          0,
          'Immutability is what makes rollback a config change instead of an archaeology dig.',
        ],
      ]
    ),
    lesson(
      M5,
      'lla-5-3',
      3,
      'Model and Task Fit: Feasibility, Choice and When Not to Use an LLM',
      'Before architecture, before UX, before memory: can the model do the task at all? Run a feasibility spike, pick the smallest model your eval passes, and have the honesty to choose deterministic code when it fits better.',
      16,
      nineBlocks({
        objectives: [
          'Run a feasibility spike on representative cases and read the results as a decision',
          'Choose a model by task fit across capability, structure support, window, cost and latency',
          'Justify the smallest model that passes the eval with margin',
          'Recognise tasks where deterministic code beats an LLM and pick the alternative',
        ],
        hook:
          'A team spends six weeks building an LLM invoice-number extractor with retries, repair loops and a dashboard. A colleague replaces the happy path with a twelve-line regex and a line-item validation in an afternoon: faster, free, perfectly accurate on their corpus. Then the team is asked to extract policy exclusions from free-text clauses, and the regex approach is impossible. Same company, same week, two tasks — one where the LLM was an overpriced parser and one where it was the only tool that could work. The skill is telling the two apart before you build.',
        concept: `**Feasibility first, product second.** The most expensive mistake in this domain is building the shell — UI, memory, billing — and discovering at week six that the model cannot do the core task at 80 percent even with good prompts. The cheap alternative is a spike: ten to thirty representative cases with expected answers, hand-checked; run each through a strong model with a serviceable prompt; record success, failure modes, cost and latency per case. Then read the numbers as a decision rule, adjusting thresholds to your error cost: a typo in a marketing draft and a typo in a loan decision deserve different bars. Roughly, at or above the high nineties on hard cases with a simple prompt — build; mid-band — budget explicitly for structure, grounding and prompt work before committing; low with best effort — re-scope the task or decline it. A spike is days of work and saves months.

**Choosing a model, app-shaped.** Leaderboards are not your eval, and catalogs churn — verify current pricing and capabilities before deciding. The dimensions that matter to an application:

1. **Task capability on your cases** — judged by your spike, not reputation.
2. **Structure support** — if you need schemas or tools, the model must handle them well (Module 2, Lesson 3).
3. **Context window** — must fit your budget (Module 4, Lesson 3) with headroom; a bigger window is not better use of one.
4. **Cost envelope** — per-call cost times volume; output price matters most for verbose tasks.
5. **Latency envelope** — time-to-first-token and throughput against your UX budget (Module 3).
6. **Operational fit** — availability, data residency, enterprise terms, moderation and logging controls.

**The smallest-model principle.** Run the same eval set across a small, medium and large tier. Pick the cheapest that passes with margin, because quality is set by the eval — not by the tier you bought. Task dependence is real: routing, classification and short summaries often pass on small models; nuanced reasoning, rare formats and heavy instruction stacks do not. Note the scope: this is selection at design time. Dynamic per-request routing — small model first, escalate on difficulty — is cost engineering, and Module 10 owns it.

**When not to use an LLM.** The deterministic checklist: fixed-format parsing with learnable structure (regex or a real parser); arithmetic and lookups (models are bad calculators — use code and databases); policy decisions that must be explainable auditable rules; closed small label sets where a classical classifier beats a generative model on cost and latency; real-time constraints below model latency; extreme volume with narrow task mix where token cost dwarfs the engineering cost of a simpler solution. LLMs earn their place on open-ended language understanding, messy unstructured input, generation, judgement with context, and gluing systems together in natural language. Most durable architectures are hybrid: deterministic path first, LLM for the residue, human for the exceptions.`,
        extras: [
          table(
            'LLM or deterministic code?',
            ['Task shape', 'Better fit', 'Why'],
            [
              ['Fixed-format parsing (ids, dates)', 'Regex / parser', 'Free, instant, exact on its domain'],
              ['Closed tiny label set', 'Classical classifier or rules', 'Cost and latency; auditable'],
              ['Arithmetic, lookups, quotas', 'Code plus database', 'Models miscount; systems of record must be exact'],
              ['Free-text exclusions extraction', 'LLM with schema', 'Language is open-ended; rules cannot enumerate it'],
              ['Policy or legal decisions', 'Rules plus human', 'Explainability and accountability'],
              ['Messy input, judgement in context', 'LLM', 'The only tool that generalises to unseen phrasing'],
            ],
          ),
          code(
            `// spike harness: 20 cases in, a decision out\nconst CASES: Case[] = loadJsonl("spike/golden20.jsonl");\n// each: { id, input, expected }\n\nasync function spike(model: string) {\n  const rows = [];\n  for (const c of CASES) {\n    const t0 = Date.now();\n    const out = await chat({\n      model,\n      messages: [ { role: "system", content: SPIKE_PROMPT },\n                  { role: "user",   content: c.input } ],\n      response_format: { type: "json_schema", json_schema: ExclusionSchema },\n    });\n    rows.push({\n      id: c.id,\n      pass: equalsLoose(parse(out), c.expected),\n      ms: Date.now() - t0,\n      tokensIn: out.usage.prompt_tokens,\n      tokensOut: out.usage.completion_tokens,\n    });\n  }\n  return summarise(rows);  // pass rate, p50/p95 latency, cost per case\n}\n\n// decision: large 19/20, medium 15/20, small 9/20\n// -> medium + repair budget, or large if error cost demands it`,
            'spike.ts',
            'ts',
          ),
          tip(
            'The spike is the cheapest architecture decision you will ever make',
            'Twenty cases, one afternoon, and you know whether the product is a product or a research project.',
          ),
          warn(
            'Do not fall in love with the biggest model as a default',
            'It hides feasibility problems, doubles your latency and your bill, and often loses to a smaller model once structure is doing the heavy lifting.',
          ),
        ],
        worked: {
          title: 'Spike a clause-extraction feature and choose the tier',
          problem:
            'A legal-tech team wants to extract exclusions and notice periods from insurance clauses. Stakeholders want a full app by next quarter. Run the spike, read the results, and decide tier and scope.',
          steps: [
            {
              title: 'Build 20 honest cases, not 20 easy ones',
              desc: 'Sample across the real distribution: simple single-clause text, multi-clause walls, scanned-quality OCR noise, two cases with genuinely no exclusion present, and two adversarial ones where the exclusion is conditional. Expected answers written by someone who can check them — a spike against wrong labels is worse than no spike.',
            },
            {
              title: 'Run three tiers, same prompt, same schema',
              desc: 'Structured output with a flat schema: exclusions as string array, notice_days as integer, present as boolean. Results: small 9/20 (format collapse on multi-clause), medium 15/20 (three semantic misses, two schema repairs), large 19/20 (one conditional miss). Cost per case and p95 latency recorded alongside.',
            },
            {
              title: 'Read failure modes, not just rates',
              desc: 'The medium tier\'s misses are all conditional exclusions — a recognisable class. The fix candidates: a second pass that asks only about conditionals, and two targeted few-shot examples. The small tier\'s failures are structural, which is a different, harder problem. Failure mode beats average when choosing what to invest in.',
            },
            {
              title: 'Decide with error cost in the room',
              desc: 'Error cost here is high (missed exclusions in a compliance workflow), so the team picks large for the core extraction with a human review queue for anything flagged present-but-uncertain, plus medium for a cheap pre-screen on simple clauses. Re-scope: the two no-exclusion cases now short-circuit at the pre-screen — and the spike says the full app is feasible, with the budget attached.',
            },
          ],
          solution:
            'In one afternoon the spike replaced a quarter of assumptions: the task is feasible, the difficulty is concentrated in one recognisable failure class, and the tier decision is grounded in error cost instead of vendor reputation. The hybrid choice — medium pre-screen, large core, human review on flagged uncertainty — is exactly the kind of design only the failure-mode data could justify. And if the results had come back at 40 percent, the team would have re-scoped before writing a line of app shell. That is the spike working: it makes the expensive news cheap and early.',
        },
        practice: {
          title: 'Run your spike',
          prompt:
            'Take your idea and write ten representative cases with expected answers. Run them through one strong model with a schema. Record pass rate, failure modes, latency and cost. Then run two other tiers on the same cases and name the cheapest tier that passes your bar. Finish with a one-paragraph go, re-scope or no-go decision that a skeptic could check.',
          hint: 'If the expected answers are not written down before the run, you are grading on vibes — write them first.',
        },
        mistakes: [
          {
            mistake: 'Building the app shell before proving feasibility',
            fix: 'Spike with curl first: twenty cases, one afternoon, a written decision — then build.',
          },
          {
            mistake: 'Choosing a model by leaderboard or hype',
            fix: 'Your distribution is not the benchmark: run your cases across tiers and let the eval pick the model.',
          },
          {
            mistake: 'Defaulting to the largest model',
            fix: 'It masks feasibility problems and doubles cost and latency; pick the smallest tier that passes with margin.',
          },
          {
            mistake: 'Using an LLM for regex-shaped or arithmetic work',
            fix: 'Deterministic first: parsers, rules, databases — LLM for the open-language residue that rules cannot reach.',
          },
        ],
        exam: {
          question:
            'Describe a feasibility spike for an LLM feature: inputs, measurements and decision bands. List six dimensions for model choice and four task shapes where deterministic code beats an LLM.',
          answer:
            'Spike: ten to thirty representative cases sampled from the real distribution, each with a hand-verified expected answer written before running; a serviceable prompt plus schema; measure per case pass or fail, failure mode class, latency and cost; then decide against bands adjusted for error cost — near-ceiling on hard cases means build, a mid-band means budget explicit work on structure, grounding and prompts before committing, a low band means re-scope or decline. Model choice dimensions: task capability on your cases, structured-output and tool support, context window versus your budget, cost envelope at your volume, latency envelope against the UX budget, and operational fit (availability, residency, moderation, logging). Deterministic beats LLM on: fixed-format parsing such as ids and dates; closed tiny label sets where a classical classifier is cheaper and auditable; arithmetic and lookups that must be exact; policy and legal decisions needing explainable rules; and high-volume narrow tasks where token cost dwarfs a simpler build. LLMs win on open-ended understanding, messy input, generation and judgement in context — and most systems are hybrid: rules first, LLM for the residue.',
          source: 'Product-engineering interview: build, buy, spike or decline an LLM feature.',
        },
        summary: [
          'Feasibility is a measurement, not a hope: spike with honest cases before building anything.',
          'Read failure modes, not only averages — they tell you what to invest in.',
          'Model choice is six-dimensional and app-shaped; leaderboards are not your eval.',
          'Smallest tier that passes with margin; selection now, routing is Module 10.',
          'Regex, rules and databases beat LLMs on fixed shapes and exact math — hybrid is normal.',
          'A spike that says no early is the cheapest success in this domain.',
        ],
      }),
      [
        [
          'The purpose of a feasibility spike is to:',
          [
            'Impress stakeholders with a demo',
            'Replace the eval set later',
            'Tune temperature for production',
            'Measure whether the model can do the task on representative cases, with cost and failure modes, before building the app',
          ],
          3,
          'It converts the most expensive unknown into the cheapest measurement.',
        ],
        [
          'Your eval shows small 9/20, medium 17/20, large 19/20 on a drafting task with modest error cost. Best pick:',
          [
            'Small, because it is cheapest',
            'Medium, the cheapest tier that passes your bar with margin — then re-check after any prompt change',
            'Large, because it has the highest score',
            'None; run all three per request',
          ],
          1,
          'The smallest passing tier with margin is the principle; per-request multi-running is routing, a Module 10 topic.',
        ],
        [
          'Which task is the worst fit for an LLM?',
          [
            'Computing refund amounts from line-item arithmetic in a ledger',
            'Extracting policy exclusions from free-text clauses',
            'Rewriting support replies in a friendly tone',
            'Classifying messy user feedback into themes',
          ],
          0,
          'Arithmetic on a system of record must be exact and auditable; that is code and a database.',
        ],
        [
          'A spike returns 55 percent on hard cases after prompt tuning. Correct response:',
          [
            'Ship anyway and add retries',
            'Switch to a larger model without re-measuring',
            'Re-scope the task, add grounding or structure with an explicit budget, or decline — do not build the full app on that number',
            'Lower the quality bar in documentation only',
          ],
          2,
          'The spike exists to make the expensive news cheap and early; 55 percent is a scope decision, not a shipping detail.',
        ],
      ]
    ),
    lesson(
      M5,
      'lla-5-4',
      4,
      'The Thin Slice: Smallest End-to-End Path, Then Baseline It',
      'Ship one vertical path through every layer with a mock model for development, freeze a baseline of real cases before improving anything, and let measured bottlenecks — not trends — decide what to build next.',
      16,
      nineBlocks({
        objectives: [
          'Scope a thin vertical slice that exercises every orchestration stage once',
          'Build a mock provider path so development needs no keys or spend',
          'Freeze a baseline case set with scores, latency and cost per case',
          'Sequence the next build step from measured failure classes instead of enthusiasm',
        ],
        hook:
          'Two teams get the same brief. Team A spends five weeks on the platform: an abstraction layer, a plugin registry, twelve configuration knobs and a beautiful chat UI — and no working use case. Team B ships a command-line tool that answers their domain question badly but end-to-end in week one, measures it against twenty real cases, and improves the prompt three times against that set. At week six, team A owns infrastructure and a demo; team B owns something people use. The difference was not talent. It was vertical versus horizontal.',
        concept: `**Thin means vertical.** A thin slice cuts one path through every layer — client (even a CLI counts), orchestration stages, provider call, validation, persistence — for exactly one use case, one model and a minimal prompt. It is thin because everything else waits; it is vertical because reality gets no delay. Horizontal work (platform, abstractions, dashboards nobody reads) is what teams mistake for progress in week one.

**Slice checklist.** (1) One concrete user job, phrased as a sentence with a verb and an object — answer support questions about our policy docs, not build an AI assistant. (2) An input path in its smallest form: paste text, one upload, one form field. (3) The orchestration stages from Lesson 1, even at sixty lines each. (4) A real provider call with server-side credentials (Module 2) and streaming if the answer is interactive (Module 1). (5) Validation for anything structured (Module 2, Lesson 3). (6) Persistence of messages and usage (Module 1, Lesson 3). (7) A way to run it today: a CLI, a single page, one endpoint with curl.

**The mock path.** Development against a live model is slow, expensive and non-deterministic — terrible for building UI and orchestration. So the call stage gets two implementations behind one interface: the real provider and a mock that replays canned responses. Build fixtures the way you would build test data: happy path, long answer, refusal, truncated stream, malformed JSON, 429. Those fixtures double as your first eval cases (Lesson 2 and Module 8). Where local open models can run on your machine, they are a third option for offline iteration — check current tooling before relying on them. The payoff is boring and enormous: frontend and orchestration work becomes free, fast and deterministic.

**The baseline is the memory of your product.** Before any improvement, freeze twenty to fifty real cases with expected behaviour, and score the current build: pass or fail per case, plus latency and token cost per case. Store it as JSONL in the repo — plain, diffable, reviewable. From that moment, every prompt tweak, model change or context change is a measured delta instead of a vibe: run, compare, keep or revert. A baseline also tells you what your failures actually are, because case-level scoring forces you to look at them one by one. Teams that skip the baseline spend the rest of the project arguing about whether things got better; they usually feel worse.

**Sequencing next steps by measured need.** The bottleneck your metrics name chooses the next module, which is exactly how this course orders Part II:

- Answers shallow or wrong on knowledge → grounding and retrieval (the RAG course).
- One-shot only, no continuity → memory done properly (Module 4 strategies).
- Users asking for actions → tools and function calling (M6).
- Output unreliable, structure failing → structured pipelines and extraction hardening (M7).
- Quality regressions shipping quietly → evaluation harness in CI (M8).
- Abuse, injection attempts, data exfiltration risk → safety layer (M9).
- Slow or expensive at volume → caching, batching, routing (M10).

**Definition of done for Part I.** You can state the architecture, persist state, control parameters, structure output, survive failures with classified errors, budget the window, version prompts, and measure a baseline. That is the floor. Part II adds tools, extraction pipelines, evaluation, safety and performance on top of a system that can already be measured — because you cannot improve what you cannot see, and you cannot trust what you have not baselined.`,
        extras: [
          table(
            'Baseline record fields (JSONL, one line per case)',
            ['Field', 'Purpose'],
            [
              ['case_id, input, expected', 'The frozen question and what passing means'],
              ['model, prompt_version', 'Exactly what produced the answer'],
              ['score, failure_class', 'Pass/fail plus why it failed'],
              ['latency_ms, tokens_in, tokens_out', 'Performance and cost per case'],
              ['run_at, git_sha', 'When and from which build'],
            ],
          ),
          code(
            `// mock provider behind the same interface as the real one\nexport const mockProvider: Provider = {\n  async *chat(req, signal) {\n    const fixture = fixtures.pick(req);\n    if (fixture.kind === "stream_slow") {\n      for (const part of fixture.deltas) {\n        await sleep(20, signal);\n        yield { delta: part };\n      }\n      yield done(fixture.usage, "stop");\n      return;\n    }\n    if (fixture.kind === "http_429")\n      throw llmError("rate_limit", { retryAfterMs: 1000 });\n    // ... refusal, truncated, malformed_json, long_answer\n  },\n};\n\n// baseline runner: 30 cases -> a table you can diff tomorrow\nfor (const c of baselineCases) {\n  const t0 = Date.now();\n  const out = await runTurn(fakeCtx(), c.input);\n  results.push({\n    case_id: c.id,\n    score: grade(out, c.expected),\n    failure_class: classify(out, c.expected),\n    latency_ms: Date.now() - t0,\n    tokens_in: out.usage.prompt_tokens,\n    tokens_out: out.usage.completion_tokens,\n  });\n}\nwriteJsonl("baseline/run-001.jsonl", results);`,
            'slice.ts',
            'ts',
          ),
          tip(
            'Your fixtures are your first eval set',
            'The refusal you scripted for UI development is tomorrow\'s regression case — build them once, use them thrice.',
          ),
          warn(
            'Improvement without a baseline is a feeling',
            'Feelings about model output are biased by recency and novelty; a frozen run is the only honest before-and-after.',
          ),
        ],
        worked: {
          title: 'Ship the returns-desk slice and let the baseline pick the next fight',
          problem:
            'A returns-desk assistant has a half-built React app, no orchestration, no evals, and a team arguing about whether to add memory next or a fancier UI. Build the thin slice, baseline it, and decide from data.',
          steps: [
            {
              title: 'Scope one job, one path',
              desc: 'Job: answer return-policy questions from three uploaded policy docs. Input: a paste box. Path: CLI endpoint plus one page. Stages all present at minimal size: receive with auth and idempotency, pure assemble with the three docs chunked and packed per the budget, guard-in moderation, provider call, streaming to the page, schema validation for citation fields, persist, final event. Nothing else ships.',
            },
            {
              title: 'Mock the provider; build the fixture library',
              desc: 'Six fixtures: normal short answer, long streaming answer, refusal on legal-advice phrasing, truncated stream, malformed JSON for the citation schema, and a 429. Frontend and orchestration work now runs in milliseconds with zero spend — and each fixture becomes a labelled baseline case later.',
              code_snippet:
                'fixtures/\n  normal_short.json      long_stream.json\n  refusal_legal.json     truncated.json\n  bad_json.json          http_429.json\n\n# every fixture has kind + deltas + usage; UI states all six\n# are reachable without touching the real provider',
            },
            {
              title: 'Freeze baseline run one',
              desc: 'Thirty real policy questions with expected answers written by hand. Run: 21 pass, 4 citation misses, 3 out-of-scope refusals that should have been helpful no-data answers, 2 timing failures over the latency budget. One JSONL line per case with score, failure class, latency and tokens.',
            },
            {
              title: 'Read the baseline, choose the next module',
              desc: 'The failure classes, not the vibes, pick the roadmap: citation misses are a grounding and prompt-contract problem → retrieval work next, not memory; refusal misfires are a safety-and-UX problem (M9 material); latency failures are a window and model-choice problem (M4 and M10). The UI-polish idea drops three places. Memory is not on the list at all — the slice showed no continuity failures yet.',
            },
          ],
          solution:
            'Six weeks of horizontal platform collapsed into days of vertical slice, and the mock path made iteration free. The baseline turned the roadmap argument into a reading exercise: three failure classes, each with a known destination in the curriculum, and a UI idea demoted by evidence. That is the Part I close — a system that is measured end to end, with every improvement from here able to prove itself against a frozen set. Tools, extraction hardening, evaluation, safety and performance now have something solid to attach to.',
        },
        practice: {
          title: 'Slice, mock, baseline',
          prompt:
            'Scope your one-sentence user job and build the thinnest vertical path through all stages, with a mock provider and six fixtures. Freeze twenty cases with expected behaviour and record baseline run one: score, failure class, latency, tokens. Then write the three-line roadmap the failure classes imply — and cross out anything you were planning to build for reasons other than a measured bottleneck.',
          hint: 'If you cannot name your top failure class after run one, score more cases before writing any new prompt.',
        },
        mistakes: [
          {
            mistake: 'Horizontal platform-building before any working use case',
            fix: 'Vertical first: one job through every layer; abstractions arrive when the second real use case demands them.',
          },
          {
            mistake: 'Developing only against the live provider',
            fix: 'A mock behind the same interface makes UI and orchestration work free, fast and deterministic — and yields fixtures.',
          },
          {
            mistake: 'Improving prompts without a frozen baseline',
            fix: 'Twenty to fifty cases scored before the first tweak; every change becomes a measured delta you can keep or revert.',
          },
          {
            mistake: 'Choosing the next feature by trend or stakeholder enthusiasm',
            fix: 'Let failure classes from the baseline pick: grounding, memory, tools, safety or performance — each has its own module and its own evidence.',
          },
        ],
        exam: {
          question:
            'Define a thin vertical slice for an LLM feature and contrast it with horizontal work. Explain the mock provider path and what fixtures double as. Describe a baseline record and how it sequences the next build decision.',
          answer:
            'A thin vertical slice is one path through every layer — client, orchestration stages, provider call, validation, persistence — for a single concrete user job with one model and minimal prompt; horizontal work builds platform, abstractions and dashboards before any use case works, which is how teams arrive at week six with infrastructure and no product. The mock provider implements the same interface as the real one and replays scripted fixtures: normal, long streaming, refusal, truncated, malformed JSON and 429 — making UI and orchestration development free, fast and deterministic, and turning each fixture into a labelled eval case. A baseline record is a frozen JSONL run of twenty to fifty real cases with expected behaviour, model, prompt version, score, failure class, latency and token cost per case; before it, improvements are feelings, and after it, every change is a measured delta. Sequencing: classify the baseline failures and map each class to its remedy — shallow knowledge to grounding, no continuity to memory, actions to tools, unreliable structure to extraction hardening, silent regressions to evaluation, abuse to safety, slowness or cost to caching and routing — so the next build step is chosen by the measured bottleneck rather than by enthusiasm.',
          source: 'Delivery-method question for AI feature teams: how to start and how to decide next.',
        },
        summary: [
          'Thin is vertical: one job through every layer, everything else waits.',
          'The mock provider makes iteration free and its fixtures become your first eval cases.',
          'Baseline before improvement: frozen cases, scores, failure classes, latency, cost.',
          'Without a baseline, better is a feeling; with one, it is a diff.',
          'Failure classes pick the roadmap: grounding, memory, tools, safety or performance.',
          'Part I done means measured end to end — the floor Part II builds tools, evals and safety on.',
        ],
      }),
      [
        [
          'A thin vertical slice means:',
          [
            'One layer done thoroughly before starting the next',
            'One user job exercised through every layer with minimal extras, shipping end to end early',
            'The smallest possible token budget',
            'A prototype with no persistence',
          ],
          1,
          'Vertical delivers a working path; horizontal delivers infrastructure with nothing to test it on.',
        ],
        [
          'The main benefit of a mock provider path:',
          [
            'UI and orchestration work becomes free, fast and deterministic — and the fixtures double as eval cases',
            'It answers better than the real model',
            'It removes the need for an eval set',
            'Providers require it for rate limits',
          ],
          0,
          'Determinism and zero spend accelerate every non-model layer, and fixtures are reused three ways.',
        ],
        [
          'Before improving a prompt, you should:',
          [
            'Ship the change and watch thumbs for a week',
            'Ask the model to self-grade',
            'Freeze a baseline of real cases with expected behaviour, scores, latency and cost, so the change becomes a measured delta',
            'Increase max_tokens as a precaution',
          ],
          2,
          'The baseline is the only honest before-and-after; everything else is recency bias.',
        ],
        [
          'Baseline failures are mostly missed citations in grounded answers. The correct next build step:',
          [
            'Add memory and conversation history',
            'Redesign the empty state',
            'Add a second model for routing',
            'Grounding and retrieval work — the measured failure class picks the module, not the trend',
          ],
          3,
          'Sequencing by measured bottleneck is the discipline; citation misses point at context quality first.',
        ],
      ]
    ),
  ],
};
