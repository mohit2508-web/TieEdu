'use client';

import React from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  CalendarClock,
  ChevronLeft,
  Clock,
  ExternalLink,
  Eye,
  Heart,
  Share2,
} from 'lucide-react';
import { DROP_TYPE_META, type DropDetail, type DropFeedItem } from '@/lib/dropsApi';
import { apiAssetUrl } from '@/lib/api';
import { formatDay } from '@/lib/date';
import { compactCount } from './DropCard';

/*
 * The story page for a drop — a short news article, not a sheet.
 *
 * Shared by the full-screen overlay on /drops (opened with shallow routing, so
 * Back returns to the exact card) and the server-rendered /drops/[id] page that
 * a shared link lands on. Reading comes first; leaving for another site always
 * goes through the leave-site page (/drops/go/[id]), never straight out.
 */

export const readingMinutes = (drop: Pick<DropDetail, 'body_md' | 'bullets'>): number => {
  const words = `${drop.body_md || ''} ${(drop.bullets || []).join(' ')}`.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
};

const daysLeft = (iso: string): string => {
  const days = Math.ceil((Date.parse(iso) - Date.now()) / 86400000);
  if (!Number.isFinite(days)) return '';
  return days < 0 ? 'Closed' : days === 0 ? 'Closes today' : days === 1 ? 'Closes tomorrow' : `${days} days left`;
};

/** Domain shown on the external button: "careers.wipro.com". */
export const hostOf = (url: string | null | undefined): string => {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, '') : '';
  } catch {
    return '';
  }
};

export interface DropStoryProps {
  drop: DropDetail;
  related: DropFeedItem[];
  saved: boolean;
  /** Overlay mode renders a close chevron instead of a back link. */
  onClose?: () => void;
  onSave: () => void;
  onLike?: () => void;
  onShare: () => void;
  /** The drop's own call to action (internal route, or the leave-site page). */
  onCta: () => void;
  /** The official source link (always via the leave-site page). */
  onSource: () => void;
  onOpenRelated: (item: DropFeedItem) => void;
}

export const DropStory: React.FC<DropStoryProps> = ({
  drop,
  related,
  saved,
  onClose,
  onSave,
  onLike,
  onShare,
  onCta,
  onSource,
  onOpenRelated,
}) => {
  const meta = DROP_TYPE_META[drop.type] || { label: drop.type, chip: 'var(--brand-sky)' };
  const style = { '--drop-chip': meta.chip } as React.CSSProperties;
  const external = !!drop.cta_url;
  const sourceHost = hostOf(drop.source_url);

  return (
    <article className="drop-story" style={style}>
      <div className="drop-story__hero">
        {drop.image_url && (
          // eslint-disable-next-line @next/next/no-img-element -- CMS / generated creative
          <img className="drop-story__bg" src={apiAssetUrl(drop.image_url)} alt="" aria-hidden="true" />
        )}
        {drop.image_url && (
          // eslint-disable-next-line @next/next/no-img-element -- CMS / generated creative
          <img className="drop-story__poster" src={apiAssetUrl(drop.image_url)} alt={drop.image_alt || drop.headline} />
        )}
        <div className="drop-story__topbar">
          {onClose ? (
            <button type="button" className="drop-story__iconbtn" onClick={onClose} aria-label="Back to Drops">
              <ChevronLeft size={22} strokeWidth={2.6} aria-hidden />
            </button>
          ) : (
            <Link href="/drops" className="drop-story__iconbtn" aria-label="Back to Drops">
              <ChevronLeft size={22} strokeWidth={2.6} aria-hidden />
            </Link>
          )}
          <button type="button" className="drop-story__iconbtn" onClick={onShare} aria-label="Share">
            <Share2 size={19} strokeWidth={2.4} aria-hidden />
          </button>
        </div>
      </div>

      <div className="drop-story__body">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
          <span className="drop-type-chip">{meta.label}</span>
          {drop.publish_at && <span>{formatDay(drop.publish_at)}</span>}
          <span className="inline-flex items-center gap-1">
            <Clock size={13} strokeWidth={2.4} aria-hidden /> {readingMinutes(drop)} min read
          </span>
          {(drop.views || 0) >= 10 && (
            <span className="inline-flex items-center gap-1">
              <Eye size={13} strokeWidth={2.4} aria-hidden /> {compactCount(drop.views)}
            </span>
          )}
          {drop.sponsored && <span className="chip text-xs">{drop.sponsor_name || 'Sponsored'}</span>}
        </div>

        <h1 className="mt-3 font-display text-2xl font-extrabold leading-tight tracking-tight text-[var(--text-heading)] sm:text-[2rem]">
          {drop.headline}
        </h1>

        {drop.deadline_at && (
          <p className="drop-story__deadline">
            <CalendarClock size={15} strokeWidth={2.6} aria-hidden />
            {formatDay(drop.deadline_at)} · {daysLeft(drop.deadline_at)}
          </p>
        )}

        {drop.bullets.length > 0 && (
          <section className="drop-story__short" aria-label="In short">
            <p className="drop-story__label">In short</p>
            <ul>
              {drop.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </section>
        )}

        {(drop.facts || []).length > 0 && (
          <section aria-label="Key facts">
            <p className="drop-story__label mt-5">Key facts</p>
            <dl className="drop-story__facts">
              {(drop.facts || []).map((f) => (
                <div key={f.label}>
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {drop.quiz && (
          <section className="drop-story__short" aria-label="Practice question">
            <p className="drop-story__label">Practice question</p>
            <p className="whitespace-pre-wrap font-semibold text-[var(--text-heading)]">{drop.quiz.question}</p>
            <ol className="mt-2 list-[upper-alpha] pl-5 text-[var(--text-body)]">
              {drop.quiz.options.map((o, i) => (
                <li key={i} className={i === drop.quiz!.answer ? 'font-bold text-[var(--success,#15803d)]' : ''}>
                  {o}
                </li>
              ))}
            </ol>
            {drop.quiz.explain && <p className="mt-2 text-sm text-[var(--text-body)]">{drop.quiz.explain}</p>}
          </section>
        )}

        {drop.body_md && (
          <div className="drop-story__article">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{drop.body_md}</ReactMarkdown>
          </div>
        )}

        {drop.source_url && (
          <button type="button" className="drop-story__source" onClick={onSource}>
            <ExternalLink size={16} strokeWidth={2.4} aria-hidden />
            <span className="flex-1 text-left">
              <span className="block text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Official source</span>
              <span className="block font-bold text-[var(--text-heading)]">{drop.source_name || sourceHost}</span>
            </span>
            <span className="text-xs font-semibold text-[var(--text-muted)]">{sourceHost}</span>
          </button>
        )}

        {related.length > 0 && (
          <section className="mt-8" aria-label="More drops like this">
            <p className="drop-story__label">More like this</p>
            <div className="drop-story__related">
              {related.map((r) => (
                <button key={r.id} type="button" onClick={() => onOpenRelated(r)} className="drop-story__rel">
                  {r.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element -- CMS / generated creative
                    <img src={apiAssetUrl(r.image_url.includes('/covers/') ? `${r.image_url}&static=1` : r.image_url)} alt="" loading="lazy" />
                  )}
                  <span>{r.headline}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Sticky actions: read first, then act. */}
      <div className="drop-story__bar">
        {onLike && (
          <button type="button" className="drop-story__iconbtn drop-story__iconbtn--light" data-on={drop.liked || undefined} aria-pressed={!!drop.liked} onClick={onLike} aria-label={drop.liked ? 'Unlike' : 'Like'}>
            <Heart size={20} strokeWidth={2.4} fill={drop.liked ? 'currentColor' : 'none'} aria-hidden />
            {drop.likes ? <span className="text-xs font-bold">{compactCount(drop.likes)}</span> : null}
          </button>
        )}
        <button type="button" className="drop-story__iconbtn drop-story__iconbtn--light" data-on={saved || undefined} aria-pressed={saved} onClick={onSave} aria-label={saved ? 'Remove from saved' : 'Save'}>
          {saved ? <BookmarkCheck size={20} strokeWidth={2.4} aria-hidden /> : <Bookmark size={20} strokeWidth={2.4} aria-hidden />}
        </button>
        <button type="button" className="btn btn-primary h-12 flex-1" onClick={onCta}>
          {external ? `Continue to ${hostOf(drop.cta_url) || 'website'}` : drop.cta_label}
          <ArrowUpRight size={18} strokeWidth={2.6} aria-hidden />
        </button>
      </div>
    </article>
  );
};

export default DropStory;
