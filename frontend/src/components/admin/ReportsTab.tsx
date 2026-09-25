import React, { useEffect, useState } from 'react';
import { fetchModerationReportsApi, updateReportStatusApi } from '@/lib/api';
import { InterviewReport } from '@/types';
import { Company } from '@/types';
import { BadgeCheck, Check, ChevronDown, FileText, Search, X } from 'lucide-react';

const outcomeChip = (o: string | null) =>
  o === 'selected' ? 'bg-emerald-100 text-emerald-800' : o === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800';

const diffChip = (d: string) =>
  d === 'hard' ? 'bg-red-50 text-red-600' : d === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700';

export const ReportsTab: React.FC<{ companies: Company[]; onChanged?: () => void }> = ({ companies, onChanged }) => {
  const [reports, setReports] = useState<InterviewReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending_review' | 'published' | 'rejected'>('all');
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchModerationReportsApi();
      setReports(data || []);
    } catch (e: any) {
      setError(e?.message || 'Reports could not be loaded');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const companyName = (id: string) => companies.find((c) => c.id === id)?.name || id;

  const changeStatus = async (id: string, status: 'published' | 'rejected') => {
    try {
      await updateReportStatusApi(id, status);
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      onChanged?.();
    } catch (e: any) {
      setError(e?.message || 'Status update failed');
    }
  };

  const visible = reports
    .filter((r) => (filter === 'all' ? true : r.status === filter))
    .filter((r) => {
      if (!q.trim()) return true;
      const s = q.trim().toLowerCase();
      return r.user_name.toLowerCase().includes(s) || companyName(r.company_id).toLowerCase().includes(s) || r.user_role.toLowerCase().includes(s);
    })
    .sort((a, b) => (a.status === 'pending_review' ? -1 : 1));

  const counts = {
    all: reports.length,
    pending_review: reports.filter((r) => r.status === 'pending_review').length,
    published: reports.filter((r) => r.status === 'published').length,
    rejected: reports.filter((r) => r.status === 'rejected').length,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="eyebrow">#05 — Candidate Reports</p>
          <h2 className="text-xl font-extrabold text-[#10151C] mt-1">Interview experience moderation</h2>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs font-mono font-bold">
          {(['all', 'pending_review', 'published', 'rejected'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full border transition-all ${filter === f ? 'bg-[#1F3A5F] text-white border-[#1F3A5F]' : 'bg-white text-gray-500 border-gray-200 hover:border-[#0284C7] hover:text-[#0284C7]'}`}
            >
              {f === 'all' ? 'All' : f === 'pending_review' ? 'Pending' : f === 'published' ? 'Published' : 'Rejected'} ({counts[f]})
            </button>
          ))}
        </div>
      </div>

      {!loading && !error && (
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search candidate, company, role…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0284C7]/30"
          />
        </div>
      )}

      {loading ? (
        <div className="p-14 text-center text-sm text-gray-400 italic">Loading reports…</div>
      ) : error ? (
        <div className="p-14 text-center">
          <p className="text-sm font-semibold text-red-600">{error}</p>
          <p className="text-xs text-gray-400 mt-1">Check the backend — reports are never shown in a fake state.</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="p-14 text-center bg-white border border-gray-200 rounded-3xl">
          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No reports found ({filter}).</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((r) => (
            <div key={r.id} className={`bg-white border rounded-2xl p-5 shadow-xs space-y-3 ${r.status === 'pending_review' ? 'border-amber-200' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-[#1F3A5F] text-white flex items-center justify-center text-sm font-bold uppercase">
                    {r.user_name.slice(0, 1)}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[#1E293B]">{r.user_name} · {r.user_role}</p>
                    <p className="text-[10px] font-mono text-gray-400">{companyName(r.company_id)} · {new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${outcomeChip(r.outcome)}`}>{r.outcome || 'pending'}</span>
              </div>

              <div className="space-y-1">
                {r.rounds.slice(0, expanded === r.id ? r.rounds.length : 2).map((round, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 text-xs">
                    <span className="text-gray-600 font-semibold">
                      {round.round_name} {round.matched_questions && <span className="text-emerald-600">✓ matched</span>}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${diffChip(round.difficulty)}`}>{round.difficulty}</span>
                  </div>
                ))}
                {r.rounds.length > 2 && (
                  <button onClick={() => setExpanded(expanded === r.id ? null : r.id)} className="text-[11px] font-semibold text-[#0284C7] flex items-center gap-1">
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded === r.id ? 'rotate-180' : ''}`} />
                    {expanded === r.id ? 'Show less' : `+${r.rounds.length - 2} more rounds`}
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="text-[11px] font-mono text-gray-500">
                  Accuracy: <strong className="text-[#0284C7]">{r.accuracy_rating}%</strong>
                  {r.salary_lpa ? ` · ${r.salary_lpa} LPA` : ''}
                </div>
                <div className="flex items-center gap-2">
                  {r.status === 'pending_review' && (
                    <>
                      <button onClick={() => changeStatus(r.id, 'published')} className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Publish (+50 XP)
                      </button>
                      <button onClick={() => changeStatus(r.id, 'rejected')} className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-[10px] font-bold flex items-center gap-1">
                        <X className="w-3 h-3" /> Reject
                      </button>
                    </>
                  )}
                  {r.status !== 'pending_review' && (
                    <span className={`text-[10px] font-mono font-bold uppercase px-2 py-1 rounded flex items-center gap-1 ${r.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {r.status === 'published' && <BadgeCheck className="w-3 h-3" />} {r.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-gray-400 font-mono">Publish hone par contributor ko +50 XP aur +1 streak milega (server-side).</p>
    </div>
  );
};