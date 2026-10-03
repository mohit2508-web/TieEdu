import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { getInstallId, trackInstall } from '@/lib/install';

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const SUPPORTED =
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

/**
 * Tell the server about the subscription the browser currently holds.
 *
 * This is the fix for endpoint rotation. A push service may replace a
 * subscription's endpoint at any time, and the service worker learns about it via
 * `pushsubscriptionchange` — where it has no access token and so cannot call the
 * API itself. It used to try anyway, got a 401, and the account quietly stopped
 * receiving notifications.
 *
 * The page *does* have a token, and it can read the browser's current
 * subscription, which is the new endpoint after a rotation. Re-registering on
 * load therefore repairs the server within one page view of the rotation, and
 * needs no privileged token in the worker at all.
 */
const syncSubscriptionToServer = async (): Promise<boolean> => {
  if (!SUPPORTED) return false;
  if (Notification.permission !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return false;
    // Track first: the server only links device_id to an install that exists.
    const installId = await trackInstall();
    const r = await api.post('/notifications/subscribe', {
      subscription: sub.toJSON(),
      install_id: installId,
    });
    return !!r?.ok;
  } catch {
    return false;
  }
};

export const useWebPush = () => {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSupported(SUPPORTED);
    if (!SUPPORTED) return;
    setPermission(Notification.permission);

    let cancelled = false;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (cancelled) return;
        setSubscribed(!!existing);
        // Repair a rotated endpoint, and register an install that was never
        // tracked because the user never pressed the button.
        if (existing) await syncSubscriptionToServer();
        else await trackInstall();
      } catch {
        /* no service worker yet; nothing to repair */
      }
    })();

    // The service worker asks the page to re-register when the push service
    // rotates an endpoint while the tab is open. It cannot do this itself.
    const onMessage = (e: MessageEvent) => {
      if (e?.data?.type === 'RESUBSCRIBE') void syncSubscriptionToServer();
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);

    return () => {
      cancelled = true;
      navigator.serviceWorker?.removeEventListener('message', onMessage);
    };
  }, []);

  const subscribe = async () => {
    if (!supported) return { ok: false, reason: 'not_supported' };
    setLoading(true);
    try {
      if (Notification.permission === 'default') {
        const p = await Notification.requestPermission();
        setPermission(p);
        if (p !== 'granted') return { ok: false, reason: 'denied' };
      } else if (Notification.permission === 'denied') {
        setPermission('denied');
        return { ok: false, reason: 'denied' };
      }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapid) return { ok: false, reason: 'no_vapid' };
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapid),
        });
      }
      // Track before subscribing: the server links device_id only to an install
      // that already exists, so a subscription registered first would arrive
      // unlinked and stay that way until the next visit.
      const installId = await trackInstall({ app_version: process.env.NEXT_PUBLIC_APP_VERSION });
      const r = await api.post('/notifications/subscribe', {
        subscription: sub.toJSON(),
        install_id: installId || getInstallId(),
      });
      if (!r?.ok) return { ok: false, reason: 'not_stored' };
      setSubscribed(true);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, reason: e?.message || 'error' };
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const json = sub.toJSON();
        await api.post('/notifications/unsubscribe', { endpoint: json.endpoint });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (e) {}
  };

  const test = async () => {
    try {
      await api.post('/notifications/test');
    } catch (e) {}
  };

  return { supported, permission, subscribed, loading, subscribe, unsubscribe, test };
};
