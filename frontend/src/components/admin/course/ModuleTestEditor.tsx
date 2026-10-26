import React, { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import type { AdminModuleTest, AdminQuizQuestion } from '@/types';
import { updateModule } from '@/lib/coursesApi';
import { Btn, Field, TextInput, TextArea, ErrorNote } from './CourseAdminUi';

/**
 * End-of-module test authoring.
 *
 * Same question discipline as the lesson quiz editor — the answer key lives
 * only here and on the server — plus the draw configuration the quiz does not
 * have: how many questions to draw, the pass mark, and the retake cooldown.
 * Clearing the bank removes the test; an empty save is refused rather than
 * silently deleting the module's checkpoint.
 */

const blankQuestion = (): AdminQuizQuestion => ({
  prompt: '',
  options: ['', ''],
  correct_index: 0,
  explanation: '',
});

const defaultTest = (): AdminModuleTest => ({
  question_count: 5,
  passing_percent: 60,
  retake_cooldown_hours: 0,
  bank: [blankQuestion()],
});

export const ModuleTestEditor: React.FC<{
  moduleId: string;
  test: AdminModuleTest | null | undefined;
  onSaved: (test: AdminModuleTest | null) => void;
}> = ({ moduleId, test, onSaved }) => {
  const [draft, setDraft] = useState<AdminModuleTest | null>(test ?? null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-sync when the parent switches modules, but let a local edit win while
  // the author is still working on it — the draft is only replaced when the
  // module id actually changes.
  const [seenModuleId, setSeenModuleId] = useState<string | null>(null);
  if (moduleId !== seenModuleId) {
    setSeenModuleId(moduleId);
    setDraft(test ?? null);
  }

  const questions = draft?.bank ?? [];

  const mutate = (next: Partial<AdminModuleTest>) => {
    setDraft((d) => ({ ...(d ?? defaultTest()), ...next }));
  };

  const setQuestion = (i: number, patch: Partial<AdminQuizQuestion>) => {
    const next = questions.slice();
    next[i] = { ...next[i], ...patch };
    mutate({ bank: next });
  };

  const addQuestion = () => mutate({ bank: [...questions, blankQuestion()] });

  const removeQuestion = (i: number) => {
    const next = questions.filter((_, idx) => idx !== i);
    mutate({
      bank: next.map((q, idx) =>
        q.correct_index > idx ? { ...q, correct_index: Math.max(0, idx) } : q
      ),
    });
  };

  const moveQuestion = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= questions.length) return;
    const next = questions.slice();
    [next[i], next[j]] = [next[j], next[i]];
    mutate({ bank: next });
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

  const validate = (): string | null => {
    if (!draft) return null;
    const bank = draft.bank.filter((q) => q.prompt.trim());
    if (bank.length === 0) return 'Add at least one question, or remove the test.';
    for (let i = 0; i < bank.length; i += 1) {
      const q = bank[i];
      const filled = q.options.filter((o) => o.trim());
      if (filled.length < 2) return `Question ${i + 1} needs at least two options.`;
      if (!Number.isInteger(q.correct_index) || q.correct_index < 0 || q.correct_index >= filled.length) {
        return `Question ${i + 1} needs a correct option marked.`;
      }
    }
    const count = Math.max(1, Math.min(100, Number(draft.question_count) || 1));
    if (count > bank.length) {
      return `Draw size (${count}) cannot exceed the bank (${bank.length}).`;
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
      const bank = (draft!.bank || [])
        .filter((q) => q.prompt.trim())
        .map((q) => ({
          ...(q.id ? { id: q.id } : {}),
          prompt: q.prompt.trim(),
          options: q.options.map((o) => o.trim()).filter(Boolean),
          correct_index: q.correct_index,
          explanation: (q.explanation || '').trim(),
        }));
      const payload: AdminModuleTest = {
        question_count: Math.max(1, Math.min(100, Number(draft!.question_count) || 1)),
        passing_percent: Math.max(1, Math.min(100, Number(draft!.passing_percent) || 60)),
        retake_cooldown_hours: Math.max(0, Number(draft!.retake_cooldown_hours) || 0),
        bank,
      };
      await updateModule(moduleId, { test: payload });
      onSaved(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the module test');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await updateModule(moduleId, { test: null });
      onSaved(null);
      setDraft(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove the module test');
    } finally {
      setBusy(false);
      setRemoving(false);
    }
  };

  if (!draft) {
    return (
      <div className="rounded-xl border border-dashed border-line p-5 text-center">
        <p className="text-sm text-text-light mb-3">
          No end-of-module test. Learners finish the module&apos;s lessons and move straight on.
        </p>
        <Btn variant="primary" onClick={() => setDraft(defaultTest())}>
          <Plus className="w-3.5 h-3.5" /> Add module test
        </Btn>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <Field label="Questions drawn" className="w-28">
          <TextInput
            type="number"
            min={1}
            max={Math.max(1, questions.length)}
            value={draft.question_count}
            onChange={(e) => mutate({ question_count: Number(e.target.value) })}
          />
        </Field>
        <Field label="Pass mark (%)" className="w-28">
          <TextInput
            type="number"
            min={1}
            max={100}
            value={draft.passing_percent}
            onChange={(e) => mutate({ passing_percent: Number(e.target.value) })}
          />
        </Field>
        <Field label="Retake cooldown (h)" className="w-36">
          <TextInput
            type="number"
            min={0}
            value={draft.retake_cooldown_hours}
            onChange={(e) => mutate({ retake_cooldown_hours: Number(e.target.value) })}
          />
        </Field>
        <div className="ml-auto flex gap-2">
          <Btn variant="danger" onClick={() => setRemoving(true)} disabled={removing}>
            <Trash2 className="w-3.5 h-3.5" /> Remove test
          </Btn>
          <Btn variant="primary" onClick={save} busy={busy}>
            Save test
          </Btn>
        </div>
      </div>

      <p className="text-xs text-text-light">
        Bank: {questions.length} question(s). The learner sees {Math.min(draft.question_count, questions.length)} drawn
        at random. Passing is final — a passed test cannot be re-sat.
      </p>

      {removing && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 space-y-2.5">
          <p className="text-xs text-red-800">
            Remove this module test? Learners who have not passed it lose the checkpoint; passed
            results are kept in their progress history.
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
          <div key={qi} className="rounded-xl border border-line p-4 bg-app-warm">
            <div className="flex items-center gap-2 mb-2.5">
              <GripVertical className="w-3.5 h-3.5 text-text-light" />
              <span className="text-xs font-bold uppercase tracking-wider text-text-light">Question {qi + 1}</span>
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
              placeholder="What does this module actually teach?"
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
                      name={`mt-correct-${moduleId}-${qi}`}
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

export default ModuleTestEditor;
