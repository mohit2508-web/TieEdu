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