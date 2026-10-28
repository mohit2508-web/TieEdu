/**
 * A/B experiments, client side (F5, backend lib/experiments).
 *
 * `useVariant(id)` returns the visitor's variant while an experiment is
 * running, and null otherwise (null means: show the normal page). The variant
 * is a stable hash of an anonymous id kept on this device, so a visitor sees
 * the same version on every visit. `trackExperiment` records an exposure or a
 * conversion; the server counts each once per visitor.
 */
import { useEffect, useState } from 'react';
import { API_BASE_URL } from './api';

const VID_KEY = 'tieedu_vid';
let running: Promise<Array<{ id: string; variants: string[] }>> | null = null;

function visitorId(): string | null {
  try {
    let v = window.localStorage.getItem(VID_KEY);
    if (!v || !/^[A-Za-z0-9_-]{16,64}$/.test(v)) {
      const bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      v = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      window.localStorage.setItem(VID_KEY, v);
    }
    return v;
  } catch {
    // No storage: no stable id, so no experiment — the visitor sees the normal page.
    return null;
  }
}

/** FNV-1a: small, fast, and the same on every device. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

export function useVariant(experiment: string): string | null {
  const [variant, setVariant] = useState<string | null>(null);
  useEffect(() => {
    const vid = visitorId();
    if (!vid) return;
    running ??= fetch(`${API_BASE_URL}/experiments`).then((r) => (r.ok ? r.json() : { experiments: [] })).then((d) => d.experiments || []).catch(() => []);
    let live = true;
    running.then((list) => {
      const exp = list.find((e) => e.id === experiment);
      if (live && exp && exp.variants.length) setVariant(exp.variants[hash(`${vid}:${experiment}`) % exp.variants.length]);
    });
    return () => { live = false; };
  }, [experiment]);
  return variant;
}

export function trackExperiment(experiment: string, variant: string | null, event: 'exposure' | 'conversion'): void {
  if (!variant) return;
  const vid = visitorId();
  if (!vid) return;
  try {
    void fetch(`${API_BASE_URL}/experiments/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ experiment, variant, event, vid }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* measurement must never break the page */
  }
}
