// Module 8 — AI for Study and Work
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, code } from '../nineBlocks';
import { lesson, M8, COURSE_ID } from './helpers';

export const module8: CourseModule = {
  id: M8,
  course_id: COURSE_ID,
  title: 'Module 8 — AI for Study and Work',
  summary:
    'The daily uses, taught with the verification habit welded on: research and summarising you can trust, code explained until you understand it, drafts you edit before shipping, and exam, resume and placement work where being wrong is expensive.',
  sort_order: 8,
  lessons: [
    lesson(
      M8,
      'lit-8-1',
      1,
      'Research and Summarising: Fast First Passes, Then Verification',
      'Where AI genuinely accelerates reading and sense-making, where it quietly fails, and a concrete routine for checking what comes back before it enters your work.',
      16,
      nineBlocks({
        objectives: [
          'Identify research and summarisation tasks where AI adds real speed',
          'Classify AI-supplied claims by checkability and verify them against primary sources',
          'Design a summarisation prompt that preserves caveats and provenance',
          'Run a citation-tracing check that catches fabricated and mismatched sources',
        ],
        hook:
          'An essay built entirely from AI-generated "sources" collapsed in ten minutes when the supervisor opened the first link: the paper did not exist, the author was invented, and the date belonged to a different decade. The student had done everything else right — structure, argument, prose. What was missing took one minute per source to fix and should have taken ten minutes total: open the link, read the line. Research with AI is fast; research without verification is a countdown.',
        concept: `**What AI is genuinely good at in research.** Compression and organisation: turning a 40-page report into a two-paragraph brief (when you give it the report), structuring scattered notes into an outline, generating the *questions* a topic raises, translating or rephrasing dense passages to your level, comparing two documents you paste, and screening whether an abstract is worth a full read. All of these are transformations of material you supply or well-bounded general knowledge — tasks where errors are visible on inspection. What it is structurally bad at: facts that change (deadlines, policies, prices), precise citations (author-year-journal details), obscure or recent claims, and numbers of any kind. Those live in the model's parametric memory or nowhere (Module 7, Lesson 1) — which is exactly where confabulation hides.

**The verification routine.** Adopt one, and run it every time research leaves the chat window: (1) **List the claims.** Extract every checkable assertion — names, dates, numbers, citations, "studies show" statements. (2) **Classify.** Anchor fact (settleable by a document), live fact (changes over time), interpretation (arguable). Anchor facts get source checks; live facts get official pages with dates; interpretations get treated as arguments to weigh, not findings to quote. (3) **Trace citations.** Search the title + author: does the paper exist, does it say that, is your quote actually in it? Mismatched citations — real source, wrong claim — are more dangerous than fabricated ones because the link opens. (4) **Cross-check the load-bearing numbers** against a second independent source, and note the date relative to the model's cutoff (Module 4). (5) **Record status**: verified / unverified / contradicted, before anything propagates into your notes. Ten seconds of annotation per claim now beats an hour of recovery later.

**Summarising honestly.** A summary prompt should specify audience, length, and — critically — **what must be preserved**: "keep all numbers, conditions and caveats; flag any sentence where the original hedges". Summaries silently drop the conditions attached to findings ("in a 12-week trial, n=40" becomes "studies show"). For high-stakes documents — contracts, policies, safety instructions, graded readings — the summary is an *index into* the document, never a replacement for it: use it to find where to read, then read those passages. Ask for provenance as you go: "quote the sentence each point comes from", which both improves faithfulness and gives you a fast checking handle (Module 4's context window means it can quote exactly what you pasted).

**One structural habit: ask what is missing.** After a research summary, request the counter-considerations: "what would a sceptic of this summary say?" and "what could not be checked from these documents?" This is cheap, and it compensates for the model's tendency toward tidy narrative — real bodies of evidence are messier than any synthesis sounds. Keep the outputs in two columns in your notes: what the AI said, and what you verified. The columns converge only through your work.`,
        extras: [
          table(
            'Claim type → check',
            ['Claim type', 'Example', 'Verification'],
            [
              ['Anchor fact', '"The paper was published in 2019"', 'Find the paper; read the record'],
              ['Live fact', '"Applications close 30 Nov"', 'Official page with a visible date, today'],
              ['Numeric claim', '"40% improvement"', 'Original source; note sample and conditions'],
              ['Citation', '"(Sharma et al., 2021)"', 'Search title+author; confirm the claim is in it'],
              ['Interpretation', '"This shows a market shift"', 'Treat as argument — compare other readings'],
            ],
          ),
          code(
            `Research prompt with verification built in:
"Using ONLY the two documents below, produce:
 1. a 150-word summary for a first-year reader,
 2. every factual claim as a bullet with the exact
    sentence it came from,
 3. a list of questions these documents cannot answer.
Do not add facts from memory; write (not in docs) instead."

<doc1> ... </doc1>   <doc2> ... </doc2>`,
            'research_prompt.txt',
            'text',
          ),
          tip(
            'Ask for the hedge, not just the finding',
            '"What conditions, sample sizes or caveats accompany this result?" forces the qualifiers back into view — they are the first thing a fluent summary trims and the first thing a supervisor asks for.',
          ),
          warn(
            'Unverified citations are the highest-risk research output',
            'Fabricated references and mismatched real references both survive spellcheck and plagiarism checks only until someone opens the link. Trace every citation before it enters a bibliography.',
          ),
        ],
        worked: {
          title: 'Verify an AI research summary before it enters an essay',
          problem:
            'You asked for background on a topic and received a five-bullet summary: two citations, a statistic, a policy date and a causal claim. Walk the routine, decide what is usable today, and write the notes you would actually keep.',
          steps: [
            {
              title: 'List and classify the five claims',
              desc: 'Citations ×2 = anchor facts; statistic = anchor/numeric; policy date = live fact; causal claim = interpretation. Each class gets a different check — this classification step prevents the classic error of treating all five as equally supported.',
            },
            {
              title: 'Trace the citations',
              desc: 'Search title + author for each. Possible outcomes: source exists and supports the claim (keep, quote the line); source exists but does not say that (mismatch — rewrite or drop); nothing found (fabricated — drop and tell the model citations must be verifiable).',
              code_snippet: 'claim 1: search "Exact Title Author 2021"\n-> found + passage matches  : verified\n-> found, different claim   : mismatch - rewrite\n-> not found                : fabricated - drop',
            },
            {
              title: 'Check the number and the date',
              desc: 'Statistic: locate the original study; note conditions (sample, period, population) — otherwise your essay overstates it. Policy date: open the official page today; live facts carry their own expiry, and a deadline quoted from training data is usually wrong by now.',
            },
            {
              title: 'Handle the interpretation and record status',
              desc: 'The causal claim is an argument: ask for the opposing reading and check whether your sources support causation or only correlation. Write the ledger: two verified bullets with quotes, one number with conditions, one date checked today, one interpretation marked as argued — only the verified items go in the essay.',
            },
          ],
          solution:
            'Classify, trace, cross-check, record — citation tracing catches the fabrication, original-source reading catches the overstated number, an official dated page catches the stale policy, and marking the causal claim as interpretation keeps an argument from masquerading as a finding. The essay now rests on a five-line verification ledger instead of a fluent paragraph.',
        },
        practice: {
          title: 'Run the full routine once, for real',
          prompt:
            'Ask an assistant for five factual claims on a topic you half-know. Classify each claim, verify each one against an independent source, and keep a three-column record (claim / status / source). Report the honest tally: verified, unverified, contradicted — and what failure type each failure was.',
          hint: 'Do not pick an obscure topic to make the model look good — the point is measuring your own verification routine on ordinary material.',
        },
        mistakes: [
          {
            mistake: 'Submitting AI-generated references unopened',
            fix: 'Trace title + author + supporting line for every citation. Fabricated and mismatched references are the most common way AI-assisted research fails under review.',
          },
          {
            mistake: 'Treating a summary as the document',
            fix: 'Summaries drop conditions, caveats and scope. For high-stakes readings, use the summary as an index and read the passages that carry the conclusions yourself.',
          },
          {
            mistake: 'Trusting a confident tone as evidence of checking',
            fix: 'Fluency is orthogonal to verification. Confidence should change nothing about your routine — only a traceable source should.',
          },
          {
            mistake: 'Ignoring dates on live facts',
            fix: 'Deadlines, policies and prices drift after any training cutoff. Always re-check them on the official, dated page before acting or citing.',
          },
        ],
        exam: {
          question:
            'Design a five-step verification routine for factual claims and citations obtained from an AI assistant, and explain why mismatched citations are especially dangerous.',
          answer:
            'Steps: (1) extract every checkable claim from the output; (2) classify each as anchor fact, live fact, numeric claim, citation or interpretation; (3) trace citations by searching title and author, then confirm the cited passage actually supports the claim; (4) cross-check load-bearing numbers and dates against primary or official sources, noting currency relative to the model\'s cutoff; (5) annotate each claim verified/unverified/contradicted before it enters notes or drafts. Mismatched citations are the worst failure class because they pass casual inspection — the link opens, the source is real, so the reader\'s trust transfers to a claim the source does not make; fabrication is at least detectable in one click.',
          source: 'Standard research-integrity question for AI-assisted coursework and journalism workflows.',
        },
        summary: [
          'AI accelerates compression and organisation of material you supply — not live facts, precise citations or numbers.',
          'Verify by classifying claims, tracing citations, cross-checking numbers, and stamping status.',
          'Summaries must preserve caveats; for high-stakes documents they index, never replace, the original.',
          'Mismatched citations (real source, wrong claim) are more dangerous than fabricated ones.',
          'Keep two columns — AI-said and you-verified — and let only your work move items across.',
        ],
      }),
      [
        [
          'Which research task suits an AI assistant WITHOUT needing external verification?',
          [
            'Confirming this week\'s application deadline',
            'Structuring your pasted notes into an outline',
            'Stating how many citations a 2023 paper has',
            'Naming the exact volume and page of a journal article',
          ],
          1,
          'Organising material you supplied is a transformation; the others are checkable facts that must come from live sources.',
        ],
        [
          'An AI citation opens to a real paper that does not contain the claimed finding. This is:',
          [
            'A fabricated citation',
            'A mismatched citation — more dangerous than fabrication because the source looks verified',
            'A formatting error',
            'An acceptable paraphrase',
          ],
          1,
          'Real source plus unsupported claim transfers unearned trust — always read the cited passage, not just the link.',
        ],
        [
          'Why must a policy deadline from an AI answer be re-checked even if the answer feels authoritative?',
          [
            'Deadlines change over time and the model\'s knowledge has a training cutoff',
            'AI is banned from knowing policies',
            'Deadlines are always wrong in training data',
            'The model refuses to answer about dates',
          ],
          0,
          'Live facts drift after cutoff; only the official dated page settles them.',
        ],
        [
          'The safest use of an AI summary of a contract clause is to:',
          [
            'Rely on it entirely instead of reading the clause',
            'Use it to locate the relevant passage, then read that passage yourself',
            'Post it publicly for a second opinion',
            'Ask the model to sign off on it',
          ],
          1,
          'Summaries are an index into high-stakes text; conditions and exceptions are exactly what compression drops.',
        ],
      ]
    ),
    lesson(
      M8,
      'lit-8-2',
      2,
      'Learning and Explaining Code With AI',
      'Using coding assistants to understand, debug and practise — with the run-everything discipline that turns plausible code into code you actually know.',
      16,
      nineBlocks({
        objectives: [
          'Formulate code-learning prompts that produce explanations you can absorb and test',
          'Use AI for debugging without outsourcing the understanding',
          'Recognise hallucinated APIs and happy-path-only logic in generated code',
          'Apply the academic-integrity boundary to AI-assisted programming work',
        ],
        hook:
          'Two students get the same fix from the same assistant. One pastes it in, it runs, the lab is submitted, and the viva question "what does this line do?" ends the story. The other asks the assistant to explain the change on a small example, runs her own test on an empty input, and can defend every line. The tool was identical; one of them bought an answer, the other bought an explanation. Code is the one domain where the difference is provable in public — in thirty seconds, at the viva.',
        concept: `**Why code is the best subject to learn with AI.** Code is executable and precise: an explanation can be checked by running it, a claim about behaviour can be tested with one input, and errors surface in exact messages rather than in taste. That makes it the ideal pairing — an assistant that can explain at *your* level, endlessly patient, available at 2am — plus a machine that instantly tells you whether the result holds. The uses, in ascending order of value: explaining unfamiliar code line by line; tracing execution with a concrete input ("walk through this with list = [3,1,2]"); translating between languages; debugging with the actual error message and the actual snippet; generating small exercises at your level; suggesting tests; and documenting what you wrote.

**Prompts that produce learning, not just answers.** State your level and the gap: "I know Python loops but not recursion — explain this function with one concrete call stack, then give me a similar exercise without the solution." Ask for misconceptions: "what do students most often get wrong about this?" Ask for the minimal runnable version stripped of your project's noise. Ask for a check: "what input would distinguish a correct from a near-correct implementation?" These prompts push the assistant into a teaching mode with testable outputs — and the follow-up habit matters: **retype the core of it yourself and run it**. Reading code you did not execute produces the illusion of understanding; typing and running converts it to the real thing.

**Debugging without outsourcing the diagnosis.** The efficient loop: paste the error verbatim, the smallest reproducing snippet, and what you expected. Then, before accepting the fix, ask *why* the bug happened — a fix you cannot explain is a fix you cannot reuse. Test the fix against the original failing case and one edge case (empty input, zero, duplicate, boundary value) — generated fixes routinely repair the reported symptom while breaking a neighbour. And keep the scope small: assistants debug a function far better than a whole application at once, because you can verify the first and only admire the second.

**The failure modes to expect.** (1) **Hallucinated APIs** — plausible methods that exist in some library, some version, or nowhere: verify any unfamiliar function against official docs before trusting it. (2) **Happy-path logic** — code that passes your example and fails on empty, null, negative or duplicate inputs; that is what tests are for, and it is why "it ran" is not "it works". (3) **Silent environment assumptions** — imports not installed, a newer language feature than your interpreter, a different default. The verification stack that defeats all three: run it, read every line you run, add one edge-case test, check unfamiliar APIs in the docs.

**The integrity boundary.** Learning with AI and submitting with AI are governed by one rule: **you must be able to defend every line you submit.** If your course prohibits AI-assisted code on graded work, the rule is the rule regardless of the tool's usefulness. Where AI help is permitted, understand and be ready to explain the whole submission — the viva is not a formality, it is the enforcement mechanism, and "the assistant wrote it" is an admission, not a defence. Keep evidence of your process (versions, commits, test runs) — it protects you as much as it incriminates shortcuts.`,
        extras: [
          table(
            'Code-learning prompts that work',
            ['Goal', 'Prompt shape'],
            [
              ['Understand', '"Explain this function for someone who knows loops but not recursion; use input X; then give one exercise."'],
              ['Trace', '"Walk through execution with this exact input; show variable values at each step as a table."'],
              ['Debug', '"Here is the error, the snippet and expected vs actual. What is the root cause — then the fix."'],
              ['Test', '"Give three edge cases this code does not handle, with inputs that prove it."'],
              ['Practise', '"Generate a similar problem at this difficulty, without the solution; check my attempt after."'],
            ],
          ),
          code(
            `# The verification stack for any AI-provided code
code = ai_answer
run(code)                      # 1. does it execute at all?
read_every_line(code)          # 2. do you know what each line does?
test_edge_cases(code)          # 3. empty / zero / duplicate / max
check_unfamiliar_apis(code)    # 4. docs: does it exist in this version?
# "It ran" passes only step 1.`,
            'verify_code.py',
            'python',
          ),
          tip(
            'Ask for the why before you accept the fix',
            '"Why was it broken and why does this fix it?" turns a patch into a pattern you keep. A fix you cannot explain will silently fail the next variant of the same bug.',
          ),
          warn(
            'Generated code is optimised for plausibility, not for your edge cases',
            'Models reproduce common, canonical solutions — including APIs that do not exist and logic that ignores empty inputs. Run, read, and test the boundary before anything reaches a submission or a repository.',
          ),
        ],
        worked: {
          title: 'Understand a recursive function you must present in class',
          problem:
            'You must explain a recursive binary-search implementation to your class next week. You understand loops but recursion still feels like magic. Use an assistant to build real understanding, and verify each step.',
          steps: [
            {
              title: 'Get a concrete trace, not an abstraction',
              desc: 'Prompt: "Explain binary search recursion to someone who knows loops. Trace it with list [1,3,5,7,9] and target 7: show the call stack, arguments and return values at each level." A table of states beats any paragraph — and you can verify it by hand in one minute.',
            },
            {
              title: 'Convert to the loop you trust, then compare',
              desc: 'Ask for the iterative version side by side: "show both and list what maps to what (mid calculation, base case ↔ loop condition)." Anchoring the unfamiliar in the familiar exposes whether you actually understand or merely recognise.',
              code_snippet: 'recursive base case  <->  loop termination\nargument shrinking    <->  lo/hi moving\nreturn on found       <->  break with index',
            },
            {
              title: 'Test your understanding adversarially',
              desc: 'Ask: "give me three edge cases this implementation mishandles" (empty list, single element, duplicates) and predict the behaviour yourself before running. Then actually run it on those inputs — prediction-then-check is what converts watching into knowing.',
            },
            {
              title: 'Build the presentation and the defence',
              desc: 'Write your own three-slide explanation (no copy-paste), rehearse the walkthrough with target 7, and prepare two viva questions: "why O(log n)?" and "what happens with duplicates?" Every claim in your presentation has been run — you are now defending your own work, with AI as the tutor you hired.',
            },
          ],
          solution:
            'A concrete traced example you verified by hand, a translation into the paradigm you already trust, adversarial edge-case prediction followed by execution, and finally your own original write-up — the assistant produced explanations and exercises, but every claim you will present was checked by you. Understanding you can defend, which is exactly what the viva measures.',
        },
        practice: {
          title: 'Explain, run, and be quizzed',
          prompt:
            'Take a small function you did not write (yours from a teammate, an open-source snippet, or your lab\'s starter code). Get a line-by-line explanation with a concrete trace, then run it on one input yourself and verify the trace matches. Finally ask for two quiz questions about it and answer before revealing.',
          hint: 'If the trace you ran disagrees with the trace you were given, the explanation is suspect — trust the machine that executes.',
        },
        mistakes: [
          {
            mistake: 'Accepting code without running it',
            fix: 'Execution is the free verifier code gets. Run it, then probe one edge case — unrun code is unverified prose.',
          },
          {
            mistake: 'Asking for an entire application in one shot',
            fix: 'You cannot verify what you cannot hold in your head. Build and verify in small pieces; assistants are strongest at function-scale tasks with clear boundaries.',
          },
          {
            mistake: 'Trusting a library function because the name looks right',
            fix: 'Hallucinated APIs are the signature failure of code generation. Confirm unfamiliar functions and their version-specific behaviour in official documentation.',
          },
          {
            mistake: 'Submitting AI-assisted code you cannot explain',
            fix: 'Vivas and code reviews ask what you did and why. Work only within what you can defend — it is both the integrity rule and the learning rule.',
          },
        ],
        exam: {
          question:
            'Why is code unusually verifiable compared with written prose, and how should that change how you use AI for it?',
          answer:
            'Code carries its own feedback loop: it compiles or does not, runs or throws, passes tests or fails — correctness can be established mechanically rather than by judgement, and failures report exact locations. Prose has no equivalent oracle; its errors surface only when a knowledgeable reader checks. This asymmetry should shape usage: for code, lean hard on generation (explanations, fixes, tests, refactors) because every claim can be closed by running it — always execute, read every line, and add an edge-case test; and for prose, lean less and check more, because fluency there has no runtime to catch it. The same tool deserves different trust in the two domains: verified collaborator for code, unverified drafter for text.',
          source: 'Frequently used to teach evaluation asymmetry between code and natural-language AI outputs.',
        },
        summary: [
          'Code is the best AI-learning domain: every explanation can be executed and checked.',
          'Prompt for level, trace, misconceptions and edge cases — then retype and run the core yourself.',
          'Debug with root-cause questions and edge tests; "it ran" is only step one.',
          'Expect hallucinated APIs, happy-path logic and environment assumptions — verify in docs and tests.',
          'Integrity boundary: submit only code you can defend line by line.',
        ],
      }),
      [
        [
          'What is the strongest verification available for AI-generated code?',
          [
            'Reading it once',
            'Running it and testing edge cases',
            'Asking the same model if it is correct',
            'Checking that it looks like documentation examples',
          ],
          1,
          'Execution plus boundary tests is an independent, mechanical check — prose has no equivalent oracle.',
        ],
        [
          'AI-generated code works for your sample but crashes on empty input. This failure mode is called:',
          [
            'Hallucinated API',
            'Happy-path-only logic',
            'Prompt injection',
            'Context overflow',
          ],
          1,
          'Generated code targets the common case; empty/zero/duplicate inputs are where it breaks — hence edge-case tests.',
        ],
        [
          'An unfamiliar method call compiles in the AI\'s answer. Before relying on it you should:',
          [
            'Trust it — the model knows the standard library',
            'Confirm the method exists in your library version via official documentation',
            'Rename it to be safe',
            'Remove all method calls',
          ],
          1,
          'Hallucinated APIs are a signature failure — plausible names, wrong versions, or libraries that never had the method.',
        ],
        [
          'Your course allows AI help for practice but not for graded submissions. The right behaviour is:',
          [
            'Use it anyway and rewrite slightly',
          'Use it for practice and submit only work you produced and can defend under the stated rule',
            'Stop using AI entirely',
            'Ask the assistant to disclose on your behalf',
          ],
          1,
          'Institutional rules define the boundary; learning uses are legitimate, graded submissions follow the stated policy — and you must defend your work regardless.',
        ],
      ]
    ),
    lesson(
      M8,
      'lit-8-3',
      3,
      'Writing Drafts You Don\'t Ship Blind',
      'AI as a first-draft engine for emails, reports and documentation — and the human passes that make the difference between a draft and a liability.',
      16,
      nineBlocks({
        objectives: [
          'Structure a drafting prompt with real facts, audience and constraints',
          'Run fact, tone, specificity and responsibility passes over AI-generated drafts',
          'Recognise and remove generic filler that betrays unedited generation',
          'State why authorship keeps accountability with the human who sends',
        ],
        hook:
          'A project-update email went out last semester with a deadline that had quietly slipped two weeks earlier — inherited from the AI draft, unchecked, because the draft read so smoothly that checking felt unnecessary. Smoothness is not accuracy. The fix took thirty seconds in a calendar; the credibility cost of a wrong date to your supervisor did not have a thirty-second fix. Drafting with AI is a genuine time-saver — once you accept that the clock you save comes out of the checking budget, never out of it.',
        concept: `**The draft workflow.** Treat AI as a first-draft engine and yourself as the editor of record: you supply the material, the model compresses it into structure and prose, you verify and own every claim before it leaves your outbox. The prompt side: give **audience** (who reads it, what they already know), **purpose** (what you want them to do or understand), **the real facts** (dates, numbers, names, decisions — pasted, not remembered by the model), **constraints** (length, tone, format, what must be included) and optionally **your voice sample** (a previous message of yours, for style). The rule underneath: **outputs are only as specific as your inputs** — a prompt with no facts gets a draft full of placeholders and plausible filler, which is precisely the draft people ship by accident.

**The four passes.** (1) **Fact pass** — highlight every number, date, name, link and commitment; verify each against your calendar, records or source. This is where AI drafts cause real damage: the model will generate a *plausible* date and a *typical* figure because unspecified slots get filled. (2) **Tone pass** — would you say it this way? Does it sound like you, your team, your culture? AI defaults to a bland mid-effort corporate register that reads oddly from a student or a small team. (3) **Specificity pass** — cut the generic: "in today's fast-paced environment", "I hope this email finds you well" repeated at scale, empty adjectives, conclusions that restate the ask. Generic filler is the visible fingerprint of unedited generation, and readers notice it faster than they notice typos. (4) **Responsibility pass** — read the final version as the person who will be asked about it: "if this is wrong, who is blamed, and have I checked the parts that could be wrong?" If you would not sign it, do not send it.

**What must never come from the model.** Facts you did not supply: statistics, quotations, citations, commitments ("we will deliver by Friday"), legal or HR statements, apologies on behalf of others, and any praise or criticism of a named person. Ask for those slots to be left marked — "write [DATE] where the deadline goes" is a good prompt precisely because it prevents invention. For professional contexts, keep a standing note in your prompt library (Module 10) with your organisation's conventions: sign-off style, formal/informal line, mandated disclosures.

**Voice, attribution and the accountability rule.** Using AI to sharpen your writing is ordinary professional practice — like a spellchecker with opinions — provided the substance is yours and your organisation's rules permit it. What is not ordinary: presenting generated content as fully your own where disclosure is required, or letting it make claims you have not verified. The principle to carry: **the sender owns the message.** No mail client has a "the model wrote it" button that redirects consequences; the recipient will hold you to every sentence. That single fact — accountability does not transfer — is the whole argument for the four passes.`,
        extras: [
          table(
            'Draft type → what AI does → what you must check',
            ['Draft', 'AI\'s job', 'Your check'],
            [
              ['Status email', 'Structure, brevity, tone', 'Every date, number, commitment'],
              ['Report section', 'Flow, paragraphing, clarity', 'All claims, figures, sources, logic'],
              ['Documentation', 'Steps, headings, examples', 'Run every step as written'],
              ['Announcement', 'Hook, call to action', 'Names, venues, fees, links'],
              ['Message to authority', 'Register, politeness', 'Facts, requests, and whether you agree'],
            ],
          ),
          code(
            `Drafting prompt skeleton:
"You are drafting [type] for [audience] so that they [purpose].
Facts you must use exactly (do not invent others):
  - deadline: [DATE]
  - attendance: 120 students, 4 venues
  - decision: schedule shifts to Wednesdays
Tone: direct, warm, no corporate filler.
Length: under 150 words. Mark anything missing as [..]."

# Then run the four passes: fact / tone / specificity / responsibility.`,
            'draft_prompt.txt',
            'text',
          ),
          tip(
            'Paste your real facts into the prompt',
            'The single biggest quality jump in drafting comes from supplying the actual data. Placeholders and invented specifics are what a fact-less prompt buys — and what a fact-pass catches only if you notice.',
          ),
          warn(
            'Never let a model commit, quantify or characterise on your behalf',
            'Deadlines, statistics, quotations, legal wording, performance judgements about people — all must originate from you or a source you checked. A confident invented figure is the most expensive sentence in an email.',
          ),
        ],
        worked: {
          title: 'Draft and defend a project update to a supervisor',
          problem:
            'Your team\'s demo slipped from Friday to Tuesday; two of five modules are done; a dependency (the API key) is pending. You need a 150-word update email. Draft it with AI, then run all four passes and produce the final version.',
          steps: [
            {
              title: 'Prompt with facts, not vibes',
              desc: 'Supply: audience (supervisor who knows the project), purpose (inform of slip, state plan, request the key), facts (slip Friday → Tuesday, 2/5 modules done, blocker = API key), tone (direct, no apology theatre), format (≤150 words). Instruct: use only these facts, mark anything else [..].',
            },
            {
              title: 'Fact pass',
              desc: 'Verify against reality: is Tuesday correct in the shared plan? Is 2/5 right as of today? Is the API key still the actual blocker? Fix any drift — the model may have written "by early next week" because you did not pin it.',
            },
            {
              title: 'Tone and specificity passes',
              desc: 'Cut whatever you would not say aloud: "I hope this email finds you well", "unforeseen circumstances", "moving forward". Ensure the ask (key by Monday) is explicit rather than buried — specificity is what makes an update actionable.',
              code_snippet: 'cut:  "in light of unforeseen challenges..."\nkeep: "Demo moves Fri -> Tue. 2/5 modules done.\n       Blocker: API key. Could you approve it by Mon?"',
            },
            {
              title: 'Responsibility pass and send',
              desc: 'Read as the recipient: does the update make a commitment you can keep (Tuesday demo with 3/5 modules?), does it blame anyone, is the ask unambiguous? Sign only after you can defend every line — which you now can, because every fact was supplied and checked by you.',
            },
          ],
          solution:
            'Facts-first prompt → four passes → a 150-word email where every number and date has been reconciled with reality, the register sounds like a person, the filler is gone, and the commitment is one you intend to keep. The AI produced the structure in seconds; the passes are what make sending it safe.',
        },
        practice: {
          title: 'Edit your own AI draft and account for every change',
          prompt:
            'Take one real message you need to send this week. Draft it with AI using supplied facts, then edit it yourself. Record each change you made under one of the four pass names (fact / tone / specificity / responsibility) and note why. The change log is your evidence of real editing rather than rubber-stamping.',
          hint: 'If your log is empty, either the prompt was unusually perfect or you did not really read it. It is almost always the second.',
        },
        mistakes: [
          {
            mistake: 'Letting the model fill in numbers, dates or names',
            fix: 'Supply them in the prompt or mark slots explicitly ([DATE]). Then run the fact pass anyway — invented specifics arrive wearing confident prose.',
          },
          {
            mistake: 'Sending after reading only for flow',
            fix: 'Flow is the easiest quality to fake. Read once for facts, once for tone, once for what you are committing to — in that order, before anyone else sees it.',
          },
          {
            mistake: 'Prompting with no facts and blaming the generic output',
            fix: 'A fact-less prompt buys a template. Paste the actual material — audience, purpose, data — and genericness collapses immediately.',
          },
          {
            mistake: 'Believing "the AI wrote it" redistributes blame',
            fix: 'Accountability sits with the sender on every channel. Recipients, rules and consequences follow you, not the tool.',
          },
        ],
        exam: {
          question:
            'Explain why "the AI wrote it" is not a defence for a factual error in a submitted report, and describe the four passes that would have caught it.',
          answer:
            'Authorship does not transfer accountability: you chose to submit the document, the reader relies on you, and institutional and professional rules attach consequences to the submitter — the tool is an instrument, like a calculator or a spellchecker, not a co-signatory. The four passes: (1) fact pass — verify every number, date, name and citation against sources; (2) tone pass — confirm the register is genuinely yours and appropriate; (3) specificity pass — remove generic filler and confirm the content makes concrete, checkable statements; (4) responsibility pass — read the final version as the person who will be questioned about it and confirm you can defend each line. Any report that passed the fact pass cannot contain an unchecked AI-invented figure.',
          source: 'Standard accountability question in professional-ethics and AI-policy assessments.',
        },
        summary: [
          'AI drafts from what you supply; audience, purpose and real facts are the prompt\'s fuel.',
          'Four passes before sending: fact, tone, specificity, responsibility.',
          'Never let generation commit, quantify, quote or judge — mark the slots instead.',
          'Generic filler is the fingerprint of an unedited draft; readers spot it fast.',
          'The sender owns the message: accountability never moves to the tool.',
        ],
      }),
      [
        [
          'The most reliable way to stop an AI draft inventing a deadline is to:',
          [
            'Ask it to be careful',
            'Supply the exact date in the prompt or mark a [DATE] slot it must not fill',
            'Use a paid plan',
            'Lower the temperature',
          ],
          1,
          'Unspecified slots get filled with plausible content; explicit facts or marked placeholders prevent invention at the source.',
        ],
        [
          'Which pass catches "I hope this email finds you well" repeated across every message you send?',
          ['Fact pass', 'Tone pass', 'Specificity pass', 'Responsibility pass'],
          2,
          'The specificity pass removes generic filler — the visible fingerprint of unedited generation.',
        ],
        [
          'Why does accountability stay with the person who sends AI-assisted writing?',
          [
            'AI has no legal personality — the sender chose to submit it, and readers and rules attach consequences to the submitter',
            'AI outputs are always copyrighted',
            'Recipients cannot tell the difference',
            'Organisations ban AI entirely',
          ],
          0,
          'Tools do not carry responsibility; the human who selects and submits the text does — in every professional and academic setting.',
        ],
        [
          'The responsibility pass asks you to:',
          [
          'Check spelling one more time',
            'Read the final version as the person who will be questioned about it, and confirm each line is defensible',
            'Count the words',
            'Ask the model to rate its own draft',
          ],
          1,
          'It converts "would I sign this?" into a deliberate step — the last gate before anything leaves your outbox.',
        ],
      ]
    ),
    lesson(
      M8,
      'lit-8-4',
      4,
      'Exam Prep, Resumes and Cover Letters: High-Stakes Documents, Verified',
      'Where AI legitimately accelerates placement preparation — and the truth rule that keeps an improved resume from becoming a self-inflicted rejection.',
      16,
      nineBlocks({
        objectives: [
          'Generate practice material from your own verified syllabus and notes',
          'Improve resume bullets using only claims you can evidence',
          'Tailor cover letters to a real job description without fabricating fit',
          'Use AI for mock interviews and identify claims that fail under questioning',
        ],
        hook:
          'A resume gained one polished line under AI editing: "Led a team of 10 to deliver projects 30% ahead of schedule." The interview had four questions queued behind that line — who were the ten, which projects, which schedule, which measurement. The candidate could answer none of them. The line did not beat the ATS; it built a trap and walked the candidate into it. The same tool that strengthens a true sentence will happily manufacture a false one with better grammar.',
        concept: `**Exam and placement prep — the honest uses.** (1) **Practice generation**: give the assistant your actual syllabus, notes or textbook chapter and ask for questions *at your level* — objective, short-answer, and application questions — then attempt them and ask for evaluation against your material. The rule that makes this safe: questions come from *your provided source*, and every answer is checked against it, because a model inventing a syllabus question teaches you the wrong syllabus. (2) **Weak-topic explanation**: ask for a second explanation when the lecture did not land, at a stated level, with a worked example you then solve yourself — the Module 8.2 learning loop applied to theory. (3) **Interactive drilling**: "quiz me one question at a time on thermodynamics, increasing difficulty, tell me why each answer is wrong" — an actual tutor pattern, and one of the best uses in this course. (4) **Gap mapping**: paste a syllabus and your notes, ask what is uncovered — then verify coverage yourself against the official syllabus. What AI prep must never become: a source of memorised answers presented as fact without checking, or a substitute for actually attempting problems with a pen.

**Resumes: improve the truth, never the facts.** The legitimate moves are mechanical and valuable: tighten wording ("responsible for" → "built", "worked on" → concrete verbs), restructure bullets to action → task → result, align *terminology* with the job description (if the JD says "stakeholder coordination" and you did exactly that, use their words — ATS keyword matching rewards honest lexical overlap), fix formatting and length, and surface what is missing (no quantification? no outcomes?). Every claim must pass the **evidence test**: can you state the source of this number, name the team, walk through the process, and discuss it for two minutes under questioning? If not, it does not belong — soft fabrication (rounding 3 to 10, "led" for "participated in") is the most common way candidates sabotage themselves, because interviews are precisely an evidence-taking process. Quantify only from real records; when a real number exists, AI helps you present it cleanly, which is the whole fair use.

**Cover letters: fit, not flattery.** Provide the actual job description and your actual background; ask for a draft that argues *fit* with specific examples from your record — then rewrite the opening yourself, because generic admiration of the company is detectable instantly. Verify every company fact you assert (products, recent work) against their site — models generalise companies into clichés.

**Mock interviews, done properly.** Ask the assistant to interview you for a specific role: questions first, no answers; then your answers; then blunt feedback — which answer lacked structure, which claim sounded inflated, what follow-up would expose thin knowledge. STAR-format stories (Situation, Task, Action, Result) built from your real experiences become rehearsable this way. Then the golden rule of this whole lesson, stated once: **anything you cannot defend in person must not be on the page.** Resume, cover letter, interview answers — AI optimises presentation; your evidence is the only thing that survives contact with an actual panel.`,
        extras: [
          table(
            'High-stakes document → AI assist → mandatory check',
            ['Document', 'AI may do', 'You must verify'],
            [
              ['Practice questions', 'Generate from your syllabus/notes', 'Answer key vs textbook; coverage vs official syllabus'],
              ['Resume bullets', 'Verb choice, structure, JD keyword alignment', 'Every claim evidenced; every number sourced'],
              ['Cover letter', 'Structure and fit-argument draft', 'Company facts on their site; voice is yours'],
              ['Interview prep', 'Mock questions, STAR structuring, feedback', 'Stories are real; numbers match your resume'],
              ['Exam answers', 'Explanations and worked examples', 'Cross-check with course material before memorising'],
            ],
          ),
          code(
            `The evidence test for any resume line:
claim  = "Led a team of 10 ... 30% ahead of schedule"
Q1 source of "10"?      -> 4 people incl. you  (rewrite: "of 4")
Q2 which projects?      -> two, name them      (specific)
Q3 which schedule?      -> the lab deadline    (context)
Q4 how measured?        -> no measurement      (CUT or state fact)
# Every surviving word must answer all four.`,
            'evidence_test.txt',
            'text',
          ),
          tip(
            'Feed the assistant the real job description',
            'Fit comes from comparison, not composition: paste the JD and your background, and ask for the three strongest truthful matches plus the two weakest areas. Honest gap lists are more useful than flattering drafts.',
          ),
          warn(
            'Interviewers audit exactly what polish invented',
            'A decorated metric turns one weak line into four failing answers — a worse outcome than an honest line. Panels do not check every bullet; they check the impressive ones.',
          ),
        ],
        worked: {
          title: 'Turn a real internship record into defensible resume bullets',
          problem:
            'Internship record: "worked on the company dashboard, helped with data cleaning, made some charts, attended client calls." Job description asks for "data analysis, stakeholder communication, dashboard reporting". Produce three improved bullets that survive the evidence test.',
          steps: [
            {
              title: 'Extract the true inventory first',
              desc: 'Before prompting, list facts from your own records: dashboard = a Tableau dashboard refreshed weekly; cleaning = a 12k-row sales CSV with duplicate removal; charts = three trend charts for a monthly review; client calls = attended four review calls and took notes. Now the raw material exists and cannot be invented.',
            },
            {
              title: 'Map to JD vocabulary honestly',
              desc: 'JD terms with truthful matches: "data analysis" ← cleaning + trends; "dashboard reporting" ← the Tableau dashboard; "stakeholder communication" ← review calls and the notes you circulated. Alignment here is lexical, not factual — you are using your real work in the employer\'s words.',
            },
            {
              title: 'Draft bullets, then apply the evidence test',
              desc: 'Ask for action-verb bullets using only the inventory. Then audit each: can you defend the row count, the cadence, your specific contribution? Cut or reword anything beyond the record — "led" becomes "built", "increased accuracy 40%" (invented) disappears entirely.',
              code_snippet: 'OK:  "Cleaned a 12k-row sales dataset (dedup + fixes) used\n      in weekly dashboards"\nCUT: "Improved data accuracy by 40%"  <- no measurement',
            },
            {
              title: 'Tailor the cover letter with the same discipline',
              desc: 'Draft from JD + inventory: one paragraph on the fit (dashboard + review calls), one specific example, one line on why the company — verified on their site. Rewrite the opener yourself. Two-minute rehearsal per bullet, then ship.',
            },
          ],
          solution:
            'Inventory → honest JD mapping → bullets constrained to the inventory → evidence-test audit → tailored letter with verified company facts. Every surviving claim has a source (your records) and a defence (two-minute rehearsal). The polish went into presentation of true work, which is exactly the limit AI should operate under for anything a panel will read.',
        },
        practice: {
          title: 'Run the evidence test on your own resume',
          prompt:
            'Take your three most important resume bullets. For each, write the four evidence answers (source of each number, names, process, measurement). Then ask an assistant to "stress-test this bullet for a panel: give the five follow-up questions an interviewer would ask". Mark any bullet that cannot survive — and rewrite it to what you can actually defend.',
          hint: 'The bullets you can defend are already good; the exercise is finding the ones you cannot before an interviewer does.',
        },
        mistakes: [
          {
            mistake: 'Letting AI strengthen a claim beyond what you did',
            fix: '"Helped" becoming "led" is soft fabrication with better grammar. Constrain the prompt to your inventory and apply the evidence test to every line.',
          },
          {
            mistake: 'Practising on questions the model invented about your syllabus',
            fix: 'Generate from your actual materials and check answers against the textbook — invented exam questions teach wrong content with full confidence.',
          },
          {
            mistake: 'Sending a cover letter with stock praise and no specifics',
            fix: 'Generic flattery signals a template. One verified company fact plus one real example of your fit outweighs three adjectives.',
          },
          {
            mistake: 'Memorising model interview answers verbatim',
            fix: 'Panels detect recitation and follow-up questions expose it. Rehearse stories from your real experience in STAR form; keep the structure, never the script.',
          },
        ],
        exam: {
          question:
            'A candidate lets AI add an impressive but unverifiable metric to their resume. Trace the likely consequences across screening and interview, and state the rule that prevents this.',
          answer:
            'Screening: the metric may indeed attract attention and advance the candidate — the temptation is that it sometimes "works" at this stage. Interview: panels probe impressive claims first; the candidate cannot name the measurement, baseline or period, producing four consecutive failures that discredit the rest of the (true) resume as well — the classic asymmetric loss, where one inflated line poisons trustworthy ones. Post-hire it becomes a conduct issue on record. Prevention rule: anything you cannot defend in person must not be on the page — every number traceable to a source, every "led" backed by what you actually led. AI may reword true claims; it must never originate them.',
          source: 'Standard resume-integrity question in placement-preparation and HR interviews.',
        },
        summary: [
          'Best exam-prep uses: generate from your own materials, drill interactively, map gaps — then verify.',
          'Resume work = presentation of true claims: wording, structure, honest JD vocabulary.',
          'Evidence test: source, names, process, measurement — every line must answer all four.',
          'Cover letters argue fit with specifics; company facts come from the company.',
          'The rule: nothing on the page that you cannot defend in the room.',
        ],
      }),
      [
        [
          'Where should practice exam questions come from?',
          [
            'The model\'s general knowledge of what exams ask',
            'Your actual syllabus, notes and textbook — with answers checked against them',
            'Last year\'s paper from an unrelated university',
            'Whatever the model finds most interesting',
          ],
          1,
          'Generation from your provided materials keeps practice aligned with the real exam; unchecked questions teach wrong content confidently.',
        ],
        [
          'Your job description says "stakeholder coordination" and you did attend client review calls. The right move is:',
          [
            'Invent a "stakeholder management" project',
            'Use the employer\'s honest vocabulary for the work you actually did',
            'Avoid the phrase so nothing can be questioned',
            'Claim you led the calls',
          ],
          1,
          'Lexical alignment with the JD for truthful work is legitimate (and helps keyword matching); fabricating scope is not.',
        ],
        [
          'What is the evidence test for a resume bullet?',
          [
            'Whether an AI rates it highly',
            'Whether you can state the source of every number, name the people, explain the process and discuss it at length',
            'Whether it is under 25 words',
            'Whether it contains an action verb',
          ],
          1,
          'An interview is an evidence audit; every claim on the page must have a defence attached before it ships.',
        ],
        [
          'The best use of an assistant in interview preparation is to:',
          [
            'Generate perfect answers to memorise verbatim',
            'Act as a questioner: ask role-specific questions, then give blunt feedback on your real answers',
            'Write your entire STAR stories for you',
            'Predict the exact questions that will be asked',
          ],
          1,
          'Questioning plus feedback rehearses performance; memorised scripts collapse the moment a follow-up question arrives.',
        ],
      ]
    ),
  ],
};
