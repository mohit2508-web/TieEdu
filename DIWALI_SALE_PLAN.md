# Diwali Utsav 2026 — Sale, Membership & Festive Skin Plan

**Window:** from deploy (target 6 Nov 2026, Dhanteras) to **10 Nov 2026, 23:59:59 IST**. Diwali is 8 Nov.
**After the window ends:** every price, banner, popup and decoration switches off by itself at the deadline. No deploy is needed for that. A cleanup commit on 11 Nov removes the Diwali assets.

---

## 0. Ground rules (non-negotiable)

1. **Prices are decided only on the server.** The 50% is applied in `packPrice()` / `effectiveCoursePrice()` and in checkout. The UI only displays what checkout will actually charge, following the "single source of truth" rule in `lib/pricing.ts`.
2. **Honest strike-through.** The struck-out price is the real current list price (₹249 → ₹124). The list price is never inflated before the sale.
3. **Real urgency only.** The countdown counts to the real end time. There are no fake "only 3 seats left" or "47 people viewing" claims, which the CCPA 2023 dark-patterns guidelines ban.
4. **The logo colour never changes** (V3 rule). The Diwali skin works around it.
5. **No festive motion during exams.** There are no popups, fireworks or sound on skill tests, secure-mode mocks, sectional tests, checkout or payment pages.
6. **`prefers-reduced-motion` is respected.** The decorations still show, but without animation. Sound is off by default.
7. **Performance budget.** No new npm packages; we use the framer-motion we already have plus canvas and SVG. All festive code is lazy-loaded, about 40 KB gzipped at most. The LCP of the home page must not get worse.

---

## 1. Offers

| # | Offer | What it means in code | Status |
|---|---|---|---|
| O1 | **50% OFF on every paid course and company pack** | A sale multiplier of 0.5, rounded down to the rupee: ₹99→₹49, ₹169→₹84, ₹219→₹109, ₹249→₹124, and each course's `price_inr` → half | Ready to build |
| O2 | **Free TieEdu membership** | A membership tier does **not exist yet**. It has to be defined (see D1) | Needs decision |
| O3 | **Internship opportunities** | There is **no internship board** yet. It needs real listings from the owner (see D2) | Needs content |

**How it combines with other offers:**
- No stacking. During the sale a coupon is refused unless it is bigger than 50%. A bigger coupon replaces the sale: it is priced against the pre-sale cart and used only when it is actually cheaper. A losing coupon is not consumed.
- With a readiness "personalised path" price, the buyer pays `min(personalised, sale)`.
- With a company page's flat pack cap, the buyer pays `min(cap, sale)`.
- Free courses stay free and get no "50% OFF" badge.

**Orders:** the order stores the sale price on its line items (`sale: 'diwali-2026'`). An order created before the deadline but paid a few minutes after it is honoured at the price on the order. Refunds follow the existing refund policy unchanged.

---

## 2. Architecture: one festival switch

### Backend: `backend/src/lib/festival.ts` (new)
```ts
export const DIWALI_2026 = {
  id: 'diwali-2026',
  starts_at: '2026-11-06T00:00:00+05:30',
  ends_at:   '2026-11-10T23:59:59+05:30',
  discount_percent: 50,
  membership_grant_days: <D1>,
};
activeFestival(now = Date.now()) // returns null outside the window, or if the admin kill-switch db.festival_disabled is on
saleMultiplier(now)              // 0.5 or 1
salePrice(list)                  // Math.floor(list * mult)
```
- Hooked into `packPrice()`, `cappedPrices()`, `effectiveCoursePrice()` and `summarizeCourseLines()`. Each one gets a single `salePrice()` wrapper, so the catalog, the badges and checkout cannot drift apart.
- `GET /api/festival` returns `{ active, id, ends_at, discount_percent, membership, internships_count }` and is public and cacheable for 60 s.
- Admin: an on/off toggle and a "preview festival" flag in the admin panel (`FestivalTab`), so the skin can be checked on production before the start time.

### Frontend: `FestivalContext` + `data-festival="diwali"` on `<html>`
- `_app.tsx` fetches `/api/festival` once. If the festival is active, it sets `document.documentElement.dataset.festival = 'diwali'` and lazy-mounts `<DiwaliLayer/>`.
- **The whole colour change is CSS-variable overrides** under `:root[data-festival='diwali']` and `:root[data-theme='dark'][data-festival='diwali']`. Because Warm Paper is entirely `--rgb-*` channels, no component needs editing to change colour.
- Turning it off removes the attribute and unmounts the layer. Nothing persists.

---

## 3. Diwali visual system ("Deepotsav" skin)

### Palette (layered on Warm Paper, keeps its warmth)
| Token | Light | Dark | Use |
|---|---|---|---|
| Diya gold | `#F5B301` | `#FFC93C` | Primary action (replaces amber), sparkles |
| Marigold | `#FF8A00` | `#FF9F2E` | Toran garland, accents |
| Rani pink | `#D6246E` | `#FF4F93` | Sale badges, "50% OFF" |
| Sindoor maroon | `#7A1530` | `#3A0A16` | The dark band becomes a maroon/indigo night sky |
| Night indigo | `#1B1446` | `#0E0A26` | Hero background for fireworks |
| Paper | Cream stays | — | Body copy stays readable |

Contrast checked to WCAG AA: dark ink stays on gold (same rule as amber), and white text sits only on maroon and indigo.

### Decorative elements (all in `components/festival/diwali/`)
1. **Toran** (`Toran.tsx`): a marigold and mango-leaf garland in SVG along the top edge of the header. It sways gently, a 6 s CSS loop.
2. **Diya row** (`DiyaRow.tsx`): five SVG diyas in the footer and under the hero. Each flame flickers on its own random timing, and the glow is a radial gradient.
3. **Hero night sky** (`DiwaliHero.tsx`): the home hero turns into an indigo sky with:
   - canvas fireworks: 3–5 bursts on load, then one every 4 s, paused when the tab is hidden;
   - floating akash kandil lanterns, 3 SVGs on a slow parallax;
   - a rangoli that draws itself with an SVG `stroke-dashoffset` animation behind the headline;
   - the headline "Is Diwali, apna career roshan karo ✨" with "50% OFF" in shimmering gold text.
4. **Sparkle trail:** on desktop only, and only in the hero area, gold sparkles follow the cursor (capped at 30 particles).
5. **Rangoli corners** on cards: course and company cards get a small corner rangoli motif and a gold border glow on hover.
6. **Festive buttons:** the primary CTA gets a light sweep shimmer once every 5 s.
7. **Diwali favicon and tab title:** the favicon gets a diya overlay. The logo stays unchanged.
8. **Optional sound:** a soft "phuljhadi" crackle when the gift box opens. It is OFF by default and turned on by a 🔊 toggle.

### Surprise moments ("wow" layer)
| Moment | Trigger | What happens |
|---|---|---|
| **S1 Gift-box popup** | First visit per day, 2.5 s after load, not on exam or checkout pages | A wrapped gift box bounces in. Tapping it opens the lid, a firework fires, and three offer cards fan out: 50% OFF, Free Membership, Internships. There is a live countdown and a CTA "Offer pakdo →" |
| **S2 Light a diya** | A clickable unlit diya in the header | Clicking lights it with a flame animation and a sparkle, and shows a toast "Shubh Deepavali, {name}! Aapka offer active hai". Lit state is saved in localStorage |
| **S3 Fireworks on purchase** | Successful payment in the sale window | Full-screen fireworks for 3 s on the "What you got" (PackWelcome) screen, with the message "Diwali dhamaka! Aapne ₹X bachaye" |
| **S4 Diwali day special** | 8 Nov only | Heavier fireworks, a "Shubh Deepavali" greeting card on the home page, and a lakshmi-padam (footprints) rangoli trail |
| **S5 Last-day urgency** | 10 Nov | The countdown bar turns rani pink and reads "Aaj raat 11:59 tak — last chance". This is real |
| **S6 Membership unlock** | Signup or login in the window | A golden card flip: "Aap ab TieEdu Member ho ✨", with a confetti burst |

### Where the sale appears
- **Sticky top bar** (`SaleBar.tsx`): "🪔 Diwali Utsav: Sab courses 50% OFF + Free Membership · ends in 4d 12h 03m". Dismissible for the session, and it reappears on the last day.
- **Course cards and company packs:** a rani-pink "50% OFF" ribbon, the struck-out price and the gold sale price.
- **Course detail, pricing page, buy sheet and cart:** the same, plus "Diwali saving ₹X" on the receipt.
- **New `/diwali` landing page:** the hero sky, the three offers in detail, top courses at sale prices, the internships section and an FAQ (end date, refunds, no stacking). Shareable, with an OG image.
- **Mobile:** a slim sale bar, a full-screen bottom-sheet gift popup, and the tab bar gets a small diya on "Courses".
- **Today dashboard:** a festive greeting card plus "Your Diwali offer" with membership status.

---

## 4. Free membership (O2), proposed design (pending D1)

There is no membership concept today, so we create a minimal, honest one:
- `user.membership = { tier: 'member', source: 'diwali-2026', granted_at, expires_at }`
- **Who gets it:** every user who signs up or logs in during the window (one tap: "Claim free membership").
- **Duration:** see D1. The suggestion is **3 months**.
- **Perks (proposed, all already exist in the codebase so nothing is fake):**
  - extra free mock attempts per company (for example 3 instead of 1);
  - all company lessons and 3T Train content opened up;
  - a "TieEdu Member" gold badge on the profile and certificates;
  - first access to the Diwali internship listings (O3);
  - priority in talent search, only if the student has opted into talent search.
- After it expires, the user goes back to the normal free tier with nothing lost. They get a reminder email 7 days before.

---

## 5. Internship opportunities (O3), pending D2

We **will not invent listings.** Each listing needs real data from the owner:
`company, role, location/remote, stipend, duration, eligibility, apply link or apply-in-app, deadline`.
- `db.internships[]` plus an admin "Internships" tab to add, edit and close listings.
- The `/diwali#internships` section and a `/internships` page.
- If listings are member-only, applying needs the membership, which ties O2 and O3 together.
- If the owner has no partner listings by deploy, the fallback is **TieEdu's own internships** (campus ambassador, content or community intern), clearly labelled "at TieEdu".

---

## 6. Announcement (uses existing infrastructure)
- **Email:** a Diwali campaign through `emailCampaigns` with three sends: launch (6 Nov), Diwali day (8 Nov) and last day (10 Nov, morning). Each respects unsubscribe.
- **Push:** the same three moments through `lib/push.ts`, sent at 10 AM IST.
- **SEO and social:** an OG image for `/diwali`, plus the "Diwali sale" meta on the home page only during the window.

---

## 7. Build phases (5-day timeline)

| Phase | Day | Work | Done when |
|---|---|---|---|
| **P1 Engine** | 5 Nov | `festival.ts`, sale price hooks in pricing, readiness and checkout, `/api/festival`, admin toggle and preview, order line tagging, unit tests for every price path (pack ladder, cap, coupon min, personalised min, free course, before and after the window) | Checkout charges ₹124 for a full pack in the window and ₹249 outside it |
| **P2 Skin** | 5–6 Nov | CSS token overrides for light and dark, Toran, DiyaRow, festive buttons and cards, SaleBar with countdown, price ribbons everywhere | Every page looks Diwali; contrast passes AA |
| **P3 Wow** | 6 Nov | DiwaliHero (fireworks, lanterns, rangoli), gift-box popup S1, light-a-diya S2, purchase fireworks S3, reduced-motion fallbacks | Smooth at 60 fps on a mid-range Android, no layout shift |
| **P4 Membership** | 6 Nov | Model, claim flow, perks wiring, badge, S6 flip card | A new signup gets the membership and the extra mock attempt works |
| **P5 Internships + /diwali** | 6–7 Nov | Model, admin tab, listing pages, landing page, OG image | Owner can add a listing from admin |
| **P6 Launch** | 7 Nov | Email and push campaigns, `next lint` + `tsc` + `next build`, a browser pass on desktop, mobile and dark mode, owner deploys | Live, previewed through the admin flag first |
| **P7 Diwali day** | 8 Nov | S4 special mode switches on by date (built in P3) | — |
| **P8 Auto-off + cleanup** | 10 Nov 23:59 / 11 Nov | Everything turns itself off at the deadline. On 11 Nov a commit removes the Diwali assets and the sale hooks. The `festival.ts` engine stays for Holi and New Year if the owner wants | The site is back to normal Warm Paper; existing memberships keep running until their expiry |

---

## 8. Testing checklist
- Price tests for each path above, with time injected at `starts_at − 1s`, inside the window, and at `ends_at + 1s`.
- Checkout end to end in the sandbox: pack, course, coupon, and the AI.FIRST ₹99 → ₹49.
- No popup or animation on `/skill-test/*`, `/mock-drive/*`, `/prep/*` test views, `/checkout` or `/account/*` billing.
- Reduced-motion, dark mode, 360 px mobile and keyboard focus on the gift popup (Esc closes it, focus is trapped).
- Lighthouse on home before and after: performance drop under 5 points.

---

## 9. Decisions needed from owner

- **D1 Free membership:** what it unlocks and for how long (suggested: 3 months, perks in §4).
- **D2 Internships:** a list of real internships (company, role, stipend, apply link, deadline), or TieEdu's own internships as the fallback?
- **D3 Scope of 50%:** all paid courses **and** company packs (suggested), or courses only? Is the ₹99 AI.FIRST course included (→ ₹49)?
- **D4 Start time:** as soon as it is deployed, or from 6 Nov 00:00 IST (Dhanteras)?
- **D5 Sound:** keep the optional crackle sound (off by default), or no sound at all?

---

## 10. Build status (2026-11-05)

Built on branch `feat/diwali-2026`, decisions D1–D5 taken as the suggested defaults:
- D1: 3-month membership with the perks in §4.
- D2: TieEdu roles seeded as **drafts**. The owner fills in the stipend and opens them in Admin → Diwali sale.
- D3: courses and company packs, AI.FIRST included.
- D4: the sale is live as soon as it is deployed (window starts 5 Nov).
- D5: optional crackle sound, off by default.

| Phase | Status |
|---|---|
| P1 Engine | Done: festival.ts, catalog and checkout, admin mode, membership, internships API, 37 unit checks |
| P2 Skin | Done: diwali.css tokens (light and dark), toran, footer diyas, sale bar, price strike-throughs |
| P3 Wow | Done: night-sky hero, gift popup S1, header diya S2, purchase fireworks S3, Diwali-day mode S4, last-day bar S5, member card flip S6 |
| P4 Membership | Done: claim flow, +2 mock attempts, lessons opened |
| P5 Internships + /diwali | Done: /diwali, /internships, admin tab |
| P6 Launch | Pending: email and push campaign (needs the owner's go-ahead to send), deploy by the owner |
| P8 Cleanup | 11 Nov: remove the Diwali UI and sale hooks. Keep `membershipOf` / `isMember` and the internship board, because memberships run until Feb 2027 |
