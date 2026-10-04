import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import QRCode from 'qrcode';
import type { SkillCertificate } from '../data/skillTestTypes';

/**
 * pdf-lib's standard fonts are WinAnsi-encoded, so anything outside Latin-1
 * (curly quotes, em dashes, rupee signs) throws. Same normalisation the
 * course-certificate renderer uses.
 */
function ascii(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2022\u25CF\u25AA]/g, '|')
    .replace(/[\u20B9]/g, 'INR ')
    .replace(/[\u00A0]/g, ' ')
    .replace(/[^\x20-\x7E]/g, '');
}

function wrap(text: string, font: any, size: number, maxWidth: number): string[] {
  const words = ascii(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      if (font.widthOfTextAtSize(word, size) > maxWidth) {
        let chunk = '';
        for (const ch of word) {
          if (font.widthOfTextAtSize(chunk + ch, size) > maxWidth) {
            lines.push(chunk);
            chunk = ch;
          } else {
            chunk += ch;
          }
        }
        line = chunk;
      } else {
        line = word;
      }
    }
  }
  if (line) lines.push(line);
  return lines;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function verifyUrlFor(cert: SkillCertificate): string {
  if (cert.verificationUrl) return cert.verificationUrl;
  const site = (process.env.SITE_URL || 'https://tieedu.in').replace(/\/$/, '');
  return `${site}/skill-test/certificates/${cert.certificateId}`;
}

/**
 * Build the skill-test certificate PDF. Everything drawn here comes from the
 * stored record — no request input reaches the document text.
 */
export async function buildSkillCertPdf(cert: SkillCertificate): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([841.89, 595.28]); // A4 landscape
  const { width: W, height: H } = page.getSize();

  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const NAVY = rgb(0.055, 0.165, 0.267);
  const SKY = rgb(0.059, 0.482, 1); // #0F7BFF — the TieEdu skill-test blue
  const AMBER = rgb(0.910, 0.639, 0.239);
  const INK = rgb(0.063, 0.082, 0.110);
  const BODY = rgb(0.243, 0.278, 0.329);
  const MUTED = rgb(0.478, 0.522, 0.560);
  const HAIRLINE = rgb(0.855, 0.851, 0.816);

  // --- Paper + frame -----------------------------------------------------
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(0.988, 0.984, 0.973) });
  page.drawRectangle({
    x: 22, y: 22, width: W - 44, height: H - 44,
    borderColor: NAVY, borderWidth: 2.2,
  });
  page.drawRectangle({
    x: 31, y: 31, width: W - 62, height: H - 62,
    borderColor: AMBER, borderWidth: 0.7,
  });

  const tick = 22;
  for (const [cx, cy, sx, sy] of [
    [22, H - 22, 1, -1], [W - 22, H - 22, -1, -1],
    [22, 22, 1, 1], [W - 22, 22, -1, 1],
  ] as const) {
    page.drawRectangle({ x: cx - (sx < 0 ? tick : 0), y: cy - (sy < 0 ? tick : 0), width: tick, height: 3, color: AMBER });
    page.drawRectangle({ x: cx - (sx < 0 ? 3 : 0), y: cy - (sy < 0 ? tick : 0), width: 3, height: tick, color: AMBER });
  }

  // --- Brand header ------------------------------------------------------
  page.drawRectangle({ x: 22, y: H - 96, width: W - 44, height: 52, color: NAVY });
  page.drawText('TieEdu', { x: 44, y: H - 68, size: 25, font: serifBold, color: rgb(1, 1, 1) });
  page.drawText('Learn   Evolve   Develop', { x: 140, y: H - 66, size: 9.5, font: sans, color: AMBER });
  const headerRight = 'CERTIFICATE OF SKILL PROFICIENCY';
  page.drawText(headerRight, {
    x: W - 44 - sansBold.widthOfTextAtSize(headerRight, 11),
    y: H - 66, size: 11, font: sansBold, color: rgb(0.87, 0.92, 0.96),
  });

  // --- Title + recipient -------------------------------------------------
  const title = 'Certificate of Skill Proficiency';
  page.drawText(title, {
    x: (W - serifBold.widthOfTextAtSize(title, 38)) / 2,
    y: H - 166, size: 38, font: serifBold, color: INK,
  });

  const subtitle = 'This certifies that';
  page.drawText(subtitle, {
    x: (W - sans.widthOfTextAtSize(subtitle, 13)) / 2,
    y: H - 200, size: 13, font: sans, color: MUTED,
  });

  const recipient = ascii(cert.studentName) || 'TieEdu Learner';
  const recipientSize = recipient.length > 34 ? 30 : 36;
  page.drawText(recipient, {
    x: (W - serifBold.widthOfTextAtSize(recipient, recipientSize)) / 2,
    y: H - 248, size: recipientSize, font: serifBold, color: SKY,
  });

  const ruleY = H - 264;
  const ruleW = Math.min(430, serifBold.widthOfTextAtSize(recipient, recipientSize) + 60);
  page.drawLine({
    start: { x: (W - ruleW) / 2, y: ruleY },
    end: { x: (W + ruleW) / 2, y: ruleY },
    thickness: 1.1, color: AMBER,
  });

  const hasDemonstrated = 'has successfully demonstrated proficiency in';
  page.drawText(hasDemonstrated, {
    x: (W - sans.widthOfTextAtSize(hasDemonstrated, 12)) / 2,
    y: H - 294, size: 12, font: sans, color: MUTED,
  });

  const skillName = ascii(cert.skillName) || 'Skill';
  const skillSize = skillName.length > 40 ? 20 : 24;
  page.drawText(skillName, {
    x: (W - serifBold.widthOfTextAtSize(skillName, skillSize)) / 2,
    y: H - 328, size: skillSize, font: serifBold, color: INK,
  });

  const levelLine = `${ascii(cert.skillLevelText) || 'Pass'} Level`;
  page.drawText(levelLine, {
    x: (W - sansBold.widthOfTextAtSize(levelLine, 13)) / 2,
    y: H - 352, size: 13, font: sansBold, color: SKY,
  });

  // --- Stats row: score / level / issue date ------------------------------
  const statsY = H - 392;
  const stats: [string, string][] = [
    ['Score', `${cert.score}/100`],
    ['Grade', levelLine],
    ['Date of issue', formatDate(cert.issueDate)],
  ];
  const colW = 178;
  const tableW = colW * stats.length;
  stats.forEach(([label, value], i) => {
    const cx = (W - tableW) / 2 + i * colW + colW / 2;
    page.drawText(ascii(value), {
      x: cx - sansBold.widthOfTextAtSize(ascii(value), 15) / 2,
      y: statsY, size: 15, font: sansBold, color: SKY,
    });
    page.drawText(ascii(label), {
      x: cx - sans.widthOfTextAtSize(ascii(label), 8.5) / 2,
      y: statsY - 15, size: 8.5, font: sans, color: MUTED,
    });
  });

  page.drawLine({
    start: { x: (W - tableW) / 2 - 14, y: statsY - 30 },
    end: { x: (W + tableW) / 2 + 14, y: statsY - 30 },
    thickness: 0.6, color: HAIRLINE,
  });

  // --- Footer: issuer, certificate ID, QR --------------------------------
  const footerY = 62;

  page.drawText('ISSUED BY', { x: 60, y: footerY + 44, size: 8, font: sansBold, color: MUTED });
  page.drawText('TieEdu Skill Assessments', { x: 60, y: footerY + 27, size: 12.5, font: serifBold, color: INK });
  page.drawLine({
    start: { x: 60, y: footerY + 20 }, end: { x: 250, y: footerY + 20 },
    thickness: 0.8, color: INK,
  });
  page.drawText('Verified online — scan the QR to confirm', {
    x: 60, y: footerY + 8, size: 8.5, font: sans, color: MUTED,
  });

  page.drawText(ascii(`Certificate ID: ${cert.certificateId}`), {
    x: 300, y: footerY + 44, size: 10, font: sansBold, color: INK,
  });
  page.drawText(ascii(`No. ${cert.certificateNumber}`), {
    x: 300, y: footerY + 30, size: 8.5, font: sans, color: BODY,
  });
  page.drawText(ascii(`Assessment: ${cert.skillName}`), {
    x: 300, y: footerY + 17, size: 8.5, font: sans, color: MUTED,
  });
  page.drawText(ascii(`Issued: ${formatDate(cert.issueDate)}`), {
    x: 300, y: footerY + 4, size: 8.5, font: sans, color: MUTED,
  });

  // QR (right)
  const qrUrl = verifyUrlFor(cert);
  const qrSize = 86;
  const qrX = W - 60 - qrSize;
  const qrY = footerY - 4;
  try {
    const png = await QRCode.toBuffer(qrUrl, {
      type: 'png',
      margin: 0,
      width: 320,
      errorCorrectionLevel: 'M',
      color: { dark: '#10151C', light: '#FCFBF8' },
    });
    const qrImage = await pdf.embedPng(png);
    page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
  } catch {
    // A missing QR must never block a real certificate download.
    page.drawRectangle({
      x: qrX, y: qrY, width: qrSize, height: qrSize,
      borderColor: HAIRLINE, borderWidth: 1, color: rgb(1, 1, 1),
    });
    page.drawText('QR', { x: qrX + 34, y: qrY + 40, size: 14, font: sansBold, color: MUTED });
  }

  page.drawText('SCAN TO VERIFY', {
    x: qrX + (qrSize - sansBold.widthOfTextAtSize('SCAN TO VERIFY', 7.5)) / 2,
    y: qrY - 12, size: 7.5, font: sansBold, color: SKY,
  });

  const urlText = ascii(qrUrl);
  const urlSize = 7.5;
  const maxUrlW = qrX - 320;
  let shownUrl = urlText;
  while (shownUrl.length > 10 && sans.widthOfTextAtSize(shownUrl, urlSize) > maxUrlW) {
    shownUrl = shownUrl.slice(0, -6) + '...';
  }
  page.drawText(shownUrl, {
    x: qrX - sans.widthOfTextAtSize(shownUrl, urlSize) - 14,
    y: qrY + 8, size: urlSize, font: sans, color: MUTED,
  });

  // --- Watermark when revoked -------------------------------------------
  if (cert.status === 'revoked') {
    page.drawText('REVOKED', {
      x: (W - sansBold.widthOfTextAtSize('REVOKED', 64)) / 2,
      y: H / 2 - 22, size: 64, font: sansBold, color: rgb(0.757, 0.267, 0.176),
      opacity: 0.16, rotate: degrees(28),
    });
  }

  // --- PDF metadata ------------------------------------------------------
  pdf.setTitle(`TieEdu Skill Certificate ${cert.certificateId}`);
  pdf.setSubject(`Skill proficiency: ${ascii(cert.skillName)} (${ascii(cert.skillLevelText)})`);
  pdf.setAuthor('TieEdu');
  pdf.setProducer('TieEdu Skill Certificate Service');
  pdf.setKeywords([cert.certificateId, cert.skillSlug, 'tieedu', 'skill certificate']);
  pdf.setCreationDate(new Date(cert.issueDate));

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
