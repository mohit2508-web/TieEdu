import { Router, Request, Response } from 'express';
import { loadDb } from '../data/db';

/**
 * Generated course covers (1280×720 SVG) from the course's own title,
 * category and level, so every course has a cover without an upload and a
 * renamed course gets a new one automatically. Public, cacheable.
 *
 *   GET /api/covers/course/:slug.svg
 */
export const coversRouter = Router();

const PALETTE: Array<[RegExp, string, string, string]> = [
  [/ai|data science|artificial|machine|deep|llm|prompt|genai/i, '#2E1F6B', '#7044C7', 'AI'],
  [/career|placement|aptitude|resume|excel/i, '#8A3B07', '#F59E0B', '↗'],
  [/electronic|signal/i, '#0B3A6B', '#2A7FD4', '∿'],
  [/electrical/i, '#6B3A0B', '#D49A1E', '⚡'],
  [/mechanical|thermo|fluid/i, '#2B3442', '#64748B', '⚙'],
  [/math/i, '#7C2D12', '#E0582A', '∑'],
  [/database|sql|dbms/i, '#0F4A2B', '#1F9D57', '▤'],
  [/web/i, '#0B5E57', '#17B3A0', '◎'],
  [/design|cad/i, '#7A1745', '#E0457F', '◇'],
  [/tool|git|linux/i, '#1F2937', '#556070', '$_'],
  [/computer|programming|coding|python|c-|dsa|operating|network/i, '#0B4A43', '#14806F', '</>'],
];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Greedy word wrap into at most `max` lines of about `width` characters. */
function wrap(text: string, width: number, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > width && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  if (lines.length > max) { lines.length = max; lines[max - 1] = lines[max - 1].replace(/\s*\S*$/, '') + '…'; }
  return lines;
}

export function courseCoverSvg(course: { title: string; category?: string; level?: string; slug: string }): string {
  const hay = `${course.category || ''} ${course.slug}`;
  const [, from, to, glyph] = PALETTE.find(([re]) => re.test(hay)) || ['', '#0B4A43', '#14806F', '◆'];
  // Split "Title: subtitle" so the main name gets the big type.
  const [main, sub] = course.title.split(/:\s+/, 2);
  const lines = wrap(main, 20, 3);
  const size = lines.length > 2 ? 76 : 88;
  const startY = 330 - ((lines.length - 1) * size * 1.08) / 2;
  const level = course.level ? course.level.charAt(0).toUpperCase() + course.level.slice(1) : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>
    <pattern id="p" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="#fff" stroke-opacity=".07" stroke-width="2"/></pattern>
  </defs>
  <rect width="1280" height="720" fill="url(#g)"/>
  <rect width="1280" height="720" fill="url(#p)"/>
  <circle cx="1090" cy="160" r="260" fill="#fff" fill-opacity=".06"/>
  <text x="1110" y="430" text-anchor="middle" font-family="Poppins, 'Segoe UI', Arial, sans-serif" font-size="300" font-weight="800" fill="#fff" fill-opacity=".12">${esc(glyph)}</text>
  <rect x="80" y="84" rx="22" height="44" width="${Math.min(520, 34 + (course.category || 'Course').length * 15)}" fill="#fff" fill-opacity=".16"/>
  <text x="102" y="114" font-family="Poppins, 'Segoe UI', Arial, sans-serif" font-size="22" font-weight="600" fill="#fff">${esc(course.category || 'Course')}</text>
  ${lines.map((l, i) => `<text x="80" y="${startY + i * size * 1.08}" font-family="Poppins, 'Segoe UI', Arial, sans-serif" font-size="${size}" font-weight="800" fill="#fff" letter-spacing="-2">${esc(l)}</text>`).join('\n  ')}
  ${sub ? `<text x="82" y="${startY + lines.length * size * 1.08 + 10}" font-family="Poppins, 'Segoe UI', Arial, sans-serif" font-size="30" font-weight="500" fill="#fff" fill-opacity=".85">${esc(wrap(sub, 52, 1)[0])}</text>` : ''}
  ${level ? `<rect x="80" y="604" rx="20" height="40" width="${34 + level.length * 14}" fill="#FDB022"/><text x="97" y="631" font-family="Poppins, 'Segoe UI', Arial, sans-serif" font-size="20" font-weight="700" fill="#2A1E14">${esc(level)}</text>` : ''}
  <text x="1200" y="636" text-anchor="end" font-family="Poppins, 'Segoe UI', Arial, sans-serif" font-size="30" font-weight="800" fill="#fff" fill-opacity=".9">TieEdu</text>
</svg>`;
}

coversRouter.get('/course/:file', (req: Request, res: Response) => {
  const slug = String(req.params.file || '').replace(/\.svg$/, '');
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return res.status(404).end();
  const course = (loadDb().courses || []).find((c: any) => c.slug === slug);
  if (!course) return res.status(404).end();
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
  res.send(courseCoverSvg(course));
});

/* ---- Drop creatives (feed): 1080×1350 portrait in the type's colour ---- */
const DROP_STYLE: Record<string, [string, string, string, string]> = {
  company: ['#0B3A6B', '#2A7FD4', '▣', 'Companies'],
  job: ['#0F4A2B', '#1F9D57', '✦', 'Jobs'],
  deadline: ['#7A1B12', '#E0452A', '⏱', 'Deadline'],
  vault: ['#2E1F6B', '#5B4BD8', '◈', 'Vault'],
  skilltest: ['#3B1F6B', '#8E4BD8', '✓', 'Skill test'],
  course: ['#7A3B07', '#E08A1E', '▶', 'Course'],
  contest: ['#7A1745', '#E0457F', '★', 'Contest'],
  selected: ['#0F4A2B', '#1FA36A', '✔', 'Selected'],
  scholarship: ['#0B4A5E', '#1E9AB8', '◎', 'Scholarship'],
  college: ['#3B1F6B', '#7A4BD8', '⌂', 'College'],
  tip: ['#7A4A07', '#E0A21E', '!', 'Tip'],
  tieedu: ['#0B4A43', '#14806F', 'T', 'TieEdu'],
};

export function dropCreativeSvg(d: { type: string; headline: string; sponsored?: boolean }): string {
  // Artwork only: the card draws the type chip, headline, bullets and CTA over
  // it, so the creative carries colour, shape and the type's glyph, no text.
  const [from, to, glyph] = DROP_STYLE[d.type] || DROP_STYLE.tieedu;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350" width="1080" height="1350">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>
    <radialGradient id="r" cx=".7" cy=".3" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <pattern id="p" width="54" height="54" patternUnits="userSpaceOnUse"><path d="M54 0H0V54" fill="none" stroke="#fff" stroke-opacity=".07" stroke-width="2"/></pattern>
  </defs>
  <rect width="1080" height="1350" fill="url(#g)"/>
  <rect width="1080" height="1350" fill="url(#p)"/>
  <rect width="1080" height="1350" fill="url(#r)"/>
  <circle cx="820" cy="380" r="300" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="3"/>
  <circle cx="820" cy="380" r="210" fill="none" stroke="#fff" stroke-opacity=".10" stroke-width="2"/>
  <circle cx="160" cy="1120" r="240" fill="#000" fill-opacity=".10"/>
  <text x="820" y="500" text-anchor="middle" font-family="Poppins, 'Segoe UI', Arial, sans-serif" font-size="360" font-weight="800" fill="#fff" fill-opacity=".2">${esc(glyph)}</text>
</svg>`;
}

coversRouter.get('/drop/:file', (req: Request, res: Response) => {
  const id = String(req.params.file || '').replace(/\.svg$/, '');
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(id)) return res.status(404).end();
  const drop = (loadDb().drops || []).find((x: any) => x.id === id);
  if (!drop) return res.status(404).end();
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
  res.send(dropCreativeSvg(drop));
});
