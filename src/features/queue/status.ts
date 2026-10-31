import type { RequestStatus } from '@/lib/types'

export const statusMeta: Record<RequestStatus, { label: string; className: string }> = {
  waiting: { label: 'Waiting', className: 'bg-white/10 text-ink-muted' },
  up_next: { label: 'Up next', className: 'bg-amber/15 text-amber' },
  singing: { label: 'On stage', className: 'bg-pink/15 text-pink-soft' },
  sung: { label: 'Sung', className: 'bg-lime/15 text-lime' },
  skipped: { label: 'Skipped', className: 'bg-danger/15 text-danger' },
}
