import { redirect } from 'next/navigation';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { getSession } from '@/server/auth';
import { can } from '@/lib/rbac';
import { listAssignments, listTeachers } from '@/server/teacher-service';
import { listPublishedCoursesForSchool } from '@/server/catalog-service';
import { AppNav } from '@/components/AppNav';
import { TeacherAssignmentManager } from '@/components/TeacherAssignmentManager';

export const dynamic = 'force-dynamic';

export default async function TeachersPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!session.schoolId || !can(session, 'school.manage')) redirect(`/${locale}/dashboard`);

  const t = await getTranslations('teachers');
  const [teachers, assignments, courses] = await Promise.all([
    listTeachers(session.schoolId),
    listAssignments(session.schoolId),
    listPublishedCoursesForSchool(session.schoolId),
  ]);
  const enabled = courses.filter((c) => c.enabled).map((c) => ({ id: c.id, title: c.title }));

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <AppNav locale={locale} />
      <h1 className="text-2xl font-black text-slate-900">{t('title')}</h1>
      <p className="mb-5 mt-1 text-sm text-slate-500">{t('subtitle')}</p>
      <TeacherAssignmentManager teachers={teachers} courses={enabled} assignments={assignments} />
    </main>
  );
}
