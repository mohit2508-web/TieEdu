import { M1 } from '../src/data/pythonCourse/modules/m01';
import { M2 } from '../src/data/pythonCourse/modules/m02';
import { M3 } from '../src/data/pythonCourse/modules/m03';
import { M4 } from '../src/data/pythonCourse/modules/m04';
import { M5 } from '../src/data/pythonCourse/modules/m05';
import { M6 } from '../src/data/pythonCourse/modules/m06';
import { M7 } from '../src/data/pythonCourse/modules/m07';
import { M8 } from '../src/data/pythonCourse/modules/m08';
import { M9 } from '../src/data/pythonCourse/modules/m09';
import { M10 } from '../src/data/pythonCourse/modules/m10';
import { M11 } from '../src/data/pythonCourse/modules/m11';
import { M12 } from '../src/data/pythonCourse/modules/m12';
import { M13 } from '../src/data/pythonCourse/modules/m13';
import { M14 } from '../src/data/pythonCourse/modules/m14';
import { M15 } from '../src/data/pythonCourse/modules/m15';
import { PYTHON_PROGRAMMING_COURSE_ID, getPythonProgrammingCourse } from '../src/data/pythonCourse';
import { getCProgrammingCourse } from '../src/data/cCourse';
import { validateCourseModules } from './course-validate';

const mods = [M1, M2, M3, M4, M5, M6, M7, M8, M9, M10, M11, M12, M13, M14, M15];

/*
 * The Python course is held to a stricter bar than the C one on purpose: it is
 * the course the catalogue leads with for beginners, and a beginner who lands
 * on an empty animation or a quiz with an ambiguous answer is lost in the first
 * five minutes. Every lesson must have code to run, prose to read, and something
 * interactive to click.
 */
const errs = validateCourseModules('[py]', mods, {
  expectCourseId: PYTHON_PROGRAMMING_COURSE_ID,
  requireAnimationPerLesson: true,
  requireCodePerLesson: true,
  requireProsePerLesson: true,
  requireDiagramPerModule: true,
  requireQuizPerLesson: true,
  exactOptionCount: 4,
  minExplanationLength: 40,
});

/* The assembled catalogue record must carry the same modules, in the same
   order, or the learner's URL and the seeded content disagree. */
const course = getPythonProgrammingCourse();
if (course.modules.length !== mods.length) {
  errs.push(`[py] <index>: course assembles ${course.modules.length} modules but ${mods.length} are authored`);
}
course.modules.forEach((m, i) => {
  if (m.id !== mods[i].id) errs.push(`[py] <index>: module ${i + 1} is ${m.id}, expected ${mods[i].id}`);
  if (m.lessons.length !== mods[i].lessons.length) {
    errs.push(`[py] <index>: ${m.id} assembles ${m.lessons.length} lessons but ${mods[i].lessons.length} are authored`);
  }
});
if (!course.is_free || course.price_inr !== 0) errs.push('[py] <index>: course must be free');
if (!course.published) errs.push('[py] <index>: course must be published');
if (course.outcomes.length < 5) errs.push('[py] <index>: fewer than 5 stated outcomes');

/* Ids must not collide with the C course, which shares the block store. */
const foreign = new Set<string>();
for (const m of course.modules) {
  for (const les of m.lessons) {
    for (const b of les.blocks) foreign.add(b.id);
    if (les.quiz) for (const q of les.quiz.questions) foreign.add(q.id);
  }
}
for (const cMod of getCProgrammingCourse().modules) {
  if (foreign.has(cMod.id)) errs.push(`[py] <index>: module id ${cMod.id} collides with the C course`);
  for (const les of cMod.lessons) {
    if (foreign.has(les.id)) errs.push(`[py] <index>: lesson id ${les.id} collides with the C course`);
    for (const b of les.blocks) {
      if (foreign.has(b.id)) errs.push(`[py] <index>: block id ${b.id} collides with the C course`);
    }
  }
}

if (errs.length) {
  console.error(`FAIL: ${errs.length} animation/content problem(s) in the Python course:\n`);
  for (const e of errs) console.error('  - ' + e);
  process.exit(1);
}

const lessons = mods.reduce((n, m) => n + m.lessons.length, 0);
const blocks = mods.reduce((n, m) => n + m.lessons.reduce((k, l) => k + l.blocks.length, 0), 0);
const questions = mods.reduce(
  (n, m) => n + m.lessons.reduce((k, l) => k + (l.quiz ? l.quiz.questions.length : 0), 0),
  0
);
const anims = mods.reduce(
  (n, m) => n + m.lessons.reduce((k, l) => k + l.blocks.filter((b) => b.block_type === 'animation').length, 0),
  0
);
const diagrams = mods.reduce(
  (n, m) => n + m.lessons.reduce((k, l) => k + l.blocks.filter((b) => b.block_type === 'diagram').length, 0),
  0
);
console.log(
  `OK: Python course — ${mods.length} modules, ${lessons} lessons, ${blocks} blocks, ` +
    `${anims} animations, ${diagrams} diagrams, ${questions} quiz questions.`
);
