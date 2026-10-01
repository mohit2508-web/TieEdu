'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from 'framer-motion';
import { cn } from '@/lib/cn';
import { lockBodyScroll } from '@/lib/scrollLock';

/**
 * The one bottom-sheet primitive — Phase 2 (MOBILE_APP_UI_PLAN.md §6).
 *
 * WHY SHEETS AND NOT CENTRED MODALS ON A PHONE
 *
 * A centred modal is a compromise that works on neither surface well. On a
 * 390px phone it is a small floating box with dead space above and below, it
 * clips its own content, and its close button lands in the top-right corner —
 * roughly the worst thumb-reach target on the screen, and in the zone your palm
 * covers when you hold the phone. Every native app instead docks to the bottom
 * edge, fills the width, and puts the dismiss affordance where the thumb
 * already is.
 *
 * Desktop is a deliberate non-goal (plan §2): at `md` and up this renders as the
 * same centred dialog the app already had, so the desktop design is untouched.
 *
 * WHY DRAG IS ON THE HANDLE ONLY
 *
 * The obvious implementation makes the whole panel draggable and fights the
 * content scroller: drag down on a list that is already scrolled and the sheet
 * moves instead of the list, or the list hits its end and the sheet takes over
 * mid-scroll. iOS solves this with a scroll-offset handoff that is genuinely hard
 * to get right. Restricting drag to an explicit grabber is less clever and
 * completely predictable, and a visible grabber is also a stronger affordance
 * than a gesture nobody knows about.
 */

/** How far a sheet must be dragged, or how fast, before it counts as a dismiss. */
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 600;

export type SheetSide = 'bottom' | 'left' | 'right';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Used for the dialog's accessible name. Required — an unnamed dialog is a bug. */
  title: string;
  children: React.ReactNode;
  side?: SheetSide;
  /** Freeze the page behind the sheet. Turn off only for a sheet inside another locked surface. */
  blocksScroll?: boolean;
  /**
   * Close on Escape. Defaults to true.
   *
   * Turn it off for the four overlays that live in the `ShellContext` stack
   * (drawer, search, leaderboard, cart): that provider already owns a single
   * window-level Escape listener which closes the *topmost* overlay. Adding a
   * second one here would close this sheet AND pop the one beneath it.
   */
  closeOnEscape?: boolean;
  /** Visible drag grabber. On by default for bottom sheets. */
  showHandle?: boolean;
  /**
   * Render nothing at `md` and up. The nav drawer is mobile-only by design
   * (plan §7), and this has to hide the backdrop too — a panel-only `md:hidden`
   * would leave an invisible scrim eating every click on desktop.
   */
  hideOnDesktop?: boolean;
  /**
   * Stacking order. Each converted overlay keeps the z-index it had before, so
   * converting one surface cannot push another behind the header — search sat at
   * 80 and the drawer at 70, above the 60 this primitive shipped with.
   */
  zIndex?: number;
  /** Extra classes on the panel, e.g. to pin a height. */
  className?: string;
  /** Classes on the inner scrolling region. */
  contentClassName?: string;
  /**
   * Whether the content region scrolls. Default true.
   *
   * The cart needs this off: it is two mutually exclusive screens (cart and
   * payment), each with its own pinned totals-and-pay footer, and swapping the
   * pinned row in and out of the `footer` slot on every step change would be a
   * far larger change than simply letting it own its internal scrolling.
   */
  scroll?: boolean;
  /**
   * Replaces the built-in title + close row. The panel keeps `aria-label` from
   * `title`, so the dialog still has an accessible name; the replacement is
   * responsible for its own close control.
   */
  header?: React.ReactNode;
  /** Pinned action row below the scroll area (checkout totals, confirm buttons). */
  footer?: React.ReactNode;
  'data-testid'?: string;
}

export const Sheet: React.FC<SheetProps> = ({
  open,
  onClose,
  title,
  children,
  side = 'bottom',
  blocksScroll = true,
  closeOnEscape = true,
  showHandle = side === 'bottom',
  hideOnDesktop = false,
  zIndex = 60,
  className,
  contentClassName,
  scroll = true,
  header,
  footer,
  ...rest
}) => {
  const reducedMotion = useReducedMotion();
  const dragControls = useDragControls();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open || !blocksScroll) return;
    return lockBodyScroll();
  }, [open, blocksScroll]);

  // Move focus into the sheet on open, and put it back where it was on close.
  //
  // Without the restore, dismissing a sheet drops focus to `document.body`, and
  // the next Tab press restarts from the very top of the page — on a long
  // article that reads as the app having forgotten where you were.
  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = (document.activeElement as HTMLElement) ?? null;
    const id = window.setTimeout(() => {
      // A sheet built around one field (auth, search) should put the caret in
      // that field, not on the panel — the user already tapped the button that
      // opens it, so their next intent is to type.
      const target = panelRef.current?.querySelector<HTMLElement>('[data-sheet-autofocus]');
      (target ?? panelRef.current)?.focus();
    }, 0);
    return () => {
      window.clearTimeout(id);
      restoreFocusRef.current?.focus?.();
    };
  }, [open]);

  // Escape, for the sheets that are not already in the `ShellContext` stack.
  // Three of the modals this primitive replaced (auth, submit-report, feedback)
  // had no Escape handler at all, so on those surfaces Escape did nothing.
  useEffect(() => {
    if (!open || !closeOnEscape) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, closeOnEscape, onClose]);

  // Keep Tab inside the sheet. A modal that lets focus escape to the page behind
  // it is unusable with a keyboard and actively confusing with a screen reader,
  // because the reader will happily read out content that is visually covered.
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === panelRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    []
  );

  const onDragEnd = useCallback(
    (_event: unknown, info: PanInfo) => {
      const { offset, velocity } = info;
      // Project where the sheet would land if the finger were released now.
      // A fast flick barely moves but is unambiguous, so velocity alone is
      // enough to dismiss — otherwise flick-to-dismiss feels broken.
      //
      // Sign each axis so that "away from the screen" is always positive; the
      // same threshold then works for a bottom sheet and a side panel.
      const along = side === 'right' ? offset.x : side === 'left' ? -offset.x : offset.y;
      const speed = side === 'right' ? velocity.x : side === 'left' ? -velocity.x : velocity.y;
      const projected = along + speed * 0.15;
      // A side panel only dismisses when dragged outward. Pulling a right drawer
      // further left is a no-op, not a dismissal.
      if (projected > DISMISS_DISTANCE || speed > DISMISS_VELOCITY) onClose();
    },
    [onClose, side]
  );

  // Backdrop: a dimmed, blurred wash. `onPointerDown` rather than `onClick` so a
  // drag that starts inside the sheet and ends on the backdrop does not close it.
  const dismissOnBackdrop = useCallback(
    (event: React.PointerEvent) => {
      if (event.target === event.currentTarget) onClose();
    },
    [onClose]
  );

  const isBottom = side === 'bottom';
  const isDraggable = !reducedMotion;
  const sideHidden = isBottom ? { y: '100%' } : { x: side === 'left' ? '-100%' : '100%' };

  const position: React.CSSProperties = {
    ...(isBottom
      ? { paddingBottom: 'var(--safe-bottom)' }
      : { paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)' }),
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={cn(
            'fixed inset-0 z-[60] flex md:items-center md:justify-center',
            hideOnDesktop && 'md:hidden'
          )}
          style={{ zIndex, ...(isBottom ? { alignItems: 'flex-end' } : {}) }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.18 }}
          onPointerDown={dismissOnBackdrop}
          data-testid={rest['data-testid'] ? `${rest['data-testid']}-backdrop` : undefined}
        >
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" aria-hidden="true" />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            onKeyDown={onKeyDown}
            className={cn(
              'relative z-10 flex w-full flex-col bg-white shadow-2xl outline-none',
              isBottom
                ? 'max-h-[92dvh] rounded-t-2xl md:max-h-[min(88dvh,44rem)] md:rounded-2xl'
                : // A side panel is full-bleed top to bottom, so it must not
                  // inherit the bottom sheet's height cap or top rounding.
                  'h-full rounded-none md:h-auto md:max-h-[min(88dvh,44rem)] md:rounded-2xl',
              isBottom ? 'inset-x-0 bottom-0' : 'inset-y-0 max-w-[22rem]',
              'md:max-w-[32rem]',
              className
            )}
            style={position}
            initial={reducedMotion ? { opacity: 0 } : sideHidden}
            animate={reducedMotion ? { opacity: 1 } : { x: 0, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : sideHidden}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 460, damping: 42, mass: 0.85 }
            }
            {...(isDraggable
              ? {
                  drag: isBottom ? ('y' as const) : ('x' as const),
                  dragListener: false,
                  dragControls,
                  dragConstraints: isBottom ? { top: 0, bottom: 0 } : { left: 0, right: 0 },
                  // A little give past the top, so a wrong-direction drag still
                  // acknowledges the finger instead of feeling broken.
                  dragElastic: isBottom
                    ? { top: 0.06, bottom: 0.4 }
                    : side === 'right'
                      ? { left: 0.06, right: 0.4 }
                      : { left: 0.4, right: 0.06 },
                  onDragEnd,
                }
              : {})}
          >
            {showHandle && isDraggable && (
              <div
                className="flex shrink-0 cursor-grab touch-none justify-center pt-2.5 active:cursor-grabbing"
                onPointerDown={(event) => dragControls.start(event)}
                data-testid="sheet-grabber"
              >
                <div className="h-1 w-10 rounded-full bg-black/20" />
              </div>
            )}

            {/*
              The header is a second drag handle. Dragging a sheet by its title
              is the gesture people reach for first, and making the whole header
              live means the grabber is a hint rather than a target.
            */}
            {header ? (
              // Wrapped so a custom header is still a drag handle, exactly like
              // the built-in one.
              <div
                className={cn('shrink-0', isDraggable && 'cursor-grab touch-none active:cursor-grabbing')}
                onPointerDown={isDraggable ? (event) => dragControls.start(event) : undefined}
              >
                {header}
              </div>
            ) : (
              <div
                className={cn(
                  'flex shrink-0 items-center justify-between gap-3 px-5 pb-3 pt-3',
                  isDraggable && 'cursor-grab touch-none active:cursor-grabbing'
                )}
                onPointerDown={isDraggable ? (event) => dragControls.start(event) : undefined}
              >
                <h2 className="text-[15px] font-semibold text-[color:var(--text-heading)]">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={`Close ${title}`}
                  className="-mr-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[color:var(--text-muted)] transition-colors hover:bg-black/5 active:bg-black/10"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path
                      d="M3 3l10 10M13 3L3 13"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            )}

            {/*
              `overscroll-contain` stops the scroll chain from passing through to
              the document behind, which is what makes a page behind a sheet
              appear to rubber-band on iOS.
            */}
            <div
              className={cn(
                'min-h-0 flex-1',
                scroll && 'scroller overflow-y-auto overscroll-contain',
                scroll ? null : 'flex flex-col',
                contentClassName
              )}
              style={scroll ? { WebkitOverflowScrolling: 'touch' } : undefined}
            >
              {children}
            </div>

            {footer && (
              <div className="shrink-0 border-t border-[color:var(--border-subtle)] bg-white px-5 py-4">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Sheet;
