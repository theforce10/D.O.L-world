import type { LucideIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

export interface BarAction {
  id: string
  label: string
  Icon: LucideIcon
  onClick: () => void
  disabled?: boolean
  /** Pulsing dot, e.g. a poll is open. */
  attention?: boolean
}

export function BottomActionBar({ actions }: { actions: BarAction[] }) {
  return (
    <motion.nav
      aria-label="Quick actions"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.3 }}
      className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div
        className="mx-auto grid max-w-md gap-1 rounded-3xl border border-white/10 bg-night-800/90 p-1.5 shadow-card backdrop-blur-xl"
        style={{ gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))` }}
      >
        {actions.map(({ id, label, Icon, onClick, disabled, attention }) => (
          <motion.button
            key={id}
            type="button"
            onClick={onClick}
            disabled={disabled}
            whileTap={disabled ? undefined : { scale: 0.92 }}
            className={cn(
              'relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-xs font-semibold transition-colors disabled:opacity-40',
              attention ? 'bg-accent/15 text-ink' : 'text-ink-muted hover:bg-white/5 hover:text-ink',
            )}
          >
            <span className="relative">
              <Icon aria-hidden className={cn('size-5', attention && 'text-accent')} />
              {attention && (
                <span className="absolute -right-1.5 -top-1 flex size-2.5">
                  <span className="absolute inline-flex size-full rounded-full bg-accent opacity-75 motion-safe:animate-ping" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-accent" />
                </span>
              )}
            </span>
            {label}
          </motion.button>
        ))}
      </div>
    </motion.nav>
  )
}
