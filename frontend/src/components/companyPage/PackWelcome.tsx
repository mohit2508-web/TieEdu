import React, { useEffect, useState } from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { Sheet } from '@/components/common/Sheet';
import type { Company } from '@/types';

/**
 * "What you got" (TRAIN_TEST_TRACK_PLAN §3). Shown once, the first time a
 * student opens a company page with the pack active (payments are verified by
 * hand, so this is the moment it becomes real). Lists 100% of the contents,
 * then one action: start Day 1.
 */
const seenKey = (slug: string) => `tieedu_pack_welcome_${slug}`;

export const PackWelcome: React.FC<{ company: Company; owned: boolean; firstHref: string }> = ({ company, owned, firstHref }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!owned || !company.slug) return;
    if (!window.localStorage.getItem(seenKey(company.slug))) setOpen(true);
  }, [owned, company.slug]);

  const close = () => {
    window.localStorage.setItem(seenKey(company.slug), '1');
    setOpen(false);
  };

  const modules = company.modules || [];
  const questions = modules.reduce((n, m) => n + (m.items?.length || 0), 0);
  const rounds = company.rounds_pipeline || [];

  return (
    <Sheet open={open} onClose={close} title={`Your ${company.name} pack is active`}>
      <div className="px-5 pb-6">
        <p className="text-sm text-muted">Everything below is unlocked for you, for life.</p>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            [rounds.length || '—', 'rounds'],
            [modules.length, 'modules'],
            [questions, 'questions'],
          ].map(([n, label]) => (
            <div key={String(label)} className="rounded-card border border-line bg-card p-3">
              <dd className="font-display text-2xl font-bold text-heading">{n}</dd>
              <dt className="text-xs text-muted">{label}</dt>
            </div>
          ))}
        </dl>
        <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
          {modules.map((m) => (
            <li key={m.id} className="flex items-start gap-2 text-sm text-body">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
              <span>
                {m.title}
                {m.items?.length ? <span className="text-muted"> · {m.items.length} questions</span> : null}
              </span>
            </li>
          ))}
        </ul>
        <a href={firstHref} onClick={close} className="btn btn-primary focus-ring mt-5 flex w-full min-h-[52px] items-center justify-center gap-2">
          Start Day 1 <ArrowRight className="h-4 w-4" aria-hidden />
        </a>
      </div>
    </Sheet>
  );
};
