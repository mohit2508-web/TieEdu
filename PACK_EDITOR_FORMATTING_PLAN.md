# Pack Editor Content Formatting — Implementation Plan

Status: proposed
Scope: `SectionPackEditor` (7-section study pack) authoring + student rendering
Author context: Capgemini Exceller pack, CTC Package section, showing raw `<br>` and unformatted text

---

## 1. The problem, as reported

Admin-authored pack content does not render as authored. In the CTC Package section the admin sees
literal `<br><br>`, literal `**bold**`, and bullet glyphs (`•`) collapsed into a run-on paragraph.
Nothing formats — not bold, not headings, not highlight.

This is **not** a styling bug in the preview only. The student-facing reader has the same defect, so
students see the same unformatted wall of text. Every pack in the database is affected.

---

## 2. Root cause — three independent defects

### Defect A — the pack read/render path has no markdown pipeline at all

Both the admin live preview and the student reader render pack text as **plain text in a `<p>`**:

| Location | Field | Current code |
| --- | --- | --- |
| `SectionPackEditor.tsx:435` | `overview.companyInfo` | `<p>{...}</p>` |
| `SectionPackEditor.tsx:467` | `topics[].content` | `<p className="whitespace-pre-line">` |
| `SectionPackEditor.tsx:514` | `cheatsheets[].content` | `<div className="whitespace-pre-line">` |
| `CompanyModuleReader.tsx:348` | `overview.companyInfo` | `<p className="text-sky-900">` |
| `CompanyModuleReader.tsx:354` | `overview.eligibility` | `<p className="text-base">` |
| `CompanyModuleReader.tsx:358` | `overview.salaryBreakdown` | `<p className="text-base">` |
| `CompanyModuleReader.tsx:430` | generic section body | `<div className="whitespace-pre-line">` |

`whitespace-pre-line` only honours newlines. It has no concept of `**bold**`, `#` headings, `-` lists,
tables, or `> quotes`. So markdown authored by an admin is displayed literally.

The Q&A path was already fixed — `ContentBuilder.tsx:344` opens `BlockEditorModal`, which uses the
markdown editor and renderer. `SectionPackEditor` is the remaining plain-text holdout:
**12 `<textarea>` elements vs 1 in `ContentBuilder`.**

### Defect B — the pack authoring UI is 12 raw textareas

`SectionPackEditor.tsx` gives the admin a bare `<textarea>` per field. There is no formatting toolbar,
no slash commands, no per-field preview, no word count. The admin cannot produce bold, lists or
headings without hand-typing markdown syntax — and the preview punishes them for it (Defect A), so
even correctly typed markdown looks broken. That is exactly the reported experience.

### Defect C — pasted HTML is stored raw and never normalised

The reported content contains `<br><br>`, `<br>` and `•` glyphs — the signature of a **paste from a
web page or Google Doc**, not of an admin typing markup.

`react-markdown` is configured **without** `rehype-raw`, so raw HTML is escaped and shown literally.
That escaping is deliberate and correct (it is the XSS defence), which means the pipeline must
normalise pasted HTML **on input**, not try to render it on output.

Compounding this, the save endpoint performs no cleanup whatsoever:

```ts
// backend/src/routes/admin.routes.ts:425
module.section_data = req.body || {};
```

No schema check, no length cap, no sanitisation, no HTML normalisation. Whatever arrives is stored
and served to students verbatim.

### Consequence for existing data

Every pack already in the database — including Capgemini — holds the corrupted text. Fixing only the
authoring UI would leave all existing content broken and would silently create **two** rendering
eras. A backfill repair pass is mandatory, not optional.

---

## 3. Field inventory and intended format

Format assignment is per field, driven by how each field is used. Two fields must **stay plain** —
converting them would destroy working formatting.

### 3.1 Rich markdown (GFM + syntax highlight)

| Field | Notes |
| --- | --- |
| `overview.companyInfo` | paragraphs, bold, lists |
| `overview.eligibility` | **current breakage source** — pasted `<br>` list |
| `overview.salaryBreakdown` | **current breakage source** — tier headings + per-tier detail |
| `overview.reviews[].text` | light markdown only |
| `core_subjects[].topics[].content` | topic explanation, the main study text |
| `core_subjects[].topics[].pyqs[].question` | |
| `core_subjects[].topics[].pyqs[].answer` | high value: needs code fences, lists, tables |
| `interview_questions[].question` | |
| `interview_questions[].solution` | high value: needs code fences, steps, complexity |
| `never_skip_topics[].notes` | |
| `hr_round[].question` | |
| `hr_round[].answer` | STAR answers — headings and bold emphasis matter |

### 3.2 Real lists (string arrays rendered as `<ul>`, not inline text)

| Field | Current problem |
| --- | --- |
| `last_minute_revision[].points` | array joined into text; must be a real bullet list |
| `hr_round[].tips` | same |

### 3.3 Must remain PLAIN / preformatted — do not convert

| Field | Reason |
| --- | --- |
| `cheatsheets[].content` | `SectionPackEditor.tsx:244` and `CompanyModuleReader.tsx:546` are both `font-mono`. Admins paste ASCII tables and aligned complexity charts. Markdown reflow would destroy column alignment. Keep `whitespace-pre-line` + monospace. |
| `interview_questions[].code` | `CompanyModuleReader.tsx:507` already renders `<pre>{q.code}</pre>` in a dark block with a working copy button. Untouched. |

### 3.4 Labels — plain, single-line

`overview` keys, `core_subjects[].subject`, `topics[].title`, `cheatsheets[].title`,
`cheatsheets[].summary`, `interview_questions[].title`, `never_skip_topics[].topic`,
`last_minute_revision[].title`. Keep as inputs, not editors. Only `cheatsheets[].summary` earns
inline markdown for emphasis.

---

## 4. Solution architecture

Reuse what already exists and is tested. No new markdown stack, no new dependency.

```
                    ┌─────────────────────────────────────┐
  admin pastes      │  normaliseRichText()  (NEW, pure)   │
  HTML / writes ───►│  <br>→\n, <p>→blank line,           │
                    │  <b>/<strong>→**, <li>→-,            │
                    │  &nbsp;/• handled, tags stripped    │
                    └──────────────┬──────────────────────┘
                                   ▼
                    ┌─────────────────────────────────────┐
                    │  MarkdownEditor  (EXISTS, 23 tests) │  toolbar, slash menu,
                    │  toolbar + slash cmds + draft cache │  undo/redo, word count
                    └──────────────┬──────────────────────┘
                                   ▼
                            store as markdown
                                   ▼
                    ┌─────────────────────────────────────┐
                    │  normaliseRichText() on save (API)  │  defence in depth
                    └──────────────┬──────────────────────┘
                                   ▼
                    ┌─────────────────────────────────────┐
                    │  MarkdownContent  (EXISTS)          │  ONE config for
                    │  remark-gfm + rehype-highlight      │  preview AND reader
                    └─────────────────────────────────────┘
```

Non-negotiable: **one** markdown configuration. The live preview must be the student view, or the
admin is again authoring blind. `MarkdownContent` is already that single config, and the admin
preview must route through it rather than through its own markup.

### 4.1 New file: `frontend/src/lib/richText.ts`

Pure functions, no React, fully unit-testable:

- `normaliseRichText(input: string): string` — paste repair. `<br>`/`<br/>`/`<br />` → newline;
  `<p>`/`<div>` → paragraph breaks; `<b>`/`<strong>` → `**`; `<i>`/`<em>` → `*`;
  `<li>` → `- `; `<h1..h6>` → `#`×n; strip remaining tags; decode `&nbsp;` `&amp;` `&lt;` `&gt;`
  `&quot;`; collapse 3+ blank lines to 2; trim.
- `looksLikeHtml(input: string): boolean` — cheap `<tag` heuristic, so the normaliser can skip
  already-clean markdown and never mangle it.
- `richTextToPlainText(input: string): string` — for meta description, compare views, search
  indexing, and PDF text extraction.
- `RICH_TEXT_MAX = 20000` — per-field cap matching `MAX_TEXT_LENGTH` in the study-plan lib.

Apply `normaliseRichText` on **paste** inside `MarkdownEditor` (before it hits the textarea) and again
on the **API save path** (so data arriving by any other route is still cleaned).

### 4.2 Reused as-is

- `MarkdownEditor` — props `value`, `onChange`, `placeholder`, `minHeight`, `draftKey`, `ariaLabel`.
  Already: formatting toolbar, slash menu, undo/redo, localStorage draft recovery, list continuation,
  word/read-time footer. No prop changes needed.
- `MarkdownContent` — props `children`, `className`, `compact`. Already: GFM, syntax highlight,
  safe links/images, task lists, tables. No prop changes needed.

### 4.3 Explicitly rejected

- **Enabling `rehype-raw`** to make pasted `<br>` work. It would render unsanitised admin HTML for
  every student. The `<br>` problem is an input problem.
- **A new markdown editor / WYSIWYG library (TipTap, etc.)**. Two editors in one codebase is the
  inconsistency that caused this bug.
- **`turndown` or `sanitize-html` dependency.** The input is a narrow, known shape (mostly `<br>`,
  `<p>`, `<b>`, `<li>`, entities). A small tested normaliser is smaller, auditable and dependency-free.

---

## 5. Phases

### Phase 1 — one renderer, applied everywhere (highest impact, lowest risk)

Stop the bleeding. Rendering fix only, no authoring UX change, so student-visible text improves
immediately.

1. `CompanyModuleReader.tsx` — route the §3.1 fields through `MarkdownContent`; render §3.2 arrays
   as real `<ul>`; leave §3.3 untouched.
2. `SectionPackEditor.tsx` `PackPreview` — same substitution, so the admin preview becomes a true
   mirror of the student view.
3. Keep existing heading/card chrome; swap only the inner text nodes. Tailwind typography classes on
   `.prose-article` (added for the study-plan work) already style GFM output.

**Done when:** the Capgemini CTC Package shows bold tier names, a real bullet list for eligibility,
and no visible `<br>` — in both the admin preview and the student page.

### Phase 2 — paste repair + authoring UX

1. `richText.ts` + `richTextToPlainText` (pure, tested first).
2. `MarkdownEditor` — normalise on paste.
3. `SectionPackEditor.tsx` — swap the 12 textareas: §3.1 → `MarkdownEditor`; §3.2 → one "add point"
   row per item (no editor needed); §3.3 keep a `font-mono` textarea; §3.4 keep single-line inputs.
4. Per-field preview toggle for long fields; unsaved-draft indicator per field via the existing
   `draftKey` mechanism.
5. Guard rails in the pack editor: per-section fill count, character counter with cap warning,
   a paste hint ("pasting from a web page? formatting is cleaned automatically").

**Done when:** an admin can add a CTC tier with bold headings, a bulleted eligibility list and a
highlighted note without typing a single markdown character, and see it correctly in preview.

### Phase 3 — backend hardening

`PUT /api/admin/modules/:id/section` (`admin.routes.ts:425`) currently stores `req.body` verbatim.
Replace with:

- per-field `normaliseRichText` + `RICH_TEXT_MAX` cap;
- schema validation — every field is a string, string array or object; unknown keys dropped;
- array length caps (`points`, `tips`, `pyqs`, `reviews`);
- audit entry, consistent with the study-plan routes;
- reject non-object bodies with 400 instead of coercing to `{}`.

Mirror the normaliser in `backend/src/lib/richText.ts`. Share one test fixture across both so the two
implementations cannot drift.

### Phase 4 — backfill repair of existing packs

The only phase that fixes content already in the database.

1. One-time script `backend/scripts/repair-pack-content.ts` — walks every `module.section_data`,
   applies `normaliseRichText` to §3.1 fields, converts `<br>` runs, **skips** §3.3.
2. Idempotent: re-running on clean data is a no-op.
3. Dry-run mode printing a per-module diff and a count of changed fields.
4. Safety: writes to a timestamped backup of `db.json` first, and refuses to run without `--apply`.
5. Report afterwards: modules scanned, fields changed, `<br>` occurrences removed.

**Done when:** Capgemini and every other existing pack render correctly with no manual re-entry.

---

## 6. Tests

| Suite | Location | Coverage |
| --- | --- | --- |
| `richText.test.ts` | `frontend/scripts/` | `<br>`, `<p>`, `<b>`, `<li>`, `<h*>`, entities, `&nbsp;`, unicode, already-clean markdown untouched, idempotence, cap |
| `pack-content.test.ts` | `backend/scripts/` | API validation: type rejection, caps, unknown-key drop, normalisation applied, 400 on bad body |
| `repair.test.ts` | `backend/scripts/` | backfill correctness, idempotence, dry-run writes nothing, skips preformatted fields |
| shared fixture | both | one JSON file asserted against by both implementations |

Naming follows the existing convention: `backend/scripts/study-plan.test.ts`,
`frontend/scripts/editor-actions.test.ts`. No test framework migration.

---

## 7. Acceptance criteria

1. `**bold**`, `#` headings, `-`/`1.` lists, GFM tables, `> quotes`, fenced code and task lists all
   render in every §3.1 field, for students and in the admin preview.
2. Zero visible `<br>`, `&nbsp;` or `<b>` anywhere in rendered pack content.
3. `cheatsheets[].content` column alignment unchanged; `interview_questions[].code` copy button still
   works.
4. Pasting a web page into any rich field produces clean markdown with no manual cleanup.
5. An admin can produce formatted content using only toolbar buttons — no markdown typing required.
6. Admin preview and student page are pixel-identical for the same data.
7. Section fill counts, character caps and save-time validation behave consistently.
8. Existing packs render correctly after the backfill, with no manual re-entry.
9. All new tests pass; `tsc --noEmit` clean in both `frontend` and `backend`.

---

## 8. Risks

| Risk | Mitigation |
| --- | --- |
| ASCII cheatsheets break if converted to markdown | §3.3 frozen as plain. Enforced by tests asserting the field is not routed through `MarkdownContent`. |
| Backfill mangles good content | Idempotent normaliser, dry-run diff, timestamped `db.json` backup, refuse without `--apply`. |
| Preview/reader drift reappears | Both must import the same `MarkdownContent`; add a test asserting both call sites use it. |
| Normaliser duplicated in FE and BE drifts | One shared fixture asserted by both test suites. |
| Two editors in one codebase | `MarkdownEditor` and `MarkdownContent` are the only markdown path; the pack editor reuses them rather than adding a third. |
| Scope creep into other admin editors | Audit: `ContentBuilder` (Q&A) already uses `BlockEditorModal`. `SectionPackEditor` is the only plain-text holdout. |

---

## 9. Effort

| Phase | Content | Estimate |
| --- | --- | --- |
| 1 | Rendering substitution, ~9 call sites | 1–1.5 h |
| 2 | `richText.ts` + paste hook + 12 textarea swap | 3–4 h |
| 3 | Save-path validation + audit | 1.5–2 h |
| 4 | Backfill script + dry run + apply | 1–1.5 h |

**Total ≈ 7–9 h.** Phases 1 and 4 are the ones that make existing content correct; phase 2 is what
stops the problem recurring.

---

## 10. File map

**New**
- `frontend/src/lib/richText.ts`
- `backend/src/lib/richText.ts`
- `backend/scripts/repair-pack-content.ts`
- `frontend/scripts/richText.test.ts`
- `backend/scripts/pack-content.test.ts`
- `backend/scripts/repair.test.ts`

**Modified**
- `frontend/src/components/company/CompanyModuleReader.tsx` — student render
- `frontend/src/components/admin/SectionPackEditor.tsx` — preview + authoring
- `frontend/src/components/editor/MarkdownEditor.tsx` — normalise on paste
- `backend/src/routes/admin.routes.ts` — `PUT /modules/:id/section` validation

**Reused unchanged**
- `frontend/src/components/blocks/MarkdownContent.tsx`
- `frontend/src/components/editor/MarkdownEditor.tsx` (props unchanged)
