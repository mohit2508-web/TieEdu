import React, { useCallback, useEffect, useState } from 'react';
import { Download, RefreshCw, Save, ChevronDown, Upload, Trash2, ExternalLink } from 'lucide-react';
import { Segmented } from '@/components/ui/Segmented';
import { BrandLoader } from '@/components/brand/BrandLoader';
import { ErrorState } from '@/components/common/ErrorState';
import { CoinIcon } from '@/components/coins/CoinIcon';
import { SwagArt } from '@/components/coins/SwagArt';
import { apiFetch } from '@/lib/api';
import {
  fetchStoreItemsAdmin, fetchStoreOrdersAdmin, moveStoreOrder, saveStoreItem, storeOrdersCsvUrl, ORDER_LABEL, uploadStoreMedia, mediaUrl, setStorePromo,
  type OrderStatus, type StoreItemAdmin, type StoreOrder,
} from '@/lib/storeApi';
import { cn } from '@/lib/cn';

type View = 'orders' | 'items';
const STATUSES: Array<OrderStatus | ''> = ['', 'placed', 'approved', 'packed', 'shipped', 'delivered', 'rejected', 'cancelled'];
const NEXT: Partial<Record<OrderStatus, OrderStatus>> = { placed: 'approved', approved: 'packed', packed: 'shipped', shipped: 'delivered' };
const input = 'h-9 rounded-md border border-line bg-card px-2 text-body-md text-heading focus:border-signal focus:outline-none';

/** One item row: price, stock per size, on/off, featured. Saves the row on its own. */
function ItemRow({ item, onSaved, onShowcaseSaved }: { item: StoreItemAdmin; onSaved: (i: StoreItemAdmin) => void; onShowcaseSaved: () => void }) {
  const [showcase, setShowcase] = useState(false);
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
    <>
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
        <button type="button" onClick={() => setShowcase((x) => !x)} aria-expanded={showcase} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-link">
          Showcase <ChevronDown className={cn('h-4 w-4 transition-transform', showcase && 'rotate-180')} aria-hidden />
        </button>
      </td>
    </tr>
    {showcase && <tr><td colSpan={6} className="bg-surface-hover/40 px-3 py-4"><ShowcaseEditor item={item} onSaved={onShowcaseSaved} /></td></tr>}
    </>
  );
}

/** Upload box for one print side, with a preview and "use default". */
function ArtPick({ label, url, onPick, onClear }: { label: string; url: string | null; onPick: (f: File | undefined) => void; onClear: () => void }) {
  return (
    <div className="rounded-xl border border-line bg-card p-3">
      <p className="text-sm font-semibold text-heading">{label}</p>
      <div className="mt-2 grid h-24 place-items-center rounded-lg bg-surface-hover">
        {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded artwork preview */}
        {url ? <img src={mediaUrl(url) || ''} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-muted">Default TiEEdu print</span>}
      </div>
      <div className="mt-2 flex gap-2">
        <label className="btn btn-secondary focus-ring inline-flex min-h-[32px] cursor-pointer items-center gap-1 px-2 text-xs"><Upload className="h-3.5 w-3.5" aria-hidden /> Upload
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => onPick(e.target.files?.[0])} /></label>
        {url && <button type="button" onClick={onClear} className="inline-flex items-center gap-1 text-xs font-semibold text-link"><Trash2 className="h-3.5 w-3.5" aria-hidden /> Use default</button>}
      </div>
    </div>
  );
}

/**
 * The product popup's content for one item (STORE_3D_SHOWCASE_AND_SPEED_PLAN.md §C):
 * description, specs, box contents, colours, print artwork for the 3D model, photos
 * and the home promo. Pre-filled with what students see now; clear a field to go
 * back to the default text.
 */
function ShowcaseEditor({ item, onSaved }: { item: StoreItemAdmin; onSaved: () => void }) {
  const shown = item.shown;
  const [details, setDetails] = useState(shown?.details || '');
  const [specs, setSpecs] = useState((shown?.specs || []).map(([k, v]) => `${k}: ${v}`).join('\n'));
  const [inBox, setInBox] = useState((shown?.in_box || []).join('\n'));
  const [colors, setColors] = useState((shown?.colors || []).map((c) => `${c.name} ${c.hex}`).join('\n'));
  const [front, setFront] = useState<string | null>(shown?.print_front || null);
  const [back, setBack] = useState<string | null>(shown?.print_back || null);
  const [gallery, setGallery] = useState<string[]>(shown?.gallery || []);
  const [promo, setPromo] = useState(!!shown?.promo);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const upload = async (file: File | undefined, put: (url: string) => void) => {
    if (!file) return;
    setBusy('upload'); setMsg('');
    try { put(await uploadStoreMedia(file)); setMsg('Uploaded. Save to publish it.'); } catch (e) { setMsg((e as Error).message); } finally { setBusy(''); }
  };
  const save = async () => {
    setBusy('save'); setMsg('');
    try {
      await saveStoreItem(item.id, {
        details,
        specs: specs.split('\n').map((l) => l.split(':')).filter((p) => p.length >= 2 && p[0].trim()).map((p) => [p[0].trim(), p.slice(1).join(':').trim()] as [string, string]),
        in_box: inBox.split('\n').map((l) => l.trim()).filter(Boolean),
        colors: colors.split('\n').map((l) => l.trim().match(/^(.+?)\s+(#[0-9a-fA-F]{6})$/)).filter((m): m is RegExpMatchArray => !!m).map((m) => ({ name: m[1], hex: m[2] })),
        print_front: front, print_back: back, gallery, promo,
      } as Partial<StoreItemAdmin>);
      setMsg('Saved. Students see it now.');
      onSaved();
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(''); }
  };
  const area = 'mt-1 w-full rounded-md border border-line bg-card p-2 text-sm text-heading focus:border-signal focus:outline-none';
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="text-sm font-medium text-heading">Full description<textarea rows={5} value={details} onChange={(e) => setDetails(e.target.value)} className={area} /></label>
        <label className="text-sm font-medium text-heading">Specs <span className="font-normal text-muted">(one per line, &quot;Fabric: 240 GSM cotton&quot;)</span><textarea rows={5} value={specs} onChange={(e) => setSpecs(e.target.value)} className={area} /></label>
        <label className="text-sm font-medium text-heading">What&apos;s in the box <span className="font-normal text-muted">(one per line)</span><textarea rows={4} value={inBox} onChange={(e) => setInBox(e.target.value)} className={area} /></label>
        <label className="text-sm font-medium text-heading">Colours <span className="font-normal text-muted">(one per line, &quot;Midnight black #141414&quot;)</span><textarea rows={4} value={colors} onChange={(e) => setColors(e.target.value)} className={area} /></label>
      </div>
      {shown?.model && (
        <div>
          <p className="text-sm font-semibold text-heading">Print artwork on the 3D model</p>
          <p className="text-xs text-muted">PNG with a transparent background works best. It replaces the default TiEEdu print on the {shown.model}.</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:max-w-xl">
            <ArtPick label="Front" url={front} onPick={(f) => upload(f, setFront)} onClear={() => setFront(null)} />
            <ArtPick label="Back" url={back} onPick={(f) => upload(f, setBack)} onClear={() => setBack(null)} />
          </div>
        </div>
      )}
      <div>
        <p className="text-sm font-semibold text-heading">Product photos <span className="font-normal text-muted">(real photos, shown next to the 3D view)</span></p>
        <div className="mt-2 flex flex-wrap gap-2">
          {gallery.map((g) => (
            <span key={g} className="relative h-20 w-20 overflow-hidden rounded-lg border border-line bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded photo preview */}
              <img src={mediaUrl(g) || ''} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => setGallery(gallery.filter((x) => x !== g))} aria-label="Remove photo" className="absolute right-1 top-1 rounded-full bg-card/90 p-0.5"><Trash2 className="h-3.5 w-3.5" aria-hidden /></button>
            </span>
          ))}
          {gallery.length < 8 && (
            <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-lg border border-dashed border-line-strong text-xs text-muted hover:bg-card">
              <span className="flex flex-col items-center gap-1"><Upload className="h-4 w-4" aria-hidden /> Add</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => upload(e.target.files?.[0], (u) => setGallery((g) => [...g, u]))} />
            </label>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-heading"><input type="checkbox" checked={promo} onChange={(e) => setPromo(e.target.checked)} /> Show in the home-page promo</label>
        <span className="flex-1" />
        <a href={`/rewards?item=${encodeURIComponent(item.id)}#store`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-link"><ExternalLink className="h-4 w-4" aria-hidden /> Preview</a>
        <button type="button" onClick={save} disabled={!!busy} className="btn btn-primary focus-ring inline-flex min-h-[36px] items-center gap-1 px-3 disabled:opacity-50"><Save className="h-4 w-4" aria-hidden /> {busy === 'save' ? 'Saving…' : busy === 'upload' ? 'Uploading…' : 'Save showcase'}</button>
      </div>
      {msg && <p className="text-sm text-muted" role="status">{msg}</p>}
    </div>
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
  const [promoOn, setPromoOn] = useState(true);
  const [error, setError] = useState('');
  const loadOrders = useCallback(() => { setError(''); fetchStoreOrdersAdmin(status).then(setOrders).catch((e) => setError(e.message)); }, [status]);
  const loadItems = useCallback(() => { setError(''); fetchStoreItemsAdmin().then((r) => { setItems(r.items); setPromoOn(!r.promo_off); }).catch((e) => setError(e.message)); }, []);
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
          <p className="rounded-xl bg-surface-hover p-3 text-body-md text-body">Swag shows as &quot;Launching soon&quot; until it has stock. Set the units when the vendor delivers, and switch an item on to put it on sale. Open <span className="font-semibold">Showcase</span> on a row to edit its 3D print, photos and description.</p>
          <label className="flex items-center gap-2 text-body-md text-heading">
            <input type="checkbox" checked={promoOn} onChange={(e) => { const on = e.target.checked; setPromoOn(on); setStorePromo(on).catch(() => setPromoOn(!on)); }} />
            Home-page swag promo (side card and swag strip) is on
          </label>
          {!items && !error && <BrandLoader caption="Loading items…" />}
          {items && (
            <div className="overflow-x-auto rounded-2xl border border-line bg-card">
              <table className="w-full min-w-[860px] text-left">
                <thead className="text-sm text-muted"><tr><th className="px-3 py-3" /><th className="px-3 py-3 font-medium">Item</th><th className="px-3 py-3 font-medium">Price</th><th className="px-3 py-3 font-medium">Stock</th><th className="px-3 py-3 font-medium">Shown</th><th className="px-3 py-3" /></tr></thead>
                <tbody>{items.map((i) => <ItemRow key={i.id} item={i} onShowcaseSaved={loadItems} onSaved={(n) => setItems((list) => list && list.map((x) => (x.id === n.id ? { ...n, shown: x.shown } : x)))} />)}</tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};
