import React, { useEffect, useState, FormEvent } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { setAuthSession } from '@/lib/auth';
import { TieEduLogo } from '@/components/common/TieEduLogo';
import {
  placementInviteInfo,
  placementAcceptInvite,
  setStoredCollegeId,
  PlacementInviteInfo,
} from '@/lib/placementApi';
import { Mail, Lock, UserRound, ArrowRight, Loader2, AlertTriangle, CheckCircle2, LogOut } from 'lucide-react';

/**
 * Invite acceptance — `/tpo/invite/:token`.
 *
 * The token IS the capability: no session is needed to READ what it offers
 * (info endpoint), and acceptance has two honest branches:
 *
 *  - Account exists → the visitor must already be signed in AS that email.
 *    Signing in here (next=/tpo/invite/<token>) returns to this page, which
 *    then posts an empty accept body. We never accept by posting a password
 *    for an account someone else owns — the link would become a takeover
 *    primitive for anyone who intercepts it.
 *  - No account → name + password create the account AND the session in one
 *    round trip, so the invitee lands inside the portal with no second step.
 *
 * Failure states (invalid / already used / expired / wrong account / backend
 * down) each get their own screen — a single "something went wrong" would
 * make an expired invite look like a bug.
 */

type PageState =
  | { kind: 'loading' }
  | { kind: 'invalid'; message: string }
  | { kind: 'ready'; invite: PlacementInviteInfo };

export default function TpoInvitePage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const token = typeof router.query.token === 'string' ? router.query.token : null;

  const [state, setState] = useState<PageState>({ kind: 'loading' });
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!router.isReady || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const invite = await placementInviteInfo(token);
        if (!cancelled) setState({ kind: 'ready', invite });
      } catch (err: any) {
        if (cancelled) return;
        setState({
          kind: 'invalid',
          message: err?.message || 'This invite link is not valid',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router.isReady, token]);

  const signInPath = token ? `/tpo/login?next=${encodeURIComponent(`/tpo/invite/${token}`)}` : '/tpo/login';

  const completeAccept = async (result: Awaited<ReturnType<typeof placementAcceptInvite>>) => {
    if (result.accessToken && result.user) {
      // New account (or a token refresh for an existing one): adopt the
      // session the server just issued so the very next request is authed.
      setAuthSession(result.accessToken, result.user.id);
    }
    if (result.college_id) setStoredCollegeId(result.college_id);
    router.replace('/tpo');
  };

  const handleAcceptExisting = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const result = await placementAcceptInvite(token!, {});
      await completeAccept(result);
    } catch (err: any) {
      if (err?.status === 401) {
        // No session in memory — send them through sign-in and back.
        router.replace(signInPath);
        return;
      }
      setError(err?.message || 'Could not accept the invite — please try again.');
      setSubmitting(false);
    }
  };

  const handleCreateAccount = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError('Please enter your name (min 2 characters)');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setSubmitting(true);
    try {
      const result = await placementAcceptInvite(token!, { name: name.trim(), password });
      await completeAccept(result);
    } catch (err: any) {
      setError(err?.message || 'Could not create your account — please try again.');
      setSubmitting(false);
    }
  };

  const handleSwitchAccount = async () => {
    await logout();
    setError(null);
  };

  const wrongAccount =
    error && /sign in as|does not have|for /i.test(error) && state.kind === 'ready' && user;

  return (
    <>
      <Head>
        <title>Accept invite — Campus TPO Portal</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen hero-mesh flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-[440px]">
          <div className="flex justify-center mb-8">
            <TieEduLogo size="sm" />
          </div>

          <div className="vault-card p-8 shadow-float border-[#E8CFA7]">
            {state.kind === 'loading' && (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="w-9 h-9 border-[3px] border-[#FBF1E1] border-t-[#0284C7] rounded-full animate-spin" />
                <p className="text-[13px] font-semibold text-[--text-muted]">Checking your invite…</p>
              </div>
            )}

            {state.kind === 'invalid' && (
              <div className="text-center py-2">
                <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-[#FDEDE9] border border-[#F2C9BC] flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-[#A63D28]" />
                </div>
                <h1 className="display-2 mb-2">Invite unavailable</h1>
                <p className="text-[15px] text-[--text-muted] mb-6">{state.message}</p>
                <Link href="/tpo/login" className="btn btn-primary py-3 px-5 text-sm focus-ring">
                  Go to portal sign-in
                </Link>
              </div>
            )}

            {state.kind === 'ready' && (
              <>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0E2A44] text-white text-[11px] font-extrabold uppercase tracking-widest mb-4">
                  <Mail className="w-3.5 h-3.5 text-[#B45309]" /> Invitation
                </div>
                <h1 className="display-2 mb-1.5">Join {state.invite.college}</h1>
                <p className="text-[15px] text-[--text-muted] mb-6">
                  You have been invited as <span className="font-bold text-[#10151C]">{state.invite.role_label}</span>{' '}
                  for <span className="font-bold text-[#10151C]">{state.invite.email}</span>.
                </p>

                {error && (
                  <div className="mb-5 px-4 py-3 rounded-xl bg-[#FDEDE9] border border-[#F2C9BC] text-[#A63D28] text-[13px] font-semibold">
                    {error}
                    {wrongAccount && (
                      <button
                        type="button"
                        onClick={handleSwitchAccount}
                        className="mt-2 inline-flex items-center gap-1 font-bold text-[#A63D28] hover:underline"
                      >
                        Sign out and use the invited account <LogOut className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                {state.invite.account_exists ? (
                  user ? (
                    <div className="space-y-4">
                      <div className="px-4 py-3 rounded-xl bg-[#ECFDF3] border border-[#A9DFC4] text-[#067647] text-[13px] font-semibold flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>
                          Signed in as {user.email}. Accepting will grant this account the {state.invite.role_label}{' '}
                          role at {state.invite.college}.
                        </span>
                      </div>
                      <button
                        onClick={handleAcceptExisting}
                        disabled={submitting}
                        className="btn btn-primary w-full py-3.5 text-sm focus-ring disabled:opacity-60"
                      >
                        {submitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            Accept invite <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-[14px] text-[#3E4754]">
                        An account already exists for this email — sign in to confirm it is you, then the invite
                        applies automatically.
                      </p>
                      <Link
                        href={signInPath}
                        className="btn btn-primary w-full py-3.5 text-sm focus-ring inline-flex items-center justify-center gap-2"
                      >
                        Sign in to accept <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  )
                ) : (
                  <form onSubmit={handleCreateAccount} className="space-y-4">
                    <div>
                      <label
                        htmlFor="invite-name"
                        className="block text-[12px] font-bold text-[#3E4754] mb-1.5 tracking-wide uppercase"
                      >
                        Your name
                      </label>
                      <div className="relative">
                        <UserRound className="w-4 h-4 text-[--text-muted] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          id="invite-name"
                          type="text"
                          autoComplete="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Priya Sharma"
                          className="w-full pl-10 pr-4 py-3 bg-white/90 border border-[#E9E7E1] rounded-xl text-sm text-[#10151C] placeholder:text-[#AEB6BE] focus:outline-none focus:border-[#0284C7] focus:ring-4 focus:ring-[#0284C7]/10 transition-shadow"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="invite-password"
                        className="block text-[12px] font-bold text-[#3E4754] mb-1.5 tracking-wide uppercase"
                      >
                        Choose a password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-[--text-muted] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          id="invite-password"
                          type="password"
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          className="w-full pl-10 pr-4 py-3 bg-white/90 border border-[#E9E7E1] rounded-xl text-sm text-[#10151C] placeholder:text-[#AEB6BE] focus:outline-none focus:border-[#0284C7] focus:ring-4 focus:ring-[#0284C7]/10 transition-shadow"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn btn-primary w-full py-3.5 text-sm focus-ring disabled:opacity-60"
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Create account &amp; join <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                <p className="mt-6 text-center text-[13px] text-[--text-muted]">
                  Invite expires {new Date(state.invite.expires_at).toLocaleDateString()}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
