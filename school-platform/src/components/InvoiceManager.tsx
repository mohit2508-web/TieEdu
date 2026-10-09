'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

export interface BillingSchool {
  id: string;
  name: string;
  plan: string;
  invoiceCount: number;
  outstanding: number;
  paid: number;
}

export function InvoiceManager({ schools }: { schools: BillingSchool[] }) {
  const t = useTranslations('adminInvoices');
  const router = useRouter();
  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? '');
  const [seats, setSeats] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const input = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500';

  function money(paise: number) {
    return `₹${(paise / 100).toLocaleString('en-IN')}`;
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const parsedSeats = seats.trim() ? Number(seats) : undefined;
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, seats: parsedSeats }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setNotice(t('created'));
      setSeats('');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <h2 className="text-sm font-bold text-slate-900 sm:col-span-3">{t('createTitle')}</h2>
        <select className={input} value={schoolId} onChange={(e) => setSchoolId(e.target.value)} required>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <input
          className={input}
          type="number"
          min={0}
          placeholder={t('seatsPlaceholder')}
          value={seats}
          onChange={(e) => setSeats(e.target.value)}
        />
        <button disabled={busy || !schoolId} className="rounded-xl bg-sky-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
          {busy ? t('saving') : t('createBtn')}
        </button>
        {notice && <p className="text-sm text-emerald-600 sm:col-span-3">{notice}</p>}
        {error && <p className="text-sm text-red-600 sm:col-span-3">{error}</p>}
      </form>

      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {schools.length === 0 && <li className="p-4 text-sm text-slate-500">{t('empty')}</li>}
        {schools.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">{s.name}</p>
              <p className="text-xs text-slate-400">
                {s.plan} · {t('invoiceCount', { count: s.invoiceCount })}
              </p>
            </div>
            <div className="text-right text-xs">
              <p className="font-semibold text-amber-600">{t('outstanding')}: {money(s.outstanding)}</p>
              <p className="text-slate-400">{t('paid')}: {money(s.paid)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
