import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Footer } from '@/components/layout/Footer';
import {
  fetchCompanies, generateStudyPlanApi, fetchMyStudyPlanApi, setStudyPlanPhaseApi,
  resetMyStudyPlanApi,
} from '@/lib/api';
import { ContentBlockRenderer } from '@/components/blocks/ContentBlockRenderer';
import { useAuth } from '@/context/AuthContext';
import { StudyPlanView } from '@/types';
import {
  Calendar, CheckCircle2, Sparkles, Target, ChevronDown, Info, LogIn,
  CircleDot, PartyPopper, AlertTriangle, CalendarRange, RefreshCw,
  X, History, Circle, Loader2, Undo2,
} from 'lucide-react';

const ROLE_SUGGESTIONS = ['SDE', 'SDE-1', 'SDE-2', 'Frontend', 'Backend', 'Full Stack', 'Data Analyst', 'Product Manager'];

/** `phase.order` is 1-based, so the anchor id is `phase-1`, `phase-2`, … */
const phaseAnchor = (order: number) => `phase-${order}`;

export default function StudyPlanPage() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [targetCompany, setTargetCompany] = useState('');
  const [targetRole, setTargetRole] = useState('SDE');
  const [interviewDate, setInterviewDate] = useState('');
  const [plan, setPlan] = useState<StudyPlanView | null>(null);
  const [loading, setLoading] = useState(false);
  const [resuming, setResuming] = useState(true);
  const [error, setError] = useState('');
  const [openPhases, setOpenPhases] = useState<Record<string, boolean>>({});
  const [toggling, setToggling] = useState('');
  const [busyReset, setBusyReset] = useState(false);
  /**
   * Set when a stored plan was loaded, so the returning student is told what
   * they came back to instead of silently landing on a half-finished timeline.
   */
  const [resumedFrom, setResumedFrom] = useState<string>('');
  const [dismissedResume, setDismissedResume] = useState(false);
  /** Phase whose toggle failed, so the card can offer an inline retry. */
  const [failedToggle, setFailedToggle] = useState<{ phaseId: string; completed: boolean } | null>(null);
  const headingRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchCompanies()
      .then((list) => {
        const comps = (list || []).map((c) => ({ id: c.id, name: c.name }));
        setCompanies(comps);
        if (comps.length > 0) setTargetCompany((prev) => prev || comps[0].name);
      })
      .catch(() => {});
  }, []);

  /**
   * Opens the phase named in the URL hash, e.g. a shared `#phase-3` link.
   * Runs after the plan renders because the anchor only exists once phases are
   * on screen; a plain mount-time read would find no element to scroll to.
   */
  const revealHashedPhase = useCallback((view: StudyPlanView) => {
    const match = /^#phase-(\d+)$/.exec(typeof window === 'undefined' ? '' : window.location.hash);
    if (!match) return;
    const order = Number(match[1]);
    const target = view.phases.find((p) => p.order === order);
    if (!target) return;
    setOpenPhases((prev) => ({ ...prev, [target.id]: true }));
    // The accordion has to expand before the anchor can be scrolled to, so this
    // is deferred past the paint rather than run inline.
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        document.getElementById(phaseAnchor(order))?.scrollIntoView({ block: 'start' });
      }, 60);
    }
  }, []);

  const applyPlan = useCallback((next: StudyPlanView) => {
    setPlan(next);
    setOpenPhases((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      const seed: Record<string, boolean> = {};
      const firstOpen = next.phases.find((p) => !p.completed) || next.phases[0];
      if (firstOpen) seed[firstOpen.id] = true;
      return seed;
    });
    revealHashedPhase(next);
  }, [revealHashedPhase]);

  useEffect(() => {
    if (!user) {
      setResuming(false);
      return;
    }
    let active = true;
    fetchMyStudyPlanApi()
      .then((res) => {
        if (!active) return;
        if (res?.plan) {
          setTargetCompany(res.plan.targetCompany || '');
          setTargetRole(res.plan.targetRole || 'SDE');
          setInterviewDate(res.plan.interviewDate || '');
          applyPlan(res.plan as StudyPlanView);
          // Name the phase they would resume at, so the banner is specific
          // rather than a generic "welcome back".
          const next = (res.plan as StudyPlanView).phases.find((p) => !p.completed)
            || (res.plan as StudyPlanView).phases[(res.plan as StudyPlanView).phases.length - 1];
          if (next) setResumedFrom(`${next.dayLabel} · ${next.title}`);
        }
      })
      .catch(() => {})
      .finally(() => { if (active) setResuming(false); });
    return () => { active = false; };
  }, [user, applyPlan]);

  const generate = async () => {
    setLoading(true);
    setError('');
    setResumedFrom('');
    setDismissedResume(true);
    try {
      const res = await generateStudyPlanApi({
        targetCompany: targetCompany || 'Target Company',
        targetRole: targetRole || 'SDE',
        // No `daysRemaining` hint. The server derives the window from
        // `interviewDate`; sending a fixed number here used to override that and
        // pinned every plan to 14 days.
        interviewDate: interviewDate || null,
      });
      setPlan(res as StudyPlanView);
      setOpenPhases(res.phases?.[0] ? { [res.phases[0].id]: true } : {});
      // A fresh plan starts at the top, so a stale #phase-N from a previous
      // plan must not drag the reader somewhere meaningless.
      if (typeof window !== 'undefined' && window.location.hash.startsWith('#phase-')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    } catch (e: any) {
      setError(e?.message || 'Could not generate a study plan right now.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Recomputes the derived progress counters from the phase list.
   *
   * The server sends `progress` as part of the whole plan, so an optimistic tick
   * cannot wait for that response to move the bar — waiting is exactly the lag
   * the optimistic path exists to avoid. `percent` is rounded here rather than
   * taken from the server so a single tick does not flash 0% -> 100% on a
   * one-phase plan.
   */
  const withProgress = (view: StudyPlanView, phases: StudyPlanView['phases']): StudyPlanView => {
    const total = phases.length;
    const completed = phases.filter((p) => p.completed).length;
    return {
      ...view,
      phases,
      progress: {
        total,
        completed,
        percent: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
    };
  };

  const togglePhase = async (phaseId: string, completed: boolean) => {
    if (!user) {
      setError('Sign in to track your progress across devices.');
      return;
    }
    const snapshot = plan;
    setToggling(phaseId);
    setError('');
    setFailedToggle(null);

    // Optimistic: paint the new state immediately. A student ticking four
    // phases in a row should not wait on four sequential round trips, and a
    // failed request rolls back below rather than leaving a lie on screen.
    if (plan) {
      const phases = plan.phases.map((p) => (p.id === phaseId ? { ...p, completed } : p));
      setPlan(withProgress(plan, phases));
      setOpenPhases((prev) => (prev[phaseId] === undefined ? { ...prev, [phaseId]: true } : prev));
    }

    try {
      const res = await setStudyPlanPhaseApi(phaseId, completed);
      // The server's copy is authoritative — it knows about progress recorded
      // on another device while this page was open.
      if (res?.plan) setPlan(res.plan as StudyPlanView);
    } catch (e: any) {
      if (snapshot) setPlan(snapshot);
      setFailedToggle({ phaseId, completed });
      setError(e?.message || 'Could not save your progress.');
    } finally {
      setToggling('');
    }
  };

  const toggleOpen = (id: string, order: number) => {
    setOpenPhases((prev) => {
      const nextOpen = !prev[id];
      if (typeof window !== 'undefined') {
        // Deep-link the phase being opened so the reader can copy the URL.
        window.history.replaceState(null, '', nextOpen ? `#${phaseAnchor(order)}` : window.location.pathname + window.location.search);
      }
      return { ...prev, [id]: nextOpen };
    });
  };

  const startOver = async () => {
    if (!window.confirm('Clear your saved plan and progress? Your answers stay on this page.')) return;
    setBusyReset(true);
    setError('');
    try {
      await resetMyStudyPlanApi();
      setPlan(null);
      setOpenPhases({});
      setResumedFrom('');
    } catch (e: any) {
      setError(e?.message || 'Could not reset your plan.');
    } finally {
      setBusyReset(false);
    }
  };

  const pct = plan?.progress.percent ?? 0;
  const allDone = !!plan && plan.progress.total > 0 && plan.progress.completed === plan.progress.total;
  const showMobileBar = !!plan && plan.progress.total > 0;
  const showResumeBanner = !!plan && !!resumedFrom && !dismissedResume && !allDone;

  const daysToInterview = useMemo(() => {
    if (!interviewDate) return null;
    const diff = Math.ceil(
      (new Date(interviewDate).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000
    );
    return Number.isFinite(diff) ? diff : null;
  }, [interviewDate]);

  return (
    <>
      <Head>
        <title>Personalized Interview Study Plan | TieEdu</title>
        <meta name="description" content="Generate a day-by-day prep plan based on your target company, role, and interview timeline." />
      </Head>

      <div className="min-h-screen flex flex-col bg-[#FAFAF9]">

        {/* Compact progress bar for small screens.
            The sidebar card is in normal flow on mobile, so scrolling a
            20-phase plan put progress permanently off-screen. This is the
            `lg:hidden` twin of the sidebar panel, pinned under the header. */}
        {showMobileBar && (
          <div className="lg:hidden sticky top-[var(--header-h)] z-30 bg-white/95 backdrop-blur border-b border-[#EDEDEB] px-4 py-2.5">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-mono font-bold uppercase text-gray-500">Progress</span>
                  <span className="text-[11px] font-extrabold text-[#10151C] shrink-0">{pct}%</span>
                </div>
                <div
                  className="h-2 rounded-full bg-[#EDEDEB] overflow-hidden"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Study plan progress"
                >
                  <div className="h-full rounded-full bg-emerald-600 transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[11px] text-[--text-muted] mt-1 flex items-center gap-1.5">
                  {allDone
                    ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> All {plan?.progress.total} phases done</>
                    : <><CircleDot className="w-3.5 h-3.5" /> {plan?.progress.completed} of {plan?.progress.total} phases complete</>}
                </p>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-12 safe-bottom">

          {/* Intro */}
          <div className="mb-8">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase bg-amber-100 text-amber-900 px-2.5 py-1 rounded">
              <Sparkles className="w-3 h-3" /> Day-by-day roadmap
            </span>
            <h1 className="mt-3 text-2xl sm:text-4xl font-extrabold text-[#10151C] tracking-tight">
              Your interview study plan
            </h1>
            <p className="mt-2 text-[15px] sm:text-base text-[--text-muted] max-w-2xl leading-relaxed">
              Pick your target company, role and interview date. We match you to a curated plan and track
              your progress across devices.
            </p>
          </div>

          <div className="grid lg:grid-cols-[20rem_1fr] gap-6 items-start">
            {/* Controls */}
            <div className="space-y-4 lg:sticky lg:top-6">
              <div className="bg-white border border-[#EDEDEB] rounded-2xl p-5 shadow-sm space-y-4">
                <div>
                  <label htmlFor="sp-company" className="block text-[11px] font-mono font-bold uppercase text-gray-500 mb-1.5">
                    Target company
                  </label>
                  <select
                    id="sp-company"
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl bg-[#FAFAF9] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                  >
                    {companies.length === 0 && <option value="">Target Company</option>}
                    {companies.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="sp-role" className="block text-[11px] font-mono font-bold uppercase text-gray-500 mb-1.5">
                    Target role
                  </label>
                  <input
                    id="sp-role"
                    list="sp-role-options"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder="e.g. SDE-1"
                    className="w-full p-3 border border-gray-200 rounded-xl bg-[#FAFAF9] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                  />
                  <datalist id="sp-role-options">
                    {ROLE_SUGGESTIONS.map((r) => <option key={r} value={r} />)}
                  </datalist>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {ROLE_SUGGESTIONS.slice(0, 4).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setTargetRole(r)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold min-h-[2.75rem] transition-colors focus-ring ${
                          targetRole === r
                            ? 'bg-[#1F3A5F] text-white'
                            : 'bg-[#F1F5F9] text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="sp-date" className="block text-[11px] font-mono font-bold uppercase text-gray-500 mb-1.5">
                    Interview date <span className="normal-case font-normal">(optional)</span>
                  </label>
                  <input
                    id="sp-date"
                    type="date"
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl bg-[#FAFAF9] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                  />
                  {daysToInterview !== null && daysToInterview >= 0 && (
                    <p className="mt-1.5 text-[11px] font-semibold text-[#0284C7] flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {daysToInterview === 0 ? 'Interview is today' : `${daysToInterview} day${daysToInterview === 1 ? '' : 's'} to go`}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={generate}
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 bg-[#1F3A5F] hover:bg-[#16293f] text-white text-[13px] font-bold uppercase tracking-wider rounded-xl shadow-md transition-colors min-h-[3rem] disabled:opacity-60 focus-ring"
                >
                  <Target className="w-4 h-4" />
                  {loading ? 'Building your plan…' : plan ? 'Regenerate plan' : 'Generate study schedule'}
                </button>

                {error && (
                  <p className="flex items-start gap-2 text-[12px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-px" /> {error}
                  </p>
                )}

                {!user && (
                  <p className="flex items-start gap-2 text-[12px] text-gray-600 bg-[#F1F5F9] rounded-xl px-3 py-2.5">
                    <LogIn className="w-4 h-4 shrink-0 mt-px text-[#0284C7]" />
                    <span>
                      <Link href="/login" className="font-bold text-[#0284C7] underline focus-ring rounded">Sign in</Link> to save this plan
                      and track progress. You can preview without an account.
                    </span>
                  </p>
                )}

                {/* Start over lives with the form, not the progress card: the
                    progress card is desktop-only (the mobile sticky bar takes
                    over), and a destructive action that vanishes on small
                    screens is worse than one that is slightly out of place. */}
                {user && plan && (
                  <button
                    type="button"
                    onClick={startOver}
                    disabled={busyReset}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 border border-gray-200 rounded-xl text-[11px] font-bold uppercase tracking-wider text-gray-500 hover:text-red-700 hover:border-red-200 min-h-[2.75rem] disabled:opacity-50 focus-ring"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${busyReset ? 'animate-spin' : ''}`} />
                    {busyReset ? 'Clearing…' : 'Start over'}
                  </button>
                )}
              </div>

              {/* Progress. Hidden on mobile because the sticky bar under the
                  header already shows the same numbers — two progress readouts
                  on one screen is just noise. */}
              {plan && plan.progress.total > 0 && (
                <div className="hidden lg:block bg-white border border-[#EDEDEB] rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-bold uppercase text-gray-500">Progress</span>
                    <span className="text-[13px] font-extrabold text-[#10151C]">{pct}%</span>
                  </div>
                  <div
                    className="h-2.5 rounded-full bg-[#EDEDEB] overflow-hidden"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Study plan progress"
                  >
                    <div
                      className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[12px] text-[--text-muted]">
                    {plan.progress.completed} of {plan.progress.total} phases complete
                  </p>
                  {allDone && (
                    <p className="mt-3 flex items-center gap-2 text-[12px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                      <PartyPopper className="w-4 h-4 shrink-0" /> Plan complete. Go land it.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Plan */}
            <div className="min-w-0">
              {/* Resume banner. A returning student used to be dropped silently
                  onto a half-finished timeline with no indication their saved
                  plan had been restored. */}
              {showResumeBanner && (
                <div
                  ref={headingRef}
                  role="status"
                  className="mb-4 flex items-start gap-3 rounded-2xl border border-[#0284C7]/25 bg-[#E8F4FB] p-4"
                >
                  <History className="w-5 h-5 text-[#0284C7] shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-extrabold text-[#10151C]">Welcome back — your plan is here</p>
                    <p className="text-[14px] sm:text-[13px] text-[#1F3A5F] mt-0.5 leading-relaxed">
                      Pick up at <span className="font-semibold">{resumedFrom}</span>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDismissedResume(true)}
                    aria-label="Dismiss welcome back message"
                    className="shrink-0 p-2 -m-1 rounded-lg text-[#0284C7] hover:bg-white/60 min-h-[2.75rem] min-w-[2.75rem] flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {loading && (
                <div className="mb-4 flex items-center gap-2 rounded-2xl border border-[#EDEDEB] bg-white px-4 py-3 text-[14px] text-[--text-muted]" role="status">
                  <Loader2 className="w-4 h-4 animate-spin text-[#0284C7]" /> Building your roadmap…
                </div>
              )}

              {!plan ? (
                <div className="bg-white border border-[#EDEDEB] rounded-2xl p-10 sm:p-16 text-center">
                  {resuming ? (
                    <>
                      <Loader2 className="mx-auto w-8 h-8 text-[#0284C7] animate-spin mb-4" />
                      <p className="text-[16px] sm:text-[15px] text-[--text-muted] max-w-sm mx-auto leading-relaxed">
                        Loading your saved plan…
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="mx-auto w-14 h-14 rounded-full bg-[#1F3A5F]/5 flex items-center justify-center mb-4">
                        <CalendarRange className="w-6 h-6 text-[#1F3A5F]" />
                      </div>
                      <p className="text-[16px] sm:text-[15px] font-semibold text-[#10151C] mb-1">No plan yet</p>
                      <p className="text-[15px] sm:text-[14px] text-[--text-muted] max-w-sm mx-auto leading-relaxed">
                        Choose your target company and hit Generate to build your roadmap.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div>
                  <div className="mb-4">
                    <h2 className="text-lg sm:text-xl font-extrabold text-[#10151C]">
                      {plan.targetCompany} Preparation Roadmap
                    </h2>
                    <p className="text-[13px] text-[--text-muted] mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-semibold text-[#475569]">{plan.targetRole}</span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> {plan.daysRemaining} day window
                      </span>
                      {plan.templateTitle && <span>{plan.templateTitle}</span>}
                    </p>
                    {plan.source === 'fallback' && (
                      <p className="mt-3 flex items-start gap-2 text-[12px] text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                        <Info className="w-4 h-4 shrink-0 mt-px" />
                        General preparation plan — a curated {plan.targetCompany}-specific plan is not published
                        yet. Content here is standard interview prep, not verified company intelligence.
                      </p>
                    )}
                  </div>

                  <ol className="relative space-y-3">
                    <span className="absolute left-[1.4rem] sm:left-[1.65rem] top-4 bottom-4 w-px bg-[#E2E8F0]" aria-hidden="true" />

                    {plan.phases.map((phase) => {
                      const open = !!openPhases[phase.id];
                      return (
                        <li
                          key={phase.id}
                          id={`phase-${phase.order}`}
                          className="relative scroll-mt-20"
                        >
                          <div
                            className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition-colors ${
                              phase.completed ? 'border-emerald-200' : 'border-[#EDEDEB]'
                            }`}
                          >
                            <div className="flex items-start gap-3 sm:gap-4 p-4">
                              <span
                                className={`relative z-10 w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shrink-0 border-2 ${
                                  phase.completed
                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                    : open
                                      ? 'bg-[#1F3A5F] border-[#1F3A5F] text-white'
                                      : 'bg-white border-[#E2E8F0] text-gray-400'
                                }`}
                              >
                                {phase.completed ? (
                                  <CheckCircle2 className="w-5 h-5" />
                                ) : (
                                  <CircleDot className={`w-4 h-4 ${open ? '' : 'opacity-40'}`} />
                                )}
                              </span>

                              <div className="min-w-0 flex-1">
                                <button
                                  type="button"
                                  onClick={() => toggleOpen(phase.id, phase.order)}
                                  aria-expanded={open}
                                  aria-controls={`phase-body-${phase.order}`}
                                  className="w-full text-left flex items-start gap-2 min-h-[2.75rem] focus-ring rounded-lg"
                                >
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-[10px] font-mono font-bold uppercase text-[#0284C7]">
                                      {phase.dayLabel}
                                    </span>
                                    <span
                                      className={`block text-[16px] sm:text-[15px] font-bold leading-snug mt-0.5 ${
                                        phase.completed ? 'text-emerald-700' : 'text-[#10151C]'
                                      }`}
                                    >
                                      {phase.title}
                                    </span>
                                    {!open && phase.summary && (
                                      <span className="block text-[15px] sm:text-[13px] text-[--text-muted] mt-1 line-clamp-2">
                                        {phase.summary}
                                      </span>
                                    )}
                                  </span>
                                  <ChevronDown
                                    aria-hidden="true"
                                    className={`w-5 h-5 text-gray-400 shrink-0 mt-1 transition-transform ${open ? 'rotate-180' : ''}`}
                                  />
                                </button>

                                {open && (
                                  <div id={`phase-body-${phase.order}`} className="mt-3">
                                    {phase.summary && (
                                      /* 16px on mobile: 13px body copy on a
                                         phone is below readable size, and this is
                                         the long-form part of the page. */
                                      <p className="text-[16px] sm:text-[14px] text-[--text-body] leading-relaxed mb-3 whitespace-pre-line">{phase.summary}</p>
                                    )}
                                    <div className="space-y-1">
                                      {phase.blocks.map((b) => (
                                        <ContentBlockRenderer
                                          key={b.id}
                                          block={b}
                                          isLocked={false}
                                          companyName={plan.targetCompany}
                                        />
                                      ))}
                                      {phase.blocks.length === 0 && (
                                        <p className="text-[15px] sm:text-[13px] text-gray-500 border border-dashed border-gray-300 rounded-xl p-4 text-center">
                                          Content for this phase is being written.
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}

                                <label className="mt-3 inline-flex items-center gap-2.5 cursor-pointer select-none min-h-[2.75rem] focus-within:ring-2 focus-within:ring-[#0284C7] focus-within:ring-offset-2 rounded-lg px-1">
                                  <input
                                    type="checkbox"
                                    checked={phase.completed}
                                    disabled={toggling === phase.id}
                                    onChange={(e) => togglePhase(phase.id, e.target.checked)}
                                    className="w-5 h-5 rounded accent-emerald-600 shrink-0"
                                  />
                                  <span className="text-[15px] sm:text-[13px] font-semibold text-[#475569]">
                                    {toggling === phase.id
                                      ? 'Saving…'
                                      : phase.completed
                                        ? 'Completed'
                                        : 'Mark as done'}
                                  </span>
                                </label>

                                {/* Inline retry. A failed optimistic tick is
                                    already visible on this card, so the recovery
                                    action belongs here rather than only in the
                                    form-level error banner. */}
                                {failedToggle?.phaseId === phase.id && (
                                  <p className="mt-2 flex items-center gap-2 text-[13px] text-red-700">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    <span>Not saved.</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFailedToggle(null);
                                        togglePhase(phase.id, failedToggle.completed);
                                      }}
                                      className="inline-flex items-center gap-1 font-bold underline hover:no-underline focus-ring rounded min-h-[2.25rem] px-1"
                                    >
                                      <Undo2 className="w-3.5 h-3.5" /> Retry
                                    </button>
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
