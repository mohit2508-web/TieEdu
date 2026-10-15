import React from 'react';
import { Github, Send } from 'lucide-react';
import { submitProject } from '@/lib/coursesApi';

/**
 * The capstone project submission box.
 *
 * Shown only for courses whose project is required for the certificate. The
 * server re-validates everything — exam passed, lessons complete, real http(s)
 * URL — so this is a form, not a gate.
 */
export const ProjectSubmit: React.FC<{
  courseSlug: string;
  currentUrl?: string | null;
  onSubmitted?: () => void;
}> = ({ courseSlug, currentUrl, onSubmitted }) => {
  const [url, setUrl] = React.useState(currentUrl || '');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(!!currentUrl);

  const submit = async () => {
    const trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      setError('Enter a full link starting with https:// (a repo, doc or demo).');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await submitProject(courseSlug, trimmed);
      setSaved(true);
      onSubmitted?.();
    } catch (e: any) {
      setError(e?.message || 'Could not submit the project');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-hover)] p-4">
      <div className="flex items-center gap-2">
        <Github size={16} className="text-[var(--text-muted)]" />
        <p className="text-sm font-bold text-[var(--ink)]">Your project link</p>
        {saved && currentUrl && (
          <a
            href={currentUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-[var(--brand-sky)] underline underline-offset-2"
          >
            View submitted
          </a>
        )}
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          inputMode="url"
          autoComplete="off"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setSaved(false);
          }}
          placeholder="https://github.com/you/project"
          className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--brand-sky)]"
        />
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--brand-sky)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--brand-sky-strong)] disabled:opacity-60"
        >
          <Send size={14} /> {busy ? 'Submitting…' : saved ? 'Update link' : 'Submit project'}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-xs text-[var(--color-error)]">{error}</p>
      )}
      <p className="mt-2 text-xs text-[var(--text-muted)]">
        A repo, write-up or live demo is fine. Submitting after passing the exam completes the last
        certificate requirement.
      </p>
    </div>
  );
};

export default ProjectSubmit;
