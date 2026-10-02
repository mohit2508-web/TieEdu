import { useEffect, useState } from 'react';
import api from '@/lib/api';

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

export const useWebPush = () => {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setSupported(isSupported);
    if (isSupported) {
      setPermission(Notification.permission);
    }
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
      await api.post('/notifications/subscribe', { subscription: sub.toJSON() });
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
