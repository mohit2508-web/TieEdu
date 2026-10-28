import React, { useEffect, useState } from 'react';
import { FlaskConical, Play, RotateCw, Square } from 'lucide-react';
import { Button, EmptyState, Skeleton } from '@/components/ui';
import { API_BASE_URL, apiFetch } from '@/lib/api';

/**
 * A/B experiments (F5, backend lib/experiments). Start or stop each one and
 * read the result: unique visitors shown each version, how many did the
 * success action, and whether the difference is more than chance. No winner
 * is named on too little data.
 */
interface Result {
  id: string; title: string; success: string; status: 'off' | 'running' | 'stopped'; started_at: string | null; stopped_at: string | null;
  variants: Array<{ id: string; label: string; exposures: number; conversions: number; rate: number | null }>;
  p_value: number | null; significant: boolean; verdict: string;
}

const call = async (path = '', init?: RequestInit): Promise<{ experiments: Result[] }> => {
  const res = await apiFetch(`${API_BASE_URL}/admin/experiments${path}`, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body;
};
const STATUS = { off: 'Not started', running: 'Running', stopped: 'Stopped' } as const;

export const ExperimentsTab: React.FC = () => {
  const [list, setList] = useState<Result[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => { setError(null); call().then((d) => setList(d.experiments)).catch((e) => setError(e.message)); };
  useEffect(load, []);
  const set = (id: string, status: string) =>
    call(`/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ status }) }).then((d) => setList(d.experiments)).catch((e) => setError(e.message));

  if (error) return <EmptyState icon={RotateCw} title="Experiments" note={error} action={{ label: 'Try again', onClick: load }} />;
  if (!list) return <Skeleton className="h-64 w-full" />;
  if (!list.length) return <EmptyState icon={FlaskConical} title="No experiments defined" note="Experiments are defined in backend lib/experiments." />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Each visitor always sees the same version. Counts are unique visitors; a success only counts for someone who saw a version.</p>
      {list.map((x) => (
        <div key={x.id} className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-bold text-ink-soft">{x.title}</p>
              <p className="text-xs text-gray-500">Success: {x.success} · {STATUS[x.status]}{x.started_at ? ` · started ${new Date(x.started_at).toLocaleDateString('en-IN')}` : ''}</p>
            </div>
            {x.status === 'running'
              ? <Button size="sm" kind="secondary" icon={Square} onClick={() => set(x.id, 'stopped')}>Stop</Button>
              : <Button size="sm" icon={Play} onClick={() => set(x.id, 'running')}>{x.status === 'stopped' ? 'Resume' : 'Start'}</Button>}
          </div>
          <table className="mt-4 w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-500"><th className="py-1 font-semibold">Version</th><th className="py-1 text-right font-semibold">Visitors</th><th className="py-1 text-right font-semibold">Successes</th><th className="py-1 text-right font-semibold">Rate</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {x.variants.map((v) => (
                <tr key={v.id}>
                  <td className="py-2 pr-3"><strong>{v.id.toUpperCase()}</strong> <span className="text-gray-500">{v.label}</span></td>
                  <td className="py-2 text-right tabular-nums">{v.exposures}</td>
                  <td className="py-2 text-right tabular-nums">{v.conversions}</td>
                  <td className="py-2 text-right tabular-nums">{v.rate === null ? '—' : `${v.rate}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={`mt-3 text-sm font-semibold ${x.significant ? 'text-emerald-600' : 'text-ink-soft'}`}>{x.verdict}</p>
        </div>
      ))}
    </div>
  );
};

export default ExperimentsTab;
