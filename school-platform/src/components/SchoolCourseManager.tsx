'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

export interface SchoolCatalogItem {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  level: string;
  gradeMin: number;
  gradeMax: number;
  trackName: string | null;
  enabled: boolean;
}

export function SchoolCourseManager({ courses }: { courses: SchoolCatalogItem[] }) {
  const t = useTranslations('schoolCourses');
  const locale = useLocale();
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(course: SchoolCatalogItem) {
    setBusyId(course.id);
    setError(null);
    try {
      const res = course.enabled
        ? await fetch(`/api/school/courses/${course.id}`, { method: 'DELETE' })
        : await fetch('/api/school/courses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courseId: course.id }),
          });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Request failed');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (courses.length === 0) {
    return <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">{t('empty')}</p>;
  }

  return (
    <div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {courses.map((course) => (
          <li key={course.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">{course.title}</p>
              <p className="text-xs text-slate-400">
                {course.trackName ?? '—'} · {course.level} · {t('grades', { min: course.gradeMin, max: course.gradeMax })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {course.enabled && (
                <Link
                  href={`/${locale}/school/courses/${course.id}/progress`}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
                >
                  {t('progress')}
                </Link>
              )}
              <button
                disabled={busyId === course.id}
                onClick={() => toggle(course)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                  course.enabled ? 'border border-slate-200 text-slate-600' : 'bg-sky-700 text-white'
                }`}
              >
                {course.enabled ? t('disable') : t('enable')}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
