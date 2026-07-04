import { motion, useReducedMotion } from 'framer-motion';

interface RecoveryMotifProps {
  /** Rendered square size in px. */
  size?: number;
  className?: string;
}

// r=178 / 148 / 116 circumferences — dash patterns chosen to tile ~evenly.
const C_OUTER = 2 * Math.PI * 178;
const C_MID = 2 * Math.PI * 148;
const C_TICKS = 2 * Math.PI * 116;

/**
 * The recovery instrument: a stylized drive platter — concentric sector rings
 * drifting at different speeds with a brighter scanning arc, evoking a
 * read-head pass. Purely decorative (aria-hidden); animation is
 * stroke-dashoffset/opacity only and fully disabled under reduced motion.
 */
export const RecoveryMotif = ({ size = 560, className = '' }: RecoveryMotifProps) => {
  const shouldReduceMotion = useReducedMotion();

  const spin = (circumference: number, duration: number, reverse = false) =>
    shouldReduceMotion
      ? {}
      : {
          animate: { strokeDashoffset: reverse ? circumference : -circumference },
          transition: { duration, repeat: Infinity, ease: 'linear' as const },
        };

  return (
    <svg
      viewBox="0 0 400 400"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* Outer rim */}
      <circle cx="200" cy="200" r="192" fill="none" stroke="rgb(148 163 184 / 0.14)" strokeWidth="1" />

      {/* Slow sector ring, clockwise */}
      <motion.circle
        cx="200" cy="200" r="178"
        fill="none"
        stroke="rgb(96 165 250 / 0.28)"
        strokeWidth="1.5"
        strokeDasharray="80 32"
        strokeLinecap="round"
        {...spin(C_OUTER, 120)}
      />

      {/* Scanning arc — the read-head pass */}
      <motion.circle
        cx="200" cy="200" r="178"
        fill="none"
        stroke="rgb(56 189 248 / 0.75)"
        strokeWidth="2.5"
        strokeDasharray={`${C_OUTER * 0.12} ${C_OUTER * 0.88}`}
        strokeLinecap="round"
        {...spin(C_OUTER, 9)}
      />

      {/* Mid sector ring, counter-clockwise */}
      <motion.circle
        cx="200" cy="200" r="148"
        fill="none"
        stroke="rgb(148 163 184 / 0.2)"
        strokeWidth="1"
        strokeDasharray="46 22"
        {...spin(C_MID, 90, true)}
      />

      {/* Fine tick ring — sector address marks */}
      <motion.circle
        cx="200" cy="200" r="116"
        fill="none"
        stroke="rgb(96 165 250 / 0.22)"
        strokeWidth="6"
        strokeDasharray="1.5 10.6"
        {...spin(C_TICKS, 160)}
      />

      {/* Inner platter + spindle */}
      <circle cx="200" cy="200" r="84" fill="none" stroke="rgb(148 163 184 / 0.12)" strokeWidth="1" />
      <circle cx="200" cy="200" r="40" fill="rgb(30 58 138 / 0.15)" stroke="rgb(96 165 250 / 0.2)" strokeWidth="1" />
      <circle cx="200" cy="200" r="7" fill="rgb(56 189 248 / 0.55)" />
      {!shouldReduceMotion && (
        <motion.circle
          cx="200" cy="200" r="7"
          fill="none"
          stroke="rgb(56 189 248 / 0.5)"
          strokeWidth="1.5"
          animate={{ opacity: [0.6, 0.15, 0.6] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </svg>
  );
};
