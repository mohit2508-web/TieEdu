/**
 * Campus intel (D1 + D2): what a student's own college knows about a company.
 *
 *  D1 placement history — the placement officer records, per company and year,
 *     how many students were selected, the CGPA cut-off, backlogs allowed and a
 *     short note ("two coding questions in the online test").
 *  D2 senior notes — a placed student leaves a note for juniors of the same
 *     college. Notes are moderated by that college's placement officer before
 *     anyone sees them, and shown without names: only the batch/branch label
 *     the senior chose.
 *
 * Both live in the JSON store, keyed by the placement database's college_id,
 * like campus pages: no schema change to the placement database. Which college
 * a student belongs to comes from the placement database (playerCollegeIds),
 * so the callers pass college ids in and this module stays testable.
 */
import crypto from 'crypto';

export const NOTE_MIN = 20;
export const NOTE_MAX = 800;
export const HISTORY_NOTE_MAX = 300;
export const LABEL_MAX = 40;

export interface HistoryRow {
  id: string;
  college_id: string;
  company_slug: string;
  year: number;
  selected: number | null;
  cgpa_cutoff: number | null;
  backlogs_allowed: number | null;
  note: string;
  updated_by: string;
  updated_at: string;
}

export type NoteStatus = 'pending' | 'approved' | 'rejected';
export interface SeniorNote {
  id: string;
  college_id: string;
  company_slug: string;
  author_id: string;
  label: string;
  body: string;
  status: NoteStatus;
  created_at: string;
  moderated_by: string | null;
  moderated_at: string | null;
}

export class IntelError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function historyOf(db: any): HistoryRow[] {
  if (!Array.isArray(db.campus_history)) db.campus_history = [];
  return db.campus_history;
}
export function notesOf(db: any): SeniorNote[] {
  if (!Array.isArray(db.senior_notes)) db.senior_notes = [];
  return db.senior_notes;
}

const companyBySlug = (db: any, slug: string) => (db.companies || []).find((c: any) => c.slug === slug && c.status === 'published');
const optNum = (v: unknown, min: number, max: number, int = false): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max || (int && !Number.isInteger(n))) throw new IntelError(400, 'A number is out of range.');
  return n;
};

/** Create or replace the row for (college, company, year). */
export function upsertHistory(db: any, collegeId: string, by: string, input: any, now = new Date()): HistoryRow {
  const slug = String(input?.company_slug || '');
  if (!companyBySlug(db, slug)) throw new IntelError(400, 'Choose a company.');
  const year = Number(input?.year);
  if (!Number.isInteger(year) || year < 2000 || year > now.getUTCFullYear()) throw new IntelError(400, 'Enter a past placement year.');
  const row: HistoryRow = {
    id: '',
    college_id: collegeId,
    company_slug: slug,
    year,
    selected: optNum(input?.selected, 0, 100000, true),
    cgpa_cutoff: optNum(input?.cgpa_cutoff, 0, 10),
    backlogs_allowed: optNum(input?.backlogs_allowed, 0, 50, true),
    note: String(input?.note || '').trim().slice(0, HISTORY_NOTE_MAX),
    updated_by: by,
    updated_at: now.toISOString(),
  };
  const list = historyOf(db);
  const i = list.findIndex((r) => r.college_id === collegeId && r.company_slug === slug && r.year === year);
  row.id = i >= 0 ? list[i].id : `ch-${crypto.randomBytes(6).toString('hex')}`;
  if (i >= 0) list[i] = row;
  else list.push(row);
  return row;
}

export function deleteHistory(db: any, collegeId: string, id: string): boolean {
  const list = historyOf(db);
  const i = list.findIndex((r) => r.id === id && r.college_id === collegeId);
  if (i === -1) return false;
  list.splice(i, 1);
  return true;
}

export function addNote(db: any, authorId: string, collegeIds: string[], input: any, now = new Date()): SeniorNote {
  if (collegeIds.length === 0) throw new IntelError(403, 'Only students linked to a college can leave notes for it.');
  const collegeId = input?.college_id ? String(input.college_id) : collegeIds[0];
  if (!collegeIds.includes(collegeId)) throw new IntelError(403, 'You can only write for your own college.');
  const slug = String(input?.company_slug || '');
  if (!companyBySlug(db, slug)) throw new IntelError(400, 'Choose a company.');
  const body = String(input?.body || '').trim();
  if (body.length < NOTE_MIN) throw new IntelError(400, `Write at least ${NOTE_MIN} characters — one real tip is enough.`);
  if (body.length > NOTE_MAX) throw new IntelError(400, `Keep it under ${NOTE_MAX} characters.`);
  if (/(https?:\/\/|www\.|\b\d{10}\b|@[a-z0-9-]+\.[a-z]{2,})/i.test(body)) {
    throw new IntelError(400, 'Leave out links, phone numbers and email addresses — juniors can reach you through your placement cell.');
  }
  const pendingFromMe = notesOf(db).filter((n) => n.author_id === authorId && n.status === 'pending').length;
  if (pendingFromMe >= 5) throw new IntelError(429, 'You have five notes waiting for review. Try again once they are checked.');
  const note: SeniorNote = {
    id: `sn-${crypto.randomBytes(6).toString('hex')}`,
    college_id: collegeId,
    company_slug: slug,
    author_id: authorId,
    label: String(input?.label || '').trim().slice(0, LABEL_MAX),
    body,
    status: 'pending',
    created_at: now.toISOString(),
    moderated_by: null,
    moderated_at: null,
  };
  notesOf(db).push(note);
  return note;
}

export function deleteMyNote(db: any, authorId: string, id: string): boolean {
  const list = notesOf(db);
  const i = list.findIndex((n) => n.id === id && n.author_id === authorId);
  if (i === -1) return false;
  list.splice(i, 1);
  return true;
}

export function moderateNote(db: any, collegeId: string, id: string, status: unknown, by: string, now = new Date()): SeniorNote {
  if (status !== 'approved' && status !== 'rejected') throw new IntelError(400, 'Approve or reject.');
  const note = notesOf(db).find((n) => n.id === id && n.college_id === collegeId);
  if (!note) throw new IntelError(404, 'Not found.');
  note.status = status;
  note.moderated_by = by;
  note.moderated_at = now.toISOString();
  return note;
}

/** A note as other students see it: no author id, ever. */
const publicNote = (n: SeniorNote) => ({ id: n.id, label: n.label || 'A senior', body: n.body, created_at: n.created_at });

/**
 * What a student sees on a company page: their colleges' history for this
 * company (newest year first) and approved senior notes. Their own notes come
 * back separately with their status, so they can see and delete them.
 */
export function intelFor(db: any, userId: string, collegeIds: string[], companySlug: string) {
  const mine = new Set(collegeIds);
  const history = historyOf(db)
    .filter((r) => mine.has(r.college_id) && r.company_slug === companySlug)
    .sort((a, b) => b.year - a.year)
    .map(({ id, year, selected, cgpa_cutoff, backlogs_allowed, note }) => ({ id, year, selected, cgpa_cutoff, backlogs_allowed, note }));
  const notes = notesOf(db)
    .filter((n) => mine.has(n.college_id) && n.company_slug === companySlug && n.status === 'approved')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(publicNote);
  const my_notes = notesOf(db)
    .filter((n) => n.author_id === userId && n.company_slug === companySlug)
    .map((n) => ({ ...publicNote(n), status: n.status }));
  return { linked: collegeIds.length > 0, history, notes, my_notes };
}

/** The placement officer's view: their history rows and the notes queue. */
export function tpoIntel(db: any, collegeId: string) {
  return {
    history: historyOf(db).filter((r) => r.college_id === collegeId).sort((a, b) => b.year - a.year || a.company_slug.localeCompare(b.company_slug)),
    notes: notesOf(db)
      .filter((n) => n.college_id === collegeId)
      .sort((a, b) => Number(a.status !== 'pending') - Number(b.status !== 'pending') || b.created_at.localeCompare(a.created_at))
      .map((n) => ({ id: n.id, company_slug: n.company_slug, label: n.label, body: n.body, status: n.status, created_at: n.created_at })),
  };
}
