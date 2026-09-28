import React, { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import type { AdminLessonQuiz, AdminQuizQuestion } from '@/types';
import { Btn, Field, TextInput, TextArea, ErrorNote } from './CourseAdminUi';

/**
 * Quiz authoring.
 *
 * The admin is the only place the answer key exists: `correct_index` is stored
 * and returned here, and the server strips it before anything reaches a learner.
 * That is why the editor has to be explicit about which option is correct
 * instead of inferring it.
 */

const blankQuestion = (): AdminQuizQuestion => ({
  prompt: '',
  options: ['', ''],
  correct_index: 0,
  explanation: '',
});

export const AdminQuizEditor: React.FC<{
  quiz: AdminLessonQuiz | null | undefined;
  onSave: (quiz: AdminLessonQuiz) => Promise<void>;
  onRemove: () => Promise<void>;
}> = ({ quiz, onSave, onRemove }) => {
  const [draft, setDraft] = useState<AdminLessonQuiz | null>(quiz ?? null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-sync when the parent switches lessons, but let a local edit win while the
  // author is still working on it.
  const [seenId, setSeenId] = useState<string | null>(null);
  const incomingId = quiz?.id ?? null;
  if (incomingId !== seenId) {
    setSeenId(incomingId);
    if (incomingId !== (draft?.id ?? null)) setDraft(quiz ?? null);
  }

  const questions = draft?.questions ?? [];

  const mutate = (next: Partial<AdminLessonQuiz>) =>
    setDraft((d) => ({ ...(d ?? { questions: [] }), ...next }) as AdminLessonQuiz);

  const setQuestion = (i: number, patch: Partial<AdminQuizQuestion>) => {
    const next = questions.slice();
    next[i] = { ...next[i], ...patch };
    mutate({ questions: next });
  };

  const addQuestion = () => {
    setDraft({ ...(draft ?? { passing_percent: 70 }), questions: [...questions, blankQuestion()] });
  };

  const removeQuestion = (i: number) => {
    const next = questions.filter((_, idx) => idx !== i);
    mutate({ questions: next.map((q, idx) => (q.correct_index > idx ? { ...q, correct_index: Math.max(0, idx) } : q)) });
  };

  const moveQuestion = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= questions.length) return;
    const next = questions.slice();
    [next[i], next[j]] = [next[j], next[i]];
    mutate({ questions: next });
  };

  const setOption = (qi: number, oi: number, value: string) => {
    const options = questions[qi].options.slice();
    options[oi] = value;
    setQuestion(qi, { options });
  };

  const addOption = (qi: number) => setQuestion(qi, { options: [...questions[qi].options, ''] });

  const removeOption = (qi: number) => {
    const options = questions[qi].options.filter((_, oi) => oi !== questions[qi].correct_index);
    setQuestion(qi, {
      options,
      correct_index: Math.min(questions[qi].correct_index, options.length - 1),
    });
  };

  /**
   * Block the save on a question the server would silently drop, so the author
   * finds out here instead of watching their quiz come back with fewer
   * questions than they wrote.
   */
  const validate = (): string | null => {
    if (questions.length === 0) return 'Add at least one question.';
    for (let i = 0; i < questions.length; i += 1) {
      const q = questions[i];
      if (!q.prompt.trim()) return `Question ${i + 1} needs a prompt.`;
      const filled = q.options.filter((o) => o.trim());
      if (filled.length < 2) return `Question ${i + 1} needs at least two options.`;
      if (!Number.isInteger(q.correct_index) || q.correct_index < 0 || q.correct_index >= filled.length) {
        return `Question ${i + 1} needs a correct option marked.`;
      }
    }
    return null;
  };

  const save = async () => {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onSave({
        ...(draft ?? {}),
        passing_percent: Math.max(1, Math.min(100, Number(draft?.passing_percent ?? 70))),
        questions: questions.map((q) => ({
          ...(q.id ? { id: q.id } : {}),
          prompt: q.prompt.trim(),
          options: q.options.map((o) => o.trim()).filter(Boolean),
          correct_index: q.correct_index,
          explanation: (q.explanation || '').trim(),
        })),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the quiz');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await onRemove();
      setDraft(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove the quiz');
    } finally {
      setBusy(false);
      setRemoving(false);
    }
  };

  if (!draft) {
    return (
      <div className="rounded-xl border border-dashed border-[#E9E7E1] p-6 text-center">
        <p className="text-[13px] text-[#6B7280] mb-3">
          No quiz on this lesson. Learners who finish it will move straight on to the next lesson.
        </p>
        <Btn variant="primary" onClick={() => setDraft({ passing_percent: 70, questions: [blankQuestion()] })}>
          <Plus className="w-3.5 h-3.5" /> Add quiz
        </Btn>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Field label="Pass mark (%)" className="w-28">
          <TextInput
            type="number"
            min={1}
            max={100}
            value={draft.passing_percent ?? 70}
            onChange={(e) => mutate({ passing_percent: Number(e.target.value) })}
          />
        </Field>
        <div className="flex items-center gap-2">
          {incomingId && (
            <Btn variant="danger" onClick={() => setRemoving(true)} disabled={removing}>
              <Trash2 className="w-3.5 h-3.5" /> Remove quiz
            </Btn>
          )}
          <Btn variant="primary" onClick={save} busy={busy}>
            Save quiz
          </Btn>
        </div>
      </div>

      {removing && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 space-y-2.5">
          <p className="text-[12.5px] text-red-800">
            Remove this quiz? Learners lose the +{40} XP step and the lesson counts as read-only again.
          </p>
          <div className="flex gap-2">
            <Btn variant="danger" onClick={remove} busy={busy}>
              Yes, remove it
            </Btn>
            <Btn onClick={() => setRemoving(false)}>Keep it</Btn>
          </div>
        </div>
      )}

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="space-y-3">
        {questions.map((q, qi) => (
          <div key={qi} className="rounded-xl border border-[#E9E7E1] p-4 bg-[#FCFBF8]">
            <div className="flex items-center gap-2 mb-2.5">
              <GripVertical className="w-3.5 h-3.5 text-[#9CA3AF]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Question {qi + 1}</span>
              <div className="ml-auto flex gap-1.5">
                <Btn onClick={() => moveQuestion(qi, -1)} disabled={qi === 0} title="Move up">
                  ↑
                </Btn>
                <Btn onClick={() => moveQuestion(qi, 1)} disabled={qi === questions.length - 1} title="Move down">
                  ↓
                </Btn>
                <Btn variant="danger" onClick={() => removeQuestion(qi)} title="Delete question">
                  <Trash2 className="w-3.5 h-3.5" />
                </Btn>
              </div>
            </div>

            <TextArea
              rows={2}
              value={q.prompt}
              placeholder="What does this data type actually do?"
              onChange={(e) => setQuestion(qi, { prompt: e.target.value })}
            />

            <div className="mt-3 space-y-1.5">
              {q.options.map((opt, oi) => {
                const isCorrect = q.correct_index === oi;
                return (
                  <div
                    key={oi}
                    className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 ${
                      isCorrect ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`correct-${qi}`}
                      checked={isCorrect}
                      onChange={() => setQuestion(qi, { correct_index: oi })}
                      title="Mark as the correct answer"
                      className="accent-emerald-600"
                    />
                    <TextInput
                      value={opt}
                      placeholder={`Option ${oi + 1}`}
                      onChange={(e) => setOption(qi, oi, e.target.value)}
                      className="flex-1"
                    />
                    {q.options.length > 2 && (
                      <button
                        onClick={() => removeOption(qi)}
                        title="Remove option"
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
              <Btn onClick={() => addOption(qi)}>
                <Plus className="w-3.5 h-3.5" /> Option
              </Btn>
            </div>

            <TextInput
              className="mt-3"
              value={q.explanation || ''}
              placeholder="Shown after the learner answers — why the right option is right"
              onChange={(e) => setQuestion(qi, { explanation: e.target.value })}
            />
          </div>
        ))}
      </div>

      <Btn onClick={addQuestion}>
        <Plus className="w-3.5 h-3.5" /> Add question
      </Btn>
    </div>
  );
};
