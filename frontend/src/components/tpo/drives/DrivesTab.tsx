import React, { useState } from 'react';
import { Briefcase, Check, Download, Pencil, Plus, Send } from 'lucide-react';
import { AdminDrive } from '@/lib/drivesApi';
import { tpoDriveFetch, tpoDownloadCsv } from '@/lib/tpoDriveApi';
import StatusPill, { driveStatusTone } from '@/components/apple/StatusPill';
import EmptyState from '@/components/apple/EmptyState';
import { GroupedCard, AppleRow } from '@/components/apple/GroupedCard';

const field =
  'w-full rounded-[10px] border-0 bg-[var(--apple-fill)] px-3 py-2.5 text-[14px] text-[var(--apple-label)] placeholder:text-[var(--apple-placeholder)] focus:outline-none';

const actionBtn =
  'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-transform active:scale-[0.97]';

/** `2026-10-12T09:00` <-> ISO helpers so datetime-local inputs round-trip cleanly. */
const toLocalInput = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (v: string): string | null => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
/** Strips the time zone from an ISO string so a value saved as UTC isn't shifted on re-display. */
const toLocalInputUtc = (iso: string | null): string => {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return m ? `${m[1]}T${m[2]}` : toLocalInput(iso);
};
const fromLocalInputUtc = (v: string): string | null => (v ? `${v}:00.000Z` : null);

/** Shared shape for the create form and the per-drive edit form. */
export interface DriveFormState {
  title: string;
  company_name: string;
  description: string;
  drive_type: string;
  starts_at: string;
  ends_at: string;
  registration_mode: string;
  results_visibility: string;
  company_logo_url: string;
  location: string;
  job_type: string;
  category: string;
  job_function: string;
  ctc_min: string;
  ctc_max: string;
  description_md: string;
  additional_info_md: string;
  tpo_contact_name: string;
  tpo_contact_email: string;
  tpo_contact_phone: string;
  registration_opens_at: string;
  registration_closes_at: string;
}

const emptyDriveForm = (): DriveFormState => ({
  title: '', company_name: '', description: '', drive_type: 'mock',
  starts_at: '', ends_at: '', registration_mode: 'open', results_visibility: 'after_close',
  company_logo_url: '', location: '', job_type: '', category: '', job_function: '',
  ctc_min: '', ctc_max: '', description_md: '', additional_info_md: '',
  tpo_contact_name: '', tpo_contact_email: '', tpo_contact_phone: '',
  registration_opens_at: '', registration_closes_at: '',
});

/** A drive row -> form state. Only defined fields are read, so older rows work. */
const driveToForm = (d: AdminDrive): DriveFormState => ({
  title: d.title || '', company_name: d.company_name || '', description: d.description || '',
  drive_type: d.drive_type || 'mock',
  starts_at: toLocalInput(d.starts_at), ends_at: toLocalInput(d.ends_at),
  registration_mode: d.registration_mode || 'open', results_visibility: d.results_visibility || 'after_close',
  company_logo_url: d.company_logo_url || '', location: d.location || '',
  job_type: d.job_type || '', category: d.category || '', job_function: d.job_function || '',
  ctc_min: d.ctc_min == null ? '' : String(d.ctc_min), ctc_max: d.ctc_max == null ? '' : String(d.ctc_max),
  description_md: d.description_md || '', additional_info_md: d.additional_info_md || '',
  tpo_contact_name: d.tpo_contact?.name || '', tpo_contact_email: d.tpo_contact?.email || '',
  tpo_contact_phone: d.tpo_contact?.phone || '',
  registration_opens_at: toLocalInputUtc(d.registration_opens_at),
  registration_closes_at: toLocalInputUtc(d.registration_closes_at),
});

/** Form state -> PATCH/POST body. Unset optional fields are dropped so COALESCE keeps the old value. */
const formToPayload = (f: DriveFormState, opts: { partial: boolean }): Record<string, any> => {
  const p: Record<string, any> = {
    title: f.title.trim(),
    company_name: f.company_name.trim(),
    description: f.description.trim(),
    drive_type: f.drive_type,
    starts_at: fromLocalInput(f.starts_at),
    ends_at: fromLocalInput(f.ends_at),
    registration_mode: f.registration_mode,
    results_visibility: f.results_visibility,
    company_logo_url: f.company_logo_url.trim() || null,
    location: f.location.trim() || null,
    job_type: f.job_type.trim() || null,
    category: f.category.trim() || null,
    job_function: f.job_function.trim() || null,
    ctc_min: f.ctc_min.trim() === '' ? null : Number(f.ctc_min),
    ctc_max: f.ctc_max.trim() === '' ? null : Number(f.ctc_max),
    description_md: f.description_md.trim() || null,
    additional_info_md: f.additional_info_md.trim() || null,
    tpo_contact: {
      name: f.tpo_contact_name.trim(), email: f.tpo_contact_email.trim(), phone: f.tpo_contact_phone.trim(),
    },
    registration_opens_at: fromLocalInputUtc(f.registration_opens_at),
    registration_closes_at: fromLocalInputUtc(f.registration_closes_at),
  };
  if (!opts.partial) return p;
  // For PATCH: drop keys the user left blank so the server's COALESCE keeps the stored value.
  for (const k of Object.keys(p)) {
    if (p[k] === null && k !== 'starts_at' && k !== 'ends_at' &&
        k !== 'registration_opens_at' && k !== 'registration_closes_at') {
      delete p[k];
    }
  }
  return p;
};

/** Edit form shared by "New drive" and the per-drive editor. */
function DriveFormFields(props: {
  form: DriveFormState;
  setForm: (f: DriveFormState) => void;
  disabled?: boolean;
}) {
  const { form, setForm } = props;
  const set = (k: keyof DriveFormState) => (e: any) => setForm({ ...form, [k]: e.target.value });
  const t = (k: keyof DriveFormState) => form[k] as string;
  const lbl = 'text-[12px] font-medium';
  const input = `${field} mt-1`;
  return (
    <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
      <label className="sm:col-span-2">
        <span className={lbl} style={{ color: 'var(--apple-label-2)' }}>Title *</span>
        <input className={input} placeholder="Capgemini Mock Drive" value={t('title')} onChange={set('title')} disabled={props.disabled} />
      </label>
      <label>
        <span className={lbl} style={{ color: 'var(--apple-label-2)' }}>Company name</span>
        <input className={input} placeholder="Capgemini" value={t('company_name')} onChange={set('company_name')} disabled={props.disabled} />
      </label>
      <label>
        <span className={lbl} style={{ color: 'var(--apple-label-2)' }}>Company logo URL</span>
        <input className={input} placeholder="https://…/logo.png" value={t('company_logo_url')} onChange={set('company_logo_url')} disabled={props.disabled} />
      </label>
      <label>
        <span className={lbl} style={{ color: 'var(--apple-label-2)' }}>Drive type</span>
        <select className={input} value={t('drive_type')} onChange={set('drive_type')} disabled={props.disabled}>
          <option value="mock">Mock</option>
          <option value="assessment">Assessment</option>
          <option value="quiz">Quiz</option>
        </select>
      </label>
      <label>
        <span className={lbl} style={{ color: 'var(--apple-label-2)' }}>Location</span>
        <input className={input} placeholder="Bangalore / Remote" value={t('location')} onChange={set('location')} disabled={props.disabled} />
      </label>
      <label>
        <span className={lbl} style={{ color: 'var(--apple-label-2)' }}>Job type</span>
        <select className={input} value={t('job_type')} onChange={set('job_type')} disabled={props.disabled}>
          <option value="">—</option>
          <option value="full_time">Full time</option>
          <option value="internship">Internship</option>
          <option value="contract">Contract</option>
        </select>
      </label>
      <label>
        <span className={lbl} style={{ color: 'var(--apple-label-2)' }}>Category</span>
        <input className={input} placeholder="Engineering" value={t('category')} onChange={set('category')} disabled={props.disabled} />
      </label>
      <label>
        <span className={lbl} style={{ color: 'var(--apple-label-2)' }}>Job function</span>
        <input className={input} placeholder="Software development" value={t('job_function')} onChange={set('job_function')} disabled={props.disabled} />
      </label>
      <label>
        <span className={lbl} style={{ color: 'var(--apple-label-2)' }}>CTC min (₹ / year)</span>
        <input className={input} type="number" min="0" placeholder="450000" value={t('ctc_min')} onChange={set('ctc_min')} disabled={props.disabled} />
      </label>
      <label>
        <span className={lbl} style={{ color: 'var(--apple-label-2)' }}>CTC max (₹ / year)</span>
        <input className={input} type="number" min="0" placeholder="900000" value={t('ctc_max')} onChange={set('ctc_max')} disabled={props.disabled} />
      </label>
      <label className="sm:col-span-2">
        <span className={lbl} style={{ color: 'var(--apple-label-2)' }}>Description</span>
        <textarea className={input} rows={2} placeholder="What is this drive about?" value={t('description')} onChange={set('description')} disabled={props.disabled} />
      </label>
      <label className="sm:col-span-2">
        <span className={lbl} style={{ color: 'var(--apple-label-2)' }}>Description (Markdown, richer formatting)</span>
        <textarea className={input} rows={3} placeholder="## Rounds\n- Aptitude\n- Technical" value={t('description_md')} onChange={set('description_md')} disabled={props.disabled} />
      </label>
      <label className="sm:col-span-2">
        <span className={lbl} style={{ color: 'var(--apple-label-2)' }}>Additional info (Markdown)</span>
        <textarea className={input} rows={2} placeholder="Eligibility notes, documents to carry, dress code…" value={t('additional_info_md')} onChange={set('additional_info_md')} disabled={props.disabled} />
      </label>
      <label>
        <span className={lbl} style={{ color: 'var(--apple-label-2)' }}>Drive starts at</span>
        <input className={input} type="datetime-local" value={t('starts_at')} onChange={set('starts_at')} disabled={props.disabled} />
      </label>
      <label>
        <span className={lbl} style={{ color: 'var(--apple-label-2)' }}>Drive ends at</span>
        <input className={input} type="datetime-local" value={t('ends_at')} onChange={set('ends_at')} disabled={props.disabled} />
      </label>
      <label>
        <span className={lbl} style={{ color: 'var(--apple-label-2)' }}>Registration opens (IST)</span>
        <input className={input} type="datetime-local" value={t('registration_opens_at')} onChange={set('registration_opens_at')} disabled={props.disabled} />
      </label>
      <label>
        <span className={lbl} style={{ color: 'var(--apple-label-2)' }}>Registration closes (IST)</span>
        <input className={input} type="datetime-local" value={t('registration_closes_at')} onChange={set('registration_closes_at')} disabled={props.disabled} />
      </label>
      <label>
        <span className={lbl} style={{ color: 'var(--apple-label-2)' }}>Registration mode</span>
        <select className={input} value={t('registration_mode')} onChange={set('registration_mode')} disabled={props.disabled}>
          <option value="open">Open registration</option>
          <option value="roster">Roster only</option>
          <option value="invite">Invite only</option>
        </select>
      </label>
      <label>
        <span className={lbl} style={{ color: 'var(--apple-label-2)' }}>Results visibility</span>
        <select className={input} value={t('results_visibility')} onChange={set('results_visibility')} disabled={props.disabled}>
          <option value="immediate">Immediate</option>
          <option value="after_close">After drive closes</option>
          <option value="manual">Manual (TPO publishes)</option>
        </select>
      </label>
      <label>
        <span className={lbl} style={{ color: 'var(--apple-label-2)' }}>TPO contact name</span>
        <input className={input} placeholder="Placement officer" value={t('tpo_contact_name')} onChange={set('tpo_contact_name')} disabled={props.disabled} />
      </label>
      <label>
        <span className={lbl} style={{ color: 'var(--apple-label-2)' }}>TPO contact email</span>
        <input className={input} type="email" placeholder="placement@college.edu" value={t('tpo_contact_email')} onChange={set('tpo_contact_email')} disabled={props.disabled} />
      </label>
      <label>
        <span className={lbl} style={{ color: 'var(--apple-label-2)' }}>TPO contact phone</span>
        <input className={input} type="tel" placeholder="+91…" value={t('tpo_contact_phone')} onChange={set('tpo_contact_phone')} disabled={props.disabled} />
      </label>
    </div>
  );
}

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