# TieEdu — Platform & Admin Scale-Up Plan (v1)

Goal: TieEdu ko ek **premium, unique, production-grade education platform** banana — proper login/signup (alag user portal + admin portal), honest real metrics (koi fake number nahi), asaan admin management, aur storage/payments layer jo **future me scale** kar sake.

---

## 0. Current State Audit (kya fake hai / kya real hai)

| Area | Abhi ka haal | Verdict |
|---|---|---|
| `unlock_count` (1420, 1180, 2150…) | Static seeded numbers in db.json, sirf mock payment par +1 | **FAKE** → real computed |
| `trust_stats` (rating, weekly_unlocks, rating_count) | Static hardcoded | **FAKE** → real ya sample-labelled |
| `analytics.routes.ts` | "14.8% conversion", "99.9% HMAC", "12,480 req/day", fake redis/pgbouncer claims | **FAKE** → rewrite w/ real computed metrics |
| `/api/health` | Claims "database: CockroachDB Cloud" | **FAKE** → honest (local/PDB state) |
| `leaderboard` | Static (Aarav, Ananya…) | **FAKE** → real from persisted XP |
| `comments_count` / `upvotes_count` | Static per-item numbers | **FAKE** → real counters ya remove |
| Orders | `db.orders` persisted on mock gateway | Real-ish (gateway mock) |
| Unlocks | `db.unlocks` persisted | Real |
| Coupons | Persisted, usage tracked, validated server-side | Real |
| Pricing ladder | Server-authoritative (99/169/219/249) | Real |
| PDF library | Admin-upload, lock server-side, view-only viewer | Real |
| `gamification` / `progress` | In-memory `userProgressStore` | **Not persisted** → make real in DB |
| Frontend `api.ts` | Fallback to `mockCompanies`/`mockPricingPlans` | **DUMMY** → gate behind `NEXT_PUBLIC_MOCK=1` |
| Auth | Koi nahi — admin APIs khule hue | **BYPASS** → full auth |
| `migrate.ts` | CockroachDB attempt + graceful JSON fallback | Real scale plumbing — evolve into storage layer |

---

## Phase D — Premium Design System & UX (light, unique)

Dir: `frontend/` — global CSS tokens + surface revamp. **Light hi rahega**, premium feel.

- **Design tokens** (`globals.css`):
  - Palette: base `#FAFAF8` warm white, ink `#0E141B`, primary sky `#0284C7→#0B6FB8`, accent amber `#E8A33D`, surface white/gray-50, hairline borders `#E7E5E0`.
  - Radii scale, soft layered shadows (`0 1px 2px`, `0 8px 24px`, `0 24px 60px`), motion (fade/slide, 150–250ms, ease-out).
  - Typography: Calibre stack hero, defined h1–h6 scale + tracking, tighter json numerals.
- **Identity**: "Vault OS" — glassy sticky navbar, gradient-mesh hero panel, numbered vault cards, editorial section labels, cohesive buttons (primary solid / soft / ghost), focus rings, hover lift.
- **Surfaces to revamp** (consistent tokens, no per-file one-off):
  - `Navbar` (sign-in entry, profile chip), `Hero`, `CompanyCard` grid, `Compare`, `StudyPlan`, `InterviewCourse`, `Campus`.
  - `Company/[slug]` masthead + module cards + `CompanyModuleReader` (keep reading UX, polish spacing/typography/watermark bar).
  - `CartModal`, `TrustBadgeBar`, `RelatedVaults`, footers, toasts.
- **New auth/admin surfaces styled by same tokens** (Phase A/Ad).
- Accessibility: contrast AA, focus-visible, semantic nav, reduced-motion respect.

Deliverable: koi bhi page ab "simple default website" nahi lagega; alag premium identity milegi.

---

## Phase A — Real Auth (users, roles, JWT, secure)

Backend (`backend/src`):
- **Deps**: `bcryptjs`, `jsonwebtoken`, `cookie-parser` (+ types).
- **Data model** (`db.json` → `users[]`, `sessions[]` kept optional):
  ```
  users: { id, name, email(lower), password_hash(bcrypt 12), role: 'user'|'admin',
           xp, streak, college, badge, avatar?, created_at }
  ```
  Admin seed from `ADMIN_EMAIL/ADMIN_PASSWORD` env on first boot.
- **`auth.routes.ts`** (`/api/auth`):
  - `POST /signup` → create user (role locked to `user`), auto-login.
  - `POST /login` → verify, issue **JWT access (15m)** + **refresh (7d)**.
  - `POST /refresh` / `POST /logout` (revoke).
  - `GET /me` → profile (+ unlocks, orders summary).
  - `POST /change-password`.
  - Refresh token = httpOnly, `Secure`, `SameSite=Lax` cookie; access token = `Authorization: Bearer`. Refresh rotation + reuse detection (scale-ready).
- **Middleware**: `requireAuth`, `requireAdmin` in `backend/src/middleware/auth.ts`.
- **Protect everything admin**: `/api/admin/*`, PDF upload/delete, coupon create/delete, report moderation. **401/403** otherwise.
- **Security**: login/signup rate-limit (in-memory burst → Redis at scale), bcrypt cost 12, `helmet` headers (`helmet` dep), JWT secret from env, input validation (email/password strength), generic login errors (no user enumeration).
- All public GET content routes stay open (SEO-friendly); checkout writes `user_id` from session (no more `'default-user'`).

Frontend:
- Pages: `/signup`, `/login`, `/admin/login` (alag portal entry, same engine).
- `AuthContext` (`useAuth`): user, loading, `login/signup/logout/refresh`, token attach.
- Guards: `<RequireAuth/>` (→ /login), `<RequireAdmin/>` (→ /admin/login).
- Navbar: "Sign in" → profile menu (Dashboard, Logout).

---

## Phase S — Student Portal (`/account`)

Protected dashboard. Dark-nahi, same light premium tokens.
- **Overview**: profile card (name, college, streak, XP), active unlocks chips (companies open), quick stats (pack bought, reports submitted).
- **My Orders**: real orders (`user_id` match), status, amount, coupon, date; empty state.
- **My Vault**: list of unlocked companies → deep-link `/[slug]`.
- **My Progress**: persisted progress (Phase R) — modules completed, XP timeline.
- **My Reports**: submitted interview reports + review status (`pending_review/published/rejected`).
- Settings: change password, logout. `reader`/PDF viewer ab session `user_id` use karega.

---

## Phase Ad — Admin Portal (redesigned + real KPIs)

`/admin` → full protected **app-shell dashboard** (light sidebar + topbar): *sea of one-time hardcoded panels → structured portal*.

Sections (each a tab):
1. **Overview/Dashboard**: real KPI grid — Total revenue (paid orders), orders (paid/created/failed), avg order value, active users, unlocks granted, coupon revenue. Mini chart: revenue by day (last 14 days, from `orders.paid_at`). Top companies by revenue. No fake % anywhere.
2. **Orders**: table (id, user, items, coupon, discount, amount, status, paid_at) + filter/status + export CSV.
3. **Companies / Vault**: existing ContentBuilder CRUD + PDF manager + reports moderation queue (approve/reject published reports) — re-skinned.
4. **Coupons**: list/create/edit/toggle/delete, real usage vs max_uses.
5. **Users**: list (search, role chip, disable), view profile/unlocks.
6. **Reports moderation**: pending queue inline approve/reject (+ salary fields).
7. **Analytics**: honest metrics page (real computed) — revenue, orders, unlocks, conversion over time, per-company breakouts, coupon usage.
8. **Settings**: platform name/contact, `demo_mode` toggle, storage backend status, payment mode.

All admin APIs → `requireAdmin` server-side + client guard.

---

## Phase R — Anti-Fakery & Real Metrics (sab real)

- **`analytics.routes.ts` rewrite**: real computed stats only — revenue, order counts, conversion (paid/created), unlocks, active users, per-company sales; remove fake redis/pgbouncer/throughput claims. `/api/analytics/summary` (dashboard) + `/api/analytics/revenue-series` (chart).
- **`unlock_count`** semantics: drop static seeds → compute from `unlocks[]` (unique per company). Keep field but always derived. Same for `trust_stats` → compute from real reports/orders or visibly mark as "sample" in `demo_mode`.
- **Leaderboard** → real: XP from persisted `users.xp` (gamification mutations write through). `progress`/`gamification` move from in-memory stores to `db.json` (persist layer) so koi bhi data restart par nahi udta.
- **Frontend mock fallback:** removal or behind `NEXT_PUBLIC_MOCK=1` (default off). Out-of-box = backend only.
- **`/health`**: honest JSON — storage (json/pg), uptime, env mode. Remove "CockroachDB Cloud" claim unless actually connected.
- **Audit log** (`audit[]`): admin actions + order state changes logged (who/when/what) — transparency + scale.

---

## Phase P — Pluggable Payment Gateway (real-ready)

- `backend/src/payments/` — gateway interface:
  - `MockGateway` (dev only, env `PAYMENT_MODE=mock`) — current behavior but orders still real + audit.
  - `RazorpayGateway` (env `PAYMENT_MODE=razorpay`, needs `RZP_KEY_ID/SECRET`) — real order creation via SDK, `POST /api/payments/verify` (server-side signature check), webhook `razorpay_webhooks.routes.ts` with HMAC verify + idempotency, refund route.
- Checkout keeps server-authoritative ladder pricing; now ties `user_id` (auth) + emits order events to audit.
- Analytics are identical/real either mode — gateway transparent.

---

## Phase O — Scale / Ops Hardening

- **Storage abstraction** `backend/src/storage/`:
  - `IStore` interface (load/save + typed accessors).
  - `JsonStorage` (current, atomic write w/ lock) — default.
  - `PgStorage` — build on existing `pg` + `migrate.ts` path (companies/orders/unlocks/users/coupons tables, migrations, indexes) so jab CockroachDB/Postgres chahiye, sirf env flip.
- **Config** via env (.env.example), typed `config.ts`. 
- **Logging**: structured request log (id, method, path, status, ms); error middleware; request-id header.
- **Rate limiting** service (in-memory now / Redis adapter interface later).
- **Backups**: JSON snapshot job + `pg_dump` note; `npm run backup`.
- **Health/readiness** endpooints honest.
- Seed script idempotent; migrations tracked; CI-ready (tsc + build both apps).

---

## Delivery Order (recommended)

1. **Phase D** — design system + UI/UX revamp (sabse pehle, user ko premium feel mile).
2. **Phase A** — auth backend + protect admin + seed admin.
3. **Phase A-frontend** — login/signup/admin-login pages + guards + Navbar.
4. **Phase S** — student account portal.
5. **Phase R** — real metrics + persist progress/gamification + remove mock fallback + honest health.
6. **Phase Ad** — admin dashboard redesign + real KPIs + reports moderation + orders/users UI.
7. **Phase P** — payment gateway abstraction (mock default, Razorpay real-ready).
8. **Phase O** — storage interface + Pg adapter + ops hardening + backup.

Har phase end par: backend `tsc`, frontend `tsc` + `next build`, API smoke test, manual QA. Har phase user ko summary (Hinglish) + kya-badla dekhaya jayega.