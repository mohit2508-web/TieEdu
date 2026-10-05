/**
 * Seed the drops feed with ~100 editorial cards tied to what this install
 * actually runs: the ten company vaults, the four courses, the skill-test
 * bank, campus/GLA events and TieEdu's own features.
 *
 *   cd backend && npx ts-node --transpile-only scripts/seed-drops.ts
 *
 * Every row is shaped through `validateDropInput` - the same gate the admin
 * API uses - so a seed can never put a card in the feed that a human could
 * not have created by hand. Headlines are held to the interface's 40-100
 * range (the validator only enforces >= 10) and every CTA points at a route
 * that exists in this app.
 *
 * The window split is the point: 30 live fills the feed's entire card budget
 * right now, 10 scheduled give the scheduler something to flip, 20 recently
 * expired show how a window ends without losing stats, 30 archived prove the
 * retention story, and 10 drafts sit in the console as unpublished work.
 * Live is capped at exactly 30 on purpose - the next admin write should hit
 * the editorial cap like it is supposed to.
 *
 * Idempotent: replaces only the rows it owns (`drop-seed-*`), leaving any
 * real drops alone. Timestamps are derived from "now", so re-running refreshes
 * the windows instead of letting them drift.
 */
import { Drop, DropStatus, DropType, loadDb, saveDb } from '../src/data/db';
import { validateDropInput } from '../src/lib/drops';
import { pushAudit } from '../src/lib/audit';

interface Spec {
  /** Drop type - one of the twelve the feed filters on. */
  t: DropType;
  /** Headline, 40-100 chars. */
  h: string;
  /** 1-3 bullets, each <= 120 chars. */
  b: string[];
  /** Internal route; must exist as a page. */
  r: string;
  /** Real company/course slug from this install. */
  slug?: string;
  /** Deadline offset in days relative to now (negative = passed). */
  dl?: number;
  /** Extra markdown for the Read More sheet. */
  body?: string;
  /** College audience, e.g. GLA-specific cards. */
  college?: string;
  pin?: boolean;
  pri?: 0 | 1 | 2;
}

const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();

// ============================================================================
// LIVE - the 30-card feed window as it stands right now
// ============================================================================
const LIVE: Spec[] = [
  { t: 'company', pin: true, pri: 2, h: 'Zscaler is hiring security engineers, 2026 grads can apply now', r: '/company/zscaler', slug: 'zscaler', b: ['Zero-trust team, 4 rounds, 14-day process', 'Off-campus applications are open this week'] },
  { t: 'vault', h: 'New: Zscaler interview vault now has real OA questions', r: '/company/zscaler', slug: 'zscaler', b: ['Round-wise questions from recent attempts', 'Networking MCQs with marked answers'] },
  { t: 'course', h: 'Python Programming course: from your first script to packages', r: '/courses/python-programming', slug: 'python-programming', b: ['New lesson: testing with pytest just went live', 'Free for every TieEdu learner'] },
  { t: 'deadline', pri: 1, dl: 6, h: 'GLA campus placement registrations close this Friday', r: '/campus', b: ['Register before 6 PM to stay eligible', 'Aptitude round happens on campus next week'], college: 'GLA University Mathura' },
  { t: 'job', h: 'TCS off-campus drive 2026: applications open for B.Tech', r: '/company/tcs', slug: 'tcs', b: ['Ninja and Digital profiles are hiring', 'Apply before the window closes'] },
  { t: 'skilltest', h: 'Java Programming skill test is live: 40 questions, 45 minutes', r: '/skill-test', b: ['Instant score with topic-level breakdown', 'Certificate on clearing the cut-off'] },
  { t: 'selected', h: 'Amazon SDE-1 offer for a 2025 grad, four rounds, no round one', r: '/company/amazon', slug: 'amazon', b: ['OA, loops and bar raiser, told in order', 'Read the full round-by-round breakdown'] },
  { t: 'tip', h: 'Resume tip: put impact numbers on it, not just job duties', r: '/', b: ['Numbers beat adjectives on every resume', 'Two projects with outcomes is plenty'], body: 'One line that says "cut API latency 40%" beats three lines of responsibilities.\n\n- Pick your last two projects\n- Attach one measurable outcome to each\n- Keep it to a page until you have five years of experience' },
  { t: 'tieedu', h: 'Skill Passport is live: one page for every skill you prove', r: '/skill-test/skill-passport', b: ['Badges, certificates and scores in one link', 'Share it with recruiters directly'] },
  { t: 'contest', h: 'Weekly coding challenge #42 closes Sunday, top 10 on leaderboard', r: '/skill-test', b: ['Two problems, ninety minutes', 'Top ten earn the weekly badge'] },
  { t: 'college', h: 'GLA Tech Fest 2026: hackathon registrations are now open', r: '/campus', b: ['Teams of three or four, 24-hour build', 'Winners get TieEdu Plus for a year'], college: 'GLA University Mathura' },
  { t: 'scholarship', h: 'TieEdu Merit Scholarship: 50% off Plus for top scorers', r: '/', b: ['Two tests this month, percentile 85 or above', 'Applied automatically to your next purchase'], body: 'Based on your skill-test percentile across any two tests.\n\n- Attempt two tests this month\n- Percentile 85 or above qualifies\n- Applied automatically to your next Plus purchase' },
  { t: 'company', h: 'Razorpay is hiring backend engineers from campus this season', r: '/company/razorpay', slug: 'razorpay', b: ['Fintech scale, Go and Node stacks', 'Referrals open for 2026 grads'] },
  { t: 'vault', h: 'New in the Razorpay vault: payment gateway OA patterns', r: '/company/razorpay', slug: 'razorpay', b: ['Recent OA questions, round by round', 'System design prompts from real interviews'] },
  { t: 'job', h: 'Infosys Specialist Programmer role: off-campus now live', r: '/company/infosys', slug: 'infosys', b: ['500 plus openings with the band disclosed', 'Aptitude and coding rounds, online'] },
  { t: 'course', h: 'Coding Foundations: zero to your first program, free', r: '/courses/coding-foundations', slug: 'coding-foundations', b: ['No experience needed to start', 'Finish with a working project'] },
  { t: 'deadline', pri: 2, dl: 3, h: 'Mock test window closes Sunday, attempt before it locks', r: '/skill-test', b: ['Full-length mock, strictly timed', 'Detailed report right after submission'] },
  { t: 'skilltest', h: 'SQL skill test: joins, window functions, query plans', r: '/skill-test', b: ['Twenty-five questions on real schemas', 'Instant percentile among peers'] },
  { t: 'selected', h: 'Microsoft intern to FTE: how a summer internship converted', r: '/company/microsoft', slug: 'microsoft', b: ['Two projects, one systems round', 'The prep that made it stick'] },
  { t: 'tip', h: 'Tip: solve one timed problem daily before you read solutions', r: '/', b: ['Thirty minutes, clock visible', 'Attempt first, editorial second'], body: 'Reading a solution feels like progress and teaches almost nothing under time pressure.\n\n- Set a 30 minute clock\n- Attempt first, editorial second\n- Log why you got stuck in one line' },
  { t: 'company', h: 'Palo Alto Networks campus hiring opens for the 2026 batch', r: '/company/palo-alto-networks', slug: 'palo-alto-networks', b: ['Network security focus, four rounds', 'Cut-off based shortlisting'] },
  { t: 'job', h: 'Capgemini off-campus: analyst roles for freshers, apply now', r: '/company/capgemini', slug: 'capgemini', b: ['Location options across India', 'Online assessment comes first'] },
  { t: 'course', h: 'C Programming: pointers and data structures, taught slowly', r: '/courses/c-programming', slug: 'c-programming', b: ['New visual lessons on pointers', 'Free and self-paced'] },
  { t: 'deadline', pri: 1, dl: 9, h: 'Razorpay internship applications close in nine days', r: '/company/razorpay', slug: 'razorpay', b: ['Summer internship, paid stipend', 'Apply with your Skill Passport'] },
  { t: 'selected', h: 'From mock interview to Zscaler offer in six weeks', r: '/company/zscaler', slug: 'zscaler', b: ['What changed between attempts', 'The feedback loop that worked'] },
  { t: 'vault', h: 'Microsoft interview vault updated with fresh OA sets', r: '/company/microsoft', slug: 'microsoft', b: ['Recent OAs with tagged difficulty', 'System design and DSA split apart'] },
  { t: 'tieedu', h: 'Every skill test certificate is verifiable, forever', r: '/verify', b: ['Share a serial recruiters can check', 'Free, instant and lifetime valid'] },
  { t: 'skilltest', h: 'DBMS skill test: normalization, indexing, transactions', r: '/skill-test', b: ['Scenario-based questions, not trivia', 'Topic scores show the weak spots'] },
  { t: 'tip', h: 'Tip: narrate your approach out loud before you code', r: '/', b: ['Two sentences before the first line of code', 'Confirm the constraints, then type'], body: 'Interviewers cannot grade what they cannot hear.\n\n- State the approach in two sentences\n- Name the data structure you will reach for\n- Confirm the constraints before writing a line' },
  { t: 'course', h: 'Advanced Data Structures: choosing well under real limits', r: '/courses/advanced-data-structures', slug: 'advanced-data-structures', b: ['Free preview lessons available', 'Taught with production constraints'] },
];

// ============================================================================
// SCHEDULED - ten cards whose publish time the sweep will flip
// ============================================================================
const SOON: Spec[] = [
  { t: 'company', h: 'Google Summer Internship applications open next Monday', r: '/company/google', slug: 'google', b: ['Open to penultimate year students', 'Applications go live Monday morning'] },
  { t: 'job', h: 'Adobe is hiring software engineers, drive opens next week', r: '/company/adobe', slug: 'adobe', b: ['On-site roles, four rounds', 'Register your interest now'] },
  { t: 'deadline', dl: 7, h: 'Adobe application window opens for 2026 graduates', r: '/company/adobe', slug: 'adobe', b: ['Set a reminder before it closes', 'Eligibility: 2026 batch only'] },
  { t: 'vault', h: 'Google vault gets a fresh set of interview experiences', r: '/company/google', slug: 'google', b: ['New stories from 2025 attempts', 'Round structure mapped out'] },
  { t: 'skilltest', h: 'Operating Systems skill test arrives tomorrow morning', r: '/skill-test', b: ['Scheduling, deadlock and memory', 'Attempt any time once it opens'] },
  { t: 'course', h: 'Python course drops a new testing module this week', r: '/courses/python-programming', slug: 'python-programming', b: ['pytest from zero to fixtures', 'Includes a graded assignment'] },
  { t: 'contest', h: 'Debug-a-thon challenge starts Monday, prizes for top 20', r: '/skill-test', b: ['Five broken programs to fix', 'Leaderboard resets at start'] },
  { t: 'selected', h: 'Capgemini selection story: two attempts, one offer', r: '/company/capgemini', slug: 'capgemini', b: ['What the interviewer probed', 'How the second attempt differed'] },
  { t: 'tieedu', h: 'Guided study plans are coming: pick a goal, get a schedule', r: '/study-plan', b: ['Built around your semester', 'Auto-tracks your lesson progress'] },
  { t: 'college', h: 'Drive season starts on your campus next week', r: '/campus', b: ['Pre-registration opens Monday', 'Bring an updated one-page resume'], college: 'GLA University Mathura' },
];

// ============================================================================
// RECENTLY EXPIRED - windows that ended within retention (stats intact)
// ============================================================================
const RECENT: Spec[] = [
  { t: 'company', h: 'TCS digital hiring window closed, next cycle in Q3', r: '/company/tcs', slug: 'tcs', b: ['Applications are no longer accepted', 'Campus cycle resumes later this year'] },
  { t: 'job', h: 'Amazon SDE intern applications are now closed', r: '/company/amazon', slug: 'amazon', b: ['Shortlisting is under way', 'Next window opens with the fall cycle'] },
  { t: 'deadline', dl: -2, h: 'Mock test #12 window has closed, your report is ready', r: '/skill-test', b: ['Attempt the report even if you missed it', 'Next mock opens Sunday'] },
  { t: 'vault', h: 'Adobe vault refreshed with new round-wise questions', r: '/company/adobe', slug: 'adobe', b: ['Twelve new experiences added', 'OA and interview rounds tagged'] },
  { t: 'selected', h: 'Infosys selection: how the technical round really went', r: '/company/infosys', slug: 'infosys', b: ['Questions asked, in order', 'Where candidates lost marks'] },
  { t: 'skilltest', h: "Last week's OS skill test is now closed, results are in", r: '/skill-test', b: ['Percentile released to all attempters', 'Reattempt opens next month'] },
  { t: 'course', h: 'C course marathon weekend: recording is in your course', r: '/courses/c-programming', slug: 'c-programming', b: ['Six hours, trimmed to the essentials', 'Free for enrolled learners'] },
  { t: 'tip', h: 'Tip: revise with spaced repetition, not all-nighters', r: '/', b: ['Review at 1 day, 3 days, 1 week', 'Ten minutes of recall beats an hour of rereading'], body: 'Cramming borrows from tomorrow.\n\n- Review after 1 day, 3 days, 1 week\n- Ten minutes of recall beats an hour of rereading\n- Keep a one-page sheet per subject' },
  { t: 'contest', h: 'Weekly challenge #41 results: 1,200 attempts, 38 clears', r: '/skill-test', b: ['Top ten on the leaderboard', 'Editorial posted with both solutions'] },
  { t: 'scholarship', h: 'Merit scholarship round 1 is closed, round 2 comes soon', r: '/', b: ['Round 1 covered the first 100 seats', 'Round 2 opens with the next test window'], body: 'Round 1 covered the first 100 seats.\n\n- Round 2 opens with the next test window\n- Same percentile rule, same 50% off' },
  { t: 'company', h: 'Capgemini drive concluded, shortlists are out', r: '/company/capgemini', slug: 'capgemini', b: ['Shortlisted students notified by mail', 'Interview slots open this week'] },
  { t: 'deadline', dl: -4, h: 'GLA placement registration deadline has passed', r: '/campus', b: ['Late registrations need a coordinator pass', 'Aptitude hall list is up'], college: 'GLA University Mathura' },
  { t: 'tieedu', h: "Last month's platform update: faster pages, cleaner tabs", r: '/', b: ['Five mobile destinations, one bar', 'Company pages load about twice as fast'], body: 'What shipped:\n\n- Mobile tab bar rebuilt around five destinations\n- Company pages load about twice as fast\n- Offline reading on slow campus wifi' },
  { t: 'college', h: 'Campus connect session with alumni wrapped up, recap inside', r: '/campus', b: ['Five alumni, one honest hour', 'Recording available for a week'], college: 'GLA University Mathura' },
  { t: 'vault', h: 'Infosys vault: new OA questions from October attempts', r: '/company/infosys', slug: 'infosys', b: ['Quant, reasoning and coding split', 'Difficulty tagged per question'] },
  { t: 'selected', h: 'Google offer story: five rounds, three months of prep', r: '/company/google', slug: 'google', b: ['What the interviews actually tested', 'The plan that got the offer'] },
  { t: 'job', h: 'Microsoft campus applications closed, interviews next', r: '/company/microsoft', slug: 'microsoft', b: ['Applications are shut for this cycle', 'Interview invites go out next week'] },
  { t: 'skilltest', h: 'JavaScript skill test weekend window is over', r: '/skill-test', b: ['Results publish within a day', 'Next window is in two weeks'] },
  { t: 'course', h: 'Coding Foundations boot week ended, self-paced again', r: '/courses/coding-foundations', slug: 'coding-foundations', b: ['All recordings are in the course', 'Keep your streak going'] },
  { t: 'company', h: 'Palo Alto referral drive concluded, thanks for applying', r: '/company/palo-alto-networks', slug: 'palo-alto-networks', b: ['Referrals submitted are in review', 'Next drive posts here first'] },
];

// ============================================================================
// ARCHIVED - dead past the 30-day retention window
// ============================================================================
const OLD: Spec[] = [
  { t: 'company', h: 'Razorpay campus cycle wrapped, offers rolled out', r: '/company/razorpay', slug: 'razorpay', b: ['Offers accepted across campuses', 'Next cycle lands in autumn'] },
  { t: 'selected', h: 'Adobe selection story from last season drive', r: '/company/adobe', slug: 'adobe', b: ['Three rounds, one design task', 'What they look for in freshers'] },
  { t: 'vault', h: 'Zscaler vault: first batch of OA questions added', r: '/company/zscaler', slug: 'zscaler', b: ['Forty questions with answers', 'Tagged by topic and difficulty'] },
  { t: 'deadline', dl: -55, h: 'Application window for summer internships has closed', r: '/skill-test', b: ['Window is shut for this season', 'Autumn window opens in September'] },
  { t: 'job', h: 'Infosys Specialist Programmer drive concluded', r: '/company/infosys', slug: 'infosys', b: ['Assessments are being graded', 'Results reach candidates directly'] },
  { t: 'skilltest', h: 'Foundational coding test window is closed', r: '/skill-test', b: ['Attempt history stays in your account', 'Next foundation window is monthly'] },
  { t: 'course', h: 'Python batch #1 finished, 400 learners certified', r: '/courses/python-programming', slug: 'python-programming', b: ['Certificates issued to every finisher', 'Batch two opens with new lessons'] },
  { t: 'contest', h: 'Launch month coding contest: winners announced', r: '/skill-test', b: ['Three winners, twelve honourable mentions', 'Badges are on their profiles'] },
  { t: 'tip', h: 'Tip: keep one full week for mocks before finals', r: '/', b: ['Seven days of full-length papers', 'Write down every wrong answer'], body: 'Mocks last week, chapters before that.\n\n- Seven days of full-length papers\n- Review every wrong answer in writing\n- Sleep beats one more chapter' },
  { t: 'college', h: "Freshers' tech quiz at campus: results inside", r: '/campus', b: ['Sixty teams, tie-breaker round', 'Photos and questions in the recap'], college: 'GLA University Mathura' },
  { t: 'scholarship', h: 'Founding-member discount closed, thank you', r: '/', b: ['Everyone who joined keeps the rate', 'Standard pricing applies from now'], body: 'The founding pricing is retired.\n\n- Everyone who joined keeps the rate\n- Standard pricing applies from now' },
  { t: 'tieedu', h: 'TieEdu launched skill certificates: how they verify', r: '/verify', b: ['Signed, serialised and revocable', 'Recruiters check in one paste'] },
  { t: 'job', h: 'Microsoft explore program applications closed', r: '/company/microsoft', slug: 'microsoft', b: ['First-year students were eligible', 'Opens again next summer'] },
  { t: 'selected', h: 'TCS NQT to offer: the journey of a 2024 grad', r: '/company/tcs', slug: 'tcs', b: ['From mock test to joining letter', 'Timeline, questions and luck'] },
  { t: 'vault', h: 'Google vault opened with 30 plus experiences', r: '/company/google', slug: 'google', b: ['Sorted by role and round', 'Most repeated questions tagged'] },
  { t: 'company', h: 'Amazon hiring spree last quarter: 120 hires', r: '/company/amazon', slug: 'amazon', b: ['Across support and SDE roles', 'Hiring slowed since, watch here'] },
  { t: 'deadline', dl: -62, h: 'National level hackathon application window is shut', r: '/campus', b: ['Registrations closed at midnight', 'Winners showcased on campus'], college: 'GLA University Mathura' },
  { t: 'job', h: 'Adobe fresher drive last season: the recap', r: '/company/adobe', slug: 'adobe', b: ['Two online rounds, one on-site', 'Cut-offs and question themes'] },
  { t: 'vault', h: 'Capgemini vault: interview patterns added', r: '/company/capgemini', slug: 'capgemini', b: ['Pattern by role and experience', 'Sample answers for HR round'] },
  { t: 'skilltest', h: 'SQL basics test window from last month is closed', r: '/skill-test', b: ['Scores remain on your passport', 'Intermediate window is open now'] },
  { t: 'course', h: 'Advanced DS cohort finished: projects showcased', r: '/courses/advanced-data-structures', slug: 'advanced-data-structures', b: ['Nine final projects, all open source', 'Cohort two takes applications soon'] },
  { t: 'contest', h: 'December debug duel: the leaderboard is final', r: '/skill-test', b: ['Winner solved all five in 41 minutes', 'Prizes delivered this week'] },
  { t: 'selected', h: 'Razorpay offer after three rejections: what changed', r: '/company/razorpay', slug: 'razorpay', b: ['Attempt four, offer in hand', 'The pattern across all four tries'] },
  { t: 'company', h: 'Google summer intern cycle concluded, offers are out', r: '/company/google', slug: 'google', b: ['Offers rolled out to selected students', 'Conversion results next year'] },
  { t: 'tip', h: 'Tip: group study for theory, solo work for code', r: '/', b: ['Debate theory in a group', 'Grind problems alone, timed'], body: 'Discussion accelerates understanding, typing accelerates skill.\n\n- Debate theory in a group\n- Grind problems alone, timed\n- Teach one topic back to the group' },
  { t: 'college', h: 'Placement prep workshop at campus ended, recap inside', r: '/campus', b: ['Two hundred students attended', 'Slides and mock recordings shared'], college: 'GLA University Mathura' },
  { t: 'vault', h: 'TCS vault refreshed with the latest NQT patterns', r: '/company/tcs', slug: 'tcs', b: ['Latest NQT pattern by section', 'Cutoffs from recent drives'] },
  { t: 'tieedu', h: 'Old release: homepage and nav redesign shipped', r: '/', b: ['Five mobile destinations, one bar', 'Faster first paint on 3G'], body: 'The shell you use today landed here:\n\n- Five mobile destinations, one bar\n- Denser desktop navigation\n- Faster first paint on 3G' },
  { t: 'job', h: 'Capgemini analyst applications closed last cycle', r: '/company/capgemini', slug: 'capgemini', b: ['Cycle is shut for now', 'Aptitude practice stays free'] },
  { t: 'scholarship', h: 'Early-bird scholarship window closed, merit goes on', r: '/', b: ['Merit rounds continue year round', 'Watch this feed for the next one'], body: 'Early-bird pricing ended with the window.\n\n- Merit-based rounds continue year round\n- Watch this feed for the next one' },
];

// ============================================================================
// DRAFTS - unpublished editorial work sitting in the console
// ============================================================================
const DRAFTS: Spec[] = [
  { t: 'tieedu', h: 'New: weekly skill leaderboard with streak badges', r: '/', b: ['Rank by tests attempted, not just score', 'Streaks reward showing up daily'] },
  { t: 'contest', h: 'Festive hackathon next month: details incoming', r: '/skill-test', b: ['Theme reveal one week before start', 'Solo and team tracks planned'] },
  { t: 'company', h: 'Adobe design engineering roles: publish when open', r: '/company/adobe', slug: 'adobe', b: ['Role confirmed, dates pending', 'Will link the portal the hour it opens'] },
  { t: 'deadline', dl: 60, h: 'Upcoming: certification exam window in December', r: '/skill-test', b: ['Two sittings per candidate', 'Prep path publishes in November'] },
  { t: 'vault', h: 'Amazon vault upgrade: 50 new experiences queued', r: '/company/amazon', slug: 'amazon', b: ['Being anonymised and tagged', 'Goes live once review clears'] },
  { t: 'course', h: 'New course incoming: JavaScript from zero', r: '/courses', b: ['Recording starts next week', 'Free at launch for everyone'] },
  { t: 'college', h: 'Campus ambassador program: launch next month', r: '/campus', b: ['Ten campuses in the first cohort', 'Perks page is being written'], college: 'GLA University Mathura' },
  { t: 'scholarship', h: 'Winter merit scholarship: awaiting approved copy', r: '/', b: ['Percentile based, 50% off Plus', 'Two test windows, fifty seats'], body: 'Holding text for review:\n\n- Percentile based, 50% off Plus\n- Two test windows, fifty seats' },
  { t: 'selected', h: 'Three new selection stories pending review', r: '/company/zscaler', slug: 'zscaler', b: ['From this season attempts', 'Names anonymised before publish'] },
  { t: 'tip', h: 'Tip series: one question a day for thirty days', r: '/', b: ['Week one: arrays and strings', 'Weeks two to four: hashing and graphs'], body: 'Outline for the series:\n\n- Week one: arrays and strings\n- Week two: hashing and sets\n- Weeks three and four: graphs basics' },
];

// ============================================================================
// Window assignment - the same content, placed in time
// ============================================================================
interface Group {
  name: string;
  specs: Spec[];
  status: DropStatus;
  window: (i: number, s: Spec) => { publish_at?: string; expires_at?: string; deadline_at?: string };
}

const GROUPS: Group[] = [
  {
    name: 'live',
    specs: LIVE,
    status: 'published',
    window: (i, s) => ({
      publish_at: iso(Date.now() - (0.3 + (i % 17) * 1.05) * DAY),
      // Deadline cards are bounded by their deadline; the rest expire later.
      expires_at: s.dl ? undefined : iso(Date.now() + (6 + (i * 3) % 22) * DAY),
      deadline_at: s.dl ? iso(Date.now() + s.dl * DAY) : undefined,
    }),
  },
  {
    name: 'scheduled',
    specs: SOON,
    status: 'scheduled',
    window: (i, s) => ({
      publish_at: iso(Date.now() + (1 + (i % 8)) * DAY),
      expires_at: iso(Date.now() + (30 + (i % 30)) * DAY),
      deadline_at: s.dl ? iso(Date.now() + s.dl * DAY) : undefined,
    }),
  },
  {
    name: 'recently-expired',
    specs: RECENT,
    status: 'published',
    window: (i, s) => ({
      // Publish must sit strictly before expiry for validation; 16+ days back
      // against an expiry within the last ~10 days keeps that invariant.
      publish_at: iso(Date.now() - (16 + (i % 15)) * DAY),
      expires_at: s.dl ? undefined : iso(Date.now() - (0.5 + (i % 10)) * DAY),
      deadline_at: s.dl ? iso(Date.now() + s.dl * DAY) : undefined,
    }),
  },
  {
    name: 'archived',
    specs: OLD,
    status: 'archived',
    window: (i, s) => ({
      publish_at: iso(Date.now() - (60 + (i % 30)) * DAY),
      expires_at: s.dl ? undefined : iso(Date.now() - (31 + (i % 25)) * DAY),
      deadline_at: s.dl ? iso(Date.now() + s.dl * DAY) : undefined,
    }),
  },
  {
    name: 'draft',
    specs: DRAFTS,
    status: 'draft',
    window: (i, s) => ({
      // A draft may hold its planned deadline, but it never publishes itself.
      deadline_at: s.dl ? iso(Date.now() + s.dl * DAY) : undefined,
    }),
  },
];

// Deterministic pseudo-random stats, so re-runs do not reshuffle the numbers.
let rngState = 42;
const rng = () => {
  rngState = (rngState * 1103515245 + 12345) % 2147483648;
  return rngState / 2147483648;
};
const int = (lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));

const main = () => {
  const db = loadDb();
  const admin = (db.users || []).find((u: any) => u.role === 'admin');
  const authorId = admin ? admin.id : 'system';

  // Replace only our own rows; real drops are never touched.
  const kept = (db.drops || []).filter((d: Drop) => !String(d.id).startsWith('drop-seed-'));

  const rows: Drop[] = [];
  const problems: string[] = [];
  let seq = 0;

  for (const group of GROUPS) {
    group.specs.forEach((spec, i) => {
      seq += 1;
      const id = `drop-seed-${String(seq).padStart(3, '0')}`;
      const win = group.window(i, spec);
      const created = iso(Date.now() - (10 + (i % 30)) * DAY);

      const views = int(120, 5200);
      const stats = {
        views,
        unique_viewers: Math.floor(views * (0.55 + rng() * 0.3)),
        cta_clicks: Math.floor(views * (0.08 + rng() * 0.14)),
        shares: int(2, 90),
        saves: int(5, 240),
        dwell_ms_total: views * int(4000, 26000),
      };
      const input = {
        type: spec.t,
        headline: spec.h,
        bullets: spec.b,
        cta_route: spec.r,
        target_slug: spec.slug,
        body_md: spec.body,
        deadline_at: win.deadline_at,
        publish_at: win.publish_at,
        expires_at: win.expires_at,
        status: group.status,
        pinned: !!spec.pin,
        priority: spec.pri ?? 0,
        audience: spec.college ? { colleges: [spec.college] } : {},
        tags: [],
      };

      const check = validateDropInput(input as any);
      if (!check.ok) {
        problems.push(`${id} (${group.name}): ${check.error}`);
        return;
      }
      const hLen = spec.h.trim().length;
      if (hLen < 40 || hLen > 100) problems.push(`${id}: headline length ${hLen} outside 40-100`);
      spec.b.forEach((b, bi) => {
        if (b.length > 120) problems.push(`${id}: bullet ${bi} is ${b.length} chars > 120`);
      });

      // The validator returns a whitelisted object - it does not carry fields
      // it does not validate - so the bookkeeping a Drop also needs (engagement
      // stats, authorship, provenance) is attached here, after validation,
      // exactly as lib/autoDrops.ts does for its rows.
      rows.push({
        ...(check.value as Drop),
        id,
        stats,
        author_id: authorId,
        source: { kind: 'manual' },
        created_at: created,
        updated_at: created,
      });
    });
  }

  if (problems.length) {
    console.error('Seed aborted, fix these rows first:');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }

  db.drops = [...kept, ...rows];
  pushAudit(db, {
    actor: authorId,
    action: 'drops.seed',
    detail: `Seeded ${rows.length} drops: ${GROUPS.map((g) => `${g.specs.length} ${g.name}`).join(', ')}`,
  } as any);
  saveDb(db);

  const byType: Record<string, number> = {};
  for (const r of rows) byType[r.type] = (byType[r.type] || 0) + 1;

  console.log(`Seeded ${rows.length} drops (${kept.length} pre-existing non-seed rows kept untouched).`);
  console.log(`  by window: ${GROUPS.map((g) => `${g.name}=${g.specs.length}`).join(', ')}`);
  console.log(`  by type:   ${Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t}=${n}`).join(', ')}`);
};

main();
