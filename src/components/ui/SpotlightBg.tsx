import { motion, useReducedMotion } from 'motion/react'

/** Fixed, decorative stage-light background: two drifting coloured spotlights over a deep purple base. */
export function SpotlightBg() {
  const reduce = useReducedMotion()

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-night-900">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-night-700),transparent_60%)]" />
      <motion.div
        className="absolute -left-1/4 -top-1/4 size-[70vmax] rounded-full bg-flame/20 blur-[100px]"
        animate={reduce ? undefined : { x: ['0%', '18%', '0%'], y: ['0%', '12%', '0%'] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-1/3 -right-1/4 size-[65vmax] rounded-full bg-gold/15 blur-[110px]"
        animate={reduce ? undefined : { x: ['0%', '-15%', '0%'], y: ['0%', '-10%', '0%'] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Subtle grain so the gradients don't band on cheap phone screens. */}
      <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay [background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22><filter id=%22n%22><feTurbulence baseFrequency=%220.9%22/></filter><rect width=%22120%22 height=%22120%22 filter=%22url(%23n)%22/></svg>')]" />
    </div>
  )
}
