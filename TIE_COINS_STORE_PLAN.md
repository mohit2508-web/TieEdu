# TiE Coins, streaks and the TiEEdu Store

Status: **plan, waiting for the owner's decisions (§11)**. Date: 2026-11-11.

The goal: a student who practises every day can **see** themselves growing, earns **TiE Coins** for it, and spends them on things they want:
- a TiEEdu hoodie or bottle;
- a company pack;
- a month of membership;
- a mock interview.

Long streaks also open **opportunities** that money cannot buy. Everything carries TiEEdu branding. Every rule, price and item is run from the admin panel.

---

## 1. How LeetCode does it (research, 2026-11)

LeetCode has no official public table, so these figures come from its support page, a store snapshot and community posts. Prices change, and LeetCode has raised them before.

### Earning (LeetCoins)

| Action | Coins |
|---|---|
| Daily check-in (open the site) | 1 / day |
| 30-day check-in streak | +30 |
| Solve the Daily Challenge | 10 |
| 25 daily challenges in a month without a Time Travel Ticket | +25 |
| All daily challenges in a month without a ticket | +50 |
| Weekly / biweekly contest, take part | 5 |
| First contest | 200 |
| Contest top places | more |
| First Discuss solution post | 50 |
| Upload an avatar | 5 |
| Link social accounts | small amount |
| A question you contributed, once approved | 1,000 |

### Store (late-2025 snapshot)

| Item | LeetCoins |
|---|---|
| Time Travel Ticket | 70 |
| 30-day Premium | 6,000 |
| Cap | 6,500 |
| T-shirt | 7,200 |
| Kit | 9,400 |
| Laptop sleeve | 9,600 |
| Big O Notebook | 12,000 |
| Hoodie (sometimes out of stock) | 16,000 |

### Time Travel Ticket

- It repairs a missed Daily Challenge.
- At most **3 a month**, and only within the same month (UTC).
- It restores the streak flame but not the "max streak" on the heat map.
- It does not cost the monthly badge.

### Badges

- **Monthly badge:** every daily challenge done that month.
- **Annual badges:** 50, 100 and 300/365 days with at least one solve in the year.
- They show on the profile.

### What makes it work

- **The daily problem is the habit**, and coins are only the scoreboard.
- **Physical swag is a long goal:** about 6 months of daily solving for a T-shirt.
- **The repair ticket keeps people from quitting** after one missed day.
- **Badges are public**, so the profile becomes proof.

### What we do better

- **Show the goal.** A progress bar to the item you want, so the student is never "just collecting".
- **Spend on what helps.** Coins buy company packs, membership and mock interviews, not only merch.
- **Opportunities for consistency** (§5), which LeetCode does not give.
- **India-first:** IST day boundary, ₹-anchored values, delivery in India, WhatsApp share cards.

Sources: [Time Travel Tickets (LeetCode support)](https://support.leetcode.com/hc/en-us/articles/14677342930835-What-Are-Time-Travel-Tickets), [Daily LeetCoding Challenge post](https://leetcode.com/discuss/post/655704/), [Ways of earning LeetCoins](https://leetcode.com/discuss/general-discussion/3620981/Different-Ways-of-Earning-LeetCoins/), [Earn max LeetCode coins (DEV)](https://dev.to/aakhtar3/earn-max-leetcode-coins-2jdf), [Store snapshot](https://kaverichougule.github.io/LeetCode_Clone/store.html), [LeetCoin calculator](https://leetcoin-calculator.vercel.app/), [Store price increase thread](https://leetcode.com/discuss/interview-question/6067181/Leetcode-Store-Item-Price-Increased-Dramatically-Leet-Coins-Inflated-Demotivated!/), [2023 annual badges](https://leetcode.com/discuss/general-discussion/4392424/2023-Annual-Badge-Record-Your-Effort-and-Journey-of-Growth%21/).

---

## 2. What TiEEdu already has (reuse, do not rebuild)

| Already built | Where | How it is used here |
|---|---|---|
| XP ledger: append-only, idempotent keys, server-set amounts | `lib/xp.ts`, `db.xp_ledger` | Coins use **the same pattern** in a separate `coin_ledger`. XP stays the rank (leaderboard, levels); coins are the currency you spend. |
| Study streak, IST day, a free freeze each week | `lib/streak.ts`, `touchStreak` | Stays as the main streak. The paid **Streak Repair** (§4) adds to it. Practice Accepted now also counts a day (today it does not; fix in phase 1). |
| Daily MCQ challenge (`/daily`) + **daily coding problem** (Practice home) | `dailyChallenge.routes.ts`, `practice.routes.ts` | Both earn coins. The daily problem is the main habit. |
| Badges | `lib/perks.ts` `user_badges` | Monthly and streak badges. |
| Coupons | `db.coupons` | Coin purchases of a discount mint a single-use coupon, so checkout stays untouched. |
| Membership (`user.membership`, `isMember`) | `lib/festival.ts` | "30 days of membership" in the store extends `expires_at`. |
| Internships (members only), recruiter talent pool (admin-verified recruiters, anonymous candidates, student accepts contact) | `lib/internships.ts`, talent | Opportunities for streaks (§5), inside the owner's existing privacy rules. |
| Push + email lifecycle | web push, email | "Your streak is at risk" and "You are 200 coins from the bottle". |

---

## 3. Earning TiE Coins

All of these come from the server, with an idempotent key, so a double-click or a retry never pays twice. Admins can change every amount and turn each rule on or off (§7).

| # | Action | Coins | Key / limit |
|---|---|---|---|
| E1 | Daily check-in: any learning on the day (lesson, problem run, test) | 1 | `checkin:{user}:{day}` |
| E2 | **Solve today's daily problem** | **10** | `daily:{user}:{day}` |
| E3 | Finish today's daily MCQ challenge | 5 | `dailymcq:{user}:{day}` |
| E4 | First Accepted on a practice problem: easy / medium / hard | 2 / 5 / 10 | `solve:{user}:{problem}`; **no coins if the solution was opened before solving**; at most 40 coins a day from E4 |
| E5 | Streak milestones: 7 / 30 / 60 / 100 / 200 / 365 days | 20 / 75 / 150 / 300 / 600 / 1,500 | `streak:{user}:{n}:{run-start}` |
| E6 | Perfect month: every daily problem, no repair | 100 | `month:{user}:{yyyy-mm}` |
| E7 | 25+ daily problems in a month | 40 | as above |
| E8 | Finish a company set level / the whole set | 25 / 200 | `level:{user}:{set}:{n}` |
| E9 | Submit a company mock test / score 70%+ | 10 / +25 | first time per test |
| E10 | Finish a course | 50 | `course:{user}:{id}` |
| E11 | Profile: complete it / verify phone / add LinkedIn / add GitHub | 10 / 10 / 5 / 5 | once each |
| E12 | Refer a friend who solves their first problem | 50 | at most 20 referrals a month |
| E13 | Report a real exam question; admin approves it | 200 | admin grants it |
| E14 | Monthly top 10 on the coin leaderboard | 500 → 100 | admin confirms |

**A steady student earns about 500–700 coins a month**:
- daily problem: 300
- check-ins: 30
- streak milestones: about 95
- problems: about 150
- perfect month: 100

**A casual student earns about 100–200.**

---

## 4. The TiEEdu Store (`/rewards`)

**Suggested value:** 10 coins ≈ ₹1 (decision C1). Physical items are priced to need 4–12 months of steady practice, like LeetCode.

### 4.1 Digital: cost us nothing, help the student

| Item | Coins | What happens |
|---|---|---|
| **Streak Repair** (our Time Travel Ticket) | 60 | Fills one missed day this month. At most 3 a month, only for days in the current month. Does not count toward the "perfect month" bonus. |
| Profile frame / name colour (Bronze, Silver, Gold) | 150 / 400 / 900 | Shown on the leaderboard and profile. |
| ₹50 off any course | 600 | Mints a single-use coupon. |
| One company pack (₹99 value) | 1,500 | Unlocks the pack for that company. |
| 30 days of TiEEdu membership | 2,000 | Extends `membership.expires_at`. |
| Peer mock interview, priority slot | 800 | A booking credit. |
| Expert mock interview / resume review by a mentor | 3,500 / 2,500 | Needs mentor capacity (decision C4). |

### 4.2 Swag: all TiEEdu branded, shipped in India

| Item | Coins | Rough cost to us (₹) |
|---|---|---|
| Sticker pack (logo, "Brain on", "Accepted ✓") | 600 | 40–60 |
| Keychain (metal brain) | 1,200 | 80–120 |
| Coffee mug ("// compiled at 2 AM") | 2,500 | 180–250 |
| Placement notebook: dot grid, a Big-O cheat sheet inside | 3,000 | 200–300 |
| Steel water bottle | 4,000 | 300–450 |
| Cap | 4,500 | 250–350 |
| T-shirt (black / cream) | 5,500 | 300–450 |
| Laptop sleeve | 7,000 | 450–600 |
| Hoodie | 10,000 | 700–900 |
| **Welcome kit**: bottle + notebook + stickers + keychain, in a TiEEdu box | 9,500 | 650–900 |
| Backpack | 15,000 | 1,000–1,400 |

**Rules**
- **Address and phone are asked at checkout.** Only after the student has phone verification and an account at least 30 days old (anti-farming).
- **Stock is per item and size.** An item at zero stock shows "Out of stock, notify me".
- **Each physical order goes to an admin queue:** placed → approved → packed → shipped (tracking number) → delivered.
- **Cancelled or rejected:** the coins go back to the student automatically, as a new ledger row.
- **Product photos:** until real photos exist, each item shows a TiEEdu-branded illustration (SVG mock-up with the logo). Admins replace it by uploading a photo.

---

## 5. Opportunities: earned, not bought

They make a streak worth more than coins. Each is shown as "unlocks at N days" with a progress bar.

| Streak / level | Unlocks |
|---|---|
| 7 days | "Consistent Coder" badge + a share card (WhatsApp / LinkedIn) |
| 30 days | **Streak Star** badge. Priority seat in the next mock drive. 1 free Streak Repair. |
| 60 days | **Shown as "Streak Star" to verified recruiters** in the talent pool. The student opts in; it stays anonymous until they accept contact (the owner's existing rule). |
| 100 days | 30 days of membership free (so internships open). A **TiEEdu 100-day certificate** with serial + QR. |
| 200 days | Welcome kit shipped free. A 1:1 mock interview with a mentor. |
| 365 days | Hoodie + the "Year of Code" badge. Featured on the TiEEdu wall (opt-in). |
| Monthly top 10 | Coins (E14) + a "Top 10" badge for the month. |

**Every opportunity is real and run by TiEEdu.** No promised referrals or jobs. The wording is always "eligible for", never "guaranteed".

---

## 6. Where students see it (the CTA, made attractive)

1. **Home page, top: "Practise daily. Earn TiE Coins. Get the hoodie."**
   - A swag strip: hoodie, bottle, T-shirt, kit.
   - Signed out: "Start your streak" leads to sign-up.
   - Signed in: your coins, streak flame, and a goal bar ("**320 / 4,000** to the steel bottle").
2. **Header chip:** 🔥 streak + coin count. Tap it to open a small panel: today's tasks (check-in, daily problem, MCQ), with ✓ for those done.
3. **`/rewards` store:** how to earn (table §3), the catalogue with "You can get this" / "820 more coins", and **"Set as my goal"**, which pins the goal bar everywhere.
4. **Practice:**
   - "+10 TiE Coins" on the daily problem card.
   - The Accepted banner shows "+5 coins".
   - The right rail shows the goal bar.
5. **Streak page (`/streak`):**
   - a monthly calendar (solved / repaired / missed);
   - the monthly badge progress ("19 / 30");
   - milestone timeline (7, 30, 60, 100, 200, 365) with what each unlocks;
   - a Repair button on missed days.
6. **Nudges** (existing push / email; quiet hours respected):
   - 9 PM IST "Your 23-day streak ends at midnight";
   - "You are 200 coins from the T-shirt";
   - the milestone share card.
7. **Profile:** badges row, max streak, coin total, frame colour.

---

## 7. Admin panel: everything from one place

New admin section **"Rewards & store"**:

| Tab | What admins do |
|---|---|
| **Earning rules** | Table of E1–E14: amount, on/off, daily/monthly caps. Changes apply to new events only (the ledger is never rewritten). |
| **Store items** | Add/edit: name, type (digital / physical), coins, photo, sizes, stock, limit per student, active, "featured on home". Digital items pick an action (repair, coupon, pack, membership, frame, booking credit). |
| **Orders** | Queue by status, approve/reject (reason), packing slip, tracking number, delivered. Export CSV for the courier. |
| **Ledger** | Search a student; every coin row with reason. Grant or deduct with a required note; both go into the audit log. |
| **Opportunities** | Turn each unlock on/off, set its threshold, see who qualifies (with recruiter opt-in state). |
| **Stats** | Coins issued vs spent, liability in ₹, top earners, flagged accounts (too many coins too fast). |
| **Practice access** | Per problem: free / pack / hidden, set or override the daily problem, featured problems, and the company sets' level lists. This is the "question access" from the admin panel; it pairs with the coming DSA sheets import. |

---

## 8. Data (server)

```
coin_ledger[]   { id, user_id, key (unique), coins (+/-), reason, ref, note, at }   append-only; user.coins = sum (cache)
coin_rules{}    { E2: { coins: 10, on: true, cap_day?: n }, ... }                    admin-edited, defaults in code
store_items[]   { id, slug, type, name, coins, image, sizes[], stock{size:n}, limit_per_user, action, active, featured }
store_orders[]  { id, user_id, item_id, size, coins, status, address{}, phone, tracking, history[], at }
streak_repairs[]{ user_id, day, at }                                                  ≤3 per IST month
opportunity_unlocks[] { user_id, key, at }                                            idempotent
```

- **Spending.** Check the balance, then write a negative row `spend:{order}`. Cancel / reject writes `refund:{order}`. A balance can never go below zero.
- **Abuse limits.** The E4 daily cap. No coins for a problem after its solution was viewed. Physical orders need a verified phone and an account at least 30 days old. Admins can freeze an account's coins.

---

## 9. Phases

| # | Phase | Delivers |
|---|---|---|
| 1 | Coin engine | Ledger + rules + every earning hook (E1–E11), practice Accepted counts toward the streak, header chip, "+N coins" moments, tests |
| 2 | Store + orders | `/rewards` page, digital items working (repair, coupon, pack, membership, frame), physical checkout with address, admin Orders + Store items |
| 3 | Streak page + badges | Calendar, Streak Repair, monthly / milestone badges, share cards |
| 4 | Home CTA + goals | Home hero strip, "Set as my goal", goal bars across Practice, swag illustrations |
| 5 | Opportunities + nudges | Unlocks (§5) wired to membership / talent pool / mock drives, push & email nudges, monthly top 10 |
| 6 | Admin completeness | Earning rules editor, ledger tools, stats/liability, practice access controls |

Every phase: tests, lint and build, and a browser check on phone and desktop in both themes.

---

## 10. Next: company DSA sheets from the owner's repos

When the owner sends the repos, each company's sheet is imported into the same practice bank:

- problems get tags (company, topic, level);
- each company gets a set with levels;
- free / pack access is set from the admin Practice access tab.

Every problem used must have tests that pass on the runner before it goes live (as for TCS NQT).

---

## 11. Decisions for the owner

| # | Question | Suggested |
|---|---|---|
| C1 | Coin value | 10 coins ≈ ₹1 (prices in §4) |
| C2 | Which physical swag to start with (needs a vendor + shipping) | Start with 5: stickers, mug, bottle, T-shirt, welcome kit; add hoodie / backpack later |
| C3 | Can coins buy company packs and membership? | Yes: pack 1,500, membership 30 days 2,000 |
| C4 | Mentor mock interview / resume review in the store? | Only if mentors have capacity; otherwise peer mock priority only |
| C5 | Recruiter visibility at 60 days (opt-in, anonymous until accepted) | Yes |
| C6 | Name of the coin | **TiE Coins** |
