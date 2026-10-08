'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { usePlacement } from '@/context/PlacementContext';
import {
  LayoutDashboard,
  Building2,
  CalendarCheck,
  Users,
  Upload,
  GraduationCap,
  BellRing,
  BarChart3,
  LogOut,
  Home,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

/**
 * Chrome for every `/tpo/*` screen — the placement portal's equivalent of
 * `AppShell`, and like `/admin` it renders its own shell (the site shell is
 * excluded for `/tpo` in navConfig).
 *
 * Design rules (iOS HIG, PWA):
 *  - One 48px sticky header: identity (title), context (college), account
 *    (sign-out). Nothing else competes for it.
 *  - Section navigation is a horizontally scrollable tab strip — the pattern
 *    iOS settings-style apps use when 8 destinations must also work one-
 *    handed; a hamburger hides destinations this portal has no search over.
 *  - Permission-shaped navigation: an item only renders when the active grant
 *    holds its permission. A trainer should not see a greyed "Imports" tab —
 *    the tab is simply not part of their product.
 *
 * P0 note: only Dashboard is a real route today. The rest render as enabled
 * structure with a "soon" pill so navigation, RBAC gating and the college
 * switcher are exercised by every page, not retrofitted when M4 lands.
 */

export interface TpoNavItem {
  id: string;
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  soon?: boolean;
}

export const TPO_NAV_ITEMS: TpoNavItem[] = [
  { id: 'dashboard', href: '/tpo', label: 'Dashboard', icon: LayoutDashboard, permission: 'placement.dashboard.read' },
  { id: 'analytics', href: '/tpo/analytics', label: 'Analytics', icon: BarChart3, permission: 'placement.analytics.read', soon: true },
  { id: 'companies', href: '/tpo/companies', label: 'Companies', icon: Building2, permission: 'placement.companies.read', soon: true },
  { id: 'drives', href: '/tpo/drives', label: 'Drives', icon: CalendarCheck, permission: 'placement.drives.read', soon: true },
  { id: 'students', href: '/tpo/students', label: 'Students', icon: Users, permission: 'placement.dashboard.read', soon: true },
  { id: 'training', href: '/tpo/training', label: 'Training', icon: GraduationCap, permission: 'placement.training.read', soon: true },
  { id: 'imports', href: '/tpo/imports', label: 'Imports', icon: Upload, permission: 'placement.imports.write', soon: true },
  { id: 'alerts', href: '/tpo/alerts', label: 'Alerts', icon: BellRing, permission: 'placement.alerts.read', soon: true },
];

const CollegeSwitcher: React.FC = () => {
  const { me, activeCollegeId, setActiveCollegeId, hasPermission } = usePlacement();
  const colleges = me?.colleges || [];

  // A single-college officer has nothing to switch to; hiding the control is
  // honest — the space goes to the title instead of an always-same dropdown.
  if (colleges.length <= 1 && !hasPermission('*')) return null;

  return (
    <label className="relative flex items-center min-w-0 cursor-pointer">
      <span className="sr-only">Active college</span>
      <select
        value={activeCollegeId || ''}
        onChange={(e) => e.target.value && setActiveCollegeId(e.target.value)}
        className="appearance-none max-w-[190px] truncate pl-3 pr-8 py-1.5 rounded-xl bg-white/80 border border-[#E4E1DA] text-[13px] font-bold text-[#10151C] focus:outline-none focus:border-[#0284C7] focus:ring-4 focus:ring-[#0284C7]/10"
      >
        <option value="" disabled>
          {activeCollegeId ? 'College…' : 'Select college'}
        </option>
        {colleges.map((c) => (
          <option key={c.college_id} value={c.college_id}>
            {c.short_name || c.name}
          </option>
        ))}
      </select>
      <ChevronDown className="w-3.5 h-3.5 text-[#6B7280] absolute right-2.5 pointer-events-none" />
    </label>
  );
};

/** Super admins land here until they choose a college — permissions are empty
 *  until they do (see requirePlacementScope), so nothing else can render yet. */
const CollegePickerCard: React.FC = () => {
  const { me, setActiveCollegeId } = usePlacement();
  const colleges = me?.colleges || [];
  return (
    <div className="max-w-[720px] mx-auto py-16 px-4">
      <div className="vault-card p-7">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8F1FA] text-[#0E2A44] text-[11px] font-extrabold uppercase tracking-widest mb-4">
          <Sparkles className="w-3.5 h-3.5" /> Choose a college
        </div>
        <h1 className="display-2 mb-2">Which college are you reviewing?</h1>
        <p className="text-[15px] text-[--text-muted] mb-6">
          You hold platform-wide placement access, so the portal needs to know which college&apos;s data to show.
          Every dashboard, import and offer stays scoped to the college you pick.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {colleges.map((c) => (
            <button
              key={c.college_id}
              onClick={() => setActiveCollegeId(c.college_id)}
              className="text-left px-4 py-4 rounded-2xl border border-[#E4E1DA] bg-white hover:border-[#0284C7] hover:ring-4 hover:ring-[#0284C7]/10 transition-all focus-ring"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[13px] font-black shrink-0"
                  style={{ background: c.theme_color }}
                >
                  {(c.short_name || c.name).slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-bold text-[#10151C] truncate">{c.name}</span>
                  <span className="block text-[12px] text-[--text-muted] uppercase tracking-wide">
                    {c.slug}
                  </span>
                </span>
              </div>
            </button>
          ))}
          {colleges.length === 0 && (
            <p className="text-[14px] text-[--text-muted] sm:col-span-2">
              No colleges exist yet — create one from the admin console&apos;s Colleges &amp; Placement tab.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export const TpoShell: React.FC<{ children: React.ReactNode; title?: string }> = ({ children, title }) => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { me, activeCollegeId, hasPermission } = usePlacement();

  const items = useMemo(
    () => TPO_NAV_ITEMS.filter((i) => !i.permission || hasPermission(i.permission)),
    [hasPermission]
  );

  const activeCollege = (me?.colleges || []).find((c) => c.college_id === activeCollegeId);
  const activeRole = me?.grants?.find((g) => g.college_id === activeCollegeId)?.role_label
    || me?.grants?.[0]?.role_label
    || '';

  const handleLogout = async () => {
    await logout();
    router.replace('/tpo/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9]">
      {/* Header — identity, context, account. Nothing else. */}
      <header className="sticky top-0 z-40 border-b border-[#E9E7E1] bg-white/85 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70">
        <div className="mx-auto max-w-[1180px] px-4 h-12 flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            aria-label="Back to TieEdu"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#3E4754] hover:bg-[#F1EEE7] focus-ring shrink-0"
          >
            <Home className="w-4 h-4" />
          </button>
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-[15px] font-black tracking-tight text-[#0E2A44] whitespace-nowrap">
              Campus TPO
            </span>
            {title && (
              <span className="text-[13px] font-semibold text-[--text-muted] truncate hidden sm:inline">
                / {title}
              </span>
            )}
          </div>
          <div className="flex-1" />
          <CollegeSwitcher />
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-[#E9E7E1] min-w-0">
            <span className="text-[12px] font-bold text-[#3E4754] truncate max-w-[140px]">
              {user?.name || user?.email}
            </span>
            {activeRole && (
              <span className="px-2 py-0.5 rounded-full bg-[#E8F1FA] text-[#0E2A44] text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap">
                {activeRole}
              </span>
            )}
          </div>
          <button
            onClick={handleLogout}
            aria-label="Sign out of the Campus TPO portal"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#A63D28] hover:bg-[#FDEDE9] focus-ring shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Tab strip — scrollable, permission-gated. */}
        {items.length > 1 && (
          <nav className="mx-auto max-w-[1180px] px-2 overflow-x-auto no-scrollbar">
            <ul className="flex items-center gap-1 min-w-max pb-1.5">
              {items.map((item) => {
                const active = router.pathname === item.href;
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => !item.soon && router.push(item.href)}
                      aria-current={active ? 'page' : undefined}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-colors focus-ring ${
                        active
                          ? 'bg-[#0E2A44] text-white'
                          : item.soon
                            ? 'text-[--text-muted] hover:bg-[#F1EEE7]'
                            : 'text-[#3E4754] hover:bg-[#F1EEE7]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {item.label}
                      {item.soon && !active && (
                        <span className="text-[9px] font-extrabold uppercase tracking-wider opacity-70">
                          soon
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </header>

      <main className="flex-1">
        {!activeCollegeId && (me?.colleges?.length || 0) > 0 ? <CollegePickerCard /> : children}
      </main>

      <footer className="border-t border-[#E9E7E1] py-4 text-center text-[12px] text-[--text-muted]">
        Campus TPO Portal · placement data is scoped to the selected college
      </footer>
    </div>
  );
};
