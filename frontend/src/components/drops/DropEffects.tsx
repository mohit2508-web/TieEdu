import React, { useMemo } from 'react';
import type { DropEffect } from '@/lib/dropsApi';

/**
 * Particle layer over a drop's creative — confetti, fireworks, rising diya
 * lights and friends. Pure CSS animation on a handful of absolutely placed
 * spans (transform/opacity only, so it stays on the compositor), mounted only
 * while the card is the one on screen, and hidden entirely under
 * prefers-reduced-motion (globals.css `.drop-fx`).
 *
 * Positions come from a fixed per-index formula rather than Math.random, so a
 * re-render never reshuffles the particles mid-animation.
 */

const COUNTS: Record<Exclude<DropEffect, 'none'>, number> = {
  confetti: 36,
  fireworks: 4,
  sparkles: 18,
  diyas: 14,
  stars: 26,
  snow: 34,
  hearts: 14,
  bubbles: 16,
};

const CONFETTI = ['#FFD166', '#EF476F', '#06D6A0', '#118AB2', '#FF9F1C', '#C77DFF', '#FFFFFF'];
const FIREWORK = ['#FFD166', '#FF5DA2', '#7DD3FC', '#A7F3D0'];

/** 0..1, stable per (index, salt). */
const frac = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export const DropEffects: React.FC<{ effect?: DropEffect }> = ({ effect }) => {
  const parts = useMemo(() => {
    if (!effect || effect === 'none' || !(effect in COUNTS)) return [];
    const n = COUNTS[effect as keyof typeof COUNTS];
    return Array.from({ length: n }, (_, i) => {
      const x = frac(i, 1) * 100;
      const y = frac(i, 2) * 100;
      const delay = -(frac(i, 3) * 6);
      const dur = 3 + frac(i, 4) * 4;
      const size = frac(i, 5);
      const style: React.CSSProperties & Record<string, string | number> = {
        left: `${x}%`,
        animationDelay: `${delay.toFixed(2)}s`,
        animationDuration: `${dur.toFixed(2)}s`,
      };
      if (effect === 'confetti') {
        style.background = CONFETTI[i % CONFETTI.length];
        style.width = `${6 + size * 6}px`;
        style.height = `${10 + size * 8}px`;
        style['--drift'] = `${(frac(i, 6) - 0.5) * 80}px`;
      } else if (effect === 'fireworks') {
        style.left = `${15 + (i % 2) * 50 + frac(i, 7) * 20}%`;
        style.top = `${10 + frac(i, 8) * 35}%`;
        style.color = FIREWORK[i % FIREWORK.length];
        style.animationDelay = `${(-i * 0.7).toFixed(2)}s`;
        style.animationDuration = '2.8s';
      } else if (effect === 'sparkles' || effect === 'stars') {
        style.top = `${y * (effect === 'stars' ? 0.6 : 0.7)}%`;
        style.width = style.height = `${(effect === 'stars' ? 3 : 10) + size * (effect === 'stars' ? 4 : 14)}px`;
        style.animationDuration = `${(1.6 + frac(i, 4) * 2).toFixed(2)}s`;
      } else if (effect === 'diyas') {
        style.width = style.height = `${8 + size * 12}px`;
        style['--drift'] = `${(frac(i, 6) - 0.5) * 60}px`;
        style.animationDuration = `${(6 + frac(i, 4) * 5).toFixed(2)}s`;
      } else if (effect === 'snow' || effect === 'bubbles') {
        style.width = style.height = `${(effect === 'snow' ? 4 : 10) + size * (effect === 'snow' ? 6 : 22)}px`;
        style['--drift'] = `${(frac(i, 6) - 0.5) * 70}px`;
        style.animationDuration = `${(effect === 'snow' ? 5 : 6) + frac(i, 4) * 5}s`;
      } else if (effect === 'hearts') {
        style.fontSize = `${16 + size * 18}px`;
        style['--drift'] = `${(frac(i, 6) - 0.5) * 60}px`;
        style.animationDuration = `${(4 + frac(i, 4) * 4).toFixed(2)}s`;
      }
      return style;
    });
  }, [effect]);

  if (parts.length === 0) return null;

  return (
    <div className={`drop-fx drop-fx--${effect}`} aria-hidden="true">
      {parts.map((style, i) =>
        effect === 'fireworks' ? (
          <span key={i} className="drop-fx__p" style={style}>
            {Array.from({ length: 12 }, (_, k) => (
              <i key={k} style={{ transform: `rotate(${k * 30}deg)` }} />
            ))}
          </span>
        ) : effect === 'hearts' ? (
          <span key={i} className="drop-fx__p" style={style}>♥</span>
        ) : (
          <span key={i} className="drop-fx__p" style={style} />
        )
      )}
    </div>
  );
};

export default DropEffects;
