/**
 * Wipro iOS Developer Training (Swift), from the owner's curriculum sheet
 * (WIPRO_IOS_3T_PLAN.md): 12 modules, 4 assessment milestones and a final.
 * The schedule drives the day-by-day Plan; lessons and questions per milestone
 * live in m1.ts, m2.ts … and switch on as they are added.
 */
import type { Lesson } from '../interviewPrep/infosysSELessons';
import type { MKey, WLesson, WQuestion } from './types';
import { M1_LESSONS, M1_QUESTIONS } from './m1';
import { M2_LESSONS, M2_QUESTIONS } from './m2';
import { M3_LESSONS, M3_QUESTIONS } from './m3';
import { M4_LESSONS, M4_QUESTIONS } from './m4';
import { FINAL_LESSONS, FINAL_QUESTIONS } from './final';

export type { MKey, WLesson, WQuestion } from './types';

export const WIPRO_IOS_SLUG = 'wipro-ios-swift';

/**
 * Module → [start, end] dates (inclusive) and the milestone it counts toward.
 * Owner, 2026-11-04: the Wipro final test is on 15 Nov, so the whole course is
 * compressed to end then. Modules 1–2 keep their sheet dates (already past).
 */
export const MODULES: Record<number, { start: string; end: string; m: MKey }> = {
  1: { start: '2026-10-30', end: '2026-10-30', m: 'm1' },
  2: { start: '2026-11-02', end: '2026-11-04', m: 'm1' },
  3: { start: '2026-11-05', end: '2026-11-06', m: 'm1' },
  4: { start: '2026-11-07', end: '2026-11-07', m: 'm1' },
  5: { start: '2026-11-08', end: '2026-11-08', m: 'm2' },
  6: { start: '2026-11-09', end: '2026-11-09', m: 'm2' },
  7: { start: '2026-11-10', end: '2026-11-10', m: 'm3' },
  8: { start: '2026-11-11', end: '2026-11-11', m: 'm3' },
  9: { start: '2026-11-12', end: '2026-11-12', m: 'm4' },
  10: { start: '2026-11-13', end: '2026-11-13', m: 'm4' },
  11: { start: '2026-11-14', end: '2026-11-14', m: 'final' },
  12: { start: '2026-11-14', end: '2026-11-14', m: 'final' },
};

/** Section label used as the lesson-title prefix ("M1: …") and in the reader. */
export const SECTION_LABEL: Record<MKey, string> = { m1: 'M1', m2: 'M2', m3: 'M3', m4: 'M4', final: 'Final' };

export const MILESTONES: Array<{ key: MKey; name: string; date: string; modules: string }> = [
  { key: 'm1', name: 'Milestone 1 · Swift foundations', date: '2026-11-07', modules: 'Modules 1–4' },
  { key: 'm2', name: 'Milestone 2 · Architecture & concurrency', date: '2026-11-10', modules: 'Modules 5–6' },
  { key: 'm3', name: 'Milestone 3 · Networking & UIKit', date: '2026-11-12', modules: 'Modules 7–8' },
  { key: 'm4', name: 'Milestone 4 · SwiftUI & project setup', date: '2026-11-14', modules: 'Modules 9–10' },
  // The Wipro final test day: Final section test plus the full course mock.
  { key: 'final', name: 'Final · Wipro test day', date: '2026-11-15', modules: 'Modules 1–12' },
];

/** Every topic on the sheet, in order: [module, title]. Lessons not written yet still show in the plan as "coming". */
export const TOPICS: Array<[number, string]> = [
  [1, 'Xcode Installation & Simulator Setup'], [1, 'Swift Playgrounds Basics'], [1, 'Git & GitHub Integration in Xcode'],
  [2, 'What is Swift & Swift Features'], [2, 'Constants, Variables & Type Inference'], [2, 'Swift Operators'],
  [2, 'Collections (Array, Set, Dictionary)'], [2, 'Enumerations (Enums)'], [2, 'Structures (Struct) vs Classes'],
  [2, 'Access Control (private, public, open)'], [2, 'Swift Optionals & Unwrapping'], [2, 'ARC & Memory Management (Weak/Unowned)'],
  [3, 'Functions & Argument Labels'], [3, 'Closures & Trailing Closure Syntax'], [3, 'Higher-Order Functions (map, filter, reduce)'],
  [3, 'Protocols & Protocol Extensions'], [3, 'Generics & Generic Constraints'], [3, 'Extensions & Protocol Conformance'],
  [3, 'Error Handling (throws, try, do-catch)'],
  [4, 'UIKit (Imperative) vs SwiftUI (Declarative)'],
  [5, 'MVC Architecture'], [5, 'MVVM Architecture'], [5, 'App Life Cycle (AppDelegate / SceneDelegate / scenePhase)'], [5, 'View Life Cycle (viewDidLoad vs onAppear)'],
  [6, 'Grand Central Dispatch (GCD) & Queues'], [6, 'Async / Await Modern Concurrency'], [6, 'Tasks & Task Groups'], [6, 'Actors & @MainActor Thread Safety'],
  [7, 'URLSession HTTP Networking'], [7, 'JSON Parsing with Codable Protocol'],
  [8, 'UIView & UIViewController Hierarchy'], [8, 'Storyboards, IBOutlets & IBActions'], [8, 'Auto Layout & Layout Constraints'], [8, 'UI Controls & UITableView'],
  [9, 'What is SwiftUI & App Structure'], [9, 'SwiftUI Layouts (Stacks, Forms, Grids)'], [9, 'State Management (@State, @Binding, @Observable)'], [9, 'NavigationStack & TabView'],
  [10, 'Xcode Project Targets & Build Settings'], [10, 'Info.plist Permissions & Configuration'],
  [11, 'Unit Testing with XCTest & Mocks'],
  [12, 'Xcode Instruments (Time Profiler, Leaks)'],
];

export const WIPRO_IOS_LESSONS_RICH: WLesson[] = [...M1_LESSONS, ...M2_LESSONS, ...M3_LESSONS, ...M4_LESSONS, ...FINAL_LESSONS];
export const WIPRO_IOS_BANK: WQuestion[] = [...M1_QUESTIONS, ...M2_QUESTIONS, ...M3_QUESTIONS, ...M4_QUESTIONS, ...FINAL_QUESTIONS];

/** Lesson tuples for the shared seeding code: [section, title, rules, first example, trap]. */
export const WIPRO_IOS_LESSONS: Lesson[] = WIPRO_IOS_LESSONS_RICH.map((l) => [SECTION_LABEL[l.m], l.title, l.rules, l.examples[0], l.trap]);

/** Reader extras keyed by title. Practice questions are matched by their `lesson` tag, so `match` never fires. */
export const WIPRO_IOS_LESSON_EXTRAS: Record<string, { what: string; examples: string[]; match: RegExp; doc: { label: string; url: string }; task: string; module: number }> =
  Object.fromEntries(WIPRO_IOS_LESSONS_RICH.map((l) => [l.title, {
    what: l.what, examples: l.examples.slice(1), match: /$^/, doc: { label: l.doc[0], url: l.doc[1] }, task: l.task, module: l.module,
  }]));

const addDays = (day: string, n: number) => new Date(new Date(day + 'T00:00:00Z').getTime() + n * 86400000).toISOString().slice(0, 10);
const span = (a: string, b: string) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000) + 1;

/**
 * The curriculum as days: each module's topics spread evenly over its dates,
 * plus a milestone test on each milestone day. Item titles are the lesson
 * titles with their section prefix ("M1: Swift Operators").
 */
export function curriculumDays(): Array<{ date: string; lessons: string[]; milestone?: MKey }> {
  const days = new Map<string, { date: string; lessons: string[]; milestone?: MKey }>();
  const day = (d: string) => { if (!days.has(d)) days.set(d, { date: d, lessons: [] }); return days.get(d)!; };
  for (const [mod, info] of Object.entries(MODULES)) {
    const topics = TOPICS.filter(([m]) => m === Number(mod)).map(([, t]) => t);
    const n = span(info.start, info.end);
    topics.forEach((t, i) => day(addDays(info.start, Math.floor((i * n) / topics.length))).lessons.push(`${SECTION_LABEL[info.m]}: ${t}`));
  }
  for (const ms of MILESTONES) day(ms.date).milestone = ms.key;
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}
