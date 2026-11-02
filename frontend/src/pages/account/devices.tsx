import React, { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowLeft, Laptop, Smartphone } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';
import { apiDevices, apiSignOutDevice, apiSignOutOtherDevices } from '@/lib/auth';
import { timeAgo, type SignedInDevice } from '@/lib/deviceLimit';

/**
 * Your devices (EMAIL_LIFECYCLE_AND_DEVICES_PLAN §4): where this account is
 * signed in, with sign-out per device. The new-sign-in email links here.
 */
const isPhone = (name: string) => /iPhone|Android|iPad/i.test(name);
const dateOf = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function DevicesPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [devices, setDevices] = useState<SignedInDevice[] | null>(null);
  const [limit, setLimit] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    apiDevices()
      .then((r) => { setDevices(r.devices); setLimit(r.limit); })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent('/account/devices')}`);
      return;
    }
    load();
  }, [loading, user, router, load]);

  const run = async (key: string, fn: () => Promise<unknown>, done: string) => {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(done);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const signOutHere = async () => {
    setBusy('here');
    await logout();
    router.replace('/login');
  };

  const others = (devices || []).filter((d) => !d.current);

  return (
    <>
      <Head>
        <title>Your devices · TieEdu</title>
        <meta name="robots" content="noindex" />
      </Head>
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        <Link href="/account" className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-bold text-link">
          <ArrowLeft size={16} /> Account
        </Link>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-heading sm:text-4xl">Your devices</h1>
        <p className="mt-2 text-base text-body">
          {limit
            ? `Your account can be signed in on ${limit} devices at a time. If you see a device you don’t recognise, sign it out and change your password.`
            : 'Where your account is signed in. If you see a device you don’t recognise, sign it out and change your password.'}
        </p>

        <p role="status" aria-live="polite" className="mt-3 min-h-5 text-sm font-semibold text-[var(--color-success)]">{notice}</p>
        {error && <p role="alert" className="mt-2 rounded-xl bg-signal-soft px-4 py-3 text-sm font-semibold text-danger">{error}</p>}

        {!devices ? (
          <div className="mt-4 space-y-3" aria-hidden="true">
            {[0, 1].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-card motion-reduce:animate-none" />)}
          </div>
        ) : (
          <section aria-labelledby="dv-h" className="mt-4 rounded-3xl border border-line bg-card p-5 shadow-edge-neutral sm:p-6">
            <h2 id="dv-h" className="font-display text-xl font-extrabold text-heading">Signed in</h2>
            <ul className="mt-4 divide-y divide-line">
              {devices.map((d) => {
                const Icon = isPhone(d.name) ? Smartphone : Laptop;
                return (
                  <li key={d.id} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-ink)] text-white"><Icon size={18} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-heading">
                        {d.name}
                        {d.current && <span className="ml-2 rounded-full bg-[var(--brand-sky)]/15 px-2 py-0.5 text-xs font-bold text-link">This device</span>}
                      </p>
                      <p className="text-sm text-muted">
                        Signed in {dateOf(d.signed_in_at)} · active {d.current ? 'now' : timeAgo(d.last_active_at)}
                      </p>
                    </div>
                    {d.current ? (
                      <button type="button" disabled={!!busy} onClick={signOutHere} className="btn btn-ghost min-h-[44px] px-4 text-sm">
                        Sign out
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!!busy}
                        onClick={() => run(d.id, () => apiSignOutDevice(d.id), `Signed out of ${d.name}.`)}
                        className="btn btn-ghost min-h-[44px] px-4 text-sm"
                      >
                        {busy === d.id ? 'Signing out…' : 'Sign out'}
                      </button>
                    )}
                  </li>
                );
              })}
              {devices.length === 0 && <li className="py-3 text-sm text-muted">No active sign-ins found.</li>}
            </ul>
            {others.length > 0 && (
              <button
                type="button"
                disabled={!!busy}
                onClick={() => run('others', apiSignOutOtherDevices, 'Signed out of every other device.')}
                className="mt-4 min-h-[44px] text-sm font-bold text-danger underline-offset-2 hover:underline"
              >
                {busy === 'others' ? 'Signing out…' : 'Sign out of all other devices'}
              </button>
            )}
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
