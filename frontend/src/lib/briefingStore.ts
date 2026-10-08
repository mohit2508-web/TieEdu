export const BRIEFING_KEY = 'tieedu_briefing_v1';
export const DROPS_SEEN_KEY = 'tieedu_drops_seen_v1';
export const VAULT_SEEN_KEY = 'tieedu_vault_seen_v1';

export interface BriefingStore {
  date: string;
  shown: boolean;
}

export const localDateKey = (now: Date = new Date()): string => {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

const scopedKey = (base: string, userId?: string | null): string =>
  userId ? `${base}:${userId}` : base;

const todayStore = (): BriefingStore => ({ date: localDateKey(), shown: false });

export const readBriefingStore = (userId?: string | null): BriefingStore => {
  if (typeof window === 'undefined') return todayStore();
  try {
    const raw = window.localStorage.getItem(scopedKey(BRIEFING_KEY, userId));
    if (!raw) return todayStore();
    const parsed = JSON.parse(raw);
    const today = localDateKey();
    if (!parsed || typeof parsed !== 'object' || parsed.date !== today) return todayStore();
    return { date: today, shown: parsed.shown === true };
  } catch {
    return todayStore();
  }
};

export const markBriefingShown = (userId?: string | null): void => {
  try {
    window.localStorage.setItem(
      scopedKey(BRIEFING_KEY, userId),
      JSON.stringify({ date: localDateKey(), shown: true })
    );
  } catch {
    // A blocked localStorage costs one extra briefing at most, never a broken UI.
  }
};

const readIdSet = (base: string, userId?: string | null): Set<string> => {
  const out = new Set<string>();
  if (typeof window === 'undefined') return out;
  try {
    const raw = window.localStorage.getItem(scopedKey(base, userId));
    if (!raw) return out;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      for (const id of parsed) if (typeof id === 'string') out.add(id);
    }
  } catch {
    // Unreadable state simply means "nothing seen yet".
  }
  return out;
};

const writeIdSet = (base: string, ids: Set<string>, userId?: string | null, cap = 200): void => {
  try {
    window.localStorage.setItem(
      scopedKey(base, userId),
      JSON.stringify(Array.from(ids).slice(-cap))
    );
  } catch {
    // Best-effort, same as the store above.
  }
};

export const readDropsSeen = (userId?: string | null): Set<string> =>
  readIdSet(DROPS_SEEN_KEY, userId);

export const markDropsSeen = (ids: string[], userId?: string | null): void => {
  if (ids.length === 0) return;
  const seen = readDropsSeen(userId);
  for (const id of ids) seen.add(id);
  writeIdSet(DROPS_SEEN_KEY, seen, userId);
};

export const readVaultSeen = (userId?: string | null): Set<string> =>
  readIdSet(VAULT_SEEN_KEY, userId);

export const markVaultSeen = (companyId: string, userId?: string | null): void => {
  const seen = readVaultSeen(userId);
  if (seen.has(companyId)) return;
  seen.add(companyId);
  writeIdSet(VAULT_SEEN_KEY, seen, userId, 500);
};
