/**
 * Drop sounds — synthesised with WebAudio, so the feed ships no audio files
 * and every preset is a few hundred bytes of code.
 *
 * Browsers only allow sound after a user gesture, so the feed starts muted and
 * the viewer turns sound on with the speaker button (that tap is the gesture
 * that unlocks the AudioContext). The choice is remembered per device.
 *
 * `playDropSound` never throws: a sound is decoration, and a browser without
 * WebAudio (or a blocked context) simply stays silent.
 */
import type { DropSound } from './dropsApi';

const PREF_KEY = 'tieedu_drops_sound';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let custom: HTMLAudioElement | null = null;

const audio = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
  }
  return ctx;
};

export const soundPreference = (): boolean => {
  try {
    return window.localStorage.getItem(PREF_KEY) === 'on';
  } catch {
    return false;
  }
};

export const setSoundPreference = (on: boolean): void => {
  try {
    window.localStorage.setItem(PREF_KEY, on ? 'on' : 'off');
  } catch {
    /* private mode: preference lasts for the page only */
  }
};

/** Call from a click/tap handler — that is what lets the context start. */
export const unlockDropSound = async (): Promise<void> => {
  const c = audio();
  if (c && c.state === 'suspended') {
    try {
      await c.resume();
    } catch {
      /* stays silent */
    }
  }
};

export const stopDropSound = (): void => {
  if (custom) {
    custom.pause();
    custom = null;
  }
};

// ─── tiny synth ──────────────────────────────────────────────────────────

const tone = (
  c: AudioContext,
  freq: number,
  at: number,
  dur: number,
  opts: { type?: OscillatorType; gain?: number; slideTo?: number; attack?: number } = {}
) => {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type || 'sine';
  osc.frequency.setValueAtTime(freq, at);
  if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, at + dur);
  const peak = opts.gain ?? 0.3;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + (opts.attack ?? 0.01));
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(g).connect(master!);
  osc.start(at);
  osc.stop(at + dur + 0.05);
};

/** A bell: fundamental plus inharmonic partials, long decay. */
const bell = (c: AudioContext, freq: number, at: number, gain = 0.22) => {
  tone(c, freq, at, 1.6, { gain });
  tone(c, freq * 2.76, at, 0.9, { gain: gain * 0.35 });
  tone(c, freq * 5.4, at, 0.45, { gain: gain * 0.15 });
};

const noise = (c: AudioContext, at: number, dur: number, opts: { from?: number; to?: number; gain?: number; q?: number } = {}) => {
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = opts.q ?? 1;
  filter.frequency.setValueAtTime(opts.from ?? 800, at);
  if (opts.to) filter.frequency.exponentialRampToValueAtTime(opts.to, at + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.4, at + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(filter).connect(g).connect(master!);
  src.start(at);
  src.stop(at + dur + 0.05);
};

const PRESETS: Record<Exclude<DropSound, 'none' | 'custom'>, (c: AudioContext, t: number) => void> = {
  chime: (c, t) => [784, 988, 1175].forEach((f, i) => bell(c, f, t + i * 0.12, 0.18)),
  // Temple-bell pair, then a rising raga-like pluck line (Sa Re Ga Pa).
  diwali: (c, t) => {
    bell(c, 523, t, 0.25);
    bell(c, 784, t + 0.35, 0.2);
    [523, 587, 659, 784, 1047].forEach((f, i) => tone(c, f, t + 0.7 + i * 0.13, 0.5, { type: 'triangle', gain: 0.16 }));
  },
  fireworks: (c, t) => {
    tone(c, 300, t, 0.6, { type: 'sine', slideTo: 1400, gain: 0.08 });
    noise(c, t + 0.6, 0.7, { from: 2500, to: 200, gain: 0.6, q: 0.6 });
    for (let i = 0; i < 9; i++) noise(c, t + 0.9 + Math.random() * 0.6, 0.05, { from: 4000 + Math.random() * 3000, gain: 0.25, q: 3 });
  },
  drumroll: (c, t) => {
    for (let i = 0; i < 18; i++) noise(c, t + i * 0.045, 0.06, { from: 1200, gain: 0.12 + i * 0.012, q: 0.8 });
    tone(c, 110, t + 0.85, 0.5, { type: 'sine', slideTo: 55, gain: 0.5 });
    noise(c, t + 0.85, 0.6, { from: 6000, gain: 0.3, q: 0.5 });
  },
  whoosh: (c, t) => noise(c, t, 0.55, { from: 300, to: 3500, gain: 0.35, q: 1.4 }),
  pop: (c, t) => tone(c, 420, t, 0.16, { type: 'sine', slideTo: 900, gain: 0.35, attack: 0.005 }),
  success: (c, t) => [523, 659, 784, 1047].forEach((f, i) => tone(c, f, t + i * 0.09, 0.35, { type: 'triangle', gain: 0.18 })),
  alert: (c, t) => {
    tone(c, 880, t, 0.18, { type: 'square', gain: 0.07 });
    tone(c, 660, t + 0.22, 0.18, { type: 'square', gain: 0.07 });
    tone(c, 880, t + 0.44, 0.25, { type: 'square', gain: 0.07 });
  },
  tick: (c, t) => {
    for (let i = 0; i < 4; i++) tone(c, i % 2 ? 1600 : 2000, t + i * 0.32, 0.04, { type: 'square', gain: 0.08, attack: 0.002 });
  },
};

/**
 * Play one drop's sound. `customUrl` is the uploaded file for `sound:
 * 'custom'`. The previous custom clip is stopped first so a fast swipe never
 * layers two tracks.
 */
export const playDropSound = (sound: DropSound | undefined, customUrl?: string | null): void => {
  try {
    stopDropSound();
    if (!sound || sound === 'none') return;
    if (sound === 'custom') {
      if (!customUrl) return;
      custom = new Audio(customUrl);
      custom.volume = 0.8;
      void custom.play().catch(() => {});
      return;
    }
    const c = audio();
    if (!c || !master) return;
    if (c.state === 'suspended') void c.resume().catch(() => {});
    PRESETS[sound]?.(c, c.currentTime + 0.03);
  } catch {
    /* decoration only */
  }
};
