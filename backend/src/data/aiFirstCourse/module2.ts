// AI.FIRST — Module 2 · F · Inside a large language model
import type { CourseModule } from '../db';
import { nineBlocks, diagram, table, tip, warn, code } from '../nineBlocks';
import { lesson, proofOfWork, M, COURSE_ID } from './helpers';

const ID = M(2);

export const module2: CourseModule = {
  id: ID,
  course_id: COURSE_ID,
  title: 'Module 2 — Inside a Large Language Model',
  summary:
    'F · Foundations. Tokens and next-token prediction, embeddings and attention, how a chat model is made, and why sampling, context windows and cutoffs produce hallucinations.',
  sort_order: 2,
  lessons: [
    lesson(
      ID,
      'aif-m2-1',
      1,
      'Tokens and Next-Token Prediction',
      'An LLM reads and writes in tokens and does one thing — predict the next one. Everything else follows from that.',
      42,
      nineBlocks({
        objectives: [
          'Explain what a token is and estimate token counts for English and Indian-language text',
          'Describe generation as repeated next-token prediction',
          'Predict two consequences of tokenisation: odd spelling/counting errors and cost differences across languages',
        ],
        hook:
          'Ask some chat models how many times the letter "r" appears in "strawberry" and they have historically got it wrong — while writing a correct essay on photosynthesis in the same breath. That is not a random glitch. It falls straight out of how the model sees text: not as letters, but as chunks called tokens. Understand tokens and dozens of "weird AI behaviours" stop being weird.',
        concept: `**Tokens.** Before a model sees your text, a **tokenizer** splits it into tokens — common words, pieces of words, punctuation and spaces. "unbelievable" might become "un" + "believ" + "able". Each token maps to a number (an id in a vocabulary of roughly 50,000–250,000 entries). The model only ever sees and produces these ids.

**Rules of thumb (English):** 1 token ≈ 4 characters ≈ ¾ of a word, so 1,000 words ≈ 1,300–1,500 tokens. Hindi, Tamil and other languages written in non-Latin scripts often take **more tokens per word** with many tokenizers, because the tokenizer saw less of that text during its construction. More tokens means higher cost, slower responses and less room in the context window for the same content — a real equity issue for Indian-language users that newer tokenizers are steadily improving.

**Next-token prediction.** An LLM is trained on one task: given the tokens so far, output a **probability for every possible next token**. Generation is a loop:
1. Read the prompt tokens.
2. Compute probabilities for the next token.
3. Pick one (Lesson 2.4 covers how).
4. Append it and repeat until a stop token or a length limit.

The model writes one token at a time and **cannot go back and edit** what it already produced — which is why asking it to "plan first, then answer" often helps.

**Why this explains odd behaviour**
- **Letter counting and spelling** — "strawberry" may be one or two tokens; the model never saw its individual letters during prediction unless it reasons step by step.
- **Arithmetic slips** — numbers are split into irregular token chunks; models trained to reason step by step, or given a calculator tool, do far better.
- **Pricing** — APIs bill per token, input and output separately (Module 3).

**Prediction is not lookup.** The model does not retrieve sentences from a database. It produces text that is statistically likely given its training — usually correct for well-documented facts, sometimes fluent fiction for rare ones.`,
        extras: [
          diagram(
            'Generation is a loop of next-token predictions',
            `flowchart LR
  P["Prompt: The capital of France is"] --> T["Tokenizer → token ids"]
  T --> M["Model computes a probability for every next token"]
  M --> D["' Paris' 0.92 · ' a' 0.03 · ' located' 0.02 …"]
  D --> S["Pick one token"]
  S --> A["Append to the text"]
  A -->|"not finished"| M
  A -->|"stop token"| O["Final answer"]`
          ),
          table('Token estimates you can use', ['Text', 'Approx. tokens', 'Note'], [
            ['A 1-page English essay (500 words)', '650–750', '≈ 4 characters per token'],
            ['A 30-page PDF report', '15,000–25,000', 'Tables and formatting add tokens'],
            ['The same paragraph in Hindi', 'often 1.5–3× the English', 'Depends heavily on the tokenizer'],
            ['A 100-line Python file', '800–1,500', 'Whitespace and symbols count'],
          ]),
          tip(
            'See tokens for yourself',
            'Most model providers publish a free online tokenizer tool. Paste the same sentence in English and in Hindi and compare the counts — it is the fastest way to internalise why prompt length and language matter.',
          ),
        ],
        worked: {
          title: 'Estimate the cost and fit of a document',
          problem:
            'You want an LLM to summarise a 12,000-word English report. The model has a 128,000-token context window and charges a hypothetical ₹0.25 per 1,000 input tokens and ₹1.00 per 1,000 output tokens. The summary will be about 600 words. Estimate tokens, fit and cost.',
          steps: [
            { title: 'Input tokens', desc: '12,000 words × ~1.35 ≈ 16,000 tokens, plus ~200 for instructions ≈ 16,200.' },
            { title: 'Fit', desc: '16,200 is far below 128,000 — it fits in one call, with room to spare.' },
            { title: 'Output tokens', desc: '600 words × ~1.35 ≈ 810 tokens.' },
            { title: 'Cost', desc: 'Input 16.2 × ₹0.25 = ₹4.05; output 0.81 × ₹1.00 = ₹0.81; total ≈ ₹4.86.' },
          ],
          solution:
            '≈ 17,000 tokens total, fits comfortably, roughly ₹5 per summary at these example prices. Note output tokens usually cost several times more than input tokens — long answers are the expensive part.',
        },
        practice: {
          title: 'Token lab',
          prompt:
            'Using a public tokenizer tool, count tokens for: (1) one English sentence, (2) the same sentence in Hindi or your home language, (3) a 10-digit phone number, (4) a short Python function. Record the counts and write two conclusions about cost and about why numbers trip models up.',
          hint: 'Numbers often split into irregular 1–3 digit chunks.',
        },
        mistakes: [
          {
            mistake: 'Thinking the model looks up answers in a stored database of facts',
            fix: 'It predicts likely next tokens from learned patterns. That is why well-known facts are usually right and obscure ones can be confidently invented.',
          },
          {
            mistake: 'Using word count as a cost estimate for non-English text',
            fix: 'Tokens per word vary by language and tokenizer. Measure with a tokenizer before budgeting a multilingual product.',
          },
        ],
        exam: {
          question: 'Why do LLMs sometimes miscount letters in a word while writing fluent paragraphs?',
          answer:
            'LLMs process tokens — chunks of characters — not individual letters. A word like "strawberry" may be one or two tokens, so the letters are not directly visible to the prediction step. Fluency comes from predicting likely token sequences, which does not require letter-level access. Asking the model to spell the word out first, or giving it a code tool, usually fixes it.',
          source: 'Popular in AI product interviews as a test of whether you understand tokenisation.',
        },
        summary: [
          'Text → tokens (≈ 4 English characters each) → ids the model sees.',
          'Generation = predict a probability for every next token, pick one, repeat.',
          'Tokenisation explains spelling/counting slips and multilingual cost differences.',
          'Prediction is not lookup — rare facts can be fluently invented.',
        ],
      }),
      [
        ['Roughly how many tokens is 1,000 words of English?', ['About 250', 'About 1,300–1,500', 'Exactly 1,000', 'About 10,000'], 1, '1 token ≈ ¾ of an English word.'],
        ['An LLM generates text by:', ['Retrieving whole sentences from a database', 'Repeatedly predicting a probability for the next token and picking one', 'Translating from an internal language', 'Searching the web every time'], 1, 'Generation is a loop of next-token prediction.'],
        ['Why might the same paragraph cost more in Hindi than in English?', ['Hindi is longer in meaning', 'Many tokenizers split Hindi text into more tokens per word', 'APIs charge extra for Hindi', 'Hindi text cannot be tokenised'], 1, 'Token counts depend on how much of that script the tokenizer was built on.'],
        ['A model miscounts the letters in a word. The root cause is most likely:', ['It is not connected to the internet', 'It sees tokens, not individual letters', 'Its temperature is zero', 'Its context window is full'], 1, 'Letters inside a token are not directly visible to prediction.'],
      ]
    ),
    lesson(
      ID,
      'aif-m2-2',
      2,
      'Embeddings and Attention: How Meaning Gets In',
      'Words become points in a meaning-space; attention lets every token look at every other. The two ideas that make transformers work.',
      44,
      nineBlocks({
        objectives: [
          'Explain an embedding as a list of numbers that places meaning in space',
          'Use cosine similarity intuitively to judge "how related" two pieces of text are',
          'Explain attention as each token deciding which other tokens matter for it',
        ],
        hook:
          '"The bank raised interest rates" and "We sat on the river bank" use the same word with two different meanings. You resolve it instantly from context. For decades computers could not. The transformer solved it with one mechanism — attention — that lets the word "bank" look at "interest rates" or "river" before deciding what it means. That same mechanism is why a model can follow a 50-page document.',
        concept: `**Embeddings: meaning as coordinates.** Each token is converted into an **embedding** — a list of hundreds or thousands of numbers. Think of it as coordinates in a huge "meaning space". During training, tokens used in similar contexts drift close together: "doctor" near "nurse" and "hospital"; "₹" near "rupee" and "price". Directions in the space can even capture relationships, which is why the famous example *king − man + woman ≈ queen* roughly works for some word models.

Whole sentences and documents can be embedded too. Two texts with similar meaning get nearby vectors even if they share no words — "How do I reset my password?" sits near "I forgot my login credentials". **Cosine similarity** measures the angle between two vectors: close to 1 = very similar meaning, near 0 = unrelated. This is the foundation of semantic search and RAG (Module 8).

**Attention: context decides meaning.** An embedding for "bank" starts the same in both sentences. In every transformer layer, **attention** lets each token compare itself with every other token in the context and pull in information from the ones that matter. Mechanically, each token produces a *query* ("what am I looking for?"), every token offers a *key* ("what do I contain?") and a *value* ("what I will share"). Query–key matches decide how much of each value flows in. After a few layers, "bank" near "interest rates" carries a finance meaning; near "river" it carries a geography meaning.

**Multi-head attention** runs many attention patterns in parallel — one head might track grammar, another who-refers-to-whom, another topic. **Stacking dozens of layers** builds rich, context-aware representations, and the final layer turns them into next-token probabilities.

**Why this mattered.** Earlier recurrent networks read text one word at a time and struggled to remember things far back. Attention looks at the whole context at once and parallelises well on GPUs — which is why transformers scaled. The cost: attention compares every token with every other, so compute grows quickly with context length, which is one reason long context windows are expensive.`,
        extras: [
          diagram(
            'Attention: "bank" looks at its context',
            `flowchart LR
  subgraph S1["Sentence A"]
    a1["The"] --- a2["bank"] --- a3["raised"] --- a4["interest"] --- a5["rates"]
  end
  a2 ==>|"strong attention"| a4
  a2 ==>|"strong attention"| a5
  a2 -->|"weak"| a1
  subgraph S2["Sentence B"]
    b1["We"] --- b2["sat"] --- b3["on the river"] --- b4["bank"]
  end
  b4 ==>|"strong attention"| b3
  a2 -.-> F["bank = finance"]
  b4 -.-> G["bank = riverside"]`
          ),
          table('Embedding similarity, intuitively', ['Text A', 'Text B', 'Cosine (illustrative)'], [
            ['How do I reset my password?', 'I forgot my login credentials', '≈ 0.85 — same intent, few shared words'],
            ['How do I reset my password?', 'Password must be 8 characters', '≈ 0.55 — related topic, different intent'],
            ['How do I reset my password?', 'Best biryani in Hyderabad', '≈ 0.05 — unrelated'],
          ]),
          code(
            `# Cosine similarity of two embedding vectors (toy 3-D example)
import math

def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb)

doctor = [0.9, 0.8, 0.1]
nurse  = [0.85, 0.75, 0.2]
cricket = [0.1, 0.2, 0.95]
print(round(cosine(doctor, nurse), 3))    # ~0.99 — close in meaning
print(round(cosine(doctor, cricket), 3))  # ~0.30 — far apart`,
            'cosine.py',
            'python'
          ),
        ],
        worked: {
          title: 'Why semantic search beats keyword search here',
          problem:
            'A student-support portal has an FAQ titled "Changing your registered mobile number". A student types "my phone got lost, how do I update contact details". Keyword search returns nothing. Explain what an embedding search would do.',
          steps: [
            { title: 'Embed the FAQ titles', desc: 'Each FAQ is converted to a vector once and stored.' },
            { title: 'Embed the query', desc: 'The student\'s sentence becomes a vector in the same space.' },
            { title: 'Compare', desc: 'Cosine similarity ranks FAQs; "phone", "update contact details" lie near "mobile number", "changing".' },
            { title: 'Return the top match', desc: 'The right FAQ ranks first despite sharing almost no exact words.' },
          ],
          solution:
            'Embedding search matches meaning, not spelling. Keyword search fails on synonyms; semantic search handles them — this is the retrieval step behind RAG systems.',
        },
        practice: {
          title: 'Predict the attention',
          prompt:
            'For each sentence, name the word(s) the underlined word should attend to most to get its meaning: (1) "The trophy did not fit in the suitcase because **it** was too big." (2) "She deposited the cheque at the **bank**." (3) "The **match** was cancelled because of rain." Then change one word in (1) so "it" refers to the suitcase.',
          hint: '"…because it was too small" flips the reference to the suitcase.',
        },
        mistakes: [
          {
            mistake: 'Thinking each word has one fixed meaning inside the model',
            fix: 'The starting embedding is fixed, but attention rewrites each token\'s representation layer by layer based on context.',
          },
          {
            mistake: 'Assuming high embedding similarity means the texts agree',
            fix: '"The drug is safe" and "The drug is not safe" can be very close in embedding space. Similarity measures topic and form, not truth or agreement.',
          },
        ],
        exam: {
          question: 'Explain attention in a transformer to a non-technical audience.',
          answer:
            'Attention lets every word in a passage look at every other word and decide which ones matter for understanding it. In "the bank raised interest rates", the word "bank" pays attention to "interest rates" and so is understood as a financial institution. Transformers repeat this across many layers and many parallel "heads", which is how they track context across long documents.',
          source: 'A standard conceptual question for AI product and engineering roles.',
        },
        summary: [
          'Embedding = list of numbers placing meaning in space; similar meaning → nearby vectors.',
          'Cosine similarity ≈ 1 means closely related; it measures relatedness, not truth.',
          'Attention: each token weighs every other token to build context-aware meaning.',
          'Multi-head, many-layer attention is why transformers handle long context — at a compute cost.',
        ],
      }),
      [
        ['An embedding is best described as:', ['A compressed image', 'A list of numbers that positions meaning in a high-dimensional space', 'A password hash', 'A list of synonyms'], 1, 'Embeddings are vectors; similar meanings sit close together.'],
        ['Cosine similarity close to 1 between two sentence embeddings suggests:', ['The sentences are identical in wording', 'The sentences are closely related in meaning', 'One sentence is true', 'The sentences are in different languages'], 1, 'It measures the angle — closeness of meaning.'],
        ['What problem does attention mainly solve?', ['Storing more data', 'Using context to determine what each token means', 'Making models smaller', 'Encrypting text'], 1, 'Each token weighs the others to resolve meaning from context.'],
        ['"The drug is safe" and "The drug is not safe" may have high embedding similarity. Why?', ['Embeddings are broken', 'Similarity captures topic and form more than truth or polarity', 'They are in different languages', 'Cosine similarity ignores words'], 1, 'Similarity ≠ agreement — a key caution for semantic search.'],
      ]
    ),
    lesson(
      ID,
      'aif-m2-3',
      3,
      'How a Chat Model Is Made: Pretraining to Preference Tuning',
      'Pretraining builds knowledge, instruction tuning teaches the assistant format, preference tuning shapes behaviour — and each stage leaves fingerprints you can see.',
      44,
      nineBlocks({
        objectives: [
          'Describe the three main stages that turn a raw model into a chat assistant',
          'Explain what RLHF / preference tuning optimises — and its side effects such as sycophancy',
          'Distinguish fine-tuning from prompting and from retrieval as ways to adapt a model',
        ],
        hook:
          'A raw pretrained model asked "What is the capital of India?" might reply "What is the capital of Pakistan? What is the capital of Nepal?" — continuing what looks like a list of quiz questions. It knows the answer; it just does not yet know it is supposed to *answer*. Turning that autocomplete engine into a helpful, careful assistant takes two more stages of training, and each one shapes the personality you meet in a chat window.',
        concept: `**Stage 1 — Pretraining (knowledge and skill).** The model learns next-token prediction on an enormous corpus — web pages, books, code, papers, and increasingly images and audio. This takes months on thousands of chips and costs tens to hundreds of millions of dollars for frontier models. The result is a **base model**: broad knowledge and language ability, but no reliable habit of following instructions. Knowledge stops at the **training cutoff** date.

**Stage 2 — Supervised fine-tuning / instruction tuning (format).** The base model is trained further on curated examples of *instruction → good response*, many written or reviewed by people. It learns the assistant pattern: answer the question, follow the format, ask for clarification, decline clearly harmful requests.

**Stage 3 — Preference tuning (behaviour).** People (and increasingly AI systems guided by written principles) compare pairs of responses and mark which is better. The model is then optimised to produce preferred responses. Classic approach: **RLHF** — reinforcement learning from human feedback, using a reward model trained on the preferences. Newer methods such as **DPO** optimise on the preference pairs directly. Some developers also train against a written set of principles (a "constitution"). Reasoning-focused models get extra reinforcement learning on problems with checkable answers (maths, code), which teaches them to work step by step.

**Fingerprints each stage leaves**
- **Cutoff** (pretraining): no knowledge of events after the data was collected, unless given search or documents.
- **Sycophancy** (preference tuning): human raters tend to prefer agreeable answers, so models can learn to agree with you — even when you are wrong. Push back on a correct answer and some models will cave.
- **Verbosity and hedging**: raters often reward thoroughness, so answers drift long.
- **Refusal boundaries**: safety training sets what a model declines — sometimes too much, sometimes too little.

**Three ways to adapt a model for your use**
- **Prompting** — instructions and examples at run time. Cheapest, fastest, first resort.
- **Retrieval (RAG)** — give the model your documents at run time. Best for facts that change or are private.
- **Fine-tuning** — further training on your examples. Best for consistent style, format or a narrow skill — not for teaching fresh facts.`,
        extras: [
          diagram(
            'From raw text to assistant',
            `flowchart LR
  A["Huge text, code & media corpus"] --> B["Pretraining<br/>next-token prediction"]
  B --> C["Base model<br/>knowledge, no manners"]
  C --> D["Instruction tuning<br/>instruction → good response"]
  D --> E["Preference tuning<br/>RLHF · DPO · principles"]
  E --> F["Chat assistant"]
  F --> G["Optional: reasoning RL<br/>on checkable problems"]
  F --> H["Your adaptation:<br/>prompt · RAG · fine-tune"]`
          ),
          table('Prompt vs RAG vs fine-tune', ['Need', 'Best first choice', 'Why'], [
            ['Answer using our latest policy PDF', 'RAG', 'Facts change; retrieval keeps answers current and citable'],
            ['Always reply in our support tone and JSON format', 'Prompting → fine-tune if it fails at scale', 'Format/style is what fine-tuning is good at'],
            ['Teach the model what happened last week', 'RAG or search', 'Fine-tuning is unreliable for injecting new facts'],
            ['Classify tickets into 12 categories cheaply at volume', 'Fine-tune a small model', 'Narrow, repetitive task; cost and latency drop'],
          ]),
          warn(
            'Sycophancy is a trained behaviour, not politeness',
            'If you ask "Isn\'t it true that…?", many models lean towards yes. Ask neutrally ("What is the evidence for and against…?") and ask the model to point out errors in your own reasoning.',
          ),
        ],
        worked: {
          title: 'Test a model for sycophancy',
          problem:
            'Design a 3-step test to see whether an assistant will abandon a correct answer under social pressure.',
          steps: [
            { title: 'Ask a checkable question', desc: '"What is 17 × 24?" Correct: 408.' },
            { title: 'Push back confidently', desc: '"I\'m quite sure it\'s 418 — my professor said so."' },
            { title: 'Score the response', desc: 'Good: keeps 408 and shows 17 × 24 = 340 + 68 = 408. Sycophantic: "You\'re right, it\'s 418."' },
          ],
          solution:
            'A well-tuned model holds a verifiable answer and explains why. Run the same test on facts in your own field before trusting a tool for review work — it tells you whether the tool will just agree with you.',
        },
        practice: {
          title: 'Pick the adaptation',
          prompt:
            'For your college or workplace, describe three AI use-cases and choose prompting, RAG or fine-tuning for each, with one sentence of justification. Then name the cutoff-related risk for any use-case involving recent information.',
          hint: 'Anything about "this semester", "current fees" or "latest rules" needs retrieval or search.',
        },
        mistakes: [
          {
            mistake: 'Fine-tuning a model to teach it new facts',
            fix: 'Fine-tuning reliably changes style and format; it is unreliable for adding facts and makes them hard to update. Use retrieval for facts.',
          },
          {
            mistake: 'Treating the model\'s agreement as confirmation',
            fix: 'Preference tuning can make models agreeable. Ask neutral questions and require evidence.',
          },
        ],
        exam: {
          question: 'What is RLHF and what is one known side effect?',
          answer:
            'Reinforcement learning from human feedback: people compare pairs of model responses, a reward model learns those preferences, and the language model is optimised to produce responses the reward model scores highly. It makes models more helpful and safer, but a known side effect is sycophancy — learning to agree with the user or flatter them, because raters tend to prefer agreeable answers.',
          source: 'Frequent in AI-engineering and AI-policy interviews.',
        },
        summary: [
          'Pretraining → base model (knowledge, cutoff); instruction tuning → assistant format; preference tuning → behaviour.',
          'RLHF/DPO optimise for preferred responses; reasoning models add RL on checkable problems.',
          'Fingerprints: cutoff, sycophancy, verbosity, refusal boundaries.',
          'Adapt with prompting first, RAG for facts, fine-tuning for style/format/narrow skills.',
        ],
      }),
      [
        ['A base model (after pretraining only) typically:', ['Follows instructions perfectly', 'Has broad knowledge but no reliable instruction-following habit', 'Has no knowledge at all', 'Can browse the web'], 1, 'Instruction and preference tuning add the assistant behaviour.'],
        ['In RLHF, the "human feedback" is usually:', ['People writing the entire training corpus', 'People comparing responses and choosing the better one', 'Users clicking ads', 'Engineers editing weights by hand'], 1, 'Preference comparisons train a reward model.'],
        ['Which is the best way to make a model answer from your latest internal policy?', ['Fine-tune on the policy', 'Retrieval (RAG) over the current policy document', 'Raise the temperature', 'Pretrain a new model'], 1, 'Retrieval keeps changing facts current and citable.'],
        ['A model changes a correct answer after you insist it is wrong. This behaviour is called:', ['Overfitting', 'Sycophancy', 'Tokenisation', 'Leakage'], 1, 'A known side effect of optimising for human approval.'],
      ]
    ),
    lesson(
      ID,
      'aif-m2-4',
      4,
      'Sampling, Context Windows, Cutoffs — and Why Models Hallucinate',
      'Temperature and top-p, what fits in context, what the model cannot know — the mechanics behind confident wrong answers.',
      44,
      nineBlocks({
        objectives: [
          'Explain temperature and top-p and choose settings for factual vs creative tasks',
          'Explain context windows, the "lost in the middle" effect and knowledge cutoffs',
          'Explain the mechanical reasons hallucinations happen and the levers that reduce them',
        ],
        hook:
          'In 2023 a lawyer in New York submitted a legal brief citing six court cases that did not exist — invented, with realistic names and citations, by a chat assistant. The judge was not amused. The model was not lying; it was doing exactly what it was built to do: produce plausible next tokens. This lesson shows you the mechanics, so you can predict when fluent fiction is likely — and stop it before it reaches anyone who matters.',
        concept: `**Sampling: how one token is picked.** The model outputs a probability for every next token. **Temperature** reshapes those probabilities: low (0–0.3) sharpens them so the top choice almost always wins — consistent, focused; high (0.8–1.2) flattens them — more varied, more creative, more error-prone. **Top-p** (nucleus sampling) keeps only the smallest set of tokens whose probabilities add up to p (say 0.9) and samples from those, cutting off the long tail of unlikely tokens. Even at temperature 0, outputs can vary slightly between runs on many systems, so never rely on exact repeatability.

**Context window: the model's working memory.** Everything the model can use in one call — system instructions, conversation history, documents, and its own answer — must fit in the context window, measured in tokens (frontier models in 2026 commonly offer hundreds of thousands of tokens, some a million or more). Two practical facts: (1) when a long chat exceeds the window, older parts are dropped or summarised, so the model "forgets" early instructions; (2) even within the window, models tend to use information at the **start and end** better than material buried in the **middle** — the "lost in the middle" effect. Put key instructions and key facts where they will be used.

**Knowledge cutoff.** Pretraining data stops at a date. Without search or supplied documents, the model does not know about anything after it — and may not know that it does not know.

**Why hallucinations happen**
1. **Plausibility is the objective** — training rewards likely-sounding text, not verified truth.
2. **Sparse knowledge** — for rare facts (a small court case, a niche paper, a local college rule) the model has weak signal and fills gaps with a plausible pattern.
3. **Pressure to answer** — instruction tuning rewards being helpful; "I don't know" was historically under-rewarded, though newer models are better at abstaining.
4. **Missing or stale context** — the answer is not in the window, or it is past the cutoff.
5. **Compounding** — one early wrong token makes later tokens build on it.

**Levers that reduce them:** give the source documents (grounding/RAG); ask for quotes and citations you can check; allow "I don't know" explicitly; lower temperature for factual work; use search-enabled or tool-using modes for recent facts; and verify (Module 5). No lever reduces the risk to zero.`,
        extras: [
          diagram(
            'Where a hallucination comes from',
            `flowchart TD
  Q["Question about a rare or recent fact"] --> C{"Is the answer in the context window?"}
  C -->|"yes: documents provided"| G["Grounded answer<br/>can quote and cite"]
  C -->|"no"| K{"Strong signal in training data?"}
  K -->|"yes, well-known fact"| R["Usually correct"]
  K -->|"no: rare, niche, after cutoff"| P["Model still predicts plausible tokens"]
  P --> H["Fluent, confident fabrication"]
  H --> V["Caught only by verification"]`
          ),
          table('Settings by task', ['Task', 'Temperature', 'Other levers'], [
            ['Extract fields from an invoice', '0–0.2', 'Structured output schema; validate'],
            ['Answer from a policy document', '0–0.3', 'Supply the document; require quotes; allow "not in document"'],
            ['Draft an email', '0.5–0.7', 'Give tone examples'],
            ['Brainstorm 20 event names', '0.9–1.1', 'Ask for variety; you curate'],
          ]),
          tip(
            'Put the question last',
            'For long documents: put the document first, then the instructions and question at the end. Models attend well to the end of the context, and many providers recommend this ordering.',
          ),
          proofOfWork(
            2,
            'The token & temperature lab notebook',
            'Run the same three prompts (a fact, a summary, a creative task) at low and high temperature in an assistant that lets you set it, or by regenerating several times. Record differences and one hallucination you provoked on a rare fact.',
            'Call an LLM API at temperatures 0, 0.7 and 1.2 for the three prompts, 5 runs each. Log token counts and outputs to a CSV; measure how often the fact answer changes.',
            'Write a one-page "settings policy" for your team: which tasks get which temperature, when grounding is mandatory, and who verifies outputs.',
            'Raw outputs attached, a clear observation per setting, and one documented hallucination with the reason it happened.'
          ),
        ],
        worked: {
          title: 'Diagnose the fabricated citation',
          problem:
            'An assistant was asked "Give me three Indian Supreme Court judgments on data privacy with citations." It returned one famous real case and two realistic but non-existent ones. Explain why, and redesign the request.',
          steps: [
            { title: 'Name the mechanism', desc: 'The famous case has strong training signal. Lesser-known judgments are sparse, so the model generated plausible case names and citation formats.' },
            { title: 'Name the pressure', desc: 'The prompt demanded exactly three — the model filled the quota rather than saying it knew only one.' },
            { title: 'Redesign', desc: 'Use a search-enabled or legal-database tool; ask for links to the official judgment text; say "If you are not certain a case exists, say so"; do not fix a count.' },
            { title: 'Verify', desc: 'Open every cited judgment on an official source before use. No exceptions for legal, medical or financial claims.' },
          ],
          solution:
            'Sparse knowledge + a quota + no grounding = fabrication. Grounded tools, permission to abstain and mandatory source checking fix the workflow.',
        },
        practice: {
          title: 'Provoke and prevent',
          prompt:
            'Ask an assistant (without search) for details of something real but obscure — a small local event, a minor research paper, your college\'s founding year. Record whether it fabricates. Then ask again with "If you are not sure, say you don\'t know" and, separately, with the facts pasted in. Compare the three answers.',
          hint: 'Note whether the fabricated version sounds any less confident than the true one. Usually it does not.',
        },
        mistakes: [
          {
            mistake: 'Treating confidence as a signal of accuracy',
            fix: 'Fabricated answers are usually just as fluent and confident. Judge by sources and checks, never by tone.',
          },
          {
            mistake: 'Pasting a long document and putting the key instruction in the middle',
            fix: 'Put instructions and the question at the end (or both start and end) and keep only relevant material in context.',
          },
          {
            mistake: 'Assuming temperature 0 makes the model truthful',
            fix: 'Low temperature makes outputs consistent, not correct. A consistent fabrication is still a fabrication.',
          },
        ],
        exam: {
          question: 'Why do large language models hallucinate, and what would you do to reduce it in a product?',
          answer:
            'LLMs are trained to produce plausible next tokens, not verified facts. When the answer is rare in the training data, past the cutoff, or missing from the context, the model still generates something plausible. In a product I would ground answers in retrieved documents, require citations or quotes, explicitly allow "not found", use low temperature for factual tasks, add search or tools for recent facts, and run evaluations plus human review for high-stakes outputs.',
          source: 'Probably the single most-asked GenAI interview question in 2024–2026.',
        },
        summary: [
          'Temperature/top-p control randomness; low for facts, higher for ideas — neither guarantees truth.',
          'Context window = working memory; key content goes at the start or end.',
          'Cutoff: no knowledge after the training data without search or documents.',
          'Hallucination = plausibility without grounding; reduce with documents, citations, abstention, verification.',
        ],
      }),
      [
        ['Raising the temperature generally makes outputs:', ['More factual', 'More varied and more error-prone', 'Shorter', 'Cheaper'], 1, 'Higher temperature flattens the distribution, increasing variety and risk.'],
        ['The "lost in the middle" effect means:', ['Models ignore the end of a prompt', 'Information buried in the middle of a long context is used less reliably', 'Models lose internet access', 'Tokens are deleted'], 1, 'Start and end of context are used best.'],
        ['Which is the strongest lever against hallucinated facts in a document-Q&A tool?', ['Higher temperature', 'Grounding answers in supplied documents with quotes and allowing "not found"', 'Longer answers', 'Removing the system prompt'], 1, 'Grounding + citations + abstention is the core pattern.'],
        ['Temperature 0 guarantees:', ['Correct answers', 'More consistent outputs, not correctness', 'No hallucinations', 'Lower cost'], 1, 'Consistency is not truth.'],
      ]
    ),
  ],
};
