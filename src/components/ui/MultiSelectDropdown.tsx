import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, X, Search } from 'lucide-react';

interface Option {
  id: string;
  name: string;
}

interface MultiSelectDropdownProps {
  label: string;
  value: string[];
  onChange: (selectedIds: string[]) => void;
  options: Option[];
  placeholder?: string;
  required?: boolean;
  usePortal?: boolean;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select items...',
  required = false,
  usePortal = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const [dropdownStyles, setDropdownStyles] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const portalDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter((option) =>
    option.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideContainer = containerRef.current && containerRef.current.contains(target);
      const isInsidePortalDropdown = portalDropdownRef.current && portalDropdownRef.current.contains(target);

      if (!isInsideContainer && !isInsidePortalDropdown) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    const calculateDropdownPosition = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const dropdownHeight = 300;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;

        if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
          setDropdownPosition('top');
        } else {
          setDropdownPosition('bottom');
        }

        if (usePortal) {
          const styles: React.CSSProperties = {
            position: 'fixed',
            width: `${rect.width}px`,
            left: `${rect.left}px`,
            zIndex: 9999,
          };

          if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
            styles.bottom = `${window.innerHeight - rect.top}px`;
          } else {
            styles.top = `${rect.bottom}px`;
          }

          setDropdownStyles(styles);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      calculateDropdownPosition();
      window.addEventListener('scroll', calculateDropdownPosition, true);
      window.addEventListener('resize', calculateDropdownPosition);
      searchInputRef.current?.focus();
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', calculateDropdownPosition, true);
      window.removeEventListener('resize', calculateDropdownPosition);
    };
  }, [isOpen, usePortal]);

  const toggleOption = (optionId: string) => {
    if (value.includes(optionId)) {
      onChange(value.filter(id => id !== optionId));
    } else {
      onChange([...value, optionId]);
    }
  };

  const removeOption = (optionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter(id => id !== optionId));
  };

  const selectedOptions = options.filter(opt => value.includes(opt.id));

  const renderDropdownContent = () => (
    <>
      <div className="p-2 border-b border-slate-200">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            ref={searchInputRef}
            type="text"
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>

      <div className="max-h-60 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        {filteredOptions.length === 0 ? (
          <div className="px-3 py-6 text-center text-slate-500 text-sm">
            {searchTerm ? 'No matching options' : 'No options available'}
          </div>
        ) : (
          <div className="py-1">
            {filteredOptions.map((option) => {
              const isSelected = value.includes(option.id);
              return (
                <div
                  key={option.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleOption(option.id);
                  }}
                  className={`px-3 py-2 cursor-pointer flex items-center justify-between hover:bg-slate-50 transition-colors ${
                    isSelected ? 'bg-cyan-50' : ''
                  }`}
                >
                  <span className={`text-sm ${isSelected ? 'text-cyan-700 font-medium' : 'text-slate-700'}`}>
                    {option.name}
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-cyan-600" />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {filteredOptions.length > 0 && (
        <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 text-center">
          {value.length} of {options.length} selected
        </div>
      )}
    </>
  );

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full min-h-[42px] px-3 py-2 border rounded-lg bg-white cursor-pointer transition-all ${
          isOpen
            ? 'border-cyan-500 ring-2 ring-cyan-500 ring-opacity-20'
            : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        {selectedOptions.length === 0 ? (
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">{placeholder}</span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5 flex-1">
              {selectedOptions.map((option) => (
                <span
                  key={option.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-100 text-cyan-700 text-xs font-medium rounded-md"
                >
                  {option.name}
                  <button
                    type="button"
                    onClick={(e) => removeOption(option.id, e)}
                    className="hover:bg-cyan-200 rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        )}
      </div>

      {isOpen && !usePortal && (
        <div
          className={`absolute z-50 w-full bg-white border border-slate-300 rounded-lg shadow-lg overflow-hidden ${
            dropdownPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {renderDropdownContent()}
        </div>
      )}

      {isOpen && usePortal && createPortal(
        <div
          ref={portalDropdownRef}
          className="bg-white border border-slate-300 rounded-lg shadow-lg overflow-hidden"
          style={dropdownStyles}
        >
          {renderDropdownContent()}
        </div>,
        document.body
      )}
    </div>
  );
};
