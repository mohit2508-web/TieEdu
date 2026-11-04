/**
 * Splits a test question into its prompt and its code block.
 * - Infosys pseudocode: the prompt comes first ("What is the output of this pseudocode?"), then the code.
 * - Code questions (`code: true`, e.g. Swift output questions): the code comes first, the prompt after the last blank line.
 */
export function splitQuestion(question: string, code?: boolean): { before: string; code: string; after: string } {
  if (/pseudocode\?/.test(question)) {
    const cut = question.indexOf('\n\n');
    if (cut > 0) return { before: question.slice(0, cut), code: question.slice(cut + 2), after: '' };
  }
  if (code) {
    const cut = question.lastIndexOf('\n\n');
    return cut > 0
      ? { before: '', code: question.slice(0, cut), after: question.slice(cut + 2) }
      : { before: '', code: question, after: '' };
  }
  return { before: question, code: '', after: '' };
}
