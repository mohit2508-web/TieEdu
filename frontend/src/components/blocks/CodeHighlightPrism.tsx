import React from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter/dist/cjs/prism-light';
import c from 'react-syntax-highlighter/dist/cjs/languages/prism/c';
import cpp from 'react-syntax-highlighter/dist/cjs/languages/prism/cpp';
import typescript from 'react-syntax-highlighter/dist/cjs/languages/prism/typescript';
import java from 'react-syntax-highlighter/dist/cjs/languages/prism/java';
import python from 'react-syntax-highlighter/dist/cjs/languages/prism/python';
import bash from 'react-syntax-highlighter/dist/cjs/languages/prism/bash';
import json from 'react-syntax-highlighter/dist/cjs/languages/prism/json';
import { oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';

/** Prism and its grammars, loaded only by CodeHighlight when a page shows code. */
SyntaxHighlighter.registerLanguage('c', c);
SyntaxHighlighter.registerLanguage('cpp', cpp);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('ts', typescript);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('json', json);

export const PrismCode: React.FC<{ code: string; language: string }> = ({ code, language }) => (
  <SyntaxHighlighter
    language={language}
    style={oneLight}
    showLineNumbers
    customStyle={{ margin: 0, padding: '1rem 1.25rem', background: 'transparent', fontSize: '0.82rem' }}
  >
    {code}
  </SyntaxHighlighter>
);
