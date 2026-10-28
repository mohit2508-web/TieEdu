// Builds every help book: HTML → PDF with headless Chrome, then a page-number
// footer stamped with pdf-lib (Chrome's CLI cannot add custom footers).
//
//   node docs/helpbooks/build.mjs            all books
//   node docs/helpbooks/build.mjs tpo        one book (file prefix)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
// pdf-lib is already a backend dependency.
const require = createRequire(path.join(here, '..', '..', 'backend', 'package.json'));
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => fs.existsSync(p));
if (!CHROME) throw new Error('Chrome or Edge is needed to print the help books.');

// A throwaway browser profile outside the repo, so nothing lands in docs/.
const PROFILE = path.join(os.tmpdir(), `tieedu-helpbooks-${process.pid}`);
const only = process.argv[2];
const books = fs.readdirSync(here).filter((f) => f.endsWith('.html') && (!only || f.startsWith(only)));

for (const html of books) {
  const pdf = path.join(here, html.replace(/\.html$/, '.pdf'));
  const tmp = `${pdf}.tmp`;
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-pdf-header-footer',
    `--user-data-dir=${PROFILE}`,
    `--print-to-pdf=${tmp}`, pathToFileURL(path.join(here, html)).href,
  ], { stdio: 'ignore' });

  const doc = await PDFDocument.load(fs.readFileSync(tmp));
  const title = (/<title>([^<]+)<\/title>/.exec(fs.readFileSync(path.join(here, html), 'utf8'))?.[1] || 'TieEdu')
    .replace(/&amp;/g, '&')
    // The footer font is Latin-only: keep the English part of a bilingual title.
    .replace(/—/g, '-')
    .replace(/[^\x20-\x7E]+/g, '')
    .replace(/[\s-]+$/, '')
    .trim();
  doc.setTitle(title);
  doc.setAuthor('TieEdu');
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    if (i === 0) return; // the cover carries no footer
    const text = `${title}  |  page ${i + 1} of ${pages.length}`;
    p.drawText(text, { x: 48, y: 26, size: 8, font, color: rgb(0.4, 0.44, 0.52) });
  });
  fs.writeFileSync(pdf, await doc.save());
  fs.rmSync(tmp, { force: true });
  console.log(`${path.basename(pdf)}: ${pages.length} pages`);
}
try {
  fs.rmSync(PROFILE, { recursive: true, force: true });
} catch {
  /* Chrome can hold a file for a moment after exiting; the temp folder is cleaned by the OS */
}
