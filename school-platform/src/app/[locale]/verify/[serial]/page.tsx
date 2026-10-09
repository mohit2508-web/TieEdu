import { unstable_setRequestLocale, getTranslations } from 'next-intl/server';
import { isValidSerial } from '@/lib/certificates';
import { verifyBySerial } from '@/server/certificate-service';
import { AppNav } from '@/components/AppNav';

export const dynamic = 'force-dynamic';

export default async function VerifyPage({
  params: { locale, serial },
}: {
  params: { locale: string; serial: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('verify');

  const certificate = isValidSerial(serial) ? await verifyBySerial(serial) : null;

  return (
    <main className="mx-auto max-w-xl px-5 py-8">
      <AppNav locale={locale} />
      <h1 className="text-2xl font-black text-slate-900">{t('title')}</h1>
      <p className="mt-1 text-sm text-slate-500">{serial}</p>

      {!certificate ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-lg font-bold text-red-700">{t('notFound')}</p>
          <p className="mt-1 text-sm text-red-500">{t('notFoundHint')}</p>
        </div>
      ) : (
        <div
          className={`mt-6 rounded-2xl border p-6 ${
            certificate.revoked ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'
          }`}
        >
          <p className={`text-lg font-bold ${certificate.revoked ? 'text-amber-700' : 'text-emerald-700'}`}>
            {certificate.revoked ? t('revoked') : t('valid')}
          </p>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label={t('student')} value={certificate.studentName} />
            <Row label={t('course')} value={certificate.courseTitle} />
            <Row label={t('school')} value={certificate.schoolName} />
            <Row label={t('issuedAt')} value={new Date(certificate.issuedAt).toLocaleDateString()} />
          </dl>
        </div>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-semibold text-slate-800">{value}</dd>
    </div>
  );
}
