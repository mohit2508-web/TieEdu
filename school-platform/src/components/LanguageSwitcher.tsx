'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { locales, type Locale } from '@/i18n/config';
import { cn } from '@/lib/utils';

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const switchTo = (next: Locale) => {
    if (next === locale) return;
    const segments = (pathname || '/').split('/');
    segments[1] = next;
    const target = segments.join('/') || `/${next}`;
    startTransition(() => router.replace(target));
  };

  return (
    <div className="inline-flex overflow-hidden rounded-full border border-slate-200 bg-white text-xs font-semibold">
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          disabled={pending}
          onClick={() => switchTo(l)}
          className={cn(
            'px-3 py-1 uppercase tracking-wide transition-colors',
            l === locale ? 'bg-sky-100 text-sky-800' : 'text-slate-500 hover:bg-slate-50'
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
