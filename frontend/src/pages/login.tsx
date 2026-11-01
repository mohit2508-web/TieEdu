import React, { useState, useEffect, FormEvent } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { TieEduLogo } from '@/components/common/TieEduLogo';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { afterAuthPath } from '@/lib/auth';
import { Mail, Lock, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { user, loading, login, adoptSession } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const next = typeof router.query.next === 'string' ? router.query.next : '/';

  useEffect(() => {
    if (!loading && user) router.replace(afterAuthPath(user, next));
  }, [loading, user, next, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password');
      return;
    }
    setSubmitting(true);
    try {
      const u = await login(email.trim(), password);
      router.replace(afterAuthPath(u, next));
    } catch (err: any) {
      setError(err?.message || 'Sign-in failed — please try again');
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign in — TieEdu</title>
        <meta name="description" content="Sign in to TieEdu to pick up your placement prep: your courses, skill tests, company packs and progress." />
      </Head>

      <div className="min-h-screen hero-mesh flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px]">
          <div className="flex justify-center mb-8">
            <TieEduLogo size="sm" />
          </div>

          <div className="vault-card p-8 shadow-raised">
            <span className="eyebrow">Account Access</span>
            <h1 className="display-2 mt-1 mb-1.5">Sign in to TieEdu</h1>
            <p className="text-base text-[--text-muted] mb-7">
              Your purchased vaults, unlocks and progress all live here.
            </p>

            {error && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-signal-soft border border-signal/30 text-danger text-sm font-semibold">
                {error}
              </div>
            )}

            <GoogleSignInButton
              onSignedIn={(data) => router.replace(afterAuthPath(adoptSession(data), next))}
              onError={setError}
              after={                <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-[--text-muted]">
                    <span className="h-px flex-1 bg-line" /> or use email <span className="h-px flex-1 bg-line" />
                  </div>}
            />

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-bold text-body mb-1.5 tracking-wide uppercase">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[--text-muted] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
            id="email"
            type="email"
            inputMode="email"
            /* Phase 7. `type="email"` alone gives iOS an email keyboard but no
               Keychain autofill; `inputMode` gives the `@` key without forcing
               validation the browser would word its own way. */
            autoComplete="email"
            enterKeyHint="next"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@college.edu"
                    className="w-full pl-10 pr-4 py-3 bg-white/90 border border-line rounded-xl text-sm text-heading placeholder:text-text-light focus:outline-none focus:border-signal focus:ring-4 focus:ring-signal/10 transition-shadow"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="password" className="block text-xs font-bold text-body tracking-wide uppercase">
                    Password
                  </label>
                  <Link href={`/forgot-password${email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ''}`} className="text-xs font-bold text-link hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[--text-muted] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
            id="password"
            type="password"
            autoComplete="current-password"
            /* Last field in the form, so Return submits rather than tabbing to
               something invisible. */
            enterKeyHint="go"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-white/90 border border-line rounded-xl text-sm text-heading placeholder:text-text-light focus:outline-none focus:border-signal focus:ring-4 focus:ring-signal/10 transition-shadow"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary w-full py-3.5 text-sm focus-ring disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>
                  Sign in <ArrowRight className="w-4 h-4" />
                </>}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-body">
              Naya ho?{' '}
              <Link href="/signup" className="font-bold text-link hover:text-link">
                Create account
              </Link>
            </p>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[--text-muted] hover:text-link transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Platform owner? Admin portal
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}