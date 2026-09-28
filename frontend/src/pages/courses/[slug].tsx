import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { LessonPlayer } from '@/components/courses/LessonPlayer';
import { CartModal } from '@/components/checkout/CartModal';
import { isLocked, LessonRow, ProgressBar } from '@/components/courses/CourseUi';
import { Award, CheckCircle2, Download, Lock, ShieldCheck } from 'lucide-react';
import {
  fetchCourse,
  fetchLesson,
  enrollInCourse,
  issueCertificate,
  downloadCertificatePdf,
  submitCourseFeedback,
} from '@/lib/coursesApi';
import { useAuth } from '@/context/AuthContext';
import type {
  CourseDetail,
  CourseLessonView,
  CourseCartItem,
  CertificateSummary,
  LessonCompletionState,
  LessonProgressResponse,
} from '@/types';

export default function CoursePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const slug = typeof router.query.slug === 'string' ? router.query.slug : '';
  const requestedLesson = typeof router.query.lesson === 'string' ? router.query.lesson : null;

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [fetchedLesson, setFetchedLesson] = useState<CourseLessonView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [certBusy, setCertBusy] = useState(false);
  const [certError, setCertError] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  // Flattened, ordered lesson list. The whole gate/lock model is "finish the one
  // before you", so everything the page needs is one array plus the server's
  // per-lesson `state` and `locked` flag — the client never decides what is
  // unlocked.
  const ordered = useMemo(
    () => (course?.modules || []).flatMap((m) => m.lessons || []).sort((a, b) => a.sort_order - b.sort_order),
    [course]
  );

  // Where to land when the learner has not asked for a specific lesson. Must be
  // the first UNLOCKED lesson, and the first not-yet-COMPLETED one: picking on
  // `state.ready` would re-select lesson 1 every time, because a finished lesson
  // still satisfies its own requirements.
  const firstOpen = useMemo(() => {
    const open = ordered.find((l) => !isLocked(l, course?.progress || null));
    if (open) return open;
    return ordered.find((l) => !(l.state as LessonCompletionState)?.is_complete) || ordered[0] || null;
  }, [ordered, course?.progress]);

  const selectedId = requestedLesson || fetchedLesson?.id || firstOpen?.id || null;

  const loadCourse = useCallback(async () => {
    if (!slug) return;
    try {
      const data = await fetchCourse(slug);
      setCourse(data);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    loadCourse();
  }, [authLoading, user?.id, loadCourse]);

  /**
   * The course payload ships each unlocked lesson's blocks, but deliberately NOT
   * its quiz questions (see sanitizeLesson in backend/src/lib/courses.ts) — the
   * syllabus stays small and the whole course cannot be scraped from one
   * response. So the selected lesson is re-fetched individually to pick up the
   * prompts, and only that one lesson is ever in hand.
   */
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;

    fetchLesson(selectedId)
      .then((res) => {
        if (cancelled) return;
        setFetchedLesson(res.locked ? null : res.lesson);
      })
      .catch((e: Error) => {
        // A locked lesson 403/409s here. That is not an error worth showing —
        // the syllabus row already explains the gate.
        if (!cancelled && !/unlock|locked|sign in/i.test(e.message)) {
          setError(e.message);
        }
      });

    return () => { cancelled = true; };
  }, [selectedId]);

  const enrol = async () => {
    if (!slug) return;
    if (!user) return router.push(`/login?next=/courses/${slug}`);
    setEnrolling(true);
    try {
      await enrollInCourse(slug);
      await loadCourse();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnrolling(false);
    }
  };

  /**
   * A paid course is bought, not enrolled in. The price shown here is the one the
   * server will charge — it comes off the course record, not off anything the
   * browser chose — so the cart line is display-only.
   */
  const courseLine: CourseCartItem | null = useMemo(
    () =>
      course
        ? {
            kind: 'course',
            id: course.id,
            slug: course.slug,
            name: course.title,
            price: course.price_inr,
            lesson_count: course.stats?.lesson_count,
          }
        : null,
    [course]
  );

  const buy = () => {
    if (!user) return router.push(`/login?next=/courses/${slug}`);
    setCartOpen(true);
  };

  const onProgress = (p: LessonProgressResponse) => {
    if (p.progress) setCourse((c) => (c ? { ...c, progress: p.progress } : c));
  };

  const onSignInRequired = () => {
    router.push(`/login?next=${encodeURIComponent(router.asPath)}`);
  };

  /**
   * Prefer the individually-fetched lesson (it carries the quiz prompts); fall
   * back to the syllabus row, which is all a locked lesson has.
   */
  const selectedLesson = useMemo(() => {
    if (fetchedLesson) return fetchedLesson;
    return ordered.find((l) => l.id === selectedId) || firstOpen;
  }, [fetchedLesson, ordered, selectedId, firstOpen]);

  // Neighbours in course order, so the player can move on without hunting
  // through the syllabus. The next one stays disabled until this lesson is done,
  // mirroring the server gate rather than guessing at it.
  const neighbours = useMemo(() => {
    const i = selectedLesson ? ordered.findIndex((l) => l.id === selectedLesson.id) : -1;
    const pick = (j: number) =>
      j >= 0 && j < ordered.length ? { id: ordered[j].id, title: ordered[j].title } : null;
    return { previous: pick(i - 1), next: pick(i + 1) };
  }, [ordered, selectedLesson]);

  const progress = course?.progress;
  const done = progress?.is_complete;
  // The server is the only authority on access. Defaulting to `granted: true`
  // when the field is missing keeps an older cached payload from rendering a
  // paywall over a course the learner may well already own.
  const locked = course ? course.access?.granted === false : false;
  // A certificate can only exist if the course awards one. Without this check an
  // ineligible course renders a claim button that the API refuses with a 400.
  const existingCert = course?.certificate || null;

  return (
    <>
      <Head>
        <title>{course ? `${course.title} · TieEdu` : 'Course · TieEdu'}</title>
      </Head>
      <Header cartCount={0} onOpenCart={() => {}} onOpenSearch={() => {}} onOpenLeaderboard={() => {}} />

      <main className="mx-auto w-full max-w-6xl px-6 pb-24 pt-10">
        {loading && <p className="py-20 text-center text-sm text-[var(--text-muted)]">Loading course…</p>}

        {error && !loading && (
          <p className="my-10 rounded-xl border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 px-4 py-3 text-sm text-[var(--color-error)]">
            {error}
          </p>
        )}

        {course && (
          <>
            <header className="mb-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[var(--brand-sky-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-sky-strong)]">
                  {course.category}
                </span>
                {course.is_free && (
                  <span className="rounded-full bg-[var(--bg-sky-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-sky)]">
                    Free
                  </span>
                )}
              </div>
              <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-[var(--ink)] sm:text-4xl">
                {course.title}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--text-body)]">
                {course.subtitle}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                {locked ? (
                  <PayWall
                    priceInr={course.price_inr}
                    reason={course.access?.reason || 'This course is not part of your plan.'}
                    onBuy={buy}
                    buying={enrolling}
                  />
                ) : progress?.enrolled ? (
                  <div className="w-full max-w-xs">
                    <ProgressBar
                      percent={progress.percent}
                      label={`${progress.completed} of ${progress.total} lessons`}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={enrol}
                    disabled={enrolling}
                    className="rounded-lg bg-[var(--brand-sky)] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--brand-sky-strong)] disabled:opacity-50"
                  >
                    {enrolling ? 'Starting…' : 'Start this course'}
                  </button>
                )}
              </div>
            </header>

            {locked && (
              <div className="mb-8 flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
                <Lock size={18} className="mt-0.5 shrink-0 text-[var(--text-muted)]" />
                <p className="text-sm leading-relaxed text-[var(--text-body)]">
                  The syllabus below is open so you can see what this course covers, but the lessons
                  themselves are for enrolled learners. {course.access?.reason}
                </p>
              </div>
            )}

            {done && (
              <section className="mb-8 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-[var(--color-success)]" />
                  <h2 className="text-lg font-bold text-[var(--ink)]">Course complete</h2>
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-body)]">
                  You finished all {progress?.total} lessons. Tell us what stuck
                  {course.certificate_eligible ? ', then claim your certificate.' : '.'}
                </p>

                <FeedbackBlock
                  courseSlug={slug}
                  done={feedbackSent}
                  onSent={() => {
                    setFeedbackSent(true);
                    loadCourse();
                  }}
                />

                {course.certificate_eligible && (
                  <CertificateBlock
                    courseSlug={slug}
                    existing={existingCert}
                    busy={certBusy}
                    error={certError}
                    onBusy={setCertBusy}
                    onError={setCertError}
                    onIssued={loadCourse}
                  />
                )}
              </section>
            )}

            <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
              <aside className="lg:sticky lg:top-6 lg:h-fit">
                {(course.modules || []).map((m) => (
                  <div key={m.id} className="mb-5">
                    <h3 className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      {m.title}
                    </h3>
                    {(m.lessons || []).map((l) => (
                      <LessonRow
                        key={l.id}
                        lesson={l}
                        courseSlug={slug}
                        locked={isLocked(l, progress ?? null)}
                        isNext={progress?.next_lesson_id === l.id}
                      />
                    ))}
                  </div>
                ))}
              </aside>

              <section className="min-w-0">
                {selectedLesson ? (
                  <LessonPlayer
                    key={selectedLesson.id}
                    lesson={selectedLesson}
                    courseSlug={slug}
                    canSubmit={!!progress?.enrolled}
                    onProgress={onProgress}
                    onLessonUpdated={loadCourse}
                    onSignInRequired={onSignInRequired}
                    previousLesson={neighbours.previous}
                    nextLesson={neighbours.next}
                    complete={!!(selectedLesson.state as LessonCompletionState)?.is_complete}
                    onNavigate={(id) => router.push({ pathname: '/courses/[slug]', query: { slug, lesson: id } })}
                  />
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">This course has no lessons yet.</p>
                )}
              </section>
            </div>
          </>
        )}
      </main>
      <Footer />

      {courseLine && (
        <CartModal
          isOpen={cartOpen}
          onClose={() => setCartOpen(false)}
          items={[courseLine]}
          onRemoveItem={() => setCartOpen(false)}
          // A paid course only becomes unlocked once the order is marked paid,
          // so the page is reloaded from the server rather than patched locally.
          onCheckoutSuccess={() => {
            setCartOpen(false);
            loadCourse();
          }}
        />
      )}
    </>
  );
}

const FeedbackBlock: React.FC<{ courseSlug: string; done: boolean; onSent: () => void }> = ({
  courseSlug,
  done,
  onSent,
}) => {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (done) {
    return (
      <p className="mt-4 rounded-lg bg-[var(--bg-sky-soft)] px-3 py-2 text-sm font-semibold text-[var(--color-success)]">
        Thanks — your feedback is recorded.
      </p>
    );
  }

  const send = async () => {
    setBusy(true);
    setErr(null);
    try {
      await submitCourseFeedback(courseSlug, {
        rating,
        would_recommend: rating >= 4,
        what_learned: text,
      });
      onSent();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-5 rounded-xl border border-[var(--border-subtle)] p-4">
      <h3 className="text-sm font-bold text-[var(--ink)]">What did you make of it?</h3>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            className={[
              'h-8 w-8 rounded-lg border text-sm font-bold transition-colors',
              rating === n
                ? 'border-[var(--brand-accent)] bg-[var(--brand-accent)] text-white'
                : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--border-strong)]',
            ].join(' ')}
          >
            {n}
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="One thing that clicked, one that didn't"
        className="mt-3 w-full rounded-lg border border-[var(--border-subtle)] p-3 text-sm outline-none focus:border-[var(--brand-sky)]"
      />
      {err && <p className="mt-2 text-xs text-[var(--color-error)]">{err}</p>}
      <button
        type="button"
        onClick={send}
        disabled={busy || text.trim().length === 0}
        className="mt-3 rounded-lg border border-[var(--border-strong)] px-4 py-2 text-xs font-bold text-[var(--ink)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-40"
      >
        {busy ? 'Sending…' : 'Send feedback'}
      </button>
    </div>
  );
};

const CertificateBlock: React.FC<{
  courseSlug: string;
  /**
   * The learner's existing certificate for this course, as the server reports
   * it. When present the block renders as a download rather than a claim.
   */
  existing: CertificateSummary | null;
  busy: boolean;
  error: string | null;
  onBusy: (v: boolean) => void;
  onError: (v: string | null) => void;
  onIssued: () => void;
}> = ({ courseSlug, existing, busy, error, onBusy, onError, onIssued }) => {
  // Seeded from the server's `course.certificate`, not from local state, so a
  // learner who already claimed sees "Download" on arrival instead of a claim
  // button that only appears to work.
  const [issued, setIssued] = useState<{
    serial: string;
    verification_url: string;
    download_path: string;
  } | null>(existing || null);
  const [downloading, setDownloading] = useState(false);

  const claim = async () => {
    onBusy(true);
    onError(null);
    try {
      const res = await issueCertificate(courseSlug);
      setIssued(res.certificate);
      onIssued();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      onBusy(false);
    }
  };

  const download = async () => {
    if (!issued) return;
    setDownloading(true);
    try {
      const { blobUrl, filename } = await downloadCertificatePdf(issued.download_path);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Give the browser a beat to start the download before dropping the blob.
      setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  if (!issued) {
    return (
      <div className="mt-5">
        <button
          type="button"
          onClick={claim}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-sky)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-sky-strong)] disabled:opacity-50"
        >
          <Award size={16} />
          {busy ? 'Issuing…' : 'Claim my certificate'}
        </button>
        {error && <p className="mt-2 text-xs text-[var(--color-error)]">{error}</p>}
      </div>
    );
  }
  return (
    <div className="mt-5 rounded-xl border border-[var(--brand-sky)]/30 bg-[var(--bg-sky-soft)] p-4">
      <p className="text-sm font-bold text-[var(--brand-sky-strong)]">
        Certificate {issued.serial} issued.
      </p>
      <p className="mt-1 text-xs text-[var(--text-body)]">
        Anyone can confirm it is genuine:{' '}
        <a href={issued.verification_url} target="_blank" rel="noopener noreferrer" className="underline">
          {issued.verification_url}
        </a>
      </p>
      <button
        type="button"
        onClick={download}
        disabled={downloading}
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[var(--brand-sky)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--brand-sky-strong)] disabled:opacity-50"
      >
        <Download size={14} />
        {downloading ? 'Preparing…' : 'Download PDF'}
      </button>
    </div>
  );
};

/**
 * The paywall shown in place of "Start this course" when the server says this
 * learner has not bought the course. It never decides for itself that a course
 * is paid — `locked` comes from `course.access.granted`, which also accounts for
 * an order the learner already paid for.
 */
const PayWall: React.FC<{
  priceInr: number;
  reason: string;
  onBuy: () => void;
  buying: boolean;
}> = ({ priceInr, reason, onBuy, buying }) => (
  <div className="flex flex-wrap items-center gap-3">
    <div>
      <div className="text-2xl font-extrabold leading-none text-[var(--ink)]">
        ₹{Math.round(priceInr).toLocaleString('en-IN')}
      </div>
      <div className="mt-1 text-xs text-[var(--text-muted)]">one-time · lifetime access</div>
    </div>
    <button
      type="button"
      onClick={onBuy}
      disabled={buying}
      className="rounded-lg bg-[var(--brand-sky)] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--brand-sky-strong)] disabled:opacity-50"
    >
      {buying ? 'Opening checkout…' : 'Buy this course'}
    </button>
    <span className="text-xs text-[var(--text-muted)]">{reason}</span>
  </div>
);
