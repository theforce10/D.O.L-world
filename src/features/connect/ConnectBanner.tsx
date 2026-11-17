import { ChevronRight, HeartHandshake } from 'lucide-react'
import { motion } from 'motion/react'
import { Link } from 'react-router'

export function ConnectBanner({ eventId, name }: { eventId: string; name: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
    >
      <Link
        to={`/connect/${eventId}`}
        className="group relative flex min-h-16 items-center gap-3 overflow-hidden rounded-3xl border border-accent/40 bg-night-800/80 p-4 shadow-glow-accent transition-colors hover:border-accent"
      >
        <motion.span
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-night-950"
        >
          <HeartHandshake aria-hidden className="size-6" />
        </motion.span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">Connect is open</span>
          <span className="block truncate text-sm text-ink-muted">Say who you clicked with at {name}</span>
        </span>
        <ChevronRight aria-hidden className="size-5 text-accent transition-transform group-hover:translate-x-1" />
      </Link>
    </motion.div>
  )
}
