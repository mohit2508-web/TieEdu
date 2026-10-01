/**
 * Reference-counted body scroll lock.
 *
 * WHY THIS IS A SEPARATE MODULE
 *
 * Scroll locking is the one piece of global UI state that more than one owner
 * needs. `ShellContext` locks for the drawer/palette/cart, and the new
 * `Sheet` locks for the module list, company switcher, and drill-down surfaces
 * that are not shell overlays at all.
 *
 * When two owners each saved and restored `document.body.style.overflow`
 * themselves, they corrupted each other. The failure is order-dependent, so it
 * only shows up in a specific sequence — open the nav drawer, then open a sheet
 * from inside it, then close the drawer: the drawer's cleanup restores the
 * value it captured *before* the sheet locked, and the page underneath is now
 * scrollable behind a sheet that is still open.
 *
 * A counter removes the ordering question entirely: whoever releases last is
 * whoever restores, and the stored value is only ever read from a state where
 * nothing is locked.
 */

let lockCount = 0;

/**
 * The inline value to restore on the final release. Captured on the *first*
 * acquire, not the first restore, so a page that legitimately had
 * `overflow: hidden` set by something else gets it back rather than having it
 * silently cleared.
 */
let restoreValue: string | null = null;

/**
 * Lock body scroll. Returns a release function, so callers can just return it
 * from an effect and get cleanup for free.
 *
 *   useEffect(() => lockBodyScroll(open), [open]);
 */
export const lockBodyScroll = (): (() => void) => {
  if (typeof document === 'undefined') return () => {};

  if (lockCount === 0) {
    restoreValue = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount += 1;

  let released = false;
  return () => {
    // Idempotent. React 18 StrictMode double-invokes effects in development,
    // so a release that runs twice without its matching acquire would otherwise
    // drive the counter negative and permanently unlock the page.
    if (released) return;
    released = true;

    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0 && restoreValue !== null) {
      document.body.style.overflow = restoreValue;
      restoreValue = null;
    }
  };
};

/** Test seam. Production code must never need this. */
export const __scrollLockState = () => ({ lockCount, restoreValue });
