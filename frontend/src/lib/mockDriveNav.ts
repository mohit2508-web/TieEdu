// ============================================================================
// MOCK DRIVE SUB-APP — navigation config
//
// The five tabs of the `/mock-drive` sub-app (MOBILE_APP_UI_PLAN drives module).
// Kept dependency-free (no React, no next/router) and separate from the main
// `navConfig.ts` because this sub-app owns its own chrome: it renders its own
// top bar + bottom tab bar rather than the site Header, and is excluded from
// the site shell via SHELL_EXCLUDED_ROUTES.
// ============================================================================

import type { LucideIcon } from 'lucide-react';
import { Home, ClipboardList, Video, FileCheck2, MoreHorizontal } from 'lucide-react';

export interface DriveTab {
  id: string;
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

export const DRIVE_TABS: DriveTab[] = [
  { id: 'home', href: '/mock-drive', label: 'Home', shortLabel: 'Home', icon: Home },
  { id: 'drives', href: '/mock-drive/drives', label: 'Drives', shortLabel: 'Drives', icon: ClipboardList },
  { id: 'interviews', href: '/mock-drive/interviews', label: 'Interviews', shortLabel: 'Interviews', icon: Video },
  { id: 'assessments', href: '/mock-drive/assessments', label: 'Assessments', shortLabel: 'Assess', icon: FileCheck2 },
  { id: 'more', href: '/mock-drive/more', label: 'More', shortLabel: 'More', icon: MoreHorizontal },
];

/** Trailing slashes are cosmetic; next/router can hand back either form. */
const normalize = (value: string): string => {
  const [path] = value.split('#');
  const [withoutQuery] = path.split('?');
  const trimmed = withoutQuery.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
};

/**
 * The active tab for a pathname. Longest-match so `/mock-drive/drives/abc`
 * lights up "Drives" rather than "Home" (`/mock-drive` is a prefix of it).
 */
export const resolveDriveTab = (pathname: string): DriveTab => {
  const current = normalize(pathname);
  const matches = DRIVE_TABS.filter(
    (t) => current === normalize(t.href) || current.startsWith(`${normalize(t.href)}/`)
  );
  if (matches.length === 0) return DRIVE_TABS[0];
  return matches.reduce((best, c) =>
    normalize(c.href).length > normalize(best.href).length ? c : best
  );
};

/**
 * True when the tab bar should stay visible. The five root tabs keep it; a
 * pushed detail (`/mock-drive/drives/[driveId]`, `/mock-drive/profile` …) hides
 * it so the reader/stack screen owns the full height, matching the site's own
 * drill-down rule.
 */
export const isDriveRootPath = (pathname: string): boolean => {
  const current = normalize(pathname);
  return DRIVE_TABS.some((t) => current === normalize(t.href));
};

/**
 * Where the back chevron goes on a pushed detail. Detail routes declare an
 * explicit parent because their path does not imply one (`/mock-drive/profile`
 * has nothing below it to strip). Defaults to the sub-app root.
 */
export const driveBackHref = (pathname: string): string => {
  const current = normalize(pathname);
  if (current.startsWith('/mock-drive/drives/')) return '/mock-drive/drives';
  if (current.startsWith('/mock-drive/drives')) return '/mock-drive';
  if (current.startsWith('/mock-drive/assessments/')) return '/mock-drive/assessments';
  if (current.startsWith('/mock-drive/interviews')) return '/mock-drive';
  if (current.startsWith('/mock-drive/more')) return '/mock-drive';
  if (current.startsWith('/mock-drive/')) return '/mock-drive';
  return '/mock-drive';
};
