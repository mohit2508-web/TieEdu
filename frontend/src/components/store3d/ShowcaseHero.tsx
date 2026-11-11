import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, Target } from 'lucide-react';
import { CoinIcon } from '@/components/coins/CoinIcon';
import { SwagArt } from '@/components/coins/SwagArt';
import { mediaUrl, type StoreItemView, type StoreView } from '@/lib/storeApi';
import { daysLabel, daysTo } from '@/lib/storeEarn';
import { cn } from '@/lib/cn';

const Viewer3D = dynamic(() => import('./Viewer3D'), { ssr: false });
const inr = (n: number) => n.toLocaleString('en-IN');

/**
 * The store's hero stage (STORE_3D_SHOWCASE_AND_SPEED_PLAN.md §B1): the featured
 * swag turning slowly in 3D, its price and your progress, and thumbnails to
 * switch item. The 3D viewer mounts only once the stage scrolls into view.
 */
export function ShowcaseHero({ items, view, typicalPerDay, onOpen, onGoal }: {
  items: StoreItemView[]; view: StoreView; typicalPerDay: number; onOpen: (i: StoreItemView) => void; onGoal: (i: StoreItemView) => void;
}) {
  const list = items.filter((i) => i.model && i.kind === 'physical');
  // Lead with the most wanted piece that is on sale: hoodie, then the kit, then the bottle.
  const start = Math.max(0, ['hoodie', 'kit', 'bottle'].map((id) => list.findIndex((i) => i.id === id)).find((k) => k >= 0) ?? 0);
  const [idx, setIdx] = useState(start);
  const [seen, setSeen] = useState(false);
  const [failed, setFailed] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  if (!list.length) return null;
  const item = list[idx % list.length];
  const coins = view.coins ?? 0;
  const need = Math.max(0, item.coins - coins);
  const pace = view.pace && view.pace > 0 ? view.pace : typicalPerDay;

  return (
    <section className="mt-5 overflow-hidden rounded-3xl border border-line bg-card" aria-label="Featured swag">
      <div className="grid lg:grid-cols-[1.3fr_1fr] [&>*]:min-w-0">
        <div ref={stage} className="relative h-[340px] swag-stage sm:h-[420px]">
          {seen && !failed && item.model ? (
            <Viewer3D key={item.id} model={item.model} color={item.colors[0]?.hex} printFront={mediaUrl(item.print_front)} printBack={mediaUrl(item.print_back)} zoom={false} label={item.name} onFail={() => setFailed(true)} />
          ) : (
            <div className="grid h-full place-items-center p-10"><SwagArt art={item.art} image={item.image} label={item.name} className="swag-bob h-56 w-full max-w-sm" /></div>
          )}
          <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-heading px-3 py-1 text-xs font-semibold text-paper">Earn it free</span>
          {!item.in_stock && <span className="pointer-events-none absolute right-4 top-4 rounded-full bg-card px-3 py-1 text-xs font-semibold text-heading shadow-sm">Launching soon</span>}
        </div>
        <div className="flex flex-col justify-center gap-4 p-5 sm:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">TiEEdu swag</p>
            <h3 className="mt-1 font-display text-3xl font-bold leading-tight text-heading">{item.name}</h3>
            <p className="mt-2 text-body-md text-body">{item.blurb}</p>
          </div>
          <p className="flex items-center gap-2 text-3xl font-bold tabular-nums text-heading"><CoinIcon size={28} />{inr(item.coins)}</p>
          {view.signed_in ? (
            <div>
              <div className="h-2.5 overflow-hidden rounded-full bg-surface-hover"><div className="h-full rounded-full bg-signal transition-[width] duration-700" style={{ width: `${Math.min(100, (coins / item.coins) * 100)}%` }} /></div>
              <p className="mt-1.5 text-sm text-muted">{need > 0 ? <>{inr(need)} coins to go · about <span className="font-semibold text-heading">{daysLabel(daysTo(need, pace))}</span></> : 'You have enough coins for this.'}</p>
            </div>
          ) : (
            <p className="text-sm text-muted">About <span className="font-semibold text-heading">{daysLabel(daysTo(item.coins, typicalPerDay))}</span> of 30-minute practice days.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onOpen(item)} className="btn btn-primary focus-ring inline-flex min-h-[46px] items-center gap-2 px-5">See it up close <ArrowRight className="h-4 w-4" aria-hidden /></button>
            {view.signed_in && need > 0 && view.goal_item_id !== item.id && (
              <button type="button" onClick={() => onGoal(item)} className="btn btn-secondary focus-ring inline-flex min-h-[46px] items-center gap-1.5 px-4"><Target className="h-4 w-4" aria-hidden /> Set as my goal</button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Choose an item">
            {list.map((i, k) => (
              <button key={i.id} type="button" role="tab" aria-selected={k === idx % list.length} aria-label={i.name} onClick={() => { setIdx(k); setFailed(false); }}
                className={cn('grid h-16 w-16 shrink-0 place-items-center rounded-xl border-2 bg-surface-hover p-1.5 focus-ring', k === idx % list.length ? 'border-signal' : 'border-transparent hover:border-line')}>
                <SwagArt art={i.art} image={i.image} label="" className="h-full w-full" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
