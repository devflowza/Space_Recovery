import { motion, useReducedMotion } from 'framer-motion';
import { HardDrive, Shield, Users } from 'lucide-react';
import { StatCard } from './StatCard';
import { TestimonialCarousel } from './TestimonialCarousel';
import { TrustBadges } from './TrustBadges';

export const BrandShowcase = () => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="space-y-10 max-w-xl">
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -30 }}
        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <h1 className="font-display text-4xl xl:text-5xl text-white leading-tight">
          Data Recovery,
          <br />
          <span className="text-primary">Simplified.</span>
        </h1>
        <p className="text-slate-400 mt-4 text-lg font-body leading-relaxed">
          The complete lab management platform trusted by recovery professionals worldwide.
        </p>
      </motion.div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={HardDrive} value="50K+" label="Cases Managed" delay={0.4} />
        <StatCard icon={Shield} value="99.9%" label="Uptime" delay={0.5} />
        <StatCard icon={Users} value="200+" label="Labs Trust Us" delay={0.6} />
      </div>

      <div className="hidden xl:block">
        <TestimonialCarousel />
      </div>

      <TrustBadges />
    </div>
  );
};
