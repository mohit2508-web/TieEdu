# TiEEdu Store: 3D Showcase, Swag Designs, Earning Guide and Site Speed — Plan

Owner request (2026-11-11), in short:

- **Product display:** the rewards and swag (hoodie, T-shirt, bottle, stickers, box) must look premium, not like plain cards. Students should be able to turn each item in 3D.
- **Product popup:** a click opens a popup with every view, the full description and what comes in the box.
- **Designs:** design premium merch (black, with the TiEEdu logo). The owner will upload photos as source material.
- **Frame try-on:** students can see their own photo inside the profile frame.
- **Earning guide:** explain clearly how to earn the coins for each item.
- **Home page:** home-page promos such as "Earn a bottle free".
- **Speed:** the site loads slowly; find out why and make it faster.

---

## Part A — Why the site is slow (measured)

| Finding | Evidence |
|---|---|
| **`loadDb()` reads and parses the whole database on every API call.** No caching. 542 call sites. | `backend/src/data/db.ts:2337`. Local copy (13.9 MB, 2 Nov): read 41 ms + `JSON.parse` 42 ms + upgrade loops, about 85 ms+ per call. Production is larger. |
| **`saveDb()` pretty-prints the whole database** (`JSON.stringify(data, null, 2)`) and rewrites the file on every save. | 63 ms per save locally, and the file is about 30% bigger than it needs to be. |
| **Every save also uploads the whole database to CockroachDB (Europe).** A second full stringify happens, and uploads queue up one after another; they are never merged. | `backend/src/store/index.ts` `PgStore.save`. 100 saves means 100 full uploads in the queue. |
| Node runs on **one thread**, so all of the above blocks every other user. | A page that makes 6–10 API calls waits 0.5–1 s or more for CPU alone, and longer when other users are active. |
| `courses` is 7.6 MB of the 13.9 MB. | Every request parses all course content, even when it only needs a user row. |

### Fixes (in order of impact and safety)

1. **Keep the database in memory.** `loadDb()` returns the parsed object from memory. It reads the file again only when the file's modified time or size has changed (so a second process or a manual edit is still picked up). `saveDb()` updates the in-memory copy. The upgrade loops run once per load from disk, not once per request.
   - This also fixes "lost updates": today two overlapping requests each load their own copy, and the later save wipes out the earlier one's change.
   - **Risk:** code that changes the object and never saves will now be visible to other requests in memory. Before switching, audit the GET routes that change data (for example `buildPrep` writing the readiness log). Add a safety switch, `DB_CACHE=0`, to go back to the old behaviour.
2. **Save in compact form** (no pretty-print). The file gets about 30% smaller and saves get faster.
3. **Merge mirror uploads.** At most one upload is in flight, the newest state replaces any older waiting one, and uploads are spaced at least 5 s apart (`MIRROR_MIN_INTERVAL_MS`). The local file stays the source of truth, as it is today.
4. **Add timing headers.** Each response gets `Server-Timing: db;dur=…` so we can see the effect in the browser's DevTools on the live site. The admin health page also shows the database size and the 95th-percentile load time.
5. **Frontend.**
   - The 3D code (three.js, ~150 KB gzip) loads only when a viewer opens, so the home page does not pay for it.
   - Store cards keep light SVG art.
   - Images get `loading="lazy"` and explicit sizes.
   - We check the bundle with `next build` output and remove anything heavy from the home page.
6. **Later (separate project):** move away from one big JSON document (the Contabo Postgres migration, already planned in CONTABO_POSTGRES_MIGRATION_PLAN.md). The cache above gives most of the speed now, without that migration.

**Expected result:** API calls drop from roughly 100+ ms of CPU to a few ms, and pages stop queueing behind each other.

---

## Part B — Store showcase (rewards page)

### B1. Layout

- **Hero product stage:** a large 3D turntable of the featured item (the hoodie by default; the admin chooses which). It turns slowly on its own, and the student can drag to rotate.
  - Beside it: the name, the coin price, the student's progress ("You have 1,240 / 10,000"), "Set as my goal" and "How to earn it".
  - Small thumbnails switch the stage to the next item.
- **Swag shelf:** premium tiles.
  - Soft studio background and a gentle 3D tilt on hover (CSS perspective; no WebGL in the grid, so it stays fast).
  - A shine sweep on the art, the price and the progress bar.
  - A "Launching soon" ribbon when stock is 0.
- **Rewards row:** the digital rewards (streak repair, frames, coupon, pack, membership) shown as glossy collectible cards, not plain boxes.
- **"How to earn" strip** across the page (see B5).

### B2. Product popup (full screen on phones, large dialog on desktop)

- **3D viewer**
  - Drag or swipe to rotate, scroll or pinch to zoom, double-click to reset.
  - Auto-spin until the student touches it.
  - Buttons: **Front / Side / Back / Top**, which animate the camera to that view.
  - Colour picker where the item has colours (for example Midnight Black or Bone White).
  - Hoodie and T-shirt: a "Size guide" tab with chest and length in cm, plus a fit note.
  - Kit box: an **"Open the box"** button that lifts the lid and shows the contents one by one.
- **Photo tab:** once the admin uploads real product photos, they appear as a swipeable gallery, with the 3D view as the first slide.
- **Details**
  - The full description, plus material and specs (fabric GSM, bottle capacity and how long it keeps drinks hot or cold, and so on).
  - **What's in the box**, as a checklist with small icons.
  - Delivery: India only, about 7 working days, tracking shown under Your orders.
- **Your path to it**
  - Coins needed and coins already held.
  - An estimate, for example "≈ 23 days at your current pace". It uses the student's average coins per day over the last 14 days; for new users it uses a typical day.
  - A plan of what to do, for example "Daily problem + 3 medium solves + streak = ~120/day".
- **Actions:** Get it / Keep earning / Set as my goal / Share ("I'm earning the TiEEdu hoodie").

### B3. 3D models (built in code with three.js; no downloaded models, so no licence issues)

All models are lit with a soft studio environment (three's RoomEnvironment) so metal and ceramic catch reflections. They sit on a soft contact shadow. The logo comes from `public/logo.svg`, drawn onto the material, and **its colours are never changed**.

| Item | Model | Design |
|---|---|---|
| Steel bottle | Lathe (turned) body, screw cap, steel loop | Matte black powder coat with a brushed steel cap. Logo on the front, "Practise daily." up the back. |
| Coffee mug | Lathe body + torus handle, glossy ceramic | Black outside, orange inside. Logo on the front, "// compiled at 2 AM" on the back. |
| T-shirt | Soft "inflated" tee silhouette (fabric-like, rounded edges) with fabric texture | Midnight black, 240 GSM heavyweight. Chest logo; back print "TiEEdu · Code. Crack. Repeat." |
| Hoodie | Inflated hoodie with hood, kangaroo pocket and drawstrings | Black, 400 GSM fleece. Logo on the chest; sleeve print "Est. 2026"; back print. |
| Cap | Dome + curved brim, stitched panels | Black, with the embroidered logo on the front. |
| Sticker pack | 6 die-cut stickers fanned out in 3D, glossy with a white border | The logo, "Brain on", "Accepted ✓", "// compiled at 2 AM", "100-day streak 🔥", "Dry run passed". |
| Keychain | Extruded brain shape, brushed metal | — |
| Notebook | Hard cover, elastic band, ribbon | Black, with a debossed logo. Dot grid; Big-O cheat sheet inside the cover. |
| **Welcome kit box** | Rigid box with a magnetic lid, black soft-touch, foil logo | The lid lifts, a tissue layer slides away, then the contents rise up: bottle, notebook, sticker pack, keychain and a welcome card ("Welcome to TiEEdu, \<name>"). |
| Laptop sleeve, backpack | Simple soft-box models | Kept inactive, as they are today. |

**Owner's photos:**
- The admin page gets **"Print artwork"** per item (front and back). If uploaded, it replaces the default print on the 3D model, so the owner's own designs show on the tee, hoodie or bottle.
- The admin page also gets a **"Product photos"** gallery per item for real photos later.

### B4. Profile frame try-on

- In the frame popup: **"Try it with your photo"**. The student picks a photo; it stays **only in the browser** and is never uploaded.
- The photo appears inside a bronze, silver or gold ring with a metallic shine animation, at leaderboard size and profile size, and the student can switch between the three frames.
- Signed-in students without a photo see their initials.

### B5. Earning guide ("How coins work")

- **Earn table:** a clear table of every earning rule, from the admin's rules (`fetchCoinRules`): what you do → coins → daily cap.
- **Calculator:** "I can practise ___ minutes a day" → expected coins per day → days to each item, shown as a timeline (Repair in 1 day, Bronze frame in 2 days … Hoodie in about 80 days).
- **Milestone ladder:** a vertical path with the items placed at their coin price, and the student's current position marked as "You are here".
- **Fair-play rules:** no coins if you open the solution first, daily caps, how refunds work, and that physical items need an account at least 30 days old.

### B6. Home page

- **Swag showcase band** under the existing CoinsStrip: three items on a slow carousel (bottle, hoodie, kit box) with "Practise daily → earn it free".
- **Side promo popup** (bottom-right on desktop, bottom sheet on phones):
  - Text such as "Earn this steel bottle free — practise 20 min a day", with an animated image of the item.
  - Buttons "See how" → /rewards#earn and "Not now".
  - Shown at most once a day, never on the first 10 seconds of a visit, never on top of the Diwali hero or other popups, and switched off for 7 days after "Not now".
  - The admin can switch it off and choose which items rotate.
- Signed-in students see their own goal: "You're 760 coins from the bottle."

---

## Part C — Data and admin changes

- **`StoreItem` gains:** `details` (long text), `specs` (key/value list), `in_box` (list), `colors` (name + hex), `size_chart`, `model` (3D model key), `print_front` and `print_back` (uploaded artwork URLs), `gallery` (photo URLs), `promo` (show in the home popup).
- **Default content** for every item: written descriptions, specs and box contents (owner can edit).
- **Admin → Practice → Rewards & store:** edit the new fields, upload the print artwork and photos (using the same upload route the store image uses now), and a promo on/off switch.

## Part D — Build order

1. **Speed fixes (Part A 1–4).** Tests, then a load test comparing old and new.
2. 3D viewer core: lazy loaded, studio lighting, controls, camera views, WebGL fallback to the SVG art.
3. Models: bottle, mug, cap, stickers, notebook, keychain, kit box (with the open animation), tee, hoodie.
4. Product popup + rewards page showcase + earning guide + frame try-on.
5. Home band + side popup.
6. Admin fields + uploads + default content.
7. Checks:
   - `next lint` and `tsc`.
   - Phone and desktop browser check.
   - Lighthouse score on home and rewards (3D must not load on the home page until it is needed).
   - `prefers-reduced-motion` turns off auto-spin and animations.

## Part E — Accessibility and performance rules

- Every 3D viewer has a text description and a "Show photo instead" option.
- Keyboard: arrow keys rotate, +/- zoom.
- Rendering pauses when the viewer is off screen or the tab is hidden.
- Pixel ratio is capped at 2, and phones get a lighter model.
- No 3D in grids or lists; 3D appears only in the hero stage and the popup.

---

## Built (2026-11-11)

The owner chose: all 4 speed fixes; print-artwork uploads; tee and hoodie in Black and Bone White; the home popup for everyone, once a day.

| Part | Files |
|---|---|
| In-memory store, compact saves, timings | `backend/src/data/db.ts` (`loadDb` cache keyed on mtime/size/inode, `invalidateDbCache`, `dbTimings`, `dbStats`), `backend/src/server.ts` (Server-Timing header; the cache is dropped after a 400, 409, 422 or 5xx response; `store_memory` on the health route). `DB_CACHE=0` turns the cache off. |
| Merged CockroachDB mirror | `backend/src/store/index.ts` `PgStore.save`: at most one upload at a time, newest state wins, at least `MIRROR_MIN_INTERVAL_MS` (5 s) between uploads. |
| Showcase data | `backend/src/lib/storeContent.ts` (default content for every item); `lib/store.ts` (new fields with validation); `routes/store.routes.ts` (`showcase()` merge, `pace`, `GET /api/store/promo`, `GET /api/store/media/:name`, admin `POST /media` and `PUT /promo`). |
| 3D | `frontend/src/components/store3d/models.ts` (9 models built in code), `Viewer3D.tsx` (lazy-loaded, OrbitControls, RoomEnvironment, view buttons, pauses when off screen, reduced motion, keyboard). |
| UI | `ProductSheet.tsx` (popup), `ShowcaseHero.tsx`, `EarnGuide.tsx` + `lib/storeEarn.ts`, `FrameTryOn.tsx`, `SwagPromo.tsx` (`SwagBand` + `SwagPromo`), the reworked `ItemCard` in `coins/StoreSection.tsx`, and CSS in `globals.css` (`swag-*`, `frame-sweep`). |
| Admin | `components/admin/StoreAdminTab.tsx`: Showcase editor per item (description, specs, box contents, colours, front/back print upload, photos, promo) and a global promo switch. |
| Tests | `npm run test:dbcache` (9), `npm run test:showcase` (12); both are in `npm test`. |

Known issues, not caused by this work (they fail the same way with `DB_CACHE=0`):
- `test:signins` "installed app" (user-agent parsing).
- `test:smoke` "dead Vimeo id" (that Vimeo video is live now).
