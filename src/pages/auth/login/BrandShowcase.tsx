import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Fingerprint, Layers, Users, FileCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const CAPABILITIES: { key: string; icon: LucideIcon }[] = [
  { key: 'custody', icon: Fingerprint },
  { key: 'raid', icon: Layers },
  { key: 'portal', icon: Users },
  { key: 'reporting', icon: FileCheck },
];

export const BrandShowcase = () => {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();

  const enter = (delay: number) => ({
    initial: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 },
    animate: shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay },
  });

  return (
    <div className="max-w-xl">
      <motion.div {...enter(0.05)}>
        <h1 className="font-display-auth text-5xl xl:text-6xl font-bold text-white leading-[1.08] tracking-tight whitespace-pre-line">
          {t('auth.headline')}
        </h1>
        <div aria-hidden="true" className="mt-6 h-1 w-24 rounded-full bg-gradient-to-r from-sky-400 to-sky-400/0" />
        <p className="text-slate-400 mt-6 text-lg leading-relaxed max-w-md">
          {t('auth.subheadline')}
        </p>
      </motion.div>

      <ul className="mt-10 space-y-4">
        {CAPABILITIES.map(({ key, icon: Icon }, i) => (
          <motion.li key={key} {...enter(0.25 + i * 0.08)} className="flex items-center gap-3.5">
            <span className="w-9 h-9 rounded-lg bg-white/[0.06] ring-1 ring-white/10 flex items-center justify-center flex-shrink-0">
              <Icon className="w-[18px] h-[18px] text-sky-300" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <span className="text-slate-300 text-sm">{t(`auth.capability.${key}`)}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
};
