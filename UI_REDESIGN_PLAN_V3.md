# TieEdu — Warm Paper UI Plan (v3, full)

> **Goal** (owner, 2026-10-28): give TieEdu the exact visual system and element
> set of tarko-ai.com — same colours, fonts, type, shapes, depth, motion and
> page elements — filled with TieEdu's own content. **The TieEdu logo does not
> change colour.**
>
> **How this was researched** (2026-10-28): Tarko's two production stylesheets
> (360 KB) and homepage HTML were downloaded and parsed for every design token;
> the full homepage (15,969 px tall at 1440 px wide) and the mobile layout
> (390 px) were rendered in headless Chrome and read section by section. Every
> nav link (`/#tools`, `/#examprep`, `/#pyqs`, `/#pricing`, `/#parents`) is an
> anchor on that one page, so the homepage *is* the full public design. All
> colour pairs below were contrast-computed, not eyeballed.

## Contents

0. [Scope: what is matched, what stays TieEdu's](#0-scope)
1. [Why Tarko's UI feels good — and why TieEdu's currently doesn't](#1-diagnosis)
2. [Colour — light](#2-colour--light)
3. [Colour — dark](#3-colour--dark)
4. [Colour rules (incl. the logo)](#4-colour-rules)
5. [Typography](#5-typography)
6. [Layout grid and spacing](#6-layout-grid-and-spacing)
7. [Shape, depth, texture](#7-shape-depth-texture)
8. [Motion](#8-motion)
9. [Element catalogue — all 17 homepage elements](#9-element-catalogue)
10. [Core components](#10-core-components)
11. [Applying it across TieEdu](#11-applying-it-across-tieedu)
12. [Mobile](#12-mobile)
13. [Implementation in this codebase](#13-implementation)
14. [Phases, effort, checks](#14-phases)
15. [Risks](#15-risks)
16. [Decisions needed](#16-decisions-needed)
17. [Owner's pasted elements (to add)](#17-owners-pasted-elements)
- [Appendix A — complete token sheet](#appendix-a--complete-token-sheet)

---

## 0. Scope

**Matched exactly**
- All colour values (light and dark), tints, chart series, shadows, textures.
- Fonts and the full type scale (size, line height, tracking, weight).
- Grid, spacing, radii, edges, shadows, motion curves and durations.
- Every element type on the page (§9): promo bar, pill nav, hero with marker, product mock-up with floating chips, fanned card carousel, path timeline, paper marquee, audience grid, chat demo, research bento, benchmark bars, video carousel, pricing card, FAQ, closing band, footer, cookie card.

**Stays TieEdu's**
- **Logo, in its current colours** (`#F84109` orange plus its existing marks). See §4.
- Name, words, page content, data, photos and illustrations. No Tarko mascot (the robot), no Tarko copy, no Tarko numbers.
- TieEdu's honesty rules: every number shown must come from TieEdu's own records or a real cited source; countdowns only to real dates; no app-store badges (TieEdu is a PWA — an Install button takes their place).

---

## 1. Diagnosis

**Tarko** works on one warm temperature with two brand colours:
cream page `#FFF8EE` · **warm-brown text `#2A1E14` (not black)** · beige borders `#E8DFD0` · ink-tinted shadows · amber primary `#FFA41B` (always with dark text) · one cool colour, deep teal `#0B4F4A`, used as a contrast band.

**TieEdu today**: cool text and navy (`#10151C`, `#3E4754`, `#0E2A44`) against hot red-orange (`#CC3607`) and amber (`#E8A33D`) on warm paper, plus seven more accents (mint, blue, orange, teal, purple…), and four font families (Figtree, Bricolage Grotesque, Source Serif 4, JetBrains Mono). Legibility is already good (body 8.7:1); **harmony** is the problem — the temperatures fight and there is no single visual idea.

---

## 2. Colour — light

TieEdu keeps colours as RGB channels (`--rgb-*` in `frontend/src/styles/globals.css`) so Tailwind can apply opacity. New values map onto **existing token names** wherever the role exists, so most of the site re-colours without touching components.

| Role | Value | TieEdu token (old value) | Contrast |
|---|---|---|---|
| Page (ground) | `#FFF8EE` | `--rgb-bg-app` (`#F7F6F3`) | — |
| Pane / alt section | `#FBF4E8` | `--rgb-bg-app-warm` (`#FCFBF8`) | — |
| Surface (cards) | `#FFFFFF` | `--rgb-bg-surface` (same) | — |
| Sunk (wells, hover) | `#F5EEE2` | `--rgb-bg-surface-hover` (`#F3F2EE`) | muted text 5.7:1 |
| Border | `#E8DFD0` | `--rgb-border-subtle` (`#E9E7E1`) | — |
| Edge (neutral under-edge) | `#E0D5C2` | **new** `--rgb-edge` | — |
| Border strong (inputs) | `#8A7A68` | `--rgb-border-strong` (`#D6D2C8`) | 3.9:1 (UI ≥3) |
| Ink — headings **and** body | `#2A1E14` | `--rgb-ink`, `--rgb-text-heading`, `--rgb-text-body` | 15.4:1 |
| Ink muted | `#6B5B4B` | `--rgb-text-muted`, `--rgb-text-light` | 6.2:1 |
| Primary (amber) | `#FFA41B` | `--rgb-signal` (`#CC3607`) | fill only |
| Primary edge | `#D9800A` | `--rgb-signal-hover` (`#B83006`) | — |
| On primary | `#2A1E14` | **new** `--rgb-on-primary` | 8.2:1 |
| Primary tint / on | `#FFE7BF` / `#6B3E00` | `--rgb-signal-soft` / `--rgb-signal-ink` | 7.5:1 |
| Secondary (teal) | `#0B4F4A` | **new** `--rgb-secondary` | 8.9:1 as text |
| Secondary tint / on | `#D3EAE6` / `#0B4F4A` | **new** | 7.5:1 |
| Hero band / on / muted | `#0B4F4A` / `#FFF8EE` / `#A9CFC9` | `--rgb-brand-ink` (navy `#0E2A44`) | 8.9 / 5.6:1 |
| Hero edge / track / well / hairline | `#083B37` / `#FFFFFF29` / `#FFFFFF14` / `#FFFFFF2E` | **new** | — |
| Highlight (marker) | `#FFD27A` | **new** `--rgb-highlight` | ink on it 11.4:1 |
| Info / tint | `#2B3FB3` / `#E3E7FF` | `--rgb-info*` (`#0369A1`) | 8.1 / 7.0:1 |
| Success / tint | `#146C45` / `#DDF1E7` | `--rgb-success*` (`#157A3B`) | 6.1 / 5.5:1 |
| Danger / tint | `#B42318` / `#FCE3DF` | `--rgb-danger*` (same) | 6.2 / 5.4:1 |
| Rose tint / on | `#FCE4EC` / `#8A2346` | **new** | 7.2:1 |
| Series 1–6 / other | `#2A78D6 #EB6834 #1BAF7A #EDA100 #E87BA4 #008300` / `#A39787` | **new** `--rgb-series-*` | charts |
| Paper rule | `#EBDDC6` | **new** | texture |
| Pop / device shadow colour | `#2A1E1447` / `#2A1E1473` | shadows | — |
| Focus ring | `#2A1E14` | focus | — |
| Recording / live | `#FF3B30` / `#DC2626` | **new** | mic, live badges |
| **Logo** | **unchanged** | `--rgb-logo` `#F84109` (kept) | 3.5:1 on ground (graphics ≥3) |

**Retired as UI colours**: `money #E8A33D` (amber is now the one action colour), `brand-mint`, `train`, `test`, `track`, `purple`, `warning` orange. Learning-type colours move to `series-1/2/3`. The logo keeps `#F84109`, used **only** in the logo.

---

## 3. Colour — dark

TieEdu's default theme is "system", so dark ships with light.

| Role | Value | Contrast |
|---|---|---|
| ground / surface / sunk / pane | `#121010` / `#1C1917` / `#262220` / `#1A1715` | — |
| border / strong / edge | `#36302B` / `#80746A` / `#050404` | — |
| ink / muted | `#F7F1E8` / `#B4A898` | 16.9 / 8.1:1 |
| primary / edge / on | `#FFB547` / `#B86E00` / `#2A1E14` | 9.2:1 |
| primary tint / on | `#3A2A12` / `#FFD08A` | 9.6:1 |
| secondary / on / tint / on-tint | `#5CC2B5` / `#0B201E` / `#12322F` / `#9FE0D6` | — |
| hero / on / muted / edge | `#0F3B37` / `#F7F1E8` / `#9FCBC4` / `#071F1D` | 11.0:1 |
| info / tint / on | `#3F51C4` / `#1D2347` / `#AAB6FF` | — |
| success / tint · danger / tint | `#4ED19A` / `#12301F` · `#FF8A7A` / `#3A1A16` | 9.9 · 8.3:1 |
| rose tint / on | `#3D1A26` / `#F4A6C0` | — |
| highlight | `#7A5512` | — |
| series 1–6 / other | `#3987E5 #D95926 #199E70 #C98500 #D55181 #008300` / `#6E655C` | — |
| paper rule / pop / device shadow | `#2E2824` / `#00000099` / `#000000CF` | — |

The existing dark "legacy remap" block at the end of `globals.css` (which re-points `bg-white`, `text-gray-600`, etc.) is re-pointed to these values in the same change.

---

## 4. Colour rules

1. **The logo is never recoloured.** There is one logo file (`public/logo.svg`), with no dark version. On ground or surface it sits directly; on the teal band and in dark mode it sits on a small cream plate (`#FFF8EE`, radius md) so its colours stay exactly as they are.
2. Nothing else uses the logo's orange-red. Amber `#FFA41B` is the only action colour.
3. **No white text on amber** (2.0:1). Amber fills carry `on-primary` ink.
4. **No amber text on light backgrounds** (1.9:1). Amber as text is allowed only on the teal band (4.7:1, large text) and in dark mode (10.8:1).
5. **One teal band per screen.**
6. **Shadows are ink-tinted** on light, black on dark — never neutral grey.
7. Charts and heatmaps use only `series-*`.
8. **No hex values in components** — tokens only (enforced by a test, §13).

---

## 5. Typography

| Use | Font | Weights | Replaces |
|---|---|---|---|
| Display — headings, buttons, numbers, prices | **Poppins** | 500 · 600 · 700 · 800 | Bricolage Grotesque |
| Body — UI and reading (Devanagari native) | **Mukta** (fallback Noto Sans Devanagari) | 400 · 500 · 600 · 700 | Figtree, Source Serif 4 (see D3) |
| Mono — eyebrows, tags, badges, codes, countdowns, URLs | **JetBrains Mono** | 400 · 500 · 700 | JetBrains Mono (kept; widened role) |

Stacks: display `Poppins, Mukta, system-ui, sans-serif` · body `Mukta, "Noto Sans Devanagari", system-ui, sans-serif` · mono `JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace`. Self-hosted via `next/font` from `@fontsource` (nothing fetched from Google at runtime).

| Token | Size | Line height | Tracking | Weight | Where |
|---|---|---|---|---|---|
| headline | `clamp(38px, 5.4vw, 64px)` (phone `clamp(30px, 10.6vw, 46px)`) | 1.04 (phone 1.05) | −0.04em | 700 | Home hero |
| section | `clamp(32px, 4vw, 48px)` | 1.08 | −0.035em | 700 | Landing section titles |
| display | 34px | 38px | −0.035em | 700 | Page titles |
| h1 | 28px | 32px | −0.03em | 700 | Page titles (phone) |
| h2 | 22px | 28px | −0.02em | 700 | Card/section titles |
| h3 | 17px | 22px | −0.01em | 600 | Card heads |
| body-lg | 17px | 26px | 0 | 400 | Leads, lesson text |
| body | 15px | 22px | 0 | 400 | Default |
| label | 15px | 20px | −0.01em | 600 | Buttons, form labels |
| chip | 13px | 18px | 0 | 500 | Chips |
| caption | 12px | 16px | 0 | 500 | Meta |
| eyebrow | 11px | 14px | +0.06em, caps, **mono** | 500 | Section eyebrows ("8 STUDY TOOLS") |
| hindi | 16px | — | 0 | — | Devanagari runs |

Headline pattern: two lines, the second ending in the **marker** phrase plus a full stop; a shorter first line on phones.

---

## 6. Layout grid and spacing

- **Container**: content max ≈ 1200px (the ruled margin sits at `max(16px, 50% − 600px)`); hero mock-up ≈ 1120px; section text ≈ 720px centred; FAQ ≈ 780px; pricing card ≈ 440px.
- **Gutters**: 16px phone, 24px tablet, 32px desktop.
- **Section rhythm**: ~120–160px vertical padding desktop, ~72px phone; sections alternate **ground** and **white** with a 1px border line between bands.
- **Section header**: mono eyebrow → 10px → `section` title (centred) → 14px → body-lg lead (muted, ≤ 640px) → 40–56px → content → 40px → amber CTA + caption "Free to start, no card needed."
- **Unit**: 4px (`--spacing: .25rem`, same as Tailwind today).

---

## 7. Shape, depth, texture

**Radii**: xs 6 · sm 8 · well 12 · **md 14** (buttons, inputs, cells) · tile 16 · bubble 18 · **lg 20** (cards) · xl 28 (bands, big cards) · 2xl 32 · 3xl 44 · pill 999.

**Depth**

| Name | Value | Used on |
|---|---|---|
| edge-primary | `0 3px 0 0 var(--primary-edge)` | Amber buttons |
| edge-neutral | `0 3px 0 0 var(--edge)` | White buttons, FAQ rows, chips, tappable cards |
| edge-selected | `0 2px 0 0 var(--primary-edge)` | Selected chip/tab |
| pop | `0 12px 32px -12px var(--pop-shadow)` | Floating chips, menus, sheets, pricing card |
| device | `0 30px 60px -30px var(--device-shadow)` | Product mock-ups |
| ring | `inset 0 0 0 2px var(--primary)` | Selected tab/plan (amber outline) |
| glow (current step) | `inset ring + 0 0 22px 6px primary 55%` | "You are here" node on the path |

**Textures**
- **Ruled paper** (hero): `repeating-linear-gradient(180deg, transparent 0 35px, var(--paper-rule) 35px 36px)`, faded with `mask-image: linear-gradient(#000 0% 55%, #0000 100%)`. Plus a 2px vertical margin line (see D2).
- **Graph-paper grid** (chat demo, pricing background, teal band): faint 24px grid lines in border colour (on the band: `#FFFFFF14`).
- **Soft blobs**: large blurred amber and teal radial gradients behind pricing (≈ 30% opacity).
- **Hatching**: diagonal stripes on the promo bar and on the "remaining" part of progress bars.

---

## 8. Motion

| Name | Value | Use |
|---|---|---|
| press | 80ms | Buttons move down 2px; edge 3 → 1px |
| flip | 0.3s | Card flips, panel swaps, header show/hide |
| ease-paper | `cubic-bezier(.2,.8,.2,1)` | Everything entering |
| ease-out | `cubic-bezier(0,0,.2,1)` | Fades |
| default | 0.15s `cubic-bezier(.4,0,.2,1)` | Hover colours |
| marker | background-size 0 → 100% over 0.9s, 0.5s delay | Hero key phrase |
| reveal | fade + 8px rise on scroll-in | Section content |
| marquee | continuous horizontal scroll, pause on hover | Paper rows, video row |
| float/bob | gentle 4–6px float, 3–4s | Floating chips around the mock-up |
| pulse/halo | breathing glow 2s | Current path node |

All motion respects `prefers-reduced-motion` (final state shown, marquees stop).

---

## 9. Element catalogue

Each entry: what Tarko shows (exact spec) → TieEdu's version with our content → notes. Order follows the page.

### E1 · Promo bar
- **Tarko**: full-width amber bar with faint diagonal hatching; centred line in Poppins 14/600: code · offer · "Ends in" + a dark pill countdown in mono (`5d 07:58:50`) · "Start free →". Two lines on phones.
- **TieEdu**: announcement bar for a **real** event only — e.g. *"TCS NQT registrations close · Ends in 2d 06:10:12 · Prepare now →"* (from Drops/drive data). Hidden when there is nothing real to announce; dismissible.

### E2 · Header
- **Tarko**: sticky, ground background, bottom hairline. Left logo. Centre: a **pill nav group** (white, border, pill radius, neutral edge) with 6 links in Poppins 15/500. Right: one bordered control combining language (`EN` + globe) and theme (sun + chevron), then an amber **Start free** button.
- **TieEdu**: same structure; logo **as is**; pill links = our sections (signed out: *How it works · Companies · Practice · Pricing · For colleges · For parents*); the existing `LangSwitch` + `ThemeSwitch` move from the footer into the combined control; CTA *Start free*. Signed-in header keeps today's sections (Home/Learn/Practise/Companies/Feed) in the same pill style.

### E3 · Hero
- **Tarko**: ruled paper + margin line; centred stack: overlapping avatar circles (4) + "Join **100,000+** students / Free to start · No card needed"; headline (2 lines, marker on last phrase); 2-line lead (muted, 18/28); store badges; then the mock-up (E4); then a big amber CTA "Plan my test →" + caption; then a laurel badge card "Built for CBSE, JEE and NEET · Classes 8–12 · 2026–27".
- **TieEdu**:
  - Proof line: **real** count only (e.g. *"Join 2,418 students preparing for placements"* from the users table), with initial avatars (highlight circles) — no stock faces; omit if the number is small.
  - Headline: *"Placement test coming up? TieEdu gets you **ready, round by round**."*
  - Lead: *"Pick your company and your test date. You get the real rounds, a skill test for each, and a plan for every day until the drive."*
  - In place of store badges: **Install the app** (PWA) + **Start free**.
  - CTA under the mock-up: *"Plan my placement →"* + *"Free to start, no card needed."*
  - Laurel badge: *"Built for campus placements · TCS · Infosys · Wipro · Accenture · 2026–27"* (companies we actually cover).

### E4 · Product mock-up with floating chips
- **Tarko**: browser frame (3 traffic-light dots, centred URL pill in mono) radius xl, device shadow; inside a real-looking dashboard (sidebar, "6 days to your test", streak card, "Up next" cards, lists). Around it 4 floating white chips (pop shadow, icon tile + title + caption), gently bobbing: *Quiz from your notes*, *Video lesson ready*, *Flashcards made*, *Explained in Hinglish*. On phones it becomes a phone frame.
- **TieEdu**: the **real Today screen** rendered with sample data (labelled as sample): greeting, *"Infosys test in 6 days"*, streak card, readiness rings, "Up next" round cards. Floating chips: *"Mock interview feedback · 5 answers"*, *"Infosys readiness 62% · up 12%"*, *"Daily challenge done · 3 of 3"*, *"Explained in Hinglish"*. URL pill shows our domain.

### E5 · Fanned card carousel ("8 study tools")
- **Tarko**: 7–8 tall cards (radius lg) fanned with slight rotation and overlap, each a different tint (amber, lavender/info, teal, mint, cream, dark brown, mint), header row = icon tile + title, body = a mini live preview (mind map, quiz, player). Caption "Tap a card to try it…" + amber CTA. Phones: one card at a time with ‹ › arrows and a dot pager.
- **TieEdu** — "**8 ways to practise**": Skill test (amber), Mock interview (info tint), Company rounds (teal), English coach (secondary tint), Daily challenge (cream), Mock drive (dark ink), Peer interview (mint), After a rejection (rose tint). Each card shows a mini preview of the real screen; tapping opens the tool. CTA *"Try a tool free →"*.

### E6 · Path timeline ("Exam prep")
- **Tarko**: winding dotted path across the section; nodes: done = teal circle with white check + label + "Done" (teal) or ★★★; current = amber-tinted circle with **glow** + "Start · 9 min" amber pill + "Next 3 days · 10 steps" chip; locked = dashed outline; end = big amber trophy circle. Top-right: "TEST DAY / In 6 days / Ready 77% now · goal 90%" with a progress bar whose remainder is hatched and a goal tick.
- **TieEdu** — "**Your route to the offer**" (TieEdu's own `RouteLine` motif): nodes = a company's real rounds (Aptitude → Coding → Technical → HR → Offer) plus day steps from the calendar plan; end node = offer stamp (our `Stamp`). Readiness bar from the student's real score (sample on the landing page, labelled). Title: *"Tell TieEdu the drive date. Get a plan for every day."*

### E7 · Big-number stat + paper marquee ("PYQs")
- **Tarko**: "**162** papers in the bank" (Poppins 800, ~72px) + success-tint pill "from 34 schools"; two rows of small paper cards (subject icon tile + skeleton lines) scrolling in opposite directions, with one elevated card "JUST ADDED · Unit test 1 · Chemistry" (amber outline, pop).
- **TieEdu**: "**{N}** companies · **{M}** rounds covered" from the companies table; marquee of mini company cards (logo-less initial tile + round count); elevated card = the most recently updated company page *"JUST UPDATED · Infosys · rounds checked"*. CTA *"Browse companies →"*.

### E8 · "Built for" audience grid
- **Tarko**: 5 white cards (radius lg, neutral edge), centred line icon (2-colour), title Poppins 17/600, caption.
- **TieEdu**: *Service companies* (TCS, Infosys, Wipro…), *Product companies*, *Off-campus drives*, *Core engineering*, *Colleges & TPOs*.

### E9 · Chat demo ("Ask TarkoAI")
- **Tarko**: 4 tabs as white cards (icon tile + title + caption), selected = amber ring; a large white panel (radius xl) with graph-paper grid; user bubble right in amber tint; assistant avatar + "Searched your uploads…" meta line; reply in a white bubble (Hinglish); "From p.3 physics-notes.pdf" source chip; action card (thumb + title + caption + amber button); reaction icons; composer (white, radius lg, with Record/Upload/YouTube chips and send button). Below: "ASK IN ANY LANGUAGE" + language chips (English, हिंदी, Hinglish highlighted).
- **TieEdu** — "**Practise out loud, get feedback**": tabs *Speak · Type · Mock interview · English coach*; demo conversation: user answer (amber tint) → feedback card (score chip, "What worked", "Try this" with *you said → try*) → action card *"Do a full mock HR interview"*. Language chips: English, हिंदी, Hinglish. Uses the real mock-interview / English-coach components.

### E10 · Research bento
- **Tarko**: bento grid of 5 cards with different tints (one big teal card with a huge amber stat "2×", amber-tint, white with a bar chart, info-tint, secondary-tint); each has an institution chip (logo + name), a big stat (Poppins 700, coloured), caption, a quote, and a citation in italic with a link.
- **TieEdu** — "**Why practising this way works**": only **real, linked studies** on retrieval practice / testing effect / spaced practice (e.g. Roediger & Karpicke 2006, *Psychological Science* — the same well-known study is fine to cite; its numbers must be quoted exactly from the paper), plus one card from TieEdu's own data when available (*"Students who took a round test before the drive…"*). No invented stats.

### E11 · Segmented tabs + benchmark bars
- **Tarko**: white card; segmented control (sunk track, white selected pill); title; 3 rows (icon + name + horizontal bar + mono %), leading bar amber, others warm grey.
- **TieEdu** — "**Pick a company. See its rounds.**": tabs = 4 companies; rows = that company's rounds with weight / question count from the company page data; leading bar amber. (No competitor comparisons.)

### E12 · Video / story carousel
- **Tarko**: "STUDY CREATORS ON TARKOAI / Students are already sharing it" left, a stat card "55M+ views…" right; a row of 9:16 video cards (radius lg) with play buttons (amber circle), view counts, handle + "Watch on YouTube ↗".
- **TieEdu** — "**Students who got placed**": cards from the **Offer Wall** (approved stories), 4:5 cards with initials avatar, company, role, first lines of the story, "Read the story →". Stat card only with a real count (*"{n} offer stories"*).

### E13 · Pricing
- **Tarko**: graph-paper background with blurred amber + teal blobs; dark pill above the card (mono "CODE · 50% OFF FOR LIFE · ENDS IN" + amber countdown pill); mascot peeking at the card corner; card (white, radius lg, pop): title, check list (teal checks), two plan **radio cards** (selected = amber ring + amber radio; mono amber "50% OFF FOR LIFE" badge; strikethrough old price; big price Poppins 700); full-width amber pay button "Pay ₹240 with UPI"; UPI autopay mark + "Cancel any time"; links "Ask a parent to pay", "Or start free…"; then a parent testimonial card.
- **TieEdu**: same card for **company packs** (real prices from Coupons & Pricing); radio cards = single pack / bundle; badge only for a real coupon; *"Pay ₹X with UPI"* (we accept UPI and Razorpay); **"Ask a parent to pay"** links to our parent link flow (already built); testimonial only from a real, consented parent or omitted. No mascot (TieEdu has none) — the logo, unchanged, may sit there instead.

### E14 · FAQ accordion
- **Tarko**: "Questions" (left-aligned `section`), stacked white rows (radius md, neutral edge), Poppins 16/600 question, `+` / `−` icon right, answer in muted body.
- **TieEdu**: our FAQ (free vs paid, which companies, are patterns verified, accuracy guarantee, parent sharing, privacy, Hinglish). Uses `<details>` for no-JS and keyboard access.

### E15 · Closing teal band
- **Tarko**: teal card (radius xl, inset from page edges) with faint grid texture; mascot on top; headline white with the second phrase in **amber**; lead in on-hero-muted; amber button + outlined light button.
- **TieEdu**: *"Your placement. **Round by round.**"* · *"Pick a company and take its free readiness check in two minutes."* · **Start free** + **See all companies** (outlined, on-hero border). The logo, unchanged, on a small cream plate instead of a mascot.

### E16 · Footer
- **Tarko**: hairline; logo + store badges left; underlined muted links (Privacy, Terms, Refunds, Parent consent, Brand, Contact, Cookie settings); © right.
- **TieEdu**: logo + Install app; links (Privacy, Terms, Refunds, For colleges, Verify a certificate, Contact); trust line; ©. (Theme/language move to the header.)

### E17 · Cookie consent card
- **Tarko**: floating white card bottom-centre (radius lg, pop), short text with Privacy link, **Decline** (text) + **Accept** (amber).
- **TieEdu**: only if analytics cookies are used; same card; decision stored; nothing non-essential runs before Accept.

---

## 10. Core components

| Component | Spec |
|---|---|
| Button — primary | Amber fill, `on-primary` text, Poppins 15/600, tracking −0.01em, radius md, `edge-primary`, heights 36/44/52 (sm/md/lg), icon gap 8px, arrow icon after label; press 2px/80ms. |
| Button — secondary | White, 1px border, `edge-neutral`, ink text. On the teal band: transparent with `on-hero` 1.5px border. |
| Button — text | Teal (`secondary`), Poppins 600, underline on hover. |
| Button — buy | = primary + price (no separate colour; see D1). |
| Card | White, 1px border, radius lg. `raised` adds pop; `band` = teal hero; `tint-*` variants (primary/secondary/info/rose/success). |
| Chip | Pill, 13/500. Selected: primary tint + `on-primary-tint` + `edge-selected`. |
| Badge (mono) | JetBrains Mono 11/500 caps on a tint, radius xs ("NEW", "50% OFF", "JUST ADDED"). |
| Segmented control | Sunk track radius pill, white selected pill with edge. |
| Tabs as cards | Icon tile + title + caption; selected = amber ring. |
| Radio card | White, border; selected = amber ring + amber radio dot. |
| Inputs | White, `border-strong`, radius md, focus ring 2px ink, label 15/600. |
| Accordion | White row, radius md, edge-neutral, +/−. |
| Floating chip | White, radius lg, pop, icon tile (tinted, radius sm) + title 15/600 + caption 12. |
| Icon tile | 32–40px, radius sm/md, tinted background with matching icon colour. |
| Avatar | Initials on highlight, Poppins 800, ring of ground colour when overlapped. |
| Progress bar | Sunk track, amber fill, hatched remainder, optional goal tick. |
| Ring | Amber on sunk; on band `hero-track`. |
| Toast/note | Tints with their `on-*` text. |
| Mock-up frames | Browser (dots + URL pill) and phone (notch) frames, device shadow. |
| Existing signature | `RouteLine`, `Ticket`, `Stamp` restyled teal/amber — TieEdu's own motif. |

---

## 11. Applying it across TieEdu

| Area | Change |
|---|---|
| **Home (signed out)** | Rebuilt from E1–E17 in this order: E1 · E2 · E3 · E4 · E8 (laurel) · E5 · E6 · E7 · E8 · E9 · E10 · E11 · E12 · E13 · E14 · E15 · E16 · E17. |
| **Today** | Greeting `display`; route card → teal band with RouteLine; streak card like E4's; "Up next" round cards; college pulse line. |
| **Company page** | Hero with marker on the company name; rounds as E6 path; round tiles; sticky amber CTA bar; pricing block as E13; FAQ as E14. Its `companyPage.module.css` palette is replaced by global tokens. |
| **Companies list / compare** | Cards E8-style; compare as E11 bars. |
| **Courses / lessons** | Lesson text Mukta 17/26; code blocks re-tinted warm; progress amber. |
| **Practise tools** | Skill test, daily, mock interview, English coach, peer mock: chat bubbles (radius bubble), feedback cards in tints, scores in Poppins, tabs-as-cards (E9). |
| **Mock Drives** | `.mock-drive-scope` re-pointed to the new tokens. |
| **Feed** | Drops as cards; Offer Wall as E12 cards. |
| **Calendar / plan** | E6 path for the day-by-day plan. |
| **Account / settings** | New inputs, switches amber. |
| **Parent page** | Ruled paper, Mukta Devanagari, rose tint for encouragement; WhatsApp/email boxes as floating-chip cards. |
| **/colleges, campus pages** | E3/E5/E13 patterns with college content. |
| **TPO portal** | Same tokens; denser (body 15, caption 12); heatmap from `series-*`; nudges and reports as tinted cards. |
| **Admin** | Token swap only (legacy Tailwind classes remapped centrally). |
| **Emails, PDFs, help books** | Ink/amber/teal; Poppins/Mukta where fonts are embedded. |

---

## 12. Mobile

From the 390px render:
- Promo bar wraps to two lines; header shows logo + CTA (pill nav moves into the drawer, as TieEdu already does).
- Hero left-aligned: avatars + proof line, headline in 3 lines (`clamp(30px, 10.6vw, 46px)`), lead, buttons full-width.
- Mock-up becomes a **phone frame**, floating chips overlap its edges.
- Primary CTA full width, 52px.
- Carousels: one card, ‹ › round buttons + dot pager.
- Grids collapse to 1 column (bento, audience) or horizontal scroll (marquees).
- TieEdu's existing bottom tab bar stays for signed-in screens (restyled: ground background, amber active indicator).

---

## 13. Implementation

| Step | Files | Work |
|---|---|---|
| Tokens | `frontend/src/styles/globals.css` | §2/§3 values in `:root`, dark block and the legacy dark remap; add new tokens; keep `--rgb-logo`. |
| Tailwind | `frontend/tailwind.config.js` | `secondary`, `highlight`, `series-1..6`, `on-primary`, `edge`, tints; radius scale; shadows `edge-primary/neutral/selected`, `pop`, `device`; `font-display` → Poppins. |
| Fonts | `frontend/src/styles/fonts.ts`, `frontend/package.json` | Add `@fontsource/poppins`, `@fontsource/mukta`; remove Figtree/Bricolage/Source Serif; preload Mukta 400 only; Devanagari subset on pages that need it. |
| Utilities | `globals.css` | Type classes (§5), `.eyebrow` (mono caps), `.paper-lines`, `.grid-paper`, `.mask-fade-b`, `.marker`, `.hatch`, marquee, float, reduced-motion. |
| Components | `components/ui/*` (+ new `SegmentedControl`, `RadioCard`, `Accordion`, `FloatingChip`, `IconTile`, `DeviceFrame`, `Marquee`, `CardFan`, `PathTimeline`) | §10. Button text white → `on-primary`. |
| Header/Footer | `components/layout/Header.tsx`, `Footer.tsx`, `LangSwitch`, `ThemeSwitch` | Pill nav group; combined language/theme control in the header. |
| Home | `pages/index.tsx`, `components/home/*` | E1–E17 with TieEdu content and real data endpoints. |
| Company page | `components/companyPage/*`, its module CSS | Global tokens; E6/E13/E14 patterns. |
| Hard-coded colours | 86 hex values in `.tsx` | Replace with tokens; new test fails on hex literals outside an allow-list (logo SVG, PDF/email generators). |
| Tests | `scripts/design-tokens.test.ts` | "White on action ≥ 4.5" → "`on-primary` on `primary` ≥ 4.5" + "white on primary forbidden"; every pair in §2/§3; logo token unchanged. |
| Data for honest numbers | backend | Small public endpoint for real counts (students, companies, rounds, offer stories) used by E3/E7/E12. |
| Emails, PDFs, help books | `backend/src/lib/email/templates`, `collegeReport.ts`, `certificate*.ts`, `docs/helpbooks/helpbook.css` | New palette and fonts. |

---

## 14. Phases

| Phase | Scope | Effort | Done when |
|---|---|---|---|
| 1 Foundation | Tokens light+dark, Tailwind, fonts, utilities, token tests | 1–2 days | All suites pass; contrast tests cover every pair |
| 2 Components | §10 incl. new components; header pill nav + combined control | 2–3 days | Component gallery reviewed in light and dark |
| 3 Home | E1–E17 with real data and copy | 3–4 days | Owner sign-off on desktop + phone |
| 4 Product screens | Today, company page, practise tools, calendar, feed, parent page | 3 days | Owner sign-off |
| 5 Sweep | Mock Drives scope, TPO, admin remap, 86 hex values, `/colleges`, campus pages | 2 days | Contrast scanner clean on ~50 pages, both themes |
| 6 Outbound | Emails, PDFs, help books, share images | 1 day | Samples regenerated and checked |
| 7 Verify | Lighthouse a11y on the 14 public pages, mobile guard, performance budget (fonts!), screenshots at 360/768/1280 | 1 day | Numbers recorded in the PR |

**≈ 13–16 working days** for one developer. Each phase is its own commit on a branch; deploy after phase 3 + 4 sign-off.

---

## 15. Risks

| Risk | Mitigation |
|---|---|
| Looking like a clone of Tarko | Own logo (unchanged), copy, data, imagery; RouteLine/Ticket/Stamp as signature; D2 on the margin line. |
| Logo orange next to amber | Logo only on ground/surface; nothing else uses `#F84109`; checked at 3.5:1. |
| White text left on amber | Token test + contrast scanner both themes. |
| Fonts grow first load | Preload one body weight; others lazy; Devanagari subset only where used. |
| Marketing numbers without data | E3/E7/E12 hidden until a real count endpoint returns a meaningful number. |
| Motion-heavy page on cheap phones | Marquee/float only on capable devices, all off with reduced motion; mock-up images instead of live components below the fold on slow connections. |

---

## 16. Decisions needed

| # | Decision | Recommendation |
|---|---|---|
| — | Logo colour | **Decided: unchanged.** |
| D1 | "Buy" buttons: TieEdu separates buy (amber) from action (red-orange); in this system amber is the only action colour | One amber button for both; purchases carry the price |
| D2 | The red ruled-paper margin line is Tarko's most recognisable motif | Keep the ruled lines; draw TieEdu's teal route line where the margin line would be |
| D3 | Lesson reading font (Tarko has no serif) | Mukta 17/26 everywhere |
| D4 | Promo bar | Only for real dates (registrations, drives); hidden otherwise |
| D5 | Research bento (E10) | Only real, linked studies + our own data |
| D6 | Dark mode | Ship with light |
| D7 | Rollout | Branch, one commit per phase, deploy after phases 3–4 sign-off |

---

## 17. Owner's pasted elements

The owner mentioned pasting extra elements to include; none came through in the message (only the link). **To do:** when they are shared, add each here with: what it is, where it goes (E-number or page), its spec in this system, and TieEdu's content for it.

---

## Appendix A — complete token sheet

**Light (`:root`)** — ground `#FFF8EE` · pane `#FBF4E8` · surface `#FFFFFF` · surface-sunk `#F5EEE2` · border `#E8DFD0` · border-strong `#8A7A68` · edge `#E0D5C2` · ink `#2A1E14` · ink-muted `#6B5B4B` · primary `#FFA41B` · primary-edge `#D9800A` · on-primary `#2A1E14` · primary-tint `#FFE7BF` · on-primary-tint `#6B3E00` · secondary `#0B4F4A` · on-secondary `#FFF8EE` · secondary-tint `#D3EAE6` · on-secondary-tint `#0B4F4A` · info `#2B3FB3` · on-info `#FFFFFF` · info-tint `#E3E7FF` · on-info-tint `#2B3FB3` · rose-tint `#FCE4EC` · on-rose-tint `#8A2346` · series `#2A78D6 #EB6834 #1BAF7A #EDA100 #E87BA4 #008300` · series-other `#A39787` · hero `#0B4F4A` · on-hero `#FFF8EE` · on-hero-muted `#A9CFC9` · hero-edge `#083B37` · hero-track `#FFFFFF29` · hero-well `#FFFFFF14` · hero-well-strong `#FFFFFF24` · hero-hairline `#FFFFFF2E` · hero-action-edge `#00000047` · highlight `#FFD27A` · success `#146C45` · success-tint `#DDF1E7` · danger `#B42318` · danger-tint `#FCE3DF` · recording `#FF3B30` · live `#DC2626` · focus `#2A1E14` · device-frame `#2A1E14` · device-shadow `#2A1E1473` · pop-shadow `#2A1E1447` · paper-rule `#EBDDC6` · **logo `#F84109` (unchanged)**.

**Dark** — ground `#121010` · surface `#1C1917` · surface-sunk `#262220` · pane `#1A1715` · border `#36302B` · border-strong `#80746A` · edge `#050404` · ink `#F7F1E8` · ink-muted `#B4A898` · primary `#FFB547` · primary-edge `#B86E00` · on-primary `#2A1E14` · primary-tint `#3A2A12` · on-primary-tint `#FFD08A` · secondary `#5CC2B5` · on-secondary `#0B201E` · secondary-tint `#12322F` · on-secondary-tint `#9FE0D6` · info `#3F51C4` · info-tint `#1D2347` · on-info-tint `#AAB6FF` · rose-tint `#3D1A26` · on-rose-tint `#F4A6C0` · series `#3987E5 #D95926 #199E70 #C98500 #D55181 #008300` · series-other `#6E655C` · hero `#0F3B37` · on-hero `#F7F1E8` · on-hero-muted `#9FCBC4` · hero-edge `#071F1D` · highlight `#7A5512` · success `#4ED19A` · success-tint `#12301F` · danger `#FF8A7A` · danger-tint `#3A1A16` · focus `#F7F1E8` · device-frame `#F7F1E8` · device-shadow `#000000CF` · pop-shadow `#00000099` · paper-rule `#2E2824`.

**Type** — headline `clamp(38px,5.4vw,64px)/1.04/−0.04em/700` · section `clamp(32px,4vw,48px)/1.08/−0.035em/700` · display `34/38/−0.035em/700` · h1 `28/32/−0.03em/700` · h2 `22/28/−0.02em/700` · h3 `17/22/−0.01em/600` · body-lg `17/26` · body `15/22` · label `15/20/600/−0.01em` · chip `13/18` · caption `12/16/500` · eyebrow `11/14/500/+0.06em mono caps` · hindi `16`.

**Radii** — 6 · 8 · 12 · 14 · 16 · 18 · 20 · 28 · 32 · 44 · 999. **Motion** — press 80ms · flip 0.3s · ease-paper `cubic-bezier(.2,.8,.2,1)` · default 0.15s `cubic-bezier(.4,0,.2,1)` · marker 0.9s + 0.5s delay.
