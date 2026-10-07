/**
 * Landing page — mobile / PW-style feed regression net.
 *
 * The redesign traded a long marketing stack for a feed: quick actions,
 * horizontal snap rails for courses/tests/vaults, one free-course billboard,
 * and prose sections cut down to chips. Each decision decays silently: a rail
 * "simplifies" back to a grid, the hero grows its paragraphs again, the orbit
 * sneaks back and doubles the first paint, a card drops below the 44px floor.
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

console.log('\n--- the feed, not a document page ---');
ok(!/animate-marquee/.test(home), 'no marquee');
ok(/<QuickActions/.test(home), 'quick actions (Courses, Skill Tests, Free Course…) render above the fold');
ok(/<CourseRail/.test(home), 'the homepage has the courses rail');
ok(/<SkillRail/.test(home), 'the homepage has the skill-tests rail');
ok(/<VaultRail/.test(home), 'the vault directory is a feed rail, not a grid');
ok(/<FreeCourseBanner/.test(home), 'the free course gets its billboard');
ok(/<FinalCta/.test(home), 'the landing closes on the free-entry CTA');
const vaultRail = read('src/components/home/VaultRail.tsx');
ok(/id="companies"/.test(vaultRail) && /href="#companies"/.test(home), 'the vault rail resolves the #companies anchor');
ok(!/HowItWorks/.test(home), 'the How-it-works section stays cut');
ok(!/CompanyOrbitHero3D/.test(home), 'the 3D orbit stays retired from the homepage');

console.log('\n--- rails are native snap scrollers ---');
const rail = read('src/components/home/Rail.tsx');
ok(/rail-track/.test(rail), 'rails share one track class');
ok(/scroll-snap-type: x mandatory/.test(css), 'the rail track snaps natively');
ok(/ChevronLeft/.test(rail) && /hidden lg:/.test(rail), 'desktop gets arrows; phones rely on peek + swipe');
ok(/scroll-snap-align: start/.test(css), 'rail cards snap to the track edge');

console.log('\n--- hero stays compact and never text-only on desktop ---');
ok(/HeroVaultMock/.test(home), 'the hero falls back to the static vault illustration');
ok(/hidden md:flex/.test(home), 'the mock stands aside on phones — Quick Actions follow the hero instead');
ok(/min-h-\[48px\]/.test(home), 'the hero CTAs clear the 44px thumb floor at 48px');

console.log('\n--- the pinned search contract (mirrors anti-web) ---');
ok(/hidden md:block/.test(home), 'the hero search wrapper still hides below md');
ok(/value=\{searchQuery\}/.test(home), 'the hero search still drives the vault rail filter');

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

console.log('\n--- rails fail closed, not loudly ---');
const courseRail = read('src/components/home/CourseRail.tsx');
const skillRail = read('src/components/home/SkillRail.tsx');
ok(/catch/.test(courseRail) && /setCourses\(\[\]\)/.test(courseRail), 'the course rail hides itself on failure');
ok(/catch/.test(skillRail) && /setSkills\(\[\]\)/.test(skillRail), 'the skill rail hides itself on failure');

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
