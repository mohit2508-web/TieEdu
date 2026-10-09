import { redirect } from 'next/navigation';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { getSession } from '@/server/auth';
import { can } from '@/lib/rbac';
import { listBookings } from '@/server/booking-service';
import { AppNav } from '@/components/AppNav';
import { BookingManager } from '@/components/BookingManager';

export const dynamic = 'force-dynamic';

export default async function SchoolBookingsPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!session.schoolId || !can(session, 'booking.create')) redirect(`/${locale}/dashboard`);

  const t = await getTranslations('bookings');
  const bookings = await listBookings(session.schoolId);

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <AppNav locale={locale} />
      <h1 className="text-2xl font-black text-slate-900">{t('title')}</h1>
      <p className="mb-5 mt-1 text-sm text-slate-500">{t('subtitle')}</p>
      <BookingManager
        bookings={bookings.map((b) => ({
          id: b.id,
          type: b.type,
          title: b.title,
          preferredAt: b.preferredAt.toISOString(),
          mode: b.mode,
          participants: b.participants,
          status: b.status,
        }))}
      />
    </main>
  );
}
