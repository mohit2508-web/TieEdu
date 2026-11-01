import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, Lock, Check, PenLine } from 'lucide-react';
import { Sheet } from '@/components/common/Sheet';

/**
 * Sectional mode for company mocks (Infosys pattern): each section has its own
 * timer, runs in order, and cannot be reopened once submitted or timed out.
 * Progress survives a refresh (stored per attempt), so a reload cannot reset a
 * section's clock.
 */
export interface TestSection { topicId: string; name: string; count: number; minutes: number }
export interface WritingConfig { title: string; words: [number, number]; tasks: { prompt: string; model: string; tip: string }[] }

const key = (attemptId: string) => `tieedu_sections_${attemptId}`;

export function useSections({ attemptId, questions, sections, active }: {
  attemptId: string | null;
  questions: { topicId: string }[];
  sections: TestSection[] | null;
  active: boolean;
}) {
  const enabled = !!sections?.length && !!attemptId && questions.length > 0;
  const ranges = useMemo(() => (sections || []).map((s) => {
    const idx = questions.map((q, i) => (q.topicId === s.topicId ? i : -1)).filter((i) => i >= 0);
    return idx.length ? [idx[0], idx[idx.length - 1]] as [number, number] : null;
  }), [sections, questions]);

  const [state, setState] = useState<{ idx: number; startedAt: number; done: boolean }>({ idx: 0, startedAt: Date.now(), done: false });
  const [now, setNow] = useState(Date.now());

  // Restore (or start) this attempt's section clock.
  useEffect(() => {
    if (!enabled || !attemptId) return;
    try {
      const saved = JSON.parse(window.localStorage.getItem(key(attemptId)) || 'null');
      if (saved && typeof saved.idx === 'number') { setState(saved); return; }
    } catch { /* fall through to a fresh start */ }
    const fresh = { idx: 0, startedAt: Date.now(), done: false };
    setState(fresh);
    try { window.localStorage.setItem(key(attemptId), JSON.stringify(fresh)); } catch { /* private mode */ }
  }, [enabled, attemptId]);

  useEffect(() => {
    if (!enabled || !active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [enabled, active]);

  const advance = useCallback(() => {
    setState((s) => {
      const last = (sections?.length || 1) - 1;
      const next = s.idx < last ? { idx: s.idx + 1, startedAt: Date.now(), done: false } : { ...s, done: true };
      try { if (attemptId) window.localStorage.setItem(key(attemptId), JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [sections, attemptId]);

  const section = enabled ? sections![state.idx] : null;
  const secLeft = section ? Math.max(0, section.minutes * 60 - Math.floor((now - state.startedAt) / 1000)) : 0;

  // Time up: the section closes and the next one opens.
  useEffect(() => {
    if (enabled && active && !state.done && section && secLeft === 0) advance();
  }, [enabled, active, state.done, section, secLeft, advance]);

  return {
    enabled,
    idx: state.idx,
    done: state.done,
    section,
    secLeft,
    range: (enabled && ranges[state.idx]) || ([0, Math.max(0, questions.length - 1)] as [number, number]),
    advance,
  };
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export const SectionBar: React.FC<{ sections: TestSection[]; idx: number; secLeft: number }> = ({ sections, idx, secLeft }) => (
  <div className="mx-auto flex max-w-3xl items-center gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none]">
    {sections.map((s, i) => (
      <span
        key={s.topicId}
        className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
          i === idx ? 'bg-signal text-on-primary' : i < idx ? 'bg-gray-100 text-gray-500' : 'border border-gray-200 text-gray-500'
        }`}
      >
        {i < idx ? <Check className="h-3 w-3" aria-hidden /> : i > idx ? <Lock className="h-3 w-3" aria-hidden /> : null}
        {String.fromCharCode(65 + i)}. {s.name}
        {i === idx && (
          <span className={`ml-1 inline-flex items-center gap-1 tabular-nums ${secLeft < 60 ? 'text-danger' : ''}`}>
            <Clock className="h-3 w-3" aria-hidden /> {fmt(secLeft)}
          </span>
        )}
      </span>
    ))}
  </div>
);

export const SectionSubmitSheet: React.FC<{ open: boolean; name: string; unanswered: number; last: boolean; onCancel: () => void; onConfirm: () => void }> = ({ open, name, unanswered, last, onCancel, onConfirm }) => (
  <Sheet open={open} onClose={onCancel} title={`Submit ${name}?`}>
    <div className="px-5 pb-6">
      <p className="text-sm text-body">
        {unanswered > 0 ? `${unanswered} question${unanswered === 1 ? ' is' : 's are'} still unanswered. ` : ''}
        You cannot come back to this section{last ? '' : ' once the next one starts'}.
      </p>
      <div className="mt-5 flex gap-2">
        <button type="button" onClick={onCancel} className="btn btn-ghost focus-ring min-h-[48px] flex-1">Keep working</button>
        <button type="button" onClick={onConfirm} className="btn btn-primary focus-ring min-h-[48px] flex-1">{last ? 'Finish sections' : 'Submit section'}</button>
      </div>
    </div>
  </Sheet>
);

/** Ungraded email task after the last section; the model answer appears once the student is done. */
export const WritingTask: React.FC<{ config: WritingConfig; attemptId: string; submitting: boolean; onSubmit: () => void }> = ({ config, attemptId, submitting, onSubmit }) => {
  const task = config.tasks[[...attemptId].reduce((n, c) => n + c.charCodeAt(0), 0) % config.tasks.length];
  const [text, setText] = useState('');
  const [reveal, setReveal] = useState(false);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const [min, max] = config.words;
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
        <PenLine className="h-4 w-4" aria-hidden /> {config.title} · optional · {min}–{max} words
      </p>
      <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-base text-gray-900">{task.prompt}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        aria-label="Your email"
        className="mt-4 w-full rounded-xl border border-gray-200 bg-white p-4 text-base focus:border-signal focus:outline-none focus:ring-4 focus:ring-signal/10"
        placeholder="Subject: …"
      />
      <p className={`mt-1 text-sm ${words === 0 ? 'text-gray-500' : words < min || words > max ? 'text-amber-700' : 'text-emerald-700'}`}>
        {words} words {words > 0 && (words < min ? `· write ${min - words} more` : words > max ? `· cut ${words - max}` : '· good length')}
      </p>
      {reveal ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-semibold text-gray-900">Model answer</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{task.model}</p>
          <p className="mt-3 text-sm text-link"><strong>Tip:</strong> {task.tip}</p>
        </div>
      ) : (
        <button type="button" onClick={() => setReveal(true)} className="btn btn-ghost focus-ring mt-4 min-h-[44px]">I’m done: show the model answer</button>
      )}
      <button type="button" onClick={onSubmit} disabled={submitting} className="btn btn-primary focus-ring mt-6 w-full min-h-[52px]">
        {submitting ? 'Submitting…' : 'Submit test'}
      </button>
    </div>
  );
};
