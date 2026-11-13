import { motion, type HTMLMotionProps } from 'motion/react'
import { forwardRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary:
    'bg-[linear-gradient(110deg,var(--color-accent),var(--color-accent-soft))] text-night-950 shadow-glow-accent hover:brightness-110',
  secondary: 'border border-accent/50 bg-night-800/60 text-accent-soft hover:bg-night-700 hover:border-accent',
  ghost: 'text-ink-muted hover:bg-white/5 hover:text-ink',
  danger: 'border border-danger/50 bg-danger/10 text-danger hover:bg-danger/20',
}

const sizes: Record<Size, string> = {
  sm: 'min-h-11 px-3.5 text-sm gap-1.5 rounded-xl',
  md: 'min-h-12 px-5 text-base gap-2 rounded-2xl',
  lg: 'min-h-14 px-5 text-base gap-2.5 rounded-2xl sm:px-7 sm:text-lg',
}

export interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, fullWidth = false, disabled, className, children, type = 'button', ...props },
  ref,
) {
  const isDisabled = disabled || loading
  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      whileHover={isDisabled ? undefined : { y: -1 }}
      whileTap={isDisabled ? undefined : { scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      className={cn(
        'inline-flex select-none items-center justify-center font-semibold transition-[filter,background-color,border-color,color] disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading && <Spinner className="size-5" />}
      {children as ReactNode}
    </motion.button>
  )
})
