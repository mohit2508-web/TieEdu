import { CartItem, Company, PricingPlan, CompanyModuleItem, CourseCartItem } from '@/types';

/**
 * CLIENT MIRROR of the server pack ladder (backend/src/lib/pricing.ts).
 *
 * The server is authoritative: create-order recomputes every price with the same
 * packPrice() and ignores whatever the browser sends. These constants exist only so
 * cart/company UI can render a price instantly and offline. If you change a number
 * here you MUST change backend/src/lib/pricing.ts in the same commit, otherwise the
 * cart will display a different amount than the gateway charges.
 *
 * The public /pricing page does not use these at all — it renders GET /api/pricing/catalog.
 */
export const SINGLE_MODULE_PRICE = 99;
export const COMPLETE_PACK_PRICE = 249;
export const COMPLETE_PACK_COUNT = 4;
const PACK_LADDER: Record<number, number> = { 1: 99, 2: 169, 3: 219 };

export const packPrice = (n: number): number => {
  if (n <= 0) return 0;
  if (n >= COMPLETE_PACK_COUNT) return COMPLETE_PACK_PRICE;
  return PACK_LADDER[n] ?? n * SINGLE_MODULE_PRICE;
};

/** The honest undiscounted value of N modules bought separately (N x Rs 99). */
export const listPrice = (n: number): number => Math.max(0, n) * SINGLE_MODULE_PRICE;

/** Genuine saving vs buying separately — 0 when there is none (never show "0% OFF"). */
export const savingsFor = (n: number): number => Math.max(0, listPrice(n) - packPrice(n));

export const savingsPercent = (n: number): number => {
  const list = listPrice(n);
  return list > 0 ? Math.round((savingsFor(n) / list) * 100) : 0;
};

/** Human label for a pack size, used instead of claiming "4 rounds" on smaller vaults. */
export const packSizeLabel = (n: number): string =>
  n >= COMPLETE_PACK_COUNT ? 'Complete Pack' : n === 1 ? 'Single Round' : `${n}-Round Pack`;

export interface PackSummary {
  subtotal: number;
  listTotal: number;
  savingsTotal: number;
  moduleCount: number;
}

/**
 * Client mirror of the backend combo ladder. Used only for display so the
 * cart always shows the same price the server will charge.
 */
export const summarizePackItems = (items: CartItem[]): PackSummary => {
  const perCompany = new Map<string, { name: string; moduleIds: Set<string>; isComplete: boolean }>();
  let planTotal = 0;
  let courseTotal = 0;

  for (const it of items) {
    // Courses are priced from their own catalogue price, not the module ladder.
    // They must be checked BEFORE the module branch below, which would otherwise
    // read the course id as a company id and invent a pack price for it.
    if (isCourseItem(it)) {
      courseTotal += (it as CourseCartItem).price || 0;
      continue;
    }
    if ('scope' in it && 'billing_cycle' in it) {
      planTotal += (it as PricingPlan).price || 0;
      continue;
    }
    const mi = it as CompanyModuleItem;
    const c = perCompany.get(mi.id) || perCompany.set(mi.id, { name: mi.name, moduleIds: new Set(), isComplete: false }).get(mi.id)!;
    if (Array.isArray(mi.module_ids) && mi.module_ids.length > 0) {
      mi.module_ids.forEach((m) => c.moduleIds.add(m));
      c.isComplete = true;
    } else if (mi.module_id) {
      c.moduleIds.add(mi.module_id);
    } else {
      c.isComplete = true; // legacy plain-company line
    }
  }

  let subtotal = 0;
  // A course has no "list price vs pack price" gap, so it enters both totals at
  // the same figure and never inflates the advertised savings.
  let listTotal = planTotal + courseTotal;
  let moduleCount = 0;
  for (const c of perCompany.values()) {
    // A plain company line (no module ids) = every round; array pack lines =
    // exactly the modules listed (e.g. "finish your pack" with 2 left -> Rs 169).
    const n = c.isComplete && c.moduleIds.size === 0 ? COMPLETE_PACK_COUNT : c.moduleIds.size;
    subtotal += packPrice(n);
    listTotal += listPrice(n);
    moduleCount += n;
  }
  subtotal += planTotal + courseTotal;

  return { subtotal, listTotal, savingsTotal: Math.max(0, listTotal - subtotal), moduleCount };
};

export const isCompanyItem = (i: CartItem): i is Company | CompanyModuleItem => 'slug' in i;
export const isModuleItem = (i: CartItem): i is CompanyModuleItem => 'module_id' in i || 'module_ids' in i;
/**
 * Distinguishing a course from a company line by `slug` alone is impossible —
 * both carry one — so the explicit `kind` tag is what makes this safe.
 */
export const isCourseItem = (i: CartItem): i is CourseCartItem => (i as CourseCartItem).kind === 'course';
