'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Bell, Check, Loader2 } from 'lucide-react';
import { useShell } from '@/context/ShellContext';
import { useNotifications } from '@/hooks/useNotifications';
import { formatBadgeCount, type NotificationTone } from '@/lib/notifications';
import { cn } from '@/lib/cn';

/**
 * Tones are colour + shape, not colour alone. A red dot is indistinguishable
 * from a green one to a student with deuteranopia, and a bell that says
 * "payment rejected" next to one that says "vault unlocked" must be told apart
 * by something other than hue — hence the icon on every row.
 */
const TONE_STYLE: Record<NotificationTone, { chip: string; icon: React.ReactNode }> = {
  info: { chip: 'bg-signal-soft text-signal-hover', icon: <Bell size={13} strokeWidth={2.5} aria-hidden /> },
  success: { chip: 'bg-emerald-50 text-emerald-700', icon: <Check size={13} strokeWidth={3} aria-hidden /> },
  warning: { chip: 'bg-amber-50 text-amber-deep', icon: <Loader2 size={13} strokeWidth={2.5} aria-hidden /> },
  error: { chip: 'bg-red-50 text-red-700', icon: <Bell size={13} strokeWidth={2.5} aria-hidden /> },
};

const TONE_LABEL: Record<NotificationTone, string> = {
  info: 'Update',
  success: 'Done',
  warning: 'In progress',
  error: 'Needs attention',
};

export const NotificationBell: React.FC = () => {
  const router = useRouter();
  const { isOpen, toggleOverlay, closeOverlay } = useShell();
  const { notifications, unread, loading, markAllRead } = useNotifications();
  const open = isOpen('notifications');
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Mark-as-read on open, not on click: the moment the panel is visible the
  // student has been told. Deferring it to a click per row would mean the badge
  // still shows 7 while they read all seven.
  useEffect(() => {
    if (open) markAllRead();
  }, [open, markAllRead]);

  // Outside click and focus escape. The global Escape handler in ShellContext
  // already closes the top overlay, so this only has to handle pointer clicks
  // and a Tab out of the panel.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      closeOverlay('notifications');
    };
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      closeOverlay('notifications');
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [open, closeOverlay]);

  const label =
    unread > 0
      ? `Notifications, ${unread} unread`
      : notifications.length > 0
        ? 'Notifications'
        : 'Notifications, none yet';

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => toggleOverlay('notifications')}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={label}
        className="icon-btn"
      >
        {loading && notifications.length === 0 ? (
          <Loader2 size={19} className="animate-spin" aria-hidden />
        ) : (
          <Bell size={19} strokeWidth={2} aria-hidden />
        )}
        {unread > 0 && (
          <span className="chrome-badge chrome-badge--info absolute -right-0.5 -top-0.5" aria-hidden>
            {formatBadgeCount(unread)}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications"
          className="animate-slide-up-chrome absolute right-0 top-[calc(100%+10px)] z-50 w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-white shadow-[var(--shadow-float)]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 className="text-sm font-bold text-heading">Notifications</h2>
            {loading && (
              <span className="text-xs text-text-light">
                <Loader2 size={12} className="mr-1 inline animate-spin" aria-hidden />
                Checking
              </span>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-semibold text-heading">Nothing to report</p>
              <p className="mt-1 text-sm leading-relaxed text-text-light">
                Payment updates, interview report decisions and XP awards all show up here.
              </p>
            </div>
          ) : (
            <ul className="max-h-[min(26rem,60vh)] overflow-y-auto">
              {notifications.map((item) => {
                const tone = TONE_STYLE[item.tone];
                return (
                  <li key={item.id} className="border-b border-line last:border-b-0">
                    <button
                      type="button"
                      onClick={() => {
                        closeOverlay('notifications');
                        router.push(item.href);
                      }}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-app-warm focus:bg-app-warm focus:outline-none"
                    >
                      <span
                        className={cn(
                          'mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-lg',
                          tone.chip
                        )}
                        aria-hidden
                      >
                        {tone.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-semibold leading-snug text-heading">
                            {item.title}
                          </span>
                          <span className="flex-none text-xs font-semibold uppercase tracking-wide text-text-light">
                            {TONE_LABEL[item.tone]}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-sm leading-relaxed text-muted">
                          {item.body}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {notifications.length > 0 && (
            <div className="border-t border-line bg-app-warm px-4 py-2.5">
              <p className="text-xs leading-relaxed text-text-light">
                Seen on this device. Signing in on another device will show them again.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
};

/** Exported for the mobile drawer, which lists the same rows inline. */
export { TONE_STYLE as NOTIFICATION_TONE_STYLE, TONE_LABEL as NOTIFICATION_TONE_LABEL };
