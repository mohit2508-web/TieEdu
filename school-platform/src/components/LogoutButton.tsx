'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const logout = () => {
    startTransition(async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push(`/${locale}/login`);
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={logout}
      disabled={pending}
      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
    >
      {t('logout')}
    </button>
  );
}
