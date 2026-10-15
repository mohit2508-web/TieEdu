import React, { useCallback, useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck, Check, Link2, Share2 } from 'lucide-react';

/**
 * Share and save a course page.
 *
 * Share: the Web Share API where the browser has it (phones), clipboard copy
 * everywhere else. One control, two backends — never two controls for one
 * action. "Saved" feedback is announced in a live region, not a toast, so it
 * is visible without stealing focus.
 *
 * Save: deliberately local — `localStorage` on this device — because there is
 * no bookmarks API on the server and inventing one here would be a UI lying
 * about where the list lives. The button says "Saved on this device" in its
 * accessible name for the same reason. If a server-side saved list ships
 * later, this component's state is the only thing that changes.
 */

const STORAGE_KEY = 'tieedu_saved_courses_v1';

const readSaved = (): string[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

export const ShareSaveButtons: React.FC<{ courseSlug: string; courseTitle: string }> = ({
  courseSlug,
  courseTitle,
}) => {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setSaved(readSaved().includes(courseSlug));
  }, [courseSlug]);

  const pageUrl = typeof window !== 'undefined' ? window.location.href : `https://tieedu.com/courses/${courseSlug}`;

  const share = useCallback(async () => {
    const shareData = { title: courseTitle, url: pageUrl };
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // User dismissed the share sheet — fall through to nothing, not an error.
      return;
    }
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setMessage('Link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage('Could not copy the link');
    }
  }, [courseTitle, pageUrl]);

  const toggleSave = useCallback(() => {
    const list = readSaved();
    const next = list.includes(courseSlug) ? list.filter((s) => s !== courseSlug) : [...list, courseSlug];
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      setMessage('Could not save — storage is unavailable');
      return;
    }
    setSaved(next.includes(courseSlug));
    setMessage(next.includes(courseSlug) ? 'Saved on this device' : 'Removed from saved');
  }, [courseSlug]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={share}
        aria-label={copied ? 'Link copied to clipboard' : `Share ${courseTitle}`}
        className="focus-ring inline-flex min-h-[40px] items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 text-sm font-bold text-[var(--text-body)] hover:border-[var(--brand-sky)]"
      >
        {copied ? <Check size={15} className="text-[var(--color-success)]" /> : typeof navigator !== 'undefined' && typeof navigator.share === 'function' ? <Share2 size={15} /> : <Link2 size={15} />}
        {copied ? 'Copied' : 'Share'}
      </button>
      <button
        type="button"
        onClick={toggleSave}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${courseTitle} from saved courses (saved on this device)` : `Save ${courseTitle} on this device`}
        className={[
          'focus-ring inline-flex min-h-[40px] items-center gap-1.5 rounded-[var(--radius-sm)] border px-3 text-sm font-bold transition-colors',
          saved
            ? 'border-[var(--brand-sky)] bg-[var(--brand-sky-soft)] text-[var(--brand-sky-strong)]'
            : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-body)] hover:border-[var(--brand-sky)]',
        ].join(' ')}
      >
        {saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
        {saved ? 'Saved' : 'Save'}
      </button>
      <span role="status" aria-live="polite" className="text-xs text-[var(--text-muted)]">
        {message}
      </span>
    </div>
  );
};
