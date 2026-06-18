import React, { useEffect, useId, useState } from 'react';
import { ChevronRight } from 'lucide-react';

type AccentColor = 'amber' | 'emerald' | 'teal' | 'sky' | 'slate' | 'blue' | 'payroll' | 'employee';

interface SidebarSectionProps {
  title: string;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
  isCollapsed?: boolean;
  alwaysExpanded?: boolean;
  accentColor?: AccentColor;
}

// Per-section identity dots map to the fixed cat-* palette (DESIGN.md). These
// are intentionally constant across themes — they identify the group, not the
// brand, so they do NOT change with the Appearance theme (by design).
const accentDotClasses: Record<AccentColor, string> = {
  amber: 'bg-cat-4',
  emerald: 'bg-cat-2',
  teal: 'bg-cat-1',
  sky: 'bg-cat-7',
  payroll: 'bg-cat-3',
  employee: 'bg-cat-6',
  slate: 'bg-cat-8',
  blue: 'bg-cat-5',
};

export const SidebarSection: React.FC<SidebarSectionProps> = ({
  title,
  children,
  defaultCollapsed = false,
  onToggle,
  isCollapsed = false,
  alwaysExpanded = false,
  accentColor,
}) => {
  const [isOpen, setIsOpen] = useState(!defaultCollapsed);
  const contentId = useId();

  useEffect(() => {
    setIsOpen(!defaultCollapsed);
  }, [defaultCollapsed]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (alwaysExpanded) return;
    const newState = !isOpen;
    setIsOpen(newState);
    onToggle?.(!newState);
  };

  // Collapsed icon rail: drop the group label/dot and separate groups with a
  // hairline divider so the rail stays scannable without text.
  if (isCollapsed) {
    return (
      <div className="py-2 border-b border-border">
        <div className="space-y-1">{children}</div>
      </div>
    );
  }

  const headerInner = (
    <div className="flex items-center gap-2">
      {accentColor && (
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 transition-transform duration-200 group-hover:scale-125 ${accentDotClasses[accentColor]}`}
        />
      )}
      <span className="text-xxs font-semibold uppercase tracking-[0.08em] text-slate-500 group-hover:text-primary transition-colors">
        {title}
      </span>
    </div>
  );

  return (
    <div className="py-1">
      {!alwaysExpanded ? (
        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={isOpen}
          aria-controls={contentId}
          className="group w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors hover:bg-primary/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          {headerInner}
          <ChevronRight
            className={`w-3.5 h-3.5 text-slate-400 group-hover:text-primary transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
          />
        </button>
      ) : (
        <div className="px-2.5 py-2">{headerInner}</div>
      )}

      <div
        id={contentId}
        role="group"
        aria-label={title}
        className={`mt-0.5 space-y-0.5 overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen || alwaysExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {children}
      </div>
    </div>
  );
};
