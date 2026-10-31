import { Link } from 'react-router'
import { cn } from '@/lib/utils'

const link = 'inline-flex min-h-11 items-center px-2 hover:text-ink'

export function LegalLinks({ className }: { className?: string }) {
  return (
    <nav aria-label="Legal" className={cn('flex justify-center gap-2 text-sm text-ink-subtle', className)}>
      <Link to="/privacy" className={link}>
        Privacy
      </Link>
      <span aria-hidden className="self-center">
        ·
      </span>
      <Link to="/terms" className={link}>
        Terms
      </Link>
    </nav>
  )
}
