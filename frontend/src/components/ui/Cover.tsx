import React from 'react';
import { cn } from '@/lib/cn';

/**
 * Cover — a generated cover for a course or subject (§4.6).
 *
 * Every course gets a distinctive cover with zero design work: the subject
 * picks a pattern family (circuit traces for electronics, grid paper for maths,
 * brackets for programming, gears for mechanical, layers for data/cloud, ruled
 * lines for everything else) and the title picks the hue, deterministically, so
 * a course always gets the same cover on every device and in every list.
 *
 * Patterns are inline SVG <pattern>s at low contrast on a deep ground; the
 * title is set in the display face on top. No images to upload, nothing to load.
 */

export type CoverPattern = 'circuit' | 'grid' | 'brackets' | 'gears' | 'layers' | 'lines';

/** Deep grounds that all keep white type ≥ 7:1. */
const GROUNDS = [
  ['#0E2A44', '#1B4A73'], // ink
  ['#3B1F0B', '#7A3410'], // burnt orange
  ['#0B3B33', '#11665A'], // teal
  ['#2A1A4A', '#4B2A80'], // violet
  ['#3A0F1E', '#7A1F3A'], // wine
  ['#1F2E12', '#3F5E21'], // moss
] as const;

const RULES: Array<[RegExp, CoverPattern]> = [
  [/\b(ece|electronic|circuit|vlsi|embedded|signal|microprocessor|iot|digital logic)/i, 'circuit'],
  [/\b(math|aptitude|statistic|probability|calculus|algebra|quant|discrete)/i, 'grid'],
  [/\b(mech|thermo|cad|manufactur|machine design|automobile|robot)/i, 'gears'],
  [/\b(data|sql|database|cloud|aws|azure|devops|docker|kubernetes|network|system design|ml|machine learning|ai\b)/i, 'layers'],
  [/\b(python|java|c\+\+|\bc\b|javascript|typescript|react|node|programming|coding|dsa|algorithm|web|go\b|rust|kotlin|swift|oop)/i, 'brackets'],
];

export const coverPatternFor = (subject: string): CoverPattern => RULES.find(([re]) => re.test(subject))?.[1] ?? 'lines';

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** Stroke markup for each pattern tile; drawn in white at low opacity. */
const TILE: Record<CoverPattern, { size: number; body: React.ReactNode }> = {
  circuit: {
    size: 48,
    body: (
      <>
        <path d="M0 12h16l8 8h24M24 20v28M0 36h10l6-6h8" fill="none" strokeWidth="1.5" />
        <circle cx="16" cy="12" r="2.5" />
        <circle cx="24" cy="48" r="2.5" />
        <circle cx="10" cy="36" r="2.5" />
      </>
    ),
  },
  grid: {
    size: 24,
    body: <path d="M24 0H0v24" fill="none" strokeWidth="1" />,
  },
  brackets: {
    size: 56,
    body: (
      <>
        <path d="M14 8l-8 10 8 10M42 36l8 10-8 10" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M30 4l-6 24" fill="none" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  gears: {
    size: 60,
    body: (
      <>
        <circle cx="20" cy="20" r="9" fill="none" strokeWidth="1.5" />
        <circle cx="20" cy="20" r="3" fill="none" strokeWidth="1.5" />
        <path d="M20 6v5M20 29v5M6 20h5M29 20h5M10 10l3.5 3.5M26.5 26.5L30 30M10 30l3.5-3.5M26.5 13.5L30 10" fill="none" strokeWidth="1.5" />
        <circle cx="46" cy="46" r="6" fill="none" strokeWidth="1.5" />
      </>
    ),
  },
  layers: {
    size: 52,
    body: (
      <>
        <path d="M26 6l18 9-18 9-18-9z" fill="none" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M8 24l18 9 18-9M8 33l18 9 18-9" fill="none" strokeWidth="1.5" strokeLinejoin="round" />
      </>
    ),
  },
  lines: {
    size: 20,
    body: <path d="M0 19.5h20" fill="none" strokeWidth="1" />,
  },
};

export interface CoverProps {
  title: string;
  /** Text used to pick the pattern; defaults to the title. Category or branch works well. */
  subject?: string;
  /** Override the detected pattern. */
  pattern?: CoverPattern;
  /** Small line above the title ("Course · 24 lessons"). */
  kicker?: string;
  /** Hide the title (when the card shows it below the cover). */
  bare?: boolean;
  /** Tailwind aspect class; 16:9 by default. */
  aspect?: string;
  className?: string;
}

export const Cover: React.FC<CoverProps> = ({ title, subject, pattern, kicker, bare, aspect = 'aspect-video', className }) => {
  const h = hash(title);
  const [from, to] = GROUNDS[h % GROUNDS.length];
  const kind = pattern ?? coverPatternFor(`${subject ?? ''} ${title}`);
  const tile = TILE[kind];
  const id = `cover-${kind}-${h.toString(36)}`;
  // A per-title offset and tilt, so two covers with the same pattern still differ.
  const shift = (h >> 8) % tile.size;
  const tilt = kind === 'grid' || kind === 'lines' ? 0 : ((h >> 4) % 3) * 8 - 8;

  return (
    <div
      className={cn('relative overflow-hidden', aspect, className)}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      role={bare ? 'img' : undefined}
      aria-label={bare ? title : undefined}
    >
      <svg aria-hidden className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id={id}
            width={tile.size}
            height={tile.size}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${shift} ${shift}) rotate(${tilt})`}
          >
            <g stroke="white" fill="white" strokeOpacity="0.16" fillOpacity="0.16">
              {tile.body}
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
      {/* Logo-orange edge: the one brand mark on every cover. */}
      <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-logo" />
      {!bare && (
        <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-5">
          {kicker ? <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/75">{kicker}</p> : null}
          <p className="font-display text-xl font-bold leading-tight text-white line-clamp-3 sm:text-2xl">{title}</p>
        </div>
      )}
    </div>
  );
};

export default Cover;
