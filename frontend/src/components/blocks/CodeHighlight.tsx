import React, { useEffect, useState } from 'react';

/**
 * A highlighted code block whose highlighter loads on demand (A3).
 *
 * Prism and its grammars used to ride in the first load of every page that can
 * show a content block — company pages, lessons, the study plan — whether or
 * not the page had any code on it. Now the code renders at once as plain,
 * readable preformatted text (also what the server sends, so the content is
 * there without JavaScript), and gains colours when the highlighter arrives.
 */
type Highlighter = React.ComponentType<{ code: string; language: string }>;
let loaded: Highlighter | null = null;
let loading: Promise<Highlighter> | null = null;

const load = () =>
  (loading ??= import('./CodeHighlightPrism').then((m) => {
    loaded = m.PrismCode;
    return loaded;
  }));

const STYLE: React.CSSProperties = { margin: 0, padding: '1rem 1.25rem', background: 'transparent', fontSize: '0.82rem' };

export const CodeHighlight: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const [Impl, setImpl] = useState<Highlighter | null>(() => loaded);
  useEffect(() => {
    if (Impl) return;
    let live = true;
    load().then((c) => { if (live) setImpl(() => c); }).catch(() => { /* stays plain; still readable */ });
    return () => { live = false; };
  }, [Impl]);

  if (Impl) return <Impl code={code} language={language} />;
  return (
    <pre style={STYLE} className="font-mono text-heading">
      <code>{code}</code>
    </pre>
  );
};

export default CodeHighlight;
