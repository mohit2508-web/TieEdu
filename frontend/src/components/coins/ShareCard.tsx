import React, { useRef, useState } from 'react';
import { Download, Share2, X } from 'lucide-react';

/**
 * A shareable streak card (TIE_COINS_STORE_PLAN.md §6.5): drawn as SVG with the TiEEdu logo,
 * downloaded as a PNG or shared via the phone's share sheet, WhatsApp or LinkedIn. It carries
 * no account link: only what the student chooses to post.
 */
const SITE = 'https://tieedu.in';
const W = 1080;
const H = 1080;

function CardSvg({ streak, best, badges, name }: { streak: number; best: number; badges: number; name: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${streak}-day streak on TiEEdu`}>
      <defs>
        <radialGradient id="sc-glow" cx="50%" cy="42%" r="45%"><stop offset="0" stopColor="#FFB547" stopOpacity=".55" /><stop offset="1" stopColor="#FFB547" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width={W} height={H} fill="#141210" />
      <circle cx={W / 2} cy={440} r={420} fill="url(#sc-glow)" />
      <image href="/logo.svg?v=3" x={340} y={70} width={400} height={257} />
      <path d="M540 360 C470 440 420 520 470 610 C500 665 580 680 620 640 C690 570 650 480 600 440 C610 500 590 530 565 540 C580 470 560 410 540 360 Z" fill="#F84109" />
      <text x={W / 2} y={790} textAnchor="middle" fontSize="150" fontWeight="800" fill="#FFF8EE" fontFamily="Poppins, Segoe UI, sans-serif">{streak}-day</text>
      <text x={W / 2} y={870} textAnchor="middle" fontSize="64" fontWeight="700" fill="#FFB547" fontFamily="Poppins, Segoe UI, sans-serif">coding streak</text>
      <text x={W / 2} y={950} textAnchor="middle" fontSize="36" fill="#B4A898" fontFamily="Mukta, Segoe UI, sans-serif">{name ? `${name} · ` : ''}best {best} day{best === 1 ? '' : 's'} · {badges} badge{badges === 1 ? '' : 's'}</text>
      <text x={W / 2} y={1030} textAnchor="middle" fontSize="32" fill="#9A9187" fontFamily="Mukta, Segoe UI, sans-serif">Practise daily on tieedu.in</text>
    </svg>
  );
}

async function toPng(svg: SVGSVGElement): Promise<Blob> {
  // Inline the logo so the exported image does not depend on the network.
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const img = clone.querySelector('image');
  if (img) {
    const txt = await fetch('/logo.svg?v=3').then((r) => r.text());
    img.setAttribute('href', `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(txt)))}`);
  }
  clone.setAttribute('width', String(W));
  clone.setAttribute('height', String(H));
  const data = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(new XMLSerializer().serializeToString(clone))))}`;
  const image = new Image();
  await new Promise<void>((res, rej) => { image.onload = () => res(); image.onerror = () => rej(new Error('Could not draw the card')); image.src = data; });
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  canvas.getContext('2d')!.drawImage(image, 0, 0, W, H);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Could not make the image'))), 'image/png'));
}

export const ShareCard: React.FC<{ streak: number; best: number; badges: number; name: string; onClose: () => void }> = ({ streak, best, badges, name, onClose }) => {
  const box = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState('');
  const text = `I am on a ${streak}-day coding streak on TiEEdu. Practising every day for placements. ${SITE}`;
  const blob = async () => toPng(box.current!.querySelector('svg')!);
  const download = async () => {
    try {
      const b = await blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = `tieedu-${streak}-day-streak.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) { setErr((e as Error).message); }
  };
  const share = async () => {
    try {
      const file = new File([await blob()], `tieedu-${streak}-day-streak.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text });
      else if (navigator.share) await navigator.share({ text, url: SITE });
      else await download();
    } catch { /* the student closed the share sheet */ }
  };
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4" role="dialog" aria-label="Share your streak" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-line bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-heading">Share your streak</p>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded p-1 text-muted hover:text-heading focus-ring"><X className="h-5 w-5" aria-hidden /></button>
        </div>
        <div ref={box} className="mt-3 overflow-hidden rounded-2xl"><CardSvg streak={streak} best={best} badges={badges} name={name} /></div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={share} className="btn btn-primary focus-ring inline-flex min-h-[44px] items-center justify-center gap-2"><Share2 className="h-4 w-4" aria-hidden /> Share</button>
          <button type="button" onClick={download} className="btn btn-secondary focus-ring inline-flex min-h-[44px] items-center justify-center gap-2"><Download className="h-4 w-4" aria-hidden /> Download</button>
          <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary focus-ring inline-flex min-h-[44px] items-center justify-center">WhatsApp</a>
          <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${SITE}/rewards`)}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary focus-ring inline-flex min-h-[44px] items-center justify-center">LinkedIn</a>
        </div>
        {err && <p role="alert" className="mt-2 text-body-md text-danger">{err}</p>}
        <p className="mt-3 text-sm text-muted">Only what is on the card is shared. Your account stays private.</p>
      </div>
    </div>
  );
};
