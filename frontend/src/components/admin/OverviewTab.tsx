import React, { useEffect, useState } from 'react';
import { fetchAnalyticsApi, fetchAdminOrdersApi, fetchRevenueSeriesApi, AnalyticsSnapshot, RevenuePoint } from '@/lib/api';
import { Activity, BadgeCheck, CircleDollarSign, Coins, Database, FileCheck, FileClock, FolderLock, Package, ShoppingBag, TicketCheck, TrendingUp, Users, Zap } from 'lucide-react';

const fmtInr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const StatCard: React.FC<{ label: string; value: string; sub?: string; icon: any; tone?: string }> = ({ label, value, sub, icon: Icon, tone = 'sky' }) => {
  const tones: Record<string, string> = {
    sky: 'bg-[#E8F4FB] text-[#0284C7]',
    amber: 'bg-[#FBF1E1] text-[#B7791F]',
    emerald: 'bg-emerald-50 text-emerald-700',
    navy: 'bg-[#1F3A5F] text-white',
  };
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-extrabold text-[#10151C] mt-1.5 truncate">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-1 truncate">{sub}</p>}
      </div>
      <span className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${tones[tone]}`}>
        <Icon className="w-5 h-5" />
      </span>
    </div>
  );
};

const RevenueBars: React.FC<{ series: RevenuePoint[] }> = ({ series }) => {
  const data = series.slice(-10);
  const max = Math.max(1, ...data.map((d) => d.revenue_inr));
  return (
    <div>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No paid orders yet — the series is empty.</p>
      ) : (
        <div className="flex items-end gap-2 h-36">
          {data.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group" title={`${d.date} · ${fmtInr(d.revenue_inr)} · ${d.orders} orders`}>
              <span className="text-[10px] font-mono font-bold text-[#0284C7] opacity-0 group-hover:opacity-100 transition-opacity">{d.revenue_inr.toFixed(0)}</span>
              <div className="w-full rounded-t-md bg-gradient-to-t from-[#0284C7] to-[#38BDF8] transition-all hover:from-[#0271B5]"
                style={{ height: `${Math.max(4, (d.revenue_inr / max) * 100)}%` }} />
              <span className="text-[9px] font-mono text-gray-400 rotate-0 whitespace-nowrap">{d.date.slice(5)}</span>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-gray-400 mt-2">Daily revenue (paid orders) — sirf real transactions se.</p>
    </div>
  );
};

export const OverviewTab: React.FC<{ companiesCount: number; pendingReportsCount: number }> = ({ companiesCount, pendingReportsCount }) => {
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot | null>(null);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [orderMeta, setOrderMeta] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [a, r, o] = await Promise.all([fetchAnalyticsApi(), fetchRevenueSeriesApi(), fetchAdminOrdersApi()]);
        if (!active) return;
        setAnalytics(a);
        setRevenue(r?.series || []);
        setOrderMeta(o?.meta || null);
      } catch (e: any) {
        if (active) setError(e?.message || 'KPIs could not be loaded — check the backend.');
      }
    })();
    return () => { active = false; };
  }, []);

  if (error) {
    return (
      <div className="p-10 text-center bg-white border border-red-100 rounded-3xl">
        <p className="text-sm font-semibold text-red-600">{error}</p>
        <p className="text-xs text-gray-400 mt-1">Live vaults backend is down — the entire dashboard reads from the server.</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-9 h-9 border-[3px] border-[#FBF1E1] border-t-[#0284C7] rounded-full animate-spin" />
        <p className="text-[13px] font-semibold text-[#7D8794]">Loading honest KPIs…</p>
      </div>
    );
  }

  const c = analytics.commerce;
  const v = analytics.vaults;
  const ct = analytics.content;
  const ac = analytics.accounts;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">#00 — Overview</p>
          <h2 className="text-xl font-extrabold text-[#10151C] mt-1">Live platform health & commerce</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
          <BadgeCheck className="w-3.5 h-3.5" /> {analytics.honest ? 'HONEST DATA' : 'LIVE'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Lifetime Revenue" value={fmtInr(c.revenue_inr)} sub={`${c.orders_paid} paid orders · ${orderMeta?.today_revenue_inr ? `today ${fmtInr(orderMeta.today_revenue_inr)}` : 'today ₹0'}`} icon={CircleDollarSign} tone="amber" />
        <StatCard label="Orders" value={`${c.orders_paid} / ${c.orders_created}`} sub="paid / total created" icon={ShoppingBag} tone="sky" />
        <StatCard label="Active Unlocks" value={`${v.active_unlocks}`} sub={`${v.unique_users_unlocked} unique users · ${v.weekly_unlocks} is week`} icon={FolderLock} tone="navy" />
        <StatCard label="Registered Users" value={`${ac.users}`} sub={`${ac.admins} admin · ${ac.active_sessions} active sessions`} icon={Users} tone="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-3xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#0284C7]" />
              <h3 className="text-sm font-extrabold text-[#1E293B]">Revenue — last {revenue.length} paid days</h3>
            </div>
            <span className="text-[11px] font-mono font-bold text-gray-400">series: /analytics/revenue</span>
          </div>
          <RevenueBars series={revenue} />
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs">
            <p className="eyebrow">Commerce</p>
            <div className="mt-3 space-y-2.5 text-sm">
              <div className="flex justify-between items-center"><span className="text-gray-500 flex items-center gap-1.5"><TicketCheck className="w-4 h-4 text-[#E8A33D]" />Coupon redemptions</span><strong>{c.coupon_redemptions}</strong></div>
              <div className="flex justify-between items-center"><span className="text-gray-500 flex items-center gap-1.5"><Coins className="w-4 h-4 text-[#E8A33D]" />Paid orders with coupon</span><strong>{c.coupons_applied}</strong></div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs">
            <p className="eyebrow">Content</p>
            <div className="mt-3 grid grid-cols-2 gap-2.5 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Companies</span><strong>{ct.companies}</strong></div>
              <div className="flex justify-between"><span className="text-gray-500">Modules</span><strong>{ct.modules}</strong></div>
              <div className="flex justify-between"><span className="text-gray-500">Items</span><strong>{ct.items}</strong></div>
              <div className="flex justify-between"><span className="text-gray-500">PDFs</span><strong>{ct.pdfs}</strong></div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs">
            <p className="eyebrow">Reports</p>
            <div className="mt-3 grid grid-cols-2 gap-2.5 text-sm">
              <div className="flex justify-between"><span className="text-gray-500 flex items-center gap-1.5"><FileClock className="w-4 h-4 text-amber-500" />Pending</span><strong>{ct.pending_reports}</strong></div>
              <div className="flex justify-between"><span className="text-gray-500 flex items-center gap-1.5"><FileCheck className="w-4 h-4 text-emerald-600" />Published</span><strong>{ct.published_reports}</strong></div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#1F3A5F] text-white rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-[#E8A33D]" />
          <div>
            <p className="text-sm font-extrabold">Storage: {analytics.system.storage}</p>
            <p className="text-xs text-gray-300">Uptime {Math.floor(analytics.system.uptime_seconds / 60)} min · snapshot {new Date(analytics.system.time).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/20"><Activity className="w-3.5 h-3.5 inline mr-1" />Live API</span>
          <span className="px-3 py-1.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30"><Zap className="w-3.5 h-3.5 inline mr-1" />{companiesCount} vaults · {pendingReportsCount} pending reports</span>
        </div>
      </div>
    </div>
  );
};