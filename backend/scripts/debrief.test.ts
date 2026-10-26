// ============================================================================
// Rejection debrief (lib/debrief). Validation, a plan that follows what went
// wrong, and the privacy rules: notes stay with their author, and peer numbers
// appear only once PEER_MIN distinct students have logged a company.
// ============================================================================

import { createDebrief, debriefView, deleteDebrief, myDebriefs, peerView, PEER_MIN, DebriefError } from '../src/lib/debrief';

let pass = 0;
let fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) pass++;
  else {
    fail++;
    console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}
function rejects(name: string, fn: () => unknown) {
  try { fn(); fail++; console.log(`FAIL ${name}: accepted`); } catch (e) { check(name, e instanceof DebriefError, true); }
}

const mkDb = (): any => ({
  users: Array.from({ length: 8 }, (_, i) => ({ id: `u${i}` })),
  companies: [
    { id: 'c1', slug: 'acme', name: 'Acme', status: 'published', modules: [] },
    { id: 'c2', slug: 'draftco', name: 'Draft Co', status: 'draft', modules: [] },
  ],
});
const ok = { company_slug: 'acme', round: 'Technical interview', reasons: ['coding', 'nerves'], note: 'Froze on a graph question.' };

// --- validation ----------------------------------------------------------------
{
  const db = mkDb();
  rejects('unknown company', () => createDebrief(db, 'u0', { ...ok, company_slug: 'nope' }));
  rejects('unpublished company', () => createDebrief(db, 'u0', { ...ok, company_slug: 'draftco' }));
  rejects('no round', () => createDebrief(db, 'u0', { ...ok, round: '' }));
  rejects('no reason', () => createDebrief(db, 'u0', { ...ok, reasons: [] }));
  rejects('only unknown reason ids', () => createDebrief(db, 'u0', { ...ok, reasons: ['bad-luck'] }));
  const d = createDebrief(db, 'u0', { ...ok, reasons: ['coding', 'coding', 'made-up'], note: 'x'.repeat(5000) });
  check('reasons are de-duplicated and filtered to known ids', d.reasons, ['coding']);
  check('the note is capped', d.note.length, 1000);
}

// --- plan ------------------------------------------------------------------------------
{
  const db = mkDb();
  const v = debriefView(db, createDebrief(db, 'u0', ok));
  const hrefs = v.plan.map((s) => s.href);
  check('coding → a data-structures test', hrefs.includes('/skill-test/dsa'), true);
  check('nerves → a mock drive and drive-day mode', ['/mock-drive', '/drive-day'].every((h) => hrefs.includes(h)), true);
  check('always ends pointing at the next company', hrefs.includes('/calendar'), true);
  check('at most five steps', v.plan.length <= 5, true);
  const hr = debriefView(db, createDebrief(db, 'u1', { ...ok, reasons: ['communication'] }));
  check('communication → the interview course', hr.plan[0].href, '/interview-course');
}

// --- privacy -----------------------------------------------------------------------------
{
  const db = mkDb();
  for (let i = 0; i < PEER_MIN - 1; i++) createDebrief(db, `u${i}`, ok);
  createDebrief(db, 'u0', ok); // the same student twice must not count twice
  check('below the floor (distinct students), no peer numbers', peerView(db, 'c1'), null);
  createDebrief(db, `u${PEER_MIN - 1}`, { ...ok, reasons: ['aptitude'] });
  const p = peerView(db, 'c1');
  check('at the floor, a count of distinct students', p?.students, PEER_MIN);
  check('and the most common real reason', p?.top_reason, 'Coding problems');
  check('peer view carries no notes', JSON.stringify(p).includes('Froze'), false);
  check('my list holds only my own debriefs', myDebriefs(db, 'u1').every((d) => d.slug === 'acme') && myDebriefs(db, 'u1').length, 1);
  const other = myDebriefs(db, 'u2')[0];
  check('cannot delete someone else’s debrief', deleteDebrief(db, 'u1', other.id), false);
  check('can delete my own', deleteDebrief(db, 'u2', other.id), true);
}

// --- the plan links into the right round --------------------------------------------
{
  const db = mkDb();
  // A published page with an online test first and a technical round second.
  db.company_pages = [{
    company_id: 'c1', enabled: true,
    published: { schema_version: 1, settings: {}, sections: [{ type: 'rounds_route', visible: true, data: { stations: [
      { id: 's1', title: 'Online Assessment', module_ids: ['m-oa'], test_href: '/skill-test/aptitude' },
      { id: 's2', title: 'Technical R1', module_ids: ['m-tech'], test_href: '/skill-test/dsa' },
    ] } }] },
  }];
  const v = debriefView(db, createDebrief(db, 'u0', { ...ok, reasons: ['coding'] }));
  check('coding reads the technical round, not the online test', v.plan.find((s) => s.title.startsWith('Read'))?.href, '/company/acme?m=m-tech');
  const a = debriefView(db, createDebrief(db, 'u1', { ...ok, reasons: ['aptitude'] }));
  check('aptitude tests on the online round', a.plan[0].href, '/skill-test/aptitude');
}

console.log(`\ndebrief: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
