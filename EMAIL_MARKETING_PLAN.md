# Email Marketing & Course Sales — Full Plan (Second-Year Campaign)

> Status: plan only, nothing built. Decisions locked with the founder:
> **Resend** as provider · list = **cold leads who never visited TieEdu** ·
> **both blasts + behavior automation** · volume **under 1,000 per campaign**.
> Every file:line below is verified against the current repo.

---

## 0. Starting reality (what exists, what does not)

| Fact | Evidence |
|---|---|
| **Zero email capability today** — no nodemailer/resend/sendgrid anywhere, no `sendMail` in any `.ts` | stated in `backend/src/routes/placementAdmin.routes.ts:25-28` |
| Notification channels are only `inapp \| push` | `backend/src/data/db.ts:205` |
| Working patterns to copy: push broadcast + permission gate (`broadcasts.send`), 7-day reminder scheduler with `MAX_PER_PASS=500` | `backend/src/lib/push.ts:274-286`, `backend/src/lib/reminders.ts:34,229-253` |
| File upload precedent (multer disk storage + validation) | `backend/src/routes/pdfLibrary.routes.ts:20-33` |
| UTM first-touch attribution exists for devices, but **no page-view tracking at all** for visitors | `backend/src/lib/devices.ts:74-83` |
| RBAC groups live in `lib/rbac.ts` — `messaging: [broadcasts.read/write/send]` | `backend/src/lib/rbac.ts:69` |
| Admin UI is one tab container with a `TabId` union | `frontend/src/components/admin/AdminCmsView.tsx:34` |
| Store is a single JSON doc (`backend/data/db.json`) via `loadDb()/saveDb()` | `backend/src/data/db.ts` |
| Products to sell | paid course **Advanced Data Structures ₹1299** (`data/adsCourse/index.ts:825`), free hooks C/Python/coding-foundations, **vault packs ₹99–249** (`lib/pricing.ts`), **skill tests + certificates** (`routes/skill-test.routes.ts`) |

So this is a green-field subsystem. Nothing to retrofit; we follow existing
conventions (JSON store, multer, RBAC, scheduler loop, tabbed admin UI).

---

## 1. Architecture — 6 pieces

```
CSV import ──► EmailLead[] ──► Campaign (blast | drip) ──► send queue ──► Resend API
                                                │                             │
                                                ▼                             ▼
                                          EmailMessage[]  ◄── webhook ── delivered/opened/clicked/bounced
                                                │                    (backend/src/routes/webhooks)
                                                ▼
email links (?em=signed-token) ──► landing sets tieedu_lead cookie ──► pageview beacon
                                                │
                                                ▼
                                     EmailActivity[] (viewed course/vault/skill-test)
                                                │
                                                ▼
                              automation engine (rules + cooldown) ──► more EmailMessage[]
```

1. **`backend/src/lib/email/`** — Resend client, renderer, batched sender, link signer, queue, automation rules.
2. **Templates** — React Email (`@react-email/components`), one typed component per purpose; HTML rendered server-side (no browser React needed).
3. **New collections in the JSON store** — leads, campaigns, messages, activities.
4. **Identity stitching** — every URL in every email carries `?em=<HMAC token>`; landing page exchanges it for an httpOnly cookie; subsequent page views feed `EmailActivity`. This is how "cookie ke according" targeting works for people who had **no** prior cookie.
5. **Webhooks** — `POST /api/webhooks/resend` mirrors the existing razorpay webhook pattern (`routes/webhooks.routes.ts:12`).
6. **Admin UI** — one new `EmailTab` with sections Leads / Campaigns / Automations / Stats, wired into `AdminCmsView.tsx`.

---

## 2. Data model (additions to `backend/src/data/db.ts`)

```ts
export type EmailLeadStatus = 'active' | 'unsubscribed' | 'bounced' | 'complained' | 'converted';

interface EmailLead {
  id: string;
  email: string;                    // unique, normalized lowercase
  name?: string; college?: string;  // CSV columns
  year?: string;                    // '2' for second-year segment
  status: EmailLeadStatus;
  source: string;                   // 'csv:second-year-oct-2026'
  tags: string[];
  consent_at: string;               // DPDP: when the address entered our list
  last_activity_at?: string;
  created_at: string; updated_at: string;
}

interface EmailCampaign {
  id: string;
  name: string;
  kind: 'blast' | 'drip';
  template_id: string;              // 'course-buy' | 'vault' | 'skill-test' | 'welcome' | 'offer' | 'nudge'
  segment: { tags?: string[]; year?: string; statuses?: EmailLeadStatus[] };
  status: 'draft' | 'scheduled' | 'sending' | 'paused' | 'sent';
  scheduled_at?: string;
  drip_steps?: { day: number; template_id: string }[];   // kind='drip' only
  stats: { queued: number; sent: number; delivered: number; opened: number;
           clicked: number; bounced: number; unsubscribed: number };
  created_at: string;
}

interface EmailMessage {             // one row per recipient per send
  id: string;
  campaign_id?: string; automation_id?: string;
  lead_id: string; email: string;
  template_id: string; subject: string;
  provider_id?: string;              // Resend message id
  status: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed' | 'skipped';
  skip_reason?: string;              // 'unsubscribed' | 'bounced' | 'cooldown' | 'converted'
  opened_at?: string; clicked_at?: string; sent_at?: string;
}

interface EmailActivity {            // the cookie-driven behavior trail
  id: string;
  lead_id: string;
  type: 'identify' | 'email_open' | 'email_click' | 'page_view';
  path?: string;                     // '/courses/ads', '/company/razorpay', '/skill-test/python'
  category?: 'course' | 'vault' | 'skill_test' | 'other';
  meta?: Record<string, string>;
  ts: string;
}
```

Seeds: append empty `email_leads / email_campaigns / email_messages /
email_activities` arrays next to the existing seed collections
(`db.ts:1683-1692`). Automation rules stay **code-defined** in
`lib/email/automations.ts` (typed, versioned, testable) — no rule editor in v1.

---

## 3. Execution phases

### Phase 1 — Email foundation (provider + templates + verified test send)

| Step | Detail |
|---|---|
| Deps | `npm i resend @react-email/components` in `backend/` |
| Env | `RESEND_API_KEY`, `EMAIL_FROM="TieEdu <updates@yourdomain>"`, `EMAIL_REPLY_TO`, reuse `JWT_SECRET` for link HMAC (or `EMAIL_LINK_SECRET`) |
| Domain (manual, outside code) | Resend dashboard → verify domain → DNS: **SPF + DKIM + DMARC** (`p=quarantine`), custom return-path. Without this everything lands in spam. |
| `lib/email/client.ts` | single Resend instance, fails fast if key missing |
| `lib/email/render.ts` | `render(template, props) → { subject, html, text }` (always produce plain-text part) |
| `lib/email/links.ts` | `signLink(url, leadId)` → appends `?em=<base64url(leadId.hmac)>` + UTM tags; `trackingPixel(leadId)` |
| `lib/email/send.ts` | `sendOne()` + `sendBatch()` — suppression check → render → Resend → write `EmailMessage`; retry ×3 with backoff; batches of 25 with 1s gap (100/day stays inside free-tier warm-up) |
| Templates in `lib/email/templates/` | shared `Layout.tsx` (logo header, preheader, 600px table layout, footer: physical address + one-click unsubscribe + "why am I receiving this") then **one template per purpose** — see §4 |
| RBAC | add `email: ['read', 'write', 'send']` permission group in `lib/rbac.ts` (keep separate from push `broadcasts.*`) |
| Smoke | `POST /api/email/test` (admin-only) → sends `CourseBuyEmail` to the admin's own inbox; `scripts/email-smoke.test.ts` following the `ts-node --test` pattern in `backend/package.json` |

**Exit criterion:** inbox me ek professional, responsive, unsubscribe-wala email dikhe, mail-tester score ≥ 9/10.

### Phase 2 — Leads CSV import + blast campaigns  ← **the core ask: "list feed karo, mail jaye"**

| Step | Detail |
|---|---|
| `routes/emailLeads.routes.ts` | `POST /api/email/leads/import` — multer CSV (copy fileFilter/size pattern from `pdfLibrary.routes.ts:20-33`); parse columns (`email,name,college,year`), trim/lowercase/dedupe, regex-validate, **drop** addresses already unsubscribed/bounced/converted; returns `{ imported, skipped:[{email,reason}] }` + first-5 preview. Also `GET /leads` (filters: status/tag/year + pagination), `POST`, `PATCH`, `DELETE`. |
| `routes/emailCampaigns.routes.ts` | CRUD; `POST /:id/test` → 1 sample send to admin; `POST /:id/send` → resolve segment → create `EmailMessage[]` as `queued` → enqueue; `GET /:id` → progress from message counts; `POST /:id/pause` (batches respect it between chunks). |
| `lib/email/queue.ts` | in-process FIFO, concurrency 1, 25-message chunks with ~1–2s delay; state persisted via `EmailMessage.status`, so a crash degrades to `paused` (admin resumes — no Redis at this scale). |
| Unsubscribe | `GET /api/email/unsubscribe?token=` → sets lead `unsubscribed`, records activity, returns a tiny styled HTML confirmation (server-rendered, no frontend route needed). Token = HMAC(leadId), no login required — required by law, not optional. |
| Webhook | `POST /api/webhooks/resend` — verify signature (Resend SDK `webhooks.verify` with `RESEND_WEBHOOK_SECRET`); map `delivered → EmailMessage.delivered`, `opened/clicked → opened_at/clicked_at` + `EmailActivity` row, `bounced/complained → lead.status`. Webhook down ⇒ stats freeze at "sent" but sending still works (degrade, never block). |
| Admin UI | `frontend/src/components/admin/EmailTab.tsx` with sections **Leads** (import dropzone, table, filters) / **Campaigns** (builder: segment → template pick → live preview with sample data → *Send test to me* → typed-name confirmation like `BroadcastTab.tsx` → send with live progress bar) / **Stats**. Add `'email'` to the `TabId` union + tabs array in `AdminCmsView.tsx:34,41`. New API wrappers in `frontend/src/lib/api.ts`. |

**Exit criterion:** CSV upload → segment "year 2" → preview → test send → full blast of <1,000 with progress + stats + working unsubscribe, all from the admin panel.

### Phase 3 — Cookie identity + behavior tracking ("unka specific cookies ke according jo woh dekh rha hai")

Cold leads have **no cookie today**. The cookie is created by the first email click:

1. **Sign** — every CTA/link in every email goes through `signLink()` → `?em=…`.
2. **Exchange** — frontend (`_app.tsx` boot): if `em` present in query → `POST /api/email/identify { token }` → backend verifies HMAC → sets httpOnly cookie **`tieedu_lead`** (path `/`, 90 days, `sameSite=lax`, `secure` in prod — same technique as `tieedu_refresh`, `auth.ts:18`) → records `identify` activity (with `?utm_*` + landing path).
3. **Observe** — `frontend/src/hooks/useLeadTracking.ts`: on every `router.events` route change, `navigator.sendBeacon('/api/email/track', { path, title })`. Backend classifies:
   - `/courses/**`, `/course/**` → `category: 'course'`
   - `/company/**` → `category: 'vault'`
   - `/skill-test/**` → `category: 'skill_test'`
   - auth pages (`/login`, `/signup`) → **never tracked**
4. **Only identified leads** (cookie present) are tracked; no fingerprinting, no third-party pixels. Privacy note in footer.

Now the system knows: *lead L opened "buy course" mail → clicked → saw Advanced Data Structures page → left without buying.* That row is what automation consumes in Phase 4.

### Phase 4 — Automation engine (behavior-triggered mails, with cooldowns)

`backend/src/lib/email/automations.ts` — v1 rules, all code-defined:

| # | Trigger | Wait | Email | Fires once |
|---|---|---|---|---|
| A1 | `page_view category=course` , no matching order | 48h | `NudgeEmail(course)` — "still thinking about {course}?" + coupon | per course |
| A2 | `page_view category=vault`, no unlock | 48h | `VaultUnlockEmail` (₹99 entry pack) | per lead |
| A3 | `page_view category=skill_test`, no attempt | 48h | `SkillTestEmail` (free attempt → certificate) | per lead |
| A4 | `email_click` but no page_view after | 5d | re-send same template, **different subject** (non-openers re-subject) | per campaign |
| A5 | drip campaign days | 0/2/4/6/8/10 | welcome → course → proof → vault → skill-test → last call (§5) | per lead |

**Hard guards (all enforced in one `eligible()` fn):**
- skip if `lead.status !== 'active'` (unsubscribe/bounce/complaint immediately)
- skip if lead has a paid order (converted → stop selling, hand off to onboarding)
- **cooldown**: ≥ 4 days since any email to that lead; max 6 automated emails lifetime; dedupe key `(rule_id, lead_id)` unique
- campaign blasts pause automations on the same template_id to avoid double-touch

**Scheduler**: `startEmailAutomationScheduler()` in `lib/email/automations.ts`, cloned from `reminders.ts:229-253` (`TICK_MS` loop, `MAX_PER_PASS`, skip while queue busy), started in `server.ts` next to `startReminderScheduler()`. Dev helper: `POST /api/email/automations/run-now` (admin) to evaluate without waiting for the tick.

### Phase 5 — Analytics + campaign polish

- Stats screen: per-campaign funnel `queued → sent → delivered → opened → clicked → unsubscribed`, per-automation counts, per-template open/CTR, lead detail timeline (every send + activity for one person), CSV export.
- Optional stretch: subject A/B on blast (send 10% split, winner at 6h), Resend "audience" not used — our JSON store stays source of truth (consistent with the rest of the codebase).

---

## 4. The email set — har cheez ka mail alag (professional, typed templates)

All use shared `Layout.tsx`: TieEdu logo, preheader text, 600px responsive
tables, primary CTA button, social-proof strip, footer = sender identity +
physical address + `Unsubscribe` + "Update preferences". Plain-text fallback
always. Every link UTM-tagged + `em`-signed.

| template_id | Purpose | Subject (example, <50 chars) | Body skeleton |
|---|---|---|---|
| `welcome` | Day-0 value drip | "Your 2nd-year toolkit → placements" | greeting → 3 free resources (C/Python/coding-foundations) → soft mention of what's ahead, **no price** |
| `course-buy` | Sell paid course (ADS ₹1299) | "The DSA prep that starts in 2nd year" | pain (placement rounds start early) → 5 outcome bullets from curriculum → certificate + sample lesson → ₹1299 anchor w/ coupon `TYEAR20` → CTA "Start the course" |
| `course-buy-later` | A1 nudge after page view | "Still on the fence about DSA?" | "You checked out {course}…" → biggest objection answered → limited coupon → single CTA |
| `vault` | Company vault packs | "How students crack {company} rounds" | company logo → what's inside (questions/curriculum) → ₹99 entry CTA → preview link |
| `skill-test` | Assessment + certificate | "Free skill test → resume proof" | take free test → instant score + certificate → share-to-resume angle → CTA |
| `proof` | Social proof / FAQ | "2,400 students, 4.8★ — here's why" | 3 testimonials, screenshots, FAQ (refund, time, language), no hard CTA |
| `offer` | Last-call urgency | "Coupon {code} expires tonight" | what they saw → coupon + expiry countdown → 2 CTAs (course/vault) |
| `reengage` | A4 non-opener resend | new subject only, same body | — |

Rules baked into templates: name fallback ("Hi there"), no ALL-CAPS, no
"FREE!!!", no link-stuffed body (≤ 5 links), real unsubscribe text, Hindi/Hinglish
allowed in body but subject in English (open-rate is higher for ed-tech lists).

---

## 5. The second-year sales sequence (the actual campaign to run now)

**Product ladder for 2nd year:** free courses (trust) → **ADS ₹1299**
(flagship) → vault packs ₹99–249 (affordable repeat purchase) → skill tests
(resume proof). Coupons: create in existing `CouponsManager` — `TYEAR20`
(20% off ADS, 10-day expiry), `VAULT99` (entry pack).

**Blast = 10-day drip** (kind `drip`, send window **7–8 PM IST weekdays**,
batch ≤100/day for warm-up — under 1,000 total, 4 days to fully go out):

| Day | Template | Job |
|---|---|---|
| 0 | `welcome` | value first, zero selling — earn the open |
| 2 | `course-buy` | flagship ADS pitch + `TYEAR20` |
| 4 | `proof` | objection handling for the non-buyers |
| 6 | `vault` | ₹99 entry pack (cheap "yes") |
| 8 | `skill-test` | free test → certificate |
| 10 | `offer` | `TYEAR20` expires — deadline close |

Running **in parallel**: behavior rules A1–A3 (cookie-triggered) and A4
(non-opener re-subject at day 3 of each blast). Example path: lead clicks
day-2 mail, lands on ADS page, leaves → at +48h `course-buy-later` nudge fires
with the coupon — this is the "specific cookies ke according" mail.

**Stop conditions:** buy → sequence ends; unsubscribe → instant; 6-email cap.

**Deliverability guardrails (cold list, <1,000):**
1. Verify domain DNS first (SPF/DKIM/DMARC) — Phase 1 manual step.
2. Day 1 send only to the 100 most plausible addresses (valid name/college), Day 2 +250, Day 3 rest. Watch bounce %; > 3% ⇒ pause and clean.
3. Check `support@` inbox for spam complaints; Resend suppression list is auto-honored + mirrored in `EmailLead.status`.
4. DPDP/CAN-SPAM: consent field on import, physical address in footer, one-click unsubscribe honored within minutes (local status update is synchronous; don't wait for webhook).
5. Expect cold-list open rate 15–30%, CTR 1–4% — judge the sequence on **click→purchase**, not opens.

---

## 6. Config summary

```bash
# backend/.env (additions)
RESEND_API_KEY=re_xxx
RESEND_WEBHOOK_SECRET=whsec_xxx
EMAIL_FROM="TieEdu <updates@yourdomain.com>"
EMAIL_REPLY_TO="support@yourdomain.com"
# EMAIL_LINK_SECRET — optional; falls back to JWT_SECRET
```

New deps: backend `resend`, `@react-email/components` (frontend zero new deps).

---

## 7. File change list

**New (backend):** `lib/email/{client,render,links,send,queue,automations}.ts`,
`lib/email/templates/{Layout,Welcome,CourseBuy,CourseBuyLater,Vault,SkillTest,Proof,Offer,Reengage}.tsx`,
`routes/emailLeads.routes.ts`, `routes/emailCampaigns.routes.ts`,
`routes/emailTrack.routes.ts` (identify/track/unsubscribe/webhooks),
`scripts/email-smoke.test.ts`.

**Edited (backend):** `data/db.ts` (+4 types, +4 seed arrays), `server.ts`
(mount routers, start automation scheduler), `lib/rbac.ts` (+`email` group),
`.env`.

**New (frontend):** `components/admin/EmailTab.tsx` (+subcomponents),
`hooks/useLeadTracking.ts`, `lib/emailApi.ts`.

**Edited (frontend):** `components/admin/AdminCmsView.tsx` (TabId + tab entry),
`pages/_app.tsx` (em-token exchange boot), `lib/api.ts` (endpoints).

---

## 8. Verification

1. `backend: npm run typecheck && npm run test` (add `test:email` script), `frontend: npm run typecheck && npm run lint && npm run build`.
2. End-to-end with a 5-row sample CSV (own Gmail included): import → preview → test send → open in Gmail/Outlook/mobile (images, CTA, unsubscribe) → click CTA → confirm `tieedu_lead` cookie + `identify` row → visit course page → `page_view` row → `run-now` → nudge email arrives → unsubscribe link kills further sends.
3. Webhook: `curl` a signed sample payload → verify stats move; then disable webhook → confirm sending degrades gracefully.
4. Mail-tester.com ≥ 9/10 with real DNS in place.

---

## 9. Risks / known issues

| Risk | Mitigation |
|---|---|
| Cold/bought list → spam traps, domain reputation damage | DNS auth first, warm-up batches, bounce>3% pause, tiny list (1,000) caps blast radius |
| Resend free-tier limits change | Confirm current quota at setup (free tier ≈ 3,000/month, ~100/day); sequence fits, else ₹1.5k growth plan covers it |
| Opens unreliable (Apple MPP pixels) | optimize & measure **clicks and purchases**, treat opens as vanity |
| Webhook not configured in v1 | sending unaffected; stats cap at `sent` until configured |
| **Pre-existing bug:** `config.ts:19-21` reads `RZP_KEY_ID/RZP_KEY_SECRET/RZP_WEBHOOK_SECRET` but `backend/.env` defines `RAZORPAY_*` → `PAYMENT_MODE=razorpay` never activates, checkout silently falls back to UPI-QR + manual verification | email sales land on that checkout — fix the env names in the same sprint or accepting manual verification is a conscious choice |
| Automations overwhelming a small list | cooldown 4d + lifetime cap 6 + blast/automation dedupe, all in `eligible()` |

---

## 10. Build order & effort

| Phase | Delivers | Size |
|---|---|---|
| **1** Provider + templates + test send | "email bhej sakte hain" | S |
| **2** CSV import + blast + unsubscribe + webhook + admin tab | **the core ask — list feed → professional mails out** | **M** |
| **3** Cookie identity + pageview tracking | behavior data starts accumulating | M |
| **4** Automation rules + scheduler | "cookie ke according auto mails" | M |
| **5** Analytics dashboard + sequence tuning | measure & iterate | S |

Phases 1+2 alone ship the requested capability (feed a list, each product gets
its own professional mail). 3+4 layer the cookie-driven targeting on top.
Phase 5 makes it a loop. Sequence in §5 is launch content for the second-year
push and can be written while Phase 1–2 are in build.
