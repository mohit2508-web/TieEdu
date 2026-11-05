import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { loadFestival, timeLeft, useFestival } from '@/lib/festival';

const pad = (n: number) => String(n).padStart(2, '0');

/** Live countdown to the real end of the sale — never a fake timer. */
export function useCountdown(endsAt: string) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return now === null ? null : timeLeft(endsAt, now);
}

export function formatLeft(t: ReturnType<typeof timeLeft> | null, short = false): string {
  if (!t) return '';
  if (short) return t.days > 0 ? `${t.days}d ${t.hours}h left` : `${pad(t.hours)}:${pad(t.minutes)}:${pad(t.seconds)} left`;
  return `${t.days > 0 ? `${t.days}d ` : ''}${pad(t.hours)}:${pad(t.minutes)}:${pad(t.seconds)}`;
}

/**
 * The sticky sale strip at the very top of the header. It lives inside the
 * fixed <header>, so it slides away with it on scroll. `data-festival-bar`
 * on <html> reserves its height in --header-total.
 */
export const FestivalBar: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => {
  const f = useFestival();
  const t = useCountdown(f.ends_at);
  const over = t !== null && t.ms === 0;
  // At the deadline ask the server, which switches everything off.
  useEffect(() => { if (over) loadFestival(); }, [over]);
  return (
    <div className="festival-bar" data-last={f.is_last_day ? 'true' : 'false'} role="region" aria-label="Diwali sale">
      <span aria-hidden>🪔</span>
      <span className="hidden sm:inline">
        {f.is_last_day ? 'Last day! ' : f.is_peak_day ? 'Shubh Deepavali! ' : 'Diwali Utsav: '}
        Sab courses &amp; packs <b>{f.discount_percent}% OFF</b> + FREE TieEdu Membership
      </span>
      <span className="sm:hidden"><b>{f.discount_percent}% OFF</b> + Free Membership</span>
      <span className="festival-bar__clock hidden sm:inline" aria-live="off">
        {f.is_last_day ? 'ends tonight ' : 'ends in '}{formatLeft(t)}
      </span>
      <span className="festival-bar__clock sm:hidden">{formatLeft(t, true)}</span>
      <Link href="/diwali" className="hidden md:inline">Offer dekho →</Link>
      <Link href="/diwali" className="md:hidden" aria-label="See the Diwali offer">→</Link>
      <button type="button" className="festival-bar__close" onClick={onDismiss} aria-label="Hide the sale bar">
        <X size={14} />
      </button>
    </div>
  );
};
