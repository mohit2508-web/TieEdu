// ============================================================================
// READINESS TEST — the secure paper a learner sits BEFORE a course.
//
// It answers two questions honestly: "is this learner ready for the course?"
// and "which modules do they already know well enough to skip?". A module is
// tested out only on a perfect module score in a clean (low-strike) attempt,
// so a guess cannot buy a credit. Credits are written into course progress as
// completed lessons (no XP — nothing was studied), which keeps lesson order,
// the completion % and the certificate gates working unchanged. The final
// exam and the capstone are still required, so the credential stays defended.
//
// Enough tested-out modules unlock a cheaper personalised path. The learner
// chooses it; the modules it skips are frozen onto the order line at purchase
// and stay closed for that learner, because they paid for the rest.
//
// Storage: db.course_readiness[userId][courseId] = ReadinessRecord.
// ============================================================================

import crypto from 'crypto';
import type { Course, CourseModule, CourseReadinessConfig, ExamQuestion, ReadinessAttempt } from '../data/db';
import { orderedModules, getProgress, formatInr } from './courses';

/** Slack on top of the timer before a submission stops earning credits. */
export const READINESS_GRACE_SECONDS = 45;
/** This many secure-mode strikes void the module credits of an attempt. */
export const READINESS_STRIKE_VOID = 2;

export type ReadinessPath = 'full' | 'personalised';

export interface ReadinessRecord {
  attempts: ReadinessAttempt[];
  path_choice: ReadinessPath | null;
}

export function readinessConfigOf(course: Course): CourseReadinessConfig | null {
  const r = course.readiness;
  if (!r || !Array.isArray(r.bank) || r.bank.length === 0) return null;
  return r;
}

function shuffled<T>(items: T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function readinessRecord(db: any, userId: string, courseId: string, create = false): ReadinessRecord | null {
  if (!db.course_readiness) {
    if (!create) return null;
    db.course_readiness = {};
  }
  const mine = db.course_readiness[userId];
  if (!mine?.[courseId]) {
    if (!create) return null;
    if (!mine) db.course_readiness[userId] = {};
    db.course_readiness[userId][courseId] = { attempts: [], path_choice: null };
  }
  const rec = db.course_readiness[userId][courseId] as ReadinessRecord;
  if (!Array.isArray(rec.attempts)) rec.attempts = [];
  return rec;
}

/** Modules the paper covers, in course order. */
export function testableModules(course: Course, cfg: CourseReadinessConfig): CourseModule[] {
  const skip = new Set(cfg.untestable_module_ids || []);
  return orderedModules(course).filter((m) => !skip.has(m.id) && cfg.bank.some((q) => q.topic === m.id));
}

export function readinessQuestionCount(course: Course, cfg: CourseReadinessConfig): number {
  return testableModules(course, cfg).reduce(
    (n, m) => n + Math.min(cfg.per_module, cfg.bank.filter((q) => q.topic === m.id).length),
    0
  );
}

function durationMs(cfg: CourseReadinessConfig): number {
  return Math.max(1, Number(cfg.duration_minutes) || 1) * 60_000;
}

function latestGraded(rec: ReadinessRecord | null): ReadinessAttempt | null {
  const graded = (rec?.attempts || []).filter((a) => a.graded);
  return graded.sort((a, b) => (b.submitted_at || '').localeCompare(a.submitted_at || ''))[0] || null;
}

function openAttempt(rec: ReadinessRecord | null, cfg: CourseReadinessConfig): ReadinessAttempt | null {
  const open = (rec?.attempts || []).find((a) => !a.graded) || null;
  if (!open) return null;
  const live = Date.now() < new Date(open.started_at).getTime() + durationMs(cfg) + READINESS_GRACE_SECONDS * 1000;
  return live ? open : null;
}

/** The personalised-path price for a number of tested-out modules, or null. */
export function offerPriceFor(cfg: CourseReadinessConfig, testedOut: number): number | null {
  const tier = (cfg.offer_tiers || [])
    .slice()
    .sort((a, b) => b.min_tested_out - a.min_tested_out)
    .find((t) => testedOut >= t.min_tested_out);
  return tier ? tier.price_inr : null;
}

/** Lessons of the modules credited by the latest clean attempt. */
export function creditedLessonIds(db: any, userId: string, course: Course): string[] {
  const cfg = readinessConfigOf(course);
  if (!cfg) return [];
  const latest = latestGraded(readinessRecord(db, userId, course.id));
  if (!latest || latest.credits_voided) return [];
  const credited = new Set(latest.tested_out_module_ids);
  return orderedModules(course)
    .filter((m) => credited.has(m.id))
    .flatMap((m) => (m.lessons || []).map((l) => l.id));
}

/**
 * Write the credits into an existing progress row. Idempotent, and never
 * removes anything: a later, weaker attempt cannot take back a lesson that is
 * already complete.
 */
export function applyReadinessCredits(db: any, userId: string, course: Course): number {
  const progress = getProgress(db, userId, course.id);
  if (!progress) return 0;
  let added = 0;
  for (const id of creditedLessonIds(db, userId, course)) {
    if (!progress.completed_lesson_ids.includes(id)) {
      progress.completed_lesson_ids.push(id);
      added += 1;
    }
  }
  if (added) progress.updated_at = new Date().toISOString();
  return added;
}

/** The latest clean offer: { price, tested_out } when a personalised path exists. */
export function currentOffer(db: any, userId: string | null, course: Course): { price_inr: number; tested_out_module_ids: string[] } | null {
  if (!userId) return null;
  const cfg = readinessConfigOf(course);
  if (!cfg) return null;
  const latest = latestGraded(readinessRecord(db, userId, course.id));
  if (!latest || latest.credits_voided) return null;
  const price = offerPriceFor(cfg, latest.tested_out_module_ids.length);
  const list = Math.max(0, Number(course.price_inr) || 0);
  if (price === null || price >= list) return null;
  return { price_inr: price, tested_out_module_ids: latest.tested_out_module_ids.slice() };
}

/**
 * What this learner pays for the course: the personalised price when they
 * chose that path and the offer still stands, otherwise the list price.
 */
export function effectiveCoursePrice(db: any, userId: string | null, course: Course): { price_inr: number; path: ReadinessPath; credited_module_ids: string[] } {
  const list = Math.max(0, Number(course.price_inr) || 0);
  if (!userId) return { price_inr: list, path: 'full', credited_module_ids: [] };
  const rec = readinessRecord(db, userId, course.id);
  const offer = currentOffer(db, userId, course);
  if (rec?.path_choice === 'personalised' && offer) {
    return { price_inr: offer.price_inr, path: 'personalised', credited_module_ids: offer.tested_out_module_ids };
  }
  return { price_inr: list, path: 'full', credited_module_ids: [] };
}

/**
 * Modules closed to this learner because they bought the personalised path.
 * Read from the paid order lines (frozen at purchase), so a later retake can
 * neither open nor close more of the course than was paid for. Any full-price
 * purchase of the same course clears it.
 */
export function personalisedClosedModuleIds(db: any, userId: string | null, course: Course): string[] {
  if (!userId) return [];
  const closed = new Set<string>();
  for (const o of db.orders || []) {
    if (o.user_id !== userId || o.status !== 'paid') continue;
    for (const it of o.items || []) {
      if (it?.kind !== 'course' || (it.course_id || it.id) !== course.id) continue;
      if (it.readiness_path !== 'personalised') return [];
      for (const m of it.credited_module_ids || []) closed.add(m);
    }
  }
  return Array.from(closed);
}

export function isLessonClosedByPath(db: any, userId: string | null, course: Course, moduleId: string): boolean {
  return personalisedClosedModuleIds(db, userId, course).includes(moduleId);
}

// ---------------------------------------------------------------------------
// Attempts
// ---------------------------------------------------------------------------

export interface ReadinessModuleReport {
  module_id: string;
  title: string;
  correct: number;
  total: number;
  /** tested_out = credited · review = nearly there · learn = study it */
  status: 'tested_out' | 'review' | 'learn' | 'not_tested';
}

export interface ReadinessReport {
  attempt_id: string;
  submitted_at: string | null;
  score_percent: number;
  verdict: 'foundations' | 'ready' | 'ahead';
  strikes: number;
  credits_voided: boolean;
  modules: ReadinessModuleReport[];
  tested_out_count: number;
  hours_saved: number;
  list_price_inr: number;
  offer_price_inr: number | null;
  foundation_course_slug: string | null;
}

export function reportFor(course: Course, cfg: CourseReadinessConfig, a: ReadinessAttempt): ReadinessReport {
  const testable = new Set(testableModules(course, cfg).map((m) => m.id));
  const out = new Set(a.tested_out_module_ids);
  const modules = orderedModules(course).map((m): ReadinessModuleReport => {
    const s = a.per_module[m.id];
    if (!testable.has(m.id) || !s) return { module_id: m.id, title: m.title, correct: 0, total: 0, status: 'not_tested' };
    const status = out.has(m.id) ? 'tested_out' : s.total > 0 && s.correct >= s.total - 1 ? 'review' : 'learn';
    return { module_id: m.id, title: m.title, correct: s.correct, total: s.total, status };
  });
  const score = a.score_percent ?? 0;
  const testedOut = a.tested_out_module_ids.length;
  const minutesSaved = orderedModules(course)
    .filter((m) => out.has(m.id))
    .reduce((n, m) => n + (m.lessons || []).reduce((k, l) => k + (Number(l.duration_minutes) || 0), 0), 0);
  const list = Math.max(0, Number(course.price_inr) || 0);
  const offer = a.credits_voided ? null : offerPriceFor(cfg, testedOut);
  return {
    attempt_id: a.id,
    submitted_at: a.submitted_at,
    score_percent: score,
    verdict: score < cfg.foundation_below_percent ? 'foundations' : offer !== null && offer < list ? 'ahead' : 'ready',
    strikes: a.strikes,
    credits_voided: a.credits_voided,
    modules,
    tested_out_count: testedOut,
    hours_saved: Math.round((minutesSaved / 60) * 10) / 10,
    list_price_inr: list,
    offer_price_inr: offer !== null && offer < list ? offer : null,
    foundation_course_slug: cfg.foundation_course_slug || null,
  };
}

export interface ReadinessLearnerState {
  question_count: number;
  duration_minutes: number;
  per_module: number;
  modules_tested: number;
  max_attempts: number;
  retake_cooldown_hours: number;
  offer_tiers: { min_tested_out: number; price_inr: number; label: string }[];
  attempts_used: number;
  in_progress_attempt_id: string | null;
  can_start: boolean;
  next_start_at: string | null;
  block_reason: string | null;
  latest: ReadinessReport | null;
  path_choice: ReadinessPath | null;
}

export function readinessStateFor(db: any, userId: string | null, course: Course): ReadinessLearnerState | null {
  const cfg = readinessConfigOf(course);
  if (!cfg) return null;
  const rec = userId ? readinessRecord(db, userId, course.id) : null;
  const graded = (rec?.attempts || []).filter((a) => a.graded);
  const latest = latestGraded(rec);
  const open = openAttempt(rec, cfg);

  let nextStart: string | null = null;
  let block: string | null = null;
  if (graded.length >= cfg.max_attempts) block = `You have used all ${cfg.max_attempts} readiness attempts.`;
  else if (latest?.submitted_at) {
    const until = new Date(latest.submitted_at).getTime() + cfg.retake_cooldown_hours * 3_600_000;
    if (Date.now() < until) {
      nextStart = new Date(until).toISOString();
      block = 'You can retake the readiness test once the cooldown ends.';
    }
  }

  return {
    question_count: readinessQuestionCount(course, cfg),
    duration_minutes: cfg.duration_minutes,
    per_module: cfg.per_module,
    modules_tested: testableModules(course, cfg).length,
    max_attempts: cfg.max_attempts,
    retake_cooldown_hours: cfg.retake_cooldown_hours,
    offer_tiers: (cfg.offer_tiers || []).map((t) => ({ ...t, label: formatInr(t.price_inr) })),
    attempts_used: graded.length,
    in_progress_attempt_id: open?.id || null,
    can_start: !!userId && (!!open || !block),
    next_start_at: nextStart,
    block_reason: userId ? block : 'Sign in to take the readiness test.',
    latest: latest ? reportFor(course, cfg, latest) : null,
    path_choice: rec?.path_choice || null,
  };
}

function learnerQuestions(cfg: CourseReadinessConfig, ids: string[], course: Course) {
  const byId = new Map(cfg.bank.map((q) => [q.id, q]));
  const titles = new Map(orderedModules(course).map((m) => [m.id, m.title]));
  return ids
    .map((id) => byId.get(id))
    .filter((q): q is ExamQuestion => !!q)
    .map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: [...q.options],
      module_id: q.topic || null,
      module_title: titles.get(q.topic || '') || null,
    }));
}

/** Start (or resume) an attempt. Returns an error string when it may not start. */
export function startReadiness(db: any, userId: string, course: Course) {
  const cfg = readinessConfigOf(course);
  if (!cfg) return { error: 'This course has no readiness test.' } as const;
  const rec = readinessRecord(db, userId, course.id, true)!;
  const open = openAttempt(rec, cfg);
  if (open) {
    return {
      attempt: open,
      questions: learnerQuestions(cfg, open.question_ids, course),
      deadline_at: new Date(new Date(open.started_at).getTime() + durationMs(cfg)).toISOString(),
      resumed: true,
    } as const;
  }
  const state = readinessStateFor(db, userId, course)!;
  if (state.block_reason) return { error: state.block_reason, state } as const;

  // Expired, never-submitted attempts are closed as zero so they still count
  // towards the attempt limit — abandoning a bad paper must not reset it.
  for (const a of rec.attempts) {
    if (!a.graded) {
      a.graded = true;
      a.submitted_at = new Date().toISOString();
      a.score_percent = 0;
      a.credits_voided = true;
    }
  }
  if (rec.attempts.filter((a) => a.graded).length >= cfg.max_attempts) {
    return { error: `You have used all ${cfg.max_attempts} readiness attempts.` } as const;
  }

  const ids: string[] = [];
  for (const m of testableModules(course, cfg)) {
    const pool = cfg.bank.filter((q) => q.topic === m.id);
    ids.push(...shuffled(pool).slice(0, cfg.per_module).map((q) => q.id));
  }
  const attempt: ReadinessAttempt = {
    id: `rdy-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    started_at: new Date().toISOString(),
    submitted_at: null,
    question_ids: ids,
    graded: false,
    score_percent: null,
    per_module: {},
    tested_out_module_ids: [],
    strikes: 0,
    credits_voided: false,
  };
  rec.attempts.push(attempt);
  return {
    attempt,
    questions: learnerQuestions(cfg, ids, course),
    deadline_at: new Date(new Date(attempt.started_at).getTime() + durationMs(cfg)).toISOString(),
    resumed: false,
  } as const;
}

/** Grade an attempt. Late papers and high-strike papers are graded but earn no credits. */
export function submitReadiness(
  db: any,
  userId: string,
  course: Course,
  attemptId: string,
  answers: Record<string, number>,
  strikes: number
) {
  const cfg = readinessConfigOf(course);
  if (!cfg) return { error: 'This course has no readiness test.' } as const;
  const rec = readinessRecord(db, userId, course.id);
  const a = rec?.attempts.find((x) => x.id === attemptId && !x.graded);
  if (!rec || !a) return { error: 'No open readiness attempt with that id.' } as const;

  const late = Date.now() > new Date(a.started_at).getTime() + durationMs(cfg) + READINESS_GRACE_SECONDS * 1000;
  const byId = new Map(cfg.bank.map((q) => [q.id, q]));
  const perModule: Record<string, { correct: number; total: number }> = {};
  const results: { id: string; module_id: string | null; prompt: string; options: string[]; chosen_index: number; correct_index: number; correct: boolean; explanation: string }[] = [];
  let correct = 0;
  for (const id of a.question_ids) {
    const q = byId.get(id);
    if (!q) continue;
    const mod = q.topic || '_';
    perModule[mod] = perModule[mod] || { correct: 0, total: 0 };
    perModule[mod].total += 1;
    const chosen = Number(answers?.[id]);
    const ok = !late && Number.isInteger(chosen) && chosen === q.correct_index;
    if (ok) {
      perModule[mod].correct += 1;
      correct += 1;
    }
    results.push({
      id,
      module_id: q.topic || null,
      prompt: q.prompt,
      options: [...q.options],
      chosen_index: Number.isInteger(chosen) ? chosen : -1,
      correct_index: q.correct_index,
      correct: ok,
      explanation: q.explanation,
    });
  }

  const untestable = new Set(cfg.untestable_module_ids || []);
  const cleanStrikes = Math.max(0, Math.min(99, Math.floor(Number(strikes) || 0)));
  const voided = late || cleanStrikes >= READINESS_STRIKE_VOID;
  a.graded = true;
  a.submitted_at = new Date().toISOString();
  a.score_percent = a.question_ids.length ? Math.round((correct / a.question_ids.length) * 100) : 0;
  a.per_module = perModule;
  a.strikes = cleanStrikes;
  a.credits_voided = voided;
  a.tested_out_module_ids = voided
    ? []
    : Object.entries(perModule)
        .filter(([m, s]) => !untestable.has(m) && s.total > 0 && s.correct === s.total)
        .map(([m]) => m);

  // A retake re-opens the path decision against the new result.
  rec.path_choice = null;
  applyReadinessCredits(db, userId, course);

  return { report: reportFor(course, cfg, a), results, late } as const;
}
