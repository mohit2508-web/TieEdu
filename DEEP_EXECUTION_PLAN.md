# TieEdu — Deep Execution Plan (CMS Portal, Full-Screen Cart, Checkout Fix, Module-by-Module Content In)

> **Decisions locked (22 Sep 2026):**
> 1. **Payment:** Abhi sirf **mock checkout fix** — flow + UI perfect karo (order → success → unlock), Razorpay SDK keys baad me aayenge.
> 2. **Cart:** **Full-screen slide-in drawer** (right side, poori screen height).
> 3. **Format:** **Calibre everywhere, GFG-style reader** — 18px body prose, sky-blue `#0284C7` accents, section navigator (CompanyModuleReader ka current look = THE standard).

---

## 1. Project Analysis — Current State (As-Is)

| Layer | Stack | Location |
|---|---|---|
| Frontend | Next.js 14 (Pages Router) + TS + Tailwind, port 3000 | `frontend/src/` |
| Backend | Express + TS REST API, port 5000 | `backend/src/` |
| Data | `backend/data/db.json` (local JSON repo). CockroachDB optional — migration fails → **silently falls back to db.json** | `backend/src/db/` |
| Payment | `razorpay` npm installed but **unused**. `checkout.routes.ts` returns a **fake order** (`order_rzp_...`) | `backend/src/routes/checkout.routes.ts` |
| Cart | `CartModal` centered **modal `max-w-lg`** (512px), NOT full screen | `frontend/src/components/checkout/CartModal.tsx` |
| CMS | `/admin` → `AdminCmsView` + `BlockEditorModal` (Tab: companies / modules / reports / new company) | `frontend/src/components/admin/` |
| Auth | No auth. Admin route is open. User state in-memory only | — |

### What already works
- **Company hubs** (`/[slug].tsx`): hero, trust bar, question bank (round filter), recruitment roadmap, interview experiences, related vaults, sticky unlock bar, paywall blur on locked blocks.
- **`CompanyModuleReader.tsx`** — the 7-section reader ALREADY renders: overview, core subjects + PYQs (year filter), interview Qs (code blocks), cheatsheets, never-skip topics, last-minute revision, HR round. **This is the target standard.**
- **Data model ALREADY supports the full pack:** `ContentModule.section_data` = `overview | core_subjects | interview_questions | cheatsheets | never_skip_topics | last_minute_revision | hr_round` (`frontend/src/types/index.ts:96`). Also opens `items[]` (question + blocks) for Q&A.
- Typography base: Calibre font stack + `.prose-article` 18px body already in `globals.css`.
- Backend admin routes exist for companies/modules/items/blocks + report moderation.

### Critical Gaps (kya kya fix karna hai)
1. **CMS cannot author/edit `section_data`** — the 7-pack sections are un-editable from admin. Only Zscaler has one seeded demo. Admin "Add Block" writes to a generic module only.
2. **New Module form is thin** — only title + round. No module_type, price, premium toggle, description.
3. **No edit/delete/reorder** for companies, modules, or items.
4. **Block editor** only does markdown/code/diagram/image/animation/callout — missing table/video/audio; not bound to a chosen module+item+block order.
5. **Cart = small modal** → convert to full-screen slide-in drawer.
6. **Checkout = fake everywhere** — mock order, `setTimeout` fake success, hardcoded coupons (`TIEEDU20`, `FIRST50`), unlock only flips in memory (`isUnlocked` resets on refresh).
7. **No persistence of unlock** → after payment, content locks again on reload.
8. Mock fallback in `lib/api.ts` hides backend failure — dev must know backend is up.

---

## 2. The Company Complete Pack — Standard Content Template

Har company ka module, jab bhi CMS me banega, is exact template me bana. Yeh = "module-by-module ready" ka definition.

```
COMPANY PACK (module_type: 'complete_pack')
│
├─ 1. Overview            → companyInfo, eligibility, salaryBreakdown, reviews[]
├─ 2. Core Subjects & PYQs → subject (DBMS/OS/Networks/DSA/Aptitude)
│     └─ topic → content + pyqs[{year, question, answer, frequency}]
├─ 3. Technical & Coding Qs → category, title, question, solution, code, language
├─ 4. Quick Cheatsheets   → title, summary, content
├─ 5. Never-Skip Topics   → topic, priority (High/Must Do/Frequent), notes
├─ 6. Last-Minute Revision → title, points[]
├─ 7. HR & Behavioral     → question, answer (STAR), tips[]
└─ items[] per round module → question + blocks (markdown/code/diagram/table/...)
```

**Readiness Checklist (har module yahi check hoga):**
- [ ] Company metadata + SEO + trust stats set
- [ ] Saare 7 sections bhari hui (khaali "loading..." nahi)
- [ ] Round-wise modules with `round_type`, `price`, `is_premium`
- [ ] items + free-preview flags sahi (2–3 free preview Q per company)
- [ ] Blocks render sahi (code highlight, mermaid diagram, table)
- [ ] Locked/unlocked logic sahi (unlock ho to sab open)
- [ ] PDF export same content
- [ ] Calibre font + 18px body prose (auto, standard se)

---

## 3. Formatting & Typography Standard (All Files)

| Token | Value |
|---|---|
| Font stack | `'Calibre','Calibri','Inter',-apple-system,sans-serif` (headings + body) |
| Mono | `'JetBrains Mono'` |
| Body | 16px global / **18px** prose-article + line-height 1.85 |
| H1/H2/H3 | 36px / 28px / 22px (prose-article scale) |
| Card text | 13–15px, labels 11px mono uppercase |
| Accent | Sky `#0284C7` (GFG reader) + amber `#E8A33D` CTA |
| Surfaces | White cards, `#F8FAFC` app bg, gray-200 borders |

> Standard already = `globals.css` + `CompanyModuleReader.tsx`. Naya code INAHI tokens use karega.

---

## 4. Module-by-Module Execution Plan

> **Order matters:** backend-first (data must exist before CMS UI), then CMS UI, then reader/payment polish. Har module independent shippable + verify karenge.

### MODULE A — Backend CMS API Expansion (data layer)
Add full CRUD so admin kitna bhi content add/update kar sake.
- `PUT/DELETE /api/admin/companies/:id` — full metadata (tags, SEO, tolerance, comparison_metrics, trust_stats, rounds_pipeline)
- `PUT/DELETE /api/admin/modules/:id` — title, module_type, round_type, price, is_premium, description, sort_order (reorder via `PATCH /reorder`)
- `PUT /api/admin/modules/:id/section` — **save/overwrite whole `section_data` (the 7 pack sections)** ← core requirement
- `PUT/DELETE /api/admin/modules/:id/items/:itemId` — edit/delete items + blocks
- `POST /api/admin/coupons` + `POST /api/checkout/validate-coupon` — coupons ab server-side
- `GET/POST /api/unlocks` — unlock persist (user_id + company_id, db.json)
- Saare endpoints `saveDb()` me persist + `last_updated_days_ago: 0` reset
- ✅ Verify: curl/Postman se section_data create-read-update -> db.json me aa raha

### MODULE B — CMS Portal UI (admin side) — the big one
Rebuild `AdminCmsView` into a **full company CMS**:
- **Tab 1 — Companies**: full create/edit form (name, slug, logo, industry, tags, CTC min/max, rounds, difficulty, SEO title/desc, trust stats) + delete/archive + status (draft/published/archived)
- **Tab 2 — Module Builder**: create module (module_type + round_type + price + premium + description), reorder (up/down), edit, delete
- **Tab 3 — 7-Section Pack Editors** (har section ka dedicated form, live student preview right side):
  - Overview Editor (companyInfo / eligibility / salary / reviews add-remove)
  - Core Subjects Editor (subject → topic → content → PYQ (year/question/answer/frequency) add-remove)
  - Interview Qs Editor (category/title/question/solution/code/language) + code preview
  - Cheatsheet Editor (title/summary/content)
  - Never-Skip Editor (topic/priority/notes)
  - Last-Minute Editor (title + points dynamic list)
  - HR Editor (question/answer/tips list)
- **Tab 4 — Q&A Item Builder**: module select → item select → block list (add/reorder/delete) with saare 8 block types (markdown, code, diagram, image, callout, table, video, audio) + live render preview
- **Tab 5 — Reports** (moderation — already exists, keep)
- **Tab 6 — Coupons & Prices** (admin-defined coupon codes + per-module price)
- ✅ Verify: CMS se ek full company pack bana ke student side pe open karke render dekho

### MODULE C — Full-Screen Slide-In Cart
- Replace `CartModal` with full-screen drawer (fixed right, `w-full lg:max-w-3xl`, `h-screen`, slide-in animation) bol bhi rounded top
- Layout: left = item list (large, thumbnails + price + remove), right = summary panel (subtotal, coupon, tax-inclusive note, total, pay button, trust badges)
- Header cart icon click → drawer; same state reuse (`cartItems`) — Header + `[slug]` pass-through
- Empty state, success state, mobile responsive (full width)
- ✅ Verify: desktop+mobile open/close, add/remove, totals correct

### MODULE D — Checkout Mock-Flow Fix (payment, abhi mock)
- **Order model:** backend `POST /api/checkout/create-order` → real order object `{id, amount, currency, status:'created', items, user_id}` persisted in db.json; add `orders[]` to db
- **Validate:** `POST /api/checkout/validate` → takes coupon code (server-side `validate-coupon`), computes total, returns final amount + applied discount (coupons ab db me, frontend hardcode nahi)
- **Success:** frontend calls `POST /api/checkout/complete` (mock payment success) → backend marks order `paid`, writes `user_unlocks` → frontend reads `GET /api/users/:id/unlocks` → `isUnlocked` ab **persisted (reload pe lock nahi hoga)**
- Coupon chips ab backend se aaenge, invalid code backend error
- Success screen shows **order ID + unlock badge** (no fake "webhook verified" copy — ye mock hai, hona honest)
- ✅ Verify: pay → order paid → reload → still unlocked; coupon apply/remove; empty cart

### MODULE E — Reader & Content Polish (student side)
- `CompanyModuleReader` me: cheatsheet content ko markdown render karo (react-markdown), PYQ answer styled, table block support in reader
- Section empty states: "Admin ne abhi add nahi kiya" — no fake "loading..."
- Mobile: section navigator collapses to dropdown; sticky top bar compact
- Sticky unlock bar + module reader "Unlock Pack (₹price)" hook sahi price dynamic
- Font-size/Calibre audit har section pe (18px body standard)
- ✅ Verify: mobile + desktop har section

### MODULE F — Content Intake (user shares module-by-module)
- Jab aap koi company share karo, harness flow:
  1. Main user ka data lo → `ModuleSectionData` JSON template me map karo
  2. Seed via admin API OR direct db.json entry (sab fields)
  3. Student page open → 7-section reader check
  4. Readiness checklist (Section 2) run karo → ✅ done
  5. Har nayi company = ek "pack" complete, free previews + locks + PDF set
- Template file `COMPANY_PACK_TEMPLATE.json` bana ke rakhunga (aapko bharne ko denge)

### MODULE G — QA, Lint, Build & Handoff
- `npm run lint` (frontend) + `tsc` build (backend + frontend) zero errors
- End-to-end smoke: home → company → unlock → drawer → mock pay → unlocked → reload
- ENV notes: `backend/.env` (PORT, mock keys), run commands (`npm run dev` both)
- Seed 3–5 extra demo companies with full packs so CMS output instantly visible

---

## 5. Aap kya share karoge (module-by-module) — Intake format

Jab bhi company bhejo, is order me best:
```
1. Naam, logo, industry, tags, CTC range, rounds count, difficulty
2. Eligibility + salary breakdown
3. Har round ka nam (OA / Tech1 / Tech2 / SystemDesign / HR)
4. Core subjects (DBMS/OS/Networking/DSA/Aptitude) → topic-wise questions + answers, year-wise PYQs
5. Topic-wise important questions (high frequency marked)
6. Cheatsheets (2-4)
7. Never-skip topics list
8. Last-minute revision points
9. HR questions + STAR answers
10. Real interview experiences/reports (optional)
```
Yeh content bhi aap **CMS se self-add** kar sakte ho Module B complete hone ke baad — dono routes chalenge.

---

## 6. Quick Reference — Files to Touch

| Change | Files |
|---|---|
| Backend CMS CRUD | `backend/src/routes/admin.routes.ts`, `backend/src/data/db.ts` |
| Orders/unlocks/coupons | `backend/src/routes/checkout.routes.ts` (new routes), seed orders in `db.ts` |
| CMS UI | `frontend/src/components/admin/AdminCmsView.tsx`, `BlockEditorModal.tsx`, new `SectionEditors/` components |
| Cart drawer | `frontend/src/components/checkout/CartModal.tsx` → `CartDrawer.tsx` |
| Checkout flow | `frontend/src/lib/api.ts`, `frontend/src/pages/company/[slug].tsx` |
| Reader polish | `frontend/src/components/company/CompanyModuleReader.tsx` |
| Types | `frontend/src/types/index.ts` (coupons, orders) |