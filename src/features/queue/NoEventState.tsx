import { MicOff } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Card } from '@/components/ui/Card'

/** Shown when no event is active. The page flips to the song form by itself when an admin goes live. */
export function NoEventState() {
  const reduce = useReducedMotion()

  return (
    <Card className="relative overflow-hidden text-center">
      {/* A dim spotlight sweeping an empty stage. */}
      {!reduce && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -top-20 left-1/2 h-72 w-40 -translate-x-1/2 bg-[linear-gradient(to_bottom,rgb(255_255_255/0.12),transparent)] blur-xl [clip-path:polygon(40%_0,60%_0,100%_100%,0_100%)]"
          animate={{ rotate: [-18, 18, -18] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originY: 0 }}
        />
      )}
      <div className="relative flex flex-col items-center gap-4 py-8">
        <div className="relative">
          <motion.div
            animate={reduce ? undefined : { y: [0, -6, 0], rotate: [-4, 4, -4] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="grid size-20 place-items-center rounded-3xl bg-night-700 text-ink-subtle"
          >
            <MicOff aria-hidden className="size-10" />
          </motion.div>
          {!reduce &&
            ['z', 'z', 'Z'].map((z, i) => (
              <motion.span
                key={i}
                aria-hidden
                className="absolute -right-2 -top-2 font-display font-bold text-gold-soft"
                initial={{ opacity: 0, x: 0, y: 0 }}
                animate={{ opacity: [0, 1, 0], x: 14 + i * 6, y: -24 - i * 10 }}
                transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.6 }}
              >
                {z}
              </motion.span>
            ))}
        </div>
        <h2 className="text-2xl font-bold">No event live right now</h2>
        <p className="max-w-sm text-ink-muted">
          The stage is resting. When the next karaoke night starts, this page lights up automatically and you can pick your song.
        </p>
      </div>
    </Card>
  )
}
