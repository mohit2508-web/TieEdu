import React from 'react';
import Link from 'next/link';
import { Gauge, ShieldCheck, Timer, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import type { ReadinessState } from '@/lib/coursesApi';

/**
 * The course page's entry to the pre-course readiness test.
 *
 * Before a test it explains the offer (test out of modules, cheaper path);
 * after one it summarises the result and links to the full report. All the
 * numbers come from the server's readiness state — nothing here is computed
 * from the client's idea of the score.
 */
export const ReadinessCard: React.FC<{
  courseSlug: string;
  readiness: ReadinessState;
  listPrice: number;
  owned: boolean;
}> = ({ courseSlug, readiness, listPrice, owned }) => {
  const r = readiness;
  const latest = r.latest;
  const href = `/courses/${courseSlug}/readiness`;
  const lowest = r.offer_tiers.reduce((min, t) => Math.min(min, t.price_inr), listPrice);

  if (latest) {
    const out = latest.modules.filter((m) => m.status === 'tested_out');
    return (
      <section className="mb-8 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Gauge size={18} className="text-link" aria-hidden />
            <h2 className="text-lg font-bold text-[var(--ink)]">Your readiness result</h2>
          </div>
          <span className="rounded-full bg-[var(--bg-surface-hover)] px-3 py-1 text-sm font-extrabold tabular-nums text-[var(--ink)]">
            {latest.score_percent}%
          </span>
        </div>
        <p className="mt-2 text-sm text-[var(--text-body)]">
          {latest.credits_voided
            ? 'This attempt had integrity warnings, so no modules were credited. You can retake it once the cooldown ends.'
            : out.length > 0
              ? `You tested out of ${out.length} module${out.length === 1 ? '' : 's'} — about ${latest.hours_saved} hours you do not need to study.`
              : latest.verdict === 'foundations'
                ? 'We recommend building foundations first — your report shows where to start.'
                : 'You are ready for the full course. Your report shows which modules to focus on.'}
        </p>
        {out.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {out.map((m) => (
              <li key={m.module_id} className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">
                <CheckCircle2 size={12} aria-hidden /> {m.title.replace(/^Module \d+ — /, '')}
              </li>
            ))}
          </ul>
        )}
        {!owned && latest.offer_price_inr !== null && (
          <p className="mt-3 text-sm font-semibold text-[var(--ink)]">
            Personalised path available: ₹{latest.offer_price_inr} instead of ₹{latest.list_price_inr}
            {r.path_choice === 'personalised' ? ' — selected.' : '.'}
          </p>
        )}
        <Link href={href} className="btn btn-primary focus-ring mt-4 inline-flex min-h-[44px] items-center gap-2">
          See full report {!owned && latest.offer_price_inr !== null ? '& choose your path' : ''} <ArrowRight size={16} aria-hidden />
        </Link>
      </section>
    );
  }

  if (owned) return null;

  return (
    <section className="mb-8 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <div className="border-b border-[var(--border-subtle)] bg-[var(--brand-sky-soft)] px-6 py-4">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-link" aria-hidden />
          <h2 className="text-lg font-bold text-[var(--ink)]">Take the readiness test first</h2>
        </div>
        <p className="mt-1 text-sm text-[var(--text-body)]">
          Find out what you already know. Every module you ace is tested out — you skip it — and enough of them unlock a
          cheaper personalised path, from ₹{lowest} instead of ₹{listPrice}.
        </p>
      </div>
      <div className="grid gap-4 px-6 py-5 sm:grid-cols-3">
        <Fact icon={<Timer size={16} aria-hidden />} title={`${r.duration_minutes} minutes`} text={`${r.question_count} questions, ${r.per_module} per module`} />
        <Fact icon={<ShieldCheck size={16} aria-hidden />} title="Fullscreen, secure" text="Copy-paste off; leaving the test is recorded" />
        <Fact icon={<Gauge size={16} aria-hidden />} title="Module-by-module report" text="Tested out · review · learn — with a plan" />
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border-subtle)] px-6 py-4">
        <Link href={href} className="btn btn-primary focus-ring inline-flex min-h-[44px] items-center gap-2">
          Start the readiness test <ArrowRight size={16} aria-hidden />
        </Link>
        <p className="text-xs text-[var(--text-muted)]">
          {(r.can_start ? '' : r.block_reason) || `Free · ${r.max_attempts} attempts · the final exam and capstone are still required for the certificate.`}
        </p>
      </div>
    </section>
  );
};

const Fact: React.FC<{ icon: React.ReactNode; title: string; text: string }> = ({ icon, title, text }) => (
  <div className="flex items-start gap-2">
    <span className="mt-0.5 text-link">{icon}</span>
    <div>
      <p className="text-sm font-bold text-[var(--ink)]">{title}</p>
      <p className="text-xs text-[var(--text-muted)]">{text}</p>
    </div>
  </div>
);
