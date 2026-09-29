/**
 * Display formatting for course cards.
 *
 * Two rules this file exists to enforce, both learned the hard way:
 *
 *  1. `toLocaleString` is banned. `Intl.NumberFormat` output depends on the
 *     host's ICU build, so a server and a browser can disagree on a compact
 *     count ("1.2k" vs "1.2 thousand") and React will throw the hydrated
 *     subtree away. The compact form is therefore written out by hand, which
 *     also means `999` never renders as "1.0k".
 *
 *  2. Nothing here invents a number. `formatEnrolled` is given a real count of
 *     real progress rows and `formatRating` is given a real mean of real
 *     post-completion feedback, or `null`. A formatter that received null returns
 *     null so the caller can render nothing, and there is deliberately no
 *     fallback score to reach for.
 */

import type { CourseSignals, CourseStats } from '@/types';

/**
 * Indian digit grouping: the last three digits, then pairs.
 *
 * `1,29,999` rather than `129,999`. This has to match the server's
 * `formatInr`, which uses `toLocaleString('en-IN')` — a card that says ₹1,299
 * and a checkout page that says ₹1,299 are fine, but ₹12,99,999 on one and
 * ₹1,299,999 on the other looks like two different prices for one course.
 *
 * Written by hand rather than via `toLocaleString` for the same reason the rest
 * of this file avoids `Intl`: ICU availability differs between the build host
 * and the browser.
 */
function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const pairs: string[] = [];
  for (let i = rest.length; i > 0; i -= 2) {
    pairs.unshift(rest.slice(Math.max(0, i - 2), i));
  }
  return `${pairs.join(',')},${last3}`;
}

/**
 * "1" / "42" / "1.2k" / "12k" / "1.2M".
 *
 * One decimal only, and only where it is needed: a value below 10k keeps its
 * decimal ("4.2k") while a value at or above it does not, so the column of
 * learner counts does not end up a ragged mix of widths.
 */
export function compactCount(value: number | null | undefined): string | null {
  // `Number(null)` is 0, so an absent count has to be rejected before the cast.
  // Without this guard `compactCount(null)` returns "0" and a course nobody has
  // enrolled in renders as though it had — which is the exact fabrication this
  // module is meant to prevent.
  if (value === null || value === undefined) return null;

  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;

  if (n < 1000) return String(Math.round(n));

  if (n < 10_000) {
    // `.toFixed` is not locale-dependent, so this is safe on both sides of a
    // hydration boundary.
    return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }

  if (n < 1_000_000) {
    // Rounding can push the figure to 1000 (999,999 learners -> 999.999k ->
    // 1000k), which is worse to read than "1M" and is a number nobody believes.
    // 999.5k is the honest cut-off.
    if (n >= 999_500) return '1M';
    return `${Math.round(n / 1000)}k`;
  }

  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

/** "1 learner" / "42 learners" / "1.2k learners". Null when there is no count. */
export function formatEnrolled(value: number | null | undefined): string | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  const compact = compactCount(n)!;
  return `${compact} ${n === 1 ? 'learner' : 'learners'}`;
}

/**
 * "4.5" from a real mean, or null when nobody has rated the course.
 *
 * Returning null rather than "0.0" is the point: a course with no feedback is
 * new, not bad, and rendering a 0-star row next to a 4.8-star row is a
 * different claim from rendering nothing.
 */
export function formatRating(signals: CourseSignals | null | undefined): string | null {
  const avg = signals?.rating_avg;
  if (avg === null || avg === undefined) return null;
  return String(avg);
}

/** "1 review" / "12 reviews". Null when there are none, so it can be omitted. */
export function formatReviewCount(signals: CourseSignals | null | undefined): string | null {
  const n = Number(signals?.rating_count);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${compactCount(n)!} ${n === 1 ? 'review' : 'reviews'}`;
}

/**
 * "45 min" / "9 hr 20 min" / "2 hr".
 *
 * The old card printed the raw minute count, so a 559-minute course read
 * "559 min", which is a number nobody can plan a weekend around. Hour grouping
 * is what makes the figure comparable between courses.
 */
export function formatDuration(totalMinutes: number | null | undefined): string | null {
  const minutes = Math.max(0, Math.round(Number(totalMinutes) || 0));
  if (minutes === 0) return null;

  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  // Round the hour up when the leftover is at least 40 minutes: "2 hr 40 min"
  // is harder to read than "3 hr", and nobody rounds down in this direction.
  if (rest >= 40) return `${hours + 1} hr`;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

/** "4 modules" / "1 module" / "1 lesson" / "46 lessons". */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  const n = Math.max(0, Math.round(Number(count) || 0));
  return `${compactCount(n)!} ${n === 1 ? singular : plural}`;
}

/** The lesson-count phrase used on the card: "46 lessons". */
export function formatLessonCount(stats: Pick<CourseStats, 'lesson_count'> | null | undefined): string {
  return pluralize(stats?.lesson_count ?? 0, 'lesson');
}

export function formatModuleCount(stats: Pick<CourseStats, 'module_count'> | null | undefined): string {
  return pluralize(stats?.module_count ?? 0, 'module');
}

/** "Beginner" / "Intermediate" / "Advanced", with a title-case fallback. */
const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export function formatLevel(level: string | null | undefined): string {
  const key = String(level || '').toLowerCase();
  if (LEVEL_LABELS[key]) return LEVEL_LABELS[key];
  if (!key) return 'All levels';
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/** "₹1,299" — Indian grouping, matching the server's `formatInr` exactly. */
export function formatPrice(priceInr: number | null | undefined): string {
  if (priceInr === null || priceInr === undefined) return 'Free';
  const amount = Math.max(0, Math.round(Number(priceInr) || 0));
  if (amount === 0) return 'Free';
  return `₹${groupIndian(String(amount))}`;
}

/**
 * The call-to-action on a catalogue card.
 *
 * Deliberately derived from the server's own `access` verdict rather than from
 * `is_free`, so a card can never show "Start Learning" for a course the learner
 * is actually going to be 402'd on. The whole card is a link, so this is a label
 * rather than a button.
 */
export type CourseCtaTone = 'primary' | 'outline' | 'muted' | 'gold';

export function courseCta(input: {
  progress: { enrolled: boolean; is_complete: boolean } | null | undefined;
  access?: { granted: boolean } | undefined;
  price_inr?: number | undefined;
}): { label: string; tone: CourseCtaTone } {
  const { progress, access, price_inr } = input;

  // A paid course this learner has not bought is the one case where the honest
  // label is not "learn" — clicking through would only produce a paywall.
  if (access && !access.granted && (Number(price_inr) || 0) > 0) {
    return { label: `Get this course · ${formatPrice(price_inr)}`, tone: 'gold' };
  }

  if (!progress?.enrolled) return { label: 'Start learning', tone: 'outline' };
  if (progress.is_complete) return { label: 'Review course', tone: 'muted' };
  return { label: 'Continue learning', tone: 'primary' };
}

/**
 * A deterministic cover for a course with no uploaded thumbnail.
 *
 * All three seeded courses have an empty `thumbnail_url`, and a broken
 * `<img>` or an empty grey box both read as "unfinished". The gradient is picked
 * from a hash of the slug so a course always gets the same colours across
 * server render and client hydration, and the big letter gives the row a
 * recognisable anchor without inventing artwork.
 */
export function courseCover(slug: string, title: string): { from: string; to: string; initial: string } {
  const PALETTE = [
    { from: '#0E4C6B', to: '#1B7FA8' },
    { from: '#1B4332', to: '#40916C' },
    { from: '#5A189A', to: '#9D4EDD' },
    { from: '#7F1D1D', to: '#C2410C' },
    { from: '#164E63', to: '#0891B2' },
    { from: '#3F3D56', to: '#6C63FF' },
  ];

  let hash = 0;
  const key = slug || title || 'tieedu';
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }

  const { from, to } = PALETTE[hash % PALETTE.length];
  // First word of the title reads better than a random letter: "C Programming"
  // leads with "C", which is the most useful single character on the card.
  const firstWord = String(title || '').trim().split(/\s+/)[0] || 'T';
  const initial = firstWord.charAt(0).toUpperCase();

  return { from, to, initial };
}

/** Strip markdown for meta descriptions and JSON-LD. */
export function plainText(markdown: string | null | undefined, maxLength = 300): string {
  const text = String(markdown || '')
    // Images, then links (keep the label), then every other inline mark.
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLength) return text;
  // Cut on a word boundary so a meta description never ends mid-word.
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
