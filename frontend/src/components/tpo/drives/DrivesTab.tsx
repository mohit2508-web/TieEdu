import React, { useState } from 'react';
import { Briefcase, Check, Download, Pencil, Plus, Send } from 'lucide-react';
import { AdminDrive } from '@/lib/drivesApi';
import { DriveFormState, DriveFormFields, emptyDriveForm, driveToForm, formToPayload } from '@/components/drives/DriveFormEditor';
import { tpoDriveFetch, tpoDownloadCsv } from '@/lib/tpoDriveApi';
import StatusPill, { driveStatusTone } from '@/components/apple/StatusPill';
import EmptyState from '@/components/apple/EmptyState';
import { GroupedCard, AppleRow } from '@/components/apple/GroupedCard';

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
  const [form, setForm] = useState<DriveFormState>(emptyDriveForm);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<DriveFormState>(emptyDriveForm);

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
        tpoDriveFetch(props.collegeId, '', { method: 'POST', body: JSON.stringify(formToPayload(form, { partial: false })) })
      );
      setForm(emptyDriveForm());
    } finally {
      setCreating(false);
    }
  };

  const toggleEdit = (d: AdminDrive) => {
    if (editingId === d.drive_id) { setEditingId(null); return; }
    setEditingId(d.drive_id);
    setEditForm(driveToForm(d));
  };

  const saveEdit = async (driveId: string) => {
    await run('Drive updated.', () =>
      tpoDriveFetch(props.collegeId, `/${driveId}`, { method: 'PATCH', body: JSON.stringify(formToPayload(editForm, { partial: true })) })
    );
    setEditingId(null);
  };

  return (
    <div className="space-y-5">
      <section className="apple-card p-4">
        <h2 className="text-[17px] font-semibold" style={{ color: 'var(--apple-label)' }}>New drive</h2>
        <DriveFormFields form={form} setForm={setForm} disabled={props.busy || creating} />
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
          <EmptyState title="No drives yet" body="Create your first drive above â€” it starts as a draft, then you attach assessment rounds and publish." icon={<Briefcase size={24} strokeWidth={1.6} />} />
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
                        {d.registration_count ?? 0} registered Â· {d.test_count ?? 0} rounds
                      </span>
                      <StatusPill label={d.status} tone={driveStatusTone(d.status)} />
                    </span>
                  }
                  onClick={() => props.onSelect(d.drive_id)}
                />
                {selected ? (
                  <div className="bg-[var(--apple-surface)] px-4 pb-4 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        className={`${actionBtn} text-white`}
                        style={{ background: 'var(--apple-blue)' }}
                        href="#"
                        onClick={(e) => { e.preventDefault(); props.onSelect(d.drive_id); }}
                      >
                        View analytics
                      </a>
                      <button
                        type="button"
                        className={actionBtn}
                        style={{ background: 'var(--apple-fill)', color: 'var(--apple-label)' }}
                        onClick={() => toggleEdit(d)}
                      >
                        <Pencil size={13} /> {editingId === d.drive_id ? 'Close editor' : 'Edit drive'}
                      </button>
                      {d.status === 'draft' && (
                        <button
                          type="button"
                          className={`${actionBtn}`}
                          style={{ background: 'var(--apple-green-soft)', color: 'var(--apple-green)' }}
                          disabled={props.busy}
                          onClick={() => run('Drive published â€” students can now register.', () =>
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
                        onClick={() => run('Results published â€” students can now see their outcome.', () =>
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
                    {editingId === d.drive_id ? (
                      <div className="mt-3 rounded-[12px] border p-3" style={{ borderColor: 'var(--apple-separator)', background: 'var(--apple-surface)' }}>
                        <h3 className="text-[14px] font-semibold" style={{ color: 'var(--apple-label)' }}>Edit drive</h3>
                        <DriveFormFields form={editForm} setForm={setEditForm} disabled={props.busy} />
                        <button
                          type="button"
                          disabled={props.busy || !editForm.title.trim()}
                          onClick={() => saveEdit(d.drive_id)}
                          className="mt-3 inline-flex items-center gap-2 rounded-[10px] px-4 py-2 text-[13px] font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-40"
                          style={{ background: 'var(--apple-blue)' }}
                        >
                          <Check size={15} strokeWidth={2.4} /> Save changes
                        </button>
                      </div>
                    ) : null}
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
