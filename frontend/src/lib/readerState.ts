// ============================================================================
// READER STATE — Phase 3, MOBILE_APP_UI_PLAN.md §3.2
//
// "Bookmark" and "Mark solved" in the reader's bottom bar need somewhere to live.
// There is no server endpoint for either, so they are stored per module in
// `localStorage` and are therefore **device-local**: clearing site data clears
// them, and they do not follow a student to another phone.
//
// That is a deliberate, stated limitation rather than an oversight. The plan asks
// for the affordance; inventing a sync endpoint would be a backend change to a
// checkout-critical surface at 2am. When the server gains these, `readState` and
// `writeState` are the only two functions that need replacing.
//
// Every read is defensive. `localStorage` throws outright in Safari private mode
// and returns `null` from `getItem` in a sandboxed frame, and a reader that
// throws on mount is a blank page.
// ============================================================================

export interface ReaderState {
  /** The section the student last bookmarked, or null. */
  bookmark: string | null;
  /** Indices into `interview_questions` the student has marked solved. */
  solved: number[];
}

export const emptyReaderState: ReaderState = { bookmark: null, solved: [] };

const KEY_PREFIX = 'tierdu:reader:';

/**
 * Keyed by module id and company slug together. Module ids are only unique
 * within a company, so keying on the id alone lets a student bookmark a section
 * in one company's vault and land on a same-numbered section of another.
 */
export const readerStateKey = (companySlug: string, moduleId: number | string): string =>
  `${KEY_PREFIX}${companySlug}:${moduleId}`;

/** Parse without trusting the shape — this string is user-writable. */
export const parseReaderState = (raw: string | null): ReaderState => {
  if (!raw) return emptyReaderState;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return emptyReaderState;
    const bookmark = typeof parsed.bookmark === 'string' ? parsed.bookmark : null;
    const solved = Array.isArray(parsed.solved)
      ? parsed.solved.filter((n: unknown): n is number => typeof n === 'number' && Number.isFinite(n))
      : [];
    return { bookmark, solved };
  } catch {
    // A corrupt entry must not take the reader down with it.
    return emptyReaderState;
  }
};

export const serializeReaderState = (state: ReaderState): string => JSON.stringify(state);

/** Toggle a question's solved flag. Pure, so the mutation is testable. */
export const toggleSolved = (state: ReaderState, index: number): ReaderState => {
  const solved = state.solved.includes(index)
    ? state.solved.filter((n) => n !== index)
    : [...state.solved, index].sort((a, b) => a - b);
  return { ...state, solved };
};

/**
 * The subset of `Storage` this module uses.
 *
 * Spelled out and reached through `globalThis` rather than `window` so the
 * module compiles in the test runner, which type-checks suites without the DOM
 * lib. It also means these two functions can be exercised against a fake.
 */
interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const localStore = (): StorageLike | null => {
  try {
    return (globalThis as { localStorage?: StorageLike }).localStorage ?? null;
  } catch {
    // Reading the property itself throws when storage is blocked by policy.
    return null;
  }
};

/**
 * `window` is absent during SSR and in tests. Both cases return the default
 * rather than throwing, so a caller never has to guard the call.
 */
export const readState = (companySlug: string, moduleId: number | string): ReaderState => {
  const store = localStore();
  if (!store) return emptyReaderState;
  try {
    return parseReaderState(store.getItem(readerStateKey(companySlug, moduleId)));
  } catch {
    return emptyReaderState;
  }
};

export const writeState = (
  companySlug: string,
  moduleId: number | string,
  state: ReaderState
): void => {
  const store = localStore();
  if (!store) return;
  try {
    store.setItem(readerStateKey(companySlug, moduleId), serializeReaderState(state));
  } catch {
    // Private mode, or the quota is full. The reader keeps working in memory;
    // it just forgets on reload.
  }
};
