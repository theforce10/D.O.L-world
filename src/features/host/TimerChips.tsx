import { Timer, TimerOff } from 'lucide-react'
import { motion } from 'motion/react'
import { useId } from 'react'
import { cn } from '@/lib/utils'
import { TIMER_PRESETS } from './timers'

export function TimerChips({
  value,
  onChange,
  label = 'Timer',
}: {
  value: number | null
  onChange: (seconds: number | null) => void
  label?: string
}) {
  const name = useId()
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="grid grid-cols-4 gap-1.5 rounded-2xl bg-night-800/70 p-1">
        {TIMER_PRESETS.map((preset) => {
          const selected = preset.seconds === value
          return (
            <label
              key={preset.label}
              className={cn(
                'relative flex min-h-11 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-xl px-1 text-sm font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/70',
                selected ? 'text-night-950' : 'text-ink-muted hover:text-ink',
              )}
            >
              <input type="radio" name={name} className="sr-only" checked={selected} onChange={() => onChange(preset.seconds)} />
              {selected && (
                <motion.span
                  layoutId={`${name}-pill`}
                  aria-hidden
                  className="absolute inset-0 rounded-xl bg-accent"
                  transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                />
              )}
              <span className="relative inline-flex items-center gap-1">
                {preset.seconds ? (
                  <Timer aria-hidden className="size-3.5 max-sm:hidden" />
                ) : (
                  <TimerOff aria-hidden className="size-3.5 max-sm:hidden" />
                )}
                {preset.seconds ? preset.label : 'None'}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
