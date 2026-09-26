import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

export interface PdfWatermarkOptions {
  studentName: string;
  studentEmail: string;
  rollNo: string;
  licenseId: string;
  companyName: string;
  moduleTitle: string;
  issuedDate?: string;
  insertNewCoverPage?: boolean;
}

function cleanText(str: string): string {
  if (!str) return '';
  return str
    .replace(/[•●▪]/g, '|')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/©/g, '(c)')
    .replace(/⌘/g, ' ')
    .replace(/[^\x20-\x7E]/g, '');
}

export async function buildPersonalizedPdf(
  originalPdfBuffer: Buffer,
  opts: PdfWatermarkOptions
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(originalPdfBuffer);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const issuedDate = opts.issuedDate || new Date().toISOString().split('T')[0];

  const studentName = cleanText(opts.studentName) || 'Authorized Student';
  const studentEmail = cleanText(opts.studentEmail) || 'student@tieedu.com';
  const rollNo = cleanText(opts.rollNo) || 'N/A';
  const licenseId = cleanText(opts.licenseId) || 'LIC-000000';
  const companyName = cleanText(opts.companyName) || 'TieEdu Placement Vault';
  const moduleTitle = cleanText(opts.moduleTitle) || 'Study Material';

  // 1. If explicit cover page insertion is requested for plain PDFs without cover template
  if (opts.insertNewCoverPage) {
    const coverPage = pdfDoc.insertPage(0, [595.28, 841.89]);
    const { width: cW, height: cH } = coverPage.getSize();

    // Top Dark Navy Header Banner (#1B365D)
    coverPage.drawRectangle({
      x: 0,
      y: cH - 120,
      width: cW,
      height: 120,
      color: rgb(0.106, 0.212, 0.365),
    });

    // Logo Square Icon (#E8A33D)
    coverPage.drawRectangle({
      x: 36,
      y: cH - 85,
      width: 48,
      height: 48,
      color: rgb(0.91, 0.64, 0.24),
    });
    coverPage.drawText('Ti', {
      x: 48,
      y: cH - 68,
      size: 26,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    // TiEdu Header Title
    coverPage.drawText('TiEdu', {
      x: 96,
      y: cH - 62,
      size: 30,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    coverPage.drawText('Learn    Evolve    Develop', {
      x: 96,
      y: cH - 82,
      size: 11,
      font: fontRegular,
      color: rgb(0.85, 0.9, 0.95),
    });

    // Header Subtitle
    coverPage.drawText('Verified recruitment intelligence & placement preparation  |  tieedu.in', {
      x: 36,
      y: cH - 110,
      size: 9,
      font: fontRegular,
      color: rgb(0.7, 0.8, 0.9),
    });

    // Category Tag
    coverPage.drawText('PLACEMENT STUDY MATERIAL', {
      x: 40,
      y: cH - 165,
      size: 11,
      font: fontBold,
      color: rgb(0.85, 0.45, 0.1),
    });

    // Title
    const titleText = `${companyName} - ${moduleTitle}`;
    coverPage.drawText(titleText.length > 45 ? titleText.slice(0, 45) + '...' : titleText, {
      x: 40,
      y: cH - 195,
      size: 20,
      font: fontBold,
      color: rgb(0.106, 0.212, 0.365),
    });

    // Subtitle
    coverPage.drawText('Technical MCQs  |  Output Prediction  |  DSA Coding  |  Debugging  |  Solutions', {
      x: 40,
      y: cH - 220,
      size: 10,
      font: fontRegular,
      color: rgb(0.4, 0.45, 0.5),
    });

    // Divider Line
    coverPage.drawLine({
      start: { x: 40, y: cH - 240 },
      end: { x: 260, y: cH - 240 },
      thickness: 3,
      color: rgb(0.91, 0.64, 0.24),
    });

    // Meta items
    const metaY = cH - 275;
    const metaItems = [
      { label: 'Module code', val: `[TE-${companyName.toUpperCase().slice(0, 3)}-01]` },
      { label: 'Target batch', val: '[B.Tech CSE / IT, Placement Batch 2026]' },
      { label: 'Difficulty', val: '[Medium to Advanced]' },
      { label: 'Total pages', val: `[${pdfDoc.getPageCount() - 1} Content Pages]` },
      { label: 'Version / Date', val: `[v1.0 | ${issuedDate}]` },
    ];

    metaItems.forEach((item, idx) => {
      const y = metaY - idx * 22;
      coverPage.drawText(cleanText(item.label), {
        x: 40,
        y,
        size: 10,
        font: fontBold,
        color: rgb(0.2, 0.25, 0.35),
      });
      coverPage.drawText(cleanText(item.val), {
        x: 160,
        y,
        size: 10,
        font: fontOblique,
        color: rgb(0.45, 0.5, 0.55),
      });
    });
  }

  // 2. Process ALL pages (Pages 0 to Total Pages)
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  // On Page 0 (Cover Page in template), stamp real student details into the Red LICENSED TO Callout Box
  if (pages.length > 0 && !opts.insertNewCoverPage) {
    const page1 = pages[0];
    const { width: p1W, height: p1H } = page1.getSize();

    // Box inner bounds on template (y = 265 to 345 pt from bottom on A4)
    const boxX = 45;
    const boxW = Math.min(505, p1W - 90);
    const boxY = p1H > 800 ? 265 : p1H * 0.32;
    const boxH = 76;

    // Fill rectangle over the placeholder text inside the Red Box on Page 1
    // Color matches the light red fill (#FDF2F2) of the TieEdu template box
    page1.drawRectangle({
      x: boxX,
      y: boxY,
      width: boxW,
      height: boxH,
      color: rgb(0.99, 0.95, 0.95),
    });

    // Write REAL student details inside the Red Box on Page 1
    page1.drawText('LICENSED TO', {
      x: boxX + 15,
      y: boxY + boxH - 18,
      size: 10.5,
      font: fontBold,
      color: rgb(0.86, 0.15, 0.15),
    });

    page1.drawText(`Name: ${studentName}`, {
      x: boxX + 15,
      y: boxY + boxH - 40,
      size: 9.5,
      font: fontBold,
      color: rgb(0.15, 0.15, 0.15),
    });

    const rollEmailText = `Roll No / Email: ${rollNo} / ${studentEmail}`;
    page1.drawText(rollEmailText.length > 45 ? rollEmailText.slice(0, 45) + '...' : rollEmailText, {
      x: boxX + 210,
      y: boxY + boxH - 40,
      size: 9,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    page1.drawText(`Licence ID: ${licenseId}`, {
      x: boxX + 15,
      y: boxY + boxH - 60,
      size: 9.5,
      font: fontBold,
      color: rgb(0.15, 0.15, 0.15),
    });

    page1.drawText(`Issued on: ${issuedDate}`, {
      x: boxX + 210,
      y: boxY + boxH - 60,
      size: 9,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  // 3. Stamp Running Red License Footer & Diagonal Background Watermarks on EVERY page
  const watermarkText = 'TiEdu  |  tieedu.in  |  Licensed copy  |  Do not share';

  for (let i = 0; i < totalPages; i++) {
    const page = pages[i];
    const { width: pW, height: pH } = page.getSize();

    // Erase template's placeholder red line at y = 33..50 on content pages
    if (i > 0 || !opts.insertNewCoverPage) {
      page.drawRectangle({
        x: 30,
        y: 34,
        width: pW - 60,
        height: 16,
        color: rgb(1, 1, 1), // Erases template's placeholder [Student Name] red line
      });
    }

    // Draw real red running license text at y = 38
    const licenseLine = `Licensed to: ${studentName}  |  [${rollNo} / ${studentEmail}]  |  Licence ID: ${licenseId} - Not for redistribution`;
    page.drawText(licenseLine.length > 90 ? licenseLine.slice(0, 90) + '...' : licenseLine, {
      x: Math.max(15, (pW - licenseLine.length * 4.1) / 2),
      y: 38,
      size: 7.5,
      font: fontBold,
      color: rgb(0.86, 0.15, 0.15), // Red
    });

    // Repeating Diagonal Watermarks Grid on Every Page if not already watermarked
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        page.drawText(watermarkText, {
          x: col * (pW / 2) + 20,
          y: row * (pH / 3) + 120,
          size: 10,
          font: fontBold,
          color: rgb(0.55, 0.55, 0.55),
          opacity: 0.12,
          rotate: degrees(-28),
        });
      }
    }
  }

  const outputBytes = await pdfDoc.save();
  return Buffer.from(outputBytes);
}
