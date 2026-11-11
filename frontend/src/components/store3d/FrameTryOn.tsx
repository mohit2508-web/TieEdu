import React, { useEffect, useRef, useState } from 'react';
import { Upload, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Try a profile frame on your own photo (STORE_3D_SHOWCASE_AND_SPEED_PLAN.md §B4).
 * The photo never leaves the browser: it is read into an object URL, shown, and
 * released when the dialog closes. Nothing is uploaded or stored.
 */
export type Metal = 'bronze' | 'silver' | 'gold';
const METAL: Record<Metal, { ring: string; glow: string; label: string }> = {
  bronze: { ring: 'conic-gradient(from 210deg, #7a4a24, #d9965b, #8c5a2e, #f0b47a, #7a4a24, #c98a52, #7a4a24)', glow: 'rgba(201,138,82,0.45)', label: 'Bronze' },
  silver: { ring: 'conic-gradient(from 210deg, #8d939b, #f4f6f8, #a8aeb6, #ffffff, #8d939b, #d5d9de, #8d939b)', glow: 'rgba(200,206,214,0.55)', label: 'Silver' },
  gold: { ring: 'conic-gradient(from 210deg, #9a6b12, #ffd76a, #b8861c, #fff1b8, #9a6b12, #f2c14e, #9a6b12)', glow: 'rgba(242,193,78,0.55)', label: 'Gold' },
};

/** A photo or initials inside a metal ring with a slow light sweep. */
export function FramedAvatar({ metal, photo, initials, size = 160 }: { metal: Metal; photo: string | null; initials: string; size?: number }) {
  const m = METAL[metal];
  const ring = Math.max(4, Math.round(size * 0.075));
  return (
    <span className="relative inline-grid place-items-center rounded-full" style={{ width: size, height: size, background: m.ring, boxShadow: `0 ${size * 0.06}px ${size * 0.25}px ${m.glow}` }}>
      <span className="frame-sweep pointer-events-none absolute inset-0 rounded-full" aria-hidden />
      <span className="relative grid place-items-center overflow-hidden rounded-full bg-surface-hover" style={{ width: size - ring * 2, height: size - ring * 2 }}>
        {photo
          ? /* eslint-disable-next-line @next/next/no-img-element -- a photo from this device (object URL) */
            <img src={photo} alt="" className="h-full w-full object-cover" />
          : <span className="font-display font-bold text-heading" style={{ fontSize: size * 0.3 }}>{initials}</span>}
      </span>
    </span>
  );
}

export function FrameTryOn({ initial, userName }: { initial: Metal; userName?: string | null }) {
  const [metal, setMetal] = useState<Metal>(initial);
  const [photo, setPhoto] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const initials = (userName || 'You').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo); }, [photo]);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith('image/')) return;
    setPhoto((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(f); });
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 p-5">
      <FramedAvatar metal={metal} photo={photo} initials={initials} size={200} />
      {/* How it looks where people see it: a leaderboard row. */}
      <div className="flex w-full max-w-xs items-center gap-3 rounded-xl border border-line bg-card px-3 py-2 shadow-sm">
        <span className="w-5 text-center text-sm font-bold text-muted">3</span>
        <FramedAvatar metal={metal} photo={photo} initials={initials} size={40} />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-heading">{userName || 'You'}</span>
        <span className="text-sm font-bold tabular-nums text-heading">2,140</span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2" role="radiogroup" aria-label="Frame">
        {(Object.keys(METAL) as Metal[]).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={metal === k} onClick={() => setMetal(k)}
            className={cn('inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm font-semibold focus-ring', metal === k ? 'border-signal bg-signal-soft text-signal-ink' : 'border-line text-heading')}>
            <span className="h-4 w-4 rounded-full" style={{ background: METAL[k].ring }} aria-hidden /> {METAL[k].label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={() => input.current?.click()} className="btn btn-secondary focus-ring inline-flex min-h-[40px] items-center gap-2 px-4">
          <Upload className="h-4 w-4" aria-hidden /> {photo ? 'Try another photo' : 'Try it with your photo'}
        </button>
        {photo && <button type="button" onClick={() => setPhoto(null)} className="inline-flex min-h-[40px] items-center gap-1 px-2 text-sm font-semibold text-link"><RotateCcw className="h-4 w-4" aria-hidden /> Use initials</button>}
        <input ref={input} type="file" accept="image/*" className="sr-only" onChange={pick} aria-label="Choose a photo to preview" />
      </div>
      <p className="text-center text-xs text-muted">Your photo stays on this device. It is not uploaded.</p>
    </div>
  );
}
