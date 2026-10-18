// Module 7 — Structured Extraction: Schemas, Validation, Documents and Doubt
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code } from '../nineBlocks';
import { lesson, M7, COURSE_ID } from './helpers';

export const module7: CourseModule = {
  id: M7,
  course_id: COURSE_ID,
  title: 'Module 7 — Structured Extraction: Schemas, Validation, Documents and Doubt',
  summary:
    'Extraction is where an LLM stops being a writer and becomes a data source — which means the engineering changes completely. This module designs schemas the model can fill honestly (with citations back to the source text), validates every field with pydantic or zod and repairs once on failure instead of trusting, falls back gracefully when the model cannot comply, traces the document path from PDF through OCR to clean text and into fields, derives confidence the model cannot fake and forces an honest abstention, and resolves the same real-world entity across many records without merging the wrong two.',
  sort_order: 7,
  lessons: [
    lesson(
      M7,
      'lla-7-1',
      1,
      'Schema Design for Extraction: Fields the Model Can Fill Honestly',
      'Extraction schemas are not database schemas. Design flat, enumerable, abstention-friendly shapes with a citation span per claim, decide where null and unknown and empty actually differ, and stop the three silent killers: defaulting, type drift and prose fields.',
      16,
      nineBlocks({
        objectives: [
          'Design an extraction schema whose fields the model can fill correctly under pressure',
          'Encode abstention and unknown as first-class values instead of forced guesses',
          'Attach source spans so every extracted value can be checked against the input',
          'Recognise the schema mistakes that produce silent wrongness rather than loud errors',
        ],
        hook:
          'A fintech team extracts "amount" from uploaded invoices into a numeric column. The schema says number; the model, facing "₹1,25,000 (inclusive of GST)" and a line reading "Balance: NIL", returns the string "1,25,000" for one and the number 0 for the other. Both pass a try/except that only checks the key exists. Six weeks later, reconciliation finds 2,140 wrong rows and one very confident dashboard. Nothing failed loudly — the schema asked for a type and got a costume.',
        concept: `**A schema is a behavioural contract, not a storage plan.** Database schemas optimise for storage and joins; extraction schemas optimise for the model under pressure: long documents, ambiguous phrasing and the strong temptation to please you with an answer. Four design rules follow. (1) Flat over nested: one level of objects at most — field completion accuracy measurably drops as trees deepen, and your validator grows arms. (2) Enumerate everything enumerable: a status field with six possible values gets an enum, so an out-of-enum value is a visible bug rather than a string you must trust. Open sets (a product name, a clause quote) stay open strings — the mistake is forcing a closed enum on an open world, which just moves the guessing inside your allowed list. (3) Every field a human will check gets a citation span: the exact quoted substring plus its character offset (or page and bounding box for documents). A value without a span cannot be audited; a value with a span that does not appear in the input is a hallucination you caught for free. (4) Type hygiene: numbers are numbers, dates are ISO strings normalised by a stated rule, booleans are booleans — and the schema says so in the field description, because descriptions are instructions the model reads.

**Absence is three different facts.** present_and_extracted, absent_from_source (the document genuinely does not state it) and unreadable_or_uncertain (the scan is illegible in that region) are different outcomes with different downstream behaviour: the first populates a record, the second goes on the missing-field report, the third triggers a human or OCR review. A schema that collapses them all into null — or worse, into a default of 0 or empty string — manufactures data. Make abstention cheap and explicit: an optional field plus a reason enum is more honest than a required field that invites a guess. Instruct plainly in the field description: if the source does not state this, return null and record the reason.

**Type drift is the quiet killer.** The invoice story is the pattern: a numeric field receives a formatted string; a date field receives "end of month"; a boolean receives "yes". Two defences, layered. First, the schema description spells out the normalisation rule: amounts as plain decimal strings without symbols or separators, dates as ISO 8601 (yyyy-mm-dd), never a relative phrase. Second, your validator (Lesson 2) rejects on type rather than coercing silently — coercion is how a wrong value takes a seat in your database wearing a number costume. Note what does not work: asking the model in the system prompt to "be careful with types". Prompts lower the failure rate; only validators guarantee the floor.

**Design for the run, not the demo.** Big schemas degrade: as the field count grows, the model trades attention across fields and edge cases get abandoned quietly — so split documents into passes (core fields first, secondary fields in a second call over the same text) rather than one mega-object. Prose fields are a trap inside extraction: "notes" invites the model to summarise and editorialise, which it will do even when you asked for a quote — either drop the field or make it a verbatim span like every other claim. And always keep one field the model cannot invent: the source hash or document id your code attaches, so an extracted row can always be traced back to the exact bytes that produced it.`,
        diagram: `flowchart LR
  IN["source text (document, message, paste)"] --> SC["extraction schema"]
  SC -->|"fields + types + enums"| M["model extracts"]
  SC -->|"one span per claim"| M
  M --> V["validate: type, enum, span-in-source"]
  V -->|"all good"| OK["record + provenance"]
  V -->|"span missing / type drift"| R["repair pass (7-2)"]
  V -->|"absent / unreadable"| A["reason enum -> report or review"]`,
        extras: [
          table(
            'Schema mistakes and what they cost',
            ['Mistake', 'What the model does', 'Cost'],
            [
              ['Required field, no abstention path', 'Guesses to please the schema', 'Invented data with valid types'],
              ['Deep nesting (objects in objects)', 'Drops or garbles inner fields', 'Silent partial records'],
              ['Type stated only in code, not in descriptions', 'Returns "1,25,000" as a string', 'Costume types in your DB'],
              ['Closed enum on an open set', 'Picks the nearest allowed value', 'Misclassification you cannot see'],
              ['No citation span per claim', 'Nothing to audit against', 'Hallucinations survive review'],
              ['Free-text "notes" field', 'Summarises and editorialises', 'Prose smuggled into data'],
            ],
          ),
          code(
            `# an extraction schema designed for honesty, not for storage
from typing import Literal, Optional
from pydantic import BaseModel, Field

class Span(BaseModel):
    quote: str = Field(description="Exact substring of the source text")
    start: int = Field(description="Character offset of quote in the source")

class InvoiceFields(BaseModel):
    invoice_number: Optional[str] = Field(
        description="Id printed on the invoice, e.g. INV-2026-00417. "
                    "null with reason=absent if the source does not state it."
    )
    amount_total: Optional[str] = Field(
        description="Grand total as a plain decimal string: digits and at most "
                    "one dot, no currency symbols, no separators. 125000.00, "
                    "never '1,25,000' or 'about 1.25L'."
    )
    due_date: Optional[str] = Field(
        description="ISO 8601 date yyyy-mm-dd. Never a relative phrase like "
                    "'end of month'. null if not stated."
    )
    currency: Optional[Literal["INR", "USD", "EUR", "GBP"]] = None
    amount_span: Optional[Span] = Field(description="Where the total appears")
    absent: list[str] = Field(
        description="Names of fields that are null, with reason: "
                    "absent_from_source or unreadable_or_uncertain"
    )

EXTRACT_PROMPT = (
    "Extract invoice fields from the text between <<< and >>>. "
    "Rules: quote spans must be exact substrings; if a field is not stated, "
    "return null and list it under absent - never guess.\\n\\n"
    "<<<\\n{doc_text}\\n>>>"
)`,
            'invoice_schema.py',
            'python',
          ),
          tip(
            'Write field descriptions the way you would brief a careful intern',
            'The description is where normalisation rules, examples and the abstention clause actually live.',
          ),
          warn(
            'Coercion in the validator turns one bad field into a trusted bad record',
            'Reject and repair (7-2); silent casting is how costume types reach production.',
          ),
        ],
        worked: {
          title: 'Redesign the invoice schema so NIL does not become zero',
          problem:
            'The fintech extractor silently produced zeros and comma-strings. Redesign the schema and show one full extraction run on a messy invoice, including the abstention path.',
          steps: [
            {
              title: 'Inventory what went wrong field by field',
              desc: 'amount accepted a formatted string because nothing rejected it; "Balance: NIL" mapped to 0 because the prompt implied a default; due_date accepted "EOM"; no span existed, so reviewers could not check anything. The redesign targets each: string-normalised amount with a stated rule, null-with-reason for absent, ISO-only dates, and a span per claim.',
            },
            {
              title: 'Write the schema with spans and a reason enum',
              desc: 'amount_total becomes a plain decimal string (a string, deliberately — normalised by your rule, validated by your regex, parsed once at the edge where you control it), due_date ISO only, currency an enum of the four you actually see, and every claim field paired with an optional Span. absent carries field names with the reason enum.',
              code_snippet:
                'amount_total: "125000.00"          # rule stated in the description\n"Balance: NIL" -> amount_total=null, absent=["amount_total:absent_from_source"]\namount_span.quote must appear verbatim in the source, offsets checked by code',
            },
            {
              title: 'Run the messy invoice through the new contract',
              desc: 'Output: invoice_number INV-2026-00417 with span; amount_total "125000.00" with span over "Rs. 1,25,000.00"; due_date null, absent lists due_date as absent_from_source (the invoice says only "net 30" — a relative phrase the schema refuses); currency INR. The validator checks the span offsets against the source bytes and confirms both quotes appear verbatim.',
            },
            {
              title: 'Read what the failure report now shows',
              desc: 'Because abstention is explicit, the nightly report says 38 of 1,020 invoices lack due_date — a real business gap, not a data point. Compare the previous run: zeros and guesses had filled those rows and the gap was invisible. The schema change did not make the model smarter; it made honesty cheaper than guessing.',
            },
          ],
          solution:
            'The new schema made every silent failure either impossible (type and enum rejection at the validator) or visible (spans that must exist in the source, abstention with reasons). NIL became an honest null with a reason instead of a zero that passed for data. And the paired-span rule gave reviewers their first cheap audit tool: any claim whose quote is not a verbatim substring is a hallucination caught by a string search, before a human reads it.',
        },
        practice: {
          title: 'Design an extraction schema for one real document type',
          prompt:
            'Pick a document you actually handle (form, contract, email, receipt). Write the extraction model: at most one nesting level, enums for every closed set, normalisation rules inside field descriptions, one span per claim, and an abstention mechanism with reasons. Then list which of your fields would tempt the model to guess — and what the schema does about each.',
          hint: 'If a field description cannot state how a wrong value would look, you have not designed the field yet.',
        },
        mistakes: [
          {
            mistake: 'Required fields with no abstention path',
            fix: 'Optional field plus reason enum; forcing an answer manufactures data at scale.',
          },
          {
            mistake: 'Normalisation rules living only in the system prompt',
            fix: 'Put them in field descriptions AND enforce them in the validator; prompts persuade, validators guarantee.',
          },
          {
            mistake: 'Deeply nested extraction schemas',
            fix: 'One level maximum; split a large extraction into ordered passes over the same text instead of one mega-object.',
          },
          {
            mistake: 'Extraction values with no citation span',
            fix: 'Pair every claim with an exact quote and offset so hallucinations die in a string search.',
          },
        ],
        exam: {
          question:
            'Explain four design rules for extraction schemas and why absence must be modelled as three distinct outcomes. What are the defences against type drift?',
          answer:
            'Rules: (1) flat — at most one level of nesting, because field accuracy drops with depth and validation grows complex; (2) enumerable sets become enums, open sets stay open strings, because a forced closed list just relocates guessing; (3) one citation span (exact quote plus offset) per claim, because a value with no span cannot be audited and a span that is not a verbatim substring exposes a hallucination for free; (4) type hygiene stated in field descriptions — normalisation rules (plain decimal strings, ISO dates, no relative phrases) written where the model reads them. Absence is three facts with different downstream behaviour: extracted (populate the record), absent_from_source (missing-field report for the business), unreadable_or_uncertain (human or OCR review) — collapsing them into null or a default like 0 manufactures data. Defences against type drift: normalisation rules inside field descriptions, plus a validator that rejects mismatched types instead of coercing — prompts lower the failure rate, only validators guarantee the floor.',
          source: 'Data-engineering interview: "the model returns strings in numeric fields — fix the pipeline."',
        },
        summary: [
          'Extraction schemas optimise for a model under pressure, not for storage.',
          'Flat, enumerable, abstention-friendly, one span per claim, source hash attached.',
          'Absent, unreadable and extracted are three facts — never one null.',
          'Normalisation rules belong in field descriptions; enforcement belongs in the validator.',
          'Prose fields smuggle editorialising into data — quote or drop them.',
          'Large extractions split into passes, not one mega-schema.',
        ],
      }),
      [
        [
          'Why does an extraction schema need a citation span per claim?',
          [
            'Providers charge less when spans are present',
            'So every value can be audited against the source, and hallucinations that are not verbatim substrings are caught automatically',
            'Spans double as embeddings for search',
            'They are required by JSON Schema',
          ],
          1,
          'A quote that must appear verbatim in the source is the cheapest hallucination detector you will ever build.',
        ],
        [
          'An invoice states only "net 30". The due_date field should return:',
          [
            'Today plus 30 days, computed by the model',
            'A best-guess ISO date',
            'null with the reason absent_from_source (relative phrases are never normalised into dates)',
            'The string "net 30"',
          ],
          2,
          'Computing dates the document did not state is manufacturing data; the reason enum routes it to the real gap report.',
        ],
        [
          'Which schema choice most directly reduces silent partial records?',
          [
            'One nesting level maximum, instead of objects inside objects',
            'A "notes" free-text field for anything unclear',
            'Required fields for every concept',
            'String types for everything, converted later',
          ],
          0,
          'Deep trees are where completion accuracy quietly collapses; flat schemas keep every field under supervision.',
        ],
        [
          'Type drift (strings arriving in numeric fields) is best prevented by:',
          [
            'A system-prompt plea to be careful',
            'Casting values with float() in the handler',
            'Normalisation rules in field descriptions plus a validator that rejects rather than coerces',
            'Raising temperature',
          ],
          2,
          'Descriptions set expectations; the validator is the floor. Silent casting lets costume types take a seat in your database.',
        ],
      ]
    ),
    lesson(
      M7,
      'lla-7-2',
      2,
      'Validation, Repair and Fallbacks: pydantic and zod in the Loop',
      'The model will sometimes return wrong structure — so validate every extraction with a real schema library, repair exactly once with the error text fed back, and design the fallback chain for when the model simply cannot comply: partial records, human queues, honest rejects.',
      16,
      nineBlocks({
        objectives: [
          'Validate model output with pydantic or zod as a hard gate before anything persists',
          'Run one bounded repair round that feeds the validator error back as data',
          'Design the fallback chain: repair, degrade to partial, route to human, reject',
          'Instrument repair rate as a health metric that catches schema and prompt regressions',
        ],
        hook:
          'A team trusts structured output mode and skips validation "because the schema is enforced". One model update shifts a field from string to string-array in their dialect; the extractor happily returns arrays where the database expects scalars; the ETL casts each value with a helper that turns lists into their first element via str()[1:-1] slicing. For two months, every multi-value field is stored as its first character. Enforced structure is not validated semantics — and the difference sat in one unchecked assumption.',
        concept: `**Structure enforced is not semantics guaranteed.** Providers can constrain output to match your schema — JSON mode, schema-constrained decoding, strict tool arguments (as of 2026 the names and guarantees differ; verify current docs). What that buys: you will receive parseable JSON of roughly the right shape. What it does not buy: a value that matches its type ("1,25,000" is a string; the schema wanted a plain decimal string), a span that actually appears in the source, an enum member the document supports, or a date that is not a relative phrase. So validation is your layer, always: parse, then check with a real library — pydantic in Python, zod in TypeScript — as a hard gate before anything persists. A validator is also where your business rules live: amounts in range, spans within source offsets, mutually exclusive fields, cross-field arithmetic.

**Repair once, with the error as data.** When validation fails, the cheapest fix is a second call that returns the failing payload plus the validator's error and asks for a corrected object only. Design details that separate a repair from a hope. (1) Bounded: one repair per object; a second failure goes to fallback, because repair loops are how a 2-cent retry becomes a dollar. (2) The feedback is precise: not "invalid JSON" but pydantic's actual message — field amount_total: value is not a valid number (input "1,25,000") — with the original document still in context. (3) The ask is narrow: return the corrected object, not a new full extraction; full re-extractions double tokens and invite new errors in fields that were fine. (4) Temperature stays low; repair is not the moment to get creative. Watch the trap: a repair that accepts any change may silently alter a value that was actually right and only mis-typed — so diff the repaired object against the original and keep original values when only the type changed, if your normalisation allows it.

**The fallback chain, decided in advance.** Repairs fail sometimes; that is normal, not exceptional. The chain: repair (once) → partial accept (persist the validated subset with per-field provenance, mark the record incomplete, queue the failed fields) → human review (the queue shows source text beside the failed field and the model's attempt) → reject the document with an honest reason. Which rung you jump to depends on error cost: a marketing-tagging pipeline can partial-accept almost everything; a compliance extraction partial-accepts nothing without review. The failure taxonomy matters here — syntax errors (should be near-zero with constrained output), type errors (your normalisation rules not followed), semantic errors (span not in source, arithmetic inconsistency) and refusals (model declines the document). Each class maps to a different rung and a different prompt or schema fix.

**Repair rate is a first-class metric.** Track repairs per field per prompt version (Module 5 attribution makes this queryable). A field whose repair rate jumps after a schema edit is a regression the demo never showed; a field stuck at 30 percent repair is misdescribed and needs a description or type redesign, not an infinite repair habit. Teams that watch only final-pass accuracy never see the money their repair loop is quietly spending — and never notice that half their "structured output" arrives via second chances.`,
        diagram: `flowchart TD
  O["raw model output"] --> P["parse (constrained mode)"]
  P --> V["pydantic / zod: types, enums, spans, business rules"]
  V -->|"valid"| OK["persist with provenance"]
  V -->|"errors"| RP["repair call #1: payload + exact errors"]
  RP --> V2{"valid?"}
  V2 -->|"yes (diffed)"| OK
  V2 -->|"no"| FB["fallback chain"]
  FB --> PA["partial accept + queue failed fields"]
  FB --> HR["human review"]
  FB --> RJ["honest reject with reason"]
  PA --> M["repair-rate metric per field, per prompt version"]`,
        extras: [
          table(
            'Failure classes and where they go in the chain',
            ['Class', 'Example', 'Chain rung'],
            [
              ['Syntax', 'Truncated JSON, stray comma', 'Constrained mode first; then repair once, then reject'],
              ['Type', '"1,25,000" in a decimal field', 'Repair with exact error; keep original value if only the type shifted'],
              ['Enum', 'status: "maybe" not in the enum', 'Repair once; repeated -> field marked absent'],
              ['Semantic', 'Span quote not found in source', 'Repair once with the mismatch shown; then human review'],
              ['Cross-field', 'line_items sum 9,000 != total 12,000', 'Repair once naming both numbers; then review'],
              ['Refusal', 'Model declines the document', 'No repair: route to human or reject with reason'],
            ],
          ),
          code(
            `# validate -> repair once -> fallback, with the diff guard
from pydantic import ValidationError

async def extract(doc_text: str, *, user_ctx) -> ExtractResult:
    raw = await model_extract(doc_text, schema=InvoiceFields, temperature=0)
    try:
        fields = InvoiceFields.model_validate_json(raw)
        return ExtractResult(status="ok", fields=fields)
    except ValidationError as err:
        pass

    # repair #1: narrow ask, exact errors, same document in context
    repaired = await model_repair(
        doc_text,
        payload=raw,
        errors=err.errors(include_url=False),   # field, message, input
        temperature=0,
    )
    try:
        candidate = InvoiceFields.model_validate_json(repaired)
        diff = value_diff(InvoiceFields.model_validate_json(raw) if False else None, candidate)
        keep = reconcile_type_only_changes(raw, candidate)  # type fixes ok, value swaps flagged
        audit("repair", field_diffs=diff, kept=keep)
        return ExtractResult(status="repaired", fields=keep)
    except ValidationError as err2:
        pass

    # fallback: validated subset only, failed fields queued with provenance
    partial = safe_subset(raw)                    # whatever validates cleanly
    queue_human_review(doc_text, failed=err2.errors(), attempt=repaired)
    metric("repair_failed", doc=user_ctx.doc_id, errors=[e["loc"] for e in err2.errors()])
    return ExtractResult(status="partial", fields=partial, needs_review=True)`,
            'extract_loop.py',
            'python',
          ),
          tip(
            'Feed the validator\'s exact error text back — vagueness produces vague repairs',
            'pydantic and zod already print the field, the message and the offending input; hand the model that, not a summary.',
          ),
          warn(
            'Unbounded repair loops turn structure errors into cost incidents',
            'One repair per object; the second failure follows the fallback chain you decided in advance.',
          ),
        ],
        worked: {
          title: 'Add validation and a repair budget to the invoice extractor',
          problem:
            'The extractor from Lesson 1 runs model → database with a shape check. A new document type breaks it in three ways: span offsets off by a page-header shift, amount as a list of candidate values, and one outright refusal. Build the loop and read the metrics.',
          steps: [
            {
              title: 'Put the validator in front of the database',
              desc: 'pydantic gate on every extraction: types, enums, span-quote-must-appear check, amount parseable by your normalisation rule. The list-valued amount fails immediately with field amount_total: Input should be a valid string — the costume caught in one line, before any ETL helper can slice it.',
            },
            {
              title: 'Repair once with exact errors',
              desc: 'Second call carries the failing payload and the validator errors verbatim; the span-mismatch error shows the model its quote against the real location. Two of three documents come back corrected: amount collapsed to its single plausible value, span re-anchored. The diff guard keeps value changes visible in the audit.',
              code_snippet:
                'repair ask: "Return only a corrected object. Errors:\\n- amount_total: Input should be a valid string (got [\'9000\', \'9,000\'])\\n- span[2].quote not found in source"\\nresult: 2/3 valid; 1 still mismatches -> fallback',
            },
            {
              title: 'Run the fallback on the third',
              desc: 'Second validation fails; the chain partial-accepts the four clean fields with provenance, queues the span issue for human review with source text beside the attempt, and marks the record incomplete. Nothing incorrect reaches the database; nothing is silently dropped either.',
            },
            {
              title: 'Read the dashboard a week later',
              desc: 'Repair rate by field: due_date 18 percent — its description still confuses relative phrases, so the description gets rewritten (a schema fix, not a repair habit); amount_total 2 percent after the enum of candidate formats was removed in favour of the plain-decimal rule. Total repair spend: 0.4 cents per document, down from the unbounded-retry prototype that occasionally cost 12 cents and still failed.',
            },
          ],
          solution:
            'Validation became a hard gate, repair became a bounded and precisely-informed second chance, and the fallback became a decision instead of a panic. The repair-rate metric did what final-pass accuracy never could: it named the misdescribed field (due_date) and priced the loop. And the refusal — the class where repair is pointless — went straight to a human, because the chain had already decided that in advance.',
        },
        practice: {
          title: 'Wire the loop and price it',
          prompt:
            'Add a real validator (pydantic or zod) in front of every persistence path in your app. Implement one repair round that feeds the exact validator errors back, then a partial-accept fallback with provenance. Log repair attempts per field with prompt_version. Report your repair rate, the worst field, and the one description you will rewrite because of it.',
          hint: 'If you cannot answer "what did the repair change?", the diff guard is missing and value swaps will hide inside type fixes.',
        },
        mistakes: [
          {
            mistake: 'Trusting constrained output as semantic validation',
            fix: 'Constrained mode guarantees parseable shape; your validator still owns types, enums, spans and business rules.',
          },
          {
            mistake: 'Repair loops with no bound',
            fix: 'One repair per object, then the pre-decided fallback chain; loops are cost incidents with good manners.',
          },
          {
            mistake: 'Vague repair feedback ("invalid output, try again")',
            fix: 'Feed the exact field, message and offending input the validator produced.',
          },
          {
            mistake: 'Persisting the repaired object without diffing it',
            fix: 'Diff against the original; keep type-only fixes, flag value swaps in the audit before they become data.',
          },
        ],
        exam: {
          question:
            'Why is schema-constrained output insufficient on its own? Describe the bounded repair design and the fallback chain, and explain what repair rate tells you that final-pass accuracy does not.',
          answer:
            'Constrained output guarantees parseable structure of roughly the right shape — not semantics: a string in a numeric field, an enum value the document does not support, a span that is not a verbatim substring, or a relative phrase in a date field all satisfy a shape check. So a real validator (pydantic/zod) gates every persistence path, enforcing types, enums, spans and business rules. Repair: exactly one second call carrying the failing payload plus the validator\'s exact errors (field, message, input) with the document still in context, asking for a corrected object only, at low temperature, with a diff guard that keeps value changes visible. Fallback chain, decided in advance: partial-accept the validated subset with per-field provenance and a review queue for failed fields; human review with source text beside the attempt; honest reject with a reason — which rung depends on the error cost of the domain. Repair rate per field per prompt version is a health metric: it prices the loop, catches regressions after schema edits and names misdescribed fields — a 30 percent repair field is a description bug, while a rising rate after a prompt bump is a regression that a final-pass-accuracy dashboard never shows.',
          source: 'Data-pipeline interview: "walk me through what happens when extraction output does not validate."',
        },
        summary: [
          'Constrained shape is not validated semantics — your validator is always the gate.',
          'Repair once, feed exact errors as data, keep a diff guard on the result.',
          'Fallback chain decided in advance: partial with provenance, human queue, honest reject.',
          'Refusals never go through repair — they go to a human or a reason.',
          'Repair rate per field per prompt version is the metric that prices the whole loop.',
          'A permanently high repair field is a schema or description bug, not a model quirk.',
        ],
      }),
      [
        [
          'Schema-constrained output guarantees:',
          [
            'Semantically correct values for every field',
            'Parseable structure of roughly the right shape — semantics remain your validator\'s job',
            'That validation can be skipped entirely',
            'Correct spans and cross-field arithmetic',
          ],
          1,
          'Shape is enforced at decode time; meaning, normalisation and provenance are still on you.',
        ],
        [
          'The right number of repair attempts per extracted object is:',
          [
            'Unlimited until it validates',
            'One — a second failure follows the pre-decided fallback chain',
            'Three, matching the three most common error classes',
            'Zero; repairs hide regressions',
          ],
          1,
          'Bounded repair captures the cheap wins; unbounded repair is how a cent-level retry becomes a dollar-level habit.',
        ],
        [
          'A repair returns a corrected object whose amount differs from the original by more than formatting. You should:',
          [
            'Accept it silently — the validator passed',
            'Keep the original, since first outputs are more faithful',
            'Diff it, flag the value change in the audit, and only keep type-only normalisations automatically',
            'Run a second repair to see which one it prefers',
          ],
          2,
          'The diff guard is what stops value swaps from hiding inside legitimate type fixes.',
        ],
        [
          'Repair rate for field due_date sits at 30 percent across thousands of documents. First action:',
          [
            'Add a third repair round for that field only',
            'Rewrite the field description and normalisation rule — a chronically repaired field is misdescribed',
            'Switch to a larger model for extraction',
            'Mark due_date as always-null in production',
          ],
          1,
          'Repair rate names schema and description bugs precisely; paying to repair forever is the expensive way to avoid redesigning.',
        ],
      ]
    ),
    lesson(
      M7,
      'lla-7-3',
      3,
      'Documents to Text to Fields: The PDF and OCR Input Path',
      'Real extraction starts before the model: classify the document, parse text PDFs directly and route scans through OCR, clean without destroying layout meaning, keep provenance to page and offset, and treat parse quality as a measured gate — because garbage text produces confident garbage fields.',
      16,
      nineBlocks({
        objectives: [
          'Classify documents and route each to the right extraction path: direct parse, OCR, or vision',
          'Clean extracted text without destroying the layout signals extraction depends on',
          'Preserve provenance: page numbers, offsets and region flags through every stage',
          'Measure text quality before extraction and degrade honestly when the parse is poor',
        ],
        hook:
          'A claims-processing team uploads 400 scanned forms to a PDF text extractor and runs their polished extractor on the result. The text layer is empty — the scanner wrote images, not text — so the extractor receives blank pages and returns null-everywhere records that pass validation (absent is a legal value!). Two weeks of "the model got worse" investigations end at a one-line fix: detect the empty parse and route to OCR. The model had not changed. The input path had never been built.',
        concept: `**Most extraction failures are input failures wearing the model's face.** The pipeline before the model has four stages, and each one can poison the fields. (1) Classify: is this a born-digital PDF with a real text layer, a scan, a photograph, a table-heavy financial statement, a multi-column newsletter? The class picks the path, and a cheap classifier (page-level text coverage, image ratio, or a small model) beats assuming. (2) Parse: text PDFs go through a layout-aware parser (pdfplumber, PyMuPDF, or a hosted document API — as of 2026 the hosted vision-document APIs are strong on layout and weak on your budget; verify current pricing); scans go through OCR (Tesseract for local, or a cloud OCR with word-level confidences); vision models can read pages directly when layout is too wild for text extraction — trading cost and latency for robustness. (3) Clean: normalise unicode, strip hyphenation across line breaks, drop page furniture (headers, footers, page numbers) by repetition detection — but keep paragraph breaks and table structure, because "did the total appear under a column" is layout, and layout is data. (4) Segment and extract: page-aware chunks with offsets, one extraction call per coherent region rather than one wall of text.

**Provenance is not optional.** Every extracted field should trace back to page number and character offsets (or bounding boxes where OCR provides them). Three reasons, all practical: the citation-span check from Lesson 1 needs offsets to verify against; human review needs to show the reviewer the right page region, not a 90-page wall; and when a parser is swapped or an OCR engine updated, provenance diffs tell you which fields moved. Carry it as a sidecar structure alongside the text: text, plus a map from offsets to pages, built once and threaded through cleaning — cleaning must therefore be offset-aware (removing a header shifts offsets; recompute rather than pretend).

**Measure text quality before you spend on extraction.** Three cheap signals: text coverage (characters of extracted text per page — near-zero means scanned images), OCR confidence distribution (a mean under 90 or a long low-confidence tail means expect field errors), and structural sanity (page count, presence of expected anchors like totals blocks). Gate on them: excellent → extract normally; marginal → extract but flag every field with a low-quality-source marker and route spans below threshold to review; poor → skip extraction, request a better upload or a human pass. This is the honest degradation the hook story lacked. Confidence propagation matters downstream: a field extracted from 70-confidence OCR is not the same fact as one from a clean text layer, and your record should say so.

**The long-document budget.** A 90-page contract at 40,000 tokens exceeds many windows and wrecks the rest of the budget (Module 4). Segment by structure — headings, numbered clauses, page boundaries — not by fixed character counts that bisect a clause mid-sentence; extract per segment with the schema; merge with provenance intact; and keep the global pass (what document is this, which sections matter) separate from the field pass. Watch the table trap: PDF tables flatten into noise in naive text extraction — detect table regions and use table-aware parsing, or a vision pass, because "row 4 column 2" is exactly where fields silently swap columns and still validate as numbers.`,
        diagram: `flowchart LR
  IN["upload"] --> CL{"classify"}
  CL -->|"born-digital"| P1["layout-aware parse"]
  CL -->|"scan / photo"| P2["OCR + word confidences"]
  CL -->|"wild layout"| P3["vision page read"]
  P1 & P2 & P3 --> Q{"quality gate"}
  Q -->|"ok / marginal"| C["clean, offset-aware"]
  Q -->|"poor"| H["request better upload / human"]
  C --> S["segment by structure + provenance"]
  S --> E["per-segment extraction (7-1, 7-2)"]
  E --> M["merge fields + page/offset spans"]`,
        extras: [
          table(
            'Input class → path → what you must carry forward',
            ['Class', 'Path', 'Carry forward'],
            [
              ['Born-digital PDF, clean text layer', 'Layout-aware parser', 'Page map, table regions, reading order'],
              ['Scanned document', 'OCR with confidences', 'Per-word confidence, skew, low-quality flags'],
              ['Photo / wild layout', 'Vision page read', 'Page image ref, per-region confidence'],
              ['Table-heavy statement', 'Table-aware parse or vision', 'Row/column structure — never flattened prose'],
              ['Email / HTML', 'DOM-aware text extraction', 'Quote boundaries, so replies are not merged with originals'],
            ],
          ),
          code(
            `# classify -> parse -> quality gate -> clean, with provenance intact
from dataclasses import dataclass

@dataclass
class PageText:
    page: int
    text: str
    ocr_conf: float | None      # None for born-digital text
    char_to_page: list[int]     # offset -> page map, rebuilt after cleaning

def classify(path: str) -> str:
    coverage = text_coverage(path)          # chars of text layer per page
    if coverage < 5:   return "scan"         # essentially empty text layer
    if table_ratio(path) > 0.4: return "tables"
    return "digital"

def parse(path: str) -> tuple[list[PageText], float]:
    kind = classify(path)
    if kind == "scan":
        pages = ocr_with_confidences(path)          # word-level confidences
        mean_conf = mean(p.ocr_conf for p in pages)
    else:
        pages = layout_aware_parse(path)            # keep reading order + tables
        mean_conf = None
    return pages, mean_conf

def quality_gate(pages, mean_conf) -> str:
    total_chars = sum(len(p.text) for p in pages)
    if total_chars < 200 * len(pages): return "poor"      # e.g. empty parse
    if mean_conf is not None and mean_conf < 90: return "marginal"
    return "ok"

def clean(pages: list[PageText]) -> list[PageText]:
    furniture = detect_repeated_furniture(pages)   # headers/footers/page nos
    out = [strip_furniture_keep_offsets(p, furniture) for p in pages]
    return [dehyphenate(p) for p in out]           # offsets recomputed, never assumed`,
            'docpath.py',
            'python',
          ),
          tip(
            'Empty-parse detection is one line that saves weeks of misdiagnosis',
            'If extracted text is far below a page-count heuristic, you have a scan — route it or reject it, but never extract from nothing.',
          ),
          warn(
            'Cleaning that shifts offsets without rebuilding the map breaks every citation span downstream',
            'Offset-aware cleaning, or a rebuild; never a silent edit.',
          ),
        ],
        worked: {
          title: 'Build the input path for a mixed claims inbox',
          problem:
            'Claims arrive as born-digital PDFs, phone photos of paper forms and one notorious table-heavy spreadsheet export. Design the classification, parse, gate and provenance path so extraction receives usable text and reviewers receive page-cited fields.',
          steps: [
            {
              title: 'Classify before spending',
              desc: 'A cheap first pass computes text-layer coverage and image ratio per upload: 68 percent born-digital (parse directly), 24 percent scans (OCR with confidences), 5 percent photos (vision page read), 3 percent table exports (table-aware parse). Each class gets its own path; each path emits the same PageText shape with provenance.',
            },
            {
              title: 'Parse with structure kept, then gate',
              desc: 'Digital pages keep reading order and table regions; OCR pages carry word-level confidences; a quality gate scores each document. One upload returns poor: its text layer is a single page of a 14-page scan set — the extractor is never called; the uploader gets a specific request ("pages 2–14 are images; re-upload or use scan mode") instead of a week of model-blaming.',
              code_snippet:
                'gate: chars/page < 200 -> "poor"  -> no extraction, specific uploader message\ngate: mean OCR conf < 90 -> "marginal" -> extract + low_quality flag + review threshold',
            },
            {
              title: 'Clean offset-aware and segment by structure',
              desc: 'Repeated headers and page numbers are stripped with offsets recomputed; hyphenated line-breaks are joined; paragraph and table structure survive. Segmentation follows numbered claim sections rather than fixed character windows, so a clause is never bisected; each segment carries its page map into extraction.',
            },
            {
              title: 'Extract, merge, and show provenance in review',
              desc: 'Fields extract per segment with spans; the merge resolves conflicts by preferring higher-quality sources (digital text over marginal OCR) and records source class per field. The review queue shows each flagged field beside its actual page region — reviewers now check a page image, not a text dump, and the marginal-OCR documents get eyes exactly where confidence was weakest.',
            },
          ],
          solution:
            'The inbox stopped being one path pretending everything was clean text. Classification routes, the quality gate refuses to spend on garbage and says why, offset-aware cleaning keeps every citation honest, and provenance rides the whole way into the review queue — where a low-confidence OCR field is visibly a different kind of fact than a text-layer one. The blank-page mystery from the hook is now a one-line classification, caught before a single token is spent.',
        },
        practice: {
          title: 'Classify and gate one real document set',
          prompt:
            'Take five real documents from your domain. For each: measure text-layer coverage, classify the path you would take, and say what provenance you must carry. Implement the empty-parse check and the OCR-confidence gate, then show which of the five would extract, flag or refuse — and what the uploader sees in each case.',
          hint: 'Print the first 200 characters of parsed text for each document; the garbage you see there is what your model will confidently structure.',
        },
        mistakes: [
          {
            mistake: 'Assuming every PDF has a usable text layer',
            fix: 'Classify by coverage first; scans go to OCR or vision, or they are refused with a specific message.',
          },
          {
            mistake: 'Cleaning that destroys layout meaning or breaks offsets',
            fix: 'Keep paragraph and table structure; strip furniture with offset recomputation, never silent edits.',
          },
          {
            mistake: 'Extracting from low-quality text with no flag',
            fix: 'Quality gate: marginal sources get per-field markers and review thresholds; poor sources skip extraction entirely.',
          },
          {
            mistake: 'Fixed-size chunking that bisects clauses and tables',
            fix: 'Segment by structure (headings, numbered sections, pages) and use table-aware parsing for tabular regions.',
          },
        ],
        exam: {
          question:
            'Outline the document-to-text pipeline with its four stages, the role of the quality gate, and why provenance must survive cleaning. What class of error does naive table flattening produce?',
          answer:
            'Stages: (1) classify — born-digital vs scan vs photo vs table-heavy, by text coverage, image ratio or a small classifier; (2) parse — layout-aware parser for text PDFs, OCR with word-level confidences for scans, vision page reads for wild layouts, table-aware handling for tabular regions; (3) clean — unicode normalisation, dehyphenation, furniture removal by repetition detection, while preserving paragraph/table structure and recomputing offsets whenever text shifts; (4) segment and extract — structure-aware chunks with page maps, per-segment extraction, merged with per-field provenance. The quality gate sits between parse and extraction: near-zero text per page means a scan (refuse or route, never extract from nothing), low mean OCR confidence means marginal (extract with a low-quality flag and review threshold), otherwise normal extraction. Provenance must survive cleaning because citation-span verification needs offsets, human review needs the right page region, and parser swaps must be diffable. Naive table flattening produces column-swap errors that still validate as numbers — the most dangerous class, because structure errors that pass a type check silently become wrong facts.',
          source: 'Document-AI design question: "the extractor works on our test PDFs and fails on real uploads — diagnose."',
        },
        summary: [
          'Classify, parse, gate, clean, segment — the model is downstream of all of it.',
          'Empty-parse detection alone would have ended the hook story in one line.',
          'OCR confidence is data: propagate it into per-field quality markers.',
          'Cleaning is offset-aware; provenance (page, offsets) rides every stage into review.',
          'Segment by structure, not by character windows; tables get table-aware handling.',
          'Marginal sources extract with flags; poor sources are refused with a specific ask.',
        ],
      }),
      [
        [
          'A PDF returns almost no characters per page. The correct next step:',
          [
            'Raise max_tokens so the model can handle sparse input',
            'Classify it as a scan and route to OCR or vision — or refuse with a specific uploader message; never extract from nothing',
            'Retry the same parser; outages happen',
            'Split it into smaller chunks',
          ],
          1,
          'An empty parse is an input classification, not a model problem; extraction from nothing produces confident nulls.',
        ],
        [
          'Why must character offsets be recomputed when cleaning removes a page header?',
          [
            'Providers require it',
            'Otherwise every citation span downstream points at the wrong text, breaking audit and review',
            'It improves OCR confidence',
            'Headers contain PII',
          ],
          1,
          'Provenance is only as honest as its map; a shifted map mis-cites every field that follows.',
        ],
        [
          'A document has mean OCR confidence of 84. Best handling:',
          [
            'Discard it — anything under 90 is useless',
            'Extract normally; confidence does not affect field accuracy',
            'Extract with a low-quality marker on fields, tighter review thresholds, and provenance recording the source class',
            'Hand-type the document first',
          ],
          2,
          'Marginal is not worthless — it is a different kind of fact that your record must honestly mark.',
        ],
        [
          'The most dangerous consequence of flattening a PDF table into plain text is:',
          [
            'Longer output tokens and higher cost',
            'Column swaps that still type-check as numbers — wrong facts that pass validation',
            'The OCR engine refuses to process the result',
            'Citation spans become impossible to store',
          ],
          1,
          'A value in the wrong column is still a valid number — the class of error that passes every structural check.',
        ],
      ]
    ),
    lesson(
      M7,
      'lla-7-4',
      4,
      'Confidence, Abstention and Entity Resolution Across Records',
      'Model-stated confidence is not calibrated — derive confidence from evidence instead: span support, run agreement and validator outcomes. Force honest abstention that routes to review, then resolve the same real-world entity across many records with deterministic normalisation first and model judgement only for the genuinely ambiguous pairs.',
      16,
      nineBlocks({
        objectives: [
          'Distrust model-stated confidence and derive evidence-based confidence signals',
          'Design abstention thresholds that route uncertain extractions to human review',
          'Build an entity-resolution pipeline: normalise, block, match deterministically, escalate ambiguity',
          'Keep resolution auditable: canonical ids, merge provenance and a reversible merge policy',
        ],
        hook:
          'A CRM enrichment job extracts company names and asks the model to rate its own confidence 0 to 1. The ratings cluster at 0.9. "Acme Pvt Ltd" and "ACME PRIVATE LIMITED" and "Acme Pvt. Ltd. (Bengaluru)" resolve cleanly; "Acme" alone — which the model confidently resolves to the ₹400-crore Acme Industries — is actually the stationery vendor two blocks away. Three months in, the vendor receives enterprise pricing emails addressed to the wrong legal entity. The confidence field was never wrong, as far as the model knew. It was just not a measurement.',
        concept: `**Self-reported confidence is a tone, not a measurement.** Asked for a number, models produce a plausible one — anchored by training on human-like hedging, not by an internal probability you can calibrate. Treat it, at most, as one weak signal among several, and prefer evidence you compute yourself. Four signals that actually mean something: (1) span support — does each field have a verbatim quote that exists in the source (Lesson 1)? Absent span, lower confidence. (2) Validator outcome — did the value pass types, enums and cross-field checks, and did it need a repair? Repaired-at-once is slightly weaker than clean; twice-failed is weak. (3) Run agreement — extract twice at low temperature with a permuted field order; disagreement on a field is a real disagreement you can see. Cheap for the fields that matter, too expensive to run on everything (token cost doubles). (4) Source quality — the OCR and parse flags from Lesson 3, propagated per field. Combine them into a score you define and can defend, and always store the components, not just the sum: when a downstream review disagrees, the components say why.

**Abstention is routing, not refusal.** An extractor that always answers will guess; one that abstains well becomes a triage system. The design: every uncertain field carries a reason (low_span_support, cross_run_disagreement, low_source_quality, ambiguous_reference) and the record carries a review status derived from thresholds you set by error cost — a compliance pipeline routes anything below a high bar to humans; a research scraper lets low-confidence values through marked as provisional. The user-facing behaviour of abstention matters too: when the end user is a human reading the extraction, show "not stated in the document" proudly — it reads as competence, not failure. The failure mode to avoid is abstention theatre: a field abstains, a human approves it in one click forever, and you have built a slower guesser with extra steps. Measure the human-approval rate per field; if it is 100 percent at threshold, your threshold is theatre.

**Entity resolution: deterministic first, model last.** The same real-world entity arrives spelled a hundred ways — case, punctuation, legal suffixes (Pvt Ltd / Private Limited / LLC), transliterated cities, stray OCR errors. Resolution is a pipeline, and the order matters. (1) Normalise deterministically: casefold, unicode NFKC, strip punctuation, expand a fixed suffix table, standardise phone and address formats. This alone resolves the majority of pairs, free and auditable. (2) Block: generate candidate pairs by shared keys (normalised name, phone, domain, postal code) — comparing every record to every other is O(n²) and unnecessary. (3) Match with rules: exact normalised-key match merges automatically; rule-based scoring (name similarity plus corroborating keys like domain or phone) handles the rest, with thresholds for auto-merge, auto-non-merge and the ambiguous middle. (4) Escalate the middle to the model — with the two records side by side and a forced choice plus reason (same / different / cannot tell), never a bare yes. (5) Canonicalise: every merged record points at a canonical id, merges store their evidence and are reversible, and source records are never deleted. The trap to name: the model is worst exactly where you need it — short, generic names with no corroborating keys ("Acme" vs "Acme") are genuinely underdetermined, and the honest output is cannot-tell with routing to a human, not a confident pick. Never let an irreversible business action key off an unresolved ambiguous merge.`,
        diagram: `flowchart LR
  A["field extracted"] --> S{"span in source?"}
  S -->|"no"| L1["low_span_support"]
  S -->|"yes"| V{"validator / repair outcome"}
  V -->|"clean"| R["run agreement check (sampled)"]
  V -->|"repaired / failed"| L2["repair flags"]
  R -->|"agree"| C["confidence = f(components)"]
  R -->|"disagree"| L3["cross_run_disagreement"]
  L1 & L2 & L3 --> T{"threshold vs error cost"}
  T -->|"above"| P["persist; provisional flag optional"]
  T -->|"below"| H["human review queue with reason"]
  X["records"] --> N["normalise (deterministic)"] --> B["block candidates"] --> M["rules: auto-merge / auto-no / middle"]
  M -->|"middle"| Q["model: same / different / cannot tell"]
  Q --> K["canonical id + evidence + reversible merge"]`,
        extras: [
          table(
            'Confidence components and what each catches',
            ['Signal', 'Catches', 'Cost'],
            [
              ['Span support', 'Fabricated values with no source text', 'Near zero — string search'],
              ['Validator + repair outcome', 'Type drift and repeated misfits', 'Already paid in 7-2'],
              ['Cross-run agreement', 'Genuinely ambiguous fields', 'Doubles tokens — sample key fields only'],
              ['Source quality flags', 'OCR and parse uncertainty', 'Already paid in 7-3'],
              ['Model self-rating', 'Almost nothing reliable on its own', 'Free — keep as one weak feature'],
            ],
          ),
          code(
            `# evidence-based confidence + resolution rules (model only for the middle)
from rapidfuzz import fuzz

SUFFIXES = {"pvt ltd": "private limited", "ltd": "limited", "llc": "limited liability company"}

def normalise_name(s: str) -> str:
    s = unicodedata.normalize("NFKC", s).casefold()
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    toks = [SUFFIXES.get(t, t) for t in s.split()]
    return " ".join(t for t in toks if t)

def field_confidence(field, src, runs, src_quality) -> tuple[float, dict]:
    parts = {
        "span": 1.0 if field.span and field.span.quote in src else 0.2,
        "validator": 1.0 if field.clean else 0.6,          # repaired once
        "agreement": 1.0 if len({r.value for r in runs}) == 1 else 0.3,
        "source": src_quality,                             # from 7-3 gate
    }
    score = weighted(parts)                                 # weights you can defend
    return score, parts                                    # store components, not just the sum

def resolve_pair(a: Rec, b: Rec) -> str:
    na, nb = normalise_name(a.name), normalise_name(b.name)
    if na == nb and corroborates(a, b):        # phone / domain / postcode agrees
        return "merge"
    if a.domain and b.domain and a.domain == b.domain:
        return "merge"
    score = fuzz.token_set_ratio(na, nb)
    if score > 92 and has_corroborating_key(a, b): return "merge"
    if score < 60:                              return "distinct"
    return "ambiguous"                          # the only rung the model may see

async def model_judgement(a: Rec, b: Rec) -> str:
    # side by side, forced choice + reason; "cannot tell" is a first-class answer
    return await ask_same_different_cannot_tell(a, b)`,
            'confidence_resolution.py',
            'python',
          ),
          tip(
            'Store the confidence components, not just the score',
            'When review disagrees with an extraction, the components tell you which signal lied.',
          ),
          warn(
            'Irreversible actions must never key off an ambiguous merge',
            'Route cannot-tell to a human; "Acme" alone is underdetermined and confident picking is how vendors get enterprise pricing.',
          ),
        ],
        worked: {
          title: 'Score extractions honestly and resolve the Acme mess',
          problem:
            'The CRM job trusts 0-to-1 self-ratings. Rebuild scoring from evidence and add resolution with an ambiguity rung, then read what changes in the queue.',
          steps: [
            {
              title: 'Replace the self-rating with component scores',
              desc: 'Every field now carries span support (quote present in source?), validator outcome (clean, repaired, failed), cross-run agreement (sampled on 20 percent of fields), and source quality from the parse gate. The stored record has the components; the single score is a weighted function the team can argue about and change deliberately.',
              code_snippet:
                '"ACME PRIVATE LIMITED" -> span yes, clean, agree, digital -> 0.97 -> auto-accept\n"Acme" (ambiguous ctx)   -> span yes, clean, DISAGREE across runs -> 0.44 -> review queue',
            },
            {
              title: 'Normalise and block before any model sees a pair',
              desc: 'NFKC, casefold, punctuation strip, suffix table: Acme Pvt Ltd / ACME PRIVATE LIMITED / Acme Pvt. Ltd. collapse to the same key and merge automatically with the phone as corroboration. Blocking by domain and postcode cuts candidate pairs from 4 million to 12 thousand — the model never does the O(n²) work.',
            },
            {
              title: 'Route only the middle to the model, with cannot-tell allowed',
              desc: 'Rules auto-merge the top band and auto-separate the bottom; 38 pairs sit in the middle. The model sees each pair side by side with a forced choice. It returns cannot-tell on 11 of them — including bare "Acme" versus "Acme Industries", which now routes to a human instead of silently binding the stationery vendor to the enterprise account.',
            },
            {
              title: 'Audit a month of merges',
              desc: 'Auto-merge precision (sampled): 99.2 percent. Model middle-band: 24 merged, 3 separated, 11 human-resolved. Reversibility check: every merge has evidence rows and can be undone; two bad merges were undone in a day after a customer complaint — the feature that made finance comfortable enough to approve the rollout.',
            },
          ],
          solution:
            'Confidence became measurements instead of manners — and the components, not a single number, explained every review decision. Resolution ran deterministic-first, so most pairs never needed a model, and the genuinely underdetermined cases got the only honest answer available: cannot-tell, a human, and a reversible merge trail. The confident wrong binding of the hook story is now a review-queue row, which is exactly where an underdetermined "Acme" belongs.',
        },
        practice: {
          title: 'Score and resolve on your own data',
          prompt:
            'For one extraction field, record the four evidence components and define a defensible weighted score; report how often it disagrees with the model\'s self-rating. Then run resolution on twenty duplicate-ish records: show which merged deterministically, which separated, and which landed in the ambiguous middle — and what you will do with each middle case before anything irreversible keys off it.',
          hint: 'If your approval queue shows 100 percent one-click approvals, your abstention threshold is theatre — lower the bar or fix the field.',
        },
        mistakes: [
          {
            mistake: 'Treating model-stated confidence as a calibrated probability',
            fix: 'Compute span, validator, agreement and source-quality components; keep self-rating as one weak feature at most.',
          },
          {
            mistake: 'Abstention with no routing — or routing nobody measures',
            fix: 'Reason-coded thresholds routed to review; watch approval rates per field to keep thresholds honest.',
          },
          {
            mistake: 'Letting the model resolve easy duplicate pairs',
            fix: 'Normalise, block and match with deterministic rules first; the model only sees the ambiguous middle.',
          },
          {
            mistake: 'Irreversible merges on ambiguous names',
            fix: 'Cannot-tell is a first-class answer: human routing, canonical ids, evidence stored, merges reversible.',
          },
        ],
        exam: {
          question:
            'Why is model-stated confidence unreliable, and which four evidence signals replace it? Outline the entity-resolution pipeline and say why the model belongs only at the final ambiguity rung.',
          answer:
            'Self-reported numbers are generated to sound plausible, not read from a calibrated internal probability — they cluster high and do not track real error rates. Replacement signals you compute: span support (the claim\'s quote exists verbatim in the source), validator outcome (clean versus repaired versus failed), cross-run agreement (a second low-temperature extraction with permuted field order — sampled where cost matters), and propagated source quality from the parse/OCR gate; store components so review disagreements can be explained, and keep the self-rating only as a weak feature. Resolution pipeline: deterministic normalisation (casefold, NFKC, punctuation, legal-suffix table, phone/address formats) resolves most pairs free; blocking by shared keys avoids O(n²) comparison; rule scoring with bands for auto-merge, auto-separate and a middle; the model sees only the middle, side by side, with same / different / cannot-tell forced and a reason — because short generic names with no corroborating keys are genuinely underdetermined and the model is worst exactly there. Canonical ids, stored evidence and reversible merges keep the whole thing auditable, and no irreversible action keys off an unresolved ambiguous merge.',
          source: 'Data-quality interview: "how do you know an extraction is right before you act on it?"',
        },
        summary: [
          'Self-rated confidence is tone; compute components from span, validator, agreement and source.',
          'Store components — the sum cannot explain a review disagreement.',
          'Abstention is routing: reason-coded thresholds set by error cost, with approval rates watched.',
          'Resolution is normalise → block → rules → model-for-the-middle → canonical id.',
          'Cannot-tell is a first-class answer for underdetermined pairs.',
          'Merges keep evidence and stay reversible; nothing irreversible keys off the ambiguous band.',
        ],
      }),
      [
        [
          'Model-stated confidence (0 to 1) is unreliable mainly because:',
          [
            'It is generated to be plausible, not read from a calibrated internal probability',
            'Providers forbid confidence fields',
            'It costs extra tokens',
            'It only works in Python',
          ],
          0,
          'It sounds measured; it is produced by the same machinery that produces prose.',
        ],
        [
          'Which confidence signal is essentially free because your pipeline already computes it?',
          [
            'Cross-run agreement on every field',
            'Span support (the quote exists verbatim in the source) and validator/repair outcomes',
            'A second larger model\'s opinion',
            'Human review of every row',
          ],
          1,
          'String search plus the validator you already run — the expensive signal is cross-run agreement, which you sample.',
        ],
        [
          'In entity resolution, short generic names like bare "Acme" with no corroborating keys should be:',
          [
            'Merged on name similarity alone',
            'Given to the model with high temperature to force a pick',
            'Treated as cannot-tell: routed to human review, since the pair is genuinely underdetermined',
            'Dropped from the dataset',
          ],
          2,
          'Confident picking on underdetermined data is how a stationery vendor inherits an enterprise account.',
        ],
        [
          'The right structural order for entity resolution is:',
          [
            'Model first for quality, rules as backup',
            'Normalise deterministically, block candidates, rule-match with bands, model only the ambiguous middle, then canonicalise with evidence',
            'Embed everything and threshold cosine similarity',
            'Manual review of all pairs, then the model confirms',
          ],
          1,
          'Deterministic-first is cheap, auditable and resolves most pairs; the model earns its place only on the genuinely hard remainder.',
        ],
      ]
    ),
  ],
};
