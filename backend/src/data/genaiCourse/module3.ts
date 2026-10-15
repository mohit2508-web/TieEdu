// Module 3 — Building with GenAI (RAG, Tools, Evaluation)
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, code } from '../nineBlocks';
import { lesson, M3, COURSE_ID } from './helpers';

export const module3: CourseModule = {
  id: M3,
  course_id: COURSE_ID,
  title: 'Module 3 — Building with GenAI',
  summary:
    'RAG pipelines, structured outputs, function calling and evaluation — the minimum an applied engineer needs.',
  sort_order: 3,
  lessons: [
    lesson(
      M3,
      'ai-3-1',
      1,
      'RAG and Structured Outputs',
      'Chunking, embedding, retrieval and the JSON-first interfaces products actually use.',
      12,
      nineBlocks({
        objectives: [
          'Describe the RAG pipeline: ingest, chunk, embed, retrieve, generate',
          'Choose a chunking strategy and why it matters for recall',
          'Force machine-readable outputs with JSON schemas and tool calls',
        ],
        hook: 'A support bot that answers from your helpdesk docs needs retrieval, not fine-tuning. Wrong chunk size is the single most common reason "the answer exists but the model never sees it".',
        concept: `**RAG pipeline:**
1. **Ingest** — load PDFs, HTML, tickets.
2. **Chunk** — split into passages (commonly 300–800 tokens with 10–20% overlap).
3. **Embed** — map each chunk to a vector; store in a vector DB with metadata.
4. **Retrieve** — embed the query, fetch top-k similar chunks (optionally re-rank).
5. **Generate** — put chunks in context with instructions to cite.

**Why chunk?** Embeddings represent a passage as one point; oversized chunks blur topics, tiny chunks lose context. Overlap prevents answers from being split across a boundary.

**Hybrid retrieval:** combine vector similarity with keyword/BM25 search — exact identifiers (error codes, part numbers) often fail pure vector search.

**Structured outputs:** ask for JSON with a schema (or use constrained decoding / tool calls where available). Validate with a schema library; retry with the validation error on failure. Products consume JSON, not essays.

**Function calling:** the model selects a tool and arguments; your code executes and returns results. Keep tool descriptions short, non-overlapping, and name actions precisely.`,
        extras: [
          table('Chunking trade-offs', ['Size', 'Pros', 'Cons'], [
            ['~200 tokens', 'Fine-grained retrieval', 'Loses surrounding context; more rows'],
            ['300–800 tokens', 'Balanced default', 'Still may split mid-argument'],
            ['2000+ tokens', 'Full section context', 'Diluted embeddings; wasted context'],
          ]),
          tip(
            'Evaluate retrieval before blaming the model',
            'If the right chunk is not in the top-k, no prompt fix will save the answer.',
          ),
          warn(
            'Never trust model JSON without validation',
            'Schema-validate every response; treat parse failures as normal retry paths, not exceptions.',
          ),
        ],
        worked: {
          title: 'Design chunks for a policy handbook',
          problem: 'A 60-page leave policy PDF needs to answer specific employee questions with citations.',
          steps: [
            { title: 'Parse', desc: 'Parse to text by heading structure; keep section titles as metadata.' },
            { title: 'Chunk', desc: 'Chunk at paragraph boundaries ~500 tokens, 50-token overlap.' },
            { title: 'Index', desc: 'Index: embedding + section path ("LEAVE/CL/2.1").' },
            { title: 'Query', desc: 'Query: top-k=5 with hybrid search; prompt demands quote + section id.' },
          ],
          solution: 'Structure-aware chunking + hybrid retrieval + citation-enforced prompt.',
        },
        practice: {
          title: 'Pick top-k',
          prompt: 'When would you raise top-k from 5 to 15? When would you lower it to 3?',
          hint: 'Compare broad survey questions vs precise fact lookup and context budget.',
        },
        mistakes: [
          {
            mistake: 'Fixed token-size chunking of structured PDFs',
            fix: 'Split on headings/tables first; pure token windows break tables and clauses.',
          },
          {
            mistake: 'Asking for "valid JSON" in one line without schema',
            fix: 'Provide the exact schema or use enforced tool/JSON mode.',
          },
        ],
        exam: {
          question: 'Why include overlap when chunking?',
          answer: 'To keep sentences or clauses that span a boundary present in at least one chunk.',
          source: 'Standard RAG engineering question.',
        },
        summary: [
          'RAG = ingest → chunk → embed → retrieve → generate.',
          'Hybrid search + re-ranking fix recall gaps.',
          'JSON schemas and tool calls make outputs machine-safe.',
        ],
      }),
      [
        [
          'Typical useful chunk size:',
          ['20 tokens', '300–800 tokens', '10k tokens', 'One whole PDF'],
          1,
          'Balanced locality and context.',
        ],
        [
          'Hybrid retrieval combines:',
          ['Two LLMs', 'Vector + keyword search', 'Fine-tuning + prompting', 'Cache + DB'],
          1,
          'Catches exact identifiers.',
        ],
        [
          'Model JSON must be:',
          ['Used as-is', 'Schema-validated', 'Converted by regex only', 'Avoided'],
          1,
          'Validation and retry are part of the design.',
        ],
      ]
    ),
    lesson(
      M3,
      'ai-3-2',
      2,
      'Evaluation, Cost and Safety',
      'Golden sets, regression tests, token economics and abuse resistance for GenAI features.',
      10,
      nineBlocks({
        objectives: [
          'Build a small golden eval set and score retrieval + generation separately',
          'Estimate cost and latency from tokens and model tier',
          'Apply practical safety controls: prompt-injection defense, PII and output filters',
        ],
        hook: 'Teams ship GenAI features with vibes: "seems good on my examples". One weekend of golden-set evals catches more regressions than another week of prompt fiddling.',
        concept: `**Eval layers:**
1. **Retrieval metrics** — recall@k: did the right chunk appear?
2. **Generation quality** — faithfulness (supported by context), correctness, tone; LLM-as-judge with rubrics plus a human spot-check.
3. **Task success** — did the user finish their job (deflection rate, edit distance of accepted outputs)?

**Golden set:** 30–100 real examples with expected behavior; run on every prompt/model/chunking change. Cheap insurance.

**Cost:** price = input tokens × rate_in + output tokens × rate_out. Long contexts make re-generation expensive; cache stable system prompts where supported. Right-size: small models for routing/ extraction, larger for hard synthesis.

**Latency:** time-to-first-token vs total; streaming UX hides total.

**Prompt injection:** untrusted text (web pages, user uploads) that contains instructions like "ignore previous rules". Defenses: separate data from instructions in the prompt, minimize tool permissions, require confirmation for side effects, scan outputs.

**PII and abuse:** redact or block personal data in logs; rate-limit; content filters for disallowed use.`,
        extras: [
          table('Model tiering', ['Task', 'Model', 'Why'], [
            ['Classification / routing', 'Small', 'Cheap, fast, structured'],
            ['Summarize / rewrite', 'Mid', 'Good quality/cost'],
            ['Hard synthesis / code', 'Large', 'Capability needed'],
          ]),
          tip(
            'Separate retrieval and generation failures',
            'A bad answer may be a search problem; fix recall before rewriting the answer prompt.',
          ),
        ],
        worked: {
          title: 'Track unit economics',
          problem: 'Feature: summarize 2k-token tickets. Model: $0.50/M input, $1.50/M output, 150 output tokens average, 10k tickets/day.',
          steps: [
            { title: 'Input cost', desc: 'Input cost/day: 2000 × 10000 = 2e7 tokens ≈ $10.' },
            { title: 'Output cost', desc: 'Output: 150 × 10000 = 1.5e6 ≈ $2.25.' },
            { title: 'Total', desc: 'Total ≈ $12.25/day ≈ $367/month for this one feature.' },
          ],
          solution: '≈ $12.25/day; validate against quality before considering a smaller model for half the traffic.',
        },
        practice: {
          title: 'Golden set sketch',
          prompt: 'List 5 golden examples for a doc-QA bot and what you would assert for each.',
          hint: 'Include one answerable, one out-of-scope, one numeric, one multi-hop, one refusal.',
        },
        mistakes: [
          {
            mistake: 'Only evaling final answers',
            fix: 'If recall@k is poor, no generation prompt will fix it.',
          },
          {
            mistake: 'Giving tools broad permissions by default',
            fix: 'Least privilege plus human confirmation for irreversible actions.',
          },
        ],
        exam: {
          question: 'What is prompt injection and one defense?',
          answer: 'Malicious instructions embedded in untrusted content; defend by delimiting data, limiting tool permissions, and confirming side effects.',
          source: 'Safety section of applied GenAI interviews.',
        },
        summary: [
          'Eval retrieval and generation separately; keep a golden set.',
          'Cost = tokens × rates; tier models to the task.',
          'Injection, PII and rate limits are part of shipping, not afterthoughts.',
        ],
      }),
      [
        [
          'recall@k measures:',
          ['Answer length', 'Whether relevant chunks appeared in top-k', 'Cost', 'Latency'],
          1,
          'Retrieval health.',
        ],
        [
          'Prompt injection is:',
          ['A model bug', 'Instructions hidden in untrusted content', 'A temperature setting', 'Token overflow'],
          1,
          'Data trying to become instructions.',
        ],
        [
          'Best cost strategy for classification:',
          ['Always use the largest model', 'Small model with structured output', 'Raise temperature', 'Longer prompts'],
          1,
          'Match model size to difficulty.',
        ],
      ]
    ),
  ],
};
