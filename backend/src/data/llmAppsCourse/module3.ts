// Module 3 — UX for AI: Streaming Surfaces, Uncertainty, Errors and Feedback
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code } from '../nineBlocks';
import { lesson, M3, COURSE_ID } from './helpers';

export const module3: CourseModule = {
  id: M3,
  course_id: COURSE_ID,
  title: 'Module 3 — UX for AI: Streaming, Uncertainty, Errors and Feedback',
  summary:
    'The model is only half the product. This module covers the surface: token-by-token rendering that survives partial JSON, uncertainty affordances that stop discarding the model\'s own hedges, error states that map each failure class to distinct language and recovery, and the feedback and first-run loops that turn usage into evaluation data.',
  sort_order: 3,
  lessons: [
    lesson(
      M3,
      'lla-3-1',
      1,
      'Streaming UI: Rendering Tokens and Surviving Partial JSON',
      'Deltas arrive one fragment at a time. Render them without layout thrash, decide how (and whether) to parse JSON before it is complete, and manage the client lifecycle: aborts, reconnects and honest truncation.',
      16,
      nineBlocks({
        objectives: [
          'Build a token renderer that batches updates and avoids quadratic re-render cost',
          'Choose a strategy for partial JSON: buffer-and-parse or incremental field build',
          'Handle mid-stream death by keeping partial text and marking truncation',
          'Manage lifecycle: abort on unmount, reconnect policy, accessibility of progressive text',
        ],
        hook:
          'Two chat UIs sit side by side on the same network. The first re-renders the entire message on every token and re-parses a growing markdown string each time; scrolling stutters, the cursor jumps, and a half-finished table flickers like a broken sign. The second batches updates per frame and renders a stable surface that merely grows. Same model, same tokens, same backend — and users describe one as fast and the other as janky. In AI products, the renderer is part of the model experience.',
        concept: `**What the stream hands you.** Each server-sent event carries a delta: a fragment of the eventual message. The client accumulates deltas into a buffer and updates the view. The naive implementation — setState on every delta, re-render the whole thread, re-parse markdown from scratch — costs quadratically as the answer grows and fights the browser's layout. The working implementation treats rendering as an append pipeline.

**Rendering without thrash.** Three moves. (1) Batch: accumulate deltas into a plain string and flush to the DOM on animation frames or at a small token threshold, not per event — 60 updates a second is a ceiling, not a target. (2) Incremental markdown: a growing answer is an incomplete document; use a parser that tolerates unterminated code fences and tables, or render plain text until the stream ends and then do one rich pass — never full re-parse per token on long answers. (3) Scroll ownership: auto-scroll only while the user is at the bottom; the moment they scroll up to read, detach, and offer a jump-to-latest affordance. Clobbering a reader's scroll position mid-stream is the most common self-inflicted streaming wound. Add a blinking caret while streaming, stop it on done, and keep selection usable — users copy mid-answer.

**The partial JSON problem.** When the model streams structured output, every chunk is a prefix: {"na, then {"name":"Ad — invalid JSON at every intermediate point. You cannot JSON.parse until the end, and if your UI needs the values earlier, you need a different strategy:

1. **Buffer and parse at end.** Stream for feel, parse on completion, show a validating state for the tail. Simplest, usually right when the consumer needs the whole object (a form that appears when ready).
2. **Incremental field build.** Run a tolerant streaming-JSON scanner that emits key-value pairs as they close: complete a field when its closing delimiter arrives, render it, keep the unfinished one invisible. Libraries exist for this; writing one means handling escaped quotes, nested arrays and unicode boundaries. This gives progressive form fill.
3. **Item-wise flush for arrays.** For a streamed list of results, detect item boundaries and flush complete items — the user sees a growing list while the last item is still forming.

Tool calls (Part II) stream as partial argument text and hit the same problem server-side: do not act on arguments until the call event completes and validates.

**Lifecycle, the expensive part.** The stream is a live billed connection. Abort it when the component unmounts or the user navigates, or every closed tab keeps paying for tokens. Reconnects cannot replay mid-stream on most providers (some offer continuation by response id — verify current docs), so a dropped connection should render what arrived, mark it truncated, and offer continue or regenerate. On reconnect, guard against double-appending: deltas are not idempotent, so resume logic must track what was already applied.

**Accessibility.** Announce progressive text sparingly — screen readers should not read every token; announce on completion or at paragraph boundaries. Respect reduced-motion for the caret animation. And never rely on colour alone for the streaming state.`,
        extras: [
          table(
            'Partial JSON strategies',
            ['Strategy', 'How', 'Cost', 'Fits'],
            [
              ['Buffer + parse at end', 'Accumulate, parse on done, one render', 'Low', 'Forms, cards, any whole-object consumer'],
              ['Incremental scan', 'Streaming JSON parser emits closed fields', 'Medium', 'Progressive fill, long generations'],
              ['Item-wise flush', 'Split on array item boundaries', 'Low', 'Lists of results arriving one by one'],
            ],
          ),
          code(
            `// batched renderer: deltas -> buffer -> frame flush -> DOM\nlet pending = "";\nlet raf = 0;\n\nfunction onDelta(text: string) {\n  pending = text;\n  if (raf) return;\n  raf = requestAnimationFrame(() => {\n    raf = 0;\n    el.textContent = pending;          // append-friendly write\n  });\n}\n\n// abort on unmount: stop paying for unread tokens\nuseEffect(() => {\n  const ctrl = new AbortController();\n  stream({ signal: ctrl.signal });\n  return () => ctrl.abort();\n}, []);\n\n// parse only on completion, never per token\nasync function finish(rawStreamText: string) {\n  const json = stripFences(rawStreamText);\n  const parsed = schema.safeParse(JSON.parse(json));\n  if (!parsed.success) return showValidateError(parsed.error);\n  renderForm(parsed.data);\n}`,
            'renderer.ts',
            'ts',
          ),
          tip(
            'Never JSON.parse a growing stream',
            'Parse at completion or with a real streaming scanner — there is no valid middle ground between those two.',
          ),
          warn(
            'Unmount without abort is a slow leak of money',
            'Each abandoned tab that keeps streaming is tokens you buy for nobody. Abort is a cost control.',
          ),
        ],
        worked: {
          title: 'Fix a janky streaming UI and a flashing JSON form',
          problem:
            'A research assistant renders streamed prose plus a structured citation list. Users report stutter, scroll fights, and a form that flashes undefined twice before appearing. Profile, then rebuild the render path.',
          steps: [
            {
              title: 'Profile: the per-token full re-render',
              desc: 'The component holds the partial answer in state and maps over the whole thread list on every delta; markdown is re-parsed from scratch each time. At 80 tokens a second that is quadratic work and a layout pass per token.',
              code_snippet:
                '// BEFORE: one delta -> whole thread re-render + full re-parse\nfunction OnDelta(chunk) {\n  setText(text + chunk);            // state update per token\n  const html = renderMarkdown(text); // full re-parse every token\n  setThread(thread.map(t => t.id === id ? { ...t, html } : t));\n}',
            },
            {
              title: 'Batch the writes, isolate the growing node',
              desc: 'Accumulate deltas in a ref, flush on animation frames, and update only the streaming message node — never the whole thread. Markdown switches to plain text while streaming and does one rich pass at done.',
            },
            {
              title: 'Detach scroll from the user the moment they scroll up',
              desc: 'Track atBottom; auto-scroll only while true; show a jump-to-latest chip when false. Selection stays usable so people can copy mid-answer.',
            },
            {
              title: 'Tame the JSON: buffer, validate, then render fields',
              desc: 'The citation list was parsing partial JSON every tick — hence undefined flashes. Now deltas accumulate silently, the object is parsed once on the done event, validated against the schema, and only then rendered. The user sees a stable placeholder, then a complete form.',
              code_snippet:
                '// citations: buffer until done, then one parse\nlet buf = "";\nonDelta(d => { buf += d; showPlaceholder(); });\nonDone(() => {\n  const r = citationsSchema.safeParse(JSON.parse(stripFences(buf)));\n  r.success ? renderCitations(r.data) : renderCitationError(r.error);\n});',
            },
          ],
          solution:
            'Frame batching and node-local updates removed the quadratic cost; scroll detachment removed the fights; and parsing once at completion removed the flashing undefined values the partial-JSON bug always produces. The design rule behind all three: streaming is a live document, not a finished one — render what is stable, buffer what is not, and spend the expensive work (markdown, parsing, validation) once, at the done event. TTFT did not change by a millisecond, yet users now call the feature fast.',
        },
        practice: {
          title: 'Instrument and rebuild your renderer',
          prompt:
            'Measure your streaming UI: updates per second, time from delta to painted frame, and re-parse count per answer. Rebuild with frame batching, node-local updates and scroll detachment. Then break your own stream mid-answer and confirm the partial text survives with a truncated marker and a continue action.',
          hint: 'If one token causes a full thread re-render, your cost curve is quadratic in answer length — fix that before touching the model.',
        },
        mistakes: [
          {
            mistake: 'setState and full markdown re-parse on every token',
            fix: 'Batch into frames, update only the growing node, re-parse rich formatting once at completion.',
          },
          {
            mistake: 'JSON.parse on a growing stream',
            fix: 'Buffer to done, or use a streaming JSON scanner that emits closed fields; nothing in between is valid.',
          },
          {
            mistake: 'Forcing scroll to bottom while the user reads up',
            fix: 'Auto-scroll only when already at the bottom; offer jump-to-latest once they leave it.',
          },
          {
            mistake: 'Leaving the stream running after unmount or navigation',
            fix: 'Abort with a controller tied to component lifetime; treat orphaned generation as a cost bug.',
          },
        ],
        exam: {
          question:
            'Why is partial JSON invalid mid-stream and what are two correct strategies for handling it? Name three practices that keep a streaming renderer smooth and one lifecycle rule that protects the budget.',
          answer:
            'A streamed object is a prefix of JSON at every intermediate point — {"na or {"name":"Ad are not parseable documents — so JSON.parse only becomes legal once the stream completes. Two correct strategies: (1) buffer-and-parse-at-end, accumulating deltas and parsing once on the done event (optionally with a validating placeholder state), which is simplest and right when the consumer needs the whole object; (2) incremental build with a tolerant streaming JSON scanner that emits fields as they close, enabling progressive form fill, at the cost of handling escapes and nesting. Smooth rendering practices: batch delta updates into animation-frame flushes instead of one state write per token; update only the growing message node rather than re-rendering the whole thread; parse markdown incrementally or once at completion rather than fully per token; and detach auto-scroll when the user scrolls up so they can read and copy. Lifecycle rule: abort the upstream stream when the component unmounts or the user navigates — abandoned generations bill someone, and that someone is you.',
          source: 'Front-end interview topic for AI products: streaming render and partial structured output.',
        },
        summary: [
          'Stream render is an append pipeline: buffer deltas, flush per frame, touch one node.',
          'Partial JSON is never parseable mid-stream: parse at done, or scan incrementally.',
          'Scroll belongs to the user the moment they scroll up.',
          'Markdown richness can wait for the done event; the caret cannot.',
          'Abort on unmount, guard reconnects against double-appends, mark truncation honestly.',
          'Progressive text needs accessibility handling: announce sparingly, respect reduced motion.',
        ],
      }),
      [
        [
          'Why must you not call JSON.parse on every streaming delta of a JSON object?',
          [
            'Each delta is a prefix of the object and therefore not valid JSON until the stream completes',
            'It is too slow',
            'It triggers extra provider billing',
            'JSON.parse mutates the stream buffer',
          ],
          0,
          'Intermediate prefixes are syntactically incomplete; parse at completion or with a real streaming scanner.',
        ],
        [
          'The user scrolls up mid-answer to re-read. Your renderer should:',
          [
            'Keep force-scrolling so the newest token stays visible',
            'Pause generation until they return',
            'Detach auto-scroll, keep streaming, and offer a jump-to-latest affordance',
            'Clear the old text to make room',
          ],
          2,
          'Reading is a core use case; yanking the viewport mid-stream is a self-inflicted wound.',
        ],
        [
          'A component unmounts while the answer is still streaming. Required action:',
          [
            'Nothing - the provider stops on its own',
            'Send the remainder to a background queue automatically',
            'Re-render the component to finish the stream',
            'Abort the request so unread tokens stop being generated and billed',
          ],
          3,
          'Generation continues server-side until the connection drops; aborting is how you stop paying.',
        ],
        [
          'Best practice for markdown-heavy streamed answers:',
          [
            'Full markdown re-parse on every token',
            'Plain text while streaming, one rich parse at the done event (or a tolerant incremental parser)',
            'Disable markdown entirely',
            'Render markdown only after user clicks refresh',
          ],
          1,
          'Rich parsing is the expensive step; doing it once at completion keeps the frame budget healthy.',
        ],
      ]
    ),
    lesson(
      M3,
      'lla-3-2',
      2,
      'Uncertainty Affordances: Surfacing "I Am Not Sure" Honestly',
      'Models hedge, refuse, and sometimes lie confidently. Design affordances that preserve the signals that exist, add structure where you can, and route low-confidence answers to actions instead of hoping users notice a footnote.',
      16,
      nineBlocks({
        objectives: [
          'Distinguish uncertainty, refusal and confident error as three different signals',
          'Capture answerability or confidence as structured fields and route on them',
          'Design inline affordances that keep hedges visible next to their claims',
          'Write an app policy for low-confidence outcomes: ask, abstain, escalate',
        ],
        hook:
          'A medical-legal document assistant answers a paralegal with the words: I am not sure, but the clause appears to permit sublicensing. The UI renders the whole thing as ordinary answer text. The hedge scrolls off the screen in the first second, the confident-looking second half gets screenshotted into a memo, and three weeks later someone finds the governing statute says otherwise. The model had flagged its own doubt. The interface threw the flag away.',
        concept: `**Three signals, not one.** Any LLM answer carries one of three quality states, and UX must treat them differently:

1. **Expressed uncertainty** — hedging language: I think, it depends, according to X but verify, I am not sure. The model is telling you something. It correlates with error better than nothing, and worse than you want.
2. **Refusal** — the model declines: policy, safety, or unsupported task. Not doubt; a decision. It deserves its own state, its own copy, and its own log.
3. **Confident error** — no signal at all. The dangerous class. No design makes it disappear; your job is to stop destroying the other two signals and to add structure that creates new ones.

**Do not trust the tone.** Well-established finding: fluency and confidence in phrasing are weakly related to correctness, and self-reported confidence is poorly calibrated. So the design goal is not a vibes-based trust meter — it is signal capture and routing.

**Make answerability structural.** Where your app has sources, add fields to the structured response (Module 2, Lesson 3): answerable as a boolean, or a confidence enum, or a cited_sources array that must be non-empty for factual claims. Then instruct: answer only from the provided context; if the answer is not there, set answerable false. This abstention pattern is dramatically better calibrated than asking a model how sure it feels in the abstract — because it is a check against evidence the model can see, not a mood report. Where you have no sources, self-rated confidence is still worth capturing as a weak routing signal; just never present it to users as a percentage, which is pseudo-precision.

**Affordances that keep the signal.** (1) Inline: attach the hedge to the claim it hedges — an underline or badge that expands to show the model's own caveat and the source excerpt. (2) Citations: show what the model said next to what the document says; clickable, not decorative. (3) Verify actions: copy-with-citation, open the source, send to review. (4) Placement near the claim, not a global meter in the corner — users read prose, not chrome. (5) Warning economy: if everything is flagged, nothing is. Route the bottom band to warnings; leave the middle clean; spend your credibility on the cases that matter.

**The policy is the product.** Captured signal must trigger a decision in code:

- answerable false → the no-data state: state what is missing, offer what you can do (search, narrower question, human).
- low confidence → show the answer with inline verification affordances plus a next step, or ask one clarifying question when the doubt is about intent.
- refusal → policy copy with permitted alternatives, never a crash state (Lesson 3 covers the full error language).
- high confidence → clean answer with citations where the domain warrants.

**Where hedges come from and what to do about them.** Models hedge on ambiguity, on missing context, on conflicting instructions, and on genuinely uncertain recall. The app-side fixes are mostly upstream: better context (Module 4), a clarifying-question affordance, and an output contract that makes abstention a first-class field. Downstream, log every routed-low case — that is your future evaluation set (Lesson 4 and Module 8).`,
        extras: [
          table(
            'Signal, capture and action',
            ['Signal', 'How it arrives', 'Capture', 'UI and routing'],
            [
              ['Hedged answer', 'Prose hedges in text', 'Keep text; optionally answerable field', 'Inline badge near the claim; expand to caveat and source'],
              ['Refusal', 'Refusal event or declining text', 'Log as refusal, not error', 'Policy copy plus permitted alternatives'],
              ['No answer in context', 'answerable false from the model', 'Structured field, first-class', 'Honest no-data state with next steps'],
              ['Confident error', 'Nothing', 'Downstream corrections, thumbs, evals', 'Citations and verification affordances reduce exposure'],
            ],
          ),
          code(
            `// abstention as a field, routing as code\nconst AnswerSchema = {\n  type: "object",\n  additionalProperties: false,\n  required: ["answerable", "answer", "citations"],\n  properties: {\n    answerable: { type: "boolean" },\n    answer:     { type: "string" },\n    citations:  { type: "array", items: { type: "string" } },\n  },\n};\n\n// system: "Answer ONLY from the context. If the answer is not\n// present, set answerable to false and leave answer empty."\n\nfunction present(a) {\n  if (!a.answerable) return viewNoData({ missing: lastQuestion });\n  if (a.citations.length === 0 && needsCitation(lastQuestion))\n    return viewLowConfidence({ answer: a.answer, verify: true });\n  return viewAnswer({ answer: a.answer, citations: a.citations });\n}\n\n// every routed-low case lands in the eval inbox with full context\nif (!a.answerable || a.citations.length === 0)\n  await evalInbox.add({ case: lastCase, reason: "low_confidence" });`,
            'routing.ts',
            'ts',
          ),
          tip(
            'Abstention beats bravado',
            'A model told to answer only from context and to set answerable false otherwise is far more honest than one free-associating with a disclaimer.',
          ),
          warn(
            'A global confidence percentage is decoration',
            'Un-calibrated, un-actionable and ignored after a week. Route on structure; keep signals next to claims.',
          ),
        ],
        worked: {
          title: 'Design the honesty layer for a policy Q&A assistant',
          problem:
            'A policy assistant answers from uploaded handbooks. Users have started double-checking everything because the bot is wrong sometimes and sounds identical when it is. Add the honesty layer: structural abstention, inline affordances, and a routing policy — without drowning the interface in warnings.',
          steps: [
            {
              title: 'Add abstention to the contract',
              desc: 'Structured output with answerable plus citations drawn from the provided chunks only. The system prompt makes the rule explicit: answer from context; if absent, answerable false and an empty answer. Chunk ids in citations let the UI link straight back to source text.',
            },
            {
              title: 'Three views, chosen in code',
              desc: 'NoData: what is missing, a rephrase suggestion, and an ask-a-human action. LowConfidence: the answer with a verify badge inline and the source excerpt one tap away. Confident: the answer with citations — no badge, no ceremony.',
            },
            {
              title: 'Keep hedges attached to claims',
              desc: 'When the prose still hedges (the model said reportedly), the renderer wraps that sentence with a subtle underline that expands to the model caveat and the chunk text. The hedge can no longer scroll away from the sentence it qualifies.',
            },
            {
              title: 'Measure honesty, not just volume',
              desc: 'Track answerable-false rate, citation-miss rate, thumbs by view type, and downstream corrections. The target is not zero NoData — a rise in NoData after tightening the prompt may be honesty improving, so read these metrics together with user outcomes.',
            },
          ],
          solution:
            'Doubt became data: answerable false is a value the router branches on, citations turn claims into checkable objects, and hedges are physically attached to the sentences they qualify. Users now meet three clearly different states instead of one confident voice that is occasionally wrong — which recalibrates trust the only way that lasts: through visible, consistent evidence. And every routed-low case lands in the eval inbox with its full context, so the honesty layer is also the instrument that will drive the next round of prompt and retrieval improvements.',
        },
        practice: {
          title: 'Capture a doubt signal and route on it',
          prompt:
            'Add one structural doubt signal to a real endpoint: answerable, confidence enum, or required citations. Build the three views (no-data, low-confidence, clean) and log every routed-low case with prompt version and context. After a day of traffic, report the routed-low rate and whether it matches what users complained about.',
          hint: 'If your model cannot point at a source, it cannot check itself — grounding is the cheapest honesty feature you can build.',
        },
        mistakes: [
          {
            mistake: 'Letting the hedge live only in prose where it scrolls away',
            fix: 'Attach the signal to the claim: inline badge or underline that expands to the caveat and the source.',
          },
          {
            mistake: 'Showing a global confidence percentage as truth',
            fix: 'Self-reported confidence is poorly calibrated; capture it as a weak routing signal and never as a user-facing number.',
          },
          {
            mistake: 'Treating refusal and uncertainty as the same state',
            fix: 'Refusal is a decision with policy copy and alternatives; uncertainty is doubt needing sources or a clarifying question.',
          },
          {
            mistake: 'Flagging everything to be safe',
            fix: 'Warning fatigue makes users ignore real flags. Route only the bottom band, and keep clean answers clean.',
          },
        ],
        exam: {
          question:
            'Differentiate expressed uncertainty, refusal and confident error. Describe the abstention pattern with structured output and explain why it outperforms asking the model how confident it feels. Give two UI affordances that preserve uncertainty signals.',
          answer:
            'Expressed uncertainty is hedging inside an answer — weakly correlated with error, but a real signal; refusal is a decision to decline with policy reasons — a domain outcome, not doubt; confident error carries no signal at all and cannot be eliminated by design, only reduced by grounding and evaluation. The abstention pattern adds a structured field such as answerable (or a confidence enum plus required citations) to the schema, with an instruction to answer only from provided context and set answerable false when the answer is absent. It outperforms self-reported confidence because it checks evidence the model can see rather than asking for a mood rating, and because a boolean routes cleanly in code: NoData view, low-confidence view, or clean answer. UI affordances that preserve the signal: inline badges or underlines attached to the hedged claim that expand to the model caveat and source excerpt; and citation chips that show the source text next to the claim, making verification one tap away instead of a footnote that scrolls off.',
          source: 'Responsible-AI design question: how should an interface surface model doubt?',
        },
        summary: [
          'Uncertainty, refusal and confident error are three states — design three experiences.',
          'Fluent tone is not correctness; route on structure, not vibes.',
          'Abstention fields (answerable, citations) are the calibrated doubt signal — build them into the schema.',
          'Keep hedges attached to claims; global confidence meters are pseudo-precision.',
          'Low-confidence policy is code: ask, abstain, cite, or escalate — explicitly.',
          'Every routed-low case is future eval data; log it with full context.',
        ],
      }),
      [
        [
          'The abstention pattern means:',
          [
            'Refusing all questions outside a topic list',
            'Showing a disclaimer under every answer',
            'Requiring a structured field such as answerable and instructing the model to set it false when context lacks the answer',
            'Lowering temperature until the model declines more',
          ],
          2,
          'Abstention is a first-class value in the contract, checked against visible context — not a vibe.',
        ],
        [
          'Why is a global confidence percentage usually a bad UI affordance?',
          [
            'It costs too many tokens',
            'Providers forbid exposing it',
            'It breaks streaming',
            'Self-reported confidence is poorly calibrated and un-actionable; users ignore chrome and read prose',
          ],
          3,
          'Pseudo-precision that routes nothing; put signals next to claims where reading happens.',
        ],
        [
          'A model replies: I am not certain, but the refund window is probably 14 days. Best UI treatment:',
          [
            'Strip the hedge so the answer looks clean',
            'Attach the hedge to the claim: inline affordance linking to the source excerpt and a verify action',
            'Render as plain text like any answer',
            'Convert it to a refusal state',
          ],
          1,
          'The hedge is evidence about that sentence; keep it adjacent and expandable instead of discarding it.',
        ],
        [
          'After tightening a grounding prompt, the answerable-false rate rises from 4 percent to 15 percent. Best interpretation:',
          [
            'Possibly honesty improved — read the change together with thumbs, corrections and user outcomes before judging',
            'The prompt is broken and should be rolled back immediately',
            'The model got dumber',
            'Users must be trained to ignore the no-data state',
          ],
          0,
          'Abstention rate is not a standalone score; fewer wrong confident answers may be a win even as NoData rises.',
        ],
      ]
    ),
    lesson(
      M3,
      'lla-3-3',
      3,
      'Error States: Distinct Language, Distinct Recovery',
      'Timeout, rate limit, refusal, no-data and validation failures each want a different user action. One generic something-went-wrong message is a routing failure; build the map from failure class to copy, action and owner.',
      16,
      nineBlocks({
        objectives: [
          'Map each failure class to distinct user-facing language with a concrete action',
          'Design refusal UX that states policy without blaming the user',
          'Implement a degradation ladder from queue-and-wait to human handoff',
          'Keep internals out of user copy while keeping trace ids in for support',
        ],
        hook:
          'Every failure in a support bot says the same thing: Oops, something went wrong. Please try again. Users try again — three, four times — then leave. The logs show that 70 percent of those failures were rate limits that would have cleared in eight seconds, ten percent were refusals that should never be retried, and a handful were validation errors a good inline message would have prevented at the field. One message class, three different correct actions, all of them lost.',
        concept: `**Error UX is a routing problem.** Each failure class has a different correct user action: wait, retry, rephrase, fix input, give up, escalate. A single generic message cannot route, so users guess — and they guess badly. The design artifact is a map: class to copy to action to owner.

**The map, class by class.**

- **Slow, still thinking.** Past your first-byte threshold with the connection alive: the model is working, not broken. Show activity — streaming has not started, but a state can. Copy like still working on it, this can take a moment. Never a spinner alone after four seconds.
- **Timeout / connection lost.** Dead connection: offer a retry with context (we lost the connection, your question was not lost). If partial text arrived, keep it and mark it truncated (Lesson 1). One visible retry button, not silent loops.
- **Rate limited — yours.** User-facing quotas get honest copy with a countdown: you have hit the hourly limit, try again in 12:00 — plus what they can do meanwhile. A limit without a next step reads as punishment.
- **Rate limited — provider.** Usually invisible: your server queues and retries (Module 2). Surface only when the wait exceeds your patience budget, and then in human terms: unusually busy, we are holding your message.
- **Refusal.** Not an error. Policy copy that names the boundary without scolding: I cannot help with that, but I can help with X — offer permitted alternatives. Log it for abuse analysis (Part II, M9). Never render a refusal as a crash.
- **No data / cannot answer.** The abstention state of Lesson 2: what is missing, what you can do instead.
- **Input validation.** Fail at the field, before the model call — cheapest failure there is, and the only one the user can fully fix themselves.
- **Auth and billing.** Account-level, not chat-level: your session expired, sign in again; or plan limits, upgrade.

**Never leak, always trace.** User copy carries no stack traces, no provider error dumps, no internal paths, no keys. It carries a short trace id — Error ID 4f2a91 — which is the bridge between a user report and your logs. The raw error goes to the log with that id and the full taxonomy (Module 1, Lesson 4). Your support team should be able to paste an id and see the exact stage that failed.

**The degradation ladder.** Before you fail, walk down: (1) short queue-and-wait, bounded by your latency budget; (2) one invisible retry for retryable classes; (3) a fallback that is still true — cached answer only where semantics are safe, a smaller model for lower-stakes steps, or a degraded result flagged in the UI; (4) async: we will finish this and notify you; (5) human handoff with the context packed; (6) honest failure with an action. Each rung costs something — latency, freshness, money, trust — so the ladder is a policy, not a hope, and some rungs are banned in some products (never serve a stale medical answer, for example).

**The UI state machine.** Name the states and make the client mirror the server lifecycle: idle, thinking, streaming, validating, done, error with a sub-kind. Distinct states make distinct copy trivial and make bugs visible — half of all broken AI UX is a state machine that only has loading and broken.`,
        extras: [
          table(
            'Failure to language to action',
            ['Class', 'User-facing language', 'Action offered', 'Who retries'],
            [
              ['Still thinking', 'Still working - this can take a moment', 'Cancel', 'Nobody; wait'],
              ['Timeout / dropped', 'We lost the connection - your question was kept', 'Retry now', 'User, one tap'],
              ['Your rate limit', 'Hourly limit reached - available again in 12:00', 'Wait, or see plan', 'System after cooldown'],
              ['Provider busy', 'Unusually busy - we are holding your message', 'Continue waiting', 'Server queue'],
              ['Refusal', 'I cannot help with that, but I can help with X', 'Pick an alternative', 'Never'],
              ['No data', 'I do not have enough information about X', 'Search, rephrase, ask a human', 'After new context'],
            ],
          ),
          code(
            `// one map from class to copy to action - no generic toasts\nconst ERROR_UI = {\n  timeout:        { copy: "We lost the connection. Your question was kept.",\n                    action: "retry",    retryable: true },\n  rate_limited:   { copy: "Hourly limit reached. Try again in {seconds}s.",\n                    action: "wait",      retryable: true },\n  refusal:        { copy: "I cannot help with that. I can help with returns, billing or shipping.",\n                    action: "alt_topic", retryable: false },\n  no_data:        { copy: "I do not have enough information about that yet.",\n                    action: "search_or_human", retryable: false },\n  validation:     { copy: "Check the highlighted fields.",\n                    action: "fix_fields", retryable: false },\n  internal:       { copy: "Something failed on our side.",\n                    action: "retry",     retryable: true, trace: true },\n};\n\n// UI states mirror the server lifecycle\n// idle -> thinking -> streaming -> validating -> done\n//                        \\-> error:<subkind>\nfunction present(subkind, detail) {\n  const e = ERROR_UI[subkind] ?? ERROR_UI.internal;\n  return { ...e, copy: e.copy.replace("{seconds}", detail.seconds ?? 30),\n               traceId: detail.traceId };   // support bridge, not clutter\n}`,
            'errorUi.ts',
            'ts',
          ),
          tip(
            'Every error toast gets a trace id',
            'Users report the id, you read the stage, the incident is reconstructable — the cheapest support tool you will ever ship.',
          ),
          warn(
            'One generic error message is three lost user actions',
            'If timeout, limit and refusal share copy, users will retry refusals and abandon timeouts. Distinct class, distinct action.',
          ),
        ],
        worked: {
          title: 'Replace the generic toast with a routing map',
          problem:
            'A writing assistant surfaces every failure as something went wrong with a retry button. Users retry refusals endlessly, rate-limit abandonment spikes at peak hours, and support cannot correlate reports with logs. Rewrite the layer.',
          steps: [
            {
              title: 'Inventory the real failures from logs',
              desc: 'One week of errors, classified with the Module 1 taxonomy: 41 percent provider timeouts at peak, 22 percent your rate limits, 14 percent refusals from a safety policy, 12 percent validation on the document upload field, 11 percent misc 5xx. Every one of them currently produces the same toast.',
            },
            {
              title: 'Write the map: class, copy, action, retry policy',
              desc: 'Six classes, six copies, each with one primary action and an explicit retryable flag. Refusal copy names a permitted alternative; rate-limit copy includes the actual wait; timeout copy confirms the question was preserved so users do not retype.',
            },
            {
              title: 'Wire the state machine in the client',
              desc: 'idle, thinking, streaming, validating, done, and error with a sub-kind. The error state renders from the map, never a hardcoded toast. Cancel works during thinking; retry reuses the stored message so nothing is retyped.',
              code_snippet:
                'type UiState =\n  | { k: "idle" } | { k: "thinking" } | { k: "streaming" }\n  | { k: "validating" } | { k: "done" }\n  | { k: "error"; subkind: ErrorKind; traceId: string };\n\n// render switch over state - copy comes from ERROR_UI, not ad-hoc toasts',
            },
            {
              title: 'Add the degradation ladder for the timeout class',
              desc: 'Provider timeouts at peak now go: one server retry with jitter (invisible) → if still failing, queue with a 20-second patience budget → then the user-facing timeout copy with retry. Peak-hour abandonment drops because most waits end in a finished answer instead of a toast.',
            },
          ],
          solution:
            'Failures became routes: each class now leads to the action that actually fixes it, refusals stopped being retry loops, rate limits became waiting with information, and support got trace ids that turn anecdotes into incidents. The state machine made the surface honest about what the server is doing, which also improved the perception of speed — thinking is a state, not a spinner on a broken screen. Error UX is product work with a measurable outcome: abandonment per class, retry success rate, and support handle time all moved.',
        },
        practice: {
          title: 'Audit your toasts',
          prompt:
            'List every failure your app can show. Classify each with the four-class taxonomy. Find every place one generic message hides three or more causes and split it. Give each error a trace id in the copy and the log. Then measure one week: which classes dominate, and does your retry button help or harm each one?',
          hint: 'For every error message, name the correct user action in one word. If you cannot, the message is decoration.',
        },
        mistakes: [
          {
            mistake: 'One generic something-went-wrong for all classes',
            fix: 'Distinct class, distinct copy, distinct action: retry is correct for a dropped connection and harmful for a refusal.',
          },
          {
            mistake: 'Showing raw provider errors or stack traces in the UI',
            fix: 'Human language plus a short trace id; the raw detail belongs in logs keyed by that id.',
          },
          {
            mistake: 'Rendering refusals as crashes',
            fix: 'Refusals are policy outcomes: clear copy, permitted alternatives, and an abuse-analysis log — never a retry button.',
          },
          {
            mistake: 'Silent infinite client retries',
            fix: 'Retry visibly and once, or queue server-side with a patience budget; silent loops burn quota and hide real problems.',
          },
        ],
        exam: {
          question:
            'Why is error UX a routing problem? Give distinct user-facing treatment for a dropped connection, a user rate limit and a refusal. Describe the degradation ladder and the rule about internals.',
          answer:
            'Each failure class implies a different correct user action — retry, wait, rephrase, fix input, or stop — so one generic message forces users to guess and they guess wrong: they retry refusals, abandon timeouts, and treat limits as breakage. Dropped connection: keep the question, offer a one-tap retry, mark any partial text truncated. User rate limit: honest copy with the actual wait time and a next step, system retries after cooldown. Refusal: policy copy naming the boundary plus permitted alternatives, never a retry, logged for abuse analysis. Degradation ladder before failing: bounded queue-and-wait, one invisible retry for retryable classes, a truthful fallback (safe cache, smaller model, flagged partial), async completion with notification, human handoff with packed context, then honest failure with an action — each rung priced in latency, freshness, money or trust. Internals rule: no stack traces, provider dumps, keys or paths in user copy; a short trace id in the message is the bridge to logs, which carry the full classified detail.',
          source: 'UX-systems interview question: designing failure states for AI features.',
        },
        summary: [
          'One generic error message is a routing failure with three lost user actions inside it.',
          'Map every class to copy, action and an explicit retryable flag.',
          'Refusals are policy outcomes, not crashes; rate limits are information, not punishment.',
          'Walk the degradation ladder before failing; price each rung.',
          'User copy gets a trace id; raw detail stays in logs.',
          'Mirror the server lifecycle in named UI states: idle, thinking, streaming, validating, done, error:kind.',
        ],
      }),
      [
        [
          'A user retries immediately after the model declines a request. Root cause:',
          [
            'The model is too slow',
            'Rate limits were too low',
            'The stream buffer overflowed',
            'The refusal was rendered with the same error copy and retry button as a transient failure, so the user could not tell them apart',
          ],
          3,
          'Refusal needs policy copy and alternatives; giving it a retry affordance trains the wrong action.',
        ],
        [
          'Your rate limit is hit. The best user-facing treatment:',
          [
            'A generic error toast',
            'Honest copy with the actual wait time and a next step; the system retries after cooldown',
            'Silently dropping the message',
            'Asking the user to retype the question later from memory',
          ],
          1,
          'Limits need information and a path forward; otherwise they read as arbitrary punishment.',
        ],
        [
          'What should a user-facing error message never contain?',
          [
            'Stack traces, provider error dumps or internal paths',
            'A retry action',
            'A short trace id for support',
            'Human-readable language',
          ],
          0,
          'Internals leak architecture and sometimes secrets; the trace id is the safe bridge to logs.',
        ],
        [
          'Where should input validation failures be caught?',
          [
            'After the model returns, in post-processing',
            'Only in the provider sandbox',
            'At the field, before the model call - the cheapest failure for user and budget',
            'During streaming, mid-answer',
          ],
          2,
          'Failing before generation saves tokens and gives the user a fix they fully control.',
        ],
      ]
    ),
    lesson(
      M3,
      'lla-3-4',
      4,
      'Feedback Loops and the First-Run Experience',
      'Thumbs without context are noise. Build feedback capture that produces evaluable records, wire them into an offline set, and design the empty state that teaches scope and seeds a first success in ten seconds.',
      16,
      nineBlocks({
        objectives: [
          'Design feedback capture with the context fields that make a signal evaluable',
          'Convert thumbs-down and retry events into labelled evaluation cases',
          'Design an empty state that sets scope and seeds an instant first success',
          'Define activation metrics that connect first-run UX to retention',
        ],
        hook:
          'The team added thumbs up and down. Three months later: four thousand thumbs, zero insight. A thumb was a boolean in a column with no prompt version, no model, no context and no record of what the user did next. Meanwhile the first screen said ask me anything, and a majority of new users typed nothing and left within a minute. The product was collecting judgement without evidence and demanding creativity before granting a single success.',
        concept: `**Feedback is eval data wearing a UI costume.** The moment you treat it that way, the design changes: a thumb is not a score, it is a pointer into a case you can replay.

**Explicit signals.** Thumbs and ratings (cheap, biased, still useful in bulk); regenerate (an implicit downvote on the previous answer — log it as one); edit-and-resend (the gold: the user's corrected text is a free label of what the answer should have been); copy (weak positive); and an optional what-was-wrong prompt that yields taxonomy labels — wrong fact, style, refusal, too slow, misunderstood intent. Structured labels beat free text for routing into eval sets; keep one free-text box for the cases the taxonomy misses.

**Implicit signals.** Immediate retry of a near-identical question, abandonment mid-stream, unusually short sessions, repeating the same question after an answer (a trust failure), escalating to a human. Implicit signals are noisy individually and informative in aggregate; instrument them even when you do not react per-event.

**The record that makes feedback learnable.** Every captured event carries: response id and message ids, prompt version, model and parameters, a pointer to the assembled context, app version, timestamp, feedback type, optional label, and the next user action. That last field is underrated: the edit that followed a downvote is the correction you will put in the eval set. Without the surrounding context, a thumb cannot be replayed, ranked or fixed — which is exactly how four thousand of them produced nothing.

**From feedback to evaluation.** The pipeline: sample thumbs-down, regenerates and retries; dedupe near-identical complaints; label the failure class; promote representative cases into the offline set with expected behaviour (Module 8 goes deep, but the seed is here). Then the loop closes: change the prompt under version control (Module 2), re-run the set, compare, promote or revert. Feedback also answers a question dashboards cannot: what did the user consider wrong, not only what the model emitted.

**Bias, stated plainly.** Thumbs skew negative from the vocal and skew positive from agreeable answers. Do not optimise for thumb rate alone — combine with hard signals: task completion, edit rate, retry rate, and human escalation rate. A rise in thumbs-up with a rise in edits means the answers are pleasant and still wrong.

**The empty state is a promise.** The first screen teaches your product in ten seconds. Four elements: (1) scope — what it is for and not for, in one line each, which also deters abuse; (2) seed prompts — three to five real, runnable examples tailored to your segment, one click from a result, not write me a poem; (3) a designed first action — the cheapest high-probability success beats a blank box every time (paste this sample clause and see the extraction); (4) expectation setting — how long answers take, what happens to the data. Distinguish the empty history of a returning user (resume last thread) from a new user (seeds). Guardrail tone previews the refusal path before violation, so policy is not first met as a wall.

**Metrics that tie it together.** Activation rate (users who reach one successful answer in session one), time to first value, examples-used rate, first-session depth, day-one return. The empty state is not decoration; it is the top of the funnel your eval loop later repairs.`,
        extras: [
          table(
            'Feedback signal to eval value',
            ['Signal', 'Cost to capture', 'Eval value', 'Watch out'],
            [
              ['Thumb down + label', 'One click', 'High with context', 'Biased sample; always attach case context'],
              ['Edit and resend', 'Free (already happening)', 'Very high - the correction', 'Parse the delta for the label'],
              ['Regenerate', 'One click', 'High - previous answer rejected', 'Log which answer was rejected'],
              ['Retry / repeat question', 'Automatic', 'Medium - distrust or failure', 'Noisy; use in aggregate'],
              ['Escalation to human', 'Workflow event', 'High - task failure', 'Rare but expensive; review all'],
            ],
          ),
          code(
            `// feedback event: judgement plus replayable context\nawait feedback.record({\n  responseId: res.id,            // ties to the exact generation\n  sessionId, messageId: res.messageId,\n  promptVersion: res.promptVersion,\n  model: res.model,\n  params: { temperature, maxTokens },\n  contextPointer: res.contextRef, // assembled context, stored elsewhere\n  kind: "down",\n  label: "wrong_fact",            // optional taxonomy\n  note: userNote,                 // optional free text\n  nextAction: observedNextAction, // e.g. "edited" with corrected text\n  appVersion, createdAt: Date.now(),\n});\n\n// weekly: sample downs + regenerates into the offline set\nasync function promoteToEvalSet() {\n  const cases = await feedback.sample({ kind: "down", limit: 50 });\n  for (const c of dedupe(cases))\n    await evalSet.add({\n      id: "fb-" + c.responseId,\n      input: c.userMessage,\n      expected: c.nextAction === "edited" ? c.correctedText : c.label,\n      source: "feedback",\n    });\n}`,
            'feedback.ts',
            'ts',
          ),
          tip(
            'The next user action is the best label you will ever get for free',
            'An edit after a downvote is a corrected answer. Capture it before you ask anyone to write one.',
          ),
          warn(
            'Do not optimise for thumb rate',
            'Agreeable wrong answers collect thumbs-up. Pair sentiment with task completion, edit rate and escalations.',
          ),
        ],
        worked: {
          title: 'Turn a dead thumb button into a working eval pipeline, and redesign first run',
          problem:
            'A contract-review assistant has thumbs stored as booleans, no prompt versioning, and a blank ask-me-anything first screen with high early abandonment. Rebuild the capture, the pipeline and the first run.',
          steps: [
            {
              title: 'Instrument the event, not the boolean',
              desc: 'Rewrite the feedback call to carry response id, prompt version, model, params, context pointer, optional taxonomy label and the next observed action. One click on the client becomes a case that can be replayed six months later — the difference between a metric and evidence.',
            },
            {
              title: 'Build the promotion pipeline',
              desc: 'A weekly job samples downs, regenerates and retries; dedupes by input similarity; labels with the taxonomy; promotes a representative slice into the offline set with expected behaviour drawn from the user correction where one exists.',
            },
            {
              title: 'Redesign the first screen',
              desc: 'Replace ask me anything with scope lines (reviews clauses in uploaded contracts; cannot give legal advice), four seed prompts wired to a sample contract, and an expectation line (first review in about twenty seconds). One click now produces a real success before the user has to invent a question.',
              code_snippet:
                'EMPTY STATE (new user)\n  "I review clauses in contracts you upload.\n   I do not give legal advice."\n  Try one:\n   [Sample: flag the termination clause]\n   [Sample: summarise liability caps]\n   [Sample: find auto-renewal]\n  First review takes about 20 seconds.',
            },
            {
              title: 'Read the funnel with the loop attached',
              desc: 'Activation (first successful review), examples-used rate, time to first value, day-one return — plus eval-set growth from feedback. When activation is low, the first run is the bug; when thumbs-down concentrates on one failure class, the prompt or retrieval is the bug. Each has its own fix path.',
            },
          ],
          solution:
            'Judgement became evidence: every thumb now points at a replayable generation with a version, and a weekly pipeline converts the stream of complaints into offline cases with expected behaviour — including free corrections harvested from edits. The first screen stopped demanding creativity and started demonstrating value: scope, seeds, expectation. The two halves connect: first-run design raises the number of users who ever experience success, and the feedback loop repairs the ones who did not. Neither half needs a model improvement to matter.',
        },
        practice: {
          title: 'Close one loop end to end',
          prompt:
            'Add one feedback capture with full context to your app. For one week, collect events; then promote three downvoted cases into an offline set with expected behaviour, run them against your current prompt, and report what fails. Separately, redesign your empty state with scope, seeds and expectation lines, and measure examples-used rate and activation before and after.',
          hint: 'Before adding more UI, check how many of your events carry a prompt version — unattributed feedback cannot improve anything.',
        },
        mistakes: [
          {
            mistake: 'Storing thumbs as bare booleans',
            fix: 'Attach response id, prompt version, model, context and next action; otherwise the signal cannot be replayed or fixed.',
          },
          {
            mistake: 'Optimising for thumb rate as the north star',
            fix: 'Agreement is not correctness; pair sentiment with task completion, edit rate and human escalations.',
          },
          {
            mistake: 'A blank ask-me-anything first screen',
            fix: 'Scope lines, runnable seed prompts and a designed first success beat demanding invention from a cold user.',
          },
          {
            mistake: 'Collecting feedback with no path into an eval set',
            fix: 'A weekly promotion job with dedupe and taxonomy labels turns complaints into regression cases you can rerun.',
          },
        ],
        exam: {
          question:
            'List the fields a feedback event needs to be evaluable, explain how a thumbs-down becomes an offline evaluation case, and describe four elements of an effective empty state.',
          answer:
            'Fields: response id and message ids tying the thumb to the exact generation; prompt version, model and parameters; a pointer to the assembled context; app version and timestamp; feedback kind and optional taxonomy label; free-text note; and the next user action — an edit after a downvote is a free corrected answer. Pipeline: sample downs, regenerates and retries; dedupe near-identical inputs; label the failure class; promote a representative slice into the offline set with expected behaviour (the user correction where present, else the label); then every prompt change re-runs the set under version control, promoting or reverting on measured deltas. Empty state elements: (1) scope — what the product is and is not for; (2) seed prompts — three to five real, runnable examples that produce a genuine result in one click; (3) a designed first action — the cheapest high-probability success instead of a blank box; (4) expectation setting — latency, data handling, and a preview of refusal boundaries. Measure with activation rate, time to first value and examples-used rate.',
          source: 'Product-analytics question for AI features: making feedback actionable.',
        },
        summary: [
          'A thumb without context is noise; a thumb with prompt version and next action is an eval case.',
          'Harvest edits after downvotes: the user wrote your corrected answer for free.',
          'Implicit signals — retries, regenerates, abandonment — are aggregate truth about quality.',
          'Pair sentiment with task metrics; never optimise thumb rate alone.',
          'Empty state = scope, runnable seeds, designed first success, expectation setting.',
          'Activation and the feedback loop repair the same funnel from opposite ends.',
        ],
      }),
      [
        [
          'What makes a thumbs-down event evaluable?',
          [
            'The user was logged in',
            'It carries response id, prompt version, model, context pointer and the next user action',
            'It was captured within one second',
            'It includes a five-star scale',
          ],
          1,
          'Without replayable context, a thumb cannot become a test case — it is only a mood.',
        ],
        [
          'A user downvotes an answer, then edits their question and gets a good result. The edit is:',
          [
            'A free corrected answer — the best label you can harvest from implicit behaviour',
            'Irrelevant noise',
            'A reason to ban the user',
            'Evidence the thumb was a mistake',
          ],
          0,
          'The delta between the rejected answer and the accepted one is supervised data for your eval set.',
        ],
        [
          'Which metric best reflects whether the first-run experience works?',
          [
            'Total thumbs-up count',
            'Number of seed prompts shown',
            'Activation: the share of new users reaching one successful answer in their first session, plus time to first value',
            'Provider uptime',
          ],
          2,
          'First-run design is judged by whether newcomers ever experience success, not by raw sentiment.',
        ],
        [
          'A blank ask-me-anything screen with no examples is a problem mainly because:',
          [
            'It costs more tokens',
            'It breaks streaming',
            'It exposes the system prompt',
            'It demands invention before granting a single success, so many users never experience the product working',
          ],
          3,
          'Cold-start UX should demonstrate value first; creativity can come after the user has seen what the tool does.',
        ],
      ]
    ),
  ],
};
