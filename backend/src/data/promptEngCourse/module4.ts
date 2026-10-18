// Module 4 — Reasoning Techniques
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code } from '../nineBlocks';
import { lesson, M4, COURSE_ID } from './helpers';

export const module4: CourseModule = {
  id: M4,
  course_id: COURSE_ID,
  title: 'Module 4 — Reasoning Techniques',
  summary:
    'Chain-of-thought and its honest limits, zero-shot CoT and decomposition, self-consistency sampling, reflection and self-critique loops, step-back prompting — and the decision framework for when to force reasoning versus when speed and cost win.',
  sort_order: 4,
  lessons: [
    lesson(
      M4,
      'pem-4-1',
      1,
      'Chain-of-Thought: Working Memory in Tokens',
      'Why intermediate reasoning steps improve multi-step answers, how to elicit them well, and the two big ways chain-of-thought misleads — cost and rationalization.',
      16,
      nineBlocks({
        objectives: [
          'Explain why intermediate tokens improve multi-step task accuracy',
          'Elicit chain-of-thought with structured reasoning instructions, not just "think hard"',
          'Recognize when CoT adds cost without accuracy',
          'Detect post-hoc rationalization in reasoning traces',
        ],
        hook:
          'A student asks: "A shirt costs 800 after a 20% discount. What was the original price?" The model blurts "1000" — correct — then, in a second run with "show your work", produces: "Step 1: the discount is 20% of 800 = 160. Step 2: original = 800 + 160 = 960." Fluent arithmetic, wrong answer, confident tone. Same model, same weights. The interesting question is not "why is it sometimes wrong" — it is "why does writing steps usually help, and what exactly is it that the steps are doing?"',
        concept: `**The scratchpad that is made of tokens.** A language model computes one token at a time with no internal workspace: for a multi-step problem asked in a single line, the answer tokens must be produced immediately after the question tokens, with no room to perform intermediate computations "in the weights". When you require reasoning steps ("Step 1... Step 2... Final answer:"), those steps become *text* — and text enters the same context the next tokens condition on (Module 1, Lesson 3). The model effectively gets working memory made of its own output. Intermediate tokens can carry carried values ("original price = 800 / 0.8"), partial conclusions, and plan state — all of which later tokens can attend to. Empirically this lifts accuracy on arithmetic word problems, logic puzzles, multi-hop questions, code debugging and data analysis — anywhere the answer depends on several dependent operations — and it makes errors *localizable*: you can see whether step 2 or step 5 went wrong, instead of only seeing a wrong endpoint.

**Three elicitation levels, in increasing strength.** (1) The classic prompt: "Think step by step, then give the final answer on a line starting Answer:". Cheap, sometimes enough, but vague — the model decides unilaterally what "steps" means. (2) *Structured* reasoning: prescribe the content of the intermediate tokens — "First restate the givens and what is being asked. Then list the operations needed. Then compute each. Then sanity-check with an estimate before the final answer." This outperforms the generic plea because you are designing the reasoning trace, not just requesting one. (3) *Scaffolded* decomposition: break the task itself into labeled stages the model must fill in ("Part A: restate. Part B: approach. Part C: execute. Part D: verify") — closer to how you would structure a human\'s work, and much harder for the model to shortcut.

**Cost is not a footnote.** Every reasoning token is an output token — the expensive, slow kind — billed on every call. A "brief working" instruction ("show at most four reasoning lines") is a real cost control that costs nothing in accuracy on most tasks. Reserve long traces for genuinely hard items, or route: simple lookup → direct answer; hard item → reasoning mode. And note the industry shift: many frontier models now reason internally by default (sometimes called thinking modes), which changes your lever from "reason at all" to "summarize your reasoning in N lines" — the token economics and the rationalization risk remain, only the visibility changes.

**The rationalization problem — take seriously.** Reasoning tokens are generated tokens: a model that has leaned toward an answer can produce a plausible *justification* for it, and the trace reads like proof while being post-hoc. Watch for three signatures: (a) steps that never recompute the quantity they announce; (b) a "verification" step that re-derives the same mistaken intermediate value through the same wrong operation; (c) steps that quietly introduce an assumption the question never made. The shirt problem shows signature (b): "20% of 800 = 160" is a plausible-looking operation applied to the wrong base — and nothing in the trace forced a base-rate sanity check ("original must exceed the discounted price by a lot less than 25%... wait, 960 vs 800 — is the discount applied to the original?"). Pairing rule, to be repeated all course: **reasoning improves the odds; verification owns correctness.** Require an independent check — substitute the answer back, estimate first and compare, solve by a second method — or run the check yourself in code for anything arithmetic-critical.`,
        extras: [
          code(
            `Weak:  "Think step by step."\nStrong:\n"Reason as follows, then answer:\n A. Restate the givens and the unknown in one line each.\n B. List the operations needed (no computation yet).\n C. Execute each operation on its own line.\n D. Sanity-check: estimate the answer's rough range.\n E. Final answer on a line: ANSWER: <value>"\n\nThe difference: A-E design the trace; the weak version\nleaves trace design to the model's prior.`,
            'structured_cot.txt',
            'text',
          ),
          table(
            'When CoT helps vs hurts',
            ['Situation', 'CoT effect', 'Action'],
            [
              ['Multi-step arithmetic / logic / debugging', 'Usually large accuracy gain', 'Use structured CoT'],
              ['Simple lookup or single-fact QA', 'Near zero; pure token cost', 'Direct answer'],
              ['Style or formatting tasks', 'None', 'Skip'],
              ['Tricky-but-shallow tasks (adversarial phrasing)', 'Sometimes worsens (more room to drift)', 'Direct answer + verification'],
              ['Cost-sensitive high volume', 'Often not worth output tokens', 'Route: direct unless hard'],
            ],
          ),
          tip(
            'Estimate before compute',
            'Adding "before solving, state a rough expected range" kills a surprising share of arithmetic slips: a confident wrong answer that contradicts its own estimate looks wrong to the model too.',
          ),
          warn(
            'Fluent traces are not evidence',
            'A beautiful step-by-step can be a plausible story around a decided answer. Treat the trace as an inspection window, then verify with a method the model did not just narrate.',
          ),
        ],
        worked: {
          title: 'Upgrade a failing multi-step analysis with designed reasoning',
          problem:
            'A pricing analyst asks a model: "Plan A: flat 499/month. Plan B: 199 base + 40 per order, capped at 899. A merchant does 15 orders/month. Which plan is cheaper and by how much?" Direct answers flip between correct and confidently wrong across runs. Build a structured-CoT prompt that stabilizes it.',
          steps: [
            {
              title: 'Diagnose the failure mode',
              desc: 'Two dependent operations (compute B\'s cost with cap logic, then compare) with no intermediate text: the answer tokens must follow the question tokens directly, so partial computations compete in one forward pass. Intermittent correctness is the signature of an under-scaffolded multi-step ask.',
            },
            {
              title: 'Design the trace, not just request one',
              desc: 'Prescribe stages so each operation lands in its own tokens, including the cap condition as an explicit branch.',
              code_snippet:
                'Reason in labeled stages, then answer:\nGIVENS: list each plan formula and the order count.\nCOST_B: compute 199 + 40*15. Then compare to the 899 cap.\n         State which applies and the final B cost.\nCOMPARE: A minus B (signed).\nCHECK: sanity — B\'s per-order marginal cost is 40; at 15\n       orders the variable part is 600; does that match COST_B?\nANSWER: <Plan, difference>',
            },
            {
              title: 'Add the independent check stage',
              desc: 'The CHECK stage re-derives the variable component by a different route (40 × 15 = 600) and cross-foots it against COST_B. This is the anti-rationalization move: a second method, not a restatement of the first.',
            },
            {
              title: 'Verify stability across runs and inputs',
              desc: 'Run the prompt 10 times on 5 order counts (including a cap-triggering one: 30 orders). Direct-answer baseline flipped on ~2/10; structured version holds 10/10 with correct cap handling. Note what changed: no new knowledge, no new model — only intermediate tokens and a cross-check.',
            },
          ],
          solution:
            'Designed reasoning stages plus a differently-routed check stabilized a flaky two-step computation. The general recipe: name the stages, put each dependent operation on its own line, and end with a check that re-derives something by a second route. You are not asking the model to "be smarter" — you are giving its next-token machinery the working memory and self-inspection points the task needs.',
        },
        practice: {
          title: 'CoT ablation on your own hard tasks',
          prompt:
            'Take three tasks where the model has been unreliable for you (math, logic, multi-constraint planning). Run each three ways: direct; "think step by step"; structured stages with a check. Record accuracy and token usage. Write down which tasks gained from reasoning and which just got longer and more expensive.',
          hint: 'If the structured version costs 4x tokens for identical accuracy, that task did not need CoT — it needed different constraints or decomposition (next lessons).',
        },
        mistakes: [
          {
            mistake: 'Requesting reasoning on trivial tasks',
            fix: 'Lookups and single-step fixes gain nothing and pay full output-token cost. Default direct; escalate only on multi-step or previously-failed items.',
          },
          {
            mistake: 'Generic "think carefully" without a prescribed structure',
            fix: 'Design the stages (givens / operations / execute / check). Prescribed traces outperform pleaded ones because you control what the intermediate tokens contain.',
          },
          {
            mistake: 'Treating a fluent trace as proof',
            fix: 'Rationalization is real. Require a check stage that re-derives by a different route, or verify independently — especially for anything with money, safety or deadlines attached.',
          },
          {
            mistake: 'Ignoring the output-token bill',
            fix: 'Reasoning tokens are the expensive kind, multiplied across volume. Cap trace length ("at most six reasoning lines") or route hard items only.',
          },
        ],
        exam: {
          question:
            'Using the one-token-at-a-time generation model, explain why chain-of-thought improves multi-step accuracy, then explain why the same traces can be misleading. State the pairing rule.',
          answer:
            'The model has no internal scratchpad; every intermediate value must exist as text to be available to subsequent tokens. Requiring reasoning steps materializes intermediate results (carried values, partial conclusions, plan state) in the context window, where later tokens condition on them — converting a one-shot guess into a serialized computation with inspectable state. This lifts accuracy on dependent multi-step tasks. The same mechanism limits trust: reasoning tokens are ordinary generated text, so a model that has leaned toward an answer can generate a plausible post-hoc justification — the trace is plausible-sequence completion, not verified proof. Telltales: no recomputation of announced values, "checks" that repeat the original mistake, unstated new assumptions. Pairing rule: reasoning improves the odds; verification owns correctness — pair traces with an independently routed check or external validation for anything that matters.',
          source: 'Foundational CoT interview question; pairs conditioning theory with rationalization risk.',
        },
        summary: [
          'CoT turns output tokens into working memory the next tokens can condition on — that is the whole mechanism.',
          'Elicit with designed stages (givens, operations, execute, check), not vague pleas to "think hard".',
          'CoT pays only on multi-step work; lookups and style tasks just get slower and more expensive.',
          'Traces can be rationalizations — require second-route checks, not restatements.',
          'Reasoning improves the odds; verification owns correctness.',
        ],
      }),
      [
        [
          'Why does chain-of-thought typically improve multi-step accuracy?',
          [
            'It fine-tunes the model mid-conversation',
            'Intermediate reasoning tokens become context that later tokens condition on, acting as working memory',
            'It lowers the temperature',
            'It expands the model\'s knowledge cutoff',
          ],
          1,
          'Serialized intermediate results give subsequent tokens something to attend to — no weights change.',
        ],
        [
          'Which CoT prompt is most likely to produce a well-structured, verifiable trace?',
          [
            '"Think carefully about this"',
            '"Show your work"',
            '"Stages: GIVENS / OPERATIONS / EXECUTE / CHECK-by-a-different-route / ANSWER"',
            '"Be smart"',
          ],
          2,
          'Prescribing the content of intermediate tokens — especially a differently-routed check — beats generic pleas.',
        ],
        [
          'A reasoning trace reads fluently but its "verification" step repeats the same wrong intermediate value. This is:',
          [
            'Strong evidence the answer is correct',
            'Post-hoc rationalization — the check lacks an independent route',
            'A tokenizer bug',
            'A sign the temperature was too low',
          ],
          1,
          'A check that reuses the same operation and value is a restatement, not a verification; require a different method.',
        ],
        [
          'A high-volume summarizer uses full CoT on every request. Best cost move:',
          [
            'Delete all reasoning',
            'Route: direct answers for simple items; capped or structured reasoning only for hard ones',
            'Double the examples',
            'Switch to a larger persona',
          ],
          1,
          'Reasoning output tokens are expensive per request; selective routing preserves accuracy where it matters and cuts cost where it does not.',
        ],
      ]
    ),
    lesson(
      M4,
      'pem-4-2',
      2,
      'Zero-Shot CoT and Decomposition: Unlocking Latent Reasoning',
      'What "think step by step" actually triggers, why it works despite being generic, how to decompose genuinely hard problems into staged plans — and how decomposition differs from plain chain-of-thought.',
      15,
      nineBlocks({
        objectives: [
          'Explain the mechanism and the limits of zero-shot chain-of-thought',
          'Decompose a hard task into staged subtasks with explicit dependencies',
          'Distinguish decomposition (restructuring the task) from CoT (structuring the trace)',
          'Choose between single-shot CoT, staged decomposition, and multi-turn plans',
        ],
        hook:
          'In 2022 someone discovered that appending the four words "Let\'s think step by step" to a math prompt lifted accuracy by double digits on grade-school word problems. No examples, no fine-tuning, no architecture change — four words. The finding was genuine, and it was also the beginning of a decade of superstition: thousands of prompts now carry the incantation onto tasks it does nothing for. Understanding what those four words actually do is the difference between using a technique and wearing a lucky charm.',
        concept: `**What zero-shot CoT is.** Zero-shot chain-of-thought (zero-shot CoT) means requesting reasoning without providing any worked examples: the task plus a generic trigger — "Think step by step", "Let\'s work through this carefully", "Take a deep breath and work on this problem step by step" (yes, the breath helped in the original paper; no, do not build your career on it). Mechanistically, the trigger shifts the model into a region of its distribution associated with worked solutions: training data is full of tutorials, proofs and derivations that begin with exactly this framing, so the prompt pattern-matches to "solution-writing mode" — longer traces, intermediate values, explicit operations. It is powerful *because* it is generic: four tokens unlock a whole genre of learned behavior. It is also limited for the same reason: the model picks the trace structure itself, and for tasks where the *right* decomposition is non-obvious, self-chosen traces drift.

**When zero-shot CoT is enough, and when it is not.** Enough: problems whose natural solution shape is common in the corpus — grade-school arithmetic, standard logic puzzles, routine debugging with a familiar pattern, "compare these two options against three criteria". Not enough: tasks where the difficulty *is* the structuring — multi-document reconciliation, ambiguous requirements, novel system design, anything where the steps themselves must be invented. There, generic CoT produces fluent traces around the wrong plan. The fix is not more pleading; it is decomposition.

**Decomposition: restructure the task, not just the trace.** Chain-of-thought asks the model to *write* its way through a task. Decomposition changes the *task itself* into a sequence with explicit interfaces:

1. **Name the subtasks.** Break the goal into 3–6 named stages, each with one deliverable: "A: extract all date claims; B: build a timeline; C: find contradictions; D: draft the discrepancy report."
2. **Declare dependencies.** Which stage consumes which output. This prevents the classic failure where the model starts C before A is complete and hallucinates the missing input.
3. **Define the interface at each boundary.** What exactly stage B receives ("a table: claim | source | date") — a mini output contract (Module 2) per stage. Sloppy interfaces are where decomposition quietly collapses back into one mushy generation.
4. **Choose the execution mode.** *In one context* (all stages in one prompt, serialized) — cheapest, fine when each stage is easy given the plan. *Across turns* (one turn per stage, paste outputs forward) — more robust, because each generation is shorter and you can inspect and correct between stages. *With tools* (stages executed by code where deterministic) — Part II territory: extraction and arithmetic should often be code, with the model doing structure and language.

**Decomposition vs CoT — the one-line distinction.** CoT changes how the model *walks through* your task; decomposition changes what the task *is*. CoT is a formatting request on a single problem; decomposition is an architecture for the problem. When you find yourself adding "step by step" three times and still failing, you are out of CoT budget and into decomposition territory. The professional reflex: if a task failed twice with CoT, stop rephrasing — write the stage list.

**One caution: decomposition tax.** Staged plans cost tokens (each interface repeats) and latency (especially multi-turn). For tasks that are one hard step plus three easy ones, decompose only the hard step — "First: identify the invariant. Then solve the rest normally." Full ceremony on trivial components is the CoT cost problem wearing a new hat.`,
        extras: [
          table(
            'CoT vs decomposition vs multi-turn',
            ['Technique', 'What changes', 'Use when', 'Cost shape'],
            [
              ['Zero-shot CoT', 'Trace structure of one generation', 'Task shape is common in corpus', 'One call, more output tokens'],
              ['Structured CoT', 'Trace content (prescribed stages)', 'Specific intermediate values matter', 'One call, moderate overhead'],
              ['Decomposition in-context', 'Task split into planned stages, one call', 'Plan is clear; stages are easy given the plan', 'One call, interface tokens'],
              ['Multi-turn plan', 'One turn per stage, outputs pasted forward', 'Stages are hard; you want checkpoints', 'N calls; inspectable between stages'],
            ],
          ),
          code(
            `Original ask (failed twice with CoT):\n"Reconcile these three reports of the incident and write\na single accurate timeline."\n\nDecomposed:\nStage A -> Table of time-stamped claims from each report\n           (claim | report | timestamp).\nStage B <- consumes A's table: merge into one ordered\n           timeline; flag conflicts as CONFLICT rows.\nStage C <- consumes B: write a 10-line narrative that\n           resolves conflicts conservatively (earliest\n           corroborated time wins).\nExecution: A, B, C in one prompt, serialized; if any\n           CONFLICT remains after two passes, stop and list them.`,
            'decomposition.txt',
            'text',
          ),
          tip(
            'Decompose at the failure, not the whole task',
            'If only stage C is failing, keep A and B implicit and decompose C. Proportionate structure beats blanket ceremony.',
          ),
          warn(
            'Multi-turn plans leak state',
            'When pasting stage outputs forward, restate the overall goal and the contract at each turn — models treat fresh turns as fresh tasks, and forgotten contracts are forgotten behavior.',
          ),
        ],
        worked: {
          title: 'Turn a failed CoT task into a staged decomposition',
          problem:
            'Task: "Given three quarters of sales notes (pasted), customer feedback emails, and the pricing page copy, explain whether our 15% price rise likely caused the churn uptick in Q3, and what to do." Two CoT attempts produced fluent but unfalsifiable narratives ("price sensitivity likely played a role..."). Decompose.',
          steps: [
            {
              title: 'Diagnose why CoT was the wrong tool',
              desc: 'The hard part is not arithmetic — it is *structuring evidence across three heterogeneous sources with different reliability*. Generic CoT has no learned script for that, so it produced narrative around vibes. The task needs its stages invented, not its trace formatted.',
            },
            {
              title: 'Invent the stage list with interfaces',
              desc: 'Four stages, each with a named deliverable and an explicit input from the previous stage.',
              code_snippet:
                'A. EVIDENCE: from feedback emails only, extract every\n   mention of price (quote | sentiment | date). Deliverable:\n   table.\nB. TIMELINE: from sales notes only, list the churn events\n   with dates. Deliverable: ordered list.\nC. ALIGN: consume A+B. Deliverable: overlap count — price\n   complaints within 14 days before each churn event.\nD. VERDICT: consume C. Deliverable: one of three verdicts\n   (supported / weak / not-supported) + 3 bullets: what the\n   evidence can and cannot rule out. If overlap count < 3,\n   you must output weak-or-not-supported.',
            },
            {
              title: 'Force falsifiability at the verdict stage',
              desc: 'The original failure was unfalsifiable narrative. Stage D\'s three-way verdict plus the hard floor ("overlap < 3 => weak or not-supported") makes the model commit to a falsifiable position and blocks the weasel output. This is constraint design meeting decomposition.',
            },
            {
              title: 'Run in one call, then consider multi-turn if needed',
              desc: 'One serialized call keeps cost down. If stage C still hallucinates inputs, switch to three turns — generate A, paste into a B prompt, etc. — trading tokens for per-stage inspectability. Measure: the one-shot decomposition already converts the narrative into an auditable evidence chain in our test run.',
            },
          ],
          solution:
            'Decomposition converted an unstructured narrative task into four contract-bound stages ending in a falsifiable verdict. Note what zero-shot CoT alone could never do here: invent the evidence hierarchy (emails vs notes vs pricing page have different evidentiary weight) and force a commit-or-abstain decision. CoT formats a walk-through; decomposition redesigns the work. Knowing which one a task needs is the skill.',
        },
        practice: {
          title: 'Decompose your hardest current task',
          prompt:
            'Pick a task where "think step by step" has failed you twice. (1) Write the stage list with 3–5 named stages. (2) For each boundary, define the interface (what exactly passes to the next stage). (3) Mark which stages could be done by code instead of the model. (4) Run it in one call; if a stage hallucinated its input, rerun multi-turn and compare quality and cost.',
          hint: 'If you cannot name the deliverable of a stage in one line, the stage is too vague — split it or define its output contract first.',
        },
        mistakes: [
          {
            mistake: 'Sprinkling "step by step" onto structural tasks',
            fix: 'CoT organizes a walk-through; it does not invent a plan. If difficulty is in the structuring, decompose instead of pleading harder.',
          },
          {
            mistake: 'Vague stage names with no interface',
            fix: '"Analyze the data" is not a stage. Name the deliverable and format at each boundary or decomposition collapses into mush.',
          },
          {
            mistake: 'Full decomposition ceremony on trivial subtasks',
            fix: 'Decompose the failing step, not the easy three. Proportionate structure keeps token and latency costs honest.',
          },
          {
            mistake: 'Multi-turn plans that forget the overall goal',
            fix: 'Restate goal and interface contracts in every forwarded turn; fresh context is a fresh task from the model\'s point of view.',
          },
        ],
        exam: {
          question:
            'What does the zero-shot CoT trigger "think step by step" plausibly do mechanistically, and when must you replace it with explicit decomposition? Illustrate the difference.',
          answer:
            'Mechanistically the trigger pattern-matches the model into solution-writing modes abundant in its training data (tutorials, derivations, worked proofs), eliciting traces with intermediate values and explicit operations — these intermediate tokens then act as working memory for later tokens (Lesson 1). It is generic: the model chooses the trace structure itself, which suffices when the task\'s natural solution shape is common in the corpus (routine arithmetic, familiar debugging patterns). It fails when the difficulty lies in inventing the structure — cross-source reconciliation, ambiguous requirements, novel design — because the model will write fluent traces around a self-chosen, possibly wrong plan. Decomposition replaces trace-formatting with task-redesign: named stages, explicit dependencies, defined interfaces between stages, and chosen execution mode (in-context serialization or multi-turn with checkpoints). Illustration: CoT on "reconcile three reports" narrates; decomposition emits claim-extraction -> merge -> conflict-flag -> narrative stages with table interfaces, which is auditable and correctable between stages.',
          source: 'Standard question on CoT limits; bridges to agent-style planning in Part II.',
        },
        summary: [
          'Zero-shot CoT = generic trigger that pattern-matches into solution-writing modes; powerful, corpus-dependent, free of examples.',
          'It works where the solution shape is common; it narrates around wrong plans where structure must be invented.',
          'Decomposition redesigns the task: named stages, explicit dependencies, defined interfaces, chosen execution mode.',
          'CoT formats the walk; decomposition architects the work — stop escalating CoT after two failures and write stages.',
          'Watch the tax: decompose at the failure point; multi-turn costs calls but buys inspectable checkpoints.',
        ],
      }),
      [
        [
          'What does "Let\'s think step by step" plausibly trigger?',
          [
            'A hidden reasoning module that is normally off',
            'Pattern-matching to solution-writing modes (tutorials, derivations) abundant in training data, eliciting intermediate tokens',
            'A temperature reduction',
            'Retrieval from an external database',
          ],
          1,
          'It is distribution-shifting conditioning text, not a switch on new machinery — the value is in the intermediate tokens it causes to be written.',
        ],
        [
          'A task keeps failing even with elaborate CoT. The right escalation is:',
          [
            'Add more exclamation marks to the CoT request',
            'Decompose: named stages with defined interfaces, possibly executed multi-turn',
            'Increase the example count to twenty',
            'Lower the temperature to zero',
          ],
          1,
          'Repeated CoT failure on a structural task means the plan itself is the gap — redesign the task rather than the trace.',
        ],
        [
          'Key difference between CoT and decomposition:',
          [
            'CoT is only for math; decomposition only for writing',
            'CoT structures the reasoning trace of one task; decomposition restructures the task itself into staged subtasks',
            'Decomposition requires fine-tuning',
            'They are exact synonyms',
          ],
          1,
          'One formats a walk-through; the other architects the work — different layers of intervention.',
        ],
        [
          'In a staged plan, what prevents stage C from hallucinating stage A\'s missing output?',
          [
            'Nothing ever can',
            'Explicit interfaces — stage C receives a defined artifact (e.g., a table) produced by stage B',
            'A higher temperature',
            'Longer persona text',
          ],
          1,
          'Declared boundaries with concrete artifact formats stop stages from inventing their inputs; if it persists, switch to multi-turn with pasted artifacts.',
        ],
      ]
    ),
    lesson(
      M4,
      'pem-4-3',
      3,
      'Self-Consistency and Reflection: Sampling and Critiquing Your Way to Reliability',
      'Two complementary reliability techniques: sampling multiple reasoning paths and voting, versus running explicit self-critique loops — what each buys, what each costs, and where both break.',
      16,
      nineBlocks({
        objectives: [
          'Explain self-consistency sampling and when majority voting helps',
          'Design a reflection loop with concrete critique criteria and a revise step',
          'Distinguish self-consistency (breadth) from reflection (depth)',
          'Recognize shared failure modes: consistent-but-wrong and self-satisfied critique',
        ],
        hook:
          'A team runs a tricky scheduling prompt once and trusts the answer. Another team runs it five times at temperature 0.7, gets three votes for plan X and two for plan Y, ships X, and finds the three agreeing runs shared the same blind spot — they all missed that Friday is a public holiday, because the holiday calendar was never in the prompt. Consistency measured agreement, not truth. Both teams needed something else: a critique pass that asked "what did none of your plans check?", which is the reflection technique this lesson adds to your kit.',
        concept: `**Self-consistency: buy several guesses, take the vote.** The idea (Wang et al., 2022) is simple: for a task with a verifiable answer, sample k different reasoning paths (typically 5–10, at temperature > 0), extract the final answer from each, and return the majority. Why it works: wrong paths are diverse — each misstep takes a different shape — while correct paths converge on the same answer; voting averages away idiosyncratic errors. Empirically large gains on arithmetic, logic and code-generation-with-tests, where answers are canonical. Costs are linear in k: k calls, k sets of output tokens, k times the latency — so this is a precision tool, not a default. When it shines: hard single-answer items, batch offline analysis where latency does not matter, and eval harnesses where you want a higher-quality label. When it does not: open-ended writing (no canonical answer to vote on), tasks where the *prompt* is wrong for everyone (voting amplifies shared bias — the holiday example), and latency-sensitive interactive paths (mitigation: run k only when a cheap verifier flags uncertainty).

**Vote on answers, not vibes.** Self-consistency requires extracting a comparable answer from each trace ("ANSWER: <value>" line, parsed JSON field, test suite pass/fail). If your answers are free-form paragraphs, majority voting is meaningless — you need an extraction layer or a verifiable check (tests, schema, numeric compare). This is also the bridge to Part II: self-consistency pairs naturally with structured outputs and programmatic verifiers.

**Reflection: same model, second seat, harder criteria.** Where self-consistency samples breadth, reflection adds depth: after a draft, run a *critique pass* with explicit criteria, then a *revision pass* that addresses the critique. The standard structure is three prompts (or three roles in one conversation): Generator → Critic → Reviser. The critic must not be vague — "check for quality" elicits praise. Critic prompts that work name failure hunts: "List every claim that lacks support in the provided data. List every constraint from the original brief that the draft violates. Propose the single most damaging improvement." Critiques then become a checklist the reviser must address item by item, with each item either fixed or explicitly refused with reason.

**Why reflection degrades without structure.** Two documented failure modes: (a) *self-satisfaction* — the same model critiquing its own draft in the next turn tends toward approval, because agreement is the path of least resistance in its conditioning; (b) *unfalsifiable critique* — "make it more compelling" is a critique no revision can demonstrably satisfy. Mitigations: make the critic use a rubric with binary checks where possible ("Does every statistic cite a source line? yes/no per claim"); require the critic to quote the offending text before judging it; keep generator and critic prompts structurally different (different personas help here, Lesson 2 — a skeptical reviewer persona earns its tokens); and cap iterations (usually two) because after that you get churn — revisions oscillating without progress, burning tokens.

**Breadth vs depth, choose deliberately.** Self-consistency attacks *sampling variance* — the model would have gotten it right on a luckier draw. Reflection attacks *systematic* draft errors — missing constraints, unsupported claims, structure gaps that every sample would contain. Run voting when your failure log shows intermittent wrongness; run reflection when your failure log shows the *same class* of miss every time. Many production pipelines do both, cheaply: one draft, one critique-revise, then consistency voting only on the final answer where stakes justify k calls.`,
        extras: [
          table(
            'Self-consistency vs reflection',
            ['Dimension', 'Self-consistency', 'Reflection'],
            [
              ['Attack', 'Sampling variance', 'Systematic draft errors'],
              ['Mechanism', 'k samples, majority vote', 'Generate -> critique -> revise'],
              ['Answer type', 'Canonical / extractable', 'Open-ended, constraint-laden',
              ],
              ['Cost shape', 'k calls linear', '2-3 calls, one pass'],
              ['Signature failure', 'Consistent-but-wrong (shared blind spot)', 'Self-satisfied critique, oscillation'],
            ],
          ),
          code(
            `Critic prompt skeleton (rubric-anchored):\n"Below are DRAFT and BRIEF.\n1. Quote every sentence in DRAFT that asserts a number or\n   fact not present in BRIEF or provided data.\n2. List BRIEF constraints violated (quote the constraint,\n   quote the violating text).\n3. Propose the single highest-impact fix.\nDo not praise. Do not rewrite yet."\n\nReviser: "Address items 1-3 one by one: fixed | refused-because"`,
            'reflection_loop.txt',
            'text',
          ),
          tip(
            'Vote with a verifier when you can',
            'Where an automated check exists (tests, schema, arithmetic), replace human-style majority voting with k-samples-plus-verify: keep the first sample that passes the checker. Cheaper and stricter than pure voting.',
          ),
          warn(
            'Shared blind spots survive voting',
            'If the prompt omits a fact, all k samples omit it confidently. Consistency is not truth: keep the reflection pass that asks what no sample bothered to check.',
          ),
        ],
        worked: {
          title: 'Stabilize a bug hunt with voting, then reflection',
          problem:
            'Task: find the concurrency bug in a 150-line Python worker (pasted). Single-shot runs name different plausible-but-wrong causes. Design a combined pipeline: self-consistency for the diagnosis, reflection for the patch plan.',
          steps: [
            {
              title: 'Check answer-extractability first',
              desc: 'Diagnosis = which line/lock pattern is buggy. Make the model end every trace with "BUG: <line range> - <one-line cause>" so votes are comparable. Without this extraction contract, voting is impossible.',
            },
            {
              title: 'Run self-consistency for the diagnosis',
              desc: 'k = 5, temperature 0.6, structured CoT from Lesson 1. Result distribution: 3 votes for "double-checked lock around line 87", 2 votes scattered. Majority wins — but record the vote entropy as a confidence signal (3/5 is weaker than 5/5; consider escalating to k=9 when entropy is high).',
              code_snippet:
                'k=5 traces, extracted BUG lines:\n  87 (double-checked locking, stale flag) x3\n  62 (missing join)                      x1\n 103 (queue race)                        x1\nMAJORITY: line 87  |  entropy: high-ish -> flag for review',
            },
            {
              title: 'Reflection pass on the majority diagnosis + patch plan',
              desc: 'Critic rubric: (1) quote every assumption about line 87\'s data races that the code does not support; (2) check whether the other two diagnoses (lines 62, 103) were ruled out or merely outvoted — outvoted is not refuted; (3) propose the patch plan\'s missing verification step. The critic finds the patch plan never re-runs the stress test that reproduces the bug — a systematic gap voting could never catch.',
            },
            {
              title: 'Revise, then verify outside the model',
              desc: 'Reviser addresses each critique (fixed/refused-because). Final step is outside both techniques: run the reproduction script and the patch against it. The pipeline\'s truth anchor is the test, not the vote and not the critique.',
            },
          ],
          solution:
            'Extraction contract -> self-consistency vote for diagnosis -> rubric-anchored reflection for the patch plan -> external verification. Each technique did its assigned job: voting killed intermittent single-path errors; reflection caught the systematic omission (no reproduction step) that every sample shared. The external test killed any residual shared fantasy. That layering — breadth, depth, then ground truth — is the reliable pattern.',
        },
        practice: {
          title: 'Run both techniques on one task and compare',
          prompt:
            'Take one hard, checkable task (a puzzle, a bug, a constrained plan with a right/wrong property). Run: (a) one structured-CoT pass; (b) k=5 self-consistency with an extraction line and a vote; (c) one draft + rubric critique + revision. Record accuracy, token cost, and failure types for each. Which technique attacked YOUR actual failure mode?',
          hint: 'If all five samples fail identically, you learned something important: your problem is systematic, not variance — reflection or decomposition, not voting.',
        },
        mistakes: [
          {
            mistake: 'Running self-consistency on open-ended writing',
            fix: 'Votes need extractable canonical answers. For prose, use reflection with a rubric instead of pretending paragraphs can be majoritized.',
          },
          {
            mistake: 'Vague critic prompts ("is this good?")',
            fix: 'Name the hunts: unsupported claims, violated constraints, quoted-offender-first rules. Binary rubric items beat adjectives.',
          },
          {
            mistake: 'Unbounded reflection loops',
            fix: 'Cap at two revise passes. Beyond that, revisions oscillate and cost tokens without progress — detect stagnation by comparing critique lists across passes.',
          },
          {
            mistake: 'Treating majority as truth',
            fix: 'Shared prompt-level blind spots survive every vote. Keep an external verifier (tests, data checks) or a "what did none of you check?" critique as the final gate.',
          },
        ],
        exam: {
          question:
            'Compare self-consistency and reflection: mechanism, what failure class each attacks, and one failure mode each shares or uniquely has. When would you combine them?',
          answer:
            'Self-consistency: sample k diverse reasoning paths at temperature > 0 and return the majority final answer (requiring an answer-extraction contract). It attacks sampling variance — lucky-draw errors — because wrong paths diverge while correct ones converge; cost is linear in k; its signature failure is consistent-but-wrong outcomes when the prompt shares a blind spot across all samples. Reflection: generate a draft, run a rubric-anchored critique (quote offenders, check constraints, propose the top fix), then revise addressing each critique item; it attacks systematic draft errors (missing constraints, unsupported claims) that voting would never catch; its signature failure is self-satisfied critique and unbounded revision churn. Combine when stakes justify: e.g., one draft + one reflection pass (depth), then k-sample voting on a final extractable answer (breadth), with an external verifier as ground truth — each layer covering the other\'s blind spot.',
          source: 'Advanced reliability-patterns interview question; both techniques reappear in agent design (Part II).',
        },
        summary: [
          'Self-consistency = k samples + majority vote: attacks variance; needs extractable answers; cost scales with k.',
          'Reflection = generate, rubric-critique, revise: attacks systematic gaps; cap iterations at two.',
          'Vote entropy is a confidence signal — 3/5 should trigger escalation, not the same trust as 5/5.',
          'Critic prompts must quote offenders and use binary checks; vague critique produces praise and churn.',
          'Neither technique replaces ground truth: tests, data checks and reproducers remain the final gate.',
        ],
      }),
      [
        [
          'Self-consistency improves accuracy primarily by:',
          [
            'Fine-tuning on the sampled traces',
            'Averaging out diverse wrong paths — wrong answers diverge while correct ones converge',
            'Reducing the temperature to zero',
            'Increasing the context window',
          ],
          1,
          'It is variance reduction through voting, not learning — hence the need for an extractable answer format.',
        ],
        [
          'All k=5 samples confidently agree on an answer that is wrong because the prompt omitted a key fact. This demonstrates:',
          [
            'The need for more samples',
            'That voting cannot fix shared prompt-level blind spots — consistency is not truth',
            'A temperature problem',
            'That self-consistency never works',
          ],
          1,
          'Shared conditioning gaps reproduce across every sample; you need a reflection pass or external verifier, not a bigger k.',
        ],
        [
          'Which critic prompt is most likely to produce actionable critique?',
          [
            '"Is this draft good? Be honest."',
            '"What do you think?"',
            '"Quote every claim lacking support in the data; list violated BRIEF constraints with quotes; propose the single highest-impact fix. Do not praise."',
            '"Improve the draft."',
          ],
          2,
          'Rubric-anchored hunts with quote-the-offender rules generate falsifiable critique; adjectives generate praise.',
        ],
        [
          'A reflection loop has run five revise passes and outputs keep oscillating. Best move:',
          [
            'Run ten more passes',
            'Stop: cap iterations (usually two); stagnation means the rubric or the model cannot see the remaining gap — change the rubric or escalate the task',
            'Raise the temperature',
            'Add more examples',
          ],
          1,
          'Oscillation is the signature of exhausted reflection; more passes burn tokens without information. Change the angle or escalate.',
        ],
      ]
    ),
    lesson(
      M4,
      'pem-4-4',
      4,
      'Step-Back Prompting and the Reasoning-or-Speed Decision',
      'The step-back technique — abstract before you solve — plus the closing framework for this module: a routing decision that chooses direct answers, CoT, decomposition, voting or reflection based on task shape, stakes and cost.',
      15,
      nineBlocks({
        objectives: [
          'Apply step-back prompting to reframe a concrete question as a principle-first one',
          'Recognize the task classes where step-back measurably helps',
          'Build a reasoning-vs-speed routing rule from task shape, stakes and volume',
          'Assemble the full module toolkit into one decision procedure',
        ],
        hook:
          'Two identical questions. A: "Should we migrate this monolith endpoint to an event-driven handler?" B: "Before answering A: what properties make a migration to event-driven architecture wise or unwise in general — failure modes, team factors, data consistency — and how do they apply here?" Question A gets a confident opinion shaped by whichever blog posts the model half-remembers. Question B gets a framework, then an application of that framework to the specifics — and usually a better-calibrated answer, because the abstraction was forced first. Step-back prompting is this move, made deliberate.',
        concept: `**The technique.** Step-back prompting (Zheng et al., 2023) asks the model to *first* elicit the general principles, concepts or relevant facts surrounding a concrete question, *then* answer the original question conditioned on that elicited context. It is a small decomposition whose first stage is abstraction: "What are the key considerations for X in general?" -> use that list -> "Now apply them to my specific case." The mechanism is complementary to everything in this module: concrete one-shot questions trap the model in surface pattern-matching on whatever superficial features the query carries; the step-back stage *forces retrieval of the governing concepts* into the context window, where the final answer can then condition on them (again: working memory made of tokens, Lesson 1). Published results were strongest on tasks where specific facts were needed to reason about a case (QA over domains, science problems); practical wins show up anywhere the model\'s first instinct is a shallow pattern-match — strategy questions, diagnosis, policy analysis, design reviews.

**When it helps.** (1) *Instance-to-principle tasks* — one customer\'s churn, one bug\'s cause, one policy\'s flaw: benefits from the general factors being enumerated first. (2) *Fact-sparse prompts* — the question under-specifies the domain and the model needs to surface relevant knowledge before applying it. (3) *Bias-prone questions* — hot-button phrasings that pattern-match to opinionated corpus text; the abstraction stage cools the prompt into analysis. (4) *Multi-constraint decisions* — pricing, architecture, prioritization: the step-back list is effectively a checklist the final answer must walk.

**When it hurts or does nothing.** Simple lookups (double the cost, zero gain); tasks already fully specified with data in-window (the abstraction stage restates the obvious); and latency-critical paths (one extra stage). Also note: step-back is not magic abstraction — a *bad* step-back ("list considerations" with no direction) can wander. Strong versions constrain the abstraction: "List exactly five factors a senior engineer would weigh for this migration. For each, one line on why it matters." Bounded abstraction, then application.

**The module\'s closing framework: route your reasoning.** You now hold five tools: direct answer, structured CoT, decomposition, self-consistency, reflection — plus step-back as a reframing prelude. The professional skill is choosing, and the choice reduces to three questions:

1. **What is the task\'s shape?** Canonical answer (vote-able, test-able) vs open-ended; single-step vs multi-step; surface-pattern vs principle-governed.
2. **What is the failure history?** Intermittent wrong answers -> consistency; the same systematic miss -> reflection or decomposition; shallow first instinct -> step-back; no history -> start cheap (direct, escalate on failure).
3. **What are the stakes and volume?** Interactive and cheap -> direct + maybe one CoT line. Offline batch, high stakes -> full pipeline (decompose, reflect, vote, verify). High volume, moderate stakes -> route per item: cheap path by default, expensive path only when a cheap verifier flags doubt.

A compact routing table is worth memorizing: **lookup -> direct. Familiar multi-step -> structured CoT. Structural mess -> decomposition. Flaky canonical answer -> self-consistency (with extraction contract). Same-class systematic error -> reflection with rubric. Hot-button or under-specified strategy -> step-back then answer. Money/safety on the line -> any of the above, plus external verification — models all the way down are still just generating tokens.**

**Cost honesty, once more.** Every technique in this module is token spend. The compounding professional habit is *escalation with evidence*: start with the cheapest path that plausibly works, log the failure, upgrade the tool named by the failure shape, log again. Prompt engineers who reach for k=9 voting by default pay nine times for problems that one decomposition would have fixed — and worse, they lose the diagnostic signal that single failures were trying to give them.`,
        extras: [
          table(
            'Routing table (memorize the left column)',
            ['Observed or expected failure', 'Tool', 'Cost shape'],
            [
              ['Simple lookup / single step', 'Direct answer', '1x'],
              ['Familiar multi-step (arithmetic, logic, debug)', 'Structured CoT (+ estimate check)', '1-2x output tokens'],
              ['Structural mess (reconciliation, ambiguous design)', 'Decomposition (staged interfaces)', '1 call + interface overhead'],
              ['Flaky canonical answer', 'Self-consistency k=5 with extraction', 'k calls'],
              ['Same systematic miss every time', 'Rubric reflection (<=2 passes)', '2-3 calls'],
              ['Hot-button / under-specified strategy', 'Step-back then answer', '+1 abstraction stage'],
              ['Any of the above + money/safety', 'External verification required', 'Verifier cost'],
            ],
          ),
          code(
            `Step-back skeleton:\n\n"Before answering the specific question below:\n 1. List exactly 5 general factors that govern this kind\n    of decision (one line each, with why it matters).\n 2. For each factor, note what is known/unknown from the\n    information provided.\n 3. Now answer the specific question, walking the 5 factors\n    explicitly. Where a factor is unknown, say so and state\n    what evidence would resolve it.\n\nSpecific question: <your question>"`,
            'step_back.txt',
            'text',
          ),
          tip(
            'Escalate with evidence, not anxiety',
            'Start the cheapest path that plausibly works. Upgrade only when the logged failure shape names the next tool. This preserves both your budget and your diagnostics.',
          ),
          warn(
            'Abstraction theater',
            'An unbounded step-back ("think deeply first") wanders or flatters. Constrain the abstraction stage — count, categories, one-line justifications — so it produces a checklist the final answer must actually use.',
          ),
        ],
        worked: {
          title: 'Pick the right technique for three real tasks',
          problem:
            'A platform team has three recurring AI tasks with different failure logs: (1) unit-test generation for small functions (failures: intermittent wrong edge-case handling); (2) quarterly incident review across 40 tickets (failures: narrative summaries that miss cross-ticket patterns); (3) "should we adopt framework X" debates (failures: confident one-sided opinions). Route each.',
          steps: [
            {
              title: 'Read the failure logs like a doctor',
              desc: 'Task 1: intermittent = variance-shaped. Task 2: same class of miss every time (cross-patterns) = systematic structural gap. Task 3: shallow, biased first instinct = pattern-match on opinionated corpus text. Three different diagnoses, three different tools.',
            },
            {
              title: 'Route each task',
              desc: '1 -> self-consistency with an extraction contract (tests pass/fail as the vote, k=5; or k samples + run tests, keep first pass — the verifier-flavored variant). 2 -> decomposition: per-ticket extraction stage -> cross-ticket alignment matrix -> pattern narrative. 3 -> step-back: enumerate general adoption factors bounded at five, then apply to framework X with unknowns flagged.',
              code_snippet:
                'Task 3 skeleton:\n"Before the specific question: list 5 general factors for\nframework adoption (one line + why). Mark known/unknown for\nour case from the info provided. Then answer OUR question\nwalking all 5 factors; unknowns must be stated, not papered over."\n\nContrast with the old prompt: "Should we adopt X? Be balanced."\n-> produced the same opinionated essay every run.',
            },
            {
              title: 'Specify the success checks',
              desc: 'Each route needs a check that matches its failure: Task 1 — test-suite pass rate on held-out functions (not vibes). Task 2 — presence of at least 3 cross-ticket patterns each citing >= 2 tickets. Task 3 — the answer references all five factors and explicitly labels unknowns. Checks turn routing from belief into measurement.',
            },
            {
              title: 'Set the escalation ladder',
              desc: 'If Task 1\'s voting still fails on a hard function -> add structured CoT inside each sample. If Task 2\'s alignment matrix stage hallucinates inputs -> switch to multi-turn with pasted artifacts. If Task 3\'s step-back wanders -> constrain categories ("cost, risk, team fit, migration path, alternatives"). Ladders documented = future failures route themselves.',
            },
          ],
          solution:
            'Three tasks, three tools, each chosen from the failure shape: consistency for variance, decomposition for structure, step-back for shallow instinct — each with a matching success check and an escalation ladder. This is the module\'s endgame: the techniques are not a menu to cycle through hopefully; they are a routing table keyed on failure logs. Keep your logs honest and the route almost announces itself.',
        },
        practice: {
          title: 'Write your personal routing card',
          prompt:
            'List your five most frequent AI tasks. For each, write: (1) the observed failure shape (intermittent / same-miss / shallow / structural), (2) the routed tool from the table, (3) the success check you will use, (4) the escalation if it still fails. Keep the card as a one-page note beside your prompt library.',
          hint: 'If you cannot describe the failure shape, you have not failed carefully enough — instrument one task properly before routing the rest.',
        },
        mistakes: [
          {
            mistake: 'Defaulting to the most expensive technique',
            fix: 'k-sample voting and double reflection on every call burns budget and destroys the diagnostic value of single failures. Escalate with evidence.',
          },
          {
            mistake: 'Unbounded step-back abstraction',
            fix: 'Constrain the abstraction stage (count, categories, one-line justifications) so it emits a checklist the final answer must walk — otherwise it wanders.',
          },
          {
            mistake: 'One technique for all tasks',
            fix: 'Variance and systematic failure need opposite tools; routing by failure log is the entire skill this module has been building toward.',
          },
          {
            mistake: 'No success check per technique',
            fix: 'Without a check matching the tool (tests, pattern counts, factor coverage), you cannot tell whether the technique worked — and you will drift back to vibes.',
          },
        ],
        exam: {
          question:
            'Explain step-back prompting, its mechanism relative to in-context conditioning, one class where it helps, one where it wastes cost — and summarize the module\'s routing framework.',
          answer:
            'Step-back prompting first elicits the general principles/factors relevant to a concrete question, then answers the original conditioned on that elicited context. Mechanistically it forces governing concepts into the window as intermediate tokens, converting a surface pattern-match into an application of an explicit framework (same working-memory principle as CoT, with abstraction as the first stage). Helps on instance-to-principle tasks: strategy decisions, diagnosis, policy analysis, and hot-topic phrasing that otherwise triggers opinionated corpus modes. Wastes cost on lookups and fully-specified data tasks where the abstraction restates the obvious. Routing framework: classify by (1) task shape — canonical vs open, single vs multi-step, surface vs principle-governed; (2) failure history — intermittent (self-consistency), same-miss (reflection/decomposition), shallow (step-back), none (cheapest path); (3) stakes and volume — cheap path by default, expensive pipeline only when doubt is flagged, with external verification whenever money or safety is involved.',
          source: 'Capstone question for the reasoning-techniques module.',
        },
        summary: [
          'Step-back forces principles into context before application — abstraction as a bounded first stage, then answer.',
          'Use it on principle-governed, bias-prone, under-specified strategy questions; skip it on lookups.',
          'Route by failure shape: variance -> consistency; systematic -> reflection/decomposition; shallow -> step-back; unknown -> cheapest first.',
          'Every technique is token spend — escalate with logged evidence, never with anxiety.',
          'Each route needs a matching success check; checks are what make routing a discipline rather than a mood.',
        ],
      }),
      [
        [
          'Step-back prompting works by:',
          [
            'Accessing a separate reasoning database',
            'First eliciting general principles into the context, then answering the concrete question conditioned on them',
            'Reducing temperature',
            'Asking the user for more information',
          ],
          1,
          'The abstraction stage materializes governing factors as text the final answer can condition on — working memory via tokens.',
        ],
        [
          'A model gives one-sided opinions on "should we adopt framework X" every run. Best technique:',
          [
            'Self-consistency with k=10',
            'Bounded step-back: enumerate general adoption factors, mark knowns/unknowns, then answer walking the factors',
            'Longer persona',
            'Higher temperature for "balance"',
          ],
          1,
          'Opinionated corpus pattern-matching is the failure; forced abstraction cools it into framework application. Voting would just majority-vote the same bias.',
        ],
        [
          'Task failures are intermittent and answer-extractable. Route to:',
          [
            'Reflection with a rubric',
            'Self-consistency voting with an extraction contract',
            'Step-back prompting',
            'Direct answers only',
          ],
          1,
          'Intermittent + canonical = variance-shaped; voting averages the bad draws.',
        ],
        [
          'Why start with the cheapest reasoning path by default?',
          [
            'Providers require it',
            'Expensive defaults destroy budgets and the diagnostic signal that single failures provide for routing',
            'It always produces better answers',
            'Temperature cannot be changed otherwise',
          ],
          1,
          'Escalation with evidence preserves cost and keeps failure logs meaningful — the basis of the routing discipline.',
        ],
      ]
    ),
  ],
};
