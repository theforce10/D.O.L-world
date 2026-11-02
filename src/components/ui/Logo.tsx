import { Mic } from 'lucide-react'
import { Link } from 'react-router'
import { BRAND } from '@/lib/brand'
import { cn } from '@/lib/utils'

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/"
      aria-label={compact ? BRAND : undefined}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl font-display text-lg font-bold"
    >
      <span className="grid size-9 place-items-center rounded-xl bg-night-800 shadow-glow-flame">
        <Mic aria-hidden className="size-5 text-flame" />
      </span>
      <span className={cn('text-gradient', compact && 'max-[399px]:hidden')}>{BRAND}</span>
    </Link>
  )
}
