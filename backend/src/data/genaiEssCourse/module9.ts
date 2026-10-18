// Module 9 — Safety, IP & Compliance
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, code } from '../nineBlocks';
import { lesson, M9, COURSE_ID } from './helpers';

export const module9: CourseModule = {
  id: M9,
  course_id: COURSE_ID,
  title: 'Module 9 — Safety, IP and Compliance',
  summary:
    'What models actually retain and hand back (memorisation, regurgitation and the controls at every layer), the copyright landscape split into training-data and output questions with country-hedged honesty, data governance and PII with the acceptable-use policy that makes rules survive contact with real teams, and the regulatory map — India\'s DPDP Act essentials and the EU AI Act risk tiers translated into an engineering backlog.',
  sort_order: 9,
  lessons: [
    lesson(
      M9,
      'gae-9-1',
      1,
      'Memorisation and Regurgitation: What the Model Hands Back',
      'Why weights are neither a database nor a blank slate: what gets memorised and why, the five regurgitation risk classes, canary-style probes with honest limits, and the control stack from paste discipline to output scanning.',
      19,
      nineBlocks({
        objectives: [
          'Distinguish memorisation (verbatim recall) from generalisation and name the factors that push a model toward verbatim output',
          'Classify your own data into regurgitation risk classes — secrets, personal data, unpublished work, licensed text, public text',
          'Run a canary-style probe honestly and interpret a negative result without over-claiming safety',
          'Apply controls at each layer: what you send, vendor settings you verified, output-side scanning and incident response',
        ],
        hook:
          'A backend engineer, stuck at 11pm, pasted a debugging snippet into a public chatbot — snippet included a live payment-gateway key, "just for this one question". Nothing happened that night. Ten days later the key turned up in an unrelated fraud report: keys pasted into AI tools are a known harvesting vector, because logs are logs and people are people. The other half of the story is quieter: researchers have repeatedly demonstrated that language models can be coaxed into emitting *verbatim strings from their training data* — given a nudge of the beginning, the end comes back word for word. Neither half is a reason to panic; both are reasons to know what memorisation is, which of your texts are the memorisable kind, and which control sits at which layer.',
        concept: `**Weights are not a database — and not a blank slate either.** Training compresses statistical structure, and structure includes *strings*: sequences that appeared often, are highly predictable given a prefix, or are unusually low-entropy get disproportionately well-represented, and under the right prompt a model can reproduce them verbatim. The factors that raise verbatim-recall risk, hedged as always by model and provider: **repetition** in the corpus (the same sentence on ten thousand pages), **low uniqueness/entropy** (a serial number, a phone number, an API key — one nailing the prefix collapses the rest), **absence of deduplication** in the data pipeline, **model capacity and training exposure** (bigger models trained longer over repeated text memorise more — though capability and memorisation are separable properties), and **prompt shape** (prefix-completion attacks and repeated-query probing are the demonstrated extraction patterns; exact success rates are model-specific and rarely published for closed models — treat published attack papers as proofs of mechanism, not as your vendor's measured rate). The practical consequence: memorisation risk is *not uniform across your texts*. A widely quoted proverb is low-stakes to regurgitate; your unpublished patent draft or a customer's ID number, if ingested, is exactly the low-entropy kind of thing extraction research goes looking for.

**Five risk classes, five different costs.** (1) **Secrets and credentials** you pasted — API keys, tokens, passwords, connection strings: the worst class, because the control is 100% in your hands and the failure is avoidable outright. (2) **Personal data (PII)** — from web crawl (someone else's data surfacing to you) or from your own pasted sessions (retention and training defaults govern whether it ever enters a model; verified per provider, per product, at this date — consumer products and commercial APIs differ). (3) **Unpublished work** — thesis drafts, financials, roadmaps, M&As: exposure risk is about custody and novelty (who else could plausibly see a verbatim fragment, and did your paste void a confidentiality expectation?). (4) **Licensed/third-party text** — client documents under NDA, subscription articles, proprietary code: your rights to *read* a work are not rights to *feed* it to a third party (the bridge to Lesson 9.2's contract-versus-copyright point). (5) **Public text you own** — lowest risk, but regurgitation of your published copy still creates attribution and similarity problems for you and others. Threat models to hold in mind: *accidental disclosure* (a stranger receives your fragment — rare in consumer chat, but the demonstrated mechanism in extraction research), *deliberate extraction* (an attacker probing for training strings or probing *your* fine-tuned system), and *internal regression* (your own product echoes a pasted customer secret back into a later answer).

**The control stack, ordered by leverage.** Layer 1 — *what you send*: never paste credentials, tokens or personal data you would not paste in an email (write the rule as a test you can apply in three seconds); redact and tokenise what must go (detect → replace with local placeholders → generate → rehydrate the mapping locally — Lesson 9.3's minimisation pattern). Layer 2 — *vendor configuration you actually verified*: retention window, training opt-out, human-review exposure, sub-processors, deletion path — checked on the current documentation or contract for *that product* (API ≠ consumer app ≠ enterprise tier), dated, and re-checked when terms change; where the data class forbids egress, the answer is a self-hosted or zero-retention channel (Lesson 3.1's deployment frame), not a hopeful setting. Layer 3 — *output side*: deterministic scanning before anything leaves your system — known-secret patterns (high-entropy strings, key prefixes), regex/PII detectors, exact-match against a canary list — because exact string checks are reliable while *statistical* "did the model plagiarise this" detectors are not (the AI-detector unreliability problem from AI-literacy teaching applies in both directions: it cannot prove origin, so it cannot disprove leakage either). Layer 4 — *probe and monitor*: canary testing where you own the data (below), incident playbooks for discovery (revoke/rotate first, then assess duties — Lesson 9.4's breach timelines), and periodic re-verification of layer 2.

**Canary probes: useful, and honest about their limits.** Where you control fine-tune data or your own pipeline, plant a unique marker sentence (high-entropy, unguessable, safe) and periodically probe the model with its prefix; surfacing = a real finding. Where you do *not* control training (consumer tools), you cannot probe their corpus — so the posture is assumption, not testing: treat pastes as disclosures and rely on layers 1–2. And on negative results: a probe that comes back clean proves only that this prompt, this session, this model version did not emit the marker — sampling makes absence weak evidence. Re-run across prompt shapes and model versions, and never let a clean canary replace contract-level retention commitments. The engineering summary: memorisation is a real, measurable, unevenly-distributed property; your defence is classification of what you send, verified custody settings, deterministic output scanning, and probes that you interpret with appropriate humility.`,
        extras: [
          table(
            'Regurgitation risk classes: cost and primary control',
            ['Class', 'Example', 'Cost if it surfaces', 'Primary control'],
            [
              ['Secrets/credentials', 'API key pasted in a snippet', 'Immediate account compromise', 'Never paste — egress secret scanning as backstop'],
              ['PII', 'Customer chats, IDs, health details', 'Privacy incident, DPDP/other duties (9.4)', 'Redact-tokenise-remap; verified zero-retention channel'],
              ['Unpublished work', 'Thesis draft, roadmap, financials', 'Novelty, confidentiality, negotiation loss', 'Custody choice: local/enterprise tier, section-wise pastes'],
              ['Licensed third-party', 'Client NDA docs, paywalled articles', 'Breach of contract, IP claims (9.2)', 'Rights check before feeding; prefer retrieval you control'],
              ['Public text you own', 'Published marketing copy', 'Attribution/similarity noise', 'Accept, monitor, keep originals for proof'],
            ],
          ),
          code(
            `# Layer 1 + 3: egress guard before any provider call, ingress scan after
def outbound(text):
    if KEY_PATTERNS.search(text) or high_entropy(text):
        return BLOCK("credential-like content detected - strip it")
    tokenised = redact_pii(text)          # name/phone/mail -> local placeholders
    return send_approved_vendor(tokenised)  # register: zero-retention tier, training off

def inbound(answer):
    if KEY_PATTERNS.search(answer) or canary_list.matches(answer):
        return QUARANTINE(answer)         # deterministic checks only - no statistical guessing`,
            'regurgitation_guards.py',
            'python'
          ),
          warn(
            'Statistical AI detectors cannot prove or disprove leakage',
            'Exact-match canaries and secret-pattern scans are deterministic and trustworthy. "AI-written"/"plagiarism-style" detectors are neither — never build a compliance argument on them.',
          ),
          tip(
            'Write the paste rule as a three-second test',
            '"Would I paste this into an email to the whole company?" Secrets and PII fail it instantly. Rules people can apply under deadline pressure are the only rules that hold.',
          ),
        ],
        worked: {
          title: 'Assess and control regurgitation risk for a team pasting customer conversations into a chatbot',
          problem:
            'A 40-person support team pastes real customer conversations (names, order numbers, complaint text, occasionally card digits) into a consumer chatbot to draft replies — 60 pastes a day, three months in, no written policy. Leadership asks: what can go wrong, what do we change this week, and how do we know it worked?',
          steps: [
            {
              title: 'Step 1 — inventory and classify what is actually being pasted',
              desc: 'Sample 30 pastes and tag each by the five classes with counts: secrets (found: two Stripe test keys and a DB URL), PII (nearly all — names, phones, order data; two with card digits), unpublished (internal macros and discount rules), licensed (screenshots of a supplier portal), public. The inventory converts a vague fear into a ranked, arguable list — card digits and keys go to the top regardless of counts.',
            },
            {
              title: 'Step 2 — threat model the top two classes',
              desc: 'Keys: rotation needed regardless (assume exposure), plus the class is now banned outright with scanning as a backstop. Card digits: regulatory exposure well beyond this course\'s scope — the class never enters any GenAI tool; redaction happens *before* drafting. For PII generally: verify (and screenshot, dated) the current consumer product\'s retention, training-use and human-review settings — then decide the team belongs on an enterprise/commercial tier with a DPA and zero-retention where the class permits, or on a self-hosted channel where it does not.',
            },
            {
              title: 'Step 3 — build the control stack this week',
              desc: 'Rotate the exposed keys. Ship the three-second paste rule plus a redaction helper (detect → placeholder → draft → rehydrate) so the compliant path is also the fast path. Egress secret-scanning on any tool that posts to providers. Approved-tool register with each tool\'s verified settings (Lesson 9.3\'s policy artifact). Class-based routing: complaint drafting with redacted PII = approved; anything in classes 1, 2-sensitive or 4 = local model or non-GenAI workflow.',
              code_snippet: 'week 1: keys rotated, paste rule live, egress scanner on\nweek 2: redact-remap helper adopted (target >=80% of pastes through it)',
            },
            {
              title: 'Step 4 — probe, monitor and re-verify',
              desc: 'Where the team controls fine-tune or stored content, plant a canary marker in an internal document set and probe monthly across two prompt shapes — and record clean results as "no emission this run", never as "safe". Monitor: scanner block counts (they measure secret-attempt rate), redaction-helper adoption, shadow-tool discoveries. Re-verify vendor terms quarterly and on any vendor notice — retention and training defaults move silently, and your dated screenshots are the audit trail.',
            },
          ],
          solution:
            'A sampled paste inventory ranking five risk classes, key rotation and a hard class ban for secrets/card data, verified-and-dated custody settings with an approved-tool register, redaction-remapping so compliance is the fast path, deterministic egress scanning, canary probes interpreted without over-claiming, and quarterly re-verification — the four layers (send, configure, scan, probe) all instrumented instead of assumed.',
        },
        practice: {
          title: 'Audit your own last twenty pastes',
          prompt:
            'List the last 20 things you personally pasted into any AI tool (or would have). Classify each: secret / PII / unpublished / licensed-third-party / public. For every class present, write the control you would apply — a rule, a setting you verified with a date, or a scanner. Then answer: which single paste would you most regret if it resurfaced, and what is the one change that prevents its class entirely?',
          hint: 'If your answer for any class is "the vendor probably does not train on it", go check the current setting and date it — probably is not a control.',
        },
        mistakes: [
          {
            mistake: 'Treating memorisation risk as uniform ("nothing I paste matters" or "everything is doomed")',
            fix: 'Risk is class-shaped and text-shaped: secrets and low-entropy personal data dominate; public text barely registers. Classify, then spend control effort where the classes are dangerous.',
          },
          {
            mistake: 'Accepting a vendor FAQ as a retention guarantee',
            fix: 'Settings and terms differ per product and move over time. Verify the current documentation or contract, screenshot it with a date, and re-check quarterly or on notice.',
          },
          {
            mistake: 'Reading a clean canary probe as proof of safety',
            fix: 'Absence under one prompt, session and model version is weak evidence by construction. Re-run across shapes and versions; pair probes with contractual retention commitments.',
          },
          {
            mistake: 'Relying on statistical "AI/plagiarism detectors" for leakage',
            fix: 'Only deterministic checks belong in a compliance story: exact-match canaries, secret-pattern and entropy scans, PII regexes. Statistical detectors neither prove nor disprove leakage.',
          },
        ],
        exam: {
          question:
            'Define memorisation and regurgitation in a language model, list the factors that increase verbatim recall, and design a four-layer control stack for an organisation that pastes customer conversations into AI tools.',
          answer:
            'Memorisation: verbatim retention and reproduction of specific training strings, as opposed to generalisation (extracted patterns applied to new inputs). It concentrates in text that is repetitive, low-entropy given a prefix, undeduplicated, and elicited by prefix-completion or repeated probing; rates are model-specific and unpublished for closed models — treat attack research as mechanism proof, not as your vendor\'s rate. Regurgitation risk classes: secrets, PII, unpublished work, licensed third-party text, public text — each with a different cost. Four-layer stack: (1) *send-side discipline* — never paste credentials or prohibited classes, redact-tokenise-remap everything else so the compliant path is fast; (2) *verified custody* — per-product retention, training-use, human-review and sub-processor settings checked and dated, enterprise/zero-retention or self-hosted channels where the class demands; (3) *output-side deterministic scanning* — secret patterns, entropy, PII detectors and canary exact-match before output leaves the system (statistical detectors excluded from the compliance argument); (4) *probe and monitor* — canary tests where you own the data with honest interpretation of clean results, block/adoption metrics, incident playbooks with rotation first, and quarterly re-verification of vendor terms because they move.',
          source: 'Data-safety screen question; pairs Lessons 3.1/9.3 with this lesson\'s memorisation mechanics.',
        },
        summary: [
          'Weights are neither database nor blank slate: repeated, low-entropy, undeduplicated text is what surfaces verbatim.',
          'Five risk classes with different costs — secrets and sensitive PII lead; classification beats blanket fear or blanket faith.',
          'Four layers: what you send, verified vendor custody, deterministic output scanning, canary probes + monitoring.',
          'Exact-match checks are trustworthy; statistical AI/plagiarism detectors are not evidence in either direction.',
          'Date your vendor verification and re-check quarterly — settings move silently, and a clean probe is not a guarantee.',
        ],
      }),
      [
        [
          'Verbatim recall from a model is most likely for text that is:',
          [
            'Short and generic',
            'Repeated often, low-entropy given a prefix, and undeduplicated in training — the shape extraction research targets',
            'Written after the knowledge cutoff',
            'Formatted as a list',
          ],
          1,
          'Repetition plus predictability plus no dedup is the memorisation recipe; generic one-off prose generalises instead of storing.',
        ],
        [
          'A developer pastes a live API key into a public chatbot "just this once". The correct control is:',
          [
            'Delete the chat afterwards — that removes the exposure',
            'Never paste it (class ban), rotate the key immediately, and add egress secret-scanning as a backstop',
            'Switch to a paid plan so the paste is private',
            'Hash the key before pasting so the model cannot use it',
          ],
          1,
          'Rotation addresses the exposure itself; class ban plus deterministic scanning prevents recurrence. Deletion and plan tiers are not custody guarantees.',
        ],
        [
          'A canary probe of your own planted sentence comes back clean. The honest conclusion is:',
          [
            'The model cannot regurgitate your content',
            'This prompt, session and model version did not emit it — weak evidence that must not replace verified retention commitments',
            'You may now paste freely',
            'The probe was defective',
          ],
          1,
          'Sampling makes absence weak evidence; probes complement contractual custody settings, they never substitute for them.',
        ],
        [
          'Which check is deterministic and therefore usable in a compliance argument?',
          [
            'A statistical "AI-written" detector',
            'Exact-match scanning of outputs against your canary list and secret-pattern rules',
            'Asking the model whether it copied anything',
            'Comparing text lengths',
          ],
          1,
          'Deterministic string and pattern checks either match or they do not; statistical origin detectors are unreliable in both directions.',
        ],
      ]
    ),
    lesson(
      M9,
      'gae-9-2',
      2,
      'Copyright in the Generative Era: Training Data and Outputs',
      'The two copyright questions kept separate — training-data ingestion and generated outputs — a country-hedged landscape as of 2026, authorship and similarity risks on the output side, and the practical controls a team can run without a law degree.',
      19,
      nineBlocks({
        objectives: [
          'Analyse training-data copyright (input side) and output copyright separately, plus the contract layer that can override both',
          'Summarise the jurisdictional landscape — US fair-use litigation, EU TDM exception with opt-out, India\'s position — hedged and dated',
          'State what human-authorship rules mean for what you publish, protect and disclose',
          'Build practical controls: rights hygiene for inputs, similarity checks for outputs, vendor terms read not assumed, dated decision records',
        ],
        hook:
          'Two headlines in the same week: "Court lets AI training proceed on scraped books" and "You do not own your AI-generated logo". Both are defensible summaries of *somewhere*; neither is a rule you can build a product on. The result in most teams is one of two failure modes — the Permissionless Team that feeds anything it can download into a training run, and the Frozen Team that will not let anyone generate a banner. Both are wrong for the same reason: they are looking for one global answer to a question that splits into at least four (train on it? publish from it? imitate it? what did the vendor promise?), each answered differently by jurisdiction, contract and date. This lesson builds the frame that keeps working while the rulings keep moving.',
        concept: `**Split the questions first.** (1) *Training side*: does ingesting copyrighted works to train a model infringe, or is it excused — by fair use/fair dealing in some countries, by text-and-data-mining (TDM) exceptions in others, or by licences you actually hold? (2) *Output side*: is what comes out protected by copyright, who owns it, and — a separate question — does the output *infringe* (substantial similarity to a training work, made concrete by regurgitation, Lesson 9.1)? (3) *Contract layer*: Terms of Service, NDAs, licences and client agreements can be stricter than copyright law — a "no scraping"/"no model training" clause binds you contractually even where copyright would be ambiguous, and data you merely have a *viewing* right to is not data you have a *feeding* right to. (4) *Adjacent rights*: trade marks, character protection, personality/publicity rights, moral rights and passing-off rules travel with style, names, voices and personas — often more relevant to output than copyright is. Teams that ask only "is AI legal?" collapse these into a coin flip; teams that ask all four can make boring, defensible decisions.

**The landscape, country-hedged — as of 2026, verify before relying.** *United States*: several high-profile suits by authors, visual artists and news publishers over training on copyrighted corpora; fair-use analysis is four-factor and fact-specific, and courts have reached differentiated outcomes depending on the use, the corpus and the parties' conduct — treat any single ruling you read as one data point in an ongoing, appealable body of law, not as a global settlement. *European Union*: the DSM Directive's TDM exceptions permit reproduction for text and data mining unless rights holders have expressly reserved their works in an appropriate machine-readable way — so *reservation flags and licence terms in your corpus are engineering inputs, not legal trivia*; the AI Act adds separate transparency and documentation duties (Lesson 9.4). *India*: the Copyright Act 1957 contains no explicit TDM exception covering AI training; India's position sits in an evolving space with no settled comprehensive AI statute — check current status and, for anything material, get counsel; India's own law-making (DPDP in 9.4) proceeds alongside. *Other jurisdictions*: positions have already flipped once in public (a UK commercial-TDM exception was proposed and then withdrawn — verify the current statute before citing it); China, Japan, Canada and others each chart their own course. Three engineering conclusions survive the churn: jurisdiction follows where you operate and publish; contracts can be stricter than copyright; and *records* — what you trained or retrieved on, where it came from, under what licence, checked on what date — are cheap now and priceless in any dispute.

**Outputs: authorship, ownership and the similarity risk.** On protection: the widely-repeated position of the US Copyright Office is that copyright requires *human authorship* — purely machine-generated material is not protected, while human selection, arrangement, editing and creative direction can be; other jurisdictions differ, and some statutory language addresses computer-generated works in narrow contexts (India's Act does so for certain categories, while ownership of AI-generated literary works remains unsettled — verify, and get counsel where protection matters). Two practical readings: (a) do not assume you can stop competitors copying an AI-generated asset — protect it with contract, trade secret or brand instead where it counts; (b) if protection matters, *document the human contribution* — the briefs, the selection among variants, the edits — because that record is what "human authorship" looks like evidence-wise. Prompts alone are generally not treated as authorship. On *infringement*: distinctive-phrase overlap with a known work is checkable (search before publishing high-stakes text — Lesson 9.1's deterministic habits), regurgitation makes verbatim echo possible, and "in the style of [living artist/brand/character]" for commercial work invites trade-mark, character and publicity claims even where style itself is unprotectable — style prompts are a legal-plus-reputation decision, not a creativity hack. Voice and likeness need consent regimes, full stop.

**The vendor layer: read, don't assume.** Some providers offer IP indemnification to enterprise customers — but scope, caps and conditions (eligibility, defence control, exclusions for your inputs and modifications) vary by vendor and tier and change over time: read the current agreement and record what it actually covers. The same reading discipline applies to your corpus: per-item licence terms, robots/ToS constraints, opt-out flags, and the difference between a research corpus and a commercial one. The output of this lesson is not a verdict — it is a *procedure*: split the four questions, check jurisdiction and contract, control what is controllable (rights hygiene, similarity checks, human contribution records, disclosures where required), date everything, and escalate to counsel when the arithmetic says the exposure is real.`,
        extras: [
          table(
            'The four questions, answered separately',
            ['Question', 'What decides it', 'Engineering input you control'],
            [
              ['Train/ingest on it?', 'Copyright exceptions or licences; jurisdiction; ToS/contract', 'Corpus provenance log, licence flags, opt-out respect, source allowlist'],
              ['Own what is generated?', 'Human-authorship rules in the publishing jurisdiction', 'Documented human selection/editing; protect via contract/trade secret where needed'],
              ['Does the output infringe?', 'Substantial similarity; adjacent rights (mark, character, persona)', 'Distinctive-phrase similarity checks, style/persona restrictions, human originality pass'],
              ['What did we promise the vendor?', 'DPA/ToS/indemnity terms — current version, dated', 'Recorded reading of input/output indemnity scope, caps, exclusions'],
            ],
          ),
          code(
            `# Decision record for a GenAI content use (the durable artefact)
use_case: "product blog drafts, published under brand"
date_checked: 2026-10-15
inputs:  internal docs (company-owned) + API docs (licence: permitted use)
jurisdictions_of_publication: [IN, US, EU]
questions:
  training_feed:  client NDA material excluded; source allowlist only
  ownership:      human selection + editing recorded per post (author, edits, variant chosen)
  similarity:     distinctive-phrase search before publish; no living-artist style prompts
  vendor_terms:   indemnity read (tier X, caps Y, exclusions Z) - link to signed DPA
recheck_trigger: vendor term change, new jurisdiction, campaign using third-party IP`,
            'genai_ip_record.yaml',
            'yaml'
          ),
          warn(
            'Style and persona prompts are not a copyright loophole',
            'Style may be unprotectable, but trade marks, characters, voice/likeness rights and passing-off claims are live — and reputational blast radius does not care about your legal reading. Commercial imitation of a living creator or brand is a decision for counsel and leadership, not for a prompt.',
          ),
          tip(
            'Date every legal reading',
            'Commencement dates, rulings and vendor terms move. A decision record with a date, a source and an owner turns "we thought it was fine" into a defensible (or clearly expiring) position.',
          ),
        ],
        worked: {
          title: 'Clear three uses: fine-tune on a licensed corpus, publish LLM-drafted posts, run a campaign in a named style',
          problem:
            'A 60-person company wants three things this quarter: (A) fine-tune a support model on 40,000 articles from a subscription industry database; (B) publish two blog posts a week drafted by an LLM from internal docs; (C) an ad campaign with artwork generated "in the style of a well-known living illustrator". Map the four questions to each use, name what you verify, and produce the decision record.',
          steps: [
            {
              title: 'Step 1 — split the questions per use',
              desc: 'A: train-side dominates — subscription licences typically grant read/view rights, not model-training rights; ToS and contract govern *before* copyright even arises. Also confirm whether the vendor\'s fine-tuning API trains on your data by default (it usually does not for commercial APIs — verify, date it). B: output-side + provenance — inputs are internal (rights fine); questions are ownership/protection, disclosure where required, and similarity before publish. C: adjacent rights dominate — trade mark/character/publicity/passing-off risk plus reputational exposure; copyright of style is the least of it.',
            },
            {
              title: 'Step 2 — jurisdiction and contract checks',
              desc: 'Where will A\'s model run and B/C publish (IN/US/EU at minimum)? Read the database licence for training language and any machine-readable reservations; log the answer per source. Read the vendor\'s current fine-tuning and indemnity terms. For C, park the decision: it goes to counsel with the campaign brief, not to the design team with a prompt.',
              code_snippet: 'corpus_item licence scan: 40,000 articles -> 3 licence classes\n  class 1 (12k): "personal/research use" -> EXCLUDE from training\n  class 2 (25k): permitted w/ attribution -> allow, record\n  class 3 (3k):  public domain / CC-BY -> allow, record',
            },
            {
              title: 'Step 3 — output controls for B',
              desc: 'Publishing pipeline: draft → distinctive-phrase similarity search against known sources → human selection and substantive editing (recorded: which variant, what edits, whose judgement) → required AI-assist disclosure per platform/policy → provenance file per post (prompt, model version, sources, reviewer). This is simultaneously the authorship evidence and the infringement check — one workflow, two defences.',
            },
            {
              title: 'Step 4 — decision record and re-check triggers',
              desc: 'One record per use: date checked, sources and their licence classes, jurisdictions, vendor terms read (link), controls installed, owner, and recheck triggers (vendor term change, new jurisdiction, new campaign, licence renewal). A: proceed only on the class 2+3 subset (~71% of the corpus, class 1 excluded). B: proceed with the pipeline. C: hold pending counsel — and the record shows you asked before launch, not after.',
            },
          ],
          solution:
            'All three uses run through the same four-question frame: contract and licence scanning excluded 29% of the fine-tune corpus before copyright was even relevant; publishing got similarity checks plus recorded human authorship and disclosure; the style campaign was escalated with a dated record rather than improvised — procedure over verdicts, with re-check triggers because the law and the terms move.',
        },
        practice: {
          title: 'Run the frame on one workflow you already do',
          prompt:
            'Pick one way you currently use GenAI (drafts, summaries, code, images). Write its decision record: (1) inputs — where each source came from and what right you have to feed it; (2) jurisdiction of what you publish and to whom; (3) the human contribution you make and whether you could evidence it; (4) the vendor terms you are actually relying on, with a date. Name the one question you cannot currently answer — that is your homework for counsel or for the current terms page.',
          hint: 'If your record has no dates, it is a memory rather than a record — memories are what disputes eat.',
        },
        mistakes: [
          {
            mistake: 'Treating one court ruling or headline as the global rule',
            fix: 'Fair-use outcomes are fact-specific and jurisdiction-bound; TDM exceptions differ; positions have flipped. Split by question and jurisdiction, date the reading, re-check on triggers.',
          },
          {
            mistake: 'Assuming you automatically own what a model outputs',
            fix: 'Human-authorship requirements, unsettled categories and disclosure rules differ by place. Document human selection and editing; protect via contract or trade secret where law gives no shield.',
          },
          {
            mistake: 'Reading a vendor indemnity headline instead of the indemnity clause',
            fix: 'Scope, caps, eligibility and exclusions (including your own inputs) decide its value. Read the current agreement, link it in the decision record, re-read on renewal or notice.',
          },
          {
            mistake: 'Feeding data you only have a viewing right to',
            fix: 'Licences and NDAs are contract questions that bind regardless of copyright ambiguity. Scan licence classes before any training or retrieval corpus is built — exclusions are normal.',
          },
        ],
        exam: {
          question:
            'Separate the copyright analysis of a GenAI feature into its component questions, sketch the training-side landscape across the US, EU and India as of 2026, and specify the controls you would install on the output side.',
          answer:
            'Component questions: (1) *Training/ingestion* — infringement versus exception/licence, plus the contract layer (ToS, NDAs, licence terms) which can bind even where copyright is ambiguous; (2) *Ownership of outputs* — human-authorship requirements differ by jurisdiction, prompts alone generally do not confer authorship, purely machine-generated material may be unprotectable; (3) *Infringement by outputs* — substantial similarity (made concrete by regurgitation) plus adjacent rights (trade marks, characters, voice/persona, passing off), which is why style imitation of living creators is risky despite style itself being weakly protected; (4) *Vendor promises* — current indemnity scope, caps and exclusions, read and dated. Landscape (hedged): US — multiple fact-specific fair-use rulings with differentiated outcomes, ongoing and appealable; EU — TDM exceptions unless rights holders reserved works in a machine-readable way, plus separate AI Act transparency duties; India — no explicit TDM exception for AI training in the Copyright Act 1957, no settled comprehensive AI statute — verify current status and use counsel for material exposure; other jurisdictions vary and have already changed course once. Output-side controls: source allowlist and licence scanning for any corpus, distinctive-phrase similarity checks before high-stakes publication, recorded human selection and editing as authorship evidence, disclosure where required, restrictions on persona/character/voice imitation, per-use dated decision records with recheck triggers.',
          source: 'IP/governance question for GenAI product teams; pairs Lesson 9.1 regurgitation with Lesson 9.4 regulation.',
        },
        summary: [
          'Split every GenAI IP question: train-side, ownership, output infringement, vendor terms — plus the contract layer that can override intuitions.',
          'Landscape is jurisdictional and dated: US fair-use litigation, EU TDM with opt-out flags, India without an explicit TDM exception — verify as of 2026.',
          'Human authorship drives ownership: document selection and edits; prompts alone generally confer nothing.',
          'Deterministic similarity checks and persona/style restrictions are the output controls you own; indemnities are read, not assumed.',
          'Records with dates, sources and owners are the cheapest insurance in this entire module.',
        ],
      }),
      [
        [
          'A subscription database licence says "personal, non-commercial reading" and you want to fine-tune on its 40,000 articles. The binding constraint is:',
          [
            'Copyright law only — licences are advisory for AI',
            'The contract: view/read rights are not training rights, so the corpus is excluded regardless of how fair-use questions might generalise',
            'Model size — small models are exempt',
            'Nothing, if the model never quotes the articles',
          ],
          1,
          'Licences and ToS bind contractually before copyright arguments even arise; feeding requires a right to feed, not merely to read.',
        ],
        [
          'Under the human-authorship line taken by the US Copyright Office (as of 2026, verify):',
          [
            'Every prompt is a copyrightable work',
            'Purely machine-generated output is not protected, while human selection, arrangement and editing can be — so document the human contribution',
            'All AI output belongs to the model vendor',
            'AI output is automatically public domain everywhere',
          ],
          1,
          'Authorship tracks human creative contribution; the evidence of that contribution is a record you must keep deliberately.',
        ],
        [
          'Your ads team requests artwork "in the style of a famous living illustrator". The most complete response is:',
          [
            'Refuse — imitating any style is always copyright infringement',
            'Allow freely — style cannot be copyrighted',
            'Route it to counsel/leadership as an adjacent-rights and reputational decision (trade marks, character/persona, passing off), with alternatives prepared — style being weakly protected does not make the campaign safe',
            'Allow only if the model is open-weights',
          ],
          2,
          'Style sits outside copyright in many places, but adjacent rights and blast radius decide the campaign — a decision above the prompt layer.',
        ],
        [
          'The engineering practice that stays useful no matter how the law develops is:',
          [
            'Following whichever headline is newest',
            'Per-use dated decision records: sources and licences, jurisdictions, vendor terms read, controls installed, owner, recheck triggers',
            'Avoiding all GenAI until statutes settle',
            'Relying on the vendor\'s blog for legal coverage',
          ],
          1,
          'Law moves; records move with it. A dated, owned record is what turns a changing landscape into a defensible process.',
        ],
      ]
    ),
    lesson(
      M9,
      'gae-9-3',
      3,
      'Data Governance and PII — With the Policy That Enforces It',
      'Classify what may go where: PII and the data tiers, the real path of an API call (logs, retention, review, sub-processors, training defaults), redaction-remapping as the fast compliant path, and an enterprise acceptable-use policy designed to be enforced rather than admired.',
      19,
      nineBlocks({
        objectives: [
          'Classify data into tiers with a decision anyone can apply in thirty seconds, and map each tier to approved channels',
          'Trace where an API call actually goes and verify the current, per-product settings that govern it',
          'Write an enforceable acceptable-use policy: allowed/prohibited with examples, tool register, approval path, incident response, review cadence',
          'Install minimisation, egress controls and monitoring so the safe path is also the fast path — and shadow AI is detected, not presumed absent',
        ],
        hook:
          'The policy was four pages, unanimous at approval, and dead in three weeks. Not because anyone defied it — because it said "do not share sensitive data with AI tools" and never said what "sensitive" meant, which tool was allowed, or how to get a yes when the work genuinely needed one. So the team did what teams do: three assistants on personal accounts, a spreadsheet of customer emails called "final_final2.csv", and a Slack culture of "just don\'t paste the names" — which meant the names went in, minus surnames, which nobody had agreed was a rule. Governance fails in the gap between principle and decision. This lesson closes that gap: a classification anyone can apply, an honest picture of where pasted data travels, and a policy written as working instructions with a fast approval path.',
        concept: `**PII, and a classification people can actually run.** Personal data is direct identifiers (name, email, phone, ID numbers) plus quasi-identifiers that become identifying *in combination* (postal code + employer + role), plus sensitive categories that deserve a heavier hand — financial, health, biometric, location trails, and children's data (which carries special duties under Lesson 9.4). Rather than a legal definition recited at people, give them a four-tier ladder they can apply in thirty seconds: **Public** (published marketing copy, public docs) → **Internal** (process docs, non-sensitive memos) → **Confidential** (unreleased product info, internal metrics, contract terms) → **Restricted** (PII, credentials, payment data, health, anything under NDA or attorney privilege). Each tier maps to exactly one channel answer: Public → any approved tool; Internal → approved tools, standard settings; Confidential → only the approved enterprise-configured channels with verified retention/training settings; Restricted → *no third-party GenAI* — redact-and-remap or local models only. The mapping table is the policy; everything else is commentary.

**Where an API call actually goes.** One paste traverses: transport (TLS — check the endpoint is what you think) → provider *application logs* (duration? redacted? who can read them?) → *retention window* (hours? days? "zero" with exceptions?) → possible *human review* (abuse queues and feedback review paths exist — for which products, under what triggers?) → *sub-processors* (cloud region, analytics, abuse tooling — who else touches the data?) → possible *training use*. Two truths to hold: consumer products and commercial APIs are different animals with different defaults, and both change — so the only legitimate statement in your policy is "as verified on [date], product X has settings Y" with the screenshot filed. Your own side of the wire is part of the data path too: *your* logs, caches, eval sets and support tickets may now be PII stores with their own retention problem — classify them under the same tiers or you have merely moved the exposure. Then the standing discipline: **data minimisation and purpose limitation** — send only what the task needs. The technique that makes this practical is redaction-remapping: detect identifiers → replace with stable local placeholders ("{CUST_A}") → run the model on the abstracted text → rehydrate from a mapping table that never leaves your boundary. Abstracted text is often *better* model input anyway — fewer irrelevant specifics, same structure.

**The acceptable-use policy as an engineered artifact.** Its required sections, each with an owner: (1) the one-page allowed/prohibited list with concrete examples of both directions ("never paste credentials or card data — not even partially"; "customer complaints are fine *after* redaction through the helper"); (2) the **data-class → tool matrix** as the single decision table, printed and linkable; (3) the **approved-tool register** — each tool with its verified settings (training off, retention, region), an owner, and a review date; any tool outside the register is shadow AI, by definition; (4) a **fast approval path** for new use cases — a short intake (data class, purpose, volume, model, human-review tier from Lesson 8.4) with a target turnaround (e.g., two working days), because a default-deny with no fast yes manufactures workarounds; (5) **vendor requirements** for anything new: DPA, retention, training opt-out, sub-processor list, breach notice, deletion API — the checklist from 9.1/9.2 in one place; (6) **monitoring and enforcement**: egress controls (DLP/secret scanning) that *explain themselves* when they block ("this looks like a card number — redact with the helper"), plus access logs you actually sample; (7) **training and attestation**: short, example-driven, recurring, with a signed acknowledgement; (8) **incident response**: what to do the moment bad data went to the wrong tool — contain, revoke/delete where possible, assess, and notify per the duties in 9.4, with named roles; (9) **review cadence**: quarterly, plus triggers (vendor terms change, new regulation, incident, new tool).

**Design for behaviour, measure the policy.** Three failure modes to design against: *the PDF nobody opens* (fix: one page, decision table, in the tools' path — in the Slack canvas, the IDE snippet, the browser extension message); *the unenforceable rule* (fix: every rule mechanically checkable where possible — "no credentials" needs a scanner; "no PII" needs the redaction helper before it needs a lecture); *the missing yes* (fix: the approval path with a clock on it). Then treat policy health as a metric set: approval latency (if the fast path is slow, shadow AI grows), block counts and reasons (they measure both rule quality and temptation), shadow-tool discoveries per quarter (discovery is a *feature* of a working program, not a scandal), training completion, and time-to-contain on drills. A governance program you can measure is one you can improve; a governance program you can only recite is one you will eventually delete.`,
        extras: [
          table(
            'Data classes → approved channels (the decision table itself)',
            ['Class', 'Examples', 'Approved channel', 'Rule in one line'],
            [
              ['Public', 'Published copy, public docs, open licences', 'Any approved tool', 'Paste freely; still verify quotes'],
              ['Internal', 'Process docs, non-sensitive memos', 'Approved tools, standard settings', 'Fine unless marked confidential'],
              ['Confidential', 'Unreleased features, metrics, contracts', 'Enterprise-configured channels only (verified settings)', 'Check the register first, every time'],
              ['Restricted', 'PII, credentials, payment/health data, NDA material', 'No third-party GenAI — redact-remap or local only', 'Scanner will block; use the helper'],
            ],
          ),
          code(
            `# Redaction-remap: the fast compliant path
m = {}
def abstract(text):                     # BEFORE any provider call
    for hit in detect(text):            # names, phones, mails, ids, cards
        tok = "{%s_%d}" % (hit.kind, len(m))
        m[tok] = hit.original            # mapping stays inside your boundary
        text = text.replace(hit.raw, tok)
    return text

def draft(text):
    return llm(abstract(text))          # model reasons over structure, not identities
    # -> rehydrate(m, answer) locally; never ship the mapping table anywhere`,
            'redact_remap.py',
            'python'
          ),
          warn(
            'A prohibition without a fast yes is a shadow-AI generator',
            'Default-deny plus a slow or scary approval path reliably produces personal accounts and unlogged tools. Budget the approval clock (days, not weeks) or budget the incidents.',
          ),
          tip(
            'Block messages should teach, not just fail',
            'A DLP block that says "this looks like a card number — run it through the redaction helper (link)" converts an enforcement moment into training. Dead ends get worked around.',
          ),
        ],
        worked: {
          title: 'Write and roll out the acceptable-use policy for a 150-person company adopting an LLM assistant',
          problem:
            'A mid-size services company is rolling out an AI assistant to 150 employees across sales, delivery and HR. Data in play: client material under NDAs, some employee personal data, ordinary internal docs, and the usual temptations (passwords in config files, candidate CVs). Leadership wants a policy next week; operations wants adoption numbers next month. Specify the classification, the controls, the policy document and the rollout metrics.',
          steps: [
            {
              title: 'Step 1 — classification and the decision table',
              desc: 'Run the four-tier ladder on real artefacts from each team (workshop, not memo): client NDA material → Restricted-or-Confidential by clause; CVs → Restricted (personal data + often sensitive); delivery docs → Internal; public proposals → Public. Output: the one decision table with per-team examples, signed off by legal/HR/IT in one sitting so nobody re-litigates a tier weekly.',
            },
            {
              title: 'Step 2 — technical controls before prose',
              desc: 'SSO-gated access to an approved assistant (enterprise tier: training use off, retention and region verified and dated); egress secret-scanning with teachable block messages; redaction-remap helper in the browser/IDE path; access logging with a weekly sample review. The controls make four of the policy\'s rules mechanically enforced, so the prose only carries what machines cannot see.',
              code_snippet: 'verified 2026-10-15: training_use=off, retention=30d, region=EU, review_queue=no-human-escalation',
            },
            {
              title: 'Step 3 — the document set (one page plus three annexes)',
              desc: 'One page: allowed/prohibited with real examples and the decision table. Annex A: approved-tool register (tool, settings, owner, review date). Annex B: approval path (intake form: class, purpose, volume, model, review tier; target: 2 working days; auto-approve Internal-class use cases). Annex C: incident card (contain → delete/revoke request → assess → notify per 9.4 timelines → record) with names against roles. Plus the vendor checklist and the quarterly review date on the front page.',
            },
            {
              title: 'Step 4 — rollout with metrics that expose reality',
              desc: 'Launch with example-driven training and attestation (target ≥95% in 3 weeks). Instrument policy health: approval latency vs the 2-day target, block counts by reason, shadow-tool discoveries (expect a spike in month one — that is the audit working), redaction-helper adoption (target ≥80% of Restricted-adjacent work), and a tabletop incident drill within 60 days. Month-one review adjusts the *table* where blocks were wrong — the fastest way to lose a policy is for people to learn it is mis-calibrated.',
            },
          ],
          solution:
            'Workshop-calibrated classification with a printed decision table, controls that mechanically enforce the enforceable rules (approved tier with verified settings, scanning, redaction-remap, logging), a one-page policy with three annexes and a two-day approval clock, and a metrics set — approval latency, blocks, shadow discoveries, adoption, drill results — that treats discovery as signal and recalibrates the table from data.',
        },
        practice: {
          title: 'Draft the one-pager for your team',
          prompt:
            'Write a one-page acceptable-use policy for a team you know: three allowed examples, three prohibited examples (one from each dangerous class — credentials, PII, third-party-restricted), the four-tier table with one example per tier mapped to a channel, and the approval question a team member asks for a new use case (who, where, target turnaround). Then list the two rules you could make mechanically checkable this week and the metric that would tell you the policy is alive or dying.',
          hint: 'If the policy has no dates, owners or turnaround targets, it is a wish list. Owners and clocks are what make it governance.',
        },
        mistakes: [
          {
            mistake: 'Policy prose with no decision table and no fast approval path',
            fix: 'Thirty-second tiering plus a two-working-day intake. Without the fast yes, compliance loses to convenience and shadow AI fills the gap.',
          },
          {
            mistake: 'Assuming vendor defaults instead of verifying per product',
            fix: 'Consumer app, commercial API and enterprise tier differ and both change. Verify, screenshot, date — and re-verify quarterly or on vendor notice.',
          },
          {
            mistake: 'Governing only the wire, not your own stores',
            fix: 'Your logs, caches, eval sets and tickets are PII stores with retention obligations. Classify them under the same tiers or you have relocated the exposure.',
          },
          {
            mistake: 'Measuring policy by training completion alone',
            fix: 'Completion measures attendance. Approval latency, block reasons, shadow discoveries and drill containment measures whether the policy governs real behaviour.',
          },
        ],
        exam: {
          question:
            'Specify an enforceable acceptable-use policy for GenAI in an organisation, including the classification scheme, the technical controls it depends on, and the metrics that prove it works. Then trace the data path of a single API call and name the three settings you must verify.',
          answer:
            'Policy specification: (1) a four-tier data classification (Public/Internal/Confidential/Restricted) with a decision anyone can apply in thirty seconds, mapped to exactly one channel per tier — Restricted (PII, credentials, NDA material) barred from third-party GenAI except redact-remap or local; (2) the one-page allowed/prohibited list with concrete examples; (3) an approved-tool register carrying each tool\'s verified settings, owner and review date — anything outside it is shadow AI; (4) a fast approval path (intake with data class, purpose, volume, model, review tier; days not weeks) so default-deny does not breed workarounds; (5) vendor checklist (DPA, retention, training opt-out, sub-processors, breach notice, deletion); (6) mechanical enforcement where possible — egress secret/PII scanning with teachable block messages and a redaction-remapping helper so compliance is the fast path; (7) incident card with named roles and notification duties; (8) quarterly review plus trigger events. Metrics: approval latency, block counts by reason, shadow-tool discoveries, redaction adoption, drill containment time. Data path of one call: transport → provider logs (who, how long) → retention window → human-review exposure → sub-processors/region → training-use default. The three settings to verify and date per product: retention window, training-use default, and human-review exposure — with sub-processor/region recorded alongside, remembering that consumer and API products differ and all of them change.',
          source: 'Enterprise governance question; connects Lesson 9.1 custody verification with Lesson 9.4 notification duties.',
        },
        summary: [
          'Four tiers, one channel each, applied in thirty seconds — the mapping table is the policy, everything else is commentary.',
          'Trace the full path (logs → retention → review → sub-processors → training use), verify per product, screenshot, date, re-check.',
          'Redact-remap before the wire: minimisation that also makes outputs cleaner and compliance the fastest route.',
          'Policy = one page + decision table + tool register + fast approval clock + incident card + owners.',
          'Measure policy health (latency, blocks, shadow discoveries, drills) — completion rates only prove attendance.',
        ],
      }),
      [
        [
          'Under a four-tier data ladder, credentials and card numbers are:',
          [
            'Internal — employees may paste them with care',
            'Restricted — no third-party GenAI at all; redact-remap or local channels only, with scanning as backstop',
            'Confidential — allowed on the enterprise tier',
            'Public if they belong to employees',
          ],
          1,
          'Secrets and payment data have no compliant third-party path; the tier exists precisely to make that a one-second decision.',
        ],
        [
          'The three settings you must verify and date for any AI product in your data path are:',
          [
            'Price, speed and context window',
            'Retention window, training-use default and human-review exposure (with sub-processors/region recorded)',
            'Logo, colour scheme and UI theme',
            'Number of users, seats and licences',
          ],
          1,
          'These decide custody of whatever you send; they differ per product and change over time, so verification is dated and repeated.',
        ],
        [
          'Redaction-remapping improves on simple redaction because it:',
          [
            'Deletes the data permanently',
            'Replaces identifiers with stable local tokens the model can reason over, then rehydrates locally — structure preserved, identities never sent',
            'Encrypts data with a vendor-held key',
            'Only hides data from screenshots',
          ],
          1,
          'Placeholders keep relational structure (who did what) for the model while the mapping stays inside your boundary — compliance without losing task quality.',
        ],
        [
          'The most reliable early signal that a GenAI policy is failing in practice is:',
          [
            'Low training-completion rates',
            'Rising approval latency and growing shadow-tool discoveries — people routing around a missing fast yes',
            'Frequent policy wording updates',
            'High satisfaction scores in the policy survey',
          ],
          1,
          'Latency and shadow discoveries measure behaviour; completion and satisfaction measure only exposure to the document.',
        ],
      ]
    ),
    lesson(
      M9,
      'gae-9-4',
      4,
      'The Regulatory Map: India\'s DPDP Act, the EU AI Act and What They Oblige You to Do',
      'DPDP Act essentials for anyone handling personal data, the EU AI Act\'s four risk tiers with obligations, why the global picture is a mosaic to be mapped rather than a rule to be memorised, and how law becomes an engineering backlog with owners and dated sources.',
      20,
      nineBlocks({
        objectives: [
          'Recall the DPDP Act essentials: roles, consent and notice, purpose limitation, data-principal rights, children\'s data, breach duties and the Board',
          'Map the EU AI Act risk tiers — prohibited, high-risk, transparency, minimal — with examples and core obligations, hedged as of 2026',
          'Explain why the global picture is a mosaic and how to map obligations by users, data and feature behaviour',
          'Translate both regimes into an engineering backlog: notices, assessments, oversight, logging, retention and drills — owned and dated',
        ],
        hook:
          'Two documents arrive in the same quarter: the DPDP rules your legal team flags for the product serving India, and a customer security questionnaire asking which EU AI Act tier your features fall into. Neither document is optional, neither is simple, and neither can be answered with "we use a reputable vendor". What engineers need from law is not a law degree — it is the map: which duties attach to the data you hold, which attach to the risk your feature poses, and where each duty lands as a ticket someone can close.',
        concept: `**India\'s DPDP Act 2023 — the essentials that touch every GenAI feature (verify commencement and rules as of 2026).** The Digital Personal Data Protection Act governs the processing of digital personal data in India, with reach extending to certain processing outside India when it offers goods or services to people in India or profiles people in India — hedge the exact contours against the current text and notified rules. Roles: a **data fiduciary** determines the purpose and means of processing (your product almost certainly wears this hat when users\' data flows through it — including when a third-party LLM API does the compute), while a **processor** acts on the fiduciary\'s instructions (your vendor, under a DPA). Consent, the centrepiece, must be **freely given, specific, informed, unconditional and unambiguous — and demonstrable by the fiduciary** (you must be able to show it, not merely hope it), paired with a **notice** that plainly states what data is collected and why; the Act also recognises certain **legitimate uses** (state functions, employment contexts, medical emergencies, and cases where a person voluntarily provides data for a specified purpose — read the current wording rather than this paraphrase). Core fiduciary duties: collect only what is needed for the stated purpose, keep data **accurate**, **erase** when the purpose is served or consent is withdrawn (unless retention is legally required), maintain **reasonable security safeguards**, notify the **Data Protection Board** and affected people upon a personal-data **breach**, and run grievance redressal. **Significant data fiduciaries** take on heavier duties — a data-protection officer based in India, periodic audits and DPIA-like assessments (verify the current terminology and thresholds). People (**data principals**) gain rights of access, correction and erasure, grievance and nomination; **children\'s data** requires verifiable parental consent and prohibits tracking, behavioural monitoring and targeted advertising directed at children — a clause that lands directly on any ed-tech or youth-facing GenAI product. Enforcement runs through the Data Protection Board with financial penalties by contravention class (widely reported ceilings go as high as ₹250 crore for certain breaches — verify the currently notified amounts, rules and commencement schedule; figures and phases move).

**EU AI Act — risk tiers as the obligation ladder (phased application; verify milestones as of 2026).** The Act is *product-style, risk-based* regulation — separate from (and cumulative with) data-protection law. **Prohibited / unacceptable**: practices like certain government social scoring, manipulative or exploitative techniques causing significant harm, certain real-time remote biometric identification in publicly accessible spaces (with narrow exceptions), and emotion inference in workplace and educational settings — examples, read against the current text. **High-risk**: AI used as a safety component, or in listed domains — biometrics, critical infrastructure, education and exams (including admission/evaluation uses), employment and worker management (your resume screener), essential services (credit, insurance, health), migration, justice — carrying the heavy obligations: risk management, data governance, technical documentation, logging, human oversight, accuracy/robustness/cybersecurity requirements, conformity assessment, registration/CE-style marking. **Transparency tier**: systems that interact with people must disclose that you are talking to an AI; deepfakes and certain synthetic content must be labelled; certain generated text in matters of public interest carries disclosure duties. **Minimal risk**: the overwhelming majority of applications — mostly voluntary codes of conduct. General-purpose model obligations (documentation, copyright policy, training-data summaries, extra duties above a compute threshold) sit *upstream* of these tiers and flow down to providers — details and dates are exactly the kind of fact to verify per release. Penalties scale with turnover and breach class (verify current figures).

**The mosaic, and how to stand in it.** There is no single global AI law: the US runs sectoral rules (health, finance, education) plus a shifting patchwork of state and local requirements; other jurisdictions — China, Japan, the UK and more — each run their own regimes, and pieces have already changed course publicly more than once. The engineering posture: build an obligation *matrix* — rows are your features, columns are where users and data live plus what the feature does — and populate cells with duties (consent notice, retention job, oversight step, disclosure). Then let procurement push requirements down the stack: enterprise customers will ask for DPDP-aligned practices, AI-Act tiers, ISO/IEC 42001-style management-system language and DPAs whether or not you sell into the EU, because questionnaires copy the strictest regime they know. Note the layering rule: an AI Act high-risk classification does not *replace* DPDP duties — a resume screener is simultaneously high-risk under one and a personal-data processor under the other.

**Law → policy → controls → evidence.** The pipeline this module has been building: 9.3\'s policy encodes the duties, 9.1/9.2\'s records evidence them, and this lesson supplies the backlog items: per-purpose consent notices written in plain language; a retention-and-erase job matching the stated purpose (obligation: erase, not "keep until someone complains"); a DPIA-style assessment ticket for high-risk features; a human-oversight step with an accountable owner for decisions that affect people; audit logging sufficient to *demonstrate* rather than assert; parental-consent gating for minors\' features; a breach playbook that starts with containment and has the notification clocks pre-written; and vendor DPAs carrying the processor duties. Every ticket gets an owner and a **dated verification source** — the official text, the notified rule, the regulator page as of a date — because commencement schedules, fine figures and tier details are precisely the "verify per release" facts of this domain. Governance is not a document; it is controls with evidence attached, refreshed on a calendar.`,
        extras: [
          table(
            'EU AI Act tiers — shape of the ladder (verify current text and dates)',
            ['Tier', 'Examples', 'Core obligations', 'Who feels it first'],
            [
              ['Prohibited', 'Social scoring (certain), exploitative manipulation, certain real-time biometric ID, workplace/education emotion inference', 'Do not build or deploy', 'Product + leadership'],
              ['High-risk', 'Resume screening, exam evaluation, credit scoring, medical triage, critical-infrastructure components', 'Risk management, data governance, documentation, logging, human oversight, conformity assessment, registration', 'Product + engineering + legal'],
              ['Transparency', 'Chatbots, deepfakes, synthetic content, public-interest generated text', 'Disclose AI interaction; label synthetic content', 'UX + content + comms'],
              ['Minimal', 'Spelling help, internal summaries, most marketing drafts', 'Voluntary codes — your policy still applies (DPDP etc.)', 'Everyone'],
            ],
          ),
          warn(
            'This lesson is engineering literacy, not legal advice',
            'Commencement dates, notified rules, thresholds and penalty figures change; jurisdictions differ on every line that matters. Verify against official sources as of a date, record the source, and involve counsel for real exposure.',
          ),
          tip(
            'Write compliance tickets, not compliance paragraphs',
            'Every duty becomes a ticket with an owner, a done-condition and a dated source link. Paragraphs get discussed; tickets get closed and audited.',
          ),
        ],
        worked: {
          title: 'Classify a resume screener, a study chatbot and a marketing generator under both regimes',
          problem:
            'A SaaS company ships three features: (A) an AI resume screener used by recruiters to rank candidates for Indian and EU employers; (B) a study chatbot for school students (ages 13–17) in India; (C) an internal marketing-content generator. Produce the obligation map: DPDP duties per feature, EU AI Act tier per feature, and the resulting engineering backlog with owners and dated sources.',
          steps: [
            {
              title: 'Step 1 — inventory data, people and geography',
              desc: 'A: CVs (personal data, sometimes sensitive) of candidates who never signed up themselves — consent quality is the first question; users are employers in IN/EU. B: minors\' personal data plus interaction logs (profiling risk), India. C: internal docs, employees only, India-hosted. Matrix rows = features; columns = jurisdictions of affected people and data categories — the cells from here on are duties.',
            },
            {
              title: 'Step 2 — DPDP mapping per feature',
              desc: 'A: fiduciary duties attach (candidates are data principals): a lawful basis under the current Act\'s consent/legitimate-use provisions (verify wording), candidate-facing notice, accuracy and correction path, retention tied to the hiring decision plus a stated period, erasure workflow, breach duty. C: employee data in prompts → notice in the employment context, minimisation, retention. B: parental verifiable consent for under-18s, *no behavioural tracking or targeted ads*, plus all the standard duties — the children\'s clause alone reshapes the product\'s analytics design.',
            },
            {
              title: 'Step 3 — EU AI Act tiering',
              desc: 'A: employment/worker-management domain → **high-risk**: the backlog now includes risk-management process, training-data governance records, technical documentation, logging, human-oversight design (recruiter must be able to override and understand rankings — not a black-box shortlist), conformity-assessment readiness and registration. B: interacts with people → **transparency** (students must know they are talking to AI); if it is later used to *evaluate* students or gate admissions, re-tier to **high-risk** — the classification tracks use, not marketing. C: **minimal risk** for text drafts; if it generates images/video for publication, the synthetic-content labelling duties of the transparency tier apply to what ships. Also record: minors + interaction logs in DPDP scope regardless of EU.',
            },
            {
              title: 'Step 4 — backlog, owners, dated sources',
              desc: 'Tickets, each with owner + done-condition + source-as-of-date: candidate notice + lawful-basis memo (legal, cites current DPDP provisions); erase-and-retain job (backend, purpose-linked schedule); parental-consent gate and analytics lockdown (product, B); human-oversight screen + audit log for rankings (ML+product, A — high-risk obligation); synthetic-media label renderer (frontend, C); DPIA-style assessment (risk, A); breach-playbook drill with pre-written Board/person notification clocks (security); vendor DPAs confirming processor duties (procurement). Re-verify all cited texts at the quarterly review — commencement schedules and penalty figures are the most volatile facts on this page.',
              code_snippet: 'backlog: 9 tickets, 5 owners, each with "source@2026-10-15" citation\nrecheck: quarterly + on any notified-rule publication',
            },
          ],
          solution:
            'A feature-by-feature matrix (data, people, geography) driving both analyses: DPDP duties — lawful basis and candidate notices for the screener, parental consent and a tracking ban for the study bot, minimisation for marketing; EU tiers — high-risk with the full obligations package for hiring, transparency for the chatbot (re-tiering if it ever evaluates students), minimal-then-labelling for content — expressed as nine owned tickets with dated citations and a quarterly re-verification trigger.',
        },
        practice: {
          title: 'Tier three features you use daily',
          prompt:
            'Pick three features of a product you use (e.g., smart replies, fraud alerts, feed ranking). For each: (1) which personal data it processes; (2) its DPDP-relevant duties in one line (notice, purpose, retention, rights); (3) its EU AI Act tier if it served EU users, with the tier\'s single biggest obligation; (4) one ticket you would file with an owner and a done-condition. Then write the one sentence you would tell a skeptical teammate about why "the vendor handles compliance" does not answer any of this.',
          hint: 'The vendor is your processor; the duties on purpose, notice, retention and rights stay with whoever determines them — usually you.',
        },
        mistakes: [
          {
            mistake: 'Quoting 2023-era headlines as current law',
            fix: 'Commencement phases, notified rules, thresholds and penalty figures move. Cite official sources as of a date, record the date, re-verify quarterly.',
          },
          {
            mistake: 'Treating the LLM vendor as the responsible party',
            fix: 'As fiduciary you determine purpose and means; the vendor processes under your instruction. Notice, retention, rights and breach duties remain yours end to end.',
          },
          {
            mistake: 'Assuming one regime displaces the other',
            fix: 'AI Act risk tiers and data-protection law layer — a resume screener is high-risk *and* a personal-data processor. Map cells, do not pick a favourite law.',
          },
          {
            mistake: 'Compliance as a document with no controls behind it',
            fix: 'Duties become tickets with owners, done-conditions and evidence: erase jobs, oversight screens, audit logs, drills. Documents without controls fail their first incident.',
          },
        ],
        exam: {
          question:
            'Outline the DPDP Act duties that attach to a consumer GenAI app handling users\' personal data, place three features into the EU AI Act risk tiers, and explain how both translate into an engineering backlog.',
          answer:
            'DPDP essentials (verify commencement and notified rules): the app\'s operator is the data fiduciary — even though an LLM vendor does the compute — so duties include consent that is freely given, specific, informed, unconditional, unambiguous *and demonstrable*, paired with a plain notice of data and purposes (or a valid legitimate-use basis where the Act provides one); collection limited to the stated purpose; accuracy; erasure when the purpose is served or consent is withdrawn; reasonable security safeguards; grievance redressal; and breach notification to the Data Protection Board and affected people. Children\'s features add verifiable parental consent and a ban on tracking, behavioural monitoring and targeted advertising to children. Significant-data-fiduciary extras (DPO, audits, assessments) depend on notified thresholds — check current status. Tiers under the EU AI Act (phased, verify milestones): a resume screener for employers → high-risk (risk management, data governance, documentation, logging, human oversight, conformity assessment); a study chatbot interacting with students → transparency tier (disclose the AI) — re-tier to high-risk if it evaluates students or gates admissions; an internal marketing copy generator → minimal risk (voluntary codes), though generated images for publication pull in synthetic-content labelling. The regimes layer — high-risk status never replaces data-protection duties. Translation: consent-notice copy, a purpose-linked retention-and-erase job, an oversight screen with an accountable owner, audit logging, a parental-consent gate, a breach playbook with pre-written notification clocks, DPIA-style assessments for high-risk features, and vendor DPAs — each a ticket with an owner, a done-condition and a dated official-source citation, re-verified quarterly.',
          source: 'Regulatory-literacy question for GenAI product roles; pairs Lesson 9.3 policy with Lesson 9.2 records.',
        },
        summary: [
          'DPDP essentials: demonstrable consent + notice, purpose limitation, accuracy, erasure, safeguards, breach duties — fiduciary duties stay with you, not your vendor.',
          'Children\'s data (verifiable parental consent, no tracking/ads) reshapes youth-facing product design before any model choice.',
          'EU AI Act tiers — prohibited / high-risk / transparency / minimal — attach to what the feature *does*, and layer on top of data-protection law.',
          'The global picture is a matrix: features × jurisdictions × data categories, populated from dated official sources.',
          'Law → policy (9.3) → controls → evidence: tickets with owners and dated citations, re-verified quarterly — this is engineering, not paperwork.',
        ],
      }),
      [
        [
          'Under India\'s DPDP Act (essentials, verify current rules), valid consent must be:',
          [
            'Implied by using the service',
            'Freely given, specific, informed, unconditional and unambiguous — and demonstrable by the data fiduciary',
            'Signed once for all future purposes',
            'Obtained only in writing, never electronically',
          ],
          1,
          'The demonstrability requirement is the engineering one: you must be able to produce what was consented to, when, and for which purpose.',
        ],
        [
          'Your product sends user data to a third-party LLM API. Under the DPDP frame, who carries the data-fiduciary duties?',
          [
            'The LLM vendor, always',
            'Your organisation — it determines the purpose and means; the vendor is a processor acting under a DPA',
            'Whichever entity stores the data longer',
            'Nobody, if the API is encrypted',
          ],
          1,
          'Fiduciary status follows purpose-and-meaning control; delegating compute does not delegate notice, retention, rights or breach duties.',
        ],
        [
          'An AI tool that ranks job applicants for employers is, under the EU AI Act\'s tier structure (verify current text), most likely:',
          [
            'Minimal risk — it is just sorting resumes',
            'High-risk — employment and worker management carries documentation, logging, human oversight and conformity duties',
            'Prohibited — automated hiring is banned outright',
            'Exempt because a human clicks the final button',
          ],
          1,
          'Domain drives the tier: hiring sits in the high-risk annex; a human click without meaningful oversight does not downgrade it.',
        ],
        [
          'A study chatbot for 13–17-year-olds in India must, at minimum under the children\'s provisions:',
          [
            'Verify parental consent and avoid tracking, behavioural monitoring or targeted advertising directed at children',
            'Offer a paid tier for adults only',
            'Delete all data after one hour',
            'Publish its training data publicly',
          ],
          0,
          'Verifiable parental consent plus the tracking/advertising prohibition are the two duties that reshape youth-facing product analytics and monetisation.',
        ],
      ]
    ),
  ],
};
