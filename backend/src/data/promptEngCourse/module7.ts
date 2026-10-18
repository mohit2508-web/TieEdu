// Module 7 — Code Prompting: Specs, Tests, Debug Loops, Repo Context
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code } from '../nineBlocks';
import { lesson, M7, COURSE_ID } from './helpers';

export const module7: CourseModule = {
  id: M7,
  course_id: COURSE_ID,
  title: 'Module 7 — Code Prompting: Specs, Tests, Debug Loops and Repo Context',
  summary:
    'Code is the one output you can execute, which makes it the most honest place to prompt. Spec-first codegen that blocks the common failure modes; test-first prompting where tests are the contract, plus refactoring prompts that state invariants; debug loops that demand diagnosis before patch, wired to the right repository context; and code review run as a structured prompt with a severity taxonomy.',
  sort_order: 7,
  lessons: [
    lesson(
      M7,
      'pem-7-1',
      1,
      'Codegen: From Spec to Working Code',
      'The gap between "write me X" and working code is a specification. Write the spec the way you would brief a developer: signature, contract, constraints, edge cases — and know the failure modes before they show up.',
      16,
      nineBlocks({
        objectives: [
          'Turn a one-line code request into a spec with signature, contract, constraints and edge cases',
          'Name the common codegen failure modes and the spec line that prevents each',
          'Ask for code against pinned versions instead of the model\'s memory of APIs',
          'Judge generated code by execution, not by fluency',
        ],
        hook:
          'A team lead asks, in chat: "write a Python function to parse dates." It returns instantly and confidently: a beautiful function using a helper from a library that does not exist in their pinned version, a signature that does not match how the rest of the codebase names arguments, and no handling for the format their logs actually use. The code compiles in the reviewer\'s mind. Then it hits CI. Twenty minutes of prompt-writing would have prevented twenty minutes of archaeology — and the lead already knew the requirements. They simply did not put them in the prompt.',
        concept: `**Why codegen punishes vagueness harder than prose does.** A vague prose request yields vague prose, which a human can salvage in place. A vague code request yields code that is *plausibly wrong*: right shape, wrong API, missing edge case, silent assumption. Code is executable, so its defects do not argue with you — they fail at three in the morning. The discipline is the one every tech lead already applies to a junior developer: you do not say "write something for dates"; you say what it does, what it takes, what it returns, and what must never happen.

**The spec skeleton for a codegen prompt.** Six slots, in the order a reader needs them:

1. **Task and signature.** One sentence of what it does, then the exact signature you want — parameter names, types, return type. Models match a declared signature reliably and guess one you will accept only occasionally.
2. **I/O contract.** Concrete input and expected output — at least one happy path in your real data format. Examples kill the ambiguity prose leaves open: "date" alone means at least three different things.
3. **Constraints.** What it must not do: no dependencies beyond those listed, no global state, no network calls, target language and library versions, house style ("match the repo: type hints, snake_case"). Constraints you omit become creative freedom you did not want.
4. **Edge cases you already know.** Empty input, nulls, unicode, timezone boundaries, duplicates, cycles — name them. This is the cheapest reliability available: every edge case you name gets handled instead of skipped for the happy path.
5. **Context snippet.** The neighboring code it must fit: the function it calls, the type it returns, ten lines of house style. Relevant lines beat volume — Lesson 3 is about selection, because pasted-unrelated context dilutes attention across everything you pasted.
6. **Verification ask.** "Give the two asserts you would run for the cycle and empty cases" or "list every assumption you made" — forcing assumptions into text turns silent guesses into reviewable lines, and the asserts become the run you were going to do anyway.

**The failure modes, named.** Treat these like Module 5's taxonomy: each has a signature and a first move. *Hallucinated APIs* — plausible methods that do not exist (pin versions, paste real usage, run it). *Invented dependencies* — a phantom package or helper module (ban new dependencies outright). *Silent scope change* — does more or less than asked because a degree of freedom was open (contract example). *Plausible-but-wrong logic* — off-by-one, sort order, boundary conditions (one worked example with real numbers). *Style drift* — correct logic in someone else's house (style constraint plus a snippet). *Version anachronism* — deprecated calls from training memory: APIs and provider tooling move, so verify against current docs and your installed versions rather than trusting recall.

**The verification layer.** Generated code is a proposal. In this domain — uniquely — the check is mechanical: compile, run, test. A prompt that ends with code and no instruction to execute outsources verification to whoever reads it next. Keep each ask small enough that its output can actually be checked: one function, one behavior at a time — Module 4's decomposition, applied where verification is free.`,
        extras: [
          table(
            'Codegen failure modes and the spec line that blocks them',
            ['Failure mode', 'Signature', 'First-move fix in the prompt'],
            [
              ['Hallucinated API', 'Method looks real, does not exist', 'Pin library + version; paste real usage; run it'],
              ['Invented dependency', 'New package or phantom helper appears', '"No new dependencies — stdlib and listed imports only"'],
              ['Silent scope change', 'Does more or less than asked', 'Contract example: exact input -> exact output'],
              ['Plausible wrong logic', 'Off-by-one, ordering, boundary bugs', 'One worked example with real numbers'],
              ['Style drift', 'Correct logic, wrong house style', 'Style constraint + ten lines of neighboring code'],
              ['Version anachronism', 'Deprecated or renamed API', 'State versions; re-verify when versions move'],
            ],
          ),
          tip(
            'Pin before you prompt',
            '"Python 3.12, pandas 2.x, no new dependencies" removes an entire class of confident nonsense — the model cannot reach for an API you told it does not exist here.',
          ),
          warn(
            'Fluency is not correctness in this domain',
            'Beautifully formatted wrong code reads better, which makes it more dangerous. Execute the output; the run is the verdict, the review is commentary.',
          ),
        ],
        worked: {
          title: 'Upgrade a one-line codegen request into a spec that ships',
          problem:
            'A developer needs a function that flattens nested org data (lists of dicts with a "reports" key) into spreadsheet rows. Current prompt: "write a Python function to flatten this JSON into rows." Three attempts: one with a nonexistent helper, one that recursed forever on a cycle, one that silently dropped the employee id column. Rebuild the prompt as a six-slot spec.',
          steps: [
            {
              title: 'BEFORE: the weak request, with its open degrees of freedom',
              desc: 'A goal and nothing else — no signature, no column contract, no cycle policy, no dependency policy, no definition of a row. Each open slot is a coin flip the model takes on your behalf, and the three past failures map exactly to three unspecified slots.',
              code_snippet:
                'BEFORE (weak)\n"Write a Python function to flatten this JSON into rows for\n a spreadsheet. Make it clean and efficient."\n\nUnspecified: signature, columns/order, cycle policy, depth\nlimit, dependency policy, what a "row" contains.',
            },
            {
              title: 'AFTER, slots 1-2: signature plus one real I/O pair',
              desc: 'Declare the signature and a concrete input/output example with actual values. The example pins column names, column order and depth-first row order — the things prose keeps vague and examples settle in one line each.',
              code_snippet:
                'AFTER, slots 1-2 (signature + contract):\n\ndef flatten_org(root: dict) -> list[dict]:\n    """Rows for export: depth-first, one dict per person."""\n\n# in:  {"id":"E1","name":"Ada","dept":"Eng",\n#        "reports":[{"id":"E2","name":"Lin","dept":"Eng"}]}\n# out: [{"id":"E1","name":"Ada","dept":"Eng"},\n#        {"id":"E2","name":"Lin","dept":"Eng"}]\n# Columns and order exactly as above, always.',
            },
            {
              title: 'AFTER, slots 3-4: constraints and named edges',
              desc: 'Constraints close the creative freedom; the edge list converts known hazards into handled policies. Cycle handling is now a rule (track visited ids) instead of a hope, and the missing-id case becomes an explicit error rather than a silent drop.',
              code_snippet:
                'AFTER, slots 3-4 (constraints + edges):\n- Python 3.12, stdlib only: NO new dependencies.\n- Depth limit 20; deeper -> ValueError with the path.\n- Cycles: track visited ids; skip repeats, keep going.\n- "reports" missing/null/[] -> leaf, no error.\n- Person without "id" -> ValueError naming the name field.\n- Pure function: no print, no I/O, no globals.',
            },
            {
              title: 'AFTER, slots 5-6: context and verification, then run',
              desc: 'Ten lines showing how rows are consumed downstream plus house style (type hints, docstring convention). Close with the verification ask: "give the two asserts you would run for the cycle and empty-reports cases." Then run the code and those asserts. Assumptions surface as text; defects surface as failures — before either reaches CI.',
            },
          ],
          solution:
            'WHY the second version ships: the signature removed name-and-shape ambiguity; the I/O pair fixed column order and traversal order unarguably; the dependency ban killed hallucinated helpers by policy; the cycle rule prevented the infinite recursion the model had no reason to guess at; the missing-id rule turned a silent drop into a named error; the context snippet aligned style and consumption; and the verification ask plus execution closed the loop. Every one of the three past failures maps to a slot the weak prompt left open — codegen quality is spec quality, and execution is the only honest review.',
        },
        practice: {
          title: 'Re-spec a failed codegen',
          prompt:
            'Recall a code task that went badly with AI, or invent one you need. Write the full six-slot spec: signature, one concrete I/O example, constraints including a dependency ban, your named edge cases, a ten-line context snippet from a real codebase, and a verification ask. Run it, execute the result, and report which slot prevented which failure class.',
          hint: 'If you cannot write the I/O example with real values, you do not yet know the contract — the model will guess it for you, and it will guess average.',
        },
        mistakes: [
          {
            mistake: 'Asking for "a function that does X" with no signature or example',
            fix: 'Declare the signature and one real input/output pair; examples settle names, ordering and formats that prose leaves as coin flips.',
          },
          {
            mistake: 'Letting the model invent dependencies and helpers',
            fix: 'Ban new dependencies and paste how the project actually imports the library; then verify against your installed version, because docs and models both move.',
          },
          {
            mistake: 'Reviewing generated code by eye instead of running it',
            fix: 'Fluent wrong code is this workflow\'s most dangerous artifact. Compile, run, test — the run is the verdict.',
          },
          {
            mistake: 'Asking for the whole feature in one request',
            fix: 'One function, one behavior, one verification per prompt. Small outputs are the only outputs a human can honestly check.',
          },
        ],
        exam: {
          question:
            'Name four common codegen failure modes and the line of spec that prevents each. Explain why an I/O example with real values outperforms a paragraph describing the same contract.',
          answer:
            'Four failure modes with fixes: (1) hallucinated APIs — pin language and library versions, paste real usage from the project, execute the result; (2) invented dependencies — explicit constraint: no new dependencies, stdlib and listed imports only; (3) silent scope change — a concrete input-to-output example fixing columns, ordering and formats; (4) plausible-but-wrong logic (off-by-one, ordering, boundaries) — a worked example with real numbers plus named edge cases and stated policies (cycles, nulls, limits). An I/O example beats prose because prose underdetermines — "flatten", "clean" and "date" each carry several meanings — while an example is one unambiguous instance the model pattern-matches exactly, settling structure and formatting in a single line. Prose states intent; examples demonstrate the contract, and demonstrated behaviour consistently outweighs described behaviour (Module 3).',
          source: 'Standard applied question in LLM-assisted development interviews.',
        },
        summary: [
          'Codegen quality is spec quality: signature, I/O contract, constraints, named edges, context snippet, verification ask.',
          'Learn the failure modes like a taxonomy: hallucinated APIs, invented dependencies, scope drift, wrong logic, style drift, version rot.',
          'Pin versions and ban surprise dependencies; APIs and models both move, so re-verify on upgrade.',
          'Examples beat prose for contracts: one real input/output pair settles what a paragraph cannot.',
          'In this domain the run is the verdict — execute the output before you admire it.',
        ],
      }),
      [
        [
          'Which addition most reliably prevents a hallucinated-API failure?',
          [
            'Asking the model to be careful',
            'Pinning language and library versions, pasting real usage from the project, then executing the result',
            'Requesting the code in one block with no comments',
            'Raising the temperature for more grounded output',
          ],
          1,
          'Pinning and real usage narrow the model to APIs that exist in your world; execution catches the residual.',
        ],
        [
          'A generated function silently skips rows with missing ids instead of erroring. Which spec slot was missing?',
          [
            'Style constraints',
            'A stated policy for that edge case — what must happen on missing ids',
            'A longer task description',
            'The verification ask',
          ],
          1,
          'Unnamed edge cases become happy-path defaults; policies for what must never happen belong in the edge-case slot.',
        ],
        [
          'Why does one concrete input/output example usually beat a paragraph describing the contract?',
          [
            'Examples always cost fewer tokens',
            'An example is one unambiguous instance; prose underdetermines names, ordering and formats — and demonstrated behaviour outweighs described behaviour',
            'Models cannot read prose about code',
            'Examples remove the need to run anything',
          ],
          1,
          'Underdetermined prose is a per-field coin flip; an example pins structure and order exactly once.',
        ],
        [
          'You have received generated code that reads convincingly. The correct next step:',
          [
            'Merge — it looked right',
            'Ask the model to approve its own code, then merge',
            'Compile and run it against your named edge cases — the run is the verdict',
            'Save it and test next sprint',
          ],
          2,
          'Execution is the only mechanical check this domain gives you for free; fluency is decoration.',
        ],
      ]
    ),
    lesson(
      M7,
      'pem-7-2',
      2,
      'Test-First Prompting and Refactoring Without Regressions',
      'Tests are the cheapest contract a model can produce — small, readable, executable. Generate and review them first, then generate code to satisfy them; and when old code changes, state the invariants that must survive.',
      16,
      nineBlocks({
        objectives: [
          'Generate a focused test suite first and review it as the specification',
          'Run a red-then-green loop where failing tests anchor codegen',
          'Write refactoring prompts with explicit invariants, scope and acceptance checks',
          'Detect tautological generated tests and correct them before coding',
        ],
        hook:
          'Two engineers delegate the same task. The first says "write a parser for this config format and make sure it works" — gets code, argues about it for an hour, still cannot say whether the edge cases are covered. The second says "write five tests for this format first: these two should pass with these exact values, these three are the nasty ones" — reads the tests for ten minutes, corrects one wrong expectation, and the code is nearly an afterthought. One shipped a parser. The other shipped a parser and its specification.',
        concept: `**Why tests first.** A test suite is an executable spec in the most reviewable form the workflow produces: ten lines of test are faster to verify than three hundred lines of implementation, and they convert "looks right" into a binary run. The order of generation matters more than people expect. Tests written *after* code tend to mirror the code's assumptions — including its bugs, because the model writing them has just committed to those assumptions. Tests written *before* code, derived from your spec and I/O examples, constrain the implementation instead of ratifying it. That is test-first prompting: the model proposes the specification, you approve it, then the code arrives with somewhere to be right.

**The loop, concretely.** (1) Generate tests from the spec: give the signature, the I/O example, and the named edge cases; ask for exactly five to ten tests covering happy path, each named edge, and one case you did not name (models are good at proposing boundaries you forgot — a free edge-case audit). (2) *Review the tests like a contract*: is each expected value what you actually want? Is a policy encoded correctly ("cycle should skip, not throw")? Fix wrong expectations yourself — this is the ten minutes that saves the hour. (3) Generate the implementation against the approved tests: "make these tests pass; do not modify them." (4) Run. Red, then green — with a human approving the red.

**The tautology trap.** Generated tests can be vacuous: asserting what the code does rather than what the spec says, expected values copied from the implementation, every test passing on first generation, or ten happy paths and no negative cases. Red flags: tests that pass immediately (they may have been written to match a solution the model already had), assertions on incidental details (variable names, log output), and mocks so total that nothing real executes. The counter is structural: derive tests from *your* examples first, require expected values from your contract, and insist on at least one failure-path test per policy.

**Refactoring prompts: contract is "same behavior, different structure".** Refactoring is where vague prompts do the most damage, because the model helpfully "improves" behavior you were not thinking about: renaming a public function, swallowing an error it decides is edge-casey, dropping a guard as dead code. A refactoring prompt must state what *stays the same*, not just what changes:

1. **Invariants** — public API names and signatures unchanged; observable behavior identical, including error types and messages you depend on; no dependency changes.
2. **Scope** — exactly which function or files may change; "do not touch callers".
3. **Safety net** — attach the existing tests (or the test-first suite you just built) and require them to stay green; if no tests exist, this is your signal to generate them *first* — a refactor without tests is a rewrite with optimism.
4. **Acceptance** — ask for the minimal diff that achieves the stated goal, plus a list of any behavior risk the model sees while reading. Scope creep ("while I'm here...") is how refactors break things; forbid it by name.

The same split governs both halves of this lesson: your prompt states the contract, the model proposes artifacts, and the run decides. Tests are simply the cheapest contract artifact there is — which is why serious code prompting is test-first almost by default.`,
        extras: [
          table(
            'Test-first loop with review gates',
            ['Step', 'Model produces', 'You do'],
            [
              ['1. Generate tests', '5-10 tests from your spec + I/O + edges', 'Read every expected value as a contract'],
              ['2. Correct', '—', 'Fix wrong expectations; add the policy test it missed'],
              ['3. Generate code', 'Implementation that must pass the approved tests', 'Do not let it edit the tests'],
              ['4. Run', '—', 'Red/green is the verdict; failures feed the next round'],
              ['5. Refactor', 'Minimal diff under stated invariants', 'Check the invariants and the diff, not the prose'],
            ],
          ),
          code(
            `# test-first prompt, part 1 (tests are the contract)\nSPECS:\n  def parse_flags(args: list[str]) -> dict[str, str | bool]\n  --name value | --flag | --name=value | bare args -> error\n\nWrite EXACTLY 6 pytest tests:\n  1 happy path mixing styles, 2 --name=value, 3 --flag alone,\n  4 missing value for --name -> ValueError("flag needs value"),\n  5 bare positional -> ValueError starting with "unexpected",\n  6 empty list -> {}\nExpected values must come from the specs above, not from an\nimplementation you imagine. Tests only — no implementation yet.`,
            'tests_part1.txt',
            'text',
          ),
          tip(
            'Ten minutes reading tests beats an hour reading code',
            'Tests are the smallest artifact that states the whole contract. Approve the red before you generate the green.',
          ),
          warn(
            'A refactor prompt without tests is a rewrite with optimism',
            'If no tests exist, generate them first from behavior you can state — otherwise "cleaner code" silently means "different code".',
          ),
        ],
        worked: {
          title: 'Test-first for a new helper, then an invariant-bound refactor',
          problem:
            'A CLI tool needs a new argument parser (test-first) and its existing 120-line config loader needs restructuring because three functions duplicate merge logic (refactor). Both have failed before: the parser came back over-permissive, and a previous "cleanup" of the loader changed which error fires on a malformed key — breaking a downstream script that matched on the message.',
          steps: [
            {
              title: 'Test-first, BEFORE vs AFTER',
              desc: 'BEFORE (weak): "write a flag parser and include some tests" — tests arrive after and beside a solution the model already imagined, so they ratify its choices. AFTER: tests-only prompt with expected values mandated from the spec (code block), forcing the specification artifact out first.',
              code_snippet:
                'BEFORE (weak)\n"Write a Python arg parser for --name, --flag. Include some\n tests so we know it works."\n\nAFTER (strong, tests only — see extras for the full text)\n- specs pinned, exactly 6 tests, each expected value mandated\n- "Tests only — no implementation yet."  <- order is the point',
            },
            {
              title: 'Approve the red: read six tests, fix one',
              desc: 'Review takes minutes because the artifact is small. One test encoded "bare arg silently ignored" — wrong: your contract says ValueError. You correct the expectation. That correction, made now, is a spec decision; made later, it would have been a bug report.',
            },
            {
              title: 'Generate the green, and forbid test edits',
              desc: 'Second prompt: "Make these 6 tests pass. Do not modify the tests. Stdlib only. If a test is impossible under the spec, stop and say which." The stop clause converts disagreements into text instead of silent test edits — the model editing its own grading rubric is the failure mode this prevents.',
            },
            {
              title: 'The refactor prompt: invariants first, then the goal',
              desc: 'BEFORE (weak): "refactor the config loader to remove duplication — make it clean and pythonic" (previous run renamed a public function and changed an error message). AFTER: invariants, scope, safety net and acceptance stated before the goal — plus a demand to list behavior risks it notices.',
              code_snippet:
                'AFTER (refactor):\nINVARIANTS (must hold after the change):\n  I1 public functions keep exact names + signatures\n  I2 error types AND messages unchanged (scripts match text)\n  I3 no new dependencies; no behavior change for valid configs\nSCOPE: loader.py lines 40-120 only; do not touch callers.\nSAFETY: existing 14 tests (attached) must stay green.\nGOAL: extract the duplicated merge logic into one helper.\nOUTPUT: minimal diff + a list of any behavior risk you see.\nAlso: no "while I am here" improvements outside SCOPE.',
            },
          ],
          solution:
            'The parser shipped as spec, not guesswork: six approved tests pinned permissiveness boundaries and error behavior before a line of implementation existed, and the stop clause kept the model from editing its own rubric. The refactor stated what must not change — names, signatures, error text, dependencies — which is precisely what the previous vague cleanup violated, and the attached suite plus minimal-diff acceptance made violations visible. Note the ordering principle behind both: contract artifact first (tests, invariants), implementation second, run last. Whether the artifact is a test file or a paragraph of invariants, you are doing the same thing — approving the specification before the code exists.',
        },
        practice: {
          title: 'Run one red-then-green cycle',
          prompt:
            'Pick a small function you need. (1) Test-first prompt: derive 5-8 tests from your own I/O examples and edge policies; expected values from your contract only. (2) Review them and fix at least one expectation. (3) Generate the implementation with a no-test-edit clause. (4) Run everything. Then take one existing function you dislike and write its refactor prompt with invariants, scope and acceptance — and report which invariant did the most work.',
          hint: 'If every generated test passes on the first read, audit them harder — instant green often means tests written to match an imagined solution.',
        },
        mistakes: [
          {
            mistake: 'Generating tests after code and trusting them',
            fix: 'Post-hoc tests inherit the implementation\'s assumptions, including bugs. Derive tests from your spec first, approve them, then generate code to satisfy them.',
          },
          {
            mistake: 'Accepting tautological tests (asserting behavior instead of contract)',
            fix: 'Expected values must come from your contract examples; require a failure-path test per policy; distrust suites that pass on first generation.',
          },
          {
            mistake: 'Refactor prompts that state the goal but not the invariants',
            fix: '"Cleaner" invites renamed APIs, changed error text and dropped guards. State what must stay the same: names, signatures, messages, dependencies, behavior.',
          },
          {
            mistake: 'Letting the model "improve" outside the stated scope',
            fix: 'Forbid scope creep by name, require a minimal diff, and require any behavior risk it notices to be listed rather than silently resolved.',
          },
        ],
        exam: {
          question:
            'Explain why test-first prompting outperforms test-after prompting for LLM codegen, give three signs of a tautological generated test, and list the four components of a safe refactoring prompt.',
          answer:
            'Test-first wins because tests written after the implementation inherit its assumptions — the model ratifies the same choices (and bugs) it just made — while tests written first from your spec and I/O examples act as a binding contract the implementation must satisfy, and they are the smallest, most reviewable artifact in the workflow. Three tautological signs: tests that pass immediately (written to match an imagined solution); expected values copied from the implementation rather than your contract; assertions on incidental details or so heavily mocked that no real path executes — plus the tell of ten happy paths and no negative cases. Safe refactoring prompt components: (1) invariants — public names/signatures, observable behavior including error types and messages, dependency set all unchanged; (2) scope — exactly which function or lines may change, callers untouchable; (3) safety net — the existing test suite attached and required to stay green (generate tests first if none exist); (4) acceptance — minimal diff plus an explicit list of behavior risks noticed, with scope creep forbidden by name.',
          source: 'Common LLM-assisted development interview topic: safe refactoring and TDD with AI.',
        },
        summary: [
          'Tests are the cheapest contract artifact: approve the red before you generate the green.',
          'Expected values come from your contract, not from the implementation the model has in mind.',
          'Watch for tautologies: instant passes, implementation-derived expectations, mocked-away reality.',
          'Refactor prompts must state what stays the same: invariants, scope, safety net, minimal-diff acceptance.',
          'No tests means generate them first — a refactor without tests is a rewrite with optimism.',
        ],
      }),
      [
        [
          'Why does generating tests before code outperform tests after code in LLM codegen?',
          [
            'Tests generated first cost fewer tokens',
            'Post-hoc tests inherit the implementation\'s assumptions; first-generated tests bind the implementation to your spec',
            'Models are worse at writing tests for finished code',
            'It makes the code compile faster',
          ],
          1,
          'The artifact written first from your contract constrains what comes next; the artifact written second tends to ratify it.',
        ],
        [
          'A generated test asserts that the log message contains the variable name it just printed. Red flag:',
          [
            'None — it is a valid test',
            'It asserts an incidental detail instead of the contract — behavior-shaped tests should check observable outcomes',
            'Log assertions are always forbidden',
            'It should use a longer message',
          ],
          1,
          'Assertions on incidental details break on harmless edits and never encode what the caller needs; they are a tautology smell.',
        ],
        [
          'Your refactoring prompt must begin with:',
          [
            'The goal ("make it cleaner") in more detail',
            'The invariants that must survive: names, signatures, error behavior, dependencies — then scope and the test safety net',
            'A full rewrite of the function for reference',
            'The model\'s suggestions for improvement',
          ],
          1,
          'Refactoring is defined by what does not change; without stated invariants, "improvement" silently means different behavior.',
        ],
        [
          'The implementation you generate fails one approved test. Correct next step:',
          [
            'Change the test to match the implementation',
            'Raise the temperature and regenerate',
            'Treat it as either an implementation bug or a now-discovered spec conflict — diagnose which, and edit the test only if your contract was wrong',
            'Delete the failing test to get to green',
          ],
          2,
          'A failing test is information: either the code is wrong or your approved spec was. Never let the implementation silently regrade itself.',
        ],
      ]
    ),
    lesson(
      M7,
      'pem-7-3',
      3,
      'Debug Loops: Error to Diagnosis to Fix, with the Right Repo Context',
      'Debugging prompts fail when they ask for a fix before a diagnosis. Build loops that supply evidence verbatim, demand hypotheses first, keep fixes minimal — and engineer exactly which repository context reaches the window.',
      16,
      nineBlocks({
        objectives: [
          'Assemble a debug prompt with verbatim error, expected-vs-actual, repro and relevant code',
          'Run a diagnosis-first loop that separates hypothesis generation from patching',
          'Select and trim repository context so critical files are not diluted',
          'Prime house style with a snippet instead of a paragraph of adjectives',
        ],
        hook:
          'A developer pastes: "this doesn\'t work, can you fix it?" followed by forty lines of code with no error message. The model obliges with a confident patch that changes three things. Two rounds later, the actual bug — a timezone the code never handles — is found by a colleague in four minutes, because she asked "what did you expect, what happened, and show me the traceback." The model was not failing at debugging; it was being asked to guess instead of being given evidence. Guesses are cheap, and confident guesses are worse.',
        concept: `**Debugging is an evidence problem before it is a prompting problem.** A debugger withholds nothing: exact error, exact input, exact expectation, smallest reproducing case, the code involved, and what has already been ruled out. Strip any of those and the model does what models do — it completes the most statistically plausible scenario, which is often a *different bug entirely*. The weak debug prompt ("fix this") therefore has a characteristic failure: a fluent patch to code that was never broken.

**The debug prompt's five evidence slots.** (1) *Verbatim error* — the full traceback or message, unedited, including the line numbers; summaries discard the clue ("KeyError" alone hides which key). (2) *Expected vs actual* — one sentence each; without the expectation, "wrong" is undefined and any behavior can be argued either way. (3) *Minimal repro* — the smallest input and command that triggers it; if you cannot produce one, you have not isolated the bug, and the model cannot either. (4) *The involved code* — the failing function plus its immediate caller and the definitions it touches (Lesson 3's selection rules). (5) *Ruled out* — "already checked: config is correct, input parses, happens only in prod-like data." Ruled-out items stop the loop from re-proposing what you killed yesterday.

**Diagnosis before patch.** Structure the loop in three prompts, not one: first, "list the two or three most likely causes ranked, and for each give a one-line experiment that would confirm or kill it" — hypotheses with tests; second, once evidence picks a winner, "give the minimal fix for cause X only" — minimal means no drive-by refactors; third, "state the exact command to run to prove the fix, and what regression it could cause." This ordering exploits what models are good at (generating plausible explanations, widening search) while fencing what they are bad at (admitting uncertainty after committing to a patch). It also converts a wrong diagnosis into a cheap, visible step: you kill a hypothesis with its experiment instead of merging a patch that rewrites unrelated code. Bound the loop at two or three rounds; if evidence is not converging, the context is wrong or the problem is too big — widen the context or decompose (Module 5, class 8: stop wording, change structure).

**Repo-context engineering.** What reaches the context window decides what the model can see, and in code, position and relevance both matter (Module 1, Lesson 3). Four practices:

1. *Select, do not dump.* Include the failing file, its caller, and the interfaces it depends on — not the repository. Distant files dilute attention across everything pasted; a focused five-file context beats a fifty-file one for a localized bug. (Agentic coding tools auto-select context; the same principle governs what you hand them and what you check they gathered.)
2. *Trim to regions.* For a big file, paste the function and its neighborhood with a note on where it lives ("file: service.py, lines 80-140") instead of the whole file.
3. *Put the ask after the code.* Instruction and question at the end, adjacent to where generation starts — the edge placement that Part I established and long contexts keep proving.
4. *Prime style with an exemplar.* Two sentences of "match the house style" are weaker than ten lines of actual house style. Paste a representative function and say "match this: error handling, naming, comment density." Style is a pattern; patterns transfer by example (Module 3), not by adjective.

**The verification tail.** Every debug loop ends outside the model: run the repro, run the proposed confirmation experiment, run the suite. The loop closes when the evidence changes, not when the prose sounds right.`,
        extras: [
          table(
            'Debug prompt anatomy',
            ['Slot', 'What goes in', 'Failure without it'],
            [
              ['Verbatim error', 'Full traceback / message, unedited', 'Model patches a different, more common bug'],
              ['Expected vs actual', 'One sentence each', '"Wrong" is undefined; any fix can be argued'],
              ['Minimal repro', 'Smallest input + command', 'No isolation — the model guesses at scope'],
              ['Involved code', 'Failing fn + caller + definitions', 'Fix breaks an interface it never saw'],
              ['Ruled out', 'What you already tested', 'Loop re-proposes yesterday\'s dead hypothesis'],
            ],
          ),
          code(
            `# debug prompt, round 1 (diagnosis only — no patch yet)\nERROR (verbatim, production):\nTraceback (most recent call last):\n  File "sync.py", line 88, in nightly\n    rows = key_by(ids)\nKeyError: 'order_9182'\n\nEXPECTED: every id in ids resolves (rows has 1:1 entries)\nACTUAL: KeyError on order_9182; 3 of 200 ids fail, always\n        on ids imported after midnight\nRULED OUT: input csv parses; ids exist in source db;\n        works on yesterday's data\n\nCODE:\n<sync.py:70-100>\n...\n</sync.py>\n\nTASK: rank the 2-3 most likely causes. For each: one-line\nexperiment to confirm or kill it. DO NOT write a fix yet.`,
            'debug_round1.txt',
            'text',
          ),
          tip(
            'Ruled-out is the most underrated slot',
            'Each dead hypothesis you state is one the loop cannot waste a round on — it converts prior work into prompt context instead of repeated archaeology.',
          ),
          warn(
            'Never ask for the fix and the diagnosis in the same breath',
            'A patch-first prompt commits the model to a cause it has not argued for. Hypotheses with cheap tests first; minimal patch second; proof command third.',
          ),
        ],
        worked: {
          title: 'Turn "it does not work, fix it" into a three-round evidence loop',
          problem:
            'A nightly sync intermittently fails with a KeyError. The developer\'s first two attempts: paste code with "it does not work" (received: a rewrite of the whole function), then paste code plus "fix the KeyError" (received: a try/except that swallowed it — the failure disappeared from the error log and reappeared as wrong data). Build the proper loop.',
          steps: [
            {
              title: 'Assemble the evidence: five slots filled',
              desc: 'Full traceback, expected-vs-actual, the repro (only fails on ids imported after midnight — that pattern is itself evidence), the failing function plus its caller, and the ruled-out list. Round 1 asks only for ranked causes with confirmation experiments — explicitly no fix.',
            },
            {
              title: 'Round 1 output: hypotheses you can kill cheaply',
              desc: 'The model ranks: (1) duplicate ids collapsing in a dict — experiment: count len(ids) vs len(set(ids)); (2) stale id format from the midnight importer — experiment: regex the id shapes by import hour; (3) caller passing a generator it exhausts twice — experiment: log len at entry. Each is a one-line test; none involves rewriting code.',
              code_snippet:
                'H1 dupes in dict build   -> count len(ids) vs len(set(ids))\nH2 midnight id format    -> regex id shapes by import hour\nH3 generator exhausted    -> log len(ids) at function entry\n\n# experiment result: H1 wins - 3 duplicates, silent overwrite\n# in the dict comprehension, last-seen wins and the orphaned\n# key raises later at line 88.',
            },
            {
              title: 'Round 2: minimal fix for the diagnosed cause only',
              desc: 'Cause confirmed (H1), so the second prompt narrows hard: fix duplicate handling at dict construction, nothing else. The instruction forbids the two failure modes already seen: no wholesale rewrite, no swallowing — an explicit "do not add try/except that hides this" clause, because the previous attempt converted a data bug into silent corruption.',
              code_snippet:
                'AFTER, round 2 (minimal fix):\nCause H1 confirmed. Fix ONLY duplicate-id handling in the dict\nbuild: detect duplicates, keep an explicit policy (first-seen\nwins), and raise with the offending ids if a duplicate appears\nin the SAME input batch.\nDo not refactor surrounding code. Do NOT wrap in try/except\nthat swallows KeyError. Output: the changed lines only + the\nexact command to run to prove it.',
            },
            {
              title: 'Round 3: proof and regression check, outside the model',
              desc: 'The prompt asks for the proving command and the regression risk; you run them: repro with duplicated input (fails cleanly with ids named), the nightly dry-run, and the existing suite. Loop closed by execution — the evidence changed, not the prose.',
            },
          ],
          solution:
            'The wrong-patch pattern (rewrite; swallow) never got a chance, because round 1 committed to no patch at all — only ranked hypotheses with one-line experiments, the shape of debugging that models are actually strong at. The confirmed cause made round 2 narrow enough that the fix touched the policy at dict construction and nothing else, and the explicit anti-swallow clause fenced the exact failure the developer had already shipped once. Repo context did its part: traceback verbatim, function plus caller, ruled-out items up front. Diagnosis first, minimal fix second, proof third — three prompts where the weak version used one.',
        },
        practice: {
          title: 'Run a diagnosis-first loop on a real bug',
          prompt:
            'Take a real unresolved bug (yours or a classic from your stack). Write the debug prompt with all five evidence slots filled honestly, including a ruled-out list. Round 1: ranked causes plus one-line experiments, no fix allowed. Run (or simulate) an experiment to kill one cause. Round 2: minimal fix for the survivor. Round 3: proof command plus regression risk. Report: which slot was empty in your usual debug prompting, and which round changed your mind.',
          hint: 'If you cannot write a minimal repro, you are still in evidence-gathering — say so in the prompt instead of asking for a patch.',
        },
        mistakes: [
          {
            mistake: '"Fix this" with code attached but no verbatim error or expectation',
            fix: 'Without evidence, the model completes the most common scenario for your snippet — usually a different bug. Five slots: error, expected/actual, repro, code, ruled out.',
          },
          {
            mistake: 'Demanding diagnosis and patch in one prompt',
            fix: 'The model commits to a cause before arguing for it. Hypotheses with cheap experiments first; minimal fix second; proof command third.',
          },
          {
            mistake: 'Pasting the whole repository "for context"',
            fix: 'Dilution: critical lines drown in distant code. Select the failing file, its caller and its interfaces; trim big files to the region; ask after the code.',
          },
          {
            mistake: 'Accepting a fix that hides the error (try/except, retry, swallow)',
            fix: 'A patch that silences the signal while the data stays wrong is a regression. Require the fix to preserve error visibility and prove the original repro now succeeds.',
          },
        ],
        exam: {
          question:
            'List the five evidence slots of a well-formed debug prompt, explain why the loop should request diagnosis before patch, and give two repo-context selection rules with the failure each prevents.',
          answer:
            'Five slots: (1) the verbatim error/traceback, unedited — summaries discard clues such as the exact key or line; (2) expected versus actual behavior, one sentence each — otherwise "wrong" is undefined; (3) a minimal reproduction — the smallest input and command that triggers the bug; (4) the involved code — failing function, its caller and touched definitions; (5) what has already been ruled out — so the loop cannot re-propose dead hypotheses. Diagnosis before patch because a patch commits the model to a cause it has not argued: ranked hypotheses with one-line confirmation experiments exploit the model\'s strength (plausible explanations) and fence its weakness (confident commitment), turning a wrong direction into a cheap killed hypothesis instead of merged damage; the minimal fix then targets the confirmed cause, and the proof command closes the loop by execution. Context rules: (1) select, do not dump — paste the failing file, caller and interfaces, not the repository — preventing attention dilution where critical lines drown in distant code; (2) trim large files to the relevant region and place the ask after the code — preventing position failures where the instruction is lost in the middle of a long paste.',
          source: 'Applied debugging-with-LLM interview question; mirrors agentic coding harness design.',
        },
        summary: [
          'Debugging prompts are evidence problems: verbatim error, expected/actual, minimal repro, involved code, ruled-out list.',
          'Three rounds beat one: ranked hypotheses with experiments, then a minimal fix, then the proof command.',
          'State your ruled-out list — each dead hypothesis is a round the loop cannot waste.',
          'Repo context: select, trim to regions, ask after the code; five focused files beat fifty diluted ones.',
          'Prime style with an exemplar snippet; patterns transfer by example, not by adjective.',
          'The loop closes on execution, not on prose: repro, experiment, suite.',
        ],
      }),
      [
        [
          'A debug prompt with only code and "it does not work" most likely produces:',
          [
            'A precise minimal fix',
            'A confident patch to a different, more statistically common bug — evidence was never supplied',
            'A request for a traceback, always',
            'Refusal until tests are provided',
          ],
          1,
          'Without the error and expectation, the model completes the likeliest scenario for your snippet — which is frequently not your bug.',
        ],
        [
          'The correct order of a three-round debug loop is:',
          [
            'Patch, then diagnose, then verify',
            'Ranked hypotheses with one-line experiments, then a minimal fix for the confirmed cause, then the proof command',
            'Rewrite the function, then add tests, then explain',
            'Ask for all three in one prompt to save tokens',
          ],
          1,
          'Diagnosis first fences premature commitment; the patch then has a argued cause; the proof command closes the loop by execution.',
        ],
        [
          'Why include a ruled-out list in the debug prompt?',
          [
            'It reduces token cost',
            'So the loop cannot waste rounds re-proposing hypotheses you already killed',
            'Providers require it',
            'It makes the traceback shorter',
          ],
          1,
          'Prior work becomes prompt context; dead hypotheses stay dead across iterations.',
        ],
        [
          'Your colleague pastes a 2,400-line file for a bug in one function. Best guidance:',
          [
            'More context is always better — paste the whole repository next',
            'Paste the function, its caller and the interfaces it touches, note the file and line region, and put the question after the code',
            'Delete all code and describe it in prose instead',
            'Ask three separate models to read it',
          ],
          1,
          'Focused selection plus edge placement keeps the critical lines attended; volume dilutes attention across everything pasted.',
        ],
      ]
    ),
    lesson(
      M7,
      'pem-7-4',
      4,
      'Code Review as a Prompt — and Knowing What Review Cannot Do',
      'Run review as a structured prompt with a rubric, a severity taxonomy and an evidence rule — then remember the boundary: a model reviewer finds pattern violations cheaply and cannot prove novel logic correct. Tests and execution stay the final authority.',
      16,
      nineBlocks({
        objectives: [
          'Write a review prompt with a rubric, severity levels, evidence rules and a fixed output format',
          'Separate pattern-level findings (strong) from logic-proof claims (weak) in model review output',
          'Require a demonstrating test for every claimed bug before acting on it',
          'Decide when review adds value versus when tests and execution answer the question',
        ],
        hook:
          'A team adopts "ask the AI to review the PR" and, for two weeks, it is magic: every diff comes back with a list of findings, and everyone feels safer. Then a reviewer approves a diff because the AI list "looked thorough" — the list was six style nits and one false positive, while the actual defect sat in the one place neither the model nor the humans looked: a novel race in brand-new logic. Review had become a ritual: voluminous, confident, and systematically missing the class of problem that mattered most.',
        concept: `**Review is a prompt like any other: it needs a rubric, a contract and an evidence rule.** "Review this code" underspecifies the task the way "write about internships" underspecifies an essay: the model picks whatever dimensions are statistically popular, which produces generic findings. A structured review prompt names the dimensions, fixes the output format, and — the crucial addition — requires evidence.

**The four-part review prompt.** (1) *Rubric* — name the axes you care about, ranked: correctness against spec, edge and error handling, security (injection, path traversal, secrets in logs), concurrency where relevant, performance only where hot, readability and consistency with the pasted house style, test coverage of new behavior. Named axes stop the model from spending its findings budget on style nits by default. (2) *Scope* — the diff (preferred) or file, plus the spec or ticket it implements; findings must relate to the change. (3) *Evidence rule* — every finding cites the exact line or quotes the snippet and states the concrete failure scenario ("when input is empty, row 0 is read" — not "could be problematic"). A finding without evidence is noise, and a review that produces noise trains its readers to skim. (4) *Output contract* — findings ordered by severity with a fixed taxonomy, then a one-line verdict, then an explicit section for "what I could not check" — the honesty slot that names the model's own blind spots for this diff.

**The severity taxonomy.** *Blocker* — will cause incorrect behavior, data loss or a security hole in realistic conditions. *Major* — likely bug or contract violation under plausible inputs; fix before merge. *Minor* — real but bounded: dead code, duplicated logic, missing test for an edge case. *Nit* — style preference, naming taste. The taxonomy does real work: it forces ranking, which forces the model to spend its attention where you will spend yours, and it lets a busy human read blockers and stop. It also makes false positives legible — a "blocker" that turns out theoretical is a taxonomy violation you can push back on, rather than a vague disagreement.

**What model review is strong and weak at — know the boundary.** Strong: pattern-matching a large catalogue of known anti-patterns — SQL built by string concatenation, unbounded recursion, resource acquired without release, unchecked index access, secrets in code, missing null or error checks, API misuse against pasted docs, inconsistency with stated conventions. This is recall over a huge training distribution, and it is genuinely valuable at diff speed. Weak: *proving novel logic correct*. A fresh algorithm with subtle ordering or state handling can be flawless on every pattern the model knows and still be wrong — because correctness of new logic is established by execution, not pattern recall. Also weak: performance claims without measurements (treat as hypotheses), whole-repo consistency without the repo, and any claim about behavior the model cannot see (tests, runtime, data).

**The proving-test requirement.** For any finding labeled blocker or major, ask for a demonstrating test: the minimal input and assertion that would fail today. This single rule changes review quality more than any other. It converts claims into checkable artifacts; false positives die in ten seconds when you run the test; true positives arrive already encoded as the regression test you will keep. Findings the model cannot instantiate as a test downgrade — by contract — to "speculative", which is where most logic-proofs-from-prose belong.

**Where review sits in the loop.** Review is a cheap middle gate, not the final one: spec and tests first (Lessons 1-2), build and run, review the diff, then execute the proving tests for blockers. And when the question is "is this new algorithm correct", skip review as the primary tool — property tests, edge-case runs and a profiler answer that class of question mechanically. Review at its best is what a sharp colleague with infinite patience does at 1x speed: read for patterns you already know to fear, cite lines, rank by severity, and admit what it did not check.`,
        extras: [
          table(
            'Severity taxonomy and the action it triggers',
            ['Level', 'Definition', 'Action'],
            [
              ['Blocker', 'Incorrect behavior, data loss or security hole in realistic conditions', 'Do not merge; require the demonstrating test to fail first'],
              ['Major', 'Likely bug or contract violation under plausible input', 'Fix before merge; test if it can be instantiated'],
              ['Minor', 'Bounded issue: dead code, duplication, missing edge test', 'Queue; fix with the next change to the file'],
              ['Nit', 'Style or naming preference', 'Optional; batch with style tooling, not with debate'],
            ],
          ),
          code(
            `# code review prompt (structured)\nSCOPE: this diff only (attached), implementing ticket T-481:\n  "reject uploads over 10MB with a clear error".\nSTYLE: house conventions (attached: 10 lines of exemplar).\n\nRUBRIC (rank findings by this order):\n  1 correctness vs the ticket, 2 edge + error handling,\n  3 security, 4 test coverage of new behavior, 5 style\n\nRULES:\n- Cite the exact line for every finding.\n- State the concrete failure scenario, not adjectives.\n- Label each: blocker | major | minor | nit.\n- For every blocker/major: give a minimal test that FAILS\n  on the current code.\n- End with: VERDICT (one line) and NOT CHECKED (what you\n  could not verify: runtime, data, tests not shown).\n- If nothing meets a level, say "no findings" for it.`,
            'review_prompt.txt',
            'text',
          ),
          tip(
            'Ask for the proving test with every blocker',
            'Claims become artifacts: false positives die when you run them, true positives arrive pre-encoded as the regression test you keep.',
          ),
          warn(
            'A thorough-looking finding list is not coverage',
            'Model review is pattern recall over known failure modes — novel logic still needs tests and execution. Never let a green-sounding review stand in for a run.',
          ),
        ],
        worked: {
          title: 'From "review this please" to a review with a verdict you can act on',
          problem:
            'A PR adds an endpoint that applies a coupon to a cart. The team\'s current prompt: "review this code for any issues please." It returns nine bullets, mostly naming conventions, one vague "consider handling edge cases", no severities, no lines cited, and a closing "overall looks good!" that reviewers have started quoting in approvals. Restructure the review and handle its output.',
          steps: [
            {
              title: 'BEFORE: the weak review prompt and why its output is useless',
              desc: '"Review this code for any issues please" leaves rubric, scope, evidence and format all open — so the model defaults to popular, cheap findings (style) and generic advice ("handle edge cases") that names no edge, cites no line, and cannot be actioned or refuted.',
              code_snippet:
                'BEFORE (weak)\n"Review this code for any issues please."\n\nOpen: dimensions, scope, evidence, severity, format.\nResult: 9 style nits, 1 vague edge advice, "looks good!"',
            },
            {
              title: 'AFTER: rubric, scope, evidence rule, taxonomy, honesty slot',
              desc: 'The structured prompt (see extras) names the rubric ordered by what matters, scopes to the diff against its ticket, requires line citations and concrete failure scenarios, fixes the severity labels, demands a demonstrating test for blockers/majors, and adds NOT CHECKED — the slot that stops confident omniscience.',
            },
            {
              title: 'Process the findings: run the proving tests',
              desc: 'Output: one blocker ("coupon applies twice when the cart is edited mid-request — no idempotency key"), two majors (stack trace leaks on invalid coupon; no test for the 100%-discount path), three minors, three nits, plus NOT CHECKED: "concurrent edit behavior, not visible in the diff". You run the blocker\'s demonstrating test: it fails today. The claim just became an artifact — and the test becomes the regression suite member that keeps the fix honest.',
              code_snippet:
                'blocker test (model-provided, fails on current code):\n  cart = apply_coupon(make_cart(total=1000), "SAVE10")\n  cart = apply_coupon(cart, "SAVE10")          # re-request\n  assert cart.total == 900   # FAILS: 810 (double-applied)\n\n# after fix (idempotency key): test passes -> keep it.',
            },
            {
              title: 'Handle the false positive and the honesty slot',
              desc: 'One "major" (claim: unbounded memory on large carts) cannot be instantiated as a test and turns out theoretical for your size limits — by contract it downgrades to speculative and you note it in the PR, not the blocker queue. NOT CHECKED ("concurrent edit behavior") is not filler: it tells you exactly what the model could not see, so you assign a human to test concurrency — the review said where to look, which is more valuable than a fake green light.',
            },
          ],
          solution:
            'The restructured review produced findings you could triage: ranked, cited, and — for the ones that mattered — executable. The proving-test rule did the heavy lifting: it killed a theoretical claim in seconds, converted the real defect into a permanent regression test, and made severity labels something you could argue with instead of take on faith. And the honesty slot converted the model\'s blind spot into a work item rather than a false assurance. Review had stopped being ritual and started being a gate: cheap to run, explicit about what it cannot do, and wired to execution as the final authority.',
        },
        practice: {
          title: 'Run a structured review on a real diff',
          prompt:
            'Take a recent change (yours or an open-source diff). Write the four-part review prompt: ranked rubric, diff scope, evidence rule (cite the line, concrete scenario), severity output plus NOT CHECKED. Run it. Triage: how many findings were blockers, could each blocker be instantiated as a failing test, and which severity label was wrong? Finally, name one question the review could not answer that only execution can.',
          hint: 'If no finding cites a line, the prompt\'s evidence rule is missing — findings without citations are opinions.',
        },
        mistakes: [
          {
            mistake: 'Unstructured "review this" prompts',
            fix: 'Name the ranked rubric, scope, evidence rule and output contract — unspecified dimensions get statistically popular (usually trivial) findings.',
          },
          {
            mistake: 'Treating every finding as equally actionable',
            fix: 'Enforce the taxonomy: blockers block, nits batch into tooling. A flat list forces humans to re-rank by hand — the work you asked the model to do.',
          },
          {
            mistake: 'Accepting logic-correctness claims from prose review',
            fix: 'Novel logic is proven by execution, not pattern recall. Require a demonstrating test for blockers; downgrade uninstantiable claims to speculative.',
          },
          {
            mistake: 'Quoting "the AI said it looks good" as approval',
            fix: 'The verdict line is a summary of pattern recall over the shown context — no run, no data, no tests seen. Approval still means you ran it.',
          },
        ],
        exam: {
          question:
            'Specify the four parts of a structured code-review prompt and the severity taxonomy. Then state what model review is strong at, what it is weak at, and how the proving-test requirement changes how you triage findings.',
          answer:
            'Four parts: (1) rubric — named, ranked dimensions (correctness vs spec, edges/errors, security, tests, style) so findings are spent where you care; (2) scope — the diff (or file) plus the ticket it implements, findings tied to the change; (3) evidence rule — every finding cites the exact line and states a concrete failure scenario, not adjectives; (4) output contract — findings ordered by severity (blocker/major/minor/nit), a one-line verdict, and an explicit NOT CHECKED section naming what could not be verified. Strengths: recall over a huge distribution of known anti-patterns — injection via concatenation, resource leaks, unchecked access, API misuse, convention violations — at diff speed. Weaknesses: proving novel logic correct (correctness of new algorithms comes from execution, not pattern matching), performance claims without measurement, and anything outside the shown context. The proving-test requirement (a minimal failing test for every blocker/major) converts claims into artifacts: false positives die when you run them, true positives arrive pre-encoded as regression tests, and uninstantiable claims are contractually downgraded to speculative — so triage happens by execution rather than by prose confidence.',
          source: 'Common question in AI-assisted development workflows: what can review automation actually guarantee?',
        },
        summary: [
          'Structured review: ranked rubric, diff scope, evidence rule (cite line + scenario), severity taxonomy, NOT CHECKED slot.',
          'Model review is pattern recall: strong on known anti-patterns, weak on proving novel logic correct.',
          'Require a demonstrating test for every blocker/major — claims become artifacts that run.',
          'Blockers block, nits batch into tooling; a flat finding list just re-ranks the work onto humans.',
          'The verdict line is not an approval: no run, no data, no tests seen — execution stays the final authority.',
        ],
      }),
      [
        [
          'Which element most improves an LLM code-review prompt?',
          [
            'Asking for "a thorough review"',
            'A ranked rubric, an evidence rule requiring cited lines, and a severity taxonomy with a NOT CHECKED slot',
            'Pasting the entire repository',
            'Requesting findings in prose paragraphs',
          ],
          1,
          'Unspecified dimensions yield popular trivial findings; ranked rubric plus evidence plus taxonomy makes output actionable and triable.',
        ],
        [
          'A review finding claims your new algorithm has a subtle ordering bug but cites no line and cannot produce a failing test. Correct handling:',
          [
            'Block the merge immediately',
            'Downgrade it to speculative by the proving-test contract, and verify ordering with a targeted test you run yourself',
            'Delete the review and rerun until it disappears',
            'Accept it — models are usually right about logic',
          ],
          1,
          'Claims that cannot be instantiated as tests are prose hypotheses; the run decides, not the phrasing.',
        ],
        [
          'What is model review genuinely strong at?',
          [
            'Proving novel algorithms correct',
            'Recall over a large catalogue of known anti-patterns — injection, leaks, unchecked access, API misuse — applied at diff speed',
            'Measuring runtime performance',
            'Verifying integration with systems it cannot see',
          ],
          1,
          'Pattern recall over training distribution is the real strength; proof and measurement need execution.',
        ],
        [
          'The NOT CHECKED section of a review output is meant to:',
          [
            'Pad the response',
            'Name explicitly what the reviewer could not verify (runtime, data, unseen tests) — converting blind spots into assigned human work',
            'List files the model disliked',
            'Replace running the test suite',
          ],
          1,
          'A named blind spot is actionable; silence is a false assurance. Honest limits are what make the rest of the findings trustworthy.',
        ],
      ]
    ),
  ],
};
