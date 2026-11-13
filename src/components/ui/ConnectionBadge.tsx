import { WifiOff } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Spinner } from './Spinner'

export function ConnectionBadge({ status }: { status: 'connecting' | 'live' | 'reconnecting' | 'offline' }) {
  const show = status === 'reconnecting' || status === 'offline'
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="status"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+4.25rem)] z-40 mx-auto flex w-fit items-center gap-2 rounded-full border border-white/10 bg-night-800/95 px-4 py-2 text-sm font-medium text-ink shadow-card backdrop-blur"
        >
          {status === 'offline' ? (
            <>
              <WifiOff aria-hidden className="size-4 text-danger" /> You're offline
            </>
          ) : (
            <>
              <Spinner className="size-4 text-accent" /> Reconnecting…
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
