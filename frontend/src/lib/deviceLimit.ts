/**
 * Two sign-ins per account (EMAIL_LIFECYCLE_AND_DEVICES_PLAN §4).
 *
 * A third sign-in is refused by the server with the two current devices. The
 * login call asks here which one to sign out; the single DeviceLimitSheet
 * (mounted in _app) shows the choice and answers. Kept outside React so the
 * plain API functions in lib/auth can await it from any page.
 */
export interface SignedInDevice {
  id: string;
  name: string;
  signed_in_at: string;
  last_active_at: string;
  current?: boolean;
}

type Pending = { devices: SignedInDevice[]; resolve: (id: string | null) => void };

let pending: Pending | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Resolves with the device to sign out, or null if the student cancelled. */
export function chooseDeviceToSignOut(devices: SignedInDevice[]): Promise<string | null> {
  pending?.resolve(null);
  return new Promise((resolve) => {
    pending = { devices, resolve };
    emit();
  });
}

export function answerDeviceChoice(id: string | null) {
  const p = pending;
  pending = null;
  emit();
  p?.resolve(id);
}

export const currentDeviceChoice = () => pending?.devices ?? null;

export function subscribeDeviceChoice(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** "just now", "5 min ago", "3 hours ago", "2 days ago". */
export function timeAgo(iso: string, now = Date.now()): string {
  const mins = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  if (!Number.isFinite(mins) || mins < 2) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
