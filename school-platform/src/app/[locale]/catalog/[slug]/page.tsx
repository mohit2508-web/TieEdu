import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { getPublishedCourseBySlug } from '@/server/catalog-service';
import { AppNav } from '@/components/AppNav';

export const dynamic = 'force-dynamic';

export default async function CourseDetailPage({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string };
}) {
  unstable_setRequestLocale(locale);
  const course = await getPublishedCourseBySlug(slug);
  if (!course) notFound();

  const t = await getTranslations('catalog');
  const lessonCount = course.modules.reduce((n, m) => n + m.lessons.length, 0);

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <AppNav locale={locale} />
      <Link href={`/${locale}/catalog`} className="text-xs font-semibold text-sky-700">
        ← {t('title')}
      </Link>

      <h1 className="mt-3 text-3xl font-black text-slate-900">{course.title}</h1>
      <p className="mt-2 text-sm text-slate-500">{course.summary}</p>

      <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
        {course.skillTrack && (
          <span className="rounded bg-sky-50 px-2 py-0.5 text-sky-800">{course.skillTrack.name}</span>
        )}
        <span className="rounded bg-slate-100 px-2 py-0.5">{t(`level.${course.level}`)}</span>
        <span className="rounded bg-slate-100 px-2 py-0.5">
          {t('grades', { min: course.gradeMin, max: course.gradeMax })}
        </span>
        <span className="rounded bg-slate-100 px-2 py-0.5">{t('modules', { count: course.modules.length })}</span>
        <span className="rounded bg-slate-100 px-2 py-0.5">{t('lessons', { count: lessonCount })}</span>
      </div>

      {course.description && (
        <p className="mt-6 whitespace-pre-line text-sm leading-6 text-slate-700">{course.description}</p>
      )}

      {course.outcomes.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-bold text-slate-900">{t('outcomes')}</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
            {course.outcomes.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-bold text-slate-900">{t('curriculum')}</h2>
        <ol className="mt-3 space-y-3">
          {course.modules.map((m, i) => (
            <li key={m.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-bold text-slate-800">
                {t('moduleNumber', { n: i + 1 })} · {m.title}
              </p>
              {m.summary && <p className="text-xs text-slate-500">{m.summary}</p>}
              <ul className="mt-2 space-y-1">
                {m.lessons.map((l) => (
                  <li key={l.id} className="flex items-center justify-between text-sm text-slate-600">
                    <span>{l.title}</span>
                    <span className="flex items-center gap-2 text-[11px] text-slate-400">
                      {l.isPreview && <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-700">{t('preview')}</span>}
                      <span>{t(`lessonKind.${l.kind}`)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
