// Shared payment-completion helpers (checkout AND webhook paths use these).
// The audit ledger moved to lib/audit.ts: it was never payment-specific — checkout,
// webhooks, admin, study-plan, the course editor and the device routes all wrote
// to it — and keeping the only writer of a shared ledger inside payments/orders
// is what let three other shapes grow alongside it.

import { pushAudit } from '../lib/audit';

export function completePaidOrder(db: any, order: any, user_id: string) {
  order.status = 'paid';
  order.paid_at = order.paid_at || new Date().toISOString();

  if (order.coupon_code) {
    const coupon = (db.coupons || []).find((c: any) => c.code === order.coupon_code);
    if (coupon) coupon.uses = (coupon.uses || 0) + 1;
  }

  if (!db.unlocks) db.unlocks = [];
  (order.items || [])
    .filter((it: any) => it.kind === 'company')
    .forEach((it: any) => {
      if (!db.unlocks.some((u: any) => u.user_id === user_id && u.company_id === it.id)) {
        db.unlocks.push({
          id: `unlock-${Date.now()}-${it.id}`,
          user_id,
          company_id: it.id,
          category: 'single_company',
          status: 'active',
          unlocked_at: new Date().toISOString()
        });
      }
      const company = db.companies.find((c: any) => c.id === it.id);
      if (company) company.unlock_count = (company.unlock_count || 0) + 1;
    });

  pushAudit(db, {
    actor: user_id,
    action: 'order.paid',
    detail: `Order ${order.id} marked paid via ${order.gateway || 'upi'}`,
    order_id: order.id,
    gateway: order.gateway || 'upi',
  });

  return order;
}
export function unlockedCompanyIds(db: any, user_id: string): string[] {
  return (db.unlocks || [])
    .filter((u: any) => u.user_id === user_id && u.status === 'active')
    .map((u: any) => u.company_id);
}

/**
 * Which course ids a user actually owns.
 *
 * A course line is `{ kind: 'course', id: <course_id> }` on a paid order. There
 * is no expiry and no partial access: one paid line grants the course for good,
 * and progress already written against it is never touched.
 *
 * This is the same shape as `ownedModuleIdsFor` and for the same reason — the
 * course router must be able to ask "may this person open this?" as a pure
 * lookup rather than re-walking the order history at every call site.
 */
export function ownedCourseIdsFor(db: any, user_id: string): string[] {
  const owned = new Set<string>();
  for (const o of db.orders || []) {
    if (o.user_id !== user_id || o.status !== 'paid') continue;
    for (const it of o.items || []) {
      if (it?.kind !== 'course') continue;
      const id = it.course_id || it.id;
      if (typeof id === 'string' && id) owned.add(id);
    }
  }
  return Array.from(owned);
}

// Which premium module ids a user actually owns (from paid orders + full-company
// unlocks). Every module inside an owned company unlock is also owned.
export function ownedModuleIdsFor(db: any, user_id: string): string[] {
  const owned = new Set<string>();

  // Full-company unlocks → every premium module of that company is owned.
  const unlockedCompanies = unlockedCompanyIds(db, user_id);
  for (const c of db.companies || []) {
    if (unlockedCompanies.includes(c.id)) {
      (c.modules || []).forEach((m: any) => {
        if (m?.is_premium) owned.add(m.id);
      });
    }
  }

  // Paid order lines → explicit module ids (single modules + packs).
  const paid = (db.orders || []).filter((o: any) => o.user_id === user_id && o.status === 'paid');
  for (const o of paid) {
    for (const it of o.items || []) {
      if (it?.kind === 'plan') continue;
      const company = (db.companies || []).find((c: any) => c.id === it.id);
      if (Array.isArray(it.module_ids) && it.module_ids.length > 0) {
        it.module_ids.forEach((m: string) => owned.add(m));
      } else if (it.module_id) {
        owned.add(it.module_id);
      } else if (company) {
        // plain company line historically meant the whole vault
        (company.modules || []).forEach((m: any) => {
          if (m?.is_premium) owned.add(m.id);
        });
      }
    }
  }

  return Array.from(owned);
}