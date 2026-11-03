// AI.FIRST — Module 12 · ANSWER FOR IT · AI at work & your defence (capstone)
import type { CourseModule } from '../db';
import { nineBlocks, diagram, table, tip, warn } from '../nineBlocks';
import { lesson, proofOfWork, M, COURSE_ID } from './helpers';

const ID = M(12);

export const module12: CourseModule = {
  id: ID,
  course_id: COURSE_ID,
  title: 'Module 12 — AI at Work & Your Defence',
  summary:
    'The capstone. AI and jobs as tasks not titles, building an AI-first portfolio from your twelve proofs of work, AI interview rounds, and the defence: presenting your capstone and answering for every claim in it.',
  sort_order: 12,
  lessons: [
    lesson(
      ID,
      'aif-m12-1',
      1,
      'AI and Jobs: Tasks, Not Titles',
      'How AI actually changes work: task-level exposure, augmentation versus automation, the skills that compound, and a personal plan.',
      42,
      nineBlocks({
        objectives: [
          'Analyse a job as a bundle of tasks and estimate AI exposure task by task',
          'Distinguish automation, augmentation and new work created by AI',
          'Write a personal 12-month AI skills plan for your target role',
        ],
        hook:
          '"Will AI take my job?" is the wrong question, and the people who keep asking it tend to fall behind. A better question: "Which tasks in my job will AI do, which will it help me do better, and which new tasks will appear?" A junior analyst who spent 60% of her week cleaning data and formatting reports now spends 15% on that and 45% on analysis, stakeholder questions and checking AI output. Her title did not change. Her job did — and she was promoted for adapting first.',
        concept: `**Jobs are bundles of tasks.** Research on AI and work (from labour economists, the OECD, the World Economic Forum, the ILO and AI labs\' own usage studies) increasingly measures exposure at the **task** level. Few whole jobs disappear quickly; many jobs change shape as some tasks are automated and others become more valuable.

**Three effects**
- **Automation** — the task is largely done by AI: first drafts of routine documents, basic code, data entry, simple translation, standard customer queries.
- **Augmentation** — a person plus AI does the task better or faster: analysis, research, design, teaching, debugging, diagnosis support.
- **New work** — tasks that did not exist: evaluating AI outputs, designing AI workflows, AI governance, prompt and context design, AI-product management, training data curation, red-teaming.

**What tends to become more valuable**
- **Judgement and verification** — knowing when output is right (Module 5).
- **Problem framing** — turning a messy goal into a well-specified task.
- **Domain expertise** — AI is most useful in the hands of someone who knows the field.
- **Communication and trust** — explaining, persuading, taking responsibility.
- **Building with AI** — workflows, apps, agents (Modules 7–9).
- **Responsible use** — privacy, fairness, security (Modules 10–11).

**Honest caveats**: effects differ by sector, country and seniority; entry-level tasks are among the most exposed, which makes early-career adaptation urgent; predictions about timelines vary widely and should be read sceptically (Module 1). Your best response is not prediction but **practice** — becoming the person in your team who uses AI well and safely.

**A personal plan**: pick a target role → list its 10–15 core tasks → mark each automate / augment / human → choose 3 AI skills to build → schedule proofs of work → review every quarter.`,
        extras: [
          diagram(
            'Task-level analysis of a role',
            `flowchart LR
  R["Target role"] --> T["List 10–15 core tasks"]
  T --> C{"For each task"}
  C -->|"AI does most of it"| AU["Automate → you verify & own"]
  C -->|"AI makes you better"| AG["Augment → learn the workflow"]
  C -->|"human core"| HU["Judgement · relationships · accountability"]
  AU --> P["Your 12-month plan:<br/>3 skills · proofs of work · quarterly review"]
  AG --> P
  HU --> P`
          ),
          table('Example: junior data analyst', ['Task', 'Effect', 'What you do now'], [
            ['Cleaning and reshaping data', 'Largely automated', 'Specify, check profiles, own cleaning decisions'],
            ['Writing SQL queries', 'Augmented', 'Draft with AI, verify results, optimise'],
            ['Building dashboards', 'Augmented', 'Design for decisions; AI builds drafts'],
            ['Explaining findings to managers', 'Human core, augmented', 'Your judgement and communication'],
            ['Checking AI-generated analyses', 'New task', 'Sanity checks, confounders, documentation'],
          ]),
          tip(
            'Become the multiplier',
            'In most teams, the most valuable person is not the one who uses AI the most but the one who helps everyone use it well — shared prompts, safe workflows, honest evaluations.',
          ),
        ],
        worked: {
          title: 'Task analysis for a placement-bound ECE student',
          problem:
            'Target role: embedded software engineer. Build the task analysis and a 12-month plan.',
          steps: [
            { title: 'Tasks', desc: 'Reading datasheets; writing drivers; debugging hardware/software issues; writing tests; code review; documentation; talking to hardware teams; meeting real-time and safety constraints.' },
            { title: 'Mark effects', desc: 'Datasheet summarising and documentation: augmented. Boilerplate drivers and tests: partly automated, verify heavily. Hardware debugging, timing and safety: human core with AI help. Cross-team communication: human core.' },
            { title: 'Pick 3 skills', desc: '(1) AI-assisted coding with tests and review; (2) using AI to read datasheets with verification against the source; (3) a small agentic test harness for a microcontroller project.' },
            { title: 'Schedule proofs', desc: 'Quarterly: one GitHub project with an AI-use log and tests; a write-up of one bug where AI was wrong and how it was caught.' },
          ],
          solution:
            'The plan targets augmentation and verification skills inside the student\'s own field — far more credible to employers than generic "knows ChatGPT" claims.',
        },
        practice: {
          title: 'Your task map',
          prompt:
            'Pick your target role. Using real job postings, list 12 core tasks, mark each automate / augment / human core, choose three AI skills to build, and write a 12-month plan with one proof of work per quarter.',
          hint: 'Read 5 current postings for the role and copy the verbs — that is your task list.',
        },
        mistakes: [
          {
            mistake: 'Thinking in whole-job replacement',
            fix: 'Analyse tasks. That is how both risk and opportunity actually show up.',
          },
          {
            mistake: 'Generic AI skills unrelated to your field',
            fix: 'AI skills compound with domain expertise; build them inside your target work.',
          },
        ],
        exam: {
          question: 'How do you think AI will change the role you are applying for, and how are you preparing?',
          answer:
            'A strong answer analyses the role as tasks: which are being automated (and how you verify and own them), which are augmented (and the workflows you have practised), and which stay human — judgement, relationships, accountability. Then give evidence of preparation: specific AI-assisted projects with evaluations, a habit of verification, and responsible-use awareness — plus one example where AI was wrong and you caught it.',
          source: 'Now a standard question in campus and lateral interviews.',
        },
        summary: [
          'Jobs are bundles of tasks; exposure is task-level.',
          'Automation, augmentation and new work all happen at once.',
          'Judgement, framing, domain depth, communication, building and responsibility compound.',
          'Plan: tasks → effects → 3 skills → quarterly proofs.',
        ],
      }),
      [
        ['The most useful unit for analysing AI\'s effect on work is:', ['Job title', 'Individual tasks within a job', 'Salary', 'Company size'], 1, 'Exposure is measured task by task.'],
        ['"Augmentation" means:', ['AI fully replaces the task', 'A person plus AI does the task better or faster', 'A salary increase', 'Hiring more people'], 1, 'Human + AI together.'],
        ['Which is an example of new work created by AI?', ['Manual data entry', 'Evaluating and red-teaming AI systems', 'Typing letters', 'Filing paper records'], 1, 'Evaluation and governance roles are new.'],
        ['The strongest way to show AI readiness to employers is:', ['Listing "ChatGPT" as a skill', 'Domain-relevant AI projects with evaluations and verification examples', 'A certificate alone', 'Many followers'], 1, 'Evidence beats claims.'],
      ]
    ),
    lesson(
      ID,
      'aif-m12-2',
      2,
      'Building Your AI-First Portfolio',
      'Turn twelve proofs of work into a portfolio that proves understanding, verification, building and responsibility — structure, evidence and presentation.',
      42,
      nineBlocks({
        objectives: [
          'Assemble your twelve proofs of work into a coherent portfolio',
          'Present each piece with problem, approach, evidence, failures and learning',
          'Choose the three pieces to feature for your target role',
        ],
        hook:
          'Two candidates list "Generative AI" on their résumés. One links to a certificate. The other links to a one-page portfolio: a model-selection memo with real cost arithmetic, a deployed app with an evaluation table that shows exactly where it fails, a red-team report that found a privacy leak in her own build — and fixed it. The interviewer spends the whole round on the second candidate\'s work. A portfolio converts claims into conversation.',
        concept: `**Your raw material.** Across this course you produced twelve proofs of work (PoW-01 to PoW-12), one per module, in your pathway\'s variant: the AI audit, the token lab, the model-selection memo, the prompt library, the verification log and eval, the analysis report, the automation, the mini-app, the agent spec, the impact assessment, the red-team report and — next lesson — the capstone defence.

**Portfolio structure**
1. **Header** — name, target role, pathway (Explorer, Builder or Leader), one-line positioning ("I build AI workflows that are evaluated and safe").
2. **Featured work (3 pieces)** — the strongest and most role-relevant, each with a case-study card.
3. **The full set (12)** — a table: title, pillar, one-line result, link.
4. **How I work with AI** — your verification habits, privacy rules and disclosure practice in five bullets.
5. **Contact and links** — GitHub, LinkedIn, live demos.

**The case-study card (for each featured piece)**
- **Problem and user** — who needed what.
- **Approach** — tools, models, design decisions and why.
- **Evidence** — evaluation results, costs, before/after, screenshots.
- **Failures and fixes** — what went wrong and how you found it. This is what makes a portfolio credible.
- **Responsibility** — data handled, risks considered, guardrails.
- **What I would do next**.

**Pick features by role**: an analyst features PoW-06 (analysis), PoW-05 (eval) and PoW-03 (selection memo); a developer PoW-08 (app), PoW-09 (agent) and PoW-11 (red-team); a manager or policy role PoW-10 (impact assessment), PoW-07 (automation governance) and PoW-03.

**Hosting**: a GitHub profile README, a simple personal site, a Notion or Google Sites page — whatever loads fast and is public. Remove personal data and anything confidential from every artefact; anonymise employer or college data.`,
        extras: [
          diagram(
            'From twelve proofs to a portfolio',
            `flowchart TB
  subgraph U["UNDERSTAND"]
    p1["PoW-01 AI audit"]; p2["PoW-02 Token lab"]; p3["PoW-03 Model memo"]
  end
  subgraph V["VERIFY"]
    p4["PoW-04 Prompt library"]; p5["PoW-05 Verification + eval"]; p6["PoW-06 Analysis report"]
  end
  subgraph B["BUILD"]
    p7["PoW-07 Automation"]; p8["PoW-08 Mini-app"]; p9["PoW-09 Agent spec"]
  end
  subgraph A["ANSWER FOR IT"]
    p10["PoW-10 Impact assessment"]; p11["PoW-11 Red-team report"]; p12["PoW-12 Capstone defence"]
  end
  U --> F["Pick 3 featured for your role"]
  V --> F
  B --> F
  A --> F
  F --> PF["Portfolio page: header · 3 case studies · full table · how I work with AI"]`
          ),
          table('Case-study card — example (PoW-08)', ['Field', 'Content'], [
            ['Problem & user', 'Classmates spend 40 min formatting each lab report'],
            ['Approach', 'Streamlit app, small model, versioned prompt, value-accuracy check'],
            ['Evidence', '25-case eval: 100% values preserved, 92% format compliance; ₹0.03 per report'],
            ['Failure & fix', 'Early version rounded 3.456 to 3.46 — added a check that every number in the output exists in the input'],
            ['Responsibility', 'No notes stored beyond 7 days; disclosure banner; spend cap'],
            ['Next', 'Support handwritten-note photos with OCR and a confidence flag'],
          ]),
          warn(
            'Scrub before you publish',
            'Remove names, roll numbers, phone numbers, client details, API keys and internal documents from every portfolio artefact. A portfolio that leaks data disqualifies you.',
          ),
        ],
        worked: {
          title: 'Choose and polish three features',
          problem:
            'A Builder-pathway student targets "AI engineer — internship". They have all twelve proofs; the strongest are PoW-08 (deployed app), PoW-11 (red-team) and PoW-03 (model memo). Plan the portfolio.',
          steps: [
            { title: 'Feature 1 — PoW-08', desc: 'Live link, architecture diagram, eval table, cost per 1,000 requests, the rounding bug story.' },
            { title: 'Feature 2 — PoW-11', desc: 'The privacy leak found in their own app (a debug log echoing user input), the fix, and the regression tests added.' },
            { title: 'Feature 3 — PoW-03', desc: 'Routing decision with real arithmetic: 78% cost cut at equal quality on 30 examples.' },
            { title: 'The rest', desc: 'All twelve in a table with one-line results; "How I work with AI" bullets; links.' },
          ],
          solution:
            'Three features that show building, security and judgement — each with evidence and an honest failure. That combination is rare, and it is exactly what interviewers probe.',
        },
        practice: {
          title: 'Draft your portfolio page',
          prompt:
            'Create your portfolio page with the five-part structure. Write full case-study cards for your three featured proofs and the one-line table for all twelve. Ask one peer to review it and note the first question they ask.',
          hint: 'The first question a reviewer asks is usually the one an interviewer will ask — prepare its answer.',
        },
        mistakes: [
          {
            mistake: 'Showing only polished successes',
            fix: 'Include failures and fixes; they prove the work is real and that you verify.',
          },
          {
            mistake: 'Generic positioning ("AI enthusiast")',
            fix: 'State what you do and for whom, backed by the featured work.',
          },
          {
            mistake: 'Publishing artefacts with personal or confidential data',
            fix: 'Anonymise and scrub everything before it goes public.',
          },
        ],
        exam: {
          question: 'Walk me through one project in your portfolio.',
          answer:
            'Use the case-study card: the problem and who it was for; the approach and the key decisions with reasons; the evidence — evaluation numbers, costs, before and after; the failure you found and how you found and fixed it; how you handled data and risk; and what you would do next. Keep it to about two minutes and invite a deep-dive question.',
          source: 'The single most predictable interview question — rehearse it for all three featured pieces.',
        },
        summary: [
          'Twelve proofs of work → three featured case studies + the full table.',
          'Case-study card: problem, approach, evidence, failures & fixes, responsibility, next.',
          'Feature by target role.',
          'Scrub personal and confidential data before publishing.',
        ],
      }),
      [
        ['The most credibility-building element of a portfolio case study is:', ['A long tool list', 'Evidence plus an honest failure and how it was fixed', 'Fancy design', 'The number of pages'], 1, 'Failures and fixes prove real work.'],
        ['How many featured pieces does the recommended structure use?', ['One', 'Three, chosen for the target role', 'All twelve equally', 'None'], 1, 'Three strong, role-relevant features.'],
        ['Before publishing a portfolio artefact you must:', ['Add more colours', 'Remove personal data, confidential details and secrets', 'Make it longer', 'Add a watermark'], 1, 'Scrub everything.'],
        ['For an analyst role, which proofs are most relevant to feature?', ['Only the token lab', 'Analysis report, verification/eval and model-selection memo', 'Only the agent spec', 'None'], 1, 'Match features to the role.'],
      ]
    ),
    lesson(
      ID,
      'aif-m12-3',
      3,
      'AI Interviews: Questions, Case Rounds and Explaining Your Work',
      'What AI-literate interviews ask in 2026, how to structure answers, how case rounds work, and how to talk about using AI honestly.',
      42,
      nineBlocks({
        objectives: [
          'Answer the core AI-literacy questions with structure and evidence',
          'Work through an AI case round: clarify, design, evaluate, risk, cost',
          'Talk about your own AI use honestly, including in take-home and live coding rounds',
        ],
        hook:
          'Interviewers have learned that almost every candidate says they "use AI daily". So the questions changed. "When was AI wrong for you, and how did you know?" "Design an AI feature for our support team — what would you measure?" "Our policy forbids pasting client data into AI. How would you still use it on this project?" These questions cannot be answered by memorising definitions. They can be answered easily by anyone who did the work in this course.',
        concept: `**Five question families (and the module that prepares each)**
1. **Concepts** — "Explain how an LLM works / why it hallucinates / RAG vs fine-tuning." (Modules 1–3, 8.) Answer in plain language, with one example, under a minute.
2. **Verification** — "How do you check AI output?" "Tell me about a time AI was wrong." (Module 5.) Use a real story: claim, check, finding, fix.
3. **Design cases** — "Design an AI assistant for X." (Modules 7–9.) Use a structure (below).
4. **Responsibility** — privacy, bias, security, policy scenarios. (Modules 10–11.)
5. **Your work** — portfolio deep-dives. (Module 12.2.)

**The STAR-V answer** for experience questions: **S**ituation, **T**ask, **A**ction, **R**esult — plus **V**erification: how you knew the result was right. The V is what separates AI-literate answers.

**The AI case-round structure (CLEAR)**
- **C — Clarify**: users, goal, success metric, constraints (data rules, budget, latency, languages).
- **L — Lay out the design**: workflow vs agent; model choice; prompts/context; retrieval or tools; human checkpoints.
- **E — Evaluate**: golden set, metrics per category, launch bar, monitoring.
- **A — Address risks**: hallucination, privacy, bias, injection, misuse — with specific controls.
- **R — Run the numbers**: cost per request and per month; routing; rollout plan.

**Talking about your AI use honestly**
- Follow the interview\'s rules: some live rounds forbid AI, some take-homes allow it with disclosure, some expect it. Ask if unclear.
- Say what you used it for and how you verified: "I used an assistant to scaffold the tests and then reviewed every diff; it suggested an outdated API, which I caught when tests failed."
- Never claim AI-written work as solely your own if asked directly — and be able to explain every line or claim regardless.`,
        extras: [
          diagram(
            'CLEAR — the AI case-round structure',
            `flowchart LR
  C["Clarify<br/>users · goal · metric · constraints"] --> L["Lay out design<br/>workflow/agent · model · context · tools · humans"]
  L --> E["Evaluate<br/>golden set · launch bar · monitoring"]
  E --> A["Address risks<br/>hallucination · privacy · bias · injection"]
  A --> R["Run the numbers<br/>cost · routing · rollout"]`
          ),
          table('Core questions — one-line answer spines', ['Question', 'Spine of a strong answer'], [
            ['Why do LLMs hallucinate?', 'Trained for plausibility; rare/stale/missing info; ground, cite, abstain, verify'],
            ['RAG or fine-tuning?', 'RAG for facts that change; fine-tuning for style/format/narrow skills'],
            ['How do you evaluate an LLM feature?', 'Golden set incl. refusals, rubric/judge calibrated, per-category, regression'],
            ['How do you keep an agent safe?', 'Least privilege, sandbox, confirmations, limits, untrusted content, logs'],
            ['Tell me when AI was wrong', 'STAR-V story with the exact check that caught it'],
            ['How do you handle confidential data with AI?', 'Classify, approved tools, minimise/anonymise, policy, ask'],
          ]),
          tip(
            'Rehearse out loud',
            'Use an AI assistant as a mock interviewer: give it the job description and your portfolio, ask for one question at a time, answer aloud or in writing, and ask for critique against STAR-V or CLEAR. Then rehearse with a human.',
          ),
        ],
        worked: {
          title: 'Case round: an AI assistant for a bank\'s branch staff',
          problem:
            '"Design an AI assistant that helps branch staff answer customer questions about products and procedures." Answer with CLEAR.',
          steps: [
            { title: 'Clarify', desc: 'Users: branch staff, not customers. Goal: faster, correct answers. Metric: accuracy on procedure questions and time saved. Constraints: customer data must not leave approved systems; Hindi and regional languages; regulator circulars change often.' },
            { title: 'Lay out', desc: 'Workflow, not agent. RAG over approved product documents and circulars with dates; answers cite the document; staff-facing only; no customer personal data in prompts; enterprise model under the bank\'s data terms.' },
            { title: 'Evaluate', desc: '150-question golden set by product and language, incl. "not covered" cases; launch bar ≥ 95% correct-and-cited on procedures, 100% correct abstentions; weekly sampling.' },
            { title: 'Address risks', desc: 'Stale circulars (versioning, effective dates), hallucination (cite or abstain), privacy (no customer data; DLP), injection (only approved documents indexed), over-reliance (staff training, escalation path).' },
            { title: 'Run the numbers', desc: '2,000 staff × 15 queries/day ≈ 900k queries/month; small model with routing to a larger one for complex queries; pilot in 20 branches, then expand.' },
          ],
          solution:
            'A structured, evidence-led answer that covers design, evaluation, risk and cost in about five minutes — the shape interviewers are looking for.',
        },
        practice: {
          title: 'Mock interview',
          prompt:
            'Run a 30-minute mock interview (AI interviewer, then a peer) with: two concept questions, one "AI was wrong" STAR-V story, one CLEAR case round in your domain, and one portfolio deep-dive. Record your answers and improve the weakest one.',
          hint: 'Time your case round: aim for 5–7 minutes before inviting questions.',
        },
        mistakes: [
          {
            mistake: 'Jumping to a solution in case rounds',
            fix: 'Clarify users, metric and constraints first; it changes the design.',
          },
          {
            mistake: 'Answers with no evidence of verification',
            fix: 'Always include the V: how you knew it was right.',
          },
          {
            mistake: 'Hiding or overstating AI use',
            fix: 'Be specific and honest about what AI did and how you checked it.',
          },
        ],
        exam: {
          question: 'Tell me about a time an AI tool gave you a wrong answer.',
          answer:
            'Structure it with STAR-V: the situation and what you were using AI for; the task; the action — including the specific check you ran, such as recomputing a figure, opening a cited source or running tests; the result — what was wrong and what you changed; and the verification habit you kept afterwards. A specific story with a concrete check is far stronger than a general statement that "AI sometimes makes mistakes".',
          source: 'Asked in most interviews for roles that use AI — have two stories ready.',
        },
        summary: [
          'Five families: concepts, verification, design cases, responsibility, your work.',
          'STAR-V for experience questions — the V is verification.',
          'CLEAR for case rounds: clarify, lay out, evaluate, address risks, run the numbers.',
          'Follow interview rules on AI use; be specific and honest.',
        ],
      }),
      [
        ['In STAR-V, the "V" stands for:', ['Vision', 'Verification — how you knew the result was right', 'Velocity', 'Value'], 1, 'Verification separates AI-literate answers.'],
        ['The first step of the CLEAR case structure is:', ['Run the numbers', 'Clarify users, goal, metric and constraints', 'Pick a model', 'Draw the UI'], 1, 'Clarify before designing.'],
        ['In a live coding round that forbids AI, you should:', ['Use it secretly', 'Follow the rule; ask if anything is unclear', 'Argue with the interviewer', 'Leave'], 1, 'Follow the interview\'s rules.'],
        ['A strong answer to "how do you evaluate an LLM feature?" includes:', ['"I try a few prompts"', 'A golden set with refusal cases, calibrated scoring, per-category comparison and regression testing', 'The model\'s parameter count', 'Asking users if they like it'], 1, 'Structured, repeatable evaluation.'],
      ]
    ),
    lesson(
      ID,
      'aif-m12-4',
      4,
      'The Defence: Present and Answer for Your Capstone',
      'Prepare, present and defend your capstone: the claims map, the evidence pack, the hard questions, and the standard your credential stands for.',
      46,
      nineBlocks({
        objectives: [
          'Prepare a capstone defence: a claims map backed by an evidence pack',
          'Present your capstone in ten minutes with a clear structure',
          'Answer hard questions about evidence, failures, risks and your own role honestly',
        ],
        hook:
          'A doctoral student does not get a degree for writing a thesis. They get it for defending it — standing in front of people who know the field and answering for every claim. The AI.FIRST credential works the same way. Anyone can generate a report. The question this lesson prepares you for is the one that matters at work, in interviews and in life: "How do you know that is true — and what would you do if it is not?"',
        concept: `**What you defend.** Your capstone combines the twelve proofs of work into one coherent piece for your pathway:
- **Explorer** — an "AI-first personal or community toolkit": your prompt library, verification log, an assistant or automation you built for a real group, with its evaluation and responsible-use rules.
- **Builder** — an "evaluated AI system": an app or agent with RAG or tools, a golden-set evaluation, a red-team report, guardrails and a cost model.
- **Leader** — an "AI adoption plan" for a real team or organisation: use-case selection, model choices with cost, an impact assessment, an AI-use policy, a pilot design and success metrics.

**The claims map.** List every important claim your capstone makes ("the assistant answers 94% of policy questions correctly", "routing cuts cost by 70%", "no personal data leaves the system") and link each to its **evidence**: a test result, a calculation, a log, a source, a screenshot. Any claim without evidence gets either evidence or deletion. This is Module 5 applied to your own work.

**The evidence pack**: the claims map; the evaluation results (with failures); the red-team or risk review; the cost arithmetic; the data-handling note; your AI-use disclosure; links to every artefact.

**The ten-minute presentation**
1. **The problem and who it is for** (1 min).
2. **What you built or designed and why** — key decisions (3 min).
3. **Evidence** — what works, measured; what does not, measured (3 min).
4. **Risks and responsibility** — what could go wrong and your controls (2 min).
5. **What you would do next** (1 min).

**Hard questions to prepare for**
- "How do you know it works? Show me the test that would fail if it did not."
- "What is the worst thing this system could do, and what stops it?"
- "Where did you rely on AI, and how did you check it?"
- "What did you get wrong, and what changed because of it?"
- "Who is accountable when it fails?"
- "If you had half the budget, what would you cut?"

**Answering well**: be direct; separate what you measured from what you believe; say "I don\'t know — here is how I would find out" when that is true; never bluff. Defending honestly, including your limits, **is** the skill this credential certifies.`,
        extras: [
          diagram(
            'From capstone to defended credential',
            `flowchart LR
  P["12 proofs of work"] --> CAP["Capstone for your pathway<br/>Explorer · Builder · Leader"]
  CAP --> CM["Claims map<br/>every claim → evidence"]
  CM --> EP["Evidence pack<br/>evals · red-team · cost · data note · disclosure"]
  EP --> PR["10-minute presentation"]
  PR --> QA["Hard questions"]
  QA --> FE["Final exam"]
  FE --> CR["AI.FIRST credential — defended"]`
          ),
          table('Claims map — example rows (Builder pathway)', ['Claim', 'Evidence', 'Status'], [
            ['Answers 94% of policy questions correctly', 'Golden set of 50, scoring script, results CSV', 'Supported'],
            ['Abstains on all out-of-scope questions', '8/8 refusal cases passed; 1 multi-turn failure found and fixed', 'Supported, with caveat'],
            ['Resistant to prompt injection', '12 injection tests, 11 passed; 1 mitigated by draft-only tool', 'Partially — stated honestly'],
            ['Costs under ₹500/month at 20k queries', 'Token logs × current price page (dated)', 'Supported'],
            ['Improves staff productivity', 'No measurement yet', 'Removed — planned pilot metric'],
          ]),
          proofOfWork(
            12,
            'The capstone defence',
            'Your AI-first toolkit for a real person or group: prompt library, verification log, one assistant or automation with its evaluation and rules of use — plus the claims map and a 10-minute recorded presentation.',
            'Your evaluated AI system: repo, live demo, golden-set results, red-team report, guardrails, cost model — plus the claims map and a 10-minute recorded presentation.',
            'Your AI adoption plan for a real team: use-cases, model and cost choices, impact assessment, AI-use policy, pilot design and metrics — plus the claims map and a 10-minute recorded presentation.',
            'A claims map where every claim links to evidence, honest failures, and a recording in which you answer at least three of the hard questions. Submit one public link to the folder as your capstone.'
          ),
          tip(
            'Rehearse the hardest question first',
            'Write down the question you most hope nobody asks. Answer it first, in your evidence pack. It is usually the one the panel asks.',
          ),
        ],
        worked: {
          title: 'Defend a weak claim honestly',
          problem:
            'In your defence a reviewer asks: "You say the system is resistant to prompt injection. Is it?" Your evidence: 11 of 12 injection tests passed; the failed one tried to make the assistant send an email, which was blocked only because the email tool is draft-only.',
          steps: [
            { title: 'Separate measurement from belief', desc: '"Measured: 11 of 12 injection attempts were ignored by the model."' },
            { title: 'Disclose the failure', desc: '"One succeeded in getting the model to request an email send; it was contained because the tool can only create drafts, which a human reviews."' },
            { title: 'Explain the design lesson', desc: '"That is why I rely on least privilege rather than the prompt — the prompt failed once; the permission did not."' },
            { title: 'State next steps', desc: '"I added that case to my regression suite and would add an output filter and a second-model check before giving the system any send capability."' },
          ],
          solution:
            '"Partially resistant, contained by design" — stated with evidence, a disclosed failure and a plan. That answer is stronger than an unsupported "yes", and it is exactly what the credential certifies: you can answer for your AI.',
        },
        practice: {
          title: 'Assemble and rehearse your defence',
          prompt:
            'Build your claims map and evidence pack, then record a 10-minute presentation using the five-part structure. Ask two people (or an AI mock panel followed by one person) to ask the six hard questions. Revise your weakest answer and your weakest claim.',
          hint: 'Delete or downgrade any claim you could not support during rehearsal — before the real defence.',
        },
        mistakes: [
          {
            mistake: 'Claims without evidence',
            fix: 'Every important claim links to a test, calculation, log or source — or is removed.',
          },
          {
            mistake: 'Hiding failures to look impressive',
            fix: 'Show measured failures with fixes and plans; reviewers trust honesty, and they will find the failures anyway.',
          },
          {
            mistake: 'Bluffing under questioning',
            fix: '"I don\'t know — here is how I would find out" is a strong professional answer.',
          },
        ],
        exam: {
          question: 'What does it mean to "answer for" an AI system you built or used?',
          answer:
            'It means taking responsibility for its outputs and effects: being able to show evidence for what you claim it does, disclosing where and how it fails, explaining the risks and the controls you put in place, being honest about where AI was used and how you verified it, and owning the consequences when it goes wrong — correcting, communicating and fixing the root cause rather than blaming the tool.',
          source: 'The closing question of the AI.FIRST defence — and of most serious AI interviews.',
        },
        summary: [
          'Capstone by pathway: Explorer toolkit, Builder system, Leader adoption plan.',
          'Claims map: every claim → evidence, or delete it.',
          'Ten minutes: problem, design, evidence, risks, next.',
          'Answer hard questions honestly — defending your limits is the skill certified.',
        ],
      }),
      [
        ['A claims map links each capstone claim to:', ['A slide design', 'Its evidence: test result, calculation, log or source', 'A social post', 'A model name'], 1, 'Every claim needs evidence or removal.'],
        ['A reviewer asks about a claim you cannot fully support. The best response is:', ['Insist it is true', 'State what you measured, disclose the gap, and explain how you would verify it', 'Change the topic', 'Say AI did it'], 1, 'Separate measurement from belief.'],
        ['The capstone for the Leader pathway is:', ['A deployed app', 'An AI adoption plan with impact assessment, policy, pilot and metrics', 'A token lab', 'Nothing'], 1, 'Each pathway has its own capstone form.'],
        ['Why include measured failures in your defence?', ['To lower your score', 'Because honest evidence of limits and fixes is what makes the work credible', 'It is required to fail', 'To fill time'], 1, 'Credibility comes from honest evidence.'],
      ]
    ),
  ],
};
