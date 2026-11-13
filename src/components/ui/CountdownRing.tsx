import { motion } from 'motion/react'
import { formatClock, type Countdown } from '@/lib/serverClock'
import { cn } from '@/lib/utils'

const RADIUS = 44
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function CountdownRing({
  countdown,
  className,
  labelClassName,
}: {
  countdown: Countdown
  className?: string
  labelClassName?: string
}) {
  const progress = countdown.remainingMs / countdown.totalMs
  const urgent = !countdown.done && countdown.remainingMs <= 30_000

  return (
    <div
      role="timer"
      aria-label={countdown.done ? "Time's up" : `${formatClock(countdown.remainingMs)} left`}
      className={cn('relative grid size-20 shrink-0 place-items-center', className)}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="8" className="stroke-white/10" />
        <motion.circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className="stroke-accent"
          strokeDasharray={CIRCUMFERENCE}
          animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - progress) }}
          transition={{ duration: 0.25, ease: 'linear' }}
        />
      </svg>
      <motion.span
        aria-hidden
        animate={urgent ? { scale: [1, 1.12, 1] } : { scale: 1 }}
        transition={urgent ? { duration: 1, repeat: Infinity } : undefined}
        className={cn(
          'font-display text-base font-bold tabular-nums',
          countdown.done ? 'text-ink-subtle' : urgent ? 'text-accent' : 'text-ink',
          labelClassName,
        )}
      >
        {formatClock(countdown.remainingMs)}
      </motion.span>
    </div>
  )
}
