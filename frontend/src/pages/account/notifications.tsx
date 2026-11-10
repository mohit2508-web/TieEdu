import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeft, Bell, Lock, Mail, MessageCircle } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import NotificationSettings from '@/components/account/NotificationSettings';
import { useAuth } from '@/context/AuthContext';
import { apiResendVerification } from '@/lib/auth';
import {
  fetchNotificationSettings,
  saveNotificationSettings,
  type Channel,
  type NotificationSettingsView,
} from '@/lib/notificationSettingsApi';
import { cn } from '@/lib/cn';

/**
 * What we send, and where (PROFESSIONAL_PLATFORM_PLAN §4.3): three channel
 * switches, then a topic × channel grid. Every email footer links here.
 * Saves on each toggle; a failed save puts the switch back.
 */
const CHANNELS: { id: Channel; label: string; icon: React.ElementType }[] = [
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'push', label: 'App', icon: Bell },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
];

const Switch: React.FC<{ on: boolean; disabled?: boolean; label: string; onChange: (v: boolean) => void }> = ({ on, disabled, label, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!on)}
    className={cn(
      'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-ring',
      on ? 'bg-[var(--brand-ink)]' : 'bg-line',
      disabled && 'cursor-not-allowed opacity-50'
    )}
  >
    <span aria-hidden="true" className={cn('inline-block h-5 w-5 rounded-full bg-white shadow transition-transform', on ? 'translate-x-6' : 'translate-x-1')} />
  </button>
);

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [view, setView] = useState<NotificationSettingsView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent('/account/notifications')}`);
      return;
    }
    fetchNotificationSettings().then(setView).catch((e: Error) => setError(e.message));
  }, [loading, user, router]);

  const apply = async (patch: Parameters<typeof saveNotificationSettings>[0], optimistic: NotificationSettingsView) => {
    const before = view;
    setView(optimistic);
    setError(null);
    try {
      const r = await saveNotificationSettings(patch);
      setView((v) => (v ? { ...v, prefs: r.prefs, channels: r.channels } : v));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setView(before);
      setError((e as Error).message);
    }
  };

  const setChannel = (ch: Channel, on: boolean) => {
    if (!view) return;
    apply({ channels: { [ch]: on } }, { ...view, channels: { ...view.channels, [ch]: on } });
  };

  const setTopic = (topic: string, ch: Channel, on: boolean) => {
    if (!view) return;
    apply({ topics: { [topic]: { [ch]: on } } }, { ...view, prefs: { ...view.prefs, [topic]: { ...view.prefs[topic], [ch]: on } } });
  };

  return (
    <>
      <Head>
        <title>Notifications · TiEEdu</title>
        <meta name="robots" content="noindex" />
      </Head>
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        <Link href="/account" className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-bold text-link">
          <ArrowLeft size={16} /> Account
        </Link>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-heading sm:text-4xl">Notifications</h1>
        <p className="mt-2 text-base text-body">
          Choose what we send and where. Receipts and account security emails always go out — you need those.
        </p>

        <p role="status" aria-live="polite" className={cn('mt-2 h-5 text-sm font-semibold text-[var(--color-success)] transition-opacity', saved ? 'opacity-100' : 'opacity-0')}>
          Saved
        </p>
        {error && <p role="alert" className="mt-2 rounded-xl bg-signal-soft px-4 py-3 text-sm font-semibold text-danger">{error}</p>}

        {!view ? (
          <div className="mt-6 space-y-3" aria-hidden="true">
            {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-card motion-reduce:animate-none" />)}
          </div>
        ) : (
          <>
            {!view.email_verified && (
              <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-[var(--brand-accent)]/40 bg-[var(--brand-accent)]/10 p-4 sm:flex-row sm:items-center">
                <p className="flex-1 text-sm text-body">
                  <strong className="text-heading">Confirm {view.email}</strong> to get results, updates and recommendations by email.
                </p>
                {resent ? (
                  <span className="text-sm font-semibold text-heading">Link sent — check your inbox.</span>
                ) : (
                  <button type="button" onClick={() => apiResendVerification().then(() => setResent(true)).catch((e: Error) => setError(e.message))} className="btn btn-primary min-h-[44px] px-5 text-sm">
                    Send confirmation link
                  </button>
                )}
              </div>
            )}

            <section aria-labelledby="ch-h" className="mt-6 rounded-3xl border border-line bg-card p-5 shadow-edge-neutral sm:p-6">
              <h2 id="ch-h" className="font-display text-xl font-extrabold text-heading">Channels</h2>
              <ul className="mt-4 divide-y divide-line">
                {CHANNELS.map((c) => {
                  const waBlocked = c.id === 'whatsapp' && !view.whatsapp?.number;
                  return (
                    <li key={c.id} className="flex items-center gap-3 py-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-ink)] text-white"><c.icon size={18} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-heading">{c.id === 'push' ? 'App notifications' : c.label}</p>
                        <p className="text-sm text-muted">
                          {c.id === 'email' && view.email}
                          {c.id === 'push' && 'On the devices where you allowed notifications.'}
                          {c.id === 'whatsapp' &&
                            (view.whatsapp?.number ? (
                              <>{view.whatsapp.number}{!view.whatsapp.verified && ' · confirmation coming soon'}</>
                            ) : (
                              <>Add your number in <Link href="/welcome?next=/account/notifications" className="font-semibold text-link underline">your profile</Link> first.</>
                            ))}
                        </p>
                      </div>
                      <Switch label={`${c.label} on or off`} on={view.channels[c.id] && !waBlocked} disabled={waBlocked} onChange={(v) => setChannel(c.id, v)} />
                    </li>
                  );
                })}
              </ul>
            </section>

            <section aria-labelledby="dev-h" className="mt-4">
              <h2 id="dev-h" className="sr-only">This device</h2>
              <NotificationSettings />
            </section>

            <section aria-labelledby="tp-h" className="mt-6 rounded-3xl border border-line bg-card p-5 shadow-edge-neutral sm:p-6">
              <h2 id="tp-h" className="font-display text-xl font-extrabold text-heading">What we send</h2>
              <div className="mt-4 hidden grid-cols-[minmax(0,1fr)_repeat(3,56px)] gap-2 px-1 text-center text-xs font-bold uppercase tracking-wider text-muted sm:grid">
                <span className="text-left">Topic</span>
                {CHANNELS.map((c) => <span key={c.id}>{c.label}</span>)}
              </div>
              <ul className="mt-2 divide-y divide-line">
                {view.topics.map((t) => (
                  <li key={t.id} className="grid grid-cols-1 gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_repeat(3,56px)] sm:items-center sm:gap-2">
                    <div className="min-w-0 px-1">
                      <p className="flex items-center gap-1.5 font-bold text-heading">
                        {t.label} {t.required && <Lock size={13} className="text-muted" aria-label="Email always on" />}
                      </p>
                      <p className="text-sm text-muted">{t.description}</p>
                    </div>
                    <div className="flex gap-4 sm:contents">
                      {CHANNELS.map((c) => {
                        const locked = t.required && c.id === 'email';
                        const channelOff = !view.channels[c.id];
                        return (
                          <div key={c.id} className="flex items-center gap-2 sm:justify-center">
                            <span className="text-xs font-semibold text-muted sm:hidden">{c.label}</span>
                            <Switch
                              label={`${t.label} by ${c.label}`}
                              on={locked || (!!view.prefs[t.id]?.[c.id] && !channelOff)}
                              disabled={locked || channelOff}
                              onChange={(v) => setTopic(t.id, c.id, v)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-muted">
                A switched-off channel above turns that column off for every topic. We never send app or WhatsApp
                messages between 10 pm and 8 am, except receipts, certificates and account alerts.
              </p>
            </section>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
