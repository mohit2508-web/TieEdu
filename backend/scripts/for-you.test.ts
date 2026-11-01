/**
 * Personalisation (lib/forYou) — PROFESSIONAL_PLATFORM_PLAN §3.
 */
import { buildForYou, interestScores, recordInterest } from '../src/lib/forYou';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, note = '') {
  if (cond) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name} ${note}`); }
}

const now = new Date('2026-11-01T06:00:00Z'); // academic year 2026-27: final year graduates 2027
const course = (slug: string, bucket: string, extra: any = {}) => ({
  id: slug, slug, title: slug.replace(/-/g, ' '), subtitle: '', category: 'Computer Science', level: 'beginner',
  is_free: true, published: true, bucket, branch: 'cse', tags: [], modules: [], ...extra,
});
const db: any = {
  courses: [
    course('year-one-maths', 'A'),
    course('career-aptitude', 'D', { title: 'Aptitude and Reasoning', level: 'intermediate' }),
    course('python-programming', 'B', { title: 'Python Programming' }),
    course('ml-fundamentals', 'C', { title: 'Machine Learning Fundamentals', category: 'AI & Data Science', branch: 'ai-ds' }),
    course('hidden', 'A', { published: false }),
  ],
  companies: [
    { slug: 'infosys-systems-engineer', name: 'Infosys SE', status: 'published', logo_url: '' },
    { slug: 'tcs-nqt', name: 'TCS NQT', status: 'published', logo_url: '' },
  ],
  users: [],
  progress: [],
  enrollments: [],
};

// recordInterest
const u: any = { id: 'u1' };
check('a view is recorded', recordInterest(u, 'course', 'python-programming', now));
check('the same view within 10 min counts once', !recordInterest(u, 'course', 'python-programming', new Date(now.getTime() + 60_000)));
check('bad slugs are refused', !recordInterest(u, 'course', '../etc', now) && !recordInterest(u, 'blog' as any, 'x', now));

// decay
const s = interestScores([{ kind: 'course', slug: 'x', at: new Date(now.getTime() - 30 * 86_400_000).toISOString() }], 'course', now);
check('a view 30 days old weighs half', Math.abs((s.get('x') || 0) - 0.5) < 0.01);

// stage
const first = buildForYou(db, { id: 'f', grad_year: 2030 }, now);
const final = buildForYou(db, { id: 'p', grad_year: 2027 }, now);
check('1st year is foundation stage', first.stage === 'foundation');
check('1st year sees no company picks', first.show_companies === false && first.companies.length === 0);
check('1st year: Year-1 course ranks above Career', first.courses.findIndex((c) => c.slug === 'year-one-maths') < first.courses.findIndex((c) => c.slug === 'career-aptitude'));
check('final year: Career ranks above Year-1', final.courses.findIndex((c) => c.slug === 'career-aptitude') < final.courses.findIndex((c) => c.slug === 'year-one-maths'));
check('unpublished courses never appear', !first.courses.some((c) => c.slug === 'hidden'));

// interests + branch
const ai = buildForYou(db, { id: 'a', grad_year: 2028, interests: ['ai'], branch: 'cse' }, now);
check('an AI interest lifts the ML course to the top', ai.courses[0]?.slug === 'ml-fundamentals', JSON.stringify(ai.courses.map((c) => c.slug)));
check('and says why', ai.courses[0]?.reason === 'Matches what you want to learn');

// companies for final years: target first, then viewed
const fy: any = { id: 'y', grad_year: 2027, target_company: 'infosys-systems-engineer' };
recordInterest(fy, 'company', 'tcs-nqt', now);
const fyv = buildForYou(db, fy, now);
check('final year: target company first', fyv.companies[0]?.slug === 'infosys-systems-engineer');
check('then the company they viewed', fyv.companies[1]?.slug === 'tcs-nqt' && fyv.companies[1]?.reason === 'You looked at this');
check('recently viewed lists the company', fyv.recent[0]?.href === '/company/tcs-nqt');

console.log(`\nfor-you: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
