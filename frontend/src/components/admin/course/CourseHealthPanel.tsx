import React from 'react';
import { CheckCircle2, CircleAlert, TriangleAlert } from 'lucide-react';
import type { CourseHealth, CourseHealthCheck } from '@/types';
import { Btn, Panel } from './CourseAdminUi';

/**
 * The publish checklist, rendered from the server's `courseHealth` payload.
 *
 * The list is the single source of truth the PUT publish gate enforces, so the
 * panel and the 400 an admin gets when they try to publish too early can never
 * disagree. `blocker` rows keep the course a draft; `warn` rows are honest
 * signals (no cover, no assessment) that degrade the page but do not hold a
 * course hostage.
 */
const CheckRow: React.FC<{ check: CourseHealthCheck }> = ({ check }) => {
  const Icon = check.pass ? CheckCircle2 : check.severity === 'blocker' ? CircleAlert : TriangleAlert;
  const tone = check.pass
    ? 'text-[var(--color-success)]'
    : check.severity === 'blocker'
      ? 'text-[var(--color-error)]'
      : 'text-amber-600';
  return (
    <li className="flex items-start gap-2.5 py-1.5">
      <Icon size={16} className={`mt-0.5 shrink-0 ${tone}`} aria-hidden="true" />
      <span className={`text-sm ${check.pass ? 'text-[var(--text-body)]' : 'font-semibold text-[var(--ink)]'}`}>
        {check.label}
        {!check.pass && check.severity === 'blocker' && (
          <span className="ml-2 text-xs font-bold uppercase tracking-wide text-[var(--color-error)]">
            blocks publish
          </span>
        )}
      </span>
    </li>
  );
};

export const CourseHealthPanel: React.FC<{
  health: CourseHealth | null | undefined;
  published: boolean;
  busy?: boolean;
  /** Attempts the publish transition. Parent owns the request and error. */
  onPublish: () => void;
}> = ({ health, published, busy, onPublish }) => {
  if (!health) return null;
  const failed = health.checks.filter((c) => !c.pass);
  const blockers = failed.filter((c) => c.severity === 'blocker');

  return (
    <Panel
      title="Course health"
      subtitle="What a learner sees before they enrol. Blockers keep the course a draft."
      actions={
        published ? (
          <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-success)]">
            Live
          </span>
        ) : (
          <Btn variant="primary" disabled={!health.publishable || busy} onClick={onPublish} busy={busy}>
            Publish course
          </Btn>
        )
      }
    >
      {published ? (
        <p className="text-sm text-[var(--text-body)]">
          This course is live. Unpublish it from the basics panel to pull it from the catalogue.
        </p>
      ) : (
        <p className="mb-3 text-sm text-[var(--text-body)]">
          {health.publishable
            ? 'Ready to publish. Everything a learner needs is in place.'
            : `${blockers.length} required item${blockers.length === 1 ? '' : 's'} still missing.`}
        </p>
      )}

      <ul className="divide-y divide-[var(--border-subtle)]">
        {health.checks.map((check) => (
          <CheckRow key={check.key} check={check} />
        ))}
      </ul>
    </Panel>
  );
};

export default CourseHealthPanel;
