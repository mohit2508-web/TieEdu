// Module 3 — Few-Shot Prompting
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code } from '../nineBlocks';
import { lesson, M3, COURSE_ID } from './helpers';

export const module3: CourseModule = {
  id: M3,
  course_id: COURSE_ID,
  title: 'Module 3 — Few-Shot Prompting',
  summary:
    'Demonstrations beat descriptions: what in-context examples actually do, how to select them for edge coverage instead of happy paths, how examples — more than instructions — dictate output shape, how to budget example count against tokens, when negative examples pay, and when zero-shot is the better tool.',
  sort_order: 3,
  lessons: [
    lesson(
      M3,
      'pem-3-1',
      1,
      'In-Context Learning: Why Demonstrations Beat Descriptions',
      'The mechanism behind few-shot prompting — examples as conditioning, not training — plus the tasks where demonstrations dominate prose and the hard limits they cannot cross.',
      16,
      nineBlocks({
        objectives: [
          'Explain in-context learning and contrast it with fine-tuning',
          'Recognize task types where demonstrations dominate written instructions',
          'Construct a minimal few-shot prompt with consistent input-output pairs',
          'State two things few-shot prompting can never change about a model',
        ],
        hook:
          'A ops team describes their log-triage policy in three careful paragraphs: "errors mentioning OOM are Severity-1 unless the process auto-restarted; network timeouts after deploy are Severity-2..." The model misroutes half the ambiguous cases. Then someone pastes eight real logs with their correct severities. Misrouting drops to near zero. Same model, same session, same topic — the difference is that the three paragraphs *described* a policy while the eight examples *demonstrated* it. Prose tells; examples show; and in ambiguous cases, showing wins.',
        concept: `**What in-context learning is.** Give the model a task instruction plus a few worked input-to-output pairs inside the prompt, then a fresh input — and the model produces an output matching the demonstrated mapping. No weights change. No training runs. The behavior evaporates the moment the examples leave the window. Researchers debate the mechanism (induction heads, pattern completion over latent task representations, something richer) — for engineering purposes you need only the phenomenology: **examples are an extremely high-bandwidth way to specify a mapping that prose specifies badly.**

**Why examples carry more information per token than instructions.** A written instruction must enumerate your categories, your boundaries, your format quirks — in words, which are lossy. A single demonstration *shows* all three simultaneously: the input shape, the output shape, the boundary decision for that case, the tone, the punctuation habits. Three examples can transmit what would take a paragraph each in prose, and transmit it more precisely, because the model is extremely good at copying observed structure and weak at unpacking vague verbal definitions. This is also why examples are the tool of choice for anything idiosyncratic to *your* organization: your ticket categories, your house JSON keys, your definition of "off-topic" — these are conventions the world did not collectively write into the training corpus, so base rates will not guess them, but demonstrations transmit them in a few lines.

**When demonstrations dominate.** Empirically, the gap between zero-shot and few-shot is largest on: (1) **custom taxonomies** — labels that are yours, not the world\'s ("escalate / hold / auto-reply" for your support queue); (2) **fiddly formats** — exact key names, ordering rules, punctuation conventions; (3) **subtle boundaries** — the difference between "billing question" and "cancellation request" as *your* org draws it; (4) **style transfer with a house voice** — "rewrite in our brand tone" is almost undemonstrable in prose but obvious in two before/after pairs. The gap is smallest on universally understood tasks (plain summarization, standard translation) where base rates already do the work.

**The fine-tuning contrast — one honest paragraph.** Fine-tuning updates weights: expensive, durable, but it is how models absorb large-scale behavioral norms. Few-shot conditioning updates nothing: free, instant, reversible. Behavioral rules that are simple and small (your format, your boundaries) live comfortably in a few-shot prompt; behavioral rules that are enormous (thousands of consistent examples worth of nuance) are what fine-tuning is for. Most product needs land far on the few-shot side of that line — and the cost asymmetry is why prompt-first is the default professional reflex.

**The hard limits, stated plainly.** Few-shot cannot add knowledge (an example showing "Paris is the capital of X" for a made-up country teaches formatting, not geography). Few-shot cannot exceed capability (demonstrating five flawless multi-step proofs does not grant theorem-proving). And few-shot will faithfully transmit errors — a mislabeled example becomes your policy for that pattern, and outputs inherit it confidently. Treat every example as production data, because functionally it is.`,
        extras: [
          table(
            'Few-shot vs prose instruction vs fine-tuning',
            ['Dimension', 'Prose instruction', 'Few-shot examples', 'Fine-tuning'],
            [
              ['Changes weights', 'No', 'No', 'Yes'],
              ['Bandwidth for custom conventions', 'Low', 'High', 'Very high'],
              ['Cost / turnaround', 'Minutes', 'Minutes', 'Hours-days + data'],
              ['Persistence', 'Per call', 'Per call (window only)', 'Durable'],
              ['Error propagation', 'N/A', 'Example errors become policy', 'Data errors baked in'],
            ],
          ),
          code(
            `Task: route facility work-order tickets.\n\nExample 1\nInput:  "AC in Room 214 not cooling since morning"\nOutput: {"queue":"hvac","priority":"high","sla_hours":4}\n\nExample 2\nInput:  "Replace tube light, Conference Hall"\nOutput: {"queue":"electrical","priority":"low","sla_hours":48}\n\nExample 3\nInput:  "Login badge not working at turnstile"\nOutput: {"queue":"security","priority":"high","sla_hours":8}\n\nNow the real ticket:\nInput:  "Water leaking under the kitchen sink, Lab 3"\nOutput:`,
            'routing_few_shot.txt',
            'text',
          ),
          tip(
            'Demonstrate, do not decorate',
            'If you can show the behaviour in one example, cut the paragraph describing it — then keep one short rule line as backup. Demonstrations lead; prose labels them.',
          ),
          warn(
            'One wrong example can poison a whole class',
            'The model generalizes from your demos aggressively. Audit every example the way you would audit training data: label correct, format exact, edge cases intentional.',
          ),
        ],
        worked: {
          title: 'Convert a failing prose policy into a demonstrated one',
          problem:
            'A community-moderator bot is told in prose: "Mark posts as REMOVE when they contain personal attacks, doxxing, or sales spam; mark as REVIEW when they are merely off-topic or mildly rude; otherwise KEEP." Ambiguous posts (sarcastic mild rudeness, disguised promotion with a referral link) are misrouted ~40% of the time. Build a few-shot version.',
          steps: [
            {
              title: 'Identify what prose is failing to pin down',
              desc: 'The three labels are defined, but their *boundaries* are not: how sarcastic is too sarcastic? Is a referral link with genuine content "spam"? These are exactly the decisions that live in the boundary, and prose keeps them fuzzy.',
            },
            {
              title: 'Pick demonstrations for the contested boundaries',
              desc: 'Do not waste examples on the obvious center (a flat insult is trivially REMOVE). Choose: one sarcastic-but-keepable post, one disguised-referral REMOVE, one genuinely off-topic REVIEW, one clean KEEP. Boundary demonstrations, not center demonstrations.',
              code_snippet:
                'Example A\nPost:  "Wow another \'free\' webinar that upsells a course. Classic."\nLabel: KEEP\nWhy: sarcasm about a topic, not a personal attack.\n\nExample B\nPost:  "Great write-up! Btw I get 20% off HostX with code\nRAHUL20, highly recommend for everyone here."\nLabel: REMOVE\nWhy: disguised sales spam — referral code with CTA.',
            },
            {
              title: 'Add the Why line to each demonstration',
              desc: 'A short rationale after each label transmits the *criterion*, not just the decision. The model then applies the criterion to new cases instead of surface-matching old ones. This single habit improves boundary generalization more than adding two more bare examples.',
            },
            {
              title: 'Test with held-out ambiguous posts',
              desc: 'Ten real ambiguous posts from the mod queue, none shown in the prompt. Check each routing against the human moderator log. Expected improvement: most boundary cases now route correctly, and the remaining misses tell you which boundary still needs a demonstration — add THAT example, not more prose.',
            },
          ],
          solution:
            'Few-shot prompt with four boundary-focused demonstrations, each carrying a one-line Why. The prose policy survives as a single orienting sentence, no longer burdened with doing the boundary work alone. Generalization is checked on held-out posts, and remaining misses are fixed by adding the missing boundary example — the few-shot iteration loop in its standard form: misroute → find the unseen boundary → demonstrate it.',
        },
        practice: {
          title: 'Build your first boundary-focused few-shot prompt',
          prompt:
            'Take any recurring classification or formatting task of yours. (1) Write the prose instruction you would naturally use. (2) List three boundary cases your task actually faces (the ones you argue about with colleagues). (3) Write three input-output demonstrations, each on a boundary case, each with a one-line Why. (4) Test on two fresh inputs and note whether the model followed your demonstrated criterion or fell back to its base-rate judgment.',
          hint: 'If the model misjudges a fresh case, the missing information is almost always a boundary you have not demonstrated — resist the urge to add prose; add the example.',
        },
        mistakes: [
          {
            mistake: 'Filling examples with obvious center cases',
            fix: 'The obvious case is already handled by base rates. Spend your example budget on contested boundaries — that is where demonstrations add information the model does not already have.',
          },
          {
            mistake: 'Expecting few-shot to inject missing facts',
            fix: 'Examples change behaviour and format; knowledge must come from pretraining or from material you paste into the context. If the model does not know the topic, provide the source.',
          },
          {
            mistake: 'Shipping examples without auditing the labels',
            fix: 'A wrong label becomes the model\'s policy for that pattern, confidently. Review examples as carefully as production outputs.',
          },
          {
            mistake: 'Mixing two mapping conventions in one example set',
            fix: 'If one example outputs JSON with "priority" and another uses "sev", the model cannot know which to prefer. Consistency is a requirement, not a nicety.',
          },
        ],
        exam: {
          question:
            'Define in-context learning. Contrast it with fine-tuning on three dimensions, and name two things few-shot prompting can never accomplish.',
          answer:
            'In-context learning: the model infers an input-to-output mapping from demonstrations present in the prompt and applies it to a new input — with no weight updates, no persistence beyond the context window, and full reversibility when the examples are removed. Vs fine-tuning: (1) persistence — ICL is per-call; fine-tuning is durable; (2) cost/turnaround — ICL needs minutes and no data pipeline; fine-tuning needs data prep and training time; (3) capacity — ICL handles small behavioral conventions; fine-tuning absorbs large-scale nuance. Two hard limits of few-shot: it cannot add knowledge the model lacks (it teaches behaviour, not facts — conditioning, not capability), and it cannot exceed underlying capability (five perfect proofs do not make the model a theorem-prover). It also faithfully reproduces any error present in the examples, which is why example auditing matters.',
          source: 'Core prompt-engineering interview question: separating conditioning from training.',
        },
        summary: [
          'In-context learning: examples in the window condition behaviour; no weights change; effects end with the window.',
          'Demonstrations are high-bandwidth: one pair transmits input shape, output shape, boundary and tone at once.',
          'Largest wins on custom taxonomies, fiddly formats, subtle boundaries, house style — smallest on universal tasks.',
          'Few-shot cannot add knowledge or exceed capability; it will happily transmit your example errors as policy.',
          'Iterate by adding the missing boundary example when a held-out case misroutes — not more prose.',
        ],
      }),
      [
        [
          'Few-shot examples improve output because they:',
          [
            'Fine-tune the model on your data',
            'Condition the model in-context on a demonstrated input-to-output mapping',
            'Expand the context window',
            'Force temperature to zero',
          ],
          1,
          'No weights change; the mapping is inferred from the prompt\'s own contents and vanishes with them.',
        ],
        [
          'Where do few-shot demonstrations typically beat prose instructions by the widest margin?',
          [
            'Plain summarization of standard text',
            'Custom taxonomies, fiddly formats, and subtle boundary decisions unique to your org',
            'Basic translation between major languages',
            'Facts from the model\'s pretraining',
          ],
          1,
          'Base rates handle universal tasks; demonstrations shine precisely where conventions are yours and prose stays ambiguous.',
        ],
        [
          'An example in your set mislabels a borderline case. Likely consequence:',
          [
            'The model ignores bad examples',
            'The error becomes the model\'s policy for that pattern and appears confidently in future outputs',
            'The API rejects the prompt',
            'Only that one example\'s exact input is affected',
          ],
          1,
          'The model generalizes aggressively from demos — audit examples as if they were training data.',
        ],
        [
          'Which pair correctly contrasts few-shot with fine-tuning?',
          [
            'Few-shot updates weights permanently; fine-tuning does not',
            'Few-shot is per-call conditioning; fine-tuning durably updates weights but needs data and training time',
            'They are synonyms with different vendor names',
            'Fine-tuning works only with images',
          ],
          1,
          'The distinction is conditioning vs training: reversible and instant vs durable and costly.',
        ],
      ]
    ),
    lesson(
      M3,
      'pem-3-2',
      2,
      'Example Selection: Coverage, Boundaries, and Honest Data',
      'How to choose which examples go in the prompt: a coverage-first method, why edge cases carry more signal than happy paths, order effects, and the data-hygiene rules that keep your demonstrations trustworthy.',
      16,
      nineBlocks({
        objectives: [
          'Apply a coverage-first checklist to choose few-shot examples',
          'Prioritize edge and boundary cases over representative happy paths',
          'Order demonstrations to maximize final-input conditioning',
          'Audit example sets for label and distribution errors',
        ],
        hook:
          'A hiring-tool startup demos its resume-screening prompt with five beautifully clean resumes, all from senior engineers, all clearly qualified. Investors ask for a live test; the intern submits a mid-level resume with a two-year career gap and a career pivot. The model, having seen only clean senior profiles, gleefully recommends "strong hire" with hallucinated seniority. The example set did not fail to be realistic — it failed to exist in the same universe as the actual inputs it would face.',
        concept: `**Selection is the real skill.** Building a few-shot prompt is easy; choosing *which* pairs go in it decides almost all of the value. The mental shift: your example set is a miniature model of your input space, and its job is to make the model\'s inferred policy match *your* policy — especially where your policy is non-obvious. Three selection principles, in priority order.

**1. Cover the output space completely.** Every label, every format variant, every routing branch the model will need must appear at least once. If your taxonomy has five queues and only three appear in the examples, the other two are effectively invisible — the model will funnel borderline cases into the demonstrated branches. This sounds obvious and is routinely violated: people demo the common case and forget that rare branches need demonstrations *more*, not less, because base rates will not supply them.

**2. Weight toward edges, not centers.** The happy-path case (obvious spam, trivially senior resume) is already handled by base rates — you are spending tokens re-teaching what the model already gets right. The contested boundary (sarcastic-but-keepable, career-pivot-with-transferable-skills) is where base rates disagree with your policy, and where a single demonstration buys disproportionate accuracy. Budget rule of thumb: at least half your examples should be edge or boundary cases. If you cannot name your boundaries, you do not understand your own policy well enough to automate it — go argue with a colleague first; the argument *is* the boundary list.

**3. Make inputs representative of production messiness.** A toy example with perfectly clean grammar teaches the model a mapping that dissolves when real inputs arrive with typos, mixed languages, headers and signature blocks. If production emails have quoted reply chains, demonstrate on an input with a quoted reply chain. Cleanliness in demonstrations is a lie about the input distribution — and the model will believe it.

**Order effects are real but modest.** In practice, demonstrations nearest the final input tend to exert slightly more influence. Practical ordering: open with one simple, unambiguous example to establish format at a glance; close with the most instructive boundary case, right before the live input. Avoid clustering all examples of one label in a row unless the labels themselves are meant to appear in that ratio — example frequencies act as a soft prior, so a 9:1 spam-to-ham demo set skews predictions toward spam (Module 3 Lesson 4 returns to this).

**Data hygiene, briefly but seriously.** Three audits before shipping: (a) *label correctness* — every output checked by someone who owns the policy, not vibes; (b) *privacy* — real customer tickets contain real emails and phone numbers; anonymize before they enter any prompt, especially ones logged for debugging; (c) *leakage* — if examples contain the answer to the *specific live input* (same ticket pasted twice, near-duplicates), the model pattern-matches instead of inferring, and your eval is fake. Keep examples and test inputs from the same batch separate, always.

Example sets decay, too. As your product shifts (new queue, new edge case), the set ages. Put the demonstration list under version control (Module 2, Lesson 4) and review it with the same seriousness as the constraint list — they are both load-bearing policy.`,
        extras: [
          table(
            'Coverage-first selection checklist',
            ['Question', 'Pass condition'],
            [
              ['Does every output branch appear at least once?', 'All labels / formats / routes demonstrated'],
              ['Are boundaries over-weighted vs centers?', '>= half the set is edge or boundary cases'],
              ['Do inputs look like production?', 'Same messiness: headers, typos, quoted chains'],
              ['Are labels owned and audited?', 'Every output reviewed by a policy owner'],
              ['Is there leakage into test inputs?', 'No near-duplicates of your live eval set'],
              ['Is frequency balanced (or deliberately skewed)?', 'Label proportions match deployment priors'],
            ],
          ),
          tip(
            'Mine disputes for examples',
            'The ticket two moderators argued about last week is the highest-value demonstration you can write. It has a real boundary, a real disagreement, and a real resolution — exactly what the model cannot guess.',
          ),
          warn(
            'Real data in prompts is real data leaks',
            'Customer names, phone numbers and medical details inside few-shot examples end up in logs, provider traces, and debugging screenshots. Anonymize ruthlessly before pasting.',
          ),
        ],
        worked: {
          title: 'Rebuild a biased example set for a resume screener',
          problem:
            'The startup screener demos five senior backend resumes with clean trajectories. Live inputs include career pivots, gaps, self-taught candidates and mixed-domain profiles. Rebuild the example set using the three selection principles.',
          steps: [
            {
              title: 'Audit the existing set against the principles',
              desc: 'Output space: only "clearly recommend" and "clearly reject" appear — the borderline bucket is missing entirely, which is where most live traffic lands. Edges: zero. Representativeness: zero (no gaps, no pivots, no non-traditional paths).',
            },
            {
              title: 'Map the real boundaries',
              desc: 'From past hiring debates: (1) career pivot with transferable skills — borderline, often recommend-for-interview; (2) long gap with recent bootcamp — borderline; (3) overqualified senior applying to junior role — usually reject with note; (4) strong domain match, weak formal credentials — borderline. Those four arguments ARE the boundary list.',
            },
            {
              title: 'Rebuild: one anchor + four boundaries + format check',
              desc: 'Six examples: one trivially-clear pair to set format, then the four boundaries each with a label and a one-line criterion. Inputs written to match real resumes: headers, bullet noise, a gap stated explicitly.',
              code_snippet:
                'Example (boundary: pivot)\nResume excerpt: "...5 years as a mechanical engineer; completed\na 6-month data analytics bootcamp; led a SQL reporting project..."\nDecision: INTERVIEW\nCriterion: recent applied project + quantifiable transferable skills;\nscreen for depth in follow-up, not by title history alone.',
            },
            {
              title: 'Test against a labeled holdout',
              desc: 'Twenty historical applications with the hiring team\'s past decisions. Score agreement. Where the model diverges, check whether the divergence is a *missing boundary* (add an example) or a *policy ambiguity the team itself has not settled* (resolve the human debate first — you cannot demonstrate an undecided policy).',
            },
          ],
          solution:
            'The rebuilt set spends five of six slots on real contested boundaries, uses messy representative inputs, and carries a criterion line per decision. Holdout agreement rises sharply because the examples now encode the same policy the team actually applies — which the original set never even approximated. The general lesson: your example set is your policy, made visible. If it demos only happy paths, your policy is happy-path-only, and live traffic will punish that.',
        },
        practice: {
          title: 'Coverage audit of an existing few-shot prompt',
          prompt:
            'Take a few-shot prompt you use or find one from your notes. (1) List every output branch it needs to handle in production. (2) Count how many appear in the demonstrations. (3) Label each example center or edge. (4) Write the two highest-value missing examples and add them. (5) Re-run one live input that previously misbehaved and record the change.',
          hint: 'The most valuable missing example is usually the input you personally argued about with a coworker — not the input that is easiest to write.',
        },
        mistakes: [
          {
            mistake: 'All-center example sets',
            fix: 'Centers are free (base rates already handle them). Move at least half the budget to contested edges.',
          },
          {
            mistake: 'Omitting rare branches because "they hardly ever occur"',
            fix: 'Rare branches are the ones base rates route wrong. One demonstration per branch is cheap insurance against the expensive rare failure.',
          },
          {
            mistake: 'Toy-clean inputs when production is messy',
            fix: 'Demonstrate on inputs with real structure: headers, signatures, quoted chains, typos. Otherwise the mapping collapses on contact with reality.',
          },
          {
            mistake: 'Pasting unanonymized customer data as examples',
            fix: 'Examples enter logs and traces. Scrub PII before pasting; synthetic examples with real structure are usually sufficient.',
          },
        ],
        exam: {
          question:
            'A team demos 10 obvious-spam examples and 1 obvious-ham example for email routing. Predict the failure mode and give the principled fix using example-distribution theory.',
          answer:
            'Example frequencies act as a soft prior during in-context inference: the model reads the demonstration set as evidence about the expected class distribution and the decision boundary. A 10:1 skew teaches two bad lessons — that ham is rare (so uncertain cases default to spam) and that the spam boundary sits where those ten examples put it (all obvious, none borderline). Symptom: borderline emails — newsletters with promotion sections, personal-but-salesy pitches — get over-routed to spam. Fix on three axes: (1) rebalance the set so class proportions approximate deployment priors; (2) replace center examples with boundary ones — one "newsletter with genuine content + one promo section = ham" demonstration outweighs five obvious-spam demos; (3) verify on a labeled holdout with real borderline traffic, adding the specific missing boundary for each residual miss.',
          source: 'Standard few-shot design question: distribution bias in demonstration sets.',
        },
        summary: [
          'Example selection is the real lever: the set is a miniature model of your input space and your policy.',
          'Complete output-space coverage first; then weight at least half the set toward edges and boundaries.',
          'Inputs must mirror production messiness; toy-clean demos teach brittle mappings.',
          'Order: simple format-anchor first, most instructive boundary last, near the live input.',
          'Audit labels for correctness, privacy (no raw PII) and leakage into your test inputs.',
        ],
      }),
      [
        [
          'Why prioritize boundary cases over obvious happy paths in few-shot sets?',
          [
            'Boundary cases are shorter',
            'Base rates already handle obvious cases; boundaries are where your policy and the model\'s defaults diverge',
            'The API requires it',
            'Happy paths confuse the model',
          ],
          1,
          'Demonstrations add the most information exactly where base-rate guesses disagree with your organization\'s policy.',
        ],
        [
          'A taxonomy has five queues but the example set demonstrates only three. Expected symptom:',
          [
            'The prompt errors out',
            'Borderline cases funnel into the three demonstrated queues; the two missing ones are rarely predicted',
            'All five queues get equal traffic',
            'The model refuses to classify',
          ],
          1,
          'Undemonstrated branches are invisible to the inferred mapping; every branch needs at least one example.',
        ],
        [
          'Which practice introduces evaluation leakage?',
          [
            'Using anonymized examples',
            'Including near-duplicates of your live test inputs in the demonstration set',
            'Testing on a labeled holdout',
            'Adding Why lines to each example',
          ],
          1,
          'If the model has "seen" the test input in the demos, it pattern-matches instead of inferring — the score is fake.',
        ],
        [
          'Where should the most instructive boundary example sit in the demonstration order?',
          [
            'Exactly once, in the middle',
            'Nearest the final live input, so recency amplifies it',
            'At the very start',
            'Order has no effect at all',
          ],
          1,
          'Demonstrations closest to the generation point tend to exert slightly more influence — put the sharpest lesson there.',
        ],
      ]
    ),
    lesson(
      M3,
      'pem-3-3',
      3,
      'Formatting Priming: Output Shape Comes from Examples',
      'Why the shape of your output is decided more by what you demonstrate than by what you request — and how to weaponize that with strict example consistency, partial shapes, and anti-example tricks.',
      16,
      nineBlocks({
        objectives: [
          'Explain formatting priming and why examples outweigh format instructions',
          'Construct examples with byte-level consistency to lock an output schema',
          'Use partial examples and prefixes to constrain long outputs efficiently',
          'Diagnose format drift by tracing it to an inconsistent demonstration',
        ],
        hook:
          'A data team asks for JSON: "Return JSON with keys id, title, status." The model returns {"id":..., "title":..., "status":...} — and also, half the time, a "confidence" key nobody asked for, because every example in the training-visible world of "return JSON" demos seems to include confidence scores. Then they paste three demonstrations with exactly the three keys, no extras, in that order. The confidence key vanishes, permanently, in one edit. The instruction was already correct; the demonstrations were always going to win.',
        concept: `**Descriptions name a shape; demonstrations inhabit one.** When you write "return JSON with keys id, title, status", you are describing a schema in prose — and prose schemas are leaky, because the model fills gaps from its prior of what "similar JSON outputs" usually contain. When you *show* three outputs in exactly your schema, the model completes the pattern: same keys, same order, same types, no extras. This is formatting priming — demonstrated structure dominates described structure — and it is the single most reliable way to enforce output shape. Format instructions still matter (they label the demonstration\'s intent and cover the no-example case), but in any conflict, the model copies what you showed. Two lessons follow: your examples\' format *is* your schema, for better or worse — including accidental quirks — and your instruction\'s format is a wish.

**Byte-level consistency is the whole discipline.** The model copies structure aggressively: key order, casing, punctuation, spacing habits, the presence or absence of trailing commas, whether lists are bulleted or numbered, whether headers end with colons. Inconsistency between examples is not sloppiness, it is a second conflicting instruction — and the model will resolve it arbitrarily, usually by mimicking whichever example is nearest or most frequent. Practical checklist per example: keys in the same order; same casing convention (snake vs camel — pick one); same null handling ("none" vs "" vs null — never mix); same unit conventions; same verbosity per field. If your target schema is consumed by code (Module 5 previews output contracts), this is not aesthetic pedantry: a single extra key or a stringified number breaks the downstream parser, and only consistency prevents it.

**Partial shapes and prefixes — the efficiency trick.** For long structured outputs you do not need to demonstrate every field of every record. Two well-known moves: (a) **prefix priming** — end your prompt with the literal opening of the output: 'Result: {"id": ' — and the model continues inside your schema with strong bias; (b) **partial example** — show one *complete* small record, then one example that stops mid-record at the part you care about. This cuts token cost while preserving schema pressure. (The prefix trick is also why chat apps that pre-fill the assistant turn with "Sure, here\'s" can subtly bias tone — the same mechanism, used by the product instead of you.)

**Negative format examples — sparingly.** Showing one deliberately wrong output ("NOT this: {"id":5, "confidence":0.9}") and correcting it can sharpen rare exclusions — models are decent at avoiding demonstrated anti-patterns. Use it when a key keeps leaking in despite positive demos; do not build your whole set out of negations, because the wrong shape still enters the context and can prime on its own. Prefer positive demonstrations of the exact shape, with the anti-example as a surgical fix for one recurring leak.

**Format drift after model updates.** Even locked prompts drift: an upgraded model may favor a slightly different default JSON dialect (extra whitespace, different date format) under weak conditioning. Your known-answer set (Module 2, Lesson 4) should include a *format assertion*: parse the output, check the keys. If a model update introduces drift, the assertion fails loudly and you patch the demonstrations — instead of discovering it in production when the pipeline chokes on a "confidence" key that came back from the dead.

**Where format priming shines, and where it does not.** It shines on: structured records, tables, house-style prose (email openers, changelog bullets), code with specific API conventions. It is weaker on: content correctness (priming shape, not truth), and truly novel formats nobody has written — there the demonstration still helps, but expect more iterations. Remember the Module 1 hierarchy: examples win format conflicts, but a *contradictory* format instruction ("a table" in prose, JSON in demos) creates an unnecessary fight. Align both, let examples carry the weight.`,
        extras: [
          code(
            `Instruction: "Return one JSON object per finding."\n  -> leaky. Model\'s prior fills gaps (extra keys, varied types).\n\nDemonstrations (byte-consistent):\n\n{"id": 1, "title": "null country field", "status": "open"}\n{"id": 2, "title": "duplicate SKU rows", "status": "triaged"}\n\nResult: {"id":\n  <- prefix priming: continuation is schema-biased.\n\nThree keys. Same order. No "confidence". No trailing extras.\nThe demonstrations are the schema.`,
            'format_priming.txt',
            'text',
          ),
          table(
            'What examples decide vs what instructions decide',
            ['Aspect', 'Dominant signal', 'Note'],
            [
              ['Key names and order', 'Examples', 'Instruction names them; demos enforce them'],
              ['Value types / casing', 'Examples', 'Byte consistency required'],
              ['Presence of extra keys', 'Examples (their absence)', 'A leaked key in one demo becomes policy'],
              ['High-level shape (JSON vs table)', 'Either — align both', 'Avoid contradiction'],
              ['Content correctness', 'Neither alone', 'Needs constraints, data, verification'],
            ],
          ),
          tip(
            'Parse-test your examples',
            'Before shipping a format-locked prompt, feed each example output through the same parser your pipeline uses. If an example would not parse, the model will reproduce its flaw.',
          ),
          warn(
            'Consistency includes nulls and units',
            'Mixing "none", "" and null across examples for missing values is the most common silent schema breaker. Pick one convention and never deviate.',
          ),
        ],
        worked: {
          title: 'Lock a leaking JSON schema with consistent demonstrations',
          problem:
            'An incident tool prompts: "Summarize the alert as JSON with keys: severity, component, action." Outputs include a leaking "confidence" key 60% of the time, severity sometimes as "SEV-1" and sometimes as 1, and action occasionally an array. Downstream code crashes. Fix with formatting priming.',
          steps: [
            {
              title: 'Trace the leaks to their likely source',
              desc: 'The prose schema does not specify types or null handling, so the model pastiches JSON conventions from its training prior: confidence-like keys are ubiquitous in "AI analysis" outputs, severity dialects vary, action is scalar-or-array by context. Three unspecified dimensions, three drifts.',
            },
            {
              title: 'Write two byte-consistent demonstrations with a real edge case',
              desc: 'Fix every dimension explicitly via the demos: severity as integer 1-4; action as always a single string (use "see runbook" when multi-action); no keys beyond the three. Example 2 should exercise the messy edge: a multi-component alert forcing a compound action string.',
              code_snippet:
                'Example 1\nAlert: "SEV-1 Payment API latency p99 4.2s in eu-west-1"\nOutput: {"severity": 1, "component": "payment-api",\n         "action": "Scale payment-api workers, check eu-west-1 LB"}\n\nExample 2\nAlert: "SEV-3 Disk 91% on db-replica-2, also CPU high"\nOutput: {"severity": 3, "component": "db-replica-2",\n         "action": "Free disk on db-replica-2; monitor CPU trend"}',
            },
            {
              title: 'Add a type note and align the instruction',
              desc: 'One line under the demos: "Keys exactly: severity (integer 1-4), component (string), action (single string). No other keys." Instruction and demos now agree; demos carry enforcement.',
            },
            {
              title: 'Regression-test with the known-answer set',
              desc: 'Run 15 historical alerts. Assertions: exact three keys, severity integer, action string. Before: ~40% parse failures. After: 0/15. Add the key-check to the weekly probe so a future model update cannot silently reintroduce confidence.',
            },
          ],
          solution:
            'Two byte-consistent demonstrations plus one aligned type note eliminated all three drifts. The model was never "bad at JSON" — it was under-specified on types and unconstrained by inconsistent demonstrations, so it filled the vacuum with its prior. Formatting priming closed the vacuum: when examples are the schema, consistency is the enforcement mechanism.',
        },
        practice: {
          title: 'Byte-audit your own few-shot format',
          prompt:
            'Take any few-shot prompt producing structured output. Write out, field by field: key order, casing, null convention, type of every value. Now compare across your examples — find at least one inconsistency (there is almost always one). Fix all examples to byte-level consistency, then run five live inputs and count format violations before vs after.',
          hint: 'The sneakiest inconsistencies are null handling and number-vs-string types. Print the examples and diff them character by character if you have to.',
        },
        mistakes: [
          {
            mistake: 'Trusting the format instruction over the examples',
            fix: 'Examples win format conflicts. If you want JSON exactly as specified, demonstrate it byte-perfect; the instruction is the label, the demos are the law.',
          },
          {
            mistake: 'One inconsistent demo "just for that case"',
            fix: 'That one demo is now a second schema. Handle special cases inside the consistent shape (e.g., "none" for missing) rather than changing the shape.',
          },
          {
            mistake: 'Specifying shape but not types',
            fix: '"severity" can be 1 or "SEV-1" unless you say (and show) which. Types belong in both the instruction note and the demonstrations.',
          },
          {
            mistake: 'Never re-testing format after a model upgrade',
            fix: 'Format priors drift across model versions. Keep a parse-based assertion in your known-answer probes so drift fails loudly, not in production.',
          },
        ],
        exam: {
          question:
            'Explain formatting priming: why do demonstrations control output shape more strongly than format instructions? Give one engineering practice that follows and one risk of ignoring it.',
          answer:
            'Format instructions are single-sentence descriptions of a schema; demonstrations are multiple complete instances of that schema occupying the conditioning context. Next-token generation pattern-completes observed structure far more reliably than it parses verbal schema descriptions — the model\'s prior over "JSON-like outputs" leaks extra keys, varied types and dialects when only prose constrains it, while consistent instances collapse those degrees of freedom to the demonstrated pattern. Hence demonstrations dominate shape whenever the two disagree. Engineering practice: maintain byte-level consistency across all examples — key order, casing, types, null conventions — and align the prose note with the demos rather than relying on either alone. Risk of ignoring it: silent schema drift (leaked keys, type changes) that passes visual inspection and breaks downstream parsers, often surfacing only after a model update changes the prior.',
          source: 'Structured-output design question; direct bridge to Part II JSON-mode lessons.',
        },
        summary: [
          'Formatting priming: demonstrated structure dominates described structure — examples are the schema.',
          'Byte consistency is enforcement: key order, casing, types, nulls — every deviation is a second instruction.',
          'Prefix priming and partial examples lock long schemas without full demonstrations every time.',
          'Surgical anti-examples can stop one leaking key; do not build sets from negations.',
          'Keep a parse-based format assertion in your known-answer set so model upgrades cannot reintroduce drift.',
        ],
      }),
      [
        [
          'What is formatting priming?',
          [
            'The model gains new formatting ability from examples',
            'Demonstrated output structure in the context dominates the model\'s next-token choices over format described in prose',
            'A provider feature that reformats output',
            'Lowering temperature to fix JSON',
          ],
          1,
          'It is pattern completion over observed instances, not new capability — which is why consistent demos beat instructions in any conflict.',
        ],
        [
          'Your demos use camelCase keys but one example uses snake_case. The model alternates between conventions. Root cause:',
          [
            'The tokenizer cannot handle underscores',
            'Inconsistent demonstrations are a second conflicting schema; the model resolves arbitrarily',
            'JSON mode is required',
            'Temperature too low',
          ],
          1,
          'Byte-level inconsistency is an unacknowledged instruction conflict — normalize every example.',
        ],
        [
          'Which practice most reduces token cost while keeping schema pressure?',
          [
            'Ten full demonstrations',
            'One complete small record plus partial examples / a literal prefix ending the prompt at the record opening',
            'Removing all demonstrations',
            'Adding a longer persona',
          ],
          1,
          'Prefix and partial-example techniques preserve the pattern-completion signal with a fraction of the tokens.',
        ],
        [
          'A downstream parser breaks because outputs gained a "confidence" key after a model upgrade. Best defense:',
          [
            'Rewrite the parser to ignore extras',
            'A parse-based assertion in the known-answer set that fails loudly on key drift, plus refreshed demonstrations',
            'Add "no extra keys" fifteen more times to the instruction',
            'Disable streaming',
          ],
          1,
          'Silent format drift is detected by automated shape assertions, then fixed at the demonstrations — the layer that actually controls shape.',
        ],
      ]
    ),
    lesson(
      M3,
      'pem-3-4',
      4,
      'Example Count, Token Budget, and When Zero-Shot Wins',
      'How many examples is enough, what they cost in tokens and latency, how negative examples earn their keep — and the honest decision procedure for staying zero-shot when demonstrations would just waste budget.',
      15,
      nineBlocks({
        objectives: [
          'Choose an example count based on coverage, not superstition',
          'Estimate the token and latency cost of a few-shot prompt at scale',
          'Use negative examples and counterexamples for specific recurring failures',
          'Decide deliberately between zero-shot and few-shot for a given task',
        ],
        hook:
          'An AI newsletter tool pays for 8 demonstrations in every request: 1,200 input tokens of examples to generate each 200-token rewrite. The mapping was fully covered by example three; examples four through eight changed nothing measurable — audited across 50 inputs — but cost $400/month at their volume. More examples is not more quality; it is sometimes just more invoice. The question was never "how many examples feel right"; it was "what is the marginal example buying?"',
        concept: `**Count is a coverage question, not a tradition.** There is no magic number — "three-shot" is folklore, not a law. The real question is: *how many demonstrations does it take to make every branch of the mapping visible?* For a simple two-class decision with an obvious boundary, one or two can suffice. For a five-queue taxonomy with four contested boundaries, you may need six or seven — not because of the number five, but because each boundary needs its own demonstration (Module 3, Lesson 2). Stop adding examples when a held-out test set stops improving. That is the entire count methodology, and it is embarrassingly easy to implement: add one example, re-run ten test inputs, repeat until the delta is noise. Most tasks plateau at two to five.

**The cost ledger — count it honestly.** Every demonstration is input tokens, and input tokens bill on every request. A 300-token example set at 10,000 requests/day is 3,000,000 input tokens a day of demonstration overhead. There is also a latency dimension (longer prefill) and a subtler one: very long example sets consume attention, and past the model\'s effective rule-following budget, extra examples stop adding signal and start adding noise (Module 1, Lesson 2 — attention dilution applies to demos too). And there is an update cost: every example is policy you must maintain when the product changes; a bloated set is a bloated liability. The professional habit: size the example set to the coverage requirement, then prune with the stop-improving rule.

**Negative examples and counterexamples — targeted tools.** Three useful forms: (a) **negative output example** — a NOT-this shape, used surgically when a key or phrase keeps leaking (Lesson 3); (b) **counterexample with correction** — a wrong input-output pair, immediately followed by the right one, transmitting the *discrimination rule* ("this looks like spam but is a personal note — KEEP; contrast: this referral pitch — REMOVE"); (c) **explicit exclusion demonstration** — showing the model what the task is NOT ("this request is out of scope — respond with PASS") which teaches an abstention branch that prose rarely instills. Use negatives when a specific failure recurs; do not stack them speculatively — each negative still occupies context and, as (a) warns, the wrong shape primes too. One sharp contrast pair beats three vague warnings.

**The zero-shot decision procedure.** Before adding a single example, ask three questions: (1) *Is the task universal?* Plain summarization, standard extraction, simple rewrite — base rates already perform; add only if house style or format demands it. (2) *Is the instruction unambiguous after the skeleton pass (Module 2, Lesson 1)?* Many "few-shot needs" are actually missing constraints in disguise — audience and format gaps that one constraint line fixes for free. (3) *Is the format or taxonomy mine?* If yes, few-shot is likely your cheapest tool, full stop. The procedure: skeleton first → test zero-shot → add constraints for observed failures → only then reach for demonstrations. Teams that skip straight to few-shot routinely paste eight examples to patch a problem that was a missing audience line all along — paying rent on a house they did not need to build.

**One production note.** In deployed pipelines, few-shot sets live in your prompt template (versioned, cached — Part II covers prompt caching); test the cached form, not the chat-lab form, because position and formatting in the deployed template can shift results slightly relative to a scratch session.`,
        extras: [
          table(
            'Zero-shot vs few-shot decision table',
            ['Situation', 'Default choice', 'Why'],
            [
              ['Universal task, standard format', 'Zero-shot + constraints', 'Base rates already perform; demos are pure overhead'],
              ['Your taxonomy or house format', 'Few-shot (boundary-weighted)', 'Conventions do not exist in base rates'],
              ['Repeated boundary misroutes', 'Few-shot + targeted contrast pair', 'Demonstrated discrimination beats prose warnings'],
              ['Constraint-shaped failure (length, audience)', 'Fix constraints first, stay zero-shot', 'Many few-shot needs are skeleton gaps'],
              ['Output must parse in code', 'Few-shot with byte-consistent demos', 'Schema enforcement lives in examples'],
            ],
          ),
          tip(
            'Prune with the stop-improving rule',
            'Add examples one at a time against a ten-input holdout. When the last addition changed nothing, you have found your count — and your invoice thanks you.',
          ),
          warn(
            'Speculative negative examples prime the wrong shape',
            'A "NOT this" example still puts the wrong pattern in context. Reserve negatives for demonstrated recurring leaks, and pair each with the corrected positive.',
          ),
        ],
        worked: {
          title: 'Right-size a bloated few-shot prompt',
          problem:
            'A support-triage prompt carries 8 demonstrations (~1,400 tokens) classifying tickets into Refund / Bug / Account / Other, plus an abstain branch. Volume: 20k requests/day. Team reports quality is fine but cost is rising. Right-size it.',
          steps: [
            {
              title: 'Inventory the mapping\'s branches',
              desc: 'Four labels plus abstain = five output branches. Contested boundaries per past team arguments: refund-without-receipt, bug-vs-account (login failures), Other-vs-abstain (out-of-product questions). Three genuine boundaries, four labels, one format to lock.',
            },
            {
              title: 'Audit the eight examples',
              desc: 'Content check: two examples are near-duplicates (two obvious refunds); three are center cases per label; the three boundaries each have one example; abstain has one. Format is consistent. Verdict: two deletable duplicates, three deletable centers (labels already covered by boundary demos).',
            },
            {
              title: 'Build the minimal sufficient set and measure',
              desc: 'New set: one clean center per label for format anchoring (4), three boundary contrasts (3), one abstain (1) — wait, that is still 8. Prune harder with the stop-improving rule on a 30-input holdout: 6 examples (3 anchors + 3 boundaries incl. abstain) scores within noise of 8. Keep 6.',
              code_snippet:
                'Holdout accuracy (30 inputs, 3 runs):\n  8 examples: 91.1%  |  cost: ~1400 in-tokens/req\n  7 examples: 91.0%\n  6 examples: 90.9%  <- keep (noise floor)\n  4 examples: 86.4%  (boundary misses appear)\n  0 examples: 71.2%  (prose-only baseline)',
            },
            {
              title: 'Book the savings and lock the probe',
              desc: 'Cut 1400 -> ~950 in-tokens/request ≈ 9M tokens/day saved at 20k req. Add the 30-input holdout + key-format assertion as the versioned probe (Module 2, Lesson 4); any future edit must re-pass it. The marginal examples were rent, not insurance.',
            },
          ],
          solution:
            'Six boundary-adequate examples match eight-example quality at ~32% fewer demonstration tokens, with a holdout probe preventing future regression. The count methodology — coverage map plus stop-improving — turned a folklore "more is safer" set into a sized, defensible asset. Note the honesty in the numbers: quality did not jump; it simply did not fall. That is what right-sizing looks like.',
        },
        practice: {
          title: 'Run a stop-improving count experiment',
          prompt:
            'Take a few-shot prompt with 4+ examples. Assemble 10 held-out test inputs with expected properties. Run: zero-shot (instruction only), then 1, 2, 3... examples (add in order of boundary importance). Record a quality score per run. Find the plateau. Report: your current count, the plateau count, and the token delta between them.',
          hint: 'If zero-shot already plateaus the holdout, your task did not need few-shot — convert the examples into one or two constraints and enjoy the token savings.',
        },
        mistakes: [
          {
            mistake: 'Copying "always use 3 examples" from a blog post',
            fix: 'Count follows coverage, not convention. Five-queue taxonomies with contested edges may need seven; a binary with one edge may need two. Measure, do not recite.',
          },
          {
            mistake: 'Never auditing demonstration tokens at volume',
            fix: 'Demonstration overhead multiplies by request count. Right-size once, keep the holdout probe, and the savings compound silently.',
          },
          {
            mistake: 'Stacking speculative negative examples "just in case"',
            fix: 'Each negative primes the wrong shape it depicts. Add negatives only for observed recurring leaks, always paired with the corrected positive.',
          },
          {
            mistake: 'Adding examples to fix constraint-shaped failures',
            fix: 'Length and audience problems are skeleton gaps, not mapping gaps. One constraint line fixes them for ~15 tokens; six examples cost hundreds.',
          },
        ],
        exam: {
          question:
            'Describe a principled method for choosing few-shot example count, including how token cost at production volume changes the decision — and when zero-shot should win.',
          answer:
            'Method: (1) map the output branches and contested boundaries; (2) seed one demonstration per branch with boundary-weighting; (3) evaluate on a held-out set while adding/removing examples one at a time (stop-improving rule); (4) keep the smallest set whose score is within noise of the maximum. Cost enters because demonstration tokens are paid per request: an oversized set multiplies across volume, inflates prefill latency, dilutes attention, and increases maintenance liability — so ties are broken toward the smaller set. Zero-shot wins when the task is universal (base rates suffice), when observed failures are constraint-shaped (fix the skeleton instead), and when an audited holdout shows no measurable few-shot gain. Few-shot earns its budget when the taxonomy, format, or boundaries are organization-specific — conventions base rates cannot guess.',
          source: 'Cost-aware prompt design question; bridges to Part II production prompting.',
        },
        summary: [
          'Example count is a coverage-and-plateau question; two to five covers most tasks, measured not assumed.',
          'Demonstration tokens bill every request — size the set, prune with a holdout, keep the probe.',
          'Negative examples are surgical: contrast pairs for recurring misroutes, never speculative stacks.',
          'Skeleton first: many few-shot needs are actually missing constraints wearing a costume.',
          'Zero-shot is the default; few-shot is the upgrade for your own conventions — decide deliberately each time.',
        ],
      }),
      [
        [
          'What determines the right number of few-shot examples?',
          [
            'A universal rule of three',
            'Coverage of branches and boundaries, verified by a held-out set until scores plateau',
            'The model\'s context window size',
            'Provider pricing tiers',
          ],
          1,
          'Count follows coverage plus the stop-improving rule — folklore numbers are not methodology.',
        ],
        [
          'At 20,000 requests/day, every 100 tokens of unnecessary example overhead costs:',
          [
            'Nothing extra — demos are cached free',
            '2,000,000 extra input tokens per day',
            'Only latency, not money',
            'Only on the first request',
          ],
          1,
          'Input tokens are re-sent per request (absent explicit caching), so per-request overhead multiplies by volume.',
        ],
        [
          'A "not this output" negative example fails to stop a leaking key and seems to make it worse. Why?',
          [
            'Models cannot process negation',
            'The wrong shape still enters the context and primes; negatives need the corrected positive paired beside them',
            'Temperature is too high',
            'The example was too long',
          ],
          1,
          'Anti-examples put the undesired pattern in the window too — pair every negative with the corrected positive and use sparingly.',
        ],
        [
          'Zero-shot on a held-out set already matches few-shot. Best action:',
          [
            'Add more examples anyway for safety',
            'Drop the examples, convert any real requirements into constraints, and bank the token savings',
            'Increase temperature',
            'Fine-tune immediately',
          ],
          1,
          'If demonstrations add no measurable value, they are pure cost — constraints express any real requirements more cheaply.',
        ],
      ]
    ),
  ],
};
