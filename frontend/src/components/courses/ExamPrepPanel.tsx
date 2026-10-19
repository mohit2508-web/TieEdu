import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, CheckCircle2, Circle, ListChecks, ScrollText, Printer, NotebookPen } from 'lucide-react';
import type { ExamPrep, ExamPrepUnit } from '@/types';

/**
 * Semester Exam Mode — the learner's revision surface.
 *
 * Four tabs over one payload:
 *   Units     — one screen per unit: the unit's summary, then its Qs/PYQs.
 *   Important — every important question, checkable (local tick only).
 *   PYQs      — previous-year questions grouped by year, solutions expandable.
 *   Revision  — condensed, printable, all units in one scroll: the night-before view.
 *
 * The tick state is localStorage, not the server: it is a personal revision
 * checklist, nothing that needs an account, and making it server state would
 * mean a progress row for "ticked a question", which is not progress. Keyed
 * per course so two courses never share a checklist.
 *
 * Design: warm exam-sheet feel — soft paper surfaces, generous line height,
 * no dense tables. Both tabs work as a single column on phones; the tab bar
 * scrolls horizontally rather than wrapping to two rows.
 */

const TICK_KEY = 'tieedu_examprep_ticks_v1';

type TabKey = 'units' | 'important' | 'pyqs' | 'revision';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'units', label: 'Units', icon: ScrollText },
  { key: 'important', label: 'Important', icon: ListChecks },
  { key: 'pyqs', label: 'PYQs', icon: NotebookPen },
  { key: 'revision', label: 'Revision', icon: BookOpenCheck },
];

const readTicks = (slug: string): string[] => {
  try {
    const raw = window.localStorage.getItem(TICK_KEY);
    const all = raw ? JSON.parse(raw) : {};
    const list = all?.[slug];
    return Array.isArray(list) ? list.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

const writeTicks = (slug: string, ticks: string[]) => {
  try {
    const raw = window.localStorage.getItem(TICK_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[slug] = ticks;
    window.localStorage.setItem(TICK_KEY, JSON.stringify(all));
  } catch {
    // Storage unavailable (private mode, quota) — the tick simply does not
    // persist. The UI still toggles in-session; nothing crashes.
  }
};

/** Every important question in the payload, tagged with its unit (or course-wide). */
const collectImportant = (prep: ExamPrep): { unitTitle: string | null; question: string }[] => [
  ...(prep.important_questions || []).map((q) => ({ unitTitle: null as string | null, question: q })),
  ...(prep.units || []).flatMap((u) =>
    (u.questions || []).map((q) => ({ unitTitle: u.title, question: q }))
  ),
];

/** Every PYQ in the payload, tagged with its unit (or course-wide). */
const collectPyqs = (
  prep: ExamPrep
): { unitTitle: string | null; year: string; question: string; solution?: string }[] => [
  ...(prep.previous_year_questions || []).map((p) => ({
    unitTitle: null as string | null,
    year: p.year,
    question: p.question,
    ...(p.solution ? { solution: p.solution } : {}),
  })),
  ...(prep.units || []).flatMap((u) =>
    (u.pyqs || []).map((p) => ({
      unitTitle: u.title,
      year: p.year,
      question: p.question,
      ...(p.solution ? { solution: p.solution } : {}),
    }))
  ),
];

const CheckRow: React.FC<{
  label: string;
  checked: boolean;
  onToggle: () => void;
  sublabel?: string | null;
}> = ({ label, checked, onToggle, sublabel }) => (
  <li>
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className={[
        'focus-ring flex w-full items-start gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-left transition-colors',
        checked
          ? 'border-[var(--color-success)]/40 bg-[var(--color-success)]/[0.06]'
          : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]',
      ].join(' ')}
    >
      {checked ? (
        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[var(--color-success)]" />
      ) : (
        <Circle size={18} className="mt-0.5 shrink-0 text-[var(--text-light)]" />
      )}
      <span className="min-w-0">
        <span className={['block text-sm leading-relaxed', checked ? 'text-[var(--text-muted)] line-through decoration-[var(--color-success)]/50' : 'text-[var(--text-body)]'].join(' ')}>
          {label}
        </span>
        {sublabel && <span className="mt-0.5 block text-xs text-[var(--text-light)]">{sublabel}</span>}
      </span>
    </button>
  </li>
);

const UnitCard: React.FC<{ unit: ExamPrepUnit; index: number }> = ({ unit, index }) => (
  <article className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
    <header className="flex items-baseline gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-sky-soft)] text-xs font-extrabold text-[var(--brand-sky-strong)]">
        {index + 1}
      </span>
      <h3 className="text-base font-extrabold tracking-tight text-[var(--ink)]">{unit.title}</h3>
    </header>
    {unit.summary && (
      <p className="mt-3 whitespace-pre-line text-sm leading-[1.75] text-[var(--text-body)]">{unit.summary}</p>
    )}
    {(unit.questions?.length || 0) > 0 && (
      <details className="mt-4 border-t border-[var(--border-subtle)] pt-3">
        <summary className="cursor-pointer list-none text-sm font-bold text-[var(--brand-sky-strong)] marker:content-none">
          {unit.questions!.length} important question{(unit.questions!.length === 1 ? '' : 's')}
        </summary>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-[var(--text-body)]">
          {unit.questions!.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ol>
      </details>
    )}
    {(unit.pyqs?.length || 0) > 0 && (
      <details className="mt-2 border-t border-[var(--border-subtle)] pt-3">
        <summary className="cursor-pointer list-none text-sm font-bold text-[var(--brand-sky-strong)] marker:content-none">
          {unit.pyqs!.length} previous-year question{(unit.pyqs!.length === 1 ? '' : 's')}
        </summary>
        <ul className="mt-2 space-y-2">
          {unit.pyqs!.map((p, i) => (
            <li key={i} className="rounded-[var(--radius-md)] bg-[var(--bg-surface-hover)] px-3 py-2">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-light)]">{p.year}</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--text-body)]">{p.question}</p>
              {p.solution && (
                <p className="mt-1.5 border-t border-[var(--border-subtle)] pt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">
                  <span className="font-semibold text-[var(--ink)]">Solution: </span>
                  {p.solution}
                </p>
              )}
            </li>
          ))}
        </ul>
      </details>
    )}
  </article>
);

export const ExamPrepPanel: React.FC<{
  courseSlug: string;
  prep: ExamPrep;
  /** Which tab to open on. The in-player revision toggle starts at `revision`. */
  initialTab?: TabKey;
  /** Compact: fewer headings, tighter spacing — used inside the Sheet from the player. */
  compact?: boolean;
}> = ({ courseSlug, prep, initialTab = 'units', compact = false }) => {
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [ticks, setTicks] = useState<string[]>([]);
  const [pyqFilter, setPyqFilter] = useState<string>('all');

  useEffect(() => {
    setTicks(readTicks(courseSlug));
  }, [courseSlug]);

  const toggleTick = useCallback(
    (question: string) => {
      setTicks((prev) => {
        const next = prev.includes(question) ? prev.filter((q) => q !== question) : [...prev, question];
        writeTicks(courseSlug, next);
        return next;
      });
    },
    [courseSlug]
  );

  const important = useMemo(() => collectImportant(prep), [prep]);
  const pyqs = useMemo(() => collectPyqs(prep), [prep]);
  const years = useMemo(() => {
    const set = new Set(pyqs.map((p) => p.year));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [pyqs]);
  const filteredPyqs = pyqFilter === 'all' ? pyqs : pyqs.filter((p) => p.year === pyqFilter);
  const tickedCount = important.filter((q) => ticks.includes(q.question)).length;
  const hasUnits = (prep.units?.length || 0) > 0;
  const hasImportant = important.length > 0;
  const hasPyqs = pyqs.length > 0;

  const print = () => window.print();

  return (
    <div className={compact ? '' : 'rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5'}>
      {/* Header — omitted in the compact (in-player) sheet, where the Sheet's
          own title already names the surface. */}
      {!compact && (
        <header className="mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-extrabold tracking-tight text-[var(--ink)]">Semester exam prep</h2>
            {prep.target && (
              <span className="rounded-full bg-[var(--brand-sky-soft)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--brand-sky-strong)]">
                {prep.target}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Units, important questions and previous-year papers — revisit before every exam.
          </p>
        </header>
      )}

      {/* Tab bar — horizontal scroll on phones, never a second row. */}
      <div className="rail-track -mx-1 mb-4 flex gap-1.5 px-1" role="tablist" aria-label="Exam prep views">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(key)}
              className={[
                'focus-ring inline-flex min-h-[40px] flex-none items-center gap-1.5 rounded-full px-3.5 text-[13px] font-bold transition-colors',
                active
                  ? 'bg-[var(--brand-sky)] text-white'
                  : 'bg-[var(--bg-surface-hover)] text-[var(--text-body)] hover:bg-[var(--border-subtle)]',
              ].join(' ')}
            >
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Units */}
      {tab === 'units' &&
        (hasUnits ? (
          <div className="space-y-4">
            {prep.units!.map((unit, i) => (
              <UnitCard key={i} unit={unit} index={i} />
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-[var(--text-muted)]">No units published for this course yet.</p>
        ))}

      {/* Important — checkable */}
      {tab === 'important' &&
        (hasImportant ? (
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)]">
              <span>
                {tickedCount} of {important.length} ticked
              </span>
              {tickedCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setTicks([]);
                    writeTicks(courseSlug, []);
                  }}
                  className="text-xs font-bold text-[var(--brand-sky)] hover:underline"
                >
                  Clear ticks
                </button>
              )}
            </div>
            <ul className="space-y-2">
              {important.map((q, i) => (
                <CheckRow
                  key={`${q.question}-${i}`}
                  label={q.question}
                  sublabel={q.unitTitle}
                  checked={ticks.includes(q.question)}
                  onToggle={() => toggleTick(q.question)}
                />
              ))}
            </ul>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-[var(--text-muted)]">No important questions published yet.</p>
        ))}

      {/* PYQs */}
      {tab === 'pyqs' &&
        (hasPyqs ? (
          <div>
            {years.length > 1 && (
              <div className="rail-track mb-3 flex gap-1.5" aria-label="Filter PYQs by year">
                {['all', ...years].map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setPyqFilter(y)}
                    aria-pressed={pyqFilter === y}
                    className={[
                      'focus-ring inline-flex min-h-[40px] flex-none items-center rounded-full border px-3 text-[13px] font-bold transition-colors',
                      pyqFilter === y
                        ? 'border-[var(--brand-sky)] bg-[var(--brand-sky)] text-white'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-body)]',
                    ].join(' ')}
                  >
                    {y === 'all' ? 'All years' : y}
                  </button>
                ))}
              </div>
            )}
            <ul className="space-y-3">
              {filteredPyqs.map((p, i) => (
                <li key={i} className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[var(--brand-sky-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--brand-sky-strong)]">
                      {p.year}
                    </span>
                    {p.unitTitle && <span className="text-xs text-[var(--text-light)]">{p.unitTitle}</span>}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-body)]">{p.question}</p>
                  {p.solution ? (
                    <details className="mt-2">
                      <summary className="cursor-pointer list-none text-sm font-bold text-[var(--brand-sky-strong)] marker:content-none">
                        Show solution
                      </summary>
                      <p className="mt-1.5 whitespace-pre-line border-t border-[var(--border-subtle)] pt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">
                        {p.solution}
                      </p>
                    </details>
                  ) : (
                    <p className="mt-2 text-xs text-[var(--text-light)]">No official solution published for this one.</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-[var(--text-muted)]">No previous-year questions published yet.</p>
        ))}

      {/* Revision — one-night view, printable */}
      {tab === 'revision' && (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--text-muted)]">
              Everything in one scroll — summaries, important questions and PYQs, unit by unit.
            </p>
            <button
              type="button"
              onClick={print}
              className="focus-ring inline-flex min-h-[40px] items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 text-sm font-bold text-[var(--text-body)] hover:border-[var(--brand-sky)] print:hidden"
            >
              <Printer size={15} />
              Print / PDF
            </button>
          </div>

          {(prep.target || prep.important_questions?.length || prep.previous_year_questions?.length) ? (
            <section className="mb-5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--brand-sky-soft)]/40 p-4">
              {prep.target && <p className="text-sm font-extrabold text-[var(--ink)]">{prep.target}</p>}
              {(prep.important_questions?.length || 0) > 0 && (
                <>
                  <p className="mt-3 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Course-wide important questions
                  </p>
                  <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-[var(--text-body)]">
                    {prep.important_questions!.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ol>
                </>
              )}
              {(prep.previous_year_questions?.length || 0) > 0 && (
                <>
                  <p className="mt-3 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Course-wide PYQs
                  </p>
                  <ul className="mt-1.5 space-y-1.5">
                    {prep.previous_year_questions!.map((p, i) => (
                      <li key={i} className="text-sm leading-relaxed text-[var(--text-body)]">
                        <span className="font-bold text-[var(--ink)]">{p.year}:</span> {p.question}
                        {p.solution && <span className="block text-[var(--text-muted)]">→ {p.solution}</span>}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          ) : null}

          {hasUnits ? (
            <div className="space-y-6">
              {prep.units!.map((unit, i) => (
                <section key={i} className="break-inside-avoid">
                  <h3 className="text-base font-extrabold tracking-tight text-[var(--ink)]">
                    Unit {i + 1} — {unit.title}
                  </h3>
                  {unit.summary && (
                    <p className="mt-2 whitespace-pre-line text-sm leading-[1.75] text-[var(--text-body)]">
                      {unit.summary}
                    </p>
                  )}
                  {(unit.questions?.length || 0) > 0 && (
                    <>
                      <p className="mt-3 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        Important questions
                      </p>
                      <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-[var(--text-body)]">
                        {unit.questions!.map((q, qi) => (
                          <li key={qi}>{q}</li>
                        ))}
                      </ol>
                    </>
                  )}
                  {(unit.pyqs?.length || 0) > 0 && (
                    <>
                      <p className="mt-3 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        Previous-year questions
                      </p>
                      <ul className="mt-1 space-y-1">
                        {unit.pyqs!.map((p, pi) => (
                          <li key={pi} className="text-sm leading-relaxed text-[var(--text-body)]">
                            <span className="font-bold text-[var(--ink)]">{p.year}:</span> {p.question}
                            {p.solution && <span className="block text-[var(--text-muted)]">→ {p.solution}</span>}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </section>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-[var(--text-muted)]">No units published yet.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ExamPrepPanel;
