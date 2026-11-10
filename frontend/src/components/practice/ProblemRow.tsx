import React from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, CircleDot, Lock } from 'lucide-react';
import { Chip } from '@/components/ui/Chip';
import type { PracticeRow } from '@/lib/codeApi';

const DIFF = { easy: ['Easy', 'success'], medium: ['Medium', 'warning'], hard: ['Hard', 'danger'] } as const;

export function StatusIcon({ status }: { status: string }) {
  if (status === 'solved') return <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-label="Solved" />;
  if (status === 'attempted') return <CircleDot className="h-5 w-5 shrink-0 text-warning" aria-label="Attempted" />;
  return <Circle className="h-5 w-5 shrink-0 text-muted" aria-label="Not started" />;
}

/**
 * One problem in a practice list: status, title, difficulty, the companies that
 * ask it, and — when locked — the pack that opens it (a button that opens the
 * buy sheet; the title still opens the problem to read).
 */
export function ProblemRow({ row, href, index, onUnlock, showCompanies = true }: {
  row: PracticeRow; href: string; index?: number; onUnlock: (company: { slug: string; name: string }) => void; showCompanies?: boolean;
}) {
  const [label, tone] = DIFF[row.difficulty as keyof typeof DIFF] || [row.difficulty, 'neutral'];
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:flex-nowrap">
      {index != null && <span className="w-6 shrink-0 text-right text-sm tabular-nums text-muted">{index}</span>}
      <StatusIcon status={row.status} />
      <Link href={href} className="min-w-0 flex-1 text-base font-semibold text-heading hover:text-link focus-ring">
        {row.title}
        {row.kind === 'pyq' && <span className="ml-2 align-middle text-sm font-medium text-muted">· reported</span>}
      </Link>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {showCompanies && row.companies.map((c) => <Chip key={c.slug} className="hidden md:inline-flex">{c.name}</Chip>)}
        <Chip tone={tone as 'success' | 'warning' | 'danger' | 'neutral'}>{label}</Chip>
        {!row.open && row.lock_company && (
          <button type="button" onClick={() => onUnlock(row.lock_company!)}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-medium text-body hover:border-signal hover:text-heading focus-ring">
            <Lock className="h-3.5 w-3.5" aria-hidden /> In {row.lock_company.name} pack
          </button>
        )}
      </div>
    </li>
  );
}
