import React, { useState } from 'react';
import Link from 'next/link';
import { Crown, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { claimMembership, useFestival } from '@/lib/festival';
import { Fireworks } from './Fireworks';
import { crackle } from './festivalSound';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const MEMBER_PERKS = [
  '3 free attempts on every company mock (instead of 1)',
  'Every company prep lesson unlocked',
  'Apply to TiEEdu internships in one tap',
  'Gold "TiEEdu Member" badge',
];

/**
 * Claim the free Diwali membership. The card flips to a gold member card with
 * a firework burst once the server confirms (S6). Signed-out visitors are sent
 * to signup and come back to /diwali.
 */
export const MembershipClaim: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { user } = useAuth();
  const f = useFestival();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [celebrate, setCelebrate] = useState(false);
  const member = f.membership;

  const claim = async () => {
    setBusy(true);
    setError('');
    try {
      await claimMembership();
      setCelebrate(true);
      crackle(1600);
    } catch (e: any) {
      setError(e?.message || 'Could not claim right now');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="member-card relative" data-flipped={member ? 'true' : 'false'}>
      {celebrate && <Fireworks mode="burst" count={6} fullscreen onDone={() => setCelebrate(false)} />}
      <div className="member-card__inner">
        {/* Front: the offer */}
        <div className="member-card__face rounded-2xl border-2 border-dashed p-5" style={{ borderColor: 'rgb(var(--diwali-gold))', background: 'rgb(var(--diwali-gold) / 0.08)' }}>
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest" style={{ color: 'rgb(var(--diwali-rani))' }}>
            <Sparkles size={14} aria-hidden /> Diwali gift
          </div>
          <h3 className="mt-1 font-display text-xl font-extrabold text-heading">FREE TiEEdu Membership · {Math.round(f.membership_days / 30)} months</h3>
          {!compact && (
            <ul className="mt-3 space-y-1.5 text-sm text-body">
              {MEMBER_PERKS.map((p) => <li key={p}>✨ {p}</li>)}
            </ul>
          )}
          {user ? (
            <button type="button" onClick={claim} disabled={busy || !f.active}
              className="btn-primary bg-signal mt-4 w-full rounded-xl px-4 py-3 text-sm font-extrabold text-on-primary disabled:opacity-60">
              {busy ? 'Claiming…' : 'Claim my free membership 🎁'}
            </button>
          ) : (
            <Link href="/signup?next=/diwali" className="btn-primary bg-signal mt-4 block w-full rounded-xl px-4 py-3 text-center text-sm font-extrabold text-on-primary">
              Sign up free & claim 🎁
            </Link>
          )}
          {error && <p role="alert" className="mt-2 text-xs font-semibold text-danger">{error}</p>}
        </div>

        {/* Back: the member card */}
        <div className="member-card__face member-card__back member-gold flex flex-col justify-between rounded-2xl p-5 text-[#2A1400] shadow-xl">
          <div className="flex items-center justify-between">
            <span className="font-display text-lg font-black tracking-wide">TiEEdu Member</span>
            <Crown size={26} aria-hidden />
          </div>
          <div>
            <p className="text-sm font-bold">{user?.name || 'Member'}</p>
            <p className="text-xs font-semibold opacity-80">
              {member ? `Valid till ${fmtDate(member.expires_at)}` : ''} · Diwali 2026
            </p>
          </div>
          <p className="text-xs font-bold">You&apos;re a TiEEdu Member now ✨ Happy Diwali!</p>
        </div>
      </div>
    </div>
  );
};
