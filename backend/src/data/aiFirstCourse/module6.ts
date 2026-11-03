// AI.FIRST — Module 6 · VERIFY · AI for research, study & analysis
import type { CourseModule } from '../db';
import { nineBlocks, diagram, table, tip, warn, code } from '../nineBlocks';
import { lesson, proofOfWork, M, COURSE_ID } from './helpers';

const ID = M(6);

export const module6: CourseModule = {
  id: ID,
  course_id: COURSE_ID,
  title: 'Module 6 — AI for Research, Study & Analysis',
  summary:
    'Pillar VERIFY in practice. Research with AI search and deep-research tools, learning with AI without outsourcing your brain, data analysis you can defend, and writing with AI honestly.',
  sort_order: 6,
  lessons: [
    lesson(
      ID,
      'aif-m6-1',
      1,
      'Research with AI Search and Deep-Research Tools',
      'Search-grounded answers, deep-research reports and literature tools — a workflow that uses their speed without inheriting their errors.',
      42,
      nineBlocks({
        objectives: [
          'Choose between a chat model, AI search and a deep-research tool for a research question',
          'Run a research workflow: scope, search, read primaries, synthesise, verify',
          'Write research questions that produce useful, checkable answers',
        ],
        hook:
          'A final-year student needs a literature review on low-cost water-quality sensors in 48 hours. A deep-research tool produces a 12-page report with 40 citations in eight minutes. Three of the citations do not support what the report says; two key 2025 papers are missing; and one "finding" comes from a vendor blog. The tool saved her two days of searching — and would have cost her the review if she had submitted it unread. This lesson is about getting the first part without the second.',
        concept: `**Three kinds of research tool**
1. **Chat model without search** — answers from training data; fast for concepts and background; **no fresh facts**, risky for citations.
2. **AI search / answer engines** — run web searches and summarise results with links. Good for current facts and quick orientation; quality depends on what they retrieve.
3. **Deep-research modes** — agents that plan, run many searches, read dozens of pages and write a long, cited report over several minutes. Excellent for mapping a topic fast; they can still misread sources, over-weight popular or commercial pages, and miss paywalled or very recent academic work.

Plus **academic tools** — scholarly search engines (Google Scholar, Semantic Scholar and AI-assisted literature tools) that search papers rather than the open web, often with summaries and citation graphs.

**A research workflow that holds up**
1. **Scope** — write the question precisely: population, intervention, outcome, time window, geography. "Low-cost (< ₹5,000) sensors for measuring drinking-water quality in rural India, studies from 2020–2026."
2. **Map** — use deep research or AI search to map the territory: key terms, major papers, competing views, datasets.
3. **Collect primaries** — get the actual papers, reports and datasets; note where each came from.
4. **Read and extract** — read abstracts, methods and results yourself; AI can help extract into a table, but you check the extraction against the paper.
5. **Synthesise** — group findings, note agreements, contradictions and gaps; this is your thinking, assisted.
6. **Verify** — every cited claim checked against the source (Module 5).
7. **Record** — keep a log of queries, tools and dates so the work is reproducible.

**Ask for disagreement.** "What are the strongest counter-findings?" and "Which claims rest on a single study?" make reports far more useful than "summarise the research".`,
        extras: [
          diagram(
            'Research workflow with AI',
            `flowchart LR
  Q["Scope the question<br/>who · what · outcome · when · where"] --> MAP["Map with AI search / deep research"]
  MAP --> P["Collect primary papers, reports, datasets"]
  P --> R["Read + extract into a table<br/>you check every row"]
  R --> SYN["Synthesise: agreements, contradictions, gaps"]
  SYN --> V["Verify every cited claim"]
  V --> LOG["Log queries, tools, dates"]
  MAP -.->|"never cite the AI report itself"| P`
          ),
          table('Which tool for which question?', ['Question', 'Best start', 'Then'], [
            ['"Explain how reverse osmosis works"', 'Chat model', 'Check one textbook source'],
            ['"What did RBI announce this week?"', 'AI search', 'Open the RBI press release'],
            ['"State of research on low-cost water sensors"', 'Deep research + scholarly search', 'Read primaries; build an extraction table'],
            ['"Market size of EV chargers in India"', 'Deep research', 'Trace each figure; compare methodologies'],
          ]),
          tip(
            'The extraction table',
            'For every paper: citation, year, sample/setting, method, key result (with number), limitations, your relevance note. Ask AI to draft rows — then check each row against the paper. This table is your literature review\'s backbone.',
          ),
        ],
        worked: {
          title: 'Rescue the 48-hour literature review',
          problem:
            'The student has the deep-research report. Turn it into a defensible review in the remaining time.',
          steps: [
            { title: 'Extract the citations', desc: 'List all 40 citations; drop vendor blogs and news unless used only as context.' },
            { title: 'Check and triage', desc: 'Open each academic citation; mark supports / partially / does not support. Remove the three that do not support their claims.' },
            { title: 'Fill the gaps', desc: 'Search a scholarly engine for 2025–2026 papers with the key terms; add the two missing important studies.' },
            { title: 'Build the table', desc: 'An extraction table of the ~20 strongest studies, checked row by row.' },
            { title: 'Write and disclose', desc: 'Write the synthesis in her own words, citing primaries only, and disclose AI assistance per her institution\'s policy.' },
          ],
          solution:
            'The AI report became a map, not the product. Checked citations, added recent primaries, her own synthesis and honest disclosure produced a review she can defend in a viva.',
        },
        practice: {
          title: 'Map and verify a topic',
          prompt:
            'Pick a research question from your field. Write it in scoped form. Run one AI search or deep-research tool, then verify five of its citations (exists, metadata, supports the claim). Report the hit rate and one important source it missed that you found yourself.',
          hint: 'Search a scholarly engine with the most specific term from the report to find missed recent work.',
        },
        mistakes: [
          {
            mistake: 'Citing the AI-generated report as a source',
            fix: 'The report is a map. Cite the primary sources you read and verified.',
          },
          {
            mistake: 'Vague research questions',
            fix: 'Scope population, outcome, time window and geography. Vague questions get popular, generic answers.',
          },
          {
            mistake: 'Accepting the report\'s framing',
            fix: 'Ask explicitly for counter-evidence, single-study claims and what is missing.',
          },
        ],
        exam: {
          question: 'How do you use AI tools in a literature review without compromising academic integrity?',
          answer:
            'I use AI search and deep-research tools to map the field — terms, key papers, competing views — then collect and read the primary sources myself. AI can help draft an extraction table, but I check each row against the paper. I verify every citation exists and supports the claim, write the synthesis in my own words, cite only primary sources, keep a log of tools and queries, and disclose AI use according to my institution\'s policy.',
          source: 'Research internships, MS/PhD interviews and viva examinations.',
        },
        summary: [
          'Chat for concepts; AI search for current facts; deep research to map a topic.',
          'Workflow: scope → map → primaries → extract → synthesise → verify → log.',
          'The AI report is a map; cite primaries you read.',
          'Ask for counter-evidence and gaps, not just summaries.',
        ],
      }),
      [
        ['Which tool is best for "what did a regulator announce this week?"', ['A chat model without search', 'AI search, then the regulator\'s own release', 'A diffusion model', 'An old textbook'], 1, 'Fresh facts need search and the primary source.'],
        ['A deep-research report is best treated as:', ['A final citable source', 'A map of the topic to guide reading of primary sources', 'Always wrong', 'A replacement for reading'], 1, 'Map, not product.'],
        ['A well-scoped research question specifies:', ['Only the topic word', 'Population, outcome, time window and geography', 'The answer you want', 'The tool to use'], 1, 'Scope produces checkable answers.'],
        ['An extraction table drafted by AI should be:', ['Submitted as is', 'Checked row by row against each paper', 'Deleted', 'Shortened'], 1, 'Extraction errors are common.'],
      ]
    ),
    lesson(
      ID,
      'aif-m6-2',
      2,
      'Learning with AI Without Outsourcing Your Brain',
      'Tutor mode, retrieval practice, Socratic questioning and spaced review — how to use AI so you actually get smarter, and the integrity line.',
      42,
      nineBlocks({
        objectives: [
          'Use AI as a tutor that makes you think: Socratic mode, explain-back, worked-example fading',
          'Apply retrieval practice and spaced repetition with AI-generated questions',
          'Draw the line between assistance and academic misconduct under typical college policies',
        ],
        hook:
          'Two students prepare for the same data-structures exam with the same AI assistant. One asks it to explain every topic and reads the answers — it feels productive. The other asks it to quiz her, refuses to see answers until she has tried, and explains concepts back for critique. In studies of learning, what the first student does tends to feel easier but sticks less; what the second does feels harder and works. AI can make you much smarter or quietly much weaker, depending on which of these you do.',
        concept: `**The learning science in one paragraph.** Durable learning comes from **effortful retrieval** (recalling without looking), **spacing** (revisiting over days), **interleaving** (mixing problem types), **elaboration** (explaining why), and **feedback**. Re-reading and passively watching feel fluent but transfer poorly. AI is dangerous when it removes effort and powerful when it supplies feedback.

**Five tutor patterns that work**
1. **Socratic tutor** — "Teach me by asking questions. Do not give the answer; give a hint only after I try twice."
2. **Explain-back** — you explain a concept in your words; AI critiques gaps and misconceptions.
3. **Quiz generator with spacing** — "Make 10 questions on hashing from my notes, mixed difficulty; after I answer, mark them, explain errors, and list the topics to revisit in 3 days."
4. **Worked-example fading** — a full worked example, then a similar problem with the last step missing, then two steps missing, then a fresh problem.
5. **Misconception hunter** — "List the five most common misconceptions about recursion; test me on each."

Ground the tutor in **your syllabus and notes** (Module 4) so questions match what you are examined on.

**Productive struggle first.** Try every problem yourself before asking. Use AI to check, hint and explain your *error* — not to replace the attempt.

**The integrity line.** Policies differ between institutions and between courses; read yours. Common ground in 2026:
- Usually acceptable: explanations, practice questions, feedback on your own draft, grammar help, brainstorming — often with **disclosure**.
- Usually not acceptable: submitting AI-generated work as your own, AI during closed exams, fabricated data or citations, using AI where the assignment forbids it.
- When unsure, **ask the instructor and disclose**. AI-text detectors are unreliable and can falsely flag honest work — the protection is a transparent process: drafts, notes and a disclosure statement.`,
        extras: [
          diagram(
            'Effortful vs passive AI use',
            `flowchart TB
  P["Problem or topic"] --> T{"Did you try it first?"}
  T -->|"no — ask for the answer"| PA["Passive: read the explanation"]
  PA --> F1["Feels fluent · forgets fast"]
  T -->|"yes — attempt, then ask"| AC["Active: AI hints, marks, explains your error"]
  AC --> RP["Retrieval quiz + spaced review in 3 days"]
  RP --> F2["Feels harder · sticks"]`
          ),
          code(
            `You are my Socratic tutor for {subject}, using ONLY my notes below.
<notes>
{paste your notes or syllabus unit}
</notes>
Rules:
1. Ask me one question at a time, starting easy and getting harder.
2. Never give the answer before I have tried twice. First give a hint.
3. After each answer: say correct / partly / wrong, explain the misconception in 2 lines.
4. Every 5 questions, ask me to explain one concept back in my own words and critique it.
5. At the end, list my 3 weakest topics and make a 3-day spaced revision plan.`,
            'socratic-tutor.txt',
            'text'
          ),
          warn(
            'AI detectors are not proof',
            'Detection tools have significant false-positive rates, including for non-native English writers. Protect yourself with a transparent process: keep drafts and notes, and disclose AI use as your institution requires.',
          ),
        ],
        worked: {
          title: 'A 5-day exam plan with AI',
          problem:
            'Data-structures exam in 5 days: trees, graphs, hashing, sorting. Design an AI-assisted plan that uses learning science.',
          steps: [
            { title: 'Day 1', desc: 'Diagnostic: AI quizzes 20 mixed questions from the syllabus; you answer without notes; it ranks weak topics.' },
            { title: 'Days 2–3', desc: 'Weakest topics: worked-example fading for 3 problems each; explain-back of each core concept.' },
            { title: 'Day 4', desc: 'Interleaved quiz across all four topics; spaced retest of Day 1 misses.' },
            { title: 'Day 5', desc: 'Timed mock paper generated in your exam\'s format; mark it; review only the errors.' },
          ],
          solution:
            'The plan uses retrieval, spacing, interleaving and feedback. AI provides questions, hints and critique; every answer is your own attempt first.',
        },
        practice: {
          title: 'Run a Socratic session',
          prompt:
            'Use the Socratic tutor template with one unit of your own syllabus for 20 minutes. Afterwards, write: three things you got wrong, one misconception you did not know you had, and your spaced review date.',
          hint: 'If the AI gives answers too early, restate rule 2 firmly.',
        },
        mistakes: [
          {
            mistake: 'Asking for explanations of everything and reading them',
            fix: 'Attempt first; use AI for hints, marking and explaining your specific errors.',
          },
          {
            mistake: 'Assuming the policy from another course or college applies',
            fix: 'Read the specific policy; ask the instructor when unclear; disclose.',
          },
        ],
        exam: {
          question: 'How should students use generative AI for learning without harming learning or integrity?',
          answer:
            'Use it to create effort, not remove it: attempt problems first, then use AI as a Socratic tutor for hints, to generate retrieval quizzes from your own syllabus, to critique your explanations and to schedule spaced review. Keep it grounded in your course material. Follow your institution\'s policy, disclose AI assistance where required, never submit AI-generated work as your own, and keep drafts and notes as evidence of your process.',
          source: 'Common in education-policy discussions, teaching roles and college interviews.',
        },
        summary: [
          'Learning sticks through retrieval, spacing, interleaving, elaboration and feedback.',
          'Tutor patterns: Socratic, explain-back, spaced quizzes, example fading, misconception hunting.',
          'Attempt first; AI hints and marks.',
          'Know your policy, disclose, keep your process visible.',
        ],
      }),
      [
        ['Which study approach produces more durable learning?', ['Re-reading AI explanations', 'Attempting recall first, then getting feedback', 'Watching summaries at 2× speed', 'Highlighting'], 1, 'Effortful retrieval with feedback.'],
        ['A good Socratic-tutor rule is:', ['Give the answer immediately', 'Give a hint only after the student has tried', 'Never ask questions', 'Write the assignment'], 1, 'Productive struggle first.'],
        ['AI-text detectors are best described as:', ['Reliable proof of misconduct', 'Unreliable, with false positives — not proof', 'Always accurate for English', 'Illegal'], 1, 'They can wrongly flag honest work.'],
        ['When unsure whether AI use is allowed on an assignment, you should:', ['Use it and hide it', 'Check the policy, ask the instructor and disclose', 'Assume it is allowed', 'Use a detector'], 1, 'Transparency protects you.'],
      ]
    ),
    lesson(
      ID,
      'aif-m6-3',
      3,
      'Data Analysis with AI You Can Defend',
      'From spreadsheet to insight with AI code tools: cleaning, analysis, charts and the statistical sanity checks that keep you honest.',
      44,
      nineBlocks({
        objectives: [
          'Use AI data-analysis tools (code interpreters, spreadsheet copilots) with a reproducible workflow',
          'Apply statistical sanity checks: sample size, correlation vs causation, outliers, base rates',
          'Produce honest charts and an analysis summary you can defend line by line',
        ],
        hook:
          'A placement cell uploads two years of results to an AI analysis tool and asks "what predicts getting placed?" The tool replies with a confident chart: students who attended the optional aptitude workshop were placed 31% more often. The principal wants to make the workshop compulsory. But the students who chose to attend were already the most motivated — and the analysis never asked about that. AI made the chart in 20 seconds. Only a person who knows the right questions can tell whether it means anything.',
        concept: `**How AI analysis tools work.** Code-interpreter-style tools write and run Python (pandas, matplotlib) on your file in a sandbox; spreadsheet copilots write formulas, pivots and charts. They are fast and usually competent at mechanics. Their weak points are **judgement**: what to clean, what to compare, what a result means.

**A defensible workflow**
1. **State the question** and the decision it informs.
2. **Profile the data first** — rows, columns, types, missing values, duplicates, ranges. Ask the tool to show this before any analysis.
3. **Clean deliberately** — decide yourself how to handle missing values, duplicates and outliers; record each decision.
4. **Analyse** — descriptive statistics first, then comparisons. Ask for the **code** and keep it.
5. **Sanity-check** (below).
6. **Chart honestly** — zero-based axes for bars, labelled units, no 3-D, title states the finding.
7. **Summarise** with limitations.

**Statistical sanity checks AI often skips**
- **Sample size** — a 31% difference between groups of 12 people is noise-prone. Ask for counts and confidence intervals.
- **Correlation ≠ causation** — workshop attendance correlates with placement, but motivated students self-selected. Look for **confounders**; only a fair comparison (ideally randomised) supports causal claims.
- **Base rates** — "70% of placed students used the portal" means little if 70% of all students used it.
- **Simpson's paradox** — a trend in combined data can reverse inside every subgroup (for example by branch). Break results down.
- **Outliers** — one ₹1.2 crore package distorts an average; report medians too.
- **Multiple comparisons** — test 40 variables and some will look "significant" by chance.

**Privacy**: student and customer data are personal data. Remove names and IDs before uploading, use tools approved by your institution, and follow data-protection rules (Module 10).`,
        extras: [
          diagram(
            'Defensible AI-assisted analysis',
            `flowchart LR
  Q["Question + decision"] --> PR["Profile data<br/>types · missing · duplicates"]
  PR --> CL["Clean deliberately<br/>log every decision"]
  CL --> AN["Analyse — keep the code"]
  AN --> SC{"Sanity checks<br/>n · confounders · base rate · subgroups · outliers"}
  SC -->|"fails"| AN
  SC -->|"passes"| CH["Honest chart"]
  CH --> SUM["Summary + limitations"]`
          ),
          code(
            `import pandas as pd

df = pd.read_csv("placements_anonymised.csv")

# 1. Profile before anything else
print(df.shape)
print(df.dtypes)
print(df.isna().sum())
print(df.duplicated().sum())

# 2. The naive comparison an AI tool will happily produce
print(df.groupby("attended_workshop")["placed"].agg(["mean", "count"]))

# 3. Check a confounder: was attendance related to prior performance?
df["cgpa_band"] = pd.cut(df["cgpa"], bins=[0, 6.5, 7.5, 8.5, 10])
print(df.groupby("attended_workshop", observed=True)["cgpa"].median())

# 4. Compare WITHIN bands (guards against Simpson's paradox)
print(df.pivot_table(index="cgpa_band", columns="attended_workshop",
                     values="placed", aggfunc=["mean", "count"], observed=True))

# 5. Packages: report median, not only mean
print(df.loc[df["placed"] == 1, "package_lpa"].describe())`,
            'placement_analysis.py',
            'python'
          ),
          table('Claim → required check', ['Claim the tool makes', 'Ask'], [
            ['"Group A did 31% better"', 'How many in each group? Confidence interval?'],
            ['"X causes Y"', 'Could a third factor explain both? Was assignment random?'],
            ['"Average package rose"', 'Median? Was it one outlier?'],
            ['"Overall trend is up"', 'Does it hold within each branch/year?'],
            ['"Variable Z is significant"', 'How many variables were tested?'],
          ]),
        ],
        worked: {
          title: 'Is the workshop really the cause?',
          problem:
            'Workshop attendees: 62% placed (n = 210). Non-attendees: 47% placed (n = 390). Median CGPA of attendees 8.1 vs 7.2. Within CGPA bands the gap shrinks to 2–5 percentage points. What do you tell the principal?',
          steps: [
            { title: 'Raw gap', desc: '62% vs 47% looks large — but the groups differ before the workshop.' },
            { title: 'Confounder', desc: 'Attendees had a much higher median CGPA — stronger students chose to attend.' },
            { title: 'Within-band comparison', desc: 'Comparing students with similar CGPA, the gap falls to 2–5 points — a possible small benefit, not proven.' },
            { title: 'Recommendation', desc: 'Do not claim the workshop causes a 15-point rise. Offer it widely and run a fair comparison next year (for example randomly assigned batches or a phased rollout).' },
          ],
          solution:
            '"Most of the difference is explained by who chose to attend. A small benefit is possible but unproven; let us measure it fairly next year before making it compulsory." That sentence is the value a human analyst adds.',
        },
        practice: {
          title: 'Interrogate an AI analysis',
          prompt:
            'Take any public dataset (for example from data.gov.in) and ask an AI analysis tool a "what predicts X?" question. Then run the five sanity checks on its answer. Write a 150-word summary that states only what the data supports, plus limitations.',
          hint: 'Ask the tool for group counts and a breakdown by one subgroup — and read the code it ran.',
        },
        mistakes: [
          {
            mistake: 'Accepting a causal conclusion from observational data',
            fix: 'Name possible confounders; use language like "associated with" unless there was a fair, ideally randomised, comparison.',
          },
          {
            mistake: 'Letting the tool clean data silently',
            fix: 'Ask it to report every cleaning step and decide yourself; keep the code.',
          },
          {
            mistake: 'Uploading identifiable personal data to an unapproved tool',
            fix: 'Anonymise first and use approved tools only.',
          },
        ],
        exam: {
          question: 'An AI tool tells you that customers who use feature X are 40% more likely to renew. Do you recommend pushing everyone to feature X?',
          answer:
            'Not yet. That is a correlation in observational data — engaged customers may both use feature X and renew for other reasons. I would check group sizes, compare similar customers (by tenure, plan, usage level), look for subgroup reversals and outliers, and then propose a fair test, such as randomly prompting half of new customers towards feature X and comparing renewal. I would report the current result as an association with its limitations.',
          source: 'A classic analytics and product-management interview case.',
        },
        summary: [
          'AI handles mechanics; you own the questions and judgement.',
          'Profile → clean deliberately → analyse with code → sanity-check → honest chart.',
          'Checks: sample size, confounders, base rates, subgroups (Simpson), outliers, multiple tests.',
          'Anonymise personal data and use approved tools.',
        ],
      }),
      [
        ['Workshop attendees were placed more often, but they also had higher CGPA beforehand. CGPA here is a:', ['Label', 'Confounder', 'Outlier', 'Token'], 1, 'A third factor linked to both attendance and outcome.'],
        ['A trend in combined data reverses within every subgroup. This is:', ['Overfitting', 'Simpson\'s paradox', 'Base-rate neglect', 'Leakage'], 1, 'Always break results down by key groups.'],
        ['One ₹1.2 crore package raises the class average sharply. You should also report:', ['The maximum only', 'The median', 'Nothing', 'The minimum only'], 1, 'Medians resist outliers.'],
        ['The first step in any AI-assisted analysis should be:', ['Making a chart', 'Profiling the data: types, missing values, duplicates', 'Writing the conclusion', 'Uploading everything'], 1, 'Know your data before analysing it.'],
      ]
    ),
    lesson(
      ID,
      'aif-m6-4',
      4,
      'Writing and Communicating with AI — Honestly',
      'Drafting, editing and voice; reports, emails and presentations with AI; disclosure; and keeping your own thinking visible.',
      42,
      nineBlocks({
        objectives: [
          'Use AI across the writing process — outline, draft, edit — while keeping your voice and ideas',
          'Avoid the tell-tale signs of generic AI prose and fix them',
          'Write appropriate AI-use disclosures for academic and professional contexts',
        ],
        hook:
          'A hiring manager in Gurugram says she now reads 200 cover letters a week that begin "I am writing to express my keen interest in…" and end "I am confident that my skills and passion make me an ideal fit." She rejects them in seconds, not because AI was used, but because nothing in them could only have been written by that candidate. AI makes writing fast. It also makes generic writing free — so specific, honest writing is now worth more than ever.',
        concept: `**Where AI helps in the writing process**
- **Before**: brainstorming angles, outlining, finding counter-arguments, clarifying the audience.
- **During**: a first draft from *your* notes and points, rewriting a messy paragraph, suggesting structure.
- **After**: editing for clarity, grammar and length; adapting tone for an audience; translating; checking against a rubric.

**Your ideas in, your voice out.** The strongest pattern is **you supply the substance** — facts, experiences, opinions, examples, numbers — and AI helps shape it. "Write a cover letter for an SDE role" gets generic text; "Here are my three projects, what I built, the hardest bug and what I learned — draft a 200-word cover letter in a direct, unpretentious tone, using only these facts" gets something only you could send.

**Generic-AI tells to remove**
- Stock openers and closers ("In today\'s fast-paced world…", "In conclusion…").
- Inflated vocabulary ("delve", "tapestry", "leverage synergies", "pivotal") and empty intensifiers.
- Every paragraph the same length and shape; relentless lists of three.
- Claims without specifics; enthusiasm without evidence.
Fix them by asking for plain language, specific examples, varied sentence length — and by editing yourself.

**Professional formats**
- **Emails**: purpose in the first line, the ask clearly, under 150 words.
- **Reports**: summary first (the answer), then evidence, then detail.
- **Presentations**: one message per slide; AI can draft outlines and speaker notes, but you choose what matters.

**Disclosure**
- **Academic**: follow your institution — typically state the tool, what it was used for, and that you reviewed and take responsibility. Example: "I used an AI assistant to suggest structure and edit grammar; all ideas, analysis and sources are my own and verified by me."
- **Professional**: follow company policy; disclose AI-generated content where it matters to the reader (client deliverables, published content, anything presented as personal testimony).
- **Never**: AI-written content presented as a personal experience, testimonial or review that it is not.`,
        extras: [
          diagram(
            'Your substance, AI-assisted shape',
            `flowchart LR
  Y["Your substance<br/>facts · experiences · opinions · numbers"] --> O["Outline<br/>AI suggests, you choose"]
  O --> D["Draft<br/>AI from YOUR points"]
  D --> E["Edit<br/>clarity · length · tone"]
  E --> YOU["Your pass<br/>voice · accuracy · cut the generic"]
  YOU --> DIS["Disclose per policy"]
  DIS --> S["Send / submit — you own it"]`
          ),
          table('Generic → specific', ['Generic AI draft', 'Specific rewrite'], [
            ['"I am passionate about technology and eager to learn."', '"I rebuilt our hostel\'s mess-feedback form as a small web app; 400 students used it in the first week."'],
            ['"This project leveraged cutting-edge AI to deliver impactful insights."', '"We used a pretrained image model to flag cracked tiles; it caught 87 of 100 cracks in our test set."'],
            ['"In conclusion, effective communication is pivotal."', 'Delete it — end on your strongest specific point.'],
          ]),
          tip(
            'The specificity test',
            'Read each sentence and ask: could anyone else have written this? If yes, add a fact, number, name or experience — or cut it.',
          ),
          proofOfWork(
            6,
            'An analysis report you can defend',
            'Answer a real question with a public dataset using an AI analysis tool: profiled data, cleaning log, honest chart, 300-word summary with limitations and an AI-use disclosure.',
            'Same, as a reproducible notebook: profiling, cleaning decisions in code, analysis, sanity checks (confounder and subgroup), chart and summary — plus a README.',
            'A 2-page decision brief for a leader based on an AI-assisted analysis: the question, the finding, what it does not show, a recommendation with a fair test, and a disclosure line.',
            'Every number traceable to code or a cited source; at least one sanity check that changed or qualified a conclusion; a disclosure statement.'
          ),
        ],
        worked: {
          title: 'Rewrite a generic cover letter',
          problem:
            'An AI draft opens "I am writing to express my keen interest in the Data Analyst position at your esteemed organisation." The candidate built a sales dashboard during an internship that cut weekly reporting from 6 hours to 40 minutes. Rewrite the opening.',
          steps: [
            { title: 'Lead with evidence', desc: 'Open with the strongest specific result relevant to the role.' },
            { title: 'Name the employer\'s need', desc: 'Connect it to what the job posting asks for (for example SQL and dashboards).' },
            { title: 'Plain voice', desc: 'Cut "esteemed", "keen interest" and other filler.' },
          ],
          solution:
            '"During my internship at Rao Distributors I built a Power BI sales dashboard that cut weekly reporting from six hours to forty minutes. Your Data Analyst role asks for SQL and dashboarding — that is the work I most enjoy, and I would like to do it at scale with your team."',
        },
        practice: {
          title: 'Specificity edit',
          prompt:
            'Take a piece of writing you produced with AI help (an SOP, cover letter, report section). Highlight every sentence that fails the specificity test. Rewrite at least five with real facts, then write an appropriate AI-use disclosure for it.',
          hint: 'Numbers, names, outcomes and what you personally did make sentences specific.',
        },
        mistakes: [
          {
            mistake: 'Asking AI to write from nothing',
            fix: 'Give it your substance first; ask it to shape, not invent.',
          },
          {
            mistake: 'Leaving AI-typical filler in final drafts',
            fix: 'Edit for plain language and specifics; your final pass is non-negotiable.',
          },
          {
            mistake: 'Presenting AI-written text as personal testimony or a genuine review',
            fix: 'That is deception. Personal statements must reflect your real experience.',
          },
        ],
        exam: {
          question: 'Is it acceptable to use AI to write a statement of purpose for a master\'s application?',
          answer:
            'It depends on the institution\'s policy, which you should check. Even where assistance is allowed, the substance must be yours — your experiences, motivations and plans — because the document is meant to represent you, and you may be interviewed on it. AI can help outline, tighten language and check grammar from your own draft. Presenting an AI-invented narrative as your own is dishonest and usually easy for reviewers to spot.',
          source: 'Asked in admissions counselling and career-services contexts.',
        },
        summary: [
          'AI helps before (outline), during (draft from your points) and after (edit).',
          'Your substance in; your voice out; cut generic filler.',
          'Specificity test: could anyone else have written this sentence?',
          'Disclose per policy; never fake personal testimony.',
        ],
      }),
      [
        ['The most effective way to get a non-generic AI draft is to:', ['Ask it to "write something impressive"', 'Supply your own facts, experiences and points and ask it to shape them', 'Use a higher temperature', 'Ask for more adjectives'], 1, 'Substance first.'],
        ['Which phrase is a typical sign of generic AI prose?', ['"Our dashboard cut reporting from six hours to forty minutes."', '"In today\'s fast-paced world…"', '"We tested on 100 images."', '"The deadline is 12 March."'], 1, 'Stock openers signal generic writing.'],
        ['A good academic AI-use disclosure states:', ['Nothing', 'The tool, what it was used for, and that you reviewed it and take responsibility', 'Only the tool\'s price', 'That AI wrote everything'], 1, 'Transparent and specific.'],
        ['Writing a fake customer review with AI is:', ['Fine if edited', 'Deceptive and unacceptable', 'Required for marketing', 'Allowed if disclosed in small print'], 1, 'Fabricated testimony deceives readers.'],
      ]
    ),
  ],
};
