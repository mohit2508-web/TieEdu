// AI.FIRST — Module 3 · UNDERSTAND · The 2026 model landscape
import type { CourseModule } from '../db';
import { nineBlocks, diagram, table, tip, warn } from '../nineBlocks';
import { lesson, proofOfWork, M, COURSE_ID } from './helpers';

const ID = M(3);

export const module3: CourseModule = {
  id: ID,
  course_id: COURSE_ID,
  title: 'Module 3 — The 2026 Model Landscape',
  summary:
    'Pillar UNDERSTAND. Model families and open vs closed weights; multimodal models; reasoning models and agents; and choosing a model on quality, cost, latency and privacy with real token arithmetic.',
  sort_order: 3,
  lessons: [
    lesson(
      ID,
      'aif-m3-1',
      1,
      'Model Families, Open vs Closed Weights',
      'Who builds the models, what "open weights" really means, and the trade-offs between using an API and running a model yourself.',
      42,
      nineBlocks({
        objectives: [
          'Name the major model families and the organisations behind them, as of 2026',
          'Explain the difference between closed models, open-weight models and fully open-source models',
          'Choose between an API model and a self-hosted open-weight model for a given constraint',
        ],
        hook:
          'A hospital in Pune wants AI to summarise patient notes. Its lawyers say patient data must never leave its own servers. A start-up in Bengaluru wants the best possible coding assistant and does not care where it runs. Same technology, opposite answers — and the deciding factor is not which model is "smartest" but whether you can download its weights.',
        concept: `**The main families (as of 2026 — this list changes every few months, so check current sources):**
- **Closed / proprietary frontier models** — accessed through an app or API, weights never released: OpenAI's GPT series, Anthropic's Claude, Google's Gemini, xAI's Grok and others.
- **Open-weight models** — weights downloadable, usually with a licence that sets conditions: Meta's Llama family, Mistral, Alibaba's Qwen, DeepSeek, Google's Gemma, Microsoft's Phi, and many more.
- **Indian and Indic-focused efforts** — government-backed and start-up models focused on Indian languages and use-cases (for example under the IndiaAI Mission, and companies such as Sarvam AI). Worth tracking if you build for Indian users.

**Closed vs open weights vs open source**
- **Closed**: you send data to the provider; you get their latest quality, safety work and infrastructure; you accept their pricing, terms and data policies.
- **Open weights**: you can download and run the trained model on your own hardware or cloud, inspect and fine-tune it. Training data and code are often *not* released, and licences may restrict use (user-count caps, acceptable-use rules).
- **Fully open source** (rarer): weights, training code and data documentation are released under an open licence.

**The trade-off table you will actually use**
- **Data control**: open weights win — data can stay on your servers.
- **Peak quality**: closed frontier models usually lead, though the best open-weight models have often trailed by only months.
- **Cost at scale**: self-hosting can be cheaper at very high, steady volume; APIs are cheaper and simpler for most teams because you pay only for use and nothing for idle GPUs.
- **Effort**: APIs need an API key; self-hosting needs GPUs, serving software, monitoring, security updates and people who understand them.
- **Customisation**: open weights allow deep fine-tuning; many APIs also offer fine-tuning but within limits.

**Sizes matter.** "Small" models (a few billion parameters) can run on a laptop or phone and handle classification, extraction and simple chat well; frontier models handle hard reasoning, long documents and complex code. A common professional pattern is to **route**: send easy requests to a small, cheap model and hard ones to a large model (Lesson 3.4).`,
        extras: [
          diagram(
            'Deciding between API and self-hosted',
            `flowchart TD
  S["New AI use-case"] --> D{"Must data stay on your own infrastructure?"}
  D -->|"yes"| O["Open-weight model, self-hosted<br/>or a provider's private deployment"]
  D -->|"no"| Q{"Need the very best quality?"}
  Q -->|"yes"| F["Closed frontier model via API"]
  Q -->|"no"| V{"Very high steady volume and an ops team?"}
  V -->|"yes"| O
  V -->|"no"| A["API: small or mid-size model"]
  O --> E["Evaluate on YOUR task before committing"]
  F --> E
  A --> E`
          ),
          table('Closed vs open-weight at a glance', ['Factor', 'Closed API', 'Open-weight self-hosted'], [
            ['Data leaves your servers', 'Yes (check provider terms & regions)', 'No'],
            ['Setup effort', 'Minutes', 'Days to weeks'],
            ['Peak capability', 'Usually highest', 'Close behind, varies'],
            ['Pricing', 'Pay per token', 'Pay for hardware, used or idle'],
            ['Fine-tuning depth', 'Limited options', 'Full control'],
            ['Who patches safety issues', 'Provider', 'You'],
          ]),
          warn(
            '"Open" in a press release is not a licence',
            'Read the actual licence before building a product on an open-weight model: commercial use, user-count limits, attribution and acceptable-use clauses vary widely.',
          ),
        ],
        worked: {
          title: 'Choose for the hospital and the start-up',
          problem:
            'Hospital: summarise patient notes; data must stay on-premise; 2,000 notes/day; small IT team. Start-up: coding assistant for 15 engineers; wants top quality; no special data rules. Recommend an approach for each.',
          steps: [
            { title: 'Hospital constraint first', desc: 'Data residency rules out a public API unless the provider offers a compliant private deployment. Default: an open-weight mid-size model on hospital servers.' },
            { title: 'Hospital feasibility', desc: '2,000 notes/day is modest; one or two GPUs may be enough. Budget for an engineer to maintain it, and for clinical review of summaries.' },
            { title: 'Start-up constraint', desc: 'Quality dominates; volume is small; no residency rule. A closed frontier model via API (or a coding tool built on one).' },
            { title: 'Both: evaluate', desc: 'Test 2–3 candidates on 30 real examples each before deciding; benchmark scores do not substitute for your own task.' },
          ],
          solution:
            'Hospital → self-hosted open-weight model with human clinical review. Start-up → frontier API. The deciding factors were data control and volume, not leaderboard rank.',
        },
        practice: {
          title: 'Licence check',
          prompt:
            'Pick one open-weight model family. Find its current licence and answer: is commercial use allowed? Any user-count or revenue limits? Any banned uses? Is the training data documented? Summarise in five bullet points.',
          hint: 'The licence is normally linked from the model\'s official model card or repository.',
        },
        mistakes: [
          {
            mistake: 'Assuming "open" means free of conditions',
            fix: 'Open-weight licences often carry conditions. Read them before you ship.',
          },
          {
            mistake: 'Self-hosting to save money at low volume',
            fix: 'Idle GPUs cost money; at low or spiky volume an API is usually cheaper and far less work.',
          },
        ],
        exam: {
          question: 'What is the difference between an open-weight model and a closed model, and when would you choose each?',
          answer:
            'A closed model is accessed only through the provider\'s app or API; its weights are never released. An open-weight model\'s trained weights can be downloaded and run on your own infrastructure, usually under a licence. Choose open weights when data must stay in-house, when you need deep customisation, or at very high steady volume with an ops team. Choose a closed API for the highest quality, fastest setup and low-to-moderate volume.',
          source: 'Common in AI product, solutions-engineering and consulting interviews.',
        },
        summary: [
          'Closed frontier models via API; open-weight models you can download; fully open source is rarer.',
          'Open weights win on data control and customisation; APIs win on setup and usually peak quality.',
          'Read the licence — "open" carries conditions.',
          'Route by difficulty: small models for easy work, large ones for hard reasoning.',
        ],
      }),
      [
        ['An "open-weight" model means:', ['Its training data is always public', 'Its trained weights can be downloaded and run yourself, usually under a licence', 'It is free of all conditions', 'It cannot be fine-tuned'], 1, 'Weights are released; data and code may not be; licences vary.'],
        ['A bank must keep customer data on its own servers. The most natural choice is:', ['A public consumer chat app', 'A self-hosted open-weight model (or a compliant private deployment)', 'Any model with the highest benchmark', 'No AI at all'], 1, 'Data residency drives the choice.'],
        ['At low, spiky volume, self-hosting is usually:', ['Cheaper than an API', 'More expensive and more work than an API', 'Identical in cost', 'Impossible'], 1, 'You pay for idle hardware and operations.'],
        ['Before committing to any model you should:', ['Pick the top of a leaderboard', 'Evaluate candidates on examples from your own task', 'Choose the largest model', 'Ask a friend'], 1, 'Your task is the only benchmark that matters.'],
      ]
    ),
    lesson(
      ID,
      'aif-m3-2',
      2,
      'Multimodal AI: Vision, Voice, Images and Video',
      'Models that see, hear, speak and generate media — what they do well, how diffusion works, and where they fail.',
      42,
      nineBlocks({
        objectives: [
          'Describe the main multimodal capabilities: image understanding, speech in/out, image and video generation',
          'Explain diffusion — how image generators turn noise into a picture — at an intuitive level',
          'Identify the typical failure modes of each modality',
        ],
        hook:
          'A farmer in Vidarbha photographs a yellowing cotton leaf and asks, in Marathi, by voice, what is wrong. Within seconds a model replies, in spoken Marathi, with three likely causes and what to check first. Five years ago that needed four separate systems — speech recognition, translation, image classification, speech synthesis. Today one multimodal model can do it in a single conversation. It can also be confidently wrong about the leaf.',
        concept: `**Multimodal** models take in or produce more than text. The main capabilities in 2026:

**1. Vision (image understanding).** Upload a photo, a chart, a handwritten page or a screenshot; the model describes it, extracts text (OCR), reads tables, answers questions. Images are cut into patches and turned into tokens the transformer can attend over alongside text. *Strong at*: documents, screenshots, charts, everyday scenes. *Weak at*: exact counting of many objects, fine measurements, small text in low-resolution images, and specialist judgement (medical scans, structural cracks) without validation.

**2. Speech in and out.** Speech recognition (ASR) turns audio into text; text-to-speech (TTS) produces natural voices; newer **speech-to-speech** models converse in real time and can carry tone. Indian-language support has improved fast but still varies by language, accent and noise. *Risk*: realistic **voice cloning** from a few seconds of audio enables scams (Module 11).

**3. Image generation — diffusion.** Training: take real images, add noise step by step until they are pure static, and teach a network to **predict and remove the noise** at each step, conditioned on a text description. Generation runs that in reverse: start from random noise and repeatedly denoise, steered by your prompt, until an image emerges. *Weak at* (improving): exact text inside images, hands and counts, consistent characters across images, and anything requiring factual accuracy.

**4. Video and music generation.** Diffusion and transformer methods extended over time produce short clips and audio from text or images. Quality rose sharply in 2024–2026; consistency over longer durations and physics remain hard. These are also the core tools of deepfakes.

**Using multimodal well**
- Give the model **the image plus a precise question** ("Read the total amount on this bill and the date") rather than "what is this?".
- For anything consequential — medical, legal, safety, money — treat the output as a **draft to be verified**.
- Generated media must be **labelled** where it could be mistaken for real (and in many places, rules now require it — Module 10).`,
        extras: [
          diagram(
            'Diffusion: from noise to image',
            `flowchart LR
  subgraph TRAIN["Training — learn to remove noise"]
    I["Real image + caption"] --> N1["Add a little noise"] --> N2["Add more"] --> N3["Pure noise"]
    N3 -.->|"network learns to predict the noise at each step"| I
  end
  subgraph GEN["Generation — run it backwards"]
    Z["Random noise + your prompt"] --> D1["Denoise step"] --> D2["Denoise step"] --> D3["… ~20–50 steps …"] --> OUT["New image"]
  end`
          ),
          table('Modalities: strengths and failure modes', ['Capability', 'Strong at', 'Watch out for'], [
            ['Image understanding', 'Documents, receipts, charts, screenshots', 'Counting, tiny text, specialist diagnosis'],
            ['Speech recognition', 'Clear speech, major languages', 'Accents, noise, code-mixed Hinglish, names'],
            ['Text-to-speech / voice', 'Natural narration, accessibility', 'Voice cloning misuse, consent'],
            ['Image generation', 'Concepts, mock-ups, illustrations', 'Text in images, hands, factual depiction'],
            ['Video generation', 'Short creative clips', 'Physics, long-range consistency, deepfakes'],
          ]),
          tip(
            'Accessibility is a killer use-case',
            'Image description for blind and low-vision users, live captions, reading support and voice interfaces in local languages are some of the highest-value, lowest-hype uses of multimodal AI.',
          ),
        ],
        worked: {
          title: 'Make the leaf diagnosis safe',
          problem:
            'You are building the farmer\'s crop-advice feature with a multimodal model. List the design decisions that keep it useful without being dangerous.',
          steps: [
            { title: 'Scope the output', desc: 'Return "likely causes to check" with confidence language, never a single definitive diagnosis.' },
            { title: 'Ask for better input', desc: 'Prompt the user for a close-up of both leaf sides and a wider shot of the plant; image quality drives accuracy.' },
            { title: 'Ground in agronomy sources', desc: 'Retrieve guidance from the state agriculture department or university extension material and cite it.' },
            { title: 'Escalate', desc: 'For pesticide decisions or widespread damage, direct the farmer to a local Krishi Vigyan Kendra or extension officer, with a voice-readable summary to share.' },
            { title: 'Evaluate', desc: 'Test on a labelled set of local crop photos before launch; measure accuracy per disease and per language.' },
          ],
          solution:
            'Multimodal models are excellent first-line assistants. Safety comes from scoping, better inputs, grounding in trusted sources, escalation to humans and measured accuracy — not from the model alone.',
        },
        practice: {
          title: 'Stress-test vision',
          prompt:
            'Give a multimodal assistant: (1) a photo of a printed bill, (2) a handwritten note, (3) a chart from a report, (4) a photo with 15+ similar objects. Ask a precise question about each. Record accuracy and note which failed and why.',
          hint: 'Counting many similar objects and reading handwriting are classic weak spots.',
        },
        mistakes: [
          {
            mistake: 'Asking vague questions about images',
            fix: 'Ask precisely what you need extracted or judged. Vague questions get generic descriptions.',
          },
          {
            mistake: 'Using generated images as evidence or as depictions of real events',
            fix: 'Generated images are illustrations. Label them, and never present them as photographs of reality.',
          },
        ],
        exam: {
          question: 'Explain how a diffusion model generates an image from a text prompt.',
          answer:
            'During training, the model sees real images with noise added in many steps and learns to predict the noise at each step, conditioned on the image caption. To generate, it starts from pure random noise and repeatedly removes predicted noise, guided by the text prompt, over tens of steps until a coherent image matching the prompt emerges.',
          source: 'Common conceptual question for GenAI roles.',
        },
        summary: [
          'Multimodal = text plus images, audio, video — in and out.',
          'Vision is strong on documents and screenshots, weak on counting and specialist judgement.',
          'Diffusion learns to remove noise; generation denoises random noise guided by the prompt.',
          'Treat consequential multimodal outputs as drafts; label generated media.',
        ],
      }),
      [
        ['Diffusion image generators create an image by:', ['Searching the web for similar images', 'Starting from noise and repeatedly removing predicted noise guided by the prompt', 'Drawing pixel by pixel left to right', 'Editing a stock photo'], 1, 'Generation reverses the noising process learned in training.'],
        ['A common weakness of vision models is:', ['Reading printed receipts', 'Accurately counting many similar objects', 'Describing everyday scenes', 'Reading screenshots'], 1, 'Counting and fine measurement remain error-prone.'],
        ['Which multimodal risk is most associated with scams?', ['Image captioning', 'Voice cloning from short audio samples', 'OCR', 'Chart reading'], 1, 'Cloned voices impersonate relatives and officials.'],
        ['For a crop-disease feature, the safest output design is:', ['A single definitive diagnosis', 'Likely causes to check, cited guidance, and escalation to an expert for consequential decisions', 'No output, only a phone number', 'Always recommend a pesticide'], 1, 'Scope, ground, escalate.'],
      ]
    ),
    lesson(
      ID,
      'aif-m3-3',
      3,
      'Reasoning Models and Agents: What Changed',
      'Models that think before answering, and models that act — test-time compute, tool use, and the honest limits of both.',
      44,
      nineBlocks({
        objectives: [
          'Explain what a reasoning model does differently and when the extra cost is worth it',
          'Define an AI agent as a model in a loop with tools, and name what can go wrong',
          'Decide whether a task needs a plain chat model, a reasoning model or an agent',
        ],
        hook:
          'Ask an ordinary chat model a tricky maths olympiad problem and it answers in two seconds — often wrong. Ask a reasoning model and it "thinks" for forty seconds, tries an approach, notices a mistake, backtracks, and gets it right. Ask an agent to "find three internships matching my resume and draft applications" and it searches, reads pages, compares, and writes drafts over several minutes. These are different tools with different costs, and choosing the wrong one wastes either money or trust.',
        concept: `**Reasoning models (2024 onwards).** Instead of answering immediately, a reasoning model generates a long internal chain of intermediate steps first — planning, trying, checking, revising — and then gives a final answer. This uses **test-time compute**: spending more computation per question rather than only training a bigger model. They are trained with reinforcement learning on problems that have checkable answers (maths, code, logic), which rewards reasoning that actually reaches correct results.

*When it is worth it*: multi-step maths and logic, debugging and complex code, planning with constraints, careful analysis of long documents, and hard "think it through" questions.
*When it is not*: simple lookups, rewriting, short summaries, casual chat — you pay more and wait longer for no benefit. Many products now let you choose a "thinking" level or decide automatically.
*Honest limits*: longer reasoning can still reach wrong conclusions confidently; the displayed "thinking" text is not guaranteed to be a faithful account of how the answer was produced; and costs rise with thinking tokens.

**Agents.** An agent is a model placed in a **loop** with **tools**: it decides an action (search the web, run code, read a file, call an API, click in a browser), observes the result, decides the next action, and repeats until the goal is met or a limit is hit. Coding agents, research agents, browser agents and workflow agents all follow this pattern (Module 9 builds one).

*What agents add*: they can finish multi-step tasks, use fresh information and check their own work against reality (run the tests, read the page).
*What can go wrong*: errors compound over many steps; they can take irreversible actions (send, delete, pay); web pages can contain **prompt injections** that hijack them (Module 11); and costs and time are hard to predict. Good agent design adds permissions, confirmation before consequential actions, step limits and logs.

**The decision ladder**: plain chat → reasoning model → agent. Move up only when the task needs it.`,
        extras: [
          diagram(
            'Chat vs reasoning vs agent',
            `flowchart LR
  subgraph CHAT["Chat model"]
    q1["Question"] --> a1["Answer"]
  end
  subgraph REASON["Reasoning model"]
    q2["Question"] --> t["Think: plan · try · check · revise"] --> a2["Answer"]
  end
  subgraph AGENT["Agent"]
    g["Goal"] --> d["Decide action"] --> act["Use a tool"] --> o["Observe result"]
    o --> c{"Goal met or limit reached?"}
    c -->|"no"| d
    c -->|"yes"| r["Report + evidence"]
  end`
          ),
          table('Which tool for which task?', ['Task', 'Best fit', 'Why'], [
            ['Rewrite a paragraph more formally', 'Chat', 'No multi-step reasoning needed'],
            ['Find the bug in a 300-line function', 'Reasoning model', 'Careful multi-step analysis'],
            ['Solve a constraint-heavy timetable puzzle', 'Reasoning model', 'Planning and checking'],
            ['Book-keep: read 40 invoices, fill a sheet, flag mismatches', 'Agent with tools', 'Many steps, files, verification'],
            ['Research a company before an interview with sources', 'Agent (research mode)', 'Searches, reads, synthesises fresh info'],
          ]),
          warn(
            'Agents act — so they need brakes',
            'Never give an agent unsupervised power to send messages, spend money, delete data or submit forms on your behalf. Require confirmation for anything you cannot undo.',
          ),
        ],
        worked: {
          title: 'Cost a reasoning call honestly',
          problem:
            'A plain model answers a coding question with 400 output tokens. A reasoning model uses 6,000 thinking tokens plus 400 answer tokens, billed as output. At a hypothetical ₹1 per 1,000 output tokens for both, compare cost — and decide when the reasoning model is worth it.',
          steps: [
            { title: 'Plain model', desc: '400 tokens → ₹0.40.' },
            { title: 'Reasoning model', desc: '6,400 tokens → ₹6.40 — 16× more (real prices for reasoning models are often higher per token too).' },
            { title: 'Value the outcome', desc: 'If the plain model is right 50% of the time and the reasoning model 90%, and a wrong answer costs a developer 20 minutes, the reasoning model is cheap.' },
            { title: 'Route', desc: 'Use plain models for easy questions and send hard ones to reasoning — or let a product\'s automatic mode decide.' },
          ],
          solution:
            '16× the tokens, but cost per correct answer — not cost per call — is the right measure. Reasoning models earn their price on hard problems and waste it on easy ones.',
        },
        practice: {
          title: 'Run the ladder',
          prompt:
            'Choose one hard question from your subject (a multi-step numerical problem or a tricky bug). Ask a plain chat model and a reasoning ("thinking") mode. Compare correctness, time and length. Then write which of five tasks from your week need chat, reasoning or an agent.',
          hint: 'If both get it right, the problem was not hard enough to need reasoning.',
        },
        mistakes: [
          {
            mistake: 'Using the most powerful mode for everything',
            fix: 'Match the tool to the task. Reasoning and agents cost more and take longer; use them where steps and checking matter.',
          },
          {
            mistake: 'Trusting the "thinking" transcript as a faithful explanation',
            fix: 'Treat it as helpful but not guaranteed to reflect how the answer was produced. Verify the final answer independently.',
          },
          {
            mistake: 'Letting an agent take irreversible actions without confirmation',
            fix: 'Design human approval into any send, pay, delete or submit step.',
          },
        ],
        exam: {
          question: 'What is the difference between a chat model, a reasoning model and an agent?',
          answer:
            'A chat model answers directly in one pass. A reasoning model spends extra computation generating intermediate steps — planning, checking and revising — before answering, which helps on maths, code and complex analysis at higher cost and latency. An agent puts a model in a loop with tools: it chooses actions, observes results and continues until a goal is met, which enables multi-step tasks but needs permissions, limits and human confirmation for consequential actions.',
          source: 'Increasingly standard in 2025–2026 AI interviews.',
        },
        summary: [
          'Reasoning models spend test-time compute thinking; worth it for hard multi-step problems.',
          'Agents = model + tools + loop; they act, so they need permissions and brakes.',
          'Measure cost per correct outcome, not per call.',
          'Ladder: chat → reasoning → agent; climb only when needed.',
        ],
      }),
      [
        ['A reasoning model differs from a plain chat model mainly because it:', ['Has no training cutoff', 'Generates intermediate reasoning steps before answering, using more compute per question', 'Cannot write code', 'Is always cheaper'], 1, 'Test-time compute: think first, answer second.'],
        ['An AI agent is best defined as:', ['A chatbot with a name', 'A model in a loop that chooses and uses tools, observing results, until a goal or limit', 'A human assistant', 'A database'], 1, 'Loop + tools + observation.'],
        ['Which task most clearly needs an agent rather than a chat model?', ['Rewording a sentence', 'Reading 40 invoices, filling a spreadsheet and flagging mismatches', 'Translating one paragraph', 'Explaining a word'], 1, 'Many steps, files and verification.'],
        ['The right way to compare a reasoning model with a plain model is:', ['Cost per call', 'Cost per correct outcome on your task', 'Length of answer', 'Speed only'], 1, 'Accuracy changes the economics.'],
      ]
    ),
    lesson(
      ID,
      'aif-m3-4',
      4,
      'Choosing a Model: Quality, Cost, Latency, Privacy',
      'A repeatable selection method with real token arithmetic, a small evaluation, and a written model-selection memo as your proof of work.',
      44,
      nineBlocks({
        objectives: [
          'Compute monthly cost for an AI feature from token counts and per-million-token prices',
          'Run a small comparative evaluation of candidate models on your own examples',
          'Write a model-selection memo that a manager could approve',
        ],
        hook:
          'A team ships a customer-support bot on the most powerful model available. It is brilliant — and the first month\'s bill is ₹4.2 lakh for a feature budgeted at ₹40,000. A smaller model would have handled 85% of the questions just as well. Choosing a model is an engineering and business decision, and it can be done properly in an afternoon.',
        concept: `**The four axes**
1. **Quality** on *your* task — measured, not assumed.
2. **Cost** — per-token prices × token volume, plus any hosting.
3. **Latency** — time to first token and total time; matters for chat and voice, less for overnight batch jobs.
4. **Privacy and compliance** — where data goes, whether it is retained or used for training, regions, contracts, and sector rules.

Add **context length**, **modalities**, **tool-use reliability** and **licence** where relevant.

**Token arithmetic.** API prices are quoted per **million tokens (MTok)**, separately for input and output; output is usually several times more expensive.
Monthly cost = requests × (input tokens × input price + output tokens × output price) ÷ 1,000,000.

**Levers that cut cost without cutting quality**
- **Routing** — a small model for easy requests, a large one only for hard ones.
- **Prompt caching** — many providers discount repeated input (such as a long, fixed system prompt or document).
- **Batch APIs** — overnight, non-urgent jobs often cost much less.
- **Shorter outputs** — ask for exactly the format and length you need.
- **Trimming context** — send the relevant 3 pages, not the whole 300.

**A 30-example evaluation (do this every time)**
1. Collect 30 real examples covering easy, typical and hard cases (and a few nasty edge cases).
2. Write what a good answer must contain — a simple rubric.
3. Run 2–3 candidate models with the same prompt.
4. Score blind if you can (hide which model produced which answer).
5. Record quality, average tokens, latency and cost per 1,000 requests.
6. Pick the cheapest model that meets the quality bar — then re-check monthly, because prices and models change fast.`,
        extras: [
          diagram(
            'Model selection workflow',
            `flowchart TD
  R["Requirements: quality bar, budget, latency, data rules"] --> C["Shortlist 2–3 candidates"]
  C --> E["Run 30 real examples with one prompt"]
  E --> S["Score blind against a rubric"]
  S --> K["Compute cost per 1,000 requests"]
  K --> P{"Cheapest model that meets the bar?"}
  P --> D["Decide + write the memo"]
  D --> M["Monitor monthly: quality, cost, new models"]
  M --> C`
          ),
          table('Worked monthly cost (illustrative prices)', ['Model tier', 'Input ₹/MTok', 'Output ₹/MTok', '50k requests × (1,500 in + 300 out)'], [
            ['Small', '₹10', '₹40', '50k × (0.015 + 0.012) = ₹1,350'],
            ['Mid', '₹100', '₹400', '50k × (0.15 + 0.12) = ₹13,500'],
            ['Frontier', '₹400', '₹1,600', '50k × (0.6 + 0.48) = ₹54,000'],
            ['Routed: 85% small + 15% frontier', '—', '—', '≈ ₹1,150 + ₹8,100 = ₹9,250'],
          ]),
          tip(
            'Prices are a moving target',
            'Real per-token prices change frequently and generally fall for a given capability level. Always use the provider\'s current pricing page and date your memo.',
          ),
          proofOfWork(
            3,
            'The model-selection memo',
            'Compare 2–3 assistant apps on 15 real tasks from your study or work. Score each on a rubric; include privacy settings you checked. One-page recommendation.',
            'Run a 30-example evaluation of 2–3 models through APIs with one prompt; log quality scores, tokens, latency and cost per 1,000 requests; recommend one model plus a routing rule.',
            'Write a selection memo for a real team use-case: requirements, candidates, evaluation summary, monthly cost scenarios, data-protection review and a decision with a review date.',
            'Your own scored examples, the cost arithmetic shown, and a decision a manager could sign. "Model X is the best" without evidence scores zero.'
          ),
        ],
        worked: {
          title: 'The support-bot bill, fixed',
          problem:
            'Support bot: 60,000 conversations/month, average 2,000 input and 400 output tokens. Frontier prices (illustrative) ₹400 in / ₹1,600 out per MTok. Evaluation shows a small model (₹10 / ₹40) meets the quality bar on 85% of questions, which a cheap classifier can identify. Compute before and after.',
          steps: [
            { title: 'Before', desc: 'Per conversation: 2,000 × 400/1M + 400 × 1,600/1M = ₹0.80 + ₹0.64 = ₹1.44. × 60,000 = ₹86,400/month.' },
            { title: 'Small model share', desc: '51,000 conversations × (2,000 × 10/1M + 400 × 40/1M) = 51,000 × (₹0.02 + ₹0.016) = ₹1,836.' },
            { title: 'Frontier share', desc: '9,000 × ₹1.44 = ₹12,960.' },
            { title: 'After', desc: '₹1,836 + ₹12,960 ≈ ₹14,800/month — about 83% less, with quality held by the evaluation.' },
          ],
          solution:
            'Routing cut the bill from ≈ ₹86,400 to ≈ ₹14,800 per month. The evaluation is what made the cut safe; without it, routing is a guess.',
        },
        practice: {
          title: 'Cost your own idea',
          prompt:
            'Pick an AI feature you would like to build. Estimate requests per month, input and output tokens per request, and compute monthly cost for a small, mid and frontier model using a provider\'s current price page. Add one cost-cutting lever and recompute.',
          hint: 'Count tokens for one real example with a tokenizer tool, then multiply.',
        },
        mistakes: [
          {
            mistake: 'Choosing by leaderboard rank',
            fix: 'Leaderboards measure someone else\'s tasks. Your 30 examples decide.',
          },
          {
            mistake: 'Forgetting that output tokens cost more than input',
            fix: 'Constrain answer length and format; long outputs dominate many bills.',
          },
          {
            mistake: 'Skipping the privacy review because the demo worked',
            fix: 'Check data retention, training use, regions and contract terms before real user data flows.',
          },
        ],
        exam: {
          question: 'How would you choose an LLM for a production feature?',
          answer:
            'Start from requirements: quality bar, budget, latency and data rules. Shortlist two or three models, run the same prompt over about thirty real examples including edge cases, score them blind against a rubric, and compute cost per thousand requests from token counts. Pick the cheapest model that meets the bar, consider routing easy requests to a smaller model, confirm privacy and licensing, then monitor quality and cost and re-evaluate as models change.',
          source: 'A staple case question in AI engineering and product interviews.',
        },
        summary: [
          'Four axes: quality on your task, cost, latency, privacy/compliance.',
          'Cost = requests × (in × price_in + out × price_out) ÷ 1M.',
          'Routing, caching, batch and shorter outputs cut cost without cutting quality.',
          'A blind 30-example evaluation beats any leaderboard.',
        ],
      }),
      [
        ['API prices are usually quoted per:', ['Request', 'Million tokens, separately for input and output', 'Word', 'Minute'], 1, 'Per-MTok, input and output priced separately.'],
        ['10,000 requests × 1,000 input tokens at ₹100 per million input tokens costs:', ['₹100', '₹1,000', '₹10,000', '₹10'], 1, '10,000 × 1,000 = 10M tokens × ₹100/M = ₹1,000.'],
        ['"Routing" in model selection means:', ['Sending all traffic to one region', 'Sending easy requests to a small model and hard ones to a larger model', 'Changing the network router', 'Rotating API keys'], 1, 'Match model cost to request difficulty.'],
        ['The best evidence for choosing a model is:', ['A public leaderboard', 'A blind evaluation on real examples from your task', 'Social media opinions', 'The newest release date'], 1, 'Your own task is the benchmark that matters.'],
      ]
    ),
  ],
};
