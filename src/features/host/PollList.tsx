import { BarChart3, MonitorPlay, MonitorX, Pencil, Play, Plus, Square, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/States'
import { cn, errorMessage } from '@/lib/utils'
import { usePollResults, type Poll, type Topic } from '@/features/mingle/api'
import { ResultBars } from '@/features/mingle/ResultBars'
import { useDeletePoll, useSetPollStatus, useShowPollOnScreen } from './api'
import { PollComposer } from './PollComposer'

const statusStyle: Record<Poll['status'], { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-white/10 text-ink-muted' },
  open: { label: 'Live', className: 'bg-accent text-night-950' },
  closed: { label: 'Closed', className: 'bg-white/10 text-ink' },
}

interface PollListProps {
  eventId: string
  polls: Poll[]
  topics: Topic[]
  screenPollId: string | null
}

export function PollList({ eventId, polls, topics, screenPollId }: PollListProps) {
  const [composer, setComposer] = useState<{ poll?: Poll } | null>(null)
  const [deleting, setDeleting] = useState<Poll | null>(null)
  const remove = useDeletePoll(eventId)
  const liveTopic = topics.find((t) => t.status === 'live')
  const topicPrompt = new Map(topics.map((t) => [t.id, t.prompt]))

  const ordered = [...polls].sort((a, b) => rank(a) - rank(b))

  return (
    <section aria-labelledby="polls-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="polls-heading" className="text-lg font-bold">
          Polls
        </h2>
        <Button size="sm" onClick={() => setComposer({})}>
          <Plus aria-hidden className="size-4" /> New poll
        </Button>
      </div>

      {ordered.length === 0 ? (
        <Card>
          <EmptyState icon={<BarChart3 className="size-8" />} title="No polls yet">
            <p>Create one now and open it when the moment's right.</p>
          </EmptyState>
        </Card>
      ) : (
        <motion.ul layout className="space-y-3">
          <AnimatePresence initial={false}>
            {ordered.map((poll) => (
              <motion.li
                key={poll.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              >
                <HostPollCard
                  eventId={eventId}
                  poll={poll}
                  topicPrompt={poll.topic_id ? topicPrompt.get(poll.topic_id) : undefined}
                  onScreen={screenPollId === poll.id}
                  onEdit={() => setComposer({ poll })}
                  onDelete={() => setDeleting(poll)}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}

      <PollComposer
        eventId={eventId}
        open={composer !== null}
        poll={composer?.poll}
        liveTopic={liveTopic}
        onClose={() => setComposer(null)}
      />

      <Dialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete this poll?"
        description={deleting?.vote_count ? `Its ${deleting.vote_count} votes will be deleted too.` : 'This can’t be undone.'}
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={remove.isPending}
            onClick={() =>
              remove.mutate(deleting!.id, {
                onSuccess: () => {
                  toast('Poll deleted')
                  setDeleting(null)
                },
                onError: (error) => toast.error(errorMessage(error, "Couldn't delete the poll.")),
              })
            }
          >
            Delete poll
          </Button>
        </div>
      </Dialog>
    </section>
  )
}

function rank(p: Poll): number {
  return p.status === 'open' ? 0 : p.status === 'draft' ? 1 : 2
}

interface HostPollCardProps {
  eventId: string
  poll: Poll
  topicPrompt: string | undefined
  onScreen: boolean
  onEdit: () => void
  onDelete: () => void
}

function HostPollCard({ eventId, poll, topicPrompt, onScreen, onEdit, onDelete }: HostPollCardProps) {
  const setStatus = useSetPollStatus(eventId)
  const show = useShowPollOnScreen(eventId)
  const results = usePollResults(poll.status === 'draft' ? undefined : poll.id)
  const style = statusStyle[poll.status]

  const toggleOpen = () =>
    setStatus.mutate(
      { id: poll.id, open: poll.status !== 'open' },
      {
        onSuccess: () => toast.success(poll.status === 'open' ? 'Poll closed' : 'Poll is live'),
        onError: (error) => toast.error(errorMessage(error, "Couldn't update the poll.")),
      },
    )

  const toggleScreen = () =>
    show.mutate(onScreen ? null : poll.id, {
      onSuccess: () => toast.success(onScreen ? 'Removed from the screen' : 'Showing on the screen'),
      onError: (error) => toast.error(errorMessage(error, "Couldn't update the screen.")),
    })

  return (
    <Card className={cn('space-y-3 p-4 sm:p-5', poll.status === 'open' && 'border-accent/50 shadow-glow-accent')}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider', style.className)}>{style.label}</span>
        {onScreen && (
          <motion.span
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-bold text-accent-soft"
          >
            <MonitorPlay aria-hidden className="size-3.5" /> On screen
          </motion.span>
        )}
        {poll.status !== 'draft' && (
          <span className="ml-auto text-sm text-ink-muted">
            <AnimatedNumber value={poll.vote_count} /> {poll.vote_count === 1 ? 'vote' : 'votes'}
          </span>
        )}
      </div>
      <div>
        <h3 className="font-sans text-lg font-bold">{poll.question}</h3>
        {topicPrompt && <p className="mt-0.5 truncate text-sm text-ink-subtle">Topic: {topicPrompt}</p>}
      </div>

      {poll.status === 'draft' ? (
        <ul className="flex flex-wrap gap-1.5">
          {poll.options.map((o) => (
            <li key={o.id} className="rounded-full border border-white/10 px-3 py-1 text-sm text-ink-muted">
              {o.label}
            </li>
          ))}
        </ul>
      ) : results.data ? (
        <ResultBars results={results.data} />
      ) : (
        <Skeleton className="h-28 rounded-2xl" />
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={poll.status === 'open' ? 'secondary' : 'primary'} loading={setStatus.isPending} onClick={toggleOpen}>
          {!setStatus.isPending &&
            (poll.status === 'open' ? <Square aria-hidden className="size-4" /> : <Play aria-hidden className="size-4" />)}
          {poll.status === 'open' ? 'Close' : poll.status === 'closed' ? 'Reopen' : 'Open'}
        </Button>
        {poll.status !== 'draft' && (
          <Button size="sm" variant="secondary" loading={show.isPending} onClick={toggleScreen}>
            {!show.isPending && (onScreen ? <MonitorX aria-hidden className="size-4" /> : <MonitorPlay aria-hidden className="size-4" />)}
            {onScreen ? 'Hide from screen' : 'Show on screen'}
          </Button>
        )}
        {poll.status === 'draft' && (
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <Pencil aria-hidden className="size-4" /> Edit
          </Button>
        )}
        {poll.status !== 'open' && (
          <Button size="sm" variant="ghost" className="ml-auto hover:text-danger" aria-label="Delete poll" onClick={onDelete}>
            <Trash2 aria-hidden className="size-4" />
          </Button>
        )}
      </div>
    </Card>
  )
}
