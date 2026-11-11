import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Flame, CheckCircle2, Circle, ArrowRight, Gift } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { CoinIcon } from './CoinIcon';
import { COINS_EVENT, fetchCoinSummary, fetchCoinsMe, type CoinsMe } from '@/lib/coinsApi';
import { cn } from '@/lib/cn';

/**
 * Header chip: streak flame + TiE Coins (TIE_COINS_STORE_PLAN.md §6.2). Tap for today's
 * tasks, the next streak milestone and the way to the store. Signed-in students only;
 * it refreshes when coins are earned anywhere (COINS_EVENT).
 */
export const CoinChip: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { user } = useAuth();
  const [sum, setSum] = useState<{ coins: number; streak: number; today: boolean } | null>(null);
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<CoinsMe | null>(null);
  const [bump, setBump] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    fetchCoinSummary().then((s) => setSum(s.signed_in ? { coins: s.coins, streak: s.streak, today: s.practised_today } : null)).catch(() => undefined);
  }, []);
  useEffect(() => { if (user) load(); else setSum(null); }, [user, load]);
  useEffect(() => {
    const on = () => { load(); setMe(null); setBump(true); setTimeout(() => setBump(false), 900); };
    window.addEventListener(COINS_EVENT, on);
    return () => window.removeEventListener(COINS_EVENT, on);
  }, [load]);
  useEffect(() => { if (open && !me) fetchCoinsMe().then(setMe).catch(() => undefined); }, [open, me]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  if (!user || !sum) return null;
  return (
    <div ref={box} className={cn('relative', className)}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="dialog"
        aria-label={`${sum.streak}-day streak, ${sum.coins} TiE Coins`}
        className={cn('chip inline-flex items-center gap-2 font-bold tabular-nums', bump && 'coin-bump')}>
        <span className={cn('inline-flex items-center gap-1', sum.today ? 'text-signal-hover' : 'text-muted')}>
          <Flame size={15} strokeWidth={2.4} aria-hidden fill={sum.today ? 'currentColor' : 'none'} />{sum.streak}
        </span>
        <span className="h-4 w-px bg-line" aria-hidden />
        <span className="inline-flex items-center gap-1 text-heading"><CoinIcon size={16} />{sum.coins.toLocaleString('en-IN')}</span>
      </button>

      {open && (
        <div role="dialog" aria-label="Your streak and TiE Coins" className="absolute right-0 top-[calc(100%+8px)] z-50 w-[320px] max-w-[calc(100vw-24px)] rounded-2xl border border-line bg-card p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-lg font-bold text-heading"><CoinIcon size={22} />{sum.coins.toLocaleString('en-IN')} <span className="text-sm font-semibold text-muted">TiE Coins</span></p>
            <Link href="/streak" onClick={() => setOpen(false)} className="flex items-center gap-1 rounded-lg px-1 text-body-md font-semibold text-heading hover:bg-surface-hover focus-ring"><Flame size={16} className="text-signal-hover" aria-hidden />{sum.streak} day{sum.streak === 1 ? '' : 's'}</Link>
          </div>
          <p className="mt-3 text-sm font-semibold text-muted">Today</p>
          <ul className="mt-1 space-y-1">
            {(me?.today || []).map((t) => (
              <li key={t.id}>
                <Link href={t.href} onClick={() => setOpen(false)} className="flex min-h-[40px] items-center gap-2 rounded-lg px-2 text-body-md hover:bg-surface-hover focus-ring">
                  {t.done ? <CheckCircle2 className="h-4 w-4 text-success" aria-hidden /> : <Circle className="h-4 w-4 text-muted" aria-hidden />}
                  <span className={cn('flex-1', t.done ? 'text-muted line-through' : 'text-heading')}>{t.label}</span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-signal-ink">+{t.coins}<CoinIcon size={13} /></span>
                </Link>
              </li>
            ))}
            {!me && <li className="h-24 animate-pulse rounded-lg bg-surface-hover" aria-hidden />}
          </ul>
          {me?.next_milestone && (
            <div className="mt-3 rounded-xl bg-surface-hover p-3">
              <p className="text-sm text-body"><span className="font-semibold text-heading">{me.next_milestone.days - me.streak.current} more day{me.next_milestone.days - me.streak.current === 1 ? '' : 's'}</span> to a {me.next_milestone.days}-day streak: +{me.next_milestone.coins} coins</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-card"><div className="h-full rounded-full bg-signal" style={{ width: `${Math.min(100, (me.streak.current / me.next_milestone.days) * 100)}%` }} /></div>
            </div>
          )}
          <Link href="/rewards" onClick={() => setOpen(false)} className="btn btn-primary focus-ring mt-4 flex min-h-[44px] w-full items-center justify-center gap-2">
            <Gift className="h-4 w-4" aria-hidden /> How to earn · the store <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      )}
    </div>
  );
};
