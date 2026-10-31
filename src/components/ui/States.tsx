import { CircleAlert, RotateCcw } from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './Button'
import { Spinner } from './Spinner'

export function EmptyState({
  icon,
  title,
  children,
  className,
}: {
  icon: ReactNode
  title: string
  children?: ReactNode
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex flex-col items-center gap-3 px-4 py-10 text-center', className)}
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="grid size-16 place-items-center rounded-3xl bg-night-700/70 text-pink-soft"
      >
        {icon}
      </motion.div>
      <h3 className="text-lg font-bold">{title}</h3>
      {children && <div className="max-w-sm text-ink-muted">{children}</div>}
    </motion.div>
  )
}

export function ErrorState({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn('flex flex-col items-center gap-3 px-4 py-10 text-center', className)}>
      <div className="grid size-14 place-items-center rounded-3xl bg-danger/10 text-danger">
        <CircleAlert aria-hidden className="size-7" />
      </div>
      <p className="max-w-sm text-ink-muted">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RotateCcw aria-hidden className="size-4" /> Try again
        </Button>
      )}
    </div>
  )
}

export function FullPageSpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center">
      <Spinner className="size-8 text-pink" label={label} />
    </div>
  )
}
