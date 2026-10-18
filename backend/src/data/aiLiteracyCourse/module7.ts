// Module 7 — The AI Tools Landscape
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code } from '../nineBlocks';
import { lesson, M7, COURSE_ID } from './helpers';

export const module7: CourseModule = {
  id: M7,
  course_id: COURSE_ID,
  title: 'Module 7 — The AI Tools Landscape',
  summary:
    'What the different species of AI tool actually are — chat assistants, coding assistants, AI search, image/video/voice generators — what free and paid tiers really buy you, how to choose a tool for a job, and when running a model on your own device beats the cloud.',
  sort_order: 7,
  lessons: [
    lesson(
      M7,
      'lit-7-1',
      1,
      'Chat Assistants, Coding Assistants and AI Search: Three Species of Tool',
      'How the three most-used text tools differ in grounding, feedback loops and failure modes — and why the difference decides how much you must verify.',
      15,
      nineBlocks({
        objectives: [
          'Distinguish chat assistants, coding assistants and AI search by how they produce answers',
          'Rank tasks by how verifiable their outputs are, and match tools accordingly',
          'Identify the characteristic failure mode of each tool species',
          'Choose correctly among the three for a concrete task',
        ],
        hook:
          'A student uses three AI tools in one afternoon: a chat assistant to explain recursion, an IDE assistant to fix a broken script, and an AI search to find last week\'s policy change. All three answered fluently. Only one of them was running the code before replying, and only one was pointing at pages published after the model was trained. "AI tool" is not one category — three different machines wore the same label, and trusting them identically is how people get burned.',
        concept: `**Chat assistants: parametric conversationalists.** The general-purpose chat product is a language model (Modules 4 and 5) plus an interface: it conditions on your conversation and generates text from what its weights absorbed during training. Strengths: drafting, explanation, transformation, brainstorming, working with material you paste in. Structural limits: its knowledge has a training cutoff (Module 4), it has no automatic access to live facts, and nothing in the loop checks its claims — fluency and accuracy are uncorrelated enough that you must treat it as a fast, well-read collaborator whose citations are provisional. When chat answers a current-affairs question, it is either recalling stale training material or confabulating; either way the answer needs an outside check.

**Coding assistants: the verifiable species.** An IDE assistant or agent works on code, and code has a property prose lacks — *it can be executed*. Autocomplete suggests the next lines; chat-in-the-editor explains and rewrites; agentic tools edit files, run tests and iterate on their own errors. This creates the healthiest loop in consumer AI: generate → run → fail → fix → pass, where the machine's output carries its own feedback signal. The characteristic trap is subtler than people expect: code that *looks* canonical can still be wrong — hallucinated library functions that do not exist in any version, logic that passes the happy path and breaks on empty inputs, security holes, imports from packages that are not installed. The rule that makes coding assistants genuinely useful: **run everything, read everything you run, and test the edges** — the loop only pays off when you actually close it.

**AI search: retrieval in front of the model.** AI search (and the "deep research" modes of assistants) does something structurally different: it queries an index of live pages, pulls back passages, and generates an answer *conditioned on those passages*, usually with citations. That breaks the parametric knowledge ceiling — it can discuss events after any training cutoff — and grounding in retrieved text measurably reduces the freest-form confabulation, because there is material in the window to anchor to. The characteristic trap: **citations are generated text too**. Links can be fabricated, mismatched to the claim, or point to a page that does not say what the summary claims; the format "answer with footnote numbers" is exactly the kind of shape a next-token model reproduces fluently regardless of truth. Verify by opening the source and checking the sentence, not by admiring the presence of a link.

**Matching tool to task.** Three questions decide it. (1) *Does the answer depend on facts that change or postdate training?* → AI search (or a chat assistant given the sources). (2) *Is the output executable or otherwise checkable by a machine?* → coding assistant, and close the loop. (3) *Is the output a judgement or a draft?* → chat assistant, plus a human pass. Note also that the species are converging — chat products add search and code execution, search products add chat — so ask what *this* answer was grounded in, not what the product is called. A single product can give you a grounded, cited answer in one turn and a free-willed confabulation in the next.`,
        extras: [
          table(
            'The three species at a glance',
            ['Dimension', 'Chat assistant', 'Coding assistant', 'AI search'],
            [
              ['Grounding', 'Weights + what you paste', 'Your repo/files + weights', 'Live index + generated synthesis'],
              ['Feedback loop', 'Human judgement', 'Run tests, compiler, runtime', 'Open the cited page'],
              ['Typical failure', 'Confident stale or invented facts', 'Plausible code that fails on edges', 'Fabricated or mismatched citations'],
              ['Best for', 'Drafts, explanation, transformation', 'Writing, fixing, explaining code', 'Current facts with sources'],
              ['Verification', 'Check claims externally', 'Execute and read the diff', 'Open sources and read them'],
            ],
          ),
          info(
            'Grounding is a spectrum, not a switch',
            'Pasting a document into a chat assistant is a mini form of grounding: the answer can condition on material in the window. Anything the model was NOT given — live facts, your database, this morning\'s email — is either retrieved, recalled from training, or invented. Ask which of the three happened.',
          ),
          tip(
            'Verifiability outranks brand in tool choice',
            'For a bug, the tool whose output you can execute beats the tool with the best reputation. For a live fact, the tool that retrieves beats the tool that recalls. Choose by how checkable the output is.',
          ),
          warn(
            'A citation is not a verification',
            'AI-search citations can be fabricated or attached to the wrong claim. Opening the link and reading the relevant line is the verification; the link itself is only a lead.',
          ),
        ],
        worked: {
          title: 'Route three real requests to the right species',
          problem:
            'Same afternoon, three jobs: (A) the app crashes with a TypeError when saving settings; (B) what changed in the university\'s hostel policy this month; (C) a 300-word announcement for the coding club. Choose tools and specify the verification each one needs.',
          steps: [
            {
              title: 'Job A — code that fails',
              desc: 'Coding assistant, with the stack trace and the offending file. Its output is executable: run the fix, reproduce the original steps, then test an edge (empty input, double-save). Verification is built in — the app either saves or it does not.',
            },
            {
              title: 'Job B — a fact that changes',
              desc: 'AI search (or chat with search enabled). Training cutoff makes chat-only recall useless for "this month\'s" changes; retrieval brings back candidate pages. Verification: open the official hostel/notice-board page and confirm the date and wording — the generated summary is only an index into the real source.',
            },
            {
              title: 'Job C — a draft with taste',
              desc: 'Chat assistant. Nothing to retrieve and nothing to execute — you need structure, tone and a working call-to-action. Supply the facts (date, venue, fee) as context, then verify the human way: does every name, date and link match reality? Would you sign it?',
            },
            {
              title: 'Cross-check the species boundaries',
              desc: 'Each job failed when handed to the wrong tool: chat would have invented the policy update; search would have mangled the stack trace into a blog-style answer; the coding assistant would have written a competent announcement with two invented event details. Match the grounding model to the fact pattern first.',
            },
          ],
          solution:
            'Code → coding assistant (verify by running); changing facts → AI search (verify by opening official sources); drafts → chat (verify against supplied facts and your judgement). The routing logic is: what kind of claim is this, and what evidence would falsify it? Pick the tool whose output carries that evidence with it.',
        },
        practice: {
          title: 'Run one task through two species',
          prompt:
            'Take one question you actually have. Ask it in a plain chat assistant and in an AI search (or a search-enabled mode), then compare: which cited sources, which answered from memory, where did they disagree? Open one citation from each and score whether the source supports the claim.',
          hint: 'The disagreement is the lesson — note which answer you would have trusted if you had only asked one tool.',
        },
        mistakes: [
          {
            mistake: 'Using a chat assistant for events after its training cutoff',
            fix: 'Use AI search or give it the sources in context. Chat-only answers to "what happened last week" are recall or confabulation at best.',
          },
          {
            mistake: 'Accepting coding-assistant output without running it',
            fix: 'Hallucinated APIs and happy-path logic look perfect in review. Execute, then test one edge case — the loop is the point of the tool.',
          },
          {
            mistake: 'Treating any citation as proof',
            fix: 'Open the link and read the supporting sentence. Fabricated and mismatched citations are the characteristic AI-search failure.',
          },
          {
            mistake: 'Choosing a tool by product name instead of grounding',
            fix: 'Features converge; grounding does not. Ask what THIS answer was built from — weights, retrieved pages, or your files.',
          },
        ],
        exam: {
          question:
            'What structurally distinguishes AI search from a plain chat assistant, and why does that reduce — but not eliminate — the need for verification?',
          answer:
            'A chat assistant generates from parametric memory (training weights plus conversation context); AI search first retrieves live material from an index and generates conditioned on those passages, attaching citations. Because the answer window contains actual source text, claims are anchored and freshness no longer depends on a training cutoff — so the freest forms of confabulation drop. It does not eliminate verification because synthesis is still generated token by token: citations can be fabricated or mismatched, passages can be over-generalised, and the model can add uncited claims around grounded ones. Hence: retrieve better, then still open the source and check the sentence.',
          source: 'Common product-and-trust question in AI literacy and research-skills assessments.',
        },
        summary: [
          'Chat = parametric recall plus your pasted context; no built-in truth check, cutoff-bound.',
          'Coding assistants have the strongest loop because code executes — close the loop or lose the benefit.',
          'AI search retrieves live text and cites it, breaking the cutoff ceiling; citations are still generated.',
          'Route by claim type: checkable output → executor; changing facts → retrieval; judgement/draft → chat + human.',
          'Products converge; the grounding behind an individual answer is what you actually verify.',
        ],
      }),
      [
        [
          'A plain chat assistant answers a question about an event from last week. The main risk is:',
          [
            'It answers too briefly',
            'Its knowledge comes from training and pasted context — the answer may be stale or invented',
            'It cannot process the question',
            'Its context window is too small',
          ],
          1,
          'No retrieval means the model recalls from training (cutoff-bound) or confabulates plausibly; use search or supply sources.',
        ],
        [
          'What makes coding assistants the most verifiable of the three species?',
          [
            'They use bigger models',
            'Their output can be executed — running and testing gives an independent feedback signal',
            'They never hallucinate',
            'They are connected to live search',
          ],
          1,
          'Compilation, tests and runtime turn output quality into something checkable by machine rather than by taste.',
        ],
        [
          'An AI-search answer links to a real-looking article. Why must you still open it?',
          [
            'Links slow down the answer',
            'Citations are generated too — they can be fabricated or fail to support the claim made',
            'The model wrote the article',
            'Opening links increases your quota use',
          ],
          1,
          'The citation is part of the generated text; only reading the source establishes that it says what the summary claims.',
        ],
        [
          'Which request should go to an AI search rather than a plain chat assistant?',
          [
            'Explain how a hash map works',
            'Rewrite my email in a formal tone',
            'Summarise what changed in a policy this month',
            'Generate ten project title ideas',
          ],
          2,
          'Anything whose facts postdate training or change over time needs retrieval; the others are transformations chat handles well.',
        ],
      ]
    ),
    lesson(
      M7,
      'lit-7-2',
      2,
      'Image, Video and Voice: The Generative Media Shelf',
      'What text-to-image, video and speech tools actually produce, how prompting differs across modalities, their structural failure patterns, and the verification and rights questions that come with them.',
      16,
      nineBlocks({
        objectives: [
          'Describe what image, video and voice generation tools do well and where they structurally fail',
          'Prompt a media model with subject, style, composition and technical language',
          'Recognise synthetic media artefacts and the limits of detection',
          'State the consent, rights and verification issues attaching to generated media',
        ],
        hook:
          'A student needs a poster for a tech fest by evening. Twenty minutes later they have a striking image — and three subtle disasters: the event name is misspelled in a decorative font, the "building" in the background has windows that dissolve into stairs, and nobody involved consented to the very real-looking face on the flyer. The tools are fast and genuinely good; they fail in characteristic, predictable ways, and the poster went out anyway. This lesson is about knowing those failure modes before the deadline, not after the complaint.',
        concept: `**Text-to-image: what it is doing.** Modern image generators (diffusion models and relatives — Module 5's "generative" family tree in one line) turn a text description into an image by learning what images look like and denoising toward your description. Prompting here is not the four-part essay of Lesson 1; it is a compact stack of **subject + context + style/lighting + composition + technical terms**: "a cluttered study desk at night, warm lamp light, shot at 35mm, shallow depth of field, top-down composition". Natural language works, but camera and art vocabulary gives you precise, well-represented levers because that vocabulary is abundant in training data. Editing tools (inpainting, erasing, background replace, image-to-image) are often more useful than regenerating: change one region, keep the rest.

Structural failures worth memorising: **rendered text** (signs, posters, logos come out misspelled or ornamental — the model generates letter-like shapes, not typography), **fine detail and counting** (hands, fingers, repeated objects, stairs and railings), **identity consistency** (the same character across multiple images drifts), and **real entities** (real logos, brands and faces are approximations). These are not fixed by better adjectives — they are properties of how the models learned. That is why designers use generators for concepts, backgrounds and variants, then set real text in a real type tool.

**Video and voice, honestly described.** Video generation currently produces short clips: strong for abstract visuals, transitions, mood b-roll; weak at long coherent scenes, physics that survives scrutiny, dialogue sync and anything resembling a documentary claim. Cost and review time are high — a usable minute can take many generations and a human pass — so the practical uses are concept pitches, social formats and illustrative motion, not factual record. Voice tools split in two: **speech synthesis** (text-to-speech for narration, accessibility read-alouds, drafts of voiceovers — now good enough that pacing and emphasis are controllable) and **speech recognition** (transcription of lectures and meetings — genuinely useful, with error rates that rise on accents, jargon and noise, so transcripts of anything important need a proofread). **Voice cloning** deserves its own warning: a convincing clone can be made from seconds of captured audio, which makes consent the deciding question — cloning your own voice is a feature, cloning someone else's without permission is a harm, and the same applies to faces.

**Understanding media, not just making it.** Vision-language models accept images and answer about them: read this chart, extract this form's fields, transcribe this board photo. This is the verification-friendly half of the media shelf — OCR-style extraction can be checked field by field against the original — but it inherits the text model's habits: it can misread a digit, invent a plausible field, or describe an image generically when asked something specific. Always compare extraction against the source image.

**Trust and provenance.** Synthetic media defeats naive heuristics ("video is real, text is fake"). Detection tools exist but are unreliable as a primary defence: accuracy varies by format, generated content keeps improving, and edited-real media confuses everything. Some generators embed watermarks and some producers attach content-credentials metadata (cryptographically signed origin records), but adoption is partial and metadata is easily stripped by re-uploading. The durable habit is journalistic: trace the origin, check the account and its history, look for corroboration from independent sources, and treat emotionally perfect, perfectly provoking media as suspect by default. (Module 9 takes this to its conclusion with deepfakes and misinformation.)`,
        extras: [
          table(
            'Media tools by job',
            ['Tool type', 'Good for', 'Structurally weak at', 'Check by'],
            [
              ['Text-to-image', 'Concepts, backgrounds, variants, mood', 'Rendered text, counting, real logos, identity drift', 'Inspect details; set real text afterwards'],
              ['Image editing (inpaint/erase)', 'Targeted changes, keeping composition', 'Complex scene changes, consistency across edits', 'Diff against the original'],
              ['Video generation', 'Short motion clips, pitches, social formats', 'Long scenes, physics, dialogue sync, factual claims', 'Frame-by-frame review'],
              ['Text-to-speech', 'Narration, accessibility read-aloud', 'Genuine emotion, domain pronunciation', 'Listen with fresh ears'],
              ['Speech-to-text', 'Lecture/meeting transcripts', 'Accents, jargon, crosstalk, names', 'Proofread against audio'],
              ['Vision Q&A / extraction', 'Reading charts, forms, board photos', 'Fine print, rare handwriting, edge digits', 'Compare field-by-field to source'],
            ],
          ),
          tip(
            'Prompt media the way a director briefs',
            'Subject, setting, light, lens, composition, mood — in that order — beats a paragraph of adjectives. Specific physical vocabulary (lens, angle, lighting) maps onto abundant training patterns and gives you control.',
          ),
          warn(
            'Consent travels with a face or a voice',
            'Real-looking faces and cloned voices of real people need permission. Also check licence terms: some free tiers claim training rights over uploads or restrict commercial use of outputs — the terms page, not the demo, decides.',
          ),
        ],
        worked: {
          title: 'Plan the media kit for a college tech fest',
          problem:
            'Budget: zero. One week. Deliverables: a poster image, a 30-second teaser clip, a voiceover for a 2-minute explainer, and a chart slide showing registration numbers. Decide tools, prompt directions, and the verification and rights pass for each.',
          steps: [
            {
              title: 'Poster — generate the visual, not the typography',
              desc: 'Image model for the background/hero visual with a director-style prompt (subject, lighting, composition, mood). Leave the event name, dates and QR code OUT of the generated image; composite them in a design tool with real text. Prevents the misspelled-title failure entirely.',
            },
            {
              title: 'Teaser — accept what the tool can honestly do',
              desc: 'Short generated motion clips (abstract tech visuals, transitions) cut together — not a storyline with actors. Budget frames: generate several, keep the two that survive inspection. If a person must appear on camera, use real footage you have rights to.',
            },
            {
              title: 'Voiceover — synthesis vs recognition',
              desc: 'Synthesised narration if no one wants to record (test pronunciation of names and terms — synthesize, listen, edit). Captions come from transcription, then a human proofread — never publish auto-captions unreviewed, they mis-transcribe exactly the names and numbers people check.',
            },
            {
              title: 'Chart — extraction is not creation',
              desc: 'Registration numbers come from your actual sheet. If you use vision tools to pull numbers out of a scanned form, verify each field against the source image — one misread digit in a public chart is a credibility event. Render the chart in a spreadsheet, not a generated picture.',
              code_snippet: 'Poster:  image model -> visual only -> real text on top\nTeaser:   3-5 short generated clips -> human edit -> cut\nVoice:    TTS draft -> listen -> fix names -> export\nChart:    real data -> verify any OCR extraction -> render',
            },
          ],
          solution:
            'Generate where generation is strong (visual mood, short motion, narration) and keep everything factual or textual in tools you control (real type, real data, real sources). Each deliverable ends with its own check: inspect fine detail, proofread captions, verify extracted numbers, and confirm you hold the rights to every face, voice and clip you ship.',
        },
        practice: {
          title: 'Generate, then audit',
          prompt:
            'Generate one image with a structured prompt (subject, setting, light, lens, composition). Then list three things you checked before you would show it to anyone — text, hands/edges, real-world logic. Finally, ask a vision-enabled assistant "what is wrong with this image?" and compare its list with yours.',
          hint: 'If you cannot name the artefacts you are looking for, you will not catch them in a hurry — that is the whole exercise.',
        },
        mistakes: [
          {
            mistake: 'Asking an image model to render your event title, price or logo',
            fix: 'Generated letterforms are approximations and usually wrong. Generate the visual; set the type yourself in a design tool.',
          },
          {
            mistake: 'Treating a generated image or clip as evidence',
            fix: 'Synthetic media depicts nothing that happened. For anything factual — news, events, people — only original, corroborated sources count.',
          },
          {
            mistake: 'Skipping licence and consent checks',
            fix: 'Free tiers differ on commercial rights and on whether uploads may train models; faces and voices need consent. Read the terms for the tier you are on.',
          },
          {
            mistake: 'Publishing auto-transcripts and captions unreviewed',
            fix: 'Speech recognition degrades on names, numbers, accents and noise — precisely what matters. Proofread against the audio before publishing.',
          },
        ],
        exam: {
          question:
            'Name two structural limitations of current text-to-image models and give the practical workflow each one implies.',
          answer:
            '(1) Rendered text: the model produces letter-like shapes rather than typography, so titles, prices and logos come out misspelled or ornamental — implication: generate the visual only, and set all real text in a design tool as a compositing step. (2) Fine detail and counting (hands, repeated objects, structural logic like stairs): implication: inspect at full size and expect to regenerate or inpaint rather than trust the first result; for anything that must be exact (charts, forms, products), render with deterministic tools instead. Both limitations are properties of the generative approach, not of prompting effort — the workflow routes around them rather than arguing with them.',
          source: 'Standard applied question on generative-media limits in design and marketing interviews.',
        },
        summary: [
          'Image prompting = subject + setting + light + lens + composition; real text is set outside the generator.',
          'Memorise the structural fails: rendered text, counting/detail, identity drift, real entities.',
          'Video = short illustrative motion, not factual record; voice synthesis and transcription both need human passes.',
          'Consent and licences attach to faces, voices and uploads — check the terms for your tier.',
          'Detection is unreliable as a first line: trace origin, corroborate, and distrust perfect provocation.',
        ],
      }),
      [
        [
          'Why should an event title be added AFTER generating a poster image?',
          [
            'Generated images are always low resolution',
            'Image models render letterforms as approximations — text usually comes out misspelled or ornamental',
            'Titles increase generation cost',
            'Image models refuse all text prompts',
          ],
          1,
          'Text rendering remains structurally weak; generate the visual and composite real typography on top.',
        ],
        [
          'Which task is best served by speech-to-text transcription?',
          [
            'Publishing unreviewed captions for a lecture with student names',
            'Converting a meeting recording into a draft that is then proofread against the audio',
            'Generating a news report from scratch',
            'Creating a cloned voice of a colleague',
          ],
          1,
          'Transcription shines as a first draft; names, numbers and accents are exactly where it errs, so a proofread pass is mandatory.',
        ],
        [
          'You need a picture of a real event that happened yesterday. The right move is:',
          [
            'Generate it — it will look convincing',
            'Use original photography or verifiable footage with a traceable source',
            'Ask a vision model to recall it',
            'Enhance an old photo and relabel it',
          ],
          1,
          'Synthetic media depicts nothing that happened; factual imagery needs a real, traceable origin.',
        ],
        [
          'A friend asks you to clone their voice for a project. The deciding consideration is:',
          [
            'Whether the tool is free',
            'Whether they have given consent and the licence permits the use',
            'How short the sample is',
            'Whether the output is watermarked',
          ],
          1,
          'Consent and licence terms govern faces and voices — permission converts a risk into a feature.',
        ],
      ]
    ),
    lesson(
      M7,
      'lit-7-3',
      3,
      'Free Tiers, Subscriptions and API Credits: What You Actually Pay',
      'The four ways to consume AI, what money genuinely buys (and what it never does), the data terms hidden in "free", and a decision frame for students and teams.',
      15,
      nineBlocks({
        objectives: [
          'Compare free tiers, paid subscriptions, per-token APIs and self-hosted open models',
          'Identify what a paid plan actually changes: limits, model tier, features and data terms',
          'Locate training-use and retention settings hidden in free consumer products',
          'Choose a consumption mode for a concrete usage pattern',
        ],
        hook:
          'Two students use "the same AI" for a semester. One stays on a free tier and quietly hits daily caps mid-revision-week, gets the smaller model, and never notices that her pastes may be used to improve the product. The other pays a modest subscription, gets the stronger model, longer files and an opt-out toggle she found in settings — and still gets hallucinations. Money changed her limits and her data terms. It did not change the truthfulness of anything, and confusing those two facts is expensive in both directions.',
        concept: `**The four consumption modes.** (1) **Free consumer tier**: a funded sample — generous enough to hook you, throttled with rate limits (messages per day, slower access at peak), often the provider's smaller or older model, shorter context, fewer file features, and the most permissive default data terms. (2) **Subscription**: you rent the full product — higher or no practical caps, the current flagship model, longer context, file projects, research modes, image/video minutes, priority speed, and usually the privacy controls (training opt-outs, longer retention windows). (3) **API credits**: raw model access priced per million tokens (Module 5, Lesson 4), input and output separately — no chat interface, you build the workflow, you own integration, error handling and evaluation, and you can mix models by task. (4) **Self-hosted open weights**: free to download, costly to run (hardware, ops, time — Module 5), decisive when data must not leave your boundary. Students live in (1) and (2); builders need (3); institutions with sensitivity rules eventually need (4).

**What money genuinely buys.** Five things, in order of practical impact: **limits** (the cap you hit is the feature you use least when you need it most); **model tier** (free tiers often route to smaller models — same brand, different engine, visibly different quality on hard tasks); **features** (file uploads, long documents, deep-research modes, canvas/projects, image minutes — frequently gated entirely); **data terms** (training opt-outs, retention windows, zero-retention enterprise options, and contractual terms for organisations); **support and guarantees** (SLA, uptime commitments, business terms). Note what is absent from that list: **truthfulness**. No tier buys accuracy. A paid plan gives you a better instrument, not a verified answer — verification (Modules 8 and 9) is not upsold because it cannot be.

**The part "free" hides.** Consumer free products are frequently funded by exactly two things: your rate-limited attention (upsell path) and your data (improvement path). Defaults differ by provider and change over time, so the durable skill is *locating the settings*: look for "improve the model for everyone", "data controls", "memory", "chat history" — and understand what each toggle actually does (training inclusion vs short-term retention for abuse prevention are different switches). Turning off training on a free tier is usually possible and always worth doing for personal material. Also read what the tier says about human review of conversations — providers describe sampling for safety and quality differently, so read your provider's wording rather than assuming the best or the worst.

**When free is genuinely enough.** Occasional drafting, explanation, brainstorming and light study — under the daily cap, with the smaller model — free is fine, and pretending otherwise would be hype. Pay when usage is daily and cap-bound, when you need the flagship model for hard reasoning, when you work with long documents, or when you need the data terms. Build an API integration when you are automating something with real volume (per-token arithmetic from Module 5 applies directly — often cheaper than a subscription at scale, and far more expensive if you mis-estimate). Self-host when compliance forbids egress or volume makes APIs uneconomic. The mistakes at each level are symmetrical: paying for a plan you underuse, staying free while hitting caps every day, and reaching for an API when a subscription would do.`,
        extras: [
          table(
            'What each mode gives and costs',
            ['Mode', 'You get', 'You give up / risk', 'Right when'],
            [
              ['Free tier', 'Zero cost, decent model, caps', 'Rate limits, smaller model, permissive data defaults', 'Occasional, low-stakes use'],
              ['Subscription', 'Flagship model, no practical caps, files, privacy toggles', 'Monthly fee, still vendor lock-in', 'Daily, serious study or work'],
              ['API credits', 'Raw model access, model mixing, automation', 'No UI; you build evals, errors, cost control', 'Programmatic volume'],
              ['Self-hosted open weights', 'Data never leaves, no per-token bill', 'Hardware, ops, capability gap', 'Compliance or very high volume'],
            ],
          ),
          code(
            `# When the subscription stops paying for itself
sub_price_month = 700        # hypothetical INR/month
api_input_rate  = 0.10        # INR per 1K input tokens (hypothetical)
api_output_rate = 0.40        # INR per 1K output tokens (hypothetical)

calls_per_month = 6000
in_tok, out_tok = 800, 300    # per call

api_bill = calls_per_month*(in_tok/1000*api_input_rate
                          + out_tok/1000*api_output_rate)
print(api_bill)               # compare with sub_price_month
# Then subtract: UI time, evals you must build, error handling.`,
            'mode_arithmetic.py',
            'python',
          ),
          tip(
            'Find the data settings today, not after',
            'Five minutes in Settings → Data/Privacy on every tool you use: switch off training on your chats where offered, decide on memory, and note what the tier promises about retention. It is the cheapest privacy action available to you.',
          ),
          warn(
            '"Free" does not mean "no cost" — and not only because of data',
            'Daily caps bind at the worst moment, smaller models fail harder tasks quietly, and commercial-use rights differ across free tiers (especially for image tools). Check limits, model routing and licence before building a habit on any free tier.',
          ),
        ],
        worked: {
          title: 'Pick a mode for three real usage patterns',
          problem:
            '(A) A second-year who uses AI twice a week for explanation and light drafting. (B) A placement-prep student using it daily for mock interviews, resume iteration and aptitude explanations, hitting the free cap most evenings. (C) A final-year team automating resume-tailoring for 200 submissions a month inside their own web app. Recommend modes and name what each must check before committing.',
          steps: [
            {
              title: 'A — occasional, low stakes → free tier',
              desc: 'Usage sits under caps; a subscription would rent an instrument that stays in the case. Must check: data settings (training opt-out) and the current model routing, so quality surprises are understood rather than blamed.',
            },
            {
              title: 'B — daily and cap-bound → subscription',
              desc: 'The cap is now the binding constraint, and the harder tasks (mock interview feedback, reasoning questions) benefit from the flagship model. Check: the actual monthly price against usage, the privacy toggles, and cancel-ability — subscriptions should be justified monthly, not by identity.',
            },
            {
              title: 'C — volume + product → API',
              desc: '200 submissions/month with programmatic formatting is automation, not conversation: APIs price per token, let each submission route (small model for tailoring, large for review), and integrate with validation. Check the arithmetic first — tokens/month × rates vs subscription plans — plus budget alerts and error handling.',
              code_snippet: '200 subs * (2500 in + 700 out) tokens\n= 500K in + 140K out tokens/month\n* rates  -> compare with team subscription cost',
            },
            {
              title: 'Decision summary',
              desc: 'Mode follows pattern: frequency × task hardness × programmatic need × data sensitivity. Also state the non-purchase: none of the three modes buys verification — all three still require the checklists from Modules 8 and 9.',
            },
          ],
          solution:
            'A stays free (with data settings tightened), B subscribes (caps and model tier are now binding), C uses the API (volume plus integration plus per-model routing). Each decision is justified by usage pattern rather than brand, and each includes the data-terms check — while remembering that no tier upgrades truthfulness, only the instrument.',
        },
        practice: {
          title: 'Audit the tiers you are on',
          prompt:
            'For each AI tool you used this week: note your current mode (free/subscription/API), the daily or monthly limits, which model you believe you are getting, and the state of its training/retention settings. Write two lines: what you would gain by paying, and whether you would actually use it.',
          hint: 'Look in Settings → Data/Privacy and the plan/limits page — not in the marketing copy.',
        },
        mistakes: [
          {
            mistake: 'Assuming free means the data path is protected',
            fix: 'Free tiers often carry the most permissive defaults. Locate the training opt-out and retention description yourself — defaults differ by provider and change over time.',
          },
          {
            mistake: 'Paying for a plan because of brand rather than bottleneck',
            fix: 'If you never hit caps and your tasks are simple, a subscription buys you little. Pay when a specific limit, model tier or feature is actually binding.',
          },
          {
            mistake: 'Expecting any tier to fix accuracy',
            fix: 'Paid plans buy capability, limits and terms — not truth. Verification habits are tier-independent and remain yours.',
          },
          {
            mistake: 'Choosing between API and subscription without arithmetic',
            fix: 'Compute tokens × rates for your real volume (Module 5 formula), then add the engineering time APIs demand. Both directions of this mistake are common and measurable.',
          },
        ],
        exam: {
          question:
            'A student asks whether the free tier is "good enough". Give a four-question decision frame, and explain why upgrading never solves one specific problem.',
          answer:
            'Four questions: (1) Does usage sit under the daily/monthly caps — including your worst week, not your average? (2) Do your tasks need the flagship model (hard reasoning, long documents), or is the routed smaller model sufficient? (3) Are the free tier\'s data terms acceptable for what you paste — training opt-out present, retention understood? (4) Do you need gated features (file projects, research modes, image minutes, commercial-use rights)? The problem upgrading never solves: truthfulness — higher tiers buy capability, limits, features and terms, so hallucination-prone outputs still require the verification discipline regardless of plan.',
          source: 'Everyday product-choice question in digital literacy and AI-tool onboarding interviews.',
        },
        summary: [
          'Four modes: free tier, subscription, API credits, self-hosted open weights — matched to usage patterns.',
          'Money buys limits, model tier, features, data terms and support — never accuracy.',
          'Free tiers are funded by attention and often by data: find training/retention settings yourself.',
          'Decide from frequency × hardness × programmatic need × sensitivity, with token arithmetic when automating.',
          'Whatever you pay, the verification checklist from Modules 8 and 9 still applies in full.',
        ],
      }),
      [
        [
          'Which does a paid subscription MOST reliably buy over a free tier?',
          [
            'Guaranteed factual accuracy',
            'Higher limits, the flagship model, gated features and stronger data controls',
            'A permanent knowledge cutoff update',
            'Immunity from prompt injection',
          ],
          1,
          'Subscriptions change limits, model tier, features and terms — truthfulness is not on the price list.',
        ],
        [
          'Where should you look to stop your chats being used for model training?',
          [
            'The marketing homepage',
            'Settings → data/privacy controls, and the tier\'s retention description',
            'The model\'s system prompt',
            'The app store description',
          ],
          1,
          'Training inclusion and retention are configured in data controls and described in the terms — defaults vary and change, so check yours.',
        ],
        [
          'When is the API (pay-per-token) mode the right choice?',
          [
            'When you want a chat interface',
            'When you are automating volume programmatically and can do the cost arithmetic',
            'When you have no internet',
            'When you want the free tier',
          ],
          1,
          'APIs suit machine-driven volume with routing and integration needs — priced per token, no UI, engineering is on you.',
        ],
        [
          'Your subscription gives you the flagship model but you still receive a confident wrong answer. This shows that:',
          [
            'The subscription was fraudulent',
            'Paid tiers improve capability and limits, not verification — checking remains your job',
            'The model needs recalibration',
            'Only free tiers hallucinate',
          ],
          1,
          'Accuracy is a property of grounding and verification practice, not of the billing plan.',
        ],
      ]
    ),
    lesson(
      M7,
      'lit-7-4',
      4,
      'Choosing a Tool for the Job — and Running Models on Your Own Device',
      'A repeatable selection procedure for the whole landscape, plus what local and on-device models actually offer: privacy, offline use, zero per-token cost — and their real capability ceiling.',
      16,
      nineBlocks({
        objectives: [
          'Apply a five-question selection procedure to choose an AI tool for a task',
          'Explain what running a local or on-device model means in practice',
          'State when local models beat cloud APIs and when they cannot compete',
          'Assemble a personal toolkit mapped to tasks rather than brands',
        ],
        hook:
          'The fastest way to feel the trade-off: summarise a personal diary entry with a cloud assistant — instant, excellent, and now sitting on someone else\'s servers — then do the same with a model running on your own laptop, offline. Slower, visibly less polished, and nothing left the machine. Neither run was the "right answer". They were answers to different questions, and tool selection is the skill of asking the right question first.',
        concept: `**A selection procedure you can reuse.** Five questions, in order: (1) **What is the claim pattern?** Live/changing facts → a retrieval-grounded tool; executable output → a coding assistant with a run loop; drafts and judgement → chat. (2) **How checkable is the output?** The less checkable, the more you want a tool that shows its sources or reasoning, and the more human review you budget. (3) **Can the data leave?** Personal, medical, client or unpublished material narrows the field before quality is discussed — hard constraints decide categories (Module 5, Lesson 4). (4) **What is the volume and hardness?** High volume favors cheap/fast routing; hard reasoning favors frontier models; low frequency favors free tiers. (5) **What is actually available to you?** Account, budget, device, offline need, organisation policy. Run the questions in order — when (3) says "no", the answer to (1) barely matters.

**Local and on-device: what it means.** A **local model** is downloadable open weights running on your own hardware — a laptop GPU or CPU, a workstation, a home server — through a chat app or runtime designed for it. An **on-device model** is a small model baked into your phone, laptop OS or browser, often on a dedicated neural accelerator, sometimes running entirely offline. Both invert the cloud bargain: no per-token bill, no rate caps, no network dependency, and — the decisive property — **input text never leaves the device**. The costs are equally concrete: capability is capped at what fits your hardware (today: small models — competent at summarising, rewriting, extraction, simple code and casual conversation; visibly weaker at long-context synthesis and hard multi-step reasoning), memory and battery are consumed while running, setup and updates are on you, and the model's knowledge is frozen at its training cutoff with no retrieval unless you add one.

**Where local genuinely wins.** Three situations, all variations on one theme — *the material should not travel*: personal notes, journals, medical or legal documents you would not paste into a web form; work with sensitive code or client data under policy that forbids external processing; and offline or connectivity-poor use (trains, fieldwork, low bandwidth) where zero latency-to-network and no usage caps matter. Add a fourth: very high-frequency, simple tasks where an API bill or subscription caps are the binding constraint and a small local model is good enough. **Where local cannot compete:** frontier-level reasoning, very long contexts, up-to-the-minute knowledge without your own retrieval, multimodal heavy lifting, and anything where the quality gap between a 3B-on-laptop model and a frontier API is the difference between usable and not. A middle path exists and is underrated: cloud tools *with* the right settings — training off, minimal pasted context, redaction — handle most personal material acceptably once you have done the Lesson 3 data-terms audit.

**Assemble the toolkit, not the fan collection.** The goal of this module is a small, boring, reliable set: one chat assistant you know the limits of, one search-grounded path for current facts, one coding assistant with a run habit, one local model for material that should not travel, and a standing rule for when each is used — that mapping is exactly what the Module 10 capstone asks you to document and keep. Judge tools by your own tests on your own tasks for a week, not by launch videos: the tool that survives a week of your real work is the tool you have chosen.`,
        extras: [
          table(
            'Local vs cloud, on the axes that decide',
            ['Axis', 'Local / on-device', 'Cloud API or app'],
            [
              ['Data path', 'Stays on device', 'Leaves to provider (terms apply)'],
              ['Cost shape', 'Hardware already owned; zero per token', 'Per token or subscription'],
              ['Capability ceiling', 'Small model — solid basics, weak hard reasoning', 'Frontier on demand'],
              ['Freshness', 'Frozen at training cutoff', 'Provider updates; some have retrieval'],
              ['Offline', 'Works', 'Needs network'],
              ['Ops burden', 'You (installs, updates, memory)', 'None'],
            ],
          ),
          code(
            `# A personal-toolkit routing rule (conceptual)
def route(task, data_sensitivity, needs_live_facts, hard_reasoning):
    if data_sensitivity == "high":      return "local model"
    if needs_live_facts:                return "AI search / grounded chat"
    if task == "code":                  return "coding assistant (run it)"
    if hard_reasoning:                  return "frontier chat model"
    return "fast/cheap model or free tier"

# Sensitivity is checked BEFORE capability - constraints pick the category.`,
            'route.py',
            'python',
          ),
          tip(
            'Test candidate tools on your real week',
            'A week of your own tasks — with notes on failures — reveals more than any comparison article. Keep a short scorecard: task, tool, usable on first try?, what broke.',
          ),
          warn(
            'A local app is not automatically private',
            'Some desktop/mobile AI apps sync history or telemetry even when inference is local. Check whether the app uploads conversations or model downloads; "runs locally" describes the model, not necessarily the wrapper.',
          ),
        ],
        worked: {
          title: 'Build and route a student\'s personal AI toolkit',
          problem:
            'A student\'s weekly AI needs: (1) daily study Q&A and difficult-concept explanations; (2) Python debugging for lab work; (3) summarising a private personal journal; (4) current affair and policy questions for a debate club; (5) occasional poster images for events. Choose a tool for each, justify with the five questions, and flag what must be verified.',
          steps: [
            {
              title: 'Apply question 3 first for journal summaries',
              desc: 'Private personal material: the data path decides — a local model (or a cloud tool with training off, minimal paste and redaction) is the category-appropriate answer. Capability needed is basic summarisation, squarely inside small-model competence.',
            },
            {
              title: 'Route by claim pattern for the rest',
              desc: 'Study Q&A → chat assistant (drafts/explanation, verify against textbook); Python debugging → coding assistant with the run habit (execute, read the diff); current affairs → AI search (open the sources); posters → image model with text composited outside (Lesson 2).',
              code_snippet: 'journal      -> local (data path decides)\nstudy Q&A    -> chat + verify vs textbook\ndebug lab    -> coding assistant + run\npolicy Qs    -> AI search + open sources\nposters      -> image model + real text',
            },
            {
              title: 'Check availability and cost against reality',
              desc: 'Budget zero, laptop with modest specs: local model = a small quantised model via a desktop runtime (fits memory, slower but private); everything else on free tiers with data settings tightened. Caps will bite study Q&A in exam week — that is the known failure, noted rather than denied.',
            },
            {
              title: 'Write the standing rules and the verification layer',
              desc: 'Rules: nothing sensitive goes to cloud; every factual claim gets an external check; every code change gets run; every citation gets opened. Then run the toolkit for a week and revise — the selection procedure is a loop, not a ceremony.',
            },
          ],
          solution:
            'Sensitivity-first routing (journal → local), then claim-pattern routing (facts → search, code → coding assistant, explanation → chat, media → image model with real typography), constrained by availability (free tiers + one local install) and closed by written verification rules. The toolkit is small on purpose: five tasks, four tools, four rules — which is exactly the structure the capstone asks you to maintain.',
        },
        practice: {
          title: 'Run one task locally',
          prompt:
            'Install or locate a local/on-device model (desktop runtime, phone built-in feature, browser option) and give it the same task you recently gave a cloud assistant — something low-stakes like summarising a public paragraph. Compare: quality, speed, convenience, and the data-path difference. Write three lines on which tasks you would now move local permanently.',
          hint: 'You are not benchmarking for the internet — you are discovering which of YOUR tasks fit inside your device\'s capability ceiling.',
        },
        mistakes: [
          {
            mistake: 'Ranking tools before checking the data constraint',
            fix: 'If the material cannot leave, capability comparisons are irrelevant — the constraint selects the category first. Question 3 runs before questions 1, 2 and 4.',
          },
          {
            mistake: 'Judging local models by frontier expectations',
            fix: 'A small on-device model is a different instrument: excellent at basic transformations, weak at hard reasoning. Assign it the tasks its ceiling covers and it will beat nothing gracefully.',
          },
          {
            mistake: 'Assuming a local app never talks to the internet',
            fix: 'Inference may be local while history sync, telemetry and model downloads are not. Verify what the wrapper uploads, not just where the model runs.',
          },
          {
            mistake: 'Accumulating tools instead of a toolkit',
            fix: 'More apps without routing rules means inconsistent quality and duplicated data exposure. Fewer tools, explicit rules, one scorecard — that is the selection procedure\'s output.',
          },
        ],
        exam: {
          question:
            'Give two situations where a local model beats a cloud API, and two where it cannot compete. Explain the underlying principle.',
          answer:
            'Local wins when: (1) the material must not leave the device — journals, medical or client documents, sensitive code — because the data path is the hard constraint; and (2) offline or capped-frequency simple work — summarising, rewriting, extraction — where zero per-token cost and no network dependency dominate. Local loses when: (1) frontier-level multi-step reasoning or very long context is required, because capability is bounded by what fits the hardware; and (2) up-to-date knowledge or heavy multimodal work is needed without your own retrieval layer, since the model is frozen at its cutoff. Principle: tool selection runs constraints (privacy, connectivity, cost) before capability, then matches the task\'s hardness to the model class — the same ordering as every build-vs-buy decision in Module 5.',
          source: 'Standard edge-vs-cloud deployment reasoning, simplified for AI literacy.',
        },
        summary: [
          'Select in order: claim pattern → checkability → data path → volume/hardness → availability.',
          'Local/on-device buys privacy, offline use and zero token cost — and charges a capability ceiling and ops burden.',
          'Sensitive material decides the category before capability is even discussed.',
          'A toolkit is a small set of tools plus written routing rules — not a folder full of apps.',
          'Judge candidates on a week of your own tasks; revisit when usage or models change.',
        ],
      }),
      [
        [
          'In the five-question selection procedure, which question comes before capability comparisons?',
          [
            'Which brand is most popular',
            'Whether the data may leave your boundary',
            'Which model has the most parameters',
            'What the interface looks like',
          ],
          1,
          'Hard constraints select the category first — if data cannot travel, cloud capability rankings are irrelevant.',
        ],
        [
          'The main capability limitation of an on-device model is that:',
          [
            'It cannot generate text at all',
            'It must be small enough to run on your hardware, capping hard reasoning and long-context work',
            'It always requires an internet connection',
            'It cannot be updated',
          ],
          1,
          'Hardware budgets force small models: solid basics, visibly weaker frontier-level reasoning — assign tasks inside that ceiling.',
        ],
        [
          'Which task is the best candidate for a local model?',
          [
            'Summarising your private personal notes offline',
            'Answering what happened in the news today',
            'Solving a hard multi-constraint optimisation problem',
            'Reading a live stock feed',
          ],
          0,
          'Sensitive material plus basic transformation plus no network need — exactly the local win condition.',
        ],
        [
          '"The desktop AI app runs locally, so my conversations are never uploaded." The careful response is:',
          [
            'Correct — local inference guarantees no uploads',
            'Check whether the wrapper syncs history or telemetry: local inference describes the model, not necessarily the app',
            'False — local models always upload',
            'True only on weekends',
          ],
          1,
          'Privacy claims must cover the whole app (sync, telemetry, downloads), not just where the model executes.',
        ],
      ]
    ),
  ],
};
