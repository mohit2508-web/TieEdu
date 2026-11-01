import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { AuthAlert, AuthShell } from '@/components/auth/AuthShell';
import { useAuth } from '@/context/AuthContext';
import { apiResendVerification, apiVerifyEmail } from '@/lib/auth';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const [state, setState] = useState<'working' | 'ok' | 'error'>('working');
  const [message, setMessage] = useState('');
  const [resent, setResent] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (!router.isReady || ran.current) return;
    ran.current = true; // tokens are single-use; never post twice
    const token = typeof router.query.token === 'string' ? router.query.token : '';
    if (!token) {
      setState('error');
      setMessage('This link is incomplete. Open it again from the email.');
      return;
    }
    apiVerifyEmail(token)
      .then((r) => {
        setState('ok');
        setMessage(r.email);
      })
      .catch((e: Error) => {
        setState('error');
        setMessage(e.message);
      });
  }, [router.isReady, router.query.token]);

  // Keep the signed-in user in step once the server has confirmed.
  useEffect(() => {
    if (state === 'ok' && user && !user.email_verified && user.email === message) updateUser({ ...user, email_verified: true });
  }, [state, user, message, updateUser]);

  return (
    <AuthShell title="Confirm email" eyebrow="Account" heading={state === 'ok' ? 'Email confirmed' : 'Confirming your email'}>
      {state === 'working' && (
        <p className="flex items-center gap-2 text-base text-body"><Loader2 className="h-4 w-4 animate-spin" /> One moment…</p>
      )}
      {state === 'ok' && (
        <>
          <p className="flex items-start gap-2 text-base text-body">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-success)]" />
            <span>Thanks — <strong>{message}</strong> is confirmed. Results, receipts and certificates will come here.</span>
          </p>
          <Link href="/" className="btn btn-primary mt-6 w-full py-3.5 text-sm">Continue to TieEdu</Link>
        </>
      )}
      {state === 'error' && (
        <>
          <AuthAlert tone="error">{message}</AuthAlert>
          {user && !user.email_verified ? (
            resent ? (
              <AuthAlert tone="ok">A new link is on its way to {user.email}.</AuthAlert>
            ) : (
              <button
                type="button"
                className="btn btn-primary w-full py-3.5 text-sm"
                onClick={() => apiResendVerification().then(() => setResent(true)).catch((e: Error) => setMessage(e.message))}
              >
                Send a new link
              </button>
            )
          ) : (
            <Link href="/login?next=/account" className="btn btn-primary w-full py-3.5 text-sm">Sign in to get a new link</Link>
          )}
        </>
      )}
    </AuthShell>
  );
}
