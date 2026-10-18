// Module 2 — LLM Mechanics, Deeper
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code } from '../nineBlocks';
import { lesson, M2, COURSE_ID } from './helpers';

export const module2: CourseModule = {
  id: M2,
  course_id: COURSE_ID,
  title: 'Module 2 — LLM Mechanics, Deeper',
  summary:
    'Inside the tokenizer (BPE merges and ranks), inside the vector space (contextual embeddings), inside the sampler (logits, softmax, temperature, top-k, top-p worked by hand) and inside serving (system prompts, stop sequences, streaming and the KV cache that makes long context expensive).',
  sort_order: 2,
  lessons: [
    lesson(
      M2,
      'gae-2-1',
      1,
      'BPE Tokenization Internals: How the Vocabulary Is Built',
      'Byte-pair encoding from the inside: counting pairs, merging by frequency, applying merges by rank — and why token counts differ across providers and languages.',
      18,
      nineBlocks({
        objectives: [
          'Describe BPE training: start from characters, count adjacent pairs, merge the most frequent, repeat until a target vocabulary size',
          'Apply merge ranks to encode a word by hand and predict its tokens',
          'Explain why byte-level BPE guarantees any input can be encoded, including typos and other scripts',
          'Predict which of three texts will tokenize most and least efficiently, and connect that to cost and context limits',
        ],
        hook:
          'Ask four different assistants "how many tokens is this?" and get four different numbers for the same paragraph. The tokenizer is not a formality — GPT-class models carry roughly 100k vocab entries, Llama-class models around 128k, Mistral-class around 32k, Qwen-class around 150k (all approximate, shifting with releases as of 2026). Those choices decide your bill, your effective context size, and why your name, your PIN, and your Tamil sentence behave oddly. This lesson takes the tokenizer apart and rebuilds it.',
        concept: `**The problem BPE solves.** Word-level vocabularies explode into millions of entries (every name, typo, inflection); character-level vocabularies are tiny but produce sequences so long the model drowns. BPE (byte-pair encoding), originally a data-compression trick, threads the needle: build a *subword* vocabulary from data by repeatedly merging the most frequent adjacent pair of symbols.

**Training, concretely.** Start with a corpus where every word is split into characters (byte-level variants start from bytes, covered below). Count every adjacent pair across all word *types* weighted by frequency. Merge the winner — the new symbol joins the vocabulary — and recount. Repeat until you hit the target vocabulary size (say 32k or 128k merges). Early merges create frequent short chunks (t, h, e, space-the); middle merges fuse common words (the, ing, re); late merges create whole rare words and domain terms. The result: frequent words survive whole, rare words split into reusable pieces, and unseen words still encode — awkwardly, but never by failure. Crucially, training produces a **merge table with ranks**: merges are applied at encode time *in rank order*, lowest first. Encoding is therefore deterministic: same tokenizer, same text, same tokens, always.

**Byte-level BPE: never fail.** GPT-2/3/4-family tokenizers operate over UTF-8 bytes rather than Unicode characters, with 256 byte slots always available as fallback. Any string — emoji, Sanskrit compound, a broken byte sequence — encodes to *something*. The cost: exotic characters consume several byte tokens each, which is one honest reason non-English text often costs more tokens than the same meaning in English. (Different families make different trade-offs: some use SentencePiece-style **unigram** tokenization — a probabilistic vocabulary learned by likelihood rather than a merge list — plus explicit byte fallback. Different algorithm, same economic consequences.)

**What else lives in the tokenizer.** Special tokens mark message boundaries (start/end of turn, system/user/assistant roles) via a **chat template** — the exact template your model expects. Feed a model the wrong template (or none) and it degrades silently: it was trained with those markers present. There is also a subtlety worth carrying forward: **the tokenizer is fixed before training and never learns**. Vocabulary size, language coverage and numeric chunking are frozen decisions that shape everything downstream — arithmetic reliability (digits chunked into non-positional groups), multilingual cost asymmetry, and code formatting quirks (leading spaces attach to tokens, so indentation-sensitive languages tokenize in a whitespace-dependent way). When a provider says "200k context", that is 200k of *these* units — roughly 150k English words, but fewer in less efficiently covered languages, more for digit-dense or base64 content.`,
        extras: [
          code(
            `# Tiny BPE: train a merge table, then encode with it
corpus = {"hug": 10, "hugs": 5, "unhug": 1}   # word -> frequency

# After counting weighted adjacent pairs:
#   (h,u)=16  (u,g)=16  (g,s)=5  (u,n)=1  (n,h)=1
# Merge the most frequent (tie -> first occurrence wins): "hu"
#   now (hu,g)=16  -> merge "hug"
#   now (hug,s)=5  -> merge "hugs"     # stop at vocab budget
merges = [("h", "u"), ("hu", "g"), ("hug", "s"), ("un", "h")]

def encode(word, merges):
    toks = list(word)
    for a, b in merges:                 # merges applied IN RANK ORDER
        i = 0
        while i < len(toks) - 1:
            if toks[i] == a and toks[i + 1] == b:
                toks[i:i + 2] = [a + b]
            else:
                i += 1
    return toks

print(encode("hugs", merges))    # ['hugs']
print(encode("unhug", merges))   # ['u', 'n', 'hug']
# An unseen word never fails: it degrades into known pieces.`,
            'bpe_toy.py',
            'python'
          ),
          table(
            'Tokenization efficiency varies by content',
            ['Content', 'Why', 'Rough effect on token count'],
            [
              ['English prose', 'Dominant coverage in most training corpora', '≈0.75 tokens per word (baseline)'],
              ['Hindi/Tamil/Arabic script', 'Under-represented in vocabulary learning', 'Often 1.5–3× more tokens per meaning'],
              ['Digits and money', 'Chunked into non-positional groups', 'More tokens than "123" looks like; hurts arithmetic'],
              ['Code with indentation', 'Leading spaces attach to tokens', 'Whitespace style changes counts'],
              ['Rare names, jargon', 'Split into late-merge pieces', '2–5 tokens for one word'],
            ],
          ),
          tip(
            'Provider tokenizer tools are the authority',
            'Rule-of-thumb estimates are for mental math; anything billing- or limit-critical should go through the provider\'s official tokenizer counter. Cross-provider counts genuinely differ.',
          ),
        ],
        worked: {
          title: 'Train a BPE merge table on a 3-word corpus, then encode',
          problem:
            'Corpus: "hug"×10, "hugs"×5, "unhug"×1. Target vocab = 4 new symbols. Run the BPE training loop (count pairs, merge, recount, tie-break by first occurrence), then encode "hugs" and "unhug" using the final merge table in rank order.',
          steps: [
            {
              title: 'Step 1 — count weighted pairs',
              desc: 'Expand by frequency: (h,u) = 10+5+1 = 16, (u,g) = 16, (g,s) = 5, (u,n) = 1, (n,h) = 1. Winner: a 16-way tie between (h,u) and (u,g) — break by first occurrence, so (h,u) merges first.',
              code_snippet: '(h,u)=16  (u,g)=16  (g,s)=5  (u,n)=1  (n,h)=1',
            },
            {
              title: 'Step 2 — merge 1: "hu", then recount',
              desc: 'Words become: hu+g (×10), hu+g+s (×5), u+n+hu+g (×1). New pairs: (hu,g)=16, (g,s)=5, (u,n)=1, (n,hu)=1. Winner: (hu,g).',
            },
            {
              title: 'Step 3 — merges 2 and 3',
              desc: 'Merge 2 creates "hug" (16). Now: hug×10, hug+s×5, u+n+hug×1 → pairs (hug,s)=5, (u,n)=1, (n,hug)=1. Merge 3 creates "hugs". Vocabulary now: base chars + hu + hug + hugs (budget reached; "un"/"nhug" never win).',
              code_snippet: 'rank1: hu   rank2: hug   rank3: hugs',
            },
            {
              title: 'Step 4 — encode by applying ranks in order',
              desc: '"hugs" → h,u,g,s → (rank1) hu,g,s → (rank2) hug,s → (rank3) hugs ⇒ ["hugs"]. "unhug" → u,n,h,u,g → (rank1) u,n,hu,g → (rank2) u,n,hug ⇒ ["u","n","hug"]. The trained word stayed whole; the other word fell back to pieces — exactly the intended behaviour for unseen text.',
            },
          ],
          solution:
            'Merges in order: hu → hug → hugs. Encoding yields ["hugs"] and ["u", "n", "hug"]. The algorithm is just weighted pair counting plus rank-ordered substitution — deterministic, data-driven, and incapable of failing on any input at byte level.',
        },
        practice: {
          title: 'Predict, then verify',
          prompt:
            'Before using any tool: predict token counts for (a) "unbelievable", (b) "₹1,299.00", (c) your full name, (d) the Hindi sentence you know best, (e) a 6-line Python function. Then verify at least two with a public tokenizer page. Write down where your predictions were off and which of the five efficiency rules (Lesson table) explains each miss.',
          hint: 'Expect name, currency, digits and non-Latin script to cost more than intuition suggests; smooth English prose to be cheapest.',
        },
        mistakes: [
          {
            mistake: 'Treating the tokenizer as part of the neural network',
            fix: 'It is a fixed, deterministic algorithm (counts and merges / a vocabulary model) chosen before training. The model never updates it — which is why its quirks are permanent.',
          },
          {
            mistake: 'Assuming vocabulary size means linguistic completeness',
            fix: 'Vocabulary is an engineering budget. A 128k vocab is 128k merge outcomes fitted to a corpus mix — coverage follows data frequency, not linguistic importance.',
          },
          {
            mistake: 'Expecting identical token counts across providers',
            fix: 'Different vocabularies, algorithms (BPE vs unigram) and chat templates produce different counts for identical text — always measure with the specific provider\'s tool.',
          },
          {
            mistake: 'Blaming "the model" for numeric or multilingual tokenization weirdness',
            fix: 'Digit chunking and language efficiency are frozen into the tokenizer. Mitigate with tool-using code for arithmetic and per-language budgeting for multilingual products.',
          },
        ],
        exam: {
          question:
            'Describe the BPE training algorithm and explain why byte-level BPE is preferred over word-level or character-level tokenization.',
          answer:
            'Training: represent the corpus as character (or byte) sequences weighted by word frequency; count all adjacent symbol pairs; merge the most frequent pair into a new vocabulary symbol; repeat until the vocabulary budget is met. This yields a rank-ordered merge table. Encoding applies those merges in rank order, deterministically, so frequent words remain whole while rare and unseen words decompose into learned pieces. Byte-level encoding (over 256 UTF-8 bytes rather than Unicode characters) guarantees any input — typos, emoji, low-resource scripts — can be represented, removing out-of-vocabulary failure entirely. Compared with word-level schemes it keeps the vocabulary manageable (tens to low hundreds of thousands rather than millions) and covers unseen forms; compared with character-level it keeps sequence lengths short enough for context windows and attention cost, while giving the model meaningful subword units instead of raw letters.',
          source: 'Standard NLP interview question (tokenization) and a favourite in LLM-infrastructure screens.',
        },
        summary: [
          'BPE trains a vocabulary by repeatedly merging the most frequent adjacent pair; the output is a rank-ordered merge table.',
          'Encoding is deterministic: apply merges lowest-rank first — frequent words stay whole, rare words fall back to pieces.',
          'Byte-level BPE never fails on any input; exotic characters just cost several tokens.',
          'Tokenizer choices freeze forever: they set multilingual cost, numeric behaviour, code whitespace quirks and chat templates.',
          'Token counts are provider-specific — measure with the official tokenizer for anything billing- or limit-critical.',
        ],
      }),
      [
        [
          'BPE vocabulary training works by:',
          [
            'Listing every word in a dictionary and sorting by frequency',
            'Starting from characters, repeatedly merging the most frequent adjacent pair until the vocabulary budget is reached',
            'Learning embeddings for each word jointly with the LLM',
            'Splitting text at every punctuation mark',
          ],
          1,
          'Weighted pair counting plus iterative merging — a compression algorithm repurposed as a tokenizer.',
        ],
        [
          'At encode time, a trained BPE tokenizer applies merges according to:',
          [
            'Alphabetical order',
            'The rank order established during training (lowest rank first)',
            'The order words appear in your prompt',
            'The model\'s attention weights',
          ],
          1,
          'Rank order is what makes encoding deterministic and reproducible across runs and machines.',
        ],
        [
          'Byte-level BPE is valuable mainly because it:',
          [
            'Compresses text better than gzip',
            'Guarantees any input — typos, emoji, other scripts — can be encoded using the 256 byte slots',
            'Removes the need for a vocabulary',
            'Makes multilingual text cost fewer tokens than English',
          ],
          1,
          'No out-of-vocabulary failure by construction; the trade-off is that exotic characters may consume multiple byte tokens.',
        ],
        [
          'Why do two providers report different token counts for the same paragraph?',
          [
            'One of them is miscounting',
            'They use different vocabularies, algorithms and chat templates — tokenizer design is a per-provider engineering choice',
            'Paragraph length changes with temperature',
            'Tokens are measured in words after 2024',
          ],
          1,
          'Distinct tokenizers partition text differently; counts are only meaningful relative to a specific tokenizer.',
        ],
      ]
    ),
    lesson(
      M2,
      'gae-2-2',
      2,
      'Embeddings in Vector Space: Meaning as Geometry',
      'Contextual vectors, cosine similarity and the retrieval machinery embeddings power — plus how the same geometry lives inside every layer of an LLM.',
      18,
      nineBlocks({
        objectives: [
          'Explain how an LLM produces a contextual embedding for a token and how sentence embeddings are derived for retrieval',
          'Compute and interpret cosine similarity on toy vectors with a chosen threshold',
          'Distinguish embedding models (vector output) from generative models (text output) and where each fits in a pipeline',
          'Diagnose three common embedding failures: domain mismatch, uncalibrated thresholds, and bias inherited from the corpus',
        ],
        hook:
          'Search "how do I reset my password" in a modern help centre and you find the article titled "Change your login credentials" — no keyword overlap, yet it ranks first. Behind it: an embedding model turned both texts into vectors and cosine similarity did the matching. The same geometry powers semantic search, RAG retrieval, deduplication, clustering, moderation — and, one level down, the internal representations every LLM computation runs on. Two uses of "embedding", one idea: meaning as position in space.',
        concept: `**From IDs to coordinates.** A token ID is an arbitrary label — swapping numbers changes nothing. An *embedding* replaces the label with a dense vector (hundreds to a few thousand numbers) whose geometry is learned: tokens used in similar contexts land near each other. In an LLM, this is the input lookup — but the important move is that embeddings become **contextual**: the vector for "bank" is recomputed per sentence from everything around it, so "river bank" and "bank balance" occupy different positions. Layers above the input embedding transform these vectors further; the vectors a model attends over are the evolving, per-layer representations — this is what attention actually manipulates (Lesson 1.3).

**Embedding models for retrieval.** Separate from the LLM sit *embedding models*: networks trained so that related texts — across paraphrase, languages, even modalities (CLIP-style image/text models share one space) — end up close. Typical pipeline: embed the corpus once, store vectors, embed the query, take nearest neighbours by **cosine similarity** (the cosine of the angle between vectors — 1.0 identical direction, 0 orthogonal, insensitive to magnitude once normalised; equivalently, dot product on normalised vectors). Sentence-level embeddings are produced by pooling token vectors (mean pooling, a special summary token, or a model trained directly on sentence objectives) — pooling choice matters: an embedding model tuned for search beats naive averaging of an LLM\'s last layer.

**How similarity is used.** (1) Retrieval: top-k nearest chunks feed a generator (the R of RAG). (2) Deduplication and clustering: similarity above a high threshold ⇒ near-duplicate. (3) Classify-by-centroid: average embeddings per class, assign by nearest centroid — a discriminative use of generative-era geometry. (4) Reranking and moderation: cheap first-pass filter before an expensive model. Notice what never appears: a probability. Cosine 0.82 is *not* "82% relevant" — scores are model-specific, uncalibrated, and typically compressed into a narrow band (many models never produce values below ~0.3 for normalised text pairs), which is why thresholds must be set from your own judged pairs, not from intuition.

**Failure modes worth knowing.** *Domain mismatch*: an embedding model trained on web prose clusters legal clauses poorly — measure retrieval on your data. *Anisotropy / hubness*: real embedding spaces are "banana-shaped" — vectors cluster in a narrow cone, and some generic texts become near-neighbours of everything (hubs), skewing retrieval; mean-centring and Matryoshka-style dimension truncation are partial remedies. *Length and truncation limits*: models see a fixed token budget; long documents silently lose their tail. *Bias*: geometry faithfully reproduces corpus associations (Lesson 1.3 caveat applies). And the meta-point: embeddings are cheap, fast, non-generative and auditable — which is exactly why production systems use vectors for routing and retrieval while reserving the LLM for language.`,
        extras: [
          table(
            'Embedding models vs generative models in a pipeline',
            ['Property', 'Embedding model', 'Generative model (LLM)'],
            [
              ['Output', 'One fixed-size vector', 'A sequence of tokens (text, code)'],
              ['Cost per call', 'Very low (one forward pass)', 'High (sequential decoding)'],
              ['Best at', 'Similarity, search, clustering, routing', 'Language, reasoning, creation'],
              ['Determinism', 'Near-deterministic for same input', 'Sampling-dependent'],
              ['Failure signature', 'Wrong neighbour retrieved (missed/irrelevant)', 'Fluent but wrong or hallucinated text'],
            ],
          ),
          warn(
            'A cosine threshold is a product decision',
            '0.75 may be perfect for near-duplicate tickets and disastrous for cross-topic recall. Label ~100 query-result pairs, sweep the threshold, plot precision/recall — then pick. Never import a threshold from a blog post.',
          ),
          tip(
            'Embeddings as a free classifier',
            'Before paying for an LLM call on a routing decision, try embedding + nearest centroid or similarity to labelled exemplars. It is often 95% as good at 1% of the cost, with the LLM reserved for exceptions.',
          ),
        ],
        worked: {
          title: 'Compute similarities by hand and set a dedup threshold',
          problem:
            'Three 3-D toy embeddings (already normalised for simplicity): u = (1, 0, 0) — "reset password"; v = (0.8, 0.6, 0) — "change login credentials"; w = (0.5, 0.5, 0.707) — "enable two-factor auth". Compute cos(u,v), cos(u,w), cos(v,w). Then design a dedup rule for a ticket queue and state one risk of your chosen threshold.',
          steps: [
            {
              title: 'Step 1 — cosine for u and v',
              desc: 'cos = (u·v) / (|u|·|v|) = (1×0.8 + 0 + 0) / (1 × 1) = 0.8. Two paraphrased tickets — strongly aligned.',
              code_snippet: 'cos(u,v) = 0.8 / 1 = 0.80',
            },
            {
              title: 'Step 2 — cosine for u and w',
              desc: 'cos(u,w) = (1×0.5 + 0 + 0) / (1 × √(0.25+0.25+0.5)) = 0.5 / 1 = 0.5. Related domain, different intent — much weaker.',
              code_snippet: 'cos(u,w) = 0.5 / 1 = 0.50',
            },
            {
              title: 'Step 3 — cosine for v and w',
              desc: 'cos(v,w) = (0.8×0.5 + 0.6×0.5 + 0) / 1 = 0.4 + 0.3 = 0.7. Interesting: v and w are closer to each other than either is to u — a reminder that intuition about "closeness" must be checked numerically.',
              code_snippet: 'cos(v,w) = 0.70',
            },
            {
              title: 'Step 4 — set the threshold, name the risk',
              desc: 'For "merge obvious duplicates only": threshold 0.78 catches u–v (0.80) and misses v–w (0.70) — high precision, lower recall. At 0.68 you also merge v–w, risking over-merge of distinct intents. Recommendation: 0.78 for auto-merge, 0.68–0.78 routed to a human/LLM check — and validate both numbers on ~100 labelled pairs from your own queue, because real-model scores are uncalibrated.',
            },
          ],
          solution:
            'cos(u,v)=0.80, cos(u,w)=0.50, cos(v,w)=0.70. Auto-merge at 0.78, human-check the 0.68–0.78 band, calibrate on labelled pairs — thresholds are data-driven product decisions, not constants of embedding space.',
        },
        practice: {
          title: 'Build a mini semantic-search test',
          prompt:
            'Pick 10 sentences from your own notes on one topic plus 5 unrelated sentences from a different topic. If you have access to an embedding tool/API: embed all 15, and for three probe queries write the top-3 neighbours and their scores. If not: hand-sketch where you would place them in 2-D and mark what a threshold of "close enough" would include. Report one surprising neighbour and your best explanation for it.',
          hint: 'Look for a generic sentence (e.g. "This is important") acting as a hub — near many things because it fits many contexts.',
        },
        mistakes: [
          {
            mistake: 'Confusing token IDs with embeddings',
            fix: 'IDs are arbitrary integer labels with zero geometry; embeddings are dense learned coordinates where distance carries meaning. The ID is the index; the embedding is the content.',
          },
          {
            mistake: 'Reading cosine similarity as a probability',
            fix: 'It is an uncalibrated, model-specific angle score, often compressed into a narrow range. Convert to probabilities only via calibration on labelled data.',
          },
          {
            mistake: 'Assuming one embedding model suits every domain',
            fix: 'Retrieval quality is domain-dependent: legal, medical and code text need evaluation against your corpus, and sometimes a model fine-tuned for that domain, before deployment.',
          },
          {
            mistake: 'Believing embeddings are objective, bias-free meaning',
            fix: 'They are geometry fitted to corpus statistics — social biases appear as directions and neighbourhoods. Audit similarity behaviour on sensitive attributes before using them for decisions.',
          },
        ],
        exam: {
          question:
            'Explain how embeddings enable semantic search, including the similarity metric used, how vectors are typically stored and queried, and one limitation practitioners must handle.',
          answer:
            'Each document (or chunk) is converted by an embedding model into a fixed-size vector such that semantically related texts are close in that space; queries are embedded with the same model. Similarity — usually cosine similarity, equivalently dot product on normalised vectors — ranks documents by closeness, and the top-k are returned or passed to a generator. Vectors are stored in a vector index (exact search at small scale; approximate nearest-neighbour structures like HNSW for scale), often with metadata filters. Key limitation: scores are uncalibrated — "0.8" is not 80% relevant — so thresholds must be tuned on labelled pairs; additionally, domain mismatch can silently collapse retrieval quality, and long documents may be truncated or need chunking before embedding. Semantic search therefore improves but does not replace evaluation: you still measure whether the right chunk is retrieved for real questions.',
          source: 'Core RAG/search engineering question; also appears in ML system-design interviews.',
        },
        summary: [
          'Embeddings turn symbols into learned coordinates; modern LLM embeddings are contextual, recomputed from surrounding text.',
          'Retrieval uses cosine similarity (or normalised dot product) over stored vectors queried by ANN indexes.',
          'Embedding models output vectors cheaply and near-deterministically; LLMs output language expensively — different pipeline roles.',
          'Cosine scores are uncalibrated: set thresholds from labelled pairs on your own data, never from intuition.',
          'Geometry inherits corpus bias and suffers domain mismatch, truncation and hubness — evaluate, do not assume.',
        ],
      }),
      [
        [
          'In modern LLMs, a token\'s embedding is best described as:',
          [
            'A fixed lookup-table entry that never changes',
            'A contextual vector recomputed from the surrounding sequence',
            'A one-hot integer index',
            'The token\'s frequency count',
          ],
          1,
          'Contextualisation is the difference between static word vectors (word2vec era) and transformer representations.',
        ],
        [
          'Cosine similarity between two embedding vectors measures:',
          [
            'The Euclidean distance between documents',
            'The cosine of the angle between them — direction alignment, independent of magnitude',
            'The percentage of shared words',
            'The probability that the documents are relevant',
          ],
          1,
          'Direction, not length, and definitely not a calibrated probability.',
        ],
        [
          'Why must similarity thresholds be tuned on your own labelled pairs?',
          [
            'Embedding models change daily',
            'Scores are model-specific and uncalibrated — value ranges and semantics differ across models and domains',
            'Cosine is undefined without labels',
            'Thresholds are random by construction',
          ],
          1,
          'A "good" score for one model/domain may be unreachable for another; calibration comes from data.',
        ],
        [
          'The clearest division of labour in a RAG pipeline is:',
          [
            'The LLM embeds documents and the embedding model writes the answer',
            'The embedding model retrieves candidate chunks by vector similarity; the LLM reads them and generates the answer',
            'Both models generate text and vote',
            'Embeddings are only used for billing',
          ],
          1,
          'Cheap vector matching for recall, expensive generation for language — each model doing the job its training supports.',
        ],
      ]
    ),
    lesson(
      M2,
      'gae-2-3',
      3,
      'From Logit to Token: Softmax, Temperature, Top-k and Top-p',
      'The full sampling pipeline with hand-worked numbers: raw scores to probabilities to the one token that gets appended.',
      19,
      nineBlocks({
        objectives: [
          'Trace the decoding pipeline: logits → temperature-scaled softmax → top-k/top-p filtering → renormalisation → sampled token',
          'Compute a softmax by hand and predict how temperature 0.5 reshapes it',
          'Derive the exact candidate sets for top-k=3 and top-p=0.9 on a given distribution',
          'Choose a decoding configuration for four different tasks and justify each choice',
        ],
        hook:
          'Run the same prompt three times and the answers differ — except when temperature is 0 and they suddenly do not. Your JSON extractor fails at temperature 1 but passes at 0.1. A brainstorming tool feels "samey" at low settings and unhinged at high ones. None of this is magic: between the model\'s raw scores and the token you see sit a handful of arithmetic operations, each with a knob. This lesson runs those operations by hand so the knobs stop being folklore.',
        concept: `**Logits: raw scores.** The model\'s final layer emits one number per vocabulary token — the **logit** — for the next position. They are unnormalised: 4.2, 1.8, −0.3, … Positive, negative, any magnitude; alone they mean nothing.

**Softmax: scores into probabilities.** Softmax exponentiates each logit and divides by the sum: pᵢ = e^zi / Σe^zj. Exponentiation makes everything positive and *amplifies differences* — a 1-unit logit gap becomes a 2.72× probability ratio — then normalisation forces the distribution to sum to 1, giving a usable "next token" distribution. (If all logits are equal, softmax returns uniform.)

**Temperature: reshape before you sample.** Divide logits by T before softmax. T < 1 sharpens: gaps inflate, the leader pulls away, the tail shrinks — toward greedy, deterministic decoding as T → 0. T > 1 flattens: gaps deflate, long-shots gain mass — variety and risk together. Note precisely what temperature is *not*: it does not add knowledge or creativity from outside the model; it re-weights the probabilities the model already holds, including bad ones.

**Top-k and top-p: cut the candidate set, then renormalise.** Top-k keeps exactly the k highest-probability tokens regardless of shape. Top-p (nucleus) keeps the *smallest* set whose cumulative probability reaches p — dynamic: two tokens when confident, hundreds when uncertain. In both cases the survivors are renormalised to sum to 1 before drawing the token. APIs apply them in a standard order: **logits → temperature → softmax → top-k/top-p filter → renormalise → sample**. Practically: tune temperature first, leave top-p at the provider default (0.9–0.95 is common) until you have a reason, and treat top-k as a belt-and-braces guard against tail garbage. Some open-source stacks instead expose **min-p** (keep tokens at least a fraction of the top token\'s probability), which scales with model confidence — same idea, different cut rule.

**Greedy, sampling, and what is rare where.** Greedy (argmax / T=0) is right for extraction, classification-style tasks and reproducible pipelines. Moderate sampling (T ≈ 0.3–0.8) suits chat and drafting. High T (≈ 1.0–1.3) is for genuine brainstorming where you *want* to be surprised. Beam search — the old workhorse of translation — is largely absent from chat LLMs, where diverse natural phrasing beats narrow likelihood maximisation. One honest caveat: T=0 is near-deterministic, not perfectly so — batching order and floating-point hardware can still flip ties.

**Two adjacent controls worth knowing.** *Repetition penalties* (and their cousins, frequency and presence penalties in several APIs) down-weight tokens already emitted, breaking loops before they start — useful at higher temperatures, dangerous at low ones (they can punish legitimate repetition like code identifiers). *Seed parameters*, where exposed, pin the RNG draw so identical settings replay identical samples — the backbone of reproducible prompt experiments. For offline evaluation, the professional default is the boring one: temperature 0, fixed prompts, version-pinned models — so that score changes mean model or prompt changes, not sampling luck. The knobs exist to shape a distribution; disciplined pipelines shape it once, then measure.`,
        extras: [
          code(
            `import math

logits = [4.0, 3.0, 2.0, 1.0, 0.5, -0.5]

def softmax(xs, T=1.0):
    e = [math.exp(x / T) for x in xs]
    s = sum(e)
    return [round(v / s, 3) for v in e]

softmax(logits)         # [0.627, 0.231, 0.085, 0.031, 0.019, 0.007]
softmax(logits, 0.5)    # [0.864, 0.117, 0.016, 0.002, 0.001, 0.0]

def top_p(ps, p=0.9):
    kept, total = [], 0.0
    for prob in sorted(ps, reverse=True):
        kept.append(prob); total += prob
        if total >= p: break
    n = sum(kept)
    return [round(v / n, 3) for v in kept]

top_p(softmax(logits))  # [0.665, 0.245, 0.09]  <- same as top-k=3 here`,
            'sampling_toy.py',
            'python'
          ),
          table(
            'Decoding presets that hold up in practice',
            ['Task', 'Temperature', 'Top-p / top-k', 'Why'],
            [
              ['Extraction, JSON, classification', '0 – 0.2', 'default (0.9–0.95)', 'Repeatable, minimal deviation from the argmax'],
              ['Code generation', '0 – 0.3', 'default', 'Correctness beats variety; deterministic debugging'],
              ['Chat / drafting', '0.4 – 0.8', 'default', 'Natural variation without tail-dragging'],
              ['Brainstorming, naming, copy', '0.9 – 1.2', '0.95 or wider', 'Maximum spread over the model\'s plausible options'],
            ],
          ),
          tip(
            'One dial at a time',
            'Changing temperature and top-p together makes experiments uninterpretable. Fix top-p at default, sweep temperature, compare three runs per setting — then touch top-p only if the tail still misbehaves.',
          ),
        ],
        worked: {
          title: 'Hand-run the sampler on a six-token distribution',
          problem:
            'Next-token logits for candidates [A, B, C, D, E, F] = [4.0, 3.0, 2.0, 1.0, 0.5, −0.5]. (1) Compute softmax at T=1. (2) Compute softmax at T=0.5. (3) Apply top-k=3 at T=1 and renormalise. (4) Apply top-p=0.9 at T=1. (5) Explain when top-p=0.9 would differ from top-k=3.',
          steps: [
            {
              title: 'Step 1 — softmax at T=1',
              desc: 'Exponentiate: e^4=54.60, e^3=20.09, e^2=7.39, e^1=2.72, e^0.5=1.65, e^-0.5=0.61. Sum = 87.05. Divide: [0.627, 0.231, 0.085, 0.031, 0.019, 0.007].',
              code_snippet: 'p = [0.627, 0.231, 0.085, 0.031, 0.019, 0.007]',
            },
            {
              title: 'Step 2 — softmax at T=0.5 (logits doubled)',
              desc: 'Logits become [8, 6, 4, 2, 1, −1]; exponentials [2981, 403, 54.6, 7.39, 2.72, 0.37], sum 3449.5 → [0.864, 0.117, 0.016, 0.002, 0.001, 0.0001]. The leader jumps 0.627 → 0.864; the tail is crushed.',
              code_snippet: 'p_T0.5 = [0.864, 0.117, 0.016, 0.002, 0.001, 0.0001]',
            },
            {
              title: 'Step 3 — top-k=3, renormalise',
              desc: 'Keep A, B, C: mass = 0.627+0.231+0.085 = 0.943. Renormalised: [0.665, 0.245, 0.090]. D, E, F are now impossible — no matter their residual probability.',
              code_snippet: 'top3 renorm = [0.665, 0.245, 0.090]',
            },
            {
              title: 'Step 4 — top-p=0.9 and when they diverge',
              desc: 'Cumulative: 0.627 → 0.858 → 0.943. Two tokens only reach 0.858 < 0.9, so the nucleus is {A, B, C} — identical to top-k=3 here. They diverge on flatter distributions: if probabilities were [0.3, 0.25, 0.2, 0.15, 0.1], top-k=3 keeps 75% of mass while top-p=0.9 must keep all five. Rule: top-k is fixed-count, top-p is mass-aware.',
              code_snippet: 'cum: 0.627, 0.858, 0.943 >= 0.9 -> nucleus {A,B,C}',
            },
          ],
          solution:
            'T=1: [0.627, 0.231, 0.085, 0.031, 0.019, 0.007]. T=0.5 concentrates to 0.864 on A. Top-k=3 and top-p=0.9 both reduce to {A, B, C} renormalised — they coincide here and split on flat distributions, which is exactly why nucleus sampling is the default adaptive guard.',
        },
        practice: {
          title: 'Run the sampler yourself',
          prompt:
            'Take one prompt you can run at adjustable settings ("Give five product taglines for a campus laundry service"). Run it at T=0, T=0.7, T=1.2 (top-p fixed). Record: overlap between runs, specificity, any invented claims. Then, using the code snippet above, compute softmax and top-p by hand for logits [2.0, 1.9, 1.8, 0.1] at T=1 and T=0.5 and describe how the nucleus changes.',
          hint: 'Near-tied logits at T=1 give a broad nucleus; at T=0.5 the first two tokens usually swallow the budget.',
        },
        mistakes: [
          {
            mistake: 'Raising temperature to make the model more accurate',
            fix: 'Temperature re-weights existing probabilities; it cannot add facts or reasoning. For accuracy: lower temperature, ground the input, verify — never "temperature up for truth".',
          },
          {
            mistake: 'Reading top-p=0.9 as "keep 90% of the vocabulary"',
            fix: 'It keeps the smallest set covering 90% of the *probability mass* — often a handful of tokens when confident, hundreds when flat.',
          },
          {
            mistake: 'Setting temperature, top-k and top-p all to extreme values together',
            fix: 'Stacked filters interact: high T plus tight p/k starves variety; high T plus p=1.0 drags tail garbage in. Tune temperature first, keep p at default, use k/min-p as guards.',
          },
          {
            mistake: 'Expecting T=0 to make output bit-identical everywhere',
            fix: 'Greedy is near-deterministic: ties, batching order and hardware kernels can still change results. For reproducibility pin the model version too, not just the temperature.',
          },
        ],
        exam: {
          question:
            'A support-bot team reports creative, sometimes hallucinated replies at temperature 1.2 and robotic loops at temperature 0. Explain both mechanically and specify a corrected configuration for factual ticket responses.',
          answer:
            'Temperature scales logits before softmax: at 1.2 the distribution flattens, so long-shot tokens — including fabrications the model barely assigns probability to — enter the sampling pool with real mass, producing variety plus invention. At 0 the distribution collapses to its argmax, and once the model enters a phrase it tends to loop on the same high-probability continuation, giving repetitive, rigid text. Mechanism aside, both settings were mismatched to the task. Correct configuration for factual support replies: temperature 0–0.3 (deterministic extraction of grounded facts), top-p at the provider default (0.9–0.95) or slightly tightened as a tail guard, ground truth supplied in-context (ticket data, policy documents) with answers required to cite them, and validation of structured fields (order IDs, amounts) in code. Reserve higher temperatures for genuinely open creative features, never for fact-bearing ones.',
          source: 'Classic applied-LLM configuration question; also common in chatbot tuning case interviews.',
        },
        summary: [
          'Decoding pipeline: logits → divide by T → softmax → top-k/top-p filter → renormalise → sample → append.',
          'Softmax turns raw scores into a distribution, amplifying gaps by exponentiation.',
          'T<1 sharpens toward greedy; T>1 flattens toward the tail — re-weighting only what the model already believes.',
          'Top-k is fixed-count; top-p is cumulative-mass and adapts to confidence — they coincide on peaked distributions.',
          'Match decoding to task fidelity: 0–0.3 for extraction/code, ~0.5–0.8 chat, ~1.0+ brainstorming; tune one dial at a time.',
        ],
      }),
      [
        [
          'Before sampling the next token, temperature is applied by:',
          [
            'Adding noise to the embedding vectors',
            'Dividing the logits by T prior to softmax, which sharpens (T<1) or flattens (T>1) the resulting distribution',
            'Truncating the response length to T words',
            'Selecting the top T vocabulary entries',
          ],
          1,
          'Temperature is a pre-softmax scaling of raw scores — the entire mechanism.',
        ],
        [
          'Top-p (nucleus) sampling keeps:',
          [
            'The p highest-probability tokens by count',
            'The smallest set of tokens whose cumulative probability reaches p, then samples within it',
            'Exactly p percent of the vocabulary',
            'The tokens above probability p individually',
          ],
          1,
          'Mass-based and adaptive — small nucleus when confident, wide when uncertain.',
        ],
        [
          'With a peaked distribution, top-k=3 and top-p=0.9 may produce identical candidate sets because:',
          [
            'The parameters are aliases',
            'The top three tokens already cover ≥ 0.9 probability mass, so both cuts land on the same set',
            'Top-p ignores probability',
            'Top-k always follows top-p',
          ],
      1,
          'When mass concentrates in the top few tokens, a count cut and a mass cut converge; they diverge only on flatter distributions.',
        ],
        [
          'The most defensible configuration for deterministic JSON extraction is:',
          [
            'Temperature 1.2 with top-p 1.0',
            'Temperature 0–0.2 with default top-p and schema validation in code',
            'Temperature 0.7 with top-k 1',
            'Any temperature, since JSON mode removes randomness',
          ],
          1,
          'Low temperature minimises deviation; schema validation is the real guarantee — sampling settings only reduce risk.',
        ],
      ]
    ),
    lesson(
      M2,
      'gae-2-4',
      4,
      'Steering and Serving: System Prompts, Stop Sequences, Streaming and the KV Cache',
      'The control surfaces and the physics: where instructions live, how generation is cut off, why text streams token by token, and why every token you keep makes the next one more expensive.',
      19,
      nineBlocks({
        objectives: [
          'Place durable instructions, user input and examples into message roles with a clear precedence rationale',
          'Design a stop sequence for a delimited output and predict its two classic failure modes',
          'Explain streaming as a consequence of autoregressive compute, distinguishing time-to-first-token from total generation time',
          'Size a KV cache for a given model shape and context length, and state why per-token cost grows with context',
        ],
        hook:
          'Your chat UI writes like a person typing — because it *is* being computed like a person typing, one token at a time. Behind the curtain: a cache of key/value vectors ballooning with every token, a system prompt you cannot see steering every reply, and the option to slam generation shut with a magic string. All four — roles, stops, streaming, cache — are the same story: how a sequential probability machine is steered and paid for. This lesson is about the plumbing between the model and your product.',
        concept: `**Message roles: where instructions live.** Chat APIs structure input as a list of role-tagged messages: a **system** message (persistent instructions, persona, rules), **user** messages (inputs), **assistant** messages (model turns that get fed back). The system prompt is not a privileged kernel — it is earlier, structured text in the same context, so it usually dominates (training taught the model to treat it as authoritative) but can be degraded by long, conflicting, or manipulative user turns: prompt injection exploits exactly this. Practical rules: durable rules in the system prompt; volatile data in user messages; few-shot examples as explicit turns; re-state critical constraints near the end when context is long (primacy and recency both help); and never treat the system prompt as secret — it is extractable.

**Stop sequences: shutting generation off.** A stop string ends generation the moment the output matches it exactly — no tokens after. Perfect for delimited formats: generate rows until the literal END, or stop before a closing marker your code will add itself. Two classic failures: (1) the model emits *part* of the stop text and pauses mid-match semantics are fine (matching is on complete string), but a stop string that legitimately appears inside content (a row containing "END") truncates your data silently; (2) the model *never* emits the stop because it keeps elaborating — so always pair stops with a max-token cap and downstream validation. For hard contracts, schema-constrained decoding (Lesson 4.4 / Part II) beats string surgery.

**Streaming: compute made visible.** Generation is sequential — token n+1 cannot exist before token n is sampled. Streaming (Server-Sent Events over HTTP) delivers each piece as it is produced instead of waiting for the full string. What it changes: **time-to-first-token (TTFT)** becomes the perceived latency, even though total time is unchanged or slightly worse (per-chunk overhead). TTFT itself is dominated by **prefill** — processing your entire prompt through the network before the first output token. Long prompt ⇒ slow first token ⇒ streaming is the UX patch that makes it feel fast.

**The KV cache: why context costs memory.** Attention needs the keys and values of *every* previous token at every layer. Without a cache, each new token would recompute them all — quadratic waste. The KV cache stores them once per layer per token; each decode step just reads the cache and appends one entry. That is why generation is fast at all — and why long contexts are expensive: cache memory grows as layers × 2 (K and V) × KV-heads × head-dim × bytes × sequence length, i.e. **linear in context length for every concurrent sequence**. Compute per new token also grows with context (attention reads all prior entries), and prompt prefill is quadratic in length. Grouped-query attention (fewer KV heads sharing queries) exists precisely to shrink this cache. Operational consequences: long chats get slower and memory-hungry per session; servers cap concurrent long contexts; prefix caching (reusing the cache for a shared system prompt) cuts repeat cost — all direct fallout of one caching decision.`,
        extras: [
          table(
            'Four levers, four mechanisms',
            ['Lever', 'Mechanism', 'Primary failure'],
            [
              ['System prompt', 'Earlier structured context, trained to be authoritative', 'Injection / dilution by later turns'],
              ['Stop sequence', 'Exact-string match halts decoding', 'Content contains the stop → silent truncation'],
              ['Streaming', 'SSE delivery of tokens as computed', 'Confusing fast TTFT with fast total time'],
              ['KV cache', 'Stored K/V per token per layer', 'Linear memory growth; slower per-token decode at long context'],
            ],
          ),
          code(
            `// Streaming with a stop sequence (OpenAI-compatible shape)
const stream = await client.chat.completions.create({
  model: 'acme-small-7b',
  messages: [
    { role: 'system', content: 'Emit CSV rows only. Terminate with END.' },
    { role: 'user', content: csvTask },
  ],
  temperature: 0,
  stop: ['END'],        // hard cut the moment this string is produced
  max_tokens: 512,      // always pair stops with a cap
  stream: true,
});
for await (const chunk of stream) {
  const piece = chunk.choices[0]?.delta?.content ?? '';
  process.stdout.write(piece);  // arrives as each token is computed
}`,
            'stream-stop.ts',
            'typescript'
          ),
          warn(
            'Stop strings are content-sensitive, not structural',
            'They match raw output text — including places where the string is legitimate data. For anything a machine consumes, validate the parsed result and retry; use stop sequences as a fast-path optimisation, not your only guarantee.',
          ),
        ],
        worked: {
          title: 'Design a stop-delimited exporter, then size its KV cache',
          problem:
            'A service streams inventory rows from a 7B-class model (32 layers, 8 KV heads via grouped-query attention, head dimension 128, bfloat16 weights) until the string END, capping at 8,192 tokens of context. (1) Specify the prompt contract and stop configuration, predicting two failure modes. (2) Compute KV cache memory for one 8k session. (3) Compute it for 32 concurrent sessions and state the serving implication.',
          steps: [
            {
              title: 'Step 1 — the contract',
              desc: 'System: "One row per line: sku,qty,price. No header. Terminate with END." Stop: ["END"], max_tokens: 512, temperature 0. Validation downstream: each line parses as three fields; row count matches expected.',
              code_snippet: "system: 'One row per line: sku,qty,price. End with END.'\nstop = ['END']   max_tokens = 512   temperature = 0",
            },
            {
              title: 'Step 2 — predict the failures',
              desc: 'Failure A: a sku or product name contains "END" (e.g. BLENDER-END) → generation dies mid-data, silently. Fix: forbid the literal in the schema, or stop on a rarer token like <<STOP>>, plus row-count validation. Failure B: the model embellishes past the data ("As you can see…") and never says END → max_tokens cuts it off. Fix: cap + validator + retry with a stricter reminder.',
            },
            {
              title: 'Step 3 — size one session\'s cache',
              desc: 'Bytes per token = layers × 2 (K,V) × kv_heads × head_dim × 2 bytes = 32 × 2 × 8 × 128 × 2 = 131,072 B = 128 KB per token. For 8,192 tokens: 128 KB × 8,192 = 1,073,741,824 B ≈ 1.0 GB — for one sequence, weights excluded.',
              code_snippet: '32 * 2 * 8 * 128 * 2 B = 128 KB/token\n128 KB * 8192 = 1.0 GB per 8k session',
            },
            {
              title: 'Step 4 — concurrency and the serving implication',
              desc: '32 concurrent 8k sessions ≈ 32 GB of KV cache alone (an 8B model\'s weights are ~16 GB in bf16 — cache dominates!). Implications: long-context sessions cap concurrency; GQA (8 KV heads instead of 32) already cut this 4×; prefix caching amortises the shared system prompt; and per-token attention cost still grows with context, so long sessions slow down as they fill.',
            },
          ],
          solution:
            'Contract: delimited rows + stop + cap + parse validation, with END-inside-data and never-ending elaboration as the named failure modes. Cache math: 128 KB/token → 1.0 GB per 8k session → ~32 GB for 32 sessions — the arithmetic behind every concurrency limit you have ever hit.',
        },
        practice: {
          title: 'Measure the two latencies',
          prompt:
            'Using any tool that exposes streaming: send one short prompt and one long prompt (paste a long document). Record time-to-first-token and total time for each, with and without streaming if you can toggle it. Write three sentences on why the long prompt\'s first token took longer even though the answer was short — naming prefill and the KV cache. If no API access, compute: at 50 tokens/sec decode, how long does a 600-token answer take, and how does TTFT of 3 s vs 0.5 s change the felt experience?',
          hint: 'Answer length sets total time; prompt length sets prefill — and streaming only changes which of the two you feel first.',
        },
        mistakes: [
          {
            mistake: 'Treating the system prompt as a secure, invisible channel',
            fix: 'It is text in the same context: authoritative by training, but dilutable and extractable. Never store secrets in it; assume a determined user can elicit its contents.',
          },
          {
            mistake: 'Using a stop sequence as the only output guarantee',
            fix: 'Stops match raw strings and fail both ways (spurious match, or never emitted). Always add a token cap, downstream parsing and validation — preferably schema-constrained output for machine consumers.',
          },
          {
            mistake: 'Equating streaming with faster generation',
            fix: 'Streaming changes delivery, not compute: TTFT improves perceptually; total time is roughly unchanged (sometimes worse). Speed comes from shorter prompts, smaller models, batching — not from SSE.',
          },
          {
            mistake: 'Assuming long context is free once the prompt is sent',
            fix: 'Every generated token attends over all previous ones and lives in the KV cache: per-token compute and memory both grow with sequence length, and every session pays its own cache. Long context is a budget, not a licence.',
          },
        ],
        exam: {
          question:
            'Why does the KV cache make long conversations memory-expensive, and why would removing it make generation hopelessly slow?',
          answer:
            'Attention at every layer needs the key and value vectors of all preceding tokens. The KV cache stores them once per token per layer (layers × 2 × KV-heads × head-dim × precision), so memory grows linearly with sequence length — for every concurrent sequence; an 8k-context session on an 8B-class model can consume on the order of a gigabyte by itself. Without the cache, each new token would have to recompute the K/V of the entire prefix through every layer — turning decoding into an O(n²)-per-token workload and making generation effectively unusable. So the cache is not optional: it trades linear memory for tractable compute. The engineering consequences are the ones you see in production — concurrency caps tied to total cache size, grouped-query attention to shrink cache entries, prefix caching for shared prompts, and the fact that per-token latency and memory still creep upward as a conversation fills its window.',
          source: 'Serving/infra interview staple (also core material for LLMOps-style roles).',
        },
        summary: [
          'System prompts are authoritative-but-not-privileged context: durable rules go there, and injection/dilution remain risks.',
          'Stop sequences cut decoding on exact string match — always paired with a max-token cap and downstream validation.',
          'Streaming exposes autoregressive reality: TTFT is dominated by prompt prefill, total time by decode length.',
          'The KV cache stores keys/values per token per layer: linear memory in context, for every session — the price of fast decoding.',
          'Per-token compute also grows with context; GQA, prefix caching and concurrency caps are all responses to that arithmetic.',
        ],
      }),
      [
        [
          'The system prompt in a chat API is best described as:',
          [
            'A secure kernel channel users cannot influence',
            'Persistent, structured instructions earlier in the same context — authoritative by training but still dilutable by later turns',
            'A separate classifier run before the LLM',
            'The model\'s permanent memory',
          ],
          1,
          'Same context, privileged position — which is why injection and long-history drift still matter.',
        ],
        [
          'A stop sequence causes generation to:',
          [
            'Pause for user confirmation',
            'End the moment the output contains the exact stop string',
            'Skip that string but continue',
            'Lower the temperature',
          ],
          1,
          'Hard termination on exact match — hence the twin risks of spurious matches inside content and never being emitted at all.',
        ],
        [
          'Streaming reduces perceived latency mainly by improving:',
          [
            'Total generation time',
            'Time-to-first-token visibility — tokens render as they are computed',
            'Model accuracy',
            'Prompt prefill speed',
          ],
          1,
          'Delivery, not compute: the first tokens appear immediately; total time stays about the same.',
        ],
        [
          'KV cache memory grows primarily with:',
          [
            'Vocabulary size',
            'Sequence length — every token stores key/value vectors for every layer (times heads and precision)',
            'Batch size only',
            'Temperature',
          ],
          1,
          'Linear in context per sequence; multiplied across concurrent sessions — the direct driver of serving memory limits.',
        ],
      ]
    ),
  ],
};
