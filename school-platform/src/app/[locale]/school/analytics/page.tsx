import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { getSession } from '@/server/auth';
import { can } from '@/lib/rbac';
import { getSchoolOverview, getTeacherDashboard } from '@/server/analytics-service';
import { listPublishedCoursesForSchool } from '@/server/catalog-service';
import { AppNav } from '@/components/AppNav';
import { DistributionBars, Kpi, RiskBadge } from '@/components/AnalyticsWidgets';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!session.schoolId || !can(session, 'analytics.view')) redirect(`/${locale}/dashboard`);

  const t = await getTranslations('analytics');
  const [overview, courses] = await Promise.all([
    getSchoolOverview(session.schoolId),
    listPublishedCoursesForSchool(session.schoolId),
  ]);
  const enabled = courses.filter((c) => c.enabled);

  const teacher = session.memberRole === 'TEACHER' ? await getTeacherDashboard(session.schoolId, session.userId) : null;

  return (
    <main className="mx-auto max-w-4xl px-5 py-8">
      <AppNav locale={locale} />
      <h1 className="text-2xl font-black text-slate-900">{t('title')}</h1>
      <p className="mb-5 mt-1 text-sm text-slate-500">{t('subtitle')}</p>

      {teacher && (
        <section className="mb-8">
          <h2 className="text-sm font-bold text-slate-900">{t('myClasses')}</h2>
          {teacher.courses.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">{t('noAssignments')}</p>
          ) : (
            <ul className="mt-3 grid gap-3 sm:grid-cols-3">
              {teacher.courses.map((c) => (
                <li key={c.courseId} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-bold text-slate-800">{c.title}</p>
                  <p className="text-xs text-slate-400">{t('studentCount', { count: c.students })}</p>
                  <p className="mt-1 text-lg font-black text-sky-700">{c.avgProgress}%</p>
                </li>
              ))}
            </ul>
          )}
          {teacher.atRisk.length > 0 && (
            <>
              <h3 className="mt-4 text-sm font-bold text-slate-900">{t('atRisk')}</h3>
              <ul className="mt-2 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
                {teacher.atRisk.map((s) => (
                  <li key={`${s.userId}-${s.courseId}`} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <span className="font-semibold text-slate-800">{s.name}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{s.progressPct}%</span>
                      <RiskBadge level={s.risk} label={t(`risk.${s.risk}`)} />
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label={t('kpi.students')} value={overview.students} />
        <Kpi label={t('kpi.teachers')} value={overview.teachers} />
        <Kpi label={t('kpi.enabledCourses')} value={overview.enabledCourses} />
        <Kpi label={t('kpi.enrollments')} value={overview.enrollments} />
        <Kpi label={t('kpi.avgProgress')} value={`${overview.avgProgress}%`} />
        <Kpi label={t('kpi.completion')} value={`${overview.completionRate}%`} hint={t('kpi.activeThisWeek', { count: overview.activeThisWeek })} />
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-bold text-slate-900">{t('progressDistribution')}</h2>
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
          <DistributionBars buckets={overview.distribution} />
        </div>
      </section>

      {overview.byTrack.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-bold text-slate-900">{t('byTrack')}</h2>
          <ul className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {overview.byTrack.map((tr) => (
              <li key={tr.name} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="text-slate-700">{tr.name}</span>
                <span className="font-semibold text-slate-800">{tr.count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-bold text-slate-900">{t('courseAnalytics')}</h2>
        {enabled.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">{t('noCourses')}</p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {enabled.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/${locale}/school/analytics/courses/${c.id}`}
                  className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-sky-800 hover:border-sky-300"
                >
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
