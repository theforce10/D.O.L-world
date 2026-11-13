import { Play, Vote } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Dialog } from '@/components/ui/Dialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { errorMessage } from '@/lib/utils'
import { usePollResults, type Poll, type Topic } from '@/features/mingle/api'
import { ResultBars } from '@/features/mingle/ResultBars'
import { useCancelTopicVote, useFinishTopicVote, useStartTopicVote } from './api'

const TOPIC_VOTE_MAX = 6

interface StartTopicVoteDialogProps {
  eventId: string
  open: boolean
  queued: Topic[]
  onClose: () => void
}

/** Host picks 2–6 queued topics for guests to vote on. */
export function StartTopicVoteDialog({ eventId, open, queued, onClose }: StartTopicVoteDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Let guests pick the next topic"
      description="Choose 2 to 6 topics. Guests vote on their phones, then you start the winner."
    >
      {open && <TopicPicker eventId={eventId} queued={queued} onDone={onClose} />}
    </Dialog>
  )
}

function TopicPicker({ eventId, queued, onDone }: { eventId: string; queued: Topic[]; onDone: () => void }) {
  const start = useStartTopicVote(eventId)
  const [picked, setPicked] = useState<string[]>(() => queued.slice(0, 3).map((t) => t.id))
  const full = picked.length >= TOPIC_VOTE_MAX

  const toggle = (id: string) => setPicked((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))

  const submit = () =>
    start.mutate(picked, {
      onSuccess: () => {
        toast.success('Guests are voting on the next topic')
        navigator.vibrate?.(20)
        onDone()
      },
      onError: (error) => toast.error(errorMessage(error, "Couldn't start the vote.")),
    })

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {queued.map((topic) => {
          const checked = picked.includes(topic.id)
          return (
            <li key={topic.id}>
              <Checkbox
                id={`vote-topic-${topic.id}`}
                checked={checked}
                disabled={!checked && full}
                onChange={() => toggle(topic.id)}
                label={<span className="break-words font-medium">{topic.prompt}</span>}
                className="has-[:disabled]:opacity-50"
              />
            </li>
          )
        })}
      </ul>
      <p className="text-sm text-ink-muted" aria-live="polite">
        {picked.length < 2 ? 'Pick at least 2 topics.' : `${picked.length} topics picked${full ? ' (that’s the most).' : '.'}`}
      </p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button loading={start.isPending} disabled={picked.length < 2} onClick={submit}>
          {!start.isPending && <Vote aria-hidden className="size-5" />} Open the vote
        </Button>
      </div>
    </div>
  )
}

/** Live results while guests vote, with "Start winner" (or a pick between tied topics). */
export function TopicVoteControl({ eventId, vote }: { eventId: string; vote: Poll }) {
  const results = usePollResults(vote.id)
  const finish = useFinishTopicVote(eventId)
  const cancel = useCancelTopicVote(eventId)
  const [confirmCancel, setConfirmCancel] = useState(false)

  const topicByOption = new Map(vote.options.map((o) => [o.id, o.topic_id]))
  const rows = results.data ?? []
  const top = Math.max(0, ...rows.map((r) => r.votes))
  const leaders = rows.filter((r) => r.votes === top)
  const winner = top > 0 && leaders.length === 1 ? leaders[0] : undefined

  const start = (optionId: string) => {
    const topicId = topicByOption.get(optionId)
    if (!topicId) return
    navigator.vibrate?.(20)
    finish.mutate(
      { pollId: vote.id, topicId },
      {
        onSuccess: () => toast.success('The winning topic is live'),
        onError: (error) => toast.error(errorMessage(error, "Couldn't start that topic.")),
      },
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-soft">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full rounded-full bg-accent opacity-75 motion-safe:animate-ping" />
            <span className="relative inline-flex size-2 rounded-full bg-accent" />
          </span>
          Guests are voting
        </p>
        <p className="text-sm text-ink-muted">
          <AnimatedNumber value={vote.vote_count} /> {vote.vote_count === 1 ? 'vote' : 'votes'}
        </p>
      </div>

      {results.data ? <ResultBars results={results.data} /> : <Skeleton className="h-40 rounded-2xl" />}

      <AnimatePresence mode="wait" initial={false}>
        {winner ? (
          <motion.div key="winner" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <Button
              size="lg"
              fullWidth
              className="min-h-16 text-lg"
              loading={finish.isPending}
              disabled={cancel.isPending}
              onClick={() => start(winner.option_id)}
            >
              {!finish.isPending && <Play aria-hidden className="size-6" />} Start the winner
            </Button>
            <p className="mt-2 line-clamp-2 text-sm text-ink-muted">
              <span className="font-semibold text-ink-subtle">Winning:</span> {winner.label}
            </p>
          </motion.div>
        ) : results.data ? (
          <motion.div
            key="tie"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-2"
          >
            <p className="text-sm font-semibold text-accent-soft">
              {top === 0 ? 'No votes yet. You can still pick one to start:' : 'It’s a tie. Pick the one to start:'}
            </p>
            {leaders.map((r) => (
              <Button
                key={r.option_id}
                variant="secondary"
                fullWidth
                className="h-auto justify-start py-3 text-left"
                disabled={finish.isPending || cancel.isPending}
                onClick={() => start(r.option_id)}
              >
                <Play aria-hidden className="size-4 shrink-0" />
                <span className="line-clamp-2">{r.label}</span>
              </Button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Button variant="ghost" size="sm" fullWidth disabled={finish.isPending} onClick={() => setConfirmCancel(true)}>
        Cancel the vote
      </Button>

      <Dialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Cancel this topic vote?"
        description={
          vote.vote_count
            ? `Its ${vote.vote_count} ${vote.vote_count === 1 ? 'vote' : 'votes'} will be deleted. The topics stay in your queue.`
            : 'The topics stay in your queue.'
        }
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setConfirmCancel(false)}>
            Keep voting
          </Button>
          <Button
            variant="danger"
            loading={cancel.isPending}
            onClick={() =>
              cancel.mutate(vote.id, {
                onSuccess: () => {
                  toast('Topic vote cancelled')
                  setConfirmCancel(false)
                },
                onError: (error) => toast.error(errorMessage(error, "Couldn't cancel the vote.")),
              })
            }
          >
            Cancel vote
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
