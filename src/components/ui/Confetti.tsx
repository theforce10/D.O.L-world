import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'

// Follows the current event's accent, so karaoke confetti is yellow and Mix & Mingle confetti is red.
const COLORS = ['var(--color-accent)', 'var(--color-accent-soft)', 'var(--color-accent-deep)', 'var(--color-accent)', 'var(--color-ink)']

interface Piece {
  id: number
  x: number
  peak: number
  fall: number
  rotate: number
  size: number
  color: string
  round: boolean
  delay: number
  duration: number
}

function makePieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, id) => {
    const angle = Math.random() * Math.PI - Math.PI
    const power = 140 + Math.random() * 220
    return {
      id,
      x: Math.cos(angle) * power * 1.3,
      peak: Math.sin(angle) * power,
      fall: 260 + Math.random() * 260,
      rotate: (Math.random() - 0.5) * 900,
      size: 6 + Math.random() * 8,
      color: COLORS[id % COLORS.length]!,
      round: Math.random() > 0.6,
      delay: Math.random() * 0.12,
      duration: 1.6 + Math.random() * 0.9,
    }
  })
}

export function Confetti({ count = 70 }: { count?: number }) {
  const reduce = useReducedMotion()
  const [pieces] = useState(() => makePieces(count))
  if (reduce) return null

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-visible">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute left-1/2 top-1/2"
          style={{
            width: p.size,
            height: p.round ? p.size : p.size * 0.45,
            backgroundColor: p.color,
            borderRadius: p.round ? '9999px' : '2px',
          }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 0.6 }}
          animate={{
            x: [0, p.x, p.x * 1.15],
            y: [0, p.peak, p.peak + p.fall],
            rotate: p.rotate,
            opacity: [1, 1, 0],
            scale: 1,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            times: [0, 0.35, 1],
            ease: ['easeOut', 'easeIn'],
          }}
        />
      ))}
    </div>
  )
}
