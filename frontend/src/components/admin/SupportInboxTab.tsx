import React, { useEffect, useState } from 'react';
import { CheckCircle2, Inbox, Mail, RotateCcw } from 'lucide-react';
import { fetchSupportRequestsApi, setSupportStatusApi, type SupportRequestRow } from '@/lib/api';

/**
 * Messages from the public contact form (/contact). Each one was also emailed
 * to the support address; this is the record, so nothing is lost when mail is
 * not configured. Reply by email, then mark it resolved.
 */
export const SupportInboxTab: React.FC = () => {
  const [rows, setRows] = useState<SupportRequestRow[] | null>(null);
  const [filter, setFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const [error, setError] = useState<string | null>(null);

  const load = () => fetchSupportRequestsApi().then((r) => setRows(r.requests)).catch((e: Error) => setError(e.message));
  useEffect(() => { load(); }, []);

  const toggle = async (r: SupportRequestRow) => {
    const next = r.status === 'open' ? 'resolved' : 'open';
    setRows((cur) => (cur ? cur.map((x) => (x.id === r.id ? { ...x, status: next } : x)) : cur));
    try {
      await setSupportStatusApi(r.id, next);
    } catch (e) {
      setError((e as Error).message);
      load();
    }
  };

  const shown = (rows || []).filter((r) => filter === 'all' || r.status === filter);
  const openCount = (rows || []).filter((r) => r.status === 'open').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          {rows === null ? 'Loading…' : `${openCount} open · ${rows.length} total`}
        </p>
        <div className="flex gap-1.5">
          {(['open', 'resolved', 'all'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold capitalize ${filter === f ? 'bg-brand-ink text-white' : 'border border-line bg-white text-gray-600'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

      {rows !== null && shown.length === 0 ? (
        <div className="rounded-3xl border border-line bg-white p-12 text-center">
          <Inbox className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm font-bold text-heading">{filter === 'open' ? 'Nothing waiting — inbox zero.' : 'No messages here.'}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {shown.map((r) => (
            <li key={r.id} className="rounded-2xl border border-line bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    {r.ref} · {r.topic} · {new Date(r.created_at).toLocaleString('en-IN')}
                  </p>
                  <p className="mt-1 font-bold text-heading">{r.name} <span className="font-normal text-gray-500">&lt;{r.email}&gt;</span></p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <a
                    href={`mailto:${r.email}?subject=${encodeURIComponent(`Re: your TiEEdu message (${r.ref})`)}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-xs font-bold text-link"
                  >
                    <Mail className="h-3.5 w-3.5" /> Reply
                  </a>
                  <button type="button" onClick={() => toggle(r)} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-ink px-3 py-2 text-xs font-bold text-white">
                    {r.status === 'open' ? <><CheckCircle2 className="h-3.5 w-3.5" /> Mark resolved</> : <><RotateCcw className="h-3.5 w-3.5" /> Reopen</>}
                  </button>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-700">{r.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
