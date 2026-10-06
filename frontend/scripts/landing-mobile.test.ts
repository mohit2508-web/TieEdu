/**
 * Landing page — mobile / Apple-feel regression net.
 *
 * The redesign traded an infinite marquee for a static trust row, added a
 * hero visual fallback so a phone never gets a text-only first screen, and
 * moved every landing tap target over the 44px thumb floor. Each of those
 * decisions decays silently: the marquee "looks lively, put it back", the
 * chip shrinks to save a row, the muted class regresses to the invalid
 * `text-[--text-muted]` form that renders at body colour.
 *
 * Source-level on purpose — the runner has no DOM — asserting the decisions
 * still live in the files that ship.
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

const home = read('src/pages/index.tsx');
const cssRaw = read('src/styles/globals.css');
const css = cssRaw.replace(/\/\*[\s\S]*?\*\//g, '');
const pricing = read('src/components/checkout/PricingSection.tsx');
const card = read('src/components/company/CompanyCard.tsx');
const install = read('src/components/common/PWAInstallPrompt.tsx');
const carousel = read('src/components/common/HeroPosterCarousel.tsx');

console.log('\n--- story, not a directory dump ---');
ok(!/animate-marquee/.test(home), 'the hero-to-next-section marquee is gone');
ok(/HowItWorks/.test(home), 'the landing renders the How-it-works section');
ok(/FinalCta/.test(home), 'the landing closes on the free-entry CTA, not pricing tables');
ok(/id="companies"/.test(home), 'the directory carries id="companies" so the pricing CTA anchor resolves');
ok(/eyebrow">Why TieEdu</.test(home) && !/sr-only">Why TieEdu</.test(home), 'Why TieEdu has a visible heading');

console.log('\n--- hero never renders text-only on a phone ---');
ok(/HeroVaultMock/.test(home), 'the hero falls back to the static vault illustration');
ok(/showOrbit \?/.test(home), 'the orbit stays the desktop fallback behind the mock');
ok(/min-h-\[48px\]/.test(home), 'the hero CTAs clear the 44px thumb floor at 48px');

console.log('\n--- the pinned search contract (mirrors anti-web) ---');
ok(/hidden md:block/.test(home), 'the hero search wrapper still hides below md');
ok(/value=\{searchQuery\}/.test(home), 'the hero search still drives the directory filter');

console.log('\n--- thumb floor in globals ---');
ok(
  /button\.chip:not\(\.chip--icon\)/.test(css),
  'only interactive chips get the coarse-pointer bump'
);
ok(
  /@media \(pointer: coarse\)[\s\S]{0,400}min-height: 44px/.test(css),
  'interactive chips reach 44px on coarse pointers'
);
ok(/\.dir-chip\b/.test(css), 'the directory filter uses the iOS .dir-chip control');
ok(
  /\.dir-chip\[aria-pressed='true'\]/.test(css),
  'the directory filter active state is driven by aria-pressed'
);
const narrow = css.slice(css.indexOf('@media (max-width: 480px)'), css.indexOf('@media (max-width: 480px)') + 300);
ok(/font-size: 2\.05rem/.test(narrow), 'the hero headline keeps its ≥2rem mobile size');

console.log('\n--- muted colour class is the valid var() form ---');
ok(!/text-\[--text-muted\]/.test(home), 'index.tsx has no invalid text-[--text-muted]');
ok(!/text-\[--text-muted\]/.test(pricing), 'PricingSection has no invalid text-[--text-muted]');
ok(!/text-\[--text-muted\]/.test(card), 'CompanyCard has no invalid text-[--text-muted]');
const strip = read('src/components/drops/DropsStrip.tsx');
ok(!/text-\[--text-muted\]/.test(strip), 'DropsStrip has no invalid text-[--text-muted]');
ok(/min-h-\[44px\]/.test(strip), 'the DropsStrip "Open the feed" CTA clears the thumb floor');

console.log('\n--- 12px type floor on the landing surfaces ---');
ok(!/text-\[10px\]/.test(pricing), 'PricingSection dropped its 10px metadata');
ok(!/text-\[11px\]/.test(pricing), 'PricingSection dropped its 11px metadata');
ok(!/text-\[10px\]/.test(card), 'CompanyCard stat labels are no longer 10px');

console.log('\n--- pricing does not dump dozens of cards on a phone ---');
ok(/MODULE_PREVIEW/.test(pricing), 'the module-wise view has a preview slice');
ok(/showAllModules/.test(pricing), 'the module-wise view expands behind an explicit action');
ok(/min-h-\[44px\]/.test(pricing), 'the pricing toggles and card CTAs clear the thumb floor');

console.log('\n--- chrome never covers chrome ---');
ok(
  /var\(--tabbar-total\)/.test(install),
  'the install prompt sits above the bottom tab bar'
);
ok(
  install.includes("'/drops'") && /pathname/.test(install),
  'the install prompt stays off the drops feed'
);

console.log('\n--- carousel controls ---');
ok(/grid h-8 w-8/.test(carousel), 'carousel dots grew a real hit area');
ok(/h-11 w-11/.test(carousel), 'carousel arrows clear the 44px floor');

console.log('\n--- entrance motion is reduced-motion safe ---');
const reveal = read('src/components/home/Reveal.tsx');
ok(/useReducedMotion/.test(reveal), 'Reveal opts out under prefers-reduced-motion');
ok(/whileInView/.test(reveal), 'Reveal animates on scroll into view');

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
