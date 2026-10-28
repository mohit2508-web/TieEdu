import React, { useId, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Accordion — white rows with an edge and a +/− (UI_REDESIGN_PLAN_V3 §9 E14).
 * Each row is a real button with `aria-expanded` controlling its panel; more
 * than one row may be open. Answers stay in the DOM (hidden), so a crawler
 * still reads them.
 */
export interface AccordionItem {
  id: string;
  question: React.ReactNode;
  answer: React.ReactNode;
}

export const Accordion: React.FC<{ items: AccordionItem[]; defaultOpen?: string[]; className?: string }> = ({
  items,
  defaultOpen = [],
  className,
}) => {
  const [open, setOpen] = useState<Set<string>>(() => new Set(defaultOpen));
  const base = useId();
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {items.map((item) => {
        const isOpen = open.has(item.id);
        const panelId = `${base}-${item.id}`;
        const Icon = isOpen ? Minus : Plus;
        return (
          <div key={item.id} className="rounded-cell border border-line bg-card shadow-edge-neutral">
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className="focus-ring flex min-h-[56px] w-full items-center justify-between gap-4 rounded-cell px-5 py-3 text-left font-display text-label text-heading"
              >
                {item.question}
                <Icon className="h-5 w-5 flex-none text-muted" aria-hidden />
              </button>
            </h3>
            <div id={panelId} hidden={!isOpen} className="px-5 pb-5 text-body-md text-body">
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Accordion;
