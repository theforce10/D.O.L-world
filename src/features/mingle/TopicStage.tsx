import { AlarmClock, Coffee, MessagesSquare } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/Card'
import { CountdownRing } from '@/components/ui/CountdownRing'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/States'
import { useCountdown } from '@/lib/serverClock'
import { errorMessage } from '@/lib/utils'
import { useTopics, type Topic } from './api'

const flip = {
  initial: { opacity: 0, rotateX: -65, y: 50, scale: 0.92 },
  animate: { opacity: 1, rotateX: 0, y: 0, scale: 1 },
  exit: { opacity: 0, rotateX: 45, y: -40, scale: 0.95 },
  transition: { type: 'spring' as const, stiffness: 170, damping: 20 },
}

function useNewTopicAlert(live: Topic | undefined, ready: boolean) {
  const previous = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    if (!ready) return
    const id = live?.id ?? null
    const before = previous.current
    previous.current = id
    if (before === undefined || !id || id === before) return
    toast('New topic', { description: live!.prompt, duration: 6000 })
    navigator.vibrate?.([30, 50, 30])
  }, [live, ready])
}

export function TopicStage({ eventId, voteOpen = false }: { eventId: string; voteOpen?: boolean }) {
  const topics = useTopics(eventId)
  const started = (topics.data ?? []).filter((t) => t.status !== 'queued')
  const live = started.find((t) => t.status === 'live')
  useNewTopicAlert(live, topics.isSuccess)

  if (topics.isPending) return <Skeleton className="h-64 rounded-3xl" />
  if (topics.isError) {
    return (
      <Card>
        <ErrorState message={errorMessage(topics.error, "Couldn't load the topic.")} onRetry={() => topics.refetch()} />
      </Card>
    )
  }

  return (
    <section id="live-topic" aria-live="polite" className="scroll-mt-24 [perspective:1200px]">
      <AnimatePresence mode="popLayout" initial={false}>
        {live ? (
          <motion.div key={live.id} {...flip} style={{ transformOrigin: '50% 0%' }}>
            <TopicCard topic={live} number={started.indexOf(live) + 1} />
          </motion.div>
        ) : started.length > 0 ? (
          <motion.div key="between" {...flip}>
            <BetweenRounds voteOpen={voteOpen} />
          </motion.div>
        ) : (
          <motion.div key="waiting" {...flip}>
            <WaitingForTopic voteOpen={voteOpen} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

function TopicCard({ topic, number }: { topic: Topic; number: number }) {
  const countdown = useCountdown(topic.started_at, topic.duration_seconds)
  const words = topic.prompt.split(/\s+/)

  return (
    <div className="relative overflow-hidden rounded-3xl bg-[linear-gradient(150deg,var(--color-accent-deep),var(--color-accent)_50%,var(--color-accent-soft))] p-[2px] shadow-glow-accent">
      <div className="relative rounded-[calc(1.5rem-2px)] bg-night-900/95 p-5 sm:p-7">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <p className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-soft">
            <MessagesSquare aria-hidden className="size-3.5" /> Topic {number}
          </p>
          {countdown && <CountdownRing countdown={countdown} className="-mr-1 -mt-1 size-16 sm:size-20" />}
        </div>
        <motion.h2
          className="relative mt-4 text-balance font-display text-2xl font-bold leading-snug sm:text-3xl"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.04, delayChildren: 0.15 } } }}
        >
          {words.map((word, i) => (
            <motion.span
              key={i}
              className="inline-block whitespace-pre"
              variants={{
                hidden: { opacity: 0, y: 12, filter: 'blur(6px)' },
                show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 300, damping: 24 } },
              }}
            >
              {word}
              {i < words.length - 1 ? ' ' : ''}
            </motion.span>
          ))}
        </motion.h2>
        <AnimatePresence>
          {countdown?.done && (
            <motion.p
              role="status"
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 20 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="relative overflow-hidden"
            >
              <motion.span
                animate={{ rotate: [0, -8, 8, -8, 8, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2.4 }}
                className="mr-2 inline-flex align-middle"
              >
                <AlarmClock aria-hidden className="size-5 text-accent" />
              </motion.span>
              <span className="font-semibold text-accent-soft">Time's up — wrap it up</span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function BetweenRounds({ voteOpen }: { voteOpen: boolean }) {
  const reduce = useReducedMotion()
  return (
    <Card className="flex flex-col items-center gap-3 py-10 text-center">
      <motion.span
        animate={reduce ? undefined : { rotate: [-6, 6, -6] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="grid size-16 place-items-center rounded-3xl bg-night-700 text-accent-soft"
      >
        <Coffee aria-hidden className="size-8" />
      </motion.span>
      <h2 className="text-lg font-bold">That round's done</h2>
      <p className="max-w-sm text-ink-muted">
        {voteOpen ? 'You choose what’s next. Vote below.' : 'Keep chatting. The next topic will show up here.'}
      </p>
    </Card>
  )
}

function WaitingForTopic({ voteOpen }: { voteOpen: boolean }) {
  const reduce = useReducedMotion()
  return (
    <Card className="flex flex-col items-center gap-4 py-10 text-center">
      <div className="relative h-16 w-24" aria-hidden>
        <motion.div
          className="absolute left-0 top-0 grid h-10 w-14 place-items-center rounded-2xl rounded-bl-sm bg-night-600"
          animate={reduce ? undefined : { y: [0, -4, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <MessagesSquare className="size-5 text-ink-subtle" />
        </motion.div>
        <motion.div
          className="absolute bottom-0 right-0 flex h-10 w-14 items-center justify-center gap-1 rounded-2xl rounded-br-sm bg-accent/20"
          animate={reduce ? undefined : { y: [0, -4, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 1.3 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="size-1.5 rounded-full bg-accent"
              animate={reduce ? undefined : { opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </motion.div>
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-bold">{voteOpen ? 'You pick the first topic' : "The host hasn't started the first topic yet"}</h2>
        <p className="text-ink-muted">
          {voteOpen
            ? 'Vote below. The winner appears here when the host starts it.'
            : 'Grab a cocktail and say hi. The first topic appears here the moment it starts.'}
        </p>
      </div>
    </Card>
  )
}
