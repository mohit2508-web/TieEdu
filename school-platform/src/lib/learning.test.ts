import { describe, expect, it } from 'vitest';
import { computeCourseProgress, gradeQuiz, toStudentQuiz } from './learning';

describe('computeCourseProgress', () => {
  it('computes a rounded percentage', () => {
    expect(computeCourseProgress(6, 3)).toEqual({ total: 6, completed: 3, pct: 50 });
    expect(computeCourseProgress(3, 1).pct).toBe(33);
  });

  it('guards empty courses and out-of-range input', () => {
    expect(computeCourseProgress(0, 0)).toEqual({ total: 0, completed: 0, pct: 0 });
    expect(computeCourseProgress(6, 99).completed).toBe(6);
    expect(computeCourseProgress(6, -4).completed).toBe(0);
  });
});

describe('gradeQuiz', () => {
  const questions = [
    { id: 'q1', correctOptionId: 'a' },
    { id: 'q2', correctOptionId: 'c' },
    { id: 'q3', correctOptionId: 'b' },
  ];

  it('scores all-correct as pass', () => {
    const g = gradeQuiz(questions, { q1: 'a', q2: 'c', q3: 'b' }, 60);
    expect(g).toMatchObject({ score: 100, correct: 3, total: 3, passed: true });
  });

  it('treats unanswered questions as incorrect', () => {
    const g = gradeQuiz(questions, { q1: 'a' }, 60);
    expect(g).toMatchObject({ score: 33, correct: 1, passed: false });
    expect(g.perQuestion.find((p) => p.questionId === 'q2')?.optionId).toBeNull();
  });

  it('applies the passing threshold', () => {
    const g = gradeQuiz(questions, { q1: 'a', q2: 'c' }, 66);
    expect(g.score).toBe(67);
    expect(g.passed).toBe(true);
  });

  it('never passes an empty quiz', () => {
    expect(gradeQuiz([], {}, 0).passed).toBe(false);
  });
});

describe('toStudentQuiz', () => {
  it('removes the answer key', () => {
    const quiz = {
      id: 'quiz1',
      passingScore: 60,
      questions: [
        {
          id: 'q1',
          prompt: 'Pick one',
          options: [
            { id: 'a', text: 'Right', isCorrect: true },
            { id: 'b', text: 'Wrong', isCorrect: false },
          ],
        },
      ],
    };
    const safe = toStudentQuiz(quiz as any);
    expect(JSON.stringify(safe)).not.toContain('isCorrect');
    expect(safe.questions[0].options).toEqual([
      { id: 'a', text: 'Right' },
      { id: 'b', text: 'Wrong' },
    ]);
  });
});
