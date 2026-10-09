import Link from 'next/link';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default async function LandingPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('landing');
  const nav = await getTranslations('nav');
  const common = await getTranslations('common');

  const stats = [
    t('stats.classes'),
    t('stats.courses'),
    t('stats.tracks'),
    t('stats.languages'),
  ];

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-5 py-8">
      <header className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-lg font-extrabold text-sky-800">{common('appName')}</span>
          <span className="text-xs text-slate-500">{common('tagline')}</span>
        </div>
        <LanguageSwitcher />
      </header>

      <section className="rounded-3xl bg-gradient-to-br from-sky-700 to-sky-500 px-6 py-10 text-white shadow-lg">
        <h1 className="text-3xl font-black leading-tight sm:text-4xl">{t('title')}</h1>
        <p className="mt-3 max-w-xl text-sm text-sky-50 sm:text-base">{t('subtitle')}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/${locale}/login`}
            className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-sky-800 shadow hover:bg-sky-50"
          >
            {t('schoolLogin')}
          </Link>
          <Link
            href={`/${locale}/catalog`}
            className="rounded-xl border border-white/60 px-5 py-3 text-sm font-bold text-white hover:bg-white/10"
          >
            {t('browseCatalog')}
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s} className="rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm font-semibold text-slate-700">
            {s}
          </div>
        ))}
      </section>

      <footer className="mt-auto flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-400">
        <span>{nav('home')}</span>
        <span>www.tieedu.com/school · schools@tieedu.com</span>
      </footer>
    </main>
  );
}
