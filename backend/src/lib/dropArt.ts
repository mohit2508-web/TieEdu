/**
 * Animated drop creatives.
 *
 * A drop with no uploaded image still needs to look like a poster, not a flat
 * gradient. This draws a 1080x1920 (9:16, the card's own shape) SVG per drop:
 * a preset scene (diyas, fireworks, a countdown ring, a terminal…) plus the
 * drop's big poster words (`art_text`, `art_sub`). The motion is CSS inside
 * the SVG, which browsers run even when the file is shown through an <img>, so
 * the feed gets animated art with no script and no extra request.
 *
 * Layout rule: everything that matters sits between y≈240 and y≈1000. The
 * card crops the top/bottom on wide frames (object-fit: cover) and paints its
 * headline over the lower half, so the scene lives in the upper half.
 *
 * Pure: (drop fields) → string. Text is escaped; nothing from the drop is
 * ever placed in an attribute without escaping.
 */

export const ART_W = 1080;
export const ART_H = 1920;

export interface DropArtInput {
  id?: string;
  type?: string;
  art?: string;
  art_text?: string;
  art_sub?: string;
  headline?: string;
  target_slug?: string;
}

const esc = (s: string) =>
  String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/** Small deterministic PRNG so a drop's stars sit in the same place every load. */
const rng = (seedText: string) => {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) h = Math.imul(h ^ seedText.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
};

/** Default scene per drop type when the admin leaves art on "auto". */
const AUTO_ART: Record<string, string> = {
  company: 'company',
  job: 'hiring',
  deadline: 'countdown',
  vault: 'shield',
  skilltest: 'chart',
  course: 'book',
  contest: 'trophy',
  selected: 'trophy',
  scholarship: 'certificate',
  college: 'calendar',
  tip: 'stars',
  tieedu: 'rocket',
  quiz: 'stars',
};

interface Palette {
  bg: [string, string, string];
  accent: string;
  accent2: string;
  ink: string;
}

const PALETTES: Record<string, Palette> = {
  diwali: { bg: ['#2A0612', '#5C0F24', '#8A2A12'], accent: '#FFC845', accent2: '#FF7A1A', ink: '#FFF4D6' },
  'diwali-sale': { bg: ['#3A0716', '#7A1530', '#B8590B'], accent: '#FFD966', accent2: '#FF9F1C', ink: '#FFF8E1' },
  fireworks: { bg: ['#05081C', '#141B4D', '#2A1A5E'], accent: '#FFD166', accent2: '#FF5DA2', ink: '#FFFFFF' },
  gift: { bg: ['#3B0A3F', '#8E1A6B', '#D6246E'], accent: '#FFD966', accent2: '#7CF2C8', ink: '#FFFFFF' },
  hiring: { bg: ['#061A3A', '#0B3D91', '#1B6AC9'], accent: '#5FD0FF', accent2: '#FFD166', ink: '#FFFFFF' },
  company: { bg: ['#07122B', '#123A73', '#0E6B8C'], accent: '#7DD3FC', accent2: '#A7F3D0', ink: '#FFFFFF' },
  countdown: { bg: ['#2B0707', '#7A1B12', '#C1442D'], accent: '#FFB4A2', accent2: '#FFD166', ink: '#FFFFFF' },
  trophy: { bg: ['#06261A', '#0F4A2B', '#15803D'], accent: '#FFD24A', accent2: '#FFF1A8', ink: '#FFFFFF' },
  code: { bg: ['#05070D', '#0D1424', '#132238'], accent: '#4ADE80', accent2: '#60A5FA', ink: '#E5F2FF' },
  ai: { bg: ['#12052E', '#3B1C7A', '#6D28D9'], accent: '#C4B5FD', accent2: '#67E8F9', ink: '#FFFFFF' },
  book: { bg: ['#2A1403', '#7A3B07', '#B45309'], accent: '#FDE68A', accent2: '#FFFFFF', ink: '#FFF7E6' },
  mic: { bg: ['#03211E', '#0B4F4A', '#0E7C66'], accent: '#99F6E4', accent2: '#FDE68A', ink: '#FFFFFF' },
  shield: { bg: ['#0B0F1A', '#1F2A44', '#4F46E5'], accent: '#A5B4FC', accent2: '#86EFAC', ink: '#FFFFFF' },
  chart: { bg: ['#041F14', '#0E5A3A', '#16A34A'], accent: '#BBF7D0', accent2: '#FDE047', ink: '#FFFFFF' },
  rocket: { bg: ['#060B26', '#1E1B6B', '#4338CA'], accent: '#FDBA74', accent2: '#93C5FD', ink: '#FFFFFF' },
  calendar: { bg: ['#1A0B3B', '#4C1D95', '#6D28D9'], accent: '#F0ABFC', accent2: '#FDE68A', ink: '#FFFFFF' },
  certificate: { bg: ['#03222E', '#0B4A5E', '#0277B6'], accent: '#FDE68A', accent2: '#BAE6FD', ink: '#FFFFFF' },
  stars: { bg: ['#120A02', '#4A2A06', '#A16207'], accent: '#FEF08A', accent2: '#FFFFFF', ink: '#FFFFFF' },
};

const COMPANY_VARIANTS: Palette[] = [
  PALETTES.company,
  { bg: ['#120A2E', '#33206E', '#5B3CC4'], accent: '#C4B5FD', accent2: '#F9A8D4', ink: '#FFFFFF' },
  { bg: ['#03201A', '#0B4F3F', '#0F8A6A'], accent: '#6EE7B7', accent2: '#FDE68A', ink: '#FFFFFF' },
  { bg: ['#2A0710', '#6B1228', '#B91C3C'], accent: '#FDA4AF', accent2: '#FDE68A', ink: '#FFFFFF' },
  { bg: ['#1F1303', '#5C3A06', '#B7791F'], accent: '#FDE68A', accent2: '#FFFFFF', ink: '#FFFFFF' },
  { bg: ['#0A1420', '#1E3A5F', '#0E7490'], accent: '#67E8F9', accent2: '#BEF264', ink: '#FFFFFF' },
];

/**
 * Lite mode: the same poster with every animation off. Elements that only
 * exist mid-animation (firework bursts) are shown at their resting state so the
 * still frame is not missing pieces.
 */
const STILL_CSS = `*{animation:none!important}.burst{opacity:.9;transform:scale(1)}.rise{opacity:0}`;

/** Shared keyframes. `fill-box` makes every transform pivot on the shape itself. */
const BASE_CSS = `
.p{transform-box:fill-box;transform-origin:center}
.tw{animation:tw 2.4s ease-in-out infinite}
@keyframes tw{0%,100%{opacity:.25}50%{opacity:1}}
.blob{animation:blob 9s ease-in-out infinite alternate}
@keyframes blob{from{transform:translate(0,0) scale(1)}to{transform:translate(60px,40px) scale(1.15)}}
.spin{animation:spin 40s linear infinite}
.spinr{animation:spin 28s linear infinite reverse}
@keyframes spin{to{transform:rotate(360deg)}}
.bob{animation:bob 3.2s ease-in-out infinite}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-28px)}}
.pulse{animation:pulse 2.2s ease-in-out infinite}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
.ring{animation:ring 2.6s ease-out infinite}
@keyframes ring{from{transform:scale(.6);opacity:.9}to{transform:scale(1.9);opacity:0}}
.flick{animation:flick .9s ease-in-out infinite alternate}
@keyframes flick{0%{transform:scale(1,1) skewX(0)}50%{transform:scale(.92,1.08) skewX(3deg)}100%{transform:scale(1.04,.95) skewX(-3deg)}}
.swing{transform-origin:50% 0;animation:swing 3.4s ease-in-out infinite alternate}
@keyframes swing{from{transform:rotate(-6deg)}to{transform:rotate(6deg)}}
.burst{animation:burst 2.8s ease-out infinite;opacity:0}
@keyframes burst{0%{transform:scale(.1);opacity:0}12%{opacity:1}70%{opacity:.9}100%{transform:scale(1.25);opacity:0}}
.fall{animation:fall 4.5s linear infinite}
@keyframes fall{from{transform:translateY(-220px) rotate(0)}to{transform:translateY(1150px) rotate(540deg)}}
.rise{animation:rise 7s linear infinite}
@keyframes rise{from{transform:translateY(160px);opacity:0}15%{opacity:.9}to{transform:translateY(-900px);opacity:0}}
.grow{animation:grow 2.8s cubic-bezier(.2,.8,.2,1) infinite alternate}
@keyframes grow{from{transform:scaleY(.15)}to{transform:scaleY(1)}}
.type{animation:type 3.6s steps(28) infinite}
@keyframes type{0%{transform:scaleX(0)}60%,100%{transform:scaleX(1)}}
.blink{animation:blink 1s steps(1) infinite}
@keyframes blink{50%{opacity:0}}
.sweep{animation:sweep 5s linear infinite}
@keyframes sweep{from{stroke-dashoffset:0}to{stroke-dashoffset:-1884}}
.shine{animation:shine 3.5s ease-in-out infinite}
@keyframes shine{0%{transform:translateX(-700px) skewX(-20deg)}60%,100%{transform:translateX(900px) skewX(-20deg)}}
.flap{animation:flap 2.4s ease-in-out infinite alternate}
@keyframes flap{from{transform:scaleX(1)}to{transform:scaleX(.2)}}
.scan{animation:scan 3s ease-in-out infinite alternate}
@keyframes scan{from{transform:translateY(-170px)}to{transform:translateY(170px)}}
.dash{stroke-dasharray:14 22;animation:dash 1.6s linear infinite}
@keyframes dash{to{stroke-dashoffset:-72}}
.glow{animation:glow 2.8s ease-in-out infinite}
@keyframes glow{0%,100%{opacity:.55}50%{opacity:1}}
.txt{animation:txt 1s cubic-bezier(.2,.9,.25,1.25) both}
@keyframes txt{from{transform:translateY(60px) scale(.9);opacity:0}to{transform:none;opacity:1}}
.sub{animation:txt 1s .25s cubic-bezier(.2,.9,.25,1.25) both}
.shimmer{animation:shim 4s linear infinite}
@keyframes shim{from{transform:translateX(-1080px)}to{transform:translateX(1080px)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
`;

const starsLayer = (r: () => number, n: number, color: string, yMax = 1150) =>
  Array.from({ length: n }, () => {
    const x = Math.round(r() * ART_W);
    const y = Math.round(r() * yMax);
    const s = (1.5 + r() * 4).toFixed(1);
    const d = (r() * 2.4).toFixed(2);
    return `<circle class="tw" style="animation-delay:${d}s" cx="${x}" cy="${y}" r="${s}" fill="${color}"/>`;
  }).join('');

/** A diya: clay bowl + flickering flame + glow. */
const diya = (cx: number, cy: number, scale: number, delay: string) => `
<g transform="translate(${cx} ${cy}) scale(${scale})">
  <circle cx="0" cy="-70" r="90" fill="url(#flameGlow)" class="glow" style="animation-delay:${delay}"/>
  <path class="p flick" style="animation-delay:${delay}" d="M0 -130 C 26 -92 30 -62 0 -40 C -30 -62 -26 -92 0 -130 Z" fill="url(#flame)"/>
  <path d="M-110 -40 Q 0 -30 110 -40 Q 92 40 0 46 Q -92 40 -110 -40 Z" fill="#C2410C"/>
  <path d="M-110 -40 Q 0 -30 110 -40 Q 0 -14 -110 -40 Z" fill="#7C2D12"/>
  <path d="M-70 8 Q 0 22 70 8" stroke="#FDBA74" stroke-width="6" fill="none" stroke-linecap="round" opacity=".8"/>
</g>`;

const lantern = (cx: number, len: number, color: string, delay: string) => `
<g class="swing" style="animation-delay:${delay};transform-origin:${cx}px 0px">
  <line x1="${cx}" y1="0" x2="${cx}" y2="${len}" stroke="#FCD34D" stroke-width="3" opacity=".7"/>
  <g transform="translate(${cx} ${len})">
    <path d="M0 0 L 60 70 L 0 150 L -60 70 Z" fill="${color}"/>
    <path d="M0 0 L 60 70 L 0 150 L -60 70 Z" fill="url(#lanternShade)"/>
    <circle cx="0" cy="72" r="20" fill="#FFF3B0" class="glow" style="animation-delay:${delay}"/>
    <path d="M-30 150 L -36 210 M0 150 L 0 222 M30 150 L 36 210" stroke="${color}" stroke-width="5"/>
  </g>
</g>`;

const firework = (cx: number, cy: number, r: number, color: string, delay: string, rays = 16) => {
  const lines = Array.from({ length: rays }, (_, i) => {
    const a = (i / rays) * Math.PI * 2;
    const x1 = Math.cos(a) * r * 0.25;
    const y1 = Math.sin(a) * r * 0.25;
    const x2 = Math.cos(a) * r;
    const y2 = Math.sin(a) * r;
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="7" stroke-linecap="round"/><circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="8" fill="#fff"/>`;
  }).join('');
  return `<g transform="translate(${cx} ${cy})"><g class="p burst" style="animation-delay:${delay}">${lines}</g></g>`;
};

const confetti = (r: () => number, n: number, colors: string[]) =>
  Array.from({ length: n }, () => {
    const x = Math.round(r() * ART_W);
    const w = 14 + Math.round(r() * 16);
    const c = colors[Math.floor(r() * colors.length)];
    const d = (r() * 4.5).toFixed(2);
    const dur = (3.6 + r() * 2.5).toFixed(2);
    return `<rect class="p fall" style="animation-delay:-${d}s;animation-duration:${dur}s" x="${x}" y="0" width="${w}" height="${Math.round(w * 0.5)}" rx="3" fill="${c}"/>`;
  }).join('');

const rays = (cx: number, cy: number, color: string) =>
  `<g transform="translate(${cx} ${cy})"><g class="p spin">${Array.from({ length: 18 }, (_, i) =>
    `<path d="M0 0 L ${(Math.cos((i / 18) * Math.PI * 2 - 0.08) * 1400).toFixed(0)} ${(Math.sin((i / 18) * Math.PI * 2 - 0.08) * 1400).toFixed(0)} L ${(Math.cos((i / 18) * Math.PI * 2 + 0.08) * 1400).toFixed(0)} ${(Math.sin((i / 18) * Math.PI * 2 + 0.08) * 1400).toFixed(0)} Z" fill="${color}"/>`
  ).join('')}</g></g>`;

/** Scenes: each returns the illustration for the upper half of the frame. */
const SCENES: Record<string, (p: Palette, r: () => number, hasText: boolean) => string> = {
  diwali: (p, r) => `
    ${starsLayer(r, 60, '#FFE9A8', 900)}
    ${lantern(170, 140, '#E11D48', '0s')}${lantern(910, 200, '#F59E0B', '-1.3s')}
    <g transform="translate(540 560)"><g class="p spin" opacity=".35">${Array.from({ length: 12 }, (_, i) =>
      `<ellipse cx="0" cy="-170" rx="44" ry="120" fill="${i % 2 ? p.accent : p.accent2}" transform="rotate(${i * 30})"/>`).join('')}
      <circle r="80" fill="${p.accent}"/></g></g>
    ${diya(330, 820, 0.8, '0s')}${diya(540, 850, 1.05, '-.4s')}${diya(750, 820, 0.8, '-.7s')}`,
  'diwali-sale': (p, r) => `
    ${rays(540, 600, 'rgba(255,217,102,.07)')}
    ${starsLayer(r, 40, '#FFE9A8', 1100)}
    ${lantern(150, 120, '#E11D48', '0s')}${lantern(930, 150, '#F59E0B', '-1.6s')}
    ${firework(300, 400, 120, p.accent2, '0s')}${firework(800, 470, 100, p.accent, '-1.4s')}
    ${diya(300, 860, 0.8, '0s')}${diya(540, 880, 1.0, '-.3s')}${diya(780, 860, 0.8, '-.6s')}`,
  fireworks: (p, r) => `
    ${starsLayer(r, 90, '#FFFFFF', 1400)}
    ${firework(300, 360, 190, p.accent, '0s', 20)}${firework(780, 300, 160, p.accent2, '-0.9s', 18)}
    ${firework(560, 620, 220, '#7DD3FC', '-1.7s', 22)}${firework(220, 820, 130, '#A7F3D0', '-2.3s')}${firework(860, 860, 140, '#FDE68A', '-0.5s')}
    <path d="M0 1500 L 0 1320 L 120 1320 L 120 1250 L 220 1250 L 220 1360 L 360 1360 L 360 1200 L 470 1200 L 470 1330 L 620 1330 L 620 1180 L 760 1180 L 760 1300 L 900 1300 L 900 1230 L 1080 1230 L 1080 1500 Z" fill="#05081C" opacity=".85"/>`,
  gift: (p, r) => `
    ${confetti(r, 46, [p.accent, p.accent2, '#fff', '#FF7AB6', '#93C5FD'])}
    <g class="bob"><g transform="translate(540 700)">
      <circle r="330" fill="url(#halo)"/>
      <rect x="-210" y="-60" width="420" height="300" rx="22" fill="#F43F5E"/>
      <rect x="-240" y="-140" width="480" height="110" rx="20" fill="#FB7185"/>
      <rect x="-34" y="-140" width="68" height="380" fill="${p.accent}"/>
      <path class="p pulse" d="M0 -140 C -120 -300 -230 -170 -60 -140 Z M0 -140 C 120 -300 230 -170 60 -140 Z" fill="${p.accent}"/>
    </g></g>`,
  hiring: (p, r) => `
    ${starsLayer(r, 40, '#BFE6FF', 1100)}
    <g transform="translate(540 600)">
      <circle class="p ring" r="220" fill="none" stroke="${p.accent}" stroke-width="6"/>
      <circle class="p ring" style="animation-delay:-1.3s" r="220" fill="none" stroke="${p.accent}" stroke-width="6"/>
      <circle r="230" fill="url(#halo)"/>
      <g class="bob">
        <rect x="-190" y="-90" width="380" height="270" rx="34" fill="#fff"/>
        <rect x="-70" y="-150" width="140" height="80" rx="20" fill="none" stroke="#fff" stroke-width="22"/>
        <rect x="-190" y="-10" width="380" height="26" fill="${p.accent}" opacity=".55"/>
        <rect x="-36" y="-28" width="72" height="62" rx="12" fill="${p.accent2}"/>
      </g>
    </g>`,
  company: (p, r, hasText) => `
    ${starsLayer(r, 50, '#CFFAFE', 1150)}
    <g transform="translate(540 ${hasText ? 640 : 700})">
      <g class="p spin"><circle r="360" fill="none" stroke="${p.accent}" stroke-opacity=".35" stroke-width="3" stroke-dasharray="4 18"/>
        <circle cx="360" cy="0" r="16" fill="${p.accent}"/><circle cx="-254" cy="254" r="11" fill="${p.accent2}"/></g>
      <g class="p spinr"><circle r="270" fill="none" stroke="${p.accent2}" stroke-opacity=".35" stroke-width="3"/>
        <circle cx="0" cy="-270" r="13" fill="${p.accent2}"/><circle cx="190" cy="190" r="9" fill="#fff"/></g>
      <circle r="300" fill="url(#halo)"/>
      ${hasText ? '' : `<g class="p pulse"><rect x="-150" y="-150" width="300" height="300" rx="70" fill="#fff" opacity=".95"/><path d="M-70 60 V -40 H 0 V 60 M 0 60 V -90 H 70 V 60" stroke="${p.bg[1]}" stroke-width="22" fill="none" stroke-linejoin="round"/></g>`}
    </g>`,
  countdown: (p) => `
    <g transform="translate(540 640)">
      <circle r="330" fill="url(#halo)"/>
      <circle r="300" fill="none" stroke="#fff" stroke-opacity=".15" stroke-width="34"/>
      <circle class="sweep" r="300" fill="none" stroke="${p.accent2}" stroke-width="34" stroke-linecap="round" stroke-dasharray="1300 584" transform="rotate(-90)"/>
      ${Array.from({ length: 12 }, (_, i) => `<line x1="0" y1="-246" x2="0" y2="-222" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity=".7" transform="rotate(${i * 30})"/>`).join('')}
      <g class="p spin" style="animation-duration:6s"><line x1="0" y1="0" x2="0" y2="-200" stroke="#fff" stroke-width="12" stroke-linecap="round"/></g>
      <circle r="18" fill="#fff"/>
    </g>`,
  trophy: (p, r) => `
    ${rays(540, 640, 'rgba(255,210,74,.08)')}
    ${confetti(r, 30, [p.accent, '#fff', p.accent2, '#86EFAC'])}
    <g class="bob"><g transform="translate(540 640)">
      <circle r="300" fill="url(#halo)"/>
      <path d="M-170 -210 H 170 V -60 C 170 60 80 130 0 130 C -80 130 -170 60 -170 -60 Z" fill="${p.accent}"/>
      <path d="M-170 -170 C -300 -170 -300 20 -150 30 M170 -170 C 300 -170 300 20 150 30" stroke="${p.accent}" stroke-width="30" fill="none"/>
      <rect x="-34" y="130" width="68" height="90" fill="${p.accent}"/>
      <rect x="-140" y="220" width="280" height="70" rx="14" fill="#B45309"/>
      <path d="M0 -150 L 22 -96 L 80 -96 L 34 -62 L 52 -6 L 0 -40 L -52 -6 L -34 -62 L -80 -96 L -22 -96 Z" fill="#fff" class="p pulse"/>
      <clipPath id="cupClip"><path d="M-170 -210 H 170 V -60 C 170 60 80 130 0 130 C -80 130 -170 60 -170 -60 Z"/></clipPath>
      <g clip-path="url(#cupClip)"><rect class="shine" x="-60" y="-260" width="70" height="420" fill="#fff" opacity=".45"/></g>
    </g></g>`,
  code: (p) => `
    <g transform="translate(140 300)">
      <rect width="800" height="640" rx="34" fill="#0B1220" stroke="${p.accent2}" stroke-opacity=".4" stroke-width="3"/>
      <rect width="800" height="70" rx="34" fill="#16213A"/><rect y="40" width="800" height="30" fill="#16213A"/>
      <circle cx="50" cy="36" r="13" fill="#F87171"/><circle cx="92" cy="36" r="13" fill="#FBBF24"/><circle cx="134" cy="36" r="13" fill="#4ADE80"/>
      ${[[60, 360, p.accent2], [100, 520, p.accent], [100, 300, '#F472B6'], [140, 440, p.accent], [60, 250, p.accent2], [100, 480, '#FDE68A'], [60, 200, p.accent]].map(([x, w, c], i) =>
        `<rect class="p type" style="transform-origin:left center;transform-box:fill-box;animation-delay:${(i * 0.35).toFixed(2)}s" x="${x}" y="${120 + i * 66}" width="${w}" height="26" rx="13" fill="${c}" opacity=".85"/>`).join('')}
      <rect class="blink" x="290" y="572" width="22" height="40" fill="${p.accent}"/>
    </g>`,
  ai: (p, r) => {
    const nodes = [[-300, -200], [-300, 0], [-300, 200], [0, -280], [0, -90], [0, 90], [0, 280], [300, -120], [300, 120]];
    const links: string[] = [];
    for (const a of [0, 1, 2]) for (const b of [3, 4, 5, 6]) links.push(`<line class="dash" x1="${nodes[a][0]}" y1="${nodes[a][1]}" x2="${nodes[b][0]}" y2="${nodes[b][1]}" stroke="${p.accent}" stroke-opacity=".5" stroke-width="4"/>`);
    for (const a of [3, 4, 5, 6]) for (const b of [7, 8]) links.push(`<line class="dash" x1="${nodes[a][0]}" y1="${nodes[a][1]}" x2="${nodes[b][0]}" y2="${nodes[b][1]}" stroke="${p.accent2}" stroke-opacity=".5" stroke-width="4"/>`);
    return `${starsLayer(r, 40, '#E9D5FF', 1150)}<g transform="translate(540 640)"><circle r="380" fill="url(#halo)"/>${links.join('')}${nodes
      .map(([x, y], i) => `<circle class="p pulse" style="animation-delay:-${(i * 0.3).toFixed(1)}s" cx="${x}" cy="${y}" r="${i > 6 ? 46 : 34}" fill="${i > 6 ? p.accent2 : '#fff'}"/>`)
      .join('')}</g>`;
  },
  book: (p, r) => `
    ${starsLayer(r, 30, '#FEF3C7', 1100)}
    <g class="bob"><g transform="translate(540 680)">
      <circle r="330" fill="url(#halo)"/>
      <path d="M0 -150 C -110 -200 -250 -200 -330 -160 V 190 C -250 150 -110 150 0 200 Z" fill="#FFF7E6"/>
      <path d="M0 -150 C 110 -200 250 -200 330 -160 V 190 C 250 150 110 150 0 200 Z" fill="#FFEDD5"/>
      <path class="p flap" style="transform-origin:0 0" d="M0 -150 C 90 -190 200 -190 280 -160 V 180 C 200 150 90 150 0 190 Z" fill="#FFFFFF" opacity=".9"/>
      ${[-110, -60, -10, 40].map((y) => `<line x1="-280" y1="${y}" x2="-60" y2="${y + 10}" stroke="${p.bg[2]}" stroke-width="10" stroke-linecap="round" opacity=".45"/>`).join('')}
      <path d="M0 -150 V 200" stroke="${p.bg[1]}" stroke-width="8"/>
    </g></g>
    ${['A', 'B', 'C', '1', '2', '{ }'].map((t, i) => `<text class="rise" style="animation-delay:-${i * 1.1}s" x="${170 + i * 150}" y="1000" font-size="64" font-weight="800" fill="${p.accent}" font-family="Arial">${esc(t)}</text>`).join('')}`,
  mic: (p) => `
    <g transform="translate(540 640)">
      ${[0, -0.9, -1.8].map((d) => `<circle class="p ring" style="animation-delay:${d}s" r="200" fill="none" stroke="${p.accent}" stroke-width="8"/>`).join('')}
      <circle r="260" fill="url(#halo)"/>
      <g class="bob">
        <rect x="-90" y="-250" width="180" height="300" rx="90" fill="#fff"/>
        ${[-180, -130, -80].map((y) => `<line x1="-60" y1="${y}" x2="60" y2="${y}" stroke="${p.bg[2]}" stroke-width="10" stroke-linecap="round" opacity=".5"/>`).join('')}
        <path d="M-150 -20 C -150 130 150 130 150 -20" stroke="#fff" stroke-width="22" fill="none" stroke-linecap="round"/>
        <rect x="-11" y="100" width="22" height="90" fill="#fff"/><rect x="-90" y="185" width="180" height="24" rx="12" fill="#fff"/>
      </g>
      ${[-1, 1].map((s) => [0, 1, 2, 3].map((i) => `<rect class="p grow" style="animation-delay:-${(i * 0.4).toFixed(1)}s;animation-duration:.9s" x="${s * (250 + i * 50) - 12}" y="${-90 - (60 - i * 12)}" width="24" height="${(60 - i * 12) * 2 + 40}" rx="12" fill="${p.accent2}" opacity="${(0.9 - i * 0.15).toFixed(2)}"/>`).join('')).join('')}
    </g>`,
  shield: (p) => `
    <g transform="translate(540 640)">
      <circle r="330" fill="url(#halo)"/>
      <g class="p pulse"><path d="M0 -280 L 230 -190 V 10 C 230 160 120 250 0 300 C -120 250 -230 160 -230 10 V -190 Z" fill="#fff" opacity=".95"/>
      <path d="M-100 10 L -25 90 L 120 -70" stroke="${p.bg[2]}" stroke-width="40" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>
      <clipPath id="shClip"><path d="M0 -280 L 230 -190 V 10 C 230 160 120 250 0 300 C -120 250 -230 160 -230 10 V -190 Z"/></clipPath>
      <g clip-path="url(#shClip)"><rect class="scan" x="-260" y="-12" width="520" height="24" fill="${p.accent2}" opacity=".7"/></g>
    </g>`,
  chart: (p) => `
    <g transform="translate(180 330)">
      <line x1="0" y1="620" x2="720" y2="620" stroke="#fff" stroke-opacity=".5" stroke-width="6"/>
      ${[180, 300, 240, 420, 520].map((h, i) => `<rect class="p grow" style="transform-origin:center bottom;animation-delay:-${(i * 0.35).toFixed(2)}s" x="${30 + i * 140}" y="${620 - h}" width="96" height="${h}" rx="16" fill="${i === 4 ? p.accent2 : p.accent}" opacity="${i === 4 ? 1 : 0.85}"/>`).join('')}
      <path class="dash" d="M70 380 L 210 280 L 350 330 L 490 160 L 640 60" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M600 40 L 680 30 L 668 108" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </g>`,
  rocket: (p, r) => `
    ${starsLayer(r, 80, '#E0E7FF', 1400)}
    ${Array.from({ length: 7 }, (_, i) => `<line class="rise" style="animation-delay:-${i}s;animation-duration:2.2s" x1="${120 + i * 140}" y1="1100" x2="${120 + i * 140}" y2="1180" stroke="#fff" stroke-opacity=".5" stroke-width="5" stroke-linecap="round"/>`).join('')}
    <g class="bob"><g transform="translate(540 640) rotate(35)">
      <circle r="320" fill="url(#halo)"/>
      <path d="M0 -300 C 110 -200 120 -40 90 120 H -90 C -120 -40 -110 -200 0 -300 Z" fill="#fff"/>
      <circle cy="-90" r="52" fill="${p.bg[2]}" stroke="${p.accent2}" stroke-width="14"/>
      <path d="M-90 40 L -190 170 L -80 140 Z M90 40 L 190 170 L 80 140 Z" fill="${p.accent}"/>
      <path class="p flick" d="M-60 130 C -50 230 -10 300 0 330 C 10 300 50 230 60 130 Z" fill="url(#flame)"/>
    </g></g>`,
  calendar: (p) => `
    <g class="bob"><g transform="translate(540 640)">
      <circle r="330" fill="url(#halo)"/>
      <rect x="-230" y="-230" width="460" height="460" rx="44" fill="#fff"/>
      <rect x="-230" y="-230" width="460" height="130" rx="44" fill="${p.accent}"/><rect x="-230" y="-140" width="460" height="40" fill="${p.accent}"/>
      <rect x="-150" y="-270" width="34" height="90" rx="17" fill="#fff" stroke="${p.bg[1]}" stroke-width="8"/>
      <rect x="116" y="-270" width="34" height="90" rx="17" fill="#fff" stroke="${p.bg[1]}" stroke-width="8"/>
      ${Array.from({ length: 12 }, (_, i) => `<rect x="${-180 + (i % 4) * 95}" y="${-60 + Math.floor(i / 4) * 90}" width="70" height="60" rx="12" fill="${i === 6 ? p.bg[2] : '#EDE9FE'}" class="${i === 6 ? 'p pulse' : ''}"/>`).join('')}
    </g></g>`,
  certificate: (p) => `
    <g class="bob"><g transform="translate(540 620)">
      <circle r="340" fill="url(#halo)"/>
      <rect x="-300" y="-210" width="600" height="420" rx="26" fill="#FFFDF5"/>
      <rect x="-270" y="-180" width="540" height="360" rx="16" fill="none" stroke="${p.accent}" stroke-width="8"/>
      ${[-110, -60, 0].map((y, i) => `<rect x="-200" y="${y}" width="${[400, 300, 340][i]}" height="22" rx="11" fill="${p.bg[1]}" opacity="${[0.8, 0.35, 0.35][i]}"/>`).join('')}
      <g transform="translate(170 150)"><path d="M-40 20 L -60 130 L 0 100 L 60 130 L 40 20 Z" fill="#DC2626"/>
      <circle class="p pulse" r="78" fill="${p.accent}"/><circle r="52" fill="none" stroke="#fff" stroke-width="6"/></g>
      <clipPath id="cClip"><rect x="-300" y="-210" width="600" height="420" rx="26"/></clipPath>
      <g clip-path="url(#cClip)"><rect class="shine" x="-60" y="-260" width="80" height="520" fill="#fff" opacity=".6"/></g>
    </g></g>`,
  stars: (p, r) => `
    ${starsLayer(r, 120, '#FFFFFF', 1500)}
    <g transform="translate(540 640)">
      <circle r="360" fill="url(#halo)"/>
      <g class="p spin">${Array.from({ length: 8 }, (_, i) => `<path d="M0 -330 L 18 -260 L 0 -240 L -18 -260 Z" fill="${p.accent}" opacity=".7" transform="rotate(${i * 45})"/>`).join('')}</g>
      <path class="p pulse" d="M0 -190 L 52 -62 L 190 -58 L 82 28 L 120 160 L 0 84 L -120 160 L -82 28 L -190 -58 L -52 -62 Z" fill="${p.accent}"/>
    </g>`,
};

/** Font size that keeps the poster word inside the frame at any length. */
const fitSize = (text: string) => {
  const n = text.length;
  if (n <= 4) return 300;
  if (n <= 6) return 240;
  if (n <= 9) return 180;
  if (n <= 13) return 132;
  if (n <= 18) return 100;
  return 84;
};

export function resolveArt(d: DropArtInput): string {
  const want = String(d.art || 'auto');
  if (want !== 'auto' && SCENES[want]) return want;
  return AUTO_ART[String(d.type || '')] || 'stars';
}

/** The full SVG document for one drop. */
export function dropArtSvg(d: DropArtInput, opts: { still?: boolean } = {}): string {
  const art = resolveArt(d);
  let p = PALETTES[art] || PALETTES.stars;
  // Company cards would all be the same blue; the company name picks one of a
  // few brand-neutral palettes so a run of company drops does not blur together.
  if (art === 'company' && d.art_text) {
    const pick = rng(String(d.art_text).toLowerCase())();
    p = COMPANY_VARIANTS[Math.floor(pick * COMPANY_VARIANTS.length)];
  }
  const r = rng(`${d.id || ''}|${d.headline || ''}|${art}`);
  const text = String(d.art_text || '').trim().slice(0, 24);
  const sub = String(d.art_sub || '').trim().slice(0, 48);
  const hasText = !!text;
  const scene = SCENES[art](p, r, hasText);

  // The company scene puts the poster word (a company name) inside its orbit;
  // every other scene puts it below the illustration.
  const centred = art === 'company';
  const size = centred ? Math.min(fitSize(text), 170) : fitSize(text);
  const textY = centred ? 640 + size * 0.34 : 1080 + size * 0.3;
  const subY = centred ? 1080 : textY + 110;

  const textBlock = hasText
    ? `<g class="txt"><text x="540" y="${textY}" text-anchor="middle" font-family="Poppins,'Segoe UI','Arial Black',Arial,sans-serif" font-weight="900" font-size="${size}" letter-spacing="-2" fill="url(#textGrad)" stroke="rgba(0,0,0,.25)" stroke-width="3" paint-order="stroke">${esc(text)}</text></g>`
    : '';
  const subBlock = sub
    ? `<g class="sub"><rect x="${540 - Math.min(480, sub.length * 17 + 60)}" y="${subY - 52}" width="${Math.min(960, sub.length * 34 + 120)}" height="76" rx="38" fill="rgba(0,0,0,.35)" stroke="${p.accent}" stroke-opacity=".6" stroke-width="3"/><text x="540" y="${subY}" text-anchor="middle" font-family="Poppins,'Segoe UI',Arial,sans-serif" font-weight="800" font-size="40" letter-spacing="1" fill="${p.ink}">${esc(sub.toUpperCase())}</text></g>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ART_W} ${ART_H}" width="${ART_W}" height="${ART_H}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="${p.bg[0]}"/><stop offset=".55" stop-color="${p.bg[1]}"/><stop offset="1" stop-color="${p.bg[2]}"/></linearGradient>
  <radialGradient id="halo"><stop offset="0" stop-color="${p.accent}" stop-opacity=".45"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></radialGradient>
  <radialGradient id="flameGlow"><stop offset="0" stop-color="#FFD166" stop-opacity=".75"/><stop offset="1" stop-color="#FF7A1A" stop-opacity="0"/></radialGradient>
  <linearGradient id="flame" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FF5A1F"/><stop offset=".55" stop-color="#FFB020"/><stop offset="1" stop-color="#FFF6C2"/></linearGradient>
  <linearGradient id="lanternShade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".25"/><stop offset=".5" stop-color="#fff" stop-opacity=".2"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient>
  <linearGradient id="textGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="${p.accent}"/></linearGradient>
  <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M60 0H0V60" fill="none" stroke="#fff" stroke-opacity=".05" stroke-width="2"/></pattern>
</defs>
<style>${BASE_CSS}${opts.still ? STILL_CSS : ''}</style>
<rect width="${ART_W}" height="${ART_H}" fill="url(#bg)"/>
<rect width="${ART_W}" height="${ART_H}" fill="url(#grid)"/>
<circle class="blob" cx="200" cy="300" r="420" fill="${p.accent}" opacity=".10"/>
<circle class="blob" style="animation-delay:-4s" cx="900" cy="1100" r="480" fill="${p.accent2}" opacity=".10"/>
${scene}
${textBlock}
${subBlock}
</svg>`;
}

/** Preset list for the console (labels shown in the picker). */
export const DROP_ART_LABELS: Record<string, string> = {
  auto: 'Auto (by type)',
  diwali: 'Diwali night — diyas & lanterns',
  'diwali-sale': 'Diwali sale — rays, diyas, fireworks',
  fireworks: 'Fireworks',
  gift: 'Gift box & confetti',
  hiring: 'Hiring — briefcase',
  company: 'Company — name in orbit',
  countdown: 'Countdown clock',
  trophy: 'Trophy',
  code: 'Code terminal',
  ai: 'AI network',
  book: 'Open book',
  mic: 'Microphone',
  shield: 'Shield & check',
  chart: 'Growth chart',
  rocket: 'Rocket',
  calendar: 'Calendar',
  certificate: 'Certificate',
  stars: 'Stars',
};
