/**
 * TPO alerts (lib/tpoAlerts) — PROFESSIONAL_PLATFORM_PLAN §10.
 */
import { buildTpoAlerts } from '../src/lib/tpoAlerts';
import type { BatchReadiness } from '../src/lib/batchReadiness';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, note = '') {
  if (cond) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name} ${note}`); }
}

const now = new Date('2026-11-02T06:00:00Z');
const day = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString().slice(0, 10);
const student = (roll: string, segment: any, lastActive: string | null, average: number | null = 60) => ({
  user_id: roll, label: roll, roll_no: roll, branch: 'CSE', batch: '2027', readiness: {}, average, tests: 1, lessons: 1, last_active: lastActive, segment,
});
const batch = (students: any[]): BatchReadiness => ({
  generated_at: now.toISOString(),
  companies: [],
  students,
  segments: {
    not_started: students.filter((s) => s.segment === 'not_started').length,
    at_risk: students.filter((s) => s.segment === 'at_risk').length,
    in_progress: students.filter((s) => s.segment === 'in_progress').length,
    ready: students.filter((s) => s.segment === 'ready').length,
  },
});

const b = batch([
  student('R1', 'at_risk', day(20)),
  student('R2', 'at_risk', day(30)),
  student('R3', 'at_risk', day(2), 40),
  student('R4', 'not_started', null, null),
  student('R5', 'ready', day(1), 80),
]);

const alerts = buildTpoAlerts(b, [
  { drive_id: 'd1', title: 'Infosys mock', status: 'published', registration_closes_at: new Date(now.getTime() + 20 * 3_600_000).toISOString(), starts_at: null },
  { drive_id: 'd2', title: 'Draft drive', status: 'draft', registration_closes_at: new Date(now.getTime() + 3_600_000).toISOString(), starts_at: null },
  { drive_id: 'd3', title: 'TCS mock', status: 'live', registration_closes_at: null, starts_at: new Date(now.getTime() + 30 * 3_600_000).toISOString() },
], now);

const byId = (id: string) => alerts.find((a) => a.id === id);
check('quiet students: 2, past 14 days', byId('inactive')?.count === 2, JSON.stringify(byId('inactive')));
check('quiet list uses the given labels', JSON.stringify(byId('inactive')?.examples) === '["R1","R2"]');
check('quiet students point at a nudge, not a direct message', byId('inactive')?.href === '/tpo/nudges?segment=at_risk');
check('low readiness counts only active students', byId('low_readiness')?.count === 1);
check('not started is counted', byId('not_started')?.count === 1);
check('a ready student never appears', !alerts.some((a) => a.examples.includes('R5')));
check('registration closing within a day is urgent', byId('reg:d1')?.level === 'urgent');
check('draft drives are ignored', !byId('reg:d2'));
check('a drive starting soon is listed', !!byId('start:d3'));
check('urgent alerts come first', alerts[0].level === 'urgent');
check('nothing to say → no alerts', buildTpoAlerts(batch([student('R9', 'ready', day(1), 90)]), [], now).length === 0);

console.log(`\ntpo-alerts: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
