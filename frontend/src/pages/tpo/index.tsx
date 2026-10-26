import React from 'react';
import Head from 'next/head';
import { RequirePlacement } from '@/components/placement/RequirePlacement';
import { TpoShell } from '@/components/tpo/TpoShell';
import { usePlacement } from '@/context/PlacementContext';
import { useAuth } from '@/context/AuthContext';
import { Building2, ShieldCheck, KeyRound, CalendarDays, Database } from 'lucide-react';

/**
 * P0 dashboard — the honest placeholder.
 *
 * It shows only what is TRUE today: who you are, which college is active,
 * which role the grant carries, and which permissions were actually resolved
 * from the database. Everything metric-shaped (placement rate, offers,
 * forecasts) arrives with the analytics slices (M3+), and this screen says so
 * explicitly rather than rendering zeros that look like real measurements —
 * a "0% placement rate" on an empty database is a lie the eye reads first.
 *
 * The permission list is load-bearing, not decoration: when an officer
 * reports "I cannot open Imports", this card is the answer — it shows the
 * exact strings the server resolved for their grant, which is precisely what
 * `requirePlacementScope` checks on every data route.
 */

const DashboardCard: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`vault-card p-5 ${className}`}>{children}</div>;

const TpoDashboard: React.FC = () => (
  <RequirePlacement>
    <Head>
      <title>Dashboard — Campus TPO Portal</title>
      <meta name="robots" content="noindex, nofollow" />
    </Head>
    <TpoDashboardBody />
  </RequirePlacement>
);

/** Renders under PlacementProvider — the hooks need context above this component. */
const TpoDashboardBody: React.FC = () => {
  const { me, activeCollegeId, permissions } = usePlacement();
  const { user } = useAuth();

  const college = (me?.colleges || []).find((c) => c.college_id === activeCollegeId);
  const grant = me?.grants?.find((g) => g.college_id === activeCollegeId) || me?.grants?.[0];
  const isWildcard = permissions.includes('*');

  return (
    <TpoShell title="Dashboard">
      <div className="mx-auto max-w-[1180px] px-4 py-6 space-y-5">
        {/* Identity row — the three facts every placement request is scoped by */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <DashboardCard>
            <div className="flex items-center gap-3">
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0"
                style={{ background: college?.theme_color || '#1F3A5F' }}
              >
                {(college?.short_name || college?.name || '??').slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-extrabold uppercase tracking-widest text-[--text-muted]">
                  College
                </p>
                <p className="text-sm font-bold text-heading truncate">{college?.name || '—'}</p>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard>
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-signal-soft flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-brand-ink" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-extrabold uppercase tracking-widest text-[--text-muted]">
                  Your role
                </p>
                <p className="text-sm font-bold text-heading truncate">
                  {grant?.role_label || '—'}
                </p>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard>
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-success-soft flex items-center justify-center shrink-0">
                <Database className="w-5 h-5 text-success" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-extrabold uppercase tracking-widest text-[--text-muted]">
                  Backend
                </p>
                <p className="text-sm font-bold text-heading">PostgreSQL connected</p>
              </div>
            </div>
          </DashboardCard>
        </div>

        {/* What exists today vs what is coming — no zero-metrics pretence */}
        <DashboardCard>
          <div className="flex items-start gap-3 mb-4">
            <CalendarDays className="w-5 h-5 text-amber-deep mt-0.5 shrink-0" />
            <div>
              <h2 className="text-base font-black text-heading">Placement season 2026-27</h2>
              <p className="text-sm text-[--text-muted]">
                Welcome, {user?.name || user?.email}. This is the P0 foundation of the Campus TPO portal —
                identity, college scoping and permissions are live; metric screens arrive with the analytics
                slices (M3 onward) and will show real numbers or an explicit “no data yet”, never zeros
                pretending to be measurements.
              </p>
            </div>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-body">
            <li>✓ &nbsp;Placement authority (role + grant) resolved per request</li>
            <li>✓ &nbsp;College-scoped tenancy with switcher</li>
            <li>✓ &nbsp;Invite + access management in the admin console</li>
            <li className="text-[--text-muted]">○ &nbsp;Student imports &amp; season analytics (M3–M5)</li>
            <li className="text-[--text-muted]">○ &nbsp;Companies, drives &amp; offers (M6–M8)</li>
            <li className="text-[--text-muted]">○ &nbsp;Training tiers, interviews, forecasts (M9–M13)</li>
          </ul>
        </DashboardCard>

        {/* Live permission truth — what requirePlacementScope will check */}
        <DashboardCard>
          <div className="flex items-center gap-3 mb-3">
            <KeyRound className="w-5 h-5 text-brand-ink" />
            <div>
              <h2 className="text-base font-black text-heading">Your resolved permissions</h2>
              <p className="text-sm text-[--text-muted]">
                Read from the database for this college on every request — a revoked grant takes effect
                immediately, not at token expiry.
              </p>
            </div>
          </div>
          {isWildcard ? (
            <p className="text-sm font-bold text-success">
              Platform super admin — all placement permissions (wildcard).
            </p>
          ) : permissions.length === 0 ? (
            <p className="text-sm font-semibold text-amber-deep">
              No permissions resolved for this college yet — ask your T&amp;P Head to confirm your grant.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {permissions.sort().map((p) => (
                <span
                  key={p}
                  className="px-2.5 py-1 rounded-lg bg-surface-hover border border-line text-xs font-semibold text-body"
                >
                  {p}
                </span>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-[--text-muted]">
            <Building2 className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
            Scoped to {college?.name || 'the active college'} · signed in as {user?.email}
          </p>
        </DashboardCard>
      </div>
    </TpoShell>
  );
};

export default TpoDashboard;
