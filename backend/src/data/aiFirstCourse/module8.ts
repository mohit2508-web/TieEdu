// AI.FIRST — Module 8 · S · Building with AI APIs
import type { CourseModule } from '../db';
import { nineBlocks, diagram, table, tip, warn, code } from '../nineBlocks';
import { lesson, proofOfWork, M, COURSE_ID } from './helpers';

const ID = M(8);

export const module8: CourseModule = {
  id: ID,
  course_id: COURSE_ID,
  title: 'Module 8 — Building with AI APIs',
  summary:
    'S · Systems, with code. Your first API call, structured output and function calling, retrieval-augmented generation over your own documents, and shipping a small AI app with tests and cost control.',
  sort_order: 8,
  lessons: [
    lesson(
      ID,
      'aif-m8-1',
      1,
      'Your First API Call: Keys, Messages and Parameters',
      'From API key to a working Python script: the messages format, key parameters, streaming, errors and keeping secrets safe.',
      44,
      nineBlocks({
        objectives: [
          'Make an LLM API call from Python with a system prompt and user message',
          'Explain the main request parameters and read usage (token) information from the response',
          'Handle errors and rate limits and keep API keys out of code',
        ],
        hook:
          'Using a chat app is like eating at a restaurant. Using the API is like getting the kitchen. Suddenly you can process 5,000 feedback forms overnight, put a tutor inside your own website, or build a tool that nobody has built for your town\'s farmers yet. The kitchen has rules — keys, tokens, rate limits, bills — and this lesson teaches them in about 30 lines of Python.',
        concept: `**What an LLM API is.** An HTTPS endpoint: you send a request (model name, messages, settings) with an **API key**; you get back the generated text plus **usage** (input and output tokens). Every major provider offers an official SDK (Python, JavaScript) that wraps this. Shapes differ slightly between providers, but the concepts are the same.

**The messages format.** A conversation is a list of messages, each with a **role**:
- **system** — standing instructions (some APIs take this as a separate parameter).
- **user** — the person\'s input.
- **assistant** — the model\'s previous replies (you send these back to continue a conversation — the API itself is **stateless** and remembers nothing between calls).

**Key parameters**
- **model** — which model; pin an explicit version for reproducibility in production.
- **max tokens** — the cap on output length (and cost).
- **temperature** (and sometimes top-p) — randomness (Module 2).
- **stop sequences** — strings that end generation.
- **stream** — receive tokens as they are generated, for responsive UIs.
Newer models may have different or fewer tunable settings (for example reasoning effort instead of temperature); read the current docs for the model you choose.

**Errors you must handle**
- **401/403** — bad or missing key; **400** — malformed request (often too many tokens).
- **429** — rate limit: too many requests or tokens per minute — retry with exponential backoff.
- **5xx / overloaded** — provider-side; retry with backoff, and consider a fallback model.
Official SDKs often retry some errors automatically; know what yours does.

**Secrets.** Never hard-code a key or commit it to Git. Put it in an **environment variable** (a .env file locally, listed in .gitignore; a secret manager in production). Set **spending limits** in the provider console. If a key leaks, **revoke it immediately** — automated bots scan public repositories for keys within minutes.`,
        extras: [
          diagram(
            'One API round-trip',
            `flowchart LR
  APP["Your Python app"] -->|"HTTPS POST: model, system, messages, max_tokens + API key"| API["LLM provider API"]
  API --> MOD["Model generates"]
  MOD -->|"text + usage: input/output tokens"| APP
  APP --> LOGU["Log tokens → cost"]
  API -.->|"429 rate limit"| RET["Backoff & retry"]
  RET -.-> API`
          ),
          code(
            `# pip install anthropic python-dotenv   (other providers' SDKs look very similar)
import os
from dotenv import load_dotenv
import anthropic

load_dotenv()                                   # reads ANTHROPIC_API_KEY from .env
client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

MODEL = "claude-sonnet-5-5"   # pin a model; check your provider's current model list

response = client.messages.create(
    model=MODEL,
    max_tokens=400,
    system="You are a concise tutor for first-year engineering students.",
    messages=[
        {"role": "user", "content": "Explain Ohm's law with one everyday example."},
    ],
)

print(response.content[0].text)
print("input tokens:", response.usage.input_tokens,
      "| output tokens:", response.usage.output_tokens)

# Continuing a conversation: the API is stateless, so send the history back.
history = [
    {"role": "user", "content": "Explain Ohm's law with one everyday example."},
    {"role": "assistant", "content": response.content[0].text},
    {"role": "user", "content": "Now give me two practice problems, no answers."},
]
follow_up = client.messages.create(model=MODEL, max_tokens=400, messages=history)
print(follow_up.content[0].text)`,
            'first_call.py',
            'python'
          ),
          table('Request parameters at a glance', ['Parameter', 'What it does', 'Typical value'], [
            ['model', 'Which model answers', 'A pinned model id from the provider\'s list'],
            ['system', 'Standing instructions', 'Role, rules, format'],
            ['messages', 'Conversation so far', 'user / assistant turns'],
            ['max_tokens', 'Output cap — and a cost cap', '200–2,000 depending on task'],
            ['temperature', 'Randomness', '0–0.3 facts, 0.7+ creative (if supported)'],
            ['stream', 'Tokens as generated', 'true for chat UIs'],
          ]),
          warn(
            'Keys in Git get stolen in minutes',
            'Add .env to .gitignore before your first commit. If a key is ever pushed — even to a private repo that later becomes public — revoke it and create a new one.',
          ),
        ],
        worked: {
          title: 'Batch-summarise feedback with a budget',
          problem:
            'You have 500 course-feedback comments (average 120 tokens each). Write the plan for a script that produces a one-line summary and sentiment for each, within a ₹100 budget.',
          steps: [
            { title: 'Estimate tokens', desc: 'Per call: ~150 system + 120 comment = 270 input, ~40 output. Total ≈ 135,000 input + 20,000 output tokens.' },
            { title: 'Estimate cost', desc: 'With a small model at an illustrative ₹10 in / ₹40 out per MTok: ₹1.35 + ₹0.80 ≈ ₹2.15 — well under budget. (A frontier model at 40× the price would be ≈ ₹86 — still in budget, but unnecessary.)' },
            { title: 'Code structure', desc: 'Loop over comments; call with max_tokens=60 and temperature 0; parse; write CSV; sum usage tokens as you go.' },
            { title: 'Reliability', desc: 'Catch 429/5xx with backoff; save progress every 50 rows so a crash resumes; stop if spend exceeds the budget.' },
          ],
          solution:
            'A small model handles this for about ₹2. Measuring tokens from usage, capping max_tokens and checkpointing progress turn a one-off script into a reliable batch job.',
        },
        practice: {
          title: 'Hello, API',
          prompt:
            'Get an API key from a provider with a free or low-cost tier, store it in .env, and run a script that: sends a system + user message, prints the reply and token usage, then continues the conversation for one more turn. Add a try/except that prints a friendly message on a rate-limit error.',
          hint: 'Check the provider\'s quickstart for the exact SDK call and current model names.',
        },
        mistakes: [
          {
            mistake: 'Expecting the API to remember previous calls',
            fix: 'The API is stateless — send the relevant history (or a summary) with every request.',
          },
          {
            mistake: 'Hard-coding API keys',
            fix: 'Environment variables locally, a secret manager in production, .env in .gitignore, spending limits on.',
          },
          {
            mistake: 'No max_tokens limit',
            fix: 'Always cap output; it controls latency and cost.',
          },
        ],
        exam: {
          question: 'Explain how a chat conversation works over a stateless LLM API.',
          answer:
            'Each request contains the full context the model should use: the system instructions and the list of prior user and assistant messages plus the new user message. The API generates a reply and returns it with token usage, but keeps no memory, so the application stores the history and sends it again on the next call — trimming or summarising older turns when it grows too long for the context window or the budget.',
          source: 'A basic but frequently asked LLM-engineering question.',
        },
        summary: [
          'API = model + messages + settings + key → text + token usage.',
          'Roles: system, user, assistant; the API is stateless.',
          'Handle 401/400/429/5xx; back off and retry; consider fallbacks.',
          'Keys in env/secret stores; spending limits; never in Git.',
        ],
      }),
      [
        ['An LLM chat API is stateless. This means:', ['It cannot generate text', 'It remembers nothing between calls, so you send the history each time', 'It has no context window', 'It is free'], 1, 'The app manages conversation history.'],
        ['HTTP 429 from an LLM API usually means:', ['Wrong model name', 'Rate limit exceeded — retry with backoff', 'Success', 'Invalid JSON output'], 1, 'Too many requests or tokens per minute.'],
        ['The safest way to provide an API key to a script is:', ['Paste it in the code', 'An environment variable or secret manager, never committed to Git', 'A public sheet', 'The prompt'], 1, 'Keep secrets out of code.'],
        ['max_tokens limits:', ['Input length', 'The maximum length (and cost) of the generated output', 'The number of users', 'Temperature'], 1, 'It caps output tokens.'],
      ]
    ),
    lesson(
      ID,
      'aif-m8-2',
      2,
      'Structured Output and Function Calling',
      'Make models return validated data and call your code: JSON schemas, Pydantic validation, tool definitions and the tool-use loop.',
      46,
      nineBlocks({
        objectives: [
          'Get schema-valid structured output and validate it in code',
          'Define a tool (function) and handle the model\'s tool-use requests in a loop',
          'Decide what belongs in deterministic code versus in the model',
        ],
        hook:
          'A student builds a "smart expense splitter" for hostel trips. Version 1 asks the model to calculate who owes whom. It is right most of the time — and wrong by ₹340 on the Goa trip, which nearly ends a friendship. Version 2 lets the model do what it is good at — reading messy messages like "Ravi paid 2.4k for the cab, me and Anu split dinner" — and hands the arithmetic to a 12-line Python function. It has not been wrong since.',
        concept: `**Structured output.** For anything code will consume, ask for data, not prose. Approaches, from weakest to strongest:
1. **Prompt-only** — "Return JSON with keys…". Usually works; sometimes adds prose or breaks format.
2. **JSON mode** — the API guarantees syntactically valid JSON, but not your schema.
3. **Schema-constrained / structured outputs** — you supply a JSON Schema and the API constrains output to match it (offered by major providers in some form).
**Always validate anyway** — with a library such as **Pydantic** in Python — and decide what happens on failure (retry once with the error message, then send to review).

**Function calling / tool use.** You describe tools to the model: a **name**, a **description** (when to use it) and an **input schema**. When the model decides a tool would help, it responds not with an answer but with a **tool-use request**: the tool name and arguments. **Your code** runs the function and sends the result back; the model then continues — perhaps calling another tool — and finally answers. The model never executes anything itself; it asks, you decide.

**The tool-use loop**
1. Send messages + tool definitions.
2. If the response asks for a tool → validate arguments → run your function → append the result → call again.
3. If the response is a final answer → done. Cap the number of iterations.

**Deterministic code vs model**
- **Code**: arithmetic, dates, database queries, business rules, permissions, anything that must be exactly right or auditable.
- **Model**: understanding messy language, choosing which tool, extracting arguments, explaining results, drafting text.
Good systems use the model as the **language interface** to reliable code.

**Tool safety**: validate every argument; tools that read are low risk; tools that write, send or pay need confirmation and permission checks (Module 9).`,
        extras: [
          diagram(
            'The tool-use loop',
            `sequenceDiagram
  participant U as User
  participant A as Your app
  participant M as Model
  participant T as Your function
  U->>A: "Ravi paid 2.4k cab, me and Anu split dinner 1,800"
  A->>M: messages + tool definition split_expenses
  M-->>A: tool_use split_expenses(payments, participants)
  A->>A: validate arguments
  A->>T: run split_expenses(...)
  T-->>A: exact balances
  A->>M: tool_result
  M-->>A: plain-language answer using the exact numbers
  A-->>U: "Anu pays Ravi ₹1,600 and pays you ₹100"`
          ),
          code(
            `from pydantic import BaseModel, Field, ValidationError
from typing import Literal

class Enquiry(BaseModel):
    is_buyer: bool
    product: str | None
    quantity: str | None
    country: str | None
    urgency: Literal["high", "normal"]
    confidence: Literal["high", "low"]
    summary: str = Field(max_length=200)

def parse_enquiry(raw_json: str) -> Enquiry | None:
    try:
        return Enquiry.model_validate_json(raw_json)
    except ValidationError as err:
        print("invalid output:", err.error_count(), "errors")  # retry once, then review queue
        return None`,
            'validate_output.py',
            'python'
          ),
          code(
            `import json

tools = [{
    "name": "split_expenses",
    "description": "Compute exactly who owes whom. Use whenever the user describes shared payments.",
    "input_schema": {
        "type": "object",
        "properties": {
            "participants": {"type": "array", "items": {"type": "string"}},
            "payments": {"type": "array", "items": {
                "type": "object",
                "properties": {
                    "payer": {"type": "string"},
                    "amount": {"type": "number"},
                    "shared_by": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["payer", "amount", "shared_by"],
            }},
        },
        "required": ["participants", "payments"],
    },
}]

def split_expenses(participants, payments):
    bal = {p: 0.0 for p in participants}
    for pay in payments:
        share = pay["amount"] / len(pay["shared_by"])
        bal[pay["payer"]] += pay["amount"]
        for person in pay["shared_by"]:
            bal[person] -= share
    return {p: round(v, 2) for p, v in bal.items()}   # + owed to them, - they owe

messages = [{"role": "user", "content": user_text}]
for _ in range(5):                                     # cap the loop
    resp = client.messages.create(model=MODEL, max_tokens=800, tools=tools, messages=messages)
    if resp.stop_reason != "tool_use":
        print(resp.content[0].text)
        break
    messages.append({"role": "assistant", "content": resp.content})
    results = []
    for block in resp.content:
        if block.type == "tool_use" and block.name == "split_expenses":
            out = split_expenses(**block.input)          # validate inputs in real code
            results.append({"type": "tool_result", "tool_use_id": block.id,
                            "content": json.dumps(out)})
    messages.append({"role": "user", "content": results})`,
            'tool_loop.py',
            'python'
          ),
        ],
        worked: {
          title: 'Split the Goa trip correctly',
          problem:
            'Ravi paid ₹2,400 for a cab shared by Ravi, Anu and you. You paid ₹1,800 for dinner shared by you and Anu. Who owes whom?',
          steps: [
            { title: 'Model extracts arguments', desc: 'participants = [Ravi, Anu, You]; payments = cab 2400 by Ravi shared by all three; dinner 1800 by You shared by You and Anu.' },
            { title: 'Code computes', desc: 'Cab: each owes 800 → Ravi +2400 −800 = +1600; Anu −800; You −800. Dinner: each owes 900 → You +1800 −900 = +900; Anu −900.' },
            { title: 'Balances', desc: 'Ravi +1600; You −800 + 900 = +100; Anu −800 −900 = −1700. They sum to zero — a built-in check.' },
            { title: 'Model explains', desc: '"Anu pays Ravi ₹1,600 and pays you ₹100. You and Ravi are otherwise settled."' },
          ],
          solution:
            'The model handled the messy language; the function handled the money exactly; balances summing to zero verified it. That division of labour is the core pattern of reliable AI apps.',
        },
        practice: {
          title: 'Add a tool',
          prompt:
            'Build a small script with one tool your code implements exactly — for example a GPA calculator, a unit converter, or a lookup in a CSV of your class timetable. Let the model decide when to call it. Test with three requests that need the tool and two that do not.',
          hint: 'Write a clear tool description: models choose tools largely from the description.',
        },
        mistakes: [
          {
            mistake: 'Letting the model do arithmetic or business rules that must be exact',
            fix: 'Put exactness in code; let the model extract arguments and explain results.',
          },
          {
            mistake: 'Trusting structured output without validation',
            fix: 'Validate with a schema library; retry once with the error, then route to review.',
          },
          {
            mistake: 'Uncapped tool loops',
            fix: 'Limit iterations and total tokens; log every tool call.',
          },
        ],
        exam: {
          question: 'What is function calling (tool use) and how does it work?',
          answer:
            'You give the model descriptions of functions — a name, when to use it, and a JSON schema for the arguments. When the model decides a function is needed, it returns a structured request with the function name and arguments instead of a final answer. The application validates the arguments, runs the real function and sends the result back, and the model continues until it produces an answer. The model never executes code itself; the application stays in control, which is why exact calculations, data access and permissions live in code.',
          source: 'One of the most common LLM-engineering interview questions.',
        },
        summary: [
          'Structured output: schema-constrained where possible, always validated.',
          'Tool use: model requests, your code executes, results go back, loop with a cap.',
          'Exactness, rules and permissions in code; language understanding in the model.',
          'Validate tool arguments; confirm consequential actions.',
        ],
      }),
      [
        ['In function calling, who actually executes the function?', ['The model', 'Your application code', 'The user', 'The API provider\'s database'], 1, 'The model requests; your code runs it.'],
        ['JSON mode guarantees:', ['The output matches your schema', 'Syntactically valid JSON, not necessarily your schema', 'Correct facts', 'Shorter answers'], 1, 'Validate against your schema anyway.'],
        ['Which belongs in deterministic code, not the model?', ['Understanding a messy message', 'Exact money splitting and business rules', 'Drafting an explanation', 'Choosing a tone'], 1, 'Exactness lives in code.'],
        ['A good safety measure for a tool-use loop is:', ['Unlimited iterations', 'A cap on iterations plus validation and logging of every tool call', 'No logging', 'Letting tools delete data freely'], 1, 'Bound and audit the loop.'],
      ]
    ),
    lesson(
      ID,
      'aif-m8-3',
      3,
      'RAG: Grounding Answers in Your Documents',
      'Chunk, embed, store, retrieve, generate with citations — build retrieval-augmented generation and evaluate whether it actually retrieves the right thing.',
      48,
      nineBlocks({
        objectives: [
          'Explain the RAG pipeline: ingest, chunk, embed, store, retrieve, generate',
          'Build a minimal RAG system in Python with citations and abstention',
          'Diagnose RAG failures as retrieval problems or generation problems',
        ],
        hook:
          'A company\'s HR assistant answers "How many casual leaves do I get?" with "12 days" — the industry average it absorbed in training. The company\'s policy says 8. The model was not wrong about the world; it was wrong about this company, because it had never seen the policy. Retrieval-augmented generation fixes exactly that: before answering, fetch the relevant paragraphs of the actual policy and make the model answer from them — with a citation an employee can click.',
        concept: `**Why RAG.** Models lack your private, recent or niche information, and fine-tuning is a poor way to add facts (Module 2). RAG retrieves relevant passages at question time and places them in the context, so answers are **current, specific and citable**.

**The pipeline**
1. **Ingest** — load documents (PDF, HTML, Markdown, docs); extract clean text; keep metadata (title, section, date, URL, access level).
2. **Chunk** — split into passages, typically a few hundred tokens, ideally along structure (headings, paragraphs) with a little overlap so meaning is not cut mid-thought.
3. **Embed** — convert each chunk to a vector with an embedding model (Module 2).
4. **Store** — in a vector index or database (FAISS, Chroma, pgvector, Qdrant, managed services).
5. **Retrieve** — embed the question; find the top-k nearest chunks; often combine with keyword search (**hybrid**) because exact terms like "Form 16" or "Section 80C" matter; optionally **rerank** candidates with a stronger model.
6. **Generate** — prompt: "Answer only from these sources; cite source ids; if the answer is not there, say so."

**Two kinds of failure — diagnose before fixing**
- **Retrieval failure**: the right chunk was not retrieved (bad chunking, vocabulary mismatch, k too small, stale index). Fix chunking, add hybrid search, query rewriting, reranking.
- **Generation failure**: the right chunk was retrieved but the answer ignored, misread or over-extended it. Fix the prompt, order sources, require quotes, use a stronger model.
Inspect **what was retrieved** for every failing question — this single habit solves most RAG problems.

**Evaluate retrieval separately**: for a golden set of questions with known source passages, measure **recall@k** (was the right chunk in the top k?). Then evaluate answers for correctness, citation accuracy and abstention.

**Production concerns**: re-index when documents change; respect **access control** (do not retrieve HR files for an intern); log queries; watch cost.`,
        extras: [
          diagram(
            'RAG pipeline',
            `flowchart LR
  subgraph INDEX["Indexing — offline"]
    D["Documents + metadata"] --> C["Chunk by structure"] --> E["Embed chunks"] --> V[("Vector store")]
  end
  subgraph QUERY["Answering — per question"]
    Q["Question"] --> QE["Embed question"] --> R["Retrieve top-k<br/>hybrid + rerank"]
    V --> R
    R --> P["Prompt: sources + rules + question"]
    P --> G["Model"]
    G --> A["Answer with [source ids] or 'not found'"]
  end`
          ),
          code(
            `# Minimal RAG — pip install sentence-transformers numpy
import numpy as np
from sentence_transformers import SentenceTransformer

embedder = SentenceTransformer("all-MiniLM-L6-v2")   # small open embedding model

docs = {
    "leave-2026#casual": "Casual leave: 8 days per calendar year, max 3 consecutive days.",
    "leave-2026#earned": "Earned leave: 18 days per year, accrues monthly, carry forward up to 45.",
    "leave-2026#sick":   "Sick leave: 10 days per year; medical certificate needed beyond 2 days.",
}
ids = list(docs)
vecs = embedder.encode([docs[i] for i in ids], normalize_embeddings=True)

def retrieve(question: str, k: int = 2):
    q = embedder.encode([question], normalize_embeddings=True)[0]
    scores = vecs @ q                      # cosine similarity (vectors are normalised)
    top = np.argsort(-scores)[:k]
    return [(ids[i], docs[ids[i]], float(scores[i])) for i in top]

question = "How many casual leaves do I get?"
hits = retrieve(question)
sources = "\\n".join(f"[{sid}] {text}" for sid, text, _ in hits)

prompt = f"""Answer using ONLY the sources. Cite source ids in brackets.
If the sources do not contain the answer, reply: "Not found in the HR policy."

<sources>
{sources}
</sources>

Question: {question}"""
# send prompt to your LLM (Lesson 8.1); expected: "8 days per calendar year [leave-2026#casual]"
print(prompt)`,
            'mini_rag.py',
            'python'
          ),
          table('Diagnosing RAG failures', ['Symptom', 'Retrieved chunks show…', 'Fix'], [
            ['Wrong answer', 'Right chunk absent', 'Retrieval: chunking, hybrid search, query rewrite, larger k, rerank'],
            ['Wrong answer', 'Right chunk present', 'Generation: stricter prompt, require quotes, better model'],
            ['Outdated answer', 'Old version of the policy', 'Re-index; remove superseded documents; date filters'],
            ['Leaks restricted info', 'Chunks from restricted files', 'Access-control filters at retrieval time'],
            ['Answers when it should not', 'Weakly related chunks', 'Similarity threshold; explicit "not found" rule'],
          ]),
        ],
        worked: {
          title: 'Debug "How many leaves can I carry forward?"',
          problem:
            'The HR bot answers "You cannot carry forward leave." The policy says earned leave carries forward up to 45 days. Diagnose.',
          steps: [
            { title: 'Inspect retrieval', desc: 'Top-2 chunks: casual leave (max 3 consecutive) and sick leave. The earned-leave chunk ranked 4th.' },
            { title: 'Classify', desc: 'Retrieval failure — the right chunk was never shown to the model.' },
            { title: 'Why', desc: 'The question says "carry forward leaves"; the chunk says "carry forward up to 45" under "Earned leave" — the embedding weighted "leave types" broadly.' },
            { title: 'Fix', desc: 'Add hybrid keyword search ("carry forward" is an exact phrase), raise k to 4, and add a reranker. Re-run the golden set: recall@4 for policy questions rises.' },
          ],
          solution:
            'A retrieval problem, not a model problem. Inspecting retrieved chunks first pointed straight to hybrid search and a larger k — changing the model would have changed nothing.',
        },
        practice: {
          title: 'Build and break a mini RAG',
          prompt:
            'Run the mini RAG with 10–20 chunks from a real document (your syllabus, a club constitution, a public policy). Write 10 questions with known answer chunks, including 2 not covered. Measure recall@2 and recall@4, then improve one failure by changing chunking or adding keyword matching.',
          hint: 'Print the retrieved chunks and scores for every question before reading the answers.',
        },
        mistakes: [
          {
            mistake: 'Blaming the model when the right chunk was never retrieved',
            fix: 'Always inspect retrieval first; evaluate recall@k separately from answer quality.',
          },
          {
            mistake: 'Chunking blindly by character count',
            fix: 'Chunk along headings and paragraphs, keep metadata, add modest overlap.',
          },
          {
            mistake: 'Ignoring access control',
            fix: 'Filter by user permissions at retrieval time; never rely on the prompt to hide restricted text.',
          },
        ],
        exam: {
          question: 'Explain RAG and how you would improve a RAG system that gives wrong answers.',
          answer:
            'Retrieval-augmented generation retrieves relevant passages from a document store at question time — by embedding the question and finding the nearest chunks, often combined with keyword search and reranking — and puts them in the prompt so the model answers from them with citations or says it cannot find the answer. To improve it I would first inspect what was retrieved for failing questions. If the right passage was missing, it is a retrieval problem: fix chunking, add hybrid search, query rewriting, a larger k or a reranker, and measure recall@k. If it was present, it is a generation problem: tighten the prompt, require quotes and consider a stronger model.',
          source: 'The most common applied-LLM system-design question in 2024–2026.',
        },
        summary: [
          'RAG: ingest → chunk → embed → store → retrieve (hybrid, rerank) → generate with citations.',
          'Grounded answers are current, specific and citable; abstain when sources lack the answer.',
          'Diagnose: retrieval failure vs generation failure — inspect retrieved chunks.',
          'Measure recall@k; re-index on change; enforce access control at retrieval.',
        ],
      }),
      [
        ['RAG primarily solves:', ['Slow GPUs', 'Models lacking your private, recent or niche information', 'Tokenisation', 'Image generation'], 1, 'It grounds answers in retrieved documents.'],
        ['The right chunk was not among the retrieved passages. This is a:', ['Generation failure', 'Retrieval failure', 'Billing issue', 'Temperature issue'], 1, 'Fix retrieval: chunking, hybrid search, k, reranking.'],
        ['Hybrid search combines:', ['Two LLMs', 'Embedding (semantic) search with keyword search', 'Images and text', 'Training and testing'], 1, 'Exact terms matter alongside meaning.'],
        ['recall@k measures:', ['Answer length', 'Whether the correct source chunk appears in the top-k retrieved', 'Model speed', 'Token cost'], 1, 'Retrieval quality, evaluated separately.'],
      ]
    ),
    lesson(
      ID,
      'aif-m8-4',
      4,
      'Ship a Small AI App: Interface, Tests, Cost and Deploy',
      'From script to something people use: a simple UI, prompts in config, tests and evals, cost guards, logging and a free deploy — your proof of work.',
      46,
      nineBlocks({
        objectives: [
          'Wrap an AI feature in a simple web interface (Streamlit or FastAPI)',
          'Add tests, a golden-set eval, cost guards and logging before sharing it',
          'Deploy a small app and write a README that a reviewer can run',
        ],
        hook:
          'A recruiter at a product company says the AI projects that impress her are rarely the most ambitious. They are the ones with a live link, a README that explains the problem, a small evaluation table showing where it works and where it fails, and a note on cost. "Anyone can call an API," she says. "I am hiring the person who can show me it works." This lesson turns your build into exactly that.',
        concept: `**Pick a small, real problem.** One user group, one job: "answer questions about our department\'s syllabus with citations", "turn lab-report notes into the required format", "triage shop enquiries". Narrow beats impressive.

**A simple stack**
- **Interface**: Streamlit or Gradio (pure Python, fastest) — or FastAPI + a small frontend if you know web development.
- **Core**: your functions — prompt templates, tool calls, retrieval — separated from the UI so they can be tested.
- **Config**: model name, prompts and limits in a config file, not scattered through code; version your prompts.
- **Secrets**: environment variables / the host\'s secret settings.

**Before you share it**
1. **Unit tests** for deterministic parts (parsers, tools, validators).
2. **Golden-set eval** for the AI behaviour (Module 5): 20–40 cases, a script that scores them, results in the README.
3. **Cost guards**: max_tokens, input length limits, per-user rate limits, a daily spend cap, small models where they suffice.
4. **Safety**: input length limits; refuse out-of-scope requests; no secrets or personal data in logs; basic prompt-injection hygiene (Module 11).
5. **Logging**: requests, token usage, latency, errors, prompt version — without storing sensitive user content unnecessarily.
6. **Feedback**: a thumbs up/down button; review the downs weekly and add them to the golden set.

**Deploy**: Streamlit Community Cloud, Hugging Face Spaces, Render or similar free tiers work for portfolio apps. Keep the API key in the host\'s secrets settings. Protect against abuse: a public demo with your key and no limits can run up a bill.

**The README that gets you hired**: problem and user; demo link and screenshot; architecture diagram; how to run locally; evaluation table (what works, what fails); cost per 1,000 requests; limitations and next steps; AI-assistance disclosure for the code if you used coding assistants.`,
        extras: [
          diagram(
            'A small AI app, production-minded',
            `flowchart LR
  UI["Streamlit UI<br/>input limits · feedback buttons"] --> CORE["Core module<br/>prompts from config · tools · RAG"]
  CORE --> GUARD["Guards<br/>rate limit · max tokens · daily cap"]
  GUARD --> LLM["LLM API"]
  CORE --> LOG["Logs: tokens · latency · errors · prompt version"]
  TESTS["Unit tests + golden-set eval in CI"] -.-> CORE
  UI --> FB["Thumbs-down → golden set"]
  FB -.-> TESTS`
          ),
          code(
            `# app.py — pip install streamlit anthropic python-dotenv
import os, time
import streamlit as st
import anthropic

MODEL = os.getenv("MODEL", "claude-haiku-5-5")      # small model by default
MAX_INPUT_CHARS = 2_000
client = anthropic.Anthropic()                      # reads ANTHROPIC_API_KEY from env

SYSTEM = open("prompts/lab_report_v2.txt", encoding="utf-8").read()   # versioned prompt

st.title("Lab-Report Formatter")
st.caption("Turns rough lab notes into your department's report format. Check every value.")

notes = st.text_area("Paste your rough notes", max_chars=MAX_INPUT_CHARS, height=220)

if "calls" not in st.session_state:
    st.session_state.calls = 0

if st.button("Format report", disabled=not notes.strip()):
    if st.session_state.calls >= 10:
        st.warning("Session limit reached — please come back later.")
    else:
        st.session_state.calls += 1
        t0 = time.time()
        resp = client.messages.create(model=MODEL, max_tokens=900, system=SYSTEM,
                                      messages=[{"role": "user", "content": notes}])
        st.markdown(resp.content[0].text)
        st.caption(f"{resp.usage.input_tokens}+{resp.usage.output_tokens} tokens · "
                   f"{time.time() - t0:.1f}s · prompt v2")
        col1, col2 = st.columns(2)
        col1.button("👍 Useful")
        col2.button("👎 Wrong")          # log these and add them to the golden set`,
            'app.py',
            'python'
          ),
          tip(
            'Public demo, private wallet',
            'Set a hard monthly spend limit on the API key used by any public demo, plus per-session limits in the app. A viral link should never become a ₹50,000 bill.',
          ),
          proofOfWork(
            8,
            'A deployed AI mini-app',
            'Build a custom assistant or no-code app with grounding and abstention for a real user group; publish it (where the platform allows) with a one-page guide, a 20-question test table and a cost note.',
            'Ship a small Python AI app (Streamlit/FastAPI) with structured output or RAG, unit tests, a golden-set eval script, cost guards, logging and a live deploy; README with eval table and cost per 1,000 requests.',
            'Write a product brief and launch checklist for an internal AI tool: user, problem, success metric, evaluation plan, data-protection review, cost budget, rollout and feedback loop — and run a 10-user pilot.',
            'A live link or runnable repo, the evaluation table with failures shown honestly, and the cost arithmetic.'
          ),
        ],
        worked: {
          title: 'Plan the Lab-Report Formatter launch',
          problem:
            'You built the formatter. Plan what must be true before sharing it with 120 classmates.',
          steps: [
            { title: 'Eval', desc: '25 real anonymised notes, scored for format compliance (pass/fail per section) and value accuracy (every number in the output appears in the input). Target: 100% value accuracy, ≥ 90% format.' },
            { title: 'Guards', desc: 'Small model; 2,000-character input cap; 10 calls per session; ₹1,000 monthly key limit.' },
            { title: 'Safety copy', desc: 'Visible note: "Check every value; you are responsible for your report; follow your lab\'s AI policy."' },
            { title: 'Feedback', desc: 'Thumbs-down logs (without storing notes beyond 7 days) reviewed weekly; failures added to the golden set.' },
            { title: 'Cost', desc: '120 students × 8 reports × ~1,600 tokens ≈ 1.5M tokens/semester — a few rupees on a small model.' },
          ],
          solution:
            'Launch only after the eval clears the bar. The value-accuracy check matters most: a formatter that silently changes a measured value is worse than useless.',
        },
        practice: {
          title: 'Ship it',
          prompt:
            'Take your best build from this module. Add a UI, at least three unit tests, a 20-case eval script, cost guards and a README with an architecture diagram and evaluation table. Deploy it on a free host and ask three people to try it; record their feedback.',
          hint: 'If you only have an evening: Streamlit + a golden set of 10 + a strict spend limit is enough for a first version.',
        },
        mistakes: [
          {
            mistake: 'Sharing a demo with no spend or rate limits',
            fix: 'Key-level spend caps plus per-session and input limits in the app.',
          },
          {
            mistake: 'A README that shows only successes',
            fix: 'Show the evaluation table with failures and limitations — it builds far more trust.',
          },
          {
            mistake: 'Prompts hard-coded inside UI code',
            fix: 'Keep versioned prompts in files or config, separate from the interface, so they can be tested.',
          },
        ],
        exam: {
          question: 'Tell me about an AI project you built. How do you know it works?',
          answer:
            'Strong answers name the user and problem, the architecture (model, prompts, tools or retrieval), and then the evidence: a golden set of realistic cases with a scoring method, the results including where it fails, what changed after a failure, cost per thousand requests and the guards against abuse. They end with limitations and next steps. "It works well" without an evaluation is the weakest possible answer.',
          source: 'The standard AI-project interview question — prepare your version of this answer.',
        },
        summary: [
          'Small real problem, simple stack, core separated from UI, prompts in config.',
          'Before sharing: tests, golden-set eval, cost guards, safety copy, logging, feedback.',
          'Deploy free; protect the key with spend and rate limits.',
          'README: problem, demo, architecture, eval table with failures, cost, limitations.',
        ],
      }),
      [
        ['The strongest evidence that your AI app works is:', ['A great demo', 'A golden-set evaluation with results, including failures', 'The model\'s name', 'Number of features'], 1, 'Measured behaviour, honestly reported.'],
        ['A public demo using your API key should have:', ['No limits so it looks good', 'Spend caps on the key and per-session/input limits in the app', 'The key shown on the page', 'Only a large model'], 1, 'Protect the wallet.'],
        ['Why keep prompts in versioned files separate from UI code?', ['It is required by Streamlit', 'So prompts can be tested, compared and changed safely', 'To hide them from users', 'To use fewer tokens'], 1, 'Prompts are code-like assets.'],
        ['For a formatter of lab measurements, the most critical eval check is:', ['Response speed', 'That every number in the output appears in the input (no altered values)', 'Font choice', 'Word count'], 1, 'Silently altered values are the worst failure.'],
      ]
    ),
  ],
};
