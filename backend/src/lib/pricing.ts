/**
 * SINGLE SOURCE OF TRUTH for every rupee the customer is ever charged.
 *
 * The product sells a per-company "pack ladder": the price depends only on HOW MANY
 * distinct premium round modules of ONE company end up in the cart. There is no
 * per-module price — a module's `price` field in the DB is cosmetic and is never billed.
 *
 *   1 round  -> ₹99
 *   2 rounds -> ₹169
 *   3 rounds -> ₹219
 *   4+ rounds-> ₹249  (Complete Pack)
 *
 * Any purchase unlocks the WHOLE company vault (see payments/orders.ts), so the ladder
 * is purely a discounting device — never a partial-access promise.
 *
 * Nothing else in the codebase may hardcode 99/169/219/249. Display code must read these
 * values (or the /api/pricing/catalog response) so the shown price is always the charged price.
 */

export const SINGLE_MODULE_PRICE = 99;
export const COMPLETE_PACK_PRICE = 249;
export const COMPLETE_PACK_COUNT = 4;

/** Rung price for an exact number of distinct modules. Anything >= 4 is the Complete Pack. */
const PACK_LADDER: Record<number, number> = { 1: 99, 2: 169, 3: 219 };

/** The ladder as an ordered list — used by the public pricing page to render the real table. */
export const PACK_LADDER_TABLE: ReadonlyArray<{ module_count: number; price: number }> = [
  { module_count: 1, price: PACK_LADDER[1] },
  { module_count: 2, price: PACK_LADDER[2] },
  { module_count: 3, price: PACK_LADDER[3] },
  { module_count: COMPLETE_PACK_COUNT, price: COMPLETE_PACK_PRICE },
];

/** Price for `uniqueModuleCount` distinct premium modules of a single company. */
export function packPrice(uniqueModuleCount: number): number {
  if (!Number.isFinite(uniqueModuleCount) || uniqueModuleCount <= 0) return 0;
  if (uniqueModuleCount >= COMPLETE_PACK_COUNT) return COMPLETE_PACK_PRICE;
  return PACK_LADDER[uniqueModuleCount] ?? uniqueModuleCount * SINGLE_MODULE_PRICE;
}

/**
 * The undiscounted "list" value of N modules (N × ₹99). This is the ONLY legitimate MRP:
 * it is what the identical modules would cost bought separately. Never inflate it.
 */
export function listPriceFor(moduleCount: number): number {
  return Math.max(0, moduleCount) * SINGLE_MODULE_PRICE;
}

/** Genuine saving vs. buying the same modules separately. */
export function savingsFor(moduleCount: number): number {
  return Math.max(0, listPriceFor(moduleCount) - packPrice(moduleCount));
}

/** Whole-percent saving, or 0 when there is no saving (never show "0% OFF"). */
export function savingsPercent(moduleCount: number): number {
  const list = listPriceFor(moduleCount);
  if (list <= 0) return 0;
  return Math.round((savingsFor(moduleCount) / list) * 100);
}

export interface CatalogModule {
  id: string;
  title: string;
  round_type: string | null;
  module_type: string | null;
  item_count: number;
  has_pdf: boolean;
  /** Price if this module is bought entirely on its own. */
  price: number;
}

export interface CatalogCompany {
  id: string;
  slug: string;
  name: string;
  logo_url: string;
  industry: string | null;
  premium_count: number;
  modules: CatalogModule[];
  /** Price for the whole company's premium pack at its real size. */
  pack_price: number;
  list_total: number;
  savings: number;
  savings_percent: number;
  is_unlocked: boolean;
  owned_module_count: number;
}

export interface PricingCatalog {
  currency: 'INR';
  single_module_price: number;
  complete_pack_price: number;
  complete_pack_count: number;
  ladder: ReadonlyArray<{ module_count: number; price: number }>;
  companies: CatalogCompany[];
}

/**
 * Builds the public, price-honest catalog. Every rupee here comes from packPrice() —
 * the same function checkout uses to charge — so a card can never advertise a price
 * the server would not accept.
 *
 * @param ownedModuleIds module ids the requesting user already owns
 * @param unlockedCompanyIds company ids the requesting user has fully unlocked
 */
export function buildPricingCatalog(
  companies: any[],
  ownedModuleIds: string[] = [],
  unlockedCompanyIds: string[] = [],
  isAdmin = false
): PricingCatalog {
  const owned = new Set(ownedModuleIds);
  const unlocked = new Set(unlockedCompanyIds);

  const rows: CatalogCompany[] = [];

  for (const company of companies || []) {
    if (company?.status === 'draft') continue;

    const premium = (company.modules || []).filter((m: any) => m?.is_premium);
    if (premium.length === 0) continue; // nothing purchasable — never advertise a price

    const companyUnlocked =
      isAdmin || company.is_unlocked === true || unlocked.has(company.id);
    const ownedHere = premium.filter((m: any) => owned.has(m.id)).map((m: any) => m.id);
    const ownsEvery = premium.every((m: any) => owned.has(m.id));
    const remaining = companyUnlocked || ownsEvery ? 0 : premium.length - ownedHere.length;

    rows.push({
      id: company.id,
      slug: company.slug,
      name: company.name,
      logo_url: company.logo_url || '',
      industry: company.industry || null,
      premium_count: premium.length,
      modules: premium.map((m: any) => ({
        id: m.id,
        title: m.title,
        round_type: m.round_type || null,
        module_type: m.module_type || null,
        item_count: (m.items || []).length,
        has_pdf: !!m.pdf,
        price: SINGLE_MODULE_PRICE,
      })),
      pack_price: packPrice(remaining),
      list_total: listPriceFor(remaining),
      savings: savingsFor(remaining),
      savings_percent: savingsPercent(remaining),
      is_unlocked: companyUnlocked || ownsEvery,
      owned_module_count: ownedHere.length,
    });
  }

  // Companies with more to sell first, then alphabetical — stable and honest ordering.
  rows.sort((a, b) => b.premium_count - a.premium_count || a.name.localeCompare(b.name));

  return {
    currency: 'INR',
    single_module_price: SINGLE_MODULE_PRICE,
    complete_pack_price: COMPLETE_PACK_PRICE,
    complete_pack_count: COMPLETE_PACK_COUNT,
    ladder: PACK_LADDER_TABLE,
    companies: rows,
  };
}
