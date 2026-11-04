import React, { useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react';

/**
 * Inputs for the non-MCQ questions (backend lib/answerKinds.ts):
 * a typed answer (fill the blank / name the error and fix) and a drag-into-order
 * list. Drag works with a mouse; the arrow buttons work everywhere (touch, keyboard).
 */

/** Same rule as the server: case, spaces, quotes, backticks and a trailing ; don't matter. */
export const normAnswer = (s: string) =>
  String(s || '').toLowerCase().replace(/[`'"‘’“”]/g, '').replace(/;+\s*$/, '').replace(/\s+/g, '');
export const typedRight = (accepted: string[], typed: string) => !!normAnswer(typed) && accepted.some((a) => normAnswer(a) === normAnswer(typed));

/** A fixed shuffle for practice (never already in order), so a page reload shows the same puzzle. */
export const practiceOrder = (seed: string, n: number) => {
  const idx = Array.from({ length: n }, (_, i) => i);
  let h = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  for (let i = n - 1; i > 0; i--) { h = (h * 1103515245 + 12345) >>> 0; const j = h % (i + 1); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  if (n > 1 && idx.every((v, i) => v === i)) idx.push(idx.shift()!);
  return idx;
};

export const FillInput: React.FC<{
  value: string; onChange: (v: string) => void; onSubmit?: () => void; disabled?: boolean; tone?: 'right' | 'wrong'; large?: boolean;
}> = ({ value, onChange, onSubmit, disabled, tone, large }) => (
  <div>
    <label className="block text-sm font-semibold text-muted">Type your answer</label>
    <input
      type="text" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter' && onSubmit) { e.preventDefault(); onSubmit(); } }}
      autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} maxLength={200}
      placeholder="e.g. guard let"
      className={`mt-1 w-full rounded-xl border-2 bg-card px-4 font-mono text-heading outline-none focus:border-signal ${large ? 'min-h-[56px] text-lg' : 'min-h-[48px] text-base'} ${
        tone === 'right' ? 'border-success bg-success-soft' : tone === 'wrong' ? 'border-danger bg-danger-soft' : 'border-line'}`}
    />
    <p className="mt-1 text-xs text-muted">Capitals, spaces and a trailing ; don&apos;t matter.</p>
  </div>
);

/** `order`: the item indices in the order shown. `correct`: after checking, mark each row right/wrong. */
export const OrderList: React.FC<{
  items: string[]; order: number[]; onChange: (order: number[]) => void; disabled?: boolean; checked?: boolean; mono?: boolean; large?: boolean;
}> = ({ items, order, onChange, disabled, checked, mono, large }) => {
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const move = (from: number, to: number) => {
    if (disabled || to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    onChange(next);
  };
  return (
    <div>
      <p className="text-sm font-semibold text-muted">Drag the rows (or use the arrows) into the right order, top to bottom.</p>
      <ol className="mt-2 space-y-2">
        {order.map((k, pos) => {
          const tone = checked ? (k === pos ? 'border-success bg-success-soft' : 'border-danger bg-danger-soft') : over === pos && drag !== null ? 'border-signal bg-signal-soft' : 'border-line bg-card';
          return (
            <li
              key={k}
              draggable={!disabled}
              onDragStart={(e) => { setDrag(pos); e.dataTransfer.effectAllowed = 'move'; }}
              onDragOver={(e) => { if (drag !== null) { e.preventDefault(); setOver(pos); } }}
              onDragLeave={() => setOver((o) => (o === pos ? null : o))}
              onDrop={(e) => { e.preventDefault(); if (drag !== null) move(drag, pos); setDrag(null); setOver(null); }}
              onDragEnd={() => { setDrag(null); setOver(null); }}
              className={`flex items-center gap-2 rounded-xl border-2 px-2 py-2 ${tone} ${disabled ? '' : 'cursor-grab active:cursor-grabbing'} ${drag === pos ? 'opacity-50' : ''}`}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-hover text-sm font-bold text-heading">{pos + 1}</span>
              {!disabled && <GripVertical className="h-5 w-5 shrink-0 text-muted" aria-hidden />}
              <span className={`min-w-0 flex-1 whitespace-pre-wrap break-words text-heading ${mono ? 'font-mono' : ''} ${large ? 'text-lg' : 'text-base'}`}>{items[k]}</span>
              {!disabled && (
                <span className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => move(pos, pos - 1)} disabled={pos === 0} aria-label={`Move "${items[k]}" up`} className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-card text-heading disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" onClick={() => move(pos, pos + 1)} disabled={pos === order.length - 1} aria-label={`Move "${items[k]}" down`} className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-card text-heading disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};
