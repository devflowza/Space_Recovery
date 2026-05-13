import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, X } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import type { OnboardingFormData } from '../constants';

interface WelcomeStepProps {
  formData: OnboardingFormData;
  errors: Record<string, string>;
  slugAvailable: boolean | null;
  slugChecking: boolean;
  updateField: <K extends keyof OnboardingFormData>(key: K, value: OnboardingFormData[K]) => void;
  checkSlugAvailability: (slug: string) => void;
  onNext: () => void;
}

export const WelcomeStep = ({
  formData,
  errors,
  slugAvailable,
  slugChecking,
  updateField,
  checkSlugAvailability,
  onNext,
}: WelcomeStepProps) => {
  const handleCompanyNameChange = (value: string) => {
    updateField('companyName', value);
    const slug = value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    updateField('slug', slug);
    checkSlugAvailability(slug);
  };

  const handleSlugChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    updateField('slug', cleaned);
    checkSlugAvailability(cleaned);
  };

  useEffect(() => {
    if (formData.slug && formData.slug.length >= 3) {
      checkSlugAvailability(formData.slug);
    }
  }, []);

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <label className="block text-sm font-medium text-slate-300 font-body mb-2">
          Company Name <span className="text-primary">*</span>
        </label>
        <input
          type="text"
          value={formData.companyName}
          onChange={e => handleCompanyNameChange(e.target.value)}
          placeholder="ACME Data Recovery"
          className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 font-body text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
          autoFocus
        />
        {errors.companyName && (
          <p className="text-danger text-xs mt-1 font-body">{errors.companyName}</p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <label className="block text-sm font-medium text-slate-300 font-body mb-2">
          Workspace URL <span className="text-primary">*</span>
        </label>
        <div className="flex items-center gap-0">
          <input
            type="text"
            value={formData.slug}
            onChange={e => handleSlugChange(e.target.value)}
            placeholder="acme-data-recovery"
            className="flex-1 bg-slate-800/50 border border-slate-700 rounded-l-xl px-4 py-3 text-white placeholder-slate-600 font-body text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
          />
          <div className="bg-slate-800 border border-l-0 border-slate-700 rounded-r-xl px-3 py-3 text-slate-500 text-sm font-body">
            .xsuite.space
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2 h-5">
          {slugChecking && (
            <span className="flex items-center gap-1.5 text-xs text-slate-500 font-body">
              <Loader2 className="w-3 h-3 animate-spin" /> Checking availability...
            </span>
          )}
          {!slugChecking && slugAvailable === true && formData.slug.length >= 3 && (
            <motion.span
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-1.5 text-xs text-success font-body"
            >
              <Check className="w-3 h-3" /> Available
            </motion.span>
          )}
          {!slugChecking && slugAvailable === false && (
            <motion.span
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-1.5 text-xs text-danger font-body"
            >
              <X className="w-3 h-3" /> Already taken
            </motion.span>
          )}
        </div>
        {errors.slug && (
          <p className="text-danger text-xs mt-1 font-body">{errors.slug}</p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="pt-2"
      >
        <Button
          onClick={onNext}
          disabled={!formData.companyName || !formData.slug || slugChecking || slugAvailable === false}
          className="w-full !bg-primary hover:!bg-primary/90 !text-primary-foreground !rounded-xl !py-3 !font-body disabled:!opacity-40"
        >
          Continue
        </Button>
      </motion.div>
    </div>
  );
};
