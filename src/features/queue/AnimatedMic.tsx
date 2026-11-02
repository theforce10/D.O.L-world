import { Music2, Music4 } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'

const notes = [
  { Icon: Music2, x: -70, delay: 0, color: 'text-flame' },
  { Icon: Music4, x: 64, delay: 1.1, color: 'text-gold' },
  { Icon: Music2, x: 30, delay: 2.2, color: 'text-ember' },
]

export function AnimatedMic() {
  const reduce = useReducedMotion()

  return (
    <div aria-hidden className="relative mx-auto grid size-56 place-items-center sm:size-64">
      {!reduce &&
        [0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute size-32 rounded-full border-2 border-flame/50"
            initial={{ scale: 0.8, opacity: 0.7 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8, ease: 'easeOut' }}
          />
        ))}

      {!reduce &&
        notes.map(({ Icon, x, delay, color }, i) => (
          <motion.span
            key={i}
            className={`absolute ${color}`}
            initial={{ x, y: 20, opacity: 0, rotate: -10 }}
            animate={{ y: -110, opacity: [0, 1, 0], rotate: 15 }}
            transition={{ duration: 3.3, repeat: Infinity, delay, ease: 'easeOut' }}
          >
            <Icon className="size-7" />
          </motion.span>
        ))}

      <motion.svg
        viewBox="0 0 120 160"
        className="relative w-28 drop-shadow-[0_0_24px_rgb(255_61_46/0.55)] sm:w-32"
        initial={{ scale: 0.4, opacity: 0, rotate: -20 }}
        animate={reduce ? { scale: 1, opacity: 1, rotate: 0 } : { scale: 1, opacity: 1, rotate: [-6, 6, -6] }}
        transition={
          reduce
            ? { duration: 0.3 }
            : {
                scale: { type: 'spring', stiffness: 200, damping: 12 },
                opacity: { duration: 0.3 },
                rotate: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
              }
        }
        style={{ originY: 0.9 }}
      >
        <defs>
          <linearGradient id="mic-head" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff3d2e" />
            <stop offset="0.55" stopColor="#ff7a1a" />
            <stop offset="1" stopColor="#ffc72c" />
          </linearGradient>
          <pattern id="mic-mesh" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="4" r="1.4" fill="rgb(18 5 5 / 0.35)" />
          </pattern>
        </defs>
        <circle cx="60" cy="42" r="38" fill="url(#mic-head)" />
        <circle cx="60" cy="42" r="38" fill="url(#mic-mesh)" />
        <rect x="22" y="58" width="76" height="10" rx="5" fill="#250e0b" opacity="0.7" />
        <path d="M44 80h32l-6 72a6 6 0 0 1-6 6h-8a6 6 0 0 1-6-6z" fill="#3a1611" stroke="#ff8a6e" strokeWidth="2" />
        <rect x="40" y="76" width="40" height="10" rx="4" fill="#52201a" />
        <circle cx="60" cy="110" r="3.5" fill="#ffc72c" />
      </motion.svg>
    </div>
  )
}
