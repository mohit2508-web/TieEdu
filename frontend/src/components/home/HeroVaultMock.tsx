import React from 'react';
import { BadgeCheck, Check, Lock, FileText, Sparkles } from 'lucide-react';

const ROUNDS = [
  { icon: Check, label: 'Online Assessment', note: 'Round-by-round', free: true },
  { icon: Check, label: 'Technical Rounds', note: 'DSA + puzzles', free: true },
  { icon: FileText, label: 'System Design', note: 'Flowcharts', free: false },
  { icon: Lock, label: 'HR & Managerial', note: 'STAR answers', free: false },
];

/*
 * The hero's right column has two live occupants — admin posters and the 3D
 * orbit — and both can be absent at once: no creatives uploaded, or a phone
 * where the orbit is gated to >=1024px. A text-only hero on a phone reads as
 * a broken layout with a dead grid column, so this static CSS illustration
 * stands in. It is decorative (aria-hidden), carries no data, no prices and
 * no company names — it only shows the shape of what a vault contains.
 */
export const HeroVaultMock: React.FC = () => (
  <div
    aria-hidden="true"
    className="w-full max-w-[350px] lg:hidden rounded-3xl border border-white/70 bg-white/85 p-5 shadow-float backdrop-blur-md"
  >
    <div className="flex items-center gap-3 pb-4 border-b border-[#E9E7E1]">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0E2A44] text-white text-sm font-black">
        CV
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-extrabold text-[#10151C] truncate">Company vault</span>
        <span className="block text-[12px] text-[var(--text-muted)]">What every unlock opens</span>
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-[#E9F6EE] border border-[#CDE9D4] px-2 py-1 text-[11px] font-extrabold text-[#15803D]">
        <BadgeCheck className="w-3.5 h-3.5" /> Verified
      </span>
    </div>

    <ul className="divide-y divide-[#EFEEE9]">
      {ROUNDS.map((r) => (
        <li key={r.label} className="flex items-center gap-3 py-3">
          <r.icon
            className={`w-4 h-4 shrink-0 ${r.free ? 'text-[#15803D]' : 'text-[#AEB6BE]'}`}
            strokeWidth={2.6}
          />
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-bold text-[#10151C] truncate">{r.label}</span>
            <span className="block text-[12px] text-[var(--text-muted)] truncate">{r.note}</span>
          </span>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
              r.free ? 'bg-[#E9F6EE] text-[#15803D]' : 'bg-[#F0EFEC] text-[#5A6470]'
            }`}
          >
            {r.free ? 'Free' : 'PDF'}
          </span>
        </li>
      ))}
    </ul>

    <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[#FFF7E8] border border-[#F3E3C8] px-3 py-2.5">
      <Sparkles className="w-4 h-4 shrink-0 text-[#B45309]" />
      <span className="text-[12px] font-bold text-[#241A06]">
        Free 7-section pack in every vault
      </span>
    </div>
  </div>
);

export default HeroVaultMock;
