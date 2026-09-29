# Live Masterclass Events — Deep Teardown + Launch Plan

> Sources analysed: `https://www.scaler.com/events` and
> `https://www.scaler.com/event/the-roadmap-to-ai-11b/` (fetched and read).
> Everything about TieEdu below is verified against the repo at the stated
> `file:line`. Nothing here is deployed; this is a plan.

---

## 0. The one thing to understand first

**Scaler does not sell masterclasses. It uses masterclasses to sell programmes.**

The events are free, 2–3 hours, and low production value. The 5 learning outcomes
on the landing page are generic. The real deliverable is a **verified Indian mobile
number plus a WhatsApp opt-in** for a 21–35 year old who is anxious about their
career and just spent two hours on a call. That contact is worth more than the
₹2,000 the event cost to run, because a pack at ₹99–249 converts off that list.

The listing page is a **classifieds board for fear**. Every title is a career
decision the reader has not made yet: *Roadmap to AI*, *RAG vs Agents vs Agentic
AI*, *DevOps vs SRE vs Cloud vs Platform Engineer*, *How to get an SDE Job Outside
India*, *Data Science vs ML vs AI*, *Software Engineer vs FDE*. None of them are
"Learn Kubernetes". They are all "help me choose". That is the format.

So: if we build this as a content feature, it dies. It only works as a funnel with
a measured conversion step at the end.

---

## 1. Teardown — the two pages

### 1.1 Listing page (`/events`)

Observed structure, top to bottom:

| Element | Detail | Why it is there |
|---|---|---|
| **Program filters** | `All (23)`, `Modern Software, AI Engineer, and DevOps (3)`, `AI FDE (1)`, `Advanced AI/ML (2)`, `Data Science (1)`. Query-string driven (`?program[]=…&type=upcoming`) | A visitor who self-identifies as "AI" must see only AI events, or they bounce. Filters are a routing mechanism, not navigation. |
| **Event card** | 16:9 cover image, `🔥 N registered`, title, `STARTS ON Oct 1st '26 \| 7:30 PM – 9:30 PM`, `Register Now` | The registered-count is the only social proof and it is on every single card. |
| **Why Join Scaler Masterclasses** | Fixed 6-badge strip: Designed For AI Era · Scaler Certificate · Live Learning · Top Instructors · Bonus Resources · Live Quizzes | Rendered **once, mid-page**, not per card. It is a mid-scroll conversion patch for people who scrolled the grid without clicking. |
| **Average User Rating** | `4.8/5` with stars, plus a testimonial block | Borrowed trust for events that have not happened yet. |
| **State split** | Cards for *upcoming* events carry `Register Now`; cards for *past* events have no CTA, just title + date | The past events are an **archive, and the archive is the SEO surface**. Every past event is a permanently indexed landing page. |
| **Card-level modal** | The listing page already embeds a 2-step form: `Program` + `Mobile Number` → OTP. | Zero navigation cost to convert. The modal is the product of the page. |

Card screenshot data I pulled (registration counts, in the fetched HTML):

```
The Roadmap to AI                                    Oct 1   7:30–9:30   2594
SOLID Principles Every Developer Must Know           Oct 1   7:30–10:30  1445
Understand RAG vs AI Agents vs Agentic AI            Oct 5   7:30–10:00  1138
DevOps vs. SRE vs. Cloud vs. Platform Engineer       Oct 5   7:30–9:30    270
Roadmap to Forward Deployed Engineer                 Oct 6   7:30–10:00    585
Transition from Non-DS to DS roles                   Oct 8   7:30–10:00    — (no count)
How to get an SDE Job Outside India?                 Oct 8   7:30–10:00     60
OpenClaw Internals: Architecture & Execution        Sep 29  7:30–10:00    —
Software Engineer vs FDE: Which Career Is Right      Sep 29  7:30–10:00    —
Build a Career in DevOps, Cloud & Cyber Security    Sep 28  7:30–10:00    —
How WhatsApp Scales to Billions: System Design      Sep 26  17:00–19:30   —
How to land AI/ML Jobs Outside India                 Sep 24  7:30–10:00    —
How to crack AI roles at OpenAI, Emergent?           Sep 24  19:00–21:00   —
LLD of Payment Apps                                 Sep 22  7:30–10:30    —
Master Agentic Engineering & Workflow Automation    Sep 22  7:30–10:00    —
Kafka and Zookeeper in depth                        Sep 21  7:30–10:30    —
The FDE Simulation: Build & Deploy AI in 3 Hours    Sep 19  17:00–20:00   —
Build AI/ML Projects That Can Get You Hired         Sep 19  17:00–19:30   —
From Strategy Analyst to AI Strategy Leader         Sep 17  7:30–9:30     —
Designing Scalable RAG Pipelines                    Sep 17  7:30–10:00    —
Data Science VS Machine Learning VS AI              Sep 17  7:30–10:00    —
DevOps vs. SRE vs. Cloud vs. Platform Engineer       Sep 16  7:30–9:30     —
```

Read that table properly, because it is the single most useful thing in here:

- **16 Sep → 8 Oct is 23 events in 23 days.** They run 1–2 per day, every day.
- **The spread is 60 → 2594, a 43× range.** This is a portfolio, not a funnel with
  one step. Most events are expected to be small. A 60-registration event is not
  a failure to be fixed, it is a cheap content asset that feeds the archive and
  the ad-retargeting pixel.
- **The winner is the broadest title.** "The Roadmap to AI" is not specific, it is
  universal. "How to get an SDE Job Outside India" is narrower and got 60. Broad
  titles cast the wide net; specific titles are for the bottom of the funnel.
- **7:30 PM IST is the default slot**, 2–2.5 hours. The two outliers (5:00 PM,
  7:00 PM) were weekend days. Weekday 19:30 is the slot: it survives a normal
  working day and a normal dinner.

### 1.2 Landing page (`/event/the-roadmap-to-ai-11b/`)

```
HERO
  cover image
  "Register Now!" CTA
  "Starts In" + live countdown
  "🔥 2.5k+ learners already registered"     <- social proof, above the fold
  [ Mobile Number input ]                     <- single field, autofocused
  "Register For Free"
  ☐ I wish to receive further updates and confirmation via Whatsapp

MULTI-STEP FORM (3 states, in one modal)
  1. "Help us with some info" / "This should not take more than 30 seconds"
     Name · Email · graduation year · Company* · Current Role*  (long searchable
     select, 26 roles, "No results found" → "Other Position" free text)
  2. "Last Step — Verify your mobile number"   OTP · Resend via Msg · Resend via Voice
  3. "Registration Successful / Check your email for joining link"
     → "Redirecting to Event Screen in 3s"

POST-REGISTRATION GATE
  "Final verification required / To complete your registration"
  same event title, start/end/venue card, then OTP again

CONTENT
  About this Masterclass            2 short paragraphs
  What You Will Learn               exactly 5 bullets, all outcome-shaped
  Meet Rohit Jindal                 "Lead AI Scientist · Ex-Mastercard"  <- borrowed credibility
  What our Learners have to say     testimonial block
  About Scaler Advanced AI & ML Program with Agentic AI   <- the actual upsell, at the bottom
  Upcoming Events                   carousel, keeps them on-page

PAID-LEARNER WALL (seen in the fetched HTML)
  "Attention Learner! We've noticed that you're already a paid learner. This
   WorkShop is designed for non-enrolled users only... I want to pay & attend"
  "you will have access to the recording of this workshop for free in your
   dashboard after the 2-day event is completed"
```

The details that actually matter, in order of how much they matter:

1. **The grade-year / company / current-role fields are qualification, not onboarding.**
   They are what makes the list *sellable* later. "Final-year 2026, SDE-1 at a
   startup, wants product companies" is a targetable segment. "An email address"
   is not. This is the single most copied element in the whole funnel and it costs
   nothing to implement.
2. **There are TWO OTP gates, not one.** One to register, one to enter. The second
   is what stops link-forwarding. It is free (same OTP endpoint) and it is the
   difference between 2,594 attendees and 2,594 attendees plus 600 who forwarded
   the email.
3. **The count "2.5k+ learners already registered" is deliberately vaguer than the
   card's "2594".** Round number for the hero, precise number on the listing.
4. **The instructor's pedigree is two lines and it is the only place a real name
   appears.** "Lead AI Scientist, Ex-Mastercard" is a resume fragment doing
   credential-lending work. A mediocre instructor with a good pedigree outperforms
   a great instructor with an anonymous profile.
5. **The upsell is below the testimonials, not above.** They do not interrupt the
   promise. The promise is "free masterclass"; the programme pitch arrives only
   once the visitor is already reading.
6. **URLs are batch-versioned: `/event/{slug}-{batchId}/`** — `the-roadmap-to-ai-11b`,
   `solid-principles-every-developer-must-know-11b`, `openclaw-internals-…-10b`.
   This is an A/B and attribution system disguised as a URL. Same event, new
   batch ID, new copy, new creative, separate conversion number. They are running
   landing-page experiments continuously and the URL is the only thing that has to
   change to support it.

### 1.3 What NOT to copy

- **The 26-option role dropdown.** Two dropdowns (Company, Current Role) before
  the form can submit is a real conversion tax. We get the same segmentation from
  one `<select>` with 8 buckets, or from the user's existing profile if they are
  logged in. If they are logged in, prefill and skip straight to OTP.
- **The 5-step award-wall modals** (Request a Call, Chat With Us, Contact Us, and
  three different signup/login variants) appear on *both* pages. They are
  fight-or-flight widgets stacked on top of each other. Our conversion element
  should be one thing.
- **Registration as a hard wall for the landing page.** Scaler gates the event page
  behind OTP. We should gate the *stream*, and let the landing page be fully
  readable and indexable. Gating the page costs us the SEO archive and gains us
  almost nothing, because the contact happens one click later anyway.
- **2.5 hour live sessions with a human teaching live, forever.** At 2–3 events a
  week that is 6–8 hours of live presenting per week, permanently. See §7.

---

## 2. TieEdu inventory (verified)

### 2.1 What we can build on — no new infrastructure needed

| Need | Existing | Location |
|---|---|---|
| **Event window pattern** | `posters` already has `start_at` / `is_live` | `backend/src/data/db.ts` (`HeroPoster`) |
| **Stream + watch tracking** | `VideoProvider = 'youtube' \| 'vimeo'`, `parseVideoUrl` (`courses.ts:86`), `embedUrlFor` in `sanitizeLesson` (`courses.ts:283-300`) | `db.ts:106-109` |
| **Attendance heartbeat** | `TrackedVideoPlayer` already heartbeats watch progress with `MAX_HEARTBEAT_CREDIT_SECONDS` | `frontend/src/components/courses/TrackedVideoPlayer.tsx` |
| **Certificates + PDF + QR + public verify** | `pdf-lib` + `qrcode`, HMAC-SHA256 signature, serial `TIEEDU-{year}-{8}` Crockford, revoke/restore, `/verify/[serial]` | `backend/src/lib/certificate.ts`, `courses.ts:638`, `frontend/src/pages/verify/` |
| **Payments → conversion** | UPI + Razorpay, `orders`, `completePaidOrder` unlocks the company | `backend/src/payments/`, `lib/pricing.ts` (`PACK_LADDER {1:99,2:169,3:219,4+:249}`) |
| **Admin surface** | `AdminCmsView.tsx` already has 14 tabs; `requireAdmin` | `backend/src/routes/admin.routes.ts`, `courseAdmin.routes.ts:50` |
| **Analytics** | `lib/stats.ts`, `analytics.routes.ts`, `AnalyticsTab.tsx` — "Every metric is a live count — if the backend is down, no fake number is shown" | as named |
| **Audit trail** | `db.audit` (48 rows), `pushAudit` | `backend/src/payments/orders.ts` |
| **User accounts** | email+password, JWT access (15m) + sha256 refresh tokens in `db.sessions`, `safeUser`, `rateLimit` | `backend/src/routes/auth.routes.ts`, `backend/src/middleware/auth.ts` |
| **Design system** | `--brand-accent(#E8A33D)`, `--text-heading`, `--border-subtle(#E9E7E1)`, `.vault-card`, `.focus-ring`, `.stat-num` | `frontend/src/styles/globals.css` |
| **Tests** | plain-assert ts-node scripts; frontend custom `scripts/run-tests.mjs` (no jest/vitest anywhere) | both `package.json` |

The single best fact in this table: **we already have a YouTube player that tracks
watch time, and a working certificate system that has never been used
(`certificates` has 0 rows).** Both are exactly what a masterclass needs, and both
are already built. The event feature is much smaller than it looks.

### 2.2 The gaps — ranked by how much they hurt

| Gap | Reality | Severity | Cost to close |
|---|---|---|---|
| **No OTP / no phone at all** | Zero occurrences. Signup is email+password. | **Fatal for the funnel.** A verified phone is the product. | 1 sprint, plus an SMS provider account + DLT (see §12) |
| **No email sending at all** | No nodemailer/sg/ses/resend/sendgrid anywhere. "Check your email for joining link" is impossible today. | **Fatal.** The join link *is* the delivery mechanism. | 1–3 days once a provider + domain SPF/DKIM exist |
| **No WhatsApp / SMS integration** | Nothing. | **High** — this is the highest-ROI follow-up channel in India. | DLT + BSP, then templates |
| **No live transport** | YouTube/Vimeo embeds only; no HLS, no self-hosting, no room server. | **Medium** — and the answer is to not solve it (§7). | ~0, use YouTube Live unlisted |
| **No notifications / scheduler / queue** | No `node-cron`, no `bull`, no `agenda`, no websockets, no SSE. | **Medium** — reminders and follow-up are automated jobs. | Cron first; a queue only if volume justifies it |
| **Roles stop at `user` \| `admin`** | No instructor entity. | **Medium** — instructor is a first-class marketing object. | Add a `speaker` record, not a role. See below. |
| **No event domain at all** | No `events`, no registrations, no attendance. | Expected — that is the build. | The plan |
| **Scale of the store** | Single JSON document, 24 keys, largest collection is `sessions` at 33. | **Fine now.** Registrations grow; at ~2k/event × 100 events that is 200k rows in one JSON file. Plan the split before, not after. | See §5.7 |

**Do not add an `instructor` role.** It multiplies every `requireAdmin` call site
and every auth branch. An instructor is *marketing data for an event* — a profile
you render on a landing page — not a login. Store `event_speakers[]` as a
first-class collection (a person can speak at many events) and have no accounts
for them. Admin authors events; the speaker is a record they pick from a dropdown.

---

## 3. Product decisions — lock these before writing code

| # | Decision | Recommendation |
|---|---|---|
| D1 | Are events free? | **Free in v1.** Price later, using Scaler's own model (see §3.1). |
| D2 | What is the conversion target? | A pack purchase. `PACK_LADDER` is ₹99–249. Target: pack or course purchase within 30 days. |
| D3 | Does registration require an account? | **No.** Phone + OTP only. Forcing a password before a free 2-hour event costs more leads than it creates. Create a lightweight `user` row on first verify (phone as the identifier) and let them set a password later. |
| D4 | Is the stream gated? | **Yes**, on a verified registration or an authenticated account. The landing page stays open and indexable. |
| D5 | Certificate for attendance? | **Yes**, and it is the cheapest trust asset we have. Gate on `attended_minutes >= 40% of duration`. |
| D6 | Replay public or gated? | **Gated to registrants for 7 days, then public** — the wait is what drives signups, the eventual public link is what ranks and sells packs later. |
| D7 | Recording storage | Keep it **out** of the JSON store. Object storage + a URL, exactly like lesson `video`. |
| D8 | Do we need live chat? | **No, in v1.** See §8. |
| D9 | Naming | `/events` (matching Scaler) and `/events/{slug}-{batch}`. Batch suffix is not vanity — it is the experiment key (§1.2.6). |
| D10 | Where does the event list live? | New `events` collection, seeded/merged like `seedCourses.ts` and `seedStudyPlans.ts` do today (`db.ts:1350`), so content is version-controlled. |

### 3.1 Scaler's monetisation ladder, decoded

The "paid learner wall" in the fetched HTML reveals the full ladder:

1. Free masterclass (top of list, you got here)
2. **Paid workshop** — same slot, same instructor, now with a fee. The wall literally
   says: *you are already a paid learner, this is for non-enrolled users only, pay
   to attend.*
3. Recording in dashboard, free, **after the 2-day event completes**
4. The programme upsell block at the bottom of the page

Step 2 is the clever part: it monetises the audience we already paid to acquire. A
₹2,000–5,000 workshop with 20 attendees from a 2,500-registration masterclass is
₹40k–100k at near-zero incremental CAC. We should build the `price_inr` field in
v1 even though v1 is free, because retrofitting pricing onto a funnel that has
already collected 50,000 phone numbers is a migration.

---

## 4. Data model

New top-level keys in `backend/data/db.json`, alongside `posters` and `courses`.

```ts
// ── events ────────────────────────────────────────────────────────────────
interface EventRecord {
  id: string;                    // 'evt_<8>'
  slug: string;                  // 'the-roadmap-to-ai'
  batch: string;                 // '11b'  → public URL is `${slug}-${batch}`
  status: 'draft' | 'scheduled' | 'live' | 'ended' | 'cancelled';

  title: string;
  subtitle?: string;
  program: 'interview' | 'ai_ml' | 'software' | 'devops' | 'data_science' | 'campus';
  tags: string[];                // free-form, powers filters

  starts_at: string;             // ISO, always UTC. Never store local time.
  ends_at: string;
  duration_minutes: number;      // denormalised so attendance % is a division
  timezone: 'Asia/Kolkata';

  cover_image_url: string;
  speaker_id: string;            // → event_speakers
  what_you_will_learn: string[]; // exactly 5, outcome-shaped
  why_join: string[];            // 6 short badges

  // YouTube Live. unlisted, never public: a public live URL is a link that leaks.
  stream: {
    provider: 'youtube';
    live_video_id: string;       // set when the host goes live
    scheduled_video_id?: string; // the "starting soon" embed
    replay_url?: string;         // published after the event
  };

  certificate: {
    enabled: boolean;
    min_attendance_pct: number;   // 40
    // Reuses the existing serial + HMAC + pdf-lib pipeline.
  };

  capacity: number;              // 0 = unlimited. Drives the seat counter only.
  price_inr: number;             // 0 for v1. See D-table §3.1.
  replay_unlocks_at?: string;    // end + N days

  counters: {                    // denormalised, recomputed by a recount job
    registered: number; verified: number; attended: number;
    replay_views: number; converted: number;
  };

  created_at: string; updated_at: string; published_at?: string;
}

interface EventSpeaker {
  id: string;                    // 'spk_<8>'
  name: string;                  // 'Rohit Jindal'
  headline: string;              // 'Lead AI Scientist'
  org: string;                   // 'Ex-Mastercard'   ← the borrowed credibility
  photo_url: string;
  bio?: string;
  links?: { label: string; url: string }[];
}

// ── event_registrations ───────────────────────────────────────────────────
interface EventRegistration {
  id: string;
  event_id: string;

  // Two identities, deliberately separate. A registration can complete without
  // an account ever existing.
  user_id: string | null;
  name: string;
  email: string;
  phone_e164: string;            // normalised, '+91XXXXXXXXXX'. UNIQUE with event_id.
  phone_verified_at: string | null;

  // Qualification. This is the asset. See §1.2.1.
  graduation_year: number | null;
  company: string | null;
  current_role: string | null;
  other_role: string | null;
  program_interest: string | null;

  status: 'pending_otp' | 'verified' | 'attended' | 'no_show' | 'cancelled';
  otp: {
    code_hash: string; attempts: number;
    sent_at: string; expires_at: string;
    provider: 'sms' | 'whatsapp_otp' | 'email';
    provider_message_id?: string;
  };

  consent: {
    dpdp_at: string;             // terms + privacy, mandatory, all fields
    whatsapp_at: string | null;  // opt-in, opt-OUT of this or we must stop
    email_marketing_at: string | null;
  };

  // Attribution. Without this, batch A/B testing is guesswork.
  utm?: { source?: string; medium?: string; campaign?: string; content?: string };
  referrer?: string;

  registered_at: string; verified_at?: string;
  first_join_at?: string; last_join_at?: string;
  attended_seconds: number;      // heartbeat sum, capped (see below)
  certificate_id?: string;
  converted_order_id?: string; converted_at?: string;

  ip: string; user_agent: string;
}

// ── event_attendance ──────────────────────────────────────────────────────
// Separate from the registration so a rejoin is a new row and we get a
// showing curve (when people drop off) rather than just a total.
interface EventAttendance {
  id: string; event_id: string; registration_id: string;
  joined_at: string; last_seen_at: string;
  seconds_watched: number; is_live: boolean;
}

// ── event_polls / event_poll_responses ────────────────────────────────────
interface EventPoll {
  id: string; event_id: string;
  kind: 'pulse' | 'quiz';        // pulse = engagement, quiz = graded
  question: string; options: { id: string; label: string }[];
  correct_option_id?: string;    // required for kind:'quiz'
  opens_at: string; closes_at: string;
}
interface EventPollResponse {
  poll_id: string; event_id: string; registration_id: string;
  option_id: string; correct?: boolean; answered_at: string;
}

// ── event_outreach ────────────────────────────────────────────────────────
// A log, not a queue. Its real job is being the consent + proof-of-send record
// that DPDP and a WhatsApp template rejection will both ask for.
interface EventOutreach {
  id: string; registration_id: string; event_id: string;
  channel: 'whatsapp' | 'email' | 'sms';
  template_key: string;          // 'event_reminder_24h', 'event_replay', …
  to: string; body_preview: string;
  provider: string; provider_id?: string; status: string;
  sent_at: string;
}

// ── otp_requests (shared, not event-specific) ─────────────────────────────
// Signup and future phone-login reuse this. Built generic on purpose.
interface OtpRequest {
  id: string; purpose: 'event_register' | 'event_enter' | 'signup' | 'login';
  subject_id: string;            // event id / user id
  phone_e164: string;
  code_hash: string; attempts: number;
  sent_at: string; expires_at: string; consumed_at?: string;
  provider: string; provider_message_id?: string;
}
```

### 4.1 Indexes and invariants

- `event_registrations`: unique on `(event_id, phone_e164)`. Enforce in code, not
  by hoping — the JSON store has no constraints.
- `attended_seconds` is clamped to `duration_minutes * 60`. Reuse the reasoning
  behind `MAX_HEARTBEAT_CREDIT_SECONDS` in `TrackedVideoPlayer`: a heartbeat that
  can be spammed without a time check is not attendance.
- `counters` on the event are a cache. Provide `recountEvent()` and never trust
  them in a place where being wrong is expensive (e.g. an admin export).

---

## 5. Backend

New files, following the existing one-concern-per-file pattern in
`backend/src/routes/` and `backend/src/lib/`.

| File | Contents |
|---|---|
| `src/lib/events.ts` | Pure helpers: `slugify`, `publicEventUrl`, `eventIsLive`, `seatCount`, `attendancePct`, `replayState`. **No I/O** — this is the testable core, same shape as `lib/pricing.ts`. |
| `src/lib/otp.ts` | `issueOtp`, `verifyOtp`, `consumeOtp`. 6-digit, 10-min TTL, max 5 attempts, 60s resend cooldown, per-phone + per-IP rate limits. |
| `src/lib/sms.ts` | Provider interface + one adapter. `sendOtp`, `sendTemplate`. Isolated so a DLT provider swap is one file. |
| `src/lib/email.ts` | Provider interface + one adapter. `sendEventConfirmation`, `sendReplayEmail`. |
| `src/routes/events.routes.ts` | Public: list, detail, register, verify, stream access, heartbeat, polls, certificate. |
| `src/routes/eventAdmin.routes.ts` | Admin CRUD, publish, go-live, end, stats, export, broadcast, recount. `requireAdmin` at the router (the pattern at `courseAdmin.routes.ts:50` — "the guard travels with the routes"). |
| `src/data/seedEvents.ts` | Seed content, same merge-by-slug approach as `seedCourses.ts:40` / `seedStudyPlans.ts:32`. |
| `scripts/events-api.test.ts` | Plain-assert suite, wired into `npm test` as `test:events`. |

### 5.1 Public routes

```
GET  /api/events?program=&status=upcoming|past&page=
     → public list. Returns cover, title, starts_at, duration, price_inr,
       counters.registered. NEVER returns the stream ids.

GET  /api/events/:slugBatch
     → public detail. `params.slugBatch` split on the LAST hyphen into
       (slug, batch) — slugs contain hyphens, batches do not.
     → 404 for anything not in `status: scheduled|live|ended`. A `draft` event
       must not be reachable by guessing the URL. This is the one place where a
       missing status check leaks an unreleased event.

POST /api/events/:id/register
     body: { name, email, phone, graduation_year?, company?, current_role?,
             other_role?, program_interest?, consent: true }
     → rate limit: 5 per phone per hour, 20 per IP per hour
     → upsert by (event_id, phone_e164) — a second attempt updates, never
       duplicates, and never silently discards a change the user made
     → issues OTP, returns { ok, registration_id } — **never the OTP, never a
       session token, nothing that grants access**

POST /api/events/:id/verify-otp
     body: { registration_id, code }
     → wrong rate limits: 5 attempts, then the registration is re-issued a code
     → on success: verified_at, status 'verified', counters.verified++,
       send confirmation email with the event link, enqueue the 24h + 1h reminder

GET  /api/events/:id/access?token=
     → the second gate. Authorised if: registration for this event is verified,
       OR the caller is authenticated. Returns { stream_video_id, replay_url? }.
     → token is a short-lived signed value emailed to the registrant. This is
       Scaler's "Final verification required" step, and it is what stops the
       join link from being forwarded to 600 people.

POST /api/events/:id/attendance/heartbeat
     body: { seconds_delta, is_live }
     → clamps `seconds_delta` to [0, 20]; server-side cap on total
     → upserts EventAttendance, bumps registration.attended_seconds

GET  /api/events/:id/poll/current
POST /api/events/:id/poll/:pollId/answer
     → for live polls. See §8 before building.

GET  /api/events/:id/certificate
     → 409 with a plain-English reason if below the attendance threshold
     → issues through the EXISTING pipeline: `generateSerial()` (`courses.ts:638`)
       + HMAC from `lib/certificate.ts` + `pdf-lib` + `qrcode`
     → adds `kind: 'event'` and `event_id` to the `certificates` record so
       `/verify/[serial]` keeps working unchanged
```

### 5.2 Admin routes

```
GET    /api/admin/events?status=          list + counters
POST   /api/admin/events                  create draft
PATCH  /api/admin/events/:id              edit
POST   /api/admin/events/:id/publish       draft → scheduled (requires ≥1 learn bullet,
                                            a cover, and a speaker)
POST   /api/admin/events/:id/go-live       sets status live; requires live_video_id
POST   /api/admin/events/:id/end           status ended; reveals replay
POST   /api/admin/events/:id/recount       recompute counters from source rows
GET    /api/admin/events/:id/registrations?csv=1
POST   /api/admin/events/:id/broadcast     { template_key, channel, filter }
                                          filter: { verified_only, attended_only, no_show }
GET    /api/admin/events/:id/stats         attendance curve, poll results, role mix
GET    /api/admin/speakers                 CRUD
```

### 5.3 The `slugBatch` parse

```ts
// Slugs contain hyphens ('how-to-get-an-sde-job-outside-india'); batches do not
// ('11b'). Split on the LAST hyphen, and only if the tail matches /^\d+[a-z]$/.
// Anything else is a malformed slug → 400, not a 404 that leaks existence.
```

### 5.4 Publishing gates

`sanitizeBlock()` in `studyPlanTemplates.ts` is the existing precedent for
"reject a record unless it is actually well-formed" — and given that the table
rows bug shipped because a payload field was assumed rather than validated, the
rule here should be: **a publish gate is a list of explicit checks, each returning
a human-readable string the admin sees**, not a pile of truthiness. Required:
cover image, speaker, 1–5 learn bullets, `starts_at < ends_at`, `duration_minutes
> 0`, a `program`, and for a paid event a `price_inr > 0`.

### 5.5 Conversion attribution

`converted_order_id` is set in `completePaidOrder()` (`payments/orders.ts`),
which already runs inside the payment completion path. Add a lookup: given an
order's user, find that user's `event_registrations` in the trailing 30 days,
pick the most recent, and stamp it. This is a handful of lines inside a function
that already exists and already writes an audit row — a cheap, high-value hook.
Without it, "did the events work?" is unanswerable and the whole programme is
unfundable.

### 5.6 Analytics

Extend `lib/stats.ts` rather than adding a parallel system, and render in the
existing `AnalyticsTab.tsx` (whose stated contract is "every metric is a live
count"). Add: registrations, verified, attendance rate, replay views, and
**registrations → verified → attended → converted**, as one funnel. The last
number is the only one the founder needs.

### 5.7 Storage — decide this before launch, not after

`db.json` is one JSON document, and `sessions` at 33 rows is currently its largest
array. `event_registrations` is the first collection designed to grow without a
natural ceiling: 2,000 × 100 events = 200,000 rows, plus a row per
`event_attendance` and one per OTP attempt. Every `saveDb()` rewrites the whole
file.

Decision: **v1 is fine** (a JSON store rewrite of 200k small rows is tens of ms, and
`PgStore`/`migrate.ts` already exists as the escape hatch). But put the write path
behind `lib/events.ts` helpers from day one so that the day the file hurts, moving
`event_registrations` to Postgres is a change to one module rather than a rewrite
of the routes. Do not add a second storage system now.

---

## 6. Frontend

Pages router, `frontend/src/pages/`. `Header`/`Footer` are imported per page
(12 pages today), not globally — so a new page imports both, and a new nav link
goes in `Header.tsx`'s `NAV_LINKS`.

| Route | Purpose |
|---|---|
| `/events` | Listing. Program filter pills (from `?program=`, same as Scaler's query-string pattern — shareable, and works with a 3-event page). Past events render without a CTA. |
| `/events/[slugBatch]` | Landing. Server-fetches the event, so the archive is indexable. |
| `/events/[slugBatch]/live` | The room. Gated. |
| `/events/[slugBatch]/replay` | Gated for N days, then public. |
| `/account/events` | "My events" + my event certificates. |
| `admin/events` (tab in `AdminCmsView.tsx`) | Event CRUD, speakers, stats, broadcast, CSV export. |

### 6.1 Landing page anatomy — built in this order

That order is the conversion order. Do not rearrange it.

1. Cover + title + `starts_at` formatted `Oct 1st '26 · 7:30 PM – 9:30 PM` IST
2. Live countdown (before the event) / "LIVE NOW" (during)
3. Speaker card — name, headline, org, photo. **Above the CTA.**
4. Social proof: `N registered`, from `counters.registered`. Show the real integer.
   Never show a fake number — `AnalyticsTab.tsx:53` already sets that house rule
   and this feature must not break it.
5. `why_join` badge strip (6) — put it directly under the CTA, not mid-page.
   Scaler places it mid-scroll; we have a shorter page, so ours belongs above.
6. CTA → registration modal
7. `what_you_will_learn` (5 bullets)
8. About (2 paragraphs)
9. Testimonials
10. **Programme upsell** — last, below testimonials, exactly as Scaler does
11. Upcoming events carousel

### 6.2 The registration modal

Three states in one component, mirroring Scaler: `details → otp → success`.

- **Prefill + collapse if authenticated.** Logged in: name/email prefilled from
  `safeUser`, one "Send OTP to +91…" button, two clicks total. This is where most
  of our traffic will be, and it should feel like a login, not a form.
- Anonymous: name, email, phone, then a **single** compact row for
  graduation year / company / role. One `<select>` of 8 role buckets, not 26.
  "Other" is a text field beside it, not a 27th option.
- `consent: true` is a required, pre-ticked-**false** checkbox. WhatsApp opt-in is
  a separate, unticked checkbox. Never pre-tick marketing consent — that is both
  bad practice and a DPDP problem.
- Errors inline, per field, never a toast.
- "This takes about 30 seconds" is a real, useful piece of copy. Keep it.

### 6.3 Component reuse

- `courses/TrackedVideoPlayer.tsx` for the live embed **and** the replay. It
  already heartbeats; the heartbeat endpoint just needs to be the event one when
  the player is in event mode.
- `.vault-card`, `.focus-ring`, `.stat-num`, `.display-2`, `.gradient-amber`
  from `globals.css`. The amber `--brand-accent (#E8A33D)` is already our
  "attention" colour — the fire/registration badge should be amber, not red.
- `/verify/[serial]` unchanged. A masterclass certificate that lands on an
  existing public verification page is worth more than a bespoke one.

---

## 7. The live room — a reality check

**The hardest part of this plan is not the software. It is the 6–8 hours of live
presenting per week that Scaler's cadence implies.**

The streaming itself is free and mostly solved:

- **Go live on an unlisted YouTube Live stream** from a brand channel that is not
  anyone's personal account. Embed `live_video_id` through the existing
  `embedUrlFor` / `TrackedVideoPlayer` path. YouTube records, gives you chat,
  gives you a VOD, and survives a bad night. Cost: ₹0.
- **Never make the live video public.** A public live URL is a link that will be
  in someone's channel the second it starts. Unlisted + gated = one extra click
  for a leaker to defeat. Accept that; do not spend a month on DRM.
- **Pre-flight embed:** the "starting soon" scheduled video, so the room shows a
  countdown and an auto-embed at start instead of a blank box. The `scheduled_video_id`
  field exists for this.

What is genuinely hard, and should be designed for, not discovered:

- **Nobody is on camera.** Our existing courses are recorded, self-paced, and
  produced by us. Live delivery needs an instructor who can talk for two hours
  without a script, on a schedule, repeatedly. Budget for a real person and
  rehearse the first three.
- **Recording is not free.** A raw 2.5-hour stream is not a watchable asset. Budget
  ~4–6 hours editing per event, or accept a lightly-cut replay. This is the
  largest hidden cost in the whole plan and the one most often forgotten.
- **Timezone/DST is irrelevant** (IST has no DST) but *do* store UTC. `starts_at`
  is UTC, `timezone` is a display field, and the day-boundary bug
  (`startDate > endDate` style) is worth one test.

Do **not** build a custom room. No websockets exist in this codebase, and the value
of a custom room over a YouTube embed is approximately zero.

---

## 8. Engagement — cut most of it

Scaler advertises "Live Quizzes" and "Bonus Resources" in the benefits strip.
Those are the engagement hooks and they are cheap:

- **Live poll** — one question, results as a bar, no grading. Implement as a plain
  `GET current` + `POST answer` poll every 10s. **No websockets, no SSE.** At
  2,000 concurrent viewers, polling one cached question is nothing.
- **Graded quiz** — reuse the course quiz machinery. Graded **on the server**
  (the pattern `seedCourses.ts:896` already documents: "the quiz below is
  **graded on the server** — answers are sent to the API, marked there, and the
  correct answers and explanations come back afterwards"). Do not ship answers to
  the client for a live quiz. There is no upside and it is trivially cheatable.
- **Bonus resources** — this is the actual retention hook, and it is a file upload
  per event. Cheap, high perceived value, and it makes the "register free" promise
  feel real. Gate on verified registration.
- **No live chat.** Chat needs moderation, a report button, abuse handling, and
  someone watching it. Route discussion to the WhatsApp group you are building
  anyway (§10), which is where Indian users actually want it. Revisit only if an
  event goes viral.

---

## 9. Certificates — the cheapest trust asset we have

`certificates` has **0 rows** and the entire pipeline is built and unused. This
feature pays it off for the first time.

- Extend `Certificate` (`backend/src/data/db.ts:356`) with
  `kind: 'course' | 'event'` and `event_id?: string`. A discriminated field, not a
  new table — so `/verify/[serial]` and the admin revoke/restore paths
  (`courseAdmin.routes.ts:833,852`) keep working untouched.
- `generateSerial()` (`courses.ts:638`) already emits `TIEEDU-{year}-{8}`. Reuse
  it verbatim so an event certificate and a course certificate are indistinguishable
  in verification, which is the point.
- HMAC + `pdf-lib` + `qrcode` from `lib/certificate.ts` unchanged.
- Threshold: `attended_seconds >= duration_minutes * 60 * 0.4`, computed **server
  side**, returning a plain-English 409 otherwise. Never trust a client claim.
- The PDF should name the event, the speaker, and the date. A certificate that
  looks like a course certificate is worthless; one that names the masterclass and
  the instructor is a shareable object.
- **This is the loop-closing mechanism:** event → certificate → `/verify/TIEEDU-…`
  → public indexable page → SEO for the event → more registrations.

---

## 10. Follow-up — where the money is

The event is the acquisition. The list is the asset. This is the part Scaler is
actually good at and the part most first attempts skip.

| When | Channel | Message | Job |
|---|---|---|---|
| On verify | Email | Joining link, calendar `.ics`, what to expect | Deliver + set the calendar reminder (the single biggest attendance lever) |
| T-24h | WhatsApp | Reminder + "add to calendar" | Attendance |
| T-1h | WhatsApp | "Starting in 1 hour" | Attendance |
| T+2h (live) | WhatsApp | "We're live" (only if `counters.verified` > expected show) | Late joiners |
| T+1d | Email | Replay link + certificate availability | Retention |
| T+3d | WhatsApp | Programme offer, one pack, one message | **First conversion ask** |
| T+7d | Email | "Here's what we covered" recap + the archive link | Long-tail SEO |
| T+30d | — | Re-mark as `converted` if they bought; otherwise drop | List hygiene |

Rules that are not optional:

- **Every send is written to `event_outreach`.** That log is your consent record
  and your "did it actually send" debugging tool. It is also what a template
  rejection from WhatsApp will make you wish you had.
- **One ask per message.** Three offers in one WhatsApp message converts like zero.
- **Suppress everyone who bought** in the first 24h after a purchase. Selling to
  buyers is how a list stops being a list.
- **Unsubscribe must be honoured across channels within 24h**, and a WhatsApp
  opt-out is not an email opt-out or vice versa. See §12.

---

## 11. Content engine — the half that is free

Copy the formats, not the production values. Observed title families, all of which
resolve an open question rather than announce a topic:

| Family | Example | Count seen |
|---|---|---|
| Roadmap | *The Roadmap to AI* | 1 — the 2594 winner |
| X vs Y vs Z | *DevOps vs. SRE vs. Cloud vs. Platform Engineer* | 3 |
| Concept explainer | *Understand RAG vs AI Agents vs Agentic AI* | 1 |
| How to crack | *How to crack AI roles at OpenAI, Emergent?* | 1 |
| Career switch | *Transition from Non-DS to DS roles* | 1 |
| Aspiration + geography | *How to get an SDE Job Outside India?* | 1 — the 60-registration counterweight |
| Tells + system design | *How WhatsApp Scales to Billions: System Design* | 1 |
| Hands-on with a deliverable | *The FDE Simulation: Build & Deploy AI in 3 Hours* | 1 |
| In-depth | *Kafka and Zookeeper in depth* | 1 |

Rules I would write down:

1. **Name a real company or a real tool.** WhatsApp, Redis, Kafka, Postgres,
   Razorpay. Borrowed credibility, zero cost.
2. **Promise a decision or an artefact, never just knowledge.** "Understand" is
   weak; "choose between" and "ship" are strong.
3. **5 learn-bullets, all outcome-shaped.** Every bullet starts with a verb the
   attendee will have *done*.
4. **Speaker pedigree is two lines.** Name + current role + one impressive ex-.
5. **Publish the archive.** Past events are the SEO asset. `status: 'ended'`,
   no CTA, still fully readable. This is the highest-ROI thing on this page and
   it is invisible unless you deliberately build it.
6. **Batch the A/B.** Same event, `10b` and `11b`, different hook. Scaler's URL
   scheme gives this away. We ship `batch` in v1 for exactly this reason.
7. **Publish 1, not 23.** We are not an institution with 14 faculty. Start at one
   event a week, learn the show-up rate, then decide. A 60-registration event that
   costs ₹3,000 is a cheap experiment; a 23-event calendar from day one is a job
   nobody has time for.

---

## 12. Compliance — do this before the first SMS, not after

Not legal advice. Flagged because getting it wrong blocks sending, and because
Indian SMS has a hard technical gate that is not optional.

- **DPDP Act 2023** — collect only what the funnel needs, show a notice at
  collection, keep consent timestamps (we do: `consent.*_at`), and honour erasure.
  Verify the current notification status with counsel before launch.
- **TRAI DLT is mandatory for A2P SMS in India.** You must register a header on a
  DLT platform, register each content template, and send through a registered
  route. An unregistered template silently fails — OTP never arrives, and the
  entire funnel dies with no error in our logs. This is the single most likely
  cause of "the OTP just doesn't work" and it is a procurement task, not a coding
  task. **Start it in week 1.**
- **WhatsApp Business requires pre-approved message templates** for anything
  initiated by us. Reminder, replay, offer — each is a template that takes days to
  approve. Do not design flows around templates you have not submitted.
- **Separate consent per channel.** WhatsApp opt-in is not email consent and vice
  versa. `consent.whatsapp_at` and `consent.email_marketing_at` are separate
  fields for exactly this reason.
- **Do not pre-tick marketing consent.** Ever.
- **The joining link is a credential.** It is emailed to a verified address and
  gated server-side. Treat it as such: no link in a public URL, no link in the
  page source, referrer policy on the page that hosts it.

---

## 13. Unit economics

Illustrative, with assumptions stated so you can argue with them rather than trust
them. Per event:

| Line | Assumption | Cost |
|---|---|---|
| Instructor honorarium | 1 person, 2.5h + prep | ₹8,000 – ₹25,000 |
| Replay editing | 4–6h, in-house | opportunity cost |
| SMS (OTP + reminders) | ~700 verified × ₹0.12 | ~₹85 |
| WhatsApp | ~900 messages × ₹0.35 | ~₹315 |
| Ad spend (optional) | ₹3,000 push on one event | ₹3,000 |
| Tools | YouTube + a form builder + meet | ₹0 |
| **Cash total, excl. time** | | **~₹12,000 – ₹29,000** |

Funnel, one event, at Scaler's observed numbers:

```
Landing visits                     4,000
start registration                  2,400   (60%)
submit details                      1,400   (35%)   ← graduation/company/role cost is here
verify OTP                          1,200   (30%)
attend live                           500   (42% of verified)  ← THE number to watch
claim certificate                     380
view replay                          320
purchase a pack within 30d            100   (≈2.5% of visitors)
```

At ₹169 average, that is **₹16,900 from ~₹20,000 of cash cost** — roughly
break-even on the event itself, on top of acquiring 1,200 verified phone numbers
with WhatsApp consent and a growing SEO archive. **The list is the return.** The
event is priced to justify itself; the list is what compounds.

The constraint to instrument from day one is **show-up rate**. If attendance is
below ~30% of verified registrations, the problem is reminder delivery or the
calendar invite, never the content. Fix that before writing more titles.

---

## 14. Build order

Each phase has an exit criterion. Do not start the next phase until it is met.

**Phase 0 — Foundations (week 1). Nothing user-visible.**
- DLT header + template registration submitted *(long lead time; start first)*
- Email provider account + domain with SPF/DKIM/DMARC
- WhatsApp Business + template submissions
- Speaker record decided on, `events` collection added to `db.ts`
- Exit: an OTP SMS from a real phone arrives, and a WhatsApp template is approved.

**Phase 1 — Event domain + admin (week 2).**
- `lib/events.ts`, `seedEvents.ts`, `eventAdmin.routes.ts`, admin Events tab
- Speakers CRUD, draft → publish with the gate checks
- Exit: an admin can create, schedule and publish an event, and the public API
  still returns 404 for it until published.

**Phase 2 — Public listing + landing (week 3).**
- `/events`, `/events/[slugBatch]`, header nav link, SEO/meta
- Render the full anatomy from §6.1 with a **fake** counter
- Exit: 5 past events + 2 upcoming render, `/events` is indexable, mobile is right.

**Phase 3 — Registration + OTP (weeks 4–5).**
- `lib/otp.ts`, `lib/sms.ts`, `lib/email.ts`, register + verify + access routes
- The three-state modal, prefill-if-logged-in
- Rate limits, consent timestamps, `event_outreach` logging
- Exit: register → OTP → confirm email → gated room, on a real phone, and the
  same phone twice does not create a duplicate.

**Phase 4 — Live room + attendance (week 6).**
- YouTube Live unlisted, `/live` page, heartbeat, attendance curve in admin
- Exit: a 30-minute internal event records attendance accurately, and a
  re-joining user does not double-count.

**Phase 5 — Certificate + replay (week 7).**
- `kind: 'event'`, threshold check, issue endpoint, `/replay`
- Exit: a certificate issued from real attendance verifies at the existing
  public `/verify/[serial]` page.

**Phase 6 — Follow-up (week 8).**
- Reminder/recap/offer templates, `broadcast` endpoint, unsubscribe
- Exit: the T-24h and T+3d messages are template-approved and firing, and
  `event_outreach` has a row for every send.

**Phase 7 — Analytics + attribution (week 9).**
- Stats extension, the funnel in `AnalyticsTab`, `converted_order_id` hook
- Exit: the registrations → verified → attended → converted funnel is live, and
  buying a pack within 30 days of an event shows up as a conversion.

**Phase 8 — Run the first public event. Do not skip to a calendar.**

Then: 1 event/week for a month, measure show-up rate and 30-day conversion, and
only then decide whether to add workshops (`price_inr > 0`), a second program
track, or a calendar.

---

## 15. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| DLT/template not ready → OTP never arrives | **High** if not started day 1 | Phase 0 exit criterion. Fall back to email OTP while DLT is pending. |
| Show-up rate collapses | Medium | Calendar `.ics` on confirm; T-24h + T-1h WhatsApp; go live reminder. |
| Nobody can present live, twice a week | **High** | Start at 1 event/week. Have a co-host and a rehearsed run-of-show. |
| Replay never gets edited → archive is worthless | **High** | Budget the hours or cut the replay scope. Do not promise it and skip it. |
| Stream leaks | Medium | Unlisted, gated, watermark the replay, no public URL in page source. Accept DRM loss. |
| List goes stale / spam complaints | Medium | Suppress buyers, one ask per message, 24h unsubscribe across channels. |
| `db.json` write slows down | Low near-term, certain eventually | Route all writes through `lib/events.ts`; `PgStore` already exists as the exit. |
| Nobody converts and the events look like a vanity metric | Medium | Instrument `converted_order_id` **in Phase 7, before event 1.** If it is not instrumented from the start, the data is unrecoverable afterwards. |
| Build a whole platform instead of running an event | **High** | Phase 8 is a gate, not a suggestion. |

---

## 16. Locked / open

**Locked**
- Free in v1, `price_inr` field present from day one.
- YouTube Live unlisted; no custom room, no chat, no websockets.
- Landing page open and indexable; only the *stream* is gated.
- Certificates reuse the existing serial/HMAC/`pdf-lib` pipeline; one
  `certificates` table with a `kind` discriminator.
- No instructor role. Speakers are records, not accounts.
- `batch` in the URL from v1, for attribution and A/B.
- All event writes go through `lib/events.ts` so the store can change later.
- Conversion instrumentation ships **before** the first public event.

**Open — needs your call**
1. **Which program does the first event belong to?** `interview` (existing
   `interview-course.tsx` audience, `/compare`, the ₹99–249 packs) or `ai_ml`
   (no product behind it yet)? This decides the entire first quarter.
2. **Who presents?** If the founder, say so — the speaker card needs a real name
   and a pedigree line, and "TieEdu founder" is a weak one.
3. **Budget ceiling per event.** Fixes events/week and whether we edit the replay.
4. **Ad spend, or organic only?** Organic needs the archive and a LinkedIn/
   Instagram habit; paid needs ₹3–5k per event and an attribution discipline.
5. **Do we do the free-to-paid workshop tier immediately**, or after 3 masterclasses
   prove the funnel? My recommendation is after.
6. **Email provider** — transactional (SES/SG/Postmark) is the right class here;
   do not use a marketing ESP for OTPs.

---

## 17. If we only do one thing

Do **Phase 0** this week. DLT registration and template approval have a multi-day
external lead time, they block the OTP that the entire funnel depends on, and no
amount of engineering fixes a template that was never registered. Everything in
§5–§10 is a two-week build that can wait for a week; that approval cannot.
