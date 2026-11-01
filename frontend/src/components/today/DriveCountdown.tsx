import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/**
 * The daily countdown moment (TRAIN_TEST_TRACK_PLAN §7).
 *
 * On the first open of a day, yesterday's number is struck through with a red
 * hand-drawn cross and flips down to today's ("40" → "39 days left"). Later
 * opens that day show the number still. Reduced motion skips the animation
 * (the CSS handles that), so the number is never hidden.
 */
const SEEN_KEY = 'tieedu_countdown_seen';

export const DriveCountdown: React.FC<{
  company: string;
  slug: string;
  daysLeft: number;
  nextTask?: { title: string; href: string | null } | null;
}> = ({ company, slug, daysLeft, nextTask }) => {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    // The header chip reads this on every page.
    const date = new Date(Date.now() + daysLeft * 86400000).toISOString().slice(0, 10);
    window.localStorage.setItem('tieedu_next_drive', JSON.stringify({ company, slug, date }));
    const seen = window.localStorage.getItem(SEEN_KEY);
    if (seen !== `${today}:${slug}`) {
      setAnimate(true);
      window.localStorage.setItem(SEEN_KEY, `${today}:${slug}`);
    }
  }, [slug, company, daysLeft]);

  const tone = daysLeft <= 3 ? 'text-danger' : daysLeft <= 7 ? 'text-amber-deep' : 'text-heading';
  const label = daysLeft === 0 ? 'Today is the day' : `day${daysLeft === 1 ? '' : 's'} left`;

  return (
    <section
      aria-label={`${daysLeft} ${label} for the ${company} drive`}
      className="relative mt-6 overflow-hidden rounded-card border border-line bg-card p-5 shadow-edge-neutral sm:p-6"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex items-end gap-3" aria-hidden>
          {animate && daysLeft > 0 && (
            <span className="cd-old relative font-display text-6xl font-extrabold leading-none text-muted sm:text-7xl">
              {daysLeft + 1}
              <svg className="cd-cross absolute -inset-2" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M12 14 C 40 42, 60 60, 90 88" />
                <path d="M88 12 C 62 40, 38 62, 10 90" />
              </svg>
            </span>
          )}
          <span className={`${animate ? 'cd-new' : ''} font-display text-6xl font-extrabold leading-none tabular-nums sm:text-7xl ${tone}`}>
            {daysLeft}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className={`font-display text-xl font-bold ${tone}`}>
            {daysLeft === 0 ? `Today is your ${company} drive` : `${label} · ${company} drive`}
          </p>
          {nextTask && <p className="mt-1 text-sm text-muted">Today: {nextTask.title}</p>}
        </div>
        <Link href={nextTask?.href || `/company/${slug}`} className="btn btn-primary focus-ring min-h-[48px] px-5">
          Start today&apos;s plan <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
};

export default DriveCountdown;
