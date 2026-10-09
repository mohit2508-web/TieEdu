/**
 * Pure learning helpers (Phase 3, spec §6).
 *
 * Progress maths and quiz grading live here so they can be unit-tested without
 * a database and reused by both the service layer and any future client.
 */

export interface CourseProgress {
  total: number;
  completed: number;
  pct: number;
}

/** Course progress as a percentage (0–100), rounded, guarding empty courses. */
export function computeCourseProgress(
  totalLessons: number,
  completedLessons: number
): CourseProgress {
  const total = Math.max(0, totalLessons);
  const completed = Math.min(Math.max(0, completedLessons), total);
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, pct };
}

export interface GradeableQuestion {
  id: string;
  /** id of the single correct option. */
  correctOptionId: string;
}

export interface QuizGrade {
  score: number;
  correct: number;
  total: number;
  passed: boolean;
  perQuestion: { questionId: string; optionId: string | null; correct: boolean }[];
}

/**
 * Grade a quiz. `answers` maps questionId → selected optionId. A question left
 * unanswered counts as incorrect. Score is the rounded percentage of correct
 * answers; `passed` is score >= passingScore.
 */
export function gradeQuiz(
  questions: GradeableQuestion[],
  answers: Record<string, string | undefined>,
  passingScore: number
): QuizGrade {
  const total = questions.length;
  const perQuestion = questions.map((q) => {
    const optionId = answers[q.id] ?? null;
    const correct = optionId != null && optionId === q.correctOptionId;
    return { questionId: q.id, optionId, correct };
  });
  const correct = perQuestion.filter((a) => a.correct).length;
  const score = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { score, correct, total, passed: total > 0 && score >= passingScore, perQuestion };
}

/** Strip the answer key from a quiz before sending it to a student. */
export function toStudentQuiz<
  Q extends { id: string; prompt: string; options: { id: string; text: string }[] },
>(quiz: { id: string; passingScore: number; questions: Q[] }) {
  return {
    id: quiz.id,
    passingScore: quiz.passingScore,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options.map((o) => ({ id: o.id, text: o.text })),
    })),
  };
}
