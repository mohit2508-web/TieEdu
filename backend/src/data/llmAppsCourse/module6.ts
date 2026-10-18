// Module 6 — Function Calling and Tools: Structured Intent, Real Actions
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code } from '../nineBlocks';
import { lesson, M6, COURSE_ID } from './helpers';

export const module6: CourseModule = {
  id: M6,
  course_id: COURSE_ID,
  title: 'Module 6 — Function Calling and Tools: Structured Intent, Real Actions',
  summary:
    'Tools turn a text generator into something that can act: JSON-schema contracts the model emits intent against, executed by your code and merged back into the transcript by call id. This module covers schema design and the routing-grade description that picks the tool, when a tool beats plain generation or a schema, parallel calls with deterministic merging, the preview-and-approve gate that stands between a hallucinated argument and an irreversible action, the deterministic-code-versus-model-judgement split, tool errors fed back as data inside a bounded loop, and streaming a tool round honestly to the UI.',
  sort_order: 6,
  lessons: [
    lesson(
      M6,
      'lla-6-1',
      1,
      'Tool Definitions: JSON Schema, Naming and When Tools Beat Prompting',
      'The model never runs your code — it emits structured intent. Define tools as JSON Schema with routing-grade descriptions, walk the request → tool_calls → role:tool → request loop, choose between plain generation, structured output and a tool call, and treat every generated argument as untrusted input your server validates.',
      16,
      nineBlocks({
        objectives: [
          'Explain the tool-calling loop: what the model returns, what your code executes and what re-enters the transcript',
          'Write a JSON Schema tool definition with a routing-grade description, tight enums and honest required fields',
          'Choose between plain generation, structured output and a tool call for any given requirement',
          'Validate model-generated arguments server-side and return useful errors instead of trusting generated JSON',
        ],
        hook:
          "A support team builds \"search the policy base\" with an instruction: when you need information, emit a line like <<SEARCH:my question>> and I will paste results. Week two, the model emits it inside a JSON field of a structured answer; week three it emits two tags on one line with different brackets; week four a user types the tag themselves and the regex fires against the user's own text. The team has accidentally rebuilt a protocol — with no schema, no ids and no validation. Function calling exists because that game has no winning move.",
        concept: `**Tools are structured intent, not code the model runs.** When you send tool definitions with a request, the model may answer with tool_calls instead of text: an array of calls, each carrying an id you generated nowhere, a name from your list, and arguments serialised as a JSON string. Your process parses that string, validates it, executes your own function — with your credentials, your permissions, your side effects — and appends one message per call with the tool role, the matching call id and the result as content. Then you request again. The loop repeats until the model returns an ordinary message, which is the final answer. Nothing about auth, validation or effect ever leaves your code. Field names differ slightly between providers (as of 2026, verify current docs), but the shape does not: decide → execute → feed back.

**The schema is the contract; the description is the router.** Most bad tool behaviour is a description problem, not a model problem. Three rules carry the weight. (1) Names are forever: lowercase, snake_case, verb-first, and stable — a rename orphans every trace, eval case and saved transcript that referenced it, and two near-twins like search_documents and lookup_policy will split calls arbitrarily. (2) The tool description is a prompt: say when to use it, when NOT to, and show one concrete example of a good argument; each property gets a type, a description and an example; closed sets become enums so a value outside the enum is a bug you can see instead of a string you must trust. (3) Keep it tight: three to six parameters, flat, one level of nesting at most — models drop fields inside deep trees, and every optional critical field becomes a silent default you did not choose. Mark everything you actually need as required, and set additionalProperties false where the provider's strict mode expects it (check current docs for your provider's exact constraints).

**The tool surface is a tax on every request.** Definitions ride along with each call: input tokens, prefill latency and the model's attention budget. Past a modest number of tools, selection accuracy measurably degrades — the numbers are provider- and era-specific, so the only honest answer is a routing eval over your own tool list (Module 8). If you carry a large surface, measure before trimming and after.

**Choose the mechanism deliberately.** Three ways to get values out of a model: plain generation, schema-constrained structured output, and a tool call. They are not interchangeable. Structured output is the model's judgement about input you already gave it — classification, extraction, scoring — with no side effect. A tool call is required when the value or effect lives outside the model: a system of record, a live API, anything that changes state, anything multi-step. Plain text is for prose you will show a human. Rule of thumb: system of record → tool; the model's wording → text; the model's judgement over provided input → schema. Reaching for a tool when a schema would do costs a round trip and a place to fail; reaching for prose when you need values costs you a parser.

**Failures, honestly.** Arguments arrive hallucinated regularly: an order id that does not exist, an amount in the wrong unit, a field the user never mentioned. From your server's point of view, tool arguments are user input — parse with a guard against malformed JSON, type-check and range-check them, then authorise: the order must exist AND belong to the signed-in user. Other recurring failures: the model calls a tool when a plain answer would do (fix with instructions, a smaller surface, or a forced tool_choice where the provider allows it); the system prompt contradicts a tool description and the model picks one (align them — they are the same contract); and the model answers from memory when it should have called (an eval case, not a vibe).`,
        diagram: `flowchart LR
  T["tools: JSON schemas on every request"] --> M["model decides: answer or call"]
  M -->|"tool_calls: id, name, arguments (JSON string)"| V["your code: parse, validate, authorise"]
  V --> X["your function executes with your credentials"]
  X -->|"role: tool, call id, result"| M
  M -->|"plain message, finish_reason stop"| F["final answer"]`,
        extras: [
          table(
            'Which mechanism gets the value?',
            ['Requirement', 'Mechanism', 'Why'],
            [
              ['Draft, explain, reply in prose', 'Plain generation', 'Shape does not need to be exact; a human reads it'],
              ['Classify or extract from given text', 'Structured output (schema)', 'Judgement over supplied input, no side effect, one round trip'],
              ['Value that lives in a DB or live API', 'Tool call', 'The model cannot know your data; retrieval is execution'],
              ['Any side effect (send, charge, delete)', 'Tool call', 'Effect must run in code, with auth, audit and limits'],
              ['Multi-step plan across systems', 'Tool calls in a loop', 'One step at a time, each fed back as data'],
            ],
          ),
          code(
            `# one tool definition and the loop that executes it
TOOLS = [{
    "type": "function",
    "function": {
        "name": "lookup_order",
        "description": "Fetch one order for the signed-in customer. Use when "
                       "the user names an order id or asks about status. Do "
                       "NOT use for refunds or address changes.",
        "parameters": {
            "type": "object",
            "properties": {
                "order_id": {
                    "type": "string",
                    "description": "Order id, for example ORD-2026-00417.",
                },
                "include_items": {
                    "type": "boolean",
                    "description": "Include line items. Defaults to false.",
                    "default": False,
                },
            },
            "required": ["order_id"],
            "additionalProperties": False,
        },
    },
}]

async def run_turn(messages, *, user, max_rounds=6):
    for _ in range(max_rounds):
        resp = await client.chat.completions.create(
            model=MODEL, messages=messages, tools=TOOLS, temperature=0
        )
        msg = resp.choices[0].message
        if not msg.tool_calls:
            return msg.content                    # ordinary final answer
        messages.append(msg.model_dump())         # assistant turn with calls
        for call in msg.tool_calls:
            args = safe_json(call.function.arguments)    # malformed JSON happens
            args = validate_order_args(args)             # your rules, not the model's
            try:
                result = await lookup_order(args, user=user)   # authz lives HERE
            except ToolError as e:
                result = e.as_tool_result()          # errors become data (6-4)
            messages.append({"role": "tool", "tool_call_id": call.id,
                             "content": json.dumps(result)})
    raise RoundsExceeded(max_rounds)              # never an open-ended loop`,
            'tools.py',
            'python',
          ),
          tip(
            'Write the description last, after you have seen misroutes',
            'The first version describes what the tool does; the good version describes when it is the wrong answer — learned only from real wrong picks.',
          ),
          warn(
            'Arguments are user input wearing a JSON costume',
            'Parse guarded, type-check, range-check, authorise against the session — exactly as if a stranger had typed them, because a prompt injection can make them.',
          ),
        ],
        worked: {
          title: 'Turn a prose instruction into two honest tools',
          problem:
            'A returns desk answers policy questions (grounded in three documents) and looks up order status (live DB). The current prompt says "output <<LOOKUP:...>> when you need the database". Redesign it as proper tools and show what the loop executes.',
          steps: [
            {
              title: 'Classify each capability before writing any schema',
              desc: 'Policy questions are judgement over documents you paste into context — structured output or plain text with citations, no tool. Order status must come from the database — a tool, because the model has no idea what ORD-2026-00417 contains today. Two capabilities, two different mechanisms; the old instruction used one mechanism for both and got both wrong sometimes.',
            },
            {
              title: 'Write the schema and the router-grade description',
              desc: 'One tool, lookup_order, with order_id (string, required, example in the description) and include_items (boolean, default false). The description names the exact situation to use it and the two situations not to — refunds and address changes belong to tools that do not exist yet, which is itself information.',
              code_snippet:
                'name: "lookup_order"\ndescription: "Fetch one order for the signed-in customer.\\nUse when the user names an order id or asks about delivery status.\\nDo NOT use for refunds, cancellations or address changes."\nrequired: ["order_id"]   # no silent default for the one field the task needs',
            },
            {
              title: 'Execute the loop and watch the first real call',
              desc: 'The request returns one tool_call with arguments {"order_id": "ORD-2026-00417"}. Your code parses, validates the shape, checks the order belongs to this user, queries the database, appends the result as a tool message with the call id, and requests again. The second response is prose citing the real status. No regex, no protocol, no user-typed tags.',
            },
            {
              title: 'Handle the argument the model invents',
              desc: 'A second run returns order_id "ORD-2026-99999" — plausible, real format, no such row for this user. Instead of a crash or a lie, the tool returns a structured result: {"error": "not_found", "message": "No order matches that id for your account."} fed back as the tool message. The model then asks the user to re-check the id, which is the right behaviour and was reachable only because failure was data.',
            },
          ],
          solution:
            'The protocol-without-schema became a schema with a contract: one name, a description that routes, required fields that cannot silently default, and a loop where every argument passes through validation and authorisation before touching a database. The invented order id — the failure that would have been a production incident under the regex design — became a tool result the model could reason about. That is the whole trade: tools do not make the model correct, they make its mistakes structured, visible and recoverable.',
        },
        practice: {
          title: 'Define your first real tool',
          prompt:
            'Pick one capability in your app that needs a system of record. Write its JSON Schema: name, description with a "do NOT use when" clause, three or fewer parameters, enums for any closed set, everything critical required. Then write the other side: the validation and authorisation checks your server runs before your code touches anything. Finally, list two capabilities that are plain schemas, not tools, and say why.',
          hint: 'If your description does not mention one case where the tool is the wrong answer, it is not a router yet — it is a label.',
        },
        mistakes: [
          {
            mistake: 'Parsing free-form text for command tags with regex',
            fix: 'Use tool calls: ids, schemas and a typed message role give you structure the model cannot improvise around.',
          },
          {
            mistake: 'Vague or duplicated tool descriptions',
            fix: 'Describe when to use AND when not to; rename near-twins so routing stops splitting arbitrarily.',
          },
          {
            mistake: 'Executing generated arguments directly',
            fix: 'Parse guarded, validate shape and ranges, authorise against the session — arguments are untrusted input.',
          },
          {
            mistake: 'Reaching for a tool when structured output would do',
            fix: 'Judgement over supplied input is one schema-shaped response; a tool earns its round trip only when value or effect lives outside the model.',
          },
        ],
        exam: {
          question:
            'Describe the function-calling loop end to end: what a request with tools returns, what your code appends and why the loop terminates. Then give the three mechanism choices for getting values out of a model and the rule that picks between them.',
          answer:
            'Request with tool definitions → the model either returns an ordinary message (final answer) or tool_calls: an array of {id, name, arguments}, with arguments as a JSON string. Your code parses and validates those arguments, authorises them against the session, executes its own function with its own credentials, and appends one message per call with the tool role, the matching tool_call_id and the result as content; then it requests again. The loop repeats until a plain message arrives (finish_reason stop) — which is why every implementation needs a hard round cap as well. Mechanisms: plain generation for prose a human reads; schema-constrained structured output for the model\'s judgement over input already provided (no side effect); a tool call when the value lives in a system of record or the effect must happen in code. Rule: system of record or side effect → tool; model wording → text; model judgement over given input → schema. The description is the router: when to use, when not to, with examples; and generated arguments are treated as untrusted input — parse, type-check, authorise.',
          source: 'Backend interview for LLM feature roles: "walk me through how function calling works."',
        },
        summary: [
          'The model emits intent; your code executes — auth, validation and side effects never leave your server.',
          'Names are forever; descriptions route; critical fields are required; schemas stay flat and short.',
          'Structured output for judgement, tools for systems of record and effects, text for prose.',
          'Tool definitions ride along on every request: measure your routing accuracy before growing the surface.',
          'Generated arguments are user input: parse guarded, validate, authorise against the session.',
          'Errors should come back as structured tool results — that is what makes recovery possible.',
        ],
      }),
      [
        [
          'In the tool-calling loop, who executes the function?',
          [
            'The provider, inside its sandbox',
            'Your code, after parsing and validating the model-generated arguments',
            'The model, via generated code',
            'The browser, on the user device',
          ],
          1,
          'The model only emits structured intent; execution, credentials and side effects stay in your process.',
        ],
        [
          'Which requirement should become a tool rather than a structured-output schema?',
          [
            'Classifying a pasted complaint into a fixed set of themes',
            'Extracting dates from a lease clause you pasted into context',
            'Fetching today\'s stock level from your inventory database',
            'Scoring an answer against a rubric you provided',
          ],
          2,
          'A value held by a system of record must be looked up; the model cannot know it, so retrieval is execution.',
        ],
        [
          'The most common root cause of a model calling the wrong tool is:',
          [
            'A temperature that is too high',
            'Vague, overlapping or missing "when not to use this" descriptions',
            'A context window that is too small',
            'JSON mode being disabled',
          ],
          1,
          'Routing happens from names and descriptions — the description is a prompt, and near-twins split calls arbitrarily.',
        ],
        [
          'A tool_call arrives with order_id "ORD-99999" that does not exist for this user. Correct handling:',
          [
            'Return an exception to the user immediately',
            'Send a structured not_found result back as the tool message so the model can respond or retry intelligently',
            'Let the model invent a plausible order status instead',
            'Log it and return an empty string as the tool result',
          ],
          1,
          'Failures are data: a structured error result lets the model recover, while also proving authorisation ran.',
        ],
      ]
    ),
    lesson(
      M6,
      'lla-6-2',
      2,
      'Parallel Tool Calls, Result Merging and the Deterministic Split',
      'One response can carry several tool calls. Run them concurrently without losing the call-id mapping, merge results in a stable order the model can reason about, stage dependent calls instead of guessing, and keep every deterministic decision in code while the model only judges.',
      16,
      nineBlocks({
        objectives: [
          'Handle a response containing multiple tool_calls, preserving the id-to-result mapping under concurrency',
          'Choose a merge strategy and a dependency order for fan-out results',
          'Separate deterministic work (fetching, merging, computing) from model judgement (what to ask, what it means)',
          'Bound fan-out: dedupe, cap concurrency and cap the result bytes that re-enter the transcript',
        ],
        hook:
          'An assistant answers "compare our Basic and Pro plans for a 12-person team" by emitting three tool calls in one message. The app runs them one at a time, in whatever order they arrived in the response body, concatenates results in completion order, and streams them. Two of the three calls are slow; the answer opens with the Pro quote, compares it against nothing, then mentions Basic in a footnote. The model did not get dumber — its context was reordered, and the comparison logic in its head is order-sensitive.',
        concept: `**Parallel is a feature of the response, not of your loop.** Providers may return several tool_calls in a single assistant message, and the intended handling is to execute them concurrently — Promise.allSettled in JavaScript, asyncio.gather in Python — then post one tool message per call id, in any order, before requesting again. The invariant that matters is the mapping: every call id gets exactly one result, and results must never be attached to the wrong id. The cheapest way to break it is a shared mutable array filled in completion order while iterating later by position; the fix is a map keyed by id, built from the settled results. Concurrency limits still apply: gather with a semaphore, because the model's generosity is not your database's capacity.

**Merge order is a design decision.** When results re-enter the transcript, their arrangement is part of the answer's quality. Options, in increasing sophistication: (1) by call id — neutral, lossless, the safe default; (2) by declared intent — group related lookups in the order the model's question implied; (3) by domain priority — ground rules first, quotes second, live prices last, so the final reading order matches how you want the model to weigh them. Whichever you pick, make it deterministic: the same set of calls must produce the same arrangement tomorrow, or your eval runs will not reproduce. Cap each result too — a 40 KB table per call times five calls blows the window (Module 4) and buries the question; truncate per result with an explicit "truncated, 47 of 310 rows" marker rather than a silent cut.

**Dependency is the trap parallelism hides.** Some calls can only be issued once another has returned: you cannot fetch shipping options for a cart before you know the cart id. Detect this by looking at required parameters you already have versus need — if a call's argument would be null without a prior result, it belongs to the next round, not this one. Two honest options: let the model stage naturally (it issues cart lookup now, shipping next round — costs a round trip, keeps judgement with the model), or resolve dependencies in code (faster, but now you own planning logic you must test). Most apps should let the model stage and reserve code for what is truly mechanical. Never fabricate a placeholder argument to "run it in parallel anyway" — you are paying for a lookup against data you invented.

**The deterministic split, stated once.** The model judges: which tools to call, with what arguments, what the merged results mean, what to say. Deterministic code decides: what exists, what is authorised, how results are ordered, deduped, aggregated, sorted and truncated; all arithmetic; all policy. A clean test for the boundary — if two runs with the same inputs must produce the same value, it belongs in code. If it is interpretation of language or selection among options, it belongs in the model. When the model starts "merging" results in prose, you get arithmetic errors dressed as fluent sentences; when code starts "interpreting" results, you get brittle rules that cannot handle a new phrasing. Duplications are common: the model may emit the same call twice in one message (dedupe by name-plus-arguments hash before executing — same work, one round of tokens), and overlapping calls across rounds need an idempotency story (Module 2).`,
        diagram: `flowchart TD
  A["assistant message: 3 tool_calls"] --> B["dedupe by name + args hash"]
  B --> C["semaphore: cap concurrency"]
  C --> D1["call 1"] & D2["call 2"] & D3["call 3"]
  D1 & D2 & D3 --> E["map: call_id -> result (settled)"]
  E --> F["merge policy: stable, deterministic, per-result capped"]
  F --> G["one role:tool message per id"] --> H["next request"]
  X["dependent call: needs id from call 1"] -.->|"next round"| H`,
        extras: [
          table(
            'Merge strategies and when each earns its keep',
            ['Strategy', 'Behaviour', 'Fits'],
            [
              ['By call id', 'Neutral, lossless, reproducible', 'Default for any set of independent lookups'],
              ['By declared intent', 'Groups results in the order the question implied', 'Comparisons and multi-part questions'],
              ['By domain priority', 'Ground rules before live values before commentary', 'Answers where reading order shapes trust'],
              ['Model-ordered in prose', 'The model re-narrates results itself', 'Never as the only merge — ordering then drifts run to run'],
            ],
          ),
          code(
            `// fan-out that keeps the id mapping under concurrency
const SEM = new Semaphore(4);              // the model is not your DB's capacity planner

async function runParallel(calls: ToolCall[], ctx: Ctx): Promise<ToolMsg[]> {
  const unique = dedupeBy(calls, (c) => c.name + stableHash(c.args));
  const settled = await Promise.allSettled(
    unique.map((c) => SEM.acquire(() => dispatch(c, ctx)))   // dispatch validates + authorises
  );

  const byId = new Map<string, string>(); // id -> result JSON, NEVER positional arrays
  settled.forEach((r, i) => {
    const id = unique[i].id;
    byId.set(id, r.status === "fulfilled"
      ? capBytes(r.value, 2_000)                       // per-result ceiling
      : JSON.stringify({ error: classify(r.reason), retryable: isRetryable(r.reason) }));
  });

  // one message per call id; order is a policy, applied deterministically
  return orderPolicy(unique).map((c) => ({
    role: "tool",
    tool_call_id: c.id,
    content: byId.get(c.id)!,
  }));
}`,
            'fanout.ts',
            'ts',
          ),
          tip(
            'Dedupe before you dispatch',
            'The same name-plus-arguments twice in one response is one lookup with two ids — pay once, answer both ids.',
          ),
          warn(
            'Positional merging of concurrently completed calls is a correctness bug waiting for one slow request',
            'Key everything by call id; completion order is timing, not meaning.',
          ),
        ],
        worked: {
          title: 'Compare two plans correctly under three-way fan-out',
          problem:
            'The plan-comparison assistant emits three calls: list_prices, list_limits and list_features for two plans. Results come back out of order and one fails with a timeout. Restructure execution so the answer is stable, complete and honest about the gap.',
          steps: [
            {
              title: 'Inspect the calls for dependencies and duplicates',
              desc: 'All three take plan ids already present in the request — independent, so one round of concurrency is legal. None depend on another result, so nothing gets staged. On a run where the model emitted list_prices twice with identical arguments, dedupe collapses them to one execution and two id-keyed results.',
            },
            {
              title: 'Execute concurrently with a cap, merge by declared intent',
              desc: 'Three dispatches under a semaphore; each validates and authorises before touching pricing code. Merge policy for this question type is group-by-topic: prices, then limits, then features — the reading order the comparison needs — with each result capped at 2 KB and truncated markers intact.',
              code_snippet:
                'calls: [list_prices, list_limits, list_features]  # independent -> one round\nmerge policy: topic order (prices, limits, features), deterministic\nresults capped: 2 KB each, "truncated: 47 of 310 rows" preserved',
            },
            {
              title: 'Feed the failure back as data, not as a hole',
              desc: 'list_limits timed out. Its id gets {"error": "timeout", "retryable": true} as the tool message — not a skipped entry, not an empty string. The model sees exactly which topic is missing and, on the next round, can retry that one call or answer with an explicit caveat.',
            },
            {
              title: 'Read the second response',
              desc: 'The model retries the limits lookup once, gets the data, and produces the comparison in the intended order with every plan line backed by a real result. If the retry had failed again, the answer would have stated the gap plainly — because the merged context said so, in an order the model could trust.',
            },
          ],
          solution:
            'Concurrency with an id-keyed map, a deterministic merge policy and per-result caps turned a timing-dependent answer into a reproducible one. The timeout became information instead of a silence, which is the difference between a model that says "limits are unavailable right now" and one that quietly compares a price against nothing. And the deterministic split held: code ordered, deduped and capped; the model judged what the merged picture meant.',
        },
        practice: {
          title: 'Instrument one fan-out',
          prompt:
            'Take the last multi-call response your app produced (or design one for three independent lookups). Write the execution plan: concurrency cap, dedupe key, merge policy and per-result byte cap. Then write the dispatch code keyed by call id with allSettled-style handling, and name one call that must be staged to the next round and why.',
          hint: 'If your merge order can differ between two runs with identical calls, it is not a policy yet — it is timing.',
        },
        mistakes: [
          {
            mistake: 'Filling a shared array in completion order and reading it by position',
            fix: 'Key results by call id; positional merging breaks the first time one request is slow.',
          },
          {
            mistake: 'Issuing dependent calls in the same parallel round',
            fix: 'Stage them: a call whose argument needs a prior result belongs to the next round — or to code, if you own planning.',
          },
          {
            mistake: 'Unbounded fan-out and uncapped result sizes',
            fix: 'Semaphore on concurrency, dedupe on identical calls, byte cap with explicit truncation markers per result.',
          },
          {
            mistake: 'Letting the model do the merging arithmetic',
            fix: 'Deterministic split: code orders, dedupes and aggregates; the model only interprets language and chooses what to ask.',
          },
        ],
        exam: {
          question:
            'A response contains four tool_calls and one is dependent on another. Describe correct execution, the id-mapping invariant, the merge decision, and where the deterministic-code/model-judgement boundary sits.',
          answer:
            'First classify: three independent calls run concurrently under a concurrency cap (a semaphore or bounded gather); the dependent call — whose required argument only exists after another returns — is staged to the next round (letting the model sequence it) or resolved in code if you truly own planning; never fabricate placeholder arguments to force parallelism. Invariant: results are stored in a map keyed by call id and exactly one tool message is posted per id — positional or completion-order merging corrupts the transcript under any timing variance. Merge strategy is explicit policy: by call id (neutral default), by declared intent (comparison order) or by domain priority — deterministic across runs, with each result byte-capped and truncation marked, since five 40 KB tables will bury the question. Dedupe identical name-plus-arguments calls before executing. Boundary: the model chooses what to call, with what arguments, and what results mean in prose; code does everything that must be reproducible — validation, authorisation, ordering, dedupe, arithmetic, truncation. Test: if two runs with the same inputs must yield the same value, it belongs in code.',
          source: 'System-design round: "your assistant issues parallel tool calls — walk me through the handler."',
        },
        summary: [
          'Several tool_calls per response is normal; execute concurrently under a cap, never unbounded.',
          'The invariant is the id-to-result map — one tool message per id, key never position.',
          'Merge order is policy: pick it deliberately, keep it deterministic, cap every result.',
          'Dependent calls are staged to the next round; placeholders are invented data with a bill.',
          'Dedupe identical calls and pay for one execution.',
          'Deterministic split: code orders, dedupes and computes; the model selects and interprets.',
        ],
      }),
      [
        [
          'Under concurrent tool execution, results must be associated with calls by:',
          [
            'Completion order, since faster results are more relevant',
            'The tool_call id each result was produced for',
            'Array position in the original response',
            'The tool name, which is unique per response',
          ],
          1,
          'Completion order is timing; only the id survives concurrency, retries and dedupe.',
        ],
        [
          'A tool call needs an order_id that only a previous call returns. You should:',
          [
            'Pass null and let the model fill it later',
            'Stage it to the next round (or resolve it in code if you own planning) — never fabricate the argument',
            'Guess a plausible id to keep one round',
            'Run it anyway; providers ignore missing fields',
          ],
          1,
          'Placeholder arguments mean paying for a lookup against invented data; dependencies belong to a later round.',
        ],
        [
          'The deterministic-code vs model-judgement split says arithmetic and ordering belong in code because:',
          [
            'Models refuse to compute anything',
            'Two runs with the same inputs must produce the same value — that is what makes results testable and reproducible',
            'Code runs faster than any model',
            'Providers forbid the model from merging results',
          ],
          1,
          'Reproducibility is the test: anything that must be identical run-to-run lives in code, not in fluent narration.',
        ],
        [
          'Four results of 40 KB each re-enter the transcript. The most likely consequence:',
          [
            'Nothing; results are not counted as tokens',
            'The window overflows or the question gets buried — cap each result and mark truncation explicitly',
            'The provider merges them automatically',
            'Latency improves because context is cached',
          ],
          1,
          'Tool results are tokens like any other content; per-result caps with honest truncation markers protect the window.',
        ],
      ]
    ),
    lesson(
      M6,
      'lla-6-3',
      3,
      'Confirmation Flows: Preview, Approval and the Safety of Irreversible Actions',
      'Hallucinated arguments are normal, so destructive or outward-facing actions never execute straight through. Classify every tool by reversibility, build preview → approve → execute gates bound to the exact plan, and keep the model out of the job of deciding whether something is safe.',
      16,
      nineBlocks({
        objectives: [
          'Classify tool actions into permission tiers by reversibility, blast radius and external visibility',
          'Design a confirmation flow: preview, approval token bound to a plan hash, expiry and one-time use',
          'Draw the boundary where model judgement ends and deterministic policy begins',
          'Audit every gated execution with the plan, the approver and the outcome',
        ],
        hook:
          'A demo assistant with an send_email tool processes "email the beta list about Friday\'s outage" — and the model, having been told in the system prompt that the outage was minor, fills recipients from a stale list in context: 14 emails to customers whose contracts were cancelled last month, each containing a confident sentence about downtime the company never had. The tool worked perfectly. Nothing between the model\'s invented arguments and the SMTP server ever asked a human.',
        concept: `**Not all tools are equal; treat them differently.** Classify every action on two axes: reversibility (can an operator undo it in minutes?) and blast radius (how many people see it or are affected?). That gives three practical tiers. Read: no side effect — lookup, search, calculation — always allowed within authz. Reversible write: creates or modifies something an authorised person can undo (draft created, cart updated, ticket tagged) — allowed, logged, undoable. Irreversible or outward-facing: sends, charges, deletes, publishes, external API calls with money or reputation attached — gated. The tier lives in code as a property of the tool, not in the prompt: the model does not get to reclassify delete_user as a reversible write because the conversation sounds confident.

**The gate: preview, approve, execute — bound together.** A confirmation flow is not a chat message saying "are you sure?". It is a small state machine with three properties that most implementations miss. (1) Preview shows the exact effect in human terms before approval: "Send to 14 recipients, subject 'Outage postmortem', body below" with the real list, the real body, the real amount — rendered from the arguments your code resolved, not from the model's prose description of them. (2) The approval is a token bound to a plan hash: SHA-256 of the canonicalised arguments plus the tool name plus the acting user. Executing re-computes the hash and refuses on mismatch — this closes the time-of-check/time-of-use hole where the model (or a prompt injection) swaps recipients between approval and execution. (3) The token is single-use with a short expiry (minutes, not hours) and is consumed atomically. Optional but wise for high blast radius: dry-run mode on the tool itself, so your preview calls the real validation path with a write flag off — previews that do not exercise the real checks are fiction.

**Where model judgement stops.** The model proposes: it decides an action is warranted and drafts the arguments. Deterministic code disposes: it validates shape, re-checks authorisation against current session state (not the one at preview time), enforces quotas and policy (Module 9), computes the resolved effect, and only then executes. Asking the model "is this safe to send?" is not a control — the same context that produced a risky plan will produce a reassuring answer about it. Three places people wrongly put the gate: inside the system prompt ("always confirm before sending"), inside the model's self-assessment, and in the UI as a yes/no with no binding to the arguments. All three are narrative, not mechanism.

**The audit line.** Every gated execution writes one record: plan hash, tool name, canonical arguments, who approved and when, request/trace id, and the outcome (executed, expired, hash mismatch, rejected). This is what turns an incident into a twenty-minute diagnosis instead of a week of archaeology — and what lets you later ask "how often did the model propose something a human had to correct?" as a product metric. Confirmation rate and correction rate are the health numbers of a tool-using app: a gate that approves 100% of plans forever is either a great filter or a rubber stamp, and the only way to tell is sampling what got approved.`,
        diagram: `flowchart LR
  P["model proposes: tool + args"] --> V["validate + authz + policy"]
  V --> R{"tier?"}
  R -->|"read"| E["execute"]
  R -->|"reversible write"| W["execute + log + undo path"]
  R -->|"irreversible"| H["resolve real effect from args"]
  H --> PR["preview to human: exact effect"]
  PR --> AP["approve: token = hash(plan) + user, TTL, single-use"]
  AP --> EX["re-hash, match, consume, execute, audit"]
  EX -.->|"hash mismatch / expired"| X["refuse + audit"]`,
        extras: [
          table(
            'Permission tiers by reversibility and blast radius',
            ['Tier', 'Examples', 'Gate'],
            [
              ['Read', 'Lookup, search, calculate', 'Authorisation only — always allowed inside the session'],
              ['Reversible write', 'Create draft, tag ticket, update cart', 'Execute + audit log + one-click undo'],
              ['Irreversible / outward', 'Send email, charge, delete, publish, external API', 'Preview → human approval bound to plan hash → execute'],
            ],
          ),
          code(
            `// preview -> approve -> execute, bound by a plan hash
import { createHash } from "node:crypto";

const planHash = (tool: string, args: unknown, userId: string) =>
  createHash("sha256")
    .update(tool + "|" + userId + "|" + canonicalJson(args))   // stable key order
    .digest("hex");

async function gatedDispatch(call: ToolCall, ctx: Ctx): Promise<ToolMsg> {
  const tier = TOOL_TIERS[call.name];                    // code owns tiers, not the model
  const args = validateAndAuthorise(call, ctx);          // fresh authz, not preview-time authz

  if (tier === "read")              return ok(await execute(call.name, args, ctx));
  if (tier === "reversible_write")  return ok(await executeWithUndo(call.name, args, ctx));

  const plan = {
    hash: planHash(call.name, args, ctx.userId),
    tool: call.name, args,
    effect: await dryRun(call.name, args, ctx),          // real code path, writes off
    expires_at: Date.now() + 5 * 60_000,                 // minutes, not hours
  };
  await db.plans.insert(plan);                           // pending
  await notifyApproval(ctx.userId, plan);                // preview renders plan.effect
  return pending(plan.hash);                             // model learns: waiting on human
}

async function onApprove(hash: string, approver: string): Promise<void> {
  const plan = await db.plans.takePending(hash);         // atomic: single-use
  if (!plan)              return audit("expired_or_used", hash, approver);
  if (planHash(plan.tool, plan.args, plan.user) !== plan.hash)
                          return audit("hash_mismatch", hash, approver);   // TOCTOU blocked
  const result = await execute(plan.tool, plan.args, plan.owner);
  await audit("executed", { hash, approver, result });   // who, what, when, outcome
}`,
            'gating.ts',
            'ts',
          ),
          tip(
            'Approval rate and correction rate are your product metrics',
            'A gate approving everything forever may be a rubber stamp; sample what passed and you will know.',
          ),
          warn(
            '"Are you sure?" addressed to the model is not a confirmation',
            'The model lives in the context that produced the risky plan; only a human with a bound token is a control.',
          ),
        ],
        worked: {
          title: 'Gate the refund tool without stalling support agents',
          problem:
            'A support assistant can issue_refund up to ₹2,000. Agents want speed; finance wants accountability. Build the tier, preview and audit so that a hallucinated amount can never reach the payment provider.',
          steps: [
            {
              title: 'Classify and split the tool by amount',
              desc: 'issue_refund is irreversible (money leaves). Rather than one tool with a weak prompt rule, split by blast radius: issue_refund (≤ ₹500, reversible only by finance ticket but small) logs with undo path — no, money is never "reversible", so the honest classification is: all refunds gated, with a lighter preview under ₹500 (one-click confirm, no second screen) and a full preview above it. The tier decision is a table in code, keyed on resolved amount — not on how the model phrases the request.',
            },
            {
              title: 'Build the preview from resolved arguments',
              desc: 'The model proposes {"order_id": "ORD-2026-00417", "amount": 499, "reason": "damaged item"}. Code resolves order, customer and prior refund total, then renders: "Refund ₹499 to Priya S. for ORD-2026-00417 (item: ceramic set) — ₹0 refunded previously". If the model had proposed amount 4999, the preview would show ₹4,999 against a ₹499 order and the discrepancy is visible to the approver before anything is consumable.',
              code_snippet:
                'plan_hash = sha256("issue_refund|" + user_id + "|" + canonical(order_id, amount, reason))\npreview  = "Refund {amount} to {customer} for {order_id} - previously refunded {prior}"\napproval = single-use token, TTL 5 min, bound to plan_hash',
            },
            {
              title: 'Approve once, consume atomically, re-hash on execute',
              desc: 'The shift lead clicks approve. The database row is taken atomically (single-use), the hash is recomputed over the arguments as they stand now, and any mismatch — an argument edited after preview, an injected recipient swap — aborts to the audit log instead of the payment provider.',
            },
            {
              title: 'Read the audit trail a week later',
              desc: 'Eleven refunds executed; one expired because nobody was at the desk; one hash mismatch — a run where the model amended reason text between preview and approval, caught and refused. Confirmation rate 100%, correction rate one in thirteen: the number the team now watches, and the reason they sample approved plans monthly.',
            },
          ],
          solution:
            'The gate is mechanism, not manners: tiered in code by resolved effect, previewed from arguments the code itself resolved, approved with a single-use hash-bound token, executed only after a re-hash match, and audited end to end. The hallucinated-amount path — the one that reached customers in the hook story — now dies at the preview, where a human sees the real number next to the real order. And because every proposal is recorded, the team can treat confirmation and correction rates as the health metrics they are, instead of assuming the gate works because nobody complained.',
        },
        practice: {
          title: 'Tier and gate one real action',
          prompt:
            'List every tool in your app and assign each a tier: read, reversible write, irreversible/outward. For the top tier, write the preview (what the human sees, rendered from resolved arguments), the plan-hash binding, and the audit record fields. Then find the one argument your model most often hallucinates and say which check catches it before execution.',
          hint: 'If your preview text is generated by the model rather than assembled from resolved data, the preview can lie too.',
        },
        mistakes: [
          {
            mistake: 'Executing outward-facing tools straight through with prompt-level "always confirm" instructions',
            fix: 'Tier in code and gate with a mechanism; prompts describe intent, they do not enforce it.',
          },
          {
            mistake: 'Confirmation not bound to the exact arguments',
            fix: 'Hash the canonical plan (tool + user + args), single-use, short TTL; re-hash before execute to block TOCTOU swaps.',
          },
          {
            mistake: 'Letting the model judge whether an action is safe',
            fix: 'The model proposes; code validates, authorises, enforces policy and computes the effect it will show a human.',
          },
          {
            mistake: 'No audit record of gated executions',
            fix: 'Persist plan hash, approver, outcome and trace id — the difference between a twenty-minute incident and a week of archaeology.',
          },
        ],
        exam: {
          question:
            'Give the three permission tiers for tools with an example of each, then describe a confirmation flow that is safe against argument swapping between preview and execution. Why is a model self-assessment not a control?',
          answer:
            'Tiers by reversibility and blast radius: read (lookups, searches) — authorised but ungated; reversible write (draft created, cart updated, ticket tagged) — executed with audit log and undo path; irreversible or outward-facing (send, charge, delete, publish) — gated. Gate design: resolve the real effect from the arguments in code (never from the model\'s description), show a preview rendered from that resolution, and issue an approval token bound to a SHA-256 plan hash over canonical arguments plus tool name plus acting user, with single-use consumption and a short expiry; at execution, take the approval atomically, recompute the hash over the current arguments and abort to the audit log on any mismatch — which defeats the time-of-check/time-of-use swap where arguments change after approval. Audit every outcome: executed, expired, mismatch, rejected. A model self-assessment is not a control because it runs in the same context that produced the risky plan: the system prompt asks for safety, the model says yes, and nothing independent verified anything — controls must be deterministic, outside the model, and bound to the exact effect.',
          source: 'Safety/design interview: "your agent can send email and refund money — how do you ship it?"',
        },
        summary: [
          'Tier every tool in code: read, reversible write, irreversible/outward.',
          'Preview from code-resolved arguments — the model description of an effect is not the effect.',
          'Approve a hash-bound, single-use, short-TTL token; re-hash before executing.',
          'The model proposes, code disposes: validation, authz, policy and effects stay deterministic.',
          'A human confirming without bound arguments is narrative, not mechanism.',
          'Audit plans and outcomes; watch confirmation and correction rates as product metrics.',
        ],
      }),
      [
        [
          'Which tier does "send an email to a customer list" belong to?',
          [
            'Read — no state changes locally',
            'Reversible write — the email can be recalled',
            'Irreversible / outward-facing — gated with preview and approval',
            'Any tier, decided by the model per request',
          ],
          2,
          'Outward-facing effects on people outside the system are the definition of the gated tier; recall is a myth in email.',
        ],
        [
          'The plan hash in a confirmation flow exists to prevent:',
          [
            'Slow approvals',
            'Arguments changing between preview and execution (TOCTOU)',
            'Model hallucination at proposal time',
            'Duplicate audit rows',
          ],
          1,
          'Binding approval to a canonical hash of tool + user + args makes any post-approval swap fail the re-hash check.',
        ],
        [
          'Asking the model "is this safe to execute?" is not a security control because:',
          [
            'Models cannot read English reliably',
            'It runs in the same context that produced the risky plan and has no independent authority',
            'It adds unacceptable latency',
            'Providers disable self-assessment',
          ],
          1,
          'A control must sit outside the thing being controlled; model self-approval is the risky plan vouching for itself.',
        ],
        [
          'A preview that describes the effect in the model\'s own words is dangerous because:',
          [
            'The model writes longer prose than a template would',
            'The same context that hallucinated the arguments will hallucinate the summary — previews must be rendered from code-resolved data',
            'Streaming previews cost extra tokens',
            'Models cannot describe side effects at all',
          ],
          1,
          'The preview is the last human checkpoint; if it narrates from the plan instead of resolving it, the checkpoint verifies nothing.',
        ],
      ]
    ),
    lesson(
      M6,
      'lla-6-4',
      4,
      'Tool Errors, Feedback Loops and Streaming Tool Rounds',
      'Every tool will fail. Classify the failure, hand it back to the model as structured data the next round can act on, keep the loop bounded so retries cannot become a cost incident, and stream a tool round to the UI without lying about what is happening.',
      16,
      nineBlocks({
        objectives: [
          'Classify tool failures and return each as a structured tool result with a safe, actionable message',
          'Bound the loop: round caps, per-tool retry budgets and no-progress detection',
          'Design the streaming path for tool rounds: argument deltas, status events and final-answer streaming',
          'Cancel in-flight tool work when the client disconnects, and account tokens across every round',
        ],
        hook:
          'A PDF summariser exposes a search tool. One evening a dependency returns a 500 page; the raw HTML lands in the transcript; the model, unable to parse it, apologises and invents three citations; the app retries the same call with the same arguments nine times over four minutes at forty cents a round; the user closes the tab, but the loop does not notice and keeps going. Four failures stacked: unstructured error, hallucinated recovery, unbounded retries and no abort propagation. Each has a fix, and none of them is a better model.',
        concept: `**Errors are results, not exceptions.** An exception thrown away from the transcript throws away the only context the model has. Instead, every failure becomes a tool message with the call id and three fields: a stable error code your code branches on (not_found, invalid_argument, permission_denied, timeout, dependency_unavailable, quota_exceeded), a human-safe message that says what went wrong in plain language, and a hint the model can act on — "order_id must match ORD-YYYY-NNNNN" invites a corrected retry; "no order for this customer" invites asking the user instead. What must never cross back: stack traces, provider dumps, internal hostnames, SQL, secrets (Module 9 owns redaction; this is where it is enforced). The app also decides its own next step from the code: permission_denied is terminal for that call — do not offer the model a retry it is not allowed to succeed at.

**Bounds are what stop a feedback loop from becoming a cost incident.** Three nested limits, all in code. A round cap for the whole turn (six is a common ceiling for real tasks — verify yours with an eval), returning a graceful degraded answer when hit. A per-tool retry budget: the same tool with a materially different argument set may retry twice; identical name-plus-arguments after a retryable failure should be recognised as no-progress and stopped immediately, because repeating a deterministic failure is paying to be wrong. And a dependency circuit breaker: after N failures in a window, the tool reports dependency_unavailable for a cooldown rather than letting every user pay the latency of a dead service. When the budget is exhausted, the honest behaviour is a partial answer with a stated gap — not silent omission.

**Streaming a tool round without lying.** Tool calls stream too: the name and argument fragments arrive as deltas, and arguments are partial JSON until the final fragment — you cannot execute until the call is complete (finish_reason signals it; also verify provider behaviour on aborted argument streams). The UI contract that works: stream any assistant text the model wrote before calling (models may preface with "Looking that up…"), then emit a distinct status event per call — running search, fetching 3 results — then stream the final answer normally. Never render partial JSON as if it were a result, and never show a spinner where a specific status ("checking inventory…") is knowable. Client disconnects must propagate: an abort signal should cancel the in-flight HTTP request to the provider AND the dispatched tool execution, because a closed tab that keeps spending is both a bug and a bill. Usage accounting sums every round: prompt tokens grow with each re-send of the transcript plus accumulated tool results — which is why uncapped loops and 40 KB results (Lesson 2) compound into the same cost curve.

**Honest failure modes.** Truncated argument streams when a client or connection dies mid-call (the tool never ran — say so, do not half-run it); models that call a tool with a missing required field despite the schema (validate and return invalid_argument — the schema reduces, not eliminates, this); tool results so large the final answer degrades (cap at the source); and the classic: an error message so vague the model retries identically forever — which the round cap saves you from but the error design should prevent.`,
        diagram: `flowchart TD
  S["stream: assistant text deltas"] --> C["stream: tool_call name + arg deltas"]
  C -->|"call complete (finish_reason)"| V["validate + execute (cancellable)"]
  V -->|"success"| R["tool result"] --> N["next round"]
  V -->|"failure"| E["structured error as tool result"] --> N
  N --> Q{"round cap / no-progress / circuit breaker?"}
  Q -->|"ok"| S
  Q -->|"exhausted"| G["degraded answer with stated gap"]`,
        extras: [
          table(
            'Failure class → what the tool message says → what the app does',
            ['Class', 'Tool message content', 'App-side action'],
            [
              ['invalid_argument', 'Code + expected shape + example', 'Let the model correct once; second strike = stop'],
              ['not_found', 'Nothing matched; suggest what to ask', 'Model asks user or re-scopes'],
              ['permission_denied', 'Not available for this account', 'Terminal for this call — no retry offered'],
              ['timeout / dependency_unavailable', 'Service slow/down, retry later', 'Count against circuit breaker'],
              ['quota_exceeded', 'Budget exhausted for this period', 'Surface to user; do not retry silently'],
            ],
          ),
          code(
            `// structured errors in, bounded rounds, honest streaming out
const errResult = (code: string, message: string, hint?: string) =>
  JSON.stringify({ error: { code, message, hint } });   // no stack traces, ever

async function turn(events: Emitter, req: Req): Promise<void> {
  let rounds = 0, lastKey = "";
  while (rounds < MAX_ROUNDS) {                          // 1: hard round cap
    const stream = await provider.stream(req.messages, TOOLS, { signal: req.signal });
    const { text, toolCalls, usage } = await consume(stream, events);  // deltas forwarded live
    if (toolCalls.length === 0) return events.final({ text, usage });

    for (const call of toolCalls) {
      events.status(call.name, "running");               // UI: "checking inventory..."
      const key = call.name + stableHash(call.args);
      if (key === lastKey && call.retrying)              // 2: no-progress detection
        return events.final({ text: degrade(text), usage });
      lastKey = key;
      const out = await SEM.acquire(() =>
        dispatch(call, req.signal));                     // cancellable on disconnect
      req.messages.push(toolMsg(call.id, out));
    }
    rounds++;                                            // usage from every round accumulates
  }
  events.final({ text: degrade(""), reason: "round_cap" });
}`,
            'toolloop.ts',
            'ts',
          ),
          tip(
            'Write the error message for the model, not for the log',
            '"order_id must look like ORD-2026-00417" produces a corrected retry; "Error 500" produces three invented citations.',
          ),
          warn(
            'A tool loop without a round cap is an open purchase order',
            'Caps, retry budgets and a circuit breaker live in code — the model will not impose them on itself.',
          ),
          info(
            'Streaming status beats a spinner',
            'Users rate a wait as shorter when it shows named progress; and a specific status is also better debugging.',
          ),
        ],
        worked: {
          title: 'Harden the knowledge assistant: errors, caps, streaming',
          problem:
            'The assistant retrieves internal docs via search_docs and can summarise long files. A dependency outage produces the raw-500 story from the hook. Redesign the error path, the loop bounds and the streaming events.',
          steps: [
            {
              title: 'Turn every failure into a coded tool result',
              desc: 'search_docs wraps its dependency: on 5xx it returns {"error": {"code": "dependency_unavailable", "message": "The document index is briefly unavailable.", "hint": "Answer from context if you can, otherwise say the index is down."}}; on an empty query, invalid_argument with the expected shape; on an ACL miss, permission_denied marked terminal. Redaction runs on the message field before it is serialised — stack traces and hostnames die at the boundary.',
              code_snippet:
                'dependency_unavailable -> {"code":"dependency_unavailable","message":"The document index is briefly unavailable.","hint":"Answer from context or state the gap."}\npermission_denied     -> terminal: the handler does NOT re-offer this call next round\ninvalid_argument      -> {"expected":"non-empty query, max 400 chars"} -> model fixes once',
            },
            {
              title: 'Add the three bounds and watch a bad night replay',
              desc: 'MAX_ROUNDS = 6 per turn; per-tool retry budget of 2 with same-key detection; circuit breaker opens after 5 dependency failures in 60 s. The outage replay now runs at most two attempts, then returns "the index is down — here is what I can say from this session" instead of nine paid rounds and three fabricated citations.',
            },
            {
              title: 'Fix the streaming contract',
              desc: 'Events: text deltas while the model narrates; a status event per tool call ("searching docs", "reading file X"); status done; then final answer deltas; final event carrying summed usage across all rounds, finish reason and trace id. Argument deltas are buffered and only executed on completion — a disconnect mid-arguments cancels the provider request and any dispatched tool, and the audit shows the call never ran.',
            },
            {
              title: 'Verify with the failure fixtures from Module 5',
              desc: 'Replay the six mock fixtures plus two new ones (dependency_unavailable, invalid_argument). All eight produce the right UI state, the right next round or a bounded stop, and usage that sums correctly. The eval case that used to fail with hallucinated citations now passes because the recovery is specified rather than improvised.',
            },
          ],
          solution:
            'Failures became data with codes and hints, the loop acquired three independent bounds, and the stream told the truth about what was running. The outage that once cost nine rounds of spend and the user\'s trust now costs two attempts and one honest sentence — and because cancellation follows the disconnect, closing the tab actually stops the work. None of this required a smarter model; it required treating the tool loop as an engineered control system: bounded, observable and cancellable.',
        },
        practice: {
          title: 'Harden your tool loop',
          prompt:
            'For each tool you have, write the five-row failure table: class, tool-message content, app action. Implement a round cap, a no-progress check on identical tool-plus-args, and a circuit breaker for your flakiest dependency. Then write the streaming event list for one tool round (text, status, status, final) including the usage line that sums every round. Report how many rounds your worst real case used.',
          hint: 'If your error path returns raw provider text into the transcript, you have handed the model a license to improvise over noise.',
        },
        mistakes: [
          {
            mistake: 'Returning raw exception text or HTML error pages as tool results',
            fix: 'Coded, human-safe messages with an actionable hint; redact stack traces, hostnames and secrets at the boundary.',
          },
          {
            mistake: 'Open-ended retry loops',
            fix: 'Round cap, per-tool retry budget, same-key no-progress detection and a circuit breaker — all enforced in code.',
          },
          {
            mistake: 'Rendering partial argument JSON or pretending a spinner is a status',
            fix: 'Buffer arguments until the call completes; emit named status events per tool; stream only real text.',
          },
          {
            mistake: 'Ignoring client disconnect',
            fix: 'Propagate an abort signal to the provider request and dispatched tools; a closed tab must stop the spend.',
          },
        ],
        exam: {
          question:
            'What must a tool error result contain and what must it never contain? Describe three bounds on a tool loop and the streaming event sequence for a round.',
          answer:
            'Contain: a stable error code for code to branch on, a human-safe plain-language message, and an actionable hint that lets the model choose a different next step; posted as a tool message with the correct call id. Never contain: stack traces, raw provider dumps, internal hostnames, SQL, or any secret — redaction runs before serialisation. Bounds: (1) a hard round cap per turn, after which the app returns a graceful degraded answer; (2) a per-tool retry budget with same-key no-progress detection so a deterministic failure is not repeated for money; (3) a circuit breaker that short-circuits a failing dependency for a cooldown instead of charging every request for its latency. Streaming sequence: assistant text deltas (any narration before the call) → per-call status events while argument deltas are buffered (nothing executes until the call is complete) → final answer deltas → a final event with usage summed across all rounds, finish reason and trace id; client abort propagates to both the provider stream and dispatched tool execution so a disconnected tab stops spending.',
          source: 'Production-readiness review: "show me how your agent behaves when a tool fails."',
        },
        summary: [
          'Errors become structured tool results: code, safe message, actionable hint.',
          'Never leak stack traces, hostnames or secrets back into the transcript.',
          'Three bounds in code: round cap, per-tool retry budget, dependency circuit breaker.',
          'Streaming tool rounds: text deltas, named status events, buffered arguments, honest final usage.',
          'Disconnect must cancel provider and tool work — otherwise the tab closes and the bill does not.',
          'Degrade with a stated gap when bounds are hit; silent omission is the worst recovery.',
        ],
      }),
      [
        [
          'A tool that fails should return its failure as:',
          [
            'A thrown exception that terminates the turn',
            'A structured tool result with a code and an actionable hint, so the model can choose a different next step',
            'An empty string so the model fills the gap',
            'The raw provider error page for full fidelity',
          ],
          1,
          'Failures are data in the transcript; coded and actionable, they enable recovery — raw dumps invite improvisation.',
        ],
        [
          'The same tool with identical arguments fails twice with a timeout. Best response:',
          [
            'Retry until it succeeds; availability always recovers',
            'Recognise no-progress on the identical key, stop retrying, and either break the circuit or answer with the stated gap',
            'Raise max_tokens and retry',
            'Switch to a larger model and retry the same call',
          ],
          1,
          'Repeating a deterministic failure is paying to be wrong; key-based detection and a breaker cap the damage.',
        ],
        [
          'While streaming, the model emits an argument fragment for a tool call. The app should:',
          [
            'Execute the tool immediately with the partial arguments',
            'Render the partial JSON to the user as a result',
            'Buffer fragments until the call completes, showing a named status event meanwhile',
            'Discard fragments and re-request without streaming',
          ],
          2,
          'Partial arguments are not valid input; buffer to completion and surface honest, specific status instead.',
        ],
        [
          'Why does every round of a tool loop increase cost even when the final answer is short?',
          [
            'Tool results are billable only on the last round',
            'Each round re-sends the growing transcript plus accumulated tool results as input tokens',
            'Providers charge a fixed fee per round',
            'Streaming costs more than non-streaming',
          ],
          1,
          'Input grows monotonically across rounds — which is why caps and result caps are cost controls, not just correctness controls.',
        ],
      ]
    ),
  ],
};
