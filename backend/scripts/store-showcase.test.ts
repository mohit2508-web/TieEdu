// ============================================================================
// Store showcase fields (STORE_3D_SHOWCASE_AND_SPEED_PLAN.md §C): admin edits are
// validated (only https or our own /api/store/media URLs, valid colours), a cleared
// field falls back to the default content, and every 3D item has content.
//   npm run test:showcase
// ============================================================================
import { updateItem, storeItems, DEFAULT_ITEMS } from '../src/lib/store';
import { ITEM_CONTENT } from '../src/lib/storeContent';

let pass = 0, fail = 0;
const check = (name: string, ok: boolean) => { if (ok) pass++; else { fail++; console.log(`FAIL ${name}`); } };

const db: any = {};
storeItems(db);
check('every default item has showcase content', DEFAULT_ITEMS.every((i) => !!ITEM_CONTENT[i.id]?.details));
check('3D models only on physical items', Object.entries(ITEM_CONTENT).every(([id, c]) => !c.model || DEFAULT_ITEMS.find((i) => i.id === id)?.kind === 'physical'));
check('tee and hoodie come in black and bone white', ['tshirt', 'hoodie'].every((id) => ITEM_CONTENT[id].colors?.map((c) => c.hex).join() === '#141414,#ECE6DA'));

const it = updateItem(db, 'hoodie', {
  details: 'Custom', specs: [['Fabric', '400 GSM'], ['', 'skip']], in_box: ['Hoodie', ''],
  colors: [{ name: 'Black', hex: '#000000' }, { name: 'Bad', hex: 'red' }],
  print_front: '/api/store/media/st-1-abcdef12.png', print_back: 'javascript:alert(1)', gallery: ['https://x.in/a.jpg', 'http://insecure/b.jpg'], promo: false,
});
check('details saved', it.details === 'Custom');
check('empty spec rows dropped', JSON.stringify(it.specs) === '[["Fabric","400 GSM"]]');
check('empty box lines dropped', JSON.stringify(it.in_box) === '["Hoodie"]');
check('invalid colours dropped', it.colors?.length === 1);
check('own media URL accepted', it.print_front === '/api/store/media/st-1-abcdef12.png');
check('script URL rejected', it.print_back === null);
check('only https photos kept', JSON.stringify(it.gallery) === '["https://x.in/a.jpg"]');
check('promo off saved', it.promo === false);
const cleared = updateItem(db, 'hoodie', { details: '', print_front: null });
check('clearing details falls back to default', cleared.details === undefined && cleared.print_front === null);

console.log(`\nstore showcase: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
