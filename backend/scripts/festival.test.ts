// ============================================================================
// Diwali 2026 sale switch — window, kill switch, prices, membership, internships.
//
// What must hold: the sale is live only inside the window (or early when an
// admin turns it on, never past the end); the catalog and checkout halve the
// very same price; free things stay free; a membership is granted once and
// never stretched by re-claiming; internships are never public as drafts.
// ============================================================================

import {
  DIWALI_2026, activeFestival, salePrice, saleFnFor, claimMembership, isMember, festivalPublic, istDay,
} from '../src/lib/festival';
import { buildPricingCatalog } from '../src/lib/pricing';
import { summarizePack } from '../src/routes/checkout.routes';
import { applyToInternship, publicInternships, seedTieEduInternshipDrafts, upsertInternship } from '../src/lib/internships';

let pass = 0;
let fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) pass++;
  else {
    fail++;
    console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

const START = new Date(DIWALI_2026.starts_at).getTime();
const END = new Date(DIWALI_2026.ends_at).getTime();
const IN = START + 24 * 3600 * 1000;

// ---- window -----------------------------------------------------------------
check('before start: off', activeFestival({}, START - 1000), null);
check('at start: on', activeFestival({}, START)?.id, 'diwali-2026');
check('inside: on', activeFestival({}, IN)?.id, 'diwali-2026');
check('at end: on', activeFestival({}, END)?.id, 'diwali-2026');
check('after end: off', activeFestival({}, END + 1000), null);
check('kill switch', activeFestival({ settings: { festival_mode: 'off' } }, IN), null);
check('early on', activeFestival({ settings: { festival_mode: 'on' } }, START - 86400000)?.id, 'diwali-2026');
check('on never past end', activeFestival({ settings: { festival_mode: 'on' } }, END + 1000), null);
check('ends 10 Nov IST', istDay(END), '2026-11-10');

// ---- prices -----------------------------------------------------------------
const fest = activeFestival({}, IN);
check('249 -> 124', salePrice(249, fest), 124);
check('169 -> 84', salePrice(169, fest), 84);
check('99 -> 49', salePrice(99, fest), 49);
check('0 stays 0', salePrice(0, fest), 0);
check('no fest = list', salePrice(249, null), 249);
check('saleFn outside window', saleFnFor({}, END + 1000)(249), 249);

const company = {
  id: 'c1', slug: 'acme', name: 'Acme', modules: [
    { id: 'm1', is_premium: true, items: [] }, { id: 'm2', is_premium: true, items: [] },
    { id: 'm3', is_premium: true, items: [] }, { id: 'm4', is_premium: true, items: [] },
  ],
};
const cat = buildPricingCatalog([company], [], [], false, () => null, saleFnFor({}, IN));
check('catalog pack sale', cat.companies[0].pack_price, 124);
check('catalog pre-sale', cat.companies[0].pre_sale_price, 249);
check('catalog list stays honest', cat.companies[0].list_total, 396);
check('sale ladder', cat.sale_ladder.map((r) => r.price), [49, 84, 109, 124]);
const capped = buildPricingCatalog([company], [], [], false, () => 99, saleFnFor({}, IN));
check('cap then sale', capped.companies[0].pack_price, 49);
const noSale = buildPricingCatalog([company], [], [], false, () => null);
check('catalog default no sale', noSale.companies[0].pack_price, 249);

// Checkout uses the same numbers as the catalog.
const items = [{ kind: 'company' as const, id: 'c1', name: 'Acme' }];
check('checkout pack sale', summarizePack(items, () => null, saleFnFor({}, IN)).subtotal, 124);
check('checkout pack after end', summarizePack(items, () => null, saleFnFor({}, END + 1000)).subtotal, 249);
check('checkout 2 modules', summarizePack([{ kind: 'company', id: 'c1', module_ids: ['m1', 'm2'] }], () => null, saleFnFor({}, IN)).subtotal, 84);

// ---- membership --------------------------------------------------------------
const db: any = { users: [{ id: 'u1' }], settings: {} };
const m = claimMembership(db, 'u1', IN);
check('membership 90 days', (new Date(m.expires_at).getTime() - IN) / 86400000, 90);
check('is member', isMember(db, 'u1', IN), true);
const again = claimMembership(db, 'u1', IN + 3600000);
check('re-claim does not extend', again.expires_at, m.expires_at);
check('member after sale ends', isMember(db, 'u1', END + 1000), true);
check('member expires', isMember(db, 'u1', IN + 91 * 86400000), false);
let threw = false;
try { claimMembership({ users: [{ id: 'u2' }] }, 'u2', END + 1000); } catch { threw = true; }
check('no claim after window', threw, true);
check('public payload off after end', festivalPublic(db, 'u1', END + 1000).active, false);

// ---- internships --------------------------------------------------------------
seedTieEduInternshipDrafts(db);
check('drafts seeded once', seedTieEduInternshipDrafts(db), false);
check('drafts not public', publicInternships(db, null, IN).internships.length, 0);
const open = upsertInternship(db, { title: 'Intern', company: 'TieEdu', status: 'open', deadline: '2026-11-30' });
check('open listing public', publicInternships(db, 'u1', IN).internships.length, 1);
const app1 = applyToInternship(db, 'u1', open.id, 'hi', IN);
const app2 = applyToInternship(db, 'u1', open.id, 'again', IN);
check('apply idempotent', app1.id, app2.id);
db.users.push({ id: 'u3' });
threw = false;
try { applyToInternship(db, 'u3', open.id, '', IN); } catch { threw = true; }
check('non-member cannot apply', threw, true);
threw = false;
try { upsertInternship(db, { title: 'X', company: 'Y', apply_url: 'http://evil' }); } catch { threw = true; }
check('apply link must be https', threw, true);

console.log(`festival: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
