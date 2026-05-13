import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';

export interface PhoneCountry {
  id: string;
  name: string;
  code: string;
  phone_code: string | null;
}

interface PhoneInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  countries: PhoneCountry[];
  selectedCountryId?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  required?: boolean;
}

function findPhoneCodeForCountry(countries: PhoneCountry[], countryId: string): string {
  const country = countries.find((c) => c.id === countryId);
  return country?.phone_code || '';
}

function parsePhoneValue(
  value: string,
  countries: PhoneCountry[]
): { dialCode: string; localNumber: string } {
  if (!value || !value.startsWith('+')) {
    return { dialCode: '', localNumber: value || '' };
  }

  const sortedCodes = countries
    .filter((c) => c.phone_code)
    .map((c) => c.phone_code!)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => b.length - a.length);

  for (const code of sortedCodes) {
    if (value.startsWith(code)) {
      const rest = value.slice(code.length).replace(/^\s+/, '');
      return { dialCode: code, localNumber: rest };
    }
  }

  return { dialCode: '', localNumber: value };
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  label,
  value,
  onChange,
  countries,
  selectedCountryId,
  placeholder = '',
  disabled = false,
  error,
  required = false,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [manualDialCode, setManualDialCode] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const portalDropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyles, setDropdownStyles] = useState<React.CSSProperties>({});

  const parsed = parsePhoneValue(value, countries);

  const activeDialCode = (() => {
    if (manualDialCode !== null) return manualDialCode;
    if (parsed.dialCode) return parsed.dialCode;
    if (selectedCountryId) return findPhoneCodeForCountry(countries, selectedCountryId);
    return '';
  })();

  const localNumber = parsed.dialCode ? parsed.localNumber : (value?.startsWith('+') ? '' : value || '');

  const prevCountryIdRef = useRef(selectedCountryId);
  useEffect(() => {
    if (selectedCountryId && selectedCountryId !== prevCountryIdRef.current) {
      setManualDialCode(null);
    }
    prevCountryIdRef.current = selectedCountryId;
  }, [selectedCountryId]);

  const buildFullValue = useCallback(
    (dialCode: string, local: string) => {
      if (!dialCode && !local) return '';
      if (!dialCode) return local;
      if (!local) return dialCode;
      return `${dialCode} ${local}`;
    },
    []
  );

  const handleLocalNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLocal = e.target.value;
    onChange(buildFullValue(activeDialCode, newLocal));
  };

  const handleDialCodeSelect = (phoneCode: string) => {
    setManualDialCode(phoneCode);
    onChange(buildFullValue(phoneCode, localNumber));
    setIsDropdownOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const uniqueCountries = countries.filter((c) => c.phone_code);

  const filteredCountries = uniqueCountries.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.code.toLowerCase().includes(term) ||
      (c.phone_code && c.phone_code.includes(term))
    );
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideContainer = containerRef.current?.contains(target);
      const isInsidePortal = portalDropdownRef.current?.contains(target);
      if (!isInsideContainer && !isInsidePortal) {
        setIsDropdownOpen(false);
        setSearchTerm('');
      }
    };

    const calculatePosition = () => {
      if (!containerRef.current) return;
      const triggerEl = containerRef.current.querySelector('[data-phone-trigger]');
      if (!triggerEl) return;
      const rect = triggerEl.getBoundingClientRect();
      const dropdownHeight = 300;
      const spaceBelow = window.innerHeight - rect.bottom;

      const styles: React.CSSProperties = {
        position: 'fixed',
        width: '260px',
        left: `${rect.left}px`,
        zIndex: 9999,
      };

      if (spaceBelow < dropdownHeight && rect.top > spaceBelow) {
        styles.bottom = `${window.innerHeight - rect.top}px`;
      } else {
        styles.top = `${rect.bottom + 4}px`;
      }

      setDropdownStyles(styles);
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      calculatePosition();
      window.addEventListener('scroll', calculatePosition, true);
      window.addEventListener('resize', calculatePosition);
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', calculatePosition, true);
      window.removeEventListener('resize', calculatePosition);
    };
  }, [isDropdownOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isDropdownOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredCountries.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredCountries[highlightedIndex]) {
          handleDialCodeSelect(filteredCountries[highlightedIndex].phone_code!);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsDropdownOpen(false);
        setSearchTerm('');
        break;
    }
  };

  useEffect(() => {
    if (isDropdownOpen && highlightedIndex >= 0 && dropdownRef.current) {
      const el = dropdownRef.current.children[highlightedIndex] as HTMLElement;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isDropdownOpen]);

  const selectedCountryForDisplay = activeDialCode
    ? uniqueCountries.find((c) => c.phone_code === activeDialCode)
    : null;

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </label>
      )}
      <div
        className={`flex border rounded-md overflow-hidden transition-all ${
          error
            ? 'border-danger'
            : isDropdownOpen
            ? 'border-primary ring-2 ring-primary ring-opacity-20'
            : 'border-slate-300 hover:border-slate-400'
        } ${disabled ? 'bg-slate-100 cursor-not-allowed' : ''}`}
      >
        <button
          type="button"
          data-phone-trigger
          disabled={disabled}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`flex items-center gap-1 px-2.5 py-2 bg-slate-50 border-r border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors shrink-0 ${
            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
          }`}
        >
          {selectedCountryForDisplay && (
            <span className="text-xs text-slate-500 font-normal">
              {selectedCountryForDisplay.code}
            </span>
          )}
          <span>{activeDialCode || '+?'}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
              isDropdownOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        <input
          type="tel"
          value={localNumber}
          onChange={handleLocalNumberChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`flex-1 px-3 py-2 text-sm focus:outline-none bg-white min-w-0 ${
            disabled ? 'bg-slate-100 cursor-not-allowed' : ''
          }`}
        />
      </div>

      {error && <p className="mt-1 text-sm text-danger">{error}</p>}

      {isDropdownOpen &&
        createPortal(
          <div
            ref={portalDropdownRef}
            className="bg-white border border-slate-300 rounded-lg shadow-lg overflow-hidden"
            style={dropdownStyles}
          >
            <div className="p-2 border-b border-slate-200">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Search country or code..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setHighlightedIndex(-1);
                  }}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>

            <div
              ref={dropdownRef}
              className="max-h-60 overflow-y-auto"
              style={{ scrollbarWidth: 'thin' }}
            >
              {filteredCountries.length === 0 ? (
                <div className="px-3 py-6 text-center text-slate-500 text-sm">
                  No countries found
                </div>
              ) : (
                filteredCountries.map((country, index) => (
                  <div
                    key={`${country.id}-${country.phone_code}`}
                    className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors text-sm ${
                      highlightedIndex === index
                        ? 'bg-primary/5 text-primary'
                        : country.phone_code === activeDialCode
                        ? 'bg-primary/10 text-primary'
                        : 'text-slate-900 hover:bg-slate-50'
                    }`}
                    onClick={() => handleDialCodeSelect(country.phone_code!)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-6">{country.code}</span>
                      <span>{country.name}</span>
                    </span>
                    <span className="text-slate-500 font-medium">{country.phone_code}</span>
                  </div>
                ))
              )}
            </div>

            {filteredCountries.length > 0 && (
              <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 text-center">
                {filteredCountries.length} {filteredCountries.length === 1 ? 'country' : 'countries'}
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};
