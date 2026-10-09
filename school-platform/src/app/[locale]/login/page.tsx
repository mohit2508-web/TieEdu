'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { cn } from '@/lib/utils';

type Mode = 'password' | 'pin' | 'otp';

export default function LoginPage() {
  const t = useTranslations('login');
  const locale = useLocale();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('password');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [pin, setPin] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  const done = () => router.push(`/${locale}/dashboard`);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const payload =
        mode === 'password'
          ? { mode, email, password }
          : mode === 'pin'
            ? { mode, schoolCode, rollNo, pin }
            : { mode, phone, code: otp };

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sign in failed');
      done();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function requestOtp() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', phone, purpose: 'LOGIN' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not send code');
      setOtpSent(true);
      setNotice(t('otpSent'));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const tabs: { id: Mode; label: string }[] = [
    { id: 'password', label: t('tabPassword') },
    { id: 'pin', label: t('tabPin') },
    { id: 'otp', label: t('tabOtp') },
  ];

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-sky-500';

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-5 py-8">
      <header className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-lg font-extrabold text-sky-800">{t('title')}</span>
          <span className="text-xs text-slate-500">{t('subtitle')}</span>
        </div>
        <LanguageSwitcher />
      </header>

      <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setMode(tab.id);
              setError(null);
              setNotice(null);
            }}
            className={cn(
              'rounded-lg px-2 py-2 transition-colors',
              mode === tab.id ? 'bg-white text-sky-800 shadow' : 'text-slate-500'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        {mode === 'password' && (
          <>
            <input className={inputClass} placeholder={t('email')} value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            <input className={inputClass} placeholder={t('password')} value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </>
        )}

        {mode === 'pin' && (
          <>
            <input className={inputClass} placeholder={t('schoolCode')} value={schoolCode} onChange={(e) => setSchoolCode(e.target.value.toUpperCase())} required />
            <input className={inputClass} placeholder={t('rollNo')} value={rollNo} onChange={(e) => setRollNo(e.target.value)} required />
            <input className={inputClass} placeholder={t('pin')} value={pin} onChange={(e) => setPin(e.target.value)} inputMode="numeric" required />
          </>
        )}

        {mode === 'otp' && (
          <>
            <div className="flex gap-2">
              <input className={inputClass} placeholder={t('phone')} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" required />
              <button
                type="button"
                onClick={requestOtp}
                disabled={busy || !phone}
                className="whitespace-nowrap rounded-xl border border-sky-200 bg-sky-50 px-3 text-sm font-semibold text-sky-800 disabled:opacity-50"
              >
                {t('sendOtp')}
              </button>
            </div>
            <input
              className={inputClass}
              placeholder={t('otp')}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              inputMode="numeric"
              required
              disabled={!otpSent}
            />
          </>
        )}

        {notice && <p className="text-sm text-emerald-600">{notice}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-1 rounded-xl bg-sky-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {busy ? t('signingIn') : t('signIn')}
        </button>
      </form>
    </main>
  );
}
