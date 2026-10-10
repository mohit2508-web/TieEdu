import React, { useCallback, useEffect, useState } from 'react';
import { Check, Pencil, X, AlertCircle } from 'lucide-react';
import { DriveShell } from '@/components/drives/DriveShell';
import { Skeleton } from '@/components/ui/Skeleton';
import { fetchMyProfilesApi, saveMyProfileApi, submitProfileCorrectionApi } from '@/lib/drivesApi';
import type { StudentProfile } from '@/types/drives';

type Field = 'roll_no' | 'branch' | 'batch' | 'degree' | 'cgpa' | 'class10_pct' | 'class12_pct' | 'backlogs';

const FIELDS: { key: Field; label: string; type: 'text' | 'number'; editable: boolean }[] = [
  { key: 'roll_no', label: 'Roll number', type: 'text', editable: false },
  { key: 'branch', label: 'Branch', type: 'text', editable: true },
  { key: 'batch', label: 'Batch', type: 'text', editable: true },
  { key: 'degree', label: 'Degree', type: 'text', editable: true },
  { key: 'cgpa', label: 'CGPA', type: 'number', editable: true },
  { key: 'class10_pct', label: 'Class 10 %', type: 'number', editable: true },
  { key: 'class12_pct', label: 'Class 12 %', type: 'number', editable: true },
  { key: 'backlogs', label: 'Backlogs', type: 'number', editable: true },
];

export default function ProfileScreen() {
  const [profiles, setProfiles] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Inline editing state
  const [editing, setEditing] = useState<Field | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProfiles(await fetchMyProfilesApi());
    } catch (e) {
      setError((e as Error).message || 'Could not load your profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // First profile row is the active one for this screen.
  const profile = profiles[0] ?? null;

  const startEdit = (f: Field, current: string | number | null) => {
    setEditing(f);
    setDraft(current == null ? '' : String(current));
    setNotice(null);
  };

  const cancelEdit = () => { setEditing(null); setDraft(''); };

  const save = async () => {
    if (!editing || !profile) return;
    setSaving(true);
    setError(null);
    try {
      const value = editing === 'roll_no' ? draft : Number(draft);
      // Fields the student is not allowed to freely change go through the
      // correction-request flow instead of a direct save.
      if (!FIELDS.find((f) => f.key === editing)?.editable) {
        await submitProfileCorrectionApi({ field: editing, to_value: String(value), reason: 'Student-submitted correction' });
        setNotice('Correction requested. Your TPO will review it.');
      } else {
        await saveMyProfileApi({ ...profile, [editing]: value } as Partial<StudentProfile>);
        setNotice('Saved.');
      }
      setEditing(null);
      setDraft('');
      await load();
    } catch (e) {
      setError((e as Error).message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DriveShell title="My profile">
      <div className="mx-auto w-full max-w-[720px] px-4 pb-8 pt-4">
        {notice && (
          <div className="mb-3 flex items-center gap-2 rounded-[10px] px-3 py-2 text-[13px]" style={{ background: 'var(--apple-green-soft)', color: 'var(--apple-green)' }}>
            <Check size={14} /> {notice}
          </div>
        )}
        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-[10px] px-3 py-2 text-[13px]" style={{ background: 'var(--apple-red-soft)', color: 'var(--apple-red)' }}>
            <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : !profile ? (
          <div className="rounded-[12px] border px-4 py-10 text-center" style={{ borderColor: 'var(--apple-separator)', background: 'var(--apple-surface)' }}>
            <p className="text-[14px] font-medium" style={{ color: 'var(--apple-label)' }}>No profile yet</p>
            <p className="mx-auto mt-1 max-w-[280px] text-[13px]" style={{ color: 'var(--apple-label-2)' }}>
              Your academic profile is used to check drive eligibility. It may be created by your TPO or by registering for a drive.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[14px] border" style={{ background: 'var(--apple-surface)', borderColor: 'var(--apple-separator)' }}>
            {FIELDS.map((f, i) => {
              const raw = profile[f.key];
              const isEditing = editing === f.key;
              return (
                <div key={f.key} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: i === 0 ? 'none' : '0.5px solid var(--apple-separator)' }}>
                  <span className="w-[110px] shrink-0 text-[13px]" style={{ color: 'var(--apple-label-2)' }}>{f.label}</span>
                  {isEditing ? (
                    <input
                      autoFocus
                      type={f.type}
                      step={f.type === 'number' ? '0.01' : undefined}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancelEdit(); }}
                      className="min-w-0 flex-1 rounded-[8px] border px-2 py-1 text-[14px] outline-none"
                      style={{ borderColor: 'var(--apple-blue)', background: 'var(--apple-bg)', color: 'var(--apple-label)' }}
                    />
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-[14px] font-medium" style={{ color: 'var(--apple-label)' }}>
                      {raw ?? '—'}
                      {!f.editable && <span className="ml-2 text-[11px] font-normal" style={{ color: 'var(--apple-label-3)' }}>via TPO</span>}
                    </span>
                  )}
                  {isEditing ? (
                    <div className="flex shrink-0 gap-1">
                      <button type="button" onClick={save} disabled={saving} aria-label="Save" className="flex h-7 w-7 items-center justify-center rounded-[6px]" style={{ background: 'var(--apple-green-soft)', color: 'var(--apple-green)' }}>
                        <Check size={14} />
                      </button>
                      <button type="button" onClick={cancelEdit} aria-label="Cancel" className="flex h-7 w-7 items-center justify-center rounded-[6px]" style={{ background: 'var(--apple-fill)', color: 'var(--apple-label-2)' }}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => startEdit(f.key, raw as string | number | null)} aria-label={`Edit ${f.label}`} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px]" style={{ color: 'var(--apple-label-3)' }}>
                      <Pencil size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DriveShell>
  );
}
