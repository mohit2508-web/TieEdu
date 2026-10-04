'use client';

import React from 'react';
import { Ban, Building2, Layers } from 'lucide-react';
import { Sheet } from '@/components/common/Sheet';
import { DROP_TYPE_META, type DropFeedItem, type DropMuteKind } from '@/lib/dropsApi';

export interface DropNotInterestedSheetProps {
  drop: DropFeedItem | null;
  busy: boolean;
  error?: string;
  onClose: () => void;
  onMute: (kind: DropMuteKind) => void;
}

/**
 * "Not interested", widened to the two scopes the server accepts.
 *
 * Each option states exactly what it will do — a mute that silently swallows a
 * whole category is the kind of setting students cannot find their way out of,
 * so the scope is the label, not a footnote. A content-only drop (no company
 * target) simply does not get the company row: offering it would 400.
 */
export const DropNotInterestedSheet: React.FC<DropNotInterestedSheetProps> = ({
  drop,
  busy,
  error,
  onClose,
  onMute,
}) => {
  const meta = drop ? DROP_TYPE_META[drop.type] : null;

  const option = (
    kind: DropMuteKind,
    Icon: typeof Ban,
    title: string,
    description: string
  ) => (
    <button
      type="button"
      className="flex w-full items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-white px-4 py-3 text-left transition-colors hover:border-[var(--border-strong)]"
      disabled={busy}
      onClick={() => onMute(kind)}
    >
      <Icon size={19} strokeWidth={2.2} className="mt-0.5 flex-none text-[var(--brand-sky)]" aria-hidden />
      <span className="min-w-0">
        <span className="block text-sm font-bold text-[var(--text-heading)]">{title}</span>
        <span className="mt-0.5 block text-xs text-[var(--text-muted)]">{description}</span>
      </span>
    </button>
  );

  return (
    <Sheet open={!!drop} onClose={onClose} title="Show me less of this" zIndex={65}>
      {drop && meta && (
        <div className="space-y-2.5 px-5 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Muting “{drop.headline.slice(0, 48)}
            {drop.headline.length > 48 ? '…' : ''}”
          </p>

          {option('drop', Ban, 'Hide this drop', 'Only this one disappears from your feed.')}
          {option(
            'type',
            Layers,
            `Fewer ${meta.label.toLowerCase()}`,
            `Keep seeing ${meta.label.toLowerCase()} sometimes, just not as often.`
          )}
          {drop.target_slug &&
            option(
              'company',
              Building2,
              `Nothing from ${drop.target_slug}`,
              'Every drop about this company or college stops showing.'
            )}

          {error && (
            <p className="text-xs font-semibold text-[var(--color-error)]" role="alert">
              {error}
            </p>
          )}

          <button type="button" className="btn btn-ghost h-11 w-full" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      )}
    </Sheet>
  );
};

export default DropNotInterestedSheet;
