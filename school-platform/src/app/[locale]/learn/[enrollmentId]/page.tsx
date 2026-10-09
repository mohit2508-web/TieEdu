import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { getSession } from '@/server/auth';
import { can } from '@/lib/rbac';
import { findOwnedEnrollment, getPlayerData, LearningError } from '@/server/learning-service';
import { AppNav } from '@/components/AppNav';
import { CoursePlayer } from '@/components/CoursePlayer';

export const dynamic = 'force-dynamic';

export default async function LearnCoursePage({
  params: { locale, enrollmentId },
}: {
  params: { locale: string; enrollmentId: string };
}) {
  unstable_setRequestLocale(locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!session.schoolId || !can(session, 'course.learn')) redirect(`/${locale}/dashboard`);

  const t = await getTranslations('learn');

  let data;
  try {
    await findOwnedEnrollment(session.schoolId, enrollmentId, session.userId);
    data = await getPlayerData(session.schoolId, enrollmentId);
  } catch (err) {
    if (err instanceof LearningError && err.code === 'NOT_FOUND') notFound();
    throw err;
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-8">
      <AppNav locale={locale} />
      <Link href={`/${locale}/learn`} className="text-xs font-semibold text-sky-700">
        ← {t('title')}
      </Link>
      <h1 className="mb-1 mt-2 text-2xl font-black text-slate-900">{data.course.title}</h1>
      <p className="mb-5 text-sm text-slate-500">{data.course.summary}</p>
      <CoursePlayer data={data} />
    </main>
  );
}
