// Module 6 — Embeddings & Representation Learning
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, code } from '../nineBlocks';
import { lesson, M6, COURSE_ID } from './helpers';

export const module6: CourseModule = {
  id: M6,
  course_id: COURSE_ID,
  title: 'Module 6 — Embeddings & Representation Learning',
  summary:
    'Three generations of embeddings — static word vectors, sentence pooling, and contextual token vectors — with the geometry that makes similarity measurable, intrinsic evaluation done honestly (similarity, analogies, OOV), contrastive learning and the InfoNCE loss derived with its temperature and negative-sampling arithmetic, representation probing with control tasks, and the dimensionality-versus-cost tradeoff that decides what you can actually deploy.',
  sort_order: 6,
  lessons: [
    lesson(
      M6,
      'dl-6-1',
      1,
      'Three Generations of Embeddings: Word, Sentence, and Context',
      'Why one vector per word type fails on real language, how pooling turns token vectors into sentence vectors, and what contextual encoders actually return — plus the geometry (cosine, normalization, anisotropy) that every downstream retrieval system is built on.',
      22,
      nineBlocks({
        objectives: [
          'Explain the type-token problem of static embeddings with a concrete two-sentence example and predict what cosine similarity returns for it',
          'Compute cosine similarity by hand and state when cosine (not Euclidean, not raw dot) is the right comparison',
          'Describe three pooling strategies for turning token vectors into one sentence vector, including why raw BERT [CLS] disappoints',
          'Trace where a contextual vector comes from in a transformer forward pass and relate it to Module 5 blocks',
        ],
        hook:
          'Two sentences: "He left money at the river bank" and "She asked the bank for a loan". Word2vec gives the word "bank" ONE vector, identical in both — a point that averages two unrelated meanings and is close to neither properly. A contextual encoder gives "bank" a different vector in each sentence, because the vector is a function of the whole input. That single difference — is the embedding a property of the WORD TYPE or of the TOKEN IN CONTEXT — is the fault line between 2013-era NLP and everything after 2018. This lesson builds both worlds from the geometry up.',
        concept: `**The premise: meaning as geometry.** One-hot vectors are useless for similarity: "cat" and "dog" are orthogonal, so any learner must relearn every pair from scratch. A distributed embedding fixes this by mapping each item to a dense vector in R^d (d typically 100-4096) such that geometric proximity tracks relatedness. Note what an embedding layer actually is — from Module 1 you have seen it: nn.Embedding(V, d) is exactly a linear layer multiplied by a one-hot input, i.e., a ROW LOOKUP. The "embedding matrix" is a V x d table, and training it means moving rows. Every generation below differs only in WHAT gets a row and WHAT objective moves it.

**Generation 1 — static word embeddings (2013-2017).** word2vec trains a shallow model to predict a word from its context (CBOW) or a context word from a word (skip-gram); GloVe factorizes log co-occurrence counts. Both produce ONE vector per vocabulary TYPE. They capture real structure: similarity (car/automobile cluster), and even linear offsets for some relations (king - man + woman lands near queen — the Module 6.2 arithmetic). The fatal limit is the type-token conflation: the table has a row for the string "bank", not for its senses, so river-bank and money-bank share one point — a forced average of two distributions. Morphology is similarly lost: "cats"/"cat"/"feline" occupy unrelated rows. (GloVe's vector NORMS carry frequency information — long vectors for frequent words — which is one reason raw dot product, which rewards length, misbehaves where cosine does not.)

**Generation 2 — sentence embeddings.** For retrieval and clustering you need ONE vector per sentence/document. Options: (1) MEAN-POOL the token vectors — average over positions, robust and the modern default for embedders; (2) MAX-POOL — take elementwise max, keeps the strongest signal per dimension; (3) [CLS] — the first position's vector from BERT. Trap: raw BERT [CLS] is a POOR sentence embedding without sentence-level fine-tuning, because BERT's pretraining objective (masked prediction, Module 5.3) never forces the CLS position to summarize the sentence — this is the well-documented "BERT self-suits at sentence similarity" failure. Production sentence embedders (Sentence-BERT, E5, GTE, BGE) are transformers fine-tuned with a CONTRASTIVE objective on sentence pairs (lesson 6.3), usually mean-pooled, usually L2-normalized before cosine.

**Generation 3 — contextual token vectors.** BERT/GPT return a vector PER TOKEN, computed as embedding + positions through L layers of self-attention: the output at position i is a function of the whole visible context (bidirectional for BERT, prefix for GPT). So "bank" in sentence A and sentence B runs through different attention mixtures and lands in different places — the type-token problem disappears at the cost of a forward pass: you cannot look up a contextual vector, you must COMPUTE it (that is why static embeddings still power cheap dedup and lexical search, while contextual models power semantic retrieval).

**The geometry you will use everywhere.** SIMILARITY(u, v) = cosine = (u . v) / (||u|| ||v||) — the cosine of the angle between vectors, in [-1, 1], ignoring magnitude. Cosine is right when direction encodes meaning (normalized embedders, sparse count vectors); raw dot embeds both similarity and length (frequent words in GloVe get longer vectors); Euclidean distance conflates direction and radius — on normalized vectors Euclidean and cosine are equivalent rankings (||u - v||^2 = 2 - 2cos), so pick one and be consistent. One more real phenomenon: CONTEXTUAL EMBEDDINGS are ANISOTROPIC — vectors cluster in a narrow cone (the dominant principal component is often the "mean sentence direction"), so raw cosine between unrelated sentences sits at 0.5-0.7 rather than near 0; embedders fix this by training-time normalization or mean-removal, and practitioners fix it by L2-normalizing before comparison. Never compare raw cosine numbers across two different models — the scales differ by construction.`,
        extras: [
          table(
            'Three generations of embeddings',
            ['Generation', 'What has a vector', 'How you get it', 'Strength', 'Limit'],
            [
              ['Static (word2vec, GloVe)', 'One per word TYPE', 'Table lookup', 'Instant, free at inference', 'Senses conflated; OOV words have no row'],
              ['Sentence (SBERT, E5, mean-pooled)', 'One per sentence/document', 'Forward pass + pooling + normalize', 'Built for retrieval/clustering', 'Needs a forward pass; quality depends on training pairs'],
              ['Contextual (BERT/GPT hidden states)', 'One per token IN CONTEXT', 'Full transformer forward pass', 'Sense-accurate, task-ready', 'Costly; anisotropic without care'],
            ],
          ),
          code(
            `import torch
import torch.nn.functional as F

# ---- Cosine by hand, and why cosine beats raw dot / Euclidean ----
u = torch.tensor([3.0, 4.0])
v = torch.tensor([4.0, 3.0])
cos = F.cosine_similarity(u, v, dim=0)          # (u.v) / (|u||v|) = 24 / 25 = 0.96
print("cos:", cos.item(), " dot:", (u @ v).item(), " L2:", (u - v).norm().item())
print("scaled v keeps cosine:", F.cosine_similarity(u, 100 * v, dim=0).item())  # direction only

# ---- Static embedding: ONE row per type -> identical in every sentence ----
V, d = 5, 8
table = torch.nn.Embedding(V, d)                # rows are the learned word vectors
bank_id = 1
static_a = table(torch.tensor(bank_id))         # "bank" in sentence A
static_b = table(torch.tensor(bank_id))         # "bank" in sentence B
assert torch.equal(static_a, static_b)          # the type-token problem, literally

# ---- Contextual: same token id, different context -> different vector ----
# encoder(sentence_a)[pos_of_bank] != encoder(sentence_b)[pos_of_bank]
# (requires a pretrained encoder, e.g. from HuggingFace:)
# from transformers import AutoModel, AutoTokenizer
# tok = AutoTokenizer.from_pretrained("bert-base-uncased")
# model = AutoModel.from_pretrained("bert-base-uncased")
# def vec(sentence):
#     ids = tok(sentence, return_tensors="pt")
#     h = model(**ids).last_hidden_state         # (1, T, 768)
#     i = tok.convert_tokens_to_ids("bank")
#     pos = (ids["input_ids"][0] == i).nonzero()[0]
#     return h[0, pos].detach()                  # contextual vector for THAT occurrence

# ---- Sentence pooling: mean-pool then L2-normalize (production idiom) ----
H = torch.randn(6, 16)                          # 6 token vectors, dim 16
sent = F.normalize(H.mean(dim=0), dim=0)         # mean-pool -> unit vector -> cosine-ready`,
            'embeddings.py',
            'python',
          ),
          tip(
            'Normalize once, at the boundary',
            'Store embeddings L2-normalized, and you can use a plain dot product as cosine everywhere downstream (vector indexes, ANN search, clustering). Un-normalized vectors make every comparison site reinvent the norm — and silently mix similarity with vector length.',
          ),
          warn(
            'Raw BERT [CLS] as a sentence embedding is a classic silent failure',
            'Cosines for unrelated sentences come back around 0.5-0.7, clustering looks random, and nothing crashes. Use a sentence-embedding model (SBERT/E5/BGE class) or mean-pool a model trained with a sentence-level objective — and evaluate on a small labeled similarity set before shipping.',
          ),
        ],
        worked: {
          title: 'Compute similarity the right way on toy vectors',
          problem:
            'u = [3, 4], v = [4, 3], w = [0.2, 0.267] (a low-norm vector pointing the same way as v). (a) Cosine(u, v) and the angle. (b) Show cosine(u, 100v) is unchanged and say what that buys you. (c) Dot(u, v) vs Dot(u, w) — which ranks v higher, dot or cosine, and why. (d) Euclidean ||u - v||: now use normalized vectors u/||u|| and v/||v|| — compute ||u_n - v_n||^2 and verify the identity ||u_n - v_n||^2 = 2 - 2cos(u, v). (e) Static vs contextual verdict for the word "bank" in two sentences.',
          steps: [
            {
              title: '(a) Cosine and angle',
              desc: 'u . v = 3*4 + 4*3 = 24. ||u|| = sqrt(9+16) = 5, ||v|| = 5. cos = 24/25 = 0.96 -> angle = arccos(0.96) ≈ 16.3 degrees. Nearly aligned: the two vectors point in almost the same direction.',
              code_snippet: 'cos(u, v) = 24 / 25 = 0.96  ->  ~16.3 degrees',
            },
            {
              title: '(b) Scaling invariance',
              desc: '100v = [400, 300]: ||100v|| = 500, u . 100v = 2400, cos = 2400/(5*500) = 0.96 — identical. Cosine compares DIRECTION only, so a document with twice the word counts, or a frequent word with a long GloVe vector, is not penalized/rewarded for length.',
              code_snippet: 'cos(u, 100v) = 2400 / 2500 = 0.96  (same)',
            },
            {
              title: '(c) Dot product vs cosine',
              desc: 'Dot(u, w) = 3*0.2 + 4*0.267 = 0.6 + 1.068 = 1.668 — tiny because w is short. Dot(u, v) = 24 — much larger. Cosine(u, w): ||w|| = sqrt(0.04 + 0.0713) = 0.334, cos = 1.668/(5*0.334) = 1.0 — w actually points ALMOST EXACTLY along u. So dot ranks v > w purely on magnitude; cosine ranks w > v by direction. On embedding data, direction is the signal — cosine (or dot on pre-normalized vectors) is correct.',
              code_snippet: 'dot: v=24 > w=1.67   |   cos: w=1.00 > v=0.96',
            },
            {
              title: '(d) The normalized-Euclidean identity',
              desc: 'u_n = [0.6, 0.8], v_n = [0.8, 0.6]. Difference = [-0.2, 0.2]; squared norm = 0.04 + 0.04 = 0.08. Right side: 2 - 2*0.96 = 0.08. Match — for unit vectors, Euclidean ranking is EXACTLY cosine ranking (closer in distance = higher cosine), so on normalized embedders the two metrics are interchangeable.',
              code_snippet: '||u_n - v_n||^2 = 0.08 = 2 - 2(0.96)  ✓',
            },
            {
              title: '(e) Static vs contextual verdict',
              desc: 'Static: both sentences hit the same table row, so cosine(bank_A, bank_B) = 1.0 BY CONSTRUCTION — the model is blind to the two senses, and the vector sits between river-bank and money-bank usages. Contextual: each occurrence is mixed with its neighbors by attention (Module 5), so the two vectors diverge — cosine lands well below 1, and each sits near its own sense neighbourhood. One is a lookup, the other is a computation — that is the whole generational shift.',
              code_snippet: 'static: cos = 1.0 (forced)   |   contextual: cos < 1 (computed)',
            },
          ],
          solution:
            '(a) cos = 0.96, angle ≈ 16.3°. (b) Scaling v by 100 leaves cosine at 0.96 — direction-only comparison immune to length/frequency. (c) Dot favors the long vector (24 vs 1.668) while cosine correctly favors the aligned short one (1.00 vs 0.96): raw dot confounds similarity with magnitude. (d) 0.08 = 0.08 — normalized Euclidean and cosine induce the same ranking. (e) Static embeddings return cosine 1.0 for the two "bank" vectors (identical row); contextual encoders return less than 1 because each vector is a function of its sentence. Geometry first, generation second.',
        },
        practice: {
          title: 'Build the similarity probe',
          prompt:
            'With any sentence-embedding model (sentence-transformers, or HuggingFace mean-pooling): (a) embed pairs — ("bank of the river", "riverbank") vs ("bank of the river", "bank loan interest") — and print cosines; (b) repeat with a static model if you can get one (GloVe) and show the "bank" cosine is 1.0 or undefined-by-identity; (c) compare raw BERT [CLS] cosine against mean-pooled cosine on the STS-style pairs and report which correlates better with your own judgment; (d) verify every stored vector is unit-norm before your comparison.',
          hint: 'Expect: contextual separates the two bank senses (large cosine gap), static cannot; raw CLS cosines crowd into a narrow band (anisotropy) while mean-pooled fine-tuned embeddings spread. Report numbers, not impressions.',
        },
        mistakes: [
          {
            mistake: 'Comparing cosine values across two different embedding models',
            fix: 'Each model has its own scale and anisotropy — 0.85 means something model-specific. Thresholds, clusters and alerts must be calibrated per model (and re-calibrated after any model upgrade).',
          },
          {
            mistake: 'Using raw dot product on un-normalized vectors as "similarity"',
            fix: 'Dot mixes direction and length: frequent words (long GloVe vectors), long documents, and high-norm outliers win regardless of meaning. Either L2-normalize and dot, or use cosine explicitly.',
          },
          {
            mistake: 'Assuming a contextual model gives a fast lookup for word meaning',
            fix: 'Contextual vectors must be COMPUTED with a forward pass over the context — they cannot be pre-stored per word. Use static/subword tables where you need lookup speed (dedup, lexical features), contextual encoders where sense matters.',
          },
          {
            mistake: 'Mean-pooling WITHOUT deciding what to include',
            fix: 'Decide deliberately: pool over real tokens only (exclude padding — masked mean-pool), keep special tokens in or out consistently, and normalize after pooling. Inconsistent pooling between indexing and querying is a top cause of "retrieval worked in the notebook" bugs.',
          },
        ],
        exam: {
          question:
            'Differentiate static word embeddings from contextual embeddings: how each is obtained, what problem each solves, and why cosine similarity is the standard comparison. Then explain how a single sentence vector is produced from a transformer and why raw [CLS] underperforms.',
          answer:
            'Static embeddings (word2vec/GloVe) assign ONE vector per vocabulary TYPE, stored in a lookup table and trained so that geometric proximity reflects co-occurrence/semantic relatedness. They are free at inference but conflate senses: "bank" in two sentences returns the identical vector (type-token problem), and unseen words have no row (OOV, Module 6.2). Contextual embeddings (BERT/GPT hidden states) compute a vector per token as a function of the full visible context: token+position embeddings pass through L self-attention blocks (Module 5), and attention mixes neighbours — so the same word in two sentences yields two different vectors, computed by a forward pass rather than a lookup. Cosine similarity, cos(u,v) = u·v/(||u|| ||v||), is standard because it measures the angle between vectors and is invariant to magnitude — direction encodes meaning, magnitude often encodes frequency/document length; on L2-normalized vectors cosine and Euclidean give identical rankings (||u_n − v_n||² = 2 − 2cos). Sentence vectors: pool the per-token vectors (mean-pooling is the production default; max-pooling alternative), then L2-normalize. Raw BERT [CLS] is a poor sentence embedding because masked-LM pretraining never requires CLS to summarize the sentence — sentence-level objectives (contrastive fine-tuning, Module 6.3) are what make pooling informative.',
          source: 'Standard NLP/embeddings exam question; also the most common screening question for retrieval-pipeline interviews.',
        },
        summary: [
          'Static embeddings: one vector per word type — fast, but senses conflated and OOV words absent.',
          'Contextual embeddings: one vector per token, COMPUTED by attention over its context — sense-accurate at the cost of a forward pass.',
          'Sentence vector = pooled token vectors (mean-pool default), L2-normalized; raw BERT [CLS] needs sentence-level training to be useful.',
          'Cosine compares direction and ignores magnitude; on unit vectors it and Euclidean agree exactly.',
          'Contextual spaces are anisotropic — normalize (or mean-center) before trusting raw cosine numbers.',
        ],
      }),
      [
        [
          'For a static embedding table, the vectors of the word "bank" in "river bank" and "bank loan" are:',
          [
            'Always different — embeddings are computed per sentence',
            'Identical — static tables store one row per word type, so senses are conflated',
            'Orthogonal by construction',
            'Undefined until the model is fine-tuned',
          ],
          1,
          'A static table has a single row per type: both occurrences hit the same row, so cosine is exactly 1.0. Sense disambiguation is precisely what contextual embeddings add.',
        ],
        [
          'Two embedding vectors are each multiplied by 10. Their cosine similarity:',
          [
            'Multiplies by 100',
            'Stays exactly the same — cosine is invariant to positive rescaling (direction only)',
            'Becomes the dot product',
            'Drops to zero',
          ],
          1,
          'Scaling changes magnitude, not direction: (10u)·(10v)/(10||u||·10||v||) = u·v/(||u|| ||v||). This is why cosine — not raw dot — is the default for un-normalized embeddings.',
        ],
        [
          'Mean-pooling a transformer to get a sentence vector means:',
          [
            'Averaging the per-token hidden-state vectors across positions, then typically L2-normalizing',
            'Taking the first token output (the [CLS] vector)',
            'Maximizing each attention head',
            'Averaging the attention weights over layers',
          ],
          0,
          'Mean over the T token vectors of the last hidden state gives one d-dim vector per sentence; normalization makes it dot-product-ready for cosine search.',
        ],
        [
          'A retrieval pipeline reports suspiciously high similarity (0.6-0.8) between unrelated sentences. Most likely explanation:',
          [
            'The index contains duplicates',
            'Anisotropy: contextual embeddings cluster in a narrow cone, inflating baseline cosine — normalize or use a sentence-trained model',
            'The dimension is too small',
            'Cosine cannot exceed 0.5 for distinct sentences',
          ],
          1,
          'Un-normalized contextual spaces share a dominant mean direction, so even unrelated vectors align partly. L2 normalization plus sentence-level contrastive training (Module 6.3) is the standard fix.',
        ],
      ]
    ),
    lesson(
      M6,
      'dl-6-2',
      2,
      'Measuring Embedding Quality: Similarity, Analogies, and Out-of-Vocabulary Tokens',
      'Intrinsic evaluation done honestly — similarity benchmarks with rank correlation, analogy arithmetic with its known biases, why intrinsic scores fail to predict downstream wins, and how subword/byte models eliminate (or merely disguise) the out-of-vocabulary problem.',
      22,
      nineBlocks({
        objectives: [
          'Compute the 3CosAdd analogy ranking by hand and state two known biases of analogy benchmarks',
          'Explain why intrinsic similarity scores correlate only weakly with downstream task performance',
          'Diagnose an OOV failure for a static model and choose between UNK fallback, subword composition, and byte-level encoding',
          'Choose an evaluation protocol (similarity, analogy, probe, downstream) for a stated goal and defend it',
        ],
        hook:
          'In 2013 a single line of arithmetic became famous: king - man + woman ≈ queen. Vector offsets doing algebra on meaning is genuinely striking — and it is also the most over-quoted demo in the field. Real evaluation is less photogenic: rank correlations on human-judged word pairs, accuracy on thousands of analogy questions with messy filtering rules, and the uncomfortable finding that doing well on both predicts downstream performance only weakly. This lesson teaches you to measure embedding quality without fooling yourself — including what happens when the word simply is not in the vocabulary.',
        concept: `**Family 1 — word similarity.** Pairs of words are rated by humans for relatedness (WS-353, SIMLEX-999, RW for rare words). Method: compute cosine for each pair, then compute SPEARMAN rank correlation rho between the model's similarities and the human ratings (rank correlation, not Pearson, because human scales are not interval-consistent — a 9 vs 10 gap is not the same as 3 vs 4). A good static model reaches rho around 0.7-0.8 on WS-353-class sets; note what this measures — RELATEDNESS, which conflates similarity (car-automobile) with association (car-driver); SIMLEX deliberately separates the two, and models that excel at association often score worse on strict similarity. For contextual models, evaluation moves up a level to sentence similarity (STS, Spearman against 1-5 human judgments).

**Family 2 — analogy tasks.** Query form: "a is to b as c is to ?" — solve by 3CosAdd: candidate* = argmax over vocab words of cos(w, b - a + c) where w = b - a + c. (A sibling metric, 3CosMul, divides candidate similarity by cos(a,c)*cos(b,c)-style terms to suppress distractors that merely relate to the input pair.) Categories: semantic (capital-country, family-gender) and syntactic (country-countries, positive-positive). Era numbers: well-trained word2vec/GloVe at 300 dims land in the mid-70% range on the standard Google analogy set — but with three asterisks. (1) FILTERING: reported scores usually exclude rare words and "fuzzy" questions; change the vocabulary cutoff and accuracy moves by tens of points, so numbers across papers are not comparable without their protocol. (2) THE OFFSET IS NOT A LAW: linear analogies hold for SOME relation types (capital-country is strong; many relations are not linear at all), and Levy & Goldberg showed analogy performance largely falls out of how the training objective factorizes pointwise mutual information — the algebra is a symptom, not a guarantee. (3) SHORTCUTS: pluralization and superlative questions can be solved by morphology alone, inflating "semantic" scores. Use analogies as ONE signal, never as the scorecard.

**Family 3 — probes and downstream.** The honest yardstick: does the embedding help a real task? Freeze it, train a small classifier (sentiment, NER, paraphrase), measure the task metric, and compare against baselines (one-hot TF-IDF, randomly initialized embeddings). Known result: INTRINSIC AND EXTRINSIC SCORES CORRELATE WEAKLY — an embedding with higher WS-353 rho can lose downstream. Reasons: a probe can relearn what the embedding lacks (with enough labels), tasks need different geometry (clustering vs retrieval vs feature reuse), and benchmarks share blind spots. Evaluation protocol choice: similarity benchmarks for debugging a new embedder; downstream probes for deciding whether to ship it; both with a fixed, decontaminated test split.

**The OOV problem, precisely.** A static vocabulary of V rows has NO row for an unseen string. Occurrence rate matters: Zipf's law means a 50k-word vocab covers roughly 98-99% of tokens — the residual 1-2% becomes <unk>, and those are disproportionately rare, newsworthy, and meaning-bearing (person names, new jargon, misspellings). Options, in increasing sophistication: (1) map to a single UNK row — all rare words become identical vectors, destroying distinctions (fatal for retrieval over names/products); (2) SUBWORD COMPOSITION (fastText): represent a word as the sum of its character n-gram vectors plus the word itself — morphology shared across cats/cat/s-cat, unseen words still compose from seen pieces; (3) the modern answer: the MODEL never has word-level OOV because BPE/byte tokenizers decompose any string (Module 7.2) — but note what OOV becomes instead: TOKENIZATION FERTILITY. A rare word encoded as 8 byte-tokens costs 8 forward steps, eats 8 context positions, and dilutes embedding quality per word — OOV did not vanish, it turned into a latency/context/fairness cost, which hits morphologically rich and Indic languages hardest (lesson 7.2).`,
        extras: [
          table(
            'Evaluation families and what they actually measure',
            ['Family', 'Metric', 'What it measures', 'Main pitfall'],
            [
              ['Word/sentence similarity', 'Spearman rho vs human ratings', 'Relatedness geometry', 'Conflates similarity with association unless SIMLEX-style'],
              ['Analogy', '3CosAdd/3CosMul accuracy', 'Linear relation structure', 'Filtering and morphology shortcuts; offset works for some relations only'],
              ['Probe / downstream', 'Task metric on frozen features', 'Linear accessibility for a use case', 'Strong probe can relearn missing info; label size varies'],
              ['Retrieval/clustering', 'Recall@k, NMI, nDCG', 'Operational quality', 'Needs your own queries — no standard benchmark substitutes'],
            ],
          ),
          code(
            `import torch
import torch.nn.functional as F

def analogy_3cosadd(a, b, c, vocab, E):
    """a:b :: c:?  ->  argmax cos(x, b - a + c) over vocab."""
    target = E[b] - E[a] + E[c]              # offset arithmetic in embedding space
    sims = E @ target / (E.norm(dim=1) * target.norm() + 1e-8)
    sims[[a, b, c]] = -1e9                   # never answer with the question words
    return sims.argmax().item()

# ---- OOV handling: subword composition (fastText-style sketch) ----
def word_vector(word, ngram_vecs, word_vec, n=3, ns=(3, 5, 6)):
    if word in word_vec:
        return word_vec[word] + sum(ngram_vecs[word[i:i + k]]
                                    for k in ns for i in range(len(word) - k + 1)) / 3
    # unseen word: compose from character n-grams it shares with seen words
    return sum(ngram_vecs[word[i:i + k]]
               for k in ns for i in range(len(word) - k + 1)) / 3      # no <unk> needed

# ---- Spearman rho for a similarity set (pairs, human scores, model cosines) ----
def spearman(x, y):
    def rank(v):
        order = v.argsort().argsort().float()     # average ties ignored for simplicity
        return order
    rx, ry = rank(torch.tensor(x)), rank(torch.tensor(y))
    return F.cosine_similarity(rx - rx.mean(), ry - ry.mean(), dim=0).item()`,
            'embedding_eval.py',
            'python',
          ),
          tip(
            'Report the protocol with the number',
            '"Analogy accuracy 74%" is incomplete without: vocab cutoff, whether rare/fuzzy items were excluded, dimension, and the metric (3CosAdd vs 3CosMul). Half of embedding-paper disagreements are protocol disagreements.',
          ),
          warn(
            'An analogy demo is not an evaluation',
            'king-queen works beautifully and is heavily over-quoted: relation offsets are reliable for a handful of relations and unreliable for most. One cherry-picked success says nothing about average behaviour — only benchmark accuracy with a stated filtering rule does.',
          ),
        ],
        worked: {
          title: 'Run 3CosAdd by hand, then audit an OOV failure',
          problem:
            'Toy 2-D embeddings: man = [1, 0], woman = [0, 1], king = [1, 1]. Candidates: queen = [0, 1], princess = [0.3, 0.9], uncle = [1, 0.5]. (a) Compute the offset b - a + c for "man : king :: woman : ?" (b) Cosine of the target against all three candidates and rank them. (c) Now a frequency audit: a 50k vocab covers ~98% of tokens; on 1M tokens, how many become <unk>, and why are those the dangerous ones? (d) A static model and a BPE model both meet the rare word "cybersecurityonomics": what happens in each, in tokens and in vectors?',
          steps: [
            {
              title: '(a) Offset arithmetic',
              desc: 'target = king - man + woman = [1,1] - [1,0] + [0,1] = [0, 2]. Direction [0, 1] — the "king" point shifted by the same man->woman displacement. This is the entire 3CosAdd algorithm; everything else is ranking by cosine.',
              code_snippet: 'target = [1,1] - [1,0] + [0,1] = [0, 2]',
            },
            {
              title: '(b) Cosines against candidates',
              desc: '||target|| = 2. queen: dot = 0*0 + 1*2 = 2; ||queen|| = 1 -> cos = 2/2 = 1.000. princess: dot = 0.3*0 + 0.9*2 = 1.8; ||princess|| = sqrt(0.09+0.81) = 0.949 -> cos = 1.8/(2*0.949) = 0.949. uncle: dot = 1*0 + 0.5*2 = 1.0; ||uncle|| = sqrt(1.25) = 1.118 -> cos = 1.0/(2*1.118) = 0.447. Ranking: queen > princess > uncle — correct answer wins by a clear margin.',
              code_snippet: 'queen 1.000 > princess 0.949 > uncle 0.447',
            },
            {
              title: '(c) The OOV arithmetic',
              desc: '2% of 1,000,000 tokens = 20,000 tokens collapse into ONE shared <unk> vector. Those are exactly the Zipf-tail items: new names, product codes, domain jargon, typos — the tokens that carry the news value. Every one of them becomes identical to every other: a retrieval system over rare names degrades to chance on exactly the queries users care about.',
              code_snippet: '0.02 x 1,000,000 = 20,000 tokens -> one <unk> vector',
            },
            {
              title: '(d) Static vs BPE on the same rare word',
              desc: 'Static: the string has no row -> <unk> -> zero information (or a fastText fallback composing from char n-grams, which recovers morphology but no semantics). BPE/byte model: decomposes into known subword tokens (e.g., cyber + security + onomics + s) — every piece has a trained vector, so NO OOV by construction. The cost flips from missing-vector to token count: say 7 tokens, 7 forward positions, 7 slots of context, and a per-word embedding that must be reassembled from fragments — fertility, not absence, is the modern version of the problem.',
              code_snippet: 'static: 1 vector or <unk>   |   BPE: 7 subword vectors, 0 OOV',
            },
          ],
          solution:
            '(a) target = [0, 2]. (b) queen 1.000, princess 0.949, uncle 0.447 — 3CosAdd ranks correctly. (c) 20,000 tokens -> one <unk> vector, disproportionately rare/meaning-bearing items — the worst possible collapse. (d) Static models miss the row entirely (UNK or n-gram composition); byte/BPE models never go OOV but pay in tokens: fertility, context use, and fragmented meaning. Choosing between them is choosing which failure you can live with.',
        },
        practice: {
          title: 'Run an honest evaluation',
          prompt:
            'Using gensim or HuggingFace embeddings: (1) on 10-20 word pairs YOU rate yourself, compute model cosines and Spearman rho — report the number with your protocol (vocab cutoff, dimension, metric). (2) Attempt 10 analogies of each type (semantic and morphological) and record which fail — classify each failure as offset-not-linear, rare-word filtering, or morphology shortcut. (3) Find 5 words your static model marks OOV and show how fastText-style n-gram composition changes their nearest neighbours. (4) Write two sentences on why your intrinsic scores should (or should not) make you trust the model downstream.',
          hint: 'Expect morphology analogies to be suspiciously easy and rare-word analogies to fail. The (4) reflection is the point: intrinsic numbers are diagnostic, downstream probes are decisive.',
        },
        mistakes: [
          {
            mistake: 'Quoting analogy accuracy without the filtering protocol',
            fix: 'Accuracy depends on vocabulary cutoff, rare/fuzzy exclusion, dimension, and metric variant. Always report (or demand) the protocol before comparing numbers across models or papers.',
          },
          {
            mistake: 'Treating high WS-353 rho as proof of downstream quality',
            fix: 'Intrinsic and extrinsic scores correlate only weakly: probes relearn missing information, and tasks need different geometry. Ship decisions require a downstream or retrieval probe, with similarity suites as a debugging tool.',
          },
          {
            mistake: 'Assuming BPE models have no vocabulary problem at all',
            fix: 'They remove word-level OOV but introduce fertility costs: rare words become many tokens — more compute, more context consumed, worse per-word representation — unevenly distributed across languages. That is a shifted problem, not a solved one.',
          },
          {
            mistake: 'Accepting a single famous analogy as evidence the model "does algebra"',
            fix: 'Offsets hold for some relation types and fail broadly elsewhere; some benchmarks are partly solvable by morphology. Evidence means benchmark accuracy over thousands of items with stated filtering — not one curated success.',
          },
        ],
        exam: {
          question:
            'Describe the standard intrinsic evaluations for word embeddings (similarity and analogy tasks): the metrics used, how 3CosAdd works, and two limitations of analogy benchmarks. What role should intrinsic evaluation play in a model-selection decision?',
          answer:
            'Similarity evaluation: pairs of words/sentences with human relatedness ratings (WS-353, SIMLEX-999, STS); compute cosine per pair and Spearman rank correlation between model similarities and human ratings (rank correlation because human rating scales are not interval-consistent). Analogy evaluation: questions of the form a:b :: c:?, solved with 3CosAdd — form the offset vector b - a + c, then rank the vocabulary by cos(x, b - a + c), answer = argmax (excluding question words); a variant, 3CosMul, additionally downweights candidates that merely relate to the query pair. Limitations: (1) protocol sensitivity — reported accuracies exclude rare words and fuzzy questions with paper-specific filters, so numbers are not comparable without the filtering rule; (2) the linear-offset assumption holds only for certain relation types (strong for capital-country, unreliable generally) and part of the score can be won by morphology shortcuts, so analogies overstate geometric structure. Role in selection: intrinsic suites are DIAGNOSTIC — fast, cheap, good for catching a broken embedder — but weakly predictive of downstream performance; final selection must include a downstream probe or retrieval test on data resembling the deployment use case.',
          source: 'Recurring GATE-style/NLP exam question and a standard ML-interview screening item for representation learning.',
        },
        summary: [
          'Similarity eval = Spearman rho between cosine and human ratings; SIMLEX separates similarity from association.',
          '3CosAdd: argmax cos(x, b - a + c) — works for some relations, biased by filtering and morphology shortcuts.',
          'Intrinsic scores correlate weakly with downstream — use them to debug, probes to decide.',
          'Static models fail silently at OOV (<unk> collapse); fastText composes from char n-grams.',
          'Byte/BPE models have no word-level OOV — the cost reappears as tokenization fertility (lesson 7.2).',
        ],
      }),
      [
        [
          'The 3CosAdd solver for "a : b :: c : ?" ranks candidates by cosine similarity with:',
          [
            'The vector b + a - c',
            'The offset vector b - a + c',
            'The vector c alone',
            'The elementwise product a * b * c',
          ],
          1,
          'The relation observed from a -> b is applied to c: target = c + (b - a); candidates are ranked by cos(x, target), excluding the question words.',
        ],
        [
          'Two papers report analogy accuracy of 74% and 61% for similar models. The most likely reason the numbers are not comparable is:',
          [
            'Different random seeds alone',
            'Different filtering protocols — vocabulary cutoffs, rare/fuzzy question exclusion, metric variant (3CosAdd vs 3CosMul)',
            'One of them used cosine instead of dot product',
            'Analogy accuracy is random by definition',
          ],
          1,
          'Excluding rare-word and fuzzy items can shift accuracy by tens of points; without protocol, cross-paper analogy numbers are not on the same scale.',
        ],
        [
          'A static embedding model with a 50k vocabulary meets an unseen product name. Standard behaviour:',
          [
            'It composes a vector from character n-grams automatically',
            'It returns a shared <unk> vector — the word is out of vocabulary because no table row exists',
            'It errors at runtime',
            'It reuses the nearest row by edit distance',
          ],
          1,
          'A lookup table only serves rows it has; unseen strings map to <unk>. Subword composition (fastText) or byte/BPE tokenization (Module 7.2) are the fixes — not automatic with plain word2vec/GloVe.',
        ],
        [
          'Intrinsic similarity scores fail to predict downstream performance mainly because:',
          [
            'Spearman rho is mathematically invalid',
            'Human ratings are wrong',
            'Probes can relearn missing information and different tasks need different geometry — relatedness benchmarks measure only one slice of usefulness',
            'Cosine is not differentiable',
          ],
          2,
          'A trained probe compensates for what the embedding lacks (given labels), while tasks disagree on what geometry helps (clustering vs retrieval vs features) — so benchmark rho and task accuracy drift apart.',
        ],
      ]
    ),
    lesson(
      M6,
      'dl-6-3',
      3,
      'Contrastive Learning and InfoNCE: The Loss That Shapes the Space',
      'The training objective behind every modern embedder — pulled from first principles as an N-way classification over positives and in-batch negatives, with the gradient, temperature, and mutual-information bound computed by hand.',
      23,
      nineBlocks({
        objectives: [
          'State the InfoNCE objective mathematically and implement it in PyTorch as cross-entropy over a similarity matrix',
          'Derive the gradient with respect to the positive and a negative similarity and explain what temperature controls',
          'Explain why the number and quality of negatives matter, including the log-N mutual-information lower bound',
          'Diagnose false-negative and batch-size failures in a contrastive training run',
        ],
        hook:
          'Here is the objective that powers CLIP, Sentence-BERT, SimCLR and every vector database you will ever query: take an anchor, take one TRUE match, throw in a batch of impostors, and train the model to pick the true match out by similarity alone. No labels for "meaning" are needed — only the knowledge that two views belong together. Everything else is arithmetic: a softmax over the batch, one minus the log of the correct answer\'s probability. The lesson is to understand that arithmetic deeply enough to predict what happens when you change the temperature or the batch — because those two knobs decide whether your space is useful or mush.',
        concept: `**From similarity intuition to a trainable loss.** Want: vectors where positives (two views of the same image, a query and its gold passage, an image and its caption) sit CLOSE, and everything else sits FAR. Pairwise tricks (triplet loss: anchor-positive closer than anchor-negative by a margin) work but depend on mining good triplets. The modern replacement turns the whole batch into a discrimination game: given anchor x and its positive x+, the model must IDENTIFY x+ among N candidates — a categorical cross-entropy over similarities. That is InfoNCE (information noise-contrastive estimation), the loss behind NT-Xent/SimCLR, sentence-pair training, and CLIP's symmetric image-text objective.

**The objective, exactly.** For anchor x with positive x+ and batch negatives x_1..x_{N-1}, let s(x, y) = cos(x_hat, y_hat)/tau where x_hat, y_hat are L2-normalized vectors and tau (temperature) is a scalar hyperparameter. Then

p(x+ | x) = exp(cos(x, x+)/tau) / [ exp(cos(x, x+)/tau) + SUM_j exp(cos(x, x_j)/tau) ]
InfoNCE loss = -log p(x+ | x)

Implementation is two lines of Module 5 vocabulary: logits = normalized_batch @ normalized_batch.T / tau (an N x N similarity matrix), labels = arange(N) (the diagonal is the positive for each row), loss = cross_entropy(logits, labels). For CLIP, do the same over the image-text matrix in both directions (image->text and text->image) and average — the "which caption matches which image" game over the whole batch.

**The gradient, derived (this is the exam content).** Write L = -s+ + log[ exp(s+) + SUM_j exp(s_j) ] (the -log-softmax form). Then:

dL/ds+ = p+ - 1        (negative: gradient descent INCREASES the positive similarity)
dL/ds_j = p_j          (positive: descent DECREASES each negative similarity, proportional to its current probability)

So every parameter step pulls the positive closer with force (1 - p+)/tau and pushes each negative away with force p_j/tau. Two consequences you should be able to state cold: (1) HARD NEGATIVES (the ones currently scoring high, hence large p_j) receive the biggest push — the loss automatically focuses on the impostors that look most like the truth; (2) the 1/tau factor scales ALL gradients, and tau also sharpens the softmax: small tau concentrates p onto the argmax — harder task, steeper gradients, and (dangerously) heavier damage from any FALSE negative. Large tau flattens p toward 1/N — easier task, weaker signal, similarities all drift together. Practical range: 0.05-0.2 for normalized embeddings (0.07 and 0.1 are the canonical values you will see in code).

**Why "negatives" is a load-bearing word.** Three separate jobs: (1) DECOY SUPPLY — without enough candidates, the model can cheat by collapsing all vectors (everything similar, positives trivially found); a large, diverse negative set forces the space to UNFOLD around real distinctions. (2) THE INFORMATION BOUND — InfoNCE lower-bounds the mutual information between the two views: I(x; x+) >= log N - L; with loss at its floor, more negatives (larger log N) give a tighter bound, formalizing "negatives matter". (3) HARDNESS — in-batch negatives are random by default; semi-hard / cross-batch memory / mining strategies change what the model wrestles with. Costs: false negatives (two different dogs in the batch are pushed apart — class collision, the canonical failure), and batch size (need hundreds/thousands of negatives: hence large-GPU batches, distributed all-gather of embeddings, or momentum queues à la MoCo). One more design fact from SimCLR: apply the contrastive loss on a PROJECTION HEAD (small MLP) and evaluate the BACKBONE features — the head absorbs the loss's pressure, preserving better general-purpose features underneath.

**Where contrastive learning shows up in this course.** Vision: SimCLR/MoCo — positives = two augmented views of one image (so augmentation choice DEFINES "same meaning"); Language: sentence-pairs and retrieved-positives; Multimodal: CLIP's image-text matching (Module 8.4); Deduplication pipelines (Module 7.1) embed documents and compare by cosine — a downstream consumer of exactly the space this loss produces.`,
        extras: [
          table(
            'Contrastive variants at a glance',
            ['Method', 'Domain', 'Positive', 'Negatives', 'Note'],
            [
              ['SimCLR', 'Vision', 'Two crops/flips of one image', 'Rest of the batch (in-batch)', 'Needs large batches; projection head'],
              ['MoCo', 'Vision', 'Same as SimCLR', 'Momentum queue (decoupled)', 'Queue gives many negatives without huge batches'],
              ['NT-Xent / SBERT pairs', 'Text', 'Paraphrase / query-gold pair', 'Other pairs in batch', 'Temperature-tuned normalized cosine'],
              ['CLIP', 'Image-text', 'Image with its caption', 'All other pairs (both directions)', 'Symmetric cross-entropy over the N x N matrix'],
            ],
          ),
          code(
            `import torch
import torch.nn.functional as F

def info_nce(z1, z2, tau=0.1):
    """NT-Xent over a batch of pairs: (B, d) each. Positives are the diagonal."""
    z1, z2 = F.normalize(z1, dim=-1), F.normalize(z2, dim=-1)
    B = z1.size(0)
    z = torch.cat([z1, z2], dim=0)                 # 2B anchors
    logits = z @ z.T / tau                         # (2B, 2B) similarity matrix
    logits.fill_diagonal_(-1e9)                    # never count an anchor as its own negative
    # positive for row i is i+B (mod 2B): the other view of the same item
    labels = (torch.arange(2 * B) + B) % (2 * B)
    return F.cross_entropy(logits, labels)         # -log softmax at the positive

# sanity: perfectly aligned pairs -> loss near 0; random pairs -> loss near log(2B)
a = torch.randn(256, 128)
print(info_nce(a, a + 0.01 * torch.randn_like(a)))           # low: positive dominates
print(info_nce(a, torch.randn_like(a)))                      # ~log(512) if uninformative

# CLIP-style symmetric version: rows = images, cols = texts
def clip_loss(img, txt, tau=0.07):
    img, txt = F.normalize(img, dim=-1), F.normalize(txt, dim=-1)
    logits = img @ txt.T / tau
    labels = torch.arange(img.size(0), device=img.device)
    return 0.5 * (F.cross_entropy(logits, labels) + F.cross_entropy(logits.T, labels))`,
            'info_nce.py',
            'python',
          ),
          tip(
            'Read the loss curve through the temperature lens',
            'With tau = 0.1 and batch 256 the random-guess floor is about log(512) ≈ 6.2 for the 2B formulation. If your training loss sits at the floor for long, the model is not separating positives — check normalization, tau, and whether your "positives" actually are positive.',
          ),
          warn(
            'False negatives are the silent quality killer',
            'In-batch negatives assume other items are unrelated. If your batch mixes near-duplicate content (duplicate docs, same-class samples), the loss actively shoves true positives apart. Deduplicate the batch (Module 7.1), filter by class where labels exist, or use debiased contrastive variants — before tuning anything else.',
          ),
        ],
        worked: {
          title: 'Compute InfoNCE, its gradients, and the temperature effect',
          problem:
            'Anchor x with one positive and three negatives; cosine similarities: s+ = 2.0, negatives 1.0, 0.0, -1.0. Temperature tau = 0.5. (a) Softmax over scaled similarities: p+ and the loss -log p+. (b) Gradient dL/ds+ and dL/ds for each negative — which negative gets pushed hardest? (c) Recompute the loss at tau = 1.0 and state the direction of the effect. (d) If the batch had only the positive and ONE negative (s- = 1.0), what does the loss become and what went wrong with the game? (e) State the MI bound and what N = 512 buys.',
          steps: [
            {
              title: '(a) Scaled softmax',
              desc: 'Scaled: 2.0/0.5 = 4, 1.0/0.5 = 2, 0, -1/0.5 = -2. exp: e^4 = 54.598, e^2 = 7.389, e^0 = 1, e^-2 = 0.135. Sum = 63.122. p+ = 54.598/63.122 = 0.865. Loss = -ln(0.865) = 0.145.',
              code_snippet: 'p+ = 54.598 / 63.122 = 0.865  ->  L = 0.145',
            },
            {
              title: '(b) Gradients per similarity',
              desc: 'dL/ds+ = p+ - 1 = -0.135 (descent raises s+ by 0.135 * lr). Negatives: p_j / 1 for dL/ds_j — as gradient-descent pushes: hardest neg (s=1): p = 7.389/63.122 = 0.117; middle (s=0): 1/63.122 = 0.0158; easiest (s=-1): 0.135/63.122 = 0.0021. Divide by tau for the scaled form: 0.234, 0.032, 0.004 — the hardest negative gets ~58x the push of the easiest. Focus on the real impostors, automatically.',
              code_snippet: 'pushes: 0.234 (hard) >> 0.032 >> 0.004 (easy), all / tau = 0.5',
            },
            {
              title: '(c) Temperature at 1.0',
              desc: 'exp: 7.389, 2.718, 1.0, 0.368; sum = 11.475; p+ = 0.644; loss = -ln(0.644) = 0.44. Higher tau FLATTENED the softmax: p+ fell from 0.865 to 0.644, loss rose 3x, gradients spread toward easy negatives (and the 1/tau factor shrank overall step size). Small tau = sharp, hard, high-gradient discrimination; large tau = soft, diffuse, weak signal.',
              code_snippet: 'tau 0.5: L = 0.145   |   tau 1.0: L = 0.440',
            },
            {
              title: '(d) A degenerate two-candidate game',
              desc: 'p+ = e^4/(e^4 + e^2) = 54.598/61.987 = 0.881 -> L = 0.127, and the maximum achievable floor as s+ - s- grows is log 2 = 0.693 at the start. With N = 2 the task is nearly solvable by luck (one coin flip), the MI bound is only log 2 - L, and no uniformity pressure exists: many configurations win without the space unfolding. More negatives = harder classification = more structure forced into the vectors.',
              code_snippet: 'N = 2: bound <= log 2 = 0.69  vs  N = 512: log 512 = 6.24',
            },
            {
              title: '(e) The information bound',
              desc: 'InfoNCE obeys I(x; x+) >= log N - L. With N = 512 and a trained loss near, say, 0.5: bound = 6.24 - 0.5 = 5.74 nats of shared information between views. Raising N raises the ceiling (tighter bound) PROVIDED the model can keep loss low — which is why the field chases bigger batches and why queues/memory banks exist: they raise N without raising GPU memory.',
              code_snippet: 'I >= log N - L  =  6.24 - 0.5 = 5.74 nats (N = 512)',
            },
          ],
          solution:
            '(a) p+ = 0.865, loss = 0.145. (b) dL/ds+ = p+ - 1 = -0.135; negatives pushed with force p_j/tau: 0.234 vs 0.032 vs 0.004 — hardest-negative dominance by construction. (c) tau = 1.0 raises loss to 0.44: larger temperature softens and weakens the signal. (d) Two candidates make the task near-trivial, the MI ceiling only log 2, and no pressure to unfold the space. (e) I >= log N - L: more negatives tighten the bound — the formal reason batch size is a quality hyperparameter, not just a throughput choice.',
        },
        practice: {
          title: 'Train a small contrastive embedder',
          prompt:
            'SimCLR-lite on CIFAR-10: (1) two random crops+flips per image as positives, rest of batch as negatives; (2) implement NT-Xent exactly as in this lesson (normalize, similarity/tau, diagonal masked, cross-entropy); (3) train a small ResNet or CNN encoder; (4) evaluate by LINEAR PROBE on frozen features and compare with a supervised CNN at the same parameter count; (5) ablate tau in {0.05, 0.1, 0.5} and batch in {64, 512} — tabulate probe accuracy; (6) inject false negatives deliberately (treat same-class images as negatives) and report the damage.',
          hint: 'Batch size and tau interact: small tau with tiny batches tends to destabilize (the hardest false negative dominates). The probe — not training loss — is the score. Expect batch 512 >> 64 and tau 0.07-0.2 to win.',
        },
        mistakes: [
          {
            mistake: 'Feeding un-normalized vectors into the similarity matrix',
            fix: 'Without L2 normalization, the loss is gamed by inflating vector NORMS (logits grow, loss drops, geometry collapses). Normalize first; use cosine/tau, not raw dot, unless norms are deliberately meaningful.',
          },
          {
            mistake: 'Treating batch-mates as guaranteed negatives',
            fix: 'Near-duplicates and same-class samples become false negatives and are pushed apart — the loss fights your labels. Dedup, use class-aware masking, or debiased losses before blaming architecture or hyperparameters.',
          },
          {
            mistake: 'Assuming bigger batch only means faster training',
            fix: 'In contrastive learning, batch size IS the negative count — it changes the objective (harder task, tighter MI bound, better uniformity). Compare runs at equal epochs AND equal negative counts, and remember learning rate often must scale with batch.',
          },
          {
            mistake: 'Evaluating with the projection head\'s features',
            fix: 'The head exists to absorb contrastive pressure; backbone features generalize better. Probe the encoder output (pre-head) — SimCLR\'s own ablation shows head features probe worse for downstream tasks.',
          },
        ],
        exam: {
          question:
            'State the InfoNCE loss for an anchor, a positive, and N-1 negatives with normalized similarities and temperature tau. Derive the gradients with respect to the positive and one negative, and explain the roles of temperature and of N (number of negatives).',
          answer:
            'Let s(x, y) = cos(x, y)/tau on L2-normalized vectors. p+ = exp(s+) / [exp(s+) + SUM_j exp(s_j)], and L = -log p+ — equivalently a cross-entropy over the batch similarity matrix with the positive as the label. Writing L = -s+ + log sum exp(s_k): dL/ds+ = p+ - 1 (always negative, so gradient descent increases the positive similarity, with force proportional to how wrong the model currently is); dL/ds_j = p_j (each negative is pushed down proportionally to its softmax probability — the currently most-confusing negatives receive the largest updates, so hard negatives are mined automatically by the loss). Temperature: tau scales every logit, sharpening the softmax as tau falls; it also multiplies all gradients by 1/tau. Small tau = sharp, high-variance discrimination that focuses on hard negatives (and amplifies damage from false negatives); large tau = soft, diffuse supervision. N: InfoNCE lower-bounds mutual information between the views, I >= log N - L, so more negatives tighten the bound and force a more uniform, unfolded space; practically, larger batches/queues supply more and harder decoys, at the cost of false-negative risk and memory. Typical implementation: normalize, logits = X X^T / tau, mask self-similarity, cross-entropy with the paired index as label.',
          source: 'The central representation-learning question for advanced exams and embedding-team interviews; derivations are expected, not just definitions.',
        },
        summary: [
          'InfoNCE = N-way identification of the positive among batch negatives: cross-entropy over a cosine/tau similarity matrix.',
          'Gradients: positive pulled up with force (1 - p+)/tau; negatives pushed down with force p_j/tau — hard negatives dominate automatically.',
          'Temperature sharpens the softmax and scales all gradients (1/tau); 0.05-0.2 is the working range; low tau magnifies false negatives.',
          'More negatives = tighter MI bound (I >= log N - L) and more uniform space — batch size is a quality knob, not just throughput.',
          'Watch false negatives and projection-head evaluation; probe backbone features to score the run.',
        ],
      }),
      [
        [
          'InfoNCE with a batch of N pairs is typically implemented as:',
          [
            'MSE between positive vector pairs',
            'Cross-entropy over the N x N cosine/tau similarity matrix, with the positive index as the label',
            'A triplet margin loss over all triples',
            'Binary logistic loss per negative',
          ],
          1,
          'logits = normalized X X^T / tau; row i\'s positive is its partner; cross-entropy = exactly -log p(x+ | x).',
        ],
        [
          'The gradient of InfoNCE with respect to a negative\'s similarity s_j is p_j. The practical consequence is:',
          [
            'All negatives are pushed equally',
            'The hardest negatives (largest current softmax probability) get pushed hardest — mining emerges from the loss',
            'Negatives with s_j < 0 are ignored',
            'The positive is pushed away from negatives only when p+ is high',
          ],
          1,
          'dL/ds_j = p_j means the most confusable impostors receive the biggest updates — no separate hard-negative miner is required (though false negatives now hurt the most).',
        ],
        [
          'Halving the temperature tau during contrastive training makes the softmax:',
          [
            'Flatter and gradients weaker',
            'Sharper, with larger gradient scale (1/tau) — harder discrimination, more sensitivity to false negatives',
            'Unchanged, since cosine is bounded',
            'Shifted to negative values',
          ],
          1,
          'Lower tau concentrates probability on the argmax and multiplies all gradients by 1/tau: stronger, more focused signal — at the price of amplified damage from any mislabeled positive.',
        ],
        [
          'The claim "InfoNCE lower-bounds mutual information, I >= log N - L" implies that:',
          [
            'More negatives can only tighten the bound (bigger log N) if loss stays low',
            'Loss can never be below log N',
            'N should be as small as possible',
            'Mutual information is exactly log N',
          ],
          0,
          'With L trained toward its floor, raising N raises the ceiling of the bound — the formal reason large batches and negative queues improve representation quality.',
        ],
      ]
    ),
    lesson(
      M6,
      'dl-6-4',
      4,
      'Probing Representations and the Embedding-Dimensionality Tradeoff',
      'How to find out what a representation actually contains (linear probes, control tasks, and why presence is not use), and the arithmetic that decides your embedding dimension — memory, distance concentration, truncation, and when to quantize instead.',
      21,
      nineBlocks({
        objectives: [
          'Design a probing experiment with a control task and compute selectivity from the two accuracies',
          'Explain why probe success does not prove the model USES a feature, and name one intervention method that does',
          'Compute index memory and distance-concentration effects for candidate embedding dimensions',
          'Choose a dimensionality/compression strategy (PCA, Matryoshka truncation, int8) for a stated latency and memory budget',
        ],
        hook:
          'A paper claims: "our encoder linearly encodes tense, sentiment, and syntactic depth." Plausible — almost everything is linearly decodable from enough dimensions, given enough probe training. The evaluation trap is as old as probing itself: a probe measures what CAN be read out, not what the network actually USES when it behaves. And dimensionality is the other half of the lesson: every extra embedding dimension costs storage, index memory, dot-product FLOPs, and statistical efficiency — so "just make it 4096 wide" is a budget decision, not a free upgrade. This lesson gives you both tools: honest introspection, and the cost arithmetic.',
        concept: `**Probing, properly designed.** A PROBE is a small classifier trained on FROZEN representations to predict some attribute of the input: part-of-speech tags, tense/morphology, sentence length, sentiment, syntactic tree depth, word sense. The encoder is not updated; only the probe trains. Readout: accuracy per attribute per layer — this is how we produce the familiar "layer 4 tracks syntax, layer 9 tracks coreference" maps. Design rules: (1) keep the probe MINIMAL — linear first (logistic regression); a linear probe measures LINEAR accessibility, which is the claim being made. (2) Run a CONTROL TASK: train the same probe on RANDOM LABELS with the same distribution (Hewitt & Liang). A high-capacity probe memorizes control labels too — so raw accuracy overstates. (3) Report SELECTIVITY = accuracy(real) - accuracy(control). High selectivity = the representation, not the probe, did the work.

**Presence is not use — the interpretability caution.** Even genuine linear information may be UNUSED by downstream behaviour: sentiment might be readable from BERT layer 6 while the model\'s predictions barely depend on that direction. Probing is CORRELATIONAL; causal claims need INTERVENTION: (1) ABLATION/ACTIVATION PATCHING — zero or swap the suspected feature direction in mid-layer activations and measure the behavioural change; (2) COUNTERFACTUAL EDITING — build an edit that changes only "tense" in the representation and check the output changes only in tense; (3) HEAD/NEURON LESIONING with behavioural tests. If patching the "tense direction" does not alter predictions, the feature is present-but-unused — a distinction exams in mechanistic interpretability care about deeply, and one that keeps probe papers honest.

**Dimensionality: the cost side.** An embedding table for vocab V at width d in fp32 costs V*d*4 bytes (50,000 x 768 = 154 MB; at 300 dims = 60 MB). A retrieval index over M vectors costs M*d*bytes_per_vec before index overhead: 5M vectors at 768 fp32 = 15.4 GB; int8 = 3.84 GB; 128-dim int8 = 0.64 GB. Search cost per query is O(M*d) naive dot products — d directly multiplies latency (ANN indexes change M, not the per-candidate d). Then GEOMETRY: as d grows, distances between random points CONCENTRATE — for independent random vectors, ||u - v||^2 concentrates around 2d with relative spread shrinking like 1/sqrt(d) (coefficient of variation of the squared distance ~ sqrt(2/d): 0.45 at d=10, 0.14 at d=100, 0.045 at d=1000). Nearest and farthest neighbours approach the same radius, margins shrink, and hubness (some points become nearest neighbour of a disproportionate number of queries) gets worse — especially combined with the anisotropy from lesson 6.1. High d is not free resolution; it dilutes signal across dimensions that noise also occupies.

**The capacity-versus-sample view.** Each dimension is a free parameter that must be ESTIMATED from data: with fixed training pairs, growing d grows estimation variance (recall Module 2\'s bias-variance logic at the representation level). Empirically, quality plateaus: word-embedding work found little downstream gain past a few hundred dims; sentence embedders standardize at 384-1024 for quality reasons, and retrieval systems then CUT further for cost. The tradeoff curve is always: quality(d) rising then flattening, cost(d) linear in d — you pick the operating point from the budget, not from "maximum possible".

**Compression levers, in order of invasiveness.** (1) TRUNCATION: keep the first m dimensions — works only if dimensions are ordered by importance; PCA/whitening can enforce this (train PCA, project, evaluate recall@k against full-dim). (2) MATRYOSHKA EMBEDDINGS: trained so the first m dims form a good smaller embedding for ANY m (modern retrieval models advertise 64/128/256/768 truncatable widths with graceful degradation) — truncation without retraining. (3) SCALAR QUANTIZATION: fp32/int8/4-bit per dimension (Module 10.2) — keeps d, cuts bytes 4-8x, typically ~0.1-0.5 points of recall lost with a calibration pass. (4) DISTILLATION into a narrower model (Module 10.2). Sequence: try truncation/PCA first (free), then quantize (cheap), then distill (engineering) — measure recall@k at every step against your actual query set.`,
        extras: [
          table(
            'Index memory for 5 million vectors (before index overhead)',
            ['Representation', 'Bytes/vector', 'Total memory', 'Relative'],
            [
              ['768-dim fp32', '3,072', '15.4 GB', '1x'],
              ['768-dim fp16', '1,536', '7.7 GB', '0.5x'],
              ['768-dim int8', '768', '3.8 GB', '0.25x'],
              ['256-dim int8', '256', '1.3 GB', '0.08x'],
              ['128-dim int8', '128', '0.64 GB', '0.04x'],
            ],
          ),
          code(
            `import torch
import torch.nn.functional as F
from sklearn.linear_model import LogisticRegression   # the linear probe

# ---- Train a LINEAR probe on frozen features, plus a control task ----
def probe_accuracy(X, y, X_ctrl, y_ctrl):
    lin = LogisticRegression(max_iter=1000).fit(X, y)
    ctl = LogisticRegression(max_iter=1000).fit(X_ctrl, y_ctrl)   # random labels
    acc = lin.score(X, y); ctrl = ctl.score(X_ctrl, y_ctrl)
    return acc, ctrl, acc - ctrl          # selectivity = real - control

# features: encoder output per token (frozen — no gradients anywhere)
# X, y = collect_features(model, data)   # e.g. POS tags per token

# ---- Distance concentration: spread of pairwise distances vs dimension ----
def concentration(dims=(10, 100, 1000), n=2000):
    for d in dims:
        u, v = torch.randn(n, d), torch.randn(n, d)
        sq = (u - v).pow(2).sum(1)                 # ||u-v||^2, mean ~ 2d
        cv = sq.std() / sq.mean()                  # ~ sqrt(2/d): shrinks with d
        print(f"d={d:5d}  mean={sq.mean():8.1f}  CV={cv:.3f}")

# ---- PCA truncation then re-evaluate retrieval recall@k ----
from sklearn.decomposition import PCA
def hits(Q, D, k=10):                             # L2-normalized query/doc matrices
    topk = (Q @ D.T).topk(k, dim=1).indices       # (n_q, k) nearest docs
    return (topk == torch.arange(len(Q)).unsqueeze(1)).float().mean().item()

Q = F.normalize(torch.randn(500, 768), dim=-1)    # queries
D = F.normalize(torch.randn(50000, 768), dim=-1)  # corpus
print("full 768:", hits(Q, D))                    # ground truth
D128 = torch.tensor(PCA(128).fit_transform(D), dtype=torch.float32)
Q128 = torch.tensor(PCA(128).fit_transform(Q), dtype=torch.float32)
print("PCA 128 :", hits(F.normalize(Q128, dim=-1), F.normalize(D128, dim=-1)))`,
            'probing_dims.py',
            'python',
          ),
          tip(
            'Probe the layers, not just the last one',
            'Attributes peak at different depths (syntax early, semantics late). Sweep layers with the same linear probe and plot accuracy vs layer — the profile is far more informative than a single final-layer number, and it is how the "BERT layer maps" in papers are built.',
          ),
          warn(
            'A 95% probe score from a deep MLP probe proves almost nothing',
            'Deep probes memorize: a 4-layer MLP can fit random labels at 97% while the representation carries almost nothing extra. Always pair a capacity-scaled probe with its control task, report selectivity, and prefer the linear probe when the claim is "the information is linearly accessible".',
          ),
        ],
        worked: {
          title: 'Read a probe result, then price a dimension choice',
          problem:
            '(a) Probe results on frozen features: linear probe — real labels 92%, control (random labels) 60%; MLP probe (4 layers) — real 99%, control 97%. Compute selectivity for both and decide which result is trustworthy and what it licenses you to claim. (b) Distance concentration: compute the coefficient of variation sqrt(2/d) at d = 10, 100, 1000 and interpret. (c) Index pricing: 5M vectors at 768 fp32 vs 768 int8 vs 128-dim int8 — bytes and GB. (d) A Matryoshka model supports 768/256/768 truncatable widths — you must serve 100 queries/s at a 2 GB index budget: choose and justify.',
          steps: [
            {
              title: '(a) Selectivity arithmetic',
              desc: 'Linear: 0.92 - 0.60 = 0.32 selectivity — the probe succeeds on real structure it cannot fabricate; control accuracy is far below real (the probe cannot memorize random labels at this capacity). MLP: 0.99 - 0.97 = 0.02 — the bigger probe nearly matches its CONTROL score: it memorizes label-per-sample patterns without needing the representation. Verdict: trust the linear result; the MLP number licenses nothing. Claim wording: "attribute X is LINEARLY ACCESSIBLE in layer L" — never "the model uses X".',
              code_snippet: 'linear: 0.92-0.60 = 0.32  |  MLP: 0.99-0.97 = 0.02 (memorization)',
            },
            {
              title: '(b) Distance concentration',
              desc: 'CV ~ sqrt(2/d): d=10 -> sqrt(0.2) = 0.447 (45% spread — neighbours meaningfully separated); d=100 -> 0.141; d=1000 -> 0.045 (4.5% — random points sit within a narrow shell of each other). Consequence: in high d, "far" and "near" differ by a shrinking margin relative to distance itself, so meaningful neighbours must be found by direction (cosine on normalized vectors), and hubness/noise dimensions increasingly confuse exact search.',
              code_snippet: 'CV: d=10 -> 0.447 | d=100 -> 0.141 | d=1000 -> 0.045',
            },
            {
              title: '(c) Index pricing',
              desc: '5e6 x 768 x 4 = 1.536e10 bytes = 15.4 GB (fp32). int8: 5e6 x 768 = 3.84e9 = 3.84 GB (4x cut, sub-1-point recall loss typically). 128-dim int8: 5e6 x 128 = 6.4e8 = 0.64 GB — 24x below the fp32 baseline, at the cost of packing 768 dims of signal into 128 (loss depends entirely on whether the model supports truncation — a Matryoshka model degrades gracefully; a vanilla model truncated arbitrarily may lose far more).',
              code_snippet: '15.4 GB -> 3.8 GB -> 0.64 GB  (fp32/768, int8/768, int8/128)',
            },
            {
              title: '(d) The operating-point decision',
              desc: 'Budget 2 GB rules out 768 fp32 (15.4 GB). 768 int8 (3.84 GB) also busts it; 256 int8 = 1.28 GB fits; 128 int8 = 0.64 GB fits with headroom for index overhead (HNSW graphs add 50-100%!). Start at 256-dim int8, MEASURE recall@10 and p95 latency against full-dim ground truth on your own queries, drop to 128 only if recall holds within your tolerance. The decision is always budget -> candidate -> measured recall; never dimension-from-habit.',
              code_snippet: '2 GB budget: 256-int8 (1.28 GB) + graph overhead -> measure recall',
            },
          ],
          solution:
            '(a) Selectivity 0.32 (linear, trustworthy) vs 0.02 (MLP, memorization) — claim linear accessibility only, and back claims with intervention for use. (b) CV sqrt(2/d) falls 0.447 -> 0.045: high-dimensional distances concentrate; margins shrink, direction (cosine) becomes the only reliable signal. (c) 15.4 GB -> 3.8 GB -> 0.64 GB. (d) Pick 256-dim int8 under 2 GB, verify recall@k on real queries, then decide — including index overhead, which real deployments forget.',
        },
        practice: {
          title: 'Probe and compress an encoder',
          prompt:
            'On a frozen transformer (BERT-base class): (1) extract per-token features from every layer for a POS-tagged sample; (2) train one linear probe per layer, plus a control-task probe on shuffled labels — report accuracy and selectivity per layer as a table/plot; (3) pick the best layer and ablate its "sentiment direction" (subtract the mean difference vector between positive/negative sentences) and measure sentiment-classification change — report presence vs use honestly; (4) PCA-project the features to 128/256 dims and compare probe accuracy; (5) write a 10-line recommendation: dimension, quantization, and whether a probe result justifies deployment.',
          hint: 'Selectivity collapses as probe capacity grows — that is the lesson, not a bug. For (3), a small change after ablation with a large probe gain before it is the classic present-but-barely-used pattern.',
        },
        mistakes: [
          {
            mistake: 'Reading probe accuracy as proof the model uses the feature',
            fix: 'Probing is correlational: information may be present and unused. Causal claims require intervention — patch/ablate the feature in activations and show the behaviour changes (or does not).',
          },
          {
            mistake: 'Using a high-capacity probe without a control task',
            fix: 'Powerful probes memorize random labels; only selectivity (real minus control accuracy) separates representation content from probe capacity. Linear first, control always.',
          },
          {
            mistake: 'Assuming larger embedding dimension is strictly better',
            fix: 'Cost grows linearly (memory, FLOPs) while geometry worsens (distance concentration, hubness) and estimation variance rises. Quality flattens — choose the operating point from a measured recall/latency budget.',
          },
          {
            mistake: 'Truncating or quantizing without re-measuring retrieval recall',
            fix: 'Arbitrary truncation of a non-Matryoshka model can silently gut recall@k; even int8 quantization deserves a calibration pass and a recall check on YOUR queries before shipping.',
          },
        ],
        exam: {
          question:
            'Explain linear probing: how it is conducted, why a control task is required, and what selectivity means. Then discuss whether a high probe accuracy justifies the claim that the model "uses" the probed feature, and analyse the embedding-dimensionality tradeoff with the costs that scale with dimension.',
          answer:
            'Procedure: freeze the encoder; train a minimal (typically linear) classifier on its representations to predict a linguistic/semantic attribute; report accuracy per layer. Control task (Hewitt & Liang): repeat with random labels drawn from the same distribution; selectivity = accuracy(real) - accuracy(control). A probe that scores high on control labels is memorizing, so raw accuracy overstates accessible information — selectivity isolates the representation\'s contribution. Use claim: even genuine selectivity shows information is PRESENT and LINEARLY ACCESSIBLE, not that the network deploys it when computing outputs; behavioural dependence requires intervention — activation patching/ablation of the suspected direction and measuring whether predictions change. Dimensionality tradeoff: cost per embedding scales linearly in d (table V*d*bytes; index M*d; dot-product FLOPs), while geometry degrades — pairwise distances concentrate as relative spread ~ sqrt(2/d) shrinks, margins between neighbours and non-neighbours narrow, hubness rises; statistically, more dims must be estimated from fixed data (variance). Quality gains flatten with d, so the choice is an operating point: pick d from memory/latency budgets, then verify quality — truncation/PCA (or Matryoshka truncation), then int8/4-bit quantization, then distillation — each with recall re-measured on real queries.',
          source: 'A combined probe-and-representation exam question typical of advanced NLP sections; the presence-versus-use distinction separates strong answers.',
        },
        summary: [
          'Probe = frozen features + minimal classifier; run control tasks and report selectivity (real - control accuracy).',
          'High probe accuracy proves accessibility, not use — causal claims need patching/ablation interventions.',
          'Dimension cost is linear (bytes, FLOPs) while geometry worsens: distance CV ~ sqrt(2/d), hubness rises, quality flattens.',
          'Index pricing example: 5M vectors = 15.4 GB at 768 fp32, 3.8 GB at 768 int8, 0.64 GB at 128 int8.',
          'Compress in order: PCA/truncation (Matryoshka if available) -> quantization -> distillation, re-measuring recall@k each step.',
        ],
      }),
      [
        [
          'In probing methodology, the control task consists of training the same probe on:',
          [
            'A second real dataset',
            'Random labels with the same distribution — to measure how much the probe memorizes',
            'Untrained (random) encoder features',
            'Larger batches for stability',
          ],
          1,
          'Selectivity = accuracy(real) - accuracy(control). Control accuracy reveals how much success comes from probe capacity rather than representation content.',
        ],
        [
          'A probe reaches 99% accuracy while its control task reaches 97%. The correct conclusion:',
          [
            'The representation encodes the attribute almost perfectly',
            'The probe is memorizing — selectivity is 2 points, so almost nothing is licensed about the representation',
            'The control task is broken',
            'The probe should be made larger',
          ],
          1,
          'Near-equal real and control scores mean the probe succeeds without using real structure. Only a healthy gap (selectivity) supports an accessibility claim.',
        ],
        [
          'Relative spread of pairwise squared distances between random vectors grows with dimension as:',
          [
            'sqrt(2/d) — it SHRINKS as dimension grows, so distances concentrate',
            'd — it grows linearly',
            'Constant regardless of dimension',
            '1/d — it shrinks quadratically',
          ],
          0,
          'CV ~ sqrt(2/d): at d = 10 it is 0.45, at d = 1000 it is 0.045. High-dimensional points sit on a thin shell — nearest/farthest distinction relies on direction (cosine), not distance magnitude.',
        ],
        [
          'Your index budget is 2 GB for 5M vectors. Which representation fits before index overhead?',
          [
            '768-dim fp32 (~15.4 GB)',
            '768-dim fp16 (~7.7 GB)',
            '256-dim int8 (~1.3 GB) or smaller',
            '512-dim fp32 (~10 GB)',
          ],
          2,
          '5M x 256 bytes = 1.28 GB fits; everything larger exceeds 2 GB before graph/index overhead. Verify recall@k after choosing — budget sets candidates, measurement decides.',
        ],
      ]
    ),
  ],
};
