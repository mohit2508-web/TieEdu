import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useFestival } from '@/lib/festival';
import { Diya } from './Ornaments';
import { MembershipClaim } from './MembershipClaim';
import { formatLeft, useCountdown } from './FestivalBar';

/** Today screen: the Diwali greeting and "your Diwali offer" (membership status). */
export const DiwaliTodayCard: React.FC = () => {
  const f = useFestival();
  const { user } = useAuth();
  const t = useCountdown(f.ends_at);
  if (!f.active) return null;
  const first = user?.name?.split(' ')[0];
  return (
    <section aria-label="Your Diwali offer" className="overflow-hidden rounded-2xl text-white shadow-lg"
      style={{ background: 'linear-gradient(135deg, #3B1458, #7A1530 60%, #D6246E)' }}>
      <div className="grid gap-5 p-5 sm:grid-cols-[1fr_minmax(0,320px)] sm:p-6">
        <div>
          <div className="flex gap-2" aria-hidden>{[0, 1, 2].map((i) => <Diya key={i} size={28} delay={i * 0.3} />)}</div>
          <h2 className="mt-2 font-display text-2xl font-black">
            {f.is_peak_day ? 'Shubh Deepavali' : 'Happy Diwali'}{first ? `, ${first}` : ''}! 🪔
          </h2>
          <p className="mt-1 text-sm font-semibold text-white/85">
            Har course &amp; company pack {f.discount_percent}% OFF · ends in <span className="tabular-nums text-[#FFD966]">{formatLeft(t)}</span>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/courses" className="rounded-full bg-[#FFC93C] px-4 py-2 text-sm font-black text-[#2A1400]">Courses 50% OFF</Link>
            <Link href="/diwali#internships" className="rounded-full border border-white/40 px-4 py-2 text-sm font-bold">Internships</Link>
          </div>
        </div>
        <div className="text-[color:var(--text-body)]"><MembershipClaim compact /></div>
      </div>
    </section>
  );
};
