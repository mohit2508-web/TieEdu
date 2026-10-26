// ============================================================================
// Campus intel (lib/campusIntel): placement history and senior notes.
//
// The rules that matter: everything is scoped to the student's own colleges;
// notes are invisible until that college approves them; no author id ever
// reaches another student; and a college can only touch its own rows.
// ============================================================================

import { addNote, deleteHistory, deleteMyNote, intelFor, IntelError, moderateNote, tpoIntel, upsertHistory } from '../src/lib/campusIntel';

let pass = 0;
let fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) pass++;
  else {
    fail++;
    console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}
function status(name: string, fn: () => unknown, expected: number) {
  try { fn(); fail++; console.log(`FAIL ${name}: accepted`); } catch (e: any) { check(name, e instanceof IntelError ? e.status : e?.message, expected); }
}

const now = new Date('2026-10-27T06:30:00Z');
const mkDb = (): any => ({ companies: [{ id: 'c1', slug: 'acme', name: 'Acme', status: 'published' }, { id: 'c2', slug: 'hidden', status: 'draft' }] });
const tip = 'Two coding questions in the online test, both on arrays. Practise sliding window.';

// --- history ------------------------------------------------------------------------
{
  const db = mkDb();
  status('unknown company', () => upsertHistory(db, 'colA', 'tpo', { company_slug: 'nope', year: 2025 }, now), 400);
  status('unpublished company', () => upsertHistory(db, 'colA', 'tpo', { company_slug: 'hidden', year: 2025 }, now), 400);
  status('a future year', () => upsertHistory(db, 'colA', 'tpo', { company_slug: 'acme', year: 2030 }, now), 400);
  status('a CGPA above 10', () => upsertHistory(db, 'colA', 'tpo', { company_slug: 'acme', year: 2025, cgpa_cutoff: 11 }, now), 400);
  const r1 = upsertHistory(db, 'colA', 'tpo', { company_slug: 'acme', year: 2025, selected: 41, cgpa_cutoff: 6.5, note: 'OA had 2 coding questions' }, now);
  const r2 = upsertHistory(db, 'colA', 'tpo', { company_slug: 'acme', year: 2025, selected: 43, cgpa_cutoff: '6.5' }, now);
  check('same college+company+year updates in place', [r2.id === r1.id, db.campus_history.length, r2.selected], [true, 1, 43]);
  upsertHistory(db, 'colA', 'tpo', { company_slug: 'acme', year: 2024, selected: 30 }, now);
  upsertHistory(db, 'colB', 'tpo', { company_slug: 'acme', year: 2025, selected: 99 }, now);
  check('a student sees only their college, newest year first', intelFor(db, 'stu', ['colA'], 'acme').history.map((h) => [h.year, h.selected]), [[2025, 43], [2024, 30]]);
  check('another college cannot delete it', deleteHistory(db, 'colB', r1.id), false);
  check('its own college can', deleteHistory(db, 'colA', r1.id), true);
}

// --- senior notes ---------------------------------------------------------------------------
{
  const db = mkDb();
  status('not linked to any college', () => addNote(db, 'senior', [], { company_slug: 'acme', body: tip }, now), 403);
  status('writing for a college that is not yours', () => addNote(db, 'senior', ['colA'], { company_slug: 'acme', body: tip, college_id: 'colB' }, now), 403);
  status('too short', () => addNote(db, 'senior', ['colA'], { company_slug: 'acme', body: 'gl' }, now), 400);
  status('no phone numbers or links', () => addNote(db, 'senior', ['colA'], { company_slug: 'acme', body: tip + ' Call me 9876543210' }, now), 400);
  const n = addNote(db, 'senior', ['colA'], { company_slug: 'acme', body: tip, label: '2025 batch, CSE' }, now);
  check('a new note waits for review', n.status, 'pending');
  check('juniors do not see it yet', intelFor(db, 'junior', ['colA'], 'acme').notes.length, 0);
  check('the author sees it with its status', intelFor(db, 'senior', ['colA'], 'acme').my_notes.map((x) => x.status), ['pending']);
  status('another college cannot moderate it', () => moderateNote(db, 'colB', n.id, 'approved', 'tpoB', now), 404);
  status('only approve or reject', () => moderateNote(db, 'colA', n.id, 'maybe', 'tpoA', now), 400);
  moderateNote(db, 'colA', n.id, 'approved', 'tpoA', now);
  const seen = intelFor(db, 'junior', ['colA'], 'acme');
  check('approved: juniors of the same college see it', seen.notes.map((x) => x.label), ['2025 batch, CSE']);
  check('no author id reaches another student', JSON.stringify(seen).includes('senior'), false);
  check('students of other colleges do not see it', intelFor(db, 'other', ['colB'], 'acme').notes.length, 0);
  check('the TPO queue lists it', tpoIntel(db, 'colA').notes.map((x) => x.status), ['approved']);
  check('only the author can delete it', [deleteMyNote(db, 'junior', n.id), deleteMyNote(db, 'senior', n.id)], [false, true]);
  for (let i = 0; i < 5; i++) addNote(db, 'spammer', ['colA'], { company_slug: 'acme', body: `${tip} #${i}` }, now);
  status('five pending notes per author at most', () => addNote(db, 'spammer', ['colA'], { company_slug: 'acme', body: tip }, now), 429);
}

console.log(`\ncampus-intel: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
