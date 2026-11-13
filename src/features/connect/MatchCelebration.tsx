import { Heart, Sparkles } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Confetti } from '@/components/ui/Confetti'

interface MatchCelebrationProps {
  match: { first_name: string; avatar_url: string | null } | null
  me: { full_name: string | null; avatar_url: string | null } | undefined
  onClose: () => void
}

export function MatchCelebration({ match, me, onClose }: MatchCelebrationProps) {
  useEffect(() => {
    if (!match) return
    navigator.vibrate?.([60, 40, 60, 40, 120])
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [match, onClose])

  return createPortal(
    <AnimatePresence>
      {match && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`It's a match with ${match.first_name}`}
          className="fixed inset-0 z-50 grid place-items-center bg-night-950/90 p-6 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="relative flex flex-col items-center text-center" onClick={(e) => e.stopPropagation()}>
            <Confetti count={90} />
            <div className="relative flex items-center">
              <motion.div
                initial={{ x: -120, rotate: -20, opacity: 0 }}
                animate={{ x: 12, rotate: -8, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.1 }}
              >
                <Avatar src={me?.avatar_url} name={me?.full_name} className="size-28 text-3xl ring-4 ring-night-950" />
              </motion.div>
              <motion.div
                initial={{ x: 120, rotate: 20, opacity: 0 }}
                animate={{ x: -12, rotate: 8, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.1 }}
              >
                <Avatar src={match.avatar_url} name={match.first_name} className="size-28 text-3xl ring-4 ring-night-950" />
              </motion.div>
              <motion.span
                className="absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-accent text-night-950 shadow-glow-accent"
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.4, 1] }}
                transition={{ delay: 0.45, duration: 0.6 }}
              >
                <Heart aria-hidden className="size-7 fill-current" />
              </motion.span>
            </div>
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="mt-8 inline-flex items-center gap-2 text-4xl font-extrabold text-gradient"
            >
              <Sparkles aria-hidden className="size-7 text-accent" /> It's a match
            </motion.h2>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.65 }}
              className="mt-2 text-ink-muted"
            >
              You and {match.first_name} both want to connect.
            </motion.p>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.75 }} className="mt-6">
              <Button size="lg" onClick={onClose}>
                See their Snapchat
              </Button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
