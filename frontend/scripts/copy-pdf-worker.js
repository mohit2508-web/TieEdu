const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
const destDir = path.join(__dirname, '..', 'public', 'pdfjs');
const dest = path.join(destDir, 'pdf.worker.min.mjs');

if (!fs.existsSync(src)) {
  console.warn('[copy-pdf-worker] pdfjs worker not found at', src);
  process.exit(0);
}
fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log('[copy-pdf-worker] copied ->', dest);