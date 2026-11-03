// ============================================================================
// Readiness test — grading, credits, offer price and the personalised lock.
//
// The readiness engine moves money (an offer price) and progress (credited
// lessons), so these cases pin the rules the course page promises: a module is
// tested out only on a perfect module score in a clean attempt; strikes or a
// late paper void credits; the offer price reaches checkout only after the
// learner chooses that path; and a personalised purchase closes exactly the
// modules frozen on its order line.
// ============================================================================

import { getAIFirstCourse } from '../src/data/aiFirstCourse';
import {
  startReadiness, submitReadiness, readinessStateFor, effectiveCoursePrice, currentOffer,
  applyReadinessCredits, personalisedClosedModuleIds, readinessRecord, offerPriceFor,
} from '../src/lib/readiness';
import { getOrCreateProgress, completionState, sanitizeCourse } from '../src/lib/courses';

let pass = 0;
let fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) pass++;
  else { fail++; console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`); }
}
const ok = (name: string, cond: boolean) => check(name, cond, true);

const course = getAIFirstCourse();
const cfg = course.readiness!;
const key = new Map(cfg.bank.map((q) => [q.id, q.correct_index]));
const freshDb = (): any => ({ courses: [course], orders: [], course_progress: {} });

/** Answer every question correctly except in the listed modules. */
function answersFor(ids: string[], wrongModules: Set<string>) {
  const out: Record<string, number> = {};
  for (const id of ids) {
    const q = cfg.bank.find((b) => b.id === id)!;
    const right = key.get(id)!;
    out[id] = wrongModules.has(q.topic!) ? (right + 1) % q.options.length : right;
  }
  return out;
}

// --- shape -------------------------------------------------------------------
{
  check('course is ₹99 and paid', [course.price_inr, course.is_free], [99, false]);
  check('12 modules / 48 lessons', [course.modules.length, course.modules.reduce((n, m) => n + m.lessons.length, 0)], [12, 48]);
  check('6 readiness questions for each of M1–M11', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => cfg.bank.filter((q) => q.topic === `aif-m${n}`).length), Array(11).fill(6));
  check('M12 has no readiness questions', cfg.bank.filter((q) => q.topic === 'aif-m12').length, 0);
  const s = sanitizeCourse(course) as any;
  ok('sanitizeCourse strips the readiness bank', s.readiness === undefined && s.has_readiness === true);
  check('offer tiers', [offerPriceFor(cfg, 2), offerPriceFor(cfg, 3), offerPriceFor(cfg, 6), offerPriceFor(cfg, 11)], [null, 79, 69, 49]);
}

// --- draw ----------------------------------------------------------------------
{
  const db = freshDb();
  const st = startReadiness(db, 'u1', course);
  ok('start succeeds', !('error' in st));
  if (!('error' in st)) {
    check('44 questions drawn', st.questions.length, 44);
    ok('no answer key in learner questions', st.questions.every((q: any) => q.correct_index === undefined));
    check('4 per module', new Set(st.questions.map((q) => q.module_id)).size, 11);
    const again = startReadiness(db, 'u1', course);
    ok('second start resumes the same attempt', !('error' in again) && again.attempt.id === st.attempt.id && again.resumed === true);
  }
}

// --- perfect clean paper → 11 tested out, ₹49 offer, credits applied on enrol --
{
  const db = freshDb();
  const st = startReadiness(db, 'u1', course) as any;
  const sub = submitReadiness(db, 'u1', course, st.attempt.id, answersFor(st.attempt.question_ids, new Set()), 0) as any;
  check('perfect paper scores 100', sub.report.score_percent, 100);
  check('11 modules tested out', sub.report.tested_out_count, 11);
  check('verdict ahead', sub.report.verdict, 'ahead');
  check('offer ₹49', sub.report.offer_price_inr, 49);
  check('price is list until the path is chosen', effectiveCoursePrice(db, 'u1', course).price_inr, 99);
  readinessRecord(db, 'u1', course.id)!.path_choice = 'personalised';
  check('price after choosing personalised', effectiveCoursePrice(db, 'u1', course).price_inr, 49);
  check('M12 never credited', effectiveCoursePrice(db, 'u1', course).credited_module_ids.includes('aif-m12'), false);

  getOrCreateProgress(db, 'u1', course);
  applyReadinessCredits(db, 'u1', course);
  const cs = completionState(db, 'u1', course);
  check('44 of 48 lessons credited on enrol', [cs.completed, cs.total], [44, 48]);
  check('next lesson is the first of M12', cs.next_lesson_id, 'aif-m12-1');
  ok('cooldown blocks an immediate retake', readinessStateFor(db, 'u1', course)!.can_start === false);
}

// --- one wrong answer in a module → that module is not tested out ------------
{
  const db = freshDb();
  const st = startReadiness(db, 'u2', course) as any;
  const wrong = new Set(['aif-m3', 'aif-m5', 'aif-m8', 'aif-m9', 'aif-m10', 'aif-m11', 'aif-m6', 'aif-m7']);
  const sub = submitReadiness(db, 'u2', course, st.attempt.id, answersFor(st.attempt.question_ids, wrong), 0) as any;
  check('3 modules tested out', sub.report.tested_out_count, 3);
  check('offer ₹79 at 3', sub.report.offer_price_inr, 79);
  const m3 = sub.report.modules.find((m: any) => m.module_id === 'aif-m3');
  check('a module with every answer wrong is "learn"', m3.status, 'learn');
}

// --- strikes void credits ------------------------------------------------------
{
  const db = freshDb();
  const st = startReadiness(db, 'u3', course) as any;
  const sub = submitReadiness(db, 'u3', course, st.attempt.id, answersFor(st.attempt.question_ids, new Set()), 2) as any;
  check('2 strikes void credits', [sub.report.credits_voided, sub.report.tested_out_count, sub.report.offer_price_inr], [true, 0, null]);
  check('no offer after a voided attempt', currentOffer(db, 'u3', course), null);
}

// --- late paper earns nothing ----------------------------------------------------
{
  const db = freshDb();
  const st = startReadiness(db, 'u4', course) as any;
  st.attempt.started_at = new Date(Date.now() - (cfg.duration_minutes + 5) * 60_000).toISOString();
  const sub = submitReadiness(db, 'u4', course, st.attempt.id, answersFor(st.attempt.question_ids, new Set()), 0);
  ok('expired attempt cannot be submitted or is graded as late', 'error' in sub || (sub as any).report.credits_voided === true);
}

// --- foundations verdict --------------------------------------------------------
{
  const db = freshDb();
  const st = startReadiness(db, 'u5', course) as any;
  const sub = submitReadiness(db, 'u5', course, st.attempt.id, {}, 0) as any;
  check('blank paper → foundations', [sub.report.score_percent, sub.report.verdict, sub.report.foundation_course_slug], [0, 'foundations', 'ai-literacy-everyone']);
}

// --- personalised lock is read from the paid order line ------------------------
{
  const db = freshDb();
  db.orders.push({ user_id: 'u6', status: 'paid', items: [{ kind: 'course', course_id: course.id, readiness_path: 'personalised', credited_module_ids: ['aif-m1', 'aif-m2'] }] });
  check('personalised order closes its frozen modules', personalisedClosedModuleIds(db, 'u6', course), ['aif-m1', 'aif-m2']);
  db.orders.push({ user_id: 'u6', status: 'paid', items: [{ kind: 'course', course_id: course.id }] });
  check('a full-price purchase clears the lock', personalisedClosedModuleIds(db, 'u6', course), []);
  check('another user is unaffected', personalisedClosedModuleIds(db, 'u7', course), []);
}

console.log(`\nreadiness: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
