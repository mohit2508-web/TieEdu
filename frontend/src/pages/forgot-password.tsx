import React, { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Loader2 } from 'lucide-react';
import { AuthAlert, AuthShell, authInputCls } from '@/components/auth/AuthShell';
import { apiForgotPassword } from '@/lib/auth';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof router.query.email === 'string') setEmail(router.query.email);
  }, [router.query.email]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Enter the email you signed up with.');
    setBusy(true);
    try {
      const r = await apiForgotPassword(email.trim());
      setSent(r.message);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Reset password"
      eyebrow="Account help"
      heading="Forgot your password?"
      lede="Enter your account email and we will send you a link to choose a new one."
    >
      {sent ? (
        <>
          <AuthAlert tone="ok">{sent}</AuthAlert>
          <p className="text-sm text-body">
            Not in your inbox? Check spam or promotions, or{' '}
            <button type="button" className="font-bold text-link underline" onClick={() => setSent(null)}>try again</button>.
          </p>
        </>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <AuthAlert tone="error">{error}</AuthAlert>}
          <label className="block text-xs font-bold uppercase tracking-wide text-body">
            Email
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              enterKeyHint="send"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@college.edu"
              className={`mt-1.5 normal-case tracking-normal font-normal ${authInputCls}`}
            />
          </label>
          <button type="submit" disabled={busy} className="btn btn-primary w-full py-3.5 text-sm focus-ring disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send reset link'}
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-body">
        Remembered it? <Link href="/login" className="font-bold text-link">Sign in</Link>
      </p>
    </AuthShell>
  );
}
