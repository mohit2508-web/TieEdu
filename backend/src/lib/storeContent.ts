/**
 * Default product content for the TiEEdu Store showcase (STORE_3D_SHOWCASE_AND_SPEED_PLAN.md §B2, §C).
 * Store items live in db.store_items and belong to admins once seeded; this file
 * fills any showcase field an item does not set itself, so existing stores get
 * the new detail without a migration and admins can still override each field.
 */
export interface ItemContent {
  /** 3D model key (frontend components/store3d/models.ts). */
  model?: 'bottle' | 'mug' | 'tshirt' | 'hoodie' | 'cap' | 'stickers' | 'keychain' | 'notebook' | 'kit';
  details: string;
  specs: Array<[string, string]>;
  in_box: string[];
  colors?: Array<{ name: string; hex: string }>;
  size_chart?: Array<{ size: string; chest_cm: number; length_cm: number }>;
}

const SHIP = 'Ships across India in about 7 working days, with tracking under Your orders.';

export const ITEM_CONTENT: Record<string, ItemContent> = {
  repair: {
    details: 'Missed a day? A Streak Repair fills one missed day from this month, so your streak carries on as if you never stopped. You choose the day. Up to 3 repairs a month.',
    specs: [['Works on', 'Any missed day this calendar month'], ['Limit', '3 a month'], ['Delivery', 'Instant']],
    in_box: ['One missed day filled', 'Your streak count restored'],
  },
  'frame-bronze': {
    details: 'A bronze ring around your name and photo on the leaderboard, your profile and your share cards. Everyone who sees the leaderboard sees you earned it.',
    specs: [['Shows on', 'Leaderboard, profile, share cards'], ['Lasts', 'Forever'], ['Delivery', 'Instant']],
    in_box: ['Bronze ring on your profile photo'],
  },
  'frame-silver': {
    details: 'A brushed silver ring around your name and photo on the leaderboard, your profile and your share cards.',
    specs: [['Shows on', 'Leaderboard, profile, share cards'], ['Lasts', 'Forever'], ['Delivery', 'Instant']],
    in_box: ['Silver ring on your profile photo'],
  },
  'frame-gold': {
    details: 'The gold ring: the rarest frame on TiEEdu. It shines on the leaderboard, your profile and your share cards.',
    specs: [['Shows on', 'Leaderboard, profile, share cards'], ['Lasts', 'Forever'], ['Delivery', 'Instant']],
    in_box: ['Gold ring on your profile photo'],
  },
  'coupon-50': {
    details: 'A single-use code for ₹50 off any TiEEdu course or pack. Use it at checkout.',
    specs: [['Value', '₹50'], ['Use', 'Once, on any course or pack'], ['Delivery', 'Instant code']],
    in_box: ['One coupon code'],
  },
  'company-pack': {
    details: 'Unlock every locked problem, solution and test of one company you choose: the full pack, the same as buying it.',
    specs: [['Choose', 'Any company pack'], ['Lasts', 'Same as a bought pack'], ['Delivery', 'Instant']],
    in_box: ['All locked problems', 'All solutions', 'All company tests'],
  },
  'membership-30': {
    details: 'Thirty days of TiEEdu membership: member lessons, extra mock attempts and internship applications.',
    specs: [['Length', '30 days'], ['Stacks', 'Adds to an active membership'], ['Delivery', 'Instant']],
    in_box: ['Member lessons', 'Extra mock attempts', 'Internship applications'],
  },
  stickers: {
    model: 'stickers',
    details: `Six die-cut vinyl stickers made for laptops and bottles: the TiEEdu logo, "Brain on", "Accepted ✓", "// compiled at 2 AM", "100-day streak" and "Dry run passed". Glossy, waterproof and easy to peel. ${SHIP}`,
    specs: [['Count', '6 stickers'], ['Material', 'Waterproof glossy vinyl'], ['Size', '5–8 cm each'], ['Finish', 'Die-cut with a white border']],
    in_box: ['TiEEdu logo sticker', '"Brain on"', '"Accepted ✓"', '"// compiled at 2 AM"', '"100-day streak"', '"Dry run passed"'],
  },
  keychain: {
    model: 'keychain',
    details: `A brushed-metal tag with the TiEEdu logo and "One problem a day" engraved under it, on a steel split ring. ${SHIP}`,
    specs: [['Material', 'Brushed zinc alloy'], ['Size', '5 × 3 cm'], ['Ring', 'Steel split ring']],
    in_box: ['Metal keychain', 'Gift pouch'],
  },
  mug: {
    model: 'mug',
    details: `A glossy black ceramic mug with the TiEEdu logo on the front, an orange glaze inside, and "// compiled at 2 AM · 0 errors, 0 warnings" on the back. ${SHIP}`,
    specs: [['Capacity', '330 ml'], ['Material', 'Ceramic, glossy glaze'], ['Care', 'Dishwasher and microwave safe']],
    in_box: ['TiEEdu mug', 'Gift box'],
    colors: [{ name: 'Midnight black', hex: '#141414' }, { name: 'Bone white', hex: '#ECE6DA' }],
  },
  notebook: {
    model: 'notebook',
    details: `A hard-cover A5 notebook in black with the TiEEdu logo, an orange elastic band and a ribbon. Dot-grid pages, with a Big-O cheat sheet inside the cover. ${SHIP}`,
    specs: [['Size', 'A5'], ['Pages', '192 dot-grid, 100 gsm'], ['Extras', 'Elastic band, ribbon, Big-O cheat sheet']],
    in_box: ['Placement notebook'],
  },
  bottle: {
    model: 'bottle',
    details: `Double-wall vacuum steel bottle: cold for 24 hours, hot for 12. Matte black powder coat, the TiEEdu logo on the front and "Practise daily." up the back. Leak-proof steel cap with a carry loop. ${SHIP}`,
    specs: [['Capacity', '750 ml'], ['Keeps', 'Cold 24 h · hot 12 h'], ['Material', '18/8 stainless steel, powder coated'], ['Cap', 'Leak-proof, with carry loop']],
    in_box: ['TiEEdu steel bottle', 'Gift box'],
    colors: [{ name: 'Midnight black', hex: '#17181A' }, { name: 'Brushed steel', hex: '#C9CCD1' }],
  },
  cap: {
    model: 'cap',
    details: `Six-panel black cap with the TiEEdu logo embroidered on the front and an adjustable strap. ${SHIP}`,
    specs: [['Material', '100% cotton twill'], ['Fit', 'Adjustable, one size'], ['Logo', 'Embroidered']],
    in_box: ['TiEEdu cap'],
    colors: [{ name: 'Midnight black', hex: '#141414' }, { name: 'Bone white', hex: '#ECE6DA' }],
  },
  tshirt: {
    model: 'tshirt',
    details: `Heavyweight cotton tee with a relaxed fit. The TiEEdu logo on the chest; "CODE. CRACK. REPEAT." printed large on the back. Pre-shrunk, soft and made to last. ${SHIP}`,
    specs: [['Fabric', '100% combed cotton, 240 GSM'], ['Fit', 'Relaxed, drop shoulder'], ['Print', 'Front logo, large back print'], ['Care', 'Machine wash cold, inside out']],
    in_box: ['TiEEdu T-shirt', 'Thank-you card'],
    colors: [{ name: 'Midnight black', hex: '#141414' }, { name: 'Bone white', hex: '#ECE6DA' }],
    size_chart: [{ size: 'S', chest_cm: 100, length_cm: 69 }, { size: 'M', chest_cm: 106, length_cm: 71 }, { size: 'L', chest_cm: 112, length_cm: 73 }, { size: 'XL', chest_cm: 118, length_cm: 75 }, { size: 'XXL', chest_cm: 124, length_cm: 77 }],
  },
  hoodie: {
    model: 'hoodie',
    details: `Heavy brushed-fleece hoodie: lined hood with drawstrings and metal tips, kangaroo pocket, ribbed cuffs and hem. The TiEEdu logo on the chest, "EST. 2026" on the sleeve and "TRAIN · TEST · TRACK" on the back. ${SHIP}`,
    specs: [['Fabric', 'Cotton-rich brushed fleece, 400 GSM'], ['Fit', 'Relaxed'], ['Details', 'Lined hood, metal-tip drawstrings, kangaroo pocket'], ['Care', 'Machine wash cold, inside out']],
    in_box: ['TiEEdu hoodie', 'Sticker pack', 'Thank-you card'],
    colors: [{ name: 'Midnight black', hex: '#141414' }, { name: 'Bone white', hex: '#ECE6DA' }],
    size_chart: [{ size: 'S', chest_cm: 108, length_cm: 68 }, { size: 'M', chest_cm: 114, length_cm: 70 }, { size: 'L', chest_cm: 120, length_cm: 72 }, { size: 'XL', chest_cm: 126, length_cm: 74 }, { size: 'XXL', chest_cm: 132, length_cm: 76 }],
  },
  kit: {
    model: 'kit',
    details: `Everything in one rigid black box with an orange lining and the TiEEdu logo on the lid. Open it in 3D to see what is inside. ${SHIP}`,
    specs: [['Box', 'Rigid, soft-touch black, orange lining'], ['Value', 'Bottle + notebook + stickers + keychain'], ['Gift-ready', 'Yes, with a personal welcome card']],
    in_box: ['Steel bottle (750 ml)', 'Placement notebook', 'Sticker pack (6)', 'Metal keychain', 'Welcome card with your name'],
  },
  sleeve: {
    details: `Padded 15" laptop sleeve with the TiEEdu logo. ${SHIP}`,
    specs: [['Fits', 'Laptops up to 15.6"'], ['Material', 'Neoprene, soft lining']],
    in_box: ['Laptop sleeve'],
  },
  backpack: {
    details: `Laptop backpack with the TiEEdu logo, a padded laptop pocket and a water-resistant shell. ${SHIP}`,
    specs: [['Fits', 'Laptops up to 15.6"'], ['Material', 'Water-resistant polyester']],
    in_box: ['TiEEdu backpack'],
  },
};
