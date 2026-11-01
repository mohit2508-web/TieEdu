# Feed · Courses · Skills: redesign plan

> Owner request, 2026-11-01: the Feed, Courses and Skills pages do not match the
> rest of the Warm Paper UI. Make them attractive, smooth and readable; Feed
> content stays managed from the admin panel. Same tokens, fonts and components
> as the rest of the site (UI_REDESIGN_PLAN_V3).

## 1. Problems found (screenshots, 1366px, light theme)

| Page | Problem |
|---|---|
| Feed (`/drops`) | On desktop each drop is one full-width poster (1100px wide); the text is buried at the bottom; Save/Share/Not me float over the art; the filter rail is a long list of 14 grey pills. Feels like a phone screen stretched to a monitor. |
| Courses (`/courses`) | One-column horizontal list: tiny thumbnails, 13–14px body text, meta text ~12px; long checkbox rail (Branch, Bucket, Type, Level, Category) pushes cards down; four "quick" cards repeat the filters. Hard to scan. |
| Skills (`/skill-test`) | Cards are text-only boxes with no visual identity per category; nothing points to the company mocks (the 3T core); categories are a flat wall of chips. |

## 2. Design (all three share these rules)
- Body text 16px, card titles 18–20px Poppins, meta 14px (never below 13px).
- Cards: `rounded-card`, edge shadow, hover lift (respects reduced motion).
- Category colour comes from one map (tokens only), used as a tile behind an icon.
- Phone: one column, sticky filter chips that scroll sideways; nothing wider than the screen.

## 3. Skills page
1. Hero (teal band) keeps the promise, adds live numbers: tests, certificates issued.
2. **Company mocks** row first: big cards for each company mock (Infosys SE: 54 Qs · 100 min · real pattern) linking to the test. This is the 3T link.
3. Category chips with icons and counts; search stays.
4. Skill cards: category icon tile, name, "10 Qs · 15 min", level, Certificate tick, Popular badge, arrow; 3–4 per row.
5. "Your progress" strip (signed in): tests taken, best score, certificates (later).

## 4. Courses page
1. Hero shorter; search + sort + "Help me choose" in one bar.
2. Goal cards (Exam prep / Placement / Industry tools / Weekend) become the main filter (tabs), not a duplicate.
3. **Card grid** (3 per row desktop, 1 phone): 16:9 thumbnail on top, title 18px, one-line summary 15px, meta row (modules · lessons · time) 14px, badges, full-width "Start learning".
4. Advanced filters (branch, bucket, level, type) move into a collapsible "Filters" panel; active filters show as removable chips.

## 5. Feed page
1. Desktop = three columns: filter rail (compact, icon + label) · **feed column (max 600px)** · right rail.
2. Drop card: image 16:9 (not full screen), type chip, title 20px, bullet points, primary CTA, and an action row (Save · Share · Not me) under the card, not over the art.
3. Right rail: "Deadlines this week" and "Your saved" (from existing drop data), plus the Today countdown when a drive date is set.
4. Phone keeps the swipe-style full-screen feed (it works on phones).
5. Admin: drops are already created, scheduled and edited in Admin → Drops; add a **"Pin to top"** flag so admins can feature a drop.

## 6. Order and done-when
| Step | Done when |
|---|---|
| 1 Skills | Company mocks row live; icon cards; phone 360px clean |
| 2 Courses | Grid cards with 16px text; filters collapsible; phone clean |
| 3 Feed | Desktop 3-column with 600px cards; phone unchanged; admin pin works |
| 4 Check | Screenshots light/dark at 390 and 1366; guard tests pass |
