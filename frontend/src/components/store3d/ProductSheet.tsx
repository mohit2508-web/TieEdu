import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { X, Box, Image as ImageIcon, PackageOpen, Package, Ruler, Target, Share2, Lock, CheckCircle2, Truck, Sparkles, Check } from 'lucide-react';
import { CoinIcon } from '@/components/coins/CoinIcon';
import { SwagArt } from '@/components/coins/SwagArt';
import { FrameTryOn, type Metal } from './FrameTryOn';
import type { CameraView } from './Viewer3D';
import { mediaUrl, type StoreItemView, type StoreView } from '@/lib/storeApi';
import type { CoinRuleView } from '@/lib/coinsApi';
import { planFor, daysTo, daysLabel } from '@/lib/storeEarn';
import { cn } from '@/lib/cn';

/**
 * The product popup (STORE_3D_SHOWCASE_AND_SPEED_PLAN.md §B2): a 3D stage you can
 * turn, the full description, what is in the box, and your own path to it.
 * three.js loads only when this opens (next/dynamic, no SSR).
 */
const Viewer3D = dynamic(() => import('./Viewer3D'), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center"><span className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-signal" aria-hidden /></div>,
});

const inr = (n: number) => n.toLocaleString('en-IN');
const VIEWS: Array<{ key: CameraView; label: string }> = [{ key: 'front', label: 'Front' }, { key: 'side', label: 'Side' }, { key: 'back', label: 'Back' }, { key: 'top', label: 'Top' }];

export function ProductSheet({ item, view, rules, userName, isGoal, onClose, onGet, onGoal }: {
  item: StoreItemView; view: StoreView | null; rules: CoinRuleView[] | null; userName?: string | null; isGoal: boolean;
  onClose: () => void; onGet: () => void; onGoal: () => void;
}) {
  const frame = item.action === 'frame' ? ((item.id.split('-')[1] || 'bronze') as Metal) : null;
  const [tab, setTab] = useState<'3d' | 'photos' | 'try'>(frame ? 'try' : item.model ? '3d' : 'photos');
  const [cam, setCam] = useState<{ v: CameraView; n: number }>({ v: 'front', n: 0 });
  const [color, setColor] = useState(item.colors[0]?.hex);
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState(0);
  const [failed, setFailed] = useState(false);
  const [showSizes, setShowSizes] = useState(false);
  const [shared, setShared] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Dialog basics: Escape closes, focus starts on Close, the page does not scroll behind.
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; prev?.focus?.(); };
  }, [onClose]);

  const coins = view?.coins ?? 0;
  const signedIn = !!view?.signed_in;
  const need = Math.max(0, item.coins - coins);
  const maxed = !!item.limit_per_user && (item.redeemed || 0) >= item.limit_per_user;
  const soon = item.kind === 'physical' && !item.in_stock;
  const typical = useMemo(() => (rules ? planFor(30, rules) : null), [rules]);
  const pace = view?.pace && view.pace > 0 ? view.pace : typical?.perDay || 0;
  const days = daysTo(need, pace);
  const gallery = item.gallery.map((g) => mediaUrl(g)!).concat(item.image ? [mediaUrl(item.image)!] : []);

  const share = async () => {
    const text = `I'm earning the ${item.name} on TiEEdu by practising every day.`;
    const url = `${window.location.origin}/rewards`;
    try {
      if (navigator.share) await navigator.share({ title: item.name, text, url });
      else { await navigator.clipboard.writeText(`${text} ${url}`); setShared(true); setTimeout(() => setShared(false), 2000); }
    } catch { /* cancelled */ }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="product-title" onClick={(e) => e.stopPropagation()}
        className="swag-promo-in flex max-h-[96vh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-card shadow-2xl sm:max-w-5xl sm:rounded-3xl">
        <div className="grid min-h-0 flex-1 overflow-y-auto overflow-x-hidden lg:grid-cols-[1.15fr_1fr] lg:overflow-hidden [&>*]:min-w-0">
          {/* ---- Stage */}
          <div className="relative flex min-h-[340px] flex-col overflow-hidden swag-stage sm:min-h-[440px] lg:min-h-0">
            <div className="absolute left-3 top-3 z-10 flex gap-1 rounded-full bg-card/85 p-1 shadow-sm backdrop-blur">
              {frame && <TabBtn on={tab === 'try'} onClick={() => setTab('try')} icon={<Sparkles className="h-4 w-4" />}>Try it on</TabBtn>}
              {item.model && !failed && <TabBtn on={tab === '3d'} onClick={() => setTab('3d')} icon={<Box className="h-4 w-4" />}>3D</TabBtn>}
              {(gallery.length > 0 || !item.model || failed) && !frame && <TabBtn on={tab === 'photos'} onClick={() => setTab('photos')} icon={<ImageIcon className="h-4 w-4" />}>{gallery.length ? 'Photos' : 'Picture'}</TabBtn>}
            </div>
            <div className="relative min-h-0 flex-1">
              {tab === 'try' && frame ? <FrameTryOn initial={frame} userName={userName} />
                : tab === '3d' && item.model && !failed ? (
                  <Viewer3D model={item.model} color={color} printFront={mediaUrl(item.print_front)} printBack={mediaUrl(item.print_back)} name={userName || undefined}
                    view={cam.v} viewNonce={cam.n} open={open} label={item.name} onFail={() => { setFailed(true); setTab('photos'); }} />
                ) : gallery.length ? (
                  // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded product photo
                  <img src={gallery[photo % gallery.length]} alt={`${item.name}, photo ${photo + 1} of ${gallery.length}`} className="h-full w-full object-contain p-6" />
                ) : (
                  <div className="relative grid h-full place-items-center p-10"><SwagArt art={item.art} image={null} label={item.name} className="swag-bob h-56 w-full max-w-sm" /><span className="swag-shine" aria-hidden /></div>
                )}
            </div>
            {/* Stage controls */}
            {tab === '3d' && item.model && !failed && (
              <div className="flex flex-wrap items-center justify-center gap-2 border-t border-line/60 bg-card/70 px-3 py-2.5 backdrop-blur">
                <div className="flex gap-1" role="group" aria-label="Camera view">
                  {VIEWS.map((v) => (
                    <button key={v.key} type="button" onClick={() => setCam({ v: v.key, n: cam.n + 1 })} aria-pressed={cam.v === v.key && cam.n > 0}
                      className={cn('h-8 rounded-full px-3 text-xs font-semibold focus-ring', cam.v === v.key && cam.n > 0 ? 'bg-heading text-paper' : 'bg-surface-hover text-heading hover:bg-line')}>{v.label}</button>
                  ))}
                </div>
                {item.colors.length > 1 && (
                  <div className="flex items-center gap-1.5 pl-1" role="radiogroup" aria-label="Colour">
                    {item.colors.map((c) => (
                      <button key={c.hex} type="button" role="radio" aria-checked={color === c.hex} title={c.name} aria-label={c.name} onClick={() => setColor(c.hex)}
                        className={cn('h-7 w-7 rounded-full border-2 focus-ring', color === c.hex ? 'border-signal ring-2 ring-signal/30' : 'border-line')} style={{ background: c.hex }} />
                    ))}
                  </div>
                )}
                {item.model === 'kit' && (
                  <button type="button" onClick={() => setOpen((o) => !o)} className="btn btn-primary focus-ring inline-flex h-8 items-center gap-1.5 px-3 text-xs">
                    {open ? <><Package className="h-4 w-4" aria-hidden /> Close the box</> : <><PackageOpen className="h-4 w-4" aria-hidden /> Open the box</>}
                  </button>
                )}
              </div>
            )}
            {tab === 'photos' && gallery.length > 1 && (
              <div className="flex justify-center gap-2 border-t border-line/60 bg-card/70 p-2">
                {gallery.map((g, i) => (
                  <button key={g} type="button" onClick={() => setPhoto(i)} aria-label={`Photo ${i + 1}`} className={cn('h-12 w-12 overflow-hidden rounded-lg border-2 focus-ring', i === photo ? 'border-signal' : 'border-line')}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded product photo */}
                    <img src={g} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            {tab === '3d' && <p className="pointer-events-none absolute bottom-14 left-0 right-0 text-center text-xs font-medium text-muted">Drag to turn · scroll to zoom</p>}
          </div>

          {/* ---- Details */}
          <div className="flex min-h-0 flex-col lg:overflow-y-auto">
            <div className="flex items-start gap-3 px-5 pt-5 sm:px-6">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">{item.kind === 'physical' ? 'TiEEdu swag' : 'Digital reward'}{soon ? ' · Launching soon' : ''}</p>
                <h2 id="product-title" className="mt-1 font-display text-2xl font-bold leading-tight text-heading">{item.name}</h2>
                <p className="mt-2 flex items-center gap-1.5 text-2xl font-bold tabular-nums text-heading"><CoinIcon size={24} />{inr(item.coins)}</p>
              </div>
              <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-muted hover:bg-surface-hover hover:text-heading focus-ring"><X className="h-5 w-5" aria-hidden /></button>
            </div>

            <div className="space-y-5 px-5 pb-5 pt-4 sm:px-6">
              {/* Your path to it */}
              <section className="rounded-2xl border border-line bg-surface-hover/60 p-4" aria-labelledby="path-h">
                <h3 id="path-h" className="text-sm font-semibold text-heading">{maxed ? 'You have this' : need === 0 && signedIn ? 'You can get it now' : 'Your path to it'}</h3>
                {signedIn ? (
                  <>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-card"><div className="h-full rounded-full bg-signal transition-[width] duration-700" style={{ width: `${Math.min(100, (coins / item.coins) * 100)}%` }} /></div>
                    <p className="mt-2 flex flex-wrap justify-between gap-2 text-sm text-body"><span><span className="font-semibold tabular-nums text-heading">{inr(coins)}</span> of {inr(item.coins)} coins</span>{need > 0 && <span className="font-semibold text-heading">{inr(need)} to go</span>}</p>
                    {need > 0 && pace > 0 && (
                      <p className="mt-2 text-sm text-body">At {view?.pace ? 'your pace' : 'a typical 30-minute day'} (<span className="font-semibold">{pace} coins/day</span>): <span className="font-semibold text-heading">{daysLabel(days)}</span>.</p>
                    )}
                  </>
                ) : (
                  <p className="mt-1 text-sm text-body">Practise about 30 minutes a day and you earn around <span className="font-semibold text-heading">{typical?.perDay ?? '—'} coins</span>: that is <span className="font-semibold text-heading">{typical ? daysLabel(daysTo(item.coins, typical.perDay)) : '—'}</span> to this.</p>
                )}
                {need > 0 && typical && (
                  <ul className="mt-3 space-y-1 text-sm text-body">
                    {typical.steps.slice(0, 4).map((s) => <li key={s.label} className="flex justify-between gap-3"><span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" aria-hidden />{s.label}</span><span className="tabular-nums text-muted">+{s.coins}</span></li>)}
                  </ul>
                )}
                {need > 0 && <a href="#earn" onClick={onClose} className="mt-3 inline-block text-sm font-semibold text-link hover:underline">See every way to earn</a>}
              </section>

              <p className="whitespace-pre-line text-body-md leading-relaxed text-body">{item.details}</p>

              {item.in_box.length > 0 && (
                <section aria-labelledby="box-h">
                  <h3 id="box-h" className="flex items-center gap-2 text-sm font-semibold text-heading"><PackageOpen className="h-4 w-4" aria-hidden /> {item.kind === 'physical' ? "What's in the box" : 'What you get'}</h3>
                  <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {item.in_box.map((x) => <li key={x} className="flex items-center gap-2 rounded-lg bg-surface-hover/60 px-3 py-2 text-sm text-heading"><CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden />{x}</li>)}
                  </ul>
                </section>
              )}

              {item.specs.length > 0 && (
                <dl className="divide-y divide-line overflow-hidden rounded-xl border border-line text-sm">
                  {item.specs.map(([k, v]) => <div key={k} className="flex gap-4 px-3 py-2"><dt className="w-28 shrink-0 text-muted">{k}</dt><dd className="font-medium text-heading">{v}</dd></div>)}
                </dl>
              )}

              {item.size_chart && (
                <div>
                  <button type="button" onClick={() => setShowSizes((s) => !s)} aria-expanded={showSizes} className="inline-flex items-center gap-1.5 text-sm font-semibold text-link"><Ruler className="h-4 w-4" aria-hidden /> Size guide</button>
                  {showSizes && (
                    <table className="mt-2 w-full overflow-hidden rounded-xl border border-line text-sm">
                      <thead className="bg-surface-hover text-left text-muted"><tr><th className="px-3 py-2 font-semibold">Size</th><th className="px-3 py-2 font-semibold">Chest (cm)</th><th className="px-3 py-2 font-semibold">Length (cm)</th></tr></thead>
                      <tbody className="divide-y divide-line">{item.size_chart.map((r) => <tr key={r.size}><td className="px-3 py-1.5 font-semibold text-heading">{r.size}</td><td className="px-3 py-1.5 tabular-nums">{r.chest_cm}</td><td className="px-3 py-1.5 tabular-nums">{r.length_cm}</td></tr>)}</tbody>
                    </table>
                  )}
                </div>
              )}
              {item.kind === 'physical' && <p className="flex items-start gap-2 text-xs text-muted"><Truck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> Delivery in India only, usually within 7 working days. Track it under Your orders. Swag opens 30 days after you join, with a verified email.</p>}
            </div>

            {/* Actions */}
            <div className="sticky bottom-0 mt-auto flex flex-wrap gap-2 border-t border-line bg-card/95 px-5 py-3 backdrop-blur sm:px-6">
              {!signedIn ? (
                <Link href="/signup?next=/rewards" className="btn btn-primary focus-ring flex min-h-[46px] flex-1 items-center justify-center">Sign up to start earning</Link>
              ) : maxed ? (
                <p className="flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl bg-success-soft font-semibold text-success"><CheckCircle2 className="h-4 w-4" aria-hidden /> You have this</p>
              ) : soon ? (
                <p className="flex min-h-[46px] flex-1 items-center justify-center rounded-xl bg-surface-hover font-semibold text-muted">Opens when stock arrives</p>
              ) : (
                <button type="button" onClick={onGet} disabled={need > 0} className="btn btn-primary focus-ring flex min-h-[46px] flex-1 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-55">
                  {need > 0 ? <><Lock className="h-4 w-4" aria-hidden /> {inr(need)} more coins</> : <>Get it for <CoinIcon size={16} /> {inr(item.coins)}</>}
                </button>
              )}
              {signedIn && !maxed && need > 0 && (
                <button type="button" onClick={onGoal} disabled={isGoal} className="btn btn-secondary focus-ring inline-flex min-h-[46px] items-center gap-1.5 px-4 disabled:opacity-70">
                  <Target className="h-4 w-4" aria-hidden /> {isGoal ? 'Your goal' : 'Set as my goal'}
                </button>
              )}
              <button type="button" onClick={share} className="btn btn-secondary focus-ring inline-flex min-h-[46px] items-center gap-1.5 px-4" aria-label="Share">
                <Share2 className="h-4 w-4" aria-hidden /> {shared ? 'Copied' : 'Share'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabBtn({ on, onClick, icon, children }: { on: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={cn('inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold focus-ring', on ? 'bg-heading text-paper' : 'text-heading hover:bg-surface-hover')}>
      <span aria-hidden>{icon}</span>{children}
    </button>
  );
}
