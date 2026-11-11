import React, { useEffect, useMemo, useRef } from 'react';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { python } from '@codemirror/lang-python';
import { EditorView, keymap } from '@codemirror/view';
import { indentUnit } from '@codemirror/language';
import { lintGutter, setDiagnostics, type Diagnostic } from '@codemirror/lint';
import type { CodeLang } from '@/lib/codeApi';
import type { CodeDiagnostic } from '@/lib/compileErrors';
import { resolveTheme, type IdeSettings } from './ideSettings';
import { editorTheme } from './editorThemes';


/**
 * The IDE editor (CodeMirror 6): language mode, autocomplete, bracket
 * matching, compiler errors as underlines + gutter markers, and the student's
 * settings. Loaded client-side only.
 */
export default function IdeEditor({ value, onChange, lang, settings, siteDark, diagnostics, onRun, onSubmit, label }: {
  value: string; onChange: (v: string) => void; lang: CodeLang; settings: IdeSettings; siteDark: boolean;
  diagnostics: CodeDiagnostic[]; onRun: () => void; onSubmit: () => void; label: string;
}) {
  const ref = useRef<ReactCodeMirrorRef>(null);
  const runRef = useRef(onRun);
  const submitRef = useRef(onSubmit);
  runRef.current = onRun;
  submitRef.current = onSubmit;

  const extensions = useMemo(() => [
    lang === 'python' ? python() : lang === 'java' ? java() : cpp(),
    indentUnit.of(' '.repeat(settings.tabSize)),
    ...(settings.wrap ? [EditorView.lineWrapping] : []),
    EditorView.theme({ '&': { fontSize: `${settings.fontSize}px`, height: '100%' }, '.cm-scroller': { fontFamily: 'var(--font-mono), ui-monospace, monospace', lineHeight: '1.6' } }),
    EditorView.contentAttributes.of({ 'aria-label': label }),
    lintGutter(),
    // Ctrl/Cmd + ' runs, Ctrl/Cmd + Enter submits (same as the toolbar).
    keymap.of([
      { key: "Mod-'", preventDefault: true, run: () => { runRef.current(); return true; } },
      { key: 'Mod-Enter', preventDefault: true, run: () => { submitRef.current(); return true; } },
    ]),
  ], [lang, settings.tabSize, settings.wrap, settings.fontSize, label]);

  // Compiler errors → editor diagnostics (line/column → document positions).
  useEffect(() => {
    const view = ref.current?.view;
    if (!view) return;
    const doc = view.state.doc;
    const diags: Diagnostic[] = diagnostics.filter((d) => d.line >= 1 && d.line <= doc.lines).map((d) => {
      const line = doc.line(d.line);
      const from = d.col ? Math.min(line.from + d.col - 1, line.to) : line.from;
      return { from, to: d.col ? Math.min(from + 1, line.to) || line.to : line.to, severity: d.severity, message: d.message };
    });
    view.dispatch(setDiagnostics(view.state, diags));
  }, [diagnostics, value]);

  const themeId = resolveTheme(settings, siteDark);
  return (
    <CodeMirror
      ref={ref}
      value={value}
      onChange={onChange}
      height="100%"
      theme={editorTheme(themeId)}
      extensions={extensions}
      basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true, autocompletion: true, closeBrackets: true, bracketMatching: true, indentOnInput: true, tabSize: settings.tabSize }}
      indentWithTab
      className="h-full"
    />
  );
}
