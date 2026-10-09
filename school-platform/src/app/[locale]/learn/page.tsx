import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { getSession } from '@/server/auth';
import { can } from '@/lib/rbac';
import { listAvailableCourses, listMyEnrollments } from '@/server/learning-service';
import { listMyCertificates } from '@/server/certificate-service';
import { AppNav } from '@/components/AppNav';
import { EnrollButton } from '@/components/EnrollButton';

export const dynamic = 'force-dynamic';

export default async function LearnPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!session.schoolId || !can(session, 'course.learn')) redirect(`/${locale}/dashboard`);

  const t = await getTranslations('learn');
  const certificatesT = await getTranslations('certificates');
  const [enrollments, available, certificates] = await Promise.all([
    listMyEnrollments(session.schoolId, session.userId),
    listAvailableCourses(session.schoolId, session.userId),
    listMyCertificates(session.schoolId, session.userId),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <AppNav locale={locale} />
      <h1 className="text-2xl font-black text-slate-900">{t('title')}</h1>
      <p className="mb-5 mt-1 text-sm text-slate-500">{t('subtitle')}</p>

      <h2 className="text-sm font-bold text-slate-900">{t('myCourses')}</h2>
      {enrollments.length === 0 ? (
        <p className="mt-2 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          {t('noEnrollments')}
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {enrollments.map((e) => (
            <li key={e.id}>
              <Link
                href={`/${locale}/learn/${e.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-4 hover:border-sky-300"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-base font-bold text-slate-900">{e.course.title}</span>
                  <span className="text-xs font-semibold text-sky-700">{e.progressPct}%</span>
                </div>
                <p className="text-xs text-slate-400">
                  {e.course.skillTrack?.name ?? t('untracked')} · {t('modules', { count: e.course._count.modules })}
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-sky-600" style={{ width: `${e.progressPct}%` }} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 text-sm font-bold text-slate-900">{certificatesT('myTitle')}</h2>
      {certificates.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{certificatesT('none')}</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {certificates.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">{c.courseTitle}</p>
                <p className="text-xs text-slate-400">{certificatesT('serial')}: {c.serial}</p>
              </div>
              <Link href={`/${locale}/verify/${c.serial}`} className="text-xs font-semibold text-sky-700">
                {certificatesT('view')}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 text-sm font-bold text-slate-900">{t('available')}</h2>
      {available.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{t('noAvailable')}</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {available.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">{c.title}</p>
                <p className="text-xs text-slate-400">
                  {c.skillTrack?.name ?? t('untracked')} · {t('modules', { count: c._count.modules })}
                </p>
              </div>
              <EnrollButton courseId={c.id} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
