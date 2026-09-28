/**
 * Date formatting that is stable across timezones, locales and SSR hydration.
 *
 * The rule this file exists to enforce: never hand a date to
 * `toLocaleDateString` when the result is rendered into HTML that React
 * hydrates. That call depends on the host timezone *and* the host's ICU data, so
 * the server and the browser can legitimately disagree — React then throws the
 * subtree away and re-renders — and a user in a negative-offset zone sees a date
 * a day earlier than everyone else.
 *
 * Everything here formats the components directly. No `Date` is involved for a
 * date-only string, and a full timestamp is read in UTC so the instant is the
 * same everywhere.
 */

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

const isRealCalendarDate = (year: number, month: number, day: number) => {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  // Reject things like 31 Feb, which Date would silently roll into March.
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
};

/**
 * "12 Mar 2026".
 *
 * A date-only string is read as a calendar date, exactly as written. A full
 * timestamp is rendered in UTC. Returns null for anything unparseable.
 */
export function formatDay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const trimmed = String(iso).trim();

  const calendar = DATE_ONLY.exec(trimmed);
  if (calendar) {
    const year = Number(calendar[1]);
    const month = Number(calendar[2]);
    const day = Number(calendar[3]);
    if (!isRealCalendarDate(year, month, day)) return null;
    return `${String(day).padStart(2, '0')} ${MONTHS[month - 1]} ${year}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return formatComponents(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, parsed.getUTCDate());
}

/** "12 Mar 2026" for values that are already `Date`s (or null). */
export function formatDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return formatComponents(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  }
  return formatDay(value);
}

const formatComponents = (year: number, month: number, day: number) =>
  `${String(day).padStart(2, '0')} ${MONTHS[month - 1]} ${year}`;

/**
 * "12 March 2026" — the long-month spelling used for prose like "Joined".
 * Same stability guarantees as `formatDay`.
 */
export function formatDateLong(value: Date | string | null | undefined): string | null {
  if (!value) return null;

  const year: number | null = (() => {
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return null;
      return value.getUTCFullYear();
    }
    const trimmed = String(value).trim();
    const calendar = DATE_ONLY.exec(trimmed);
    if (calendar) {
      const y = Number(calendar[1]);
      const m = Number(calendar[2]);
      const d = Number(calendar[3]);
      return isRealCalendarDate(y, m, d) ? y : null;
    }
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.getUTCFullYear();
  })();

  if (year === null) return null;

  const month: number = (() => {
    if (value instanceof Date) return value.getUTCMonth() + 1;
    const calendar = DATE_ONLY.exec(String(value).trim());
    if (calendar) return Number(calendar[2]);
    return new Date(String(value).trim()).getUTCMonth() + 1;
  })();

  const day: number = (() => {
    if (value instanceof Date) return value.getUTCDate();
    const calendar = DATE_ONLY.exec(String(value).trim());
    if (calendar) return Number(calendar[3]);
    return new Date(String(value).trim()).getUTCDate();
  })();

  return `${day} ${MONTHS_LONG[month - 1]} ${year}`;
}
