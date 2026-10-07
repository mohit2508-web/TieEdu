import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Clock, FileText, Star } from 'lucide-react';
import { Rail } from '@/components/home/Rail';
import { CourseBadge, CourseCover } from '@/components/courses/CourseUi';
import { fetchCourseCatalog } from '@/lib/coursesApi';
import { formatDuration, formatLessonCount, formatLevel, formatRating } from '@/lib/courseFormat';
import { CourseCard } from '@/types';

/*
 * Widths are pinned to the srcset ladder (deviceSizes includes 384 and 390):
 * image-policy fails any `sizes` whose nearest servable width overshoots by
 * more than 15%, and this keeps the ask and the served file identical.
 */
const CARD_W = 'w-[82vw] max-w-[390px] sm:w-[384px] lg:w-[390px]';

/**
 * A course as it appears in the homepage rail: thumbnail-first, one badge, no
 * sentences. The row card on `/courses` is a comparison surface (5 stats +
 * subtitle + CTA) — a rail card that carried all of it would be a wall of text
 * at 320px, so this shows the four facts a browser actually scans: what it is,
 * how good it is, how long, what it costs.
 */
const CourseRailCard: React.FC<{ course: CourseCard }> = ({ course }) => {
  const rating = formatRating(course.signals);
  const overlay = course.is_free
    ? ({ kind: 'new', label: 'Free' } as const)
    : course.badges?.[0]
      ? ({ kind: course.badges[0], label: undefined } as const)
      : null;

  return (
    <Link
      href={`/courses/${course.slug}`}
      className={`vault-card group flex flex-col overflow-hidden p-0 ${CARD_W}`}
    >
      <div className="relative">
        <CourseCover
          slug={course.slug}
          title={course.title}
          thumbnailUrl={course.thumbnail_url}
          className="aspect-video w-full"
          sizes="(min-width: 1024px) 390px, (min-width: 640px) 384px, 82vw"
        />
        {overlay && (
          <span className="absolute left-2.5 top-2.5">
            <CourseBadge kind={overlay.kind} label={overlay.label} />
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-[15px] font-extrabold leading-snug text-[#10151C] transition-colors group-hover:text-[#0271B5]">
          {course.title}
        </h3>
        <p className="text-[12px] font-semibold text-[var(--text-muted)]">
          {formatLevel(course.level)} · {course.category}
        </p>

        <div className="flex items-center gap-3 text-[12px] font-semibold text-[var(--text-muted)]">
          {rating && (
            <span className="inline-flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-[#E8A33D] fill-[#E8A33D]" aria-hidden />
              {rating}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" aria-hidden />
            {formatLessonCount(course.stats)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" aria-hidden />
            {formatDuration(course.stats.total_minutes)}
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between pt-2 border-t border-[#EFEEE9]">
          {course.is_free || course.price_inr === 0 ? (
            <span className="text-[15px] font-black text-[#15803D]">Free</span>
          ) : (
            <span className="text-[15px] font-black text-[#10151C]">₹{course.price_inr}</span>
          )}
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#F7F6F3] text-[#0271B5] transition-colors group-hover:bg-[#0284C7] group-hover:text-white">
            <ArrowRight className="w-4 h-4" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
};

/**
 * Self-fetching "Trending this week" rail. Public catalogue, default sort is
 * `popular` server-side. Renders nothing when the catalogue is empty or down —
 * a broken rail must not break the homepage (the same contract DropsStrip has).
 */
export const CourseRail: React.FC = () => {
  const [courses, setCourses] = useState<CourseCard[] | null>(null);

  useEffect(() => {
    let active = true;
    fetchCourseCatalog()
      .then((res) => {
        if (active) setCourses((res.courses || []).slice(0, 12));
      })
      .catch(() => {
        if (active) setCourses([]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (courses !== null && courses.length === 0) return null;

  return (
    <Rail
      id="courses"
      eyebrow="Trending"
      title="Popular courses"
      seeAllHref="/courses"
      seeAllLabel="See all"
      loading={courses === null}
      skeletonWidth={CARD_W}
      skeletonHeight="h-[276px]"
    >
      {courses?.map((c) => (
        <CourseRailCard key={c.id} course={c} />
      ))}
    </Rail>
  );
};

export default CourseRail;
