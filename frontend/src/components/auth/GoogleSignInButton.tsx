import React, { useEffect, useRef, useState } from 'react';
import { apiGoogleConfig, apiGoogleSignIn, type AuthLoginPayload } from '@/lib/auth';

/**
 * "Continue with Google" — Google Identity Services (free).
 *
 * Renders nothing until the server says Google sign-in is configured
 * (GOOGLE_CLIENT_ID), so the page never shows a button that cannot work.
 * Google's own script draws the button: its look is mandated by Google's
 * branding rules, and it is what users recognise and trust.
 */
declare global {
  interface Window {
    google?: any;
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client';
let gsiPromise: Promise<void> | null = null;

function loadGsi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gsiPromise) return gsiPromise;
  gsiPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = GSI_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => {
      gsiPromise = null;
      reject(new Error('Could not load Google sign-in'));
    };
    document.head.appendChild(s);
  });
  return gsiPromise;
}

export const GoogleSignInButton: React.FC<{
  /** Called with the session the server issued; `created` is true for a brand-new account. */
  onSignedIn: (data: AuthLoginPayload & { created: boolean }) => void;
  onError?: (message: string) => void;
  text?: 'continue_with' | 'signup_with' | 'signin_with';
  /** Rendered above the button when it shows, e.g. an "or" divider below it. */
  after?: React.ReactNode;
}> = ({ onSignedIn, onError, text = 'continue_with', after }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  // Latest callbacks without re-initialising Google on every render.
  const cbs = useRef({ onSignedIn, onError });
  cbs.current = { onSignedIn, onError };

  useEffect(() => {
    let alive = true;
    (async () => {
      const cfg = await apiGoogleConfig();
      if (!alive || !cfg.enabled || !cfg.client_id) return;
      try {
        await loadGsi();
      } catch {
        return; // blocked by an extension or offline: the email form still works
      }
      if (!alive || !ref.current) return;
      setEnabled(true);
      window.google.accounts.id.initialize({
        client_id: cfg.client_id,
        ux_mode: 'popup',
        callback: async (resp: { credential?: string }) => {
          if (!resp?.credential) return;
          setBusy(true);
          try {
            cbs.current.onSignedIn(await apiGoogleSignIn(resp.credential));
          } catch (err) {
            cbs.current.onError?.((err as Error).message || 'Google sign-in failed — please try again.');
          } finally {
            setBusy(false);
          }
        },
      });
      const width = Math.min(ref.current.offsetWidth || 356, 400);
      window.google.accounts.id.renderButton(ref.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text,
        logo_alignment: 'center',
        width,
      });
    })();
    return () => { alive = false; };
  }, [text]);

  return (
    <div className={enabled ? '' : 'hidden'} aria-busy={busy}>
      <div ref={ref} className={`flex min-h-[44px] w-full justify-center ${busy ? 'pointer-events-none opacity-60' : ''}`} />
      {after}
    </div>
  );
};
