# Admin Control Plane — Mobile / Desktop Management & Push Broadcasting

Deep implementation plan for turning the TieEdu admin console into a full control
plane over every client install, and adding a real server-side notification + push
delivery system.

**Locked decision: PWA only.** There will be no native mobile app (no React
Native / Expo / Flutter / Capacitor) and no native desktop wrapper (no Electron /
Tauri / NW.js). "Desktop app" means the PWA installed via Chrome/Edge app mode
or a desktop shortcut; "mobile app" means the PWA installed to the home screen.
Every client is therefore the same Next.js build, which is why one device
registry, one release channel and one push pipeline cover all platforms.

Status: **proposal**. Nothing in this document is implemented.

---

## 0. Ground truth (read this before planning anything else)

| Assumption in the request | Reality in the repo | Consequence |
|---|---|---|
| "mobile app" exists | Only an installable PWA. `manifest.json:1-59` + `sw.js:1-15`. `MOBILE_APP_UI_PLAN.md:124-125` explicitly scopes out native builds. **Stays PWA-only by decision.** | Install tracking, push and release management all have to be *built*, not *exposed*. |
| "desktop app" exists | Nothing. No Electron/Tauri/NW.js anywhere. "Desktop" today = responsive layout at `lg`+ (`DEEP_EXECUTION_PLAN.md:120`). **PWA-only by decision.** | No new build pipeline. Desktop becomes a distribution *mode* of the existing PWA (§5). |
| notifications can be sent | Zero delivery infra. No stored notification entity, no FCM/VAPID/OneSignal dep, no WS/SSE, no queue. `notifications.ts:4-20` derives everything on read. | A `notifications` collection + delivery worker must be created (§3). |
| admin has "full access" to this | Admin console is **16 flat tabs in one page** (`AdminCmsView.tsx:30-49`), and only 2 roles exist at runtime: `'user' \| 'admin'` (`backend/src/data/db.ts:85`). | Needs real RBAC + a restructructured console (§6). |
| analytics are admin-visible | `analyticsRouter` is mounted **bare** at `server.ts:96` with no guard. `GET /api/analytics` and `/revenue` leak platform revenue to anonymous callers. | Blocker — §1. |

**What PWA-only buys:** no app-store review, no APK/IPA signing, no native
crash symbolication, no per-platform release cadence, one codebase to audit.
One Next.js build serves phone, tablet and desktop.

**What it costs, and the honest mitigations:**
- **iOS push is weak.** iOS 16.4+ requires the PWA to be *installed* to the home
  screen before `pushManager` works, and Web Push on iOS is Safari-only. Expect
  near-zero iOS push reach. Mitigate with in-app polling (§3.6) and, if reach
  matters, add a server-side email/WhatsApp channel later (§11).
- **Desktop "installation" is manual.** Chrome/Edge app mode has no install
  prompt event at all — no `beforeinstallprompt`, no `appinstalled`. Desktop
  install must be detected by `display-mode: standalone` transition plus admin-
  seeded install links / documentation (§5.2).
- **No silent background execution.** No background sync, no periodic sync in
  Safari. Update and notification delivery depend on the app being opened or the
  push service waking the SW.
- **No store discovery.** No Play/App Store listing, so install growth depends
  entirely on the in-app install CTA (§4.2) and on link/QR distribution that the
  admin console can generate (§5.3).
- **Cache-busting is manual.** Version bumps are a manifest + SW cache-version
  edit, not a store rollout. `min_supported_version` (§4.3) is therefore the only
  reliable way to force an update.


**Hard ceiling:** every mutation rewrites the entire 3.2 MB `backend/data/db.json`
(`backend/src/store/index.ts:1-11`). Adding a device registry plus a per-recipient
delivery log makes this untenable well before feature work is done. §8 must land
before broadcast ships, not after.

---

## 1. Phase 0 — Security unblock (blocking, ships first)

None of this is "admin features", but all of it is admin *authority*. Ship as
its own PR so nothing else can be blocked on review.

| # | Issue | Location | Fix |
|---|---|---|---|
| 1.1 | Hard-coded CockroachDB connection string committed as fallback | `backend/src/db/client.ts:6` | Delete the literal. Fail closed on missing `DATABASE_URL`. Rotate the credential. |
| 1.2 | Platform revenue + order volume unauthenticated | `backend/src/server.ts:96`, `backend/src/routes/analytics.routes.ts:9,24` | Mount with `requireAdmin`. Add an allowlist for a metrics scraper if needed. |
| 1.3 | Hardcoded default admin password in source | `backend/src/server.ts:178` | Remove the fallback. Refuse to boot without `ADMIN_PASSWORD`. Rotate the live hash. |
| 1.4 | `POST /api/sandbox/execute` unauthenticated code execution | `backend/src/routes/sandbox.routes.ts:6`, `server.ts:103` | `requireAuth` + rate limit + audit. |
| 1.5 | Instructor CRUD routes sit **above** the `requireAdmin` guard | `backend/src/routes/courseAdmin.routes.ts:102-105` vs guard at `:163` | Move them below the guard. Keep only the thumbnail GET at `:148` public. |
| 1.6 | Audit log exists but is barely surfaced | `audit` array, 48 entries, `admin.routes.ts:956` | Promote to a first-class admin surface (§6.8). |
| 1.7 | `schema.sql` role enum contradicts live union | `backend/src/data/schema.sql:12` (`candidate`/`admin`/`tpo`) vs `db.ts:85` | Reconcile during the §8 migration. |

Exit criteria: `grep` for the credential returns nothing; anonymous
`GET /api/analytics` returns 401; `npm test` in `backend/` green.

---

## 2. Phase 1 — Identity, devices & releases (the foundation)

Everything in §3–§6 reads from the collections defined here. Do not start with
the UI.

### 2.1 `devices` — one row per install, not per user

Users install before they sign in, so this cannot be keyed on `user_id`.

```
id                 install_id (uuid, generated on first hit)
user_id            string | null   -- null until claimed at login
platform           'android' | 'ios' | 'windows' | 'macos' | 'linux' | 'other'
                   -- derived from UA + `display-mode: standalone`. A browser tab
                   -- is NOT an install and does not get a row.
install_surface    'pwa' | 'browser_tab'
                   -- browser_tab rows are throwaway visit records, never
                   -- devices. Keeps install counts honest.
app_version        string          -- from manifest.version
channel            'web'           -- single release channel; PWA-only by decision
os, os_version, browser, user_agent, locale, timezone, screen, ip_hash
first_seen_at, last_seen_at, last_active_at
is_blocked         boolean         -- admin kills this install
install_kind       'auto_prompt' | 'manual_home_screen' | 'ios_home_screen' | 'manual_desktop'
pwa_prompt_shown, pwa_prompt_outcome, pwa_prompt_at
first_touch         { source, medium, campaign, ts }   -- captured once, never overwritten
telemetry_enabled  boolean
```


Instrumentation points:
- `frontend/src/pages/_app.tsx:34-38` — SW registration; POST `/api/devices/track` once per session.
- `beforeinstallprompt` captured and stashed in `src/lib/pwaInstall.ts` (new) for the custom install CTA.
- `appinstalled` event → `install_kind: 'pwa_prompt'`, recorded.
- iOS has no `beforeinstallprompt`. Detect `display-mode: standalone` via
  `matchMedia` change listener; if it flips without an `appinstalled`, it was a
  home-screen install.
- Claim: on login/refresh, `POST /api/devices/claim` with the `install_id`
  from the http-only-adjacent local key; server attaches `user_id` and merges
  any prior anonymous history.

### 2.2 `push_subscriptions`

```
id, user_id, device_id
provider           'vapid' (web/desktop-web) | 'fcm' | 'apns'
endpoint, p256dh, auth, keys_json
created_at, last_success_at, failure_count, disabled_at, disable_reason
```

One row per subscription. A user with 3 installs = 3 rows. Deletion is driven by
410/404 responses from the push service (standard `web-push` behaviour).

### 2.3 `notification_preferences`

```
user_id
channels           bitmask: inapp | push | email | sms
quiet_hours        { start: '22:00', end: '07:00', tz: 'Asia/Kolkata' }
topics             { announcements: bool, courses: bool, payments: bool,
                     results: bool, offers: bool, system: bool }
daily_push_cap     int (default 3)  -- non-critical pushes only
```

Server is authoritative. The client only renders the opt-in UI.

### 2.4 `releases` — what is live, and who is on it

```
id, channel ('web'), version
artifact_url, artifact_path, size_bytes, sha256
notes              markdown release notes
mandatory          boolean
min_supported_version
rollout_percent    0-100 (staged)
status             'draft' | 'scheduled' | 'rolling' | 'live' | 'paused' | 'rolled_back'
sw_cache_version   int   -- bumped to evict old service workers
created_by, created_at, published_at
downloads          derived counter (see §5.4)
```

There is **no artefact to upload** in a PWA-only world — the release *is* a
deployed Next.js build plus a manifest version bump and a SW cache-version bump.
The collection still exists because it records *what is live*, *who is on it*,
and *the floor everyone must be on*.

Artefacts that do exist stay where they are: posters and PDFs in
`backend/uploads/` (`pdfLibrary.routes.ts`, `posters.routes.ts:160`), and the
generated certificate PDFs. Move them to object storage in §8.

### 2.5 Real RBAC — replace the binary role

`db.ts:85` (`'user' | 'admin'`) is why "full admin access" is currently
all-or-nothing against a single seeded account. Add:

```
staff: { id, user_id, role, permissions[], status, created_by, created_at, mfa }
```

Roles: `super_admin`, `admin`, `finance`, `content_editor`, `moderator`,
`instructor`, `support`, `analyst`, `viewer`.

New middleware in `backend/src/middleware/auth.ts`, alongside
`requireAdmin` (`:115`):

```ts
requirePermission('orders.verify')
requireAnyPermission(['broadcasts.write', 'releases.publish'])
requireSelfOrPermission('users.update')
```

`role` stays on the user record for coarse checks; `staff.permissions[]` is the
fine-grained authority. Every admin mutation writes an `audit` entry naming the
staff id and the permission that allowed it.

### 2.6 Admin self-protection

Actions affecting every user — broadcast send, forced update, maintenance mode,
bulk delete — get:
1. `requirePermission('danger.<action>')` on the route
2. A typed confirmation (`type "FORCE UPDATE"` to match) in the UI
3. A 60-second cooldown between repeat sends
4. An immutable audit row with the exact payload

Optional 2-person approval (`pending_approval` queue) for broadcast > 10k
recipients. Recommend shipping the cooldown first and the approval queue after
broadcast volume is real.

---

## 3. Phase 2 — Real notification + push delivery

### 3.1 Reverse the "derived, not stored" decision — deliberately

`frontend/src/lib/notifications.ts:1-21` argues for deriving notifications so the
bell can never lie. That reasoning is correct for **transactional** notices and
wrong for **admin broadcasts**. A broadcast has no derivable source-of-truth — it
only exists because an admin authored it.

Resolution: two channels, both merged in the bell.
- **System notices** stay derived (`order:*`, `report:*`, `xp:*` keys).
- **Admin notices** come from the new server list, and each carries a `source_ref`
  (`order:123`, `report:abc`) so a broadcast can link to, and auto-resolve
  against, the same underlying facts. A broadcast about a paid order still cannot
  outlive a wrong claim.

This is the honest version of the existing invariant, not a break from it.

### 3.2 New collections

```
notifications:
  id, kind ('system' | 'broadcast'), topic, severity ('info'|'success'|'warning'|'critical')
  title, body, image_url, href, tone
  audience            -- serialized segment descriptor (§3.3)
  audience_hash       -- sha256 of resolved user ids; makes send idempotent
  channels            -- ['inapp','push','email','sms']
  source_ref, source_resolves_at
  status              'draft'|'scheduled'|'sending'|'sent'|'failed'|'cancelled'
  scheduled_at, sent_at, created_by, created_at
  counts              { targeted, queued, sent, delivered, opened, dismissed, failed }

notification_deliveries:            -- append-only, one row per recipient per channel
  id, notification_id, user_id, device_id, channel
  status 'queued'|'sent'|'delivered'|'opened'|'failed'|'suppressed'
  sent_at, opened_at, error, attempts
  suppression_reason                 -- quiet_hours | daily_cap | unsubscribed | no_subscription | blocked_device
```

`read_at` moves to the server per user (`notification_reads: user_id, notification_id, read_at`).
This is the exact item `notifications.ts:16-20` flags as "the first thing to
revisit" — this is that revisit.

### 3.3 Segment builder (the audience designer)

Declarative descriptors, resolved to a user-id set at send time:

```
all                  
role:instructor
course_enrolled:<courseId>
cohort:<cohortId>
platform:android | platform:ios | platform:windows | platform:macos | platform:linux
desktop_only        -- shorthand for windows|macos|linux
mobile_only         -- shorthand for android|ios
app_version_below:<version>          -- auto-computed for forced updates
last_active_within:7d | 30d | 90d
paid                -- has >= 1 paid order
never_purchased
city:<city>          -- only if geo consent collected
device_os:<os>
```

Admin UI must show a **live count preview and a 5-row sample** before send. An
admin sending to "all users" without seeing that it is 26 or 2.6M is the failure
mode to design against.

### 3.4 Delivery worker

No Redis/BullMQ in dependencies today. Start in-process:

- `backend/src/notifications/worker.ts`, started from `server.ts` after the
  existing crash handlers (`:74-75`).
- Batch loop: claim 200 `queued` deliveries → dispatch → write results.
- Crash-safe by construction: `notification_deliveries` is the cursor. A restart
  re-claims anything still `queued`. No in-memory queue to lose.
- Concurrency capped per provider; exponential backoff on provider errors.
- 410/404 from a push endpoint → set `push_subscriptions.disabled_at`, reap.
- Per-user `daily_push_cap` and `quiet_hours` checked at dispatch, not at compose —
  a send at 23:50 must land at 07:10.
- Migrate to BullMQ + Redis in §8 once volume justifies it.

### 3.5 Web push wiring

- Add `web-push` to `backend/package.json`. Generate VAPID keys, store in env,
  expose public key at `GET /api/push/vapid-public-key`.
- `POST /api/push/subscribe` · `DELETE /api/push/subscribe` · `POST /api/push/test`.
- **PWA-only reach matrix** — one VAPID pipeline, very uneven coverage:

  | Platform | Push works? | Condition |
  |---|---|---|
  | Chrome / Edge (desktop) | Yes | Installed or not; permission granted |
  | Chrome (Android) | Yes | Works in-browser, but install improves retention |
  | Safari (iOS) | **iOS 16.4+, installed to home screen only** | Expect near-zero reach without install |
  | Firefox / Safari (desktop) | Partial | Safari desktop support is limited |

  Because of the iOS gap, §3.6 polling is not optional — it is the fallback
  channel, and the admin reach estimate in the broadcast composer must show
  "≈N push-reachable, M in-app-only" rather than a single number.
- **Service worker must grow handlers.** `frontend/public/sw.js:1-15` is
  cache-strategy only:
  - `push` → parse payload, `showNotification` with `renotify: false`, tag by
    `notification_id` so a repeat replaces rather than stacks.
  - `notificationclick` → close, focus existing client or `openWindow(href)`.
  - Bump the cache version; existing clients keep the old SW until all tabs close.
- Frontend hook `src/hooks/usePushSubscription.ts`: permission request must be
  user-gesture initiated (never on load), report `denied` / `dismissed` /
  `granted` distinctly, and POST the subscription. On iOS show the
  "add to home screen first" state instead of requesting permission — the
  request simply fails otherwise and the user blames the app.


### 3.6 Frontend bell changes

- `src/lib/notifications.ts` — keep `deriveNotifications` untouched, add
  `mergeServerNotifications(derived, server)` with `source_ref` dedupe.
- `src/hooks/useNotifications.ts:21-33,45-50` — currently refreshes only on
  window `focus`. Add a poll (60s, paused when `document.hidden`) plus a
  lightweight SSE stream if §8 lands.
  **This poll is load-bearing, not a nice-to-have.** Under PWA-only it is the
  *only* channel that reaches iOS/Safari, and it covers 100% of the
  user-triggered notices in `notifications.ts:84-150` at zero cost (§11.2).
  Budget it explicitly and back it with the delivery-log read in §3.2 —
  polling 26 users is trivial; polling 100k installs is not.
- `src/components/layout/NotificationBell.tsx:31-38` — add server unread count,
  per-item dismiss, "mark all read" hitting `POST /api/notifications/read`.

### 3.7 Admin Broadcast composer

- Title/body with `{{name}}` and `{{course_count}}` templating + preview.
- Per-channel copy override (push title ≤ 40 chars, SMS ≤ 160).
- Audience builder with live count + sample (§3.3).
- Schedule with timezone, or send now.
- Per-recipient delivery log drill-down, open-rate funnel, CSV export.
- Duplicate an old broadcast (cheap and high-value).

---

## 4. Phase 3 — Install management (mobile + desktop)

### 4.1 Install funnel

| Stage | Signal | Source |
|---|---|---|
| Visited | `install_surface: 'browser_tab'` row | `_app.tsx` beacon |
| Prompt shown | `pwa_prompt_shown` | `beforeinstallprompt` (Chromium only) |
| Prompt dismissed | `pwa_prompt_outcome='dismissed'` | `userChoice` |
| Installed | `install_surface` flips to `'pwa'` | `appinstalled`, or display-mode flip (§5.1) |

The prompt stages are Chromium-only. **iOS and desktop have no prompt at all**,
so conversion = installed / prompt-shown is only meaningful for Android. Report:

- Android: full four-stage funnel with a real conversion rate.
- iOS and desktop: installed + active counts, with install-link hits (§5.3) as the
  only available denominator.

Do not average these into a single "install rate" — the denominators are not
comparable and the number will mislead whoever reads the dashboard.

### 4.2 Install CTA

`src/components/pwa/InstallPrompt.tsx` (new). Android/Chromium: the captured
native prompt. iOS: a "Share → Add to Home Screen" instruction sheet. Desktop:
a manual-steps sheet pointing at Chrome/Edge "Install app", plus the generated
install link from §5.3. Suppressed after install or after N dismissals per
install; the dismissal count lives on the install row so a nagging prompt is a
one-line admin-readable field.

### 4.3 Version & health

- Active devices by version (7d / 30d windows), adoption curve per release.
- `app_versions.min_supported_version` → server returns `{ force_update: true }`
  on `/api/auth/me`; client shows a blocking modal. Enforcement must be
  server-side — a client-only gate is a suggestion.
- Error beacon: `window.onerror` + `unhandledrejection` → `POST /api/telemetry/errors`
  with release tag. Ties error rate to a specific build, which is the only way
  to answer "did 2.4.1 break checkout".
- Optional: Sentry. The beacon is the zero-dependency floor.

### 4.4 Remote config & feature flags

`remote_config` collection: `{ key, value, enabled, target: {roles, countries,
platforms, app_versions, percentage}, updated_by, updated_at }`.
Served at `GET /api/config` (public-safe subset) and evaluated server-side so a
kill switch is real, not cosmetic.

Admin controls:
- Feature flags with 0/10/25/50/100% rollout, targetable by role and version.
- Announcement bar: copy, link, dismiss-permanent toggle, start/end dates.
- **Maintenance mode**: lock all non-admin traffic with a custom page. Add a
  bypass list (`staff.allowlisted`) so admins keep working during an incident.
- Kill switches for individual features (checkout, uploads, PDFs, posters,
  push) — the highest-value incident tool in this whole document.

### 4.5 PWA asset management

Manifest editor (name, short name, start_url, scope, display, `display_override`,
orientation, theme colour, background colour), icon upload with size validation,
splash screenshots, and the 3 shortcuts at `manifest.json:40-58`. Writes to
`manifest.json` + `icons/` + a bumped SW cache version. Back up the prior
manifest so a bad edit is revertible from the admin UI.

---

## 5. Phase 4 — Desktop = installed PWA

**No Electron. No Tauri. No `desktop/` workspace.** A desktop "app" is the same
PWA installed by the user through Chrome/Edge app mode or a shortcut. There is no
second build, no updater binary, and no second release channel — which is why
§2.4 has one `channel: 'web'` and §2.1 has one `channel` field.

What §5 therefore covers is everything needed to make the desktop install
first-class: detecting it, supporting it properly in the manifest, counting it,
and giving the admin the rollout controls.

### 5.1 Desktop install detection

There is no `beforeinstallprompt` and no `appinstalled` on desktop. Detect the
transition into app mode:

```ts
const mq = window.matchMedia('(display-mode: standalone)');
mq.addEventListener('change', (e) => {
  if (e.matches) reportInstall({ platform: detectOS(), install_kind: 'manual_desktop' });
});
```

Plus a UA check on first hit: if `(display-mode: standalone)` is already true at
boot, this is a returning desktop install and `first_seen_at` is backfilled.
The same handler serves iOS home-screen installs (`install_kind:
'ios_home_screen'`), because iOS also has no install prompt.

Caveat to record in the admin UI: a display-mode flip is an *install signal*,
not proof of a fresh download — a user can be reported twice if they clear site
data. Report installs as "distinct installs by `install_id`", never as a raw
event count.

### 5.2 Manifest work for a real desktop experience

Chrome/Edge app mode honours several manifest keys the current file does not use
(`manifest.json:1-59`):

```jsonc
"display_override": ["window-controls-overlay", "standalone", "browser"],
"launch_handler":  { "client_mode": "focus-existing" },
"shortcuts": [ ... ]   // already 3, add "Continue learning" / "My certificates"
```

- `display_override` with `window-controls-overlay` gives a proper desktop title
  bar instead of a bare window. Requires a matching CSS env fallback
  (`titlebar-area-*`) or the layout breaks — this is the one non-obvious bit.
- `client_mode: 'focus-existing'` makes a second launch focus the running window
  instead of opening a duplicate tab. Without it, "desktop app" feels broken.
- `shortcuts` become **taskbar jump-list entries on desktop** — the highest-value
  desktop affordance and it costs nothing extra.
- Add `screenshots` (wide + narrow) for richer install UI.
- `scope` must be correct or the installed app escapes to the browser.

### 5.3 Install-link generator (admin)

Desktop installs are manual, so the admin console should generate the links and
QRs rather than hope users find the button.

- Admin picks a destination, source, medium, campaign. Console returns a QR PNG
  plus a copy-ready one-liner. The backend already depends on `qrcode`
  (`backend/package.json`), so this needs no new dependency.
- **No short-link token table.** Point the QR at a real URL with campaign params:
  `/?utm_source=qr&utm_medium=install&utm_campaign=<name>`. `manifest.json:3`
  already uses this pattern (`?source=pwa`), so it is the repo convention — do not
  invent a second one.
- The QR target must be an **install landing page**, not the admin console. That
  page shows the correct instructions for the detected platform (§4.2), writes
  `first_touch` onto the install row, then forwards to the destination.
- `first_touch` is set once and never overwritten. A returning user clicking a
  second QR must not have their original attribution rewritten.

### 5.4 Install & download counting

There is no artefact to count, so "downloads" becomes three honest numbers. Do
not conflate them:

1. **Visits** — `install_surface: 'browser_tab'` rows. Top of funnel only.
2. **Installed** — distinct `devices` rows with `install_surface: 'pwa'`.
3. **Active** — those with `last_active_at` inside the reporting window.

Only (3) answers "how many people are actually using the app". The admin Command
Center should show all three, because a rising (1) with a flat (3) is the
signature of a broken install funnel — usually a prompt that never fires.

Break (2) and (3) down by `platform` so desktop is visible next to mobile.

### 5.5 Version & update control on desktop

Same mechanism as §4.3, and it is the *only* update mechanism a PWA has:

- `min_supported_version` on the release → `/api/auth/me` returns
  `{ force_update: true }` → blocking modal.
- For **logged-out** installs the gate must also run on `GET /api/config` /
  `GET /api/health`, or a stale anonymous window never gets the notice.
- Because there is no store rollout, a bad release can only be escaped by
  bumping `min_supported_version` forward — so the admin console needs an
  obvious **"Roll back"** action that repoints the live version and sends a
  `system` broadcast telling affected installs to reopen.
- SW cache-version bump is mandatory with every release; `sw.js:1-15` is
  network-first with stale cache, so a forgotten bump is a user-visible bug.


---

## 6. Phase 5 — Admin console restructure

`/admin` is one page with 16 flat tabs (`AdminCmsView.tsx:51-53`, tab state at
`:53`). Refresh loses your place; tabs are not linkable; permissions cannot be
applied per tab. Move to grouped nested routes (`/admin/<section>/<tab>`), keep
`?tab=` as a redirect for old bookmarks.

### 6.1 Command Center (new home)
- Live KPI row: revenue today/7d/30d, active installs, DAU/MAU, pending queues.
- Action queues with deep links: payments awaiting verification, reports to
  moderate, devices with failed pushes, releases below adoption target.
- Platform health from the request logger at `server.ts:54-67`: error rate, p95
  latency, `db.json` size, write latency (the §8 canary).
- Live audit feed (`admin.routes.ts:956`).
- Version banner: "v2.4.0 on 41% of active installs · 38% below minimum".

### 6.2 Devices (new)
List + filter by platform, version, OS, first/last seen, blocked, subscription
health. Per-install: full history, sessions, push subscription status, revoke
(block + kill push + force re-auth), impersonate-for-debug (audited).

### 6.3 Install Links & QR (new)
§5.3 — generate `t.ie/i/<token>` links and QR images per platform/campaign, and
see hit → install → active conversion for each.

### 6.4 App Releases (new)
§2.4 + §5.5. Record the live version, set `min_supported_version`, force or warn,
roll back, and watch the adoption curve (§5.4). No artefact upload — a PWA
release is a deploy plus a manifest + SW cache-version bump.

### 6.5 Broadcasts (new)
§3.7 composer + delivery log + analytics. Must show the reach split —
push-reachable vs in-app-only, per platform (§3.5) — so a send is never judged
by open-rate alone.

### 6.6 Push Diagnostics (new)
Subscription health totals, dead-token reaping log, provider error rates by code,
per-message funnel, per-platform reach, "resend to undelivered only". The
per-platform reach number is also the input to the §11.2 channel decision.

### 6.7 Users & Access (extend existing `UsersTab.tsx`)
Staff role editor + permission matrix (§2.5), force-logout-all, per-user device
list, impersonation with audit.

### 6.8 Remote Config & Flags (new)
§4.4. Plus PWA manifest/asset editor (§4.5, §5.2).

### 6.9 Audit & Compliance (new)
Full audit log with filters, export, retention policy, GDPR delete requests.
The log already exists — it just has no surface.

### 6.10 Existing 16 tabs
Unchanged in behaviour, now permission-gated per tab. `AdminCmsView.tsx:30-49`
becomes a permission → tab map.

---

## 7. Data model summary

| Collection | Rows (today) | Rows (projected, 100k users) | Notes |
|---|---|---|---|
| `devices` | new | 150k | One per install, user_id nullable until claimed |
| `push_subscriptions` | new | 200k | Multiple per user |
| `notifications` | new | 2M | Broadcasts dominate |
| `notification_deliveries` | new | 5M+ | **Append-only, the real scale risk** |
| `notification_reads` | new | 3M+ | Replaces localStorage read state |
| `remote_config` | new | ~50 | |
| `releases` | new | ~200 | |
| `staff` | new | ~10 | |
| `users` | 26 | 100k | |
| `audit` | 48 | 1M+ | Already unbounded, already full-doc rewritten |

At 5M delivery rows the JSON store is over. This is the §8 argument, quantified.

---

## 8. Phase 6 — Storage & scale (must precede broadcast at volume)

Today: every write is read-modify-write of the full 3.2 MB `db.json`
(`store/index.ts:1-11`); the Cockroach replica is off by default
(`server.ts:219-227`) and holds one whole-document JSONB row (`db/migrate.ts:4-18`)
with no conflict resolution. Delivery logging would multiply write volume by
three to four orders of magnitude.

1. **PostgreSQL** — execute `schema.sql` for real (currently never run) and
   reconcile it against `db.ts` (role names conflict, `:12` vs `:85`).
2. **Object storage** — posters, PDFs, course thumbnails. Leave
   `backend/uploads/` for dev.
3. **Redis** — rate limits (currently per-process), queue, and `requirePermission`
   caching.
4. **Materialised rollups** — daily install / active / revenue aggregates.
   Analytics at `analytics.routes.ts:9-38` recomputes from raw data every request.
5. **Migration** — dual-write, verify counts, then cut over. JSON `db.json`
   becomes a dev seed fixture only.

---

## 9. Testing & verification

Existing suites: `backend/` → `npm test` (smoke, unit, security, regression,
e2e) and `npm run typecheck`; `frontend/` → `npm run typecheck`, `npm run lint`,
`node scripts/run-tests.mjs` (custom runner, not Jest). Note there is **no lint
script on the backend**.

New coverage required:
- Device claim/merge: anonymous → registered, multi-install single user.
- Push subscribe/unsubscribe/reap on 410.
- `requirePermission` matrix — every role × every dangerous route.
- Segment builder counts against a seeded fixture.
- Delivery worker: crash mid-batch resumes without double-send.
- Quiet hours + daily cap suppression at dispatch time.
- Forced-update gate: below `min_supported_version` is blocked server-side.
- VAPID payload shape and `notificationclick` routing.
- Audit row written for every admin mutation.

---

## 10. Delivery order

| Milestone | Contents | Depends on |
|---|---|---|
| M0 Security | §1 | — |
| M1 Foundation | §2 installs, push subs, prefs, releases, RBAC | M0 |
| M2 Store | §8 PostgreSQL + object storage | M1 |
| M3 Install & manifest | §4 install tracking, CTA, §5.1–5.3 desktop detect + manifest + install links, §4.3 version health | M1 |
| M4 Config & flags | §4.4 remote config, flags, maintenance mode, kill switches | M3 |
| M5 Push | §3 collections, worker, VAPID, SW handlers, bell merge | M2, M3 |
| M6 Console | §6 Command Center, Devices, Releases, Broadcasts, Audit | M4, M5 |
| M7 Scale | Redis queue, rollups, delivery sharding | M5 |

There is no separate desktop milestone — §5 is folded into M3 because a desktop
install is the same build with a different display mode.

M1 → M3 → M4 → M6 ships as a complete install-management story without touching
the notification system. M5 is the point of no return and should follow M2.

---

## 11. Decisions

### 11.1 PWA only — locked

No native mobile app (no React Native / Expo / Flutter / Capacitor), no native
desktop wrapper (no Electron / Tauri / NW.js). "Desktop app" = the PWA installed
via Chrome/Edge app mode or a shortcut. "Mobile app" = the PWA installed to the
home screen. One Next.js build, one `channel: 'web'`, one release, one device
registry, one push pipeline.

### 11.2 Polling now, WhatsApp later — locked

**Every notification this system ships today is user-triggered.** Look at the
twelve notices in `frontend/src/lib/notifications.ts:84-150`: payment sent,
payment rejected, payment failed, vault unlocked, report submitted, report
published, report rejected, XP earned. In all twelve the user acted first — they
paid, submitted, or finished a lesson — which means the app was open.

So the iOS push gap costs nothing for transactional notices. Polling (§3.6)
catches 100% of them at zero cost, because the user is already in the app.

Push is needed for exactly one thing: reaching a user who has **closed** the
app. Under PWA-only, Android/Chrome handles that over VAPID. iOS/Safari does
not, and cannot be fixed inside a PWA. That is the only gap.

**Therefore: build polling, skip WhatsApp now, decide WhatsApp later from
measurement.** Concretely:

- M5 ships polling + VAPID. No external channel dependency, no Meta business
  verification, no template approval, no per-message cost.
- The split is already instrumented (§3.5, §6.6): push-reachable vs in-app-only,
  per platform. That number is the decision input.
- **The trigger to build WhatsApp:** a specific named broadcast — "New Batch
  Launching", "App Offline Tonight" — where the measured push-reachable audience
  is under ~30%. Add the channel for that one campaign, not speculatively.

The thing that makes "later" safe rather than hand-waving: iOS install share is
unknown today and M3's install data will settle it. Building WhatsApp before
that number exists is optimising against a guess. And when the trigger fires,
WhatsApp Business API is genuinely the right channel — far better reach than
email, and the repo already has `qrcode` + a working UPI/payment flow to lean on.

### 11.3 Install QR in M3 — locked

Yes, ship the generator (§5.3) in the first release, because attribution is
**first-touch and therefore unrecoverable**. Any install that happens before M3
launches is permanently unattributed. It is roughly a day of work and it is the
only distribution channel for desktop and iOS, so it gates the growth number
rather than merely improving it.

Cheap variant that is good enough for v1: campaign params on real URLs plus a
QR generator. No token table, no landing-page redirect service.

