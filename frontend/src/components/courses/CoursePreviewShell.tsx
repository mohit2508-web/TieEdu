import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, FileText, Layers, Lock, PlayCircle } from 'lucide-react';
import { CourseCover } from '@/components/courses/CourseUi';
import { ContentBlockRenderer } from '@/components/blocks/ContentBlockRenderer';
import {
  courseIncludes,
  formatDuration,
  formatLessonCount,
  formatLevel,
  formatModuleCount,
  formatPrice,
} from '@/lib/courseFormat';
import { fetchCourseSample } from '@/lib/coursesApi';
import { CourseMobileActionBar } from '@/components/courses/CourseMobileActionBar';
import type { ContentBlock, CourseCard } from '@/types';

/**
 * The server-rendered view of a paid course for a signed-out visitor.
 *
 * Why this exists
 * ---------------
 * The API deliberately answers 403 for an anonymous request to a paid course —
 * see `courses.routes.ts` and the assertion "a signed-out visitor cannot even
 * open a paid course page" in the smoke suite. That is a considered decision
 * about scraping, and this component does not argue with it or work around it.
 *
 * What it used to do instead was render "Loading course", because the SSR fetch
 * had nothing to hand the page. That was worse on every axis: a crawler indexed a
 * spinner, a real visitor was told content was coming that never arrived, and the
 * 200 status invited the page to be cached as-is. Rendering a spinner is not a
 * neutral fallback, it is a false statement.
 *
 * So this renders the honest version: the public catalogue row for the course.
 * The catalogue is already public and unauthenticated, so nothing here widens
 * what the API exposes. It shows what a prospective buyer needs to decide —
 * what the course is, what it covers at a glance, how long it takes, what it
 * costs — and then says plainly that the detail is behind a sign-in.
 *
 * What it deliberately does NOT do
 * --------------------------------
 * It does not reconstruct a `CourseDetail`. There is no syllabus, no instructor
 * and no long-form prose here, because the public API does not hand those to a
 * stranger and this component is not a place to invent them. The one exception
 * is the first lesson: GET /:slug/sample returns exactly one lesson body (quiz
 * stripped) as the product's free taste of a paid course, and this shell
 * renders it with the same ContentBlockRenderer the enrolled player uses. A
 * signing-in visitor is upgraded to the real page by the client effect.
 */
export const CoursePreviewShell: React.FC<{
  course: CourseCard;
  onSignIn: () => void;
}> = ({ course, onSignIn }) => {
  const includes = courseIncludes(course);
  const duration = formatDuration(course.stats?.total_minutes);

  // The public first-lesson sample. Fetched lazily, never blocking the sales
  // copy above it: if the endpoint is slow or down the page still renders, one
  // section lighter. The server only ever returns lesson 1 of a published
  // course, with the quiz stripped — see GET /:slug/sample.
  const [sample, setSample] = useState<{
    id: string;
    title: string;
    summary?: string;
    blocks?: ContentBlock[];
    module_title?: string;
    duration_minutes?: number;
  } | null>(null);
  const [sampleFailed, setSampleFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchCourseSample(course.slug)
      .then((lesson) => {
        if (!alive) return;
        setSample(lesson);
      })
      .catch(() => {
        if (alive) setSampleFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [course.slug]);

  return (
    <>
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px] lg:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {course.category && (
            <span className="rounded-full bg-[var(--brand-sky-soft)] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[var(--brand-sky-strong)]">
              {course.category}
            </span>
          )}
          <span className="rounded-full bg-[var(--bg-sky-soft)] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[var(--brand-sky)]">
            {course.is_free ? 'Free' : formatPrice(course.price_inr)}
          </span>
        </div>

        <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-[var(--ink)] sm:text-4xl">
          {course.title}
        </h1>
        {course.subtitle && (
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--text-body)]">{course.subtitle}</p>
        )}

        {course.description && (
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--text-body)]">{course.description}</p>
        )}

        {/* Real, server-counted facts only. The same rule as the full page: a
            figure the server did not supply is omitted, never defaulted. */}
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--text-body)]">
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

        {(course.outcomes?.length || 0) > 0 && (
          <section aria-labelledby="preview-outcomes" className="mt-10">
            <h2 id="preview-outcomes" className="text-xl font-extrabold tracking-tight text-[var(--ink)]">
              What you will be able to do
            </h2>
            <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {course.outcomes!.map((outcome, i) => (
                <li
                  key={i}
                  className="flex gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
                >
                  <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[var(--color-success)]" />
                  <span className="text-sm leading-relaxed text-[var(--text-body)]">{outcome}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {includes.length > 0 && (
          <section aria-labelledby="preview-includes" className="mt-10">
            <h2 id="preview-includes" className="text-xl font-extrabold tracking-tight text-[var(--ink)]">
              What is included
            </h2>
            <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {includes.map((item) => (
                <li key={item} className="flex gap-2 text-sm leading-snug text-[var(--text-body)]">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[var(--color-success)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* The free first lesson — the one part of a paid course a stranger may
            read. Same ContentBlockRenderer the enrolled player uses, so the
            sample cannot drift from the real thing. Renders nothing at all when
            the fetch fails or the course has no lessons: a missing sample is a
            lighter page, never an error banner in the middle of a sales pitch. */}
        {sample && (sample.blocks?.length || 0) > 0 && (
          <section aria-labelledby="preview-sample" className="mt-10 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-success-soft, #E8F7EE)] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[var(--color-success)]">
                <PlayCircle size={12} /> Free sample
              </span>
              {sample.module_title && (
                <span className="text-xs text-[var(--text-muted)]">{sample.module_title}</span>
              )}
              {typeof sample.duration_minutes === 'number' && sample.duration_minutes > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)]">
                  <Clock size={12} /> {formatDuration(sample.duration_minutes)}
                </span>
              )}
            </div>
            <h2 id="preview-sample" className="mt-3 text-lg font-extrabold tracking-tight text-[var(--ink)]">
              {sample.title}
            </h2>
            {sample.summary && (
              <p className="mt-1 text-sm leading-relaxed text-[var(--text-body)]">{sample.summary}</p>
            )}
            <div className="mt-4 space-y-4">
              {(sample.blocks || []).map((block, i) => (
                <ContentBlockRenderer key={i} block={block} />
              ))}
            </div>
            <p className="mt-5 border-t border-[var(--border-subtle)] pt-4 text-sm text-[var(--text-muted)]">
              That is lesson 1, in full. Sign in to unlock the rest of the course.
            </p>
            <button
              type="button"
              onClick={onSignIn}
              className="mt-3 inline-flex min-h-[44px] w-full items-center rounded-lg bg-[var(--brand-sky)] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--brand-sky-strong)] sm:w-auto"
            >
              Sign in to continue
            </button>
          </section>
        )}
        {/* Only an honest failure state, shown when the sample endpoint is
            unreachable — the page says so once, quietly, rather than silently
            dropping the section and leaving the "first lesson free" promise in
            the aside unbacked. */}
        {sampleFailed && (
          <p className="mt-8 text-sm text-[var(--text-muted)]">
            The free sample could not load — sign in to see the full course.
          </p>
        )}
      </div>

      <aside className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]" aria-label="Course access">
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
          <CourseCover
            slug={course.slug}
            title={course.title}
            subject={course.category}
            thumbnailUrl={course.thumbnail_url}
            className="mb-4 aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)]"
            /* An `lg:sticky` aside: a third of the reader column once the two-column
               layout engages, full width below it. */
            sizes="(min-width: 1024px) 420px, 100vw"
          />

          <div className="text-2xl font-extrabold leading-none text-[var(--ink)]">
            {course.is_free ? 'Free' : formatPrice(course.price_inr)}
          </div>
          {!course.is_free && (
            <p className="mt-1 text-xs text-[var(--text-muted)]">One-time payment, lifetime access</p>
          )}

          <div className="mt-4 flex items-start gap-2 text-sm text-[var(--text-body)]">
            <Lock size={15} className="mt-0.5 shrink-0 text-[var(--text-muted)]" />
            {/* The offer is now real and precisely scoped: the first lesson is
                free to read via GET /:slug/sample (one lesson, quiz stripped),
                and everything else still needs a sign-in and a purchase. The
                copy names both halves so the visitor is never left guessing
                which one "free" applies to. */}
            <p>
              Sign in for the full syllabus and every lesson. The first lesson is free to read below.
            </p>
          </div>

          {/* Deliberately not wired to the auth "loading" flag.
              This view only ever renders for a visitor the API has refused, so
              the session is by definition not resolved — which on the server is
              always true. Tying the label to it made the server-rendered button
              read "Signing in..." and sit disabled, which is a lie in the HTML a
              crawler and a no-JS visitor both see. The click opens the auth
              modal; that is the whole behaviour.

              `lg:block` because below `lg` this card is inline, at the very bottom
              of a page whose body is the sales pitch — so on a phone the one
              action that unlocks the course was the furthest thing from the top
              of the screen. The sticky bar at the end of the component is the
              mobile half of the same action, not a second one. */}
          <button
            type="button"
            onClick={onSignIn}
            className="mt-4 hidden min-h-[44px] w-full items-center rounded-lg bg-[var(--brand-sky)] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--brand-sky-strong)] lg:flex"
          >
            Sign in to continue
          </button>
        </div>
      </aside>
    </div>

    {/* The mobile half of that same action - Phase 4, §4.1.

        This view is the whole of what a signed-out visitor sees for a paid
        course, and the inline button lives at the foot of the sales pitch. On a
        phone the price is at the top and the only way to act on it is past the
        testimonials. A sticky bar puts "what it costs" and "how to get it" in the
        same thumb-reach, which is the arrangement every app store listing has.

        Server-rendered, and the same button as above: no state is read here, so a
        crawler and a no-JS visitor get an honest control rather than a spinner.
        `py-3` clears the 44px touch minimum that `py-2.5` in the card does not. */}
    <div className="md:hidden">
      <CourseMobileActionBar
        note={course.is_free ? 'Free course' : formatPrice(course.price_inr)}
      >
        <button
          type="button"
          onClick={onSignIn}
          className="focus-ring w-full rounded-xl bg-[var(--brand-sky)] px-5 py-3 text-sm font-bold text-white transition-colors active:opacity-90"
        >
          Sign in to continue
        </button>
      </CourseMobileActionBar>
    </div>
    </>
  );
};
