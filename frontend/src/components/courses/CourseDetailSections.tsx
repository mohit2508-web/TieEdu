import React from 'react';
import {
  Award,
  Captions,
  CheckCircle2,
  Clock3,
  Gauge,
  GraduationCap,
  Headphones,
  ListChecks,
  Target,
  UserRound,
} from 'lucide-react';
import type { CourseInstructor } from '@/types';
import { apiAssetUrl } from '@/lib/api';
import { bulletRows, proseParagraphs } from '@/lib/courseProse';

export { proseParagraphs };

// ---------------------------------------------------------------------------
// The long-form sections of a course page.
//
// Every section here follows the same two rules, and they are the whole reason
// this is a separate file rather than markup inline in the page:
//
// 1. If the server did not send the data, render nothing. Not a placeholder, not
//    a dash, not an invented bullet. `CourseDetail` omits these keys entirely
//    when they are empty, so `undefined` genuinely means "never written" and the
//    heading must disappear with it. A page of headings with nothing under them
//    reads as a broken site.
//
// 2. Every number shown is a number the server sent. Nothing here derives a
//    claim from thin air, and optional figures are omitted rather than shown as
//    zero, because "0 students taught" is a different and false statement from
//    "we do not have that figure".
// ---------------------------------------------------------------------------

/**
 * Split long-form prose into paragraphs. See `lib/courseProse` for why this lives
 * in a plain module rather than here, and re-exported for convenience.
 */

/** A titled block. Renders `null` when there is nothing inside it. */
const Section: React.FC<{
  id: string;
  title: string;
  lede?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ id, title, lede, children, className = '' }) => (
  <section aria-labelledby={`${id}-heading`} className={`mt-14 ${className}`}>
    <h2 id={`${id}-heading`} className="text-xl font-extrabold tracking-tight text-[var(--ink)]">
      {title}
    </h2>
    {lede && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--text-muted)]">{lede}</p>}
    <div className="mt-4">{children}</div>
  </section>
);

/**
 * "About this course" — the long prose block.
 *
 * This is the section that answers "what will I actually spend these hours on",
 * so it is given a narrower measure than the rest of the page. Long-form prose at
 * a full 1152px measure is hard to read; prose is the one thing on a course page
 * that genuinely wants a column.
 */
export const AboutCourseSection: React.FC<{ about?: string }> = ({ about }) => {
  const paragraphs = proseParagraphs(about);
  if (paragraphs.length === 0) return null;
  return (
    <Section id="about" title="About this course" className="max-w-3xl">
      <div className="space-y-4">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-[15px] leading-7 text-[var(--text-body)]">
            {p}
          </p>
        ))}
      </div>
    </Section>
  );
};

/** A bullet list of prerequisites or audience. Returns null when empty. */
const BulletList: React.FC<{ items?: string[] }> = ({ items }) => {
  const rows = bulletRows(items);
  if (rows.length === 0) return null;
  return (
    <ul className="grid gap-2.5 sm:grid-cols-2">
      {rows.map((row, i) => (
        <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-[var(--text-body)]">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[var(--color-success)]" aria-hidden="true" />
          <span>{row}</span>
        </li>
      ))}
    </ul>
  );
};

export const PrerequisitesSection: React.FC<{ items?: string[] }> = ({ items }) => {
  if (bulletRows(items).length === 0) return null;
  return (
    <Section
      id="prerequisites"
      title="What you should know before you start"
      lede="Anything here is assumed, not taught. If it is not on the list, the course explains it."
    >
      <BulletList items={items} />
    </Section>
  );
};

export const AudienceSection: React.FC<{ items?: string[] }> = ({ items }) => {
  if (bulletRows(items).length === 0) return null;
  return (
    <Section id="audience" title="Who this course is for">
      <BulletList items={items} />
    </Section>
  );
};

/**
 * The instructor block.
 *
 * `null` instructor renders nothing at all. An empty card with a "TBA" placeholder
 * would be worse than no card: it advertises that nobody is known to teach the
 * course while looking like the design simply failed to load.
 */
export const InstructorSection: React.FC<{ instructor?: CourseInstructor | null }> = ({ instructor }) => {
  if (!instructor || !instructor.name) return null;

  // Only the figures the record actually carries. Each is omitted rather than
  // shown as 0, because these are claims about a real person's history.
  const figures: { label: string; value: string }[] = [];
  if (typeof instructor.course_count === 'number' && instructor.course_count > 0) {
    figures.push({ label: instructor.course_count === 1 ? 'course' : 'courses', value: String(instructor.course_count) });
  }
  if (typeof instructor.students_taught === 'number') {
    figures.push({ label: 'students taught', value: instructor.students_taught.toLocaleString('en-IN') });
  }
  if (typeof instructor.hours_lectured === 'number') {
    figures.push({ label: 'hours taught', value: instructor.hours_lectured.toLocaleString('en-IN') });
  }

  const photo = instructor.photo_url ? apiAssetUrl(instructor.photo_url) : '';

  return (
    <Section id="instructor" title="Your instructor">
      <div className="flex flex-col gap-5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:flex-row">
        {photo ? (
          <img
            src={photo}
            alt={instructor.name}
            loading="lazy"
            className="h-20 w-20 shrink-0 rounded-full object-cover"
          />
        ) : (
          // A monogram rather than a broken image. There is no seed instructor, so
          // a photo-less record is the normal case, not a failure.
          <span
            aria-hidden="true"
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[var(--bg-surface-hover)] text-2xl font-extrabold text-[var(--text-muted)]"
          >
            {instructor.name.trim().charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-base font-extrabold text-[var(--ink)]">{instructor.name}</p>
          {instructor.title && (
            <p className="mt-0.5 text-sm font-medium text-[var(--brand-sky)]">{instructor.title}</p>
          )}
          {instructor.bio && (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--text-body)]">{instructor.bio}</p>
          )}
          {figures.length > 0 && (
            <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              {figures.map((f) => (
                <div key={f.label} className="flex items-baseline gap-1.5">
                  <dt className="sr-only">{f.label}</dt>
                  <dd className="text-sm font-extrabold text-[var(--ink)]">{f.value}</dd>
                  <span aria-hidden="true" className="text-xs text-[var(--text-muted)]">
                    {f.label}
                  </span>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </Section>
  );
};

/**
 * The fact strip above the syllabus: the numbers a learner checks before
 * committing time or money.
 *
 * Each pip is omitted when the server has no value for it. The one place a
 * deliberate zero is allowed is `challenge_count`, because a course with no
 * challenges is a true fact about the course rather than a gap in our records.
 */
export const CourseFactStrip: React.FC<{
  level?: string | null;
  lessonCount?: number | null;
  moduleCount?: number | null;
  totalMinutes?: number | null;
  challengeCount?: number | null;
  audioLanguage?: string | null;
  captionLanguage?: string | null;
  certificateEligible?: boolean | null;
}> = ({
  level,
  lessonCount,
  moduleCount,
  totalMinutes,
  challengeCount,
  audioLanguage,
  captionLanguage,
  certificateEligible,
}) => {
  type Pip = { key: string; icon: React.ElementType; label: string };

  const pips: Pip[] = [];

  if (level) pips.push({ key: 'level', icon: Gauge, label: level[0].toUpperCase() + level.slice(1) });
  if (typeof lessonCount === 'number' && lessonCount > 0) {
    const parts = [String(lessonCount), lessonCount === 1 ? 'lesson' : 'lessons'];
    if (typeof moduleCount === 'number' && moduleCount > 0) parts.push(`in ${moduleCount} ${moduleCount === 1 ? 'module' : 'modules'}`);
    pips.push({ key: 'lessons', icon: ListChecks, label: parts.join(' ') });
  }
  if (typeof totalMinutes === 'number' && totalMinutes > 0) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const label = h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''} of material` : `${m}m of material`;
    pips.push({ key: 'duration', icon: Clock3, label });
  }
  if (typeof challengeCount === 'number') {
    pips.push({ key: 'challenges', icon: Target, label: `${challengeCount} ${challengeCount === 1 ? 'challenge' : 'challenges'}` });
  }
  if (audioLanguage) pips.push({ key: 'audio', icon: Headphones, label: `${audioLanguage} audio` });
  if (captionLanguage) pips.push({ key: 'captions', icon: Captions, label: `${captionLanguage} captions` });
  if (certificateEligible) pips.push({ key: 'certificate', icon: Award, label: 'Certificate on completion' });

  if (pips.length === 0) return null;

  return (
    <dl className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3">
      {pips.map((p) => (
        <div key={p.key} className="flex items-center gap-1.5">
          <p.icon size={15} aria-hidden="true" className="shrink-0 text-[var(--text-light)]" />
          <dd className="text-xs font-semibold text-[var(--text-body)]">{p.label}</dd>
        </div>
      ))}
    </dl>
  );
};

/** Exported for the enrollment card, which reuses the same certificate wording. */
export const CERTIFICATE_LABEL = 'Certificate on completion';

/** Exported so the enrollment card and the strip cannot disagree on the icon. */
export const CertificateIcon = GraduationCap;

/** Exported for the instructor block's monogram fallback in tests. */
export const InstructorIcon = UserRound;
