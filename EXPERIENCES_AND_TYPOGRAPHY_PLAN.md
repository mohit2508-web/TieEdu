# Candidate Experiences + Typography Unification Plan

## Why this plan exists
User feedback on `/company/[slug]` (Razorpay) + the vault cart drawer:
1. **"yeh font style asa kyu aa raha hai… portal se match nahi ho raha"** — InterviewExperiences, RelatedVaults, TrustBadgeBar, SubmitReportModal and the CartModal drawer use a *different visual language* than the rest of the portal: dense `font-mono` uppercase micro-labels, `text-[10px]/[11px]`, an orange gradient banner, dark navy-on-navy micro-type, and serif headings. Portal standard = Calibre sans, body ≥14px, muted 13px small text, `#1F3A5F` navy + `#E8A33D` amber + sky accent, light cards on `#EDEDEB`/`var(--border-subtle)` borders.
2. **"experience bagera add ho sake"** — Interview experiences cannot currently be added end-to-end: the "Share Your Drive Experience" button is dead (no onClick), the page renders a **hardcoded local array** (backend reports never appear), and submissions don't carry `company_id` so they can't be surfaced per company.

## Part A — End-to-end interview experiences (backend + frontend)

### A1. Backend (`backend/src/routes/reports.routes.ts`)
- **GET /api/reports** — support optional query filters: `?company_id=<id>&status=published`. Return filtered array (filter empty-safe: omit filter when param absent).
- **POST /api/reports** — already writes `company_id` from body (falls back `comp-1`); keep. Frontend will now send it.
- **Seed** — replace the two frontend-hardcoded demo experiences with **real published reports** in `backend/data/db.json` for `comp-3` (Razorpay) + a Zscaler page report. Keep field shape = `ReportItem` (`user_name`, `user_role`, `rounds[]`, `accuracy_rating`, `outcome`, `status:'published'`, `created_at`, `company_id`). Existing seed reports drift (they currently exist? verify) — normalize any present to `status:"published"` and proper `company_id`.
- No schema change; `ReportItem` type already has everything.

### A2. Frontend API (`frontend/src/lib/api.ts`)
- Add `fetchPublishedReportsApi(companyId: string)` → `GET ${API}/reports?company_id=${id}&status=published`.
- Extend `submitInterviewReportApi` payload to include `company_id` (new param `companyId`).

### A3. `InterviewExperiences.tsx` (rewrite)
- New props: `companyName: string`, `companyId: string`, `onShare: () => void`.
- **Fetch** published reports for `companyId` on mount (`useEffect`).
- **Display**: published reports render as cards (mapped from `ReportItem`):
  - `candidate_name` → `user_name`; `role` → `user_role`; `date` → `created_at`; `summary` → `rounds[0].summary`; `rounds_passed` → `rounds[].round_name` (with ✓); `rating` → `accuracy_rating` (★ display); `outcome` chip ← `outcome` enum mapped to `"SELECTED"` / `"IN PROCESS"` / `"REJECTED"` label (+ LPA shown when present in a new optional `salary_lpa` field — add to seed only, keep `ReportItem` lenient).
- **Fallback**: if the company has zero published reports, render the 2 built-in demo cards (existing copy) so the page never looks empty — header title then says "Verified {company} Interview Experiences" with count from API (fallback → existing "24" stat style).
- **Header**: light portal band (white card, navy heading, verified shield in emerald, amber "Share Your Drive Experience" button) — **no dark navy gradient**.
- Newest first; show small emerald "Verified Drive Log" chip. Newly submitted-but-pending never shows here (await admin) — modal already confirms moderation.

### A4. `[slug].tsx` wiring
- `<InterviewExperiences companyName={company.name} companyId={company.id} onShare={() => setIsSubmitReportOpen(true)} />`.
- `<SubmitReportModal ... companyId={company.id} />`.
- After modal closes following a successful submit, refetch published reports (pass a `refreshKey` or lift a callback) so the flow feels live even though pending reports wait for admin.

### A5. `SubmitReportModal.tsx` (typography + company_id)
- Swap `font-serif-heading` → portal headings (`text-[15px] font-bold text-[var(--text-heading)]`, etc.), replace `text-[10px]/[11px]` labels with 13px muted control text.
- Add hidden `company_id` into the POST payload (new prop `companyId`).
- Keep existing flow (select outcome, 1-5★, round breakdown) — just re-skinned.

## Part B — Typography / style unification (single visual system)

Global target (already portal-wide): Calibre (wrapper `fontFamily`), `text-xs→13px` global bump, muted `#8A8A8A`, navy `#1F3A5F`, amber `#E8A33D`, sky `#0284C7`, light cards border `#EDEDEB`. **No `font-mono` micro-caps, no `text-[10px]` labels, no serif headings, no orange gradients in these sections** (keep existing graph/trust reference to amber/navy/sky).

### B1. `InterviewExperiences.tsx`
Covered by A3 rewrite — same system applied (no mono, no [10px], light header).

### B2. `RelatedVaults.tsx`
- Remove orange `from-amber-500 to-orange-500` bundle banner → navy `#1F3A5F` pill with amber accent (consistent with CompletePackBanner typography).
- `font-mono` (ctc line, unlock count row) → normal Calibre `text-[13px] text-[var(--text-muted)]`; remove `text-[10px]`/`text-[11px]`.
- Card hover stays amber border; footers align to portal small-text scale.

### B3. `TrustBadgeBar.tsx`
- Bump pill text from `text-xs` micro rows → 13-14px muted with icon; remove tiny `text-[10px]` nothing present — normalize heights/radius to portal scale. Keep chips (light, not orange gradient).

### B4. `CartModal.tsx` (drawer) — biggest offender, restyle to light portal
- **Header**: dark navy header → white/light header: "Your Vault Cart" navy bold title + muted 13px "Combo pricing · server-validated coupons", item count chip, amber close. Remove `font-mono` BEST DEAL chip (dropdown-style full-size chip in amber-300 on navy → light amber badge).
- **Module line items**: `font-mono` round chips → normal; `text-[10px]`/`[11px]` labels → 13px muted.
- **Combo helper / cross-sell cards**: dark navy cards → white bordered cards (`border-[#EDEDEB]`, hover amber) with portal shadow; "Complete Pack · 18-32 LPA · 4 Rounds" in 13px muted (was `text-[10px]`).
- **Coupon section**: `text-[11px] font-mono uppercase` headers → 13px muted sans; coupon chip buttons `text-[10px]` → 12-13px; message line 13px.
- **Payment mode**: keep 3 tiles but portal-style (already sky-active, good); micro-monospace removed.
- **Totals/t&c footers**: `text-[10px]` → 12-13px muted; keep amber Pay CTA (text-sm), SSL/guarantee/verified rows as muted 13px with one-line icons.
- Keep slide-in/full-screen layout + all logic (summarizePackItems, coupons, pay flow) untouched.

### B5. `Footer` quick pass
- Footer already portal-styled; only verify no stray mono/10px (leave as-is unless spotted during QA).

## Acceptance
- `/company/razorpay`: Candidate Experiences section = light portal-style header + cards from **real published reports** (seeded 2 Razorpay + fallback logic); "Share Your Drive Experience" opens SubmitReportModal; submitting returns "Report Submitted for Moderation 🎉".
- Admin moderates (exists): approve → report appears on the company page next visit; reject → never shows.
- Cart drawer + RelatedVaults + TrustBadgeBar visibly match the reader/hero typography (no mono micro-caps/serif/orange gradients at 13px-file).
- `npx tsc --noEmit` (frontend + backend) and `npm run build` clean; QA at `http://localhost:3000/company/razorpay`.