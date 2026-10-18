// Module 8 — Evaluation and Testing: Golden Sets, Judges, CI and Tracing
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code } from '../nineBlocks';
import { lesson, M8, COURSE_ID } from './helpers';

export const module8: CourseModule = {
  id: M8,
  course_id: COURSE_ID,
  title: 'Module 8 — Evaluation and Testing: Golden Sets, Judges, CI and Tracing',
  summary:
    'Part I baselined a slice; this module turns that into a discipline that scales. Build offline golden sets from real traffic with scoring functions you can defend; use LLM-as-judge where programmatic checks cannot go, with calibrated criteria and named bias traps; wire prompt and code regressions into CI behind thresholds rather than vibes; trace every request as spans with token accounting so failures are reconstructable; sample production honestly and legally; and run the eval-to-fix loop until quality compounds instead of oscillating.',
  sort_order: 8,
  lessons: [
    lesson(
      M8,
      'lla-8-1',
      1,
      'Golden Sets: Offline Evaluation Your App Can Trust',
      'A golden set is your app\'s memory: real cases, expected behaviour, and scoring you can defend. Build one from production and incidents, score deterministically where you can, keep it versioned and held out, and read the numbers without fooling yourself about noise and overfitting.',
      16,
      nineBlocks({
        objectives: [
          'Construct a golden set from real cases with expected behaviour written before running',
          'Choose scoring: programmatic checks first, rubrics only where judgement is unavoidable',
          'Version the set, hold out a slice, and resist overfitting to your own eval',
          'Interpret results against noise: repeated runs, effect sizes and failure classes',
        ],
        hook:
          'A team reports their assistant went from 78 to 94 percent in a week — then back to 81 the next week. The prompts barely changed. What changed was the set: three developers added cases they had just fixed, removed two that were "flaky", and regraded an old failure as a pass by reading it more generously. Their eval had become a mood with a number attached. The fix is not a better model. It is a set with provenance, held-out cases and scoring that does not depend on who is reading.',
        concept: `**What a golden case actually contains.** Four things, always: (1) the input as production would deliver it — full document, real mess, not a sanitised excerpt; (2) the configuration fingerprint: prompt version, model id, relevant retrieval or tool settings — because "did it pass?" is meaningless without knowing what ran; (3) the expected behaviour, written before the run — an exact answer where the task is closed (extraction, classification), a rubric of checkable properties where it is open (must cite two sources, must refuse medical advice, must not exceed 120 words); (4) a scoring function that turns output into pass or fail without a human deciding how to feel that day. A case missing any of the four is an anecdote, not an eval item.

**Scoring in order of decreasing honesty.** Programmatic first: exact or normalised match for closed tasks, field-by-field comparison for extraction, substring and regex checks for required or forbidden content, span-existence checks for citations, arithmetic checks for anything numeric, length and format constraints, refusal detection for out-of-scope probes. Each is deterministic, free and debuggable. Rubrics only where judgement is genuinely required — coherence of a multi-paragraph answer, helpfulness of tone — and there, write the rubric as checkable properties (does it address the actual question, does it hedge where the source is silent) rather than a 1-to-5 vibe scale. A hybrid case is normal: three programmatic checks plus one rubric line. What you must not do: let a model grade with no reference and no criteria — that measures agreeableness.

**Build the set from evidence, not from imagination.** Sources in order of value: production incidents and bugs (the case that broke you is worth ten invented ones); user feedback records from Module 3 (thumbs-down plus context is a labelled failure); the failure classes from your Module 5 baseline; adversarial inputs (injection attempts, refusal probes, out-of-scope requests); and a random production sample to keep distribution honest — because incident-only sets drift towards the exotic and forget that most traffic is boring. Sizes: 20–50 to start, 100–300 for a mature app; beyond a few hundred, maintenance cost beats marginal signal — better to keep 200 excellent cases than 2,000 stale ones.

**Version it, split it, and watch the noise.** The set lives in the repo as JSONL, diffed and reviewed like code — adding a case is a PR with a reason. Split into a dev set (you iterate against it freely) and a holdout set (run at release gates only); if you never look at holdout failures while tuning, it stays an honest estimate. Expect noise: even at temperature 0, provider-side nondeterminism means a single case flipping is not signal — run repeated trials on a sample to estimate your flip rate, compare changes on many cases, and treat one- or two-case deltas as nothing. Track failure classes, not only the pass rate: a total that holds while citation misses become formatting misses is a different app wearing the same number.`,
        diagram: `flowchart LR
  S1["incidents + bug reports"] --> G
  S2["thumbs-down feedback"] --> G
  S3["baseline failure classes"] --> G
  S4["random production sample"] --> G
  G["golden set (JSONL, in repo, versioned)"] --> SPL["dev split | holdout split"]
  SPL --> RUN["run harness: fixed prompt/model, low temp"]
  RUN --> SC["score: programmatic, then rubric"]
  SC --> REP["pass rate + failure classes + cost + latency"]
  REP --> D{"change worth it?"}
  D -->|"yes"| PROMOTE["commit case diffs, bump prompt version"]
  D -->|"no"| REVERT
  HOLD["holdout"] -.->|"release gates only"| REP`,
        extras: [
          table(
            'Scoring ladder: use the highest rung the task allows',
            ['Rung', 'Mechanism', 'Use when'],
            [
              ['1. Exact / normalised match', 'String compare after normalisation', 'Closed outputs: ids, labels, dates'],
              ['2. Field comparison', 'Per-field expected vs actual', 'Extraction with a schema'],
              ['3. Structural checks', 'Required/forbidden substrings, regex, length', 'Grounded answers, format contracts'],
              ['4. Programmatic semantics', 'Arithmetic, span-in-source, citation resolves', 'Anything checkable without taste'],
              ['5. Rubric line', 'Checkable properties, one dimension each', 'Tone, coherence — never bare 1-to-5'],
            ],
          ),
          code(
            `# golden set runner: one JSONL line of evidence per case
import json, time, statistics

def score(case, out):
    checks = []
    if case.get("exact"):
        checks.append(norm(out.text) == norm(case["exact"]))
    for sub in case.get("must_contain", []):
        checks.append(sub.lower() in out.text.lower())
    for sub in case.get("must_not_contain", []):
        checks.append(sub.lower() not in out.text.lower())
    if case.get("fields"):
        checks.append(all(out.fields.get(k) == v for k, v in case["fields"].items()))
    if case.get("require_span"):
        checks.append(case["require_span"] in case["source_text"])   # hallucination guard
    if case.get("rubric"):
        checks.append(rubric_line(case["rubric"], out.text))         # checkable properties
    return all(checks), checks

def run(cases, build, trials=1):
    rows = []
    for c in cases:
        passes = []
        for _ in range(trials):
            t0 = time.time()
            out = build(c["input"])          # pinned prompt_version + model from case
            ok, checks = score(c, out)
            passes.append(ok)
            rows.append({"id": c["id"], "pass": ok, "checks": checks,
                         "ms": time.time() - t0, "tokens": out.usage.total})
        rows[-1]["flaky"] = len(set(passes)) > 1      # noise you can see
    return report(rows)                                # rate, classes, cost, p95

# dev set for iteration; holdout only at release gates
report(run(DEV_CASES, build))`,
            'eval_run.py',
            'python',
          ),
          tip(
            'Every case you add needs a reason line in the diff',
            '"Caught by incident #412" is provenance; "added more coverage" is drift.',
          ),
          warn(
            'Tuning against your holdout turns it into dev data',
            'Look at holdout failures only at release time — then reset your expectations, not your set.',
          ),
        ],
        worked: {
          title: 'Build a 40-case golden set for the contract-review helper',
          problem:
            'A contract-review assistant has no eval: two developers disagree on whether the latest prompt is better. Build the set, choose scoring, and run a comparison that settles the argument.',
          steps: [
            {
              title: 'Harvest cases from evidence',
              desc: 'Twelve from filed bugs (a clause misread, a missing indemnity flag), nine from thumbs-down records with context, six out-of-scope probes (medical advice, "write my resume"), five injection attempts embedded in pasted clauses, and eight random production contracts for distribution balance. Forty cases, each with input captured exactly as production delivered it.',
            },
            {
              title: 'Write expectations before running anything',
              desc: 'Closed fields get exact expected values (clause type, notice days, party names); grounded answers get structural checks (must name the clause number, must include the quote, must not invent section numbers — a must_not_contain list); refusal probes get a required refusal pattern; one rubric line where coherence is genuinely judged — phrased as properties, not a scale.',
              code_snippet:
                '{"id":"c-017","input":"<clause 14 text>","source_text":"...",\n "fields":{"clause_type":"termination","notice_days":30},\n "must_contain":["Clause 14"],"require_span":"either party may terminate",\n "must_not_contain":["Clause 99"],"rubric":"addresses termination, not general advice"}',
            },
            {
              title: 'Pin the fingerprint and run both prompts',
              desc: 'Each case records prompt_version and model id. Prompt v3 scores 31/40; v4 scores 34/40. The class breakdown matters more: v4 fixes five citation misses but introduces two field errors on notice days — a trade the headline number hid. Repeated trials on a 10-case sample show a flip rate of one case, so the three-case gap is thin but directionally real.',
            },
            {
              title: 'Decide with classes and holdout, then commit the set',
              desc: 'The team fixes v4\'s notice-day regression, re-runs (36/40, flip rate one), checks holdout (8/10 — untouched during tuning), and promotes. The set goes into the repo with a reason line per case; next week\'s change will be a diff against 40 knowns instead of a debate.',
            },
          ],
          solution:
            'Forty cases built from evidence, expectations frozen before running, fingerprint pinned per case, scoring mostly programmatic — and a disagreement about prompt quality became a table with failure classes in it. The citation-versus-accuracy trade that the pass rate hid is now visible, which is the real product of a golden set: not a number, but a classified picture of what your app does wrong.',
        },
        practice: {
          title: 'Build your first golden set',
          prompt:
            'Write ten cases from real inputs: at least three from bugs or thumbs-down records, one refusal probe and one injection attempt. Give each a pre-written expectation and a scoring function — programmatic where possible. Run your current build twice and report the pass rate, the failure classes and your observed flip rate. Then name the one case you would add next and where it would come from.',
          hint: 'If you wrote the expectations after seeing the output, you graded the app against itself — rewrite them first.',
        },
        mistakes: [
          {
            mistake: 'Expectations written after seeing the output',
            fix: 'Freeze expected behaviour first; otherwise the set ratifies whatever the model currently does.',
          },
          {
            mistake: 'Let-only vibes scoring ("reads well: yes/no")',
            fix: 'Programmatic checks first; rubric lines only for real judgement, each phrased as checkable properties.',
          },
          {
            mistake: 'One flat set used for both tuning and release',
            fix: 'Dev split for iteration, holdout for gates — or the holdout quietly becomes dev data.',
          },
          {
            mistake: 'Reading single-case deltas as signal',
            fix: 'Measure your flip rate with repeated trials; judge changes on class shifts across many cases.',
          },
        ],
        exam: {
          question:
            'List the four components of a golden case, the scoring ladder in order, and five sources for case material. How do you handle eval noise and overfitting to your own set?',
          answer:
            'Components: input exactly as production delivers it; configuration fingerprint (prompt version, model, retrieval/tool settings); expected behaviour written before the run (exact values for closed tasks, checkable rubric properties for open ones); and a scoring function that does not depend on the reader\'s mood. Scoring ladder: normalised exact match → per-field comparison → structural checks (required/forbidden substrings, format, length) → programmatic semantics (arithmetic, span-in-source, citations resolve) → rubric lines with checkable properties — never a bare 1-to-5. Case sources: production incidents first (they are real), thumbs-down feedback with context, baseline failure classes, adversarial probes (injection, refusal, out-of-scope), and a random production sample for distribution honesty. Noise: pin temperature and the configuration fingerprint, run repeated trials on a sample to learn the flip rate, treat one- or two-case deltas as nothing and compare across classes. Overfitting: keep cases in versioned JSONL with a reason per addition, split into dev and holdout, and consult holdout only at release gates so it remains an honest estimate.',
          source: 'ML-platform interview: "how would you evaluate an LLM feature before shipping a prompt change?"',
        },
        summary: [
          'A case is input + fingerprint + pre-written expectation + scoring function.',
          'Programmatic checks first; rubric lines only where judgement is unavoidable.',
          'Harvest from incidents, feedback, baselines and random traffic — evidence over imagination.',
          'Version the set in the repo; dev split to tune, holdout to gate.',
          'Measure flip rate before believing a one-case delta.',
          'Report failure classes, not just the pass rate — the classes are what you fix.',
        ],
      }),
      [
        [
          'Expected behaviour for a golden case should be written:',
          [
            'After seeing the model output, to be fair to the task',
            'Before running the model, so the set is not grading the app against itself',
            'By the model, then approved',
            'Only for extraction tasks',
          ],
          1,
          'Post-hoc expectations ratify current behaviour; pre-written ones measure it.',
        ],
        [
          'For a grounded summarisation task, the most honest scoring combination is:',
          [
            'A 1-to-5 model vibe score',
            'Structural checks (required citation markers, forbidden fabrications, length) plus one rubric line of checkable properties',
            'Exact string match against a reference summary',
            'Human eyes on every run',
          ],
          1,
          'Deterministic checks catch the failures that matter; a narrow rubric covers the residual judgement.',
        ],
        [
          'Your holdout split exists to:',
          [
            'Give developers more cases to tune on',
            'Provide an honest release-time estimate, because looking at it during tuning turns it into dev data',
            'Replace production monitoring',
            'Increase the headline pass rate',
          ],
          1,
          'Its value is precisely that it was not used — every peek spends that value down.',
        ],
        [
          'A prompt change moves your dev set from 30/40 to 32/40, with a measured flip rate of one case. You should:',
          [
            'Ship immediately — the number went up',
            'Reject it — the number barely moved',
            'Look at failure-class shifts and the holdout, repeat trials, and treat the two-case delta as weak evidence rather than a decision',
            'Add ten easier cases to firm up the win',
          ],
          2,
          'Two cases against a one-case flip rate is noise territory; class shifts and holdout decide.',
        ],
      ]
    ),
    lesson(
      M8,
      'lla-8-2',
      2,
      'LLM-as-Judge: Criteria, Calibration and Bias Traps',
      'When scoring cannot be programmatic, a judge model can — if you design it like a measurement instrument: narrow criteria, reference-anchored rubrics, calibrated against human labels on a gold subset, with the known biases named and actively mitigated.',
      16,
      nineBlocks({
        objectives: [
          'Design judge criteria as narrow, checkable dimensions instead of global quality scores',
          'Calibrate a judge against human labels and measure agreement before trusting it',
          'Name and mitigate the standard judge biases: self-preference, length, position, style',
          'Decide where a judge may gate a release and where it may only inform',
        ],
        hook:
          'A team replaces human review with a judge prompt that asks: "Rate the overall quality of this answer from 1 to 10." Scores land between 7 and 9 for everything, including answers that invented a policy. The judge correlates with nothing; nobody checks, because the dashboard looks rigorous. Two months later they discover the judge shares a model family with their generator — and their own model\'s drafts score a full point above a competitor\'s stronger model on identical tasks. The instrument was measuring fluency and family loyalty, and they had built a release gate on it.',
        concept: `**A judge is a rater, and raters need design.** The single global score is the trap: it collapses dimensions you actually care about into one number nobody can act on. Design instead as you would a human rubric: two to four narrow dimensions, each with checkable criteria and an explicit failure example. For a support-answer judge: correctness against the provided context (claims supported, nothing invented), instruction compliance (length cap, tone, required elements), and usefulness (answers the actual question — not a pivot to a related one). Each dimension gets its own verdict (pass/fail or a small ordinal), and the case passes only if the gates you chose pass. Give the judge the reference material — the source context, the expected properties from your golden case — because an anchored judge measures against evidence; an unanchored judge measures plausibility. Ask for a verdict plus quoted evidence from the candidate ("point to the phrase that violates the rule"), which both improves accuracy and gives you a debuggable artifact.

**Pairwise beats absolute when you are comparing versions.** Judging "is v4 better than v3" by two absolute score sets drowns in scale drift; presenting both answers side by side and asking which better meets the criteria (with ties allowed) yields more stable comparisons. Position bias — always preferring the first or second presented — is measured, not assumed: run each pair twice with order swapped and count order-flips; a judge that flips on position is not ready to gate anything.

**Calibration is the whole game.** Before trusting a judge, label a gold subset yourself: 50 to 150 cases across the pass/fail boundary, human verdicts recorded first. Then measure agreement: simple percent agreement plus something chance-corrected (Cohen\'s kappa for two raters, or percent agreement against majority when you use multiple judge runs). Targets are domain-specific — for a release gate you typically want high agreement on failures specifically (missing a real failure is the expensive error), which you check with the confusion matrix, not the headline agreement number. Where agreement is poor, fix the rubric (ambiguous criteria are the usual cause), not the judge model. Re-calibrate when the generator, prompt or judge model changes — a judge calibrated against v3 answers may not hold against v4.

**Name the biases and mitigate each.** Self-preference: judges favour outputs from their own model family (measurable, era-specific, so re-measure with your stack — as of 2026, cross-family judging or human spot-checks are the standing mitigations). Length bias: longer answers score higher on vague rubrics — constrain with explicit length criteria or normalise by asking the judge to check required elements rather than "thoroughness". Position bias: swap and average. Style-over-substance: polished prose wins on correctness dims — require evidence quotes for every verdict, and include deliberately correct-but-plain candidates in calibration. Sycophancy: judges agree with confident justifications — forbid justifications from the candidate influencing the verdict by structuring the prompt to judge criteria only. Each mitigation is cheap; the expensive mistake is shipping a gate and never testing which of these it suffers from.

**Where a judge may rule.** A calibrated judge can gate releases on dimensions it agrees with humans about, flag production samples for human review, and triage failures into classes. It should never be the sole judge of safety refusals (few edge cases, high stakes — keep humans in that loop), never grade its own family\'s outputs without a bias check, and never be reported without its calibration stats attached. The rule that keeps this honest: a judge number without agreement data is a number; with agreement data it is an instrument.`,
        diagram: `flowchart LR
  C["candidate answer"] --> J["judge: narrow dims + reference + evidence quotes"]
  R["reference / expected properties"] --> J
  J --> V["verdicts per dimension"]
  H["human labels on gold subset"] --> CAL["calibration: agreement + confusion matrix"]
  V --> CAL
  CAL --> G{"good enough for this use?"}
  G -->|"gates"| REL["release gate on agreed dims"]
  G -->|"informs"| TRI["triage + human review queue"]
  SWAP["order swap, 2x"] -.-> J`,
        extras: [
          table(
            'Judge bias traps and the standing mitigations',
            ['Bias', 'Symptom', 'Mitigation'],
            [
              ['Self-preference', 'Same-family outputs score higher', 'Cross-family judge or human spot-check; re-measure per era'],
              ['Length bias', 'Wordy answers win on vague dims', 'Explicit length criteria; check required elements, not thoroughness'],
              ['Position bias', 'First or second presented always wins', 'Run both orders; count flips; swap-and-average'],
              ['Style over substance', 'Polished prose wins correctness', 'Require evidence quotes; calibrate with plain-but-correct candidates'],
              ['Sycophancy', 'Judge agrees with confident framing', 'Structure the prompt to criteria only; ignore candidate justifications'],
              ['Anchoring to reference', 'Judge copies reference wording', 'Grade properties, not wording; allow equivalent phrasings'],
            ],
          ),
          code(
            `# judge design: narrow dims, evidence quotes, calibration stats
JUDGE_PROMPT = """Compare the candidate against the criteria and the reference.
Answer as JSON with one entry per dimension. For every verdict, quote the
exact candidate phrase that decided it. Judge criteria only - ignore how
confident the candidate sounds.

Dimensions:
1. supported_by_context: every factual claim appears in REFERENCE. fail if one claim is absent.
2. instruction_compliance: length <= {max_words}, contains required elements {required}.
3. answers_the_question: addresses the asked question, not a related one.

REFERENCE:
{reference}

QUESTION:
{question}

CANDIDATE:
{candidate}"""

def calibrate(judge_fn, gold):
    rows = [(judge_fn(g), g["human_label"]) for g in gold]
    agree = sum(1 for a, b in rows if a == b) / len(rows)
    kappa = cohen_kappa([a for a, _ in rows], [b for _, b in rows])
    cm = confusion([a for a, _ in rows], [b for _, b in rows])
    return {"agreement": agree, "kappa": kappa, "missed_failures": cm["fn"], "confusion": cm}

def judge_pair(judge_fn, a, b, criteria):
    # position bias check: run swapped; a flip means this pair is not gate material
    f1 = judge_fn(a, b, order="ab")
    f2 = judge_fn(b, a, order="ba")
    return f1 if not flipped(f1, f2) else {"verdict": "unstable", "flipped": True}`,
            'judge.py',
            'python',
          ),
          tip(
            'Demand a quoted phrase for every verdict',
            'Evidence quotes force the judge onto the candidate\'s actual words — and give you something to debug when it is wrong.',
          ),
          warn(
            'A judge number without calibration stats is decoration',
            'Agreement, confusion matrix and bias probes travel with every number you report or gate on.',
          ),
        ],
        worked: {
          title: 'Calibrate a judge for the support-answer task',
          problem:
            'The team wants their judge to gate prompt releases for a support assistant. They have 120 human-labelled answers (60 pass, 60 fail across three criteria). Design the judge, calibrate it, and decide what it may gate.',
          steps: [
            {
              title: 'Rewrite the rubric into three narrow dimensions',
              desc: 'The old single score becomes: supported_by_context (every claim traceable to the supplied docs), instruction_compliance (length cap plus required elements), answers_the_question (no pivot). Each verdict demands a quoted deciding phrase. Reference material — the actual doc excerpts — rides along with every judgement.',
            },
            {
              title: 'Run against the gold labels and read the confusion matrix',
              desc: 'Headline agreement: 84 percent, kappa 0.68. But the matrix shows the real story: the judge misses 8 of the 60 true failures (it passes invented claims) while over-failing only 3. For a release gate, missed failures are the expensive error — so this judge is not yet allowed to gate correctness alone.',
              code_snippet:
                'agreement 0.84, kappa 0.68\nconfusion: TP 52  FP 3   (judge says fail)\n           FN 8   TN 57\n-> missed_failures=8: correctness gate NOT approved; compliance dim IS (0.95 agree)',
            },
            {
              title: 'Fix the rubric where agreement is worst, then re-calibrate',
              desc: 'Diagnosis of the eight misses: the judge accepted confident citations without checking them against the reference. The rubric change is mechanical — for supported_by_context, verify each quoted citation exists verbatim in REFERENCE before any other check. Re-run: agreement 0.92, kappa 0.81, missed failures down to 3. Compliance dimension already at 0.95 — approved to gate.',
            },
            {
              title: 'Probe the biases, then assign permissions',
              desc: 'Order swap on 40 pairs: three flips (manageable — swap-and-average on). Length probe: four deliberately padded answers scored a point higher pre-fix, now neutral under element-checking. Self-family probe: mixed-family candidates, judge from a different family than the generator. Final permissions: gate release on compliance and correctness (with human spot-check of 10 percent of gate decisions), triage everything else, never sole-refusal judge.',
            },
          ],
          solution:
            'The judge went from a 1-to-10 mood dial to an instrument with published agreement, a confusion matrix that named its worst error (missed hallucinations), a rubric fix that cut it, and explicit permissions: what it may gate, what it may inform, what it may never decide alone. That is the difference between a dashboard that looks rigorous and one that is.',
        },
        practice: {
          title: 'Design and calibrate one judge',
          prompt:
            'Write a three-dimension judge for your task with evidence-quote requirements. Label 30 cases yourself (pass/fail per dimension), run the judge, and compute agreement plus the confusion matrix. Report the worst dimension, the class of disagreement, and the one rubric change you would make. Then say exactly what this judge may gate after calibration — and what it may not.',
          hint: 'Read the disagreements one by one: 90 percent of "judge is bad" cases are rubric ambiguity in disguise.',
        },
        mistakes: [
          {
            mistake: 'A single 1-to-10 overall-quality judge',
            fix: 'Two to four narrow dimensions with checkable criteria and quoted evidence per verdict.',
          },
          {
            mistake: 'Deploying a judge with no human calibration',
            fix: 'Gold subset first; agreement plus confusion matrix; gate only where agreement on failures is proven.',
          },
          {
            mistake: 'Ignoring position, length and family biases',
            fix: 'Swap-and-average, element-based criteria, cross-family judge — each probe is cheap, each omission is expensive.',
          },
          {
            mistake: 'Letting the judge grade safety refusals alone',
            fix: 'High-stakes edge cases stay with humans; the judge may triage and surface them, not decide.',
          },
        ],
        exam: {
          question:
            'Describe judge design: dimensions, anchoring and evidence requirements. How is a judge calibrated, what does the confusion matrix reveal that agreement does not, and name three bias traps with mitigations.',
          answer:
            'Design: two to four narrow dimensions with checkable criteria (not one global score), anchored to reference material from the golden case, with every verdict accompanied by a quoted deciding phrase from the candidate — evidence quotes force judgement onto actual words and produce debuggable artifacts. Pairwise presentation with order-swapped repeats for version comparisons. Calibration: a gold subset of 50–150 human-labelled cases across the pass/fail boundary, human labels first; measure percent agreement plus a chance-corrected statistic, and inspect the confusion matrix — which reveals error direction: a judge that misses real failures (false passes) is unfit to gate correctness even at high headline agreement, while over-failing merely costs investigation; re-calibrate whenever generator, prompt or judge changes. Biases: self-preference for same-family outputs (cross-family judge, re-measure per era), length bias (explicit element checks instead of thoroughness), position bias (swap and average, count flips), style-over-substance (require quotes, calibrate with plain-but-correct candidates) and sycophancy (judge criteria only, ignore candidate framing). Permissions: gate only the dimensions where agreement on failures is proven; never sole judge of safety refusals.',
          source: 'Evaluation-platform interview: "we want to replace human review with an LLM judge — how would you prove it works?"',
        },
        summary: [
          'Narrow dimensions with checkable criteria; evidence quotes for every verdict.',
          'Anchor the judge to reference material — unanchored judges grade plausibility.',
          'Calibrate on a gold subset; publish agreement and the confusion matrix with every number.',
          'Missed failures are the expensive error for gates — read direction, not just headline agreement.',
          'Swap for position, elements for length, cross-family for self-preference.',
          'A judge informs broadly and gates narrowly — refusals stay with humans.',
        ],
      }),
      [
        [
          'The primary reason a single 1-to-10 judge score fails is:',
          [
            'It costs too many tokens',
            'It collapses distinct dimensions into one unactionable number, so failures cannot be located or fixed',
            'Models cannot count to ten reliably',
            'Providers forbid numeric judging',
          ],
          1,
          'Actionability comes from dimension-level verdicts; an aggregate hides which property broke.',
        ],
        [
          'Your judge agrees with humans 85 percent of the time but passes 9 of 60 genuinely failing answers. The correct conclusion:',
          [
            '85 percent is fine — ship the gate',
            'Fire the judge and hand-label everything forever',
            'It is unfit to gate correctness until fixed: missed failures are the expensive direction for a gate',
            'Raise the temperature of the judge',
          ],
          2,
          'For gates, the confusion matrix direction dominates the headline: false passes are what a gate exists to stop.',
        ],
        [
          'A judge prefers the first of two answers in 70 percent of order-swapped pairs. This is:',
          [
            'Evidence the first answer is usually better',
            'Position bias — mitigate by running both orders and averaging, and treat unstable pairs as unjudgeable',
            'A reason to always present v4 first',
            'Normal and needs no handling',
          ],
          1,
          'Order-dependence is measured by swapping; anything that flips on position is not a measurement.',
        ],
        [
          'The strongest standing mitigation for self-preference (judge favouring its own family) is:',
          [
            'Raising temperature',
            'A cross-family judge or human spot-checks, with the bias re-measured on your own stack since magnitudes shift by era',
            'Longer rubrics',
            'Removing all references from the prompt',
          ],
          1,
          'Magnitudes are provider- and era-specific — measure yours rather than trusting a published number.',
        ],
      ]
    ),
    lesson(
      M8,
      'lla-8-3',
      3,
      'Regression Tests in CI and Tracing Every Model Call',
      'Prompt changes and code changes need the same gates: deterministic tests for the pure layers, a bounded eval job for model behaviour with thresholds, and traces — spans around every stage and model call with token accounting — so when something regresses you can find it instead of reproduce it.',
      16,
      nineBlocks({
        objectives: [
          'Split CI into key-free deterministic tests and eval gates with explicit thresholds',
          'Design for flakiness: recorded fixtures, retries policy, quarantine and budgets',
          'Instrument traces: spans per stage and model call with the attributes that matter',
          'Do token accounting per request, user and prompt version — and debug from a trace id',
        ],
        hook:
          'A prompt edit lands on Friday. Nobody notices the retrieval chunk order flipped until Tuesday, when support reports wrong refund windows. The engineer cannot reproduce it: their machine uses a different prompt file, the provider model alias silently updated, and nobody logged prompt_version, so no trace answers which of the three changes broke it. Three days of archaeology for a change that took four minutes — because tests ran only for the code, and traces existed only as printf debugging.',
        concept: `**Two gates, because there are two kinds of regression.** Deterministic tests cover everything that does not need a model: assembly and truncation logic (Module 5), schema validation and repair routing (Module 7), tool dispatch and gating (Module 6), error classification, budget math. Key-free, seconds-fast, run on every commit — and they should be the majority of your suite. The eval gate covers model behaviour: a bounded run over the golden set with a real or recorded model, run on prompt changes and nightly. Thresholds are explicit in the config: "no dimension may drop more than 2 points versus baseline; zero new failures on the holdout safety cases" — a gate without a written threshold is a report, and reports do not block merges.

**Flakiness policy is a design choice, made before it hurts.** Three tools. Recorded fixtures: replay recorded provider responses for the deterministic CI lane, so prompt-assembly and post-processing changes are tested without tokens, variance or keys — the live lane runs nightly or pre-release. A flip-rate-aware rule: mark known-flaky cases and judge by class-level thresholds rather than single cases (Lesson 1\'s noise discipline, enforced by the gate). And quarantine: a failing case that is a known model limitation goes to a labelled quarantine list with an owner — never deleted, because deleting failures is how a set rots into agreement. Retries: at most one eval retry on transport errors, never on scoring failures — retrying a failed score until it passes is the eval equivalent of grading on a curve.

**Tracing: spans that let you reconstruct one request.** One trace id created at receive (Module 5), then a span per stage — assemble, guard, call, validate, persist — with a nested span for every model call and tool execution carrying the attributes that actually answer questions: model id, prompt_version, temperature, input/output token counts, latency, finish_reason, tool name, cache hit or miss, validation outcome. Export to whatever backend you use (OpenTelemetry is the portable shape — as of 2026, provider and vendor support is broad but verify your stack). The debug workflow you are buying: a user reports a bad answer → trace id from the final event → span tree shows retrieval returned four chunks but assembly used two → the truncation ladder (Module 4) fired → attribute says budget 6k, used 6.1k. Ten minutes, versus Tuesday archaeology.

**Token accounting is cost observability.** Aggregate the usage attributes per request, per user, per prompt version, per tool round (Lesson 4 of Module 6 showed why rounds compound). Three numbers to dashboard: p95 tokens per request (window and cost health), cost per prompt_version (which release changed the bill), and per-user daily spend (the alarm that catches a runaway loop or a cost bomb — Module 9\'s threat, visible here first). Sample what you cannot afford to keep: head sampling for volume, tail-on-error always kept, PII redacted before export — traces are telemetry, not a second copy of user content. The habit that makes it all work: the trace id is returned to the client in the final event, so user reports and traces connect without anyone copying screenshots.`,
        diagram: `flowchart LR
  subgraph CI ["every commit: key-free"]
    U["unit: assemble, validate, dispatch, gating"] --> L["lint + types"]
  end
  subgraph GATE ["prompt changes / nightly"]
    F["recorded fixtures lane"] --> E["eval gate vs golden set"]
    E --> TH{"thresholds met?"}
    TH -->|"yes"| M["merge / promote"]
    TH -->|"no"| BLOCK["block with class report"]
  end
  subgraph OBS ["production"]
    R["trace id at receive"] --> S1["span: assemble"] --> S2["span: model call"] --> S3["span: tool"] --> S4["span: validate"]
    S4 --> F2["final event: usage, version, trace id"]
    S2 -.-> A["attrs: model, prompt_version, tokens, cache, finish"]
  end
  F2 -.->|"user report"| R`,
        extras: [
          table(
            'What goes in each span',
            ['Span', 'Attributes'],
            [
              ['assemble', 'prompt_version, messages count, token pre-count, truncation events'],
              ['model call', 'model id, temperature, tokens in/out, latency, finish_reason, cache hit'],
              ['tool', 'tool name, tier, round number, result bytes, outcome code'],
              ['validate', 'schema id, valid/repair/fallback, error classes'],
              ['persist / respond', 'usage totals, trace id, user id (hashed), cost estimate'],
            ],
          ),
          code(
            `# CI gate: deterministic lane always, eval lane on prompt changes
# .github/workflows/llm-gates.yml  (shape; adapt to your CI)
name: llm-gates
on: [push, pull_request]
jobs:
  deterministic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test -- --ignore=eval        # assembly, validation, tools: keys not needed
  eval-gate:
    if: contains(github.event.head_commit.message, 'prompt')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: node eval/run.js --set golden40 --recorded fixtures/v3.jsonl
        # thresholds live in eval/gate.config.json, not in the workflow
      - run: node eval/compare.js --baseline baseline/latest.json --max-drop 2 --safety-new-fail 0`,
            'llm-gates.yml',
            'yaml',
          ),
          code(
            `// tracing: one trace id, spans with the attributes that answer questions
import { trace, SpanKind } from "@opentelemetry/api";

export async function runTurn(ctx: Ctx, input: UserTurn) {
  const tracer = trace.getTracer("llm-app");
  const span = tracer.startSpan("turn", { attributes: {
    "app.user_hash": hash(ctx.userId),
    "app.trace_id": ctx.traceId,          // also returned to the client
  }});
  try {
    const built = await tracer.startActiveSpan("assemble", async (s) => {
      const b = await assemblePure(ctx, input);
      s.setAttributes({
        "prompt.version": b.version,
        "app.token_precount": b.preCount,
        "app.truncation": b.truncationSteps.join(",") || "none",
      });
      return b;
    });

    const reply = await tracer.startActiveSpan("model_call", async (s) => {
      s.setAttributes({
        "gen_ai.model": MODEL,
        "gen_ai.prompt_version": built.version,
        "gen_ai.tokens.input": 0,          // set from usage after the call
        "gen_ai.finish_reason": "unknown",
      });
      const r = await provider.chat(built, ctx.signal);
      s.setAttributes({
        "gen_ai.tokens.input": r.usage.prompt_tokens,
        "gen_ai.tokens.output": r.usage.completion_tokens,
        "gen_ai.finish_reason": r.finish_reason,
        "app.cache": r.cacheHit ? "hit" : "miss",
      });
      return r;
    });
    // ... validate span, persist span, then final event carries ctx.traceId
    return reply;
  } finally {
    span.end();
  }
}`,
            'trace.ts',
            'ts',
          ),
          tip(
            'Return the trace id to the client in the final event',
            'A user report with a trace id is a query; a user report with a screenshot is a treasure hunt.',
          ),
          warn(
            'Never retry a scoring failure until it passes',
            'Retries belong to transport errors only — retrying a failed eval score is rewriting the exam after grading.',
          ),
        ],
        worked: {
          title: 'Gate a prompt change and trace a production regression',
          problem:
            'The refund-window regression from the hook must become impossible to repeat: set up the two CI lanes and the tracing attributes, then walk a real incident using them.',
          steps: [
            {
              title: 'Build the deterministic lane first',
              desc: 'Forty unit tests, zero keys: assembly transcripts (golden message arrays per prompt version), truncation decisions, schema validation and repair routing, tool gating hashes, error classification. They run on every push and finish in under a minute — the fast feedback that makes the slower gate tolerable.',
              code_snippet:
                'test("prompt v7 keeps policy doc above history", () => {\n  const b = assemblePure({ history: LONG, version: "v7", docs: POLICY });\n  expect(b.messages[0].content).toContain("Policy document");\n  expect(b.preCount).toBeLessThan(b.budget);\n})\n# 40 tests, no network, no keys: every commit',
            },
            {
              title: 'Add the eval gate with written thresholds',
              desc: 'Prompt changes trigger the gate over the recorded-fixture lane: forty golden cases replayed through the new prompt with responses recorded for review, scored programmatically. Thresholds in config: no dimension drops more than two points, no new holdout safety failures. The Friday change that flipped retrieval order fails immediately: three citation misses appear as a class, and the merge is blocked with the class report attached.',
            },
            {
              title: 'Instrument the spans',
              desc: 'Trace id created at receive; assemble span carries prompt_version and token pre-count; model_call span carries model, version, tokens, finish_reason, cache hit; tool and validate spans follow; the final event returns the trace id to the client. Usage aggregates per user, version and day.',
            },
            {
              title: 'Replay Tuesday\'s incident with attributes',
              desc: 'Support pastes the trace id from the user\'s final event. The span tree: assemble used truncation_ladder step 2, budget 6,000, used 6,140; prompt_version v7 (the Friday change); retrieval returned four chunks, assembly packed two. Root cause in ten minutes: the new prompt lengthened the instructions and the ladder cut a chunk that carried the refund-window citation. Fix, gate, promote — with the whole episode readable as one trace.',
            },
          ],
          solution:
            'Two lanes, written thresholds and spans with the right attributes turned prompt regression from a Tuesday mystery into a blocked merge — and when escapes happen anyway, a trace id becomes a query instead of a week. The gate never needed a human to be clever; it needed thresholds someone wrote down in advance and fixtures that made the run cheap enough to block on.',
        },
        practice: {
          title: 'Set up the two lanes and one trace',
          prompt:
            'Count your current tests that need a key; move everything pure into a key-free suite and make it run on every commit. Add an eval gate for prompt changes with two written thresholds against your golden set. Instrument one trace: trace id at receive, spans for assemble and model call with model, prompt_version, tokens and finish_reason, and the id in your final event. Then take one real user complaint and answer it from the trace alone.',
          hint: 'If you cannot say what your gate blocks on, you have a report, not a gate — write the thresholds down.',
        },
        mistakes: [
          {
            mistake: 'Testing only code, never prompt behaviour',
            fix: 'Two lanes: deterministic suite every commit, eval gate on prompt changes and nightly.',
          },
          {
            mistake: 'Eval gates without written thresholds',
            fix: 'Config-held thresholds with class-level rules; a gate without a number is a report that blocks nothing.',
          },
          {
            mistake: 'Deleting or retrying failing eval cases',
            fix: 'Quarantine with an owner; retries for transport errors only, never for scoring failures.',
          },
          {
            mistake: 'Traces without prompt_version and token attributes',
            fix: 'Attributes are the investigation: version, model, tokens, finish_reason, cache, truncation — per span.',
          },
        ],
        exam: {
          question:
            'Describe the two CI lanes for an LLM app, the flakiness policy, and the span attributes a debuggable trace carries. How does a user report connect to a trace?',
          answer:
            'Lane one, deterministic and key-free, on every commit: assembly and truncation logic, schema validation and repair routing, tool dispatch and gating, error classification — recorded fixtures replay provider responses so post-processing changes are tested without tokens or variance. Lane two, the eval gate on prompt changes and nightly: a bounded golden-set run with explicit thresholds in config (maximum dimension drop, zero new holdout safety failures) so the gate blocks merges with a class report; known-flaky cases are labelled and judged by class-level thresholds, quarantined failures keep an owner and are never deleted, and retries cover transport errors only — retrying a scoring failure is rewriting the exam after grading. Traces: one trace id at receive, a span per stage and nested spans per model call and tool, carrying model id, prompt_version, temperature, token counts, latency, finish_reason, cache hit, tool name and validation outcome, exported in an OpenTelemetry-shaped pipeline with tail-on-error sampling and PII redaction. Connection: the final event returned to the client includes the trace id, so a user report with that id resolves to the exact span tree — assemble truncation, budget numbers, versions — turning archaeology into a query.',
          source: 'Platform interview: "how do you prevent prompt regressions from reaching production?"',
        },
        summary: [
          'Deterministic suite on every commit; eval gate with written thresholds on prompt changes.',
          'Recorded fixtures make the gate cheap enough to block on.',
          'Quarantine with owners; never delete a failure, never retry a score.',
          'Trace id at receive; spans with model, prompt_version, tokens, finish_reason, cache.',
          'Token dashboards: p95 per request, cost per version, spend per user.',
          'Return the trace id to the client — reports become queries.',
        ],
      }),
      [
        [
          'Which suite should run on every commit without provider keys?',
          [
            'The live eval gate over the full golden set',
            'Deterministic tests: assembly, validation, tool gating, error classification — with recorded fixtures where responses are needed',
            'LLM-as-judge over production traffic',
            'Only integration tests with real API calls',
          ],
          1,
          'Key-free determinism is what makes fast, flake-free feedback possible on every push.',
        ],
        [
          'An eval case fails because of model nondeterminism (it flips between runs). The policy is:',
          [
            'Delete the case — it is unreliable',
            'Retry the whole eval until the score passes',
            'Label it flaky, judge by class-level thresholds, and quarantine with an owner rather than deleting',
            'Freeze the provider version permanently',
          ],
          2,
          'Flakiness is characterised, not punished: labels and thresholds preserve signal without pretending it is deterministic.',
        ],
        [
          'The single most useful attribute on a model-call span for a prompt regression is:',
          [
            'The user agent string',
            'prompt_version alongside model id and token counts',
            'The HTTP method',
            'The server region only',
          ],
          1,
          'Version attribution is what links a behaviour change to the exact text that caused it.',
        ],
        [
          'A support ticket includes the trace id from the final event. With proper spans you can determine:',
          [
            'Which stage underperformed, which prompt version ran, whether truncation fired, tokens used, and the tool outcomes',
            'Only that the request succeeded',
            'The model\'s internal weights',
            'Whether the user was satisfied',
          ],
          0,
          'That reconstruction — stage, version, budget, tools — is the entire product of tracing.',
        ],
      ]
    ),
    lesson(
      M8,
      'lla-8-4',
      4,
      'Sampling Production Traffic and the Eval-to-Fix Loop',
      'You cannot label everything, so sample deliberately: outcome signals, outliers and a random slice, redacted and consented. Turn labels into golden cases, classify failures, pick the fix the class deserves, and run the loop on a cadence with guardrail metrics that stop you optimizing one number into ruin.',
      16,
      nineBlocks({
        objectives: [
          'Design a production sampling strategy: stratified signals plus a random slice, with privacy controls',
          'Convert labelled production failures into versioned golden cases',
          'Run the eval-to-fix loop: measure, classify, fix by class, gate, watch guardrails',
          'Balance quality metrics against guardrails so one number cannot be gamed into ruin',
        ],
        hook:
          'A team watches their judge score climb steadily for two quarters: 0.71 to 0.83. Costs per request tripled (the fix for every failure was "use the bigger model"), p95 latency went from 1.8 to 6.4 seconds, and thumbs-down rate — which nobody had wired to the dashboard — quietly doubled. The quality metric was optimised exactly as instructed, and the product got worse. The loop existed; the guardrails did not.',
        concept: `**Sampling is triage, and the signals pick the strata.** Four strata cover most needs. (1) Outcome signals: every thumbs-down, every repair event, every refusal, every round-cap hit — these are labelled for free and always worth reviewing. (2) Outliers: latency p99, cost per request, unusual tool patterns, high round counts — they catch the classes dashboards average away (the runaway loop, the 40 KB context). (3) Random: a small percentage of ordinary traffic, because signal-only sampling sees failures and forgets that most traffic is boring and possibly quietly broken in a way nobody thumbs down. (4) Targeted: new prompt version, new document type, new geography — the slices you need confidence in first. Ratios are yours to set; the discipline is that all four exist, because a random-only sample drowns in noise and a signal-only sample never measures the base rate.

**Privacy is a precondition, not a review item.** Production text is user content. Before anything enters a labelling queue: redact PII by detection plus your domain rules (names, emails, account numbers, anything your DPA forbids), drop or hash identifiers, respect retention settings (your provider agreement and your own policy both speak here), record consent posture, and keep raw text access logged and narrow — reviewers see the minimum, for the minimum time. A sample that fails privacy review teaches nobody anything because it never reaches an annotator. Keep the pipeline id: hashed user, trace id, prompt_version — enough to route and re-run, not enough to leak.

**From label to golden case.** When a failure is confirmed, it graduates: input (redacted) captured exactly as production delivered it, pre-written expectation of correct behaviour, scoring function, reason line naming the incident or feedback id, added to the repo via review — and the holdout gets a fresh copy of the class if that class was the gap. This is the mechanism by which your eval set tracks reality instead of your imagination: every production embarrassment becomes a permanent test. The set grows slowly and for reasons, which is exactly right.

**The loop, run on a cadence.** Measure (strata reviewed weekly) → classify (taxonomy: grounding, format, refusal misuse, tool error, injection attempt, latency, cost — extend it as reality adds classes) → pick the fix the class deserves (prompt contract for grounding, schema for format, routing for cost, guardrail for injection — each failure class has a home, which is why Part II\'s modules map to classes) → change one thing → gate on the dev set → canary → watch production signals for the version → promote or roll back. One change per cycle, so attribution survives. Cadence beats heroics: an hour a week compounds; a quarterly cleanup does not.

**Guardrails are the brakes on the loop.** Every quality target needs opposite-side metrics that must not move: quality up but cost per request, p95 latency, refusal rate, thumbs-down rate and safety-flag rate must hold or improve. Write them as explicit gate conditions ("judge +0.03 allowed only if p95 ≤ 2.5 s and cost/request ≤ baseline × 1.2"), because metrics without brakes are how a team tripled their bill while their dashboard smiled. Watch the meta-failure too: if the judge and production signals disagree — judge up, thumbs-down up — trust production and re-calibrate the judge (Lesson 2), because the judge grades samples you chose and users grade everything.`,
        diagram: `flowchart LR
  P["production traffic"] --> ST["strata: signals | outliers | random | targeted"]
  ST --> PRIV["redact + hash + consent posture"]
  PRIV --> Q["label queue (sampled)"]
  Q -->|"confirmed failure"| GC["new golden case: input + expectation + reason + PR"]
  Q --> CL["classify: grounding / format / refusal / tool / injection / latency / cost"]
  CL --> FIX["one fix, chosen by class"]
  FIX --> GATE["dev-set gate -> canary -> production watch"]
  GATE --> GUARD{"guardrails hold? cost, p95, refusal, thumbs"}
  GUARD -->|"yes"| PROMOTE
  GUARD -->|"no"| ROLL["rollback + re-diagnose"]
  PROMOTE --> ST`,
        extras: [
          table(
            'Failure class → the module that owns the fix',
            ['Class', 'Symptom', 'Fix lives in'],
            [
              ['Grounding', 'Invented facts, missing citations', 'Retrieval + prompt contract (context, RAG course)'],
              ['Format', 'Schema misses, type drift', 'M7 validation and repair'],
              ['Refusal misuse', 'Refuses in-scope / complies out-of-scope', 'M4 instructions + M9 policy'],
              ['Tool', 'Wrong call, hallucinated args, loops', 'M6 schemas, gating, bounds'],
              ['Injection', 'Instruction-following by input content', 'M9 defences'],
              ['Latency / cost', 'p99 blowups, token spikes', 'M10 caching, routing, caps'],
            ],
          ),
          code(
            `# sampling + the loop, with guardrails as gate conditions
from dataclasses import dataclass

@dataclass
class Sample:
    trace_id: str
    prompt_version: str
    stratum: str        # signal | outlier | random | targeted
    reason: str         # thumbs_down | repair | p99_latency | random_1pct | ...
    text_redacted: str

def weekly_queue(events) -> list[Sample]:
    return (
        take(signal_events(events), limit=60) +       # thumbs, repairs, refusals, round caps
        take(outliers(events, on=["latency_p99", "cost", "rounds"]), limit=30) +
        take(random_slice(events, pct=1), limit=30) +  # base rate, never zero
        take(targeted(events, versions=["v7"], docs=["new_scan_type"]), limit=30)
    )  # then redact_pii() + hash ids before anything reaches a reviewer

GUARDRAILS = {
    "judge_delta_min": 0.0,        # quality may not drop
    "p95_ms_max": 2500,
    "cost_per_req_max": 1.2,       # multiplier vs baseline
    "thumbs_down_rate_max": 1.0,   # multiplier vs baseline
    "refusal_rate_max": 1.1,
}

def promote(candidate, baseline, prod_week) -> tuple[bool, list[str]]:
    verdicts = []
    for rule, limit in GUARDRAILS.items():
        val = compare(candidate, baseline, prod_week, rule)
        verdicts.append(f"{rule}: {val} -> {'ok' if within(val, limit) else 'BLOCK'}")
    return all("BLOCK" not in v for v in verdicts), verdicts

# cadence: measure weekly -> classify -> ONE fix -> gate -> canary -> watch -> promote/rollback`,
            'loop.py',
            'python',
          ),
          tip(
            'Keep a random stratum even when signals look complete',
            'It is the only one that measures the base rate of problems nobody reported.',
          ),
          warn(
            'Judge score up while thumbs-down up means trust the users and re-calibrate the judge',
            'Your judge grades samples you chose; users grade everything.',
          ),
        ],
        worked: {
          title: 'Run four weeks of the loop on the support assistant',
          problem:
            'The team has a judge, a golden set and no production loop: failures arrive as complaints, fixes arrive as panic. Install the sampling queue, the classification habit and the guardrails, then run a month.',
          steps: [
            {
              title: 'Stand up the strata and the redaction boundary',
              desc: 'Weekly queue: 55 signal events (thumbs-down, repairs, refusals), 25 outliers (p99 latency, cost spikes, rounds ≥ 5), 20 random one-percent samples, 15 targeted at the new v7 prompt. Redaction runs before the queue — emails, phone numbers and account ids are stripped and ids hashed; reviewers see trace id and version, not identities.',
              code_snippet:
                'week 1: 55 signal + 25 outlier + 20 random + 15 targeted -> redact -> label\nlabels: 22 confirmed failures across 5 classes\nnew golden cases: 9 (reason lines reference feedback ids F-2210..F-2244)',
            },
            {
              title: 'Classify, then fix only what the class says',
              desc: 'Classes: grounding 9, format 3, tool-loop 4, injection attempts 4, latency 2. The grounding class is largest → one fix: tighten the citation contract and chunk packing (not a model swap). Injection attempts go to the M9 backlog with concrete payloads. Tool-loop cases become three new eval cases plus a lower round cap. One change per cycle, so attribution survives.',
            },
            {
              title: 'Gate, canary, watch with guardrails armed',
              desc: 'The grounding fix passes dev (37/40, no class regressions) and canaries at 10 percent. Guardrails on the dashboard: judge +0.04, p95 2.1 s (under 2.5), cost/request 1.06× (under 1.2), thumbs-down down 18 percent. Two days, then promote. The injection and loop cases stay visible as classes, not as pressure to bundle unrelated fixes.',
            },
            {
              title: 'Read the month',
              desc: 'Golden set grew from 40 to 49 cases, every one with an incident or feedback reason. Thumb-down rate down, judge up, cost within bounds, and the two latency outliers traced to a 40 KB tool result — capped in M6 style, verified next week. The loop is now boring, which is what working looks like.',
            },
          ],
          solution:
            'Sampling with four strata made failures arrive on a schedule instead of as emergencies; classification made each fix the one its class deserved; the reason-lined cases made the set track reality; and guardrails made sure the improvements could not quietly triple a bill. Four weeks of boring cadence out-produced two quarters of heroic firefighting — and the one number the old dashboard worshipped is now one line among six that must all hold.',
        },
        practice: {
          title: 'Start your weekly loop',
          prompt:
            'Define four strata for your app with weekly limits, and put a redaction step in front of the queue. Review one week of samples, classify every confirmed failure, and pick the single fix the largest class deserves. Add the resulting cases to your golden set with reason lines. Then write your guardrail block: four metrics besides quality, with the exact values that would block a promote.',
          hint: 'If your quality metric can rise while cost triples with nothing to stop it, the loop is missing brakes, not steps.',
        },
        mistakes: [
          {
            mistake: 'Sampling only what users complain about',
            fix: 'Add a random stratum for base rate, outliers for the quiet blowups, targeted for new versions and types.',
          },
          {
            mistake: 'Labeling without a privacy boundary',
            fix: 'Redact, hash and set retention before any reviewer sees text; queue carries ids, not identities.',
          },
          {
            mistake: 'Fixing whatever arrived loudest',
            fix: 'Classify first, fix the largest class with one change — attribution requires one change per cycle.',
          },
          {
            mistake: 'No guardrails around a quality target',
            fix: 'Cost, latency, refusal and thumbs-down are gate conditions — metrics without brakes invite ruin.',
          },
        ],
        exam: {
          question:
            'Name four sampling strata and why each exists. Describe the path from a production failure to a golden case, and explain how guardrails constrain a promote decision.',
          answer:
            'Strata: signal events (thumbs-down, repairs, refusals, round caps — labelled for free and always reviewed); outliers (p99 latency, cost, high round counts — they catch what averages hide); a random slice (the only measure of the base rate of problems nobody reported); and targeted slices (new prompt versions, document types, geographies — wherever confidence is needed first). Each exists because the others miss things: signal-only forgets the base rate, random-only drowns in noise. Failure-to-case path: redact PII and hash ids first (privacy is a precondition), label in the queue, confirm the failure, then graduate it into versioned JSONL — input as delivered, pre-written expectation, scoring function, reason line citing the incident or feedback id, added through review, with holdout refreshed for the class that was the gap. Guardrails: explicit gate conditions on the metrics that quality can damage — p95 latency ceiling, cost-per-request multiplier, refusal and thumbs-down rate caps — evaluated against baseline and a week of production signals; a candidate that wins on quality but breaches a guardrail is blocked and rolled back. Meta-rule: when judge scores and production signals disagree, trust production and re-calibrate the judge.',
          source: 'Product-engineering question: "how do you run quality as an ongoing practice, not a launch checklist?"',
        },
        summary: [
          'Four strata: signals, outliers, random, targeted — all four, every week.',
          'Redact and hash before anyone labels; privacy is a precondition.',
          'Confirmed failures graduate into golden cases with reason lines.',
          'Classify, then fix the largest class with exactly one change per cycle.',
          'Guardrails block promotes: cost, latency, refusal and thumbs must hold.',
          'Judge and users disagree → trust users, re-calibrate the instrument.',
        ],
      }),
      [
        [
          'Why keep a random stratum alongside signal-based sampling?',
          [
            'It is cheaper to label',
            'It measures the base rate of problems nobody reported — signals only see what someone noticed',
            'Providers require it',
            'It replaces the need for outliers',
          ],
          1,
          'Unreported quiet failures exist only in the random slice; that is its whole job.',
        ],
        [
          'Before production samples reach human reviewers, you must:',
          [
            'Run them through the judge for a quality score',
            'Redact PII, hash identifiers and apply retention policy — privacy is a precondition for labelling',
            'Send them to a second provider for cross-checking',
            'Anonymise only if a complaint arrives later',
          ],
          1,
          'A sample that cannot pass privacy review never reaches an annotator and teaches nobody anything.',
        ],
        [
          'The largest confirmed failure class is grounding (invented facts). The correct fix order:',
          [
            'Swap to the largest model immediately, then re-measure everything',
            'Fix the largest class with one change (prompt contract and context packing), gate it, canary it — one change so attribution survives',
            'Bundle three unrelated fixes to save time',
            'Delete the failing cases until the rate recovers',
          ],
          1,
          'One change per cycle is what lets the gate tell you which change helped; bundling destroys attribution.',
        ],
        [
          'Judge score rises 0.05 but thumbs-down rate doubles. Best action:',
          [
            'Celebrate the judge win',
            'Trust production signals over the judge, investigate the disagreement, and re-calibrate the judge on the disputed cases',
            'Raise the judge temperature',
            'Stop collecting thumbs-down feedback',
          ],
          1,
          'The judge grades samples you chose; users grade everything — disagreement is a judge bug until proven otherwise.',
        ],
      ]
    ),
  ],
};
