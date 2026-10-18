// Module 7 — The LLM Training Pipeline
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code } from '../nineBlocks';
import { lesson, M7, COURSE_ID } from './helpers';

export const module7: CourseModule = {
  id: M7,
  course_id: COURSE_ID,
  title: 'Module 7 — The LLM Training Pipeline',
  summary:
    'How a frontier model is actually built, stage by stage: pretraining data pipelines (dedup by MinHash, quality and PII filters, benchmark decontamination), BPE tokenization judged from the training loop\'s point of view (fertility, loss comparability, embedding-table cost), scaling laws and the Chinchilla compute-optimal arithmetic, then the post-training stack — continued pretraining, SFT at scale, and RLHF/DPO with the Bradley-Terry and preference-objective math that Part I introduced in words.',
  sort_order: 7,
  lessons: [
    lesson(
      M7,
      'dl-7-1',
      1,
      'Pretraining Data Pipelines: Dedup, Quality Filters, and PII Scrubbing',
      'The stage that decides model quality before any gradient flows — crawl to corpus: language ID, quality scoring, exact and near deduplication with MinHash arithmetic, PII removal, and benchmark decontamination, each with the numbers that show what it buys.',
      23,
      nineBlocks({
        objectives: [
          'Lay out the standard pretraining corpus pipeline in order and say what each stage removes or keeps',
          'Compute Jaccard estimates from MinHash matches and set a near-duplicate threshold',
          'Explain why deduplication matters for memorization, compute efficiency, and benchmark honesty',
          'Design a PII-scrubbing plus decontamination pass and name what each pass cannot catch',
        ],
        hook:
          'Two labs train the same architecture on the same "Common Crawl snapshot". One gets a model that recites its training data, fails mysteriously on a public benchmark, and stores someone\'s phone number in its weights. The other does not. The difference is not the model — it is a few weeks of data engineering: filters, dedup, PII scrubbing, decontamination. In the modern era, model quality discussions that skip the data pipeline are arguing about the icing. This lesson is the pipeline, with arithmetic.',
        concept: `**The pipeline, in the order data actually flows.** (1) COLLECT: web crawl (Common Crawl etc.), books, code (permissive licenses), papers, forums — raw and filthy. (2) LANGUAGE ID: a fastText classifier routes documents per language (a "English" crawl is 30% not-English; getting this wrong quietly mixes distributions). (3) QUALITY FILTERS: heuristics (length, mean word length, symbol-to-letter ratio, bullet-list density, "click here" boilerplate), a perplexity filter against a small clean reference LM (keep documents the reference model finds unsurprising — clean prose is predictable to a clean model), classifier-based quality scores, and blocklists for toxicity. (4) DEDUPLICATION: exact and near-duplicate removal (below). (5) PII SCRUBBING: detect and redact personal data before it can be memorized (below). (6) DECONTAMINATION: remove training documents overlapping your EVALUATION benchmarks (below). (7) MIXING: sample domains to target proportions (code/math/web/books — the mix IS a hyperparameter: too much code shifts style, too much web shifts register). (8) PACKING: concatenate into fixed-length training sequences. The order matters: filter BEFORE dedup (dedup is expensive), scrub PII before packing, decontaminate last against your frozen eval sets.

**Deduplication — the highest-leverage filter.** EXACT dedup: hash every document (or shingle) and drop repeats — trivial and effective: web crawls are 30-60% near-duplicate by many measurements. NEAR dedup: documents that differ slightly (headers, tracking params, syndicated news) need SIMHASH or MINHASH-LSH. MinHash intuition you can derive: for a document represented as a set of n-gram SHINGLES (say 13-grams), a min-hash h picks the smallest hash among the shingles; the probability that h(A) = h(B) is exactly the Jaccard similarity J(A,B) = |A∩B|/|A∪B| — one hash is a Bernoulli sample of J, so averaging k min-hashes (or counting matches across k) ESTIMATES J: Ĵ = matches/k. LSH bands documents into buckets so only plausible pairs are compared — turning O(n²) all-pairs into near-linear work. Threshold: keep pairs with J ≥ 0.7-0.8 as duplicates (tunable).

Why dedup carries its weight: (1) COMPUTE — repeated documents consume tokens repeatedly; dedup shifts your fixed token budget toward UNIQUE information; (2) MEMORIZATION — large models verbatim-memorize repeated content (extractable-membership studies show repeated text is learned far faster and retained longest); dedup is the first privacy defense; (3) OVERFITTING — effective epochs on repeated docs inflate train/test-style leakage; (4) EVALUATION HONESTY — duplicated benchmark answers in training data make scores fiction (next: decontamination).

**PII scrubbing.** Layers, because no single pass works: regex/structural detectors (emails, phone numbers, SSNs, credit-card numbers with Luhn validation — high precision), NER-based detectors for person/location names (higher recall, more false positives), and sometimes an abstention/fuzziness layer for free text. Handle: replace with a placeholder ([EMAIL]) so the model learns the PATTERN of PII without the VALUE, keep an audit log, and remember the hard truth — scrubbing reduces but does not eliminate memorization risk; dedup plus limited repeats (epochs) matter as much as the scrubber. False positives are a real cost: code containing hex strings that look like IDs, phone-like numbers in tables — measure precision/recall on a labeled sample, do not trust the filter by inspection.

**Decontamination.** Your benchmark (MMLU/GSM8K/internal test set) must not be in training: match n-grams (typically 13-grams) between training docs and eval questions; drop overlapping documents. Report contamination checks with results — the field has repeatedly found benchmark inflation from overlap. Note the asymmetry: you can decontaminate KNOWN benchmarks only; new public evals released after your cutoff are still vulnerable — freeze and privatize your internal eval sets instead.`,
        extras: [
          table(
            'Pipeline stages, what they remove, and the failure if skipped',
            ['Stage', 'Mechanism', 'If skipped', 'Typical cost if skipped'],
            [
              ['Language ID', 'fastText/langid classifier', 'Mixed-language soup mislabeled as one language', 'Silent quality loss'],
              ['Quality filter', 'Heuristics + reference-LM perplexity + classifiers', 'Boilerplate, spam, machine junk dominate token budget', 'Worse loss at any compute'],
              ['Exact + near dedup', 'Hashing; MinHash-LSH over shingles', 'Repeated content: memorization, wasted tokens, leakage', '30-60% of crawl tokens often redundant'],
              ['PII scrubbing', 'Regex + NER redaction to placeholders', 'Personal data memorized and extractable', 'Privacy incident risk'],
              ['Decontamination', 'n-gram overlap with eval sets', 'Benchmark scores inflated by training overlap', 'Invalid evaluation'],
            ],
          ),
          code(
            `import hashlib, re, random

# ---- Exact dedup: content hash (dedupe a corpus in one pass) ----
def exact_dedup(docs):
    seen, keep = set(), []
    for d in docs:
        h = hashlib.sha1(" ".join(d.split()).encode()).hexdigest()   # whitespace-normalized
        if h not in seen:
            seen.add(h); keep.append(d)
    return keep

# ---- MinHash: P(min-hash equal) = Jaccard; average of k hashes estimates J ----
def shingles(doc, k=13):
    w = doc.split()
    return set(" ".join(w[i:i + k]) for i in range(len(w) - k + 1))

def minhash(sh, n_hash=128, seed=0):
    out = []
    for i in range(n_hash):
        r = random.Random(seed + i)
        # standard trick: universal hashes = (a*x + b) mod P, take minimum
        a, b, P = r.randint(1, 2**61 - 1), r.randint(0, 2**61 - 1), (1 << 61) - 1
        out.append(min((a * x + b) % P for x in sh))
    return out

def jaccard_estimate(sa, sb):
    A, B = minhash(sa), minhash(sb)
    return sum(1 for x, y in zip(A, B) if x == y) / len(A)     # ~ J(A, B)

# ---- PII: structural detectors with validation (credit card: Luhn) ----
EMAIL = re.compile(r"[\\w.+-]+@[\\w-]+\\.[\\w.]+")
PHONE = re.compile(r"(?<!\\d)(?:\\+?\\d[\\d ()-]{7,}\\d)(?!\\d)")
def luhn_ok(num):
    digits = [int(c) for c in num if c.isdigit()]
    total, alt = 0, False
    for d in reversed(digits):
        if alt:
            d *= 2
            if d > 9: d -= 9
        total += d; alt = not alt
    return total % 10 == 0
def scrub(text):
    text = EMAIL.sub(" [EMAIL] ", text)
    text = PHONE.sub(lambda m: " [PHONE] " if luhn_ok(m.group()) else m.group(), text)
    return text

# ---- Decontamination: drop train docs sharing 13-grams with eval ----
def eval_ngrams(questions, k=13):
    grams = set()
    for q in questions:
        w = q.split()
        grams.update(" ".join(w[i:i + k]) for i in range(len(w) - k + 1))
    return grams
def is_contaminated(doc, eval_grams, k=13):
    w = doc.split()
    return any(" ".join(w[i:i + k]) in eval_grams for i in range(len(w) - k + 1))`,
            'corpus_pipeline.py',
            'python',
          ),
          tip(
            'Dedup before you count epochs',
            'An "epoch" over a 3x-duplicated corpus is three passes over the same content — training curves and memorization risk both change. Measure unique-token count (post-dedup), not raw crawl size, when you plan compute (Module 7.3 needs honest token counts).',
          ),
          warn(
            'Perplexity filters are domain-sensitive by construction',
            'A reference LM trained on Wikipedia finds code, dialect, and low-resource-language text "high perplexity" and deletes it — silently homogenizing your corpus. Tune thresholds per language/domain and audit what each filter removes with sample dumps before trusting aggregate keep-rates.',
          ),
        ],
        worked: {
          title: 'Quantify dedup, MinHash thresholds, and contamination',
          problem:
            'A crawl of 100B tokens arrives. (a) Exact+near dedup analysis says 35% of tokens are redundant — how many unique tokens remain, and what did dedup buy against a 70B-token training budget? (b) Two documents: MinHash with 128 hashes matches on 96. Estimate Jaccard and decide with a 0.75 threshold. (c) State the per-hash probability identity that justifies (b). (d) A benchmark of 2,000 questions: your 13-gram scan flags 150 training documents as overlapping — what is the action, and what can it NOT fix? (e) PII: your phone regex fires 10,000 times on 10B tokens; precision measured at 60% — how many real PII occurrences remain uncaught if recall is 80%?',
          steps: [
            {
              title: '(a) Unique token budget',
              desc: '100B x (1 - 0.35) = 65B unique tokens. Against a 70B-token budget, the UN-deduped crawl cannot even supply one non-repeating pass — you would train on 5B tokens of pure repeats (plus repeated weighting throughout). Dedup turned "barely one epoch of 100B" into "one epoch of 65B unique", every token distinct — the same budget now buys strictly more information per token.',
              code_snippet: '100B x 0.65 = 65B unique  (5B repeat-debt avoided at 70B budget)',
            },
            {
              title: '(b) Jaccard estimate',
              desc: 'Ĵ = 96/128 = 0.75. Exactly at threshold — in practice apply hysteresis: threshold 0.8 to declare near-dup, 0.6 to declare distinct, and REVIEW the middle band (or pick 0.75 and accept both error types consciously). With shingle-based min-hashing, J = 0.75 means three quarters of the 13-grams overlap — heavily syndicated content.',
              code_snippet: 'J_hat = 96 / 128 = 0.75',
            },
            {
              title: '(c) The identity',
              desc: 'For each min-hash function h: P[h(A) = h(B)] = J(A, B) — the minimum of a set of random hashes is equal between two sets exactly with probability their Jaccard similarity. k independent hashes give k Bernoulli samples: Ĵ = matches/k converges to J as 1/sqrt(k); at k = 128, standard error ~ sqrt(J(1-J)/128) ≤ 0.044 — so 96/128 estimates J within about ±0.09 at 1 s.e.',
              code_snippet: 'P[h(A)=h(B)] = J ;  SE(J_hat) ~ sqrt(J(1-J)/128) ~ 0.044 at J=0.75',
            },
            {
              title: '(d) Decontamination action and limits',
              desc: 'Action: DROP all 150 flagged training documents (or scrub the overlapping spans), re-scan until clean, and re-run the benchmark — score changes are your true measurement. Limits: 13-gram matching catches verbatim and near-verbatim reuse only — paraphrased leakage and contamination of benchmarks released AFTER your data cutoff remain undetectable. Hence: privatize/freeze internal eval sets, and treat public benchmark gains without a contamination report skeptically.',
              code_snippet: 'drop 150 docs -> rescan -> re-run eval; paraphrase leaks survive',
            },
            {
              title: '(e) PII filter arithmetic',
              desc: 'Fires = 10,000, precision 60% -> 6,000 true positives caught, 4,000 false alarms. Recall 80% means total true PII = 6,000/0.8 = 7,500 -> 1,500 MISSED (20%) still in the corpus. So even a decent filter leaves one in five occurrences — the reason scrubbing is layered on top of dedup (fewer repeats = less memorization pressure) and why you report filter metrics, not just "PII handled".',
              code_snippet: 'caught 6,000 ; total 7,500 ; missed 1,500 (recall 80%)',
            },
          ],
          solution:
            '(a) 65B unique tokens — dedup converts crawl size into honest budget. (b) Ĵ = 0.75, exactly at a typical threshold: declare policy explicitly. (c) P[min-hash match] = J, with Ĵ error ~1/sqrt(k). (d) Drop the 150 docs, rescan, re-evaluate; paraphrased and post-cutoff contamination remains — freeze private evals. (e) Precision 60% + recall 80% leaves ~1,500 occurrences (20%) uncaught: never claim scrubbing is complete — layer it with dedup, epochs control, and audit.',
        },
        practice: {
          title: 'Build a mini corpus pipeline',
          prompt:
            'Take a few thousand web-scraped or generated text files: (1) exact-dedup by normalized hash — report tokens saved; (2) near-dedup with 13-gram shingles and MinHash at 64 hashes — report the distribution of estimated Jaccard between random pairs and how many docs you drop at thresholds 0.6/0.75/0.9; (3) run regex PII detection (email/phone), hand-label 100 matches for precision; (4) decontaminate against a small held-out question set with 13-gram overlap; (5) write a one-paragraph report: before/after token counts, what each stage removed, and one filter you do NOT trust yet and why.',
          hint: 'Expect a big exact-dedup win on crawled data and a long tail of near-dups. Precision of loose phone regexes is usually poor — that measurement, not the filter, is the deliverable.',
        },
        mistakes: [
          {
            mistake: 'Counting raw crawl size as your training-token budget',
            fix: 'Duplicates mean repeated passes over the same content: report unique tokens post-dedup, and plan epochs against that. Scaling-law arithmetic (7.3) with inflated token counts misprices everything downstream.',
          },
          {
            mistake: 'Treating the PII scrubber as a guarantee',
            fix: 'Every detector trades recall against precision; measured recall of 80% means 1 in 5 occurrences survives. Layer scrubbing with dedup, limited epochs, and audits — and state residual risk instead of "PII removed".',
          },
          {
            mistake: 'Skipping decontamination because "the benchmark is public anyway"',
            fix: 'Verbatim overlap silently inflates scores — the field has repeatedly been embarrassed by it. Scan n-grams against every eval you report, drop overlaps, and disclose the check; for new evals, freeze private copies at data-cutoff time.',
          },
          {
            mistake: 'Filtering AFTER dedup, or never auditing filter keep-rates',
            fix: 'Order: cheap filters first, expensive dedup later; and every filter needs a sampled before/after dump — perplexity and blocklist filters delete legitimate dialect, code, and low-resource languages silently if nobody looks.',
          },
        ],
        exam: {
          question:
            'Describe a pretraining data pipeline in order, explaining exact versus near-deduplication (including how MinHash estimates similarity and the probability identity behind it), and why deduplication affects model quality, memorization, and evaluation. How do PII scrubbing and decontamination complement it?',
          answer:
            'Ordered pipeline: collect -> language identification -> quality filtering (heuristics, reference-LM perplexity, classifier scores, blocklists) -> exact and near-deduplication -> PII scrubbing -> benchmark decontamination -> domain mixing -> sequence packing. Exact dedup: normalized content hashing removes identical documents. Near dedup: represent each document as a set of n-gram shingles (e.g., 13-grams); MinHash maps each set to k minimum-hash values, with the identity P[h(A) = h(B)] = Jaccard(A, B), so the fraction of matching hashes (k samples) estimates J — pairs above a threshold (0.7-0.8) are duplicates; LSH banding avoids all-pairs comparison. Dedup matters because: (1) unique tokens deliver more information per unit of compute than repeats; (2) repeated content is memorized verbatim far more readily — dedup is a first-line defense against extraction of training data; (3) repeated benchmark material inflates evaluation. PII scrubbing (regex + NER redaction to placeholders, with measured precision/recall) reduces personal-data memorization but cannot guarantee removal; decontamination (dropping training documents whose n-grams overlap frozen eval sets) protects measurement validity against verbatim leakage, though it cannot catch paraphrase or post-cutoff benchmarks. Together: dedup controls repetition-driven memorization and compute waste, scrubbing limits privacy payload, decontamination keeps scores honest.',
          source: 'The data-centric counterpart of scaling-law questions — increasingly standard in advanced DL exams and foundation-model interviews.',
        },
        summary: [
          'Pipeline order: language ID -> quality filters -> dedup -> PII scrub -> decontaminate -> mix -> pack.',
          'MinHash: P[hash match] = Jaccard; k hashes estimate J with error ~1/sqrt(k); LSH makes near-dup detection near-linear.',
          'Dedup buys unique information per token, cuts memorization pressure, and stops duplicate eval material inflating scores.',
          'PII filters have measurable precision/recall — layer them with dedup and epochs control; never claim completeness.',
          'Decontaminate against frozen evals (13-gram overlap) and keep internal eval sets private.',
        ],
      }),
      [
        [
          'In MinHash, the probability that the minimum-hash values of two documents are equal equals:',
          [
            'Their cosine similarity',
            'Their Jaccard similarity over shingle sets',
            'The fraction of shared words',
            'Zero unless documents are identical',
          ],
          1,
          'P[h(A) = h(B)] = |A∩B|/|A∪B| — one min-hash is a Bernoulli sample of Jaccard; averaging over k hashes estimates J.',
        ],
        [
          'The strongest reason to remove near-duplicates from pretraining data is that repeated content:',
          [
            'Slows GPU kernels',
            'Is memorized verbatim far more readily and wastes token budget on redundant information',
            'Breaks the tokenizer',
            'Increases effective vocabulary size',
          ],
          1,
          'Repetition accelerates memorization (extraction risk), inflates benchmark overlap, and spends compute on information already seen — dedup addresses all three at once.',
        ],
        [
          'Benchmark decontamination is performed by:',
          [
            'Adding noise to benchmark labels',
            'Dropping training documents whose n-grams overlap the evaluation questions',
            'Shuffling the eval split',
            'Fine-tuning on the benchmark first',
          ],
          1,
          'n-gram (typically 13-gram) matching finds verbatim/near-verbatim overlap; flagged training docs are removed (or spans scrubbed) and the eval re-run — it cannot catch paraphrased leakage.',
        ],
        [
          'A PII filter reports 60% precision and 80% recall on labeled samples. The correct conclusion:',
          [
            'PII is fully removed from the corpus',
            'Roughly 1 in 5 true PII occurrences survives, and 4 in 10 alarms are false — the filter is one layer, not a guarantee',
            'Precision above 50% means no false positives',
            'Recall is irrelevant for privacy',
          ],
          1,
          'Recall 80% leaves 20% of true occurrences in the data; precision 60% means 40% of redactions hit innocent text — both must be measured and reported, with dedup and epoch limits as complementary defenses.',
        ],
      ]
    ),
    lesson(
      M7,
      'dl-7-2',
      2,
      'BPE Tokenization from the Training View',
      'Byte-pair encoding built the way a trainer sees it: how merges are learned from YOUR corpus, what vocabulary size costs in parameters and throughput, why loss curves are not comparable across tokenizers, and how fertility decides which languages and users your model serves well.',
      22,
      nineBlocks({
        objectives: [
          'Run the BPE merge loop by hand on a toy corpus and predict the resulting token sequence for a new word',
          'Compute the parameter and compute cost of a vocabulary choice at a given model dimension',
          'Explain why per-token cross-entropy losses from two tokenizers are not comparable, and compute bits-per-byte instead',
          'Diagnose a fertility imbalance across languages and its consequences for cost, context, and fairness',
        ],
        hook:
          'The tokenizer sits between your data and your gradients, and almost nobody audits it. Change the vocabulary and you change: how many parameters the embedding table eats, how many forward steps a sentence costs, how much context a Hindi sentence occupies versus an English one, and what number your loss curve prints — same model, same data, different tokenizer, different loss. Worse: teams have been known to compare their model\'s loss against a competitor\'s published curve without realizing the units differ. This lesson treats tokenization as a TRAINING decision, not a preprocessing footnote.',
        concept: `**BPE, trained on your corpus.** Start from a SYMBOL inventory: byte-level BPE (GPT-2 onward) begins with the 256 byte values, so any string is representable — no OOV by construction (lesson 6.2). Then repeat T times: count adjacent symbol pairs across the corpus, MERGE THE MOST FREQUENT PAIR into a new symbol, append it to the vocabulary. That is the whole algorithm — a greedy, corpus-driven compression heuristic. The learned merges are an ORDERED LIST; encoding a new word = apply merges in order (standard practice: pre-tokenize with a regex that splits words/whitespace/punctuation first, then apply merges within each piece). Typical vocab: 32k-256k symbols. Key trainer\'s insight: merges are learned from YOUR data distribution — a tokenizer trained on English web text fragments Hindi or code suboptimally; that is why models ship with corpora-matched tokenizers, and why "swap the tokenizer" is never a small change.

**What vocabulary size actually costs.** Embedding table: V x d parameters — 50k x 4096 = 204.8M parameters (tied with the output head: counted once; untied: 409.6M — ~3-6% of a 7B model, non-trivial). Output softmax over V logits per position (though the cost is folded into the final matmul). But a BIGGER vocabulary cuts the other side: fewer tokens per document — tokens/word falls as merges grow, so the SAME corpus trains in fewer steps/tokens, sequences pack more text, and the effective context covers more characters. Small vocabulary: cheap table, longer sequences, more steps, worse context economy. This is a real trade with an optimum — not "bigger is better".

**Loss is measured in token units — so it is tokenizer-relative.** Cross-entropy is nats (or bits) per TOKEN. A tokenizer that merges more aggressively produces FEWER, MORE INFORMATIVE tokens: each token carries more entropy, so its per-token loss is structurally HIGHER even for an equally good model — while its loss per BYTE/character is lower. Comparing two models' reported losses across tokenizers compares different units — pure error. The tokenizer-independent metric: bits per byte = CE_nats_per_token / (tokens_per_byte * ln 2). Equivalently compute total nats over a fixed text and divide by its byte count. Train/eval within ONE tokenizer; normalize across tokenizers with bits-per-byte (or a fixed external probe corpus tokenized by a FIXED reference tokenizer).

**Fertility: the fairness and cost axis.** Fertility = tokens per word (or per character) for a language under YOUR tokenizer. English web-heavy merges give English fertility ~1.3 tokens/word; morphologically rich and Indic languages often come out 1.5-3x higher (no shared merges for their morphology; byte fallback fragments rare characters). Consequences, all mechanical: (1) COST — same content, more tokens, more money per request; (2) CONTEXT — a 4k-token context covers fewer Hindi characters than English characters: silently unequal capability; (3) TRAINING — the model spends more of its per-document budget on morphology, less on semantics; the 6.2 fertility OOV story, now quantified. Fixes: train the tokenizer on a language-balanced sample (upweight low-resource languages during BPE training — the vocabulary itself becomes a budget allocation), larger vocab, or UNigram/SentencePiece variants — all measurable by per-language fertility tables BEFORE you spend GPU.

**Trainer-grade cautions.** (1) Retraining a tokenizer for a pretrained model invalidates the embedding table: rows must be resized and re-initialized, old rows no longer align to new merges — effectively a new model (some mid-training tokenizer surgeries exist but are research-grade). (2) Chat templates are tokenizer logic: the exact special tokens wrapping system/user/assistant turns are part of the model contract — train and serve with the SAME template or behavior degrades mysteriously. (3) Padding side, truncation side, and EOS placement are training decisions with inference consequences (a model trained with right-padding and evaluated left-padded attends to padding — Module 9 masks).`,
        extras: [
          table(
            'Vocabulary size: the trade at d_model = 4096',
            ['Vocab V', 'Embedding params (tied)', 'Tokens/word (typical English web)', 'Effect'],
            [
              ['16k', '65.5M', 'Higher — more tokens/doc', 'Cheap table, longer sequences, more steps'],
              ['32k', '131M', 'Middle', 'Common default band'],
              ['50k', '204.8M', 'Lower', 'Richer merges; table now ~3% of a 7B model'],
              ['128k', '524M', 'Lowest', 'Best context economy; table becomes a real cost'],
            ],
          ),
          code(
            `import collections, re

# ---- BPE training, the actual loop ----
def train_bpe(corpus, num_merges=1000):
    words = [list(w) + ["</w>"] for w in re.findall(r"\\w+|[^\\w\\s]", corpus)]
    vocab = set(c for w in words for c in w)
    merges = []
    for _ in range(num_merges):
        pairs = collections.Counter()
        for w in words:
            pairs.update(zip(w, w[1:]))
        if not pairs:
            break
        best = pairs.most_common(1)[0][0]              # most frequent adjacent pair
        merges.append(best)
        a, b = best
        words = [merge(w, a, b) for w in words]        # replace occurrences in place
        vocab.add(a + b)
    return merges, vocab

def merge(w, a, b):
    out, i = [], 0
    while i < len(w):
        if i < len(w) - 1 and (w[i], w[i + 1]) == (a, b):
            out.append(a + b); i += 2                  # one merged symbol
        else:
            out.append(w[i]); i += 1
    return out

def encode(word, merges):
    tokens = list(word) + ["</w>"]
    for a, b in merges:                                # apply in learned order
        tokens = merge(tokens, a, b)
    return tokens

# ---- Bits-per-byte: the tokenizer-independent loss ----
import math
def bits_per_byte(total_nats, total_bytes):
    return total_nats / (total_bytes * math.log(2))
# report THIS when comparing models with different tokenizers.

# ---- Fertility audit before you commit to a tokenizer ----
def fertility(text, tokenizer):
    words = text.split()
    toks = tokenizer(text, add_special_tokens=False)["input_ids"]
    return len(toks) / max(1, len(words))              # per-language, on real text`,
            'bpe_training.py',
            'python',
          ),
          tip(
            'Audit fertility per language before training, not after',
            'Tokenize a 10k-word sample per target language, print tokens/word and chars/token side by side. A 2x fertility gap on a language you claim to serve is a cost, latency, and context bug you are signing up for — and the fix (rebalancing BPE training data) must happen before pretraining.',
          ),
          warn(
            'Never compare loss curves across tokenizers',
            'Per-token cross-entropy is expressed in your tokenizer\'s units: more aggressive merges -> fewer, higher-entropy tokens -> higher per-token loss at equal quality. Compare within a tokenizer, or convert to bits-per-byte over a fixed reference text — otherwise you are comparing meters with feet.',
          ),
        ],
        worked: {
          title: 'Run BPE by hand, price the vocab, and normalize a loss',
          problem:
            'Toy corpus: "low low lower lowest" (each space-separated word, with an end-of-word marker).</w>. (a) With characters as initial symbols, list the first two merges (count adjacent pairs, ignoring </w> boundaries only where they differ). (b) Encode "lower" with those merges — how many tokens vs 5 raw characters? (c) Vocab pricing: V = 50,000 at d = 4096, tied vs untied embeddings — parameters and fp32 GB. (d) Loss comparison: model A (aggressive tokenizer) gets 2.10 nats/token with 1.1 tokens/byte on a reference text; model B (conservative) gets 1.70 nats/token with 1.5 tokens/byte — which is better per byte, and by how much? (e) Fertility: English 1.3 tokens/word, Hindi measured at 2.6 — state two concrete consequences.',
          steps: [
            {
              title: '(a) First merges',
              desc: 'Corpus words (with </w>): low</w> low</w> lower</w> lowest</w>. Adjacent-pair counts: (l,o) = 4 (all four words), (o,w) = 4, (w,e) = 2 (lower, lowest), (w,</w>) = 2 (the two "low"), and (e,r), (r,</w>), (e,s), (s,t), (t,</w>) = 1 each. Top pair: tie at 4 between (l,o) and (o,w) — ties broken by implementation order; take merge #1 = lo. Recount after lo: (lo,w) = 4 now tops the counts — merge #2 = low. The corpus-driven loop continues from there (low</w> next, and so on).',
              code_snippet: 'merge 1: l+o -> lo   |   merge 2: lo+w -> low',
            },
            {
              title: '(b) Encode "lower"',
              desc: 'Start: l o w e r </w>. Apply merge 1 (lo): lo w e r </w>. Apply merge 2 (low): low e r </w>. With only these two merges the word is 4 tokens (low, e, r, </w>) vs 6 raw symbols — and as more merges arrive ((e,r) -> er etc.) it compresses further. Point: compression grows with vocabulary, step by step, exactly on the patterns your corpus repeats.',
              code_snippet: 'lower -> [low, e, r, </w>]  (4 vs 6 symbols)',
            },
            {
              title: '(c) Embedding pricing',
              desc: 'Tied: V*d = 50,000 * 4096 = 204,800,000 parameters = 204.8M -> fp32 = 819 MB (weights only; plus optimizer states x2 more for Adam in training). Untied: 409.6M params -> 1.64 GB fp32. In a 7B model, tied-205M is ~2.9% of parameters — but the Adam training footprint (param + m + v, Module 9.4) makes it ~1.6 GB of the training-state bill. Nothing fatal — but it is a line item, not an invisible constant.',
              code_snippet: '50,000 x 4,096 = 204.8M params -> 819 MB fp32 (tied: one table)',
            },
            {
              title: '(d) Bits per byte',
              desc: 'A: 2.10 nats/token / 1.1 tokens/byte = 1.909 nats/byte = 1.909/ln2 = 2.754 bits/byte. B: 1.70/1.5 = 1.133 nats/byte = 1.635 bits/byte. On the common scale B is clearly better (1.64 vs 2.75 bits/byte) — and notice how the RAW comparison misleads: quoting per-token losses (1.70 vs 2.10) suggested a 1.24x gap, while per-byte reveals a 1.69x gap in the same direction with a very different magnitude. Units differ, so both the ordering and the size of the margin deserve normalization.',
              code_snippet: 'A: 2.10/1.1 = 1.91 n/byte ;  B: 1.70/1.5 = 1.13 n/byte  ->  B wins',
            },
            {
              title: '(e) Fertility consequences',
              desc: 'Hindi at 2.6 vs English 1.3 tokens/word means: (1) COST — every Hindi request bills 2x tokens for the same word count, and Hindi users hit context limits at half the apparent size: a 4k-token window holds about half the Hindi text; (2) TRAINING/SKILL — morphology consumes model capacity and the corpus\'s token budget, and benchmark scores in that language are computed over a different effective budget. Fix at the source: balance languages in the BPE training sample so merges serve both.',
              code_snippet: '2.6 / 1.3 = 2x tokens per word  ->  2x cost, half the context',
            },
          ],
          solution:
            '(a) merges: (l,o) then (lo,w) after recount — corpus-driven, tie-broken by order. (b) "lower" -> [low, e, r, </w>]: 4 vs 6 symbols, compressing further as merges grow. (c) 50k x 4096 = 204.8M params (tied) = 819 MB fp32; untied doubles it. (d) bits/byte: A = 2.75, B = 1.64 — per-token numbers (2.10 vs 1.70) were in different units; per-byte is the comparable scale. (e) 2x fertility = 2x cost and half the context for Hindi — a tokenizer fairness and budget decision made at BPE-training time.',
        },
        practice: {
          title: 'Train and audit a tokenizer',
          prompt:
            'With HuggingFace tokenizers: (1) train a byte-level BPE (vocab 4k) on an English corpus, and a second one on a mixed English+Hindi sample; (2) encode 20 test sentences per language with each — tabulate tokens/word and chars/token per language per tokenizer; (3) quantify the imbalance each tokenizer introduces; (4) compute bits-per-byte of a fixed model output under both tokenizers on the same raw text and explain any gap; (5) state what would break if you swapped tokenizer #2 into a model pretrained with #1 (embedding table, loss units, chat template) and list the three things you would have to retrain.',
          hint: 'The mixed-corpus tokenizer should reduce Hindi fertility — that is the fix for 7.2\'s fairness point. For (4), total nats over the same raw text divided by bytes makes the tokenizers comparable.',
        },
        mistakes: [
          {
            mistake: 'Comparing validation loss across two tokenizers',
            fix: 'Per-token loss lives in tokenizer-specific units; more merges -> higher per-token entropy at equal quality. Compare within one tokenizer or normalize to bits-per-byte on a fixed reference text.',
          },
          {
            mistake: 'Swapping or retraining a tokenizer after pretraining',
            fix: 'The embedding table rows no longer correspond to the new merges — the model\'s learned token vectors are misaligned. Treat tokenizer change as a new pretraining (resize + reinitialize only works in narrow research settings), and always ship the matching chat template with the weights.',
          },
          {
            mistake: 'Ignoring fertility when claiming multilingual support',
            fix: 'Byte-level BPE avoids OOV but fragments underrepresented languages: 2x tokens/word = 2x price and half the context. Measure fertility per language before pretraining; fix by rebalancing the tokenizer\'s training sample, not by apologizing later.',
          },
          {
            mistake: 'Assuming a bigger vocabulary is strictly better',
            fix: 'It lowers token counts but grows the V x d table (and softmax), and rare merge rules can fragment differently across domains. The optimum balances table cost against sequence economy — measure both at your d_model and corpus.',
          },
        ],
        exam: {
          question:
            'Explain byte-pair encoding: how merges are learned and applied. Discuss the vocabulary-size tradeoff in terms of parameters and sequence length, why losses from different tokenizers are incomparable, and what fertility means for a multilingual model.',
          answer:
            'BPE: initialize symbols as bytes (byte-level variant: all 256, hence no OOV); repeatedly count adjacent symbol pairs over the training corpus and merge the most frequent pair into a new symbol, T times, producing an ordered merge list and vocabulary (typically 32k-128k). Encoding applies pre-tokenization (regex word/whitespace/punctuation split) then the learned merges in order. Vocab tradeoff: embedding table costs V x d parameters (50k x 4096 = 204.8M, tied with the LM head or double if untied) plus larger softmax, while larger V yields fewer tokens per document — shorter sequences, fewer training/serving steps, more text per context window; smaller V does the reverse — there is an optimum, not a maximum. Loss comparability: cross-entropy is per TOKEN, and token units differ across tokenizers; an aggressive tokenizer produces fewer, higher-entropy tokens so its per-token loss can be higher at equal (or better) per-byte quality — compare within a tokenizer or convert to bits-per-byte (total nats / (bytes x ln 2)) on a fixed text. Fertility (tokens per word per language): web-heavy merges make English efficient while morphologically rich/Indic languages fragment — doubling cost per request, halving effective context, and shifting model capacity toward morphology; mitigate by language-balancing the tokenizer\'s training sample and auditing per-language fertility before pretraining. Changing the tokenizer post-pretraining misaligns the embedding table and the chat template — effectively a new model.',
          source: 'The tokenizer-in-the-training-loop question: now standard wherever LLM training is examined seriously (interviews and advanced exams alike).',
        },
        summary: [
          'BPE = iteratively merge the most frequent adjacent symbol pair, learned from YOUR corpus; byte-level start removes OOV.',
          'Vocabulary size trades table parameters (V x d) against sequence economy — an optimum, not a maximum.',
          'Per-token loss is tokenizer-relative: normalize with bits-per-byte before any cross-model comparison.',
          'Fertility (tokens/word) decides real cost and context share per language — audit it before pretraining.',
          'Tokenizer + chat template + embedding table are one contract: post-hoc swaps break the model.',
        ],
      }),
      [
        [
          'Byte-level BPE guarantees that:',
          [
            'Every word becomes exactly one token',
            'Any byte string can be represented — there is no out-of-vocabulary string',
            'The vocabulary is unlimited',
            'Tokens always align with morphemes',
          ],
          1,
          'Starting from all 256 byte values means any input decodes to some token sequence (OOV impossible); rare words instead pay more tokens — fertility, not absence.',
        ],
        [
          'Two models trained with different tokenizers report losses of 1.6 and 2.3. This comparison is:',
          [
            'Fine — lower is always better',
            'Meaningless without normalization — per-token loss is measured in tokenizer-specific units; use bits-per-byte on a fixed text',
            'Valid if both use cosine similarity',
            'Valid when trained on the same data',
          ],
          1,
          'Tokens differ in granularity: a coarser tokenizer has fewer, higher-entropy tokens, inflating per-token loss at equal per-byte quality. Cross-tokenizer comparisons require a common unit.',
        ],
        [
          'Increasing vocabulary size from 16k to 128k at fixed d_model primarily:',
          [
            'Increases embedding-table parameters while decreasing tokens per document',
            'Decreases both parameters and tokens',
            'Increases tokens per document',
            'Has no effect on sequence length',
          ],
          0,
          'Table cost grows linearly with V (V x d parameters); richer merges cut token counts. Both sides must be priced — the optimum balances table cost against sequence economy.',
        ],
        [
          'A tokenizer yields 1.3 tokens/word for English and 2.6 for Hindi. The direct consequences include:',
          [
            'Hindi requests cost about 2x per word and a fixed context window holds about half as much Hindi text',
            'Hindi output is more accurate',
            'English and Hindi have equal token budgets',
            'No effect — BPE has no OOV',
          ],
          0,
          'Fertility doubles billing and halves effective context for the higher-fertility language — a fairness and cost issue fixed by balancing languages in the tokenizer\'s own training sample.',
        ],
      ]
    ),
    lesson(
      M7,
      'dl-7-3',
      3,
      'Scaling Laws and the Chinchilla Compute-Optimal Insight',
      'Power-law scaling from first principles: the FLOP budget C = 6ND, Kaplan versus Chinchilla, and the arithmetic that tells you — before spending a crore of compute — whether your next run should buy parameters or tokens.',
      23,
      nineBlocks({
        objectives: [
          'State the power-law form of scaling laws and the 6ND training-FLOP rule, with each symbol defined',
          'Derive the compute-optimal allocation N = sqrt(C/120) under Chinchilla\'s 20 tokens-per-parameter and compute it for a budget',
          'Compare a large-undertrained and a smaller-fully-trained run at equal compute and predict the winner',
          'Use a smooth loss curve as a training diagnostic and name the limits of extrapolating power laws',
        ],
        hook:
          'In 2020 OpenAI fit a line to loss and published a law: give us 10x compute and we can tell you, before training, roughly what loss you will get. In 2022 DeepMind tested the obvious question the law raised — "given our compute, how should we SPLIT it between model size and training data?" — and the field\'s default answer turned out to be wrong by an order of magnitude: GPT-3-class recipes starved 175B parameters on 300B tokens, while a 70B model fed 1.4T tokens beat bigger models at the same compute. That correction — the Chinchilla insight — changed how every lab budgets a run. This lesson does the arithmetic so you can do it before your next cluster bill.',
        concept: `**The empirical law.** Validation loss falls as a power law in three quantities — model parameters N, training tokens D, and compute C — over many orders of magnitude: L(N, D) = L_inf + A N^-alpha + B D^-beta (the functional form from Kaplan et al. 2020, with alpha ≈ 0.076 in their fits; the exact exponents are dataset-dependent — what matters is SMOOTHNESS and the absence of cliffs). Loss curves on log-log paper are nearly straight lines: predict the endpoint of a 3-month run from a 3-day run, spot bugs early (a loss far above the fitted line = broken pipeline; below = contamination), and choose budgets with numbers instead of vibes. Two constraints sit on top: TRAINING FLOPS C ≈ 6 N D (Module 5.4: forward 2ND + backward 4ND — the standard rule) and DATA AVAILABILITY (unique tokens after dedup — lesson 7.1 — puts a ceiling on D, which is exactly why dedup and data quality became strategic).

**Kaplan vs Chinchilla — the split question.** Kaplan et al. (2020): at fixed compute, loss is minimized by making the model BIGGER and training it SHORTER (their optimal allocation grows N aggressively with C — later re-read as an artifact of their setup: short runs, no LR retuning per size, tokenizer effects). Chinchilla (Hoffmann et al., 2022): over 400+ runs sweeping N and D independently at many compute levels, loss at fixed C is minimized by scaling N AND D TOGETHER at roughly 20 tokens per parameter (in their studied range). The decisive experiment: Chinchilla-70B trained on 1.4T tokens beat Gopher-280B trained on 0.3T tokens — 4x the parameters, less than a quarter of the data — at equal compute. Translation: GPT-3 (175B, 300B tokens = 1.7 tokens/param) was roughly an order of magnitude underfed.

**The allocation arithmetic (memorize this).** Given budget C: D = 20N and C = 6ND -> C = 120 N^2 -> N* = sqrt(C/120), D* = 20 N*. Sanity: C = 6e23 FLOPs -> N* = sqrt(5e21) ≈ 7.07e10 ≈ 71B, D* ≈ 1.41e12 — Chinchilla\'s actual 70B/1.4T run, by construction. Contrast at the same 6e23: a 175B model can only be trained on D = C/6N = 6e23/1.05e12 ≈ 571B tokens (3.3 tokens/param, still heavily underfed) — the compute-optimal 71B gets more than twice the tokens and, per Chinchilla\'s sweeps, ends with LOWER loss. Corollaries: (1) the era\'s hunger for data follows directly — optimal D scales linearly with N, and web text is finite, hence dedup discipline and synthetic/expanded data research; (2) Chinchilla is compute-optimal, NOT inference-optimal: serving cost scales with N, so labs now OVERTRAIN smaller models (Llama-class runs at 10-16+ tokens/param and the 2024+ "inference-optimal" literature argue D/N > 20 when weights are amortized across many tokens of use); (3) ratios are range-dependent — treat 20 as the order-of-magnitude anchor, not a universal constant.

**Using scaling laws like an engineer.** Fit the curve on YOUR pipeline at small scale, then: predict final loss for a proposed (N, D, C); detect pipeline bugs when a run tracks above the fitted line early; compare candidate allocations before committing. Limits to state honestly: extrapolation breaks at the edges (new architectures, data regimes, RLHF stages that do not obey pretraining laws), loss improvements translate to task gains NONLINEARLY (small average-loss drops can be large benchmark jumps — and vice versa), and emergent-ability claims at scale remain contested rather than law.`,
        extras: [
          table(
            'Kaplan (2020) vs Chinchilla (2022)',
            ['Question', 'Kaplan', 'Chinchilla'],
            [
              ['Sweep design', 'N and D coupled (fixed token budget per size)', 'N and D swept independently across 400+ runs'],
              ['At fixed compute, scale first', 'Parameters (bigger, shorter)', 'Tokens and parameters together (~20 tok/param)'],
              ['Headline implication', 'Bigger models are more compute-efficient', 'Data-hungry: 175B/300B was badly undertrained'],
              ['Modern status', 'Correct on smooth power-law loss; allocation superseded', 'Compute-optimal standard; later work pushes D/N higher for inference cost'],
            ],
          ),
          code(
            `import math

def training_flops(P, tokens):          # the 6ND rule (fwd 2ND + bwd 4ND)
    return 6 * P * tokens

def chinchilla_alloc(C):                # D = 20N, C = 6ND  =>  C = 120 N^2
    N = math.sqrt(C / 120)
    return N, 20 * N

def alloc_at_fixed_N(C, N):             # spend ALL compute on tokens for this N
    return C / (6 * N)

C = 6e23
N_opt, D_opt = chinchilla_alloc(C)
print(f"compute-optimal: {N_opt/1e9:.1f}B params, {D_opt/1e12:.2f}T tokens")
# -> 71.0B params, 1.42T tokens  (Chinchilla's actual run)

N_big = 175e9
D_big = alloc_at_fixed_N(C, N_big)
print(f"175B at same C: {D_big/1e9:.0f}B tokens -> {D_big/N_big:.1f} tok/param")

# small-scale curve fit: L = Linf + A * N^-alpha (fix Linf, linear least squares in N^-alpha)
# fit on your own 3 pilot runs, then extrapolate — with the caveats from the lesson
def predicted_loss(N, D, A=406.4, alpha=0.34, B=410.7, beta=0.28, Linf=1.69, n0=8.8e13, d0=5.4e13):
    # placeholder coefficients in the Chinchilla functional form (illustrative)
    return Linf + A * (N / n0) ** (-alpha) + B * (D / d0) ** (-beta)`,
            'scaling_laws.py',
            'python',
          ),
          tip(
            'Fit your own line at pilot scale',
            'Published coefficients belong to someone else\'s data mixture and tokenizer. Train 3-5 small pilots across (N, D), fit L = L_inf + A N^-alpha + B D^-beta, and extrapolate YOUR curve — it doubles as a pipeline monitor: any run sitting above the line early is a bug or contaminated data.',
          ),
          warn(
            'Compute-optimal is not deployment-optimal',
            'Chinchilla minimizes TRAINING loss per FLOP. If your model will serve billions of tokens, weight cost is amortized and overtraining a smaller model (D/N well above 20) wins on total cost — which is why production recipes in 2024+ deliberately "under-optimize" training for inference economics.',
          ),
        ],
        worked: {
          title: 'Allocate a compute budget three ways',
          problem:
            'You have C = 6e23 FLOPs. (a) Compute-optimal (Chinchilla) N and D. (b) Option B: train 175B tokens with ALL compute on tokens — D and tokens/param. (c) Option C: train 40B — D and tokens/param. (d) Rank the three on expected training loss and on SERVING cost, and justify the divergence between the rankings. (e) Your pipeline has 800B unique post-dedup tokens available — what does that cap imply for N at optimal ratio, and what do labs do when they need more?',
          steps: [
            {
              title: '(a) Compute-optimal split',
              desc: 'N* = sqrt(C/120) = sqrt(6e23/120) = sqrt(5e21) = 7.07e10 ≈ 71B. D* = 20 x 71B = 1.41e12 ≈ 1.4T tokens. Check: 6 x 7.07e10 x 1.41e12 = 6.0e23 ✓. This is the Chinchilla-70B/1.4T configuration reproduced from the budget alone.',
              code_snippet: 'N* = sqrt(6e23/120) = 71B ;  D* = 1.41T',
            },
            {
              title: '(b) 175B at the same budget',
              desc: 'D = C/(6N) = 6e23/(6 x 1.75e11) = 5.71e11 ≈ 571B tokens. Tokens/param = 571/175 = 3.3 — an order below 20. Chinchilla\'s sweeps show this regime loses to (a): parameters with too little data sit high on the D^-beta term — massive capacity with under-trained features.',
              code_snippet: '175B -> 571B tokens = 3.3 tok/param (severely underfed)',
            },
            {
              title: '(c) 40B at the same budget',
              desc: 'D = 6e23/(6 x 4e10) = 2.5e12 = 2.5T tokens = 62.5 tok/param. Over the data: the N^-alpha term grows — a model too small saturates its capacity (loss floor approached). Chinchilla\'s optimum balances the two terms; both (b) and (c) sit on opposite shoulders of the U-curve.',
              code_snippet: '40B -> 2.5T tokens = 62.5 tok/param (capacity-starved)',
            },
            {
              title: '(d) Two rankings',
              desc: 'TRAINING LOSS (expected, Chinchilla sweeps): (a) 71B best, then (b) 175B and (c) 40B — with (b)/(c) order empirical but both worse than (a). SERVING COST: reverse — 40B cheapest per token (2x P FLOPs/token, smallest weights/KV), then 71B, then 175B. This divergence is the whole art of production scaling: training-optimal answers "what minimizes loss per FLOP", deployment answers "what minimizes lifetime cost per served token" — the latter amortizes training across use and pushes D/N up and N down.',
              code_snippet: 'loss: 71B > 175B > 40B   |   serve cost: 40B < 71B < 175B',
            },
            {
              title: '(e) The data ceiling',
              desc: 'At D = 800B unique tokens, optimal N = D/20 = 40B parameters. If you insist on 100B parameters you must either train sub-optimally (8 tok/param) or FIND more data: more dedup-passing sources, licensed corpora, multilingual expansion, and carefully-vetted synthetic data (with contamination controls, 7.1). This constraint — not GPU availability — is the binding one for many labs, and it is why the data pipeline of lesson 7.1 is strategic.',
              code_snippet: '800B unique / 20 = 40B optimal params',
            },
          ],
          solution:
            '(a) N* = 71B, D* = 1.41T (sqrt(C/120), 20N). (b) 175B gets 571B tokens = 3.3/param, badly underfed. (c) 40B gets 2.5T = 62.5/param, capacity-starved. (d) Expected loss ranks the compute-optimal split first; serving cost ranks smaller models first — training and deployment objectives differ, which is why real recipes overtrain smaller models. (e) 800B unique caps optimal size at 40B — data availability, not compute, binds; expand sources or accept a suboptimal ratio.',
        },
        practice: {
          title: 'Plan a run with scaling arithmetic',
          prompt:
            'Budget: 1e23 FLOPs (a realistic single-node-to-small-cluster exercise). (1) Compute the Chinchilla-optimal N and D. (2) Produce three ALTERNATIVE allocations (e.g., 10B, 100B, 300B parameters) with their D and tokens/param at the same compute. (3) Predict qualitative loss ordering and say which assumption each prediction rests on. (4) You have 400B unique post-dedup tokens — which allocations are feasible, and what is the true optimum under this hard data cap? (5) If the model will serve 500B tokens/month, sketch why you would deliberately choose a smaller, longer-trained run than (4).',
          hint: 'N* = sqrt(1e23/120) ≈ 28.9B, D* ≈ 577B. Under a 400B cap: N ≤ 20B at ratio 20 — data binds before compute. For (5), amortize training cost across served tokens: the break-even logic of inference-optimal scaling.',
        },
        mistakes: [
          {
            mistake: 'Applying Chinchilla as a universal constant',
            fix: 'The ~20 tokens/param figure is range-, mixture-, and objective-dependent; compute-optimal ratios from 2024+ work run higher, and inference-cost amortization pushes production recipes well above 20. Use it as an order-of-magnitude anchor and re-fit at your scale.',
          },
          {
            mistake: 'Counting raw crawl tokens instead of unique post-dedup tokens',
            fix: 'Scaling arithmetic assumes D real, mostly-unique tokens; duplicated data does not act like fresh tokens (7.1). Budget against unique tokens or you will train an "optimal" run that is actually starved.',
          },
          {
            mistake: 'Extrapolating power-law fits far outside the fitted range',
            fix: 'Loss curves are smooth within the trained regime; at the edges, new data mixtures, architectures, and RLHF stages break the fit. Pilot-scale fits also absorb pipeline quirks — re-anchor with a mid-scale run before committing the full budget.',
          },
          {
            mistake: 'Equating lower pretraining loss with proportionally better task performance',
            fix: 'Average-loss gains translate to benchmarks nonlinearly and unevenly — task metrics can jump or stall. Keep a small downstream eval battery running alongside every scaling pilot; loss is the cheap proxy, tasks remain the claim.',
          },
        ],
        exam: {
          question:
            '(a) State the scaling-law functional form for loss in parameters N and tokens D, and the training-compute rule C = 6ND. (b) Derive the compute-optimal allocation under Chinchilla\'s ~20 tokens per parameter as a function of C. (c) Apply it to C = 6e23 FLOPs and compare with training 175B parameters at the same compute. (d) Give one reason production systems deviate from compute-optimal.',
          answer:
            '(a) Empirically, validation loss follows smooth power laws: L(N, D) = L_inf + A N^-alpha + B D^-beta (Kaplan et al. reported loss ~ (Nc/N)^0.076 style fits), valid across orders of magnitude — enabling pre-run prediction and early pipeline-bug detection. Training compute: C ≈ 6ND FLOPs for P-parameter models — forward pass 2ND plus backward ~4ND (Module 5.4). (b) Constraint D = 20N with C = 6ND gives C = 120 N^2, hence N* = sqrt(C/120) and D* = 20 sqrt(C/120); D* = C/(6N*) is consistent by construction. (c) C = 6e23: N* = sqrt(5e21) ≈ 71B, D* ≈ 1.41T tokens (Chinchilla-70B/1.4T). A 175B model at the same C gets D = C/6N ≈ 571B tokens = 3.3 tokens/parameter — an order below optimal; Chinchilla\'s sweeps (and the 70B-beats-280B result) show the compute-optimal smaller model attains lower loss at equal FLOPs, because loss sits on a U-curve trading the N^-alpha capacity term against the D^-beta data term. (d) Deviations: compute-optimal is not inference-optimal — serving cost scales with N, so overtraining smaller models (D/N above 20) minimizes lifetime cost when inference volume amortizes training; data availability (finite unique tokens) can cap D; and lab-specific mixture/quality choices shift the fitted ratio.',
          source: 'The flagship scaling-law exam question — also the single most common "how would you budget a pretraining run" interview prompt.',
        },
        summary: [
          'Scaling laws: loss follows smooth power laws in N and D; training FLOPs C ≈ 6ND.',
          'Chinchilla: at fixed compute, scale N and D together (~20 tokens/param): N* = sqrt(C/120), D* = 20N*.',
          'C = 6e23 -> 71B params, 1.4T tokens; 175B at the same compute gets only 571B tokens (3.3/param) and loses.',
          'Compute-optimal ≠ deployment-optimal: serving cost amortization pushes production to smaller, longer-trained models.',
          'Data is the hard cap: unique post-dedup tokens / 20 bounds optimal parameter count.',
        ],
      }),
      [
        [
          'The standard training-FLOP rule of thumb for a model with P parameters trained on N tokens is:',
          ['2PN', '6PN (forward ~2PN + backward ~4PN)', 'PN log N', '6P + N'],
          1,
          'Forward is ~2PN; the backward pass (through activations and into weights) roughly triples it — 6PN is the budgeting constant used across scaling-law work.',
        ],
        [
          'Under Chinchilla-style compute-optimal scaling, a budget of C = 6e23 FLOPs should train approximately:',
          [
            '175B parameters on 300B tokens',
            '71B parameters on 1.4T tokens',
            '40B parameters on 2.5T tokens',
            '700B parameters on 60B tokens',
          ],
          1,
          'N* = sqrt(C/120) = sqrt(5e21) ≈ 71B and D* = 20N* ≈ 1.4T — reproducing Chinchilla\'s actual configuration from the budget alone.',
        ],
        [
          'GPT-3 (175B params, 300B tokens) at fixed compute compared with a compute-optimal smaller model is best described as:',
          [
            'Optimal — parameters buy everything',
            'Undertrained: ~1.7 tokens/param versus an optimal ~20 — the smaller fully-fed model reaches lower loss at the same FLOPs',
            'Overtrained',
            'Identical at equal compute by definition',
          ],
          1,
          'Loss trades a capacity term (N^-alpha) against a data term (D^-beta); starving data makes the data term dominate — Chinchilla-70B/1.4T beat Gopher-280B/0.3T at equal compute.',
        ],
        [
          'A production lab deliberately trains at 50+ tokens per parameter (above Chinchilla\'s ~20). The best justification:',
          [
            'Scaling laws forbid 20',
            'Inference cost dominates lifetime cost — overtraining a smaller model amortizes training across billions of served tokens',
            'It reduces training FLOPs',
            'Data is free',
          ],
          1,
          'Compute-optimal minimizes training loss per FLOP, not total cost of ownership; when serving volume is large, smaller-heavily-trained wins on economics — the inference-optimal deviation from Chinchilla.',
        ],
      ]
    ),
    lesson(
      M7,
      'dl-7-4',
      4,
      'Post-Training: Continued Pretraining, SFT at Scale, and RLHF/DPO',
      'The stage where a raw text predictor becomes an assistant — domain adaptation with forgetting control, supervised fine-tuning done at production quality, and the preference-optimization math (Bradley-Terry, reward models, PPO\'s KL term, DPO\'s closed form) that Part I introduced in words.',
      24,
      nineBlocks({
        objectives: [
          'Design a continued-pretraining mixture that adapts to a domain without catastrophic forgetting',
          'Specify an SFT recipe: chat formatting, loss masking, data quality, epochs, and packing — with rationale for each',
          'Compute a Bradley-Terry reward-model loss and a DPO loss from given numbers, and explain beta\'s role',
          'State the RLHF objective including its KL penalty, why it exists, and how DPO relates to it',
        ],
        hook:
          'A pretrained model is a remarkable next-token machine that will happily continue your prompt rather than answer it. Turning it into an assistant takes three deliberate stages: teach it the domain (continued pretraining), teach it the FORMAT and standards of helpful responses (SFT), then tune it toward human preference rather than mere likelihood (RLHF or DPO). Part I of this course described those stages in words; this lesson hands you the objectives — with the two or three lines of algebra that show why DPO is not a different idea but the same idea with the reward model substituted away.',
        concept: `**Stage 0.5 — continued pretraining (domain adaptation).** Base model + further pretraining on a domain corpus (medical, legal, finance, codebases, internal docs). Mechanically identical to pretraining, at low LR for a short schedule. The disease: CATASTROPHIC FORGETTING — narrow-domain training drags weights away from general capability (general benchmark scores slip even as domain loss improves). The standard cure, all from the forgetting/variance playbook: MIX in general data (70% general / 30% domain is a typical starting point — replay preserves the old distribution), keep LR small and schedule short, monitor a general eval battery alongside domain loss, and consider adapter-style training (train the delta, keep base frozen) when risk tolerance is low. Decision point: if the knowledge is PUBLIC and STATIC, retrieval (RAG) may beat continued pretraining; fine-tuning wins for style, format, procedure, and knowledge that must be PARAMETRIC and always-on.

**SFT at scale — quality is the axis, not quantity.** The task: train the model to FOLLOW instructions and emit well-formed assistant turns in your chat format. Recipe, each element with a reason: (1) CHAT TEMPLATE is part of the model — special tokens delimiting system/user/assistant turns (and which model ROLE contributes loss) must match at training and inference; (2) LOSS MASKING — compute loss ONLY on assistant tokens: training the model to predict the user\'s own words wastes gradient and teaches it to impersonate users. Numbers: a 512-token sample with 400 user tokens and 112 assistant tokens trains 78% on the wrong target if unmasked (400/512 = 0.78); (3) QUALITY OVER QUANTITY — the LIMA result (1,000 carefully curated examples matching or beating 50k+ scraped ones) is the anchor datum; diversity of task types and style matters more than raw count; distillation from a strong teacher\'s outputs is common; (4) EPOCHS: 1-3 — SFT overfits fast (format collapse, style degradation on repeated epochs); (5) PACKING: concatenate samples to fill sequences with EOS boundaries, no wasted padding; (6) EVAL: held-out format-following, refusal behavior, and general benchmarks for regression. SFT is where most "our fine-tune got worse" bugs live — template mismatch and over-epoch are the top two.

**RLHF — the full loop.** (1) PREFERENCE DATA: pairs of responses (y_w preferred over y_l) for the same prompt, labeled by humans; quality of labels beats quantity — noisy preferences train a noisy reward. (2) REWARD MODEL: fit a Bradley-Terry scorer r(x, y) so P(y_w beats y_l) = sigmoid(r(x,y_w) - r(x,y_l)); training loss = -log sigmoid(r_w - r_l). Worked below: it is a logistic regression on score differences. (3) OPTIMIZATION: PPO maximizes E[r(x, y)] under a KL constraint to the reference policy: objective = E[r] - beta * KL(pi || pi_ref). The KL term is the whole safety mechanism: without it, the policy exploits the reward model (reward hacking — degenerate high-reward text the RM likes and humans do not), drifting ever further from the SFT model. (4) Iterate: RM retraining, best-of-n sampling, DPO-style refreshes.

**DPO — the closed form that removed the RM from the loop.** Theoretical bridge: if the reward-optimal policy under a Bradley-Terry RM is substituted back into the KL-regularized RL objective, the reward model cancels and the optimum has the closed form r(x,y) = beta * log[ pi(y|x) / pi_ref(y|x) ] + const. So instead of (RM + PPO), optimize the POLICY DIRECTLY on preferences:

L_DPO = -log sigmoid( beta * [ log pi(y_w|x)/pi_ref(y_w|x) - log pi(y_l|x)/pi_ref(y_l|x) ] )

One line of PyTorch (below). The implicit reward IS the log-ratio to the reference: training pushes chosen responses UP relative to reference and rejected DOWN, weighted by sigmoid confidence. beta = KL strength in disguise: small beta permits large drift from reference (risk: degeneration), large beta stays conservative (risk: weak preference learning). Data needs: clean pairs, response-only differences, same prompt; common failure: preference data that encodes LENGTH bias (annotators prefer longer answers — the model learns verbosity; audit pair-length statistics). Adjacent family: ORPO/KTO/SFT-with-preference variants — different algebra, same goal: optimize preference signal without full PPO machinery.

**Curriculum and order effects — what is actually known.** Order is a hyperparameter with modest, repeatable effects: (1) STAGE ORDER is strict: pretraining -> continued pretraining -> SFT -> preference tuning. Reversing (preference before SFT) fails — preference methods need a competent, format-trained starting policy and a reference model; (2) WITHIN pretraining, mixing/annealing matters: many labs shift data mixtures LATE in training (more code/math/quality in the final fraction — "annealing"), and repo-ordered curricula (file-tree order for code) help structured skills; (3) SFT before DPO is standard because DPO assumes the format baseline; (4) claims that curriculum alone transforms capability are partly folklore — mixture quality and stage integrity dominate exotic orderings. Exam takeaway: know the stage order and its rationale cold, be skeptical of strong curriculum claims beyond it.`,
        extras: [
          table(
            'The post-training stack',
            ['Stage', 'Objective', 'Data', 'Key hyperparams', 'Main failure'],
            [
              ['Continued pretraining', 'Next-token loss on domain corpus', 'Domain text mixed with general replay', 'Low LR, short schedule, mixture ratio', 'Catastrophic forgetting of general skills'],
              ['SFT', 'Cross-entropy on ASSISTANT tokens only', 'Curated instruction/response pairs (quality > count)', '1-3 epochs, chat template, packing', 'Template mismatch; overfitting/style collapse'],
              ['RLHF (PPO)', 'E[reward] - beta*KL(pi||pi_ref)', 'Preference pairs -> reward model', 'beta, reward normalization, PPO epochs', 'Reward hacking without the KL term'],
              ['DPO (and kin)', '-log sigmoid(beta * margin of log-ratios)', 'Preference pairs directly', 'beta (drift strength), data cleanliness', 'Length-biased pairs; poor reference model'],
            ],
          ),
          code(
            `import torch
import torch.nn.functional as F

# ---- Bradley-Terry reward-model loss on a preference pair ----
def rm_loss(r_w, r_l):                       # r_*: model scores for winner/loser
    return -F.logsigmoid(r_w - r_l)          # -log sigmoid(r_w - r_l)

# ---- DPO: no reward model, no PPO — preferences on the policy directly ----
def dpo_loss(logp_w, logp_ref_w, logp_l, logp_ref_l, beta=0.1):
    """logp_*: sequence log-probs from policy and frozen reference."""
    margin = (logp_w - logp_ref_w) - (logp_l - logp_ref_l)   # implicit-reward gap
    return -F.logsigmoid(beta * margin)

# usage in a training step (sequences already formatted and masked):
# with torch.no_grad():
#     ref_w = reference(input_ids_w).logits.gather(...).sum(-1)     # reference pass
# pi_w = policy(input_ids_w).logits...sequence logprob
# loss = dpo_loss(pi_w, ref_w, pi_l, ref_l, beta=0.1)
# loss.backward(); optimizer.step()

# ---- SFT loss masking: only assistant tokens contribute ----
def masked_sft(logits, labels, ignore_index=-100):
    # labels: full sequence, but user/system positions set to ignore_index
    return F.cross_entropy(logits[..., :-1, :].reshape(-1, logits.size(-1)),
                           labels[..., 1:].reshape(-1),
                           ignore_index=ignore_index)

# ---- Continued-pretraining mixture: replay fights forgetting ----
# mixture = 0.70 * general + 0.30 * domain   (sample tokens accordingly)`,
            'post_training.py',
            'python',
          ),
          tip(
            'Audit preference pairs for length and style bias before training',
            'If chosen responses are systematically longer, DPO learns verbosity, not quality — plot response-length distributions for chosen vs rejected and re-balance or annotate guidelines. This one chart prevents a whole class of "the model got wordy" regressions.',
          ),
          warn(
            'SFT template mismatch is the most common silent fine-tune bug',
            'Train with one chat template and serve with another (or forget role-based loss masking) and the model still runs — it just answers worse: rambling, wrong turn-taking, poor refusal. Pin the template to the tokenizer config, verify round-trip serialization on sample chats, and assert it in CI.',
          ),
        ],
        worked: {
          title: 'Compute RM, DPO, SFT-masking, and mixture numbers',
          problem:
            '(a) Reward model scores a preference pair: r(y_w) = 2.1, r(y_l) = 0.4 — Bradley-Terry probability and training loss. (b) DPO step: policy/reference log-ratios for chosen = -0.2 and rejected = +0.5, beta = 0.1 — compute the margin, sigmoid, and loss; then state the gradient direction and what a DECREASED loss means. (c) SFT batch: sequences of 512 tokens with 400 user + 112 assistant tokens — gradient wasted without masking, in percent. (d) Continued pretraining mixture: target 30% domain at 4k tokens/batch — how many domain tokens per batch, and what ratio do you sample raw streams at? (e) PPO objective with beta = 0.05: a policy step raises reward by 0.4 but KL to reference grows by 0.05 nats — net objective change?',
          steps: [
            {
              title: '(a) Bradley-Terry probability and loss',
              desc: 'P(w beats l) = sigmoid(2.1 - 0.4) = sigmoid(1.7) = e^1.7/(1 + e^1.7) = 5.474/6.474 = 0.846. Loss = -ln(0.846) = 0.168. The RM thinks this pair is separated well but not perfectly (0.846, not 0.99) — training continues to widen r_w - r_l. Note: it is logistic regression on the SCORE DIFFERENCE; only differences matter.',
              code_snippet: 'sigmoid(1.7) = 0.846  ->  RM loss = 0.168',
            },
            {
              title: '(b) DPO arithmetic',
              desc: 'margin = (-0.2) - (+0.5) = -0.7. beta * margin = -0.07. sigmoid(-0.07) = 1/(1 + e^0.07) = 1/1.0725 = 0.9324/2.0725... precisely: e^-0.07 = 0.9324; sigmoid = 0.9324/1.9324 = 0.4825. Loss = -ln(0.4825) = 0.729. Gradient pushes the CHOSEN log-ratio UP (chosen is currently BELOW reference — ratio < 0 means policy assigns chosen response less probability than the reference did) and the rejected ratio DOWN. A decreasing loss means: policy increasingly favors chosen over rejected RELATIVE TO THE FROZEN REFERENCE — the implicit reward r̂ = beta*log(pi/pi_ref) widens.',
              code_snippet: 'margin -0.7;  beta*margin = -0.07;  loss = -ln(0.4825) = 0.729',
            },
            {
              title: '(c) Loss masking arithmetic',
              desc: 'Unmasked training computes cross-entropy over ALL 512 positions: 400/512 = 78.1% of gradient flows toward predicting the USER\'S tokens — content the model will never be asked to produce at inference (it generates assistant turns). Masked: loss over the 112 assistant positions only (plus EOS) — 100% of gradient on the behavior you will deploy. This is why masking is not an optimization but a correctness requirement.',
              code_snippet: '400 / 512 = 78% of gradient wasted (unmasked)',
            },
            {
              title: '(d) Mixture sampling',
              desc: '30% of 4,096 = 1,229 domain tokens per batch. Sampling from two streams at ratio 0.7 : 0.3 (general : domain) produces exactly this on average — document the ratio in the run config, and keep a GENERAL loss curve visible: if general loss rises while domain loss falls, raise the replay share (the forgetting symptom, measured).',
              code_snippet: '0.30 x 4096 = 1,229 domain tokens/batch (mix 0.7 / 0.3)',
            },
            {
              title: '(e) PPO objective net change',
              desc: 'objective = E[r] - beta*KL = 0.4 - 0.05 x 0.05 = 0.4 - 0.0025 = +0.3975 — the step is strongly net-positive: reward gains dominate the small drift penalty. If KL had grown by 2.0 nats: 0.4 - 0.05 x 2.0 = +0.3 (still positive). At beta = 0.5 with KL 2.0: 0.4 - 1.0 = -0.6 — negative: the KL term REJECTS reward gains bought by leaving the reference distribution. beta tunes exactly this exchange rate.',
              code_snippet: '0.4 - 0.05 x 0.05 = +0.3975  (KL term barely bites)',
            },
          ],
          solution:
            '(a) sigmoid(1.7) = 0.846, RM loss = 0.168. (b) margin -0.7, scaled -0.07, DPO loss 0.729; descent raises chosen log-ratio and lowers rejected — falling loss = growing implicit reward gap versus the frozen reference. (c) 78% of unmasked gradient predicts user text — masking is correctness, not speed. (d) 1,229 domain tokens per batch at 0.7/0.3 sampling; watch general loss for forgetting. (e) +0.3975 net: reward gain minus beta-scaled drift — beta is the exchange rate between preference and staying near the reference.',
        },
        practice: {
          title: 'Run a miniature post-training stack',
          prompt:
            'On a small open model (sub-1B): (1) continued pretraining on a domain corpus at 0.7/0.3 general-domain mixture with low LR — plot general and domain loss; deliberately run a domain-ONLY variant and document forgetting on a general held-out set; (2) SFT 1-2 epochs on a curated instruction set with EXACT chat-template serialization and assistant-only loss masking — verify by asserting which positions carry labels on one sample; (3) implement DPO from the lesson\'s formula over ~1k preference pairs and track chosen/rejected log-ratios plus response-length bias; (4) report: template checks passed, loss curves, ratio drift, and one regression you caught.',
          hint: 'The domain-only forgetting run is the point of step (1). For (3), log the margin distribution: if it saturates near zero, inspect pair quality and beta before touching the optimizer.',
        },
        mistakes: [
          {
            mistake: 'Continued pretraining on domain data alone',
            fix: 'No replay, no anchor: general capability decays while domain loss falls — looks like success until you run a general eval. Mix general data (~70/30), keep LR low, and monitor both curves from step one.',
          },
          {
            mistake: 'Training SFT on all tokens instead of assistant-only',
            fix: 'Most positions are user/prompt text: gradient is spent predicting inputs (78% in the worked numbers). Set user/system positions to ignore_index in labels; assert the mask on a sample.',
          },
          {
            mistake: 'Running RLHF without the KL-to-reference term',
            fix: 'An unconstrained reward optimizer exploits reward-model quirks (reward hacking) and degrades off-distribution. beta * KL(pi||pi_ref) is the brake; DPO bakes the same brake into its objective through log-ratios to a frozen reference.',
          },
          {
            mistake: 'Skipping preference-data audits (length, style, source)',
            fix: 'DPO amplifies whatever annotators encoded: length bias becomes verbosity, source artifacts become tics. Plot chosen/rejected length distributions, dedup prompts, and re-label noisy pairs — data fixes beat optimizer fixes at this stage.',
          },
        ],
        exam: {
          question:
            'Outline the post-training pipeline: continued pretraining, SFT, RLHF and DPO. Give the Bradley-Terry reward-model loss, the PPO objective including its KL term and purpose, and the DPO objective — explaining how DPO relates to RLHF and the role of beta.',
          answer:
            'Continued pretraining: low-LR next-token training on a domain corpus with general-data replay (~70/30) to prevent catastrophic forgetting, monitored on both domain and general evals. SFT: supervised training on curated instruction/response pairs in the EXACT chat template, with loss computed only on ASSISTANT tokens (unmasked training wastes most gradient on user text and teaches impersonation), 1-3 epochs (SFT overfits fast), quality over quantity (LIMA: 1k curated examples competitive with 50k scraped). RLHF: collect preference pairs; train a Bradley-Terry reward model with loss -log sigmoid(r(x,y_w) - r(x,y_l)); optimize the policy with PPO on E[r(x,y)] - beta * KL(pi || pi_ref), where the KL penalty to the frozen SFT reference prevents reward hacking (degenerate outputs that exploit the RM) and keeps generations in-distribution; beta sets the reward-versus-drift exchange rate. DPO: substituting the reward-optimal relation r = beta*log(pi/pi_ref) + const into the RL objective lets preferences train the policy directly: L = -log sigmoid(beta * [log pi(y_w|x)/pi_ref(y_w|x) - log pi(y_l|x)/pi_ref(y_l|x)]) — the reward model and PPO loop disappear, the KL strength survives as beta, and the implicit reward is the reference-relative log-ratio. Relationship: same preference signal and same regularization philosophy, minus the separate RM and the unstable RL loop; tradeoffs are simpler training and fewer knobs versus dependence on a good reference model and sensitivity to pair biases (e.g., length).',
          source: 'The defining post-training question for advanced exams and alignment-adjacent ML interviews; deriving the DPO-from-RLHF bridge earns full marks.',
        },
        summary: [
          'Continued pretraining needs replay (~70/30) + low LR, or general capability silently decays.',
          'SFT: exact chat template, assistant-only loss masking (unmasked = ~78% wasted gradient), 1-3 epochs, quality over quantity.',
          'RLHF: Bradley-Terry RM (-log sigmoid of score gap) + PPO on E[r] - beta*KL(pi||pi_ref); the KL term blocks reward hacking.',
          'DPO collapses the loop: -log sigmoid(beta * preference margin of reference-relative log-ratios); beta = hidden KL strength.',
          'Stage order is strict (pretrain -> adapt -> SFT -> preference); audit preference data for length/style bias.',
        ],
      }),
      [
        [
          'In SFT, loss is normally computed only on:',
          [
            'All tokens equally',
            'Assistant-response tokens (user/system positions are masked to ignore_index)',
            'User tokens only',
            'The first 128 tokens of each sequence',
          ],
          1,
          'Training to predict the user\'s own text wastes most of the gradient and teaches impersonation; assistant-only masking puts 100% of the objective on what the model must generate.',
        ],
        [
          'The KL term beta*KL(pi||pi_ref) in the RLHF objective exists primarily to:',
          [
            'Speed up convergence',
            'Anchor the policy to the reference model so reward gains cannot be bought by degenerate reward-hacking drift',
            'Normalize the reward model',
            'Increase exploration',
          ],
          1,
          'Without the anchor, the optimizer exploits reward-model quirks — outputs the RM scores high but humans would not. beta sets the exchange rate between reward and drift.',
        ],
        [
          'The DPO loss for a preference pair is computed from:',
          [
            'A separately trained reward model plus PPO rollouts',
            'The policy\'s and frozen reference\'s sequence log-probs: -log sigmoid(beta*[(log pi_w - log ref_w) - (log pi_l - log ref_l)])',
            'Cross-entropy on the chosen response only',
            'A Bradley-Terry classifier over tokens',
          ],
          1,
          'DPO replaces (RM + PPO) with a closed-form objective on reference-relative log-ratios; beta plays the KL-strength role the RL formulation had explicitly.',
        ],
        [
          'Continued pretraining on a narrow domain corpus while general benchmark scores drop indicates:',
          [
            'Successful specialization',
            'Catastrophic forgetting — fix by mixing general replay data, lowering LR, and shortening the schedule',
            'Insufficient batch size',
            'A tokenizer bug',
          ],
          1,
          'Narrow distributions pull weights off the general solution; replay (e.g., 70% general / 30% domain) and low LR preserve general capability while domain loss falls — monitor both curves.',
        ],
      ]
    ),
  ],
};
