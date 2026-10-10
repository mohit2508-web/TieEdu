import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, MapPin, CalendarClock, Play, Inbox } from 'lucide-react';
import { DriveShell } from '@/components/drives/DriveShell';
import { DriveStatusLine } from '@/components/drives/DriveStatusLine';
import { Skeleton } from '@/components/ui/Skeleton';
import { fetchDriveHomeApi } from '@/lib/drivesApi';
import { useAuth } from '@/context/AuthContext';
import type { DriveHome } from '@/types/drives';

const firstName = (name?: string | null) =>
  name ? name.trim().split(/\s+/)[0] : 'there';

const ctc = (min: number | null, max: number | null) => {
  const inr = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  if (min == null && max == null) return null;
  if (min != null && max != null) return `${inr(min)} – ${inr(max)}`;
  return inr((min ?? max) as number);
};

export default function HomeTab() {
  const { user } = useAuth();
  const [home, setHome] = useState<DriveHome | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const h = await fetchDriveHomeApi();
        if (alive) setHome(h);
      } catch (e) {
        if (alive) setError((e as Error).message || 'Could not load your drives.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <DriveShell title="Mock Drives">
      <div className="mx-auto w-full max-w-[720px] px-4 pb-8 pt-4">
        {/* Greeting + stats */}
        <div className="rounded-[14px] border p-4" style={{ background: 'var(--apple-surface)', borderColor: 'var(--apple-separator)' }}>
          <h1 className="text-[20px] font-bold tracking-tight" style={{ color: 'var(--apple-label)' }}>
            Hi {firstName(user?.name)}
          </h1>
          <p className="mt-0.5 text-[13px]" style={{ color: 'var(--apple-label-2)' }}>
            Here&apos;s what&apos;s happening with your mock drives.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Stat label="Open" value={home?.open_for_you.length ?? null} loading={loading} />
            <Stat label="Upcoming" value={home?.upcoming.length ?? null} loading={loading} />
            <Stat label="In progress" value={home?.in_progress.length ?? null} loading={loading} />
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-[10px] px-3 py-2 text-[13px]" style={{ background: 'var(--apple-red-soft)', color: 'var(--apple-red)' }}>
            {error}
          </p>
        )}

        {/* Continue — in-progress attempts */}
        {home && home.in_progress.length > 0 && (
          <Section title="Continue" href="/mock-drive/assessments" linkLabel="All assessments">
            <ul className="space-y-2.5">
              {home.in_progress.map((a) => (
                <li key={a.attempt_id}>
                  <Link
                    href={`/mock-drive/assessments/${a.attempt_id}`}
                    className="flex items-center gap-3 rounded-[12px] border p-3"
                    style={{ background: 'var(--apple-surface)', borderColor: 'var(--apple-separator)' }}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]" style={{ background: 'var(--apple-blue-soft)', color: 'var(--apple-blue)' }}>
                      <Play size={15} fill="currentColor" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold" style={{ color: 'var(--apple-label)' }}>{a.test_name || a.drive_title}</p>
                      <p className="truncate text-[12px]" style={{ color: 'var(--apple-label-2)' }}>{a.company_name}</p>
                    </div>
                    <ArrowRight size={16} style={{ color: 'var(--apple-label-3)' }} />
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Open for you */}
        <Section title="Open for you" href="/mock-drive/drives" linkLabel="All drives">
          {loading ? (
            <div className="space-y-2.5">{[0, 1].map((i) => <Skeleton key={i} className="h-[76px] w-full" />)}</div>
          ) : home && home.open_for_you.length > 0 ? (
            <ul className="space-y-2.5">
              {home.open_for_you.map((d) => (
                <li key={d.drive_id}>
                  <Link
                    href={`/mock-drive/drives/${d.drive_id}`}
                    className="block rounded-[12px] border p-3.5"
                    style={{ background: 'var(--apple-surface)', borderColor: 'var(--apple-separator)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold" style={{ color: 'var(--apple-label)' }}>{d.title}</p>
                        <p className="truncate text-[12px]" style={{ color: 'var(--apple-label-2)' }}>{d.company_name}</p>
                      </div>
                      <DriveStatusLine statusLine={d.status_line} registrationOpen />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]" style={{ color: 'var(--apple-label-2)' }}>
                      {d.location && <span className="inline-flex items-center gap-1"><MapPin size={11} />{d.location}</span>}
                      {ctc(d.ctc_min, d.ctc_max) && <span>{ctc(d.ctc_min, d.ctc_max)}</span>}
                      {d.registration_closes_at_ist && (
                        <span className="inline-flex items-center gap-1"><CalendarClock size={11} />Closes {d.registration_closes_at_ist}</span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty
              icon={<Inbox size={22} />}
              title="Nothing open right now"
              body="New drives appear here as soon as they open for your college."
              href="/mock-drive/drives"
              cta="Browse drives"
            />
          )}
        </Section>

        {/* Upcoming */}
        <Section title="Upcoming" href="/mock-drive/drives" linkLabel="All drives">
          {loading ? (
            <div className="space-y-2.5">{[0, 1].map((i) => <Skeleton key={i} className="h-[64px] w-full" />)}</div>
          ) : home && home.upcoming.length > 0 ? (
            <ul className="space-y-2.5">
              {home.upcoming.map((d) => (
                <li key={d.drive_id}>
                  <Link
                    href={`/mock-drive/drives/${d.drive_id}`}
                    className="flex items-center gap-3 rounded-[12px] border p-3"
                    style={{ background: 'var(--apple-surface)', borderColor: 'var(--apple-separator)' }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold" style={{ color: 'var(--apple-label)' }}>{d.title}</p>
                      <p className="truncate text-[12px]" style={{ color: 'var(--apple-label-2)' }}>
                        {d.company_name}{d.starts_at_ist ? ` · ${d.starts_at_ist}` : ''}
                      </p>
                    </div>
                    <DriveStatusLine statusLine={d.status_line} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty
              icon={<CalendarClock size={22} />}
              title="No upcoming drives"
              body="Scheduled drives will show up here before they open."
              href="/mock-drive/drives"
              cta="Browse drives"
            />
          )}
        </Section>
      </div>
    </DriveShell>
  );
}

const Stat: React.FC<{ label: string; value: number | null; loading: boolean }> = ({ label, value, loading }) => (
  <div className="rounded-[10px] px-3 py-2.5 text-center" style={{ background: 'var(--apple-fill)' }}>
    {loading ? (
      <Skeleton className="mx-auto h-5 w-8" />
    ) : (
      <p className="text-[18px] font-bold" style={{ color: 'var(--apple-label)' }}>{value ?? 0}</p>
    )}
    <p className="mt-0.5 text-[11px] font-medium" style={{ color: 'var(--apple-label-2)' }}>{label}</p>
  </div>
);

const Section: React.FC<{ title: string; href: string; linkLabel: string; children: React.ReactNode }> = ({
  title, href, linkLabel, children,
}) => (
  <section className="mt-5">
    <div className="mb-2.5 flex items-center justify-between">
      <h2 className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--apple-label)' }}>{title}</h2>
      <Link href={href} className="inline-flex items-center gap-0.5 text-[12px] font-semibold" style={{ color: 'var(--apple-blue)' }}>
        {linkLabel}<ArrowRight size={12} />
      </Link>
    </div>
    {children}
  </section>
);

const Empty: React.FC<{ icon: React.ReactNode; title: string; body: string; href: string; cta: string }> = ({
  icon, title, body, href, cta,
}) => (
  <div className="rounded-[12px] border px-4 py-8 text-center" style={{ borderColor: 'var(--apple-separator)', background: 'var(--apple-surface)' }}>
    <span style={{ color: 'var(--apple-label-3)' }}>{icon}</span>
    <p className="mt-2 text-[14px] font-medium" style={{ color: 'var(--apple-label)' }}>{title}</p>
    <p className="mx-auto mt-1 max-w-[260px] text-[12px]" style={{ color: 'var(--apple-label-2)' }}>{body}</p>
    <Link href={href} className="mt-3 inline-block rounded-[10px] px-4 py-2 text-[13px] font-semibold text-white" style={{ background: 'var(--apple-blue)' }}>
      {cta}
    </Link>
  </div>
);
