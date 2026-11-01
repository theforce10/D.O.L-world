import { useQueryClient } from '@tanstack/react-query'
import { CalendarDays, MapPin } from 'lucide-react'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AppHeader } from '@/app/AppHeader'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/States'
import type { RequestStatus } from '@/lib/types'
import { cn, errorMessage } from '@/lib/utils'
import { useProfile } from '@/features/profile/api'
import { queueKeys, useActiveEvent, useMyActiveRequest, useQueueStatus, useSubmitSong } from './api'
import { LiveStatus, UpNextAlert } from './LiveStatus'
import { NoEventState } from './NoEventState'
import { SongForm } from './SongForm'
import { statusMeta } from './status'
import { TicketReveal, type Ticket } from './TicketReveal'
import { useQueueRealtime } from './useQueueRealtime'

const dateFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' })

const section = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { type: 'spring' as const, stiffness: 260, damping: 26 },
}

/** Toast + vibration when the user's own song moves to "up next" or "on stage". */
function useTurnNotifications(myStatus: RequestStatus | null | undefined, myNumber: number | null | undefined) {
  const previous = useRef<RequestStatus | null | undefined>(undefined)

  useEffect(() => {
    if (myStatus === undefined) return // still loading
    const before = previous.current
    previous.current = myStatus
    if (before === undefined || before === myStatus) return // first load or no change

    if (myStatus === 'up_next') {
      toast(`🔔 You're up next, #${myNumber}!`, { description: 'Head to the stage and get ready.', duration: 10_000 })
      navigator.vibrate?.([250, 120, 250, 120, 400])
    } else if (myStatus === 'singing') {
      toast.success("🎤 You're on! The stage is yours.", { duration: 8_000 })
      navigator.vibrate?.([400])
    }
  }, [myStatus, myNumber])
}

export function HomePage() {
  useQueueRealtime()
  const queryClient = useQueryClient()
  const { data: profile } = useProfile()
  const event = useActiveEvent()
  const eventId = event.data?.id
  const status = useQueueStatus(eventId)
  const mine = useMyActiveRequest(eventId)
  const submit = useSubmitSong(eventId)

  const [ticket, setTicket] = useState<{ ticket: Ticket; celebrate: boolean } | null>(null)
  const closeTicket = useCallback(() => setTicket(null), [])

  const myStatus = status.isSuccess ? (status.data?.my_status ?? null) : undefined
  useTurnNotifications(myStatus, status.data?.my_number)

  const firstName = profile?.full_name?.split(' ')[0]

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-xl space-y-5 px-4 pb-16 pt-5">
        <motion.div {...section} className="space-y-1">
          <p className="text-ink-muted">Hey {firstName ?? 'there'} 👋</p>
          {event.data && (
            <>
              <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xl font-extrabold sm:text-3xl">
                {event.data.name}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-flame/15 px-2.5 py-0.5 font-sans text-xs font-bold uppercase tracking-wider text-flame-soft">
                  <span className="size-1.5 rounded-full bg-flame motion-safe:animate-pulse" /> Live
                </span>
              </h1>
              <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
                {event.data.venue && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin aria-hidden className="size-4" /> {event.data.venue}
                  </span>
                )}
                {event.data.event_date && (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays aria-hidden className="size-4" /> {dateFormat.format(new Date(`${event.data.event_date}T00:00:00`))}
                  </span>
                )}
              </p>
            </>
          )}
        </motion.div>

        <LayoutGroup>
          <AnimatePresence mode="popLayout" initial={false}>
            {event.isPending ? (
              <motion.div key="loading" {...section} className="space-y-4" aria-busy>
                <Skeleton className="h-40 rounded-3xl" />
                <Skeleton className="h-80 rounded-3xl" />
              </motion.div>
            ) : event.isError ? (
              <motion.div key="error" {...section}>
                <ErrorState message={errorMessage(event.error, "Couldn't load the event.")} onRetry={() => event.refetch()} />
              </motion.div>
            ) : !event.data ? (
              <motion.div key="no-event" {...section}>
                <NoEventState />
              </motion.div>
            ) : (
              <motion.div key={`event-${event.data.id}`} {...section} className="space-y-5">
                {status.data && (
                  <motion.div layout>
                    <UpNextAlert status={status.data} />
                  </motion.div>
                )}

                <motion.div layout>
                  {status.isPending ? (
                    <Skeleton className="h-44 rounded-3xl" />
                  ) : status.data ? (
                    <LiveStatus
                      status={status.data}
                      onShowTicket={
                        mine.data
                          ? () =>
                              setTicket({
                                celebrate: false,
                                ticket: { ...mine.data!, eventName: event.data!.name },
                              })
                          : undefined
                      }
                    />
                  ) : null}
                </motion.div>

                <AnimatePresence mode="popLayout" initial={false}>
                  {mine.isPending ? (
                    <motion.div key="mine-loading" {...section}>
                      <Skeleton className="h-96 rounded-3xl" />
                    </motion.div>
                  ) : mine.data ? (
                    <motion.div key="my-song" layout {...section}>
                      <Card className="flex items-center gap-4">
                        <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-night-700 font-display text-2xl font-extrabold text-gold">
                          #{mine.data.queue_number}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium uppercase tracking-wider text-ink-subtle">Your song</p>
                          <p className="truncate text-lg font-bold">{mine.data.song_title}</p>
                          <p className="truncate text-ink-muted">{mine.data.artist}</p>
                        </div>
                        <motion.span
                          key={mine.data.status}
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold', statusMeta[mine.data.status].className)}
                        >
                          {statusMeta[mine.data.status].label}
                        </motion.span>
                      </Card>
                    </motion.div>
                  ) : (
                    <motion.div key="form" layout {...section}>
                      <SongForm
                        submitting={submit.isPending}
                        onSubmit={(values) =>
                          submit.mutate(values, {
                            onSuccess: (request) => {
                              toast.success(`🎤 Song recorded! You're #${request.queue_number}`)
                              setTicket({ celebrate: true, ticket: { ...request, eventName: event.data!.name } })
                            },
                            onError: (error) => {
                              toast.error(errorMessage(error, "Couldn't record your song. Please try again."))
                              // The event may have just ended or the user already has a song: resync.
                              void queryClient.invalidateQueries({ queryKey: queueKeys.activeEvent })
                              void queryClient.invalidateQueries({ queryKey: ['queue'] })
                            },
                          })
                        }
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </LayoutGroup>
      </main>

      <TicketReveal ticket={ticket?.ticket ?? null} celebrate={ticket?.celebrate ?? false} onClose={closeTicket} />
    </>
  )
}
