// Module 6 — Structured Output: Contracts the Machine Can Check
import type { CourseModule } from '../db';
import { nineBlocks, table, tip, warn, info, code } from '../nineBlocks';
import { lesson, M6, COURSE_ID } from './helpers';

export const module6: CourseModule = {
  id: M6,
  course_id: COURSE_ID,
  title: 'Module 6 — Structured Output: Contracts the Machine Can Check',
  summary:
    'Part II opens where Part I left its contract: output the pipeline can actually consume. JSON mode versus schema-constrained generation versus grammar constraints and what each really guarantees; choosing tables and lists when a human is the consumer; tool/function schemas as the strongest contract with deterministic code taking everything a model should never compute; and validation loops with bounded repair prompts that make the contract hold in production.',
  sort_order: 6,
  lessons: [
    lesson(
      M6,
      'pem-6-1',
      1,
      'JSON Mode vs Schema-Constrained Generation: What Each Actually Guarantees',
      'Syntactic validity, shape validity and semantic truth are three different promises. JSON mode buys the first, schemas buy the second, and only your validator and your prompt can even attempt the third.',
      16,
      nineBlocks({
        objectives: [
          'Distinguish prompt-only JSON, JSON mode, schema-constrained generation and grammar constraints by the guarantee each provides',
          'Pick the cheapest mechanism that enforces the guarantee your pipeline actually needs',
          'Write a JSON Schema subset (types, required, enums, nulls) an API can enforce',
          'Explain why schema enforcement never removes the need for value-quality prompting and downstream validation',
        ],
        hook:
          'A data team demos a receipt extractor: "reply with the details as JSON". It works, every time, in the demo. In production, eight percent of responses fail to parse — a markdown fence around the object, a polite "Here is the JSON you asked for:", single quotes, a trailing comma. They bolt on regex stripping. Parses succeed now, and the shape starts drifting: "total_amount" on one run, "amount" on the next; "12 March 2026" here, "2026-03-12" there. Three different failures, three different missing guarantees — and the team kept arguing about prompt wording because they never named which promise they thought the model had made.',
        concept: `**Three promises, not one.** Any structured-output request is asking for three separable things. *Syntax*: the text is parseable (a real JSON parser accepts it, no fences, no preamble). *Shape*: it parses into exactly your keys, types, enums and nesting — nothing missing, nothing extra. *Semantics*: the values are right — the total matches the invoice, the date is the issue date, the customer id exists in your database. Every mechanism below buys one or two of these; none buys the third. Most production outages in this space are someone believing they bought all three.

**Prompt-only JSON.** You write "reply with JSON containing fields X, Y, Z", and the model usually complies — it has seen that pattern a million times. Nothing constrains it, though: it may fence the object, add a sentence, quote keys inconsistently, drop a field on a long input, or invent one. This is a request, not a guarantee. Fine for prototypes and human-in-the-loop moments; indefensible as a pipeline contract.

**JSON mode.** A provider-side decoding constraint (marketed under names like "JSON mode", "response format json", or "respond with JSON") that makes the completion parseable as JSON — the API guarantees syntax. What it does *not* guarantee is your shape: the model can return \`{"result": ...}\` instead of your top-level array, use different key names, stringify numbers, or nest differently. JSON mode kills parse failures; shape drift remains a prompt-and-validate problem. Some providers fold schema support into a "strict" flag on the same feature — read the fine print, because strictness, supported schema constructs and sampling trade-offs all vary.

**Schema-constrained generation.** You register a JSON Schema (or the provider-supported subset of one) and the response is forced to conform: required fields present, types enforced, \`enum\` values respected, additional keys rejected — enforced by the provider, not by your hope. This is the right production default for machine-consumed output, because the shape failure class largely disappears and your validator can focus on values. Two hedges: the *supported subset* differs across providers (combinators, defaults, formats and unbounded arrays get restricted or coerced; some features require specific API flags), and enforcement may interact with sampling or streaming. Verify against your provider's current docs before you design around a construct.

**Grammar-constrained decoding.** The strongest syntactic mechanism: you supply a context-free grammar (JSON, YAML, SQL, a custom line format) and the provider masks invalid tokens at decode time, so anything it emits is in the language *by construction*. Useful beyond JSON — report formats, DSLs, log lines. Costs: a wrong or over-tight grammar strangles or breaks generation, natural language inside the grammar needs care, and availability depends on provider and endpoint.

**What none of them guarantee — and what the prompt still does.** A schema says \`amount\` is a number. It does not say it is the *right* number, that \`invoice_date\` is not the due date, or that a missing field becomes \`null\` instead of a guess. Under a schema, the prompt's job narrows to meaning: field definitions ("invoice_date: date of issue, never due date"), enum semantics ("uncertain: set status to unknown rather than choosing the likeliest value"), abstention paths (null plus a reason field), and few-shot demonstrations for conventions the schema cannot express (Module 3, Lesson 3). The schema is the shape contract; the prompt is the meaning contract; the validator (Lesson 4) is where you find out whether either held.`,
        extras: [
          table(
            'Four mechanisms by the guarantee they buy',
            ['Mechanism', 'Guarantees', 'Does not guarantee', 'Right when'],
            [
              ['Prompt-only "reply JSON"', 'Nothing enforceable', 'Parse, shape, values', 'Prototypes and demos'],
              ['JSON mode', 'Syntax: parses as JSON', 'Keys, types, enums', 'Cheap parse-safety, shape handled elsewhere'],
              ['Schema-constrained', 'Syntax + shape (provider-enforced)', 'Semantic correctness of values', 'Production pipelines with machine consumers'],
              ['Grammar-constrained', 'Any text in the language, by construction', 'Meaning; grammar authoring is on you', 'Non-JSON formats: SQL, YAML, custom DSLs'],
            ],
          ),
          code(
            `{\n  "type": "object",\n  "additionalProperties": false,\n  "required": ["vendor", "currency", "line_items"],\n  "properties": {\n    "vendor": { "type": ["string", "null"] },\n    "invoice_date": { "type": ["string", "null"], "description": "Date of ISSUE, format YYYY-MM-DD. Never the due date. Null if absent." },\n    "total": { "type": ["number", "null"], "description": "Grand total as printed. Null if not printed — never computed here." },\n    "currency": { "type": "string", "enum": ["INR", "USD", "EUR", "GBP", "UNKNOWN"] },\n    "line_items": {\n      "type": "array",\n      "items": { "type": "object", "additionalProperties": false,\n        "required": ["desc", "amount"],\n        "properties": { "desc": { "type": "string" }, "amount": { "type": ["number", "null"] } } }\n    }\n  }\n}`,
            'receipt.schema.json',
            'json',
          ),
          tip(
            'Schema for shape, prompt for meaning, validator for truth',
            'Write the schema first (it exposes which fields you never actually defined), then spend the prompt budget on definitions and abstention, then validate values in code.',
          ),
          warn(
            'Valid JSON is not correct data',
            'Schema enforcement moves failures from parse errors to silent wrong values — which are worse, because nothing crashes. Semantic checks (ranges, cross-field arithmetic, existence in your records) stay your job.',
          ),
        ],
        worked: {
          title: 'Harden a "reply as JSON" prompt into a schema-constrained extractor',
          problem:
            'A CRM enrichment prompt: "Look at the email signature and reply as JSON with name, company, phone, email." Production symptoms: fenced output breaking the parser, keys renamed between runs, phone numbers reformatted inconsistently, and a name invented when the signature had none. Convert it to a contract the provider enforces, with a prompt that survives the schema.',
          steps: [
            {
              title: 'Classify each failure against the three promises',
              desc: 'Fences and preambles = syntax failures. Renamed keys = shape failures. Invented name and reformatted phones = semantic failures. Three classes means three mechanisms; no single "make the prompt stricter" edit fixes all of them.',
            },
            {
              title: 'The BEFORE prompt, with its guarantee gaps marked',
              desc: 'Weak version: "You are an expert extractor. Carefully extract contact details from the signature below and return them as JSON in a clean, professional format. Make sure everything is accurate." It asks for accuracy (semantics) and JSON (syntax) but names no keys, no types, no absence policy — so shape and abstention are whatever the model feels like.',
              code_snippet:
                'BEFORE (weak)\n"You are an expert extractor. Carefully extract contact details\nfrom the signature below and return them as JSON in a clean,\nprofessional format. Make sure everything is accurate."\n\nGaps: no keys/types (shape drift), no absence rule (invented\nname), no fence rule (syntax), "accurate" is untestable.',
            },
            {
              title: 'Register the schema — the shape contract becomes provider-side',
              desc: 'Object, additionalProperties false, required subset, null-able types for anything that can be missing, an enum for country, and a description on every field that carries the semantic rule. The description is not decoration: it is prompt text the provider passes along with the schema, and it is where "issue date, not due date" lives.',
              code_snippet:
                'AFTER, part 1 (schema the API enforces):\n{\n  "type": "object", "additionalProperties": false,\n  "required": ["email", "name_present"],\n  "properties": {\n    "name": { "type": ["string", "null"] },\n    "name_present": { "type": "boolean",\n      "description": "true only if a name literally appears" },\n    "company": { "type": ["string", "null"] },\n    "email": { "type": ["string", "null"] },\n    "phone": { "type": ["string", "null"],\n      "description": "digits exactly as printed; do not reformat" },\n    "country": { "type": "string",\n      "enum": ["IN", "US", "OTHER", "UNKNOWN"] }\n  }\n}',
            },
            {
              title: 'Rewrite the prompt so it works under the schema',
              desc: 'Strip everything the schema now owns (key naming, JSON-only, fences) and keep only meaning: source rules, abstention, verbatim policy, and what to do with conflicting data. The prompt gets shorter; the contract gets stronger.',
              code_snippet:
                'AFTER, part 2 (the meaning contract):\nExtract from <signature> only. Rules:\n1. Copy values verbatim; never reformat phone digits.\n2. If a field is not literally present -> null (email -> null).\n   name_present=false when no name appears; never guess one.\n3. Country from the domain or phone prefix; else "UNKNOWN".\n4. Output the object only — no prose (the schema enforces shape).\n\n<signature>\n...\n</signature>',
            },
          ],
          solution:
            'WHY each change: the fence and preamble failures disappear because the provider now enforces syntax; renamed keys disappear because additionalProperties and required are enforced, not requested; invented names die on the combination of `name_present` (a checkable flag a validator can assert) and rule 2\'s explicit abstention path (Module 5, Lesson 3, class 5); phone reformatting dies on a verbatim clause, which is a semantic rule no schema can express — exactly the part that stays in the prompt. What remains after the schema is the honest remainder: your validator still checks semantics (email format, country against domain, name_present consistency), because no mechanism on this page guarantees truth.',
        },
        practice: {
          title: 'Audit a JSON prompt for its missing guarantee',
          prompt:
            'Take a prompt you use that asks for JSON. Write down three recent outputs: one that failed to parse, one that parsed with the wrong shape, one that parsed correctly but was wrong. For each, name the missing guarantee (syntax, shape, semantics) and the cheapest mechanism that would have prevented it. Then write the schema you would register and the one sentence of prompt the schema cannot replace.',
          hint: 'If all three failures would be "fixed" by the same edit, you are conflating guarantees — each class has its own layer.',
        },
        mistakes: [
          {
            mistake: 'Treating JSON mode as a schema',
            fix: 'JSON mode promises parseable JSON, nothing about your keys. If your parser reads fixed field names, you need schema enforcement (or your own validation) — parse success will otherwise hide shape drift.',
          },
          {
            mistake: 'Assuming a schema makes values correct',
            fix: 'Schemas validate structure; totals, dates and citations are semantic claims. Keep arithmetic and existence checks in code (Lessons 3-4) — a perfectly typed wrong number is still a wrong number.',
          },
          {
            mistake: 'Designing a schema your provider cannot enforce',
            fix: 'Unsupported constructs are rejected, silently coerced or force you out of strict mode. Test the schema against the API early and read the supported-subset docs — verify against your provider\'s current docs, they change.',
          },
          {
            mistake: 'Leaving prompt instructions that contradict the schema',
            fix: '"Include a confidence_score field" in prose while the schema forbids extra keys produces a coin flip per run. Delete every instruction the schema already owns; the prompt states meaning only.',
          },
        ],
        exam: {
          question:
            'Explain the three promises of structured output (syntax, shape, semantics). For each of JSON mode, schema-constrained generation and grammar-constrained decoding, state which promises it buys, and give one pipeline where prompt-only JSON is genuinely acceptable.',
          answer:
            'Syntax = the response parses as JSON; shape = it conforms to your keys/types/enums with nothing missing or extra; semantics = values are factually correct for this input. JSON mode buys syntax only (provider-enforced parseable JSON; keys and types still drift). Schema-constrained generation buys syntax plus shape (a registered JSON Schema is enforced during generation: required fields, types, enums, no additional properties — supported subsets vary by provider, so verify current docs). Grammar-constrained decoding buys syntax by construction for any language in the grammar (JSON, SQL, custom formats), with the grammar authoring and any meaning left to you. None buys semantics: value correctness needs semantic validation in code (ranges, cross-field arithmetic, existence checks) plus prompt-level field definitions and abstention rules. Prompt-only JSON is acceptable when a human is the consumer of a prototype, outputs are eyeballed before use, and parse failure costs are near zero — i.e. no downstream parser depends on it.',
          source: 'Applied LLM engineering interview staple: "how do you reliably get JSON out of an LLM?"',
        },
        summary: [
          'Syntax, shape and semantics are three promises; name which one you are buying before choosing a mechanism.',
          'Prompt-only JSON is a request; JSON mode guarantees parse; schema-constrained generation guarantees your shape; grammar constraints guarantee membership in a language.',
          'Provider-enforced schemas vary in supported constructs — design against your provider\'s documented subset, not against the JSON Schema spec.',
          'Schemas never guarantee correct values: keep definitions, verbatim rules and abstention in the prompt; keep semantic checks in code.',
          'The schema is the shape contract, the prompt is the meaning contract, the validator is the truth check.',
        ],
      }),
      [
        [
          'JSON mode primarily guarantees which promise?',
          [
            'That every value is factually correct',
            'That the response is parseable JSON — shape and semantics are not guaranteed',
            'That required fields are present with correct types',
            'That the model will not add prose around the object',
          ],
          1,
          'JSON mode constrains syntax. Keys, types and values can still drift, which is why shape needs a schema and truth needs validation.',
        ],
        [
          'Your pipeline crashes when the model returns "total_amount" instead of "amount". Cheapest mechanism that prevents it:',
          [
            'A longer prompt asking politely for exact keys',
            'Schema-constrained generation with additionalProperties false and required keys',
            'Higher temperature for more consistency',
            'JSON mode instead of prompt-only JSON',
          ],
          1,
          'This is a shape failure. Only provider-enforced schema (or your own validation plus repair) removes key drift; JSON mode and temperature do not.',
        ],
        [
          'A schema-valid response has total = 4199.5 while the line items sum to 4198.0. This is a failure of:',
          ['Syntax', 'Shape', 'Semantics — the value claim is wrong although the structure is perfect', 'Tokenization'],
          2,
          'Cross-field arithmetic is a semantic check; no schema enforces it. This is why the validator layer checks values, not just structure.',
        ],
        [
          'Which statement about grammar-constrained decoding is correct?',
          [
            'It guarantees the output is true',
            'It guarantees any emitted text belongs to the given language, by construction — an over-tight grammar can also strangle generation',
            'It replaces the need for field definitions in the prompt',
            'It is available identically on every provider',
          ],
          1,
          'Grammar constraints mask invalid tokens during decoding: membership in the language is guaranteed, meaning is not, and grammar design plus availability are provider-specific.',
        ],
      ]
    ),
    lesson(
      M6,
      'pem-6-2',
      2,
      'When Tables and Lists Beat JSON: Choosing the Output Shape for the Consumer',
      'Output shape is a contract with a consumer — code, a person, or another model. Pick the shape after you name the consumer, and the classic mismatches (JSON for humans, regex over markdown tables) stop happening.',
      15,
      nineBlocks({
        objectives: [
          'Identify the true consumer of an output (parser, reader, downstream model) before choosing its shape',
          'Compare JSON, markdown tables, numbered lists and line-per-record formats on readability, parse cost and drift',
          'Write a human-facing comparison answer a reader can act on in seconds',
          'Recognise when the fix is rendering in the app rather than asking the model twice',
        ],
        hook:
          'A subscription-pricing assistant answers "compare the three plans" by returning JSON, because someone insisted structured output is always better. The customer reads raw braces and asks the same question again. Meanwhile, on the other side of the building, an analyst builds a dashboard by regex-parsing a markdown table the model produced because tables "look nicer" — and the first customer reply containing a pipe character breaks it. Two teams, two opposite mistakes: both chose the shape before naming who consumes it.',
        concept: `**The consumer comes first.** "Structured output" is not a virtue; it is a contract with whoever reads the bytes next. Three consumers exist in practice, and each has a native shape. *A parser* (your code, a database loader, a spreadsheet import) wants a machine format it can parse with a real parser. *A person* reading in a chat UI or document wants scannable prose, tables or lists. *A downstream model* (the next prompt in a chain) wants whatever it reads most reliably — usually plain, well-delimited text or a simple table, because it is not running a parser. Name the consumer, then the shape. Two consumers means either two stages or rendering in the app, never one compromise blob.

**JSON: the machine format.** Strict, self-describing, parseable by every language in one line, and enforceable by a schema (Lesson 1). Costs: verbose — every key is repeated per record and every string is quoted, so token spend climbs with record count; and it is close to unreadable for humans, who must scan braces to find one value. Use it when code consumes the output; never paste it at a reader as the final answer.

**Markdown tables: the reading format.** Ideal for comparisons, matrices and "same attribute across N items" — a chat reader can scan three plans across four rows in two seconds. They are fragile for programmatic parsing (cells containing pipes, newlines or backslashes break naive splitting; models occasionally reorder columns or drop rows on long outputs). Two honest rules: if a human reads it, a table is usually right; if code must parse it, ask for schema instead — parsing model-produced markdown with regex is a bet against a probabilistic author. Note that a *downstream model* reads tables fine, which is why "model then model" chains can stay in table form.

**Numbered and bulleted lists: the sequence format.** The right shape for steps, ranked recommendations, and anything where order carries meaning. Cheapest to scan, cheapest to produce, and impossible to mangle structurally — the main risk is content drift (missing items), which the prompt handles with count constraints ("exactly five, ranked").

**Line-per-record: the cheap-parsing middle.** One record per line, fields separated by a delimiter or written as \`field: value\` pairs — compact, diffable, and simple to split. The trap: it is a hand-rolled format, so edge cases (a newline inside a field, a delimiter inside a value) immediately need escaping rules — which is the specification JSON already had. Use it for low-stakes, human-glanceable logs; when stakes are high, spend the extra tokens on schema.

**The two-consumer pattern.** The real-world case: code stores the record *and* a human reads it in the same feature. Do not ask the model for both. Have the model produce the schema-valid object once, then render the table, list or sentence in your application code — deterministic formatting, zero extra tokens, and the reader always sees what your designers intended. The model authors data; the app authors presentation.

**Token economics, honestly.** JSON's overhead is real but modest — for repetitive records, quotes and braces often add ten to thirty percent, and that is rarely your dominant cost next to long inputs. Do not contort the format to save tokens; choose by consumer, then optimize length by trimming fields you do not actually use.`,
        extras: [
          table(
            'Consumer first, shape second',
            ['Consumer', 'Best shape', 'Failure mode of the wrong shape'],
            [
              ['Your parser / DB loader', 'Schema-enforced JSON', 'Regex over markdown breaks on pipes, newlines, reordered columns'],
              ['A person reading chat or a doc', 'Markdown table, numbered list, short prose', 'Raw JSON is unreadable; readers re-ask and trust the feature less'],
              ['A downstream model step', 'Simple table or delimited lines, clearly fenced', 'Deeply nested JSON wastes attention; fence to keep it data'],
              ['Both code and a person', 'Schema from the model, table rendered by the app', 'Asking the model for both doubles cost and invites drift'],
            ],
          ),
          tip(
            'Let the app own presentation',
            'One schema-valid object in, rendered table or sentence out — deterministic, themeable, free of model formatting drift. The model authors data; your code authors display.',
          ),
          warn(
            'Do not regex-parse model markdown when a schema was available',
            'A table is a reading format, not a parsing contract. If code depends on it, you have chosen the wrong shape for that consumer — not a worse model.',
          ),
        ],
        worked: {
          title: 'Fix the same feature twice: once for a reader, once for a parser',
          problem:
            'A plan-comparison feature serves two callers. (A) A chat widget answers "which plan should I take?" — currently returning JSON pasted at the customer. (B) A billing dashboard asks the model for "a table of the top 20 accounts by overdue amount" and parses the markdown with regex — currently breaking on rows with special characters. Fix both by choosing shape per consumer.',
          steps: [
            {
              title: 'Case A: name the consumer — a person deciding',
              desc: 'The reader wants to compare and act, not to parse. BEFORE (weak): a JSON blob of plan objects — technically structured, useless to the customer. The prompt also never said what decision the answer serves.',
              code_snippet:
                'BEFORE (weak, reader gets this):\n[{"plan":"Starter","price":499,"seats":1,\n  "support":"email"},{"plan":"Team","price":1499,...}]\n\nReader question: "which should I take?" -> answer: braces.',
            },
            {
              title: 'Case A: AFTER — table for scanning plus one decision line',
              desc: 'The strong version asks for the reader\'s shape and the reader\'s decision: a markdown table with a fixed column order, then a single recommendation tied to a stated condition. The WHY: tables let humans compare shared attributes across items at a glance, and the conditional recommendation converts comparison into action — the two things a decision prompt actually needs.',
              code_snippet:
                'AFTER (strong):\nCompare exactly these dimensions: price, seats, support,\nexport. Rules:\n- Markdown table, columns: Plan | Price/mo | Seats | Support | Best for\n- Exactly one row per plan; no extra rows; no code fences.\n- After the table: one line "Choose ___ if ___" — pick the\n  plan matching the user\'s stated constraint (budget or team size).\n- No JSON anywhere in the reply.',
            },
            {
              title: 'Case B: name the consumer — a parser, so schema',
              desc: 'The dashboard does not read the table; its loader does. BEFORE: "Give me a markdown table of the top 20 accounts by overdue amount" — pretty, and broken the first time an account name contains a pipe or a newline. AFTER: schema-constrained JSON array (account, overdue_amount, days_overdue), sorted descending, plus the instruction that sorting is expected but the amount format is plain digits.',
              code_snippet:
                'AFTER (parser consumer):\nReturn a JSON array (schema-enforced), exactly 20 objects:\n{ "account": string, "overdue_amount": number,\n  "days_overdue": integer }\nSorted by overdue_amount descending. Amounts as bare numbers\n(no currency symbols, no commas — the app formats them).',
            },
            {
              title: 'Case B: the app renders the table the reader eventually sees',
              desc: 'Same feature, one shape upstream. The loader parses JSON; the dashboard component renders the table in the UI — column order, number formatting and escaping now deterministic code, immune to model formatting variance. Two consumers, one contract, presentation where it belongs.',
            },
          ],
          solution:
            'The reader-facing path went from JSON walls to a table plus a decision line — scannable in seconds, no re-asks. The parser-facing path went from regex over markdown (a bet against a probabilistic author) to a schema-enforced array whose presentation is rendered by the app. Both fixes came from the same question asked before writing a word of prompt: who consumes this, and what is their native shape? That question — not "JSON or not" as a slogan — is the whole decision procedure.',
        },
        practice: {
          title: 'Re-shape two outputs by consumer',
          prompt:
            'Pick two prompts you use: one whose output a human reads, one whose output code consumes. For each, write the consumer, the current shape, and the shape the consumer actually wants. Rewrite both prompts. For the human one, include the exact table columns or list structure; for the machine one, name the schema you would enforce and what your app would render from it.',
          hint: 'If your "machine" prompt outputs a markdown table, or your "human" prompt outputs JSON, you have found your highest-leverage fix for the day.',
        },
        mistakes: [
          {
            mistake: 'Choosing JSON because "structured is always better"',
            fix: 'Structured beats unstructured only for machine consumers. For a reader, JSON is structure without comprehension — the contract is with the human, and their native shape is a table or list.',
          },
          {
            mistake: 'Parsing model-produced markdown tables with regex',
            fix: 'Pipes, newlines and reordered columns are normal language to the model. Ask for schema when code consumes the output; render the table yourself for humans who do.',
          },
          {
            mistake: 'Asking one completion to serve two consumers',
            fix: 'Split the stages: schema from the model, presentation from the app. One contract upstream, deterministic rendering downstream, no compromise blob in between.',
          },
          {
            mistake: 'Hand-rolling a delimited format without escaping rules',
            fix: '"One line per record" collapses on the first value containing a newline. Either specify escaping fully (which is re-inventing JSON) or use the schema you already have.',
          },
        ],
        exam: {
          question:
            'A feature must both store extracted records in a database and show them to a human in chat. Describe the output design you would ship, and explain why asking the model for "JSON that is also nicely readable" fails both consumers.',
          answer:
            'Design in two stages: the model produces one schema-constrained JSON object/array (types, required fields, no extra keys) that the application validates and stores; the application then renders the human view — a markdown table, numbered list or templated sentence built by deterministic code from the stored record. Asking the model for "readable JSON" fails the parser because readability invites prose preambles, fences, inconsistent key naming and formatted numbers ("₹1,250" instead of 1250) that break strict parsing; it fails the reader because braces and quotes force scanning rather than comparison, and because presentation drifts run to run with no design control. Separating contracts lets each consumer get its native shape: enforcement upstream where machines read, rendering downstream where humans read — for one model call, no duplicated tokens, and no formatting variance in the UI.',
          source: 'Common applied design question: "how do you display LLM output without breaking your pipeline?"',
        },
        summary: [
          'Name the consumer — parser, reader, or downstream model — then choose the shape; never the other way round.',
          'JSON for code (schema-enforced); tables and lists for people; simple fenced text for the next model step.',
          'Two consumers means two stages: schema from the model, presentation rendered by your app.',
          'Regex over model markdown is a bet against a probabilistic author; schema when code parses.',
          'JSON token overhead is real but modest — pick by consumer first, optimize length second.',
        ],
      }),
      [
        [
          'A chat answer will be read by a customer comparing three options. Best shape:',
          [
            'A JSON array of option objects',
            'A markdown table of shared attributes plus one conditional recommendation line',
            'A grammar-constrained object',
            'Raw comma-separated values',
          ],
          1,
          'A table lets a person scan shared attributes across items at a glance; the decision line converts comparison into action. JSON serves parsers, not readers.',
        ],
        [
          'Your loader must parse model output into fixed fields. You should ask for:',
          [
            'A markdown table, parsed with a regex',
            'A nice bulleted list the loader can split',
            'Schema-enforced JSON with required keys and types',
            'Prose plus a summary line',
          ],
          2,
          'Code consumes output, so the contract is machine format — and only a schema (or your own validation) keeps keys and types stable.',
        ],
        [
          'The same feature shows records to humans and stores them in a database. Correct design:',
          [
            'Ask the model for JSON that is also pretty-printed for humans',
            'Model returns schema-valid data once; the app renders the table or sentence for the human',
            'Two model calls: one JSON, one table',
            'Store the markdown table and parse it later',
          ],
          1,
          'Data from the model, presentation from the app: one contract upstream, deterministic rendering downstream, no duplicated model cost.',
        ],
        [
          'Main risk of a hand-rolled "one line per record" format:',
          [
            'It costs more tokens than JSON',
            'Edge cases (delimiters or newlines inside values) demand escaping rules — you end up re-inventing JSON without its parser',
            'Providers refuse to emit it',
            'It cannot be read by humans',
          ],
          1,
          'Simple formats are simple until the first adversarial value; the escaping spec you then write is exactly what JSON already provides.',
        ],
      ]
    ),
    lesson(
      M6,
      'pem-6-3',
      3,
      'Tool Schemas: The Strongest Output Contract — and When Code Beats the Model',
      'Function schemas move the contract from "produce this text" to "call this named action with validated arguments" — and the execution lands in deterministic code. Learn the split: the model decides, the code computes.',
      16,
      nineBlocks({
        objectives: [
          'Explain why a tool/function schema constrains the action space in addition to the argument shape',
          'Split a feature into model-decides and code-computes responsibilities',
          'Write a tool schema with enums, required arguments and descriptions written as decision rules',
          'Name five production operations that must never be delegated to model generation',
        ],
        hook:
          'Every Friday, a finance assistant tells a customer their invoice total is off by eleven rupees. The model is not "bad at arithmetic" — it is a text predictor doing an approximate walk over digit tokens, and the calculator sitting one function call away computes the exact answer instantly and free. The bug was never the model. It was assigning a computation to a predictor, in a domain where the difference between approximately right and exactly right is called a discrepancy.',
        concept: `**From text contract to action contract.** Lesson 1 constrained what the model may *emit*. Tool (function) schemas go further: instead of free-forming your payload, the model emits a *call* — a name from your registered set plus a JSON argument object validated against the schema you declared — and your code executes it, returning a result the model then uses. Three properties make this the strongest contract available in ordinary prompting:

1. **Bounded action space.** The model cannot invent an action; only registered tools exist. Choosing becomes classification over a known list, the most reliable shape of model task (Module 4 routing, made structural).
2. **Enforced argument shape.** Types, required fields and enums are checked by the API before your code sees them — the same guarantees as Lesson 1, but attached to an execution boundary rather than to a paragraph someone will paste into a chat.
3. **Deterministic execution.** Whatever the tool does — compute, query, sort, write — happens in code. The value that comes back is exact by construction, because a function ran, not because the model was having a careful morning.

**The split that matters: decides vs computes.** Language models are remarkable at understanding intent, classifying, extracting from messy text, fuzzy matching, routing, summarizing and drafting. They are unreliable at arithmetic, date and timezone math, sorting and ranking by numeric keys, exact lookups, ID and checksum generation, permission checks and pagination. The production pattern writes itself: the model *decides* (which tool, which arguments, which item belongs in which category) and the code *computes* (totals, deadlines, lookups, formatted identifiers). The inverse rule holds too: never ask code to do what requires language understanding — classifying a free-text complaint is a model job. This is Module 5's prompt-as-program triple taken to its conclusion: inputs, constraints, contract — and then the return statement executed by a real interpreter.

**Descriptions are the prompt.** Inside a tool schema, the \`description\` fields are the steering text the model reads when choosing tools and filling arguments. Write them as decision rules, not labels: "Use when the question asks about an existing order's status; do NOT use for pre-sales questions" beats "order tool". Enum values deserve one-line semantics each — this is where a \`priority: normal|high|urgent\` enum gets its meaning (Module 1 specificity, relocated into the schema).

**The trade-offs, honestly.** Tool definitions cost input tokens on every call; tool use adds round trips and latency; a summary task needs neither — one completion is cheaper. Schemas also do not make actions safe: the model can still pick the wrong tool or wrong arguments with perfect schema validity. Validate semantically (is this order id real? is the account theirs?), require confirmation for destructive calls, and give tools least privilege. Tool-calling availability, parallel calls and enforcement details vary by provider — verify against your provider's current docs.

**When plain structured output still wins.** If the model is the final author of the output (a summary, a draft, a classification stored as a row), schema-constrained JSON (Lesson 1) is one call with no tool overhead. Reach for tools when an action must execute, when a value must be exact, or when the response should be composed from multiple deterministic results.`,
        extras: [
          table(
            'The decides/computes split',
            ['Let the model do', 'Let the code do'],
            [
              ['Classify intent; pick from an enum', 'Arithmetic, totals, tax, rounding'],
              ['Extract fields from messy text', 'Date/time math, timezones, business-day math'],
              ['Route to the right team or tool', 'Sorting, ranking by numbers, pagination'],
              ['Draft the customer-facing wording', 'Lookups by exact key, IDs, checksums'],
              ['Summarize and paraphrase', 'Permission checks, format compliance, writes to systems'],
            ],
          ),
          code(
            `{\n  "name": "get_order_status",\n  "description": "Use ONLY when the user asks about an existing order's delivery/return/refund status and an order id is known or can be asked for. Do NOT use for pre-sales, pricing or complaints without an order id.",\n  "parameters": {\n    "type": "object",\n    "additionalProperties": false,\n    "required": ["order_id"],\n    "properties": {\n      "order_id": { "type": "string", "description": "Order id exactly as the user or CRM provided it, e.g. ORD-48213" },\n      "include_events": { "type": "boolean", "description": "true when the user asked what happened / timeline" },\n      "priority": { "type": "string", "enum": ["normal", "high", "urgent"],\n        "description": "urgent = money loss or safety now; high = SLA at risk; else normal" }\n    }\n  }\n}`,
            'tools/order_tools.json',
            'json',
          ),
          tip(
            'Ask the model for intent, not for values',
            'If a function can produce the number — total, deadline, rank, checksum — the model should emit the arguments and let the function run. Exactness is free when code computes it.',
          ),
          warn(
            'Schema-valid is not safe',
            'A tool call can be perfectly typed and still be wrong for this user, this account or this moment. Semantic validation and confirmation for destructive actions stay outside the schema.',
          ),
        ],
        worked: {
          title: 'Redesign an assistant that computes — into one that decides',
          problem:
            'An ops assistant answers "what do I owe on invoice INV-2214, and can I get a 5% early-payment discount?" by generating the numbers itself. Recent wrong answers: a mis-summed subtotal, a discount applied to the pre-tax total instead of post-tax, and a due date off by a weekend. Redesign it as model-decides, code-computes.',
          steps: [
            {
              title: 'Audit every generated value',
              desc: 'List what the model produces today: invoice line extraction (needs language), subtotal and tax (arithmetic — code), discount eligibility (rule over dates and amount — code), due date with weekend rollover (date math — code), and the explanatory sentence (needs language). Five values, three owners. The audit is the whole redesign.',
            },
            {
              title: 'BEFORE: one prompt doing everything (weak)',
              desc: 'The old prompt asks the model to be the calculator and the calendar. It even asks for care — which has never once fixed a digit walk.',
              code_snippet:
                'BEFORE (weak)\n"You are a helpful billing assistant. Read the invoice below,\ncalculate the total including tax, check if a 5% early-payment\ndiscount applies, compute the due date, and reply to the\ncustomer politely with all amounts clearly explained."',
            },
            {
              title: 'AFTER, part 1: tools the model may call',
              desc: 'Two tools: `get_invoice` (fetch exact values) and `quote_payment` (pure function: amount, payment_date, rule inputs -> exact totals, discount, due date with rollover). Descriptions are decision rules; arguments are the minimum the model can justify from conversation. The model\'s job shrinks to understanding the question and filling arguments — the strongest contract, because everything downstream of it is code.',
              code_snippet:
                'AFTER tools (abridged):\nget_invoice(order_ref) -> returns line items, tax rate, terms\nquote_payment(invoice_id, payment_date) ->\n  { subtotal, tax, discount_pct, payable, due_date }\n  // all arithmetic, tax rounding and weekend rollover inside\n\nModel emits: { tool: "quote_payment",\n               args: { invoice_id: "INV-2214",\n                       payment_date: "2026-10-20" } }',
            },
            {
              title: 'AFTER, part 2: the prompt keeps only the language work',
              desc: 'Field semantics stay in the prompt: parse the invoice reference from conversational text (it may be written as "the October invoice"), never invent an id, ask when ambiguous, and narrate the tool results in one short paragraph — quoting the numbers the tool returned, never re-deriving them.',
              code_snippet:
                'AFTER prompt (meaning contract):\n1. Map the user\'s words to an invoice id; if ambiguous or\n   missing -> ask one clarifying question, never guess.\n2. Call quote_payment for the actual payment date implied.\n3. Reply in <=80 words. Quote amounts EXACTLY as the tool\n   returned them; do not recompute, round or abbreviate.\n4. If the tool returns an error -> relay it plainly, do not\n   substitute a plausible number.',
            },
          ],
          solution:
            'WHY it holds: arithmetic, discount rules and calendar math now execute in functions, so the eleven-rupee class of error cannot occur — exactness came from execution, not effort. The model still does what it is genuinely good at: resolving "the October invoice" to an id, choosing when to quote a payment date, and writing the sentence. The wrong-due-date failure died because weekend rollover lives in code with unit tests; the wrong-total failure died because rule 3 forbids re-derivation — the model narrates results, it does not mint them. This is Lesson 1\'s contract plus execution, and it is the shape most serious LLM features converge on.',
        },
        practice: {
          title: 'Split one of your features at the decides/computes line',
          prompt:
            'Take an LLM feature you use or are building. List every value or action it currently produces. Mark each M (model: needs language) or C (code: exactness or rules). Then redesign: which tool(s) would you register, with which arguments and enum semantics, and which prompt instructions remain after the schema takes the shape work? Report the before/after for the single most dangerous C that is currently an M.',
          hint: 'If you marked arithmetic, dates, sorting or exact lookups as M, you have found your highest-leverage fix.',
        },
        mistakes: [
          {
            mistake: 'Letting the model compute numbers, dates or rankings',
            fix: 'Prediction approximates; functions compute. Model emits intent and arguments, code returns the exact value — and unit tests now cover the part that used to hallucinate.',
          },
          {
            mistake: 'Vague tool descriptions ("handles orders")',
            fix: 'Descriptions are the tool-selection prompt. Write when-to-call and when-NOT-to-call rules, and give every enum value a one-line meaning — otherwise selection becomes guesswork over names.',
          },
          {
            mistake: 'Registering twenty fine-grained tools',
            fix: 'Choice degrades as the action space grows; models drift toward familiar names. Group into a few decision-shaped tools with clear domains, and compose complex work in code between calls.',
          },
          {
            mistake: 'Treating schema validation as authorization',
            fix: 'Typed arguments prove shape, not legitimacy. Validate ids against the caller\'s permissions, confirm destructive calls, and pass least privilege — safety lives outside the schema.',
          },
        ],
        exam: {
          question:
            'Why is a function/tool schema a stronger output contract than "reply with JSON"? Give the decides/computes split for a refund-lookup assistant and three operations that must be code.',
          answer:
            'A tool schema is stronger on four counts: the action space is bounded to registered tools (no invented operations), argument types/required/enums are enforced by the API at an execution boundary, the downstream effect runs in deterministic code rather than generated text, and results return into context for the model to narrate — versus JSON, which only constrains the shape of text with no execution guarantee and nothing preventing invented actions. Decides/computes split for refunds: the model decides (understands the complaint, resolves which order or refund is meant, extracts the reason, picks the tool and arguments, drafts the reply); code computes (looks up the refund record by exact id, applies the refund policy rules, computes amounts and deadlines, checks eligibility windows). Three operations that must be code: any arithmetic (refund totals, pro-rating), date/time math (eligibility windows, SLA deadlines with timezones), and exact lookups or writes (record by id, issuing a refund) — plus sorting/ranking and permission checks. The prompt then carries only meaning: argument semantics, abstention when the reference is ambiguous, and narration of tool results without re-derivation.',
          source: 'Core LLM-system design question; mirrors how production agents are architected.',
        },
        summary: [
          'A tool schema contracts the action space and argument shape, then executes in code — stronger than any text-format promise.',
          'The split: model decides (intent, classification, extraction, narration); code computes (arithmetic, dates, lookups, writes).',
          'Tool descriptions are the selection prompt: write when-to-call and when-not-to-call rules; give enums one-line semantics.',
          'Tools cost tokens and round trips — plain schema output still wins when the model is the final author.',
          'Schema-valid is not authorized or correct: semantic validation and confirmation stay outside the schema.',
        ],
      }),
      [
        [
          'What makes a tool/function schema stronger than "reply in JSON"?',
          [
            'It makes the model more creative',
            'It bounds the action space to registered tools, enforces argument types at the API, and executes results in deterministic code',
            'It guarantees the model will be factually correct',
            'It removes the need for any validation',
          ],
          1,
          'Bounded actions plus enforced arguments plus code execution is a categorically stronger contract than constraining the shape of free text.',
        ],
        [
          'An assistant must calculate an early-payment discount and a due date with weekend rollover. Correct owner:',
          [
            'The model — with instructions to be careful with arithmetic',
            'A pure function; the model supplies invoice id and payment date as arguments',
            'The model at low temperature',
            'Whichever is faster that day',
          ],
          1,
          'Arithmetic and calendar rules are exactly what deterministic code does for free — the model decides and calls, code computes.',
        ],
        [
          'Why do tool descriptions matter as much as prompt instructions?',
          [
            'They are billed at a lower rate',
            'They are the text the model reads when choosing tools and filling arguments — vague descriptions mean guesswork over names',
            'Providers ignore prompt text but read descriptions',
            'They only matter for logging',
          ],
          1,
          'Selection happens by reading descriptions: when-to-call, when-not-to-call and enum semantics live there, so they are prompt engineering in schema clothing.',
        ],
        [
          'Which is NOT a reason to skip tools for a task?',
          [
            'The model is the final author (a summary) and one completion suffices',
            'Tool definitions add input tokens and round trips',
            'The output is stored as a single classified row',
            'You need exact arithmetic performed inside the response',
          ],
          3,
          'Exact arithmetic is the strongest reason to use a tool (or code) rather than generation — the other three describe when plain structured output is the cheaper right choice.',
        ],
      ]
    ),
    lesson(
      M6,
      'pem-6-4',
      4,
      'Validation Loops and Repair Prompts: Making the Contract Hold in Production',
      'A contract without a checker is a wish. Build validator-first pipelines, classify failures by class, repair with a bounded contract that edits minimally, and degrade gracefully when attempts run out.',
      16,
      nineBlocks({
        objectives: [
          'Classify a structured-output failure as syntax, shape or semantic before attempting a fix',
          'Write a validator that checks parse, schema and semantic layers in that order',
          'Compose a bounded repair prompt that includes the exact error and edits minimally',
          'Choose a degradation path (fallback, human queue, loud failure) instead of looping forever',
        ],
        hook:
          'A document pipeline validates every model response and "retries until valid" — three attempts, free-text repair prompt: "Something went wrong, please try again and make sure the JSON is correct." Median cost per document quadruples. One stubborn case burns nine attempts. And the repair keeps rewriting the four fields that were right while fixing one, so nothing downstream can diff the change. Validation without a repair contract is not reliability; it is an expensive coin flip with a compounding bill.',
        concept: `**Validator-first, always.** Write the checker before the prompt, because the checker defines what the prompt must produce and because its error message is the only useful input to a repair. Three layers, checked in order — stop at the first failure:

1. **Syntax layer.** \`JSON.parse\` (or your format's parser) on a defensively pre-processed payload: strip a surrounding markdown fence and a leading label in *code* — deterministic, free, instant — then parse. Fence-stripping is not a repair; it is cleanup, and burning a model call for it is paying for something a regex does in a microsecond.
2. **Shape layer.** Schema check: required keys present, no extra keys, types right, enums inside their domain, array lengths within bounds. If your provider already enforces the schema (Lesson 1), this layer mostly verifies what it enforces — cheap insurance against mode drift and version changes.
3. **Semantic layer.** Value claims: cross-field arithmetic (total equals the sum, discount equals rate times base), ranges (amounts non-negative, dates inside the document's window), existence (cited record ids appear in the dataset you provided), consistency with source (a quoted amount appears verbatim in the text). This layer never goes away, and it is where most surviving failures live.

**Three failure classes, three treatments.** *Syntax failures* (fences, preamble, truncation mid-stream) are handled deterministically where possible — strip, then, if still broken, a repair is justified. *Shape failures* (valid JSON, wrong structure: missing key, string where number belongs, enum misspelled) are the sweet spot for repair prompts: the error is precise and the fix is local. *Semantic failures* (structurally perfect, factually wrong) repair badly through prose — the model has no new information, so a retry is a fresh sample, not a correction. For semantics, re-ask with the source material re-anchored, add the missing constraint upstream, or route to a human; do not expect "fix the errors" to conjure the truth.

**The repair prompt contract.** A repair prompt is not an apology; it is a minimal-edit instruction with three components: (1) the failing output in full, (2) the exact machine error — the validator's own message, verbatim, not your summary of it, and (3) the minimal-edit rule: change only what the error names, preserve every other field byte-for-byte, output raw JSON only. Minimal edits matter for auditability (the diff is reviewable) and for stability (full rewrites re-roll every field, including the ones that passed). Cap attempts — one or two for shape, essentially zero for semantics — because every retry is a new coin flip and a new invoice line.

**Degradation, not loops.** Every loop needs an exit that is not "try again forever": fallback to typed defaults with a flag (\`null, needs_review: true\`), queue the record for a human with the error attached, or fail loudly so the caller decides. Unbounded retries multiply cost, latency and hallucination surface — and they hide upstream problems: a repair loop that fires on 6% of inputs is telling you the prompt needs a constraint or an example, not that you need a fourth attempt.

**Feed failures back.** Every validation error is golden-set material (Module 5, Lesson 4): add the failing input, classify the error, and fix the prompt once for the whole class. The repair loop is the seatbelt; the prompt is the driving.`,
        extras: [
          table(
            'Failure class, detection and first treatment',
            ['Class', 'Detected by', 'First treatment', 'Repair prompt worth it?'],
            [
              ['Syntax', 'Parser rejects payload', 'Strip fence/label in code; then repair', 'Once, if still unparseable'],
              ['Shape', 'Schema check: keys, types, enums', 'Repair prompt with the exact schema error', 'Yes — local, precise, cheap'],
              ['Semantic', 'Value/range/existence checks', 'Re-anchor to source, fix prompt upstream, or human', 'Rarely — a retry is a fresh sample, not a correction'],
            ],
          ),
          code(
            `function check(payload, schema, source) {\n  const text = stripFence(payload);        // deterministic cleanup\n  const data = JSON.parse(text);           // syntax layer\n  const shapeErr = schemaCheck(data, schema);\n  if (shapeErr) return { ok: false, class: "shape",\n                          error: shapeErr.message, data };\n  const semErr = semanticCheck(data, source); // totals, ranges, existence\n  if (semErr) return { ok: false, class: "semantic",\n                        error: semErr.message, data };\n  return { ok: true, data };\n}\n\n// repair: max 1 attempt for shape, 0 for semantic\n// on exhaustion -> { fallback: null, needs_review: true, error }\n// every failure -> append input to the golden set`,
            'validate_and_repair.ts',
            'typescript',
          ),
          tip(
            'Feed the validator its own error message, verbatim',
            'Models repair far better against "required property \'currency\' missing; value must be one of INR|USD|EUR|UNKNOWN" than against "the JSON was wrong".',
          ),
          warn(
            'Bound the loop and name the exit',
            'Unbounded retries multiply cost and let real defects hide behind luck. One or two attempts, then a typed fallback or a human queue — and log the error class so the prompt gets fixed once.',
          ),
        ],
        worked: {
          title: 'Turn a retry-until-lucky pipeline into a bounded repair contract',
          problem:
            'An expense-extraction service parses model JSON for 40,000 receipts a day. Current handling: on any failure, re-prompt with "please return correct JSON". Symptoms: 3.2x cost on failing documents, inconsistent repairs, and no record of what failed or why. Redesign the loop end to end.',
          steps: [
            {
              title: 'Instrument first: classify a week of failures',
              desc: 'Add the three-layer checker and log classes for seven days: 61% syntax (fences and a "Here is the JSON:" preamble), 31% shape (currency given as "Rs." breaking the enum; missing merchant key), 8% semantic (total disagreeing with line items). Only now do you know what to repair — instrumentation precedes repair, always.',
            },
            {
              title: 'Kill the free failures in code',
              desc: 'Strip fences and label preambles deterministically before parsing. One change removes 61% of model calls: those were never model failures, they were missing cleanup.',
              code_snippet:
                'text = payload.trim();\nif (text.startsWith("```")) text = text.replace(/^\\`\\`\\`[a-z]*\\n?/, "").replace(/\\`\\`\\`\\s*$/, "");\nconst label = /^Here is the JSON:?\\s*/i;\ntext = text.replace(label, "").trim();\n// -> parse',
            },
            {
              title: 'BEFORE vs AFTER for the shape failures',
              desc: 'BEFORE (weak): "Please try again and make sure the JSON is correct." — no error, no scope, invites a full rewrite. AFTER: the repair contract — exact error, minimal-edit rule, raw output — capped at one attempt, then a typed fallback so the pipeline keeps moving with a flag rather than a fabricated value.',
              code_snippet:
                'AFTER repair prompt (shape class only):\nThe response below failed validation.\nERROR: currency: expected one of INR|USD|EUR|UNKNOWN,\ngot "Rs."; key "merchant" missing (required, type string).\n\nReturn the SAME object with ONLY those two fields fixed.\nPreserve every other key and value exactly. Raw JSON only.\n\nRESPONSE:\n{...}\n\n// after 1 failed repair ->\n// { ok:false, class:"shape", fallback:{currency:null,\n//   merchant:null, needs_review:true}, error }',
            },
            {
              title: 'Route semantics upstream, close the loop',
              desc: 'Semantic failures (8%) do not get repair prompts: the receipt image or OCR text is re-anchored at the top of a fresh extraction call with the constraint that was violated stated as a rule ("total must equal the sum of line_items; if the document does not print a total, set total to null"). Every failure from all classes lands in the golden set; the two recurring shape errors become schema enum fixes and a prompt line — so next month the loop fires on well under one percent.',
            },
          ],
          solution:
            'Cost per failing document drops from 3.2x retries to one deterministic cleanup plus at most one targeted repair; the diff on repaired records is reviewable because edits are minimal; failures are classified, logged and converted into permanent prompt and schema fixes instead of recurring luck. The pipeline\'s reliability now comes from layers — cleanup, schema, semantics, bounded repair, typed fallback — rather than from hoping the next sample lands. That is what "making the contract hold" means: not that nothing fails, but that every failure class has one named, bounded, cheap response.',
        },
        practice: {
          title: 'Design the checker for your structured prompt',
          prompt:
            'For one prompt that returns structured data: (1) write the three-layer validator (parse, schema, semantic) with at least two semantic checks specific to your data; (2) draft the repair prompt with verbatim error and minimal-edit rule; (3) define the exit — attempts, fallback shape, and where the record goes; (4) list the three most recent real failures and which layer would have caught each.',
          hint: 'If you cannot write two semantic checks, you have not yet decided what "correct" means for this output — that is the real finding.',
        },
        mistakes: [
          {
            mistake: 'Burning model calls to strip fences and preambles',
            fix: 'Deterministic cleanup belongs in code: strip, trim, parse. Reserve repair calls for failures a regex cannot fix.',
          },
          {
            mistake: 'Repair prompts without the exact error or without a minimal-edit rule',
            fix: '"Try again" re-rolls everything; include the validator message verbatim and require unchanged fields to stay byte-identical — fixes stay local and diffs stay reviewable.',
          },
          {
            mistake: 'Running repair loops on semantic failures',
            fix: 'A structurally perfect wrong value gets no new information from a retry. Re-anchor to source, add the violated constraint upstream, or route to a human.',
          },
          {
            mistake: 'Unbounded retries instead of a designed exit',
            fix: 'Cap attempts, define the fallback (null plus flag, human queue, loud error), and log every class — otherwise cost and latency scale with your worst input while defects hide behind eventual luck.',
          },
        ],
        exam: {
          question:
            'Describe a validator-first pipeline for structured output, distinguishing the three failure classes and their treatments. Write the three components of a repair prompt and state when repair should be skipped entirely.',
          answer:
            'Pipeline: check in order and stop at first failure — (1) syntax: deterministic cleanup (strip fence/label in code) then parse; (2) shape: schema check for required keys, types, enums, no extras; (3) semantics: value checks — cross-field arithmetic, ranges, existence of referenced ids, verbatim agreement with source. Classes and treatments: syntax failures are cleaned deterministically and only repaired if still unparseable; shape failures are the repair sweet spot because errors are precise and fixes local; semantic failures get re-anchoring to the source, upstream prompt fixes or human routing, because prose repair has no new information to draw on. Repair prompt components: (1) the failing output in full, (2) the validator\'s exact error message verbatim, (3) a minimal-edit rule — fix only what the error names, preserve all else, raw JSON only. Skip repair when the class is semantic, when the attempt budget (one or two for shape) is exhausted, or when cleanup in code already resolves it; then degrade to a typed fallback with a flag, a human queue, or a loud error — and log every failure into the golden set so the class is fixed once in the prompt rather than repeatedly in the loop.',
          source: 'Production reliability question; the standard discussion of LLM output validation and self-repair.',
        },
        summary: [
          'Validator-first: parse, then schema, then semantics — stop at the first failing layer, and record the class.',
          'Syntax gets deterministic cleanup; shape gets a bounded repair prompt; semantics get re-anchoring or a human.',
          'A repair prompt = failing output + verbatim machine error + minimal-edit rule, capped at one or two attempts.',
          'Every loop exits somewhere: typed fallback with a flag, human queue, or loud failure — never endless retries.',
          'Failures feed the golden set: the loop is the seatbelt, the prompt fix is the driving.',
        ],
      }),
      [
        [
          'Order of checks in a validator-first pipeline:',
          [
            'Semantics, then schema, then parse',
            'Parse (syntax), then schema (shape), then semantic value checks',
            'Schema, then parse, then semantics',
            'Only schema — the provider handles the rest',
          ],
          1,
          'Cheap layers first and stop at the first failure: nothing else matters if the payload does not parse.',
        ],
        [
          'The response parses and matches the schema, but total does not equal the sum of line items. Best response:',
          [
            'Repair prompt asking to fix the JSON',
            'Check the arithmetic in code and re-anchor the extraction to the source (or set null and flag) — prose repair has no new information',
            'Increase the temperature and retry five times',
            'Accept it — the schema passed',
          ],
          1,
          'This is a semantic failure: structurally perfect, factually wrong. Retry-as-repair just re-rolls; fix the anchor or route it.',
        ],
        [
          'Which repair prompt is well-formed?',
          [
            '"Please try again and make sure the JSON is correct."',
            '"Return correct JSON this time — be careful."',
            'Failing output + exact validator error verbatim + "change ONLY the fields named; preserve the rest; raw JSON only"',
            'A new copy of the original task prompt with no error information',
          ],
          2,
          'Repair needs scope (the exact error) and stability (minimal edits) — otherwise each attempt re-rolls every field, including the passing ones.',
        ],
        [
          '6% of inputs trigger a repair attempt every run. What does that primarily indicate?',
          [
            'The model needs a higher token budget',
            'An upstream gap: the prompt or schema is missing a constraint or example for a whole failure class — fix it once instead of retrying forever',
            'That retries should be raised to five',
            'That the validator is too strict and should be disabled',
          ],
          1,
          'A recurring repair rate is a prompt/schema defect signal. Repair is the seatbelt; the permanent fix belongs upstream.',
        ],
      ]
    ),
  ],
};
