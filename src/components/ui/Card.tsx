import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-3xl border border-white/10 bg-night-800/70 p-5 shadow-card backdrop-blur-md sm:p-7', className)}
      {...props}
    />
  )
}
