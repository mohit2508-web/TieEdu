import React, { useEffect, useState, useCallback } from 'react';
import { fetchAdminOrdersApi, AdminOrder } from '@/lib/api';
import { Download, Search, RefreshCw, ShoppingBag } from 'lucide-react';

const fmtInr = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const chipFor = (status: string) => {
  if (status === 'paid') return 'bg-emerald-100 text-emerald-800';
  if (status === 'failed') return 'bg-red-100 text-red-700';
  return 'bg-amber-100 text-amber-800';
};

const exportCsv = (orders: AdminOrder[]) => {
  if (orders.length === 0) return;
  const esc = (s: string) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const rows = [
    ['Order ID', 'Created At', 'Paid At', 'Status', 'Buyer Name', 'Buyer Email', 'Amount (INR)', 'Base (INR)', 'Discount (INR)', 'Coupon', 'Items'],
    ...orders.map((o) => [
      esc(o.id), esc(o.created_at || ''), esc(o.paid_at || ''), esc(o.status),
      esc(o.user_name), esc(o.user_email), String(o.amount_inr), String((o.base_amount_paisa || 0) / 100),
      String((o.discount_paisa || 0) / 100), esc(o.coupon_code || ''), esc(o.item_names.join(' | ')),
    ]),
  ];
  const csv = rows.map((r) => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tieedu-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const OrdersTab: React.FC = () => {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async (search?: string, statusFilter?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminOrdersApi(search, statusFilter);
      setOrders(data.orders || []);
      setMeta(data.meta || null);
    } catch (e: any) {
      setError(e?.message || 'Orders could not be loaded');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submitSearch = () => { setExpanded(null); load(q.trim()); };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="eyebrow">#02 — Orders</p>
          <h2 className="text-xl font-extrabold text-heading mt-1">Payment orders ledger</h2>
          {meta && (
            <p className="text-xs text-gray-500 mt-1">
              {meta.total} total · {meta.paid} paid ({fmtInr(meta.revenue_inr)}) · {meta.created} pending · aaj {fmtInr(meta.today_revenue_inr)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setExpanded(null); load(q.trim(), status); }} className="px-3 py-2 bg-signal hover:bg-signal text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={() => exportCsv(orders)} className="px-3 py-2 bg-brand-ink hover:bg-brand-ink text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-line flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
              placeholder="Search order id, email, company…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl bg-app-warm text-sm focus:outline-none focus:ring-2 focus:ring-signal/30"
            />
          </div>
          <div className="flex gap-1.5 text-xs font-mono font-bold">
            {[['', 'All'], ['paid', 'Paid'], ['created', 'Created']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => { setStatus(val); setExpanded(null); load(q.trim(), val); }}
                className={`px-3 py-1.5 rounded-full border transition-all ${status === val ? 'bg-brand-ink text-white border-brand-ink' : 'bg-white text-gray-500 border-gray-200 hover:border-signal hover:text-signal'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-14 text-center text-sm text-gray-400 italic">Loading orders…</div>
        ) : error ? (
          <div className="p-14 text-center">
            <p className="text-sm font-semibold text-red-600">{error}</p>
            <p className="text-xs text-gray-400 mt-1">Check the backend (GET /api/admin/orders) — live ledger data comes from here.</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-14 text-center">
            <ShoppingBag className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No orders found{status ? ` (filter: ${status})` : ''}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-app-warm text-gray-500 uppercase font-mono text-xs">
                  <th className="text-left px-4 py-3">Order / Date</th>
                  <th className="text-left px-4 py-3">Buyer</th>
                  <th className="text-left px-4 py-3">Items</th>
                  <th className="text-right px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Coupon</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.map((o) => (
                  <React.Fragment key={o.id}>
                    <tr className="hover:bg-app-warm cursor-pointer" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs text-signal font-bold">{(o.id || '').slice(0, 24)}{(o.id || '').length > 24 ? '…' : ''}</p>
                        <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleString()}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink-soft">{o.user_name}</p>
                        <p className="text-xs text-gray-400">{o.user_email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono bg-warning-soft text-amber-deep px-2 py-0.5 rounded-full font-bold">{o.item_names.length} item(s)</span>
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-heading">{fmtInr(o.amount_inr)}</td>
                      <td className="px-4 py-3">
                        {o.coupon_code ? (
                          <span className="text-xs font-mono font-bold bg-signal-soft text-signal px-2 py-0.5 rounded-full">{o.coupon_code}</span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${chipFor(o.status)}`}>{o.status}</span>
                      </td>
                    </tr>
                    {expanded === o.id && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 bg-app-warm">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                            <div>
                              <p className="text-xs font-bold font-mono text-gray-400 uppercase mb-1">Breakdown</p>
                              <p className="text-gray-600">Base: {fmtInr((o.base_amount_paisa || 0) / 100)}<br />Discount: {fmtInr((o.discount_paisa || 0) / 100)}<br />Paid: <strong className="text-signal">{fmtInr(o.amount_inr)}</strong></p>
                            </div>
                            <div className="sm:col-span-2">
                              <p className="text-xs font-bold font-mono text-gray-400 uppercase mb-1">Order items</p>
                              {o.items.length === 0 ? (
                                <p className="text-gray-400 italic">No items recorded</p>
                              ) : (
                                <ul className="space-y-1">
                                  {o.items.map((it, i) => (
                                    <li key={i} className="text-gray-600"><strong>{it.name}</strong>{it.module_title ? ` — ${it.module_title}` : ''} <span className="text-gray-400 font-mono text-xs">({it.kind})</span></li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400 font-mono">Every number is counted live from the ledger (orders/unlocks/reports) — no fake seed.</p>
    </div>
  );
};