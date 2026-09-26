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

    // Top Dark Navy Header Banner (#1B365D => rgb(0.106, 0.212, 0.365))
    coverPage.drawRectangle({
      x: 0,
      y: cH - 120,
      width: cW,
      height: 120,
      color: rgb(0.106, 0.212, 0.365),
    });

    // Logo Square Icon (#E8A33D => rgb(0.91, 0.64, 0.24))
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

    // Body: Section Category Tag
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

    // Red Box
    const boxY = cH - 485;
    const boxW = cW - 80;
    const boxH = 95;

    coverPage.drawRectangle({
      x: 40,
      y: boxY,
      width: boxW,
      height: boxH,
      color: rgb(0.99, 0.95, 0.95),
      borderColor: rgb(0.86, 0.15, 0.15),
      borderWidth: 1.5,
    });

    coverPage.drawText('LICENSED TO', {
      x: 55,
      y: boxY + boxH - 22,
      size: 11,
      font: fontBold,
      color: rgb(0.86, 0.15, 0.15),
    });

    coverPage.drawText(`Name: ${studentName}`, {
      x: 55,
      y: boxY + boxH - 45,
      size: 10,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });
    coverPage.drawText(`Roll No / Email: ${rollNo} (${studentEmail})`, {
      x: 240,
      y: boxY + boxH - 45,
      size: 10,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });

    coverPage.drawText(`Licence ID: ${licenseId}`, {
      x: 55,
      y: boxY + boxH - 68,
      size: 10,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });
    coverPage.drawText(`Issued on: ${issuedDate}`, {
      x: 240,
      y: boxY + boxH - 68,
      size: 10,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });

    coverPage.drawText(
      'This material is licensed for the personal use of the student named above. Copying, forwarding, uploading or reselling any part of it is prohibited and traceable to this licence.',
      {
        x: 40,
        y: boxY - 24,
        size: 7.5,
        font: fontOblique,
        color: rgb(0.45, 0.45, 0.45),
        maxWidth: boxW,
      }
    );

    coverPage.drawText(`(c) ${new Date().getFullYear()} TieEdu Technologies. All rights reserved.  |  tieedu.in`, {
      x: 40,
      y: 35,
      size: 8,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  // 2. Process ALL pages (Pages 0 to Total Pages)
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  // On Page 0 (Page 1 of uploaded document), stamp the real student details into the LICENSED TO Callout Box
  if (pages.length > 0 && !opts.insertNewCoverPage) {
    const page1 = pages[0];
    const { width: p1W, height: p1H } = page1.getSize();

    // Fill rectangle over the placeholder text inside the Red Box on Page 1
    // Matches the light red fill (#FDF2F2) & red border (#DC2626) of the TieEdu template
    const boxW = Math.min(515, p1W - 80);
    const boxX = (p1W - boxW) / 2;
    const boxY = p1H > 800 ? 210 : p1H * 0.25;
    const boxH = 75;

    page1.drawRectangle({
      x: boxX + 2,
      y: boxY + 2,
      width: boxW - 4,
      height: boxH - 4,
      color: rgb(0.99, 0.95, 0.95), // Clean light-red fill erases [Student Name] placeholders
    });

    // Write REAL student details inside the Red Box on Page 1
    page1.drawText('LICENSED TO', {
      x: boxX + 15,
      y: boxY + boxH - 20,
      size: 10.5,
      font: fontBold,
      color: rgb(0.86, 0.15, 0.15),
    });

    page1.drawText(`Name: ${studentName}`, {
      x: boxX + 15,
      y: boxY + boxH - 42,
      size: 9.5,
      font: fontBold,
      color: rgb(0.15, 0.15, 0.15),
    });

    const rollEmailText = `Roll No / Email: ${rollNo} / ${studentEmail}`;
    page1.drawText(rollEmailText.length > 45 ? rollEmailText.slice(0, 45) + '...' : rollEmailText, {
      x: boxX + 200,
      y: boxY + boxH - 42,
      size: 9,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    page1.drawText(`Licence ID: ${licenseId}`, {
      x: boxX + 15,
      y: boxY + boxH - 62,
      size: 9.5,
      font: fontBold,
      color: rgb(0.15, 0.15, 0.15),
    });

    page1.drawText(`Issued on: ${issuedDate}`, {
      x: boxX + 200,
      y: boxY + boxH - 62,
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

    // Bottom Red License Running Line
    const licenseLine = `Licensed to: ${studentName}  |  [${rollNo} / ${studentEmail}]  |  Licence ID: ${licenseId} - Not for redistribution`;
    page.drawText(licenseLine.length > 90 ? licenseLine.slice(0, 90) + '...' : licenseLine, {
      x: Math.max(15, (pW - licenseLine.length * 4) / 2),
      y: 24,
      size: 7.5,
      font: fontBold,
      color: rgb(0.86, 0.15, 0.15), // Red
    });

    // Bottom Footer Row
    page.drawText(`(c) ${new Date().getFullYear()} TieEdu Technologies`, {
      x: 25,
      y: 10,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });
    page.drawText('tieedu.in', {
      x: pW / 2 - 15,
      y: 10,
      size: 7.5,
      font: fontBold,
      color: rgb(0.4, 0.4, 0.4),
    });
    page.drawText(`Page ${i + 1} of ${totalPages}`, {
      x: pW - 65,
      y: 10,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Repeating Diagonal Watermarks Grid on Every Page
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        page.drawText(watermarkText, {
          x: col * (pW / 2) + 20,
          y: row * (pH / 3) + 120,
          size: 10,
          font: fontBold,
          color: rgb(0.55, 0.55, 0.55),
          opacity: 0.13,
          rotate: degrees(-28),
        });
      }
    }
  }

  const outputBytes = await pdfDoc.save();
  return Buffer.from(outputBytes);
}
