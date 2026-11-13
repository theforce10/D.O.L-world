import { Flag, Plus, SkipForward, Timer, Vote } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CountdownRing } from '@/components/ui/CountdownRing'
import { useCountdown } from '@/lib/serverClock'
import { errorMessage } from '@/lib/utils'
import type { Poll, Topic } from '@/features/mingle/api'
import { useAdvanceTopic, useEndRound, useExtendTopic } from './api'
import { StartTopicVoteDialog, TopicVoteControl } from './TopicVote'

interface LiveTopicControlProps {
  eventId: string
  live: Topic | undefined
  queued: Topic[]
  number: number
  /** The open "pick the next topic" vote, if any. */
  topicVote: Poll | undefined
}

export function LiveTopicControl({ eventId, live, queued, number, topicVote }: LiveTopicControlProps) {
  const next = queued[0]
  const [picking, setPicking] = useState(false)
  const advance = useAdvanceTopic(eventId)
  const endRound = useEndRound(eventId)
  const extend = useExtendTopic(eventId)
  const countdown = useCountdown(live?.started_at, live?.duration_seconds)

  const runAdvance = () => {
    navigator.vibrate?.(20)
    advance.mutate(undefined, {
      onSuccess: (id) => toast.success(id ? 'Next topic is live' : 'That was the last topic'),
      onError: (error) => toast.error(errorMessage(error, "Couldn't move to the next topic.")),
    })
  }

  const runEndRound = () =>
    endRound.mutate(undefined, {
      onSuccess: () => toast('Round ended'),
      onError: (error) => toast.error(errorMessage(error, "Couldn't end the round.")),
    })

  const runExtend = () =>
    extend.mutate(live!.id, {
      onSuccess: () => toast.success('+2 minutes'),
      onError: (error) => toast.error(errorMessage(error, "Couldn't add time.")),
    })

  const busy = advance.isPending || endRound.isPending

  return (
    <Card className="relative overflow-hidden p-4 sm:p-6">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-accent/15 blur-3xl" />
      <div className="relative space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-accent-soft">
              {live ? `Live now · Topic ${number}` : 'Nothing live'}
            </p>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.h2
                key={live?.id ?? 'none'}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                className="mt-1 text-balance font-display text-xl font-bold leading-snug sm:text-2xl"
              >
                {live
                  ? live.prompt
                  : topicVote
                    ? 'Guests are picking the next topic.'
                    : next
                      ? 'Ready when you are.'
                      : 'Add a topic to get started.'}
              </motion.h2>
            </AnimatePresence>
          </div>
          {countdown && <CountdownRing countdown={countdown} />}
        </div>

        {countdown?.done && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-semibold text-accent-soft">
            Time's up. Guests see “Time's up — wrap it up”.
          </motion.p>
        )}

        {topicVote ? (
          <div className="rounded-2xl border border-white/10 bg-night-900/60 p-3 sm:p-4">
            <TopicVoteControl eventId={eventId} vote={topicVote} />
          </div>
        ) : (
          <>
            <Button
              size="lg"
              fullWidth
              className="min-h-16 text-lg"
              loading={advance.isPending}
              disabled={busy || (!live && !next)}
              onClick={runAdvance}
            >
              {!advance.isPending && (next ? <SkipForward aria-hidden className="size-6" /> : <Flag aria-hidden className="size-6" />)}
              {next ? (live ? 'Next topic' : 'Start next topic') : 'Finish last topic'}
            </Button>
            {next && (
              <p className="truncate text-sm text-ink-muted">
                <span className="font-semibold text-ink-subtle">Next:</span> {next.prompt}
              </p>
            )}
            <Button variant="secondary" fullWidth disabled={busy || queued.length < 2} onClick={() => setPicking(true)}>
              <Vote aria-hidden className="size-5" /> Let guests vote on the next topic
            </Button>
            {queued.length < 2 && <p className="-mt-2 text-xs text-ink-subtle">Add at least 2 topics to the queue to run a vote.</p>}
          </>
        )}

        {live && (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" loading={extend.isPending} onClick={runExtend}>
              {!extend.isPending &&
                (live.duration_seconds ? <Plus aria-hidden className="size-4" /> : <Timer aria-hidden className="size-4" />)}
              2 min
            </Button>
            <Button variant="ghost" loading={endRound.isPending} disabled={busy} onClick={runEndRound}>
              End round
            </Button>
          </div>
        )}
      </div>
      <StartTopicVoteDialog eventId={eventId} open={picking} queued={queued} onClose={() => setPicking(false)} />
    </Card>
  )
}
