import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Save, User } from 'lucide-react';
import { DriveShell, withDriveAuth } from '@/components/drives/DriveShell';
import { Toggle } from '@/components/apple/Toggle';
import { Skeleton } from '@/components/ui/Skeleton';
import { StudentProfileCard } from '@/components/account/StudentProfileCard';
import { fetchDriveSettingsApi, saveDriveSettingsApi } from '@/lib/drivesApi';
import { updateProfileApi } from '@/lib/api';
import type { DriveSettings } from '@/types/drives';

type ToggleKey = keyof Omit<DriveSettings, 'email' | 'name' | 'college'>;

const TOGGLES: { key: ToggleKey; label: string; sub: string }[] = [
  { key: 'email_notifications', label: 'Email notifications', sub: 'Drive updates and deadlines by email' },
  { key: 'push_notifications', label: 'Push notifications', sub: 'Reminders on this device' },
  { key: 'drive_alerts', label: 'Drive alerts', sub: 'New drives opening for your college' },
];

function SettingsScreen() {
  const [settings, setSettings] = useState<DriveSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Editable account fields — the whole profile is managed from this screen.
  const [editName, setEditName] = useState('');
  const [editCollege, setEditCollege] = useState('');
  const [acctBusy, setAcctBusy] = useState(false);
  const [acctMsg, setAcctMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await fetchDriveSettingsApi();
        if (alive) {
          setSettings(s);
          setEditName(s.name || '');
          setEditCollege(s.college || '');
        }
      } catch (e) {
        if (alive) setError((e as Error).message || 'Could not load settings.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const toggle = async (key: ToggleKey) => {
    if (!settings) return;
    const next = !settings[key];
    setSettings({ ...settings, [key]: next });
    setSavingKey(key);
    try {
      await saveDriveSettingsApi({ [key]: next });
    } catch (e) {
      // Revert on failure so the switch never lies about server state.
      setSettings({ ...settings, [key]: !next });
      setError((e as Error).message || 'Could not save.');
    } finally {
      setSavingKey(null);
    }
  };

  const saveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editName.trim().length < 2) {
      setAcctMsg({ kind: 'err', text: 'Name must be at least 2 characters.' });
      return;
    }
    setAcctBusy(true);
    setAcctMsg(null);
    try {
      await updateProfileApi({ name: editName.trim(), college: editCollege.trim() || undefined });
      setSettings(settings ? { ...settings, name: editName.trim(), college: editCollege.trim() || null } : settings);
      setAcctMsg({ kind: 'ok', text: 'Account updated.' });
    } catch (err) {
      setAcctMsg({ kind: 'err', text: (err as Error).message || 'Could not save.' });
    } finally {
      setAcctBusy(false);
    }
  };

  return (
    <DriveShell title="Settings">
      <div className="mx-auto w-full max-w-[720px] px-4 pb-8 pt-4">
        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-[10px] px-3 py-2 text-sm" style={{ background: 'var(--apple-red-soft)', color: 'var(--apple-red)' }}>
            <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : (
          <>
            {/* Account — editable name + college, read-only email */}
            <form onSubmit={saveAccount} className="mb-4 overflow-hidden rounded-[14px] border" style={{ background: 'var(--apple-surface)', borderColor: 'var(--apple-separator)' }}>
              <div className="flex items-center gap-2 px-4 pb-1 pt-3">
                <User size={14} style={{ color: 'var(--apple-label-2)' }} />
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--apple-label-2)' }}>Account</p>
              </div>
              <div className="px-4 py-2.5">
                <p className="text-xs" style={{ color: 'var(--apple-label-2)' }}>Full name</p>
                <input
                  className="mt-1 w-full rounded-[10px] px-3 py-2 text-base outline-none"
                  style={{ background: 'var(--apple-fill)', color: 'var(--apple-label)' }}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={60}
                  placeholder="Your full name"
                />
              </div>
              <div className="border-t px-4 py-2.5" style={{ borderColor: 'var(--apple-separator)' }}>
                <p className="text-xs" style={{ color: 'var(--apple-label-2)' }}>College</p>
                <input
                  className="mt-1 w-full rounded-[10px] px-3 py-2 text-base outline-none"
                  style={{ background: 'var(--apple-fill)', color: 'var(--apple-label)' }}
                  value={editCollege}
                  onChange={(e) => setEditCollege(e.target.value)}
                  maxLength={120}
                  placeholder="Your college / university"
                />
              </div>
              <div className="border-t px-4 py-3" style={{ borderColor: 'var(--apple-separator)' }}>
                <p className="text-xs" style={{ color: 'var(--apple-label-2)' }}>Email</p>
                <p className="text-sm font-medium" style={{ color: 'var(--apple-label)' }}>{settings?.email || '—'}</p>
              </div>
              <div className="flex items-center gap-3 border-t px-4 py-3" style={{ borderColor: 'var(--apple-separator)' }}>
                <button
                  type="submit"
                  disabled={acctBusy}
                  className="flex items-center gap-1.5 rounded-[10px] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: 'var(--apple-blue)' }}
                >
                  {acctBusy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                </button>
                {acctMsg && (
                  <span className="flex items-center gap-1 text-sm font-medium" style={{ color: acctMsg.kind === 'ok' ? 'var(--apple-green, #34C759)' : 'var(--apple-red)' }}>
                    {acctMsg.kind === 'ok' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />} {acctMsg.text}
                  </span>
                )}
              </div>
            </form>

            {/* Placement profile — eligibility + admin roster data */}
            <div className="mb-4">
              <p className="mb-2 px-1 text-sm leading-relaxed" style={{ color: 'var(--apple-label-2)' }}>
                Drive registration ke liye ye profile zaroori hai — roll no, branch, batch, CGPA yahin se bharein, admin ko yahi data dikhega.
              </p>
              <StudentProfileCard initialCollege={settings?.college} />
            </div>

            {/* Toggles */}
            <div className="overflow-hidden rounded-[14px] border" style={{ background: 'var(--apple-surface)', borderColor: 'var(--apple-separator)' }}>
              {TOGGLES.map((t, i) => {
                const on = settings?.[t.key] ?? false;
                return (
                  <div key={t.key} className="flex items-center gap-3 px-4 py-3.5" style={{ borderTop: i === 0 ? 'none' : '0.5px solid var(--apple-separator)' }}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium" style={{ color: 'var(--apple-label)' }}>{t.label}</p>
                      <p className="truncate text-xs" style={{ color: 'var(--apple-label-2)' }}>{t.sub}</p>
                    </div>
                    <Toggle
                      checked={on}
                      onChange={() => toggle(t.key)}
                      disabled={savingKey === t.key}
                      ariaLabel={t.label}
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </DriveShell>
  );
}

export default withDriveAuth(SettingsScreen);
