// Module 1 — The Generative Landscape
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info } from '../nineBlocks';
import { lesson, M1, COURSE_ID } from './helpers';

export const module1: CourseModule = {
  id: M1,
  course_id: COURSE_ID,
  title: 'Module 1 — The Generative Landscape',
  summary:
    'What "generative" actually means as a technical distinction, the GAN to VAE to diffusion lineage that produced today\'s image tools, the transformer as the one architecture underneath it all, foundation models and the modality map — plus what "multimodal" really claims.',
  sort_order: 1,
  lessons: [
    lesson(
      M1,
      'gae-1-1',
      1,
      'Generative vs Discriminative: Two Ways a Model Uses Data',
      'The distinction that defines the field: models that learn decision boundaries versus models that learn the shape of the data itself — and why modern LLMs blur the line.',
      18,
      nineBlocks({
        objectives: [
          'Define generative and discriminative models in terms of the probability each one estimates',
          'Classify six real AI products as generative or discriminative and justify each from its training objective',
          'Explain why a generative model can still be used for classification, and give the reverse counter-example',
          'Choose generative vs discriminative for three given business problems and defend the choice',
        ],
        hook:
          'Two apps sit on the same phone. One tags your photos: "beach, dog, dinner" — it never invents a pixel, it only labels. The other, in the same minute, invents a photograph of a dog on a beach that never existed. Both are "AI", both were trained on images, but they were trained for fundamentally different mathematical jobs. That split — discriminative vs generative — is the fault line of the entire field, and every model you will meet in this course lives on one side of it.',
        concept: `**Two different questions about data.** A **discriminative** model learns P(label | input): given an image, how should I score each class? Its job is a *boundary* between classes. Logistic regression, SVMs, BERT-style classifiers, and the "is this spam?" layer in your email client are discriminative. A **generative** model learns P(input) (or P(input, label)): what does the data itself look like? How likely is this particular image, this sentence, this row? Because it models the whole distribution, it can *sample* — produce new data that never existed — and also answer questions like "how strange is this point?" (low probability = anomaly). Naive Bayes, Gaussian mixtures, GANs, VAEs, diffusion models, and every LLM are generative.

**What each one buys you.** Discriminative models go straight at the decision you care about; with labelled data they usually win on accuracy per unit of effort, because they spend all their capacity on the boundary. They cannot, by themselves, write a poem. Generative models spend capacity modelling everything about the data — including variation you may not care about — which is the price of being able to create, impute missing values, and detect anomalies. Generative models can also *classify* via Bayes' rule: if you know P(x | class) and P(class), you can compute P(class | x). The classic example is naive Bayes email filtering: count word frequencies per class, multiply, normalise — a generative model doing a discriminative job.

**The modern blur, and how to classify honestly.** Ask not "how is it used?" but "what objective was it trained on?" An LLM trained on next-token prediction over raw text is generative — even when you prompt it with "reply only SPAM or HAM", it *generates* the label as a token sequence rather than scoring classes internally. Reverse case: a semantic-search system that embeds documents and thresholds cosine similarity is doing discriminative-style separation with no generation involved. And a image classifier can be bolted onto a generative pipeline (detect, then regenerate) without changing what either model is. So the practical rule: **classify by the training objective, not by the user-facing trick.**

**Why the generative half exploded.** Discriminative deep learning peaked quietly in the 2010s (ImageNet, ad ranking, spam). The 2020s wave came from the generative side getting *good enough at scale* — transformers scaling next-token prediction to fluent text, diffusion scaling image synthesis to photorealism — so that sampling from P(data) now produces artifacts people actually want: essays, code, faces, music, voice. That is what "Generative AI" names: not a new mathematics of probability, but the point where modelling P(data) became useful enough to build products on. Every remaining lesson in this course is an elaboration of one of those two sentences: what the model estimates, and what it can do because of it.`,
        extras: [
          table(
            'Generative vs discriminative: the working distinction',
            ['Aspect', 'Discriminative', 'Generative'],
            [
              ['Learns', 'P(label | x) — the decision boundary', 'P(x) or P(x, label) — the shape of the data'],
              ['Can sample new data?', 'No', 'Yes — that is the point'],
              ['Classic examples', 'Logistic regression, SVM, BERT classifier', 'Naive Bayes, GAN, VAE, diffusion, LLM'],
              ['Typical modern product', 'Photo tagging, spam filter, fraud score', 'ChatGPT, Midjourney, Suno, Copilot'],
              ['Typical strength', 'Accuracy on a fixed label set', 'Creation, anomaly scoring, flexibility across tasks'],
              ['Typical weakness', 'Cannot create; needs labels', 'Spends capacity on detail you may not need; can hallucinate'],
            ],
          ),
          tip(
            'The one-question classifier',
            'When someone says "we built an AI that does X", ask: was it trained to score labels, or trained to reproduce data? The answer predicts its failure modes before you see a single demo.',
          ),
          warn(
            'Generative does not mean truthful',
            'A generative model optimises likelihood, not correctness. Fluency is a property of P(text); truth is a property of the world. Confusing the two is the root of hallucination (covered in depth in Part II).',
          ),
        ],
        worked: {
          title: 'Classify four systems — then watch a generative model do a discriminative job',
          problem:
            'Classify each as generative or discriminative: (a) a visa-application fraud scorer, (b) ChatGPT drafting an email, (c) a news-topic tagger, (d) an embedding model flagging near-duplicate support tickets by cosine > 0.92. Then hand-compute how a *generative* naive-Bayes tagger scores one ticket.',
          steps: [
            {
              title: 'Step 1 — classify by objective',
              desc: '(a) discriminative: trained on labelled fraud/not-fraud rows to score P(fraud | features). (b) generative: trained on next-token likelihood over text, sampled to produce new text. (c) discriminative: P(topic | headline). (d) borderline but treat as discriminative separation — it scores similarity against a threshold, never samples a new ticket.',
            },
            {
              title: 'Step 2 — set up the toy naive-Bayes model',
              desc: 'Two classes, refund requests (R) and delivery questions (D). Training counts: P(R)=0.5, P(D)=0.5. Word likelihoods: P("refund"|R)=0.40, P("money"|R)=0.30, P("refund"|D)=0.05, P("money"|D)=0.05.',
              code_snippet: 'P(R)=0.5  P(D)=0.5\nP(refund|R)=0.40  P(money|R)=0.30\nP(refund|D)=0.05  P(money|D)=0.05',
            },
            {
              title: 'Step 3 — multiply likelihoods (naive independence)',
              desc: 'Ticket text = "refund money". Score(R) = 0.5 × 0.40 × 0.30 = 0.060. Score(D) = 0.5 × 0.05 × 0.05 = 0.00125.',
              code_snippet: 'Score(R) = 0.5 * 0.40 * 0.30 = 0.060\nScore(D) = 0.5 * 0.05 * 0.05 = 0.00125',
            },
            {
              title: 'Step 4 — normalise to a posterior',
              desc: 'Total = 0.06125. P(R | text) = 0.060 / 0.06125 ≈ 0.9796, P(D | text) ≈ 0.0204. A *generative* model (it modelled P(words | class)) produced a confident discriminative answer — same output shape, different internal job.',
              code_snippet: 'P(R|text) = 0.060 / 0.06125 = 0.98   P(D|text) = 0.02',
            },
          ],
          solution:
            'Four labels: discriminative, generative, discriminative, discriminative-by-similarity. The naive-Bayes walk-through scores 0.98 for the refund class — proving generation and classification are jobs, not mutually exclusive model species. Classify models by objective; predict behaviour from that.',
        },
        practice: {
          title: 'Audit your own AI stack',
          prompt:
            'List six AI features you used this week (photo tags, autocomplete, chat, transcription, recommendation feed, fraud alert). For each, write one sentence naming the objective you believe it was trained on, and one prediction about how it fails. Then find the one case where you are genuinely unsure — and say what evidence (docs, model card, demo behaviour) would settle it.',
          hint: 'If the system only ever outputs a decision about your input, it is probably discriminative. If it can surprise you with something new, it is generative.',
        },
        mistakes: [
          {
            mistake: 'Calling any tool that "uses AI" generative because it is new',
            fix: 'Most production AI remains discriminative (ranking, scoring, tagging). "Generative" names a training objective — P(data) — not novelty or neural-network depth.',
          },
          {
            mistake: 'Believing an LLM doing classification is a discriminative model',
            fix: 'It generates the label as text from a next-token distribution. The objective never changed; you rephrased the task into its generative format.',
          },
          {
            mistake: 'Assuming generative models are automatically better at decisions',
            fix: 'For a fixed label set with good labels, a discriminative model is usually more accurate, cheaper and more debuggable. Generality is bought with capacity you may not need.',
          },
          {
            mistake: 'Equating likelihood with correctness',
            fix: 'A generative model reports how *text-like* something is, not whether it is true. High P(x) means familiar, not verified — the seed of every hallucination story.',
          },
        ],
        exam: {
          question:
            'Differentiate generative from discriminative models. Give one example of each in a modern product, and explain why an LLM prompt "classify this as SPAM or HAM" does not make the LLM a discriminative model.',
          answer:
            'A discriminative model estimates P(label | x): it learns the boundary between classes and is typically tuned for decision accuracy (e.g. an email spam scorer trained on labelled mail). A generative model estimates P(x) or P(x, label): it learns how the data itself is distributed, which lets it sample new instances and also, via Bayes, classify (e.g. ChatGPT generating text; or naive Bayes classifying from word likelihoods). Prompting an LLM to output SPAM/HAM changes the *task presentation*, not the training objective: the model still scores the next token from its learned text distribution and samples a label string. It never learned class-conditional boundaries; it learned text continuation and is being used as a classifier through prompting — which works, but inherits generative failure modes (fluency without calibration, sensitivity to phrasing).',
          source: 'Standard ML interview screen; also a common MLOps/GenAI product-design discussion question.',
        },
        summary: [
          'Discriminative models learn P(label | x) — a boundary; generative models learn P(x) — the shape of the data, and can sample.',
          'Generative models can classify (Bayes), but discriminative models cannot generate — that asymmetry is the whole difference.',
          'Classify by training objective, not by how the product is used: prompting an LLM to label text does not make it discriminative.',
          'The Generative AI wave = P(data) modelling scaled (transformers + diffusion) until sampling produced useful artifacts.',
          'Likelihood is not truth: generative models measure text-likeness, which is why hallucination is possible at all.',
        ],
      }),
      [
        [
          'A discriminative model is best defined as one that estimates:',
          [
            'P(x) — how the input data is distributed',
            'P(label | x) — the decision boundary given an input',
            'P(x | y) only, with no way to score labels',
            'The joint probability of every pixel in an image',
          ],
          1,
          'Discriminative models go straight at the conditional over labels — boundary learning, not density learning.',
        ],
        [
          'An LLM is classified as generative because it was trained to:',
          [
            'Maximise the probability of the actual next token over raw text',
            'Assign one of a fixed set of class labels',
            'Rank documents by relevance',
            'Detect anomalies in tabular data',
          ],
          0,
          'Its objective is next-token likelihood over data itself — P(text) — which is what makes sampling new text possible.',
        ],
        [
          'A naive-Bayes spam filter is sometimes called "generative" because it:',
          [
            'Writes new emails',
            'Models P(words | class) and P(class), then derives P(class | words) via Bayes',
            'Uses a neural network',
            'Requires no labelled data',
          ],
          1,
          'It learns class-conditional data distributions — the generative route to a discriminative answer.',
        ],
        [
          'The strongest practical reason to prefer a discriminative model for a fixed-label task is that it:',
          [
            'Can invent training examples',
            'Spends all its capacity on the decision boundary, usually giving better accuracy per unit of effort when labels exist',
            'Never overfits',
            'Works without a GPU',
          ],
          1,
          'Modelling everything about the data is a cost; when you only need the decision, the boundary-focused model usually wins.',
        ],
      ]
    ),
    lesson(
      M1,
      'gae-1-2',
      2,
      'GANs, VAEs and Diffusion: Where Image Generation Came From',
      'Three generations of image synthesis — adversarial games, latent reconstructions, iterative denoising — intuitions for each and why diffusion won.',
      19,
      nineBlocks({
        objectives: [
          'Explain the generator-versus-discriminator game behind GANs and name its characteristic failure (mode collapse)',
          'Describe a VAE\'s encode-bottleneck-decode loop and why its samples come out blurry',
          'Walk the diffusion training objective (add noise, learn to predict it) and the sampling loop (iterate denoising)',
          'Identify which lineage member powers a given tool, including modern hybrids like latent diffusion',
        ],
        hook:
          'Thisperson does not exist — the GAN-generated faces that fooled timelines around 2019. Two years later the same slot in the culture was taken by Stable Diffusion and Midjourney, which look nothing like those slightly glassy faces. Between those two demos sat a change of technology, not just of quality: the field moved from an adversarial game, through a probabilistic bottleneck, to a deceptively simple idea — corrupt data with noise, then learn to undo it. Today\'s image tools, as of 2026, are mostly that third idea, with pieces of the first two quietly inside.',
        concept: `**GAN (2014): learn by competing.** A **generator** G takes random noise and produces a candidate image; a **discriminator** D judges real training images vs G's fakes. They train in a minimax dance: G gets better at fooling D, D gets better at catching G. Intuition: an art forger and a critic, each sharpening the other. GANs produced the first startlingly sharp samples (StyleGAN faces), and their speed kept them alive in super-resolution and mobile filters. But the game is notoriously unstable — the two networks must stay in balance or training collapses — and **mode collapse** is the signature failure: G discovers one output that fools D and emits variations of it (one "safe" face forever), because the objective rewards fooling D, not covering the data. There is no likelihood, no principled measure of "how much of the data did I learn?" — just the game.

**VAE (2013): compress, then reconstruct.** An encoder maps the image into a small **latent** vector (a compressed code), a decoder rebuilds the image from that code, and training minimises reconstruction error plus a regulariser (the KL term) that keeps the latent space smooth and continuous. Two consequences you can see: (1) the latent space is *organised* — interpolating between two codes yields a coherent morph, which is why VAE latents became a control surface; (2) because the code is a lossy bottleneck and the loss is pixel-wise average, samples tend to look **blurry** — the model hedging across plausible reconstructions. VAEs never won the headline quality race, but they never left: they are the autoencoder that compresses pixels into the small latent grid that diffusion models actually run on inside tools like Stable Diffusion.

**Diffusion (2015–2020): corrupt, then uncorrupt.** Training has two halves. Forward: take a real image, add Gaussian noise step by step until it is pure static. Reverse: train a network to predict the noise that was added, given the noisy image (and, in modern tools, a text condition). Sampling flips the process: start from pure noise, ask the network "how much of this is noise?", subtract a bit, repeat 20–50 times until a coherent image emerges. The elegance is that the task is always the same simple regression ("predict the noise"), which trains stably at enormous scale — no adversarial balancing act — while step count at sampling time becomes a quality-versus-latency dial you can turn. GAN sharpness without the game, VAE-style compression without the blur.

**The lineage is not a replacement list.** Modern production is hybrid: a VAE first squeezes 1024×1024 pixels into a 64×64 latent (100× less compute), the diffusion transformer denoises there conditioned on text via cross-attention, and an adversarial loss is often added at the end for crispness. Credit where due: every ancestor is a component of the winner. As of 2026, flow-matching and rectified-flow training (used by models such as SD3 and FLUX-class systems) shorten the denoising schedule — fewer steps, similar quality — but they are descendants of the same denoise-the-noise idea, not a fourth lineage.`,
        extras: [
          table(
            'Three lineages, three intuitions',
            ['Family', 'Core idea', 'Signature strength', 'Signature failure'],
            [
              ['GAN (2014)', 'Generator fools a discriminator in a minimax game', 'Sharp, fast samples', 'Training instability, mode collapse'],
              ['VAE (2013)', 'Encode to a regularised latent bottleneck, decode back', 'Smooth, organised latent space', 'Blurry pixel-wise samples'],
              ['Diffusion (2015→)', 'Add noise in training; learn to predict it; iterate the removal', 'Stable training, quality/diversity control via steps', 'Slow sampling; many steps historically'],
              ['Modern hybrid', 'VAE latent + diffusion (or flow) denoiser + adversarial loss', 'Everything above, in production', 'Complex stack; heavy compute'],
            ],
          ),
          info(
            'Why GANs did not disappear',
            'For real-time face filters, super-resolution on-device, and cheap one-step generation, a distilled GAN is still hard to beat. "Diffusion won" refers to headline text-to-image quality, not to every niche.',
          ),
          warn(
            'Do not confuse lineage with a quality ranking',
            'A well-tuned VAE-variant can beat a lazy diffusion setup. Architecture sets the ceiling; data, conditioning and sampling settings decide where under the ceiling you land.',
          ),
        ],
        worked: {
          title: 'Run a one-pixel diffusion step by hand',
          problem:
            'Simplify an image to a single pixel whose true value is 10. Forward diffusion with total noise-level ᾱ = 0.09 produces the observed noisy value x_t. The network is asked to predict the noise ε that was added. Compute the forward sample, run one perfect reverse step to recover x₀, then explain what changes when the sampler takes 40 small steps instead of 1 big one.',
          steps: [
            {
              title: 'Step 1 — forward noising arithmetic',
              desc: 'The forward process gives x_t = √ᾱ · x₀ + √(1−ᾱ) · ε, with ε drawn as standard noise, say ε = 1.7. √0.09 = 0.3, √0.91 ≈ 0.954.',
              code_snippet: 'x_t = 0.3 * 10 + 0.954 * 1.7 = 3.0 + 1.62 = 4.62',
            },
            {
              title: 'Step 2 — what the network learns',
              desc: 'The network never predicts "the image" directly; it predicts ε given x_t (and the text condition). A perfect network returns ε̂ = 1.7.',
              code_snippet: 'network(x_t, text) -> noise_pred = 1.7',
            },
            {
              title: 'Step 3 — one reverse step recovers the signal',
              desc: 'x̂₀ = (x_t − √(1−ᾱ) · ε̂) / √ᾱ = (4.62 − 1.62) / 0.3 = 10.0 — the original pixel, from pure arithmetic on the predicted noise.',
              code_snippet: 'x0_hat = (4.62 - 0.954 * 1.7) / 0.3 = 3.0 / 0.3 = 10.0',
            },
            {
              title: 'Step 4 — why samplers take many small steps',
              desc: 'Real networks predict noise imperfectly, especially when ᾱ is tiny (near-pure static). One giant step compounds the error; 20–50 small steps let each prediction be modest and correctable — the quality/latency dial every diffusion UI exposes. Guidance scale (Lesson 4.1) then pulls each prediction toward the text condition.',
            },
          ],
          solution:
            'Forward: 4.62 from a true 10 plus 91% noise power. Perfect noise prediction inverts it exactly to 10.0. Iterative small steps exist because real predictions are imperfect — the whole engineering of samplers is error management across the reverse trajectory.',
        },
        practice: {
          title: 'Identify the machinery behind five tools',
          prompt:
            'For each, write which lineage (GAN / VAE / diffusion / hybrid) you believe dominates and why: (a) an "AI yearbook photo" phone filter running offline, (b) Midjourney or DALL·E-style text-to-image, (c) a face-swap video filter, (d) a text-to-video model, (e) an autoencoder inside an image-editing app that scales images down and up. Defend (e) especially — it is the quiet VAE.',
          hint: 'Ask two questions per tool: does it run many denoising steps (diffusion), does it need a discriminator (GAN), does it compress to a latent code first (VAE)?',
        },
        mistakes: [
          {
            mistake: 'Thinking diffusion models copy or collage training images',
            fix: 'Training teaches a noise-prediction function over data statistics; sampling builds an image from new random noise. Memorisation can happen (a real research concern), but copying specific images is not the mechanism.',
          },
          {
            mistake: 'Believing the GAN era simply ended',
            fix: 'Diffusion won on controllable text-to-image quality; GANs persist where speed and on-device cost dominate (super-resolution, filters, one-step distilled generators).',
          },
          {
            mistake: 'Assuming VAEs were replaced too',
            fix: 'The VAE autoencoder is the compression stage inside latent diffusion pipelines — it decides the latent grid everything else runs on.',
          },
          {
            mistake: 'Expecting 100 denoising steps to guarantee a better image',
            fix: 'Beyond a point, extra steps add time, not quality — and can over-sharpen. Quality depends on model, conditioning, guidance and prompt together; steps are one dial of several.',
          },
        ],
        exam: {
          question:
            'Explain the diffusion training objective and the diffusion sampling procedure in one paragraph each. Why is this approach more stable to train than a GAN?',
          answer:
            'Training: take a real image, progressively add Gaussian noise to a randomly chosen timestep, and train a network to predict the added noise (or equivalently the clean image) given the noisy version, conditioned on text. The loss is a simple regression — never a game. Sampling: start from pure Gaussian noise and iteratively apply the learned denoiser over 20–50 steps to reveal an image. Stability follows because the network is trained on a fixed, well-defined corruption process with a plain regression loss; a GAN instead trains two networks in a minimax equilibrium that is fragile — imbalance causes mode collapse or divergence — and offers no likelihood to monitor. Diffusion trades that fragility for slower, iterative sampling, which modern samplers and latent-space tricks have made affordable.',
          source: 'Standard generative-models exam question (GAN vs diffusion comparison) and ML research-screen favourite.',
        },
        summary: [
          'GAN = generator vs discriminator minimax game: sharp samples, unstable training, mode collapse.',
          'VAE = encode to a regularised latent bottleneck and reconstruct: smooth latent space, blurry samples, still the compressor inside modern pipelines.',
          'Diffusion = add noise in training, learn to predict it, then iterate denoising at sampling time — stable regression, controllable steps.',
          'Production text-to-image is hybrid: VAE latent + text-conditioned denoiser + optional adversarial polish.',
          'Lineage is ancestry, not ranking: components of all three live inside today\'s tools; as of 2026, flow-matching variants shorten the same loop.',
        ],
      }),
      [
        [
          'The characteristic failure mode of GANs called "mode collapse" means:',
          [
            'The generator produces one narrow kind of output that keeps fooling the discriminator',
            'The discriminator memorises the training set',
            'The model runs out of GPU memory',
            'Images collapse to pure noise',
          ],
          0,
          'The game rewards fooling the critic, not covering the data — so the generator finds one safe output and iterates on it.',
        ],
        [
          'VAE samples traditionally look blurry mainly because:',
          [
            'The images are stored at low resolution',
            'The lossy latent bottleneck plus pixel-wise averaging hedges across plausible reconstructions',
            'The discriminator is too weak',
            'Too many denoising steps are applied',
          ],
          1,
          'Reconstruction losses over many plausible outputs produce their average — the classic blurry VAE look.',
        ],
        [
          'In a diffusion model, the neural network is trained to predict:',
          [
            'The class label of the image',
            'The noise added to a noisy image at a given timestep (optionally conditioned on text)',
            'The discriminator\'s score',
            'The final image in one pass',
          ],
          1,
          'One simple regression target — noise prediction — trained across all noise levels, then iterated at sampling.',
        ],
        [
          'A modern latent text-to-image pipeline typically uses:',
          [
            'A GAN alone, with no autoencoder',
            'A VAE to compress pixels into a latent grid, a text-conditioned denoiser in that latent space, and a decoder to pixels',
            'A pure VAE with no denoising',
            'Byte-pair tokenization of the image',
          ],
          1,
          'The ancestors became components: VAE compression, diffusion denoising, often an adversarial loss for crispness.',
        ],
      ]
    ),
    lesson(
      M1,
      'gae-1-3',
      3,
      'The Transformer: One Architecture for All of Generative AI',
      'Self-attention, the residual stack, and why the same block powers chatbots, image generators, speech models and code assistants.',
      18,
      nineBlocks({
        objectives: [
          'Describe the transformer block: token mixing by self-attention plus channel mixing by feed-forward layers, stacked with residual connections',
          'Distinguish encoder-only, decoder-only and encoder-decoder variants and name a current use for each',
          'Explain two reasons transformers scaled where recurrent networks stalled',
          'Map a new modality (time series, molecules, audio) onto the transformer recipe: tokenize, choose an objective, choose a variant',
        ],
        hook:
          'Ask which architectures power: the chatbot answering you, the image you generated this morning, the transcription of yesterday\'s lecture, and the code autocomplete in your editor. The honest answer, as of 2026, is "basically one": a stack of transformer blocks with different tokens, objectives and heads bolted on. BERT for your search re-ranker, GPT-style decoder for chat, a vision transformer inside a diffusion model for images, a Conformer-flavoured encoder for speech — same skeleton, four jobs. This lesson is the skeleton.',
        concept: `**The block, in one pass.** A transformer processes a sequence of tokens (words, image patches, audio frames). Each token starts as an embedding plus positional information (an ID-to-vector lookup, Lesson 2.2, plus "you are position 17"). Then it enters a repeating block with two jobs. **Self-attention** lets every token look at every other token and compute a relevance-weighted blend of their information — content-based, not distance-based, computed for all positions in parallel. **The feed-forward network** then transforms each token's representation independently — the "think about what you gathered" step. A residual connection (add the input back to the output) and layer normalisation keep signals flowing across dozens of layers. Stack 30–90 such blocks and you get progressively more abstract per-token representations, ending in a projection to vocabulary logits (for generation) or to a task head (for classification).

**Three variants, one recipe.** *Encoder-only* (BERT lineage): bidirectional attention — every token sees both sides — trained by masking tokens and predicting them. It never generates; it produces rich representations, which is why it still runs search re-rankers, semantic-similarity encoders and classic NLU classifiers. *Decoder-only* (GPT, Llama, Claude, Gemini-class chat models): causal attention — each token sees only the left — which is exactly the next-token prediction shape. This variant won the assistant era because generation *is* its native mode, and because a single clean architecture scales predictably. *Encoder-decoder* (T5, BART): a bidirectional encoder feeds a causal decoder — natural for sequence-to-sequence jobs (translation, summarisation); less dominant now that prompt-only decoder-only models absorbed most tasks.

**Why they beat recurrence.** Old RNN/LSTM models shuffled information through a chain: a fact from token 1 had to survive 500 transformations to matter at token 500, and training could not parallelise over sequence positions (each step depended on the last). Transformers give every token a direct computational path to every other in one step, and — critically for the scaling era — **train all positions simultaneously**: a 100k-token document is one parallel matrix operation per layer, not 100k sequential ones. The bill is attention's quadratic cost in sequence length, which is why long contexts are expensive (Lesson 3.3) — a cost the field keeps paying because the benefits dominate.

**Beyond text: the same block, everywhere.** Vision: cut an image into 16×16 patches, treat each as a token (ViT), classify or generate. Inside image generators: modern diffusion uses a transformer denoiser (DiT) over latent patches rather than a pure convolutional net. Speech: chunk mel-spectrograms into frames and attend over them (Whisper-style encoders, Conformer hybrids). Code and math: still tokens — code has a next token. Even time series and molecules get the treatment after sensible tokenization. The recipe never changes: **decide what a token is, pick an objective (masked / autoregressive / denoising), pick a variant, scale.** As of 2026, attention remains the default even as efficient-attention and state-space (Mamba-style) architectures nibble at its edges — plan for transformers, watch the alternatives.`,
        extras: [
          table(
            'One architecture, three variants',
            ['Variant', 'Attention pattern', 'Typical objective', 'Where you meet it'],
            [
              ['Encoder-only (BERT-style)', 'Bidirectional — sees both sides', 'Masked-token prediction', 'Search re-ranking, embeddings, NLU classifiers'],
              ['Decoder-only (GPT/Llama-style)', 'Causal — left context only', 'Next-token prediction', 'Chat assistants, codegen, agents, tool calling'],
              ['Encoder-decoder (T5-style)', 'Bi-encoder into causal decoder', 'Corrupted-text reconstruction', 'Translation, classic summarisation, some speech models'],
            ],
          ),
          tip(
            'The three-question modality test',
            'Faced with a new data type: (1) what is one token? (2) what is the training objective? (3) which variant? Answer those and you have sketched the system — this is how time-series and audio models were built from the NLP playbook.',
          ),
          info(
            'Why "attention is all you need" aged',
            'The 2017 title was about removing recurrence, not about attention being magic: the win was parallel training plus short gradient paths. Those two properties — not the name of the mechanism — are what made internet-scale training economically viable.',
          ),
        ],
        worked: {
          title: 'Design a transformer for a modality you have never seen: weekly power-consumption series',
          problem:
            'A utility has 2 years of hourly smart-meter readings per household (17,520 numbers each) and wants (a) anomaly alerts and (b) next-week forecasts. Sketch the full transformer recipe: tokenization, objective, variant, heads, and the reason each choice follows.',
          steps: [
            {
              title: 'Step 1 — decide what a token is',
              desc: 'Two workable options: (i) each hour is one token whose embedding is [value, hour-of-day, day-of-week, season] — sequence length 17,520 (chunk into 1-week windows of 168 tokens); or (ii) patch a week into 24 coarse tokens of 7 hours each. Choose (i) for clarity: token = one hour with calendar features attached.',
              code_snippet: 'token_t = embed(value_t) + embed(hour_t) + embed(dow_t) + embed(month_t)',
            },
            {
              title: 'Step 2 — pick the objective',
              desc: 'Forecasting = autoregressive (predict next tokens from left context) or masked-span prediction (hide future hours, reconstruct them). For alerts, add a masked reconstruction loss: an anomaly is a future hour the model cannot reconstruct well — no labels needed.',
              code_snippet: 'loss = next_hour_prediction  (+ masked_future_reconstruction for anomaly scoring)',
            },
            {
              title: 'Step 3 — pick the variant',
              desc: 'Decoder-only causal stack (GPT-style) for forecasting; the same backbone with a masked objective serves the anomaly head. Encoder-decoder is defensible for multi-step horizons, but a single causal model with an output head keeps serving simple.',
            },
            {
              title: 'Step 4 — heads, eval, and the honest caveats',
              desc: 'Regression head for the next value (and quantiles for intervals); anomaly score = reconstruction error threshold calibrated on clean weeks. Evaluate on a held-out season (holidays shift the distribution), and remember: the transformer learns patterns, not physics — a cold snap outside its training years can still fool it, exactly like an LLM\'s knowledge cutoff.',
            },
          ],
          solution:
            'Hour-plus-calendar tokens, causal + masked objectives, decoder-only backbone, regression/anomaly heads, seasonal hold-out. The same four decisions built BERT, GPT, Whisper and DiT — the recipe is the transferable skill.',
        },
        practice: {
          title: 'Reverse-engineer five tools',
          prompt:
            'Pick five AI tools you know (chat, image gen, transcription, autocomplete, spam filter). For each, guess: variant (encoder-only / decoder-only / encoder-decoder / other), token type, and objective. Circle the two you are least sure about and say what experiment would reveal the answer (e.g. can it generate? can it see both directions of context?).',
          hint: 'If the tool never produces output text token-by-token, encoder-only is a strong bet; if it streams generation, it is a causal decoder.',
        },
        mistakes: [
          {
            mistake: 'Thinking attention only exists inside LLMs',
            fix: 'Transformers run speech recognition, image classification, diffusion denoisers, recommendation re-rankers and protein models. LLMs are one variant serving one objective.',
          },
          {
            mistake: 'Assuming BERT-style models were replaced by LLMs',
            fix: 'Bidirectional encoders still dominate embedding and re-ranking duties: they see both directions, are cheaper than generators, and output vectors instead of text.',
          },
          {
            mistake: 'Believing transformers "read" like humans — full document at once, understandingly',
            fix: 'They compute relevance-weighted mixes of token representations per layer. Coherence emerges from that computation plus training data statistics, not from a comprehension faculty.',
          },
          {
            mistake: 'Expecting attention cost to scale gently with context',
            fix: 'Standard attention is quadratic in sequence length during prefill: doubling the document roughly quadruples that work. Long-context features are a compute decision, not a checkbox.',
          },
        ],
        exam: {
          question:
            'Why did transformers replace recurrent architectures for large-scale language modelling? Answer with respect to (a) long-range dependencies and (b) training efficiency.',
          answer:
            '(a) Long-range dependencies: in an RNN, information from token 1 must pass through every intermediate state to influence token 500; vanishing signals make those paths unreliable. Self-attention creates a direct computational path between every pair of tokens in one step, with relevance determined by content rather than distance, so a pronoun can connect to its antecedent regardless of separation. (b) Training efficiency: recurrence is inherently sequential over positions — you cannot compute step t until step t−1 finishes — which caps data parallelism. Attention computes all positions at once, so batches and hardware are saturated and models can be trained on trillion-token corpora economically. The trade-off is quadratic cost in sequence length, which modern implementations (FlashAttention-style kernels, GQA, sliding windows) mitigate but do not erase.',
          source: 'The canonical "transformers vs RNNs" interview question across ML and LLM roles.',
        },
        summary: [
          'The transformer block = self-attention (mix information across tokens) + feed-forward (think per token), repeated with residuals and norms.',
          'Encoder-only = bidirectional representations (retrieval, NLU); decoder-only = causal generation (assistants); encoder-decoder = sequence-to-sequence.',
          'Transformers won on two levers: direct token-to-token paths and full-sequence parallel training — at the price of quadratic attention cost.',
          'Any modality can be transformerised: define tokens, choose masked/autoregressive/denoising objective, choose a variant, scale.',
          'As of 2026 attention is still the default; efficient-attention and state-space models are challengers, not replacements.',
        ],
      }),
      [
        [
          'The two core operations inside a standard transformer block are:',
          [
            'Pooling and dropout',
            'Self-attention across tokens and a per-token feed-forward network',
            'Convolution and recurrent gating',
            'Clustering and PCA',
          ],
          1,
          'Attention mixes information across positions; the feed-forward layers transform each position independently — stacked with residuals and norms.',
        ],
        [
          'A BERT-style encoder-only model is unsuited to free-form generation mainly because it:',
          [
            'Is too small',
            'Uses bidirectional attention and a masked-token objective, so it has no autoregressive left-to-right generation mode',
            'Has no embedding layer',
            'Cannot process English',
          ],
          1,
          'Its training shape produces representations, not a causal next-token loop — which is why it lives in retrieval and classification.',
        ],
        [
          'Compared with RNNs, transformers train faster at scale primarily because they:',
          [
            'Use fewer parameters',
            'Compute all sequence positions in parallel instead of stepping through them sequentially',
            'Require no labelled data',
            'Skip the softmax',
          ],
          1,
          'Position-wise parallelism saturates GPUs — the economic unlock behind trillion-token pretraining.',
        ],
        [
          'To apply a transformer to images, the standard move (ViT-style) is to:',
          [
            'Feed raw pixels one by one as characters',
            'Split the image into patches and treat each patch as a token',
            'Convert the image to English prose first',
            'Only use a discriminator',
          ],
          1,
          'Patch tokenization turns vision into a sequence problem — the recipe that also underlies diffusion transformers.',
        ],
      ]
    ),
    lesson(
      M1,
      'gae-1-4',
      4,
      'Foundation Models and the Modality Map',
      'Train once, adapt everywhere: what a foundation model is, how each modality is tokenised and generated, and what "multimodal" really claims about a product.',
      19,
      nineBlocks({
        objectives: [
          'Define a foundation model in terms of broad pretraining plus many downstream adaptations',
          'Build a modality map: for text, image, audio, video and code, name the token representation and the generation objective',
          'Distinguish input multimodality, output multimodality and interleaved/omni behaviour with a concrete example of each',
          'Audit a product\'s "multimodal" marketing claim and classify what it actually supports',
        ],
        hook:
          'A vendor page announces: "our assistant is multimodal." Read the fine print and it accepts images and text but only returns text. Another claims video understanding, meaning it samples 1 frame per second and captions them. Meanwhile a live-voice assistant genuinely speaks, listens, and shows images mid-sentence. Same word, three very different systems. In this lesson you learn to decode that word — and the broader map of how foundation models cover text, image, audio, video and code.',
        concept: `**Foundation model = pretrain once, adapt many times.** The term names a training *strategy*, not a size: one model is pre-trained on broad, mostly unlabelled data spanning a domain (the internet, code repositories, image-caption pairs), acquiring general capabilities; then it is adapted cheaply to dozens of downstream jobs — by prompting, by in-context examples, by lightweight fine-tuning, by adding heads. Before this pattern, you trained a separate model per task (one sentiment model, one summariser, one tagger). Foundation models invert the economics: the expensive general learning is amortised across every product built on top, and adaptation costs a prompt rather than a training run. The same weights serve as assistant, extractor, tutor and reviewer — which is also why their failure modes travel with you from task to task.

**The modality map.** Every modality is handled by the same three moves: represent it as tokens (or continuous equivalents), choose an objective, decode back.

- **Text**: tokens are BPE subword IDs; objective is next-token prediction; decoding is sampling (Lesson 2.3). The reference implementation of the whole recipe.
- **Code**: still text tokens, but the corpus is repositories and the objective inherits execution semantics — code that compiles and passes tests is more frequent in the data than random token soup. Tool-added execution (running the code) is scaffolding around the model, not the model itself.
- **Image**: pixels are compressed by an autoencoder into a latent grid, then cut into latent patches (tokens); the objective is denoising (diffusion/flow) or sometimes autoregressive patch prediction; decoding runs the denoiser and the pixel decoder (Lesson 4.1).
- **Audio**: waveforms become mel-spectrogram frames or discrete codec tokens from an neural codec model; speech-to-text is encoder-decoder transcription, text-to-speech is a conditioning-then-vocoder pipeline, and music/voice generation conditions a generative model on text or a reference voice (Lesson 4.3).
- **Video**: the token explosion — a second of 24 fps video is 24 frames, each latent-patchable, plus optional audio tokens. Objectives add *temporal* consistency on top of per-frame denoising; decoding is expensive enough that clip length, resolution and cost are first-class constraints (Lesson 4.4).

**What "multimodal" actually means.** Three distinct claims, often blurred: (1) **multimodal input** — the model accepts images, audio or PDFs alongside text and fuses them into one context (vision-language models; you see it as "upload a screenshot and ask"). (2) **multimodal output** — it can produce non-text: an image, speech audio, a rendered chart. (3) **interleaved / omni** — the hard one: output alternates modalities within one turn ("here is the chart" + generated image + spoken narration), usually requiring every modality to be tokenised into the *same* sequence so one decoder handles all of it, with real-time streaming for voice. Cross-modal understanding (captioning an image, transcribing audio) is input-side; cross-modal generation is output-side. A product that only transcribes audio is multimodal-*input*. The word is real; the fine print decides which of the three you bought. As of 2026 the frontier labs ship omni-style voice models while most enterprise "multimodal" features mean images-in, text-out — audit before you architect.`,
        extras: [
          table(
            'Modality map: representation, objective, decode',
            ['Modality', 'Token representation', 'Objective', 'Example product behaviour'],
            [
              ['Text', 'BPE subword IDs', 'Next-token prediction', 'Chat, translation, summarisation'],
              ['Code', 'Text tokens from code corpora', 'Next-token (+ execution feedback as scaffolding)', 'Autocomplete, test generation'],
              ['Image', 'VAE latent patches', 'Denoising / flow matching', 'Text-to-image, image editing'],
              ['Audio', 'Spectrogram frames or codec tokens', 'Transcription / conditional generation', 'ASR captions, TTS voice, music'],
              ['Video', 'Temporal latent patches (+ audio)', 'Temporal denoising with consistency pressure', 'Text-to-video clips, video captioning'],
            ],
          ),
          warn(
            '"Multimodal" without an output modality is half a claim',
            'Most assistants today are multimodal-input, text-output. If your use case needs the model to *speak back* or *draw*, verify output modality, latency, and whether modalities interleave in one turn or are separate API calls stitched by your code.',
          ),
          tip(
            'Architect to the token boundary',
            'When products stitch modalities (transcribe → summarise → speak), your code owns the seams: timestamps, formats and error handling between stages. Native omni models move those seams inside the model — fewer failure points, less control.',
          ),
        ],
        worked: {
          title: 'Audit a "multimodal assistant" claim before you build on it',
          problem:
            'A startup demo shows "the world\'s first multimodal tutor": upload a photo of a handwritten physics problem, get a typed solution, then hear a spoken explanation with a redrawn diagram. Decompose the claim into input/output/interleaved requirements, decide which parts need which modality machinery, and flag what you must verify before committing the product roadmap.',
          steps: [
            {
              title: 'Step 1 — split the flow into modality hops',
              desc: 'Hop A: image + text in → typed solution (multimodal INPUT, vision-language model). Hop B: solution → speech (text-to-audio OUTPUT: TTS pipeline or an omni model with audio out). Hop C: redrawn diagram (image OUTPUT: diffusion model or programmatic plotting). Hop D: spoken explanation synced to the diagram (INTERLEAVED — the hard part).',
            },
            {
              title: 'Step 2 — decide native vs stitched',
              desc: 'If one omni model natively emits text + audio in one stream, Hop B merges into Hop A but the diagram likely still needs a separate image call (or code-generated plot). Most 2026 stacks are stitched: your backend orchestrates vision-LM → TTS → image gen, owning latency, caching and failure handling at every seam.',
            },
            {
              title: 'Step 3 — verify the fine print',
              desc: 'Questions to send the vendor: (1) does the model accept images natively or via OCR? (2) audio output: streaming or batch file? (3) any interleaved mode, or only sequential API calls? (4) rate limits and latency per hop? (5) handwriting quality on non-Latin scripts? Each answer changes feasibility more than the word "multimodal" ever did.',
            },
            {
              title: 'Step 4 — restate the roadmap honestly',
              desc: 'Write it back as: "vision-LM input (images) + separate TTS and image-generation outputs, orchestrated by our backend" — or "native omni, but diagram generation is separate". Now latency budgets, cost models and failure modes are visible. The marketing word never gave you that.',
            },
          ],
          solution:
            'Four modality hops: image-in/text-out (input multimodal), TTS and image-gen (output multimodal), and a sync requirement (interleaved). The audit converts a slogan into an architecture with verifiable vendor questions and explicit orchestration seams.',
        },
        practice: {
          title: 'Draw your own modality map',
          prompt:
            'For three tools you use (e.g. a chat assistant, a note app with AI, a video platform), fill a mini table: accepted input modalities, produced output modalities, whether modalities interleave within one response, and one thing you would need to verify before building a feature on it. Then write one sentence defining "multimodal" that would survive a skeptical engineer\'s cross-examination.',
          hint: 'Test a tool by uploading an image and asking it to *return* an image or audio — not just to describe it. Input and output asymmetry is where claims hide.',
        },
        mistakes: [
          {
            mistake: 'Equating "foundation model" with "the largest model available"',
            fix: 'It names a strategy — broad pretraining plus cheap adaptation — not a parameter count. Many small models qualify; some huge ones are single-purpose.',
          },
          {
            mistake: 'Assuming a multimodal input model can also generate that modality',
            fix: 'Vision-language models typically read images and write text. Producing images or speech needs different machinery (decoders/generators) — always check both directions.',
          },
          {
            mistake: 'Thinking video models are "just image models run in a loop"',
            fix: 'Consistency over time — identity, lighting, physics — requires temporal modelling and is the dominant cost and failure source (Lesson 4.4).',
          },
          {
            mistake: 'Believing code is a wholly separate modality with its own non-text machinery',
            fix: 'Code is text tokens; what differs is the corpus and the evaluation signal (execution). Treating it as text keeps the whole token/sampling mental model in force.',
          },
        ],
        exam: {
          question:
            'Define "foundation model" and distinguish multimodal input from multimodal output, giving one example of each and one example of interleaved behaviour.',
          answer:
            'A foundation model is a model pretrained on broad, general data to acquire widely reusable capabilities, then adapted to many downstream tasks cheaply (prompting, in-context examples, light fine-tuning) rather than trained per task — the economics are "expensive general training, amortised across products". Multimodal input means the model consumes non-text modalities (e.g. an image of a chart plus a text question, answered in text). Multimodal output means it produces non-text (e.g. generating an image from a caption, or synthesising speech from text). Interleaved behaviour — the strongest claim — means multiple modalities appear within a single response turn, such as an answer that mixes sentences, a generated diagram and spoken narration in one stream, which generally requires all modalities encoded into one token sequence handled by a unified decoder. Auditing which of the three a product actually supports is the practical skill: most assistants today are strong on input, text-only on output.',
          source: 'Common product-design and ML-fundamentals question: "what exactly do you mean by multimodal?"',
        },
        summary: [
          'Foundation models invert the economics: pay once for broad pretraining, adapt per task with prompts or light fine-tuning.',
          'Every modality follows the same recipe: tokenize → objective → decode; text/BPE next-token is the reference case.',
          'Code is text with a better corpus and execution signals; images are latent patches with denoising; audio uses frames/codec tokens; video adds temporal consistency and cost.',
          '"Multimodal" hides three claims: multimodal input, multimodal output, interleaved/omni output — read the fine print.',
          'When modalities are stitched by your backend, the seams (latency, formats, failures) are your engineering problem.',
        ],
      }),
      [
        [
          'A foundation model is best described as:',
          [
            'The largest model a lab has trained',
            'A broadly pretrained model adapted cheaply to many downstream tasks via prompting or fine-tuning',
            'A model that has been fine-tuned on foundation-stone data',
            'Any model with more than 100B parameters',
          ],
          1,
          'The name describes the pretrain-once/adapt-many strategy, not a size.',
        ],
        [
          'In a modern text-to-image system, images are represented as:',
          [
            'BPE tokens over pixels',
            'Latent patches from an autoencoder, denoised under a text condition',
            'Discrete MP3 frames',
            'One token per pixel colour',
          ],
          1,
          'Autoencoder latent compression plus patch tokenisation keeps sequence lengths tractable for the denoiser.',
        ],
        [
          'An assistant that accepts photos and PDFs but only ever replies with text is:',
          [
            'Fully multimodal',
            'Multimodal on input only, with text-only output',
            'Not a foundation model',
            'An encoder-decoder model',
          ],
          1,
          'Input and output multimodality are separate claims; this one supports only the input side.',
        ],
        [
          'Interleaved (omni) multimodal behaviour means the model can:',
          [
            'Accept several file uploads at once',
            'Emit different modalities within a single response stream — text, audio and images in one turn',
            'Switch languages automatically',
            'Run on several GPUs simultaneously',
          ],
          1,
          'One response containing several modalities in sequence — the strongest form of the claim, requiring unified tokenisation or orchestration.',
        ],
      ]
    ),
  ],
};
