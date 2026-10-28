/**
 * Rejection debrief (B7). A student logs a rejection in two minutes — company,
 * the round they reached, what went wrong, a private note — and gets back a
 * recovery plan and, when enough students have logged the same company, an
 * honest "you are not alone".
 *
 * Privacy rules:
 *  - The note is the student's own. It is returned only to them and never
 *    enters any aggregate.
 *  - Peer counts appear only when at least PEER_MIN distinct students have
 *    logged that company, so no single student can be inferred. Below that we
 *    say nothing numeric rather than invent a reassuring statistic.
 */
import crypto from 'crypto';
import { studentPage } from './companyPageDerive';

export const DEBRIEF_REASONS = ['aptitude', 'coding', 'technical', 'communication', 'nerves', 'eligibility', 'unknown'] as const;
export type DebriefReason = (typeof DEBRIEF_REASONS)[number];

export const REASON_LABEL: Record<DebriefReason, string> = {
  aptitude: 'Aptitude or online test',
  coding: 'Coding problems',
  technical: 'Technical questions',
  communication: 'HR or communication',
  nerves: 'Nerves or time pressure',
  eligibility: 'Cut-off or eligibility',
  unknown: 'Not sure what went wrong',
};

export const ROUNDS = ['Online assessment', 'Group discussion', 'Technical interview', 'HR interview', 'Final round'] as const;

/** Minimum distinct students before any peer number is shown. */
export const PEER_MIN = 5;
export const NOTE_MAX = 1000;

export interface Debrief {
  id: string;
  user_id: string;
  company_id: string;
  round: string;
  reasons: DebriefReason[];
  note: string;
  created_at: string;
}

export function debriefsOf(db: any): Debrief[] {
  if (!Array.isArray(db.rejection_debriefs)) db.rejection_debriefs = [];
  return db.rejection_debriefs;
}

export class DebriefError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function createDebrief(db: any, userId: string, input: any, now = new Date()): Debrief {
  const company = (db.companies || []).find((c: any) => c.slug === String(input?.company_slug || '') && c.status === 'published');
  if (!company) throw new DebriefError(400, 'Choose the company.');
  const round = String(input?.round || '').trim();
  if (!round || round.length > 80) throw new DebriefError(400, 'Choose the round you reached.');
  const reasons = Array.from(new Set(((input?.reasons as unknown[]) || []).map(String))).filter((r): r is DebriefReason => (DEBRIEF_REASONS as readonly string[]).includes(r));
  if (reasons.length === 0) throw new DebriefError(400, 'Pick at least one thing that went wrong — "Not sure" is fine.');
  const note = String(input?.note || '').slice(0, NOTE_MAX);
  const d: Debrief = { id: `dbf-${crypto.randomBytes(6).toString('hex')}`, user_id: userId, company_id: company.id, round, reasons, note, created_at: now.toISOString() };
  debriefsOf(db).push(d);
  return d;
}

export function deleteDebrief(db: any, userId: string, id: string): boolean {
  const list = debriefsOf(db);
  const i = list.findIndex((d) => d.id === id && d.user_id === userId);
  if (i === -1) return false;
  list.splice(i, 1);
  return true;
}

export interface RecoveryStep { title: string; why: string; href: string }

/** The company's rounds (title + first module + test link), for linking the plan into them. */
function stationsFor(db: any, company: any): Array<{ title: string; moduleId: string | null; testHref: string }> {
  const hit = studentPage(db, company);
  const sec: any = hit?.page.sections.find((s: any) => s.type === 'rounds_route' && s.visible);
  return ((sec?.data?.stations as any[]) || []).map((st: any) => ({ title: String(st.title || ''), moduleId: (st.module_ids || [])[0] || null, testHref: String(st.test_href || '') }));
}

/** The first round matching the patterns in priority order (so "coding" prefers a technical round over the online test). */
const findStation = (stations: ReturnType<typeof stationsFor>, words: RegExp[]) => {
  for (const w of words) {
    const hit = stations.find((s) => w.test(s.title));
    if (hit) return hit;
  }
  return undefined;
};

/** Turn what went wrong into three to five concrete next steps, using the company's own rounds where it has them. */
export function recoveryPlan(db: any, d: Debrief): RecoveryStep[] {
  const company = (db.companies || []).find((c: any) => c.id === d.company_id);
  const slug = company?.slug || '';
  const stations = company ? stationsFor(db, company) : [];
  const roundLink = (words: RegExp[], fallbackTest: string) => {
    const st = findStation(stations, words);
    return {
      read: st?.moduleId ? `/company/${slug}?m=${encodeURIComponent(st.moduleId)}` : `/company/${slug}`,
      test: st?.testHref || fallbackTest,
      name: st?.title || null,
    };
  };
  const steps: RecoveryStep[] = [];
  const add = (s: RecoveryStep) => { if (!steps.some((x) => x.href === s.href)) steps.push(s); };

  for (const r of d.reasons) {
    if (r === 'aptitude') {
      const l = roundLink([/aptitude/i, /online|assessment|\boa\b/i], '/skill-test');
      add({ title: 'Find your weak aptitude topics', why: 'A skill test shows exactly which topics cost you marks, so practice goes where it counts.', href: l.test });
      add({ title: 'Do the daily challenge for two weeks', why: 'One aptitude question a day builds speed under time pressure without burning you out.', href: '/daily' });
    }
    if (r === 'coding') {
      const l = roundLink([/coding|dsa/i, /technical/i, /online|assessment/i], '/skill-test/dsa');
      add({ title: 'Test yourself on data structures', why: 'Most coding rounds draw on arrays, strings, hashing and recursion. The test shows which ones to drill.', href: l.test });
      if (slug) add({ title: `Read ${l.name || company?.name + '’s coding round'}`, why: 'The questions this company actually asks, with worked answers.', href: l.read });
    }
    if (r === 'technical') {
      const l = roundLink([/technical/i, /\br1\b|interview/i], '/skill-test');
      if (slug) add({ title: `Re-read ${l.name || 'the technical round'}`, why: 'Interviewers repeat topics across years. Go through the round’s questions until you can answer them out loud.', href: l.read });
      add({ title: 'Brush up your core subjects', why: 'OOP, DBMS, OS and networks come up in almost every technical interview.', href: '/courses' });
      add({ title: 'Do a mock technical interview', why: 'Explaining a concept out loud is a different skill from knowing it. Practise it here first.', href: '/mock-interview' });
    }
    if (r === 'communication') {
      add({ title: 'Practise the HR questions', why: 'Fifty common HR questions with model answers and the traps to avoid.', href: '/interview-course' });
      add({ title: 'Do a mock HR interview', why: 'Answer five questions as you would in the room and get feedback on each answer.', href: '/mock-interview' });
      add({ title: 'Practise speaking with the English coach', why: 'Half a minute out loud, with gentle tips on fillers, pace and phrasing — explained in Hinglish too.', href: '/english-coach' });
      add({ title: 'Answer one HR question a day', why: 'The daily challenge includes an HR question; saying it out loud is the practice.', href: '/daily' });
    }
    if (r === 'nerves') {
      add({ title: 'Sit a full mock drive', why: 'The second real-feeling attempt is far calmer than the first. Do it here, not at the next company.', href: '/mock-drive' });
      add({ title: 'Use drive-day mode next time', why: 'A checklist, a 15-minute revision and a one-minute breathing exercise for the day itself.', href: '/drive-day' });
    }
    if (r === 'eligibility') {
      add({ title: 'See companies you are eligible for', why: 'Cut-offs differ a lot. Put your effort where your profile already clears the bar.', href: '/companies' });
      add({ title: 'Plan your next test dates', why: 'Line up the next two or three companies so one result never decides everything.', href: '/calendar' });
    }
    if (r === 'unknown') {
      if (slug) add({ title: `Take ${company?.name}’s round tests`, why: 'Without feedback, your scores per round are the honest answer to what went wrong.', href: `/company/${slug}` });
      add({ title: 'Start the daily challenge', why: 'A little every day across aptitude, coding and HR covers the usual weak spots.', href: '/daily' });
    }
  }
  if (!steps.some((s) => s.href === '/calendar')) {
    add({ title: 'Put the next company on your calendar', why: 'A date gives you a day-by-day plan, and a next step makes this one easier to let go.', href: '/calendar' });
  }
  return steps.slice(0, 5);
}

/** Aggregate, k-anonymous view of a company's debriefs. Null when too few students to show safely. */
export function peerView(db: any, companyId: string) {
  const forCompany = debriefsOf(db).filter((d) => d.company_id === companyId);
  const students = new Set(forCompany.map((d) => d.user_id));
  if (students.size < PEER_MIN) return null;
  const counts = new Map<DebriefReason, number>();
  for (const d of forCompany) for (const r of d.reasons) counts.set(r, (counts.get(r) || 0) + 1);
  const top = [...counts.entries()].filter(([r]) => r !== 'unknown').sort((a, b) => b[1] - a[1])[0];
  return { students: students.size, top_reason: top ? REASON_LABEL[top[0]] : null };
}

export function debriefView(db: any, d: Debrief) {
  const company = (db.companies || []).find((c: any) => c.id === d.company_id);
  return {
    id: d.id,
    company: company?.name || 'Company',
    slug: company?.slug || '',
    round: d.round,
    reasons: d.reasons.map((r) => REASON_LABEL[r]),
    note: d.note,
    created_at: d.created_at,
    plan: recoveryPlan(db, d),
    peers: peerView(db, d.company_id),
  };
}

export function myDebriefs(db: any, userId: string) {
  return debriefsOf(db)
    .filter((d) => d.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((d) => debriefView(db, d));
}
