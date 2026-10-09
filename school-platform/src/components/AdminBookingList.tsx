'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

export interface AdminBooking {
  id: string;
  schoolId: string;
  schoolName: string;
  type: string;
  title: string;
  preferredAt: string;
  mode: string;
  participants: number;
  status: string;
}

export function AdminBookingList({ bookings }: { bookings: AdminBooking[] }) {
  const t = useTranslations('bookings');
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(id: string, status: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Request failed');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {bookings.length === 0 && <li className="p-4 text-sm text-slate-500">{t('emptyAll')}</li>}
        {bookings.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">{b.title}</p>
              <p className="text-xs text-slate-400">
                {b.schoolName} · {t(`type.${b.type}`)} · {t(`mode.${b.mode}`)} · {new Date(b.preferredAt).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">{t(`status.${b.status}`)}</span>
              {b.status === 'REQUESTED' && (
                <button disabled={busyId === b.id} onClick={() => setStatus(b.id, 'CONFIRMED')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                  {t('confirm')}
                </button>
              )}
              {b.status === 'CONFIRMED' && (
                <button disabled={busyId === b.id} onClick={() => setStatus(b.id, 'COMPLETED')} className="rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                  {t('complete')}
                </button>
              )}
              {(b.status === 'REQUESTED' || b.status === 'CONFIRMED') && (
                <button disabled={busyId === b.id} onClick={() => setStatus(b.id, 'CANCELLED')} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-50">
                  {t('cancel')}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
