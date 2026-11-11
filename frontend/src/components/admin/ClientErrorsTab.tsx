import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';
import { apiFetch, API_BASE_URL } from '@/lib/api';
import { BrandLoader } from '@/components/brand/BrandLoader';
import { ErrorState } from '@/components/common/ErrorState';

/** Admin → Site errors (PRACTICE_POLISH_PLAN.md §3.2): crashes students hit, grouped, with the ref they quote to support. */
interface Group { message: string; area: string; count: number; last_at: string; routes: string[] }
interface Row { ref: string; at: string; area: string; route: string; message: string; stack: string; user: string | null }
interface Data { total: number; groups: Group[]; recent: Row[] }

const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export const ClientErrorsTab: React.FC = () => {
  const [d, setD] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  const load = useCallback(() => {
    setError('');
    apiFetch(`${API_BASE_URL}/admin/client-errors`)
      .then(async (r) => { const b = await r.json(); if (!r.ok) throw new Error(b?.error || `Request failed (${r.status})`); setD(b); })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const clear = async () => {
    if (!window.confirm('Clear the whole error log?')) return;
    await apiFetch(`${API_BASE_URL}/admin/client-errors`, { method: 'DELETE' });
    load();
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!d) return <BrandLoader caption="Loading the error log…" />;
  const recent = q ? d.recent.filter((r) => `${r.ref} ${r.route} ${r.message} ${r.user || ''}`.toLowerCase().includes(q.toLowerCase())) : d.recent;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-heading">Site errors</h2>
          <p className="text-body-md text-body">{d.total ? `${d.total} crash reports kept (newest 500).` : 'No crashes reported. The error pages and boundaries report here.'}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="btn btn-secondary focus-ring inline-flex min-h-[40px] items-center gap-2 px-4"><RefreshCw className="h-4 w-4" aria-hidden /> Refresh</button>
          {d.total > 0 && <button type="button" onClick={clear} className="btn btn-secondary focus-ring inline-flex min-h-[40px] items-center gap-2 px-4"><Trash2 className="h-4 w-4" aria-hidden /> Clear</button>}
        </div>
      </div>

      {d.groups.length > 0 && (
        <section>
          <h3 className="mb-3 text-lg font-semibold text-heading">Most frequent</h3>
          <div className="overflow-x-auto rounded-xl border border-line bg-card">
            <table className="w-full min-w-[640px] text-left text-body-md">
              <thead className="text-sm text-muted"><tr><th className="px-4 py-3 font-medium">Error</th><th className="px-4 py-3 font-medium">Where</th><th className="px-4 py-3 font-medium">Times</th><th className="px-4 py-3 font-medium">Last</th></tr></thead>
              <tbody>
                {d.groups.map((g) => (
                  <tr key={`${g.area}|${g.message}`} className="border-t border-line align-top">
                    <td className="px-4 py-3 text-heading">{g.message}<p className="text-sm text-muted">{g.routes.join(' · ')}</p></td>
                    <td className="px-4 py-3 text-body">{g.area}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-heading">{g.count}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-body">{when(g.last_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {d.recent.length > 0 && (
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-heading">Latest reports</h3>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a ref, page or student" className="input focus-ring min-h-[40px] w-full max-w-xs rounded-lg border border-line bg-card px-3" />
          </div>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
            {recent.map((r) => (
              <li key={r.ref + r.at} className="px-4 py-3">
                <p className="text-body-md text-heading"><span className="font-semibold">{r.ref}</span> · {r.message}</p>
                <p className="text-sm text-muted">{when(r.at)} · {r.area} · {r.route || '—'}{r.user ? ` · ${r.user}` : ''}</p>
                {r.stack && <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-surface-hover p-2 font-mono text-xs text-body">{r.stack}</pre>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
