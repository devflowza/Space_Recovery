import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { getStockLocations } from '../../lib/stockService';
import { stockKeys } from '../../lib/queryKeys';

interface Props {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  excludeId?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

export const StockLocationSelect: React.FC<Props> = ({
  value,
  onChange,
  label,
  placeholder = 'Select location...',
  excludeId,
  required,
  className = '',
  disabled,
}) => {
  const { data: locations = [] } = useQuery({
    queryKey: stockKeys.locations(),
    queryFn: getStockLocations,
  });

  const filtered = locations.filter((l) => l.is_active && l.id !== excludeId);

  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none disabled:bg-slate-100 disabled:text-slate-400"
        >
          <option value="">{placeholder}</option>
          {filtered.map((loc) => (
            <option key={loc.id} value={loc.id}>
              [{loc.code}] {loc.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
