// AI Literacy for Everyone — course index.
//
// Part I (Modules 1–5, Agent A) builds the foundations: what AI/ML/deep learning
// actually are, how machines learn, how neural networks work, how an LLM reads
// text, and how frontier models are made. Part II (Modules 6–10) turns that
// understanding into practice: prompting, the tools landscape, study/work uses
// with verification, risks and safety, and a personal practice you can defend —
// closed by a capstone toolkit with real evidence.
import type { Course, CourseModule, ExamQuestion } from '../db';
import { module1 } from './module1';
import { module2 } from './module2';
import { module3 } from './module3';
import { module4 } from './module4';
import { module5 } from './module5';
import { module6 } from './module6';
import { module7 } from './module7';
import { module8 } from './module8';
import { module9 } from './module9';
import { module10 } from './module10';

const modules: CourseModule[] = [
  module1,
  module2,
  module3,
  module4,
  module5,
  module6,
  module7,
  module8,
  module9,
  module10,
];

// A 30-question bank spanning all 40 lessons, mixed difficulty and tagged by
// module theme so the exam engine draws a balanced paper per attempt. Answer
// keys never leave the server pre-submission — sanitizeExamQuestions strips
// them from the public payload.
const examBank: ExamQuestion[] = [
  // Foundations (Module 1)
  {
    id: 'lit-bank-01',
    prompt: 'Which statement correctly describes the relationship between AI, machine learning and deep learning?',
    options: [
      'Deep learning is a subset of machine learning, which is a subset of AI',
      'AI and machine learning are two names for the same field',
      'Machine learning is a subset of deep learning',
      'Data science is a subset of deep learning',
    ],
    correct_index: 0,
    explanation:
      'The terms nest: AI is the broad goal of machines performing intelligent tasks; machine learning is the data-driven approach inside it; deep learning is the neural-network-based family inside machine learning.',
    difficulty: 'easy',
    topic: 'ai-foundations',
  },
  {
    id: 'lit-bank-02',
    prompt: 'Why did the expert-systems era of AI (roughly the 1970s–80s) hit a ceiling?',
    options: [
      'Computers were too slow to evaluate the rules',
      'Hand-written rules could not scale to ambiguity, exceptions and learning from new data — and maintaining them became impossible',
      'Expert systems used the wrong programming language',
      'Researchers were forbidden from deploying rule engines',
    ],
    correct_index: 1,
    explanation:
      'Rule engines worked inside narrow, well-defined boxes; every edge case needed a new hand-written rule, so coverage and maintenance collapsed. The statistical/learning turn was the field\'s answer to exactly that limit.',
    difficulty: 'medium',
    topic: 'ai-foundations',
  },
  {
    id: 'lit-bank-03',
    prompt: 'A system beats world champions at chess but cannot plan a simple trip. It is best described as:',
    options: [
      'Artificial general intelligence',
      'Narrow AI — superhuman inside one defined task, with no transfer beyond it',
      'A failed general intelligence',
      'A reinforcement-learning system that never trained',
    ],
    correct_index: 1,
    explanation:
      'Today\'s AI is narrow: brilliance in a single box, brittleness outside it. AGI — general, transferable competence — remains hypothetical.',
    difficulty: 'easy',
    topic: 'ai-foundations',
  },
  // How machines learn (Module 2)
  {
    id: 'lit-bank-04',
    prompt: 'In a model that predicts house sale prices from size, location and age, the label is:',
    options: ['The sale price — the quantity being predicted', 'The size of the house', 'The training algorithm', 'The held-out test set'],
    correct_index: 0,
    explanation:
      'Features (size, location, age) are the inputs; the label is the target the model learns to predict — here, the sale price.',
    difficulty: 'easy',
    topic: 'ml-essentials',
  },
  {
    id: 'lit-bank-05',
    prompt: 'Why must the test set stay untouched until the end of model development?',
    options: [
      'Models become slower as training continues',
      'It provides an unbiased estimate of performance on unseen data; peeking leaks information and inflates scores',
      'The test set is too small to train on',
      'Training on test data crashes the program',
    ],
    correct_index: 1,
    explanation:
      'The test set stands in for the future data the model will meet in production. Any decision made while looking at it (feature choice, tuning, early stopping) leaks information, so the final score flatters the model.',
    difficulty: 'medium',
    topic: 'ml-essentials',
  },
  {
    id: 'lit-bank-06',
    prompt: 'A model scores 99% on training data and 61% on validation data. Which sequence of moves is most defensible?',
    options: [
      'Add more layers and train longer until training accuracy rises further',
      'Collect more representative data, simplify or regularise the model, and stop training at the validation-optimal point',
      'Lower the evaluation threshold so 61% counts as passing',
      'Delete the validation set and evaluate on training data',
    ],
    correct_index: 1,
    explanation:
      'The gap is classic overfitting (high variance): the model memorised training specifics that do not generalise. More/better data, reduced complexity, regularisation and early stopping attack the real problem; the other options either worsen it or simply hide it.',
    difficulty: 'hard',
    topic: 'ml-essentials',
  },
  // Neurons and neural networks (Module 3)
  {
    id: 'lit-bank-07',
    prompt: 'An artificial neuron computes:',
    options: [
      'A weighted sum of its inputs plus a bias, passed through an activation function',
      'A database lookup keyed by the input',
      'The average of every weight in the network',
      'A random label for the input',
    ],
    correct_index: 0,
    explanation:
      'Multiply each input by a weight, add the results and a bias, then apply a non-linear activation. Stacking and training billions of these units is the whole of a deep network.',
    difficulty: 'easy',
    topic: 'neural-networks',
  },
  {
    id: 'lit-bank-08',
    prompt: 'During training the loss oscillates wildly and often diverges instead of settling. Most likely cause and fix?',
    options: [
      'Learning rate too high — lower it (and check batch size)',
      'Learning rate too low — raise it',
      'Too much training data — downsample',
      'The test set was used for training — restart the model',
    ],
    correct_index: 0,
    explanation:
      'Oversized weight updates step past minima instead of into them — the signature of a learning rate set too high. Smaller steps (and sometimes larger batches) restore a descending loss curve.',
    difficulty: 'medium',
    topic: 'neural-networks',
  },
  {
    id: 'lit-bank-09',
    prompt: 'Why does initialising every weight in a hidden layer to exactly the same value stop the layer learning useful features?',
    options: [
      'It makes the model too large for the GPU memory',
      'Symmetric neurons receive identical gradients and stay identical, so the layer learns one repeated feature instead of a diverse hierarchy',
      'It forces every activation to exactly zero forever',
      'It deletes the loss function from the computation',
    ],
    correct_index: 1,
    explanation:
      'Identical units compute identical outputs and receive identical gradients, so they never diverge — the layer collapses to a single duplicated detector. Random initialisation breaks this symmetry so different units can specialise.',
    difficulty: 'hard',
    topic: 'neural-networks',
  },
  // Inside a large language model (Module 4)
  {
    id: 'lit-bank-10',
    prompt: 'Why does the word "internationalization" usually consume several tokens?',
    options: [
      'The model charges extra for long words',
      'Tokenizers split text into subword units, so long or rare words decompose into multiple tokens',
      'Punctuation inside words is counted separately',
      'The context window limits characters per word',
    ],
    correct_index: 1,
    explanation:
      'BPE-style tokenizers build a vocabulary of frequent subword pieces; a long, unusual word is covered by several of them. This is why token counts — not word counts — drive cost and limits.',
    difficulty: 'easy',
    topic: 'llm-internals',
  },
  {
    id: 'lit-bank-11',
    prompt: 'You are extracting structured fields from a form and need consistent, repeatable output. Which approach is right, and why?',
    options: [
      'High temperature, so the model explores more possibilities',
      'Low (near-zero) temperature — sampling concentrates on the most likely tokens, favouring determinism suited to extraction',
      'Temperature only controls response length',
      'Temperature only affects the context window',
    ],
    correct_index: 1,
    explanation:
      'Temperature reshapes the sampling distribution: low values favour the argmax-ish, most probable tokens — stable, fact-style output for extraction; high values diversify creative work and also raise error risk.',
    difficulty: 'medium',
    topic: 'llm-internals',
  },
  {
    id: 'lit-bank-12',
    prompt: 'A task needs details from page 1 of a 180,000-token document, but the model\'s context window is 128,000 tokens. Best approach?',
    options: [
      'Raise the temperature so the model compresses it in',
      'Extract or summarise the relevant section (or chunk and retrieve) and place only that material in the prompt',
      'Split the document into 180 separate chats and average the answers',
      'Ask the model to recall page 1 from memory',
    ],
    correct_index: 1,
    explanation:
      'The window is a hard limit, not a style setting. Chunking plus retrieval (or targeted extraction) puts the needed material inside the window; temperature does not affect capacity, averaging invites inconsistency, and "memory" of a specific pasted document is not a feature.',
    difficulty: 'hard',
    topic: 'llm-internals',
  },
  // How frontier models are made (Module 5)
  {
    id: 'lit-bank-13',
    prompt: 'In RLHF, human raters typically provide supervision by:',
    options: [
      'Writing a perfect response for every prompt from scratch',
      'Comparing two sampled responses and choosing which is better',
      'Labelling every token as good or bad',
      'Coding a rule database of preferences',
    ],
    correct_index: 1,
    explanation:
      'Pairwise comparison is what humans do reliably and cheaply; those judgements train a reward model (or drive DPO-style updates) rather than serving as a per-token signal.',
    difficulty: 'easy',
    topic: 'model-building',
  },
  {
    id: 'lit-bank-14',
    prompt: 'A freshly pretrained base model asked "what is photosynthesis?" replies with three more questions about photosynthesis. Best explanation?',
    options: [
      'The model is broken',
      'It is a text-continuation engine not yet post-trained (SFT and alignment) to follow instructions and hold a chat format',
      'The question exceeded the context window',
      'Temperature was set to exactly zero',
    ],
    correct_index: 1,
    explanation:
      'Pretraining produces a powerful continuator, not an assistant. Instruction-following, answer format and refusal behaviour are installed in supervised fine-tuning and alignment — the post-training stages.',
    difficulty: 'medium',
    topic: 'model-building',
  },
  {
    id: 'lit-bank-15',
    prompt: 'After an alignment run, reward-model scores rise while human reviewers judge the answers less accurate but more structured. Diagnosis and response?',
    options: [
      'Data contamination — delete the benchmark',
      'Reward hacking / proxy over-optimisation — harden the reward signal with accuracy-focused preferences and gate the loop on held-out human evaluation',
      'Tokenizer regression — retrain the tokenizer',
      'Context-window overflow — increase the window size',
    ],
    correct_index: 1,
    explanation:
      'The optimiser exploited surface correlates of the reward (structure, confident framing) instead of quality — the classic proxy-metric divergence. Fixes: accuracy-focused preference data with hard negatives, plus stopping power from held-out human evals, not bigger windows.',
    difficulty: 'hard',
    topic: 'model-building',
  },
  // Prompting that works (Module 6)
  {
    id: 'lit-bank-16',
    prompt: 'Why does the prompt "write about internships" typically produce a generic paragraph?',
    options: [
      'The model refuses to engage with vague requests',
      'Unspecified dimensions (audience, length, purpose) carry no conditioning, so output converges on the statistically typical treatment',
      'The model has never seen internship content',
      'The context window is too small for detail',
    ],
    correct_index: 1,
    explanation:
      'Next-token prediction conditions on what is present; absent specifications default to the corpus average, which reads as generic. Role, task, constraints and format supply the missing signal.',
    difficulty: 'easy',
    topic: 'prompting',
  },
  {
    id: 'lit-bank-17',
    prompt: 'Your few-shot classifier\'s examples route every ambiguous ticket to "Other", while your prose says "use Bug when a defect is plausible". Outputs follow the examples. The fix:',
    options: [
      'Add ten more examples of any kind',
      'Align prose and demonstrations — change the examples to show a plausible defect routed to Bug (or change the prose to match the examples)',
      'Lower the temperature',
      'Delete the task description entirely',
    ],
    correct_index: 1,
    explanation:
      'Demonstrated behaviour usually outweighs described behaviour. The example set is teaching a policy your instruction contradicts; make both say the same thing.',
    difficulty: 'medium',
    topic: 'prompting',
  },
  {
    id: 'lit-bank-18',
    prompt: 'Why can requiring step-by-step reasoning improve answers on multi-step problems — and what is the key caveat?',
    options: [
      'It increases the model\'s parameter count; the caveat is cost only',
      'Intermediate reasoning tokens act as working memory that later tokens condition on; the caveat is that a fluent chain can rationalise a wrong answer, so independent verification is still required',
      'It triggers a live web search; the caveat is connectivity',
      'It lowers the temperature; the caveat is latency',
    ],
    correct_index: 1,
    explanation:
      'Autoregressive generation has no scratchpad but its own output — required intermediate steps put sub-results into the context. But those steps are generated for plausibility too, which is why reasoning aids, and never replaces, verification.',
    difficulty: 'hard',
    topic: 'prompting',
  },
  // The AI tools landscape (Module 7)
  {
    id: 'lit-bank-19',
    prompt: 'What most distinguishes AI search from a plain chat assistant?',
    options: [
      'It uses a larger model',
      'It retrieves live indexed material and generates answers conditioned on it, usually with citations',
      'It cannot hold a conversation',
      'It runs entirely offline',
    ],
    correct_index: 1,
    explanation:
      'Retrieval in front of generation breaks the training-cutoff ceiling and anchors answers in real passages — while citations, being generated text, still require opening and reading the source.',
    difficulty: 'easy',
    topic: 'ai-tools',
  },
  {
    id: 'lit-bank-20',
    prompt: 'Which statement about upgrading from a free AI tier to a paid subscription is TRUE?',
    options: [
      'It guarantees factual accuracy',
      'It buys higher limits, the flagship model, gated features and stronger data controls — not truthfulness',
      'It updates the knowledge cutoff to today',
      'It disables hallucination entirely',
    ],
    correct_index: 1,
    explanation:
      'Money moves the instrument (limits, model tier, features, privacy terms); it never moves the verification problem. Accuracy comes from grounding and checks, not from the billing plan.',
    difficulty: 'medium',
    topic: 'ai-tools',
  },
  {
    id: 'lit-bank-21',
    prompt: 'Which pair is CORRECT about local / on-device models?',
    options: [
      'Pro: data stays on the device and there is no per-token cost; Con: capability is capped by hardware, so hard reasoning suffers',
      'Pro: always more capable than cloud APIs; Con: they require internet access',
      'Pro: includes live web knowledge by default; Con: expensive per token',
      'Pro: zero setup; Con: conversations always upload to the vendor',
    ],
    correct_index: 0,
    explanation:
      'Local models buy privacy, offline use and fixed cost, and charge a capability ceiling plus setup/ops. They are the right choice for sensitive material and simple transformations — not for frontier reasoning.',
    difficulty: 'medium',
    topic: 'ai-tools',
  },
  // AI for study and work (Module 8)
  {
    id: 'lit-bank-22',
    prompt: 'Before submitting research that used an AI assistant, the single most important verification step is:',
    options: [
      'Formatting the bibliography nicely',
      'Opening every cited source to confirm it exists and actually supports the claim',
      'Asking the same model to confirm its citations',
      'Paraphrasing the citations in your own words',
    ],
    correct_index: 1,
    explanation:
      'Citations are generated text: they can be fabricated or attached to the wrong claim (mismatch). Only opening the source and reading the supporting passage verifies it.',
    difficulty: 'easy',
    topic: 'study-work',
  },
  {
    id: 'lit-bank-23',
    prompt: 'Which resume edit is legitimate use of AI?',
    options: [
      'Adding a leadership metric you cannot source',
      'Rewriting your true responsibilities with stronger action verbs and honest job-description vocabulary',
      'Inventing a certification to clear ATS filters',
      'Claiming you led a team you merely assisted',
    ],
    correct_index: 1,
    explanation:
      'Presentation of true claims is fair game; invented scope or metrics are soft fabrication that interviews systematically expose (the evidence test: source, names, process, measurement).',
    difficulty: 'medium',
    topic: 'study-work',
  },
  {
    id: 'lit-bank-24',
    prompt: 'Why should an AI summary of a contract or policy never replace reading the original?',
    options: [
      'Summaries are always factually wrong',
      'Compression silently drops conditions, exceptions and scope — precisely the parts that determine your obligations',
      'Contracts are illegal to summarise',
      'Models cannot process long documents at all',
    ],
    correct_index: 1,
    explanation:
      'Summaries are an index into high-stakes text: use them to find where to read, then read those passages yourself — the qualifiers are the first casualties of compression.',
    difficulty: 'medium',
    topic: 'study-work',
  },
  // Limits, risks and safety (Module 9)
  {
    id: 'lit-bank-25',
    prompt: 'A model confidently invents a citation that looks perfectly formatted. The root cause is:',
    options: [
      'A virus in the model weights',
      'Generation optimises plausibility, not truth — when knowledge is absent, the slot is filled with citation-shaped tokens',
      'The prompt was too short',
      'The temperature was set too low',
    ],
    correct_index: 1,
    explanation:
      'Nothing in generation verifies claims; next-token prediction completes patterns. Precise, checkable objects like citations are therefore the highest-risk outputs and must be traced externally.',
    difficulty: 'easy',
    topic: 'risks-safety',
  },
  {
    id: 'lit-bank-26',
    prompt: 'Stereotypical defaults in model output mainly originate from:',
    options: [
      'The random seed used at initialisation',
      'Training data that encodes historical patterns, reinforced by an objective that rewards statistically typical continuations',
      'The user\'s prompt alone',
      'Hardware precision limits',
    ],
    correct_index: 1,
    explanation:
      'Data carries the skew; the objective makes "common" equal to "expected". Post-training rater preferences can add taste on top, which is why rubrics, counter-examples and human review are the practical controls.',
    difficulty: 'easy',
    topic: 'risks-safety',
  },
  {
    id: 'lit-bank-27',
    prompt: 'A student pastes their entire unpublished thesis draft — including a co-authored chapter — into a free chatbot. Which option best states three risks AND a better workflow?',
    options: [
      'Risks: retention/training use compromising novelty, third-party rights over co-authored material, and loss of custody via review processes or sub-processors; better: disable training for the session, paste only redacted single sections, or use a local model for full-draft passes',
      'Risk: slow answers; better: switch to a paid plan',
      'Risk: an AI detector flags the thesis later; better: rewrite the text before pasting',
      'Risk: the model will publish the thesis; better: delete the chat afterwards',
    ],
    correct_index: 0,
    explanation:
      'Unpublished work faces novelty and confidentiality exposure under default retention/training practices; co-authored material belongs partly to others; custody widens beyond the app. Minimising, redacting and using private/local channels addresses the actual risks — deletion afterwards does not.',
    difficulty: 'hard',
    topic: 'risks-safety',
  },
  // Your AI practice (Module 10)
  {
    id: 'lit-bank-28',
    prompt: '"Human-in-the-loop" most accurately means:',
    options: [
      'A person is a required gate at a defined step — specification, approval or verification — in the pipeline',
      'A human types every prompt character by character',
      'A human personally trains the model',
      'A human watches the tokens stream in real time',
    ],
    correct_index: 0,
    explanation:
      'It names a control placement: humans own the steps where judgement and consequences live, positioned by error cost, reversibility and checkability — not by the tool\'s recent track record.',
    difficulty: 'easy',
    topic: 'practice-ethics',
  },
  {
    id: 'lit-bank-29',
    prompt: 'Which combination of fields turns a saved prompt into a reusable library entry?',
    options: [
      'The surrounding chat history and the number of times you used it',
      'Named slots for inputs, a verification checklist, known failure modes, and a model + last-tested date',
      'The prompt\'s word count and formatting',
      'The vendor\'s marketing description of the model',
    ],
    correct_index: 1,
    explanation:
      'Slots generalise one instance into a template; checks and failure modes make reuse safe; model/date make re-testing and retirement honest. Transcripts without these remain one-off artefacts.',
    difficulty: 'medium',
    topic: 'practice-ethics',
  },
  {
    id: 'lit-bank-30',
    prompt: 'You grade two fluent candidate outputs with a precommitted rubric and pick the one that scores higher even though it is less elegant. Best justification?',
    options: [
      'Rubrics are required by every AI vendor',
      'Quality for a task is defined by precommitted, checkable criteria — which separate fitness for purpose from fluency, and fluency correlates poorly with truth',
      'Longer rubrics automatically produce better results',
      'Elegant prose is prohibited in academic work',
    ],
    correct_index: 1,
    explanation:
      'The rubric operationalises "good" before the outputs are seen, so the decision rests on task fit rather than style. This is the evaluation discipline that keeps fluency from masquerading as correctness.',
    difficulty: 'medium',
    topic: 'practice-ethics',
  },
];

export function getAILiteracyCourse(): Course {
  return {
    id: 'crs-ai-literacy',
    slug: 'ai-literacy-everyone',
    title: 'AI Literacy for Everyone',
    subtitle:
      'From "what is AI" to a toolkit you actually run — how the models work, how to prompt them, how to verify what comes back, and how to keep your name on work you can defend',
    description: `Everyone is now expected to work alongside AI, almost nobody was taught what it actually is, and the gap between the two is where bad grades, bad hires and bad decisions happen. This course closes that gap in ten modules and forty lessons: first the honest technical foundation — what AI, machine learning and deep learning really mean, how a neural network learns, how a large language model reads text and predicts tokens, and how a frontier model is built from internet-scale pretraining through supervised fine-tuning to RLHF. Then the practical half: prompting that works (structure, system instructions, few-shot examples, step-by-step reasoning, iteration like debugging), the tools landscape (chat vs coding vs search, media generation, free vs paid vs local), and the everyday uses that matter — research, learning code, drafts, exam prep and resumes — each welded to a verification routine rather than a leap of faith.

The last stretch is the part most courses skip: limits and safety (hallucination, bias, privacy, academic integrity, deepfakes, the honest jobs picture) and then your own practice — workflows with humans placed where the stakes are, a prompt library you reuse, rubrics for judging output, and a short ethics code you wrote yourself. It ends with a capstone that is a real artifact, not a quiz: five AI use-cases you actually ran, ten prompts with before/after evidence, your verification checklist, one hallucination you caught, and the rules you will keep. The certificate is issued for that document, not for notes about it.

**Who this is for:** any student — any branch, technical or not — who uses (or is expected to use) AI tools and wants to know what they are doing when they do; placement-prep students who need AI literacy for aptitude rounds and interviews; working professionals who must supervise AI output rather than be supervised by it.

**What you need:** no mathematics, no programming, no prior AI course. A browser, and — for the practice lessons — access to any free AI chat tool. Everything else is taught here from first principles.`,
    category: 'AI & Data Science',
    level: 'beginner',
    is_free: true,
    price_inr: 0,
    thumbnail_url: '',
    thumbnail_alt: 'AI Literacy for Everyone course cover',
    tags: ['ai', 'ai-literacy', 'llm', 'beginner', 'genai', 'no-code', 'open-to-all'],
    outcomes: [
      'Explain AI, machine learning, deep learning and data science precisely — and place LLMs inside that map',
      'Describe how a neural network learns and how a frontier model is made (pretraining, SFT, RLHF)',
      'Use tokens, context window, temperature and knowledge cutoff to predict what a model can and cannot do',
      'Write prompts with role, task, constraints and format — plus system rules, few-shot examples and step-by-step reasoning',
      'Iterate on prompts with a diagnose-first loop and a small fixed test set',
      'Choose correctly between chat assistants, coding assistants, AI search, media tools, free/paid tiers and local models',
      'Use AI for research, code learning, writing drafts, exam prep and resumes — with verification built into every workflow',
      'Detect hallucination, recognise bias, protect your data, and follow academic-integrity rules',
      'Build personal workflows with human-in-the-loop gates and maintain a prompt library you actually reuse',
      'Judge output with rubrics, apply honesty/attribution/harm ethics, and ship a capstone toolkit backed by evidence',
    ],
    prerequisite_course_id: null,
    certificate_eligible: true,
    published: true,
    created_at: '2026-10-15T09:00:00.000Z',
    updated_at: '2026-10-15T09:00:00.000Z',
    instructor_id: null,
    about_course: `This course is built around one claim: using AI well is a skill with two halves — understanding the machine and disciplining the output — and almost everyone is flying with neither. Forty lessons, each the same nine steps (objective, hook, concept, worked example, practice task, common mistakes, exam/interview angle, quiz, summary), every worked example real rather than decorative.

Modules 1 to 5 build the foundation without mathematics. Module 1 defines AI, machine learning, deep learning and data science — and walks the history from expert systems through the statistical turn to the generative wave. Module 2 covers how machines learn: features and labels, the three learning paradigms, why you never test on training data, and overfitting. Module 3 demystifies neural networks with real numbers — a neuron's arithmetic, what layers add, what training actually changes, and what a loss function measures. Module 4 goes inside a large language model: tokens, next-token prediction, embeddings and attention intuition, the context window, temperature, top-p and the knowledge cutoff. Module 5 completes the picture with how frontier models are made — corpus and pretraining, supervised fine-tuning, RLHF and alignment, then model families, open vs closed weights and the token arithmetic that governs cost.

Module 6 begins the practical half: the role/task/constraints/format skeleton, system prompts as soft contracts, few-shot examples that teach boundaries, chain-of-thought reasoning with its rationalisation caveat, and prompt iteration treated as debugging. Module 7 maps the tools — chat assistants, coding assistants and AI search as three species with different failure modes; image, video and voice tools with their structural limits; free vs paid vs API vs self-hosted; and a selection procedure that puts data sensitivity first. Module 8 applies all of it to study and work — research and summarisation with a verification routine, code explained until you understand it, drafts you edit before shipping, and exam/resume/placement work under the evidence test. Module 9 confronts the limits honestly: hallucination mechanisms and checks, bias and where it enters the pipeline, privacy of whatever you paste, academic integrity, deepfakes and misinformation, and the jobs question without hype. Module 10 turns knowledge into practice — workflows with human-in-the-loop gates, a maintained prompt library, rubrics for judging quality, an ethics recap (honesty, attribution, harm), and the capstone: your personal AI toolkit with real evidence of use.

The interview and exam angle runs through every lesson — "why is this prompt generic", "what does temperature actually change", "where does bias enter", "why can't detectors settle deepfakes" — the AI-literacy questions aptitude rounds and panel interviews increasingly ask, and that you will be able to answer from first principles rather than from headlines.`,
    prerequisites: [
      'Nothing — no mathematics, no programming, no prior AI courses',
      'A browser on a phone or computer; for the practice lessons, access to any free AI chat tool',
    ],
    audience: [
      'Students of any branch who use — or are expected to use — AI tools and want to understand them',
      'Non-technical students who need a first-principles introduction without maths or code',
      'Placement-prep students: AI literacy is now common in aptitude rounds and panel interviews',
      'Working professionals who must verify and supervise AI output in their daily work',
    ],
    audio_language: 'English',
    caption_language: 'English',
    // AI/DS primary course, open to all branches — foundation tier, 12h.
    branch: 'ai-ds',
    branch_label: 'AI/DS primary — open to all branches',
    bucket: 'B',
    certificate_tier: 'foundation',
    estimated_hours: 12,
    perks: [
      { key: 'certificate', label: 'Verifiable certificate' },
      { key: 'xp', label: 'XP on the leaderboard' },
    ],
    // Semester Exam Mode payload — the one-night revision sheet.
    exam_prep: {
      target: 'AI literacy / digital-skills assessments — all branches',
      units: [
        {
          title: 'What AI is (M1)',
          summary:
            'AI = machines performing intelligent tasks; ML = learning from data inside that goal; DL = neural-network methods inside ML; data science = the broader practice of extracting value from data (overlapping, not nested the same way). History: expert systems (hand-written rules) hit a ceiling on ambiguity and maintenance; the statistical turn learned patterns from data; deep learning scaled it; transformers + scale produced the generative wave. Narrow vs general AI: today\'s systems are narrow — superhuman in one box, brittle outside; AGI is hypothetical. Daily AI: recommendation, spam filter, maps ETA — each predicts something specific; literacy is noticing what.',
          questions: [
            'Draw the AI ⊃ ML ⊃ DL nesting and place data science relative to it.',
            'Why could expert systems not scale, and what replaced them and why?',
            'Give one example of narrow AI and state exactly what it cannot do outside its box.',
          ],
          pyqs: [],
        },
        {
          title: 'How machines learn (M2)',
          summary:
            'Dataset anatomy: features (inputs), label (target), and why data quality dominates model cleverness. Paradigms by feedback: supervised (labelled examples — classify/regress), unsupervised (structure without labels — clustering), reinforcement (rewards from actions). Splits: train/validation/test; test stays untouched or it leaks; cross-validation when data is scarce; leakage produces secretly useless models. Overfitting = high variance (memorises training specifics; fix with more data, simplification, regularisation, early stopping); underfitting = high bias (too simple; increase capacity). Diagnosis via the gap between train and validation curves — never via training accuracy alone.',
          questions: [
            'Why is testing on training data worse than useless — what does it estimate?',
            'Distinguish overfitting from underfitting using train/validation numbers, and give the fix for each.',
            'What is data leakage, and how does it survive until production?',
          ],
          pyqs: [],
        },
        {
          title: 'Neural networks (M3)',
          summary:
            'Neuron = weighted sum + bias + activation. Depth helps because layers compose features hierarchically (edges → shapes → objects); in practice depth beats width. Training changes the weights: random initialisation (symmetry must break), forward pass, loss, backpropagation of error, small steps along the gradient (gradient descent), repeat. Learning rate controls step size: too high = oscillation/divergence, too low = glacial. Loss = one number measuring wrongness; the choice of loss encodes what you care about; loss and accuracy are different views (smooth optimisable signal vs discrete correctness). None of this requires calculus to operate — only the mechanism.',
          questions: [
            'Walk the training loop: forward pass, loss, weight update — what changes between epochs?',
            'Why must initial weights differ across neurons in a layer?',
            'Symptoms of a learning rate that is too high vs too low?',
          ],
          pyqs: [],
        },
        {
          title: 'Inside a large language model (M4)',
          summary:
            'Text → tokens (subword units; long/rare words cost more tokens; token counts drive price and limits). The one task: next-token prediction — every essay, chat and code block is that objective at scale. Embeddings: meaning as nearby points; attention: dynamic relevance weighting so each token looks at the right others; together they connect distant words. Context window: everything visible per pass — a hard capacity limit, not a style setting. Temperature/top-p: sampling dials — low = most likely, deterministic-ish (extraction); high = diverse, riskier (brainstorming). Knowledge cutoff: when training data stopped — hence live facts need retrieval or sources, never recall.',
          questions: [
            'Why do models count tokens instead of words, and what does that drive?',
            'What does temperature change — and what does it NOT change?',
            'A question needs a post-cutoff fact. What are the two honest options, and what is the trap?',
          ],
          pyqs: [],
        },
        {
          title: 'How frontier models are made (M5)',
          summary:
            'Pretraining: curated corpus (quality filtering, dedup, licensing) + next-token objective at trillion-token scale → a base model: a continuator, not a chatbot. Parameters = trained numbers = capacity; counts inform, never decide (data, tokens, MoE, post-training all mediate). SFT: curated prompt→response demonstrations install format, manners, refusals — thousands to millions of examples, quality over quantity; can add behaviour, not knowledge. RLHF: pairwise preferences → reward model → policy optimisation (or DPO-style direct preference tuning) — buys taste; risks: over-refusal, reward hacking, proxy over-optimisation. Deployment: open weights (control, ops burden) vs closed API (capability, dependency); token economics: bill = input×rate + output×rate; output is costlier and sequential, so it drives cost and latency.',
          questions: [
            'Why is a base model not yet a chat assistant — what does post-training add?',
            'Explain the RLHF pipeline and one risk it introduces.',
            'Compute the monthly cost of a workload given per-million input/output rates — and name the biggest lever.',
          ],
          pyqs: [],
        },
        {
          title: 'Prompting that works (M6)',
          summary:
            'Underspecified prompts get statistically average answers — supply the missing dimensions. Skeleton: role (register), task (one verb), constraints (audience, length, facts, exclusions), format (shape); fence pasted data with delimiters; permit clarifying questions. System prompts: standing policy in the system seat — testable behaviour rules, output contract, uncertainty policy, injection clause; soft constraints, not guarantees. Few-shot: in-context examples teach mappings and boundaries; keep them correct, consistent, covering the hard branch; changes behaviour, never knowledge. Chain of thought: intermediate tokens act as working memory — strong on multi-step work, but chains can rationalise wrong answers. Iterate like an engineer: run → inspect → diagnose (missing spec / conflicting spec / capability / input) → one change → retest on a mini test set.',
          questions: [
            'Name the four prompt components and say what each one controls.',
            'Why do examples usually beat prose when they disagree?',
            'Describe the diagnosis-first iteration loop and why only one change per round.',
          ],
          pyqs: [],
        },
        {
          title: 'Tools and everyday uses (M7–M8)',
          summary:
            'Three text species: chat (parametric recall + pasted context), coding assistants (executable output — the strongest verification loop), AI search (live retrieval + citations that still need opening). Media shelf: image/video/voice with structural fails (rendered text, counting, identity drift, consent); generation for mood, real tools for facts and typography. Free vs paid: money buys limits, model tier, features and data terms — never accuracy; find training/retention settings yourself. Local models: privacy, offline, zero token cost, hardware-capped capability; constraints (data path) decide category before capability. Study/work uses with verification: research (classify claims, trace citations), code (run, read, test edges), drafts (fact/tone/specificity/responsibility passes), resumes (evidence test: every claim defensible) — the sender always owns the message.',
          questions: [
            'Rank the three text species by output checkability and justify your routing for a live-fact question.',
            'What does a paid subscription actually buy — and what can it never buy?',
            'Walk the four-pass check over an AI-drafted email, with an example of what each pass catches.',
          ],
          pyqs: [],
        },
        {
          title: 'Risks, ethics and your practice (M9–M10)',
          summary:
            'Hallucination = plausible-shaped tokens where knowledge is absent (no truth-check in generation); risk tracks specificity — citations, numbers, dates, post-cutoff facts; fix by grounding + claim classification + tracing; temperature never fixes facts. Bias enters via data (history), objective (typicality), raters (taste) — mitigate with rubrics, counter-examples, diverse tests; people-affecting decisions stay with humans. Privacy: pasted text travels (retention, possible training, review) — green/amber/red bins, redact, minimise, never paste credentials; third-party data needs rights. Integrity: institution policy + the principle of work you can defend; detectors unreliable — process evidence is the fair proof. Deepfakes: verify origin and corroboration, not the artefact; forwarding is publication. Jobs: tasks change before jobs do — specification, verification and accountability rise in value. Practice: workflows with gates placed by error cost × reversibility × checkability; a prompt library with slots, checks and test dates; rubrics over vibes; ethics = honesty, attribution, harm, and the comfort test. Capstone: your toolkit with real evidence.',
          questions: [
            'Why is hallucination structural, and what two mitigations reduce it without eliminating it?',
            'Place a human gate in a weekly workflow and justify the position with cost and reversibility.',
            'What does honesty require when submitting AI-assisted work, and what does attribution require?',
          ],
          pyqs: [],
        },
      ],
      important_questions: [
        'Explain why an underspecified prompt produces a generic answer, using the next-token objective — and name the four components that fix it.',
        'Walk through the RLHF pipeline and explain one failure mode (over-refusal or reward hacking) with its mitigation.',
        'Why does asking a model to show step-by-step reasoning often improve accuracy? Give the mechanism and one caveat.',
        'Design a five-step verification routine for AI-supplied facts and citations, and explain why mismatched citations are the most dangerous failure class.',
        'Trace three stages where bias enters an LLM pipeline and give one mitigation at each.',
        'Compare a cloud API and a local model on privacy, cost and capability — and give two situations where local wins.',
        'A weekly workflow auto-sends AI-drafted messages. Redesign it with human-in-the-loop gates and justify each gate\'s position.',
        'What distinguishes a reusable prompt-library entry from a saved transcript? Specify five fields and the purpose of each.',
      ],
      previous_year_questions: [
        {
          year: '2025',
          question:
            'An AI assistant supplies five "sources" for an essay. Walk through your verification routine, and explain why one of the five — a citation that opens to a real paper that does not contain the claimed finding — is worse than a source that does not exist.',
          solution:
            'Routine: (1) extract all checkable claims; (2) classify each (citation, number, date, interpretation); (3) search title + author for every citation and read the supporting passage; (4) cross-check load-bearing numbers against primary sources and dates against official pages; (5) stamp each claim verified/unverified/contradicted before use. The mismatched citation is the worst class because it passes casual inspection — the link works, the paper is real, and the reader\'s trust in the source transfers to a claim the source does not make. A fabricated source at least fails in one click; a mismatch survives until someone reads the passage — which is exactly why you read the passage.',
        },
        {
          year: '2025',
          question:
            'A model\'s answers on a company\'s internal benchmark improved sharply after an alignment run, but human reviewers report the answers are "more polished and less accurate". What happened, and how would you fix it?',
          solution:
            'Classic reward hacking: the policy optimised surface correlates of the reward model (structure, confident framing, thorough-looking lists) rather than true quality — the proxy diverged under pressure, and over-optimisation pushed the metric up while real quality fell. Fixes: (1) retrain/augment the reward signal with fresh preferences where factual accuracy is the tiebreaker, including hard negatives that are well-structured but wrong, so structure alone stops paying; (2) gate the optimisation loop on held-out human evaluation and factual probes — stop when human scores fall regardless of the reward-model score — and strengthen the constraint anchoring the model to its pre-optimisation behaviour. The Module 2 principle, recurring at scale: you get the metric you choose.',
        },
        {
          year: '2026',
          question:
            'Your team wants to use a chat assistant for summarising client documents that cannot leave the company network. Outline the decision process and the workflow you would insist on.',
          solution:
            'Decision process, in order: (1) the hard constraint — data egress is forbidden, so consumer chat is out regardless of quality; the category is set before benchmarks are discussed. (2) Category-appropriate options: self-hosted open-weight model on company infrastructure, or a provider offering a contractual zero-retention/private tier if policy permits egress under DPA — capability validation on real documents comes next (Module 5\'s checklist). (3) Workflow: paste only the minimum necessary (redaction of identifiers even inside the boundary), summarisation prompts that demand quotes and preserved caveats, and a human verification pass against the source document before any summary leaves the team. (4) Governance: retention and training settings documented, access logged, and the rule written down — the human gate sits at approval, because a wrong client summary is an irreversible credibility event.',
        },
      ],
    },
    // Final exam: 15 drawn from the 30-question bank, mixed difficulty and
    // topic-tagged across all ten modules. Pass 60, distinction 85 on the
    // first attempt, 24h retake.
    exam: {
      question_count: 15,
      duration_minutes: 25,
      passing_percent: 60,
      retake_cooldown_hours: 24,
      distinction_percent: 85,
      bank: examBank,
    },
    // Capstone: the personal AI toolkit + prompt library. Required for the
    // certificate — the course's claim is that you finish with a working
    // practice, not notes about one.
    project: {
      title: 'Build your personal AI toolkit and prompt library',
      brief:
        'Produce one document (doc, notes file or small repo — your choice) containing five sections, all backed by evidence from real sessions. (1) Five AI use-cases you actually ran across different domains (e.g. research summary, code explanation, email draft, resume-bullet improvement, study drill): for each, the task, the tool chosen with a one-line justification, the workflow with its human gate, the verification you performed, and the honest outcome including failures. (2) Your ten best prompts with before/after outputs: the naive first attempt and its unedited output, the improved prompt (role/task/constraints/format, system rules, few-shot or step-by-step where they apply), its unedited output, and a one-line note on which single change mattered. (3) Your verification checklist: the repeatable checks you now run (claim classification, citation tracing, fact pass, edge-case runs — whichever apply to your tasks), written as steps with evidence they executed. (4) One hallucination you caught: the claim, the check that detected it, what you did, and what it taught you about your risk profile — or, if you have not caught one, a deliberate test (five checkable claims, all verified) with the real result reported honestly. (5) Your ethics rules: three to five lines you follow (disclosure, no secrets pasted, verify before submit, attribution, harm) plus your comfort-test sentence. Close with a short reflection: what improved, what still fails, what you will not use AI for, and how the library will be maintained.',
      submission_hint: 'Link to the document on a public drive (anyone-with-link can view) or a public repository.',
      required_for_certificate: true,
    },
    modules,
  };
}
