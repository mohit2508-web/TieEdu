import React, { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { python } from '@codemirror/lang-python';
import { EditorView } from '@codemirror/view';
import type { CodeLang } from '@/lib/codeApi';

/**
 * The code editor (CodeMirror 6): syntax highlighting, bracket matching,
 * auto-indent, Tab indents. Loaded client-side only (see CodeWorkspace).
 * Follows the site theme through the `dark` prop.
 */
export default function CodeEditor({ value, onChange, lang, dark, height = '420px', label }: {
  value: string; onChange: (v: string) => void; lang: CodeLang; dark: boolean; height?: string; label: string;
}) {
  const extensions = useMemo(() => [
    lang === 'python' ? python() : lang === 'java' ? java() : cpp(),
    EditorView.lineWrapping,
    EditorView.contentAttributes.of({ 'aria-label': label }),
  ], [lang, label]);
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      height={height}
      theme={dark ? 'dark' : 'light'}
      extensions={extensions}
      basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true, autocompletion: true, indentOnInput: true, tabSize: 4 }}
      indentWithTab
      className="overflow-hidden rounded-xl border border-line text-sm"
    />
  );
}
