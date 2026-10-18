// Module 2 — API Engineering: Keys, Parameters, Structure and Failure
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code } from '../nineBlocks';
import { lesson, M2, COURSE_ID } from './helpers';

export const module2: CourseModule = {
  id: M2,
  course_id: COURSE_ID,
  title: 'Module 2 — API Engineering: Credentials, Parameters, Structure, Failure',
  summary:
    'The unglamorous layer that decides whether an LLM feature survives contact with production: credential patterns and least privilege, the five parameters that actually shape output and the tasks each belongs to, structured responses via schema and tool calls with validation and repair, and the failure engineering stack — error classes, backoff with jitter, rate limits, idempotency, and how much provider abstraction is worth building.',
  sort_order: 2,
  lessons: [
    lesson(
      M2,
      'lla-2-1',
      1,
      'Credentials: API Keys, OAuth and Least Privilege',
      'A provider key is a bearer capability with your money attached. Where it lives, how it rotates, what a proxy buys you, and when enterprise OAuth or a gateway is the right shape instead.',
      16,
      nineBlocks({
        objectives: [
          'Explain why an API key is a bearer capability and what blast radius that implies',
          'Choose between client-held keys, a backend proxy and OAuth or gateway access',
          'Design key rotation with a dual-key overlap window and per-environment separation',
          'Apply least privilege in practice: scopes, spend caps, quotas and log redaction',
        ],
        hook:
          'A developer pastes a provider key into a public Discord to help a friend debug. Within the hour, scripts are burning through the account; the usage dashboard climbs past four hundred dollars before anyone wakes up. The post-mortem said be more careful. The real lesson is structural: a bearer key grants everything to whoever holds it, so the design question is never how to hide the key harder — it is how few places hold it, how fast you can revoke it, and how small the damage is when (not if) one leaks.',
        concept: `**What a key is.** Nearly all chat APIs authenticate with a header: Authorization: Bearer followed by a long opaque string. That string is a bearer capability — no further identity, no scope narrowing, no way to tell which app used it unless you gave each app its own. Consequences follow directly: treat it like cash, assume it will eventually appear in a log or a repo, and design so that a leak costs bounded money and bounded time.

**Three deployment shapes.**

1. **Key in the client** — browser or mobile app calls the provider directly. Acceptable only for personal local tools. Extracting a key from a shipped bundle takes minutes; traffic inspection gets the rest. Do not ship it.
2. **Backend proxy — the default for product work.** The client authenticates to your API with your own session tokens; your server holds the provider key and forwards. Everything good lives here: per-user quotas, spend caps, unified logging, prompt versioning, cache hooks, and one seam to swap providers (Lesson 4). Your API becomes the thing to secure — rate limit it, authenticate it, and never let it become an open relay.
3. **Enterprise shapes — OAuth and gateways.** When access is on behalf of a user through a third-party platform (marketplace apps, org-managed seats), OAuth 2.1 with authorization code plus PKCE fits: short-lived access tokens, refresh tokens you can revoke, scopes that bound what the app may do. Some enterprise model platforms sign requests with cloud IAM credentials instead of static keys, and many organisations route every team through an internal LLM gateway that owns the provider keys so metering and policy are central. Exact mechanisms differ per provider and change often — verify current docs before you build against a blog post.

**Least privilege, concretely.** (1) Separate keys per environment — a low-limit dev key so experiments cannot drain prod's budget. (2) Separate keys per service or tenant where the provider supports it, so you can attribute usage and revoke one without a fleet-wide outage. (3) Spend caps and hard limits at the provider account: a monthly ceiling and alert thresholds are the only control that works while you sleep. (4) Anomaly alerts: a key that suddenly serves ten times its usual token rate, or appears from a new region, is compromised until proven busy. (5) Log redaction: never write the Authorization header or the key to logs, traces, error reports or client-visible payloads — one stray to_string of your request config has burned many teams.

**Rotation is a design, not an incident response.** Issue the new key, deploy it alongside the old, confirm traffic shifts, revoke the old, keep the rollback window. Dual-key overlap turns rotation from a Friday-night emergency into a Tuesday-morning deploy. Pair it with a written runbook: leaked key means revoke first, investigate second — the usage dashboard is readable after the bleeding stops.

**Hygiene list.** Keys in environment variables or a secret manager, never in code or config files committed to git (history counts — a rotated key still lurks in old commits). Pre-commit secret scanning. No keys in client-side code. Redact in exception handlers: HTTP libraries love to include request headers in error messages.`,
        extras: [
          table(
            'Deployment shapes and what they buy',
            ['Shape', 'Who holds the provider key', 'Buys', 'Fits'],
            [
              ['Client-held key', 'The end user device', 'Nothing but speed of demos', 'Personal local tools only'],
              ['Backend proxy', 'Your server', 'Quotas, metering, logging, provider swap', 'Every productised assistant'],
              ['Org LLM gateway', 'Central platform team', 'Central policy, budget, audit across teams', 'Multi-team organisations'],
              ['OAuth / IAM-signed', 'User authorisation or cloud identity', 'Revocable scopes, per-user attribution', 'Marketplace and enterprise platforms'],
            ],
          ),
          code(
            `// proxy handler: the client authenticates to YOU, you hold the key\napp.post("/api/chat", requireSession, async (req, res) => {\n  await quota.check(req.user.id, { rpm: 20, dailyTokens: 200_000 });\n  const upstream = await provider.chat({\n    apiKey: env.LLM_API_KEY,            // server-side only\n    model: "your-model-id",\n    messages: req.body.messages,\n    stream: true,\n  });\n  pipeSse(upstream, res);               // Module 1, Lesson 2\n});\n\n// logging middleware: headers must never reach the log sink\nfunction redact(headers) {\n  const h = { ...headers };\n  if (h.authorization) h.authorization = "[redacted]";\n  return h;\n}`,
            'proxy.ts',
            'ts',
          ),
          tip(
            'One key per environment is the cheapest safety rail you will ever install',
            'A dev key with a small hard limit turns a Sunday incident into a five-dollar learning experience.',
          ),
          warn(
            'A key in a git commit is still live after you delete the file',
            'History keeps it. Rotate, then scrub if the repo is shared — deletion is not revocation.',
          ),
        ],
        worked: {
          title: 'Contain a leaked key and redesign so it cannot happen again',
          problem:
            'A key from a staging environment is found in a public repository fork. Usage is spiking. Today there is one shared key for all environments, no caps, and the server logs full request configs. Contain the incident, then restructure.',
          steps: [
            {
              title: 'Contain: revoke, then investigate',
              desc: 'Create a replacement key at the provider, set a hard monthly cap before deploying it, roll the service, revoke the compromised key, and only then read the usage dashboard. Every minute spent analysing before revoking is a minute of spend.',
              code_snippet:
                '# runbook order - do not reorder\n1. provider: create key B, set hard monthly cap\n2. deploy: env now uses key B (dual-key overlap not needed - A is dead)\n3. provider: revoke key A immediately\n4. read usage dashboard: which endpoints, which hours, total cost\n5. rotate any other secret that shared the commit history',
            },
            {
              title: 'Attribute: give each environment and service its own key',
              desc: 'Three keys now exist: dev (tiny cap), staging (medium), prod (real cap plus alerts). Each service that calls the provider gets its own so usage rows attribute to a caller and one leak costs one blast radius.',
            },
            {
              title: 'Stop the bleeding next time: caps, alerts, scanning',
              desc: 'Provider-side: monthly ceiling, 50 percent and 80 percent alerts, anomaly alert on token-rate spikes. Repo-side: pre-commit secret scanning that fails the commit on key-shaped strings. These are the controls that work while nobody is watching.',
            },
            {
              title: 'Fix the observability leak',
              desc: 'Audit every log line and error payload for header dumps; add a redaction helper in the HTTP client so an exception can never print the Authorization value. Then confirm: trigger a 400 locally and read the log — if the key appears, the fix is not done.',
            },
          ],
          solution:
            'Revocation first turned a live incident into a cost report. The structural fix — per-environment keys with independent caps — means the next staging leak costs whatever staging is allowed to spend, not whatever a bored script can do at 3 a.m. Caps and anomaly alerts moved the detection from human luck to provider telemetry, and log redaction closed the quiet path where keys escape through stack traces. Least privilege is not a slogan here: it is the difference between one key with unlimited blast radius and five keys with five boring ones.',
        },
        practice: {
          title: 'Audit and re-key',
          prompt:
            'List every place your provider credential exists: repo, CI variables, hosting config, dashboards, laptops. Split into per-environment keys with caps. Set an alert. Then deliberately trigger an error and check your logs for leakage. Write the four-line rotation runbook you would follow at 3 a.m.',
          hint: 'If you cannot name the monthly ceiling on your account right now, you do not have a budget — you have a hope.',
        },
        mistakes: [
          {
            mistake: 'Shipping the provider key to browsers or mobile apps',
            fix: 'Client authenticates to your backend; the backend holds the key. There is no client-side variant that is safe for production.',
          },
          {
            mistake: 'One shared key for dev, staging and prod',
            fix: 'Separate keys with separate caps: a staging experiment must never be able to drain the production budget.',
          },
          {
            mistake: 'No spend cap or alerting at the provider',
            fix: 'Your retry logic is not a budget. Hard ceilings and anomaly alerts are the controls that work while you sleep.',
          },
          {
            mistake: 'Logging full request configs, including headers',
            fix: 'Redact Authorization in HTTP clients and exception handlers; assume anything logged will be shipped to a third-party log service.',
          },
        ],
        exam: {
          question:
            'Explain why a provider API key is called a bearer capability, describe the backend-proxy pattern and what it buys beyond secrecy, and give a rotation runbook with a dual-key overlap.',
          answer:
            'Bearer capability: the key alone authorises the request — no further identity, no narrowing of scope, and no intrinsic attribution of which app used it. Whoever holds it can spend at the holder account rate limits allow, so leakage equals unauthorised spend until revocation. Backend proxy: clients authenticate to your API with your session credentials; your server injects the provider key server-side. It buys more than secrecy — per-user quotas and spend caps, unified usage logging and metering, cache and prompt-version hooks, moderation chokepoints, and a single seam for provider swap — while turning the security perimeter into your own API, which must itself be rate limited and authenticated. Rotation runbook: (1) issue key B and set its cap; (2) deploy B alongside A so traffic can shift gradually (dual-key overlap); (3) confirm traffic on B via usage attribution; (4) revoke A at the provider; (5) keep the rollback path until one full billing cycle is clean. For a suspected leak, skip the overlap: revoke first, investigate second.',
          source: 'Standard question in LLM platform interviews: key management and blast radius.',
        },
        summary: [
          'A provider key is cash with no scope: treat leakage as an unbounded spend event until revoked.',
          'Client-held keys are demo-only; product work goes through a backend proxy you secure and meter.',
          'Enterprise access adds OAuth with revocable scopes or central gateways — verify current provider docs.',
          'Least privilege = per-environment keys, per-service attribution, hard spend caps, anomaly alerts, redacted logs.',
          'Rotation is a deploy with a dual-key overlap, not a Friday-night emergency.',
          'Revoke first, investigate second; history keeps deleted keys alive, so deletion is not revocation.',
        ],
      }),
      [
        [
          'Why is a provider API key dangerous by construction?',
          [
            'It is a bearer capability: whoever holds it can spend, with no further identity or scope',
            'It can be guessed easily',
            'Providers log it publicly',
            'It expires after one hour',
          ],
          0,
          'No narrowing and no attribution means blast radius equals everything the account can do.',
        ],
        [
          'Where should the provider key live in a production web assistant?',
          [
            'In the frontend bundle for simplicity',
            'In the user profile so quotas can be checked client-side',
            'Server-side in your orchestrator; the client authenticates to your API',
            'In the system prompt so the model can manage it',
          ],
          2,
          'Server-side key plus your own auth is the default shape; the client is never a secret store.',
        ],
        [
          'The safest sequencing for routine key rotation:',
          [
            'Delete the old key first, then deploy the new one',
            'Rotate in the code but keep the old key as backup forever',
            'Wait for an incident to justify rotation',
            'Deploy the new key alongside the old, confirm traffic shifts, then revoke the old',
          ],
          3,
          'Dual-key overlap removes the all-or-nothing cutover; revoke only after the new key is proven in traffic.',
        ],
        [
          'A staging key leaks and begins burning tokens. First action:',
          [
            'Revoke the key at the provider, then investigate the usage after the bleeding stops',
            'Write a post-mortem',
            'Annotate the usage chart for later analysis',
            'Add more logging to catch the source',
          ],
          0,
          'Containment is revoke-first: analysis waits until spend is stopped.',
        ],
      ]
    ),
    lesson(
      M2,
      'lla-2-2',
      2,
      'The Parameters That Shape Output',
      'Temperature, max_tokens, top_p, stop and seed: what each one actually does, the task each belongs to, and the silent failures — truncation above all — that happen when parameters are set by folklore.',
      16,
      nineBlocks({
        objectives: [
          'Explain the mechanism of temperature and top_p and why you normally tune one, not both',
          'Match parameter profiles to extraction, drafting and brainstorming tasks',
          'Detect truncation through finish_reason and handle it instead of shipping cut-off answers',
          'Describe what seed does and does not guarantee',
        ],
        hook:
          'An extraction pipeline scores 100 percent on its golden set in development and fails 8 percent of production tickets with unparseable answers. The prompt did not change. Someone did: a helpful colleague bumped temperature from 0 to 0.7 globally because a blog post said higher temperature makes models more creative, and creativity is good. The extraction task did not want creativity. It wanted the same answer every time.',
        concept: `**Sampling in one paragraph.** A language model produces a probability distribution over its next token; sampling picks from that distribution. Application parameters reshape the distribution before the pick. Understanding which knob changes which shape is the difference between deliberate settings and folklore.

**Temperature.** The logits are divided by T before the softmax: low T sharpens the distribution toward the most likely tokens (T near 0 approaches argmax behaviour), T of 1 leaves the trained distribution alone, and T above 1 flattens it, making rare tokens more likely. Practical bands, for typical general-purpose chat models: 0 to 0.3 for extraction, classification, SQL generation and anything you will parse; around 0.7 for conversational drafting; above 1 rarely, mostly for deliberate variation. Caveats worth internalising: temperature 0 is highly repeatable but not guaranteed bit-identical across runs or model revisions, because serving stacks batch and quantise differently — treat it as very low variance, not determinism.

**Top_p (nucleus sampling).** Keep the smallest set of tokens whose cumulative probability reaches p, and sample only within it. It also trims the tail, for a different shape of control. Because both knobs narrow the same distribution, changing both at once makes it impossible to attribute a behaviour change — and providers ship different defaults, so read the default before assuming. The working rule: tune temperature first, leave top_p alone unless you have a specific reason and a test to verify it.

**max_tokens — the cap with a cliff.** This bounds output tokens only; input is billed separately. Generate past the cap and generation stops mid-sentence with a finish reason of length. Nothing throws. Nothing warns the user. You simply ship a truncated answer that reads like the model got tired — the most common silent failure in LLM apps. Fixes: set the cap with headroom above your longest expected answer; check finish_reason on every response; and build a handler — continue, re-ask for brevity, or show a truncated state — rather than pretending the answer was complete. Note for later: on some reasoning-style models the cap interacts with internal reasoning tokens, and per-message versus per-request semantics differ by provider; verify current docs.

**Stop sequences.** Hard terminators: generation ends when one appears, and the sequence is not returned. Useful to end structured output at a known marker or cap open-ended generation without guessing a token count. Traps: user content that contains the stop string cuts the answer short (never use user-controllable text as a stop), and stops cannot substitute for validation — they are a blunt cut, not a contract.

**Seed.** Where a provider supports it, a seed improves reproducibility of sampling for A/B tests and eval reruns. It is best-effort: model version updates, backend changes and concurrency can still shift output. Use seeds to stabilise experiments; never as a correctness guarantee or an idempotency mechanism (Lesson 4 covers the real one).

**The principle underneath.** Parameters reduce variance; prompts and structure reduce error. No setting of temperature makes a vague instruction specific, and the fanciest sampling cannot invent a field your schema forgot. Get the contract right first (Lesson 3), then choose the narrowest distribution that still does the job.`,
        extras: [
          table(
            'Parameter cheat sheet',
            ['Parameter', 'Controls', 'Typical profile', 'Classic trap'],
            [
              ['temperature', 'Spread of the sampling distribution', '0-0.3 extract; ~0.7 draft', 'Raising it for accuracy tasks'],
              ['top_p', 'Nucleus size', 'Leave provider default', 'Tuning it together with temperature'],
              ['max_tokens', 'Output length ceiling', 'Expected length plus headroom', 'Ignoring finish_reason length'],
              ['stop', 'Hard terminator strings', 'Known markers only', 'Colliding with user-supplied text'],
              ['seed', 'Best-effort sampling reproducibility', 'Evals and A/B only', 'Treating it as determinism or idempotency'],
            ],
          ),
          code(
            `// every request: record params, every response: check finish_reason\nconst res = await client.chat({\n  model: "your-model-id",\n  messages,\n  temperature: 0,            // extraction: same answer, every time\n  max_tokens: 300,           // expected 180 + headroom\n  seed: 42,                  // stabilise eval reruns where supported\n});\n\nif (res.finish_reason === "length") {\n  // NOT a complete answer - never render as one\n  await metrics.incr("truncated_outputs");\n  return handleTruncation(res);   // continue, re-ask, or flag in UI\n}\nif (res.finish_reason === "content_filter") {\n  return handleRefusal(res);      // Module 3 language, not a crash\n}`,
            'params.ts',
            'ts',
          ),
          tip(
            'Check finish_reason before you render',
            'It is one field that separates an honest answer from a cut-off one. Wire it into metrics the day you ship.',
          ),
          warn(
            'Temperature 0 is not a correctness guarantee',
            'Low variance, yes; identical output forever, no — model revisions and serving details still move underneath you.',
          ),
        ],
        worked: {
          title: 'Tune an extraction endpoint by task, then debug the production failure',
          problem:
            'A ticket-triage endpoint extracts JSON from support text. In staging it is perfect; in production, 8 percent of responses fail to parse and users see a generic error. The team wants to raise max_tokens and add retries. Find the real cause with parameters and telemetry.',
          steps: [
            {
              title: 'Read the telemetry, not the vibes',
              desc: 'The team logged errors but not parameters or finish reasons. Add three fields to every log line: model, full parameter set, finish_reason. One day of production data later, the failure rows are overwhelmingly finish_reason: length on responses whose JSON was cut mid-string — the cap was 120 tokens, the tickets got longer, and the schema grew a field.',
              code_snippet:
                'log.info({ trace_id, model, temperature, max_tokens,\n           finish_reason, tokens_out, prompt_version }, "llm_call");\n\n// finding: 74% of parse failures carry finish_reason=length\n// fix candidate: raise cap to 320 AND watch tokens_out p95',
            },
            {
              title: 'Right-size the cap with headroom',
              desc: 'Measure the p95 of complete outputs (186 tokens), set max_tokens to 320, and keep the length check. The cap is now a guard against runaway cost, not a cause of silent truncation.',
            },
            {
              title: 'Lock the sampling profile to the task',
              desc: 'Extract endpoint pinned at temperature 0 and default top_p, with a code comment stating why — so the next helpful edit has to argue with a reason instead of a habit. Drafting endpoints keep their own profile in configuration, named per task, not one global value.',
              code_snippet:
                'export const PROFILES = {\n  extract:  { temperature: 0,   top_p: undefined, max_tokens: 320 },\n  triage:   { temperature: 0,   top_p: undefined, max_tokens: 60  },\n  draft:    { temperature: 0.7, top_p: undefined, max_tokens: 1200 },\n} as const;\n// one profile per task; global "creative: true" toggles are banned',
            },
            {
              title: 'Add the regression gate',
              desc: 'Run the golden set on every parameter or prompt change. Truncation rate joins validity rate as a first-class metric: a change that fixes parse rate but doubles truncation is not a fix.',
            },
          ],
          solution:
            'The failure was never the model being insufficiently creative — it was a length cap colliding with real ticket sizes, invisible because finish_reason was not logged. Instrument first, and the parameter discussion becomes evidence: raise the cap with headroom, pin temperature to the task, keep top_p untouched, and gate changes on a golden set that scores both validity and truncation. The deeper fix is organisational: named profiles per task replace folklore, so the next change to sampling has to be a decision with a measurement, not a vibe.',
        },
        practice: {
          title: 'Build a parameter profile and hunt truncation',
          prompt:
            'For one real endpoint, define a named parameter profile with a comment per choice. Log model, parameters, finish_reason and tokens_out on every call for a day. Report: truncation rate, p95 tokens_out, and whether your max_tokens has headroom. Then run the same 10 requests at temperature 0 and 0.7 and diff what changed.',
          hint: 'If your logs cannot answer what parameters produced a given answer, you cannot debug drift — and you cannot A/B honestly.',
        },
        mistakes: [
          {
            mistake: 'Raising temperature hoping for better accuracy',
            fix: 'Temperature trades determinism for variety. Accuracy comes from the contract: prompt, schema, examples — then the narrowest sampling that still works.',
          },
          {
            mistake: 'Tuning temperature and top_p together',
            fix: 'Both reshape the same distribution; changing both destroys attribution. Tune temperature first, leave top_p at default unless testing one hypothesis.',
          },
          {
            mistake: 'Ignoring finish_reason and shipping truncated answers',
            fix: 'Check it on every response, meter it, and route length results to a continuation or truncation-aware UI path.',
          },
          {
            mistake: 'Treating seed as determinism or idempotency',
            fix: 'Seeds stabilise experiments best-effort; real idempotency is keys and persistence (Lesson 4), not sampling.',
          },
        ],
        exam: {
          question:
            'Explain what temperature and top_p each control and why you normally change only one. What does a finish_reason of length mean, and how should an application respond? What does a seed guarantee?',
          answer:
            'Temperature divides the logits before the softmax: low values sharpen the distribution toward the most likely tokens, 1 leaves it as trained, above 1 flattens it toward variety. Top_p keeps only the smallest set of tokens whose cumulative probability reaches p. Both narrow the same distribution, so tuning both at once makes behaviour changes unattributable; the working rule is to tune temperature first and leave top_p at the provider default. finish_reason length means generation hit the max_tokens ceiling and stopped mid-answer: the response is a prefix, not an answer — so the app must check the field, meter truncations, and either continue generation, re-request a shorter answer, or present an explicit truncated state instead of rendering a cut-off reply as complete. A seed, where supported, is a best-effort request for reproducible sampling to stabilise evals and A/B comparisons; model revisions and serving changes can still alter output, so it is neither determinism nor idempotency.',
          source: 'Applied question in LLM integration interviews: sampling parameters and their failure modes.',
        },
        summary: [
          'Temperature sharpens or flattens the distribution; top_p trims the nucleus; tune one, not both.',
          'Named parameter profiles per task beat one global creativity toggle.',
          'max_tokens is a cliff: finish_reason length means the answer is a prefix — check it every time.',
          'Stop sequences are blunt cuts that can collide with user text; never use them as validation.',
          'Seeds stabilise experiments best-effort; parameters reduce variance, contracts reduce error.',
          'Log parameters and finish reasons with every call, or drift is invisible.',
        ],
      }),
      [
        [
          'An extraction endpoint fails intermittently with cut-off JSON. Most likely parameter cause:',
          [
            'Temperature too low',
            'top_p at default',
            'max_tokens too small — generation stopped at the cap with finish_reason length',
            'Seed was not provided',
          ],
          2,
          'A length-capped generation is a prefix; the fix is headroom plus a finish_reason check, not creativity settings.',
        ],
        [
          'Which parameter change most directly increases answer variety?',
          [
            'Lowering max_tokens',
            'Adding a stop sequence',
            'Shortening the system prompt',
            'Raising temperature or lowering top_p to widen sampling options',
          ],
          3,
          'Higher temperature flattens the distribution; top_p and temperature are the variety knobs — the rest do something else entirely.',
        ],
        [
          'Why should temperature and top_p not be tuned at the same time?',
          [
            'Providers reject requests that set both',
            'Both reshape the same sampling distribution, so simultaneous changes make behaviour differences unattributable',
            'They cancel each other out',
            'top_p only works with seeds',
          ],
          1,
          'One variable per experiment; otherwise you cannot say which knob caused the change.',
        ],
        [
          'What does a seed actually provide?',
          [
            'Best-effort sampling reproducibility for evals and A/B tests, not a correctness guarantee',
            'Guaranteed identical output forever',
            'Idempotent billing for the request',
            'Deterministic tool calls',
          ],
          0,
          'It stabilises experiments where supported; model and serving changes still move output underneath.',
        ],
      ]
    ),
    lesson(
      M2,
      'lla-2-3',
      3,
      'Structured Responses: Schema, Tool Calls and Validation',
      'Applications need values, not prose. Choose between JSON mode, schema-constrained output and tool calls; design a schema the model can satisfy; then validate, repair once, and degrade gracefully — because structure shifts errors from syntax to semantics.',
      16,
      nineBlocks({
        objectives: [
          'Choose among JSON mode, strict JSON schema and tool calls for a given output need',
          'Design a flat, typed schema with enums that a model can satisfy reliably',
          'Implement validate-then-repair-once with a degraded fallback',
          'Explain why schema-valid output can still be semantically wrong',
        ],
        hook:
          'A shipping app calls JSON.parse on every model response. It works in testing. Then a user pastes a returns request that begins with the words "Sure - here is the JSON you asked for" and the model helpfully wraps the object in a friendly sentence and a code fence. JSON.parse throws, the request is marked failed, and the user is told something went wrong — because an application trusted a probabilistic system to emit exactly one syntactic format with no enforcement behind it.',
        concept: `**Why structure is a first-class problem.** Your program wants a value: priority, category, list of clauses. The model speaks tokens. Without enforcement, every integration grows the same brittle stack — prompt says JSON, hope for the best, JSON.parse with a try, then a regex to strip a leading fence. That stack works until the day it does not, and the failure always lands on the user.

**Three mechanisms, three guarantees.**

1. **JSON mode / prompted JSON.** The API or your prompt asks for JSON only. Cheap and universal; it improves the odds dramatically; it does not guarantee syntax, and it certainly does not guarantee your schema. Always validate.
2. **Constrained structured output (response_format with a JSON schema).** The provider grammar-constrains decoding so the output conforms to your declared schema: valid JSON, correct types, required fields honoured. Feature surface varies — some providers restrict which JSON Schema keywords are supported, how additionalProperties behaves, or whether enums and nesting are fully enforced — so verify current docs for your model. This is the default choice when you need a value to consume.
3. **Tool or function calling.** You declare a function signature; the model returns structured arguments, optionally choosing to call it. Use tools when the structure is an action (write a row, call an API) or when you want the answer shaped as a call; use structured output when the structure is a value to display or store. Tool calls also stream as partial argument text — the same partial-parse problem Module 3 handles on the client. Part II, M6 goes deep on tools; here it is simply the third structure option.

**Schema design is prompt design.** The schema is instructions the decoder enforces syntactically, not semantics. Guidelines that measurably help: flat structures over deep nesting; enums for every closed set (never "a priority string"); explicit required lists; numbers as numbers so ranges can be checked; short, data-shaped field names (summary, not "the_summary_of_the_ticket_in_one_line"); and a modest field count — every field is a place for a hallucinated value. If the model must abstain, encode that: an answerable boolean or a null-by-default field beats free text for expressing ignorance.

**The failure taxonomy shifts.** With no enforcement you fight syntax errors. With enforcement you fight semantics: right shape, wrong content. Missing or empty fields, enum values chosen wrongly, entities that do not exist in the input, confident guesses where the source was silent. So the pipeline becomes: parse (now almost always safe) → validate against the schema (types, required, enums) → semantic checks you write (ranges, referential consistency, "this date appears in the input") → then a single repair attempt that feeds the validator error back as a user-role correction → then a degraded path that returns what is known plus an explicit flag. One repair, not five: repeated repair loops multiply cost and latency while chasing tails.

**Structure is not truth.** A schema-conformant object full of invented order numbers is still a hallucination — grounding and verification are separate problems (Module 4 and the RAG course). Schema removes a class of bugs; it does not remove the need for evaluation.`,
        extras: [
          table(
            'Mechanism comparison',
            ['Mechanism', 'Guarantee', 'Cost', 'Use when'],
            [
              ['Prompted JSON / JSON mode', 'Likely valid JSON; schema only if asked nicely', 'Low', 'Prototypes; tolerate validation'],
              ['Structured output (strict schema)', 'Conformant to the declared schema', 'Low to medium', 'You need a value to consume — default choice'],
              ['Tool calling', 'Arguments shaped as a function call', 'Medium', 'The structure is an action, or an agent loop'],
            ],
          ),
          code(
            `// schema -> constrained call -> validate -> one repair -> degrade\nconst TicketSchema = {\n  type: "object",\n  additionalProperties: false,\n  required: ["priority", "category", "summary", "needs_human"],\n  properties: {\n    priority:    { type: "string", enum: ["low", "normal", "high", "urgent"] },\n    category:    { type: "string", enum: ["billing", "shipping", "other"] },\n    summary:     { type: "string", maxLength: 140 },\n    needs_human: { type: "boolean" },\n  },\n};\n\nlet out = await chat({\n  messages,\n  response_format: { type: "json_schema", json_schema: TicketSchema },  // names vary\n});\nlet parsed = TicketSchemaValidator.safeParse(JSON.parse(out.text));\nif (!parsed.success) {\n  out = await chat({ messages: [\n    ...messages,\n    { role: "user", content: "Your JSON failed validation: " +\n        JSON.stringify(parsed.error.issues) + ". Fix ONLY that." },\n  ], response_format: { type: "json_schema", json_schema: TicketSchema } });\n  parsed = TicketSchemaValidator.safeParse(JSON.parse(out.text));\n}\nconst result = parsed.success ? parsed.data : { needs_human: true, degraded: true };`,
            'structured.ts',
            'ts',
          ),
          tip(
            'Encode abstention in the schema',
            'An answerable flag or null-by-default field turns "I do not know" into a value your code can route on — far better than parsing hedged prose.',
          ),
          warn(
            'Schema-valid is not accurate',
            'Constrained decoding fixes syntax, not truth. Keep grounding and evaluation in the plan; a perfect object of invented facts is still wrong.',
          ),
        ],
        worked: {
          title: 'From hopeful JSON.parse to a validated, repairable contract',
          problem:
            'A support triage endpoint prompts for JSON and parses with try/catch; failures are generic errors. Rebuild it: schema, constrained output, semantic checks, one repair attempt, degraded fallback — and define the metrics that tell you whether it is working.',
          steps: [
            {
              title: 'BEFORE: the hopeful version and its three failure shapes',
              desc: 'One prompt line saying return JSON, a bare JSON.parse in a try block, and an empty catch. Failures come in three shapes that all reach the user identically: preamble text before the object, a missing field the app dereferences, and a priority value like "ASAP" that is not in the enum your switch statement assumes.',
              code_snippet:
                'BEFORE\nconst data = JSON.parse(await ask(promptForJson(ticket)));\nassign(data.priority);   // throws on undefined, misroutes "ASAP"',
            },
            {
              title: 'Declare the contract: flat schema, closed sets, abstention',
              desc: 'Four required fields, enums for every closed set, boolean for the escalation decision, and additionalProperties false so stray fields cannot smuggle in. Flat by design: each nesting level is another place for empty objects.',
            },
            {
              title: 'Constrain, validate, repair once',
              desc: 'Request structured output against the schema; validate on arrival with a real validator; on failure, one repair call whose user message contains the exact validator issues. Cap repairs at one — further attempts mostly re-roll the same dice at full price.',
            },
            {
              title: 'Degrade honestly, and measure',
              desc: 'If repair fails, return a degraded marker that routes to a human with the raw text attached, never a generic error. Metrics: validity rate (schema pass on first try), repair success rate, degraded rate, and semantic-check failures — the last one is your true quality signal, because syntax is now nearly free.',
            },
          ],
          solution:
            'The endpoint stopped failing at the syntax layer entirely and started failing at the semantic layer where failures are visible and actionable. One repair attempt converts most residual schema failures into successes at bounded cost; the degraded path turns the rest into human work with context instead of a dead user. And the metrics finally separate the two questions you care about: can the model produce the shape (validity rate), and is the content right (semantic failures, thumbs, downstream corrections)? That separation is what lets you change prompts and schemas with evidence instead of anxiety.',
        },
        practice: {
          title: 'Constrain one endpoint properly',
          prompt:
            'Take one place your app parses model text with regex or JSON.parse. Write a schema with enums and required fields, request constrained output, add validation and one repair attempt, and log validity and degraded rates over 50 calls. Name one semantic check you can write that the schema cannot express.',
          hint: 'If a closed set of values exists in your code as a switch statement, it belongs in the schema as an enum — not in a prompt as prose.',
        },
        mistakes: [
          {
            mistake: 'Prompting for JSON and parsing without validating',
            fix: 'Prompts persuade; schemas constrain. Validate every payload with a real validator, including constrained outputs — semantics still need checking.',
          },
          {
            mistake: 'Giant deeply nested schemas with twenty fields',
            fix: 'Flat, few, typed fields with enums. Each field is a hallucination surface; each nesting level multiplies empty-object risk.',
          },
          {
            mistake: 'Repair loops of five attempts',
            fix: 'One repair with the exact validation errors, then degrade. Endless repair multiplies cost and latency while mostly re-rolling the same tail.',
          },
          {
            mistake: 'Treating schema-valid output as accurate output',
            fix: 'Structure is not truth: keep grounding, citations and evaluation in the loop, and measure semantic failures separately from syntax.',
          },
        ],
        exam: {
          question:
            'Compare prompted JSON, strict structured output and tool calling as mechanisms for machine-consumable responses. Give four schema-design rules and describe the validate-repair-degrade pipeline.',
          answer:
            'Prompted JSON asks the model for JSON via the prompt or a JSON mode: universal and cheap, but syntax and schema are best-effort — always validate. Strict structured output submits your JSON schema to the provider, which constrains decoding so responses conform to it (types, required fields, enums, subject to each provider’s supported subset — verify docs); this is the default when you need a value. Tool calling declares a function signature and returns arguments shaped as a call — right when the structure is an action, or inside an agent loop. Schema rules: flat over nested; enums for all closed sets; explicit required lists with numbers as numbers; modest field count with data-shaped names; and an abstention field such as answerable when the model may legitimately not know. Pipeline: validate against the schema, run app-written semantic checks, then one repair attempt that feeds validator issues back as a correction, then a degraded path that returns partial data with a flag and routes to a human — never a generic error. Metrics: first-try validity, repair success, degraded rate, semantic failures.',
          source: 'Common LLM integration interview question: getting reliable structure out of a generative model.',
        },
        summary: [
          'Three structure options: prompted JSON (hope), strict schema (constraint), tool calls (actions).',
          'Design schemas flat, closed and typed; every field is a hallucination surface.',
          'Enforcement moves failures from syntax to semantics — validate, then check meaning yourself.',
          'Repair once with the exact validator error, then degrade to a flagged human path.',
          'A perfect object of invented facts is still wrong: structure is not truth.',
          'Log validity, repair and degraded rates as first-class product metrics.',
        ],
      }),
      [
        [
          'What does strict structured output guarantee that prompted JSON does not?',
          [
            'That the content is factually correct',
            'Faster generation',
            'That the model will refuse off-schema requests',
            'Conformance to the declared schema — valid JSON with the required types and fields',
          ],
          3,
          'Constrained decoding fixes syntax and shape; truth and accuracy remain separate problems.',
        ],
        [
          'A ticket schema needs a priority from a fixed set. The right design:',
          [
            'A free string with a prompt hint listing the values',
            'An enum in the schema, enforced by constrained decoding',
            'A number from 1 to 10 with documentation',
            'Three booleans the app converts to a priority',
          ],
          1,
          'Closed sets belong in the schema: prose hints are suggestions, enums are constraints.',
        ],
        [
          'Validation fails on the first response. Best next step:',
          [
            'Send one repair request containing the exact validator issues, then degrade if it still fails',
            'Retry the identical request up to five times',
            'Return a generic error to the user',
            'Strip the invalid fields and hope',
          ],
          0,
          'One targeted repair is cheap and informative; blind repeats re-roll the same dice, and silent stripping hides failures.',
        ],
        [
          'Which of these is a semantic failure rather than a syntactic one?',
          [
            'The response is not valid JSON',
            'A required field is missing',
            'Valid JSON with an order number that does not exist in the input',
            'A trailing code fence around the object',
          ],
          2,
          'Shape is right, content is invented — the class that schema cannot catch and evaluation must.',
        ],
      ]
    ),
    lesson(
      M2,
      'lla-2-4',
      4,
      'Failures: Errors, Backoff, Rate Limits, Idempotency and Abstraction',
      'Every production LLM call eventually fails. Classify errors as retryable or terminal, back off with jitter and budgets, respect rate limits as backpressure, make submission idempotent, and decide how much provider abstraction is actually worth.',
      16,
      nineBlocks({
        objectives: [
          'Classify provider and network errors into retryable, terminal and not-an-error classes',
          'Implement exponential backoff with full jitter under a deadline budget',
          'Handle 429 responses with Retry-After, queues and concurrency caps',
          'Explain idempotency for LLM calls and weigh a thin provider adapter against lock-in',
        ],
        hook:
          'A supposedly resilient client retries five times with no jitter. One provider blip hits a thousand in-flight requests; every one of them retries in lockstep at the same millisecond, the provider stays down longer, and the app turns a thirty-second blip into a ten-minute outage. Worse: for two endpoints, the timed-out request had actually succeeded upstream — so the retry bought two generations and took two side effects. Resilience without classification is just amplified damage.',
        concept: `**Error classes decide everything downstream.** A flat try/retry-everything policy is how outages get amplified. Sort errors first.

- **Terminal client errors (4xx, mostly).** 400 bad request, 401 bad or missing credential, 403 forbidden, 404 unknown model. Retrying changes nothing; the fix is in your code or config. Retrying these is how a misdeploy burns budget for an hour.
- **Rate and usage limits (429).** Retryable, but as backpressure, not hammering: honour the Retry-After header where present, queue locally, reduce concurrency. Distinguish the limit types — requests per minute, tokens per minute, concurrent requests — because the correct response differs: shedding load, delaying, or re-shaping batch sizes.
- **Server and network errors (5xx, timeouts, resets).** Retryable with backoff. One subtlety: a read timeout after the request was fully sent is ambiguous — the provider may have generated (and billed) the answer you never saw. Which is exactly why idempotency matters below.
- **Not errors: refusals and filter hits.** The call succeeded and the model declined or content was blocked. Handle as a domain outcome with its own UX (Module 3); never retry, because the second attempt usually behaves the same and bills again.
- **Contract failures.** Valid response, invalid payload (Lesson 3): repair once, do not retry blindly.

**Backoff recipe.** Exponential backoff with full jitter: sleep a random duration up to min(cap, base × 2^attempt) — randomised because synchronised retries are what turned your client into the outage. Bound it three ways: maximum attempts (three to five), a deadline for the whole user-facing request, and a retry budget (attempts × expected time must fit inside the deadline — a retry that would exceed the user's patience should fail fast with a typed error instead). Honour Retry-After overrides. Wrap the lot in a circuit breaker: after a threshold of failures to one provider, stop sending and fail fast or fail over for a cooldown, so a dead dependency does not consume every worker.

**Timeouts are two budgets, not one.** Time-to-first-byte (or first delta, when streaming) detects a hung connection early; total time caps runaway generations. Your proxy timeout must sit outside the client's, and each layer should time out before the layer above it, so the innermost failure produces a typed error rather than a dropped socket.

**Rate limits as design.** Client-side token buckets keep you under the provider's documented ceilings before you ever see a 429; per-user quotas keep one user from exhausting the shared budget; priority queues put interactive turns ahead of background batch jobs — the first taste of the cost engineering in Module 10.

**Idempotency.** The same request twice is two generations and two bills: LLM calls are not idempotent. Duplicates arrive from client retries after ambiguous timeouts, double-submits, and queue redelivery. The app-level answer: a client-generated idempotency key per logical action; a persistence check that returns the stored result if that key was already completed; and side effects keyed on the action id, not on the call. You cannot make sampling identical — you can make a user pay once for a message.

**Abstraction versus lock-in.** A thin internal interface — chat(request) returning normalised output, usage, finish reason and a small error taxonomy — buys provider swap for price, latency or availability, plus unified logging. The costs are real: lowest-common-denominator features (provider-specific caching controls, sampling extras and tool modes leak), streaming formats differ, and the adapter is code you maintain. Practical stance: do not build a multi-provider framework before you have a second provider; do design the seam — one module with normalised errors and usage — and keep an escape hatch to the raw client. Lock-in is a choice with a price; accidental lock-in forty call sites deep is just a default.`,
        extras: [
          table(
            'Error classification and first response',
            ['Class', 'Examples', 'Retry?', 'First response'],
            [
              ['Terminal client', '400, 401, 403, 404 model', 'No', 'Fix credential or request; alert on sudden spikes'],
              ['Rate limit', '429, quota exceeded', 'Yes, bounded', 'Backoff honouring Retry-After; queue and shed load'],
              ['Server / network', '5xx, timeout, reset', 'Yes, jittered', 'Full-jitter backoff inside a deadline; circuit break'],
              ['Not an error', 'Refusal, content filter', 'No', 'Domain outcome with its own UX state'],
              ['Contract', 'Bad shape, missing field', 'No', 'Validate, repair once, degrade'],
            ],
          ),
          code(
            `// full-jitter backoff, deadline-aware, class-aware\nasync function withRetry(fn, { attempts = 4, deadlineMs = 20_000 } = {}) {\n  const start = Date.now();\n  let lastErr;\n  for (let i = 0; i < attempts; i++) {\n    try { return await fn(); }\n    catch (err) {\n      lastErr = err;\n      if (!isRetryable(err)) throw err;          // 400/401: stop now\n      const base = 250 * 2 ** i, cap = 8_000;\n      const wait = Math.random() * Math.min(cap, base);\n      const honor = err.retryAfterMs ?? 0;        // provider said wait\n      if (Date.now() + Math.max(wait, honor) > deadlineMs) throw err;\n      await sleep(Math.max(wait, honor));\n    }\n  }\n  throw lastErr;\n}\n\n// idempotent submit: one logical action, one generation\nasync function submit(userId, idemKey, prompt) {\n  const prior = await db.completed.find(userId, idemKey);\n  if (prior) return prior;                       // already done - no re-bill\n  const result = await withRetry(() => chat(prompt));\n  await db.completed.insert(userId, idemKey, result);\n  return result;\n}`,
            'resilience.ts',
            'ts',
          ),
          tip(
            'Full jitter is not optional',
            'Randomised backoff is what stops your clients from synchronising into a thundering herd that extends the very outage you were defending against.',
          ),
          warn(
            'A retry is a second purchase',
            'Ambiguous timeouts may hide a successful, billed generation. Idempotency keys and persistence are the cost control, not the retry counter.',
          ),
        ],
        worked: {
          title: 'Harden a call path: classify, back off, break, dedupe',
          problem:
            'An assistant has naive try/catch retries, a fixed 60-second timeout, no idempotency, and direct provider calls in five services. During a provider incident it takes itself down. Harden the path and classify five incident symptoms correctly.',
          steps: [
            {
              title: 'Normalise errors at the seam',
              desc: 'One adapter wraps the provider SDK and maps everything to a small taxonomy: auth, bad_request, rate_limit (with retryAfterMs), overloaded, timeout_ambiguous, refusal, other. Five services now branch on types instead of string-matching messages — and this module is the only place provider error shapes exist.',
              code_snippet:
                'type LlmError =\n  | { kind: "auth" } | { kind: "bad_request"; detail: string }\n  | { kind: "rate_limit"; retryAfterMs?: number }\n  | { kind: "overloaded" } | { kind: "timeout_ambiguous" }\n  | { kind: "refusal" } | { kind: "other"; cause: unknown };\n\n// adapter maps provider status + code -> LlmError (one file, one job)',
            },
            {
              title: 'Two timeouts, class-aware retries, a breaker',
              desc: 'First-byte timeout of eight seconds, total of thirty. Retries only on overloaded and retryAfterMs-respecting rate_limit, full jitter, deadline-checked. Breaker opens after a run of failures and fails fast for thirty seconds — the app now degrades in one second instead of tying up workers for a minute.',
            },
            {
              title: 'Make submission idempotent',
              desc: 'The client generates an idem key per user message id. Submit checks the completed-actions table first: ambiguous timeouts now return the stored result instead of double-generating, and side effects (ticket created, email sent) key on the action id.',
            },
            {
              title: 'Classify the incident symptoms',
              desc: 'Five reports, five classes: burst of 401s after a rotation — terminal, fix credentials, no retries; 429s at traffic peak — backpressure, honour Retry-After, shed batch jobs; 500s from the provider — retry with jitter, breaker opens; user sees a policy decline — refusal, not an error, distinct UX; one response missing a field — contract, repair once. None of the five is helped by generic five-times retries.',
            },
          ],
          solution:
            'The hardened path fails fast on what it cannot fix, backs off on what it can, and refuses to buy the same generation twice. The adapter turned provider-specific chaos into seven error kinds the whole system understands, which is also exactly the right amount of abstraction: one seam, normalised errors and usage, and an escape hatch to the raw client — enough to swap or fail over, not enough to become a framework you maintain forever. During the next incident the dashboard will show breaker state and rate-limit waits instead of a wall of worker timeouts, and the bill will show one generation per message.',
        },
        practice: {
          title: 'Write the classifier and the runbook',
          prompt:
            'Wrap your provider calls in one adapter that normalises errors into a small taxonomy with retryable flags and retryAfterMs. Add full-jitter backoff under a deadline, plus an idempotency check on your most expensive action. Then write the one-page incident runbook: which classes page a human at night, which shed load silently, and which never retry.',
          hint: 'If your retry helper cannot answer is this retryable?, it is an outage amplifier wearing a safety costume.',
        },
        mistakes: [
          {
            mistake: 'Retrying every failure including 400s, 401s and refusals',
            fix: 'Classify first: terminal errors need fixes, refusals are domain outcomes, only overloaded and rate-limit classes deserve retries.',
          },
          {
            mistake: 'Exponential backoff without jitter',
            fix: 'Synchronised clients create thundering herds; full jitter spreads retries and shortens outages.',
          },
          {
            mistake: 'One long timeout and no first-byte budget',
            fix: 'Separate first-byte and total budgets; let each layer time out before the layer above so errors stay typed.',
          },
          {
            mistake: 'Ignoring ambiguous timeouts and duplicate submits',
            fix: 'Idempotency keys plus a completed-actions store: one logical action bills and acts once, no matter how many transports failed.',
          },
        ],
        exam: {
          question:
            'Classify these provider responses and state the correct handling: 401, 429 with Retry-After, 503, a content refusal, and a valid JSON response missing a required field. Then explain full-jitter backoff, the two timeout budgets, and why LLM calls need application-level idempotency.',
          answer:
            '401 — terminal: bad credential, no retry until fixed; alert if it appears in a burst. 429 with Retry-After — retryable as backpressure: wait at least the given delay, queue, shed non-interactive load; distinguish requests-per-minute from tokens-per-minute limits. 503 — retryable server failure: full-jitter backoff under a deadline, circuit-break if persistent. Content refusal — not an error: the call succeeded and the model declined; distinct UX, never retried. Missing required field — contract failure: validate, repair once with the exact issues, degrade. Full-jitter backoff sleeps a random duration up to min(cap, base × 2^attempt), which prevents clients retrying in lockstep and extending the outage. Two timeouts: first-byte (detects a hung connection, keeps TTFT honest) and total (bounds runaway generations), with each layer timing out before the layer above it. Idempotency: a single request can generate and bill twice under ambiguous timeouts, double-submits and queue redelivery; a client-supplied idempotency key plus a completed-actions store makes one logical action produce one generation and one set of side effects — sampling cannot be made identical, but billing and actions can be made once-only.',
          source: 'Production reliability interview for LLM services: retries, limits and idempotency.',
        },
        summary: [
          'Classify before you retry: terminal, rate limit, server/network, refusal, contract.',
          'Full-jitter backoff under a deadline; honour Retry-After; circuit-break a dead dependency.',
          'Two timeouts — first-byte and total — with layers failing innermost-first.',
          'Rate limits are backpressure: local buckets, per-user quotas, priority queues.',
          'LLM calls are not idempotent: keys plus a completed-actions store make actions once-only.',
          'Abstraction: one thin seam with normalised errors and usage, an escape hatch, no premature framework.',
        ],
      }),
      [
        [
          'A 401 from the provider should trigger:',
          [
            'Immediate retries with backoff',
            'No retry — the credential is wrong; fix configuration and alert if it bursts',
            'A fallback to a second prompt',
            'Raising the temperature',
          ],
          1,
          'Terminal class: the same request will fail identically until credentials change.',
        ],
        [
          'Full-jitter backoff means:',
          [
            'Sleeping a random duration up to min(cap, base × 2^attempt), so retries do not synchronise',
            'Sleeping a fixed doubling interval each attempt',
            'Retrying instantly for the first two attempts',
            'Waiting exactly the provider Retry-After, always',
          ],
          0,
          'Randomisation is the herd defence; Retry-After, when present, is a floor on top of it.',
        ],
        [
          'Why do LLM calls need application-level idempotency even though they are read-only in appearance?',
          [
            'Providers bill twice for streaming calls',
            'Models are non-deterministic, so idempotency is impossible anyway',
            'An ambiguous timeout can hide a successful billed generation, and retries can duplicate side effects — one action must produce one generation',
            'Rate limits count identical requests twice',
          ],
          2,
          'Generation is a purchase and often paired with actions; keys and persistence make the purchase once-only.',
        ],
        [
          'The practical stance on provider abstraction is:',
          [
            'Build a full multi-provider framework on day one',
            'Never abstract; hardcode one SDK everywhere',
            'Abstract at the UI layer instead',
            'Design one thin seam with normalised errors and usage, keep an escape hatch, and abstract further only when a second provider is real',
          ],
          3,
          'A single normalised seam buys portability and logging; premature frameworks buy maintenance.',
        ],
      ]
    ),
  ],
};
