'use client';

import React, { useCallback } from 'react';
import { motion, useReducedMotion, type PanInfo } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  FlaskConical,
  GraduationCap,
  Landmark,
  Moon,
  Newspaper,
  Sun,
  TrendingUp,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Pressable } from '@/components/common/Pressable';
import type { BriefingItem, BriefingKind } from '@/lib/briefing/briefingLogic';

const DISMISS_DISTANCE = 60;
const DISMISS_VELOCITY = 500;

const KIND_ICON: Record<BriefingKind, LucideIcon> = {
  greeting: Sun,
  study_plan: ClipboardList,
  course: BookOpen,
  skill_test: FlaskConical,
  free_course: GraduationCap,
  vault: Landmark,
  drops: Newspaper,
  plan_progress: TrendingUp,
};

const iconFor = (item: BriefingItem, hour: number): LucideIcon => {
  if (item.kind === 'greeting') return hour < 17 ? Sun : Moon;
  return KIND_ICON[item.kind];
};

export interface BriefingCardProps {
  item: BriefingItem;
  index: number;
  staggerSeconds: number;
  onCta: (item: BriefingItem) => void;
  onDismiss: (id: string) => void;
}

export const BriefingCard: React.FC<BriefingCardProps> = ({
  item,
  index,
  staggerSeconds,
  onCta,
  onDismiss,
}) => {
  const reduced = useReducedMotion();
  const Icon = iconFor(item, new Date().getHours());

  const handleDragEnd = useCallback(
    (_event: unknown, info: PanInfo) => {
      const projected = info.offset.x + info.velocity.x * 0.15;
      if (projected < -DISMISS_DISTANCE || info.velocity.x < -DISMISS_VELOCITY) {
        onDismiss(item.id);
      }
    },
    [item.id, onDismiss]
  );

  const handleCta = useCallback(() => onCta(item), [item, onCta]);

  return (
    <motion.article
      layout
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.35}
      onDragEnd={handleDragEnd}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.94 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        transition: reduced
          ? { duration: 0.15 }
          : {
              type: 'spring',
              stiffness: 380,
              damping: 26,
              mass: 0.9,
              delay: index * staggerSeconds,
            },
      }}
      exit={
        reduced
          ? { opacity: 0, transition: { duration: 0.12 } }
          : { opacity: 0, x: -140, transition: { duration: 0.18, ease: [0.32, 0.72, 0, 1] } }
      }
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-[var(--border-subtle)] bg-white/90 p-3.5 shadow-[var(--shadow-raised)] backdrop-blur-md"
    >
      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `${item.tone}1A`, color: item.tone }}
      >
        <Icon size={17} strokeWidth={2.2} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold leading-tight text-[var(--text-heading)]">
          {item.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-[var(--text-muted)]">
          {item.body}
        </p>
        {item.cta && (
          <Pressable
            onPress={handleCta}
            className="mt-2 inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-bold"
            style={{ background: `${item.tone}14`, color: item.tone }}
          >
            {item.cta}
            <ArrowRight size={12} strokeWidth={2.6} aria-hidden="true" />
          </Pressable>
        )}
      </div>

      <Pressable
        onPress={() => onDismiss(item.id)}
        aria-label={`Dismiss ${item.title}`}
        expandHitArea
        className="-mr-1.5 -mt-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--text-light)]"
      >
        <X size={14} strokeWidth={2.4} aria-hidden="true" />
      </Pressable>
    </motion.article>
  );
};
