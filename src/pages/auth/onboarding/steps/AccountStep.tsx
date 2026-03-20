import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { PasswordStrength } from '../components/PasswordStrength';
import type { OnboardingFormData } from '../constants';

interface AccountStepProps {
  formData: OnboardingFormData;
  errors: Record<string, string>;
  updateField: <K extends keyof OnboardingFormData>(key: K, value: OnboardingFormData[K]) => void;
  onNext: () => void;
  onBack: () => void;
}

export const AccountStep = ({
  formData,
  errors,
  updateField,
  onNext,
  onBack,
}: AccountStepProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const inputClasses = (hasError: boolean) =>
    `w-full bg-slate-800/50 border ${hasError ? 'border-red-500/60' : 'border-slate-700'} rounded-xl px-4 py-3 text-white placeholder-slate-600 font-body text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all`;

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <label className="block text-sm font-medium text-slate-300 font-body mb-2">
          Full Name <span className="text-blue-400">*</span>
        </label>
        <input
          type="text"
          value={formData.fullName}
          onChange={e => updateField('fullName', e.target.value)}
          placeholder="John Doe"
          className={inputClasses(!!errors.fullName)}
        />
        {errors.fullName && <p className="text-red-400 text-xs mt-1 font-body">{errors.fullName}</p>}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <label className="block text-sm font-medium text-slate-300 font-body mb-2">
          Email Address <span className="text-blue-400">*</span>
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={e => updateField('email', e.target.value)}
          placeholder="john@acme.com"
          className={inputClasses(!!errors.email)}
        />
        {errors.email && <p className="text-red-400 text-xs mt-1 font-body">{errors.email}</p>}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <label className="block text-sm font-medium text-slate-300 font-body mb-2">
          Password <span className="text-blue-400">*</span>
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={e => updateField('password', e.target.value)}
            placeholder="Create a strong password"
            className={`${inputClasses(!!errors.password)} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && <p className="text-red-400 text-xs mt-1 font-body">{errors.password}</p>}
        <PasswordStrength password={formData.password} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <label className="block text-sm font-medium text-slate-300 font-body mb-2">
          Confirm Password <span className="text-blue-400">*</span>
        </label>
        <div className="relative">
          <input
            type={showConfirm ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={e => updateField('confirmPassword', e.target.value)}
            placeholder="Confirm your password"
            className={`${inputClasses(!!errors.confirmPassword)} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
          >
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.confirmPassword && <p className="text-red-400 text-xs mt-1 font-body">{errors.confirmPassword}</p>}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-2 pt-1"
      >
        <Lock className="w-3.5 h-3.5 text-slate-600" />
        <span className="text-xs text-slate-600 font-body">256-bit encryption &middot; GDPR compliant</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="flex gap-3 pt-2"
      >
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 font-body text-sm hover:border-slate-600 hover:text-slate-300 transition-all"
        >
          Back
        </button>
        <Button
          onClick={onNext}
          className="flex-1 !bg-blue-600 hover:!bg-blue-500 !text-white !rounded-xl !py-3 !font-body disabled:!opacity-40"
        >
          Continue
        </Button>
      </motion.div>
    </div>
  );
};
