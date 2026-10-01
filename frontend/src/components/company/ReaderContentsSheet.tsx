import React from 'react';
import { BookOpen, CheckCircle2, ChevronRight, Lock } from 'lucide-react';
import { Sheet } from '@/components/common/Sheet';
import { ContentModule } from '@/types';
import { cn } from '@/lib/cn';
import { describeItemCount, isRoundLocked } from '@/lib/moduleLabel';

/**
 * The module list sheet — Phase 3, MOBILE_APP_UI_PLAN.md §3.1.
 *
 * This replaces a horizontal strip of chips that was the reader's *primary*
 * navigation on mobile. A carousel as primary navigation is a website pattern:
 * it hides options past the right edge with nothing indicating they exist, it
 * gives no sense of "where am I in eight sections", and it makes the fifth
 * section a one-handed horizontal scroll every time.
 *
 * The sheet is a list. Everything is on screen, the current position is stated,
 * and a tap is a tap.
 */

export interface ReaderSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

/** `readonly` because the caller's list is a `as const` tuple. */
export type ReaderSectionList = readonly ReaderSection[];

export interface ReaderContentsSheetProps {
  open: boolean;
  onClose: () => void;
  /** Sections of the module currently open. */
  sections: ReaderSectionList;
  activeSection: string;
  onSelectSection: (id: string) => void;
  /** Every round in the pack, when the company has more than one. */
  modules?: ContentModule[];
  activeModuleId?: number | string;
  isModuleUnlocked?: (mod: ContentModule) => boolean;
  onSelectModule?: (mod: ContentModule) => void;
}

export const ReaderContentsSheet: React.FC<ReaderContentsSheetProps> = ({
  open,
  onClose,
  sections,
  activeSection,
  onSelectSection,
  modules,
  activeModuleId,
  isModuleUnlocked,
  onSelectModule,
}) => {
  const showModules = Boolean(modules && modules.length > 1 && onSelectModule);

  return (
    <Sheet open={open} onClose={onClose} title="Contents" zIndex={55} data-testid="reader-contents">
      <div className="px-2 pb-4">
        {showModules && (
          <>
            <h3 className="nav-group-label px-3 pt-2">Rounds in this pack</h3>
            <ul>
              {modules!.map((mod) => {
                const active = mod.id === activeModuleId;
                const locked = isRoundLocked(mod, isModuleUnlocked ? isModuleUnlocked(mod) : true);
                const count = describeItemCount(mod);
                return (
                  <li key={mod.id}>
                    <button
                      type="button"
                      /*
                       * A locked round is not a destination. It used to call
                       * `onSelectModule` like every other row, so tapping a row
                       * marked "Locked" with a padlock walked the student into
                       * the paywall for a round they had not bought - the tap
                       * said yes to something the label said no to. `disabled`
                       * rather than a no-op handler so it also leaves the tab
                       * order, which is what the a11y tree should reflect.
                       */
                      disabled={locked}
                      onClick={() => {
                        onSelectModule!(mod);
                        onClose();
                      }}
                      aria-current={active ? 'true' : undefined}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors',
                        active && 'bg-[#0284C7]/10',
                        !active && !locked && 'active:bg-black/5',
                        locked && 'opacity-60'
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-[#10151C]">
                          {mod.round_type || mod.title}
                        </span>
                        <span className="block text-xs text-[color:var(--text-muted)]">
                          {[count, locked ? 'Locked' : 'In your vault'].filter(Boolean).join(' \u00b7 ')}
                        </span>
                      </span>
                      {locked ? (
                        <Lock className="h-4 w-4 flex-none text-gray-400" aria-hidden />
                      ) : active ? (
                        <CheckCircle2 className="h-4 w-4 flex-none text-[#0284C7]" aria-hidden />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>

            <h3 className="nav-group-label px-3 pt-4">In this round</h3>
          </>
        )}

        <ul>
          {sections.map((section) => {
            const Icon = section.icon;
            const active = section.id === activeSection;
            const position = sections.findIndex((s) => s.id === section.id) + 1;
            return (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelectSection(section.id);
                    onClose();
                  }}
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    'flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                    active ? 'bg-[#0284C7]/10' : 'active:bg-black/5'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 flex-none items-center justify-center rounded-lg',
                      active ? 'bg-[#0284C7] text-white' : 'bg-gray-100 text-gray-500'
                    )}
                    aria-hidden
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-[#10151C]">
                      {section.label.replace(/^\d+\.\s*/, '')}
                    </span>
                    {/* The guide's own section list is positional, and saying
                        "3 of 7" is what tells a student how much of the round is
                        left. The icon badge already numbers the round, so the
                        count sits with the label instead. */}
                    <span className="block text-xs text-[color:var(--text-muted)]">
                      Section {position} of {sections.length}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 flex-none opacity-40" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>

        {!showModules && (
          <p className="flex items-center gap-2 px-3 pt-4 text-xs text-[color:var(--text-muted)]">
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            Sections are collapsed to titles here so the whole guide fits one screen.
          </p>
        )}
      </div>
    </Sheet>
  );
};

export default ReaderContentsSheet;
