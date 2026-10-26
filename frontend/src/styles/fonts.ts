/*
 * TieEdu type system — four families, self-hosted through next/font.
 *
 *   body     Figtree               UI and running text (replaces Carlito, the
 *                                  Calibri clone the whole site rendered in)
 *   display  Bricolage Grotesque   headings and big numbers
 *   serif    Source Serif 4        long-form lesson reading
 *   mono     JetBrains Mono        code only — never labels or prices
 *
 * Files come from the @fontsource packages already in node_modules, so nothing
 * is fetched from Google at build or run time. Only the body face is preloaded
 * on every route; the others load when a page actually uses them.
 *
 * `_app` publishes each family as a CSS variable on :root (see FontVariables),
 * so portalled overlays outside the React tree get the same fonts.
 */
import localFont from 'next/font/local';

export const fontBody = localFont({
  src: [
    { path: '../../node_modules/@fontsource/figtree/files/figtree-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../node_modules/@fontsource/figtree/files/figtree-latin-400-italic.woff2', weight: '400', style: 'italic' },
    { path: '../../node_modules/@fontsource/figtree/files/figtree-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../../node_modules/@fontsource/figtree/files/figtree-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: '../../node_modules/@fontsource/figtree/files/figtree-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
});

export const fontDisplay = localFont({
  src: [
    { path: '../../node_modules/@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: '../../node_modules/@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  preload: false,
  fallback: ['system-ui', 'Segoe UI', 'Arial', 'sans-serif'],
});

export const fontSerif = localFont({
  src: [
    { path: '../../node_modules/@fontsource/source-serif-4/files/source-serif-4-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../node_modules/@fontsource/source-serif-4/files/source-serif-4-latin-400-italic.woff2', weight: '400', style: 'italic' },
    { path: '../../node_modules/@fontsource/source-serif-4/files/source-serif-4-latin-600-normal.woff2', weight: '600', style: 'normal' },
  ],
  display: 'swap',
  preload: false,
  fallback: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
});

export const fontMono = localFont({
  src: [
    { path: '../../node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-600-normal.woff2', weight: '600', style: 'normal' },
  ],
  display: 'swap',
  preload: false,
  fallback: ['Cascadia Code', 'Consolas', 'ui-monospace', 'monospace'],
});

/** CSS that publishes the four families as variables on :root. */
export const fontVariablesCss = `:root {
  --font-body: ${fontBody.style.fontFamily};
  --font-display: ${fontDisplay.style.fontFamily};
  --font-serif: ${fontSerif.style.fontFamily};
  --font-mono: ${fontMono.style.fontFamily};
}`;
