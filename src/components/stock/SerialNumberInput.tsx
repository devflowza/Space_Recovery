import React, { useState, KeyboardEvent, useRef } from 'react';
import { X } from 'lucide-react';

interface SerialNumberInputProps {
  value: string[];
  onChange: (serials: string[]) => void;
  maxItems?: number;
  placeholder: string;
}

export const SerialNumberInput: React.FC<SerialNumberInputProps> = ({
  value,
  onChange,
  maxItems,
  placeholder,
}) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addSerial = (serial: string) => {
    const trimmed = serial.trim();
    if (!trimmed) return;
    if (value.includes(trimmed)) return;
    if (maxItems !== undefined && value.length >= maxItems) return;
    onChange([...value, trimmed]);
    setInputValue('');
  };

  const removeSerial = (serialToRemove: string) => {
    onChange(value.filter((s) => s !== serialToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSerial(inputValue);
    } else if (e.key === ',') {
      e.preventDefault();
      addSerial(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeSerial(value[value.length - 1]);
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      addSerial(inputValue);
    }
  };

  const isAtMax = maxItems !== undefined && value.length >= maxItems;

  return (
    <div
      className="min-h-[42px] px-3 py-2 border border-slate-300 rounded-md focus-within:ring-2 focus-within:ring-primary focus-within:border-primary bg-white cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex flex-wrap gap-1.5 items-center">
        {value.map((serial, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-sm font-mono hover:bg-slate-200 transition-colors"
          >
            {serial}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeSerial(serial);
              }}
              className="hover:bg-slate-300 rounded-full p-0.5 transition-colors text-slate-500 hover:text-slate-700"
              aria-label={`Remove ${serial}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {!isAtMax && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={value.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[160px] outline-none bg-transparent text-sm text-slate-900 placeholder-slate-400"
          />
        )}
      </div>
    </div>
  );
};
