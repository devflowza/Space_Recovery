import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface PasswordStrengthProps {
  password: string;
}

const REQUIREMENTS = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
];

function getStrength(password: string): { level: number; label: string; color: string } {
  if (!password) return { level: 0, label: '', color: '' };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { level: 1, label: 'Weak', color: 'bg-red-500' };
  if (score <= 4) return { level: 2, label: 'Medium', color: 'bg-amber-500' };
  return { level: 3, label: 'Strong', color: 'bg-emerald-500' };
}

export const PasswordStrength = ({ password }: PasswordStrengthProps) => {
  const strength = getStrength(password);

  if (!password) return null;

  return (
    <div className="mt-3 space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-500 font-body">Strength</span>
          <span className={`text-xs font-medium font-body ${
            strength.level === 1 ? 'text-red-400' :
            strength.level === 2 ? 'text-amber-400' :
            'text-emerald-400'
          }`}>
            {strength.label}
          </span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3].map(seg => (
            <div key={seg} className="flex-1 h-1 rounded-full bg-slate-800 overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${seg <= strength.level ? strength.color : ''}`}
                initial={{ width: '0%' }}
                animate={{ width: seg <= strength.level ? '100%' : '0%' }}
                transition={{ duration: 0.3 }}
              />
            </div>
          ))}
        </div>
      </div>

      <ul className="space-y-1.5">
        {REQUIREMENTS.map(req => {
          const met = req.test(password);
          return (
            <li key={req.label} className="flex items-center gap-2 text-xs font-body">
              <motion.div
                initial={false}
                animate={{ scale: met ? [1.3, 1] : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              >
                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                  met ? 'bg-emerald-500/20' : 'bg-slate-800'
                }`}>
                  <Check className={`w-2.5 h-2.5 ${met ? 'text-emerald-400' : 'text-slate-600'}`} />
                </div>
              </motion.div>
              <span className={met ? 'text-slate-300' : 'text-slate-600'}>{req.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
