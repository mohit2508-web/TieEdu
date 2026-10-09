import { redirect } from 'next/navigation';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { getSession } from '@/server/auth';
import { can } from '@/lib/rbac';
import { listAllBookings } from '@/server/booking-service';
import { AppNav } from '@/components/AppNav';
import { AdminBookingList } from '@/components/AdminBookingList';

export const dynamic = 'force-dynamic';

export default async function AdminBookingsPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!can(session, 'booking.create')) redirect(`/${locale}/dashboard`);

  const t = await getTranslations('bookings');
  const bookings = await listAllBookings();

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <AppNav locale={locale} />
      <h1 className="text-2xl font-black text-slate-900">{t('adminTitle')}</h1>
      <p className="mb-5 mt-1 text-sm text-slate-500">{t('adminSubtitle')}</p>
      <AdminBookingList
        bookings={bookings.map((b) => ({ ...b, preferredAt: b.preferredAt.toISOString() }))}
      />
    </main>
  );
}
