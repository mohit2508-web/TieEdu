# Professional Platform Plan — consent, personalisation, messaging, Google sign-in, ads, admin, TPO, footer & legal

> Status: **plan only, nothing built.** Written 2026-11-01 after a pass over the repo.
> Goal: TieEdu should feel 100% professional, show every student only what fits them,
> keep them informed on the right channel, and keep Train · Test · Track at the centre.

---

## 0. Where we are today (checked in the code)

| Area | Today | Gap |
|---|---|---|
| Sign-in | Email + password only (`backend/src/routes/auth.routes.ts`: signup, login, refresh, logout, change-password) | No **Continue with Google**, no **forgot password**, no **email verification** |
| Signup form | Name, email, password, college; a Terms checkbox (`frontend/src/pages/signup.tsx:164`) | Asks nothing about **year / branch / interests**. "Terms" and "Privacy Policy" are plain text — **the pages do not exist** |
| Year | `PUT /api/me/year` stores `grad_year`; Today screen derives a stage from it (`backend/src/lib/today.ts`) | Only Today uses it. Home, Learn, Companies, Feed look the same for a 1st-year and a final-year |
| Cookies | Auth cookie (httpOnly) + email lead cookie (`backend/src/lib/email/links.ts`) | **No consent banner, no preferences, no cookie policy** |
| Email | Resend wired (`lib/email/client.ts`), campaigns + 5 behaviour automations (`lib/email/automations.ts`), drive emails (`lib/driveEmail.ts`) | Mostly **marketing**. Almost **no transactional mail** (welcome, receipt, certificate, result, password reset). No preference centre |
| Push / in-app | Working (`lib/push.ts`, `lib/notify.ts`, reminders, streak/recap schedulers) | Each feature sends on its own — no single rulebook for "who gets what, on which channel, how often" |
| WhatsApp | Meta Cloud API wrapper exists (`lib/whatsapp.ts`), used **only for parents** | Students cannot opt in; no student templates |
| Ads | None | AdSense not set up; no ads.txt, no consent signals |
| Footer | One row: logo, ©, socials, every nav item, "For colleges", "Built with ❤", plus a long cookie paragraph (`components/layout/Footer.tsx`) | Too long and mixed. No About / Contact / Privacy / Terms / Refund / Support |
| Legal & trust pages | — | **Missing:** Privacy, Terms, Cookie Policy, Refund & Cancellation, About, Contact/Support, Grievance Officer |
| Admin portal | **27 tabs** in one sidebar (`components/admin/AdminCmsView.tsx:40`) | Confusing; several look old or overlap (Content Builder vs Pack Editor, Study Plans vs the new prep plan, Hero Posters, Experiments, XP Ledger…) |
| TPO portal | 5 working tabs + **6 tabs marked "soon"** (`components/tpo/TpoShell.tsx:44-49`) | Half the menu is unfinished promises |

---

## 1. Sign-in & onboarding (do this first — everything else depends on knowing the user)

### 1.1 Continue with Google — free, no Stripe needed
**Note:** Stripe handles payments, not sign-in. It does not provide Google login. Our payments already run on **Razorpay**, which suits India, so nothing changes on the payment side.

The free way to add Google login is **Google Identity Services**, which gives the official "Sign in with Google" button:
- Frontend: Google's button / One Tap on `/login` and `/signup` → returns an **ID token**.
- Backend: new `POST /api/auth/google` verifies the token with `google-auth-library` (checks audience = our client id, `email_verified = true`), then:
  - email already exists → log that user in (link `google_sub` to the account);
  - new email → create the user (no password), mark `email_verified`, send to onboarding.
- Same session cookie as today, so nothing else in the app changes.
- Setup on our side: one OAuth Client ID in Google Cloud Console (free), authorised origins `https://tieedu.com` + localhost.

### 1.2 Missing account basics
- **Forgot password**: `POST /auth/forgot` → emailed one-time link (30 min, single use, hashed in DB) → `/reset-password`.
- **Verify email** for password signups (link in the welcome mail). Unverified users can use the site but get no marketing mail.
- **Delete my account** + **download my data** in Account settings (needed for the privacy law, see §8).

### 1.3 Onboarding — 3 quick screens after first sign-in (skippable, max ~30 s)
1. **Your year** — 1st / 2nd / 3rd / Final year / Graduated (stores `grad_year`) + branch (CSE/IT, ECE, EEE, Mech, Civil, Other).
2. **What do you want?** — chips: crack placements, learn coding, a specific company, semester exams, AI skills… (stores `interests[]`; final-years also pick a target company → existing `target_company`).
3. **Stay updated** — toggles: email updates, push, **WhatsApp** (asks the number, sends a code to confirm). Pre-filled sensibly, nothing forced.

---

## 2. Cookie consent (professional banner + "Manage preferences")

### 2.1 What the visitor sees
- First visit: a slim bottom bar with the message *"We use cookies to keep you signed in, remember what you like and measure what works."* and three buttons: **Accept all**, **Reject non-essential** and **Manage preferences**. Both main buttons get the same visual weight, because a hidden "reject" is a dark pattern.
- **Manage preferences** opens our existing `Sheet` with 4 switches:

| Category | Default | Used for |
|---|---|---|
| Strictly necessary | Always on (locked) | Sign-in session, security, cart, the consent choice itself |
| Personalisation | Off until chosen | Remember companies/courses you looked at to show them first |
| Analytics | Off until chosen | Page views, funnels (our own analytics, campaign attribution) |
| Advertising | Off until chosen | AdSense personalised ads |

- **"Cookie settings"** link in the footer reopens the sheet anytime; withdrawing is as easy as giving.

### 2.2 How it works
- Choice saved in a first-party cookie `tieedu_consent` = `{v: policyVersion, p, a, ad, ts}` (12 months), and for signed-in users also on the server (`consents[]` with timestamp + policy version = proof of consent).
- A small `useConsent()` hook + `hasConsent('analytics')` guard. **Nothing non-essential loads before consent**: the email lead cookie, analytics beacons and AdSense all check it.
- **Google Consent Mode v2** signals (`ad_storage`, `ad_user_data`, `ad_personalization`, `analytics_storage`) are set from the same choice, so Google products respect it.
- Bump `policyVersion` when the policy changes → banner shows again.

> **Ads rule to know:** for visitors from the EU/UK/Switzerland, Google requires a **Google-certified consent tool** to serve AdSense. Our own banner is enough for India. Recommendation: our banner everywhere, plus Google's free "Privacy & messaging" consent message turned on **only for EEA/UK** inside AdSense.

---

## 3. Personalisation — "show each student what fits them"

### 3.1 One interest profile per user
New `interest_profile` (server, signed-in users — part of the service they signed up for):
- **Explicit:** year, branch, interests, target company (from onboarding / account settings).
- **Implicit, with decay:** company pages viewed, courses opened, tests taken, searches, unlocks — each a weighted score that fades over ~30 days so old curiosity does not stick forever.
- Anonymous visitors: same signals kept **in the browser only, and only with Personalisation consent**; merged into the profile on sign-up.

### 3.2 Year-based experience (the core rule)

| Stage | Home / Today shows | Hidden or moved down |
|---|---|---|
| 1st year | Foundations: C/Python, coding basics, maths, semester exam prep, streaks | Company vaults, drives, offer wall |
| 2nd year | DSA, DBMS/OS/CN, first skill tests & certificates, internships prep | Company drives (shown as "later") |
| 3rd year | Aptitude + DSA, mock tests, **pick target companies**, internships | — |
| Final year / graduated | **Target company 3T** (Train · Test · Track), drives, mock interviews, readiness | Beginner courses (still searchable) |
| Not set | Ask the year once (one tap), neutral home meanwhile | — |

- One shared helper `stageFor(user)` used by Home, Learn, Companies, Feed, Today and the emails, so every page applies the same rule.
- **Recently viewed / Because you looked at …** rails on Home, Learn and Companies, driven by the profile.
- Nothing is *blocked* — a 1st-year can still open any company; we only change what is **shown first**.

---

## 4. One notification system for all channels

### 4.1 The rulebook (`lib/messaging/`)
Every feature emits an **event** (`course.completed`, `drive.slot_confirmed`…). One dispatcher decides:
1. **Which channels**: in-app (always), push, email, WhatsApp — from the event's policy + the user's preferences.
2. **Caps**: max 1 marketing email/day and 3/week; max 1 WhatsApp marketing/week; push max 2/day. Transactional mail is never capped.
3. **Quiet hours**: no push/WhatsApp 10 pm–8 am IST (queued till morning).
4. **Dedupe**: same event → one message per channel.
5. **Logging**: every send recorded (channel, template, status, opened/clicked) → admin dashboard.

The existing senders (push, reminders, drive mails, automations, parent WhatsApp) move onto this dispatcher one at a time, so behaviour stays the same while it migrates.

### 4.2 Event catalogue (what goes out, and where)

| Event | In-app | Push | Email | WhatsApp |
|---|---|---|---|---|
| Welcome / verify email | ✓ | | ✓ (T) | |
| Password reset / login from new device | | | ✓ (T) | |
| Payment receipt (course / vault / drive) | ✓ | | ✓ (T, with invoice) | ✓ (U, opted-in) |
| Enrolled in course / first lesson nudge after 24 h | ✓ | ✓ | ✓ | |
| Course completed + certificate issued | ✓ | ✓ | ✓ (T, cert link) | ✓ (U) |
| Skill test / company test result + weakest area | ✓ | ✓ | ✓ | |
| Mock interview completed + feedback ready | ✓ | ✓ | ✓ | ✓ (U) |
| Drive registration, slot confirmed, test link live, result | ✓ | ✓ | ✓ (T) | ✓ (U) |
| Streak about to break (evening) | ✓ | ✓ | | |
| Target company: new questions / drive announced | ✓ | ✓ | ✓ | ✓ (M) |
| Weekly progress digest (Sunday) | | | ✓ | |
| Recommended course/company (from interest profile) | ✓ | | ✓ (M) | ✓ (M, rare) |
| Inactive 7 / 21 days — win-back | | ✓ | ✓ (M) | |

T = transactional (always sent), U = WhatsApp utility template, M = marketing (needs opt-in, capped).

### 4.3 Notification preferences page (`/account/notifications`)
A grid of topics (Learning, Tests & results, Drives, Company updates, Offers & recommendations, Weekly digest) × channels (Email, Push, WhatsApp). Every email footer links straight to it, and has a one-click unsubscribe.

---

## 5. Email — done the way professional sites do it

### 5.1 Domain & deliverability (one-time setup, ~1 day)
- Send from a **subdomain**, e.g. `mail.tieedu.com`, so marketing reputation can never hurt the main domain.
- DNS: **SPF**, **DKIM** (Resend gives the records), **DMARC** starting `p=none` → `quarantine` after 4 weeks of clean reports.
- Addresses: `hello@` (marketing), `noreply@` → better **`team@`** that can actually receive replies, `support@` (help), `billing@` (receipts).
- Gmail/Yahoo bulk-sender rules: one-click unsubscribe header (`List-Unsubscribe` + `List-Unsubscribe-Post`), spam rate under 0.3%, honour unsubscribes within 2 days.
- Separate **transactional** and **marketing** streams (different from-addresses; marketing pauses automatically if complaints rise).
- Warm-up: start marketing at a few hundred/day to engaged users, grow weekly.

### 5.2 Templates
- One branded React-Email layout (already have `templates/base.tsx`): logo, one clear headline, one button, short text, footer with address, preferences and unsubscribe. Light + dark-mode safe, mobile first, plain-text version always.
- ~15 templates for the catalogue in §4.2, all previewable and test-sendable from admin.

### 5.3 Admin
- **Messaging** section: templates (preview / test send), automations on/off, campaign composer with audience builder (year, branch, interest, target company, activity), send log, open/click/bounce/complaint stats.

---

## 6. WhatsApp for students
- Reuse `lib/whatsapp.ts` (Meta WhatsApp Cloud API). Needs: verified Meta Business account, a WhatsApp business number, **approved templates**.
- **Opt-in is mandatory** (WhatsApp policy): the toggle in onboarding / preferences + number confirmed with a code. "STOP" reply → opt out.
- Templates to submit: `drive_update`, `result_ready`, `certificate_issued`, `payment_receipt` (utility); `target_company_alert`, `weekly_nudge` (marketing).
- **Cost:** Meta charges per message, and marketing messages cost more than utility ones. So use WhatsApp mainly for **important, time-sensitive** updates. Marketing stays rare and capped.
- Alternative if Meta setup is slow: a BSP (Interakt / AiSensy / Gupshup) — easier onboarding, small monthly fee.

---

## 7. Google AdSense — revenue without hurting the experience

### 7.1 Approval prerequisites
Privacy Policy (mentions cookies & Google ads), About, Contact, enough original public content, `/ads.txt`, site on its own domain — §8 covers these.

### 7.2 Where ads may appear (strict)
- ✅ Public reading pages: Feed/Drops, blog/articles, company list, public course catalogue, verify page bottom.
- ❌ **Never**: lesson player, tests/quizzes, mock drives, mock interview, checkout/cart, account, Today screen, admin, TPO, parent and school portals.
- ❌ **No ads for paying users** (anyone with an active purchase) — a paid product with ads feels cheap.
- Max 2 ad slots per page, fixed-height containers (no layout jump), lazy-loaded below the fold, labelled "Advertisement", and loaded only after consent (non-personalised ads when "Advertising" is off).

### 7.3 Expectation
AdSense in education/India pays modestly. Treat it as a bonus, track RPM for 60 days, and remove slots that hurt sign-ups (we have the Experiments tool to A/B test it).

---

## 8. Footer, legal & trust pages

### 8.1 New compact footer
```
[Logo]  Train · Test · Track for placements.
Learn        Practise        For            Company
Courses      Skill tests     Colleges/TPO   About
Companies    Mock drives     Recruiters     Contact & support
Feed         Mock interview  Parents        Careers (later)

© 2026 TieEdu Technologies · Privacy · Terms · Refunds · Cookies · Cookie settings · [socials]
```
- Max 4 columns; on mobile they collapse into accordions. The long cookie paragraph moves into the Cookie Policy.

### 8.2 Pages to create
| Page | Must contain |
|---|---|
| `/privacy` | What we collect (account, progress, device, cookies, payments via Razorpay), why, how long, who we share with (Resend, Google, Meta, Razorpay, hosting), user rights (access, correct, delete, withdraw consent), children's data note, **Grievance Officer** name + email + response time |
| `/terms` | Accounts, acceptable use, paid content licence (no resharing vault content), certificates, refunds pointer, liability, governing law (India) |
| `/refund-policy` | Course / vault / drive refund rules — **Razorpay requires this page** |
| `/cookies` | The 4 categories, every cookie by name, how to change choice |
| `/about` | Mission, Train · Test · Track, team, numbers that are real |
| `/contact` | Support form (→ `support@`), email, response time, business address, FAQs |
| `/help` | Searchable FAQ: payments, certificates, drives, account |

Law context: India's **DPDP Act 2023** (consent notice, easy withdrawal, grievance officer, breach duty). I will draft these pages from what the product actually does. **A lawyer must review them before launch.**

---

## 9. Admin portal — from 27 tabs to a clear 7-section console

### 9.1 New structure (proposal)
| Section | Contains |
|---|---|
| **Home** | Today's numbers, alerts (pending payments, failed sends, reports to review) |
| **Students** | Users & access, certificates, XP, guarantee claims |
| **Sales** | Orders, payment verify, coupons & pricing |
| **Content** | Companies (hub + 3T status + pack editor in one company screen), courses, skill tests, drops |
| **Practice** | Mock drives, candidate reports, offer wall |
| **Messaging** | Email (templates, automations, campaigns), push, WhatsApp, broadcast, send log |
| **Settings** | Site settings, consent/policy version, ads on/off, staff & roles |

### 9.2 Cleanup method (no blind deletes)
1. **Usage audit**: for every current tab, count records touched in the last 90 days and check whether any student page still reads its data.
2. Put the list in front of you: **keep / merge / remove**. Likely candidates: *Content Builder* (old, overlaps Pack Editor), *Study Plans* (old, replaced by the prep plan), *Hero Posters*, *Experiments*, *XP Ledger*, *Analytics* (merge into Home).
3. Remove only what you approve — code, routes and data together, with a backup first.
4. Each section gets a search box, a consistent table, and empty states that say what to do next.

---

## 10. TPO portal — make it finished, not "soon"
- **Hide every "soon" tab** until it is real (a menu of promises looks unfinished).
- Build the 3 most valuable missing ones:
  - **Students** — searchable batch list: year, branch, readiness, last active, target companies; filter + export (aggregates rules from the college privacy rules still apply).
  - **Drives** — the college's upcoming drives, eligible count, registrations, results summary.
  - **Alerts** — students inactive 14 days, readiness dropping, drive deadlines (feeds the existing Nudges flow, which the TPO Head approves).
- Same visual system as the student app (Warm Paper), a clear dashboard first screen, and a short "how to use" help panel.

---

## 11. UX quality pass across the portal
- One **UX checklist** applied page by page: one primary action per screen, loading skeletons, helpful empty states, error messages that say what to do, mobile tap targets ≥ 44 px, dark mode, Hinglish where available.
- Page speed budget: LCP < 2.5 s on 4G, no layout shift from ads/images.
- Track friction: rage-clicks, failed forms, drop-off in signup → onboarding → first lesson/test.

---

## 12. Making Train · Test · Track stronger (feature ideas)
1. **Readiness score everywhere** for final-years: one number per target company, the weakest round, and the next 20-minute task.
2. **Weekly plan by email/WhatsApp**: "This week: 3 lessons, 1 sectional test, 1 mock" built from the plan.
3. **Drive countdown** mode: last 7 days before a company's drive → daily revision set + mock.
4. **Peer comparison** (anonymous): "You are ahead of 62% of students preparing for Infosys."
5. **Shareable certificates & readiness cards** to LinkedIn/WhatsApp (growth loop).
6. **Parent weekly summary** (already partly built) tied to the same event system.

---

## 13. Build order (phases)

| # | Phase | Why this order | Size |
|---|---|---|---|
| 1 | Legal pages + new footer + Contact/Support + email DNS setup | Needed for AdSense, Google sign-in review, Razorpay, and trust | S |
| 2 | Google sign-in, forgot password, verify email, onboarding (year/interests/opt-ins) | Everything personal needs this data | M |
| 3 | Cookie consent + Consent Mode | Must exist before personalisation, analytics and ads | S |
| 4 | Messaging dispatcher + preferences page + transactional emails | Biggest professionalism gain | L |
| 5 | Interest profile + year-based experience | Core "show what fits" | M |
| 6 | WhatsApp for students | After Meta templates are approved (takes days) | M |
| 7 | Admin portal restructure + cleanup (after your keep/remove sign-off) | Safer once new tools exist | L |
| 8 | TPO portal: hide "soon", build Students / Drives / Alerts | | M |
| 9 | AdSense (after approval) | Needs phases 1 & 3 | S |
| 10 | UX pass + 3T feature ideas | Continuous | ongoing |

Each phase ships on its own with tests, `next lint`, and a browser check; nothing is removed from admin without your yes.

---

## 14. What I need from you
1. **Google**: create an OAuth Client ID (or give access to Google Cloud Console).
2. **Email**: which sending subdomain (`mail.tieedu.com`?) and DNS access to add SPF/DKIM/DMARC.
3. **WhatsApp**: a Meta Business account + a phone number not already on WhatsApp — or choose a BSP (Interakt/AiSensy).
4. **Legal details**: registered company name, address, grievance officer name/email, refund rules you want.
5. **AdSense**: an AdSense account on the `tieedu.com` domain.
6. **Admin cleanup**: approve the keep/merge/remove list once the audit is done.
