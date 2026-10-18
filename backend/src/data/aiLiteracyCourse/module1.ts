// Module 1 — What AI Actually Is
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info } from '../nineBlocks';
import { lesson, M1, COURSE_ID } from './helpers';

export const module1: CourseModule = {
  id: M1,
  course_id: COURSE_ID,
  title: 'Module 1 — What AI Actually Is',
  summary:
    'Clear definitions separating AI, machine learning, deep learning and data science; the history from expert systems to the generative wave; narrow vs general AI; and the AI already running in your pocket.',
  sort_order: 1,
  lessons: [
    lesson(
      M1,
      'lit-1-1',
      1,
      'Four Words People Mix Up: AI, ML, Deep Learning, Data Science',
      'What each term actually means, how the four relate as nested ideas and overlapping practices, and why getting the vocabulary right is the first real AI skill.',
      16,
      nineBlocks({
        objectives: [
          'Define artificial intelligence, machine learning, deep learning and data science in one sentence each',
          'Explain how ML is a subset of AI and deep learning a subset of ML',
          'Classify a given real-world system as rule-based AI, machine learning, or neither',
          'Tell apart a data-science project from a machine-learning project',
        ],
        hook:
          'Job postings list "AI/ML/Data Science" as if it were one skill. Interviewers ask "what is the difference between AI and deep learning?" and watch your face. In one common version of that question, candidates who cannot draw the boundary between the terms stall — not because the answer is hard, but because they never made the distinctions concrete. This lesson makes them concrete.',
        concept: `**Artificial intelligence** is the broad goal: machines that perform tasks that normally require human intelligence — understanding language, recognising faces, making decisions, planning routes. AI as a field is decades older than the machine-learning boom. Early AI systems were hand-written rules: chess programs with opening books typed in by experts, spam filters with hundreds of if-then conditions. The important thing about the definition is that it is about the *task*, not the *method*. If a system does something smart-looking, it is doing an AI task — no matter how it was built.

**Machine learning** is a *way of building* AI systems: instead of writing the rules, you show the system thousands or millions of examples and let it discover the rules itself. A hand-written spam filter says "if the email contains 'viagra', mark it spam". A machine-learned spam filter is shown 100,000 emails labelled spam and not-spam and learns the patterns that separate them — including patterns no human would have thought to write down, like combinations of words, sender reputation and timing. Arthur Samuel coined the term in 1959; the modern usage is precise: a machine-learning system improves its performance at a task as it sees more data, without being explicitly programmed rule-by-rule.

**Deep learning** is machine learning built from **neural networks** with many layers — hence "deep". A neural network is a stack of small, adjustable units loosely inspired by brain cells; each layer transforms its input into a slightly more useful representation. Early neural networks had two or three layers and could barely recognise a handwritten digit. Modern ones have hundreds of layers and power image recognition, speech assistants and every large language model. The "deep" in deep learning refers exactly and only to this layer stacking. All deep learning is machine learning; not all machine learning is deep.

**Data science** is the odd one out — it is a *practice*, not a subset. A data scientist analyses data to answer questions: how did sales change after the festival discount? Which students are at risk of dropping out? That work uses statistics, SQL, charts and sometimes machine learning, but a data-science project can be entirely prediction-free. Machine learning builds a system that makes predictions on new data; data science produces insights and decisions from data. They overlap heavily — most ML people do some data analysis, many data scientists use ML — but they are not the same job or the same thing.

Think of it as nested circles with one circle offset: AI is the largest goal; ML is the dominant modern technique inside it; deep learning is the dominant family of ML techniques inside that. Data science sits partly inside and partly outside — it shares the data work but aims at understanding rather than at building an autonomous system. When someone says "we use AI", the useful follow-up question is always: "hand-written rules, learned from data, or deep learning?" — because the answer changes everything about reliability, cost and what the system can be trusted with.`,
        extras: [
          table(
            'The four terms at a glance',
            ['Term', 'What it is', 'One-line test'],
            [
              ['Artificial intelligence', 'The goal: machines doing intelligent tasks', 'Is the task smart-looking?'],
              ['Machine learning', 'A method: learn rules from data', 'Did it learn from examples rather than hand-written rules?'],
              ['Deep learning', 'A family of ML using multi-layer neural nets', 'Is a neural network with many layers involved?'],
              ['Data science', 'A practice: extracting insights from data', 'Is the deliverable an analysis or a deployed predictor?'],
            ],
          ),
          tip(
            'Interview soundbite',
            'A clean, honest answer: "AI is the goal — intelligent behaviour in machines. Machine learning is how most of it is built today: learn from data instead of hand-written rules. Deep learning is ML with multi-layer neural networks, and it is what powers modern vision and language models. Data science overlaps all of it but aims at insights, not autonomous systems."',
          ),
          warn(
            'Do not equate AI with robots',
            'Most AI is invisible software — ranking your feed, transcribing your voice, flagging fraud. Anthromorphising AI as a robot or a brain leads to both over-trusting and under-trusting systems. Judge the mechanism, not the metaphor.',
          ),
        ],
        worked: {
          title: 'Classify five systems correctly',
          problem:
            'Classify each as classic (rule-based) AI, machine learning, deep learning, data science, or none of these: (a) a spreadsheet SUM formula, (b) an email spam filter trained on labelled emails with a shallow model, (c) ChatGPT answering a question, (d) a dashboard showing monthly churn by city, (e) a 1990s chess engine with expert-written opening rules.',
          steps: [
            {
              title: '(a) SUM formula',
              desc: 'It computes correctly but performs no task requiring intelligence — no learning, no rules approximating judgement. None of the four.',
            },
            {
              title: '(b) Spam filter, shallow model',
              desc: 'It learned from labelled emails — machine learning. No deep neural network involved, so not deep learning.',
            },
            {
              title: '(c) ChatGPT',
              desc: 'A large language model: a deep neural network trained on vast text. Deep learning, which is also ML, which is also an AI system. All three labels apply.',
            },
            {
              title: '(d) Churn dashboard',
              desc: 'Analysis of data to produce insight — data science. If it instead predicted which users will churn next month, machine learning would enter the picture too.',
            },
            {
              title: '(e) 1990s chess engine',
              desc: 'Intelligent behaviour from hand-written expert rules, not from data. Classic AI — the expert-systems lineage. AI without ML.',
            },
          ],
          solution:
            'A: none. B: machine learning. C: deep learning (and ML and AI). D: data science. E: classic rule-based AI. The key discriminator every time: were the smarts hand-written or learned from data?',
        },
        practice: {
          title: 'Audit the "AI" in your apps',
          prompt:
            'List five apps you used today that claim some form of AI. For each, write one line: rule-based, learned from data (ML), deep learning, or just statistics — and say what evidence makes you think so. You will not always know; note your confidence.',
          hint: 'Personalised feeds, voice assistants, photo search, autocorrect and fraud alerts are almost always learned; calendar reminders usually are not.',
        },
        mistakes: [
          {
            mistake: 'Using "AI" and "machine learning" interchangeably in every sentence',
            fix: 'Reserve AI for the goal or system and ML for the learn-from-data method. If a system runs on hand-written rules, "AI" is fair but "ML" is wrong.',
          },
          {
            mistake: 'Thinking deep learning means "the AI understands like a human"',
            fix: '"Deep" only describes architecture — many stacked layers. It says nothing about understanding, consciousness or general intelligence.',
          },
          {
            mistake: 'Assuming every data-science project builds an ML model',
            fix: 'Many deliverables are analyses, dashboards or reports. Prediction is one tool in the data-science kit, not the definition of the field.',
          },
          {
            mistake: 'Believing AI must involve a neural network',
            fix: 'Rule-based systems, decision trees, nearest-neighbour search and classic search algorithms are all legitimate AI. Neural networks are just the technique that won the recent decade.',
          },
        ],
        exam: {
          question:
            '"Deep learning is a subset of machine learning, which is a subset of AI." True or false, and justify with one example of AI that is not machine learning.',
          answer:
            'True — nesting holds. Example of AI that is not ML: a chess engine driven by hand-written opening books and evaluation rules, or a 1980s medical expert system whose knowledge physicians typed in. The system performs an intelligent task, but its knowledge was programmed, not learned.',
          source: 'Standard opening question in AI/DS placement interviews and university viva exams.',
        },
        summary: [
          'AI = the goal (intelligent task performance); ML = learn rules from data; deep learning = ML with multi-layer neural nets.',
          'All deep learning is ML; all ML is a way of building AI; AI itself predates ML by decades.',
          'Data science is a practice aimed at insight, overlapping ML but not contained in it.',
          'The one diagnostic question: were the smarts hand-written, or learned from examples?',
        ],
      }),
      [
        [
          'Which statement best describes the relationship between deep learning and machine learning?',
          [
            'They are independent fields that occasionally cooperate',
            'Deep learning is a subset of machine learning',
            'Machine learning is a subset of deep learning',
            'They are two names for the same technique',
          ],
          1,
          'Deep learning is the branch of ML built on multi-layer neural networks — a subset, not a sibling or a superset.',
        ],
        [
          'A hospital scores patient readmission risk with a logistic regression trained on past records. This is primarily:',
          ['Classic rule-based AI', 'Machine learning', 'Data science only, no ML', 'Deep learning'],
          1,
          'A model learned from labelled historical data is machine learning. (A data scientist may have built it, but the system itself is ML.)',
        ],
        [
          'A 1980s expert system diagnoses plant diseases from 500 if-then rules written by agronomists. The correct label is:',
          [
            'Machine learning',
            'Deep learning',
            'AI without machine learning',
            'Not AI — just automation',
          ],
          2,
          'It performs an intelligent task via hand-written rules — AI, but nothing was learned from data, so not ML.',
        ],
        [
          'Which task is LEAST likely to be a machine-learning system?',
          [
            'Transcribing your voice to text',
            'Sorting emails into spam and inbox',
            'Adding two numbers in a spreadsheet cell',
            'Ranking search results for a query',
          ],
          2,
          'Spreadsheet arithmetic is deterministic computation — no learning, no inference approximating judgement. The other three are classic learned systems.',
        ],
      ]
    ),
    lesson(
      M1,
      'lit-1-2',
      2,
      'From Expert Systems to the Generative Wave: A Short History of AI',
      'The three AI winters, why rules hit a ceiling, the statistical turn, the deep-learning breakthrough, and how we arrived at large language models.',
      18,
      nineBlocks({
        objectives: [
          'Name at least four eras of AI history in order and describe what defined each',
          'Explain why expert systems succeeded in narrow domains but failed as general intelligence',
          'Describe what changed in the 2010s that made deep learning dominate',
          'Trace the line from word statistics to today\'s generative models',
        ],
        hook:
          'In 1966, MIT\'s ELIZA fooled some users into thinking a crude chatbot understood them — the first recorded "AI hype cycle". Governments then cut funding, and the field entered its first winter. Since then AI has been declared both the future and a dead end at least four times. Knowing the pattern protects you from both the hype and the despair: every wave since has been driven by one genuine capability jump, not magic.',
        concept: `**The founding vision (1950s).** Alan Turing asked "can machines think?" and proposed his imitation test in 1950. The 1956 Dartmouth workshop, organised by John McCarthy, coined "artificial intelligence" and set the agenda: build general reasoning systems. Early optimism was enormous — researchers predicted human-level machine intelligence within a generation. They were wrong about the timeline by about seventy years and counting, but right that the problem was worth working on.

**Symbolic AI and expert systems (1960s–1980s).** The first dominant approach, sometimes called "good old-fashioned AI", represented knowledge as symbols and reasoning as manipulation of those symbols: facts plus rules. PROLOG reasoned over logical rules. In the 1970s and 1980s, **expert systems** commercialised the idea — MYCIN diagnosed blood infections, XCON configured computer orders at DEC, and companies sold "knowledge engineering" as a service: sit with a domain expert, write down their rules, ship the rules engine. It worked beautifully inside narrow, well-structured domains. It collapsed at the edges: the rules were brittle (no rule for the novel case), acquiring rules from experts did not scale, and real-world knowledge — the vast implicit common sense humans have — could not be written down. Funding collapsed. The 1970s and late 1980s were AI winters.

**The statistical turn (1990s–2000s).** AI quietly rebranded around probability. Instead of asking "what are the rules?", practitioners asked "what patterns are in the data?". Speech recognition switched to hidden Markov models; mail filters to Naive Bayes; search engines to statistical ranking. Speech recognition went from a research curiosity to a shipped product during this era. Machine learning — systems that estimate their parameters from data — became the practical default. Meanwhile AI largely left the term "AI" behind on résumés; the work was called machine learning, data mining, or NLP, and funding was steadier because the systems produced measurable value.

**The deep-learning breakthrough (2012–2017).** Three ingredients converged: GPUs that could train huge networks, datasets like ImageNet with millions of labelled images, and algorithmic tricks (ReLU activations, dropout, better optimisation) that made deep networks trainable. In 2012, AlexNet cut the ImageNet error rate dramatically versus the best hand-engineered pipelines — the moment the field pivoted. Suddenly deep learning beat decades of feature engineering in vision, then speech, then language. The recipe generalised: more data, more compute, more layers.

**Attention and the generative wave (2017–now).** The 2017 "Attention Is All You Need" paper introduced the Transformer. GPT models applied it at scale: trained on internet-scale text to predict the next token, larger models kept getting better in a smooth, predictable way (scaling laws). ChatGPT (late 2022) put the result in front of billions of people. The jump from prior chatbots was not a new kind of knowledge — it was fluency, instruction-following and breadth, produced by next-token prediction plus alignment training. Diffusion models drove a parallel revolution in images. We are now in the generative era: the same transformer recipe extends to code, video, audio and multi-modal systems.

The honest reading of this history: each era solved one hard sub-problem (search, knowledge representation, statistical pattern learning, representation learning, sequence modelling and alignment) and over-promised on the rest. The systems are real; the general intelligence is not here yet.`,
        extras: [
          table(
            'AI eras at a glance',
            ['Era', 'Core idea', 'Flagship', 'Ceiling hit'],
            [
              ['1950s–60s research', 'General reasoning by search and logic', 'Logic Theorist, SHRDLU', 'Toy worlds only'],
              ['1970s–80s expert systems', 'Hand-coded rules from experts', 'MYCIN, XCON', 'Brittle; knowledge acquisition did not scale'],
              ['1990s–2000s statistical', 'Learn probability from data', 'HMM speech, Naive Bayes spam, Google ranking', 'Shallow patterns; no representation learning'],
              ['2012–2017 deep learning', 'Multi-layer nets learn features', 'AlexNet, AlphaGo, seq2seq translation', 'Fixed-size tasks; no open-ended language'],
              ['2017–now generative', 'Transformers + scale + alignment', 'GPT family, Claude, Gemini, diffusion images', 'Hallucination, cost, narrowness of real understanding'],
            ],
          ),
          info(
            'Why "AI winter" keeps happening',
            'A winter starts when capability demos outrun what the technology can actually ship, funders notice, and money dries up. The antidote has always been the same: a measurable commercial win (expert-system configuration savings, web search ranking, AlexNet accuracy, LLM assistants). Track the shipped product, not the press release.',
          ),
          tip(
            'Use history to read today\'s news',
            'When a headline says "AI now does X", ask which era\'s pattern this is: a genuine capability jump (like ImageNet 2012) or a demo that hides brittleness (like many expert-system claims of the 1980s). The tell is whether independent people can reproduce the result on their own data.',
          ),
        ],
        worked: {
          title: 'Place five milestones on the timeline',
          problem:
            'Put these in order and say what each unlocked: (a) ChatGPT launch, (b) MYCIN, (c) AlexNet wins ImageNet, (d) Dartmouth workshop, (e) "Attention Is All You Need".',
          steps: [
            { title: '1956 — Dartmouth', desc: 'Names the field; frames AI as general reasoning. Unlocks: research identity and funding narrative.' },
            { title: '1970s — MYCIN', desc: 'Expert system diagnosing infections at ~competent-level accuracy in its narrow domain. Unlocks: commercial hope; later exposes the rule-brittleness ceiling.' },
            { title: '2012 — AlexNet', desc: 'Deep CNN crushes ImageNet benchmark with GPU training. Unlocks: industry-wide pivot to deep learning.' },
            { title: '2017 — Transformer paper', desc: 'Attention-based architecture scales cleanly for language. Unlocks: the recipe behind every modern LLM.' },
            { title: 'Late 2022 — ChatGPT', desc: 'Instruction-tuned, RLHF-aligned LLM exposed to the public. Unlocks: generative AI as a mass-market product category.' },
          ],
          solution:
            'Order: Dartmouth (1956) → MYCIN (1970s) → AlexNet (2012) → Attention paper (2017) → ChatGPT (2022). Each unlocked one thing the previous era could not do; none of them delivered the 1956 promise of general intelligence.',
        },
        practice: {
          title: 'Read an AI headline like a historian',
          prompt:
            'Find one recent AI news article. Write half a page: which era\'s pattern does it resemble (expert-system overclaim, statistical quiet win, deep-learning breakthrough, or generative hype)? What evidence would confirm or refute that reading?',
          hint: 'Look for: independent reproduction, measurable benchmarks, real users shipping real work — or vague demos, vendor-only data, and "coming soon".',
        },
        mistakes: [
          {
            mistake: 'Believing AI started with ChatGPT',
            fix: 'The field is seventy years old. ChatGPT is the most recent of at least five major waves, and its core ideas (Transformers, scaling) date to 2017 and before.',
          },
          {
            mistake: 'Concluding "expert systems failed, therefore rules are useless"',
            fix: 'Rules remain ideal for compliance, determinism and narrow well-specified domains. Modern systems mix learned components with rules and checks deliberately.',
          },
          {
            mistake: 'Thinking each era replaced the previous one entirely',
            fix: 'They layer. Search engines still use classical statistics; production systems still use decision trees and rules; deep learning sits on top of that stack.',
          },
          {
            mistake: 'Treating the 2012 deep-learning pivot as sudden luck',
            fix: 'It needed three simultaneous prerequisites — large labelled datasets, GPU compute, and training tricks. Understanding the prerequisites tells you where the next jump could come from.',
          },
        ],
        exam: {
          question:
            'What were the main reasons expert systems failed to deliver general intelligence, and how did the machine-learning approach address (or sidestep) each failure?',
          answer:
            'Failures: (1) brittleness — no rule for novel cases; (2) knowledge acquisition bottleneck — experts\' tacit knowledge could not all be written down; (3) no common sense — millions of trivial facts humans know implicitly were missing; (4) maintenance cost — rule bases grew unmanageably. ML sidesteps (1) and (2) by learning statistical regularities directly from data, including patterns experts never articulated. It does not truly solve (3) — modern models approximate common sense from data, which is why they still fail in odd edge cases — and it trades the rule-maintenance problem for a data-and-compute problem.',
          source: 'Classic graduate AI exam essay; also common in senior ML interviews.',
        },
        summary: [
          'AI began in 1956 as a quest for general reasoning; expert systems (1970s–80s) shipped narrow value on hand-written rules.',
          'Two AI winters followed overpromised capability; the field survived by pivoting to measurable, narrow wins.',
          'The 1990s–2000s statistical turn made "learn from data" the default and quietly built today\'s search and speech systems.',
          '2012 AlexNet and the 2017 Transformer set up the generative wave; ChatGPT (2022) was alignment plus scale meeting the public.',
          'History\'s lesson: genuine capability jumps are narrow and reproducible; hype is neither.',
        ],
      }),
      [
        [
          'What was the "knowledge acquisition bottleneck" of expert systems?',
          [
            'Lacking compute to run the rules',
            'The difficulty of writing down all expert knowledge, including tacit common sense',
            'Rules were too slow to evaluate',
            'Experts refused to cooperate with researchers',
          ],
          1,
          'Experts know far more than they can articulate; rule bases covered only the sliver that could be written down, leaving the system brittle outside it.',
        ],
        [
          'What three ingredients converged around 2012 to make deep learning dominant?',
          [
            'Internet search, smartphones, cloud storage',
            'GPUs, large labelled datasets, and better training techniques',
            'More rules, better experts, faster CPUs',
            'Transformers, RLHF, and tokenizers',
          ],
          1,
          'Compute (GPUs), data (ImageNet-scale datasets) and algorithms (ReLU, dropout, improved optimisation) arrived together; AlexNet proved the combination.',
        ],
        [
          'The Transformer architecture ("Attention Is All You Need") was published in:',
          ['2012', '2017', '2020', '2022'],
          1,
          '2017. GPT-style pretraining built on it starting 2018; ChatGPT reached the public in late 2022.',
        ],
        [
          'Which era best matches this description: systems that learned probability distributions from data and powered speech recognition and spam filtering before deep learning?',
          [
            'Symbolic AI era',
            'Expert-systems era',
            'Statistical machine-learning era',
            'Generative era',
          ],
          2,
          'The 1990s–2000s statistical turn: hidden Markov models, Naive Bayes, empirical risk minimisation — learning from data but without deep representation learning.',
        ],
      ]
    ),
    lesson(
      M1,
      'lit-1-3',
      3,
      'Narrow AI vs General AI: Why Today\'s AI Is Brilliant and Brittle',
      'The spectrum from narrow tools to the hypothetical general intelligence, why narrow systems can be superhuman in one box and clueless outside it, and what that means for how you should trust them.',
      15,
      nineBlocks({
        objectives: [
          'Define artificial general intelligence (AGI) and place it correctly as a research goal, not a product',
          'Give at least three concrete examples of narrow AI exceeding human performance',
          'Explain the "brittleness" of narrow AI with an out-of-distribution example',
          'Apply an appropriate trust level to a narrow AI system in a real scenario',
        ],
        hook:
          'In 2016, AlphaGo beat Lee Sedol, one of the world\'s strongest Go players, including the legendary "Move 37" no human would have played. The same general wave of technology still misreads a rotated traffic sign, invents a lawyer\'s citations, or confidently tells you a book summary for a book that does not exist. Superhuman and clueless are not contradictions once you understand what narrow means.',
        concept: `**What "narrow" means.** Every AI system shipping today is **artificial narrow intelligence (ANI)**: built for a specific task or family of tasks, in a specific context, with a specific distribution of inputs. A chess engine, a spam filter, a face unlock, a coding assistant, a medical-imaging tool — all narrow. "Narrow" is not an insult; it is the reason these systems work at all. A narrow system can be trained on the exact problem until it is better than any human at that problem: Go, protein-structure prediction, real-time traffic routing, board-game tactics. The capability is real and deep — inside the box.

**What AGI is — and is not.** Artificial general intelligence is the hypothetical system with human-like breadth: able to learn and transfer competence across virtually any intellectual task, including tasks it was never trained for, with flexible common sense and planning. No such system exists as of this writing. Debates about "have we reached AGI?" are usually debates about definitions, not demonstrations. For practical purposes, treat AGI as a research horizon, not a product you can buy, deploy, or blame.

**Why narrow AI is brittle.** A narrow system learns the *distribution* of its training data — the statistical patterns of the situations it has seen. Change the distribution and performance can collapse without warning. A stop-sign classifier trained mostly on upright signs in daylight fails on a graffiti-stickered or rotated sign. A medical model trained on scans from one hospital's machine degrades on another hospital's machine. In machine-learning language this is an **out-of-distribution** failure; in plain language, the system never learned "stop signs", it learned "the visual patterns that co-occurred with stop signs in my data". Humans generalise from thin evidence; current AI generalises only as far as its data covers.

**The capability/brittleness map.** The practical skill is to place a task on two axes: how narrow is the task, and how costly is a mistake? Low-cost, well-covered tasks (drafting an email, suggesting a route) are great uses — errors are cheap to catch. High-cost, edge-case-heavy tasks (autonomous medical dosing, unreviewed legal filings) are dangerous uses — the tail cases are exactly where narrow systems fail and where the cost lands. Notice that modern LLMs *look* general — one system writes code, poetry and recipes — but each is a pattern-completion behaviour learned from text, still brittle in exactly the narrow-AI way: confident in-distribution, unreliable when the question is odd, factual, or outside its training patterns.

**Narrow AI is also uneven.** Even inside its box, a system's skill is lumpy: superhuman on average cases, weaker on adversarial or rare ones. This is why the right posture toward narrow AI is neither awe nor dismissal but *supervised collaboration*: let it do the heavy generative or predictive work, keep a human on the verification and the edge cases, and never let it silently make the final call in a high-stakes domain you do not understand.`,
        extras: [
          table(
            'Two-axis trust check',
            ['Question', 'Low-risk answer', 'High-risk answer'],
            [
              ['How narrow is the task?', 'Well-defined, input resembles training situations', 'Open-ended, unusual, or adversarial inputs'],
              ['Cost of one wrong output', 'Embarrassing, easy to catch', 'Safety, legal, financial or reputational harm'],
              ['Your domain knowledge', 'Enough to spot an error', 'Not enough to audit the output'],
              ['Right posture', 'Use freely with light review', 'Human-in-the-loop, or do not use yet'],
            ],
          ),
          warn(
            '"Human-level at X" does not mean "general intelligence at X"',
            'A model that passes a medical exam is matching exam-question patterns; it has not demonstrated bedside judgement on rare presentations. Benchmarks measure the benchmark\'s distribution — always ask what the benchmark left out.',
          ),
          tip(
            'The brittleness checklist',
            'Before trusting a narrow system on a new job, ask: is this input like its training situations? what happens at the weird edge? who verifies? If you cannot answer, treat the output as a draft, not a decision.',
          ),
        ],
        worked: {
          title: 'Place a task and set the trust level',
          problem:
            'A campus startup wants to auto-reject rental applications using an ML model trained on historical approvals. Classify the system on the narrowness/cost axes and decide the right deployment posture.',
          steps: [
            { title: 'Narrowness check', desc: 'The model predicts one thing (approve/reject) from structured features — genuinely narrow. But the training data reflects past decisions, including any past discrimination; new applicant profiles may differ from training.' },
            { title: 'Cost check', desc: 'A wrong rejection denies someone housing — high human cost, hard to appeal if the reason is opaque.' },
            { title: 'Distribution check', desc: 'Applicants whose profiles shifted (gig income, new visa categories) are out-of-distribution; the model will still output a confident score.' },
            { title: 'Posture decision', desc: 'Not suitable for autonomous rejection. Suitable as a triage assistant: rank applications for human review, require stated reasons, audit approval rates across groups, keep appeal paths.' },
          ],
          solution:
            'Narrow + high-cost + opaque = assist, do not automate. Use the model to prioritise human review, never to issue final rejections; require human sign-off and fairness audits. The system\'s narrowness is fine — the unattended high-stakes call is the problem.',
        },
        practice: {
          title: 'Map your own AI uses',
          prompt:
            'List six ways AI touched your day (feed ranking, navigation, autocomplete, spam filtering, voice assistant, homework help…). For each: name the narrow task, estimate the cost of a wrong output (low/medium/high), and rate your current trust. Flag any where trust is high but cost is also high — that gap is where trouble lives.',
          hint: 'Trust should roughly track verification you actually do, not the average quality of past outputs.',
        },
        mistakes: [
          {
            mistake: 'Assuming a system good at task A is reliable at nearby task B',
            fix: 'Competence does not transfer implicitly. A code assistant\'s fluency says nothing about its grasp of your company\'s security rules; test the specific task.',
          },
          {
            mistake: 'Reading fluent language from an LLM as understanding',
            fix: 'Fluency is the trained behaviour; accuracy is a separate axis. Judge outputs by evidence (citations you check, code you run), never by confidence of tone.',
          },
          {
            mistake: 'Dismissing narrow AI because it is "not AGI"',
            fix: 'Narrow beats human by wide margins in many boxes, and those boxes are where the economic value is. The goal is fit-for-purpose reliability, not general intelligence.',
          },
          {
            mistake: 'Assuming past performance guarantees edge-case performance',
            fix: 'Averages hide tails. Ask explicitly: what does this system do on rare, adversarial, or shifted inputs? That is where narrow systems fail.',
          },
        ],
        exam: {
          question:
            'Explain why a self-driving system can outperform humans on highways yet still fail at unusual road configurations, using the concept of training distribution.',
          answer:
            'Highway driving is a heavily covered, structured distribution — millions of similar lane-following, car-following situations in training (real and simulated). Unusual configurations (hand-drawn temporary signs, missing markings, emergency vehicles in odd positions) are rare or absent from that distribution. The system\'s competence is pattern coverage, not road comprehension; outside covered patterns, behaviour degrades unpredictably. This is classic narrow-AI brittleness: superhuman in-distribution, unreliable out-of-distribution — hence the engineering emphasis on geofencing, fallbacks and continued human supervision.',
          source: 'Common AI-safety and autonomous-systems interview question; also appears in ethics-of-AI course exams.',
        },
        summary: [
          'Every deployed AI today is narrow: superhuman inside its trained box, unreliable outside it.',
          'AGI remains a research hypothesis, not a product — treat "AGI reached?" claims with suspicion.',
          'Brittleness = out-of-distribution failure: the system learned training-data patterns, not the underlying concept.',
          'Trust decisions need two axes: narrowness of the task and cost of a wrong output.',
          'High-stakes narrow tasks need a human in the loop, stated reasons, and audits — not full automation.',
        ],
      }),
      [
        [
          'As of today, commercial AI systems like GPT-class models, AlphaFold and face unlock are best classified as:',
          [
            'Artificial general intelligence',
            'Artificial narrow intelligence',
            'Early forms of consciousness',
            'Rule-based expert systems',
          ],
          1,
          'Each performs a specific family of tasks learned from data — narrow intelligence. None demonstrates flexible general competence.',
        ],
        [
          'A stop-sign classifier trained mostly on clean daylight photos fails on a sticker-defaced sign. This failure is best explained as:',
          [
            'Hardware malfunction',
            'Out-of-distribution input — the test case differs from training patterns',
            'The model being "too small"',
            'Deliberate sabotage',
          ],
          1,
          'The model learned patterns of its training distribution; the defaced, rotated sign falls outside it, and performance collapses without warning.',
        ],
        [
          'Which deployment is the WISEST use of a narrow AI system?',
          [
            'Fully automated loan rejections with no appeal',
            'AI triage ranking applications for human reviewers who make final decisions',
            'AI diagnosing patients with no doctor in the loop',
            'AI grading exams with no human audit of its rubric',
          ],
          1,
          'Keeping the high-stakes final call with a human uses the AI\'s ranking strength while containing its brittleness on unusual cases.',
        ],
        [
          '"Move 37" in AlphaGo vs Lee Sedol illustrates that narrow AI can:',
          [
            'Outperform humans with genuinely novel creative strategies within its domain',
            'Achieve general intelligence in board games',
            'Transfer its Go skill to other life domains',
            'Understand the game the way a human master does',
          ],
          0,
          'The move was surprising to experts yet effective — deep pattern search within the narrow domain. It does not imply general intelligence or transferable understanding.',
        ],
      ]
    ),
    lesson(
      M1,
      'lit-1-4',
      4,
      'The AI Already in Your Pocket: Recommendations, Spam Filters, Maps and More',
      'A guided tour of the machine-learning systems you use daily, what each one actually predicts, and how to start noticing AI in ordinary software.',
      14,
      nineBlocks({
        objectives: [
          'Identify at least six everyday systems powered by machine learning and state what each predicts',
          'Distinguish learned ranking from hand-written business rules in a product you use',
          'Explain how a spam filter and a maps ETA each combine ML with non-ML components',
          'Describe one feedback loop where user behaviour retrains a model',
        ],
        hook:
          'Every morning your phone quietly runs dozens of learned models before you finish unlocking it: spam filtered overnight, feed ranked while you slept, keyboard autocomplete suggesting your next word, face unlock firing, maps predicting traffic before you asked. If you cannot name what each one predicts, you are using systems you do not understand with your data and your attention. Ten minutes of anatomy fixes that.',
        concept: `**The pattern behind all of them.** Every everyday ML system is the same shape: **input features → learned model → prediction → some action → new data**. The features are numbers derived from the situation (your past clicks, an email's words, road segments and time of day). The model converts features to a prediction (probability of enjoyment, probability of spam, minutes to destination). The product acts on the prediction (rank items, move mail, draw an ETA), and your reaction becomes new training data. Once you can recite that loop for a system, you understand its level — and its failure modes.

**Recommendation systems.** Netflix, YouTube, Instagram and Spotify all rank a huge inventory against *your* history. The classic recipe mixes three signals: **collaborative filtering** ("users like you also liked this"), **content-based filtering** (items like the ones you watched — same artist, same topic embeddings) and a **business/rule layer** (promote new releases, down-rank watched items). The prediction target is some proxy for enjoyment: click, watch time, completion, thumbs-up. Two consequences you have felt: the filter bubble (your rankings narrow to your habits) and popularity bias (big items get shown to gather more data). The "For You" page is not an editor's choice list — it is a live prediction of what keeps you watching, updated by every second you stay or leave.

**Spam filters.** Gmail's filter is a learned classifier over features like word frequencies, sender reputation, bulk-sender signals, and your own past marks ("not spam" / "report"). ML handles the fuzzy patterns no human rule list would cover; explicit rules still catch hard policies (blocked attachments, org-level blocks); and everything you mark retrains the system. False positives are the famous cost — a legitimate email in spam — which is why providers keep the bar asymmetric and why "why was this filtered?" is a genuinely answerable question in most mail apps.

**Maps and ETAs.** Your navigation app fuses three layers: a **graph model** of roads (classical algorithms, not ML), **live traffic** from probe data — phones moving at measured speeds, which is itself a crowd-sourced sensor network — and a **learned ETA model** that predicts travel time per road segment by time of day, day of week, weather and events, then combines segments. Traffic accidents, jams and reroutes all emerge from that fusion. The "AI" here is the prediction layer; the routing algorithm on top is a decades-old shortest-path family (A*, contraction hierarchies). Knowing which layer does what tells you why ETAs are eerily good in dense cities and poor where few phones travel.

**The quieter ones.** Voice assistants: speech-to-text models plus an intent classifier plus often an LLM for answers. Autocorrect/autocomplete: essentially tiny next-token predictors running on-device — the same core idea as a large language model, shrunk to your keyboard. Face unlock: a face-embedding model comparing your face to a stored vector, with a spoof-detection layer. Fraud alerts on your card: anomaly-scoring models over transaction features. Email autocomplete subject lines, photo search ("beach"), YouTube's "up next", Uber's up-front price, UPI's fraud check — same loop, different features and targets.

**The feedback loop trap.** Because your reactions are training data, these systems optimise for engagement-shaped targets. A news feed that learned "outrage keeps thumbs scrolling" will show more outrage — not because anyone programmed outrage, but because the proxy said so. This is why understanding the predicted target ("what number is this model trying to raise?") is the single most useful literacy skill: it explains the product's behaviour better than its mission statement.`,
        extras: [
          table(
            'Everyday systems: what each one actually predicts',
            ['System', 'Features it sees', 'Prediction target', 'Action taken'],
            [
              ['Feed / recommendations', 'Your history, item embeddings, co-behaviour of similar users', 'P(engagement or watch time)', 'Rank inventory; show top-k'],
              ['Spam filter', 'Words, sender reputation, bulk signals, your past marks', 'P(spam)', 'Route to spam or inbox'],
              ['Maps ETA', 'Road segments, time of day, live probe speeds, weather', 'Minutes per segment', 'Sum segments; pick route'],
              ['Keyboard autocomplete', 'Recent words, sentence context', 'Next word probabilities', 'Suggest top candidates'],
              ['Face unlock', 'Face landmarks/embedding', 'Similarity to stored template', 'Unlock or deny'],
              ['Card fraud alert', 'Amount, merchant, location, time, history', 'P(fraudulent transaction)', 'Block, step-up verify, or pass'],
            ],
          ),
          tip(
            'How to see the model\'s target',
            'Ask: "what behaviour increases when this feature improves?" If watch-time suggestions increase watch time, the target is watch time. If a shopping feed surfaces clickbait, engagement is the likely proxy — and quality is only as good as the proxy.',
          ),
          info(
            'Hybrid by design',
            'Few production systems are pure ML. Expect a learned component, a rules layer (policies, business logic) and a fallback path. When something goes wrong, find out which layer produced the decision — the fix is different in each.',
          ),
        ],
        worked: {
          title: 'Reverse-engineer the feed you are reading right now',
          problem:
            'Take any short-form video feed. Using the input→model→action loop, explain why the third video appeared, what the system was optimising, and what you can do to steer it.',
          steps: [
            { title: 'Inputs', desc: 'Your recent watch time and skips per video, likes and shares, the current video\'s embedding, and what similar users engaged with. Session context (time of day) is also in play.' },
            { title: 'Model', desc: 'A ranker scoring candidate videos by predicted engagement — often expected watch time or a weighted mix of watch, like and share probabilities.' },
            { title: 'Action', desc: 'The app shows the highest-scoring candidate it believes you have not seen; autoplay starts before you decide, biasing the data toward watching.' },
            { title: 'Steering', desc: 'Deliberate signals beat passive ones: long-press and "not interested" on topics you want less; search and fully watch videos you want more; periodic history clears reduce legacy bias. The model reads every one of these actions as a label.' },
          ],
          solution:
            'The third video was the highest predicted-engagement candidate given your recent behaviour and cohort signals. You are not choosing from the library — you are being ranked against it. Steering works because your deliberate actions are the cleanest labels in the training stream.',
        },
        practice: {
          title: 'Trace one system end to end',
          prompt:
            'Pick one system from the table (or another you use). For a single recent interaction, write the loop in concrete terms: what exact features probably fed the model, what it predicted, what action the app took, and what your reaction taught it. Keep it under 150 words.',
          hint: 'If you are unsure of a feature, list two candidates and mark which you are confident about — reasoning about uncertainty is part of the skill.',
        },
        mistakes: [
          {
            mistake: 'Calling every automated feature "AI"',
            fix: 'Autoplay timers, static top-10 lists and deterministic pricing rules are not ML. The test from Lesson 1.1 applies: did it learn patterns from data, or was it programmed rule-by-rule?',
          },
          {
            mistake: 'Believing the recommendation is "what you would like" rather than "what a proxy predicts you will engage with"',
            fix: 'Engagement proxies (watch time, clicks) correlate with but differ from satisfaction. Knowing the proxy explains clickbait, rabbit holes and why "watch later" lists grow.',
          },
          {
            mistake: 'Assuming maps ETAs come from GPS alone',
            fix: 'GPS gives current positions; the ETA is a learned per-segment time prediction blended with historical patterns. Rural roads fail because probe data is thin, not because GPS is broken.',
          },
          {
            mistake: 'Thinking you cannot influence these systems',
            fix: 'Explicit signals (not-interested, complete watches, searches, muting channels) are among the strongest labels you can send. Passive scrolling is also a signal — usually the weakest and least intentional one.',
          },
        ],
        exam: {
          question:
            'Describe how collaborative filtering differs from content-based recommendation, and give one limitation of each.',
          answer:
            'Collaborative filtering recommends from behavioural co-occurrence: users who interacted with item A also liked item B — no understanding of content required. Limitation: cold start (new users/items with no interaction history get poor recommendations) and popularity bias. Content-based filtering matches item features to the user\'s past item features (same genre, topic, artist, embedding similarity). Limitation: it stays inside the user\'s demonstrated taste — limited serendipity and reinforcement of existing preferences. Production systems blend both plus a rules layer.',
          source: 'Standard recommender-systems question in DS interviews; also common in product-analytics case rounds.',
        },
        summary: [
          'Everyday ML follows one loop: features → learned prediction → product action → your reaction as new data.',
          'Feeds rank by predicted engagement; spam filters classify with learned patterns plus rules; maps fuse classical routing with learned ETAs.',
          'Autocorrect is a tiny next-token predictor — the same idea as an LLM, at keyboard scale.',
          'Proxies drive products: find the number the model is trained to raise and you can predict the product\'s behaviour.',
          'Your deliberate signals (not-interested, full watches, searches) are the strongest steering inputs you send.',
        ],
      }),
      [
        [
          'What does a short-form video feed\'s ranking model primarily predict?',
          [
            'Which videos are objectively the highest quality',
            'A proxy for engagement — e.g. probability or amount of watch time',
            'Which videos the uploader paid to promote only',
            'The factual accuracy of each video',
          ],
          1,
          'The ranker is trained on engagement outcomes (watch time, likes, shares). Quality and accuracy are only as good as that proxy.',
        ],
        [
          'A Gmail spam filter combines:',
          [
            'Only hand-written rules, no ML',
            'Only ML, never rules',
            'Learned classifiers plus policy rules and user feedback signals',
            'A single keyword blocklist',
          ],
          2,
          'Production filters blend learned models, hard policy rules, and retraining signals from user actions like "not spam" or "report".',
        ],
        [
          'Maps ETAs are unusually good in dense cities but weaker on remote mountain roads mainly because:',
          [
            'GPS satellites cover cities better',
            'Remote roads have thin probe data, so the learned segment predictions are less informed',
            'Mountain roads are illegal for routing apps',
            'City drivers drive more predictably by law',
          ],
          1,
          'The learned per-segment models depend on crowd-sourced speed data; sparse traffic on remote roads means weaker predictions, not worse GPS.',
        ],
        [
          'Which action sends the CLEANEST intentional training signal to your feed?',
          [
            'Passively scrolling past a video',
            'Long-pressing "not interested" on an unwanted topic',
            'Leaving the app open in the background',
            'Watching an ad to the end',
          ],
          1,
          'Explicit negative feedback is a direct labelled example. Passive behaviour is weak, noisy signal; background time is not a preference at all.',
        ],
      ]
    ),
  ],
};
