/**
 * Feed v3 (owner request, 2026-11-06): every earlier drop is removed and this
 * set replaces it. Facts come from the fact-checked company profiles
 * (companyProfiles2026.ts), the Diwali sale config (lib/festival.ts), the
 * course catalogue and TiEEdu's own features — nothing invented, no fake
 * "selected" stories or scholarships.
 *
 * Seeded once per database by lib/seed3T.ts `seedFeedV3`; everything here is
 * editable (or deletable) in Admin → Drops afterwards.
 *
 * `at` is when the drop publishes, in days from the seed run (negative = in the
 * past, so the feed has a natural newest-first order; positive = scheduled).
 */
export interface FeedV3Spec {
  type: string;
  headline: string;
  bullets: string[];
  route: string;
  art: string;
  text?: string;
  sub?: string;
  motion?: string;
  effect?: string;
  text_anim?: string;
  sound?: string;
  pinned?: boolean;
  priority?: 0 | 1 | 2;
  /** Publish offset in days from the seed run. */
  at: number;
  /** Absolute ISO deadline (countdown chip; hides job/deadline drops after it). */
  deadline?: string;
  /** Absolute ISO expiry. */
  expires?: string;
  body?: string;
  tags?: string[];
}

/** lib/festival.ts DIWALI_2026.ends_at — sale drops leave the feed with the sale. */
const SALE_ENDS = '2026-11-10T23:59:59+05:30';

export const FEED_V3: FeedV3Spec[] = [
  // ─── Diwali sale ────────────────────────────────────────────────────────
  {
    type: 'tieedu', pinned: true, priority: 2, at: -0.02, expires: SALE_ENDS,
    headline: 'Diwali Sale is live: 50% OFF every course and company pack',
    bullets: ['Ends 10 Nov, 11:59 PM IST — prices reset automatically', 'Free courses stay free; you pay exactly the price at checkout'],
    route: '/diwali', art: 'diwali-sale', text: '50% OFF', sub: 'Diwali Sale · till 10 Nov',
    motion: 'zoom', effect: 'fireworks', text_anim: 'pop', sound: 'diwali', tags: ['diwali', 'offer'],
    body: '## Diwali Sale 2026\n\nEvery paid course and every company prep pack is **50% off** until **10 November 2026, 11:59 PM IST**.\n\n- Free courses stay free\n- You pay exactly the price you see at checkout\n- After the sale, prices return to normal automatically',
  },
  {
    type: 'tieedu', pinned: true, priority: 1, at: -0.03, expires: SALE_ENDS,
    headline: 'Claim a free 3-month TiEEdu membership this Diwali',
    bullets: ['Extra mocks, every prep lesson and the internship board', 'One tap to claim — no card, no auto-debit'],
    route: '/diwali', art: 'gift', text: 'FREE', sub: '3-month membership',
    motion: 'float', effect: 'confetti', text_anim: 'pop', sound: 'success', tags: ['diwali', 'offer', 'membership'],
  },
  {
    type: 'course', priority: 1, at: -0.05, expires: SALE_ENDS,
    headline: 'AI.FIRST, our ₹99 flagship AI course, is ₹49 for Diwali',
    bullets: ['12 modules, 48 lessons and a defended capstone', 'Take the readiness test first and skip what you already know'],
    route: '/courses/ai-first', art: 'ai', text: '₹49', sub: 'AI.FIRST · was ₹99',
    motion: 'kenburns', effect: 'sparkles', text_anim: 'pop', sound: 'chime', tags: ['diwali', 'offer', 'ai'],
  },
  {
    type: 'tieedu', priority: 1, at: -0.07, expires: SALE_ENDS,
    headline: 'Complete company prep pack: ₹124 instead of ₹249 until 10 Nov',
    bullets: ['Unlimited mocks with fresh questions in every attempt', 'Every technical and HR model answer in one pack'],
    route: '/companies', art: 'diwali', text: '₹124', sub: 'Prep pack · was ₹249',
    motion: 'kenburns', effect: 'diyas', text_anim: 'rise', sound: 'diwali', tags: ['diwali', 'offer', 'pack'],
  },
  {
    type: 'course', at: -0.1, expires: SALE_ENDS,
    headline: 'DSA Mastery at ₹749 instead of ₹1,499 this Diwali',
    bullets: ['The data-structure topics coding rounds test most', 'Half price until 10 Nov, 11:59 PM IST'],
    route: '/courses/dsa-mastery', art: 'fireworks', text: '₹749', sub: 'DSA Mastery · was ₹1,499',
    motion: 'zoom', effect: 'fireworks', text_anim: 'pop', sound: 'fireworks', tags: ['diwali', 'offer', 'dsa'],
  },
  {
    type: 'course', at: -0.12, expires: SALE_ENDS,
    headline: 'Every paid course is half price: AI, coding, aptitude, interview prep',
    bullets: ['50% off the checkout price until 10 Nov', 'A certificate on completion, as always'],
    route: '/courses', art: 'diwali-sale', text: 'HALF PRICE', sub: 'All paid courses',
    motion: 'pan', effect: 'sparkles', text_anim: 'slide', sound: 'chime', tags: ['diwali', 'offer'],
  },
  {
    type: 'tieedu', at: -0.15, expires: SALE_ENDS,
    headline: 'TiEEdu internships: members apply in one tap',
    bullets: ['Every listing is checked by our team before it goes up', 'Claim the free Diwali membership first, then apply'],
    route: '/internships', art: 'rocket', text: 'INTERNSHIPS', sub: 'For members',
    motion: 'float', effect: 'stars', text_anim: 'rise', sound: 'whoosh', tags: ['diwali', 'internships'],
  },
  {
    type: 'tip', at: -0.2, expires: SALE_ENDS,
    headline: 'Happy Diwali from TiEEdu: light one diya for your prep',
    bullets: ['One full mock this week is the best gift to your preparation', 'Sale prices end on 10 Nov'],
    route: '/diwali', art: 'diwali', text: 'HAPPY DIWALI', sub: 'From team TiEEdu',
    motion: 'kenburns', effect: 'diyas', text_anim: 'typewriter', sound: 'diwali', tags: ['diwali'],
  },
  {
    type: 'deadline', priority: 2, at: 2.4, deadline: SALE_ENDS, expires: SALE_ENDS,
    headline: 'Last days of the Diwali Sale: 50% off ends 10 Nov at midnight',
    bullets: ['Prices reset automatically at 11:59 PM IST', 'Claim the free membership before it goes'],
    route: '/diwali', art: 'countdown', text: 'LAST DAYS', sub: 'Sale ends 10 Nov',
    motion: 'pulse', effect: 'fireworks', text_anim: 'pop', sound: 'alert', tags: ['diwali', 'offer'],
  },

  // ─── Wipro iOS (free program) ──────────────────────────────────────────
  {
    type: 'company', pinned: true, priority: 1, at: -0.25,
    headline: 'Wipro iOS (Swift) training is free: Milestone 1 test on 15 Nov',
    bullets: ['12 modules, guess papers and cheat sheets — all free', 'M1 15 Nov · M2 25 Nov · M3 4 Dec · M4 10 Dec · Final 13 Dec'],
    route: '/company/wipro-ios-swift', art: 'code', text: 'SWIFT', sub: 'Wipro iOS · free',
    motion: 'kenburns', effect: 'sparkles', text_anim: 'rise', sound: 'chime', tags: ['wipro', 'ios'],
  },
  {
    type: 'deadline', priority: 2, at: -0.3, deadline: '2026-11-15T09:00:00+05:30',
    headline: 'Wipro iOS Milestone 1 is on 15 Nov: revise with the guess papers',
    bullets: ['Every guess-paper question comes with a memory trick', 'Take the M1 milestone test here before the real one'],
    route: '/company/wipro-ios-swift', art: 'countdown', text: '15 NOV', sub: 'Wipro M1 test',
    motion: 'pulse', effect: 'none', text_anim: 'pop', sound: 'tick', tags: ['wipro', 'ios'],
  },
  {
    type: 'deadline', priority: 1, at: 9, deadline: '2026-11-25T09:00:00+05:30',
    headline: 'Wipro iOS Milestone 2 is on 25 Nov: modules up to M2 are ready',
    bullets: ['Milestone test, lessons and cheat sheets — all free', 'Check your readiness score before the test'],
    route: '/company/wipro-ios-swift', art: 'calendar', text: '25 NOV', sub: 'Wipro M2 test',
    motion: 'pulse', effect: 'none', text_anim: 'pop', sound: 'tick', tags: ['wipro', 'ios'],
  },

  // ─── Companies hiring ─────────────────────────────────────────────────
  {
    type: 'company', priority: 1, at: -0.4,
    headline: 'TCS NQT: one test decides Ninja, Digital or Prime',
    bullets: ['Ninja ₹3.36 LPA · Digital ₹7 LPA · Prime ₹9–11.5 LPA', 'Advanced coding decides the higher track'],
    route: '/company/tcs-nqt', art: 'company', text: 'TCS', sub: 'NQT · Ninja · Digital · Prime',
    motion: 'kenburns', effect: 'stars', text_anim: 'rise', sound: 'whoosh', tags: ['tcs'],
  },
  {
    type: 'company', at: -0.5,
    headline: 'Accenture ASE vs Advanced ASE: the coding round is the swing',
    bullets: ['ASE ₹4.5 LPA · Advanced ASE ₹6.5 LPA', '4 rounds: cognitive, coding, communication, interview'],
    route: '/company/accenture', art: 'company', text: 'ACCENTURE', sub: 'ASE · Advanced ASE',
    motion: 'kenburns', effect: 'none', text_anim: 'rise', sound: 'whoosh', tags: ['accenture'],
  },
  {
    type: 'vault', priority: 1, at: -0.6,
    headline: 'Infosys SE: every round mapped — Train, Test, Track',
    bullets: ['25 topic lessons free, 32 interview answers in the pack', 'Online test, technical and HR interview'],
    route: '/company/infosys-systems-engineer', art: 'company', text: 'INFOSYS', sub: 'Systems Engineer',
    motion: 'zoom', effect: 'sparkles', text_anim: 'rise', sound: 'chime', tags: ['infosys'],
  },
  {
    type: 'company', at: -0.7,
    headline: 'Infosys DSE and SP: fresher roles up to ₹21 LPA',
    bullets: ['DSE ₹7 LPA · SP L1 ₹11 · L2 ₹16 · L3 ₹21 LPA', 'Coding score and interview depth decide the level'],
    route: '/company/infosys-dse-sp', art: 'hiring', text: '₹21 LPA', sub: 'Infosys SP L3',
    motion: 'zoom', effect: 'sparkles', text_anim: 'pop', sound: 'success', tags: ['infosys'],
  },
  {
    type: 'company', at: -0.8,
    headline: 'Cognizant GenC: no bond and three pay bands',
    bullets: ['GenC ~₹4 LPA · GenC Pro ~₹5.4 LPA · GenC Next ~₹6.75 LPA', '70%+ academics and strong coding lead to GenC Next'],
    route: '/company/cognizant-genc', art: 'company', text: 'COGNIZANT', sub: 'GenC · Pro · Next',
    motion: 'kenburns', effect: 'none', text_anim: 'rise', sound: 'whoosh', tags: ['cognizant'],
  },
  {
    type: 'job', at: -0.9,
    headline: 'Cognizant Digital Nurture 5.0: train in full stack, then join',
    bullets: ['Java Full Stack training, then GenC, GenC Pro or GenC Next', 'GenC ₹4.01 · Pro ₹5.4 · Next ₹6.75 LPA'],
    route: '/company/cognizant-digital-nurture', art: 'hiring', text: 'DN 5.0', sub: 'Cognizant · 2027 batch',
    motion: 'float', effect: 'none', text_anim: 'rise', sound: 'pop', tags: ['cognizant'],
  },
  {
    type: 'company', at: -1.0,
    headline: 'Capgemini Exceller: debugging plus an AI-assisted coding round',
    bullets: ['Analyst ~₹4.25 LPA up to Senior Analyst ~₹7.5 LPA', 'Higher scores map you to the higher band'],
    route: '/company/capgemini-exceller', art: 'company', text: 'CAPGEMINI', sub: 'Exceller',
    motion: 'kenburns', effect: 'none', text_anim: 'rise', sound: 'whoosh', tags: ['capgemini'],
  },
  {
    type: 'company', at: -1.1,
    headline: 'Wipro Elite NTH: one test for the Elite and Turbo tracks',
    bullets: ['Elite ~₹3.5 LPA · Turbo ~₹6.5 LPA', 'Aptitude, an essay and 2 coding problems'],
    route: '/company/wipro-elite-nth', art: 'company', text: 'WIPRO', sub: 'Elite · Turbo',
    motion: 'kenburns', effect: 'none', text_anim: 'rise', sound: 'whoosh', tags: ['wipro'],
  },
  {
    type: 'company', at: -1.2,
    headline: 'Tech Mahindra: clear SuperCoder to move from ₹3.25 to ₹5.5 LPA',
    bullets: ['Standard ₹3.25 LPA → SuperCoder ₹5.5 LPA', 'A ₹1 lakh 2-year bond is reported: read your offer letter'],
    route: '/company/tech-mahindra', art: 'company', text: 'TECH M', sub: 'SuperCoder ₹5.5 LPA',
    motion: 'kenburns', effect: 'none', text_anim: 'rise', sound: 'whoosh', tags: ['tech-mahindra'],
  },
  {
    type: 'company', at: -1.3,
    headline: 'Mphasis fresher hiring: aptitude, programming and spoken English',
    bullets: ['Four rounds — the spoken-English test is part of the online assessment', 'The full syllabus is mapped on the company page'],
    route: '/company/mphasis-freshers', art: 'company', text: 'MPHASIS', sub: 'Software Engineer',
    motion: 'kenburns', effect: 'none', text_anim: 'rise', sound: 'whoosh', tags: ['mphasis'],
  },
  {
    type: 'company', at: -1.4,
    headline: "HCLTech's Elite AI-skilled track pays freshers ~₹18–22 LPA",
    bullets: ['Standard fresher roles at ~₹3.5–4.5 LPA', 'AI skills decide who makes the Elite track'],
    route: '/company/hcltech-freshers', art: 'ai', text: 'HCLTech', sub: 'Elite AI track',
    motion: 'zoom', effect: 'sparkles', text_anim: 'pop', sound: 'chime', tags: ['hcltech', 'ai'],
  },
  {
    type: 'company', at: -1.5,
    headline: 'Hexaware: clear the coding round to move from GET to Premier GET',
    bullets: ['GET ₹4 LPA · PGET ₹6 LPA', 'Aptitude, communication, coding, technical and HR'],
    route: '/company/hexaware-get-pget', art: 'company', text: 'HEXAWARE', sub: 'GET · PGET',
    motion: 'kenburns', effect: 'none', text_anim: 'rise', sound: 'whoosh', tags: ['hexaware'],
  },
  {
    type: 'company', at: -1.6,
    headline: "Virtusa's Power Coding round decides ₹5 LPA or ₹6.5 LPA",
    bullets: ['Coder ₹5 LPA · Power Coder ₹6.5 LPA', 'Aptitude, CS fundamentals, coding, then interview'],
    route: '/company/virtusa-coder', art: 'code', text: 'VIRTUSA', sub: 'Coder · Power Coder',
    motion: 'kenburns', effect: 'none', text_anim: 'typewriter', sound: 'tick', tags: ['virtusa'],
  },
  {
    type: 'company', at: -1.7,
    headline: 'Deloitte USI Analyst: a higher starting band for B.Tech freshers',
    bullets: ['~₹6.5–8.5 LPA, varies by team', 'Online assessment, technical or case interview, then HR'],
    route: '/company/deloitte-usi-analyst', art: 'company', text: 'DELOITTE', sub: 'USI Analyst',
    motion: 'kenburns', effect: 'none', text_anim: 'rise', sound: 'whoosh', tags: ['deloitte'],
  },
  {
    type: 'company', at: -1.8,
    headline: 'LTM (formerly LTIMindtree) hires Software Engineers and GETs',
    bullets: ['~₹4.0–4.4 LPA, as reported by candidates', 'Online test, technical and HR interview'],
    route: '/company/ltm-ltimindtree', art: 'company', text: 'LTM', sub: 'formerly LTIMindtree',
    motion: 'kenburns', effect: 'none', text_anim: 'rise', sound: 'whoosh', tags: ['ltm'],
  },
  {
    type: 'company', at: -1.9,
    headline: "IBM Associate System Engineer: the entry role at IBM's CICs",
    bullets: ['~₹4.5–6.5 LPA (estimate)', 'For CS-stream graduates — check the eligibility first'],
    route: '/company/ibm-associate-system-engineer', art: 'company', text: 'IBM', sub: 'Associate System Engineer',
    motion: 'kenburns', effect: 'none', text_anim: 'rise', sound: 'whoosh', tags: ['ibm'],
  },
  {
    type: 'company', at: -2.0,
    headline: 'Persistent Systems: product engineering, offer set by interview',
    bullets: ['~₹4–6 LPA, decided by interview performance', 'Aptitude and coding test, then technical and HR'],
    route: '/company/persistent-systems', art: 'company', text: 'PERSISTENT', sub: 'Software developer',
    motion: 'kenburns', effect: 'none', text_anim: 'rise', sound: 'whoosh', tags: ['persistent'],
  },
  {
    type: 'company', at: -2.1,
    headline: 'NTT DATA hires CS and IT freshers as Associate Software Engineers',
    bullets: ['A Japanese IT major with delivery centres in India', 'See the round pattern on the company page'],
    route: '/company/ntt-data-ase', art: 'company', text: 'NTT DATA', sub: 'Associate Software Engineer',
    motion: 'kenburns', effect: 'none', text_anim: 'rise', sound: 'whoosh', tags: ['ntt-data'],
  },
  {
    type: 'contest', at: -2.2,
    headline: 'TCS CodeVita Season 14 is open for the 2027–2030 batches',
    bullets: ['Two coding rounds and a Grand Finale', 'Strong ranks have led to TCS interviews'],
    route: '/company/tcs-codevita', art: 'trophy', text: 'CODEVITA', sub: 'Season 14',
    motion: 'zoom', effect: 'confetti', text_anim: 'pop', sound: 'drumroll', tags: ['tcs', 'contest'],
  },
  {
    type: 'contest', at: -2.3,
    headline: 'HackWithInfy: solve 2–3 problems, interview for Power Programmer',
    bullets: ['3 problems in 3 hours: easy, greedy, DP', 'Your score sets the role you interview for'],
    route: '/company/infosys-hackwithinfy', art: 'code', text: 'HACKWITHINFY', sub: 'Infosys contest',
    motion: 'kenburns', effect: 'stars', text_anim: 'typewriter', sound: 'drumroll', tags: ['infosys', 'contest'],
  },

  // ─── Courses ──────────────────────────────────────────────────────────
  {
    type: 'course', at: -2.5,
    headline: 'Python Programming, from your first script to packages — free',
    bullets: ['15 hands-on modules', 'The language most coding rounds accept'],
    route: '/courses/python-programming', art: 'code', text: 'PYTHON', sub: 'Free course',
    motion: 'kenburns', effect: 'none', text_anim: 'typewriter', sound: 'pop', tags: ['course', 'python'],
  },
  {
    type: 'course', at: -2.6,
    headline: 'Aptitude & Reasoning Mastery: clear the online-test round',
    bullets: ['High-frequency quant and reasoning from mass-recruiter tests', 'Free, with a certificate'],
    route: '/courses/aptitude-reasoning-mastery', art: 'chart', text: 'APTITUDE', sub: 'Free course',
    motion: 'kenburns', effect: 'none', text_anim: 'rise', sound: 'pop', tags: ['course', 'aptitude'],
  },
  {
    type: 'course', at: -2.7,
    headline: 'Generative AI Essentials for students — free',
    bullets: ['Prompting, tools and real use', 'Recruiters now ask about AI skills'],
    route: '/courses/genai-essentials', art: 'ai', text: 'GEN AI', sub: 'Free course',
    motion: 'zoom', effect: 'sparkles', text_anim: 'pop', sound: 'chime', tags: ['course', 'ai'],
  },
  {
    type: 'course', at: -2.8,
    headline: 'SQL & Databases Mastery: the queries interviews ask — free',
    bullets: ['Joins, grouping and the questions that repeat in tests', 'Free, with a certificate'],
    route: '/courses/sql-databases-mastery', art: 'chart', text: 'SQL', sub: 'Free course',
    motion: 'kenburns', effect: 'none', text_anim: 'rise', sound: 'pop', tags: ['course', 'sql'],
  },
  {
    type: 'course', at: -2.9,
    headline: 'Resume & LinkedIn Building: get shortlisted before the test',
    bullets: ['A resume a recruiter can read in six seconds', 'Free, with a certificate'],
    route: '/courses/resume-linkedin-building', art: 'certificate', text: 'RESUME', sub: 'Free course',
    motion: 'float', effect: 'none', text_anim: 'rise', sound: 'pop', tags: ['course', 'resume'],
  },

  // ─── Skill tests & TiEEdu features ────────────────────────────────────
  {
    type: 'skilltest', priority: 1, at: -3.0,
    headline: 'Know your level in 15 minutes: 100 free skill tests',
    bullets: ['A score by topic, with your strengths and gaps', 'Pass and get a certificate anyone can verify'],
    route: '/skill-test', art: 'chart', text: '100', sub: 'Free skill tests',
    motion: 'zoom', effect: 'stars', text_anim: 'pop', sound: 'success', tags: ['skill-test'],
  },
  {
    type: 'skilltest', at: -3.1,
    headline: 'Infosys SE full mock is live: the real 54-question pattern',
    bullets: ['Math 10 · Reasoning 15 · Verbal 20 · Pseudocode 5 · Puzzles 4', 'Section timers, secure mode, an email task at the end'],
    route: '/skill-test/infosys-se-online-assessment', art: 'shield', text: '54 Qs', sub: 'Infosys SE mock',
    motion: 'pulse', effect: 'none', text_anim: 'pop', sound: 'tick', tags: ['infosys', 'mock'],
  },
  {
    type: 'tieedu', at: -3.2,
    headline: 'Skill Passport: one page for every skill you prove',
    bullets: ['Badges, certificates and scores behind one link', 'Share it with recruiters directly'],
    route: '/skill-test/skill-passport', art: 'certificate', text: 'PASSPORT', sub: 'Your skills, verified',
    motion: 'float', effect: 'sparkles', text_anim: 'rise', sound: 'chime', tags: ['feature'],
  },
  {
    type: 'tieedu', at: -3.3,
    headline: 'English coach: speak for 30 seconds, get gentle tips',
    bullets: ['Practise speaking, not just reading', 'Tips in plain English — or Hinglish if you prefer'],
    route: '/english-coach', art: 'mic', text: 'SPEAK', sub: 'English coach',
    motion: 'pulse', effect: 'bubbles', text_anim: 'pop', sound: 'pop', tags: ['feature', 'english'],
  },
  {
    type: 'tieedu', at: -3.4,
    headline: 'Mock interview: answer five questions, get feedback on each',
    bullets: ['HR or technical — you choose', 'Feedback on every answer, not just a score'],
    route: '/mock-interview', art: 'mic', text: 'INTERVIEW', sub: 'Mock interview',
    motion: 'kenburns', effect: 'none', text_anim: 'rise', sound: 'whoosh', tags: ['feature', 'interview'],
  },
  {
    type: 'tieedu', at: -3.5,
    headline: 'Peer mock: interview a friend, then swap seats',
    bullets: ['Both of you earn points', 'The fastest way to lose interview nerves'],
    route: '/peer-mock', art: 'hiring', text: 'PEER MOCK', sub: 'Practise together',
    motion: 'float', effect: 'hearts', text_anim: 'rise', sound: 'pop', tags: ['feature', 'interview'],
  },
  {
    type: 'tieedu', at: -3.6,
    headline: 'Daily 10 minutes: one aptitude, one coding, one HR question',
    bullets: ['A fresh set every day', 'Small daily practice beats a weekend cram'],
    route: '/daily', art: 'calendar', text: '10 MIN', sub: 'Daily challenge',
    motion: 'pulse', effect: 'stars', text_anim: 'pop', sound: 'tick', tags: ['feature', 'daily'],
  },
  {
    type: 'tieedu', at: -3.7,
    headline: 'Set your test date and get a plan for every day until then',
    bullets: ['A countdown with one Train and one Test task a day', 'A readiness score that tells you what to fix'],
    route: '/calendar', art: 'calendar', text: 'PLAN', sub: 'Day-by-day prep',
    motion: 'kenburns', effect: 'none', text_anim: 'rise', sound: 'chime', tags: ['feature', 'plan'],
  },
  {
    type: 'tieedu', at: -3.8,
    headline: 'Got a job offer by message? Check if it is real first',
    bullets: ['Paste the message and see the warning signs', 'Genuine companies never ask you to pay'],
    route: '/offer-check', art: 'shield', text: 'REAL?', sub: 'Offer check',
    motion: 'pulse', effect: 'none', text_anim: 'pop', sound: 'alert', tags: ['feature', 'safety'],
  },
  {
    type: 'tieedu', at: -3.9,
    headline: 'Compare two companies side by side before you choose',
    bullets: ['Pay, rounds and eligibility in one view', 'Pick the drive that fits your strengths'],
    route: '/compare', art: 'company', text: 'VS', sub: 'Compare companies',
    motion: 'kenburns', effect: 'none', text_anim: 'pop', sound: 'whoosh', tags: ['feature'],
  },
  {
    type: 'college', at: -4.0,
    headline: 'College leaderboard: see where your campus stands',
    bullets: ['Ranked by tested skills, not claims', 'Practise to move your college up'],
    route: '/college-leaderboard', art: 'trophy', text: 'RANK', sub: 'College leaderboard',
    motion: 'zoom', effect: 'confetti', text_anim: 'pop', sound: 'drumroll', tags: ['feature', 'college'],
  },

  // ─── Tips ─────────────────────────────────────────────────────────────
  {
    type: 'tip', at: -4.1,
    headline: 'Pseudocode trick: trace first, answer second',
    bullets: ['Make a table of every variable', 'Check <= against < before every pass'],
    route: '/company/infosys-systems-engineer', art: 'code', text: 'TRACE', sub: 'Pseudocode tip',
    motion: 'kenburns', effect: 'none', text_anim: 'typewriter', sound: 'tick', tags: ['tip'],
  },
  {
    type: 'tip', priority: 1, at: -4.2,
    headline: 'Never pay for a placement test, an interview or an offer',
    bullets: ['Genuine companies charge nothing for tests or interviews', 'Apply only on official careers pages'],
    route: '/offer-check', art: 'shield', text: 'NEVER PAY', sub: 'Stay safe',
    motion: 'pulse', effect: 'none', text_anim: 'pop', sound: 'alert', tags: ['tip', 'safety'],
  },
  {
    type: 'tip', at: -4.3,
    headline: 'Communication rounds eliminate: practise speaking out loud',
    bullets: ['AI-scored spoken English is eliminatory at Accenture, Cognizant, Hexaware and Tech Mahindra', 'Use the English coach daily'],
    route: '/english-coach', art: 'mic', text: 'SPEAK UP', sub: 'Communication tip',
    motion: 'kenburns', effect: 'none', text_anim: 'rise', sound: 'pop', tags: ['tip', 'english'],
  },
  {
    type: 'tip', at: -4.4,
    headline: 'Resume tip: put numbers on your impact, not just your duties',
    bullets: ['"Cut load time by 40%" beats three lines of responsibilities', 'Two projects with outcomes are plenty'],
    route: '/courses/resume-linkedin-building', art: 'stars', text: 'IMPACT', sub: 'Resume tip',
    motion: 'zoom', effect: 'sparkles', text_anim: 'rise', sound: 'chime', tags: ['tip', 'resume'],
    body: 'One line that says **"cut API latency by 40%"** beats three lines of responsibilities.\n\n- Pick your last two projects\n- Attach one measurable outcome to each\n- Keep it to one page until you have five years of experience',
  },
  {
    type: 'tip', at: -4.5,
    headline: 'Before any drive: one full mock under real timing',
    bullets: ['Timing, not knowledge, is where most attempts slip', 'Review every wrong answer the same day'],
    route: '/skill-test', art: 'countdown', text: 'MOCK', sub: 'Exam-day tip',
    motion: 'pulse', effect: 'none', text_anim: 'pop', sound: 'tick', tags: ['tip'],
  },
];
