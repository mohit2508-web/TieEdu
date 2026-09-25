// Shared payment-completion + audit helpers (checkout AND webhook paths use these).

let auditSeq = 0;

export function pushAudit(db: any, entry: {
  actor?: string;
  action: string;
  detail?: string;
  order_id?: string;
  gateway?: string;
  meta?: any;
}) {
  if (!db.audit) db.audit = [];
  auditSeq += 1;
  db.audit.push({
    id: `${entry.order_id ? `${entry.order_id}-` : ''}a${Date.now()}-${auditSeq}`,
    at: new Date().toISOString(),
    actor: entry.actor || 'system',
    action: entry.action,
    detail: entry.detail || '',
    order_id: entry.order_id || null,
    gateway: entry.gateway || null,
    meta: entry.meta || null,
  });
  // bounded ledger — keep last 1000 events
  if (db.audit.length > 1000) db.audit = db.audit.slice(-1000);
}

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