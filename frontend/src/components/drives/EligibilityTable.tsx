import React from 'react';
import { Check, X } from 'lucide-react';

/** Human labels for the server's eligibility criteria keys. */
const CRITERIA: { key: string; label: string; format: (v: any) => string }[] = [
  { key: 'min_cgpa', label: 'Minimum CGPA', format: (v) => `≥ ${v}` },
  { key: 'max_cgpa', label: 'Maximum CGPA', format: (v) => `≤ ${v}` },
  { key: 'max_backlogs', label: 'Max backlogs', format: (v) => `≤ ${v}` },
  { key: 'branches', label: 'Eligible branches', format: (v) => (Array.isArray(v) ? v.join(', ') : String(v)) },
  { key: 'batches', label: 'Eligible batches', format: (v) => (Array.isArray(v) ? v.join(', ') : String(v)) },
];

/** Maps the server's eligibility_blockers codes onto per-criterion failure. */
const BLOCKER_FOR: Record<string, string> = {
  cgpa_below_minimum: 'min_cgpa',
  cgpa_above_maximum: 'max_cgpa',
  too_many_backlogs: 'max_backlogs',
  branch_not_eligible: 'branches',
  batch_not_eligible: 'batches',
};

export const EligibilityTable: React.FC<{
  eligibility: Record<string, any>;
  blockers: string[];
  profileMissing: boolean;
}> = ({ eligibility, blockers, profileMissing }) => {
  const rows = CRITERIA.filter((c) => eligibility?.[c.key] != null);

  if (profileMissing) {
    return (
      <div className="rounded-[12px] border p-4 text-[13px]" style={{ borderColor: 'var(--apple-separator)', background: 'var(--apple-surface-2)', color: 'var(--apple-label-2)' }}>
        Add your student profile to see how you match this drive&apos;s eligibility.
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-[12px] border p-4 text-[13px]" style={{ borderColor: 'var(--apple-separator)', background: 'var(--apple-surface-2)', color: 'var(--apple-label-2)' }}>
        This drive has no specific eligibility criteria.
      </div>
    );
  }

  const failedKeys = new Set(blockers.map((b) => BLOCKER_FOR[b]).filter(Boolean));

  return (
    <div className="overflow-hidden rounded-[12px] border" style={{ borderColor: 'var(--apple-separator)', background: 'var(--apple-surface)' }}>
      <table className="w-full text-[13px]">
        <tbody>
          {rows.map((c, i) => {
            const failed = failedKeys.has(c.key);
            return (
              <tr key={c.key} style={{ borderTop: i === 0 ? 'none' : '0.5px solid var(--apple-separator)' }}>
                <td className="px-4 py-2.5" style={{ color: 'var(--apple-label-2)' }}>{c.label}</td>
                <td className="px-4 py-2.5 text-right font-medium" style={{ color: 'var(--apple-label)' }}>
                  {c.format(eligibility[c.key])}
                </td>
                <td className="w-10 px-3 py-2.5">
                  <span
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full"
                    style={{
                      background: failed ? 'var(--apple-red-soft)' : 'var(--apple-green-soft)',
                      color: failed ? 'var(--apple-red)' : 'var(--apple-green)',
                    }}
                    aria-label={failed ? 'Not met' : 'Met'}
                  >
                    {failed ? <X size={12} strokeWidth={3} /> : <Check size={12} strokeWidth={3} />}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default EligibilityTable;
