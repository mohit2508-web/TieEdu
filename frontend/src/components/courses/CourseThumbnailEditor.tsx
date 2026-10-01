import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Loader2, Trash2, Upload } from 'lucide-react';
import { uploadCourseThumbnail } from '@/lib/coursesApi';
import { apiAssetUrl } from '@/lib/api';

export interface CourseThumbnailEditorProps {
  courseId: string;
  slug: string;
  title: string;
  currentThumbnailUrl?: string;
  /** Called with the new value (possibly empty) so the page can re-render. */
  onChanged: (thumbnailUrl: string) => void;
  /** Human-readable failure, or null. */
  error?: string | null;
}

/** Mirrors the server's allow-list and 4 MB limit, to fail before uploading. */
const ACCEPT = '.jpg,.jpeg,.png,.webp,.avif';
const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Admin-only control for a course cover.
 *
 * Rendered only when the signed-in user is an admin, and the server enforces the
 * same rule independently — hiding a button in the UI is a convenience, not the
 * protection.
 *
 * The file is validated here for a fast, specific message rather than letting a
 * 4 MB photo travel to the server just to be rejected. A local object URL shows
 * the new cover the instant it is chosen, and is revoked afterwards so repeated
 * previews do not leak blobs.
 */
export const CourseThumbnailEditor: React.FC<CourseThumbnailEditorProps> = ({
  courseId,
  slug,
  title,
  currentThumbnailUrl,
  onChanged,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const current = preview || (currentThumbnailUrl ? apiAssetUrl(currentThumbnailUrl) : '');

  const resetPreview = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  };

  const send = async (file: File | null) => {
    setBusy(true);
    setError(null);
    try {
      const { thumbnail_url } = await uploadCourseThumbnail(courseId, file);
      resetPreview();
      onChanged(thumbnail_url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the course cover');
    } finally {
      setBusy(false);
    }
  };

  const onPick = (file: File | null) => {
    if (!file) return;
    if (!ACCEPT.split(',').some((ext) => file.name.toLowerCase().endsWith(ext))) {
      setError('Use a JPG, PNG, WebP or AVIF image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 4 MB.`);
      return;
    }
    resetPreview();
    setPreview(URL.createObjectURL(file));
    void send(file);
  };

  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface)] p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Admin · course cover</p>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <div className="h-[76px] w-[168px] shrink-0 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-hover)]">
          {current ? (
            /*
             * A plain `<img>` in a 168x76 slot, which looks like a mistake, so:
             * `current` is either a locally-chosen file preview (a data URL, with
             * no origin for the optimizer to fetch) or the just-uploaded
             * `/api/courses/.../thumb` path. The upload route only accepts
             * `.jpg/.jpeg/.png/.webp/.avif`, so the raster case is safe either way
             * — but at 168x76 in an admin-only editor the saving is negligible, and
             * the fixed parent box already removes any layout shift, so this is
             * left alone rather than churned.
             */
            /* eslint-disable-next-line @next/next/no-img-element -- data-URL preview, see above */
            <img src={current} alt={`Cover for ${title}`} width={168} height={76} decoding="async" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[var(--text-light)]">
              <ImageIcon size={20} aria-hidden="true" />
            </span>
          )}
        </div>

        <div className="min-w-0">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(e) => {
              onPick(e.target.files?.[0] || null);
              // Allow re-picking the same file after a failure.
              e.target.value = '';
            }}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--brand-sky)] bg-[var(--brand-sky)] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[var(--brand-sky-strong)] disabled:opacity-50"
            >
              {busy ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Upload size={13} aria-hidden="true" />}
              {busy ? 'Uploading' : currentThumbnailUrl ? 'Replace cover' : 'Upload cover'}
            </button>

            {currentThumbnailUrl ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void send(null)}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-bold text-[var(--text-body)] transition-colors hover:bg-[var(--bg-surface-hover)] disabled:opacity-50"
              >
                <Trash2 size={13} aria-hidden="true" />
                Remove
              </button>
            ) : null}
          </div>

          <p className="mt-2 text-[11px] text-[var(--text-muted)]">
            JPG, PNG, WebP or AVIF, up to 4 MB. Without a cover, {slug} shows a generated gradient.
          </p>
          {error && <p className="mt-1.5 text-[11px] font-semibold text-[var(--color-error)]">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default CourseThumbnailEditor;
