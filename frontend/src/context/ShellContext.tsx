'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Every overlay the chrome can open, and the one keyboard handler that closes
 * them.
 *
 * The Cmd-K shortcut used to be bound on `pages/index.tsx` alone, while the
 * `⌘K` hint chip sat in the header on all twelve pages — so the bar advertised
 * a shortcut that did nothing on eleven of them. One listener here, mounted
 * once, makes the hint true everywhere.
 *
 * Overlays are tracked as a stack rather than a set of booleans because
 * Escape has to close the *topmost* thing, not whichever flag happens to be
 * checked first. Opening the palette from the drawer has to close the palette
 * first and leave the drawer standing.
 */

export type OverlayId =
  | 'drawer'
  | 'search'
  | 'leaderboard'
  | 'cart'
  | 'notifications'
  | 'userMenu';

export interface ShellContextValue {
  /** Overlay ids in the order they were opened; last one is the topmost. */
  stack: OverlayId[];
  isOpen: (id: OverlayId) => boolean;
  openOverlay: (id: OverlayId) => void;
  closeOverlay: (id: OverlayId) => void;
  closeTop: () => void;
  closeAll: () => void;
  toggleOverlay: (id: OverlayId) => void;
  /** True while any overlay is up — used to lock body scroll once, centrally. */
  anyOpen: boolean;
}

const ShellContext = createContext<ShellContextValue | null>(null);

/** Which of these should freeze the page behind them. */
const BLOCKS_SCROLL: OverlayId[] = ['drawer', 'search', 'leaderboard', 'cart'];

export const ShellProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stack, setStack] = useState<OverlayId[]>([]);
  // Mirrors `stack` for the keydown handler, which is registered once and must
  // not re-subscribe on every open/close.
  const stackRef = useRef<OverlayId[]>([]);
  stackRef.current = stack;

  const openOverlay = useCallback((id: OverlayId) => {
    setStack((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const closeOverlay = useCallback((id: OverlayId) => {
    setStack((prev) => prev.filter((open) => open !== id));
  }, []);

  const closeTop = useCallback(() => {
    setStack((prev) => prev.slice(0, -1));
  }, []);

  const closeAll = useCallback(() => setStack([]), []);

  const toggleOverlay = useCallback((id: OverlayId) => {
    setStack((prev) => (prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]));
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      // Cmd-K on a Mac, Ctrl-K everywhere else. The previous binding was on
      // `pages/index.tsx:92-101`; this is the same test, applied app-wide.
      if ((event.metaKey || event.ctrlKey) && key === 'k') {
        event.preventDefault();
        toggleOverlay('search');
        return;
      }

      if (event.key === 'Escape' && stackRef.current.length > 0) {
        event.preventDefault();
        closeTop();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleOverlay, closeTop]);

  // One lock for all scroll-blocking overlays, and a guaranteed restore. The
  // old drawer set `document.body.style.overflow` in its own effect, so a cart
  // drawer and a nav drawer could fight over the same property.
  const anyOpen = stack.length > 0;
  useEffect(() => {
    if (!anyOpen) return;
    const previous = document.body.style.overflow;
    if (BLOCKS_SCROLL.some((id) => stack.includes(id))) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [anyOpen, stack]);

  const value = useMemo<ShellContextValue>(
    () => ({
      stack,
      isOpen: (id) => stack.includes(id),
      openOverlay,
      closeOverlay,
      closeTop,
      closeAll,
      toggleOverlay,
      anyOpen,
    }),
    [stack, openOverlay, closeOverlay, closeTop, closeAll, toggleOverlay, anyOpen]
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
};

export const useShell = (): ShellContextValue => {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error('useShell must be used inside ShellProvider');
  return ctx;
};
