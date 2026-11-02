# Email Lifecycle, Campaigns, Device Limit & Profile Nudge — Plan

> Status: **plan only, nothing built.** Written 2026-11-02 after checking the code.
> Builds on PROFESSIONAL_PLATFORM_PLAN.md (Phases 1–5, 7–9 done) — it reuses the
> messaging rulebook (`backend/src/lib/messaging.ts`), Resend, and the admin console.

## Goals (from the owner)
1. **Official, beautiful emails** with the real TieEdu logo — nothing that looks fake.
2. **One-off campaigns to registered students** — first one: the **Infosys SE** plan to every registered **final-year** student. Test-send first, then everyone.
3. **Automatic emails** — on a timer (e.g. 3 days after signup) and on actions (login, test, purchase…).
4. **Max 2 devices per account** — show device names, let the student sign one out.
5. **"Complete your profile" popup** — now and then, never nagging.

---

## 0. What exists today (checked)

| Area | Today | Gap |
|---|---|---|
| Logo | `frontend/public/logo.svg` only (+ app icons) | Email clients (Gmail, Outlook) don't render SVG → needs a hosted **PNG** |
| Email design | One basic layout (`lib/email/templates/base.tsx`): text logo, plain footer | Looks generic; no real logo, no social links, no Outlook-safe button |
| Campaigns | Admin → Messaging → Email: campaigns go to **CSV-imported leads** (`email_leads`) | Cannot target **registered students** by year/branch/target company |
| Automations | A1–A5 drips for **cold leads** (`lib/email/automations.ts`) | Nothing time-based for **registered** students (Day 1, Day 3, inactive…) |
| Event emails | Receipt, certificate, skill-test result, Google welcome, reset, verify (via `lib/messaging`) | Mock-interview feedback, new-device sign-in, weekly summary missing |
| Sessions | `sessions` rows: user, token hash, expiry, rotation family | **No device name**, no limit, no "your devices" page |
| Year data | `grad_year` only for students who set it (onboarding / Today) | Older accounts may have **no year** → can't be called "final year" yet |
| Rules engine | `lib/messaging`: channels, caps (marketing 1/day, 3/week), quiet hours, dedupe, log | Reuse as-is for everything below |

---

## 1. Official email design (do this first — every later email uses it)

### 1.1 Brand assets
- Export the **original** `logo.svg` to PNG at 2× (e.g. 240×156 → shown at 120×78) — **colours unchanged** (owner rule: the logo colour never changes).
- Host at `https://tieedu.in/email/logo@2x.png` (+ small social icons PNG: LinkedIn, X, Instagram, YouTube as configured in `lib/socialLinks`).
- Fixed brand palette from the site: warm paper `#FFF8EE` background, deep-teal band, amber buttons, ink text.

### 1.2 New layout ("v2")
```
┌──────────────────────────────────────────────┐
│  [TieEdu logo PNG]                 Train·Test·Track │  ← white header, thin teal rule
├──────────────────────────────────────────────┤
│  BIG HEADLINE (one line)                        │
│  Short intro paragraph                          │
│  ┌──────── highlight card (optional) ───────┐   │  ← key facts / score / receipt table
│  └──────────────────────────────────────────┘   │
│  [   Amber button (Outlook-safe)   ]           │
│  Secondary text link                            │
├──────────────────────────────────────────────┤
│  Help · Privacy · Email settings / Unsubscribe  │
│  TieEdu Technologies · <postal address>          │
│  social icons                                    │
└──────────────────────────────────────────────┘
```
- 600 px, mobile-first, **dark-mode safe** (logo sits on a white pill so it never disappears).
- **Bulletproof button** (table + VML for Outlook), real text (not an image), alt text everywhere.
- **Plain-text version** for every email; **preheader** text set.
- Transactional vs marketing footers (already separated in commit 494b6e8).
- From: `TieEdu <info@tieedu.in>`, reply-to `contact@tieedu.in` (set).

### 1.3 Deliverability = "looks official" in the inbox too
- DMARC record (`_dmarc` TXT) — **owner to add** (see last message); later tighten to `p=quarantine`.
- Google Postmaster Tools for `tieedu.in`.
- **Optional later — BIMI:** shows the TieEdu logo as the sender avatar in Gmail. Needs DMARC at `quarantine/reject` + a paid certificate (VMC/CMC). Not required now.
- QA before any send: render check in Gmail (web + Android), Outlook, Apple Mail; spam score with mail-tester.com (target ≥ 9/10).

### 1.4 Template set (all in v2)
Welcome · Verify email · Password reset · New device sign-in · Receipt · Certificate · Test result · Mock-interview feedback · Drive update · Weekly summary · Day-1 "start here" · Day-3 "plan for your year" · Win-back · **Infosys SE campaign** · Support reply copy.

---

## 2. Campaigns to registered students (the Infosys SE send)

### 2.1 Audience builder (new source: "Registered students")
Filters: **year/stage** (1st, 2nd, 3rd, final, graduated, unknown) · branch · college · target company · interests · email verified · active in last N days · has purchased · signed up between.
Live count before sending: "**N students match** · M already unsubscribed · K bounced".

### 2.2 Who may receive marketing (rules — I will enforce these)
- Not unsubscribed, not bounced/complained, email-channel not switched off, "Offers & recommendations" / "Your target company" topic on.
- Every marketing email has a working **one-click Unsubscribe**.
- Caps from the rulebook still apply (max 1 marketing email/day, 3/week per student).

### 2.3 The Infosys SE campaign
- **Audience:** final-year + graduated (and, optionally, "year unknown" — see decision D2).
- **Content:** headline "Your Infosys SE plan is ready" → what it is (Train · Test · Track: day-by-day plan, sectional tests, readiness score, mock interview) → the test pattern summary (from our company page, no invented numbers) → **[Start my Infosys plan]** → `/prep/infosys-systems-engineer` (sets the target after sign-in).
- **Subject options** (A/B on a small slice first): "Your Infosys SE prep plan is ready" · "Infosys SE: know every round before the test".
- **Send process (never one click):**
  1. Draft in Admin → Messaging → Campaigns → **Preview**.
  2. **Test send** to 2–3 inboxes you choose (Gmail + Outlook) → you check on phone and laptop.
  3. Your **approval** → schedule.
  4. **Batched send** (warm-up for a new domain): 100 in the first hour, then ~300/hour. **Auto-pause** if bounces > 4% or any spam complaints spike.
  5. Results live in the campaign: delivered / opened / clicked / unsubscribed, and per-student in the Message log.
  6. **One** follow-up after 3 days to those who did not click (different subject), then stop.

---

## 3. Automatic emails (lifecycle engine)

A scheduler runs every 15 minutes, checks each rule, and sends through `lib/messaging` (so caps, preferences, quiet hours and the log all apply). A `lifecycle_fires` record makes sure **no student ever gets the same step twice**. Every rule has an **on/off switch** and a **dry-run** ("who would get this today") in Admin.

| # | Trigger | When | Email | Only if |
|---|---|---|---|---|
| L1 | Signs up (email/password) | right after verifying email | Welcome | — |
| L2 | Email not verified | +24 h, once | "Confirm your email" reminder | still unverified |
| L3 | No first lesson/test | +1 day | "Start here: your first 20 minutes" | no activity yet |
| L4 | **3 days after signup** | +3 days | **"Your plan for your year"** — final/3rd → Infosys SE plan; 1st/2nd → foundation course | — |
| L5 | Every Sunday | weekly | Weekly summary: lessons, tests, streak, next step | active in last 14 days |
| L6 | Login from a new device | immediately | "New sign-in on Chrome on Windows" + "Not you? Reset password" | always (security) |
| L7 | Test result / certificate / receipt | immediately | (already live) | — |
| L8 | Mock interview feedback ready | immediately | Feedback summary + link | — |
| L9 | Target-company test date | 7 days before | Countdown + revision set | target + date set |
| L10 | Inactive | 7 days, then 21 days | "Pick up where you left off" (max 2, then stop) | not unsubscribed |

Login itself does **not** send an email every time (that would be spam) — only a **new device** does (L6).

---

## 4. Max 2 devices per account

### 4.1 What gets stored per sign-in
Device name from the browser: "**Chrome on Windows**", "**Safari on iPhone**", "TieEdu app on Android" · first sign-in time · last active · approximate city (optional, from IP — decision D4) · stored only as needed for security.

### 4.2 The rule
- At most **2 active sign-ins** per student account. (A sign-in = one rotation family, so the refresh grace window never counts twice.)
- **3rd login attempt** → a screen: *"You're signed in on 2 devices. Sign out one to continue."* listing both devices with **[Sign out this device]**. Choosing one signs it out and completes the login. (Alternative: auto-sign-out the oldest — decision D3.)
- **Account → Your devices:** list with "This device" marked, **Sign out** per device, **Sign out all other devices**.
- New-device email (L6) on every new sign-in.
- Password change / reset → signs out everywhere (already true).
- **Exempt:** admins and TPO staff (they use shared office machines) — decision D5.
- **Sharing detection:** > 5 device swaps in a day → flag in Admin → Students (no auto-ban).

---

## 5. "Complete your profile" nudge

- **Fields:** name, college, branch, year, phone (for WhatsApp later), photo, target company (3rd year+).
- **Shows** a small bottom sheet "*Complete your profile — 2 of 6 missing*" with only the missing fields, inline.
- **When:** not on the first visit; after ~20 s on a page; **at most once every 3 days**; never on lessons, tests, mock drives, checkout, login, welcome or admin/TPO pages.
- **Buttons:** Save · "Remind me later" (7 days) · "Don't ask again" (30 days). Once complete → never again.
- Account page shows a small "Profile 4/6" ring as the permanent place to finish it.

---

## 6. Build order

| Step | What | Why first | Size |
|---|---|---|---|
| A | Email design v2 + logo PNG + test send to your inbox | Every email after this uses it | M |
| B | Device limit + Your devices + new-device email (L6) | Protects paid content; needs v2 email | M |
| C | Audience builder + **Infosys SE campaign** (test → your OK → batched send) | The first real campaign | M |
| D | Lifecycle engine + rules L1–L10 with switches & dry-run | Automates everything | L |
| E | Profile nudge | Improves data for C/D targeting | S |

Nothing is ever sent to real students without your explicit approval after a test send.

## 7. Decisions needed from you
- **D1 — Unverified emails:** many older accounts never confirmed their email. Send the Infosys campaign to them too? *(Recommended: yes for this one announcement, with bounce auto-pause; verified-only would cut the audience a lot.)*
- **D2 — Year unknown:** include students who never told us their year? *(Recommended: yes, with a line "Not in final year? Tell us your year" — or exclude.)*
- **D3 — 3rd device:** ask which device to sign out *(recommended)*, or auto-sign-out the oldest?
- **D4 — City on device list:** show approximate city? *(Needs an IP-to-city lookup; optional.)*
- **D5 — Limit for staff:** exempt admins/TPO *(recommended)* or apply to everyone?
- **Test inboxes:** which 2–3 email addresses should receive test sends?
- **Postal address** for the email footer (`EMAIL_POSTAL_ADDRESS`).
