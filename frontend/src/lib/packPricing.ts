import { CartItem, Company, PricingPlan, CompanyModuleItem } from '@/types';

export const SINGLE_MODULE_PRICE = 99;
export const COMPLETE_PACK_PRICE = 249;
const PACK_LADDER: Record<number, number> = { 1: 99, 2: 169, 3: 219 };

export const packPrice = (n: number): number => {
  if (n >= 4) return COMPLETE_PACK_PRICE;
  return PACK_LADDER[n] ?? n * SINGLE_MODULE_PRICE;
};

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

  for (const it of items) {
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
  let listTotal = planTotal;
  let moduleCount = 0;
  for (const c of perCompany.values()) {
    // A plain company line (no module ids) = every round; array pack lines =
    // exactly the modules listed (e.g. "finish your pack" with 2 left → ₹169).
    const n = c.isComplete && c.moduleIds.size === 0 ? 4 : c.moduleIds.size;
    subtotal += packPrice(n);
    listTotal += n * SINGLE_MODULE_PRICE;
    moduleCount += n;
  }
  subtotal += planTotal;

  return { subtotal, listTotal, savingsTotal: Math.max(0, listTotal - subtotal), moduleCount };
};

export const isCompanyItem = (i: CartItem): i is Company | CompanyModuleItem => 'slug' in i;
export const isModuleItem = (i: CartItem): i is CompanyModuleItem => 'module_id' in i || 'module_ids' in i;