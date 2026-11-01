import { ChevronDown } from 'lucide-react'
import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** Native select (best picker on phones) with the app's input styling. */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <div className={cn('relative', className)}>
      <select
        ref={ref}
        className="min-h-11 w-full appearance-none rounded-xl border border-white/10 bg-night-800/70 py-2 pl-3.5 pr-10 text-base text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 disabled:opacity-60 sm:text-sm"
        {...props}
      >
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
    </div>
  )
})
