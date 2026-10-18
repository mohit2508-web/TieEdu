// Module 4 — Inside a Large Language Model
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info } from '../nineBlocks';
import { lesson, M4, COURSE_ID } from './helpers';

export const module4: CourseModule = {
  id: M4,
  course_id: COURSE_ID,
  title: 'Module 4 — Inside a Large Language Model',
  summary:
    'Tokens, next-token prediction and why it sounds smart, embeddings and attention intuition, context windows, temperature and top-p sampling, and the knowledge cutoff — the full anatomy of a large language model, no matrix calculus required.',
  sort_order: 4,
  lessons: [
    lesson(
      M4,
      'lit-4-1',
      1,
      'Tokens: How an LLM Actually Reads Your Text',
      'Text in, tokens out: what a token is, why models count words in tokens instead of words or characters, and how tokenization shapes cost, limits and multilingual quirks.',
      16,
      nineBlocks({
        objectives: [
          'Explain what a token is and how tokenizers split text into subword pieces',
          'Estimate token counts from text well enough to reason about limits and cost',
          'Describe why subword tokenization was chosen over whole words and characters',
          'Predict common multilingual and number-related tokenization quirks',
        ],
        hook:
          'Ask an LLM "how many words is this paragraph?" and it may get the count wrong — because it never counts words. It counts tokens, in units you cannot see from the chat box. Understanding tokens explains why your long document hit a limit, why your API bill said ₹0.0047, why the model mangles digit-by-digit arithmetic, and why the same sentence in Hindi "costs" more than in English. Tokens are the atom of the entire LLM economy.',
        concept: `**What a token is.** A language model never sees raw text — it sees a sequence of integers, each indexing an entry in a fixed vocabulary (typically 50,000–200,000 entries). A **token** is the text fragment that corresponds to one of those integers: common words like "the" or "is" are usually single tokens; rarer words get split into subword pieces ("token" + "ization"); unfamiliar names become several fragments; spaces and punctuation attach to tokens in language-dependent ways. The component that does this splitting is the **tokenizer**, and it is a fixed, deterministic algorithm — not a neural network. Same tokenizer, same text, same tokens, every time. A typical rule of thumb for English prose: **roughly one token per 3–4 characters, or about ¾ of a word on average** (so 100 English words ≈ 130 tokens). Chat interfaces and APIs both bill and meter in this unit.

**Why subwords? The three-way tradeoff.** Tokenizers could use whole words (few tokens per sentence, but a vocabulary of millions — unmanageable, and every new language or typo explodes it), characters (tiny vocabulary, but sequences so long that the model drowns in sequence length), or **subwords — byte-pair encoding and relatives** (BPE and its modern variants): start from characters/bytes, repeatedly merge the most frequent adjacent pair. Frequent words survive whole; rare words decompose usefully; unseen words still tokenize (into pieces, awkwardly, but never fail). Subwords are the industry consensus because they thread all three constraints: manageable vocabulary, tolerable sequence lengths, and graceful handling of typos, names and morphology. One consequence is worth internalising: **the model\'s "vocabulary" is arbitrary engineering, not linguistics**. "Antidisestablishmentarianism" is a handful of pieces; a rare Sanskrit compound might be dozens.

**Tokens drive cost and limits.** API pricing is quoted per million tokens — input tokens (what you send) and output tokens (what the model generates), usually at different rates, with output typically several times more expensive because generation is sequential. Context windows (next lessons) are measured in tokens too: a 200k-token window is not "200k words" — it is roughly 150k English words, but maybe 100k in a language the tokenizer covers less efficiently, or far fewer if you paste base64 blobs or long code. Every practical LLM skill — budgeting a context, estimating a bill, trimming a document — runs on the token estimate. Getting the estimate roughly right is not a nice-to-have; it is the unit literacy of the field.

**Multilingual and numeric quirks, in the open.** Tokenizers are trained on data with a language mix, and English typically gets the most efficient coverage. The same content in Hindi, Tamil, Bengali or Moroccan Arabic often consumes more tokens per unit of meaning — a real cost and speed asymmetry that affects product design in multilingual countries (and is slowly improving as tokenizers are retrained on more balanced corpora). Numbers get tokenized in chunks that do not always align with arithmetic-friendly units — a big contributor (with sequential generation) to LLMs being unreliable at precise multi-digit arithmetic. Code tokenizes reasonably well because code is frequent in training corpora, though whitespace-sensitive languages add their own wrinkles. Emoji, medical text and DNA sequences are all exotic tokenization territory. None of this is a "bug" the model can apologise for — it is baked into the representation layer the model was born with. Two more practical details: **token count varies by implementation** (ChatGPT\'s tokenizer vs Claude\'s vs an open model\'s will count the same paragraph differently — for billing-level accuracy, use the provider\'s tokenizer tool), and **the BOS/EOS and chat-template tokens** (rare special tokens marking message boundaries) add a small overhead on top of your visible text, which matters when you are packing a context window to the last token.`,
        extras: [
          table(
            'Tokenization intuition on common inputs',
            ['Input', 'Typical tokenization', 'Rough count'],
            [
              ['"the cat"', '["the", " cat"]', '2 tokens'],
              ['"unbelievable"', '["un", "believ", "able"] (varies by tokenizer)', '2–3 tokens'],
              ['"1234567"', 'chunked digit groups, not one token', '2–4 tokens'],
              ['A 700-word English article', 'subword pieces across paragraphs', '≈900–1000 tokens'],
              ['The same article in Hindi', 'less efficient coverage for many tokenizers', 'often more tokens for the same meaning'],
            ],
          ),
          tip(
            'The ¾-word rule for mental math',
            'Words × 4 / 3 ≈ tokens for everyday English. 500 words ≈ 670 tokens. This is good enough to pre-check whether a document fits, roughly estimate a bill, or sanity-check a context-window complaint before blaming the model.',
          ),
          warn(
            '"The model knows the limit exactly" — no, it does not',
            'A chat model truncating or refusing near its limit is operating on token boundaries you cannot see. When debugging "it cut off mid-document", count tokens with the official tokenizer rather than counting words — the mismatch is usually the entire mystery.',
          ),
        ],
        worked: {
          title: 'Budget a document into a context window',
          problem:
            'You want to paste a 12,000-word report into an assistant with a 200k-token context, alongside a system prompt (~500 tokens), your instructions (~200 tokens), and you expect ~4,000 tokens of model reply. English report. Will it fit? How many tokens should you budget for the report?',
          steps: [
            {
              title: 'Estimate the report',
              desc: '12,000 words × 4/3 ≈ 16,000 tokens. Call it 15k–18k allowing for headings, tables and punctuation.',
              code_snippet: '12000 * 4 / 3 = 16000 tokens (rough)',
            },
            {
              title: 'Sum the whole session',
              desc: '500 (system) + 200 (instructions) + ~16,000 (report) + ~4,000 (reply) ≈ 20,700 tokens. Against a 200k window, this is about 10% — enormous headroom.',
              code_snippet: '500 + 200 + 16000 + 4000 ≈ 20700 tokens',
            },
            {
              title: 'If the window were 16k instead',
              desc: 'The same session would overflow. The fix is not "the model is broken" — trim: extract only relevant chapters, raise compression (summarise in two passes), or split into multiple sessions with retrieval. Token arithmetic dictates the plan.',
            },
            {
              title: 'Cost sanity check (illustrative rates)',
              desc: 'At a hypothetical \$1 per 1M input tokens, 16k input tokens ≈ \$0.016 per run. Paste the same document fifty times while iterating and you are paying real money — which is why efficient context use is a professional habit, not frugality theatre.',
            },
          ],
          solution:
            'Yes — ~20.7k of 200k tokens used, comfortable. The same discipline at 16k window size fails and forces trimming. Token estimation turned an abstract limit into a simple yes/no with a plan attached.',
        },
        practice: {
          title: 'Calibrate your token eye',
          prompt:
            'Take any 300-word page (an essay, a README). Predict its token count with the ¾ rule. If you can, verify with a public tokenizer tool (many providers publish one). Write the predicted vs actual and any systematic bias you notice (code higher? punctuation?). If no tool is available, predict token counts for three inputs: a short email, a code function, and a paragraph in a language you know — and explain your reasoning.',
          hint: 'Code and digit-heavy text often tokenize less "word-efficiently" than smooth prose — watch for that.',
        },
        mistakes: [
          {
            mistake: 'Treating tokens as words or characters interchangeably',
            fix: 'Tokens are subword units: roughly ¾ of an English word, but wildly variable for names, code and low-resource languages. Use provider tokenizers for anything billing- or limit-critical.',
          },
          {
            mistake: 'Assuming all languages cost the same tokens for the same content',
            fix: 'Tokenizer efficiency is language-dependent; English usually wins. Multilingual products must budget per language, not with one global word-to-token estimate.',
          },
          {
            mistake: 'Blaming the model for truncating a "short" document',
            fix: 'Count in tokens, not words. A pasted PDF may include tables and headers that tokenize poorly; the same content re-typed as clean prose often fits where the paste did not.',
          },
          {
            mistake: 'Expecting the model to count words or do exact digit arithmetic reliably',
            fix: 'The model\'s unit is tokens, and generation is sequential. For exact counts or precise arithmetic, use deterministic code — the model is a pattern machine, not a calculator.',
          },
        ],
        exam: {
          question:
            'Why do modern LLM tokenizers use subword units instead of whole words or characters?',
          answer:
            'Whole words give short sequences but need enormous, ever-growing vocabularies (millions of entries across languages, names, morphology) and cannot represent unseen words at all. Characters give tiny vocabularies but extremely long sequences, wasting context window and compute and making long-range patterns harder to learn. Subword schemes (e.g. byte-pair encoding) compromise: frequent words stay whole, rare words split into reusable pieces, and any string — typos, neologues, other scripts — can still be encoded. This keeps the vocabulary manageable (tens of thousands), sequences reasonable, and coverage universal — the reasons all production LLMs use some form of subword tokenization.',
          source: 'Standard NLP/LLM interview question; also appears in tokenization-specific coursework.',
        },
        summary: [
          'Tokens are integer-indexed text pieces — the atom of LLM input, output, billing and limits.',
          'Subword tokenization (BPE-family) is the consensus: whole words when frequent, pieces when rare, never fails on unseen text.',
          'English prose ≈ ¾ word per token; code, digits and many non-English languages tokenize less efficiently.',
          'Context windows and prices are token-denominated — estimate in tokens before you paste or bill.',
          'The tokenizer is fixed, deterministic engineering — not learning — chosen before a single weight is trained.',
        ],
      }),
      [
        [
          'A typical rule of thumb for English prose is that 100 words contain roughly how many tokens?',
          ['70', '100', '130', '400'],
          2,
          'About ¾ of a word per token — so 100 words ≈ 130 tokens, varying with content.',
        ],
        [
          'Subword tokenization was adopted mainly because it:',
          [
            'Makes models understand grammar',
            'Balances vocabulary size, sequence length, and coverage of unseen words',
            'Encrypts the text for privacy',
            'Removes the need for GPU training',
          ],
          1,
          'It threads the three-way tradeoff: manageable vocab, reasonable sequence lengths, universal coverage (typos, names, other scripts).',
        ],
        [
          'Why can the same content cost more tokens in Hindi than in English with many current tokenizers?',
          [
            'Hindi text is stored in larger fonts',
            'English-dominant training corpora give English more efficient token coverage; other languages often need more pieces per unit of meaning',
            'Hindi requires encryption tokens',
            'Models refuse Hindi content',
          ],
          1,
          'Tokenizer vocabularies reflect their training data mix; under-represented languages decompose into more tokens for the same semantics.',
        ],
        [
          'API pricing for LLMs is typically quoted per:',
          ['Word', 'Character', 'Million tokens', 'Conversation'],
          2,
          'Input and output tokens, usually at different rates — output often costs several times input.',
        ],
      ]
    ),
    lesson(
      M4,
      'lit-4-2',
      2,
      'Next-Token Prediction: The One Task Behind Everything',
      'How predicting the next token produces essays, code and conversation; why the training objective is so powerful; and what it cannot do by itself.',
      16,
      nineBlocks({
        objectives: [
          'Explain next-token prediction as a probability distribution over the vocabulary',
          'Describe how a long coherent text is produced token by token from that distribution',
          'Argue why this simple objective yields rich capabilities at scale',
          'State at least two limitations that follow directly from the objective',
        ],
        hook:
          'Behind every poem, SQL query, apology and lecture that a chatbot has ever produced sits one question, asked over and over: "given everything so far, what token comes next?" That is not a simplification for this course — it is literally the trained behaviour. The shock of modern AI is not that we found a clever task; it is that this embarrassingly simple task, at internet scale, turned out to contain essay-writing, translation, and a usable theory of syntax.',
        concept: `**The task.** Take a sequence of tokens — "the capital of France is" — and compute a **probability for every token in the vocabulary** as the plausible next one: " Paris" maybe 0.85, " Lyon" 0.03, " the" 0.01, " absolutely" 0.001, and so on across fifty to a hundred thousand candidates. Training means adjusting billions of weights so this distribution is as accurate as possible against real text — where the actual next token was " Paris". That is the entire objective: **maximise the probability of the actual next token, given all previous tokens**. No planning module, no database lookup, no rule list — just a very good probability table, everywhere, all the time.

**Generation is the objective run as a loop.** To produce text, the model takes your prompt as the initial context, computes the next-token distribution, samples or selects one token (selection rules in Lesson 4.4), appends it to the context, and repeats — each new token conditioning everything after it. This is **autoregressive** generation. It also explains the streaming interface: text appears word by word because it is being invented piece by piece, with no knowledge of the sentence\'s ending when it starts the sentence. It explains mid-response reversals (early tokens committed to direction A, later evidence accumulated for B), why reordering your question changes everything, and why generation latency scales with output length: each token requires a full forward pass through the network.

**Why such a simple objective yields so much.** Three ingredients, compounding. First, the objective forces **world modelling**: to predict text well, you must implicitly model everything text carries — grammar, facts, styles, arguments, code semantics, even the structure of a math proof, insofar as those things make the next token more predictable. Predicting Wikipedia well requires something that looks suspiciously like knowing the topic. Second, **scale**: models with hundreds of billions of weights, trained on trillions of tokens, have the capacity and data diversity to encode an enormous range of those patterns — and performance improves smoothly with scale (the scaling laws), which nobody fully expected in 2015. Third, **transfer across formats**: the same weights handle recipes and Python and legal clauses because the task is format-agnostic — any text has a next token. Capabilities the designers did not explicitly install emerge because the data contains them and the objective rewards modelling them. (This is also why the pretraining picture — Module 5 — matters: the raw objective produces a *continuation engine*, and today\'s helpful assistants are that engine plus alignment, not the raw thing.)

**What the objective cannot do by itself.** Because the model optimises plausibility-of-continuation, not truth, it will happily continue "The capital of France is Berlin" into a fluent wrong answer if the context biased it that way — fluency and correctness are different axes (Module 1). It has no native mechanism to say "I do not know"; abstaining must be learned from data or imposed by tooling. It cannot run your code, call your database, or see today\'s news — the objective teaches text patterns, not action or access (tools and retrieval are scaffolding built around the model). And because each token is generated before the next exists, the model cannot cheaply revise its whole plan — though later training and prompting techniques (chain-of-thought, self-consistency, drafting-then-editing) simulate more deliberation within the same token-prediction frame. Keep the frame fixed in your head: **a next-token predictor, extremely well-fed**. Every capability is a consequence; every failure mode is a shadow of the same consequence.`,
        extras: [
          table(
            'One distribution, many behaviours',
            ['Context so far', 'High-probability continuations', 'What it demonstrates'],
            [
              ['"def add(a, b): return"', ' a + b / None / a+b', 'Code semantics patterned from corpus'],
              ['"Q: 17 + 25. A:"', ' 42 / thirty-nine / ...', 'Arithmetic as learned pattern — sometimes wrong'],
              ['"Dear customer, your order"', ' will / has / shipped ...', 'Register & genre knowledge'],
              ['"Once upon a time, there lived a"', ' princess / dragon / ...', 'Narrative convention recall'],
            ],
          ),
          info(
            'Why responses stream in chunks',
            'Tokens are generated one at a time; UIs stream them as they arrive. The visible cadence is the honest latency of sequential computation — not an animation effect.',
          ),
          tip(
            'Use the objective to debug prompts',
            'When a prompt fails, ask: "does my context make the desired token more probable?" Vague context makes vague continuations probable. Adding examples, roles and constraints literally reshapes the distribution the model samples from — this is the whole theory of prompting (Module 6).',
          ),
        ],
        worked: {
          title: 'Generate two tokens by hand',
          problem:
            'Model context: "The tallest mountain in the world is". Vocabulary (tiny edition): {" Everest" p=0.80, " K2" p=0.10, " the" p=0.05, " Mount" p=0.05}. Sample greedily (always take the top token). Suppose after appending " Everest" the model emits " at" with p=0.7. Show the two-step generation and discuss what a temperature change would do.',
          steps: [
            {
              title: 'Step 1 — distribution',
              desc: 'The model returns the next-token distribution over the whole vocabulary: Everest 0.80, K2 0.10, the 0.05, Mount 0.05.',
              code_snippet: '{" Everest": 0.80, " K2": 0.10, " the": 0.05, " Mount": 0.05}',
            },
            {
              title: 'Step 2 — greedy selection',
              desc: 'Greedy decoding picks argmax = " Everest". Context becomes "The tallest mountain in the world is Everest".',
              code_snippet: 'context += " Everest"  # greedy pick',
            },
            {
              title: 'Step 3 — next round',
              desc: 'Re-run the model on the new context. Suppose the top continuation is " at" (0.7). Output so far: "The tallest mountain in the world is Everest at".',
              code_snippet: 'context += " at"  # next greedy pick',
            },
            {
              title: 'Temperature effect',
              desc: 'Temperature below 1 sharpens the distribution (Everest rises toward certainty → same greedy answer, more deterministic sampling). Above 1 flattens it (K2 or " Mount" become live options → more variety, more risk). Top-p would instead cut the tail once cumulative probability reaches p.',
            },
          ],
          solution:
            'Two autoregressive steps produced "…is Everest at". Each step is: context → distribution → pick → append → repeat. Temperature and top-p (Lesson 4.4) merely change the picking rule; the learned next-token behaviour is untouched.',
        },
        practice: {
          title: 'Predict the distribution',
          prompt:
            'For the context "Please sort this list in ascending order: [3, 1, 2]. Output only the sorted list:", list the five most probable next tokens a code-trained LLM might emit, with rough probability guesses. Then list one adversarial context (e.g. a wrong instruction earlier in the chat) that would shift the distribution and explain why.',
          hint: 'Think about what continuations dominate GitHub-style training data for this exact instruction shape — and what a contradictory earlier sentence would do to the conditional probabilities.',
        },
        mistakes: [
          {
            mistake: 'Believing the model "plans" the whole response before writing it',
            fix: 'Generation is token by token with no full-plan lookahead. Coherence across long answers comes from conditioning, plus alignment training — not from pre-composition.',
          },
          {
            mistake: 'Equating high probability with truth',
            fix: 'The model estimates plausibility in text-pattern space, verified against its training distribution — not against a fact database. High-probability is "sounds like", not "is".',
          },
          {
            mistake: 'Thinking next-token prediction is a toy task distinct from "real AI"',
            fix: 'It is the training objective of essentially every production LLM. The right framing: a deceptively simple objective whose emergent capabilities at scale surprised even researchers.',
          },
          {
            mistake: 'Assuming a longer response means deeper reasoning',
            fix: 'Longer output is more sequential sampling, nothing more. Extra tokens can help when they externalise intermediate steps (chain-of-thought), but length alone is not thought — and can dilute accuracy with confident rambling.',
          },
        ],
        exam: {
          question:
            'Explain how an LLM can write a working Python function it was never explicitly trained to write, using the next-token prediction objective and the nature of its training data.',
          answer:
            'The model was trained on enormous text corpora that include vast amounts of code. To predict tokens well in code contexts, the weights must encode the statistical regularities of code: syntax, common APIs, idiomatic control flow, and patterns linking problem descriptions to implementations. When you prompt with a function signature and docstring, that context makes "the tokens of a correct implementation" highly probable under the learned distribution; autoregressive decoding then emits them token by token. The capability is not installed by a coding-specific objective — it emerges from the general objective applied to data that contains code. This also predicts the failure profile: novel algorithms, rare APIs and reasoning-heavy logic fare worse because those patterns were thinner in the training distribution.',
          source: 'The classic "how does it know to code?" interview question for LLM-literacy screens.',
        },
        summary: [
          'Training = maximise P(actual next token | all previous tokens); generation = repeat that prediction autoregressively.',
          'The model outputs a probability per vocabulary token; sampling rules choose among them.',
          'World-modelling emerges because good prediction of text requires modelling what text encodes — grammar, facts, code, argument.',
          'Scale (data + parameters + compute) turns the simple objective into broad capability, improvably smoothly.',
          'Truth, action, and abstention are not native to the objective — that is where hallucination, tool-use and alignment come in.',
        ],
      }),
      [
        [
          'What does an LLM actually output at each generation step?',
          [
            'The full finished response at once',
            'A probability distribution over the entire token vocabulary for the next position',
            'A database query result',
            'A search-engine ranking',
          ],
          1,
          'Each step scores every vocabulary candidate; a selection rule then picks the next token, which is appended before the next step.',
        ],
        [
          'Autoregressive generation means that:',
          [
            'All tokens are computed in parallel from a hidden plan',
            'Each generated token becomes part of the context for predicting subsequent tokens',
            'The model regenerates the entire response each round',
            'Two models debate each token',
          ],
          1,
          'Sequential left-to-right sampling with the growing output fed back in as context — the defining loop.',
        ],
        [
          'Why can the same model write poetry and Python?',
          [
            'Separate sub-models are activated by language detection',
            'The objective is format-agnostic: any text has a next token; capability comes from the data\'s diversity plus scale',
            'Python is stored as special tokens',
            'Poetry uses a different tokenizer',
          ],
          1,
          'One objective, many genres in the corpus; emergent competence follows the patterns present in training text.',
        ],
        [
          'A model confidently completes a false premise into a fluent false answer. The best explanation is:',
          [
            'The model is deliberately lying',
            'It optimises plausible continuation of context, not truth — fluency and correctness are different axes',
            'The tokenizer corrupted the input',
            'Temperature was set to exactly zero',
          ],
          1,
          'Next-token prediction rewards plausibility in pattern space; without grounding or alignment pressure, a false premise steers the distribution toward a matching false continuation.',
        ],
      ]
    ),
    lesson(
      M4,
      'lit-4-3',
      3,
      'Embeddings and Attention: What the Model Looks At',
      'Meaning as nearby points in space; attention as dynamic relevance weighting; and how the two together let a model connect distant words with the right ones.',
      17,
      nineBlocks({
        objectives: [
          'Describe embeddings as coordinates that place similar meanings near each other',
          'Use the classic king–queen–royal analogy to explain vector arithmetic intuition',
          'Explain attention in plain language as "which earlier tokens matter most for this one"',
          'Connect attention and embeddings to practical LLM behaviours you have observed',
        ],
        hook:
          'Ask a chatbot to rewrite "the engineer fixed the bug because he was tired" as "…because she was tired", and watch it handle the pronoun swap cleanly. Somewhere inside, the model had to decide which earlier word "he" was actually about — the engineer, the bug, or something else. That decision is not a lookup table of grammar rules; it is a learned relevance computation called attention, operating over learned coordinates called embeddings. Two ideas, and you can hold both in your head.',
        concept: `**Embeddings: meaning as coordinates.** The model cannot operate on the word "river" as a symbol with a dictionary gloss; it operates on a vector — a list of hundreds or thousands of numbers (its coordinates in a learned meaning-space). The magic property, learned from usage patterns in text: **things used in similar contexts end up near each other**. "River", "stream" and "creek" cluster; "river", "bank account" do not — even though "bank" appears near "river" in some sentences, "bank" the financial institution lives elsewhere in the space. This is the distributional hypothesis made geometric: meaning-in-use ≈ position. Every token gets one of these vectors as its input representation — that is literally what "embedding" means in an LLM: the lookup from token id to coordinates.

**Vector arithmetic as a sanity check.** The famous (approximate, toy-scale) example: king − man + woman ≈ queen. You move from "king" along the direction that means "male → female", and you land near "queen". Country→capital analogies behave similarly. These analogies are not magic and not perfect — they work best on the clean, frequent social categories that dominate the geometry — but they are a powerful existence proof: relationships in this space are captured as consistent directions, which means the model can manipulate them in parallel with everything else. Modern LLMs take this further: embeddings here are **contextual** — "bank" in "river bank" and "bank" in "bank balance" get *different* vectors at inference time, because the embedding is computed after seeing the surrounding sentence. That is why modern LLMs beat the classic static-word-vector era: one surface form, many positions, depending on use.

**Attention: dynamic relevance, per token.** Now the second idea. When the model processes a new token, not all previous tokens matter equally — attention computes, for each new token, a set of **relevance weights** over all earlier tokens (and the new one), then forms the new representation as a weighted blend of their vectors. In "the engineer fixed the bug because he was tired", the pronoun "he" attends strongly to "engineer" and weakly to "bug" and "fixed" — resolving the referent on the fly. Multi-head attention means several of these relevance computations run in parallel per position — one head may track subject–verb agreement, another coreference, another a long-range structural dependency — with the results combined. Crucially, attention is **content-based, not distance-based**: the relevant earlier word can be one token back or five hundred back; distance is not the filter, learned compatibility is. This is exactly why Transformers replaced older recurrent architectures: every token can directly look at every other token in one step, instead of shuffling information through a long chain.

**Putting them together, and what you observe.** Embeddings supply coordinates; attention decides, at every layer, whose coordinates blend into whose. Stack many such layers and you get progressively more abstract per-token representations — the "layers" idea from Module 3, now over sequences. The observable consequences are everywhere: pronoun resolution and translation agreement work because attention wires the right tokens together; long documents can be searched for the sentence relevant to your question; a code model can connect a function call to its definition many lines earlier. The limitations fall out of the same mechanics: attention over very long contexts dilutes and competes (relevant needle, enormous haystack — the needle-in-a-haystack failures); quadratic-ish cost in sequence length explains why long contexts are expensive and slow; and nothing in attention checks the *truth* of the blended information — it only wires relevance. Understand these two objects — coordinates and relevance — and most LLM behaviour stops being mysterious and starts being engineering.`,
        extras: [
          table(
            'Embeddings vs attention',
            ['Concept', 'What it is', 'What it answers'],
            [
              ['Embedding', 'A learned vector of coordinates for a token (contextual in modern LLMs)', '"Where does this meaning live in the space?"'],
              ['Attention', 'Per-token relevance weights over earlier tokens, computed from content', '"Which earlier tokens should shape this one?"'],
              ['Multi-head attention', 'Several parallel relevance computations per position', '"What are the several different relationships at play?"'],
            ],
          ),
          info(
            'The "king − man + woman ≈ queen" caveat',
            'It is a famous classroom demonstration, not a universal law: it is strongest for frequent, cleanly-structured social categories and breaks down for messier relations. Use it to build intuition about directions in meaning-space — not as a claim that meaning is literally arithmetic.',
          ),
          tip(
            'Use attention-intuition to prompt better',
            'Ambiguous pronouns and buried constraints force attention to fight the haystack. Restating the key constraint near the end of your prompt, or naming entities consistently ("the engineer… the engineer"), reduces the relevance work the model must do — and errors fall.',
          ),
        ],
        worked: {
          title: 'Trace attention through a pronoun',
          problem:
            'Sentence: "Maya handed Priya the keys because Maya was driving." Explain, in attention terms, how "she" would (if the last word were "she" instead of "Maya") attach — and why a naive "nearest female name" heuristic would fail on: "Maya told Priya that Priya would drive, so Maya handed her the keys."',
          steps: [
            {
              title: 'Set up the computation',
              desc: 'At the position of the pronoun, attention computes a compatibility score between the pronoun\'s current representation and every earlier token\'s, then softmaxes the scores into weights summing to 1.',
            },
            {
              title: 'Case 1 — simple sentence',
              desc: '"Maya handed Priya the keys because Maya was driving" — "she" (replacing the second Maya) would weight strongly on the driving-clause subject. The content match (driver → pronoun) dominates; both heads and layers can settle it with a short-range, syntactically clean signal.',
            },
            {
              title: 'Case 2 — the trap',
              desc: 'In "Maya told Priya that Priya would drive, so Maya handed her the keys", the nearest preceding female name is Maya — a distance-based heuristic says "Maya". But attention is content-based: "handed … the keys" pattern strongly associates with the driver-in-context, which the sentence structure places as Priya. Competing heads (one tracking recency, one tracking roles) must trade off; layer-by-layer, role information can win.',
            },
            {
              title: 'Connect to behaviour',
              desc: 'When such sentences come out wrong, it is attention failing to assign weight to the right earlier token — often because the relevant cue was long ago, repeated names confused the heads, or the phrasing was atypical. Rewriting with distinct names ("Asha told Neha…") usually fixes it instantly.',
            },
          ],
          solution:
            'Attention resolves references by content-compatibility weights, not by distance. Clean short sentences are easy; repeated names and long-range roles create competition among heads — and occasional failures that clearer phrasing removes. The "heuristic" of nearest-name is exactly the shortcut attention learned to beat, most of the time.',
        },
        practice: {
          title: 'Build a tiny embedding map by hand',
          prompt:
            'Take eight words: king, queen, man, woman, prince, princess, doctor, nurse. Sketch (on paper) a 2-D arrangement where gender-related and royalty-related directions are visible as axes of movement. Write one sentence describing what a "royal" direction and a "female" direction would each do to a starting word. Then name one pair where this tidy geometry already gets messy in real usage.',
          hint: 'The messy pair: doctor/nurse — their historical usage patterns in text carry social biases the geometry faithfully reproduces. Embeddings mirror corpus statistics, including the bad parts.',
        },
        mistakes: [
          {
            mistake: 'Thinking embeddings are stored definitions or one-hot IDs',
            fix: 'One-hot IDs are arbitrary labels with no geometry; embeddings are dense coordinates where distance carries learned meaning. In modern LLMs they are also contextual — recomputed per sentence.',
          },
          {
            mistake: 'Believing attention simply looks at the nearest words',
            fix: 'Attention is content-compatibility, not proximity. The relevant token can be arbitrarily far away; proximity is one weak prior, not the mechanism.',
          },
          {
            mistake: 'Assuming attention weights are human-interpretable explanations',
            fix: 'High attention marks where information flowed, not why the model concluded what it did — and weights are one of many internal signals. Treat mechanistic interpretability results as evidence, not as the model\'s self-explanation.',
          },
          {
            mistake: 'Concluding embeddings are unbiased "objective meaning"',
            fix: 'Embeddings are geometry fitted to corpus statistics — biases in the text (gender, caste, religious associations) appear as directions in the space. Awareness is the first mitigation; debiasing research is ongoing and imperfect.',
          },
        ],
        exam: {
          question:
            'Explain in plain language what attention computes for one token in a Transformer, and why it improves on the sequential memory of earlier RNN-style models.',
          answer:
            'For the current token, attention computes a compatibility score against every other token in the sequence (including itself), softmaxes the scores into a weight vector, and produces the new representation as the weighted sum of the corresponding value vectors. Each head does this independently, so multiple relationships (syntax, coreference, long-range structure) can be captured in parallel. RNN-style models passed information through a chain of steps: a fact from token 1 had to survive many transformations to influence token 500, and gradients/vanishing memory made long-range dependence unreliable. Attention gives every token a direct computational path to every other token in one step — length-agnostic, content-directed — which is why Transformers scaled to long contexts where RNNs plateaued.',
          source: 'Core Transformer question — standard in LLM-interview loops and DL courses alike.',
        },
        summary: [
          'Embeddings place tokens in a learned meaning-space; nearby points share usage patterns — and modern embeddings are contextual.',
          'Vector directions encode relationships (king−man+woman≈queen as a toy proof-of-concept).',
          'Attention computes content-based relevance weights from each token to all earlier ones; multi-head = several relationships in parallel.',
          'Distance is not destiny: long-range links are cheap in Transformers, which is why they beat recurrent chains at scale.',
          'Both mechanisms are unbiased about truth and mirror corpus biases — relevance and geometry, not verification.',
        ],
      }),
      [
        [
          'In an LLM, a token\'s embedding is best described as:',
          [
            'A dictionary definition stored in a lookup table of sentences',
            'A learned vector of coordinates whose neighbourhoods reflect usage similarity',
            'A hash of the token string',
            'The token\'s frequency count',
          ],
          1,
          'Dense learned coordinates; similar-in-use tokens end up near each other — and in modern LLMs the vector is contextual.',
        ],
        [
          'Attention determines for a new token:',
          [
            'Which of the model\'s GPUs to use',
            'How relevant each earlier token is, via content-based compatibility weights',
            'The token\'s position in the file',
            'Whether the token is a verb',
          ],
          1,
          'Softmaxed compatibility scores over earlier tokens; the new representation blends them by weight.',
        ],
        [
          'Why did attention replace sequential RNN memory in language modelling?',
          [
            'RNNs could not process text',
            'Attention gives every token a direct path to every other token, avoiding the long-chain information bottleneck',
            'Attention needs less data',
            'RNNs used too much memory for one token',
          ],
          1,
          'Direct, content-directed, length-agnostic connections fix the long-range-dependence failures of chained recurrence.',
        ],
        [
          'A sentence with ten repeated instances of the same name confuses a model\'s pronoun resolution. The most accurate explanation is:',
          [
            'The tokenizer split the name incorrectly',
            'Competing attention heads must pick among many similar candidates, and the relevance signal is genuinely ambiguous',
            'The model cannot read more than five words',
            'Names are banned tokens',
          ],
          1,
          'Repeated similar tokens compete in the attention score space; ambiguity in the text maps to ambiguity in the weights — fixable by clearer phrasing.',
        ],
      ]
    ),
    lesson(
      M4,
      'lit-4-4',
      4,
      'Context Window, Temperature, Top-p and the Knowledge Cutoff',
      'The four dials that bound every LLM conversation: how much the model can see, how boldly it samples, and when its world knowledge stopped.',
      16,
      nineBlocks({
        objectives: [
          'Define the context window and explain what happens when it is exceeded',
          'Use temperature and top-p to predict how output style and risk change',
          'Distinguish parametric knowledge from retrieved/current information',
          'State a model\'s knowledge cutoff correctly and design around it',
        ],
        hook:
          'Four questions explain almost every LLM surprise in production: What can it see right now (context)? How bold is its sampling (temperature)? How much randomness does it allow (top-p)? And when did it last update its world model (cutoff)? Miss any one and you get a characteristic failure: the amnesiac assistant, the monotone or unhinged rewriter, the confidently outdated answer. This lesson hands you all four dials.',
        concept: `**The context window: everything the model conditions on.** The context window is the maximum number of tokens the model can consider in one forward pass — your system prompt, the whole chat history, pasted documents, and the tokens generated so far, all together. Modern production models range from roughly 100k to several hundred thousand tokens; some research settings go further. Within the window, the model can (in principle, with attention) use any part of the content; beyond it, the content is *gone* — not "ignored", not "forgotten in the sense a person forgets": it was never part of the computation for the current tokens. Most chat UIs handle overflow by silently truncating the oldest messages (your carefully written first paragraph quietly evaporates) or by refusing; APIs usually tell you when you exceed the limit. Practical consequences: conversation history is a consumable resource; long pastes crowd out everything else; and "the model ignored my instruction" is often "your instruction fell off the window three messages ago". Strategies when the window gets tight: summarise old turns, re-paste only the relevant extract, keep the canonical instructions in a system prompt that survives truncation policies, and use retrieval (RAG) so the model sees only document chunks it needs — the entire discipline of context engineering is mostly applied window arithmetic.

**Temperature: the boldness dial.** During sampling, the raw next-token scores (logits) pass through a temperature-scaled softmax before drawing. Temperature below 1.0 **sharpens** the distribution: top candidates gain mass, tails shrink — outputs become more deterministic, more conservative, more repetitive. Temperature near 0 behaves like greedy decoding (always the argmax). Temperature above 1.0 **flattens** the distribution: long-shot tokens gain real probability — more variety, more creativity, and more hallucination risk. The right setting follows the task: factual extraction or code you will run: low (≈0–0.3). Mixed writing: mid (≈0.5–0.8). Brainstorming wild alternatives: higher (≈0.9–1.2). Note the honest caveat: high temperature does not create knowledge the model lacks — it diversifies *sampling among what the model already assigns probability to*, including dubious candidates. Creativity here is selection, not invention from nothing.

**Top-p (nucleus) sampling: the diversity cap.** Instead of sampling from the whole vocabulary, take the smallest set of top tokens whose cumulative probability ≥ p (say 0.9), and sample only within that set. Top-p dynamically adapts: when the model is confident, the nucleus may contain two tokens; when uncertain, it may contain hundreds. It acts as a **tail suppressor** — cutting off the astronomically-unlikely garbage that flattening temperature can otherwise drag in. In practice APIs combine both: temperature sets the shape, top-p clips the tail; most users tune temperature and leave top-p at a provider default (0.9–0.95 is common). One operational note: changing temperature between calls with otherwise identical prompts is standard practice for generating several candidate answers to compare; setting it to exactly 0 gives near-deterministic output — useful for debugging and reproducibility, brittle if you expected variety.

**Knowledge cutoff: when the weights stopped learning.** A model\'s **parametric knowledge** — everything it "knows" without looking anything up — comes from pretraining and fine-tuning data collected up to a fixed date. That date is the **knowledge cutoff**. After it, the model\'s picture of the world is stale; it does not experience later events, and when asked about them it will often do what it does best — continue a plausible pattern — producing confident, fluent, outdated, or fabricated answers. This is not stubbornness or a bug in the chat loop; it is the direct consequence of Lesson 4.2\'s objective applied to frozen weights. Practical handling: check each provider\'s documented cutoff; treat post-cutoff topics as requiring retrieval (web-enabled assistants, file uploads) or human verification; and never let an ungrounded LLM be the final authority on anything time-sensitive — medicine dosing changes, API versions, exam dates, legal amendments. Alignment training can make a model *say* "I may not know about events after my cutoff", but only tooling puts new facts into the computation. When you combine all four lessons of this module, you get the operating manual: tokens meter everything; next-token prediction explains the behaviour; embeddings and attention explain the mechanics; window, sampling and cutoff bound the contract.`,
        extras: [
          table(
            'The four dials, at a glance',
            ['Dial', 'Controls', 'Typical failure when mishandled'],
            [
              ['Context window', 'How much text the model can condition on at all', 'Silent truncation; "ignored" instructions that actually fell off'],
              ['Temperature', 'Sharp vs flat next-token distribution', '0 → robotic repetition; 1.5 → fluent chaos and invented facts'],
              ['Top-p', 'Size of the candidate set by cumulative probability', 'Too low → repetitive; near 1.0 with high temp → tail garbage'],
              ['Knowledge cutoff', 'Currency of built-in world knowledge', 'Confidently stale or fabricated answers on recent events'],
            ],
          ),
          warn(
            'Cutoff questions need external grounding',
            'For anything dated after the cutoff — current APIs, latest exam patterns, recent laws — an offline LLM will improvise. Use web-enabled tools, provide the source document in-context, or verify independently. "The model sounded sure" is not evidence.',
          ),
          tip(
            'A repeatable sampling setup',
            'Fact-like tasks: temperature 0–0.3. Everyday assistance: ~0.5–0.7. Brainstorming: ~1.0 with top-p ~0.95. Keep top-p at the provider default until temperature is tuned; then experiment. Write your settings into your prompt library (Module 6 material) so results are reproducible.',
          ),
          info(
            'Why the window is measured in tokens, not pages',
            'Page counts vary wildly; tokens are the actual unit of computation, billing and limits. Everything about the window is tokens — including the reply the model generates inside the same window.',
          ),
        ],
        worked: {
          title: 'Diagnose a conversation that went wrong',
          problem:
            'A user complains: (1) "After a long chat, the model forgot my formatting instructions from the first message"; (2) "At temperature 1.3 my summary invented statistics"; (3) "I asked about a regulation amended last month; it described the old version confidently." Match each symptom to the dial and prescribe the fix.',
          steps: [
            {
              title: '(1) Forgotten instructions',
              desc: 'Symptom: instruction loss late in a long chat. Culprit: context window — old turns were truncated or diluted. Fix: put durable instructions in the system prompt; periodically re-state them; summarise history; or start a fresh session with the essentials re-pasted.',
            },
            {
              title: '(2) Invented statistics',
              desc: 'Symptom: fabrications in summaries at temp 1.3. Culprit: high temperature flattened the distribution, promoting long-shot (fabricated) tokens into the sampling pool. Fix: drop temperature to ≈0.2–0.4 for factual summaries; require citations to in-context source text; keep top-p moderate.',
            },
            {
              title: '(3) Confidently outdated regulation',
              desc: 'Symptom: pre-amendment content stated as current. Culprit: knowledge cutoff — weights froze before the amendment; no retrieval was in play. Fix: attach the updated document to the prompt (in-context grounding) or use a web-enabled assistant; verify time-sensitive claims independently.',
            },
            {
              title: 'Generalise',
              desc: 'Each failure maps to exactly one contract term: capacity (window), sampling policy (temperature/top-p), or currency (cutoff). Naming the dial converts a vague "the AI is dumb" into a precise, fixable engineering change.',
            },
          ],
          solution:
            '(1) Window truncation → re-anchor instructions in a system prompt and summarise history. (2) High-temperature sampling → lower it for factual work and ground with sources. (3) Knowledge cutoff → inject current documents or retrieval; never trust ungrounded recency claims. Four dials, three bugs, three clean fixes.',
        },
        practice: {
          title: 'Run a sampling experiment',
          prompt:
            'Take one prompt (e.g. "Give three startup ideas for rural healthcare"). Run it at temperature 0, ~0.7, and ~1.3 (any assistant that exposes the setting). Compare: overlap between the three answers, specificity vs wildness, any invented specifics. Write five sentences on which setting you would choose for this task and why. If no adjustable-temperature tool is available, describe exactly what you would expect and how you would verify it when you get access.',
          hint: 'At 0, answers collapse toward the same top candidate; variety and risk both rise with temperature — but knowledge coverage does not.',
        },
        mistakes: [
          {
            mistake: 'Assuming the model can "see" your entire chat history forever',
            fix: 'Only tokens inside the current context window condition generation; overflow truncates. Long chats need active management: summaries, re-anchored instructions, fresh sessions.',
          },
          {
            mistake: 'Raising temperature when you need more accurate facts',
            fix: 'Temperature diversifies sampling; it does not add knowledge. For accuracy: lower temperature, provide sources in-context, and verify — never "temperature up for truth".',
          },
          {
            mistake: 'Treating the knowledge cutoff as a vague disclaimer rather than a hard date',
            fix: 'Ask the provider for the exact cutoff and plan around it. Any topic newer than that date requires retrieval or human verification — no prompt phrasing defeats frozen weights.',
          },
          {
            mistake: 'Confusing context-window size with knowledge size',
            fix: 'A huge window holds more of *your supplied* text; it does not update the model\'s internal knowledge. Long context is a workspace, not a learning mechanism.',
          },
        ],
        exam: {
          question:
            'A team sets temperature to 1.4 for their legal-summaries assistant "to make it creative" and receives fabricated case citations. Explain the mechanism of the failure and outline a corrected configuration.',
          answer:
            'Temperature scales the next-token distribution before sampling: values above 1 flatten it, raising the probability of long-shot tokens — including plausible-looking but nonexistent case names, which pattern-match legal citation formats the model learned well. The model was never "creative" about the law; it was sampling more aggressively from a distribution whose tail contains fabrications. Corrected configuration: low temperature (≈0–0.3) for extractive/faithful summarisation, grounding the source documents in-context (and requiring citations verbatim from them), a moderate top-p (e.g. 0.9), and — given legal stakes — a human review step. Creativity belongs in brainstorming features; faithfulness features should sample as narrowly as possible.',
          source: 'Classic hallucination-cause question in applied-LLM and legal-tech interviews.',
        },
        summary: [
          'The context window is all the model can condition on; overflow truncates or refuses — manage long chats deliberately.',
          'Temperature sharpens (conservative) or flattens (varied, riskier) the sampling distribution — match it to task fidelity.',
          'Top-p caps the candidate set by cumulative probability, suppressing tail garbage; usually tuned after temperature.',
          'Knowledge cutoff is a hard date on frozen weights; post-cutoff facts need retrieval or verification, not better prompting.',
          'Four dials — window, temperature, top-p, cutoff — explain a large share of everyday LLM surprises.',
        ],
      }),
      [
        [
          'The context window of an LLM refers to:',
          [
            'The model\'s total stored knowledge in gigabytes',
            'The maximum tokens it can condition on in one pass — prompt, history, and generated tokens combined',
            'The size of its vocabulary',
            'The GPU memory used during training',
          ],
          1,
          'Everything the model attends over — your messages, files, and its own generations — counts against this token limit.',
        ],
        [
          'Setting temperature near 0 makes outputs:',
          [
            'Wildly creative and unpredictable',
            'Near-deterministic — heavily favouring the top-probability tokens',
            'Longer by default',
            'More factually up to date',
          ],
          1,
          'The distribution sharpens toward the argmax; repeated identical prompts give near-identical outputs.',
        ],
        [
          'Top-p (nucleus) sampling works by:',
          [
            'Keeping only the top p percent of the vocabulary by size',
            'Sampling only from the smallest set of tokens whose cumulative probability reaches p',
            'Truncating the output to p sentences',
            'Dropping the p least-used languages',
          ],
          1,
          'Dynamic candidate-set sizing: tight when confident, wide when uncertain — cutting the extreme probability tail.',
        ],
        [
          'A model confidently answers a question about an event that occurred after its knowledge cutoff. The best remedy is:',
          [
            'Rephrasing the question more politely',
            'Providing current sources in-context or using a retrieval/web-enabled tool, then verifying',
            'Raising the temperature',
            'Splitting the question into smaller questions',
          ],
          1,
          'Frozen weights cannot learn post-cutoff facts from prompting style; grounding the current information into the context (or fetching it) is the actual fix.',
        ],
      ]
    ),
  ],
};
