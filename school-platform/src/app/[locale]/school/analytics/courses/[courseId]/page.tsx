import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { getSession } from '@/server/auth';
import { can } from '@/lib/rbac';
import { getCourseAnalytics } from '@/server/analytics-service';
import { DomainError } from '@/server/errors';
import { AppNav } from '@/components/AppNav';
import { DistributionBars, Kpi, RiskBadge } from '@/components/AnalyticsWidgets';

export const dynamic = 'force-dynamic';

export default async function CourseAnalyticsPage({
  params: { locale, courseId },
}: {
  params: { locale: string; courseId: string };
}) {
  unstable_setRequestLocale(locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!session.schoolId || !can(session, 'analytics.view')) redirect(`/${locale}/dashboard`);

  const t = await getTranslations('analytics');
  let data;
  try {
    data = await getCourseAnalytics(session.schoolId, courseId);
  } catch (err) {
    if (err instanceof DomainError && err.code === 'NOT_FOUND') notFound();
    throw err;
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-8">
      <AppNav locale={locale} />
      <Link href={`/${locale}/school/analytics`} className="text-xs font-semibold text-sky-700">
        ← {t('title')}
      </Link>
      <h1 className="mt-2 text-2xl font-black text-slate-900">{data.course.title}</h1>
      <p className="mb-5 mt-1 text-sm text-slate-500">
        {data.course.trackName ?? t('general')} · {t('modulesLessons', { modules: data.course.modules, lessons: data.course.lessons })}
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label={t('kpi.enrolled')} value={data.enrolled} />
        <Kpi label={t('kpi.avgProgress')} value={`${data.avgProgress}%`} />
        <Kpi label={t('kpi.completion')} value={`${data.completionRate}%`} />
        <Kpi label={t('kpi.quizAttempts')} value={data.quiz.attempts} />
        <Kpi label={t('kpi.quizPassRate')} value={`${data.quiz.passRate}%`} />
        <Kpi label={t('kpi.quizAvgScore')} value={`${data.quiz.avgScore}%`} />
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-bold text-slate-900">{t('progressDistribution')}</h2>
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
          <DistributionBars buckets={data.distribution} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-bold text-slate-900">{t('studentsHeader')}</h2>
        {data.students.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">{t('noStudents')}</p>
        ) : (
          <table className="mt-3 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-2">{t('student')}</th>
                <th className="px-4 py-2">{t('progress')}</th>
                <th className="px-4 py-2">{t('risk')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.students.map((s) => (
                <tr key={s.userId}>
                  <td className="px-4 py-2">
                    <Link href={`/${locale}/school/students/${s.userId}`} className="font-semibold text-sky-800">
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-sky-600" style={{ width: `${s.progressPct}%` }} />
                      </div>
                      <span className="text-xs text-slate-500">
                        {s.progressPct}% · {t('lessonsDone', { count: s.completedLessons })}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <RiskBadge level={s.risk} label={t(`risk.${s.risk}`)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
