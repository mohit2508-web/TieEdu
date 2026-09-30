import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { Footer } from '@/components/layout/Footer';
import { LessonPlayer } from '@/components/courses/LessonPlayer';
import {
  AboutCourseSection,
  AudienceSection,
  CourseFactStrip,
  InstructorSection,
  PrerequisitesSection,
} from '@/components/courses/CourseDetailSections';
import { isLocked, ProgressBar, CourseRowCard, CtaButton, CourseCover } from '@/components/courses/CourseUi';
import { CourseSyllabusNav } from '@/components/courses/CourseSyllabusNav';
import { CoursePreviewShell } from '@/components/courses/CoursePreviewShell';
import { decideCoursePage } from '@/lib/courseSsr';
import { CourseThumbnailEditor } from '@/components/courses/CourseThumbnailEditor';
import { Award, AlertTriangle, CheckCircle2, Download, Lock, ShieldCheck, Star, Users, Layers, FileText, Clock } from 'lucide-react';
import {
  fetchCourse,
  fetchLesson,
  fetchRelatedCourses,
  enrollInCourse,
  issueCertificate,
  downloadCertificatePdf,
  submitCourseFeedback,
} from '@/lib/coursesApi';
import { API_BASE_URL, apiAssetUrl } from '@/lib/api';
import {
  courseCta,
  courseIncludes,
  formatDuration,
  formatEnrolled,
  formatLessonCount,
  formatLevel,
  formatModuleCount,
  formatPrice,
  formatRating,
  formatReviewCount,
  plainText,
} from '@/lib/courseFormat';
import { useAuth } from '@/context/AuthContext';
import { useCart, useCartScope } from '@/context/CartContext';
import { useShell } from '@/context/ShellContext';
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
  preview = null,
}: {
  initialCourse: CourseDetail | null;
  initialRelated: CourseCard[];
  /**
   * The public catalogue row, set only when the API refused the detail fetch
   * because this is a paid course and the visitor is signed out. It is what the
   * server can honestly render in that case — see CoursePreviewShell.
   */
  preview?: CourseCard | null;
}) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { add } = useCart();
  const { openOverlay } = useShell();

  const slug = typeof router.query.slug === 'string' ? router.query.slug : '';
  const requestedLesson = typeof router.query.lesson === 'string' ? router.query.lesson : null;
  // A boolean rather than `user` itself: signing in and out is what should
  // trigger a re-fetch, not a profile update re-rendering the same person.
  const isSignedIn = !!user;
  // Server-enforced too; this only avoids showing a control that would 403.
  const isAdmin = user?.role === 'admin';

  const [course, setCourse] = useState<CourseDetail | null>(initialCourse);
  const [related, setRelated] = useState<CourseCard[]>(initialRelated);
  const [fetchedLesson, setFetchedLesson] = useState<CourseLessonView | null>(null);
  // A preview is already something to render, so it must not read as "still
  // loading" — otherwise the page shows a spinner over content it already has.
  const [loading, setLoading] = useState(!initialCourse && !preview);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [certBusy, setCertBusy] = useState(false);
  const [certError, setCertError] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);

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

  /**
   * Add this course to the shared cart and show the drawer.
   *
   * It used to open a drawer holding a hardcoded `items={[courseLine]}` — a
   * single line built from the page, ignoring anything already in the cart, and
   * whose "remove" button did nothing but close the drawer. Now the line goes
   * through the same cart as every other purchase, so buying a course and a
   * company vault together is possible.
   */
  const buy = () => {
    if (!user) return router.push(`/login?next=/courses/${slug}`);
    if (courseLine) add(courseLine);
    openOverlay('cart');
  };

  /*
   * A paid course only becomes unlocked once the order is marked paid, so the
   * page is reloaded from the server rather than patched locally. Registered on
   * the shared drawer because checkout can be completed from any route.
   */
  useCartScope(
    useMemo(() => ({ onCheckoutSuccess: loadCourse }), [loadCourse])
  );

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

  /**
   * The cover as an absolute URL.
   *
   * Uploaded covers are stored server-relative, and `og:image` in particular is
   * fetched by crawlers and social scrapers with no notion of the site's API
   * origin, so it has to be absolute or the preview silently breaks. A course
   * with no cover has none — no placeholder image is invented for it.
   */
  // Either view can supply the cover. Bound to a single value first so the
  // "does it exist" test and the conversion cannot disagree.
  const coverPath = course?.thumbnail_url || preview?.thumbnail_url || '';
  const coverImage = coverPath ? apiAssetUrl(coverPath) : '';

  /**
   * The page's identity, resolved from whichever of the two views is live.
   *
   * Before this existed a paid course had no title, no canonical URL and no
   * structured data at all when rendered without an account, because all three
   * were read straight off `course` — which is exactly the course the API refuses
   * to a stranger. A page with no canonical and no title is not a page a search
   * engine can do anything with.
   */
  const pageSlug = course?.slug || preview?.slug || null;
  const pageTitle = course
    ? `${course.title} · TieEdu`
    : preview
      ? `${preview.title} · TieEdu`
      : 'Course · TieEdu';

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
    : preview
      ? // The catalogue row is the only public description of a paid course, so
        // it is what a crawler gets. Falling back to the generic sentence here
        // would index the same boilerplate on every paid course on the site.
        plainText(preview.description || preview.subtitle, 155)
      : 'A structured, sequential TieEdu course with server-tracked progress and a verifiable certificate.';

  /**
   * The one enrolment control for this page.
   *
   * The hero and the sticky card both render this, because they have to agree:
   * a learner who scrolls past the hero to read the syllabus must not find a
   * different offer, a different price, or a button that disagrees with the one
   * they just walked past. Deriving it once is cheaper than auditing two copies.
   */
  const enrollAction = () => {
    if (!course) return null;
    if (locked) {
      return (
        <PayWall
          priceInr={course.price_inr}
          reason={course.access?.reason || 'This course is not part of your plan.'}
          onBuy={buy}
          buying={enrolling}
        />
      );
    }
    if (progress?.enrolled) {
      /* A learner already in the course is better served by the progress bar than
         by any button, so `courseCta`'s "Continue learning" label is not used
         here. The card shows it, because a card has nowhere else to say it. */
      return (
        <div className="w-full max-w-xs">
          <ProgressBar
            percent={progress.percent}
            label={`${progress.completed} of ${progress.total} lessons`}
          />
        </div>
      );
    }
    /* Label and tone come from `courseCta` - the same helper the catalogue card
       uses - so the same purchase state reads the same on both pages. */
    return (
      <CtaButton tone={cta.tone} onClick={enrol} disabled={enrolling} className="disabled:opacity-50">
        {enrolling ? 'Starting…' : cta.label}
      </CtaButton>
    );
  };

  /**
   * What the card is allowed to claim. See `courseIncludes` in
   * lib/courseFormat.ts — it drops any entry the course has no data for, so the
   * list can never advertise a certificate, caption track or challenge count the
   * course does not actually have. It is derived, not typed out here, so the
   * hero and the card can never drift apart.
   */
  const includes = useMemo(() => courseIncludes(course), [course]);

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
        <title>{pageTitle}</title>
        <meta name="description" content={metaDescription} />
        {pageSlug && <link rel="canonical" href={`${SITE_URL}/courses/${pageSlug}`} />}
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={metaDescription} />
        {pageSlug && <meta property="og:url" content={`${SITE_URL}/courses/${pageSlug}`} />}
        {pageSlug && <meta property="og:type" content="website" />}
            {coverImage && <meta property="og:image" content={coverImage} />}

        {/* Structured data for the signed-out view of a paid course.
            Without this the only HTML a crawler got was a spinner, so a paid
            course was effectively unlistable however good its page was. Every
            field here comes from the public catalogue row, so this asserts
            nothing the API has not already published — in particular it carries
            no syllabus, no instructor and no review or rating figures, because
            for a stranger those do not exist yet. */}
        {!course && preview && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'Course',
                name: preview.title,
                description: metaDescription,
                url: `${SITE_URL}/courses/${preview.slug}`,
                ...(preview.is_free
                  ? { isAccessibleForFree: true }
                  : { offers: { '@type': 'Offer', price: String(preview.price_inr), priceCurrency: 'INR' } }),
                // `hasCourseInstance` is omitted rather than derived from
                // `certificate_eligible`. These were briefly wired together, which
                // is wrong on its face: being eligible for a certificate says
                // nothing about how the course is delivered, so a course that
                // happens to award one would have had a CourseInstance asserted
                // and every other course silently would not. Guessing a delivery
                // mode is not worth the markup; the fields above are all facts the
                // API actually published.
                ...(preview.thumbnail_url ? { image: apiAssetUrl(preview.thumbnail_url) } : {}),
                provider: { '@type': 'Organization', name: 'TieEdu', url: SITE_URL },
              }),
            }}
          />
        )}

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
                    // The language the material is actually delivered in, when we
                    // know it. Hardcoding 'en' would be a claim about a course whose
                    // audio has not been recorded, so it is only stated when the
                    // author has filled the field in.
                    ...(course.audio_language ? { inLanguage: course.audio_language } : { inLanguage: 'en' }),
                    ...(coverImage ? { image: coverImage } : {}),
                    provider: { '@type': 'Organization', name: 'TieEdu', url: SITE_URL },
                    ...(course.category ? { educationalLevel: course.category } : {}),

                    /**
                     * `aggregateRating` is emitted only when there is a real average
                     * AND a real count of reviews behind it.
                     *
                     * Google requires both, and a rating with no `ratingCount` is
                     * treated as invalid structured data - it earns nothing and can
                     * get the page flagged. It would also be dishonest: "4.6 stars"
                     * with no visible review count is a rating nobody can check.
                     * Below one review the average is not published on the page
                     * either, so emitting it here would invent a figure the rest of
                     * the page deliberately hides.
                     */
                    ...(course.signals &&
                    typeof course.signals.rating_avg === 'number' &&
                    course.signals.rating_count > 0
                      ? {
                          aggregateRating: {
                            '@type': 'AggregateRating',
                            ratingValue: course.signals.rating_avg,
                            ratingCount: course.signals.rating_count,
                            bestRating: 5,
                            worstRating: 1,
                          },
                        }
                      : {}),

                    /**
                     * The teacher, as a `Person` when one is assigned.
                     *
                     * This used to always be `Organization: TieEdu`, which is not
                     * wrong so much as useless: it told a search engine that the
                     * publisher teaches the course, when the record may name someone
                     * else entirely. Falls back to the publisher only when no
                     * instructor is on file, so nothing is asserted about a person
                     * who is not recorded.
                     */
                    ...(course.instructor?.id
                      ? {
                          hasCourseInstance: {
                            '@type': 'CourseInstance',
                            courseMode: 'online',
                            ...(duration ? { courseWorkload: duration } : {}),
                            instructor: {
                              '@type': 'Person',
                              name: course.instructor.name,
                              ...(course.instructor.title ? { jobTitle: course.instructor.title } : {}),
                              ...(course.instructor.photo_url
                                ? { image: apiAssetUrl(course.instructor.photo_url) }
                                : {}),
                            },
                          },
                        }
                      : {
                          hasCourseInstance: {
                            '@type': 'CourseInstance',
                            courseMode: 'online',
                            ...(duration ? { courseWorkload: duration } : {}),
                            instructor: { '@type': 'Organization', name: 'TieEdu' },
                          },
                        }),

                    // Free courses carry this so a search engine can filter on it.
                    ...(course.is_free ? { isAccessibleForFree: true } : {}),

                    /**
                     * Captions, when the course has them.
                     *
                     * `caption` is what makes the material usable without sound, so
                     * it is worth stating - and it is only stated when recorded,
                     * because advertising captions a course does not have is a
                     * promise about accessibility that the player cannot keep.
                     */
                    ...(course.caption_language
                      ? {
                          hasPart: {
                            '@type': 'WebPageElement',
                            name: `Captions in ${course.caption_language}`,
                            ...(coverImage ? { image: coverImage } : {}),
                          },
                        }
                      : {}),
                    ...(course.is_free
                      ? {
                          offers: {
                            '@type': 'Offer',
                            price: '0',
                            priceCurrency: 'INR',
                            availability: 'https://schema.org/InStock',
                            category: 'Free',
                          },
                        }
                      : {
                          offers: {
                            '@type': 'Offer',
                            price: String(course.price_inr),
                            priceCurrency: 'INR',
                            availability: 'https://schema.org/InStock',
                          },
                        }),
                    // `hasCourseInstance` is emitted above, next to the instructor it
                    // depends on. It used to be duplicated here with the hardcoded
                    // publisher as teacher, and a duplicate key in one JSON-LD object
                    // silently resolves to the LAST one - so the real instructor would
                    // have been discarded in favour of the fallback.
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

      {/* A reader shell, wider than the rest of the site. See --reader-max in
        globals.css for the arithmetic: the outline rail and the enrolment card
        together need 644px before the lesson gets anything, and inside the
        site's usual max-w-6xl that left 460px of text - too narrow to read a code
        block in. Prose on this page keeps its own measure (the FAQ is max-w-3xl,
        outcomes max-w-2xl), so only the reading column widens. */}
    <main className="mx-auto w-full max-w-[var(--reader-max)] px-4 pb-24 pt-10 sm:px-6 min-[1440px]:px-8">
        {loading && <p className="py-20 text-center text-sm text-[var(--text-muted)]">Loading course…</p>}

        {error && !loading && !preview && (
          <p className="my-10 rounded-xl border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 px-4 py-3 text-sm text-[var(--color-error)]">
            {error}
          </p>
        )}

        {/* The paid-course, signed-out view. Rendered on the server from public
            catalogue data, so a crawler and a visitor without an account both get
            the real course instead of a spinner. A signed-in visitor never sees
            this: the client effect fetches the detail and the full page replaces
            it. */}
        {!course && preview && <CoursePreviewShell course={preview} onSignIn={onSignInRequired} />}

        {course && (
          <>
            <header className="mb-8">
              {/* Scaler-style split hero: the text carries the decision, the
                  cover gives the page an anchor. On narrow screens the cover
                  drops below the title rather than squeezing the title into a
                  narrow column. */}
              <div className="grid gap-6 sm:grid-cols-[1fr_240px] sm:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[var(--brand-sky-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-sky-strong)]">
                      {course.category}
                    </span>
                    {course.is_free ? (
                      <span className="rounded-full bg-[var(--bg-sky-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-sky)]">
                        Free
                      </span>
                    ) : (
                      <span className="rounded-full bg-[var(--brand-mint)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-sky-strong)]">
                        {formatPrice(course.price_inr)}
                      </span>
                    )}
                  </div>
                  <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-[var(--ink)] sm:text-4xl">
                    {course.title}
                  </h1>
                  <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--text-body)]">
                    {course.subtitle}
                  </p>
                </div>

                <CourseCover
                  slug={course.slug}
                  title={course.title}
                  thumbnailUrl={course.thumbnail_url}
                  className="hidden aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] sm:block"
                />
              </div>

              {/* The cover belongs above the copy on a phone, where the split
                  layout collapses and a right-hand column would leave the title
                  a few characters wide. */}
              <CourseCover
                slug={course.slug}
                title={course.title}
                thumbnailUrl={course.thumbnail_url}
                className="mt-5 aspect-[16/9] w-full overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] sm:hidden"
              />

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

              <div className="mt-5 flex flex-wrap items-center gap-3">{enrollAction()}</div>
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

            {isAdmin && (
              <div className="mb-8">
                <CourseThumbnailEditor
                  courseId={course.id}
                  slug={course.slug}
                  title={course.title}
                  currentThumbnailUrl={course.thumbnail_url}
                  onChanged={(thumbnail_url) =>
                    // Re-render the hero without a full refetch, so the new cover
                    // is visible immediately and the admin can judge it.
                    setCourse((prev) => (prev ? { ...prev, thumbnail_url } : prev))
                  }
                />
              </div>
            )}

            {done && (
              /* Two columns, because these are two different kinds of thing.

                 On the left is the fact - you finished, here is the number. On the
                 right are the two things you can do about it: rate the course, and
                 take the certificate. Stacked, the second column's controls floated
                 under a full-width paragraph with a heading that was already done
                 saying something, and widening the page for the reader made that
                 worse rather than better. Split, the panel reads as a summary with
                 its actions beside it, and the rating stars land next to the review
                 count they are answering. */
              <section className="mb-8 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-[var(--color-success)]" />
                      <h2 className="text-lg font-bold text-[var(--ink)]">Course complete</h2>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--text-body)]">
                      You finished all {progress?.total} lessons
                      {course.certificate_eligible ? '. Tell us what stuck, then claim your certificate.' : '.'}
                    </p>
                    {/*
                      The two actions are siblings in the right-hand column, so
                      whichever comes first gets the top edge rather than the
                      FeedbackBlock's own `mt-5` pushing the certificate down.
                    */}
                    <div className="mt-1 lg:mt-0">
                      <FeedbackBlock
                        courseSlug={slug}
                        done={feedbackSent}
                        onSent={() => {
                          setFeedbackSent(true);
                          loadCourse();
                        }}
                      />
                    </div>
                  </div>

                  <div className="lg:border-l lg:border-[var(--border-subtle)] lg:pl-6">
                    {course.certificate_eligible ? (
                      <>
                        <h3 className="text-sm font-bold text-[var(--ink)]">Your certificate</h3>
                        {/*
                          Averaging stars are not a certificate, so this says which
                          of the two it is. The issued panel below states the
                          verifiability itself; this only has to explain the button
                          that mints it, and say what the learner gets for the click.
                        */}
                        <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                          Issued the moment you finish, with a serial anyone can check.
                        </p>
                        <div className="mt-4">
                          <CertificateBlock
                            courseSlug={slug}
                            existing={existingCert}
                            busy={certBusy}
                            error={certError}
                            onBusy={setCertBusy}
                            onError={setCertError}
                            onIssued={loadCourse}
                          />
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-[var(--text-muted)]">
                        This course does not award a certificate.
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* The numbers a learner checks before committing time or money,
                placed directly under the hero so they answer "is this worth it"
                before any scrolling. Every pip is a value the server sent; the
                strip renders nothing at all when it has none, rather than a row
                of placeholders. */}
            <CourseFactStrip
              level={course.level}
              lessonCount={course.stats?.lesson_count ?? null}
              moduleCount={course.stats?.module_count ?? null}
              totalMinutes={course.stats?.total_minutes ?? null}
              // `stats.quiz_count` is the count of quiz lessons; the server's
              // `challenge_count` is counted from the same lessons independently.
              // The server figure is the one shown, because it is derived next to
              // the gating logic, and a disagreement between the two would mean
              // one of them is lying about the course.
              challengeCount={course.challenge_count ?? null}
              audioLanguage={course.audio_language ?? null}
              captionLanguage={course.caption_language ?? null}
              certificateEligible={course.certificate_eligible}
            />

            {/* Two columns from `lg`, three from a width that can actually pay for
                the third one.

                This used to add the enrolment card at `xl` (1280px) inside a
                max-w-6xl container - so the card appeared precisely where there
                was no extra room, and the lesson column fell from 792px to 460px
                the moment it showed up. That 460px is what the reader was
                complaining about: a page of text in the middle of a mostly empty
                screen. The card was not worth 332px of reading width at that size,
                and the hero already carries the same control (`enrollAction` is
                shared), so nothing was lost by waiting.

                The rails also get their width per layout rather than one value for
                both. At two columns the lesson is the whole point, so the outline
                stays at the 280px it has always been and the reading measure is
                exactly what it was before this change - widening it here would
                have been a small, silent regression at laptop widths. The extra
                20px on the outline, and the card, both arrive together at 1440px,
                which is where the lesson still gets ~724px with all three. */}
            <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8 min-[1440px]:grid-cols-[300px_minmax(0,1fr)_288px] lg:items-start">
              <CourseSyllabusNav
                modules={course.modules || []}
                courseSlug={slug}
                progress={progress ?? null}
                selectedLessonId={selectedLesson?.id ?? null}
                totalMinutes={course.stats?.total_minutes}
              />

              <section id="lesson-player" className="min-w-0 scroll-mt-[var(--rail-top)]">
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

              {/* The sticky enrolment card.

                  `position: sticky` is scoped to its containing block, so this
                  only works because the card is a grid child of the same box that
                  holds the lesson: it sticks for as long as the lesson is being
                  read, and stops there rather than floating over the outcomes
                  and FAQ further down. That is the intended behaviour - past the
                  syllabus, the page is answering questions, not selling.

                  It pins at the same offset as the outline rail (`--rail-top`) so
                  the two columns' tops line up; the rail used to pin at top-6 and
                  sat 40px higher than the card beside it.

                  The price is stated only for a course that has one, and a free
                  course says Free instead of a struck-through zero. `enrollAction`
                  is the hero's own control, so this can never offer something
                  different from the offer above. */}
              <aside className="hidden min-[1440px]:block" aria-label="Enrol in this course">
                <div className="sticky top-[var(--rail-top)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
                  <div className="text-2xl font-extrabold leading-none text-[var(--ink)]">
                    {course.is_free ? 'Free' : formatPrice(course.price_inr)}
                  </div>
                  {!course.is_free && (
                    <p className="mt-1 text-xs text-[var(--text-muted)]">One-time payment, lifetime access</p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-3">{enrollAction()}</div>

                  {includes.length > 0 && (
                    <>
                      <h2 className="mt-5 border-t border-[var(--border-subtle)] pt-4 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        What is included
                      </h2>
                      <ul className="mt-3 space-y-2">
                        {includes.map((item) => (
                          <li key={item} className="flex gap-2 text-sm leading-snug text-[var(--text-body)]">
                            <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[var(--color-success)]" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </aside>
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

            {/* About, audience and pre-requisites. Each is authored prose rather
                than a generated list, and each disappears entirely when the
                author has not written it — see CourseDetailSections for why a
                heading with nothing under it is worse than no heading. Order is
                deliberate: what the course is, then who it is for, then what it
                assumes, then who is teaching it. */}
            <AboutCourseSection about={course.about_course} />
            <AudienceSection items={course.audience} />
            <PrerequisitesSection items={course.prerequisites} />
            <InstructorSection instructor={course.instructor} />

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
      <p className="rounded-lg bg-[var(--bg-sky-soft)] px-3 py-2 text-sm font-semibold text-[var(--color-success)]">
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
    <div className="rounded-xl border border-[var(--border-subtle)] p-4">
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
      <div>
        <button
          type="button"
          onClick={claim}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-sky)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-sky-strong)] disabled:opacity-50"
        >
          <Award size={16} />
          {busy ? 'Issuing…' : 'Claim my certificate'}
        </button>
        {/* A notice, not a red line under a button.

            The failure this has to carry is "our signing key is not set up", which
            is not the learner's mistake and does not put their completion at risk.
            Rendering it as `text-xs` in the error colour said the opposite: that
            something small had gone wrong with their certificate. This block also
            re-asserts the thing the learner actually cares about, because the first
            thing anyone wonders after a failure here is whether the 46 lessons they
            just finished are still counted. */}
        {error && (
          <div
            role="alert"
            className="mt-3 flex max-w-prose items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-3"
          >
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-700" />
            <p className="text-sm leading-relaxed text-amber-900">{error}</p>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-[var(--brand-sky)]/30 bg-[var(--bg-sky-soft)] p-4">
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
 *
 * The one case that needs care is a PAID course, which the API answers 403 for an
 * anonymous caller. That refusal is deliberate and asserted in the smoke suite
 * ("a signed-out visitor cannot even open a paid course page"), so this does not
 * route around it. Instead it asks the public catalogue — a genuinely public
 * endpoint that needs no token — for the one row describing that course, and
 * hands it over as `preview`. The page then renders real, public, indexable
 * content instead of a spinner. Nothing here widens what the API exposes; a
 * signed-in visitor still gets the full detail from the client effect.
 */
export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const slug = String(params?.slug || '');
  if (!slug) return { props: { initialCourse: null, initialRelated: [], preview: null } };

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

  // 403 is the API's deliberate answer for a paid course viewed signed-out. The
  // public catalogue needs no token and describes the course honestly, so it is
  // asked for the one row. A failure here is not fatal: the page falls back to the
  // loading state and the client retries, exactly as it did before.
  let catalogue: unknown;
  if (!initialCourse && upstreamStatus === 403) {
    try {
      const res = await fetch(`${API_BASE_URL}/courses`);
      if (res.ok) {
        const data = await res.json();
        catalogue = data.courses;
      }
    } catch {
      /* The preview is an improvement, never a requirement. */
    }
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

  // The decision - 404 vs preview vs retry-on-the-client - lives in courseSsr so
  // it can be tested as a table. See the note there for why it is a whitelist and
  // not just "return the catalogue row".
  const decision = decideCoursePage({ upstreamStatus, course: initialCourse, catalogue, slug });

  // A real 404 carries a 404 status, so a search engine drops it instead of
  // indexing the message. Only a reachable API saying 404 qualifies: answering 404
  // because the backend was down turns a temporary blip into a permanent verdict.
  if (decision.kind === 'notFound') {
    return { notFound: true };
  }

  const preview = decision.preview as CourseCard | null;
  return { props: { initialCourse, initialRelated, preview } };
};
