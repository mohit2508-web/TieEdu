/**
 * The code block's language vocabulary.
 *
 * Kept apart from the renderer so it can be unit tested: the renderer is a `.tsx`
 * file with React and Prism imports, and pulling those into a plain node test
 * would mean a DOM environment for a pure string mapping.
 */

/** Languages the code block can switch between. */
export const CODE_LANGS = ['cpp', 'java', 'python', 'ts'] as const;

export type CodeLang = (typeof CODE_LANGS)[number];

/** Prism registers the TypeScript grammar under its full name. */
export const prismName = (lang: CodeLang) => (lang === 'ts' ? 'typescript' : lang);

/**
 * Accepts anything an author or an older payload might have stored ("Python",
 * "py", "typescript", "", null) and returns a language the switcher can render.
 *
 * Unknown values fall back to C++ rather than rendering unhighlighted text. That
 * fallback is a judgement call: a code block with no recognised language is
 * still readable, just plain — whereas an unresolvable language would render the
 * whole Prism import pointless.
 */
export const resolveLang = (raw: unknown): CodeLang => {
  const value = String(raw ?? '').trim().toLowerCase();
  if (!value) return 'cpp';

  const direct = CODE_LANGS.find((l) => l === value);
  if (direct) return direct;

  if (value === 'typescript' || value === 'javascript' || value === 'js' || value === 'javascriptreact') {
    return 'ts';
  }
  if (value === 'py' || value === 'python3') return 'python';
  if (value === 'c' || value === 'c++' || value === 'cplusplus' || value === 'cc') return 'cpp';
  if (value === 'jvm' || value === 'kotlin') return 'java';

  return 'cpp';
};
