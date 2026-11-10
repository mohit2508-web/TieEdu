import React from 'react';
import Link from 'next/link';
import { Gift } from 'lucide-react';
import { useFestival } from '@/lib/festival';
import { Fireworks } from './Fireworks';
import { Diya, Kandil, Rangoli } from './Ornaments';
import { formatLeft, useCountdown } from './FestivalBar';
import { openDiwaliGift } from './FestivalLayer';

/**
 * The night-sky hero: ambient fireworks, floating akash kandils, a rangoli
 * that draws itself behind the headline and a live countdown. On 8 Nov (the
 * Diwali day) the sky is busier and the greeting changes (S4).
 */
export const DiwaliHero: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const f = useFestival();
  const t = useCountdown(f.ends_at);
  if (!f.active) return null;
  const peak = f.is_peak_day;

  return (
    <section
      aria-label="Diwali sale"
      className="relative isolate overflow-hidden text-white"
      style={{ background: 'radial-gradient(90% 70% at 50% 115%, rgba(255,170,40,0.28) 0%, transparent 60%), radial-gradient(120% 100% at 50% 0%, #6B1530 0%, #3A0A1C 52%, #1A050D 100%)' }}
    >
      {/* Stars */}
      <div aria-hidden className="absolute inset-0 opacity-70"
        style={{ backgroundImage: 'radial-gradient(1px 1px at 12% 22%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 72% 12%, #fff 50%, transparent 51%), radial-gradient(1.5px 1.5px at 40% 35%, #FFE08A 50%, transparent 51%), radial-gradient(1px 1px at 88% 40%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 25% 60%, #fff 50%, transparent 51%), radial-gradient(1.5px 1.5px at 60% 70%, #FFE08A 50%, transparent 51%)' }} />
      <Fireworks mode="ambient" every={peak ? 750 : 1500} />

      <Kandil className="kandil absolute left-[4%] top-0 hidden sm:block" size={64} color="#D6246E" />
      <Kandil className="kandil absolute right-[6%] top-0" size={56} color="#FF8A00" style={{ animationDelay: '1.4s' }} />
      <Kandil className="kandil absolute left-[22%] top-0 hidden lg:block" size={44} color="#2E9E6B" style={{ animationDelay: '2.6s' }} />

      <div className={`relative mx-auto flex max-w-5xl flex-col items-center px-5 text-center ${compact ? 'py-12' : 'py-16 sm:py-20'}`}>
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 opacity-60">
          <Rangoli size={compact ? 360 : 460} />
        </div>

        <p className="text-xs font-extrabold uppercase tracking-[0.35em] text-[#FFD966]">
          {peak ? '✨ Today is Diwali ✨' : 'TiEEdu Diwali Sale'}
        </p>
        <h1 className="mt-3 font-display text-4xl font-black leading-[1.05] sm:text-6xl" style={{ color: '#FFF8EE' }}>
          {peak ? 'Happy Diwali!' : 'This Diwali, light up'}{' '}
          <span className="diwali-gold-text">{peak ? 'Light up your career' : 'your career'}</span>
        </h1>
        <p className="mt-4 max-w-2xl text-base font-semibold text-white/85 sm:text-lg">
          <b className="text-[#FFD966]">{f.discount_percent}% OFF</b> every course and company pack, plus a{' '}
          <b className="text-[#FFD966]">FREE TiEEdu Membership</b> and internship opportunities.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={openDiwaliGift}
            className="inline-flex items-center gap-2 rounded-full bg-[#FFC93C] px-6 py-3 text-sm font-black text-[#2A1400] shadow-[0_10px_30px_-8px_rgba(255,201,60,0.8)] hover:bg-[#FFD966]">
            <Gift size={18} aria-hidden /> Open your gift
          </button>
          <Link href="/diwali" className="inline-flex items-center rounded-full border border-white/40 px-6 py-3 text-sm font-extrabold text-white hover:bg-white/10">
            See all offers →
          </Link>
        </div>

        <p className="mt-6 text-sm font-semibold text-white/80">
          {f.is_last_day ? 'Last chance — ends tonight at 11:59 PM · ' : 'Offer ends 10 Nov, 11:59 PM · '}
          <span className="rounded-md bg-black/30 px-2 py-0.5 tabular-nums text-[#FFD966]">{formatLeft(t)}</span>
        </p>

        <div className="mt-8 flex gap-5" aria-hidden>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => <Diya key={i} size={36} delay={i * 0.2} />)}
        </div>
      </div>
    </section>
  );
};
