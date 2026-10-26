import React, { useEffect, useState } from 'react';
import { Star, ThumbsUp, UserRound } from 'lucide-react';
import { fetchCourseReviews, type CourseReview } from '@/lib/coursesApi';

/**
 * Read-only reviews on a course page.
 *
 * Every row comes from post-completion feedback the server accepted — the
 * POST route refuses anything short of a finished course — so this list can
 * only contain people who genuinely finished. There is no "be the first to
 * review" prompt here: writing feedback is a completion-time flow, not a
 * shopping-time one, and offering it here would take the visitor away from
 * the only decision this page exists to support.
 *
 * Fetched lazily on mount; renders nothing at all while loading (no skeleton
 * row, no heading with nothing under it) and "no reviews yet" when empty —
 * an honest state for a new course, not an error.
 */

const Stars: React.FC<{ rating: number }> = ({ rating }) => (
  <span className="inline-flex" aria-label={`${rating} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        size={14}
        className={n <= rating ? 'fill-[var(--brand-gold)] text-[var(--brand-gold)]' : 'text-[var(--border-strong)]'}
      />
    ))}
  </span>
);

const relativeDate = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (!then) return '';
  const months = Math.max(0, Math.floor((Date.now() - then) / (30 * 24 * 60 * 60 * 1000)));
  if (months === 0) return 'this month';
  if (months === 1) return 'last month';
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(months / 12);
  return years === 1 ? 'a year ago' : `${years} years ago`;
};

export const CourseReviews: React.FC<{ courseSlug: string }> = ({ courseSlug }) => {
  const [reviews, setReviews] = useState<CourseReview[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetchCourseReviews(courseSlug)
      .then((data) => {
        if (alive) setReviews(data.reviews);
      })
      .catch(() => {
        if (alive) setReviews([]);
      });
    return () => {
      alive = false;
    };
  }, [courseSlug]);

  if (reviews === null || reviews.length === 0) return null;

  return (
    <section aria-labelledby="reviews-heading" className="mt-14">
      <h2 id="reviews-heading" className="text-xl font-extrabold tracking-tight text-[var(--ink)]">
        Reviews from learners who finished
      </h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Only people who completed the whole course can leave feedback — so every review here is
        from someone who actually did the work.
      </p>
      <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {reviews.slice(0, 8).map((review, i) => (
          <li
            key={`${review.user_name}-${i}`}
            className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-sm font-bold text-[var(--ink)]">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-sky-soft)]">
                  <UserRound size={14} className="text-[var(--brand-sky-strong)]" />
                </span>
                {review.user_name || 'Learner'}
              </span>
              <Stars rating={review.rating} />
            </div>
            {review.what_learned && (
              <p className="text-sm leading-relaxed text-[var(--text-body)]">{review.what_learned}</p>
            )}
            <div className="mt-auto flex items-center gap-3 text-xs text-[var(--text-muted)]">
              {review.would_recommend && (
                <span className="inline-flex items-center gap-1 font-semibold text-[var(--color-success)]">
                  <ThumbsUp size={12} /> Recommends
                </span>
              )}
              <span>{relativeDate(review.created_at)}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};
