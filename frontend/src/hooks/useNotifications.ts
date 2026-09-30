'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchMyAccount, fetchMyReports, fetchMyXpLedgerApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  deriveNotifications,
  nextReadState,
  parseReadState,
  readStorageKey,
  unreadCount,
  type AppNotification,
  type NotificationOrder,
  type NotificationReport,
  type NotificationSources,
  type NotificationXpEntry,
  type ReadState,
} from '@/lib/notifications';

/**
 * Feeds the notification bell.
 *
 * Deliberately poll-free. There is no notification table and no websocket, so
 * the only moments worth refetching are the ones where something actually
 * changed: the student signs in, the tab regains focus, they finish a lesson,
 * or they come back from a payment. A `setInterval` here would re-request three
 * endpoints every minute for every open tab, which is a lot of traffic for a
 * badge nobody is looking at, and the honest fix is a push channel rather than
 * a shorter interval.
 *
 * Refetching on `focus` is the cheap half of push: a student who pays by UPI in
 * another tab and comes back sees "Vault unlocked" without a manual refresh.
 */
export interface UseNotificationsResult {
  notifications: AppNotification[];
  unread: number;
  readState: ReadState;
  loading: boolean;
  /** Called when the panel opens — marks everything currently listed as seen. */
  markAllRead: () => void;
  refresh: () => void;
}

const FOCUS_THROTTLE_MS = 30_000;

export const useNotifications = (): UseNotificationsResult => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [sources, setSources] = useState<NotificationSources>({});
  const [readState, setReadState] = useState<ReadState>({ cursor: null, seen: 0 });
  const [loading, setLoading] = useState(false);
  const lastFocusFetch = useRef(0);

  // Read state is per-account, so it is loaded on sign-in and dropped on
  // sign-out. Without the reset, the next student to sign in on a shared device
  // would inherit a cursor and see an empty bell.
  useEffect(() => {
    if (!userId) {
      setSources({});
      setReadState({ cursor: null, seen: 0 });
      return;
    }
    let active = true;
    try {
      setReadState(parseReadState(window.localStorage.getItem(readStorageKey(userId))));
    } catch {
      setReadState({ cursor: null, seen: 0 });
    }
    return () => {
      active = false;
    };
  }, [userId]);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [account, reports, xp] = await Promise.all([
      fetchMyAccount().catch(() => null),
      fetchMyReports().catch(() => null),
      fetchMyXpLedgerApi().catch(() => null),
    ]);

    const next: NotificationSources = {
      orders: (account?.orders as NotificationOrder[] | undefined) ?? null,
      reports: (Array.isArray(reports) ? (reports as NotificationReport[]) : (reports?.reports ?? null)) as
        | NotificationReport[]
        | null,
      xp: xp?.entries as NotificationXpEntry[] | null,
    };
    setSources(next);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    load();
  }, [userId, load]);

  // A purchase unlocks server-owned state. When the student returns to this tab
  // the bell is stale, and the throttle keeps a rapid alt-tab from hammering the
  // API while still feeling immediate.
  useEffect(() => {
    if (!userId) return;
    const onFocus = () => {
      const now = Date.now();
      if (now - lastFocusFetch.current < FOCUS_THROTTLE_MS) return;
      lastFocusFetch.current = now;
      load();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [userId, load]);

  const notifications = useMemo(() => deriveNotifications(sources), [sources]);
  const unread = useMemo(() => unreadCount(notifications, readState), [notifications, readState]);

  const markAllRead = useCallback(() => {
    setReadState((prev) => {
      if (unread === 0) return prev;
      const next = nextReadState(notifications, prev);
      try {
        window.localStorage.setItem(readStorageKey(userId), JSON.stringify(next));
      } catch {
        // Read state is a convenience; failing to persist it must not interrupt
        // the user reading their notifications.
      }
      return next;
    });
  }, [notifications, unread, userId]);

  return { notifications, unread, readState, loading, markAllRead, refresh: load };
};
