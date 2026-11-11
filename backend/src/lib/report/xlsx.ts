import { zip } from './zip';

/**
 * A small .xlsx writer (Office Open XML) for admin reports: inline strings,
 * numbers, a bold header, frozen panes, auto-filter, column widths and a few
 * status fills. No formulas, no shared strings; Excel, LibreOffice and Google
 * Sheets open it as a normal workbook.
 */
export type CellStyle = 'header' | 'good' | 'warn' | 'bad' | 'muted' | 'bold' | 'title';
export type Cell = string | number | null | undefined | { v: string | number | null; s?: CellStyle };
export interface Sheet {
  name: string;
  columns: { header: string; width?: number }[];
  rows: Cell[][];
  /** Rows above the table (a title or a note), written before the header row. */
  intro?: Cell[][];
  /** Columns to freeze on the left (the header row is always frozen). */
  freezeCols?: number;
  filter?: boolean;
}

const STYLE_ID: Record<CellStyle, number> = { header: 1, good: 2, warn: 3, bad: 4, muted: 5, bold: 6, title: 7 };

const esc = (s: string) => s
  // XML 1.0 forbids most control characters.
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const colName = (i: number) => {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

const cellXml = (c: Cell, ref: string) => {
  const o = c !== null && typeof c === 'object' ? c : { v: c as any, s: undefined };
  const s = o.s ? ` s="${STYLE_ID[o.s]}"` : '';
  if (o.v === null || o.v === undefined || o.v === '') return o.s ? `<c r="${ref}"${s}/>` : '';
  if (typeof o.v === 'number' && Number.isFinite(o.v)) return `<c r="${ref}"${s}><v>${o.v}</v></c>`;
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(String(o.v).slice(0, 32000))}</t></is></c>`;
};

function sheetXml(sh: Sheet) {
  const intro = sh.intro || [];
  const headRow = intro.length + 1;
  const all: Cell[][] = [...intro, sh.columns.map((c) => ({ v: c.header, s: 'header' as const })), ...sh.rows];
  const lastCol = colName(Math.max(sh.columns.length, 1) - 1);
  const fc = sh.freezeCols || 0;
  const pane = `<pane ${fc ? `xSplit="${fc}" ` : ''}ySplit="${headRow}" topLeftCell="${colName(fc)}${headRow + 1}" activePane="${fc ? 'bottomRight' : 'bottomLeft'}" state="frozen"/>`;
  const cols = sh.columns.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.width || Math.min(Math.max(c.header.length + 2, 10), 40)}" customWidth="1"/>`).join('');
  const rows = all.map((r, ri) => `<row r="${ri + 1}">${r.map((c, ci) => cellXml(c, `${colName(ci)}${ri + 1}`)).join('')}</row>`).join('');
  const filter = sh.filter !== false && sh.rows.length ? `<autoFilter ref="A${headRow}:${lastCol}${headRow + sh.rows.length}"/>` : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0">${pane}</sheetView></sheetViews><cols>${cols}</cols><sheetData>${rows}</sheetData>${filter}</worksheet>`;
}

// Fills: header ink, and light tints for good / warning / critical / muted (dark ink stays readable on each).
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font></fonts>
<fills count="7"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF2B2A27"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFD7F2D7"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFDEBC2"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF6D3D3"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFEDECE8"/></patternFill></fill></fills>
<borders count="1"><border/></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="8"><xf/>
<xf fontId="1" fillId="2" applyFont="1" applyFill="1"/>
<xf fillId="3" applyFill="1"/>
<xf fillId="4" applyFill="1"/>
<xf fillId="5" applyFill="1"/>
<xf fillId="6" applyFill="1"/>
<xf fontId="2" applyFont="1"/>
<xf fontId="3" applyFont="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

/** Excel sheet names: ≤31 chars, no []:*?/\ and unique. */
const sheetNames = (sheets: Sheet[]) => {
  const seen = new Set<string>();
  return sheets.map((s, i) => {
    let n = s.name.replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31) || `Sheet${i + 1}`;
    while (seen.has(n.toLowerCase())) n = `${n.slice(0, 28)} ${i + 1}`;
    seen.add(n.toLowerCase());
    return n;
  });
};

export function toXlsx(sheets: Sheet[], when = new Date()): Buffer {
  const names = sheetNames(sheets);
  const files = [
    { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>` },
    { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>${
      // Auto-filters need a hidden defined name per sheet for Excel to keep them.
      sheets.some((s) => s.filter !== false && s.rows.length) ? `<definedNames>${sheets.map((s, i) => {
        if (s.filter === false || !s.rows.length) return '';
        const head = (s.intro?.length || 0) + 1;
        return `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${esc(names[i].replace(/'/g, "''"))}'!$A$${head}:$${colName(s.columns.length - 1)}$${head + s.rows.length}</definedName>`;
      }).join('')}</definedNames>` : ''}</workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: 'xl/styles.xml', data: STYLES },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s) })),
  ];
  return zip(files, when);
}

/** The same sheet as CSV (header row first; intro rows left out). UTF-8 BOM so Excel reads names correctly. */
export function sheetCsv(sh: Sheet): string {
  const val = (c: Cell) => (c !== null && typeof c === 'object' ? c.v : c);
  // A text cell starting with = + - @ would run as a formula in Excel; prefix it with ' (numbers stay numbers).
  const q = (v: unknown) => {
    const s = typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? `'${v}` : String(v ?? '');
    return `"${s.replace(/"/g, '""')}"`;
  };
  return '﻿' + [sh.columns.map((c) => c.header), ...sh.rows.map((r) => r.map(val))].map((r) => r.map(q).join(',')).join('\r\n');
}
