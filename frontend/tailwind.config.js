/** @type {import('tailwindcss').Config} */

// The design system's single home is `:root` in src/styles/globals.css, where
// every colour is declared once as RGB channels (`--rgb-*`). Each entry here is
// `rgb(var(--rgb-x) / <alpha-value>)`, which keeps opacity modifiers working
// (`bg-brand-primary/10`) AND lets the dark theme swap every class at once —
// a hex literal here would be frozen in light mode.
//
// `scripts/design-tokens.test.ts` asserts every channel referenced here exists
// in both the light and the dark theme.
const c = (name) => `rgb(var(--rgb-${name}) / <alpha-value>)`;

const tokens = {
  // ---- "Route" semantic names (use these in new code) ----
  paper: c('bg-app'),
  card: c('bg-surface'),
  line: { DEFAULT: c('border-subtle'), strong: c('border-strong') },
  heading: c('text-heading'),
  body: c('text-body'),
  muted: c('text-muted'),
  signal: { DEFAULT: c('signal'), hover: c('signal-hover'), soft: c('signal-soft'), ink: c('signal-ink') },
  logo: c('logo'),
  money: { DEFAULT: c('money'), hover: c('money-hover'), ink: c('money-ink') },
  train: c('train'),
  test: c('test'),
  track: c('track'),
  'success-soft': c('success-soft'),
  'warning-soft': c('warning-soft'),
  danger: { DEFAULT: c('danger'), soft: c('danger-soft') },
  'info-soft': c('info-soft'),

  // ---- "Warm Paper" additions (UI_REDESIGN_PLAN_V3) ----
  // `signal` is the amber FILL; links and amber-adjacent text use `link`.
  link: c('link'),
  'on-primary': c('on-primary'),
  secondary: { DEFAULT: c('secondary'), soft: c('secondary-soft'), on: c('on-secondary') },
  hero: { DEFAULT: c('brand-ink'), edge: c('hero-edge'), on: c('on-hero'), muted: c('on-hero-muted') },
  highlight: c('highlight'),
  rose: { DEFAULT: c('rose'), soft: c('rose-soft') },
  edge: c('edge'),
  'paper-rule': c('paper-rule'),
  focus: c('focus'),
  series: {
    1: c('series-1'), 2: c('series-2'), 3: c('series-3'), 4: c('series-4'), 5: c('series-5'), 6: c('series-6'), other: c('series-other'),
  },

  // ---- Existing names (kept so current markup keeps working) ----
  app: c('bg-app'),
  'app-warm': c('bg-app-warm'),
  surface: c('bg-surface'),
  'surface-hover': c('bg-surface-hover'),
  'sky-soft': c('signal-soft'),

  border: { subtle: c('border-subtle'), strong: c('border-strong') },

  ink: { DEFAULT: c('ink'), soft: c('ink-soft') },

  // Brand. `primary`/`sky` are the action colour (logo orange); `accent` is
  // money. `orange`/`navy` are aliases the interview feature was written
  // against — they point at accent and the navy band respectively.
  brand: {
    sky: c('signal'),
    'sky-strong': c('signal-hover'),
    'sky-soft': c('signal-soft'),
    primary: c('signal'),
    'primary-hover': c('signal-hover'),
    ink: c('brand-ink'),
    accent: c('money'),
    'accent-hover': c('money-hover'),
    mint: c('brand-mint'),
    orange: c('money'), // alias of `accent`
    navy: c('brand-ink'), // alias of `ink`
  },

  // Text
  text: { heading: c('text-heading'), body: c('text-body'), muted: c('text-muted'), light: c('text-light') },

  // Status
  success: c('success'),
  warning: c('warning'),
  error: c('danger'),
  info: c('info'),

  // Text sitting on an accent fill
  'accent-ink': c('money-ink'),
  'amber-deep': c('amber-deep'),
};

// Ink-tinted, never neutral grey; each resolves through a CSS variable so the
// dark theme swaps it (globals.css).
const boxShadow = {
  xs: 'var(--shadow-xs)',
  soft: 'var(--shadow-soft)',
  raised: 'var(--shadow-raised)',
  float: 'var(--shadow-float)',
  // Plan §7: solid under-edges and the two floating depths.
  'edge-primary': 'var(--shadow-edge-primary)',
  'edge-selected': 'var(--shadow-edge-selected)',
  'edge-neutral': 'var(--shadow-edge-neutral)',
  pop: 'var(--shadow-pop)',
  device: 'var(--shadow-device)',
};

// Plan §5, exact: [size, { lineHeight, letterSpacing, fontWeight }].
const typeScale = {
  headline: ['clamp(38px, 5.4vw, 64px)', { lineHeight: '1.04', letterSpacing: '-0.04em', fontWeight: '700' }],
  'headline-sm': ['clamp(30px, 10.6vw, 46px)', { lineHeight: '1.05', letterSpacing: '-0.04em', fontWeight: '700' }],
  section: ['clamp(32px, 4vw, 48px)', { lineHeight: '1.08', letterSpacing: '-0.035em', fontWeight: '700' }],
  display: ['34px', { lineHeight: '38px', letterSpacing: '-0.035em', fontWeight: '700' }],
  h1: ['28px', { lineHeight: '32px', letterSpacing: '-0.03em', fontWeight: '700' }],
  h2: ['22px', { lineHeight: '28px', letterSpacing: '-0.02em', fontWeight: '700' }],
  h3: ['17px', { lineHeight: '22px', letterSpacing: '-0.01em', fontWeight: '600' }],
  'body-lg': ['17px', { lineHeight: '26px' }],
  'body-md': ['15px', { lineHeight: '22px' }],
  label: ['15px', { lineHeight: '20px', letterSpacing: '-0.01em', fontWeight: '600' }],
  chip: ['13px', { lineHeight: '18px', fontWeight: '500' }],
  caption: ['12px', { lineHeight: '16px', fontWeight: '500' }],
  eyebrow: ['12px', { lineHeight: '16px', letterSpacing: '0.06em', fontWeight: '600' }],
};

// Plan §7 radii, added as names so existing rounded-* classes keep their sizes.
const borderRadius = {
  well: '12px',
  cell: '14px',
  tile: '16px',
  bubble: '18px',
  card: '20px',
  band: '28px',
  frame: '32px',
  device: '44px',
};

/*
 * Warm Paper (UI_REDESIGN_PLAN_V3 §11 "Admin: token swap"): ~1,700 legacy
 * gray/slate classes render this warm scale instead of Tailwind's cool greys,
 * so older screens sit on the cream paper without a per-file rewrite. Text
 * steps keep at least the old contrast on white (500: 5.6:1, was 4.8). Dark mode
 * still goes through the remap at the end of globals.css.
 */
const WARM_GRAY = {
  50: '#FBF6EE',
  100: '#F5EEE2',
  200: '#E8DFD0',
  300: '#D9CCB8',
  400: '#A8998A',
  500: '#75655A',
  600: '#6B5B4B',
  700: '#54463A',
  800: '#3B2F25',
  900: '#2A1E14',
  950: '#1B130D',
};

module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Wraps every `hover:` variant in `@media (hover: hover)`.
  //
  // Phase 8 requires this. iOS latches `:hover` on the first tap and does not
  // release it until the tap lands somewhere else, so an unguarded `hover:bg-*`
  // leaves the element stuck in its hover colour after the finger lifts, and a
  // `hover:scale` keeps the card visibly lifted. There were 349 `hover:`
  // variants in `src/` and every one of them was live on touch.
  //
  // The gate must be `(hover: hover)`, never `(pointer: coarse)`: a touch laptop
  // driving a trackpad is a coarse pointer that *does* have a hover-capable
  // input, and keying off pointer alone would strip hover from the mouse the user
  // is actually using. Tailwind emits the stricter `@media (hover:hover) and
  // (pointer:fine)`, which is still correct here because `pointer` describes the
  // *primary* input — a trackpad is `fine` even on a touchscreen.
  //
  // The alternative value, 'media-hover-none', gates on devices that cannot hover
  // at all, which is a different and stricter test than the one wanted here.
  // `scripts/anti-web.test.ts` asserts the flag, the variant, and that no
  // `hover:` rule reaches the compiled stylesheet ungated.
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      colors: { ...tokens, gray: WARM_GRAY, slate: WARM_GRAY, zinc: WARM_GRAY, neutral: WARM_GRAY, stone: WARM_GRAY },
      boxShadow,
      borderRadius,
      transitionDuration: { press: '80ms', flip: '300ms' },
      transitionTimingFunction: { paper: 'cubic-bezier(.2,.8,.2,1)' },
      // The four families are self-hosted via next/font (src/styles/fonts.ts)
      // and published as :root variables by _app.
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-body)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'Cascadia Code', 'ui-monospace', 'monospace'],
      },
      // One type scale: 12 · 13 · 14 · 16 · 18 · 20 · 24 · 32 · 40 · 48 · 64.
      // Nothing below 12px. The small steps keep Tailwind's defaults.
      fontSize: {
        // 13px, not 12: text-xs carries most meta lines and labels (PRACTICE_MODE_PLAN.md §10.1). 12px stays as `caption`.
        xs: ['0.8125rem', { lineHeight: '1.125rem' }],
        '3xl': ['2rem', { lineHeight: '2.375rem' }],
        '4xl': ['2.5rem', { lineHeight: '2.875rem' }],
        '5xl': ['3rem', { lineHeight: '3.25rem' }],
        '6xl': ['4rem', { lineHeight: '4.125rem' }],
        ...typeScale,
      },
    },
  },
  plugins: [],
};

// Exported for scripts/design-tokens.test.ts, which checks every channel these
// reference exists in globals.css for both themes.
module.exports.tokens = tokens;
module.exports.boxShadow = boxShadow;
module.exports.typeScale = typeScale;
