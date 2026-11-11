import React from 'react';
import { BRAIN_CENTRE, BRAIN_CENTRE_SEGS, BRAIN_NODES, BRAIN_OUTLINE, BRAIN_SEGS } from './brainGeometry';

/**
 * The brain from the TiEEdu logo, thinking (PRACTICE_POLISH_PLAN.md §2).
 *
 * - `ignite`: synapses draw out from the centre one after another, nodes light, it settles. Calm, 3.2 s.
 * - `pulse`: sparks race from the centre to each node, nodes flash. Busy work (Run, Submit), 1.6 s.
 * - `still`: drawn, unlit (error states).
 * - `lost`: drawn, nodes flicker out of step like a lost thought (404).
 *
 * The brain's inside is transparent so it sits on any ground (no white patch in
 * dark mode). Styles live in styles/brand.css; reduced motion shows it lit and still.
 * The SVG is a static string, built once per mode.
 */
export type BrandMarkMode = 'ignite' | 'pulse' | 'still' | 'lost';

const [CX, CY] = BRAIN_CENTRE;
const segEnd = (d: string) => d.split(' L')[1].split(' ').map(Number) as [number, number];

function build(mode: BrandMarkMode): string {
  const parts: string[] = [];
  if (mode === 'ignite' || mode === 'pulse') parts.push(`<circle class="tm-aura" cx="${CX}" cy="${CY}" r="250" fill="url(#tm-aura-${mode})"/>`);
  parts.push(`<path class="tm-outline" d="${BRAIN_OUTLINE}" fill="none" stroke-width="12"/>`);
  if (mode === 'ignite' || mode === 'pulse') parts.push(`<path class="tm-halo" d="${BRAIN_OUTLINE}" fill="none" stroke-width="18" filter="url(#tm-glow)"/>`);
  parts.push(`<g class="tm-base" fill="none" stroke-width="6">${BRAIN_SEGS.map((d) => `<path d="${d}"/>`).join('')}</g>`);
  if (mode === 'ignite') {
    parts.push(`<g class="tm-lit" fill="none" stroke-width="11">${BRAIN_SEGS.map((d, i) => `<path d="${d}" pathLength="1" style="animation-delay:${(i * 0.045).toFixed(2)}s"/>`).join('')}</g>`);
  }
  parts.push(`<g class="tm-nodes" stroke-width="6">${BRAIN_NODES.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>`);
  if (mode === 'ignite' || mode === 'lost') {
    parts.push(`<g class="tm-glow-nodes" filter="url(#tm-glow)">${BRAIN_NODES.map(([x, y, r], i) => `<circle cx="${x}" cy="${y}" r="${r * 1.4}" style="animation-delay:${(0.25 + i * 0.12).toFixed(2)}s"/>`).join('')}</g>`);
  }
  if (mode === 'pulse') {
    BRAIN_SEGS.slice(0, BRAIN_CENTRE_SEGS).forEach((d, i) => {
      const begin = `${(i * 0.17).toFixed(2)}s`;
      const [x2, y2] = segEnd(d);
      const node = BRAIN_NODES.find(([x, y]) => x === x2 && y === y2);
      parts.push(
        `<circle class="tm-spark" r="13" opacity="0" filter="url(#tm-glow)"><animateMotion dur="1.6s" begin="${begin}" repeatCount="indefinite" path="${d}" keyPoints="0;1;1" keyTimes="0;.55;1" calcMode="linear"/>` +
          `<animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;.05;.5;.56;1" dur="1.6s" begin="${begin}" repeatCount="indefinite"/></circle>` +
          `<circle class="tm-spark" cx="${x2}" cy="${y2}" r="${(node ? node[2] : 14) * 1.3}" opacity="0" filter="url(#tm-glow)"><animate attributeName="opacity" values="0;0;1;0" keyTimes="0;.52;.62;1" dur="1.6s" begin="${begin}" repeatCount="indefinite"/></circle>`,
      );
    });
    parts.push(`<circle class="tm-core" cx="${CX}" cy="${CY}" r="18" filter="url(#tm-glow)"/>`);
  }
  const defs =
    `<defs><filter id="tm-glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="12" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` +
    `<radialGradient id="tm-aura-${mode}"><stop offset="0" stop-color="var(--tm-amber)" stop-opacity=".45"/><stop offset=".5" stop-color="var(--tm-amber)" stop-opacity=".12"/><stop offset="1" stop-color="var(--tm-amber)" stop-opacity="0"/></radialGradient></defs>`;
  return `<svg viewBox="-40 -40 430 400" aria-hidden="true" focusable="false">${defs}<g stroke-linejoin="round" stroke-linecap="round">${parts.join('')}</g></svg>`;
}

const CACHE: Partial<Record<BrandMarkMode, string>> = {};
const svgFor = (mode: BrandMarkMode) => (CACHE[mode] ??= build(mode));

export interface BrandMarkProps {
  mode?: BrandMarkMode;
  /** Width in px (height follows). */
  size?: number;
  className?: string;
}

export const BrandMark: React.FC<BrandMarkProps> = ({ mode = 'ignite', size = 88, className = '' }) => (
  <span
    className={`tie-mark tm-${mode}${size < 40 ? ' tm-tiny' : ''} ${className}`}
    style={{ width: size, height: Math.round(size * 0.93) }}
    dangerouslySetInnerHTML={{ __html: svgFor(mode) }}
  />
);
