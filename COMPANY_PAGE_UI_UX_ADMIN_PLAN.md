# Company Page: UI/UX + Fully Admin-Editable Plan

> **Scope:** only the company / vault page (`/company/[slug]`) and the admin screens that edit it.
> Nothing else in the app changes. See §11 for the exact isolation rules.
>
> **Inputs:** `Accenture company page — 3T redesign.pdf`, `COMPANY_PAGE_3T_REDESIGN_PLAN.md`
> (product/feature plan), and earlier feedback recorded in `EXPERIENCES_AND_TYPOGRAPHY_PLAN.md`
> and `COMPANY_PAGE_POLISH_PLAN.md` (no tiny fonts, no mono micro-caps, no orange gradients, one clear CTA).
>
> **Goal:** a page that looks **designed by a person with taste**: calm, editorial, confident, a little
> playful in one or two places. It should not look generated. **Every word, number, section and
> ordering is editable from the admin panel**, with draft, preview and publish.

---

## Contents
1. Design direction: why it won't look AI-generated
2. Visual system (scoped to this page)
3. Page architecture: a section-based page
4. Section-by-section UI/UX spec (with admin fields)
5. Interaction, motion and states
6. Mobile experience
7. Accessibility, performance, SEO
8. Admin panel: "Company Page Studio"
9. Data model and API
10. Build phases
11. Isolation: how we guarantee nothing else breaks
12. QA checklist and definition of done
13. Decisions needed

---

## 1. Design direction

### 1.1 The idea: "The route to the offer"
The PDF already contains the line *"The route to the offer"*. We turn it into the page's **one visual
metaphor**, used consistently and sparingly:

| Element | Metaphor treatment |
|---|---|
| Rounds | **Stations on a route line**: a thin horizontal rule with numbered stops, like a metro map |
| Drive Radar | **Departures board**: monospaced status rows ("INVITES · GOING OUT · confirmed by 41") with one subtle flip animation when an update arrives |
| Prep pack | **Ticket**: the ₹99 card has a perforated edge and a stub ("Lifetime · 2026–27") |
| Countdown | **Calendar strip**: days to the test as a horizontal row of day-cells, today highlighted |
| Onboarding | **Checkpoints**: 5 stops after "Offer" on the same route line, continuing the rounds line |

A single, coherent idea carried through details is what makes a page feel authored. Generic AI pages are
a pile of unrelated cards. Keep the metaphor *quiet*: lines, numbers, small notches. No illustrations of trains.

### 1.2 What makes a page look AI-generated, and what we ban

| ❌ Ban | ✅ Instead |
|---|---|
| Purple/blue gradients, glassmorphism, glowing blobs | Flat surfaces; one dark navy band in the hero; colour only where it means something |
| ✨ Sparkles / 🚀 rockets / emoji as icons | Few icons, all from one family (lucide, 1.5px stroke), only where they aid scanning |
| Three identical feature cards in a row | Asymmetric grids (7/5, 8/4), varied section rhythms |
| Everything centred | Left-aligned editorial layout; centring only for a single CTA moment |
| Vague hype copy ("Unlock your potential") | Specific, plain copy with numbers: "4 rounds · 90 min test · coding is eliminatory" |
| Fake stats ("10,000+ students") | Real data or an honest "Being verified" stamp |
| Every card same radius + same shadow | Hierarchy: hairline-bordered cards, one raised card per viewport (primary action) |
| Animated counters, parallax, scroll-jacking | Motion only for state change (≤ 240 ms) |
| Tiny grey 10–11px text | Minimum 13px; body 16px |
| Stock photos of smiling students | No photos. Typography + data carry the page |

### 1.3 Tone of voice (also admin-editable, but the defaults set the bar)
- Talk like a senior who cleared the drive last year: short, direct, kind.
- Numbers before adjectives. "Coding round: 2 questions, 45 min" not "a challenging coding round".
- Every section heading is a **student's question** ("Can you apply, and how?") or a **promise** ("4 rounds. Train, test and track each one.").
- No exclamation marks. No "Unlock". Use "Get", "Start", "See".

---

## 2. Visual system (scoped)

All styles live in **`frontend/src/styles/company-page.module.css`** + scoped CSS variables on the page
root `.cp-root`. **Global tokens in `globals.css` and `tailwind.config.js` are not edited.**

### 2.1 Colour
Built from existing brand tokens (re-declared under `.cp-root`, never changed globally):

| Token | Value | Use |
|---|---|---|
| `--cp-ink` | `#0E2A44` (brand ink) | Hero band, ticket card, footer |
| `--cp-ink-2` | `#10151C` | Headings on light |
| `--cp-paper` | `#F7F6F3` (app bg) | Page background |
| `--cp-card` | `#FFFFFF` | Cards |
| `--cp-rule` | `#E9E7E1` | Hairlines |
| `--cp-text` | `#3E4754` | Body |
| `--cp-muted` | `#5A6470` | Secondary |
| `--cp-money` | `#E8A33D` (brand accent) | **Only** price + primary CTA |
| `--cp-train` | `#0369A1` (sky) | TRAIN chip, learning states |
| `--cp-test` | `#C2410C` | TEST chip, assessment states |
| `--cp-track` | `#0F766E` | TRACK chip, progress/success |
| `--cp-verify` | `#B45309` on `#FEF3C7` | "Being verified" stamp |
| `--cp-accent` | **admin-chosen** from a curated palette | Route line, active station, small highlights |

**Rules:** amber appears only on money and the primary CTA, so the eye learns "amber = act". The three T
colours are used *only* for Train/Test/Track meaning, never as decoration. The per-company accent comes from
a **curated list of 8 pre-tested colours** (all AA contrast on white and on navy). The admin picks from
swatches and can't type a hex, so no admin can make the page ugly or unreadable.

### 2.2 Typography
| Role | Face | Size / line-height | Notes |
|---|---|---|---|
| Display (H1) | **Bricolage Grotesque** 700 (self-hosted via `@fontsource`, loaded **only on this page**) | 44/48 desktop, 32/36 mobile | Gives the page character; tight tracking −0.02em |
| H2 section titles | Bricolage Grotesque 650 | 32/38 → 26/32 | One per section |
| H3 card titles | Carlito/Calibre stack (portal font) 700 | 18/24 | Matches the rest of the portal |
| Body | Carlito stack 400 | 16/26 | Never below 15 on mobile |
| Small / meta | Carlito 400 | 13/20 | Minimum size on the page |
| Eyebrow labels ("BEFORE YOU START") | Carlito 700, uppercase, +0.08em tracking, 12px | — | **Not mono.** Earlier feedback rejected mono micro-caps (decision D2) |
| Numbers (CTC, counts, countdown) | Bricolage, `font-variant-numeric: tabular-nums` | — | Numbers are the hero of this page |
| Departures board only | JetBrains Mono 500, 14px | — | The single deliberate mono use |

Alternative display faces if Bricolage feels too quirky: *Instrument Sans* or *Schibsted Grotesk* (D1).

### 2.3 Layout and spacing
- Container 1200px, 12-column grid, 24px gutters; mobile 16px side gutters.
- Spacing scale 4 / 8 / 12 / 16 / 24 / 32 / 48 / 72 / 96. Sections separated by **96px desktop / 56px mobile**. Generous whitespace is half of "clean".
- Section rhythm alternates so the page breathes: wide → split 7/5 → full-bleed band → split 5/7 → narrow reading column (FAQ at 720px).
- Radius: cards 16px, chips 999px, inputs 10px, ticket 20px with notches.
- Elevation: hairline border by default; `shadow-raised` only on the one primary card in view (hero readiness card, ticket).

### 2.4 Iconography and imagery
- lucide-react only (already installed), 20px, 1.5 stroke, `--cp-muted` colour. Max one icon per list row.
- Company identity is the **text name** (plus an optional admin-uploaded logo with a "show logo" toggle off by default, because of trademark caution).
- Optional admin-uploaded **OG/social image**; a default OG image is generated from page data (name, cohort, CTC) via a static template.

---

## 3. Page architecture: a section-based page

The page becomes an **ordered list of sections**. Each section has a `type`, a `visible` flag, shared
copy fields (eyebrow, title, intro) and type-specific data. The admin can **reorder, hide, duplicate and
edit** any section. Code ships the section *types*; the admin composes the *page*.

```
CompanyPage
├─ settings  (accent, cohort label, SEO, CTA labels, sticky bar, disclaimer, language)
└─ sections[] (ordered)
   ├─ hero
   ├─ stat_strip
   ├─ section_nav        (auto-built from visible sections; labels editable)
   ├─ eligibility_apply
   ├─ rounds_route
   ├─ countdown
   ├─ role_compare
   ├─ prep_pack
   ├─ community_offer    ("Took the test? Get the pack free")
   ├─ drive_radar
   ├─ onboarding
   ├─ comeback
   ├─ experiences        (existing InterviewExperiences, restyled)
   ├─ faq
   ├─ also_preparing
   └─ rich_text          (generic: free-form section for anything new — no code needed)
```

**Default order** = the PDF order. New companies are created from a **template** (§8.6) so they start complete.

**Reader mode** (`?m=` / `?q=`, the existing `CompanyModuleReader`) keeps working unchanged. Train links open it.

---

## 4. Section-by-section spec

Each section lists: **Purpose · Layout · States · Interactions · Admin-editable fields**.
"Shared fields" on every section: `eyebrow`, `title`, `intro`, `visible`, `nav_label`, `anchor_id`, optional `_hi` (Hinglish) variants.

### 4.1 Hero
**Purpose:** in 5 seconds: *which company, which batch, what do I do now.*

**Layout (desktop):** full-bleed `--cp-ink` band, 7/5 split.
- Left: breadcrumb (white 60%) → 3T chips (Train sky / Test orange / Track teal, outlined, 12px) → **H1** "Accenture placement prep" → sub-line "2026–27 freshers · ASE & Advanced ASE" → **Your next step** row: a dark card with one sentence + one amber arrow button.
- Right: white **Readiness card**, raised. Eyebrow "TEST · FREE READINESS CHECK", title "How ready are you for Accenture?", meta "20 questions · 25 min · instant score by round", primary amber button "Start free check", and a tiny line "1,240 students took it this month" **only if real**.
- Bottom edge: the route line begins here (thin accent line running into the stat strip) as a subtle thread through the page.

**States:**
| State | Next step text | Readiness card |
|---|---|---|
| Guest | "Take the 25-min readiness check. Your score shows which round to fix first." | Start free check (login to see score) |
| Logged in, no attempt | Same + uses first name | Start free check |
| Attempted | "Your weakest round is **Coding**. Today: loops & strings, 30 min." → links to that round | Score ring (e.g. 62%) + 4 mini bars per round + "Retake" |
| Pack owned | "Next: Sectional mock — Cognitive" | Same + "Pack active" stamp |

**Admin fields:** H1 text, sub-line, cohort label, chip visibility, next-step copy per state (with `{name}`, `{weak_round}` tokens), readiness card title/meta/button label, linked assessment id, social-proof line (manual text, or auto from attempts with a minimum threshold), hero background (`ink` / `paper` toggle).

### 4.2 Stat strip
**Purpose:** the numbers students actually compare.

**Layout:** white band, 5 columns desktop / horizontal scroll-snap on mobile. Each stat: label (13px muted) → value (Bricolage 28px tabular) → **stamp** below.
- Stamp types: `Verified · Oct 2026` (teal, links to source) · `Being verified` (amber) · `From candidate reports` (sky) · `Confirm from notice` (grey).
- Drive status stat: `Open` (teal dot, pulsing once on load) / `Closed` / `Unknown` → links to Drive Radar.

**Admin fields:** a repeatable list (add/remove/reorder, max 6): label, value, unit, stamp type, source URL, verified date, link target. Values left blank render "—" with "Being verified". **No auto-filled numbers.**

### 4.3 Section nav ("Your Accenture loop")
**Layout:** chips row; becomes **sticky under the header** after the hero scrolls away, with scroll-spy (active chip filled ink). Horizontal scroll on mobile with a fade edge; the active chip auto-scrolls into view.
**Admin fields:** label shown before chips, per-section `nav_label`; order follows section order; hidden sections disappear automatically.

### 4.4 Eligibility + How to apply
**Layout:** 6/6 split cards.
- Eligibility: definition list rows (label left muted, value right ink, hairline between rows). Footer: "Last confirmed 12 Oct 2026 · Official careers page ↗".
- **Eligibility self-check (UX upgrade):** a small "Check me" toggle turns rows into quick yes/no pills ("Passing year 2026? ✓"). The result is "You're eligible" or "Check backlog policy". Stored locally; optional.
- How to apply: numbered steps with large outlined numerals (Bricolage), title + one-line body; step 2 can link to Drive Radar.

**Admin fields:** eligibility rows (label, value, optional yes/no check question), source URL, last-confirmed date; apply steps (title, body, optional link + label).

### 4.5 Rounds: the route line (signature section)
**Purpose:** the heart of the page. Pick a round → see the Train / Test / Track loop for it.

**Layout:**
- Top: **route line** across the card: 4 stations (numbered circles on an accent line) labelled "Cognitive & Technical · Coding · Communication · Interview". The line between stations fills with `--cp-track` as the student clears rounds (Track data).
- Selected station: the circle fills, and a small notch points down to the panel.
- Panel (5/7 split):
  - Left: **pattern card**: sections table (section · questions · minutes), "Eliminatory" tag, "Pattern from Sep 2026 drive" stamp.
  - Right: **the loop**, 3 stacked rows, each with its T colour on the left edge:
    - **Train**: "6 topics · 42 notes" → topic chips (click opens existing reader).
    - **Test**: "Sectional mock · 25 Q · 30 min" → Start / Locked (pack) / Best score.
    - **Track**: mini bar per topic (weakest first) or the empty state "Take the mock to see your weak topics".
- Keyboard: ←/→ moves between stations; URL hash `#round-coding` deep-links.

**Admin fields:** stations (add/remove/reorder): title, short label, icon, pattern sections table, eliminatory flag, pattern-verified date, last drive date, linked module ids (Train), linked assessment ids (Test), topic list, custom tip ("Most students lose marks on…").

### 4.6 Countdown plan
**Layout:** 4/8 split.
- Left (dark card): "My Accenture test date" date input → on set, flips to "**12 days** to go" (Bricolage 40px).
- Below: **Daily 10** card: "10 Accenture-pattern questions · 🔥" (no emoji: a small flame glyph drawn in CSS or lucide `Flame`) "streak 4 days" → Start.
- Right: **calendar strip**: one cell per remaining day (scroll on mobile), each cell labelled with that day's focus ("Quant", "Coding", "Mock"). Today outlined in accent; done days get a check; the test day is marked by a flag.
- Guest: the strip shows a sample 14-day plan, greyed, with "Set your date to personalise".

**Admin fields:** title/intro, default plan length, the **plan recipe** (ordered blocks: round, minutes/day weight, which days get mocks), Daily 10 title/description, question pool source (assessment/skill ids), streak label.

### 4.7 Role compare (ASE vs Advanced ASE)
**Layout:** segmented control "Aim for ASE | Aim for Advanced ASE" (proper styled control, fixing the PDF's raw buttons) above a 3-column comparison table: attribute · ASE · AASE. The chosen role column gets the accent top border; the rest of the page (rounds, plan) adapts, e.g. AASE adds an "Advanced coding" station.
**Admin fields:** roles (key, title, CTC, stamp), comparison rows (attribute + value per role), per-role extra stations, default role.

### 4.8 Prep pack (Free vs ₹99): the ticket
**Layout:** 5/7 split.
- Free card: white, plain, checklist (teal checks), ghost button "Start free".
- **Ticket card**: `--cp-ink`, perforated vertical edge with two semicircle notches, stub on the right with "₹99 · one-time · lifetime" rotated label. "Updated for 2026–27" amber tag. Checklist (white). Primary amber "Get the pack: ₹99" + ghost "Preview 3 questions" (opens existing `ModulePreviewModal` pattern). Refund line underneath in 13px.
- Owned state: the ticket shows a "**Pack active** · since 3 Oct" stamp and the button becomes "Open question bank".

**Admin fields:** both cards' titles, price label, feature bullets (reorderable), CTA labels, preview question ids, refund text, update tag text, owned-state copy. **The price shown is read from the real pack price (single source), never typed separately**, so the page can't show a different price from checkout.

### 4.9 Community offer ("Took the test? Get the pack free.")
**Layout:** full-width soft teal band, left text, right button "Share my experience" → opens the existing `SubmitReportModal` (restyled only via props/className, not rewritten).
**Admin fields:** title, body, button label, on/off.

### 4.10 Drive Radar: the departures board
**Layout:** 7/5 split with Onboarding (as in the PDF).
- Card header: eyebrow "TRACK THE DRIVE", title "Drive Radar", 13px "Updates reported by students and confirmed by others".
- Rows in JetBrains Mono 14px: `STATUS DOT · TYPE (APPLICATIONS / INVITES / RESULTS / ONBOARDING) · message · date · "confirmed by 41"`. The newest row gets a one-time 240ms character-flip animation (disabled with reduced motion).
- Footer: "Report an update" (ink) + "Notify me of new updates" (outline, toggles to "Notifying ✓").
- Empty state: "No updates yet this season. Be the first to report one."

**Admin fields:** title/intro, row type labels + colours (from the curated set), manual entries (type, text, date, confirmed count, pinned), moderation of student reports (approve/reject), min confirmations to auto-show, button labels.

### 4.11 Onboarding tracker + Comeback (right column next to Radar)
- **Onboarding**: "Selected? Track to day one", progress "2 of 5 done" with a 5-segment bar continuing the route line; checklist rows with a date field each. Guest: rows visible, checkboxes prompt login.
- **Comeback** (soft red/peach card): "Didn't clear this time?" + body + link "Get my comeback plan" → shows weakest round + open drives.

**Admin fields:** onboarding steps (title, hint, optional doc link), comeback title/body/link label, visibility.

### 4.12 Candidate experiences (existing component, restyled)
Keep `InterviewExperiences` logic. Wrap it in the new section frame (eyebrow + title + intro). Visual changes via a `variant="cp"` prop only.
**Admin fields:** title/intro, max shown, visibility.

### 4.13 FAQ ("Questions students ask")
**Layout:** narrow 720px column, **left-aligned** (the PDF's centred heading looks off), accordion rows with a hairline between, + / − icon, first item open. Search-friendly: all answers present in HTML (SSR), plus `FAQPage` JSON-LD.
**Admin fields:** Q&A list (reorder), answer in limited markdown (bold, italic, links, lists), Hinglish variants.

### 4.14 Also preparing for
**Layout:** heading + line "Your readiness score carries over." + chips of other companies (text names), and an ink "Compare drives" chip that links to `/compare?c=accenture,tcs`.
**Admin fields:** company picker (multi-select, ordered), copy, compare label.

### 4.15 Rich text (generic)
For anything new: title + markdown body + optional callout style (note / warning / tip). Lets the team add a section without a deploy.

### 4.16 Sticky bottom bar (replaces the current "Unlock Now" bar on this layout only)
One label that follows state: `Start free readiness check` → `Continue: Coding mock` → `Get the pack: ₹99` → hidden when owned. Appears after the hero leaves the viewport. Hides while the cart, a modal, or the keyboard is open.
**Admin fields:** labels per state, on/off.

### 4.17 Footer disclaimer
The existing `Footer` stays. Above it, a page-level line: "Not affiliated with Accenture. Company names are used for identification only." **Admin field:** disclaimer text.

---

## 5. Interaction, motion and states

**Motion rules** (all under `prefers-reduced-motion: no-preference`):
| Moment | Motion |
|---|---|
| Section enters viewport | 8px rise + fade, 220ms, once. **Only** section titles, not every card |
| Round station change | Panel cross-fade 160ms; route-line fill animates 320ms |
| Countdown set | Number counts **once** from 0 to N in 400ms (a real calculation, not decoration) |
| Radar new row | One-time character flip, 240ms |
| Chips / buttons | Press scale 0.98, 120ms |
| Nothing else | No parallax, no infinite animations, no hover-tilt cards |

**Universal states** every data-driven section must design for:
1. **Loading**: skeletons that match the real layout (not spinners).
2. **Empty**: a sentence that tells the student what to do, never a blank box (fixes PDF issue R2).
3. **Guest**: content visible; actions ask for login through the existing `AuthRequiredModal`.
4. **Error**: inline "Couldn't load this part. Retry", the rest of the page still works (each section is error-bounded).
5. **Unverified data**: "Being verified" stamp, never a fake value.

**CTA hierarchy:** max **one amber button per viewport**. Secondary = ink outline; tertiary = text link.

---

## 6. Mobile experience (designed first, not shrunk)

- Hero: H1 32px; the readiness card moves **directly under the H1** (it is the main action); next-step card below it.
- Stat strip: horizontal snap carousel with the first 2.5 stats visible (signals scroll).
- Section nav: sticky under the header (56px), horizontal scroll, auto-scroll active chip.
- Rounds: stations become a horizontal swipeable row; panel stacks pattern → Train → Test → Track.
- Countdown: date input full width; calendar strip horizontally scrollable, today centred.
- Ticket card: stub moves to the bottom (horizontal perforation).
- Radar + Onboarding stack; Comeback after Onboarding.
- Sticky bottom bar respects `--safe-bottom` and the app tab bar (reuse existing `--tabbar-total`).
- Tap targets ≥ 44px; no hover-only affordances (Tailwind is already configured for hover-capable devices).

---

## 7. Accessibility, performance, SEO

**Accessibility (WCAG 2.2 AA):** colour contrast ≥ 4.5:1 (the curated accent palette is pre-validated);
visible focus rings (2px accent + 2px offset); route stations are a proper `tablist`; accordion uses
`button[aria-expanded]`; date input labelled; radar is a `<table>` or a list with `aria-live="polite"` for new updates;
skip-link to "Rounds"; all icons decorative (`aria-hidden`) or labelled.

**Performance budget:** LCP < 2.5s on mid-range Android over 4G; CLS < 0.05; page JS added < 60KB gzip.
- SSR the hero, stat strip, eligibility and rounds (already `getServerSideProps`). Lazy-load below-fold sections with `next/dynamic` + IntersectionObserver.
- Bricolage subset (latin, 2 weights), `font-display: swap`, preloaded **only on this route**.
- No new heavy dependencies (no animation library beyond the already-installed framer-motion, which is used sparingly or replaced by CSS).

**SEO:** H1 with the company name and batch; `<title>` and meta description from admin (with a smart default);
JSON-LD `BreadcrumbList` + `FAQPage` (escape `<` to prevent script break-out); canonical URL; OG image; FAQ answers server-rendered.

**Analytics events** (existing analytics route): `cp_view`, `cp_readiness_start`, `cp_round_select`,
`cp_test_date_set`, `cp_daily10_start`, `cp_pack_cta`, `cp_preview_open`, `cp_radar_report`, `cp_notify_on`, `cp_faq_open`.

---

## 8. Admin panel: "Company Page Studio"

A new admin view opened from the existing company list (`CompanyHubManager`) via a new **"Design page"**
button per company. The existing company form is not modified, apart from that one added button.

### 8.1 Layout (desktop admin)
```
┌──────────────────────────────────────────────────────────────────────────┐
│ ← Companies  Accenture · Page Studio      Draft • autosaved 10:42        │
│ [Preview ▾ Desktop | Mobile]  [History]  [Save draft]  [Publish ▸]       │
├───────────────┬───────────────────────────────┬──────────────────────────┤
│ SECTIONS      │ EDIT: Rounds — route line     │ LIVE PREVIEW (iframe)    │
│ ⋮⋮ Hero    👁 │ Eyebrow  [THE ROUTE TO…]      │                          │
│ ⋮⋮ Stats   👁 │ Title    [4 rounds. Train…]   │  (renders the real page  │
│ ⋮⋮ Nav     👁 │ Intro    [Pick a round…]      │   with the draft, scrolls│
│ ⋮⋮ Rounds ●👁 │ Stations ─────────────────    │   to the section being   │
│ ⋮⋮ Countdown  │  1 Cognitive & Tech  ✎ ⋮⋮ ✕   │   edited)                │
│ ⋮⋮ Pack    👁 │  2 Coding            ✎ ⋮⋮ ✕   │                          │
│ …             │  + Add station                │                          │
│ + Add section │ ⚠ 2 values have no source     │                          │
│ ⚙ Page settings│                              │                          │
└───────────────┴───────────────────────────────┴──────────────────────────┘
```
- **Left:** section list: drag to reorder (keyboard: ⌥↑/↓), eye toggle, duplicate, delete (confirm), "+ Add section" from the catalog (§3).
- **Centre:** auto-generated form for the selected section (schema-driven, §8.3).
- **Right:** live preview iframe of `/company/<slug>?preview=<token>` with Desktop/Mobile width toggle; clicking a section in the preview selects it in the list.
- Mobile admin: list → form → preview as three tabs.

### 8.2 Page settings panel
Accent swatch (curated 8), hero style (ink/paper), cohort label, H1 override, SEO title/description with
live Google-snippet preview and character counters, OG image upload, sticky bar on/off + labels, disclaimer,
default language, Hinglish on/off, "show logo" toggle + upload.

### 8.3 Schema-driven forms (how "everything is editable" stays maintainable)
Each section type declares a **schema** in one shared file
`shared/companyPage/sectionSchemas.ts` (used by backend validation **and** admin forms):

```ts
export const roundsRouteSchema = defineSection('rounds_route', {
  eyebrow: text({ max: 40 }),
  title: text({ max: 80, required: true }),
  intro: text({ max: 240, multiline: true }),
  stations: list({ max: 8, item: {
    title: text({ max: 40, required: true }),
    pattern: list({ max: 6, item: { name: text(), questions: int({ min: 0 }), minutes: int({ min: 0 }) } }),
    eliminatory: bool(),
    pattern_verified_at: date(),
    module_ids: refMany('module'),
    assessment_ids: refMany('assessment'),
    topics: tags({ max: 12 }),
    tip: text({ max: 160 }),
  }}),
});
```
Field kinds: `text`, `markdown` (limited), `int`, `money` (read-only link to pack price), `date`, `url`, `bool`,
`select`, `swatch`, `image` (upload), `list` (reorderable), `tags`, `ref`/`refMany` (pickers for modules,
assessments, companies). One generic `<SchemaForm>` renders all of them, so **adding a field is a one-line change** and never needs a new form screen.

### 8.4 Editing workflow
- **Draft / Published** are separate documents. The public page always reads Published; the preview token reads Draft.
- **Autosave** draft every 3s of inactivity (with "Saved" indicator); explicit "Save draft" too.
- **Publish** shows a diff summary ("Rounds: 2 fields changed · FAQ: 1 added") and validation results:
  - ❌ blocking: required fields empty, invalid URLs, title over limit.
  - ⚠ warnings: numbers without a source, verified date older than 60 days, section with no content but visible, missing Hinglish when Hinglish is on.
- **Schedule publish** (date-time), e.g. switch the cohort label on 1 Jan.
- **History:** the last 30 published versions with author + time; one-click "Restore as draft".
- **Copy from…** another company's page (copies structure + generic copy, clears company-specific numbers).
- **Lock:** if two admins open the same page, the second sees "Rahul is editing (2 min ago)" and opens read-only, or takes over.

### 8.5 Media
Image upload reuses the existing poster upload pattern (`posters.routes.ts` style: multer, size limit, served via a guarded route). Images are stored per company page in `backend/uploads/company-pages/`.

### 8.6 Templates
- "Mass recruiter (4 rounds)" template = the Accenture structure with generic copy.
- "Product company" template = rounds + experiences + pack, no countdown/onboarding.
- New company page → choose template → everything pre-filled with placeholder **instructions** (shown greyed in the admin, never published as text).

### 8.7 Permissions and audit
Reuses existing RBAC: `companies.read` to view the studio, `companies.write` to edit and publish. Every publish, restore and schedule writes an audit entry (`company_page.publish` etc.) via the existing `appendAudit`.

---

## 9. Data model and API

### 9.1 Storage
A new collection, separate from the company record, so the existing company object and its API response are untouched:

```ts
interface CompanyPageDoc {
  company_id: string;
  enabled: boolean;              // false → old vault page renders (feature flag per company)
  draft: CompanyPageContent;
  published: CompanyPageContent | null;
  published_at: string | null;
  published_by: string | null;
  scheduled: { content: CompanyPageContent; at: string } | null;
  history: { content: CompanyPageContent; at: string; by: string }[];  // capped at 30
  editing_lock: { user_id: string; at: string } | null;
  updated_at: string;
}
interface CompanyPageContent {
  schema_version: 1;
  settings: PageSettings;
  sections: { id: string; type: SectionType; visible: boolean; data: Record<string, unknown> }[];
}
```
Stored as `db.company_pages` (editorial, low-write: fine in the JSON store; added the same additive way
`loadDb` adds other collections). History is capped so the file does not grow unbounded.
Write-heavy student data (streaks, radar confirmations, onboarding ticks) follows the Postgres plan in
`COMPANY_PAGE_3T_REDESIGN_PLAN.md` §4.2.

### 9.2 Endpoints (all new; no existing endpoint changes shape)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/company-pages/:slug` | public | Published content (+ `enabled`) |
| GET | `/api/company-pages/:slug/preview?token=` | signed preview token | Draft content |
| GET | `/api/admin/company-pages/:companyId` | `companies.read` | Full doc for the studio |
| PUT | `/api/admin/company-pages/:companyId/draft` | `companies.write` | Save draft (schema-validated) |
| POST | `/api/admin/company-pages/:companyId/publish` | `companies.write` | Publish (validates, versions, audits) |
| POST | `/api/admin/company-pages/:companyId/schedule` | `companies.write` | Schedule |
| POST | `/api/admin/company-pages/:companyId/restore/:index` | `companies.write` | Restore version to draft |
| POST | `/api/admin/company-pages/:companyId/copy-from/:otherId` | `companies.write` | Copy structure |
| POST | `/api/admin/company-pages/:companyId/preview-token` | `companies.read` | Short-lived (30 min) signed token |
| POST | `/api/admin/company-pages/:companyId/media` | `companies.write` | Image upload |
| PUT | `/api/admin/company-pages/:companyId/enabled` | `companies.write` | Turn the new layout on/off |

New router file `backend/src/routes/companyPages.routes.ts`, mounted with **two new lines** in `server.ts`.
Validation uses the shared schemas; unknown fields are rejected; markdown is sanitised (no raw HTML).
Lost-update safety: handlers do any `await` **before** `loadDb()`, and draft saves carry an `updated_at`
precondition (409 if stale), so two admins can't silently overwrite each other.

### 9.3 Frontend
- `frontend/src/pages/company/[slug].tsx`: `getServerSideProps` additionally fetches `/api/company-pages/:slug`.
  If `enabled && published` → render `<CompanyPageV2 />`, else render the **existing page unchanged**. This is the only edit to the existing file.
- New folder `frontend/src/components/companyPage/` (sections, primitives, `SectionRenderer`, `SchemaForm`, studio).
- New `frontend/src/lib/companyPagesApi.ts`.
- New admin entry: `frontend/src/components/admin/companyPage/CompanyPageStudio.tsx` + one button in `CompanyHubManager.tsx`.

---

## 10. Build phases (UI/UX + admin only)

| Phase | Deliverable | Est. |
|---|---|---|
| **P0 Design lock** | High-fidelity Figma (or HTML) of all sections: desktop + mobile, all states; final font + accent palette; copy deck for Accenture. Review against §1.2 ban list | 3–4 days |
| **P1 Foundations** | `company-page.module.css`, scoped tokens, fonts on this route only, primitives (Section frame, Eyebrow, Stamp, Chip, Ticket, RouteLine, Segmented, Accordion, Skeleton), Storybook-like `/admin`-only preview route | 3 days |
| **P2 Data + API** | `CompanyPageDoc`, shared schemas, public + admin endpoints, preview tokens, validation, history, audit, tests | 4 days |
| **P3 Static sections** | Hero, Stat strip, Section nav, Eligibility/Apply, Role compare, Prep pack (ticket), Community offer, FAQ, Also preparing, Rich text, Disclaimer, Sticky bar, SEO/JSON-LD | 5–6 days |
| **P4 Studio v1** | Section list (reorder/hide/add), SchemaForm, page settings, live preview iframe, draft/publish, validation | 5–6 days |
| **P5 Interactive sections** | Rounds route line (with the existing reader), Countdown + Daily 10 UI, Drive Radar board, Onboarding, Comeback, Experiences variant. Sections bind to real data where the backend exists, otherwise to admin-entered content | 6–7 days |
| **P6 Studio v2** | History/restore, schedule, copy-from, templates, edit lock, media upload, Hinglish fields | 4 days |
| **P7 Polish + QA** | Motion pass, a11y audit, Lighthouse, real-device testing (low-end Android, iPhone SE), copy review, Accenture launch | 3–4 days |

**Total about 6–7 weeks for one developer.** P3 + P4 together are the first shippable milestone: an Accenture page that is live, beautiful, and fully editable.

---

## 11. Isolation: guaranteeing nothing else is affected

| Rule | How it's enforced |
|---|---|
| Old company pages keep working | Per-company `enabled` flag; default **off**. With no published page doc, the existing JSX path runs byte-for-byte unchanged |
| No global style changes | All styles in a CSS module + `.cp-root` scoped variables. `globals.css` and `tailwind.config.js` are **not edited**. Fonts imported only inside the V2 component |
| No existing API changes | Only **new** routes. `GET /api/companies/:slug` response unchanged |
| Existing components reused, not rewritten | `CompanyModuleReader`, `SubmitReportModal`, `InterviewExperiences`, `ModulePreviewModal`, `AuthRequiredModal`, cart all used as-is. Styling differences go via an optional `variant` prop whose default is today's look |
| Checkout untouched | The pack button calls the existing `addMany`/cart flow with existing line types |
| Header, footer, nav, other pages untouched | V2 renders inside the existing `AppShell`; footer gets the disclaimer as a sibling block, not a Footer edit |
| Data safety | `company_pages` added additively in `loadDb`; no migration of existing collections; history capped |
| Admin | New studio component; `CompanyHubManager` gets one button only |
| Verification | Existing backend `npm test` and frontend `npm test` stay green; new tests for schemas and routes; a visual check that `/company/zscaler` (flag off) is unchanged before and after |

Rollback = toggle `enabled` off for the company (instant, no deploy).

---

## 12. QA checklist and definition of done

**Design quality ("not AI-looking") review:** walk the page and tick each:
- [ ] One visual metaphor (route) visible in rounds, ticket, onboarding, and nowhere forced
- [ ] No gradients, glass, emoji icons, sparkles, stock imagery
- [ ] At most one amber CTA per viewport
- [ ] No text under 13px; body 16px
- [ ] Every number either sourced (stamp) or "Being verified"
- [ ] Section rhythms vary (not 5 identical card grids)
- [ ] Copy reads human: specific, numeric, no hype words
- [ ] Empty/guest/error states designed for every data section

**Functional:**
- [ ] Every visible string and number on the page can be changed in the Studio and published without a deploy
- [ ] Reorder / hide / add sections works; preview matches the published result
- [ ] Draft never leaks publicly; preview token expires
- [ ] Restore from history works; audit entries written
- [ ] Price on the page = price in checkout

**Quality gates:**
- [ ] Lighthouse mobile: Performance ≥ 90, Accessibility 100, SEO 100
- [ ] axe: 0 serious issues; keyboard-only run-through passes
- [ ] Tested on a low-end Android (Chrome), iPhone SE (Safari), and desktop Chrome/Edge/Firefox
- [ ] Backend + frontend typecheck and test suites green; flag-off company pages unchanged

---

## 13. Decisions needed

| ID | Decision | Recommendation |
|---|---|---|
| D1 | Display font | **Bricolage Grotesque** (character) · alternatives Instrument Sans / Schibsted Grotesk |
| D2 | Eyebrow labels: mono (as in the PDF) vs sans small caps | **Sans small caps**, honouring earlier "no mono micro-caps" feedback; mono kept only for the Drive Radar board |
| D3 | Hero background | **Dark ink band** (as in the PDF) for strong first impression |
| D4 | Company logo on the page | **Off by default** (trademark caution), admin toggle |
| D5 | Design-lock format | Figma mock vs an HTML prototype I build directly in code. **HTML prototype** is faster and is exactly what ships |
| D6 | First company | **Accenture**, then the template for TCS / Infosys / Wipro / Cognizant / Capgemini |
