import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Briefcase, CalendarClock } from 'lucide-react';
import { Rail } from '@/components/home/Rail';
import { useAuth } from '@/context/AuthContext';
import { fetchDrivesApi, DriveSummary } from '@/lib/drivesApi';
import { formatDate } from '@/lib/date';
import StatusPill, { driveStatusTone } from '@/components/apple/StatusPill';

const CARD_W = 'w-[82vw] max-w-[340px] sm:w-[320px] lg:w-[340px]';

/**
 * Homepage "Trending → Mock drives" rail.
 *
 * The drive catalogue is student-scoped (`GET /api/drives` requires auth so the
 * server can attach `registered` / `my_registration_status`), so the rail only
 * renders for a signed-in student and quietly hides itself otherwise — the same
 * "a broken section must not break the homepage" contract the other rails use.
 * Each card is clearly badged "Mock drive" so a student can tell it apart from
 * vaults, courses and skill tests.
 */
export const MockDriveRail: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [drives, setDrives] = useState<DriveSummary[] | null>(null);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (authLoading || !userId) return;
    let active = true;
    fetchDrivesApi()
      .then((d) => { if (active) setDrives(d.slice(0, 12)); })
      .catch(() => { if (active) setDrives([]); });
    return () => { active = false; };
  }, [authLoading, userId]);

  if (authLoading || !userId) return null;
  if (drives !== null && drives.length === 0) return null;

  return (
    <Rail
      id="mock-drives"
      eyebrow="Trending"
      title="Mock drives"
      meta={drives && drives.length ? `${drives.length} live` : undefined}
      seeAllHref="/mock-drive/drives"
      seeAllLabel="See all"
      loading={drives === null}
      skeletonWidth={CARD_W}
      skeletonHeight="h-[188px]"
    >
      {drives?.map((d) => {
        const registered = d.registered;
        return (
          <Link
            key={d.drive_id}
            href={`/mock-drive/drives/${d.drive_id}`}
            className={`vault-card group flex flex-col gap-3 p-4 ${CARD_W}`}
          >
            <div className="flex items-start gap-3">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--apple-blue-soft)] text-[var(--apple-blue)]">
                <Briefcase className="w-5 h-5" strokeWidth={1.9} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <span className="inline-flex items-center rounded-full bg-[#E8F4FB] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#0271B5]">
                  Mock drive
                </span>
                <h3 className="mt-1 line-clamp-2 text-[15px] font-extrabold leading-snug text-[#10151C] transition-colors group-hover:text-[#0271B5]">
                  {d.company_name || d.title}
                </h3>
                {d.company_name ? (
                  <p className="truncate text-[12px] font-semibold text-[var(--text-muted)]">{d.title}</p>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-3 text-[12px] font-semibold text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="w-3.5 h-3.5" aria-hidden />
                {d.ends_at ? `Ends ${formatDate(d.ends_at)}` : 'Rolling'}
              </span>
            </div>

            <div className="mt-auto flex items-center justify-between border-t border-[#EFEEE9] pt-2.5">
              <StatusPill
                label={
                  registered
                    ? d.my_registration_status === 'completed' ? 'Completed' : d.my_registration_status === 'in_progress' ? 'In progress' : 'Registered'
                    : d.window_open ? 'Open' : 'Closed'
                }
                tone={driveStatusTone(registered ? (d.my_registration_status ?? 'registered') : d.window_open ? 'open' : 'draft')}
                dot={registered}
              />
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#F7F6F3] text-[#0271B5] transition-colors group-hover:bg-[#0284C7] group-hover:text-white">
                <ArrowRight className="w-4 h-4" aria-hidden />
              </span>
            </div>
          </Link>
        );
      })}
    </Rail>
  );
};

export default MockDriveRail;