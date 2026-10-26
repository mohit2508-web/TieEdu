# TieEdu — Professional UI & Experience Plan (v2)

> Builds on `UI_REDESIGN_ANALYSIS.md` (the audit: 195 colours, 15 font sizes, Calibri-clone body font,
> 65 Sparkles icons, 4,445 garbled characters, 3 popups on first visit). That document explains what is
> wrong. This one is the full plan for what TieEdu becomes: a product that looks professional, feels
> made by people who understand placement season, and gives **students, colleges and parents** each a
> clear reason to come back.

---

## Contents
1. What changes from v1
2. Who we design for
3. Brand foundation
4. Design system "Route" 2.0
5. Navigation and information architecture
6. Experiences that hook students
7. Experiences that win colleges
8. Experiences for parents and schools
9. The public website
10. Mobile app feel
11. Trust, honesty and data quality
12. Accessibility, performance and language
13. Measuring success
14. Roadmap
15. Governance — keeping it professional
16. Decisions needed

---

## 1. What changes from v1

| v1 (audit) | v2 (this plan) |
|---|---|
| Fix fonts, colours, sizes, copy | Same, **plus** a complete design system with dark mode, motion, illustration and data-viz rules |
| One audience (students) | **Five audiences** — students by year, colleges/TPOs, parents, schools, recruiters — each with its own entry point and promise |
| Restyle existing pages | **New experiences**: a personal Today screen, Placement Passport, shareable achievement cards, college readiness dashboards, campus pages |
| 8 flat nav items | **4 clear sections** + a personal home, so the product is understandable in 5 seconds |
| No targets | **Measurable goals** per audience and a rule that every redesign ships with a metric |
| 4–5 weeks of restyling | **12-week roadmap in 5 phases**, each phase shippable on its own |

---

## 2. Who we design for

| Audience | What they want | What they fear | What must hit them in 5 seconds |
|---|---|---|---|
| **1st–2nd year student** | "Am I on track? What should I learn first?" | Wasting years on the wrong things | A path for *their* branch and year |
| **3rd–4th year student** (core user) | "Will I clear TCS / Accenture? What's the pattern? When's the drive?" | Rejection, missing a drive, not knowing where they stand | Their readiness score and their next step |
| **College / TPO** | Placement % up, less manual chasing, reports for management and NAAC/NIRF | Low placements, students not preparing, spreadsheet chaos | "See your batch's readiness in one screen" |
| **Parent** (payer for many) | Proof the money and time are well spent | Paying for something the child doesn't use | Progress they can see and a fair price |
| **School (K-12)** | Structured tech curriculum, teacher tools | Complexity, cost | A calm, separate school experience (`/school`) |
| **Recruiter / partner** (later) | A pool of verified, ready candidates | Unverified claims | Verified skill passports |

**Design consequence:** one design system, but **different front doors**: `/` (students), `/colleges`, `/parents`, `/school`.

---

## 3. Brand foundation

**Positioning:** *TieEdu is the placement companion for Indian engineering students, from first year to
first job.* Not "a vault", not "a course site": a companion that knows where you stand and what's next.

**Brand idea: "The route to the offer."** Every student is on a route (year → skills → company → rounds →
offer → day one). TieEdu draws that route and walks it with them. Every screen shows *where you are on
the route*.

**Personality:** a sharp, calm senior. Honest about what's verified and what isn't. A little warm and
desi, never cringe.

**Visual signature (recognisable without the logo):**
1. **The route line**: stations on a line for anything with steps.
2. **Stamps**: "Verified · Oct 2026", "From 41 students", "Being verified".
3. **Tickets**: everything bought or earned (pack, certificate, drive slot) has a perforated stub.
4. **One ink band per page**: deep navy, the only "heavy" area.
5. **Logo orange** as the single action colour.

**Logo:** keep the TiE mark; create a clean wordmark lockup, an app icon on the orange, and a monochrome
version for college co-branding.

---

## 4. Design system "Route" 2.0

### 4.1 Typography
| Role | Font | Notes |
|---|---|---|
| Display + headings + numbers | **Bricolage Grotesque** 600/700 | Already on the new company page |
| UI + body | **Figtree** 400/500/600/700 | Replaces Carlito (the Calibri clone) |
| Lessons, long reading | **Source Serif 4** 400/600 | Courses feel like a well-made book |
| Code | **JetBrains Mono** | Code only, never labels |

All via `next/font` (self-hosted, preloaded, no layout jump). **Scale:** 12 · 14 · 16 · 18 · 20 · 24 · 32 · 48 · 64.
Nothing under 12 px. Sentence case. Tabular numbers.

### 4.2 Colour (light + dark)
| Token | Light | Dark | Use |
|---|---|---|---|
| `ink` | #0E2A44 | #E8EEF5 | Headings, ink band |
| `paper` | #F7F6F3 | #0B1520 | Page |
| `card` | #FFFFFF | #111E2B | Surfaces |
| `line` | #E9E7E1 | #1E2E3E | Borders |
| `text` / `muted` | #3E4754 / #5A6470 | #C9D3DD / #8C9AA8 | Text |
| **`signal`** | logo orange (contrast-tuned) | lighter orange | Primary actions, links, focus |
| `money` | #E8A33D | #F0B95E | Prices, buy buttons only |
| `train` / `test` / `track` | #0369A1 / #C2410C / #0F766E | lighter tints | Only for those meanings |
| `success` / `warning` / `danger` | #15803D / #B45309 / #B42318 | tints | States |

Dark mode matters: students study at night. It ships as a token swap, not a second design.

### 4.3 Space, shape, depth
- 4-px grid; section rhythm 56 px (phone) / 96 px (desktop); content width 1200; reading width 720.
- Radius: 8 (inputs) · 14 (cards) · 20 (feature cards) · full (chips).
- Elevation: hairline border by default; one raised shadow for the primary card per screen; no glows.

### 4.4 Motion
- 150–320 ms, ease-out; only for state change and progress (route fills, ticket stamps, streak flame).
- One "moment of delight" per milestone (test passed, offer received): a stamp landing, confetti only
  for an offer.
- `prefers-reduced-motion` respected everywhere.

### 4.5 Iconography
- Lucide only, 1.5 stroke, 20 px, muted colour. **Banned:** Sparkles, Wand, Rocket. Flame only for streaks,
  Trophy only for the leaderboard.

### 4.6 Imagery and illustration (the biggest "not AI" upgrade)
- **Real photos**: real students, real campuses, real offer moments, shot on phones and lightly graded
  in brand colours. Collect them from users (with consent) in exchange for a feature in Drops.
- **Generated subject covers**: an SVG pattern per subject (circuit traces for ECE, grid paper for Maths,
  brackets for programming, gears for Mech) in the subject colour, with title typography. Every course
  gets a distinctive cover with zero design work.
- **Company identity**: company names in type, with logos only where licensed; brand-colour stripes for
  recognition.
- **Spot illustrations**: a small set (8–10) in one hand-drawn line style for empty states. Commission
  one illustrator, or draw them in-house in a single style. No stock 3D blobs.

### 4.7 Data visualisation
Readiness rings, topic bars, streak calendars and batch heatmaps share one style: train/test/track
colours, tabular numbers, labels on the data rather than legends, and a text alternative for screen
readers.

### 4.8 Components (built once, used everywhere)
Button (primary · buy · secondary · text) · Chip · Stamp · Card · Ticket · RouteLine · ProgressRing ·
SectionHead · EmptyState · Sheet (bottom sheet) · Toast · Tabs · Table · StatTile · Cover · Avatar ·
Skeleton (only when data is genuinely loading).

A **living style guide** at `/design` (admin-only) shows every component and token, so designers and
developers use the same reference.

---

## 5. Navigation and information architecture

### Today: 8 flat links
Vaults · Compare · Skill Test · Mock Drives · Drops · Free Course · Courses · Study Plan

### Proposed: a personal home + 4 sections
| Section | Contains | Why |
|---|---|---|
| **Today** (signed in) / **Home** (guest) | Your next step, streak, upcoming drives, continue learning | One place that answers "what now?" |
| **Learn** | Courses, Tracks, Free courses, Study plan | Everything you study |
| **Practise** | Skill tests, Mock drives, Daily practice | Everything that tests you |
| **Companies** | Company pages, Compare, Drive Radar, Selection stories | Everything about where you're going |
| **Feed** | Drops: jobs, deadlines, stories, tips | What's happening now |

- **Desktop:** these 5 in the top bar; account, notifications and search on the right. **One** CTA
  ("Start free") for guests.
- **Phone:** a bottom tab bar with the same 5. The hamburger menu goes away.
- **Global search** (Ctrl/⌘K, already built) becomes the power-user shortcut to everything.
- **Colleges** get their own entry ("For colleges" in the footer and on `/colleges`), so student
  navigation stays clean.

---

## 6. Experiences that hook students

### 6.1 The Today screen (signed-in home)
The single most important new screen. Opens to:
- **Your route**: year → skills → target companies → offer, with your current station highlighted.
- **Next step**: one card, one action ("Your weakest round for Accenture is Coding (42%). 20-minute
  practice →").
- **This week**: the countdown to your test date, your streak, upcoming drives you follow.
- **Continue**: the last lesson or test, one tap to resume.
- **From your college**: real activity only ("12 students from your college are preparing for TCS this
  week"), shown only when the number is real and above a privacy threshold.

### 6.2 Placement Passport
One page per student that combines skill-test scores, course certificates, company readiness and verified
achievements into a **shareable profile** (`tieedu.com/p/<name>`):
- A readiness ring per target company.
- Verified certificates with QR codes (already supported by the backend).
- A "Share on LinkedIn" image card generated automatically.

This turns progress into **status**, the strongest motivator for students, and every share is free
marketing.

### 6.3 Shareable moments
Auto-generated, brand-styled image cards (1080×1350 for Instagram, 1200×627 for LinkedIn):
- "Cleared the Accenture readiness check: 78%"
- "Certificate: Python Programming · TieEdu" (verifiable)
- "Selected at Capgemini 🎉" (the one place confetti and emoji belong)

### 6.4 Healthy habit loops (not casino gamification)
- **Streaks** with a weekly freeze (missing one day doesn't wipe you out), and reminders only at the time
  the student usually studies.
- **College leaderboard by readiness**, not by time spent; opt-in, first name + initial only.
- **Weekly recap** (Sunday): what you did, what improved, what's next. In-app plus one push.
- **Milestones** on the route line, each with a small stamp animation.

### 6.5 Year-aware journeys
- **1st–2nd year:** "Foundation route": branch core, programming, aptitude basics, small wins
  (certificates in a weekend).
- **3rd year:** "Internship route": skills + projects + first company targets.
- **4th year:** "Placement route": company pages, mock drives, Drive Radar, countdown plans.

The year question ("Kis saal mein ho?") is asked **once, at signup**, not as a popup.

### 6.6 Selection stories, made real
Real photos, college, branch, CTC band and the round-by-round story, verified by email or offer letter
and marked as such. Stories feed Drops and company pages. This is the honest version of "social proof".

---

## 7. Experiences that win colleges

### 7.1 `/colleges`: the college landing page
- The promise: "See your batch's placement readiness in one screen, not twenty spreadsheets."
- A product tour of the TPO dashboard using sample (clearly labelled) data.
- The data and privacy promise (DPDP Act), how student data is used, and an export button.
- Pricing per batch, a pilot offer and a "Book a 20-minute demo" form.

### 7.2 TPO dashboard redesign (on the existing Campus TPO portal)
- **Batch readiness heatmap**: students × target companies, coloured by readiness.
- **Drive tracker**: the route line again (registered → tested → interviewed → offered) per drive.
- **Segments**: "Not started", "At risk", "Ready", each with one-click nudges (push / email).
- **Reports**: one-click PDF for management and NAAC/NIRF evidence, co-branded with the college logo.
- **Placement outcomes**: offers by company, CTC distribution, year-on-year.

### 7.3 Campus pages
`tieedu.com/campus/<college>`: a co-branded page with the college's prep programme, upcoming drives and
aggregate (never individual) readiness. Colleges share it with students and parents. Strong for
acquisition.

### 7.4 Faculty tools (later)
Assign a course or test to a class, see completion, export marks.

---

## 8. Experiences for parents and schools

- **Parent view** (opt-in by the student): a weekly progress email and a read-only summary (time spent,
  tests passed, certificates). Builds trust with the payer without surveilling the student.
- **Parent pricing page:** what they're paying for, a refund policy and real outcomes.
- **Schools (`/school`)** stay a **separate, calmer brand** built on the same system: rounder shapes,
  softer palette and larger type, sharing tokens and components. Merge the two school codebases into one
  (from the earlier analysis).

---

## 9. The public website

| Page | Purpose | Key content |
|---|---|---|
| **Home** (`/`) | Convert a first-time student | Hero: one sentence + search ("Which company are you preparing for?") + live proof; three routes (by year); how it works (route line); real stories; companies; pricing teaser; FAQ |
| **For colleges** (`/colleges`) | Book demos | See §7.1 |
| **For parents** (`/parents`) | Trust + payment | See §8 |
| **Pricing** | No-surprise pricing | Free vs pack vs college plan; refund policy; per-company prices |
| **Stories** | Proof | Selection stories with filters (company, college, branch) |
| **About / Trust** | Credibility | Team, how content is verified, data and privacy, contact |

**Hero copy direction (pick one, test two):**
- "Know every round before you walk into it."
- "Your route from first year to first offer."
- "Placement season, without the panic."

**Rule:** every number on the public site is live or dated ("1,240 readiness checks taken in October").

---

## 10. Mobile app feel (PWA)

Most students will see TieEdu on a ₹12,000 Android phone. Design phone-first:
- Bottom tab bar (5 sections), large tap targets (≥44 px), bottom sheets instead of modals.
- Offline: lessons and downloaded PDFs readable without data; queued progress syncs later.
- Install prompt **only after the second visit or a finished lesson**, never on first load.
- Push notifications grouped and capped (max 1/day non-critical), with a quiet-hours setting.
- Performance budget: first meaningful paint < 2.5 s on 4G; JavaScript per route < 150 KB.

---

## 11. Trust, honesty and data quality

The product's biggest advantage is honesty. Make it visible:
- **Fix the 4,445 garbled characters** before any redesign ships.
- Every number has a source stamp or a "being verified" label (already the case on the new company page).
- No fake counts, no "10,000+" unless live, no "Verified" next to "Unverified".
- A public **"How we verify"** page.
- Clear refund policy; prices identical everywhere (already enforced server-side).
- Privacy: students control what colleges and parents see.

---

## 12. Accessibility, performance and language

- **WCAG 2.2 AA**: 4.5:1 contrast, visible focus, keyboard navigation, screen-reader labels, captions on
  videos.
- **Lighthouse targets:** SEO 100 · Accessibility 100 · Best practices 100 · Performance ≥ 90 desktop,
  ≥ 75 mobile (raising mobile further needs the app-wide JavaScript diet in Phase 5).
- **Language**: English, with **consistent Hinglish** for nudges and labels; a full Hindi option later.
  The new company page's EN/Hinglish toggle becomes app-wide.

---

## 13. Measuring success

| Audience | Metric | Target (90 days after launch) |
|---|---|---|
| New visitor | Home → signup | +40% |
| Student | Activation: first test or lesson in 24 h | 60% |
| Student | Week-4 retention | +30% |
| Student | Passport shares / month | 1 per 10 active students |
| Student | Pack conversion | +25% |
| College | Demo bookings from `/colleges` | 10 / month |
| College | TPO weekly active use | 70% of onboarded colleges |
| Everyone | Lighthouse a11y / SEO | 100 / 100 |

Every phase ships with its metric instrumented (the analytics event system from the company page is
reused), and big changes are A/B tested (home hero, pricing layout).

---

## 14. Roadmap (12 weeks, one developer + part-time designer; faster with two developers)

| Phase | Weeks | Ships | Visible result |
|---|---|---|---|
| **0. Clean-up** | 1 | Garbled-text repair, remove first-visit popups, delete unproven claims, remove Sparkles, raise 9–11 px text | The app stops looking broken |
| **1. Foundations** | 2–3 | Tokens (light/dark), fonts via `next/font`, type scale, codemods for sizes/colours/mono, component library, `/design` style guide, lint guards | One consistent look everywhere |
| **2. Core student pages** | 4–6 | New nav (5 sections + bottom tabs), Home, Courses + generated covers, Course page with serif reading, Skill Test rebuild, all companies on the 3T page | The product feels professional |
| **3. Hooks** | 7–9 | Today screen, Placement Passport, share cards, weekly recap, streak freeze, selection stories | Students come back and share |
| **4. Colleges & parents** | 10–11 | `/colleges`, TPO dashboard redesign, campus pages, parent view and page | Colleges can be sold to |
| **5. Polish & performance** | 12 | Dark mode QA, accessibility audit to 100, app-wide JS diet, A/B tests live | Fast, accessible, measured |

Each phase is releasable on its own; nothing waits for the end.

---

## 15. Governance — keeping it professional

- **One owner for design decisions**: no new colour, font size or component without updating the system.
- **Lint guards** (extending the existing "anti-web" tests): fail the build on raw hex colours, sizes
  under 12 px, `font-mono` outside code, banned icons and hype words in UI strings.
- **Screenshot review**: every UI PR includes desktop + phone screenshots.
- **Copy review**: every user-facing string follows the voice rules; one person signs off.
- **Quarterly audit**: re-run the measurements from `UI_REDESIGN_ANALYSIS.md` and Lighthouse; publish
  the numbers internally.

---

## 16. Decisions needed

| # | Decision | Recommendation |
|---|---|---|
| D1 | Brand action colour | **Logo orange** |
| D2 | Body font | **Figtree** |
| D3 | Serif for lessons | **Yes: Source Serif 4** |
| D4 | Navigation | **5 sections + bottom tabs on phone** |
| D5 | Dark mode in Phase 1 | **Yes** (tokens make it cheap now, expensive later) |
| D6 | Real photography | **Yes**: start collecting from users now |
| D7 | Public Passport pages | **Yes, opt-in**, no indexing unless the student chooses |
| D8 | Colleges pricing | Per batch per year, with a free pilot term |
| D9 | Start with | **Phase 0** (1 week, biggest visible improvement per hour) |
