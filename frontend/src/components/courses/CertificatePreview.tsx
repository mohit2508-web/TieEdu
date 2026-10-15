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

  return (
    <div className={className}>
      <svg
        viewBox="0 0 320 200"
        role="img"
        aria-label={`Sample ${style.label} certificate for ${courseTitle}`}
        className="block w-full"
      >
        <rect width="320" height="200" rx="8" fill="#FFFFFF" stroke={style.accent} strokeWidth="2" />
        <rect x="8" y="8" width="304" height="184" rx="5" fill="none" stroke={style.soft} strokeWidth="1" />

        {/* TieEdu mark */}
        <circle cx="36" cy="36" r="10" fill={style.soft} />
        <text x="36" y="40" textAnchor="middle" fontSize="10" fontWeight="800" fill={style.accent}>
          T
        </text>
        <text x="54" y="40" fontSize="11" fontWeight="800" fill="#111827">
          TieEdu
        </text>

        <text x="160" y="82" textAnchor="middle" fontSize="13" fontWeight="700" fill="#111827">
          Certificate of Completion
        </text>

        <text x="160" y="108" textAnchor="middle" fontSize="10" fill="#6B7280">
          awarded to
        </text>
        <line x1="90" y1="126" x2="230" y2="126" stroke={style.accent} strokeWidth="1" strokeDasharray="3 3" />
        <text x="160" y="122" textAnchor="middle" fontSize="9" fill="#9CA3AF">
          your name
        </text>

        <text x="160" y="146" textAnchor="middle" fontSize="9" fontWeight="600" fill="#374151">
          {courseTitle.length > 44 ? courseTitle.slice(0, 43) + '…' : courseTitle}
        </text>

        {/* Tier chip — the one piece of this mock that is real: the course's own tier. */}
        <rect x="118" y="158" width="84" height="18" rx="9" fill={style.soft} />
        <text x="160" y="170" textAnchor="middle" fontSize="9" fontWeight="700" fill={style.accent}>
          {style.label} Tier
        </text>
      </svg>
      <p className="mt-2 text-[11px] leading-snug text-[var(--text-light)]">
        Preview of the certificate this course issues. Yours will carry your name, score and a
        verifiable serial — signed, not editable.
      </p>
    </div>
  );
};
