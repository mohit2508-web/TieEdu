// ============================================================================
// C COURSE — authoring helpers.
//
// The existing seedCourses.ts builds a single course inline. A course this size
// is split across one file per module, so these factories do two jobs:
//
//   1. Block/lesson/quiz construction, so a lesson reads as content rather than
//      as JSON-shaped plumbing.
//   2. Deterministic id generation. Block ids are unique per lesson (block_seq
//      in the old seed file was module-level and would collide on a second
//      call), and the ids are stable across runs so re-seeding a lesson is a
//      no-op diff rather than a full rewrite.
//
// Nothing here is validated. courseAdmin.routes.ts normalises and validates on
// the admin API; seeded content is authored in-repo and typechecked, so the
// save path is not the only thing standing between a typo and the database.
// ============================================================================

import { ContentBlockRecord, CourseLesson, CourseModule, LessonQuiz, QuizQuestion } from '../db';

type BlockType = ContentBlockRecord['block_type'];

export interface Blocks {
  md(text: string): ContentBlockRecord;
  /** A titled lead-in. Purely a markdown `###` with a stable visual weight. */
  lead(text: string): ContentBlockRecord;
  code(code: string, filename: string, language?: string, complexity?: string): ContentBlockRecord;
  tip(title: string, text: string): ContentBlockRecord;
  warn(title: string, text: string): ContentBlockRecord;
  info(title: string, text: string): ContentBlockRecord;
  table(title: string, headers: string[], rows: string[][]): ContentBlockRecord;
  steps(title: string, list: { title: string; desc: string; code_snippet?: string }[]): ContentBlockRecord;
  checklist(title: string, items: string[]): ContentBlockRecord;
  resources(title: string, links: { label: string; url: string }[]): ContentBlockRecord;
  diagram(title: string, source: string): ContentBlockRecord;
  /** The interactive teaching visualisations from components/blocks/CourseAnimations. */
  anim(kind: string, config: Record<string, any>): ContentBlockRecord;
}

/** One factory per lesson, so every block id is namespaced by lesson id. */
export function createBlocks(lessonId: string): Blocks {
  let n = 0;
  const blk = (block_type: BlockType, payload: Record<string, any>): ContentBlockRecord => {
    n += 1;
    return { id: `${lessonId}-b${String(n).padStart(2, '0')}`, block_type, block_order: n, payload };
  };

  const md = (text: string) => blk('markdown', { text });
  const lead = (text: string) => blk('markdown', { text: `### ${text}` });
  const code = (c: string, filename: string, language = 'c', complexity?: string) =>
    blk('code', complexity ? { code: c, filename, language, complexity } : { code: c, filename, language });
  const tip = (title: string, text: string) => blk('callout', { style: 'tip', title, text });
  const warn = (title: string, text: string) => blk('callout', { style: 'warning', title, text });
  const info = (title: string, text: string) => blk('callout', { style: 'info', title, text });
  const table = (title: string, headers: string[], rows: string[][]) =>
    blk('table', { title, headers, rows });
  const steps = (title: string, list: { title: string; desc: string; code_snippet?: string }[]) =>
    blk('steps', { title, steps: list });
  const checklist = (title: string, items: string[]) => blk('checklist', { title, items });
  const resources = (title: string, links: { label: string; url: string }[]) =>
    blk('resources', { title, links });
  const diagram = (title: string, source: string) => blk('diagram', { title, source });
  const anim = (kind: string, config: Record<string, any>) => blk('animation', { kind, ...config });

  return {
    md, lead, code, tip, warn, info, table, steps, checklist, resources, diagram, anim,
  };
}

/**
 * A titled code example, as two blocks. The heading is a real block because
 * markdown inside the same block would be rendered inside the code sample,
 * where a reader cannot tell prose from code.
 */
export function snippet(
  b: Blocks, title: string, code: string, filename: string, language = 'c'
): ContentBlockRecord[] {
  return [b.md(`#### ${title}`), b.code(code, filename, language)];
}

/* ---------------------------------------------------------------------------
   Quiz construction

   Answer keys never leave the server (see lib/courses.ts sanitizeQuizForLearner),
   so `correct` is an index into `options`. Questions are authored as a tuple so
   the answer and its explanation sit next to each other, which is the only way
   they stay in sync when a question is edited.
   --------------------------------------------------------------------------- */

export type Q = [prompt: string, options: string[], correct: number, explanation: string];

export function quiz(quizId: string, questions: Q[], passingPercent = 70): LessonQuiz {
  const qs: QuizQuestion[] = questions.map(([prompt, options, correct, explanation], i) => ({
    id: `${quizId}-q${i + 1}`,
    prompt,
    options,
    correct_index: correct,
    explanation,
  }));
  return { id: quizId, passing_percent: passingPercent, questions: qs };
}

/* ---------------------------------------------------------------------------
   Lesson / module construction
   --------------------------------------------------------------------------- */

export interface LessonSpec {
  title: string;
  summary: string;
  duration: number;
  xp?: number;
  build: (b: Blocks) => ContentBlockRecord[];
  questions?: Q[];
  passing?: number;
}

export function lesson(moduleId: string, slug: string, order: number, spec: LessonSpec): CourseLesson {
  const id = `cfl-${slug}-${order}`;
  const b = createBlocks(id);
  const out: CourseLesson = {
    id,
    module_id: moduleId,
    title: spec.title,
    summary: spec.summary,
    sort_order: order,
    duration_minutes: spec.duration,
    xp_reward: spec.xp ?? 25,
    video: null,
    blocks: spec.build(b),
    quiz: null,
  };
  if (spec.questions && spec.questions.length > 0) {
    out.quiz = quiz(`cql-${slug}-${order}`, spec.questions, spec.passing ?? 70);
  }
  return out;
}

export function mod(
  courseId: string,
  slug: string,
  order: number,
  title: string,
  summary: string,
  lessons: LessonSpec[]
): CourseModule {
  const id = `crm-${slug}-${order}`;
  return {
    id,
    course_id: courseId,
    title,
    summary,
    sort_order: order,
    lessons: lessons.map((spec, i) => lesson(id, slug, i + 1, spec)),
  };
}
