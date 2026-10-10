import React from 'react';
import { Check, Lock, Play, CircleDashed } from 'lucide-react';
import type { DriveRound } from '@/types/drives';

type NodeState = 'done' | 'current' | 'available' | 'locked';

function stateFor(round: DriveRound, registered: boolean): NodeState {
  const s = (round.status_label || round.my_status || '').toLowerCase();
  if (s.includes('complete') || s.includes('pass')) return 'done';
  if (!registered) return 'locked';
  if (s.includes('lock')) return 'locked';
  if (s.includes('progress') || s.includes('launch')) return 'current';
  if (s.includes('unlocked') || s.includes('available') || s.includes('open')) return 'available';
  return 'available';
}

const STYLES: Record<NodeState, { ring: string; fill: string; fg: string; label: string }> = {
  done:      { ring: 'var(--apple-green)',  fill: 'var(--apple-green)',  fg: '#fff', label: 'Completed' },
  current:   { ring: 'var(--apple-blue)',   fill: 'var(--apple-blue)',   fg: '#fff', label: 'In progress' },
  available: { ring: 'var(--apple-blue)',   fill: 'var(--apple-surface)', fg: 'var(--apple-blue)', label: 'Available' },
  locked:    { ring: 'var(--apple-separator)', fill: 'var(--apple-fill)', fg: 'var(--apple-label-3)', label: 'Locked' },
};

/**
 * Vertical hiring-workflow stepper for a drive's rounds. The server resolves
 * each round's unlock/attempt state into `status_label`; this component only
 * maps that onto a node colour and connector, so the visual order can never
 * disagree with what the launch endpoint will actually allow.
 */
export const WorkflowStepper: React.FC<{ rounds: DriveRound[]; registered: boolean }> = ({
  rounds,
  registered,
}) => {
  if (rounds.length === 0) return null;
  return (
    <ol className="relative">
      {rounds.map((round, i) => {
        const state = stateFor(round, registered);
        const st = STYLES[state];
        const isLast = i === rounds.length - 1;
        return (
          <li key={round.test_id} className="relative flex gap-3 pb-5 last:pb-0">
            {/* Connector */}
            {!isLast && (
              <span
                aria-hidden
                className="absolute left-[13px] top-7 h-[calc(100%-16px)] w-[2px] rounded"
                style={{ background: state === 'done' ? 'var(--apple-green)' : 'var(--apple-separator)' }}
              />
            )}
            {/* Node */}
            <span
              className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2"
              style={{ borderColor: st.ring, background: st.fill, color: st.fg }}
            >
              {state === 'done' && <Check size={15} strokeWidth={3} />}
              {state === 'current' && <Play size={13} strokeWidth={3} fill="currentColor" />}
              {state === 'available' && <CircleDashed size={15} strokeWidth={2.4} />}
              {state === 'locked' && <Lock size={13} strokeWidth={2.6} />}
            </span>
            {/* Label */}
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center gap-2">
                <span className="truncate text-[14px] font-semibold" style={{ color: 'var(--apple-label)' }}>
                  {round.round_name || round.name}
                </span>
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide" style={{ color: st.fg === '#fff' ? st.ring : 'var(--apple-label-3)' }}>
                  {st.label}
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px]" style={{ color: 'var(--apple-label-2)' }}>
                {round.duration_minutes != null && <span>{round.duration_minutes} min</span>}
                {round.total_questions != null && <span>{round.total_questions} Qs</span>}
                {round.max_attempts > 1 && <span>{round.attempts_used}/{round.max_attempts} attempts</span>}
                {round.best_percentage != null && <span>Best {Math.round(round.best_percentage)}%</span>}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default WorkflowStepper;
