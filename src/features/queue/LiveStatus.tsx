import { BellRing, Mic, PartyPopper, Radio, Ticket as TicketIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { Card } from '@/components/ui/Card'
import type { QueueStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

function Stat({ label, children, accent }: { label: string; children: ReactNode; accent?: 'flame' | 'gold' }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-night-900/60 p-3 text-center sm:p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-ink-subtle">{label}</p>
      <p
        className={cn(
          'mt-1 font-display text-3xl font-extrabold sm:text-4xl',
          accent === 'flame' && 'text-flame-soft',
          accent === 'gold' && 'text-gold',
        )}
      >
        {children}
      </p>
    </div>
  )
}

function aheadMessage(status: QueueStatus): string {
  switch (status.my_status) {
    case 'waiting':
      return status.ahead_of_me === 1 ? '1 person ahead of you' : `${status.ahead_of_me ?? 0} people ahead of you`
    case 'up_next':
      return "You're up next. Head to the stage!"
    case 'singing':
      return "You're on stage. Enjoy it!"
    case 'sung':
      return 'Hope you had fun! Fancy another one?'
    case 'skipped':
      return 'Your turn was skipped. Check with the host or pick another song.'
    default:
      return status.total_waiting === 0 ? 'The queue is empty. Be the first!' : `${status.total_waiting} in the queue`
  }
}

export function LiveStatus({ status, onShowTicket }: { status: QueueStatus; onShowTicket?: () => void }) {
  const mine = status.my_number
  const inPlay = status.my_status === 'waiting' || status.my_status === 'up_next' || status.my_status === 'singing'

  return (
    <Card className="space-y-4" aria-live="polite">
      <div className="flex items-center gap-2 text-sm font-semibold text-lime">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-lime opacity-75 motion-reduce:hidden" />
          <span className="relative inline-flex size-2.5 rounded-full bg-lime" />
        </span>
        <Radio aria-hidden className="size-4" /> Live queue
      </div>

      <div className={cn('grid gap-3', inPlay && mine ? 'grid-cols-3' : 'grid-cols-2')}>
        <Stat label="Now singing" accent="flame">
          {status.current_number > 0 ? <AnimatedNumber value={`#${status.current_number}`} /> : '–'}
        </Stat>
        {inPlay && mine ? (
          <>
            <Stat label="You're" accent="gold">
              #{mine}
            </Stat>
            <Stat label="Ahead">
              <AnimatedNumber value={status.ahead_of_me ?? 0} />
            </Stat>
          </>
        ) : (
          <Stat label="In queue">
            <AnimatedNumber value={status.total_waiting} />
          </Stat>
        )}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={aheadMessage(status)}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="text-center text-lg font-semibold"
        >
          {/* "Now singing: #12 · You're #17 · 5 ahead of you" as one sentence for screen readers. */}
          <span className="sr-only">
            Now singing: {status.current_number > 0 ? `#${status.current_number}` : 'nobody yet'}.{' '}
            {inPlay && mine ? `You're #${mine}.` : ''}{' '}
          </span>
          {aheadMessage(status)}
        </motion.p>
      </AnimatePresence>

      {inPlay && onShowTicket && (
        <button
          type="button"
          onClick={onShowTicket}
          className="mx-auto flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-gold-soft hover:text-gold"
        >
          <TicketIcon aria-hidden className="size-4" /> Show my ticket
        </button>
      )}
    </Card>
  )
}

/** Big pulsing banner when the user is up next or on stage. */
export function UpNextAlert({ status }: { status: QueueStatus }) {
  const show = status.my_status === 'up_next' || status.my_status === 'singing'
  const onStage = status.my_status === 'singing'

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="alert"
          layout
          initial={{ opacity: 0, scale: 0.85, y: -16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="relative overflow-hidden rounded-3xl bg-[linear-gradient(110deg,var(--color-flame),var(--color-ember),var(--color-gold))] bg-[length:200%_100%] p-[2px] animate-gradient-pan"
        >
          <div className="flex items-center gap-4 rounded-[calc(1.5rem-2px)] bg-night-900/90 p-5">
            <motion.div
              animate={{ rotate: [0, -14, 14, -10, 10, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 1.2 }}
              className="grid size-14 shrink-0 place-items-center rounded-2xl bg-flame text-night-950 shadow-glow-flame"
            >
              {onStage ? <PartyPopper aria-hidden className="size-7" /> : <BellRing aria-hidden className="size-7" />}
            </motion.div>
            <div>
              <p className="font-display text-xl font-extrabold sm:text-2xl">{onStage ? "You're on! 🎤" : "You're up next!"}</p>
              <p className="text-ink-muted">
                {onStage ? 'The stage is yours. Go get them.' : `Number #${status.my_number}: head to the stage and get ready.`}
              </p>
            </div>
            <Mic aria-hidden className="ml-auto hidden size-8 text-flame-soft sm:block" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
