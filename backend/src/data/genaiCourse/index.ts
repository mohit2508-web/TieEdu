// ============================================================================
// GENERATIVE AI FOR STUDENTS — flagship paid course (Phase 4 course 8).
//
// How LLMs work, prompting that works, RAG/evaluation/engineering basics and
// applied study/career workflows. Four modules, eight lessons on the 9-block
// standard, 30-question exam bank. Priced at ₹799.
// ============================================================================

import type { Course, ExamQuestion } from '../db';
import { module1 } from './module1';
import { module2 } from './module2';
import { module3 } from './module3';
import { module4 } from './module4';

const examBank: ExamQuestion[] = [
  {
    id: 'ai-exam-01',
    prompt: 'A language model is trained primarily to:',
    options: ['Predict the next token', 'Query a database', 'Verify facts', 'Search the web'],
    correct_index: 0,
    explanation: 'Next-token prediction is the core training objective.',
    difficulty: 'easy',
    topic: 'LLM basics',
  },
  {
    id: 'ai-exam-02',
    prompt: 'Roughly how many tokens does one English word use?',
    options: ['0.25', '0.75', '2', '4'],
    correct_index: 1,
    explanation: 'About three-quarters of a token per word on average.',
    difficulty: 'easy',
    topic: 'LLM basics',
  },
  {
    id: 'ai-exam-03',
    prompt: 'The context window limits:',
    options: ['Model training time', 'Tokens attendable per request', 'Output style', 'Billing only'],
    correct_index: 1,
    explanation: 'Input plus output tokens within the model’s per-request attention limit.',
    difficulty: 'easy',
    topic: 'LLM basics',
  },
  {
    id: 'ai-exam-04',
    prompt: 'Setting temperature near 0 is best for:',
    options: ['Poetry', 'Deterministic extraction', 'Brainstorming', 'Random names'],
    correct_index: 1,
    explanation: 'Low temperature minimizes sampling variance.',
    difficulty: 'easy',
    topic: 'Sampling',
  },
  {
    id: 'ai-exam-05',
    prompt: 'Top-p sampling keeps tokens whose cumulative probability exceeds:',
    options: ['p', '1−p', 'temperature', 'context size'],
    correct_index: 0,
    explanation: 'Nucleus sampling truncates the tail after probability p.',
    difficulty: 'medium',
    topic: 'Sampling',
  },
  {
    id: 'ai-exam-06',
    prompt: 'Hallucination means:',
    options: ['Server crash', 'Fluent but unsupported claims', 'Too many tokens', 'Schema error'],
    correct_index: 1,
    explanation: 'Generation that does not reflect facts or provided context.',
    difficulty: 'easy',
    topic: 'Reliability',
  },
  {
    id: 'ai-exam-07',
    prompt: 'Knowledge cutoff is best addressed with:',
    options: ['Higher temperature', 'RAG or live tools', 'Longer role prompts', 'Lower top-p'],
    correct_index: 1,
    explanation: 'Fresh context at request time.',
    difficulty: 'easy',
    topic: 'Reliability',
  },
  {
    id: 'ai-exam-08',
    prompt: 'RAG stands for:',
    options: ['Random answer generation', 'Retrieval-augmented generation', 'Ranked adaptive grouping', 'Recursive agent graph'],
    correct_index: 1,
    explanation: 'Retrieve documents, then generate grounded answers.',
    difficulty: 'easy',
    topic: 'RAG',
  },
  {
    id: 'ai-exam-09',
    prompt: 'Why include overlap when chunking documents?',
    options: ['Save storage', 'Keep boundary-spanning content in at least one chunk', 'Faster embedding', 'Reduce cost'],
    correct_index: 1,
    explanation: 'Prevents answers from being split across chunk edges.',
    difficulty: 'medium',
    topic: 'RAG',
  },
  {
    id: 'ai-exam-10',
    prompt: 'Hybrid retrieval combines:',
    options: ['Two LLMs', 'Vector and keyword search', 'Fine-tune and prompt', 'Cache and queue'],
    correct_index: 1,
    explanation: 'Semantic plus exact-match coverage.',
    difficulty: 'medium',
    topic: 'RAG',
  },
  {
    id: 'ai-exam-11',
    prompt: 'The four-part prompt skeleton is:',
    options: ['Role, Task, Constraints, Format', 'Ask, Answer, Cite, Stop', 'Topic, Length, Tone, Emoji', 'In, Out, Log, Retry'],
    correct_index: 0,
    explanation: 'The production brief-writing pattern.',
    difficulty: 'easy',
    topic: 'Prompting',
  },
  {
    id: 'ai-exam-12',
    prompt: 'Few-shot examples are mainly used to:',
    options: ['Reduce cost', 'Demonstrate exact style and schema', 'Raise temperature', 'Avoid tools'],
    correct_index: 1,
    explanation: 'Show the desired output concretely.',
    difficulty: 'easy',
    topic: 'Prompting',
  },
  {
    id: 'ai-exam-13',
    prompt: 'Chaining prompts means:',
    options: ['One long prompt', 'Ordered sub-prompts with structured handoffs', 'Multiple temperatures', 'Repeating the same ask'],
    correct_index: 1,
    explanation: 'Step outputs feed later steps as parsed inputs.',
    difficulty: 'easy',
    topic: 'Prompting',
  },
  {
    id: 'ai-exam-14',
    prompt: 'A critic step in a chain is for:',
    options: ['More tokens', 'Catching unsupported or vague content', 'Faster inference', 'Lower cost'],
    correct_index: 1,
    explanation: 'Second-pass quality control.',
    difficulty: 'easy',
    topic: 'Prompting',
  },
  {
    id: 'ai-exam-15',
    prompt: 'When should you use a tool call instead of a longer prompt?',
    options: ['For live data, math and code execution', 'When you want more adjectives', 'To raise temperature', 'To shorten the system prompt'],
    correct_index: 0,
    explanation: 'Facts that must be current/correct belong in tools.',
    difficulty: 'easy',
    topic: 'Engineering',
  },
  {
    id: 'ai-exam-16',
    prompt: 'Model-emitted JSON should be:',
    options: ['Used as-is', 'Schema-validated with retry path', 'Parsed by eye only', 'Avoided always'],
    correct_index: 1,
    explanation: 'Validation is part of the design.',
    difficulty: 'easy',
    topic: 'Engineering',
  },
  {
    id: 'ai-exam-17',
    prompt: 'recall@k measures:',
    options: ['Answer length', 'Relevant chunks present in top-k', 'Dollar cost', 'First-token latency'],
    correct_index: 1,
    explanation: 'Retrieval quality independent of generation.',
    difficulty: 'medium',
    topic: 'Evaluation',
  },
  {
    id: 'ai-exam-18',
    prompt: 'A golden eval set is:',
    options: ['A large labeled test', 'A set of real examples with expected behavior for regressions', 'A cost tracker', 'A safety filter'],
    correct_index: 1,
    explanation: 'Run it on every prompt/model/index change.',
    difficulty: 'easy',
    topic: 'Evaluation',
  },
  {
    id: 'ai-exam-19',
    prompt: 'Prompt injection is:',
    options: ['Model memory bug', 'Instructions hidden in untrusted content', 'Token overflow', 'Temperature bug'],
    correct_index: 1,
    explanation: 'Data attempting to become instructions.',
    difficulty: 'easy',
    topic: 'Safety',
  },
  {
    id: 'ai-exam-20',
    prompt: 'A good defense against injection is:',
    options: ['Higher temperature', 'Delimit data, least-privilege tools, confirm side effects', 'Longer examples', 'Top-p=1'],
    correct_index: 1,
    explanation: 'Separation of data and instructions plus permission limits.',
    difficulty: 'medium',
    topic: 'Safety',
  },
  {
    id: 'ai-exam-21',
    prompt: 'Unit cost of an LLM feature is driven mainly by:',
    options: ['User count only', 'Input and output tokens × rates', 'UI design', 'Number of tools'],
    correct_index: 1,
    explanation: 'Pricing is per token for both directions.',
    difficulty: 'easy',
    topic: 'Cost',
  },
  {
    id: 'ai-exam-22',
    prompt: 'For classification tasks, best practice is to:',
    options: ['Always use the largest model', 'Use a small model with structured output', 'Set temperature to 1', 'Add more examples than needed'],
    correct_index: 1,
    explanation: 'Right-size the model to task difficulty.',
    difficulty: 'easy',
    topic: 'Cost',
  },
  {
    id: 'ai-exam-23',
    prompt: 'When debugging a bad RAG answer, first check:',
    options: ['UI', 'Whether the right chunks were retrieved', 'Temperature only', 'Font of docs'],
    correct_index: 1,
    explanation: 'Fix recall before rewriting generation prompts.',
    difficulty: 'medium',
    topic: 'RAG',
  },
  {
    id: 'ai-exam-24',
    prompt: 'Safe resume tailoring means:',
    options: ['Adding dream skills', 'Reordering and sharpening true experience', 'Changing dates', 'Inventing internships'],
    correct_index: 1,
    explanation: 'Tailoring maps truth to the JD; it does not create truth.',
    difficulty: 'easy',
    topic: 'Career',
  },
  {
    id: 'ai-exam-25',
    prompt: 'Best mock interview setup:',
    options: ['Long monologue', 'One question at a time with critique', 'Answer key only', 'No feedback'],
    correct_index: 1,
    explanation: 'Interactive rounds with structured feedback.',
    difficulty: 'easy',
    topic: 'Career',
  },
  {
    id: 'ai-exam-26',
    prompt: 'If an assessment forbids AI tools, you should:',
    options: ['Use them quietly', 'Follow the rule', 'Paraphrase to hide it', 'Skip applying'],
    correct_index: 1,
    explanation: 'Policy compliance.',
    difficulty: 'easy',
    topic: 'Ethics',
  },
  {
    id: 'ai-exam-27',
    prompt: 'Function calling primarily enables:',
    options: ['Faster tokens', 'The model selecting tools and arguments for your code to execute', 'Lower prices', 'Longer context'],
    correct_index: 1,
    explanation: 'Model decides the call; your code performs it.',
    difficulty: 'easy',
    topic: 'Engineering',
  },
  {
    id: 'ai-exam-28',
    prompt: 'Streaming responses mainly improves:',
    options: ['Accuracy', 'Perceived latency (time-to-first-token)', 'Retrieval recall', 'Schema validity'],
    correct_index: 1,
    explanation: 'Users see text as it is generated.',
    difficulty: 'easy',
    topic: 'Cost',
  },
  {
    id: 'ai-exam-29',
    prompt: 'Why not trust model-printed URLs as citations?',
    options: ['URLs are always wrong', 'Citation-shaped strings are easy to generate and often fake', 'URLs cost extra', 'Models cannot read URLs'],
    correct_index: 1,
    explanation: 'Open links yourself; verify sources.',
    difficulty: 'easy',
    topic: 'Reliability',
  },
  {
    id: 'ai-exam-30',
    prompt: 'Least-privilege tooling means:',
    options: ['Give all APIs to the model', 'Only the minimum permissions the task needs', 'Disable JSON', 'Raise temperature'],
    correct_index: 1,
    explanation: 'Limits blast radius of injected or wrong calls.',
    difficulty: 'easy',
    topic: 'Safety',
  },
];

export function getGenAICourse(): Course {
  return {
    id: 'crs-genai-students',
    slug: 'generative-ai-students',
    title: 'Generative AI for Students',
    subtitle:
      'LLM fundamentals, prompting, RAG and applied workflows — the AI literacy every placement and product role expects',
    description: `Generative AI stopped being a novelty and became a baseline skill on job descriptions. This course gives you the mental model and the working habits: how language models actually predict text, why they hallucinate, how to write prompts that behave like briefs, how retrieval-augmented generation grounds answers in real documents, and how to evaluate, cost and secure a GenAI feature.

Four modules, eight lessons on the nine-step standard: objective, hook, concept, worked example, practice, common mistakes, exam angle, server-graded quiz and revision summary. A 30-question bank feeds the timed final exam; passing earns a verifiable TieEdu certificate.

**Who this is for:** students and early-career engineers who use chatbots daily but cannot yet explain tokens, context windows or RAG — and who need repeatable workflows for research, writing, coding and placement prep without getting burned by fabricated citations.

**What you need:** access to any mainstream chat assistant for the practice prompts. No coding is required, though Module 3 shows how engineers wire models into products.`,
    category: 'Artificial Intelligence',
    level: 'beginner',
    is_free: false,
    price_inr: 799,
    thumbnail_url: '',
    thumbnail_alt: 'Generative AI for Students course cover',
    tags: ['genai', 'llm', 'prompting', 'rag', 'ai', 'career'],
    outcomes: [
      'Explain next-token prediction, tokens, context windows and temperature',
      'Diagnose hallucination and apply grounding, RAG and verification mitigations',
      'Write prompts using the role/task/constraints/format skeleton with few-shot examples',
      'Chain prompts and add critic passes for complex tasks',
      'Describe a RAG pipeline and choose sensible chunking and retrieval strategies',
      'Build a golden eval set and track token cost for a GenAI feature',
      'Defend against prompt injection and handle PII with practical controls',
      'Run safe workflows for research, writing, coding and placement preparation',
    ],
    prerequisite_course_id: null,
    certificate_eligible: true,
    // Phase 4 decision: paid courses stay unpublished until payment infra lands.
    published: false,
    created_at: '2026-10-13T19:00:00.000Z',
    updated_at: '2026-10-13T19:00:00.000Z',
    instructor_id: null,
    about_course: `Most "intro to AI" content either oversells the magic or drowns you in math you do not need yet. This course sits in the applied middle: enough mechanism to predict how the tool will behave, and enough engineering to build or evaluate real features.

Module 1 builds the probability-machine mental model — tokens, windows, sampling, hallucination and retrieval — so every later trick has an explanation. Module 2 turns prompting from incantation into brief-writing with a reusable skeleton and chain patterns. Module 3 covers what happens when you ship: chunking, hybrid retrieval, structured outputs, evaluation, cost tiers and safety. Module 4 applies all of it to study, writing, coding and career workflows, with verification treated as part of the workflow rather than an afterthought.

Each lesson ends with a server-graded quiz; the course closes with a 15-question timed exam from a 30-question bank. Passing earns a verifiable TieEdu certificate.`,
    prerequisites: [
      'Daily comfort using a chat assistant (any tool)',
      'Basic computer literacy; no programming required',
    ],
    audience: [
      'Students preparing for AI-forward internships and placements',
      'Junior engineers adding GenAI literacy to their profile',
      'Project builders wiring chat features into apps',
      'Anyone tired of unreliable AI outputs and fake citations',
    ],
    audio_language: 'English',
    caption_language: 'English',
    branch: 'ai-ds',
    branch_label: 'AI/DS primary (open to all branches)',
    bucket: 'D',
    certificate_tier: 'professional',
    estimated_hours: 6,
    perks: [
      { key: 'certificate', label: 'Verifiable certificate' },
      { key: 'xp', label: 'XP on the leaderboard' },
    ],
    exam_prep: {
      target: 'AI-literacy screenings, AI-forward internship interviews and product assessments',
      units: [
        {
          title: 'LLM Fundamentals',
          summary:
            'Next-token prediction; subword tokens ~0.75/word; context window = per-request attention limit. Low temperature for determinism; top-p trims the tail. Hallucination = plausible completion; mitigate with RAG, grounding, verification. Knowledge cutoff needs tools or retrieval.',
          questions: [
            'What limits how much text a model can see in one request?',
            'Why do models invent citations?',
            'When do you set temperature near 0?',
          ],
          pyqs: [],
        },
        {
          title: 'Prompt Engineering',
          summary:
            'Skeleton: Role, Task, Constraints, Format. Few-shot pins style. Delimit data separately from instructions. Chain complex work with JSON handoffs; add a critic pass. Tools over prompt-stuffing for facts, math, code.',
          questions: [
            'Name the four parts of a reliable prompt.',
            'When is chaining worth the extra calls?',
            'Give one defense against prompt injection.',
          ],
          pyqs: [],
        },
        {
          title: 'RAG, Evaluation and Safety',
          summary:
            'Ingest→chunk (300–800 tokens, overlap)→embed→hybrid retrieve→generate with citations. Validate JSON with schemas. Golden sets for regressions; check recall@k before prompt rewrites. Cost = tokens×rates; tier models. Injection: data delimiters, least privilege, confirm side effects.',
          questions: [
            'Why does chunk overlap matter?',
            'What does recall@k measure?',
            'How do you estimate monthly feature cost?',
          ],
          pyqs: [],
        },
        {
          title: 'Applied Workflows',
          summary:
            'Research: sources first, synthesize with quotes, verify manually. Writing: outline→draft→critic→your edit. Code: contract→plan→code→tests→security review. Careers: tailor truthfully; mock interviews one question at a time; never fabricate.',
          questions: [
            'What is the safe order for a literature summary?',
            'Name two rules for AI-assisted coding.',
            'What makes resume tailoring unsafe?',
          ],
          pyqs: [],
        },
      ],
      important_questions: [
        'Explain next-token prediction and why temperature changes outputs.',
        'Diagnose a hallucinated citation and propose three mitigations.',
        'Rewrite a vague request using the four-part skeleton with one few-shot example.',
        'Design a three-step chain with JSON handoffs for a document task.',
        'Lay out a RAG pipeline and choose a chunking strategy for a policy PDF.',
        'Build a five-example golden set and state what you assert for each.',
        'Estimate daily cost of a summarization feature from token counts.',
        'Defend a chat feature against prompt injection and PII leakage.',
        'Create a research workflow that cannot fabricate citations.',
        'Run a mock interview format that produces actionable feedback.',
      ],
      previous_year_questions: [
        {
          year: '2025',
          question: 'What is the difference between temperature and top-p?',
          solution: 'Temperature scales logits before sampling; top-p truncates the nucleus of candidates by cumulative probability.',
        },
        {
          year: '2024',
          question: 'Explain RAG and one reason it reduces hallucination.',
          solution: 'Retrieve relevant docs into context so claims can be grounded in provided sources.',
        },
        {
          year: '2025',
          question: 'How would you evaluate a document-QA bot?',
          solution: 'Separate recall@k for retrieval from faithfulness/correctness for generation on a golden set.',
        },
      ],
    },
    exam: {
      question_count: 15,
      duration_minutes: 30,
      passing_percent: 60,
      retake_cooldown_hours: 24,
      distinction_percent: 85,
      bank: examBank,
    },
    project: {
      title: 'Grounded document assistant (design + prompt pack)',
      brief:
        'Pick a real 10–30 page document you have rights to use (course syllabus, company handbook, open-source docs). Deliver: (1) a chunking plan with size, overlap and metadata; (2) a retrieval spec (hybrid or vector, top-k, re-rank if any); (3) the full prompt pack — system prompt with role/task/constraints/format, data delimiters, citation requirement and a "say you do not know" rule; (4) a golden set of 10 questions with expected answers or refusal cases and how you would score faithfulness; (5) a short cost/latency estimate assuming a mid-tier model. Optional bonus: wire it with any API or no-code tool and include screenshots. Submit as one PDF or a repo.',
      submission_hint: 'One PDF/repo with chunking plan, retrieval spec, prompt pack, 10-item golden set and cost estimate; screenshots optional.',
      required_for_certificate: true,
    },
    modules: [module1, module2, module3, module4],
  };
}
