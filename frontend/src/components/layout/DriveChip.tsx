import React, { useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * "39d · Infosys" in the header on every page (TRAIN_TEST_TRACK_PLAN §7).
 * The Today screen stores the nearest drive date (see DriveCountdown); the
 * header only reads it, so no extra request runs on every page.
 */
export const NEXT_DRIVE_KEY = 'tieedu_next_drive';

export const DriveChip: React.FC = () => {
  const [drive, setDrive] = useState<{ company: string; slug: string; date: string } | null>(null);
  useEffect(() => {
    try {
      const d = JSON.parse(window.localStorage.getItem(NEXT_DRIVE_KEY) || 'null');
      if (d?.date) setDrive(d);
    } catch { /* nothing stored */ }
  }, []);
  if (!drive) return null;
  const today = new Date(new Date().toISOString().slice(0, 10));
  const days = Math.round((new Date(drive.date).getTime() - today.getTime()) / 86400000);
  if (days < 0) return null;
  const tone = days <= 3 ? 'border-danger/40 text-danger' : days <= 7 ? 'border-signal text-amber-deep' : 'border-line text-heading';
  return (
    <Link
      href={`/company/${drive.slug}`}
      title={`${days} days left for your ${drive.company} test`}
      className={`focus-ring hidden h-10 items-center gap-1 rounded-full border bg-card px-3 text-sm font-bold tabular-nums lg:inline-flex ${tone}`}
    >
      {days === 0 ? 'Today' : `${days}d`}
      <span className="max-w-[7rem] truncate font-medium text-muted">· {drive.company}</span>
    </Link>
  );
};
