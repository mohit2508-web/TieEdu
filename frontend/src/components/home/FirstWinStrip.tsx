import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Award, Clock } from 'lucide-react';
import { Reveal } from '@/components/home/Reveal';
import { fetchCourseCatalog } from '@/lib/coursesApi';
import { formatDuration } from '@/lib/courseFormat';
import type { CourseCard } from '@/types';

/**
 * The first-win strip: the fastest path to a first certificate.
 *
 * Bucket E holds the 2–4 hour micro-courses, and a finished micro-course with
 * a certificate is the strongest retention hook the catalogue has. This row
 * lists them compactly with their real durations — and the certificate badge
 * appears only when the course is genuinely certificate-eligible, because an
 * "instant certificate" promise on a course that issues none would be fraud.
 *
 * Renders nothing when there are no micro-courses yet (or the fetch fails):
 * content phases ship the courses, and the strip must not advertise them
 * before they exist.
 */
export const FirstWinStrip: React.FC = () => {
  const [courses, setCourses] = useState<CourseCard[] | null>(null);

  useEffect(() => {
    let active = true;
    fetchCourseCatalog({ bucket: ['e'] })
      .then((res) => {
        if (active) setCourses((res.courses || []).slice(0, 8));
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
    <section aria-label="Get your first certificate this weekend" className="border-b border-[#E9E7E1] bg-white">
      <Reveal className="mx-auto w-full max-w-[1700px] px-4 py-8 sm:px-8 sm:py-10 lg:px-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <span className="eyebrow">First win</span>
            <h2 className="font-serif-heading text-2xl font-extrabold leading-tight text-[#10151C] sm:text-3xl">
              Your first certificate this weekend
            </h2>
            <p className="mt-1 text-[13px] font-semibold text-[var(--text-muted)]">
              Short micro-courses, finished in hours — not weeks.
            </p>
          </div>
          <Link
            href="/courses?bucket=e&src=firstwin"
            className="inline-flex shrink-0 items-center gap-1.5 min-h-[44px] px-3 rounded-xl text-[14px] font-bold text-[#0271B5] hover:text-[#025a95] transition-colors focus-ring"
          >
            All micro-courses <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <div className="rail-track">
          {courses === null
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  aria-hidden="true"
                  className="h-[104px] w-[82vw] max-w-[320px] flex-none snap-start animate-pulse rounded-2xl bg-[#F0EFEC] sm:w-[300px]"
                />
              ))
            : courses.map((c) => (
                <Link
                  key={c.id}
                  href={`/courses/${c.slug}?src=firstwin`}
                  className="group flex w-[82vw] max-w-[320px] flex-none snap-start flex-col justify-center gap-1.5 rounded-2xl border border-[#E9E7E1] bg-[#FAFAF9] p-4 transition-colors hover:border-[#0284C7]/40 focus-ring sm:w-[300px]"
                >
                  <span className="line-clamp-2 text-[14px] font-extrabold leading-snug text-[#10151C] group-hover:text-[#0271B5]">
                    {c.title}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-semibold text-[var(--text-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" aria-hidden />
                      {formatDuration(c.stats?.total_minutes)}
                    </span>
                    {c.is_free || c.price_inr === 0 ? (
                      <span className="font-bold text-[#15803D]">Free</span>
                    ) : (
                      <span className="font-bold text-[#10151C]">₹{c.price_inr}</span>
                    )}
                    {c.certificate_eligible && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#E9F6EE] px-2 py-0.5 text-[11px] font-bold text-[#15803D]">
                        <Award className="h-3 w-3" aria-hidden /> Certificate
                      </span>
                    )}
                  </span>
                </Link>
              ))}
        </div>
      </Reveal>
    </section>
  );
};

export default FirstWinStrip;
