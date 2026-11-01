import { useState } from 'react'
import { cn } from '@/lib/utils'

function initials(name: string | null | undefined): string {
  if (!name) return '🎤'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '')).toUpperCase() || '🎤'
}

export function Avatar({ src, name, className }: { src?: string | null; name?: string | null; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null)
  const showImage = src && failed !== src

  return (
    <span
      className={cn(
        'relative inline-grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[linear-gradient(135deg,var(--color-flame),var(--color-ember))] font-display font-bold text-night-950',
        className,
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          // Google profile photos can 403 when a referrer is sent.
          referrerPolicy="no-referrer"
          onError={() => setFailed(src)}
          className="size-full object-cover"
        />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  )
}
