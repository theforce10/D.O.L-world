import type { RequestStatus } from '@/lib/types'

export const statusMeta: Record<RequestStatus, { label: string; className: string }> = {
  waiting: { label: 'Waiting', className: 'bg-white/10 text-ink-muted' },
  up_next: { label: 'Up next', className: 'bg-amber/15 text-amber' },
  singing: { label: 'On stage', className: 'bg-flame/15 text-flame-soft' },
  sung: { label: 'Sung', className: 'bg-lime/15 text-lime' },
  skipped: { label: 'Skipped', className: 'bg-white/5 text-ink-subtle' },
}
