# PDF Library Categories — Deep Implementation Plan

Goal: har module ke PDF library me **category/group** ka concept, taaki admin 5 technical PDFs aur 1 cheatsheet PDF alag-alag sections me dikha sake, aur student ko filter pills / grouped list mile.

Assumption (jo user ne bola): categories **module ke andar** hoti hain, har PDF ka apna ek category hota hai. Example — Capgemini module me: `Technical & Coding Qs` (5 PDFs), `Quick Cheatsheets` (1 PDF).

---

## 0. Current state (verified, file-by-file)

| Concern | Reality today |
|---|---|
| Storage | JSON doc (`backend/data/db.json`) via `loadDb()/saveDb()`. `db.companies[].modules[].pdfs[]` |
| Shape | `ModulePdf { id, file_name, stored_name, size_bytes, title, uploaded_at }` — `backend/src/data/db.ts:34` |
| Legacy | `module.pdf` (single) still supported via `getModulePdfs()` — `pdfLibrary.routes.ts:50` |
| Upload | `POST /api/pdf/admin/modules/:moduleId/upload` — `pdfLibrary.routes.ts:57` |
| Delete one | `DELETE /api/pdf/admin/modules/:moduleId/pdfs/:pdfId` — `pdfLibrary.routes.ts:96` |
| Delete all | `DELETE /api/pdf/admin/modules/:moduleId/pdf` (legacy) — `pdfLibrary.routes.ts:118` |
| Serve | `GET /api/pdf/file/:storedName` (premium unlock gate + pdf-lib watermark) — `pdfLibrary.routes.ts:137` |
| Auth | `pdfLibraryRouter.use('/admin', requireAdmin)` — `pdfLibrary.routes.ts:12` |
| Admin UI | `frontend/src/components/admin/ModulePdfManager.tsx` (modal, title + file only) |
| Student UI | `frontend/src/components/company/CompanyModuleReader.tsx:688-768` (flat list) |
| API client | `frontend/src/lib/api.ts:50-189` |
| Types | `frontend/src/types/index.ts:187` (ModulePdf), `:241-242` (pdfs/pdf) |
| Nav | hardcoded 8-item `navItems` array — `CompanyModuleReader.tsx:100-109` |
| Precedent | `posters.routes.ts` has `sort_order` + PUT partial update + admin read list — the pattern to copy |
| Tests | `backend/scripts/*.test.ts` wired to `npm test`; frontend `node scripts/run-tests.mjs` |

**No `category` field exists anywhere. No PUT/PATCH route for a single PDF exists. No sort_order on PDFs.**

---

## 1. Data model decision

### Chosen: `category` (string slug) on each `ModulePdf` + derived grouping

```ts
export interface ModulePdf {
  id: string;
  file_name: string;
  stored_name: string;
  size_bytes: number;
  title: string;
  uploaded_at: string;
  category?: string;      // NEW — slug, e.g. "technical-qs"; undefined/"" = "General"
  sort_order?: number;    // NEW — low first within a category
  is_published?: boolean; // NEW (phase 2) — draft PDFs hidden from students
}
```

### Why slug string, not a separate `pdf_categories[]` array on the module

Considered and rejected: a `module.pdf_categories: [{id, label, icon, sort_order}]` table with `pdf.category_id` FK.

Rejected because:
- Every category CRUD route is extra surface for a feature that has **no independent lifecycle** — categories exist only to label PDFs.
- A slug string is self-describing in `db.json` (a human reading the DB knows what "cheatsheets" means), while an id like `pcat-1727` tells nobody anything.
- Renaming a category becomes a cheap `PUT` on the PDF, not a cascade update over two collections.
- Zero migration risk: existing 5 PDFs in `db.json` have no `category`, and the normalizer already handles the missing-field case.

**Tradeoff we accept:** custom per-module categories (admin invents "Round-3 DSA Pack" for one module only) require free-text entry. Mitigation: a datalist of the module's existing slugs + the global preset list, so it's autocomplete-first, type-a-new-as-last-resort.

### Category resolution (one helper, used by both sides)

`category` is stored as a normalized slug. A canonical preset list lives in one shared module so backend and frontend never disagree:

`shared/pdfCategories.ts` (new file — `shared/` already exists at repo root and is the right home for code both apps import).

```ts
export const PDF_CATEGORIES = [
  { slug: 'overview-guides',        label: 'Overview Guides',        icon: 'FileText' },
  { slug: 'core-subjects-pyqs',     label: 'Core Subjects & PYQs',   icon: 'BookOpen' },
  { slug: 'technical-coding-qs',    label: 'Technical & Coding Qs',  icon: 'Lightbulb' },
  { slug: 'quick-cheatsheets',      label: 'Quick Cheatsheets',      icon: 'FileSpreadsheet' },
  { slug: 'never-skip-topics',      label: 'Never Skip Topics',      icon: 'Flame' },
  { slug: 'last-minute-revision',   label: '24-Hr Revision Pack',    icon: 'Zap' },
  { slug: 'hr-behavioral',          label: 'HR & Behavioral Round',  icon: 'UserCheck' },
  { slug: 'full-length-mocks',      label: 'Full-Length Mock Papers',icon: 'ClipboardList' },
  { slug: 'general',                label: 'General / Uncategorised', icon: 'FolderOpen' },
] as const;

export type PdfCategorySlug = typeof PDF_CATEGORIES[number]['slug'];

export const GENERAL_CATEGORY = 'general';
export const DEFAULT_CATEGORY = 'general';

export function isPdfCategorySlug(v: unknown): v is PdfCategorySlug { ... }
export function pdfCategoryLabel(slug: string | null | undefined): string { ... }
export function pdfCategoryMeta(slug: string | null | undefined): { slug, label, icon } { ... }
export function normalizePdfCategory(v: unknown): string  // '' / null / bad -> DEFAULT_CATEGORY
```

**Slug list intentionally mirrors the 8 module-navigator sections** (items 3-7 map 1:1, plus overview-guides, mocks, general). Rationale: an admin labelling a PDF "Technical & Coding Qs" in the PDF library is expressing "this PDF backs section 4 of the navigator" — the taxonomy is already in the product, we just didn't write it down.

Backend resolves it via relative import; frontend via the `@/` alias. Verify the exact alias/tsconfig path mapping before wiring the import — if `shared/` is not currently shared by both, duplicate the const in `backend/src/data/pdfCategories.ts` and add a test asserting the two lists match.

### Ordering rule

Within a category: `sort_order` asc, tie-break on `uploaded_at` desc, then `id`. This mirrors `byOrder()` in `posters.routes.ts:56`.

### Backward compat (non-negotiable)

`module.pdfs` entries with no `category` render under **General / Uncategorised**. `getModulePdfs()` in `pdfLibrary.routes.ts:50` and the frontend mirror in `ModulePdfManager.tsx:19` and `CompanyModuleReader.tsx:716` all keep working untouched — we normalize *after* they return.

---

## 2. Backend

### 2.1 `backend/src/data/db.ts`

Extend `ModulePdf` (line 34) with `category?`, `sort_order?`, `is_published?` (comments explaining the slug rationale, per repo comment style).

### 2.2 `backend/src/routes/pdfLibrary.routes.ts`

**(a) Normalizer + grouper, added near `getModulePdfs()` (line 50):**

```ts
function normalizePdf(p: ModulePdf): ModulePdf {
  return {
    ...p,
    category: normalizePdfCategory(p.category),
    sort_order: Number.isFinite(Number(p.sort_order)) ? Number(p.sort_order) : 0,
  };
}

/** Group for display: category order follows the preset list, then any custom slug alphabetically. */
function groupPdfsByCategory(pdfs: ModulePdf[]): { slug, label, icon, pdfs }[] { ... }
```

Export `groupPdfsByCategory` so the grouping rule has one implementation, not two.

**(b) Upload route (line 57)** — accept and persist category:
- read `req.body.category`, run through `normalizePdfCategory`
- `sort_order` = `(max existing sort_order in that category) + 1` so a fresh category appends to its own group
- set `sort_order` on the new `ModulePdf`
- keep everything else identical (legacy `module.pdf` migration at line 86-87 stays)

**(c) NEW `PATCH /api/pdf/admin/modules/:moduleId/pdfs/:pdfId`** — the missing mutation:
```
body: { title?, category?, sort_order? }
```
- 404 if module or pdf missing; **404 without deleting the file** (contrast posters, which 404s too)
- title sliced to 120 chars (matches posters' `.slice(0, 80)` habit, scaled)
- only reassign `sort_order` when explicitly passed; otherwise leave
- `pushAudit(db, { action: 'pdf.update', actor: req.userId, detail, meta: { company_id, module_id, pdf_id, category } })` **before** `saveDb(db)` — the ordering comment at `admin.routes.ts:248` explains why
- `res.json({ status: 'success', pdf: normalizePdf(saved), pdfs: normalized array })`

**(d) NEW `PUT /api/pdf/admin/modules/:moduleId/pdfs/order`** — bulk reorder:
```
body: { order: [{ id, sort_order, category }] }
```
Admin drags a PDF to another category in the list; this writes the move in one transaction. Validate every `id` exists in the module → else 400 with `{ error, missing_ids }` and **no partial write**. This is the endpoint that makes "move 3 of the 5 technical PDFs into cheatsheets" a one-call admin action.

**(e) `GET /api/pdf/file/:storedName` (line 137)** — add draft gate:
```ts
if (pdfMeta?.is_published === false && !isAdmin) return res.status(403).json({ error: 'PDF not published' });
```
Placed after the existing premium-unlock gate. Server-side watermark cover text gets `moduleTitle` unchanged; consider appending the category label here so the personalized cover reads "Capgemini — Technical & Coding Qs".

**(f) Never trust the client's `stored_name`** — the serve route already re-derives ownership by scanning every module (lines 146-153). Keep that. Don't "optimize" it with a lookup table in this pass; it is the security boundary and it works.

### 2.3 `backend/src/routes/companies.routes.ts` — the leak

Line 136-165 redacts `section_data` and block payloads for un-owned premium modules, **but never touches `mod.pdfs`**. Today that leak is mitigated only by the 403 on `/file/:storedName`. Once categories exist, the un-owned student sees the full category-grouped list with real titles ("Capgemini_2026_Guess_Paper_Grid_Challenge") in the payload even though they can't open the file.

Fix in the same redaction block:
```ts
// Titles and categories are marketing copy the un-owned viewer must not get.
// Keep only the count so the locked state can say "5 guides in this pack".
const teaser = (mod.pdfs || []).slice(0, 1).map(p => ({ id: p.id, title: p.title, is_teaser: true }));
mod.pdfs = teaser;
mod.pdf_count = (mod.pdfs_original_length);
```
Compute `pdf_count` before overwriting. `CompanyModuleReader` already shows a lock CTA when `is_premium && !isModuleUnlocked` (`line 700`), so the card renders from metadata, not the list — verified no frontend crash.

**This is a real pre-existing leak. Fix it as part of this work, not as a follow-up.**

### 2.4 Validation

- `normalizePdfCategory` clamps to 40 chars slug (`[^a-z0-9-]` → `-`), empty → `general`
- No new multer limits, no new env vars

---

## 3. Frontend — admin (`ModulePdfManager.tsx`)

### 3.1 New endpoints in `frontend/src/lib/api.ts`

```ts
updateModulePdfApi(moduleId, pdfId, patch)            // PATCH
reorderModulePdfsApi(moduleId, order: PdfOrderItem[]) // PUT
```
Both return `{ status, pdf?, pdfs }`; caller does `setPdfs(res.pdfs)`, matching the existing upload/delete handlers (`ModulePdfManager.tsx:85-89`, `:108`).

### 3.2 Upload form

Add a category `<select>` above the Title field, defaulting to `general`, options = `PDF_CATEGORIES` labels, with a **"+ New category…"** option that reveals a text input (normalized to a slug client-side, mirrored server-side). Datalist pre-seeded with the slugs already used in this module so a one-off category is autocomplete-suggested, not retyped.

`uploadModulePdfApi` signature grows a 5th param. To avoid breaking the existing 4-arg call shape, put it **after** `onProgress`:
```ts
uploadModulePdfApi(moduleId, file, title, onProgress?, category?)
```
and `form.append('category', category || '')` at `api.ts:75`.

### 3.3 Per-PDF row

Each row gains, in the existing action cluster (line 161-177):
- a **category chip** — click to open a small inline `<select>`; on change call `updateModulePdfApi`, optimistically update `pdfs`, revert on failure and `flash(err)` (existing `flash` at line 69)
- an **edit title** affordance
- keep Preview / Delete as-is

### 3.4 Move-between-categories (the feature the user actually asked for)

Native HTML5 drag-and-drop on the row, matching the existing dropzone vocabulary (line 208-213). Drop target = another category group header. On drop → build the full `order` array and call `reorderModulePdfsApi` once. Show `Loader2` state; on error reload the authoritative list from the response.

Rows keep their Preview/Delete buttons during drag (`onDragStart` on a dedicated grip handle only, so the existing buttons stay clickable).

### 3.5 Admin list becomes grouped

`ModulePdfManager` renders groups: sticky group header (label + count + "+ Add here") over its rows, and the upload zone's default category is the group you're adding into. Pass `defaultCategory` to `pickFile` when the admin clicked "+ Add here" in a specific group.

### 3.6 `ContentBuilder.tsx` bug to fix in passing

Line 170-172 shows the PDF button state from `mod.pdf` only:
```tsx
{mod.pdf ? 'PDF ✓' : 'PDF'}
```
For every module already migrated to `pdfs[]` this reads **"PDF" with no checkmark even when PDFs exist** — the legacy field is deleted on first upload. Fix to use the same normalizer:
```tsx
{getModulePdfs(mod).length > 0 ? `PDF ✓ ${getModulePdfs(mod).length}` : 'PDF'}
```
Also that file has a mojibake char (`PDF �?`). Clean it.

---

## 4. Frontend — student (`CompanyModuleReader.tsx`)

### 4.1 Filter pills above the list

State: `const [activePdfCategory, setActivePdfCategory] = useState<string>('all')`.

Pills row (line ~730, inside the unlocked branch) — horizontal scroll on mobile, `overflow-x-auto`, snap:
```
[ All 7 ]  [ Technical & Coding Qs 5 ]  [ Quick Cheatsheets 1 ]
```
Rendered **only when `groups.length > 1`**. A single-category module shows no filter chrome at all — that's the "don't add UI you don't need" rule this codebase already follows elsewhere (e.g. `hasAuthoredContent` at line 117).

Pill = label + count. Active pill gets the amber/sky active treatment already used elsewhere in this file. "All" resets to the grouped view.

### 4.2 Grouped rendering

Replace the flat `pdfList.map(...)` (line 731-760) with `groups.map(...)`; inside each group render the same card markup so the visual language doesn't change. Group header = label, count, thin rule.

Card markup changes (line 732-742):
- icon tile colour derived from the category (`pdfCategoryMeta(slug).icon` → lucide component, grey fallback for custom slugs)
- add a small uppercase category label above the title **only in "All" view** (redundant inside a group — don't print a label three times)
- everything else (`Open Viewer` / `Download PDF`, sizes, `dlNote`) unchanged

### 4.3 Locked-state copy (line 700-714)

Currently hardcodes `module.pdf ? module.pdf.title : 'PDF studies are part of the premium pack'` — with `pdfs[]` this almost always shows the generic string and leaks nothing but reads wrong. Rewrite to use `module.pdf_count` (from the 2.3 redaction):
> "7 guides across 4 categories in this pack — unlock once, view and download every one."

When `pdf_count` is absent, fall back to the honest generic line. **Never print a rupee or a count we were not handed** — matches the existing `priceSuffix` discipline at line 57.

### 4.4 Viewer

`PdfViewerModal` needs **no changes** to function. Optional nicety: show `title — categoryLabel` in the modal header so a student who opened 3 of the 5 technical PDFs knows which one they're in. One-line change; ship it only if it fits the existing header without a layout fight.

### 4.5 Empty state

"No PDF uploaded for this module yet" (line 724) stays. Add: when a filter pill yields zero results that can't happen (counts are derived from the same list) — so **no dead-end state exists**. Don't build one.

---

## 5. Migration

New script `backend/scripts/migrate-pdf-categories.ts`, run once, wired as `npm run migrate:pdf-categories` (not part of `npm test`).

- Walk `db.companies[].modules[]`, normalize each `pdfs[]` entry
- Missing/blank `category` → `general`
- `sort_order` missing → index within its category
- `module.pdf` legacy single → `pdfs: [normalizePdf(module.pdf)]`, then delete the legacy key
- Idempotent: running twice is a no-op
- Prints a summary: modules touched, PDFs categorized, buckets created
- Follows the shape of the existing `scripts/repair-pack-content.ts` (a `repair:*` sibling), and should be dry-run-first

No SQL migration — JSON is the source of truth; the CockroachDB replica mirrors the whole doc (`backend/src/db/migrate.ts`).

---

## 6. Tests

### Backend — `backend/scripts/pdf-library-api.test.ts`, added to `npm test` as `test:pdfs`

Follow `posters-api.test.ts` structure (uses `scripts/test-env.ts`). Cover:

1. upload with `category=technical-coding-qs` → persisted verbatim
2. upload with no category → `general`
3. upload with `category=Not A Slug!!` → normalized, never persisted raw
4. `PATCH` retitles + recategorizes; response echoes normalized values
5. `PATCH` with unknown `pdfId` → 404, **file still on disk**
6. `PUT .../order` with one unknown id → 400, **no partial write** (the important one)
7. `PUT .../order` moving 3 PDFs technical→cheatsheets → grouping reflects it
8. grouping order = preset order, custom slugs alphabetical after
9. legacy `module.pdf` upload migration still yields exactly one entry
10. `GET /file/:storedName` with `is_published:false` as non-admin → 403; as admin → 200
11. premium + un-unlocked → 403 (regression, don't break the existing gate)
12. **leak test**: `GET /companies/:slug` un-owned premium module → no real PDF titles, only teaser + `pdf_count`

### Frontend — `frontend/scripts/pdf-categories.test.ts`, auto-picked-up by `scripts/run-tests.mjs`

- `normalizePdfCategory` on empty/null/uppercase/spaces
- `pdfCategoryLabel` on known slug, unknown slug (returns the slug itself, never blank), null
- `groupPdfsByCategory` on empty array, single category, mixed preset + custom

### Manual QA checklist

- [ ] Admin: upload to a new category via "+ New category…"; appears under it
- [ ] Admin: drag a PDF from Technical to Cheatsheets; survives reload
- [ ] Admin: ContentBuilder button shows `PDF ✓ 5`
- [ ] Student: pills show correct counts; "All" groups; card label hidden inside a group
- [ ] Student: locked premium module shows count-based copy, no real titles in the network tab
- [ ] Existing 5 PDFs in `db.json` land in General, app boots clean pre-migration

---

## 7. Build order

1. `shared/pdfCategories.ts` + both test files (pure logic, zero wiring — proves the taxonomy)
2. Backend: `ModulePdf` fields, `normalizePdf`/`groupPdfsByCategory`, upload persists `category` + `sort_order`
3. Backend: `PATCH` + `PUT .../order` + audit
4. Backend: `companies.routes.ts` redaction fix — **ship this in the same deploy, before the frontend grows a filter that renders those titles**
5. Migration script + dry run on a `db.json` copy
6. Frontend api client: `updateModulePdfApi`, `reorderModulePdfsApi`, upload `category`
7. `ModulePdfManager`: select on upload, chip + edit on row, DnD between groups, grouped list
8. `ContentBuilder` checkmark fix
9. `CompanyModuleReader`: pills, grouped render, locked copy
10. Full `npm test` (backend) + `npm test` (frontend) + `npm run typecheck` both

---

## 8. Decisions locked / open

**Locked (propose, don't relitigate):**
- slug string on the PDF, not a `pdf_categories` collection
- `general` is the default bucket and is always rendered last
- category order is a product constant, not admin-reorderable (matches the 8-section navigator, which is also fixed)
- grouping logic is exported from one place and tested on both sides
- the `companies.routes.ts` PDF leak is fixed in this change

**Open for you to decide:**
- Is a **custom** category worth supporting at all, or should the list be the fixed 9? Custom is ~40 extra lines in the admin form; dropping it removes the slug-normalisation surface and the "unknown icon" fallback.
- Should categories be **per-module** (as planned) or a global taxonomy applied to every module? Per-module is what the user described; global would let a "Technical" group span a whole company vault.
- Do you want `is_published` drafts now, or in a second pass? It's ~15 lines here and one gate in the serve route; deferring it means a second trip through the same files.
- Reorderable categories (admin drags group headers), or fixed order? Fixed is the plan; reorderable is a bigger UI and a second `order` payload shape.
