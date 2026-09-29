import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { LessonPlayer } from '@/components/courses/LessonPlayer';
import { CartModal } from '@/components/checkout/CartModal';
import { isLocked, LessonRow, ProgressBar, CourseRowCard, CtaButton } from '@/components/courses/CourseUi';
import { Award, CheckCircle2, Download, Lock, ShieldCheck, Star, Users, Layers, FileText, Clock } from 'lucide-react';
import {
  fetchCourse,
  fetchLesson,
  fetchRelatedCourses,
  enrollInCourse,
  issueCertificate,
  downloadCertificatePdf,
  submitCourseFeedback,
} from '@/lib/coursesApi';
import { API_BASE_URL } from '@/lib/api';
import {
  courseCta,
  formatDuration,
  formatEnrolled,
  formatLessonCount,
  formatLevel,
  formatModuleCount,
  formatRating,
  formatReviewCount,
  plainText,
} from '@/lib/courseFormat';
import { useAuth } from '@/context/AuthContext';
import type {
  CourseDetail,
  CourseLessonView,
  CourseCartItem,
  CourseCard,
  CertificateSummary,
  LessonCompletionState,
  LessonProgressResponse,
} from '@/types';

const SITE_URL = 'https://tieedu.com';

export default function CoursePage({
  initialCourse,
  initialRelated,
}: {
  initialCourse: CourseDetail | null;
  initialRelated: CourseCard[];
}) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const slug = typeof router.query.slug === 'string' ? router.query.slug : '';
  const requestedLesson = typeof router.query.lesson === 'string' ? router.query.lesson : null;
  // A boolean rather than `user` itself: signing in and out is what should
  // trigger a re-fetch, not a profile update re-rendering the same person.
  const isSignedIn = !!user;

  const [course, setCourse] = useState<CourseDetail | null>(initialCourse);
  const [related, setRelated] = useState<CourseCard[]>(initialRelated);
  const [fetchedLesson, setFetchedLesson] = useState<CourseLessonView | null>(null);
  const [loading, setLoading] = useState(!initialCourse);
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

  /**
   * The SSR payload is the signed-out view, which is the view that should be
   * indexed — so it is kept as-is when nobody is signed in. A signed-in learner
   * needs their own progress and access, so exactly one extra call re-fetches it
   * with the token. Without the skip, every anonymous visit would pay for a
   * request that could not return anything new.
   */
  const skipFirstCourseLoad = useRef(!!initialCourse);
  useEffect(() => {
    if (authLoading || !slug) return;
    if (skipFirstCourseLoad.current) {
      skipFirstCourseLoad.current = false;
      // Anonymous *and* already server-rendered: nothing left to re-fetch.
      if (!isSignedIn && initialCourse) return;
    }
    setLoading(true);
    loadCourse();
  }, [authLoading, isSignedIn, loadCourse, initialCourse, slug]);

  // Related courses are not personalised, so they only need fetching if the
  // server-rendered list came back empty.
  useEffect(() => {
    if (!slug || initialRelated.length > 0) return;
    let cancelled = false;
    fetchRelatedCourses(slug)
      .then((rows) => { if (!cancelled) setRelated(rows); })
      .catch(() => { /* Sibling courses are optional; the page works without them. */ });
    return () => { cancelled = true; };
  }, [slug, initialRelated.length]);

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

  // The single source of truth for "what should this button say and look like",
  // shared with the catalogue card via lib/courseFormat.ts.
  const cta = courseCta({
    progress: course?.progress,
    access: course?.access,
    price_inr: course?.price_inr,
  });

  // Real counts only. An unrated course shows no rating, and a course nobody has
  // enrolled in shows no learner count — see lib/courseFormat.ts.
  const signals = course?.signals;
  const rating = formatRating(signals);
  const reviews = formatReviewCount(signals);
  const enrolled = formatEnrolled(signals?.enrollment_count);
  const duration = formatDuration(course?.stats?.total_minutes);
  const metaDescription = course
    ? plainText(course.description || course.subtitle, 155)
    : 'A structured, sequential TieEdu course with server-tracked progress and a verifiable certificate.';

  // The FAQ answers the questions a learner actually asks before enrolling, and
  // every answer is derived from the platform's real rules and this course's own
  // counts — so the page and the structured data can never disagree with what the
  // product does.
  const faq = useMemo(() => {
    if (!course) return [] as { q: string; a: string }[];
    const moduleCount = formatModuleCount(course.stats);
    const lessonCount = formatLessonCount(course.stats);
    const length = duration ? `about ${duration} of material` : `${moduleCount}`;
    return [
      {
        q: `How much time does ${course.title} take?`,
        a: `The course is ${moduleCount} and ${lessonCount} — ${length} in total. Lessons unlock in order, so the time it takes you depends on how much of each lesson you actually read.`,
      },
      {
        q: 'Do I get a certificate?',
        a: course.certificate_eligible
          ? `Yes. Finish every lesson and a certificate is issued automatically. Its serial is public: anyone can check it at ${SITE_URL}/verify without an account, and a revoked certificate stops verifying.`
          : 'This course does not award a certificate. Progress is still tracked and verifiable on your account.',
      },
      {
        q: 'Is it really free?',
        a: course.is_free
          ? 'Yes — this course is free, and there is nothing to buy to start it.'
          : `This course costs ₹${course.price_inr}. You can see the full syllabus before paying, and the certificate is issued on completion.`,
      },
      {
        q: 'How is my progress tracked?',
        a: 'On the server, lesson by lesson. Time is credited at real-time speed and capped, so a lesson cannot be marked complete faster than it can be read. That is why the percentage survives a new device.',
      },
      {
        q: 'How do ratings work?',
        a: 'Only learners who finished the course can rate it, and the average shown is calculated from those ratings alone. A course nobody has finished yet carries no rating rather than a default one.',
      },
    ];
  }, [course, duration]);

  const breadcrumb = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Courses', item: `${SITE_URL}/courses` },
      ...(course ? [{ '@type': 'ListItem', position: 3, name: course.title, item: `${SITE_URL}/courses/${course.slug}` }] : []),
    ],
  };

  return (
    <>
      <Head>
        <title>{course ? `${course.title} · TieEdu` : 'Course · TieEdu'}</title>
        <meta name="description" content={metaDescription} />
        {course && <link rel="canonical" href={`${SITE_URL}/courses/${course.slug}`} />}
        <meta property="og:title" content={course ? `${course.title} · TieEdu` : 'Course · TieEdu'} />
        <meta property="og:description" content={metaDescription} />
        {course && <meta property="og:url" content={`${SITE_URL}/courses/${course.slug}`} />}
        {course && <meta property="og:type" content="website" />}
        {course?.thumbnail_url && <meta property="og:image" content={course.thumbnail_url} />}

        {course && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@graph': [
                  {
                    '@type': 'Course',
                    name: course.title,
                    description: metaDescription,
                    url: `${SITE_URL}/courses/${course.slug}`,
                    inLanguage: 'en',
                    ...(course.thumbnail_url ? { image: course.thumbnail_url } : {}),
                    provider: { '@type': 'Organization', name: 'TieEdu', url: SITE_URL },
                    ...(course.category ? { educationalLevel: course.category } : {}),
                    ...(course.is_free
                      ? { offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR', availability: 'https://schema.org/InStock', category: 'Free' } }
                      : {
                          offers: {
                            '@type': 'Offer',
                            price: String(course.price_inr),
                            priceCurrency: 'INR',
                            availability: 'https://schema.org/InStock',
                          },
                        }),
                    hasCourseInstance: {
                      '@type': 'CourseInstance',
                      courseMode: 'online',
                      courseWorkload: duration ? duration : undefined,
                      instructor: { '@type': 'Organization', name: 'TieEdu' },
                    },
                  },
                  {
                    '@type': 'FAQPage',
                    mainEntity: faq.map((item) => ({
                      '@type': 'Question',
                      name: item.q,
                      acceptedAnswer: { '@type': 'Answer', text: item.a },
                    })),
                  },
                  breadcrumb,
                ],
              }),
            }}
          />
        )}
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

              {/* Real, server-counted facts. Each one is omitted when it does not
                  exist rather than replaced with a placeholder, so the row below
                  the title is always true. */}
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--text-body)]">
                {rating && (
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <Star size={15} className="text-[var(--brand-accent)]" fill="currentColor" />
                    {rating}
                    {reviews && <span className="font-normal text-[var(--text-muted)]">({reviews})</span>}
                  </span>
                )}
                {enrolled && (
                  <span className="inline-flex items-center gap-1.5">
                    <Users size={15} className="text-[var(--text-muted)]" />
                    {enrolled}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Layers size={15} className="text-[var(--text-muted)]" />
                  {formatModuleCount(course.stats)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <FileText size={15} className="text-[var(--text-muted)]" />
                  {formatLessonCount(course.stats)}
                </span>
                {duration && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={15} className="text-[var(--text-muted)]" />
                    {duration}
                  </span>
                )}
                <span className="text-[var(--text-muted)]">{formatLevel(course.level)}</span>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                {locked ? (
                  <PayWall
                    priceInr={course.price_inr}
                    reason={course.access?.reason || 'This course is not part of your plan.'}
                    onBuy={buy}
                    buying={enrolling}
                  />
                ) : progress?.enrolled ? (
                  /* A learner who is already in the course is better served by
                     the progress bar than by any button, so `courseCta`'s
                     "Continue learning" label is not used here. The card shows
                     it, because a card has nowhere else to say it. */
                  <div className="w-full max-w-xs">
                    <ProgressBar
                      percent={progress.percent}
                      label={`${progress.completed} of ${progress.total} lessons`}
                    />
                  </div>
                ) : (
                  /* Label and tone come from `courseCta` — the same helper the
                     catalogue card uses — so the same purchase state reads the
                     same on both pages. */
                  <CtaButton tone={cta.tone} onClick={enrol} disabled={enrolling} className="disabled:opacity-50">
                    {enrolling ? 'Starting…' : cta.label}
                  </CtaButton>
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

            <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:items-start">
              {/* The syllabus is sticky and scrolls on its own. Without the max
                  height + internal scroll, a long syllabus (15 modules) is taller
                  than the viewport, so it travels with the page and the learner
                  loses it the moment they scroll the lesson. `items-start` stops
                  the grid from stretching the aside to the content height. */}
              <aside className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
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

            {/* What you can do by the end. Authored per course by the person who
                wrote it, so it is specific to this course rather than a generic
                promise reused on every page. */}
            {(course.outcomes?.length || 0) > 0 && (
              <section aria-labelledby="outcomes-heading" className="mt-14">
                <h2 id="outcomes-heading" className="text-xl font-extrabold tracking-tight text-[var(--ink)]">
                  What you will be able to do
                </h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {course.outcomes!.map((outcome, i) => (
                    <li key={i} className="flex gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                      <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[var(--color-success)]" />
                      <span className="text-sm leading-relaxed text-[var(--text-body)]">{outcome}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {faq.length > 0 && (
              <section aria-labelledby="faq-heading" className="mt-14 max-w-3xl">
                <h2 id="faq-heading" className="text-xl font-extrabold tracking-tight text-[var(--ink)]">
                  Questions before you start
                </h2>
                <div className="mt-4 divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
                  {faq.map((item) => (
                    <details key={item.q} className="group py-4">
                      <summary className="cursor-pointer list-none text-sm font-bold text-[var(--ink)] marker:content-none">
                        {item.q}
                      </summary>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--text-body)]">{item.a}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {related.length > 0 && (
              <section aria-labelledby="related-heading" className="mt-14">
                <div className="flex items-baseline justify-between gap-4">
                  <h2 id="related-heading" className="text-xl font-extrabold tracking-tight text-[var(--ink)]">
                    Other courses
                  </h2>
                  <Link href="/courses" className="text-sm font-bold text-[var(--brand-sky)] hover:underline">
                    See all
                  </Link>
                </div>
                <div className="mt-4 space-y-4">
                  {related.map((c) => (
                    <CourseRowCard key={c.id} course={c} />
                  ))}
                </div>
              </section>
            )}
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

/**
 * Server-render the course so its title, description, outcomes and syllabus are
 * in the HTML a crawler sees.
 *
 * The client previously fetched the whole course after mount, which meant the
 * page a search engine indexed contained a loading message and nothing else —
 * the single biggest SEO problem on the site.
 *
 * No token is sent. The catalogue is public and this renders the signed-out view,
 * which is the one that should be indexed; per-learner progress and access are
 * layered on after hydration.
 */
export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const slug = String(params?.slug || '');
  if (!slug) return { props: { initialCourse: null, initialRelated: [] } };

  let initialCourse: CourseDetail | null = null;
  let initialRelated: CourseCard[] = [];

  // The upstream status is kept so a 404 can be told apart from our own failure
  // to ask. `null` means the request never produced a response at all.
  let upstreamStatus: number | null = null;

  try {
    const res = await fetch(`${API_BASE_URL}/courses/${encodeURIComponent(slug)}`);
    upstreamStatus = res.status;
    if (res.ok) {
      const data = await res.json();
      initialCourse = data.course || null;
    }
  } catch {
    // Backend unreachable at SSR time — the client effect retries.
  }

  // Sibling courses are a nicety, not a requirement, so a failure here must not
  // take the page down with it.
  if (initialCourse) {
    try {
      const res = await fetch(`${API_BASE_URL}/courses/${encodeURIComponent(slug)}/related`);
      if (res.ok) {
        const data = await res.json();
        initialRelated = Array.isArray(data.courses) ? data.courses : [];
      }
    } catch {
      /* Related courses are optional. */
    }
  }

  // An unknown slug is a real 404 rather than a page that says "not found" with
  // a 200 status, so a search engine drops it instead of indexing the message.
  //
  // It is only a real 404 when a *reachable* API actually said so. Answering 404
  // because the backend was down, restarting, or slow turns a temporary blip into
  // a permanent verdict on a course that exists: the client never gets to retry
  // because the response is already a 404, and a crawler is free to cache it.
  if (!initialCourse && (upstreamStatus === 404 || upstreamStatus === 200)) {
    return { notFound: true };
  }

  // Unreachable, 5xx, or any other non-answer: hand the page a null course and let
  // the client fetch it. The status stays 200 so nothing downstream caches the
  // outage as a missing page.
  return { props: { initialCourse, initialRelated } };
};
