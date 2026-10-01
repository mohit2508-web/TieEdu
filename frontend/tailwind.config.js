/** @type {import('tailwindcss').Config} */

// The design system's real home is `:root` in src/styles/globals.css. These
// values are duplicated here on purpose: Tailwind can only apply an opacity
// modifier (`bg-brand-orange/10`) if the colour is a literal it can parse. A
// config entry of `var(--brand-accent)` compiles, but every `/NN` variant of it
// silently produces nothing — which is the same class of bug this file was
// missing.
//
// `scripts/design-tokens.test.ts` asserts that every hex below still matches its
// CSS variable, so the duplication cannot drift.
const tokens = {
  // Surfaces
  app: '#F7F6F3',
  'app-warm': '#FCFBF8',
  surface: '#FFFFFF',
  'surface-hover': '#F3F2EE',
  'sky-soft': '#EAF5FB',

  // Lines
  border: { subtle: '#E9E7E1', strong: '#D6D2C8' },

  // Ink
  ink: { DEFAULT: '#10151C', soft: '#2A3340' },

  // Brand. `orange`/`navy` are ALIASES the interview feature was already written
  // against: there is no --brand-orange or --brand-navy variable, so
  // `bg-brand-orange/10` and `to-brand-navy` had nothing to resolve to and
  // compiled to no rule at all. They point at accent and ink respectively.
  brand: {
    sky: '#0369A1',
    'sky-strong': '#075985',
    'sky-soft': '#E8F4FB',
    primary: '#0369A1',
    ink: '#0E2A44',
    accent: '#E8A33D',
    'accent-hover': '#D4902C',
    mint: '#10A37F',
    orange: '#E8A33D', // alias of `accent`
    navy: '#0E2A44', // alias of `ink`
  },

  // Text
  text: { heading: '#10151C', body: '#3E4754', muted: '#5A6470', light: '#AEB6BE' },

  // Status
  success: '#15803D',
  warning: '#C77B12',
  error: '#C1442D',
  info: '#0284C7',

  // Text sitting on an accent fill
  'accent-ink': '#241A06',
  'amber-deep': '#B45309',
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
      fontFamily: {
        // Calibre is the design intent. It is not redistributable, so Carlito
        // (the metric-compatible Calibre clone, OFL) is bundled locally as the
        // first real fallback. Loaded in src/pages/_app.tsx via @fontsource.
        sans: ['Calibre', 'Carlito', 'Calibri', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        serif: ['Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Cascadia Code', 'monospace'],
      },
    },
  },
  plugins: [],
};

// Exported for scripts/design-tokens.test.ts, which compares these against the
// CSS variables in globals.css.
module.exports.tokens = tokens;
module.exports.boxShadow = boxShadow;
