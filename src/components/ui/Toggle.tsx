import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ToggleProps {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
  className?: string
}

export function Toggle({ id, checked, onChange, label, description, disabled, className }: ToggleProps) {
  return (
    <div
      className={cn(
        'flex min-h-11 items-start gap-3 rounded-2xl border border-white/10 bg-night-800/60 p-4 transition-colors',
        checked && 'border-accent/50',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="cursor-pointer text-sm font-medium leading-relaxed text-ink">
          {label}
        </label>
        {description && (
          <p id={`${id}-description`} className="mt-0.5 text-sm text-ink-muted">
            {description}
          </p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-description` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="-my-1.5 grid h-11 shrink-0 place-items-center disabled:opacity-50"
      >
        <span
          className={cn(
            'flex h-7 w-12 items-center rounded-full p-1 transition-colors duration-300',
            checked ? 'justify-end bg-accent' : 'justify-start bg-night-600',
          )}
        >
          <motion.span
            layout
            transition={{ type: 'spring', stiffness: 600, damping: 32 }}
            className={cn('size-5 rounded-full shadow-md', checked ? 'bg-night-950' : 'bg-ink-muted')}
          />
        </span>
      </button>
    </div>
  )
}
