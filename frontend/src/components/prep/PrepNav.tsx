import React from 'react';
import Link from 'next/link';

/**
 * The company bar on every prep screen (INFOSYS_SE_3T_UX_PLAN §6): company
 * name and Plan · Train · Test · Track, so a student is never lost mid-flow.
 */
export type PrepTab = 'plan' | 'train' | 'test' | 'track';
const TABS: Array<{ key: PrepTab; label: string }> = [
  { key: 'plan', label: 'Plan' }, { key: 'train', label: 'Train' }, { key: 'test', label: 'Test' }, { key: 'track', label: 'Track' },
];

export const PrepNav: React.FC<{ slug: string; name: string; active?: PrepTab; onTab?: (t: PrepTab) => void }> = ({ slug, name, active, onTab }) => (
  <nav aria-label={`${name} prep`} className="sticky top-[var(--header-pin)] z-20 transition-[top] duration-200 motion-reduce:transition-none border-b border-line bg-card/95 backdrop-blur">
    <div className="mx-auto flex w-full max-w-5xl items-center gap-2 overflow-x-auto px-4 py-2 sm:px-6">
      <Link href={`/prep/${slug}`} className="mr-2 shrink-0 font-display text-base font-bold text-heading">{name}</Link>
      {TABS.map((t) => {
        const cls = `shrink-0 rounded-full px-4 py-2 text-base font-semibold ${active === t.key ? 'bg-brand-ink text-white' : 'text-heading hover:bg-surface-hover'}`;
        return onTab
          ? <button key={t.key} type="button" onClick={() => onTab(t.key)} aria-pressed={active === t.key} className={cls}>{t.label}</button>
          : <Link key={t.key} href={`/prep/${slug}?tab=${t.key}`} className={cls}>{t.label}</Link>;
      })}
      <Link href={`/company/${slug}?view=info`} className="ml-auto shrink-0 px-2 text-base text-muted underline">Company info</Link>
    </div>
  </nav>
);
