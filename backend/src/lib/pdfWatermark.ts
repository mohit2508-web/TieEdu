import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

export interface PdfWatermarkOptions {
  studentName: string;
  studentEmail: string;
  rollNo: string;
  licenseId: string;
  companyName: string;
  moduleTitle: string;
  issuedDate?: string;
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

  // 1. Create Cover Page (Page 0)
  const coverPage = pdfDoc.insertPage(0, [595.28, 841.89]); // Standard A4
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
  coverPage.drawText('Learn   Evolve   Develop', {
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
    color: rgb(0.85, 0.45, 0.1), // Orange Accent
  });

  // Title: [Company Name] – [Module Title]
  const titleText = `${opts.companyName} – ${opts.moduleTitle}`;
  coverPage.drawText(titleText.length > 45 ? titleText.slice(0, 45) + '...' : titleText, {
    x: 40,
    y: cH - 195,
    size: 20,
    font: fontBold,
    color: rgb(0.106, 0.212, 0.365),
  });

  // Subtitle bullet points
  coverPage.drawText('Technical MCQs  •  Output Prediction  •  DSA Coding  •  Debugging  •  Solutions', {
    x: 40,
    y: cH - 220,
    size: 10,
    font: fontRegular,
    color: rgb(0.4, 0.45, 0.5),
  });

  // Orange Accent Divider Line
  coverPage.drawLine({
    start: { x: 40, y: cH - 240 },
    end: { x: 260, y: cH - 240 },
    thickness: 3,
    color: rgb(0.91, 0.64, 0.24),
  });

  // Metadata Key-Value List
  const metaY = cH - 275;
  const metaItems = [
    { label: 'Module code', val: `[TE-${opts.companyName.toUpperCase().slice(0, 3)}-01]` },
    { label: 'Target batch', val: '[B.Tech CSE / IT, Placement Batch 2026]' },
    { label: 'Difficulty', val: '[Medium to Advanced]' },
    { label: 'Total pages', val: `[${pdfDoc.getPageCount() - 1} Content Pages]` },
    { label: 'Version / Date', val: `[v1.0 | ${issuedDate}]` },
  ];

  metaItems.forEach((item, idx) => {
    const y = metaY - idx * 22;
    coverPage.drawText(item.label, {
      x: 40,
      y,
      size: 10,
      font: fontBold,
      color: rgb(0.2, 0.25, 0.35),
    });
    coverPage.drawText(item.val, {
      x: 160,
      y,
      size: 10,
      font: fontOblique,
      color: rgb(0.45, 0.5, 0.55),
    });
  });

  // Red LICENSED TO Callout Box
  const boxY = cH - 485;
  const boxW = cW - 80;
  const boxH = 95;

  // Box Background
  coverPage.drawRectangle({
    x: 40,
    y: boxY,
    width: boxW,
    height: boxH,
    color: rgb(0.99, 0.95, 0.95), // Light red fill
    borderColor: rgb(0.86, 0.15, 0.15), // Dark Red Border
    borderWidth: 1.5,
  });

  // Box Title
  coverPage.drawText('LICENSED TO', {
    x: 55,
    y: boxY + boxH - 22,
    size: 11,
    font: fontBold,
    color: rgb(0.86, 0.15, 0.15),
  });

  // Box Line 1: Name & Roll/Email
  coverPage.drawText(`Name: ${opts.studentName}`, {
    x: 55,
    y: boxY + boxH - 45,
    size: 10,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2),
  });
  coverPage.drawText(`Roll No / Email: ${opts.rollNo} (${opts.studentEmail})`, {
    x: 240,
    y: boxY + boxH - 45,
    size: 10,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Box Line 2: Licence ID & Issued Date
  coverPage.drawText(`Licence ID: ${opts.licenseId}`, {
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

  // Legal Notice below box
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

  // Cover Page Bottom Footer
  coverPage.drawText(`© ${new Date().getFullYear()} TieEdu Technologies. All rights reserved.  |  tieedu.in`, {
    x: 40,
    y: 35,
    size: 8,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  });

  // 2. Process Every Content Page (Pages 1 to Total)
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  const watermarkText = 'TiEdu  •  tieedu.in  •  Licensed copy  •  Do not share';

  for (let i = 1; i < totalPages; i++) {
    const page = pages[i];
    const { width: pW, height: pH } = page.getSize();

    // Top Running Header Bar
    page.drawText('TiEdu', {
      x: 25,
      y: pH - 20,
      size: 9,
      font: fontBold,
      color: rgb(0.91, 0.64, 0.24), // Orange
    });
    const headerMeta = `[${opts.companyName}] – [${opts.moduleTitle}]  |  Confidential study material`;
    page.drawText(headerMeta.length > 55 ? headerMeta.slice(0, 55) + '...' : headerMeta, {
      x: Math.max(120, pW - 320),
      y: pH - 20,
      size: 8,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });
    // Header Divider Line
    page.drawLine({
      start: { x: 25, y: pH - 26 },
      end: { x: pW - 25, y: pH - 26 },
      thickness: 0.6,
      color: rgb(0.85, 0.85, 0.85),
    });

    // Bottom Red License Running Line
    const licenseLine = `Licensed to: ${opts.studentName}  |  [${opts.rollNo} / ${opts.studentEmail}]  |  Licence ID: ${opts.licenseId} — Not for redistribution`;
    page.drawText(licenseLine.length > 85 ? licenseLine.slice(0, 85) + '...' : licenseLine, {
      x: Math.max(25, (pW - licenseLine.length * 4) / 2),
      y: 26,
      size: 7.5,
      font: fontBold,
      color: rgb(0.86, 0.15, 0.15), // Red
    });

    // Bottom Footer Row
    page.drawText(`© ${new Date().getFullYear()} TieEdu Technologies`, {
      x: 25,
      y: 12,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });
    page.drawText('tieedu.in', {
      x: pW / 2 - 15,
      y: 12,
      size: 7.5,
      font: fontBold,
      color: rgb(0.4, 0.4, 0.4),
    });
    page.drawText(`Page ${i} of ${totalPages - 1}`, {
      x: pW - 65,
      y: 12,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Repeating Diagonal Watermarks Grid on Content Pages
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
