import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Keyboard, Settings2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { PulseShell, StatusPill, CodeViewer, VERDICT_META, FlagChip } from './PulseUi';
import { relTime, type PulseBundle, type PulseStudent, type Verdict } from '@/lib/pulse/demo';

/**
 * Project Pulse — Review mode (PROJECT_PULSE_PLAN.md §12.2 #5). One student at a
 * time: their task folder's code on the left, the requirement checklist on the
 * right. Keys: 1 done · 2 partly · 3 missing (for the highlighted requirement,
 * then it moves on), N save & next, P previous. No AI: every mark is the teacher's.
 */

export interface ReviewModeProps {
  data: PulseBundle & { prev?: string; next?: string; position?: number; total?: number };
  queue: PulseStudent[];
  dashboardHref: string;
  goTo: (studentId: string) => void;
  onSave: (body: { verdicts: Record<string, Verdict | null>; score?: number | null; reason?: string; feedback?: string }) => Promise<void>;
  comments: string[];
  onSaveComments: (list: string[]) => Promise<void>;
}

const MARKS: Verdict[] = ['met', 'partial', 'missing'];

export const ReviewMode: React.FC<ReviewModeProps> = ({ data, queue, dashboardHref, goTo, onSave, comments, onSaveComments }) => {
  const { task, now } = data;
  const s = data.students[0];
  const [marks, setMarks] = useState<Record<string, Verdict>>({});
  const [cursor, setCursor] = useState(0);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<'code' | 'diff'>('code');

  useEffect(() => {
    const m: Record<string, Verdict> = {};
    for (const r of task.requirements) m[r.id] = s.reqs[r.id]?.verdict ?? 'unreviewed';
    setMarks(m);
    setCursor(Math.max(0, task.requirements.findIndex((r) => m[r.id] === 'unreviewed')));
    setScore(s.override ? String(s.override.score) : '');
    setFeedback('');
    setMsg(null);
  }, [s, task]);

  const idx = queue.findIndex((x) => x.id === s.id);
  const nextId = queue.length ? queue[(idx + 1) % queue.length]?.id : data.next;
  const prevId = queue.length ? queue[(idx - 1 + queue.length) % queue.length]?.id : data.prev;
  const reviewedCount = queue.filter((x) => x.reviewed).length;
  const preview = useMemo(() => {
    const vals = task.requirements.map((r) => marks[r.id] ?? 'unreviewed');
    return Math.round((vals.reduce((n, v) => n + (v === 'met' ? 1 : v === 'partial' ? 0.5 : 0), 0) / Math.max(1, vals.length)) * 100);
  }, [marks, task]);

  const mark = useCallback((reqIndex: number, v: Verdict) => {
    const r = task.requirements[reqIndex];
    if (!r) return;
    setMarks((m) => ({ ...m, [r.id]: m[r.id] === v ? 'unreviewed' : v }));
    setCursor((c) => Math.min(task.requirements.length - 1, reqIndex === c ? c + 1 : c));
  }, [task]);

  const save = useCallback(async (advance: boolean) => {
    setBusy(true); setMsg(null);
    try {
      const verdicts: Record<string, Verdict | null> = {};
      for (const r of task.requirements) verdicts[r.id] = marks[r.id] === 'unreviewed' ? null : marks[r.id];
      const trimmed = score.trim();
      await onSave({
        verdicts,
        ...(trimmed === '' ? (s.override ? { score: null } : {}) : { score: Number(trimmed), reason: 'Set in review' }),
        ...(feedback.trim() ? { feedback: feedback.trim() } : {}),
      });
      if (advance && nextId && nextId !== s.id) goTo(nextId);
      else setMsg('Saved.');
    } catch (e: any) { setMsg(e?.message || 'Could not save.'); } finally { setBusy(false); }
  }, [marks, score, feedback, task, onSave, goTo, nextId, s]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (e.key === '1' || e.key === '2' || e.key === '3') { e.preventDefault(); mark(cursor, MARKS[Number(e.key) - 1]); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(task.requirements.length - 1, c + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
      else if (e.key.toLowerCase() === 'n' && !busy) { e.preventDefault(); save(true); }
      else if (e.key.toLowerCase() === 'p' && prevId) { e.preventDefault(); goTo(prevId); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cursor, mark, save, busy, prevId, goTo, task]);

  const editComments = () => {
    const text = window.prompt('Your saved comments, one per line:', comments.join('\n'));
    if (text != null) onSaveComments(text.split('\n').map((x) => x.trim()).filter(Boolean));
  };

  return (
    <PulseShell
      title={`Review · ${s.name}`}
      role="teacher"
      crumbs={[{ href: dashboardHref, label: task.title }]}
      actions={
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-secondary-soft px-3 py-1 font-semibold text-secondary">Reviewed {reviewedCount}/{queue.length}</span>
          <select aria-label="Jump to student" value={s.id} onChange={(e) => goTo(e.target.value)} className="h-9 max-w-[12rem] rounded-cell border border-line bg-card px-2 text-sm">
            {queue.map((x, i) => <option key={x.id} value={x.id}>{i + 1}. {x.name}{x.reviewed ? ' ✓' : ''}</option>)}
          </select>
          <button type="button" disabled={!prevId} onClick={() => prevId && goTo(prevId)} className="inline-flex h-9 items-center gap-1 rounded-cell border border-line bg-card px-2.5 font-semibold text-muted hover:text-heading"><ArrowLeft className="h-4 w-4" /> Prev</button>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <StatusPill status={s.status} />
            <span className="font-mono text-xs text-muted">{s.roll}{s.repo ? ` · ${s.repo}/${task.folder ?? ''}` : ''}</span>
            <span className="text-xs text-muted">· {s.commits.length} commits · last {relTime(s.lastActivity, now)}</span>
            {s.flags.slice(0, 3).map((f, i) => <FlagChip key={i} flag={f} compact />)}
            <span className="ml-auto inline-flex rounded-cell border border-line bg-card p-0.5 text-xs font-semibold">
              {(['code', 'diff'] as const).map((m) => (
                <button key={m} type="button" onClick={() => setMode(m)} className={cn('rounded-well px-2.5 py-1', mode === m ? 'bg-hero text-hero-on' : 'text-muted')}>{m === 'code' ? 'Code' : 'Changes'}</button>
              ))}
            </span>
          </div>
          {s.folder_hint ? <p className="rounded-cell bg-warning-soft px-4 py-2.5 text-sm text-signal-ink">{s.folder_hint}</p> : null}
          <CodeViewer files={s.files} starter={task.starter} mode={mode} />
          <p className="text-xs text-muted">
            <Link href={dashboardHref.replace(/\/?$/, '') + `/${s.id}`} className="text-link hover:underline">Open full student page</Link> for the timeline, integrity details and private notes.
          </p>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-[calc(var(--header-h)+1rem)] lg:self-start">
          <section className="rounded-card border border-line bg-card">
            <h2 className="flex items-center justify-between border-b border-line px-4 py-3 font-display text-h3 text-heading">
              Requirements <span className="text-xs font-semibold text-muted">≈ {preview}% met</span>
            </h2>
            <ol>
              {task.requirements.map((r, i) => {
                const v = marks[r.id] ?? 'unreviewed';
                return (
                  <li key={r.id} onClick={() => setCursor(i)} className={cn('border-b border-line px-4 py-3 last:border-0', cursor === i && 'bg-highlight/20 shadow-[inset_3px_0_0_rgb(var(--rgb-signal))]')}>
                    <p className="text-sm font-semibold text-heading"><span className="mr-1 font-mono text-xs text-muted">{r.id}</span>{r.title}</p>
                    {r.detail ? <p className="mt-0.5 text-xs text-muted">{r.detail}</p> : null}
                    <div className="mt-2 flex gap-1" role="group" aria-label={`Mark ${r.id}`}>
                      {MARKS.map((m, k) => (
                        <button key={m} type="button" aria-pressed={v === m} onClick={(e) => { e.stopPropagation(); mark(i, m); }}
                          className={cn('inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-well border text-xs font-semibold',
                            v === m ? cn(VERDICT_META[m].soft, VERDICT_META[m].ink, 'border-transparent') : 'border-line text-muted hover:text-heading')}>
                          {VERDICT_META[m].symbol} {VERDICT_META[m].label} <kbd className="ml-0.5 hidden text-[10px] opacity-60 sm:inline">{k + 1}</kbd>
                        </button>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {task.auto_tests && task.tests.length ? (
            <p className="rounded-cell border border-line bg-card px-4 py-2.5 text-sm text-body">
              Tests: <span className="font-semibold">{Object.values(s.tests).filter((t) => t.pass).length}/{task.tests.length}</span> passed
            </p>
          ) : null}

          <section className="rounded-card border border-line bg-card p-4">
            <label className="block text-xs font-semibold text-muted" htmlFor="rv-score">Score (empty = from your marks)</label>
            <input id="rv-score" inputMode="numeric" value={score} onChange={(e) => setScore(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder={String(s.score)}
              className="mt-1 h-9 w-24 rounded-cell border border-line-strong/60 bg-card px-3 text-sm" />
            <label className="mt-3 block text-xs font-semibold text-muted" htmlFor="rv-fb">Feedback to the student</label>
            <textarea id="rv-fb" rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder={s.feedback ? `Last sent: ${s.feedback}` : 'Optional'}
              className="mt-1 w-full rounded-cell border border-line-strong/60 bg-card p-2.5 text-sm" />
            <div className="mt-2 flex flex-wrap gap-1">
              {comments.map((c) => (
                <button key={c} type="button" onClick={() => setFeedback((f) => (f ? `${f} ${c}` : c))} className="rounded-full border border-line px-2.5 py-1 text-xs text-body hover:bg-surface-hover">{c}</button>
              ))}
              <button type="button" onClick={editComments} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-link"><Settings2 className="h-3.5 w-3.5" /> {comments.length ? 'Edit saved comments' : 'Add saved comments'}</button>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" disabled={busy} onClick={() => save(false)} className="inline-flex h-10 items-center gap-1 rounded-cell border border-line px-3 text-sm font-semibold text-heading hover:bg-surface-hover"><Check className="h-4 w-4" /> Save</button>
              <button type="button" disabled={busy} onClick={() => save(true)} className="inline-flex h-10 flex-1 items-center justify-center gap-1 rounded-cell bg-signal text-sm font-semibold text-on-primary shadow-edge-primary disabled:opacity-60">
                {busy ? 'Saving…' : 'Save & next'} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            {msg ? <p className="mt-2 text-xs text-muted" role="status">{msg}</p> : null}
            <p className="mt-3 flex items-center gap-1 text-[11px] text-muted"><Keyboard className="h-3.5 w-3.5" /> 1 done · 2 partly · 3 missing · ↑↓ move · N save &amp; next · P previous</p>
          </section>
        </aside>
      </div>
    </PulseShell>
  );
};
