/**
 * Drops mobile polish — regression net.
 *
 * The feed is the one student surface that is a full-screen app UI rather than
 * a document page. Every property below is something that decays silently:
 * someone "simplifies" the shell height and the CTA lands under the home
 * indicator; a card loses its `loading` attribute and the second swipe flashes
 * an empty frame; the active-chip auto-scroll is deleted because it "looked
 * jumpy" and the filter becomes unusable on a phone.
 *
 * These checks are source-level on purpose — the frontend runner has no DOM.
 * They assert that the *decisions* are still in the files that ship, which is
 * the strongest statement available without a browser.
 */
import * as fs from 'fs';
import * as path from 'path';

function findRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 8; i += 1) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    dir = path.dirname(dir);
  }
  throw new Error('could not find the frontend root');
}
const ROOT = findRoot();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let pass = 0;
let fail = 0;
const ok = (cond: boolean, msg: string) => {
  if (cond) {
    pass += 1;
    console.log(`  ok   ${msg}`);
  } else {
    fail += 1;
    console.log(`  FAIL ${msg}`);
  }
};

/** Extract the declaration block for a simple class selector. */
const rule = (src: string, selector: string): string => {
  const i = src.indexOf(selector);
  if (i < 0) return '';
  const brace = src.indexOf('{', i);
  if (brace < 0) return '';
  const end = src.indexOf('}', brace);
  return end < 0 ? '' : src.slice(i, end + 1);
};

const cssRaw = read('src/styles/globals.css');
/** Declarations only — the file's comments argue *against* content-visibility. */
const css = cssRaw.replace(/\/\*[\s\S]*?\*\//g, '');
const card = read('src/components/drops/DropCard.tsx');
const feed = read('src/components/drops/DropsFeed.tsx');
const filterBar = read('src/components/drops/DropsFilterBar.tsx');
const page = read('src/pages/drops/index.tsx');
const detail = read('src/pages/drops/[id].tsx');
const strip = read('src/components/drops/DropsStrip.tsx');
const navConfig = read('src/lib/navConfig.ts');
const sheet = read('src/components/drops/DropDetailSheet.tsx');
const muteSheet = read('src/components/drops/DropNotInterestedSheet.tsx');

console.log('\n--- geometry: safe-bottom on the detail-route shell ---');
ok(
  css.includes(".page-body[data-tabbar='off'] .drops-shell"),
  'the shell reserves space when the tab bar is slid away'
);
ok(
  rule(css, ".page-body[data-tabbar='off'] .drops-shell").includes('safe-bottom'),
  "data-tabbar='off' subtracts --safe-bottom so the CTA clears the home indicator"
);
ok(
  rule(css, ".page-body[data-tabbar='on'] .drops-shell").includes('tabbar-total'),
  "data-tabbar='on' still subtracts the full tab bar"
);
ok(
  css.includes('height: calc(100dvh - var(--header-total));'),
  'md+ keeps the simple full-header height'
);

console.log('\n--- filter chips: touch targets + auto-scroll ---');
ok(css.includes('@media (pointer: coarse)'), 'coarse-pointer chips get a taller hit area');
ok(
  rule(css, '.drops-filter-chip').includes('height: 34px') &&
    css.includes('@media (pointer: coarse)') &&
    /@media \(pointer: coarse\)\s*\{[^}]*height:\s*40px/.test(css.replace(/\n/g, ' ')),
  'coarse chips are at least 40px tall'
);
ok(css.includes('scroll-snap-type: x proximity'), 'the chip strip snaps horizontally');
ok(css.includes('scroll-padding-inline'), 'the chip strip carries scroll-padding');
ok(
  /\.drops-filter-chip\s*\{[^}]*border:\s*0/.test(css),
  'chips are flat — an outlined pill reads as a web form control, not an app chip'
);
ok(
  /\.drops-filter-chip\[aria-pressed='true'\][\s\S]{0,200}box-shadow/.test(css),
  'the selected chip lifts with a shadow (the only depth on the row)'
);
ok(
  /\.drops-filter-chip\s*\{[^}]*font-weight:\s*600/.test(css),
  'chips use the app weight (600), not web-bold (700)'
);
ok(
  filterBar.includes('scrollIntoView') && filterBar.includes("inline: 'center'"),
  'the active chip is scrolled into view'
);
ok(filterBar.includes('haptic('), 'chips fire a haptic on press');
ok(filterBar.includes('pressable'), 'chips use the shared press-feedback class');

console.log('\n--- action rail: feedback + small-screen density ---');
ok(card.includes('drop-rail-btn'), 'the rail still uses its own button class');
ok(card.includes('Pressable'), 'rail buttons go through Pressable for press feedback');
ok(
  /\.drop-rail-btn\s*\{[^}]*background:/.test(css),
  'rail buttons carry their own dark disc (white glyphs vanish on bright photos)'
);
ok(
  /\.drop-rail-btn svg\s*\{[^}]*filter:\s*drop-shadow/.test(css),
  'rail icons get a drop-shadow — text-shadow never paints an SVG stroke'
);
ok(
  !/drop-rail-btn\s*span\s*\{\s*display:\s*none/.test(css),
  'rail labels stay visible on every phone — the disc carries Save/Share/Not-me'
);
ok(card.includes('aria-label={saved ?'), 'save keeps its aria-label for screen readers');
ok(
  card.includes('aria-label="Share this drop"') && card.includes('aria-label="Not interested"'),
  'share and mute keep aria-labels'
);

console.log('\n--- short-viewport copy density ---');
ok(
  /@media \(max-height: 700px\)\s*\{[\s\S]*?drop-headline[\s\S]*?line-clamp:\s*2/.test(css),
  'headlines clamp tighter on short phones'
);
ok(
  css.includes('drop-bullets li:nth-child(n + 3) { display: none; }') ||
    css.includes('nth-child(n + 3)'),
  'the third bullet steps aside on short phones'
);
ok(
  /@media \(max-height: 700px\)[\s\S]*?height:\s*72%/.test(css),
  'the scrim deepens on short phones'
);

console.log('\n--- card chrome ---');
ok(
  !card.includes('{position}') && !card.includes('{total}'),
  'the 3/12 position counter is gone — a swipe feed does not number its cards'
);
ok(
  !/position=\{index/.test(feed) && !/total=\{items/.test(feed),
  'the feed no longer passes position/total to the card'
);

console.log('\n--- image delivery ---');
ok(card.includes("loading={eager ? 'eager' : 'lazy'}"), 'the first cards load eagerly, the rest lazily');
ok(card.includes("fetchPriority={eager ? 'high' : 'auto'}"), 'the first creative is marked high priority');
ok(card.includes('decoding="async"'), 'creatures decode off the main thread');
ok(card.includes('index'), 'DropCard receives a feed index to decide eagerness');
ok(page.includes('new Image()'), 'the page prefetches the next creative');
ok(page.includes('prefetchedRef'), 'prefetch is deduped per session');
ok(page.includes('apiAssetUrl'), 'prefetch goes through the shared asset URL helper');

console.log('\n--- offscreen paint containment ---');
ok(
  !css.includes('content-visibility'),
  'content-visibility is NOT used (it blanks text on mobile snap scrollers)'
);
ok(css.includes('contain: layout paint'), 'slides keep layout/paint containment');
ok(
  !/drop-slide[\s\S]{0,400}brightness\(/.test(css) || !css.includes('brightness(0.96)'),
  'non-active cards are not brightness-dimmed (readability first)'
);

console.log('\n--- text readability (scrim + stacking) ---');
ok(
  /drop-media::after[\s\S]{0,200}z-index:\s*1/.test(css),
  'the scrim is explicitly z-indexed below the copy'
);
ok(
  css.includes('.drop-media > .absolute') && css.includes('z-index: 2'),
  'media overlays clear the scrim'
);
ok(
  (card.match(/z-\[2\]/g) || []).length >= 3,
  'chip row, rail and copy block all sit above the scrim'
);
ok(css.includes('text-shadow'), 'the headline carries a text-shadow for bright creatives');
ok(css.includes('rgba(6, 10, 16, 0.94)') || css.includes('0.94'),
  'the scrim base is dark enough for white copy');
ok(card.includes('text-white') && !card.includes('text-white/90'),
  'bullets are full white, not washed-out white/90');
ok(css.includes('.drops-progress'), 'a progress track exists under the filters');
ok(css.includes('scaleX('), 'the progress fill is transform-only');
ok(page.includes('progressScale'), 'the page drives the progress fill from the active index');
ok(page.includes('setActiveIndex'), 'the page tracks which card is active');

console.log('\n--- gestures ---');
ok(card.includes('DOUBLE_TAP_MS'), 'double-tap save has an explicit window');
ok(card.includes('SWIPE_THRESHOLD'), 'side-swipe has an explicit threshold');
ok(card.includes('onMediaPointerDown') && card.includes('onMediaPointerMove'),
  'gestures are wired on the media box');
ok(css.includes('touch-action: pan-y'), 'the media box claims horizontal pans only (pan-y)');
ok(card.includes('drop-save-burst') || css.includes('drop-save-burst'),
  'a save burst confirms the gesture');
ok(css.includes('@keyframes drop-save-burst'), 'the burst animation is defined');

console.log('\n--- sheets stay mobile-native ---');
ok(sheet.includes('Sheet'), 'the detail sheet still uses the shared Sheet primitive');
ok(sheet.includes('Feed'), 'the detail sheet offers a way back to the feed');
ok(muteSheet.includes('Sheet') && muteSheet.includes('Pressable'),
  'mute options keep press feedback');
ok(sheet.includes('zIndex={65}') && muteSheet.includes('zIndex={65}'),
  'drops sheets stay above the header');

console.log('\n--- share landing ---');
ok(detail.includes('aspect-[16/10]'), 'the article creative reserves its box (no CLS)');
ok(detail.includes('object-cover'), 'the article creative fills the reserved box');
ok(detail.includes('min-h-[44px]'), 'the back link is a real tap target');
ok(detail.includes('w-full') && detail.includes('sm:w-auto'), 'article CTAs go full-width on phones');
ok(detail.includes('loading="lazy"'), 'the article creative does not compete with the first paint');

console.log('\n--- homepage strip ---');
ok(strip.includes('snap-x') && strip.includes('snap-mandatory'), 'the homepage strip snaps horizontally');
ok(strip.includes('snap-start'), 'each strip card is a snap target');
ok(strip.includes('overscroll-x-contain'), 'the strip does not hand its overscroll to the page');

console.log('\n--- nav contract (must not drift) ---');
ok(
  /MOBILE_TAB_SLOTS:\s*string\[\]\s*=\s*\[[^\]]*vaults[^\]]*skillTest[^\]]*drops[^\]]*search[^\]]*courses/.test(
    navConfig
  ),
  'tab slot order is still vaults, skillTest, drops, search, courses'
);
ok(
  navConfig.includes("id: 'drops'") && navConfig.includes("depth: 'detail'"),
  'drops stays a detail-depth route (tab bar slides away)'
);
ok(navConfig.includes("parent: '/'"), 'the drops back-chevron still has a parent');

console.log('\n--- offline / refresh ---');
ok(page.includes('tieedu_drops_cache_v1'), 'the offline snapshot key is unchanged');
ok(page.includes('RefreshCw') || page.includes('Refresh'), 'the feed offers an online refresh');
ok(page.includes('WifiOff'), 'the offline banner is still present');

console.log('\n--- press feedback vocabulary ---');
ok(card.includes('hapticWeight="medium"'), 'save/CTA fire a medium haptic');
ok(feed.includes('IntersectionObserver'), 'dwell accounting still uses the observer');

console.log('\n--- Pressable must actually render its children ---');
const pressable = read('src/components/common/Pressable.tsx');
ok(
  />\s*\{\s*children\s*\}\s*<\/Tag>/.test(pressable),
  'Pressable renders {children} — a self-closing Tag blanks every button in the app'
);
const installPrompt = read('src/components/common/PWAInstallPrompt.tsx');
ok(
  installPrompt.includes("'/drops'") && installPrompt.includes('pathname'),
  'the install prompt stays off the drops feed — it covers the card copy block'
);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
