import React, { useCallback, useEffect, useState } from 'react';
import {
  BellRing,
  BellOff,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldOff,
  Smartphone,
} from 'lucide-react';
import { fetchMySubscriptionsApi, MySubscription } from '@/lib/api';
import { useWebPush } from '@/hooks/useWebPush';

type SubRow = MySubscription;

const card = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-sm';

const fmt = (v: string | null) => {
  if (!v) return 'never';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? 'unknown' : d.toLocaleString();
};

/**
 * Admin panel → Notifications.
 *
 * The only way an admin can verify their own push setup before trusting it for
 * real announcements. Two halves that answer two different questions:
 *
 *   1. "Is this browser ready?" — the same permission and subscription state the
 *      student-facing control shows, because a notification test that silently
 *      cannot deliver is the single most confusing failure in this feature.
 *   2. "What has the server actually stored?" — the rows themselves, because a
 *      subscription the browser believes it has and the server does not is the
 *      other common failure, and nothing else surfaces it.
 *
 * Scope is deliberately the caller's own subscriptions. There is no "send to
 * user" or broadcast control here on purpose: this route can only push to
 * whoever presses the button, and adding staff-triggered delivery to arbitrary
 * accounts is a spam decision that belongs in its own change with its own limits.
 */
export const NotificationsTab: React.FC = () => {
  const { supported, permission, subscribed, loading, subscribe, test } = useWebPush();

  const [rows, setRows] = useState<SubRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ tone: 'ok' | 'warn' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoadingRows(true);
    setLoadError(null);
    try {
      setRows(await fetchMySubscriptionsApi());
    } catch (e: any) {
      setLoadError(e?.message || 'Could not load your subscriptions.');
      setRows([]);
    } finally {
      setLoadingRows(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onEnable = async () => {
    setResult(null);
    const r = await subscribe();
    if (r.ok) {
      setResult({ tone: 'ok', text: 'Notifications enabled on this device.' });
      void load();
    } else if (r.reason === 'denied') {
      setResult({
        tone: 'warn',
        text: 'Blocked in browser settings. Tap the site icon in the address bar, then set Notifications to Allow.',
      });
    } else if (r.reason === 'not_supported') {
      setResult({
        tone: 'warn',
        text: 'This browser cannot show push. On iPhone, install TieEdu to the Home Screen first (iOS 16.4+).',
      });
    } else if (r.reason === 'no_vapid') {
      setResult({ tone: 'error', text: 'Push keys are not configured on the server.' });
    } else if (r.reason === 'no_service_worker') {
      // Registration is production-only (`_app.tsx`), so this is what a dev
      // origin or an unregistered scope looks like. Saying so beats a button
      // that spins forever with no explanation.
      setResult({
        tone: 'error',
        text: 'No service worker is registered for this origin, so push cannot work here. Serve the production build over http://localhost or https.',
      });
    } else {
      setResult({ tone: 'error', text: `Could not enable notifications (${r.reason}).` });
    }
  };

  const onTest = async () => {
    setResult(null);
    setSending(true);
    try {
      const r = await test();
      if (r.ok && (r.sent || 0) > 0) {
        setResult({
          tone: 'ok',
          text: `Sent to ${r.sent} device${r.sent === 1 ? '' : 's'}. Check this phone — it arrives even with the app closed.`,
        });
        void load();
      } else if (r.ok) {
        setResult({
          tone: 'warn',
          text: 'No active subscription for your account, so there was nothing to send to. Enable notifications on this device first.',
        });
      } else {
        setResult({ tone: 'error', text: `Send failed: ${r.reason || 'unknown error'}` });
      }
    } finally {
      setSending(false);
    }
  };

  const live = rows.filter((r) => !r.blocked);
  const blocked = rows.filter((r) => r.blocked);

  return (
    <div className="space-y-5">
      {/* 1. This browser */}
      <div className={card}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-[#10151C] flex items-center gap-2">
              <BellRing className="w-4 h-4 text-[#B45309]" /> This device
            </h3>
            <p className="text-xs text-[#6B7280] mt-1.5 leading-relaxed max-w-2xl">
              Push only works from an installed app. Open the site in a browser tab and Chrome or Safari will
              refuse permission; add TieEdu to your Home Screen first. On iPhone this needs iOS 16.4 or newer.
            </p>
          </div>
          {!supported ? (
            <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#EEF1F4] text-[#6B7280] text-[11px] font-bold">
              <BellOff className="w-3.5 h-3.5" /> Not supported
            </span>
          ) : permission === 'denied' ? (
            <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#FDF2E9] text-[#C77B12] text-[11px] font-bold">
              <ShieldOff className="w-3.5 h-3.5" /> Blocked
            </span>
          ) : (
            <span
              className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold ${
                subscribed ? 'bg-emerald-50 text-emerald-700' : 'bg-[#EEF1F4] text-[#6B7280]'
              }`}
            >
              {subscribed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              {subscribed ? 'Subscribed' : 'Not subscribed'}
            </span>
          )}
        </div>

        {supported && (
          <div className="flex flex-wrap gap-2.5 mt-4 pt-4 border-t border-gray-100">
            {!subscribed && permission !== 'denied' && (
              <button
                onClick={onEnable}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#1F3A5F] hover:bg-[#2b4d75] disabled:opacity-60 text-white rounded-xl text-xs font-bold transition"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellRing className="w-3.5 h-3.5" />}
                Enable on this device
              </button>
            )}

            <button
              onClick={onTest}
              disabled={sending || loading || permission === 'denied'}
              title={
                permission === 'denied'
                  ? 'Permission is blocked in browser settings.'
                  : 'Sends a real notification to your own registered devices'
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0284C7] hover:bg-[#0369a1] disabled:opacity-60 text-white rounded-xl text-xs font-bold transition"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send test to my devices
            </button>

            <button
              onClick={load}
              disabled={loadingRows}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 hover:bg-gray-50 disabled:opacity-60 rounded-xl text-xs font-bold text-[#10151C] transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingRows ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        )}

        {result && (
          <p
            className={`mt-3.5 text-[11px] leading-relaxed flex items-start gap-1.5 ${
              result.tone === 'ok' ? 'text-emerald-700' : result.tone === 'warn' ? 'text-[#C77B12]' : 'text-[#C1442D]'
            }`}
          >
            {result.tone === 'ok' ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-px" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
            )}
            {result.text}
          </p>
        )}
      </div>

      {/* 2. What the server stored */}
      <div className={card}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-[#10151C] flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#0284C7]" /> Registered endpoints
            </h3>
            <p className="text-xs text-[#6B7280] mt-1.5 leading-relaxed max-w-2xl">
              Every browser your account has registered. A test notification goes to all {live.length} active
              endpoint{live.length === 1 ? '' : 's'}.
            </p>
          </div>
          {!loadingRows && (
            <span className="shrink-0 text-[11px] font-bold text-[#6B7280]">
              {live.length} active{blocked.length ? `, ${blocked.length} blocked` : ''}
            </span>
          )}
        </div>

        {loadError && (
          <p className="mt-4 text-[11px] text-[#C1442D] flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" /> {loadError}
          </p>
        )}

        {!loadingRows && !loadError && rows.length === 0 && (
          <p className="mt-4 text-xs text-[#6B7280] bg-[#FAFAF9] border border-gray-100 rounded-xl p-4">
            No endpoints registered for your account yet. Enable notifications on this device, then send a test.
          </p>
        )}

        {rows.length > 0 && (
          <div className="mt-4 space-y-2.5">
            {rows.map((r) => (
              <div
                key={r.id}
                className={`border rounded-xl p-3.5 ${
                  r.blocked ? 'border-[#F0D9CF] bg-[#FDF8F5]' : 'border-gray-100 bg-[#FAFAF9]'
                }`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#10151C] truncate">
                      {r.platform || r.user_agent || 'Unknown device'}
                      {r.blocked && <span className="ml-2 text-[#C1442D]">blocked</span>}
                    </p>
                    <p className="text-[10px] font-mono text-[#9CA3AF] mt-1 truncate">{r.endpoint_hint}</p>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-1 rounded-md text-[10px] font-bold ${
                      r.blocked ? 'bg-[#FDEBE4] text-[#C1442D]' : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {r.blocked ? r.disable_reason || 'blocked' : 'active'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-[10px] text-[#6B7280]">
                  <span>Registered {fmt(r.created_at)}</span>
                  <span>Last success {fmt(r.last_success_at)}</span>
                  {r.failure_count > 0 && <span className="text-[#C77B12]">{r.failure_count} failed send(s)</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};