import React, { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/festival';

/**
 * Canvas fireworks. No library: rockets rise, burst into gold / marigold /
 * rani-pink sparks with gravity, drag and a fading trail.
 *
 * - `ambient`: a burst every `every` ms while visible (hero sky).
 * - `burst`:   `count` bursts up front, then stops (celebrations).
 * Pauses when the tab is hidden or the canvas is off screen; renders nothing
 * under prefers-reduced-motion. Particle count is capped for cheap phones.
 */

const COLORS = ['#FFD966', '#FFC93C', '#FF8A00', '#FF4F93', '#FFF3B0', '#FF6B3D', '#B388FF', '#7CF0C5'];
const MAX_PARTICLES = 700;

interface Spark { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; }
interface Rocket { x: number; y: number; vy: number; targetY: number; color: string; }

export const Fireworks: React.FC<{
  mode?: 'ambient' | 'burst';
  count?: number;
  every?: number;
  className?: string;
  /** Fixed full-screen overlay instead of filling the parent. */
  fullscreen?: boolean;
  onDone?: () => void;
}> = ({ mode = 'ambient', count = 5, every = 1600, className, fullscreen = false, onDone }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || prefersReducedMotion()) { onDone?.(); return; }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0, h = 0, raf = 0, visible = true, last = performance.now(), sinceLaunch = 0, launched = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const sparks: Spark[] = [];
    const rockets: Rocket[] = [];

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(canvas);

    const launch = () => {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      rockets.push({ x: w * (0.15 + Math.random() * 0.7), y: h, vy: -(h * 0.9 + Math.random() * h * 0.4), targetY: h * (0.12 + Math.random() * 0.33), color });
      launched++;
    };

    const explode = (x: number, y: number, color: string) => {
      const n = Math.min(90, MAX_PARTICLES - sparks.length);
      const ring = Math.random() < 0.35;
      const second = COLORS[Math.floor(Math.random() * COLORS.length)];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.1;
        const speed = ring ? 130 + Math.random() * 15 : 40 + Math.random() * 170;
        sparks.push({
          x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
          life: 0, max: 1.1 + Math.random() * 0.9, color: Math.random() < 0.25 ? second : color, size: 1.2 + Math.random() * 1.6,
        });
      }
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible || document.hidden) return;

      sinceLaunch += dt * 1000;
      if (mode === 'ambient' ? sinceLaunch > every : launched < count && sinceLaunch > 280) {
        sinceLaunch = 0;
        launch();
      }

      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';

      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.y += r.vy * dt;
        r.vy *= 0.985;
        ctx.fillStyle = r.color;
        ctx.beginPath(); ctx.arc(r.x, r.y, 2, 0, Math.PI * 2); ctx.fill();
        if (r.y <= r.targetY) { explode(r.x, r.y, r.color); rockets.splice(i, 1); }
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life += dt;
        if (s.life >= s.max) { sparks.splice(i, 1); continue; }
        s.vx *= 0.975; s.vy = s.vy * 0.975 + 90 * dt;
        s.x += s.vx * dt; s.y += s.vy * dt;
        const alpha = 1 - s.life / s.max;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = s.color;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size * (0.6 + alpha * 0.6), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (mode === 'burst' && launched >= count && rockets.length === 0 && sparks.length === 0) {
        cancelAnimationFrame(raf);
        onDone?.();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, count, every]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={className}
      style={fullscreen
        ? { position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 95 }
        : { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  );
};
