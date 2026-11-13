import { motion, useReducedMotion } from 'motion/react'

export function SpotlightBg() {
  const reduce = useReducedMotion()

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-night-900 transition-colors duration-700">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-night-700),transparent_60%)]" />
      {/* Bloom tinted to the current surface (data-surface on <html>). */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_15%_100%,var(--color-surface-bloom),transparent_70%),radial-gradient(ellipse_60%_45%_at_100%_0%,var(--color-surface-bloom),transparent_70%)]" />
      <motion.div
        className="absolute -left-1/4 -top-1/4 size-[70vmax] rounded-full bg-accent/20 blur-[100px] transition-colors duration-700"
        animate={reduce ? undefined : { x: ['0%', '18%', '0%'], y: ['0%', '12%', '0%'] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-1/3 -right-1/4 size-[65vmax] rounded-full bg-accent-deep/15 blur-[110px] transition-colors duration-700"
        animate={reduce ? undefined : { x: ['0%', '-15%', '0%'], y: ['0%', '-10%', '0%'] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay [background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22><filter id=%22n%22><feTurbulence baseFrequency=%220.9%22/></filter><rect width=%22120%22 height=%22120%22 filter=%22url(%23n)%22/></svg>')]" />
    </div>
  )
}
