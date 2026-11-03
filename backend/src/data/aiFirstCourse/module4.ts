// AI.FIRST — Module 4 · VERIFY · Prompting & context engineering
import type { CourseModule } from '../db';
import { nineBlocks, diagram, table, tip, warn, code } from '../nineBlocks';
import { lesson, proofOfWork, M, COURSE_ID } from './helpers';

const ID = M(4);

export const module4: CourseModule = {
  id: ID,
  course_id: COURSE_ID,
  title: 'Module 4 — Prompting & Context Engineering',
  summary:
    'Pillar VERIFY. The anatomy of a strong prompt, examples and output formats, reasoning and decomposition, and context engineering — documents, memory and a tested prompt library.',
  sort_order: 4,
  lessons: [
    lesson(
      ID,
      'aif-m4-1',
      1,
      'The Anatomy of a Strong Prompt',
      'Role, task, context, constraints, format, and a definition of done — the six parts that turn a vague wish into a reliable instruction.',
      42,
      nineBlocks({
        objectives: [
          'Write prompts using the six-part skeleton: role, task, context, constraints, format, done-criteria',
          'Diagnose a weak prompt and name which part is missing',
          'Use system instructions versus user messages appropriately',
        ],
        hook:
          '"Write about climate change" gets you a bland 500-word essay that could be about anywhere. "You are a science journalist writing for Class 10 students in Chennai. In 300 words, explain how rising sea levels could affect the city by 2050, using two local examples, one statistic with its source, and ending with one thing a student can do" gets you something useful. The model did not get smarter between those two prompts. You gave it what it needed.',
        concept: `**A prompt is a brief for a very fast, very literal colleague** who knows a lot but knows nothing about *your* situation. Most bad outputs are under-specified prompts.

**The six-part skeleton**
1. **Role** — who should answer: "You are a placement mentor who has reviewed 500 engineering resumes." Roles set vocabulary, depth and standards.
2. **Task** — one clear verb: summarise, compare, draft, critique, extract, explain, plan.
3. **Context** — the facts only you know: audience, purpose, background, the document itself.
4. **Constraints** — length, tone, reading level, what to avoid, what sources to use, "do not invent figures".
5. **Format** — bullets, table with named columns, JSON, an email with subject line, a numbered plan.
6. **Done-criteria** — how you will judge it: "Must include three options with costs" or "Flag any claim you are unsure about."

**System vs user instructions.** Many tools separate a **system prompt** (standing instructions: role, rules, format — set once, applied to every turn) from **user messages** (the specific request). In custom assistants and API calls, put durable rules in the system prompt and the changing request in the user message.

**Clarity beats cleverness.** Plain, specific instructions outperform "magic words". Modern models respond well to direct requests; you rarely need tricks. Delimiters help when you paste material: put documents inside clear markers (triple quotes or XML-style tags such as <report>…</report>) so instructions and data do not blur.

**Ask it to ask.** For bigger tasks add: "Before you start, ask me up to three questions if anything important is unclear." This one line fixes many under-specified prompts.

**Iterate like an editor.** The first output is a draft. Say precisely what to change: "Shorter by half, keep the statistics, make the tone warmer, remove the second option." Vague feedback ("make it better") gets vague changes.`,
        extras: [
          diagram(
            'The six-part prompt skeleton',
            `flowchart LR
  R["Role<br/>who answers"] --> T["Task<br/>one clear verb"]
  T --> C["Context<br/>facts only you know"]
  C --> K["Constraints<br/>length · tone · sources · don'ts"]
  K --> F["Format<br/>table · bullets · JSON"]
  F --> D["Done-criteria<br/>how you will judge it"]
  D --> O["Output → you edit → iterate"]`
          ),
          table('Weak → strong', ['Weak prompt', 'Missing part', 'Strong version'], [
            ['"Make my resume better"', 'Role, context, done', '"As a campus recruiter for SDE roles, rewrite these 4 bullets with action verb + metric; keep each under 20 words; flag any bullet with no measurable result."'],
            ['"Explain recursion"', 'Audience, format', '"Explain recursion to a first-year student who knows loops, using one everyday analogy, one Python example under 10 lines, and one common mistake."'],
            ['"Summarise this"', 'Purpose, length, format', '"Summarise this 20-page tender for a manager deciding whether to bid: 5 bullets on scope, deadline, eligibility, penalties, and a go/no-go flag."'],
          ]),
          code(
            `ROLE: You are an experienced placement mentor for Indian engineering students.
TASK: Critique the resume summary below and rewrite it.
CONTEXT: The student is a final-year ECE student applying for embedded-systems roles.
<summary>
Hardworking and passionate student looking for opportunities to grow.
</summary>
CONSTRAINTS: Max 45 words. No clichés ("hardworking", "passionate").
Use only facts present in the student's projects listed here: [STM32 line-follower robot; IoT soil sensor with ESP32].
FORMAT: 1) Three problems with the original, as bullets. 2) The rewrite.
DONE WHEN: The rewrite names a target role, two concrete skills and one project.
If anything important is missing, ask me before rewriting.`,
            'prompt-skeleton.txt',
            'text'
          ),
        ],
        worked: {
          title: 'Rebuild a failing prompt',
          problem:
            'A student asks: "Give me notes on DBMS normalization." The output is generic and too long for revision. Rebuild it with the skeleton.',
          steps: [
            { title: 'Role', desc: '"You are a DBMS professor preparing students for a semester exam and placement interviews."' },
            { title: 'Task + context', desc: '"Create revision notes on normalization (1NF to BCNF) for a student who understands tables and keys but confuses 3NF and BCNF."' },
            { title: 'Constraints + format', desc: '"One page. For each normal form: one-line rule, a 4-row example table that violates it, and the fix. End with a 3NF vs BCNF comparison table."' },
            { title: 'Done-criteria', desc: '"Include two likely exam questions with model answers. Mark anything that varies across textbooks."' },
          ],
          solution:
            'The rebuilt prompt specifies audience, scope, structure and verification. The output becomes a revision sheet rather than a textbook chapter — and it is checkable.',
        },
        practice: {
          title: 'Skeleton drill',
          prompt:
            'Take three prompts you actually used this week. Rewrite each with all six parts. Run old and new versions and record, for each, which output you would actually use and why.',
          hint: 'Context and done-criteria are the parts people skip most often.',
        },
        mistakes: [
          {
            mistake: 'Hunting for magic phrases instead of giving context',
            fix: 'Specific context and clear done-criteria beat any trick phrase. Write the brief you would give a capable new colleague.',
          },
          {
            mistake: 'Mixing instructions and pasted material without separation',
            fix: 'Wrap pasted documents in clear delimiters so the model can tell data from instructions — this also reduces prompt-injection risk.',
          },
          {
            mistake: 'Accepting the first draft',
            fix: 'Iterate with precise edits. Prompting is a conversation with an editor\'s discipline.',
          },
        ],
        exam: {
          question: 'What makes a prompt effective? Give a framework.',
          answer:
            'An effective prompt gives a role, a single clear task, the context the model cannot know, constraints such as length, tone and sources, an explicit output format, and criteria for what a good answer must contain. Separate pasted material with delimiters, put standing rules in the system prompt, invite clarifying questions for complex tasks, and iterate with specific feedback.',
          source: 'Asked in almost every role that uses AI tools, from marketing to engineering.',
        },
        summary: [
          'Six parts: role, task, context, constraints, format, done-criteria.',
          'System prompt = standing rules; user message = this request.',
          'Delimit pasted material; invite clarifying questions.',
          'Iterate with precise edits, not "make it better".',
        ],
      }),
      [
        ['Which part of a prompt tells the model how you will judge the output?', ['Role', 'Done-criteria', 'Format', 'Task'], 1, 'Done-criteria define what a good answer must contain.'],
        ['Where should standing rules for every turn of a custom assistant go?', ['In each user message', 'In the system prompt', 'In the output', 'Nowhere'], 1, 'System prompts hold durable instructions.'],
        ['Why wrap a pasted document in delimiters?', ['To make it shorter', 'So the model can separate data from instructions', 'To encrypt it', 'It has no effect'], 1, 'Clear separation improves accuracy and reduces injection risk.'],
        ['"Make it better" is weak feedback because:', ['It is rude', 'It does not specify what to change', 'Models ignore feedback', 'It is too long'], 1, 'Precise edits produce precise changes.'],
      ]
    ),
    lesson(
      ID,
      'aif-m4-2',
      2,
      'Examples, Few-Shot and Output Formats',
      'Showing beats telling: choosing good examples, controlling format with templates and schemas, and avoiding the traps examples create.',
      42,
      nineBlocks({
        objectives: [
          'Use zero-shot, one-shot and few-shot prompting appropriately',
          'Choose examples that are varied, correct and representative',
          'Request structured outputs (tables, JSON) that a spreadsheet or program can use',
        ],
        hook:
          'A college office wants AI to tag 3,000 student emails as Fees, Exams, Hostel, Certificates or Other. With instructions alone, the model invents a sixth category called "Administrative" and tags half the inbox with it. Add five well-chosen example emails with their correct tags and accuracy jumps — and the invented category disappears. Examples are the most powerful lever most people never pull.',
        concept: `**Zero-shot** = instructions only. **One-shot** = one example. **Few-shot** = several examples (usually 2–8). Examples teach format, tone, granularity and edge cases faster than any description.

**Choosing good examples**
- **Varied** — cover different kinds of input, not five near-copies.
- **Representative** — match the real distribution; include the tricky cases (ambiguous emails, mixed languages, missing information).
- **Correct** — a wrong example is copied faithfully.
- **Balanced** — if four of five examples are "Fees", the model drifts towards "Fees".
- **Formatted exactly** as you want the output.

**Traps.** Models copy surface features: if every example is short, outputs get short; if all examples open with "Dear Sir", so will the output. Rotate examples, and test on inputs unlike the examples.

**Output formats that work downstream**
- **Tables** with named columns for human review.
- **JSON** for anything a program will read: give the exact keys and allowed values, and say "Return only JSON." Many APIs offer a **structured output / JSON schema mode** that guarantees valid JSON matching a schema — use it when available (Module 8).
- **Closed label sets**: list the allowed labels and add "If none fits, use Other — do not create new labels."
- **Reasons and confidence**: ask for a one-line reason and a confidence (high/medium/low) so humans can review the doubtful ones first.

**Template prompts.** For repeated tasks, write a template with placeholders — {email_text}, {course_name} — and fill them programmatically or by copy-paste. Templates make results consistent and testable, which is the bridge to the evaluation habit in Module 5.`,
        extras: [
          diagram(
            'Few-shot classification flow',
            `flowchart LR
  I["Instructions + closed label list"] --> X["5–8 varied, correct examples<br/>input → label + reason"]
  X --> N["New input"]
  N --> O["Output in fixed format<br/>label · reason · confidence"]
  O --> H{"Confidence low?"}
  H -->|"yes"| R["Human review queue"]
  H -->|"no"| S["Accepted → spreadsheet / system"]`
          ),
          code(
            `Classify each student email into exactly one label:
Fees | Exams | Hostel | Certificates | Other
If none fits, use Other. Never invent new labels.
Return JSON only: {"label": "...", "reason": "...", "confidence": "high|medium|low"}

Example 1
Email: "Sir my semester fee receipt not generated after UPI payment"
{"label": "Fees", "reason": "payment receipt issue", "confidence": "high"}

Example 2
Email: "When will revaluation results of 5th sem come?"
{"label": "Exams", "reason": "revaluation results", "confidence": "high"}

Example 3
Email: "Need bonafide certificate for passport, also my hostel room fan is broken"
{"label": "Certificates", "reason": "primary request is bonafide; hostel issue secondary", "confidence": "medium"}

Email: "{email_text}"`,
            'few-shot-classifier.txt',
            'text'
          ),
          tip(
            'Mixed-intent inputs need a rule',
            'Example 3 shows a two-topic email. Decide the rule (primary request wins, or allow two labels) and show it in an example — otherwise the model decides inconsistently.',
          ),
        ],
        worked: {
          title: 'Fix the drifting classifier',
          problem:
            'Your few-shot classifier labels 40% of emails "Fees" though only 20% are about fees. Your five examples were: Fees, Fees, Fees, Exams, Hostel. Diagnose and fix.',
          steps: [
            { title: 'Diagnose imbalance', desc: 'Three of five examples are Fees — the model learned that Fees is the default.' },
            { title: 'Rebalance', desc: 'Use one or two examples per label, including Certificates and Other.' },
            { title: 'Add hard cases', desc: 'Include a mixed-intent email and a Hinglish email with the correct label.' },
            { title: 'Measure', desc: 'Hand-label 50 real emails; compare model labels; compute accuracy per label before and after.' },
          ],
          solution:
            'Balanced, varied examples plus a measured check fixed the drift. Without the 50 hand-labelled emails you would not have known the classifier was wrong.',
        },
        practice: {
          title: 'Build a few-shot extractor',
          prompt:
            'Choose a repetitive task (extracting dates and amounts from bills, tagging feedback comments, converting notes to a table). Write a zero-shot prompt and a few-shot prompt with 4 varied examples. Test both on 10 new inputs and count errors.',
          hint: 'Include at least one example where information is missing and show the expected output (for example null).',
        },
        mistakes: [
          {
            mistake: 'Using near-identical examples',
            fix: 'Vary length, wording, language mix and difficulty so the model learns the rule, not the surface.',
          },
          {
            mistake: 'Leaving the label set open',
            fix: 'List allowed labels and give an explicit fallback; otherwise the model invents categories.',
          },
          {
            mistake: 'Asking for JSON and parsing it blindly',
            fix: 'Use schema/structured-output modes where available and validate every response in code.',
          },
        ],
        exam: {
          question: 'When would you use few-shot prompting, and how do you choose the examples?',
          answer:
            'Use few-shot when the task has a specific format, label set or judgement style that is easier to show than describe — classification, extraction, tone matching. Choose a small set of varied, correct, balanced examples that match real inputs and include hard and edge cases, formatted exactly as the desired output. Then test on inputs unlike the examples to make sure the model learned the rule rather than copying surface features.',
          source: 'Common in AI-ops, data and product interviews.',
        },
        summary: [
          'Zero-, one-, few-shot: examples teach format and judgement fast.',
          'Good examples are varied, representative, correct and balanced.',
          'Closed label sets + fallback stop invented categories.',
          'Ask for structured output; validate it; review low-confidence items first.',
        ],
      }),
      [
        ['Few-shot prompting means:', ['Running the prompt a few times', 'Including several worked examples of input and desired output in the prompt', 'Using a small model', 'Limiting output length'], 1, 'Examples demonstrate the task.'],
        ['Four of your five examples have the label "Fees". The likely effect is:', ['Better accuracy', 'The model over-predicts "Fees"', 'No effect', 'The model refuses'], 1, 'Imbalanced examples bias outputs.'],
        ['To stop a classifier inventing new categories you should:', ['Raise temperature', 'List the allowed labels and give an explicit fallback such as "Other"', 'Remove examples', 'Ask for longer answers'], 1, 'Closed sets with a fallback.'],
        ['For output a program will read, the safest approach is:', ['Free text', 'JSON with defined keys, ideally via a schema mode, validated in code', 'A paragraph', 'A screenshot'], 1, 'Structure + validation.'],
      ]
    ),
    lesson(
      ID,
      'aif-m4-3',
      3,
      'Reasoning Prompts and Decomposition',
      'Step-by-step reasoning, breaking big tasks into chains, self-checking and critique loops — and when they help.',
      42,
      nineBlocks({
        objectives: [
          'Use step-by-step and plan-first prompting for multi-step problems',
          'Decompose a large task into a chain of smaller, checkable prompts',
          'Use critique-and-revise loops while knowing their limits',
        ],
        hook:
          'Ask for "a complete marketing plan for our college fest" in one prompt and you get a generic plan. Ask first for the audience analysis, then — using that — the message, then the channel plan with budget, then a critique of the whole plan against your ₹40,000 budget, and you get something you could actually execute. Same model, same afternoon. The difference is decomposition.',
        concept: `**Step-by-step reasoning.** Asking a model to work through a problem in steps before answering ("Think it through step by step, then give the final answer on the last line") improves results on multi-step maths, logic and analysis for many models — because each written step becomes context for the next prediction. **Reasoning models** (Module 3) do this internally; with them, you usually just state the problem clearly and let them think. For ordinary chat models, explicit step-by-step prompts still help.

**Plan first.** For long outputs: "First write an outline and wait for my approval." You catch structural problems before paying for 3,000 words.

**Decomposition / prompt chaining.** Break a big task into stages, each with its own prompt and checkable output:
1. Extract → 2. Analyse → 3. Draft → 4. Critique → 5. Revise.
Each stage is easier, can use the best model and settings for its job, and can be inspected. Errors are caught between stages instead of being buried in a wall of text.

**Self-critique and revise.** "Review your answer against these criteria: … List problems, then produce a corrected version." This often catches omissions and format errors. Its limit: a model checking itself shares its own blind spots — it may not catch a fact it is confidently wrong about. For facts, check against a source (Module 5), use a different model as reviewer, or run code/tests.

**Multiple attempts.** For hard questions, generating several independent answers and comparing them (self-consistency) surfaces uncertainty: if three attempts disagree, the question needs checking.

**Know when not to.** Simple tasks do not need chains. Over-engineering adds cost, latency and new places for errors.`,
        extras: [
          diagram(
            'A five-stage prompt chain',
            `flowchart LR
  A["1 · Extract<br/>facts from sources"] --> B["2 · Analyse<br/>options & constraints"]
  B --> C["3 · Draft<br/>the deliverable"]
  C --> D["4 · Critique<br/>against criteria"]
  D --> E["5 · Revise<br/>fix listed issues"]
  D -.->|"facts in doubt"| V["Verify with a source / code / second model"]
  V -.-> E
  A -.->|"you check"| H1["Human check"]
  C -.->|"you check"| H1`
          ),
          table('Technique → when it helps', ['Technique', 'Helps with', 'Limit'], [
            ['Step-by-step', 'Multi-step maths, logic, analysis', 'Little gain on simple tasks; built in for reasoning models'],
            ['Plan first', 'Long documents, code, projects', 'Adds one round-trip'],
            ['Prompt chaining', 'Complex deliverables, pipelines', 'More calls and orchestration'],
            ['Self-critique', 'Omissions, format, tone', 'Shares the model\'s own blind spots on facts'],
            ['Multiple attempts', 'Detecting uncertainty', 'Costs N× tokens'],
          ]),
          warn(
            'A model grading itself is not verification',
            'Self-critique improves drafts. It does not prove correctness. Facts need sources; code needs tests; numbers need recalculation.',
          ),
        ],
        worked: {
          title: 'Chain the college-fest plan',
          problem:
            'Budget ₹40,000, 1,500 expected attendees, 3 weeks to go. Design a prompt chain that produces an executable promotion plan.',
          steps: [
            { title: 'Stage 1 — Audience', desc: '"List the 3 main audience segments for a tech-cultural fest at an engineering college in Jaipur, with what each cares about and where they spend attention." You check and correct.' },
            { title: 'Stage 2 — Message', desc: '"Using these segments, propose one core message and one hook per segment."' },
            { title: 'Stage 3 — Channels + budget', desc: '"Allocate ₹40,000 across channels for 3 weeks in a table: channel, segment, cost, expected reach, owner, deadline."' },
            { title: 'Stage 4 — Critique', desc: '"Critique the plan: is the budget arithmetic correct, any segment unreached, any deadline unrealistic? List issues."' },
            { title: 'Stage 5 — Revise and verify', desc: '"Fix the issues." Then you re-add the budget column yourself and confirm vendor prices with real quotes.' },
          ],
          solution:
            'Five checkable stages produced a plan grounded in your context. The human checks after stages 1 and 5 — plus real vendor quotes — are what make it executable.',
        },
        practice: {
          title: 'Decompose your own task',
          prompt:
            'Choose a substantial task (a project report section, a study plan for a subject, a small business plan). Write it as a 4–5 stage chain. Run it, and record one error caught between stages that a single prompt would have hidden.',
          hint: 'The most valuable checks are after extraction (are the facts right?) and after drafting (does it meet the criteria?).',
        },
        mistakes: [
          {
            mistake: 'One giant prompt for a complex deliverable',
            fix: 'Chain it. Smaller stages are easier for the model and easier for you to inspect.',
          },
          {
            mistake: 'Treating "check your work" as proof',
            fix: 'Self-checks catch format and omission errors. Verify facts and numbers externally.',
          },
        ],
        exam: {
          question: 'What is prompt chaining and why use it instead of one long prompt?',
          answer:
            'Prompt chaining splits a complex task into a sequence of smaller prompts — for example extract, analyse, draft, critique, revise — where each output feeds the next. It improves quality because each step is simpler and focused, lets you use different models or settings per step, and creates checkpoints where a human or code can verify intermediate results before errors compound.',
          source: 'Common in AI-engineering and AI-ops interviews.',
        },
        summary: [
          'Step-by-step helps chat models on multi-step problems; reasoning models do it internally.',
          'Plan first for long outputs.',
          'Chain: extract → analyse → draft → critique → revise, with human checks.',
          'Self-critique improves drafts but is not verification.',
        ],
      }),
      [
        ['Prompt chaining means:', ['Repeating the same prompt', 'Splitting a complex task into sequential prompts where each output feeds the next', 'Linking two accounts', 'Using a blockchain'], 1, 'Stages make work simpler and checkable.'],
        ['Self-critique by the same model is limited because:', ['It is too slow', 'It shares the model\'s own blind spots, especially on facts', 'Models cannot read their output', 'It always makes answers worse'], 1, 'External verification is still needed.'],
        ['With a dedicated reasoning model, you usually should:', ['Add long "think step by step" scaffolding', 'State the problem clearly and let it reason', 'Use temperature 2', 'Avoid giving context'], 1, 'Reasoning is built in.'],
        ['Three independent attempts at a hard question give three different answers. This suggests:', ['The model is broken', 'The answer is uncertain and needs verification', 'Pick the longest', 'Pick the first'], 1, 'Disagreement is a useful uncertainty signal.'],
      ]
    ),
    lesson(
      ID,
      'aif-m4-4',
      4,
      'Context Engineering: Documents, Memory and a Prompt Library',
      'What goes into the context window decides the answer. Curating documents, managing long chats and memory, and building a tested prompt library.',
      44,
      nineBlocks({
        objectives: [
          'Curate the context a model receives: relevant documents, instructions placement, length budget',
          'Manage long conversations, memory features and project/workspace knowledge safely',
          'Build and version a personal prompt library with tested prompts',
        ],
        hook:
          'Two students ask the same assistant to prepare them for a viva on their final-year project. One pastes nothing and gets generic questions. The other attaches the project report, the guide\'s feedback email and last year\'s viva questions from seniors — and gets a mock viva that feels uncomfortably real. "Prompt engineering" was the 2023 skill. By 2026 the skill that separates professionals is **context engineering**: deciding exactly what the model sees.',
        concept: `**Context engineering** = designing everything in the context window: system instructions, the user's request, retrieved documents, examples, conversation history, tool results and memory. The model can only be as good as what it sees.

**Curate documents**
- **Relevant, not everything** — 3 right pages beat 300 mixed ones; irrelevant text dilutes attention and costs tokens.
- **Clean** — remove headers, footers and boilerplate; keep tables as tables.
- **Labelled** — wrap each source: <source id="policy-2026">…</source>, so answers can cite them.
- **Ordered** — long documents first, instructions and question last.

**Long conversations drift.** Over many turns, early instructions fade or are truncated; errors from earlier turns get reused. Professional habits: start a **fresh chat for a new task**; when a chat gets long, ask for a **summary of decisions so far** and start a new chat with that summary; restate key constraints when they matter.

**Memory and projects.** Many assistants now offer persistent **memory** (facts about you remembered across chats) and **projects/workspaces** (a set of files and instructions shared by every chat inside). They are powerful for repeated work — and a privacy surface: review what is remembered, turn memory off for sensitive work, and never store passwords, IDs or other people's personal data (Module 10).

**A personal prompt library** turns one-off luck into a reusable asset:
- One entry per recurring task: name, purpose, the prompt template with {placeholders}, which model/settings, an example input and a good output, known failure modes, last tested date.
- **Version it** — when you improve a prompt, keep the old one and note what changed and why.
- **Test it** — keep 5 test inputs per prompt and re-run them when you switch models.

This is the habit that makes your AI use *reliable* rather than impressive-once.`,
        extras: [
          diagram(
            'What goes into the context window',
            `flowchart TB
  subgraph CW["Context window — everything the model sees"]
    S["System instructions<br/>role · rules · format"]
    M["Memory / project knowledge"]
    D["Retrieved or attached documents<br/>labelled sources"]
    E["Examples"]
    H["Conversation history<br/>summarised when long"]
    T["Tool results"]
    Q["Your request — placed last"]
  end
  CW --> A["Answer: only as good as this context"]`
          ),
          table('Prompt-library entry template', ['Field', 'Example'], [
            ['Name', 'Viva mock examiner'],
            ['Purpose', 'Simulate a final-year project viva with follow-up questions'],
            ['Template', 'You are a strict external examiner… Report: <report>{report}</report> Ask one question at a time…'],
            ['Model / settings', 'Reasoning model, default settings'],
            ['Test inputs', '5 past project reports'],
            ['Known failures', 'Drifts into lecturing after 10 turns — restate "one question at a time"'],
            ['Version / tested', 'v3 · 2026-11-01'],
          ]),
          tip(
            'Summarise-and-restart',
            'When a chat passes ~30 turns or starts contradicting itself, ask: "Summarise the decisions, constraints and open questions so far in under 200 words." Paste that into a new chat. Quality usually jumps.',
          ),
          proofOfWork(
            4,
            'The tested prompt library',
            'Build a library of 10 prompts for your recurring study or work tasks using the entry template. Test each on 3 inputs; record one improvement you made and why.',
            'Store 10 prompt templates as files in a Git repo with placeholders, plus a small script that runs each template on its 5 test inputs and saves outputs for comparison.',
            'Create a team prompt library for 10 recurring team tasks with owners, approved data types (what may and may not be pasted) and a review cadence.',
            'Before/after evidence for at least three prompts, version notes, and test inputs. A list of untested prompts copied from the internet scores zero.'
          ),
        ],
        worked: {
          title: 'Engineer the viva-prep context',
          problem:
            'Design the full context for a mock-viva assistant for a final-year student.',
          steps: [
            { title: 'System instructions', desc: '"You are a strict but fair external examiner for a B.Tech final-year project viva. Ask one question at a time, wait for my answer, then give a 1–10 score with one-line feedback and a follow-up question."' },
            { title: 'Documents', desc: 'The project report (cleaned), the guide\'s feedback email and a list of seniors\' viva questions — each wrapped in labelled tags.' },
            { title: 'Constraints', desc: '"Prioritise questions on design choices, testing and limitations. After 10 questions, give a summary of my three weakest areas with page references to my report."' },
            { title: 'Hygiene', desc: 'Use a fresh chat per session; no personal data beyond the report; memory off if the report is confidential.' },
          ],
          solution:
            'The answer quality comes from the curated context: role, the student\'s own documents, the examiner\'s rules and a defined end-state. The same model without that context produces generic questions.',
        },
        practice: {
          title: 'Context audit',
          prompt:
            'Take one recent long AI chat that went badly. List everything that was in its context (instructions, files, history). Identify what was missing, what was irrelevant, and where key instructions sat. Rebuild it as a fresh chat with curated context and compare.',
          hint: 'Look for early instructions that were contradicted later and for pasted material without labels.',
        },
        mistakes: [
          {
            mistake: 'Pasting entire documents "just in case"',
            fix: 'Select the relevant sections. Irrelevant context dilutes attention, costs tokens and increases confusion.',
          },
          {
            mistake: 'Continuing one chat for days across unrelated tasks',
            fix: 'New task → new chat. Carry over only a short summary of decisions.',
          },
          {
            mistake: 'Leaving memory on while working with confidential material',
            fix: 'Review and control memory; use temporary or private modes for sensitive work, and follow your organisation\'s policy.',
          },
        ],
        exam: {
          question: 'What is context engineering and why has it become more important than prompt wording?',
          answer:
            'Context engineering is designing everything the model sees in its context window — system instructions, retrieved documents, examples, conversation history, tool results and memory — not just the wording of the request. As models got better at following plain instructions, quality became limited mainly by whether the right, clean, well-labelled information is present and well placed, so curating context now drives most of the gains.',
          source: 'A 2025–2026 favourite in AI-engineering interviews.',
        },
        summary: [
          'The model can only use what is in its context — curate it.',
          'Relevant, clean, labelled sources; instructions and question last.',
          'Long chats drift: summarise and restart; manage memory deliberately.',
          'A versioned, tested prompt library makes AI use reliable.',
        ],
      }),
      [
        ['Context engineering is mainly about:', ['Choosing fonts', 'Designing everything the model sees: instructions, documents, examples, history, tool results', 'Buying more GPUs', 'Writing shorter prompts'], 1, 'What the model sees decides what it can do.'],
        ['A chat has run 60 turns and the model now contradicts early instructions. Best fix:', ['Keep going', 'Summarise decisions and constraints, then start a fresh chat with that summary', 'Raise temperature', 'Delete the account'], 1, 'Summarise-and-restart.'],
        ['Why label sources in context with ids?', ['To look neat', 'So answers can cite which source each claim came from', 'To reduce cost', 'Models require it'], 1, 'Labels enable citation and checking.'],
        ['A good prompt-library entry includes:', ['Only the prompt text', 'Template, purpose, model/settings, test inputs, known failures and version', 'The model\'s weights', 'Nothing — just remember it'], 1, 'Tested and versioned entries are reusable.'],
      ]
    ),
  ],
};
