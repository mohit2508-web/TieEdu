// ============================================================================
// Course content validator — shared by every authored course.
//
// Why this exists: the animation payloads are typed `any` on the frontend. A
// misspelled field name typechecks cleanly and then renders as an empty box in
// the browser, where nobody notices until a learner opens the lesson. So the
// schema of every animation is checked here instead, against the components that
// actually consume it in frontend/src/components/blocks/CourseAnimations.tsx.
//
// The checks that are not schema checks are the ones that keep content quality
// from decaying: unique ids, contiguous ordering, a quiz that can actually be
// marked, and a lesson that is not just a quiz with no explanation. Those are
// opt-in per course, because a course may legitimately have a lesson with no
// animation and a quiz with two options.
// ============================================================================

import {
  ALL_BLOCK_TYPES,
  CERT_TIERS,
  COURSE_BRANCHES,
  COURSE_BUCKETS,
  EXAM_DIFFICULTIES,
} from '../src/data/db';
import type { Course, CourseModule } from '../src/data/db';

/** The kinds the frontend REGISTRY can actually render. */
export const ANIMATION_KINDS = [
  'memory', 'passing', 'callstack', 'trace', 'types',
  'bits', 'expression', 'pipeline', 'stackheap', 'nodes', 'step',
];

/** Tones that resolve to a real colour in TONE[] in CourseAnimations.tsx. */
export const TONES = [
  'int', 'ptr', 'char', 'float', 'pad', 'code', 'data', 'heap', 'stack',
  'auto', 'static', 'free', 'null', 'warn', 'ok', 'bad', 'text', 'bss', 'io',
];

export interface ValidateOptions {
  /** Every lesson must contain at least one animation block. */
  requireAnimationPerLesson?: boolean;
  /** Every lesson must contain at least one code block. */
  requireCodePerLesson?: boolean;
  /** Every lesson must contain at least one prose block, table, or callout. */
  requireProsePerLesson?: boolean;
  /** Every module must contain at least one diagram block. */
  requireDiagramPerModule?: boolean;
  /** Every quiz question must have exactly this many options. */
  exactOptionCount?: number;
  /** Every quiz question must have an explanation of at least this many chars. */
  minExplanationLength?: number;
  /** Every lesson must carry a quiz. */
  requireQuizPerLesson?: boolean;
  /** The course id every module must declare. */
  expectCourseId?: string;
}

const isArr = (v: any): boolean => Array.isArray(v);
const isStr = (v: any): v is string => typeof v === 'string';

export function validateCourseModules(
  label: string,
  mods: CourseModule[],
  opts: ValidateOptions = {}
): string[] {
  const errs: string[] = [];
  const fail = (where: string, msg: string) => errs.push(`${label} ${where}: ${msg}`);

  if (mods.length === 0) fail('<course>', 'no modules');

  const moduleIds = new Set<string>();
  const lessonIds = new Set<string>();
  const blockIds = new Set<string>();
  const blockTypeSet = new Set<string>(ALL_BLOCK_TYPES as readonly string[]);

  let lessonTotal = 0;
  let animTotal = 0;
  let diagramTotal = 0;
  let quizTotal = 0;
  const kindHistogram = new Map<string, number>();

  mods.forEach((m, mi) => {
    const mWhere = `module ${m.id}`;
    if (moduleIds.has(m.id)) fail(mWhere, 'duplicate module id');
    moduleIds.add(m.id);
    if (m.sort_order !== mi + 1) fail(mWhere, `sort_order ${m.sort_order} != position ${mi + 1}`);
    if (opts.expectCourseId && m.course_id !== opts.expectCourseId) {
      fail(mWhere, `course_id "${m.course_id}" !== expected "${opts.expectCourseId}"`);
    }
    if (!isStr(m.title) || !m.title.trim()) fail(mWhere, 'missing title');
    if (!isArr(m.lessons) || m.lessons.length === 0) {
      fail(mWhere, 'no lessons');
      return;
    }

    let moduleHasDiagram = false;

    m.lessons.forEach((les, li) => {
      lessonTotal += 1;
      const lWhere = `lesson ${les.id}`;

      if (lessonIds.has(les.id)) fail(lWhere, 'duplicate lesson id');
      lessonIds.add(les.id);
      if (les.sort_order !== li + 1) fail(lWhere, `sort_order ${les.sort_order} != position ${li + 1}`);
      if (les.module_id !== m.id) fail(lWhere, `module_id "${les.module_id}" !== "${m.id}"`);
      if (!isStr(les.title) || !les.title.trim()) fail(lWhere, 'missing title');
      if (typeof les.duration_minutes !== 'number' || les.duration_minutes <= 0) fail(lWhere, 'bad duration');
      if (!isArr(les.blocks) || les.blocks.length === 0) {
        fail(lWhere, 'no blocks');
        return;
      }

      let hasAnim = false;
      let hasCode = false;
      let hasProse = false;
      let order = 0;

      les.blocks.forEach((b) => {
        order += 1;
        const where = `${lWhere}/${b.id}`;
        if (blockIds.has(b.id)) fail(where, 'duplicate block id');
        blockIds.add(b.id);
        if (b.block_order !== order) fail(where, `block_order ${b.block_order} != position ${order}`);
        if (!blockTypeSet.has(b.block_type)) fail(where, `unknown block_type "${b.block_type}"`);

        switch (b.block_type) {
          case 'code': hasCode = true; break;
          case 'markdown':
            hasProse = true;
            // A fenced block inside markdown is rendered with rehype-highlight,
            // so it is a real code example. It just lacks the filename label,
            // copy button and line numbers that a `code` block gets, which is a
            // style difference rather than a missing example.
            if (/^```[a-z]/m.test(String(b.payload?.text || ''))) hasCode = true;
            break;
          case 'table':
          case 'callout':
          case 'steps':
          case 'checklist':
          case 'resources': hasProse = true; break;
          case 'diagram':
            moduleHasDiagram = true;
            diagramTotal += 1;
            if (!isStr(b.payload?.source) || !b.payload.source.trim()) {
              fail(where, 'diagram needs a mermaid source string');
            }
            break;
          case 'animation': {
            hasAnim = true;
            animTotal += 1;
            const kind = b.payload?.kind;
            kindHistogram.set(String(kind), (kindHistogram.get(String(kind)) || 0) + 1);
            checkAnimation(where, kind, b.payload, errs, fail);
            break;
          }
          default: break;
        }
      });

      if (opts.requireAnimationPerLesson && !hasAnim) fail(lWhere, 'lesson has no animation');
      if (opts.requireCodePerLesson && !hasCode) fail(lWhere, 'lesson has no runnable code example');
      if (opts.requireProsePerLesson && !hasProse) fail(lWhere, 'lesson is only code/animation, no prose');

      if (les.quiz) {
        quizTotal += 1;
        const qWhere = `${lWhere} quiz`;
        if (typeof les.quiz.passing_percent !== 'number' || les.quiz.passing_percent < 1 || les.quiz.passing_percent > 100) {
          fail(qWhere, 'passing_percent must be 1..100');
        }
        if (!isArr(les.quiz.questions) || les.quiz.questions.length === 0) {
          fail(qWhere, 'no questions');
        } else {
          const qIds = new Set<string>();
          les.quiz.questions.forEach((q, qi) => {
            const at = `${qWhere} q${qi + 1}`;
            if (qIds.has(q.id)) fail(at, 'duplicate question id');
            qIds.add(q.id);
            if (!isStr(q.prompt) || !q.prompt.trim()) fail(at, 'missing prompt');
            if (!isArr(q.options) || q.options.length < 2) fail(at, 'needs at least 2 options');
            if (opts.exactOptionCount != null && isArr(q.options) && q.options.length !== opts.exactOptionCount) {
              fail(at, `has ${q.options.length} options, expected ${opts.exactOptionCount}`);
            }
            if (isArr(q.options)) {
              const seen = new Set<string>();
              q.options.forEach((o, oi) => {
                if (!isStr(o) || !o.trim()) fail(at, `options[${oi}] is empty`);
                if (isStr(o) && seen.has(o.trim())) fail(at, `options[${oi}] duplicates an earlier option`);
                if (isStr(o)) seen.add(o.trim());
              });
            }
            if (typeof q.correct_index !== 'number' || !isArr(q.options)) fail(at, 'missing correct_index');
            else if (q.correct_index < 0 || q.correct_index >= q.options.length) {
              fail(at, `correct_index ${q.correct_index} out of range 0..${q.options.length - 1}`);
            }
            if (!isStr(q.explanation) || !q.explanation.trim()) fail(at, 'missing explanation');
            else if (opts.minExplanationLength != null && q.explanation.trim().length < opts.minExplanationLength) {
              fail(at, `explanation is only ${q.explanation.trim().length} chars`);
            }
          });
        }
      } else if (opts.requireQuizPerLesson) {
        fail(lWhere, 'lesson has no quiz');
      }
    });

    // Checked after the lessons, not inside the loop: a diagram anywhere in the
    // module satisfies it, whichever lesson it happens to live in.
    if (opts.requireDiagramPerModule && !moduleHasDiagram) fail(mWhere, 'module has no diagram');

    // The end-of-module test, when present, must be gradeable: same question
    // rules as a lesson quiz, plus a draw size that fits the bank.
    if (m.test) {
      const tWhere = `${mWhere} test`;
      if (typeof m.test.passing_percent !== 'number' || m.test.passing_percent < 1 || m.test.passing_percent > 100) {
        fail(tWhere, 'passing_percent must be 1..100');
      }
      if (typeof m.test.retake_cooldown_hours !== 'number' || m.test.retake_cooldown_hours < 0) {
        fail(tWhere, 'retake_cooldown_hours must be >= 0');
      }
      if (!isArr(m.test.bank) || m.test.bank.length === 0) {
        fail(tWhere, 'no questions in bank');
      } else {
        if (typeof m.test.question_count !== 'number' || m.test.question_count < 1) {
          fail(tWhere, 'question_count must be >= 1');
        } else if (m.test.question_count > m.test.bank.length) {
          fail(tWhere, `question_count ${m.test.question_count} exceeds bank of ${m.test.bank.length}`);
        }
        const tIds = new Set<string>();
        m.test.bank.forEach((q, qi) => {
          const at = `${tWhere} q${qi + 1}`;
          if (tIds.has(q.id)) fail(at, 'duplicate question id');
          tIds.add(q.id);
          if (!isStr(q.prompt) || !q.prompt.trim()) fail(at, 'missing prompt');
          if (!isArr(q.options) || q.options.length < 2) fail(at, 'needs at least 2 options');
          if (typeof q.correct_index !== 'number' || !isArr(q.options)) fail(at, 'missing correct_index');
          else if (q.correct_index < 0 || q.correct_index >= q.options.length) {
            fail(at, `correct_index ${q.correct_index} out of range 0..${q.options.length - 1}`);
          }
        });
      }
    }
  });

  // Reported on failure so a schema regression is diagnosable from the output.
  if (errs.length) {
    const hist = [...kindHistogram.entries()].map(([k, n]) => `${k}:${n}`).join(' ');
    errs.push(`${label} <summary>: ${mods.length} modules, ${lessonTotal} lessons, ${animTotal} animations, ${diagramTotal} diagrams, ${quizTotal} quizzes [${hist}]`);
  }

  return errs;
}

/* ---------------------------------------------------------------------------
   Animation payloads, checked against the components that read them.
   --------------------------------------------------------------------------- */

function checkAnimation(
  where: string,
  kind: any,
  p: any,
  errs: string[],
  fail: (w: string, m: string) => void
) {
  if (!isStr(kind) || !ANIMATION_KINDS.includes(kind)) {
    fail(where, `unknown animation kind "${kind}"`);
    return;
  }
  const at0 = `${where} [${kind}]`;

  if (!isStr(p.title) || !p.title.trim()) fail(at0, 'missing title');

  // ---- kinds with no steps -------------------------------------------------
  if (kind === 'types') {
    if (!isArr(p.types) || p.types.length === 0) fail(at0, 'types array required');
    else p.types.forEach((t: any, j: number) => {
      if (!isStr(t.name) || !(typeof t.bytes === 'number' || isStr(t.bytes))) {
        fail(at0, `types[${j}] needs a name and bytes (number or string)`);
      }
      if (!isStr(t.signed) || !isStr(t.unsigned)) fail(at0, `types[${j}] needs signed/unsigned strings`);
    });
    if (!isArr(p.demos) || p.demos.length === 0) fail(at0, 'demos array required');
    else p.demos.forEach((d: any, j: number) => {
      if (typeof d.width !== 'number' || typeof d.signed !== 'boolean' || typeof d.start !== 'number') {
        fail(at0, `demos[${j}] needs width/signed/start`);
      }
    });
    return;
  }

  if (kind === 'pipeline') {
    if (!isArr(p.stages) || p.stages.length === 0) {
      fail(at0, 'stages array required');
      return;
    }
    // The stage "rail" and the before/after panels read these; empty strings
    // render as blank boxes that look like a rendering bug.
    p.stages.forEach((st: any, j: number) => {
      if (!isStr(st.name) || !st.name.trim()) fail(at0, `stages[${j}] needs a name`);
      if (!isStr(st.in) || !st.in.trim()) fail(at0, `stages[${j}] needs an "in" description`);
      if (!isStr(st.out) || !st.out.trim()) fail(at0, `stages[${j}] needs an "out" description`);
    });

    // Artifacts render under a stage only when the key exactly equals the
    // stage's `in` or `out` text, so an authoring slip here is invisible.
    if (p.artifacts != null) {
      if (typeof p.artifacts !== 'object' || isArr(p.artifacts)) {
        fail(at0, 'artifacts must be an object keyed by a stage in/out string');
      } else {
        const texts = new Set<string>();
        for (const st of p.stages) {
          if (isStr(st.in)) texts.add(st.in.trim());
          if (isStr(st.out)) texts.add(st.out.trim());
        }
        for (const key of Object.keys(p.artifacts)) {
          if (!texts.has(key.trim())) {
            fail(at0, `artifacts key "${key}" matches no stage in/out, so it never renders`);
          }
        }
      }
    }
    return;
  }

  // ---- stepped kinds -------------------------------------------------------
  const steps = p.steps;
  if (!isArr(steps) || steps.length === 0) {
    fail(at0, 'no steps array');
    return;
  }

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const at = `${at0} step ${i}`;
    if (!s || typeof s !== 'object') { fail(at, 'step is not an object'); continue; }
    if (kind !== 'step' && (!isStr(s.caption) || !s.caption.trim())) fail(at, 'missing caption');

    switch (kind) {
      case 'memory': {
        if (i === 0) {
          if (typeof p.cell_bytes !== 'number' || p.cell_bytes <= 0) fail(at0, 'cell_bytes must be a positive number');
          if (!isArr(p.cells) || p.cells.length === 0) fail(at0, 'no initial cells');
          else p.cells.forEach((c: any, j: number) => {
            if (!isArr(c.bytes) || c.bytes.length === 0) fail(`${at0} cell ${j}`, 'bytes must be a non-empty array');
            else if (c.bytes.some((x: any) => !isStr(x))) fail(`${at0} cell ${j}`, 'bytes must be strings');
          });
        }
        if (s.cells != null) {
          if (typeof s.cells !== 'object' || isArr(s.cells)) fail(at, 'cells patch must be an object keyed by index');
          else {
            const max = isArr(p.cells) ? p.cells.length : 0;
            for (const k of Object.keys(s.cells)) {
              const idx = Number(k);
              if (!Number.isInteger(idx) || idx < 0 || idx >= max) {
                fail(at, `cells patch index ${k} out of range (0..${max - 1})`);
              }
            }
          }
        }
        checkVars(at, s.vars);
        if (s.highlight != null && !isArr(s.highlight)) fail(at, 'highlight must be an array');
        break;
      }
      case 'passing': {
        if (!isArr(s.panes) || s.panes.length < 2) fail(at, 'needs at least two panes');
        else s.panes.forEach((pane: any, j: number) => {
          if (!isStr(pane.title) || !pane.title.trim()) fail(at, `panes[${j}] needs a title`);
          if (pane.cells != null && !isArr(pane.cells)) fail(at, `panes[${j}].cells must be an array`);
          if (isArr(pane.cells)) {
            if (pane.cells.length === 0) fail(at, `panes[${j}].cells is empty, which renders as a blank pane`);
            pane.cells.forEach((c: any, k: number) => {
              if (c.value == null) fail(at, `panes[${j}].cells[${k}] needs a value`);
            });
          }
        });
        break;
      }
      case 'callstack': {
        // An empty frame list is meaningful: it is how a scene shows the stack
        // before the first call and after the last one returns, and the
        // component renders it as an explicit "stack is empty" row.
        if (!isArr(s.frames)) fail(at, 'frames must be an array');
        else s.frames.forEach((f: any, j: number) => {
          if (!isStr(f.fn) || !f.fn.trim()) fail(at, `frames[${j}] needs fn`);
          if (f.locals != null && !isArr(f.locals)) fail(at, `frames[${j}].locals must be an array`);
        });
        break;
      }
      case 'trace': {
        if (!isStr(p.code) || !p.code.trim()) fail(at0, 'trace needs the source it is tracing, in `code`');
        if (s.line != null) {
          if (typeof s.line !== 'number') fail(at, 'line must be a number');
          else {
            const lines = isStr(p.code) ? p.code.replace(/\t/g, '  ').split('\n').length : 0;
            if (s.line < 1 || s.line > lines) {
              fail(at, `line ${s.line} is outside the ${lines}-line source, so nothing highlights`);
            }
          }
        }
        checkVars(at, s.vars);
        if (s.output != null && !isStr(s.output)) fail(at, 'output must be a string');
        break;
      }
      case 'bits': {
        // bits is a width, not a bit pattern: BitView uses it as flexGrow and
        // multiplies it, so a string here breaks the layout silently.
        if (i === 0 && p.total_bits != null && typeof p.total_bits !== 'number') fail(at0, 'total_bits must be a number');
        if (!isArr(s.fields) || s.fields.length === 0) fail(at, 'fields must be a non-empty array');
        else {
          let used = 0;
          s.fields.forEach((f: any, j: number) => {
            if (!isStr(f.label) || !f.label.trim()) fail(at, `fields[${j}] needs a label`);
            if (typeof f.bits !== 'number' || !(f.bits > 0)) fail(at, `fields[${j}].bits must be a positive number (it is a width, not a pattern)`);
            else if (!Number.isInteger(f.bits)) fail(at, `fields[${j}].bits must be a whole number of bits`);
            else if (f.value != null && (typeof f.value !== 'number' || f.value < 0 || f.value >= 2 ** f.bits)) {
              fail(at, `fields[${j}].value ${f.value} does not fit in ${f.bits} bits`);
            }
            used += typeof f.bits === 'number' ? f.bits : 0;
          });
          if (typeof p.total_bits === 'number' && used !== p.total_bits) {
            fail(at, `fields cover ${used} bits but total_bits is ${p.total_bits}`);
          }
        }
        break;
      }
      case 'expression': {
        if (!s.node || !isStr(s.node.label)) fail(at, 'node with a label is required');
        else checkExprNode(at, s.node, 0);
        break;
      }
      case 'stackheap': {
        if (s.heap != null && !isArr(s.heap)) fail(at, 'heap must be an array');
        if (s.stack != null && !isArr(s.stack)) fail(at, 'stack must be an array');
        break;
      }
      case 'nodes': {
        if (!isArr(s.nodes)) fail(at, 'nodes must be an array');
        else {
          const ids = new Set<string>();
          s.nodes.forEach((n: any, j: number) => {
            if (!isStr(n.id) || !n.id.trim()) fail(at, `nodes[${j}] needs an id`);
            else if (ids.has(n.id)) fail(at, `duplicate node id ${n.id}`);
            else ids.add(n.id);
            if (!isStr(n.data) || !n.data.trim()) fail(at, `nodes[${j}] needs data`);
          });
          s.nodes.forEach((n: any, j: number) => {
            // A pointer to a node that is not in the frame draws an arrow into
            // nothing; a dangling last node is deliberate and legal. `tail` is
            // free text in its own labelled box ("head", "root", "table"), so it
            // is not required to name a node.
            if (n.pointsTo != null && !ids.has(n.pointsTo) && j !== s.nodes.length - 1) {
              fail(at, `nodes[${j}].pointsTo "${n.pointsTo}" has no matching node`);
            }
          });
        }
        break;
      }
      case 'step': {
        if (!isStr(s.title) || !s.title.trim()) fail(at, 'step kind needs a title');
        if (!isStr(s.desc) || !s.desc.trim()) fail(at, 'step kind needs a desc');
        break;
      }
      default:
        break;
    }

    // Tones are shared across every kind and every cell, so they are checked
    // once per step rather than in each branch above.
    for (const t of collectTones(s)) {
      if (!TONES.includes(t)) fail(at, `tone "${t}" has no colour in TONE[]`);
    }
  }
}

function checkVars(at: string, vars: any) {
  if (vars == null) return;
  if (!isArr(vars)) { fail(at, 'vars must be an array'); return; }
  vars.forEach((v: any, j: number) => {
    if (!isStr(v.name) || !v.name.trim()) fail(at, `vars[${j}] needs a name`);
    if (!isStr(v.value)) fail(at, `vars[${j}] needs a string value`);
  });
}

/** ExprTree renders children in a two-column grid, so a third column is lost. */
function checkExprNode(at: string, node: any, depth: number) {
  if (depth > 12) { fail(at, 'expression tree is deeper than 12 levels, which will not render'); return; }
  if (node.children != null) {
    if (!isArr(node.children)) { fail(at, 'node.children must be an array'); return; }
    if (node.children.length > 2) fail(at, `node has ${node.children.length} children but ExprTree lays out two`);
    node.children.forEach((c: any) => {
      if (!c || !isStr(c.label)) fail(at, 'every child node needs a label');
      else checkExprNode(at, c, depth + 1);
    });
  }
}

function collectTones(s: any): string[] {
  const out: string[] = [];
  const add = (o: any) => { if (o && isStr(o.tone) && o.tone) out.push(o.tone); };
  add(s);
  for (const key of ['vars', 'fields', 'nodes', 'heap', 'stack', 'panes']) {
    if (!isArr(s[key])) continue;
    for (const item of s[key]) {
      add(item);
      if (isArr(item.cells)) item.cells.forEach(add);
    }
  }
  if (s.node) {
    const walk = (n: any) => {
      add(n);
      if (isArr(n.children)) n.children.forEach(walk);
    };
    walk(s.node);
  }
  return out;
}

/* ---------------------------------------------------------------------------
   Assessment + reward config (Part C.3 / D / E of the plan).

   These checks are what make "course complete" mean something: a course that
   promises an exam must have a real bank behind it, a Premium course that gates
   its certificate on a project must actually carry one, and every perk the page
   advertises must be a reward the platform can issue. They are separate from
   `validateCourseModules` because they read the course-level config rather than
   the lesson tree, and a course with no exam yet is legal (it simply has no
   final test to sit).
   --------------------------------------------------------------------------- */

/** Minimum bank size a course must reach before its exam is usable. */
export const MIN_EXAM_BANK = 25;

export interface AssessmentInput {
  branch?: string;
  bucket?: string;
  certificate_tier?: string;
  exam?: Course['exam'];
  project?: Course['project'];
  perks?: Course['perks'];
  exam_prep?: Course['exam_prep'];
}

export function validateCourseAssessment(label: string, course: AssessmentInput): string[] {
  const errs: string[] = [];
  const fail = (where: string, msg: string) => errs.push(`${label} ${where}: ${msg}`);

  if (course.branch !== undefined && !(COURSE_BRANCHES as readonly string[]).includes(course.branch)) {
    fail('<course>', `unknown branch "${course.branch}"`);
  }
  if (course.bucket !== undefined && !(COURSE_BUCKETS as readonly string[]).includes(course.bucket)) {
    fail('<course>', `unknown bucket "${course.bucket}"`);
  }
  if (course.certificate_tier !== undefined && !(CERT_TIERS as readonly string[]).includes(course.certificate_tier)) {
    fail('<course>', `unknown certificate_tier "${course.certificate_tier}"`);
  }

  const exam = course.exam;
  if (exam) {
    if (!isArr(exam.bank)) {
      fail('exam', 'bank must be an array');
    } else {
      if (exam.bank.length < MIN_EXAM_BANK) {
        fail('exam', `bank has ${exam.bank.length} questions, need at least ${MIN_EXAM_BANK}`);
      }
      if (exam.question_count < 1 || exam.question_count > exam.bank.length) {
        fail('exam', `question_count ${exam.question_count} is not 1..${exam.bank.length}`);
      }
      const ids = new Set<string>();
      const diffs = new Set<string>();
      exam.bank.forEach((q, qi) => {
        const at = `exam q${qi + 1}`;
        if (!isStr(q.id) || !q.id.trim()) fail(at, 'missing id');
        else if (ids.has(q.id)) fail(at, `duplicate id ${q.id}`);
        else ids.add(q.id);
        if (!isStr(q.prompt) || !q.prompt.trim()) fail(at, 'missing prompt');
        if (!isArr(q.options) || q.options.length < 2) fail(at, 'needs at least 2 options');
        else {
          const seen = new Set<string>();
          q.options.forEach((o, oi) => {
            if (!isStr(o) || !o.trim()) fail(at, `options[${oi}] is empty`);
            if (isStr(o) && seen.has(o.trim())) fail(at, `options[${oi}] duplicates an earlier option`);
            if (isStr(o)) seen.add(o.trim());
          });
        }
        if (typeof q.correct_index !== 'number' || !isArr(q.options)) fail(at, 'missing correct_index');
        else if (q.correct_index < 0 || q.correct_index >= q.options.length) {
          fail(at, `correct_index ${q.correct_index} out of range 0..${q.options.length - 1}`);
        }
        if (!isStr(q.explanation) || !q.explanation.trim()) fail(at, 'missing explanation');
        if (!isStr(q.difficulty) || !(EXAM_DIFFICULTIES as readonly string[]).includes(q.difficulty)) {
          fail(at, `unknown difficulty "${q.difficulty}"`);
        } else {
          diffs.add(q.difficulty);
        }
      });
      if (ids.size > 0 && diffs.size < EXAM_DIFFICULTIES.length) {
        fail('exam', `bank is tagged with ${diffs.size} of ${EXAM_DIFFICULTIES.length} difficulties; a mix is required`);
      }
    }
    if (typeof exam.duration_minutes !== 'number' || exam.duration_minutes < 1) fail('exam', 'duration_minutes must be >= 1');
    if (typeof exam.passing_percent !== 'number' || exam.passing_percent < 1 || exam.passing_percent > 100) {
      fail('exam', 'passing_percent must be 1..100');
    }
    if (typeof exam.retake_cooldown_hours !== 'number' || exam.retake_cooldown_hours < 0) {
      fail('exam', 'retake_cooldown_hours must be >= 0');
    }
    if (typeof exam.distinction_percent !== 'number' || exam.distinction_percent < 1 || exam.distinction_percent > 100) {
      fail('exam', 'distinction_percent must be 1..100');
    } else if (typeof exam.passing_percent === 'number' && exam.distinction_percent < exam.passing_percent) {
      fail('exam', 'distinction_percent is below passing_percent, so Distinction is unreachable');
    }
  }

  const project = course.project;
  if (project) {
    if (!isStr(project.title) || !project.title.trim()) fail('project', 'missing title');
    if (!isStr(project.brief) || !project.brief.trim()) fail('project', 'missing brief');
  }

  const premiumTier = course.certificate_tier === 'premium' || course.certificate_tier === 'career_track';
  if (premiumTier && (!project || project.required_for_certificate !== true)) {
    fail('certificate', `tier "${course.certificate_tier}" gates its certificate on a project, but no required project is configured`);
  }

  if (course.perks !== undefined) {
    if (!isArr(course.perks)) {
      fail('perks', 'perks must be an array');
    } else {
      const keys = new Set<string>();
      course.perks.forEach((p, pi) => {
        const at = `perk ${pi + 1}`;
        if (!p || !isStr(p.key) || !p.key.trim()) fail(at, 'missing key');
        else if (keys.has(p.key)) fail(at, `duplicate key ${p.key}`);
        else keys.add(p.key);
        if (!p || !isStr(p.label) || !p.label.trim()) fail(at, 'missing label');
      });
    }
  }

  const prep = course.exam_prep;
  if (prep) {
    if (!isArr(prep.units)) fail('exam_prep', 'units must be an array');
    else {
      prep.units.forEach((u, ui) => {
        const at = `exam_prep unit ${ui + 1}`;
        if (!isStr(u.title) || !u.title.trim()) fail(at, 'missing title');
        if (!isArr(u.questions) || u.questions.length === 0) fail(at, 'no questions');
      });
    }
  }

  return errs;
}
