/**
 * GLA University placement-data importer — pure layer.
 *
 * Parses the two files a T&P office exports from its drive log and its student
 * masterfile and maps them onto the `placement_*` schema. Everything here is a
 * pure function: no fs, no pg, no network — so the parsing rules (the fiddly
 * 90%) are unit-testable inside the normal `npm test` chain and the DB-touching
 * half lives alone in `scripts/glaImportCli.ts`.
 *
 * Quirks handled (observed in real GLA exports):
 *  - tab- or comma-separated paste (delimiter sniffed per file).
 *  - the drive log carries BOTH an Excel serial date ("Date") and a display
 *    date ("On": dd.mm.yyyy); either is accepted, dd.mm.yyyy wins.
 *  - counting cells like "0 / 290" (T(E)) and "0 (15)" (T(P)) — the leading
 *    integer is the count, the parenthetical is a note, never added in.
 *  - stray trailing cells on some rows (manually edited files) — ignored.
 *  - packages recorded either as rupees ("350000", "6000000") or as LPA
 *    ("17.50", "6.5"); > 1000 is rupees, /1e5 → LPA. 0 is kept as recorded.
 *  - an offer with a company but no package is kept with ctc_lpa NULL —
 *    the metric engine bands it as "Package not recorded", never drops it
 *    (plan §5 rule 2).
 *  - company names differ between the two files; the drive log is the universe,
 *    student-sheet names normalize onto it, and anything unmatched is surfaced
 *    by `summarize()` for manual alias confirmation — never auto-created.
 *
 * Season rule: a drive in Jul–Dec belongs to YEAR-(YEAR+1), Jan–Jun belongs to
 * (YEAR-1)-YEAR. Aug 2025 → 2025-26, May 2026 → 2025-26, Dec 2023 → 2023-24.
 */

export interface DriveRow {
  seasonId: string;
  referenceNo: string;
  companyName: string;
  officer: string;
  eligibilityBranch: string;
  category: string;
  brand: string | null;
  mode: string;
  date: string | null;
  stipend: number | null;
  packageCtcLpa: number | null;
  courses: string[];
  rounds: number[];
  registered: number | null;
  appeared: number | null;
  selected: number | null;
}

export interface StudentOffer {
  companyName: string;
  ctcLpa: number | null;
}

export interface StudentRow {
  rollNo: string;
  name: string;
  gender: string | null;
  course: string;
  admissionYear: string;
  yearOfStudy: string;
  email: string;
  emailPersonal: string;
  mobile: string;
  fatherMobile: string;
  state: string;
  district: string;
  class10Pct: number | null;
  class12Pct: number | null;
  btechPct: number | null;
  cpi: number | null;
  attendancePct: number | null;
  backlogs: number;
  gapYear: number;
  drivesParticipated: number;
  placed: 'Y' | 'N' | null;
  totalPlaced: number;
  highestPackageCtcLpa: number | null;
  offers: StudentOffer[];
  ejFlag: 'Y' | 'N' | null;
  ejDetails: string;
  attendanceStatus: string;
  blocked: string;
}

export interface ImportSummary {
  driveCount: number;
  distinctCompanies: number;
  seasonIds: string[];
  studentCount: number;
  placedStudents: number;
  offerCount: number;
  /** drives whose date could not be determined — data-quality flag for humans. */
  datelessDriveCount: number;
  /** drive-log reported placed totals, keyed by normalized company name. */
  perCompanyDrivePlaced: Record<string, number>;
  /** student-derived offer counts, keyed by normalized company name. */
  perCompanyOfferCount: Record<string, number>;
  /** offer companies with no drive-log row — queue these for alias confirmation. */
  unmatchedOfferCompanies: string[];
}

// ---------------------------------------------------------------------------
// Fileparsing (CSV or TSV paste)
// ---------------------------------------------------------------------------

export type Delimiter = ',' | '\t';

export function detectDelimiter(text: string): Delimiter {
  const first = (text.split(/\r?\n/).find((l) => l.trim().length > 0) || '').trim();
  const tabs = (first.match(/\t/g) || []).length;
  const commas = (first.match(/,/g) || []).length;
  return tabs > commas ? '\t' : ',';
}

/** Quote-aware CSV/TSV line splitter. Handles embedded delimiters and "" escapes. */
export function parseCsv(text: string, delimiter: Delimiter = ','): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      cur.push(cell);
      cell = '';
    } else if (ch === '\n') {
      cur.push(cell);
      if (cur.some((c) => c.length > 0)) rows.push(cur);
      cur = [];
      cell = '';
    } else if (ch !== '\r') {
      cell += ch;
    }
  }
  if (cell.length || cur.length) cur.push(cell);
  if (cur.some((c) => c.length > 0)) rows.push(cur);
  return rows;
}

export function cleanHeader(h: string): string {
  return String(h || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

type HeaderMap = Map<string, number>;

function headerMap(headers: string[]): HeaderMap {
  const m = new Map<string, number>();
  headers.forEach((h, i) => m.set(cleanHeader(h), i));
  return m;
}

function colIndex(m: HeaderMap, aliases: string[]): number {
  for (const a of aliases) {
    const i = m.get(cleanHeader(a));
    if (i !== undefined) return i;
  }
  return -1;
}

function pickCell(cells: string[], m: HeaderMap, aliases: string[]): string {
  const i = colIndex(m, aliases);
  if (i < 0 || i >= cells.length) return '';
  return (cells[i] || '').trim();
}

// ---------------------------------------------------------------------------
// Value normalizers
// ---------------------------------------------------------------------------

export function normalizeCompanyName(raw: string): string {
  return String(raw || '')
    .toLowerCase()
    .replace(/[“”"']/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[\s,;]+$/g, '')
    .replace(/\.$/, '')
    .trim();
}

/** Leading integer of a counting cell: "0 / 290" → 0, "0 (15)" → 0, "124" → 124. */
export function parseIntLeading(value: string): number | null {
  const m = String(value || '').trim().match(/^(\d+)/);
  return m ? parseInt(m[0], 10) : null;
}

export function parseIntValue(value: string): number {
  return parseIntLeading(value) ?? 0;
}

export function parsePercentValue(value: string): number | null {
  const v = String(value || '').trim().replace('%', '').replace(',', '.').toUpperCase();
  if (v === '' || v === '-' || v === '--' || v === 'NA' || v === 'N/A') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Rupee figure (>1000) → LPA; already-LPA stays. NULL when missing. */
export function toLpa(value: string): number | null {
  const v = String(value || '').trim();
  if (v === '' || v === '-' || v === '--' || v.toUpperCase() === 'NA') return null;
  // "14,00" / "6,50" — comma as a decimal separator. The 1-3 digits,comma,1-2
  // shape keeps "6,500,000" on the thousand-separator branch below.
  const decComma = v.match(/^(\d{1,3})[.,](\d{1,2})$/);
  if (decComma) return Number(`${decComma[1]}.${decComma[2]}`);
  const n = Number(v.replace(/,/g, ''));
  if (!Number.isFinite(n)) {
    const m = v.match(/\d+(?:\.\d+)?/);
    return m ? toLpa(m[0]) : null;
  }
  if (n > 1000) return Math.round((n / 100000) * 100) / 100;
  return Math.round(n * 100) / 100;
}

export function excelSerialToIso(serial: number): string {
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000);
  return d.toISOString().slice(0, 10);
}

/** Days since 1899-12-30 (the Excel serial origin) for a YYYY-MM-DD date. */
export function toSerialDays(isoDate: string): number {
  const ms = Date.parse(isoDate + 'T00:00:00Z');
  return Number.isFinite(ms) ? Math.round((ms + 2209161600000) / 86400000) : NaN;
}

/** dd.mm.yyyy only. The "On" column is a display date — a serial misread here
 *  invented year-2064 dates out of shifted rows, so serials only ever live in
 *  the "Date" column and this function deliberately has no serial branch. */
export function parseDisplayDate(value: string): string | null {
  const v = String(value || '').trim();
  if (!v) return null;
  const dm = v.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (!dm) return null;
  const d = +dm[1];
  const mo = +dm[2];
  const y = +dm[3];
  if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return null;
}

/** dd.mm.yyyy (their "On" column) or an Excel serial, both → YYYY-MM-DD. */
export function parseDateCell(value: string): string | null {
  const v = String(value || '').trim();
  if (!v) return null;
  const dm = v.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dm) {
    const d = +dm[1];
    const mo = +dm[2];
    const y = +dm[3];
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  const serial = Number(v);
  if (Number.isInteger(serial) && serial >= 30000 && serial <= 60000) return excelSerialToIso(serial);
  return null;
}

export function seasonForDate(isoDate: string | null, fallback = '2025-26'): string {
  if (!isoDate) return fallback;
  const m = isoDate.match(/^(\d{4})-(\d{2})/);
  if (!m) return fallback;
  const y = +m[1];
  const mo = +m[2];
  return mo >= 7 ? `${y}-${String((y + 1) % 100).padStart(2, '0')}` : `${y - 1}-${String(y % 100).padStart(2, '0')}`;
}

export function parseDriveMode(value: string): string {
  const v = String(value || '').trim().toLowerCase();
  if (v.includes('on campus') || v.includes('oncampus')) return 'On Campus';
  if (v.includes('off campus') || v.includes('offcampus')) return 'Off Campus';
  if (v.includes('online')) return 'Online Campus';
  if (v.includes('pool')) return 'Pool';
  return String(value || '').trim();
}

export function parseYesNo(value: string): 'Y' | 'N' | null {
  const v = String(value || '').trim().toUpperCase();
  if (v === 'Y' || v === 'YES') return 'Y';
  if (v === 'N' || v === 'NO') return 'N';
  return null;
}

export function parseGender(value: string): 'Male' | 'Female' | null {
  const v = String(value || '').trim().toUpperCase();
  if (v === 'M' || v === 'MALE') return 'Male';
  if (v === 'F' || v === 'FEMALE') return 'Female';
  return null;
}

export function splitList(value: string): string[] {
  return String(value || '')
    .split(/[\/;,|]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseRounds(value: string): number[] {
  const out: number[] = [];
  for (const t of String(value || '').trim().split(/\s+/)) {
    const n = parseIntLeading(t);
    if (n !== null) out.push(n);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Drive-log mapping
// ---------------------------------------------------------------------------

const DRIVE_HEADERS: Record<keyof Pick<
  DriveRow,
  | 'referenceNo'
  | 'companyName'
  | 'officer'
  | 'eligibilityBranch'
  | 'category'
  | 'brand'
  | 'mode'
  | 'stipend'
  | 'packageCtcLpa'
  | 'courses'
  | 'rounds'
  | 'registered'
  | 'appeared'
>, string[]> = {
  referenceNo: ['reference no.', 'reference no', 'ref no', 'reference'],
  companyName: ['company name', 'company', 'companyname'],
  officer: ['officer name', 'officer'],
  eligibilityBranch: ['branch', 'program / branch', 'program/branch'],
  category: ['cat', 'cat.', 'category'],
  brand: ['brand'],
  mode: ['type'],
  stipend: ['stipend'],
  packageCtcLpa: ['package', 'package (lpa)', 'package lpa'],
  courses: ['courses'],
  rounds: ['rounds'],
  registered: ['t(e)', 't e', 'total eligible', 'total eligible(t(e))', 'te'],
  appeared: ['t(a)', 't a', 'total appeared', 'ta'],
};

export function parseDriveLog(rows: string[][]): DriveRow[] {
  if (!rows.length) return [];
  const hm = headerMap(rows[0]);

  // Some exports carry serial dates that sit a fixed number of days off the
  // standard Excel origin (the real GLA file is off by 13). The "On" column is
  // authoritative, so the import calibrates the serial origin from the first
  // row that carries both values, then applies it to serial-only rows.
  interface Pending {
    cells: string[];
    serial: number | null;
    onIso: string | null;
    dateDisplayIso: string | null;
    shifted: boolean;
  }
  const pending: Pending[] = [];
  let serialOffset = 0;
  let offsetSet = false;
  for (let r = 1; r < rows.length; r++) {
    const c = rows[r];
    const companyName = pickCell(c, hm, DRIVE_HEADERS.companyName);
    if (!companyName) continue;
    const serialRaw = pickCell(c, hm, ['date']);
    const serial = /^\d{5}$/.test(serialRaw) ? Number(serialRaw) : null;
    const onRaw = pickCell(c, hm, ['on', 'date on']);
    const onIso = parseDisplayDate(onRaw);
    const dateDisplayIso = serial === null ? parseDisplayDate(serialRaw) : null;
    // A shifted row carries the display date in the "Date" cell (its "On" slot
    // holds a number — a stipend). Everything else is realigned in pass 2.
    const shifted = onRaw !== '' && onIso === null && dateDisplayIso !== null;
    if (!offsetSet && serial !== null && onIso) {
      serialOffset = serial - toSerialDays(onIso);
      offsetSet = true;
    }
    pending.push({ cells: c, serial, onIso, dateDisplayIso, shifted });
  }

  const out: DriveRow[] = [];
  for (const { cells: c, serial, onIso, dateDisplayIso, shifted } of pending) {
    // Realigned rows restore Branch..T(P) to their labelled columns; the date
    // is recovered from the "Date" cell rather than inventing a serial out of
    // the stipend number living in the "On" slot.
    const ac = shifted ? realignDriveCells(c, hm) : c;
    const date = onIso ?? dateDisplayIso ?? (serial !== null ? excelSerialToIso(serial + serialOffset) : null);
    const placedCol = pickCell(ac, hm, ['placed']);
    const tPCol = pickCell(ac, hm, ['t(p)', 't p', 'total placed', 'tp']);
    const selected = parseIntLeading(placedCol) ?? parseIntLeading(tPCol);
    out.push({
      seasonId: seasonForDate(date),
      referenceNo: pickCell(ac, hm, DRIVE_HEADERS.referenceNo),
      companyName: pickCell(ac, hm, DRIVE_HEADERS.companyName),
      officer: pickCell(ac, hm, DRIVE_HEADERS.officer),
      eligibilityBranch: pickCell(ac, hm, DRIVE_HEADERS.eligibilityBranch),
      category: pickCell(ac, hm, DRIVE_HEADERS.category),
      brand: parseYesNo(pickCell(ac, hm, DRIVE_HEADERS.brand)),
      mode: parseDriveMode(pickCell(ac, hm, DRIVE_HEADERS.mode)),
      date,
      stipend: toLpa(pickCell(ac, hm, DRIVE_HEADERS.stipend)),
      packageCtcLpa: toLpa(pickCell(ac, hm, DRIVE_HEADERS.packageCtcLpa)),
      courses: splitList(pickCell(ac, hm, DRIVE_HEADERS.courses)),
      rounds: parseRounds(pickCell(ac, hm, DRIVE_HEADERS.rounds)),
      registered: parseIntLeading(pickCell(ac, hm, DRIVE_HEADERS.registered)),
      appeared: parseIntLeading(pickCell(ac, hm, DRIVE_HEADERS.appeared)),
      selected,
    });
  }
  return out;
}

/**
 * Realigns a column-shifted GLA drive row back onto the export header.
 *
 * Rows from Dec-2022 → Apr-2024 are missing the empty "Program" column, so the
 * Branch..T(P) block sits one column left of the labels: the "Date" slot then
 * holds the display date and the "On" slot the stipend. Type, Date, On and
 * Placed keep their labelled columns because that same block carries one stray
 * blank just before "Type". Copying each shifted block column from one cell to
 * the left restores the header alignment. Cells the parser never labels (the
 * stray blank, the trailing column) are left untouched.
 */
function realignDriveCells(cells: string[], hm: HeaderMap): string[] {
  const block = [
    DRIVE_HEADERS.eligibilityBranch,
    DRIVE_HEADERS.category,
    DRIVE_HEADERS.brand,
    DRIVE_HEADERS.stipend,
    DRIVE_HEADERS.packageCtcLpa,
    DRIVE_HEADERS.courses,
    DRIVE_HEADERS.rounds,
    DRIVE_HEADERS.registered,
    DRIVE_HEADERS.appeared,
  ];
  const ac = cells.slice();
  for (const aliases of block) {
    const i = colIndex(hm, aliases);
    if (i < 1 || i >= cells.length) continue;
    ac[i] = cells[i - 1];
  }
  return ac;
}

// ---------------------------------------------------------------------------
// Source-row quality signals (drives)
// ---------------------------------------------------------------------------

export interface DriveRowIssues {
  /** Rows where the On slot holds a number (e.g. a stipend) instead of a date —
   *  the source columns are shifted there. The date is recovered from the Date
   *  cell, but categorical/numeric fields of those rows are unreliable. */
  shifted: number;
  /** Rows with no date anywhere (no On, no serial, no display Date). */
  dateless: number;
}

export function driveRowIssues(rows: string[][]): DriveRowIssues {
  if (!rows.length) return { shifted: 0, dateless: 0 };
  const hm = headerMap(rows[0]);
  let shifted = 0;
  let dateless = 0;
  for (let r = 1; r < rows.length; r++) {
    const c = rows[r];
    if (!pickCell(c, hm, DRIVE_HEADERS.companyName)) continue;
    const serialRaw = pickCell(c, hm, ['date']);
    const serial = /^\d{5}$/.test(serialRaw) ? Number(serialRaw) : null;
    const onRaw = pickCell(c, hm, ['on', 'date on']);
    const onIso = parseDisplayDate(onRaw);
    const dateDisplayIso = parseDisplayDate(serialRaw);
    if (!onIso && dateDisplayIso !== null && onRaw !== '') shifted++;
    if (!onIso && dateDisplayIso === null && serial === null) dateless++;
  }
  return { shifted, dateless };
}

// ---------------------------------------------------------------------------
// Student-masterfile mapping
// ---------------------------------------------------------------------------

const PROFILE_HEADERS: Record<string, string[]> = {
  rollNo: ['roll no', 'roll no.', 'roll'],
  name: ['name'],
  gender: ['gen.', 'gen', 'gender'],
  course: ['course'],
  admissionYear: ['batch'],
  yearOfStudy: ['yr.', 'yr', 'year of study', 'year'],
  email: ['email'],
  emailPersonal: ['email (per)', 'email per', 'personal email'],
  mobile: ['mob(s)', 'mob s', 'mobile', 'mobile no', 'mobile no.'],
  fatherMobile: ['mob(f)', 'mob f', 'father mobile', 'father no'],
  state: ['state'],
  district: ['district'],
  class10Pct: ['10%', '10th %', 'x %'],
  class12Pct: ['12%', '12th %', 'xii %'],
  btechPct: ['c%', 'b.tech %', 'btech %'],
  cpi: ['cpi'],
  attendancePct: ['att%', 'att', 'attendance%', 'attendance %', 'attendance'],
  backlogs: ['c.o.', 'c o', 'c.o', 'backlogs', 'current backlogs', 'current backlog'],
  gapYear: ['gap(a)', 'gap a', 'gap'],
  drivesParticipated: ['drive (participated)', 'drive participated', 'drives participated', 'drive', 'participated'],
  placed: ['placed'],
  totalPlaced: ['total placed'],
  highestPackage: ['highest package', 'highest pacakage'],
  ejFlag: ['is ej', 'is ej?', 'ej', 'is ej ?'],
  ejDetails: ['ej details'],
  attendanceStatus: ['attendance status'],
  blocked: ['blocked'],
};

function companyPlacedAliases(k: number): string[] {
  return [`company placed-${k}`, `company placed ${k}`, `company placed${k}`];
}

function packagesAliases(k: number): string[] {
  return [`packages-${k}`, `packages ${k}`, `packages${k}`];
}

export function parseStudentMaster(rows: string[][]): StudentRow[] {
  if (!rows.length) return [];
  const hm = headerMap(rows[0]);
  const out: StudentRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const c = rows[r];
    const roll = pickCell(c, hm, PROFILE_HEADERS.rollNo);
    if (!roll) continue;
    const placedRaw = pickCell(c, hm, PROFILE_HEADERS.placed).toUpperCase();
    const placed = placedRaw === 'Y' ? 'Y' : placedRaw === 'N' ? 'N' : null;
    const ejRaw = pickCell(c, hm, PROFILE_HEADERS.ejFlag).toUpperCase();
    const ejFlag = ejRaw === 'Y' ? 'Y' : ejRaw === 'N' ? 'N' : null;

    const offers: StudentOffer[] = [];
    let highest = toLpa(pickCell(c, hm, PROFILE_HEADERS.highestPackage));
    for (let k = 1; k <= 4; k++) {
      const companyName = pickCell(c, hm, companyPlacedAliases(k));
      if (!companyName) continue;
      const ctcLpa = toLpa(pickCell(c, hm, packagesAliases(k)));
      offers.push({ companyName, ctcLpa });
      if (highest === null && ctcLpa !== null) highest = ctcLpa;
    }

    out.push({
      rollNo: roll,
      name: pickCell(c, hm, PROFILE_HEADERS.name),
      gender: parseGender(pickCell(c, hm, PROFILE_HEADERS.gender)),
      course: pickCell(c, hm, PROFILE_HEADERS.course),
      admissionYear: pickCell(c, hm, PROFILE_HEADERS.admissionYear),
      yearOfStudy: pickCell(c, hm, PROFILE_HEADERS.yearOfStudy),
      email: pickCell(c, hm, PROFILE_HEADERS.email),
      emailPersonal: pickCell(c, hm, PROFILE_HEADERS.emailPersonal),
      mobile: pickCell(c, hm, PROFILE_HEADERS.mobile),
      fatherMobile: pickCell(c, hm, PROFILE_HEADERS.fatherMobile),
      state: pickCell(c, hm, PROFILE_HEADERS.state),
      district: pickCell(c, hm, PROFILE_HEADERS.district),
      class10Pct: parsePercentValue(pickCell(c, hm, PROFILE_HEADERS.class10Pct)),
      class12Pct: parsePercentValue(pickCell(c, hm, PROFILE_HEADERS.class12Pct)),
      btechPct: parsePercentValue(pickCell(c, hm, PROFILE_HEADERS.btechPct)),
      cpi: parsePercentValue(pickCell(c, hm, PROFILE_HEADERS.cpi)),
      attendancePct: parsePercentValue(pickCell(c, hm, PROFILE_HEADERS.attendancePct)),
      backlogs: parseIntValue(pickCell(c, hm, PROFILE_HEADERS.backlogs)),
      gapYear: parseIntValue(pickCell(c, hm, PROFILE_HEADERS.gapYear)),
      drivesParticipated: parseIntValue(pickCell(c, hm, PROFILE_HEADERS.drivesParticipated)),
      placed,
      totalPlaced: parseIntValue(pickCell(c, hm, PROFILE_HEADERS.totalPlaced)),
      highestPackageCtcLpa: highest,
      offers,
      ejFlag,
      ejDetails: pickCell(c, hm, PROFILE_HEADERS.ejDetails),
      attendanceStatus: pickCell(c, hm, PROFILE_HEADERS.attendanceStatus),
      blocked: pickCell(c, hm, PROFILE_HEADERS.blocked),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Reconciliation summary
// ---------------------------------------------------------------------------

export function summarize(drives: DriveRow[], students: StudentRow[]): ImportSummary {
  const knownCompanies = new Set<string>();
  const perCompanyDrivePlaced: Record<string, number> = {};
  const seasonIds = new Set<string>();
  for (const d of drives) {
    const key = normalizeCompanyName(d.companyName);
    knownCompanies.add(key);
    seasonIds.add(d.seasonId);
    if (d.selected !== null) perCompanyDrivePlaced[key] = (perCompanyDrivePlaced[key] || 0) + d.selected;
  }

  const perCompanyOfferCount: Record<string, number> = {};
  const unmatched: string[] = [];
  let offerCount = 0;
  for (const s of students) {
    for (const o of s.offers) {
      offerCount++;
      const key = normalizeCompanyName(o.companyName);
      perCompanyOfferCount[key] = (perCompanyOfferCount[key] || 0) + 1;
      if (!knownCompanies.has(key) && !unmatched.includes(key)) unmatched.push(key);
    }
  }

  return {
    driveCount: drives.length,
    distinctCompanies: knownCompanies.size,
    seasonIds: Array.from(seasonIds).sort(),
    studentCount: students.length,
    placedStudents: students.filter((s) => s.placed === 'Y').length,
    offerCount,
    datelessDriveCount: drives.filter((d) => !d.date).length,
    perCompanyDrivePlaced,
    perCompanyOfferCount,
    unmatchedOfferCompanies: unmatched.sort(),
  };
}