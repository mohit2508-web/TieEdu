// Module 1 — How LLMs Work
import type { CourseModule } from '../db';
import { nineBlocks, tip, warn, info } from '../nineBlocks';
import { lesson, M1, COURSE_ID } from './helpers';

export const module1: CourseModule = {
  id: M1,
  course_id: COURSE_ID,
  title: 'Module 1 — How Language Models Actually Work',
  summary:
    'Tokens, next-token prediction, context windows and why models hallucinate — the mental model that makes every tool usable.',
  sort_order: 1,
  lessons: [
    lesson(
      M1,
      'ai-1-1',
      1,
      'Tokens, Prediction and Context',
      'What a language model computes, how far it can "see", and what temperature really changes.',
      11,
      nineBlocks({
        objectives: [
          'Explain next-token prediction in plain language',
          'Estimate tokens from text and understand context-window limits',
          'Describe what temperature and top-p sampling control',
        ],
        hook: 'A chatbot does not "know" facts the way a database does. It predicts likely next tokens from patterns in training data. Once you see it as a probability machine, hallucinations and prompt tricks stop being mysterious.',
        concept: `**Training objective:** a language model is trained to predict the next token given all previous tokens. "Large" refers to parameter count; the capability emerges from scale, not from a separate reasoning engine.

**Tokenization:** text is split into subword tokens (roughly 4 characters or ~0.75 English words per token). "unbelievable" might be un-believ-able — three tokens. Token count matters because it drives cost and the context limit.

**Context window:** the maximum number of tokens the model can attend to at once (8k, 32k, 128k, 200k+ depending on the model). Text beyond the window is invisible to that request — the model is not "forgetting", it never saw it.

**Temperature:** scales logits before sampling. Low (0–0.3) → more deterministic, good for extraction and code. High (0.7–1.2) → more varied, good for brainstorming. Temperature 0 is not strictly greedy across implementations, but behaves near-deterministic.

**Top-p (nucleus) sampling:** keep the smallest set of tokens whose cumulative probability exceeds p (e.g. 0.9). Temperature and top-p both shape randomness; you rarely need to change both.`,
        extras: [
          tip(
            'Estimate tokens roughly',
            'One token ≈ ¾ of an English word. 1000 words ≈ 1300 tokens. Code and non-English text tokenize less efficiently.',
          ),
          warn(
            'The model is not a search engine',
            'It generates plausible continuations. Factual claims must be verified against trusted sources — especially numbers, citations and APIs.',
          ),
          info(
            'Why "large"',
            'GPT-style models have billions of parameters. The pattern capacity comes from scale plus training data diversity, not from hand-written rules.',
          ),
        ],
        worked: {
          title: 'Estimate context for a resume review',
          problem: 'A 900-word resume plus a 150-word job description are sent to a model with a 32k context window. Will it fit?',
          steps: [
            { title: 'Estimate tokens', desc: 'Estimate tokens: (900+150) words × ~1.3 tokens/word ≈ 1365 tokens of input.' },
            { title: 'Add overhead', desc: 'Add room for the system prompt and the response (say 500 tokens).' },
            { title: 'Compare to window', desc: 'Total ≈ 1900 tokens — far under 32k.' },
          ],
          solution: 'Yes, easily. Even a 50-page PDF would typically fit in a 128k window; a 500-page book often would not.',
        },
        practice: {
          title: 'Token budget for a long document',
          prompt: 'How many pages of typical English prose fit in an 8k context window if one page ≈ 500 words?',
          hint: '8000 tokens ÷ (500 × 1.3 tokens/word).',
        },
        mistakes: [
          {
            mistake: 'Assuming infinite memory across chats',
            fix: 'Unless the product stores notes or uses retrieval, each new conversation starts cold.',
          },
          {
            mistake: 'Setting temperature high for data extraction',
            fix: 'Extraction and classification want low temperature so the same input yields stable output.',
          },
        ],
        exam: {
          question: 'What does the context window limit?',
          answer: 'The total tokens (input + generated output, model-dependent) the model can attend to in one request.',
          source: 'Common product / interview screening question.',
        },
        summary: [
          'LLMs predict the next token; "knowledge" is pattern, not a database.',
          'Tokens drive cost and context limits; window is hard per-request.',
          'Low temperature = deterministic; high = creative. Top-p trims the tail.',
        ],
      }),
      [
        [
          'A language model primarily predicts:',
          ['The next token', 'Database rows', 'The correct fact', 'User intent'],
          0,
          'Next-token prediction is the training objective.',
        ],
        [
          'Roughly how many tokens per English word?',
          ['0.5', '0.75', '2', '4'],
          1,
          'About three-quarters of a word.',
        ],
        [
          'Low temperature is best for:',
          ['Brainstorming', 'Deterministic extraction', 'Poetry', 'Random names'],
          1,
          'Reduces sampling randomness.',
        ],
      ]
    ),
    lesson(
      M1,
      'ai-1-2',
      2,
      'Hallucination, Knowledge Cutoffs and Guardrails',
      'Why models invent citations, how knowledge cutoffs work, and practical mitigations.',
      10,
      nineBlocks({
        objectives: [
          'Explain why hallucinations are a natural side effect of generation',
          'Describe knowledge cutoff and retrieval-augmented generation (RAG)',
          'Apply concrete mitigations: grounding, citations requests, and verification',
        ],
        hook: 'A lawyer submitted a brief with six case citations invented by a model. The cases did not exist. The model was not lying — it was completing legal-looking text patterns. The fix is process, not scolding the model.',
        concept: `**Hallucination:** fluent, confident text that is not supported by facts or by the provided context. Causes: the objective rewards plausibility, not truth; sparse or ambiguous training signal on niche topics; pressure from the prompt to always answer.

**Knowledge cutoff:** training data ends at a fixed date. Events after that date are unknown unless the product has live search, tools, or user-provided context.

**RAG (retrieval-augmented generation):** retrieve relevant documents at request time and place them in the context. The model then answers "according to these documents" — grounding claims in sources you control.

**Mitigations that work:**
1. Provide the source material (RAG or paste-in).
2. Ask for citations to the provided text, not to invented URLs.
3. Instruct: "If the answer is not in the context, say you do not know."
4. Verify high-stakes claims (medical, legal, financial, code APIs) independently.
5. Prefer models/products with browsing or tool-use when freshness matters.`,
        extras: [
          tip(
            'Ask for "only from the provided text"',
            'Retrieval quality plus a strict grounding instruction sharply reduces invention in document-QA.',
          ),
          warn(
            'Do not trust URLs or DOIs the model prints',
            'Citation-shaped strings are easy to generate and often fake. Open every link yourself.',
          ),
        ],
        worked: {
          title: 'Grounding a product-policy question',
          problem: 'Support wants answers about a refund policy that changed last month. How do you use an LLM safely?',
          steps: [
            { title: 'Provide sources', desc: 'Put the current policy text in the prompt (or index it for RAG).' },
            { title: 'Ground the answer', desc: 'Instruct: answer only from this policy; quote section headings; say "not covered" if missing.' },
            { title: 'Tighten generation', desc: 'Low temperature; require the citation snippet in the answer.' },
            { title: 'Escalate gaps', desc: 'Route edge cases to a human.' },
          ],
          solution: 'RAG + strict grounding + human escalation for gaps.',
        },
        practice: {
          title: 'Design a mitigation',
          prompt: 'A research assistant tool keeps inventing paper titles. List three concrete fixes.',
          hint: 'Think: source grounding, output format, verification.',
        },
        mistakes: [
          {
            mistake: 'Asking the model to "just be accurate"',
            fix: 'Vague honesty instructions underperform providing real sources and requiring citations to them.',
          },
          {
            mistake: 'Treating cutoff as a bug',
            fix: 'It is a property of static training. Freshness needs tools, RAG, or user context.',
          },
        ],
        exam: {
          question: 'What is RAG and why does it reduce hallucination?',
          answer: 'Retrieval-augmented generation fetches relevant documents into the context so answers can be grounded in provided sources.',
          source: 'Most common GenAI interview follow-up.',
        },
        summary: [
          'Hallucination = plausible completion, not lying; verify high-stakes claims.',
          'Knowledge cutoff is fixed; RAG and tools add freshness.',
          'Grounding + citation-to-source + low temperature = production-ready pattern.',
        ],
      }),
      [
        [
          'Hallucination means:',
          ['The model crashed', 'Fluent but unsupported claims', 'Too many tokens', 'Low temperature'],
          1,
          'Plausible-sounding invention.',
        ],
        [
          'Knowledge cutoff is mitigated by:',
          ['Higher temperature', 'RAG or live tools', 'Longer prompts only', 'Lower top-p'],
          1,
          'External knowledge at request time.',
        ],
        [
          'Best practice for document QA is to:',
          ['Ask general questions', 'Provide the documents and require citations to them', 'Set temperature to 1.2', 'Skip verification'],
          1,
          'Grounding is the control.',
        ],
      ]
    ),
  ],
};
