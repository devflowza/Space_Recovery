import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { ChevronDown, User, X } from 'lucide-react';

interface Engineer {
  id: string;
  full_name: string;
  role: string;
  case_access_level: 'restricted' | 'full';
}

interface EngineerSelectorProps {
  value: string | null;
  onChange: (engineerId: string | null) => void;
  disabled?: boolean;
  className?: string;
  showBadgeInDisplay?: boolean;
}

export const EngineerSelector: React.FC<EngineerSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
  showBadgeInDisplay = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: engineers = [], isLoading, error } = useQuery({
    queryKey: ['engineers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, case_access_level')
        .eq('role', 'technician')
        .eq('is_active', true)
        .order('full_name');

      if (error) {
        console.error('Error fetching engineers:', error);
        throw error;
      }
      return data as Engineer[];
    },
  });

  const selectedEngineer = engineers.find((e) => e.id === value);

  const filteredEngineers = engineers.filter((engineer) =>
    engineer.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (engineerId: string | null) => {
    onChange(engineerId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 text-left border rounded-lg transition-all ${
          disabled
            ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200'
            : 'bg-white border-slate-300 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {selectedEngineer ? (
              <>
                <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-900 truncate">
                  {selectedEngineer.full_name}
                </span>
                {showBadgeInDisplay && selectedEngineer.case_access_level === 'restricted' && (
                  <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">
                    Restricted
                  </span>
                )}
              </>
            ) : (
              <>
                <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-400">Not assigned</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            {selectedEngineer && !disabled && (
              <div
                onClick={handleClear}
                className="p-0.5 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                title="Clear assignment"
              >
                <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
              </div>
            )}
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${
                isOpen ? 'transform rotate-180' : ''
              }`}
            />
          </div>
        </div>
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-xl max-h-64 overflow-hidden">
          <div className="p-2 border-b border-slate-200">
            <input
              type="text"
              placeholder="Search engineers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>

          <div className="max-h-48 overflow-y-auto bg-white">
            {error ? (
              <div className="px-3 py-2 text-sm text-red-500 text-center">
                Error loading engineers
              </div>
            ) : isLoading ? (
              <div className="px-3 py-2 text-sm text-slate-500 text-center">
                Loading engineers...
              </div>
            ) : filteredEngineers.length === 0 && searchTerm ? (
              <div className="px-3 py-2 text-sm text-slate-500 text-center">
                No engineers found matching "{searchTerm}"
              </div>
            ) : engineers.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-500 text-center">
                No technicians available
              </div>
            ) : filteredEngineers.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-500 text-center">
                No engineers found
              </div>
            ) : (
              <>
                <button
                  onClick={() => handleSelect(null)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">Unassigned</span>
                </button>
                <div className="border-t border-slate-100" />
                {filteredEngineers.map((engineer) => (
                  <button
                    key={engineer.id}
                    onClick={() => handleSelect(engineer.id)}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors flex items-center gap-2 ${
                      value === engineer.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-slate-900 flex-1 truncate">{engineer.full_name}</span>
                    {engineer.case_access_level === 'restricted' && (
                      <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded flex-shrink-0">
                        Restricted
                      </span>
                    )}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
