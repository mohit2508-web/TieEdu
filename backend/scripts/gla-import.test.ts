/**
 * GLA University placement-data import — parser tests.
 *
 * Source-level, no server, no PostgreSQL, so it runs inside the normal `npm test`
 * chain. The importer is pure on purpose: the fiddly 90% (date cells that are
 * Excel serials or dd.mm.yyyy, counting cells like "0 / 290", packages in rupees
 * or LPA, column renames, stray tail cells, empty packages that must NOT be
 * dropped) has to be pinned to behavior, not left to a manual run against a live
 * database that already contains the answer.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  detectDelimiter,
  parseCsv,
  excelSerialToIso,
  toSerialDays,
  parseDateCell,
  seasonForDate,
  parseIntLeading,
  toLpa,
  parseDriveMode,
  parseYesNo,
  parseGender,
  parseDisplayDate,
  normalizeCompanyName,
  parseDriveLog,
  parseStudentMaster,
  summarize,
  driveRowIssues,
} from '../src/placement/glaImport';

// ---------------------------------------------------------------------------
// Fileparsing
// ---------------------------------------------------------------------------

test('detectDelimiter picks the tab for a TSV paste', () => {
  assert.equal(detectDelimiter('Sr. No.\tCompany Name\tBranch\tType'), '\t');
});

test('detectDelimiter picks the comma for a CSV export', () => {
  assert.equal(detectDelimiter('Sr. No.,Company Name,Branch,Type'), ',');
});

test('parseCsv handles quoted commas, escaped quotes and CRLF', () => {
  const rows = parseCsv('a,"b,c","he said ""hi""",d\r\ne,f,g,h');
  assert.deepEqual(rows, [
    ['a', 'b,c', 'he said "hi"', 'd'],
    ['e', 'f', 'g', 'h'],
  ]);
});

test('parseCsv keeps an empty trailing cell and drops blank lines', () => {
  const rows = parseCsv('a,b,\nc,d,\n\n', ',');
  assert.deepEqual(rows, [
    ['a', 'b', ''],
    ['c', 'd', ''],
  ]);
});

// ---------------------------------------------------------------------------
// Value normalizers
// ---------------------------------------------------------------------------

test('excelSerialToIso uses the standard 1899-12-30 origin', () => {
  assert.equal(excelSerialToIso(25569), '1970-01-01');
  assert.equal(excelSerialToIso(44927), '2023-01-01');
  assert.equal(excelSerialToIso(46156), '2026-05-14');
  assert.equal(toSerialDays('2026-05-14'), 46156);
});

test('parseDateCell accepts dd.mm.yyyy, serials and rejects junk', () => {
  assert.equal(parseDateCell('14.05.2026'), '2026-05-14');
  assert.equal(parseDateCell('46156'), '2026-05-14');
  assert.equal(parseDateCell('2026-05-14'), null); // iso round-trips nothing — parser is dd/serial only
  assert.equal(parseDateCell(''), null);
  assert.equal(parseDateCell('n/a'), null);
});

test('parseDisplayDate is dd.mm.yyyy only — never serial, so shifted rows cannot invent dates', () => {
  assert.equal(parseDisplayDate('14.05.2026'), '2026-05-14');
  assert.equal(parseDisplayDate('60000'), null);
  assert.equal(parseDisplayDate('Oct 2025'), null);
  assert.equal(parseDisplayDate(''), null);
});

test('a column-shifted drive row is realigned and dated from its Date column, never a 2064 serial', () => {
  // Reproduces the real Dec-2022 → Apr-2024 rows: the empty "Program" column is
  // missing, so the Branch..T(P) block sits one column left. In this shifted
  // layout the "Date" cell holds the display date and the "On" cell the stipend
  // ("0" here) — the parser must realign the categorical/numeric block and
  // recover the date, not mint a future serial out of the stipend.
  const rows = parseCsv(
    [
      DRIVE_HEADER,
      '183,Shiftco,2301020003,Test Officer,CS,A+,Y,,Online Campus,11.01.2023,0,800000,6,4,310 / 380,275,,,11,',
    ].join('\n')
  );
  const drives = parseDriveLog(rows);
  assert.equal(drives.length, 1);
  const [d] = drives;
  assert.equal(d.companyName, 'Shiftco');
  assert.equal(d.eligibilityBranch, 'CS', 'Branch reads from the shifted cell');
  assert.equal(d.category, 'A+');
  assert.equal(d.brand, 'Y');
  assert.equal(d.mode, 'Online Campus');
  assert.equal(d.date, '2023-01-11', 'display date recovered from the Date cell');
  assert.equal(d.seasonId, '2022-23', 'Jan 2023 belongs to the 2022-23 season');
  assert.equal(d.stipend, 0);
  assert.equal(d.packageCtcLpa, 8, 'package realigned: 800000 → 8 LPA');
  assert.deepEqual(d.courses, ['6']);
  assert.deepEqual(d.rounds, [4]);
  assert.equal(d.registered, 310, '"310 / 380" reads as 310');
  assert.equal(d.appeared, 275);
  assert.equal(d.selected, 11, 'Placed realigned');
  assert.deepEqual(driveRowIssues(rows), { shifted: 1, dateless: 0 });
});

test('a drive row with a number in On and no Date anywhere stays dateless', () => {
  const rows = parseCsv(
    [DRIVE_HEADER, '9,NoDate Co,2601010001,Officer X,,B.Tech. - CS,A+,N,Online Campus,junk,60000,300000,6,4,110 / 200,80,,,2,'].join('\n')
  );
  const drives = parseDriveLog(rows);
  assert.equal(drives.length, 1);
  assert.equal(drives[0].date, null);
  assert.equal(drives[0].seasonId, '2025-26', 'dateless drives fall back to the default season');
  assert.equal(summarize(drives, []).datelessDriveCount, 1);
  assert.deepEqual(driveRowIssues(rows), { shifted: 0, dateless: 1 });
});

test('seasonForDate follows the Jul–Jun academic year', () => {
  assert.equal(seasonForDate('2025-08-14'), '2025-26');
  assert.equal(seasonForDate('2026-05-14'), '2025-26');
  assert.equal(seasonForDate('2023-12-10'), '2023-24');
  assert.equal(seasonForDate('2024-01-03'), '2023-24');
  assert.equal(seasonForDate(null), '2025-26');
});

test('parseIntLeading reads the integer out of annotated count cells', () => {
  assert.equal(parseIntLeading('0 / 290'), 0);
  assert.equal(parseIntLeading('0 (15)'), 0);
  assert.equal(parseIntLeading('124'), 124);
  assert.equal(parseIntLeading(''), null);
});

test('toLpa converts rupees to LPA and leaves LPA alone', () => {
  assert.equal(toLpa('350000'), 3.5);
  assert.equal(toLpa('6000000'), 60);
  assert.equal(toLpa('6,500,000'), 65);
  assert.equal(toLpa('6.5'), 6.5);
  assert.equal(toLpa('17.50'), 17.5);
  assert.equal(toLpa('14,00'), 14);
  assert.equal(toLpa('0'), 0);
  assert.equal(toLpa('--'), null);
  assert.equal(toLpa(''), null);
});

test('parseDriveMode keeps on/off/online/pool, title-cases the rest', () => {
  assert.equal(parseDriveMode('On Campus Drive'), 'On Campus');
  assert.equal(parseDriveMode('Off Campus'), 'Off Campus');
  assert.equal(parseDriveMode('Online Campus'), 'Online Campus');
  assert.equal(parseDriveMode('Pool'), 'Pool');
  assert.equal(parseDriveMode('virtual'), 'virtual');
});

test('parseYesNo and parseGender normalize categorical cells', () => {
  assert.equal(parseYesNo('Y'), 'Y');
  assert.equal(parseYesNo('no'), 'N');
  assert.equal(parseYesNo(''), null);
  assert.equal(parseGender('M'), 'Male');
  assert.equal(parseGender('F'), 'Female');
  assert.equal(parseGender(''), null);
});

test('normalizeCompanyName aligns name variants', () => {
  assert.equal(normalizeCompanyName('  Amantya Technologies '), 'amantya technologies');
  assert.equal(normalizeCompanyName('Infosys Ltd.'), 'infosys ltd');
  assert.equal(normalizeCompanyName('"Accenture"'), 'accenture');
  assert.equal(normalizeCompanyName('Wipro'), 'wipro');
});

// ---------------------------------------------------------------------------
// Drive-log mapping
// ---------------------------------------------------------------------------

// Layout of the real GLA export: an empty "Program" column after the officer,
// and a trailing empty cell. Rows in the Dec-2022 → Apr-2024 block miss the
// Program cell (see the shifted-row test below).
const DRIVE_HEADER =
  'Sr. No.,Company Name,Reference No.,Officer Name,,Branch,Cat.,Brand,Type,Date,On,Stipend,Package,Courses,Rounds,T(E),T(A),T(P),Placed,';

const DRIVE_ROWS_RAW = [
  DRIVE_HEADER,
  // Amantya: both serial 46161 and On 14.05.2026 → calibrates the file's serial
  // origin to +5 days off the standard epoch (46161 - 46156).
  '1,Amantya Technologies,2605001,A. Singh,,CS,A+,Y,On Campus Drive,46161,14.05.2026,,350000,"B.Tech (CS) / BBA",1 2 3,0 / 290,124,0 (15),64,',
  // Infosys: On blank, serial 46147 → must come out calibrated (46147+5=46152=09 May 2026).
  '2,Infosys Ltd,2602001,R. Sharma,,CS+CSE,A,N,Off Campus,46147,,,6.5,CS,4,300,134,134,,',
  '3,Globex Innovations,2311201,P. Verma,,CSE,B,N,Online Campus,45271,10.12.2023,,12.0,CS,2,40,18,0 (15),,',
  '',
  '4,,,,,,', // missing company name — skipped
];

test('parseDriveLog maps the drive log end-to-end', () => {
  const rows = parseCsv(DRIVE_ROWS_RAW.join('\n'), ',');
  const drives = parseDriveLog(rows);
  assert.equal(drives.length, 3, 'blank and company-less rows are skipped');

  const [amantya, infosys, globex] = drives;

  assert.equal(amantya.companyName, 'Amantya Technologies');
  assert.equal(amantya.referenceNo, '2605001');
  assert.equal(amantya.officer, 'A. Singh');
  assert.equal(amantya.eligibilityBranch, 'CS');
  assert.equal(amantya.category, 'A+');
  assert.equal(amantya.brand, 'Y');
  assert.equal(amantya.mode, 'On Campus');
  assert.equal(amantya.date, '2026-05-14');
  assert.equal(amantya.seasonId, '2025-26');
  assert.deepEqual(amantya.courses, ['B.Tech (CS)', 'BBA']);
  assert.deepEqual(amantya.rounds, [1, 2, 3]);
  assert.equal(amantya.registered, 0, '"0 / 290" reads as 0');
  assert.equal(amantya.appeared, 124);
  assert.equal(amantya.selected, 64, 'Placed column wins over T(P)');
  assert.equal(amantya.packageCtcLpa, 3.5, 'rupee package converted to LPA');

  assert.equal(infosys.date, '2026-05-10', 'serial-only row applies the calibrated file offset');
  assert.equal(infosys.seasonId, '2025-26');
  assert.equal(infosys.mode, 'Off Campus');
  assert.equal(infosys.packageCtcLpa, 6.5);
  assert.equal(infosys.selected, 134, 'falls back to T(P) when Placed is empty');

  assert.equal(globex.date, '2023-12-10', 'On column wins when both columns are present');
  assert.equal(globex.seasonId, '2023-24');
  assert.equal(globex.selected, 0, '"0 (15)" reads as 0');
});

// ---------------------------------------------------------------------------
// Student-masterfile mapping
// ---------------------------------------------------------------------------

const STUDENT_HEADER =
  'Roll No.,Batch,Course,Yr.,Name,Gen.,Mob(S),Mob(F),Email,Email(Per),Comm. Address,State,District,Adm. Office,D/H,10%,10th Board,10th District,12%,12th Board,12th School,12th District,C%,CPI,Att%,C.O.,Gap(A),Drive (Participated),Placed,Company Placed-1,Company Placed-2,Company Placed-3,Company Placed-4,Total Placed,Highest Package,Packages-1,Packages-2,Packages-3,Packages-4,Grad. Univ.,Grad. City.,10th Year.,12th Year,Grad. Year,DOB,12th Stream,Attendance Status,Blocked,Is EJ,EJ Details,Total Invitation,Replied,Said Yes,Said No,Ready,Selected,PCM(%Age)';

const STUDENT_ROWS_RAW = [
  STUDENT_HEADER,
  '2215800001,1,B.Tech (Hons.) CS,IV,Aadhya Test Student,F,9870000001,,aadhya@test.in,aadhya.per@test.in,"Mathura, UP",UP,Mathura,Mathura,N,84.2%,CBSE,Mathura,78.5%,CBSE,St X Mathura,Mathura,82.0%,7.8,88.5%,0,0,4,Y,Amantya Technologies,Infosys Ltd,,,2,17.50,8.00,17.50,,,,,2026,2021,2022,2004-05-01,Science,Good,N,N,,6,5,4,0,4,87.0',
  '2215800002,2,B.Tech CS,PO,Rohan Test Student,M,9870000002,,rohan@test.in,,Agra,UP,Agra,Agra,N,65.0%,UP Board,Agra,--,CBSE,Agra,Agra,--,6.2,72.0%,2,0,2,Y,Solytics,,, ,1,--,,,,,,2027,2022,2023,2005-01-01,Commerce,Good,N,N,,4,4,3,0,3,76.0',
  '2215800003,1,B.Tech CS (AIML),PO,Meera Test Student,F,9870000003,,meera@test.in,,Mathura,UP,Mathura,Mathura,Y,71.0%,CBSE,Mathura,68.0%,CBSE,St X Mathura,Mathura,69.0%,6.8,80.0%,0,1,0,N,,,,,0,--,,,,,,2026,2021,2022,2004-09-09,Science,Good,N,N,,2,0,0,0,0,75.0',
];

test('parseStudentMaster maps profiles, season dims and offer alignment', () => {
  const students = parseStudentMaster(parseCsv(STUDENT_ROWS_RAW.join('\n'), ','));
  assert.equal(students.length, 3);

  const [aadhya, rohan, meera] = students;

  assert.equal(aadhya.rollNo, '2215800001');
  assert.equal(aadhya.name, 'Aadhya Test Student');
  assert.equal(aadhya.gender, 'Female');
  assert.equal(aadhya.course, 'B.Tech (Hons.) CS');
  assert.equal(aadhya.state, 'UP');
  assert.equal(aadhya.class10Pct, 84.2);
  assert.equal(aadhya.class12Pct, 78.5);
  assert.equal(aadhya.btechPct, 82.0);
  assert.equal(aadhya.cpi, 7.8);
  assert.equal(aadhya.attendancePct, 88.5);
  assert.equal(aadhya.backlogs, 0);
  assert.equal(aadhya.gapYear, 0);
  assert.equal(aadhya.drivesParticipated, 4);
  assert.equal(aadhya.placed, 'Y');
  assert.equal(aadhya.totalPlaced, 2);
  assert.equal(aadhya.highestPackageCtcLpa, 17.5);

  assert.deepEqual(aadhya.offers, [
    { companyName: 'Amantya Technologies', ctcLpa: 8.0 },
    { companyName: 'Infosys Ltd', ctcLpa: 17.5 },
  ], 'offers align Company Placed-k with Packages-k');

  assert.equal(rohan.gender, 'Male');
  assert.equal(rohan.cpi, 6.2);
  assert.equal(rohan.class12Pct, null, '"--" percent not coerced to a number');
  assert.equal(rohan.btechPct, null);
  assert.equal(rohan.placed, 'Y');
  assert.deepEqual(rohan.offers, [{ companyName: 'Solytics', ctcLpa: null }], 'a paid placement with no package keeps ctc_lpa NULL');
  assert.equal(rohan.highestPackageCtcLpa, null);

  assert.equal(meera.placed, 'N');
  assert.deepEqual(meera.offers, []);
});

// ---------------------------------------------------------------------------
// Reconciliation summary
// ---------------------------------------------------------------------------

test('summarize reconciles drive-log placed totals with student offers', () => {
  const drives = parseDriveLog(parseCsv(DRIVE_ROWS_RAW.join('\n'), ','));
  const students = parseStudentMaster(parseCsv(STUDENT_ROWS_RAW.join('\n'), ','));
  const s = summarize(drives, students);

  assert.equal(s.driveCount, 3);
  assert.equal(s.distinctCompanies, 3);
  assert.deepEqual(s.seasonIds, ['2023-24', '2025-26']);
  assert.equal(s.studentCount, 3);
  assert.equal(s.placedStudents, 2);
  assert.equal(s.offerCount, 3);
  assert.equal(s.datelessDriveCount, 0, 'main fixture has dates on every drive');

  assert.equal(s.perCompanyDrivePlaced['amantya technologies'], 64);
  assert.equal(s.perCompanyDrivePlaced['infosys ltd'], 134);
  assert.equal(s.perCompanyOfferCount['amantya technologies'], 1);
  assert.equal(s.perCompanyOfferCount['infosys ltd'], 1);

  assert.deepEqual(s.unmatchedOfferCompanies, ['solytics'], 'offer company with no drive-log row is reported, not created');
});