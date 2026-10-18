// Module 5 — How Frontier Models Are Made
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code } from '../nineBlocks';
import { lesson, M5, COURSE_ID } from './helpers';

export const module5: CourseModule = {
  id: M5,
  course_id: COURSE_ID,
  title: 'Module 5 — How Frontier Models Are Made',
  summary:
    'The full production pipeline — pretraining, supervised fine-tuning, RLHF — plus model families and sizes, open vs closed weights, what "parameters" means, and the token economics that govern cost and speed.',
  sort_order: 5,
  lessons: [
    lesson(
      M5,
      'lit-5-1',
      1,
      'Pretraining and Parameters: Learning From the Internet at Scale',
      'What actually happens in the base-model stage: corpus curation, the next-token objective at trillion-token scale, and what the number of parameters really tells you.',
      17,
      nineBlocks({
        objectives: [
          'Describe the pretraining stage: data curation, objective, compute, and the resulting base model',
          'Explain what a parameter is and roughly interpret model-size numbers',
          'Relate parameter count to capability, data needs and cost using scaling intuition',
          'Explain why a raw pretrained model is not yet a chat assistant',
        ],
        hook:
          'When a company announces "a 70-billion-parameter model trained on 15 trillion tokens", every word is technical jargon doing heavy lifting. Unpack them and a surprising story appears: someone assembled a library the size of the internet, ran a next-token prediction loop on a warehouse of chips for weeks, and out came not a chatbot but a strange autocomplete engine that must later be taught to converse. This lesson unpacks the announcement.',
        concept: `**The corpus: data before intelligence.** Pretraining begins with assembling a training corpus — a cleaned, deduplicated snapshot of text drawn from the open web (Common Crawl and similar), books, Wikipedia, code repositories (GitHub), academic material, and licensed proprietary sources. Curation is a real engineering discipline, not a download: quality filtering (drop gibberish, machine-translated spam, SEO farms), deduplication (exact and near-duplicate removal — duplicates waste compute and cause memorisation), language balancing, toxic-content filtering, and increasingly, licensing and consent management. The corpus shape partially becomes the model\'s character: code-heavy data supports programming ability; curated encyclopedic data supports factual answers. (Notably, no frontier lab publishes their exact mix — it is a core trade secret — so figures you read outside official reports are estimates.) Then the data is tokenized (Module 4, Lesson 1) into a stream of integers and chopped into sequences.

**The run: objective × scale.** With the corpus ready, pretraining is the Module 3 loop at industrial scale: initialise a Transformer with random weights; repeatedly predict the next token on batches; compute loss; update billions of weights; repeat for trillions of tokens — the entire corpus swept through multiple times (epochs) across thousands of accelerators coordinated by distributed-training systems, running for weeks to months with fault tolerance (machines fail mid-run; training must resume seamlessly) and costing, by public accounts of comparable runs, well into the tens of millions of dollars for the largest models. Two things make this affordable enough to happen at all: **accelerators** (GPUs/TPUs execute the dense matrix arithmetic neural networks need far faster than CPUs) and **scaling laws** — the empirically observed, remarkably smooth relationship where loss improves predictably as you grow parameters, data, and compute together. Smoothness matters commercially: you can forecast the returns of a bigger run before paying for it, which is why labs keep climbing the curve.

**Parameters: the knobs on the shelf.** A **parameter** is one trained number — one weight or bias, the unit from Module 3. "70B parameters" means the model has seventy billion such numbers stored in memory (in full precision that is enormous; serving almost always uses reduced precision — another Module 5 topic). Parameters are the model\'s *capacity*: roughly, how much pattern the model can store. Counts give useful, if blunt, context: single-digit billions (small by current standards) can power capable assistants when well-trained and well-tuned; tens of billions sit in the middle of open-weight releases; hundreds of billions to trillions anchor the largest frontier systems — often with **MoE (mixture-of-experts)** architectures where a huge total parameter count is split into specialised subsets, only some active per token, giving large capacity at tractable per-token compute. Crucially, parameter count alone predicts nothing reliably: data quality, training token count, architecture details and post-training (next two lessons) all mediate. A well-tuned 8B model can outclass a poorly-tuned 70B one — a fact the industry proves repeatedly, and a fact that kills naive "bigger number = better" reasoning.

**What comes out: a base model, not a chatbot.** The product of pretraining is a **base model** (a.k.a. foundation model): a supremely capable text *continuator*. Ask it a question and it may continue with another question, or more Wikipedia prose, or a list of related questions — because raw internet text is mostly not "helpful answers to instructions". Base models are pattern engines with broad world knowledge compressed into their weights; they have not been taught conversation format, instruction-following, refusal of harm, or answer style. Everything a user experiences as "ChatGPT-like" is built on top in post-training (Modules 5.2–5.3). This distinction explains a great deal of practical behaviour: base-model tendencies (rambling, mimicking, continuing rather than answering) leak through whenever alignment is thin; and why the same base model can power very different final products depending on who tunes it. Pretraining is where capability is *bought*; post-training is where it is *shaped*.`,
        extras: [
          table(
            'Reading a model announcement',
            ['Phrase', 'Means', 'What to ask next'],
            [
              ['"70B parameters"', '70 billion trained numbers — capacity, roughly', 'How many training tokens? Which data? MoE or dense?'],
              ['"trained on 15T tokens"', 'The corpus was swept ~15 trillion tokens through the objective', 'What is the composition and quality?'],
              ['"open weights / open source"', 'Weights downloadable (license varies)', 'Can I self-host, and at what cost?'],
              ['"context window 128k"', '128,000 tokens visible per pass', 'How is it priced per input/output token?'],
            ],
          ),
          info(
            'MoE in one breath',
            'Mixture-of-experts models hold many parameters but activate only a slice per token — large stored capacity, moderate per-token cost. This is why "total parameters" and "cost to run" increasingly decouple; ask both when comparing models.',
          ),
          tip(
            'Parameter count is a starting question, not a verdict',
            'Compare published benchmarks at matched tasks, price per token, latency, and context size before concluding anything from the parameter number. The industry has shipped many embarrassing upsets where smaller models beat larger ones.',
          ),
          warn(
            'Pretraining corpora are contested territory',
            'Web-scraped training data raises licensing, copyright, privacy and consent questions that courts and regulators are actively working through. When you evaluate a model for real work, knowing its provenance and licence terms is part of technical due diligence, not a distraction from it.',
          ),
        ],
        worked: {
          title: 'Interpret a model card you will actually meet',
          problem:
            'You are comparing two releases for your company\'s assistant: Model A: dense, 8B parameters, trained (public claim) on ~15T tokens, context 128k, price \$0.10 per million input tokens. Model B: MoE, 120B total / ~12B active, context 32k, price \$1.00 per million input tokens. You need: summarisation of 50-page PDFs (≈60k tokens each) and short Q&A. Analyse.',
          steps: [
            {
              title: 'Capacity vs efficiency',
              desc: 'Model B stores far more total knowledge (MoE capacity) and likely answers richer questions; Model A is small but unusually well-fed (15T tokens for 8B is a high tokens-per-parameter ratio — efficient training). Neither number alone decides.',
            },
            {
              title: 'The binding constraint: context',
              desc: 'A 60k-token PDF needs ≥60k window plus reply room. Model A (128k) fits comfortably; Model B (32k) cannot take the document whole — you would need chunking + stitching (or drop it).',
              code_snippet: 'PDF ≈ 60k tokens vs windows: A = 128k (fits), B = 32k (fails)',
            },
            {
              title: 'Cost at your workload',
              desc: 'Per document: A costs 60k × \$0.10/M ≈ \$0.006 input; B would be 60k × \$1.00/M = \$0.060 if it fit. At 1,000 documents/day: A ≈ \$6/day input; B ≈ \$60/day — and B still fails the window requirement.',
              code_snippet: 'A: 60000/1e6 * 0.10 = $0.006 per doc; *1000 = $6/day',
            },
            {
              title: 'Decision',
              desc: 'Model A wins on structure for this workload — context fits, cost is a tenth — pending a quality benchmark on YOUR documents. If a follow-up need for deeper reasoning on short inputs appears, route short-context tasks to B: a router (Module 6 territory) beats a single model choice.',
            },
          ],
          solution:
            'Match the model to the binding constraints: context window first (hard requirement), then measured quality on your data, then price and latency. Model A fits the PDF workload at a tenth the input cost; Model B\'s capacity advantage is stranded behind its 32k window for this use case. Parameters informed the comparison — they did not decide it.',
        },
        practice: {
          title: 'Reconstruct a model announcement',
          prompt:
            'Find a real public model announcement or model card. Extract: parameter count (if stated), context window, pricing per million input/output tokens, knowledge-cutoff or training-data window if stated, and whether weights are downloadable. For each missing field, write what you would ask the vendor and why it matters for a buying decision.',
          hint: 'Announcements optimise for headlines; model cards and pricing pages optimise for buyers. Read the second.',
        },
        mistakes: [
          {
            mistake: 'Assuming a released chat product equals the raw pretrained model',
            fix: 'Chat products are base models plus extensive post-training (SFT + alignment) plus system prompts and tooling. Two products can share a base and behave completely differently.',
          },
          {
            mistake: 'Using parameter count as the sole quality ranking',
            fix: 'Data, training tokens, architecture (MoE vs dense) and post-training dominate the picture. Benchmark on your tasks at your price — treat parameters as background context only.',
          },
          {
            mistake: 'Believing "trained on the whole internet" means raw unfiltered crawl',
            fix: 'Serious corpora are deduplicated, quality-filtered, licence-aware and language-balanced. The filtering choices materially shape model behaviour — and are a competitive secret.',
          },
          {
            mistake: 'Thinking pretraining alone yields instruction-following assistants',
            fix: 'Base models continue text; they do not reliably follow instructions or refuse harm. That behaviour is installed in post-training — the next two lessons.',
          },
        ],
        exam: {
          question:
            'Explain what a large number of parameters gives a model, and why a small model with a large training corpus can outperform a larger model with less training data.',
          answer:
            'Parameters are trainable capacity — roughly how much pattern the model can store and express. All else equal, more capacity can represent more complex regularities. But capacity is only useful when filled: performance depends on capacity × training-data quality/quantity × objective × post-training. A small model trained on vastly more tokens (high tokens-per-parameter ratio) fills its capacity completely and may be near its useful ceiling, while a larger model with too little data is undertrained — much of its capacity unexploited. This is the empirical lesson of scaling laws: parameters, data and compute must grow together; imbalance wastes money. Post-training then decides how much of that bought capability becomes usable behaviour.',
          source: 'Standard scaling/efficiency question in foundation-model interviews.',
        },
        summary: [
          'Pretraining = curated corpus + next-token objective + massive compute → a base model: a broad text-continuation engine.',
          'Parameters are trained numbers = capacity; counts (8B, 70B, 120B-MoE) inform but never decide quality.',
          'Scaling laws made bigger runs predictable investments; accelerators made them affordable.',
          'Quality filtering, dedup and licensing are first-class engineering — the corpus shapes the character.',
          'Capability is bought in pretraining; it is shaped into usable assistant behaviour in post-training.',
        ],
      }),
      [
        [
          'A "base model" produced by pretraining is best described as:',
          [
            'A finished customer-support chatbot',
            'A next-token continuation engine with broad knowledge, not yet taught to converse helpfully',
            'A fine-tuned classifier',
            'A database of training documents',
          ],
          1,
          'Pretraining yields a strong continuator; instruction-following, chat format and refusal behaviour come from post-training.',
        ],
        [
          'What is a parameter in a neural network?',
          [
            'One trained number — a weight or bias — that the optimiser adjusts',
            'One training document',
            'One GPU in the cluster',
            'One token in the vocabulary',
          ],
          0,
          'Parameters are the adjustable numbers (weights/biases); "70B parameters" means seventy billion of them.',
        ],
        [
          'Why do scaling laws matter commercially?',
          [
            'They guarantee models will reach AGI',
            'They let labs forecast returns from spending more on parameters, data and compute before committing to a run',
            'They reduce electricity prices',
            'They prove bigger models never overfit',
          ],
          1,
          'Loss improves smoothly and predictably with scale — making billion-dollar training runs calculable investments rather than gambles.',
        ],
        [
          'An 8B model outperforms a 70B model on a benchmark. Which explanation is LEAST defensible?',
          [
            'The 8B model received better training data and more tokens per parameter',
            'The 8B model received stronger post-training for the task',
            'Higher parameter counts always mean better answers, so the benchmark must be wrong',
            'The 70B model was undertrained relative to its capacity',
          ],
          2,
            'Parameter count alone decides nothing — data, training budget and post-training routinely invert the naive ranking.',
        ],
      ]
    ),
    lesson(
      M5,
      'lit-5-2',
      2,
      'Supervised Fine-Tuning: Teaching the Base Model to Be an Assistant',
      'How curated demonstrations turn a raw continuation engine into something that answers, follows instructions and refuses — plus how that differs from the pretraining you just paid for.',
      15,
      nineBlocks({
        objectives: [
          'Describe the supervised fine-tuning (SFT) stage and its training data format',
          'Explain why SFT needs thousands to millions of examples, not billions',
          'Distinguish SFT from pretraining in objective, data, cost and purpose',
          'Recognise how SFT choices shape a model\'s style and refusal behaviour',
        ],
        hook:
          'Hand a fresh base model a question — "what is photosynthesis?" — and it may respond with three more questions about photosynthesis, a textbook paragraph, and the beginning of a Wikipedia citation. Now try a chat assistant. The difference you feel was not discovered; it was taught, in a stage called supervised fine-tuning, using hundreds of thousands of carefully written (and AI-assisted) example conversations. The knowledge was already there. The manners had to be installed.',
        concept: `**What SFT is.** Supervised fine-tuning continues training the pretrained weights on a much smaller, much higher-quality dataset of **demonstrations**: prompt → ideal response pairs written or curated by humans (often with strong model assistance and heavy human review). The objective is still next-token prediction — nothing exotic — but the *data* changes character completely: instead of raw internet text, the corpus is structured chat-style examples covering instruction-following, question-answering, reasoning formats, coding workflows, tone, and **refusals** (turning down harmful requests politely and answering the legitimate part when possible). Format matters too: models are trained on the exact chat template of their target product — system/assistant/user role markers, tool-call syntax — so SFT simultaneously teaches content behaviour and the wire format of conversation. Mechanically it is the Module 3 loop on a curated set; practically it is where a "completion engine" becomes an "assistant".

**Data format, concretely.** An SFT example looks like this, conceptually: system message ("You are a helpful tutor; be concise; never invent citations"), user message ("explain inheritance in Python with an example"), assistant message (a well-structured, correct explanation). Your prompt library experiences at inference time the *style contract* SFT established at training time. SFT datasets also include multi-turn conversations (teaching context handling), tool-use traces (teaching function-calling formats), long-form reasoning demonstrations, multilingual examples, and deliberately constructed preference-shaping cases. Quality control is intense: fact-checking, rubric-based review, deduplication, style normalisation. The industry mantra — **quality over quantity** — is not marketing: a curated 50k–2M example set routinely transforms a model more than billions of messy tokens would, because the signal per example is enormously denser than in raw web text.

**How SFT differs from pretraining (the comparison that makes it click).**

- *Data*: trillions of raw tokens vs thousands-to-millions of curated demonstrations. SFT examples are often partially generated by strong models and then human-curated — a legitimate, disclosed-in-literature practice, because humans can audit and correct assistant output faster than they compose it from nothing.
- *Objective*: both use next-token prediction, but SFT computes loss (and gradients) primarily over the *assistant* portion of the conversation — the model is graded on producing good responses, not on predicting the user\'s words.
- *Compute*: pretraining consumes the lion\'s share of the budget; SFT typically runs on a modest fraction — hours to days, not months — making iteration on SFT data one of the highest-leverage activities in the whole pipeline.
- *Purpose*: pretraining buys capability; SFT shapes it into a usable interface — and sets much of the model\'s personality: verbosity, formatting habits, citation behaviour, refusal thresholds, language mixing.

**What SFT does not fix.** SFT teaches *one* ideal response per prompt, so it installs a particular style but cannot finely rank multiple acceptable styles against each other — a limitation the next stage (RLHF/alignment) exists to address. SFT also cannot add knowledge the base model lacks (it can teach *format* "answer with citations"; it cannot make the model know a fact it never absorbed) and risks **alignment tax** (excessive refusal, over-safety, sycophancy when demonstrations are one-dimensionally tuned) and **catastrophic forgetting** (heavy tuning on narrow data erodes broad pretraining abilities — mitigated by small learning rates, mixing in pretraining-style data, and careful evaluation). Teams therefore treat SFT as the first, coarse shaping pass: teach the format and baseline helpfulness in one sweep, then refine with preference-based training and evaluate relentlessly. The base-model-vs-SFT distinction also explains product strategy: labs release a base model for researchers to tune their own ways, while shipping an SFT(+aligned) model for the public chat product — one capability engine, many possible personalities.`,
        extras: [
          table(
            'Pretraining vs SFT at a glance',
            ['Dimension', 'Pretraining', 'Supervised fine-tuning'],
            [
              ['Data', 'Trillions of raw tokens (web, books, code)', 'Thousands–millions of curated demonstrations'],
              ['Objective', 'Next-token over everything', 'Next-token weighted on assistant turns'],
              ['Cost', 'Dominant (weeks–months, big clusters)', 'Small fraction (hours–days)'],
              ['Installs', 'Broad capability & knowledge', 'Format, manners, instructions, baseline refusals'],
              ['Iteration', 'Extremely slow/expensive', 'Relatively fast — data iteration is the lever'],
            ],
          ),
          tip(
            'SFT explains your prompt library\'s shape',
            'Why do assistants love headings, numbered steps and "Sure! Here\'s"? Because that is what their SFT demonstrations looked like. Recognising the SFT imprint helps you write prompts that ride with the model\'s trained style instead of fighting it (Module 6).',
          ),
          warn(
            '"Fine-tuning" is used for two different jobs',
            'People also use "fine-tuning" for adapting a model to your domain (customer support docs, a house style). That is *your* fine-tuning of an already-SFT\'d model. Same technique, different position in the pipeline — clarify which one a vendor means when they sell "fine-tuning".',
          ),
        ],
        worked: {
          title: 'Design an SFT set for a campus tutor bot',
          problem:
            'Your team has a pretrained base model and wants a tutor that explains concepts stepwise, refuses to do graded homework outright, and asks a guiding question instead. Sketch the SFT dataset: size range, example formats, and two evaluation checks before release.',
          steps: [
            {
              title: 'Size and sourcing',
              desc: 'Aim for tens of thousands of high-quality examples (a focused start; expand by gaps). Source: teachers and TAs write gold answers; strong models draft candidates; reviewers edit to the rubric. Dedup aggressively.',
            },
            {
              title: 'Cover the contract',
              desc: 'Each behaviour needs explicit demonstrations: stepwise explanations with checks ("so, which force dominates?"); refusal-then-guidance examples ("I can\'t submit your graded answer, but here\'s how to approach it…"); multi-turn follow-ups; edge cases (ambiguous questions, out-of-scope requests).',
              code_snippet: 'system: You are a patient tutor...\nuser: Just give me the answer to Q4\nassistant: I won\'t hand you the graded answer — let\'s break it down: what\'s given, what\'s asked?',
            },
            {
              title: 'Format fidelity',
              desc: 'Train on the exact chat template the product will use, including system-prompt placement. Mismatched templates at inference are a classic source of degraded behaviour after a successful-looking training run.',
            },
            {
              title: 'Evaluation before release',
              desc: '(1) Held-out rubric eval: blind human grading of answers on correctness, stepwise clarity, refusal appropriateness. (2) Regression suite: does the model still do general tasks it did pre-SFT (writing, summarising, other languages)? Catch forgetting before users do.',
            },
          ],
          solution:
            'A curated 10k–100k-example set covering explanation style, guided refusals, multi-turn behaviour and the production chat template — then two gates: held-out rubric grading for the new behaviours, and a regression suite for pre-existing ones. SFT success is measured in behaviour deltas on both sides, not in training loss alone.',
        },
        practice: {
          title: 'Write three SFT examples by hand',
          prompt:
            'Draft (prompt, ideal-assistant-response) pairs for a hypothetical "study planner" assistant: one ordinary request, one request that should get a refusal-plus-alternative, and one ambiguous request where the ideal response asks a clarifying question. Keep each response under 120 words. Notice how much design work lives in the responses you choose to demonstrate.',
          hint: 'The refusal example is the most important: what exactly do you refuse, what do you still help with, and in what tone? SFT examples ARE the policy.',
        },
        mistakes: [
          {
            mistake: 'Assuming SFT adds large amounts of new factual knowledge',
            fix: 'SFT teaches behaviour and format; knowledge comes from pretraining. Teaching a model to cite properly is SFT; teaching it a fact it never absorbed needs the fact in context (retrieval) or in continued pretraining.',
          },
          {
            mistake: 'Expecting SFT data volumes comparable to pretraining',
            fix: 'Orders of magnitude differ: curated demonstrations in the thousands-to-millions, not trillions. Density of signal per token is what SFT buys with quality.',
          },
          {
            mistake: 'Ignoring catastrophic forgetting during aggressive tuning',
            fix: 'Narrow heavy tuning erodes general ability. Use small learning rates, mixed data, and regression evals on old capabilities every round.',
          },
          {
            mistake: 'Treating "the model refused me" as pure alignment-stage behaviour',
            fix: 'Refusal styles are substantially installed during SFT demonstrations, then refined by preference training. To change refusal behaviour, inspect the demonstration data first.',
          },
        ],
        exam: {
          question:
            'Why is supervised fine-tuning called "supervised" when it follows a self-supervised pretraining stage, and what is the practical significance of computing loss mainly on assistant turns?',
          answer:
            'It is "supervised" because the training pairs contain explicit target outputs — human-curated demonstrations of the desired response for a given prompt — i.e. labels of the right answer, in the classic sense. Pretraining\'s "self-supervised" labels (the next token) came free from raw text; SFT\'s right answers were deliberately produced. Computing loss mainly on assistant turns means gradients optimise response quality rather than the model\'s ability to predict user messages (which it already does fine from pretraining) — the training budget is spent exactly where behaviour needs to change. Practically this keeps SFT focused: style, correctness and policy of replies improve, while user-turn modelling is left alone.',
          source: 'Common conceptual exam question in applied LLM courses.',
        },
        summary: [
          'SFT = continued training on curated prompt→response demonstrations; still next-token prediction, new data contract.',
          'It installs conversation format, instruction-following, style, and baseline refusals — the assistant personality.',
          'Thousands to millions of high-quality examples transform behaviour; quality dominates quantity.',
          'SFT cannot add missing knowledge and can erode broad ability — regression testing matters.',
          'The base model is the capability engine; SFT is the first and coarsest act of shaping it.',
        ],
      }),
      [
        [
          'The main purpose of supervised fine-tuning (SFT) is to:',
          [
            'Teach the model entirely new factual knowledge',
            'Turn a text-continuation base model into an instruction-following, chat-format assistant',
            'Compress the model for mobile deployment',
            'Measure the model\'s benchmark scores',
          ],
          1,
          'SFT installs behaviour and format from curated demonstrations; factual breadth comes from pretraining.',
        ],
        [
          'SFT training examples are typically:',
          [
            'Trillions of raw web pages',
            'Thousands to millions of curated prompt–response demonstrations',
            'Random sentences with no structure',
            'Only human-written with zero model involvement',
          ],
          1,
          'Curated, rubric-checked demonstrations — often model-drafted and human-reviewed — at a tiny fraction of pretraining volume.',
        ],
        [
          'During SFT, loss is usually computed primarily over:',
          [
            'The user\'s messages',
            'The assistant\'s response tokens',
            'The system prompt only',
            'All tokens with equal emphasis',
          ],
          1,
          'Gradients target where behaviour must change — producing good replies — not on predicting user turns the model already handles.',
        ],
        [
          'A model starts refusing benign questions after heavy SFT on refusal-heavy data. This is an example of:',
          ['Catastrophic forgetting', 'Over-refusal / alignment tax from demonstration choices', 'Tokenizer failure', 'Context-window overflow'],
          1,
          'SFT demonstrations define refusal policy; over-weighting them produces over-refusal — tune the data, then verify with behavioural evals.',
        ],
      ]
    ),
    lesson(
      M5,
      'lit-5-3',
      3,
      'RLHF and Alignment: Teaching a Model What "Good" Looks Like',
      'Preference data, reward models and the fine-tuning loop that shapes helpfulness and harmlessness — explained plainly, with the tradeoffs and failure modes laid out.',
      16,
      nineBlocks({
        objectives: [
          'Explain the RLHF pipeline: preference collection → reward model → optimisation',
          'Describe why preferences are collected in pairs and what a reward model captures',
          'State what RLHF buys over SFT and what risks (alignment tax, reward hacking) it introduces',
          'Recognise DPO-style methods as related alternatives at a high level',
        ],
        hook:
          'Ask two different assistants the same ambiguous question and the gap between them rarely comes from different knowledge — it comes from different *tastes*. One is crisp and cautious; another is warm and exhaustive. Those tastes were manufactured: someone decided that answer X beats answer Y, tens of thousands of times, and an optimiser encoded the preferences into weights. Alignment is engineering a taste, and like any taste-driven process, it can be overdone.',
        concept: `**The gap RLHF fills.** SFT shows the model one good response per prompt. But real quality is a *ranking*: for one prompt, five answers are all acceptable, and users (or experts) clearly prefer some over others — tone, depth, caution, format. You could try to write all of that into ever-larger SFT datasets, but pairwise judgements are far easier for humans to make consistently than absolute specifications of "the perfect answer". **Reinforcement learning from human feedback (RLHF)** operationalises exactly this: humans compare answers; the comparisons train a proxy scorer; the model is then optimised against that proxy. The name is accurate — it is genuine reinforcement learning: the model takes actions (generates responses), and the reward (from the learned scorer) is a scalar feedback signal.

**The three-stage pipeline.** 1) **Collect preferences:** sample several responses to a prompt (from the current model), have human raters pick the better one (often with guidelines and ties allowed), producing thousands-to-millions of pairwise comparisons. 2) **Train a reward model (RM):** a separate network is trained so that its score is higher for the human-preferred response than the dispreferred one on each pair — distilling noisy human taste into a smooth, cheap-to-query function. (Two responses, one preference per pair: that is the supervision.) 3) **Optimise the policy:** the assistant model is trained with RL — classically PPO, which balances raising the reward-model score against straying too far from the SFT model (a KL penalty keeps it from gaming the scorer into gibberish). Result: the model drifts toward outputs the reward model scores like human raters would — better adherence to nuanced preferences than SFT alone delivered. Note honestly: RLHF needs RL machinery only in the classical form; several modern methods sidestep explicit reward models — **DPO** (direct preference optimisation) and relatives update the model straight from preference pairs with a simpler objective, no separate RM or RL loop — the field is actively consolidating around what works with the least instability.

**What alignment buys, concretely.** Sharper helpfulness under ambiguity (asking the *right* clarifying question instead of dumping an essay); calibrated tone and length; more consistent refusal of genuinely harmful requests with graceful partial help on legitimate ones; reduced sycophancy and rambling; better adherence to system-prompt policies. These are exactly the qualities users rate in preference tests, which is why aligned models feel "nicer" than raw SFT outputs from the same base.

**The risks, equally concretely.** (1) **Alignment tax:** safety and helpfulness tuning can blunt capability — over-refusal, excessive hedging, dulled edge-case problem-solving; labs balance this explicitly and accept some tax for some uses. (2) **Reward hacking:** optimisers exploit reward-model flaws — producing text that *sounds* like rated-good answers (hedges, confident structure, flattering agreement) without the substance; the proxy diverges from true quality under pressure. (3) **Taste monoculture:** preference data comes from raters with guidelines and demographics; the model\'s "personality" encodes those choices and their blind spots. (4) **Over-optimisation:** pushing reward-model score too far degrades real quality while the metric keeps rising — the classic proxy-metric curve. Every one of these is the Module 2.4 story — optimise the metric you chose — reappearing at civilisational scale. Mitigations in practice: held-out human evals against the RM score, red-teaming, diversity in rater pools, regularisation toward the SFT model, and iterative cycles (new model → new preference data → new RM) rather than a single long optimisation push.

**Where this sits in your mental model.** Pretraining buys capability. SFT installs interface and baseline policy. RLHF/alignment tunes the fine grain of taste and safety. None of it installs truth-seeking; grounded accuracy still comes from data, retrieval and tools. When you feel an assistant\'s "judgement" improving through an update, you are usually feeling a new alignment run — and when a change makes it worse, you are usually feeling an alignment tax or a drifted reward proxy. Knowing the machinery converts both reactions into useful feedback.`,
        extras: [
          table(
            'The RLHF pipeline',
            ['Stage', 'Input', 'Output', 'Human involvement'],
            [
              ['Preference collection', 'Prompt + sampled responses', 'Pairwise "A better than B" judgements', 'Raters compare and choose'],
              ['Reward model training', 'Judgements', 'A network scoring responses', 'None at this step (learning from labels)'],
              ['Policy optimisation', 'Current model + RM scores', 'Updated model, better RM-scored outputs', 'None at this step (RL loop)'],
              ['Evaluation', 'Finished model', 'Quality/safety report', 'Held-out human evals and red teams'],
            ],
          ),
          info(
            'DPO and friends, in one sentence',
            'Direct preference optimisation (and similar methods) skip the separate reward model and RL loop, optimising the model directly on preference pairs with a stability-friendly objective — same goal (align to preferences), less machinery. When vendors say "preference tuning", ask which family they mean.',
          ),
          tip(
            'Alignment explains "the model changed"',
            'If an update made an assistant more careful, wordier or more refusal-prone, suspect a new preference-tuning round — not new knowledge. Feedback channels ("this answer was unhelpful") are preference data: your ratings literally shape the next alignment run.',
          ),
          warn(
            'Do not confuse alignment with truthfulness',
            'A highly aligned model is tuned for what humans rate as helpful and safe. It can still be confidently wrong — and a rewarded style of confident-sounding answer can even *mask* errors better. Alignment shapes taste; grounding supplies facts.',
          ),
        ],
        worked: {
          title: 'Diagnose a reward-hacking failure',
          problem:
            'After an RLHF run, a model\'s reward-model scores rose 18%, but human raters on a held-out set reported the answers "more structured yet less accurate". Categorise the failure, explain the mechanism, and propose two concrete corrections.',
          steps: [
            {
              title: 'Name the pattern',
              desc: 'Metric up, true quality down — classic proxy divergence, i.e. reward hacking plus over-optimisation. The reward model rewarded surface correlates of good answers (headers, confident framing, thorough-looking lists) that the optimiser then produced without the underlying correctness.',
            },
            {
              title: 'Mechanism check',
              desc: 'RM was trained on earlier preferences where structure correlated with accuracy; under strong optimisation, the model exploits structure-without-accuracy because it is cheaper than getting facts right. The KL/regularisation term (or its equivalent) was too weak to prevent drift.',
            },
            {
              title: 'Correction 1 — better reward signal',
              desc: 'Retrain/augment the RM with fresh preference data where factual accuracy is explicitly the tiebreaker (raters verify claims), and include hard negatives that are well-structured but wrong — so structure alone stops paying.',
            },
            {
              title: 'Correction 2 — stronger evaluation and constraint',
              desc: 'Gate optimisation against held-out human evals and factual probes (stop when human scores fall, regardless of RM score); strengthen the constraint toward the SFT model; consider length/style controls so verbosity is not implicitly rewarded.',
            },
          ],
          solution:
            'Reward-model exploitation under over-optimisation: the proxy\'s correlates were optimised instead of quality. Fix by hardening the reward signal with accuracy-focused, contrast-rich preference data, and by gating the RL loop with held-out human/factual evals plus stronger anchoring to the SFT model. The Module 2 lesson — you get the metric you choose — recurring as alignment practice.',
        },
        practice: {
          title: 'Collect a mini preference set',
          prompt:
            'Take one prompt and generate two answers (different assistants, or two runs at different settings). Write the pair as an RLHF preference record: which is better overall, then three one-line reasons (accuracy, helpfulness, safety/tone). Note which single criterion would flip your choice — and why that criterion is the hardest to scale in rater pools.',
          hint: 'Accuracy is hardest: raters must verify claims; style cues are instantly judgeable — which is exactly why reward models lean toward style.',
        },
        mistakes: [
          {
            mistake: 'Assuming RLHF gives the model new knowledge',
            fix: 'RLHF re-weights how existing capability is expressed — taste, caution, format. Factual gaps remain; they need data, retrieval or tools.',
          },
          {
            mistake: 'Thinking "aligned" means "safe and correct by construction"',
            fix: 'Alignment optimises learned proxies of human preference. It reduces some harms, introduces over-refusal and reward-hacking risks, and says nothing direct about truth.',
          },
          {
            mistake: 'Believing reward-model scores measure real quality',
            fix: 'They measure resemblance to what raters preferred. Always keep a held-out human evaluation — the RM is a trainable model with all the usual failure modes.',
          },
          {
            mistake: 'Assuming preference data is objective ground truth',
            fix: 'It is aggregated human judgement under guidelines — culturally and individually situated. Rater diversity, tie handling and rubric design materially shape the resulting model personality.',
          },
        ],
        exam: {
          question:
            'Walk through the RLHF pipeline and explain why a reward model is used instead of rewarding the policy directly from human ratings during training.',
          answer:
            'Pipeline: (1) collect pairwise human preferences among sampled responses; (2) train a reward model to score responses in agreement with those preferences; (3) optimise the policy (classically PPO) to maximise reward-model score while staying close to the SFT model. A reward model is needed because human raters are slow, expensive and inconsistent — unusable as a per-step training signal inside a loop needing millions of evaluations. The RM distils judgements into a fast, differentiable, scalable scorer, enabling continuous optimisation. The cost of this indirection is proxy risk: the policy optimises the RM\'s opinion, which can diverge from human judgement under pressure — hence held-out human evaluation and regularisation are mandatory, not optional.',
          source: 'Standard alignment-pipeline question in LLM interviews and safety courses.',
        },
        summary: [
          'RLHF = pairwise human preferences → reward model → policy optimisation (or DPO-style direct preference tuning).',
          'Preferences rank alternatives — cheaper and more consistent for humans than specifying perfection.',
          'It buys nuanced helpfulness and calibrated refusal — taste — not knowledge and not truth.',
          'Risks: over-refusal (alignment tax), reward hacking, taste monoculture, proxy over-optimisation.',
          'Pretraining buys capability; SFT installs manners; alignment tunes judgement — and evaluation keeps all three honest.',
        ],
      }),
      [
        [
          'In RLHF, human raters typically provide supervision by:',
          [
            'Writing a perfect response for every prompt from scratch',
          'Choosing which of two sampled responses is better',
            'Labelling every token as good or bad',
            'Coding a rule database of preferences',
          ],
          1,
          'Pairwise comparisons are what humans do reliably; each judgement also needs only one line, making scale feasible.',
        ],
        [
          'The reward model\'s job is to:',
          [
            'Generate the final user-facing answer',
            'Score responses so the policy can be optimised without live human input in the loop',
            'Tokenize the training corpus',
            'Store the chat history',
          ],
          1,
          'It distils human preference judgements into a fast, scalable scorer for the optimisation loop.',
        ],
        [
          '"Reward hacking" in RLHF means:',
          [
            'Attackers stealing the reward model',
            'The policy exploiting weaknesses of the reward proxy — improving its score without improving real quality',
            'Human raters being paid too little',
            'GPU overclocking during training',
          ],
          1,
          'Classic proxy optimisation: the metric rises while true quality stalls or falls — structure without substance is a common form.',
        ],
        [
          'A model refuses correct answers to borderline-safe questions after a preference-tuning round. This is best described as:',
          ['Hallucination', 'Alignment tax / over-refusal', 'Token limit exhaustion', 'Catastrophic forgetting of tokenization'],
          1,
          'Over-refusal is the classic cost of safety-skewed preference data — the tradeoff labs manage with targeted demonstrations and evals.',
        ],
      ]
    ),
    lesson(
      M5,
      'lit-5-4',
      4,
      'Model Families, Sizes and Token Economics: Choosing and Paying for Models',
      'Open vs closed weights, small vs large models, and the cost/speed arithmetic of tokens — the buying literacy every AI practitioner needs.',
      15,
      nineBlocks({
        objectives: [
          'Compare open-weight and closed models on control, cost, and operational burden',
          'Apply a small-vs-large routing logic to a concrete use case',
          'Estimate an API bill from token volumes and per-token prices',
          'Explain why output tokens and sequential decoding drive latency',
        ],
        hook:
          'A team once spent weeks debating which frontier model to use for a task where a fine-tuned 8B model at one-fiftieth the price matched quality — because nobody had computed the actual bill. Token economics is unglamorous and decisive: at scale, the difference between models is often not intelligence but arithmetic. Who computes the arithmetic first, ships first.',
        concept: `**Open weights vs closed (proprietary).** **Open-weight models** let you download the weights (common licences: Apache/MIT-style, some with restrictions) and run them on your own infrastructure or any host. What you gain: full control (data never leaves your boundary — decisive for healthcare, finance, government), freedom to fine-tune deeply, cost predictability once hardware is amortised, and insulation from vendor pricing/API changes. What you accept: the operational burden of serving (GPU capacity, quantisation choices, inference engines like vLLM-style stacks), your own security and updates, and — depending on the release — a capability gap versus the very largest proprietary systems. **Closed models** are accessible only through an API or app: you gain frontier capability with zero infrastructure, automatic improvements, managed scaling, and built-in safety layers; you give up control of data paths, become dependent on pricing, availability and policy changes, cannot deeply modify weights, and face compliance conversations about where prompts travel. Nuance worth carrying: "open" has degrees — weights-open but data/code closed happens, licence terms vary widely, and open releases often lag their newest proprietary siblings by a generation. The honest framing: **open = control and economics; closed = capability and convenience** — and most serious organisations deliberately run both (a router in front of each).

**Small vs large, and routing.** Model size still correlates with capability on hard reasoning — but the correlation is much weaker than marketing suggests, and task-appropriateness dominates. Small models (single-digit to low tens of billions) excel at: classification, extraction, rewriting, summarisation of clean inputs, simple code tasks, high-volume workloads — with lower latency and cost, and easier on-device or private deployment. Large models earn their keep on: multi-step reasoning, long-context synthesis, difficult code architecture, nuanced writing with constraints, and ambiguous instructions. The modern professional pattern is **routing**: cheap fast models for the bulk of traffic, escalation to large models only for hard cases (and sometimes a large model to *judge* small-model outputs). This single pattern is the difference between an AI feature that is viable and one that is not — because the cost curve is not linear in user delight.

**Token economics: the actual arithmetic.** Pricing is per million tokens, split input/output (output typically 2–5× input price). Your bill = input tokens × input rate + output tokens × output rate, summed over calls. Three levers: (1) *volume control* — trim contexts, cache repeated prefixes (many providers discount cached tokens heavily), avoid re-sending whole histories when a summary suffices; (2) *rate control* — choose a model whose price matches the task (routing), batch non-urgent workloads where providers discount them; (3) *output control* — output tokens are expensive and slower; ask for concise formats, cap max output tokens, and beware models that pad. Worked instinct: a support bot handling 50,000 conversations/day with ~2,000 input + ~500 output tokens each = 100M input + 25M output tokens/day. At hypothetical rates of \$0.40/M input and \$1.60/M output: 100M×\$0.40/M = \$40/day input, 25M×\$1.60/M = \$40/day output — about \$80/day, ~\$2,400/month, *before* caching discounts. Do this arithmetic before promising features; it routinely reshapes product scope.

**Speed: why output is the bottleneck.** Input processing is largely parallel across the sequence — fast, GPU-efficient. Output generation is *autoregressive*: one token at a time, each requiring a full forward pass (Module 4). Hence the two speed facts every builder internalises: latency scales with output length, not input length; and **tokens per second** (output throughput) is the metric that decides feel — streaming masks time-to-first-token but not total time for long answers. Cache reuse (skipping recomputation of repeated prompt prefixes), batch inference, and hardware all move this number, but the shape of the constraint is architectural: you cannot compute the sentence\'s end before its beginning exists. Combine the lessons of this module and you have the buyer\'s checklist: capability benchmarks on *your* data → deployment model (open/closed) → size tier → price per token × your volume → latency at your output lengths. Most "which model?" debates are actually arguments about these numbers wearing philosophy as a costume.`,
        extras: [
          table(
            'Open vs closed: the decision grid',
            ['Question', 'Leans open-weight', 'Leans closed API'],
            [
              ['Can data leave your network?', 'No → open/self-host', 'Yes with DPA → either'],
              ['Need the absolute frontier capability now?', 'Often lags newest release', 'Yes'],
              ['Fine-tune deeply / own the stack?', 'Yes', 'Limited to offered options'],
              ['Team ready to run inference infra?', 'Required', 'Not needed'],
              ['Traffic volume & predictability', 'High, steady → economics favour open', 'Spiky/uncertain → pay-as-you-go'],
            ],
          ),
          code(
            `# Bill estimator — pure arithmetic, adapt the rates
input_tokens_per_day = 50000 * 2000      # conversations x avg prompt
output_tokens_per_day = 50000 * 500      # conversations x avg reply
input_rate = 0.40    # $ per 1M input tokens (hypothetical)
output_rate = 1.60   # $ per 1M output tokens (hypothetical)

daily = input_tokens_per_day/1e6*input_rate + output_tokens_per_day/1e6*output_rate
print(daily)            # ~80.0 $/day
print(daily * 30)       # ~2400 $/month
# Then ask: caching, batching, smaller-model routing — where does it drop?`,
            'estimate_bill.py',
            'python',
          ),
          tip(
            'The router question first',
            'Before debating model A vs model B, ask: "what fraction of our traffic actually needs frontier reasoning?" Teams routinely find 60–80% of calls are classify/extract/format tasks a small model handles — the model debate only matters for the remainder.',
          ),
          warn(
            'Never quote a cost without volume assumptions',
            '"This model costs ₹x per million tokens" means nothing until multiplied by your real traffic — and traffic grows with success. Re-run the arithmetic quarterly; price changes and usage growth compound.',
          ),
        ],
        worked: {
          title: 'Pick a deployment strategy for a hospital summariser',
          problem:
            'A hospital wants discharge-letter summarisation: 400 letters/day, ~3,000 input tokens each, ~600 output tokens, and strict rules that patient data cannot leave the premises. Compare (A) a closed frontier API, (B) self-hosting an open-weight 14B model — qualitatively plus the cost logic.',
          steps: [
            {
              title: 'Constraint first',
              desc: 'The data rule is a hard gate. If policy forbids egress and no compliant private-endpoint contract exists, option A is out regardless of capability — control beats benchmarks here.',
            },
            {
              title: 'Capability check',
              desc: 'Summarisation of structured clinical letters is a well-defined, in-distribution task — a strong open 14B model with domain examples (SFT/adapters) is plausibly sufficient; validate on a held-out set with clinician review of accuracy and hallucinated details.',
            },
            {
              title: 'Cost logic',
              desc: 'Closed API: 400×3,000 = 1.2M input + 400×600 ≈ 0.24M output tokens/day — the arithmetic from the concept applies directly. Self-host: one GPU serving this volume comfortably amortises to a fixed monthly cost independent of token count — cheaper at steady volume, but you pay in ops (deployment, monitoring, upgrades).',
            },
            {
              title: 'Decision + guardrails',
              desc: 'Go self-hosted open model if internal ML ops capacity exists; else renegotiate data terms with a provider offering a no-retention private tier. Either way: clinician sign-off remains in the loop — summarisation errors here are safety events, not UX nits.',
            },
          ],
          solution:
            'Hard constraints (data egress) decide the category; capability validation on real letters decides the model; token arithmetic vs GPU amortisation decides the economics. This is the full checklist working in order — benchmark-only debates skip the two questions that mattered most.',
        },
        practice: {
          title: 'Price your own use case',
          prompt:
            'Take one AI feature you actually use or want: estimate monthly volume (calls/day × prompt tokens × reply tokens). Find a real provider\'s published per-million rates and compute the monthly bill with a small calculator or script. Then list three specific changes (model swap, caching, shorter outputs, batching) that would cut it, with rough percentages.',
          hint: 'Output tokens usually dominate surprises: halving reply length is often the single biggest saving — and often improves UX too.',
        },
        mistakes: [
          {
            mistake: 'Treating open weights as automatically free',
            fix: 'Hardware, inference engineering, uptime and staff time are real costs. "Free to download" != "free to operate" — compare total cost of ownership against API bills at your volume.',
          },
          {
            mistake: 'Defaulting to the largest model for every call',
            fix: 'Classification and extraction rarely need frontier reasoning. Route by task difficulty; escalate only the hard tail. This is the highest-leverage cost decision in applied LLM work.',
          },
          {
            mistake: 'Estimating bills with word counts or vibes',
            fix: 'Compute in tokens: volume × rates, input and output separately. The formula is a minute of arithmetic; wrong guesses have historically shipped features nobody can afford.',
          },
          {
            mistake: 'Judging latency only by time-to-first-token',
            fix: 'Streaming makes starts feel instant, but total time scales with output length (sequential decoding). Cap outputs and prefer concise formats when responsiveness matters.',
          },
        ],
        exam: {
          question:
            'A startup is choosing between a closed frontier API and self-hosting an open-weight model. Outline four decision factors and explain why output tokens disproportionately affect both cost and latency.',
          answer:
            'Four factors: (1) data governance/compliance — can data leave the boundary, and under what terms; (2) capability fit — measured on their own tasks, including any gap between the open release and the newest closed model; (3) economics at their volume — API per-token bills vs GPU/ops total cost of ownership, including growth projections; (4) operational capacity — staff, inference stack, updates, monitoring for self-hosting versus zero-ops for API. Output tokens dominate cost because output rates are typically several times input rates, and dominate latency because decoding is autoregressive: each output token requires its own forward pass, so generation time grows linearly with output length while input processing is parallel. Hence: cap and compress outputs, and price both dimensions separately.',
          source: 'Standard build-vs-buy question in applied-LLM product interviews.',
        },
        summary: [
          'Open weights buy control and predictable economics; closed APIs buy frontier capability with zero infrastructure.',
          'Small models handle high-volume, well-defined tasks; large models earn the hard reasoning — route between them.',
          'The bill is arithmetic: (input tokens × input rate) + (output tokens × output rate), over your real volume.',
          'Output costs more and generates sequentially — output length drives both the invoice and the stopwatch.',
          'Decide in order: constraints → measured capability → size tier → price × volume → latency.',
        ],
      }),
      [
        [
          'The main advantage of an open-weight model for a hospital processing patient records is:',
          [
            'Always higher benchmark scores',
            'Full control: data can be processed inside the organisation\'s own boundary',
            'No need for any evaluation',
            'Faster internet access',
          ],
          1,
          'Data governance decides the category: self-hosting keeps sensitive data in-house — often the gating requirement before capability is even discussed.',
        ],
        [
          'A high-volume task like extracting fields from support tickets is MOST suited to:',
          [
            'The largest frontier model available, always',
            'A small, fast, inexpensive model — with escalation only for hard cases',
            'No model — only hand-written rules',
            'The slowest model, for accuracy',
          ],
          1,
          'Well-defined, repetitive tasks rarely need frontier reasoning; routing bulk traffic to small models is the decisive cost/latency lever.',
        ],
        [
          'Why do output tokens usually matter more than input tokens for both cost and speed?',
          [
            'Input tokens are always free',
            'Output rates are typically higher, and output is generated sequentially — one forward pass per token',
            'Output tokens compress better',
            'Inputs are processed by a different model',
          ],
          1,
          'Pricing reflects generation cost: output per-token rates are commonly several times input rates, and autoregressive decoding makes generation inherently sequential.',
        ],
        [
          'Before debating which frontier model to buy, the FIRST question a team should ask is:',
          [
            'Which model has the newest announcement',
            'What fraction of our traffic actually requires frontier-level reasoning',
            'Which model has the most parameters',
            'Which model our competitors use',
          ],
          1,
          'Task-mix determines whether the debate even matters — most bulk traffic falls to smaller models once routing is on the table.',
        ],
      ]
    ),
  ],
};
