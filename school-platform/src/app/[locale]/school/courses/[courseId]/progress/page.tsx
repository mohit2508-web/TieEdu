import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { getSession } from '@/server/auth';
import { can } from '@/lib/rbac';
import { getCourseById } from '@/server/catalog-service';
import { getCourseRosterProgress } from '@/server/learning-service';
import { AppNav } from '@/components/AppNav';

export const dynamic = 'force-dynamic';

export default async function CourseProgressPage({
  params: { locale, courseId },
}: {
  params: { locale: string; courseId: string };
}) {
  unstable_setRequestLocale(locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!session.schoolId || !can(session, 'analytics.view')) redirect(`/${locale}/dashboard`);

  const course = await getCourseById(courseId);
  if (!course) notFound();

  const t = await getTranslations('progress');
  const students = await getCourseRosterProgress(session.schoolId, courseId);

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <AppNav locale={locale} />
      <Link href={`/${locale}/school/courses`} className="text-xs font-semibold text-sky-700">
        ← {t('back')}
      </Link>
      <h1 className="mt-2 text-2xl font-black text-slate-900">{course.title}</h1>
      <p className="mb-5 mt-1 text-sm text-slate-500">{t('subtitle')}</p>

      {students.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          {t('empty')}
        </p>
      ) : (
        <table className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-2">{t('student')}</th>
              <th className="px-4 py-2">{t('progress')}</th>
              <th className="px-4 py-2">{t('status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((s) => (
              <tr key={s.userId}>
                <td className="px-4 py-2 font-semibold text-slate-800">{s.name}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-sky-600" style={{ width: `${s.progressPct}%` }} />
                    </div>
                    <span className="text-xs text-slate-500">{s.progressPct}%</span>
                  </div>
                </td>
                <td className="px-4 py-2 text-xs text-slate-500">{t(`status.${s.status}`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
