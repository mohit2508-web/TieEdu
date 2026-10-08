'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, type Transition } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Pressable } from '@/components/common/Pressable';
import { BriefingCard } from './BriefingCard';
import type { BriefingItem } from '@/lib/briefing/briefingLogic';

const IDLE_COLLAPSE_MS = 12_000;
const FIRST_STAGGER = 0.42;
const REEXPAND_STAGGER = 0.16;

export interface BriefingStackProps {
  items: BriefingItem[];
  onCta: (item: BriefingItem) => void;
  onDismissItem: (id: string) => void;
  onDismissAll: () => void;
}

export const BriefingStack: React.FC<BriefingStackProps> = ({
  items,
  onCta,
  onDismissItem,
  onDismissAll,
}) => {
  const reduced = useReducedMotion();
  const [collapsed, setCollapsed] = useState(false);
  const [stagger, setStagger] = useState(FIRST_STAGGER);
  const [interactions, setInteractions] = useState(0);
  const dockRef = useRef<HTMLDivElement>(null);

  const bump = useCallback(() => setInteractions((n) => n + 1), []);

  const expand = useCallback(() => {
    setStagger(REEXPAND_STAGGER);
    setCollapsed(false);
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    const timer = window.setTimeout(() => setCollapsed(true), IDLE_COLLAPSE_MS);
    return () => window.clearTimeout(timer);
  }, [items.length, collapsed, interactions]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismissAll();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onDismissAll]);

  useEffect(() => {
    const dock = dockRef.current;
    if (dock) dock.scrollTop = dock.scrollHeight;
  }, [items.length, collapsed]);

  const fade: Transition = reduced
    ? { duration: 0.12 }
    : { duration: 0.2, ease: [0.32, 0.72, 0, 1] };

  return (
    <motion.div
      ref={dockRef}
      className="briefing-dock"
      role="log"
      aria-label="Daily briefing"
      onPointerDown={bump}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: reduced ? 0.12 : 0.18 } }}
      transition={{ duration: reduced ? 0.12 : 0.22 }}
    >
      <AnimatePresence mode="wait">
        {!collapsed ? (
          <motion.div
            key="stack"
            className="flex flex-col gap-2"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1, transition: fade }}
            exit={{ opacity: 0, scale: 0.96, transition: fade }}
          >
            <AnimatePresence initial={false}>
              {items.map((item, index) => (
                <BriefingCard
                  key={item.id}
                  item={item}
                  index={index}
                  staggerSeconds={stagger}
                  onCta={onCta}
                  onDismiss={onDismissItem}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="pill"
            className="pointer-events-auto flex items-center gap-2"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 420, damping: 30 } }}
            exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
          >
            <Pressable
              onPress={expand}
              aria-label={`Show daily briefing, ${items.length} items`}
              className="flex h-9 items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-white/90 px-3 shadow-[var(--shadow-raised)] backdrop-blur-md"
            >
              <Menu size={14} strokeWidth={2.4} aria-hidden="true" />
              <span className="text-xs font-bold tabular-nums text-[var(--text-heading)]">
                {items.length}
              </span>
            </Pressable>
            <Pressable
              onPress={onDismissAll}
              aria-label="Dismiss daily briefing"
              expandHitArea
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-white/90 text-[var(--text-muted)] shadow-[var(--shadow-raised)] backdrop-blur-md"
            >
              <X size={14} strokeWidth={2.4} aria-hidden="true" />
            </Pressable>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
