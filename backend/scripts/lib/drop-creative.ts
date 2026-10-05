/**
 * Dependency-free drop creative generator.
 *
 * A drop's image is a real uploaded file (`uploads/drops/drop-<ts>-<rand>.png`,
 * served by GET /api/drops/file/:storedName), not a URL — so seeding a feed
 * without also writing files would leave every card on the imageless fallback
 * gradient. Rather than depend on remote stock hosts (which break offline, in
 * CI, and behind a campus firewall) this module paints the PNG itself with
 * zlib + a hand-rolled encoder: no new dependency, byte-identical output on
 * every machine, and the file lands wherever the seed runs — laptop or server.
 *
 * Composition is centre-weighted on purpose: the card renders the creative with
 * `object-fit: cover` at a height that varies with the text block, so anything
 * anchored to an edge would be cropped away on a phone.
 *
 * The stored name is derived from the drop id (not Date.now()) so re-running
 * the seed overwrites the same file instead of orphaning a new one each time.
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import type { DropType } from '../../src/data/db';

const W = 900;
const H = 472;

type Rgb = [number, number, number];

export const DROP_CREATIVE_DIR = path.join(__dirname, '../../uploads/drops');

const PALETTE: Record<DropType, { from: Rgb; to: Rgb; accent: Rgb; label: string }> = {
  company: { from: [10, 42, 94], to: [27, 106, 201], accent: [95, 208, 255], label: 'HIRING' },
  job: { from: [6, 40, 63], to: [14, 116, 144], accent: [103, 232, 249], label: 'JOB OPENING' },
  deadline: { from: [74, 14, 14], to: [185, 28, 28], accent: [252, 165, 165], label: 'DEADLINE' },
  course: { from: [15, 61, 46], to: [21, 128, 61], accent: [134, 239, 172], label: 'NEW COURSE' },
  skilltest: { from: [49, 46, 129], to: [79, 70, 229], accent: [199, 210, 254], label: 'SKILL TEST' },
  selected: { from: [59, 7, 100], to: [126, 34, 206], accent: [233, 213, 255], label: 'SELECTED' },
  tip: { from: [66, 32, 6], to: [180, 83, 9], accent: [253, 230, 138], label: 'TIP' },
  tieedu: { from: [80, 7, 36], to: [190, 24, 93], accent: [251, 207, 232], label: 'TIEEDU' },
  contest: { from: [30, 27, 75], to: [67, 56, 202], accent: [165, 180, 252], label: 'CONTEST' },
  college: { from: [12, 74, 110], to: [3, 105, 161], accent: [186, 230, 253], label: 'CAMPUS' },
  scholarship: { from: [113, 63, 18], to: [202, 138, 4], accent: [254, 240, 138], label: 'SCHOLARSHIP' },
  vault: { from: [17, 24, 39], to: [75, 85, 99], accent: [209, 213, 219], label: 'VAULT' },
};

/** 5x7 bitmap font, rows separated by '/'. Only the glyphs the labels need. */
const FONT: Record<string, string> = {
  A: '01110/10001/10001/11111/10001/10001/10001',
  B: '11110/10001/10001/11110/10001/10001/11110',
  C: '01111/10000/10000/10000/10000/10000/01111',
  D: '11110/10001/10001/10001/10001/10001/11110',
  E: '11111/10000/10000/11110/10000/10000/11111',
  F: '11111/10000/10000/11110/10000/10000/10000',
  G: '01110/10001/10000/10111/10001/10001/01111',
  H: '10001/10001/10001/11111/10001/10001/10001',
  I: '11111/00100/00100/00100/00100/00100/11111',
  J: '00111/00010/00010/00010/00010/10010/01100',
  K: '10001/10010/10100/11000/10100/10010/10001',
  L: '10000/10000/10000/10000/10000/10000/11111',
  M: '10001/11011/10101/10101/10001/10001/10001',
  N: '10001/11001/10101/10011/10001/10001/10001',
  O: '01110/10001/10001/10001/10001/10001/01110',
  P: '11110/10001/10001/11110/10000/10000/10000',
  Q: '01110/10001/10001/10001/10101/10010/01101',
  R: '11110/10001/10001/11110/10100/10010/10001',
  S: '01111/10000/10000/01110/00001/00001/11110',
  T: '11111/00100/00100/00100/00100/00100/00100',
  U: '10001/10001/10001/10001/10001/10001/01110',
  V: '10001/10001/10001/10001/10001/01010/00100',
  W: '10001/10001/10001/10101/10101/11011/10001',
  X: '10001/10001/01010/00100/01010/10001/10001',
  Y: '10001/10001/01010/00100/00100/00100/00100',
  Z: '11111/00001/00010/00100/01000/10000/11111',
  ' ': '00000/00000/00000/00000/00000/00000/00000',
};

function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);

function hexToRgb(hex: string): Rgb {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

class Canvas {
  readonly px = Buffer.alloc(W * H * 3);

  blend(x: number, y: number, rgb: Rgb, alpha: number): void {
    if (x < 0 || y < 0 || x >= W || y >= H || alpha <= 0) return;
    const i = (y * W + x) * 3;
    const a = alpha > 1 ? 1 : alpha;
    this.px[i] = clamp255(mix(this.px[i], rgb[0], a));
    this.px[i + 1] = clamp255(mix(this.px[i + 1], rgb[1], a));
    this.px[i + 2] = clamp255(mix(this.px[i + 2], rgb[2], a));
  }

  rect(x: number, y: number, w: number, h: number, rgb: Rgb, alpha = 1): void {
    for (let dy = 0; dy < h; dy += 1) for (let dx = 0; dx < w; dx += 1) this.blend(x + dx, y + dy, rgb, alpha);
  }

  /** Text centred on cx, with its cap-height block starting at top. */
  text(label: string, cx: number, top: number, scale: number, rgb: Rgb, alpha = 1): number {
    const glyphW = 5 * scale;
    const gap = scale;
    const width = label.length * glyphW + (label.length - 1) * gap;
    let x = Math.round(cx - width / 2);
    for (const ch of label.toUpperCase()) {
      const rows = (FONT[ch] || FONT[' ']).split('/');
      for (let ry = 0; ry < rows.length; ry += 1) {
        for (let rx = 0; rx < rows[ry].length; rx += 1) {
          if (rows[ry][rx] !== '1') continue;
          this.rect(x + rx * scale, top + ry * scale, scale, scale, rgb, alpha);
        }
      }
      x += glyphW + gap;
    }
    return width;
  }
}

function paintBackground(c: Canvas, p: { from: Rgb; to: Rgb; accent: Rgb }, rnd: () => number): void {
  const angle = 0.35 + rnd() * 0.5;
  const glowX = W * (0.3 + rnd() * 0.4);
  const glowY = H * (0.25 + rnd() * 0.5);
  const glowR = H * (0.55 + rnd() * 0.35);
  const ringCount = 3 + Math.floor(rnd() * 3);
  const ringGap = 34 + rnd() * 26;

  // Gradients are posterised before they hit the buffer: a continuous ramp
  // gives every neighbouring pixel its own byte value, and deflate cannot
  // squeeze that. Quantising costs a little banding at 2x and saves ~4x bytes.
  const step = 1 / 40;
  const q = (v: number) => Math.round(v / step) * step;

  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const t = q(Math.min(1, Math.max(0, (x / W) * angle + (y / H) * (1 - angle))));
      const base: Rgb = [mix(p.from[0], p.to[0], t), mix(p.from[1], p.to[1], t), mix(p.from[2], p.to[2], t)];
      c.blend(x, y, base, 1);

      const d = Math.hypot(x - glowX, y - glowY);
      if (d < glowR) c.blend(x, y, p.accent, q(0.3 * (1 - d / glowR) ** 2) * 1.4);

      for (let r = 0; r < ringCount; r += 1) {
        const rr = glowR * 0.55 + r * ringGap;
        const band = Math.abs(d - rr);
        if (band < 1.6) c.blend(x, y, p.accent, q(0.16 * (1 - band / 1.6)) * 1.4);
      }
    }
  }

  const barW = 108;
  c.rect(Math.round(W / 2 - barW / 2), Math.round(H * 0.3), barW, 6, p.accent, 0.95);
  c.rect(0, H - 8, W, 8, p.accent, 0.55);
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/**
 * Filter each scanline with all five PNG filters and keep the one with the
 * smallest sum of absolute residuals — the heuristic the PNG spec recommends.
 * Flat art is mostly flat runs, and picking the right filter per row is worth
 * more than any other single change to the encoder.
 */
function filterRows(px: Buffer): Buffer {
  const stride = W * 3;
  const out = Buffer.alloc(H * (stride + 1));
  const candidates = [Buffer.alloc(stride), Buffer.alloc(stride), Buffer.alloc(stride), Buffer.alloc(stride), Buffer.alloc(stride)];

  for (let y = 0; y < H; y += 1) {
    const row = y * stride;
    const prev = row - stride;
    for (let i = 0; i < stride; i += 1) {
      const cur = px[row + i];
      const left = i >= 3 ? px[row + i - 3] : 0;
      const up = y > 0 ? px[prev + i] : 0;
      const upLeft = y > 0 && i >= 3 ? px[prev + i - 3] : 0;
      candidates[0][i] = cur;
      candidates[1][i] = (cur - left) & 0xff;
      candidates[2][i] = (cur - up) & 0xff;
      candidates[3][i] = (cur - ((left + up) >> 1)) & 0xff;
      candidates[4][i] = (cur - paeth(left, up, upLeft)) & 0xff;
    }

    let best = 0;
    let bestScore = Infinity;
    for (let f = 0; f < 5; f += 1) {
      let score = 0;
      for (let i = 0; i < stride; i += 1) {
        const v = candidates[f][i];
        score += v < 128 ? v : 256 - v;
      }
      if (score < bestScore) {
        bestScore = score;
        best = f;
      }
    }

    const dst = y * (stride + 1);
    out[dst] = best;
    candidates[best].copy(out, dst + 1);
  }
  return out;
}

function encodePng(c: Canvas): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(filterRows(c.px), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * A file name that satisfies the route's STORED_NAME_RE and is stable for a
 * given drop id, so a re-run rewrites the creative instead of leaking files.
 */
export function creativeStoredName(seedId: string): string {
  const h = fnv1a(seedId);
  const digits = 1_000_000_000 + (h % 9_000_000_000);
  const suffix = (h % 1_679_616).toString(36).padStart(4, '0');
  return `drop-${digits}-${suffix}.png`;
}

/** Paint and write the creative for one drop. Returns the stored file name. */
export function writeDropCreative(opts: { seedId: string; type: DropType }): string {
  const theme = PALETTE[opts.type] || PALETTE.vault;
  const rnd = mulberry32(fnv1a(`${opts.seedId}:${opts.type}`));
  const canvas = new Canvas();
  paintBackground(canvas, { from: theme.from, to: theme.to, accent: theme.accent }, rnd);

  const scale = theme.label.length > 8 ? 9 : 12;
  const blockH = 7 * scale;
  const top = Math.round((H - blockH) / 2 - 26);
  canvas.text(theme.label, Math.round(W / 2), top + 5, scale, [8, 12, 18], 0.28);
  canvas.text(theme.label, Math.round(W / 2), top, scale, [255, 255, 255], 1);

  canvas.rect(Math.round(W / 2 - 44), top + blockH + 26, 88, 4, theme.accent, 0.9);
  canvas.text('TIEEDU', Math.round(W / 2), top + blockH + 46, 4, theme.accent, 0.85);

  fs.mkdirSync(DROP_CREATIVE_DIR, { recursive: true });
  const storedName = creativeStoredName(opts.seedId);
  fs.writeFileSync(path.join(DROP_CREATIVE_DIR, storedName), encodePng(canvas));
  return storedName;
}

export const CREATIVE_SIZE = { width: W, height: H };