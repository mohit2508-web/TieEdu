// ============================================================================
// C PROGRAMMING — a second free, complete course.
//
// The authored modules live one-per-file under ./modules. This file assembles
// them into a single `Course` and holds the catalogue-level metadata (title,
// description, outcomes, level) that a learner sees before opening a lesson.
//
// The course is deliberately long: fifteen modules take a beginner from "what
// is a compiler" to building a reusable string/map library and a binary search
// tree, with a final cumulative assessment. Every module is real content backed
// by the interactive visualisations in CourseAnimations.tsx, and every lesson
// has a server-graded quiz where one is useful.
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

export const C_PROGRAMMING_COURSE_ID = 'crs-c-programming';
export const C_PROGRAMMING_COURSE_SLUG = 'c-programming';

export function getCProgrammingCourse(): Course {
  return {
    id: C_PROGRAMMING_COURSE_ID,
    slug: C_PROGRAMMING_COURSE_SLUG,
    title: 'C Programming: From First Program to Pointers and Data Structures',
    subtitle: 'A free, deep, hands-on C course — the language underneath almost everything else',
    description: `Most courses teach you C syntax and stop. This one teaches you the *machine*: what a compiler actually does, how memory is laid out, why pointers behave the way they do, and how to reason about a program that has no garbage collector and no safety net.

Fifteen modules take you from writing and compiling your first program through types, control flow, functions, arrays, pointers, dynamic memory, structs, files, the preprocessor, and the standard library — then close with two capstones (a reusable dynamic string and string map, and a recursively destroyed binary search tree) and a cumulative final assessment.

Every lesson is short, runs real compilable C, and is paired with interactive visualisations: watch the stack and heap change step by step, trace a program line by line, see bytes and bit-fields laid out, and follow arguments across a function call. There is no sign-up wall and no paid tier — finish the modules, pass the quizzes, and you earn a verifiable TieEdu certificate plus XP on the leaderboard.

**Who this is for:** students who have finished Coding Foundations or written a little code in any language, and anyone preparing for placements who needs to be able to read and write C with confidence.

**What you need:** a terminal and a C compiler (gcc or clang). Module 1 walks you through installing one in about five minutes.`,
    category: 'Computer Science',
    level: 'intermediate',
    is_free: true,
    price_inr: 0,
    thumbnail_url: '',
    tags: ['c', 'systems', 'memory', 'pointers', 'data-structures', 'placement'],
    outcomes: [
      'Compile and run a C program and explain every stage between source and process',
      'Choose the right type, understand representation and limits, and avoid conversion traps',
      'Read and write pointers, pointer arithmetic, and the pass-by-value/pass-by-pointer distinction',
      'Manage heap memory correctly: allocate, check, bound, free exactly once, and detect leaks',
      'Use arrays, strings, structs, unions, enums, files, and the standard library confidently',
      'Recognise undefined behaviour and use warnings and sanitizers to find bugs before they ship',
      'Build reusable C containers with a clear ownership contract, from interface to implementation',
    ],
    prerequisite_course_id: null,
    certificate_eligible: true,
    published: true,
    created_at: '2026-02-01T09:00:00.000Z',
    updated_at: '2026-02-01T09:00:00.000Z',
    modules: [M1, M2, M3, M4, M5, M6, M7, M8, M9, M10, M11, M12, M13, M14, M15],
  };
}
