/**
 * A soft synthesised "phuljhadi" crackle — no audio file. Off by default; the
 * student turns it on from the gift popup and the choice is remembered.
 */
const KEY = 'tieedu_diwali_sound';

export const soundOn = (): boolean => {
  try { return localStorage.getItem(KEY) === 'on'; } catch { return false; }
};

export const setSound = (on: boolean) => {
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* private mode */ }
};

let ctx: AudioContext | null = null;

export function crackle(durationMs = 1400) {
  if (!soundOn()) return;
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    ctx = ctx || new AC();
    const c = ctx;
    const now = c.currentTime;
    const pops = Math.round(durationMs / 35);
    for (let i = 0; i < pops; i++) {
      const at = now + Math.random() * (durationMs / 1000);
      const len = 0.02 + Math.random() * 0.03;
      const buf = c.createBuffer(1, Math.floor(c.sampleRate * len), c.sampleRate);
      const data = buf.getChannelData(0);
      for (let j = 0; j < data.length; j++) data[j] = (Math.random() * 2 - 1) * (1 - j / data.length);
      const src = c.createBufferSource();
      src.buffer = buf;
      const filter = c.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1800 + Math.random() * 3000;
      const gain = c.createGain();
      gain.gain.value = 0.05 + Math.random() * 0.08;
      src.connect(filter).connect(gain).connect(c.destination);
      src.start(at);
    }
  } catch {
    // Audio is a garnish; never let it break the page.
  }
}
