# Study Plan Management System — Implementation Plan

Status: Proposed
Scope: Admin authoring, rich content, student rendering, desktop + mobile
Primary complaint: *"Admin ke content add karne pe bullet points vagera nahi aate. Acha sa editor milna chahiye, na ki normal. Content proper dikhna chahiye. Desktop aur mobile dono excellent."*

---

## 1. Diagnosis — verified root causes

All findings below were confirmed by reading the source and by rendering `react-markdown` v9 server-side to compare output with and without `remark-gfm`.

### RC-1 — Study plan content is hardcoded on the server (no CMS at all)

`backend/src/routes/gamification.routes.ts:50-71` returns a fixed 4-element array. The only use of the user's input is string interpolation, plus one cosmetic label:

```ts
{ day: `Day 12–${days}`, ... }   // daysRemaining changes a label, nothing else
```

There is no database read, no admin CRUD, no persistence, and no state — the same 4 items are returned for every user, every company, every timeline. `grep` across the repo returns **zero** admin-side references to study plans.

Consequence: there is currently nothing for an admin to manage. The admin surface must be built, not merely fixed.

### RC-2 — Study plan `detail` is rendered as plain text (direct cause of missing bullets)

`frontend/src/pages/study-plan.tsx:160`

```tsx
<p className="text-xs text-[#4A4A4A] leading-relaxed">{item.detail}</p>
```

No markdown pipeline is involved at all. Any list syntax stored in `detail` appears literally as `- item`. This is the single most direct cause of the reported symptom on the study-plan screen.

### RC-3 — GFM is installed but never wired into the renderer

`frontend/src/components/blocks/ContentBlockRenderer.tsx:138`

```tsx
<ReactMarkdown>{payload.text || ''}</ReactMarkdown>
```

`frontend/package.json` already ships `remark-gfm@^4.0.1` and `rehype-highlight@^7.0.2`. Neither is imported anywhere in the codebase.

Measured output difference on identical input:

| Markdown feature | Current behaviour | With `remark-gfm` |
| --- | --- | --- |
| `- bullet` | renders `<ul><li>` | renders `<ul><li>` |
| `1. ordered` | renders `<ol><li>` | renders `<ol><li>` |
| Pipe table | **raw pipe text in a `<p>`** | `<table><thead><tbody>` |
| `- [ ]` task list | **literal `[x]` / `[ ]` text** | `<input type="checkbox">` |
| `~~strike~~` | **literal tildes** | `<del>` |
| Bare URL | **plain text** | `<a href>` |
| Fenced code block | no highlighting | highlighted |

Basic bullets and ordered lists *do* work (they are CommonMark core), which is why the failure looks inconsistent — content authored with tables or checklists silently degrades.

Note the striking part: `frontend/src/styles/globals.css` **already contains complete styles** for `.prose-article table`, `.prose-article del`, `.prose-article li::marker`, and `.prose-article input[type="checkbox"]` (commented *"Checkbox list items (GFM task lists)"*). The CSS author clearly intended GFM. The plugin was simply never connected, so the styling is dead code.

### RC-4 — The admin editor is a bare textarea

`frontend/src/components/modals/BlockEditorModal.tsx:248-261` is a raw `<textarea>` with a monospace font and a markdown placeholder. No toolbar, no formatting buttons, no slash commands, no list affordances. An admin must remember markdown syntax by hand and cannot see structure while typing. This is the *"normal editor"* the user is rejecting.

### RC-5 — Reusable block infrastructure already exists (the leverage point)

This is the most important finding for scoping. A complete content-block CMS is already built and battle-tested:

- `backend/src/data/db.ts` — `ContentBlockRecord { id, block_type, block_order, payload }`
- `backend/src/routes/admin.routes.ts:452-537` — full block CRUD **and reorder**:
  `POST /items/:itemId/blocks`, `PUT .../blocks/:blockId`, `DELETE .../blocks/:blockId`, `POST .../blocks/reorder`
- `frontend/src/components/modals/BlockEditorModal.tsx` — block-type picker + live student preview
- `frontend/src/components/blocks/ContentBlockRenderer.tsx` — renders 8 block types, already handles paywall locking

`backend/src/data/db.json` is a JSON file store (`DB_FILE` at `db.ts:240`, read/written via `fs`).

**Strategic consequence:** the study plan should adopt the *existing* `ContentBlockRecord` shape and reuse `ContentBlockRenderer` verbatim. This means zero duplication of the renderer, zero content-format migration, and the paywall/lock logic keeps working. The plan should extend the block system, never fork it.

### RC-6 — Endpoint is unauthenticated

`gamificationRouter.post('/study-plan', ...)` has no `requireAuth`, so plans are anonymous and shareable but cannot be personalised per user or track progress. This constrains Phase 3 and must be resolved deliberately, not accidentally.

---

## 2. Goals and non-goals

### Goals
1. Admin can author study-plan content in a real editor with effortless lists, headings, checklists, tables, code, callouts and diagrams.
2. What the admin writes is what the student sees — byte-faithful, no silent degradation.
3. Admin can create, edit, reorder, publish and archive plan templates without touching code.
4. Plans can be personalised per user (company, role, interview date) and track completion.
5. Excellent, genuinely usable layouts on desktop **and** mobile, in both the admin editor and the student view.
6. Reuse `ContentBlockRecord` + `ContentBlockRenderer` rather than building a parallel content system.

### Non-goals
1. Migrating existing module/block content — the format is unchanged by design.
2. Replacing the JSON file store with a real database. That is a separate, larger initiative.
3. A general-purpose page-builder/DMS. Study plans get a focused editor, not a canvas.
4. Real-time collaborative editing.

---

## 3. Editor strategy — decision and rationale

Three options were considered.

| Option | UX | Migration cost | Risk | Verdict |
| --- | --- | --- | --- | --- |
| **A. Markdown editor + formatting toolbar + live preview** | Good | **Zero** — keeps `payload.text` markdown | Low | **Recommended** |
| B. WYSIWYG (TipTap/ProseMirror) | Best | High — forces HTML storage | High | Rejected for now |
| C. Notion-style block editor | Best | Medium | Very high | Rejected |

**Recommendation: Option A.**

Rationale:
- Storage stays markdown, so all existing module content renders unchanged and no migration is required.
- `ContentBlockRenderer` is reused directly for the live preview, guaranteeing preview/reader parity — the same component, so what admin previews *is* what students get.
- Toolbar buttons insert syntax (`**bold**`, `- `, `1. `, `- [ ] `, `| a | b |`) so the admin never types syntax by hand. This directly answers *"mehanat lage"*.
- Slash-command menu (`/heading`, `/table`, `/callout`, `/code`) gives Notion-like speed without a canvas rebuild.
- Works acceptably on mobile with a scrollable toolbar, which option B would also require significant extra work to match.

Option B is genuinely better *eventually*. It is rejected now only because it would require converting every existing `markdown` block from markdown to HTML and would fork the renderer. If a future phase wants B, it should be introduced as an additional `block_type` (e.g. `rich_text`), not a migration of `markdown`.

---

## 4. Target data model

New interfaces in `backend/src/data/db.ts`. Block payload deliberately reuses `ContentBlockRecord`.

```ts
export interface StudyPlanTemplate {
  id: string;
  title: string;
  slug: string;
  company_id: string | null;      // null => generic plan
  role: string | null;            // null => any role
  status: 'draft' | 'published' | 'archived';
  version: number;
  created_at: string;
  updated_at: string;
  updated_by: string;
}

export interface StudyPlanPhase {
  id: string;
  template_id: string;
  phase_order: number;
  title: string;
  day_from: number;
  day_to: number | null;          // null => open-ended
  summary: string;
  blocks: ContentBlockRecord[];   // reuse existing shape
}

export interface StudyPlanEnrollment {
  id: string;
  user_id: string;
  template_id: string | null;
  target_company: string;
  target_role: string;
  interview_date: string;
  total_days: number;
  source: 'template' | 'fallback';
  generated_at: string;
}

export interface StudyPlanPhaseProgress {
  id: string;
  enrollment_id: string;
  phase_id: string;
  completed: boolean;
  completed_at: string | null;
}
```

Registering a new collection requires a reader/writer in `db.ts` following the existing `fs.readFileSync` / `fs.writeFileSync` pattern, and an entry in the `initialDbData` bootstrap (around `db.ts:1153-1195`).

**Backward compatibility:** `RoadmapItem` stays as a deprecated alias so the current page and API keep working during rollout:

```ts
export interface RoadmapItem {
  day: string;
  focus: string;
  detail: string;   // retained; superseded by StudyPlanPhase.blocks
}
```

---

## 5. API surface

### Admin (mounted under `/api/admin`, already protected by `requireAdmin` in `server.ts`)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/admin/study-plans` | List templates, filter by status/company |
| GET | `/api/admin/study-plans/:id` | Fetch template with phases + blocks |
| POST | `/api/admin/study-plans` | Create template |
| PUT | `/api/admin/study-plans/:id` | Update template metadata |
| DELETE | `/api/admin/study-plans/:id` | Delete (soft-archive preferred) |
| POST | `/api/admin/study-plans/:id/phases` | Add phase |
| PUT | `/api/admin/study-plans/:id/phases/:phaseId` | Update phase |
| DELETE | `/api/admin/study-plans/:id/phases/:phaseId` | Remove phase |
| POST | `/api/admin/study-plans/:id/phases/reorder` | Reorder phases |
| POST | `/api/admin/study-plans/:id/phases/:phaseId/blocks` | Add block to phase |
| PUT | `/api/admin/study-plans/:id/phases/:phaseId/blocks/:blockId` | Update block |
| DELETE | `/api/admin/study-plans/:id/phases/:phaseId/blocks/:blockId` | Delete block |
| POST | `/api/admin/study-plans/:id/phases/:phaseId/blocks/reorder` | Reorder blocks |

This deliberately mirrors the proven `items/:itemId/blocks` routes at `admin.routes.ts:452-537` so the implementation is copy-adapt, not invention.

### Student

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/study-plan/generate` | optional | Generate plan (public fallback preserved) |
| GET | `/api/study-plan/enrollment` | required | Current user's plan + progress |
| PUT | `/api/study-plan/enrollment` | required | Save target company/role/date |
| PUT | `/api/study-plan/enrollment/phases/:phaseId` | required | Toggle phase completion |
| GET | `/api/study-plan/templates` | public | Browse published templates |

**Route migration note:** the current endpoint is `POST /api/gamification/study-plan` (the comment at `gamification.routes.ts:42` says `/api/study-plan`, which is wrong — the router is mounted at `/api/gamification`). Moving it to a dedicated `studyPlan.routes.ts` mounted at `/api/study-plan` improves clarity. `api.ts:464` must be updated, and a deprecated alias should be kept for one release so no client breaks.

---

## 6. Phased execution plan

### Phase 0 — Rendering fixes (highest impact, ~5 lines, ship first)

Do this immediately and independently. It resolves the reported symptom at near-zero risk and should be verified before any larger work begins.

**0.1 Wire GFM + syntax highlighting** — `frontend/src/components/blocks/ContentBlockRenderer.tsx:134-141`

```tsx
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
```

```tsx
<div className="prose-article">
  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
    {payload.text || ''}
  </ReactMarkdown>
</div>
```

Also applies to the markdown rendering inside `BlockEditorModal`'s preview, which goes through the same renderer.

**0.2 Render study-plan `detail` as markdown** — replace the plain `<p>` at `study-plan.tsx:160` with a shared markdown component.

Create `frontend/src/components/blocks/MarkdownContent.tsx`:

```tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

export const MarkdownContent: React.FC<{ children: string; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`prose-article ${className}`}>
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
      {children || ''}
    </ReactMarkdown>
  </div>
);
```

Then use it in `ContentBlockRenderer` and in `study-plan.tsx` so there is exactly **one** markdown configuration in the codebase. Divergence between editor preview and student view is precisely the class of bug being fixed, so a single shared component is the safeguard.

**0.3 Add prose styles for the newly-live elements**

Confirm `.prose-article` covers `ul/ol/li/table/del/checkbox/task-list-item`; add `.contains-task-list` list padding and responsive font sizing. Tailwind typography is **not** installed (`tailwind.config.js` has `plugins: []`), so all prose styling must remain hand-written CSS — do not assume `prose-*` utility classes work.

**0.4 Verification**
- Table, task list, strikethrough, and bare URL render correctly on `/study-plan` and in a company module.
- Editor live preview matches student output exactly.
- `npx tsc --noEmit` passes.
- Regression check on existing seeded markdown content.

### Phase 1 — Rich editor (the core ask)

**1.1 `frontend/src/components/editor/MarkdownEditor.tsx`** (new)

- Textarea bound to markdown source, monospace, no syntax-to-asterisk translation.
- Formatting toolbar: H1/H2/H3, bold, italic, strikethrough, inline code, blockquote, hr.
- List controls: bullet, ordered, task list, indent/outdent.
- Insert controls: table (2x2 scaffold), code fence with language picker, link, image, callout, Mermaid diagram.
- Every button wraps or prefixes the current selection — the admin never types syntax.
- Tab inserts two spaces; Enter continues list markers.
- Undo/redo, and character/word count.

**1.2 `frontend/src/components/editor/EditorToolbar.tsx`** (new)

- Grouped, labelled controls with tooltips and `aria-label` on every button.
- Active-format state derived from the current selection.
- Collapses to a horizontally scrollable strip on small screens with a "More" overflow group.

**1.3 Slash-command menu** — `frontend/src/components/editor/SlashMenu.tsx` (new)

Triggered by `/` at the start of an empty line; fuzzy search over block types and heading levels; keyboard navigable (arrows, Enter, Escape).

**1.4 Wire into `BlockEditorModal.tsx`**

Replace the raw `<textarea>` at lines 248-261 with `MarkdownEditor`. Keep the existing live preview (lines 276-287) but render it through `MarkdownContent`/`ContentBlockRenderer` so preview parity is structural, not incidental.

**1.5 Extend block types**

Add a `checklist` block type for task-style phases, which is more useful for a study plan than raw markdown task lists. Add `resources` (link list with labels) for further reading. Extend `BlockType` in `frontend/src/types/index.ts` and `ContentBlockRecord.block_type` in `db.ts` to match, keeping both unions in sync.

**1.6 Editor quality bar**
- Autosave draft to `localStorage`; restore on reopen after a crash or accidental close.
- Character limit with a visible counter; warn on paste of very large content.
- Paste sanitiser: strip pasted styles/classes, keep text and list structure.
- Word count and reading time.
- Explicit unsaved-changes guard on close.

### Phase 2 — Study plan admin CRUD

**2.1 Backend** — new `backend/src/routes/studyPlan.routes.ts`; register the admin sub-router in `admin.routes.ts` following the `items/:itemId/blocks` pattern exactly.

- Validate and normalise `block_order` and `phase_order` on every write.
- Enforce phase ordering integrity after reorder (contiguous sequence, no gaps or duplicates).
- Validate `day_from`/`day_to` coherence (`day_to >= day_from`, or `null`).
- Reject unknown `block_type` values; validate payload shape per type.
- Sanitise markdown input server-side. Do not rely on client sanitisation.
- Write an audit record on create/update/delete, reusing the existing `/api/admin/audit` pattern (`admin.routes.ts:829`).

**2.2 Admin UI** — new `frontend/src/pages/admin/study-plans.tsx` plus components

- Template list: title, company, role, status, phase count, updated timestamp. Filter and search.
- Template editor: metadata form (title, company, role, status) with slug preview.
- Phase manager: add, rename, reorder (drag or up/down), delete, set day range.
- Per-phase content: `MarkdownEditor` + block list, matching `ContentBuilder`'s interaction model for consistency.
- Draft vs published with an explicit publish action and a preview-before-publish view.
- Optimistic UI with rollback on failure; visible saving/saved/error state.

**2.3 Replace the hardcoded generator**

Rewrite `gamification.routes.ts:42-79` to resolve content in priority order:

1. An exact published template matching `company_id` **and** `role`.
2. A published template matching `company_id` only.
3. A published generic template (both null).
4. The existing hardcoded array as a last-resort fallback, so the endpoint can never return an empty plan.

Match by normalised company name when no `company_id` is available. Every response should carry `source` and `template_id` so the UI can be honest about what it is showing. **The hardcoded roadmap must stay as the fallback** until seeded templates exist, otherwise the page breaks for every company on day one.

### Phase 3 — Personalisation and progress

- Move generation behind `requireAuth` for the enrolled flow, while keeping an anonymous public preview path so the marketing page still works without login.
- Accept an actual `interview_date`; compute `total_days` from today server-side. Never trust a client-supplied `daysRemaining` for anything but display.
- Scale phases to the real window: if there are 45 days, expand templates or add a "consolidation" phase instead of stretching 4 items across 45 days.
- Persist `StudyPlanEnrollment`; add a resume banner so a returning student lands on their existing plan rather than regenerating.
- Add phase completion toggles with optimistic updates, and a server-computed progress percentage.
- Emit telemetry: generate, resume, phase complete, plan complete. Reuse the existing telemetry approach if one exists.

### Phase 4 — Responsive and polish

**Student view (`study-plan.tsx`)** — currently a 2-column grid of plain cards with `text-xs` body copy.

- Desktop: left rail for plan summary/progress, main column for the timeline; phase cards with a vertical connector and day-range chips.
- Mobile: single column; sticky compact progress bar; each phase an accordion (collapsed shows title, day range, completion state); full-width tap targets ≥44px; safe-area insets for notched devices.
- Typography: body copy ≥16px on mobile (current `text-xs` is roughly 12px and fails accessibility guidance). Headings must scale, not clip.
- Progress: ring or bar plus "3 of 8 phases complete", colour plus icon so it does not rely on colour alone.
- Empty, loading, and error states that are designed rather than bare text.
- Deep-link to a phase (`#phase-3`) so progress can be shared or bookmarked.

**Admin editor**

- Desktop: side-by-side editor and preview with a draggable splitter.
- Mobile: tabbed Editor/Preview switch; the toolbar scrolls horizontally; the primary save action sticks to the bottom within thumb reach; no horizontal page scroll at 360px.
- Undo/redo and keyboard shortcuts on desktop; large tap targets and a bottom sheet for insert menus on mobile.

**Cross-cutting**
- Keyboard navigation and visible focus rings throughout; ARIA roles on accordions and tab lists.
- Respect `prefers-reduced-motion`.
- Verify at 360px, 390px, 768px, 1280px, and 1920px.

---

## 7. Security

- All admin routes stay behind the existing `requireAdmin` middleware in `server.ts`.
- Server-side markdown sanitisation; never trust the client. Sanitise on write *and* defensively on read.
- Escape or validate all user-supplied strings in generated plan output.
- Reject oversized payloads at the route boundary.
- Rate-limit the public generate endpoint so it cannot be used as a free compute oracle.
- Enforce ownership on enrollment and progress routes — a user must never read or mutate another user's plan.
- Keep audit entries for every template mutation.

## 8. Testing strategy

| Layer | Tooling | Coverage |
| --- | --- | --- |
| Backend | `npx tsc --noEmit -p tsconfig.json` | Type safety, as established previously |
| Frontend | `npx tsc --noEmit` | Type safety, as established previously |
| Build | `npm run build` | Production build passes |
| Markdown | Unit test on `MarkdownContent` | Bullets, ordered lists, tables, task lists, strikethrough, autolinks, fenced code |
| Parser | Unit test on editor toolbar actions | Each button produces the intended markdown |
| API | Integration per endpoint | CRUD, reorder integrity, validation rejections, authz enforcement, ownership |
| E2E | Manual plus scripted browser pass | Admin author → publish → student generate → render → toggle progress |
| Visual | Manual breakpoint sweep | 360/390/768/1280/1920, both viewports, editor and student |

Regression guard worth adding permanently: assert that a fixture containing every supported markdown construct renders identically in the editor preview and the student view.

## 9. Rollout

1. Ship Phase 0 alone. It is low-risk, independently valuable, and immediately resolves the reported symptom. Verify in production before proceeding.
2. Ship Phase 1 (editor) — improves all block authoring, company modules included, not only study plans.
3. Ship Phase 2 behind an admin-only flag; seed 2–3 templates while the hardcoded fallback stays live.
4. Enable personalised plans for internal accounts, then progressively.
5. Remove the hardcoded roadmap only after real usage data shows fallback rate near zero.

Keep the deprecated `POST /api/gamification/study-plan` alias for one release.

## 10. Acceptance criteria

Phase 0:
- [ ] Tables, task lists, strikethrough, and bare URLs render as real elements, not literal text
- [ ] Fenced code blocks are syntax highlighted
- [ ] Study-plan `detail` renders markdown, so `- item` becomes a visible bullet
- [ ] Editor preview and student view are byte-identical

Phase 1:
- [ ] Admin can create a bulleted, numbered, and checklist list using only toolbar buttons
- [ ] Slash menu inserts headings, tables, code, and callouts
- [ ] Editor is fully usable at 360px width with no horizontal page scroll
- [ ] Draft survives an accidental close and reload

Phase 2:
- [ ] Admin can create, edit, reorder, publish, and archive a plan template without code changes
- [ ] Content added by admin appears on the student page unchanged
- [ ] Reorder operations produce a contiguous, gap-free sequence
- [ ] Invalid input is rejected with a clear message
- [ ] Endpoint never returns an empty plan for any company

Phase 3:
- [ ] Progress persists across devices for the same account
- [ ] One user cannot read or modify another user's plan
- [ ] A 45-day window produces a sensibly scaled plan, not 4 stretched items

Phase 4:
- [ ] Student body copy is ≥16px on mobile
- [ ] All tap targets ≥44px
- [ ] Progress is perceivable without relying on colour
- [ ] No horizontal overflow at any supported breakpoint

## 11. Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Removing the hardcoded roadmap breaks the page for uncovered companies | High | Keep it as a tier-4 fallback until fallback rate is near zero |
| Markdown sanitiser strips legitimate formatting, or XSS slips through | High | Sanitise server-side on write and read; explicit security tests |
| A second markdown config diverges from the first | Medium | Single shared `MarkdownContent` component; parity test |
| Scope creep from "editor" into a full page builder | Medium | Fixed block-type set; no canvas, no drag-drop page layout in this phase |
| JSON file store write contention as plans grow | Medium | Serialise writes in `db.ts`; flag as separate DB migration initiative |
| Editor too heavy on low-end mobile | Low | Lazy-load syntax highlighting; virtualise long block lists |
| Phase 2 delays Phase 0 value | Medium | Ship Phase 0 independently and first |

## 12. File-by-file change map

**New — backend**
- `backend/src/routes/studyPlan.routes.ts`
- `backend/src/lib/studyPlanTemplates.ts` — resolution/priority logic
- `backend/src/data/db.ts` — add interfaces, collections, bootstrap entries

**Modified — backend**
- `backend/src/routes/admin.routes.ts` — mount study-plan admin sub-router
- `backend/src/routes/gamification.routes.ts` — delegate to template resolver, keep fallback
- `backend/src/server.ts` — mount `/api/study-plan`, add `requireAuth` to enrolled routes

**New — frontend**
- `frontend/src/components/blocks/MarkdownContent.tsx` — single markdown config
- `frontend/src/components/editor/MarkdownEditor.tsx`
- `frontend/src/components/editor/EditorToolbar.tsx`
- `frontend/src/components/editor/SlashMenu.tsx`
- `frontend/src/pages/admin/study-plans.tsx`
- `frontend/src/components/admin/StudyPlanPhaseEditor.tsx`

**Modified — frontend**
- `frontend/src/components/blocks/ContentBlockRenderer.tsx` — GFM wiring, use `MarkdownContent`
- `frontend/src/components/modals/BlockEditorModal.tsx` — replace textarea with `MarkdownEditor`
- `frontend/src/pages/study-plan.tsx` — markdown rendering, phase timeline, progress, responsive
- `frontend/src/lib/api.ts` — new endpoints, update `generateStudyPlanApi` (line 464)
- `frontend/src/types/index.ts` — new types, extend `BlockType`
- `frontend/src/styles/globals.css` — task-list, table, responsive prose rules

## 13. Effort estimate

| Phase | Relative effort | Notes |
| --- | --- | --- |
| 0 — Rendering fixes | XS | Highest value per line changed; do first |
| 1 — Rich editor | L | The core of the reported complaint |
| 2 — Admin CRUD | L | Mostly copy-adapt from the existing block routes |
| 3 — Personalisation | M | Depends on an auth decision |
| 4 — Responsive polish | M | Can partially overlap Phases 1–2 |

Phase 0 is deliberately tiny and high-impact. It should be shipped and verified before committing to the larger phases, so the user's visible problem is resolved even if the rest is descoped.
