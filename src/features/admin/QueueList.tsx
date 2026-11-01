import { Mail, MessageSquareText, Phone } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import { formatPhone } from '@/lib/phone'
import type { RequestStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import { statusMeta } from '@/features/queue/status'
import type { QueueEntry } from './api'

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })

const statuses = Object.keys(statusMeta) as RequestStatus[]

const rowHighlight: Partial<Record<RequestStatus, string>> = {
  singing: 'bg-pink/[0.07]',
  up_next: 'bg-amber/[0.05]',
}

function StatusSelect({ entry, onChange, disabled }: { entry: QueueEntry; onChange: (s: RequestStatus) => void; disabled?: boolean }) {
  return (
    <div className="relative">
      <select
        aria-label={`Status for #${entry.queue_number}`}
        value={entry.status}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as RequestStatus)}
        className={cn(
          'min-h-11 w-full cursor-pointer appearance-none rounded-xl border border-white/10 py-2 pl-3 pr-8 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/70',
          statusMeta[entry.status].className,
        )}
      >
        {statuses.map((s) => (
          <option key={s} value={s} className="bg-night-900 text-ink">
            {statusMeta[s].label}
          </option>
        ))}
      </select>
      <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-70">
        ▾
      </span>
    </div>
  )
}

const contactLink = 'inline-flex min-h-8 items-center gap-1.5 text-ink-muted hover:text-cyan-soft'

function Contact({ entry, className }: { entry: QueueEntry; className?: string }) {
  const p = entry.profile
  return (
    <div className={cn('flex flex-wrap gap-x-4 gap-y-0.5 text-sm', className)}>
      {p?.phone && (
        <a href={`tel:${p.phone}`} className={contactLink}>
          <Phone aria-hidden className="size-3.5" /> {formatPhone(p.phone)}
        </a>
      )}
      {p?.email && (
        <a href={`mailto:${p.email}`} className={cn(contactLink, 'min-w-0 max-w-full')}>
          <Mail aria-hidden className="size-3.5 shrink-0" /> <span className="truncate">{p.email}</span>
        </a>
      )}
    </div>
  )
}

interface QueueListProps {
  entries: QueueEntry[]
  onStatusChange: (entry: QueueEntry, status: RequestStatus) => void
  pendingId?: string
}

export function QueueList({ entries, onStatusChange, pendingId }: QueueListProps) {
  return (
    <>
      {/* Phones: one card per singer. */}
      <ul className="space-y-3 md:hidden">
        <AnimatePresence initial={false}>
          {entries.map((entry) => (
            <motion.li
              key={entry.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
            >
              <Card className={cn('space-y-3 p-4 sm:p-5', rowHighlight[entry.status])}>
                <div className="flex items-start gap-3">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-night-700 font-display text-lg font-extrabold text-cyan">
                    #{entry.queue_number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{entry.song_title}</p>
                    <p className="truncate text-sm text-ink-muted">{entry.artist}</p>
                  </div>
                  <span className="shrink-0 text-xs text-ink-subtle">{timeFormat.format(new Date(entry.created_at))}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Avatar src={entry.profile?.avatar_url} name={entry.profile?.full_name} className="size-7 text-xs" />
                  <p className="min-w-0 truncate text-sm font-semibold">{entry.profile?.full_name ?? 'Unknown'}</p>
                </div>
                <Contact entry={entry} />
                {entry.note && (
                  <p className="flex gap-2 rounded-xl bg-night-900/60 p-2.5 text-sm text-ink-muted">
                    <MessageSquareText aria-hidden className="mt-0.5 size-4 shrink-0" /> {entry.note}
                  </p>
                )}
                <StatusSelect entry={entry} disabled={pendingId === entry.id} onChange={(s) => onStatusChange(entry, s)} />
              </Card>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {/* Tablets and up: a table. */}
      <div className="hidden overflow-hidden rounded-3xl border border-white/10 bg-night-800/70 shadow-card md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-ink-subtle">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                #
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Singer
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Song
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Contact
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Time
              </th>
              <th scope="col" className="w-40 px-4 py-3 font-medium">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {entries.map((entry) => (
                <motion.tr
                  key={entry.id}
                  layout="position"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={cn('border-b border-white/5 align-top last:border-0', rowHighlight[entry.status])}
                >
                  <td className="px-4 py-3 font-display text-lg font-extrabold text-cyan">{entry.queue_number}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar src={entry.profile?.avatar_url} name={entry.profile?.full_name} className="size-8 text-xs" />
                      <span className="font-semibold">{entry.profile?.full_name ?? 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="max-w-64 px-4 py-3">
                    <p className="font-semibold">{entry.song_title}</p>
                    <p className="text-ink-muted">{entry.artist}</p>
                    {entry.note && (
                      <p className="mt-1 flex gap-1.5 text-xs text-ink-subtle">
                        <MessageSquareText aria-hidden className="mt-px size-3.5 shrink-0" /> {entry.note}
                      </p>
                    )}
                  </td>
                  <td className="max-w-72 px-4 py-3">
                    <Contact entry={entry} className="flex-col" />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{timeFormat.format(new Date(entry.created_at))}</td>
                  <td className="px-4 py-3">
                    <StatusSelect entry={entry} disabled={pendingId === entry.id} onChange={(s) => onStatusChange(entry, s)} />
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </>
  )
}
