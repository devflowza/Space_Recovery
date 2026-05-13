import React, { useEffect, useState } from 'react';
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

const accentDotColors: Record<AccentColor, string> = {
  amber: '#D97706',
  emerald: '#059669',
  teal: '#0D9488',
  sky: '#0284C7',
  payroll: '#0891B2',
  employee: '#DB2777',
  slate: '#475569',
  blue: '#3b82f6',
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
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);

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

  if (isCollapsed) {
    return (
      <div className="py-2" style={{ borderBottom: '1px solid #edf0f5' }}>
        {accentColor && (
          <div className="flex justify-center mb-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: accentDotColors[accentColor] }}
            />
          </div>
        )}
        <div className="space-y-1">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="py-1">
      {!alwaysExpanded ? (
        <button
          onClick={handleToggle}
          className="w-full flex items-center justify-between rounded-lg transition-all duration-[180ms]"
          style={{
            padding: '9px 10px',
            background: isHeaderHovered ? '#E8ECF2' : 'transparent',
            borderLeft: `3px solid ${isHeaderHovered ? 'rgb(var(--color-primary) / 0.4)' : 'transparent'}`,
          }}
          onMouseEnter={() => setIsHeaderHovered(true)}
          onMouseLeave={() => setIsHeaderHovered(false)}
        >
          <div className="flex items-center gap-2">
            {accentColor && (
              <div
                className="rounded-full flex-shrink-0"
                style={{
                  width: '8px',
                  height: '8px',
                  background: accentDotColors[accentColor],
                  transform: isHeaderHovered ? 'scale(1.3)' : 'scale(1)',
                  transition: 'transform 0.2s ease',
                }}
              />
            )}
            <span
              className="font-[600] uppercase tracking-[0.07em] transition-colors duration-[180ms]"
              style={{ fontSize: '11.5px', color: isHeaderHovered ? 'rgb(var(--color-primary))' : '#5A6A7A' }}
            >
              {title}
            </span>
          </div>
          <ChevronRight
            className="transition-all duration-200"
            style={{
              width: '14px',
              height: '14px',
              color: isHeaderHovered ? 'rgb(var(--color-primary))' : '#7A8A9A',
              transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          />
        </button>
      ) : (
        <div style={{ padding: '9px 10px' }}>
          <div className="flex items-center gap-2">
            {accentColor && (
              <div
                className="rounded-full flex-shrink-0"
                style={{
                  width: '8px',
                  height: '8px',
                  background: accentDotColors[accentColor],
                }}
              />
            )}
            <span
              className="font-[600] uppercase tracking-[0.07em]"
              style={{ fontSize: '11.5px', color: '#5A6A7A' }}
            >
              {title}
            </span>
          </div>
        </div>
      )}

      <div
        className={`mt-0.5 space-y-0.5 overflow-hidden transition-all duration-300 ease-in-out ${
          (isOpen || alwaysExpanded) ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {children}
      </div>
    </div>
  );
};
