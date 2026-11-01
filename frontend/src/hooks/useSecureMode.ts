import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Secure mode for graded tests (TRAIN_TEST_TRACK_PLAN §5.2).
 *
 * While `active`: copy, cut, paste, right-click and text drag are blocked, and
 * leaving the test (tab switch, window blur, exiting fullscreen) is a strike.
 * Strike 1 and 2 show a warning; at `limit` the caller auto-submits.
 *
 * A browser cannot make cheating impossible, only harder and visible, so the
 * strikes are reported on the result as integrity flags, never as "proctored".
 */
export function useSecureMode({ active, limit = 3, onLimit }: { active: boolean; limit?: number; onLimit: () => void }) {
  const [strikes, setStrikes] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);
  const lastStrike = useRef(0);
  const onLimitRef = useRef(onLimit);
  onLimitRef.current = onLimit;

  const strike = useCallback(
    (reason: string) => {
      // One leave fires blur + visibilitychange + fullscreenchange together.
      const now = Date.now();
      if (now - lastStrike.current < 1500) return;
      lastStrike.current = now;
      setStrikes((n) => {
        const next = n + 1;
        if (next >= limit) onLimitRef.current();
        else setWarning(`${reason}. Warning ${next} of ${limit - 1}: one more and your test is submitted.`);
        return next;
      });
    },
    [limit]
  );

  const enterFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    if (!active) return;
    const block = (e: Event) => e.preventDefault();
    const onVisibility = () => { if (document.hidden) strike('You left the test tab'); };
    const onBlur = () => strike('You switched to another window');
    const onFullscreen = () => { if (!document.fullscreenElement) strike('You exited fullscreen'); };
    const blocked = ['copy', 'cut', 'paste', 'contextmenu', 'dragstart'] as const;
    blocked.forEach((t) => document.addEventListener(t, block));
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFullscreen);
    document.body.style.userSelect = 'none';
    return () => {
      blocked.forEach((t) => document.removeEventListener(t, block));
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFullscreen);
      document.body.style.userSelect = '';
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [active, strike]);

  return { strikes, warning, dismissWarning: () => setWarning(null), enterFullscreen };
}
