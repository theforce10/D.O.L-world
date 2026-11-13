import { Check, Crown } from 'lucide-react'
import { motion } from 'motion/react'
import { CountUp } from '@/components/ui/CountUp'
import { cn } from '@/lib/utils'
import type { PollResult } from './api'

interface ResultBarsProps {
  results: PollResult[]
  myOptionId?: string | null
  size?: 'md' | 'xl'
  /** Tighter rows on the big screen when something else shares the column. */
  dense?: boolean
  className?: string
}

export function ResultBars({ results, myOptionId, size = 'md', dense = false, className }: ResultBarsProps) {
  const top = Math.max(0, ...results.map((r) => r.votes))
  const xl = size === 'xl'

  return (
    <motion.ul
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.07 } } }}
      className={cn(xl ? (dense ? 'space-y-[0.8vh]' : 'space-y-[2.2vh]') : 'space-y-2', className)}
    >
      {results.map((r) => {
        const mine = r.option_id === myOptionId
        const leading = top > 0 && r.votes === top
        return (
          <motion.li
            key={r.option_id}
            layout
            variants={{ hidden: { opacity: 0, x: -16 }, show: { opacity: 1, x: 0 } }}
            className={cn(
              'relative overflow-hidden border',
              xl ? 'rounded-[1.4vw] border-white/10 bg-white/[0.04]' : 'rounded-2xl border-white/10 bg-night-800/70',
              mine && 'border-accent/70',
            )}
          >
            <motion.div
              aria-hidden
              className={cn('absolute inset-y-0 left-0', leading ? 'bg-accent/35' : 'bg-white/10')}
              initial={{ width: 0 }}
              animate={{ width: `${r.percent}%` }}
              transition={{ type: 'spring', stiffness: 90, damping: 18 }}
            />
            <div
              className={cn(
                'relative flex items-center justify-between',
                xl ? (dense ? 'gap-[1.6vw] px-[1.6vw] py-[0.9vh]' : 'gap-[2vw] px-[2vw] py-[2.4vh]') : 'min-h-12 gap-3 px-4 py-2.5',
              )}
            >
              <span
                className={cn(
                  'flex min-w-0 items-center gap-2 font-semibold',
                  // On phones the "You" chip wraps under a long option instead of squeezing it.
                  !xl && 'flex-wrap gap-y-1',
                  xl && (dense ? 'gap-[1vw] text-[1.6vw] leading-tight' : 'gap-[1vw] text-[2.6vw] leading-tight'),
                )}
              >
                {leading && xl && <Crown aria-hidden className="size-[2.4vw] shrink-0 text-accent" />}
                <span className={cn('min-w-0 break-words', xl && 'line-clamp-3')}>{r.label}</span>
                {mine && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-night-950"
                  >
                    <Check aria-hidden className="size-3" strokeWidth={3} /> You
                  </motion.span>
                )}
              </span>
              <span
                className={cn(
                  'shrink-0 font-display font-bold tabular-nums',
                  xl ? (dense ? 'text-[1.9vw]' : 'text-[3vw]') : 'text-lg',
                  leading && 'text-accent-soft',
                )}
              >
                <CountUp value={r.percent} duration={0.8} />%
              </span>
            </div>
          </motion.li>
        )
      })}
    </motion.ul>
  )
}
