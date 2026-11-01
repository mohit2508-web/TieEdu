import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTarget } from '@/lib/prepApi';

/**
 * "Infosys SE · 50d" in the header (INFOSYS_SE_3T_UX_PLAN §1): the student's
 * target company and days left, from the same value as Today and the plan.
 */
export const DriveChip: React.FC = () => {
  const { user } = useAuth();
  const t = useTarget(!!user);
  if (!t?.slug || t.days_left === undefined) return null;
  const days = t.days_left;
  const tone = days <= 3 ? 'border-danger/40 text-danger' : days <= 7 ? 'border-signal text-amber-deep' : 'border-line text-heading';
  const short = (t.name || '').replace(/\s*\(([^)]+)\)\s*$/, ' $1').replace('Systems Engineer', '').replace(/\s+/g, ' ').trim();
  return (
    <Link
      href={`/prep/${t.slug}`}
      title={`${days} days left for your ${t.name} test · readiness ${t.readiness}%`}
      className={`focus-ring hidden h-10 items-center gap-1 rounded-full border bg-card px-3 text-sm font-bold tabular-nums lg:inline-flex ${tone}`}
    >
      {days === 0 ? 'Today' : `${days}d`}
      <span className="max-w-[8rem] truncate font-medium text-muted">· {short}</span>
    </Link>
  );
};
