import React from 'react';

/**
 * A decorative SVG mock of the certificate this course issues.
 *
 * Why a mock and not a real one
 * -----------------------------
 * The real certificate is a signed PDF keyed to one learner, with that
 * learner's name, serial, score and a verification URL — see
 * `lib/certificate.ts`. None of that exists before enrolment, so anything
 * this component drew with real data would be a forgery-in-waiting.
 *
 * What it is instead: the *shape* of the award. Tier name (taken from the
 * course's own `certificate_tier`, defaulted the same way the issuer does),
 * the course title, and a placeholder line where the learner's name goes.
 * It answers "what do I get?" honestly — the layout and the tier — without
 * inventing a serial or a score that has not been earned. The label makes
 * that explicit so nobody screenshots this and mistakes it for the artefact.
 *
 * Purely presentational and static: no state, no fetch, and it renders on
 * the server, so the panel is in the first paint rather than arriving after
 * hydration.
 */

const TIER_STYLES: Record<string, { label: string; accent: string; soft: string }> = {
  foundation: { label: 'Foundation', accent: '#2D8CF0', soft: '#E8F2FD' },
  professional: { label: 'Professional', accent: '#6D4CDB', soft: '#F0EBFB' },
  premium: { label: 'Premium', accent: '#C9922A', soft: '#FBF4E4' },
};

/**
 * Tier palette, exported so the /my-courses chips and this preview cannot
 * drift apart — one map, one set of colours, one set of labels.
 */
export const tierStyle = (tier?: string | null) =>
  TIER_STYLES[tier || 'foundation'] || TIER_STYLES.foundation;

export const CertificatePreview: React.FC<{
  tier?: string | null;
  courseTitle: string;
  className?: string;
}> = ({ tier, courseTitle, className = '' }) => {
  const style = TIER_STYLES[tier || 'foundation'] || TIER_STYLES.foundation;

  /*
   * Drawn from the issuer's own layout (backend/src/lib/certificate.ts,
   * `buildCertificatePdf`) at 0.38 scale: A4 landscape, cream paper, navy frame
   * with an amber hairline and corner ticks, a navy header band, serif title,
   * the name on an amber rule, then the course title. The tier is part of the
   * signed record but is not printed on the PDF, so it is stated in the caption
   * rather than drawn — the preview shows only what the real page shows.
   */
  const NAVY = '#0E2A44';
  const AMBER = '#E8A33D';
  const SERIF = 'Georgia, "Times New Roman", serif';
  const title = courseTitle.length > 46 ? courseTitle.slice(0, 45) + '…' : courseTitle;
  const ticks: Array<[number, number, number, number]> = [
    [8, 8, 1, 1], [312, 8, -1, 1], [8, 218, 1, -1], [312, 218, -1, -1],
  ];

  return (
    <div className={className}>
      <svg viewBox="0 0 320 226" role="img" aria-label={`Sample certificate for ${courseTitle}`} className="block w-full rounded-md shadow-soft">
        <rect width="320" height="226" fill="#FCFBF8" />
        <rect x="8" y="8" width="304" height="210" fill="none" stroke={NAVY} strokeWidth="1" />
        <rect x="12" y="12" width="296" height="202" fill="none" stroke={AMBER} strokeWidth="0.4" />
        {ticks.map(([x, y, sx, sy]) => (
          <g key={`${x}-${y}`} fill={AMBER}>
            <rect x={sx > 0 ? x : x - 8} y={sy > 0 ? y : y - 1.2} width="8" height="1.2" />
            <rect x={sx > 0 ? x : x - 1.2} y={sy > 0 ? y : y - 8} width="1.2" height="8" />
          </g>
        ))}

        <rect x="8" y="8" width="304" height="20" fill={NAVY} />
        <text x="16" y="22" fontFamily={SERIF} fontSize="9.5" fontWeight="700" fill="#FFFFFF">TieEdu</text>
        <text x="304" y="21" textAnchor="end" fontSize="4.2" fontWeight="700" letterSpacing="0.3" fill="#DEEAF5">
          CERTIFICATE OF COURSE COMPLETION
        </text>

        <text x="160" y="64" textAnchor="middle" fontFamily={SERIF} fontSize="15" fontWeight="700" fill="#10151C">
          Certificate of Completion
        </text>
        <text x="160" y="77" textAnchor="middle" fontSize="5" fill="#7A858F">This certifies that</text>

        <text x="160" y="96" textAnchor="middle" fontFamily={SERIF} fontSize="12" fontStyle="italic" fill="#9AA3AD">
          Your name
        </text>
        <line x1="100" y1="102" x2="220" y2="102" stroke={AMBER} strokeWidth="0.5" />

        <text x="160" y="113" textAnchor="middle" fontSize="4.6" fill="#7A858F">has successfully completed all lessons of</text>
        <text x="160" y="127" textAnchor="middle" fontFamily={SERIF} fontSize="8" fontWeight="700" fill="#10151C">
          {title}
        </text>

        {(['Lessons completed', 'XP earned', 'Date of issue'] as const).map((label, i) => (
          <g key={label}>
            <rect x={96 + i * 46} y="141" width="36" height="4" rx="1" fill="#E7E4DC" />
            <text x={114 + i * 46} y="153" textAnchor="middle" fontSize="3.6" fill="#7A858F">{label}</text>
          </g>
        ))}

        <line x1="24" y1="176" x2="296" y2="176" stroke="#DAD9D0" strokeWidth="0.4" />
        <text x="24" y="188" fontSize="3.6" fontWeight="700" fill="#7A858F" letterSpacing="0.3">ISSUED BY</text>
        <text x="24" y="196" fontSize="4.6" fontWeight="700" fill="#10151C">TieEdu Placement Intelligence</text>
        <text x="240" y="196" textAnchor="end" fontSize="3.8" fill="#7A858F">Serial · Ed25519 signature</text>
        <rect x="270" y="182" width="22" height="22" fill="none" stroke="#10151C" strokeWidth="0.6" />
        <rect x="274" y="186" width="5" height="5" fill="#10151C" />
        <rect x="283" y="186" width="5" height="5" fill="#10151C" />
        <rect x="274" y="195" width="5" height="5" fill="#10151C" />
      </svg>
      <p className="mt-2 text-xs leading-snug text-muted">
        A sample of the certificate this course issues ({style.label.toLowerCase()} tier). Yours carries your name,
        lessons completed, XP, the date, and a serial with a QR code anyone can verify.
      </p>
    </div>
  );
};
