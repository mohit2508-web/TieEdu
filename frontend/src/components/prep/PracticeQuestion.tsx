import React, { useState } from 'react';
import { Lightbulb, Sparkles } from 'lucide-react';
import type { LessonPractice } from '@/lib/prepApi';
import { FillInput, OrderList, practiceOrder, typedRight } from '@/components/skill-test/QuestionInputs';

/**
 * One lesson practice question (Train). MCQ, typed (fill the blank / find the
 * error) or drag-into-order. Practice mode only: the student may open the
 * memory-trick hint before answering, and after answering sees right/wrong,
 * the answer, the explanation and the trick. Tests never show these until the review.
 */
export const PracticeQuestion: React.FC<{ q: LessonPractice; n: number; seed: string; onAnswered: (right: boolean) => void }> = ({ q, n, seed, onAnswered }) => {
  const kind = q.kind || 'mcq';
  const [picked, setPicked] = useState<number | null>(null);
  const [typed, setTyped] = useState('');
  const [order, setOrder] = useState<number[]>(() => practiceOrder(seed, q.items?.length || 0));
  const [result, setResult] = useState<boolean | null>(null);
  const [hint, setHint] = useState(false);
  const shown = result !== null;

  const answer = (right: boolean) => { setResult(right); onAnswered(right); };
  const pick = (k: number) => { if (shown) return; setPicked(k); answer(k === q.correct); };
  const checkTyped = () => { if (!shown && typed.trim()) answer(typedRight(q.answers || [], typed)); };
  const checkOrder = () => { if (!shown) answer(order.every((v, i) => v === i)); };

  return (
    <li className="rounded-card border border-line bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold text-heading">Q{n}.</p>
        <span className="rounded-full bg-surface-hover px-2.5 py-0.5 text-xs font-semibold text-muted">
          {kind === 'fill' ? 'Type the answer' : kind === 'order' ? 'Put in order' : 'Choose one'}
        </span>
      </div>
      <pre className={`mt-2 whitespace-pre-wrap break-words text-heading ${q.code ? 'overflow-x-auto rounded-xl bg-surface-hover p-4 font-mono text-[0.95rem] leading-relaxed' : 'font-sans text-lg'}`}>{q.question}</pre>

      {kind === 'mcq' && (
        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
          {q.options.map((o, k) => {
            const tone = !shown ? 'border-line hover:border-signal' : k === q.correct ? 'border-success bg-success-soft' : k === picked ? 'border-danger bg-danger-soft' : 'border-line opacity-70';
            return (
              <button key={k} type="button" disabled={shown} onClick={() => pick(k)} className={`min-h-[48px] rounded-xl border-2 px-4 py-2 text-left text-base text-heading ${tone}`}>
                <span className="mr-2 font-bold">{String.fromCharCode(65 + k)}.</span>{o}
              </button>
            );
          })}
        </div>
      )}

      {kind === 'fill' && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1"><FillInput value={typed} onChange={setTyped} onSubmit={checkTyped} disabled={shown} tone={shown ? (result ? 'right' : 'wrong') : undefined} /></div>
          {!shown && <button type="button" onClick={checkTyped} disabled={!typed.trim()} className="btn btn-primary min-h-[48px] px-5 sm:mt-6">Check</button>}
        </div>
      )}

      {kind === 'order' && (
        <div className="mt-4">
          <OrderList items={q.items || []} order={order} onChange={setOrder} disabled={shown} checked={shown} mono={!!q.code} />
          {!shown && <button type="button" onClick={checkOrder} className="btn btn-primary mt-3 min-h-[48px] px-5">Check order</button>}
        </div>
      )}

      {!shown && q.trick && (
        hint
          ? <p className="mt-3 flex gap-2 rounded-xl bg-signal-soft p-3 text-base text-heading"><Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-deep" aria-hidden /><span><span className="font-bold">Hint: </span>{q.trick}</span></p>
          : <button type="button" onClick={() => setHint(true)} className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-2 text-base font-semibold text-link"><Sparkles className="h-4 w-4" aria-hidden /> Need a hint?</button>
      )}

      {shown && (
        <div className="mt-4 space-y-2">
          <div className={`flex gap-2 rounded-xl p-4 text-base ${result ? 'bg-success-soft' : 'bg-danger-soft'}`}>
            <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-deep" aria-hidden />
            <div className="min-w-0">
              <p className="font-bold text-heading">
                {result ? 'Correct.' : kind === 'mcq' ? `Answer: ${String.fromCharCode(65 + q.correct)}.` : kind === 'fill' ? 'Not quite. The answer:' : 'Not quite. The right order:'}
              </p>
              {!result && kind === 'fill' && <p className="mt-1 font-mono text-heading">{(q.answers || []).join('  or  ')}</p>}
              {!result && kind === 'order' && (
                <ol className="mt-1 list-decimal space-y-0.5 pl-5">{(q.items || []).map((t) => <li key={t} className={q.code ? 'font-mono' : ''}>{t}</li>)}</ol>
              )}
              <p className="mt-2 whitespace-pre-line text-body">{q.explanation}</p>
            </div>
          </div>
          {q.trick && (
            <p className="flex gap-2 rounded-xl bg-signal-soft p-4 text-base text-heading">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-deep" aria-hidden />
              <span><span className="font-bold">Memory trick: </span>{q.trick}</span>
            </p>
          )}
        </div>
      )}
    </li>
  );
};
