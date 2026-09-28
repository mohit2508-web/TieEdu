import React, { useEffect, useState } from 'react';
import { Search, RefreshCcw, AlertTriangle, Trophy } from 'lucide-react';
import type { AdminXpResponse } from '@/types';
import { fetchXpLedger, reconcileXp } from '@/lib/coursesApi';
import { Btn, Panel, ErrorNote, OkNote, Loading, Empty, Pill, TextInput } from './CourseAdminUi';

const REASONS: Record<string, string> = {
  lesson_complete: 'Lesson completed',
  quiz_pass: 'Quiz passed',
  course_complete: 'Course completed',
  feedback_reward: 'Course feedback',
  review: 'Interview report published',
  legacy_opening_balance: 'Legacy opening balance',
  reversal: 'Reversal / correction',
};

const fmt = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
};

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

/**
 * XP ledger audit.
 *
 * The ledger is append-only and every entry carries an idempotency key, so
 * replaying a completion is a no-op. `xp_drift` compares the cached user.xp
 * against the ledger sum: it must always be empty. A non-empty list is a real
 * bug, so it is surfaced at the top rather than buried in a table.
 */
export const AdminXpTab: React.FC = () => {
  const [data, setData] = useState<AdminXpResponse | null>(null);
  const [q, setQ] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [reconcileNote, setReconcileNote] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchXpLedger({ q: q || undefined, reason: reason || undefined }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the XP ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, reason]);

  const reconcile = async () => {
    if (!window.confirm('Rewrite every user.xp from the ledger? Use this only after a manual data edit.')) return;
    setReconciling(true);
    setError(null);
    setReconcileNote(null);
    try {
      const res = await reconcileXp();
      const changed = res?.changed || [];
      setReconcileNote(
        changed.length === 0
          ? 'Nothing to fix — every cached total already matched the ledger.'
          : `Fixed ${changed.length} user${changed.length > 1 ? 's' : ''}: ${changed
              .map((c: any) => `${c.user_id} ${c.before} → ${c.after}`)
              .join(', ')}`
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reconciliation failed');
    } finally {
      setReconciling(false);
    }
  };

  const drift = data?.xp_drift || [];
  const rules = data?.xp_rules || {};

  return (
    <div className="space-y-4">
      {drift.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3.5">
          <p className="text-[13px] font-bold text-amber-900 flex items-center gap-2 mb-1.5">
            <AlertTriangle className="w-4 h-4" /> {drift.length} user{drift.length > 1 ? 's have' : ' has'} XP drift
          </p>
          <p className="text-[12.5px] text-amber-900 mb-2.5">
            The cached <code className="font-mono">user.xp</code> does not match the ledger sum. The leaderboard reads
            the ledger, so ranking is still correct, but the profile number is wrong.
          </p>
          <div className="space-y-1 mb-3">
            {drift.map((d) => (
              <div key={d.user_id} className="text-[12px] font-mono text-amber-900">
                {d.name || d.user_id}: cached {d.cached_xp}, ledger {d.ledger_xp} ({signed(d.drift)})
              </div>
            ))}
          </div>
          <Btn variant="primary" onClick={reconcile} busy={reconciling}>
            <RefreshCcw className="w-3.5 h-3.5" /> Reconcile now
          </Btn>
        </div>
      )}

      {reconcileNote && <OkNote>{reconcileNote}</OkNote>}

      <Panel
        title="XP ledger"
        subtitle={data ? `${data.total_entries} entries total` : 'Loading'}
        actions={
          <>
            <Selectish value={reason} onChange={setReason} />
            <Btn onClick={load} busy={loading}>
              <RefreshCcw className="w-3.5 h-3.5" /> Refresh
            </Btn>
          </>
        }
      >
        <div className="relative mb-4 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <TextInput
            value={q}
            placeholder="Search student, key or note"
            onChange={(e) => setQ(e.target.value)}
            className="pl-8"
          />
        </div>

        {error && (
          <div className="mb-3">
            <ErrorNote>{error}</ErrorNote>
          </div>
        )}

        {loading ? (
          <Loading label="Loading ledger" />
        ) : !data || data.entries.length === 0 ? (
          <Empty>
            No ledger entries{q || reason ? ' match this filter' : ' yet'}. XP is only ever written by a real completed
            lesson, quiz, course or review — there are no seed or placeholder points.
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] border-b border-[#EDEDEB]">
                  <th className="py-2 pr-3">When</th>
                  <th className="py-2 pr-3">Student</th>
                  <th className="py-2 pr-3">Reason</th>
                  <th className="py-2 pr-3">Earned for</th>
                  <th className="py-2 pr-3 text-right">XP</th>
                  <th className="py-2 pl-3">Idempotency key</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F2EE]">
                {data.entries.map((e) => (
                  <tr key={e.id} className="align-top">
                    <td className="py-2.5 pr-3 text-[11.5px] text-[#6B7280] whitespace-nowrap">{fmt(e.created_at)}</td>
                    <td className="py-2.5 pr-3">
                      <div className="font-bold text-[#10151C]">{e.user_name}</div>
                      <div className="text-[11px] text-[#6B7280]">{e.user_email}</div>
                    </td>
                    <td className="py-2.5 pr-3">
                      {e.reason === 'reversal' ? <Pill tone="amber">{REASONS[e.reason]}</Pill> : <Pill>{REASONS[e.reason] || e.reason}</Pill>}
                    </td>
                    <td className="py-2.5 pr-3 text-[--text-body]">
                      {e.course_title || e.lesson_title || e.note || '—'}
                    </td>
                    <td className={`py-2.5 pr-3 text-right font-mono font-bold ${e.xp < 0 ? 'text-red-700' : 'text-[#0E2A44]'}`}>
                      {signed(e.xp)}
                    </td>
                    <td className="py-2.5 pl-3 font-mono text-[10.5px] text-[#9CA3AF] break-all">{e.key}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="XP rules" subtitle="Server-authoritative. A client cannot award itself points.">
          <div className="space-y-2">
            {Object.entries(rules).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-[12.5px]">
                <span className="text-[#3E4754]">{REASONS[k] || k}</span>
                <span className="font-mono font-bold text-[#0E2A44]">{String(v)}</span>
              </div>
            ))}
            {data && (
              <div className="flex items-center justify-between text-[12.5px] pt-2 border-t border-[#EDEDEB]">
                <span className="text-[#3E4754]">Video watch threshold</span>
                <span className="font-mono font-bold text-[#0E2A44]">{data.watch_threshold_percent}%</span>
              </div>
            )}
          </div>
        </Panel>

        <Panel
          title="Totals by reason"
          subtitle={data ? `Across all ${data.total_entries} entries` : 'Loading'}
        >
          <div className="space-y-2">
            {Object.entries(data?.totals_by_reason || {}).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-[12.5px]">
                <span className="text-[#3E4754]">{REASONS[k] || k}</span>
                <span className="text-[11px] text-[#6B7280]">
                  {v.entries} entries ·{' '}
                  <span className="font-mono font-bold text-[#0E2A44]">{v.xp} XP</span>
                </span>
              </div>
            ))}
            {Object.keys(data?.totals_by_reason || {}).length === 0 && (
              <p className="text-[12.5px] text-[#6B7280]">Nothing earned yet.</p>
            )}
          </div>
        </Panel>
      </div>

      <Panel
        title="Ledger standings"
        subtitle="Ranked by ledger sum, the same number the public leaderboard uses"
        actions={
          <Btn variant="danger" onClick={reconcile} busy={reconciling} title="Rewrite cached user.xp from the ledger">
            <RefreshCcw className="w-3.5 h-3.5" /> Reconcile cached XP
          </Btn>
        }
      >
        {reconciling && <Loading label="Reconciling" />}
        {!reconciling && (data?.leaderboard?.length || 0) === 0 ? (
          <Empty>No student has earned XP yet, so the leaderboard is empty by design.</Empty>
        ) : (
          <div className="space-y-1.5">
            {(data?.leaderboard || []).map((u, i) => (
              <div key={u.user_id} className="flex items-center gap-3 rounded-lg border border-[#EDEDEB] px-3 py-2">
                <span className="w-6 h-6 rounded-full bg-[#F3F2EE] text-[#3E4754] text-[11px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                {i === 0 && u.ledger_xp > 0 ? <Trophy className="w-3.5 h-3.5 text-[#E8A33D] shrink-0" /> : null}
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-[#10151C]">{u.name}</p>
                  <p className="text-[11px] text-[#6B7280]">{u.email}</p>
                </div>
                <span className="font-mono font-bold text-[#0E2A44] text-[13px]">{u.ledger_xp} XP</span>
                {u.drift !== 0 && <Pill tone="red">drift {signed(u.drift)}</Pill>}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
};

const Selectish: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <div className="flex gap-1.5">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-gray-300 bg-white px-2.5 py-2 text-[11px] font-bold uppercase tracking-wider text-[#3E4754] outline-none focus:border-[#0284C7]"
    >
      <option value="">All reasons</option>
      {Object.entries(REASONS).map(([k, label]) => (
        <option key={k} value={k}>
          {label}
        </option>
      ))}
    </select>
  </div>
);
