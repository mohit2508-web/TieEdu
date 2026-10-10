import React, { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Award, CheckCircle2, Clock, ExternalLink, FileText, Lock, PlayCircle, Briefcase } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  fetchDriveDetailApi,
  fetchMyDriveResultsApi,
  launchDriveTestApi,
  registerForDriveApi,
  DriveDetail,
  DriveResult,
} from '@/lib/drivesApi';
import StatusPill, { driveStatusTone } from '@/components/apple/StatusPill';
import ScoreRing from '@/components/apple/ScoreRing';

export default function DriveDetailPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const driveId = typeof router.query.driveId === 'string' ? router.query.driveId : '';
  const inviteToken = typeof router.query.invite === 'string' ? router.query.invite : undefined;

  const [detail, setDetail] = useState<DriveDetail | null>(null);
  const [results, setResults] = useState<{ visible: boolean; tests: DriveResult[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const userId = user?.id ?? null;

  const load = useCallback(async () => {
    if (!driveId) return;
    setLoading(true);
    setError(null);
    try {
      const d = await fetchDriveDetailApi(driveId);
      setDetail(d);
      if (d.registration) {
        const r = await fetchMyDriveResultsApi(driveId).catch(() => null);
        if (r) setResults({ visible: r.visible, tests: r.tests });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [driveId]);

  useEffect(() => {
    if (authLoading || !userId) {
      if (!authLoading && !userId) setLoading(false);
      return;
    }
    load();
  }, [authLoading, userId, load]);

  const register = async () => {
    if (!detail) return;
    setBusy('register');
    setError(null);
    try {
      await registerForDriveApi(detail.drive.drive_id, inviteToken);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const launch = async (testId: string) => {
    if (!detail) return;
    setBusy(testId);
    setError(null);
    try {
      const { launch_url } = await launchDriveTestApi(detail.drive.drive_id, testId);
      // Same-tab redirect: a popup would be blocked on the click's trailing
      // network request, and the student must land back here when done.
      window.location.href = launch_url;
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  };

  if (!authLoading && !user) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16 text-center" style={{ background: 'var(--apple-bg)' }}>
        <p className="text-[14px]" style={{ color: 'var(--apple-label-2)' }}>Sign in to view this mock drive.</p>
        <button
          type="button"
          onClick={() => router.push(`/login?next=/drives/${driveId}`)}
          className="mt-4 rounded-[12px] px-5 py-2.5 text-[14px] font-semibold text-white transition-transform active:scale-[0.98]"
          style={{ background: 'var(--apple-blue)' }}
        >
          Sign in
        </button>
      </main>
    );
  }

  if (loading) {
    return <main className="mx-auto w-full max-w-3xl px-4 py-16 text-[14px] text-[var(--apple-label-2)]" style={{ background: 'var(--apple-bg)' }}>Loading…</main>;
  }

  if (!detail) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16" style={{ background: 'var(--apple-bg)' }}>
        <div className="rounded-2xl px-4 py-3 text-[13px] font-medium" style={{ background: 'var(--apple-red-soft)', color: 'var(--apple-red)' }}>
          {error || 'Drive not found.'}
        </div>
        <Link href="/drives" className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-medium" style={{ color: 'var(--apple-blue)' }}>
          <ArrowLeft className="h-4 w-4" /> Back to drives
        </Link>
      </main>
    );
  }

  const { drive, registration, tests, can_register, eligibility_blockers } = detail;
  const completedTests = results?.tests.filter((r) => r.status) ?? [];
  const bestPct = completedTests.reduce<number | null>((best, r) => {
    if (r.percentage == null) return best;
    return best == null ? r.percentage : Math.max(best, r.percentage);
  }, null);

  return (
    <>
      <Head>
        <title>{drive.title} · Mock drive · TieEdu</title>
      </Head>
      <main className="min-h-screen w-full px-4 pb-28 pt-8 sm:px-6" style={{ background: 'var(--apple-bg)' }}>
        <div className="mx-auto max-w-3xl">
          <Link href="/drives" className="inline-flex items-center gap-1.5 text-[14px] font-medium" style={{ color: 'var(--apple-blue)' }}>
            <ArrowLeft className="h-4 w-4" /> All drives
          </Link>

          <header className="apple-card mt-4 px-5 py-5">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: 'var(--apple-blue-soft)', color: 'var(--apple-blue)' }}>
                <Briefcase size={22} strokeWidth={1.9} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill label={drive.drive_type} tone="blue" />
                  <StatusPill label={drive.status} tone={driveStatusTone(drive.status)} />
                </div>
                <h1 className="mt-1 text-[24px] font-bold tracking-tight" style={{ color: 'var(--apple-label)' }}>{drive.title}</h1>
                {drive.company_name && <p className="text-[13px]" style={{ color: 'var(--apple-label-2)' }}>{drive.company_name}</p>}
              </div>
              {completedTests.length > 0 ? (
                <div className="hidden sm:block">
                  <ScoreRing value={(bestPct ?? 0) / 100} size={72} stroke={6} label={bestPct != null ? `${Math.round(bestPct)}%` : undefined} sublabel="best round" />
                </div>
              ) : null}
            </div>
            {drive.description && <p className="mt-3 text-[13px] leading-relaxed" style={{ color: 'var(--apple-label-2)' }}>{drive.description}</p>}
          </header>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl px-4 py-3 text-[13px] font-medium" style={{ background: 'var(--apple-red-soft)', color: 'var(--apple-red)' }}>
              <AlertCircle className="mt-0.5 h-4 w-4 flex-none" /> {error}
            </div>
          )}

          {/* Registration state / action */}
          <section className="apple-card mt-4 overflow-hidden">
            {registration ? (
              <div className="flex items-center gap-3 px-4 py-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'var(--apple-green-soft)', color: 'var(--apple-green)' }}>
                  <CheckCircle2 size={16} strokeWidth={2.4} />
                </span>
                <span className="text-[14px]" style={{ color: 'var(--apple-label)' }}>
                  You are registered. <b className="capitalize">{registration.status}</b>
                </span>
                <StatusPill label={registration.status} tone={driveStatusTone(registration.status)} className="ml-auto" />
              </div>
            ) : eligibility_blockers.length > 0 ? (
              <div className="px-4 py-4">
                <p className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: 'var(--apple-orange)' }}>
                  <AlertCircle className="h-4 w-4" /> Not eligible for this drive yet
                </p>
                <ul className="mt-2 space-y-1 pl-7 text-[12.5px]" style={{ color: 'var(--apple-label-2)' }}>
                  {eligibility_blockers.map((b) => (
                    <li key={b} className="list-disc">{humanizeBlocker(b)}</li>
                  ))}
                </ul>
                <Link href="/account" className="mt-3 inline-block text-[13px] font-medium" style={{ color: 'var(--apple-blue)' }}>
                  Update your student profile
                </Link>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                <p className="text-[14px]" style={{ color: 'var(--apple-label-2)' }}>
                  {drive.window_open ? 'Registration is open.' : 'Registration is currently closed.'}
                </p>
                <button
                  type="button"
                  disabled={!can_register || busy === 'register'}
                  onClick={register}
                  className="rounded-[12px] px-5 py-2.5 text-[14px] font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-40"
                  style={{ background: 'var(--apple-blue)' }}
                >
                  {busy === 'register' ? 'Registering…' : 'Register for this drive'}
                </button>
              </div>
            )}
          </section>

          {/* Rounds */}
          <section className="mt-8">
            <h2 className="px-1 text-[20px] font-semibold tracking-tight" style={{ color: 'var(--apple-label)' }}>Rounds</h2>
            <div className="mt-3 space-y-4">
              {tests.map((t) => {
                const locked = t.my_status === 'locked' || t.my_status === 'not_shortlisted';
                const done = t.my_status === 'completed';
                const canLaunch = !!registration && !locked && (!done || t.attempts_used < t.max_attempts);
                const result = results?.tests.find((r) => r.test_id === t.test_id);
                return (
                  <div key={t.test_id} className="apple-card overflow-hidden">
                    <div className="flex items-start gap-4 px-4 py-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px]" style={{ background: locked ? 'var(--apple-fill)' : 'var(--apple-blue-soft)', color: locked ? 'var(--apple-label-3)' : 'var(--apple-blue)' }}>
                        {locked ? <Lock size={17} strokeWidth={1.9} /> : <FileText size={17} strokeWidth={1.9} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-[15px] font-semibold" style={{ color: 'var(--apple-label)' }}>{t.name}</h3>
                          {canLaunch && (
                            <button
                              type="button"
                              disabled={busy === t.test_id}
                              onClick={() => launch(t.test_id)}
                              className="inline-flex shrink-0 items-center gap-1.5 rounded-[12px] px-4 py-2 text-[13px] font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-40"
                              style={{ background: 'var(--apple-blue)' }}
                            >
                              <PlayCircle size={14} />
                              {busy === t.test_id ? 'Opening…' : done ? 'Retake' : t.my_status === 'in_progress' ? 'Resume' : 'Start'}
                              <ExternalLink size={13} className="opacity-70" />
                            </button>
                          )}
                          {locked && (
                            <span className="shrink-0 text-[12px] font-medium" style={{ color: 'var(--apple-label-3)' }}>
                              {t.my_status === 'not_shortlisted' ? 'Not shortlisted' : 'Locked'}
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]" style={{ color: 'var(--apple-label-2)' }}>
                          {t.duration_minutes != null && (
                            <span className="flex items-center gap-1"><Clock size={12} />{t.duration_minutes} min</span>
                          )}
                          {t.total_questions != null && <span>{t.total_questions} questions</span>}
                          <span>Attempt {Math.min(t.attempts_used + 1, t.max_attempts)} of {t.max_attempts}</span>
                          <StatusPill label={t.my_status?.replace(/_/g, ' ') ?? 'locked'} tone={driveStatusTone(t.my_status ?? 'locked')} />
                        </div>
                      </div>
                    </div>

                    {result && result.status && (
                      <>
                        <div className="apple-divider" />
                        <div className="flex items-center gap-3 px-4 py-3">
                          {result.percentage != null ? (
                            <ScoreRing value={result.percentage / 100} size={44} stroke={4} label={`${result.percentage}%`} sublabel="" />
                          ) : (
                            <Award size={16} strokeWidth={2} style={{ color: 'var(--apple-blue)' }} />
                          )}
                          <div className="text-[13px]">
                            <span className="font-semibold" style={{ color: 'var(--apple-label)' }}>Latest result</span>
                            <div className="flex items-center gap-2">
                              {result.passed != null && (
                                <StatusPill label={result.passed ? 'Pass' : 'Fail'} tone={result.passed ? 'green' : 'red'} dot />
                              )}
                              <span style={{ color: 'var(--apple-label-2)' }}>{result.attempts_used} attempt{result.attempts_used === 1 ? '' : 's'}</span>
                            </div>
                          </div>
                          {registration?.status === 'completed' && results?.visible === false ? (
                            <span className="ml-auto text-[12px]" style={{ color: 'var(--apple-label-3)' }}>Results pending review</span>
                          ) : null}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              {tests.length === 0 && (
                <div className="apple-card px-6 py-10 text-center text-[14px]" style={{ color: 'var(--apple-label-2)' }}>
                  No rounds have been published for this drive yet.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

function humanizeBlocker(code: string): string {
  const map: Record<string, string> = {
    profile_missing: 'Add your student profile (roll number, branch, CGPA).',
    cgpa_below_minimum: 'Your CGPA is below the minimum for this drive.',
    cgpa_above_maximum: 'Your CGPA is above the maximum for this drive.',
    too_many_backlogs: 'This drive allows fewer backlogs than you have.',
    branch_not_eligible: 'This drive is not open to your branch.',
    batch_not_eligible: 'This drive is not open to your graduation batch.',
  };
  return map[code] || code;
}