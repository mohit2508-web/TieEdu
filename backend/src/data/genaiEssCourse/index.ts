// Generative AI Essentials — course index.
//
// The deep companion to any basics GenAI course: forty lessons across ten
// modules, from the generative landscape down into LLM mechanics and out to
// the decisions engineers actually make — model selection, reliability, cost,
// applied pipelines, safety and compliance — closed by a capstone spec.
// Ends in a 30-question exam bank (12 easy / 12 medium / 6 hard, tagged by
// module topic, covering all forty lessons) and the production-spec project.
import type { Course, CourseModule, ExamQuestion } from '../db';
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

const modules: CourseModule[] = [
  module1,
  module2,
  module3,
  module4,
  module5,
  module6,
  module7,
  module8,
  module9,
  module10,
];

// A 30-question bank, mixed difficulty, tagged by module topic so the exam
// engine can draw a balanced paper per attempt. Three questions per module:
// the first two probe lessons 1 and 2 singly, the third is integrative across
// lessons 3 and 4 — so all forty lessons are covered by thirty questions.
// Answer keys never leave the server pre-submission — sanitizeExamQuestions
// strips them on the public payload.
const examBank: ExamQuestion[] = [
  // The generative landscape (Module 1)
  {
    id: 'gae-bank-01',
    prompt: 'Which statement correctly distinguishes a discriminative model from a generative model?',
    options: [
      'A discriminative model estimates how the data itself is distributed; a generative model learns the boundary between classes',
      'A discriminative model learns the decision boundary between classes; a generative model learns the distribution of the data itself',
      'Both estimate the same probability, differing only in model size',
      'Generative models produce only images; discriminative models produce only labels',
    ],
    correct_index: 1,
    explanation:
      'Lesson 1.1: discriminative models estimate P(y|x) — where the decision boundary between classes sits — while generative models learn P(x) (or the joint), the shape of the data itself. Modern LLMs blur the line: a next-token generator can be steered into classification, and a classifier can be re-cast as a scorer inside a generative loop. The distinction is about what the objective learns, not what the product outputs.',
    difficulty: 'easy',
    topic: 'generative-landscape',
  },
  {
    id: 'gae-bank-02',
    prompt:
      "A GAN's generator keeps emitting the same few 'safe' images that reliably fool the discriminator, regardless of the noise sampled. This failure is called:",
    options: [
      'Mode collapse — the characteristic GAN failure',
      'Blurry reconstruction — the VAE failure',
      'Slow sampling — the diffusion cost',
      'Overfitting — memorising the training set',
    ],
    correct_index: 0,
    explanation:
      'Lesson 1.2: in the GAN game, if the discriminator only punishes one region of image space, the generator can converge to a single mode that always scores well — mode collapse. VAEs blur because the bottleneck plus pixel-wise losses average detail away; diffusion replaced both by training to predict added noise and sampling by iteratively denoising, which is stable to train and high-quality.',
    difficulty: 'easy',
    topic: 'generative-landscape',
  },
  {
    id: 'gae-bank-03',
    prompt:
      'Which pairing of transformer variant, typical use, and foundation-model claim is correct?',
    options: [
      'Encoder-only for generation, decoder-only for understanding, and any foundation model is automatically multimodal',
      'All variants are interchangeable; the difference is only parameter count',
      'Encoder-only for understanding/classification, decoder-only for generation, and a foundation model is trained broadly once, then adapted downstream — multimodal claims must be checked against actual inputs and outputs',
      'A foundation model must be fine-tuned before any zero-shot use',
    ],
    correct_index: 2,
    explanation:
      'Lesson 1.3: encoder-only (bidirectional attention) suits understanding tasks like classification; decoder-only (causal attention) powers most chat LLMs; encoder-decoder bridges both for seq2seq tasks. Lesson 1.4: a foundation model is pretrained broadly for general behaviour and adapted to many downstream tasks — zero-shot included. Multimodal is a claim about the actual input and output channels (text-only input with image output is not omni), so audit the product, not the marketing.',
    difficulty: 'medium',
    topic: 'generative-landscape',
  },

  // LLM mechanics, deeper (Module 2)
  {
    id: 'gae-bank-04',
    prompt: 'Why does the same sentence often produce different token counts on two providers?',
    options: [
      'Each provider trains its own BPE vocabulary and merge table, so the token boundaries differ',
      'One provider counts characters, the other counts words',
      'Tokens are always priced per word, so the count is cosmetic',
      'One provider truncates the sentence before counting',
    ],
    correct_index: 0,
    explanation:
      'Lesson 2.1: BPE starts from characters, counts adjacent pairs, and merges the most frequent repeatedly until a target vocabulary size. Because each provider trains merges on its own corpus at its own scale, boundaries differ — especially for rare words, code and non-English scripts. That drives real cost and context-limit differences, not just cosmetic counting.',
    difficulty: 'easy',
    topic: 'llm-mechanics',
  },
  {
    id: 'gae-bank-05',
    prompt: 'Two sentence embeddings have cosine similarity 0.92. The honest interpretation is:',
    options: [
      'The sentences are 92% identical in meaning',
      'The model is 92% confident they are duplicates',
      'Their vectors point in nearly the same direction under the chosen metric — useful for retrieval only with a threshold validated on your domain',
      'The sentences came from the same document',
    ],
    correct_index: 2,
    explanation:
      'Lesson 2.2: cosine similarity measures the angle between vectors, not probability or identity. 0.92 means geometrically close under that model’s space — but domain mismatch, uncalibrated thresholds and corpus-inherited bias are the classic failures. Validate the threshold on a labelled sample from your domain before wiring it into a pipeline.',
    difficulty: 'easy',
    topic: 'llm-mechanics',
  },
  {
    id: 'gae-bank-06',
    prompt: 'Which statement about decoding and serving controls is correct?',
    options: [
      'Lowering temperature sharpens the distribution toward higher-probability tokens; a stop sequence cuts generation when its literal text appears; streaming improves perceived latency (time-to-first-token) but not total generation time',
      'Temperature scales the context window, so a lower value fits more tokens',
      'top_p = 1.0 removes low-probability tokens from the candidate set',
      'Streaming reduces the number of tokens billed',
    ],
    correct_index: 0,
    explanation:
      'Lesson 2.3: temperature rescales logits before softmax — lower = sharper, more deterministic; top-k/top-p prune the candidate set then renormalise. Lesson 2.4: stop sequences terminate generation when a literal appears (classic failures: the sequence appearing inside content, or never appearing so generation runs long); streaming yields tokens as the KV cache fills, so time-to-first-token drops while total generation time does not.',
    difficulty: 'medium',
    topic: 'llm-mechanics',
  },

  // Model families and selection (Module 3)
  {
    id: 'gae-bank-07',
    prompt: "'Open weights' means:",
    options: [
      'The trained parameters are published for download and self-hosting — licence terms may still restrict commercial use, and the training data or code need not be open',
      'The training data, code and weights are all public',
      'The model is free for commercial use without restriction',
      'The model runs only in the browser',
    ],
    correct_index: 0,
    explanation:
      'Lesson 3.1: open-weight releases publish the parameters you can download and run, but the licence can still carve out restrictions (community licences with user caps, non-commercial clauses, acceptable-use terms), and you often get neither the training data nor the full training code. Fully open-source releases are a stricter, rarer subset. Read the actual licence text — the label alone tells you nothing enforceable.',
    difficulty: 'easy',
    topic: 'model-selection',
  },
  {
    id: 'gae-bank-08',
    prompt: 'Which workload is the strongest case for a small (7B-class) fine-tuned model over a frontier API?',
    options: [
      'A high-volume, narrow, stable classification or extraction task with a fixed schema and clear labels',
      'Open-ended legal reasoning across jurisdictions',
      'A one-off creative campaign with shifting briefs',
      'Multilingual voice translation with long, unpredictable context',
    ],
    correct_index: 0,
    explanation:
      'Lesson 3.2: small models win when the task is narrow and stable (labels do not drift), volume is high (cost scales linearly with tokens, so per-call price dominates), latency or privacy/offline constraints bite, and a clean labelled set exists to fine-tune. Open-ended or shifting work keeps the frontier model’s advantage; route with a cascade when only some traffic is narrow.',
    difficulty: 'medium',
    topic: 'model-selection',
  },
  {
    id: 'gae-bank-09',
    prompt:
      'You must answer questions over a 400k-token document set with a model offering a 1M-token window. The most defensible first move:',
    options: [
      'Full-dump everything — the window fits it',
      'Buy the largest model regardless of price',
      'Fine-tune the model on the documents',
      'Estimate fit and cost, remember lost-in-the-middle and prefill cost that grows with sequence length, and compare a top-k retrieval design against full-dump on your own golden set before choosing',
    ],
    correct_index: 3,
    explanation:
      'Lesson 3.3: capacity is not comprehension — attention quality degrades in the middle of very long contexts (lost-in-the-middle), and prefill cost grows with length even if the window "fits". Lesson 3.4: turn the choice into arithmetic — hard filters (window, compliance), then a weighted rubric scored on your own golden set, with a sensitivity check on the weights. Benchmark hype is not your metric.',
    difficulty: 'medium',
    topic: 'model-selection',
  },

  // Image, audio and video generation (Module 4)
  {
    id: 'gae-bank-10',
    prompt: 'During diffusion sampling the denoiser predicts:',
    options: [
      'The noise that was added to the (latent) image at that step',
      'The final caption text',
      'A reward score for realism',
      'The next video frame’s audio',
    ],
    correct_index: 0,
    explanation:
      'Lesson 4.1: training adds known noise to images and teaches the network to predict that noise; sampling starts from pure noise and iteratively subtracts the predicted noise. More steps trade time for quality; guidance scale extrapolates between the conditional (prompted) and unconditional predictions — higher guidance pushes harder toward the prompt at some cost to diversity.',
    difficulty: 'easy',
    topic: 'multimodal-generation',
  },
  {
    id: 'gae-bank-11',
    prompt: 'In image prompting, the negative-prompt channel is for:',
    options: [
      'Specifying content to steer away from, complementing the positive prompt',
      'Replying to the model in natural language',
      'Listing file paths of reference images',
      'Disabling the safety filter',
    ],
    correct_index: 0,
    explanation:
      'Lesson 4.2: image prompts decompose into subject, style, composition, lighting and format levers; the negative channel names what NOT to include (e.g. blurry, extra fingers, watermark). Dialects differ across tools (natural language, flag-based, negative box), so map the same intent to each — and iterate one variable at a time so you learn what each change did.',
    difficulty: 'easy',
    topic: 'multimodal-generation',
  },
  {
    id: 'gae-bank-12',
    prompt: 'Which pipeline statement is correct?',
    options: [
      'ASR converts speech to text and TTS converts text to speech; voice cloning needs consent as a technical control; video cost scales with frame count and duration; perception models returning boxes or JSON need a structured output contract',
      'ASR is text-to-audio and TTS is audio-to-text',
      'Video is cheap because each frame is small',
      'Structured output contracts only matter for pure-text tasks',
    ],
    correct_index: 0,
    explanation:
      'Lesson 4.3: ASR (speech to text) and TTS (text to speech) are two distinct stacks; cloning requires consent enforced as a technical control (verification plus provenance), not just a policy line. Lesson 4.4: video multiplies compute by frames and duration, making it the expensive modality; perception and multimodal pipelines that emit boxes, captions or records need a structured output contract (schema, validation, retry, fallback).',
    difficulty: 'medium',
    topic: 'multimodal-generation',
  },

  // Alignment and training (Module 5)
  {
    id: 'gae-bank-13',
    prompt: "In supervised fine-tuning of a chat model, response-only loss masking means:",
    options: [
      "The user's tokens are deleted before training",
      'Loss is computed only on the assistant’s tokens, not the prompt or user tokens',
      'Only the system prompt is trained on',
      'Loss is masked whenever the response exceeds the context length',
    ],
    correct_index: 1,
    explanation:
      'Lesson 5.1: SFT sits between pretraining and preference tuning. With response-only masking, gradients flow only through the assistant’s reply so the model learns to produce good answers rather than re-learn to echo prompts. Data quality dominates quantity, and the chat template (role tokens, separators) must match the inference template exactly — a mismatch silently degrades behaviour.',
    difficulty: 'medium',
    topic: 'alignment-training',
  },
  {
    id: 'gae-bank-14',
    prompt: 'In RLHF, the KL penalty anchoring the policy to the reference model exists to:',
    options: [
      'Prevent reward hacking and degenerate drift while still improving the reward',
      'Speed up training convergence',
      'Reduce GPU memory usage',
      'Encode the human preferences directly',
    ],
    correct_index: 0,
    explanation:
      'Lesson 5.2: RLHF learns a reward model from pairwise human preferences, then optimises the policy (PPO) to maximise reward — minus a KL-divergence term that keeps the policy near the supervised reference. Without the anchor, the policy exploits reward-model blind spots (reward hacking) and drifts into degenerate or sycophantic outputs. The anchor trades peak reward for stability.',
    difficulty: 'medium',
    topic: 'alignment-training',
  },
  {
    id: 'gae-bank-15',
    prompt: 'Which claim about preference tuning and alignment is correct?',
    options: [
      'DPO requires a trained reward model and PPO',
      'Alignment tuning always improves benchmark scores',
      'DPO skips the reward model by optimising preference pairs directly via an implicit reward from log-probabilities; alignment tuning trades some capability for safety (the alignment tax); red-teaming maps attacks to defence layers',
      'Red-teaming is performed only by external regulators',
    ],
    correct_index: 2,
    explanation:
      'Lesson 5.3: DPO (and ORPO/KTO variants) converts preference pairs into a direct loss using an implicit reward from log-probabilities — no separate reward model, no PPO loop; match the method to the feedback shape you actually have. Lesson 5.4: alignment tuning extracts an alignment tax — refusals and softened behaviour can cost capability on borderline-but-legitimate requests; red-teaming is an in-house discipline mapping attacks (prompt injection, jailbreaks, data exfiltration) to defence layers, not a regulator’s job.',
    difficulty: 'hard',
    topic: 'alignment-training',
  },

  // Reliability patterns (Module 6)
  {
    id: 'gae-bank-16',
    prompt: 'The root cause of hallucination taught in this course:',
    options: [
      'The training objective rewards plausible next tokens, not verified facts',
      'Models are deliberately trained to lie',
      'Retrieval systems inject false documents',
      'Temperature above 1.0 causes fabrication',
    ],
    correct_index: 0,
    explanation:
      'Lesson 6.1: next-token training never checked whether a statement is true — plausibility is the only signal. Fabrication generators: data gaps, forced-choice prompts ("answer yes or no" when unsure), decoding pressure, context distraction, and answer-length pressure. Response-side defences: abstention paths and calibration proxies (self-consistency sampling, claim counts) — note that refusal and epistemic abstention are different things.',
    difficulty: 'easy',
    topic: 'reliability',
  },
  {
    id: 'gae-bank-17',
    prompt: 'In a grounded QA system, the two independent failure axes are:',
    options: [
      'Latency and cost',
      'Retrieval relevance (right evidence retrieved) and generation faithfulness (answer supported by that evidence)',
      'Prompt length and temperature',
      'Training loss and validation loss',
    ],
    correct_index: 1,
    explanation:
      'Lesson 6.2: grounding separates parametric knowledge (weights) from in-context retrieved evidence, and answers should come from the retrieved context with provenance. Retrieval failure (wrong or missing evidence) and generation failure (unfaithful answer despite good evidence) are measured and fixed independently. Grounding is not a free lunch: injection risk, distraction by irrelevant chunks, and added latency all remain.',
    difficulty: 'medium',
    topic: 'reliability',
  },
  {
    id: 'gae-bank-18',
    prompt: 'Which statement correctly ranks output contracts and places the nets?',
    options: [
      'Schema-constrained decoding guarantees the shape by construction (beyond JSON mode); validate–repair–fallback is bounded; runtime guardrails catch bad requests and responses while frozen golden sets catch regressions before release; LLM-as-judge needs rubrics, order swaps and human calibration',
      'JSON mode guarantees your exact schema',
      'Guardrails and evals are the same mechanism',
      'LLM-as-judge alone can approve a release',
    ],
    correct_index: 0,
    explanation:
      'Lesson 6.3: the contract ladder runs prompt-only JSON (advisory) < JSON mode (syntactic) < schema-constrained decoding (shape by construction) < tool calls (typed I/O); a validate–repair–fallback loop keeps repair bounded instead of open-ended. Lesson 6.4: runtime guardrails (input filter, policy engine, output filter) guard the live path; frozen golden sets gate releases. LLM-as-judge is a scale aid needing rubrics, order swaps and human calibration — never the sole approver.',
    difficulty: 'hard',
    topic: 'reliability',
  },

  // Cost, latency and quality engineering (Module 7)
  {
    id: 'gae-bank-19',
    prompt:
      'A call uses 2,000 input and 500 output tokens at $3 and $15 per million respectively. What is the cost?',
    options: ['≈ $0.0135', '≈ $0.0105', '≈ $0.0225', '≈ $0.0075'],
    correct_index: 0,
    explanation:
      'Lesson 7.1: input 2000/1e6 × $3 = $0.006; output 500/1e6 × $15 = $0.0075; total ≈ $0.0135. Note the output premium (here 5×) — output tokens usually dominate. Real bills then multiply by repeated system prompts, growing chat history, retries, tool loops and retrieval stuffing; log real usage against the estimate as a shipping gate.',
    difficulty: 'easy',
    topic: 'cost-engineering',
  },
  {
    id: 'gae-bank-20',
    prompt:
      'A nightly batch enrichment job and a real-time chat share a model. The best discount/latency pairing:',
    options: [
      'Route the nightly job through the async batch endpoint (patient work) and give the chat a byte-stable prompt prefix so provider prefix caching fires',
      'Run both interactively at full price for consistency',
      'Send the chat traffic to the batch endpoint',
      'Disable caching to keep outputs fresh',
    ],
    correct_index: 0,
    explanation:
      'Lesson 7.2: batch APIs trade latency for a discount on patient work; provider prefix caching requires a byte-stable prefix (stable system prompt first, volatile user content last) and a minimum token count to qualify. Application-level exact caches (tenant-scoped, versioned keys) and semantic caches (similarity threshold plus break-even against a wrong answer) add further layers — each with its own invalidation rule and failure mode.',
    difficulty: 'medium',
    topic: 'cost-engineering',
  },
  {
    id: 'gae-bank-21',
    prompt: 'Which practice makes a small-model cascade economically and safely sound?',
    options: [
      'Always start with the largest model to avoid failures',
      'Escalate whenever the response is long',
      'Judge quality by benchmark leaderboards alone',
      'Verification-gated escalation measured on a shared golden set: route on task tiers, escalate when the cheap path fails a check, track cost per successful task, and treat safety as a gate — never a numerator',
    ],
    correct_index: 3,
    explanation:
      'Lesson 7.3: task-tier routing plus a cheap-first cascade with verification-gated escalation, with break-even arithmetic between the small and frontier paths. Lesson 7.4: compare candidates on one golden set with real unit costs, read the Pareto frontier over quality, cost and latency, and track cost per successful task with drift alerts. Safety conditions are gates that block an entry, never a term averaged into a score.',
    difficulty: 'hard',
    topic: 'cost-engineering',
  },

  // Applied GenAI (Module 8)
  {
    id: 'gae-bank-22',
    prompt:
      "A summary rewrites 'up to 20% concession' as '20% concession'. The failure class and the cheapest first gate:",
    options: [
      'A tokenizer artefact; regenerate at temperature 0',
      'Qualifier loss; an automated number-diff between source and summary',
      'A formatting issue; run a readability check',
      'A translation error; switch languages',
    ],
    correct_index: 1,
    explanation:
      'Lesson 8.1: load-bearing words — "up to", "approximately", negations — are the first casualties of compression. The fix is an explicit preservation contract plus an automated number-diff gate (normalise digits, units and qualifiers, then diff). Long documents use chunk → map → reduce with a fixed partial schema and conflict rules, because errors compound through the passes.',
    difficulty: 'easy',
    topic: 'applied-genai',
  },
  {
    id: 'gae-bank-23',
    prompt: 'Fabricated invoice numbers appear in extraction output despite a valid schema. The strongest fix combination:',
    options: [
      'Raise the temperature for more variety',
      'Absent-means-null in the prompt, schema-constrained decoding, and quote-verification of risky values with provenance spans',
      'Remove the schema so the model can be creative',
      'Ask the model to self-certify each value',
    ],
    correct_index: 1,
    explanation:
      'Lesson 8.2: a valid schema guarantees shape, not truth. Combine a null policy (absent field → null, never invented), schema-constrained decoding, and provenance spans that quote the source for each value so risky fields can be verified against the document. Evaluate with field-level precision and recall and a per-field error taxonomy — never by eyeballing sample rows.',
    difficulty: 'medium',
    topic: 'applied-genai',
  },
  {
    id: 'gae-bank-24',
    prompt: 'Which pair of decisions is defensible at production scale?',
    options: [
      'Prompt an LLM for 400k items/day regardless of cost; auto-merge generated code when tests are green',
      'Train a classifier first for everything; review all content with equal intensity',
      'High-volume stable labels → a trained or cascade classifier with calibrated confidence (LLM for the hard slice); generated code passes sandboxed tests before human review and never merges itself, while content review is tiered by blast radius × reversibility × detectability',
      'Trust self-reported LLM confidence as the routing threshold; sample-audit at 10%',
    ],
    correct_index: 2,
    explanation:
      'Lesson 8.3: LLM prompting scales in cost linearly with traffic while a trained classifier front-loads cost — the volume math decides; route on measured confidence, not self-reported certainty, and run the distillation playbook (LLM-seeded labels, human-audited gold, small model, drift monitoring). Lesson 8.4: codegen uses tests as the only honest oracle with bounded error feedback and a human at review-and-merge; content pipelines tier human review by blast radius × reversibility × detectability instead of everything-or-nothing.',
    difficulty: 'hard',
    topic: 'applied-genai',
  },

  // Safety, IP and compliance (Module 9)
  {
    id: 'gae-bank-25',
    prompt: 'Which text is most likely to be regurgitated verbatim from a model’s training data?',
    options: [
      'A serial number or API key repeated across thousands of pages (low entropy, repetitive, undeduplicated)',
      'A one-off generic sentence',
      'Post-cutoff news',
      'A correctly formatted JSON schema',
    ],
    correct_index: 0,
    explanation:
      'Lesson 9.1: memorisation tracks repetition, low entropy and absent deduplication — a string appearing thousands of times in near-identical context is the easiest thing for weights to store and hand back. Canary-style probes can bound the risk but a negative result proves little; controls layer across what you send, vendor settings you verified, output-side deterministic scanning and incident response.',
    difficulty: 'easy',
    topic: 'safety-compliance',
  },
  {
    id: 'gae-bank-26',
    prompt: 'Which practice survives the shifting copyright landscape?',
    options: [
      'Per-use dated decision records splitting train-side, ownership, output-infringement and vendor-term questions, checked per jurisdiction',
      'Following the newest headline as if it were global rule',
      'Assuming outputs are automatically owned by the user',
      'Avoiding GenAI until all statutes settle',
    ],
    correct_index: 0,
    explanation:
      'Lesson 9.2: keep training-side and output-side questions separate, plus the vendor contract layer that can override both. The landscape as of 2026: US fair-use litigation is differentiated by use, the EU TDM exception carries an opt-out reservation, and India has no explicit TDM exception — all subject to change, so verify per jurisdiction with dates. Practical controls: rights hygiene for inputs, similarity checks on outputs, vendor terms read not assumed.',
    difficulty: 'medium',
    topic: 'safety-compliance',
  },
  {
    id: 'gae-bank-27',
    prompt: 'An Indian consumer app with EU users ships an LLM feature. Which obligation set is correct?',
    options: [
      'DPDP applies only to Indian data; the EU Act bans all AI',
      'DPDP: demonstrable consent plus notice, purpose limitation, breach notice to the Board; data tiers map to channels with Restricted barred from third-party tools; the EU AI Act risk tier depends on what the feature does (e.g. employment or credit = high-risk duties) — verify current text',
      'Compliance equals publishing a privacy policy',
      'Only the LLM vendor carries any duty',
    ],
    correct_index: 1,
    explanation:
      'Lesson 9.3: classify data into tiers mapped to approved channels — Restricted data never goes to third-party tools; minimisation and egress controls make the safe path the fast path. Lesson 9.4: DPDP puts fiduciary duties (demonstrable consent, purpose limitation, breach duties) on whoever determines purpose and means — usually you, not the vendor. The EU AI Act’s tier attaches to what the feature does (hiring, credit, exams = high-risk), and the regimes layer rather than replace each other.',
    difficulty: 'hard',
    topic: 'safety-compliance',
  },

  // Capstone and frontiers (Module 10)
  {
    id: 'gae-bank-28',
    prompt: 'In a GenAI spec, what must exist before any model is tested?',
    options: [
      'The problem with its measured status quo, the metric with baseline, target, gates and counter-metrics, and the explicit out-of-scope — written while you still have no model opinions',
      'A vendor demo',
      'The system prompt',
      'The rollout email',
    ],
    correct_index: 0,
    explanation:
      'Lesson 10.1: the one-pager comes first — a problem statement with the current workflow’s numbers and cost of failure, a success metric with baseline, target, guardrail gates and counter-metrics, and explicit out-of-scope. Write the metric before you have model opinions so it cannot be reverse-engineered to fit a favourite. Then hard-filter and score three options on your own golden set, with a falsification condition stated up front.',
    difficulty: 'easy',
    topic: 'capstone',
  },
  {
    id: 'gae-bank-29',
    prompt: 'In a ten-item golden set, why are injection and PII-probe items critical and binary?',
    options: [
      'Safety conditions gate entry: a 90% pass means nine failures in ten — they never average into a score',
      'They are easier to score automatically',
      'They take less time to write',
      'They count double toward the quality score',
    ],
    correct_index: 0,
    explanation:
      'Lesson 10.2: golden-set items need scoreable expectations; safety conditions (injection resistance, PII refusal) are gates that must pass on every run — averaging them into a percentage would hide the nine failures a 90% score implies. Keep the set frozen (never tune on the test), attach reason codes and fail paths to guardrails, and re-run the whole set on every change including vendor model updates.',
    difficulty: 'medium',
    topic: 'capstone',
  },
  {
    id: 'gae-bank-30',
    prompt: 'Which production posture is correct?',
    options: [
      'Mitigations without alarms are complete; migrate on announcement day to capture savings; usage dashboards alone prove quality',
      'Every failure-register entry carries a detection signal with threshold and owner; rollout is phased with a rehearsed one-command rollback; model and vendor claims are verified on your own golden sets before migration — never on announcement day',
      'Dashboards are optional once the canary passes',
      'Rollback plans are written after the first incident',
    ],
    correct_index: 1,
    explanation:
      'Lesson 10.3: every failure-register entry carries a detection signal, threshold and owner — a mitigation with no alarm is incomplete; rollout is phased with entry gates, dashboards and a rehearsed rollback; the two-volume cost model (1k and 10k daily uses) keeps unit economics visible. Lesson 10.4: trends (agents, multimodal, on-device, open weights) are held at arm’s length as of 2026; run a currency system with ranked sources, cadence and an eval-first adoption rule — verify on your golden set, never on announcement day.',
    difficulty: 'hard',
    topic: 'capstone',
  },
];

export function getGenAIEssentialsCourse(): Course {
  return {
    id: 'crs-genai-essentials',
    slug: 'genai-essentials',
    title: 'Generative AI Essentials',
    subtitle:
      'Forty deep lessons from generative foundations to a production GenAI spec — mechanics, models, reliability, cost, applied pipelines, safety and compliance',
    description: `Most GenAI courses stop at the demo: a prompt that worked once, a slide about transformers, a list of tools. This one starts where those end. Forty lessons, ten modules, one exam bank and a capstone that forces the whole thing into a single defensible document — the spec you would actually put in front of a team.

It runs from the generative landscape (GANs, VAEs, diffusion, the transformer, foundation models) down into LLM mechanics — tokenization, embeddings, the sampling pipeline, the KV cache — then out to the decisions engineers actually make: open versus closed weights, small models versus frontier APIs, context windows, image/audio/video pipelines. From there it is reliability (hallucination, grounding, structured outputs, guardrails, evals), cost engineering (token arithmetic, caching, routing, quality-per-rupee), applied patterns (summarization that keeps the numbers, extraction, classification, code generation with tests as the oracle), safety and compliance (memorisation, copyright, data governance, DPDP and the EU AI Act), and a capstone that assembles all of it into a spec with a cost model, a failure register and a rollout plan.

**Who this is for:** anyone who has taken a basics GenAI course — or watched a demo — and wants the engineering underneath it. Developers shipping features, students preparing for AI rounds, product people who must evaluate a vendor's claim, and anyone tired of "the model said so".

**What you need:** basic AI literacy (you know what an LLM is and have used a chat assistant). No coding required — the Python snippets are read-only worked examples. You will write, not code, for the capstone.`,
    category: 'AI & Data Science',
    level: 'intermediate',
    is_free: true,
    price_inr: 0,
    thumbnail_url: '',
    thumbnail_alt: 'Generative AI Essentials course cover',
    tags: ['genai', 'llms', 'diffusion', 'alignment', 'ai-safety', 'model-selection'],
    outcomes: [
      'Distinguish generative from discriminative models and explain how the transformer plus foundation-model pretraining powers every modality',
      'Trace the full sampling pipeline — logits, temperature, top-k/top-p — and the serving controls that steer and cut generation',
      'Choose between open and closed weights, and between small and frontier models, using hard filters, a weighted rubric and a sensitivity check',
      'Design image, audio and video pipelines including structured output contracts, with honest limits on each modality',
      'Explain post-training — SFT, RLHF, DPO — and the alignment tax, red-teaming and training-cost realities as of 2026',
      'Diagnose hallucination from the objective and apply grounding, structured-output contracts, guardrails and golden-set evals',
      'Estimate and control token cost with batching, caching, routing and a quality-per-rupee framing',
      'Ship applied pipelines: summarisation with number preservation, schema-bound extraction, classification decisions and codegen with tests as the oracle',
      'Apply memorisation controls, the four-question copyright frame and the DPDP / EU AI Act obligation map to a real feature',
      'Write an end-to-end GenAI spec — problem, metric, model, prompts, guardrails, eval, cost, failures, rollout — and maintain a currency system to keep it true',
    ],
    prerequisite_course_id: null,
    certificate_eligible: true,
    published: true,
    created_at: '2026-10-15T09:00:00.000Z',
    updated_at: '2026-10-15T09:00:00.000Z',
    instructor_id: null,
    about_course: `Ten modules, forty lessons, each lesson the same nine-step shape (objective, hook, concept, worked example, practice, common mistakes, exam/interview angle, quiz, summary) — so the rhythm never changes and the depth does.

Module 1 sets the landscape: what "generative" means as a technical distinction, the GAN-to-VAE-to-diffusion lineage, the transformer as the single architecture underneath, foundation models and what "multimodal" actually claims. Module 2 goes inside the machine: BPE tokenization from merge tables, embeddings as geometry, the sampling pipeline from logits to the chosen token, and the serving controls — system prompts, stop sequences, streaming, the KV cache — that decide cost and latency. Module 3 is the selection problem: open versus closed weights and what "open" really buys, when a 7B model beats a frontier call, context windows and their tradeoffs, and a weighted rubric with a sensitivity check.

Module 4 covers the other modalities — diffusion mechanics and prompting, speech pipelines, video and structured output. Module 5 is training and alignment: SFT, RLHF, DPO, red-teaming and the alignment tax. Module 6 is reliability: why hallucination happens from the objective, grounding, structured-output contracts, guardrails and evals. Module 7 is cost: token arithmetic, batching and caching, routing and latency, quality-per-rupee. Module 8 applies all of it — summarization with number preservation, extraction with schemas, classification decisions, code generation with tests as the oracle. Module 9 is safety, IP and compliance — memorisation, copyright, data governance, DPDP and the EU AI Act. Module 10 is the capstone and the frontiers: framing the spec, building the golden eval set, the cost model and failure register, rollout, and how to stay current without chasing announcements.

The through-line is arithmetic and falsifiability: every claim in this course is something you can check, cost or refute on your own data — and the exam, the quizzes and the capstone all test exactly that.`,
    prerequisites: [
      'Basic AI literacy — you know what an LLM is and have used a chat assistant (any intro course, including a basics GenAI course, covers this)',
      'No coding required: Python snippets appear as read-only worked examples you are meant to follow, not type',
      'A notebook or doc for the capstone spec (the project is written, not coded)',
      'Comfort with short technical prose and light arithmetic (token and cost estimates)',
    ],
    audience: [
      'Students and working engineers who took a basics GenAI course and want the engineering depth underneath the demos',
      'Product, ops and support people who must specify, evaluate or govern a GenAI feature',
      'Placement and interview prep for AI/LLM rounds — the exam bank mirrors the questions those rounds ask',
      'Anyone evaluating model vendors, writing prompts at work, or being asked "should we use AI for this?"',
    ],
    audio_language: 'English',
    caption_language: 'English',
    // Bucket B, AI/DS primary but open to all branches — the intermediate
    // GenAI course that sits after AI-literacy and before/alongside the ML
    // and deep-learning tracks.
    branch: 'ai-ds',
    branch_label: 'AI/DS primary — open to all branches',
    bucket: 'B',
    certificate_tier: 'professional',
    estimated_hours: 15,
    perks: [
      { key: 'certificate', label: 'Verifiable certificate' },
      { key: 'xp', label: 'XP on the leaderboard' },
    ],
    // Semester Exam Mode payload — the one-night revision sheet.
    exam_prep: {
      target:
        'AI/DS semester exams, placement AI rounds and GenAI interview prep — Generative AI Essentials (intermediate)',
      units: [
        {
          title: 'The generative landscape (M1)',
          summary:
            'Generative estimates P(x)/the joint; discriminative estimates P(y|x). GAN = generator–discriminator game, failure = mode collapse; VAE = encode–bottleneck–decode, failure = blur; diffusion = add noise, learn to predict it, sample by iterative denoising. Transformer: self-attention token mixing + FFN channel mixing with residuals; encoder-only = understanding, decoder-only = generation, enc-dec = seq2seq. Foundation model = pretrained broadly once, adapted downstream; multimodal = a claim about actual input/output channels, audit not assume.',
          questions: [
            'Why can a generative model still be used for classification — and the reverse?',
            'Name the characteristic failure of GANs and of VAEs, and why diffusion won.',
            'What does a product’s "multimodal" claim actually assert? How do you audit it?',
          ],
          pyqs: [],
        },
        {
          title: 'LLM mechanics, deeper (M2)',
          summary:
            'BPE: characters → count adjacent pairs → merge most frequent until vocab size; merges ranked, applied in rank order; byte-level guarantees any input encodes; provider vocabularies differ → token counts differ → cost and context differ. Embeddings: meaning as geometry; cosine = angle not probability; domain mismatch and uncalibrated thresholds are the classic failures. Sampling: logits → temperature-scaled softmax → top-k/top-p pruning → renormalise → sample. Serving: roles/system prompt precedence, stop sequences (two failure modes), streaming vs time-to-first-token vs total time, KV cache growth makes long context per-token expensive.',
          questions: [
            'Walk the pipeline from logits to the appended token; what does each dial change?',
            'Why do two providers tokenise the same sentence differently — and what does it cost you?',
            'What is the difference between time-to-first-token and total generation time, and what does streaming change?',
          ],
          pyqs: [],
        },
        {
          title: 'Model families and selection (M3)',
          summary:
            'Open weights = parameters published, licence may still restrict, data/code not necessarily open; API-only hides hosting but adds ops. Small models win on: narrow stable task, high volume, cost linear in traffic, latency/offline/privacy constraints, clean labelled data — else frontier. Context windows: fit ≠ comprehension; lost-in-the-middle; prefill grows with length; retrieval top-k often beats naive full-dump. Selection: task+metric → hard filters → shortlist → golden-set eval → weighted rubric → weights-sensitivity check → recommendation with monitoring and rollback.',
          questions: [
            'Five conditions under which a small fine-tuned model beats a frontier API?',
            'Why is "the window fits it" not a sufficient reason to full-dump 400k tokens?',
            'Structure the model decision: what comes before the rubric, and what re-checks it after?',
          ],
          pyqs: [],
        },
        {
          title: 'Image, audio and video (M4)',
          summary:
            'Diffusion: train = add noise, predict it; sample = iterative denoising; steps trade time for quality; guidance scale = extrapolation between conditional and unconditional. Image prompting = subject/style/composition/lighting/format + negative channel; dialects differ; iterate one variable. ASR = speech→text (failure: accents, overlap, domain terms); TTS = text→speech; cloning needs consent as a technical control. Video = temporal latent diffusion/autoregression; cost scales with frames×duration; hard constraints on coherence. Structured output: schema, validation, retry, fallback — perception models returning boxes/JSON are not "images".',
          questions: [
            'What does the denoiser actually predict, and what does guidance scale trade?',
            'Why is consent a technical requirement for voice cloning, not a policy footnote?',
            'Video and structured output: what makes video expensive, and what contract does a boxes/JSON model need?',
          ],
          pyqs: [],
        },
        {
          title: 'Alignment and training (M5)',
          summary:
            'Pretraining → SFT → preference tuning. SFT: response-only loss masking, data quality over quantity, chat-template mismatch degrades behaviour; SFT vs RAG when the model "needs to know X". RLHF: preferences → reward model → PPO with KL anchor to reference; failures = reward hacking, sycophancy. DPO: implicit reward from log-probabilities, no reward model, no PPO; ORPO/KTO fit other feedback shapes; match method to data. Red-team with attack taxonomy → defence layers; alignment tax = capability lost to safety (refusals, softened behaviour); training cost realities and distillation as of 2026 — verify per release.',
          questions: [
            'What does response-only loss masking achieve in SFT, and what goes wrong without it?',
            'Why does RLHF need the KL anchor, and what happens without it?',
            'How does DPO differ from RLHF — and what is the alignment tax?',
          ],
          pyqs: [],
        },
        {
          title: 'Reliability patterns (M6)',
          summary:
            'Hallucination from the objective: plausibility not verification; generators = data gaps, forced choice, decoding, distraction, length; abstention ≠ refusal; calibration proxies = self-consistency, claim counts. Grounding: parametric vs in-context evidence; retrieve → assemble with provenance → answer from context → cite → abstain; two independent axes = retrieval relevance and generation faithfulness; limits = injection, distraction, latency. Contracts: prompt-only < JSON mode < schema-constrained decoding < tool calls; validate–repair–fallback bounded; shape ≠ truth. Guardrails (input filter, policy engine, output filter) guard live; frozen golden sets gate release; LLM-as-judge needs rubrics, order swaps, human calibration.',
          questions: [
            'Why does the training objective produce hallucination — and what is epistemic abstention?',
            'Name the two independent failure axes of grounding and a metric for each.',
            'Rank the output-contract ladder and say what schema validation cannot catch.',
          ],
          pyqs: [],
        },
        {
          title: 'Cost engineering and applied GenAI (M7–M8)',
          summary:
            'Pricing: input/output per million, output premium, multipliers = repeated system prompt, history growth, retries, tool loops, retrieval stuffing. Discount layers: async batch, provider prefix cache (byte-stable prefix), app exact cache (tenant-scoped, versioned), semantic cache (threshold + break-even). Routing: task tiers, cheap-first cascade with verification-gated escalation, TTFT vs total, p95 discipline. Quality-per-rupee: task metric on one golden set, cost per successful task, Pareto frontier, safety as gate never numerator. Applied: summarisation preservation contract + number-diff gate + map-reduce with fixed partial schema; extraction null policy + provenance spans + field-level P/R; classification volume math + measured-confidence routing + distillation; codegen tests-as-oracle with bounded feedback, human at review-and-merge; content review tiered by blast radius × reversibility × detectability.',
          questions: [
            'Compute a per-call token cost and name three multipliers that silently inflate the bill.',
            'Design a four-layer caching strategy and say how each one fails.',
            'Summarisation: why do numbers break, and what three-layer defence restores them?',
            'When does LLM-prompting lose to a trained classifier — and how do you route on confidence?',
          ],
          pyqs: [],
        },
        {
          title: 'Safety, compliance and the capstone (M9–M10)',
          summary:
            'Memorisation: repetition + low entropy + no dedup → verbatim; five risk classes; canary probes bounded; controls at four layers. Copyright: train-side vs output-side vs vendor terms, kept separate; US fair-use differentiated, EU TDM opt-out reserved, India no explicit TDM exception — hedged as of 2026. Governance: data tiers → channels, Restricted barred from third-party tools; trace where an API call actually goes; enforceable acceptable-use policy. DPDP: fiduciary duties, demonstrable consent + notice, purpose limitation, children’s data, breach to Board; EU AI Act tiers attach to what the feature does and layer on top. Capstone: metric before model; golden set with binary safety gates; two-volume cost model; failure register with detection signals; phased rollout with rehearsed rollback; currency system with eval-first adoption.',
          questions: [
            'What makes a string easy to regurgitate — and where do the controls sit?',
            'Split a GenAI copyright problem into its four questions.',
            'What does DPDP require that "the vendor handles it" does not answer?',
            'Why must every failure-register entry carry a detection signal, and what does eval-first adoption mean?',
          ],
          pyqs: [],
        },
      ],
      important_questions: [
        'Explain the generative vs discriminative distinction and why modern LLMs blur it. Give one example of each.',
        'Walk the full sampling pipeline from logits to the chosen token, and say what temperature, top-k and top-p each change.',
        'When does a small model beat a frontier API? Give five conditions and the routing consequence.',
        'Why does summarisation damage numbers, and what three-layer defence restores them?',
        'Design the validate–repair–fallback loop for structured extraction and say what schema validation cannot catch.',
        'Separate a GenAI copyright problem into four questions and state what a dated decision record contains.',
        'Write the seven parts of a production GenAI spec and defend metric-before-model ordering.',
      ],
      previous_year_questions: [
        {
          year: '2025',
          question:
            'Explain how a transformer uses self-attention to connect distant words, and why this architecture scaled where recurrent networks stalled. (8 marks)',
          solution:
            'Self-attention computes query–key–value interactions so every token can attend to every other in one parallel step, with residual connections and feed-forward layers stacked around it; positional information comes from encodings since there is no recurrence. It scaled where RNNs stalled because training is parallel over sequence positions (RNNs are sequential), gradients short-circuit through residuals, and the same block composes into encoder-only, decoder-only and encoder-decoder variants — which is why one architecture now powers chat, code, image and speech systems via foundation-model pretraining plus downstream adaptation.',
        },
        {
          year: '2025',
          question:
            'A chatbot answers confidently wrong about a post-cutoff fact. Diagnose the failure from the training objective and give two response-side defences. (6 marks)',
          solution:
            'Diagnosis: next-token training rewards plausibility, not verification — the fact was never in training (knowledge cutoff), and nothing in the objective penalises inventing a plausible stand-in. Defences: (1) grounding — retrieve the fact from an external store, answer from that context with provenance, and enforce a source-or-abstain contract; (2) epistemic abstention with calibration proxies — sample multiple answers (self-consistency) and abstain when they disagree or claims lack support. Note refusal ("I cannot help") is a different behaviour from abstention ("I do not know"); the failure here wants the second.',
        },
        {
          year: '2024',
          question:
            'Estimate the monthly cost of an extraction pipeline processing 50k documents/day with 2k input and 300 output tokens each, at $2.5/M input and $10/M output. State one assumption that could make the real bill 5× higher. (6 marks)',
          solution:
            'Per document: 2000×2.5/1e6 = $0.005 input + 300×10/1e6 = $0.003 output = $0.008. Daily: 50,000 × $0.008 = $400. Monthly (30 days) ≈ $12,000. A 5× inflation source: unbounded retry/tool loops or stuffing full document text plus a repeated system prompt into every call (retrieval stuffing / history growth) — the bill multipliers from the cost module. Real deployments log actual usage against the estimate and gate shipping on the gap.',
        },
      ],
    },
    // Final exam: 15 drawn from the 30-question bank, mixed difficulty and
    // topic-tagged. Pass 60, distinction 85 on the first attempt, 24h retake.
    exam: {
      question_count: 15,
      duration_minutes: 30,
      passing_percent: 60,
      retake_cooldown_hours: 24,
      distinction_percent: 85,
      bank: examBank,
    },
    // Capstone: the production spec. Required for the certificate — the
    // course's claim is that you finish with a defensible document, not notes.
    project: {
      title: 'Spec a production GenAI use case',
      brief:
        'Write a one-pager plus appendix that takes one real GenAI use case — yours — from problem to rollout. The one-pager: the problem with its measured status quo (how the work happens today, at what cost, failing how often); the success metric with baseline, target, guardrail gates and counter-metrics; the chosen model with a three-option comparison table scored on your own ten-item golden set; and the explicit out-of-scope. The appendix: (1) the prompt architecture — layered system contract, context packing, output schema — with guardrails placed by position, reason codes and fail paths; (2) the golden eval set: ten scoreable items covering the failure modes, with the safety items marked as binary gates; (3) the cost model at 1,000 and 10,000 daily uses, with assumptions visible, levers applied and cost per successful task; (4) the top-five failure register: failure, impact × likelihood, mitigation, and a detection signal with threshold and owner for every entry; (5) the phased rollout: entry gates, dashboards, a rehearsed rollback and named owners; and (6) the currency plan: which sources you watch, at what cadence, and the eval-first rule that decides when to migrate models. The claim you are defending is not that GenAI can do this — it is that you know when it fails, how you would see it, and what you would do next.',
      submission_hint:
        'Public link (anyone-with-link view) to a document or repository, or a PDF attached to your submission — the one-pager plus appendix.',
      required_for_certificate: true,
    },
    modules,
  };
}
