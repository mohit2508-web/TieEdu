// ============================================================================
// PYTHON PROGRAMMING — a complete, free, deep course.
//
// The authored modules live one-per-file under ./modules. This file assembles
// them into a single `Course` and holds the catalogue-level metadata (title,
// description, outcomes, level) that a learner sees before opening a lesson.
//
// It is a sibling of ../cCourse and deliberately not a fork of it: same shape,
// same authoring helpers, separate id prefixes and separate module files, so
// that a change to one curriculum can never rewrite the other course's seed
// data. Both are reachable from the catalogue as ordinary free courses.
//
// The course is fifteen modules and forty-six lessons, taking a beginner from
// "what is a .py file" through the object model, scoping, closures, generators,
// exceptions, the import system, classes and dataclasses, the standard library
// and testing — then closes with a multi-module capstone (a command-line task
// tracker with JSON persistence, a real package layout and a test suite) and a
// twelve-question cumulative assessment.
// ============================================================================

import { Course } from '../db';
import { M1 } from './modules/m01';
import { M2 } from './modules/m02';
import { M3 } from './modules/m03';
import { M4 } from './modules/m04';
import { M5 } from './modules/m05';
import { M6 } from './modules/m06';
import { M7 } from './modules/m07';
import { M8 } from './modules/m08';
import { M9 } from './modules/m09';
import { M10 } from './modules/m10';
import { M11 } from './modules/m11';
import { M12 } from './modules/m12';
import { M13 } from './modules/m13';
import { M14 } from './modules/m14';
import { M15 } from './modules/m15';

export const PYTHON_PROGRAMMING_COURSE_ID = 'crs-python-programming';
export const PYTHON_PROGRAMMING_COURSE_SLUG = 'python-programming';

export function getPythonProgrammingCourse(): Course {
  return {
    id: PYTHON_PROGRAMMING_COURSE_ID,
    slug: PYTHON_PROGRAMMING_COURSE_SLUG,
    title: 'Python Programming: From First Script to Packages, Classes and Testing',
    subtitle: 'A free, deep, hands-on Python course — the language the industry actually runs on',
    description: `Most Python courses teach you syntax and stop. This one teaches you the *model*: what an object is, what a name binds to, why assignment never copies, what a closure captures, when a generator beats a list, and why most of the "gotchas" you have heard about are really consequences of four rules you can hold in your head.

Fifteen modules take you from running your first script and reading a traceback bottom-up, through types and operators, strings, lists, tuples, dictionaries and sets, control flow, functions, recursion, scope and closures, comprehensions and lazy iteration, exceptions — then files, JSON, the import system, classes, dataclasses and the standard library, testing and honest performance work. It closes with a capstone you would actually ship: a command-line task tracker with a proper package layout, JSON persistence, \`argparse\`, input validation and a test suite.

Every lesson runs real, correct Python and is paired with interactive visualisations: step through the bytecode pipeline from \`.py\` file to printed output, trace a program line by line with a live variable table, watch arguments bind across a call, unwind a recursive call stack, watch a generator suspend at a \`yield\`, and follow an exception up through four frames into one traceback.

**Who this is for:** absolute beginners who want one language taken seriously, students who have finished Coding Foundations, and anyone preparing for placements who needs to read and write idiomatic Python with confidence.

**What you need:** nothing. Python runs from a single installer, every example in the course is self-contained, and the interactive visualisations run in this page.`,
    category: 'Computer Science',
    level: 'beginner',
    is_free: true,
    price_inr: 0,
    thumbnail_url: '',
    tags: ['python', 'beginner', 'data-structures', 'oop', 'testing', 'placement'],
    outcomes: [
      'Run Python from a terminal and the REPL, and explain how source becomes bytecode and runs on the Python Virtual Machine',
      'Read and write the core language: names and binding, types, operators, strings, lists, tuples, dicts, sets and control flow',
      'Explain the object model — that assignment binds a name to an object, that nothing is copied implicitly, and that `is` and `==` answer different questions',
      'Write functions that compose: parameters, defaults, keyword-only arguments, recursion, call frames, scope, closures and first-class functions',
      'Choose between eager and lazy: comprehensions, iterators, generators, and when a plain list is the right answer',
      'Handle failure deliberately with exceptions, custom exception types, chaining, and a debugging routine that does not rely on guesswork',
      'Structure real projects: files with context managers, JSON and CSV, packages, `__init__.py`, `__main__` guards and tests',
      'Model data with classes, `__init__`, properties, dataclasses, `Enum` and composition, and know when a dict is the better tool',
      'Measure before optimising, and know which "optimisations" are real and which are folklore',
    ],
    prerequisite_course_id: null,
    certificate_eligible: true,
    published: true,
    created_at: '2026-03-01T09:00:00.000Z',
    updated_at: '2026-03-01T09:00:00.000Z',
    modules: [M1, M2, M3, M4, M5, M6, M7, M8, M9, M10, M11, M12, M13, M14, M15],
  };
}
