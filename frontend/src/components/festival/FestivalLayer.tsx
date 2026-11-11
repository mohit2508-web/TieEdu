import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { isQuietRoute, loadFestival, useFestival } from '@/lib/festival';
import { Fireworks } from './Fireworks';

const GiftPopup = dynamic(() => import('./GiftPopup').then((m) => m.GiftPopup), { ssr: false });

const istDay = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
const GIFT_KEY = () => `tieedu_diwali_gift_${istDay()}`;
const isSchool = (p: string) => p === '/school' || p.startsWith('/school/');

/** Opens the gift popup from anywhere (e.g. the /diwali page button). */
export const openDiwaliGift = () => window.dispatchEvent(new Event('tieedu:diwali-gift'));

/**
 * Mounted once in _app. Loads the festival state (again after sign-in, for the
 * membership), puts `data-festival="diwali"` on <html> so the skin applies,
 * shows the gift popup once a day off quiet routes, and celebrates a paid
 * order with fireworks. Outside the sale it renders nothing and sets nothing.
 */
export const FestivalLayer: React.FC = () => {
  const f = useFestival();
  const router = useRouter();
  const { user } = useAuth();
  const [gift, setGift] = useState(false);
  const [party, setParty] = useState<number | null>(null);

  useEffect(() => { loadFestival(); }, [user?.id]);

  const skin = f.active && !isSchool(router.pathname);
  useEffect(() => {
    const el = document.documentElement;
    if (skin) el.dataset.festival = 'diwali';
    else delete el.dataset.festival;
  }, [skin]);

  // S1: once per day, a moment after the page settles, never mid-test.
  useEffect(() => {
    if (!f.active || !router.isReady || isQuietRoute(router.pathname)) return;
    let seen = false;
    try { seen = localStorage.getItem(GIFT_KEY()) === '1'; } catch { /* ignore */ }
    if (seen) return;
    const t = window.setTimeout(() => {
      try { localStorage.setItem(GIFT_KEY(), '1'); } catch { /* ignore */ }
      setGift(true);
    }, 2500);
    return () => window.clearTimeout(t);
  }, [f.active, router.isReady, router.pathname]);

  useEffect(() => {
    const open = () => setGift(true);
    const paid = (e: Event) => setParty((e as CustomEvent).detail?.saved ?? 0);
    window.addEventListener('tieedu:diwali-gift', open);
    window.addEventListener('tieedu:purchase', paid);
    return () => {
      window.removeEventListener('tieedu:diwali-gift', open);
      window.removeEventListener('tieedu:purchase', paid);
    };
  }, []);

  if (!f.active) return null;
  return (
    <>
      {gift && <GiftPopup onClose={() => setGift(false)} />}
      {party !== null && (
        <>
          <Fireworks mode="burst" count={9} fullscreen onDone={() => setParty(null)} />
          <div role="status" className="fixed left-1/2 top-24 z-[96] -translate-x-1/2 rounded-2xl px-5 py-3 text-center text-sm font-extrabold text-white shadow-2xl"
            style={{ background: 'linear-gradient(135deg, rgb(var(--diwali-maroon)), rgb(var(--diwali-rani)))' }}>
            🎆 Purchase complete!{party > 0 ? ` You saved ₹${party}` : ''} — Happy Diwali!
          </div>
        </>
      )}
    </>
  );
};
