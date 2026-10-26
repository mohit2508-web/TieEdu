/**
 * The countdown calendar and a day-by-day plan to a company's test date.
 *
 * Students set a test date per company on its page (company_prep_profiles).
 * This gathers every upcoming date into one calendar and, for each, writes a
 * plan from the company's real rounds: read the round's modules, then test it,
 * weakest round first, with the last day kept for revision and the test day
 * for drive-day mode.
 *
 * It is a pure function of (today, test date, rounds, scores), recomputed on
 * every read, so it adapts by itself: take a skill test and tomorrow's plan
 * already reflects the new score. Nothing is stored except the date.
 */
import { addDays, dayDiff, istDate } from './streak';
import { computeTrack, profilesOf } from './companyPageStudent';
import { studentPage } from './companyPageDerive';

export type PlanTaskKind = 'train' | 'test' | 'revise' | 'drive' | 'daily';
export interface PlanTask {
  kind: PlanTaskKind;
  title: string;
  href: string;
}
export interface PlanDay {
  date: string;
  days_left: number;
  tasks: PlanTask[];
}

/** How far ahead a plan is written out. The plan is recomputed daily anyway. */
export const PLAN_HORIZON = 21;

const DAILY_TASK: PlanTask = { kind: 'daily', title: 'Today’s 10-minute challenge', href: '/daily' };

interface Round {
  id: string;
  title: string;
  moduleIds: string[];
  testHref: string;
  score: number | null;
  weakTopics: string[];
}

function roundsFor(db: any, userId: string, company: any): Round[] {
  const hit = studentPage(db, company);
  if (!hit) return [];
  const section = hit.page.sections.find((s: any) => s.type === 'rounds_route' && s.visible);
  const stations: any[] = (section?.data?.stations as any[]) || [];
  const track = computeTrack(db, userId, hit.page);
  const byId = new Map(track.stations.map((t) => [t.station_id, t]));
  return stations.map((st: any, i: number) => {
    const t = byId.get(st.id);
    return {
      id: String(st.id ?? i),
      title: String(st.title || `Round ${i + 1}`),
      moduleIds: ((st.module_ids as string[]) || []).map(String),
      testHref: String(st.test_href || ''),
      score: t?.score ?? null,
      weakTopics: (t?.weak_topics || []).map((w) => w.name),
    };
  });
}

/**
 * Rounds in the order they should be worked: never-tested rounds first (a
 * baseline is worth more than polish), then weakest score first.
 */
export function workOrder(rounds: Round[]): Round[] {
  return [...rounds].sort((a, b) => {
    if (a.score === null && b.score !== null) return -1;
    if (b.score === null && a.score !== null) return 1;
    return (a.score ?? 0) - (b.score ?? 0);
  });
}

/** The per-round steps, in order: read it, then test it (a baseline test comes first if never tested). */
function stepsFor(slug: string, r: Round): PlanTask[] {
  const read: PlanTask[] = r.moduleIds.length
    ? [{ kind: 'train', title: `Read: ${r.title}`, href: `/company/${slug}?m=${encodeURIComponent(r.moduleIds[0])}` }]
    : [];
  const test: PlanTask[] = r.testHref ? [{ kind: 'test', title: `Test yourself: ${r.title}`, href: r.testHref }] : [];
  return r.score === null ? [...test, ...read] : [...read, ...test];
}

export function buildPlan(slug: string, companyName: string, rounds: Round[], today: string, testDate: string): PlanDay[] {
  const total = dayDiff(today, testDate);
  if (total < 0) return [];
  const steps = workOrder(rounds).flatMap((r) => stepsFor(slug, r));
  const weak = rounds.flatMap((r) => r.weakTopics).slice(0, 3);
  const days: PlanDay[] = [];
  let next = 0;
  for (let i = 0; i <= Math.min(total, PLAN_HORIZON); i++) {
    const date = addDays(today, i);
    const left = total - i;
    let tasks: PlanTask[];
    if (left === 0) {
      tasks = [{ kind: 'drive', title: `${companyName} test day — open drive-day mode`, href: `/drive-day?company=${encodeURIComponent(slug)}` }];
    } else if (left === 1) {
      tasks = [
        { kind: 'revise', title: weak.length ? `Revise your weak topics: ${weak.join(', ')}` : `Revise ${companyName}’s rounds once more`, href: `/company/${slug}` },
        { kind: 'drive', title: 'Check your drive-day list', href: `/drive-day?company=${encodeURIComponent(slug)}` },
      ];
    } else {
      // Cycle through the round steps; with no rounds recorded, the company page is the plan.
      tasks = steps.length ? [steps[next++ % steps.length]] : [{ kind: 'train', title: `Work through ${companyName}’s prep pack`, href: `/company/${slug}` }];
      tasks.push(DAILY_TASK);
    }
    days.push({ date, days_left: left, tasks });
  }
  return days;
}

export interface CalendarEntry {
  company: string;
  slug: string;
  date: string;
  days_left: number;
  overall: number | null;
}

/** Every upcoming company test date for a student, soonest first, with a plan for the soonest. */
export function calendarFor(db: any, userId: string, now = new Date()) {
  const today = istDate(now);
  const companies = new Map<string, any>((db.companies || []).map((c: any) => [c.id, c]));
  const entries: Array<CalendarEntry & { company_obj: any }> = [];
  for (const p of profilesOf(db)) {
    if (p.user_id !== userId || !p.test_date || p.test_date < today) continue;
    const c = companies.get(p.company_id);
    if (!c || c.status !== 'published') continue;
    const rounds = roundsFor(db, userId, c);
    const scored = rounds.filter((r) => r.score !== null);
    entries.push({
      company: c.name,
      slug: c.slug,
      date: p.test_date,
      days_left: dayDiff(today, p.test_date),
      overall: scored.length ? Math.round(scored.reduce((s, r) => s + (r.score as number), 0) / scored.length) : null,
      company_obj: c,
    });
  }
  entries.sort((a, b) => a.days_left - b.days_left || a.company.localeCompare(b.company));
  const first = entries[0];
  return {
    today,
    entries: entries.map(({ company_obj, ...e }) => e),
    plan: first
      ? { company: first.company, slug: first.slug, date: first.date, days: buildPlan(first.slug, first.company, roundsFor(db, userId, first.company_obj), today, first.date) }
      : null,
  };
}
