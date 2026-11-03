// AI.FIRST — Future-Ready Intelligence, Skills & Technology.
//
// The flagship paid course (₹99): twelve modules across four pillars —
// UNDERSTAND, VERIFY, BUILD, ANSWER FOR IT — forty-eight nine-block lessons,
// a proof of work per module in three pathway variants, a readiness test that
// can test a learner out of modules and price a personalised path, a final
// exam and a capstone defence required for the certificate.
import type { Course, CourseModule, ExamQuestion } from '../db';
import { placeOptions, M, COURSE_ID } from './helpers';
import { readinessBank } from './readinessBank';
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
import { module11 } from './module11';
import { module12 } from './module12';

const modules: CourseModule[] = [
  module1, module2, module3, module4, module5, module6,
  module7, module8, module9, module10, module11, module12,
];

type B = [number, string, string[], number, string, ExamQuestion['difficulty']];

// Final-exam bank: 48 integrative questions, four per module, drawn 25 per
// attempt. Written to need two lessons at once where possible.
const bankRaw: B[] = [
  [1, 'A system flags exam-hall seating clashes using rules a programmer wrote. A second system predicts which students may need extra help from five years of past results. Which is machine learning?', ['Both', 'Only the second', 'Only the first', 'Neither'], 1, 'Only the second learns patterns from data.', 'easy'],
  [1, 'Which pair correctly matches problem and learning style?', ['Grouping customers with no labels — supervised', 'Predicting house prices from labelled sales — supervised', 'Game agent learning from rewards — unsupervised', 'Spam filter from labelled emails — reinforcement'], 1, 'Labelled examples → supervised.', 'easy'],
  [1, 'A model is 97% accurate on a dataset where 97% of cases are negative. The first thing to ask is:', ['How many layers it has', 'How it compares with the always-negative baseline, and what its recall and precision are', 'Which GPU trained it', 'Whether it is open-weight'], 1, 'Accuracy without a baseline and the right metric is not evidence.', 'medium'],
  [1, 'Why do deeper networks help on images and language but not always on small spreadsheets?', ['They are always slower', 'Depth lets networks learn layered features from rich raw data; small tabular data often suits simpler models', 'Spreadsheets cannot be used in ML', 'Depth only matters for speed'], 1, 'Learned features need rich data.', 'medium'],
  [2, 'An LLM writes fluent, wrong details about a little-known local event. The best mechanical explanation is:', ['The tokenizer failed', 'Sparse training signal for rare facts, so the model generated plausible tokens', 'Temperature was 0', 'The context window was empty of instructions'], 1, 'Plausibility without grounding.', 'medium'],
  [2, 'Which combination best reduces hallucinated answers in a policy-Q&A tool?', ['High temperature and long answers', 'Supplying the policy, requiring citations or quotes, and allowing "not found"', 'A bigger context window alone', 'Fine-tuning on last year\'s policy'], 1, 'Ground, cite, abstain.', 'medium'],
  [2, 'Attention in a transformer allows:', ['Each token to weigh other tokens in context when building its meaning', 'The model to browse the web', 'Faster tokenisation', 'Training without data'], 0, 'Context-dependent meaning.', 'easy'],
  [2, 'Two texts have cosine similarity 0.91. You can conclude:', ['They agree with each other', 'They are close in meaning or topic, not necessarily in truth or stance', 'One is a translation', 'They share every word'], 1, 'Similarity ≠ agreement.', 'hard'],
  [3, 'A start-up has spiky, low volume and no ML-ops staff. Self-hosting an open-weight model will most likely be:', ['Cheaper and simpler', 'More expensive and more work than an API', 'Identical in effort', 'Required by law'], 1, 'Idle hardware and operations cost money.', 'easy'],
  [3, '50,000 requests × (1,000 input + 200 output tokens). Prices: ₹20 input, ₹80 output per million tokens. Monthly cost:', ['₹1,800', '₹180', '₹18,000', '₹1,000'], 0, '50,000 × (0.02 + 0.016) = ₹1,800.', 'hard'],
  [3, 'Routing in model selection is justified when:', ['All requests are equally hard', 'An evaluation shows a small model meets the bar on an identifiable share of requests', 'The largest model is cheapest', 'Latency does not matter'], 1, 'Routing rests on measured quality.', 'medium'],
  [3, 'Reasoning models are most worth their extra cost on:', ['Rewording an email', 'Multi-step maths, debugging and constraint-heavy planning', 'Translating a greeting', 'Casual chat'], 1, 'Test-time compute pays off on hard problems.', 'easy'],
  [4, 'Which prompt part most often fixes "the output is fine but not what I needed"?', ['Adding "please"', 'Context about audience and purpose, plus done-criteria', 'Capital letters', 'A higher temperature'], 1, 'Under-specification is the usual cause.', 'easy'],
  [4, 'Your few-shot extractor copies the exact phrasing of the examples into unrelated outputs. Best fix:', ['Remove all examples', 'Use more varied examples and test on inputs unlike them', 'Raise max_tokens', 'Use one example only'], 1, 'Vary examples so the rule, not the surface, is learned.', 'medium'],
  [4, 'For a 3,000-word report, the most efficient first step is usually:', ['Ask for the full report at once', 'Ask for an outline and approve it before drafting', 'Ask for 3 versions', 'Ask for bullet points only'], 1, 'Plan first catches structure problems cheaply.', 'easy'],
  [4, 'A prompt library entry is most useful when it includes:', ['Only the prompt', 'Template, purpose, settings, test inputs, known failures and version', 'The author\'s name', 'A screenshot of the output'], 1, 'Tested, versioned prompts are reusable.', 'medium'],
  [5, 'An answer quotes a correct repo rate from two years ago as "current". The error type and check:', ['Fabrication — search for existence', 'Staleness — check the dated official RBI source', 'Bias — swap test', 'Instruction failure — compare with brief'], 1, 'Staleness needs a current, dated primary source.', 'medium'],
  [5, 'In SIFT, "Find better coverage" means:', ['Re-reading the page', 'Searching what reliable, independent sources say about the claim', 'Finding a better font', 'Asking the AI again'], 1, 'Lateral reading across sources.', 'easy'],
  [5, 'A golden set should be "frozen" because:', ['It is expensive', 'Tuning against it repeatedly makes it part of training and inflates scores', 'Models cannot read new data', 'It is a legal requirement'], 1, 'Same logic as a held-out test set.', 'hard'],
  [5, 'Which is independent verification of an AI-written function?', ['Asking the AI if it is correct', 'Running tests you wrote, including edge cases, and reading the code', 'Checking that it runs once', 'Counting its lines'], 1, 'Tests and reading are independent of the output.', 'easy'],
  [6, 'An analysis finds users of a feature renew 30% more. Before recommending a push, the key check is:', ['Chart colour', 'Confounders — compare similar users or run a randomised test', 'The model\'s name', 'Sample of one'], 1, 'Correlation ≠ causation.', 'medium'],
  [6, 'A trend in all branches combined is up, but down within every branch. This is:', ['Overfitting', 'Simpson\'s paradox', 'Leakage', 'Base-rate neglect'], 1, 'Break down by subgroups.', 'medium'],
  [6, 'Which use of AI best preserves learning?', ['Asking for full solutions to homework', 'Attempting first, then asking for hints and explanations of your specific error', 'Generating notes and reading them', 'Using AI only on exam day'], 1, 'Effort first, feedback second.', 'easy'],
  [6, 'A research report from a deep-research tool should be cited as:', ['The primary source', 'Not cited — cite the primary sources you verified', 'A peer-reviewed paper', 'An encyclopedia'], 1, 'The report is a map.', 'easy'],
  [7, 'A workflow\'s AI step times out. The well-designed behaviour is:', ['Drop the item silently', 'Retry a bounded number of times with backoff, then route to human review and alert', 'Retry forever', 'Send a blank message'], 1, 'Bounded retries + visible fallback.', 'medium'],
  [7, 'To cut AI cost in an email workflow, the first lever is usually:', ['Use the largest model', 'Filter irrelevant emails before the AI step', 'Run every email twice', 'Turn off logging'], 1, 'Do not pay to process noise.', 'easy'],
  [7, 'A custom assistant answers a question that is not in its documents with a confident guess. The fix is:', ['Add more starters', 'An explicit abstention instruction with a human contact, tested in the golden set', 'Raise temperature', 'Remove the documents'], 1, 'Grounding plus tested abstention.', 'medium'],
  [7, 'Why should an AI extraction step return JSON with a schema?', ['It looks neat', 'So later steps can branch on and map named fields reliably', 'JSON is cheaper', 'It avoids human review'], 1, 'Structure enables reliable automation.', 'easy'],
  [8, 'Your API conversation app sends only the latest user message. The symptom will be:', ['Higher accuracy', 'The model has no memory of earlier turns', 'Lower latency only', 'Rate-limit errors'], 1, 'The API is stateless.', 'easy'],
  [8, 'In function calling, the model returns a tool request with arguments. Your code should next:', ['Execute it without checks', 'Validate the arguments, run the function, and return the result to the model', 'Ignore it', 'Ask the user to run it'], 1, 'The app stays in control.', 'medium'],
  [8, 'recall@5 for your RAG system is 0.55 on policy questions. The priority is:', ['A stronger generation model', 'Improving retrieval: chunking, hybrid search, query rewriting, reranking', 'Higher temperature', 'Longer answers'], 1, 'The right chunk is often missing — fix retrieval.', 'hard'],
  [8, 'An intern can retrieve board minutes from the company RAG assistant. The correct fix is:', ['Ask the model not to reveal them', 'Enforce document permissions at retrieval time', 'Delete the intern\'s account', 'Use a smaller index'], 1, 'Access control belongs in retrieval, not prompts.', 'medium'],
  [9, 'Workflow vs agent: the key difference is:', ['Agents are always cheaper', 'In a workflow you define the steps; in an agent the model chooses them', 'Workflows cannot use AI', 'Agents have no tools'], 1, 'Who chooses the steps.', 'easy'],
  [9, 'Before connecting a third-party MCP server to your work accounts, the most important check is:', ['Its logo', 'Its source, the tools it exposes and the permissions it requires', 'Its speed', 'Its popularity on social media'], 1, 'A server is code you trust with access.', 'medium'],
  [9, 'Which is the strongest guardrail for a finance agent that drafts payments?', ['A strict system prompt', 'Draft-only access with human approval and validation of vendor and bank details', 'A bigger model', 'Running it at night'], 1, 'Permissions and approval are controls.', 'medium'],
  [9, 'An agent\'s evaluation should report:', ['One successful demo', 'Success rate across repeated runs, cost per success, and safety/injection test results', 'Total tokens only', 'Number of tools'], 1, 'Agents are stochastic.', 'hard'],
  [10, 'Removing the gender column from training data guarantees fairness.', ['True', 'False — proxies and historical patterns can still produce disparities', 'True for small models', 'True if accuracy is high'], 1, 'Test outcomes, not inputs.', 'easy'],
  [10, 'Under the DPDP Act, processing a 16-year-old\'s personal data for an edtech app requires:', ['No consent', 'Verifiable parental consent, with no targeted advertising or behavioural tracking of the child', 'Only the child\'s click', 'Government approval'], 1, 'Under-18s are children under the Act.', 'medium'],
  [10, 'Purely AI-generated images in many jurisdictions:', ['Have strong copyright for the prompter', 'May have weak or no copyright protection because human authorship is usually required', 'Belong to the GPU vendor', 'Are public domain everywhere by statute'], 1, 'Human contribution matters.', 'medium'],
  [10, 'Under the EU AI Act, emotion recognition in workplaces and schools is:', ['Minimal risk', 'Prohibited, with narrow exceptions', 'Encouraged', 'Transparency only'], 1, 'One of the listed prohibited practices.', 'hard'],
  [11, 'Why is indirect prompt injection especially dangerous for agents?', ['Agents read slowly', 'Agents read untrusted content and can take actions, so planted instructions can cause real effects', 'Agents use more tokens', 'It is not dangerous'], 1, 'Tools turn words into actions.', 'medium'],
  [11, 'The best organisational control against deepfake CEO payment fraud is:', ['Better video quality', 'Mandatory call-back verification and two-person approval for transfers', 'Banning video calls', 'Trusting senior voices'], 1, 'Process beats perception.', 'easy'],
  [11, 'Shadow AI is best reduced by:', ['A total ban', 'Providing good approved tools, a clear policy with examples, training and DLP', 'Ignoring it', 'Monitoring personal phones'], 1, 'Make the safe path easy.', 'medium'],
  [11, 'A red-team finding of high severity should end as:', ['A note in a chat', 'A root-cause fix plus a permanent regression test', 'A deleted log', 'A lower severity label'], 1, 'Fix it and keep it fixed.', 'easy'],
  [12, 'The most useful unit for analysing how AI changes a job is:', ['The job title', 'The tasks within the job', 'The company logo', 'The salary band'], 1, 'Exposure is task-level.', 'easy'],
  [12, 'In STAR-V, the V adds:', ['Vision', 'How you verified the result was right', 'Velocity', 'Volume'], 1, 'Verification is the AI-literate addition.', 'easy'],
  [12, 'A capstone claim "improves staff productivity" has no measurement yet. In your claims map you should:', ['Keep it — it is probably true', 'Remove or downgrade it and plan how it would be measured', 'Make up a number', 'Move it to the title'], 1, 'Every claim needs evidence.', 'medium'],
  [12, 'Asked a hard question you cannot fully answer in your defence, the strongest response is:', ['Bluff confidently', '"Here is what I measured, here is the gap, and here is how I would find out"', 'Change the topic', '"The AI did that part"'], 1, 'Honest separation of evidence and belief.', 'medium'],
];

const examBank: ExamQuestion[] = bankRaw.map(([mod, prompt, options, correct, explanation, difficulty], i) => {
  const id = `aif-bank-${String(i + 1).padStart(2, '0')}`;
  return { id, prompt, ...placeOptions(id, options, correct), explanation, difficulty, topic: M(mod) };
});

const totalMinutes = modules.reduce(
  (n, m) => n + m.lessons.reduce((k, l) => k + l.duration_minutes, 0),
  0
);

export function getAIFirstCourse(): Course {
  return {
    id: COURSE_ID,
    slug: 'ai-first',
    title: 'AI.FIRST — Future-Ready Intelligence, Skills & Technology',
    subtitle:
      "Don't just use AI. Understand it, verify it, build with it and answer for it. Twelve modules, twelve proofs of work, one credential you have to defend.",
    description: `**AI.FIRST** is the complete, practical AI course for students and professionals who want to be genuinely future-ready — not just able to type into a chatbot.

It is built on four pillars. **Understand** how AI, machine learning and large language models really work, and how to choose a model on quality, cost and privacy. **Verify** every output: a seven-type error taxonomy, lateral reading, checking numbers, code and citations, and building your own evaluation. **Build** with AI — no-code workflows, Python API apps with structured output and RAG, and agents connected to tools through MCP. **Answer for it** — bias, privacy under India's DPDP Act, copyright, regulation, prompt injection, deepfake scams and incident response.

**Start with a readiness test.** A secure, timed, fullscreen paper checks what you already know module by module. Ace a module and it is tested out — you do not have to study it — and test out enough of them to unlock a cheaper personalised path.

**Twelve proofs of work, three pathways.** Every module ends with a real deliverable in your pathway — **Explorer** (no code), **Builder** (code) or **Leader** (policy and strategy) — that together become your portfolio.

**One credential you have to defend.** The certificate is issued only after you pass the final exam and submit a capstone with a claims map, evidence pack and recorded defence.`,
    category: 'AI & Data Science',
    level: 'beginner',
    is_free: false,
    price_inr: 99,
    thumbnail_url: '',
    thumbnail_alt: 'AI.FIRST course cover — Future-Ready Intelligence, Skills & Technology',
    tags: [
      'ai', 'generative-ai', 'llm', 'prompt-engineering', 'rag', 'agents', 'mcp', 'ai-ethics',
      'ai-security', 'dpdp', 'automation', 'n8n', 'python', 'career', 'flagship',
    ],
    outcomes: [
      'Explain how machine learning, neural networks and LLMs work — tokens, embeddings, attention, training and sampling',
      'Choose a model on quality, cost, latency and privacy with real token arithmetic',
      'Write prompts and engineer context that produce reliable, checkable output',
      'Verify AI output: classify errors, read laterally, recompute numbers, test code and check citations',
      'Build golden-set evaluations with rubrics and catch regressions before they ship',
      'Automate real work with no-code AI workflows that are reliable, affordable and safe',
      'Ship a small Python AI app with structured output, function calling and RAG',
      'Design agents with MCP tools, guardrails and repeat-run evaluation',
      'Handle bias, privacy (DPDP Act), copyright and regulation (EU AI Act) professionally',
      'Defend against prompt injection, deepfake scams and data leakage, and run an AI incident response',
      'Assemble twelve proofs of work into a portfolio and defend a capstone under questioning',
    ],
    prerequisite_course_id: null,
    certificate_eligible: true,
    published: true,
    created_at: '2026-11-03T09:00:00.000Z',
    updated_at: '2026-11-03T09:00:00.000Z',
    instructor_id: null,
    about_course: `### Four pillars, twelve modules

| Pillar | Modules |
|---|---|
| **UNDERSTAND** | 1 What AI actually is · 2 Inside a large language model · 3 The 2026 model landscape |
| **VERIFY** | 4 Prompting & context engineering · 5 Verifying AI output · 6 AI for research, study & analysis |
| **BUILD** | 7 No-code AI workflows · 8 Building with AI APIs · 9 Agents, tools & MCP |
| **ANSWER FOR IT** | 10 Responsible AI · 11 AI security & trust · 12 AI at work & your defence |

Every one of the 48 lessons follows the same nine-step shape — objective, a real-world hook, the concept, a **diagram**, a worked example, a practice task, common mistakes, an interview angle and a summary — and ends with a graded quiz.

### The readiness test — study only what you need
Before you buy, sit a **50-minute secure test** (fullscreen, timed, copy-paste blocked) with four questions from each of Modules 1–11. Answer every question of a module correctly and that module is **tested out**: its lessons are marked complete and you can skip straight past them. Test out 3 or more modules and you can choose a **personalised path** at a lower price — ₹79, ₹69 or as low as ₹49 — or keep the full course at ₹99. Module 12, the defence, is never skipped, and the final exam and capstone are always required, so the credential means the same thing for everyone.

### Three pathways, twelve proofs of work
Each module ends with a proof of work in three variants. **Explorer** needs no code. **Builder** writes and ships code. **Leader** writes the memo, policy or plan a team would actually use. Together the twelve become your portfolio.

### Three credentials
- **AI.FIRST Certified** — pass the final exam and submit the defended capstone.
- **AI.FIRST Certified with Distinction** — 85% or more on your first exam attempt.
- **Verified proof-of-work portfolio** — the capstone link and the twelve proofs your certificate stands on.

### Made for India, honest about the facts
Worked examples use rupees, UPI, Indian colleges, placement cells, the DPDP Act, RBI and 1930 / cybercrime.gov.in. Fast-moving facts — model names, prices, regulation dates — are dated and hedged, and you are taught to re-check them.`,
    prerequisites: [
      'No coding or AI background needed for the Explorer and Leader pathways',
      'Builder pathway: basic Python helps (variables, functions, pip) — Module 8 starts from your first API call',
      'A laptop or phone with internet; free tiers of the tools are enough',
    ],
    audience: [
      'Students of every branch who want to be genuinely AI-ready for placements and higher studies',
      'Freshers and professionals whose work is being reshaped by AI',
      'Developers who want to build evaluated, safe AI apps and agents',
      'Team leads, founders and administrators deciding how their organisation should adopt AI',
      'Anyone who wants to stop guessing whether an AI answer is true',
    ],
    audio_language: '',
    caption_language: '',
    branch: 'ai-ds',
    branch_label: 'AI & Data Science — open to all branches',
    bucket: 'C',
    certificate_tier: 'premium',
    estimated_hours: Math.floor(totalMinutes / 60),
    perks: [
      { key: 'certificate', label: 'Verifiable certificate' },
      { key: 'xp', label: 'XP on the leaderboard' },
    ],
    exam_prep: {
      target: 'AI.FIRST final exam, AI-literacy interviews and AI case rounds',
      units: [
        {
          title: 'How AI and ML work (M1)',
          summary: 'AI ⊃ ML ⊃ DL ⊃ GenAI. Diagnostic: rules or learned? Training = predict → loss → gradients → update. Judge on unseen data; overfit vs underfit vs leakage; baselines before accuracy. Neurons, layers, backprop. Data + compute + transformer = the wave; foundation models.',
          questions: [
            'Place five products on the AI map with evidence.',
            'Why is 99% accuracy meaningless on a 99%-negative dataset?',
            'Explain backpropagation without equations.',
          ],
          pyqs: [],
        },
        {
          title: 'Inside an LLM (M2)',
          summary: 'Tokens (~4 chars), next-token loop. Embeddings place meaning; cosine measures relatedness not truth. Attention: tokens weigh context. Pretraining → instruction tuning → preference tuning (RLHF/DPO) → sycophancy, cutoff. Temperature/top-p; context window; lost in the middle; hallucination causes and levers.',
          questions: [
            'Why do LLMs hallucinate and how do you reduce it?',
            'RAG vs fine-tuning vs prompting — when each?',
            'What is sycophancy and where does it come from?',
          ],
          pyqs: [],
        },
        {
          title: 'Models, cost and choice (M3)',
          summary: 'Closed vs open-weight (licences!). Multimodal strengths and failures; diffusion. Reasoning models (test-time compute) vs agents (loop + tools). Cost = requests × (in × p_in + out × p_out)/1M. Routing, caching, batch. 30-example blind evaluation decides.',
          questions: [
            'Compute a monthly bill and cut it with routing.',
            'When is a reasoning model worth 10× the cost?',
            'API or self-hosted for a hospital — and why?',
          ],
          pyqs: [],
        },
        {
          title: 'Prompting and context (M4)',
          summary: 'Six parts: role, task, context, constraints, format, done-criteria. Few-shot: varied, balanced, correct; closed label sets. Chain: extract → analyse → draft → critique → revise. Self-critique ≠ verification. Context engineering: relevant, labelled, question last; summarise-and-restart; tested prompt library.',
          questions: [
            'Rebuild a weak prompt with the six parts.',
            'Why did my few-shot classifier drift?',
            'What is context engineering?',
          ],
          pyqs: [],
        },
        {
          title: 'Verification and evaluation (M5–M6)',
          summary: 'Seven error types and their checks; atomic claims. SIFT lateral reading; primary sources. Numbers: estimate, recompute, units. Code: tests, edge cases, deps. Citations: exists, metadata, supports. Golden sets (incl. refusal), rubrics, calibrated LLM-judge, per-category regression. Research map → primaries; learning with effort; analysis sanity checks; specific writing and disclosure.',
          questions: [
            'Verify an AI report before it goes to your manager.',
            'How do you evaluate a prompt change?',
            'Correlation or causation — the mentoring example.',
          ],
          pyqs: [],
        },
        {
          title: 'Building: workflows, APIs, RAG, agents (M7–M9)',
          summary: 'Trigger → steps → output; logic first, AI for the messy middle; human checkpoints. Custom assistants: ground, cite, abstain, dated files. JSON schemas; mapping bugs; draft before send; idempotency, bounded retries, cost caps, secrets. Stateless API; tool-use loop; exactness in code. RAG pipeline; retrieval vs generation failures; recall@k; ACLs. Agents: loop, stop conditions, MCP, coding-agent workflow, layered guardrails, repeat-run evaluation.',
          questions: [
            'Design an email-triage workflow end to end.',
            'Explain RAG and debug a wrong answer.',
            'How do you make an agent safe to deploy?',
          ],
          pyqs: [],
        },
        {
          title: 'Answering for AI (M10–M12)',
          summary: 'Bias sources, swap tests, group-wise errors, conflicting fairness definitions. DPDP: fiduciary, consent, minimisation, children, penalties; never-paste list. Copyright uncertainty, consent for likeness, labelling, disclosure. EU AI Act tiers; India\'s approach; impact assessments. Injection (direct/indirect), deepfake scams (1930), shadow AI, incident response, red-teaming. Tasks not titles; portfolio; STAR-V, CLEAR; claims map and defence.',
          questions: [
            'How can a model be biased without protected attributes?',
            'Indirect prompt injection — what and how to defend?',
            'Walk through your capstone\'s claims map.',
          ],
          pyqs: [],
        },
      ],
      important_questions: [
        'Why do large language models hallucinate, and what would you do about it in a product?',
        'Explain RAG and how you would improve a RAG system giving wrong answers.',
        'How would you choose an LLM for a production feature? Show the cost arithmetic.',
        'How do you verify an AI-generated report before it goes out under your name?',
        'How would you evaluate whether a prompt or model change is an improvement?',
        'What is an AI agent, and how do you make one safe enough to deploy?',
        'What is indirect prompt injection and how do you defend against it?',
        'How do the DPDP Act and the EU AI Act affect how an Indian team builds with AI?',
        'Tell me about a time AI gave you a wrong answer — and how you caught it.',
      ],
    },
    // Final exam: 25 of 48, pass 65, distinction 85 first attempt, 24h retake.
    exam: {
      question_count: 25,
      duration_minutes: 40,
      passing_percent: 65,
      retake_cooldown_hours: 24,
      distinction_percent: 85,
      bank: examBank,
    },
    project: {
      title: 'AI.FIRST capstone — your defended portfolio',
      brief:
        'Submit one public folder link containing: (1) your twelve proofs of work PoW-01…PoW-12 in your pathway (Explorer, Builder or Leader); (2) the capstone for your pathway — Explorer: an AI-first toolkit for a real person or group; Builder: an evaluated AI app or agent with a red-team report and cost model; Leader: an AI adoption plan with impact assessment, AI-use policy and pilot design; (3) a claims map in which every important claim links to its evidence; (4) a 10-minute recorded defence (problem, design, evidence, risks, next steps) that answers at least three of the Module 12.4 hard questions; (5) an AI-use disclosure. Remove all personal and confidential data before sharing.',
      submission_hint: 'One public link (Drive folder, GitHub repo or Notion page) — anyone with the link can view.',
      required_for_certificate: true,
    },
    readiness: {
      per_module: 4,
      duration_minutes: 50,
      retake_cooldown_hours: 24,
      max_attempts: 3,
      foundation_below_percent: 35,
      foundation_course_slug: 'ai-literacy-everyone',
      untestable_module_ids: [M(12)],
      offer_tiers: [
        { min_tested_out: 8, price_inr: 49 },
        { min_tested_out: 5, price_inr: 69 },
        { min_tested_out: 3, price_inr: 79 },
      ],
      bank: readinessBank,
    },
    modules,
  };
}
