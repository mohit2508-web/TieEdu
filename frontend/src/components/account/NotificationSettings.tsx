import React, { useEffect, useState } from 'react';
import { BellRing, BellOff, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { useWebPush } from '@/hooks/useWebPush';

/**
 * "Enable notifications" control.
 *
 * Lives on the account page rather than behind a settings menu, because the
 * browser permission prompt only fires inside a user gesture and only once per
 * origin. Burying it one screen deeper is how a permission prompt nobody ever
 * sees becomes a push feature nobody uses.
 *
 * Deliberately explains the platform rules instead of just asking. iOS refuses
 * push for any browser tab and silently ignores `requestPermission()` outside a
 * Home Screen install, so a user who taps this on iOS Safari and is told nothing
 * concludes the app is broken. Saying it up front is the difference between
 * "this does not work" and "I know to install it first".
 */
export default function NotificationSettings({ compact = false }: { compact?: boolean }) {
  const { supported, permission, subscribed, loading, subscribe, unsubscribe } = useWebPush();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'warn' | 'error'; text: string } | null>(null);

  // Reflect the real subscription on load. Without this the button always reads
  // "Enable" to someone who already enabled it, and pressing it again creates a
  // second subscription row instead of telling them they are done.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supported || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled && sub) setBusy(false);
      } catch {
        /* no subscription yet */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supported]);

  const onToggle = async () => {
    setMessage(null);
    setBusy(true);
    try {
      if (subscribed) {
        await unsubscribe();
        setMessage({ tone: 'ok', text: 'Notifications turned off on this device.' });
        return;
      }
      const res = await subscribe();
      if (res.ok) {
        setMessage({ tone: 'ok', text: 'Notifications are on. Announcements will arrive on this device.' });
      } else if (res.reason === 'denied') {
        // The browser will not ask again. Point at the setting that can undo it
        // rather than leaving a button that silently does nothing forever.
        setMessage({
          tone: 'warn',
          text: 'Blocked in browser settings. To allow: tap the lock/site icon in the address bar, then set Notifications to Allow.',
        });
      } else if (res.reason === 'not_supported') {
        setMessage({
          tone: 'warn',
          text: 'This browser cannot show push notifications. On iPhone, install TieEdu to the Home Screen first (iOS 16.4 or newer).',
        });
      } else if (res.reason === 'no_vapid') {
        setMessage({ tone: 'error', text: 'Push is not configured on the server yet. Please try again later.' });
      } else if (res.reason === 'api_unreachable') {
        // Deliberately worded differently from "not configured". Saying
        // "not configured yet, try again later" when the real problem is that the
        // app cannot reach the server sends the user off to wait for something
        // that is not going to change on its own.
        setMessage({
          tone: 'error',
          text: 'This app cannot reach the TieEdu server, so notifications cannot be set up. Check your connection and try again.',
        });
      } else {
        setMessage({ tone: 'error', text: `Could not enable notifications (${res.reason}). Please try again.` });
      }
    } finally {
      setBusy(false);
    }
  };

  if (!supported) {
    // Not an error worth a red panel. iOS Safari in a tab is a deliberate,
    // well-known limitation, not a broken page.
    if (compact) return null;
    return (
      <div className="vault-card p-4 flex items-start gap-3">
        <BellOff className="w-4 h-4 text-[--text-muted] shrink-0 mt-0.5" />
        <p className="text-[12px] text-[--text-muted] leading-relaxed">
          This browser cannot show push notifications. Install TieEdu to your Home Screen or desktop to
          receive announcements. On iPhone this needs iOS 16.4 or newer.
        </p>
      </div>
    );
  }

  const on = subscribed && permission === 'granted';

  return (
    <div className="vault-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-extrabold text-[#10151C]">Announcements &amp; notifications</p>
          <p className="text-[12px] text-[--text-muted] mt-1 leading-relaxed">
            {on
              ? 'On. You will get new courses, new lessons in courses you are taking, new company material, and a weekly reminder if you have lessons left.'
              : 'Turn on to hear about new courses, new lessons in courses you are taking, new company material and announcements from TieEdu — even when the app is closed.'}
          </p>
          {on && (
            <p className="text-[11px] text-[--text-muted] mt-1.5 leading-relaxed">
              At most one reminder a week, and only if a course is genuinely unfinished. Nothing else
              repeats.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onToggle}
          disabled={loading || busy}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-extrabold transition disabled:opacity-60 ${
            on ? 'bg-[#EEF1F4] text-[#10151C]' : 'bg-[#10151C] text-white'
          }`}
        >
          {loading || busy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : on ? (
            <BellOff className="w-3.5 h-3.5" />
          ) : (
            <BellRing className="w-3.5 h-3.5" />
          )}
          {on ? 'Turn off' : 'Enable'}
        </button>
      </div>

      {message && (
        <p
          className={`mt-3 text-[11px] leading-relaxed flex items-start gap-1.5 ${
            message.tone === 'ok'
              ? 'text-emerald-700'
              : message.tone === 'warn'
                ? 'text-[#C77B12]'
                : 'text-[#C1442D]'
          }`}
        >
          {message.tone === 'ok' ? (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-px" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
          )}
          {message.text}
        </p>
      )}
    </div>
  );
}