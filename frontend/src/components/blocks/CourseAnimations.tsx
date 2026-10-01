/**
 * CourseAnimations — the interactive teaching visualisations used by `animation`
 * blocks.
 *
 * WHY A DISPATCHER
 * ----------------
 * The `animation` block type already existed as a step-trace widget. Rather than
 * widening the block vocabulary (which is a schema change touching the union, the
 * runtime list, the admin dropdown and the renderer together), a single block type
 * now carries a `kind`. `kind: 'step'` is the original behaviour, byte for byte,
 * so every existing payload is unaffected. New kinds are additive.
 *
 * WHY NOT A LIBRARY
 * -----------------
 * framer-motion *is* a dependency now (Sheet, Header, RouteTransition use it),
 * so this is a deliberate choice rather than an accident of what is installed.
 * These are teaching visualisations: each frame is a discrete state the learner
 * can stop on and read, and the whole set is CSS keyframes plus React state.
 * That keeps them inside the existing reduced-motion blanket rule in
 * globals.css rather than needing per-component opt-outs, and it keeps a widget
 * that has to stay legible under `prefers-reduced-motion` from depending on
 * JS-driven animation to hold still at all.
 *
 * DESIGN RULE FOR ALL OF THESE
 * ----------------------------
 * An animation is only here if it carries information the prose cannot. Nothing
 * loops for decoration, nothing moves to look lively, and every control is a real
 * button with a label. The learner can always stop and read a static frame.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react';

/* ============================================================================
   Shared plumbing
   ============================================================================ */

type Tone =
  | 'int' | 'ptr' | 'char' | 'float' | 'pad' | 'code' | 'data' | 'heap'
  | 'stack' | 'auto' | 'static' | 'free' | 'null' | 'warn' | 'ok' | 'bad'
  | 'text' | 'bss' | 'io';

/**
 * Memory-cell colour. Every tone has to survive being read as a small coloured
 * box with a monospace glyph on it, so each is a filled tint with a darker text
 * colour rather than a low-opacity wash.
 */
const TONE: Record<Tone, string> = {
  int:    'bg-[#E8F0FE] text-[#1A3D7C] border-[#B9CCF2]',
  ptr:    'bg-[#FDF0D8] text-[#7A4E05] border-[#F0D3A0]',
  char:   'bg-[#E3F6EE] text-[#0A5C42] border-[#B0E2D0]',
  float:  'bg-[#EFE8FB] text-[#4B2A80] border-[#D2C2F0]',
  pad:    'bg-[#F0EFEC] text-[#8A8579] border-[#DEDBD3]',
  code:   'bg-[#E4F2F5] text-[#0D5563] border-[#B4DCE5]',
  data:   'bg-[#E9EEF3] text-[#2B3A4A] border-[#C6D2DE]',
  heap:   'bg-[#FDEAE0] text-[#8A4310] border-[#F5C9A9]',
  stack:  'bg-[#E3F6EE] text-[#0A5C42] border-[#B0E2D0]',
  auto:   'bg-[#E8F0FE] text-[#1A3D7C] border-[#B9CCF2]',
  static: 'bg-[#E9EEF3] text-[#2B3A4A] border-[#C6D2DE]',
  free:   'bg-white text-[#B4B0A6] border-dashed border-[#DEDBD3]',
  null:   'bg-[#F0EFEC] text-[#8A8579] border-[#DEDBD3]',
  warn:   'bg-[#FDF0D8] text-[#7A4E05] border-[#F0D3A0]',
  ok:     'bg-[#E3F6EE] text-[#0A5C42] border-[#B0E2D0]',
  bad:    'bg-[#FCE4E1] text-[#8C1D18] border-[#F3BDB8]',
  text:   'bg-[#E4F2F5] text-[#0D5563] border-[#B4DCE5]',
  bss:    'bg-[#EFE8FB] text-[#4B2A80] border-[#D2C2F0]',
  io:     'bg-[#E8F0FE] text-[#1A3D7C] border-[#B9CCF2]',
};

const tone = (t?: string): string => TONE[(t as Tone) ?? 'int'] ?? TONE.int;

/** The autoplay ticker. One interval per animation instance, cleared on unmount. */
function useAutoplay(
  step: number,
  stepCount: number,
  playing: boolean,
  intervalMs: number,
  onAdvance: () => void
) {
  const saved = useRef(onAdvance);
  saved.current = onAdvance;

  useEffect(() => {
    if (!playing) return;
    if (stepCount <= 1) return;
    if (step >= stepCount - 1) return;
    const id = window.setInterval(() => saved.current(), intervalMs);
    return () => window.clearInterval(id);
  }, [playing, step, stepCount, intervalMs]);
}

/**
 * Chrome shared by every animation: a header with the title, an optional
 * "replayable" badge so the learner knows there are controls, and a live step
 * counter.
 */
function Frame({
  title,
  badge,
  step,
  stepCount,
  children,
  icon,
}: {
  title?: string;
  badge?: string;
  step: number;
  stepCount: number;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <figure className="my-6 rounded-2xl border border-[--border-subtle] bg-white overflow-hidden shadow-sm">
      {(title || badge) && (
        <div className="flex items-center gap-2.5 bg-[#F4F4F2] px-4 py-2.5 border-b border-[--border-subtle] flex-wrap">
          {icon}
          {title && (
            <figcaption className="text-[12.5px] font-bold text-[--text-heading]">{title}</figcaption>
          )}
          {badge && (
            <span className="text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded bg-white border border-[--border-subtle] text-[--text-muted]">
              {badge}
            </span>
          )}
          {stepCount > 1 && (
            <span className="ml-auto text-[11px] font-mono text-[--text-muted] tabular-nums">
              {step + 1} / {stepCount}
            </span>
          )}
        </div>
      )}
      {children}
    </figure>
  );
}

/**
 * Transport controls. Deliberately three states, not two: Reset exists because
 * the single most common thing a learner wants after watching a surprising frame
 * ("no, show me that again") is to go back to the start.
 */
function Transport({
  step,
  stepCount,
  playing,
  onPrev,
  onNext,
  onPlayPause,
  onReset,
  onJump,
  compact,
}: {
  step: number;
  stepCount: number;
  playing: boolean;
  onPrev: () => void;
  onNext: () => void;
  onPlayPause: () => void;
  onReset: () => void;
  onJump: (i: number) => void;
  compact?: boolean;
}) {
  if (stepCount <= 1) return null;
  const atEnd = step >= stepCount - 1;
  const btn =
    'inline-flex items-center justify-center rounded-lg border border-[--border-subtle] bg-white text-[--text-body] hover:bg-[#F3F2EE] disabled:opacity-35 disabled:cursor-not-allowed transition-colors focus-ring';

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-t border-[--border-subtle] bg-[#FCFBF8]">
      <button
        type="button"
        onClick={onPrev}
        disabled={step === 0}
        aria-label="Previous step"
        className={`${btn} w-8 h-8`}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onPlayPause}
        disabled={atEnd}
        aria-label={playing ? 'Pause animation' : 'Play animation'}
        className={`${btn} w-9 h-9 ${atEnd ? '' : 'bg-[--brand-primary] text-white border-[--brand-primary] hover:bg-[--brand-sky-strong]'}`}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={atEnd}
        aria-label="Next step"
        className={`${btn} w-8 h-8`}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onReset}
        aria-label="Restart from the beginning"
        className={`${btn} w-8 h-8`}
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>

      {/* Progress rail. Clickable, because dragging a scrubber is overkill for a
          handful of steps but jumping straight to the exact one you want is. */}
      <div className="flex items-center gap-1 ml-1" role="group" aria-label="Jump to step">
        {Array.from({ length: stepCount }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onJump(i)}
            aria-label={`Go to step ${i + 1} of ${stepCount}`}
            aria-current={i === step}
            className={`h-1.5 rounded-full transition-all focus-ring ${
              compact ? 'w-4' : 'w-5'
            } ${i === step ? 'bg-[--brand-primary] w-7' : i < step ? 'bg-[#B9CCF2]' : 'bg-[--border-subtle] hover:bg-[#D6D2C8]'}`}
          />
        ))}
      </div>
    </div>
  );
}

/** Caption under the visual. This is where the actual teaching sentence lives. */
function Caption({ text, note }: { text?: string; note?: string }) {
  if (!text && !note) return null;
  return (
    <figcaption className="px-4 py-3 border-t border-[--border-subtle] bg-white">
      {text && (
        <p className="text-[13.5px] leading-relaxed text-[--text-body]">
          <span className="font-mono text-[11px] text-[--brand-primary] mr-1.5">
            {String(0).padStart(2, '0')}
          </span>
          {text}
        </p>
      )}
      {note && (
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-[--text-muted] border-l-2 border-[--brand-accent] pl-2.5">
          {note}
        </p>
      )}
    </figcaption>
  );
}

/* ============================================================================
   1. MEMORY LAB
   The flagship. A slice of linear memory drawn as addressable cells, with
   variables underneath that hold values and, optionally, the index of the cell
   they point at.

   Why addresses do the linking instead of drawn arrows: an SVG arrow has to be
   measured against the DOM and recomputed on every resize, and when it is even
   slightly off the lesson teaches the wrong thing. A pointer variable prints the
   same hex address as the cell it owns and that cell rings — the link is
   unambiguous, survives zoom, and needs no layout maths.
   ============================================================================ */

type MemCell = { bytes: string[]; note?: string; tone?: string; label?: string };
type MemVar = { name: string; type?: string; value: string; pointsTo?: number; tone?: string };
type MemStep = {
  caption?: string;
  note?: string;
  cells?: Record<string, Partial<MemCell>>;
  vars?: MemVar[];
  highlight?: number[];
};

function hex(base: number, i: number, width: number) {
  return '0x' + (base + i * width).toString(16).toUpperCase().padStart(4, '0');
}

export function MemoryLab({ payload }: { payload: any }) {
  const steps: MemStep[] = Array.isArray(payload.steps) ? payload.steps : [];
  const base: number = Number(payload.base) || 0x7ffd1000;
  const width: number = Number(payload.cell_bytes) || 1;
  const initial: MemCell[] = Array.isArray(payload.cells) ? payload.cells : [];

  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const goNext = useCallback(() => setStep((s) => Math.min(s + 1, steps.length - 1)), [steps.length]);
  useAutoplay(step, steps.length, playing, 1600, goNext);

  // Fold from the start so that stepping backwards is exact, not approximate:
  // no accumulated delta to unwind.
  const cells = useMemo<MemCell[]>(() => {
    const acc: MemCell[] = initial.map((c) => ({ ...c, bytes: [...(c.bytes || [])] }));
    for (let s = 0; s <= step && s < steps.length; s++) {
      const patch = steps[s]?.cells;
      if (!patch) continue;
      for (const [k, v] of Object.entries(patch)) {
        const i = Number(k);
        if (!Number.isFinite(i) || i < 0 || i >= acc.length) continue;
        acc[i] = {
          ...acc[i],
          ...v,
          bytes: v.bytes ? [...v.bytes] : acc[i].bytes,
        };
      }
    }
    return acc;
  }, [initial, steps, step]);

  const cur: MemStep = steps[step] || {};
  const vars: MemVar[] = cur.vars ?? [];
  const pointed = new Set<number>();
  for (const v of vars) {
    if (typeof v.pointsTo === 'number') pointed.add(v.pointsTo);
  }
  const hot = new Set<number>([...(cur.highlight || []), ...pointed]);

  return (
    <Frame
      title={payload.title}
      badge={payload.badge || 'interactive'}
      step={step}
      stepCount={steps.length}
    >
      {/* Address ruler + cells */}
      <div className="px-4 py-4 bg-[#FCFBF8]">
        <div className="overflow-x-auto pb-1">
          <div className="inline-flex flex-col min-w-full" style={{ minWidth: cells.length * 46 }}>
            <div className="flex mb-1">
              {cells.map((c, i) => (
                <div
                  key={i}
                  className="flex-1 min-w-[44px] text-center font-mono text-[9.5px] text-[--text-light] leading-none"
                >
                  {hex(base, i, width)}
                </div>
              ))}
            </div>
            <div className="flex gap-[2px]">
              {cells.map((c, i) => {
                const isTarget = pointed.has(i);
                const isHot = hot.has(i);
                return (
                  <div
                    key={i}
                    title={c.note}
                    className={`flex-1 min-w-[44px] rounded-md border px-0.5 py-1.5 text-center transition-all duration-300 ${tone(
                      c.tone
                    )} ${isTarget ? 'anim-target-ring' : ''} ${isHot && !isTarget ? 'ring-2 ring-[--brand-accent]' : ''}`}
                  >
                    {c.label && (
                      <div className="text-[9px] font-bold uppercase tracking-wide opacity-70 leading-none mb-0.5">
                        {c.label}
                      </div>
                    )}
                    <div className="font-mono text-[11.5px] font-bold leading-tight">
                      {(c.bytes || []).join(' ')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <p className="mt-2 font-mono text-[9.5px] text-[--text-light]">
          each cell = {width} {width === 1 ? 'byte' : 'bytes'} · addresses step by {width}
        </p>
      </div>

      {/* Variables */}
      {vars.length > 0 && (
        <div className="px-4 pb-4 bg-[#FCFBF8]">
          <p className="font-mono text-[10px] uppercase tracking-wide text-[--text-muted] mb-1.5">
            variables
          </p>
          <div className="flex flex-wrap gap-2">
            {vars.map((v) => (
              <div
                key={v.name}
                className={`rounded-lg border px-2.5 py-1.5 min-w-[92px] ${
                  v.pointsTo !== undefined
                    ? 'bg-white ring-1 ring-[--brand-accent]'
                    : tone(v.tone)
                }`}
              >
                <div className="font-mono text-[11.5px] font-bold text-[--text-heading] leading-tight">
                  {v.type ? <span className="opacity-55 mr-1">{v.type}</span> : null}
                  {v.name}
                </div>
                <div className="font-mono text-[11px] text-[--text-body] leading-tight">
                  {v.value}
                </div>
                {v.pointsTo !== undefined && (
                  <div className="font-mono text-[10px] text-[--color-warning] leading-tight">
                    → {hex(base, v.pointsTo, width)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Caption text={cur.caption} note={cur.note} />
      <Transport
        step={step}
        stepCount={steps.length}
        playing={playing}
        onPrev={() => { setPlaying(false); setStep((s) => Math.max(0, s - 1)); }}
        onNext={() => { setPlaying(false); setStep((s) => Math.min(s + 1, steps.length - 1)); }}
        onPlayPause={() => setPlaying((p) => !p)}
        onReset={() => { setPlaying(false); setStep(0); }}
        onJump={(i) => { setPlaying(false); setStep(i); }}
      />
    </Frame>
  );
}

/* ============================================================================
   2. PASS BY VALUE vs PASS BY POINTER
   Two independent memories stepping in lockstep. The whole point of the lesson
   is that the left one is a throwaway copy and the right one is the caller's,
   so the two panes must be visibly the same variable and visibly different
   objects — hence separate memory maps driven by one shared step index.
   ============================================================================ */

function PassingLab({ payload }: { payload: any }) {
  const steps = Array.isArray(payload.steps) ? payload.steps : [];
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const goNext = useCallback(() => setStep((s) => Math.min(s + 1, steps.length - 1)), [steps.length]);
  useAutoplay(step, steps.length, playing, 1800, goNext);

  const cur = steps[step] || {};
  const panes: { title: string; sub?: string; cells: { label?: string; value: string; tone?: string }[]; call?: string }[] =
    Array.isArray(cur.panes) ? cur.panes : [];

  return (
    <Frame
      title={payload.title}
      badge={payload.badge || 'side by side'}
      step={step}
      stepCount={steps.length}
    >
      <div className="grid gap-px bg-[--border-subtle] sm:grid-cols-2">
        {panes.map((p, i) => (
          <div key={i} className="bg-white p-4">
            <p className="text-[12.5px] font-bold text-[--text-heading]">{p.title}</p>
            {p.sub && <p className="text-[11.5px] text-[--text-muted] mt-0.5 mb-2.5 font-mono">{p.sub}</p>}
            {!p.sub && <div className="mb-2.5" />}
            {p.call && (
              <pre className="mb-2.5 rounded-md bg-[#1E1E1E] text-[#E6EDF3] px-2.5 py-1.5 text-[11px] font-mono overflow-x-auto">
                {p.call}
              </pre>
            )}
            <div className="space-y-1.5">
              {(p.cells || []).map((c, j) => (
                <div
                  key={j}
                  className={`rounded-md border px-2.5 py-1.5 anim-pop-in ${tone(c.tone)}`}
                >
                  <span className="font-mono text-[11.5px] font-bold">{c.label}</span>
                  <span className="font-mono text-[11.5px] float-right">{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Caption text={cur.caption} note={cur.note} />
      <Transport
        step={step}
        stepCount={steps.length}
        playing={playing}
        onPrev={() => { setPlaying(false); setStep((s) => Math.max(0, s - 1)); }}
        onNext={() => { setPlaying(false); setStep((s) => Math.min(s + 1, steps.length - 1)); }}
        onPlayPause={() => setPlaying((p) => !p)}
        onReset={() => { setPlaying(false); setStep(0); }}
        onJump={(i) => { setPlaying(false); setStep(i); }}
      />
    </Frame>
  );
}

/* ============================================================================
   3. CALL STACK
   Frames push on entry and pop on return. The animation is the entire
   explanation of recursion, which is why it is a frame pushing down the stack
   rather than an abstract "call → return" arrow.
   ============================================================================ */

type FrameSpec = {
  fn: string;
  args?: string;
  locals?: string[];
  line?: string;
  phase?: 'running' | 'returning';
  note?: string;
};

export function CallStack({ payload }: { payload: any }) {
  const steps: { caption?: string; note?: string; frames: FrameSpec[] }[] = Array.isArray(payload.steps)
    ? payload.steps
    : [];
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const goNext = useCallback(() => setStep((s) => Math.min(s + 1, steps.length - 1)), [steps.length]);
  useAutoplay(step, steps.length, playing, 2000, goNext);

  const cur = steps[step] || { frames: [] };
  const frames: FrameSpec[] = Array.isArray(cur.frames) ? cur.frames : [];

  return (
    <Frame
      title={payload.title}
      badge={payload.badge || 'call stack'}
      step={step}
      stepCount={steps.length}
    >
      <div className="px-4 py-4 bg-[#FCFBF8]">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-[9.5px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-white border border-[--border-subtle] text-[--text-muted]">
            high address
          </span>
          <div className="flex-1 h-px bg-[--border-subtle]" />
        </div>

        {/* main sits at the bottom, so a deeper call visibly grows upward */}
        <div className="flex flex-col-reverse gap-1.5 min-h-[120px]">
          {frames.map((f, i) => {
            const returning = f.phase === 'returning';
            return (
              <div
                key={`${step}-${i}-${f.fn}`}
                className={`rounded-lg border px-3 py-2 anim-frame-push ${
                  returning
                    ? 'anim-frame-pop bg-[#FDF0D8] border-[#F0D3A0]'
                    : i === frames.length - 1
                    ? 'bg-[#E8F0FE] border-[#B9CCF2]'
                    : 'bg-white border-[--border-subtle]'
                }`}
              >
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-mono text-[12px] font-bold text-[--text-heading]">
                    {returning ? '↩ ' : ''}
                    {f.fn}
                  </span>
                  {f.args && <span className="font-mono text-[11px] text-[--text-muted]">({f.args})</span>}
                  {f.line && (
                    <span className="font-mono text-[10px] text-[--brand-primary] ml-auto">{f.line}</span>
                  )}
                </div>
                {(f.locals?.length || f.note) && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {(f.locals || []).map((l, k) => (
                      <span
                        key={k}
                        className="font-mono text-[10.5px] rounded bg-[#F3F2EE] border border-[--border-subtle] px-1.5 py-0.5 text-[--text-body]"
                      >
                        {l}
                      </span>
                    ))}
                    {f.note && (
                      <span className="font-mono text-[10.5px] text-[--color-warning]">{f.note}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {frames.length === 0 && (
            <div className="rounded-lg border border-dashed border-[--border-subtle] py-6 text-center text-[12px] text-[--text-muted]">
              stack is empty
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 h-px bg-[--border-subtle]" />
          <span className="font-mono text-[9.5px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-white border border-[--border-subtle] text-[--text-muted]">
            low address · stack pointer
          </span>
        </div>
      </div>
      <Caption text={cur.caption} note={cur.note} />
      <Transport
        step={step}
        stepCount={steps.length}
        playing={playing}
        onPrev={() => { setPlaying(false); setStep((s) => Math.max(0, s - 1)); }}
        onNext={() => { setPlaying(false); setStep((s) => Math.min(s + 1, steps.length - 1)); }}
        onPlayPause={() => setPlaying((p) => !p)}
        onReset={() => { setPlaying(false); setStep(0); }}
        onJump={(i) => { setPlaying(false); setStep(i); }}
      />
    </Frame>
  );
}

/* ============================================================================
   4. TRACER
   A real single-step C interpreter for hand-written scenes: the executing source
   line, the variable table, and the terminal output built up so far.

   It is a scripted replayer, not a compiler. Every step is authored in the
   payload, which is the honest way to do it: an in-browser C interpreter is a
   research project and a half-built one would teach wrong semantics. The value
   is that the *narrative* of an execution is visible, which prose alone cannot
   convey — especially for pointer loops.
   ============================================================================ */

export function Tracer({ payload }: { payload: any }) {
  const steps: {
    caption?: string; note?: string; line?: number; vars?: { name: string; value: string; tone?: string }[];
    output?: string;
  }[] = Array.isArray(payload.steps) ? payload.steps : [];
  const code: string = String(payload.code || '');

  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const goNext = useCallback(() => setStep((s) => Math.min(s + 1, steps.length - 1)), [steps.length]);
  useAutoplay(step, steps.length, playing, 1900, goNext);

  const lines = useMemo(() => code.replace(/\t/g, '  ').split('\n'), [code]);
  const cur = steps[step] || {};
  const vars = Array.isArray(cur.vars) ? cur.vars : [];

  // Output is cumulative, exactly like a terminal.
  const output = useMemo(() => {
    const acc: string[] = [];
    for (let s = 0; s <= step && s < steps.length; s++) {
      if (typeof steps[s]?.output === 'string') acc.push(steps[s].output as string);
    }
    return acc;
  }, [steps, step]);

  return (
    <Frame
      title={payload.title}
      badge={payload.badge || 'step through'}
      step={step}
      stepCount={steps.length}
    >
      <div className="grid lg:grid-cols-[1.35fr_1fr] gap-px bg-[--border-subtle]">
        <div className="bg-[#1E1E1E] overflow-x-auto">
          <pre className="text-[12px] leading-[1.65] font-mono py-3 min-w-full">
            {lines.map((l, i) => {
              const n = i + 1;
              const active = n === cur.line;
              return (
                <div
                  key={n}
                  className={`flex px-3 ${active ? 'bg-[#2D2D2D] anim-line-breathe' : ''}`}
                >
                  <span className="w-8 shrink-0 text-right pr-3 text-[#5A6270] select-none">{n}</span>
                  <span className={`whitespace-pre ${active ? 'text-[#FFD479]' : 'text-[#E6EDF3]'}`}>
                    {active && <span className="text-[#E8A33D] mr-1.5">▸</span>}
                    {l || ' '}
                  </span>
                </div>
              );
            })}
          </pre>
        </div>

        <div className="bg-white flex flex-col">
          <div className="p-3 border-b border-[--border-subtle]">
            <p className="font-mono text-[9.5px] uppercase tracking-wide text-[--text-muted] mb-1.5">
              variables
            </p>
            {vars.length === 0 ? (
              <p className="font-mono text-[11.5px] text-[--text-light]">—</p>
            ) : (
              <div className="space-y-1">
                {vars.map((v) => (
                  <div
                    key={v.name}
                    className={`rounded border px-2 py-1 anim-pop-in ${tone(v.tone)}`}
                  >
                    <span className="font-mono text-[11.5px] font-bold">{v.name}</span>
                    <span className="font-mono text-[11.5px] float-right">{v.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="p-3 flex-1 min-h-[92px]">
            <p className="font-mono text-[9.5px] uppercase tracking-wide text-[--text-muted] mb-1.5">
              terminal
            </p>
            <div className="font-mono text-[11.5px] leading-relaxed text-[#0F766E]">
              {output.length === 0 ? (
                <span className="text-[--text-light]">—</span>
              ) : (
                output.map((o, i) => (
                  <div key={i} className="anim-line-in whitespace-pre-wrap">
                    {o || ' '}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      <Caption text={cur.caption} note={cur.note} />
      <Transport
        step={step}
        stepCount={steps.length}
        playing={playing}
        onPrev={() => { setPlaying(false); setStep((s) => Math.max(0, s - 1)); }}
        onNext={() => { setPlaying(false); setStep((s) => Math.min(s + 1, steps.length - 1)); }}
        onPlayPause={() => setPlaying((p) => !p)}
        onReset={() => { setPlaying(false); setStep(0); }}
        onJump={(i) => { setPlaying(false); setStep(i); }}
      />
    </Frame>
  );
}

/* ============================================================================
   5. TYPES LAB
   Two halves:
     - a size/range table for the fundamental types, which is the thing people
       guess wrong and lose real bugs over;
     - an interactive wraparound explorer. Nudging an unsigned byte past 255
       shows the bits flip to 0, which is the single most surprising rule in C
       and the one people carry into signed overflow. It is interactive rather
       than scripted because the "aha" is doing it yourself.
   ============================================================================ */

/**
 * Render a value as a fixed-width binary string.
 *
 * BigInt is used rather than `n.toString(2)` because the numbers involved are
 * 32- and 64-bit: a `long long` above 2^53 is not representable as a JS number,
 * and showing the wrong bits in a lesson about bit layout is worse than showing
 * nothing. `BigInt()` is called as a function rather than using `0n` literals
 * because the project targets ES2017, where literal syntax is a compile error
 * even though the type itself is available.
 */
const toBits = (v: number | bigint, bits: number) => {
  const width = BigInt(bits);
  const mask = (BigInt(1) << width) - BigInt(1);
  return (BigInt(v) & mask).toString(2).padStart(bits, '0');
};

export function TypesLab({ payload }: { payload: any }) {
  const types: { name: string; bytes: string | number; signed: string; unsigned: string; note?: string }[] =
    Array.isArray(payload.types) ? payload.types : [];
  const demos: { title: string; width: number; signed: boolean; start: number }[] = Array.isArray(payload.demos)
    ? payload.demos
    : [{ title: 'unsigned char', width: 8, signed: false, start: 254 }];
  const [active, setActive] = useState(0);
  const demo = demos[active] ? demos[active] : demos[0];

  const [raw, setRaw] = useState<string>(() => String(demo ? demo.start : 0));
  const [spin, setSpin] = useState(0);

  useEffect(() => { setRaw(String(demo ? demo.start : 0)); }, [active, demo]);

  if (!demo) {
    return (
      <Frame title={payload.title} step={0} stepCount={0}>
        <p className="px-4 py-4 text-[13px] text-[--text-muted]">No type data supplied.</p>
      </Frame>
    );
  }

  const W = demo.width;
  // The bounds are computed with BigInt. `1 << 32` is 1 in JavaScript, because
  // the shift count is taken modulo 32, so the 32-bit demo would otherwise claim
  // a range of 0..0 — wrong in a lesson whose whole point is overflow behaviour.
  // Values are also held as strings in state so that a 64-bit `long long` above
  // 2^53 is never rounded through a double.
  const mod = BigInt(1) << BigInt(W);
  const minB = demo.signed ? -(mod >> BigInt(1)) : BigInt(0);
  const maxB = demo.signed ? (mod >> BigInt(1)) - BigInt(1) : mod - BigInt(1);

  const parsed = BigInt(raw || '0');
  const clamped = parsed < minB ? minB : parsed > maxB ? maxB : parsed;

  // Presenting a signed value as bits needs the two's complement reading, which
  // is exactly the conversion the lab is meant to make visible.
  const shown = clamped < BigInt(0) ? clamped + mod : clamped;
  const bits = toBits(shown, W);
  const groups = bits.match(new RegExp(`.{1,${Math.min(4, W)}}`, 'g')) || [bits];

  const bump = (delta: bigint) => {
    setSpin((s) => s + 1);
    setRaw((v) => {
      let n = BigInt(v || '0') + delta;
      if (n > maxB) n = minB;
      if (n < minB) n = maxB;
      return n.toString();
    });
  };

  // The declared range, formatted the way a person would write it.
  const fmt = (n: bigint) => {
    const neg = n < BigInt(0);
    const digits = (neg ? -n : n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '−' : '') + digits;
  };

  return (
    <Frame title={payload.title} badge={payload.badge || 'inspect'} step={0} stepCount={0}>
      {types.length > 0 && (
        <div className="overflow-x-auto border-b border-[--border-subtle]">
          <table className="w-full text-[12.5px] min-w-[520px]">
            <thead>
              <tr className="bg-[#F4F4F2] text-left text-[11px] uppercase tracking-wide text-[--text-muted]">
                <th className="px-4 py-2 font-semibold">Type</th>
                <th className="px-3 py-2 font-semibold">Typical size</th>
                <th className="px-3 py-2 font-semibold">Signed range</th>
                <th className="px-3 py-2 font-semibold">Unsigned range</th>
                <th className="px-3 py-2 font-semibold">Why you care</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--border-subtle]">
              {types.map((t) => (
                <tr key={t.name}>
                  <td className="px-4 py-2 font-mono font-bold text-[--text-heading] whitespace-nowrap">{t.name}</td>
                  <td className="px-3 py-2 font-mono">{t.bytes}</td>
                  <td className="px-3 py-2 font-mono">{t.signed}</td>
                  <td className="px-3 py-2 font-mono">{t.unsigned}</td>
                  <td className="px-3 py-2 text-[--text-muted]">{t.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Wraparound explorer */}
      <div className="px-4 py-4">
        {demos.length > 1 && (
          <div className="flex flex-wrap gap-1.5 mb-3" role="group" aria-label="Choose a type to inspect">
            {demos.map((d, i) => (
              <button
                key={d.title}
                type="button"
                onClick={() => setActive(i)}
                aria-pressed={i === active}
                className={`px-2.5 py-1 rounded-lg text-[11.5px] font-mono border transition-colors ${
                  i === active
                    ? 'bg-[--brand-primary] text-white border-[--brand-primary]'
                    : 'bg-white text-[--text-body] border-[--border-subtle] hover:bg-[#F3F2EE]'
                }`}
              >
                {d.title}
              </button>
            ))}
          </div>
        )}

        <p className="font-mono text-[11px] text-[--text-muted] mb-2">
          nudge the value past its limit and watch the bits
        </p>

        <div key={spin} className="flex items-end gap-1 mb-3">
          {groups.map((g, i) => (
            <span
              key={i}
              className="font-mono text-[19px] font-bold tracking-tight text-[--text-heading] anim-pop-in"
              style={{ animationDelay: `${i * 28}ms` }}
            >
              {g}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[10.5px] text-[--text-muted]">decimal</span>
            <span key={`d${clamped}`} className="font-mono text-[15px] font-bold text-[--brand-primary] anim-pop-in">
              {fmt(clamped)}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[10.5px] text-[--text-muted]">hex</span>
            <span className="font-mono text-[13px] text-[--text-body]">
              0x{shown.toString(16).toUpperCase().padStart(Math.ceil(W / 4), '0')}
            </span>
          </div>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => bump(BigInt(-1))}
            aria-label="Decrease by one"
            className="px-2.5 h-8 rounded-lg border border-[--border-subtle] bg-white text-[--text-body] hover:bg-[#F3F2EE] transition-colors"
          >
            −1
          </button>
          <button
            type="button"
            onClick={() => bump(BigInt(1))}
            aria-label="Increase by one"
            className="px-2.5 h-8 rounded-lg border border-[--border-subtle] bg-white text-[--text-body] hover:bg-[#F3F2EE] transition-colors"
          >
            +1
          </button>
          <button
            type="button"
            onClick={() => bump(BigInt(5))}
            aria-label="Increase by five"
            className="px-2.5 h-8 rounded-lg border border-[--border-subtle] bg-white text-[--text-body] hover:bg-[#F3F2EE] transition-colors"
          >
            +5
          </button>
          <button
            type="button"
            onClick={() => { setSpin((s) => s + 1); setRaw(maxB.toString()); }}
            className="px-2.5 h-8 rounded-lg border border-[--brand-accent] bg-[#FDF0D8] text-[#7A4E05] hover:bg-[#F8E2B8] transition-colors font-semibold"
          >
            overflow →
          </button>
        </div>

        <p className="mt-2.5 text-[12.5px] text-[--text-muted] leading-relaxed">
          Range for <span className="font-mono text-[--text-body]">{demo.title}</span>:{' '}
          <span className="font-mono text-[--text-body]">{fmt(minB)}</span> to{' '}
          <span className="font-mono text-[--text-body]">{fmt(maxB)}</span>. The wrap is not a bug in C — it is
          the defined behaviour for unsigned arithmetic.
        </p>

      </div>
    </Frame>
  );
}

/* ============================================================================
   6. BIT VIEW
   A 32-bit word split into authored fields, MSB first. Doubles as the struct
   padding explainer (pad fields are real, visible bytes) and the bitfield
   explainer (narrow fields, explicit widths).
   ============================================================================ */

type BitField = { label: string; bits: number; tone?: string; value?: number; note?: string };

export function BitView({ payload }: { payload: any }) {
  const totalBits: number = Number(payload.total_bits) || 32;
  const steps: { caption?: string; note?: string; fields: BitField[] }[] = Array.isArray(payload.steps)
    ? payload.steps
    : [];
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const goNext = useCallback(() => setStep((s) => Math.min(s + 1, steps.length - 1)), [steps.length]);
  useAutoplay(step, steps.length, playing, 1700, goNext);

  const cur = steps[step] || { fields: [] };
  const fields: BitField[] = Array.isArray(cur.fields) ? cur.fields : [];
  const used = fields.reduce((n, f) => n + f.bits, 0);

  return (
    <Frame title={payload.title} badge={payload.badge || 'bit layout'} step={step} stepCount={steps.length}>
      <div className="px-4 py-4 bg-[#FCFBF8] overflow-x-auto">
        {totalBits % 8 === 0 && (
          <div className="flex mb-1 min-w-[440px]">
            {Array.from({ length: totalBits / 8 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 text-center font-mono text-[9.5px] text-[--text-light]"
                style={{ minWidth: 30 }}
              >
                b{7 - i}…b{8 - i}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-1 min-w-[440px]">
          {fields.map((f, i) => (
            <div
              key={i}
              style={{ flexGrow: f.bits, minWidth: f.bits * 11 }}
              className={`rounded-md border px-1 py-1.5 text-center anim-pop-in ${tone(f.tone)}`}
            >
              <div className="font-mono text-[9px] opacity-70 leading-none">
                {typeof f.value === 'number' ? toBits(f.value, f.bits) : '·'.repeat(f.bits)}
              </div>
              <div className="font-mono text-[9.5px] font-bold leading-tight mt-0.5 truncate">{f.label}</div>
            </div>
          ))}
          {used < totalBits &&
            Array.from({ length: totalBits - used }).map((_, i) => (
              <div
                key={`gap${i}`}
                className="rounded-md border border-dashed border-[#DEDBD3] bg-white px-1 py-1.5 text-center"
                style={{ flexGrow: 1, minWidth: 11 }}
              >
                <div className="font-mono text-[9px] text-[#B4B0A6] leading-none">·</div>
              </div>
            ))}
        </div>

        {fields.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5 min-w-[440px]">
            {fields.map((f, i) => (
              <div key={i} className={`rounded border px-2 py-1 ${tone(f.tone)}`}>
                <div className="font-mono text-[10.5px] font-bold">{f.label}</div>
                {typeof f.value === 'number' && (
                  <div className="font-mono text-[10px] opacity-80">
                    {f.value} · {f.bits} {f.bits === 1 ? 'bit' : 'bits'}
                  </div>
                )}
                {f.note && <div className="text-[10.5px] opacity-70 max-w-[220px]">{f.note}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
      <Caption text={cur.caption} note={cur.note} />
      <Transport
        step={step}
        stepCount={steps.length}
        playing={playing}
        onPrev={() => { setPlaying(false); setStep((s) => Math.max(0, s - 1)); }}
        onNext={() => { setPlaying(false); setStep((s) => Math.min(s + 1, steps.length - 1)); }}
        onPlayPause={() => setPlaying((p) => !p)}
        onReset={() => { setPlaying(false); setStep(0); }}
        onJump={(i) => { setPlaying(false); setStep(i); }}
      />
    </Frame>
  );
}

/* ============================================================================
   7. EXPRESSION TREE
   Builds a parse tree for an operator expression one grouping at a time, then
   evaluates it. Precedence is the concept that C students get wrong most often
   and that no amount of prose fixes; seeing `*` collapse into a subtree before
   `+` does fixes it permanently.
   ============================================================================ */

type ExprNode = { label: string; op?: string; tone?: string; children?: [ExprNode, ExprNode] };

function ExprTree({ node, depth = 0 }: { node: ExprNode; depth?: number }) {
  return (
    <div className={depth === 0 ? '' : 'mt-2'}>
      <div className="flex justify-center">
        <div
          className={`rounded-lg border px-2.5 py-1.5 text-center anim-pop-in ${
            node.op ? tone(node.tone) : 'bg-white border-[--border-subtle]'
          }`}
          style={{ animationDelay: `${depth * 60}ms` }}
        >
          <div className="font-mono text-[12px] font-bold text-[--text-heading] leading-tight">{node.label}</div>
          {node.op && (
            <div className="font-mono text-[9.5px] uppercase tracking-wide text-[--text-muted] leading-none mt-0.5">
              {node.op}
            </div>
          )}
        </div>
      </div>
      {node.children && (
        <div className="flex gap-3 justify-center mt-1">
          <div className="h-3 w-px bg-[--border-strong]" />
          <div className="h-3 w-px bg-[--border-strong]" />
        </div>
      )}
      {node.children && (
        <div className="grid grid-cols-2 gap-3">
          {node.children.map((c, i) => (
            <div key={i} className="min-w-0">
              <div className="h-3 w-px bg-[--border-strong] mx-auto" />
              <ExprTree node={c} depth={depth + 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ExpressionLab({ payload }: { payload: any }) {
  const steps: { caption?: string; note?: string; node: ExprNode; result?: string }[] = Array.isArray(payload.steps)
    ? payload.steps
    : [];
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const goNext = useCallback(() => setStep((s) => Math.min(s + 1, steps.length - 1)), [steps.length]);
  useAutoplay(step, steps.length, playing, 1500, goNext);

  const cur = steps[step] || {};

  return (
    <Frame title={payload.title} badge={payload.badge || 'precedence'} step={step} stepCount={steps.length}>
      {payload.expression && (
        <div className="px-4 pt-4 bg-[#FCFBF8]">
          <p className="font-mono text-[9.5px] uppercase tracking-wide text-[--text-muted] mb-1">expression</p>
          <pre className="rounded-md bg-[#1E1E1E] text-[#E6EDF3] px-3 py-2 text-[12.5px] font-mono overflow-x-auto">
            {payload.expression}
          </pre>
        </div>
      )}
      <div className="px-4 py-4 bg-[#FCFBF8] overflow-x-auto">
        {cur.node ? (
          <ExprTree node={cur.node} />
        ) : (
          <p className="text-[13px] text-[--text-muted] text-center py-4">No tree supplied.</p>
        )}
        {cur.result !== undefined && (
          <div className="mt-3 text-center">
            <span className="inline-block rounded-lg bg-[--brand-primary] text-white px-3 py-1.5 font-mono text-[13px] font-bold anim-pop-in">
              = {cur.result}
            </span>
          </div>
        )}
      </div>
      <Caption text={cur.caption} note={cur.note} />
      <Transport
        step={step}
        stepCount={steps.length}
        playing={playing}
        onPrev={() => { setPlaying(false); setStep((s) => Math.max(0, s - 1)); }}
        onNext={() => { setPlaying(false); setStep((s) => Math.min(s + 1, steps.length - 1)); }}
        onPlayPause={() => setPlaying((p) => !p)}
        onReset={() => { setPlaying(false); setStep(0); }}
        onJump={(i) => { setPlaying(false); setStep(i); }}
      />
    </Frame>
  );
}

/* ============================================================================
   8. COMPILATION PIPELINE
   Source → preprocessed → assembly → object → binary, with the real intermediate
   text at each stage. This is the lesson that makes `#include`, `extern`,
   "undefined reference" and the fact that a `.c` file is not a program all land
   at once.
   ============================================================================ */

export function Pipeline({ payload }: { payload: any }) {
  const stages: { name: string; tool?: string; in?: string; out?: string; detail?: string; tone?: string }[] =
    Array.isArray(payload.stages) ? payload.stages : [];
  const artifacts: Record<string, string> = payload.artifacts || {};
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const goNext = useCallback(() => setStep((s) => Math.min(s + 1, stages.length - 1)), [stages.length]);
  useAutoplay(step, stages.length, playing, 2200, goNext);

  const cur = stages[Math.min(step, stages.length - 1)];

  return (
    <Frame
      title={payload.title}
      badge={payload.badge || 'translation phases'}
      step={step}
      stepCount={stages.length}
    >
      {/* Rail */}
      <div className="px-4 py-3 bg-[#FCFBF8] border-b border-[--border-subtle] overflow-x-auto">
        <div className="flex items-stretch gap-1 min-w-fit">
          {stages.map((s, i) => (
            <div key={i} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => { setPlaying(false); setStep(i); }}
                aria-current={i === step}
                className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono whitespace-nowrap transition-all ${
                  i === step
                    ? 'bg-[--brand-primary] text-white border-[--brand-primary] font-bold'
                    : i < step
                    ? 'bg-white text-[--text-body] border-[--border-strong]'
                    : 'bg-white text-[--text-muted] border-[--border-subtle]'
                }`}
              >
                {i + 1}. {s.name}
              </button>
              {i < stages.length - 1 && <span className="text-[--text-light] px-0.5">→</span>}
            </div>
          ))}
        </div>
      </div>

      {cur && (
        <div key={step} className="grid sm:grid-cols-[1fr_auto_1fr] gap-3 p-4 items-start anim-stage-flow">
          <div className="min-w-0">
            <p className="font-mono text-[9.5px] uppercase tracking-wide text-[--text-muted] mb-1">input</p>
            <p className="text-[12.5px] text-[--text-body] leading-relaxed mb-2">{cur.in}</p>
            {cur.in && artifacts[cur.in] && <Artifact text={artifacts[cur.in]} />}
          </div>
          <div className="self-center flex flex-col items-center gap-1 px-1">
            <div className={`rounded-lg border px-2.5 py-1.5 text-center ${tone(cur.tone || 'code')}`}>
              <div className="font-mono text-[11px] font-bold text-[--text-heading]">{cur.tool || cur.name}</div>
            </div>
            <span className="text-[--brand-primary] text-lg leading-none">→</span>
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[9.5px] uppercase tracking-wide text-[--text-muted] mb-1">output</p>
            <p className="text-[12.5px] text-[--text-body] leading-relaxed mb-2">{cur.out}</p>
            {cur.out && artifacts[cur.out] && <Artifact text={artifacts[cur.out]} />}
          </div>
        </div>
      )}

      {cur?.detail && (
        <p className="px-4 pb-4 text-[12.5px] text-[--text-muted] leading-relaxed">{cur.detail}</p>
      )}

      <Transport
        step={step}
        stepCount={stages.length}
        playing={playing}
        onPrev={() => { setPlaying(false); setStep((s) => Math.max(0, s - 1)); }}
        onNext={() => { setPlaying(false); setStep((s) => Math.min(s + 1, stages.length - 1)); }}
        onPlayPause={() => setPlaying((p) => !p)}
        onReset={() => { setPlaying(false); setStep(0); }}
        onJump={(i) => { setPlaying(false); setStep(i); }}
      />
    </Frame>
  );
}

function Artifact({ text }: { text: string }) {
  return (
    <pre className="rounded-md bg-[#1E1E1E] text-[#E6EDF3] px-2.5 py-2 text-[10.5px] leading-relaxed font-mono overflow-x-auto max-h-[190px]">
      {text}
    </pre>
  );
}

/* ============================================================================
   9. STACK VS HEAP
   A vertical slice of a process's address space. The free-space gap between the
   growing heap and the growing stack is drawn, because that gap is the entire
   practical difference between the two: one collides with the other, the other
   never does.
   ============================================================================ */

export function StackHeap({ payload }: { payload: any }) {
  const steps: {
    caption?: string; note?: string;
    heap?: { label: string; size: number; tone?: string }[];
    stack?: { label: string; size: number; tone?: string }[];
    highlight?: 'heap' | 'stack' | 'gap';
  }[] = Array.isArray(payload.steps) ? payload.steps : [];

  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const goNext = useCallback(() => setStep((s) => Math.min(s + 1, steps.length - 1)), [steps.length]);
  useAutoplay(step, steps.length, playing, 1800, goNext);

  const cur = steps[step] || {};
  const heap = Array.isArray(cur.heap) ? cur.heap : [];
  const stack = Array.isArray(cur.stack) ? cur.stack : [];
  const maxUnits = Math.max(
    10,
    heap.reduce((n, h) => n + (h.size || 1), 0) + stack.reduce((n, s) => n + (s.size || 1), 0) + 4
  );
  const freeUnits = maxUnits - heap.reduce((n, h) => n + (h.size || 1), 0) - stack.reduce((n, s) => n + (s.size || 1), 0);

  const gapTone =
    cur.highlight === 'gap' ? 'ring-2 ring-[#C1442D]' : cur.highlight === 'heap' || cur.highlight === 'stack' ? '' : '';

  return (
    <Frame
      title={payload.title}
      badge={payload.badge || 'address space'}
      step={step}
      stepCount={steps.length}
    >
      <div className="px-4 py-4 bg-[#FCFBF8] flex justify-center">
        <div className="w-full max-w-[380px]">
          {stack.length > 0 && (
            <p className="font-mono text-[9.5px] uppercase tracking-wide text-[--text-muted] mb-1 text-right">
              stack grows down ↓
            </p>
          )}
          {stack.map((s, i) => (
            <div
              key={`s${i}`}
              style={{ height: `${(s.size / maxUnits) * 100}%`, minHeight: 22 }}
              className={`rounded-md border px-2 py-1 mb-1 anim-bar-grow anim-bar-grow-y overflow-hidden ${tone(
                s.tone || 'stack'
              )} ${cur.highlight === 'stack' ? 'ring-2 ring-[--brand-accent]' : ''}`}
            >
              <span className="font-mono text-[10.5px] font-bold leading-none">{s.label}</span>
            </div>
          ))}

          <div
            style={{ height: `${(freeUnits / maxUnits) * 100}%`, minHeight: 30 }}
            className={`rounded-md border border-dashed border-[#C6D2DE] bg-white/60 my-1 flex items-center justify-center anim-bar-grow anim-bar-grow-y ${gapTone}`}
          >
            <span className="font-mono text-[10px] text-[--text-muted] text-center px-2 leading-tight">
              free space
              <br />
              {freeUnits} units
            </span>
          </div>

          {heap.map((h, i) => (
            <div
              key={`h${i}`}
              style={{ height: `${(h.size / maxUnits) * 100}%`, minHeight: 22 }}
              className={`rounded-md border px-2 py-1 mb-1 anim-bar-grow overflow-hidden ${tone(
                h.tone || 'heap'
              )} ${cur.highlight === 'heap' ? 'ring-2 ring-[--brand-accent]' : ''}`}
            >
              <span className="font-mono text-[10.5px] font-bold leading-none">{h.label}</span>
            </div>
          ))}

          <p className="font-mono text-[9.5px] uppercase tracking-wide text-[--text-muted] mb-1">
            {heap.length > 0 ? 'heap grows up ↑' : 'program break'}
          </p>
          {[
            { l: '.bss — zero-initialised globals', t: 'bss' },
            { l: '.data — initialised globals', t: 'data' },
            { l: '.text — your code', t: 'code' },
          ].map((r) => (
            <div
              key={r.l}
              style={{ minHeight: 26 }}
              className={`rounded-md border px-2 py-1 mb-1 ${tone(r.t)}`}
            >
              <span className="font-mono text-[10.5px] font-bold leading-none">{r.l}</span>
            </div>
          ))}
        </div>
      </div>
      <Caption text={cur.caption} note={cur.note} />
      <Transport
        step={step}
        stepCount={steps.length}
        playing={playing}
        onPrev={() => { setPlaying(false); setStep((s) => Math.max(0, s - 1)); }}
        onNext={() => { setPlaying(false); setStep((s) => Math.min(s + 1, steps.length - 1)); }}
        onPlayPause={() => setPlaying((p) => !p)}
        onReset={() => { setPlaying(false); setStep(0); }}
        onJump={(i) => { setPlaying(false); setStep(i); }}
      />
    </Frame>
  );
}

/* ============================================================================
   10. LINKED LIST / STRUCT GRAPH
   Nodes appearing and relinking, for the structures module. Prose cannot show
   that `p->next = head` moves a node in constant time; this can.
   ============================================================================ */

type NodeSpec = { id: string; data: string; pointsTo?: string; tone?: string; note?: string };

export function NodeGraph({ payload }: { payload: any }) {
  const steps: { caption?: string; note?: string; nodes: NodeSpec[]; tail?: string; freeList?: string[] }[] =
    Array.isArray(payload.steps) ? payload.steps : [];
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const goNext = useCallback(() => setStep((s) => Math.min(s + 1, steps.length - 1)), [steps.length]);
  useAutoplay(step, steps.length, playing, 1600, goNext);

  const cur = steps[step] || { nodes: [] };
  const nodes: NodeSpec[] = Array.isArray(cur.nodes) ? cur.nodes : [];
  const freeList: string[] = Array.isArray(cur.freeList) ? cur.freeList : [];
  const last = nodes.length > 0 ? nodes[nodes.length - 1] : null;
  const linksToNothing = !last || !last.pointsTo;

  return (
    <Frame title={payload.title} badge={payload.badge || 'struct graph'} step={step} stepCount={steps.length}>
      <div className="px-4 py-4 bg-[#FCFBF8] overflow-x-auto">
        <div className="flex items-center gap-0 min-w-fit">
          {cur.tail && (
            <div className="shrink-0 rounded-md border border-[--border-subtle] bg-white px-2 py-2 mr-1.5">
              <div className="font-mono text-[10px] text-[--text-muted]">head</div>
              <div className="font-mono text-[11.5px] font-bold text-[--text-heading]">{cur.tail}</div>
            </div>
          )}
          {nodes.map((n, i) => {
            const dangling = !n.pointsTo;
            return (
              <React.Fragment key={n.id}>
                <div
                  className={`shrink-0 rounded-lg border px-2.5 py-1.5 anim-node-in ${tone(n.tone || 'int')} ${
                    dangling ? 'opacity-60' : ''
                  }`}
                >
                  <div className="font-mono text-[11.5px] font-bold text-[--text-heading] leading-tight">
                    {n.data}
                  </div>
                  <div className="font-mono text-[9.5px] text-[--text-muted] leading-tight">
                    {n.note || n.id}
                  </div>
                </div>
                <div
                  className={`shrink-0 px-1.5 font-mono text-[11px] ${
                    dangling ? 'text-[--color-error]' : 'text-[--text-light]'
                  }`}
                >
                  {dangling ? (linksToNothing ? '→ NULL' : '→ ⌀') : '→'}
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {freeList.length > 0 && (
          <div className="mt-3 pt-3 border-t border-dashed border-[--border-subtle]">
            <p className="font-mono text-[9.5px] uppercase tracking-wide text-[--text-muted] mb-1.5">
              free list (nodes malloc gave back)
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {freeList.map((f, i) => (
                <span
                  key={i}
                  className="rounded-md border border-dashed border-[#F3BDB8] bg-[#FCE4E1] px-2 py-1 font-mono text-[10.5px] text-[#8C1D18] anim-node-in"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      <Caption text={cur.caption} note={cur.note} />
      <Transport
        step={step}
        stepCount={steps.length}
        playing={playing}
        onPrev={() => { setPlaying(false); setStep((s) => Math.max(0, s - 1)); }}
        onNext={() => { setPlaying(false); setStep((s) => Math.min(s + 1, steps.length - 1)); }}
        onPlayPause={() => setPlaying((p) => !p)}
        onReset={() => { setPlaying(false); setStep(0); }}
        onJump={(i) => { setPlaying(false); setStep(i); }}
      />
    </Frame>
  );
}

/* ============================================================================
   11. STEP TRACE — the original `animation` block, unchanged
   ============================================================================ */

export function StepTrace({ payload }: { payload: any }) {
  const steps = Array.isArray(payload.steps)
    ? payload.steps
    : [
        { title: 'Step 1', desc: 'Initial state setup.' },
        { title: 'Step 2', desc: 'Processing & comparison.' },
        { title: 'Step 3', desc: 'Result propagation.' },
      ];
  const [active, setActive] = useState(0);

  return (
    <Frame
      title={payload.title || 'Step-by-Step Trace'}
      step={active}
      stepCount={steps.length}
    >
      <div className="flex gap-1.5 px-4 py-3 border-b border-[--border-subtle] overflow-x-auto">
        {steps.map((s: any, i: number) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            aria-current={i === active}
            className={`shrink-0 px-3 py-1.5 text-[12px] font-semibold rounded-lg transition-colors border ${
              i === active
                ? 'bg-[--brand-primary] text-white border-[--brand-primary]'
                : 'bg-white text-gray-600 border-[--border-subtle] hover:border-gray-300'
            }`}
          >
            {String(s.title || `Step ${i + 1}`).split(':')[0]}
          </button>
        ))}
      </div>
      <div className="bg-white px-5 py-4 space-y-2">
        <h5 className="font-semibold text-[14px] text-[--text-heading]">{steps[active]?.title}</h5>
        <p className="text-sm text-[--text-body] leading-relaxed">{steps[active]?.desc}</p>
        {steps[active]?.code_snippet && (
          <pre className="mt-2 p-3 bg-[#F4F4F2] rounded-lg text-[12px] font-mono text-[--brand-primary] overflow-x-auto">
            {steps[active].code_snippet}
          </pre>
        )}
      </div>
    </Frame>
  );
}

/* ============================================================================
   DISPATCHER
   ============================================================================ */

const REGISTRY: Record<string, (p: { payload: any }) => React.ReactElement> = {
  memory: MemoryLab,
  passing: PassingLab,
  callstack: CallStack,
  trace: Tracer,
  types: TypesLab,
  bits: BitView,
  expression: ExpressionLab,
  pipeline: Pipeline,
  stackheap: StackHeap,
  nodes: NodeGraph,
  step: StepTrace,
};

export const ANIMATION_KINDS = Object.keys(REGISTRY);

export function CourseAnimation({ payload }: { payload: any }) {
  const kind = String(payload?.kind || 'step');
  const Component = REGISTRY[kind];
  if (!Component) return null;
  return <Component payload={payload} />;
}
