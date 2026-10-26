# TieEdu — Full UI Analysis & "Next-Level" Redesign Plan

> Based on: the running app (desktop 1440px and phone 390px screenshots of Home, Courses, a Course,
> Skill Test, Mock Drive, Study Plan, Compare, Drops, Company vault, Login, Tracks), and a measurement
> of all 238 `.tsx` files in `frontend/src`. Every number below was counted in the code, not estimated.

---

## 1. The verdict in one paragraph

TieEdu doesn't look bad because of any single screen. It looks generic because **there is no design
system**. Every feature was built with its own fonts, sizes, colours and wording, so the app reads like
twelve different templates stitched together. Most of those templates are the exact patterns AI site
builders produce: gradient hero, sparkle icons, mono uppercase labels, letter-tile thumbnails, a grid of
identical cards, and "Unlock" on every button. The fix is not decoration. It's **fewer, better decisions,
applied everywhere**: one type family, one scale, one palette, one voice and one card style.

---

## 2. The evidence (measured)

| What | Count | Why it matters |
|---|---|---|
| Body font | **Carlito** (a free Calibri clone) | The whole site renders in "Microsoft Office" type. `Calibre`, named first in the CSS, is a paid font that is never loaded, so it always falls back. |
| Arbitrary font sizes `text-[Npx]` | **1,571 uses, 15 different sizes** (9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 15, 16, 17 px…) | No type scale. Sizes are picked by eye per component, so nothing lines up. |
| Text at 9–11 px | **651 uses** (205 at 10 px, 376 at 11 px, 32 at 9–9.5 px) | Too small to read on a phone, and a hallmark of "dashboard template" UI. |
| Distinct hex colours in components | **195** | No palette. Three different "primary blues" (#0284C7 ×375, #0369A1, #0F7BFF ×70), plus warm *and* cool greys mixed (#6B7280 slate next to #5A6470 / #E9E7E1 warm). |
| `font-mono` | **354 uses** | Monospace is meant for code. Used for prices, labels, tags and stats it creates the "AI-generated SaaS" look (`PLACEMENT VAULT PRICE`, `STEP 1`, `#Network Security`). |
| `uppercase` + wide tracking | **406 + 200** | Shouting micro-labels everywhere. Combined with mono, it's the single most "AI template" signal in the app. |
| `Sparkles` icon | **65 uses** (+ Zap 31, Star 30, Flame 24, Trophy 13) | Sparkles is *the* icon of AI-generated UI. It appears on study plan, vault packs, free modules, pricing… |
| Gradients | **53**; blur/glass **35** | Gradient text ("verified vaults"), gradient banners (Masterclass, Skill Test hero, Drops purple). |
| "Unlock / unlock" | **405** | The same verb on almost every call to action. It sounds like a mobile game, not an education product. |
| "verified / Verified" | **155** | Overused to the point of contradiction: the Zscaler page says "Verified" in the hero while every number on it carries an **UNVERIFIED** badge. |
| Garbled characters in data | **4,445** in `db.json` | "Ã¢â‚¬â€" instead of "—" in every Python and C module title and in 7 company vaults. Nothing makes a product look broken faster. |
| Emoji in UI code | 30 | Fine. Not the problem. |

---

## 3. What a first-time visitor actually experiences

Captured as a signed-out visitor on a fresh browser:

1. **Home:** the install-app toast appears, then a "Join our channels" modal dims the whole page, while
   three content rows (*Save on paid courses*, *Popular courses*, *Your first certificate*) are still empty
   grey boxes and pricing says "Loading live pricing…". The first impression is **a popup over an
   unfinished page**.
2. **Courses:** a "Kis saal mein ho? — Step 1 of 5" wizard pops up immediately over the list.
3. **Any course:** the module list reads "Module 1 Ã¢â‚¬â€ Orientation…" (garbled data).
4. **Skill Test:** a completely different product — a bright #0F7BFF gradient hero, centred
   "Know Your Skills. Prove Them.", a "10,000+ Students" claim, then **100 identical cards with the same
   icon**. It looks like a different company's website.
5. **Mock Drive:** a third visual language (iOS blue #007AFF, SF Pro font stack, centred grey screen).
6. **Drops:** a fourth — full-bleed purple gradient with pixel-font "SELECTED".
7. **Company vault (Zscaler):** the busiest page — mono uppercase labels, hashtag chips, four badge
   colours, star ratings next to "Unverified", a navy-to-blue gradient banner, two orange "Finish Pack"
   buttons and a blue "Unlock Now" sticky bar, all on one screen.

**Net effect:** the user can't form a picture of what TieEdu *is*, because every page introduces itself
differently.

---

## 4. Root causes (why it reads as AI-generated)

1. **Template defaults, never replaced.** Centred hero + gradient headline + two buttons + a stats row is
   the default output of every AI page builder. So is "icon in a tinted circle + title + one line" cards,
   repeated in grids of 3 or 4.
2. **Decoration standing in for content.** Sparkles, gradients, glows and badges fill space where a real
   number, photo or sentence should be.
3. **Generic copy.** Title Case Slogans ("Every Company. Every Round. The Real Price."), "Intelligence
   Hub", "Unlock Now", and claims without proof. AI copy is confident and vague; human copy is specific.
4. **No hierarchy rules.** When 15 font sizes, 3 blues and 4 badge styles are allowed, every element
   competes and nothing leads.
5. **Inconsistent product surfaces.** Each feature was built as its own app (Skill Test, Mock Drive,
   Drops, School), so the brand resets every time you change tabs.
6. **Data quality shows through the UI.** Garbled text, empty skeletons and "—" placeholders all over
   Compare make the product feel unfinished, whatever the styling.

---

## 5. The direction: "The route to the offer"

You already have the right idea built: the new company page (route-line rounds, ticket-style pack,
departures-board Drive Radar, honest "Being verified" stamps). **Make that the whole brand**, not one page.

**Personality:** a calm, sharp senior who has been through placement season — specific, honest, a little
warm. **Not** a hype-y startup, **not** a corporate LMS.

**Signature elements (used sparingly, everywhere):**
- **The route line** — progress through any multi-step thing (rounds, course modules, study plan days,
  onboarding) is drawn as stations on a line. This becomes TieEdu's recognisable motif.
- **Stamps** — "Verified · Oct 2026", "From candidate reports", "Being verified". Honesty as a design
  feature instead of a badge pile.
- **Tickets** — anything you buy or earn (pack, certificate, mock drive slot) is a ticket with a stub.
- **The ink band** — one deep navy band per page (hero or a key moment), never more.

---

## 6. Typography

### Fonts (all free, self-hosted with `next/font`)
| Role | Font | Why |
|---|---|---|
| Headings / numbers | **Bricolage Grotesque** (already used on the new company page) | Distinctive, slightly quirky, confident. Nobody mistakes it for a template. |
| UI + body text | **Figtree** *(or Instrument Sans)* | Friendly, very readable at small sizes, not the overused Inter/Roboto. Replaces Carlito. |
| Long-form lessons | **Source Serif 4** | Lessons are thousands of words. A good serif for reading makes courses feel like a real book, which is rare in Indian ed-tech and instantly "premium". |
| Code only | **JetBrains Mono** | Mono is for code. Remove it from labels, prices and tags. |

### One type scale (replace all 1,571 arbitrary sizes)
| Token | Size / line-height | Use |
|---|---|---|
| `caption` | 12 / 16 | Legal, timestamps. **Minimum size in the app.** |
| `small` | 14 / 20 | Meta lines, secondary text |
| `body` | 16 / 26 | Default text |
| `lead` | 18 / 28 | Intros |
| `h4` | 20 / 28 | Card titles |
| `h3` | 24 / 30 | Section sub-heads |
| `h2` | 32 / 38 (mobile 26) | Section titles |
| `h1` | 48 / 52 (mobile 34) | Page titles |
| `display` | 64 / 66 (mobile 40) | Home hero only |

**Rules:** nothing below 12 px. Labels are sentence case at 13–14 px semibold, not mono uppercase.
Uppercase only for tiny eyebrow labels, max one per section. Numbers use tabular figures.

---

## 7. Colour

Replace 195 colours with **one palette** (Tailwind tokens, so a class can't drift):

| Token | Value | Use |
|---|---|---|
| `ink` | #0E2A44 | Headings, ink bands, primary dark |
| `paper` | #F7F6F3 | Page background (warm, not clinical white) |
| `card` | #FFFFFF | Cards |
| `line` / `line-strong` | #E9E7E1 / #D6D2C8 | Borders (warm greys only — drop all slate greys) |
| `text` / `muted` | #3E4754 / #5A6470 | Body / secondary |
| **`signal`** | the **logo orange** (#E8562A-ish, tuned for contrast) | The one action colour: primary buttons, links, active states |
| `money` | #E8A33D | Prices and buy buttons only |
| `train` / `test` / `track` | #0369A1 / #C2410C / #0F766E | Only for those meanings |
| `success` / `warning` / `danger` | #15803D / #B45309 / #B42318 | States only |

**Big change:** today the logo is orange-red but every button is blue (three different blues). Make the
brand colour **the logo's orange**, and retire #0284C7, #0F7BFF and #1F3A5F as primaries. That alone makes
TieEdu look like *one* brand.

**Remove:** gradient text, gradient banners, glass/blur panels, coloured glows. One flat ink band per page
instead.

---

## 8. Components

| Today | Replace with |
|---|---|
| Letter tiles ("C", "P" on a gradient) as course covers | **Generated subject covers**: a pattern drawn from the subject (circuit lines for Electronics, grid paper for Maths, code brackets for Programming) in the subject's colour. Distinctive, consistent, zero design work per course. |
| 100 identical Skill Test cards with the same icon | A **compact list grouped by track** with level, time and your best score; a "Start with these 5" row on top. |
| Pills and badges in 4 styles | One **chip** (filters) and one **stamp** (status) component. |
| Icon-in-tinted-circle feature cards | Plain text with a real number or example. Icons only when they help scanning. |
| Sparkles / Zap / Flame / Trophy | Remove Sparkles entirely. Keep Flame only for streaks, Trophy only for the leaderboard. |
| 3 button styles × 3 colours | **Primary** (signal), **Buy** (money), **Secondary** (outline), **Text link**. Max one primary per screen. |
| Multiple sticky bars and floating buttons | One sticky action bar per page, only on pages with a purchase. |
| Grey skeleton boxes that never fill | Real empty states that tell the student what to do next. Hide a row with no data instead of showing grey. |

---

## 9. Voice and copy (the biggest "not AI" lever)

**Rules**
1. Numbers before adjectives. "2 coding questions, 45 minutes" beats "a challenging coding round".
2. No hype words: *unlock, master, crack, supercharge, intelligence, ultimate, dream*.
3. Sentence case for headings. No Title Case Slogans. No exclamation marks except real celebrations.
4. Claims need proof, or don't make them. Remove "10,000+ Students" unless it's a live count.
5. Hinglish **on purpose**: short, friendly prompts ("Naya ho?", "Kis saal mein ho?") are a real
   differentiator. Keep them, but apply consistently (labels and nudges), not randomly mixed into English
   paragraphs.

**Before → after**
| Today | Better |
|---|---|
| Crack your dream drive with verified vaults | Know every round before you walk into it. |
| Zscaler Intelligence Hub | Zscaler placement prep |
| Unlock Now / Unlock Single Round | Get the Zscaler pack · ₹99 |
| Finish Pack — ₹99 | Get the remaining round · ₹99 |
| Know Your Skills. Prove Them. | Find your weak topics in 15 minutes. |
| Every Company. Every Round. The Real Price. | One price per company. No subscription. |
| Report Submitted for Moderation! | Thanks — we'll check it and publish it within a day. |
| Congratulations! | You passed. Your certificate is ready. |
| 45+ verified questions · code solutions | (only real, current numbers from the data) |

---

## 10. Interaction and first impression

1. **One interruption, maximum, and never on first load.** Today a first visit gets up to three (install
   toast, "Join our channels" modal, "Step 1 of 5" year wizard). Show *none* until the visitor has done
   something (opened a course, finished a test); then at most one, and remember dismissals for 30 days.
2. **No empty grey boxes.** Hide sections whose data hasn't loaded or doesn't exist; server-render the
   important ones.
3. **Motion only for meaning:** state changes and progress (as on the company page). No floating glows.
4. **Phone first:** 16 px body, 44 px tap targets, one primary action per screen, bottom sheets instead of
   modals.

---

## 11. Page by page

| Page | Keep | Change |
|---|---|---|
| **Home** | Branch chips ("Apna branch chuno"), Hinglish nudges, the company search | New hero: one sentence, a search box and *real* proof (live counts). Cut sections from 10 to 6. No popups on load. |
| **Courses** | Filters, honest descriptions | Generated covers instead of letter tiles; fix the garbled titles; remove the auto-opening wizard (offer it as a button: "Help me choose"). |
| **Course page** | Excellent long-form writing | Serif reading font, a route-line module list, sticky "continue" bar on phones. |
| **Skill Test** | Large catalogue | Rebuild in the main brand (no #0F7BFF hero), list grouped by track, "start with these" row, remove the unproven 10,000+ claim. |
| **Mock Drive** | The flow itself | Bring into the main brand (fonts, colours); the signed-out state should explain *what a mock drive is* with a preview, not a blank "Sign in". |
| **Drops** | The feed concept | Real cover photos or typographic covers in brand colours instead of pixel-font purple gradients. |
| **Company vault (old)** | Data honesty | Move every company to the new 3T page (already built), then delete the old layout. |
| **Compare** | Honest "not recorded" labels | Collapse empty rows by default ("Show 9 unrecorded rows"); the wall of "—" makes the product look empty. |
| **Study plan** | Simple form | Draw the plan on the route line / calendar strip like the company page. |
| **Login / signup** | Hinglish "Naya ho?" | Remove the blurred blobs; one calm card on paper. Add "Forgot password". |

---

## 12. How to do it without breaking things

1. **Tokens first (1–2 days).** Put the fonts, type scale and palette into `tailwind.config.js` and
   `globals.css` as named tokens. Nothing visual changes yet.
2. **Codemods (2–3 days).** Scripted replacement of the 1,571 `text-[Npx]` uses with the nearest scale
   token, the 195 hex colours with palette tokens, and `font-mono` on non-code with the body font. Review
   per folder, screenshot before/after.
3. **Shared components (3–4 days).** Button, Chip, Stamp, Card, SectionHead, EmptyState, Sheet, RouteLine,
   generated Cover — built once, used everywhere.
4. **Page passes (2–3 weeks).** Home → Courses → Course → Skill Test → Mock Drive → Drops → Compare → Study
   plan → Login, one PR each, with screenshot checks on desktop and phone.
5. **Copy pass (in parallel).** Apply the voice rules and the before/after table; remove every unproven claim.
6. **Guardrails.** Add a lint test (the project already has "anti-web" tests) that fails on `text-[Npx]`
   below 12, raw hex colours, `font-mono` outside code, and the `Sparkles` icon, so the system can't drift
   back.

**Total: about 4–5 weeks for one developer**, in shippable steps.

---

## 13. Quick wins (1–2 days, very visible)

1. **Repair the garbled text in the data** (4,445 sequences) — a repair helper already exists in
   `backend/src/lib/textEncoding.ts`; run it on a backup copy, check, then swap.
2. **Stop the first-visit popups** (channels modal, year wizard) — show them only after engagement.
3. **Load a real body font** (Figtree via `next/font`) instead of Carlito — one file change, whole site
   looks different.
4. **Remove all 65 Sparkles icons** and gradient headline text.
5. **Raise the 9–11 px text to 12–13 px** (651 places, scriptable).
6. **Switch every company to the new 3T page.**
7. **Delete unproven claims** ("10,000+ Students", "Verified" next to "Unverified").

---

## 14. Decisions needed

| # | Decision | Recommendation |
|---|---|---|
| D1 | Brand action colour: keep blue, or use the logo orange | **Logo orange** (one brand, finally) |
| D2 | Body font | **Figtree** (alternative: Instrument Sans) |
| D3 | Serif for lessons | **Yes — Source Serif 4** |
| D4 | Popups on first visit | **None**; one after engagement |
| D5 | Old company page | **Retire** after moving all companies to the 3T page |
