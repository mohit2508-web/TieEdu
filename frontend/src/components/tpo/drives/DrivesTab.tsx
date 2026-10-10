import React, { useState } from 'react';
import { Briefcase, Download, Plus, Send } from 'lucide-react';
import { AdminDrive } from '@/lib/drivesApi';
import { tpoDriveFetch, tpoDownloadCsv } from '@/lib/tpoDriveApi';
import StatusPill, { driveStatusTone } from '@/components/apple/StatusPill';
import EmptyState from '@/components/apple/EmptyState';
import { GroupedCard, AppleRow } from '@/components/apple/GroupedCard';

const field =
  'w-full rounded-[10px] border-0 bg-[var(--apple-fill)] px-3 py-2.5 text-[14px] text-[var(--apple-label)] placeholder:text-[var(--apple-placeholder)] focus:outline-none';

const actionBtn =
  'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-transform active:scale-[0.97]';

export default function DrivesTab(props: {
  collegeId: string;
  drives: AdminDrive[];
  onReload: () => void;
  onSelect: (driveId: string) => void;
  selectedId: string | null;
  busy: boolean;
  setBusy: (b: boolean) => void;
  error: string | null;
  setError: (e: string | null) => void;
  notice: string | null;
  setNotice: (n: string | null) => void;
}) {
  const [form, setForm] = useState({ title: '', company_name: '', ends_at: '', registration_mode: 'open' });
  const [creating, setCreating] = useState(false);

  const run = async (msg: string, fn: () => Promise<Response>) => {
    props.setBusy(true);
    try {
      const res = await fn();
      if (!res.ok) {
        let m = `Request failed (${res.status})`;
        try { const b = await res.json(); if (b?.error) m = b.error; } catch { /* */ }
        throw new Error(m);
      }
      props.setNotice(msg);
      props.onReload();
    } catch (e) {
      props.setError((e as Error).message);
    } finally {
      props.setBusy(false);
    }
  };

  const createDrive = async () => {
    setCreating(true);
    try {
      await run('Drive created (draft). Attach rounds, then publish.', () =>
        tpoDriveFetch(props.collegeId, '', { method: 'POST', body: JSON.stringify({ ...form, starts_at: null }) })
      );
      setForm({ title: '', company_name: '', ends_at: '', registration_mode: 'open' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="apple-card p-4">
        <h2 className="text-[17px] font-semibold" style={{ color: 'var(--apple-label)' }}>New drive</h2>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          <input className={field} placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className={field} placeholder="Company name" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
          <input type="datetime-local" className={field} value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
          <select className={field} value={form.registration_mode} onChange={(e) => setForm({ ...form, registration_mode: e.target.value })}>
            <option value="open">Open registration</option>
            <option value="roster">Roster only</option>
            <option value="invite">Invite only</option>
          </select>
        </div>
        <button
          type="button"
          disabled={props.busy || creating || !form.title.trim()}
          onClick={createDrive}
          className="mt-3 inline-flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-[14px] font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-40"
          style={{ background: 'var(--apple-blue)' }}
        >
          <Plus size={16} strokeWidth={2.4} /> Create drive
        </button>
      </section>

      <GroupedCard title="Drives for this college">
        {props.drives.length === 0 ? (
          <EmptyState title="No drives yet" body="Create your first drive above — it starts as a draft, then you attach assessment rounds and publish." icon={<Briefcase size={24} strokeWidth={1.6} />} />
        ) : (
          props.drives.map((d) => {
            const selected = props.selectedId === d.drive_id;
            return (
              <div key={d.drive_id}>
                <AppleRow
                  title={d.title}
                  sub={d.company_name || 'No company'}
                  value={
                    <span className="flex items-center gap-2">
                      <span className="hidden whitespace-nowrap text-[11px] tabular-nums sm:inline" style={{ color: 'var(--apple-label-3)' }}>
                        {d.registration_count ?? 0} registered · {d.test_count ?? 0} rounds
                      </span>
                      <StatusPill label={d.status} tone={driveStatusTone(d.status)} />
                    </span>
                  }
                  onClick={() => props.onSelect(d.drive_id)}
                />
                {selected ? (
                  <div className="flex flex-wrap items-center gap-2 bg-[var(--apple-surface)] px-4 pb-4 pt-1">
                    <a
                      className={`${actionBtn} text-white`}
                      style={{ background: 'var(--apple-blue)' }}
                      href="#"
                      onClick={(e) => { e.preventDefault(); props.onSelect(d.drive_id); }}
                    >
                      View analytics
                    </a>
                    {d.status === 'draft' && (
                      <button
                        type="button"
                        className={`${actionBtn}`}
                        style={{ background: 'var(--apple-green-soft)', color: 'var(--apple-green)' }}
                        disabled={props.busy}
                        onClick={() => run('Drive published — students can now register.', () =>
                          tpoDriveFetch(props.collegeId, `/${d.drive_id}/publish`, { method: 'POST' }))}
                      >
                        <Send size={13} /> Publish
                      </button>
                    )}
                    <button
                      type="button"
                      className={`${actionBtn}`}
                      style={{ background: 'var(--apple-blue-soft)', color: 'var(--apple-blue)' }}
                      disabled={props.busy}
                      onClick={() => run('Results published — students can now see their outcome.', () =>
                        tpoDriveFetch(props.collegeId, `/${d.drive_id}/publish-results`, { method: 'POST' }))}
                    >
                      <Send size={13} /> Publish results
                    </button>
                    <button
                      type="button"
                      className={`${actionBtn}`}
                      style={{ background: 'var(--apple-fill)', color: 'var(--apple-label)' }}
                      onClick={() => tpoDownloadCsv(props.collegeId, d.drive_id)}
                    >
                      <Download size={13} /> CSV
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </GroupedCard>
    </div>
  );
}