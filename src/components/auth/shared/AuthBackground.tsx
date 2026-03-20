import { useReducedMotion, motion } from 'framer-motion';

const PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  x: `${10 + (i * 12) % 80}%`,
  y: `${5 + (i * 17) % 85}%`,
  size: 2 + (i % 3),
  delay: i * 0.8,
  duration: 5 + (i % 4) * 2,
}));

export const AuthBackground = () => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.04]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="circuit" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M30 0v15M30 45v15M0 30h15M45 30h60" stroke="currentColor" strokeWidth="0.5" fill="none" className="text-blue-400" />
            <circle cx="30" cy="30" r="2" fill="currentColor" className="text-blue-400" />
            <circle cx="30" cy="15" r="1" fill="currentColor" className="text-blue-500" />
            <circle cx="30" cy="45" r="1" fill="currentColor" className="text-blue-500" />
            <circle cx="15" cy="30" r="1" fill="currentColor" className="text-blue-500" />
            <circle cx="45" cy="30" r="1" fill="currentColor" className="text-blue-500" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#circuit)" />
      </svg>

      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/60" />

      {!shouldReduceMotion && PARTICLES.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-blue-400"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}

      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-500/5 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-blue-600/5 blur-3xl" />
    </div>
  );
};
