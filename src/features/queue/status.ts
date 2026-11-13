import type { RequestStatus } from '@/lib/types'

export const statusMeta: Record<RequestStatus, { label: string; className: string }> = {
  waiting: { label: 'Waiting', className: 'bg-white/10 text-ink-muted' },
  up_next: { label: 'Up next', className: 'bg-white/15 text-ink' },
  singing: { label: 'On stage', className: 'bg-accent/15 text-accent-soft' },
  sung: { label: 'Sung', className: 'bg-lime/15 text-lime' },
  skipped: { label: 'Skipped', className: 'bg-white/5 text-ink-subtle' },
}
