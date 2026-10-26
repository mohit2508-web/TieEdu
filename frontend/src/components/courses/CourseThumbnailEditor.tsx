import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Loader2, Trash2, Upload, ImagePlus } from 'lucide-react';
import { uploadCourseThumbnail } from '@/lib/coursesApi';
import { apiAssetUrl } from '@/lib/api';
import { courseCover } from '@/lib/courseFormat';

export interface CourseThumbnailEditorProps {
  courseId: string;
  slug: string;
  title: string;
  currentThumbnailUrl?: string;
  /** Accessibility text for the cover. */
  alt?: string | null;
  /** Called with the new value (possibly empty) so the page can re-render. */
  onChanged: (thumbnailUrl: string) => void;
  /** Called when the admin edits the alt text, so the meta form can save it. */
  onAltChange?: (alt: string) => void;
}

/** Mirrors the server's allow-list and 4 MB limit, to fail before uploading. */
const ACCEPT = '.jpg,.jpeg,.png,.webp,.avif';
const MAX_BYTES = 4 * 1024 * 1024;

/** Exported for the quality gate so the floor lives in one place. */
export const MIN_WIDTH = 640;
export const MIN_HEIGHT = 360;

const PRESETS = [
  { key: '16:9', label: '16:9', ratio: 16 / 9 },
  { key: '4:3', label: '4:3', ratio: 4 / 3 },
  { key: '1:1', label: '1:1', ratio: 1 },
] as const;
type PresetKey = (typeof PRESETS)[number]['key'];

type Phase = 'idle' | 'crop';

/** Decode a picked file into an HTMLImageElement, or fail with a plain message. */
const decodeImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That file is not a readable image.'));
    };
    img.src = url;
  });

/**
 * Rasterise the visible crop of `img` at the requested ratio into a JPEG File.
 *
 * The crop box is always the largest rect of the target ratio that fits inside
 * the source, offset by `focusX`/`focusY` (each a 0..1 fraction of the
 * available slack on that axis). Exporting at a fixed 1280-wide canvas keeps
 * the stored file a sensible size for a card cover and guarantees the result
 * clears the minimum-resolution gate regardless of what the admin dropped in.
 */
const exportCrop = (
  img: HTMLImageElement,
  ratio: number,
  focusX: number,
  focusY: number,
  filename: string
): Promise<File> => {
  const outWidth = 1280;
  const outHeight = Math.round(outWidth / ratio);

  let cropW = img.naturalWidth;
  let cropH = Math.round(cropW / ratio);
  if (cropH > img.naturalHeight) {
    cropH = img.naturalHeight;
    cropW = Math.round(cropH * ratio);
  }
  const slackX = img.naturalWidth - cropW;
  const slackY = img.naturalHeight - cropH;
  const sx = Math.round(slackX * Math.min(1, Math.max(0, focusX)));
  const sy = Math.round(slackY * Math.min(1, Math.max(0, focusY)));

  const canvas = document.createElement('canvas');
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable in this browser.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, outWidth, outHeight);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
  const base64 = dataUrl.split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return Promise.resolve(new File([bytes], filename, { type: 'image/jpeg' }));
};

/**
 * Render the course's generated cover (the same gradient + monogram the card
 * falls back to) into a 1280x720 JPEG File, so an admin can promote the
 * fallback into a real stored cover with one click.
 */
const generateCoverFile = async (slug: string, title: string): Promise<File> => {
  const { from, to, initial } = courseCover(slug, title);
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable in this browser.');

  const gradient = ctx.createLinearGradient(0, 0, 1280, 720);
  gradient.addColorStop(0, from);
  gradient.addColorStop(1, to);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1280, 720);

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = '700 340px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initial, 640, 360);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  const base64 = dataUrl.split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], `cover-${slug}.jpg`, { type: 'image/jpeg' });
};

/**
 * Admin-only control for a course cover.
 *
 * Rendered only when the signed-in user is an admin, and the server enforces the
 * same rule independently — hiding a button in the UI is a convenience, not the
 * protection.
 *
 * Covers can arrive three ways: drop a file (DnD or picker), crop it to a card
 * ratio before saving, or generate one from the title. Every path validates the
 * file here for a fast, specific message rather than letting a 4 MB photo travel
 * to the server just to be rejected. A local object URL previews the new cover
 * the instant it is chosen, and is revoked afterwards so repeated previews do not
 * leak blobs.
 */
export const CourseThumbnailEditor: React.FC<CourseThumbnailEditorProps> = ({
  courseId,
  slug,
  title,
  currentThumbnailUrl,
  alt,
  onChanged,
  onAltChange,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [preset, setPreset] = useState<PresetKey>('16:9');
  const [focusX, setFocusX] = useState(0.5);
  const [focusY, setFocusY] = useState(0.5);
  const [dragging, setDragging] = useState(false);
  const pendingRef = useRef<{ file: File; img: HTMLImageElement } | null>(null);

  const current = preview || (currentThumbnailUrl ? apiAssetUrl(currentThumbnailUrl) : '');

  const resetPreview = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  };

  const send = useCallback(
    async (file: File | null) => {
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
    },
    [courseId, onChanged]
  );

  const acceptFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      if (!ACCEPT.split(',').some((ext) => file.name.toLowerCase().endsWith(ext))) {
        setError('Use a JPG, PNG, WebP or AVIF image.');
        return;
      }
      if (file.size > MAX_BYTES) {
        setError(`That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 4 MB.`);
        return;
      }
      setError(null);
      try {
        const img = await decodeImage(file);
        if (img.naturalWidth < MIN_WIDTH || img.naturalHeight < MIN_HEIGHT) {
          setError(
            `That image is ${img.naturalWidth}×${img.naturalHeight}. Covers need at least ${MIN_WIDTH}×${MIN_HEIGHT} so cards stay sharp.`
          );
          return;
        }
        // Open the crop step rather than uploading straight away: every cover
        // should read correctly at a card ratio, and this is the one moment an
        // admin is looking at the file with that in mind.
        pendingRef.current = { file, img };
        setFocusX(0.5);
        setFocusY(0.5);
        setPhase('crop');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not read that image.');
      }
    },
    []
  );

  // Revoke the preview object URL when the component goes away.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const confirmCrop = async () => {
    const pending = pendingRef.current;
    if (!pending) return;
    const ratio = PRESETS.find((p) => p.key === preset)!.ratio;
    const cropped = await exportCrop(pending.img, ratio, focusX, focusY, pending.file.name);
    pendingRef.current = null;
    setPhase('idle');
    resetPreview();
    setPreview(URL.createObjectURL(cropped));
    await send(cropped);
  };

  const cancelCrop = () => {
    pendingRef.current = null;
    setPhase('idle');
  };

  const uploadAsIs = async () => {
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    setPhase('idle');
    resetPreview();
    setPreview(URL.createObjectURL(pending.file));
    await send(pending.file);
  };

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const file = await generateCoverFile(slug, title);
      resetPreview();
      setPreview(URL.createObjectURL(file));
      await send(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate a cover.');
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (busy) return;
    void acceptFile(e.dataTransfer.files?.[0] || null);
  };

  return (
    <div
      className={`rounded-[var(--radius-lg)] border border-dashed bg-[var(--bg-surface)] p-4 transition-colors ${
        dragging ? 'border-[var(--brand-sky)] bg-[var(--brand-sky-soft)]' : 'border-[var(--border-strong)]'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
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
            <img src={current} alt={alt || `Cover for ${title}`} width={168} height={76} decoding="async" className="h-full w-full object-cover" />
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
              void acceptFile(e.target.files?.[0] || null);
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

            <button
              type="button"
              disabled={busy}
              onClick={generate}
              title="Uses the same deterministic gradient the card falls back to, rendered at card size."
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-strong)] px-3 py-1.5 text-xs font-bold text-[var(--ink)] transition-colors hover:bg-[var(--bg-surface-hover)] disabled:opacity-50"
            >
              <ImagePlus size={13} aria-hidden="true" />
              Generate from title
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

          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Drop a file here or upload. JPG, PNG, WebP or AVIF, up to 4 MB, at least {MIN_WIDTH}×{MIN_HEIGHT}. Without a cover, {slug} shows a generated gradient.
          </p>
          {error && <p className="mt-1.5 text-xs font-semibold text-[var(--color-error)]">{error}</p>}
        </div>
      </div>

      {onAltChange && (
        <label className="mt-4 block">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Cover alt text</span>
          <input
            type="text"
            defaultValue={alt || ''}
            onBlur={(e) => onAltChange(e.target.value)}
            placeholder="Describe the cover for screen readers"
            className="mt-1.5 w-full rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--brand-sky)]"
          />
          <span className="mt-1 block text-xs text-[var(--text-muted)]">
            Saved with the course when you leave the field.
          </span>
        </label>
      )}

      {/* ---- crop step ---- */}
      {phase === 'crop' && pendingRef.current && (
        <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface-hover)] p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Crop to card ratio</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPreset(p.key)}
                aria-pressed={preset === p.key}
                className={`min-h-[40px] rounded-[var(--radius-sm)] border px-3 py-1.5 text-xs font-bold transition-colors ${
                  preset === p.key
                    ? 'border-[var(--brand-sky)] bg-[var(--brand-sky)] text-white'
                    : 'border-[var(--border-strong)] text-[var(--ink)] hover:bg-[var(--bg-surface)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="block">
              <span className="text-xs font-semibold text-[var(--text-muted)]">Horizontal focus</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={focusX}
                onChange={(e) => setFocusX(Number(e.target.value))}
                className="mt-1 w-full accent-[var(--brand-sky)]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[var(--text-muted)]">Vertical focus</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={focusY}
                onChange={(e) => setFocusY(Number(e.target.value))}
                className="mt-1 w-full accent-[var(--brand-sky)]"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={confirmCrop}
              disabled={busy}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--brand-sky)] px-3 py-1.5 text-xs font-bold text-white hover:bg-[var(--brand-sky-strong)] disabled:opacity-50"
            >
              {busy ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : null}
              Save crop
            </button>
            <button
              type="button"
              onClick={uploadAsIs}
              disabled={busy}
              className="inline-flex min-h-[40px] items-center rounded-[var(--radius-sm)] border border-[var(--border-strong)] px-3 py-1.5 text-xs font-bold text-[var(--ink)] hover:bg-[var(--bg-surface)] disabled:opacity-50"
            >
              Upload as-is
            </button>
            <button
              type="button"
              onClick={cancelCrop}
              disabled={busy}
              className="inline-flex min-h-[40px] items-center rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-bold text-[var(--text-body)] hover:bg-[var(--bg-surface)] disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseThumbnailEditor;
