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

const boxShadow = {
  xs: '0 1px 2px rgba(16, 21, 28, 0.05)',
  soft: '0 2px 8px rgba(16, 21, 28, 0.05)',
  raised: '0 10px 28px rgba(16, 21, 28, 0.08), 0 2px 8px rgba(16, 21, 28, 0.04)',
  float: '0 28px 60px rgba(16, 21, 28, 0.14), 0 8px 20px rgba(16, 21, 28, 0.06)',
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
      colors: tokens,
      boxShadow,
      // The four families are self-hosted via next/font (src/styles/fonts.ts)
      // and published as :root variables by _app.
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-body)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'Cascadia Code', 'ui-monospace', 'monospace'],
      },
      // One type scale: 12 · 14 · 16 · 18 · 20 · 24 · 32 · 40 · 48 · 64.
      // Nothing below 12px. The small steps keep Tailwind's defaults.
      fontSize: {
        '3xl': ['2rem', { lineHeight: '2.375rem' }],
        '4xl': ['2.5rem', { lineHeight: '2.875rem' }],
        '5xl': ['3rem', { lineHeight: '3.25rem' }],
        '6xl': ['4rem', { lineHeight: '4.125rem' }],
      },
    },
  },
  plugins: [],
};

// Exported for scripts/design-tokens.test.ts, which checks every channel these
// reference exists in globals.css for both themes.
module.exports.tokens = tokens;
module.exports.boxShadow = boxShadow;
