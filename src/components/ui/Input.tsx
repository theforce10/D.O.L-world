import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const base =
  'w-full rounded-2xl border bg-night-800/70 px-4 text-base text-ink placeholder:text-ink-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 disabled:opacity-60 aria-invalid:border-danger/70 aria-invalid:focus-visible:ring-danger/60'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode
  trailing?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, icon, trailing, ...props }, ref) {
  return (
    <div className="relative">
      {icon && (
        <span aria-hidden className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-ink-subtle">
          {icon}
        </span>
      )}
      <input
        ref={ref}
        className={cn(base, 'min-h-12 border-white/10 py-3', !!icon && 'pl-11', !!trailing && 'pr-12', className)}
        {...props}
      />
      {trailing && <span className="absolute inset-y-0 right-1 flex items-center">{trailing}</span>}
    </div>
  )
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} className={cn(base, 'min-h-24 resize-y border-white/10 py-3', className)} {...props} />
})
