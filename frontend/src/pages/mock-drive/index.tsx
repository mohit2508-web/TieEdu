import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, MapPin, CalendarClock, Play, Inbox, Bell, ChevronRight, IndianRupee, CreditCard, Link2, Zap, CalendarCheck, Clock3 } from 'lucide-react';
import { DriveShell, withDriveAuth } from '@/components/drives/DriveShell';
import { DriveStatusLine } from '@/components/drives/DriveStatusLine';
import { Countdown } from '@/components/drives/Countdown';
import { Skeleton } from '@/components/ui/Skeleton';
import { fetchDriveHomeApi } from '@/lib/drivesApi';
import { useAuth } from '@/context/AuthContext';
import type { DriveHome, DriveNeedsAction } from '@/types/drives';

const firstName = (name?: string | null) =>
  name ? name.trim().split(/\s+/)[0] : 'there';

const ctc = (min: number | null, max: number | null) => {
  const inr = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  if (min == null && max == null) return null;
  if (min != null && max != null) return `${inr(min)} – ${inr(max)}`;
  return inr((min ?? max) as number);
};

/** "2d", "5h", "45m" — urgency badge for a deadline, red when it's today. */
const timeLeft = (iso: string | null | undefined, nowMs: number): { label: string; tone: 'red' | 'orange' | 'gray' } | null => {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - nowMs;
  if (diff <= 0) return null;
  const h = diff / 3_600_000;
  if (h < 24) return { label: `${Math.max(1, Math.floor(h))}h left`, tone: 'red' };
  const d = Math.floor(h / 24);
  return { label: `${d}d left`, tone: h < 72 ? 'orange' : 'gray' };
};

const TONE_STYLE = {
  red: { background: 'var(--apple-red-soft)', color: 'var(--apple-red)' },
  orange: { background: 'var(--apple-orange-soft)', color: 'var(--apple-orange)' },
  gray: { background: 'var(--apple-fill)', color: 'var(--apple-label-2)' },
} as const;

function HomeTab() {
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
    // Background refresh so a payment approval / link activation flips the
    // cards below without the student pulling.
    const poll = setInterval(() => {
      fetchDriveHomeApi().then((h) => alive && setHome(h)).catch(() => {});
    }, 30000);
    return () => { alive = false; clearInterval(poll); };
  }, []);

  const nowMs = useMemo(() => (home ? new Date(home.server_now).getTime() : Date.now()), [home]);
  const stats = home?.stats;

  return (
    <DriveShell title="Mock Drives">
      <div className="mx-auto w-full max-w-[880px] px-4 pb-8 pt-4">
        {/* Hero — greeting + headline numbers on the brand's navy band (dark in both
            themes, so the white text holds). The shell owns the page's h1. */}
        <div className="rounded-[18px] bg-brand-ink p-4 text-white shadow-sm sm:p-5">
          <p className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">Hi {firstName(user?.name)} 👋</p>
          <p className="mt-0.5 text-sm text-white/80">
            Everything happening with your mock drives, in one place.
          </p>
          <div className="mt-3.5 grid grid-cols-4 gap-2">
            <HeroStat label="Applied" value={stats?.applied ?? null} loading={loading} />
            <HeroStat label="Open" value={stats?.open ?? null} loading={loading} />
            <HeroStat label="Running" value={stats?.in_progress ?? null} loading={loading} />
            <HeroStat label="Cleared" value={stats?.completed ?? null} loading={loading} />
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-[10px] px-3 py-2 text-sm" style={{ background: 'var(--apple-red-soft)', color: 'var(--apple-red)' }}>
            {error}
          </p>
        )}

        {/* Notification teaser — surface unread updates without leaving home */}
        {home && home.unread_notifications > 0 && (
          <Link
            href="/mock-drive/notifications"
            className="mt-3 flex items-center gap-3 rounded-[14px] border px-3.5 py-3"
            style={{ background: 'var(--apple-red-soft)', borderColor: 'transparent' }}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] relative" style={{ background: 'var(--apple-surface)', color: 'var(--apple-red)' }}>
              <Bell size={16} strokeWidth={2} />
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-xs font-bold text-[color:var(--apple-on-fill,#fff)]" style={{ background: 'var(--apple-red)' }}>
                {home.unread_notifications}
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--apple-label)' }}>
                {home.unread_notifications} new update{home.unread_notifications > 1 ? 's' : ''}
              </p>
              <p className="truncate text-xs" style={{ color: 'var(--apple-label-2)' }}>
                {home.recent_notifications[0]?.title || 'Drive updates, reminders and results'}
              </p>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--apple-label-2)' }} />
          </Link>
        )}

        {/* Live countdown — "your test starts in …", ticking every second */}
        {home?.next_test && (
          <Link
            href={`/mock-drive/drives/${home.next_test.drive_id}`}
            className="mt-3 block rounded-[16px] bg-brand-ink p-4 text-white shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/60">
                  <Clock3 size={12} /> Your test starts in
                </p>
                <p className="mt-1 text-2xl font-bold leading-none text-white">
                  <Countdown targetIso={home.next_test.starts_at} serverNowIso={home.server_now} />
                </p>
                <p className="mt-1.5 truncate text-xs text-white/70">
                  {home.next_test.title} · {home.next_test.company_name}
                </p>
              </div>
              <span
                className="flex-none rounded-full px-2.5 py-1 text-xs font-bold"
                style={
                  home.next_test.link_active_at
                    ? { background: 'rgba(52,199,89,.22)', color: '#30D158' }
                    : { background: 'rgba(255,255,255,.14)', color: 'rgba(255,255,255,.85)' }
                }
              >
                {home.next_test.link_active_at ? 'LIVE' : 'LINK SOON'}
              </span>
            </div>
          </Link>
        )}

        {/* Action items — pay, book slot, waiting-for-link, all in one stack */}
        {home && home.needs_action.length > 0 && (
          <section className="mt-4">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-base font-bold tracking-tight" style={{ color: 'var(--apple-label)' }}>Needs you</h2>
              <Link href="/mock-drive/drives" className="inline-flex items-center gap-0.5 text-xs font-semibold" style={{ color: 'var(--apple-blue)' }}>
                All drives<ArrowRight size={12} />
              </Link>
            </div>
            <ul className="space-y-2">
              {home.needs_action.map((n) => (
                <li key={`${n.drive_id}-${n.type}`}>
                  <Link
                    href={`/mock-drive/drives/${n.drive_id}`}
                    className="flex items-start gap-3 rounded-[14px] border p-3"
                    style={{ background: 'var(--apple-surface)', borderColor: 'var(--apple-separator)' }}
                  >
                    <NeedsIcon type={n.type} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold" style={{ color: 'var(--apple-label)' }}>{n.title}</p>
                      <p className="mt-0.5 text-xs leading-snug" style={{ color: 'var(--apple-label-2)' }}>{n.message}</p>
                    </div>
                    <ChevronRight size={15} className="mt-1 shrink-0" style={{ color: 'var(--apple-label-2)' }} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Continue — in-progress attempts */}
        {home && home.in_progress.length > 0 && (
          <Section title="Continue" href="/mock-drive/assessments" linkLabel="All assessments">
            <ul className="space-y-2.5">
              {home.in_progress.map((a) => (
                <li key={a.attempt_id}>
                  <Link
                    href={`/mock-drive/assessments/${a.attempt_id}`}
                    className="flex items-center gap-3 rounded-[14px] border p-3.5"
                    style={{ background: 'var(--apple-surface)', borderColor: 'var(--apple-separator)' }}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px]" style={{ background: 'var(--apple-orange-soft)', color: 'var(--apple-orange)' }}>
                      <Play size={16} fill="currentColor" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold" style={{ color: 'var(--apple-label)' }}>{a.test_name || a.drive_title}</p>
                      <p className="truncate text-xs" style={{ color: 'var(--apple-label-2)' }}>{a.company_name}</p>
                    </div>
                    <span className="flex-none rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: 'var(--apple-orange-soft)', color: 'var(--apple-orange)' }}>
                      Resume
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Open for you */}
        <Section title="Open for you" href="/mock-drive/drives" linkLabel="All drives">
          {loading ? (
            <div className="space-y-2.5">{[0, 1].map((i) => <Skeleton key={i} className="h-[88px] w-full" />)}</div>
          ) : home && home.open_for_you.length > 0 ? (
            <ul className="space-y-2.5">
              {home.open_for_you.map((d) => {
                const left = timeLeft(d.registration_closes_at, nowMs);
                return (
                  <li key={d.drive_id}>
                    <Link
                      href={`/mock-drive/drives/${d.drive_id}`}
                      className="block rounded-[14px] border p-3.5 transition-colors active:bg-[var(--apple-fill)]"
                      style={{ background: 'var(--apple-surface)', borderColor: 'var(--apple-separator)' }}
                    >
                      <div className="flex items-start gap-3">
                        <CompanyLogo name={d.company_name} url={d.company_logo_url} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="min-w-0 truncate text-sm font-semibold" style={{ color: 'var(--apple-label)' }}>{d.title}</p>
                            {left && (
                              <span className="flex-none rounded-full px-2 py-0.5 text-xs font-bold" style={TONE_STYLE[left.tone]}>
                                {left.label}
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs" style={{ color: 'var(--apple-label-2)' }}>{d.company_name}</p>
                        </div>
                      </div>
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: 'var(--apple-label-2)' }}>
                        {d.location && <span className="inline-flex items-center gap-1"><MapPin size={11} />{d.location}</span>}
                        {ctc(d.ctc_min, d.ctc_max) && <span className="font-medium" style={{ color: 'var(--apple-green)' }}>{ctc(d.ctc_min, d.ctc_max)}</span>}
                        {d.registration_closes_at_ist && (
                          <span className="inline-flex items-center gap-1"><CalendarClock size={11} />Closes {d.registration_closes_at_ist}</span>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
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
            <div className="space-y-2.5">{[0, 1].map((i) => <Skeleton key={i} className="h-[68px] w-full" />)}</div>
          ) : home && home.upcoming.length > 0 ? (
            <ul className="space-y-2.5">
              {home.upcoming.map((d) => {
                const opens = timeLeft(d.registration_opens_at, nowMs);
                const date = d.starts_at_ist ? d.starts_at_ist.split(',')[0] : null;
                return (
                  <li key={d.drive_id}>
                    <Link
                      href={`/mock-drive/drives/${d.drive_id}`}
                      className="flex items-center gap-3 rounded-[14px] border p-3"
                      style={{ background: 'var(--apple-surface)', borderColor: 'var(--apple-separator)' }}
                    >
                      {date ? (
                        <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[11px] text-center leading-none" style={{ background: 'var(--apple-blue-soft)', color: 'var(--apple-blue)' }}>
                          <span className="text-sm font-bold">{date}</span>
                        </span>
                      ) : (
                        <CompanyLogo name={d.company_name} url={d.company_logo_url} />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold" style={{ color: 'var(--apple-label)' }}>{d.title}</p>
                        <p className="truncate text-xs" style={{ color: 'var(--apple-label-2)' }}>
                          {d.company_name}{d.location ? ` · ${d.location}` : ''}
                        </p>
                      </div>
                      {opens ? (
                        <span className="flex-none rounded-full px-2 py-0.5 text-xs font-bold" style={TONE_STYLE[opens.tone]}>
                          Opens in {opens.label.replace(' left', '')}
                        </span>
                      ) : (
                        <DriveStatusLine statusLine={d.status_line} />
                      )}
                    </Link>
                  </li>
                );
              })}
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

const HeroStat: React.FC<{ label: string; value: number | null; loading: boolean }> = ({ label, value, loading }) => (
  <div className="rounded-[12px] px-2 py-2.5 text-center" style={{ background: 'rgba(255, 255, 255, 0.16)' }}>
    {loading ? (
      <Skeleton className="mx-auto h-5 w-7 bg-white/30" />
    ) : (
      <p className="text-lg font-bold leading-none text-white">{value ?? 0}</p>
    )}
    <p className="mt-1 text-xs font-medium text-white/75">{label}</p>
  </div>
);

const CompanyLogo: React.FC<{ name: string | null; url: string | null }> = ({ name, url }) => (
  <span
    className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[12px] text-base font-bold"
    style={{ background: 'var(--apple-fill)', color: 'var(--apple-blue)' }}
  >
    {url ? (
      // eslint-disable-next-line @next/next/no-img-element -- company logo from any host an admin enters; the optimizer only serves allow-listed hosts
      <img src={url} alt={name || 'Company'} className="h-full w-full object-cover" />
    ) : (
      (name || '?').slice(0, 1).toUpperCase()
    )}
  </span>
);

const NEEDS_STYLE: Record<DriveNeedsAction['type'], { bg: string; fg: string; icon: React.ReactNode }> = {
  pay: { bg: 'var(--apple-red-soft)', fg: 'var(--apple-red)', icon: <IndianRupee size={16} /> },
  payment_review: { bg: 'var(--apple-orange-soft)', fg: 'var(--apple-orange)', icon: <CreditCard size={16} /> },
  slot: { bg: 'var(--apple-blue-soft)', fg: 'var(--apple-blue)', icon: <CalendarCheck size={16} /> },
  slot_confirmed: { bg: 'var(--apple-blue-soft)', fg: 'var(--apple-blue)', icon: <CalendarCheck size={16} /> },
  link_waiting: { bg: 'var(--apple-orange-soft)', fg: 'var(--apple-orange)', icon: <Link2 size={16} /> },
  test_ready: { bg: 'var(--apple-green-soft)', fg: 'var(--apple-green)', icon: <Zap size={16} fill="currentColor" /> },
};

const NeedsIcon: React.FC<{ type: DriveNeedsAction['type'] }> = ({ type }) => {
  const s = NEEDS_STYLE[type] || NEEDS_STYLE.slot;
  return (
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]" style={{ background: s.bg, color: s.fg }}>
      {s.icon}
    </span>
  );
};

const Section: React.FC<{ title: string; href: string; linkLabel: string; children: React.ReactNode }> = ({
  title, href, linkLabel, children,
}) => (
  <section className="mt-5">
    <div className="mb-2.5 flex items-center justify-between">
      <h2 className="text-base font-bold tracking-tight" style={{ color: 'var(--apple-label)' }}>{title}</h2>
      <Link href={href} className="inline-flex items-center gap-0.5 text-xs font-semibold" style={{ color: 'var(--apple-blue)' }}>
        {linkLabel}<ArrowRight size={12} />
      </Link>
    </div>
    {children}
  </section>
);

const Empty: React.FC<{ icon: React.ReactNode; title: string; body: string; href: string; cta: string }> = ({
  icon, title, body, href, cta,
}) => (
  <div className="rounded-[14px] border px-4 py-8 text-center" style={{ borderColor: 'var(--apple-separator)', background: 'var(--apple-surface)' }}>
    <span style={{ color: 'var(--apple-label-2)' }}>{icon}</span>
    <p className="mt-2 text-sm font-medium" style={{ color: 'var(--apple-label)' }}>{title}</p>
    <p className="mx-auto mt-1 max-w-[260px] text-xs" style={{ color: 'var(--apple-label-2)' }}>{body}</p>
    <Link href={href} className="mt-3 inline-block rounded-[10px] px-4 py-2 text-sm font-semibold text-[color:var(--apple-on-fill,#fff)]" style={{ background: 'var(--apple-blue)' }}>
      {cta}
    </Link>
  </div>
);

export default withDriveAuth(HomeTab);
