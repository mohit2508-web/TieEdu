import React, { useState } from 'react';
import { Plus, Trash2, BookOpenCheck } from 'lucide-react';
import type { ExamPrep, ExamPrepPyq, ExamPrepUnit } from '@/types';
import { updateAdminCourse } from '@/lib/coursesApi';
import { Btn, Field, TextInput, TextArea, ErrorNote, OkNote } from './CourseAdminUi';

/**
 * Semester Exam Mode authoring — units, summaries, important questions, PYQs.
 *
 * Self-saving, like ModuleTestEditor: it owns its draft and PUTs the whole
 * `exam_prep` payload through the course update route, which normalises and
 * stores it. An all-empty draft saves as `null` (section removed), so clearing
 * is a real action rather than an empty shell that still renders a heading on
 * the learner page.
 *
 * Questions and summaries are one-per-line textareas — the same convention the
 * tags/outcomes fields use — because these are lists a human types fast, not
 * structured records. PYQs are the exception: a year + question + optional
 * solution needs a row, so they get repeatable rows.
 */

const blankUnit = (): ExamPrepUnit => ({ title: '', summary: '', questions: [''], pyqs: [] });
const blankPyq = (): ExamPrepPyq => ({ year: '', question: '', solution: '' });

/** Split a one-per-line textarea into a clean list, dropping blanks. */
const toLines = (raw: string): string[] =>
  raw
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

/** Join a list back into the textarea's one-per-line format. */
const fromLines = (list: string[] | undefined): string => (list || []).join('\n');

export const ExamPrepEditor: React.FC<{
  courseId: string;
  examPrep: ExamPrep | null | undefined;
  onSaved: (prep: ExamPrep | null) => void;
}> = ({ courseId, examPrep, onSaved }) => {
  const [draft, setDraft] = useState<ExamPrep | null>(examPrep ?? null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  // Re-sync when the parent swaps courses, but let a local edit win while the
  // author is still working — same rule as ModuleTestEditor.
  const [seenKey, setSeenKey] = useState<string | null>(null);
  const courseKey = JSON.stringify({ t: examPrep?.target, u: examPrep?.units?.length, i: examPrep?.important_questions?.length, p: examPrep?.previous_year_questions?.length });
  if (courseKey !== seenKey) {
    setSeenKey(courseKey);
    setDraft(examPrep ?? null);
  }

  const mutate = (patch: Partial<ExamPrep>) => {
    setDraft((d) => ({ ...(d ?? { units: [] }), ...patch }));
    setOk(false);
  };

  const setUnit = (i: number, patch: Partial<ExamPrepUnit>) => {
    const units = (draft?.units || []).slice();
    units[i] = { ...units[i], ...patch };
    mutate({ units });
  };

  const addUnit = () => mutate({ units: [...(draft?.units || []), blankUnit()] });

  const removeUnit = (i: number) =>
    mutate({ units: (draft?.units || []).filter((_, idx) => idx !== i) });

  const setUnitPyq = (ui: number, pi: number, patch: Partial<ExamPrepPyq>) => {
    const units = (draft?.units || []).slice();
    const pyqs = (units[ui].pyqs || []).slice();
    pyqs[pi] = { ...pyqs[pi], ...patch };
    units[ui] = { ...units[ui], pyqs };
    mutate({ units });
  };

  const addUnitPyq = (ui: number) => {
    const units = (draft?.units || []).slice();
    units[ui] = { ...units[ui], pyqs: [...(units[ui].pyqs || []), blankPyq()] };
    mutate({ units });
  };

  const removeUnitPyq = (ui: number, pi: number) => {
    const units = (draft?.units || []).slice();
    units[ui] = { ...units[ui], pyqs: (units[ui].pyqs || []).filter((_, idx) => idx !== pi) };
    mutate({ units });
  };

  const setCoursePyq = (pi: number, patch: Partial<ExamPrepPyq>) => {
    const pyqs = (draft?.previous_year_questions || []).slice();
    pyqs[pi] = { ...pyqs[pi], ...patch };
    mutate({ previous_year_questions: pyqs });
  };

  const addCoursePyq = () =>
    mutate({ previous_year_questions: [...(draft?.previous_year_questions || []), blankPyq()] });

  const removeCoursePyq = (pi: number) =>
    mutate({ previous_year_questions: (draft?.previous_year_questions || []).filter((_, idx) => idx !== pi) });

  const buildPayload = (): ExamPrep | null => {
    if (!draft) return null;
    const units = (draft.units || [])
      .map((u) => ({
        title: u.title.trim(),
        ...(u.summary?.trim() ? { summary: u.summary.trim() } : {}),
        questions: toLines(fromLines(u.questions)),
        ...((u.pyqs || []).filter((p) => p.year.trim() && p.question.trim()).length
          ? {
              pyqs: (u.pyqs || [])
                .filter((p) => p.year.trim() && p.question.trim())
                .map((p) => ({
                  year: p.year.trim(),
                  question: p.question.trim(),
                  ...(p.solution?.trim() ? { solution: p.solution.trim() } : {}),
                })),
            }
          : {}),
      }))
      .filter((u) => u.title && (u.summary || u.questions.length || (u.pyqs?.length || 0) > 0));
    const important = toLines(fromLines(draft.important_questions));
    const coursePyqs = (draft.previous_year_questions || [])
      .filter((p) => p.year.trim() && p.question.trim())
      .map((p) => ({
        year: p.year.trim(),
        question: p.question.trim(),
        ...(p.solution?.trim() ? { solution: p.solution.trim() } : {}),
      }));
    const target = draft.target?.trim() || '';
    if (!target && !units.length && !important.length && !coursePyqs.length) return null;
    return {
      ...(target ? { target } : {}),
      units,
      ...(important.length ? { important_questions: important } : {}),
      ...(coursePyqs.length ? { previous_year_questions: coursePyqs } : {}),
    };
  };

  const save = async () => {
    setError(null);
    setBusy(true);
    try {
      const payload = buildPayload();
      await updateAdminCourse(courseId, { exam_prep: payload });
      onSaved(payload);
      setOk(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the exam prep');
    } finally {
      setBusy(false);
    }
  };

  if (!draft) {
    return (
      <div className="rounded-xl border border-dashed border-line p-5 text-center">
        <p className="text-sm text-text-light mb-3">
          No Semester Exam Mode yet. Add board-wise units, important questions and PYQs so
          students can revise here before their university exams.
        </p>
        <Btn variant="primary" onClick={() => setDraft({ units: [blankUnit()] })}>
          <BookOpenCheck className="w-3.5 h-3.5" /> Add exam prep
        </Btn>
      </div>
    );
  }

  const units = draft.units || [];

  return (
    <div className="space-y-5">
      <div className="flex items-end gap-3 flex-wrap">
        <Field label="Board / target" className="flex-1 min-w-[240px]" hint="e.g. AKTU · CSE Semester 3">
          <TextInput
            value={draft.target || ''}
            placeholder="AKTU · CSE Semester 3"
            onChange={(e) => mutate({ target: e.target.value })}
          />
        </Field>
        <div className="ml-auto flex gap-2">
          <Btn variant="danger" onClick={() => setRemoving(true)} disabled={removing}>
            <Trash2 className="w-3.5 h-3.5" /> Remove prep
          </Btn>
          <Btn variant="primary" onClick={save} busy={busy}>
            Save exam prep
          </Btn>
        </div>
      </div>

      {removing && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 space-y-2.5">
          <p className="text-xs text-red-800">
            Remove Semester Exam Mode from this course? Students lose the revision tabs until
            it is added again.
          </p>
          <div className="flex gap-2">
            <Btn
              variant="danger"
              busy={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await updateAdminCourse(courseId, { exam_prep: null });
                  onSaved(null);
                  setDraft(null);
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Could not remove the exam prep');
                } finally {
                  setBusy(false);
                  setRemoving(false);
                }
              }}
            >
              Yes, remove it
            </Btn>
            <Btn onClick={() => setRemoving(false)}>Keep it</Btn>
          </div>
        </div>
      )}

      {error && <ErrorNote>{error}</ErrorNote>}
      {ok && <OkNote>Saved.</OkNote>}

      {/* Units */}
      <div className="space-y-4">
        {units.map((unit, ui) => (
          <div key={ui} className="rounded-xl border border-line bg-app-warm p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-text-light">
                Unit {ui + 1}
              </span>
              <div className="ml-auto">
                <Btn variant="danger" onClick={() => removeUnit(ui)} title="Delete unit">
                  <Trash2 className="w-3.5 h-3.5" />
                </Btn>
              </div>
            </div>

            <Field label="Unit title">
              <TextInput
                value={unit.title}
                placeholder="Unit 1 — Signals & Systems basics"
                onChange={(e) => setUnit(ui, { title: e.target.value })}
              />
            </Field>

            <Field
              label="Unit summary"
              hint="Condensed revision notes — one screen per unit. This is what the learner sees on the Units tab and in the one-night revision."
            >
              <TextArea
                rows={4}
                value={unit.summary || ''}
                placeholder={'Key definitions, formulas, graphs to remember — in plain sentences.'}
                onChange={(e) => setUnit(ui, { summary: e.target.value })}
              />
            </Field>

            <Field label="Important questions" hint="One per line. Checkable by students on the Important tab.">
              <TextArea
                rows={3}
                value={fromLines(unit.questions)}
                placeholder={'Explain convolution and its geometric interpretation.\nState and prove the sampling theorem.'}
                onChange={(e) => setUnit(ui, { questions: e.target.value.split('\n') })}
              />
            </Field>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-text-light">
                Previous-year questions for this unit
              </p>
              {(unit.pyqs || []).map((pyq, pi) => (
                <div key={pi} className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <TextInput
                      value={pyq.year}
                      placeholder="Year, e.g. 2023"
                      className="w-28"
                      onChange={(e) => setUnitPyq(ui, pi, { year: e.target.value })}
                    />
                    <div className="ml-auto">
                      <Btn variant="danger" onClick={() => removeUnitPyq(ui, pi)} title="Delete PYQ">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Btn>
                    </div>
                  </div>
                  <TextArea
                    rows={2}
                    value={pyq.question}
                    placeholder="The question as it was asked"
                    onChange={(e) => setUnitPyq(ui, pi, { question: e.target.value })}
                  />
                  <TextArea
                    rows={2}
                    value={pyq.solution || ''}
                    placeholder="Solution / marking hint (optional)"
                    onChange={(e) => setUnitPyq(ui, pi, { solution: e.target.value })}
                  />
                </div>
              ))}
              <Btn onClick={() => addUnitPyq(ui)}>
                <Plus className="w-3.5 h-3.5" /> Add PYQ
              </Btn>
            </div>
          </div>
        ))}
        <Btn onClick={addUnit}>
          <Plus className="w-3.5 h-3.5" /> Add unit
        </Btn>
      </div>

      {/* Course-wide lists */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Course-wide important questions" hint="One per line. Shown on top of the per-unit ones.">
          <TextArea
            rows={4}
            value={fromLines(draft.important_questions)}
            placeholder="Questions that span units"
            onChange={(e) => mutate({ important_questions: e.target.value.split('\n') })}
          />
        </Field>
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-text-light">
            Course-wide PYQs
          </p>
          {(draft.previous_year_questions || []).map((pyq, pi) => (
            <div key={pi} className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
              <div className="flex items-center gap-2">
                <TextInput
                  value={pyq.year}
                  placeholder="Year"
                  className="w-28"
                  onChange={(e) => setCoursePyq(pi, { year: e.target.value })}
                />
                <div className="ml-auto">
                  <Btn variant="danger" onClick={() => removeCoursePyq(pi)} title="Delete PYQ">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Btn>
                </div>
              </div>
              <TextArea
                rows={2}
                value={pyq.question}
                placeholder="The question as it was asked"
                onChange={(e) => setCoursePyq(pi, { question: e.target.value })}
              />
              <TextArea
                rows={2}
                value={pyq.solution || ''}
                placeholder="Solution / marking hint (optional)"
                onChange={(e) => setCoursePyq(pi, { solution: e.target.value })}
              />
            </div>
          ))}
          <Btn onClick={addCoursePyq}>
            <Plus className="w-3.5 h-3.5" /> Add PYQ
          </Btn>
        </div>
      </div>
    </div>
  );
};

export default ExamPrepEditor;
