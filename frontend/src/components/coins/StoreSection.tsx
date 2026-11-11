import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { X, CheckCircle2, Copy, Package, Truck, Target, Gift } from 'lucide-react';
import { CoinIcon } from './CoinIcon';
import { SwagArt } from './SwagArt';
import { Segmented } from '@/components/ui/Segmented';
import { ErrorState } from '@/components/common/ErrorState';
import { BrandLoader } from '@/components/brand/BrandLoader';
import { announceCoins, setCoinGoal } from '@/lib/coinsApi';
import { cancelOrder, fetchMyOrders, fetchStore, redeemItem, ORDER_LABEL, type Address, type StoreItemView, type StoreOrder, type StoreView } from '@/lib/storeApi';
import { cn } from '@/lib/cn';
import { ProductSheet } from '@/components/store3d/ProductSheet';
import { ShowcaseHero } from '@/components/store3d/ShowcaseHero';
import { EarnGuide } from '@/components/store3d/EarnGuide';
import type { CoinRuleView } from '@/lib/coinsApi';
import { planFor } from '@/lib/storeEarn';

type Filter = 'all' | 'digital' | 'physical';
const inr = (n: number) => n.toLocaleString('en-IN');
const nice = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const field = 'mt-1 w-full rounded-lg border border-line bg-card px-3 py-2.5 text-body-md text-heading focus:border-signal focus:outline-none';

/** One store tile: a studio stage that tilts toward the pointer, the price and your progress. Click opens the product popup. */
function ItemCard({ item, view, onOpen, isGoal, onGoal }: { item: StoreItemView; view: StoreView; onOpen: () => void; isGoal: boolean; onGoal: () => void }) {
  const coins = view.coins ?? 0;
  const short = Math.max(0, item.coins - coins);
  const maxed = !!item.limit_per_user && (item.redeemed || 0) >= item.limit_per_user;
  const soon = item.kind === 'physical' && !item.in_stock;
  const pct = Math.min(100, view.signed_in ? (coins / item.coins) * 100 : 0);
  const tilt = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 10}deg`);
    e.currentTarget.style.setProperty('--rx', `${-((e.clientY - r.top) / r.height - 0.5) * 8}deg`);
  };
  const reset = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.setProperty('--rx', '0deg'); e.currentTarget.style.setProperty('--ry', '0deg'); };
  return (
    <article onMouseMove={tilt} onMouseLeave={reset}
      className={cn('swag-tilt group relative flex flex-col overflow-hidden rounded-2xl border bg-card', item.featured ? 'border-signal/50' : 'border-line')}>
      <button type="button" onClick={onOpen} aria-label={`${item.name}: see details${item.model ? ' and 3D view' : ''}`} className="relative grid h-48 place-items-center overflow-hidden swag-stage p-4 focus-ring">
        <SwagArt art={item.art} image={item.image} label={item.name} className="swag-art h-full w-full" />
        <span className="swag-shine" aria-hidden />
        {item.kind === 'physical' && !soon && <span className="absolute left-3 top-3 rounded-full bg-card px-2 py-0.5 text-xs font-semibold text-muted">TiEEdu swag</span>}
        {item.model && <span className="absolute bottom-3 right-3 rounded-full bg-heading/85 px-2 py-0.5 text-[11px] font-bold tracking-wide text-paper opacity-90 group-hover:opacity-100">3D</span>}
        {isGoal && <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-signal px-2 py-0.5 text-xs font-semibold text-on-primary"><Target className="h-3.5 w-3.5" aria-hidden /> Your goal</span>}
        {soon && <span className="absolute left-3 top-3 rounded-full bg-heading px-2 py-0.5 text-xs font-semibold text-paper">Launching soon</span>}
      </button>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-lg font-semibold text-heading">{item.name}</h3>
        <p className="mt-1 flex-1 text-body-md text-body">{item.blurb}</p>
        <p className="mt-3 flex items-center gap-1.5 text-xl font-bold tabular-nums text-heading"><CoinIcon size={20} />{inr(item.coins)}</p>
        {view.signed_in && !maxed && short > 0 && (
          <div className="mt-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-hover"><div className="h-full rounded-full bg-signal" style={{ width: `${pct}%` }} /></div>
            <p className="mt-1 flex items-center justify-between gap-2 text-sm text-muted">{inr(short)} more coins
              {!isGoal && <button type="button" onClick={onGoal} className="inline-flex items-center gap-1 font-semibold text-link hover:underline"><Target className="h-3.5 w-3.5" aria-hidden /> Set as my goal</button>}
            </p>
          </div>
        )}
        <div className="mt-3">
          {maxed ? (
            <p className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-success-soft text-body-md font-semibold text-success"><CheckCircle2 className="h-4 w-4" aria-hidden /> You have this</p>
          ) : (
            <button type="button" onClick={onOpen} className={cn('btn focus-ring flex min-h-[44px] w-full items-center justify-center gap-2', view.signed_in && short === 0 && !soon ? 'btn-primary' : 'btn-secondary')}>
              {view.signed_in && short === 0 && !soon ? 'Get it' : soon ? 'See it · launching soon' : item.model ? 'See it in 3D' : 'See details'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/** The redeem dialog: asks only what this item needs (day / company / size + address), then shows what you got. */
function RedeemDialog({ item, view, onClose, onDone, claim }: { item: StoreItemView; view: StoreView; onClose: () => void; onDone: (o: StoreOrder, coins: number) => void; claim?: string }) {
  const [day, setDay] = useState(view.repairable_days?.slice(-1)[0] || '');
  const [company, setCompany] = useState('');
  const [size, setSize] = useState('');
  const [addr, setAddr] = useState<Address>({ name: '', line1: '', line2: '', city: '', state: '', pincode: '' });
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<StoreOrder | null>(null);
  const set = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement>) => setAddr({ ...addr, [k]: e.target.value });
  const physical = item.kind === 'physical';
  const blocked = physical && !view.swag_ok;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const r = await redeemItem({ item_id: item.id, ...(claim ? { claim } : {}), ...(item.action === 'repair' ? { day } : {}), ...(item.action === 'pack' ? { company_slug: company } : {}),
        ...(physical ? { size: size || undefined, address: addr, phone } : {}) });
      setDone(r.order);
      onDone(r.order, r.coins);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-end bg-black/40 p-0 sm:place-items-center sm:p-4" role="dialog" aria-label={`Get ${item.name}`} onClick={onClose}>
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-line bg-card p-5 shadow-xl sm:max-w-lg sm:rounded-3xl sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-4">
          <div className="grid h-20 w-24 shrink-0 place-items-center rounded-xl bg-surface-hover"><SwagArt art={item.art} image={item.image} label="" className="h-full w-full" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-heading">{item.name}</p>
            {claim ? <p className="font-bold text-success">Free · your streak reward</p> : <p className="flex items-center gap-1 font-bold text-heading"><CoinIcon size={16} />{inr(item.coins)}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-muted hover:text-heading focus-ring"><X className="h-5 w-5" aria-hidden /></button>
        </div>

        {done ? (
          <div className="mt-5 space-y-3">
            <p className="flex items-center gap-2 text-lg font-semibold text-success"><CheckCircle2 className="h-5 w-5" aria-hidden /> {physical ? 'Order placed' : 'Done'}</p>
            {done.result?.coupon && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-success bg-success-soft px-4 py-3">
                <span className="font-mono text-lg font-bold text-heading">{done.result.coupon}</span>
                <button type="button" className="btn btn-secondary focus-ring min-h-[40px] gap-1 px-3" onClick={() => navigator.clipboard?.writeText(done.result!.coupon)}><Copy className="h-4 w-4" aria-hidden /> Copy</button>
              </div>
            )}
            {done.result?.coupon && <p className="text-body-md text-body">Use it at checkout on any course. It works once.</p>}
            {done.result?.slug && <p className="text-body-md text-body">The {done.result.company} pack is yours. <Link href={`/practice/companies/${done.result.slug}`} className="font-semibold text-link underline">Open the set</Link></p>}
            {done.result?.day && <p className="text-body-md text-body">{nice(done.result.day)} is filled. Your streak is now <span className="font-semibold text-heading">{done.result.streak} days</span>.</p>}
            {done.result?.until && <p className="text-body-md text-body">You are a TiEEdu member until {new Date(`${done.result.until}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', timeZone: 'UTC' })}.</p>}
            {done.result?.frame && <p className="text-body-md text-body">Your {done.result.frame} frame now shows on the leaderboard.</p>}
            {physical && <p className="text-body-md text-body">We will pack and ship it, usually within 7 working days. Track it below under Your orders.</p>}
            <button type="button" onClick={onClose} className="btn btn-primary focus-ring min-h-[44px] w-full">Close</button>
          </div>
        ) : blocked ? (
          <div className="mt-5 rounded-xl bg-surface-hover p-4 text-body-md text-body">{view.swag_reason || 'Swag is not open for your account yet.'}</div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            {item.action === 'repair' && (
              view.repairable_days?.length ? (
                <label className="block text-body-md font-medium text-heading">Which missed day?
                  <select value={day} onChange={(e) => setDay(e.target.value)} className={field}>
                    {view.repairable_days.slice().reverse().map((d) => <option key={d} value={d}>{nice(d)}</option>)}
                  </select>
                  <span className="mt-1 block text-sm font-normal text-muted">{view.repairs_left ?? 0} of 3 repairs left this month.</span>
                </label>
              ) : <p className="rounded-xl bg-success-soft p-3 text-body-md text-heading">No missed days this month. Nothing to repair.</p>
            )}
            {item.action === 'pack' && (
              <label className="block text-body-md font-medium text-heading">Which company?
                <select required value={company} onChange={(e) => setCompany(e.target.value)} className={field}>
                  <option value="">Choose a company</option>
                  {(view.pack_companies || []).map((c) => <option key={c.slug} value={c.slug}>{c.name}{c.price ? ` (₹${c.price} value)` : ''}</option>)}
                </select>
              </label>
            )}
            {physical && (
              <>
                {item.sizes && (
                  <fieldset>
                    <legend className="text-body-md font-medium text-heading">Size</legend>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {item.sizes.map((s) => {
                        const ok = item.sizes_in_stock?.includes(s);
                        return (
                          <button key={s} type="button" disabled={!ok} onClick={() => setSize(s)} aria-pressed={size === s}
                            className={cn('h-10 min-w-[48px] rounded-lg border px-3 text-body-md font-semibold focus-ring disabled:opacity-40', size === s ? 'border-signal bg-signal-soft text-signal-ink' : 'border-line text-heading')}>{s}</button>
                        );
                      })}
                    </div>
                  </fieldset>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-body-md font-medium text-heading sm:col-span-2">Full name<input required value={addr.name} onChange={set('name')} autoComplete="name" className={field} /></label>
                  <label className="text-body-md font-medium text-heading sm:col-span-2">Address<input required value={addr.line1} onChange={set('line1')} autoComplete="address-line1" className={field} /></label>
                  <label className="text-body-md font-medium text-heading sm:col-span-2">Landmark / area (optional)<input value={addr.line2} onChange={set('line2')} autoComplete="address-line2" className={field} /></label>
                  <label className="text-body-md font-medium text-heading">City<input required value={addr.city} onChange={set('city')} autoComplete="address-level2" className={field} /></label>
                  <label className="text-body-md font-medium text-heading">State<input required value={addr.state} onChange={set('state')} autoComplete="address-level1" className={field} /></label>
                  <label className="text-body-md font-medium text-heading">PIN code<input required inputMode="numeric" pattern="[1-9][0-9]{5}" value={addr.pincode} onChange={set('pincode')} autoComplete="postal-code" className={field} /></label>
                  <label className="text-body-md font-medium text-heading">Mobile<input required inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="10 digits" className={field} /></label>
                </div>
                <p className="text-sm text-muted">Delivery in India only. We use these details just to ship this order.</p>
              </>
            )}
            {error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-body-md text-danger">{error}</p>}
            <button type="submit" disabled={busy || (item.action === 'repair' && !view.repairable_days?.length) || (physical && !!item.sizes && !size)}
              className="btn btn-primary focus-ring flex min-h-[48px] w-full items-center justify-center gap-2 disabled:opacity-50">
              {busy ? 'Working…' : claim ? 'Claim it free' : <>Pay <CoinIcon size={16} /> {inr(item.coins)}</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function OrderRow({ o, onCancel }: { o: StoreOrder; onCancel: () => void }) {
  const steps: Array<StoreOrder['status']> = ['placed', 'approved', 'packed', 'shipped', 'delivered'];
  const at = steps.indexOf(o.status);
  return (
    <li className="px-4 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="min-w-0 flex-1 text-body-md font-semibold text-heading">{o.item_name}{o.size ? ` · ${o.size}` : ''}</span>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-muted"><CoinIcon size={14} />{inr(o.coins)}</span>
        <span className={cn('rounded-full px-2.5 py-0.5 text-sm font-semibold', o.status === 'delivered' ? 'bg-success-soft text-success' : ['rejected', 'cancelled'].includes(o.status) ? 'bg-surface-hover text-muted' : 'bg-signal-soft text-signal-ink')}>{ORDER_LABEL[o.status]}</span>
      </div>
      {o.kind === 'physical' && at >= 0 && (
        <ol className="mt-3 flex gap-1" aria-label="Order progress">
          {steps.map((s, i) => <li key={s} title={ORDER_LABEL[s]} className={cn('h-1.5 flex-1 rounded-full', i <= at ? 'bg-success' : 'bg-surface-hover')} />)}
        </ol>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
        <span>{new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        {o.tracking && <span className="inline-flex items-center gap-1"><Truck className="h-4 w-4" aria-hidden />{o.courier ? `${o.courier} · ` : ''}{o.tracking}</span>}
        {o.result?.coupon && <span className="font-mono text-heading">{o.result.coupon}</span>}
        {o.history.slice(-1)[0]?.note && <span>{o.history.slice(-1)[0].note}</span>}
        {o.status === 'placed' && <button type="button" onClick={onCancel} className="font-semibold text-link underline">Cancel and get coins back</button>}
      </div>
    </li>
  );
}

/** The store on /rewards (TIE_COINS_STORE_PLAN.md §4): digital rewards and TiEEdu swag. */
export function StoreSection({ signedIn, rules = null, userName = null }: { signedIn: boolean; rules?: CoinRuleView[] | null; userName?: string | null }) {
  const [view, setView] = useState<StoreView | null>(null);
  const [orders, setOrders] = useState<StoreOrder[] | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [pick, setPick] = useState<StoreItemView | null>(null);
  const [claim, setClaim] = useState<string | undefined>(undefined);
  const [detail, setDetail] = useState<StoreItemView | null>(null);
  const typical = useMemo(() => (rules ? planFor(30, rules).perDay : 25), [rules]);
  const setGoal = (i: StoreItemView) => { if (!view) return; setCoinGoal(i.id).then(() => { setView({ ...view, goal_item_id: i.id }); announceCoins([{ rule: 'goal', coins: 0, note: i.name }]); }).catch(() => undefined); };
  const load = () => { setError(''); fetchStore().then(setView).catch((e) => setError(e.message)); if (signedIn) fetchMyOrders().then((r) => setOrders(r.orders)).catch(() => setOrders([])); };
  useEffect(load, [signedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = useMemo(() => (view?.items || []).filter((i) => filter === 'all' || i.kind === filter), [view, filter]);
  // /rewards?item=<id> (from the home-page promo) opens that item's popup once the store loads.
  const [asked, setAsked] = useState<string | null>(null);
  useEffect(() => { setAsked(new URLSearchParams(window.location.search).get('item')); }, []);
  useEffect(() => {
    if (!asked || !view) return;
    const it = view.items.find((i) => i.id === asked);
    if (it) setDetail(it);
    setAsked(null);
  }, [asked, view]);

  return (
    <section id="store" className="mt-10 scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-heading">The TiEEdu Store</h2>
          <p className="mt-1 text-body-md text-body">Spend your coins on things that help you prepare, and on swag to show you did.</p>
        </div>
        <Segmented label="Show" value={filter} onChange={setFilter} items={[{ key: 'all', label: 'All' }, { key: 'digital', label: 'Rewards' }, { key: 'physical', label: 'Swag' }]} />
      </div>
      {error && <ErrorState className="mt-4" message={error} onRetry={load} />}
      {!view && !error && <BrandLoader caption="Opening the store…" />}
      {view?.claims && view.claims.length > 0 && (
        <div className="mt-5 rounded-2xl border-2 border-signal bg-signal-soft/40 p-4">
          <p className="flex items-center gap-2 text-lg font-semibold text-heading"><Gift className="h-5 w-5 text-signal-ink" aria-hidden /> Your streak rewards</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {view.claims.map((c) => (
              <li key={c.key} className="flex items-center gap-3 rounded-xl bg-card p-3">
                <span className="grid h-16 w-20 shrink-0 place-items-center rounded-lg bg-surface-hover"><SwagArt art={c.item.art} image={c.item.image} label="" className="h-full w-full" /></span>
                <span className="min-w-0 flex-1"><span className="block font-semibold text-heading">{c.title}</span><span className="block text-sm text-muted">Earned with a {c.days}-day streak</span></span>
                <button type="button" disabled={!c.item.in_stock} onClick={() => { setClaim(c.key); setPick(c.item); }} className="btn btn-primary focus-ring min-h-[40px] px-4 disabled:opacity-50">{c.item.in_stock ? 'Claim' : 'Stock soon'}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {view && filter !== 'digital' && <ShowcaseHero items={view.items} view={view} typicalPerDay={typical} onOpen={setDetail} onGoal={setGoal} />}
      {view && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((i) => (
            <ItemCard key={i.id} item={i} view={view} onOpen={() => setDetail(i)} isGoal={view.goal_item_id === i.id} onGoal={() => setGoal(i)} />
          ))}
        </div>
      )}
      {view && rules && <EarnGuide rules={rules} items={view.items} coins={view.coins ?? 0} signedIn={view.signed_in} pace={view.pace} onOpen={setDetail} />}
      {detail && (
        <ProductSheet item={detail} view={view} rules={rules} userName={userName} isGoal={view?.goal_item_id === detail.id}
          onClose={() => setDetail(null)} onGoal={() => setGoal(detail)}
          onGet={() => { const it = detail; setDetail(null); setClaim(undefined); setPick(it); }} />
      )}
      {orders && orders.length > 0 && (
        <div className="mt-10">
          <h3 className="flex items-center gap-2 font-display text-xl font-semibold text-heading"><Package className="h-5 w-5" aria-hidden /> Your orders</h3>
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
            {orders.map((o) => <OrderRow key={o.id} o={o} onCancel={() => cancelOrder(o.id).then(() => { announceCoins([{ rule: 'refund', coins: o.coins, note: 'Refund' }]); load(); }).catch(() => undefined)} />)}
          </ul>
        </div>
      )}
      {pick && view && (
        <RedeemDialog item={pick} view={view} claim={claim} onClose={() => { setPick(null); setClaim(undefined); load(); }}
          onDone={(o, coins) => { setView({ ...view, coins }); if (o.coins) announceCoins([{ rule: 'spend', coins: -o.coins, note: o.item_name }]); }} />
      )}
    </section>
  );
}
