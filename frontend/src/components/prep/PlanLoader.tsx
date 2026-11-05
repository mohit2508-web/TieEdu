import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

/**
 * Loading state for My prep. Instead of a bare "Building your plan…" line, a
 * week of day cards lays itself out while the steps tick off one by one, so the
 * wait reads as progress. Calm on purpose: one slow loop, no bounce, and with
 * reduced motion the cards simply sit filled (see .plan-loader in globals.css).
 */
const STEPS = ['Checking your test date', 'Reading your scores', 'Laying out each day', 'Picking what to fix first'];
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export const PlanLoader: React.FC<{ name?: string }> = ({ name }) => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 650);
    return () => clearInterval(t);
  }, []);
  // Never reaches 100% on its own: the page swaps in as soon as the data lands.
  const pct = Math.round(((step + 1) / (STEPS.length + 0.6)) * 100);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-16" aria-busy="true" aria-live="polite">
      <div className="plan-loader w-full rounded-card border border-line bg-card p-6 shadow-edge-neutral">
        <div className="grid grid-cols-7 gap-2" aria-hidden>
          {DAYS.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span className="text-xs font-semibold text-muted">{d}</span>
              <span className="plan-loader-day h-12 w-full rounded-lg" style={{ animationDelay: `${i * 140}ms` }} />
            </div>
          ))}
        </div>

        <h1 className="mt-6 text-center font-display text-xl font-bold text-heading">
          Building your {name ? `${name} ` : ''}plan
        </h1>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-hover" aria-hidden>
          <div className="h-full rounded-full bg-signal transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
        </div>

        <ul className="mt-5 space-y-2.5">
          {STEPS.map((s, i) => {
            const done = i < step;
            const now = i === step;
            return (
              <li key={s} className={`flex items-center gap-3 text-base transition-opacity duration-300 ${i > step ? 'opacity-40' : 'opacity-100'}`}>
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full transition-colors duration-300 ${done ? 'bg-success text-white' : now ? 'bg-signal-soft' : 'bg-surface-hover'}`} aria-hidden>
                  {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : now ? <span className="plan-loader-dot h-2 w-2 rounded-full bg-signal" /> : null}
                </span>
                <span className={done ? 'text-muted' : now ? 'font-semibold text-heading' : 'text-muted'}>{s}</span>
              </li>
            );
          })}
        </ul>
        <span className="sr-only">{STEPS[step]}…</span>
      </div>
    </main>
  );
};

export default PlanLoader;
