import { useState, useRef, useEffect, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  children: ReactNode;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
  fieldCount?: number;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon: Icon,
  color,
  children,
  defaultOpen = false,
  isOpen: controlledIsOpen,
  onToggle,
  fieldCount,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(isOpen ? undefined : 0);

  useEffect(() => {
    if (!contentRef.current) return;

    if (isOpen) {
      const contentHeight = contentRef.current.scrollHeight;
      setHeight(contentHeight);

      const timer = setTimeout(() => {
        setHeight(undefined);
      }, 300);

      return () => clearTimeout(timer);
    } else {
      setHeight(contentRef.current.scrollHeight);

      requestAnimationFrame(() => {
        setHeight(0);
      });
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (isControlled && onToggle) {
      onToggle();
    } else {
      setInternalIsOpen(!internalIsOpen);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      <button
        onClick={handleToggle}
        className="w-full px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white hover:from-slate-100 hover:to-slate-50 transition-all duration-200 flex items-center justify-between gap-4 group"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow"
            style={{ backgroundColor: color }}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            {fieldCount !== undefined && (
              <span className="px-2 py-0.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-full">
                {fieldCount} fields
              </span>
            )}
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      <div
        ref={contentRef}
        style={{
          height: height !== undefined ? `${height}px` : 'auto',
          overflow: 'hidden',
          transition: 'height 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div className="p-6">
          <div className="space-y-4">{children}</div>
        </div>
      </div>
    </div>
  );
};
