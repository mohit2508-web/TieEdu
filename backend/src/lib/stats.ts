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
  courses?: any[];
  course_progress?: Record<string, Record<string, any>>;
  certificates?: any[];
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

  // Freshness is a FACT about the ledger, not a marketing string. The newest
  // published report date is the only honest "updated" signal we have; when no
  // report has been published we report null and the UI says "no verified
  // reports yet" rather than inventing a season label.
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
      last_report_at: latest?.created_at || null,
      accuracy_rate: accuracyRate,
    },
  };
}

// Course funnel per branch/bucket — enrolments, completions and real paid
// conversions, every number counted from the ledgers that hold it:
//   - enrolments/completions: course_progress records (one per user per course)
//   - paid conversions: paid order lines of kind 'course', resolved to their
//     course's branch/bucket via the catalogue
//   - revenue: the line's own price (what was actually charged, after coupons)
// Courses with no branch/bucket land in 'unlisted' rather than vanishing —
// a total that does not sum to its parts would be a lie the dashboard cannot
// afford.
function courseAnalytics(db: DbLike) {
  const courses = db.courses || [];
  const progress = db.course_progress || {};
  const paid = paidOrders(db);

  const byId = new Map<string, any>(courses.map((c: any) => [c.id, c]));

  // Flattened per-user-per-course rows, so enrolment and completion are counted once each.
  const rows: any[] = [];
  for (const byCourse of Object.values(progress)) {
    if (!byCourse || typeof byCourse !== 'object') continue;
    for (const [courseId, p] of Object.entries(byCourse)) {
      if (!p || !p.enrolled_at) continue;
      const course = byId.get(courseId);
      rows.push({
        course,
        completed: !!p.completed_at,
        branch: (course && course.branch) || 'unlisted',
        bucket: (course && course.bucket) || 'unlisted',
      });
    }
  }

  // Paid course lines, attributed to the course's branch/bucket. A pack/company
  // line carries no course_id and is deliberately excluded — it is vault
  // revenue, not course conversion.
  const sales: any[] = [];
  for (const o of paid) {
    for (const line of (o as any).items || []) {
      if (line.kind !== 'course' || !line.course_id) continue;
      const course = byId.get(line.course_id);
      sales.push({
        course,
        price_inr: (Number(line.price) || 0),
        branch: (course && course.branch) || 'unlisted',
        bucket: (course && course.bucket) || 'unlisted',
      });
    }
  }

  const bucketNames = courses.map((c: any) => c.bucket || 'unlisted');
  const branchNames = courses.map((c: any) => c.branch || 'unlisted');

  const slice = (key: 'branch' | 'bucket', names: string[]) => {
    const seen = new Set<string>([...names, 'unlisted']);
    return [...seen].sort().map((name) => {
      const inSlice = (r: any) => r[key] === name;
      const sliceRows = rows.filter(inSlice);
      const completions = sliceRows.filter((r: any) => r.completed).length;
      const sliceSales = sales.filter(inSlice);
      const sliceCourses = courses.filter((c: any) => (c[key] || 'unlisted') === name);
      return {
        [key]: name,
        courses: sliceCourses.length,
        published_courses: sliceCourses.filter((c: any) => c.published).length,
        enrolments: sliceRows.length,
        completions,
        completion_rate: sliceRows.length
          ? Math.round((completions / sliceRows.length) * 100)
          : 0,
        paid_conversions: sliceSales.length,
        revenue_inr: Math.round(sliceSales.reduce((s: number, r: any) => s + r.price_inr, 0) * 100) / 100,
      };
    });
  };

  const completions = rows.filter((r: any) => r.completed).length;
  return {
    total_courses: courses.length,
    published_courses: courses.filter((c: any) => c.published).length,
    enrolments: rows.length,
    completions,
    completion_rate: rows.length ? Math.round((completions / rows.length) * 100) : 0,
    paid_conversions: sales.length,
    paid_revenue_inr: Math.round(sales.reduce((s: number, r: any) => s + r.price_inr, 0) * 100) / 100,
    by_branch: slice('branch', branchNames),
    by_bucket: slice('bucket', bucketNames),
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
    courses: courseAnalytics(db),
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