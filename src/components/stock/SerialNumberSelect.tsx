import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { getAvailableSerialNumbers } from '../../lib/stockService';
import { stockKeys } from '../../lib/queryKeys';

interface SerialNumberSelectProps {
  itemId: string;
  value: string | null;
  onChange: (value: string | null) => void;
  disabled: boolean;
}

export const SerialNumberSelect: React.FC<SerialNumberSelectProps> = ({
  itemId,
  value,
  onChange,
  disabled,
}) => {
  const { data: serials = [], isLoading } = useQuery({
    queryKey: stockKeys.serialNumbers(itemId),
    queryFn: () => getAvailableSerialNumbers(itemId),
    enabled: !!itemId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-md bg-slate-50 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading serials...</span>
      </div>
    );
  }

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={disabled || serials.length === 0}
      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-slate-100 disabled:cursor-not-allowed text-sm"
    >
      <option value="">Select serial number...</option>
      {serials.length === 0 ? (
        <option value="" disabled>
          No serials available
        </option>
      ) : (
        serials.map((serial) => (
          <option key={serial.id} value={serial.serial_number}>
            {serial.serial_number}
          </option>
        ))
      )}
    </select>
  );
};
