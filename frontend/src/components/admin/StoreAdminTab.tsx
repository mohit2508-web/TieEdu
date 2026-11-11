import React, { useCallback, useEffect, useState } from 'react';
import { Download, RefreshCw, Save } from 'lucide-react';
import { Segmented } from '@/components/ui/Segmented';
import { BrandLoader } from '@/components/brand/BrandLoader';
import { ErrorState } from '@/components/common/ErrorState';
import { CoinIcon } from '@/components/coins/CoinIcon';
import { SwagArt } from '@/components/coins/SwagArt';
import { apiFetch } from '@/lib/api';
import {
  fetchStoreItemsAdmin, fetchStoreOrdersAdmin, moveStoreOrder, saveStoreItem, storeOrdersCsvUrl, ORDER_LABEL,
  type OrderStatus, type StoreItemAdmin, type StoreOrder,
} from '@/lib/storeApi';
import { cn } from '@/lib/cn';

type View = 'orders' | 'items';
const STATUSES: Array<OrderStatus | ''> = ['', 'placed', 'approved', 'packed', 'shipped', 'delivered', 'rejected', 'cancelled'];
const NEXT: Partial<Record<OrderStatus, OrderStatus>> = { placed: 'approved', approved: 'packed', packed: 'shipped', shipped: 'delivered' };
const input = 'h-9 rounded-md border border-line bg-card px-2 text-body-md text-heading focus:border-signal focus:outline-none';

/** One item row: price, stock per size, on/off, featured. Saves the row on its own. */
function ItemRow({ item, onSaved }: { item: StoreItemAdmin; onSaved: (i: StoreItemAdmin) => void }) {
  const [d, setD] = useState(item);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const dirty = JSON.stringify(d) !== JSON.stringify(item);
  const save = async () => {
    setBusy(true); setMsg('');
    try { const r = await saveStoreItem(item.id, { coins: d.coins, active: d.active, featured: d.featured, stock: d.stock, name: d.name, blurb: d.blurb, image: d.image || '' }); onSaved(r.item); setMsg('Saved'); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };
  const keys = item.kind === 'physical' ? (item.sizes?.length ? item.sizes : ['one']) : [];
  return (
    <tr className="border-t border-line align-top">
      <td className="w-20 px-3 py-3"><div className="h-14 w-20 rounded-lg bg-surface-hover"><SwagArt art={item.art} image={d.image} label="" className="h-full w-full" /></div></td>
      <td className="px-3 py-3">
        <input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} className={cn(input, 'w-full font-semibold')} aria-label="Name" />
        <input value={d.image || ''} onChange={(e) => setD({ ...d, image: e.target.value })} placeholder="Photo URL (optional)" className={cn(input, 'mt-1 w-full text-sm')} aria-label="Photo URL" />
        <p className="mt-1 text-sm text-muted">{item.kind === 'digital' ? `Digital · ${item.action}` : 'Swag'}{item.limit_per_user ? ` · max ${item.limit_per_user} per student` : ''}</p>
      </td>
      <td className="px-3 py-3"><label className="inline-flex items-center gap-1"><CoinIcon size={14} /><input type="number" min={1} value={d.coins} onChange={(e) => setD({ ...d, coins: Number(e.target.value) })} className={cn(input, 'w-24')} aria-label="Coins" /></label></td>
      <td className="px-3 py-3">
        {keys.length ? (
          <div className="flex flex-wrap gap-1.5">
            {keys.map((k) => (
              <label key={k} className="inline-flex items-center gap-1 text-sm text-muted">{k === 'one' ? 'Units' : k}
                <input type="number" min={0} value={d.stock?.[k] ?? 0} onChange={(e) => setD({ ...d, stock: { ...(d.stock || {}), [k]: Number(e.target.value) } })} className={cn(input, 'w-16')} />
              </label>
            ))}
          </div>
        ) : <span className="text-sm text-muted">Unlimited</span>}
      </td>
      <td className="px-3 py-3">
        <label className="flex items-center gap-2 text-body-md"><input type="checkbox" checked={d.active} onChange={(e) => setD({ ...d, active: e.target.checked })} /> On sale</label>
        <label className="mt-1 flex items-center gap-2 text-body-md"><input type="checkbox" checked={!!d.featured} onChange={(e) => setD({ ...d, featured: e.target.checked })} /> Featured</label>
      </td>
      <td className="px-3 py-3">
        <button type="button" disabled={!dirty || busy} onClick={save} className="btn btn-primary focus-ring inline-flex min-h-[36px] items-center gap-1 px-3 disabled:opacity-40"><Save className="h-4 w-4" aria-hidden /> Save</button>
        {msg && <p className="mt-1 text-sm text-muted">{msg}</p>}
      </td>
    </tr>
  );
}

function OrderCard({ o, onMoved }: { o: StoreOrder & { user: { name: string; email: string } }; onMoved: () => void }) {
  const [tracking, setTracking] = useState('');
  const [courier, setCourier] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const next = NEXT[o.status];
  const move = async (status: OrderStatus) => {
    setBusy(true); setErr('');
    try { await moveStoreOrder(o.id, { status, note: note || undefined, courier: courier || undefined, tracking: tracking || undefined }); onMoved(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <li className="rounded-2xl border border-line bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 text-body-md font-semibold text-heading">{o.item_name}{o.size ? ` · ${o.size}` : ''} <span className="font-normal text-muted">· {o.user.name || o.user.email}</span></p>
        <span className="inline-flex items-center gap-1 text-sm text-muted"><CoinIcon size={14} />{o.coins}</span>
        <span className="rounded-full bg-surface-hover px-2.5 py-0.5 text-sm font-semibold text-heading">{ORDER_LABEL[o.status]}</span>
      </div>
      {o.address && (
        <p className="mt-2 text-body-md text-body">{o.address.name}, {o.address.line1}{o.address.line2 ? `, ${o.address.line2}` : ''}, {o.address.city}, {o.address.state} {o.address.pincode} · {o.phone}</p>
      )}
      <p className="mt-1 text-sm text-muted">{o.id} · {new Date(o.created_at).toLocaleString('en-IN')} · {o.user.email}{o.tracking ? ` · ${o.courier || ''} ${o.tracking}` : ''}</p>
      {o.kind === 'physical' && (next || ['placed', 'approved', 'packed'].includes(o.status)) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {next === 'shipped' && <>
            <input value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="Courier" className={input} />
            <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Tracking number" className={input} />
          </>}
          {next && <button type="button" disabled={busy} onClick={() => move(next)} className="btn btn-primary focus-ring min-h-[36px] px-3">Mark {next}</button>}
          {['placed', 'approved', 'packed'].includes(o.status) && <>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason (to reject)" className={input} />
            <button type="button" disabled={busy || !note.trim()} onClick={() => move('rejected')} className="btn btn-secondary focus-ring min-h-[36px] px-3 disabled:opacity-40">Reject + refund</button>
          </>}
        </div>
      )}
      {err && <p role="alert" className="mt-2 text-body-md text-danger">{err}</p>}
    </li>
  );
}

/** Admin → Rewards & store (TIE_COINS_STORE_PLAN.md §7): the swag order queue and the catalogue. */
export const StoreAdminTab: React.FC = () => {
  const [view, setView] = useState<View>('orders');
  const [status, setStatus] = useState<OrderStatus | ''>('placed');
  const [orders, setOrders] = useState<Awaited<ReturnType<typeof fetchStoreOrdersAdmin>> | null>(null);
  const [items, setItems] = useState<StoreItemAdmin[] | null>(null);
  const [error, setError] = useState('');
  const loadOrders = useCallback(() => { setError(''); fetchStoreOrdersAdmin(status).then(setOrders).catch((e) => setError(e.message)); }, [status]);
  const loadItems = useCallback(() => { setError(''); fetchStoreItemsAdmin().then((r) => setItems(r.items)).catch((e) => setError(e.message)); }, []);
  useEffect(() => { if (view === 'orders') loadOrders(); else loadItems(); }, [view, loadOrders, loadItems]);

  const downloadCsv = async () => {
    const res = await apiFetch(storeOrdersCsvUrl());
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tieedu-swag-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-heading">Rewards &amp; store</h2>
          <p className="text-body-md text-body">Swag orders to ship, and what the TiEEdu Store sells for TiE Coins.</p>
        </div>
        <Segmented label="Section" value={view} onChange={setView} items={[{ key: 'orders', label: 'Orders', badge: orders?.counts.placed || null }, { key: 'items', label: 'Items' }]} />
      </div>
      {error && <ErrorState message={error} onRetry={view === 'orders' ? loadOrders : loadItems} />}

      {view === 'orders' && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {STATUSES.map((s) => (
              <button key={s || 'all'} type="button" aria-pressed={status === s} onClick={() => setStatus(s)}
                className={cn('min-h-[36px] rounded-full border px-3 text-sm font-semibold', status === s ? 'border-signal bg-signal-soft text-signal-ink' : 'border-line text-body')}>
                {s ? ORDER_LABEL[s as OrderStatus].replace(/ \(.*\)/, '') : 'All'}{s && orders?.counts[s] ? ` (${orders.counts[s]})` : ''}
              </button>
            ))}
            <span className="flex-1" />
            <button type="button" onClick={loadOrders} className="btn btn-secondary focus-ring inline-flex min-h-[36px] items-center gap-1 px-3"><RefreshCw className="h-4 w-4" aria-hidden /> Refresh</button>
            <button type="button" onClick={downloadCsv} className="btn btn-secondary focus-ring inline-flex min-h-[36px] items-center gap-1 px-3"><Download className="h-4 w-4" aria-hidden /> Courier CSV</button>
          </div>
          {!orders && !error && <BrandLoader caption="Loading orders…" />}
          {orders && (orders.orders.length ? (
            <ul className="space-y-3">{orders.orders.map((o) => <OrderCard key={o.id} o={o} onMoved={loadOrders} />)}</ul>
          ) : <p className="rounded-2xl border border-line bg-card p-6 text-body-md text-body">No orders here.</p>)}
        </>
      )}

      {view === 'items' && (
        <>
          <p className="rounded-xl bg-surface-hover p-3 text-body-md text-body">Swag shows as &quot;Launching soon&quot; until it has stock. Set the units when the vendor delivers, and switch an item on to put it on sale.</p>
          {!items && !error && <BrandLoader caption="Loading items…" />}
          {items && (
            <div className="overflow-x-auto rounded-2xl border border-line bg-card">
              <table className="w-full min-w-[860px] text-left">
                <thead className="text-sm text-muted"><tr><th className="px-3 py-3" /><th className="px-3 py-3 font-medium">Item</th><th className="px-3 py-3 font-medium">Price</th><th className="px-3 py-3 font-medium">Stock</th><th className="px-3 py-3 font-medium">Shown</th><th className="px-3 py-3" /></tr></thead>
                <tbody>{items.map((i) => <ItemRow key={i.id} item={i} onSaved={(n) => setItems((list) => list && list.map((x) => (x.id === n.id ? n : x)))} />)}</tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};
