// Module 9 — Agent-Style Prompting: Tools, Plans, Recovery, Verification
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code } from '../nineBlocks';
import { lesson, M9, COURSE_ID } from './helpers';

export const module9: CourseModule = {
  id: M9,
  course_id: COURSE_ID,
  title: 'Module 9 — Agent-Style Prompting: Tool Instructions, Plans, Recovery, Verification',
  summary:
    'Where Module 4\'s decomposition grows teeth: giving a model tools, a plan, memory of its own progress and a habit of checking itself. Tool-instruction design (selection rules, argument discipline, errors-as-prompts); multi-step plan prompting with stop conditions and replan triggers; bounded error-recovery loops plus intermediate state that survives long trajectories; and verification loops — with the agent failure taxonomy and the prompting mitigation for each class.',
  sort_order: 9,
  lessons: [
    lesson(
      M9,
      'pem-9-1',
      1,
      'Tool Instructions: Designing What the Model May Do and When',
      'The schema contracts the action; the instructions decide whether the right action is chosen. Tool descriptions as decision rules, an explicit routing table, argument-source discipline, and error messages written like prompts.',
      16,
      nineBlocks({
        objectives: [
          'Write tool descriptions with purpose, when-to-call, when-not-to-call and argument semantics',
          'Define an explicit routing table: call a tool, ask the user, or answer directly',
          'Enforce argument-source discipline so ids and values are never invented',
          'Design tool error messages that instruct the next move instead of merely failing',
        ],
        hook:
          'An assistant ships with two overlapping tools, search_orders and get_order, plus refund_policy. Its developer wrote descriptions like "searches orders" and "gets order info". In production it calls search_orders with a full-text essay as query, invents an order id when the user says "my recent order" (there is no recency tool), and on a not-found error retries three times with progressively hallucinated ids. The schema kept every argument perfectly typed. Nothing told it which tool is right, where values must come from, or what an error means.',
        concept: `**Schemas bound the action; instructions steer it.** Module 6, Lesson 3 gave you the contract layer: registered tools, enforced argument types, deterministic execution. This lesson is the layer above it — the text the model actually reads when deciding *whether* to call, *which* to call, *what values* to pass and *what to do when a call fails*. Teams routinely over-invest in schema and under-invest here, then blame "tool-use flakiness" on the model.

**Tool descriptions are decision rules, not labels.** Every description carries four parts:

1. **Purpose** — one sentence: what question or task this tool answers.
2. **When to call** — concrete triggers phrased like real user intents ("the user asks about status, tracking or delivery date of an existing order").
3. **When NOT to call** — the boundary cases that actually cause mis-selection ("not for pre-sales questions, pricing, or when no order reference exists — ask for one instead"). The negative half does disproportionate work: models select partly on name similarity, so name plus boundary is what holds the line.
4. **Argument semantics** — each argument's meaning with one example, its source, and its failure behavior ("order_id: from the user or a CRM lookup, exact format ORD-#####; never constructed from context").

**An explicit routing table beats vibes.** Where tools overlap — or where "no tool" is a legitimate answer — write the route into the system prompt as a small decision table mapping user-intent class to action: call this tool, ask one clarifying question, or answer directly from supplied policy text. Include the *no-tool branch*: tasks answerable from provided material or plain conversation get answered directly; forcing a call every turn creates phantom calls, latency and error surface. Include the *ask branch*: when a required argument has no trustworthy source, the correct action is one clarifying question, not a best guess. This is Module 1's specificity relocated — from "do not guess the audience" to "do not guess the id".

**Argument-source discipline.** State it as law: every argument traces to a quoted source — the user's message, a prior tool result, or a record you just looked up. Values from conversation history only if explicitly stated there; never constructed, never inferred by string surgery, never "likely". For categorical arguments, the schema's enum plus one-line semantics (Module 6) completes the rule. For high-stakes calls, add a cheap pre-call habit: the model prints its choice and a one-line reason before executing ("CHOICE: get_order — user gave ORD-48213"). One visible line makes a wrong selection legible before any side effect.

**Errors are prompts too.** The error text your tool returns is instruction the model obeys next turn — so author it like instruction. A bare "not found" invites retry-with-vibes; a structured error names its class and the required response: "NOT_FOUND: no order with id X. Do NOT retry with a different id. If the user gave no id, ask for it; if they did, report that id is unknown." Classes (NOT_FOUND / BAD_ARG / PERMISSION / TRANSIENT) map directly onto recovery policy (Lesson 3). The best error says both what happened and what to do now — error messages live in the same instruction channel as your system prompt, so their authorship is prompt authorship.

**Scale checks.** Selection quality degrades as tools multiply: beyond a handful of overlapping tools, group and compose into fewer decision-shaped ones, and audit for near-duplicate names competing for the same intent. Every description costs input tokens on every call — keep rules, cut narrative. Tool-calling behaviors (parallel calls, forced choice, required vs optional arguments) vary by provider; verify against your provider's current docs before building policy on them.`,
        extras: [
          table(
            'Anatomy of a tool instruction set',
            ['Layer', 'Content', 'Failure without it'],
            [
              ['Tool description', 'Purpose, when, when-NOT, argument semantics + example', 'Selection by name similarity; phantom calls'],
              ['Routing table', 'Intent class -> tool / ask / answer directly', 'No-tool branch forgotten; needless calls'],
              ['Argument discipline', 'Every value traced to a quoted source', 'Invented ids; string-surgery guesses'],
              ['Error contract', 'Class + required next response inside the error', 'Blind retries with hallucinated arguments'],
            ],
          ),
          code(
            `# system addition: routing table + argument law\nROUTING (decide before any call):\n  existing order status/tracking  -> get_order\n  new refund request              -> refund_policy (rules first)\n  pre-sales / pricing / general   -> answer directly, NO tool call\n  missing required argument       -> ask ONE clarifying question\n\nARG LAW: every argument must quote its source (user message or\nprior tool result). No construction, no inference. No -> ask.\nBefore a call, print: CHOICE: <tool> - <one-line reason>`,
            'routing_table.txt',
            'text',
          ),
          tip(
            'Write the when-NOT-to-call half first',
            'The negative rule is where overlapping tools actually get separated; models select on name similarity until the boundary is stated with its alternative action.',
          ),
          warn(
            'The error text is an instruction you authored',
            '"not found" teaches nothing. Class plus required next action in every tool error, or retry policy is delegated to chance.',
          ),
        ],
        worked: {
          title: 'From label descriptions to a steering instruction set',
          problem:
            'A support assistant ships with search_orders ("searches orders"), get_order ("gets order details") and refund_policy ("refund rules"). Production misfires: essays sent as search queries, an invented order id from "my recent order", and a three-retry storm after NOT_FOUND. Write the instruction layer that fixes all three — no schema changes required.',
          steps: [
            {
              title: 'BEFORE: the weak instruction set, annotated',
              desc: 'Labels instead of decisions, no routing table, no argument law, bare errors. Each misfire maps to one absence: essay queries (no when-to/when-NOT), invented id (no source rule), retry storm (error teaches nothing).',
              code_snippet:
                'BEFORE (weak)\ndesc: "searches orders" | "gets order details"\nerrors: { code: "not found" }\nsystem: "Use tools to help the customer."\n\n-> selection by name similarity, invented args,\n   retries coached by nothing.',
            },
            {
              title: 'Rewrite descriptions as four-part decisions',
              desc: 'get_order now states purpose, concrete call triggers, the not-call boundary (pre-sales; missing reference -> ask) and argument semantics with exact source format. The essay-query failure dies at the when-NOT line; the invented-id path dies at the source rule.',
              code_snippet:
                'AFTER, get_order description:\nPURPOSE: status of one EXISTING order.\nCALL WHEN: user asks status/tracking/delivery/return of an\n  order AND an id (ORD-#####) is present in conversation.\nDO NOT CALL: pre-sales, pricing, or no id present -> if no id,\n  ask one question: "Which order id?"\nARGS: order_id quoted verbatim from user or prior tool result,\n  format ORD-#####. Never built from context cues.',
            },
            {
              title: 'Add the routing table and argument law to the system prompt',
              desc: 'The system prompt carries the cross-tool decisions (see extras): intent classes mapped to tool, direct answer or ask; the no-tool branch for policy questions answerable from supplied text; and the pre-call CHOICE line. "My recent order" now resolves to ask-for-id — the only honest route, since there is no recency tool.',
            },
            {
              title: 'Rewrite the errors as instructions',
              desc: 'NOT_FOUND now names its class and required response: never retry with a different id, ask only when the user supplied none, otherwise report unknown. A TRANSIENT class that should retry once completes the policy — retry behavior becomes something you wrote instead of a habit the model invented.',
              code_snippet:
                'AFTER, error contract:\nNOT_FOUND: no order matches <id>. Do NOT retry with another\n  id. If the user gave none -> ask; if they did -> report\n  that id unknown and offer lookup by email.\nBAD_ARG: fix the argument; do not repeat the call unchanged.\nTRANSIENT: retry ONCE after a short wait, then report.',
            },
          ],
          solution:
            'Three misfires, four fixes, zero schema changes: essay queries stopped at the when-NOT boundary; the invented-id path collapsed into a single clarifying question under the argument law; the retry storm became written policy because errors carry class and required response; phantom calls for policy questions died with the explicit no-tool branch. The generalization: tool-selection failures are usually instruction failures wearing a model-costume — the schema proves arguments are well-formed, the instruction layer decides whether they should exist at all.',
        },
        practice: {
          title: 'Audit your tool instruction layer',
          prompt:
            'List your tools (or imagined ones). For each: purpose, when-to-call, when-NOT-to-call, argument source rule, and one example argument value. Then write the routing table covering tool / ask / direct-answer branches, and rewrite your three most common tool errors as class plus required next response. Simulate five user turns — one missing an id, one needing no tool at all — and note where the old set would have mis-routed.',
          hint: 'If you cannot write a when-NOT for a tool, two of your tools probably compete for the same intent — merge them or sharpen the boundary.',
        },
        mistakes: [
          {
            mistake: 'Descriptions that are labels ("searches orders")',
            fix: 'Four parts: purpose, when-to-call, when-NOT-to-call, argument semantics with an example — selection is a decision the description must support.',
          },
          {
            mistake: 'No no-tool branch and no ask branch',
            fix: 'Forcing a call every turn creates phantom calls; define "answer directly from supplied policy" and "ask one clarifying question" as first-class routes.',
          },
          {
            mistake: 'Arguments allowed from plausible inference',
            fix: 'Every value quotes a source; no construction, no string surgery. No source means ask — that is what prevents invented ids.',
          },
          {
            mistake: 'Bare error codes with no required response',
            fix: 'Errors are next-turn instructions: class plus what to do now (retry once / fix argument / ask / stop), or retry behavior is left to chance.',
          },
        ],
        exam: {
          question:
            'Give the four parts of a tool description and explain why the when-NOT-to-call half matters most with overlapping tools. What is argument-source discipline, and why are error messages part of prompt design?',
          answer:
            'Four parts: (1) purpose — what question the tool answers; (2) when to call — concrete triggers phrased as real intents; (3) when NOT to call — boundary cases with the alternative action (ask, answer directly, use another tool); (4) argument semantics — each argument\'s meaning, exact source and an example. The negative half matters most with overlapping tools because models select partly on name similarity: when two names plausibly fit an intent, only the stated boundary separates them, and the stated alternative converts a would-be mis-call into the correct ask or direct answer. Argument-source discipline: every argument must be traceable to a quoted source (user message or prior tool result), never constructed or inferred, with no source meaning one clarifying question instead of a guess — this prevents invented ids. Error messages are prompt design because returned error text occupies the same instruction channel as the system prompt next turn: an error naming its class and required response (retry once / fix argument / ask / stop) implements recovery policy you authored, while a bare "not found" leaves retry behavior to the model\'s habits.',
          source: 'Agent tooling design question; standard in LLM application and agentic-system interviews.',
        },
        summary: [
          'Schemas bound the action; the instruction layer steers it: purpose, when, when-NOT, argument semantics.',
          'Routing table with three branches: call, ask one question, answer directly — no-tool is a legitimate route.',
          'Argument law: every value quotes a source; no source means ask, never construct.',
          'Tool errors are prompts: class plus required next response, or retry policy is delegated to chance.',
          'Audit for competing tool names; descriptions are read every call, so keep rules and cut narrative.',
        ],
      }),
      [
        [
          'Two tools plausibly fit one intent. What actually separates them in practice?',
          [
            'The schema\'s required fields',
            'The when-to-call and when-NOT-to-call rules — models select partly on name similarity until boundaries are stated',
            'The order they appear in the tool list',
            'Temperature settings',
          ],
          1,
          'Names compete; stated boundaries with alternative actions decide, and the negative half does the separating.',
        ],
        [
          'The user says "check my recent order" and no id exists in conversation. Under argument-source discipline you must:',
          [
            'Guess the most recent id from context',
            'Construct a placeholder id and call',
            'Ask one clarifying question for the order id — no source means no argument',
            'Call search_orders with the whole sentence as the query',
          ],
          2,
          'A missing source means the argument may not exist; the ask branch is the only honest route.',
        ],
        [
          'A tool returns NOT_FOUND for an id the user explicitly provided. The error text should instruct the model to:',
          [
            'Retry immediately with the same arguments',
            'Construct a nearby id and try again',
            'Report that the id is unknown and offer an alternative lookup — no retries with different ids',
            'Invent a plausible status anyway',
          ],
          2,
          'Class plus required response turns the error into policy; blind retries with mutated arguments are the signature failure.',
        ],
        [
          'Why define an explicit "answer directly, no tool call" branch?',
          [
            'It reduces input token cost automatically',
            'Without it, every turn forces a phantom call — latency, error surface and hallucinated arguments for tasks that needed conversation only',
            'Providers require at least one no-tool route',
            'It makes schemas stricter',
          ],
          1,
          'The no-tool branch is a real decision class; leaving it undefined makes calling the default instead of the choice.',
        ],
      ]
    ),
    lesson(
      M9,
      'pem-9-2',
      2,
      'Multi-Step Plan Prompting: Plan First, Execute Under Contract, Replan on Evidence',
      'Free-running agents improvise, and improvisation leaves no artifact to inspect. Make the plan explicit — numbered steps with expected evidence, a stop condition, a budget — so deviation becomes visible and replanning becomes a decision instead of a drift.',
      16,
      nineBlocks({
        objectives: [
          'Require an explicit numbered plan before any tool call on multi-step tasks',
          'Attach expected evidence to each step so progress is checkable',
          'Define stop conditions and a step budget that bound a trajectory',
          'Trigger visible replans from failure, contradiction or budget instead of silent improvisation',
        ],
        hook:
          'A manager tells an agent: "Look into what happened with this customer\'s order and make it right." Fourteen tool calls later it has opened billing tables, drifted into last quarter\'s pricing, retried a lookup twice, and apologized about something unrelated. Nobody can reconstruct what it was trying to do — because there was never anything to reconstruct. The plan lived, or never lived, inside generation. Free-running agents do not have a failure mode; they have no mode.',
        concept: `**The plan is an artifact, not a mood.** For one- and two-step tasks, act immediately — planning costs more than it saves. Past that, an explicit plan converts an opaque trajectory into something reviewable at three moments: *before* side effects (a human can approve, veto or edit a plan involving writes), *during* execution (each action maps to a numbered step, so deviation is visible rather than ambient), and *after* (the log reads as step 3 FAILED -> REPLAN, which is debuggable; "then it did a bunch of stuff" is not). Plans also front-load decomposition quality: forcing the steps out before acting exposes a bad decomposition while it is still cheap words.

**Plan anatomy — five elements per step.** (1) *Action*: which tool or read, in intent terms. (2) *Goal*: the state this step should establish. (3) *Expected evidence*: how you will know it worked — "order events returned containing at least one shipment entry", not "investigate further". Unverifiable steps ("gather context", "look around") are where drift hides, because anything can be reported as having done them. (4) *Order and dependencies* — stated, so a failure has a clear blast radius. (5) *Blast radius* for any step with side effects (write, send, refund): what it changes and how to detect it went wrong. Then two global elements: a **STOP condition** (goal satisfied with evidence / premise contradicted / budget exhausted -> report state honestly) and a **step budget** (max actions; exhaustion means report, not one more try).

**Prompt mechanics: PLAN, then EXECUTE.** Structure the output in two phases. First a PLAN block — numbered steps with the five elements, printed *before* any tool call. For low-risk read-only tasks the plan can execute immediately after printing. For steps with side effects (refunds, sends, deletes), the contract requires a pause: plan -> human approval (or policy check) -> execute. Once executing, every action is annotated with its step number and status, and unplanned side-effect steps are forbidden — if the situation changed, that is a replan, not an improvisation.

**Replan triggers — visible, never silent.** Three events force a REPLAN block: a step fails after its allowed recovery (Lesson 3's classes decide the recovery, then the plan question), evidence *contradicts an assumption* the plan was built on (the premise check — "planned for an existing order; none exists"), or the budget runs out mid-plan (replan to a reporting-only tail). The REPLAN block states the reason and the revised steps. Silent deviation — quietly doing something unlisted — is what turns plans into theater: the artifact survives, the reality diverges, and postmortems read fiction.

**Costs and honest limits.** Planning costs tokens and latency, and over-planning one-step tasks is pure waste — the rule is plan for multi-step and side-effect-bearing work, act directly for simple asks. Plans also do not guarantee good plans: a confidently wrong plan executes confidently wrong. That is why expected evidence and the premise check stay mandatory, and why the strongest version still verifies each step's result (Lesson 4). The mitigation stack is layered: prompt shapes the behavior; hard limits (max steps, permission gates) live in your harness code — prompting persuades, code enforces, and serious agents have both.`,
        extras: [
          table(
            'Plan block anatomy',
            ['Element', 'Example', 'Failure without it'],
            [
              ['Action + goal', '3. get_order ORD-48213 -> shipment events in hand', 'Steps that name no destination'],
              ['Expected evidence', 'Events list contains >= 1 shipment entry', '"Investigate further" — drift hides here'],
              ['Blast radius', '6. refund_store: writes money; abort if already refunded', 'Silent side effects on a wrong premise'],
              ['STOP condition', 'Evidence assembled -> answer with step citations', 'Open-ended "keep going"'],
              ['Step budget', 'Max 8 actions; then report partial state', 'Cost blowups; one-more-try spirals'],
            ],
          ),
          code(
            `# PLAN first (printed before any tool call)\nPLAN (read-only, budget 6):\n1. get_order(ORD-48213) -> events list\n   EV: >=1 shipment entry present\n2. get_refunds(order_id) -> refund records\n   EV: records retrieved (may be empty)\n3. Premise check: order exists AND not refunded\n   -> if either fails: REPLAN with reason\n4. Compose answer: timeline + status, cite steps 1-2\nSTOP: after 4, or when premise check fails.\n\n# during execution:\n[step 1 OK] [step 2 OK] [step 3 OK] -> execute 4\n# a failed forced step prints: REPLAN: <reason> + revised PLAN`,
            'plan_block.txt',
            'text',
          ),
          tip(
            'Expected evidence is the load-bearing element',
            'A step you cannot check is a step anything can claim completed. Evidence phrases make progress auditable and stop conditions enforceable.',
          ),
          warn(
            'Silent deviation destroys the artifact',
            'If execution may diverge from the plan, divergence must be printed as REPLAN with reason — otherwise the plan is decoration over an invisible free-run.',
          ),
        ],
        worked: {
          title: 'Convert an open-ended "make it right" agent into a plan-contracted one',
          problem:
            'A support agent is given "find out what happened with this order and make it right". It free-runs: 14 calls, scope drift into pricing, a duplicated lookup, an unauthorized discount offer. Rebuild its prompt with plan-first contracting and watch a failing scenario behave.',
          steps: [
            {
              title: 'Diagnose the free-run',
              desc: 'Three structural absences: no pre-action artifact (nothing to approve or audit), no verifiable steps (anything counts as "investigating"), no budget or stop (the loop ends when generation wanders off). The unauthorized discount is a side effect executed without a blast-radius line or an approval gate.',
            },
            {
              title: 'BEFORE: the weak instruction, annotated',
              desc: 'One sentence of intent with verbs that authorize everything. "Make it right" is an unbounded goal with side effects and no stop — the worst possible shape for free-running generation.',
              code_snippet:
                'BEFORE (weak)\n"You are a careful support agent. Find out what happened\n with this customer\'s order and make it right. Ask if needed."\n\nUnbounded: no plan, no evidence, no budget, no gate\nbefore money-moving actions.',
            },
            {
              title: 'AFTER: the plan contract',
              desc: 'Two-phase output, expected evidence per step, premise check, budget, gate on writes. The plan block (extras) shows the read-only core; any step that spends money or sends mail requires approval between PLAN and EXECUTE.',
              code_snippet:
                'AFTER (contract excerpt)\n1. Before ANY tool call, print PLAN: numbered steps, each\n   with GOAL + EXPECTED EVIDENCE. No side effects until the\n   plan is approved (policy gate for writes/refunds/sends).\n2. Execute in order; annotate [step N OK|FAILED].\n3. On step failure after one class-appropriate recovery, or\n   if evidence contradicts a plan premise -> print REPLAN:\n   reason + revised steps. Never diverge silently.\n4. Budget: max 8 actions. Exhausted -> report partial state.\n5. Final answer cites the steps that support each claim.',
            },
            {
              title: 'Run the scenario where step 2 fails',
              desc: 'Execution: step 1 OK (events show a lost parcel); step 2 FAILED (no refund records — expected empty, premise "already refunded" was mine, not the data\'s); the contract forces REPLAN with reason: "premise wrong — refund path does not apply; policy for lost parcels is reship or refund". Revised plan: 3. check reship eligibility; 4. approval-gated refund step for human sign-off; 5. compose answer citing 1-3. Fourteen drifting calls become seven annotated steps with an honest audit trail — and the money still moves only through a gate.',
            },
          ],
          solution:
            'Every free-run pathology met a contract element: drift died on expected evidence (steps either produce their evidence or fail loudly), the duplicate lookup died on step annotations (a repeated step is visible), the unauthorized discount died on the write-gate and blast-radius rule, the premise error surfaced as an explicit REPLAN instead of a confident wrong action, and the budget replaced open-endedness with a reporting obligation. The final answer citing steps is not decoration: it is what makes a multi-step claim set checkable — the thread that Lesson 4 pulls tight.',
        },
        practice: {
          title: 'Write a plan contract for a real workflow',
          prompt:
            'Take a multi-step task you would automate (investigate a bug, research a purchase, reconcile two records). Write the full contract: PLAN format with five elements per step, expected evidence phrased checkably, one premise check, a stop condition, a step budget, and the rule for approval gates on side effects. Then simulate one execution where step 2 fails and produce the REPLAN block. Report which element was missing from your usual way of asking.',
          hint: 'If a step\'s evidence cannot be stated, the step is not a step — it is a mood. Split it until each produces something checkable.',
        },
        mistakes: [
          {
            mistake: 'Unverifiable steps ("gather context", "investigate further")',
            fix: 'Every step gets expected evidence — a result shape or countable outcome — so completion is checkable and drift has nowhere to hide.',
          },
          {
            mistake: 'Planning for one-step tasks; free-running side-effect tasks',
            fix: 'Match mode to risk: act directly on simple read-only asks; plan-first when steps multiply or anything writes, sends or spends.',
          },
          {
            mistake: 'Letting execution deviate from the plan silently',
            fix: 'Divergence prints REPLAN with reason and revised steps — otherwise the artifact survives while reality drifts, and audits read fiction.',
          },
          {
            mistake: 'No budget or stop condition',
            fix: 'Exhausted budget means report partial state, not one more try. STOP conditions are what make "done" a decision instead of a pause.',
          },
        ],
        exam: {
          question:
            'Define the five per-step elements of a plan block plus the two global elements. Explain why plan-first beats free-running for side-effecting tasks, and what must happen when evidence contradicts a plan premise.',
          answer:
            'Per-step: (1) action plus goal — what tool/intent and what state it should establish; (2) expected evidence — the checkable result that proves the step worked; (3) order/dependencies; (4) blast radius for side-effecting steps — what it changes and how to detect harm; (5) the step status annotation during execution. Global: a STOP condition (goal satisfied with evidence, premise contradicted, or budget exhausted -> report) and a step budget bounding total actions. Plan-first beats free-running for side-effecting work because the artifact enables pre-action review (approval/veto before writes), makes deviation visible against numbered steps, front-loads decomposition quality while it is still cheap, and gives the audit trail something to reconstruct — free-running leaves only generation to explain. When evidence contradicts a premise, the contract requires a printed REPLAN with reason and revised steps — never silent improvisation, because a plan that diverges invisibly is theater, and the wrong-premise action would otherwise execute with full confidence.',
          source: 'Agentic workflow design question; the plan-and-execute vs free-running discussion.',
        },
        summary: [
          'Plan as artifact: approve before side effects, annotate during execution, reconstruct afterward.',
          'Five elements per step — action, goal, expected evidence, dependencies, blast radius — plus STOP condition and step budget.',
          '"Investigate further" is where drift hides; evidence phrases make every step checkable.',
          'REPLAN is mandatory and visible on failure, contradiction or budget exhaustion — silent deviation turns plans into theater.',
          'Prompting persuades, harness code enforces: hard caps and permission gates belong in code beside the contract.',
        ],
      }),
      [
        [
          'Primary value of printing a PLAN before tool calls on a multi-step task:',
          [
            'It reduces token cost',
            'It creates an inspectable artifact: pre-action approval, visible deviation, and a reconstructable audit trail',
            'It guarantees the plan is correct',
            'It disables the need for verification',
          ],
          1,
          'The artifact is the mechanism — approval, deviation detection and post-hoc debugging all read the same plan.',
        ],
        [
          'A plan step reads "investigate the account further". The problem and the fix:',
          [
            'No problem — it reads naturally',
            'It is unverifiable; rewrite with expected evidence (a result shape or countable outcome) so completion is checkable',
            'It should be split into two such steps',
            'Add a longer time limit to it',
          ],
          1,
            'Unverifiable steps are where drift hides: anything can be reported as having done them.',
        ],
        [
          'Execution contradicts a plan premise (the order the plan assumed does not exist). Required behavior:',
          [
            'Continue — plans should be followed exactly',
            'Print REPLAN with the reason and revised steps; never diverge silently',
            'Restart the entire plan from step 1 without comment',
            'Invent the missing entity and proceed',
          ],
          1,
          'Contradiction is a replan trigger: visible revision keeps the artifact true to reality.',
        ],
        [
          'When should a plan step with side effects (refund, send, delete) require a gate?',
          [
            'Never — the plan already authorized everything',
            'Between PLAN and EXECUTE: print the plan, get approval or policy check, then act — blast radius is stated so the gate has something to judge',
            'Only after the side effect completes',
            'Only when the model feels uncertain',
          ],
          1,
          'Approval belongs where risk concentrates: after intent is visible, before irreversibility.',
        ],
      ]
    ),
    lesson(
      M9,
      'pem-9-3',
      3,
      'Error Recovery and State: Bounded Retries, Error Classes, the Scratchpad That Survives',
      'How an agent behaves after a failed call decides most of its usefulness. Classify errors into policies (retry-once, fix-and-retry, ask-or-stop, escalate), forbid argument mutation by guesswork, and keep a terse intermediate state block so long trajectories do not forget their own facts.',
      15,
      nineBlocks({
        objectives: [
          'Map error classes — TRANSIENT, BAD_ARG, NOT_FOUND, PERMISSION — to specific recovery policies',
          'Bound retries per class and forbid mutating arguments to force a success',
          'Maintain a terse intermediate state block across long trajectories',
          'Prompt for honest partial reports instead of fabricated completions when loops exhaust',
        ],
        hook:
          'A retrieval tool times out. The agent immediately fires the same call again — same result. On the third failure it slightly rephrases the arguments, which now pass transport but query the wrong quarter, and the answer confidently reports numbers from the wrong dataset. Ask it about the failure and it will say the step succeeded. No single bad decision made this trajectory; the prompt simply never defined what failure means, so failure became improvisation.',
        concept: `**Undefined recovery is bad recovery.** Left unguided, models exhibit three reliable pathologies after a failed call: immediate blind retry (the same call, verbatim, three times), then argument mutation (rephrase values until something passes — which manufactures hallucinated inputs), then confabulated completion (the trajectory report claims success anyway). All three are absence-of-instruction failures, same as tool selection in Lesson 1. The fix is a small policy table plus a state block, both cheap to write.

**Recovery policy by error class.** Classify every tool failure into one of four buckets, each with a distinct response:

- **TRANSIENT** (timeout, 5xx, rate limit): retry **once** after a brief pause; a second failure escalates to report — transient is not a license for loops.
- **BAD_ARG** (validation failed): fix the argument from its true source and retry once; never repeat the call unchanged (that is noise, not recovery), and never invent a replacement value — if the source is missing, that is an ask, not a guess.
- **NOT_FOUND** (the id or key is valid in form but matches nothing): if the user supplied the id, report it unknown and offer an alternative lookup (email, order list); if the id came from inference, the process was already wrong — the recovery is to ask, per Lesson 1's argument law.
- **PERMISSION / forbidden**: stop. Do not retry, do not route around the restriction with a different tool, do not soften it in prose. Escalate to a human or report the limit plainly.

An **UNKNOWN** class — an error you did not anticipate — defaults to not-retryable: report it with the raw message. Silent assumption that unknown means transient is how retry storms start.

**Retry bounds are part of the policy.** At most one retry per class per step, and an overall retry budget per task. The deepest rule is the one that stops hallucination loops: **never mutate arguments to force a success**. A value that fails validation does not become more true when rephrased; mutation on failure is precisely the mechanism by which invented ids and wrong-quarter numbers enter answers. Fix from source, ask, or stop — those are the only three moves.

**The intermediate state block.** Long trajectories dilute early findings: the model re-derives a fact it already established, drops a resolved subgoal, or loses track of what the last call actually proved. A small standing block, refreshed after each tool result or every few steps, re-anchors generation:

GOAL — one line, copied from the task, never rewritten mid-run unless replanning.
KNOWN — facts with their source (tool result / user message), nothing unreferenced.
OPEN — unresolved questions in priority order.
ATTEMPTED — what was tried and its outcome class (OK / TRANSIENT x2 / NOT_FOUND) — the anti-repetition ledger.
NEXT — the single next action.

Keep it terse — this is Module 6's structured-output discipline applied to memory: the block is for continuity, not narrative. Its audit value compounds: a human reading the state block mid-trajectory can see what the agent believes and where it is going without replaying every call.

**Honest partial reporting.** When the budget exhausts, a blocker persists, or a premise fails, the required ending is not a confident completion — it is a partial report: what was established (each claim citing its evidence), what failed and with which error class, what was NOT done, and what the human should do next. The prompt rule is blunt: never claim an action succeeded that did not return success. Confabulated completion is the single most damaging agent failure because it converts a recoverable miss into a trusted falsehood; a partial report with named gaps is a correct answer, not an apology.`,
        extras: [
          table(
            'Recovery policy by error class',
            ['Class', 'Policy', 'Forbidden move'],
            [
              ['TRANSIENT', 'Retry once after brief pause; second failure -> report', 'Unbounded identical retries'],
              ['BAD_ARG', 'Fix from true source, retry once; no source -> ask', 'Repeat unchanged; mutate to force a pass'],
              ['NOT_FOUND', 'User id -> report unknown + offer lookup; inferred id -> process was wrong, ask', 'Retry with a nearby invented id'],
              ['PERMISSION', 'Stop; escalate or report the limit', 'Route around with another tool'],
              ['UNKNOWN', 'Not retryable: report raw message', 'Assume transient and retry'],
            ],
          ),
          code(
            `# intermediate state block (refresh after each tool result)\nSTATE:\nGOAL: explain why order ORD-48213 missed its delivery date\nKNOWN:\n  - shipment left hub 10 Mar (get_order, events[0])\n  - no carrier scan after 10 Mar (get_order, events)\nATTEMPTED:\n  1. get_carrier_events: TRANSIENT x1 -> retry OK\n  2. get_delivery_exception: NOT_FOUND (no exception id)\nOPEN:\n  - carrier exception record? -> next: ask user for email\n     OR list shipments by order\nNEXT: list_shipments(order_id) - do NOT retry #2\n# exhausted budget -> final = partial report with gaps,`,
            'state_block.txt',
            'text',
          ),
          tip(
            'ATTEMPTED is the anti-loop ledger',
            'A one-line outcome class per attempt makes repeated calls structurally visible — the model sees "already tried, class X" instead of a vague sense of having been here before.',
          ),
          warn(
            'Confabulated completion is the catastrophic class',
            'A missed task with named gaps is recoverable; a fabricated success is trusted and propagates. Rule it out explicitly: only claim actions that returned success.',
          ),
        ],
        worked: {
          title: 'Turn a retry-storm trajectory into classified recovery with a state block',
          problem:
            'An agent queries shipment events. First call: TRANSIENT timeout. The weak prompt says "try again if something fails", so it retries blindly, mutates the query to a different date range to make it "work", gets wrong data, and reports a complete timeline. Rewrite the prompt and walk the same scenario with classes, bounds and a state block.',
          steps: [
            {
              title: 'Diagnose the pathology chain',
              desc: 'Three absences produced three moves: no class policy -> blind identical retry; no mutation ban -> rephrased arguments that queried the wrong window; no honesty rule -> the wrong-window result was reported as a complete, confident timeline. The data corruption happened one instruction at a time.',
            },
            {
              title: 'BEFORE: the weak instruction, annotated',
              desc: 'Generic resilience language with no classes, bounds or state. "Try again" without a bound is a loop; "fix the problem" without a source rule invites value fabrication.',
              code_snippet:
                'BEFORE (weak)\n"If a tool call fails, try again. Use the shipment API to\n build a complete timeline for the customer."\n\nNo class, no bound, no mutation ban, no state, no\nhonest-partial rule.',
            },
            {
              title: 'AFTER: class policies + bounds + state discipline',
              desc: 'Compact contract. Classes from Lesson 1 (tool errors carry them); the state block from the extras tracks attempts so repetition is visible; the final two rules close the two catastrophic outs — invented values and invented successes.',
              code_snippet:
                'AFTER (contract excerpt)\nFAILURE POLICY: classify every failed call.\n  TRANSIENT -> retry once; fail again -> report class.\n  BAD_ARG -> fix from source, retry once; no source -> ask.\n  NOT_FOUND -> report id unknown / ask if inferred.\n  PERMISSION -> stop and escalate. UNKNOWN -> report, no retry.\nNEVER mutate an argument to force success.\nSTATE block: GOAL/KNOWN/ATTEMPTED/OPEN/NEXT; refresh after\n  every tool result. ATTEMPTED entries block repeats.\nIf budget or policy ends the task: PARTIAL REPORT with\n  cited evidence for every claim; never claim an action that\n  did not return success.',
            },
            {
              title: 'Replay: the same timeout, different trajectory',
              desc: 'Call 1 (events for ORD-48213): TRANSIENT. Policy: retry once — call 2 succeeds; ATTEMPTED logs "1. events: TRANSIENT x1 -> retry OK"; KNOWN gains two sourced facts. Call 3 (carrier exception index): NOT_FOUND, and the exception id had been *inferred* — the NOT_FOUND policy routes to ask-or-list rather than id-guessing. Budget hits its bound mid-listing; the agent emits a PARTIAL REPORT: two sourced timeline facts, one failed lookup with its class, an explicit gap ("carrier exception records not retrieved"), and the recommended next action. Twelve drifting calls of the old trajectory become four annotated steps and an answer a human can actually use.',
            },
          ],
          solution:
            'Every pathology met a specific instruction: blind retry met the one-retry-per-class bound; argument mutation met the never-mutate rule plus the fix-from-source-or-ask branch; repetition met the ATTEMPTED ledger; and confabulation met the only-claim-success plus partial-report requirement. The state block did double duty — trajectory continuity for the model, mid-run audit for the human — which is why it survives contact with long context better than hoping the model remembers. Recovery is not resilience theater; it is policy, and policies are prompts.',
        },
        practice: {
          title: 'Write a recovery contract for one workflow',
          prompt:
            'Take a tool-using workflow of yours and write: (1) the error classes your tools can actually emit, (2) the policy line for each, (3) retry bounds, (4) a five-field state block template, (5) the exact wording of your partial-report requirement. Simulate one trajectory with two failures of different classes and show the state block after each. Count how many moves the old prompt would have permitted that the new one forbids.',
          hint: 'If you cannot name the classes your tools emit, read their error payloads first — the policy table is only as good as the taxonomy your stack actually produces.',
        },
        mistakes: [
          {
            mistake: '"Try again if it fails" with no classes or bounds',
            fix: 'Class-mapped policies with one retry per class per step and an overall retry budget — generic resilience language is a loop license.',
          },
          {
            mistake: 'Allowing argument rephrasing to make a call pass',
            fix: 'Never mutate to force success: fix from true source, ask, or stop. Mutation on failure is the hallucination ingestion path.',
          },
          {
            mistake: 'Relying on the context window as memory',
            fix: 'A terse refreshed state block (GOAL/KNOWN/ATTEMPTED/OPEN/NEXT) keeps facts and anti-repetition history legible in long runs.',
          },
          {
            mistake: 'Ending exhausted trajectories with a confident summary',
            fix: 'Partial report: cited evidence for what holds, named failures with classes, explicit gaps, recommended next action — never claim unreturned success.',
          },
        ],
        exam: {
          question:
            'Give the recovery policy for TRANSIENT, BAD_ARG, NOT_FOUND and PERMISSION errors. Why is argument mutation on failure forbidden? What five fields does the intermediate state block contain, and what does the honest-partial rule require when a loop exhausts?',
          answer:
            'Policies: TRANSIENT — retry once after a brief pause, report on second failure; BAD_ARG — fix the argument from its true source and retry once, or ask if the source is missing; NOT_FOUND — if the user supplied the id, report it unknown and offer an alternative lookup, and if the id was inferred the process itself was wrong so ask; PERMISSION — stop and escalate, never route around or retry. Argument mutation is forbidden because rephrasing values until a call passes is the primary mechanism by which invented ids and wrong-scope data enter answers — values do not become true under rephrasing; the only moves are fix-from-source, ask, or stop. The state block holds five fields: GOAL (copied task line), KNOWN (facts with sources), OPEN (unresolved questions), ATTEMPTED (tries with outcome classes — the anti-repeat ledger), NEXT (single next action). The honest-partial rule on exhaustion requires a report citing evidence for every established claim, naming each failure with its class, listing what was not done, and recommending the next action — and forbids claiming any action that did not return success, since a fabricated success is the most damaging agent failure: a recoverable miss becomes a trusted falsehood.',
          source: 'Agent reliability question; standard in LLM application reliability interviews.',
        },
        summary: [
          'Undefined recovery is improvisation: blind retry, argument mutation, confabulated success — all instruction absences.',
          'Class policies: TRANSIENT retry-once, BAD_ARG fix-from-source, NOT_FOUND report-or-ask, PERMISSION stop, UNKNOWN no-retry.',
          'Never mutate arguments to force a pass — the mutation path is how hallucinated values enter answers.',
          'State block (GOAL/KNOWN/ATTEMPTED/OPEN/NEXT) re-anchors long trajectories and audits mid-run belief.',
          'Partial reports with named gaps are correct answers; only claimed successes are fabricated.',
        ],
      }),
      [
        [
          'A timeout (TRANSIENT) occurs. The correct recovery:',
          [
            'Retry once after a brief pause; a second failure reports the class instead of looping',
            'Retry until it succeeds',
            'Immediately rephrase the arguments and try',
            'Report the task as complete',
          ],
          0,
          'One bounded retry per class; unbounded identical retries are the loop pathology.',
        ],
        [
          'A call fails BAD_ARG because order_id is malformed. The recovery:',
          [
            'Retry the exact same call twice more',
            'Fix the id from its true source and retry once; if no source exists, ask',
            'Construct a similar valid-looking id and retry',
            'Switch to a different tool and hope',
          ],
          1,
          'Fix from source or ask — mutation-by-guess is the banned move.',
        ],
        [
          'NOT_FOUND returns for an id the model inferred (never stated by the user). The correct response:',
          [
            'Try nearby ids until one resolves',
            'The inference was the error: ask the user for the id or an alternate lookup key',
            'Report the order as deleted',
            'Ignore and answer from general knowledge',
          ],
          1,
          'An inferred id means the argument law was already broken; recovery starts at the process, not the value.',
        ],
        [
          'Budget exhausts with two open questions. The required ending is:',
          [
            'A confident best-guess completion',
            'A partial report: cited evidence for established facts, failures with classes, explicit gaps, next action',
            'Silence until the next user turn',
            'A retry of the hardest failed step',
          ],
          1,
          'Honest partials are correct answers; fabricated completions are the catastrophic class.',
        ],
      ]
    ),
    lesson(
      M9,
      'pem-9-4',
      4,
      'Verification Loops and the Agent Failure Taxonomy',
      'A good demo is not a guarantee. Close the loop: verify agent outputs against checkable criteria, know the eight classic failure modes and the prompting mitigation for each, and decide — by error cost, reversibility and checkability — when human review is non-negotiable.',
      16,
      nineBlocks({
        objectives: [
          'Add a verification step that checks claims against tool evidence and plan steps',
          'Distinguish self-critique from structural validation and prefer the latter where possible',
          'Name the eight classic agent failure modes and the prompting mitigation for each',
          'Apply error cost, reversibility and checkability to decide when human review is mandatory',
        ],
        hook:
          'An agent completes a 20-step research task beautifully. Nineteen steps cite tool results; step 20\'s headline conclusion cites nothing and is simply wrong — a plausible synthesis that the successful-looking trajectory carried to the final answer without a single gate asking "compared to what evidence?". The team ships it because the demo was impressive. Verification is not distrust of the model; it is respect for the fact that a long trajectory multiplies failure opportunities, and the last step deserves the same scrutiny as the first.',
        concept: `**The loop is not done when the answer is written.** Lessons 1–3 built steering, planning and recovery. This lesson closes the circuit: before the final answer leaves the agent, run a **VERIFY pass** — a distinct generation step that checks the draft against checkable anchors. Three anchor types, strongest first: (1) **tool evidence** — every factual claim in the answer must quote or point at a tool result line that supports it; (2) **plan conformance** — each STOP condition is satisfied with its expected evidence, and no side effect ran outside an approved step; (3) **invariants** — the task's standing rules still hold (no promised dates outside policy, no ids not present in results, schema constraints from Module 6 if the answer is structured). A claim that fails an anchor is either cut, softened to what the evidence supports, or sent back as a new step with an explicit reason.

**Self-critique has limits; structure beats sincerity.** Asking the same model "check your work" in the same context is weak verification: the same blind spots that produced the error tend to survive the review, and fluent self-approval is cheap. Where possible, make verification *structural*: cross-check ids and numbers against tool results programmatically before the answer is exposed; run schema validators on structured answers (Module 6); require the model to show its evidence-per-claim as a small table rather than a vibe. Self-critique still has a place — as a second pass with a different lens ("find any claim here without a cited step") — but treat it as a supplement to checks that cannot be argued with, not a replacement.

**The eight failure modes and their mitigations.** Every trajectory disaster you will meet in production maps to one of these classes; the prompting mitigation for each has already appeared in this module, which is why the taxonomy is worth memorizing as a checklist:

1. **Tool selection error** — right intent, wrong tool (or a phantom call). Mitigation: routing table with when-NOT branches and the pre-call CHOICE line (Lesson 1).
2. **Argument hallucination** — invented ids, values built by inference. Mitigation: argument-source law; ask when no source exists (Lesson 1).
3. **Retry storm** — identical or mutating retries without bound. Mitigation: class policies plus one-retry-per-class bounds (Lesson 3).
4. **Scope drift** — actions unrelated to the plan appearing mid-run. Mitigation: plan-first contract with per-step evidence and step annotations (Lesson 2).
5. **Premise error** — the plan or answer assumes a fact the world does not support. Mitigation: explicit premise checks that force REPLAN on contradiction (Lesson 2).
6. **Premature completion** — "done" declared while expected evidence is missing. Mitigation: stop conditions require evidence, not the appearance of effort (Lesson 2).
7. **Confabulated completion** — claiming an action succeeded when its call failed or never ran. Mitigation: only-claim-success rule plus the ATTEMPTED ledger (Lesson 3).
8. **Instruction dilution** — a rule from the system prompt forgotten deep in a long trajectory. Mitigation: restate critical rules at execute time, keep the state block terse, and have the harness re-inject non-negotiables (prompting persuades; code re-injects).

**When human review is non-negotiable.** Three axes decide: **error cost** (what damage does a wrong output do), **reversibility** (can it be undone), **checkability** (can a non-expert see it is wrong). High cost plus low reversibility plus low checkability — refunds at scale, medical or legal drafts, mass sends — requires a human gate regardless of model confidence; the plan contract from Lesson 2 places that gate between PLAN and EXECUTE. Read-only drafts with cheap reversal can ship with sampling review instead. This is the same error-cost-times-reversibility-times-checkability frame from early in the course, now applied at the trajectory level: prompting shapes behavior, but the gate belongs wherever a wrong answer would be trusted by someone who cannot check it.

**What to measure.** A taxonomy without numbers is folklore. Module 10 turns each failure class into a scored case in a golden set: pick your top three classes from production traces (or your simulation), write a benchmark for each, and only then tune. The order matters — you cannot regress-test a failure mode you have never written down, and this module's checklist is the cheapest possible place to start.`,
        extras: [
          table(
            'Agent failure taxonomy with mitigations (Modules 9.1–9.3)',
            ['#', 'Failure mode', 'Prompting mitigation (lesson)'],
            [
              ['1', 'Tool selection error', 'Routing table, when-NOT, CHOICE line (9.1)'],
              ['2', 'Argument hallucination', 'Argument-source law; ask when no source (9.1)'],
              ['3', 'Retry storm', 'Class policies, one-retry bounds (9.3)'],
              ['4', 'Scope drift', 'Plan-first, per-step evidence, annotations (9.2)'],
              ['5', 'Premise error', 'Premise checks forcing visible REPLAN (9.2)'],
              ['6', 'Premature completion', 'Stop conditions require evidence (9.2)'],
              ['7', 'Confabulated completion', 'Only-claim-success + ATTEMPTED ledger (9.3)'],
              ['8', 'Instruction dilution', 'Restate rules; harness re-injects criticals (9.3)'],
            ],
          ),
          code(
            `# VERIFY pass (second generation step, before release)\nVERIFY:\n1. For each factual claim in the draft: quote the tool\n   result line or plan step that supports it. No anchor\n   -> cut, soften, or open a new step with a reason.\n2. STOP conditions: all satisfied with expected evidence?\n3. Invariants: every id/number appears in a tool result;\n   no policy promise outside refund_policy text.\n4. Failure sweep: any of the 8 classes present? name it.\nRelease only after VERIFY passes; attach the claim-evidence\ntable to the final answer.`,
            'verify_block.txt',
            'text',
          ),
          tip(
            'Verification earns its cost on the last 20% of claims',
            'Early steps usually cite evidence naturally; the headline synthesis step is where uncited confabulation concentrates. Point the VERIFY pass there first.',
          ),
          warn(
            'Self-praise is not a check',
            '"Does this look right?" in the same context inherits the same blind spots. Prefer structural cross-checks against tool evidence; use self-critique only as a second lens.',
          ),
        ],
        worked: {
          title: 'Catch a confabulated headline with a VERIFY pass; build the taxonomy into the contract',
          problem:
            'A 20-step research agent delivers a final synthesis whose headline claim cites no tool result and is wrong (it paraphrases a policy exception that does not exist in the retrieved documents). The other nineteen steps are solid. Add a verification loop and the taxonomy sweep, then walk the corrected trajectory.',
          steps: [
            {
              title: 'Diagnose why the demo passed',
              desc: 'The trajectory looked successful step-by-step, so nobody audited the seam between last tool result and final prose — exactly where synthesis confabulation concentrates (the "last 20% of claims" problem from the tip). The missing piece was not more retrieval; it was an anchor check on every factual claim before release.',
            },
            {
              title: 'BEFORE: the weak close, annotated',
              desc: 'The prompt ends at "answer the question thoroughly". No evidence requirement, no invariants, no sweep — the model\'s final generation is unconstrained prose, and the wrong exception rode in as a plausible completion of the narrative.',
              code_snippet:
                'BEFORE (weak)\n"...Then give the user a thorough, helpful answer."\n\nNo VERIFY, no claim-evidence anchor, no invariant\nsweep, no failure-class check.',
            },
            {
              title: 'AFTER: the VERIFY contract and the release gate',
              desc: 'The extras block, verbatim, becomes the final generation step. Step 4 forces the taxonomy sweep by name — the agent must enumerate the eight classes against its own draft, which surfaces class-7 confabulation mechanically instead of hoping self-critique notices it.',
              code_snippet:
                'AFTER (addition to the agent contract)\nBefore releasing the final answer, run VERIFY:\n- claim -> evidence table (tool result line or step id)\n- all STOP conditions met with expected evidence\n- invariant sweep: ids/numbers traced to results\n- failure sweep: name any of the 8 classes present\nA claim without an anchor is cut, softened, or becomes a\nnew step. Attach the claim-evidence table to the answer.',
            },
            {
              title: 'Replay: the same synthesis, caught at the gate',
              desc: 'The draft headline ("customers may request a 60-day exception under policy P-7") fails the anchor check: no retrieved document line contains a 60-day exception. Class-7 sweep names it explicitly (claim of policy content with no supporting result). Two options per contract: soften to what the documents support ("no exception window appears in the retrieved policy; P-7 covers standard 30-day returns") or open a new step querying the exception index. The agent opens the step; the index returns nothing; the final answer states the negative finding with evidence. Nineteen good steps stopped carrying one fabricated headline into production — and the claim-evidence table now doubles as the human reviewer\'s checklist, which is why the gate can stay cheap.',
            },
          ],
          solution:
            'The fix was structural, not rhetorical: an explicit VERIFY step anchoring every claim to tool evidence or plan steps, an invariant sweep against the task\'s standing rules, and a named failure-class sweep that surfaces confabulation mechanically. Combined with Lessons 1–3, each taxonomy row now maps to a specific instruction (routing, argument law, class policies, plan evidence, premise checks, stop conditions, only-claim-success, rule re-injection) — and the remaining decision, when a human must sit in the loop, follows from error cost, reversibility and checkability rather than from vibes about model confidence.',
        },
        practice: {
          title: 'Build a VERIFY block and a mini taxonomy scorecard',
          prompt:
            'Write the VERIFY block for one of your agents: the claim-to-evidence requirement, your invariants, and the failure-sweep wording referencing all eight taxonomy classes. Then pull three real or simulated trajectories and label each with the taxonomy class (or classes) present; for the worst one, write the specific prompt line that would have prevented it. Finally: for that workflow, state whether human review is mandatory under error cost / reversibility / checkability, and where the gate sits in the plan contract.',
          hint: 'Score the same three trajectories against your old prompt and your new one; the delta is your first regression case for Module 10.',
        },
        mistakes: [
          {
            mistake: 'Treating a fluent final answer as verified',
            fix: 'Anchor every factual claim to a tool result line or plan step before release; unanchored claims are cut, softened or turned into steps.',
          },
          {
            mistake: 'Relying on "check your work" self-praise in the same context',
            fix: 'Prefer structural checks — id/number cross-checks, schema validation, invariant sweeps; self-critique is a second lens, not the gate.',
          },
          {
            mistake: 'Debugging trajectory disasters case-by-case',
            fix: 'Use the eight-class taxonomy: every production incident gets a class label, and each class already has a prompting mitigation in this module.',
          },
          {
            mistake: 'Letting model confidence set the review bar',
            fix: 'Error cost x reversibility x checkability sets the gate; high-stakes irreversible uncheckable actions need a human regardless of tone.',
          },
        ],
        exam: {
          question:
            'Describe the three anchor types of a VERIFY pass and why self-critique alone is weak verification. List the eight agent failure classes with their prompting mitigations. When is a human review gate non-negotiable?',
          answer:
            'Anchor types, strongest first: (1) tool evidence — every factual claim must quote or point to a tool result line supporting it; (2) plan conformance — STOP conditions satisfied with expected evidence and no side effect outside an approved step; (3) invariants — standing rules hold (ids and numbers trace to results, no policy promises beyond supplied text, Module 6 schema constraints where structured). Self-critique alone is weak because the same model in the same context tends to reproduce the blind spots that produced the error, and fluent self-approval is cheap; structural cross-checks that cannot be argued with should lead, with critique as a supplementary lens. The eight classes and mitigations: (1) tool selection error — routing table with when-NOT and CHOICE line; (2) argument hallucination — argument-source law, ask when no source; (3) retry storm — class policies with one-retry-per-class bounds; (4) scope drift — plan-first with per-step evidence and annotations; (5) premise error — premise checks forcing visible REPLAN; (6) premature completion — stop conditions requiring evidence; (7) confabulated completion — only-claim-success rule plus ATTEMPTED ledger; (8) instruction dilution — restate critical rules at execute time and harness re-injection. A human gate is non-negotiable when error cost is high, reversibility is low and checkability is low — the plan contract places the gate between PLAN and EXECUTE — because prompting persuades but cannot guarantee what a wrong irreversible action would destroy.',
          source: 'Agent reliability and safety question; the failure-taxonomy checklist is standard material in production LLM system design.',
        },
        summary: [
          'VERIFY pass before release: claims anchored to tool evidence, plan conformance checked, invariants swept.',
          'Structural checks beat self-praise: cross-check ids/numbers against results; critique is a second lens.',
          'Memorize the eight classes — every production incident gets a label, and each label already has a mitigation.',
          'Instruction dilution is real in long runs: restate criticals at execute time; let the harness re-inject what cannot be forgotten.',
          'Human gate follows error cost x reversibility x checkability — not model confidence; Module 10 turns classes into scored benchmarks.',
        ],
      }),
      [
        [
          'Strongest anchor type in a VERIFY pass:',
          [
            'The model\'s confidence in its own answer',
            'Every factual claim quoted against a tool result line that supports it',
            'Answer length relative to the question',
            'Agreement from a second model with the same context',
          ],
          1,
          'Tool evidence is checkable; confidence and length are not.',
        ],
        [
          'Why is same-context self-critique weak verification?',
          [
            'It costs too many tokens',
            'It tends to reproduce the same blind spots that produced the error, and self-approval is fluent but cheap',
            'Models refuse to self-critique',
            'It is slower than structural checks',
        ],
          1,
          'Same lens, same context, same blind spots — critique supplements structure, never replaces it.',
        ],
        [
          'An agent reports completing a refund that its tool call actually failed. Which taxonomy class and mitigation?',
          [
            'Scope drift — add more steps to the plan',
            'Premature completion — require longer answers',
            'Confabulated completion — only-claim-success rule plus the ATTEMPTED ledger',
            'Instruction dilution — raise the temperature',
          ],
          2,
          'Claiming an unreturned success is class 7; the ledger and honesty rule target it directly.',
        ],
        [
          'A drafting agent produces legal language a non-lawyer cannot check, for irreversible client sends. The review policy:',
          [
            'Ship it — the model sounded confident',
            'Sample 5% for review',
            'Mandatory human gate: high error cost, low reversibility, low checkability — place it in the plan contract before the send step',
            'Raise temperature for more careful phrasing',
          ],
          2,
          'The three axes decide the gate; confidence tone is irrelevant to blast radius.',
        ],
      ]
    ),
  ],
};
