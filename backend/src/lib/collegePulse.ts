/**
 * "From your college" on Today (F1): how many students of the student's own
 * college practised today or this week.
 *
 * The rule (set by the platform owner): no number unless at least PULSE_MIN
 * students are in it. "14 practised today" needs 14 ≥ PULSE_MIN; when today is
 * too small, this week is tried; when both are, the line carries no number at
 * all. The student themself is counted like anyone else, and nobody is named.
 */
import { addDays, istDate, streaksOf } from './streak';

export const PULSE_MIN = 10;

export interface CollegePulse { college: string; kind: 'today' | 'week' | 'none'; count: number | null; text: string }

export function collegePulse(db: any, collegeName: string, rosterIds: string[], now = new Date()): CollegePulse {
  const today = istDate(now);
  const since = addDays(today, -6);
  const ids = new Set(rosterIds);
  let todayN = 0;
  let weekN = 0;
  for (const s of streaksOf(db)) {
    if (!ids.has(s.user_id)) continue;
    const days = s.days || [];
    if (days.includes(today) || s.last_day === today) todayN++;
    if (days.some((d) => d >= since && d <= today) || (s.last_day && s.last_day >= since)) weekN++;
  }
  if (todayN >= PULSE_MIN) return { college: collegeName, kind: 'today', count: todayN, text: `${todayN} students from ${collegeName} practised today.` };
  if (weekN >= PULSE_MIN) return { college: collegeName, kind: 'week', count: weekN, text: `${weekN} students from ${collegeName} practised this week.` };
  return { college: collegeName, kind: 'none', count: null, text: `Practise with your batchmates from ${collegeName}.` };
}
