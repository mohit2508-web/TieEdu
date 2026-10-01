import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ListVideo } from 'lucide-react';
import { isLocked, LessonRow, ProgressBar } from '@/components/courses/CourseUi';
import { Sheet } from '@/components/common/Sheet';
import { formatDuration } from '@/lib/courseFormat';
import type { CourseModule, CourseProgress } from '@/types';

export interface SyllabusNavProps {
  modules: CourseModule[];
  courseSlug: string;
  progress: CourseProgress | null;
  /** The lesson currently open in the player, used to keep its module expanded. */
  selectedLessonId?: string | null;
  /** The id of the element that shows the lesson, scrolled into view on mobile. */
  playerId?: string;
  /**
   * Total course minutes, used for the outline header.
   *
   * Taken from the course stats rather than summed from the lessons, so it agrees
   * with the duration shown in the hero and the JSON-LD. Deriving it twice from
   * two different sources is how a page ends up claiming two different lengths for
   * the same course. `formatDuration` returns null below a minute, and the header
   * drops a null part, so an unknown duration is omitted rather than shown as 0.
   */
  totalMinutes?: number;
}

const lessonCount = (modules: CourseModule[]): number =>
  modules.reduce((total, m) => total + (m.lessons || []).length, 0);

/**
 * Lessons in a module that carry a quiz.
 *
 * Counted from the per-lesson `has_quiz` flag rather than by inspecting the quiz
 * body, because the public lesson payload deliberately omits the questions. A
 * module that has quizzes should advertise them, and a learner deciding whether to
 * buy the course needs to know that before enrolling - but they should never be
 * shown the questions themselves to find out.
 */
const quizCount = (m: CourseModule): number =>
  (m.lessons || []).filter((l) => l.has_quiz).length;

/** Total minutes across a module's lessons. 0 when the durations are unknown. */
const moduleMinutes = (m: CourseModule): number =>
  (m.lessons || []).reduce((total, l) => total + (Number(l.duration_minutes) || 0), 0);

/**
 * The course outline, which has to work in two very different shapes.
 *
 * At `lg` and up it is a narrow sticky column that scrolls independently, because
 * a fifteen-module outline is taller than any viewport and the learner needs it
 * beside the lesson rather than above it.
 *
 * Below `lg` that same column becomes the top of a single-column page, where an
 * always-expanded outline of every lesson pushes the actual lesson below the
 * fold and makes the page feel like it is only a table of contents. So on small
 * screens it collapses into a sheet that starts closed, opens the module being
 * read, and — the part that was missing — scrolls the player into view after a
 * lesson is chosen. Without that last step a tap on a lesson in a long outline
 * appears to do nothing, because the new lesson renders off-screen.
 */
export const CourseSyllabusNav: React.FC<SyllabusNavProps> = ({
  modules,
  courseSlug,
  progress,
  selectedLessonId,
  playerId = 'lesson-player',
  totalMinutes,
}) => {
  const totalQuizCount = useMemo(
    () => modules.reduce((total, m) => total + quizCount(m), 0),
    [modules]
  );
  const totalDuration = formatDuration(totalMinutes);

  const lessonIds = useMemo(
    () => modules.flatMap((m) => (m.lessons || []).map((l) => l.id)),
    [modules],
  );
  const moduleOfLesson = useCallback(
    (lessonId: string) => modules.find((m) => (m.lessons || []).some((l) => l.id === lessonId))?.id,
    [modules],
  );

  const activeModuleId = selectedLessonId ? moduleOfLesson(selectedLessonId) : undefined;

  // A module is open when it holds the lesson being read. Starting from this
  // rather than "all open" is what keeps the mobile sheet short.
  const [openModules, setOpenModules] = useState<Set<string>>(
    () => new Set(activeModuleId ? [activeModuleId] : []),
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [expandAll, setExpandAll] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  /**
   * Keep the module holding the current lesson open as the learner moves between
   * lessons, but only once they have opened the sheet themselves. Doing it
   * unconditionally would pop the sheet open on every navigation.
   */
  useEffect(() => {
    if (!activeModuleId) return;
    setOpenModules((prev) => {
      if (prev.has(activeModuleId) || expandAll) return prev;
      return new Set([...prev, activeModuleId]);
    });
  }, [activeModuleId, expandAll]);

  /**
   * Open or close one module.
   *
   * While "expand all" is on, `isOpen` ignores `openModules` entirely, so a plain
   * toggle would be a dead control - the click would change state the render
   * never reads. Clicking a header in that mode means "show me just this one", so
   * that is what it does: leave expand-all and keep only this module open.
   */
  const toggleModule = (id: string) => {
    if (expandAll) {
      setExpandAll(false);
      setOpenModules(new Set([id]));
      return;
    }
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isOpen = (id: string) => expandAll || openModules.has(id);

  /**
   * After a lesson is picked, put the lesson itself on screen.
   *
   * Only on small screens: at `lg` the player is already beside the outline, so
   * scrolling would yank the page away from the sticky column for no reason.
   * `requestAnimationFrame` waits for the new lesson to mount before measuring,
   * otherwise the target still has the previous lesson's height.
   */
  const onLessonPicked = () => {
    if (typeof window === 'undefined' || window.matchMedia('(min-width: 1024px)').matches) return;
    setSheetOpen(false);
    requestAnimationFrame(() => {
      document.getElementById(playerId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const renderModule = (m: CourseModule) => {
    const open = isOpen(m.id);
    const lessons = m.lessons || [];
    const body = (
      <>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-[var(--ink)]">{m.title}</span>
          <span className="mt-0.5 block text-[11px] text-[var(--text-muted)]">
            {[
              `${lessons.length} ${lessons.length === 1 ? 'lesson' : 'lessons'}`,
              // Omitted entirely when the module has none, rather than shown as
              // "0 quizzes". A zero reads as a course with nothing to test the
              // learner on, which is a different and wrong claim.
              quizCount(m) > 0
                ? `${quizCount(m)} ${quizCount(m) === 1 ? 'quiz' : 'quizzes'}`
                : null,
              formatDuration(moduleMinutes(m)),
            ]
              .filter(Boolean)
              .join(' \u00b7 ')}
          </span>
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`shrink-0 text-[var(--text-light)] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </>
    );

    return (
      <div key={m.id} className="mb-1.5 border-b border-[var(--border-subtle)] last:border-b-0">
        <button
          type="button"
          onClick={() => toggleModule(m.id)}
          aria-expanded={open}
          aria-controls={`syllabus-module-${m.id}`}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-surface-hover)]"
        >
          {body}
        </button>
        {open && (
          <div id={`syllabus-module-${m.id}`} className="pb-1.5">
            {lessons.map((l) => (
              <div key={l.id} onClick={onLessonPicked}>
                <LessonRow
                  lesson={l}
                  courseSlug={courseSlug}
                  locked={isLocked(l, progress)}
                  isNext={progress?.next_lesson_id === l.id}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  /**
   * The title, kept separate from the expand control.
   *
   * These used to be one `header` node rendered inside the mobile sheet's toggle
   * `<button>`, which made the "Expand all" button a child of another button.
   * That is invalid, and it misbehaves in practice rather than merely failing
   * validation: browsers repair the nesting unpredictably, so tapping "Expand
   * all" could collapse the sheet instead, and the sheet toggle's click handler
   * would fire for a control that has nothing to do with it. Two sibling nodes
   * keep each control doing exactly one thing.
   */
  const title = (
    <span className="inline-flex min-w-0 items-center gap-2 text-sm font-bold text-[var(--ink)]">
      <ListVideo size={16} aria-hidden="true" className="shrink-0 text-[var(--brand-sky)]" />
      <span className="truncate">Course content</span>
      <span className="shrink-0 font-normal text-[var(--text-muted)]">
        ({[
          `${lessonCount(modules)} ${lessonCount(modules) === 1 ? 'lesson' : 'lessons'}`,
          totalQuizCount > 0
            ? `${totalQuizCount} ${totalQuizCount === 1 ? 'quiz' : 'quizzes'}`
            : null,
          totalDuration,
        ]
          .filter(Boolean)
          .join(' \u00b7 ')}
        )
      </span>
    </span>
  );

  /**
   * Shown whenever there is an outline at all.
   *
   * It used to be gated on `openModules.size > 0`, which hid it in exactly the
   * state a learner first meets it: nothing open yet. On mobile the sheet starts
   * closed, so the button was never reachable before you had already opened a
   * module by hand - the one thing expand-all is there to save you from.
   */
  const expandToggle =
    modules.length > 0 ? (
      <button
        type="button"
        onClick={() => setExpandAll((v) => !v)}
        aria-pressed={expandAll}
        className="shrink-0 rounded px-1 text-xs font-semibold text-[var(--brand-sky)] hover:underline"
      >
        {expandAll ? 'Collapse all' : 'Expand all'}
      </button>
    ) : null;

  return (
    <aside
      ref={sheetRef}
      aria-label="Course content"
      // Pinned and height-capped off --header-h, not a bare `top-6`.
      //
      // The header is 64px and sticks to the top, so a rail at top-6 pinned itself
      // 40px underneath it: the first module heading disappeared behind the nav the
      // moment you scrolled. Worse, `max-h-[calc(100vh-3rem)]` sized the scroll box
      // against the full viewport while the top 64px were already occupied, so the
      // bottom of the rail hung 40px below the screen and its own scrollbar could
      // never bring the last module into view. This is the outline for a
      // fifteen-module course, so "cannot reach the end" was a real dead end rather
      // than a cosmetic one.
      className="lg:sticky lg:top-[var(--rail-top)] lg:max-h-[var(--rail-max-h)] lg:overflow-y-auto lg:overscroll-contain lg:pr-1"
    >
      {/* Small screens: a bottom sheet, so opening the outline does not reflow the
          page. It used to be an inline collapse panel, which meant that expanding a
          module pushed the video - the reason the learner opened it - downwards off
          the screen, and collapsing it again lost their scroll position. A sheet
          overlays, so the video stays exactly where it was.

          Large screens: the plain always-open column below, unchanged. */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-expanded={sheetOpen}
          aria-controls="syllabus-sheet"
          className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3 text-left transition-colors active:bg-[var(--bg-surface-hover)]"
        >
          {title}
          <ChevronDown
            size={18}
            aria-hidden="true"
            className="shrink-0 text-[var(--text-light)]"
          />
        </button>

        <Sheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="Course content"
          contentClassName="px-2 pb-4"
        >
          {modules.length === 0 ? (
            <p className="px-3 py-4 text-sm text-[var(--text-muted)]">
              The outline is not available for this course.
            </p>
          ) : (
            <>
              {/* Progress sits at the top of the sheet, not only in the hero: the
                  sheet is opened to answer "how much of this is left, and what is
                  next", and a bare list of lessons answers neither. */}
              {progress && progress.total > 0 && (
                <div className="mb-2 px-1">
                  <ProgressBar
                    percent={progress.percent}
                    label={`${progress.completed} of ${progress.total} lessons`}
                  />
                </div>
              )}
              {/* A sibling of the header button above, not a child of it - see the
                  note on `expandToggle`. */}
              <div className="flex justify-end px-3 pb-1 pt-1">{expandToggle}</div>
              <div id="syllabus-sheet">{modules.map(renderModule)}</div>
            </>
          )}
        </Sheet>
      </div>

      {/* Desktop column. `hidden` rather than conditional rendering so the markup
          is identical to before at lg and above, which keeps the two views from
          drifting apart as the outline changes. */}
      <div className="hidden lg:block">
        <div className="mb-3 flex items-center justify-between gap-3">
          {title}
          {expandToggle}
        </div>
        {modules.map(renderModule)}
      </div>
    </aside>
  );
};

export default CourseSyllabusNav;
