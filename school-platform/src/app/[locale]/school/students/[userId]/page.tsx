import { notFound, redirect } from 'next/navigation';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { getSession } from '@/server/auth';
import { can } from '@/lib/rbac';
import { getStudentAnalytics } from '@/server/analytics-service';
import { DomainError } from '@/server/errors';
import { AppNav } from '@/components/AppNav';
import { Kpi, RiskBadge } from '@/components/AnalyticsWidgets';

export const dynamic = 'force-dynamic';

export default async function StudentAnalyticsPage({
  params: { locale, userId },
}: {
  params: { locale: string; userId: string };
}) {
  unstable_setRequestLocale(locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!session.schoolId || !can(session, 'analytics.view')) redirect(`/${locale}/dashboard`);

  const t = await getTranslations('analytics');
  let data;
  try {
    data = await getStudentAnalytics(session.schoolId, userId);
  } catch (err) {
    if (err instanceof DomainError && err.code === 'NOT_FOUND') notFound();
    throw err;
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <AppNav locale={locale} />
      <h1 className="text-2xl font-black text-slate-900">{data.student.name}</h1>
      <p className="mb-5 mt-1 text-sm text-slate-500">
        {t('class')} {data.student.classLevel ?? '—'}
        {data.student.section ? `-${data.student.section}` : ''} · {data.student.rollNo ?? '—'}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Kpi label={t('kpi.avgProgress')} value={`${data.avgProgress}%`} />
        <Kpi label={t('kpi.courses')} value={data.courses.length} />
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-bold text-slate-900">{t('courses')}</h2>
        {data.courses.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">{t('noStudentCourses')}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.courses.map((c) => (
              <li key={c.enrollmentId} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-800">{c.title}</span>
                  <RiskBadge level={c.risk} label={t(`risk.${c.risk}`)} />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-sky-600" style={{ width: `${c.progressPct}%` }} />
                  </div>
                  <span className="text-xs text-slate-500">
                    {c.progressPct}% · {t('lessonsDone', { count: c.completedLessons })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-bold text-slate-900">{t('recentQuizzes')}</h2>
        {data.attempts.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">{t('noAttempts')}</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {data.attempts.map((a) => (
              <li key={a.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="text-slate-700">{a.lesson}</span>
                <span className={`font-semibold ${a.passed ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {a.score}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
