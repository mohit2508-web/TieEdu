import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowRight, ArrowUp, ArrowDown, CheckCircle2, CircleDot, XCircle, Clock, RotateCcw, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PracticeLayout, Progress } from '@/components/practice/PracticeLayout';
import { AnswerReview, type ReviewItem } from '@/components/skill-test/AnswerReview';
import { Chip } from '@/components/ui/Chip';
import { Tabs } from '@/components/ui/Tabs';
import { fetchTestReport, LANG_LABEL, type CodeLang, type TestReport } from '@/lib/codeApi';
import { getResultApi } from '@/lib/skillTestApi';
import { PracticeSkeleton } from '@/components/practice/PracticeSkeleton';

function Delta({ now, before }: { now: number; before: number | null }) {
  if (before == null) return null;
  const d = Math.round(now - before);
  if (!d) return <span className="text-body-md text-muted">same as last time</span>;
  return (
    <span className={`inline-flex items-center gap-0.5 text-body-md font-semibold ${d > 0 ? 'text-success' : 'text-danger'}`}>
      {d > 0 ? <ArrowUp className="h-4 w-4" aria-hidden /> : <ArrowDown className="h-4 w-4" aria-hidden />}{Math.abs(d)} {d > 0 ? 'up' : 'down'}
    </span>
  );
}

/**
 * A company test's report (PRACTICE_MODE_PLAN.md §7), separate from skill-test
 * results: score and change, sections, coding per problem, what to fix next,
 * readiness, attempt history and the answer review.
 */
export default function TestReportPage() {
  const router = useRouter();
  const attemptId = String(router.query.attemptId || '');
  const slug = String(router.query.slug || '');
  const { user } = useAuth();
  const [r, setR] = useState<TestReport | null>(null);
  const [review, setReview] = useState<ReviewItem[]>([]);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'summary' | 'review'>('summary');
  const flags = Number(router.query.flags || 0);

  useEffect(() => {
    if (!attemptId || !user) return;
    fetchTestReport(attemptId).then(setR).catch((e) => setError(e.message));
    getResultApi(attemptId).then((x) => setReview(x.review || [])).catch(() => {});
  }, [attemptId, user]);

  if (!user) {
    return <PracticeLayout title="Test report"><Link href={`/login?next=${encodeURIComponent(router.asPath)}`} className="btn btn-primary min-h-[48px] px-6">Sign in to see your report</Link></PracticeLayout>;
  }
  const company = r?.test.company;
  return (
    <PracticeLayout title={r ? r.test.name : 'Test report'} crumb={company ? { href: `/practice/companies/${company.slug}?tab=tests`, label: `${company.name} tests` } : { href: '/practice/tests', label: 'Company tests' }}
      intro={r ? `Attempt ${r.attempt.number} · ${new Date(r.attempt.submitted_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}` : undefined}
      actions={r ? <Link href={`/practice/test/${r.test.slug || slug}`} className="btn btn-primary focus-ring min-h-[48px] px-5"><RotateCcw className="h-4 w-4" aria-hidden /> Retake</Link> : null}>
      {error && <p className="text-base text-danger">{error}</p>}
      {!r && !error && <PracticeSkeleton kind="report" label="Loading your report" />}
      {r && (
        <>
          {flags > 0 && (
            <p className="mb-6 flex items-center gap-2 rounded-xl border border-line bg-warning-soft p-3 text-body-md text-heading"><ShieldAlert className="h-5 w-5 shrink-0" aria-hidden /> You left the test window {flags} time{flags > 1 ? 's' : ''}. In the real test this can end your attempt.</p>
          )}
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-line bg-card p-5">
              <p className="text-sm font-medium text-muted">Score</p>
              <p className="mt-1 text-5xl font-bold tabular-nums text-heading">{r.attempt.score}<span className="text-2xl text-muted">%</span></p>
              <div className="mt-1"><Delta now={r.attempt.score} before={r.attempt.prev_score} /></div>
              <p className="mt-3 text-body-md text-body">{r.attempt.correct} correct · {r.attempt.incorrect} wrong · {r.attempt.unanswered} skipped</p>
              <p className="mt-1 flex items-center gap-1 text-body-md text-muted"><Clock className="h-4 w-4" aria-hidden /> {r.attempt.minutes} min</p>
            </div>
            <div className="rounded-2xl border border-line bg-card p-5">
              <p className="text-sm font-medium text-muted">{company ? `${company.name} readiness` : 'Readiness'}</p>
              {r.readiness ? (
                <>
                  <p className="mt-1 text-5xl font-bold tabular-nums text-heading">{r.readiness.now}<span className="text-2xl text-muted">%</span></p>
                  <div className="mt-1 flex flex-wrap items-center gap-2"><Chip tone={r.readiness.now >= 70 ? 'success' : r.readiness.now >= 40 ? 'warning' : 'danger'}>{r.readiness.band}</Chip><Delta now={r.readiness.now} before={r.readiness.before} /></div>
                  {r.prep && <Link href={`/prep/${company?.slug}`} className="mt-3 inline-block text-body-md font-semibold text-link hover:underline">Open my plan →</Link>}
                </>
              ) : <p className="mt-2 text-body-md text-body">Your readiness score appears once the {company?.name || 'company'} plan is open.</p>}
            </div>
            <div className="rounded-2xl border border-line bg-card p-5">
              <p className="text-sm font-medium text-muted">Your attempts</p>
              <div className="mt-3 flex h-24 items-end gap-1.5" role="img" aria-label={`Scores: ${r.history.map((h) => `${h.score}%`).join(', ')}`}>
                {r.history.map((h) => (
                  <span key={h.id} title={`${h.score}%`} className={`flex-1 rounded-t ${h.id === r.attempt.id ? 'bg-signal' : 'bg-surface-hover'}`} style={{ height: `${Math.max(6, h.score)}%` }} />
                ))}
              </div>
              <p className="mt-2 text-body-md text-body">Best {Math.max(...r.history.map((h) => h.score))}% over {r.history.length} attempt{r.history.length > 1 ? 's' : ''}</p>
            </div>
          </section>

          <Tabs className="mt-8" label="Report" value={tab} onChange={setTab}
            items={[{ key: 'summary', label: 'Summary' }, { key: 'review', label: 'Answer review', badge: review.length || null }]} />

          {tab === 'summary' && (
            <div className="mt-6 space-y-8">
              <section>
                <h2 className="font-display text-xl font-semibold text-heading">Sections</h2>
                <div className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
                  {r.sections.map((s) => (
                    <div key={s.key || s.name} className="grid items-center gap-3 px-4 py-3 sm:grid-cols-[1fr_200px_auto]">
                      <div>
                        <p className="text-base font-semibold text-heading">{s.name}</p>
                        <p className="text-body-md text-muted">{s.correct} of {s.total} correct</p>
                      </div>
                      <div><Progress done={s.pct} total={100} label={`${s.name} score`} /></div>
                      <p className="flex items-center gap-2 text-right sm:justify-end"><span className="text-lg font-bold tabular-nums text-heading">{s.pct}%</span><Delta now={s.pct} before={s.prev_pct} /></p>
                    </div>
                  ))}
                </div>
              </section>

              {r.coding.length > 0 && (
                <section>
                  <h2 className="font-display text-xl font-semibold text-heading">Coding</h2>
                  {!r.coding[0].graded && <p className="mt-1 text-body-md text-muted">The runner was offline, so these are your own marks.</p>}
                  <div className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
                    {r.coding.map((c, i) => (
                      <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                        {c.status === 'solved' ? <CheckCircle2 className="h-5 w-5 text-success" aria-hidden /> : c.status === 'partial' ? <CircleDot className="h-5 w-5 text-warning" aria-hidden /> : <XCircle className="h-5 w-5 text-danger" aria-hidden />}
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-semibold text-heading">Problem {i + 1}: {c.title}</p>
                          <p className="text-body-md text-muted">
                            {c.status === 'solved' ? 'All tests passed' : c.status === 'partial' ? 'Partly solved' : 'Not solved'}
                            {c.passed != null && c.total ? ` · ${c.passed}/${c.total} tests` : ''}{c.language ? ` · ${LANG_LABEL[c.language as CodeLang] || c.language}` : ''}
                          </p>
                        </div>
                        <Link href={`/practice/problem/${c.id}${company ? `?company=${company.slug}` : ''}`} className="btn btn-ghost focus-ring min-h-[44px] px-4">{c.status === 'solved' ? 'See solutions' : 'Practise it'}</Link>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {r.fix.length > 0 && (
                <section className="rounded-2xl border border-line bg-surface p-5">
                  <h2 className="font-display text-xl font-semibold text-heading">What to fix next</h2>
                  <ul className="mt-3 space-y-3">
                    {r.fix.map((f) => (
                      <li key={f.key || f.name} className="flex flex-wrap items-center gap-3">
                        <p className="min-w-0 flex-1 text-base text-body"><span className="font-semibold text-heading">{f.name}</span> at {f.pct}%. Revise its lessons, then take its sectional test.</p>
                        {r.prep && <Link href={`/prep/${company?.slug}?tab=train`} className="btn btn-ghost focus-ring min-h-[44px] px-4">Lessons</Link>}
                        {f.practice_test && <Link href={`/practice/test/${f.practice_test}`} className="btn btn-primary focus-ring min-h-[44px] px-4">Sectional test <ArrowRight className="h-4 w-4" aria-hidden /></Link>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}

          {tab === 'review' && (
            <div className="mt-6">
              {review.length ? <AnswerReview items={review} /> : <p className="text-base text-body">The answer review is not available for this test.</p>}
            </div>
          )}
        </>
      )}
    </PracticeLayout>
  );
}
