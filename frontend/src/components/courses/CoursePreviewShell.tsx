import React from 'react';
import { CheckCircle2, Clock, FileText, Layers, Lock } from 'lucide-react';
import { CourseCover } from '@/components/courses/CourseUi';
import {
  courseIncludes,
  formatDuration,
  formatLessonCount,
  formatLevel,
  formatModuleCount,
  formatPrice,
} from '@/lib/courseFormat';
import { CourseMobileActionBar } from '@/components/courses/CourseMobileActionBar';
import type { CourseCard } from '@/types';

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
 * It does not reconstruct a `CourseDetail`. There is no syllabus, no instructor,
 * no long-form prose and no lesson content here, because the public API does not
 * hand those to a stranger and this component is not a place to invent them. A
 * signing-in visitor is upgraded to the real page by the client effect.
 */
export const CoursePreviewShell: React.FC<{
  course: CourseCard;
  onSignIn: () => void;
}> = ({ course, onSignIn }) => {
  const includes = courseIncludes(course);
  const duration = formatDuration(course.stats?.total_minutes);

  return (
    <>
    <div className="grid gap-8 lg:grid-cols-[1fr_280px] lg:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {course.category && (
            <span className="rounded-full bg-[var(--brand-sky-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-sky-strong)]">
              {course.category}
            </span>
          )}
          <span className="rounded-full bg-[var(--bg-sky-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-sky)]">
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
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
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
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {includes.map((item) => (
                <li key={item} className="flex gap-2 text-sm leading-snug text-[var(--text-body)]">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[var(--color-success)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <aside className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]" aria-label="Course access">
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
          <CourseCover
            slug={course.slug}
            title={course.title}
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
            {/* No mention of a free first lesson. This view only ever renders for a
                paid course, and a paid course does not have one: a signed-in visitor
                who has not bought it gets the sales syllabus - module and lesson
                titles, durations, quiz counts - and no lesson bodies at all. Promising
                a free first lesson here would be a claim the product does not honour,
                and it would be the most expensive kind of lie on the page, because
                the visitor signs in specifically to collect it. */}
            <p>
              Sign in to see the full syllabus, every lesson description and the instructor.
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
            className="mt-4 hidden w-full rounded-lg bg-[var(--brand-sky)] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--brand-sky-strong)] lg:block"
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
