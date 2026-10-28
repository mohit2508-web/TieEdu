import React from 'react';
import { cn } from '@/lib/cn';
import { IconTile, type IconTileTone } from './IconTile';

/**
 * FloatingChip — the small white card that floats over a product mock-up:
 * icon tile, a short title and a caption (UI_REDESIGN_PLAN_V3 §9 E4, §10).
 * `bob` adds the gentle float; reduced motion keeps it still.
 */
export const FloatingChip: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  tone?: IconTileTone;
  title: React.ReactNode;
  caption?: React.ReactNode;
  bob?: boolean;
  className?: string;
}> = ({ icon, tone = 'primary', title, caption, bob, className }) => (
  <div className={cn('inline-flex w-max items-center gap-3 whitespace-nowrap rounded-card border border-line bg-card py-2.5 pl-2.5 pr-4 shadow-pop', bob && 'tk-bob', className)}>
    <IconTile icon={icon} tone={tone} size="sm" />
    <span className="min-w-0">
      <span className="block font-display text-label text-heading">{title}</span>
      {caption ? <span className="block text-caption text-muted">{caption}</span> : null}
    </span>
  </div>
);

export default FloatingChip;
