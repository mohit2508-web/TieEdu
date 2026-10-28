import React, { useEffect, useState } from 'react';
import { Briefcase, Check, Pause, RotateCw, X } from 'lucide-react';
import { Button, EmptyState, Skeleton } from '@/components/ui';
import { API_BASE_URL, apiFetch } from '@/lib/api';

/**
 * Recruiter verification (E4). Every recruiter is checked here before they
 * can search students: does the company exist, is the work email on its
 * domain? Suspending one withdraws their open requests. Search itself stays
 * off until Settings → "Recruiter search" is on (backend lib/talentSearch).
 */
interface AdminRecruiter {
  id: string; company: string; website: string; work_email: string; account_email: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'suspended'; applied_at: string; admin_note: string | null; requests: number;
}

const call = async (path: string, init?: RequestInit) => {
  const res = await apiFetch(`${API_BASE_URL}/admin/recruiters${path}`, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body as { enabled: boolean; searchable_students: number; recruiters: AdminRecruiter[] };
};
const STATUS: Record<AdminRecruiter['status'], string> = { pending: 'Waiting for review', approved: 'Verified', rejected: 'Rejected', suspended: 'Suspended' };

export const RecruitersTab: React.FC = () => {
  const [data, setData] = useState<Awaited<ReturnType<typeof call>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const load = () => { setError(null); call('').then(setData).catch((e) => setError(e?.message || 'Could not load recruiters.')); };
  useEffect(load, []);
  const act = (id: string, status: string) =>
    call(`/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ status, admin_note: notes[id] || '' }) }).then(setData).catch((e) => setError(e?.message || 'That change failed.'));

  if (error) return <EmptyState icon={RotateCw} title="Recruiters" note={error} action={{ label: 'Try again', onClick: load }} />;
  if (!data) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Search is <strong className={data.enabled ? 'text-success' : 'text-amber-deep'}>{data.enabled ? 'on' : 'off'}</strong> (Settings) · {data.searchable_students} students searchable.
        Before approving, check the website is a real company and the work email is on its domain.
      </p>
      {data.recruiters.length === 0 && <EmptyState icon={Briefcase} title="No recruiter applications yet" note="Recruiters apply at /recruiters." />}
      {data.recruiters.map((r) => (
        <div key={r.id} className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-bold text-ink-soft">{r.company} <span className="text-xs font-semibold text-gray-500">· {STATUS[r.status]}</span></p>
              <p className="text-sm"><a href={r.website} target="_blank" rel="noopener noreferrer nofollow" className="text-signal hover:underline">{r.website}</a> · {r.work_email}</p>
              <p className="text-xs text-gray-500">Account: {r.account_email || 'unknown'} · applied {new Date(r.applied_at).toLocaleDateString('en-IN')} · {r.requests} requests sent</p>
              {r.admin_note && <p className="mt-1 text-xs text-gray-500">Note: {r.admin_note}</p>}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input value={notes[r.id] || ''} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} maxLength={200} placeholder="Note (shown to the recruiter if rejected)" className="min-h-[36px] flex-1 rounded-lg border border-gray-200 px-3 text-sm" />
            {r.status !== 'approved' && r.status !== 'suspended' && <Button size="sm" icon={Check} onClick={() => act(r.id, 'approved')}>Approve</Button>}
            {r.status === 'pending' && <Button size="sm" kind="secondary" icon={X} onClick={() => act(r.id, 'rejected')}>Reject</Button>}
            {r.status === 'approved' && <Button size="sm" kind="secondary" icon={Pause} onClick={() => act(r.id, 'suspended')}>Suspend</Button>}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecruitersTab;
