/**
 * Share cards — brand-styled images a student can post (UI_REDESIGN_PLAN_V2 §6.3).
 *
 * Drawn on a canvas in the browser, in the site's own fonts, so there is no
 * image service to run and nothing leaves the device until the student posts
 * it. Two sizes: 1200×627 (LinkedIn, X) and 1080×1350 (Instagram portrait).
 *
 * The card states one result and the address where anyone can check it — the
 * same "every number can be verified" rule as the rest of the product.
 */

export type ShareFormat = 'landscape' | 'portrait';

export interface ShareCardInput {
  /** Small line above the headline, e.g. "Placement Passport". */
  eyebrow: string;
  /** The person, or the achievement. */
  headline: string;
  /** One big number with its label, e.g. 80% / "DSA skill test". */
  stat?: { value: string; label: string };
  /** Up to three short supporting lines. */
  lines?: string[];
  /** Where to verify — shown at the bottom, without the protocol. */
  url: string;
}

const SIZE: Record<ShareFormat, { w: number; h: number }> = {
  landscape: { w: 1200, h: 627 },
  portrait: { w: 1080, h: 1350 },
};

const INK = '#0E2A44';
const LOGO = '#F84109';
const MONEY = '#E8A33D';

/** The family name next/font registered, read from the CSS variable the app sets. */
function family(varName: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return v ? `${v}, ${fallback}` : fallback;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !line) line = next;
    else {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.join(' ') !== lines.join(' ')) {
    let last = lines[maxLines - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

export async function renderShareCard(input: ShareCardInput, format: ShareFormat): Promise<Blob> {
  const { w, h } = SIZE[format];
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser.');

  const display = family('--font-display', 'Georgia, serif');
  const body = family('--font-body', 'system-ui, sans-serif');
  // Fonts load lazily; drawing before they are ready falls back silently.
  if (document.fonts?.ready) await document.fonts.ready;

  const pad = format === 'landscape' ? 72 : 88;
  const scale = format === 'landscape' ? 1 : 1.25;

  // Ground: ink, a faint route line across it, the logo-orange edge.
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 3;
  const routeY = h - pad - 96 * scale;
  ctx.beginPath();
  ctx.moveTo(pad, routeY);
  ctx.lineTo(w - pad, routeY);
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const x = pad + ((w - 2 * pad) / 3) * i;
    ctx.beginPath();
    ctx.arc(x, routeY, 9, 0, Math.PI * 2);
    ctx.fillStyle = i === 3 ? MONEY : 'rgba(255,255,255,0.18)';
    ctx.fill();
  }
  ctx.fillStyle = LOGO;
  ctx.fillRect(0, 0, 14, h);

  // Wordmark.
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `700 ${34 * scale}px ${display}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('TieEdu', pad, pad + 30 * scale);

  // Eyebrow.
  // Portrait has room to spare: start the text lower so the card is not top-heavy.
  let y = format === 'portrait' ? pad + 330 : pad + 110 * scale;
  ctx.fillStyle = MONEY;
  ctx.font = `700 ${22 * scale}px ${body}`;
  ctx.fillText(input.eyebrow.toUpperCase(), pad, y);

  // Headline.
  y += 64 * scale;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `700 ${format === 'landscape' ? 56 : 72}px ${display}`;
  const headWidth = input.stat && format === 'landscape' ? w * 0.56 : w - 2 * pad;
  for (const line of wrap(ctx, input.headline, headWidth, 2)) {
    ctx.fillText(line, pad, y);
    y += (format === 'landscape' ? 64 : 84);
  }

  // Supporting lines.
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.font = `500 ${26 * scale}px ${body}`;
  for (const line of (input.lines || []).slice(0, 3)) {
    y += 6;
    for (const l of wrap(ctx, line, headWidth, 1)) ctx.fillText(l, pad, y);
    y += 40 * scale;
  }

  // The stat: right column on landscape, below the text on portrait.
  if (input.stat) {
    const sx = format === 'landscape' ? w - pad : pad;
    const sy = format === 'landscape' ? pad + 250 : y + 140;
    ctx.textAlign = format === 'landscape' ? 'right' : 'left';
    ctx.fillStyle = MONEY;
    ctx.font = `700 ${(format === 'landscape' ? 150 : 190)}px ${display}`;
    ctx.fillText(input.stat.value, sx, sy);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `600 ${26 * scale}px ${body}`;
    ctx.fillText(input.stat.label, sx, sy + 48 * scale);
    ctx.textAlign = 'left';
  }

  // Where to verify.
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `500 ${22 * scale}px ${body}`;
  ctx.fillText(`Verify at ${input.url.replace(/^https?:\/\//, '')}`, pad, h - pad + 6);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create the image.'))), 'image/png')
  );
}

/** Render and hand the PNG to the browser's download. */
export async function downloadShareCard(input: ShareCardInput, format: ShareFormat, fileName: string): Promise<void> {
  const blob = await renderShareCard(input, format);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** LinkedIn's share dialog for a URL (LinkedIn reads the page's own title and description). */
export const linkedInShareUrl = (url: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
