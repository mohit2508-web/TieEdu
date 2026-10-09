import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { getSession } from '@/server/auth';
import { can } from '@/lib/rbac';
import { LogoutButton } from '@/components/LogoutButton';
import { prisma } from '@/lib/db';

// Auth + per-request cookies: never prerender this route.
export const dynamic = 'force-dynamic';

export default async function DashboardPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  const t = await getTranslations('dashboard');
  const school = session.schoolId
    ? await prisma.school.findUnique({ where: { id: session.schoolId } })
    : null;

  const rows: [string, string][] = [
    [t('school'), school?.name ?? '—'],
    [t('role'), session.platformRole ?? session.memberRole ?? '—'],
  ];
  if (session.classLevel) rows.push([t('classLevel'), session.classLevel]);
  if (session.section) rows.push(['Section', session.section]);
  if (session.rollNo) rows.push([t('rollNo'), session.rollNo]);

  const links: { href: string; label: string }[] = [
    { href: `/${locale}/catalog`, label: t('browseCatalog') },
  ];
  if (session.schoolId && can(session, 'course.learn')) {
    links.push({ href: `/${locale}/learn`, label: t('myLearning') });
  }
  if (session.schoolId && can(session, 'course.assign')) {
    links.push({ href: `/${locale}/school/courses`, label: t('manageCourses') });
  }
  if (session.schoolId && can(session, 'analytics.view')) {
    links.push({ href: `/${locale}/school/analytics`, label: t('analytics') });
  }
  if (session.schoolId && can(session, 'school.manage')) {
    links.push({ href: `/${locale}/school/teachers`, label: t('teachers') });
  }
  if (session.schoolId && can(session, 'booking.create')) {
    links.push({ href: `/${locale}/school/bookings`, label: t('bookings') });
  }
  if (session.schoolId && can(session, 'billing.pay')) {
    links.push({ href: `/${locale}/school/billing`, label: t('billing') });
  }
  if (can(session, 'content.manage')) {
    links.push({ href: `/${locale}/admin/courses`, label: t('contentAdmin') });
  }
  if (can(session, 'pricing.manage')) {
    links.push({ href: `/${locale}/admin/invoices`, label: t('invoices') });
  }
  if (can(session, 'booking.create')) {
    links.push({ href: `/${locale}/admin/bookings`, label: t('bookingQueue') });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-5 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-slate-900">
          {t('welcome', { name: session.name })}
        </h1>
        <LogoutButton />
      </header>

      <section className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-slate-500">{label}</span>
            <span className="font-semibold text-slate-800">{value}</span>
          </div>
        ))}
      </section>

      {!session.schoolId && <p className="text-sm text-amber-600">{t('noSchool')}</p>}

      <section className="grid gap-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-sky-800 hover:border-sky-300"
          >
            {l.label}
          </Link>
        ))}
      </section>

      <p className="rounded-2xl bg-sky-50 px-4 py-3 text-xs text-sky-800">{t('phaseNote')}</p>
    </main>
  );
}
