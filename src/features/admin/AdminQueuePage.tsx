import {
  CalendarPlus,
  Download,
  ListMusic,
  Mic,
  Play,
  Search,
  SkipForward,
  Square,
  UserCheck,
  Presentation,
  BarChart3,
  MessageCircleQuestion,
  HeartHandshake,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useDeferredValue, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { accentFor, useAccentMode } from '@/app/accentMode'
import { toast } from 'sonner'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { downloadCsv, slugify, toCsv, type CsvColumn } from '@/lib/csv'
import type { RequestStatus } from '@/lib/types'
import { errorMessage } from '@/lib/utils'
import { statusMeta } from '@/features/queue/status'
import {
  useCallNext,
  useCreateEvent,
  useEndEvent,
  useEventStats,
  useEventQueue,
  useEvents,
  useSetActiveEvent,
  useUpdateStatus,
  type AdminEvent,
  type QueueEntry,
} from './api'
import { CreateEventDialog } from './CreateEventDialog'
import { QueueList } from './QueueList'
import { useAdminRealtime } from './useAdminRealtime'

type Filter = 'active' | 'all' | RequestStatus
type Sort = 'number-asc' | 'number-desc'

const ACTIVE: RequestStatus[] = ['singing', 'up_next', 'waiting']

const csvColumns: CsvColumn<QueueEntry>[] = [
  { header: 'Number', value: (r) => r.queue_number },
  { header: 'Name', value: (r) => r.profile?.full_name },
  { header: 'Song', value: (r) => r.song_title },
  { header: 'Artist', value: (r) => r.artist },
  { header: 'Note', value: (r) => r.note },
  { header: 'Phone', value: (r) => r.profile?.phone },
  { header: 'Email', value: (r) => r.profile?.email },
  { header: 'Submitted', value: (r) => new Date(r.created_at).toISOString() },
  { header: 'Status', value: (r) => statusMeta[r.status].label },
]

function matches(entry: QueueEntry, q: string): boolean {
  if (!q) return true
  const p = entry.profile
  const haystack = [entry.queue_number, entry.song_title, entry.artist, entry.note, p?.full_name, p?.phone, p?.email]
  return haystack.some((v) => v != null && String(v).toLowerCase().includes(q))
}

type TypeFilter = 'all' | 'karaoke' | 'mix_mingle'

const typeTabs: { id: TypeFilter; label: string }[] = [
  { id: 'all', label: 'All events' },
  { id: 'karaoke', label: 'Karaoke' },
  { id: 'mix_mingle', label: 'Mix & Mingle' },
]

function TypeTabs({ value, onChange }: { value: TypeFilter; onChange: (v: TypeFilter) => void }) {
  return (
    <div role="tablist" aria-label="Event type" className="flex w-full gap-1 rounded-2xl bg-night-800/70 p-1 sm:w-fit">
      {typeTabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className="relative min-h-11 flex-1 whitespace-nowrap rounded-xl px-3 text-sm font-semibold sm:flex-none sm:px-4"
        >
          {value === t.id && (
            <motion.span
              layoutId="event-type-tab"
              className="absolute inset-0 rounded-xl bg-white/10"
              transition={{ type: 'spring', stiffness: 500, damping: 36 }}
            />
          )}
          <span className={value === t.id ? 'relative text-ink' : 'relative text-ink-muted'}>{t.label}</span>
        </button>
      ))}
    </div>
  )
}

export function AdminQueuePage() {
  const events = useEvents()
  const [params, setParams] = useSearchParams()
  const [creating, setCreating] = useState(false)

  const all = events.data ?? []
  const typeParam = params.get('type')
  const typeFilter: TypeFilter = typeParam === 'karaoke' || typeParam === 'mix_mingle' ? typeParam : 'all'
  const list = typeFilter === 'all' ? all : all.filter((e) => e.type === typeFilter)
  const liveEvent = all.find((e) => e.is_active)
  const selected = list.find((e) => e.id === params.get('event')) ?? list.find((e) => e.is_active) ?? list[0]

  const setTypeFilter = (next: TypeFilter) =>
    setParams(
      (p) => {
        if (next === 'all') p.delete('type')
        else p.set('type', next)
        p.delete('event')
        return p
      },
      { replace: true },
    )

  const selectEvent = (id: string) =>
    setParams(
      (p) => {
        p.set('event', id)
        return p
      },
      { replace: true },
    )

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 px-4 pb-16 pt-5">
      {events.isPending ? (
        <div className="space-y-4" aria-busy>
          <Skeleton className="h-28 rounded-3xl" />
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      ) : events.isError ? (
        <ErrorState message={errorMessage(events.error, "Couldn't load events.")} onRetry={() => events.refetch()} />
      ) : (
        <TypeTabs value={typeFilter} onChange={setTypeFilter} />
      )}
      {events.isPending || events.isError ? null : !selected ? (
        <Card>
          <EmptyState
            icon={<CalendarPlus className="size-8" />}
            title={all.length === 0 ? 'No events yet' : typeFilter === 'karaoke' ? 'No karaoke events yet' : 'No Mix & Mingle events yet'}
          >
            <p>Create your first event to get started.</p>
            <Button className="mt-4" onClick={() => setCreating(true)}>
              <CalendarPlus aria-hidden className="size-5" /> New event
            </Button>
          </EmptyState>
        </Card>
      ) : (
        <EventView
          key={selected.id}
          event={selected}
          events={list}
          liveEvent={liveEvent}
          onSelect={selectEvent}
          onCreate={() => setCreating(true)}
        />
      )}

      <CreateEventDialog open={creating} hasLiveEvent={!!liveEvent} onClose={() => setCreating(false)} onCreated={selectEvent} />
    </main>
  )
}

interface EventViewProps {
  event: AdminEvent
  events: AdminEvent[]
  liveEvent: AdminEvent | undefined
  onSelect: (id: string) => void
  onCreate: () => void
}

function EventView({ event, events, liveEvent, onSelect, onCreate }: EventViewProps) {
  useAdminRealtime(event.id)
  useAccentMode(accentFor(event.type))
  const setActive = useSetActiveEvent()
  const createEvent = useCreateEvent()
  const endEvent = useEndEvent()
  const [confirm, setConfirm] = useState<'start' | 'end' | null>(null)

  const runSetActive = () => {
    if (confirm === 'end' && event.type === 'mix_mingle') {
      return endEvent.mutate(event.id, {
        onSuccess: () => {
          toast.success(`${event.name} has ended. Connect is open for 72 hours.`)
          setConfirm(null)
        },
        onError: (error) => toast.error(errorMessage(error, "Couldn't end the event.")),
      })
    }
    setActive.mutate(confirm === 'end' ? null : event.id, {
      onSuccess: () => {
        toast.success(confirm === 'end' ? `${event.name} has ended` : `🎉 ${event.name} is live!`)
        setConfirm(null)
      },
      onError: (error) => toast.error(errorMessage(error, "Couldn't update the event.")),
    })
  }

  const hasNumbers = event.type === 'karaoke' && event.last_queue_number > 0

  const startNewNight = () =>
    createEvent.mutate(
      {
        input: { type: event.type, name: event.name, venue: event.venue ?? undefined, event_date: new Date().toLocaleDateString('en-CA') },
        goLive: true,
      },
      {
        onSuccess: (id) => {
          toast.success(`🎉 ${event.name} is live! Numbers start at #1.`)
          setConfirm(null)
          onSelect(id)
        },
        onError: (error) => toast.error(errorMessage(error, "Couldn't start a new night.")),
      },
    )

  return (
    <>
      <Card className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <label htmlFor="event-switch" className="block text-xs font-medium uppercase tracking-wider text-ink-subtle">
            Event
          </label>
          <Select id="event-switch" value={event.id} onChange={(e) => onSelect(e.target.value)}>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.is_active ? '🔴 ' : ''}
                {e.type === 'karaoke' ? '🎤 ' : '💬 '}
                {e.name}
                {e.event_date ? ` · ${e.event_date}` : ''}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {event.is_active ? (
            <>
              <span className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-accent/15 px-3 text-sm font-bold uppercase tracking-wider text-accent-soft">
                <span className="size-2 rounded-full bg-accent motion-safe:animate-pulse" /> Live
              </span>
              <Button variant="danger" size="sm" onClick={() => setConfirm('end')}>
                <Square aria-hidden className="size-4" /> End event
              </Button>
            </>
          ) : (
            <>
              {event.ended_at && (
                <span className="inline-flex min-h-11 items-center rounded-xl bg-white/10 px-3 text-sm font-bold uppercase tracking-wider text-ink-muted">
                  Ended
                </span>
              )}
              <Button variant="secondary" size="sm" onClick={() => setConfirm('start')}>
                <Play aria-hidden className="size-4" /> Go live
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={onCreate}>
            <CalendarPlus aria-hidden className="size-4" /> New event
          </Button>
        </div>
      </Card>
      {event.type === 'karaoke' ? <KaraokePanel event={event} /> : <MinglePanel event={event} />}

      <Dialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === 'end' ? `End ${event.name}?` : `Go live with ${event.name}?`}
        description={
          confirm === 'end'
            ? event.type === 'karaoke'
              ? 'Attendees will see "No event live" and can’t submit songs. The queue is kept. Next time you go live you can start a new night at #1.'
              : 'Check-in, topics and polls close, and Connect opens for guests for 72 hours. Everything is kept.'
            : event.ended_at
              ? 'This re-opens the event: guests can check in again, and Connect closes for it.'
              : hasNumbers
                ? `This event has already given out numbers up to #${event.last_queue_number}. Start a new night to begin again at #1, or carry on from #${event.last_queue_number + 1}.`
                : liveEvent && liveEvent.id !== event.id
                  ? `This ends ${liveEvent.name}, which is live right now. Attendees will switch to this event.`
                  : event.type === 'karaoke'
                    ? 'Attendees can start submitting songs straight away.'
                    : 'Guests can start checking in straight away.'
        }
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setConfirm(null)}>
            Cancel
          </Button>
          {confirm === 'start' && hasNumbers ? (
            <>
              <Button variant="secondary" loading={setActive.isPending} disabled={createEvent.isPending} onClick={runSetActive}>
                Carry on from #{event.last_queue_number + 1}
              </Button>
              <Button loading={createEvent.isPending} disabled={setActive.isPending} onClick={startNewNight}>
                Start new night at #1
              </Button>
            </>
          ) : (
            <Button
              variant={confirm === 'end' ? 'danger' : 'primary'}
              loading={setActive.isPending || endEvent.isPending}
              onClick={runSetActive}
            >
              {confirm === 'end' ? 'End event' : 'Go live'}
            </Button>
          )}
        </div>
      </Dialog>
    </>
  )
}

function KaraokePanel({ event }: { event: AdminEvent }) {
  const queue = useEventQueue(event.id)
  const updateStatus = useUpdateStatus(event.id)
  const callNext = useCallNext(event.id)

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('active')
  const [sort, setSort] = useState<Sort>('number-asc')
  const query = useDeferredValue(search.trim().toLowerCase())

  const entries = useMemo(() => queue.data ?? [], [queue.data])
  const singing = entries.find((e) => e.status === 'singing')
  const upNext = entries.find((e) => e.status === 'up_next')

  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      all: entries.length,
      active: 0,
      waiting: 0,
      up_next: 0,
      singing: 0,
      sung: 0,
      skipped: 0,
    }
    for (const e of entries) {
      c[e.status]++
      if (ACTIVE.includes(e.status)) c.active++
    }
    return c
  }, [entries])

  const visible = useMemo(() => {
    const rows = entries.filter(
      (e) => (filter === 'all' || (filter === 'active' ? ACTIVE.includes(e.status) : e.status === filter)) && matches(e, query),
    )
    return sort === 'number-asc' ? rows : [...rows].reverse()
  }, [entries, filter, query, sort])

  const changeStatus = (entry: QueueEntry, status: RequestStatus) =>
    updateStatus.mutate(
      { id: entry.id, status },
      {
        onSuccess: () => toast.success(`#${entry.queue_number} → ${statusMeta[status].label}`),
        onError: (error) => toast.error(errorMessage(error, "Couldn't change the status.")),
      },
    )

  const runCallNext = () =>
    callNext.mutate(undefined, {
      onSuccess: (number) =>
        number == null
          ? toast(singing ? '✅ That was the last song in the queue.' : 'The queue is empty. Nobody left to call.')
          : toast.success(`🎤 #${number} is on stage`),
      onError: (error) => toast.error(errorMessage(error, "Couldn't call the next singer.")),
    })

  const exportCsv = () => {
    downloadCsv(`${slugify(event.name)}-queue.csv`, toCsv(visible, csvColumns))
    toast.success(`Exported ${visible.length} ${visible.length === 1 ? 'row' : 'rows'}`)
  }

  const remaining = counts.waiting + counts.up_next

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto]">
        <StageCard label="On stage" accent="text-accent-soft" entry={singing} />
        <StageCard label="Up next" accent="text-ink" entry={upNext} />
        <Card className="flex items-center justify-between gap-4 p-4 sm:col-span-2 sm:p-5 lg:col-span-1 lg:flex-col lg:justify-center lg:text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-subtle">Still to sing</p>
          <p className="font-display text-3xl font-extrabold">
            <AnimatedNumber value={remaining} />
          </p>
        </Card>
        <Button
          size="lg"
          className="h-full min-h-16 sm:col-span-2 lg:col-span-1 lg:px-8"
          loading={callNext.isPending}
          disabled={remaining === 0 && !singing}
          onClick={runCallNext}
        >
          {!callNext.isPending && <SkipForward aria-hidden className="size-6" />}
          {singing && remaining === 0 ? 'Finish' : 'Call next'}
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="min-w-0 flex-1 sm:min-w-64">
          <label htmlFor="queue-search" className="sr-only">
            Search the queue
          </label>
          <Input
            id="queue-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="size-5" />}
            placeholder="Search name, song, phone, #…"
            className="min-h-11 py-2 sm:text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Select aria-label="Filter by status" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
            <option value="active">Still to sing ({counts.active})</option>
            <option value="all">All ({counts.all})</option>
            {(Object.keys(statusMeta) as RequestStatus[]).map((s) => (
              <option key={s} value={s}>
                {statusMeta[s].label} ({counts[s]})
              </option>
            ))}
          </Select>
          <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="number-asc">#1 first</option>
            <option value="number-desc">Newest first</option>
          </Select>
        </div>
        <Button variant="secondary" size="sm" disabled={visible.length === 0} onClick={exportCsv}>
          <Download aria-hidden className="size-4" /> Export CSV
        </Button>
      </div>

      {queue.isPending ? (
        <div className="space-y-3" aria-busy>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-3xl" />
          ))}
        </div>
      ) : queue.isError ? (
        <ErrorState message={errorMessage(queue.error, "Couldn't load the queue.")} onRetry={() => queue.refetch()} />
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState icon={<ListMusic className="size-8" />} title={entries.length === 0 ? 'No songs yet' : 'Nothing matches'}>
            {entries.length === 0 ? (
              <p>{event.is_active ? 'Songs appear here the moment attendees submit them.' : 'Go live to start taking songs.'}</p>
            ) : (
              <p>Try a different search or status filter.</p>
            )}
          </EmptyState>
        </Card>
      ) : (
        <QueueList
          entries={visible}
          onStatusChange={changeStatus}
          pendingId={updateStatus.isPending ? updateStatus.variables?.id : undefined}
        />
      )}
    </>
  )
}

function StageCard({ label, accent, entry }: { label: string; accent: string; entry: QueueEntry | undefined }) {
  return (
    <Card className="flex min-w-0 items-center gap-4 p-4 sm:p-5">
      <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-night-700">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={entry?.id ?? 'none'}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            className={`font-display text-xl font-extrabold ${accent}`}
          >
            {entry ? `#${entry.queue_number}` : <Mic aria-hidden className="size-6 text-ink-subtle" />}
          </motion.span>
        </AnimatePresence>
      </div>
      <div className="min-w-0">
        <p className={`text-xs font-medium uppercase tracking-wider ${accent}`}>{label}</p>
        {entry ? (
          <>
            <p className="truncate font-bold">{entry.profile?.full_name ?? 'Unknown'}</p>
            <p className="truncate text-sm text-ink-muted">
              {entry.song_title} · {entry.artist}
            </p>
          </>
        ) : (
          <p className="text-ink-muted">Nobody yet</p>
        )}
      </div>
    </Card>
  )
}

function MinglePanel({ event }: { event: AdminEvent }) {
  const stats = useEventStats(event.id)
  const tiles = [
    { label: 'Checked in', value: stats.data?.check_ins, Icon: UserCheck },
    { label: 'Voted in a poll', value: stats.data ? `${stats.data.participation}%` : undefined, Icon: BarChart3 },
    { label: 'Questions', value: stats.data?.questions, Icon: MessageCircleQuestion },
    { label: 'Connect matches', value: stats.data?.matches, Icon: HeartHandshake },
  ]

  return (
    <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
      <motion.div
        className="grid grid-cols-2 gap-3"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
      >
        {tiles.map(({ label, value, Icon }) => (
          <motion.div key={label} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
            <Card className="flex h-full items-center gap-3 p-4 max-[399px]:flex-col max-[399px]:items-start">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent">
                <Icon aria-hidden className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="break-words text-xs font-medium uppercase tracking-wider text-ink-subtle">{label}</p>
                <div className="font-display text-2xl font-extrabold">
                  {value === undefined ? <Skeleton className="h-8 w-12 rounded-lg" /> : <AnimatedNumber value={value} />}
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>
      <Card className="flex flex-col justify-center gap-3 p-4 sm:p-5">
        <p className="text-sm text-ink-muted">
          {event.ended_at
            ? 'This event has ended. Guests can use Connect for 72 hours after it ended.'
            : event.is_active
              ? 'Run topics, polls and questions from your phone. Guests see changes instantly.'
              : 'Line up topics and polls now, then go live to open check-in.'}
        </p>
        <Link
          to={`/admin/events/${event.id}/host`}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(110deg,var(--color-accent),var(--color-accent-soft))] px-5 font-semibold text-night-950 shadow-glow-accent transition-[filter,transform] hover:brightness-110 active:scale-95"
        >
          <Presentation aria-hidden className="size-5" /> Open host console
        </Link>
      </Card>
    </div>
  )
}
