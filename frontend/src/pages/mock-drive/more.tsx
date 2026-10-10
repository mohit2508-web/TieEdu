import React from 'react';
import Link from 'next/link';
import { UserRound, Bell, Settings, FileText, ChevronRight, LogOut } from 'lucide-react';
import { DriveShell } from '@/components/drives/DriveShell';
import { useAuth } from '@/context/AuthContext';

const ITEMS = [
  { href: '/mock-drive/profile', icon: UserRound, label: 'My profile', sub: 'Academic details used for eligibility' },
  { href: '/mock-drive/resume', icon: FileText, label: 'My resumes', sub: 'Upload and manage resume files' },
  { href: '/mock-drive/notifications', icon: Bell, label: 'Notifications', sub: 'Drive updates and reminders' },
  { href: '/mock-drive/settings', icon: Settings, label: 'Settings', sub: 'Notification and account preferences' },
] as const;

export default function MoreTab() {
  const { user, logout } = useAuth();

  return (
    <DriveShell title="More">
      <div className="mx-auto w-full max-w-[720px] px-4 pb-8 pt-4">
        {/* Account card */}
        <div className="flex items-center gap-3 rounded-[14px] border p-4" style={{ background: 'var(--apple-surface)', borderColor: 'var(--apple-separator)' }}>
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[16px] font-bold"
            style={{ background: 'var(--apple-blue-soft)', color: 'var(--apple-blue)' }}
          >
            {(user?.name || user?.email || '?').slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold" style={{ color: 'var(--apple-label)' }}>{user?.name || '—'}</p>
            <p className="truncate text-[12px]" style={{ color: 'var(--apple-label-2)' }}>{user?.email || ''}</p>
          </div>
        </div>

        {/* Nav list */}
        <div className="mt-4 overflow-hidden rounded-[14px] border" style={{ background: 'var(--apple-surface)', borderColor: 'var(--apple-separator)' }}>
          {ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3.5"
                style={{ borderTop: i === 0 ? 'none' : '0.5px solid var(--apple-separator)' }}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px]" style={{ background: 'var(--apple-fill)', color: 'var(--apple-label-2)' }}>
                  <Icon size={16} strokeWidth={1.9} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium" style={{ color: 'var(--apple-label)' }}>{item.label}</p>
                  <p className="truncate text-[12px]" style={{ color: 'var(--apple-label-2)' }}>{item.sub}</p>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--apple-label-3)' }} />
              </Link>
            );
          })}
        </div>

        {/* Sign out */}
        <button
          type="button"
          onClick={() => logout()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-[12px] border py-3 text-[14px] font-semibold"
          style={{ borderColor: 'var(--apple-separator)', background: 'var(--apple-surface)', color: 'var(--apple-red)' }}
        >
          <LogOut size={15} /> Sign out
        </button>

        <p className="mt-4 text-center text-[11px]" style={{ color: 'var(--apple-label-3)' }}>
          Mock Drives · TieEdu
        </p>
      </div>
    </DriveShell>
  );
}
