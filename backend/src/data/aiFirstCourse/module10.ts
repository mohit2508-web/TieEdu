// AI.FIRST — Module 10 · T · Responsible AI
import type { CourseModule } from '../db';
import { nineBlocks, diagram, table, tip, warn } from '../nineBlocks';
import { lesson, proofOfWork, M, COURSE_ID } from './helpers';

const ID = M(10);

export const module10: CourseModule = {
  id: ID,
  course_id: COURSE_ID,
  title: 'Module 10 — Responsible AI',
  summary:
    'T · Transform — answer for it. Bias and fairness you can test, privacy and India\'s DPDP Act, copyright, disclosure and integrity, and the regulation and governance landscape from the EU AI Act to company AI policies.',
  sort_order: 10,
  lessons: [
    lesson(
      ID,
      'aif-m10-1',
      1,
      'Bias and Fairness You Can Test',
      'Where bias enters an AI system, how to measure it, the trade-offs between fairness definitions, and practical mitigations.',
      44,
      nineBlocks({
        objectives: [
          'Identify where bias enters: data, labels, design choices, deployment context',
          'Run a swap test and a group-wise error comparison on an AI system',
          'Explain why different fairness definitions can conflict, and choose one for a context',
        ],
        hook:
          'In 2018 Reuters reported that a large technology company had scrapped an experimental AI recruiting tool after finding it downgraded résumés containing the word "women\'s" — as in "women\'s chess club captain". Nobody programmed that. The model learned it from ten years of hiring data from a male-dominated industry. Bias in AI is rarely a villain writing a rule; it is history, patterns and blind spots, automated at scale.',
        concept: `**Where bias enters**
1. **Historical data** — the past reflects past discrimination (hiring, lending, policing).
2. **Representation** — some groups, languages, accents or regions are under-represented, so the model is less accurate for them (speech recognition on regional accents; skin-condition images mostly of lighter skin).
3. **Labels** — human labellers bring their own judgements ("professional appearance", "toxic language" in dialects).
4. **Proxies** — removing a protected attribute does not remove bias: pincode, college name, surname or language can stand in for caste, religion, gender or class.
5. **Design and deployment** — what the system optimises (clicks? cost?) and where it is used (a model trained in one city used in another).
6. **Generative stereotypes** — image generators asked for "a doctor" or "a CEO" over-represent some groups; text models can associate jobs or traits with genders, communities or regions.

**How to test**
- **Swap test (counterfactual)** — change only a demographic signal (name, gender, pronoun, region) and compare outputs. Different advice for "Priya" and "Rahul" with identical résumés is a red flag.
- **Group-wise metrics** — compute accuracy, false-positive and false-negative rates **per group**. A fraud model with equal overall accuracy may wrongly flag one group three times as often.
- **Representation checks** — who is in the training and test data? Who is missing?
- **Qualitative review** with affected people — they see harms metrics miss.

**Fairness definitions can conflict.** *Demographic parity* (equal selection rates across groups), *equal opportunity* (equal true-positive rates) and *calibration* (a score means the same risk in every group) generally cannot all hold at once when base rates differ. Choosing one is a **value judgement** that should be made explicitly, with stakeholders — not hidden in a default.

**Mitigations**: better and more representative data; removing or controlling proxies; re-weighting; adjusting thresholds per context with justification; human review for consequential decisions; documentation (model cards); monitoring after deployment; and sometimes deciding **not to automate** the decision.`,
        extras: [
          diagram(
            'Where bias enters the pipeline',
            `flowchart LR
  H["Historical & social patterns"] --> D["Training data<br/>representation gaps"]
  D --> LB["Labels<br/>human judgement"]
  LB --> MD["Model + design choices<br/>what it optimises · proxies"]
  MD --> DP["Deployment context<br/>who uses it, where"]
  DP --> O["Outputs & decisions"]
  O -->|"feedback loop: biased decisions create biased future data"| D
  T["Tests: swap · group-wise errors · representation · affected people"] -.-> O`
          ),
          table('Group-wise errors reveal what overall accuracy hides (illustrative)', ['Group', 'Accuracy', 'False-positive rate', 'Meaning'], [
            ['Urban applicants', '91%', '4%', '4 in 100 genuine applicants wrongly flagged'],
            ['Rural applicants', '89%', '13%', '13 in 100 wrongly flagged — 3× the burden'],
            ['Overall', '90%', '7%', 'The headline hides the disparity'],
          ]),
          tip(
            'The swap test takes ten minutes',
            'Write one realistic prompt (a résumé, a loan query, a medical question). Make 4 versions differing only in name/gender/region. Compare tone, recommendations and numbers. Run it on every AI tool you rely on for decisions about people.',
          ),
        ],
        worked: {
          title: 'Audit an AI résumé screener',
          problem:
            'A company uses an AI tool to shortlist candidates for campus hiring. Design a two-week bias audit.',
          steps: [
            { title: 'Swap test', desc: '50 real anonymised résumés × 4 versions varying name (signalling gender and community) and college tier. Compare scores.' },
            { title: 'Group-wise outcomes', desc: 'From last season: shortlist rates and later interview success by gender, region and college tier.' },
            { title: 'Proxy review', desc: 'Check which features drive scores — college name, pincode, gaps in education — and whether they act as proxies.' },
            { title: 'Decide', desc: 'If disparities appear: remove proxies, require human review of all rejections near the threshold, document the fairness criterion chosen (for example equal opportunity) and re-audit each season.' },
          ],
          solution:
            'An audit combines counterfactual tests, group-wise outcomes and proxy analysis, and ends in explicit, documented choices — including whether the tool should screen out anyone without human review.',
        },
        practice: {
          title: 'Run a swap test',
          prompt:
            'Choose one AI assistant. Ask for career or financial advice for a profile, then repeat with only the name and gender changed, then only the state of origin changed. Record differences in recommendations, salary figures or tone, and write a 100-word finding.',
          hint: 'Keep everything else identical, including punctuation. Run each version twice to separate bias from randomness.',
        },
        mistakes: [
          {
            mistake: 'Assuming removing gender or caste columns removes bias',
            fix: 'Proxies (pincode, surname, college) carry the signal. Test outcomes, not just inputs.',
          },
          {
            mistake: 'Reporting only overall accuracy',
            fix: 'Report error rates per group; disparities hide in averages.',
          },
          {
            mistake: 'Treating fairness as a purely technical setting',
            fix: 'Choosing a fairness definition is a value decision — make it explicit with stakeholders and document it.',
          },
        ],
        exam: {
          question: 'How can an AI system be biased if it never sees protected attributes like gender or caste?',
          answer:
            'Through proxies and patterns in the data. Other features — names, pincodes, colleges, language, career gaps — correlate with protected attributes, and historical outcomes in the training data reflect past discrimination, so the model can reproduce disparities without ever seeing the attribute. That is why fairness must be tested on outcomes, with swap tests and group-wise error rates, rather than assumed from removing columns.',
          source: 'Common in responsible-AI, data-science and policy interviews.',
        },
        summary: [
          'Bias enters via history, representation, labels, proxies, design and deployment.',
          'Test with swap tests, group-wise error rates and affected people.',
          'Fairness definitions can conflict; choose explicitly and document.',
          'Mitigate with data, proxy control, human review, monitoring — or do not automate.',
        ],
      }),
      [
        ['A "swap test" for bias means:', ['Swapping models', 'Changing only a demographic signal in the input and comparing outputs', 'Swapping training and test data', 'Changing the temperature'], 1, 'Counterfactual comparison.'],
        ['Removing the gender column from training data:', ['Guarantees fairness', 'Does not remove bias carried by proxies such as names or activities', 'Is illegal', 'Improves accuracy always'], 1, 'Proxies carry the signal.'],
        ['Overall accuracy is equal, but one group has 3× the false-positive rate. This shows:', ['The model is fair', 'Disparity hidden by the average', 'A data leak', 'Underfitting'], 1, 'Always report group-wise errors.'],
        ['Choosing between demographic parity and equal opportunity is:', ['A default setting', 'A value judgement to be made explicitly with stakeholders', 'Irrelevant', 'Decided by the GPU'], 1, 'Definitions can conflict.'],
      ]
    ),
    lesson(
      ID,
      'aif-m10-2',
      2,
      'Privacy, Data and India\'s DPDP Act',
      'What happens to what you paste, the Digital Personal Data Protection Act 2023 in practice, and the rules you follow every time you use AI with personal data.',
      44,
      nineBlocks({
        objectives: [
          'Explain what AI providers may do with data you submit, and the settings that control it',
          'Summarise the core principles and obligations of India\'s DPDP Act 2023 relevant to AI use',
          'Apply a "what never to paste" rule-set and data-minimisation in daily AI work',
        ],
        hook:
          'In 2023 Samsung restricted staff use of generative AI tools after reports that engineers had pasted confidential source code and internal meeting notes into a public chatbot. Nobody was hacked. They simply did not think about where the text went. Every day, students paste classmates\' marks, interns paste client lists and doctors paste patient notes into AI tools — and in India, since the DPDP Act, that is no longer just careless. It can be a legal problem for their organisation.',
        concept: `**Where your input goes.** Depending on the product and plan, what you submit may be stored, reviewed by people for safety, and — on some consumer plans — used to improve models unless you opt out. Business and enterprise plans and APIs commonly offer stronger commitments (no training on your data, retention limits, data-residency options). **Read the data-use settings** of each tool and use the plan your organisation has approved.

**India\'s Digital Personal Data Protection Act, 2023 (DPDP Act)** governs digital personal data. Key ideas (simplified — check the Act and the DPDP Rules notified in 2025, which phase in obligations over the following months):
- **Personal data** — any data about an identifiable individual. **Data principal** — the person; **data fiduciary** — the organisation deciding why and how data is processed; **data processor** — processes on its behalf (an AI vendor can be a processor).
- **Lawful basis** — usually **consent** that is free, specific, informed and unambiguous, with clear notice of purpose; or certain "legitimate uses" defined in the Act.
- **Purpose limitation and data minimisation** — use data only for the stated purpose and only what is necessary.
- **Accuracy, security safeguards and breach notification** to the Data Protection Board and affected persons.
- **Rights of data principals** — access, correction and erasure, grievance redressal, nomination.
- **Children** — verifiable parental consent for under-18s; no tracking, behavioural monitoring or targeted advertising directed at children.
- **Penalties** — up to ₹250 crore for some failures such as inadequate security safeguards.

**What this means when you use AI**
- Do not paste other people\'s personal data into AI tools unless your organisation has an approved tool, purpose and basis for it.
- **Minimise**: remove names, phone numbers, Aadhaar/PAN, addresses, roll numbers; replace with placeholders (Student A, ₹X).
- Use **approved enterprise tools** with appropriate contracts for organisational data.
- Treat **sensitive categories** (health, finances, biometrics, children\'s data, caste/religion) with extra care.

**Never paste**: passwords, OTPs, API keys, private keys; Aadhaar/PAN/bank details; medical records with identities; confidential company or client information without approval; anyone else\'s private messages or photos.`,
        extras: [
          diagram(
            'Before you paste — a 10-second check',
            `flowchart TD
  P["About to paste into an AI tool"] --> S{"Secrets?<br/>passwords · OTP · keys"}
  S -->|"yes"| STOP["Stop — never"]
  S -->|"no"| PD{"Personal data about anyone?"}
  PD -->|"no"| CF{"Confidential org/client info?"}
  PD -->|"yes"| MIN{"Can you anonymise it?"}
  MIN -->|"yes"| ANON["Replace with placeholders, then use"]
  MIN -->|"no"| APP{"Approved tool + purpose + basis?"}
  APP -->|"no"| STOP
  APP -->|"yes"| USE["Use the approved tool only"]
  CF -->|"yes"| APP
  CF -->|"no"| OK["OK to paste"]`
          ),
          table('DPDP Act — key terms in plain language', ['Term', 'Meaning', 'AI example'], [
            ['Data principal', 'The person the data is about', 'A student whose marks are analysed'],
            ['Data fiduciary', 'Organisation deciding purpose and means', 'The college running the analysis'],
            ['Data processor', 'Processes data on the fiduciary\'s behalf', 'The AI vendor whose API is used'],
            ['Consent', 'Free, specific, informed, unambiguous, with notice', 'Clear opt-in for an AI tutor using chat logs'],
            ['Purpose limitation', 'Use only for the stated purpose', 'Attendance data not reused for marketing'],
            ['Children', 'Under 18; verifiable parental consent', 'School AI apps need guardian consent'],
          ]),
          warn(
            'This is orientation, not legal advice',
            'The DPDP Act and Rules are detailed and phased in over time. For organisational decisions, read the official text and consult your organisation\'s legal or data-protection team.',
          ),
        ],
        worked: {
          title: 'Make a marks analysis DPDP-aware',
          problem:
            'A class representative wants to paste a spreadsheet of 60 classmates\' names, roll numbers, phone numbers and marks into a free AI chatbot to "find who needs help". Advise.',
          steps: [
            { title: 'Identify', desc: 'Names, roll numbers, phone numbers and marks are personal data of 60 data principals. The rep has no authorisation to process them for this purpose.' },
            { title: 'Minimise', desc: 'The analysis needs only marks per subject. Drop names and phone numbers; replace roll numbers with S01–S60 and keep the key offline.' },
            { title: 'Right channel', desc: 'Better still, ask the faculty advisor — the college is the data fiduciary and can use an approved tool for a stated purpose.' },
            { title: 'Result', desc: 'If allowed, analyse the anonymised sheet; share only aggregate patterns ("12 students below 40 in Maths"), never individual results.' },
          ],
          solution:
            'Minimise, anonymise and route through the organisation that is accountable for the data. Help for struggling classmates does not require exposing their personal data to an unapproved third party.',
        },
        practice: {
          title: 'Privacy settings audit',
          prompt:
            'For two AI tools you use, find and record: whether your inputs may be used for training, how to opt out, retention period, whether chat history and memory can be deleted, and whether a business/education plan offers different terms. Change at least one setting.',
          hint: 'Look under Settings → Data controls / Privacy, and in the provider\'s privacy policy.',
        },
        mistakes: [
          {
            mistake: 'Assuming free consumer tools treat data like enterprise tools',
            fix: 'Terms differ by plan. Check settings and use approved tools for organisational data.',
          },
          {
            mistake: '"It\'s just names and marks — not sensitive"',
            fix: 'It is still personal data. Minimise and anonymise by default.',
          },
          {
            mistake: 'Pasting secrets for "quick debugging"',
            fix: 'Redact keys and passwords; rotate any secret that was ever pasted.',
          },
        ],
        exam: {
          question: 'Your manager asks you to use an AI tool to analyse customer complaints that include names and phone numbers. What do you do?',
          answer:
            'I would first check whether we have an approved AI tool and a lawful basis and purpose for processing that data under our policy and the DPDP Act. I would minimise the data — removing names and phone numbers and replacing them with ticket IDs — since the analysis needs complaint text, not identities, and use only an enterprise tool with appropriate data terms. I would share aggregate findings, document what was processed and why, and involve the data-protection or legal team if anything is unclear.',
          source: 'Common in analyst, operations and compliance-aware roles in India.',
        },
        summary: [
          'Know what each tool does with your input; use approved plans for organisational data.',
          'DPDP Act: consent/legitimate use, purpose limitation, minimisation, security, rights, children, penalties.',
          'Minimise and anonymise by default; route personal data through the accountable organisation.',
          'Never paste secrets, IDs, financial or medical identities, or confidential data without approval.',
        ],
      }),
      [
        ['Under the DPDP Act, the organisation that decides why and how personal data is processed is the:', ['Data principal', 'Data fiduciary', 'Data processor', 'Data board'], 1, 'The fiduciary is accountable.'],
        ['The DPDP Act treats a "child" as a person under:', ['13', '16', '18', '21'], 2, 'Under 18; verifiable parental consent is required.'],
        ['The best first step before analysing classmates\' marks with AI is:', ['Paste everything', 'Remove identifying details and use an approved channel', 'Post results publicly', 'Use the largest model'], 1, 'Minimise and anonymise.'],
        ['Which should never be pasted into an AI tool?', ['A public news article', 'Your OTP or an API key', 'A recipe', 'Your own anonymised notes'], 1, 'Secrets never go into prompts.'],
      ]
    ),
    lesson(
      ID,
      'aif-m10-3',
      3,
      'Copyright, IP, Disclosure and Integrity',
      'Who owns AI output, what training on copyrighted work means, using others\' work responsibly, deepfakes and consent, and honest disclosure.',
      42,
      nineBlocks({
        objectives: [
          'Explain the main open questions in copyright for AI training and AI-generated output',
          'Use AI-generated content responsibly in academic, creative and commercial work',
          'Apply consent and disclosure rules for synthetic media and AI-assisted work',
        ],
        hook:
          'A design student wins a poster competition with an AI-generated image. A week later another entrant shows that the "original" style closely imitates a living illustrator who never consented, the rules required original work, and the prompt included the artist\'s name. The prize is withdrawn. Nobody broke the AI tool\'s terms. The student broke the competition\'s — and an unwritten rule of creative respect. AI makes making things easy; it does not make every use of them fair.',
        concept: `**Training and copyright (unsettled, evolving).** Large models are trained on vast amounts of text, images and code, much of it copyrighted. Whether that is lawful is being contested in courts and legislatures worldwide, including cases brought in India (for example by news organisations against AI developers in the Delhi High Court) and in the US and UK. Outcomes differ by country and are still developing — treat confident one-line claims either way with caution.

**Who owns AI output?** Many jurisdictions require **human authorship** for copyright. Purely AI-generated output may have weak or no copyright protection; work with substantial human creative contribution (selection, arrangement, editing) is more likely to be protected. AI providers\' terms generally assign you whatever rights they have in outputs — but cannot give you rights that do not exist, and do not guarantee the output does not resemble someone else\'s work.

**Practical rules for using AI output**
- **Check the rules of the context** — assignment, competition, publisher, client contract — before using AI-generated content.
- **Avoid imitating named living artists or writers** or reproducing recognisable copyrighted characters, logos and lyrics in commercial work.
- **Check for close copies** — reverse image search for images; plagiarism checks for text; licence checks for code suggestions in commercial projects.
- **Keep records** of prompts, tools and your edits — they evidence your contribution.

**Synthetic media, consent and deepfakes**
- Never create sexual, defamatory or deceptive synthetic media of real people. Creating or sharing such content can be a criminal offence in India under IT Act provisions, and platforms must act on complaints.
- Get **explicit consent** before cloning anyone\'s voice or likeness, even for fun.
- **Label** synthetic or materially altered media where it could be mistaken for real; India\'s government has moved to require prominent labelling of AI-generated content on major platforms.

**Disclosure and integrity**
- Academic: follow the policy; disclose tool and use (Module 6).
- Professional: disclose where the reader would reasonably care — client deliverables, journalism, research, anything presented as human expertise or testimony.
- Never present fabricated data, quotes, reviews or experiences as real.`,
        extras: [
          diagram(
            'Can I use this AI-generated content here?',
            `flowchart TD
  A["AI-generated content"] --> R{"Do the context's rules allow it?<br/>course · contest · client · publisher"}
  R -->|"no / unclear"| ASK["Ask, or do not use it"]
  R -->|"yes"| P{"Real person's likeness, voice or private info?"}
  P -->|"yes, no consent"| STOP["Do not create or use"]
  P -->|"no / consent given"| C{"Imitates a named living creator or copyrighted character/logo?"}
  C -->|"yes"| STOP
  C -->|"no"| CHK["Check for close copies; keep prompt + edit records"]
  CHK --> L["Label / disclose where readers would care"]
  L --> USE["Use it"]`
          ),
          table('Disclosure by context', ['Context', 'Typical expectation'], [
            ['Coursework', 'Follow course policy; state tool and purpose'],
            ['Research paper', 'Disclose per journal policy; AI is not an author; verify all citations'],
            ['Client deliverable', 'Follow contract; disclose material AI generation; confidentiality first'],
            ['Social media image/video', 'Label realistic synthetic media; never depict real people deceptively'],
            ['Job application', 'Your substance; AI polish acceptable unless prohibited; never invent experience'],
          ]),
          warn(
            'Deepfakes of real people cause real harm',
            'Non-consensual intimate imagery, fake videos of public figures and voice clones used for fraud harm real people and can be crimes. If you are targeted, preserve evidence and report to the platform and to cybercrime.gov.in (helpline 1930).',
          ),
        ],
        worked: {
          title: 'Decide on three uses',
          problem:
            'Decide: (1) AI illustrations for a club newsletter; (2) a cloned voice of the college principal to announce fest results "as a joke"; (3) AI-drafted code in a freelance client project.',
          steps: [
            { title: '(1) Newsletter art', desc: 'Usually fine: no real people, no imitation of named artists, labelled "AI-generated illustration" if the club\'s policy asks.' },
            { title: '(2) Principal\'s cloned voice', desc: 'No — a real person\'s voice without consent, likely to mislead; potential harm and disciplinary or legal consequences.' },
            { title: '(3) Client code', desc: 'Check the contract on AI use and confidentiality; use approved tools; review and test all code; check licences of any substantial suggested snippets; disclose if the client requires it.' },
          ],
          solution:
            '(1) yes with care, (2) no, (3) yes if the contract allows, with review, testing, licence checks and disclosure. The deciding questions are always rules, consent, imitation and disclosure.',
        },
        practice: {
          title: 'Policy hunt',
          prompt:
            'Find and summarise in five bullets each: your college\'s (or a well-known university\'s) policy on generative AI in assessments, and one major journal or publisher\'s policy on AI in submissions. Note one point where they differ.',
          hint: 'Many publishers say AI tools cannot be listed as authors and require disclosure in methods or acknowledgements.',
        },
        mistakes: [
          {
            mistake: 'Assuming AI output is automatically yours to use anywhere',
            fix: 'Ownership is uncertain and context rules apply. Check the rules and keep records of your contribution.',
          },
          {
            mistake: 'Prompting "in the style of" a named living artist for commercial work',
            fix: 'Describe the style in generic terms instead; respect creators who did not consent.',
          },
          {
            mistake: 'Cloning someone\'s voice or face "for fun"',
            fix: 'Explicit consent first, every time. Without it, do not create it.',
          },
        ],
        exam: {
          question: 'A marketing team wants to use AI-generated images and copy in a campaign. What risks do you raise?',
          answer:
            'Copyright and ownership — purely AI-generated output may not be protected and could resemble existing works, so we should check for close copies, avoid imitating named artists, logos or characters, and keep records of human contribution. Likeness and consent — no real people\'s faces or voices without permission. Disclosure and labelling obligations for realistic synthetic media. Accuracy of claims in the copy. Data confidentiality in the prompts. And brand review before publishing, with the tool\'s commercial terms checked.',
          source: 'Common in marketing, legal, product and consulting interviews.',
        },
        summary: [
          'Training on copyrighted data is contested and evolving, including in Indian courts.',
          'Purely AI output may lack copyright; human contribution matters; terms cannot create rights.',
          'Check context rules, avoid imitation, check for copies, keep records.',
          'Consent for likeness and voice; label synthetic media; disclose honestly.',
        ],
      }),
      [
        ['In many jurisdictions, copyright protection for purely AI-generated output is:', ['Always strong', 'Weak or uncertain because human authorship is usually required', 'Owned by the GPU maker', 'Automatic for 100 years'], 1, 'Human authorship is a common requirement.'],
        ['Creating a cloned voice of a real person without consent is:', ['Fine if it is a joke', 'Not acceptable — consent is required, and misuse can be unlawful', 'Required for marketing', 'Allowed for teachers'], 1, 'Consent first, always.'],
        ['Before using AI images in a competition entry, you should first:', ['Upscale them', 'Check the competition rules on AI-generated content', 'Remove the watermark', 'Add filters'], 1, 'Context rules decide.'],
        ['Most research publishers\' policies say AI tools:', ['Can be listed as co-authors', 'Cannot be authors; their use should be disclosed', 'Are banned entirely', 'Must write the abstract'], 1, 'Authors are accountable humans.'],
      ]
    ),
    lesson(
      ID,
      'aif-m10-4',
      4,
      'Regulation and Governance: From the EU AI Act to Your Organisation\'s Policy',
      'Risk-based regulation, India\'s approach, standards like ISO/IEC 42001, and how organisations govern AI — ending with a responsible-AI impact assessment.',
      44,
      nineBlocks({
        objectives: [
          'Explain the EU AI Act\'s risk tiers and why it matters to Indian companies',
          'Describe India\'s current approach to AI governance and the key instruments involved',
          'Draft an AI-use policy and complete a responsible-AI impact assessment for a real system',
        ],
        hook:
          'A Pune software firm builds an AI tool that ranks job applicants for a European client. Under the EU AI Act, AI used in recruitment is classed as high-risk — so the firm\'s client must show risk management, data governance, human oversight and documentation, and will ask the firm for evidence. The firm\'s engineers had never heard of the Act. Regulation is no longer something that happens to "big tech" far away; it arrives as a clause in your next contract.',
        concept: `**The EU AI Act (in force since August 2024, obligations phased in through 2025–2027)** is the first comprehensive AI law. It is **risk-based**:
- **Unacceptable risk — banned** (from February 2025): for example social scoring by public authorities, manipulative techniques causing harm, untargeted scraping of facial images to build recognition databases, emotion recognition in workplaces and schools (with narrow exceptions).
- **High risk — strict obligations**: AI in areas such as recruitment and worker management, education and exam scoring, credit scoring, essential services, critical infrastructure, law enforcement and migration. Requirements include risk management, data governance, technical documentation, logging, transparency to users, **human oversight**, accuracy and robustness, and conformity assessment.
- **Limited risk — transparency duties**: people must know they are talking to a chatbot; AI-generated or manipulated content (deepfakes) must be disclosed or labelled.
- **Minimal risk** — most AI (spam filters, games): no new obligations.
- **General-purpose AI models** have their own obligations (documentation, copyright policy, and extra duties for models with systemic risk), applying from August 2025.
Timelines for some high-risk obligations have been subject to proposed adjustments, so check the current schedule. It matters in India because it applies to AI systems **placed on or used in the EU market**, including those built by Indian companies.

**India\'s approach (as of 2026)** has favoured **guidelines and existing laws over a single AI statute**: the DPDP Act for personal data; the IT Act and IT Rules for intermediaries and harmful content, including amendments addressing synthetically generated content; sector regulators (RBI, SEBI, and others) issuing guidance for their domains; and national AI governance guidelines alongside the **IndiaAI Mission** for compute, datasets and skilling. Expect continued change — follow MeitY and your sector regulator.

**Standards and frameworks**: ISO/IEC 42001 (AI management systems), the NIST AI Risk Management Framework (govern, map, measure, manage), and model cards / datasheets for documentation.

**Organisational governance — what good looks like**
- An **AI-use policy**: approved tools, allowed and prohibited uses, data rules, disclosure, accountability.
- An **inventory** of AI systems and their risk level.
- **Impact assessments** before deploying consequential systems.
- **Human oversight** with clear roles; **incident reporting**; periodic **audits**.
- **Training** — like this course — so people can use AI well and safely.`,
        extras: [
          diagram(
            'EU AI Act — risk pyramid',
            `flowchart TB
  U["UNACCEPTABLE — banned<br/>social scoring · harmful manipulation · untargeted face scraping"]
  H["HIGH RISK — strict obligations<br/>recruitment · education · credit · critical services"]
  L["LIMITED RISK — transparency<br/>chatbots disclosed · deepfakes labelled"]
  N["MINIMAL RISK — no new duties<br/>spam filters · games"]
  U --> H --> L --> N
  G["General-purpose AI models: own obligations from Aug 2025"] -.-> H`
          ),
          table('Responsible-AI impact assessment — template', ['Section', 'Questions to answer'], [
            ['System & purpose', 'What does it do? Who uses it? What decision does it inform?'],
            ['Affected people', 'Who is affected, including people who never use it? Any children or vulnerable groups?'],
            ['Risk tier', 'Would it be high-risk under the EU AI Act? Sector rules in India?'],
            ['Data', 'What personal data? Lawful basis under DPDP? Minimisation? Retention?'],
            ['Fairness', 'Swap tests and group-wise errors done? Results?'],
            ['Reliability', 'Evaluation results; known failure modes; monitoring plan'],
            ['Human oversight', 'Who reviews what, with what authority to override?'],
            ['Transparency', 'Do people know AI is involved? Can they contest decisions?'],
            ['Security', 'Prompt-injection, data-leak and misuse risks; controls'],
            ['Decision', 'Deploy / deploy with conditions / do not deploy; owner; review date'],
          ]),
          tip(
            'Governance is a product feature',
            'Enterprise buyers increasingly ask for evaluation results, data-protection terms and oversight design before signing. Teams that document these well sell faster.',
          ),
          proofOfWork(
            10,
            'A responsible-AI impact assessment',
            'Complete the impact-assessment template for an AI tool used in your college or workplace, including a swap test and a privacy-settings review; recommend deploy, deploy with conditions, or stop.',
            'Complete the template for a system you built in Modules 7–9, with group-wise evaluation numbers, a data-flow diagram and the guardrails you implemented.',
            'Draft a two-page AI-use policy for a real team or organisation and complete an impact assessment for its most consequential AI use, with roles and a review date.',
            'Evidence behind every section (tests run, settings checked, people consulted) and a clear, owned decision.'
          ),
        ],
        worked: {
          title: 'Assess the applicant-ranking tool',
          problem:
            'Apply the impact assessment to the Pune firm\'s applicant-ranking tool for its European client.',
          steps: [
            { title: 'Tier', desc: 'Recruitment → high risk under the EU AI Act. The client (deployer) and the firm (provider) both have obligations.' },
            { title: 'Data and fairness', desc: 'Document training data sources; run swap tests and group-wise outcome analysis; remove proxies; record the chosen fairness criterion.' },
            { title: 'Oversight and transparency', desc: 'Recruiters see reasons, can override, and review all rejections near the threshold; candidates are informed AI is used and can request human review.' },
            { title: 'Documentation and monitoring', desc: 'Technical documentation, logs, accuracy and robustness testing, post-deployment monitoring and incident reporting.' },
            { title: 'Decision', desc: 'Deploy with conditions: shortlist support only (never auto-reject), quarterly bias audits, named owner, review in 6 months.' },
          ],
          solution:
            'The assessment turns a legal requirement into concrete engineering and process tasks — and into a sales advantage, because the client needs exactly this evidence.',
        },
        practice: {
          title: 'Classify five systems',
          prompt:
            'Classify under the EU AI Act tiers, with one-line reasons: (1) a college chatbot answering admission FAQs; (2) an AI that scores entrance-exam essays; (3) a spam filter; (4) an emotion-detection camera in classrooms; (5) an AI that sets credit limits. Then name the main Indian law or regulator relevant to each.',
          hint: '(4) falls under a prohibition with narrow exceptions; (2) and (5) are high-risk areas; (1) has transparency duties.',
        },
        mistakes: [
          {
            mistake: 'Assuming EU law is irrelevant to Indian companies',
            fix: 'It applies to AI placed on or used in the EU market — including Indian-built systems sold to EU clients.',
          },
          {
            mistake: 'Treating governance as paperwork after launch',
            fix: 'Do the impact assessment before deployment; it changes the design.',
          },
          {
            mistake: 'Quoting regulatory dates from memory',
            fix: 'Timelines are phased and sometimes adjusted. Check the official current source and date your notes.',
          },
        ],
        exam: {
          question: 'Explain the EU AI Act\'s risk-based approach and why an Indian company should care.',
          answer:
            'The Act sorts AI systems by risk: some practices are banned outright, such as social scoring by public authorities; high-risk systems — in areas like recruitment, education, credit and critical services — must meet requirements for risk management, data governance, documentation, logging, human oversight, accuracy and conformity assessment; limited-risk systems such as chatbots and deepfakes carry transparency duties; and minimal-risk systems have no new obligations, with separate duties for general-purpose AI models. An Indian company should care because the Act applies to systems placed on or used in the EU market, so EU clients will contractually require that evidence.',
          source: 'Frequent in AI-policy, consulting, legal-tech and product interviews.',
        },
        summary: [
          'EU AI Act: banned / high-risk / transparency / minimal, plus GPAI duties — phased 2025–2027.',
          'India: DPDP Act, IT Act and Rules, sector regulators, national guidelines, IndiaAI Mission.',
          'Standards: ISO/IEC 42001, NIST AI RMF, model cards.',
          'Governance: policy, inventory, impact assessments, oversight, incidents, audits, training.',
        ],
      }),
      [
        ['Under the EU AI Act, an AI system used to rank job applicants is classified as:', ['Minimal risk', 'High risk', 'Banned', 'Not covered'], 1, 'Recruitment is a listed high-risk area.'],
        ['A customer-service chatbot under the EU AI Act mainly carries:', ['A ban', 'Transparency duties — users must know they are interacting with AI', 'No duties of any kind', 'Criminal liability'], 1, 'Limited-risk transparency obligations.'],
        ['As of 2026, India\'s approach to AI governance relies mainly on:', ['A single comprehensive AI Act', 'Existing laws (DPDP, IT Act/Rules), sector regulators and national guidelines', 'No rules at all', 'The EU AI Act directly'], 1, 'Guidelines plus existing and sector law.'],
        ['ISO/IEC 42001 is:', ['A programming language', 'A standard for AI management systems', 'A GPU model', 'A privacy law'], 1, 'An organisational AI management-system standard.'],
      ]
    ),
  ],
};
