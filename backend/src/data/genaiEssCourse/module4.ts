// Module 4 — Image, Audio & Video Generation
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code } from '../nineBlocks';
import { lesson, M4, COURSE_ID } from './helpers';

export const module4: CourseModule = {
  id: M4,
  course_id: COURSE_ID,
  title: 'Module 4 — Image, Audio & Video Generation',
  summary:
    'Diffusion knobs with real mechanics (noise prediction, steps, guidance scale), image prompting as a system of levers, the speech pipeline end to end (ASR, TTS, cloning and its consent problem), video\'s constraints, and structured outputs — boxes, captions, JSON — across modalities.',
  sort_order: 4,
  lessons: [
    lesson(
      M4,
      'gae-4-1',
      1,
      'Diffusion Mechanics: From Noise to Image',
      'What the denoiser actually predicts, how steps trade time for quality, and what guidance scale really does to your image and your patience.',
      19,
      nineBlocks({
        objectives: [
          'Describe diffusion training (noise addition, noise prediction) and sampling (iterative denoising) with the roles of text conditioning',
          'Compute generation time and cost for a given step count, resolution and GPU rate',
          'Explain classifier-free guidance as an extrapolation between conditional and unconditional noise predictions',
          'Choose steps, guidance and resolution settings for three quality/latency requirements',
        ],
        hook:
          'Every serious image generator hands you the same mystery panel: Steps 20–50, CFG 3–10, a sampler dropdown nobody understands, and a resolution picker. Turn CFG to 11 and the image goes plastic-bright with burnt edges; drop it to 2 and the model wanders off your prompt. Push steps to 80 and wait, seeing almost no difference from 30. These are not vibes — each maps to a specific term in the denoising loop you met in Lesson 1.2. This lesson makes the panel legible.',
        concept: `**The network\'s single job.** A diffusion model is trained on one regression: given a noisy version of an image at noise level t (plus a text condition), predict the noise that was added. Text enters through cross-attention — the denoiser attends from image latents to the text tokens — so "a red bicycle" biases the noise prediction toward latent patterns that decode to bicycles, red ones. Nothing else happens at sampling time except applying this learned direction over and over.

**Sampling is iteration, and steps are the dial.** To generate: start from pure Gaussian noise in the latent space, ask the network for its noise estimate, move a fraction of the way against that estimate (the fraction is set by the sampler — Euler, DPM++-class solvers, and as of 2026 flow-matching/rectified-flow samplers take fewer, larger steps), repeat until step budget is spent, then decode the clean latent to pixels through the VAE decoder. More steps means more corrections: quality improves quickly at first, then saturates — beyond a model-dependent point (often ~25–40 for classic samplers, fewer for flow-based ones), extra steps are latency you buy for nothing, or slight over-sharpening. Latency is roughly linear in steps at fixed resolution, and heavily resolution-dependent (latent area grows with pixels).

**Guidance scale: pulling the prediction toward your words.** Classifier-free guidance (CFG) runs the denoiser twice per step — once with the text condition, once without — and extrapolates: noise_pred = noise_uncond + s × (noise_cond − noise_uncond). At s = 1 you get the conditional prediction itself; higher s amplifies the *direction* that text adds, making the image adhere more literally to the prompt — with side effects: diversity collapses (high s = the model\'s "safe" interpretation of your words), colours oversaturate, textures burn, and artifacts appear as the extrapolation pushes the latent off the natural-image manifold. Low s (2–4) yields loose, dreamy interpretations; mid (4–7) is the usual working band; some tools relabel or automate this (stylize-like flags, prompt-adherence controls). The knob names differ per product as of 2026, but the tension is universal: **fidelity to prompt versus freedom and naturalness**.

**What actually costs time.** Per image ≈ steps × per-step time at a given resolution; per-step time scales with latent area (a 1536×1024 generation costs meaningfully more than 512×512) and with batch size and hardware. Latent diffusion (the VAE compression from Lesson 1.2) is why interactive generation is possible at all — pixel-space diffusion of the same quality would be orders of magnitude slower. For production, the levers order predictably: reduce steps to the quality floor, keep guidance mid-band, pick the lowest resolution that meets the output spec, and only then add batch or faster hardware. As of 2026, distilled/few-step models (1–8 step variants of major open lines) have made "quality in under a second" real for some styles — check whether your pipeline can adopt them before optimizing an old schedule forever.`,
        extras: [
          table(
            'Knobs, mechanics, and failure signatures',
            ['Knob', 'Mechanical effect', 'Symptom when pushed too far'],
            [
              ['Steps', 'Number of denoise corrections', 'Time waste past the quality floor; slight over-sharpening'],
              ['Guidance (CFG)', 'Strength of text-direction extrapolation', 'Burnt colours, plastic texture, collapsed diversity'],
              ['Resolution', 'Latent area — compute per step', 'Quadratic-ish cost jump; occasional anatomy/coherence breaks off native ratios'],
              ['Sampler', 'How the ODE/flow is integrated per step', 'Wrong pairings give mush or noise at low step counts'],
              ['Seed', 'Starting noise draw', 'Reproducibility — same seed + settings ≈ same image'],
            ],
          ),
          info(
            'Flow matching changed the schedule, not the story',
            'SD3/FLUX-class training (as of 2026) shortens denoising trajectories — fewer steps for the same quality — but the UI still exposes steps, adherence and seeds. Learn the mechanism once; re-skin it per tool.',
          ),
          tip(
            'Optimize in the right order',
            'Steps down to the quality floor first (biggest time lever), then resolution to spec, then guidance for taste, then sampler choice. Tweaking samplers while running 60 steps at max resolution is optimizing the wrong term.',
          ),
        ],
        worked: {
          title: 'Configure and price a product-shot generation pipeline',
          problem:
            'An e-commerce studio generates pack shots on white: 1024×1024, must match the product catalogue look (crisp, neutral). Reference GPU does 1.2 s/step at this resolution; GPU costs $0.50/hr. (1) Pick initial settings and compute time and cost per image. (2) Propose a 20-step variant and quantify the saving. (3) Predict the visual difference between guidance 3, 6 and 9 for this brief. (4) State the production policy you would ship.',
          steps: [
            {
              title: 'Step 1 — initial configuration',
              desc: 'Settings: steps 30, guidance 6, native 1024×1024, default flow sampler, per-shot prompt template. Time: 30 × 1.2 s = 36 s/image. Cost: 36/3600 hr × $0.50 = $0.005/image.',
              code_snippet: '30 steps * 1.2 s = 36 s\n36 / 3600 * $0.50 = $0.005 / image',
            },
            {
              title: 'Step 2 — the 20-step variant',
              desc: '20 × 1.2 = 24 s → $0.0033/image — a 33% time and cost cut. On flow-based samplers the visual gap at 20 vs 30 is often minor for clean product shots; verify on a 20-image A/B (same seeds) before adopting. At 10 steps you typically start losing fine label text and edge crispness — that is your floor.',
            },
            {
              title: 'Step 3 — guidance sweep for this brief',
              desc: 's ≈ 3: product present but colours drift, background occasionally invents props — fails catalogue fidelity. s ≈ 6: prompt followed, neutral palette holds, textures natural — the working band. s ≈ 9: hyper-adherent but plasticky highlights, oversaturated labels, occasional halo artifacts — looks "AI", wrong for a catalogue.',
            },
            {
              title: 'Step 4 — production policy',
              desc: 'Ship: 20 steps (validated), guidance 5.5–6.5, fixed seeds per SKU family for consistency, negative prompt excluding "text overlay, watermark, props". Re-benchmark monthly against a small golden set of SKUs — model updates move the quality floor, and a pinned seed on an updated model is no longer the same image.',
            },
          ],
          solution:
            '30-step baseline: 36 s, $0.005/image; validated 20-step: 24 s, $0.0033 (−33%); guidance sweet spot ≈ 6 for catalogue fidelity; ship with pinned seeds and a golden-set re-benchmark. Knobs turned from folklore into a priced configuration.',
        },
        practice: {
          title: 'Run a knob grid',
          prompt:
            'With any diffusion tool that exposes steps and guidance (or a hosted clone): fix one prompt and seed, then generate a grid — steps {10, 30, 50} × guidance {3, 7, 11}. Annotate each cell in one line: adherence to prompt, texture quality, artifacts. Write three sentences naming your quality floor and the exact setting you would ship for a professional brief. If no tool is available, design the same grid on paper: predict each cell\'s failure signature from the mechanics.',
          hint: 'Look for the saturation cliff: guidance 11 often shows burnt colour and haloing well before any other knob misbehaves.',
        },
        mistakes: [
          {
            mistake: 'Raising guidance to "make the prompt work"',
            fix: 'Guidance amplifies the text direction, not the model\'s understanding. Past the mid-band you buy adherence with naturalness and diversity. Fix weak prompts by rewriting them (Lesson 4.2), not by cranking s.',
          },
          {
            mistake: 'Treating 80 steps as a quality strategy',
            fix: 'Quality saturates; beyond the floor you pay latency, sometimes over-sharpen. Find the floor with a same-seed sweep and stop there — or adopt a distilled few-step model.',
          },
          {
            mistake: 'Confusing sampler names with model quality',
            fix: 'Samplers are integrators for the same learned field; differences are step-efficiency and noise behaviour. The model, conditioning and prompt dominate outcomes.',
          },
          {
            mistake: 'Expecting seed reproducibility across model updates',
            fix: 'A seed reproduces an image only with identical model version, settings and code path. Pin the model version too, or the seed is decorative.',
          },
        ],
        exam: {
          question:
            'Explain classifier-free guidance in diffusion sampling. What happens to an image as the guidance scale increases from 1 to very high values, and why?',
          answer:
            'At each denoise step the model predicts noise twice: conditionally (with the text prompt) and unconditionally (no text). CFG combines them as noise = noise_uncond + s × (noise_cond − noise_uncond), extrapolating away from the unconditional prediction toward (and beyond) the conditional one. At s = 1 you sample the plain conditional model; as s grows, the sampled trajectory adheres more literally to the prompt — objects, colours and attributes mentioned get forced in. At very high s the extrapolation leaves the distribution of natural images: colours oversaturate, textures become plastic, edge halos and artifacts appear, and sample-to-sample diversity collapses because every draw is dragged to the model\'s single most stereotypical interpretation of the prompt. That is why working defaults sit in a mid band (roughly 4–7 in classic parameterisations): enough adherence to honour the prompt, not so much that the latent trajectory is distorted off the image manifold.',
          source: 'Common diffusion-mechanics exam question; also asked in creative-tooling engineering interviews.',
        },
        summary: [
          'One trained function: predict noise given noisy latents + text conditioning; sampling applies it iteratively from pure noise.',
          'Steps = number of corrections: quality saturates, latency is linear — find the floor with same-seed sweeps.',
          'CFG extrapolates between unconditional and conditional noise prediction: adherence up, naturalness and diversity down past the mid-band.',
          'Resolution drives per-step cost via latent area; latent diffusion is what makes interactive generation affordable.',
          'Flow-matching-era models shorten schedules but keep the same conceptual knobs: steps, adherence, seed.',
        ],
      }),
      [
        [
          'During diffusion sampling, each step applies:',
          [
            'A new training update to the network',
            'The learned noise prediction to move the current noisy latent partway toward a cleaner one',
            'A search engine query for similar images',
            'A VAE re-encoding of the prompt',
          ],
          1,
          'Iterative denoising of the latent using the predicted noise direction — the whole sampling loop.',
        ],
        [
          'Classifier-free guidance works by:',
          [
            'Classifying images and rejecting off-prompt ones',
            'Extrapolating between the unconditional and text-conditioned noise predictions to amplify the prompt direction',
            'Raising the temperature of the sampler',
            'Running two diffusion models and averaging their images',
          ],
          1,
          'Two forward passes (with and without text) combined by the guidance scale s.',
        ],
        [
          'Very high guidance scales typically cause:',
          [
            'Faster generation',
            'Burnt saturation, plastic textures, artifacts and collapsed diversity',
            'Higher resolution automatically',
            'Better text rendering',
          ],
          1,
          'The extrapolation pushes latents off the natural-image manifold — adherence bought with naturalness.',
        ],
        [
          'Generation time is most strongly affected by:',
          [
            'The prompt length in words',
            'Step count and resolution (latent area) — time grows with both',
            'The chosen seed only',
            'The file format of the output',
          ],
          1,
          'Steps × per-step compute, where per-step compute scales with latent area — the two multiplicative cost terms.',
        ],
      ]
    ),
    lesson(
      M4,
      'gae-4-2',
      2,
      'Image Prompting Levers: Style, Composition and Negative Prompts',
      'Prompting images as a system: subject, style, composition, lighting, format — the negative channel — and why the same words behave differently across tools.',
      18,
      nineBlocks({
        objectives: [
          'Decompose any image brief into subject, style, composition, lighting and format levers',
          'Write a structured prompt and a targeted negative prompt for a given brief',
          'Map the same intent into three tool dialects (natural language, flag-based, negative-box)',
          'Run a one-variable-at-a-time iteration and articulate what each change taught',
        ],
        hook:
          'Two designers type "a cat astronaut" into two different tools and get a watercolour dream and a glossy 3D render. Neither tool is broken — the tools learned different prompt dialects from different training and different default aesthetics. Meanwhile the third designer, who specifies shot type, lens, lighting and medium — and names what must NOT appear — gets catalogue-consistent results on the third try. Image prompting is not incantation; it is a small, learnable control system. This lesson is the control panel.',
        concept: `**The lever set.** A reliable image prompt is a stack of decisions, roughly in this order: (1) **Subject and action** — what exists, doing what ("a hand-thrown ceramic mug, steam rising"). (2) **Style and medium** — photo vs illustration, art medium, era, reference aesthetics ("studio product photograph", "risograph print"). Policies vary: many tools restrict living-artist names; eras and movements are safer. (3) **Composition** — shot type (close-up, wide, macro), camera angle (eye level, bird\'s-eye), framing (rule of thirds, centred). (4) **Lighting and colour** — golden hour, softbox, rim light, palette. (5) **Format** — aspect ratio, film stock, print style. Prose or comma-separated both work; specificity beats length. Modifier inflation ("8k, ultra-detailed, masterpiece") had outsized effects in earlier diffusion eras and now mostly adds noise — precision outperforms adjective stacking.

**The negative channel.** Generative models render *plausible patterns*, including unwanted ones: extra limbs, watermarks, baked-in text, blur, perspective disasters. Negative prompts (a first-class input in SD/FLUX-dev-style tools; approximated by "--no" flags elsewhere; absorbed into natural-language instructions in fully managed tools like DALL·E/Gemini-class assistants) subtract directions from the conditioning — the mirror of guidance. Good negatives are *specific to the failure you observed* ("text overlay, watermark, extra fingers"), not a ritual list; and negatives never replace the positive description — the model needs to know what you want, not only what you refuse.

**Tool dialects.** The same intent maps differently: natural-language tools (DALL·E/Gemini-class) want full sentences describing the scene; flag-based tools (Midjourney-style) use compact phrases plus parameters like "--ar 16:9", "--style raw", "--no text"; open pipelines (SD/FLUX-class) separate positive prompt, negative prompt, steps, CFG and seed explicitly. Learn the dialect of your production tool; do not paste Midjourney flags into an SD box and blame the model. Beyond text: reference images (style or content conditioning), layout/pose control (ControlNet-style structural conditioning), and regional inpainting give *deterministic* control that prompting alone cannot — when the brief says "exactly this layout", stop fighting language and start conditioning on structure.

**Iteration as method.** Change one lever per generation batch, hold seed when comparing structure, keep a prompt log with screenshots. Prompting quality comes from a hundred small observed cause-effect pairs, not from one magic template — and the fastest way to build that library is disciplined single-variable experiments.

**Consistency across a session.** One prompt is easy; ten matching outputs are the real brief. Two patterns cover most needs: *anchor tokens* — a fixed block of style, palette, medium and format phrases that never changes while the subject clause rotates — and *reference conditioning*, where an approved earlier image is fed back as a style or structure reference so texture and composition stay locked. Some pipelines also expose prompt weighting (emphasising a token\'s influence with per-tool syntax) for when one lever needs to dominate; use it sparingly, because heavy weighting distorts exactly like over-guidance does. When neither anchor nor reference suffices — strict layouts, brand geometry, pose — that is the signal to leave language entirely and condition on structure (masks, edges, depth) as a different input channel.`,
        extras: [
          table(
            'Lever → phrase → effect',
            ['Lever', 'Example phrase', 'What it controls'],
            [
              ['Subject', '"a weathered brass telescope on a map"', 'What exists in the frame'],
              ['Style/medium', '"large-format studio photograph" / "ink-and-wash sketch"', 'Render tradition and texture'],
              ['Composition', '"close-up, low angle, shallow depth of field"', 'Framing and camera language'],
              ['Lighting', '"soft window light, warm rim highlight"', 'Mood and legibility'],
              ['Format', '"--ar 16:9" / "square crop"', 'Aspect ratio and presentation'],
              ['Negative', '"text, watermark, distorted hands"', 'Removes recurring failure modes'],
            ],
          ),
          warn(
            'Text-in-image is still the weak spot',
            'Short labels are increasingly reliable (as of 2026); paragraphs, logos and precise typography still fail often. Plan to overlay real text in your design tool — the generated image is the backdrop, not the typesetter.',
          ),
          tip(
            'Two-pass workflow for production',
            'Pass 1: generate candidates with structure levers held fixed. Pass 2: pick the winner, then inpaint/upscale and overlay real typography. Splitting composition from finishing beats asking one prompt for everything.',
          ),
        ],
        worked: {
          title: 'Turn a vague campus brief into a shippable poster prompt',
          problem:
            'Client: "make a poster for our college hackathon — energetic, techy, works on Instagram and as A3 print." Output needs headline space (you will overlay real text), a hero visual, and two aspect ratios. Produce: a structured prompt, a negative prompt, the format choice per channel, and a three-variant iteration plan.',
          steps: [
            {
              title: 'Step 1 — extract requirements',
              desc: 'Hero visual only (no baked-in headline — overlay later); energetic/techy mood; must crop to 4:5 (Instagram) and A3 portrait print (~1:1.41); consistent series later → keep structure fixed across variants.',
            },
            {
              title: 'Step 2 — compose the positive prompt',
              desc: 'Subject: "a diverse student team huddled around glowing holographic code projections in a modern campus lab". Style: "dynamic editorial photograph, cinematic teal-and-orange palette". Composition: "slightly low angle, shallow depth of field, hero subject right of centre leaving left space clear". Lighting: "practical screen glow, energetic rim light". Format: portrait orientation for the master.',
              code_snippet: 'master (portrait): hero visual, space left clear for headline, cinematic teal-orange',
            },
            {
              title: 'Step 3 — targeted negatives',
              desc: 'Observed failure modes to suppress: baked-in words, watermarks, distorted hands (huddle scenes trigger them), muddy midtones, extreme wide-angle distortion. Negatives: "text, letters, watermark, extra fingers, blurry, murky colours".',
            },
            {
              title: 'Step 4 — dialect + iteration plan',
              desc: 'In a flag tool: add "--ar 4:5 --style raw --no text watermark". In an SD/FLUX pipeline: same tokens in the positive box, negatives in the negative box, guidance ~5–6. Iterate one variable at a time across three seeds: V1 as written; V2 with "golden-hour backlight" swapped for lighting; V3 with composition moved to centre. Pick on brand fit, then crop masters for 4:5 and print, overlaying headline text in your design tool.',
            },
          ],
          solution:
            'A structured prompt (subject/style/composition/lighting/format), specific negatives, dialect-correct parameters, and a one-variable iteration plan with real typography overlaid afterwards — a workflow that reproduces, instead of a sentence that hopes.',
        },
        practice: {
          title: 'The one-lever experiment',
          prompt:
            'Take any image prompt you have used. Generate four variants, changing exactly one lever each time: (A) composition phrase only, (B) style/medium only, (C) lighting only, (D) negatives only (add the four most relevant). Keep everything else fixed — including seed if available. Write six lines mapping cause to observed effect, and revise your original prompt into a v2 that you would actually ship.',
          hint: 'Log the exact strings. Your future self will want the cause-effect table more than the images.',
        },
        mistakes: [
          {
            mistake: 'Writing longer prompts instead of sharper ones',
            fix: 'Every clause competes for conditioning attention. Five precise levers beat twenty stacked adjectives; delete modifiers you cannot justify against a specific failure.',
          },
          {
            mistake: 'Using negatives as a substitute for describing the target',
            fix: 'Negatives subtract directions; they do not specify the scene. "Not ugly" tells the model nothing about what to render — describe what you want, subtract only observed failures.',
          },
          {
            mistake: 'Copying prompt syntax across tool dialects',
            fix: 'Flags, boxes and prose are not interchangeable. Learn the dialect of your production tool; port the *decisions*, not the punctuation.',
          },
          {
            mistake: 'Expecting one prompt to deliver final typography and layout',
            fix: 'Generated text and precise layout remain weak points; plan to overlay real type and composite in a design tool. The model makes the art layer, not the deliverable.',
          },
        ],
        exam: {
          question:
            'You must produce a consistent series of ten brand illustrations. Outline your prompt strategy: which levers you fix, which you vary, how negatives and references are used, and how consistency is maintained across generations.',
          answer:
            'Fix the levers that define the brand: style/medium (one rendering tradition, e.g. "flat vector illustration, limited palette"), lighting/palette tokens, format and aspect ratio, and the negative list for recurring failure modes (text, watermark, photorealism leakage). Vary only the subject across the ten: same syntactic prompt skeleton with a swapped subject clause, so conditioning stays stable. Keep seed fixed per subject family when the tool supports it, and pin the model version — seeds are only reproducible within a version. Use a reference image or style-conditioning feature if the tool offers one: it anchors texture and palette far more tightly than words alone. Iterate with a small golden set: after each generation compare against the first three approved illustrations on palette and line quality before accepting. Finally, standardise post: same upscaler settings, same crop ratios, typography overlaid outside the generator. Consistency in image generation is a pipeline property, not a prompt property.',
          source: 'Common creative-pipeline interview question for design-tooling and content-ops roles.',
        },
        summary: [
          'Structure prompts as levers: subject, style/medium, composition, lighting, format — precision beats adjective stacking.',
          'Negative prompts subtract observed failure modes; they never replace a positive description.',
          'Tool dialects differ (prose vs flags vs separated boxes) — port decisions, not punctuation.',
          'For deterministic layout/brand needs, use reference images and structural conditioning instead of fighting language.',
          'Iterate one variable at a time with a prompt log — that log is the real asset.',
        ],
      }),
      [
        [
          'In structured image prompting, the "composition" lever primarily controls:',
          [
            'The colour palette',
            'Framing and camera language — shot type, angle, subject placement',
            'The file format',
            'The negative list',
          ],
          1,
          'Close-up vs wide, low angle vs eye level, left-of-centre vs centred — the geometry of the frame.',
        ],
        [
          'A negative prompt functions by:',
          [
            'Adding more positive description',
            'Subtracting directions from the conditioning to suppress unwanted patterns (watermarks, extra limbs, blur)',
            'Increasing guidance scale',
            'Cropping the output image',
          ],
          1,
          'It is the mirror operation of guidance — steering away from named failure modes.',
        ],
        [
          'Why does the same prompt text behave differently across tools?',
          [
            'Randomness explains all differences',
            'Tools are trained and post-tuned with different aesthetics and prompt conventions — different dialects and defaults',
            'One tool is always wrong',
            'Different tools use different image resolutions only',
          ],
          1,
          'Prompt dialect is learned per product; port the decisions, not the punctuation.',
        ],
        [
          'For production posters with a headline, the recommended workflow is to:',
          [
            'Demand the model renders the full headline perfectly in one pass',
            'Generate the hero visual without baked-in text, then overlay real typography in a design tool',
            'Use the highest guidance possible to force text',
            'Generate text first and ask for the image around it',
          ],
          1,
          'Text rendering remains the weakest link; separating art from typesetting is the reliable pipeline.',
        ],
      ]
    ),
    lesson(
      M4,
      'gae-4-3',
      3,
      'Speech Pipelines: ASR, TTS and Voice Cloning',
      'The two speech stacks end to end — how audio becomes text and text becomes audio — plus what voice cloning requires, what it enables, and why consent is a technical requirement, not a footnote.',
      19,
      nineBlocks({
        objectives: [
          'Diagram an ASR pipeline from waveform to timestamped text and name two production failure sources',
          'Diagram a neural TTS pipeline from text to waveform and distinguish zero-shot cloning from fine-tuned cloning',
          'Compute a per-meeting cost for a transcribe-and-summarise product from stage-wise prices',
          'Specify a consent and safety control set for any voice-cloning feature',
        ],
        hook:
          'Three voice products on one slide: a meeting assistant that transcribes an hour of mixed English-Hindi discussion; a bank fraudster cloning a CFO\'s voice from a public podcast to approve a transfer; and an accessibility tool giving a losing-among-the-abilities user their own voice back from thirty minutes of archive audio. Same underlying capability — speech-to-text, text-to-speech, voice cloning — three moral universes. Engineering and consent are now the same design problem, and this lesson treats them together.',
        concept: `**ASR (speech-to-text) is a pipeline, not magic.** Audio in: waveform, usually resampled and normalised. Feature stage: the signal is converted to time-frequency representations (mel-spectrograms) — the "image" of sound. Acoustic model: a transformer/conformer-style network (Whisper-class encoder-decoder stacks being the widely known family as of 2026) maps features to token sequences; a decoder emits text, often with word-level timestamps. Post-processing: punctuation restoration, number normalisation ("two point five" → "2.5"), vocabulary biasing for domain terms (product names, medical terminology), and diarization (a separate model deciding *who* spoke when) for multi-speaker scenes. Failure sources to expect: accents and code-switching (Hinglish sentences inside English frames trip models trained mostly on monolingual data), background noise and overlapping speech, and rare proper nouns — which is why timestamps + confidence scores, not raw transcripts, are the production artefact; downstream apps filter and correct against them.

**TTS (text-to-speech) is also a pipeline.** Text normalisation first (expand abbreviations, decide "St." is street or saint, format currency). Then a linguistic/prosody model predicts *how* to say it: duration, pitch contour, emphasis — the difference between a question and a statement. Then an acoustic model produces either mel-spectrograms or, in modern systems, discrete neural-codec tokens (EnCodec/DAC-style), and a vocoder or codec decoder renders the waveform. Modern zero-shot TTS conditions on a *reference voice embedding*: seconds-to-minutes of sample audio are enough to synthesise speech in that voice — which is both the accessibility miracle and the fraud vector. Fine-tuned cloning (trained longer on more enrolled data) gives tighter identity at higher cost. Streaming TTS exists for conversational agents: sentence-clause chunking keeps latency under ~a second after the LLM finishes a phrase.

**Consent is part of the architecture.** Any cloning feature needs: verified enrolment consent (the recorded voice of the person, not an impersonated one), misuse filters on the *text* being synthesised (financial-fraud and blackmail phrasing classes), watermarking or provenance signals where available, audit logs of who cloned what, and revocation (delete the voice print). Laws and norms are evolving quickly as of 2026 — India\'s DPDP framework treats biometric-adjacent personal data seriously, and most platforms ban non-consensual cloning outright — so treat consent gates as product features with the same seriousness as authentication. The engineering maxim: **if your product can clone a voice, your threat model includes that voice authorising a wire transfer.**

**Latency budgets decide the UX shape.** Conversational speech products live and die on the round trip: ASR partials within a second or two, the LLM\'s first phrase within one to two, TTS streaming audio as clauses complete rather than after the full text. Meeting transcription is the forgiving case — minutes are fine — while voice agents are the brutal one: over roughly a second of dead air and users repeat themselves. The architecture move for tight budgets is clause-level pipelining: the LLM emits sentence fragments, TTS renders them immediately, and the next fragment is generated while the current one is still speaking. Every stage\'s latency is budgeted against that human threshold, which is why streaming interfaces (partial ASR, chunked TTS) are not features but requirements.`,
        extras: [
          table(
            'Speech pipeline stages and their failure modes',
            ['Stage', 'What happens', 'Typical failure'],
            [
              ['ASR features', 'Waveform → mel frames', 'Noise, clipping, low sample rates'],
              ['Acoustic model', 'Frames → text tokens (+ timestamps)', 'Accents, code-switching, crosstalk'],
              ['Post-processing', 'Punctuation, normalisation, diarization', 'Wrong number formats, speaker swaps'],
              ['TTS normalisation', 'Text → speakable form', 'Abbreviation ambiguity, loanwords'],
              ['Prosody + codec', 'Linguistic plan → codec/spectrogram', 'Flat affect, mis-stressed names'],
              ['Vocoder/decoder', 'Latent audio → waveform', 'Metallic artefacts, volume jumps'],
            ],
          ),
          warn(
            'Cloning without consent is fraud infrastructure',
            'Treat voice enrolment like key management: identity-verified consent, scoped use, revocation, logging, and content filters on synthesis requests. "We only allow it for paying customers" is not a control.',
          ),
          tip(
            'Design for partial transcripts',
            'Downstream features should consume timestamps + confidence, not perfect text: drop low-confidence spans, surface uncertain names for human review, and never let a 9% word-error rate on names and numbers silently poison an automated action.',
          ),
        ],
        worked: {
          title: 'Price and design a meeting-notes pipeline',
          problem:
            'Product: 1-hour internal meetings → transcript with speaker labels → summary + action items. ASR priced at $0.01/min (hypothetical); summarisation LLM at $1/M input, $4/M output; average meeting ≈ 9,000 words of speech ≈ 12,000 tokens of transcript; expected output ≈ 900 tokens. 50 meetings/day. (1) Cost per meeting and per month. (2) Handle Hinglish code-switching and crosstalk. (3) Specify the confidence-gated handoff to the summariser.',
          steps: [
            {
              title: 'Step 1 — stage-wise cost',
              desc: 'ASR: 60 min × $0.01 = $0.60. Summarisation: 12,000/1e6 × $1 = $0.012 input; 900/1e6 × $4 = $0.0036 output → $0.0156. Total ≈ $0.62/meeting. Monthly (50×30): ≈ $925. ASR dominates — optimise there first (batch APIs, longer-form pricing tiers).',
              code_snippet: '0.60 + 0.0156 = $0.62/meeting\n0.62 * 50 * 30 = $930/month (approx)',
            },
            {
              title: 'Step 2 — code-switching and crosstalk',
              desc: 'Mitigations: enable multilingual/code-switched ASR profiles where offered; bias the decoder with a glossary of team names and product terms; run diarization so the summariser sees speaker turns ("Priya: ship Friday" beats anonymous soup); detect and flag segments where two voices overlap instead of hallucinating a clean sentence.',
            },
            {
              title: 'Step 3 — confidence-gated handoff',
              desc: 'Contract to the summariser: (a) drop spans with confidence below threshold; (b) mark names/numbers with medium confidence as [verify] so the LLM must not assert them without hedge; (c) require the summary to cite timestamps for action items; (d) if >15% of the transcript is low-confidence, route to a human-review queue instead of auto-sending notes. This keeps the cheap pipeline from laundering acoustic errors into authoritative decisions.',
            },
            {
              title: 'Step 4 — latency and UX check',
              desc: 'For live notetaking: stream partial ASR (first words appear within seconds), summarise at natural pauses or at meeting end, stream the summary. Budget: ASR streaming latency in the low seconds; summary TTFT ~1–2 s after the final segment. Announce recording and retention policy — meeting audio is personal data; store minimally.',
            },
          ],
          solution:
            '≈ $0.62/meeting, ≈ $930/month, ASR-dominated; code-switching handled via multilingual profiles + glossary biasing + diarization; a confidence-gated contract stops low-quality audio from becoming confident notes — the pattern for every speech product.',
        },
        practice: {
          title: 'Transcribe, compare, audit',
          prompt:
            'Record two minutes of your own speech including one code-switched sentence (e.g. English with a Hindi clause) and a proper noun. Transcribe with two different tools (or one tool twice with different settings). Diff the outputs: which words failed, were numbers right, was punctuation sane? Write three sentences on how you would protect a downstream automated action from exactly those errors.',
          hint: 'Proper nouns and numbers are where word-error rates concentrate — and where downstream automation gets hurt worst.',
        },
        mistakes: [
          {
            mistake: 'Equating ASR output with understanding',
            fix: 'ASR transcribes; comprehension is a separate (usually LLM) stage. Never assume the speech model "knew" what was said — it emitted plausible text from acoustics.',
          },
          {
            mistake: 'Ignoring word-error concentration on names and numbers',
            fix: 'Average WER hides the dangerous tail. Bias dictionaries, confidence gates and human review exist precisely for spans where errors cause real-world damage.',
          },
          {
            mistake: 'Thinking TTS retrieves recorded sentences',
            fix: 'Neural TTS synthesises waveforms from predicted prosody and codec/spectrogram stages — which is why it can say any text in a cloned voice, and why it sometimes mis-stresses novel names.',
          },
          {
            mistake: 'Shipping voice cloning with a checkbox "I agree"',
            fix: 'Consent must be verified (the real voice-owner enrols), scoped, logged, filterable and revocable. A checkbox is a legal fig leaf over a fraud-ready capability.',
          },
        ],
        exam: {
          question:
            'Describe the stages of a modern neural text-to-speech pipeline, and state two safety controls that any product offering voice cloning should implement.',
          answer:
            'Stages: (1) text normalisation — expand abbreviations, format numbers and currency into speakable form; (2) linguistic/prosody prediction — decide phoneme durations, pitch contour and emphasis so intonation matches meaning; (3) acoustic model — generate intermediate audio representations, either mel-spectrograms or discrete neural-codec tokens, conditioned optionally on a reference speaker embedding for voice cloning; (4) vocoder or codec decoder — render the waveform, with streaming variants emitting audio chunks as phrases complete. Safety controls for cloning include: verified enrolment consent (the genuine voice owner authenticates and records; no cloning from arbitrary third-party audio), synthesis content filters (block fraud, extortion and impersonation phrasings), per-clone audit logs and usage caps, watermarking/provenance where available, and revocation (delete the voice print on request). As of 2026 this area is moving through platform policies and emerging regulation quickly, so consent-gated design is both an ethical and a compliance requirement.',
          source: 'Speech-tech interview question; doubles as a responsible-AI design discussion.',
        },
        summary: [
          'ASR = waveform → features → acoustic model → timestamped text → post-processing (punctuation, normalisation, diarization).',
          'TTS = normalisation → prosody → acoustic/codec model → vocoder; zero-shot cloning conditions on a short reference voice.',
          'Code-switching, names and numbers are the error hotspots — production designs gate on confidence, not averages.',
          'Meeting-scale economics: ASR dominates the bill; summarisation is rounding error by comparison.',
          'Voice cloning is consent infrastructure: verified enrolment, filters, logging, revocation — engineering, not paperwork.',
        ],
      }),
      [
        [
          'In an ASR pipeline, diarization refers to:',
          [
            'Removing background noise',
            'Determining which speaker produced which segment of speech',
            'Translating the transcript',
            'Compressing the audio file',
          ],
          1,
          'Speaker attribution — the difference between a transcript and a usable meeting record.',
        ],
        [
          'Zero-shot voice cloning in modern TTS typically requires:',
          [
            'Hours of enrolled training per voice with gradient updates',
            'A short reference sample whose speaker embedding conditions the synthesiser',
            'The speaker\'s written consent form only, with no audio',
            'A text-only voice description',
        ],
          1,
          'Reference-embedding conditioning synthesises a new voice from seconds-to-minutes of audio — powerful and consent-critical.',
        ],
        [
          'In a transcribe-then-summarise product, the stage that usually dominates cost is:',
          [
            'The LLM summarisation',
            'ASR transcription — audio minutes are orders of magnitude more tokens than the summary output',
            'File upload',
            'Punctuation restoration',
          ],
          1,
          'An hour of speech dwarfs a ~1k-token summary; optimise the speech stage first.',
        ],
        [
          'The strongest safety posture for a voice-cloning feature is:',
          [
            'A terms-of-service checkbox',
            'Verified voice-owner enrolment, synthesis content filters, audit logging and revocation',
            'Charging money for clones',
            'Limiting clones to 30 seconds of audio',
          ],
          1,
          'Consent must be authenticated, scoped, logged and reversible — price and length limits are not controls.',
        ],
      ]
    ),
    lesson(
      M4,
      'gae-4-4',
      4,
      'Video Generation and Structured Output Across Modalities',
      'Why video is the expensive modality — frame token explosions, coherence constraints — and the other direction of multimodality: models that return boxes, captions and JSON instead of art.',
      19,
      nineBlocks({
        objectives: [
          'Explain video generation as temporal latent diffusion/autoregression and quantify why compute scales with frames and duration',
          'State three hard constraints of current video tools and their product implications',
          'Specify a structured output contract (schema, validation, retry, fallback) for a multimodal pipeline',
          'Choose between a generative path and a perception-plus-code path for a given product requirement',
        ],
        hook:
          'The demo: a cinematic 20-second clip, plausible motion, dramatic lighting, generated from one sentence. The production ticket: "same character across 12 shots, product logo readable, 40% cheaper, ready Friday." Video generation is the fastest-moving and least production-ready modality as of 2026 — and meanwhile, in a quiet corner of the same field, a vision model returns {"label": "cola_500ml", "box": [0.41, 0.22, 0.18, 0.35]} from a shelf photo — no artistry, just structured numbers that a warehouse robot can act on. This lesson covers both faces of multimodal output.',
        concept: `**Why video is hard and expensive.** Video is a volume: height × width × time. Latent video diffusion compresses each frame through a VAE, then adds *temporal* modelling (3-D attention or temporal layers across frames) so motion is coherent rather than a pile of independently denoised stills. Some systems add hierarchical stages (low-resolution over long horizons, detail passes on short segments) or autoregressive chunking of latent frames. The economics fall straight out of the geometry: one second at 24 fps is 24 frames of latent patches; generation time and memory scale with frames × latent area × denoising steps — which is why interactive tools cap clip length (seconds to a minute-ish in mainstream products as of 2026, hedged because this moves fast), why per-second pricing exists, and why consistency across cuts (same character, same lighting) is genuinely hard: there is no shared "identity vector" guaranteed between separate generations without extra machinery (character reference conditioning, first-frame image-to-video, or consistency finetunes).

**The constraint list you must design around.** (1) *Duration and coherence*: long clips drift — identity, physics and object permanence degrade over time. (2) *Controllability*: precise choreography (exact camera path, timed actions, readable on-screen text) is unreliable; ads teams work shot-by-shot with reference images and heavy post. (3) *Cost and iteration speed*: every "let\'s just try one more version" costs minutes and real money, unlike image generation\'s seconds. (4) *Audio sync*: native audio-capable video models exist as of 2026 but lip-sync and effects alignment vary; many pipelines still add audio in post. Practical stance: generate *shots*, not films; keep human editing in the loop; treat video as a high-budget image pipeline with temporal glue.

**The other direction: structured multimodal output.** Not every multimodal feature wants art. Perception models return *contracts*: image captioning (dense textual descriptions), visual grounding/detection (labelled bounding boxes — often normalised x, y, w, h — from open-vocabulary detectors or grounding models), OCR, VLM question-answering constrained to JSON schemas, ASR timestamps (Lesson 4.3). The engineering pattern is uniform: **define a schema, constrain generation to it** (JSON-mode or tool-call style decoding where available), **validate in code** (types, ranges, required fields), **retry with a repair prompt on violation**, and **route low-confidence or out-of-schema cases to humans**. Chat models asked to "return JSON" without a schema and validation are a classic production incident: one stray sentence and your parser throws at 3 a.m. And remember which tool fits which job: ask a generative model for a bounding box and you get an *estimate* in language; calibrated boxes come from detector/grounding models trained for that output. Match the model class to the contract.`,
        extras: [
          table(
            'Modality → structured output → who consumes it',
            ['Input', 'Structured output', 'Typical consumer'],
            [
              ['Image', 'Caption, tags, OCR text', 'Search index, CMS auto-tagging'],
              ['Image (shelf/product)', 'Bounding boxes + labels', 'Inventory robots, analytics'],
              ['Document/PDF', 'Schema-filled JSON fields', 'ERP/CRM ingestion'],
              ['Audio', 'Timestamped transcript + speakers', 'Meeting tools, compliance logs'],
              ['Video', 'Shot lists, scene captions, event timestamps', 'Editors, moderation queues'],
            ],
          ),
          warn(
            'Generative models are not calibrated detectors',
            'A chat VLM can approximate a box in prose; for measured geometry (tracking, robotics, measurement), use a grounding/detection model and treat the VLM as the semantic layer on top.',
          ),
          tip(
            'Ship contracts, not prompts',
            'For every machine-consumed output: schema → constrained decoding → code validation → repair-retry (bounded) → human fallback. Four layers of the same boring discipline prevent most 3 a.m. parser pages.',
          ),
        ],
        worked: {
          title: 'Specify a structured-output pipeline for shelf auditing — and a video alternative done right',
          problem:
            'Requirement A: a phone photo of a store shelf must yield a JSON report of stockouts (which SKUs are missing vs planogram) for a retail client. Requirement B: a 6-second social ad clip featuring the brand mascot in a park. Design both, marking where generative models belong, where perception models belong, and the full output contract for A.',
          steps: [
            {
              title: 'Step 1 — A is a perception problem, not a generation problem',
              desc: 'Pipeline: (1) grounding/detection model returns boxes + labels for shelf items (calibrated geometry); (2) embedding match maps detections to catalogue SKUs; (3) planogram diff in ordinary code computes stockouts; (4) a VLM may caption anomalies for humans. Generation is irrelevant here — do not ask an LLM to "imagine the shelf".',
            },
            {
              title: 'Step 2 — write the contract',
              desc: 'JSON schema: { photo_id: string, shelf_id: string|null, items: [{ sku: string|null, label: string, confidence: number (0–1), box: [x,y,w,h] (each 0–1) }], stockouts: [string], needs_review: boolean, review_reason: string|null }. Validation: required fields, box ranges, confidence floors, SKU in catalogue or null.',
              code_snippet: 'items: [{ sku, label, confidence, box: [x,y,w,h] }]\nstockouts: [sku...]   needs_review: bool',
            },
            {
              title: 'Step 3 — enforcement and fallbacks',
              desc: 'Constrain the VLM/schema-outputting stages with JSON-mode; validate in code; on violation retry once with the error quoted ("confidence must be 0–1"); if confidence < 0.6 for >20% of items, or planogram mismatch >30%, set needs_review=true and queue for human eyes. Log every repair — repair rate is your prompt/contract health metric.',
            },
            {
              title: 'Step 4 — B: video done in production style',
              desc: 'Do not one-shot 6 s and pray. Generate mascot-posed keyframes (image model + reference for identity), pick the best, extend with image-to-video (first-frame conditioning anchors identity and composition), 6 s at native fps, then edit: overlay real logo/typo in post (never rely on in-video text), add licensed audio, colour-match shots. Cost per iteration is minutes — budget a shot-list workflow like a small film shoot, not like an image prompt.',
            },
          ],
          solution:
            'A: detection + embeddings + code diff, wrapped in a schema-validating contract with retries and human fallback — generation never enters the loop. B: keyframe-first, image-to-video extension, post-production typography — the production stance that survives contact with client feedback.',
        },
        practice: {
          title: 'Write your own output contract',
          prompt:
            'Pick a multimodal idea (e.g. "upload a whiteboard photo, get structured tasks"). Write the JSON schema a downstream app would consume, the model class you would use for each field (grounding / VLM / code), the validation rules, one repair-retry message, and the condition under which it falls back to a human. If you can, test a VLM\'s schema adherence with three images — and count how many repairs it needed.',
          hint: 'Ask yourself per field: does this number need calibration (detector) or semantics (VLM)? That question saves entire projects.',
        },
        mistakes: [
          {
            mistake: 'Treating video models as image models run in a loop',
            fix: 'Temporal coherence requires temporal modelling; independent frames flicker and drift. Durations, identity and physics are the hard parts, not per-frame prettiness.',
          },
          {
            mistake: 'Budgeting one-prompt video for production ads',
            fix: 'Controllability is the bottleneck: work shot-by-shot with references, image-to-video conditioning, and post-production for text, brand colours and audio.',
          },
          {
            mistake: 'Asking for "JSON please" with no schema, validation or retry',
            fix: 'Constrained decoding plus code-level validation plus bounded repair retries plus human fallback — the four-layer contract. Prompt politeness is not enforcement.',
          },
          {
            mistake: 'Expecting calibrated geometry from a generative chat model',
            fix: 'Bounding boxes for measurement or action should come from detection/grounding models; use VLMs for semantics and captions, not for millimetre claims.',
          },
        ],
        exam: {
          question:
            'Why is text-to-video generation far more expensive than text-to-image? Give the compute intuition quantitatively, and name two constraints this imposes on product design.',
          answer:
            'An image is one frame of latent patches; a second of video at 24 fps is 24 such frames plus temporal consistency modelling across them — so generation work scales roughly with frames × latent area × denoising steps, and temporal attention adds cross-frame cost on top. Where a 1024×1024 image at 25 steps might take tens of seconds on one GPU, an equivalent-quality multi-second clip multiplies that by frame count and consistency overhead — hence per-second pricing, length caps and queueing in mainstream tools (as of 2026). Product constraints that follow: (1) clip length and iteration speed — you cannot brainstorm video like images; workflows become shot lists with reference conditioning and human selection; (2) consistency and controllability — characters, brand assets and on-screen text drift across generations, so production pipelines generate keyframes, extend via image-to-video, and finish in editors rather than trusting a single prompt. Cost also pushes hybrid designs: cheap image models for ideation, video only for approved shots.',
          source: 'Common multimodal ML discussion: cost scaling across modalities.',
        },
        summary: [
          'Video = frames × time: latent per frame plus temporal modelling; compute and memory scale with frames, area and steps.',
          'Design constraints as of 2026: short durations, coherence drift, weak controllability, expensive iteration — generate shots, edit films.',
          'Structured multimodal output is the other direction: captions, boxes, OCR, timestamps — consumed by code, not humans.',
          'Machine-consumed outputs need contracts: schema → constrained decoding → validation → bounded repair → human fallback.',
          'Match model class to contract: grounding models for geometry, VLMs for semantics, code for diffs and business logic.',
        ],
      }),
      [
        [
          'Text-to-video generation is expensive primarily because:',
          [
            'Video files are large to store',
            'Each second multiplies the per-frame latent computation plus temporal consistency modelling across frames',
            'Video prompts cost more tokens',
            'Video models run on specialized proteins',
          ],
          1,
          'Frames × latent area × steps, plus temporal layers — the multiplicative cost that image generation never pays.',
        ],
        [
          'The most production-realistic workflow for a brand video today is:',
          [
            'One prompt for a 30-second finished ad',
            'Shot-by-shot generation with reference conditioning and image-to-video, finishing text and audio in post',
            'Generating frames independently and concatenating with no temporal model',
            'Running the image pipeline at higher resolution instead',
          ],
          1,
          'Controllability and consistency are won per shot, then edited — not requested in one sentence.',
        ],
        [
          'For machine-consumed multimodal output, the correct enforcement chain is:',
          [
            'Prompt: "return valid JSON"',
            'Schema + constrained decoding + code validation + bounded repair retries + human fallback',
            'Regex on whatever the model returns',
            'Trust the model and catch errors in production logs',
          ],
          1,
          'Four boring layers — any one of them alone is a half-guarantee.',
        ],
        [
          'Calibrated bounding boxes for a shelf-audit feature should come from:',
          [
            'A generative chat model\'s best estimate',
            'A detection/grounding model trained for spatial output, with semantics added on top',
            'The diffusion denoiser\'s attention map',
            'Manual annotation only',
          ],
          1,
          'Generative models give language; detectors give geometry — match the model class to the contract.',
        ],
      ]
    ),
  ],
};
