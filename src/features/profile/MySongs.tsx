import { Music } from 'lucide-react'
import { motion } from 'motion/react'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { cn, errorMessage } from '@/lib/utils'
import { statusMeta } from '@/features/queue/status'
import { useMySongs } from './api'

const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

export function MySongs() {
  const songs = useMySongs()

  if (songs.isPending) {
    return (
      <div className="space-y-3" aria-busy>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    )
  }

  if (songs.isError) return <ErrorState message={errorMessage(songs.error, "Couldn't load your songs.")} onRetry={() => songs.refetch()} />

  if (songs.data.length === 0) {
    return (
      <EmptyState icon={<Music className="size-8" />} title="No songs yet">
        Your song history will show up here after your first performance.
      </EmptyState>
    )
  }

  return (
    <motion.ul
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
      className="space-y-3"
    >
      {songs.data.map((song) => {
        const meta = statusMeta[song.status]
        const eventDate = song.event?.event_date ? dateFormat.format(new Date(`${song.event.event_date}T00:00:00`)) : null
        return (
          <motion.li
            key={song.id}
            variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
            className="flex items-center gap-4 rounded-2xl border border-white/10 bg-night-900/50 p-4"
          >
            <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-night-700 font-display text-xl font-bold text-accent">
              <span className="sr-only">Number </span>#{song.queue_number}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{song.song_title}</p>
              <p className="truncate text-sm text-ink-muted">{song.artist}</p>
              <p className="truncate text-xs text-ink-subtle">
                {song.event?.name}
                {eventDate && ` · ${eventDate}`}
              </p>
            </div>
            <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold', meta.className)}>{meta.label}</span>
          </motion.li>
        )
      })}
    </motion.ul>
  )
}
