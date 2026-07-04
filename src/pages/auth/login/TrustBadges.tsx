import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Lock, Server, Globe } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const BADGES: { key: string; icon: LucideIcon }[] = [
  { key: 'encryption', icon: Lock },
  { key: 'soc2', icon: Server },
  { key: 'gdpr', icon: Globe },
];

export const TrustBadges = () => {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.7 }}
      className="flex flex-wrap items-center gap-2.5"
    >
      {BADGES.map(({ key, icon: Icon }) => (
        <span
          key={key}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-slate-400 text-xs"
        >
          <Icon size={13} aria-hidden="true" />
          {t(`auth.trust.${key}`)}
        </span>
      ))}
    </motion.div>
  );
};
