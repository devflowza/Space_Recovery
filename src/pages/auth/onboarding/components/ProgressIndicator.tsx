import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { STEPS } from '../constants';

interface ProgressIndicatorProps {
  currentStep: number;
}

export const ProgressIndicator = ({ currentStep }: ProgressIndicatorProps) => {
  return (
    <div className="flex items-center justify-center gap-0">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const isCompleted = i < currentStep;
        const isCurrent = i === currentStep;

        return (
          <div key={s.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <motion.div
                className={`relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors duration-300 ${
                  isCompleted
                    ? 'bg-emerald-500/20 border-emerald-500'
                    : isCurrent
                    ? 'bg-blue-500/20 border-blue-500'
                    : 'bg-slate-800/50 border-slate-700'
                }`}
                animate={isCurrent ? {
                  boxShadow: ['0 0 0px rgba(59,130,246,0.3)', '0 0 20px rgba(59,130,246,0.3)', '0 0 0px rgba(59,130,246,0.3)'],
                } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <Check className="w-5 h-5 text-emerald-400" />
                  </motion.div>
                ) : (
                  <Icon className={`w-5 h-5 ${isCurrent ? 'text-blue-400' : 'text-slate-500'}`} />
                )}
              </motion.div>
              <span className={`hidden sm:block text-xs mt-2 font-body transition-colors duration-300 ${
                isCurrent ? 'text-blue-400 font-medium' : isCompleted ? 'text-emerald-400/70' : 'text-slate-600'
              }`}>
                {s.id.charAt(0).toUpperCase() + s.id.slice(1)}
              </span>
            </div>

            {i < STEPS.length - 1 && (
              <div className="relative w-12 sm:w-20 h-0.5 mx-1 sm:mx-2 bg-slate-800 overflow-hidden rounded-full">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: i < currentStep ? '100%' : '0%' }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
