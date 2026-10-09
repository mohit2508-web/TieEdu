import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { loadDb, saveDb, User } from '../data/db';
import { getPool } from '../db/client';
import { runSchoolMigrations } from '../db/schoolMigrate';

/**
 * TieEdu Schools seed — opt-in via SCHOOL_SEED=1, mirroring PLACEMENT_SEED.
 *
 * Contract shared with the placement seed (and enforced here):
 *  - A seeded user is a real JSON-ledger `users` row with the same fields a
 *    real signup writes, so demo logins exercise the real auth path (bcrypt
 *    verify against the same hash list, real session issuance).
 *  - Demo schools/programs/members are PostgreSQL-only, keyed idempotently
 *    (school by code, programme by slug, member by roll_no), so re-seeding on
 *    every boot is a no-op instead of an error.
 *  - SCHOOL_SEED=1 in production without SCHOOL_SEED_PASSWORD refuses to run.
 */

export const SEED_SCHOOL_CODE = 'DEMO2026';
export const SEED_SCHOOL_NAME = 'Demo International School';

const SCHOOL_SEED_SLUG = 'demo-2026';

interface SeedStudent {
  name: string;
  email: string;
  classLevel: string;
  section: string;
  rollNo: string;
  programSlugs: string[];
  firstLessonRefs: string[];
}

const DEMO_STUDENTS: SeedStudent[] = [
  {
    name: 'Riya Sharma',
    email: 'riya.sharma@demo.tieedu',
    classLevel: '5',
    section: 'A',
    rollNo: '2026-05-RS',
    programSlugs: ['computers-explorer', 'young-coders'],
    firstLessonRefs: ['what-is-a-computer', 'logic-and-sequences'],
  },
  {
    name: 'Dev Patel',
    email: 'dev.patel@demo.tieedu',
    classLevel: '5',
    section: 'A',
    rollNo: '2026-05-DP',
    programSlugs: ['computers-explorer'],
    firstLessonRefs: ['what-is-a-computer'],
  },
  {
    name: 'Arjun Mehta',
    email: 'arjun.mehta@demo.tieedu',
    classLevel: '8',
    section: 'B',
    rollNo: '2026-08-AM',
    programSlugs: ['ai-adventures', 'coding-foundations', 'mech-build-lab'],
    firstLessonRefs: ['what-is-ai', 'my-first-program', 'gears-and-levers'],
  },
  {
    name: 'Zoya Khan',
    email: 'zoya.khan@demo.tieedu',
    classLevel: '8',
    section: 'B',
    rollNo: '2026-08-ZK',
    programSlugs: ['ai-adventures', 'drone-classroom'],
    firstLessonRefs: ['what-is-ai', 'intro-to-flight'],
  },
  {
    name: 'Sara Ali',
    email: 'sara.ali@demo.tieedu',
    classLevel: '8',
    section: 'B',
    rollNo: '2026-08-SA',
    programSlugs: ['ai-adventures'],
    firstLessonRefs: ['what-is-ai'],
  },
  {
    name: 'Vihaan Rao',
    email: 'vihaan.rao@demo.tieedu',
    classLevel: '10',
    section: 'C',
    rollNo: '2026-10-VR',
    programSlugs: ['space-systems', 'coding-pro', 'startup-spark'],
    firstLessonRefs: ['rocket-anatomy', 'python-basics', 'idea-to-venture'],
  },
  {
    name: 'Ananya Iyer',
    email: 'ananya.iyer@demo.tieedu',
    classLevel: '10',
    section: 'C',
    rollNo: '2026-10-AI',
    programSlugs: ['ai-data-lab', 'space-systems'],
    firstLessonRefs: ['data-wrangling', 'rocket-anatomy'],
  },
  {
    name: 'Kabir Singh',
    email: 'kabir.singh@demo.tieedu',
    classLevel: '10',
    section: 'C',
    rollNo: '2026-10-KS',
    programSlugs: ['coding-pro'],
    firstLessonRefs: ['python-basics'],
  },
];

interface SeedProgram {
  slug: string;
  title: string;
  category: string;
  track: string;
  classMin: number;
  classMax: number;
  description: string;
  curriculum: { ref: string; title: string }[];
}

const DEMO_PROGRAMS: SeedProgram[] = [
  {
    slug: 'computers-explorer',
    title: 'Computers & Robotics Explorer',
    category: 'Curiosity Lab',
    track: 'core',
    classMin: 3,
    classMax: 5,
    description: 'How machines think, click, whirr and obey. A hands-on first journey into computers and tiny robots.',
    curriculum: [
      { ref: 'what-is-a-computer', title: 'What is a computer, really?' },
      { ref: 'buttons-and-loops', title: 'Buttons, loops and repeat' },
      { ref: 'tiny-robot-chase', title: 'Program a tiny robot chase' },
      { ref: 'sensors-are-ears', title: 'Sensors: the robot ears' },
    ],
  },
  {
    slug: 'young-coders',
    title: 'Young Coders — Block by Block',
    category: 'Usually Coding',
    track: 'core',
    classMin: 3,
    classMax: 5,
    description: 'Drag, snap, run. Building your very first video games with blocks, no typing needed.',
    curriculum: [
      { ref: 'logic-and-sequences', title: 'Sequences: first the eggs, then the toast' },
      { ref: 'block-jump-game', title: 'Build a block-jump game' },
      { ref: 'debug-like-a-detective', title: 'Debug like a detective' },
    ],
  },
  {
    slug: 'ai-adventures',
    title: 'AI Adventures',
    category: 'AI & Future-First',
    track: 'core',
    classMin: 6,
    classMax: 8,
    description: 'Train a computer to see, guess and learn. Friendlier than it sounds — promise.',
    curriculum: [
      { ref: 'what-is-ai', title: 'What is AI? Teach a computer to guess' },
      { ref: 'training-the-algo', title: 'Training: reward and repeat' },
      { ref: 'ai-sees-images', title: 'How AI sees pictures' },
      { ref: 'chat-bots-say-hi', title: 'Build a rules chatbot' },
      { ref: 'ai-and-you', title: 'Using AI wisely (and honestly)' },
    ],
  },
  {
    slug: 'coding-foundations',
    title: 'Coding Foundations',
    category: 'Usually Coding',
    track: 'core',
    classMin: 6,
    classMax: 8,
    description: 'Real syntax, small wins. Variables, loops and functions in a real language.',
    curriculum: [
      { ref: 'my-first-program', title: 'Your first program: print() and friends' },
      { ref: 'variables-are-boxes', title: 'Variables are labelled boxes' },
      { ref: 'loops-save-the-day', title: 'Loops save the day' },
      { ref: 'functions-are-recipe', title: 'Functions are recipes' },
    ],
  },
  {
    slug: 'mech-build-lab',
    title: 'Mech Build Lab',
    category: 'Making & Skills',
    track: 'skill-track',
    classMin: 6,
    classMax: 8,
    description: 'Paper circuits, wooden bots and simple machines. Real making, real tools, real pride.',
    curriculum: [
      { ref: 'gears-and-levers', title: 'Gears and levers: moving without motors' },
      { ref: 'paper-circuit', title: 'Light up a paper circuit' },
      { ref: 'cardboard-bot', title: 'Build a cardboard bot' },
    ],
  },
  {
    slug: 'drone-classroom',
    title: 'Drones in the Classroom',
    category: 'Future-First',
    track: 'skill-track',
    classMin: 6,
    classMax: 8,
    description: 'Fly a micro-drone safely, read its telemetry and programme simple flight paths.',
    curriculum: [
      { ref: 'intro-to-flight', title: 'How does a drone actually stay up?' },
      { ref: 'safety-first', title: 'Air, batteries and safety-first' },
      { ref: 'plot-a-path', title: 'Plot a flight path with waypoints' },
    ],
  },
  {
    slug: 'space-systems',
    title: 'Rocket Science & Space Systems',
    category: 'Future-First',
    track: 'core',
    classMin: 9,
    classMax: 12,
    description: 'From Newton to ISRO: how rockets work, how orbits hold, and what the moon really needs.',
    curriculum: [
      { ref: 'rocket-anatomy', title: 'Rocket anatomy: fuel, thrust, stage' },
      { ref: 'orbital-thinking', title: 'Orbits: falling sideways forever' },
      { ref: 'space-race', title: 'The space race, ISRO and PSLV' },
      { ref: 'mars-or-moon', title: 'Mission planning: Mars or the Moon?' },
    ],
  },
  {
    slug: 'ai-data-lab',
    title: 'AI & Data Lab',
    category: 'AI & Future-First',
    track: 'core',
    classMin: 9,
    classMax: 12,
    description: 'Python, pandas and honest AI ethics — analyse real datasets and train a mini model.',
    curriculum: [
      { ref: 'data-wrangling', title: 'Wrangling data with Python' },
      { ref: 'find-the-pattern', title: 'Find the pattern: correlation, not trickery' },
      { ref: 'mini-model', title: 'Train a mini prediction model' },
      { ref: 'bias-is-ours', title: 'Bias: when the data lies' },
    ],
  },
  {
    slug: 'coding-pro',
    title: 'Coding Pro — Python & Web',
    category: 'Usually Coding',
    track: 'skill-track',
    classMin: 9,
    classMax: 12,
    description: 'The serious track: Python end-to-end, then a real web project to show off.',
    curriculum: [
      { ref: 'python-basics', title: 'Python basics, properly' },
      { ref: 'webpage-bones', title: 'Webpage bones: HTML + CSS' },
      { ref: 'make-it-sing', title: 'Make it sing: JavaScript' },
      { ref: 'final-project', title: 'Ship a mini project' },
    ],
  },
  {
    slug: 'startup-spark',
    title: 'Startup Spark',
    category: 'Entrepreneurship',
    track: 'elective',
    classMin: 9,
    classMax: 12,
    description: 'An idea is cheap — validation is everything. Pitch, prototype, price.',
    curriculum: [
      { ref: 'idea-to-venture', title: 'From idea to venture' },
      { ref: 'talk-to-customers', title: 'Interview five real customers' },
      { ref: 'paper-prototype', title: 'Prototype on paper, test for real' },
      { ref: 'pitch-night', title: 'Pitch night: 3 minutes that count' },
    ],
  },
];

interface SeedNotice {
  title: string;
  body: string;
  kind: string;
  pinned: boolean;
}

const DEMO_NOTICES: SeedNotice[] = [
  {
    title: 'Welcome to Tech Club 2026',
    body: 'The new tech slate is live. Pick a programme and unlock your first lesson today. Parents: the monthly progress report lands on the 1st.',
    kind: 'general',
    pinned: true,
  },
  {
    title: 'Robotics Saturday',
    body: 'Robotics Saturday is back — 21 March, 10:00 AM in the Innovation Lab. Classes 5–8 only, seats are first-come.',
    kind: 'event',
    pinned: true,
  },
  {
    title: 'Parents: demo drive for Coding Pro',
    body: 'If your child is in Class 9–12 and curious about Coding Pro, join the parent briefing on Thursday at 6 PM over video call.',
    kind: 'general',
    pinned: false,
  },
];

/**
 * Creates a JSON-ledger user only when missing. Same fields a real signup
 * writes, so the demo login exercises the real bcrypt + session path.
 */
function ensureSeedUser(account: { name: string; email: string }, passwordHash: string): User {
  const db = loadDb();
  db.users = db.users || [];
  const existing = (db.users || []).find((u: User) => u.email === account.email);
  if (existing) return existing;
  const user: User = {
    id: `user-school-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    name: account.name,
    email: account.email,
    password_hash: passwordHash,
    role: 'user',
    xp: 0,
    streak: 0,
    created_at: new Date().toISOString(),
  };
  db.users.push(user);
  saveDb(db);
  return user;
}

export async function seedDemoSchoolData(): Promise<void> {
  const enabled = process.env.SCHOOL_SEED === '1';
  if (!enabled) return;

  const password = process.env.SCHOOL_SEED_PASSWORD || '';
  if (!password && process.env.NODE_ENV === 'production') {
    console.log(
      '[School] SCHOOL_SEED=1 in production without SCHOOL_SEED_PASSWORD — refusing to seed. Set the password explicitly or unset SCHOOL_SEED.'
    );
    return;
  }

  const effectivePassword = password || 'SchoolDemo#2026';
  if (!password) {
    console.log('[School] SCHOOL_SEED_PASSWORD unset — using the dev default for demo accounts.');
  }
  const passwordHash = bcrypt.hashSync(effectivePassword, 12);

  // --- School ---------------------------------------------------------------
  let schoolRes = await getPool().query(`SELECT school_id FROM school WHERE code = $1`, [
    SEED_SCHOOL_CODE,
  ]);
  let schoolId = schoolRes.rows?.[0]?.school_id as string | undefined;
  if (!schoolId) {
    const created = await getPool().query(
      `INSERT INTO school (code, name, short_name, city, state, board, motto, session, theme_color, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
       RETURNING school_id`,
      [
        SEED_SCHOOL_CODE,
        SEED_SCHOOL_NAME,
        'DIS',
        'New Delhi',
        'Delhi',
        'CBSE',
        'Curiosity first, always.',
        '2026–27',
        '#0369A1',
      ]
    );
    schoolId = created.rows?.[0]?.school_id as string;
    console.log(`[School] Seeded demo school "${SEED_SCHOOL_NAME}" (${SEED_SCHOOL_CODE}).`);
  }

  // --- Programs ---------------------------------------------------------------
  for (const p of DEMO_PROGRAMS) {
    const exists = await getPool().query(
      `SELECT program_id FROM school_program WHERE school_id = $1 AND slug = $2`,
      [schoolId, p.slug]
    );
    if (exists.rows?.[0]) continue;
    await getPool().query(
      `INSERT INTO school_program (school_id, slug, title, category, track, class_min, class_max, description, curriculum, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')`,
      [
        schoolId,
        p.slug,
        p.title,
        p.category,
        p.track,
        p.classMin,
        p.classMax,
        p.description,
        p.curriculum,
      ]
    );
  }

  // --- Notices ---------------------------------------------------------------
  for (const n of DEMO_NOTICES) {
    const exists = await getPool().query(
      `SELECT notice_id FROM school_notice WHERE school_id = $1 AND title = $2`,
      [schoolId, n.title]
    );
    if (exists.rows?.[0]) continue;
    await getPool().query(
      `INSERT INTO school_notice (school_id, title, body, kind, pinned, published_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [schoolId, n.title, n.body, n.kind, n.pinned]
    );
  }

  // --- Members + users + starter progress ---------------------------------------
  for (const s of DEMO_STUDENTS) {
    const user = ensureSeedUser({ name: s.name, email: s.email }, passwordHash);

    const memberRes = await getPool().query(
      `SELECT member_id FROM school_member WHERE school_id = $1 AND roll_no = $2`,
      [schoolId, s.rollNo]
    );
    if (!memberRes.rows?.[0]) {
      await getPool().query(
        `INSERT INTO school_member (school_id, user_id, role, class_level, section, roll_no, status)
         VALUES ($1, $2, 'student', $3, $4, $5, 'active')`,
        [schoolId, user.id, s.classLevel, s.section, s.rollNo]
      );
    }

    const programs = await getPool().query(
      `SELECT program_id, slug FROM school_program WHERE school_id = $1 AND slug = ANY($2::text[])`,
      [schoolId, s.programSlugs]
    );
    const refs = s.firstLessonRefs;
    let pi = 0;
    for (const prog of programs.rows || []) {
      if (!refs.length) continue;
      const ref = refs[pi % refs.length];
      await getPool().query(
        `INSERT INTO school_progress (school_id, user_id, program_id, lesson_ref)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (school_id, user_id, program_id, lesson_ref) DO NOTHING`,
        [schoolId, user.id, prog.program_id, ref]
      );
      pi += 1;
    }
  }

  console.log(`[School] Seed for "${SEED_SCHOOL_CODE}" is ready. Dev password: ${effectivePassword}`);
}

export async function runSchoolBoot(): Promise<boolean> {
  await runSchoolMigrations();
  await seedDemoSchoolData();
  return true;
}

export { SCHOOL_SEED_SLUG };