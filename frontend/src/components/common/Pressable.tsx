'use client';

import React, { useCallback, useRef } from 'react';
import { cn } from '@/lib/cn';

/**
 * Touch feedback and haptics — Phase 5 (MOBILE_APP_UI_PLAN.md §8).
 *
 * A web button tells you it is pressable by changing colour on hover, which a
 * finger never triggers. A native control tells you by physically moving under
 * your finger. The gap between those two is most of what "this feels like a web
 * page" is made of.
 *
 * So: every tappable surface gets a real `:active` transform plus a tint, and
 * the 44px hit-area minimum is enforced here rather than remembered at 200 call
 * sites. `hover` is deliberately never used — a stuck hover state after a tap is
 * its own bug, and Phase 0 already neutralised the tap-highlight flash.
 */

export type HapticWeight = 'light' | 'medium' | 'heavy' | 'success' | 'warning';

/**
 * Vibration patterns, in milliseconds.
 *
 * IMPORTANT AND UNGLAMOROUS: `navigator.vibrate` is **Android-only**. iOS
 * Safari has never shipped a haptics API for the web, so on iPhone every one of
 * these calls is a no-op. The visual press feedback above is what carries the
 * experience on iOS; these are an enhancement where the platform allows it.
 * Do not design flows that depend on the buzz being felt.
 */
const HAPTIC_PATTERNS: Record<HapticWeight, number | number[]> = {
  light: 10,
  medium: 18,
  heavy: 28,
  success: [12, 40, 22],
  warning: [22, 60, 22],
};

/** Fire a haptic if the platform supports it. Never throws, never awaits. */
export const haptic = (weight: HapticWeight = 'light') => {
  if (typeof navigator === 'undefined') return;
  if (typeof navigator.vibrate !== 'function') return;
  // Respect the OS-level setting. Chrome on Android exposes `reduce motion` in
  // media queries, and haptics are grouped with it in most Android settings.
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  try {
    navigator.vibrate(HAPTIC_PATTERNS[weight]);
  } catch {
    // Some browsers throw when the page is not user-activated yet.
  }
};

const MIN_TAP = 44;

export interface PressableProps {
  children: React.ReactNode;
  /** Fired on press. Keep it cheap — this is a tap handler, not a gesture. */
  onPress?: () => void;
  /** Wrapper element. Default `button` so Enter/Space and focus come for free. */
  as?: 'button' | 'div' | 'a' | 'li';
  hapticWeight?: HapticWeight;
  disabled?: boolean;
  className?: string;
  /** Stretch the hit area past the visual box, for small icon targets. */
  expandHitArea?: boolean;
  type?: 'button' | 'submit' | 'reset';
  'aria-label'?: string;
  'aria-expanded'?: boolean;
  'aria-haspopup'?: boolean;
  'aria-current'?: 'page' | undefined;
  /** Toggle state for controls that style themselves from it (drops rail). */
  'aria-pressed'?: boolean;
  'data-active'?: boolean;
  /** Extra data attribute the consumer styles from, e.g. the drops save rail. */
  'data-on'?: boolean | undefined;
  'data-testid'?: string;
  style?: React.CSSProperties;
}

export const Pressable: React.FC<PressableProps> = ({
  children,
  onPress,
  as = 'button',
  hapticWeight = 'light',
  disabled = false,
  className,
  expandHitArea = false,
  type = 'button',
  ...rest
}) => {
  // A 44px minimum on a 28px avatar button needs ~8px of bleed on every side.
  // Negative margins are the only way to grow the target without moving the
  // layout, which would reflow everything around it on press.
  const bleed = expandHitArea ? 8 : 0;

  const handlePointerDown = useCallback(() => {
    if (disabled) return;
    haptic(hapticWeight);
  }, [disabled, hapticWeight]);

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      if (disabled) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      onPress?.();
    },
    [disabled, onPress]
  );

  // `onPointerDown` + `onClick` rather than a bare `onClick`: the haptic has to
  // land at touch-down to feel connected to the finger. A click fires on
  // release, which is ~100ms late and reads as lag.
  const Tag = as as 'button';

  return (
    <Tag
      {...rest}
      type={as === 'button' ? type : undefined}
      disabled={as === 'button' ? disabled : undefined}
      aria-disabled={as === 'button' ? undefined : disabled || undefined}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      className={cn(
        'pressable relative inline-flex items-center justify-center',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      style={{
        ...rest.style,
        ...(expandHitArea
          ? {
              marginTop: -bleed,
              marginBottom: -bleed,
              marginLeft: -bleed,
              marginRight: -bleed,
              paddingTop: bleed,
              paddingBottom: bleed,
              paddingLeft: bleed,
              paddingRight: bleed,
            }
          : {}),
      }}
    >
      {children}
    </Tag>
  );
};

/**
 * Enforce a minimum tap target on an arbitrary element without changing layout.
 *
 * For the cases where `Pressable` is the wrong tool (a whole card that is already
 * a link, or a list row with its own layout). `minHeight` may already be a CSS
 * length like `3rem`, which is why this cannot just be a `Math.max` — it falls
 * back to the 44px floor whenever the existing value is not a plain number.
 */
export const withTapTarget = (style?: React.CSSProperties): React.CSSProperties => {
  const existing = style?.minHeight;
  const minHeight = typeof existing === 'number' ? Math.max(MIN_TAP, existing) : MIN_TAP;
  return { position: 'relative', minHeight, ...style };
};
