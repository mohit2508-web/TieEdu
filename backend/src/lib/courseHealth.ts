import { courseStats } from './courses';
import type { Course } from '../data/db';

// ============================================================================
// COURSE HEALTH — the publish checklist.
//
// One function answers "what is still missing before this course may go
// live?", shared by the PUT publish gate and the admin editor's panel so the
// refusal the API gives and the checklist the admin sees can never disagree.
//
// Severity split matters: `blocker` items make a draft unpublishable (empty
// content, missing price on a paid course); `warn` items are honest signals
// that degrade the learner experience (no cover, no assessment) but do not
// hold a course hostage — the gradient fallback and quiz-less reading lessons
// are both legitimate.
// ============================================================================

export interface CourseHealthCheck {
  key: string;
  label: string;
  pass: boolean;
  severity: 'blocker' | 'warn';
}

export interface CourseHealth {
  checks: CourseHealthCheck[];
  /** Human-readable labels of the failed blockers, for the 400 message. */
  blockers: string[];
  publishable: boolean;
}

export function courseHealthFor(course: Course): CourseHealth {
  const stats = courseStats(course);
  const modules = Array.isArray(course.modules) ? course.modules : [];
  const lessons = modules.flatMap((m: any) => (Array.isArray(m?.lessons) ? m.lessons : []));

  const hasQuiz = lessons.some((l: any) => Array.isArray(l?.quiz?.questions) && l.quiz.questions.length > 0);
  const hasModuleTest = modules.some((m: any) => Array.isArray(m?.test?.bank) && m.test.bank.length > 0);
  const hasExam = !!(course.exam && Array.isArray(course.exam.bank) && course.exam.bank.length > 0);

  const checks: CourseHealthCheck[] = [
    {
      key: 'has_lessons',
      label: 'At least one lesson',
      pass: stats.lesson_count > 0,
      severity: 'blocker',
    },
    {
      key: 'subtitle',
      label: 'Subtitle is filled in',
      pass: String(course.subtitle || '').trim().length > 0,
      severity: 'blocker',
    },
    {
      key: 'description',
      label: 'Description is filled in',
      pass: String(course.description || '').trim().length > 0,
      severity: 'blocker',
    },
    {
      key: 'paid_price',
      // A free course is always priced correctly (0); only a paid one can get
      // this wrong, and then enrolment would 402 for everyone.
      label: 'Paid course has a price',
      pass: course.is_free === true || (Number(course.price_inr) || 0) >= 1,
      severity: 'blocker',
    },
    {
      key: 'cover',
      label: 'Cover image uploaded (gradient fallback works without it)',
      pass: String(course.thumbnail_url || '').trim().length > 0,
      severity: 'warn',
    },
    {
      key: 'assessment',
      label: 'Some assessment exists (quiz, module test, or final exam)',
      pass: hasQuiz || hasModuleTest || hasExam,
      severity: 'warn',
    },
    {
      key: 'certificate_exam',
      // Certificates are gated on the final exam when one exists; a
      // certificate-eligible course with no exam still certifies on pure
      // completion, which is legal but worth surfacing before launch.
      label: 'Certificate course has a final exam',
      pass: course.certificate_eligible !== true || hasExam,
      severity: 'warn',
    },
  ];

  const blockers = checks.filter((c) => c.severity === 'blocker' && !c.pass).map((c) => c.label);
  return { checks, blockers, publishable: blockers.length === 0 };
}
