import { useEffect, useState } from 'react';
import api, { fetchVapidPublicKey, sendTestPushApi } from '@/lib/api';
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
 * Await a promise, but not forever.
 *
 * `navigator.serviceWorker.ready` is the correct way to wait for a worker, and it
 * resolves promptly when one is registered — but it stays pending indefinitely
 * when one never is, so every caller that awaited it raw hung with no error and no
 * way for the UI to explain why. On timeout it resolves to null, which callers
 * treat as "no worker" and report as a real reason.
 *
 * Resolves to null rather than rejecting: a timeout here is an expected outcome
 * that callers map to a message, not an exception for them to catch.
 */
const withTimeout = async <T,>(p: Promise<T>, ms: number): Promise<T | null> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

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
    // Bounded `ready`; see subscribe() for why the wait is capped.
    const reg = await withTimeout(navigator.serviceWorker.ready, 3000);
    if (!reg) return false;
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
        // `ready` — but bounded. Registration is kicked off by `_app.tsx` on the
        // `load` event, which is a separate effect with no coordination, so
        // `getRegistration()` alone raced it and usually returned null on a cold
        // load. `ready` waits for the registration instead of giving up on it.
        //
        // It also never settles when nothing is ever registered, which is the
        // other half of the problem: a button that spins forever with no message
        // is the worst failure mode. So the wait is capped, and the timeout
        // becomes a reason the UI can actually explain.
        const reg = await withTimeout(navigator.serviceWorker.ready, 3000);
        if (cancelled || !reg) return;
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
      // Bounded `ready`, then an explicit registration as a fallback. `_app.tsx`
      // starts the registration on the `load` event and nothing coordinates the
      // two, so on a cold load the worker is often still being installed at this
      // point. Registering here as well is idempotent and removes the race.
      let reg = await withTimeout(navigator.serviceWorker.ready, 3000);
      if (!reg) {
        reg = await navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .catch(() => null);
      }
      if (!reg) return { ok: false, reason: 'no_service_worker' };
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        // Read from the server, not from this bundle. A build-time constant cannot
        // be corrected by a server restart, which is what left stale clients stuck
        // on "push keys are not configured" while the server was fine.
        const vapid = await fetchVapidPublicKey();
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
      // Bounded `ready`; see subscribe() for why the wait is capped.
      const reg = await withTimeout(navigator.serviceWorker.ready, 3000);
      const sub = (await reg?.pushManager.getSubscription()) || null;
      if (sub) {
        const json = sub.toJSON();
        await api.post('/notifications/unsubscribe', { endpoint: json.endpoint });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (e) {}
  };

  /**
   * Sends a real test push to this browser.
   *
   * Returns the server's verdict rather than swallowing it. An admin pressing
   * "send test" needs to know whether a notification actually went out: the
   * common failure is having no subscription registered at all, and `sent: 0` is
   * the only honest way to say so. A rejected promise would render identically to
   * success on a button with no other feedback.
   *
   * Uses `sendTestPushApi` rather than `api.post`, because the client helper
   * returns the raw `Response` — reading `.sent` off that is `undefined`, which
   * would report a successful send for a message that never left.
   */
  const test = async (): Promise<{ ok: boolean; sent?: number; failed?: number; reason?: string }> => {
    try {
      const r = await sendTestPushApi();
      const sent = Number(r?.sent ?? 0);
      const failed = Number(r?.failed ?? 0);
      return { ok: sent > 0 || failed === 0, sent, failed };
    } catch (e: any) {
      return { ok: false, reason: e?.message || 'request_failed' };
    }
  };

  return { supported, permission, subscribed, loading, subscribe, unsubscribe, test };
};
