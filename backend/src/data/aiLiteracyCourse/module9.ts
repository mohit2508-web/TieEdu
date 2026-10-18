// Module 9 — Limits, Risks and Safety
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info } from '../nineBlocks';
import { lesson, M9, COURSE_ID } from './helpers';

export const module9: CourseModule = {
  id: M9,
  course_id: COURSE_ID,
  title: 'Module 9 — Limits, Risks and Safety',
  summary:
    'The failure modes that matter in daily life: why models hallucinate and how to catch them, where bias comes from, what happens to whatever you paste, where academic integrity sits, and how to think about deepfakes, misinformation and the jobs question without panic or hype.',
  sort_order: 9,
  lessons: [
    lesson(
      M9,
      'lit-9-1',
      1,
      'Hallucination: Why Models Invent Facts and How You Catch Them',
      'The structural cause of confident falsehoods, the claim types that hallucinate most, and a checking routine sized to everyday use rather than paranoia.',
      16,
      nineBlocks({
        objectives: [
          'Explain hallucination as a consequence of plausible-next-token generation',
          'Rank claim types by hallucination risk and verification cost',
          'Apply targeted checks: citation tracing, cross-examination and independent sources',
          'State what temperature can and cannot do about factual errors',
        ],
        hook:
          'A lawyer filed a brief containing court cases that did not exist — invented wholecloth by an assistant, complete with citations formatted well enough to pass a first read. The error was not exotic; it was the ordinary behaviour of a system that produces whatever looks most like a citation, asked by someone who trusted fluency as a proxy for truth. Every hallucination story you have heard is a variant of that one: a plausible-shaped token sequence, delivered with the confidence of a machine that has no concept of not knowing.',
        concept: `**The mechanism, plainly.** A language model generates the next token that is *most plausible given everything so far* (Module 4). Plausible is not true: the training process never distinguishes "this sentence is factual" from "this sentence follows the pattern of factual sentences". Nothing in the architecture marks a claim as verified, retrieves a record to confirm it, or raises an error when the underlying knowledge is absent. When the prompt presses for a specific shape — five citations, a statistic, a date, a quote — and the weights do not contain a clean answer, the model fills the slot with the most citation-shaped, statistic-shaped, date-shaped content it can produce. Instructed helpfulness amplifies this: models are trained (Module 5) to answer rather than stall, so the failure mode is silent substitution of plausible content for absent knowledge, not an apology.

**Where hallucination concentrates.** Risk is not uniform — it tracks *specificity* and *obscurity*: (1) **citations and references** — maximum risk; a bibliographic record is a precise, verifiable object and models routinely synthesise plausible author-year-journal combinations; (2) **numbers and statistics** — precise values are rarely absorbed intact; (3) **names, dates and quantities of specific things** (versions, page numbers, event details); (4) **anything after the knowledge cutoff** (Module 4) — retrieval-less answers about recent events are recall-or-invent; (5) **long-tail entities** — obscure papers, small companies, regional facts: the less training signal, the more completion pressure matters. Low-risk by contrast: transformations of what you pasted, well-known concepts explained in your own words, code you can run, and math you can recompute. Notice the pattern: **risk falls as checkability rises** — that asymmetry is the whole strategy.

**The checks, sized to the claim.** (1) **Flag-checkable nouns**: every name, number, date and citation in an output gets flagged mentally as "verify before use". (2) **Trace citations** exactly as in Module 8: search title + author, open it, read the line. (3) **Cross-examine the model**: "what are you least sure about?" and "which parts of this answer would you not rely on?" — imperfect (the model's self-report is itself generated), but it reliably surfaces hedging that prompts the right second look. (4) **Independent confirmation**: any load-bearing fact gets a second source that does not come from the same conversation. (5) **Known-answer probes**: when evaluating a tool for ongoing use, ask questions you already know the answer to — if it is confidently wrong about things you know, calibrate downward for things you don't. And for high-stakes domains (medical, legal, financial, safety), the rule is simple: AI input is *search and drafting*, never the decision.

**Two beliefs to kill.** First, "temperature 0 fixes hallucination": temperature only narrows sampling toward the most likely tokens — it makes output *consistent*, and a consistent falsehood is still false; factual grounding comes from context, retrieval and verification, not from dial settings. Second, "the model says it doesn't know, so it doesn't": self-reported uncertainty is generated text too — useful as a signal, never as a certificate. Hallucination cannot be prompted away entirely; it can be *budgeted*: keep claims checkable, keep checks proportionate to consequences, and let the Module 8 verification routine do its work every time output matters.`,
        extras: [
          table(
            'Hallucination risk by claim type',
            ['Claim type', 'Risk', 'Check'],
            [
              ['Citations / references', 'Highest', 'Search title + author; open and read'],
              ['Specific numbers, stats', 'High', 'Original source; note conditions'],
              ['Recent events (post-cutoff)', 'High', 'Dated, official source today'],
              ['Obscure entities', 'High', 'Two independent sources'],
              ['Explanation of pasted text', 'Low', 'Compare against the pasted text'],
              ['Code / arithmetic you run', 'Lowest', 'Execute and recompute'],
            ],
          ),
          info(
            'Why confident tone proves nothing',
            'Calibration — matching confidence to evidence — is not trained directly; helpfulness and fluency are. A sentence\'s certainty level is a style property, statistically uncorrelated with its truth in exactly the cases that hurt you.',
          ),
          tip(
            'Ask "what would you not rely on here?"',
            'A cheap second pass: models often flag their weakest points when asked directly. Treat the answers as a to-do list for verification, not as absolution.',
          ),
          warn(
            'Hallucinations scale with instruction pressure',
            '"Give exactly five sources" when three exist guarantees two inventions. Ask for what the material supports and explicitly permit "only two found" — you get an honest count instead of a padded one.',
          ),
        ],
        worked: {
          title: 'Audit a research answer containing six claims',
          problem:
            'Prompt: "Give me six key facts about the history of the UPI payment system with sources." Output: six confident bullets — two dates, two statistics, one person attribution, one "first of its kind" claim, each with a citation-looking source. Triage and verify before any of it touches your notes.',
          steps: [
            {
              title: 'Classify all six by risk',
              desc: 'Dates ×2 = high (specific); statistics ×2 = high (precise numbers); person = high (entity); "first of its kind" = medium (comparative claim); citations across all six = highest risk as a class. Note that the claim types most likely to be checked by a reader are exactly the ones most likely to be wrong.',
            },
            {
              title: 'Trace the citations first',
              desc: 'Search each title and author. This is the fastest filter: fabricated sources collapse immediately, mismatches collapse when you read the passage, survivors get promoted to "candidate-verified". Expect at least one non-existent entry in a six-citation batch from an unretrieved chat.',
              code_snippet: '6 citations -> search each\nfound + supports claim : candidate\nfound, other content   : mismatch -> cut\nno result              : fabricated -> cut',
            },
            {
              title: 'Verify numbers and dates independently',
              desc: 'Each statistic gets its original source (or gets cut); each date gets an official timeline page. Check internal consistency too — statistics that contradict the dates ("launched 2016, adopted by 2010") expose synthesis errors without any search at all.',
            },
            {
              title: 'Handle the comparative claim and write the ledger',
              desc: '"First of its kind" needs a defined comparison class — ask the model what it means, then check with an independent source; these sweeping framings are often wrong in a way that changes meaning. Ledger each claim verified/unverified/cut before anything enters your notes; keep the citations that survived as your working bibliography.',
            },
          ],
          solution:
            'Risk classification routes each claim to the right check: citations traced first (fastest kill), numbers and dates to independent sources, comparative claims interrogated and confirmed — with a status ledger as the deliverable. The output that survives is smaller than six bullets and is now usable; the process takes minutes, which is the correct price of the routine.',
        },
        practice: {
          title: 'Measure your own hallucination exposure',
          prompt:
            'Ask for five specific, checkable facts on a niche topic (a regional policy, an obscure historical event, a minor library version). Verify all five with independent sources. Record the honest tally and the failure type of each miss — fabricated, stale, conflated, or wrong number. Then re-ask permitting uncertainty ("say when you do not know") and compare.',
          hint: 'Compare the two runs: you are measuring how much of the first run\'s confidence was style rather than knowledge.',
        },
        mistakes: [
          {
            mistake: 'Assuming fluent, detailed answers are accurate',
            fix: 'Fluency is a style property trained directly; truth is not. Details are as easy to invent as generalities — arguably easier.',
          },
          {
            mistake: 'Believing temperature 0 prevents fabrication',
            fix: 'It narrows sampling to the most likely tokens — consistent output, possibly consistently wrong. Grounding requires context, retrieval or checks.',
          },
          {
            mistake: 'Reading "I\'m not certain, but…" as a safety signal',
            fix: 'Hedging is generated like everything else and is not calibrated to actual reliability. It is a prompt to verify, not a certificate of doubt.',
          },
          {
            mistake: 'Pressuring exact counts the material cannot support',
            fix: '"Give ten sources" when four exist manufactures six. Ask for what is supported and explicitly allow a shortfall.',
          },
        ],
        exam: {
          question:
            'Explain why hallucination is a structural consequence of next-token prediction rather than a simple bug, and give two mitigations that reduce it without eliminating it.',
          answer:
            'The objective trains plausibility, not truth: nothing in pretraining, SFT or alignment marks a token sequence as fact-checked, and there is no lookup step that fails loudly when knowledge is absent — so when a prompt demands a citation-shaped or number-shaped slot the weights cannot fill, the model completes with the most plausible content of that shape. It is structural because the same mechanism that produces all useful text produces the fabrications; removing it would remove generation. Mitigations: (1) grounding — supply documents or retrieval so answers condition on provided evidence rather than parametric recall; (2) verification workflows — claim classification, citation tracing and independent sources (Module 8), plus instruction that permits "I don\'t know" and asks for supported counts only. Both reduce harm; neither guarantees truth, which is why consequential decisions keep a human in the loop.',
          source: 'Core safety-and-reliability question in LLM literacy and applied AI interviews.',
        },
        summary: [
          'Hallucination = plausible-shaped tokens standing in for absent knowledge; nothing marks truth during generation.',
          'Risk tracks specificity and obscurity: citations, numbers, dates, recent and niche facts are hot zones.',
          'Checks scale with stakes: flag checkable nouns, trace citations, cross-examine, confirm independently.',
          'Temperature controls consistency, not truth; self-reported uncertainty is also generated text.',
          'Grounding and verification reduce hallucination — only humans and sources close the gap.',
        ],
      }),
      [
        [
          'Hallucination happens primarily because the model is trained to:',
          [
            'Generate the most plausible continuation, not a verified one',
            'Deliberately deceive users',
            'Copy training documents verbatim',
            'Refuse when it lacks knowledge',
          ],
          0,
          'The objective rewards plausibility; no fact-checking step exists in generation, so absent knowledge gets plausible-shaped substitutes.',
        ],
        [
          'Which claim type carries the HIGHEST hallucination risk?',
          [
            'Explaining a paragraph you just pasted',
            'A specific bibliographic citation with author, year and journal',
            'Rewriting your sentence for tone',
            'Code you are about to run',
          ],
          1,
          'Precise, checkable records are easy to synthesise plausibly and hard to ground — the classic high-risk object.',
        ],
        [
          'Setting temperature to 0 will:',
          [
            'Eliminate factual errors',
            'Make output consistent and more deterministic — consistency with the truth is a separate question',
            'Force the model to cite sources',
            'Refresh its knowledge cutoff',
          ],
          1,
          'Temperature narrows the sampling distribution; a stable answer can still be wrong, and grounding is what fixes facts.',
        ],
        [
          'A prompt demands exactly eight sources for a thin topic. The expected failure is:',
          [
            'The model refuses to answer',
            'Invented citations to satisfy the count',
            'The context window overflows',
            'The answer becomes more accurate',
          ],
          1,
          'Instruction pressure on a count the material cannot support guarantees padding — permit shortfall instead.',
        ],
      ]
    ),
    lesson(
      M9,
      'lit-9-2',
      2,
      'Bias, Stereotypes and Where They Come From',
      'How the data, the objective and the alignment pipeline each inject bias into model output — what it looks like in practice — and how to work with (and around) it responsibly.',
      15,
      nineBlocks({
        objectives: [
          'Trace three sources of bias through the training pipeline',
          'Identify stereotypical defaults in generated text and images',
          'Apply prompt-level and process-level mitigations without over-trusting them',
          'Recognise when a biased output must go to humans, not back into the loop',
        ],
        hook:
          'Ask a model to picture "a CEO" and then "a nurse", in two different cultural settings — and count how often the generated defaults track the old stereotype regardless of the culture you named. Now ask the same model to "help screen these résumés". The gap between a charming party trick and a hiring shortlist is exactly one step, and that step is where stereotype stops being amusing.',
        concept: `**Bias is inherited, not conjured.** Nothing in a model invents prejudice from nothing; it learns distributions from data, and the world\'s text carries history. Three entry points matter. (1) **Training data**: the open web over-represents some groups as authors and subjects, encodes occupational and cultural stereotypes in billions of examples, under-represents some languages and dialects, and contains slanted reporting and outdated norms — the model averages what it read (Module 5, Lesson 1). (2) **The objective and the data pipeline**: next-token prediction optimises *typical* continuation, so the statistically common association (doctor → he, nurse → she) is, precisely, what the model learned to produce; filtering and quality scoring also embed choices about what counts as good data. (3) **Post-training and raters**: alignment learns from human preferences (Module 5, Lesson 3) — raters have their own cultural positions and guidelines, so the model's "helpful" defaults encode a particular taste, including its blind spots.

**What it looks like in output.** *Default personas*: generated names, genders, roles and family structures that reflect narrow defaults unless counter-instructed. *Uneven quality*: better grammar, nuance and idiomatic range in high-resource languages; worse comprehension and refusal behaviour in low-resource ones — an equity problem, not just a style one. *Judgement skew*: sentiment, tone and "professionalism" assessments that penalise dialect, culture or non-dominant communication styles. *Refusal asymmetry: stricter handling of some topics and identities than others. *Homogenised culture*: local nuance flattened toward the dominant cultural centre. None of this requires malice — it is what averaging unbalanced data produces, and it resurfaces in generated images (Lesson 2), search-adjacent products, moderation systems, and any downstream system that inherits model judgements.

**Mitigations — two levels, with honest limits.** *Prompt level*, for your own outputs: specify counter-examples ("give three candidate profiles with varied backgrounds"), replace vague person-requests with explicit rubrics ("evaluate against these four stated criteria"), rephrase and compare (if two phrasings of the same request yield different judgements about a person, you have found the model's hidden weighting), and generate multiple variants instead of accepting the first default. *Process level*, for anything that affects people: never let a model be the judge of a person without a written rubric supplied by a responsible human; require diverse test cases before adopting a tool for screening, moderation or grading; keep the decision, and the accountability, with a person — the placement of the human from Module 10. Honest limits: prompt fixes shape *your* outputs, not the weights; bias can be reduced but not deleted, because "neutral" itself encodes a norm and trade-offs between competing fairness definitions are genuine engineering dilemmas. The durable skills are noticing, testing, and refusing to launder biased output into decisions.`,
        extras: [
          table(
            'Source → mechanism → symptom',
            ['Source', 'Mechanism', 'What you see'],
            [
              ['Training data', 'Web text carries history and skew', 'Stereotyped defaults, cultural flattening'],
              ['Objective', 'Optimises typical continuation', 'The statistically common association, repeated'],
              ['Raters / alignment', 'Human preferences with blind spots', 'Taste-coded "helpfulness", uneven refusals'],
              ['Your prompt', 'Ambiguous request → default', 'Whatever the model reaches for first'],
            ],
          ),
          tip(
            'Make criteria explicit to shrink default-driven skew',
            '"Assess this application against these four stated criteria, quoting evidence for each" replaces a vague judgement with a rubric — the highest-leverage prompt-level bias control there is.',
          ),
          warn(
            'Biased output about people must not re-enter the pipeline',
            'A shortlist, moderation flag or grade generated from stereotyped output becomes institutional bias with a machine\'s confidence attached. People-affecting judgements need rubrics, diverse testing and human decision-makers.',
          ),
          info(
            '"Neutral" is also a position',
            'Removing one stereotype does not produce objectivity — model defaults encode whichever norms dominated the data. This is why diverse evaluation and explicit criteria beat assertions that a tool is unbiased.',
          ),
        ],
        worked: {
          title: 'Diagnose and rework a biased screening prompt',
          problem:
            'A club uses an assistant to shortlist 40 applications for a technical role: prompt = "pick the five strongest candidates and explain why." Output: a shortlist clustered around one communication style and one profile type, with vague praise ("looks confident"). Diagnose the sources at work and rebuild the process.',
          steps: [
            {
              title: 'Name what happened',
              desc: 'An unanchored "strongest" request (your prompt, ambiguous) let the model substitute its learned association for a criterion (objective + data); vague evaluative language in the feedback ("confident", "professional") shows style-based judgement rather than evidence.',
            },
            {
              title: 'Supply a rubric and require evidence',
              desc: 'Rewrite: "Score each application 1–4 on: relevant skills, concrete project evidence, clarity of stated goals. Quote the supporting text for every score. Do not infer traits from writing style." Criteria in, defaults out — and quoted evidence makes each score auditable.',
              code_snippet: 'before: "pick the 5 strongest, explain why"\nafter:  score 4 criteria x 40 apps,\n        quote evidence, no trait inference,\n        flag missing info as "not stated"',
            },
            {
              title: 'Test for residual skew',
              desc: 'Run counterfactual checks: does the ranking change if irrelevant surface features change? Are scores explained by quotes or by adjectives? Inspect for under-represented names/styles appearing with systematically lower clarity scores — the concrete symptom to look for.',
            },
            {
              title: 'Put the human back where the stakes are',
              desc: 'Final selection stays with people reading the rubric outputs, checking the evidence quotes, and owning the decision. Record the rubric and the checks — that documentation is what turns "we used AI" into "we used a documented, auditable screen".',
            },
          ],
          solution:
            'The failure was ambiguity meeting learned defaults; the fix is an explicit rubric with quoted evidence, counterfactual testing for residual skew, and human decision-making over the machine\'s scored summary. Note what the fix did NOT do: change the model. It changed the task you gave it — which is all any prompt-level mitigation can do.',
        },
        practice: {
          title: 'Find a default, then break it',
          prompt:
            'Ask an assistant to "describe a typical day" for three occupations in two cultural settings. List the assumptions it made unprompted (gender, family, status, setting). Then re-ask with explicit counter-instructions and compare. Write down which changes stuck and which defaults survived.',
          hint: 'Defaults that survive explicit counter-instructions show you what is deepest in the distribution — that residue is what process-level controls exist for.',
        },
        mistakes: [
          {
            mistake: 'Assuming a model is objective because it is mathematical',
            fix: 'The arithmetic optimises typical continuation of skewed data. Mathematical machinery does not confer neutrality — it executes the bias efficiently.',
          },
          {
            mistake: 'Believing one clever prompt removes bias',
            fix: 'Prompting shapes outputs you generate; it does not change weights or other users\' outputs. For people-affecting work, rubrics, tests and humans are the control.',
          },
          {
            mistake: 'Treating "the model said" as evidence about a person',
            fix: 'A model judgement is an opinion generated from distributions — cite criteria and observed facts instead, or leave people out of model-mediated assessment entirely.',
          },
          {
            mistake: 'Ignoring bias in your own wording',
            fix: 'Ambiguous or loaded requests pull defaults forward. Request criteria explicitly; if your prompt smuggles assumptions, no mitigation downstream will undo them.',
          },
        ],
        exam: {
          question:
            'Name three stages of the LLM pipeline where bias enters, and give one mitigation at each stage.',
          answer:
            '(1) Pretraining data: web text encodes historical and cultural skew and unequal representation — mitigate with curation, filtering, rebalancing and multilingual inclusion by the provider; at your level, by counter-examples and diverse test cases in your own use. (2) The training objective: next-token prediction rewards statistically typical continuations, hardwiring "common" as "expected" — mitigate by instruction and rubrics that redefine what should be typical for your task. (3) Post-training/rater preferences: alignment encodes rater demographics and guidelines — mitigate with diverse rater pools and held-out fairness evaluations (provider side), and by never letting aligned taste stand as a judge of people in your workflows (user side). Cross-cutting mitigation: keep human decision-makers with explicit criteria wherever output affects people.',
          source: 'Standard responsible-AI question on bias sources across the ML lifecycle.',
        },
        summary: [
          'Bias enters via data (history), objective (typicality) and alignment (rater taste).',
          'Symptoms: default personas, uneven language quality, judgement skew, refusal asymmetry, cultural flattening.',
          'Prompt-level: counter-examples, explicit rubrics, rephrase-and-compare, multiple variants.',
          'Process level: rubrics, diverse tests, human decisions for anything affecting people.',
          'Mitigation reduces skew; it never certifies neutrality — keep evidence, not adjectives.',
        ],
      }),
      [
        [
          'Model bias toward stereotypes primarily originates in:',
          [
            'The random seed used at initialisation',
            'Training data that encodes historical patterns, amplified by an objective that rewards typical continuations',
            'The user\'s prompt alone',
            'Hardware precision limits',
          ],
          1,
          'Data carries the skew; the next-token objective makes the statistically common association the expected output.',
        ],
        [
          'Which prompt change most reduces default-driven judgement about applicants?',
          [
            'Adding "be unbiased"',
            'Providing explicit criteria with required quoted evidence for each score',
            'Raising the temperature',
            'Asking for a shorter answer',
          ],
          1,
          'Ambiguity is what defaults fill; a rubric with evidence requirements replaces them with auditable criteria.',
        ],
        [
          'A model produces lower "professionalism" scores for a regional dialect in screening output. The correct response is:',
          [
            'Accept it — dialect correlates with quality',
            'Treat it as a signal to inspect the criteria, test for skew, and keep humans on the decision',
            'Delete the audit and re-run',
            'Rephrase the prompt more politely',
          ],
          1,
          'Style-based judgement of people is exactly the failure class to catch with testing and human review, not to launder into a decision.',
        ],
        [
          'Which statement about prompt-level bias mitigation is accurate?',
          [
            'It rewrites the model\'s weights',
            'It shapes the outputs you generate but cannot change the model itself or other users\' outputs',
            'It guarantees unbiased results',
            'It only works on paid tiers',
          ],
          1,
          'Prompting is conditioning, not training — the durable controls for people-affecting uses are process-level.',
        ],
      ]
    ),
    lesson(
      M9,
      'lit-9-3',
      3,
      'Privacy and Academic Integrity: What You Share and What Counts as Work',
      'Where pasted text actually goes, the categories you should think twice about, the settings worth finding — and the rules that keep AI help from becoming a misconduct finding.',
      16,
      nineBlocks({
        objectives: [
          'Describe the data path of a pasted message in a cloud AI product',
          'Categorise material by sensitivity and choose a safer alternative workflow',
          'Locate and set training, retention and memory controls',
          'Apply institutional AI rules to decide permitted and prohibited uses of AI in coursework',
        ],
        hook:
          'A student pasted her full medical certificate, her entire group project (including a teammate\'s code) and three lines of her password reset email into a chatbot "just to check the wording". Nothing bad was published — and that is exactly the trap: the absence of a visible incident is not the absence of exposure. The question is never "did anything happen" but "what does the product\'s terms allow to happen", and almost nobody reads those terms at the moment they paste.',
        concept: `**The data path.** When you send a message to a cloud assistant, it travels over HTTPS to the provider's servers, joins your conversation history (retention policies vary — hours, weeks, or until you delete, depending on product and settings), and is processed by the provider and its sub-processors (hosting, monitoring, safety tooling). Depending on product, tier and settings, conversations may be **retained for abuse detection and quality**, **used to improve models** (often a toggle you can find — Lesson 3), and **occasionally reviewed by humans** in sampling processes the provider describes in its terms (typically for safety and quality, typically redacted — but "typically" is doing real work in that sentence: read your provider's actual wording). Two further facts worth internalising: retention and training defaults differ by product and tier and *change over time*, so the durable habit is locating the settings rather than memorising them; and anything routed through plugins, shared links or team workspaces widens the audience beyond "the model".

**Sort your material into three bins.** *Green*: public information, your own drafts you would post anyway, published course material — paste freely. *Amber*: personal but non-identifying (anonymised records, generalised questions, excerpts with names stripped), internal-but-ordinary material — paste with redaction and with training controls off. *Red*: passwords, API keys and tokens (never — not even a "test" key); government identifiers, financial and health records; unpublished research; client, employer or third-party confidential documents (you likely lack the right to share someone else's data at all); others' personal messages and images. The red bin gets alternatives: a local model (Module 7), an enterprise tier with contractual data terms, or no AI at all. The practical middle path for most daily work: **paste the smallest sufficient excerpt, redact identifiers, keep training off, and never paste secrets.** Data-protection law (in India, the DPDP Act and its rules; equivalents elsewhere) increasingly defines these obligations for organisations — but your personal hygiene is what protects your own material today.

**Academic integrity in the AI era.** Institutions are still converging, so *your institution's written policy is the authority* — read it before you use AI on graded work, and re-read it when it updates. Beneath the policy sits the stable principle: **submit work you can authorise and defend.** From it follow the norms most policies encode: undisclosed ghostwriting of graded submissions is the core violation (the work must be substantially yours, with AI help disclosed where required or permitted); using AI to *understand* material, brainstorm, get feedback, explain code (Module 8) and draft-and-you-rewrite is generally the permitted zone — but permitted zones are defined by your syllabus, not by this course; disguising someone else's work (including pasting and lightly rewriting) compounds the original problem. Two honest notes about enforcement: AI detectors are unreliable — error-prone in both directions — so neither panicking at a low "AI score" nor trusting a high one is rational; and process evidence (versions, drafts, notes, chat history) is the practical way to demonstrate your authorship when asked. When in doubt, ask your instructor — a two-minute question beats a misconduct case.`,
        extras: [
          table(
            'The three bins',
            ['Bin', 'Examples', 'Default move'],
            [
              ['Green', 'Public info, your own publishable drafts', 'Paste freely'],
              ['Amber', 'Anonymised data, generalised questions, work excerpts', 'Redact + training off + smallest sufficient excerpt'],
              ['Red', 'Passwords/keys, IDs, health/finance, unpublished work, others\' data', 'Local model, contractual enterprise tier, or no AI'],
            ],
          ),
          info(
            'Third-party data is a rights problem, not just a privacy one',
            'Pasting a teammate\'s code, a patient record or a client document shares data you may have no right to share. Confidentiality duties travel with the material — permission from you is not permission from everyone it concerns.',
          ),
          tip(
            'Find the data settings once per tool',
            'Settings → Data/Privacy: turn off training on your chats where offered, decide about memory/history, and read the retention sentence in the terms. Ten minutes total across your tools, renewed whenever settings change.',
          ),
          warn(
            'Never paste credentials — even as a test',
            'Keys pasted into a chat are logged somewhere, may be retained, and may surface in later contexts. Rotate any key you have ever pasted; treat paste boxes like public boards.',
          ),
        ],
        worked: {
          title: 'Triage a messy paste-queue and an AI-assisted report',
          problem:
            'Two situations. (A) A student is about to paste into a free chatbot: her full medical leave certificate (with ID number), the group\'s entire shared folder of notes including a teammate\'s code, and a client-style brief from her internship. (B) An AI-assisted lab report: she used an assistant to explain the theory and structure the write-up, and her own words for everything submitted. Triage both.',
          steps: [
            {
              title: 'Bin (A) item by item',
              desc: 'Medical certificate = Red (health + identifier) → summarise to a redacted text you actually need ("what are the dates and tone for a leave note?") with identifiers stripped, or handle offline. Group notes with teammate code = Red/Amber boundary → paste only your own subsection, redacted; you lack rights to your teammate\'s material. Internship brief = Red → employer confidentiality; ask a general question without the document, or use nothing at all.',
            },
            {
              title: 'Choose the alternative workflow',
              desc: 'What does she actually need? For the leave note: a template from public material + her facts. For the notes: her own excerpt only, training off. For the internship: a generic structure question with no client content. Pattern: extract the *need* from the *material* and share only the need.',
              code_snippet: 'need:  "tone + structure of a leave application"\npaste: dates + redacted facts (no ID, no diagnosis)\nnever: the certificate itself',
            },
            {
              title: 'Check (B) against policy and principle',
              desc: 'Read the institution\'s written rule: does it require disclosure? Is AI-assisted explanation/structuring within the permitted zone? Regardless: every submitted word must be hers, every claim verified against the source material, and she must be able to explain the whole report — the Module 8.2 defence standard.',
            },
            {
              title: 'Record the process',
              desc: 'Keep drafts, the chat history of her questions (not the output paste), and her own edits — process evidence that demonstrates authorship if ever questioned, and the honest mirror of what she actually did.',
            },
          ],
          solution:
            '(A) All three pastes were wrong: bin them Red, then share only the underlying need in redacted, minimal form — the general question survives, the sensitive document never travels. (B) Is defensible if the institution permits the help, the substance is hers and verified, and she can explain every part — with process evidence kept. Privacy and integrity reduce to the same reflex: share and submit only what you can stand behind.',
        },
        practice: {
          title: 'Audit your last ten conversations',
          prompt:
            'Open your recent AI conversation history. For each: did it contain anything in the Amber or Red bin — names, numbers, identifiers, others\' data, credentials? Note which settings (training, memory, retention) were on at the time. Write one process change you will apply from now on, and rotate anything that should never have been pasted.',
          hint: 'Look for the boring violations — "harmless" internal documents and casually pasted personal details are where real exposure accumulates.',
        },
        mistakes: [
          {
            mistake: 'Pasting whole confidential documents to get a small output',
            fix: 'Extract the need, redact identifiers, paste the smallest sufficient excerpt — or use a local/contractual channel when the material must not travel at all.',
          },
          {
            mistake: 'Assuming free-tier chats are private because nothing bad happened',
            fix: 'Absence of incident ≠ absence of exposure. The terms, retention and review practices define the risk; locate and set them per tool.',
          },
          {
            mistake: 'Trusting AI-detector scores as verdicts',
            fix: 'Detectors error in both directions and are not a fair adjudication mechanism. Authorship is demonstrated by process — drafts, versions, notes — not by a percentage.',
          },
          {
            mistake: 'Using AI to disguise rather than to help',
            fix: 'Pasting another person\'s work and rewriting it compounds the original violation with deception. Work within the permitted zone: understanding, feedback, drafting you then make your own.',
          },
        ],
        exam: {
          question:
            'A student pastes their entire unpublished thesis draft into a free chatbot. Identify three risks and describe one better workflow for the same need.',
          answer:
            'Risks: (1) confidentiality and future-publication integrity — the draft may be retained under the product\'s logging terms and potentially used for training by default settings, compromising novelty claims and any journal expectations of unpublished work; (2) third-party rights — co-authored passages, supervisor comments and quoted-unpublished material belong partly to others, whom the student cannot consent for; (3) loss of control — shared links, sub-processors and staff-review processes (as described in terms) put the text outside the student\'s custody, with no reliable way to confirm downstream handling. Better workflow: turn off training/history for the session, paste only the specific section being edited (smallest sufficient excerpt) with citations and names redacted, or use a local model for full-draft passes, and keep a versioned copy so any change remains traceable to her own edits.',
          source: 'Privacy-and-research-integrity scenario common in AI-policy assessments.',
        },
        summary: [
          'Pasted text travels: transport → history/retention → possible training and review — settings define the rest.',
          'Three bins: green paste, amber redact and minimise, red never (keys, IDs, health, others\' data).',
          'Find training/memory/retention controls per tool; defaults change, so habits beat memorised settings.',
          'Institutional policy is the authority on graded work; the principle is work you can authorise and defend.',
          'Detectors are unreliable both ways — process evidence is the fair proof of authorship.',
        ],
      }),
      [
        [
          'Before pasting an internal document into a free AI chatbot, the best first question is:',
          [
            'Is the answer long enough?',
            'May this data leave my organisation or my control under its terms and settings?',
            'Is the model the newest one?',
            'Did others paste similar documents?',
          ],
          1,
          'Data path and terms decide before capability — this is the Module 7 constraint-first rule applied to privacy.',
        ],
        [
          'Which item belongs firmly in the "never paste" bin?',
          ['A published syllabus', 'A password or API key', 'A redacted draft of your own essay', 'A public news article'],
          1,
          'Credentials pasted anywhere should be considered exposed and rotated; no redaction level makes a key safe to share.',
        ],
        [
          'The most reliable way to demonstrate authorship of AI-assisted coursework when questioned is:',
          [
            'An AI-detector score in your favour',
            'Process evidence: drafts, versions, notes and your ability to explain every part of the submission',
            'A written note from the assistant',
            'Submitting early',
          ],
          1,
          'Detectors are error-prone; versions plus defence of the work are what institutions can actually evaluate.',
        ],
        [
          'Under most institutional policies, which use of AI on a graded assignment is most likely to be permitted?',
          [
            'Submitting an assistant\'s full answer with a light rewrite',
            'Using it to understand the material and get feedback, then producing and defending your own submission per the stated policy',
            'Pasting a classmate\'s assignment for "restructuring"',
            'Using it covertly after a ban, undetected',
          ],
          1,
          'Understanding, feedback and drafting-you-own are the normal permitted zone — but your institution\'s written rule is the authority.',
        ],
      ]
    ),
    lesson(
      M9,
      'lit-9-4',
      4,
      'Deepfakes, Misinformation and the Jobs Question',
      'Synthetic media as an everyday hazard, a verification routine that does not depend on detectors, and an honest, non-hyped frame for what AI does to work.',
      16,
      nineBlocks({
        objectives: [
          'Recognise common synthetic-media patterns and their practical red flags',
          'Apply a source-and-corroboration routine instead of relying on detectors',
          'Distinguish task automation from job elimination in the employment discussion',
          'Describe skills that gain value as generation becomes cheap',
        ],
        hook:
          'During a tense week, a voice note circulates on a student group: the dean, apparently, changing a rule in a specific, infuriating way. The voice is his. The words were never spoken. It took one call to the actual office to deflate it — but the note had already been forwarded forty times, and the correction travelled a fraction as far. The economics of that sentence — fabrication cheap, verification costly, correction slow — is the whole misinformation problem in miniature.',
        concept: `**Synthetic media, without the mystery.** Voice cloning needs seconds of captured audio; face-swap and lip-sync video are commodity tools; generated images and fake "news-style" pages are a prompt away (Module 7, Lesson 2). What has changed is not that fakery is new — photo editing and actor re-recordings are old — but that the cost of convincing fabrication collapsed toward zero while distribution keeps rewarding provocation. Detection tools exist and are not worthless, but they cannot be your first line: accuracy varies with format and quality, real-but-selectively-edited media confuses classifiers, generated quality keeps improving, and you rarely have the original to compare against. Watermarks and signed content-credentials metadata help where producers and platforms adopt them — adoption is partial and metadata strips on re-upload. **Therefore: verify the source, not the artefact.**

**A routine that works without forensics.** (1) **Trace origin** — who first published it, on what account, with what history? Screenshots and forwarded clips are already orphans; find the original. (2) **Lateral reading** — open new tabs: is any independent, reputable outlet reporting the same event? One source alone is a lead, not a fact. (3) **Check date and context** — real footage from another event, mislabelled, is the oldest trick; confirm when and where. (4) **Mind the affect** — content engineered to provoke instantly (outrage, fear, glee) deserves *more* skepticism, not less; virality is a distribution property, not an evidence property. (5) **Proportion the response** — decide what you would do on the strength of this alone; if the answer is "change a belief, a vote, a bank transfer, a public accusation", verification is mandatory and forwarding is not neutral: sharing amplifies. (6) **After major events, slow down** — the first hours are when fabrication peaks. This routine scales down to a ten-second check for trivial content and up to full research for anything consequential.

**The jobs question, handled honestly.** Two failure modes to avoid: techno-panic ("all white-collar jobs are ending") and dismissal ("it never really changes anything"). The accurate frame: **tasks change before jobs do.** Roles are bundles of tasks; automation takes the task-shaped pieces that are cheap to generate — first drafts, boilerplate code, summaries, routine correspondence — and leaves specification, verification, judgement, relationships and accountability. Historically, technology has redistributed work as much as eliminated it, while genuinely killing specific *tasks* (that is not comfort — specific occupations have been hit hard; the honest statement is that prediction at the individual level is unreliable). What rises in value when generation is cheap: **choosing and specifying well** (Module 6 skills), **verifying** (Modules 8–9), **domain depth** that lets you judge output, **responsibility-bearing roles** where someone must sign, and **human-facing work** where trust and presence are the product. What falls first: work that is mostly undifferentiated text production with no verification step. The strategic response is not fear; it is becoming the person who directs and checks the tools better than the person who only consumes their output.`,
        extras: [
          table(
            'Deepfake / misinfo red flags',
            ['Signal', 'Why it matters'],
            [
              ['No original source, only a clip or screenshot', 'Provenance has been cut — find the first publication'],
              ['Sole account, new or locked history', 'No track record to weigh'],
              ['Nobody reputable reports it', 'Independent corroboration is the real test'],
              ['Perfect, instant provocation', 'Engineered virality, not evidence'],
              ['Date/context mismatch', 'Real media, wrong event — check when/where'],
              ['Request for urgency, secrecy or money', 'Pressure exists to bypass your checking'],
            ],
          ),
          info(
            'Detectors are a tool, not a verdict',
            'Detection accuracy varies by format and improves/decays as models evolve. Treat a detector result as one weak signal beside origin-tracing and corroboration — never as the thing that settles it.',
          ),
          tip(
            'Forwarding is a decision',
            'Every share is a small publication under your name. For anything consequential, the verification routine runs before the share button, not after the damage.',
          ),
          warn(
            'The correction never travels as far',
            'Fabrications spread on emotion; corrections spread on diligence. Your personal rule should be: check before amplifying — you cannot rely on a later retraction to undo your share.',
          ),
        ],
        worked: {
          title: 'Handle a viral clip and a headline about jobs',
          problem:
            'Part 1: a 20-second clip shows a faculty member apparently endorsing a paid certificate scheme, circulating with angry comments. Part 2: an article claims "AI will eliminate 40% of jobs by 2030, says study". Work both through the routines from this lesson.',
          steps: [
            {
              title: 'Clip — trace before reacting',
              desc: 'Find the original poster and account history; search the claim text and the faculty member\'s name across reputable outlets; check whether the institution has issued anything; note the clip\'s cut points (a 20-second excerpt is context-free by construction).',
            },
            {
              title: 'Clip — decide proportionally',
              desc: 'If origin and corroboration are absent, the correct status is unverified — no comment, no share, no forwarding to other groups. If the concern is real, the verified path exists: contact the office directly. Either way the emotional charge never substitutes for provenance.',
            },
            {
              title: 'Headline — interrogate the claim shape',
              desc: '"40% of jobs" has the structure of an AI-generated or heavily distorted summary: find the study, check what it actually measured (task exposure ≠ job elimination), who funded it, what "by 2030" and "eliminate" mean in it. Specific percentages with vague referents are a classic confabulation signature.',
              code_snippet: 'headline -> find the study -> what was measured?\ntasks exposed? occupations modelled? assumptions?\n"exposure" != "elimination" != "unemployment"',
            },
            {
              title: 'Headline — replace with the frame',
              desc: 'Keep the task-versus-job distinction from the concept: which tasks get automated, which roles absorb verification and accountability, what skills gain value. That frame survives whatever the specific study said — which is why the frame, not the percentage, is what you should carry.',
            },
          ],
          solution:
            'Clip: origin → corroboration → proportionate response, defaulting to unverified-and-unshared when provenance is missing. Headline: find the primary study, distinguish exposure from elimination, and fall back on the task-bundle frame that is robust to bad statistics. Both exercises end the same way: the feeling the content produced has zero weight in the verdict.',
        },
        practice: {
          title: 'Run the routine on something you nearly shared',
          prompt:
            'Find a piece of media or a headline from this week that made you want to react. Run the six-step routine: origin, independent coverage, date/context, affect check, proportion, share decision. Write five lines: status (verified/unverified), what you would have assumed without checking, and what you did.',
          hint: 'Pick something you actually reacted to emotionally — the routine only teaches anything when the stakes are real.',
        },
        mistakes: [
          {
            mistake: 'Treating a detector result as proof',
            fix: 'Detectors are format-sensitive and imperfect in both directions. Origin and corroboration are the durable tests; the detector is one weak signal.',
          },
          {
            mistake: 'Assuming video and audio are inherently real',
            fix: 'Cloning and swapping are commodity operations now. Any clip without provenance starts as unverified — that is not cynicism, it is the current baseline.',
          },
          {
            mistake: 'Reading "jobs" headlines at face value',
            fix: 'Separate task exposure from occupational elimination from unemployment; check what the study measured. Most headlines collapse three different claims into one.',
          },
          {
            mistake: 'Forwarding first, verifying later',
            fix: 'Sharing is publication and corrections travel slower. For anything with consequence, the routine runs before the share — every time.',
          },
        ],
        exam: {
          question:
            'Why can deepfake detection tools not serve as a user\'s primary defence, and what should a user do instead?',
          answer:
            'Detection is an arms race on the artefact itself: accuracy varies by media type and quality, generated content keeps improving, edited-real media confuses classifiers, watermarks and metadata are optional and easily stripped, and users rarely possess a clean original for comparison. A verdict from such a tool is one imperfect signal, not proof. Users should verify the source instead: trace the original publication and account history, read laterally across independent reputable outlets, check date and context for reused media, notice engineered provocation, and gate any consequential belief or action on corroboration — while treating detectors as a secondary hint. The core shift: from "is this image synthetic?" to "who says this happened, and who else confirms it?"',
          source: 'Media-literacy and platform-safety question; mirrors election/crisis guidance from news organisations.',
        },
        summary: [
          'Fabrication cost collapsed while distribution rewards provocation — the core misinformation dynamic.',
          'Detection cannot be first line; verify origin, corroboration, date/context, and your own affect.',
          'Forwarding is publication: check before amplifying, because corrections travel slower.',
          'Jobs frame: tasks change before jobs do; bundles get re-specified, not simply deleted.',
          'Value rises in specification, verification, domain depth and accountable, human-facing work.',
        ],
      }),
      [
        [
          'The most reliable first check on a viral clip is:',
          [
            'Running it through a deepfake detector',
            'Tracing the original source and checking independent reputable coverage',
            'Counting the likes',
            'Reading the comments for expert opinion',
          ],
          1,
          'Provenance and corroboration are artefact-independent; detectors are imperfect secondary signals at best.',
        ],
        [
          'Which is the strongest red flag that a circulating "news" item is unverified?',
          [
            'It is short',
            'It exists only as a screenshot or forwarded clip with no traceable original publication',
            'It mentions politics',
            'It was posted in the evening',
          ],
          1,
          'Missing provenance means nobody can weigh the original context — every other signal is weaker than that one.',
        ],
        [
          'The healthiest frame on "AI will eliminate jobs" claims is:',
          [
            'Ignore them entirely — technology always creates jobs',
            'Treat them as panic — nothing really changes',
            'Separate task exposure from role elimination: tasks are automated first, roles get re-specified, and the individual predictions are unreliable',
            'Take the headline percentage as a plan of record',
          ],
          2,
            'Tasks change before jobs do; bundles of tasks are re-specified with verification and accountability retained — and precise forecasts deserve scrutiny.',
        ],
        [
          'When generation is cheap, which skill rises most in value?',
          [
            'Producing more drafts per hour',
            'Specifying work well and verifying output against evidence',
            'Memorising tool names',
            'Speed-typing prompts',
          ],
          1,
          'When anyone can generate, the scarce abilities are deciding what is needed and judging what is true — Modules 6 and 9\'s core skills.',
        ],
      ]
    ),
  ],
};
