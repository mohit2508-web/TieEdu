import React, { useState, useEffect, useRef, FormEvent } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { TieEduLogo } from '@/components/common/TieEduLogo';
import { placementMe, setStoredCollegeId } from '@/lib/placementApi';
import { Mail, Lock, ArrowRight, Briefcase, Loader2, ExternalLink, LogOut } from 'lucide-react';

/**
 * Campus TPO Portal sign-in.
 *
 * Same credentials as the student portal (one account per person), but unlike
 * `/admin/login` a successful password is NOT the finish line: the account
 * must also hold an active placement grant. Verification is a real
 * `GET /api/placement/me` call, not a client-side role guess — placement
 * authority lives in `placement_access` rows, not in the JWT, so the server
 * is the only place that can answer.
 *
 * Failure modes are deliberately distinct:
 *  - 403 → "ask your T&P Head for an invite" (their account, no grant)
 *  - 503 → "placement backend unavailable" (infrastructure, retry later)
 * A student who wanders in here is told what this portal is rather than
 * being logged out — their session is valid everywhere else.
 */

const isSafeNext = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith('/tpo') && !value.startsWith('//');

export default function TpoLoginPage() {
  const { user, loading, login, logout } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // A fresh login MUST finish its /me verification before any redirect: the
  // moment `login()` populates the auth context, the effect below would fire
  // and ship an unverified account into the portal (or, on 403, race the
  // error notice). Setting the ref before `login()` tells the effect "a
  // verification is in charge of navigation now".
  const verifying = useRef(false);

  const nextPath = isSafeNext(router.query.next) ? router.query.next : '/tpo';

  useEffect(() => {
    if (loading || !user || verifying.current) return;
    // Arrived with a session already (invite link, bookmark) — the destination
    // guard does the placement check, same as every other TPO screen.
    router.replace(nextPath);
  }, [loading, user, router, nextPath]);

  const handleSwitchAccount = async () => {
    await logout();
    verifying.current = false;
    setNotice(null);
    setError(null);
    setEmail('');
    setPassword('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password');
      return;
    }
    setSubmitting(true);
    verifying.current = true;
    try {
      await login(email.trim(), password);
      // Account switch: the previous account's college choice (if any) must
      // not be presented against this one's grants — `/me` would 404 it and
      // the shell would show a confusing error for a perfectly valid login.
      setStoredCollegeId(null);
      try {
        await placementMe();
        router.replace(nextPath);
      } catch (err: any) {
        // `verifying` STAYS true: with a session now in the auth context the
        // redirect effect would otherwise fire on this re-render and ship an
        // unverified (403) account into the portal. Only handleSwitchAccount
        // releases it — staying here is the whole point of the error notice.
        const status = err?.status;
        if (status === 403) {
          setNotice(
            'This account does not have Campus TPO portal access yet. Ask your Training & Placement Head to invite you from the admin console.'
          );
        } else if (status === 503) {
          setError('The placement data store is unavailable right now — try again in a moment.');
        } else {
          setError(err?.message || 'Could not verify placement access — please try again.');
        }
        setSubmitting(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Sign-in failed — please try again');
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Campus TPO Portal — TieEdu</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen hero-mesh flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px]">
          <div className="flex justify-center mb-8">
            <TieEduLogo size="sm" />
          </div>

          <div className="vault-card p-8 shadow-float border-[#E8CFA7]">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0E2A44] text-white text-[11px] font-extrabold uppercase tracking-widest mb-4">
              <Briefcase className="w-3.5 h-3.5 text-[#B45309]" /> Campus TPO
            </div>
            <h1 className="display-2 mb-1.5">Placement portal</h1>
            <p className="text-[15px] text-[--text-muted] mb-7">
              For Training &amp; Placement cells, data officers and campus leadership. Your regular TieEdu
              account works here — if your college has given you placement access.
            </p>

            {notice && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-[#E8F1FA] border border-[#BCD7EE] text-[#0E2A44] text-[13px] font-semibold">
                {notice}
                <div className="mt-2 flex flex-wrap gap-3">
                  <Link href="/" className="inline-flex items-center gap-1 font-bold text-[#0284C7]">
                    Go to TieEdu home <ExternalLink className="w-3 h-3" />
                  </Link>
                  <button
                    type="button"
                    onClick={handleSwitchAccount}
                    className="inline-flex items-center gap-1 font-bold text-[#A63D28] hover:underline"
                  >
                    Sign in as someone else <LogOut className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-[#FDEDE9] border border-[#F2C9BC] text-[#A63D28] text-[13px] font-semibold">
                {error}
              </div>
            )}

            {!notice && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="tpo-email" className="block text-[12px] font-bold text-[#3E4754] mb-1.5 tracking-wide uppercase">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[--text-muted] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="tpo-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tpo@college.edu"
                      className="w-full pl-10 pr-4 py-3 bg-white/90 border border-[#E9E7E1] rounded-xl text-sm text-[#10151C] placeholder:text-[#AEB6BE] focus:outline-none focus:border-[#0284C7] focus:ring-4 focus:ring-[#0284C7]/10 transition-shadow"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="tpo-password" className="block text-[12px] font-bold text-[#3E4754] mb-1.5 tracking-wide uppercase">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[--text-muted] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="tpo-password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-3 bg-white/90 border border-[#E9E7E1] rounded-xl text-sm text-[#10151C] placeholder:text-[#AEB6BE] focus:outline-none focus:border-[#0284C7] focus:ring-4 focus:ring-[#0284C7]/10 transition-shadow"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary w-full py-3.5 text-sm focus-ring disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Open placement portal <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            <p className="mt-6 text-center text-[14px] text-[#3E4754]">
              Student ho?{' '}
              <Link href="/login" className="font-bold text-[#0284C7] hover:text-[#0271B5]">
                User sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
