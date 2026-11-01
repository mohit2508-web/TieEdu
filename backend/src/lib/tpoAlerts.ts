import type { BatchReadiness, Segment } from './batchReadiness';
import { INACTIVE_DAYS } from './batchReadiness';

/**
 * TPO alerts (PROFESSIONAL_PLATFORM_PLAN §10): what needs the placement cell's
 * attention this week, worked out from data the portal already shows.
 *
 * Privacy follows Batch readiness exactly: the student labels passed in are
 * names only when the officer holds `placement.students.pii`, otherwise roll
 * numbers. Each alert points at the Nudges flow, which the TPO Head approves
 * (college-nudges rules E1) — this page never messages anyone itself.
 */
export type AlertLevel = 'urgent' | 'watch' | 'info';

export interface TpoAlert {
  id: string;
  level: AlertLevel;
  title: string;
  detail: string;
  count: number;
  /** Up to 8 student labels (roll numbers unless names are permitted). */
  examples: string[];
  /** Nudge segment to pre-select, when a nudge is the natural next step. */
  nudge_segment?: Segment;
  /** In-portal link for the next step. */
  href: string;
  cta: string;
}

export interface DriveDeadline {
  drive_id: string;
  title: string;
  status: string;
  registration_closes_at: string | null;
  starts_at: string | null;
}

const DAY = 86_400_000;
const daysUntil = (iso: string, now: Date) => Math.ceil((Date.parse(iso) - now.getTime()) / DAY);

export function buildTpoAlerts(batch: BatchReadiness, drives: DriveDeadline[], now = new Date()): TpoAlert[] {
  const alerts: TpoAlert[] = [];
  const students = batch.students;
  const today = now.toISOString().slice(0, 10);

  const inactive = students.filter((s) => s.segment !== 'not_started' && (!s.last_active || (Date.parse(today) - Date.parse(s.last_active)) / DAY > INACTIVE_DAYS));
  if (inactive.length) {
    alerts.push({
      id: 'inactive',
      level: inactive.length >= 10 ? 'urgent' : 'watch',
      title: `${inactive.length} ${inactive.length === 1 ? 'student has' : 'students have'} gone quiet`,
      detail: `No practice for over ${INACTIVE_DAYS} days after starting. A short nudge usually brings a third of them back.`,
      count: inactive.length,
      examples: inactive.slice(0, 8).map((s) => s.label),
      nudge_segment: 'at_risk',
      href: '/tpo/nudges?segment=at_risk',
      cta: 'Draft a nudge',
    });
  }

  const lowScores = students.filter((s) => s.segment === 'at_risk' && !inactive.includes(s));
  if (lowScores.length) {
    alerts.push({
      id: 'low_readiness',
      level: 'watch',
      title: `${lowScores.length} active ${lowScores.length === 1 ? 'student is' : 'students are'} below 50% readiness`,
      detail: 'They are practising but scoring low on their target companies. Point them at their weakest round.',
      count: lowScores.length,
      examples: lowScores.slice(0, 8).map((s) => s.label),
      nudge_segment: 'at_risk',
      href: '/tpo/analytics',
      cta: 'See who and where',
    });
  }

  const notStarted = batch.segments.not_started || 0;
  if (notStarted) {
    alerts.push({
      id: 'not_started',
      level: notStarted >= 20 ? 'watch' : 'info',
      title: `${notStarted} ${notStarted === 1 ? 'student has' : 'students have'} not started`,
      detail: 'Registered with your college on TieEdu but no lesson or test yet.',
      count: notStarted,
      examples: students.filter((s) => s.segment === 'not_started').slice(0, 8).map((s) => s.label),
      nudge_segment: 'not_started',
      href: '/tpo/nudges?segment=not_started',
      cta: 'Draft a nudge',
    });
  }

  for (const d of drives) {
    if (!['published', 'live'].includes(d.status)) continue;
    if (d.registration_closes_at) {
      const left = daysUntil(d.registration_closes_at, now);
      if (left >= 0 && left <= 3) {
        alerts.push({
          id: `reg:${d.drive_id}`,
          level: left <= 1 ? 'urgent' : 'watch',
          title: `Registration for ${d.title} closes ${left === 0 ? 'today' : left === 1 ? 'tomorrow' : `in ${left} days`}`,
          detail: 'Remind eligible students before the window shuts.',
          count: 0,
          examples: [],
          href: '/tpo/drives',
          cta: 'Open the drive',
        });
      }
    }
    if (d.starts_at) {
      const left = daysUntil(d.starts_at, now);
      if (left >= 0 && left <= 2) {
        alerts.push({
          id: `start:${d.drive_id}`,
          level: 'info',
          title: `${d.title} starts ${left === 0 ? 'today' : left === 1 ? 'tomorrow' : `in ${left} days`}`,
          detail: 'Check registrations and slots are final.',
          count: 0,
          examples: [],
          href: '/tpo/drives',
          cta: 'Open the drive',
        });
      }
    }
  }

  const rank: Record<AlertLevel, number> = { urgent: 0, watch: 1, info: 2 };
  return alerts.sort((a, b) => rank[a.level] - rank[b.level]);
}
