import { ArrowDown, ChevronLeft, ChevronRight, History, MessageCircleQuestion, PartyPopper, X } from 'lucide-react'
import { AnimatePresence, motion, type PanInfo } from 'motion/react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { cn } from '@/lib/utils'
import type { RecapTopic } from './api'
import { ResultBars } from './ResultBars'

interface CatchUpProps {
  topics: RecapTopic[] | undefined
  hasLiveTopic: boolean
  onDismiss: () => void
  onGoLive: () => void
}

export function CatchUp({ topics, hasLiveTopic, onDismiss, onGoLive }: CatchUpProps) {
  const wide = useMediaQuery('(min-width: 640px)')

  return (
    <section
      aria-labelledby="catch-up-heading"
      className="relative overflow-hidden rounded-3xl border border-accent/30 bg-night-800/80 p-4 shadow-card backdrop-blur-md sm:p-6"
    >
      <div aria-hidden className="pointer-events-none absolute -left-16 -top-16 size-48 rounded-full bg-accent/15 blur-3xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent-soft">
            <History aria-hidden className="size-3.5" /> Catch up
          </p>
          <h2 id="catch-up-heading" className="mt-1 text-xl font-bold">
            What you missed
          </h2>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Close catch-up"
          className="-mr-2 -mt-2 grid size-11 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-white/10 hover:text-ink"
        >
          <X aria-hidden className="size-5" />
        </button>
      </div>

      <div className="relative mt-4">
        {!topics ? (
          <Skeleton className="h-56 rounded-2xl" />
        ) : wide ? (
          <motion.ol initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.08 } } }} className="space-y-3">
            {topics.map((t, i) => (
              <motion.li key={t.id} variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}>
                <RecapCard topic={t} number={i + 1} />
              </motion.li>
            ))}
            <motion.li variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}>
              <AllCaughtUp hasLiveTopic={hasLiveTopic} onGoLive={onGoLive} />
            </motion.li>
          </motion.ol>
        ) : (
          <SwipeStack topics={topics} hasLiveTopic={hasLiveTopic} onGoLive={onGoLive} />
        )}
      </div>
    </section>
  )
}

const SWIPE = 70

function SwipeStack({ topics, hasLiveTopic, onGoLive }: { topics: RecapTopic[]; hasLiveTopic: boolean; onGoLive: () => void }) {
  const [[index, direction], setPage] = useState<[number, number]>([0, 0])
  const count = topics.length + 1
  const go = (by: number) => {
    const next = index + by
    if (next >= 0 && next < count) setPage([next, by])
  }
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE || info.velocity.x < -500) go(1)
    else if (info.offset.x > SWIPE || info.velocity.x > 500) go(-1)
  }
  const remaining = count - index - 1

  return (
    <div>
      <div className="relative">
        {/* The cards peeking out behind make it read as a stack. */}
        {remaining > 0 && (
          <div aria-hidden className="absolute inset-x-3 -bottom-2 top-2 rounded-2xl border border-white/5 bg-night-700/60" />
        )}
        {remaining > 1 && (
          <div aria-hidden className="absolute inset-x-6 -bottom-4 top-4 rounded-2xl border border-white/5 bg-night-700/30" />
        )}
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.div
            key={index}
            custom={direction}
            variants={{
              enter: (d: number) => ({ x: d >= 0 ? 260 : -260, opacity: 0, rotate: d >= 0 ? 6 : -6 }),
              center: { x: 0, opacity: 1, rotate: 0 },
              exit: (d: number) => ({ x: d >= 0 ? -260 : 260, opacity: 0, rotate: d >= 0 ? -8 : 8 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={onDragEnd}
            className="relative cursor-grab touch-pan-y active:cursor-grabbing"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${count}`}
          >
            {index < topics.length ? (
              <RecapCard topic={topics[index]!} number={index + 1} />
            ) : (
              <AllCaughtUp hasLiveTopic={hasLiveTopic} onGoLive={onGoLive} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-6 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={index === 0}
          aria-label="Previous"
          className="grid size-11 place-items-center rounded-full text-ink-muted hover:bg-white/10 hover:text-ink disabled:opacity-30"
        >
          <ChevronLeft aria-hidden className="size-5" />
        </button>
        <div className="flex items-center gap-1.5" aria-hidden>
          {Array.from({ length: count }, (_, i) => (
            <motion.span
              key={i}
              animate={{ width: i === index ? 20 : 6, opacity: i === index ? 1 : 0.4 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="h-1.5 rounded-full bg-accent"
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={index === count - 1}
          aria-label="Next"
          className="grid size-11 place-items-center rounded-full text-ink-muted hover:bg-white/10 hover:text-ink disabled:opacity-30"
        >
          <ChevronRight aria-hidden className="size-5" />
        </button>
      </div>
    </div>
  )
}

function RecapCard({ topic, number }: { topic: RecapTopic; number: number }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-night-900/90 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-ink-subtle">Topic {number}</p>
      <h3 className="mt-1 text-balance font-display text-lg font-bold leading-snug">{topic.prompt}</h3>
      {topic.polls.map((poll) => (
        <div key={poll.id} className="mt-4">
          <p className="mb-2 text-sm font-semibold text-ink-muted">{poll.question}</p>
          <ResultBars results={poll.results} />
        </div>
      ))}
      {topic.questions.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted">
            <MessageCircleQuestion aria-hidden className="size-4" /> From the room
          </p>
          <ul className="space-y-1.5">
            {topic.questions.map((q, i) => (
              <li key={i} className="rounded-xl bg-white/5 px-3 py-2 text-sm">
                “{q}”
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  )
}

function AllCaughtUp({ hasLiveTopic, onGoLive }: { hasLiveTopic: boolean; onGoLive: () => void }) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-2xl border border-accent/30 bg-accent/10 p-6 text-center')}>
      <motion.span
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.1 }}
        className="grid size-14 place-items-center rounded-2xl bg-accent text-night-950"
      >
        <PartyPopper aria-hidden className="size-7" />
      </motion.span>
      <p className="text-lg font-bold">You're all caught up — here's what's on now</p>
      <Button onClick={onGoLive}>
        <ArrowDown aria-hidden className="size-4" /> {hasLiveTopic ? 'Take me to the live topic' : 'Back to the room'}
      </Button>
    </div>
  )
}
