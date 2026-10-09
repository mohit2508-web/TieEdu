import { PrismaClient, type Plan } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';

/**
 * Phase 1 seed.
 *
 * Covers: 1 platform admin, 2 schools (one PRO, one PREMIUM-branded
 * "Green Valley Tech Academy"), teachers + school admins, 50 students across
 * Class 3–12 with roll numbers and PINs, a parent with consent, and notices.
 *
 * Catalog, learning, teacher assignments, commerce invoices, bookings and
 * certificates are seeded in their respective phase functions below.
 */

const prisma = new PrismaClient();

const hash = (v: string) => bcrypt.hashSync(v, 10);
let phoneSeq = 0;
const nextPhone = () => `+9198${String(phoneSeq++).padStart(8, '0')}`;
const code = (name: string) => {
  const letters = name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4).padEnd(4, 'X');
  return `${letters}-${1000 + Math.floor(Math.random() * 9000)}`;
};

const FIRST = ['Aarav', 'Vivaan', 'Diya', 'Ananya', 'Ishaan', 'Saanvi', 'Kabir', 'Myra', 'Reyansh', 'Aadhya', 'Vihaan', 'Kiara', 'Arjun', 'Riya', 'Dev', 'Zoya', 'Kabir', 'Sara', 'Advait', 'Anvi'];
const LAST = ['Sharma', 'Patel', 'Singh', 'Khan', 'Iyer', 'Rao', 'Mehta', 'Gupta', 'Nair', 'Verma', 'Das', 'Bose'];

function studentName(i: number) {
  return `${FIRST[i % FIRST.length]} ${LAST[Math.floor(i / FIRST.length) % LAST.length]}`;
}

async function resetIfRequested() {
  if (process.env.SEED_RESET !== 'true') return;
  console.log('[seed] SEED_RESET=true — clearing tables');
  await prisma.auditLog.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.parentConsent.deleteMany();
  await prisma.notice.deleteMany();
  await prisma.quizAnswer.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.quizOption.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.teacherCourseAssignment.deleteMany();
  await prisma.schoolCourse.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.module.deleteMany();
  await prisma.course.deleteMany();
  await prisma.skillTrack.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.session.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();
}

// ---------------------------------------------------------------------------
// Phase 2 catalog: 6 skill tracks + 9 flagship courses.
// ---------------------------------------------------------------------------

interface SeedQuizOption {
  text: string;
  isCorrect?: boolean;
}
interface SeedQuizQuestion {
  prompt: string;
  options: SeedQuizOption[];
}
interface SeedLesson {
  title: string;
  kind: 'VIDEO' | 'TEXT' | 'QUIZ' | 'ACTIVITY' | 'PROJECT';
  durationMins?: number;
  isPreview?: boolean;
  contentBody?: string;
  contentUrl?: string;
  quiz?: SeedQuizQuestion[];
}
interface SeedModule {
  title: string;
  summary?: string;
  lessons: SeedLesson[];
}
interface SeedCourse {
  slug: string;
  title: string;
  track: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  gradeMin: number;
  gradeMax: number;
  durationMins: number;
  summary: string;
  outcomes: string[];
  tags: string[];
  modules: SeedModule[];
}

const TRACKS: { slug: string; name: string; description: string; icon: string; color: string; sortOrder: number }[] = [
  { slug: 'coding', name: 'Coding & Programming', description: 'From block coding to real code.', icon: 'code', color: '#2563EB', sortOrder: 1 },
  { slug: 'ai', name: 'AI & Data Science', description: 'How machines learn, in plain language.', icon: 'brain', color: '#7C3AED', sortOrder: 2 },
  { slug: 'robotics', name: 'Robotics & IoT', description: 'Build and program things that move.', icon: 'cpu', color: '#0D9488', sortOrder: 3 },
  { slug: 'web', name: 'Web & App Development', description: 'Ship real websites and apps.', icon: 'globe', color: '#EA580C', sortOrder: 4 },
  { slug: 'cyber', name: 'Cyber Safety & Digital Citizenship', description: 'Stay safe and kind online.', icon: 'shield', color: '#DC2626', sortOrder: 5 },
  { slug: 'design', name: 'Design & Creativity', description: 'Ideas, UI and making things beautiful.', icon: 'palette', color: '#DB2777', sortOrder: 6 },
];

const COURSES: SeedCourse[] = [
  {
    slug: 'python-foundations',
    title: 'Python Foundations',
    track: 'coding',
    level: 'BEGINNER',
    gradeMin: 3,
    gradeMax: 5,
    durationMins: 480,
    summary: 'A friendly first step into real code with Python.',
    outcomes: ['Write and run simple Python programs', 'Use variables, loops and conditions', 'Solve small puzzles with code'],
    tags: ['python', 'coding', 'logic'],
    modules: [
      {
        title: 'Getting Started',
        summary: 'What a program is and your first line of code.',
        lessons: [
          { title: 'What is programming?', kind: 'VIDEO', durationMins: 10, isPreview: true, contentBody: 'A program is a list of instructions a computer follows, one by one.' },
          { title: 'Your first Python program', kind: 'ACTIVITY', durationMins: 20, contentBody: 'Open the online editor, type print("Hello"), and run it.' },
          {
            title: 'Checkpoint: printing',
            kind: 'QUIZ',
            durationMins: 10,
            quiz: [
              {
                prompt: 'Which command prints text in Python?',
                options: [
                  { text: 'print("Hi")', isCorrect: true },
                  { text: 'echo "Hi"' },
                  { text: 'console.log("Hi")' },
                ],
              },
              {
                prompt: 'What does print(2 + 3) show?',
                options: [{ text: '5', isCorrect: true }, { text: '23' }, { text: 'An error' }],
              },
            ],
          },
        ],
      },
      {
        title: 'Making Computers Decide',
        lessons: [
          { title: 'Variables and numbers', kind: 'VIDEO', durationMins: 15 },
          { title: 'Conditions that choose', kind: 'ACTIVITY', durationMins: 20 },
          { title: 'Loops: doing things again', kind: 'VIDEO', durationMins: 15 },
        ],
      },
    ],
  },
  {
    slug: 'block-coding-scratch',
    title: 'Block Coding with Scratch',
    track: 'coding',
    level: 'BEGINNER',
    gradeMin: 3,
    gradeMax: 5,
    durationMins: 420,
    summary: 'Build games and animations by snapping blocks together.',
    outcomes: ['Understand events, sequences and loops', 'Build a small interactive game'],
    tags: ['scratch', 'games', 'creativity'],
    modules: [
      {
        title: 'Blocks and Sprites',
        lessons: [
          { title: 'Meet the Scratch stage', kind: 'VIDEO', durationMins: 10, isPreview: true },
          { title: 'Make a sprite move', kind: 'ACTIVITY', durationMins: 20 },
          { title: 'Events and triggers', kind: 'VIDEO', durationMins: 12 },
        ],
      },
      {
        title: 'Build Your First Game',
        lessons: [
          { title: 'Score and variables', kind: 'ACTIVITY', durationMins: 25 },
          { title: 'Add a timer', kind: 'ACTIVITY', durationMins: 20 },
          { title: 'Share your game', kind: 'PROJECT', durationMins: 30 },
        ],
      },
    ],
  },
  {
    slug: 'ai-for-young-minds',
    title: 'AI for Young Minds',
    track: 'ai',
    level: 'BEGINNER',
    gradeMin: 6,
    gradeMax: 8,
    durationMins: 360,
    summary: 'What AI really is, where it shows up, and how to use it responsibly.',
    outcomes: ['Explain AI, ML and data in your own words', 'Train a simple classifier', 'Discuss AI safety and bias'],
    tags: ['ai', 'data', 'ethics'],
    modules: [
      {
        title: 'What Is AI?',
        lessons: [
          { title: 'AI in your daily life', kind: 'VIDEO', durationMins: 10, isPreview: true },
          { title: 'Rules vs learning', kind: 'TEXT', durationMins: 12 },
          {
            title: 'Quick check',
            kind: 'QUIZ',
            durationMins: 8,
            quiz: [
              {
                prompt: 'AI that improves from examples is called…',
                options: [
                  { text: 'Machine learning', isCorrect: true },
                  { text: 'A calculator' },
                  { text: 'A spreadsheet' },
                ],
              },
              {
                prompt: 'The examples used to teach a model are called…',
                options: [{ text: 'Training data', isCorrect: true }, { text: 'A battery' }, { text: 'Output' }],
              },
            ],
          },
        ],
      },
      {
        title: 'Train a Model',
        lessons: [
          { title: 'Teach the computer with examples', kind: 'ACTIVITY', durationMins: 25 },
          { title: 'When models get it wrong', kind: 'TEXT', durationMins: 12 },
          { title: 'Design a fair AI', kind: 'PROJECT', durationMins: 30 },
        ],
      },
    ],
  },
  {
    slug: 'machine-learning-basics',
    title: 'Machine Learning Basics',
    track: 'ai',
    level: 'INTERMEDIATE',
    gradeMin: 9,
    gradeMax: 12,
    durationMins: 600,
    summary: 'Build and evaluate your first machine-learning models.',
    outcomes: ['Split data into train and test', 'Train a model and read its accuracy', 'Spot overfitting'],
    tags: ['ml', 'python', 'statistics'],
    modules: [
      {
        title: 'Data First',
        lessons: [
          { title: 'Features and labels', kind: 'VIDEO', durationMins: 15, isPreview: true },
          { title: 'Train/test split', kind: 'ACTIVITY', durationMins: 25 },
          {
            title: 'Checkpoint',
            kind: 'QUIZ',
            durationMins: 10,
            quiz: [
              {
                prompt: 'A train/test split helps you…',
                options: [
                  { text: 'Check whether the model generalises', isCorrect: true },
                  { text: 'Make the dataset bigger' },
                  { text: 'Type faster' },
                ],
              },
            ],
          },
        ],
      },
      {
        title: 'Models That Learn',
        lessons: [
          { title: 'Your first classifier', kind: 'ACTIVITY', durationMins: 30 },
          { title: 'Accuracy and mistakes', kind: 'VIDEO', durationMins: 18 },
          { title: 'Avoiding overfitting', kind: 'TEXT', durationMins: 15 },
        ],
      },
    ],
  },
  {
    slug: 'robotics-level-1',
    title: 'Robotics Level 1',
    track: 'robotics',
    level: 'BEGINNER',
    gradeMin: 6,
    gradeMax: 8,
    durationMins: 540,
    summary: 'Assemble a robot, wire the sensors, and program its behaviour.',
    outcomes: ['Identify robot parts and sensors', 'Write a sensor-driven program', 'Debug a live robot'],
    tags: ['robotics', 'sensors', 'hardware'],
    modules: [
      {
        title: 'Meet the Robot',
        lessons: [
          { title: 'Parts of a robot', kind: 'VIDEO', durationMins: 12, isPreview: true },
          { title: 'Safety first', kind: 'TEXT', durationMins: 8 },
          { title: 'Assemble the base', kind: 'ACTIVITY', durationMins: 30 },
        ],
      },
      {
        title: 'Sense and Move',
        lessons: [
          { title: 'Reading a distance sensor', kind: 'ACTIVITY', durationMins: 25 },
          { title: 'If the wall is near…', kind: 'ACTIVITY', durationMins: 25 },
          { title: 'Line follower project', kind: 'PROJECT', durationMins: 40 },
        ],
      },
    ],
  },
  {
    slug: 'smart-devices-iot',
    title: 'Smart Devices with IoT',
    track: 'robotics',
    level: 'INTERMEDIATE',
    gradeMin: 9,
    gradeMax: 12,
    durationMins: 600,
    summary: 'Connect sensors to the internet and control them from anywhere.',
    outcomes: ['Publish sensor data online', 'Control a device over the network', 'Apply basic security'],
    tags: ['iot', 'microcontroller', 'networking'],
    modules: [
      {
        title: 'Connect',
        lessons: [
          { title: 'What is IoT?', kind: 'VIDEO', durationMins: 12, isPreview: true },
          { title: 'Reading a sensor', kind: 'ACTIVITY', durationMins: 25 },
          { title: 'Sending data online', kind: 'ACTIVITY', durationMins: 30 },
        ],
      },
      {
        title: 'Control',
        lessons: [
          { title: 'Smart light switch', kind: 'ACTIVITY', durationMins: 30 },
          { title: 'Securing your device', kind: 'TEXT', durationMins: 15 },
          { title: 'Mini smart-home project', kind: 'PROJECT', durationMins: 45 },
        ],
      },
    ],
  },
  {
    slug: 'web-development-bootcamp',
    title: 'Web Development Bootcamp',
    track: 'web',
    level: 'INTERMEDIATE',
    gradeMin: 9,
    gradeMax: 12,
    durationMins: 720,
    summary: 'From HTML and CSS to a live site you can share.',
    outcomes: ['Structure pages with HTML', 'Style them with CSS', 'Make them interactive with JavaScript'],
    tags: ['html', 'css', 'javascript'],
    modules: [
      {
        title: 'Structure & Style',
        lessons: [
          { title: 'Your first HTML page', kind: 'ACTIVITY', durationMins: 25, isPreview: true },
          { title: 'CSS colours and layout', kind: 'VIDEO', durationMins: 20 },
          {
            title: 'Checkpoint: build a card',
            kind: 'QUIZ',
            durationMins: 10,
            quiz: [
              {
                prompt: 'CSS is used for…',
                options: [{ text: 'Styling pages', isCorrect: true }, { text: 'Storing data' }, { text: 'Sending email' }],
              },
              {
                prompt: 'Which tag creates a link?',
                options: [{ text: '<a>', isCorrect: true }, { text: '<link-card>' }, { text: '<go>' }],
              },
            ],
          },
        ],
      },
      {
        title: 'Make It Interactive',
        lessons: [
          { title: 'JavaScript basics', kind: 'VIDEO', durationMins: 20 },
          { title: 'Buttons that react', kind: 'ACTIVITY', durationMins: 30 },
          { title: 'Ship your personal page', kind: 'PROJECT', durationMins: 40 },
        ],
      },
    ],
  },
  {
    slug: 'cyber-safety-essentials',
    title: 'Cyber Safety Essentials',
    track: 'cyber',
    level: 'BEGINNER',
    gradeMin: 6,
    gradeMax: 8,
    durationMins: 300,
    summary: 'Strong passwords, safe browsing and being a good digital citizen.',
    outcomes: ['Create strong passwords', 'Spot scams and phishing', 'Protect your personal data'],
    tags: ['safety', 'privacy', 'citizenship'],
    modules: [
      {
        title: 'Stay Secure',
        lessons: [
          { title: 'Why passwords matter', kind: 'VIDEO', durationMins: 10, isPreview: true },
          { title: 'Spot the scam', kind: 'ACTIVITY', durationMins: 20 },
          {
            title: 'Checkpoint: password power',
            kind: 'QUIZ',
            durationMins: 10,
            quiz: [
              {
                prompt: 'Which password is safest?',
                options: [
                  { text: 'A long mix of letters, numbers and symbols', isCorrect: true },
                  { text: '123456' },
                  { text: 'password' },
                ],
              },
              {
                prompt: 'A phishing message usually…',
                options: [
                  { text: 'Urgently asks you to click a link', isCorrect: true },
                  { text: 'Comes from a contact you saved' },
                  { text: 'Has no links at all' },
                ],
              },
            ],
          },
        ],
      },
      {
        title: 'Be Responsible',
        lessons: [
          { title: 'Your digital footprint', kind: 'TEXT', durationMins: 12 },
          { title: 'Cyberbullying and kindness', kind: 'VIDEO', durationMins: 12 },
          { title: 'Make a safety poster', kind: 'PROJECT', durationMins: 25 },
        ],
      },
    ],
  },
  {
    slug: 'design-thinking-studio',
    title: 'Design Thinking Studio',
    track: 'design',
    level: 'INTERMEDIATE',
    gradeMin: 6,
    gradeMax: 8,
    durationMins: 360,
    summary: 'Solve real problems with empathy, ideas and prototyping.',
    outcomes: ['Run a design-thinking cycle', 'Sketch and prototype an idea', 'Give and use feedback'],
    tags: ['design', 'creativity', 'prototyping'],
    modules: [
      {
        title: 'Understand the Problem',
        lessons: [
          { title: 'Start with empathy', kind: 'VIDEO', durationMins: 10, isPreview: true },
          { title: 'Define the challenge', kind: 'ACTIVITY', durationMins: 20 },
          {
            title: 'Checkpoint',
            kind: 'QUIZ',
            durationMins: 8,
            quiz: [
              {
                prompt: 'Design thinking starts with…',
                options: [{ text: 'Empathy', isCorrect: true }, { text: 'Selling' }, { text: 'Coding' }],
              },
            ],
          },
        ],
      },
      {
        title: 'Ideate & Prototype',
        lessons: [
          { title: 'Brainstorming rules', kind: 'TEXT', durationMins: 10 },
          { title: 'Paper prototyping', kind: 'ACTIVITY', durationMins: 25 },
          { title: 'Pitch your solution', kind: 'PROJECT', durationMins: 30 },
        ],
      },
    ],
  },
];

async function seedCatalog() {
  for (const track of TRACKS) {
    await prisma.skillTrack.upsert({ where: { slug: track.slug }, update: track, create: track });
  }
  const tracks = await prisma.skillTrack.findMany();
  const trackId = (slug: string) => {
    const t = tracks.find((x) => x.slug === slug);
    if (!t) throw new Error(`[seed] unknown track ${slug}`);
    return t.id;
  };

  let created = 0;
  for (const c of COURSES) {
    const existing = await prisma.course.findUnique({ where: { slug: c.slug } });
    if (existing) continue;

    const course = await prisma.course.create({
      data: {
        slug: c.slug,
        title: c.title,
        summary: c.summary,
        skillTrackId: trackId(c.track),
        level: c.level,
        gradeMin: c.gradeMin,
        gradeMax: c.gradeMax,
        durationMins: c.durationMins,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        outcomes: c.outcomes,
        tags: c.tags,
        modules: {
          create: c.modules.map((m, mi) => ({
            title: m.title,
            summary: m.summary ?? null,
            sortOrder: mi,
            lessons: {
              create: m.lessons.map((l, li) => ({
                title: l.title,
                kind: l.kind,
                durationMins: l.durationMins ?? 0,
                isPreview: l.isPreview ?? false,
                contentBody: l.contentBody ?? null,
                contentUrl: l.contentUrl ?? null,
                sortOrder: li,
              })),
            },
          })),
        },
      },
      include: { modules: { include: { lessons: true } } },
    });

    for (const mod of course.modules) {
      const srcMod = c.modules.find((m) => m.title === mod.title);
      for (const lesson of mod.lessons) {
        const srcLesson = srcMod?.lessons.find((l) => l.title === lesson.title);
        if (!srcLesson?.quiz) continue;
        await prisma.quiz.create({
          data: {
            lessonId: lesson.id,
            passingScore: 60,
            questions: {
              create: srcLesson.quiz.map((q, qi) => ({
                prompt: q.prompt,
                sortOrder: qi,
                options: {
                  create: q.options.map((o, oi) => ({
                    text: o.text,
                    isCorrect: o.isCorrect ?? false,
                    sortOrder: oi,
                  })),
                },
              })),
            },
          },
        });
      }
    }
    created++;
  }
  console.log(`[seed] catalog: ${TRACKS.length} tracks, ${created} new courses (${COURSES.length} total)`);
}

async function seedLearning() {
  const schools = await prisma.school.findMany();
  const courses = await prisma.course.findMany({
    where: { status: 'PUBLISHED' },
    include: {
      modules: { orderBy: { sortOrder: 'asc' }, include: { lessons: { orderBy: { sortOrder: 'asc' } } } },
    },
  });

  let enrollments = 0;
  let assignments = 0;
  let attempts = 0;
  for (const school of schools) {
    for (const course of courses) {
      await prisma.schoolCourse.upsert({
        where: { schoolId_courseId: { schoolId: school.id, courseId: course.id } },
        update: { status: 'ENABLED' },
        create: { schoolId: school.id, courseId: course.id, status: 'ENABLED' },
      });
    }

    // Assign the school's teachers to a couple of courses each.
    const teachers = await prisma.membership.findMany({
      where: { schoolId: school.id, role: 'TEACHER', status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    });
    const assignmentPlan = [
      ['python-foundations', 'block-coding-scratch'],
      ['ai-for-young-minds', 'cyber-safety-essentials'],
    ];
    for (let i = 0; i < teachers.length; i++) {
      for (const slug of assignmentPlan[i % assignmentPlan.length]) {
        const target = courses.find((c) => c.slug === slug);
        if (!target) continue;
        const exists = await prisma.teacherCourseAssignment.findFirst({
          where: { schoolId: school.id, courseId: target.id, userId: teachers[i].userId },
        });
        if (exists) continue;
        await prisma.teacherCourseAssignment.create({
          data: { schoolId: school.id, courseId: target.id, userId: teachers[i].userId },
        });
        assignments++;
      }
    }

    const course = courses.find((c) => c.slug === 'python-foundations');
    if (!course) continue;
    const lessons = course.modules.flatMap((m) => m.lessons);
    const quiz = await prisma.quiz.findFirst({
      where: { lesson: { module: { courseId: course.id } } },
      include: { questions: { orderBy: { sortOrder: 'asc' }, include: { options: true } } },
    });

    const students = await prisma.membership.findMany({
      where: { schoolId: school.id, role: 'STUDENT' },
      orderBy: { rollNo: 'asc' },
      take: 4,
    });

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      let enrollment = await prisma.enrollment.findUnique({
        where: {
          schoolId_courseId_userId: { schoolId: school.id, courseId: course.id, userId: s.userId },
        },
      });
      if (!enrollment) {
        const completedCount = Math.min(i, lessons.length);
        const done = completedCount === lessons.length && lessons.length > 0;
        enrollment = await prisma.enrollment.create({
          data: {
            schoolId: school.id,
            courseId: course.id,
            userId: s.userId,
            status: done ? 'COMPLETED' : 'ACTIVE',
            progressPct: lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0,
            completedAt: done ? new Date() : null,
            lessonProgress: {
              create: lessons.slice(0, completedCount).map((l) => ({
                schoolId: school.id,
                lessonId: l.id,
                status: 'COMPLETED' as const,
                completedAt: new Date(),
              })),
            },
          },
        });
        enrollments++;
      }

      if (quiz && quiz.questions.length > 0) {
        const existingAttempt = await prisma.quizAttempt.findFirst({
          where: { schoolId: school.id, enrollmentId: enrollment.id, quizId: quiz.id },
        });
        if (!existingAttempt) {
          const passed = i !== 0;
          await prisma.quizAttempt.create({
            data: {
              schoolId: school.id,
              enrollmentId: enrollment.id,
              quizId: quiz.id,
              status: 'SUBMITTED',
              score: passed ? 100 : 0,
              passed,
              submittedAt: new Date(),
              answers: {
                create: quiz.questions.map((q) => {
                  const correct = q.options.find((o) => o.isCorrect) ?? q.options[0];
                  const wrong = q.options.find((o) => !o.isCorrect) ?? q.options[0];
                  const chosen = passed ? correct : wrong;
                  return { questionId: q.id, optionId: chosen.id, isCorrect: passed && chosen.isCorrect };
                }),
              },
            },
          });
          attempts++;
        }
      }
    }
  }
  console.log(
    `[seed] learning: courses enabled per school, ${assignments} teacher assignments, ${enrollments} enrollments, ${attempts} quiz attempts`
  );
}

async function seedCommerceBookingsCertificates() {
  const schools = await prisma.school.findMany();
  let invoices = 0;
  let bookings = 0;
  let certificates = 0;
  const year = new Date().getFullYear();

  for (const school of schools) {
    // A couple of demo invoices (one settled, one outstanding).
    const existingInvoices = await prisma.invoice.count({ where: { schoolId: school.id } });
    if (existingInvoices === 0) {
      await prisma.invoice.createMany({
        data: [
          {
            schoolId: school.id,
            number: `INV-${year}-0001`,
            amountPaise: 1_490_000,
            status: 'PAID',
            paidAt: new Date(),
            notes: 'Term 1 — annual plan',
          },
          {
            schoolId: school.id,
            number: `INV-${year}-0002`,
            amountPaise: 1_490_000,
            status: 'OPEN',
            notes: 'Term 2 — annual plan',
          },
        ],
      });
      invoices += 2;
    }

    // Demo bookings: one request, one confirmed.
    const existingBookings = await prisma.booking.count({ where: { schoolId: school.id } });
    if (existingBookings === 0) {
      await prisma.booking.createMany({
        data: [
          {
            schoolId: school.id,
            type: 'AI_SEMINAR',
            title: 'AI awareness seminar for parents',
            preferredAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21),
            mode: 'ONLINE',
            participants: 120,
            status: 'REQUESTED',
          },
          {
            schoolId: school.id,
            type: 'WORKSHOP',
            title: 'Python workshop for Class 6',
            preferredAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45),
            mode: 'ONSITE',
            participants: 40,
            status: 'CONFIRMED',
          },
        ],
      });
      bookings += 2;
    }

    // Certificates for any completed enrollment.
    const completed = await prisma.enrollment.findMany({
      where: { schoolId: school.id, status: 'COMPLETED' },
    });
    for (const e of completed) {
      const exists = await prisma.certificate.findFirst({
        where: { schoolId: school.id, courseId: e.courseId, userId: e.userId },
      });
      if (exists) continue;
      await prisma.certificate.create({
        data: {
          schoolId: school.id,
          courseId: e.courseId,
          userId: e.userId,
          serial: `TIE-${randomBytes(6).toString('hex').toUpperCase()}`,
        },
      });
      certificates++;
    }
  }
  console.log(
    `[seed] commerce/bookings/certificates: ${invoices} invoices, ${bookings} bookings, ${certificates} certificates`
  );
}

async function seedSchool(input: {
  name: string;
  shortName: string;
  plan: Plan;
  board: string;
  city: string;
  state: string;
  brandColor?: string;
  logoUrl?: string;
  studentCount: number;
  classFrom: number;
  classTo: number;
}) {
  const school = await prisma.school.upsert({
    where: { code: (await prisma.school.findFirst({ where: { name: input.name } }))?.code || code(input.name) },
    update: {},
    create: {
      code: code(input.name),
      name: input.name,
      shortName: input.shortName,
      board: input.board,
      city: input.city,
      state: input.state,
      plan: input.plan,
      brandColor: input.brandColor,
      logoUrl: input.logoUrl,
      referralCode: randomBytes(5).toString('hex').toUpperCase(),
    },
  });

  // School admin.
  const adminEmail = `principal@${input.shortName.toLowerCase()}.demo`;
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { name: `${input.shortName} Principal`, email: adminEmail, passwordHash: hash('Principal#2026') },
  });
  await prisma.membership.upsert({
    where: { schoolId_userId: { schoolId: school.id, userId: admin.id } },
    update: {},
    create: { schoolId: school.id, userId: admin.id, role: 'SCHOOL_ADMIN' },
  });

  // Two teachers.
  for (let t = 1; t <= 2; t++) {
    const email = `teacher${t}@${input.shortName.toLowerCase()}.demo`;
    const teacher = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { name: `${input.shortName} Teacher ${t}`, email, passwordHash: hash('Teacher#2026') },
    });
    await prisma.membership.upsert({
      where: { schoolId_userId: { schoolId: school.id, userId: teacher.id } },
      update: {},
      create: { schoolId: school.id, userId: teacher.id, role: 'TEACHER' },
    });
  }

  // Students.
  const span = input.classTo - input.classFrom + 1;
  for (let i = 0; i < input.studentCount; i++) {
    const cls = input.classFrom + (i % span);
    const section = ['A', 'B', 'C'][i % 3];
    const rollNo = `${2026}-${String(cls).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}`;
    const name = studentName(i);

    const existing = await prisma.membership.findFirst({ where: { schoolId: school.id, rollNo } });
    if (existing) continue;

    const student = await prisma.user.create({
      data: { name, phone: nextPhone() },
    });
    await prisma.membership.create({
      data: {
        schoolId: school.id,
        userId: student.id,
        role: 'STUDENT',
        classLevel: String(cls),
        section,
        rollNo,
        pinHash: hash('1234'),
      },
    });

    // A parent + consent for the first student of each school.
    if (i === 0) {
      const parent = await prisma.user.create({
        data: { name: `${name} (Parent)`, phone: nextPhone() },
      });
      await prisma.membership.create({
        data: { schoolId: school.id, userId: parent.id, role: 'PARENT' },
      });
      await prisma.parentConsent.create({
        data: { schoolId: school.id, subjectUserId: student.id, parentUserId: parent.id },
      });
    }
  }

  // Notices.
  const notices = [
    { title: 'Welcome to the new school portal', body: 'Sign in with your roll number to begin.', pinned: true },
    { title: 'Robotics Saturday', body: 'Class 5–8, Innovation Lab, 10 AM.', pinned: false },
  ];
  for (const n of notices) {
    const exists = await prisma.notice.findFirst({ where: { schoolId: school.id, title: n.title } });
    if (!exists) {
      await prisma.notice.create({
        data: { schoolId: school.id, title: n.title, body: n.body, pinned: n.pinned },
      });
    }
  }

  console.log(`[seed] ${input.name} (${school.code}, ${input.plan}) → ${input.studentCount} students`);
  return school;
}

async function main() {
  await resetIfRequested();

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@tieedu.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe#2026';
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { name: 'TieEdu Admin', email: adminEmail, passwordHash: hash(adminPassword), role: 'SUPER_ADMIN' },
  });
  console.log(`[seed] platform admin: ${adminEmail} / ${adminPassword}`);

  await seedSchool({
    name: 'Sunrise Public School',
    shortName: 'Sunrise',
    plan: 'PRO',
    board: 'CBSE',
    city: 'Jaipur',
    state: 'Rajasthan',
    studentCount: 25,
    classFrom: 3,
    classTo: 8,
  });

  await seedSchool({
    name: 'Green Valley Tech Academy',
    shortName: 'GreenValley',
    plan: 'PREMIUM',
    board: 'ICSE',
    city: 'Pune',
    state: 'Maharashtra',
    brandColor: '#0F766E',
    studentCount: 25,
    classFrom: 5,
    classTo: 12,
  });

  await seedCatalog();
  await seedLearning();
  await seedCommerceBookingsCertificates();

  console.log('[seed] done. Student demo login: <school code> + roll no + PIN 1234');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
