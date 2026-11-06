import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Loader2, Move, X } from 'lucide-react';

/*
 * Fit any photo to the drop frame before it is uploaded.
 *
 * The feed card is a 9:16 phone frame, so a creative is rendered here onto a
 * 1080x1920 canvas and exported as WebP (JPEG where WebP encoding is missing).
 * That fixes the two upload failures admins kept hitting: a 6–12 MB phone
 * photo bouncing off the server/proxy size limit, and a landscape banner being
 * cropped to a sliver on the card.
 *
 *   Fill — cover the frame; zoom and drag to choose what stays in.
 *   Fit  — the whole image, centred over a blurred copy of itself (best for
 *          posters and banners whose edges carry text).
 */

export const DROP_W = 1080;
export const DROP_H = 1920;
const PREVIEW_W = 252;
const PREVIEW_H = 448;

type Mode = 'fill' | 'fit';

const draw = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  W: number,
  H: number,
  mode: Mode,
  zoom: number,
  ox: number,
  oy: number
) => {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0B111A';
  ctx.fillRect(0, 0, W, H);

  if (mode === 'fit') {
    // Blurred cover background, then the whole image on top.
    const bs = Math.max(W / iw, H / ih) * 1.1;
    ctx.save();
    ctx.filter = `blur(${Math.round(W / 27)}px) brightness(0.65)`;
    ctx.drawImage(img, (W - iw * bs) / 2, (H - ih * bs) / 2, iw * bs, ih * bs);
    ctx.restore();
  }

  const base = mode === 'fill' ? Math.max(W / iw, H / ih) : Math.min(W / iw, H / ih);
  const s = base * zoom;
  const dw = iw * s;
  const dh = ih * s;
  const spanX = Math.abs(dw - W) / 2;
  const spanY = Math.abs(dh - H) / 2;
  ctx.drawImage(img, (W - dw) / 2 + ox * spanX, (H - dh) / 2 + oy * spanY, dw, dh);
};

const toBlob = (canvas: HTMLCanvasElement, type: string, q: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, q));

export interface FittedImage {
  blob: Blob;
  url: string;
  name: string;
}

export const DropMediaFitter: React.FC<{
  file: File;
  onDone: (out: FittedImage) => void;
  onCancel: () => void;
}> = ({ file, onDone, onCancel }) => {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<Mode>('fill');
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const el = new Image();
    el.onload = () => {
      setImg(el);
      // A landscape banner almost always wants Fit; a portrait photo wants Fill.
      setMode(el.naturalWidth > el.naturalHeight * 1.05 ? 'fit' : 'fill');
    };
    el.onerror = () => setError('This image could not be read. Try a JPG or PNG.');
    el.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !img) return;
    const ctx = c.getContext('2d');
    if (ctx) draw(ctx, img, PREVIEW_W, PREVIEW_H, mode, zoom, off.x, off.y);
  }, [img, mode, zoom, off]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: off.x, oy: off.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const clamp = (n: number) => Math.max(-1, Math.min(1, n));
    setOff({ x: clamp(d.ox + (e.clientX - d.x) / (PREVIEW_W / 2)), y: clamp(d.oy + (e.clientY - d.y) / (PREVIEW_H / 2)) });
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const exportImage = useCallback(async () => {
    if (!img) return;
    setBusy(true);
    try {
      const c = document.createElement('canvas');
      c.width = DROP_W;
      c.height = DROP_H;
      const ctx = c.getContext('2d');
      if (!ctx) throw new Error('Canvas is not available in this browser');
      draw(ctx, img, DROP_W, DROP_H, mode, zoom, off.x, off.y);
      let blob = await toBlob(c, 'image/webp', 0.86);
      let ext = 'webp';
      if (!blob || blob.type !== 'image/webp') {
        blob = await toBlob(c, 'image/jpeg', 0.88);
        ext = 'jpg';
      }
      if (!blob) throw new Error('Could not encode the image');
      const base = file.name.replace(/\.[a-z0-9]+$/i, '').slice(0, 60) || 'drop';
      onDone({ blob, url: URL.createObjectURL(blob), name: `${base}.${ext}` });
    } catch (e: any) {
      setError(e?.message || 'Could not prepare the image');
    } finally {
      setBusy(false);
    }
  }, [img, mode, zoom, off, file.name, onDone]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Fit image to the drop frame">
      <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-extrabold text-ink-soft">Fit image to the drop (9:16, 1080×1920)</h4>
          <button type="button" onClick={onCancel} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" aria-label="Cancel">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>
        ) : (
          <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="relative shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-gray-900" style={{ width: PREVIEW_W, height: PREVIEW_H }}>
              {!img && <Loader2 className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 animate-spin text-white" />}
              <canvas
                ref={canvasRef}
                width={PREVIEW_W}
                height={PREVIEW_H}
                className="cursor-grab touch-none active:cursor-grabbing"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              />
              {/* Where the headline sits on the real card — keep faces/text above it. */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] border-t-2 border-dashed border-white/60 bg-gradient-to-t from-black/60 to-transparent">
                <span className="absolute left-2 top-1 text-[11px] font-bold text-white/90">Headline area</span>
              </div>
            </div>

            <div className="w-full space-y-4">
              <div>
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-gray-500">Mode</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['fill', 'fit'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { setMode(m); setZoom(1); setOff({ x: 0, y: 0 }); }}
                      className={`rounded-xl px-3 py-2 text-xs font-bold ${mode === m ? 'bg-signal text-on-primary' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {m === 'fill' ? 'Fill (crop)' : 'Fit (whole image)'}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-gray-500">
                  {mode === 'fill' ? 'Covers the whole card. Drag to choose what stays in.' : 'Shows the full image over a blurred background — best for banners with text.'}
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500" htmlFor="drop-fit-zoom">
                  Zoom {zoom.toFixed(2)}×
                </label>
                <input id="drop-fit-zoom" type="range" min={mode === 'fit' ? 0.6 : 1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-signal" />
              </div>
              <p className="flex items-center gap-1.5 text-xs text-gray-500">
                <Move className="h-3.5 w-3.5" /> Drag the picture to reposition.
              </p>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onCancel} className="flex-1 rounded-xl bg-gray-100 px-3 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-200">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!img || busy}
                  onClick={exportImage}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-signal px-3 py-2.5 text-xs font-bold text-on-primary disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Use this
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DropMediaFitter;
