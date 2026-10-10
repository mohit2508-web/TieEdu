import React, { useEffect, useState } from 'react';
import { AlertCircle, Check } from 'lucide-react';
import { DriveShell } from '@/components/drives/DriveShell';
import { Skeleton } from '@/components/ui/Skeleton';
import { fetchDriveSettingsApi, saveDriveSettingsApi } from '@/lib/drivesApi';
import type { DriveSettings } from '@/types/drives';

type ToggleKey = keyof Omit<DriveSettings, 'email' | 'name'>;

const TOGGLES: { key: ToggleKey; label: string; sub: string }[] = [
  { key: 'email_notifications', label: 'Email notifications', sub: 'Drive updates and deadlines by email' },
  { key: 'push_notifications', label: 'Push notifications', sub: 'Reminders on this device' },
  { key: 'drive_alerts', label: 'Drive alerts', sub: 'New drives opening for your college' },
];

export default function SettingsScreen() {
  const [settings, setSettings] = useState<DriveSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await fetchDriveSettingsApi();
        if (alive) setSettings(s);
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

  return (
    <DriveShell title="Settings">
      <div className="mx-auto w-full max-w-[720px] px-4 pb-8 pt-4">
        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-[10px] px-3 py-2 text-[13px]" style={{ background: 'var(--apple-red-soft)', color: 'var(--apple-red)' }}>
            <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : (
          <>
            {/* Account summary */}
            <div className="mb-4 overflow-hidden rounded-[14px] border" style={{ background: 'var(--apple-surface)', borderColor: 'var(--apple-separator)' }}>
              <div className="px-4 py-3">
                <p className="text-[12px]" style={{ color: 'var(--apple-label-2)' }}>Name</p>
                <p className="text-[14px] font-medium" style={{ color: 'var(--apple-label)' }}>{settings?.name || '—'}</p>
              </div>
              <div className="border-t px-4 py-3" style={{ borderColor: '0.5px solid var(--apple-separator)' }}>
                <p className="text-[12px]" style={{ color: 'var(--apple-label-2)' }}>Email</p>
                <p className="text-[14px] font-medium" style={{ color: 'var(--apple-label)' }}>{settings?.email || '—'}</p>
              </div>
            </div>

            {/* Toggles */}
            <div className="overflow-hidden rounded-[14px] border" style={{ background: 'var(--apple-surface)', borderColor: 'var(--apple-separator)' }}>
              {TOGGLES.map((t, i) => {
                const on = settings?.[t.key] ?? false;
                return (
                  <div key={t.key} className="flex items-center gap-3 px-4 py-3.5" style={{ borderTop: i === 0 ? 'none' : '0.5px solid var(--apple-separator)' }}>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium" style={{ color: 'var(--apple-label)' }}>{t.label}</p>
                      <p className="truncate text-[12px]" style={{ color: 'var(--apple-label-2)' }}>{t.sub}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={t.label}
                      disabled={savingKey === t.key}
                      onClick={() => toggle(t.key)}
                      className="relative h-[30px] w-[50px] shrink-0 rounded-full transition-colors disabled:opacity-60"
                      style={{ background: on ? 'var(--apple-green)' : 'var(--apple-fill)' }}
                    >
                      <span
                        className="absolute top-[3px] h-6 w-6 rounded-full bg-white shadow transition-all"
                        style={{ left: on ? '23px' : '3px' }}
                      >
                        {savingKey === t.key && (
                          <Check size={12} className="absolute left-[7px] top-[7px]" style={{ color: 'var(--apple-green)' }} />
                        )}
                      </span>
                    </button>
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
