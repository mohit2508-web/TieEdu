# Multi-Module Cart + Combo Offers + "Complete Pack" Premium — Full Plan

Goals (user's words): premium module me "sab kuch" dikhe, multiple modules add-to-cart ho, offers/combo se bacha zyada buy kare.

## 1. Root cause analysis (Razorpay page)

| Symptom | Real cause |
|--------|-----------|
| Featured FREE shows "1 questions" | `mod-3-1` (free prep-guide) has only **1 item** in db.json |
| Premium me sirf "System Design" dikhta hai | Razorpay has only **2 modules**: 1 free + 1 premium (`mod-3-2` SD). Premium tab = data-driven; mobile demo kid sees one lonely card → "isme sab kuch kahan?" |
| Backend locks | `companies.routes.ts` sanitizes non-free-preview blocks when company not unlocked (server-authoritative). Unlock is **per-company** (`unlock.routes.ts`), any purchase → whole company opens. Content per module is already 7-section complete |

So the perception problems = **seed data too thin (Razorpay)** + **single-action cart (no module picking)** + **no combo ladder/offers**. Reader structure is already "sab kuch" (7 sections).

## 2. Pricing ladder (server-authoritative, drives combo buying)

Anchor to existing ₹249 Complete Pack so nothing regresses:

| Items bought (unique premium modules for one company) | Price | Message | Save |
|----|----|----|----|
| 1 module (round pack) | ₹99 | "Is round ko chahiye?" | – |
| 2 modules | ₹169 | "Do rounds combo" | ₹29 |
| 3 modules | ₹219 | "3 rounds mehnga?" | ₹78 |
| **All 4 rounds = Complete Pack** | **₹249** | **Best Value — sab kuch** | **₹147** |

Psychologie: har add par savings badhti hai, aur "Complete 4-Round Pack ₹249" hamesha best deal dikhta hai → kid buys Complete Pack. Coupons (TIEEDU20/FIRST50) extra on top.

## 3. Module-scoped cart (multi-add)

- Cart items become: `CartLineItem = Company | PricingPlan | CompanyModuleItem`
  `CompanyModuleItem = { kind:'company', id: companyId, slug, name: companyName, logo_url, module_id, module_title, round_type, price:99 }`
- Each premium card "Add to Cart — ₹99" (NOT direct unlock) → multiple modules from same company addable.
- "Complete Pack ₹249" banner → adds all 4 round modules at pack price (single line item).
- Remove per-line works already.
- Grant stays **per-company** (`/checkout/complete` today) → koi bhi purchase = poora premium pack khul jata hai ("sab kuch"). Module ids are just how the pack is sold/discounted.

## 4. Combo engine — backend (`checkout.routes.ts`)

- `packSubtotal(moduleItems: {module_id}[])`: unique module count per company → ladder price above. Used for subtotal + savings line (vs ₹99×n).
- `create-order`:
  - extend `CartItem` with `module_id`, `module_title`, `round_type`.
  - compute `base = Σ packSubtotal per company`, `subtotal`, coupon discount (existing), total.
  - persist order with module ids.
- `complete`: unchanged grant + return `granted_company_ids` in response (frontend sets unlocked state from it).
- Order already persists → demo keeps working with zero upfront real gateway.

## 5. Frontend changes

### 5.1 `backend/data/db.json` (seed enrichment — THE fix for "sirf System Design")
- Razorpay (`comp-3`): bump free `mod-3-1` to 3 items; add 3 premium round modules, each with full 7-section `section_data` + 2-3 items:
  - `mod-3-3` OA/Technical `.dsa_question` — "DSA Topic-Wise: OA Patterns & Core CS"
  - `mod-3-4` Technical `.technical_question` — "Technical R1: Concurrency, DB & Networks"
  - `mod-3-5` HR `.hr_question` — "HR & Behavioral STAR Pack"
  - all `is_premium: true, price 99-ish` (price field cosmetic; ladder controls billing).
- Verify other companies already have full 4-round sets (Palo Alto does; only Razorpay thin).

### 5.2 `frontend/src/types/index.ts`
- Add `CompanyModuleItem` cart type (fields above).

### 5.3 `frontend/src/pages/company/[slug].tsx`
- State: `cartItems: (Company | PricingPlan | CompanyModuleItem)[]`.
- New handlers:
  - `handleAddModuleToCart(module)` — push module line item, open cart.
  - `handleAddCompletePack()` — push one Complete Pack line item (lists all 4 ids), open cart. Hero/sticky "Unlock ₹249" → this.
- Pass to PremiumModuleCard: `onAddToCart` (module) instead of generic unlock → `setSelectedModule` preview stays.
- Pass `companyModules` + `onAddModules` + `onUpgradeCompletePack` to CartModal for combo helper.

### 5.4 `frontend/src/components/company/PremiumModuleCard.tsx`
- Primary CTA: **"Add to Cart — ₹99"** (amber, single add). Preview ghost stays. Keep price ₹99 / strike ₹149 display + "Round" chip + N questions.
- (Multiple adds allowed — cart accumulates.)

### 5.5 NEW `frontend/src/components/company/CompletePackBanner.tsx`
- Big gradient banner above premium grid: "Complete {company} Pack — All 4 Rounds — ₹249" + 4 round chips + "₹99 × 4 = ₹396 → sirf ₹249 (37% off)" + emerald CTA "Add Complete Pack to Cart". Cross-sell lever = combo psychology.

### 5.6 `frontend/src/components/checkout/CartModal.tsx`
- Render module line items: company logo + `companyName · module_title` + round chip + ₹99; Complete-Pack line shows "All 4 Rounds Pack".
- Totals: Subtotal (ladder), "**Pack savings** −₹X" line (Σ singles − ladder), Coupon discount line (existing), Total Payable.
- **"Complete your combo" helper**: if 1-3 modules in cart, show missing round chips; button "Add to Complete Pack & save ₹Y" (calls onAddModules) / "Upgrade to Complete Pack ₹249".
- Cross-sell mini-row: "Popular: {other company} Complete Pack" → onAddCompany (import passed callback) — impulse bundle buying.
- Keep success → `onCheckoutSuccess(grantedCompanyIds)`.

### 5.7 `frontend/src/components/company/CompanyModuleReader.tsx`
- Add "Pack Rounds" nav links in sidebar (only when `isUnlocked` and company has >1 premium module): OA/Technical/SystemDesign/HR chips that jump (`onSwitchModule(module)`) without going back. → "module ke andar sab kuch / ek hi jagah sab rounds".
- Needs new optional props `allModules`, `onSwitchModule`.

### 5.8 `frontend/src/lib/api.ts`
- `createOrderApi` items now carry `company_id, slug, name, logo_url, module_id, module_title, round_type, price`; Complete-Pack item: `module_ids: string[]`.
- `completeOrderApi` returns granted ids.

## 6. Offer/CTA dedup after change
1. Hero: **Unlock Complete Pack — ₹249** (adds Complete Pack to cart) → primary.
2. CompletePackBanner: **Add Complete Pack — ₹249**.
3. Premium card: **Add to Cart — ₹99** (module) + Preview ghost.
4. Sticky bottom (locked): **Complete Pack — ₹249**.
5. Cart: Pay + combo helper + cross-sell.
= 5 purposeful CTAs, combo ladder always present.

## 7. Verification
- `npx tsc --noEmit` clean; `npm run build` clean (9 routes).
- Restart backend if needed (ts-node-dev auto-respawns on file save).
- Manual `/company/razorpay`: featured free shows 3 questions + 7 chips; premium = Complete Pack banner + 4 round cards; add 1module → cart ₹99 + "add to complete pack save ₹147" helper; buy Complete Pack ₹249 → company unlocks, reader sidebar shows all 4 pack rounds → click OA → OA module opens (sab kuch ek jagah).

## 8. Step order
A. Seed: Razorpay modules + item bump (db.json).
B. Types + api.ts (module items).
C. Backend: checkout ladder + module ids + complete returns granted ids.
D. [slug].tsx handlers + PremiumModuleCard CTA change.
E. CompletePackBanner (new).
F. CartModal: module lines + pack savings + combo helper + cross-sell.
G. Reader pack-round nav.
H. tsc + build + manual QA.