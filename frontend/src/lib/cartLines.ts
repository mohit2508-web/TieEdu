/**
 * CART LINE RULES — pure, no React.
 *
 * These are pricing rules, and pricing rules are the one thing in a React
 * codebase you can actually prove correct. They used to be spread across
 * `company/[slug].tsx`, `compare.tsx` and `courses/[slug].tsx`, each with its own
 * idea of what counts as "the same line", which is how a student ended up able
 * to add a Complete Pack on `/compare` and a round it already contained from a
 * vault and be billed for the round twice.
 *
 * They live in a plain `.ts` module, not in `CartContext.tsx`, for two reasons:
 * the context is the React glue and this is the rulebook, and the unit runner
 * emits with `jsx: "preserve"`, so a suite cannot import a `.tsx` file at all.
 */

import type { CartItem, Company, CompanyModuleItem } from '@/types';

/**
 * Is this line a company vault line (a pack or a single round)?
 *
 * `CartItem` is a union, and the company shapes are the awkward pair: a bare
 * `Company` carries no `kind` at all, while a `CompanyModuleItem` carries
 * `kind: 'company'`. A `CourseCartItem` also has a `slug`, so anything testing
 * `'slug' in item` to mean "a company is in the cart" also matches a free course
 * added from `/interview-course`.
 */
export const isCompanyCartLine = (item: CartItem): item is Company | CompanyModuleItem => {
  if ('kind' in item) return item.kind === 'company';
  return 'slug' in item;
};

/**
 * Which content modules a cart line covers.
 *
 * The three company shapes spell this three different ways — `module_ids` for a
 * pack, `module_id` for a single round, `premium_module_ids` for a bare
 * `Company` — and every caller wants the same answer: "is this round already in
 * the cart?" Normalising once here is why the pages no longer each guess.
 */
export const cartLineModuleIds = (item: CartItem): string[] => {
  if ('module_ids' in item && Array.isArray(item.module_ids)) return item.module_ids;
  if ('module_id' in item && typeof item.module_id === 'string') return [item.module_id];
  if ('premium_module_ids' in item && Array.isArray(item.premium_module_ids)) return item.premium_module_ids;
  return [];
};

const singleModuleIdOf = (item: CartItem): string | null => {
  if ('module_id' in item && typeof item.module_id === 'string') return item.module_id;
  return null;
};

/**
 * Identity of a cart line.
 *
 * The compare page used to guard its own additions with
 * `prev.some(i => i.id === c.id)`, which collapsed a company line and a
 * single-round line for the same company into one — the second add silently
 * vanished. Keying on the covered module set means "round 2 of Razorpay" and
 * "round 1 of Razorpay" are two different lines, which is what the pack ladder
 * expects, while a line covering no modules at all (a plan, a course) falls back
 * to its own id.
 */
const lineKey = (item: CartItem): string => {
  const anyItem = item as unknown as Record<string, unknown>;
  const kind = typeof anyItem.kind === 'string' ? anyItem.kind : 'plan';
  const id = String(anyItem.id ?? anyItem.scope ?? '');
  const covered = cartLineModuleIds(item).slice().sort();
  return `${kind}:${id}:${covered.join('+') || 'all'}`;
};

/**
 * Drop single-round lines that a pack in the same cart already covers.
 *
 * The pack must be for the same company: round 1 of Razorpay and round 1 of
 * Zerodha are different products that happen to share a round number.
 */
export const dropCoveredSingles = (items: CartItem[]): CartItem[] => {
  const packs = items.filter((item) => {
    const anyItem = item as unknown as Record<string, unknown>;
    return Array.isArray(anyItem.module_ids) && (anyItem.module_ids as string[]).length > 0;
  });
  if (packs.length === 0) return items;
  return items.filter((item) => {
    const single = singleModuleIdOf(item);
    if (!single) return true;
    const companyId = (item as unknown as Record<string, unknown>).id;
    return !packs.some((pack) => {
      const packAny = pack as unknown as Record<string, unknown>;
      return (
        packAny.id === companyId &&
        (packAny.module_ids as string[]).includes(single)
      );
    });
  });
};

export const isStorableItem = (item: unknown): item is CartItem =>
  Boolean(item) && typeof item === 'object' && ('id' in (item as object) || 'scope' in (item as object));

/**
 * Fold new lines into an existing cart.
 *
 * The single place lines are combined, which is what makes the pack-supersedes-
 * single rule hold no matter which page the student clicked on.
 */
export const mergeCartItems = (existing: CartItem[], incoming: CartItem[]): CartItem[] => {
  const merged = [...existing];
  for (const item of incoming) {
    if (!isStorableItem(item)) continue;
    const key = lineKey(item);
    const at = merged.findIndex((i) => lineKey(i) === key);
    // Re-adding an identical line refreshes it rather than duplicating it — a
    // price shown on the vault may have changed since the first add.
    if (at >= 0) merged[at] = item;
    else merged.push(item);
  }
  return dropCoveredSingles(merged);
};
