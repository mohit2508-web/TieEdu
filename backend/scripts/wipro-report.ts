// ============================================================================
// Wipro iOS lab report from the command line (WIPRO_LAB_REPORT_PLAN.md §4).
// Run on the server, next to the live store; reads only, writes three files:
//   npm run report:wipro -- --out ./reports [--class <classId>]
// Output: wipro-lab-report-<date>.xlsx, -csv.zip and .pdf. The files hold
// student names and emails, so keep them private.
// ============================================================================
import fs from 'fs';
import path from 'path';
import { loadDb } from '../src/data/db';
import { buildWiproReport } from '../src/lib/pulse/wiproReport';
import { reportXlsx, reportCsvZip, reportPdf } from '../src/lib/pulse/wiproReportFiles';

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
(async () => {
  const out = path.resolve(arg('--out') || './reports');
  const classId = arg('--class') || null;
  const report = buildWiproReport(loadDb(), { id: 'cli', role: 'admin' }, { classId });
  fs.mkdirSync(out, { recursive: true });
  const base = path.join(out, `wipro-lab-report-${report.today}${classId ? `-${classId}` : ''}`);
  fs.writeFileSync(`${base}.xlsx`, reportXlsx(report));
  fs.writeFileSync(`${base}-csv.zip`, reportCsvZip(report));
  fs.writeFileSync(`${base}.pdf`, await reportPdf(report));
  console.log(`${report.scope}: ${report.students.length} students, ${report.labs.length} labs`);
  for (const f of report.findings) console.log(`- ${f}`);
  console.log(`\nWritten: ${base}.xlsx, ${base}-csv.zip, ${base}.pdf`);
})().catch((e) => { console.error(e?.message || e); process.exit(1); });
