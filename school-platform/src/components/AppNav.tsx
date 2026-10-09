import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getSession } from '@/server/auth';
import { can } from '@/lib/rbac';
import { LanguageSwitcher } from './LanguageSwitcher';

export async function AppNav({ locale }: { locale: string }) {
  const session = await getSession();
  const t = await getTranslations('nav');
  const common = await getTranslations('common');

  const links: { href: string; label: string }[] = [
    { href: `/${locale}/dashboard`, label: t('dashboard') },
    { href: `/${locale}/catalog`, label: t('catalog') },
  ];
  if (session?.schoolId && can(session, 'course.learn')) {
    links.push({ href: `/${locale}/learn`, label: t('learn') });
  }
  if (session && can(session, 'content.manage')) {
    links.push({ href: `/${locale}/admin/courses`, label: t('admin') });
  }
  if (session && can(session, 'pricing.manage')) {
    links.push({ href: `/${locale}/admin/invoices`, label: t('invoices') });
  }
  if (session && can(session, 'booking.create')) {
    links.push({ href: `/${locale}/admin/bookings`, label: t('bookingQueue') });
  }
  if (session?.schoolId && can(session, 'course.assign')) {
    links.push({ href: `/${locale}/school/courses`, label: t('schoolCourses') });
  }
  if (session?.schoolId && can(session, 'analytics.view')) {
    links.push({ href: `/${locale}/school/analytics`, label: t('analytics') });
  }
  if (session?.schoolId && can(session, 'school.manage')) {
    links.push({ href: `/${locale}/school/teachers`, label: t('teachers') });
  }
  if (session?.schoolId && can(session, 'booking.create')) {
    links.push({ href: `/${locale}/school/bookings`, label: t('bookings') });
  }
  if (session?.schoolId && can(session, 'billing.pay')) {
    links.push({ href: `/${locale}/school/billing`, label: t('billing') });
  }

  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
      <div className="flex items-center gap-4">
        <Link href={`/${locale}`} className="text-sm font-extrabold text-sky-800">
          {common('appName')}
        </Link>
        <nav className="flex flex-wrap gap-3 text-sm font-semibold text-slate-500">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-sky-700">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <LanguageSwitcher />
    </header>
  );
}
