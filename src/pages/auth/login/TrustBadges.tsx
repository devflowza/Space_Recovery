import { motion, useReducedMotion } from 'framer-motion';
import { Lock, Server, Globe } from 'lucide-react';

const badges = [
  { icon: Lock, label: '256-bit Encryption' },
  { icon: Server, label: 'SOC 2 Compliant' },
  { icon: Globe, label: 'GDPR Ready' },
];

export const TrustBadges = () => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 1.0 }}
      className="flex flex-wrap items-center gap-6"
    >
      {badges.map(({ icon: Icon, label }) => (
        <span key={label} className="flex items-center gap-2 text-slate-500 text-sm">
          <Icon size={14} />
          {label}
        </span>
      ))}
    </motion.div>
  );
};
