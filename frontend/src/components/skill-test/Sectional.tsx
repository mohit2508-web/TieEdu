import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, Lock, Check, PenLine, Code2 } from 'lucide-react';
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

export interface CodingProblemView {
  id: string; title: string; difficulty: string; topic: string; statement: string;
  input_format: string; output_format: string; constraints: string[];
  samples: { input: string; output: string; explain?: string }[]; solution_href: string;
}
export interface CodingConfig { title: string; count: number; minutes: number; problems: CodingProblemView[] }
export interface CodingMark { id: string; status: 'solved' | 'partial' | 'not'; language: string }

const LANGS = ['C', 'C++', 'Java', 'Python'];
const MARKS: Array<[CodingMark['status'], string]> = [['solved', 'Solved: every sample matches'], ['partial', 'Partly: some samples match'], ['not', 'Not solved']];

/** The attempt's problems: `count` distinct ones, fixed per attempt so a reload shows the same paper. */
export function pickProblems(cfg: CodingConfig, attemptId: string): CodingProblemView[] {
  let seed = [...attemptId].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
  const pool = [...cfg.problems];
  const out: CodingProblemView[] = [];
  while (out.length < cfg.count && pool.length) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    out.push(pool.splice(seed % pool.length, 1)[0]);
  }
  return out;
}

const store = {
  get: (k: string) => { try { return window.localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { window.localStorage.setItem(k, v); } catch { /* private mode */ } },
};

/**
 * Coding section after the MCQ sections (TCS Part B). There is no code runner:
 * the student codes (here or in their own compiler), checks the samples, then
 * marks each problem. Marks are not part of the score; they feed the prep plan.
 * Code and the section clock survive a reload.
 */
export const CodingTask: React.FC<{ config: CodingConfig; attemptId: string; submitting: boolean; onSubmit: (marks: CodingMark[]) => void }> = ({ config, attemptId, submitting, onSubmit }) => {
  const problems = useMemo(() => pickProblems(config, attemptId), [config, attemptId]);
  const k = (x: string) => `tieedu_coding_${attemptId}_${x}`;
  const [startedAt] = useState(() => {
    const saved = Number(typeof window === 'undefined' ? 0 : store.get(k('start')));
    if (saved) return saved;
    const now = Date.now();
    store.set(k('start'), String(now));
    return now;
  });
  const [now, setNow] = useState(Date.now());
  const [tab, setTab] = useState(0);
  const [lang, setLang] = useState(() => (typeof window === 'undefined' ? null : store.get(k('lang'))) || 'C++');
  const [code, setCode] = useState<Record<string, string>>(() => Object.fromEntries(problems.map((p) => [p.id, (typeof window === 'undefined' ? null : store.get(k(p.id))) || ''])));
  const [checking, setChecking] = useState(false);
  const [marks, setMarks] = useState<Record<string, CodingMark['status']>>({});

  const left = Math.max(0, config.minutes * 60 - Math.floor((now - startedAt) / 1000));
  useEffect(() => {
    if (checking) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [checking]);
  // Time up: coding closes and the self-check opens.
  useEffect(() => { if (left === 0) setChecking(true); }, [left]);

  const p = problems[tab];
  const allMarked = problems.every((x) => marks[x.id]);

  if (checking) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{config.title} · self-check</p>
        <h2 className="mt-2 text-xl font-bold text-gray-900">How did each problem go?</h2>
        <p className="mt-1 text-sm text-gray-600">Be honest: this goes into your coding score in the plan, not into the test score. Model solutions are in Train → Coding round after you submit.</p>
        {problems.map((x, i) => (
          <fieldset key={x.id} className="mt-5 rounded-xl border border-gray-200 bg-white p-4">
            <legend className="px-1 text-sm font-semibold text-gray-900">Problem {i + 1}: {x.title}</legend>
            <div className="mt-1 space-y-2">
              {MARKS.map(([v, label]) => (
                <label key={v} className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 has-[:checked]:border-signal has-[:checked]:bg-signal-soft">
                  <input type="radio" name={`mark-${x.id}`} value={v} checked={marks[x.id] === v} onChange={() => setMarks((m) => ({ ...m, [x.id]: v }))} />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <button
          type="button"
          disabled={submitting || !allMarked}
          onClick={() => onSubmit(problems.map((x) => ({ id: x.id, status: marks[x.id], language: lang })))}
          className="btn btn-primary focus-ring mt-6 w-full min-h-[52px]"
        >
          {submitting ? 'Submitting…' : allMarked ? 'Submit test' : 'Mark every problem to submit'}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          <Code2 className="h-4 w-4" aria-hidden /> {config.title} · {problems.length} problems
        </p>
        <span className={`inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold tabular-nums ${left < 300 ? 'text-danger' : 'text-gray-800'}`}>
          <Clock className="h-4 w-4" aria-hidden /> {fmt(left)}
        </span>
      </div>
      <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-gray-800">
        Secure mode is paused here, so you can run your code in your own compiler. Paste your final code below and check it against every sample.
      </p>
      <div className="mt-4 flex gap-2" role="tablist">
        {problems.map((x, i) => (
          <button key={x.id} type="button" role="tab" aria-selected={i === tab} onClick={() => setTab(i)}
            className={`min-h-[44px] rounded-full px-4 text-sm font-semibold ${i === tab ? 'bg-signal text-on-primary' : 'border border-gray-200 text-gray-600'}`}>
            Problem {i + 1}
          </button>
        ))}
      </div>
      <article className="mt-4 rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
        <h2 className="text-lg font-bold text-gray-900">{p.title}</h2>
        <p className="mt-0.5 text-xs text-gray-500">{p.topic} · {p.difficulty}</p>
        <p className="mt-3 whitespace-pre-wrap text-base text-gray-900">{p.statement}</p>
        <h3 className="mt-4 text-sm font-semibold text-gray-900">Input format</h3>
        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{p.input_format}</p>
        <h3 className="mt-3 text-sm font-semibold text-gray-900">Output format</h3>
        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{p.output_format}</p>
        {p.constraints.length > 0 && (
          <>
            <h3 className="mt-3 text-sm font-semibold text-gray-900">Constraints</h3>
            <ul className="mt-1 list-disc pl-5 text-sm text-gray-700">{p.constraints.map((c) => <li key={c}>{c}</li>)}</ul>
          </>
        )}
        {p.samples.map((s, i) => (
          <div key={i} className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Sample {i + 1} input</p>
              <pre className="mt-1 overflow-x-auto rounded-lg bg-gray-100 p-3 text-sm text-gray-900">{s.input}</pre>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Sample {i + 1} output</p>
              <pre className="mt-1 overflow-x-auto rounded-lg bg-gray-100 p-3 text-sm text-gray-900">{s.output}</pre>
            </div>
            {s.explain && <p className="text-sm text-gray-600 sm:col-span-2">{s.explain}</p>}
          </div>
        ))}
      </article>
      <div className="mt-4 flex items-center gap-2">
        <label htmlFor="coding-lang" className="text-sm font-semibold text-gray-700">Language</label>
        <select id="coding-lang" value={lang} onChange={(e) => { setLang(e.target.value); store.set(k('lang'), e.target.value); }}
          className="min-h-[44px] rounded-lg border border-gray-200 bg-white px-3 text-sm">
          {LANGS.map((l) => <option key={l}>{l}</option>)}
        </select>
      </div>
      <textarea
        value={code[p.id] || ''}
        onChange={(e) => { const v = e.target.value; setCode((c) => ({ ...c, [p.id]: v })); store.set(k(p.id), v); }}
        onKeyDown={(e) => {
          // Tab indents instead of leaving the editor.
          if (e.key !== 'Tab') return;
          e.preventDefault();
          const el = e.currentTarget;
          const { selectionStart: a, selectionEnd: b, value } = el;
          const v = `${value.slice(0, a)}    ${value.slice(b)}`;
          setCode((c) => ({ ...c, [p.id]: v }));
          store.set(k(p.id), v);
          requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = a + 4; });
        }}
        rows={16}
        spellCheck={false}
        aria-label={`Your ${lang} code for problem ${tab + 1}`}
        className="mt-2 w-full rounded-xl border border-gray-200 bg-white p-4 font-mono text-sm focus:border-signal focus:outline-none focus:ring-4 focus:ring-signal/10"
        placeholder={`// Your ${lang} solution: read from standard input, print to standard output`}
      />
      <button type="button" onClick={() => setChecking(true)} className="btn btn-primary focus-ring mt-6 w-full min-h-[52px]">
        Finish coding
      </button>
    </div>
  );
};

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
