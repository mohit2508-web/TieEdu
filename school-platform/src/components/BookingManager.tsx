'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

export interface SchoolBooking {
  id: string;
  type: string;
  title: string;
  preferredAt: string;
  mode: string;
  participants: number;
  status: string;
}

export function BookingManager({ bookings }: { bookings: SchoolBooking[] }) {
  const t = useTranslations('bookings');
  const router = useRouter();
  const [type, setType] = useState('AI_SEMINAR');
  const [title, setTitle] = useState('');
  const [preferredAt, setPreferredAt] = useState('');
  const [mode, setMode] = useState('ONLINE');
  const [participants, setParticipants] = useState('30');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const input = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500';

  async function call(url: string, init: RequestInit, okMsg: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setNotice(okMsg);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function create(e: React.FormEvent) {
    e.preventDefault();
    void call(
      '/api/school/bookings',
      {
        method: 'POST',
        body: JSON.stringify({
          type,
          title,
          preferredAt: new Date(preferredAt).toISOString(),
          mode,
          participants: Number(participants),
        }),
      },
      t('created')
    ).then(() => {
      setTitle('');
      setPreferredAt('');
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <h2 className="text-sm font-bold text-slate-900 sm:col-span-2">{t('createTitle')}</h2>
        <select className={input} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="AI_SEMINAR">{t('type.AI_SEMINAR')}</option>
          <option value="WORKSHOP">{t('type.WORKSHOP')}</option>
          <option value="TRAINER_VISIT">{t('type.TRAINER_VISIT')}</option>
        </select>
        <input className={input} placeholder={t('fieldTitle')} value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} />
        <input className={input} type="datetime-local" value={preferredAt} onChange={(e) => setPreferredAt(e.target.value)} required />
        <select className={input} value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="ONLINE">{t('mode.ONLINE')}</option>
          <option value="ONSITE">{t('mode.ONSITE')}</option>
        </select>
        <input className={input} type="number" min={0} max={100000} value={participants} onChange={(e) => setParticipants(e.target.value)} />
        <div className="sm:col-span-2">
          <button disabled={busy} className="rounded-xl bg-sky-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            {busy ? t('saving') : t('createBtn')}
          </button>
        </div>
        {notice && <p className="text-sm text-emerald-600 sm:col-span-2">{notice}</p>}
        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      </form>

      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {bookings.length === 0 && <li className="p-4 text-sm text-slate-500">{t('empty')}</li>}
        {bookings.map((b) => (
          <li key={b.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">{b.title}</p>
              <p className="text-xs text-slate-400">
                {t(`type.${b.type}`)} · {t(`mode.${b.mode}`)} · {new Date(b.preferredAt).toLocaleString()} · {b.participants} {t('participantsLabel')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-500">{t(`status.${b.status}`)}</span>
              {(b.status === 'REQUESTED' || b.status === 'CONFIRMED') && (
                <button
                  disabled={busy}
                  onClick={() => call(`/api/school/bookings/${b.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'CANCELLED' }) }, t('cancelled'))}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-50"
                >
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
