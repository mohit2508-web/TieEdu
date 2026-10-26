const fs = require('fs');
const path = require('path');
const { marked } = require(path.join(__dirname, '..', 'frontend', 'node_modules', 'marked'));

const inArg = process.argv[2];
const outArg = process.argv[3];
const mdPath = inArg
  ? path.resolve(inArg)
  : path.join(__dirname, '..', 'PLACEMENT_PREP_PATH_STUDENT_ROADMAP.md');
const htmlPath = outArg
  ? path.resolve(outArg)
  : path.join(__dirname, 'placement-roadmap.html');

const md = fs.readFileSync(mdPath, 'utf8');
const body = marked.parse(md, { gfm: true, breaks: false });

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>TieEdu Placement Prep Path — 2-Year Student Roadmap</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    font-family: 'Segoe UI', 'Calibri', 'Inter', -apple-system, sans-serif;
    font-size: 10.5pt; line-height: 1.65; color: #1E293B;
    margin: 0; padding: 0; background: #fff;
  }
  h1 {
    font-size: 24pt; line-height: 1.25; color: #0F172A;
    border-bottom: 4px solid #0284C7; padding-bottom: 12px;
    margin: 0 0 10px 0; page-break-before: auto;
  }
  h1:first-of-type { text-align: center; font-size: 26pt; }
  h1 + h3 { text-align: center; color: #0284C7; font-size: 14pt; margin-top: -4px; font-weight: 600; }
  h2 {
    font-size: 15pt; color: #fff; background: linear-gradient(135deg, #0284C7, #0369A1);
    padding: 8px 14px; border-radius: 6px; margin: 26px 0 12px 0;
    page-break-after: avoid;
  }
  h3 { font-size: 12.5pt; color: #0F172A; margin: 20px 0 8px 0; border-left: 4px solid #E8A33D; padding-left: 10px; page-break-after: avoid; }
  h4 { font-size: 11pt; color: #0369A1; margin: 16px 0 6px 0; page-break-after: avoid; }
  p { margin: 8px 0; }
  strong { color: #0F172A; }
  blockquote {
    background: #F0F9FF; border-left: 4px solid #0284C7;
    margin: 12px 0; padding: 10px 16px; border-radius: 0 6px 6px 0;
    color: #334155; font-size: 10pt;
  }
  blockquote p { margin: 4px 0; }
  table {
    width: 100%; border-collapse: collapse; margin: 12px 0;
    font-size: 9.5pt; page-break-inside: avoid;
  }
  th {
    background: #0284C7; color: #fff; text-align: left;
    padding: 7px 9px; font-weight: 600; font-size: 9pt;
  }
  td { padding: 6px 9px; border-bottom: 1px solid #E2E8F0; vertical-align: top; }
  tr:nth-child(even) td { background: #F8FAFC; }
  tr:hover td { background: #F0F9FF; }
  code {
    font-family: 'Cascadia Code', 'Consolas', monospace;
    background: #F1F5F9; padding: 1px 5px; border-radius: 3px;
    font-size: 9pt; color: #0369A1;
  }
  pre {
    background: #0F172A; color: #E2E8F0; padding: 14px 16px;
    border-radius: 8px; overflow-x: hidden; font-size: 8.5pt;
    line-height: 1.5; page-break-inside: avoid;
  }
  pre code { background: none; color: inherit; padding: 0; font-size: inherit; }
  ul, ol { margin: 8px 0; padding-left: 22px; }
  li { margin: 4px 0; }
  hr { border: none; border-top: 2px dashed #CBD5E1; margin: 22px 0; }
  a { color: #0284C7; text-decoration: none; }
  em { color: #64748B; }
  h2:not(:first-child) { page-break-before: auto; }
  /* cover polish for first h1 block */
  h1:first-of-type + h3 + blockquote { border-radius: 8px; }
  /* avoid breaking tables & cards */
  tr, blockquote, pre, h2, h3, h4 { page-break-inside: avoid; }
  @media print {
    body { font-size: 10pt; }
    h2 { page-break-before: auto; }
  }
</style>
</head>
<body>
${body}
</body>
</html>`;

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('HTML written:', htmlPath);
