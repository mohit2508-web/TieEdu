import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import { DriveShell } from '@/components/drives/DriveShell';
import { Skeleton } from '@/components/ui/Skeleton';
import { fetchNotificationsApi, markNotificationsReadApi } from '@/lib/drivesApi';
import type { DriveNotification } from '@/types/drives';

const kindLabel = (kind: string) =>
  kind.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function NotificationsScreen() {
  const [rows, setRows] = useState<DriveNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const n = await fetchNotificationsApi();
        if (alive) setRows(n);
      } catch (e) {
        if (alive) setError((e as Error).message || 'Could not load notifications.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const markAllRead = async () => {
    setMarking(true);
    try {
      await markNotificationsReadApi();
      setRows((prev) => prev.map((r) => ({ ...r, read: true })));
    } catch {
      /* ignore — non-critical */
    } finally {
      setMarking(false);
    }
  };

  const unread = rows.filter((r) => !r.read).length;

  return (
    <DriveShell title="Notifications">
      <div className="mx-auto w-full max-w-[720px] px-4 pb-8 pt-4">
        {unread > 0 && (
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={markAllRead}
              disabled={marking}
              className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[12px] font-semibold disabled:opacity-50"
              style={{ background: 'var(--apple-blue-soft)', color: 'var(--apple-blue)' }}
            >
              <CheckCheck size={13} /> Mark all read
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : error ? (
          <p className="rounded-[10px] px-3 py-2 text-[13px]" style={{ background: 'var(--apple-red-soft)', color: 'var(--apple-red)' }}>{error}</p>
        ) : rows.length === 0 ? (
          <div className="rounded-[12px] border px-4 py-12 text-center" style={{ borderColor: 'var(--apple-separator)', background: 'var(--apple-surface)' }}>
            <Bell size={24} className="mx-auto" style={{ color: 'var(--apple-label-3)' }} />
            <p className="mt-2 text-[14px] font-medium" style={{ color: 'var(--apple-label)' }}>No notifications</p>
            <p className="mt-1 text-[13px]" style={{ color: 'var(--apple-label-2)' }}>Drive updates and reminders will appear here.</p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {rows.map((n) => {
              const inner = (
                <div
                  className="rounded-[12px] border p-3.5"
                  style={{
                    background: n.read ? 'var(--apple-surface)' : 'var(--apple-blue-soft)',
                    borderColor: n.read ? 'var(--apple-separator)' : 'transparent',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[14px] font-semibold" style={{ color: 'var(--apple-label)' }}>{n.title}</p>
                    {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: 'var(--apple-blue)' }} />}
                  </div>
                  {n.body && <p className="mt-1 text-[13px] leading-snug" style={{ color: 'var(--apple-label-2)' }}>{n.body}</p>}
                  <p className="mt-1.5 text-[11px]" style={{ color: 'var(--apple-label-3)' }}>
                    {kindLabel(n.kind)}{n.created_at_ist ? ` · ${n.created_at_ist}` : ''}
                  </p>
                </div>
              );
              return (
                <li key={n.notification_id}>
                  {n.drive_id ? (
                    <Link href={`/mock-drive/drives/${n.drive_id}`} className="block">{inner}</Link>
                  ) : (
                    inner
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </DriveShell>
  );
}
