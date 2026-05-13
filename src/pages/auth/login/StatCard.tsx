import { motion, useReducedMotion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  value: string;
  label: string;
  delay?: number;
}

export const StatCard = ({ icon: Icon, value, label, delay = 0 }: StatCardProps) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-center"
    >
      <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-primary/15 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="font-display text-2xl text-white mb-1">{value}</div>
      <div className="text-xs text-slate-400 font-body">{label}</div>
    </motion.div>
  );
};
