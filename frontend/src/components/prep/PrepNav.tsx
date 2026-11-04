import React from 'react';
import Link from 'next/link';

/**
 * The company bar on every prep screen (INFOSYS_SE_3T_UX_PLAN §6): company
 * name and Plan · Train · Test · Track, so a student is never lost mid-flow.
 */
export type PrepTab = 'plan' | 'train' | 'test' | 'track' | 'lab';
const TABS: Array<{ key: PrepTab; label: string }> = [
  { key: 'plan', label: 'Plan' }, { key: 'train', label: 'Train' }, { key: 'test', label: 'Test' }, { key: 'track', label: 'Track' },
];
const LAB_TAB = { key: 'lab' as PrepTab, label: 'Lab' };

/** `lab`: show the Lab tab (programs with Project Pulse labs). `wide`: match the Lab's wider page. */
export const PrepNav: React.FC<{ slug: string; name: string; active?: PrepTab; onTab?: (t: PrepTab) => void; lab?: boolean; wide?: boolean }> = ({ slug, name, active, onTab, lab, wide }) => (
  <nav aria-label={`${name} prep`} className="sticky top-[var(--header-pin)] z-20 transition-[top] duration-200 motion-reduce:transition-none border-b border-line bg-card/95 backdrop-blur">
    <div className={`mx-auto flex w-full items-center gap-2 overflow-x-auto px-4 py-2 sm:px-6 ${wide ? 'max-w-[1280px] lg:px-8' : 'max-w-5xl'}`}>
      <Link href={`/prep/${slug}`} className="mr-2 shrink-0 font-display text-base font-bold text-heading">{name}</Link>
      {(lab ? [...TABS, LAB_TAB] : TABS).map((t) => {
        const cls = `shrink-0 rounded-full px-4 py-2 text-base font-semibold ${active === t.key ? 'bg-brand-ink text-white' : 'text-heading hover:bg-surface-hover'}`;
        if (t.key === 'lab') return <Link key={t.key} href={`/prep/${slug}/lab`} aria-current={active === 'lab' ? 'page' : undefined} className={cls}>{t.label}</Link>;
        return onTab
          ? <button key={t.key} type="button" onClick={() => onTab(t.key)} aria-pressed={active === t.key} className={cls}>{t.label}</button>
          : <Link key={t.key} href={`/prep/${slug}?tab=${t.key}`} className={cls}>{t.label}</Link>;
      })}
      <Link href={`/company/${slug}?view=info`} className="ml-auto shrink-0 px-2 text-base text-muted underline">Company info</Link>
    </div>
  </nav>
);
