import { redirect } from 'next/navigation';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { getSession } from '@/server/auth';
import { can } from '@/lib/rbac';
import { listSchoolsForBilling } from '@/server/billing-service';
import { AppNav } from '@/components/AppNav';
import { InvoiceManager } from '@/components/InvoiceManager';

export const dynamic = 'force-dynamic';

export default async function AdminInvoicesPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!can(session, 'pricing.manage')) redirect(`/${locale}/dashboard`);

  const t = await getTranslations('adminInvoices');
  const schools = await listSchoolsForBilling();

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <AppNav locale={locale} />
      <h1 className="text-2xl font-black text-slate-900">{t('title')}</h1>
      <p className="mb-5 mt-1 text-sm text-slate-500">{t('subtitle')}</p>
      <InvoiceManager schools={schools} />
    </main>
  );
}
