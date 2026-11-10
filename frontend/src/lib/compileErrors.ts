import type { CodeLang } from './codeApi';

/** One problem the compiler (or a Python traceback) reported, at a 1-based line. */
export interface CodeDiagnostic { line: number; col: number | null; severity: 'error' | 'warning'; message: string }

/**
 * Turns compiler output into line diagnostics for the editor:
 *   gcc / g++   main.cpp:5:12: error: expected ';' before 'return'
 *   javac       Main.java:7: error: cannot find symbol
 *   python      File "/piston/jobs/…/main.py", line 4  …  SyntaxError: invalid syntax
 */
export function parseDiagnostics(lang: CodeLang, text: string): CodeDiagnostic[] {
  const out: CodeDiagnostic[] = [];
  if (!text) return out;
  const lines = text.split(/\r?\n/);
  if (lang === 'c' || lang === 'cpp') {
    for (const l of lines) {
      const m = l.match(/main\.c(?:pp)?:(\d+):(\d+):\s*(fatal error|error|warning):\s*(.*)$/);
      if (m) out.push({ line: +m[1], col: +m[2], severity: m[3] === 'warning' ? 'warning' : 'error', message: m[4] });
    }
  } else if (lang === 'java') {
    lines.forEach((l, i) => {
      const m = l.match(/\.java:(\d+):\s*(error|warning):\s*(.*)$/);
      if (m) {
        // javac prints the source line, then a caret under the column.
        const caret = lines[i + 2] && /^\s*\^\s*$/.test(lines[i + 2]) ? lines[i + 2].indexOf('^') + 1 : null;
        out.push({ line: +m[1], col: caret, severity: m[2] === 'warning' ? 'warning' : 'error', message: m[3] });
      }
    });
  } else if (lang === 'python') {
    let line = 0;
    for (const l of lines) {
      const m = l.match(/File "[^"]*main\.py", line (\d+)/);
      if (m) line = +m[1];
    }
    const last = [...lines].reverse().find((l) => /^\w+(Error|Exception)\b/.test(l.trim()));
    if (line) out.push({ line, col: null, severity: 'error', message: last ? last.trim() : 'Error on this line' });
  }
  return out;
}
