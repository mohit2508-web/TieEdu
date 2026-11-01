import { stageFor, type Stage } from './today';
import { completionState } from './courses';
import { withCourseDimensions } from '../data/db';

/**
 * "Show each student what fits them" (PROFESSIONAL_PLATFORM_PLAN §3).
 *
 * Two inputs: what the student TOLD us (year, branch, interests — onboarding)
 * and what they LOOKED AT (course and company pages, decaying over ~30 days so
 * old curiosity fades). One rule on top: company prep is for 3rd year and up;
 * a first- or second-year is pointed at foundations instead. Nothing is ever
 * blocked — this only decides what is shown first.
 */
export type InterestKind = 'course' | 'company';
export interface InterestEvent { kind: InterestKind; slug: string; at: string }

const MAX_EVENTS = 100;
const HALF_LIFE_DAYS = 30;

/** Record a page view on the user. Repeat views within 10 minutes count once. */
export function recordInterest(user: any, kind: InterestKind, slug: string, now = new Date()): boolean {
  if (!user || !['course', 'company'].includes(kind) || !/^[a-z0-9-]{1,80}$/i.test(slug)) return false;
  const list: InterestEvent[] = Array.isArray(user.interest_events) ? user.interest_events : [];
  const last = list[list.length - 1];
  if (last && last.kind === kind && last.slug === slug && now.getTime() - Date.parse(last.at) < 10 * 60_000) return false;
  list.push({ kind, slug, at: now.toISOString() });
  user.interest_events = list.slice(-MAX_EVENTS);
  return true;
}

/** Decayed weight per slug: one view today = 1, a month ago = 0.5. */
export function interestScores(events: InterestEvent[] = [], kind: InterestKind, now = new Date()): Map<string, number> {
  const out = new Map<string, number>();
  for (const e of events) {
    if (e.kind !== kind) continue;
    const ageDays = Math.max(0, (now.getTime() - Date.parse(e.at)) / 86_400_000);
    out.set(e.slug, (out.get(e.slug) || 0) + Math.pow(0.5, ageDays / HALF_LIFE_DAYS));
  }
  return out;
}

/** Words in a course that answer each onboarding interest. */
const INTEREST_MATCH: Record<string, RegExp> = {
  coding: /\b(python|c programming|java|coding|programming|javascript|web dev)/i,
  dsa: /\b(dsa|data structures?|algorithms?)\b/i,
  aptitude: /\b(aptitude|reasoning|quant)/i,
  semester: /\b(semester|exam prep|engineering maths|digital electronics|electrical|fluid|dbms|operating systems|computer networks)/i,
  ai: /\b(ai|machine learning|deep learning|genai|prompt|llm|neural)\b/i,
  interview: /\binterview/i,
  english: /\b(english|communication|speaking)/i,
  placements: /\b(placement|career|resume|aptitude|interview)/i,
  company: /\b(placement|aptitude|interview)/i,
};

/** Which course buckets suit each stage (A Year-1, B Branch core, C Tools, D Career, E Micro). */
const STAGE_BUCKET: Record<Stage, Record<string, number>> = {
  foundation: { a: 3, b: 2, e: 2, c: 1, d: 0 },
  internship: { b: 2, c: 3, d: 2, e: 1, a: 0 },
  placement: { d: 3, c: 2, b: 1, e: 1, a: 0 },
};

const BRANCH_TO_COURSE: Record<string, string[]> = {
  cse: ['cse', 'ai-ds'], it: ['cse', 'ai-ds'], ece: ['ece'], eee: ['eee', 'ece'], mech: ['mech'], civil: ['civil'], other: [],
};

export function scoreCourse(course: any, ctx: { stage: Stage | null; branch?: string | null; interests: string[]; viewedCategories: Map<string, number> }): number {
  const c = withCourseDimensions({ ...course });
  const text = `${c.title} ${c.subtitle || ''} ${c.category || ''} ${(c.tags || []).join(' ')}`;
  let s = 0;
  if (ctx.stage) s += STAGE_BUCKET[ctx.stage][String(c.bucket || '').toLowerCase()] ?? 0;
  if (ctx.stage === 'foundation' && c.level === 'beginner') s += 1;
  if (ctx.stage === 'placement' && c.level === 'beginner') s -= 1;
  if (ctx.branch && (BRANCH_TO_COURSE[ctx.branch] || []).includes(String(c.branch))) s += 1.5;
  for (const i of ctx.interests) if (INTEREST_MATCH[i]?.test(text)) s += 2;
  s += Math.min(2, ctx.viewedCategories.get(String(c.category)) || 0);
  if (c.is_free) s += 0.25; // a nudge, not a rule: free is easier to start
  return s;
}

export interface ForYouView {
  stage: Stage | null;
  /** False for first/second years: company prep is shown later in the route. */
  show_companies: boolean;
  recent: Array<{ kind: InterestKind; slug: string; title: string; href: string }>;
  courses: Array<{ slug: string; title: string; subtitle: string; category: string; is_free: boolean; reason: string }>;
  companies: Array<{ slug: string; name: string; logo_url: string; reason: string }>;
}

export function buildForYou(db: any, user: any, now = new Date()): ForYouView {
  const stage = stageFor(user?.grad_year, now);
  const events: InterestEvent[] = Array.isArray(user?.interest_events) ? user.interest_events : [];
  const courses = (db.courses || []).filter((c: any) => c.published);
  const companies = (db.companies || []).filter((c: any) => c.status === 'published');
  const courseBySlug = new Map<string, any>(courses.map((c: any) => [c.slug, c]));
  const companyBySlug = new Map<string, any>(companies.map((c: any) => [c.slug, c]));

  // Recently viewed, newest first, distinct, only things that still exist.
  const seen = new Set<string>();
  const recent: ForYouView['recent'] = [];
  for (let i = events.length - 1; i >= 0 && recent.length < 6; i--) {
    const e = events[i];
    const key = `${e.kind}:${e.slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (e.kind === 'course' && courseBySlug.has(e.slug)) {
      recent.push({ kind: 'course', slug: e.slug, title: courseBySlug.get(e.slug).title, href: `/courses/${e.slug}` });
    } else if (e.kind === 'company' && companyBySlug.has(e.slug)) {
      recent.push({ kind: 'company', slug: e.slug, title: companyBySlug.get(e.slug).name, href: `/company/${e.slug}` });
    }
  }

  // Course recommendations: stage + branch + interests + what they looked at,
  // minus anything they already finished or are taking.
  const viewedCourses = interestScores(events, 'course', now);
  const viewedCategories = new Map<string, number>();
  for (const [slug, w] of viewedCourses) {
    const cat = courseBySlug.get(slug)?.category;
    if (cat) viewedCategories.set(cat, (viewedCategories.get(cat) || 0) + w);
  }
  const interests: string[] = Array.isArray(user?.interests) ? user.interests : [];
  const ctx = { stage, branch: user?.branch, interests, viewedCategories };
  const ranked = courses
    .filter((c: any) => !(user?.id && completionState(db, user.id, c).enrolled))
    .map((c: any) => ({ c, s: scoreCourse(c, ctx) }))
    .sort((a: any, b: any) => b.s - a.s || String(a.c.title).localeCompare(String(b.c.title)))
    .slice(0, 6);
  const stageWord = stage === 'foundation' ? 'your year' : stage === 'internship' ? '3rd year' : stage === 'placement' ? 'placement season' : null;
  const out: ForYouView['courses'] = ranked.map(({ c }: any) => {
    const hit = interests.find((i) => INTEREST_MATCH[i]?.test(`${c.title} ${c.subtitle || ''} ${(c.tags || []).join(' ')}`));
    const reason = hit ? 'Matches what you want to learn' : viewedCategories.has(c.category) ? `Because you looked at ${c.category}` : stageWord ? `Picked for ${stageWord}` : 'Popular to start with';
    return { slug: c.slug, title: c.title, subtitle: c.subtitle || '', category: c.category || '', is_free: !!c.is_free, reason };
  });

  // Companies only from 3rd year: target first, then most-viewed.
  const showCompanies = stage !== 'foundation';
  let companyOut: ForYouView['companies'] = [];
  if (showCompanies) {
    const viewed = interestScores(events, 'company', now);
    const picks: Array<{ slug: string; reason: string; w: number }> = [];
    if (user?.target_company && companyBySlug.has(user.target_company)) picks.push({ slug: user.target_company, reason: 'Your target company', w: Infinity });
    for (const [slug, w] of viewed) if (companyBySlug.has(slug) && slug !== user?.target_company) picks.push({ slug, reason: 'You looked at this', w });
    companyOut = picks
      .sort((a, b) => b.w - a.w)
      .slice(0, 6)
      .map((p) => {
        const c = companyBySlug.get(p.slug);
        return { slug: p.slug, name: c.name, logo_url: c.logo_url || '', reason: p.reason };
      });
  }

  return { stage, show_companies: showCompanies, recent, courses: out, companies: companyOut };
}
