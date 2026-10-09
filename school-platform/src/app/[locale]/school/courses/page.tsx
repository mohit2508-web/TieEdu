import { redirect } from 'next/navigation';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { getSession } from '@/server/auth';
import { can } from '@/lib/rbac';
import { listPublishedCoursesForSchool } from '@/server/catalog-service';
import { AppNav } from '@/components/AppNav';
import { SchoolCourseManager } from '@/components/SchoolCourseManager';

export const dynamic = 'force-dynamic';

export default async function SchoolCoursesPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!session.schoolId || !can(session, 'course.assign')) redirect(`/${locale}/dashboard`);

  const t = await getTranslations('schoolCourses');
  const courses = await listPublishedCoursesForSchool(session.schoolId);

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <AppNav locale={locale} />
      <h1 className="text-2xl font-black text-slate-900">{t('title')}</h1>
      <p className="mb-5 mt-1 text-sm text-slate-500">{t('subtitle')}</p>
      <SchoolCourseManager courses={courses} />
    </main>
  );
}
