import React, { useState } from 'react';
import { CheckCircle2, Lightbulb, MinusCircle, XCircle } from 'lucide-react';
import { splitQuestion } from '@/lib/questionText';

export interface ReviewItem {
  id: string; topicId: string; question: string; code: boolean;
  options: string[]; correct: number; selected: number | null; explanation: string;
}

type Filter = 'wrong' | 'skipped' | 'all';

/**
 * After a test: every question with the student's answer, the right answer and
 * why. Opens on the wrong ones, because that is what to study next.
 */
export const AnswerReview: React.FC<{ items: ReviewItem[]; topicName?: (id: string) => string }> = ({ items, topicName }) => {
  const wrong = items.filter((q) => q.selected !== null && q.selected !== q.correct);
  const skipped = items.filter((q) => q.selected === null);
  const [filter, setFilter] = useState<Filter>(wrong.length ? 'wrong' : skipped.length ? 'skipped' : 'all');
  if (!items.length) return null;
  const shown = filter === 'wrong' ? wrong : filter === 'skipped' ? skipped : items;
  const tabs: Array<[Filter, string]> = [['wrong', `Wrong (${wrong.length})`], ['skipped', `Skipped (${skipped.length})`], ['all', `All (${items.length})`]];

  return (
    <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900">Review your answers</h2>
      <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Which questions to show">
        {tabs.map(([k, label]) => (
          <button
            key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
            className={`min-h-[40px] rounded-full border px-4 text-sm font-semibold ${filter === k ? 'border-signal bg-signal-soft text-heading' : 'border-gray-200 text-gray-600'}`}
          >{label}</button>
        ))}
      </div>
      {shown.length === 0 && <p className="mt-4 text-sm text-gray-500">Nothing here. Nice work.</p>}
      <ol className="mt-4 space-y-4">
        {shown.map((q) => {
          const n = items.indexOf(q) + 1;
          const parts = splitQuestion(q.question, q.code);
          const state = q.selected === null ? 'skipped' : q.selected === q.correct ? 'right' : 'wrong';
          return (
            <li key={q.id} className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                {state === 'right' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden /> : state === 'wrong' ? <XCircle className="h-4 w-4 text-red-500" aria-hidden /> : <MinusCircle className="h-4 w-4 text-gray-400" aria-hidden />}
                <span className="text-gray-900">Q{n}</span>
                <span className="text-gray-500">· {state === 'right' ? 'Correct' : state === 'wrong' ? 'Wrong' : 'Not answered'}{topicName ? ` · ${topicName(q.topicId)}` : ''}</span>
              </div>
              {parts.before && <p className="mt-2 whitespace-pre-wrap text-base text-gray-900">{parts.before}</p>}
              {parts.code && <pre className="mt-2 overflow-x-auto rounded-xl bg-gray-900 p-4 font-mono text-sm leading-relaxed text-gray-100">{parts.code}</pre>}
              {parts.after && <p className="mt-2 whitespace-pre-wrap text-base font-medium text-gray-900">{parts.after}</p>}
              <ul className="mt-3 space-y-1.5">
                {q.options.map((o, i) => {
                  const tone = i === q.correct ? 'border-emerald-400 bg-emerald-50' : i === q.selected ? 'border-red-300 bg-red-50' : 'border-gray-200';
                  return (
                    <li key={i} className={`rounded-lg border px-3 py-2 text-sm text-gray-900 ${tone}`}>
                      <span className="mr-2 font-bold">{String.fromCharCode(65 + i)}.</span>{o}
                      {i === q.correct && <span className="ml-2 font-semibold text-emerald-700">✓ correct</span>}
                      {i === q.selected && i !== q.correct && <span className="ml-2 font-semibold text-red-600">your answer</span>}
                    </li>
                  );
                })}
              </ul>
              {q.explanation && (
                <p className="mt-3 flex gap-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                  <span className="whitespace-pre-line">{q.explanation}</span>
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
};
