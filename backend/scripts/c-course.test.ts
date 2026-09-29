import { M1 } from '../src/data/cCourse/modules/m01';
import { M2 } from '../src/data/cCourse/modules/m02';
import { M3 } from '../src/data/cCourse/modules/m03';
import { M4 } from '../src/data/cCourse/modules/m04';
import { M5 } from '../src/data/cCourse/modules/m05';
import { M6 } from '../src/data/cCourse/modules/m06';
import { M7 } from '../src/data/cCourse/modules/m07';
import { M8 } from '../src/data/cCourse/modules/m08';
import { M9 } from '../src/data/cCourse/modules/m09';
import { M10 } from '../src/data/cCourse/modules/m10';
import { M11 } from '../src/data/cCourse/modules/m11';
import { M12 } from '../src/data/cCourse/modules/m12';
import { M13 } from '../src/data/cCourse/modules/m13';
import { M14 } from '../src/data/cCourse/modules/m14';
import { M15 } from '../src/data/cCourse/modules/m15';
import { C_PROGRAMMING_COURSE_ID } from '../src/data/cCourse';
import { validateCourseModules } from './course-validate';

const mods = [M1, M2, M3, M4, M5, M6, M7, M8, M9, M10, M11, M12, M13, M14, M15];
const errs = validateCourseModules('[c]', mods, { expectCourseId: C_PROGRAMMING_COURSE_ID });

if (errs.length) {
  console.error(`FAIL: ${errs.length} animation/content problem(s) in the C course:\n`);
  for (const e of errs) console.error('  - ' + e);
  process.exit(1);
}
console.log(
  `OK: C course — ${mods.length} modules, ${mods.reduce((n, m) => n + m.lessons.length, 0)} lessons — animation schemas valid.`
);
