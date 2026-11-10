import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Briefcase, Crown, Percent, Volume2, VolumeX, X } from 'lucide-react';
import { useFestival } from '@/lib/festival';
import { Fireworks } from './Fireworks';
import { Diya, Rangoli } from './Ornaments';
import { formatLeft, useCountdown } from './FestivalBar';
import { crackle, setSound, soundOn } from './festivalSound';
import { MembershipClaim } from './MembershipClaim';

/**
 * S1 — the Diwali gift. A wrapped box bounces in; tapping it pops the lid,
 * fires a burst and fans out the three real offers with a live countdown.
 * Esc / backdrop / ✕ close it; focus moves into the dialog and back out.
 */
export const GiftPopup: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const f = useFestival();
  const t = useCountdown(f.ends_at);
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [sound, setSoundState] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const giftRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setSoundState(soundOn());
    const prev = document.activeElement as HTMLElement | null;
    giftRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && dialogRef.current) {
        const els = dialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
        if (els.length === 0) return;
        const first = els[0], last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [onClose]);

  const unwrap = () => {
    setOpen(true);
    crackle(1800);
  };

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    setSoundState(next);
    if (next) crackle(500);
  };

  const cards = [
    { icon: <Percent size={22} />, title: `${f.discount_percent}% OFF`, sub: 'Every course & company pack', href: '/courses', cta: 'Browse courses', bg: 'linear-gradient(135deg,#D6246E,#7A1530)' },
    { icon: <Crown size={22} />, title: 'FREE Membership', sub: `${Math.round(f.membership_days / 30)} months · extra mocks + all lessons`, href: '#claim', cta: 'Claim now', bg: 'linear-gradient(135deg,#B8860B,#6B3E00)' },
    { icon: <Briefcase size={22} />, title: 'Internships', sub: 'Members apply in one tap', href: '/diwali#internships', cta: 'View', bg: 'linear-gradient(135deg,#0F6B5C,#063B33)' },
  ];

  return (
    <div className="gift-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Your Diwali gift from TiEEdu"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg overflow-hidden rounded-3xl text-white shadow-2xl"
        style={{ background: 'radial-gradient(90% 70% at 50% 115%, rgba(255,170,40,0.28) 0%, transparent 60%), radial-gradient(120% 100% at 50% 0%, #6B1530 0%, #3A0A1C 52%, #1A050D 100%)', maxHeight: '92vh', overflowY: 'auto' }}
      >
        {open && <Fireworks mode="burst" count={7} />}
        <div className="pointer-events-none absolute -right-24 -top-24 opacity-40"><Rangoli size={300} /></div>

        <div className="absolute right-3 top-3 z-10 flex gap-1">
          <button type="button" onClick={toggleSound} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20"
            aria-label={sound ? 'Turn crackle sound off' : 'Turn crackle sound on'} aria-pressed={sound}>
            {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="relative px-6 pb-6 pt-8 text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.3em] text-[#FFD966]">Happy Diwali</p>
          <h2 className="mt-1 font-display text-3xl font-black sm:text-4xl" style={{ color: '#FFF8EE' }}>
            <span className="diwali-gold-text">TiEEdu Diwali Sale</span>
          </h2>

          <AnimatePresence mode="wait">
            {!open ? (
              <motion.div key="box" exit={reduce ? undefined : { scale: 0.6, opacity: 0 }} className="mt-6 flex flex-col items-center">
                <button ref={giftRef} type="button" onClick={unwrap} className="gift-box focus-ring rounded-2xl" aria-label="Open your Diwali gift">
                  <svg width="170" height="170" viewBox="0 0 120 120" aria-hidden>
                    <g className="gift-lid">
                      <rect x="14" y="34" width="92" height="20" rx="4" fill="#E8175D" />
                      <rect x="54" y="34" width="12" height="20" fill="#FFD966" />
                      <path d="M60 34 C 44 14 30 24 42 32 Z M60 34 C 76 14 90 24 78 32 Z" fill="#FFD966" stroke="#B8860B" strokeWidth="1.5" />
                    </g>
                    <rect x="20" y="54" width="80" height="54" rx="4" fill="#C2185B" />
                    <rect x="54" y="54" width="12" height="54" fill="#FFD966" />
                    <circle cx="34" cy="72" r="3" fill="#FFD966" /><circle cx="84" cy="90" r="3" fill="#FFD966" /><circle cx="36" cy="96" r="2" fill="#FFF3B0" />
                  </svg>
                </button>
                <p className="mt-3 text-sm font-semibold text-white/85">We have a gift for you — tap to open 🎁</p>
              </motion.div>
            ) : (
              <motion.div key="offers" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} className="mt-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  {cards.map((c, i) => (
                    <motion.div
                      key={c.title}
                      initial={reduce ? false : { opacity: 0, y: 60, rotate: (i - 1) * 14, scale: 0.6 }}
                      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 160, damping: 14, delay: 0.15 + i * 0.15 }}
                      className="offer-card text-left"
                      style={{ background: c.bg }}
                    >
                      <div className="text-[#FFD966]">{c.icon}</div>
                      <p className="mt-2 font-display text-xl font-black leading-tight">{c.title}</p>
                      <p className="mt-1 text-xs font-semibold text-white/85">{c.sub}</p>
                      {c.href === '#claim' ? (
                        <a href="#claim" className="mt-3 inline-block text-xs font-extrabold text-[#FFD966] underline">{c.cta} →</a>
                      ) : (
                        <Link href={c.href} onClick={onClose} className="mt-3 inline-block text-xs font-extrabold text-[#FFD966] underline">{c.cta} →</Link>
                      )}
                    </motion.div>
                  ))}
                </div>

                <div id="claim" className="mt-5 text-left text-[color:var(--text-body)]">
                  <MembershipClaim compact />
                </div>

                <Link href="/diwali" onClick={onClose}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#FFC93C] px-6 py-3 text-sm font-black text-[#2A1400] shadow-lg hover:bg-[#FFD966]">
                  Grab the offer →
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="mt-5 text-xs font-semibold text-white/75">
            {f.is_last_day ? 'Last chance — ends tonight at 11:59 PM · ' : 'Offer ends 10 Nov, 11:59 PM · '}
            <span className="tabular-nums text-[#FFD966]">{formatLeft(t)}</span>
          </p>
          <div className="mt-3 flex justify-center gap-4" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => <Diya key={i} size={28} delay={i * 0.3} />)}
          </div>
        </div>
      </div>
    </div>
  );
};
