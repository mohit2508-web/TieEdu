import { redirect } from 'next/navigation';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { getSession } from '@/server/auth';
import { can } from '@/lib/rbac';
import { formatMoney } from '@/lib/billing';
import { getSchoolBilling } from '@/server/billing-service';
import { AppNav } from '@/components/AppNav';
import { Kpi } from '@/components/AnalyticsWidgets';

export const dynamic = 'force-dynamic';

export default async function BillingPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!session.schoolId || !can(session, 'billing.pay')) redirect(`/${locale}/dashboard`);

  const t = await getTranslations('billing');
  const billing = await getSchoolBilling(session.schoolId);

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <AppNav locale={locale} />
      <h1 className="text-2xl font-black text-slate-900">{t('title')}</h1>
      <p className="mb-5 mt-1 text-sm text-slate-500">{t('subtitle')}</p>

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label={t('plan')} value={billing.plan.label} />
        <Kpi
          label={t('seats')}
          value={`${billing.seats.used}/${billing.seats.limit}`}
          hint={billing.seats.overLimit ? t('overLimit') : t('seatsRemaining', { count: billing.seats.remaining })}
        />
        <Kpi label={t('outstanding')} value={formatMoney(billing.outstanding)} />
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-bold text-slate-900">{t('invoices')}</h2>
        {billing.invoices.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            {t('noInvoices')}
          </p>
        ) : (
          <table className="mt-3 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-2">{t('number')}</th>
                <th className="px-4 py-2">{t('amount')}</th>
                <th className="px-4 py-2">{t('statusLabel')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {billing.invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-4 py-2 font-semibold text-slate-800">{inv.number}</td>
                  <td className="px-4 py-2 text-slate-700">{formatMoney(inv.amountPaise, inv.currency)}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">{t(`status.${inv.status}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
