// AI.FIRST — Module 5 · R · Verifying AI output
import type { CourseModule } from '../db';
import { nineBlocks, diagram, table, tip, warn, code } from '../nineBlocks';
import { lesson, proofOfWork, M, COURSE_ID } from './helpers';

const ID = M(5);

export const module5: CourseModule = {
  id: ID,
  course_id: COURSE_ID,
  title: 'Module 5 — Verifying AI Output',
  summary:
    'R · Reliable — the heart of the course. A taxonomy of AI errors, lateral reading and source checks, verifying numbers, code and citations, and building a mini evaluation with golden sets and rubrics.',
  sort_order: 5,
  lessons: [
    lesson(
      ID,
      'aif-m5-1',
      1,
      'A Taxonomy of AI Errors',
      'Fabrication is only one of seven ways AI output goes wrong. Name the failure and you know the check.',
      40,
      nineBlocks({
        objectives: [
          'Classify an AI error into one of seven types',
          'Match each error type to the check that catches it',
          'Decide how much verification a task needs from its stakes',
        ],
        hook:
          'A student submits an AI-assisted report. The citations are real papers — but one says the opposite of what the report claims. The statistics are real — but from 2014, presented as current. The code runs — but silently drops rows with missing values. Not one of these is a "hallucination" in the made-up-fact sense, and every one of them would cost marks, money or trust. Verification starts with knowing what you are looking for.',
        concept: `**Seven error types**
1. **Fabrication** — invented facts, people, quotes, cases, papers, URLs. *Check*: does it exist in an authoritative source?
2. **Misattribution / misrepresentation** — a real source cited for something it does not say. *Check*: open the source and find the exact passage.
3. **Staleness** — correct once, outdated now (prices, rules, office-holders, versions, deadlines). *Check*: the date of the source; the official current page.
4. **Reasoning and calculation errors** — wrong arithmetic, a step that does not follow, unit mix-ups. *Check*: recompute independently; redo key steps.
5. **Omission** — the answer is right as far as it goes but leaves out a crucial exception, risk or option. *Check*: a checklist of what a complete answer must cover; ask "what is missing?" of a second source.
6. **Instruction failure** — ignored constraints: wrong length, wrong format, made-up labels, forbidden content. *Check*: compare the output against the brief line by line, or validate in code.
7. **Bias and slant** — one-sided framing, stereotypes, unequal quality across groups or languages. *Check*: counter-prompt ("argue the other side"), compare outputs across groups, consult diverse sources.

**Stakes decide depth.** A brainstorm for fest names needs no verification. A paragraph in your project report needs claims checked. Anything legal, medical, financial, safety-related, or published under your name needs **every** factual claim verified against primary sources — and a human who is accountable.

**The verifiable-claims habit.** Before checking, break the output into **atomic claims**: one checkable statement each ("The DPDP Act was passed in 2023"; "Penalty up to ₹250 crore"). Fluent paragraphs hide errors; lists of claims expose them.

**The professional stance**: you are the editor-in-chief. AI drafts; you sign. "The AI said so" is never a defence — not in a viva, not in a client meeting, not in court.`,
        extras: [
          diagram(
            'From output to verified claims',
            `flowchart TD
  O["AI output"] --> S{"Stakes?"}
  S -->|"low: ideas, drafts for yourself"| L["Light review"]
  S -->|"medium: coursework, internal docs"| A["Split into atomic claims"]
  S -->|"high: legal, medical, money, published"| A
  A --> T["Tag each claim with an error-type risk"]
  T --> C["Run the matching check"]
  C --> V{"All key claims verified?"}
  V -->|"no"| F["Fix, cut or mark as uncertain"]
  F --> C
  V -->|"yes"| P["Publish / submit — you are accountable"]`
          ),
          table('Error type → check', ['Error type', 'Example', 'Check'], [
            ['Fabrication', 'A "2019 IIT study" that does not exist', 'Search authoritative databases/official sites'],
            ['Misattribution', 'Real paper cited for a claim it never makes', 'Open the source; find the passage'],
            ['Staleness', '"Current" repo rate from two years ago', 'Official current source with date'],
            ['Reasoning/calculation', 'EMI computed with annual, not monthly, rate', 'Recompute independently'],
            ['Omission', 'Visa steps missing a mandatory form', 'Completeness checklist; second source'],
            ['Instruction failure', '700 words when 300 requested', 'Compare against the brief / validate in code'],
            ['Bias/slant', 'Career advice differing by gender of the name', 'Swap-test and counter-prompt'],
          ]),
          warn(
            '"The AI said so" is not a source',
            'An AI answer is never the citation. Cite the primary source you verified — and if you could not verify a claim, cut it or label it clearly as unverified.',
          ),
        ],
        worked: {
          title: 'Classify and check five claims',
          problem:
            'An AI summary for a client says: (1) "India\'s DPDP Act was enacted in 2023." (2) "It applies only to companies with over 100 employees." (3) "Penalties go up to ₹250 crore per instance." (4) "A 2021 NITI Aayog report found 87% compliance." (5) "Therefore most firms need no changes." Classify risks and choose checks.',
          steps: [
            { title: 'Claim 1', desc: 'Low risk; check the official gazette or MeitY page. It is correct: the Digital Personal Data Protection Act received assent in August 2023.' },
            { title: 'Claim 2', desc: 'High risk of fabrication — no such employee threshold exists in the Act. Check the Act text. Cut.' },
            { title: 'Claim 3', desc: 'Check the Act\'s schedule of penalties; the maximum in the schedule is ₹250 crore. Verify the exact wording before quoting.' },
            { title: 'Claim 4', desc: 'Likely fabrication or misattribution — a 2021 report cannot measure compliance with a 2023 Act. Cut unless found.' },
            { title: 'Claim 5', desc: 'A reasoning error built on false claims 2 and 4. Cut and rewrite.' },
          ],
          solution:
            'Only claims 1 and 3 survive verification. Claims 2 and 4 were invented and claim 5 depended on them. Splitting into atomic claims made this visible in minutes.',
        },
        practice: {
          title: 'Atomic-claims drill',
          prompt:
            'Ask an assistant for a 200-word explainer on a topic in your field. Split it into atomic claims (aim for 10+). Tag each with its error-type risk and verify the five riskiest. Report how many survived unchanged.',
          hint: 'Numbers, dates, names and "studies show" phrases are the riskiest claims.',
        },
        mistakes: [
          {
            mistake: 'Checking only whether facts "sound right"',
            fix: 'Plausibility is exactly what models optimise. Check against sources, not intuition.',
          },
          {
            mistake: 'Verifying the citations exist but not what they say',
            fix: 'Misattribution is common. Open each source and find the supporting passage.',
          },
        ],
        exam: {
          question: 'An AI tool produced a report for your manager. How do you verify it before it goes out?',
          answer:
            'I assess stakes first. For anything consequential I split the report into atomic claims, prioritise the risky ones — numbers, dates, names, legal or medical statements, and "studies show" claims — and verify each against a primary, current source, opening cited sources to confirm they actually support the claim. I recompute calculations, check completeness against what the report must cover, check the brief\'s constraints, test for one-sidedness, and cut or label anything I cannot verify. Then I own it.',
          source: 'A defining question for AI-literate professionals; expect it in any AI-using role.',
        },
        summary: [
          'Seven errors: fabrication, misattribution, staleness, reasoning, omission, instruction failure, bias.',
          'Each error type has a matching check.',
          'Split fluent text into atomic claims; verify the risky ones.',
          'Stakes set depth; you are accountable for what you submit.',
        ],
      }),
      [
        ['A real paper is cited, but it does not support the claim. This error type is:', ['Fabrication', 'Misattribution', 'Staleness', 'Instruction failure'], 1, 'Real source, wrong claim.'],
        ['An AI quotes an interest rate that was correct two years ago. This is:', ['Bias', 'Staleness', 'Fabrication', 'Omission'], 1, 'Once correct, now outdated.'],
        ['The first step in verifying a long AI answer is to:', ['Read it for flow', 'Split it into atomic, checkable claims', 'Ask the AI if it is sure', 'Shorten it'], 1, 'Atomic claims expose errors.'],
        ['Which output needs the deepest verification?', ['Brainstormed event names', 'A personal to-do list', 'Medical dosage guidance published under your name', 'A draft tweet you will not post'], 2, 'High stakes demand primary-source verification of every claim.'],
      ]
    ),
    lesson(
      ID,
      'aif-m5-2',
      2,
      'Lateral Reading and Source Checking',
      'How professional fact-checkers verify: leave the page, check the source, trace claims upstream — with AI-era tactics for synthetic content.',
      42,
      nineBlocks({
        objectives: [
          'Apply lateral reading to check a source in under five minutes',
          'Trace a claim upstream to its primary source',
          'Rank sources by authority and recency for a given question',
        ],
        hook:
          'Researchers at Stanford compared professional fact-checkers with historians and university students on evaluating unfamiliar websites. The fact-checkers were faster and more accurate — not because they read more carefully, but because they barely read the page at all. Within seconds they opened new tabs to find out who was behind it. That habit — lateral reading — is the single best defence against polished misinformation, human or AI-made.',
        concept: `**Vertical vs lateral reading.** Vertical reading stays on the page and judges it by how it looks — design, tone, references. Polished sites, and AI-written text, pass that test easily. **Lateral reading** leaves the page: open new tabs and ask *who is behind this, and what do others say about them and this claim?*

**SIFT — a four-move routine** (developed by digital-literacy educator Mike Caulfield)
1. **Stop** — notice your reaction; do you know this source?
2. **Investigate the source** — who publishes it, what is their expertise and agenda?
3. **Find better coverage** — search the claim itself; do reliable outlets or official bodies report it?
4. **Trace to the original** — follow quotes, statistics and images back to where they first appeared.

**Source hierarchy (most to least authoritative for factual claims)**
- **Primary/official**: the law's text (India Code, the Gazette), the regulator (RBI, SEBI, UGC, AICTE), the court judgment, the dataset publisher, the company's own filing, the peer-reviewed paper itself.
- **Reputable secondary**: established news organisations with corrections policies, academic reviews, standard references.
- **Tertiary/aggregators**: encyclopaedias, explainers — fine for orientation, not for final citation.
- **Unverified**: forwarded messages, anonymous blogs, social posts, AI outputs.

**AI-era tactics**
- **Search the exact claim** in quotes; fabricated statistics often have zero independent mentions.
- **Check the date** on everything — staleness is a top error.
- **Reverse image search** suspected photos; check for AI-generation signs and provenance labels (for example C2PA "content credentials") where available. Absence of a label proves nothing either way.
- **Use AI to find, not to confirm**: AI search tools are good at locating candidate sources — then you open and read them.
- **Beware content farms**: whole websites can now be AI-generated, mutually citing one another. Many sources agreeing is meaningful only if they are independent.`,
        extras: [
          diagram(
            'SIFT — lateral reading routine',
            `flowchart LR
  S["Stop<br/>do I know this source?"] --> I["Investigate the source<br/>who, expertise, agenda"]
  I --> F["Find better coverage<br/>what do reliable sources say?"]
  F --> T["Trace to the original<br/>quote · statistic · image"]
  T --> D{"Verified by a primary source?"}
  D -->|"yes"| U["Use and cite the primary source"]
  D -->|"no"| X["Cut or label unverified"]`
          ),
          table('Where to verify common Indian claims', ['Claim about…', 'Go to'], [
            ['A law or its text', 'India Code / the official Gazette / the ministry website'],
            ['Interest rates, banking rules', 'RBI notifications and press releases'],
            ['University or course approval', 'UGC / AICTE official lists'],
            ['A court judgment', 'Official Supreme Court / High Court websites'],
            ['Official statistics', 'MoSPI, Census and the ministry data portals'],
            ['A company\'s numbers', 'Its annual report, stock-exchange filings'],
          ]),
          tip(
            'Five-minute rule',
            'If you cannot find independent, authoritative confirmation of a claim within about five minutes of lateral reading, treat it as unverified until proven otherwise.',
          ),
        ],
        worked: {
          title: 'Verify a viral "scholarship" claim',
          problem:
            'A message says: "Government launches ₹50,000 AI scholarship for all engineering students — apply by Friday at this link." An AI assistant you asked said it "appears to be a legitimate scheme". Verify.',
          steps: [
            { title: 'Stop', desc: 'Urgency, a large amount, "all students" and an unknown link are classic scam markers. The assistant\'s view is not a source.' },
            { title: 'Investigate the source', desc: 'The link domain is not a government domain (official Indian sites typically use gov.in or nic.in). Red flag.' },
            { title: 'Find better coverage', desc: 'Search the scheme name on the ministry\'s site, the National Scholarship Portal and PIB. Nothing found.' },
            { title: 'Trace', desc: 'Search the exact wording: it matches a known fake-scheme pattern flagged by fact-checkers.' },
          ],
          solution:
            'Unverified and very likely a phishing scam. Do not click; report it; warn the group with the official portal link. Note that the AI assistant\'s reassurance was wrong — it is a finder, not a judge.',
        },
        practice: {
          title: 'Lateral-read three sources',
          prompt:
            'Pick three sources that came up in a recent AI-assisted search on a topic you care about. For each, run SIFT in five minutes and record: owner, expertise, independent coverage and whether you traced the key claim to a primary source.',
          hint: 'Check the "About" page last, not first — what others say about a source matters more than what it says about itself.',
        },
        mistakes: [
          {
            mistake: 'Judging credibility by design and tone',
            fix: 'Polish is cheap, especially with AI. Leave the page and investigate the source.',
          },
          {
            mistake: 'Counting agreeing sources without checking independence',
            fix: 'Ten pages copying one press release — or one AI-generated network — is one source.',
          },
          {
            mistake: 'Citing an encyclopedia or explainer as final evidence',
            fix: 'Use them to orient, then trace to the primary source and cite that.',
          },
        ],
        exam: {
          question: 'What is lateral reading and why does it matter more in the AI era?',
          answer:
            'Lateral reading means leaving a page to check who is behind it and what independent, reliable sources say about it and its claims, rather than judging the page by its own content and appearance. It matters more now because AI makes polished, plausible text and whole websites cheap to produce, so surface quality no longer signals reliability — only independent confirmation and tracing claims to primary sources do.',
          source: 'Media-literacy and research roles; also common in journalism and policy interviews.',
        },
        summary: [
          'Lateral reading: leave the page; investigate the source.',
          'SIFT: Stop, Investigate, Find better coverage, Trace to the original.',
          'Cite primary/official sources; use AI to find, not to confirm.',
          'Independence matters more than the number of agreeing pages.',
        ],
      }),
      [
        ['Lateral reading means:', ['Reading every line carefully', 'Leaving the page to check who is behind it and what others say', 'Reading from right to left', 'Skimming headings'], 1, 'Professional fact-checkers verify sources by leaving the page.'],
        ['In SIFT, "T" stands for:', ['Trust', 'Trace claims to the original source', 'Type', 'Translate'], 1, 'Trace quotes, statistics and images upstream.'],
        ['The best source for the current text of an Indian law is:', ['A blog summary', 'India Code / the official Gazette', 'An AI chat answer', 'A forwarded message'], 1, 'Primary official sources first.'],
        ['Ten websites repeat the same statistic, all copying one press release. This is:', ['Strong independent confirmation', 'Effectively one source', 'Proof the statistic is true', 'A primary source'], 1, 'Independence, not count, matters.'],
      ]
    ),
    lesson(
      ID,
      'aif-m5-3',
      3,
      'Verifying Numbers, Code and Citations',
      'Recompute, test, and trace: the three checks for the outputs that most often look right and are wrong.',
      44,
      nineBlocks({
        objectives: [
          'Verify AI-produced calculations with independent recomputation and sanity checks',
          'Verify AI-written code with tests, edge cases and reading — not just "it runs"',
          'Verify citations: existence, correct metadata, and support for the claim',
        ],
        hook:
          'An AI assistant computes a home-loan EMI for a family: ₹42,000 a month. The real figure is about ₹45,000. A ₹3,000 gap sounds survivable until it is multiplied by 240 months — about ₹7 lakh — and the family has budgeted to the rupee. The model applied a slightly wrong formula and presented the result with two decimal places of false precision. Numbers, code and citations are where "looks right" is most dangerous — and where checking is most mechanical.',
        concept: `**Numbers: recompute, do not re-ask.** Asking the same model "are you sure?" mostly gets the same answer or a sycophantic change. Instead:
- **Recompute independently** — a spreadsheet, a calculator, or code you can read. Many assistants can run code; ask them to *compute with code and show it*, then read the code.
- **Sanity-check magnitude** — estimate roughly first. If ₹50 lakh at ~9% for 20 years "costs ₹2,000 a month", something is wrong.
- **Check units and definitions** — annual vs monthly rates, lakh vs million, percent vs percentage points, crore conversions.
- **Check the inputs** — a perfect calculation on the wrong figure is still wrong.

**Code: test it, do not trust it.**
- **Read it** — understand every line you ship; ask the model to explain any part you do not follow.
- **Run tests** — write (or ask for) unit tests that include **edge cases**: empty input, zero, negative numbers, missing values, very large inputs, wrong types.
- **Check silent behaviour** — dropped rows, swallowed exceptions, off-by-one loops, timezone assumptions.
- **Check dependencies** — AI sometimes suggests packages that do not exist; attackers have registered such names to distribute malware ("slopsquatting"). Confirm a package is real and reputable before installing.
- **Check security** — hard-coded secrets, SQL built from strings, missing input validation.

**Citations: three checks each**
1. **Exists** — find it in Google Scholar, the publisher's site, a DOI lookup, or an official repository.
2. **Metadata correct** — authors, year, title, venue match.
3. **Supports the claim** — open it and find the passage. This is the check people skip.

**Tool-assisted verification** is legitimate and powerful: code execution for maths, a second model as a critic, search for sources — as long as the final check rests on something independent of the original output.`,
        extras: [
          diagram(
            'Three verification pipelines',
            `flowchart TB
  subgraph NUM["Numbers"]
    n1["Estimate magnitude"] --> n2["Recompute independently"] --> n3["Check units & inputs"]
  end
  subgraph CODE["Code"]
    c1["Read every line"] --> c2["Tests incl. edge cases"] --> c3["Check deps & security"]
  end
  subgraph CITE["Citations"]
    r1["Exists?"] --> r2["Metadata correct?"] --> r3["Supports the claim?"]
  end
  n3 --> OK["Verified"]
  c3 --> OK
  r3 --> OK`
          ),
          code(
            `# Verify an EMI independently: EMI = P * r * (1+r)^n / ((1+r)^n - 1)
P = 50_00_000        # principal: ₹50 lakh
annual_rate = 0.09   # 9% per year
n = 20 * 12          # 240 monthly instalments
r = annual_rate / 12 # MONTHLY rate — the classic mistake is using 0.09 here

emi = P * r * (1 + r) ** n / ((1 + r) ** n - 1)
print(f"EMI: ₹{emi:,.0f}")                       # ≈ ₹44,986
print(f"Total paid: ₹{emi * n:,.0f}")            # ≈ ₹1.08 crore
print(f"Interest: ₹{emi * n - P:,.0f}")

# Edge-case tests for a function you were given
def emi_fn(P, annual_rate, years):
    r, n = annual_rate / 12, years * 12
    if r == 0:
        return P / n          # zero-interest loans must not divide by zero
    return P * r * (1 + r) ** n / ((1 + r) ** n - 1)

assert abs(emi_fn(50_00_000, 0.09, 20) - emi) < 1
assert emi_fn(12_000, 0.0, 1) == 1_000
print("tests passed")`,
            'verify_emi.py',
            'python'
          ),
          warn(
            'Hallucinated packages are a security risk',
            'Before running "pip install" or "npm install" on a name an AI suggested, confirm the package exists on the official registry, is widely used and is maintained. Fake look-alike packages carry malware.',
          ),
        ],
        worked: {
          title: 'Catch the EMI error',
          problem:
            'The family\'s loan is ₹50 lakh at 9% for 20 years. AI output: "EMI ≈ ₹42,000." Verify.',
          steps: [
            { title: 'Estimate', desc: 'Interest alone in month 1 ≈ 50,00,000 × 0.09 / 12 = ₹37,500; EMI must be above that. ₹42,000 is plausible but needs computing.' },
            { title: 'Recompute', desc: 'Using the EMI formula with the monthly rate 0.0075 and n = 240 gives ≈ ₹44,986.' },
            { title: 'Find the cause', desc: 'Asked to show working, the AI had used a rounded factor. The gap ≈ ₹3,000/month ≈ ₹7 lakh over the loan.' },
            { title: 'Report', desc: 'Give the family the verified figure, the total interest (≈ ₹58 lakh), and the bank\'s own amortisation schedule as the authoritative source.' },
          ],
          solution:
            'The verified EMI is ≈ ₹44,986, not ₹42,000. A magnitude estimate made the figure suspicious; independent recomputation proved it; the bank\'s schedule is the source of record.',
        },
        practice: {
          title: 'Three-way verification',
          prompt:
            'Ask an assistant for (1) a calculation from your field, (2) a 15-line function with a stated purpose, and (3) three academic citations on a topic. Verify each with the pipeline above. Record every error found, its type and how you found it.',
          hint: 'For the function, write at least three edge-case tests before reading the AI\'s own tests.',
        },
        mistakes: [
          {
            mistake: 'Asking the model "are you sure?" as verification',
            fix: 'Re-asking is not independent. Recompute, run tests or check sources.',
          },
          {
            mistake: 'Shipping code because it runs on the happy path',
            fix: 'Test edge cases and read for silent failures. Running once proves almost nothing.',
          },
          {
            mistake: 'Checking that a citation exists but not what it says',
            fix: 'Open the source and find the passage that supports the claim.',
          },
        ],
        exam: {
          question: 'You used an AI assistant to write a data-cleaning function. How do you make sure it is correct before using it on real data?',
          answer:
            'I read every line and make sure I understand it, then write tests covering normal input and edge cases — empty data, missing values, duplicates, wrong types, extremes — checking especially for silent behaviour like dropped rows. I run it on a small sample where I know the right answer and compare row counts before and after, confirm any suggested packages are real and reputable, and check for security issues. Only then does it touch real data, and I keep the tests for later changes.',
          source: 'Common in data-analyst and software-engineering interviews in the AI era.',
        },
        summary: [
          'Numbers: estimate, recompute independently, check units and inputs.',
          'Code: read, test edge cases, check silent behaviour, dependencies and security.',
          'Citations: exists → metadata → supports the claim.',
          'Verification must rest on something independent of the original output.',
        ],
      }),
      [
        ['The most reliable way to verify an AI-computed figure is to:', ['Ask "are you sure?"', 'Recompute it independently with a spreadsheet, calculator or readable code', 'Ask a friend', 'Trust two decimal places'], 1, 'Independent recomputation.'],
        ['A common EMI calculation mistake is:', ['Using the monthly rate', 'Using the annual rate where the monthly rate is required', 'Using months for n', 'Rounding the final answer'], 1, 'Rate and period units must match.'],
        ['Before installing a package an AI suggested, you should:', ['Install it immediately', 'Confirm it exists on the official registry and is reputable', 'Rename it', 'Ignore security'], 1, 'Hallucinated package names can be malware.'],
        ['The citation check people most often skip is:', ['Whether the title is in italics', 'Whether the source actually supports the claim', 'The year', 'The page count'], 1, 'Open it; find the passage.'],
      ]
    ),
    lesson(
      ID,
      'aif-m5-4',
      4,
      'Build a Mini Evaluation: Golden Sets and Rubrics',
      'Turn "seems good" into a number: golden sets, rubrics, LLM-as-judge with care, and regression checks when prompts or models change.',
      44,
      nineBlocks({
        objectives: [
          'Build a golden set of test cases with expected outputs for an AI task',
          'Write a scoring rubric and use it consistently, including with an AI judge',
          'Run regression checks when a prompt or model changes',
        ],
        hook:
          'A team improves its prompt for a college FAQ bot. Everyone agrees the new answers "feel better". Two weeks later students complain the bot now gets hostel-fee questions wrong — the new prompt had fixed tone and broken accuracy on one category. Nobody noticed because nobody measured. A 40-question golden set, run in five minutes before the change, would have caught it.',
        concept: `**An evaluation ("eval")** is a repeatable test of an AI system on fixed inputs, with a defined way to score outputs. It is how professionals know — rather than feel — whether something works.

**Golden set**: a fixed collection of test inputs with the expected output or the facts a good answer must contain.
- **Size**: start with 30–50 cases; grow to hundreds for important systems.
- **Coverage**: typical cases, hard cases, edge cases, adversarial cases (tricky phrasings, injection attempts), and **"should refuse / should say not found"** cases.
- **Real**: drawn from actual user questions where possible, with personal data removed.
- **Frozen**: do not tune your prompt by looking at the test answers over and over (that is overfitting again — Module 1). Keep a separate set for development.

**Scoring**
- **Exact or programmatic** where possible: correct label, valid JSON, number within tolerance, required keyword present.
- **Rubric** for open-ended answers: 3–5 criteria, each with a clear scale. For example: *Correct* (0–2), *Grounded in sources* (0–2), *Complete* (0–2), *Follows format* (0–1), *Appropriate refusal* (pass/fail).
- **Human review** of a sample — always, especially at the start.

**LLM-as-judge.** A capable model can score outputs against your rubric at scale. Use it carefully: give it the rubric, the reference answer and the output; ask for a reason before the score; check its agreement with human scores on 20–30 items before trusting it; and remember judges have biases (they often prefer longer answers, and can prefer answers from their own model family). Never let a judge grade without a reference for factual tasks.

**Regression testing.** Every time you change the prompt, the model, the retrieval settings or the documents, **re-run the golden set** and compare per category. A change ships only if it improves the target metric without breaking others. This is how AI work becomes engineering rather than hope.`,
        extras: [
          diagram(
            'The evaluation loop',
            `flowchart LR
  G["Golden set<br/>typical · hard · edge · adversarial · refusal"] --> R["Run the system"]
  R --> S["Score<br/>programmatic + rubric + human sample"]
  S --> C["Compare with previous version, per category"]
  C --> D{"Better overall and no category worse?"}
  D -->|"yes"| SHIP["Ship the change"]
  D -->|"no"| FIX["Revise prompt / model / retrieval"]
  FIX --> R
  SHIP --> MON["Add new real failures to the golden set"]
  MON --> G`
          ),
          table('Example rubric — FAQ bot', ['Criterion', 'Score', 'Definition'], [
            ['Correct', '0 / 1 / 2', '2 = all facts match the reference; 1 = minor error; 0 = wrong'],
            ['Grounded', '0 / 1 / 2', '2 = every fact traceable to the cited document'],
            ['Complete', '0 / 1 / 2', '2 = includes deadlines, amounts and exceptions in the reference'],
            ['Format', '0 / 1', 'Under 120 words, includes a link to the source page'],
            ['Refusal', 'pass / fail', 'Says "not in our documents" when the answer is absent'],
          ]),
          code(
            `# A minimal golden-set runner (pseudo-real Python)
import csv, json

def score(output: str, case: dict) -> dict:
    must = [m.strip().lower() for m in case["must_include"].split(";") if m.strip()]
    hit = sum(1 for m in must if m in output.lower())
    refused = "not in our documents" in output.lower()
    return {
        "id": case["id"],
        "category": case["category"],
        "coverage": hit / len(must) if must else (1.0 if refused else 0.0),
        "refusal_ok": refused == (case["expect"] == "refuse"),
    }

results = []
with open("golden_set.csv", encoding="utf-8") as f:
    for case in csv.DictReader(f):
        output = ask_bot(case["question"])     # your system under test
        results.append(score(output, case))

by_cat = {}
for r in results:
    by_cat.setdefault(r["category"], []).append(r["coverage"])
print(json.dumps({c: round(sum(v) / len(v), 2) for c, v in by_cat.items()}, indent=2))`,
            'run_golden_set.py',
            'python'
          ),
          proofOfWork(
            5,
            'The verification log + mini eval',
            'Verify 20 claims from AI outputs you used this month: claim, error-type risk, source checked, verdict. Then build a 20-question golden set for one assistant you use and score it with a rubric.',
            'Build a 40-case golden set (CSV) for an AI task, a scoring script with programmatic checks plus an LLM-judge rubric, and report agreement between the judge and your own scores on 20 items.',
            'Design an evaluation policy for your team: which AI uses need golden sets, minimum size, who reviews, when regressions run, and the ship/no-ship rule.',
            'The actual log or golden set, scores by category, and at least one error or regression you found. "Everything passed" with no failures usually means the test was too easy.'
          ),
        ],
        worked: {
          title: 'Catch the hostel-fee regression',
          problem:
            'The FAQ bot\'s golden set has 40 cases: Fees 12, Exams 10, Hostel 8, Certificates 6, Not-in-docs 4. Old prompt scores: 0.91 / 0.88 / 0.90 / 0.95 / 4 of 4 correct refusals. New prompt: 0.94 / 0.92 / 0.62 / 0.96 / 2 of 4. Ship it?',
          steps: [
            { title: 'Overall', desc: 'The weighted average barely changes, so a single overall number would hide the problem.' },
            { title: 'Per category', desc: 'Hostel collapsed from 0.90 to 0.62 and refusals halved — the new prompt\'s "always be helpful" line made it guess.' },
            { title: 'Diagnose', desc: 'Inspect the Hostel failures: the bot now merges hostel and tuition fee rules from two documents.' },
            { title: 'Fix and re-run', desc: 'Restore "If the answer is not in the documents, say so"; add a rule to cite one document per fee type; re-run all 40.' },
          ],
          solution:
            'Do not ship. Per-category scoring caught a regression an overall score and "it feels better" both missed. Fix, re-run, and add the failing cases permanently to the golden set.',
        },
        practice: {
          title: 'Your first golden set',
          prompt:
            'Pick one AI task you rely on (summarising lectures, answering from a syllabus, drafting emails). Write 20 test inputs across typical, hard, edge and should-refuse categories with the facts a good answer must include. Score your current prompt with a rubric, change one thing, and score again.',
          hint: 'Include at least two cases where the right answer is "I don\'t know / not in the material".',
        },
        mistakes: [
          {
            mistake: 'Judging a change by a handful of examples that "feel better"',
            fix: 'Run the full golden set and compare per category before and after.',
          },
          {
            mistake: 'Trusting an LLM judge without calibrating it',
            fix: 'Measure its agreement with human scores first; give it a rubric and reference answers; spot-check regularly.',
          },
          {
            mistake: 'A golden set with no refusal or adversarial cases',
            fix: 'Include questions the system should decline or answer "not found" — that is where confident errors hide.',
          },
        ],
        exam: {
          question: 'How would you evaluate whether a change to an LLM prompt is an improvement?',
          answer:
            'I would keep a frozen golden set of realistic cases with expected answers or required facts, covering typical, hard, edge, adversarial and should-refuse categories. I would run old and new prompts on the full set, score with programmatic checks plus a rubric — using an LLM judge only after checking its agreement with human scores — and compare results per category, not just overall. The change ships only if it improves the target without making any category worse; new real-world failures get added to the set.',
          source: 'Core interview question for AI engineers, AI product managers and AI-ops roles.',
        },
        summary: [
          'Golden set: fixed, realistic cases incl. hard, edge, adversarial and refusal.',
          'Score programmatically where possible; rubric plus human sample otherwise.',
          'LLM-as-judge needs a rubric, references and calibration against humans.',
          'Re-run on every change; compare per category; ship only without regressions.',
        ],
      }),
      [
        ['A golden set is:', ['The best model available', 'A fixed set of test inputs with expected outputs used to score a system repeatedly', 'A premium subscription', 'A set of training data'], 1, 'It turns "seems good" into a measurement.'],
        ['Why include "should refuse / not found" cases?', ['To make the test longer', 'Because confident guessing on unanswerable questions is a key failure', 'They are required by law', 'They improve speed'], 1, 'Abstention must be tested.'],
        ['Before trusting an LLM-as-judge, you should:', ['Use it immediately', 'Check its agreement with human scores using a rubric and references', 'Use the smallest model', 'Let it see only the question'], 1, 'Calibrate the judge.'],
        ['Overall score unchanged, but one category dropped sharply. You should:', ['Ship — the average is fine', 'Not ship; investigate and fix the regressed category', 'Delete that category', 'Retrain the model'], 1, 'Per-category comparison prevents hidden regressions.'],
      ]
    ),
  ],
};
