import Link from 'next/link';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { parseCatalogQuery } from '@/lib/catalog';
import { listCourses, listTracksWithCounts } from '@/server/catalog-service';
import { AppNav } from '@/components/AppNav';

export const dynamic = 'force-dynamic';

export default async function CatalogPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('catalog');

  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) if (typeof v === 'string') usp.set(k, v);
  const query = parseCatalogQuery(usp);

  const [tracks, result] = await Promise.all([listTracksWithCounts(), listCourses(query, true)]);

  return (
    <main className="mx-auto max-w-4xl px-5 py-8">
      <AppNav locale={locale} />
      <h1 className="text-2xl font-black text-slate-900">{t('title')}</h1>
      <p className="mt-1 text-sm text-slate-500">{t('subtitle')}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href={`/${locale}/catalog`}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            query.track ? 'border-slate-200 text-slate-600' : 'border-sky-300 bg-sky-50 text-sky-800'
          }`}
        >
          {t('allTracks')}
        </Link>
        {tracks.map((track) => (
          <Link
            key={track.slug}
            href={`/${locale}/catalog?track=${track.slug}`}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              query.track === track.slug
                ? 'border-sky-300 bg-sky-50 text-sky-800'
                : 'border-slate-200 text-slate-600'
            }`}
          >
            {track.name} · {track.courseCount}
          </Link>
        ))}
      </div>

      {result.items.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          {t('empty')}
        </p>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {result.items.map((course) => (
            <li key={course.id}>
              <Link
                href={`/${locale}/catalog/${course.slug}`}
                className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 hover:border-sky-300"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                  {course.skillTrack?.name ?? t('untracked')}
                </span>
                <span className="mt-1 text-base font-bold text-slate-900">{course.title}</span>
                {course.summary && <span className="mt-1 text-sm text-slate-500">{course.summary}</span>}
                <span className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
                  <span className="rounded bg-slate-100 px-2 py-0.5">{t(`level.${course.level}`)}</span>
                  <span className="rounded bg-slate-100 px-2 py-0.5">
                    {t('grades', { min: course.gradeMin, max: course.gradeMax })}
                  </span>
                  <span className="rounded bg-slate-100 px-2 py-0.5">
                    {t('modules', { count: course._count.modules })}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
