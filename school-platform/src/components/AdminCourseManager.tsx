'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

export interface TrackOption {
  id: string;
  name: string;
}

export interface AdminCourse {
  id: string;
  title: string;
  slug: string;
  status: string;
  level: string;
  trackName: string | null;
  moduleCount: number;
}

export function AdminCourseManager({
  tracks,
  courses,
}: {
  tracks: TrackOption[];
  courses: AdminCourse[];
}) {
  const t = useTranslations('admin');
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [tags, setTags] = useState('');
  const [skillTrackId, setSkillTrackId] = useState(tracks[0]?.id ?? '');
  const [level, setLevel] = useState('BEGINNER');
  const [gradeMin, setGradeMin] = useState(3);
  const [gradeMax, setGradeMax] = useState(12);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const input =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500';

  async function call(url: string, init: RequestInit, okMsg: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...init,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const problems = Array.isArray(data.problems) ? ` (${data.problems.join(', ')})` : '';
        throw new Error((data.error || 'Request failed') + problems);
      }
      setNotice(okMsg);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function create(e: React.FormEvent) {
    e.preventDefault();
    void call(
      '/api/admin/courses',
      {
        method: 'POST',
        body: JSON.stringify({
          title,
          summary: summary || undefined,
          tags: tags ? tags.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
          skillTrackId,
          level,
          gradeMin,
          gradeMax,
        }),
      },
      t('created')
    ).then(() => {
      setTitle('');
      setSummary('');
      setTags('');
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <h2 className="text-sm font-bold text-slate-900 sm:col-span-2">{t('createTitle')}</h2>
        <input className={input} placeholder={t('fieldTitle')} value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} />
        <select className={input} value={skillTrackId} onChange={(e) => setSkillTrackId(e.target.value)} required>
          {tracks.map((track) => (
            <option key={track.id} value={track.id}>{track.name}</option>
          ))}
        </select>
        <input className={input} placeholder={t('fieldSummary')} value={summary} onChange={(e) => setSummary(e.target.value)} />
        <input className={input} placeholder={t('fieldTags')} value={tags} onChange={(e) => setTags(e.target.value)} />
        <select className={input} value={level} onChange={(e) => setLevel(e.target.value)}>
          <option value="BEGINNER">BEGINNER</option>
          <option value="INTERMEDIATE">INTERMEDIATE</option>
          <option value="ADVANCED">ADVANCED</option>
        </select>
        <div className="flex items-center gap-2">
          <input className={input} type="number" min={3} max={12} value={gradeMin} onChange={(e) => setGradeMin(Number(e.target.value))} />
          <span className="text-slate-400">–</span>
          <input className={input} type="number" min={3} max={12} value={gradeMax} onChange={(e) => setGradeMax(Number(e.target.value))} />
        </div>
        <div className="sm:col-span-2">
          <button disabled={busy || !skillTrackId} className="rounded-xl bg-sky-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            {busy ? t('saving') : t('createBtn')}
          </button>
        </div>
        {notice && <p className="text-sm text-emerald-600 sm:col-span-2">{notice}</p>}
        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      </form>

      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {courses.length === 0 && <li className="p-4 text-sm text-slate-500">{t('empty')}</li>}
        {courses.map((course) => (
          <li key={course.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">{course.title}</p>
              <p className="text-xs text-slate-400">
                {course.trackName ?? '—'} · {t(`status.${course.status}`)} · {course.level} · {course.moduleCount} {t('modules')}
              </p>
            </div>
            {course.status === 'PUBLISHED' ? (
              <button
                disabled={busy}
                onClick={() => call(`/api/admin/courses/${course.id}/publish`, { method: 'DELETE' }, t('unpublished'))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-50"
              >
                {t('unpublish')}
              </button>
            ) : (
              <button
                disabled={busy}
                onClick={() => call(`/api/admin/courses/${course.id}/publish`, { method: 'POST' }, t('published'))}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {t('publish')}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
