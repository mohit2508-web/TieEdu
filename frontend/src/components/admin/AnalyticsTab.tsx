import React, { useEffect, useState } from 'react';
import { fetchAnalyticsApi, fetchRevenueSeriesApi, fetchCouponsApi, fetchLeaderboardApi, AnalyticsSnapshot, RevenuePoint } from '@/lib/api';
import { Company } from '@/types';
import { BarChart3, Crown, Lock, Receipt, Ticket } from 'lucide-react';

const fmtInr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const AnalyticsTab: React.FC<{ companies: Company[] }> = ({ companies }) => {
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot | null>(null);
  const [series, setSeries] = useState<RevenuePoint[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [a, r, c, lb] = await Promise.all([
          fetchAnalyticsApi(),
          fetchRevenueSeriesApi(),
          fetchCouponsApi(),
          fetchLeaderboardApi(),
        ]);
        if (!active) return;
        setAnalytics(a);
        setSeries(r?.series || []);
        setCoupons(c || []);
        setLeaderboard(Array.isArray(lb) ? lb : (lb?.entries || []));
      } catch (e: any) {
        if (active) setError(e?.message || 'Analytics could not be loaded');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-9 h-9 border-[3px] border-money/40 border-t-signal rounded-full animate-spin" />
        <p className="text-sm font-semibold text-[--text-muted]">Compiling analytics…</p>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="p-14 text-center">
        <p className="text-sm font-semibold text-red-600">{error || 'Data unavailable'}</p>
        <p className="text-xs text-gray-400 mt-1">Every metric is a live count — if the backend is down, no fake number is shown.</p>
      </div>
    );
  }

  const conversion = analytics.commerce.orders_created > 0
    ? Math.round((analytics.commerce.orders_paid / analytics.commerce.orders_created) * 100)
    : 0;
  const maxRevenue = Math.max(1, ...series.map((d) => d.revenue_inr));
  const sortedCompanies = [...companies].sort((a, b) => (b.unlock_count || 0) - (a.unlock_count || 0));

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">#07 — Analytics</p>
        <h2 className="text-xl font-extrabold text-heading mt-1">Conversion & engagement intelligence</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs">
          <p className="eyebrow">Conversion</p>
          <p className="text-3xl font-extrabold text-heading mt-2">{conversion}%</p>
          <p className="text-xs text-gray-400 mt-1">{analytics.commerce.orders_paid} paid / {analytics.commerce.orders_created} created orders</p>
          <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full bg-signal" style={{ width: `${conversion}%` }} />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs">
          <p className="eyebrow">Coupons</p>
          <p className="text-3xl font-extrabold text-heading mt-2">{analytics.commerce.coupon_redemptions}</p>
          <p className="text-xs text-gray-400 mt-1">total redemptions · {analytics.commerce.coupons_applied} paid orders applied</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs">
          <p className="eyebrow">Honest flag</p>
          <p className="text-3xl font-extrabold text-emerald-600 mt-2">{analytics.honest ? 'TRUE' : 'LIVE'}</p>
          <p className="text-xs text-gray-400 mt-1">Every number is counted from orders/unlocks/reports</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs">
          <h3 className="text-sm font-extrabold text-ink-soft flex items-center gap-2 mb-4">
            <Receipt className="w-4 h-4 text-amber-deep" /> Revenue by day (paid orders)
          </h3>
          {series.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No paid orders — series is empty.</p>
          ) : (
            <div className="space-y-2">
              {[...series].reverse().map((d) => (
                <div key={d.date} className="flex items-center gap-3">
                  <span className="w-24 text-xs font-mono text-gray-400 shrink-0">{d.date}</span>
                  <div className="flex-1 h-4 rounded bg-app-warm overflow-hidden">
                    <div className="h-full bg-signal" style={{ width: `${Math.max(2, (d.revenue_inr / maxRevenue) * 100)}%` }} />
                  </div>
                  <span className="w-24 text-right text-xs font-mono font-bold text-gray-600 shrink-0">{fmtInr(d.revenue_inr)} · {d.orders}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-line flex justify-between text-xs">
            <span className="text-gray-500">Total revenue</span>
            <strong className="text-signal">{fmtInr(analytics.commerce.revenue_inr)}</strong>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs">
          <h3 className="text-sm font-extrabold text-ink-soft flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-signal" /> Vault unlocks by company
          </h3>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {sortedCompanies.map((c) => (
              <div key={c.id} className="flex items-center gap-3">
                <span className="w-32 text-xs font-semibold text-gray-600 truncate shrink-0" title={c.name}>{c.name}</span>
                <div className="flex-1 h-4 rounded bg-app-warm overflow-hidden">
                  <div className="h-full bg-brand-ink" style={{ width: `${Math.min(100, ((c.unlock_count || 0) / Math.max(1, sortedCompanies[0]?.unlock_count || 1)) * 100)}%` }} />
                </div>
                <span className="w-12 text-right text-xs font-mono font-bold text-gray-600 shrink-0">{c.unlock_count || 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs">
          <h3 className="text-sm font-extrabold text-ink-soft flex items-center gap-2 mb-4">
            <Ticket className="w-4 h-4 text-amber-deep" /> Coupon usage
          </h3>
          {coupons.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No coupons created.</p>
          ) : (
            <div className="space-y-2">
              {coupons.map((cp) => (
                <div key={cp.id} className="flex items-center justify-between text-xs py-1.5 border-b border-line last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-signal bg-signal-soft px-2 py-0.5 rounded-md">{cp.code}</span>
                    <span className="text-gray-400">{cp.scope || (cp.discount_percent ? `${cp.discount_percent}%` : cp.discount_flat ? `₹${cp.discount_flat}` : '—')}</span>
                  </div>
                  <span className={`font-mono font-bold ${cp.uses > 0 ? 'text-emerald-700' : 'text-gray-400'}`}>
                    {cp.uses} / {cp.max_uses === 0 ? '∞' : cp.max_uses} uses
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs">
          <h3 className="text-sm font-extrabold text-ink-soft flex items-center gap-2 mb-4">
            <Crown className="w-4 h-4 text-amber-deep" /> Top contributors (leaderboard)
          </h3>
          {leaderboard.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Leaderboard is empty — no XP or contributions yet.</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.slice(0, 10).map((e) => (
                <div key={e.rank} className="flex items-center justify-between text-xs py-1.5 border-b border-line last:border-0">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold ${e.rank === 1 ? 'bg-warning-soft text-amber-deep' : 'bg-signal-soft text-signal'}`}>#{e.rank}</span>
                    <span className="font-semibold text-ink-soft">{e.name}</span>
                    {e.college && <span className="text-xs text-gray-400 font-mono">{e.college}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    {e.report_contributions > 0 && <span className="text-xs text-gray-400 font-mono">{e.report_contributions} reports</span>}
                    <span className="font-mono font-bold text-signal">{e.xp} XP</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
        <BarChart3 className="w-4 h-4 text-signal" />
        Sources: /api/analytics, /api/analytics/revenue, /api/admin/coupons, /api/gamification/leaderboard, /api/companies
      </div>
    </div>
  );
};