import { redirect } from 'next/navigation';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { getSession } from '@/server/auth';
import { can } from '@/lib/rbac';
import { parseCatalogQuery } from '@/lib/catalog';
import { listCourses, listTracksWithCounts } from '@/server/catalog-service';
import { AppNav } from '@/components/AppNav';
import { AdminCourseManager } from '@/components/AdminCourseManager';

export const dynamic = 'force-dynamic';

export default async function AdminCoursesPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!can(session, 'content.manage')) redirect(`/${locale}/dashboard`);

  const t = await getTranslations('admin');
  const [tracks, result] = await Promise.all([
    listTracksWithCounts(),
    listCourses(parseCatalogQuery(new URLSearchParams()), false),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <AppNav locale={locale} />
      <h1 className="text-2xl font-black text-slate-900">{t('title')}</h1>
      <p className="mb-5 mt-1 text-sm text-slate-500">{t('subtitle')}</p>
      <AdminCourseManager
        tracks={tracks.map((tr) => ({ id: tr.id, name: tr.name }))}
        courses={result.items.map((c) => ({
          id: c.id,
          title: c.title,
          slug: c.slug,
          status: c.status,
          level: c.level,
          trackName: c.skillTrack?.name ?? null,
          moduleCount: c._count.modules,
        }))}
      />
    </main>
  );
}
