import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { Confetti } from '@/components/ui/Confetti'
import { CountUp } from '@/components/ui/CountUp'
import { BRAND } from '@/lib/brand'

export interface Ticket {
  queue_number: number
  song_title: string
  artist: string
  eventName: string
}

/** Full-screen ticket: spring scale-in, confetti burst, number counting up. */
export function TicketReveal({ ticket, celebrate, onClose }: { ticket: Ticket | null; celebrate: boolean; onClose: () => void }) {
  return createPortal(
    <AnimatePresence>{ticket && <TicketDialog ticket={ticket} celebrate={celebrate} onClose={onClose} />}</AnimatePresence>,
    document.body,
  )
}

function TicketDialog({ ticket, celebrate, onClose }: { ticket: Ticket; celebrate: boolean; onClose: () => void }) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previouslyFocused?.focus()
    }
  }, [onClose])

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-night-950/85 p-4 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="relative w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        {celebrate && <Confetti />}

        <motion.div
          initial={{ scale: 0.3, rotate: -8, opacity: 0, y: 40 }}
          animate={{ scale: 1, rotate: 0, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(150deg,var(--color-flame),var(--color-ember)_55%,var(--color-gold))] p-[2px] shadow-glow-flame"
        >
          <div className="relative rounded-[calc(2rem-2px)] bg-night-900 px-6 pb-7 pt-6 text-center">
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close ticket"
              className="absolute right-2 top-2 grid size-11 place-items-center rounded-full text-ink-muted hover:bg-white/10 hover:text-ink"
            >
              <X aria-hidden className="size-5" />
            </button>

            <p className="font-display text-xs font-bold uppercase tracking-[0.3em] text-gold-soft">{BRAND}</p>
            <h2 id={titleId} className="mt-1 text-lg font-bold text-ink-muted">
              Your number
            </h2>

            <motion.p
              className="my-2 font-display text-[6.5rem] font-extrabold leading-none text-gradient drop-shadow-[0_0_30px_rgb(255_61_46/0.45)] sm:text-[8rem]"
              initial={{ scale: 0.6 }}
              animate={{ scale: [0.6, 1.15, 1] }}
              transition={{ duration: 0.9, delay: 0.15, times: [0, 0.7, 1] }}
            >
              #<CountUp value={ticket.queue_number} delay={0.2} />
            </motion.p>

            {/* Perforation */}
            <div aria-hidden className="relative -mx-6 my-5 border-t-2 border-dashed border-white/15">
              <span className="absolute -left-3 -top-3 size-6 rounded-full bg-night-950" />
              <span className="absolute -right-3 -top-3 size-6 rounded-full bg-night-950" />
            </div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="space-y-1">
              <p className="text-xl font-bold text-ink">{ticket.song_title}</p>
              <p className="text-ink-muted">{ticket.artist}</p>
              <p className="pt-2 text-sm text-ink-subtle">{ticket.eventName}</p>
            </motion.div>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="mt-5 text-sm text-ink-muted">
              Keep this page open. We'll alert you when you're up next.
            </motion.p>

            <Button className="mt-5" fullWidth onClick={onClose}>
              Got it
            </Button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
