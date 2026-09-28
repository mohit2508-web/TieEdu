import React, { useState } from 'react';
import { Plus, Trash2, ChevronRight, ChevronDown, Copy, ArrowUp, ArrowDown } from 'lucide-react';
import type { AdminCourseForEditor, AdminLesson } from '@/types';
import {
  addModule,
  updateModule,
  deleteModule,
  reorderModules,
  addLesson,
  deleteLesson,
  reorderLessons,
  duplicateAdminCourse,
  deleteAdminCourse,
} from '@/lib/coursesApi';
import { Btn, Field, TextInput, TextArea, Toggle, ErrorNote, Pill, Loading } from './CourseAdminUi';
import { AdminLessonEditor } from './AdminLessonEditor';

/**
 * Course structure editor: course metadata, the module tree, and the selected
 * lesson's content.
 *
 * Structural changes (add/rename/reorder/delete) are saved immediately because
 * they each hit their own endpoint. Lesson *content* is edited in a draft and
 * saved explicitly, so a half-written lesson never lands in the database.
 */
export const AdminCourseEditor: React.FC<{
  course: AdminCourseForEditor;
  onChanged: () => Promise<void> | void;
  onBack: () => void;
}> = ({ course, onChanged, onBack }) => {
  const [openModules, setOpenModules] = useState<Record<string, boolean>>(() =>
    Object.fromEntries((course.modules || []).map((m, i) => [m.id, i === 0]))
  );
  const [selectedLesson, setSelectedLesson] = useState<{ moduleId: string; lesson: AdminLesson } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newModule, setNewModule] = useState('');

  const run = async (fn: () => Promise<any>, after?: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await onChanged();
      after?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That change could not be saved');
    } finally {
      setBusy(false);
    }
  };

  const createModule = () => {
    const title = newModule.trim();
    if (title.length < 2) {
      setError('Module title is required.');
      return;
    }
    run(() => addModule(course.id, { title }), () => setNewModule(''));
  };

  const moveModule = (index: number, dir: -1 | 1) => {
    const ids = (course.modules || []).map((m) => m.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    run(() => reorderModules(course.id, ids));
  };

  const moveLesson = (moduleId: string, index: number, dir: -1 | 1) => {
    const mod = (course.modules || []).find((m) => m.id === moduleId);
    if (!mod) return;
    const ids = (mod.lessons || []).map((l) => l.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    run(() => reorderLessons(moduleId, ids));
  };

  const dropModule = (id: string) => {
    if (!window.confirm('Delete this module and every lesson in it? Learner progress on those lessons is kept but the lessons disappear from the course.')) {
      return;
    }
    run(() => deleteModule(id), () => setSelectedLesson(null));
  };

  const dropLesson = (id: string) => {
    if (!window.confirm('Delete this lesson? The certificates already issued keep their lesson count, so a revoked course will not re-certify.')) {
      return;
    }
    run(() => deleteLesson(id), () => setSelectedLesson(null));
  };

  const addNewLesson = (moduleId: string) => {
    run(() => addLesson(moduleId, { title: 'New lesson', summary: '', duration_minutes: 10 }));
  };

  const selected = selectedLesson && (course.modules || []).find((m) => m.id === selectedLesson.moduleId)?.lessons
    .find((l) => l.id === selectedLesson.lesson.id)
    ? selectedLesson
    : null;

  if (selected) {
    const mod = (course.modules || []).find((m) => m.id === selected!.moduleId)!;
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedLesson(null)}
          className="text-[12px] font-bold text-[#0284C7] hover:underline flex items-center gap-1"
        >
          <ChevronRight className="w-3.5 h-3.5" /> Back to {mod.title}
        </button>
        <div>
          <h2 className="text-[17px] font-extrabold text-[#10151C] tracking-tight">{selected.lesson.title}</h2>
          <p className="text-[12px] text-[#6B7280] font-mono mt-0.5">{selected.lesson.id}</p>
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
        <AdminLessonEditor lesson={selected.lesson} courseSlug={course.slug} onSaved={onChanged} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <button onClick={onBack} className="text-[12px] font-bold text-[#0284C7] hover:underline">
            ← All courses
          </button>
          <h2 className="text-[17px] font-extrabold text-[#10151C] tracking-tight mt-1">{course.title}</h2>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {course.published ? <Pill tone="green">Published</Pill> : <Pill tone="amber">Draft</Pill>}
            <Pill>{course.level}</Pill>
            <Pill>{course.stats.lesson_count} lessons</Pill>
            <Pill>{course.stats.quiz_count} quizzes</Pill>
            {course.certificate_eligible ? <Pill tone="green">Certificate</Pill> : <Pill>No certificate</Pill>}
          </div>
        </div>
        <div className="flex gap-2">
          <Btn onClick={() => run(() => duplicateAdminCourse(course.id))} busy={busy} title="Creates an unpublished copy">
            <Copy className="w-3.5 h-3.5" /> Duplicate
          </Btn>
          <Btn
            variant="danger"
            busy={busy}
            onClick={() => {
              if (window.confirm(`Delete "${course.title}"? Issued certificates stay verifiable but the course is gone.`)) {
                run(() => deleteAdminCourse(course.id), onBack);
              }
            }}
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </Btn>
        </div>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      {/*
        Publishing is the whole visibility switch, so state plainly what is
        still missing rather than letting an empty course go live.
      */}
      {course.published && course.stats.lesson_count === 0 && (
        <ErrorNote>
          This course is published but has no lessons. Students can see it and enrol in nothing.
        </ErrorNote>
      )}

      <div className="space-y-2.5">
        {(course.modules || []).map((m, mi) => {
          const open = openModules[m.id];
          return (
            <div key={m.id} className="rounded-xl border border-[#E9E7E1] bg-white overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-[#F8F7F4] border-b border-[#EDEDEB]">
                <button
                  onClick={() => setOpenModules({ ...openModules, [m.id]: !open })}
                  className="text-[#6B7280] hover:text-[#10151C]"
                >
                  {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <div className="min-w-0 flex-1">
                  <input
                    defaultValue={m.title}
                    onBlur={(e) => {
                      const t = e.target.value.trim();
                      if (t && t !== m.title) run(() => updateModule(m.id, { title: t }));
                    }}
                    className="w-full bg-transparent text-[14px] font-bold text-[#10151C] outline-none focus:bg-white focus:px-2 focus:py-0.5 focus:rounded"
                  />
                  <p className="text-[11px] text-[#6B7280] px-2">
                    {m.lessons?.length || 0} lessons
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Btn onClick={() => moveModule(mi, -1)} disabled={mi === 0} title="Move up">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </Btn>
                  <Btn onClick={() => moveModule(mi, 1)} disabled={mi === (course.modules || []).length - 1} title="Move down">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </Btn>
                  <Btn onClick={() => addNewLesson(m.id)} title="Add lesson">
                    <Plus className="w-3.5 h-3.5" />
                  </Btn>
                  <Btn variant="danger" onClick={() => dropModule(m.id)} title="Delete module">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Btn>
                </div>
              </div>

              {open && (
                <div className="p-3 space-y-1.5">
                  {(m.lessons || []).length === 0 && (
                    <p className="text-[12.5px] text-[#6B7280] px-2 py-2">No lessons in this module yet.</p>
                  )}
                  {(m.lessons || []).map((l, li) => (
                    <div
                      key={l.id}
                      className="flex items-center gap-2.5 rounded-lg border border-[#EDEDEB] px-3 py-2 hover:border-[#0284C7]/40"
                    >
                      <span className="text-[10px] font-mono text-[#9CA3AF] w-5">{li + 1}</span>
                      <button
                        onClick={() => setSelectedLesson({ moduleId: m.id, lesson: l })}
                        className="flex-1 text-left min-w-0"
                      >
                        <span className="block text-[13px] font-bold text-[#10151C] truncate">{l.title}</span>
                        <span className="block text-[11px] text-[#6B7280]">
                          {l.duration_minutes} min
                          {l.video ? ' · video' : ''}
                          {l.quiz ? ` · quiz (${l.quiz.questions?.length || 0})` : ''}
                          {(l.blocks || []).length ? ` · ${l.blocks.length} blocks` : ''}
                        </span>
                      </button>
                      <div className="flex gap-1.5">
                        <Btn onClick={() => moveLesson(m.id, li, -1)} disabled={li === 0} title="Move up">
                          <ArrowUp className="w-3.5 h-3.5" />
                        </Btn>
                        <Btn onClick={() => moveLesson(m.id, li, 1)} disabled={li === (m.lessons || []).length - 1} title="Move down">
                          <ArrowDown className="w-3.5 h-3.5" />
                        </Btn>
                        <Btn variant="danger" onClick={() => dropLesson(l.id)} title="Delete lesson">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Btn>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <TextInput
          value={newModule}
          placeholder="New module title"
          onChange={(e) => setNewModule(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') createModule();
          }}
          className="max-w-md"
        />
        <Btn variant="primary" onClick={createModule} busy={busy} disabled={newModule.trim().length < 2}>
          <Plus className="w-3.5 h-3.5" /> Add module
        </Btn>
      </div>
    </div>
  );
};
