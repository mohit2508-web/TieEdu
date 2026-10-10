import React, { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { tpoRegistrations, tpoImportRoster, parseRosterText, tpoDriveFetch } from '@/lib/tpoDriveApi';
import StatusPill, { driveStatusTone } from '@/components/apple/StatusPill';
import EmptyState from '@/components/apple/EmptyState';
import { GroupedCard } from '@/components/apple/GroupedCard';

const field =
  'rounded-[10px] border-0 bg-[var(--apple-fill)] px-3 py-2 text-[13px] text-[var(--apple-label)] placeholder:text-[var(--apple-placeholder)] focus:outline-none';

const REG_STATUSES = ['registered', 'launched', 'in_progress', 'completed', 'absent', 'disqualified'];

export default function RegistrationsTab(props: { collegeId: string; driveId: string | null; notice: string | null; setNotice: (n: string | null) => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [filters, setFilters] = useState({ search: '', branch: '', batch: '', status: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [roster, setRoster] = useState('');

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    if (!props.driveId) { setRows([]); setTotal(0); setBusy(false); return; }
    try {
      const r = await tpoRegistrations(props.collegeId, props.driveId, { ...filters, page, limit });
      setRows(r.registrations || []);
      setTotal(r.total ?? 0);
    } catch (e) {
      setError((e as Error).message);
      setRows([]);
      setTotal(0);
    } finally {
      setBusy(false);
    }
  }, [props.collegeId, props.driveId, filters, page, limit]);

  useEffect(() => { void load(); }, [load]);

  const applyFilters = (patch: Partial<typeof filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  const importRoster = async () => {
    if (!props.driveId) return;
    const rolls = parseRosterText(roster);
    if (!rolls.length) return;
    setBusy(true);
    try {
      const res = await tpoDriveFetch(props.collegeId, `/${props.driveId}/registrations/import`, {
        method: 'POST',
        body: JSON.stringify({ rows: rolls.map((roll_no) => ({ roll_no })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `import ${res.status}`);
      props.setNotice(`Imported. ${data.results?.filter((x: any) => !x.skipped).length ?? 0} registered, skipped: ${data.results?.filter((x: any) => x.skipped).length ?? 0}`);
      setRoster('');
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!props.driveId) {
    return <EmptyState title="Select a drive" body="Pick a drive to see who registered, filter by branch/batch/status and import a roster." />;
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-5">
      <GroupedCard title="Import roster">
        <div className="px-4 py-4">
          <p className="text-[13px] text-[var(--apple-label-2)]">Paste roll numbers, one per line. They are matched against placement student links for this college — new registrations get rounds unlocked automatically.</p>
          <textarea
            className={`${field} mt-3 h-24 w-full resize-none`}
            placeholder={'B21CS001\nB21CS002'}
            value={roster}
            onChange={(e) => setRoster(e.target.value)}
          />
          <button
            type="button"
            disabled={busy || !parseRosterText(roster).length}
            onClick={importRoster}
            className="mt-2 inline-flex items-center rounded-[10px] px-4 py-2 text-[13px] font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-40"
            style={{ background: 'var(--apple-blue)' }}
          >
            Import {parseRosterText(roster).length || ''} roll{parseRosterText(roster).length === 1 ? '' : 's'}
          </button>
        </div>
      </GroupedCard>

      <GroupedCard title={`Registrations · ${total}`}>
        <div className="grid grid-cols-2 gap-2 px-4 pt-4 sm:grid-cols-4">
          <input className={field} placeholder="Search roll / user…" value={filters.search} onChange={(e) => applyFilters({ search: e.target.value })} />
          <input className={field} placeholder="Branch" value={filters.branch} onChange={(e) => applyFilters({ branch: e.target.value })} />
          <input className={field} placeholder="Batch (e.g. 2024)" value={filters.batch} onChange={(e) => applyFilters({ batch: e.target.value })} />
          <select className={field} value={filters.status} onChange={(e) => applyFilters({ status: e.target.value })}>
            <option value="">All statuses</option>
            {REG_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {error ? <div className="px-4 py-6 text-sm text-[var(--apple-red)]">{error}</div> : null}

        <div className="apple-scroll mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[13px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--apple-label-3)' }}>
                <th className="px-4 pb-2 font-semibold">Roll no</th>
                <th className="px-4 pb-2 font-semibold">User</th>
                <th className="px-4 pb-2 font-semibold">Status</th>
                <th className="px-4 pb-2 font-semibold">Rounds done</th>
                <th className="px-4 pb-2 text-right font-semibold">Registered</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.registration_id} style={{ borderTop: '0.5px solid var(--apple-separator)' }}>
                  <td className="px-4 py-2.5 font-semibold tabular-nums">{r.roll_no || '—'}</td>
                  <td className="px-4 py-2.5 text-[var(--apple-label-2)]">{r.user_id?.slice(0, 10)}…</td>
                  <td className="px-4 py-2.5"><StatusPill label={r.status} tone={driveStatusTone(r.status)} /></td>
                  <td className="px-4 py-2.5 tabular-nums">{r.completed_tests ?? 0}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-[var(--apple-label-2)]">
                    {r.registered_at ? new Date(r.registered_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
              {!busy && rows.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--apple-label-3)]">No registrations match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {busy ? <div className="py-4 text-center text-[13px] text-[var(--apple-label-2)]">Loading…</div> : null}

        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-[12px] tabular-nums text-[var(--apple-label-2)]">Page {page} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <PagerButton disabled={page <= 1 || busy} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft size={14} /></PagerButton>
            <PagerButton disabled={page >= totalPages || busy} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}><ChevronRight size={14} /></PagerButton>
          </div>
        </div>
      </GroupedCard>
    </div>
  );
}

function PagerButton(props: { disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-30"
      style={{ background: 'var(--apple-fill)', color: 'var(--apple-label)' }}
    >
      {props.children}
    </button>
  );
}