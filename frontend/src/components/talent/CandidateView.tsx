import React from 'react';
import Link from 'next/link';
import { BadgeCheck } from 'lucide-react';
import { Card } from '@/components/ui';
import type { CandidateCard } from '@/lib/talentApi';

/** The anonymous candidate card: what a recruiter sees, and the student's own preview of it. */
export function CandidateView({ card, action }: { card: CandidateCard; action?: React.ReactNode }) {
  return (
    <Card className="mt-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-bold text-heading">{card.handle}</p>
          <p className="text-sm text-muted">{[card.branch, card.grad_year ? `graduating ${card.grad_year}` : null, card.city].filter(Boolean).join(' · ') || 'No details added'}</p>
        </div>
        {action}
      </div>
      {card.skills.length === 0
        ? <p className="mt-2 text-sm text-muted">No tested skills yet — recruiters only see students with at least one skill test. <Link href="/skill-test" className="font-semibold text-signal hover:underline">Take one</Link>.</p>
        : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {card.skills.map((s) => (
              <li key={s.slug} className="rounded-full bg-surface-hover px-3 py-1 text-sm text-heading">
                {s.name} <strong>{s.score}%</strong>{s.level ? ` · ${s.level}` : ''}{s.certified && <BadgeCheck className="ml-1 inline h-3.5 w-3.5 text-success" aria-label="certified" />}
              </li>
            ))}
          </ul>
        )}
      {card.certificates.length > 0 && <p className="mt-2 text-xs text-muted">Certificates (verified by TieEdu): {card.certificates.map((c) => c.title).join(', ')}</p>}
    </Card>
  );
}
