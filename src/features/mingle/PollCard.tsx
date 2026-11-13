import { BarChart3, Check, Lock, Vote } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'
import { useMyVote, usePollResults, type Poll } from './api'
import { ResultBars } from './ResultBars'

interface PollCardProps {
  poll: Poll
  voting: boolean
  onVote: (optionId: string) => void
}

const swap = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -12, scale: 0.98 },
  transition: { type: 'spring' as const, stiffness: 320, damping: 28 },
}

export function PollCard({ poll, voting, onVote }: PollCardProps) {
  const results = usePollResults(poll.id)
  const myVote = useMyVote(poll.id)
  const mine = myVote.data ?? null
  const open = poll.status === 'open'
  const topicVote = poll.kind === 'topic'
  const [picked, setPicked] = useState<string | null>(null)
  // The vote the guest started changing from. Once the saved vote differs, we're back to results.
  const [changingFrom, setChangingFrom] = useState<string | null>(null)
  const changing = changingFrom !== null && changingFrom === mine
  const [peek, setPeek] = useState(false)

  const showResults = !open || (mine && !changing) || peek
  const choice = picked ?? mine

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-night-800/70 p-5 shadow-card backdrop-blur-md sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-soft">
          {!open ? (
            <Lock aria-hidden className="size-3.5" />
          ) : topicVote ? (
            <Vote aria-hidden className="size-3.5" />
          ) : (
            <BarChart3 aria-hidden className="size-3.5" />
          )}
          {!open ? 'Poll closed' : topicVote ? 'Next topic vote' : 'Live poll'}
        </p>
        <p className="shrink-0 whitespace-nowrap text-sm text-ink-muted">
          <AnimatedNumber value={poll.vote_count} /> {poll.vote_count === 1 ? 'vote' : 'votes'}
        </p>
      </div>
      <h2 className="mt-3 text-balance text-xl font-bold sm:text-2xl">{poll.question}</h2>

      <div className="mt-4">
        <AnimatePresence mode="wait" initial={false}>
          {showResults ? (
            <motion.div key="results" {...swap}>
              {results.data ? <ResultBars results={results.data} myOptionId={mine} /> : <Skeleton className="h-40 rounded-2xl" />}
            </motion.div>
          ) : (
            <motion.div key="vote" {...swap} role="radiogroup" aria-label={poll.question} className="space-y-2">
              {poll.options.map((o, i) => {
                const selected = choice === o.id
                return (
                  <motion.button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setPicked(o.id)}
                    className={cn(
                      'flex min-h-14 w-full items-center gap-3 rounded-2xl border px-4 text-left font-semibold transition-colors',
                      selected ? 'border-accent bg-accent/15 text-ink' : 'border-white/10 bg-night-900/60 text-ink hover:border-white/25',
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors',
                        selected ? 'border-accent bg-accent' : 'border-ink-subtle',
                      )}
                    >
                      {selected && <Check className="size-3.5 text-night-950" strokeWidth={3} />}
                    </span>
                    {o.label}
                  </motion.button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {open && (
        <div className="mt-4 space-y-1">
          {showResults && mine && !peek ? (
            <Button variant="ghost" fullWidth onClick={() => setChangingFrom(mine)}>
              Change vote
            </Button>
          ) : showResults && peek ? (
            <Button variant="secondary" fullWidth onClick={() => setPeek(false)}>
              Back to voting
            </Button>
          ) : (
            <>
              <Button size="lg" fullWidth loading={voting} disabled={!choice || choice === mine} onClick={() => choice && onVote(choice)}>
                Save my vote
              </Button>
              {!mine && (
                <button
                  type="button"
                  onClick={() => setPeek(true)}
                  className="min-h-11 w-full text-sm font-semibold text-ink-muted hover:text-ink"
                >
                  See results so far
                </button>
              )}
              {mine && (
                <button
                  type="button"
                  onClick={() => setChangingFrom(null)}
                  className="min-h-11 w-full text-sm font-semibold text-ink-muted hover:text-ink"
                >
                  Keep my vote
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
