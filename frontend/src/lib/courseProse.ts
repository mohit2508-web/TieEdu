/**
 * Text handling for the long-form course-page sections.
 *
 * This is a plain module with no React and no imports on purpose. The logic is
 * pure string work, and the test runner compiles its suites under stricter
 * settings than the app uses, so a suite cannot pull in a `.tsx` component
 * without dragging React, the icon set and the whole type graph along with it and
 * failing on unrelated files. Keeping the function here makes it directly
 * testable, and puts it next to `courseFormat.ts`, which has the same "never
 * invent a number, never depend on locale" contract.
 */

/**
 * Split long-form prose into paragraphs.
 *
 * The admin form saves plain text and the author separates paragraphs with a
 * blank line, so `\n\n` is the only structural break. Single newlines inside a
 * paragraph are collapsed to a space: a hard line break mid-sentence is a
 * wrapping artefact in the textarea, not something the author meant, and
 * honouring it would produce a ragged, unjustified block on the page.
 *
 * Returns an empty array for empty or whitespace-only input, which is what lets
 * the caller skip rendering the heading entirely. "Never written" and "written
 * and then cleared" have to look the same to the reader, and the only way to get
 * that is for the empty case to produce no paragraphs at all.
 *
 * Returns plain strings. The caller renders them as text nodes and never as HTML:
 * the field is authored prose, so `dangerouslySetInnerHTML` would turn "write a
 * paragraph about <script>" into a stored XSS on the course page. For the same
 * reason nothing is stripped - a line about `<div>` is real content, and silently
 * deleting it would be worse than showing it literally.
 */
export const proseParagraphs = (raw: string | undefined | null): string[] => {
  if (!raw) return [];
  return raw
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
};

/**
 * The rows of a bullet-list field, trimmed and with blanks dropped.
 *
 * The admin form edits these as one line per bullet, but it also accepts comma
 * separation, so a stray comma or a trailing newline should not produce an empty
 * `<li>`. Returns an empty array rather than a list containing one empty string,
 * because a single blank row is what makes a section render an empty bullet.
 */
export const bulletRows = (items: readonly string[] | undefined | null): string[] =>
  (items || []).map((s) => (s || '').trim()).filter(Boolean);
