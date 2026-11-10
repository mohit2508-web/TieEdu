/*
 * TiEEdu type system — "Warm Paper" (UI_REDESIGN_PLAN_V3 §5), self-hosted
 * through next/font.
 *
 *   display  Poppins          headings, buttons, numbers, prices (500–800)
 *   body     Mukta            UI and running text, lessons included (400–700)
 *            Mukta Devanagari the same face's Hindi glyphs, as a per-character
 *                             fallback, so Hindi runs render in Mukta too
 *   mono     JetBrains Mono   eyebrows, tags, badges, codes, countdowns, code
 *
 * `--font-serif` still exists for the lesson-reading classes that ask for it,
 * but now resolves to the body face: one reading font everywhere (plan D3).
 *
 * Files come from @fontsource packages in node_modules, so nothing is fetched
 * from Google at build or run time. Only Mukta 400 (Latin) is preloaded on
 * every route; the other weights and families load when a page uses them, and
 * the Devanagari file only when a page actually has Hindi text.
 *
 * `_app` publishes each family as a CSS variable on :root (see
 * fontVariablesCss), so portalled overlays outside the React tree get the same
 * fonts.
 */
import localFont from 'next/font/local';

export const fontBody = localFont({
  src: [
    { path: '../../node_modules/@fontsource/mukta/files/mukta-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../node_modules/@fontsource/mukta/files/mukta-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../../node_modules/@fontsource/mukta/files/mukta-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: '../../node_modules/@fontsource/mukta/files/mukta-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  preload: true,
  // No fallback list here: next/font appends it to the family, which would put
  // system fonts ahead of the Devanagari face. The system stack is added once,
  // at the end, in fontVariablesCss.
  fallback: [],
});

/*
 * Mukta's Devanagari glyphs as their own family. Placed right after the body
 * face in every stack, the browser uses it only for characters the Latin file
 * does not have, so it downloads only on pages with Hindi.
 */
export const fontDevanagari = localFont({
  src: [
    { path: '../../node_modules/@fontsource/mukta/files/mukta-devanagari-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../node_modules/@fontsource/mukta/files/mukta-devanagari-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../../node_modules/@fontsource/mukta/files/mukta-devanagari-600-normal.woff2', weight: '600', style: 'normal' },
    { path: '../../node_modules/@fontsource/mukta/files/mukta-devanagari-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  preload: false,
  fallback: [],
});

export const fontDisplay = localFont({
  src: [
    { path: '../../node_modules/@fontsource/poppins/files/poppins-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../../node_modules/@fontsource/poppins/files/poppins-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: '../../node_modules/@fontsource/poppins/files/poppins-latin-700-normal.woff2', weight: '700', style: 'normal' },
    { path: '../../node_modules/@fontsource/poppins/files/poppins-latin-800-normal.woff2', weight: '800', style: 'normal' },
  ],
  display: 'swap',
  preload: false,
  fallback: [],
});

export const fontMono = localFont({
  src: [
    { path: '../../node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../../node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  preload: false,
  fallback: ['Cascadia Code', 'Consolas', 'ui-monospace', 'monospace'],
});

const SYSTEM = `'Noto Sans Devanagari', 'Nirmala UI', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif`;
const body = `${fontBody.style.fontFamily}, ${fontDevanagari.style.fontFamily}`;

/** CSS that publishes the families as variables on :root. */
export const fontVariablesCss = `:root {
  --font-body: ${body}, ${SYSTEM};
  --font-display: ${fontDisplay.style.fontFamily}, ${body}, ${SYSTEM};
  --font-serif: ${body}, ${SYSTEM};
  --font-mono: ${fontMono.style.fontFamily};
}`;
