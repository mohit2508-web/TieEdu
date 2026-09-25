// Derived, truthful statistics — computed live from the order/unlock/report ledgers.
// No fabricated numbers: everything here is counted from records that actually exist in db.

import { storage } from '../store';

export interface DbLike {
  companies?: any[];
  orders?: any[];
  unlocks?: any[];
  reports?: any[];
  users?: any[];
  sessions?: any[];
  coupons?: any[];
  leaderboard?: any[];
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function countActiveUnlocks(db: DbLike, companyId?: string) {
  return (db.unlocks || []).filter(
    (u: any) =>
      u.status === 'active' ||
      u.status === undefined ||
      u.status === null
  ).filter((u: any) => !companyId || u.company_id === companyId).length;
}

export function weeklyUnlocks(db: DbLike, companyId?: string) {
  const cutoff = Date.now() - WEEK_MS;
  return (db.unlocks || []).filter(
    (u: any) =>
      (u.status === 'active' || !u.status) &&
      new Date(u.unlocked_at).getTime() >= cutoff &&
      (!companyId || u.company_id === companyId)
  ).length;
}

export function publishedReports(db: DbLike, companyId?: string) {
  return (db.reports || []).filter(
    (r: any) => r.status === 'published' && (!companyId || r.company_id === companyId)
  );
}

export function paidOrders(db: DbLike) {
  return (db.orders || []).filter((o: any) => o.status === 'paid');
}

export function revenueInr(db: DbLike) {
  return paidOrders(db).reduce((sum: number, o: any) => sum + (Number(o.amount_paisa) || 0) / 100, 0);
}

// Per-company truth overlay: replaces seed/unlock_count + trust_stats with live counts.
export function deriveCompanyStats(db: DbLike, company: any) {
  const unlocks = countActiveUnlocks(db, company.id);
  const weekly = weeklyUnlocks(db, company.id);
  const reports = publishedReports(db, company.id);
  const rating =
    reports.length > 0
      ? Math.round(
          (reports.reduce((s: number, r: any) => s + (Number(r.accuracy_rating) || 0), 0) / reports.length) * 10
        ) / 10
      : 0;
  const matchedReports = reports.filter((r: any) =>
    (r.rounds || []).some((rd: any) => rd.matched_questions)
  ).length;
  const accuracyRate = reports.length > 0 ? Math.round((matchedReports / reports.length) * 100) : 0;
  const latest = [...reports].sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0] as any;

  return {
    unlock_count: unlocks,
    trust_stats: {
      rating,
      rating_count: reports.length,
      weekly_unlocks: weekly,
      verified_by_role: latest?.user_role || null,
      recency_label: 'Updated for 2026 Hiring Season',
      accuracy_rate: accuracyRate,
    },
  };
}

// Platform-level truthful analytics snapshot.
export function buildAnalyticsSnapshot(db: DbLike) {
  const companies = db.companies || [];
  const modules = companies.flatMap((c: any) => c.modules || []);
  const items = modules.flatMap((m: any) => m.items || []);
  const users = db.users || [];
  const sessions = db.sessions || [];
  const now = Date.now();

  const orders = db.orders || [];
  const paid = paidOrders(db);
  const unlocks = db.unlocks || [];

  return {
    system: {
      storage: storage.status().storage_label,
      uptime_seconds: Math.round(process.uptime()),
      time: new Date().toISOString(),
    },
    content: {
      companies: companies.length,
      modules: modules.length,
      items: items.length,
      pdfs: modules.filter((m: any) => m.pdf && m.pdf.stored_name).length,
      published_reports: publishedReports(db).length,
      pending_reports: (db.reports || []).filter((r: any) => r.status === 'pending_review').length,
    },
    commerce: {
      orders_created: orders.length,
      orders_paid: paid.length,
      revenue_inr: Math.round(revenueInr(db) * 100) / 100,
      coupons_applied: paid.filter((o: any) => !!o.coupon_code).length,
      coupon_redemptions: (db.coupons || []).reduce((s: number, c: any) => s + (Number(c.uses) || 0), 0),
    },
    vaults: {
      active_unlocks: countActiveUnlocks(db),
      unique_users_unlocked: new Set(
        unlocks.filter((u: any) => u.status === 'active' || !u.status).map((u: any) => u.user_id)
      ).size,
      weekly_unlocks: weeklyUnlocks(db),
    },
    accounts: {
      users: users.filter((u: any) => u.role === 'user').length,
      admins: users.filter((u: any) => u.role === 'admin').length,
      active_sessions: sessions.filter((s: any) => new Date(s.expires_at).getTime() > now).length,
    },
  };
}