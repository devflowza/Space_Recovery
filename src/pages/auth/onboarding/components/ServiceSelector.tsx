import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { SERVICE_OPTIONS } from '../constants';

interface ServiceSelectorProps {
  selected: string[];
  onChange: (services: string[]) => void;
}

export const ServiceSelector = ({ selected, onChange }: ServiceSelectorProps) => {
  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter(s => s !== id)
        : [...selected, id]
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {SERVICE_OPTIONS.map((service, i) => {
        const isSelected = selected.includes(service.id);
        const Icon = service.icon;

        return (
          <motion.button
            key={service.id}
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => toggle(service.id)}
            className={`relative flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-200 ${
              isSelected
                ? 'border-blue-500/60 bg-blue-500/10'
                : 'border-slate-700/60 bg-slate-800/30 hover:border-slate-600'
            }`}
          >
            <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
              isSelected ? 'bg-blue-500/20' : 'bg-slate-800'
            }`}>
              <Icon className={`w-4.5 h-4.5 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium font-body ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                {service.label}
              </p>
              <p className="text-xs text-slate-500 font-body mt-0.5">{service.description}</p>
            </div>
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center"
              >
                <Check className="w-3 h-3 text-white" />
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};
