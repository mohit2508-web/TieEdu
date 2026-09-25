# Company Page Redesign Plan — "1 Hero + 1 Featured Free Module + Premium Modules"

Target: `/company/[slug]` (Palo Alto Networks page is the live example). Goal = fix tiny fonts, remove confusion (repeated "path" blocks), kill duplicate CTAs, and make the flow exactly: **Company overview hero → 1 featured FREE module (open fully) → premium modules below (Add to Cart / Download) → trust/cross-sell**.

---

## 1. Current Page Diagnosis (from live Palo Alto Networks render + code)

| # | Problem | Where (code) | Why it's confusing |
|---|---------|--------------|--------------------|
| P1 | Tiny fonts everywhere | Hero meta `text-xs sm:text-sm` (CompanyOverviewHeader), badges `text-[10px]`, pipeline `text-[10px]/text-[11px]`, Roadmap `text-[9px]`/`text-[10px]`/`text-[12px]` | 6-column step cards at 9–12px = unreadable clutter; user says "font chota" |
| P2 | **Two recruitment paths** | (a) `CompanyOverviewHeader` "Recruitment Process Pipeline (Click to filter round modules)" — 4 rounds; (b) `RecruitmentRoadmapFlow` "Recruitment Flow & Milestone Path" — 6 steps (rounds 1–4 repeated + PDF + Goal) | Rounds render **twice** with different step counts (1–4 vs 1–6) = "path bahut confusing" |
| P3 | Question-bank table duplicates modules | `[slug].tsx` catalog lists every module row WITH a "Open All-in-One 360° Module" CTA, then lists every item under it inline | Page is massive; item list repeats what the reader already shows; many identical CTAs |
| P4 | Repeated "Free" signals | Module row badge "Free Pack" + item-right badge "Free" + reader "Free Preview" | Triple free-signaling noise |
| P5 | CTA sprawl | (1) Hero "Unlock Intelligence Hub", (2) Free-module card "Unlock Premium — ₹249", (3) sticky bottom "Unlock Now", (4) each module row "Open All-in-One 360°" | 4+ different CTAs, all fighting for attention |
| P6 | Confusing module names/entry | "Open All-in-One 360° Module" wording unclear; no price/CTA per premium module row | User expects: see 1 free module fully, then buy premium ones below |

## 2. Target Flow (what the user asked)

> "ek module usko pura dekha and other module niche dekha jo premium ho"

1. **Hero** — overview, price (₹249/₹1,499/83% OFF), 4-round filter pipeline (single path, readable fonts)
2. **Featured FREE module** — big card, full 7-section pack, one big CTA **"Open Free Module"** + secondary **"Download (.md)"**
3. **Premium modules** — grid of cards BELOW, each: title, round badge, Q count, share/price, **"Add to Cart & Unlock ₹X"** (adds to cart funnel already built) + **"Download preview"**
4. **Thin trust strip + Candidate Experiences + Related Vaults** (keep, de-duplicated)
5. **Sticky unlock bar** — the ONLY persistent CTA when locked

## 3. Exact Changes (component by component)

### 3.1 `frontend/src/pages/company/[slug].tsx` (catalog mode rewrite)
- **REMOVE:** the whole "Interview Question Bank" table section (P3, P6) — items live inside the reader now.
- **REMOVE:** `<RecruitmentRoadmapFlow>` import + section (P2) — one pipeline (in Hero) is enough.
- **REPLACE with:**
  - `FeaturedFreeModuleCard` — first free module (or first module if none free); big card, 7 sections listed as chips, CTA `Open Free Module` → opens `CompanyModuleReader`; secondary `Download module .md` + `Unlock Premium ₹249`.
  - `PremiumModuleGrid` — remaining premium modules as cards (respects active round filter: premium cards filtered by round; featured free always shown). Each card → new `PremiumModuleCard` component.
- **KEEP:** breadcrumb, `CompanyOverviewHeader` (after fontSize fix), `TrustBadgeBar`, `InterviewExperiences`, `RelatedVaults`, sticky unlock bar, cart/search/leaderboard modals.
- Move round-filter wiring: Hero pipeline sets `activeRoundTab` → filters the premium grid (featured free stays above filter).

### 3.2 NEW `frontend/src/components/company/FeaturedFreeModuleCard.tsx`
- Props: `{ module, companyName, freeModule, onOpenModule, onUnlock }`.
- Shows: badge "FREE — Everything in one module", module title, 7 section chips (Cheatsheets / DSA topic-wise / Core + PYQs / Interview Q&A / Do-not-skip / Last-minute / HR), big emerald `Open Free Module` CTA, secondary `Download (.md)` + `Unlock Premium ₹249` ghost buttons.
- Fonts: title `text-2xl`, chips `text-sm`, body `text-base`.

### 3.3 NEW `frontend/src/components/company/PremiumModuleCard.tsx`
- Props: `{ module, companyName, onAddToCart, onPreview }`.
- Card layout (GFG-style, Calibre):
  - Round badge + module_type chip, difficulty/price row, `₹{price}` + strike ₹499 fake MRP, `{items.length} questions`.
  - Primary CTA: **"Add to Cart & Unlock — ₹X"** (single action = whole cart funnel: adds to cart, opens CartModal).
  - Secondary: **"Download preview (.md)"** + subtle "Open reader (locked)" disabled hint or small preview.
- Fonts: `text-lg` title, `text-sm` body — no `text-[9-12px]` anywhere.

### 3.4 `frontend/src/components/company/CompanyOverviewHeader.tsx` (font + de-dup)
- Pipeline buttons: bump to `text-sm` titles, `text-xs` subtitle, `text-[11px]→text-xs` step/badge chips.
- Meta cards: labels `text-xs→text-sm`, values `text-lg`.
- Keep "Recruitment Process Pipeline" (it filters). This becomes the ONLY path visual.
- Keep `onUnlockClick` hero CTA (primary).

### 3.5 `frontend/src/components/company/RecruitmentRoadmapFlow.tsx`
- No longer imported anywhere (3.1). Keep file for reference or delete. Plan: delete usage only; optionally delete file to avoid dead code.

### 3.6 "Free" signal clean-up (P4)
- Featured Free card is the single FREE signal on the page.
- Premium cards show `Premium` + price only.
- Remove per-item "Free" badges from catalog (table is gone anyway); reader keeps its "Free Preview" chip on actual free items.

### 3.7 Reader (`CompanyModuleReader.tsx`) — already updated, no further change
- Header buttons: `Add to Cart & Unlock (₹price)`, `Download Module (.md)`, `PDF`.
- Bottom conversion strip: "Free pack done? Ab aage ka module unlock karo" → Unlock + Browse All Modules.
- Only keep the premium reader header **without** adding new CTA (already correct).

## 4. Font / Typography Rules applied
- Titles: `text-xl`/`text-2xl` min. Body: `text-base` (16px) min. Labels: `text-sm` min.
- Banish `text-[9px]`, `text-[10px]`, `text-[11px]` from new/edited page components (global CSS boost in globals.css already raised those to ~12.8px as a safety net).
- Keep Calibre stack + #0284C7 sky accent + navy #1F3A5F / amber #E8A33D TiEdu palette.

## 5. CTAs on the page after redesign (deduplicated)
1. Hero: **Unlock Intelligence Hub** (primary, amber) — opens cart with company.
2. Featured free: **Open Free Module** (emerald, big) + **Download (.md)** ghost.
3. Premium card: **Add to Cart & Unlock — ₹X** (amber) + **Download preview** ghost.
4. Sticky bottom bar (locked only): **Unlock Now ₹249** — persists while scrolling.
= exactly 4 purposeful CTAs, each with ONE clear job.

## 6. Out of scope (this pass)
- No backend changes (cart/checkout/unlock/PDF already work).
- No admin CMS changes.
- interview-experiences / related-vaults only get font de-bump if trivial; otherwise untouched.

## 7. Verification
- `npx tsc --noEmit` clean.
- `npm run build` clean (all routes: index, /company/[slug], /admin).
- Manual check on `/company/palo-alto-networks`: only ONE path visual, free module front-and-center, premium cards below with buy/download, no `text-[9-11px]` left on the page.

## 8. Step order
A. Bulk-inspect company page for `text-[9..12px]` leftovers (grep).
B. Create `FeaturedFreeModuleCard.tsx` + `PremiumModuleCard.tsx`.
C. Rewrite catalog mode in `[slug].tsx` (remove table + roadmap, mount new cards).
D. Font-fix `CompanyOverviewHeader.tsx`.
E. Remove `RecruitmentRoadmapFlow` usage; delete file.
F. `tsc` + `build` verify.