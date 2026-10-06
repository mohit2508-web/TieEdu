'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { Sheet } from '@/components/common/Sheet';
import { Pressable } from '@/components/common/Pressable';
import { DROP_TYPE_META, type DropDetail } from '@/lib/dropsApi';
import { formatDay } from '@/lib/date';

export interface DropDetailSheetProps {
  drop: DropDetail | null;
  saved: boolean;
  saving: boolean;
  onClose: () => void;
  onCta: () => void;
  onSave: () => void;
}

/**
 * "Read More" — the drop's article.
 *
 * Markdown is rendered by the same `react-markdown` the course reader uses and
 * with the same policy: no `rehype-raw`, so raw HTML in a CMS field shows up as
 * text rather than as markup someone can smuggle past the preview.
 *
 * The CTA lives in the pinned `footer` slot rather than at the end of the
 * prose — an article's action button below 800 words is a button nobody
 * reaches. "Back to feed" sits beside it so a phone reader can dismiss the
 * article without hunting for the sheet's close control.
 */
export const DropDetailSheet: React.FC<DropDetailSheetProps> = ({
  drop,
  saved,
  saving,
  onClose,
  onCta,
  onSave,
}) => {
  const meta = drop ? DROP_TYPE_META[drop.type] : null;

  return (
    <Sheet
      open={!!drop}
      onClose={onClose}
      title={drop?.headline || 'Drop'}
      zIndex={65}
      footer={
        drop ? (
          <div className="flex items-center gap-2">
            <Pressable as="button" hapticWeight="medium" className="btn btn-primary h-11 flex-1" onPress={onCta}>
              {drop.cta_label}
            </Pressable>
            <Pressable
              as="button"
              hapticWeight="light"
              className="btn btn-ghost h-11"
              disabled={saving}
              aria-pressed={saved}
              onPress={onSave}
            >
              {saved ? <BookmarkCheck size={17} aria-hidden /> : <Bookmark size={17} aria-hidden />}
              {saved ? 'Saved' : 'Save'}
            </Pressable>
            <Pressable as="button" hapticWeight="light" className="btn btn-ghost h-11" onPress={onClose}>
              Feed
            </Pressable>
          </div>
        ) : null
      }
    >
      {drop && meta && (
        <div className="px-5 pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="drop-type-chip"
              style={{ ['--drop-chip' as string]: meta.chip } as React.CSSProperties}
            >
              {meta.label}
            </span>
            {drop.sponsored && (
              <span className="chip text-[11px]">{drop.sponsor_name || 'Sponsored'}</span>
            )}
            {drop.publish_at && (
              <span className="text-xs font-semibold text-[var(--text-muted)]">
                {formatDay(drop.publish_at)}
              </span>
            )}
          </div>

          <h3 className="mt-3 text-lg font-extrabold leading-snug text-[var(--text-heading)]">
            {drop.headline}
          </h3>

          {drop.bullets.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {drop.bullets.map((b) => (
                <li key={b} className="text-sm font-medium text-[var(--text-body)]">
                  • {b}
                </li>
              ))}
            </ul>
          )}

          {drop.deadline_at && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-sky-soft)] px-2.5 py-1 text-xs font-bold text-[var(--brand-sky-strong)]">
              {formatDay(drop.deadline_at)}
            </p>
          )}

          <div className="prose-article mt-4 text-sm text-[var(--text-body)]">
            <ReactMarkdown>{drop.body_md}</ReactMarkdown>
          </div>

          {drop.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {drop.tags.map((t) => (
                <span key={t} className="chip text-[11px]">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
};

export default DropDetailSheet;
