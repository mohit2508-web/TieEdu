import React from 'react';
import { BadgeCheck, Check, Lock, FileText, Gift } from 'lucide-react';

const ROUNDS = [
  { icon: Check, label: 'Online Assessment', note: 'Round-by-round', free: true },
  { icon: Check, label: 'Technical Rounds', note: 'DSA + puzzles', free: true },
  { icon: FileText, label: 'System Design', note: 'Flowcharts', free: false },
  { icon: Lock, label: 'HR & Managerial', note: 'STAR answers', free: false },
];

/*
 * The hero's right column has two live occupants — admin posters and (used
 * to be) the 3D orbit — and the posters can be absent: no creatives uploaded.
 * A text-only hero with an empty grid column reads as a broken layout, so this
 * static CSS illustration stands in on `md` and up (the caller hides it on
 * phones, where Quick Actions sit right below instead). It is decorative
 * (aria-hidden), carries no data, no prices and no company names — it only
 * shows the shape of what a vault contains.
 */
export const HeroVaultMock: React.FC = () => (
  <div
    aria-hidden="true"
    className="w-full max-w-[350px] rounded-3xl border border-white/70 bg-white/85 p-5 shadow-float backdrop-blur-md"
  >
    <div className="flex items-center gap-3 pb-4 border-b border-line">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-ink text-white text-sm font-black">
        CV
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold text-heading truncate">Company vault</span>
        <span className="block text-xs text-[var(--text-muted)]">What every unlock opens</span>
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-surface-hover border border-line px-2 py-1 text-xs font-extrabold text-success">
        <BadgeCheck className="w-3.5 h-3.5" /> Verified
      </span>
    </div>

    <ul className="divide-y divide-line">
      {ROUNDS.map((r) => (
        <li key={r.label} className="flex items-center gap-3 py-3">
          <r.icon
            className={`w-4 h-4 shrink-0 ${r.free ? 'text-success' : 'text-text-light'}`}
            strokeWidth={2.6}
          />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-heading truncate">{r.label}</span>
            <span className="block text-xs text-[var(--text-muted)] truncate">{r.note}</span>
          </span>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
              r.free ? 'bg-surface-hover text-success' : 'bg-surface-hover text-muted'
            }`}
          >
            {r.free ? 'Free' : 'PDF'}
          </span>
        </li>
      ))}
    </ul>

    <div className="mt-4 flex items-center gap-2 rounded-2xl bg-warning-soft border border-line px-3 py-2.5">
      <Gift className="w-4 h-4 shrink-0 text-amber-deep" />
      <span className="text-xs font-bold text-heading">
        Free 7-section pack in every vault
      </span>
    </div>
  </div>
);

export default HeroVaultMock;
