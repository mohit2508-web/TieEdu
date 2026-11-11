import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, ArrowRight } from 'lucide-react';
import { CoinIcon } from '@/components/coins/CoinIcon';
import { SwagArt } from '@/components/coins/SwagArt';
import { fetchStorePromo, type StorePromo } from '@/lib/storeApi';
import { daysLabel, daysTo } from '@/lib/storeEarn';

/**
 * Home-page swag promos (STORE_3D_SHOWCASE_AND_SPEED_PLAN.md §B6). Light on purpose:
 * illustrations, no WebGL; "See it in 3D" opens the product popup on /rewards.
 *
 * SwagBand: a strip of swag to earn under the coins call to action.
 * SwagPromo: a corner card ("Earn this steel bottle free"), at most once a day,
 * never in the first 12 seconds, never over an open dialog or the cookie bar, and quiet for 7 days
 * after "Not now". Admins can switch promos off (Admin → Rewards & store).
 */
const TYPICAL_PER_DAY = 25;
const KEY = 'tieedu.swagPromo';
const inr = (n: number) => n.toLocaleString('en-IN');

let promoCache: Promise<StorePromo> | null = null;
const loadPromo = () => (promoCache ||= fetchStorePromo().catch(() => ({ items: [], me: null })));

function headline(name: string) { return `Earn this ${name.replace(/^TiEEdu /, '').toLowerCase()} free`; }

export function SwagBand({ signedIn }: { signedIn: boolean }) {
  const [promo, setPromo] = useState<StorePromo | null>(null);
  useEffect(() => { loadPromo().then(setPromo); }, [signedIn]);
  if (!promo?.items.length) return null;
  const me = promo.me;
  return (
    <section className="mt-4 overflow-hidden rounded-3xl border border-line bg-card" aria-labelledby="swag-band-h">
      <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[1fr_2fr] lg:items-center [&>*]:min-w-0">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">TiEEdu swag</p>
          <h2 id="swag-band-h" className="mt-1 font-display text-2xl font-bold leading-tight text-heading">Premium swag, free with coins.</h2>
          <p className="mt-2 text-body-md text-body">Every problem and every streak day earns TiE Coins. Turn them into premium TiEEdu swag, delivered to your door.</p>
          <Link href="/rewards#store" className="btn btn-primary focus-ring mt-4 inline-flex min-h-[44px] items-center gap-2 px-5">See the store in 3D <ArrowRight className="h-4 w-4" aria-hidden /></Link>
        </div>
        <ul className="grid grid-cols-3 gap-3">
          {promo.items.slice(0, 3).map((i, k) => (
            <li key={i.id}>
              <Link href={`/rewards?item=${encodeURIComponent(i.id)}#store`} className="swag-tilt group relative block overflow-hidden rounded-2xl border border-line bg-card focus-ring">
                <span className="relative grid h-28 place-items-center swag-stage p-3 sm:h-36"><SwagArt art={i.model} image={i.image} label="" className="swag-art swag-bob h-full w-full" /><span className="swag-shine" aria-hidden /></span>
                <span className="block p-2.5 sm:p-3">
                  <span className="block truncate text-sm font-semibold text-heading">{i.name}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-muted"><CoinIcon size={12} />{inr(i.coins)}
                    <span className="ml-auto hidden sm:inline">{me ? (me.coins >= i.coins ? 'Ready' : daysLabel(daysTo(i.coins - me.coins, me.pace || TYPICAL_PER_DAY))) : daysLabel(daysTo(i.coins, TYPICAL_PER_DAY))}</span>
                  </span>
                </span>
                {k === 0 && <span className="absolute left-2 top-2 rounded-full bg-heading px-2 py-0.5 text-[11px] font-semibold text-paper">3D</span>}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function SwagPromo() {
  const [promo, setPromo] = useState<StorePromo | null>(null);
  const [show, setShow] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let state: { last?: string; snooze?: number; n?: number } = {};
    try { state = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { /* private mode */ }
    const today = new Date().toISOString().slice(0, 10);
    if (state.last === today || (state.snooze && Date.now() < state.snooze)) return;
    // Wait out the cookie choice bar (same corner) and any open dialog; give up after ~3 minutes.
    let tries = 0;
    let t = 0;
    const attempt = async () => {
      if (document.querySelector('section[aria-label="Cookie choice"], [aria-modal="true"]')) {
        if (++tries < 60) t = window.setTimeout(attempt, 3000);
        return;
      }
      const p = await loadPromo();
      if (!p.items.length) return;
      setPromo(p);
      setIdx((state.n || 0) % p.items.length);
      setShow(true);
      try { localStorage.setItem(KEY, JSON.stringify({ ...state, last: today, n: (state.n || 0) + 1 })); } catch { /* private mode */ }
    };
    t = window.setTimeout(attempt, 12000);
    return () => window.clearTimeout(t);
  }, []);

  if (!show || !promo) return null;
  const i = promo.items[idx];
  const me = promo.me;
  const close = (snooze: boolean) => {
    setShow(false);
    if (snooze) try { const s = JSON.parse(localStorage.getItem(KEY) || '{}'); localStorage.setItem(KEY, JSON.stringify({ ...s, snooze: Date.now() + 7 * 86_400_000 })); } catch { /* private mode */ }
  };
  return (
    <aside className="swag-promo-in fixed inset-x-3 bottom-3 z-[55] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[360px]" role="complementary" aria-label="TiEEdu swag">
      <div className="overflow-hidden rounded-3xl border border-line bg-card shadow-2xl">
        <div className="relative grid h-36 place-items-center swag-stage p-3">
          <SwagArt art={i.model} image={i.image} label={i.name} className="swag-bob h-full w-full" />
          <button type="button" onClick={() => close(false)} aria-label="Close" className="absolute right-2 top-2 rounded-full bg-card/80 p-1.5 text-muted hover:text-heading focus-ring"><X className="h-4 w-4" aria-hidden /></button>
          <span className="absolute left-3 top-3 rounded-full bg-heading px-2.5 py-0.5 text-xs font-semibold text-paper">Free with coins</span>
        </div>
        <div className="p-4">
          <p className="font-display text-xl font-bold leading-tight text-heading">{headline(i.name)}</p>
          {me ? (
            <>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-hover"><div className="h-full rounded-full bg-signal" style={{ width: `${Math.min(100, (me.coins / i.coins) * 100)}%` }} /></div>
              <p className="mt-1.5 text-sm text-body">{me.coins >= i.coins ? 'You have enough coins. Go get it!' : <>You&rsquo;re <span className="font-semibold text-heading">{inr(i.coins - me.coins)} coins</span> away · about {daysLabel(daysTo(i.coins - me.coins, me.pace || TYPICAL_PER_DAY))}.</>}</p>
            </>
          ) : (
            <p className="mt-1.5 text-sm text-body">Practise about 30 minutes a day and it&rsquo;s yours in <span className="font-semibold text-heading">{daysLabel(daysTo(i.coins, TYPICAL_PER_DAY))}</span>. <span className="inline-flex items-center gap-1 font-semibold text-heading"><CoinIcon size={13} />{inr(i.coins)}</span></p>
          )}
          <div className="mt-3 flex gap-2">
            <Link href={`/rewards?item=${encodeURIComponent(i.id)}#store`} onClick={() => setShow(false)} className="btn btn-primary focus-ring inline-flex min-h-[42px] flex-1 items-center justify-center gap-1.5">See it in 3D <ArrowRight className="h-4 w-4" aria-hidden /></Link>
            <button type="button" onClick={() => close(true)} className="btn btn-secondary focus-ring min-h-[42px] px-4">Not now</button>
          </div>
        </div>
      </div>
    </aside>
  );
}
