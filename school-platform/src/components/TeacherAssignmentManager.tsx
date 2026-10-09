'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

export interface TeacherOption {
  userId: string;
  name: string;
  email: string | null;
}
export interface CourseOption {
  id: string;
  title: string;
}
export interface AssignmentRow {
  id: string;
  courseId: string;
  courseTitle: string;
  teacherId: string;
  teacherName: string;
}

export function TeacherAssignmentManager({
  teachers,
  courses,
  assignments,
}: {
  teachers: TeacherOption[];
  courses: CourseOption[];
  assignments: AssignmentRow[];
}) {
  const t = useTranslations('teachers');
  const router = useRouter();
  const [teacherId, setTeacherId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function assign() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/school/teacher-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherUserId: teacherId, courseId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Request failed');
      }
      setCourseId('');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/school/teacher-assignments/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Request failed');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const canAssign = teachers.length > 0 && courses.length > 0;

  return (
    <div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold text-slate-500">{t('teacher')}</span>
          <select
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          >
            <option value="">{t('pickTeacher')}</option>
            {teachers.map((tc) => (
              <option key={tc.userId} value={tc.userId}>
                {tc.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold text-slate-500">{t('course')}</span>
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          >
            <option value="">{t('pickCourse')}</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={busy || !teacherId || !courseId || !canAssign}
          onClick={assign}
          className="rounded-lg bg-sky-700 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {t('assign')}
        </button>
      </div>

      {assignments.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          {t('empty')}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {assignments.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">{a.teacherName}</p>
                <p className="text-xs text-slate-400">{a.courseTitle}</p>
              </div>
              <button
                disabled={busy}
                onClick={() => remove(a.id)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-50"
              >
                {t('remove')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
