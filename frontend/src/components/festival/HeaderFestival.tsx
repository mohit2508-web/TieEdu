import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { useFestival } from '@/lib/festival';
import { FestivalBar } from './FestivalBar';
import { Diya, Toran } from './Ornaments';
import { crackle } from './festivalSound';

const istDay = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
const BAR_KEY = () => `tieedu_diwali_bar_hidden_${istDay()}`;

const isSchool = (p: string) => p === '/school' || p.startsWith('/school/');

/**
 * The festive layer inside the fixed header: the sale strip above the nav and
 * the marigold toran hanging below it. Hiding the strip lasts for this
 * session and today only, so it comes back on the last day of the sale.
 */
export const HeaderFestival: React.FC = () => {
  const f = useFestival();
  const router = useRouter();
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try { setHidden(sessionStorage.getItem(BAR_KEY()) === '1'); } catch { setHidden(false); }
  }, []);

  const show = f.active && !isSchool(router.pathname);
  const barOn = show && !hidden;

  useEffect(() => {
    const el = document.documentElement;
    if (barOn) el.dataset.festivalBar = 'on';
    else delete el.dataset.festivalBar;
    return () => { delete el.dataset.festivalBar; };
  }, [barOn]);

  if (!show) return null;
  return (
    <>
      {barOn && (
        <FestivalBar onDismiss={() => {
          try { sessionStorage.setItem(BAR_KEY(), '1'); } catch { /* private mode */ }
          setHidden(true);
        }} />
      )}
      <Toran />
    </>
  );
};

const LIT_KEY = 'tieedu_diwali_diya_lit';

/** S2 — an unlit diya in the header. Light it for a greeting. */
export const HeaderDiya: React.FC = () => {
  const f = useFestival();
  const { user } = useAuth();
  const [lit, setLit] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => {
    try { setLit(localStorage.getItem(LIT_KEY) === '1'); } catch { /* ignore */ }
  }, []);

  if (!f.active) return null;

  const light = () => {
    setLit(true);
    try { localStorage.setItem(LIT_KEY, '1'); } catch { /* ignore */ }
    crackle(600);
    const name = user?.name?.split(' ')[0];
    setToast(`🪔 Shubh Deepavali${name ? `, ${name}` : ''}! ${f.membership ? 'Aap TieEdu Member ho ✨' : `Aapka ${f.discount_percent}% OFF active hai`}`);
    window.setTimeout(() => setToast(''), 4200);
  };

  return (
    <span className="relative hidden sm:inline-flex">
      <button type="button" onClick={light} className="header-diya" data-lit={lit ? 'true' : 'false'}
        aria-label={lit ? 'Diya is lit — Shubh Deepavali' : 'Light the diya'} title={lit ? 'Shubh Deepavali!' : 'Diya jalao 🪔'}>
        <Diya size={30} lit={lit} />
      </button>
      {toast && (
        <span role="status" className="absolute right-0 top-12 z-50 w-64 rounded-xl px-3 py-2 text-xs font-bold text-white shadow-xl"
          style={{ background: 'linear-gradient(135deg, rgb(var(--diwali-maroon)), rgb(var(--diwali-rani)))' }}>
          {toast}
        </span>
      )}
    </span>
  );
};
