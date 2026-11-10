import React, { useEffect, useState } from 'react';
import { API_BASE_URL, apiFetch } from '@/lib/api';

/**
 * Admin — Diwali Utsav 2026 (DIWALI_SALE_PLAN.md).
 * Mode: auto (live 5–10 Nov), on (start early / preview), off (kill switch).
 * Internships: add, edit, open and close real listings; see who applied.
 */

interface Application { id: string; user_id: string; name: string; email: string; created_at: string; note: string }
interface Internship {
  id: string; title: string; company: string; is_tieedu: boolean; mode: string; location: string; stipend: string;
  duration: string; eligibility: string; description: string; apply_url: string; deadline: string | null;
  status: 'draft' | 'open' | 'closed'; applications: Application[];
}

const call = async (path: string, init?: RequestInit) => {
  const res = await apiFetch(`${API_BASE_URL}/admin/festival${path}`, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body;
};

const EMPTY: Partial<Internship> = { title: '', company: '', is_tieedu: false, mode: 'remote', location: '', stipend: '', duration: '', eligibility: '', description: '', apply_url: '', deadline: '', status: 'draft' };

export const FestivalTab: React.FC = () => {
  const [info, setInfo] = useState<any>(null);
  const [list, setList] = useState<Internship[]>([]);
  const [edit, setEdit] = useState<Partial<Internship> | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    call('').then(setInfo).catch((e) => setError(e.message));
    call('/internships').then(setList).catch((e) => setError(e.message));
  };
  useEffect(load, []);

  const setMode = async (mode: string) => {
    if (mode === 'off' && !window.confirm('Turn the Diwali sale OFF everywhere right now?')) return;
    try { await call('', { method: 'PUT', body: JSON.stringify({ mode }) }); load(); } catch (e: any) { setError(e.message); }
  };

  const save = async () => {
    if (!edit) return;
    try {
      await call(edit.id ? `/internships/${edit.id}` : '/internships', { method: edit.id ? 'PUT' : 'POST', body: JSON.stringify(edit) });
      setEdit(null);
      load();
    } catch (e: any) { setError(e.message); }
  };

  const field = (key: keyof Internship, label: string, type: 'text' | 'area' | 'date' = 'text') => (
    <label className="block text-sm">
      <span className="font-semibold text-heading">{label}</span>
      {type === 'area' ? (
        <textarea className="mt-1 w-full rounded-lg border border-line bg-card p-2" rows={3} value={String(edit?.[key] ?? '')}
          onChange={(e) => setEdit({ ...edit, [key]: e.target.value })} />
      ) : (
        <input type={type} className="mt-1 w-full rounded-lg border border-line bg-card p-2" value={String(edit?.[key] ?? '')}
          onChange={(e) => setEdit({ ...edit, [key]: e.target.value })} />
      )}
    </label>
  );

  return (
    <div className="space-y-8">
      {error && <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm font-semibold text-danger">{error}</p>}

      <section className="rounded-2xl border border-line bg-card p-5">
        <h2 className="text-lg font-extrabold text-heading">🪔 Diwali Utsav sale</h2>
        <p className="mt-1 text-sm text-muted">
          Window: 5 Nov 00:00 → 10 Nov 23:59 IST. After the end everything switches off by itself, whatever the mode.
        </p>
        {info && (
          <>
            <p className="mt-3 text-sm">
              Status: <b className={info.status?.active ? 'text-success' : 'text-danger'}>{info.status?.active ? 'LIVE' : 'Not live'}</b>
              {' · '}Members: <b>{info.members}</b> · Sale orders paid: <b>{info.sale_orders}</b> · Sale revenue: <b>₹{Math.round(info.sale_revenue_inr)}</b>
            </p>
            <div className="mt-3 flex gap-2">
              {(['auto', 'on', 'off'] as const).map((m) => (
                <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={info.mode === m}
                  className={`rounded-lg px-4 py-2 text-sm font-bold ${info.mode === m ? 'bg-signal text-on-primary' : 'border border-line'}`}>
                  {m === 'auto' ? 'Auto (dates)' : m === 'on' ? 'Force on' : 'Kill switch (off)'}
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-heading">Internships</h2>
          <button type="button" className="rounded-lg bg-signal px-4 py-2 text-sm font-bold text-on-primary" onClick={() => setEdit({ ...EMPTY })}>+ Add listing</button>
        </div>
        <p className="mt-1 text-sm text-muted">Only <b>open</b> listings are public. TiEEdu roles were seeded as drafts — fill in the stipend and open them.</p>

        {edit && (
          <div className="mt-4 grid gap-3 rounded-xl border border-line p-4 md:grid-cols-2">
            {field('title', 'Role title')}
            {field('company', 'Company')}
            {field('location', 'Location')}
            {field('stipend', 'Stipend')}
            {field('duration', 'Duration')}
            {field('deadline', 'Apply by', 'date')}
            {field('apply_url', 'External apply link (https://, leave empty for in-app apply)')}
            {field('eligibility', 'Eligibility')}
            <div className="md:col-span-2">{field('description', 'Description', 'area')}</div>
            <label className="text-sm"><span className="font-semibold">Mode</span>
              <select className="mt-1 w-full rounded-lg border border-line bg-card p-2" value={edit.mode} onChange={(e) => setEdit({ ...edit, mode: e.target.value })}>
                <option value="remote">Remote</option><option value="onsite">Onsite</option><option value="hybrid">Hybrid</option>
              </select>
            </label>
            <label className="text-sm"><span className="font-semibold">Status</span>
              <select className="mt-1 w-full rounded-lg border border-line bg-card p-2" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as Internship['status'] })}>
                <option value="draft">Draft</option><option value="open">Open</option><option value="closed">Closed</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!edit.is_tieedu} onChange={(e) => setEdit({ ...edit, is_tieedu: e.target.checked })} /> Role at TiEEdu
            </label>
            <div className="flex gap-2 md:col-span-2">
              <button type="button" className="rounded-lg bg-signal px-4 py-2 text-sm font-bold text-on-primary" onClick={save}>Save</button>
              <button type="button" className="rounded-lg border border-line px-4 py-2 text-sm font-bold" onClick={() => setEdit(null)}>Cancel</button>
            </div>
          </div>
        )}

        <table className="mt-4 w-full text-left text-sm">
          <thead><tr className="text-muted"><th className="py-2">Role</th><th>Company</th><th>Status</th><th>Applied</th><th /></tr></thead>
          <tbody>
            {list.map((i) => (
              <React.Fragment key={i.id}>
                <tr className="border-t border-line">
                  <td className="py-2 font-semibold">{i.title}</td>
                  <td>{i.company}</td>
                  <td className="capitalize">{i.status}</td>
                  <td>{i.applications.length}</td>
                  <td className="text-right"><button type="button" className="text-link underline" onClick={() => setEdit({ ...i, deadline: i.deadline || '' })}>Edit</button></td>
                </tr>
                {i.applications.length > 0 && (
                  <tr><td colSpan={5} className="pb-3 text-xs text-muted">
                    {i.applications.map((a) => `${a.name || 'Student'} <${a.email}> · ${new Date(a.created_at).toLocaleDateString('en-IN')}`).join('  |  ')}
                  </td></tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};
