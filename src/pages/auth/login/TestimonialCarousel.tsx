import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Quote } from 'lucide-react';
import { testimonials } from '../../../components/auth/shared/constants';

export const TestimonialCarousel = () => {
  const shouldReduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const advance = useCallback(() => {
    setActiveIndex(prev => (prev + 1) % testimonials.length);
  }, []);

  useEffect(() => {
    if (shouldReduceMotion || isPaused) return;
    const timer = setInterval(advance, 5000);
    return () => clearInterval(timer);
  }, [advance, isPaused, shouldReduceMotion]);

  const current = testimonials[activeIndex];

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.8 }}
      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <Quote className="w-5 h-5 text-blue-400/60 mb-3" />

      <div className="min-h-[100px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-slate-300 text-sm italic leading-relaxed mb-4">
              &ldquo;{current.quote}&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-medium">
                {current.author.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div className="text-sm font-medium text-white">{current.author}</div>
                <div className="text-xs text-slate-500">
                  {current.role}, {current.company}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-2 mt-4">
        {testimonials.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              i === activeIndex ? 'bg-blue-400 w-4' : 'bg-slate-600 hover:bg-slate-500'
            }`}
            aria-label={`Show testimonial ${i + 1}`}
          />
        ))}
      </div>
    </motion.div>
  );
};
