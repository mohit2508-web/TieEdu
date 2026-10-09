'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

interface Option {
  id: string;
  text: string;
}
interface Question {
  id: string;
  prompt: string;
  options: Option[];
}
interface Quiz {
  id: string;
  passingScore: number;
  questions: Question[];
}
interface Lesson {
  id: string;
  title: string;
  summary: string | null;
  kind: string;
  durationMins: number | null;
  contentUrl: string | null;
  contentBody: string | null;
  completed: boolean;
  quiz: Quiz | null;
}
interface Module {
  id: string;
  title: string;
  summary: string | null;
  lessons: Lesson[];
}
export interface PlayerData {
  enrollment: { id: string; progressPct: number; status: string };
  course: {
    id: string;
    slug: string;
    title: string;
    summary: string | null;
    skillTrack: string | null;
    modules: Module[];
  };
}

interface QuizResult {
  score: number;
  passed: boolean;
  correct: number;
  total: number;
  perQuestion: { questionId: string; correct: boolean }[];
}

export function CoursePlayer({ data }: { data: PlayerData }) {
  const t = useTranslations('learn');
  const router = useRouter();

  const lessons = useMemo(() => data.course.modules.flatMap((m) => m.lessons), [data.course.modules]);
  const [completed, setCompleted] = useState<Set<string>>(
    () => new Set(lessons.filter((l) => l.completed).map((l) => l.id))
  );
  const [selectedId, setSelectedId] = useState<string>(
    () => (lessons.find((l) => !l.completed) ?? lessons[0])?.id ?? ''
  );
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = lessons.find((l) => l.id === selectedId) ?? null;
  const pct = lessons.length === 0 ? 0 : Math.round((completed.size / lessons.length) * 100);

  function selectLesson(id: string) {
    setSelectedId(id);
    setAnswers({});
    setResult(null);
    setError(null);
  }

  async function markComplete(lesson: Lesson) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/learning/lessons/${lesson.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId: data.enrollment.id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Request failed');
      }
      setCompleted((prev) => new Set(prev).add(lesson.id));
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitQuiz(lesson: Lesson, quiz: Quiz) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/learning/quizzes/${quiz.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId: data.enrollment.id, answers }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Request failed');
      setResult(body as QuizResult);
      if (body.passed) {
        setCompleted((prev) => new Set(prev).add(lesson.id));
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[280px_1fr]">
      <aside>
        <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>{t('progress')}</span>
            <span className="text-sky-700">{pct}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-sky-600" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <ol className="space-y-2">
          {data.course.modules.map((m, mi) => (
            <li key={m.id}>
              <p className="px-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                {t('moduleNumber', { n: mi + 1 })} · {m.title}
              </p>
              <ul className="mt-1 space-y-1">
                {m.lessons.map((l) => {
                  const active = l.id === selectedId;
                  const done = completed.has(l.id);
                  return (
                    <li key={l.id}>
                      <button
                        onClick={() => selectLesson(l.id)}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm ${
                          active ? 'border-sky-300 bg-sky-50 text-sky-900' : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        <span className="truncate">{l.title}</span>
                        <span className={done ? 'text-emerald-600' : 'text-slate-300'}>{done ? '✓' : '○'}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      </aside>

      <section className="min-w-0">
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {!selected ? (
          <p className="text-sm text-slate-500">{t('empty')}</p>
        ) : (
          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-bold text-slate-900">{selected.title}</h2>
              <span className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                <span className="rounded bg-slate-100 px-2 py-0.5">{t(`kind.${selected.kind}`)}</span>
                {selected.durationMins ? <span>{t('minutes', { n: selected.durationMins })}</span> : null}
                {completed.has(selected.id) && (
                  <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-700">{t('completed')}</span>
                )}
              </span>
            </div>

            {selected.summary && <p className="mt-1 text-sm text-slate-500">{selected.summary}</p>}

            {selected.kind === 'VIDEO' && selected.contentUrl && (
              <a
                href={selected.contentUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-block rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white"
              >
                {t('watch')}
              </a>
            )}

            {selected.contentBody && (
              <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">{selected.contentBody}</p>
            )}

            {selected.quiz ? (
              <QuizBlock
                quiz={selected.quiz}
                answers={answers}
                onAnswer={(qid, oid) => setAnswers((a) => ({ ...a, [qid]: oid }))}
                result={result}
                busy={busy}
                onSubmit={() => submitQuiz(selected, selected.quiz!)}
                labels={{ submit: t('submitQuiz'), retry: t('retry'), passed: t('passed'), failed: t('failed'), score: t('score') }}
              />
            ) : (
              !completed.has(selected.id) && (
                <button
                  disabled={busy}
                  onClick={() => markComplete(selected)}
                  className="mt-5 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy ? t('saving') : t('markComplete')}
                </button>
              )
            )}
          </article>
        )}
      </section>
    </div>
  );
}

function QuizBlock({
  quiz,
  answers,
  onAnswer,
  result,
  busy,
  onSubmit,
  labels,
}: {
  quiz: Quiz;
  answers: Record<string, string>;
  onAnswer: (questionId: string, optionId: string) => void;
  result: QuizResult | null;
  busy: boolean;
  onSubmit: () => void;
  labels: { submit: string; retry: string; passed: string; failed: string; score: string };
}) {
  const correctSet = new Set(result?.perQuestion.filter((p) => p.correct).map((p) => p.questionId));
  return (
    <div className="mt-5 space-y-4">
      {quiz.questions.map((q, i) => (
        <fieldset key={q.id} className="rounded-xl border border-slate-200 p-3">
          <legend className="px-1 text-sm font-semibold text-slate-800">
            {i + 1}. {q.prompt}
          </legend>
          <div className="mt-1 space-y-1">
            {q.options.map((o) => {
              const chosen = answers[q.id] === o.id;
              const mark =
                result && chosen ? (correctSet.has(q.id) ? 'text-emerald-600' : 'text-red-600') : '';
              return (
                <label key={o.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name={q.id}
                    checked={chosen}
                    disabled={!!result}
                    onChange={() => onAnswer(q.id, o.id)}
                  />
                  <span className={mark}>{o.text}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      {result ? (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-semibold ${
            result.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}
        >
          {result.passed ? labels.passed : labels.failed} · {labels.score}: {result.score}%
        </div>
      ) : (
        <button
          disabled={busy}
          onClick={onSubmit}
          className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {labels.submit}
        </button>
      )}
    </div>
  );
}
