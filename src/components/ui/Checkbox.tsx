import { Check } from 'lucide-react'
import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ id, label, className, ...props }, ref) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-night-800/60 p-4 has-[:checked]:border-accent/60 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/70 has-[[aria-invalid=true]]:border-danger/70',
        className,
      )}
    >
      <input ref={ref} id={id} type="checkbox" className="peer sr-only" {...props} />
      <span
        aria-hidden
        className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg border-2 border-ink-subtle transition-colors peer-checked:border-accent peer-checked:bg-accent [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100"
      >
        <Check className="size-4 text-night-950" strokeWidth={3} />
      </span>
      <span className="text-sm leading-relaxed text-ink">{label}</span>
    </label>
  )
})
