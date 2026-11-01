import React, { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Loader2 } from 'lucide-react';
import { AuthAlert, AuthShell, authInputCls } from '@/components/auth/AuthShell';
import { useAuth } from '@/context/AuthContext';
import { afterAuthPath, apiResetPassword } from '@/lib/auth';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { adoptSession } = useAuth();
  const token = typeof router.query.token === 'string' ? router.query.token : '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirm) return setError('The two passwords do not match.');
    setBusy(true);
    try {
      const data = await apiResetPassword(token, password);
      router.replace(afterAuthPath(adoptSession(data), '/'));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  if (router.isReady && !token) {
    return (
      <AuthShell title="Reset password" eyebrow="Account help" heading="This link is incomplete">
        <p className="text-base text-body">Open the link from the email again, or ask for a new one.</p>
        <Link href="/forgot-password" className="btn btn-primary mt-6 w-full py-3.5 text-sm">Send a new link</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      eyebrow="Account help"
      heading="Choose a new password"
      lede="You will be signed out on other devices and signed in here."
    >
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <AuthAlert tone="error">
            {error} {/expired|invalid/i.test(error) && <Link className="underline" href="/forgot-password">Get a new link</Link>}
          </AuthAlert>
        )}
        <label className="block text-xs font-bold uppercase tracking-wide text-body">
          New password
          <input type="password" autoComplete="new-password" enterKeyHint="next" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" className={`mt-1.5 normal-case tracking-normal font-normal ${authInputCls}`} />
        </label>
        <label className="block text-xs font-bold uppercase tracking-wide text-body">
          Confirm password
          <input type="password" autoComplete="new-password" enterKeyHint="go" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={`mt-1.5 normal-case tracking-normal font-normal ${authInputCls}`} />
        </label>
        <button type="submit" disabled={busy || !token} className="btn btn-primary w-full py-3.5 text-sm focus-ring disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save and sign in'}
        </button>
      </form>
    </AuthShell>
  );
}
