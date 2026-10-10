import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, SlidersHorizontal, MapPin, IndianRupee, CalendarDays, Building2 } from 'lucide-react';
import { DriveShell } from '@/components/drives/DriveShell';
import { DriveStatusLine } from '@/components/drives/DriveStatusLine';
import { fetchDriveListApi } from '@/lib/drivesApi';
import type { DriveListItem } from '@/types/drives';
import { SegmentedControl } from '@/components/apple/SegmentedControl';
import EmptyState from '@/components/apple/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';

type Filter = 'all' | 'open' | 'registered' | 'upcoming';
type Sort = 'deadline' | 'newest' | 'ctc';

const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const ctcLabel = (d: DriveListItem) => {
  if (d.ctc_min == null && d.ctc_max == null) return null;
  if (d.ctc_min != null && d.ctc_max != null) return `${inr(d.ctc_min)} – ${inr(d.ctc_max)}`;
  return inr((d.ctc_min ?? d.ctc_max) as number);
};

const deadlineTs = (d: DriveListItem) => {
  const t = d.registration_closes_at ?? d.ends_at;
  return t ? new Date(t).getTime() : Number.MAX_SAFE_INTEGER;
};

export default function DrivesListScreen() {
  const [drives, setDrives] = useState<DriveListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('deadline');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rows = await fetchDriveListApi();
        if (alive) setDrives(rows);
      } catch (e) {
        if (alive) setError((e as Error).message || 'Could not load drives.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = drives.filter((d) =>
      !q ||
      d.title.toLowerCase().includes(q) ||
      d.company_name.toLowerCase().includes(q) ||
      (d.job_function ?? '').toLowerCase().includes(q)
    );
    if (filter === 'open') rows = rows.filter((d) => d.registration_open && !d.registered);
    else if (filter === 'registered') rows = rows.filter((d) => d.registered);
    else if (filter === 'upcoming') rows = rows.filter((d) => !d.registration_open && !d.registered);

    rows = [...rows].sort((a, b) => {
      if (sort === 'newest') return new Date(b.starts_at ?? 0).getTime() - new Date(a.starts_at ?? 0).getTime();
      if (sort === 'ctc') return (b.ctc_max ?? -1) - (a.ctc_max ?? -1);
      return deadlineTs(a) - deadlineTs(b);
    });
    return rows;
  }, [drives, query, filter, sort]);

  return (
    <DriveShell title="Drives">
      <div className="mx-auto w-full max-w-[720px] px-4 pb-8 pt-3">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--apple-label-3)' }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search company, role or drive"
            aria-label="Search drives"
            className="w-full rounded-[12px] border py-2.5 pl-9 pr-10 text-[14px] outline-none"
            style={{ background: 'var(--apple-surface-2)', borderColor: 'var(--apple-separator)', color: 'var(--apple-label)' }}
          />
          <button
            type="button"
            aria-label="Sort and filter"
            aria-expanded={showFilters}
            onClick={() => setShowFilters((s) => !s)}
            className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[9px]"
            style={{ color: showFilters ? 'var(--apple-blue)' : 'var(--apple-label-2)' }}
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>

        {/* Filter/sort sheet */}
        {showFilters && (
          <div className="mt-3 rounded-[12px] border p-3" style={{ background: 'var(--apple-surface)', borderColor: 'var(--apple-separator)' }}>
            <SegmentedControl<Filter>
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'open', label: 'Open' },
                { value: 'registered', label: 'Registered' },
                { value: 'upcoming', label: 'Upcoming' },
              ]}
            />
            <div className="mt-2.5">
              <SegmentedControl<Sort>
                value={sort}
                onChange={setSort}
                options={[
                  { value: 'deadline', label: 'Deadline' },
                  { value: 'newest', label: 'Newest' },
                  { value: 'ctc', label: 'CTC' },
                ]}
              />
            </div>
          </div>
        )}

        {/* Body */}
        <div className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-[12px] border p-4" style={{ background: 'var(--apple-surface)', borderColor: 'var(--apple-separator)' }}>
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="mt-2 h-3 w-1/3" />
                  <Skeleton className="mt-3 h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : error ? (
            <EmptyState title="Could not load drives" body={error} />
          ) : visible.length === 0 ? (
            <EmptyState
              title={query || filter !== 'all' ? 'No matching drives' : 'No drives yet'}
              body={query || filter !== 'all' ? 'Try a different search or filter.' : 'When a drive is published for your college, it will show up here.'}
            />
          ) : (
            <ul className="space-y-3">
              {visible.map((d) => {
                const ctc = ctcLabel(d);
                return (
                  <li key={d.drive_id}>
                    <Link
                      href={`/mock-drive/drives/${d.drive_id}`}
                      className="block rounded-[12px] border p-4 transition-colors"
                      style={{ background: 'var(--apple-surface)', borderColor: 'var(--apple-separator)' }}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[11px] text-[13px] font-bold"
                          style={{ background: 'var(--apple-blue-soft)', color: 'var(--apple-blue)' }}
                        >
                          {d.company_logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={d.company_logo_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Building2 size={20} strokeWidth={1.9} />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate text-[15px] font-semibold" style={{ color: 'var(--apple-label)' }}>{d.title}</h3>
                          </div>
                          <p className="truncate text-[13px]" style={{ color: 'var(--apple-label-2)' }}>{d.company_name}</p>
                          <div className="mt-1.5">
                            <DriveStatusLine statusLine={d.status_line} registered={d.registered} registrationOpen={d.registration_open} />
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]" style={{ color: 'var(--apple-label-2)' }}>
                        {d.location && (
                          <span className="inline-flex items-center gap-1"><MapPin size={12} />{d.location}</span>
                        )}
                        {ctc && (
                          <span className="inline-flex items-center gap-1"><IndianRupee size={12} />{ctc}</span>
                        )}
                        {d.registration_closes_at_ist && (
                          <span className="inline-flex items-center gap-1"><CalendarDays size={12} />Closes {d.registration_closes_at_ist}</span>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </DriveShell>
  );
}
