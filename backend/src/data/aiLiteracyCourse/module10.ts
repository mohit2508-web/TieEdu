// Module 10 — Your AI Practice
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code } from '../nineBlocks';
import { lesson, M10, COURSE_ID } from './helpers';

export const module10: CourseModule = {
  id: M10,
  course_id: COURSE_ID,
  title: 'Module 10 — Your AI Practice',
  summary:
    'Turning nine modules of knowledge into a personal system: workflows with humans placed where the stakes are, a prompt library you actually reuse, a rubric for judging output quality, an ethics recap — and the capstone: a real AI toolkit with evidence of use.',
  sort_order: 10,
  lessons: [
    lesson(
      M10,
      'lit-10-1',
      1,
      'Personal Workflows and Human-in-the-Loop: Where AI Fits, Where You Do',
      'Decomposing recurring tasks, assigning steps to model or human by risk and checkability, and measuring honestly whether the workflow actually saved time.',
      15,
      nineBlocks({
        objectives: [
          'Decompose a recurring task into steps and assign each to AI or human',
          'Place human checkpoints by error cost, reversibility and checkability',
          'Recognise automation bias and other drift risks in repeated workflows',
          'Measure net time saved including verification effort',
        ],
        hook:
          'A student automated her weekly club-update routine: AI summarised the chat log, drafted the announcement, and — one lazy Sunday — she posted it unchecked. It was accurate about everything except the venue, which had moved. The failure was not the model; it was a workflow with no checkpoint at the one step where being wrong actually costs something. Workflows are where individual prompt skills become systems — and systems fail at their seams.',
        concept: `**From prompt to workflow.** A workflow is a recurring task written down as steps. Take something you do weekly — an update email, a study-notes pass, a bug-fix routine — and decompose it: (1) *gather inputs* (chat log, notes, error trace), (2) *specify the ask* (what the output must do), (3) *AI steps* (summarise, draft, restructure, explain, generate candidates), (4) *verification* (facts, code, links, edge cases — Modules 8 and 9), (5) *decision* (approve, adapt, discard), (6) *publish or submit*. The division of labour follows a simple principle: **AI takes steps where generation is cheap and errors are visible; you take steps where judgement, rights and consequences live.** Most failed AI adoptions are really unexamined workflows — someone automated step 3 and forgot step 4 exists.

**Human-in-the-loop (HITL), placed by risk.** "Human in the loop" means a person is a required gate at some position in the pipeline — not a spectator. Three placements: *before* (you write the spec and supply verified context — the cheapest control), *during* (approval gates: nothing sends, commits or submits without a human click — the strongest control), and *after* (verification pass on output — the most common one, and the one people skip). Choose by three properties of the step: **error cost** (what breaks if this is wrong — a subject line and a court filing are not the same), **reversibility** (can the error be undone in a minute, or is it permanent — sent messages, commits, public posts), and **checkability** (how cheaply output can be checked — code checks itself; persuasive prose does not). Low cost + reversible + checkable → automate with light review. High cost or irreversible → human decision, always, regardless of how good the model has been lately. That last clause is the point: your HITL placement is set by consequences, not by recent experience of the tool.

**Drift risks.** Two patterns corrode workflows over time. *Automation bias*: as outputs stay good for weeks, checking quietly shortens, then disappears — right up until the distribution of inputs shifts (new data, new template, a model update — Module 7) and errors return unnoticed. Countermeasures: keep the check a fixed, named step in your written workflow; sample-audit even when confident; re-run your mini test set (Module 6) after any model or prompt change. *Scope creep*: a workflow built for summaries grows an auto-send feature, then an auto-reply — each step shaves seconds and moves the gate. Watch where the human gate migrates; if it drifts toward the end of higher-stakes steps, pull it back deliberately.

**Measure honestly.** The net saving is *time saved including verification*, minus the time spent building and maintaining the workflow. Count honestly for two weeks: generation is fast, but the checks you must do are not optional — they are the price of the workflow being safe. A routine that saves 30 minutes but needs 25 minutes of checking is a modest win, not a transformation; a routine where checking also catches your own errors is a better one than it looks. Write the workflow down — one page, steps, gates, checks — because a workflow that exists only in your head cannot be audited, taught or fixed.`,
        extras: [
          table(
            'Placing the human gate',
            ['Step properties', 'Placement', 'Example'],
            [
              ['Low cost, reversible, machine-checkable', 'After, light review', 'Subject-line variants; formatting fixes'],
              ['Medium cost, checkable in minutes', 'After, fixed verification pass', 'Draft emails; summaries of your own notes'],
              ['High cost or irreversible', 'During (approval gate) + after', 'Public posts, submissions, sends, commits'],
              ['Legal / financial / safety / graded', 'Human decides; AI only prepares', 'Claims, filings, grades, medical content'],
            ],
          ),
          code(
            `# A written workflow, one page
weekly_update:
  1 gather:   chat log + calendar        (you)
  2 specify:  template + facts           (you, from library)
  3 generate: summary + draft            (AI)
  4 verify:   dates/venue/links/names    (you - FIXED step)
  5 approve:  nothing sends without you  (you - gate)
  6 publish:  send                       (you)
net_time = t(before) - t(after) - t(maintain)`,
            'workflow.yaml',
            'yaml',
          ),
          tip(
            'Write the workflow before you automate it',
            'One page of steps and gates exposes the missing verification step while it is still cheap to add. The page is also what you audit when results drift.',
          ),
          warn(
            'Automation bias is silent',
            'Long streaks of good output are exactly when checking erodes — and inputs change without notice. Keep verification a fixed named step, not a habit that fades with confidence.',
          ),
        ],
        worked: {
          title: 'Redesign a weekly routine with gates',
          problem:
            'Ravi\'s routine: every Sunday he reads 40+ club chat messages, writes action items, drafts a status email to the faculty advisor, and sends it. It takes about 90 minutes and he skips it half the time. Redesign it as a workflow with explicit AI steps and human gates, then estimate net time.',
          steps: [
            {
              title: 'Decompose and assign',
              desc: 'Gather (export chat log + his own notes) → you; specify (from template: audience = advisor, must include decisions, pending items, next meeting date) → you; generate (summary + action items + draft) → AI; verify → fixed human step; approve → gate; send → you. Decisions remain his: which items escalate, what tone with the advisor.',
            },
            {
              title: 'Design the verification around what breaks',
              desc: 'Error cost analysis: wrong date/venue = credibility hit with faculty (irreversible once sent); missed action item = a project stalls. So the check list is exactly: every date against the calendar, every name against the roster, every commitment matches what was agreed in chat.',
              code_snippet: 'check: dates -> calendar | names -> roster\n       commitments -> quoted chat lines\nstrip: anything the log does not support',
            },
            {
              title: 'Place the gates',
              desc: 'During-gate at send (nothing goes without his click, because the email is irreversible and high-trust); after-gate at verification (fixed step before it). No auto-send, ever, for this workflow — regardless of how good the drafts get.',
            },
            {
              title: 'Measure net effect over two weeks',
              desc: 'Expected: 90 → ~35 minutes (generation + checking) plus occasional template maintenance. Track actuals: if checking creeps past 30 minutes the prompt/template needs work, not the check. Re-audit after any model update — and keep one weekly item deliberately hand-written as a control sample.',
            },
          ],
          solution:
            'A six-step workflow with AI confined to generation, verification as a fixed named step, an approval gate before sending, and an honest measurement including checking time. The design question was never "can AI write this" — it was "which step, if wrong, costs Ravi credibility" — and the gate sits there.',
        },
        practice: {
          title: 'Map your own workflow',
          prompt:
            'Take one recurring task and write it as 5–7 steps. Mark each AI / human, place one human gate by error cost, and name the verification check for each AI step. Run it once for real and time both halves. Report: net minutes saved, and what the verification actually caught.',
          hint: 'If the verification step caught nothing on the first run, you are either very good or not really checking — the second run usually settles it.',
        },
        mistakes: [
          {
            mistake: 'Handing over the decision, not just the drafting',
            fix: 'AI may prepare options; the approve/send/submit step stays yours wherever consequences are real. Gates sit where errors become permanent.',
          },
          {
            mistake: 'Skipping checks because the tool has been reliable',
            fix: 'Reliability streaks end when inputs or models change. Verification is a fixed step in the written workflow, not a mood that depends on recent experience.',
          },
          {
            mistake: 'Counting generation time only',
            fix: 'Net saving includes verification and maintenance. Measure the whole loop for two weeks before calling anything a time-saver.',
          },
          {
            mistake: 'Keeping the workflow in your head',
            fix: 'Unwritten workflows cannot be audited when they drift, taught to a teammate, or repaired after an incident. One page: steps, gates, checks.',
          },
        ],
        exam: {
          question:
            'Define human-in-the-loop and explain how you decide where to place the human gate for a given step.',
          answer:
            'Human-in-the-loop means a person is a required, non-skippable gate at a defined position in an AI pipeline — specification before, approval during, or verification after — rather than a passive observer of automated output. Placement is decided by three properties of the step: error cost (how much damage a wrong output causes), reversibility (whether the error can be undone — sent messages and public posts cannot), and checkability (how cheaply and reliably output can be verified). Low-cost, reversible, machine-checkable steps tolerate light after-the-fact review; high-cost or irreversible steps require an in-loop approval gate regardless of the model\'s recent track record — because the gate exists for the day the model, the inputs or the settings change.',
          source: 'Core applied-AI governance question; standard in product and ML-practice interviews.',
        },
        summary: [
          'Decompose recurring tasks; AI generates, humans specify, verify, decide and publish.',
          'Place gates by error cost × reversibility × checkability — not by how reliable the tool feels today.',
          'Human-in-the-loop: before (spec), during (approval), after (verification) — pick deliberately.',
          'Fight automation bias with fixed named checks, sample audits and mini test sets after changes.',
          'Measure net time honestly: generation minus verification minus maintenance; write the workflow down.',
        ],
      }),
      [
        [
          'Human-in-the-loop most accurately means:',
          [
            'A human writes every prompt character by character',
            'A person is a required gate at a defined step — spec, approval or verification — in the pipeline',
            'The model is trained on human data',
            'A human watches the model generate tokens in real time',
          ],
          1,
          'It describes a control placement in the process, not typing habits or training provenance.',
        ],
        [
          'Which step most needs an in-loop approval gate?',
          [
            'Reformatting your own notes',
            'Generating bullet variants for a slide',
            'Auto-sending a message that corrects a public record (irreversible, high trust)',
            'Suggesting variable names',
          ],
          2,
          'High cost plus irreversibility decides: gates follow consequences, not the tool\'s recent accuracy streak.',
        ],
          [
          'Automation bias is best described as:',
          [
            'Bias introduced by automated data collection',
            'Checking that quietly erodes as outputs stay good — until inputs or models shift and errors return unnoticed',
            'A model refusing to act without approval',
            'Preference for faster models',
          ],
          1,
          'The trust-decay failure mode: the workflow\'s check shortens exactly when a silent distribution change makes it necessary again.',
        ],
        [
          'When measuring whether an AI workflow "saved time", you must include:',
          [
            'Only the generation time',
            'Verification time and maintenance time alongside generation',
            'The model\'s inference latency',
            'Nothing — savings are self-evident',
          ],
          1,
          'Net saving is whole-loop: generation + checks + upkeep. Omitting checks is how unsafe workflows get called efficient.',
        ],
      ]
    ),
    lesson(
      M10,
      'lit-10-2',
      2,
      'Building a Prompt Library You Actually Reuse',
      'Turning one-off prompts into versioned, tested assets — the entry format, the generalisation step, and the maintenance habits that keep a library alive.',
      15,
      nineBlocks({
        objectives: [
          'Convert a successful ad-hoc conversation into a reusable template with slots',
          'Design a library entry with the fields that make reuse possible',
          'Apply versioning, test-date and verification discipline to stored prompts',
          'Curate a small library from your own highest-frequency tasks',
        ],
        hook:
          'Six weeks into heavy AI use, most people have re-written the same prompt four times, cannot find the version that worked, and have no idea which model it worked on. Meanwhile the small number who kept a page of prompts copy-paste, adjust two slots, and ship. The difference is not cleverness — it is treating prompts the way programmers treat code: stored, versioned, tested, reused. You do not need an engineer\'s tooling; you need a page and some discipline.',
        concept: `**A prompt is an asset — once it is generalised.** The conversation that produced a great output is raw material: it contains your task description, the constraints that mattered, the example that pinned the format, and — buried in it — the two specifics that only apply to that one request. The library step is *extraction*: pull the general structure out of the particular instance, replace the particulars with **slots** ({audience}, {document}, {job_description}, {word_limit}), and store the result as a template you can fire at any input. Without slots, you are storing transcripts; with slots, you are storing capability.

**The entry format.** One entry, one task. Fields that earn their place: **name** (what job it does, in your words — "JD-to-resume-bullet matcher"); **use case** and *when to reach for it*; **slots** (the inputs it expects, with a note on what good input looks like); **the prompt** (with slots inline, verbatim as tested); **constraints/format** (what the output contract is); **verification checklist** (the 2–4 checks this specific output needs — citation tracing for research entries, edge-case run for code entries, fact pass for emails — this is the field people skip and the one that makes the library worth having); **known failure modes** (what went wrong before: "invents dates if {deadline} is empty"); **model + last tested date** (prompts are written against a specific model\'s behaviour, and models change silently); and one **example pair** (sample input → good output, so future-you can see the target without re-running history). A notes app with a template per page, or a spreadsheet with a row per entry, both work — the tool matters far less than the fields.

**How to build it in a week.** Collect from evidence, not ambition: go through your last month of chats and star the outputs you actually used. Take the top three tasks by frequency (for most students: summarising, drafting messages, explaining/reformatting material — your list will differ). Generalise each: identify slots, write the template, test it on **three fresh inputs** (the real test — a prompt that only works on its original input is not generalised yet), record failures honestly in the field. Total effort: an hour or two. That is the entire MVP of your library.

**Maintenance is the whole game.** Libraries die in three ways: never used (because the collection step never happened or entries are hard to find — keep names job-shaped and search-friendly); stale (because models update and entries carry no test dates — re-test quarterly or after a notice about model changes, and update the date or retire the entry); and unchecked (because someone stripped the verification field during tidying — never ship an entry without its checks; a library without checklists is a library of traps). Add an entry only after its second successful use; prune entries you have not touched in months; keep private data out of examples before sharing a page with teammates. A library of fifteen honest entries beats a graveyard of two hundred aspirational ones.`,
        extras: [
          table(
            'Library entry fields',
            ['Field', 'Purpose'],
            [
              ['Name / use case', 'Job-shaped so you can find it under pressure'],
              ['Slots', 'What input it expects — and what "good input" means'],
              ['Prompt (verbatim, as tested)', 'Copy-paste ready with slots inline'],
              ['Verification checklist', 'The 2–4 checks this output type requires'],
              ['Known failure modes', 'What broke before, so it does not again'],
              ['Model + last tested', 'Prompts are version-specific; models drift'],
              ['Example pair', 'Sample input → good output as the target'],
            ],
          ),
          code(
            `# Entry: resume-bullet-from-worklog (tested 2026-10, model X)
slots: {worklog} {job_description} {max_bullets=4}
prompt: |
  "Turn this worklog into resume bullets for the JD below.
   Rules: only facts present in the worklog; action verbs;
   quantify ONLY numbers that appear; map honest terminology
   to JD keywords. Output: {max_bullets} bullets, <=25 words each.
   Mark anything unsupported as [verify]."
checks:  evidence test per bullet | JD keyword match | no invented numbers
fails:   inflates scope verbs ("helped" -> "led") when log is vague`,
            'library_entry.txt',
            'text',
          ),
          tip(
            'Store the checks inside the entry',
            'A prompt without its verification checklist is half an asset — future-you will reuse the prompt and skip the check. The checklist travels with the template or it does not happen.',
          ),
          warn(
            'Undated entries rot silently',
            'Model updates change prompt behaviour without telling you. Record model + date on every entry, re-test after updates, and retire rather than trust stale pages.',
          ),
        ],
        worked: {
          title: 'Turn one great conversation into an entry',
          problem:
            'Last week you got an excellent output: a messy paragraph of meeting notes converted into a clean decision log (decisions / action items with owners / open questions). The prompt was assembled ad hoc across three messages, including a sample. Convert it into a library entry.',
          steps: [
            {
              title: 'Reconstruct and separate',
              desc: 'Pull from the transcript: the instruction ("convert meeting notes into three sections…"), the constraint that mattered ("owners only when explicitly stated, else unassigned"), the format rules, and the sample you supplied. Separate general structure from this-meeting specifics (the actual notes become a slot).',
            },
            {
              title: 'Generalise with slots and write the entry fields',
              desc: 'Slots: {notes}, {meeting_date}, {sections}. Name: "notes → decision log". Add the checklist (owners real? every decision traceable to a line? no invented dates?) and failure modes ("invents action items when notes are ambiguous — added clarification clause").',
              code_snippet: 'slots: {notes} {meeting_date}\ncheck: decision | trace to source line\n       owner only if named else "unassigned"\n       no date not present in notes',
            },
            {
              title: 'Test on three fresh inputs',
              desc: 'A standup log, a long messy thread, a sparse five-line note. Three inputs because generalisation fails on the distribution, not the original: sparse notes are where action items get invented. Fix what breaks — one change per iteration, Module 6 discipline — then finalise.',
            },
            {
              title: 'Record model, date and example pair',
              desc: 'Save with model name and test date, plus one sample input → good output for future reference. Note the second-use rule: the entry graduates from "candidate" to "library" after one more real successful use — entries are added on evidence, not enthusiasm.',
            },
          ],
          solution:
            'Transcript → separation of structure from specifics → slots, checks and failure modes → three-input test → dated entry with example pair. The reusable asset is not the prompt text alone: it is prompt + slots + checks + known failures + test date — which is exactly the difference between a page you reuse and a scroll you never open again.',
        },
        practice: {
          title: 'Start your library with three entries',
          prompt:
            'Pick your three most repeated AI tasks from real usage. For each: write an entry with name, slots, verbatim prompt, verification checklist, known failure mode, and last-tested date. Test each on one fresh input today. One page per entry, in whatever tool you will actually open.',
          hint: 'Start from conversations you already had — collecting from evidence beats inventing entries for tasks you rarely do.',
        },
        mistakes: [
          {
            mistake: 'Storing raw transcripts instead of templates',
            fix: 'Transcripts are clutter with one-off specifics buried in them. Extract the structure, name the slots, keep one example pair — the rest goes.',
          },
          {
            mistake: 'Entries without test dates or model names',
            fix: 'Prompt behaviour is version-specific and models change silently. Undated entries cannot be trusted or re-validated.',
          },
          {
            mistake: 'Dropping the verification checklist during tidying',
            fix: 'The checklist is the field that makes reuse safe. An entry without checks invites the exact shortcut that produced your past failures.',
          },
          {
            mistake: 'Building a giant library you never fire',
            fix: 'Reuse is the success metric. Add on second use, prune what you never touch, and name entries by the job so you can find them fast.',
          },
        ],
        exam: {
          question:
            'What distinguishes a reusable prompt-library entry from a saved successful prompt? Specify five fields and explain the purpose of each.',
          answer:
            'A saved prompt is a frozen transcript tied to one input; a library entry is a generalised, tested, maintained asset. Five fields: (1) slots — named placeholders for the inputs, converting one instance into a family of uses; (2) the verbatim prompt as tested — copy-paste ready with slots inline, avoiding reconstruction errors; (3) verification checklist — the specific checks this output type demands, so reuse carries its safety with it; (4) known failure modes — prior breakage (e.g. invented dates when a slot is empty) so traps are not re-walked; (5) model + last tested date — because prompts are written against particular model behaviour that changes silently, making re-testing possible and retirement honest. An example pair of input → good output completes the entry by showing the target without a rerun.',
          source: 'Prompt-operations question; reflects professional prompt-management practice.',
        },
        summary: [
          'Generalise conversations into templates: extract structure, name the slots, keep one example.',
          'Entry = name + slots + verbatim prompt + checks + failure modes + model/date + example pair.',
          'Test on three fresh inputs — a prompt that only works on its original input is not generalised.',
          'Maintenance decides value: re-test after model changes, prune dead entries, add on second use.',
          'A prompt without its checklist is a trap stored for future-you.',
        ],
      }),
      [
        [
          'The step that turns a successful conversation into a reusable asset is:',
          [
            'Copying the whole transcript to a notes file',
            'Generalising specifics into named slots while keeping the structure and checks',
            'Making the prompt longer',
            'Uploading it to a prompt marketplace',
          ],
          1,
          'Slots convert one instance into a template for a family of inputs; transcripts remain tied to their original request.',
        ],
        [
          'Which field prevents a stored prompt from silently breaking after a model update?',
          ['The prompt\'s word count', 'Model name + last tested date', 'The example\'s formatting', 'The entry\'s name'],
          1,
          'Only a dated, model-tagged entry can be re-tested and retired honestly when behaviour drifts.',
        ],
        [
          'Why must the verification checklist be stored inside the entry?',
          [
            'To increase the prompt\'s accuracy automatically',
            'So reuse carries its own safety — future firing of the prompt fires its checks too',
            'Because markets require it',
            'To reduce token usage',
          ],
          1,
          'Checks separated from prompts get skipped; embedding them makes verification part of the copy-paste act.',
        ],
        [
          'A library of 200 entries where you use 4 is best described as:',
          ['Comprehensive', 'A graveyard — value comes from reuse, not count', 'Over-engineered', 'The correct end state'],
          1,
          'The success metric is fired prompts with their checks; entries added on ambition and never used are dead weight.',
        ],
      ]
    ),
    lesson(
      M10,
      'lit-10-3',
      3,
      'Is This Good and Is This Right: Evaluating Output and Your Ethics Rules',
      'A rubric-based way to judge AI output instead of vibing at it, and the honesty, attribution and harm principles that keep your name on work you can stand behind.',
      16,
      nineBlocks({
        objectives: [
          'Define task-specific quality criteria and grade output against a short rubric',
          'Apply checks that raise verifiability for uncheckable claims',
          'State personal ethics rules covering honesty, attribution and harm',
          'Connect evaluation failures to prompt improvements in your library',
        ],
        hook:
          'Two outputs sit side by side: both fluent, both well structured, both confident — one is right. If your judging method is "reads well", you cannot tell them apart, and fluency is exactly what language models optimise. Evaluation is the skill underneath every other skill in this course: prompting gets you output, workflows place it, but only judging turns output into work you are willing to sign.',
        concept: `**"Good" is a specification, not a feeling.** Start by writing what good means *for this task* — three to five criteria, checkable where possible. Research summary: faithful to source, caveats preserved, claims traceable, right length. Resume bullet: true claim, evidence available, action verb, JD vocabulary honoured. Code fix: solves the original bug, passes edge cases, no new dependencies, readable. Email: every fact correct, ask explicit, tone yours, filler removed (the Module 8 passes are a rubric; you have been building one all along). Grade each candidate output against the rubric — quickly, with marks — and pick or edit accordingly. Teams should write theirs down; individuals can keep four lines in the library entry (Module 10, Lesson 2). The transformation is real: once criteria are explicit, disagreements become specific ("fails caveat preservation") instead of vague ("something feels off"), and — critically — you can notice *regressions* after you change a prompt.

**Checks sized to the output.** For claims: spot-check the load-bearing ones against sources (Module 8 routine — you do not need to verify a tone-only draft the way you verify statistics). For structure: diff against the requested format — if you asked for three bullets with a constraint each and got five without them, that is a rubric failure regardless of eloquence. For anything uncheckable in itself, *raise verifiability by construction*: ask for the source sentence, the derivation, the test run, the quoted line — formats you can verify beat formats you must trust. And the tempting shortcut — **asking another model "is this good?"** — is a weak signal at best: same family of heuristics, same blind spots, correlated failures; a second opinion from a machine that shares the first machine\'s training distribution is a coin flip with extra steps. Use it, if at all, as a generator of *checks*, never as the check.

**Ethics recap — three rules, one test.** Everything in this course converges into how you behave when nobody is grading the tool: **Honesty** — do not misrepresent how work was made or what it contains; disclose where rules or norms require it; never let an AI-assisted artefact claim certainty you did not establish; do not use synthetic media to deceive (Module 9). **Attribution** — cite the human sources your work draws on (verified citations, not generated ones); respect licences and terms for both the inputs you paste and the outputs you use; where AI assistance is acknowledged in your field or institution, acknowledge it; do not pass off others\' work — human or model — as solely yours. **Harm** — consider who is affected before you generate: personalised deception, harassment, biased screening and mass-produced falsehood cause real damage, and "the tool made it easy" is not a mitigation (Module 9). Underneath all three sits the principle the course has repeated from different angles: **accountability does not transfer**. The name on the submission, the send button, the commit — that person carries it.

The final test to keep in your pocket, applied before shipping anything that matters: *Would I be comfortable explaining exactly how this was made — every prompt, every source, every check — to the person it affects?* If yes, proceed. If the explanation would embarrass you, the problem is not the tool.`,
        extras: [
          table(
            'Rubric sketches by task',
            ['Task', 'Criteria (pick 3–5)'],
            [
              ['Research summary', 'Faithful to source · caveats kept · claims traceable · right length'],
              ['Resume bullet', 'True claim · evidenced number · action verb · JD vocabulary'],
              ['Code fix', 'Fixes bug · passes edge tests · no new deps · readable'],
              ['Email / announcement', 'Facts correct · ask explicit · tone yours · no filler'],
              ['Study explanation', 'Accurate vs textbook · right level · worked example · self-check'],
            ],
          ),
          tip(
            'Rubrics beat vibes — and they compound',
            'Criteria you wrote once get reused in every library entry, every iteration and every regression check. Ten minutes of rubric-writing pays out across months of use.',
          ),
          warn(
            '"Another model says it\'s fine" is not verification',
            'A second model shares the first one\'s blind spots; agreement between them is weak evidence. Convert second opinions into checks you run yourself — sources, tests, arithmetic.',
          ),
          info(
            'Ethics rules should be personal and written',
            'Three to five rules you actually follow ("no secrets pasted", "verify before submit", "disclose when required") outperform abstract principles you cannot recall. Write them at the end of this module and keep them in the library.',
          ),
        ],
        worked: {
          title: 'Grade two candidate outputs and sign one',
          problem:
            'Task: a 200-word study note explaining convolution to a classmate, from your course material. Two candidates arrive — A and B. Write the rubric, grade both, choose or edit, and run the ethics check before "submitting".',
          steps: [
            {
              title: 'Define the rubric (before looking)',
              desc: 'Four criteria: (1) accurate against your course material — no mechanism invented; (2) correct level — classmate knows arrays, not calculus; (3) one concrete worked detail (kernel size × image size → output size); (4) ends with a self-check question. Precommitting prevents the fluent one from winning by vibes.',
            },
            {
              title: 'Grade both against the rubric',
              desc: 'A: elegant, mentions stride/padding/history — fails (2) and (3): calculus crept in, no concrete arithmetic. B: plain, has the worked multiplication, ends with a check — passes 1–4 after you verify the arithmetic and one mechanism claim against your notes. Marks: A fails on fit despite superior prose.',
            },
            {
              title: 'Edit and verify the load-bearing bits',
              desc: 'Take B, fix one imprecise sentence, and verify the two checkable items: the size arithmetic (recompute it) and the mechanism statement (point at the lecture note line). Only verified items survive — fluency earned nothing.',
              code_snippet: 'rubric: acc | level | worked detail | self-check\nA:  P  F  F  P   (fluent, wrong fit)\nB:  P  P  P  P   (after 2 verifications)',
            },
            {
              title: 'Run the ethics test',
              desc: 'Honesty: you will state it as your note, drawn from course material — is that true? Yes. Attribution: the definition traces to your lecturer\'s material — cited in your study notes. Harm: none plausible. Comfort test: could you defend every line to your instructor? Submit.',
            },
          ],
          solution:
            'A precommitted four-criterion rubric separated quality from fluency, verification settled the checkable claims, the edit fixed the single weak sentence, and the ethics pass (honesty / attribution / harm / comfort) closed the loop. The output you submit is now both good *by your specification* and right *by your principles* — the two halves of the lesson.',
        },
        practice: {
          title: 'Write and use a four-line rubric',
          prompt:
            'For your single most common AI task, write four criteria as checkable statements. Grade today\'s real output against it, note which criterion failed, and make the one prompt change in your library entry that addresses it. Report: rubric, score, prompt diff.',
          hint: 'If a criterion cannot be answered yes/no after a quick look, rewrite it until it can — vague criteria produce vague scores.',
        },
        mistakes: [
          {
            mistake: 'Judging by fluency',
            fix: 'Fluency is the model\'s home ground and is uncorrelated with truth in exactly the cases that matter. Grade against precommitted criteria, not prose quality.',
          },
          {
            mistake: 'No criteria, so no improvement possible',
            fix: 'You cannot iterate on "felt wrong". Write 3–5 checkable criteria; failures then name their fix ("caveat preservation" → add a constraint).',
          },
          {
            mistake: 'Treating evaluation as only for code',
            fix: 'Code has a runtime; prose and research have rubrics and sources. Every output type needs its judge — the judge is just manual.',
          },
          {
            mistake: 'Ethics as an afterthought at submission time',
            fix: 'Honesty, attribution and harm decide what you generate in the first place. Run the comfort test before the work exists, not while you are clicking submit.',
          },
        ],
        exam: {
          question:
            'You must submit an AI-assisted essay under your institution\'s policy. What does honesty require, and what does attribution require?',
          answer:
            'Honesty: represent the work truthfully — follow the written policy exactly (if disclosure of AI assistance is required or the use exceeds the permitted zone, disclose; do not present generated analysis as verified when you have not checked it); every factual claim must be one you have verified, because submitting an unverified AI-invented fact is a false statement regardless of who typed it; and be prepared to explain and defend the whole essay, since authorship includes understanding. Attribution: cite the human sources the essay draws on — with references you traced and confirmed, not model-generated lists — credit ideas and quotations properly, and acknowledge AI assistance in the manner the institution or field specifies. Where policy is silent, apply the comfort test: submit only what you could explain, prompt by prompt and source by source, to your instructor.',
          source: 'Standard academic-integrity question for AI-era coursework policy assessments.',
        },
        summary: [
          'Good = precommitted, checkable criteria for the task — write 3–5 before you look at output.',
          'Raise verifiability by asking for sources, derivations and runs; second models are weak signals.',
          'Iteration feeds back: each rubric failure becomes a constraint in your library entry.',
          'Ethics: honesty (how it was made and what it claims), attribution (sources and licences), harm (who is affected).',
          'Accountability never transfers — keep the comfort test: could you explain every step to the person affected?',
        ],
      }),
      [
        [
          'The main advantage of grading AI output with a written rubric is:',
          [
            'It makes outputs correct automatically',
            'It replaces vague impressions with checkable criteria, enabling consistent judgement and targeted prompt fixes',
            'It reduces token cost',
            'It is required by all providers',
          ],
          1,
          'Explicit criteria make quality comparable across outputs and failures actionable in your next iteration.',
        ],
        [
          'A research summary is fluent and well structured but drops the sample-size caveat from the source. Against a rubric that requires "caveats preserved", it:',
          [
            'Passes — structure is excellent',
            'Fails on a named criterion, so the fix is a specific prompt constraint, not a rewrite from scratch',
            'Passes if the tone is confident',
            'Cannot be evaluated',
          ],
          1,
          'That is the rubric working: a specific failure naming its own remedy.',
        ],
        [
          'Asking a second model to confirm your output is best treated as:',
          [
            'Verification equivalent to checking sources',
            'A weak signal that may suggest checks you then run yourself',
            'Proof of correctness',
            'A substitute for your rubric',
          ],
          1,
          'Models share training distributions and blind spots; agreement is not independent evidence.',
        ],
        [
          'The ethics "comfort test" asks:',
          [
            'Whether you enjoyed the task',
            'Whether you could explain every prompt, source and check behind the work to the person it affects',
            'Whether the output reads fluently',
            'Whether the tool is paid',
          ],
          1,
          'It operationalises honesty, attribution and harm into one pre-submission question about full transparency.',
        ],
      ]
    ),
    lesson(
      M10,
      'lit-10-4',
      4,
      'CAPSTONE — Build Your Personal AI Toolkit and Prompt Library',
      'The course\'s final deliverable: five real use-cases, ten tested prompts with before/after evidence, your verification checklist, a caught hallucination, and the ethics rules you will keep — plan it, run it, reflect.',
      18,
      nineBlocks({
        objectives: [
          'Plan five real AI use-cases across study, work and personal tasks',
          'Produce before/after prompt evidence demonstrating the Module 6 iteration loop',
          'Document a verification checklist and one genuinely caught hallucination',
          'Write personal ethics rules and a maintenance plan for the toolkit',
        ],
        hook:
          'Everything so far has been exercises. This lesson is different: the deliverable is a document that proves you can run the whole loop — choose a tool, write and iterate a prompt, verify what came back, catch the model lying once, and state the rules you will not break. Not a certificate quiz: a working file, your name on it, evidence inside. The course claimed you would finish with a practice. Now you build it.',
        concept: `**What you are building.** One document (a doc, a note, a small repo — your choice) titled as your personal AI toolkit and prompt library, containing five sections. (1) **Five use-cases you actually ran** — across different domains (for example: research summary for a subject, code explanation, an email draft, resume bullet improvement, study drill). Each entry: the task, the tool chosen and *why* (Module 7's selection procedure in one line), the workflow with its human gate (Module 10.1), what verification you performed, and the honest outcome — including anything that failed. (2) **Your ten best prompts, before and after** — for each: the naive first attempt and its output (the "before"), the improved prompt built from Modules 6 and 10.2, and its output (the "after"), with a one-line note on *which change mattered*. This is the section that proves iteration rather than asserting it — keep the real outputs, unedited. (3) **Your verification checklist** — the general checks you now run (claim classification, citation tracing, fact pass, edge-case run — whichever apply), tailored to your tasks, written as steps you can execute. (4) **One hallucination you caught** — what the model claimed, how you detected it (which check fired), what you did, and what it taught you about where your own risk concentrates; if you have not caught one, manufacture the conditions: ask five checkable questions on a niche topic, verify all five, and report what you find honestly. (5) **Your ethics rules** — three to five lines you will actually follow (from Lesson 3: disclosure, no secrets pasted, verify before submit, attribution, harm check), plus your comfort-test sentence.

**How to run it.** Plan first: pick the five use-cases from tasks you genuinely have this week — the capstone fails when people invent tasks to sound impressive. Work over a week if possible; a single session works but produces thinner evidence. For every use-case, *save the conversation*: before-prompt, before-output, after-prompt, after-output, checks run. Maintain your library in parallel (Lesson 2 fields), because entries and evidence come from the same sessions. When a check catches something — a wrong date, a fabricated source — you have found your hallucination case study; document it the day it happens.

**Reflect — the part people skip, the part that matters.** Write four honest paragraphs: what improved in your outputs over the week (with one concrete before/after as proof); what still fails and where you now expect failure (specific: "citations in long research answers", "dates when I don't supply them"); what you deliberately will *not* use AI for (a real list — graded material if your policy says so, personal judgement calls, anything you cannot verify); and how the library gets maintained (re-test dates, quarterly prune, what triggers an update). The reflection is what converts a week of activity into a practice — because the toolkit will drift without it.

**Common ways this goes wrong.** Describing instead of running (a capstone about *what you would do* has no evidence — the before/after outputs are the evidence); importing prompts from the internet without testing them on your inputs (they are someone else\'s evidence); claiming verification you did not perform (the checklist must have check marks, not aspirations); and building a tool *list* instead of a toolkit — five apps you opened once is not a system; five tasks with routing rules, prompts and checks is. The standard, plainly: every claim in the document backed by an artifact from a real session.`,
        extras: [
          table(
            'Deliverable → what it proves → source module',
            ['Section', 'Demonstrates', 'Built from'],
            [
              ['5 real use-cases + routing', 'Tool selection and workflow placement', 'M7 + M10.1'],
              ['10 prompts, before/after', 'The iteration loop, evidenced', 'M6 + M10.2'],
              ['Verification checklist', 'A repeatable trust routine', 'M8 + M9.1'],
              ['Caught hallucination', 'You can detect fabrication in the wild', 'M9.1'],
              ['Ethics rules', 'Honesty, attribution, harm as personal policy', 'M10.3'],
              ['Reflection', 'Metacognition — knowing what still fails', 'Whole course'],
            ],
          ),
          code(
            `# Evidence template for one use-case entry
use_case: "summarise chapter 4 notes into revision cards"
tool:     chat assistant (cloud, training off) - why: pasted notes,
          transformation task, verification by re-reading chapter
workflow: paste -> prompt -> generate -> CHECK (cards vs chapter)
          -> gate: I approve each card -> keep
before:   "make flashcards from this" -> vague Q/A, missing caveats
after:    slots + format + "only claim what the notes state"
change:   format spec + evidence rule (one change, two rounds)
checks:   every card traceable to a note line | no invented facts
result:   used in revision; 1 card fixed by the check`,
            'evidence_template.txt',
            'text',
          ),
          tip(
            'Collect evidence as you go, not at the end',
            'Save each before/after and each caught error the day it happens. Reconstruction from memory produces polished fiction — the exact failure mode this course spent ten modules teaching you to avoid.',
          ),
          warn(
            'Do not manufacture a fake hallucination story',
            'If you have not caught one, run the honest test (five verifiable questions, verify all five) and report the real result — including "none of these failed". Fabricating the evidence would fail the ethics rules in section 5 of your own document.',
          ),
        ],
        worked: {
          title: 'Assemble one complete use-case entry, end to end',
          problem:
            'Neha\'s real task: "read my rough project notes and produce a two-paragraph progress update for my supervisor." Walk the full capstone loop for this single entry and show exactly what gets pasted into the document.',
          steps: [
            {
              title: 'Run it for real with routing and a gate',
              desc: 'Tool: chat assistant — transformation of supplied material, no live facts; data: her own project notes (green bin, no confidential third-party data). Workflow: notes pasted → prompt from library → generate → fact pass (dates, percentages vs her records) → gate: she approves before sending. She runs it and saves the session.',
            },
            {
              title: 'Capture before and after honestly',
              desc: 'Before-prompt: "write a progress update from these notes" → generic, invented a completion percentage. After-prompt: slots ({notes}, {audience}), constraint "use only numbers present in the notes; mark gaps as [ ]", format "two paragraphs, ≤120 words". Save both outputs unedited — the invented percentage is the interesting artefact, not an embarrassment.',
              code_snippet: 'before: "write update from these notes"\n        -> invented "70% complete"\nafter:  "only numbers present; mark gaps [..]"\n        -> "[..] modules done (3 of 5 listed)"',
            },
            {
              title: 'Run the checks and log the result',
              desc: 'Fact pass: one date was wrong in her own notes (she fixed the source, not the output); the invented percentage is caught by the evidence rule before sending. Checklist update: "for progress updates — every number traceable to notes or marked [..]". Entry filed with model, date, failure modes.',
            },
            {
              title: 'Write the reflection fragment',
              desc: 'From this entry alone: improved (no invented numbers after the evidence rule); still fails (dates when her notes are sloppy — supply them explicitly); will not use AI for (the decision about what to tell the supervisor — generation only, judgement hers); maintenance (re-test entry monthly, prune unused). Four honest lines, and the entry is complete.',
            },
          ],
          solution:
            'One real task, fully instrumented: routing decision, workflow with a gate, unedited before/after evidence showing the exact iteration, a check that fired, a library entry with date and failure mode, and four lines of reflection. Repeat four more times across different domains — with your ten prompts distributed among them — and the capstone document is built from artifacts instead of intentions.',
        },
        practice: {
          title: 'Start the document today — use-case one',
          prompt:
            'Create the capstone document with its five section headings. Complete use-case #1 from a task you actually have today: tool choice line, workflow with gate, before/after prompts and outputs saved verbatim, checks run, outcome. Do not wait for five — one evidenced entry beats five planned ones, and momentum compounds.',
          hint: 'Pick a task with a verification handle (something you can check against a source) so your first entry ends with a check that genuinely ran.',
        },
        mistakes: [
          {
            mistake: 'Describing the practice instead of running it',
            fix: 'The document lives or dies on artifacts: real prompts, real outputs, real check marks. A capstone of intentions fails the evidence standard the course taught.',
          },
          {
            mistake: 'Importing impressive prompts you never tested',
            fix: 'Unverified internet prompts are someone else\'s evidence on someone else\'s inputs. Every entry needs a successful run on YOUR task before it enters the ten.',
          },
          {
            mistake: 'Claiming verification that did not happen',
            fix: 'Checklists with aspirational ticks are the exact dishonesty section 5 forbids. Either the check ran (log it) or it did not (say so, then run it).',
          },
          {
            mistake: 'Submitting a tool list rather than a toolkit',
            fix: 'Apps opened once are consumption. A toolkit is tasks + routing rules + prompts + checks + maintenance — five tasks with evidence, not five logos.',
          },
        ],
        exam: {
          question:
            'Why does the capstone require before/after outputs from actual runs rather than a list of prompts you have collected?',
          answer:
            'Because the course\'s central claim is behavioural, not informational: that you can run an iteration loop (specify → run → diagnose → change one thing → retest) and judge the result with checks. A list demonstrates exposure; before/after artifacts demonstrate the loop working — the naive output shows the failure that motivated the change, the improved output shows its effect, and the one-line change note shows causal attribution rather than coincidence. Evidence from your own runs also proves the prompts fit your tasks (generalisation with slots, tested on real inputs) and that verification actually executed (check marks against saved outputs). In short: prompts are cheap, and collection is easy; a documented, verifiable practice is the thing worth certifying.',
          source: 'Capstone-defence question; mirrors portfolio-assessment logic in skills-based courses.',
        },
        summary: [
          'Build one document: 5 real use-cases · 10 before/after prompts · verification checklist · caught hallucination · ethics rules.',
          'Every section is evidence-backed: saved sessions, unedited outputs, executed checks, dated entries.',
          'Hallucination section: report a real catch — or run the honest five-question test and report what happened.',
          'Reflect honestly: what improved, what still fails, what you refuse to automate, how the library is maintained.',
          'The standard: you finish the course with a practice you can show, defend and keep running.',
        ],
      }),
      [
        [
          'The primary purpose of the before/after prompt section in the capstone is to:',
          [
            'Make the document longer',
            'Evidence the iteration loop: a real failure, a specific change, and its measured effect',
            'Show off prompt style',
            'Compare different AI vendors',
          ],
          1,
          'Unedited outputs plus the change note demonstrate diagnose→edit→retest actually happening on your own tasks.',
        ],
        [
          'You have not yet caught a hallucination. The honest capstone move is to:',
          [
            'Invent a plausible one to complete the section',
            'Run a deliberate test — five checkable claims, verify all five — and report the real outcome',
            'Skip the section silently',
            'Claim hallucinations are rare and move on',
          ],
          1,
          'Manufactured evidence would violate the ethics rules the same document asserts; a real test yields a real result either way.',
        ],
        [
          'Which item belongs in the reflection section?',
          [
            'A summary of all course videos',
            'What improved, what still fails, what you will not automate, and how the library will be maintained',
            'A list of every AI tool on the market',
            'Copied prompts from the internet',
          ],
          1,
          'Reflection converts activity into a practice: honest deltas, known residual risks, refusal list, and a maintenance plan.',
        ],
        [
          'The capstone verification checklist should be:',
          [
            'A generic list copied from a blog',
            'Your own repeatable checks tailored to your five use-cases, with evidence they ran',
            'Optional, since prompts now include checks',
            'A list of AI detection tools',
          ],
          1,
          'Tailored, executed checks are the deliverable; generic or tool-detector lists are substitutes for the discipline itself.',
        ],
      ]
    ),
  ],
};
